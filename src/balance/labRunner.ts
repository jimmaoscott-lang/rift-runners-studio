// Shared headless Balance Lab runner used by both the Web Worker and CLI scripts.
// Guarantees identical deterministic seeds, W1-L1 target calibration, 5 word-roll seeds
// per cell, and bounded red-cell suggestion probes (startCrystals 1x..2x, balance 0.40..1.20).

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
  LAB_WORD_ROLL_SEEDS,
  LabCellResult,
  LabWorkerMessage,
  LevelLabResult,
  RedCellSuggestion,
  SUGGEST_MAX_BALANCE,
  SUGGEST_MIN_BALANCE,
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
  MAIN_RANDOM_PLANS +
  MAIN_REFINE_ROUNDS * MAIN_TOP_K * MAIN_MUTATIONS_PER_PLAN +
  7 * Math.max(0, LAB_WORD_ROLL_SEEDS - 1);

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

function clampBalance(n: number): number {
  return round2(Math.max(SUGGEST_MIN_BALANCE, Math.min(SUGGEST_MAX_BALANCE, n)));
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

function buildStartCrystalCandidates(curStart: number): number[] {
  const maxStart = curStart * 2;
  const raw = [
    curStart,
    Math.min(maxStart, Math.max(curStart, round20(curStart * 1.35))),
    Math.min(maxStart, Math.max(curStart, round20(curStart * 1.7))),
    maxStart,
  ];
  const unique: number[] = [];
  for (const v of raw) {
    const clamped = Math.max(curStart, Math.min(maxStart, Math.round(v)));
    if (!unique.includes(clamped)) unique.push(clamped);
  }
  return unique.sort((a, b) => a - b);
}

function probeSuggestionForRedCell(
  level: LevelConfig,
  cell: LabCellResult,
  baseSeed: number,
  targets: W1L1Targets,
  dials?: SimDials
): RedCellSuggestion {
  const diff = cell.difficulty;
  const acc = cell.readingAccuracy;
  const target = targets[diff];
  const curStart = level.startCrystals;
  const maxStart = curStart * 2;
  const curBalance = level.balance?.[diff] ?? 1.0;

  const isEasierThanTarget = (winRate: number, anchorPct: number): boolean =>
    winRate > target.winRate + 0.0001 ||
    (Math.abs(winRate - target.winRate) <= 0.0001 && anchorPct > target.anchorPct);

  let stepIdx = 1;
  const evalPoint = (startCrystals: number, scale: number) => {
    const clampedStart = Math.max(curStart, Math.min(maxStart, Math.round(startCrystals)));
    const clampedScale = clampBalance(scale);
    const report = runBalanceBot({
      levelId: level.id,
      difficulty: diff,
      readingAccuracy: acc,
      randomPlans: PROBE_RANDOM_PLANS,
      topK: PROBE_TOP_K,
      refineRounds: PROBE_REFINE_ROUNDS,
      mutationsPerPlan: PROBE_MUTATIONS_PER_PLAN,
      wordRollSeeds: LAB_WORD_ROLL_SEEDS,
      useHeroPowers: true,
      seed: baseSeed + stepIdx++ * 97,
      dials,
      overrideStartCrystals: clampedStart,
      overrideBalanceScale: clampedScale,
      allowFastProbe: true,
    });
    const winRate = report.balanceTarget.winRate;
    const anchorPct = report.balanceTarget.anchorPct;
    const cls = classifyTargetCell(diff, winRate, anchorPct, targets);
    const dist = scoreDistanceFromTarget(winRate, anchorPct, target);
    return {
      startCrystals: clampedStart,
      scale: clampedScale,
      winRate,
      anchorPct,
      cls,
      dist,
      mostLeaked: report.mostLeakedCreature,
    };
  };

  type ProbePoint = ReturnType<typeof evalPoint>;

  const state: { bestGreen: ProbePoint | null; bestOverall: ProbePoint | null } = {
    bestGreen: null,
    bestOverall: null,
  };

  const consider = (cand: ProbePoint) => {
    if (!state.bestOverall || cand.dist < state.bestOverall.dist) {
      state.bestOverall = cand;
    }
    if (cand.cls.status === 'green') {
      if (
        !state.bestGreen ||
        cand.startCrystals < state.bestGreen.startCrystals ||
        (cand.startCrystals === state.bestGreen.startCrystals && cand.dist < state.bestGreen.dist)
      ) {
        state.bestGreen = cand;
      }
    }
  };

  const bisectBalance = (
    startCrystals: number,
    loInit: number,
    hiInit: number,
    maxIters = 4
  ) => {
    let lo = clampBalance(loInit);
    let hi = clampBalance(hiInit);
    for (let iter = 0; iter < maxIters; iter++) {
      const mid = clampBalance((lo + hi) / 2);
      if (mid <= lo + 0.005 || mid >= hi - 0.005) break;
      const res = evalPoint(startCrystals, mid);
      consider(res);

      const winDiffPts = Math.abs(res.winRate - target.winRate) * 100;
      const anchorDiffPts = Math.abs(res.anchorPct - target.anchorPct) * 100;
      if (res.cls.status === 'green' && winDiffPts <= 5 && anchorDiffPts <= 5) {
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
  };

  if (cell.targetReason === 'too_easy') {
    // Search upward within [max(0.40, curBalance), 1.20] keeping startCrystals at curStart
    const hiRes = evalPoint(curStart, SUGGEST_MAX_BALANCE);
    consider(hiRes);
    if (
      hiRes.cls.status === 'green' ||
      !isEasierThanTarget(hiRes.winRate, hiRes.anchorPct)
    ) {
      bisectBalance(curStart, Math.max(SUGGEST_MIN_BALANCE, curBalance), SUGGEST_MAX_BALANCE, 4);
    }
  } else {
    // Lost or too hard: check maximum allowed help first (2x startCrystals, 0.40 balance).
    // If even (2x startCrystals, 0.40) cannot reach green or easier, this cell needs wave redesign.
    const maxHelpRes = evalPoint(maxStart, SUGGEST_MIN_BALANCE);
    consider(maxHelpRes);

    const maxHelpCanReach =
      maxHelpRes.cls.status === 'green' ||
      isEasierThanTarget(maxHelpRes.winRate, maxHelpRes.anchorPct);

    if (maxHelpCanReach) {
      // Find the smallest startCrystals in [curStart..2x] that can reach green within [0.40..1.20]
      const startSteps = buildStartCrystalCandidates(curStart);
      let chosenStart = maxStart;

      for (const candStart of startSteps) {
        if (candStart === maxStart) {
          chosenStart = maxStart;
          break;
        }
        const atFloor = evalPoint(candStart, SUGGEST_MIN_BALANCE);
        consider(atFloor);
        if (
          atFloor.cls.status === 'green' ||
          isEasierThanTarget(atFloor.winRate, atFloor.anchorPct)
        ) {
          chosenStart = candStart;
          break;
        }
      }

      const upperScale = clampBalance(
        chosenStart > curStart ? Math.max(curBalance, SUGGEST_MAX_BALANCE) : Math.min(curBalance, SUGGEST_MAX_BALANCE)
      );
      if (upperScale > SUGGEST_MIN_BALANCE + 0.01) {
        const atUpper = evalPoint(chosenStart, upperScale);
        consider(atUpper);
        if (
          !(atUpper.cls.status === 'green' && Math.abs(atUpper.anchorPct - target.anchorPct) * 100 <= 5)
        ) {
          bisectBalance(chosenStart, SUGGEST_MIN_BALANCE, upperScale, 4);
        }
      }
    }
  }

  const bestGreen = state.bestGreen;
  const bestOverall = state.bestOverall;

  const mostLeakedName =
    cell.mostLeakedCreature ||
    bestOverall?.mostLeaked?.name ||
    undefined;
  const mostLeakedType =
    cell.mostLeakedType ||
    bestOverall?.mostLeaked?.type ||
    undefined;

  if (!bestGreen) {
    const fallback = bestOverall;
    return {
      difficulty: diff,
      readingAccuracy: acc,
      currentStatusLabel: cell.targetLabel || 'Lost',
      currentWinRate: cell.winRate,
      currentAnchorPct: cell.anchorPct,
      currentStartCrystals: curStart,
      currentBalanceScale: curBalance,
      suggestedStartCrystals: curStart,
      suggestedBalanceScale: clampBalance(curBalance),
      predictedWinRate: fallback?.winRate ?? cell.winRate,
      predictedAnchorPct: fallback?.anchorPct ?? cell.anchorPct,
      predictedStatus: fallback?.cls.status ?? (cell.targetStatus || 'red'),
      predictedLabel: fallback?.cls.label ?? (cell.targetLabel || 'Lost'),
      needsWaveRedesign: true,
      mostLeakedCreature: mostLeakedName,
      mostLeakedType,
      note: mostLeakedName
        ? `Needs wave redesign (most leaked: ${mostLeakedName}).`
        : 'Needs wave redesign.',
    };
  }

  return {
    difficulty: diff,
    readingAccuracy: acc,
    currentStatusLabel: cell.targetLabel || 'Lost',
    currentWinRate: cell.winRate,
    currentAnchorPct: cell.anchorPct,
    currentStartCrystals: curStart,
    currentBalanceScale: curBalance,
    suggestedStartCrystals: bestGreen.startCrystals,
    suggestedBalanceScale: bestGreen.scale,
    predictedWinRate: bestGreen.winRate,
    predictedAnchorPct: bestGreen.anchorPct,
    predictedStatus: bestGreen.cls.status,
    predictedLabel: bestGreen.cls.label,
    needsWaveRedesign: false,
    mostLeakedCreature: mostLeakedName,
    mostLeakedType,
    note:
      bestGreen.startCrystals > curStart
        ? 'Raise starting crystals and adjust balance scale into the W1-L1 green band.'
        : 'Adjust balance scale into the W1-L1 green band.',
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
    wordRollSeeds: report.wordRollSeeds,
    optimalWon: report.optimalWinRate >= 0.5,
    optimalWinRate: report.optimalWinRate,
    optimalAnchorPct: report.optimalAnchorPct,
    goodWon: report.goodWinRate >= 0.5,
    goodWinRate: report.goodWinRate,
    goodAnchorPct: report.goodAnchorPct,
    mostLeakedCreature: report.mostLeakedCreature?.name,
    mostLeakedType: report.mostLeakedCreature?.type,
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
        wordRollSeeds: LAB_WORD_ROLL_SEEDS,
        useHeroPowers: true,
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
            wordRollSeeds: LAB_WORD_ROLL_SEEDS,
            useHeroPowers: true,
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

    // Probe bounded suggestions (startCrystals 1x..2x, balance 0.40..1.20) for red target cells
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

      const nextBalance: Record<DifficultyId, number> = {
        easy: clampBalance(level.balance?.easy ?? 1.0),
        normal: clampBalance(level.balance?.normal ?? 1.0),
        hard: clampBalance(level.balance?.hard ?? 1.0),
        expert: clampBalance(level.balance?.expert ?? 1.0),
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
          seed + levelOrderIdx * 2003 + ri * 311,
          activeTargets,
          dialsByDifficulty?.[redCell.difficulty]
        );
        suggestions.push(suggestion);
        if (!suggestion.needsWaveRedesign) {
          nextBalance[redCell.difficulty] = suggestion.suggestedBalanceScale;
        }
      }

      const solvable = suggestions.filter((s) => !s.needsWaveRedesign);
      if (solvable.length > 0) {
        recommendedStartCrystals = Math.max(
          level.startCrystals,
          ...solvable.map((s) => s.suggestedStartCrystals)
        );
        recommendedBalance = nextBalance;
      }
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
