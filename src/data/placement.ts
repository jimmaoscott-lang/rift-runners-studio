import { LevelConfig, LevelId, LEVELS, PatternKey, WordEntry } from './level1';
import { PlacementReport, PlacementStageResult } from '../lib/metrics';

export interface PlacementStageSpec {
  id: string;
  shortLabel: string;
  label: string;
  /** The campaign level whose skills this stage tests */
  sourceLevelId: LevelId;
  /** Levels opened as soon as the student passes this stage */
  unlocksOnPass: LevelId[];
  /** Recommended next level label announced on pass */
  nextOpenedLabel: string;
  /** Curated 4-word diagnostic probe (3 real + 1 nonsense rune) */
  probeWords: string[];
  /** Number of clean first-try reads out of 4 required to pass this tier */
  passNeed: number;
}

export const PLACEMENT_STAGES: PlacementStageSpec[] = [
  {
    id: 'stage-w1-l1',
    shortLabel: 'a / i',
    label: 'Short a & Short i',
    sourceLevelId: 'w1-l1',
    unlocksOnPass: ['w1-l1', 'w1-l2'],
    nextOpenedLabel: 'Level 2: Bramble Crossing',
    probeWords: ['map', 'tag', 'dig', 'pid'],
    passNeed: 3,
  },
  {
    id: 'stage-w1-l2',
    shortLabel: 'o / u',
    label: 'Short o & Short u',
    sourceLevelId: 'w1-l2',
    unlocksOnPass: ['w1-l3'],
    nextOpenedLabel: 'Level 3: Hollow Bridge',
    probeWords: ['hot', 'box', 'fun', 'mub'],
    passNeed: 3,
  },
  {
    id: 'stage-w1-l3',
    shortLabel: 'e / CVC',
    label: 'Short e & CVC Mastery',
    sourceLevelId: 'w1-l3',
    unlocksOnPass: ['w1-l4', 'w1-l5', 'w2-l1'],
    nextOpenedLabel: 'World 2: Ashgate Outpost',
    probeWords: ['jet', 'red', 'web', 'mep'],
    passNeed: 3,
  },
  {
    id: 'stage-w2-l1',
    shortLabel: 'sh / ch',
    label: 'Digraphs sh & ch',
    sourceLevelId: 'w2-l1',
    unlocksOnPass: ['w2-l2'],
    nextOpenedLabel: 'World 2, Level 2: Smelter Causeway',
    probeWords: ['ship', 'dish', 'chip', 'shab'],
    passNeed: 3,
  },
  {
    id: 'stage-w2-l2',
    shortLabel: 'th / wh / -ck',
    label: 'Digraphs th, wh & -ck',
    sourceLevelId: 'w2-l2',
    unlocksOnPass: ['w2-l3'],
    nextOpenedLabel: 'World 2, Level 3: Ironrift Crossing',
    probeWords: ['thin', 'whip', 'lock', 'thab'],
    passNeed: 3,
  },
  {
    id: 'stage-w2-l3',
    shortLabel: 'L/R Blends',
    label: 'L-Blends & R-Blends',
    sourceLevelId: 'w2-l3',
    unlocksOnPass: ['w2-l4'],
    nextOpenedLabel: 'World 2, Level 4: Crucible Bastion',
    probeWords: ['black', 'clap', 'frog', 'blap'],
    passNeed: 3,
  },
  {
    id: 'stage-w2-l4',
    shortLabel: 'S & End Blends',
    label: 'S-Blends & Final Blends',
    sourceLevelId: 'w2-l4',
    unlocksOnPass: ['w2-l5', 'w3-l1'],
    nextOpenedLabel: 'World 3: Dawnbreak Terrace',
    probeWords: ['spin', 'stop', 'hand', 'bamp'],
    passNeed: 3,
  },
  {
    id: 'stage-w3-l1',
    shortLabel: 'Silent-E',
    label: 'Silent-E Long a_e & i_e',
    sourceLevelId: 'w3-l1',
    unlocksOnPass: ['w3-l1'],
    nextOpenedLabel: 'All Shipped Tiers Cleared',
    probeWords: ['cake', 'cape', 'bike', 'bape'],
    passNeed: 3,
  },
];

export const PLACEMENT_TIER_BONUS = 75;

function lookupStageWordEntries(stage: PlacementStageSpec): WordEntry[] {
  const lv = LEVELS[stage.sourceLevelId];
  const all = [...lv.realWords, ...lv.runes];
  const entries: WordEntry[] = [];
  for (const w of stage.probeWords) {
    const found = all.find((e) => e.w.toLowerCase() === w.toLowerCase());
    if (found) entries.push(found);
  }
  return entries;
}

export const PLACEMENT_STAGE_WORDS: Record<string, WordEntry[]> = Object.fromEntries(
  PLACEMENT_STAGES.map((st) => [st.id, lookupStageWordEntries(st)])
);

export interface PlacementRunState {
  stageIdx: number;
  wordIdx: number;
  currentStageReads: boolean[];
  settled: boolean;
  allMastered: boolean;
  recommendedLevelId: LevelId;
  unlockedLevelIds: LevelId[];
  clearedStageIds: string[];
  stageResults: PlacementStageResult[];
}

export function createInitialPlacementRun(): PlacementRunState {
  return {
    stageIdx: 0,
    wordIdx: 0,
    currentStageReads: [],
    settled: false,
    allMastered: false,
    recommendedLevelId: 'w1-l1',
    unlockedLevelIds: ['w1-l1'],
    clearedStageIds: [],
    stageResults: PLACEMENT_STAGES.map((st) => ({
      stageId: st.id,
      label: st.label,
      targetLevelId: st.sourceLevelId,
      correct: 0,
      total: st.probeWords.length,
      passed: false,
      status: 'not_tested',
    })),
  };
}

export function getPlacementNextWord(run: PlacementRunState): WordEntry | null {
  if (run.settled) return null;
  const stage = PLACEMENT_STAGES[run.stageIdx];
  if (!stage) return null;
  const words = PLACEMENT_STAGE_WORDS[stage.id] || [];
  return words[run.wordIdx] || null;
}

export interface PlacementAdvanceOutcome {
  next: PlacementRunState;
  justClearedStage: PlacementStageSpec | null;
  justSettled: boolean;
}

export function advancePlacementRun(
  prev: PlacementRunState,
  firstTryClean: boolean
): PlacementAdvanceOutcome {
  if (prev.settled) {
    return { next: prev, justClearedStage: null, justSettled: false };
  }

  const stage = PLACEMENT_STAGES[prev.stageIdx];
  if (!stage) {
    return {
      next: { ...prev, settled: true, allMastered: true },
      justClearedStage: null,
      justSettled: !prev.settled,
    };
  }

  const nextReads = [...prev.currentStageReads, firstTryClean];
  const stageTotal = (PLACEMENT_STAGE_WORDS[stage.id] || stage.probeWords).length;

  // Still inside this 4-word tier
  if (nextReads.length < stageTotal) {
    const nextResults = prev.stageResults.map((r, i) =>
      i === prev.stageIdx ? { ...r, correct: nextReads.filter(Boolean).length } : r
    );
    return {
      next: {
        ...prev,
        wordIdx: nextReads.length,
        currentStageReads: nextReads,
        stageResults: nextResults,
      },
      justClearedStage: null,
      justSettled: false,
    };
  }

  // Completed all 4 words of this stage: evaluate mastery
  const cleanCount = nextReads.filter(Boolean).length;
  const passed = cleanCount >= stage.passNeed;

  if (passed) {
    const nextUnlocked = Array.from(
      new Set<LevelId>([...prev.unlockedLevelIds, ...stage.unlocksOnPass])
    );
    const nextCleared = Array.from(new Set<string>([...prev.clearedStageIds, stage.id]));
    const nextResults = prev.stageResults.map((r, i) =>
      i === prev.stageIdx
        ? { ...r, correct: cleanCount, total: stageTotal, passed: true, status: 'passed' as const }
        : r
    );

    const isLastStage = prev.stageIdx >= PLACEMENT_STAGES.length - 1;
    if (isLastStage) {
      return {
        next: {
          stageIdx: prev.stageIdx,
          wordIdx: stageTotal,
          currentStageReads: nextReads,
          settled: true,
          allMastered: true,
          recommendedLevelId: 'w3-l1',
          unlockedLevelIds: nextUnlocked,
          clearedStageIds: nextCleared,
          stageResults: nextResults,
        },
        justClearedStage: stage,
        justSettled: true,
      };
    }

    const nextStage = PLACEMENT_STAGES[prev.stageIdx + 1];
    return {
      next: {
        stageIdx: prev.stageIdx + 1,
        wordIdx: 0,
        currentStageReads: [],
        settled: false,
        allMastered: false,
        recommendedLevelId: nextStage.sourceLevelId,
        unlockedLevelIds: nextUnlocked,
        clearedStageIds: nextCleared,
        stageResults: nextResults,
      },
      justClearedStage: stage,
      justSettled: false,
    };
  }

  // Found their instructional zone cleanly: zero shame, settle right on this level!
  const nextResults = prev.stageResults.map((r, i) =>
    i === prev.stageIdx
      ? {
          ...r,
          correct: cleanCount,
          total: stageTotal,
          passed: false,
          status: 'placed_here' as const,
        }
      : r
  );
  const nextUnlocked = Array.from(
    new Set<LevelId>([...prev.unlockedLevelIds, stage.sourceLevelId])
  );
  return {
    next: {
      ...prev,
      wordIdx: stageTotal,
      currentStageReads: nextReads,
      settled: true,
      allMastered: false,
      recommendedLevelId: stage.sourceLevelId,
      unlockedLevelIds: nextUnlocked,
      stageResults: nextResults,
    },
    justClearedStage: null,
    justSettled: true,
  };
}

export function buildPlacementReport(run: PlacementRunState): PlacementReport {
  return {
    completedAt: Date.now(),
    recommendedLevelId: run.recommendedLevelId,
    unlockedLevelIds: Array.from(new Set<LevelId>(['w1-l1', ...run.unlockedLevelIds])),
    clearedStageIds: [...run.clearedStageIds],
    allMastered: run.allMastered,
    stages: run.stageResults.map((r) => ({ ...r })),
  };
}

const ALL_TRAINING_REAL_WORDS: WordEntry[] = PLACEMENT_STAGES.flatMap((st) =>
  (PLACEMENT_STAGE_WORDS[st.id] || []).filter((w) => w.kind === 'real')
);

const ALL_TRAINING_RUNES: WordEntry[] = PLACEMENT_STAGES.flatMap((st) =>
  (PLACEMENT_STAGE_WORDS[st.id] || []).filter((w) => w.kind === 'rune')
);

const ALL_TRAINING_PATTERNS: PatternKey[] = Array.from(
  new Set<PatternKey>(['a', 'i', 'o', 'u', 'e', 'sh', 'ch', 'th', 'wh', 'ck', 'bl', 'cl', 'fr', 'sp', 'st', 'nd', 'mp', 'a_e', 'i_e'])
);

export const BASIC_TRAINING_LEVEL: LevelConfig = {
  id: 'placement',
  num: 0,
  worldId: 'training',
  worldName: 'Proving Grounds',
  name: 'Runner Basic Training',
  headline: 'Find Your Starting Rift',
  description:
    'Defend the proving grounds while testing your reading skills step by step. Every skill tier you clear opens the next level on the campaign map automatically.',
  enemiesSummary: 'Training Wisps & Thornbacks',
  wordsSummary: 'Adaptive Skill Placement (8 Tiers)',
  rewardSummary: 'Opens your matched starting level and every tier you cleared',
  nextLevelId: 'w1-l1',
  vowels: ALL_TRAINING_PATTERNS,
  defenders: ['archer', 'frost', 'spike', 'golem'],
  runeRate: 0.25,
  startCrystals: 145,
  waveEvery: 8,
  anchor: 15,
  minWaves: 1,
  bonusSurgeWaves: 0,
  mastery: {
    window: 4,
    need: 3,
  },
  endless: {
    hpStep: 0.14,
    countStep: 0.12,
  },
  finalBoost: 1.1,
  hasWalkthrough: false,
  isPlacement: true,
  freePlacement: true,
  noBuildZones: [
    // Top fence, straw training dummies, and archery targets
    { u: 0.26, v: 0.06, r: 0.08, label: 'Training fence' },
    { u: 0.40, v: 0.06, r: 0.08, label: 'Training fence' },
    { u: 0.56, v: 0.06, r: 0.08, label: 'Training fence' },
    { u: 0.72, v: 0.06, r: 0.08, label: 'Training fence' },
    { u: 0.88, v: 0.08, r: 0.09, label: 'Training fence' },
  ],
  backdropImage: '/src/assets/images/cutscene_basic_training_1795737205953.jpg',
  pathUv: [
    [0.125, 0.235],
    [0.185, 0.305],
    [0.255, 0.355],
    [0.335, 0.365],
    [0.415, 0.305],
    [0.485, 0.225],
    [0.565, 0.195],
    [0.655, 0.225],
    [0.705, 0.315],
    [0.68, 0.415],
    [0.595, 0.495],
    [0.505, 0.565],
    [0.46, 0.655],
    [0.49, 0.745],
    [0.585, 0.805],
    [0.705, 0.815],
    [0.815, 0.81],
    [0.875, 0.79],
  ],
  riverUv: [],
  riftUv: [0.125, 0.215],
  campUv: [0.875, 0.775],
  wardenUv: [0.805, 0.685],
  pads: [],
  waves: [
    {
      hp: 0.9,
      groups: [{ type: 'wisp', count: 5, gap: 1.5 }],
    },
    {
      hp: 0.95,
      groups: [
        { type: 'wisp', count: 4, gap: 1.35 },
        { type: 'thornback', count: 4, gap: 1.75, delay: 1.2 },
      ],
    },
    {
      hp: 1.0,
      groups: [
        { type: 'thornback', count: 5, gap: 1.55 },
        { type: 'wisp', count: 6, gap: 1.15, delay: 1.0 },
      ],
    },
    {
      hp: 1.05,
      groups: [
        { type: 'bramble', count: 3, gap: 1.85 },
        { type: 'thornback', count: 5, gap: 1.45, delay: 1.0 },
        { type: 'wisp', count: 6, gap: 1.05, delay: 2.0 },
      ],
    },
  ],
  realWords: ALL_TRAINING_REAL_WORDS,
  runes: ALL_TRAINING_RUNES,
  cutscenes: {
    opening: {
      id: 'opening',
      title: 'Runner Basic Training',
      subtitle: 'Proving Grounds · Adaptive Skill Placement',
      beats: [
        {
          id: 'bt-open-v1-1',
          image: '/src/assets/images/cutscene_basic_training_1795737205953.jpg',
          motion: 'zoom',
          durationMs: 9000,
          speaker: 'The Rift Warden',
          voiceText:
            'Welcome to Runner Basic Training. Before we send you to the front lines, let us see which Rift skills you already command.',
          captions: [
            'Welcome to Runner Basic Training. Let us see which Rift skills you already command.',
            'Show what you know so we can drop you right into your best starting level.',
          ],
          accent: 'cyan',
          voiceStyle:
            'Warm, steady veteran guardian welcoming a capable teenage recruit to the proving grounds.',
        },
        {
          id: 'bt-open-v1-2',
          image: '/src/assets/images/cutscene_basic_training_1795737205953.jpg',
          motion: 'pan',
          durationMs: 10500,
          speaker: 'The Rift Warden',
          voiceText:
            'Place defenders anywhere on the open grass or along the trail, then read words in the Rune Forge. Every skill tier you clear opens the next level on the map.',
          captions: [
            'Place defenders freely on open grass or along the trail, then read words in the Rune Forge.',
            'Every skill tier you clear awards +75 crystals and opens the next level on the map.',
          ],
          accent: 'violet',
          voiceStyle:
            'Clear, encouraging tactical mentor explaining the proving grounds run.',
        },
      ],
    },
    victory: {
      id: 'victory',
      title: 'Basic Training Complete',
      subtitle: 'Your Starting Mission Is Open',
      beats: [
        {
          id: 'bt-vic-v1-1',
          image: '/src/assets/images/cutscene_basic_training_1795737205953.jpg',
          motion: 'lift',
          durationMs: 9000,
          speaker: 'The Rift Warden',
          voiceText:
            'Basic Training complete! Your reading profile is locked in, and your starting mission is open on the map. Let us go seal the Rift.',
          captions: [
            'Basic Training complete! Your skill profile is locked in.',
            'Check your Placement Report to jump right into your matched starting level.',
          ],
          accent: 'cyan',
          voiceStyle:
            'Proud, energized mentor congratulating a new Runner on graduating basic training.',
        },
      ],
    },
    defeat: {
      id: 'defeat',
      title: 'Training Run Recorded',
      subtitle: 'Your Placement Results Are Saved',
      beats: [
        {
          id: 'bt-def-v1-1',
          image: '/src/assets/images/cutscene_basic_training_1795737205953.jpg',
          motion: 'zoom',
          durationMs: 9000,
          speaker: 'The Rift Warden',
          voiceText:
            'Good run on the training field. Every word you read still counts toward your placement. Check your report to see which level opened for you.',
          captions: [
            'Good run on the training field. Every word you read still counts toward your placement.',
            'Check your Placement Report to see which level opened for you.',
          ],
          accent: 'crimson',
          voiceStyle:
            'Calm, supportive mentor reassuring the recruit that their training progress is saved.',
        },
      ],
    },
  },
};

export function getLevelConfigById(id: LevelId): LevelConfig {
  if (id === 'placement') return BASIC_TRAINING_LEVEL;
  return LEVELS[id] || LEVELS['w1-l1'];
}
