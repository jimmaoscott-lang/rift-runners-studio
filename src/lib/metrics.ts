import {
  DifficultyId,
  getPatternRule,
  LEVEL_ORDER,
  LevelId,
  LEVELS,
  PatternKey,
  WardenVoiceId,
} from '../data/level1';

const STORAGE_KEY = 'rift_runners_gemini_w1l1_v1';

export interface GameSettings {
  font: 'lexend' | 'dyslexic';
  textSize: 'normal' | 'large' | 'xlarge';
  spanish: boolean;
  spanishL1Voice: boolean;
  slowBlendAudio: boolean;
  spanishRules: boolean;
  spanishCaptions: boolean;
  difficulty: DifficultyId;
  focusMode: boolean;
  speakFirst: number; // 0..3
  speakRunes: boolean;
  reducedMotion: boolean;
  voiceVol: number;
  musicVol: number;
  effectsVol: number;
  wardenVoice: WardenVoiceId;
  unlockAllLevels: boolean;
}

export interface PatternHistory {
  // Sequence of booleans: true = first-try clean read without help
  reads: boolean[];
  // Once mastered on a level, stays locked until manually cleared
  locked?: boolean;
}

export interface AccommodationSnapshot {
  ellSupports: string[];
  readingSupports: string[];
  voiceAdaptations: string[];
  slowBlendUsed?: number;
  meaningTapped?: number;
  voiceFitMatches?: number;
  helpUsed?: number;
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
  accommodations?: AccommodationSnapshot;
}

export interface PlacementStageResult {
  stageId: string;
  label: string;
  targetLevelId: LevelId;
  correct: number;
  total: number;
  passed: boolean;
  status: 'passed' | 'placed_here' | 'not_tested';
}

export interface PlacementReport {
  completedAt: number;
  recommendedLevelId: LevelId;
  unlockedLevelIds: LevelId[];
  clearedStageIds: string[];
  allMastered: boolean;
  stages: PlacementStageResult[];
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
  placement?: PlacementReport | null;
  battles: BattleRecord[];
}

export const DEFAULT_SETTINGS: GameSettings = {
  font: 'lexend',
  textSize: 'normal',
  spanish: false,
  spanishL1Voice: false,
  slowBlendAudio: false,
  spanishRules: false,
  spanishCaptions: false,
  difficulty: 'normal',
  focusMode: false,
  speakFirst: 0,
  speakRunes: true,
  reducedMotion: false,
  voiceVol: 8,
  musicVol: 5,
  effectsVol: 8,
  wardenVoice: 'Leda',
  unlockAllLevels: false,
};

export function countActiveEllSupports(s: GameSettings): number {
  let count = 0;
  if (s.spanish) count += 1;
  if (s.spanishL1Voice) count += 1;
  if (s.slowBlendAudio) count += 1;
  if (s.spanishRules) count += 1;
  if (s.spanishCaptions) count += 1;
  return count;
}

export function buildAccommodationSnapshot(
  settings: GameSettings,
  voiceProfiles: Array<{
    pattern: string;
    mode?: string;
    labelNote?: string;
    targetFloor?: number;
    allowedHeard?: string[];
  }> = [],
  wordOverrides: Array<{ word: string; acceptedHeard: string[] }> = [],
  usage?: {
    slowBlendUsed?: number;
    meaningTapped?: number;
    voiceFitMatches?: number;
    helpUsed?: number;
  }
): AccommodationSnapshot {
  const ellSupports: string[] = [];
  if (settings.spanishL1Voice) ellSupports.push('Spanish L1 Voice Fit');
  if (settings.slowBlendAudio) ellSupports.push('Slow Blend Audio');
  if (settings.spanish) ellSupports.push('Spanish Meanings & Glosses');
  if (settings.spanishRules) ellSupports.push('Bilingual Sound Rules');
  if (settings.spanishCaptions) ellSupports.push('Dual-Language Captions');

  const readingSupports: string[] = [];
  if (settings.font === 'dyslexic') readingSupports.push('OpenDyslexic Font');
  if (settings.textSize === 'large') readingSupports.push('Large Word Text');
  if (settings.textSize === 'xlarge') readingSupports.push('Extra Large Word Text');
  if (settings.focusMode) readingSupports.push('Focus Mode (0.5x Speed)');
  if (settings.reducedMotion) readingSupports.push('Reduced Motion');
  if (settings.speakFirst > 0) readingSupports.push(`Speak First (${settings.speakFirst} tries)`);
  if (!settings.speakRunes) readingSupports.push('Tap Mode for Runes');

  const voiceAdaptations: string[] = [];
  for (const vp of voiceProfiles) {
    const label = getPatternRule(vp.pattern as PatternKey).label;
    if (vp.labelNote) {
      voiceAdaptations.push(`${label}: ${vp.labelNote}`);
    } else if (vp.mode === 'accommodation') {
      voiceAdaptations.push(
        `${label}: accepts ${vp.allowedHeard?.join(', ') || 'adapted sound'}`
      );
    } else {
      voiceAdaptations.push(`${label}: calibrated floor ${vp.targetFloor ?? 50}`);
    }
  }
  for (const wo of wordOverrides) {
    const variants = wo.acceptedHeard.map((h) => `"${h}"`).join(', ');
    voiceAdaptations.push(`Word "${wo.word}": counts ${variants}`);
  }

  return {
    ellSupports,
    readingSupports,
    voiceAdaptations,
    slowBlendUsed: usage?.slowBlendUsed ?? 0,
    meaningTapped: usage?.meaningTapped ?? 0,
    voiceFitMatches: usage?.voiceFitMatches ?? 0,
    helpUsed: usage?.helpUsed ?? 0,
  };
}

export function formatBattleTeacherNote(params: {
  worldName: string;
  levelNum: number;
  levelName: string;
  win: boolean;
  stars: number;
  waves: number;
  forged: number;
  firstTry: number;
  runes: number;
  runeFirst: number;
  practice: string[];
  locks: PatternLockStatus[];
  snapshot: AccommodationSnapshot;
  date?: Date;
}): string {
  const dt = (params.date || new Date()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const accPct = params.forged > 0 ? Math.round((params.firstTry / params.forged) * 100) : 0;
  const runeLine =
    params.runes > 0
      ? `Nonsense runes: ${params.runeFirst}/${params.runes} first try`
      : 'Nonsense runes: 0';
  const lockLine = params.locks
    .map((l) => `${l.label} ${l.recentCorrect}/${l.need}${l.done ? ' (Mastered)' : ''}`)
    .join('; ');

  const usageParts: string[] = [];
  if ((params.snapshot.helpUsed ?? 0) > 0) usageParts.push(`Audio help: ${params.snapshot.helpUsed}`);
  if ((params.snapshot.slowBlendUsed ?? 0) > 0) {
    usageParts.push(`Slow Blend: ${params.snapshot.slowBlendUsed}`);
  }
  if ((params.snapshot.meaningTapped ?? 0) > 0) {
    usageParts.push(`Spanish meanings tapped: ${params.snapshot.meaningTapped}`);
  }
  if ((params.snapshot.voiceFitMatches ?? 0) > 0) {
    usageParts.push(`Voice-fit matches: ${params.snapshot.voiceFitMatches}`);
  }

  const lines = [
    `Rift Runners Session Summary (${dt})`,
    `Stage: ${params.worldName}, Level ${params.levelNum}: ${params.levelName}`,
    `Outcome: ${params.win ? `Victory (${params.stars}/3 stars)` : 'Attempt completed'}, Waves cleared: ${params.waves}`,
    `Reading: ${params.forged} words forged, ${accPct}% first-try accuracy (${params.firstTry}/${params.forged}). ${runeLine}.`,
    `Rift Locks: ${lockLine}`,
    `Practice words: ${params.practice.length > 0 ? params.practice.join(', ') : 'None'}`,
    `ELL supports active: ${params.snapshot.ellSupports.length > 0 ? params.snapshot.ellSupports.join(', ') : 'None'}`,
    `Reading/display supports: ${params.snapshot.readingSupports.length > 0 ? params.snapshot.readingSupports.join(', ') : 'Standard'}`,
    `Voice adaptations: ${params.snapshot.voiceAdaptations.length > 0 ? params.snapshot.voiceAdaptations.join('; ') : 'None'}`,
    `Support usage in session: ${usageParts.length > 0 ? usageParts.join(', ') : 'None used'}`,
  ];
  return lines.join('\n');
}

export function formatPlacementTeacherNote(params: {
  report: PlacementReport;
  recommendedLabel: string;
  forged: number;
  firstTry: number;
  practice: string[];
  snapshot: AccommodationSnapshot;
  date?: Date;
}): string {
  const dt = (params.date || new Date()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const accPct = params.forged > 0 ? Math.round((params.firstTry / params.forged) * 100) : 0;
  const stageLines = params.report.stages
    .filter((s) => s.status !== 'not_tested')
    .map(
      (s) =>
        `- ${s.label}: ${s.correct}/${s.total} (${s.passed ? 'Mastered / Placed past' : 'Recommended starting skill'})`
    );

  const lines = [
    `Rift Runners Basic Training Placement Report (${dt})`,
    `Assigned Starting Level: ${params.recommendedLabel}${params.report.allMastered ? ' (Cleared all 8 placement tiers)' : ''}`,
    `Opened Campaign Levels: ${params.report.unlockedLevelIds.length} of ${LEVEL_ORDER.length}`,
    `Overall Training Reads: ${params.forged} words forged, ${accPct}% first-try accuracy (${params.firstTry}/${params.forged})`,
    'Diagnostic Skill Tiers:',
    ...(stageLines.length > 0 ? stageLines : ['- No tiers completed yet.']),
    `Practice words: ${params.practice.length > 0 ? params.practice.join(', ') : 'None'}`,
    `ELL supports active: ${params.snapshot.ellSupports.length > 0 ? params.snapshot.ellSupports.join(', ') : 'None'}`,
    `Reading/display supports: ${params.snapshot.readingSupports.length > 0 ? params.snapshot.readingSupports.join(', ') : 'Standard'}`,
    `Voice adaptations: ${params.snapshot.voiceAdaptations.length > 0 ? params.snapshot.voiceAdaptations.join('; ') : 'None'}`,
  ];
  return lines.join('\n');
}

export function getUnlockedLevelIds(progress: StoredProgress): Set<LevelId> {
  const unlocked = new Set<LevelId>(['placement', 'w1-l1']);
  if (progress.settings.unlockAllLevels) {
    for (const id of LEVEL_ORDER) unlocked.add(id);
    return unlocked;
  }

  if (progress.placement?.unlockedLevelIds) {
    for (const id of progress.placement.unlockedLevelIds) {
      unlocked.add(id);
    }
  }

  // Winning any level opens that level plus the next level in campaign order
  for (const id of LEVEL_ORDER) {
    const won =
      (progress.levelWins?.[id] ?? 0) > 0 ||
      (progress.levelStars?.[id] ?? 0) > 0 ||
      (id === 'w1-l1' && progress.wins > 0);
    if (won) {
      unlocked.add(id);
      const nextId = LEVELS[id]?.nextLevelId;
      if (nextId) unlocked.add(nextId);
    }
  }

  return unlocked;
}

export function formatOverallTeacherNote(params: {
  progress: StoredProgress;
  activeLevelLabel: string;
  locks: PatternLockStatus[];
  snapshot: AccommodationSnapshot;
  levelNameLookup: (id?: LevelId) => string;
  date?: Date;
}): string {
  const dt = (params.date || new Date()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const lockLine = params.locks
    .map((l) => `${l.label} ${l.recentCorrect}/${l.need}${l.done ? ' (Mastered)' : ''}`)
    .join('; ');
  const recent = [...params.progress.battles].slice(-5).reverse();
  const recentLines =
    recent.length > 0
      ? recent.map((b) => {
          const bDate = new Date(b.ts).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
          const pct = b.words > 0 ? Math.round((b.firstTry / b.words) * 100) : 0;
          const ellCount = b.accommodations?.ellSupports.length ?? 0;
          const accTag =
            ellCount > 0
              ? `ELL supports: ${ellCount}`
              : b.accommodations?.voiceAdaptations.length
              ? `Voice fits: ${b.accommodations.voiceAdaptations.length}`
              : 'Standard';
          return `- ${bDate} | ${params.levelNameLookup(b.levelId)} | ${b.win ? `Win (${b.stars}*)` : 'Attempt'} | ${b.words}w (${pct}% first try) | ${accTag}`;
        })
      : ['- No completed battles recorded yet.'];

  const lines = [
    `Rift Runners Progress & Accommodation Snapshot (${dt})`,
    `All-time totals: ${params.progress.totalForged} words forged, ${params.progress.wins} wins`,
    `Active stage (${params.activeLevelLabel}): ${lockLine}`,
    `Current ELL supports: ${params.snapshot.ellSupports.length > 0 ? params.snapshot.ellSupports.join(', ') : 'None'}`,
    `Current reading/display supports: ${params.snapshot.readingSupports.length > 0 ? params.snapshot.readingSupports.join(', ') : 'Standard'}`,
    `Saved voice adaptations: ${params.snapshot.voiceAdaptations.length > 0 ? params.snapshot.voiceAdaptations.join('; ') : 'None'}`,
    'Recent sessions:',
    ...recentLines,
  ];
  return lines.join('\n');
}

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
    placement: null,
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
      placement:
        parsed.placement && typeof parsed.placement === 'object'
          ? (parsed.placement as PlacementReport)
          : null,
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
