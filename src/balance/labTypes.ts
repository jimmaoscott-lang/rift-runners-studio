// Shared types, target-cell classification, and plain-text report formatting
// for the Builder-only Balance Lab.

import {
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  DifficultyId,
  LEVELS,
  LevelId,
} from '../data/level1';
import { ReadingAccuracy, SimDials } from './sim';

export const LAB_ACCURACIES: readonly ReadingAccuracy[] = [0.4, 0.6, 0.8, 1.0];

export const TARGET_ACCURACY_BY_DIFF: Record<DifficultyId, ReadingAccuracy> = {
  easy: 0.4,
  normal: 0.6,
  hard: 0.8,
  expert: 1.0,
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
 * Classifies a target diagonal cell (Easy 40%, Normal 60%, Hard 80%, Expert 100%).
 * - Green: won (winRate === 1) with average Anchor 30% to 70%
 * - Red: lost (winRate === 0), too hard (split win with Anchor < 15%), or too easy (Anchor > 85%)
 * - Yellow: close (won with Anchor < 30% or 70%..85%, or split win with Anchor >= 15%)
 */
export function classifyTargetCell(
  winRate: number,
  anchorPct: number
): TargetClassification {
  if (winRate <= 0) {
    return { status: 'red', reason: 'lost', label: 'Lost' };
  }
  if (anchorPct > 0.85) {
    return { status: 'red', reason: 'too_easy', label: 'Too easy' };
  }
  if (winRate >= 1 && anchorPct >= 0.3 && anchorPct <= 0.7) {
    return { status: 'green', reason: 'target', label: 'Target' };
  }
  if (winRate < 1 && anchorPct < 0.15) {
    return { status: 'red', reason: 'too_hard', label: 'Too hard' };
  }
  if (winRate < 1) {
    return { status: 'yellow', reason: 'close_split', label: 'Close' };
  }
  if (anchorPct < 0.3) {
    return { status: 'yellow', reason: 'close_low', label: 'Close' };
  }
  return { status: 'yellow', reason: 'close_high', label: 'Close' };
}

export interface LabCellResult {
  levelId: LevelId;
  difficulty: DifficultyId;
  readingAccuracy: ReadingAccuracy;
  isTarget: boolean;
  targetStatus?: TargetStatus;
  targetReason?: TargetReason;
  targetLabel?: string;
  /** Average win rate of good (75th pct) and optimal (best) plans: 0, 0.5, or 1. */
  winRate: number;
  /** Average Anchor health fraction (0..1) of good and optimal plans. */
  anchorPct: number;
  anchorLeft: number;
  anchorMax: number;
  optimalWon: boolean;
  optimalAnchorPct: number;
  goodWon: boolean;
  goodAnchorPct: number;
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
      type: 'progress';
      runId: number;
      completedUnits: number;
      totalUnits: number;
      levelId: LevelId;
      difficulty?: DifficultyId;
      readingAccuracy?: ReadingAccuracy;
      phase: 'sim' | 'suggest';
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

export function formatLabResultsPlainText(
  levelIds: LevelId[],
  resultsByLevel: Partial<Record<LevelId, LevelLabResult>>
): string {
  const lines: string[] = [
    'Rift Runners Balance Lab Results',
    'Target diagonal: Easy 40%, Normal 60%, Hard 80%, Expert 100%',
    'Markers: [G] Target (Win, Anchor 30%-70%), [Y] Close, [R] Lost or Too easy (>85%)',
    '',
  ];

  const colW = 19;
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
      LAB_ACCURACIES.map((acc) => padRight(`Read ${fmtPct(acc)}`, colW)).join('');
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
        lines.push(
          `  ${dName} @ ${fmtPct(s.readingAccuracy)} (${s.currentStatusLabel}): startCrystals ${s.currentStartCrystals} -> ${s.suggestedStartCrystals}, balance ${s.currentBalanceScale.toFixed(2)} -> ${s.suggestedBalanceScale.toFixed(2)} (est ${fmtPct(s.predictedWinRate)}W / ${fmtPct(s.predictedAnchorPct)}A ${s.predictedLabel})`
        );
      }
    }

    lines.push('');
  }

  return lines.join('\n').trimEnd();
}
