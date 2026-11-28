// Shared headless Balance Lab runner used by both the Web Worker and CLI scripts.
// Guarantees identical deterministic seeds, W1-L1 target calibration, and red-cell
// suggestion probes across browser and command-line runs.

import {
  DIFFICULTY_ORDER,
  DifficultyId,
  LEVEL_ORDER,
  LEVELS,
  LevelConfig,
  LevelId,
} from '../data/level1';
import { BotSearchReport, runBalanceBot } from './bot';
import {
  classifyTargetCell,
  DifficultyTarget,
  isTargetCell,
  LAB_ACCURACIES,
  LabCellResult,
  LabWorkerMessage,
  LevelLabResult,
  RedCellSuggestion,
  TARGET_ACCURACY_BY_DIFF,
  W1_L1_DEFAULT_TARGETS,
  W1L1Targets,
} from './labTypes';
import { ReadingAccuracy, SimDials } from './sim';

export const MAIN_RANDOM_PLANS = 200;
export const MAIN_TOP_K = 20;
export const MAIN_REFINE_ROUNDS = 3;
export const MAIN_MUTATIONS_PER_PLAN = 3;
export const PLANS_PER_CELL =
  MAIN_RANDOM_PLANS + MAIN_REFINE_ROUNDS * MAIN_TOP_K * MAIN_MUTATIONS_PER_PLAN;

const PROBE_RANDOM_PLANS = 45;
const PROBE_TOP_K = 10;
const PROBE_REFINE_ROUNDS = 1;
const PROBE_MUTATIONS_PER_PLAN = 2;

export function getLabCellSeed(
  baseSeed: number,
  levelId: LevelId,
  diffIdx: number,
  accIdx: number
): number {
  const levelOrderIdx = Math.max(0, LEVEL_ORDER.indexOf(levelId));
  return baseSeed + levelOrderIdx * 1009 + diffIdx * 131 + accIdx * 17;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round20(n: number): number {
  return Math.round(n / 20) * 20;
}

function scoreDistanceFromTarget(
  winRate: number,
  anchorPct: number,
  target: DifficultyTarget
): number {
  const winDiffPts = Math.abs(winRate - target.winRate) * 100;
  const anchorDiffPts = Math.abs(anchorPct - target.anchorPct) * 100;

  if (winDiffPts <= 10.0001 && anchorDiffPts <= 10.0001) {
    return winDiffPts + anchorDiffPts;
  }
  if (winDiffPts <= 20.0001 && anchorDiffPts <= 20.0001) {
    return 100 + winDiffPts + anchorDiffPts;
  }
  return 300 + winDiffPts * 2 + anchorDiffPts;
}

function chooseLevelStartCrystals(
  level: LevelConfig,
  targetCells: LabCellResult[]
): { startCrystals: number; changedReason: string } {
  const curStart = level.startCrystals;
  const redHard = targetCells.filter(
    (c) =>
      c.targetStatus === 'red' &&
      (c.targetReason === 'lost' || c.targetReason === 'too_hard')
  );
  const redEasy = targetCells.filter(
    (c) => c.targetStatus === 'red' && c.targetReason === 'too_easy'
  );

  // If one or more target cells are losing/too hard with heavy Wave 1 Anchor loss
  // and no target cell is too easy, raising startCrystals stabilizes the opener.
  const heavyWave1Leak = redHard.some(
    (c) => c.wave1AnchorLost >= Math.max(2, level.anchor * 0.2)
  );
  if (redHard.length > 0 && redEasy.length === 0 && (heavyWave1Leak || redHard.length >= 2)) {
    const bumpFactor = heavyWave1Leak ? 1.45 : 1.25;
    const bumped = Math.min(
      curStart + 260,
      Math.max(curStart + 60, round20(curStart * bumpFactor))
    );
    return {
      startCrystals: bumped,
      changedReason: heavyWave1Leak
        ? 'Raise starting crystals to hold Wave 1, plus adjust creature health.'
        : 'Raise starting crystals and lower creature health.',
    };
  }

  // If every single target cell is too easy with zero Wave 1 leaks and high leftover
  // crystals, trimming startCrystals brings the whole level closer to W1-L1.
  if (
    redEasy.length === targetCells.length &&
    curStart > 160 &&
    redEasy.every((c) => c.wave1AnchorLost === 0 && c.endCrystalsOptimal >= curStart * 0.5)
  ) {
    const trimmed = Math.max(140, round20(curStart * 0.85));
    if (trimmed < curStart) {
      return {
        startCrystals: trimmed,
        changedReason: 'Trim starting crystals slightly and raise creature health.',
      };
    }
  }

  return {
    startCrystals: curStart,
    changedReason:
      redEasy.length > 0 && redHard.length === 0
        ? 'Keep starting crystals and raise creature health scale.'
        : 'Keep starting crystals and adjust creature health scale.',
  };
}

function probeSuggestionForRedCell(
  level: LevelConfig,
  cell: LabCellResult,
  candidateStartCrystals: number,
  reasonNote: string,
  baseSeed: number,
  targets: W1L1Targets,
  dials?: SimDials
): RedCellSuggestion {
  const diff = cell.difficulty;
  const acc = cell.readingAccuracy;
  const target = targets[diff];
  const curStart = level.startCrystals;
  const curBalance = level.balance?.[diff] ?? 1.0;

  const evalScale = (scale: number, stepIdx: number) => {
    const clamped = round2(Math.max(0.15, Math.min(6.0, scale)));
    const report = runBalanceBot({
      levelId: level.id,
      difficulty: diff,
      readingAccuracy: acc,
      randomPlans: PROBE_RANDOM_PLANS,
      topK: PROBE_TOP_K,
      refineRounds: PROBE_REFINE_ROUNDS,
      mutationsPerPlan: PROBE_MUTATIONS_PER_PLAN,
      seed: baseSeed + stepIdx * 97,
      dials,
      overrideStartCrystals: candidateStartCrystals,
      overrideBalanceScale: clamped,
      allowFastProbe: true,
    });
    const winRate = report.balanceTarget.winRate;
    const anchorPct = report.balanceTarget.anchorPct;
    const cls = classifyTargetCell(diff, winRate, anchorPct, targets);
    const dist = scoreDistanceFromTarget(winRate, anchorPct, target);
    return { scale: clamped, winRate, anchorPct, cls, dist };
  };

  let best = {
    scale: curBalance,
    winRate: cell.winRate,
    anchorPct: cell.anchorPct,
    cls: classifyTargetCell(diff, cell.winRate, cell.anchorPct, targets),
    dist: scoreDistanceFromTarget(cell.winRate, cell.anchorPct, target),
  };

  const consider = (cand: typeof best) => {
    if (cand.dist < best.dist) {
      best = cand;
    }
  };

  const isEasierThanTarget = (winRate: number, anchorPct: number): boolean =>
    winRate > target.winRate + 0.0001 ||
    (Math.abs(winRate - target.winRate) <= 0.0001 && anchorPct > target.anchorPct);

  let lo: number;
  let hi: number;
  let stepIdx = 1;

  if (cell.targetReason === 'too_easy') {
    lo = curBalance;
    hi = Math.min(4.0, Math.max(curBalance * 2.4, 2.0));
    const hiRes = evalScale(hi, stepIdx++);
    consider(hiRes);
    if (isEasierThanTarget(hiRes.winRate, hiRes.anchorPct) && hi < 5.5) {
      lo = hi;
      hi = Math.min(6.0, round2(hi * 1.8));
      const hi2 = evalScale(hi, stepIdx++);
      consider(hi2);
    }
  } else {
    // Lost or too hard relative to W1-L1: lower creature health scale.
    // First check if the startCrystals bump alone fixed it at curBalance.
    if (candidateStartCrystals !== curStart) {
      const sameScaleRes = evalScale(curBalance, stepIdx++);
      consider(sameScaleRes);
      if (sameScaleRes.cls.status === 'green') {
        return {
          difficulty: diff,
          readingAccuracy: acc,
          currentStatusLabel: cell.targetLabel || 'Lost',
          currentWinRate: cell.winRate,
          currentAnchorPct: cell.anchorPct,
          currentStartCrystals: curStart,
          currentBalanceScale: curBalance,
          suggestedStartCrystals: candidateStartCrystals,
          suggestedBalanceScale: sameScaleRes.scale,
          predictedWinRate: sameScaleRes.winRate,
          predictedAnchorPct: sameScaleRes.anchorPct,
          predictedStatus: sameScaleRes.cls.status,
          predictedLabel: sameScaleRes.cls.label,
          note: 'Raising starting crystals brings this cell within 10 pts of W1-L1.',
        };
      }
      if (isEasierThanTarget(sameScaleRes.winRate, sameScaleRes.anchorPct)) {
        lo = curBalance;
        hi = Math.min(3.5, round2(curBalance * 1.8));
      } else {
        lo = Math.max(0.15, round2(curBalance * 0.25));
        hi = curBalance;
      }
    } else {
      lo = Math.max(0.15, round2(curBalance * 0.25));
      hi = curBalance;
    }
  }

  for (let iter = 0; iter < 5; iter++) {
    const mid = round2((lo + hi) / 2);
    if (mid <= lo + 0.005 || mid >= hi - 0.005) break;
    const res = evalScale(mid, stepIdx++);
    consider(res);

    const winDiffPts = Math.abs(res.winRate - target.winRate) * 100;
    const anchorDiffPts = Math.abs(res.anchorPct - target.anchorPct) * 100;
    if (winDiffPts <= 5 && anchorDiffPts <= 5) {
      break;
    }

    if (isEasierThanTarget(res.winRate, res.anchorPct)) {
      // Easier than W1-L1 -> raise creature health scale
      lo = mid;
    } else {
      // Harder than W1-L1 -> lower creature health scale
      hi = mid;
    }
  }

  return {
    difficulty: diff,
    readingAccuracy: acc,
    currentStatusLabel: cell.targetLabel || 'Lost',
    currentWinRate: cell.winRate,
    currentAnchorPct: cell.anchorPct,
    currentStartCrystals: curStart,
    currentBalanceScale: curBalance,
    suggestedStartCrystals: candidateStartCrystals,
    suggestedBalanceScale: best.scale,
    predictedWinRate: best.winRate,
    predictedAnchorPct: best.anchorPct,
    predictedStatus: best.cls.status,
    predictedLabel: best.cls.label,
    note: reasonNote,
  };
}

function buildLabCell(
  level: LevelConfig,
  difficulty: DifficultyId,
  readingAccuracy: ReadingAccuracy,
  report: BotSearchReport,
  targets: W1L1Targets
): LabCellResult {
  const target = isTargetCell(difficulty, readingAccuracy);
  const classification = target
    ? classifyTargetCell(
        difficulty,
        report.balanceTarget.winRate,
        report.balanceTarget.anchorPct,
        targets
      )
    : undefined;

  const optRes = report.optimal.result;
  const goodRes = report.good.result;

  return {
    levelId: level.id,
    difficulty,
    readingAccuracy,
    isTarget: target,
    targetStatus: classification?.status,
    targetReason: classification?.reason,
    targetLabel: classification?.label,
    winRate: report.balanceTarget.winRate,
    anchorPct: report.balanceTarget.anchorPct,
    anchorLeft: report.balanceTarget.anchorLeft,
    anchorMax: level.anchor,
    optimalWon: optRes.win,
    optimalAnchorPct:
      optRes.maxAnchor > 0 ? optRes.finalAnchor / optRes.maxAnchor : 0,
    goodWon: goodRes.win,
    goodAnchorPct:
      goodRes.maxAnchor > 0 ? goodRes.finalAnchor / goodRes.maxAnchor : 0,
    wave1AnchorLost: optRes.waves[0]?.anchorLost ?? 0,
    endCrystalsOptimal: optRes.finalCrystals,
    evaluatedCount: report.evaluatedCount,
    durationMs: report.durationMs,
  };
}

export interface RunBalanceLabOptions {
  runId: number;
  levelIds: LevelId[];
  dialsByDifficulty?: Partial<Record<DifficultyId, SimDials>>;
  seed?: number;
  emit?: (msg: LabWorkerMessage) => void;
}

export interface RunBalanceLabOutput {
  targets: W1L1Targets;
  resultsByLevel: Partial<Record<LevelId, LevelLabResult>>;
  elapsedMs: number;
}

export function runBalanceLab(options: RunBalanceLabOptions): RunBalanceLabOutput {
  const { runId, levelIds, dialsByDifficulty, seed = 101, emit } = options;
  const send = (msg: LabWorkerMessage) => {
    if (emit) emit(msg);
  };

  const startedAt = performance.now();
  const hasCustomDials = Boolean(
    dialsByDifficulty && Object.keys(dialsByDifficulty).length > 0
  );
  const needsLiveCalibration = hasCustomDials || seed !== 101;
  const includesW1L1 = levelIds.includes('w1-l1');

  const cellsPerLevel = DIFFICULTY_ORDER.length * LAB_ACCURACIES.length;
  // When live calibration runs and w1-l1 is also in levelIds, reuse the 4 paired
  // w1-l1 calibration reports so total work stays exact.
  const extraCalibCells = needsLiveCalibration
    ? includesW1L1
      ? 0
      : DIFFICULTY_ORDER.length
    : 0;
  const totalUnits = Math.max(
    1,
    (levelIds.length * cellsPerLevel + extraCalibCells) * PLANS_PER_CELL
  );
  let completedBaseUnits = 0;

  let activeTargets: W1L1Targets = { ...W1_L1_DEFAULT_TARGETS };
  const cachedW1L1Reports = new Map<string, BotSearchReport>();

  if (needsLiveCalibration) {
    const computedTargets: Partial<W1L1Targets> = {};
    for (let di = 0; di < DIFFICULTY_ORDER.length; di++) {
      const difficulty = DIFFICULTY_ORDER[di];
      const acc = TARGET_ACCURACY_BY_DIFF[difficulty];
      const ai = LAB_ACCURACIES.indexOf(acc);
      const cellSeed = getLabCellSeed(seed, 'w1-l1', di, ai);

      send({
        type: 'progress',
        runId,
        completedUnits: completedBaseUnits,
        totalUnits,
        levelId: 'w1-l1',
        difficulty,
        readingAccuracy: acc,
        phase: 'calibrate',
      });

      const report = runBalanceBot({
        levelId: 'w1-l1',
        difficulty,
        readingAccuracy: acc,
        randomPlans: MAIN_RANDOM_PLANS,
        topK: MAIN_TOP_K,
        refineRounds: MAIN_REFINE_ROUNDS,
        mutationsPerPlan: MAIN_MUTATIONS_PER_PLAN,
        seed: cellSeed,
        dials: dialsByDifficulty?.[difficulty],
        onProgress: (completedPlans, totalPlans) => {
          const clamped = Math.min(
            PLANS_PER_CELL,
            Math.round((completedPlans / Math.max(1, totalPlans)) * PLANS_PER_CELL)
          );
          send({
            type: 'progress',
            runId,
            completedUnits: completedBaseUnits + clamped,
            totalUnits,
            levelId: 'w1-l1',
            difficulty,
            readingAccuracy: acc,
            phase: 'calibrate',
          });
        },
      });

      completedBaseUnits += PLANS_PER_CELL;
      cachedW1L1Reports.set(`${difficulty}:${acc}`, report);
      computedTargets[difficulty] = {
        difficulty,
        startAccuracy: acc,
        winRate: report.balanceTarget.winRate,
        anchorPct: report.balanceTarget.anchorPct,
      };
    }

    activeTargets = computedTargets as W1L1Targets;
  }

  send({
    type: 'targets',
    runId,
    targets: activeTargets,
  });

  const resultsByLevel: Partial<Record<LevelId, LevelLabResult>> = {};

  for (let li = 0; li < levelIds.length; li++) {
    const levelId = levelIds[li];
    const level = LEVELS[levelId];
    if (!level) continue;

    const levelOrderIdx = Math.max(0, LEVEL_ORDER.indexOf(levelId));
    const levelResult: LevelLabResult = {
      levelId,
      cells: {},
      suggestions: [],
      completed: false,
    };
    const targetCells: LabCellResult[] = [];

    for (let di = 0; di < DIFFICULTY_ORDER.length; di++) {
      const difficulty = DIFFICULTY_ORDER[di];
      for (let ai = 0; ai < LAB_ACCURACIES.length; ai++) {
        const readingAccuracy: ReadingAccuracy = LAB_ACCURACIES[ai];
        const cellSeed = getLabCellSeed(seed, levelId, di, ai);

        const cachedReport =
          levelId === 'w1-l1'
            ? cachedW1L1Reports.get(`${difficulty}:${readingAccuracy}`)
            : undefined;

        let report: BotSearchReport;
        if (cachedReport) {
          report = cachedReport;
        } else {
          send({
            type: 'progress',
            runId,
            completedUnits: completedBaseUnits,
            totalUnits,
            levelId,
            difficulty,
            readingAccuracy,
            phase: 'sim',
          });

          const diffDials = dialsByDifficulty?.[difficulty];
          report = runBalanceBot({
            levelId,
            difficulty,
            readingAccuracy,
            randomPlans: MAIN_RANDOM_PLANS,
            topK: MAIN_TOP_K,
            refineRounds: MAIN_REFINE_ROUNDS,
            mutationsPerPlan: MAIN_MUTATIONS_PER_PLAN,
            seed: cellSeed,
            dials: diffDials,
            onProgress: (completedPlans, totalPlans) => {
              const clamped = Math.min(
                PLANS_PER_CELL,
                Math.round(
                  (completedPlans / Math.max(1, totalPlans)) * PLANS_PER_CELL
                )
              );
              send({
                type: 'progress',
                runId,
                completedUnits: completedBaseUnits + clamped,
                totalUnits,
                levelId,
                difficulty,
                readingAccuracy,
                phase: 'sim',
              });
            },
          });

          completedBaseUnits += PLANS_PER_CELL;
        }

        const cell = buildLabCell(
          level,
          difficulty,
          readingAccuracy,
          report,
          activeTargets
        );

        if (!levelResult.cells[difficulty]) {
          levelResult.cells[difficulty] = {};
        }
        levelResult.cells[difficulty]![readingAccuracy] = cell;

        if (cell.isTarget) {
          targetCells.push(cell);
        }

        send({ type: 'cell', runId, cell });
      }
    }

    // Check red target cells and compute verified startCrystals + balance suggestions
    const redCells = targetCells.filter((c) => c.targetStatus === 'red');
    const suggestions: RedCellSuggestion[] = [];
    let recommendedStartCrystals: number | undefined;
    let recommendedBalance: Record<DifficultyId, number> | undefined;

    if (redCells.length > 0) {
      send({ type: 'level_probing', runId, levelId });
      send({
        type: 'progress',
        runId,
        completedUnits: completedBaseUnits,
        totalUnits,
        levelId,
        phase: 'suggest',
      });

      const { startCrystals: candidateStart, changedReason } =
        chooseLevelStartCrystals(level, targetCells);

      const nextBalance: Record<DifficultyId, number> = {
        easy: level.balance?.easy ?? 1.0,
        normal: level.balance?.normal ?? 1.0,
        hard: level.balance?.hard ?? 1.0,
        expert: level.balance?.expert ?? 1.0,
      };

      for (let ri = 0; ri < redCells.length; ri++) {
        const redCell = redCells[ri];
        send({
          type: 'progress',
          runId,
          completedUnits: completedBaseUnits,
          totalUnits,
          levelId,
          difficulty: redCell.difficulty,
          readingAccuracy: redCell.readingAccuracy,
          phase: 'suggest',
        });

        const suggestion = probeSuggestionForRedCell(
          level,
          redCell,
          candidateStart,
          changedReason,
          seed + levelOrderIdx * 2003 + ri * 311,
          activeTargets,
          dialsByDifficulty?.[redCell.difficulty]
        );
        suggestions.push(suggestion);
        nextBalance[redCell.difficulty] = suggestion.suggestedBalanceScale;
      }

      recommendedStartCrystals = candidateStart;
      recommendedBalance = nextBalance;
    }

    levelResult.suggestions = suggestions;
    levelResult.recommendedStartCrystals = recommendedStartCrystals;
    levelResult.recommendedBalance = recommendedBalance;
    levelResult.completed = true;
    resultsByLevel[levelId] = levelResult;

    send({
      type: 'level_done',
      runId,
      levelId,
      suggestions,
      recommendedStartCrystals,
      recommendedBalance,
    });
  }

  const elapsedMs = Math.round(performance.now() - startedAt);
  send({
    type: 'done',
    runId,
    elapsedMs,
  });

  return {
    targets: activeTargets,
    resultsByLevel,
    elapsedMs,
  };
}
