import { DifficultyId, getPatternRule, LevelId, PatternKey, WardenVoiceId } from '../data/level1';

const STORAGE_KEY = 'rift_runners_gemini_w1l1_v1';

export interface GameSettings {
  font: 'lexend' | 'dyslexic';
  textSize: 'normal' | 'large' | 'xlarge';
  spanish: boolean;
  difficulty: DifficultyId;
  focusMode: boolean;
  speakFirst: number; // 0..3
  speakRunes: boolean;
  reducedMotion: boolean;
  voiceVol: number;
  musicVol: number;
  effectsVol: number;
  wardenVoice: WardenVoiceId;
}

export interface PatternHistory {
  // Sequence of booleans: true = first-try clean read without help
  reads: boolean[];
  // Once mastered on a level, stays locked until manually cleared
  locked?: boolean;
}

export interface BattleRecord {
  ts: number;
  levelId?: LevelId;
  win: boolean;
  stars: number;
  words: number;
  firstTry: number;
  waves: number;
  anchor: number;
}

export interface StoredProgress {
  settings: GameSettings;
  patterns: Record<string, PatternHistory>;
  levelPatterns: Record<string, Record<string, PatternHistory>>;
  totalForged: number;
  bestStars: number;
  wins: number;
  losses: number;
  seenHalfSpeedTip: boolean;
  levelStars: Record<string, number>;
  levelWins: Record<string, number>;
  battles: BattleRecord[];
}

export const DEFAULT_SETTINGS: GameSettings = {
  font: 'lexend',
  textSize: 'normal',
  spanish: false,
  difficulty: 'normal',
  focusMode: false,
  speakFirst: 0,
  speakRunes: true,
  reducedMotion: false,
  voiceVol: 8,
  musicVol: 5,
  effectsVol: 8,
  wardenVoice: 'Leda',
};

const BASE_PATTERNS: PatternKey[] = ['a', 'e', 'i', 'o', 'u'];

function defaultProgress(): StoredProgress {
  return {
    settings: { ...DEFAULT_SETTINGS },
    patterns: {
      a: { reads: [] },
      e: { reads: [] },
      i: { reads: [] },
      o: { reads: [] },
      u: { reads: [] },
    },
    levelPatterns: {},
    totalForged: 0,
    bestStars: 0,
    wins: 0,
    losses: 0,
    seenHalfSpeedTip: false,
    levelStars: { 'w1-l1': 0, 'w1-l2': 0, 'w1-l3': 0, 'w1-l4': 0, 'w1-l5': 0 },
    levelWins: { 'w1-l1': 0, 'w1-l2': 0, 'w1-l3': 0, 'w1-l4': 0, 'w1-l5': 0 },
    battles: [],
  };
}

export function loadProgress(): StoredProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw);
    const mergedSettings: GameSettings = { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) };
    // One-time migration so all nonsense runes turn on for spoken testing
    const migKey = `${STORAGE_KEY}_runes_speak_v2`;
    if (!localStorage.getItem(migKey)) {
      mergedSettings.speakRunes = true;
      localStorage.setItem(migKey, '1');
    }
    const bestStars = Number(parsed.bestStars || 0);
    const wins = Number(parsed.wins || 0);
    const parsedPatterns: Record<string, PatternHistory> = {};
    for (const k of BASE_PATTERNS) {
      parsedPatterns[k] = {
        reads: Array.isArray(parsed.patterns?.[k]?.reads)
          ? parsed.patterns[k].reads.slice(-120)
          : [],
      };
    }
    if (parsed.patterns && typeof parsed.patterns === 'object') {
      for (const [k, val] of Object.entries(parsed.patterns)) {
        if (!parsedPatterns[k]) {
          const reads = (val as any)?.reads;
          parsedPatterns[k] = { reads: Array.isArray(reads) ? reads.slice(-120) : [] };
        }
      }
    }

    const parsedStars: Record<string, number> = {
      'w1-l1': Number(parsed.levelStars?.['w1-l1'] ?? bestStars),
      'w1-l2': Number(parsed.levelStars?.['w1-l2'] ?? 0),
      'w1-l3': Number(parsed.levelStars?.['w1-l3'] ?? 0),
      'w1-l4': Number(parsed.levelStars?.['w1-l4'] ?? 0),
      'w1-l5': Number(parsed.levelStars?.['w1-l5'] ?? 0),
    };
    if (parsed.levelStars && typeof parsed.levelStars === 'object') {
      for (const [k, v] of Object.entries(parsed.levelStars)) {
        if (parsedStars[k] === undefined) parsedStars[k] = Number(v || 0);
      }
    }

    const parsedWins: Record<string, number> = {
      'w1-l1': Number(parsed.levelWins?.['w1-l1'] ?? wins),
      'w1-l2': Number(parsed.levelWins?.['w1-l2'] ?? 0),
      'w1-l3': Number(parsed.levelWins?.['w1-l3'] ?? 0),
      'w1-l4': Number(parsed.levelWins?.['w1-l4'] ?? 0),
      'w1-l5': Number(parsed.levelWins?.['w1-l5'] ?? 0),
    };
    if (parsed.levelWins && typeof parsed.levelWins === 'object') {
      for (const [k, v] of Object.entries(parsed.levelWins)) {
        if (parsedWins[k] === undefined) parsedWins[k] = Number(v || 0);
      }
    }

    const parsedLevelPatterns: Record<string, Record<string, PatternHistory>> = {};
    if (parsed.levelPatterns && typeof parsed.levelPatterns === 'object') {
      for (const [lvId, lvMap] of Object.entries(parsed.levelPatterns)) {
        if (lvMap && typeof lvMap === 'object') {
          parsedLevelPatterns[lvId] = {};
          for (const [pat, val] of Object.entries(lvMap as Record<string, any>)) {
            parsedLevelPatterns[lvId][pat] = {
              reads: Array.isArray(val?.reads) ? val.reads.slice(-120) : [],
              locked: Boolean(val?.locked),
            };
          }
        }
      }
    } else {
      // One-time migration from legacy global locks: preserve filled locks for already-won levels
      for (const [lvId, lvWinCount] of Object.entries(parsedWins)) {
        if (lvWinCount > 0) {
          parsedLevelPatterns[lvId] = {};
          for (const [pat, hist] of Object.entries(parsedPatterns)) {
            parsedLevelPatterns[lvId][pat] = { reads: [...hist.reads] };
          }
        }
      }
    }

    const parsedBattles: BattleRecord[] = Array.isArray(parsed.battles)
      ? parsed.battles.slice(-20)
      : [];
    const parsedLosses =
      typeof parsed.losses === 'number'
        ? parsed.losses
        : parsedBattles.filter((b) => !b.win).length;

    return {
      settings: mergedSettings,
      patterns: parsedPatterns,
      levelPatterns: parsedLevelPatterns,
      totalForged: Number(parsed.totalForged || 0),
      bestStars,
      wins,
      losses: parsedLosses,
      seenHalfSpeedTip: Boolean(parsed.seenHalfSpeedTip),
      levelStars: parsedStars,
      levelWins: parsedWins,
      battles: parsedBattles,
    };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(data: StoredProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage quota issues
  }
}

export function recordPatternRead(
  progress: StoredProgress,
  pattern: PatternKey,
  firstTryClean: boolean,
  levelId?: LevelId,
  mastery?: { window: number; need: number }
): StoredProgress {
  const prev = progress.patterns[pattern]?.reads || [];
  const nextReads = [...prev, firstTryClean].slice(-120);

  let nextLevelPatterns = progress.levelPatterns;
  if (levelId) {
    const prevLv = progress.levelPatterns?.[levelId] || {};
    const prevEntry = prevLv[pattern];
    const prevLvReads = prevEntry?.reads || [];
    const nextLvReads = [...prevLvReads, firstTryClean].slice(-120);
    const hitMastery = mastery
      ? nextLvReads.length >= mastery.window &&
        nextLvReads.slice(-mastery.window).filter(Boolean).length >= mastery.need
      : false;
    const isLocked = Boolean(prevEntry?.locked) || hitMastery;

    nextLevelPatterns = {
      ...progress.levelPatterns,
      [levelId]: {
        ...prevLv,
        [pattern]: { reads: nextLvReads, locked: isLocked },
      },
    };
  }

  const next: StoredProgress = {
    ...progress,
    totalForged: progress.totalForged + 1,
    patterns: {
      ...progress.patterns,
      [pattern]: { reads: nextReads },
    },
    levelPatterns: nextLevelPatterns,
  };
  saveProgress(next);
  return next;
}

export function clearPatternLocks(
  progress: StoredProgress,
  patterns?: PatternKey[],
  levelId?: LevelId
): StoredProgress {
  if (levelId) {
    const prevLv = progress.levelPatterns?.[levelId] || {};
    const nextLv: Record<string, PatternHistory> = { ...prevLv };
    const keys = patterns ?? Object.keys(nextLv);
    for (const p of keys) {
      nextLv[p] = { reads: [], locked: false };
    }
    const next: StoredProgress = {
      ...progress,
      levelPatterns: {
        ...progress.levelPatterns,
        [levelId]: nextLv,
      },
    };
    saveProgress(next);
    return next;
  }

  const keys = patterns ?? Object.keys(progress.patterns);
  const nextPatterns = { ...progress.patterns };
  for (const p of keys) {
    nextPatterns[p] = { reads: [] };
  }
  const next: StoredProgress = {
    ...progress,
    patterns: nextPatterns,
    levelPatterns: {},
  };
  saveProgress(next);
  return next;
}

export interface PatternLockStatus {
  vowel: PatternKey;
  label: string;
  recentCount: number;
  recentCorrect: number;
  need: number;
  window: number;
  done: boolean;
}

export function getPatternLocks(
  progress: StoredProgress,
  patterns: PatternKey[] = ['a', 'i'],
  windowSize = 10,
  need = 9,
  levelId?: LevelId
): PatternLockStatus[] {
  const sourceMap = levelId ? progress.levelPatterns?.[levelId] || {} : progress.patterns;
  return patterns.map((p) => {
    const entry = sourceMap[p];
    const reads = entry?.reads || [];
    const slice = reads.slice(-windowSize);
    const correct = slice.filter(Boolean).length;
    const done = Boolean(entry?.locked) || (slice.length >= windowSize && correct >= need);
    return {
      vowel: p,
      label: getPatternRule(p).label,
      recentCount: done ? windowSize : slice.length,
      recentCorrect: done ? need : correct,
      need,
      window: windowSize,
      done,
    };
  });
}

export interface ThenNowRow {
  vowel: PatternKey;
  label: string;
  totalReads: number;
  thenPct: number | null;
  nowPct: number;
  delta: number | null;
}

export function computeThenAndNow(
  progress: StoredProgress,
  patterns: PatternKey[] = ['a', 'i']
): {
  rows: ThenNowRow[];
  headline: string;
} {
  const rows: ThenNowRow[] = patterns.map((p) => {
    const reads = progress.patterns[p]?.reads || [];
    const last10 = reads.slice(-10);
    const nowPct = last10.length ? Math.round((last10.filter(Boolean).length / last10.length) * 100) : 0;
    const label = getPatternRule(p).label;
    if (reads.length >= 15) {
      const first10 = reads.slice(0, 10);
      const thenPct = Math.round((first10.filter(Boolean).length / first10.length) * 100);
      return {
        vowel: p,
        label,
        totalReads: reads.length,
        thenPct,
        nowPct,
        delta: nowPct - thenPct,
      };
    }
    return {
      vowel: p,
      label,
      totalReads: reads.length,
      thenPct: null,
      nowPct,
      delta: null,
    };
  });

  const bestGain = rows
    .filter((r) => r.delta !== null && r.delta > 0)
    .sort((a, b) => (b.delta || 0) - (a.delta || 0))[0];

  const headline = bestGain
    ? `${bestGain.label}: up ${bestGain.delta} points since your first tries`
    : `Holding strong with ${progress.totalForged} words forged all time`;

  return { rows, headline };
}
