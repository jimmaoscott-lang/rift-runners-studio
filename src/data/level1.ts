export type WorldId = 'w1' | 'w2';
export type VowelKey = 'a' | 'e' | 'i' | 'o' | 'u';
export type PatternKey = VowelKey | (string & {});
export type LevelId = 'w1-l1' | 'w1-l2' | 'w1-l3' | 'w1-l4' | 'w1-l5' | (string & {});
export type DifficultyId = 'easy' | 'normal' | 'hard' | 'expert';

export interface DifficultyConfig {
  id: DifficultyId;
  label: string;
  shortLabel: string;
  desc: string;
  hpMult: number;
  speedMult: number;
}

export const DIFFICULTY_ORDER: DifficultyId[] = ['easy', 'normal', 'hard', 'expert'];

export const DIFFICULTIES: Record<DifficultyId, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    shortLabel: 'Easy',
    desc: 'About 30% lighter waves so students can focus on decoding.',
    hpMult: 0.76,
    speedMult: 0.92,
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    shortLabel: 'Normal',
    desc: 'About 20% lighter than Expert. Balanced for steady runs.',
    hpMult: 0.84,
    speedMult: 0.95,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    shortLabel: 'Hard',
    desc: 'About 10% lighter than Expert. Tough waves that reward smart upgrades.',
    hpMult: 0.92,
    speedMult: 0.98,
  },
  expert: {
    id: 'expert',
    label: 'Expert',
    shortLabel: 'Expert',
    desc: 'Full original wave strength for veteran Rift Runners.',
    hpMult: 1.0,
    speedMult: 1.0,
  },
};

export interface WordEntry {
  w: string;
  kind: 'real' | 'rune';
  options: [string, string];
  pattern?: PatternKey;
  tiles?: string[];
  targetTileIdx?: number;
  es?: string;
  cognate?: boolean;
  sayAlso?: string[];
  azureRef?: string;
  noSpeak?: boolean;
}

export interface DefenderLevelStats {
  dmg?: number;
  range?: number;
  rate?: number;
  dps?: number;
  radius?: number;
  splash?: number;
  hp?: number;
  hold?: number;
  slow?: number;
  multi?: number;
  respawn?: number;
  freezeEvery?: number;
  freezeTime?: number;
  cleave?: boolean;
  chain?: number;
  chainRange?: number;
  beamRamp?: number;
}

export interface DefenderSpec {
  id: 'a' | 'b';
  name: string;
  desc: string;
  cost: number;
  stats: DefenderLevelStats;
}

export type DefenderType = 'archer' | 'spike' | 'golem' | 'frost' | 'ember' | 'tesla';

export interface DefenderDef {
  id: DefenderType;
  name: string;
  shortName: string;
  desc: string;
  kind: 'tower' | 'trail';
  cost: number;
  up: [number, number];
  respawn?: number;
  regen?: number;
  levels: [DefenderLevelStats, DefenderLevelStats, DefenderLevelStats];
  spec: {
    a: DefenderSpec;
    b: DefenderSpec;
  };
}

export type CreatureType =
  | 'wisp'
  | 'thornback'
  | 'bramble'
  | 'bat'
  | 'splitter'
  | 'brute'
  | 'thornking'
  | 'cinderimp';

export interface CreatureDef {
  id: CreatureType;
  name: string;
  hp: number;
  speed: number;
  anchor: number;
  shards: number;
  hit: number;
  size: number;
  flying?: boolean;
  isBoss?: boolean;
  slowResist?: number;
  splitsInto?: { type: CreatureType; count: number };
}

export interface WaveGroup {
  type: CreatureType;
  count: number;
  gap: number;
  delay?: number;
}

export interface WaveDef {
  hp: number;
  groups: WaveGroup[];
}

export type HeroPowerId = 'rally' | 'meteor' | 'freeze';

export interface HeroPowerDef {
  id: HeroPowerId;
  name: string;
  desc: string;
  charge: number;
  haste?: number;
  time?: number;
  dmg?: number;
  radius?: number;
}

export type CutsceneId = 'opening' | 'victory' | 'defeat';

export interface CutsceneBeat {
  id: string;
  image: string;
  motion: 'zoom' | 'pan' | 'lift';
  durationMs: number;
  speaker: string;
  voiceText: string;
  captions: string[];
  accent: 'violet' | 'cyan' | 'crimson';
  voiceStyle?: string;
}

export interface CutsceneScript {
  id: CutsceneId;
  title: string;
  subtitle: string;
  beats: CutsceneBeat[];
}

export interface PadSpec {
  id: string;
  kind: 'tower' | 'trail';
  u: number;
  v: number;
}

export interface LevelConfig {
  id: LevelId;
  worldId: WorldId;
  num: number;
  worldName: string;
  name: string;
  headline: string;
  description: string;
  enemiesSummary: string;
  wordsSummary: string;
  rewardSummary: string;
  nextLevelId?: LevelId;
  vowels: PatternKey[];
  defenders: DefenderType[];
  runeRate: number;
  startCrystals: number;
  waveEvery: number;
  anchor: number;
  minWaves: number;
  bonusSurgeWaves: number;
  mastery: {
    window: number;
    need: number;
  };
  endless: {
    hpStep: number;
    countStep: number;
  };
  finalBoost: number;
  hasWalkthrough: boolean;
  comingSoon?: boolean;
  backdropImage: string;
  pathUv: [number, number][];
  riverUv: [number, number][];
  riftUv: [number, number];
  campUv: [number, number];
  wardenUv: [number, number];
  pads: PadSpec[];
  waves: WaveDef[];
  realWords: WordEntry[];
  runes: WordEntry[];
  cutscenes: Record<CutsceneId, CutsceneScript>;
}

export const FORGE_CONFIG = {
  real: 12,
  rune: 25,
  speak: 18,
  helpShare: 0.3,
  shown: 3,
  mega: 115,
  megaPips: 8,
  megaBlast: 25,
  fastGuessMs: 1500,
  cooldownFirst: 5,
  cooldownLater: 10,
} as const;

export interface PatternRule {
  label: string;
  shortLabel?: string;
  show: string;
  word: string;
  ruleLine: string;
  ruleAudioId?: string;
}

export const VOWEL_RULES: Record<VowelKey, PatternRule> = {
  a: {
    label: 'Short a',
    shortLabel: 'a',
    show: '/ă/',
    word: 'at',
    ruleLine: 'One vowel, closed in by a consonant, says its short sound.',
    ruleAudioId: 'rule.cvc',
  },
  e: {
    label: 'Short e',
    shortLabel: 'e',
    show: '/ĕ/',
    word: 'jet',
    ruleLine: 'One vowel, closed in by a consonant, says its short sound.',
    ruleAudioId: 'rule.cvc',
  },
  i: {
    label: 'Short i',
    shortLabel: 'i',
    show: '/ĭ/',
    word: 'it',
    ruleLine: 'One vowel, closed in by a consonant, says its short sound.',
    ruleAudioId: 'rule.cvc',
  },
  o: {
    label: 'Short o',
    shortLabel: 'o',
    show: '/ŏ/',
    word: 'on',
    ruleLine: 'One vowel, closed in by a consonant, says its short sound.',
    ruleAudioId: 'rule.cvc',
  },
  u: {
    label: 'Short u',
    shortLabel: 'u',
    show: '/ŭ/',
    word: 'up',
    ruleLine: 'One vowel, closed in by a consonant, says its short sound.',
    ruleAudioId: 'rule.cvc',
  },
};

export const PATTERN_RULES: Record<string, PatternRule> = {
  ...VOWEL_RULES,
  sh: {
    label: 'sh digraph',
    shortLabel: 'sh',
    show: '/sh/',
    word: 'ship',
    ruleAudioId: 'rule.sh.v2',
    ruleLine: 'Two letters, s and h, team up to make one quiet sound.',
  },
  ch: {
    label: 'ch digraph',
    shortLabel: 'ch',
    show: '/ch/',
    word: 'chip',
    ruleAudioId: 'rule.ch.v2',
    ruleLine: 'Two letters, c and h, team up to make one crisp sound.',
  },
  th: {
    label: 'th digraph',
    shortLabel: 'th',
    show: '/th/',
    word: 'thin',
    ruleAudioId: 'rule.th.v2',
    ruleLine: 'Two letters, t and h, team up to make one smooth sound.',
  },
  wh: {
    label: 'wh digraph',
    shortLabel: 'wh',
    show: '/wh/',
    word: 'whip',
    ruleAudioId: 'rule.wh.v2',
    ruleLine: 'Two letters, w and h, team up at the start of a word to make one sound.',
  },
  ck: {
    label: '-ck digraph',
    shortLabel: 'ck',
    show: '/k/',
    word: 'lock',
    ruleAudioId: 'rule.ck.v2',
    ruleLine: 'Right after a short vowel, c and k team up to make one sound.',
  },
};

export function getPatternRule(key: PatternKey): PatternRule {
  return (
    PATTERN_RULES[key] || {
      label: key.toUpperCase(),
      shortLabel: key,
      show: `/${key}/`,
      word: key,
      ruleLine: 'Listen to each sound tile and blend the word together.',
    }
  );
}

export const LEVEL1_REAL_WORDS: WordEntry[] = [
  { w: 'map', kind: 'real', options: ['mip', 'mup'], es: 'mapa', cognate: true },
  { w: 'zap', kind: 'real', options: ['zip', 'zup'], es: 'descarga' },
  { w: 'gas', kind: 'real', options: ['gus', 'gos'], es: 'gas', cognate: true },
  { w: 'lab', kind: 'real', options: ['lib', 'lub'], es: 'laboratorio', cognate: true },
  { w: 'cab', kind: 'real', options: ['cub', 'cob'], es: 'taxi' },
  { w: 'jab', kind: 'real', options: ['jib', 'jub'], es: 'golpe rápido' },
  { w: 'tag', kind: 'real', options: ['tig', 'tug'], es: 'etiqueta' },
  { w: 'fan', kind: 'real', options: ['fin', 'fun'], es: 'ventilador o aficionado' },
  { w: 'hit', kind: 'real', options: ['hat', 'hut'], es: 'golpear' },
  { w: 'rip', kind: 'real', options: ['rap', 'rup'], es: 'rasgar' },
  { w: 'dig', kind: 'real', options: ['dag', 'dug'], es: 'cavar' },
  { w: 'zip', kind: 'real', options: ['zap', 'zup'], es: 'cierre' },
  { w: 'fit', kind: 'real', options: ['fut', 'fot'], es: 'en forma' },
  { w: 'win', kind: 'real', options: ['wan', 'wun'], es: 'ganar', sayAlso: ['when'] },
  { w: 'pin', kind: 'real', options: ['pan', 'pun'], es: 'alfiler', cognate: true },
  { w: 'mix', kind: 'real', options: ['max', 'mux'], es: 'mezclar', cognate: true, sayAlso: ['mics'] },
];

export const LEVEL1_RUNES: WordEntry[] = [
  { w: 'mib', kind: 'rune', options: ['mab', 'mub'] },
  { w: 'pid', kind: 'rune', options: ['pad', 'pod'], azureRef: 'pidd' },
  { w: 'yat', kind: 'rune', options: ['yit', 'yut'] },
  { w: 'fim', kind: 'rune', options: ['fam', 'fum'] },
  { w: 'baf', kind: 'rune', options: ['bif', 'buf'], azureRef: 'baff' },
  { w: 'jat', kind: 'rune', options: ['jit', 'jut'] },
  { w: 'kib', kind: 'rune', options: ['kab', 'kub'] },
];

export const LEVEL2_REAL_WORDS: WordEntry[] = [
  // Short o
  { w: 'cob', kind: 'real', options: ['cab', 'cub'], es: 'mazorca' },
  { w: 'pod', kind: 'real', options: ['pad', 'pid'], es: 'vaina' },
  { w: 'box', kind: 'real', options: ['bax', 'bux'], es: 'caja' },
  { w: 'fog', kind: 'real', options: ['fag', 'fug'], es: 'niebla' },
  { w: 'hot', kind: 'real', options: ['hat', 'hut'], es: 'caliente' },
  { w: 'job', kind: 'real', options: ['jab', 'jub'], es: 'trabajo' },
  { w: 'log', kind: 'real', options: ['lag', 'lug'], es: 'tronco' },
  { w: 'top', kind: 'real', options: ['tap', 'tip'], es: 'cima' },
  // Short u
  { w: 'cub', kind: 'real', options: ['cab', 'cob'], es: 'cachorro' },
  { w: 'dug', kind: 'real', options: ['dag', 'dig'], es: 'cavó' },
  { w: 'fun', kind: 'real', options: ['fan', 'fin'], es: 'diversión' },
  { w: 'hut', kind: 'real', options: ['hat', 'hit'], es: 'cabaña' },
  { w: 'jut', kind: 'real', options: ['jat', 'jit'], es: 'sobresalir' },
  { w: 'pun', kind: 'real', options: ['pan', 'pin'], es: 'juego de palabras' },
  { w: 'sun', kind: 'real', options: ['san', 'sin'], es: 'sol', sayAlso: ['son'] },
  { w: 'tug', kind: 'real', options: ['tag', 'tig'], es: 'tirar' },
];

export const LEVEL2_RUNES: WordEntry[] = [
  { w: 'fot', kind: 'rune', options: ['fit', 'fut'] },
  { w: 'gos', kind: 'rune', options: ['gas', 'gus'], azureRef: 'goss' },
  { w: 'mub', kind: 'rune', options: ['mab', 'mib'] },
  { w: 'buf', kind: 'rune', options: ['baf', 'bif'] },
  { w: 'fum', kind: 'rune', options: ['fam', 'fim'] },
  { w: 'kub', kind: 'rune', options: ['kab', 'kib'] },
  { w: 'zup', kind: 'rune', options: ['zap', 'zip'] },
  { w: 'lub', kind: 'rune', options: ['lab', 'lib'] },
  { w: 'jub', kind: 'rune', options: ['jab', 'jib'] },
];

export const DEFENDERS: Record<DefenderType, DefenderDef> = {
  archer: {
    id: 'archer',
    name: 'Archer Tower',
    shortName: 'Archer',
    desc: 'Fires steady arrows at rift creatures along the trail.',
    kind: 'tower',
    cost: 60,
    up: [45, 80],
    levels: [
      { dmg: 10, range: 6.8, rate: 1.0 },
      { dmg: 15, range: 7.8, rate: 1.15 },
      { dmg: 22, range: 8.8, rate: 1.3 },
    ],
    spec: {
      a: {
        id: 'a',
        name: 'Sharpshooter Tower',
        desc: 'Heavy arrows that reach far and hit hard.',
        cost: 145,
        stats: { dmg: 48, range: 11.8, rate: 0.85 },
      },
      b: {
        id: 'b',
        name: 'Volley Tower',
        desc: 'Fires three arrows at once, at three creatures.',
        cost: 145,
        stats: { dmg: 16, range: 9.2, rate: 1.45, multi: 3 },
      },
    },
  },
  spike: {
    id: 'spike',
    name: 'Spike Pit',
    shortName: 'Spikes',
    desc: 'A trap on the trail. Hurts everything that walks over it.',
    kind: 'trail',
    cost: 40,
    up: [35, 60],
    levels: [
      { dps: 12, radius: 2.2 },
      { dps: 18, radius: 2.4 },
      { dps: 26, radius: 2.6 },
    ],
    spec: {
      a: {
        id: 'a',
        name: 'Blade Pit',
        desc: 'Sharper spikes. Huge damage to anything that walks over.',
        cost: 110,
        stats: { dps: 44, radius: 2.8 },
      },
      b: {
        id: 'b',
        name: 'Tar Pit',
        desc: 'Sticky tar slows creatures while the spikes hurt them.',
        cost: 110,
        stats: { dps: 20, radius: 3.2, slow: 0.45 },
      },
    },
  },
  golem: {
    id: 'golem',
    name: 'Stone Golem',
    shortName: 'Golem',
    desc: 'Stands on the trail and holds creatures in place. Rebuilds itself if it falls.',
    kind: 'trail',
    cost: 100,
    up: [70, 110],
    respawn: 14,
    regen: 2,
    levels: [
      { hp: 150, dmg: 14, rate: 1.0, hold: 3 },
      { hp: 210, dmg: 20, rate: 1.1, hold: 3 },
      { hp: 290, dmg: 28, rate: 1.2, hold: 4 },
    ],
    spec: {
      a: {
        id: 'a',
        name: 'Mountain Golem',
        desc: 'Huge and tough. Holds 6 creatures and rebuilds faster.',
        cost: 195,
        stats: { hp: 470, dmg: 30, rate: 1.2, hold: 6, respawn: 9 },
      },
      b: {
        id: 'b',
        name: 'Quake Golem',
        desc: 'Every slam hits all the creatures it holds.',
        cost: 195,
        stats: { hp: 320, dmg: 36, rate: 1.2, hold: 4, cleave: true },
      },
    },
  },
  frost: {
    id: 'frost',
    name: 'Frost Totem',
    shortName: 'Frost',
    desc: 'Slows every creature in its ring.',
    kind: 'tower',
    cost: 80,
    up: [55, 90],
    levels: [
      { range: 5.4, slow: 0.4 },
      { range: 6.4, slow: 0.5 },
      { range: 7.4, slow: 0.58 },
    ],
    spec: {
      a: {
        id: 'a',
        name: 'Glacier Totem',
        desc: 'Every few seconds, it freezes everything in its ring.',
        cost: 160,
        stats: { range: 7.6, slow: 0.58, freezeEvery: 5.5, freezeTime: 1.6 },
      },
      b: {
        id: 'b',
        name: 'Blizzard Totem',
        desc: 'A wider, colder ring that hurts creatures as it slows them.',
        cost: 160,
        stats: { range: 8.8, slow: 0.64, dps: 8 },
      },
    },
  },
  ember: {
    id: 'ember',
    name: 'Ember Cannon',
    shortName: 'Ember',
    desc: 'Lobs molten shells that explode and scorch packs of rift creatures.',
    kind: 'tower',
    cost: 110,
    up: [75, 115],
    levels: [
      { dmg: 22, range: 6.6, rate: 0.62, splash: 2.3 },
      { dmg: 32, range: 7.6, rate: 0.68, splash: 2.6 },
      { dmg: 44, range: 8.6, rate: 0.74, splash: 2.9 },
    ],
    spec: {
      a: {
        id: 'a',
        name: 'Inferno Mortar',
        desc: 'Massive fiery blasts with long reach that smash packed waves.',
        cost: 175,
        stats: { dmg: 74, range: 10.8, rate: 0.56, splash: 3.7 },
      },
      b: {
        id: 'b',
        name: 'Cinder Repeater',
        desc: 'Rapid-fire blazing shells that keep steady splash pressure on the bridge.',
        cost: 175,
        stats: { dmg: 30, range: 8.6, rate: 1.45, splash: 2.2 },
      },
    },
  },
  tesla: {
    id: 'tesla',
    name: 'Tesla Spire',
    shortName: 'Tesla',
    desc: 'Arc-tech lightning tower that zaps ground and flying foes and jumps between nearby targets.',
    kind: 'tower',
    cost: 130,
    up: [90, 130],
    levels: [
      { dmg: 20, range: 6.4, rate: 0.9, chain: 3, chainRange: 3.4 },
      { dmg: 29, range: 7.2, rate: 1.0, chain: 4, chainRange: 3.8 },
      { dmg: 40, range: 8.0, rate: 1.1, chain: 4, chainRange: 4.1 },
    ],
    spec: {
      a: {
        id: 'a',
        name: 'Storm Conduit',
        desc: 'Supercharged arcs chain across 6 creatures at once, shredding swarms and flyers.',
        cost: 190,
        stats: { dmg: 46, range: 8.8, rate: 1.25, chain: 6, chainRange: 4.8 },
      },
      b: {
        id: 'b',
        name: 'Overcharge Beam',
        desc: 'Locks a surging plasma arc onto one enemy, ramping damage higher each hit to melt Brutes and Bosses.',
        cost: 190,
        stats: { dmg: 38, range: 9.2, rate: 1.5, chain: 1, beamRamp: 0.35 },
      },
    },
  },
};

export const DEFENDER_ORDER: DefenderType[] = ['archer', 'spike', 'golem', 'frost'];
export const ALL_DEFENDER_ORDER: DefenderType[] = [
  'archer',
  'spike',
  'golem',
  'frost',
  'ember',
  'tesla',
];

export const CREATURES: Record<CreatureType, CreatureDef> = {
  wisp: {
    id: 'wisp',
    name: 'Rift Wisp',
    hp: 18,
    speed: 3.4,
    anchor: 1,
    shards: 1,
    hit: 6,
    size: 1.0,
  },
  bat: {
    id: 'bat',
    name: 'Rift Bat',
    hp: 30,
    speed: 4.05,
    anchor: 1,
    shards: 2,
    hit: 8,
    size: 1.0,
    flying: true,
  },
  thornback: {
    id: 'thornback',
    name: 'Thornback',
    hp: 70,
    speed: 1.9,
    anchor: 2,
    shards: 3,
    hit: 16,
    size: 1.0,
  },
  bramble: {
    id: 'bramble',
    name: 'Bramble Stalker',
    hp: 115,
    speed: 2.35,
    anchor: 3,
    shards: 4,
    hit: 22,
    size: 1.1,
  },
  splitter: {
    id: 'splitter',
    name: 'Rift Splitter',
    hp: 140,
    speed: 1.75,
    anchor: 2,
    shards: 5,
    hit: 18,
    size: 1.15,
    splitsInto: { type: 'wisp', count: 2 },
  },
  brute: {
    id: 'brute',
    name: 'Ironbark Brute',
    hp: 255,
    speed: 1.45,
    anchor: 4,
    shards: 10,
    hit: 28,
    size: 1.28,
  },
  thornking: {
    id: 'thornking',
    name: 'The Thornking',
    hp: 780,
    speed: 1.12,
    anchor: 8,
    shards: 40,
    hit: 44,
    size: 1.5,
    isBoss: true,
  },
  cinderimp: {
    id: 'cinderimp',
    name: 'Cinder Imp',
    hp: 42,
    speed: 4.15,
    anchor: 1,
    shards: 2,
    hit: 10,
    size: 0.96,
    slowResist: 0.5,
  },
};

export const HERO_POWERS: Record<HeroPowerId, HeroPowerDef> = {
  rally: {
    id: 'rally',
    name: 'Rally',
    desc: 'Your defenders fire faster for a short time.',
    charge: 15,
    haste: 1.25,
    time: 5,
  },
  meteor: {
    id: 'meteor',
    name: 'Meteor',
    desc: 'Drops a meteor on the biggest group of creatures.',
    charge: 20,
    dmg: 60,
    radius: 3.5,
  },
  freeze: {
    id: 'freeze',
    name: 'Time Freeze',
    desc: 'Freezes every creature and stops the rift for a few seconds.',
    charge: 25,
    time: 2.5,
  },
};

export const HERO_POWER_ORDER: HeroPowerId[] = ['rally', 'meteor', 'freeze'];

export const SPEECH_SCORE_CONFIG = {
  vowelMin: 52,
  vowelClearMiss: 60,
  consonantAvgMin: 35,
  consonantEachMin: 8,
  wordMin: 40,
  maxListenMs: 4200,
  endSilenceMs: 650,
  checkTimeoutMs: 5000,
};

export type WardenVoiceId = 'Leda' | 'Aoede' | 'Kore' | 'Zephyr' | 'Charon' | 'Orus';

export interface WardenVoiceOption {
  id: WardenVoiceId;
  label: string;
  role: string;
  vibe: string;
}

export const WARDEN_VOICES: WardenVoiceOption[] = [
  {
    id: 'Leda',
    label: 'Leda (Default)',
    role: 'Female',
    vibe: 'Warm, steady field mentor',
  },
  {
    id: 'Aoede',
    label: 'Aoede',
    role: 'Female',
    vibe: 'Crisp, clear tactical guide',
  },
  {
    id: 'Kore',
    label: 'Kore',
    role: 'Female',
    vibe: 'Direct, grounded commander',
  },
  {
    id: 'Zephyr',
    label: 'Zephyr',
    role: 'Female',
    vibe: 'Bright, energetic scout',
  },
  {
    id: 'Charon',
    label: 'Charon',
    role: 'Male',
    vibe: 'Calm, deep veteran guardian',
  },
  {
    id: 'Orus',
    label: 'Orus',
    role: 'Male',
    vibe: 'Firm, resolute squad captain',
  },
];

export const WARDEN_SAMPLE_LINE =
  'Runner, we have a breach at Thornwood Edge. Your Archer Towers, Frost Totems, Spike Pits, and Stone Golems are ready to deploy.';

export const CUTSCENES: Record<CutsceneId, CutsceneScript> = {
  opening: {
    id: 'opening',
    title: 'World 1, Level 1: Thornwood Edge',
    subtitle: 'Opening Cutscene',
    beats: [
      {
        id: 'l01-open-v2-1',
        image: '/src/assets/images/cutscene_opening_rift_1795457393659.jpg',
        motion: 'zoom',
        durationMs: 9500,
        speaker: 'The Rift Warden',
        voiceText:
          'Runner, we have a breach at Thornwood Edge. Rift Wisps and Thornbacks are pouring down the trail toward our Anchor. Read words in the Rune Forge to power our crystals.',
        captions: [
          'Breach at Thornwood Edge. Rift Wisps and Thornbacks are pushing down the trail.',
          'Read words in the Rune Forge to charge our crystals.',
        ],
        accent: 'violet',
        voiceStyle:
          'Calm, urgent veteran guardian briefing a capable teenage recruit. Clear, natural pacing.',
      },
      {
        id: 'l01-open-v2-2',
        image: '/src/assets/images/cutscene_opening_warden_1795457392314.jpg',
        motion: 'pan',
        durationMs: 11000,
        speaker: 'The Rift Warden',
        voiceText:
          'You have four defenses ready to deploy. Place Archer Towers and Frost Totems on stone pads beside the trail. Drop Spike Pits and Stone Golems right on the dirt path to hold the line.',
        captions: [
          'Four defenses ready: Archer Towers and Frost Totems go on stone pads beside the trail.',
          'Drop Spike Pits and Stone Golems right on the dirt path to hold the line.',
        ],
        accent: 'cyan',
        voiceStyle:
          'Steady, confident tactical mentor explaining starting defenses with crisp clarity.',
      },
      {
        id: 'l01-open-v2-3',
        image: '/src/assets/images/cutscene_opening_warden_1795457392314.jpg',
        motion: 'lift',
        durationMs: 10500,
        speaker: 'The Rift Warden',
        voiceText:
          'Fill both Rift Locks on the left with clean short a and short i reads to unlock the final wave. When your top bar powers charge, fire Rally, Meteor, or Freeze. Ready, Runner? Let us hold the edge.',
        captions: [
          'Fill both Rift Locks on the left with clean short a and short i reads.',
          'Fire Rally, Meteor, and Freeze on the top bar when charged. Ready, Runner?',
        ],
        accent: 'cyan',
        voiceStyle:
          'Resolute, encouraging guardian rallying her partner right before battle.',
      },
    ],
  },
  victory: {
    id: 'victory',
    title: 'Thornwood Edge: Rift Sealed',
    subtitle: 'Victory Cutscene',
    beats: [
      {
        id: 'l01-vic-v2-1',
        image: '/src/assets/images/cutscene_victory_seal_1795457393110.jpg',
        motion: 'lift',
        durationMs: 10000,
        speaker: 'The Rift Warden',
        voiceText:
          'First rift sealed. Solid work, Runner. Holding this border unlocked heavy firepower for your armory: the Ember Cannon is now yours, and the road to Bramble Crossing is open.',
        captions: [
          'First rift sealed! Solid work, Runner.',
          'Unlocked: Ember Cannon added to your armory. Bramble Crossing is open.',
        ],
        accent: 'cyan',
        voiceStyle:
          'Relieved, quietly proud veteran guardian congratulating her recruit after sealing the rift.',
      },
      {
        id: 'l01-vic-v2-2',
        image: '/src/assets/images/cutscene_victory_thornking_1795457393719.jpg',
        motion: 'zoom',
        durationMs: 9500,
        speaker: 'The Rift Warden',
        voiceText:
          'Those were only scouts at the treeline. Something much larger is waking up deeper in the woods. Catch your breath. We push into Bramble Crossing next.',
        captions: [
          'Those were only scouts. Something bigger is waking deeper in the woods.',
          'Level Clear. Bramble Crossing awaits.',
        ],
        accent: 'crimson',
        voiceStyle:
          'Low, serious, watchful guardian looking deeper into the forest as a larger threat stirs.',
      },
    ],
  },
  defeat: {
    id: 'defeat',
    title: 'The Anchor Fell',
    subtitle: 'Defeat Cutscene',
    beats: [
      {
        id: 'l01-def-v2-1',
        image: '/src/assets/images/cutscene_defeat_breach_1795457392970.jpg',
        motion: 'zoom',
        durationMs: 10000,
        speaker: 'The Rift Warden',
        voiceText:
          'The Anchor took too many hits, and the rift pushed through. Shake it off, Runner. Every word you forged already counts on your locks. Let us reset the line and try again.',
        captions: [
          'The Anchor fell, and the rift pushed through.',
          'Every clean word you forged still counts. Reset the line and try again.',
        ],
        accent: 'violet',
        voiceStyle:
          'Winded but determined guardian rallying her recruit with zero blame and steady confidence.',
      },
    ],
  },
};

export const LEVEL2_CUTSCENES: Record<CutsceneId, CutsceneScript> = {
  opening: {
    id: 'opening',
    title: 'World 1, Level 2: Bramble Crossing',
    subtitle: 'Opening Cutscene',
    beats: [
      {
        id: 'l02-open-v1-1',
        image: '/src/assets/images/cutscene_l2_bramble_opening_1795467449678.jpg',
        motion: 'zoom',
        durationMs: 10500,
        speaker: 'The Rift Warden',
        voiceText:
          'Welcome to Bramble Crossing, Runner. A fresh rift tore open above the ravine, and tough Bramble Stalkers are charging straight for our timber bridge.',
        captions: [
          'Bramble Crossing is under attack. Tough Bramble Stalkers are charging the bridge.',
          'Hold the gorge before they cross into our Anchor camp.',
        ],
        accent: 'violet',
        voiceStyle:
          'Focused, urgent veteran guardian surveying a canyon bridge ambush with her recruit.',
      },
      {
        id: 'l02-open-v1-2',
        image: '/src/assets/images/cutscene_l2_bramble_opening_1795467449678.jpg',
        motion: 'pan',
        durationMs: 11000,
        speaker: 'The Rift Warden',
        voiceText:
          'Your new Ember Cannon is live on the build bar. Place it near the bridge choke to blast packed waves with splash fire. Fill the short o and short u Rift Locks to unlock the final push.',
        captions: [
          'Ember Cannon unlocked: place it by the bridge to blast packed waves with splash fire.',
          'Fill the short o and short u Rift Locks to unlock the Final Wave.',
        ],
        accent: 'cyan',
        voiceStyle:
          'Confident, clear field mentor introducing the Ember Cannon and short o and short u locks.',
      },
    ],
  },
  victory: {
    id: 'victory',
    title: 'Bramble Crossing: Rift Sealed',
    subtitle: 'Victory Cutscene',
    beats: [
      {
        id: 'l02-vic-v1-1',
        image: '/src/assets/images/cutscene_l2_bramble_victory_1795467449886.jpg',
        motion: 'lift',
        durationMs: 10000,
        speaker: 'The Rift Warden',
        voiceText:
          'Bramble Crossing is secure! Your Ember Cannons and clean short o and short u reads shattered the breach before the Stalkers could take the bridge.',
        captions: [
          'Bramble Crossing is secure! The bridge and Anchor held strong.',
          'Clean short o and short u reads sealed the gorge rift.',
        ],
        accent: 'cyan',
        voiceStyle:
          'Warm, triumphant veteran guardian celebrating a hard-won crossing defense.',
      },
      {
        id: 'l02-vic-v1-2',
        image: '/src/assets/images/cutscene_l2_bramble_victory_1795467449886.jpg',
        motion: 'zoom',
        durationMs: 9500,
        speaker: 'The Rift Warden',
        voiceText:
          'Look past the treeline. Ancient stone ruins are glowing through the mist, and the Thornking knows we are coming. Rest up, Runner. Hollow Bridge is next.',
        captions: [
          'Ancient ruins glow beyond the mist. The Thornking knows we are coming.',
          'Level 2 Clear. Road to Hollow Bridge unlocked.',
        ],
        accent: 'crimson',
        voiceStyle:
          'Steady, watchful guardian gazing toward ancient ruins deeper in the forest.',
      },
    ],
  },
  defeat: {
    id: 'defeat',
    title: 'The Crossing Fell',
    subtitle: 'Defeat Cutscene',
    beats: [
      {
        id: 'l02-def-v1-1',
        image: '/src/assets/images/cutscene_defeat_breach_1795457392970.jpg',
        motion: 'zoom',
        durationMs: 9500,
        speaker: 'The Rift Warden',
        voiceText:
          'The Stalkers broke across the bridge and cracked our Anchor. Keep your head up, Runner. Pair Frost Totems with an Ember Cannon near the bend and we will lock this crossing down.',
        captions: [
          'The Bramble Stalkers broke across the bridge.',
          'Tip: pair Frost Totems with an Ember Cannon at the bend, then try again.',
        ],
        accent: 'violet',
        voiceStyle:
          'Encouraging, tactical field mentor offering a smart tip with zero blame.',
      },
    ],
  },
};

export const LEVEL1: LevelConfig = {
  id: 'w1-l1',
  num: 1,
  worldId: 'w1',
  worldName: 'World 1: The Thornwood',
  name: 'Thornwood Edge',
  headline: 'Hold the Rift at Thornwood Edge',
  description:
    'The dimensional rift has torn open at the forest border. Decode short a and short i words in the Rune Forge to power stone towers, frost totems, and guardians before the Thornbacks shatter the Anchor.',
  enemiesSummary: 'Rift Wisps and Thornbacks',
  wordsSummary: 'short a and short i, plus runes',
  rewardSummary: 'Ember Cannon and Bramble Crossing open',
  nextLevelId: 'w1-l2',
  vowels: ['a', 'i'],
  defenders: ['archer', 'spike', 'golem', 'frost'],
  runeRate: 0.25,
  startCrystals: 105,
  waveEvery: 10,
  anchor: 20,
  minWaves: 2,
  bonusSurgeWaves: 3,
  mastery: {
    window: 10,
    need: 9,
  },
  endless: {
    hpStep: 0.1,
    countStep: 0.12,
  },
  finalBoost: 1.2,
  hasWalkthrough: true,
  backdropImage: '/src/assets/images/cutscene_opening_warden_1795457392314.jpg',
  pathUv: [
    [0.19, 0.28],
    [0.27, 0.36],
    [0.36, 0.35],
    [0.44, 0.27],
    [0.54, 0.22],
    [0.625, 0.27],
    [0.65, 0.36],
    [0.61, 0.46],
    [0.50, 0.51],
    [0.37, 0.53],
    [0.28, 0.57],
    [0.255, 0.67],
    [0.31, 0.77],
    [0.405, 0.77],
    [0.485, 0.74],
    [0.54, 0.80],
  ],
  riverUv: [
    [0.75, 0.0],
    [0.74, 0.14],
    [0.77, 0.28],
    [0.805, 0.42],
    [0.825, 0.58],
    [0.795, 0.75],
    [0.745, 0.90],
    [0.72, 1.0],
  ],
  riftUv: [0.19, 0.28],
  campUv: [0.545, 0.805],
  wardenUv: [0.525, 0.755],
  pads: [
    { id: 't1', kind: 'tower', u: 0.36, v: 0.235 },
    { id: 't2', kind: 'tower', u: 0.47, v: 0.375 },
    { id: 't3', kind: 'tower', u: 0.665, v: 0.165 },
    { id: 't4', kind: 'tower', u: 0.715, v: 0.38 },
    { id: 't5', kind: 'tower', u: 0.38, v: 0.435 },
    { id: 't6', kind: 'tower', u: 0.215, v: 0.51 },
    { id: 't7', kind: 'tower', u: 0.41, v: 0.645 },
    { id: 't8', kind: 'tower', u: 0.59, v: 0.635 },
    { id: 'r1', kind: 'trail', u: 0.365, v: 0.34 },
    { id: 'r2', kind: 'trail', u: 0.648, v: 0.355 },
    { id: 'r3', kind: 'trail', u: 0.435, v: 0.52 },
    { id: 'r4', kind: 'trail', u: 0.325, v: 0.77 },
  ],
  waves: [
    {
      hp: 1.0,
      groups: [
        { type: 'wisp', count: 8, gap: 1.6 },
        { type: 'thornback', count: 3, gap: 4, delay: 8 },
      ],
    },
    {
      hp: 1.35,
      groups: [
        { type: 'thornback', count: 6, gap: 3.5 },
        { type: 'wisp', count: 8, gap: 1.2, delay: 10 },
      ],
    },
    {
      hp: 1.8,
      groups: [
        { type: 'wisp', count: 14, gap: 0.9 },
        { type: 'thornback', count: 6, gap: 3, delay: 6 },
      ],
    },
    {
      hp: 2.3,
      groups: [
        { type: 'thornback', count: 10, gap: 2.6 },
        { type: 'wisp', count: 12, gap: 0.9, delay: 12 },
      ],
    },
    {
      hp: 2.7,
      groups: [
        { type: 'thornback', count: 14, gap: 2.2 },
        { type: 'wisp', count: 16, gap: 1.0, delay: 4 },
        { type: 'wisp', count: 8, gap: 0.6, delay: 28 },
      ],
    },
  ],
  realWords: LEVEL1_REAL_WORDS,
  runes: LEVEL1_RUNES,
  cutscenes: CUTSCENES,
};

export const LEVEL2: LevelConfig = {
  id: 'w1-l2',
  num: 2,
  worldId: 'w1',
  worldName: 'World 1: The Thornwood',
  name: 'Bramble Crossing',
  headline: 'Defend the Bridge at Bramble Crossing',
  description:
    'Bramble Stalkers are rushing across the ravine bridge. Deploy your newly unlocked Ember Cannon for explosive splash damage and master short o and short u words to seal the crossing.',
  enemiesSummary: 'Rift Wisps, Thornbacks, and Bramble Stalkers',
  wordsSummary: 'short o and short u, plus runes',
  rewardSummary: 'Hollow Bridge road opens ahead',
  nextLevelId: 'w1-l3',
  vowels: ['o', 'u'],
  defenders: ['archer', 'spike', 'golem', 'frost', 'ember'],
  runeRate: 0.28,
  startCrystals: 140,
  waveEvery: 10,
  anchor: 20,
  minWaves: 2,
  bonusSurgeWaves: 3,
  mastery: {
    window: 10,
    need: 9,
  },
  endless: {
    hpStep: 0.14,
    countStep: 0.14,
  },
  finalBoost: 1.25,
  hasWalkthrough: false,
  backdropImage: '/src/assets/images/cutscene_l2_bramble_opening_1795467449678.jpg',
  pathUv: [
    [0.195, 0.235],
    [0.255, 0.305],
    [0.295, 0.375],
    [0.285, 0.440],
    [0.215, 0.515],
    [0.200, 0.595],
    [0.245, 0.675],
    [0.320, 0.695],
    [0.395, 0.630],
    [0.465, 0.505],
    [0.525, 0.415],
    [0.585, 0.415],
    [0.650, 0.470],
    [0.715, 0.530],
    [0.768, 0.590],
    [0.770, 0.690],
    [0.815, 0.775],
  ],
  riverUv: [
    [0.91, 0.0],
    [0.83, 0.14],
    [0.76, 0.28],
    [0.68, 0.41],
    [0.58, 0.56],
    [0.47, 0.72],
    [0.39, 0.87],
    [0.33, 1.0],
  ],
  riftUv: [0.195, 0.215],
  campUv: [0.820, 0.775],
  wardenUv: [0.755, 0.750],
  pads: [
    { id: 'b_t1', kind: 'tower', u: 0.385, v: 0.285 },
    { id: 'b_t2', kind: 'tower', u: 0.495, v: 0.295 },
    { id: 'b_t3', kind: 'tower', u: 0.355, v: 0.485 },
    { id: 'b_t4', kind: 'tower', u: 0.155, v: 0.440 },
    { id: 'b_t5', kind: 'tower', u: 0.285, v: 0.575 },
    { id: 'b_t6', kind: 'tower', u: 0.425, v: 0.720 },
    { id: 'b_t7', kind: 'tower', u: 0.530, v: 0.520 },
    { id: 'b_t8', kind: 'tower', u: 0.790, v: 0.460 },
    { id: 'b_t9', kind: 'tower', u: 0.675, v: 0.655 },
    { id: 'b_r1', kind: 'trail', u: 0.285, v: 0.395 },
    { id: 'b_r2', kind: 'trail', u: 0.235, v: 0.665 },
    { id: 'b_r3', kind: 'trail', u: 0.490, v: 0.465 },
    { id: 'b_r4', kind: 'trail', u: 0.768, v: 0.625 },
  ],
  waves: [
    {
      hp: 1.0,
      groups: [
        { type: 'wisp', count: 10, gap: 1.35 },
        { type: 'thornback', count: 4, gap: 3.4 },
      ],
    },
    {
      hp: 1.15,
      groups: [
        { type: 'bramble', count: 3, gap: 3.6 },
        { type: 'wisp', count: 12, gap: 0.95 },
      ],
    },
    {
      hp: 1.35,
      groups: [
        { type: 'wisp', count: 16, gap: 0.75 },
        { type: 'bramble', count: 5, gap: 2.8 },
        { type: 'thornback', count: 5, gap: 2.8 },
      ],
    },
    {
      hp: 1.6,
      groups: [
        { type: 'bramble', count: 7, gap: 2.4 },
        { type: 'thornback', count: 8, gap: 2.4 },
        { type: 'wisp', count: 14, gap: 0.8 },
      ],
    },
    {
      hp: 1.9,
      groups: [
        { type: 'bramble', count: 9, gap: 2.1 },
        { type: 'wisp', count: 18, gap: 0.68 },
        { type: 'thornback', count: 8, gap: 2.2 },
      ],
    },
    {
      hp: 2.2,
      groups: [
        { type: 'bramble', count: 12, gap: 1.9 },
        { type: 'thornback', count: 10, gap: 2.0 },
        { type: 'wisp', count: 20, gap: 0.6 },
      ],
    },
  ],
  realWords: LEVEL2_REAL_WORDS,
  runes: LEVEL2_RUNES,
  cutscenes: LEVEL2_CUTSCENES,
};

// ---------------------------------------------------------------------------
// World 1 · Level 3: Hollow Bridge (Short e & Short i contrast + Rift Bats)
// ---------------------------------------------------------------------------
export const LEVEL3_REAL_WORDS: WordEntry[] = [
  { w: 'jet', kind: 'real', options: ['jit', 'jut'], es: 'avión' },
  { w: 'net', kind: 'real', options: ['nit', 'nut'], es: 'red' },
  { w: 'vet', kind: 'real', options: ['vit', 'vat'], es: 'veterinario' },
  { w: 'web', kind: 'real', options: ['wib', 'wub'], es: 'telaraña' },
  { w: 'hem', kind: 'real', options: ['him', 'ham'], es: 'dobladillo' },
  { w: 'peg', kind: 'real', options: ['pig', 'pug'], es: 'clavija' },
  { w: 'fed', kind: 'real', options: ['fid', 'fad'], es: 'alimentó' },
  { w: 'red', kind: 'real', options: ['rid', 'rod'], es: 'rojo' },
  { w: 'pen', kind: 'real', options: ['pin', 'pan'], es: 'pluma' },
  { w: 'men', kind: 'real', options: ['min', 'man'], es: 'hombres' },
  { w: 'den', kind: 'real', options: ['din', 'dan'], es: 'guarida' },
  { w: 'ten', kind: 'real', options: ['tin', 'tan'], es: 'diez' },
  { w: 'pin', kind: 'real', options: ['pen', 'pan'], es: 'alfiler' },
  { w: 'fit', kind: 'real', options: ['fet', 'fat'], es: 'en forma' },
  { w: 'rip', kind: 'real', options: ['rep', 'rap'], es: 'rasgar' },
  { w: 'dig', kind: 'real', options: ['deg', 'dag'], es: 'cavar' },
  { w: 'mix', kind: 'real', options: ['mex', 'max'], es: 'mezclar' },
  { w: 'hit', kind: 'real', options: ['het', 'hat'], es: 'golpear' },
  { w: 'win', kind: 'real', options: ['wen', 'wan'], es: 'ganar' },
  { w: 'zip', kind: 'real', options: ['zep', 'zap'], es: 'cierre' },
];

export const LEVEL3_RUNES: WordEntry[] = [
  { w: 'mep', kind: 'rune', options: ['mip', 'map'], azureRef: 'mepp' },
  { w: 'feb', kind: 'rune', options: ['fib', 'fub'] },
  { w: 'ked', kind: 'rune', options: ['kid', 'kad'], azureRef: 'kedd' },
  { w: 'zem', kind: 'rune', options: ['zim', 'zam'] },
  { w: 'bep', kind: 'rune', options: ['bip', 'bap'], azureRef: 'bepp' },
  { w: 'tev', kind: 'rune', options: ['tiv', 'tav'] },
  { w: 'mib', kind: 'rune', options: ['meb', 'mab'] },
  { w: 'kib', kind: 'rune', options: ['keb', 'kab'] },
  { w: 'yit', kind: 'rune', options: ['yet', 'yat'] },
];

export const LEVEL3_CUTSCENES: Record<CutsceneId, CutsceneScript> = {
  opening: {
    id: 'opening',
    title: 'Hollow Bridge',
    subtitle: 'World 1 · Level 3 Opening',
    beats: [
      {
        id: 'l03-open-v1-1',
        image: '/src/assets/images/cutscene_l3_hollow_bridge_v2_1795472155574.jpg',
        motion: 'zoom',
        durationMs: 10000,
        speaker: 'The Rift Warden',
        voiceText:
          'We reached Hollow Bridge, Runner. Fast Rift Bats are pouring straight out of the gorge, and they fly clean over floor spikes and Stone Golems.',
        captions: [
          'Rift Bats are pouring out of the gorge.',
          'They fly straight over floor spikes and Stone Golems.',
        ],
        voiceStyle: 'Steady, focused veteran guardian warning a teen recruit.',
        accent: 'violet',
      },
      {
        id: 'l03-open-v1-2',
        image: '/src/assets/images/cutscene_l3_hollow_bridge_v2_1795472155574.jpg',
        motion: 'pan',
        durationMs: 10500,
        speaker: 'The Rift Warden',
        voiceText:
          'Anchor the stone arch with Archer Towers and Frost Totems to drop the bats out of the sky. Watch short e and short i closely in the Forge to seal this crossing.',
        captions: [
          'Use Archer Towers and Frost Totems to bring down flying Rift Bats.',
          'Fill the short e and short i locks to unlock the Final Wave.',
        ],
        voiceStyle: 'Calm, tactical, encouraging veteran guardian.',
        accent: 'cyan',
      },
    ],
  },
  victory: {
    id: 'victory',
    title: 'Bridge Held',
    subtitle: 'World 1 · Level 3 Victory',
    beats: [
      {
        id: 'l03-vic-v1-1',
        image: '/src/assets/images/cutscene_l4_sunless_ruins_v2_1795472137783.jpg',
        motion: 'lift',
        durationMs: 9500,
        speaker: 'The Rift Warden',
        voiceText:
          'Hollow Bridge is clear! Your sharp short e and short i reads kept the skies locked down across the whole gorge.',
        captions: [
          'Hollow Bridge is clear! The skies over the gorge are safe.',
          'Your sharp short e and short i reads held the line.',
        ],
        voiceStyle: 'Warm, proud veteran guardian celebrating a clean win.',
        accent: 'cyan',
      },
      {
        id: 'l03-vic-v1-2',
        image: '/src/assets/images/cutscene_l4_sunless_ruins_v2_1795472137783.jpg',
        motion: 'zoom',
        durationMs: 9500,
        speaker: 'The Rift Warden',
        voiceText:
          'Just past the stone arch lie the Sunless Ruins. Every short vowel lock is firing at once down there, and strange crystal creatures are splitting apart in the courtyard.',
        captions: [
          'Ahead lie the Sunless Ruins, where all five short vowels combine.',
          'Prepare for crystal Rift Splitters in the courtyard.',
        ],
        voiceStyle: 'Low, steady, adventurous mentor setting up the next mission.',
        accent: 'violet',
      },
    ],
  },
  defeat: {
    id: 'defeat',
    title: 'Skies Overrun',
    subtitle: 'World 1 · Level 3 Defeat',
    beats: [
      {
        id: 'l03-def-v1-1',
        image: '/src/assets/images/cutscene_defeat_breach_1795457392970.jpg',
        motion: 'zoom',
        durationMs: 9000,
        speaker: 'The Rift Warden',
        voiceText:
          'The Rift Bats slipped past our line and hit the Anchor. Shake it off, Runner. Place two Archer Towers near the bridge bends and pair them with a Frost Totem next run.',
        captions: [
          'The Rift Bats slipped past the bridge defense.',
          'Pair Archer Towers with a Frost Totem near the bends and try again.',
        ],
        voiceStyle: 'Grounded, supportive veteran guardian after a defeat.',
        accent: 'crimson',
      },
    ],
  },
};

export const LEVEL3: LevelConfig = {
  id: 'w1-l3',
  num: 3,
  worldId: 'w1',
  worldName: 'World 1: The Thornwood',
  name: 'Hollow Bridge',
  headline: 'Hold the Skies at Hollow Bridge',
  description:
    'Swift Rift Bats are swooping across the misty stone gorge, flying straight over ground traps. Sharpen your ear on short e and short i contrast words to power Archer Towers and Frost Totems.',
  enemiesSummary: 'Rift Bats, Thornbacks, and Bramble Stalkers',
  wordsSummary: 'short e and short i, plus runes',
  rewardSummary: 'Sunless Ruins path opens ahead',
  nextLevelId: 'w1-l4',
  vowels: ['e', 'i'],
  defenders: ['archer', 'spike', 'golem', 'frost', 'ember'],
  runeRate: 0.28,
  startCrystals: 155,
  waveEvery: 10,
  anchor: 20,
  minWaves: 2,
  bonusSurgeWaves: 3,
  mastery: {
    window: 10,
    need: 9,
  },
  endless: {
    hpStep: 0.15,
    countStep: 0.14,
  },
  finalBoost: 1.25,
  hasWalkthrough: false,
  backdropImage: '/src/assets/images/cutscene_l3_hollow_bridge_v2_1795472155574.jpg',
  pathUv: [
    [0.165, 0.255],
    [0.245, 0.295],
    [0.355, 0.300],
    [0.398, 0.365],
    [0.375, 0.435],
    [0.285, 0.495],
    [0.215, 0.565],
    [0.195, 0.645],
    [0.240, 0.720],
    [0.335, 0.755],
    [0.425, 0.715],
    [0.490, 0.605],
    [0.565, 0.525],
    [0.655, 0.495],
    [0.745, 0.515],
    [0.825, 0.575],
    [0.855, 0.655],
    [0.825, 0.755],
  ],
  riverUv: [
    [0.675, 0.25],
    [0.645, 0.38],
    [0.655, 0.54],
    [0.645, 0.72],
    [0.595, 0.96],
  ],
  riftUv: [0.165, 0.235],
  campUv: [0.825, 0.775],
  wardenUv: [0.765, 0.740],
  pads: [
    { id: 'h_t1', kind: 'tower', u: 0.275, v: 0.385 },
    { id: 'h_t2', kind: 'tower', u: 0.465, v: 0.325 },
    { id: 'h_t3', kind: 'tower', u: 0.455, v: 0.485 },
    { id: 'h_t4', kind: 'tower', u: 0.335, v: 0.605 },
    { id: 'h_t5', kind: 'tower', u: 0.295, v: 0.665 },
    { id: 'h_t6', kind: 'tower', u: 0.505, v: 0.705 },
    { id: 'h_t7', kind: 'tower', u: 0.775, v: 0.435 },
    { id: 'h_t8', kind: 'tower', u: 0.770, v: 0.630 },
    { id: 'h_t9', kind: 'tower', u: 0.395, v: 0.235 },
    { id: 'h_r1', kind: 'trail', u: 0.385, v: 0.390 },
    { id: 'h_r2', kind: 'trail', u: 0.215, v: 0.625 },
    { id: 'h_r3', kind: 'trail', u: 0.495, v: 0.595 },
    { id: 'h_r4', kind: 'trail', u: 0.835, v: 0.605 },
  ],
  waves: [
    {
      hp: 1.0,
      groups: [
        { type: 'bat', count: 8, gap: 1.3 },
        { type: 'thornback', count: 4, gap: 3.2, delay: 7 },
      ],
    },
    {
      hp: 1.2,
      groups: [
        { type: 'bat', count: 12, gap: 0.95 },
        { type: 'bramble', count: 4, gap: 3.1, delay: 6 },
      ],
    },
    {
      hp: 1.45,
      groups: [
        { type: 'wisp', count: 12, gap: 0.8 },
        { type: 'bat', count: 14, gap: 0.85, delay: 5 },
        { type: 'bramble', count: 5, gap: 2.7, delay: 11 },
      ],
    },
    {
      hp: 1.75,
      groups: [
        { type: 'bramble', count: 7, gap: 2.3 },
        { type: 'bat', count: 16, gap: 0.75, delay: 4 },
        { type: 'thornback', count: 8, gap: 2.2, delay: 10 },
      ],
    },
    {
      hp: 2.1,
      groups: [
        { type: 'bat', count: 20, gap: 0.65 },
        { type: 'bramble', count: 9, gap: 2.0, delay: 5 },
        { type: 'thornback', count: 10, gap: 2.0, delay: 12 },
      ],
    },
  ],
  realWords: LEVEL3_REAL_WORDS,
  runes: LEVEL3_RUNES,
  cutscenes: LEVEL3_CUTSCENES,
};

// ---------------------------------------------------------------------------
// World 1 · Level 4: Sunless Ruins (All 5 Short Vowels Mixed + Rift Splitters)
// ---------------------------------------------------------------------------
export const LEVEL4_REAL_WORDS: WordEntry[] = [
  // Short a
  { w: 'map', kind: 'real', options: ['mip', 'mup'], es: 'mapa', cognate: true },
  { w: 'cab', kind: 'real', options: ['cub', 'cob'], es: 'taxi' },
  { w: 'gas', kind: 'real', options: ['gus', 'gos'], es: 'gas', cognate: true },
  { w: 'fan', kind: 'real', options: ['fin', 'fun'], es: 'ventilador' },
  { w: 'tag', kind: 'real', options: ['tig', 'tug'], es: 'etiqueta' },
  // Short e
  { w: 'jet', kind: 'real', options: ['jit', 'jut'], es: 'avión' },
  { w: 'net', kind: 'real', options: ['nit', 'nut'], es: 'red' },
  { w: 'pen', kind: 'real', options: ['pin', 'pan'], es: 'pluma' },
  { w: 'web', kind: 'real', options: ['wib', 'wub'], es: 'telaraña' },
  { w: 'red', kind: 'real', options: ['rid', 'rod'], es: 'rojo' },
  // Short i
  { w: 'pin', kind: 'real', options: ['pen', 'pan'], es: 'alfiler' },
  { w: 'dig', kind: 'real', options: ['dug', 'dog'], es: 'cavar' },
  { w: 'mix', kind: 'real', options: ['max', 'mux'], es: 'mezclar' },
  { w: 'win', kind: 'real', options: ['wen', 'wan'], es: 'ganar' },
  { w: 'zip', kind: 'real', options: ['zap', 'zup'], es: 'cierre' },
  // Short o
  { w: 'cob', kind: 'real', options: ['cab', 'cub'], es: 'mazorca' },
  { w: 'pod', kind: 'real', options: ['pad', 'pid'], es: 'vaina' },
  { w: 'box', kind: 'real', options: ['bax', 'bix'], es: 'caja' },
  { w: 'fog', kind: 'real', options: ['fig', 'fag'], es: 'niebla' },
  { w: 'hot', kind: 'real', options: ['hat', 'hit'], es: 'caliente' },
  // Short u
  { w: 'sun', kind: 'real', options: ['sin', 'son'], es: 'sol' },
  { w: 'cub', kind: 'real', options: ['cab', 'cob'], es: 'cachorro' },
  { w: 'dug', kind: 'real', options: ['dig', 'dog'], es: 'cavó' },
  { w: 'hut', kind: 'real', options: ['hat', 'hit'], es: 'cabaña' },
  { w: 'tug', kind: 'real', options: ['tag', 'tig'], es: 'jalar' },
];

export const LEVEL4_RUNES: WordEntry[] = [
  { w: 'mab', kind: 'rune', options: ['mib', 'mub'] },
  { w: 'baf', kind: 'rune', options: ['bif', 'buf'] },
  { w: 'mep', kind: 'rune', options: ['mip', 'map'], azureRef: 'mepp' },
  { w: 'feb', kind: 'rune', options: ['fib', 'fub'] },
  { w: 'mib', kind: 'rune', options: ['mab', 'mub'] },
  { w: 'kib', kind: 'rune', options: ['kab', 'kub'] },
  { w: 'fot', kind: 'rune', options: ['fit', 'fut'] },
  { w: 'gos', kind: 'rune', options: ['gas', 'gus'], azureRef: 'goss' },
  { w: 'zup', kind: 'rune', options: ['zap', 'zip'] },
  { w: 'mub', kind: 'rune', options: ['mab', 'mib'] },
];

export const LEVEL4_CUTSCENES: Record<CutsceneId, CutsceneScript> = {
  opening: {
    id: 'opening',
    title: 'Sunless Ruins',
    subtitle: 'World 1 · Level 4 Opening',
    beats: [
      {
        id: 'l04-open-v1-1',
        image: '/src/assets/images/cutscene_l4_sunless_ruins_v2_1795472137783.jpg',
        motion: 'zoom',
        durationMs: 10000,
        speaker: 'The Rift Warden',
        voiceText:
          'We are deep inside the Sunless Ruins now. Heavy Rift Splitters are marching out of the temple gate, and each one bursts into two fast Rift Wisps when it shatters.',
        captions: [
          'Rift Splitters are marching from the temple gate.',
          'Each Splitter bursts into two Rift Wisps when defeated.',
        ],
        voiceStyle: 'Calm, focused veteran guardian briefing a teen recruit.',
        accent: 'violet',
      },
      {
        id: 'l04-open-v1-2',
        image: '/src/assets/images/cutscene_l4_sunless_ruins_v2_1795472137783.jpg',
        motion: 'pan',
        durationMs: 10500,
        speaker: 'The Rift Warden',
        voiceText:
          'Keep Ember Cannons and Spike Pits behind your front line to wipe out the split wisps fast. All five short vowels are live in the Forge now. Fill every lock to break through to the Thornking.',
        captions: [
          'Ember Cannons and Spike Pits clean up the split wisps fast.',
          'All five short vowels are active in the Rune Forge.',
        ],
        voiceStyle: 'Encouraging, steady, plain-spoken guardian.',
        accent: 'cyan',
      },
    ],
  },
  victory: {
    id: 'victory',
    title: 'Ruins Cleared',
    subtitle: 'World 1 · Level 4 Victory',
    beats: [
      {
        id: 'l04-vic-v1-1',
        image: '/src/assets/images/cutscene_l5_thornking_heart_v2_1795472137644.jpg',
        motion: 'lift',
        durationMs: 9500,
        speaker: 'The Rift Warden',
        voiceText:
          'All five short vowels locked down, and the Sunless Ruins are ours! Every single Splitter wave shattered before reaching the Anchor.',
        captions: [
          'All five short vowels mastered! The Sunless Ruins are clear.',
          'Only one barrier stands left in the Thornwood.',
        ],
        voiceStyle: 'Warm, proud veteran guardian.',
        accent: 'cyan',
      },
      {
        id: 'l04-vic-v1-2',
        image: '/src/assets/images/cutscene_l5_thornking_heart_v2_1795472137644.jpg',
        motion: 'zoom',
        durationMs: 10000,
        speaker: 'The Rift Warden',
        voiceText:
          'Beyond the ruins sits the Thornking Heart. Ironbark Brutes guard the root causeway, and the Thornking himself is waking up. Ready your best towers, Runner. This is the final stand of World One.',
        captions: [
          'Next stop: Thornking Heart, the World 1 Boss battle.',
          'Ironbark Brutes and the Thornking await ahead.',
        ],
        voiceStyle: 'Deep, resolute, dramatic mentor before the boss battle.',
        accent: 'violet',
      },
    ],
  },
  defeat: {
    id: 'defeat',
    title: 'Courtyard Breached',
    subtitle: 'World 1 · Level 4 Defeat',
    beats: [
      {
        id: 'l04-def-v1-1',
        image: '/src/assets/images/cutscene_defeat_breach_1795457392970.jpg',
        motion: 'zoom',
        durationMs: 9000,
        speaker: 'The Rift Warden',
        voiceText:
          'Those split wisps slipped past the courtyard arch. Keep your chin up, Runner. Drop an Ember Cannon near the rune circle and back it with Spike Pits next run.',
        captions: [
          'The split wisps overwhelmed the courtyard defense.',
          'Place an Ember Cannon by the rune circle and try again.',
        ],
        voiceStyle: 'Calm, encouraging mentor after a defeat.',
        accent: 'crimson',
      },
    ],
  },
};

export const LEVEL4: LevelConfig = {
  id: 'w1-l4',
  num: 4,
  worldId: 'w1',
  worldName: 'World 1: The Thornwood',
  name: 'Sunless Ruins',
  headline: 'Survive the Surge at Sunless Ruins',
  description:
    'Crystal Rift Splitters are advancing through the sunken temple courtyard and bursting into Rift Wisps when cracked. Switch cleanly across all five short vowels to hold the ruins.',
  enemiesSummary: 'Rift Splitters, Rift Bats, and Bramble Stalkers',
  wordsSummary: 'all 5 short vowels (a, e, i, o, u), plus runes',
  rewardSummary: 'Thornking Heart boss stage + Tesla Spire unlock',
  nextLevelId: 'w1-l5',
  vowels: ['a', 'e', 'i', 'o', 'u'],
  defenders: ['archer', 'spike', 'golem', 'frost', 'ember'],
  runeRate: 0.3,
  startCrystals: 205,
  waveEvery: 10,
  anchor: 20,
  minWaves: 2,
  bonusSurgeWaves: 3,
  mastery: {
    window: 6,
    need: 5,
  },
  endless: {
    hpStep: 0.16,
    countStep: 0.14,
  },
  finalBoost: 1.25,
  hasWalkthrough: false,
  backdropImage: '/src/assets/images/cutscene_l4_sunless_ruins_v2_1795472137783.jpg',
  pathUv: [
    [0.235, 0.285],
    [0.295, 0.340],
    [0.332, 0.415],
    [0.312, 0.485],
    [0.255, 0.545],
    [0.215, 0.625],
    [0.235, 0.715],
    [0.320, 0.770],
    [0.425, 0.755],
    [0.490, 0.675],
    [0.530, 0.555],
    [0.585, 0.455],
    [0.665, 0.420],
    [0.735, 0.460],
    [0.730, 0.540],
    [0.675, 0.620],
    [0.648, 0.695],
    [0.695, 0.765],
    [0.790, 0.805],
  ],
  riverUv: [],
  riftUv: [0.228, 0.255],
  campUv: [0.805, 0.815],
  wardenUv: [0.745, 0.770],
  pads: [
    { id: 's_t1', kind: 'tower', u: 0.205, v: 0.500 },
    { id: 's_t2', kind: 'tower', u: 0.160, v: 0.595 },
    { id: 's_t3', kind: 'tower', u: 0.165, v: 0.715 },
    { id: 's_t4', kind: 'tower', u: 0.220, v: 0.825 },
    { id: 's_t5', kind: 'tower', u: 0.310, v: 0.870 },
    { id: 's_t6', kind: 'tower', u: 0.425, v: 0.670 },
    { id: 's_t7', kind: 'tower', u: 0.670, v: 0.495 },
    { id: 's_t8', kind: 'tower', u: 0.615, v: 0.820 },
    { id: 's_t9', kind: 'tower', u: 0.725, v: 0.710 },
    { id: 's_r1', kind: 'trail', u: 0.320, v: 0.455 },
    { id: 's_r2', kind: 'trail', u: 0.355, v: 0.765 },
    { id: 's_r3', kind: 'trail', u: 0.560, v: 0.495 },
    { id: 's_r4', kind: 'trail', u: 0.665, v: 0.645 },
  ],
  waves: [
    {
      hp: 1.0,
      groups: [
        { type: 'splitter', count: 3, gap: 3.8 },
        { type: 'bat', count: 8, gap: 1.2, delay: 6.5 },
      ],
    },
    {
      hp: 1.18,
      groups: [
        { type: 'splitter', count: 4, gap: 3.1 },
        { type: 'bramble', count: 4, gap: 2.9, delay: 5.5 },
        { type: 'bat', count: 9, gap: 1.0, delay: 10.5 },
      ],
    },
    {
      hp: 1.42,
      groups: [
        { type: 'splitter', count: 6, gap: 2.6 },
        { type: 'bat', count: 13, gap: 0.82, delay: 4.5 },
        { type: 'bramble', count: 6, gap: 2.5, delay: 11.5 },
      ],
    },
    {
      hp: 1.7,
      groups: [
        { type: 'splitter', count: 8, gap: 2.3 },
        { type: 'bramble', count: 8, gap: 2.2, delay: 5 },
        { type: 'bat', count: 15, gap: 0.72, delay: 11 },
      ],
    },
    {
      hp: 2.02,
      groups: [
        { type: 'splitter', count: 10, gap: 2.05 },
        { type: 'bat', count: 17, gap: 0.68, delay: 4 },
        { type: 'bramble', count: 9, gap: 1.95, delay: 10 },
      ],
    },
  ],
  realWords: LEVEL4_REAL_WORDS,
  runes: LEVEL4_RUNES,
  cutscenes: LEVEL4_CUTSCENES,
};

// ---------------------------------------------------------------------------
// World 1 · Level 5: Thornking's Heart (World 1 Boss Finale - No Bonus Surge)
// ---------------------------------------------------------------------------
export const LEVEL5_REAL_WORDS: WordEntry[] = [
  { w: 'zap', kind: 'real', options: ['zip', 'zup'], es: 'descarga' },
  { w: 'lab', kind: 'real', options: ['lib', 'lub'], es: 'laboratorio', cognate: true },
  { w: 'jab', kind: 'real', options: ['jib', 'jub'], es: 'golpe' },
  { w: 'pad', kind: 'real', options: ['pid', 'pod'], es: 'almohadilla' },
  { w: 'hat', kind: 'real', options: ['hit', 'hut'], es: 'sombrero' },
  { w: 'vet', kind: 'real', options: ['vit', 'vat'], es: 'veterinario' },
  { w: 'hem', kind: 'real', options: ['him', 'ham'], es: 'dobladillo' },
  { w: 'peg', kind: 'real', options: ['pig', 'pug'], es: 'clavija' },
  { w: 'fed', kind: 'real', options: ['fid', 'fad'], es: 'alimentó' },
  { w: 'den', kind: 'real', options: ['din', 'dan'], es: 'guarida' },
  { w: 'fit', kind: 'real', options: ['fet', 'fat'], es: 'en forma' },
  { w: 'rip', kind: 'real', options: ['rep', 'rap'], es: 'rasgar' },
  { w: 'hit', kind: 'real', options: ['het', 'hat'], es: 'golpear' },
  { w: 'fin', kind: 'real', options: ['fan', 'fun'], es: 'aleta' },
  { w: 'pin', kind: 'real', options: ['pen', 'pan'], es: 'alfiler' },
  { w: 'rod', kind: 'real', options: ['red', 'rid'], es: 'vara' },
  { w: 'log', kind: 'real', options: ['lag', 'lug'], es: 'tronco' },
  { w: 'mop', kind: 'real', options: ['map', 'mup'], es: 'trapeador' },
  { w: 'top', kind: 'real', options: ['tap', 'tip'], es: 'cima' },
  { w: 'dot', kind: 'real', options: ['dit', 'dut'], es: 'punto' },
  { w: 'fun', kind: 'real', options: ['fan', 'fin'], es: 'diversión' },
  { w: 'mug', kind: 'real', options: ['mag', 'mig'], es: 'taza' },
  { w: 'tub', kind: 'real', options: ['tab', 'tib'], es: 'tina' },
  { w: 'bus', kind: 'real', options: ['bas', 'bis'], es: 'autobús', cognate: true },
  { w: 'cut', kind: 'real', options: ['cat', 'cot'], es: 'cortar' },
];

export const LEVEL5_RUNES: WordEntry[] = [
  { w: 'dag', kind: 'rune', options: ['dig', 'dug'] },
  { w: 'jat', kind: 'rune', options: ['jit', 'jut'] },
  { w: 'ked', kind: 'rune', options: ['kid', 'kad'], azureRef: 'kedd' },
  { w: 'zem', kind: 'rune', options: ['zim', 'zam'] },
  { w: 'pid', kind: 'rune', options: ['pad', 'pod'], azureRef: 'pidd' },
  { w: 'fim', kind: 'rune', options: ['fam', 'fum'] },
  { w: 'rup', kind: 'rune', options: ['rap', 'rip'] },
  { w: 'mux', kind: 'rune', options: ['max', 'mix'] },
  { w: 'mub', kind: 'rune', options: ['mab', 'mib'] },
  { w: 'gos', kind: 'rune', options: ['gas', 'gus'], azureRef: 'goss' },
];

export const LEVEL5_CUTSCENES: Record<CutsceneId, CutsceneScript> = {
  opening: {
    id: 'opening',
    title: "Thornking's Heart",
    subtitle: 'World 1 · Final Boss Opening',
    beats: [
      {
        id: 'l05-open-v1-1',
        image: '/src/assets/images/cutscene_l5_thornking_heart_v2_1795472137644.jpg',
        motion: 'zoom',
        durationMs: 10500,
        speaker: 'The Rift Warden',
        voiceText:
          'This is the heart of the Thornwood, Runner. Massive Ironbark Brutes are marching down the root bridge, and the Thornking himself is stepping through the crown portal.',
        captions: [
          'Welcome to the Thornking Heart, the final battle of World 1.',
          'Ironbark Brutes and the Thornking are marching on the citadel.',
        ],
        voiceStyle: 'Resolute, epic, grounded veteran guardian before a final boss fight.',
        accent: 'violet',
      },
      {
        id: 'l05-open-v1-2',
        image: '/src/assets/images/cutscene_l5_thornking_heart_v2_1795472137644.jpg',
        motion: 'pan',
        durationMs: 10500,
        speaker: 'The Rift Warden',
        voiceText:
          'We built our first arc-tech weapon for this fight: the Tesla Spire. Chain lightning across the swarms or push it to Overcharge Beam to melt the Thornking. Lock all five short vowels and seal World One for good.',
        captions: [
          'New weapon unlocked: Tesla Spire chains lightning across ground and air.',
          'Lock all five short vowels and defeat the Thornking to seal World 1.',
        ],
        voiceStyle: 'Steadfast, inspiring guardian rallying a teen hero.',
        accent: 'cyan',
      },
    ],
  },
  victory: {
    id: 'victory',
    title: 'The Thornwood Restored',
    subtitle: 'World 1 · Campaign Finale',
    beats: [
      {
        id: 'l05-vic-v1-1',
        image: '/src/assets/images/cutscene_victory_thornking_1795457393719.jpg',
        motion: 'lift',
        durationMs: 10500,
        speaker: 'The Rift Warden',
        voiceText:
          'You did it, Runner! The Thornking shattered, the crown rift collapsed, and sunlight is breaking back over the entire Thornwood.',
        captions: [
          'The Thornking has fallen and the crown rift is sealed!',
          'Sunlight breaks across World 1: The Thornwood.',
        ],
        voiceStyle: 'Triumphant, heartfelt veteran guardian celebrating World 1 victory.',
        accent: 'cyan',
      },
      {
        id: 'l05-vic-v1-2',
        image: '/src/assets/images/cutscene_victory_seal_1795457393110.jpg',
        motion: 'zoom',
        durationMs: 10000,
        speaker: 'The Rift Warden',
        voiceText:
          'Every short vowel is yours now. Rest up and celebrate this win. Beyond the northern mountains, World Two is already calling for a Rift Runner.',
        captions: [
          'All five short vowels mastered across World 1.',
          'You can load a full-motion finale video here anytime using Load MP4.',
        ],
        voiceStyle: 'Warm, inspiring, triumphant closing note.',
        accent: 'violet',
      },
    ],
  },
  defeat: {
    id: 'defeat',
    title: 'The Thornking Advances',
    subtitle: 'World 1 · Boss Defeat',
    beats: [
      {
        id: 'l05-def-v1-1',
        image: '/src/assets/images/cutscene_defeat_breach_1795457392970.jpg',
        motion: 'zoom',
        durationMs: 9500,
        speaker: 'The Rift Warden',
        voiceText:
          'The Thornking pushed through the citadel gate. Do not back down, Runner. Slow the Brutes on the root causeway with Frost Totems and hammer them with Sharpshooter and Inferno upgrades.',
        captions: [
          'The Thornking pushed through the citadel gate.',
          'Slow the Brutes at the root bridge and hit hard with Level 3 specialties.',
        ],
        voiceStyle: 'Steady, encouraging guardian after a tough boss attempt.',
        accent: 'crimson',
      },
    ],
  },
};

export const LEVEL5: LevelConfig = {
  id: 'w1-l5',
  num: 5,
  worldId: 'w1',
  worldName: 'World 1: The Thornwood',
  name: "Thornking's Heart",
  headline: 'Defeat the Thornking at the Heart',
  description:
    'The World 1 finale. Armored Ironbark Brutes and the Thornking himself are marching across the root causeway. Deploy the new Tesla Spire alongside your full roster and lock all five short vowels to seal the Thornwood.',
  enemiesSummary: 'Ironbark Brutes, Rift Splitters, and The Thornking',
  wordsSummary: 'Boss Finale · all 5 short vowels + runes',
  rewardSummary: 'World 2: The Sunken Foundry Unlocked',
  nextLevelId: 'w2-l1',
  vowels: ['a', 'e', 'i', 'o', 'u'],
  defenders: ['archer', 'spike', 'golem', 'frost', 'ember', 'tesla'],
  runeRate: 0.32,
  startCrystals: 255,
  waveEvery: 10,
  anchor: 20,
  minWaves: 3,
  bonusSurgeWaves: 0,
  mastery: {
    window: 6,
    need: 5,
  },
  endless: {
    hpStep: 0.18,
    countStep: 0.14,
  },
  finalBoost: 1.2,
  hasWalkthrough: false,
  backdropImage: '/src/assets/images/cutscene_l5_thornking_heart_v2_1795472137644.jpg',
  pathUv: [
    [0.195, 0.295],
    [0.265, 0.365],
    [0.265, 0.435],
    [0.200, 0.525],
    [0.175, 0.615],
    [0.225, 0.695],
    [0.320, 0.715],
    [0.405, 0.645],
    [0.485, 0.530],
    [0.555, 0.425],
    [0.620, 0.320],
    [0.705, 0.295],
    [0.775, 0.365],
    [0.770, 0.455],
    [0.695, 0.555],
    [0.642, 0.665],
    [0.680, 0.765],
    [0.785, 0.800],
  ],
  riverUv: [],
  riftUv: [0.155, 0.225],
  campUv: [0.805, 0.805],
  wardenUv: [0.745, 0.770],
  pads: [
    { id: 'k_t1', kind: 'tower', u: 0.175, v: 0.425 },
    { id: 'k_t2', kind: 'tower', u: 0.345, v: 0.445 },
    { id: 'k_t3', kind: 'tower', u: 0.285, v: 0.585 },
    { id: 'k_t4', kind: 'tower', u: 0.555, v: 0.300 },
    { id: 'k_t5', kind: 'tower', u: 0.635, v: 0.225 },
    { id: 'k_t6', kind: 'tower', u: 0.710, v: 0.220 },
    { id: 'k_t7', kind: 'tower', u: 0.780, v: 0.265 },
    { id: 'k_t8', kind: 'tower', u: 0.835, v: 0.365 },
    { id: 'k_t9', kind: 'tower', u: 0.675, v: 0.485 },
    { id: 'k_r1', kind: 'trail', u: 0.245, v: 0.455 },
    { id: 'k_r2', kind: 'trail', u: 0.325, v: 0.710 },
    { id: 'k_r3', kind: 'trail', u: 0.615, v: 0.330 },
    { id: 'k_r4', kind: 'trail', u: 0.655, v: 0.695 },
  ],
  waves: [
    {
      hp: 1.0,
      groups: [
        { type: 'brute', count: 2, gap: 4.8 },
        { type: 'bat', count: 9, gap: 1.1, delay: 4.5 },
        { type: 'splitter', count: 3, gap: 3.5, delay: 11 },
      ],
    },
    {
      hp: 1.18,
      groups: [
        { type: 'brute', count: 3, gap: 3.8 },
        { type: 'splitter', count: 5, gap: 2.8, delay: 5.5 },
        { type: 'bramble', count: 5, gap: 2.5, delay: 11.5 },
      ],
    },
    {
      hp: 1.32,
      groups: [
        { type: 'thornking', count: 1, gap: 1.0, delay: 4.5 },
        { type: 'brute', count: 4, gap: 3.6, delay: 1 },
        { type: 'bat', count: 13, gap: 0.88, delay: 7.5 },
        { type: 'splitter', count: 4, gap: 2.7, delay: 14.5 },
      ],
    },
    {
      hp: 1.62,
      groups: [
        { type: 'thornking', count: 1, gap: 1.0, delay: 3 },
        { type: 'brute', count: 5, gap: 3.05, delay: 1 },
        { type: 'splitter', count: 6, gap: 2.25, delay: 8 },
        { type: 'bat', count: 15, gap: 0.76, delay: 13 },
      ],
    },
    {
      hp: 1.92,
      groups: [
        { type: 'thornking', count: 1, gap: 1.0, delay: 2 },
        { type: 'brute', count: 7, gap: 2.75, delay: 1 },
        { type: 'splitter', count: 8, gap: 2.15, delay: 7 },
        { type: 'bramble', count: 7, gap: 2.05, delay: 13 },
      ],
    },
  ],
  realWords: LEVEL5_REAL_WORDS,
  runes: LEVEL5_RUNES,
  cutscenes: LEVEL5_CUTSCENES,
};

// ---------------------------------------------------------------------------
// World 2 · Level 1: Ashgate Outpost (sh & ch Digraphs + Cinder Imps)
// ---------------------------------------------------------------------------
export const W2_L1_REAL_WORDS: WordEntry[] = [
  // sh digraph (initial & final)
  { w: 'ship', kind: 'real', pattern: 'sh', tiles: ['sh', 'i', 'p'], targetTileIdx: 0, options: ['chip', 'sip'], es: 'barco' },
  { w: 'shop', kind: 'real', pattern: 'sh', tiles: ['sh', 'o', 'p'], targetTileIdx: 0, options: ['chop', 'cop'], es: 'tienda' },
  { w: 'shut', kind: 'real', pattern: 'sh', tiles: ['sh', 'u', 't'], targetTileIdx: 0, options: ['cut', 'rut'], es: 'cerrar' },
  { w: 'shed', kind: 'real', pattern: 'sh', tiles: ['sh', 'e', 'd'], targetTileIdx: 0, options: ['fed', 'red'], es: 'cobertizo' },
  { w: 'shot', kind: 'real', pattern: 'sh', tiles: ['sh', 'o', 't'], targetTileIdx: 0, options: ['hot', 'lot'], es: 'tiro' },
  { w: 'shin', kind: 'real', pattern: 'sh', tiles: ['sh', 'i', 'n'], targetTileIdx: 0, options: ['chin', 'pin'], es: 'espinilla' },
  { w: 'cash', kind: 'real', pattern: 'sh', tiles: ['c', 'a', 'sh'], targetTileIdx: 2, options: ['cat', 'cap'], es: 'efectivo' },
  { w: 'dish', kind: 'real', pattern: 'sh', tiles: ['d', 'i', 'sh'], targetTileIdx: 2, options: ['dig', 'dip'], es: 'plato' },
  { w: 'rush', kind: 'real', pattern: 'sh', tiles: ['r', 'u', 'sh'], targetTileIdx: 2, options: ['rug', 'run'], es: 'prisa' },
  { w: 'mash', kind: 'real', pattern: 'sh', tiles: ['m', 'a', 'sh'], targetTileIdx: 2, options: ['map', 'mat'], es: 'machacar' },
  // ch digraph (initial & final)
  { w: 'chip', kind: 'real', pattern: 'ch', tiles: ['ch', 'i', 'p'], targetTileIdx: 0, options: ['ship', 'tip'], es: 'ficha' },
  { w: 'chop', kind: 'real', pattern: 'ch', tiles: ['ch', 'o', 'p'], targetTileIdx: 0, options: ['shop', 'top'], es: 'cortar' },
  { w: 'chat', kind: 'real', pattern: 'ch', tiles: ['ch', 'a', 't'], targetTileIdx: 0, options: ['sat', 'hat'], es: 'charlar', cognate: true },
  { w: 'chin', kind: 'real', pattern: 'ch', tiles: ['ch', 'i', 'n'], targetTileIdx: 0, options: ['shin', 'fin'], es: 'barbilla' },
  { w: 'chug', kind: 'real', pattern: 'ch', tiles: ['ch', 'u', 'g'], targetTileIdx: 0, options: ['hug', 'tug'], es: 'avanzar fuerte' },
  { w: 'chap', kind: 'real', pattern: 'ch', tiles: ['ch', 'a', 'p'], targetTileIdx: 0, options: ['tap', 'map'], es: 'tipo' },
  { w: 'chum', kind: 'real', pattern: 'ch', tiles: ['ch', 'u', 'm'], targetTileIdx: 0, options: ['hum', 'sum'], es: 'amigo' },
  { w: 'much', kind: 'real', pattern: 'ch', tiles: ['m', 'u', 'ch'], targetTileIdx: 2, options: ['mug', 'mud'], es: 'mucho', cognate: true },
  { w: 'rich', kind: 'real', pattern: 'ch', tiles: ['r', 'i', 'ch'], targetTileIdx: 2, options: ['rip', 'rid'], es: 'rico', cognate: true },
  { w: 'such', kind: 'real', pattern: 'ch', tiles: ['s', 'u', 'ch'], targetTileIdx: 2, options: ['sun', 'sub'], es: 'tal' },
];

export const W2_L1_RUNES: WordEntry[] = [
  { w: 'shab', kind: 'rune', pattern: 'sh', tiles: ['sh', 'a', 'b'], targetTileIdx: 0, options: ['chab', 'cab'], azureRef: 'shabb' },
  { w: 'shep', kind: 'rune', pattern: 'sh', tiles: ['sh', 'e', 'p'], targetTileIdx: 0, options: ['chep', 'step'], azureRef: 'shepp' },
  { w: 'shib', kind: 'rune', pattern: 'sh', tiles: ['sh', 'i', 'b'], targetTileIdx: 0, options: ['chib', 'kib'], azureRef: 'shibb' },
  { w: 'shom', kind: 'rune', pattern: 'sh', tiles: ['sh', 'o', 'm'], targetTileIdx: 0, options: ['chom', 'mom'], azureRef: 'shomm' },
  { w: 'shup', kind: 'rune', pattern: 'sh', tiles: ['sh', 'u', 'p'], targetTileIdx: 0, options: ['chup', 'cup'], azureRef: 'shupp' },
  { w: 'chab', kind: 'rune', pattern: 'ch', tiles: ['ch', 'a', 'b'], targetTileIdx: 0, options: ['shab', 'cab'], azureRef: 'chabb' },
  { w: 'chep', kind: 'rune', pattern: 'ch', tiles: ['ch', 'e', 'p'], targetTileIdx: 0, options: ['shep', 'pep'], azureRef: 'chepp' },
  { w: 'chib', kind: 'rune', pattern: 'ch', tiles: ['ch', 'i', 'b'], targetTileIdx: 0, options: ['shib', 'kib'], azureRef: 'chibb' },
  { w: 'chot', kind: 'rune', pattern: 'ch', tiles: ['ch', 'o', 't'], targetTileIdx: 0, options: ['shot', 'cot'], azureRef: 'chott' },
  { w: 'chup', kind: 'rune', pattern: 'ch', tiles: ['ch', 'u', 'p'], targetTileIdx: 0, options: ['shup', 'cup'], azureRef: 'chupp' },
];

export const W2_L1_CUTSCENES: Record<CutsceneId, CutsceneScript> = {
  opening: {
    id: 'opening',
    title: 'World 2, Level 1: Ashgate Outpost',
    subtitle: 'Opening Cutscene',
    beats: [
      {
        id: 'w2-l01-open-v1-1',
        image: '/src/assets/images/cutscene_w2_l1_opening_1795525103158.jpg',
        motion: 'zoom',
        durationMs: 10000,
        speaker: 'The Rift Warden',
        voiceText:
          'Welcome to the Sunken Foundry, Runner. A new breach just split the obsidian cliffs above Ashgate Outpost, and fast Cinder Imps are sprinting down the stone road in tight packs.',
        captions: [
          'Breach at Ashgate Outpost, the border of World 2: The Sunken Foundry.',
          'Fast Cinder Imps are sprinting down the ash road in tight packs.',
        ],
        accent: 'violet',
        voiceStyle:
          'Focused, steady veteran guardian briefing a capable teenage partner at a volcanic fortress gate.',
      },
      {
        id: 'w2-l01-open-v1-2',
        image: '/src/assets/images/cutscene_w2_l1_opening_1795525103158.jpg',
        motion: 'pan',
        durationMs: 11000,
        speaker: 'The Rift Warden',
        voiceText:
          'Cinder Imps shrug off half of frost slows, so bring your full World One roster: chain lightning with Tesla Spires and blast clusters with Ember Cannons. Lock sh and ch digraphs in the Forge to seal the gate.',
        captions: [
          'Cinder Imps resist half of slows. Use Tesla Spires and Ember Cannons against packs.',
          'Fill the sh and ch Rift Locks in the Forge to unlock the Final Wave.',
        ],
        accent: 'cyan',
        voiceStyle:
          'Confident, tactical mentor giving clear, direct battlefield guidance.',
      },
    ],
  },
  victory: {
    id: 'victory',
    title: 'Ashgate Outpost: Rift Sealed',
    subtitle: 'Victory Cutscene',
    beats: [
      {
        id: 'w2-l01-vic-v1-1',
        image: '/src/assets/images/cutscene_w2_l1_victory_1795525102801.jpg',
        motion: 'lift',
        durationMs: 10000,
        speaker: 'The Rift Warden',
        voiceText:
          'Ashgate Outpost is ours, Runner! Your clean sh and ch reads locked the fissure down before the Cinder Imps could torch the Anchor.',
        captions: [
          'Ashgate Outpost is secure! The Cinder Imp breach is sealed.',
          'Clean sh and ch digraph reads held the foundry border.',
        ],
        accent: 'cyan',
        voiceStyle:
          'Warm, proud veteran guardian celebrating a crisp opening win in World 2.',
      },
      {
        id: 'w2-l01-vic-v1-2',
        image: '/src/assets/images/cutscene_w2_l1_victory_1795525102801.jpg',
        motion: 'zoom',
        durationMs: 10000,
        speaker: 'The Rift Warden',
        voiceText:
          'Look past the iron arch. The smelters deeper in the gorge are roaring, and armored Shieldbearers are marching across Smelter Causeway. Our engineers are finishing the Rail Turret for what comes next.',
        captions: [
          'Deeper inside the Sunken Foundry, armored Shieldbearers guard Smelter Causeway.',
          'Next stage ahead: Smelter Causeway (Rail Turret unlock).',
        ],
        accent: 'violet',
        voiceStyle:
          'Steady, watchful guardian looking ahead toward the glowing smelters.',
      },
    ],
  },
  defeat: {
    id: 'defeat',
    title: 'Ashgate Breached',
    subtitle: 'Defeat Cutscene',
    beats: [
      {
        id: 'w2-l01-def-v1-1',
        image: '/src/assets/images/cutscene_defeat_breach_1795457392970.jpg',
        motion: 'zoom',
        durationMs: 9500,
        speaker: 'The Rift Warden',
        voiceText:
          'The Cinder Imps outran our frost line and cracked the Anchor. Shake it off, Runner. Pair a Tesla Spire with an Ember Cannon at the center hairpin and drop Spike Pits along the bends next run.',
        captions: [
          'The Cinder Imps slipped past the line and hit the Anchor.',
          'Tip: pair Tesla Spires with Ember Cannons at the bends, then try again.',
        ],
        accent: 'crimson',
        voiceStyle:
          'Calm, encouraging mentor offering a clear tactical tip with zero blame.',
      },
    ],
  },
};

export const W2_LEVEL1: LevelConfig = {
  id: 'w2-l1',
  num: 1,
  worldId: 'w2',
  worldName: 'World 2: The Sunken Foundry',
  name: 'Ashgate Outpost',
  headline: 'Hold the Gate at Ashgate Outpost',
  description:
    'The Sunken Foundry opens with a volcanic breach. Fast Cinder Imps resist half of slow effects and sprint in tight packs. Master sh and ch digraphs alongside your full World 1 defender roster.',
  enemiesSummary: 'Cinder Imps, Rift Bats, and Bramble Stalkers',
  wordsSummary: 'sh and ch digraphs, plus runes',
  rewardSummary: 'Smelter Causeway road opens ahead',
  vowels: ['sh', 'ch'],
  defenders: ['archer', 'spike', 'golem', 'frost', 'ember', 'tesla'],
  runeRate: 0.28,
  startCrystals: 225,
  waveEvery: 10,
  anchor: 20,
  minWaves: 2,
  bonusSurgeWaves: 3,
  mastery: {
    window: 10,
    need: 9,
  },
  endless: {
    hpStep: 0.14,
    countStep: 0.14,
  },
  finalBoost: 1.25,
  hasWalkthrough: false,
  backdropImage: '/src/assets/images/cutscene_w2_l1_opening_1795525103158.jpg',
  pathUv: [
    [0.215, 0.275],
    [0.285, 0.335],
    [0.385, 0.345],
    [0.495, 0.280],
    [0.585, 0.245],
    [0.665, 0.275],
    [0.700, 0.355],
    [0.655, 0.435],
    [0.555, 0.490],
    [0.435, 0.525],
    [0.345, 0.575],
    [0.305, 0.665],
    [0.345, 0.745],
    [0.440, 0.785],
    [0.545, 0.765],
    [0.640, 0.715],
    [0.730, 0.720],
    [0.805, 0.765],
  ],
  riverUv: [
    [0.74, 0.12],
    [0.82, 0.20],
    [0.88, 0.31],
    [0.92, 0.44],
    [0.94, 0.56],
    [0.97, 0.68],
  ],
  riftUv: [0.205, 0.235],
  campUv: [0.845, 0.795],
  wardenUv: [0.790, 0.790],
  pads: [
    { id: 'a_t1', kind: 'tower', u: 0.495, v: 0.190 },
    { id: 'a_t2', kind: 'tower', u: 0.628, v: 0.180 },
    { id: 'a_t3', kind: 'tower', u: 0.608, v: 0.335 },
    { id: 'a_t4', kind: 'tower', u: 0.464, v: 0.435 },
    { id: 'a_t5', kind: 'tower', u: 0.758, v: 0.420 },
    { id: 'a_t6', kind: 'tower', u: 0.288, v: 0.520 },
    { id: 'a_t7', kind: 'tower', u: 0.400, v: 0.655 },
    { id: 'a_t8', kind: 'tower', u: 0.578, v: 0.645 },
    { id: 'a_t9', kind: 'tower', u: 0.703, v: 0.630 },
    { id: 'a_t10', kind: 'tower', u: 0.515, v: 0.885 },
    { id: 'a_r1', kind: 'trail', u: 0.495, v: 0.280 },
    { id: 'a_r2', kind: 'trail', u: 0.555, v: 0.490 },
    { id: 'a_r3', kind: 'trail', u: 0.305, v: 0.665 },
    { id: 'a_r4', kind: 'trail', u: 0.640, v: 0.715 },
  ],
  waves: [
    {
      hp: 1.0,
      groups: [
        { type: 'cinderimp', count: 10, gap: 0.85 },
        { type: 'bramble', count: 3, gap: 3.2, delay: 6.5 },
      ],
    },
    {
      hp: 1.18,
      groups: [
        { type: 'cinderimp', count: 14, gap: 0.68 },
        { type: 'bat', count: 8, gap: 1.05, delay: 5.5 },
        { type: 'bramble', count: 4, gap: 2.8, delay: 11 },
      ],
    },
    {
      hp: 1.4,
      groups: [
        { type: 'cinderimp', count: 18, gap: 0.58 },
        { type: 'splitter', count: 4, gap: 2.9, delay: 5 },
        { type: 'bat', count: 10, gap: 0.9, delay: 11.5 },
      ],
    },
    {
      hp: 1.66,
      groups: [
        { type: 'cinderimp', count: 22, gap: 0.52 },
        { type: 'brute', count: 3, gap: 3.6, delay: 4.5 },
        { type: 'splitter', count: 5, gap: 2.6, delay: 10.5 },
      ],
    },
    {
      hp: 1.95,
      groups: [
        { type: 'cinderimp', count: 26, gap: 0.46 },
        { type: 'brute', count: 4, gap: 3.1, delay: 4 },
        { type: 'bat', count: 14, gap: 0.78, delay: 9 },
        { type: 'splitter', count: 6, gap: 2.3, delay: 14 },
      ],
    },
  ],
  realWords: W2_L1_REAL_WORDS,
  runes: W2_L1_RUNES,
  cutscenes: W2_L1_CUTSCENES,
};

// World 2 Roadmap Preview Nodes (Levels 2-5 visible on World 2 map, unlocked as built)
export const W2_LEVEL2: LevelConfig = {
  ...W2_LEVEL1,
  id: 'w2-l2',
  num: 2,
  name: 'Smelter Causeway',
  headline: 'Break the Armor at Smelter Causeway',
  description:
    'Heavily armored Shieldbearers march across the iron viaduct while shrugging off light rapid fire. Unlock the new electromagnetic Rail Turret and the side Loadout picker while mastering th, wh, and -ck digraphs.',
  enemiesSummary: 'Shieldbearers, Cinder Imps, and Bramble Stalkers',
  wordsSummary: 'th, wh, and -ck digraphs + runes',
  rewardSummary: 'Rail Turret + Side Loadout Selector',
  vowels: ['th', 'wh', 'ck'],
  comingSoon: true,
  backdropImage: '/src/assets/images/cutscene_w2_l1_victory_1795525102801.jpg',
};

export const W2_LEVEL3: LevelConfig = {
  ...W2_LEVEL1,
  id: 'w2-l3',
  num: 3,
  name: 'Ironrift Crossing',
  headline: 'Lock the Skies at Ironrift Crossing',
  description:
    'Armored Rift Shriekers surge overhead across the foundry stacks, dodging ground traps. Decode initial L-blends and R-blends cleanly to keep your anti-air grid online.',
  enemiesSummary: 'Rift Shriekers, Shieldbearers, and Cinder Imps',
  wordsSummary: 'L-blends and R-blends + runes',
  rewardSummary: 'Crucible Bastion path opens ahead',
  vowels: ['bl', 'cl', 'fr', 'gr'],
  comingSoon: true,
  backdropImage: '/src/assets/images/cutscene_w2_l1_victory_1795525102801.jpg',
};

export const W2_LEVEL4: LevelConfig = {
  ...W2_LEVEL1,
  id: 'w2-l4',
  num: 4,
  name: 'Crucible Bastion',
  headline: 'Shatter the Line at Crucible Bastion',
  description:
    'Forge Weavers shield and mend armored foundry columns until focused down. Master initial S-blends and final consonant blends to punch through their defenses.',
  enemiesSummary: 'Forge Weavers, Rift Shriekers, and Shieldbearers',
  wordsSummary: 'S-blends and final blends + runes',
  rewardSummary: 'The Furnace Core boss stage + Gravity Snare',
  vowels: ['sp', 'st', 'nd', 'mp'],
  comingSoon: true,
  backdropImage: '/src/assets/images/cutscene_w2_l1_victory_1795525102801.jpg',
};

export const W2_LEVEL5: LevelConfig = {
  ...W2_LEVEL1,
  id: 'w2-l5',
  num: 5,
  name: 'The Furnace Core',
  headline: 'Defeat the Iron Warden at the Core',
  description:
    'The World 2 finale. The towering Iron Warden shields escorts and calls armored waves inside the volcanic core. Deploy the new Gravity Snare alongside Rail Turrets and Tesla Spires across all World 2 digraphs and blends.',
  enemiesSummary: 'The Iron Warden, Forge Weavers, and Shieldbearers',
  wordsSummary: 'Boss Finale · all World 2 digraphs & blends',
  rewardSummary: 'World 2: The Sunken Foundry Completed',
  vowels: ['sh', 'ch', 'th', 'ck', 'st'],
  comingSoon: true,
  backdropImage: '/src/assets/images/cutscene_w2_l1_opening_1795525103158.jpg',
};

export const LEVELS: Record<string, LevelConfig> = {
  'w1-l1': LEVEL1,
  'w1-l2': LEVEL2,
  'w1-l3': LEVEL3,
  'w1-l4': LEVEL4,
  'w1-l5': LEVEL5,
  'w2-l1': W2_LEVEL1,
  'w2-l2': W2_LEVEL2,
  'w2-l3': W2_LEVEL3,
  'w2-l4': W2_LEVEL4,
  'w2-l5': W2_LEVEL5,
};

export const LEVEL_ORDER: LevelId[] = [
  'w1-l1',
  'w1-l2',
  'w1-l3',
  'w1-l4',
  'w1-l5',
  'w2-l1',
  'w2-l2',
  'w2-l3',
  'w2-l4',
  'w2-l5',
];

export interface WorldDef {
  id: WorldId;
  num: number;
  name: string;
  subtitle: string;
  levelIds: LevelId[];
}

export const WORLDS: Record<string, WorldDef> = {
  w1: {
    id: 'w1',
    num: 1,
    name: 'World 1: The Thornwood',
    subtitle: 'Short Vowels (a, e, i, o, u)',
    levelIds: ['w1-l1', 'w1-l2', 'w1-l3', 'w1-l4', 'w1-l5'],
  },
  w2: {
    id: 'w2',
    num: 2,
    name: 'World 2: The Sunken Foundry',
    subtitle: 'Digraphs & Blends (sh, ch, th, ck, blends)',
    levelIds: ['w2-l1', 'w2-l2', 'w2-l3', 'w2-l4', 'w2-l5'],
  },
};

export const WORLD_ORDER: WorldId[] = ['w1', 'w2'];
