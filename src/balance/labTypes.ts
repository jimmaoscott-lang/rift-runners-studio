// Shared types, W1-L1 calibrated target classification, and plain-text report
// formatting for the Builder-only Balance Lab.

import {
  CreatureType,
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  DifficultyId,
  LEVELS,
  LevelId,
} from '../data/level1';
import { ReadingAccuracy, SimDials } from './sim';

export const LAB_ACCURACIES: readonly ReadingAccuracy[] = [0.4, 0.6, 0.8, 1.0];

export const LAB_WORD_ROLL_SEEDS = 5;
export const SUGGEST_MIN_BALANCE = 0.4;
export const SUGGEST_MAX_BALANCE = 1.2;

export const TARGET_ACCURACY_BY_DIFF: Record<DifficultyId, ReadingAccuracy> = {
  easy: 0.4,
  normal: 0.6,
  hard: 0.8,
  expert: 1.0,
};

export interface DifficultyTarget {
  difficulty: DifficultyId;
  startAccuracy: ReadingAccuracy;
  winRate: number;
  anchorPct: number;
}

export type W1L1Targets = Record<DifficultyId, DifficultyTarget>;

/**
 * Measured W1-L1 paired baseline targets under default difficulty dials,
 * skilled robot (Hero Powers + counter-aware buying), learning reading curve
 * (+5% after each wave, cap 95%; 100% stays 100%), and 5 word-roll seeds per cell.
 * Recomputed live if custom Builder difficulty dials are applied.
 */
export const W1_L1_DEFAULT_TARGETS: W1L1Targets = {
  easy: { difficulty: 'easy', startAccuracy: 0.4, winRate: 1, anchorPct: 1 },
  normal: { difficulty: 'normal', startAccuracy: 0.6, winRate: 1, anchorPct: 1 },
  hard: { difficulty: 'hard', startAccuracy: 0.8, winRate: 1, anchorPct: 0.95 },
  expert: { difficulty: 'expert', startAccuracy: 1.0, winRate: 1, anchorPct: 1 },
};

export type TargetStatus = 'green' | 'yellow' | 'red';

export type TargetReason =
  | 'target'
  | 'close_low'
  | 'close_high'
  | 'close_split'
  | 'lost'
  | 'too_hard'
  | 'too_easy';

export interface TargetClassification {
  status: TargetStatus;
  reason: TargetReason;
  label: string;
}

export function isTargetCell(
  difficulty: DifficultyId,
  accuracy: ReadingAccuracy
): boolean {
  return TARGET_ACCURACY_BY_DIFF[difficulty] === accuracy;
}

/**
 * Classifies a target diagonal cell against the W1-L1 baseline for that difficulty.
 * - Green: within 10 percentage points of W1-L1 on BOTH win rate and Anchor
 * - Yellow: within 20 percentage points of W1-L1 on BOTH win rate and Anchor
 * - Red: beyond 20 percentage points on either win rate or Anchor
 */
export function classifyTargetCell(
  difficulty: DifficultyId,
  winRate: number,
  anchorPct: number,
  targets: W1L1Targets = W1_L1_DEFAULT_TARGETS
): TargetClassification {
  const target = targets[difficulty];
  const winDiffPts = Math.abs(winRate - target.winRate) * 100;
  const anchorDiffPts = Math.abs(anchorPct - target.anchorPct) * 100;

  if (winDiffPts <= 10.0001 && anchorDiffPts <= 10.0001) {
    return { status: 'green', reason: 'target', label: 'Target' };
  }

  if (winDiffPts <= 20.0001 && anchorDiffPts <= 20.0001) {
    if (winRate < target.winRate - 0.0001) {
      return { status: 'yellow', reason: 'close_split', label: 'Close' };
    }
    if (anchorPct < target.anchorPct) {
      return { status: 'yellow', reason: 'close_low', label: 'Close' };
    }
    return { status: 'yellow', reason: 'close_high', label: 'Close' };
  }

  if (winRate <= 0 && target.winRate > 0) {
    return { status: 'red', reason: 'lost', label: 'Lost' };
  }

  const harderThanTarget =
    winRate < target.winRate - 0.0001 ||
    (Math.abs(winRate - target.winRate) <= 0.0001 && anchorPct < target.anchorPct);

  if (harderThanTarget) {
    return { status: 'red', reason: 'too_hard', label: 'Too hard' };
  }

  return { status: 'red', reason: 'too_easy', label: 'Too easy' };
}

export interface LabCellResult {
  levelId: LevelId;
  difficulty: DifficultyId;
  readingAccuracy: ReadingAccuracy;
  isTarget: boolean;
  targetStatus?: TargetStatus;
  targetReason?: TargetReason;
  targetLabel?: string;
  /** Average win rate of good (75th pct) and optimal (best) plans across word-roll seeds. */
  winRate: number;
  /** Average Anchor health fraction (0..1) of good and optimal plans across word-roll seeds. */
  anchorPct: number;
  anchorLeft: number;
  anchorMax: number;
  wordRollSeeds: number;
  optimalWon: boolean;
  optimalWinRate: number;
  optimalAnchorPct: number;
  goodWon: boolean;
  goodWinRate: number;
  goodAnchorPct: number;
  mostLeakedCreature?: string;
  mostLeakedType?: CreatureType;
  wave1AnchorLost: number;
  endCrystalsOptimal: number;
  evaluatedCount: number;
  durationMs: number;
}

export interface RedCellSuggestion {
  difficulty: DifficultyId;
  readingAccuracy: ReadingAccuracy;
  currentStatusLabel: string;
  currentWinRate: number;
  currentAnchorPct: number;
  currentStartCrystals: number;
  currentBalanceScale: number;
  suggestedStartCrystals: number;
  suggestedBalanceScale: number;
  predictedWinRate: number;
  predictedAnchorPct: number;
  predictedStatus: TargetStatus;
  predictedLabel: string;
  needsWaveRedesign: boolean;
  mostLeakedCreature?: string;
  mostLeakedType?: CreatureType;
  note: string;
}

export interface LevelLabResult {
  levelId: LevelId;
  cells: Partial<Record<DifficultyId, Partial<Record<ReadingAccuracy, LabCellResult>>>>;
  suggestions: RedCellSuggestion[];
  recommendedStartCrystals?: number;
  recommendedBalance?: Record<DifficultyId, number>;
  completed: boolean;
  probingSuggestions?: boolean;
}

export interface LabWorkerRunRequest {
  type: 'run';
  runId: number;
  levelIds: LevelId[];
  dialsByDifficulty?: Partial<Record<DifficultyId, SimDials>>;
  seed?: number;
}

export type LabWorkerMessage =
  | {
      type: 'targets';
      runId: number;
      targets: W1L1Targets;
    }
  | {
      type: 'progress';
      runId: number;
      completedUnits: number;
      totalUnits: number;
      levelId: LevelId;
      difficulty?: DifficultyId;
      readingAccuracy?: ReadingAccuracy;
      phase: 'calibrate' | 'sim' | 'suggest';
    }
  | {
      type: 'cell';
      runId: number;
      cell: LabCellResult;
    }
  | {
      type: 'level_probing';
      runId: number;
      levelId: LevelId;
    }
  | {
      type: 'level_done';
      runId: number;
      levelId: LevelId;
      suggestions: RedCellSuggestion[];
      recommendedStartCrystals?: number;
      recommendedBalance?: Record<DifficultyId, number>;
    }
  | {
      type: 'done';
      runId: number;
      elapsedMs: number;
    }
  | {
      type: 'error';
      runId: number;
      message: string;
    };

function padRight(text: string, width: number): string {
  return text.length >= width ? text : text + ' '.repeat(width - text.length);
}

function fmtPct(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

function fmtScale(val: number): string {
  return Number(val.toFixed(2)).toString();
}

export function formatTargetsSummaryLine(
  targets: W1L1Targets = W1_L1_DEFAULT_TARGETS
): string {
  return DIFFICULTY_ORDER.map((diff) => {
    const t = targets[diff];
    return `${DIFFICULTIES[diff].label} (${fmtPct(t.startAccuracy)}): ${fmtPct(t.winRate)}W / ${fmtPct(t.anchorPct)}A`;
  }).join(' | ');
}

export function formatLabResultsPlainText(
  levelIds: LevelId[],
  resultsByLevel: Partial<Record<LevelId, LevelLabResult>>,
  targets: W1L1Targets = W1_L1_DEFAULT_TARGETS
): string {
  const lines: string[] = [
    'Rift Runners Balance Lab Results',
    `Bot: Skilled student (Rally/Meteor/Freeze hero powers + counter-aware buying, ${LAB_WORD_ROLL_SEEDS} word-roll seeds per cell)`,
    'Reading model: Starts at column accuracy, +5% after each wave (cap 95%; 100% stays 100%)',
    `W1-L1 targets: ${formatTargetsSummaryLine(targets)}`,
    'Markers: [G] Within 10 pts of W1-L1, [Y] Within 20 pts, [R] Beyond 20 pts',
    `Suggestion bounds: startCrystals 1x to 2x, balance ${SUGGEST_MIN_BALANCE.toFixed(2)} to ${SUGGEST_MAX_BALANCE.toFixed(2)}`,
    '',
  ];

  const colW = 20;
  const diffW = 9;

  for (const levelId of levelIds) {
    const level = LEVELS[levelId];
    const res = resultsByLevel[levelId];
    if (!level || !res) continue;

    const bal = level.balance;
    const balText = bal
      ? `E ${fmtScale(bal.easy)} / N ${fmtScale(bal.normal)} / H ${fmtScale(bal.hard)} / X ${fmtScale(bal.expert)}`
      : '1.0 (default)';

    lines.push(
      `${level.id.toUpperCase()} (${level.worldName} Level ${level.num}: ${level.name}) | startCrystals ${level.startCrystals} | balance ${balText}`
    );

    const header =
      padRight('Diff', diffW) +
      LAB_ACCURACIES.map((acc) => padRight(`Starts at ${fmtPct(acc)}`, colW)).join('');
    lines.push(header);
    lines.push('-'.repeat(diffW + colW * LAB_ACCURACIES.length));

    for (const diff of DIFFICULTY_ORDER) {
      const diffName = DIFFICULTIES[diff].label;
      const cols = LAB_ACCURACIES.map((acc) => {
        const cell = res.cells[diff]?.[acc];
        if (!cell) return padRight('...', colW);
        const tag = cell.isTarget
          ? cell.targetStatus === 'green'
            ? ' [G]'
            : cell.targetStatus === 'yellow'
              ? ' [Y]'
              : ' [R]'
          : '';
        const text = `${fmtPct(cell.winRate)}W / ${fmtPct(cell.anchorPct)}A${tag}`;
        return padRight(text, colW);
      });
      lines.push(padRight(diffName, diffW) + cols.join(''));
    }

    if (res.suggestions.length > 0) {
      lines.push('Suggested changes for red target cells:');
      if (
        res.recommendedStartCrystals !== undefined &&
        res.recommendedBalance !== undefined
      ) {
        const rb = res.recommendedBalance;
        lines.push(
          `  startCrystals: ${res.recommendedStartCrystals}, balance: { easy: ${rb.easy.toFixed(2)}, normal: ${rb.normal.toFixed(2)}, hard: ${rb.hard.toFixed(2)}, expert: ${rb.expert.toFixed(2)} }`
        );
      }
      for (const s of res.suggestions) {
        const dName = DIFFICULTIES[s.difficulty].label;
        if (s.needsWaveRedesign) {
          const leakNote = s.mostLeakedCreature
            ? ` (most leaked: ${s.mostLeakedCreature})`
            : '';
          lines.push(
            `  ${dName} @ Starts at ${fmtPct(s.readingAccuracy)} (${s.currentStatusLabel}): Needs wave redesign${leakNote}`
          );
        } else {
          lines.push(
            `  ${dName} @ Starts at ${fmtPct(s.readingAccuracy)} (${s.currentStatusLabel}): startCrystals ${s.currentStartCrystals} -> ${s.suggestedStartCrystals}, balance ${s.currentBalanceScale.toFixed(2)} -> ${s.suggestedBalanceScale.toFixed(2)} (est ${fmtPct(s.predictedWinRate)}W / ${fmtPct(s.predictedAnchorPct)}A ${s.predictedLabel})`
          );
        }
      }
    }

    lines.push('');
  }

  return lines.join('\n').trimEnd();
}
