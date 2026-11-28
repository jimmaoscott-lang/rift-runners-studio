// Web Worker for the Builder-only Balance Lab.
// Runs the headless balance bot off the main thread so the UI never freezes,
// streams cell results and progress updates, and probes verified suggestions
// for any red target cells.

import {
  DIFFICULTY_ORDER,
  DifficultyId,
  LEVELS,
  LevelConfig,
  LevelId,
} from '../data/level1';
import { runBalanceBot } from './bot';
import {
  classifyTargetCell,
  isTargetCell,
  LAB_ACCURACIES,
  LabCellResult,
  LabWorkerMessage,
  LabWorkerRunRequest,
  RedCellSuggestion,
} from './labTypes';
import { ReadingAccuracy, SimDials } from './sim';

const MAIN_RANDOM_PLANS = 200;
const MAIN_TOP_K = 20;
const MAIN_REFINE_ROUNDS = 3;
const MAIN_MUTATIONS_PER_PLAN = 3;
const PLANS_PER_CELL =
  MAIN_RANDOM_PLANS + MAIN_REFINE_ROUNDS * MAIN_TOP_K * MAIN_MUTATIONS_PER_PLAN;

const PROBE_RANDOM_PLANS = 45;
const PROBE_TOP_K = 10;
const PROBE_REFINE_ROUNDS = 1;
const PROBE_MUTATIONS_PER_PLAN = 2;

function post(msg: LabWorkerMessage): void {
  self.postMessage(msg);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round20(n: number): number {
  return Math.round(n / 20) * 20;
}

function scoreDistanceFromGreen(winRate: number, anchorPct: number): number {
  if (winRate >= 1 && anchorPct >= 0.3 && anchorPct <= 0.7) {
    return Math.abs(anchorPct - 0.5);
  }
  if (winRate >= 1) {
    return 1 + Math.min(Math.abs(anchorPct - 0.3), Math.abs(anchorPct - 0.7));
  }
  if (winRate >= 0.5) {
    return 2 + Math.abs(anchorPct - 0.5);
  }
  return 3 + (1 - anchorPct);
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
  // crystals, trimming startCrystals brings the whole level closer to target.
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
  dials?: SimDials
): RedCellSuggestion {
  const diff = cell.difficulty;
  const acc = cell.readingAccuracy;
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
    const cls = classifyTargetCell(winRate, anchorPct);
    const dist = scoreDistanceFromGreen(winRate, anchorPct);
    return { scale: clamped, winRate, anchorPct, cls, dist };
  };

  let best = {
    scale: curBalance,
    winRate: cell.winRate,
    anchorPct: cell.anchorPct,
    cls: classifyTargetCell(cell.winRate, cell.anchorPct),
    dist: scoreDistanceFromGreen(cell.winRate, cell.anchorPct),
  };

  const consider = (cand: typeof best) => {
    if (cand.dist < best.dist) {
      best = cand;
    }
  };

  let lo: number;
  let hi: number;
  let stepIdx = 1;

  if (cell.targetReason === 'too_easy') {
    lo = curBalance;
    hi = Math.min(4.0, Math.max(curBalance * 2.4, 2.0));
    const hiRes = evalScale(hi, stepIdx++);
    consider(hiRes);
    if (hiRes.winRate >= 1 && hiRes.anchorPct > 0.75 && hi < 5.5) {
      lo = hi;
      hi = Math.min(6.0, round2(hi * 1.8));
      const hi2 = evalScale(hi, stepIdx++);
      consider(hi2);
    }
  } else {
    // Lost or too hard: lower creature health scale.
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
          note: 'Raising starting crystals brings this cell into the green target band.',
        };
      }
      // If raising startCrystals actually made it too easy, bracket upward.
      if (sameScaleRes.winRate >= 1 && sameScaleRes.anchorPct > 0.7) {
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

    if (res.winRate >= 1 && res.anchorPct >= 0.44 && res.anchorPct <= 0.56) {
      break;
    }
    if (res.winRate >= 1 && res.anchorPct > 0.56) {
      // Too easy -> increase health scale
      lo = mid;
    } else {
      // Lost or Anchor below 44% -> decrease health scale
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

self.onmessage = (event: MessageEvent<LabWorkerRunRequest>) => {
  const req = event.data;
  if (!req || req.type !== 'run') return;

  const { runId, levelIds, dialsByDifficulty, seed = 101 } = req;
  const startedAt = performance.now();

  try {
    const cellsPerLevel = DIFFICULTY_ORDER.length * LAB_ACCURACIES.length;
    const totalUnits = Math.max(1, levelIds.length * cellsPerLevel * PLANS_PER_CELL);
    let completedBaseUnits = 0;

    for (let li = 0; li < levelIds.length; li++) {
      const levelId = levelIds[li];
      const level = LEVELS[levelId];
      if (!level) continue;

      const targetCells: LabCellResult[] = [];

      for (let di = 0; di < DIFFICULTY_ORDER.length; di++) {
        const difficulty = DIFFICULTY_ORDER[di];
        for (let ai = 0; ai < LAB_ACCURACIES.length; ai++) {
          const readingAccuracy: ReadingAccuracy = LAB_ACCURACIES[ai];
          const cellSeed = seed + li * 1009 + di * 131 + ai * 17;

          post({
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
          const report = runBalanceBot({
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
              const clamped = Math.min(PLANS_PER_CELL, Math.round((completedPlans / Math.max(1, totalPlans)) * PLANS_PER_CELL));
              post({
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

          const target = isTargetCell(difficulty, readingAccuracy);
          const classification = target
            ? classifyTargetCell(
                report.balanceTarget.winRate,
                report.balanceTarget.anchorPct
              )
            : undefined;

          const optRes = report.optimal.result;
          const goodRes = report.good.result;

          const cell: LabCellResult = {
            levelId,
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

          if (target) {
            targetCells.push(cell);
          }

          post({ type: 'cell', runId, cell });
        }
      }

      // Check red target cells and compute verified startCrystals + balance suggestions
      const redCells = targetCells.filter((c) => c.targetStatus === 'red');
      const suggestions: RedCellSuggestion[] = [];
      let recommendedStartCrystals: number | undefined;
      let recommendedBalance: Record<DifficultyId, number> | undefined;

      if (redCells.length > 0) {
        post({ type: 'level_probing', runId, levelId });
        post({
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
          post({
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
            seed + li * 2003 + ri * 311,
            dialsByDifficulty?.[redCell.difficulty]
          );
          suggestions.push(suggestion);
          nextBalance[redCell.difficulty] = suggestion.suggestedBalanceScale;
        }

        recommendedStartCrystals = candidateStart;
        recommendedBalance = nextBalance;
      }

      post({
        type: 'level_done',
        runId,
        levelId,
        suggestions,
        recommendedStartCrystals,
        recommendedBalance,
      });
    }

    post({
      type: 'done',
      runId,
      elapsedMs: Math.round(performance.now() - startedAt),
    });
  } catch (err) {
    post({
      type: 'error',
      runId,
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
