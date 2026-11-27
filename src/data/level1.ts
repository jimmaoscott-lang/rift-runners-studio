export type WorldId = 'training' | 'w1' | 'w2' | 'w3';
export type VowelKey = 'a' | 'e' | 'i' | 'o' | 'u';
export type PatternKey = VowelKey | (string & {});
export type LevelId = 'placement' | 'w1-l1' | 'w1-l2' | 'w1-l3' | 'w1-l4' | 'w1-l5' | 'w2-l1' | 'w2-l2' | 'w2-l3' | 'w2-l4' | 'w2-l5' | 'w3-l1' | (string & {});
export type DifficultyId = 'easy' | 'normal' | 'hard' | 'expert';

export interface DifficultyConfig {
  id: DifficultyId;
  label: string;
  shortLabel: string;
  desc: string;
  hpMult: number;
  speedMult: number;
  countMult: number;
}

export const DIFFICULTY_ORDER: DifficultyId[] = ['easy', 'normal', 'hard', 'expert'];

export const DIFFICULTIES: Record<DifficultyId, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    shortLabel: 'Easy',
    desc: 'Weakest creatures, so students can focus on reading.',
    hpMult: 0.38,
    speedMult: 0.828,
    countMult: 1.0,
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    shortLabel: 'Normal',
    desc: 'Balanced for steady runs.',
    hpMult: 0.504,
    speedMult: 0.855,
    countMult: 1.0,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    shortLabel: 'Hard',
    desc: 'Tough waves that reward smart upgrades.',
    hpMult: 0.92,
    speedMult: 0.98,
    countMult: 1.0,
  },
  expert: {
    id: 'expert',
    label: 'Expert',
    shortLabel: 'Expert',
    desc: 'The most, fastest and strongest creatures for veteran Rift Runners.',
    hpMult: 1.0,
    speedMult: 1.1,
    countMult: 1.1,
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
  armorPierce?: boolean;
  pierceCount?: number;
  armorShred?: number;
  pullEvery?: number;
  pullStrength?: number;
  hitsAir?: boolean;
}

export interface DefenderSpec {
  id: 'a' | 'b';
  name: string;
  desc: string;
  cost: number;
  stats: DefenderLevelStats;
}

export type DefenderType =
  | 'archer'
  | 'spike'
  | 'golem'
  | 'frost'
  | 'ember'
  | 'tesla'
  | 'rail'
  | 'gravity';

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
  | 'cinderimp'
  | 'shieldbearer'
  | 'shrieker'
  | 'weaver'
  | 'ironwarden'
  | 'galewraith';

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
  gravityResist?: number;
  armor?: number;
  fireResist?: number;
  electricResist?: number;
  arrowResist?: number;
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
  isPlacement?: boolean;
  comingSoon?: boolean;
  freePlacement?: boolean;
  noBuildZones?: Array<{ u: number; v: number; r: number; label?: string }>;
  noBuildPolys?: Array<{ points: [number, number][]; label?: string }>;
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
  lockBonus: 100,
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
  bl: {
    label: 'bl blend',
    shortLabel: 'bl',
    show: '/bl/',
    word: 'black',
    ruleAudioId: 'rule.blend.v2',
    ruleLine: 'Two consonants slide smoothly together at the start, and you hear both sounds.',
  },
  cl: {
    label: 'cl blend',
    shortLabel: 'cl',
    show: '/kl/',
    word: 'clap',
    ruleAudioId: 'rule.blend.v2',
    ruleLine: 'Two consonants slide smoothly together at the start, and you hear both sounds.',
  },
  fr: {
    label: 'fr blend',
    shortLabel: 'fr',
    show: '/fr/',
    word: 'frog',
    ruleAudioId: 'rule.blend.v2',
    ruleLine: 'Two consonants slide smoothly together at the start, and you hear both sounds.',
  },
  gr: {
    label: 'gr blend',
    shortLabel: 'gr',
    show: '/gr/',
    word: 'grab',
    ruleAudioId: 'rule.blend.v2',
    ruleLine: 'Two consonants slide smoothly together at the start, and you hear both sounds.',
  },
  sp: {
    label: 'sp blend',
    shortLabel: 'sp',
    show: '/sp/',
    word: 'spin',
    ruleAudioId: 'rule.blend.v2',
    ruleLine: 'Two consonants slide smoothly together at the start, and you hear both sounds.',
  },
  st: {
    label: 'st blend',
    shortLabel: 'st',
    show: '/st/',
    word: 'stop',
    ruleAudioId: 'rule.blend.v2',
    ruleLine: 'Two consonants slide smoothly together at the start, and you hear both sounds.',
  },
  nd: {
    label: '-nd blend',
    shortLabel: 'nd',
    show: '/nd/',
    word: 'hand',
    ruleAudioId: 'rule.endblend.v2',
    ruleLine: 'Two consonants blend smoothly together at the end of a word, and you hear both sounds.',
  },
  mp: {
    label: '-mp blend',
    shortLabel: 'mp',
    show: '/mp/',
    word: 'camp',
    ruleAudioId: 'rule.endblend.v2',
    ruleLine: 'Two consonants blend smoothly together at the end of a word, and you hear both sounds.',
  },
  a_e: {
    label: 'Long a (a_e)',
    shortLabel: 'a_e',
    show: '/ā/',
    word: 'cake',
    ruleAudioId: 'rule.magice.v1',
    ruleLine: 'When a silent e sits at the end, it makes the vowel say its long name.',
  },
  i_e: {
    label: 'Long i (i_e)',
    shortLabel: 'i_e',
    show: '/ī/',
    word: 'bike',
    ruleAudioId: 'rule.magice.v1',
    ruleLine: 'When a silent e sits at the end, it makes the vowel say its long name.',
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
  { w: 'fog', kind: 'real', options: ['fig', 'fug'], es: 'niebla' },
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
      { dmg: 7, range: 6.8, rate: 1.0 },
      { dmg: 10, range: 7.8, rate: 1.15 },
      { dmg: 15, range: 8.8, rate: 1.3 },
    ],
    spec: {
      a: {
        id: 'a',
        name: 'Sharpshooter Tower',
        desc: 'Heavy arrows that reach far and hit hard.',
        cost: 145,
        stats: { dmg: 32, range: 11.8, rate: 0.85 },
      },
      b: {
        id: 'b',
        name: 'Volley Tower',
        desc: 'Fires three arrows at once, at three creatures.',
        cost: 145,
        stats: { dmg: 11, range: 9.2, rate: 1.45, multi: 3 },
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
      { dps: 8, radius: 2.2 },
      { dps: 12, radius: 2.4 },
      { dps: 17, radius: 2.6 },
    ],
    spec: {
      a: {
        id: 'a',
        name: 'Blade Pit',
        desc: 'Sharper spikes. Huge damage to anything that walks over.',
        cost: 110,
        stats: { dps: 29, radius: 2.8 },
      },
      b: {
        id: 'b',
        name: 'Tar Pit',
        desc: 'Sticky tar slows creatures while the spikes hurt them.',
        cost: 110,
        stats: { dps: 13, radius: 3.2, slow: 0.45 },
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
      { hp: 150, dmg: 9, rate: 1.0, hold: 3 },
      { hp: 210, dmg: 13, rate: 1.1, hold: 3 },
      { hp: 290, dmg: 19, rate: 1.2, hold: 4 },
    ],
    spec: {
      a: {
        id: 'a',
        name: 'Mountain Golem',
        desc: 'Huge and tough. Holds 6 creatures and rebuilds faster.',
        cost: 195,
        stats: { hp: 470, dmg: 20, rate: 1.2, hold: 6, respawn: 9 },
      },
      b: {
        id: 'b',
        name: 'Quake Golem',
        desc: 'Every slam hits all the creatures it holds.',
        cost: 195,
        stats: { hp: 320, dmg: 24, rate: 1.2, hold: 4, cleave: true },
      },
    },
  },
  frost: {
    id: 'frost',
    name: 'Frost Totem',
    shortName: 'Frost',
    desc: 'Slows creatures in its ring. Frost-resistant foes shrug off chill.',
    kind: 'tower',
    cost: 80,
    up: [55, 90],
    levels: [
      { range: 5.2, slow: 0.35 },
      { range: 6.1, slow: 0.44 },
      { range: 7.0, slow: 0.5 },
    ],
    spec: {
      a: {
        id: 'a',
        name: 'Glacier Totem',
        desc: 'Periodically freezes non-resistant creatures in its ring.',
        cost: 160,
        stats: { range: 7.2, slow: 0.5, freezeEvery: 6.0, freezeTime: 1.45 },
      },
      b: {
        id: 'b',
        name: 'Blizzard Totem',
        desc: 'A wider icy storm that slows and steadily chips down unresisted packs.',
        cost: 160,
        stats: { range: 8.2, slow: 0.55, dps: 6 },
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
      { dmg: 15, range: 6.6, rate: 0.62, splash: 2.3 },
      { dmg: 21, range: 7.6, rate: 0.68, splash: 2.6 },
      { dmg: 29, range: 8.6, rate: 0.74, splash: 2.9 },
    ],
    spec: {
      a: {
        id: 'a',
        name: 'Inferno Mortar',
        desc: 'Massive fiery blasts with long reach that smash packed waves.',
        cost: 175,
        stats: { dmg: 50, range: 10.8, rate: 0.56, splash: 3.7 },
      },
      b: {
        id: 'b',
        name: 'Cinder Repeater',
        desc: 'Rapid-fire blazing shells that keep steady splash pressure on the bridge.',
        cost: 175,
        stats: { dmg: 20, range: 8.6, rate: 1.45, splash: 2.2 },
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
      { dmg: 13, range: 6.4, rate: 0.9, chain: 3, chainRange: 3.4 },
      { dmg: 19, range: 7.2, rate: 1.0, chain: 4, chainRange: 3.8 },
      { dmg: 27, range: 8.0, rate: 1.1, chain: 4, chainRange: 4.1 },
    ],
    spec: {
      a: {
        id: 'a',
        name: 'Storm Conduit',
        desc: 'Supercharged arcs chain across 6 creatures at once, shredding swarms and flyers.',
        cost: 190,
        stats: { dmg: 31, range: 8.8, rate: 1.25, chain: 6, chainRange: 4.8 },
      },
      b: {
        id: 'b',
        name: 'Overcharge Beam',
        desc: 'Locks a surging plasma arc onto one enemy, ramping damage higher each hit to melt Brutes and Bosses.',
        cost: 190,
        stats: { dmg: 25, range: 9.2, rate: 1.5, chain: 1, beamRamp: 0.35 },
      },
    },
  },
  rail: {
    id: 'rail',
    name: 'Rail Turret',
    shortName: 'Rail',
    desc: 'Electromagnetic railgun that punches straight through heavy enemy armor on ground and air.',
    kind: 'tower',
    cost: 135,
    up: [100, 145],
    levels: [
      { dmg: 23, range: 8.6, rate: 0.72, armorPierce: true },
      { dmg: 34, range: 9.6, rate: 0.8, armorPierce: true },
      { dmg: 47, range: 10.6, rate: 0.88, armorPierce: true },
    ],
    spec: {
      a: {
        id: 'a',
        name: 'Piercing Rail',
        desc: 'Fires a hyper-velocity cyan rail beam that punches through up to 4 enemies in a line.',
        cost: 200,
        stats: { dmg: 62, range: 11.8, rate: 0.92, armorPierce: true, pierceCount: 4 },
      },
      b: {
        id: 'b',
        name: 'Shatter Coil',
        desc: 'Massive armor-piercing round that cracks enemy armor for 5 seconds so every tower hits at full power.',
        cost: 200,
        stats: { dmg: 82, range: 11.0, rate: 0.82, armorPierce: true, armorShred: 5.0 },
      },
    },
  },
  gravity: {
    id: 'gravity',
    name: 'Gravity Snare',
    shortName: 'Gravity',
    desc: 'Trail vortex that slows and periodically pulls lighter foes back into tower range. Heavy and anchored foes resist pulls.',
    kind: 'trail',
    cost: 95,
    up: [65, 105],
    levels: [
      { dps: 6, radius: 2.25, slow: 0.34, pullEvery: 3.2, pullStrength: 0.015, hitsAir: true },
      { dps: 9, radius: 2.45, slow: 0.4, pullEvery: 2.9, pullStrength: 0.019, hitsAir: true },
      { dps: 13, radius: 2.65, slow: 0.46, pullEvery: 2.6, pullStrength: 0.023, hitsAir: true },
    ],
    spec: {
      a: {
        id: 'a',
        name: 'Singularity Well',
        desc: 'Tactical vortex that pulls lighter foes back and cracks armor for 3 seconds so your towers shred them.',
        cost: 175,
        stats: {
          dps: 18,
          radius: 2.8,
          slow: 0.5,
          pullEvery: 2.5,
          pullStrength: 0.028,
          armorShred: 3.0,
          hitsAir: true,
        },
      },
      b: {
        id: 'b',
        name: 'Stasis Anchor',
        desc: 'Wide graviton field that briefly locks non-resistant ground and air foes in place every 5 seconds.',
        cost: 175,
        stats: {
          dps: 12,
          radius: 3.0,
          slow: 0.48,
          freezeEvery: 5.0,
          freezeTime: 1.25,
          pullEvery: 3.2,
          pullStrength: 0.018,
          hitsAir: true,
        },
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
  'rail',
  'gravity',
];

export const CREATURES: Record<CreatureType, CreatureDef> = {
  wisp: {
    id: 'wisp',
    name: 'Rift Wisp',
    hp: 18,
    speed: 2.28,
    anchor: 1,
    shards: 1,
    hit: 5,
    size: 1.0,
  },
  bat: {
    id: 'bat',
    name: 'Rift Bat',
    hp: 30,
    speed: 2.7,
    anchor: 1,
    shards: 2,
    hit: 6,
    size: 1.0,
    flying: true,
  },
  thornback: {
    id: 'thornback',
    name: 'Thornback',
    hp: 70,
    speed: 1.27,
    anchor: 2,
    shards: 3,
    hit: 12,
    size: 1.0,
    arrowResist: 0.25,
  },
  bramble: {
    id: 'bramble',
    name: 'Bramble Stalker',
    hp: 115,
    speed: 1.57,
    anchor: 3,
    shards: 4,
    hit: 16,
    size: 1.1,
    slowResist: 0.45,
  },
  splitter: {
    id: 'splitter',
    name: 'Rift Splitter',
    hp: 140,
    speed: 1.17,
    anchor: 2,
    shards: 5,
    hit: 14,
    size: 1.15,
    electricResist: 0.5,
    splitsInto: { type: 'wisp', count: 2 },
  },
  brute: {
    id: 'brute',
    name: 'Ironbark Brute',
    hp: 265,
    speed: 0.97,
    anchor: 4,
    shards: 10,
    hit: 21,
    size: 1.28,
    armor: 0.3,
    gravityResist: 0.85,
  },
  thornking: {
    id: 'thornking',
    name: 'The Thornking',
    hp: 820,
    speed: 0.75,
    anchor: 8,
    shards: 40,
    hit: 33,
    size: 1.5,
    isBoss: true,
    armor: 0.3,
    slowResist: 0.55,
    gravityResist: 0.9,
  },
  cinderimp: {
    id: 'cinderimp',
    name: 'Cinder Imp',
    hp: 46,
    speed: 2.77,
    anchor: 1,
    shards: 2,
    hit: 8,
    size: 0.96,
    slowResist: 0.85,
    fireResist: 0.65,
  },
  shieldbearer: {
    id: 'shieldbearer',
    name: 'Shieldbearer',
    hp: 175,
    speed: 1.04,
    anchor: 3,
    shards: 7,
    hit: 18,
    size: 1.18,
    armor: 0.5,
    arrowResist: 0.45,
    gravityResist: 0.5,
  },
  shrieker: {
    id: 'shrieker',
    name: 'Rift Shrieker',
    hp: 112,
    speed: 1.57,
    anchor: 2,
    shards: 6,
    hit: 12,
    size: 1.05,
    flying: true,
    armor: 0.4,
    gravityResist: 0.7,
  },
  weaver: {
    id: 'weaver',
    name: 'Forge Weaver',
    hp: 165,
    speed: 1.19,
    anchor: 3,
    shards: 8,
    hit: 14,
    size: 1.15,
    armor: 0.2,
    fireResist: 0.6,
    electricResist: 0.45,
  },
  ironwarden: {
    id: 'ironwarden',
    name: 'The Iron Warden',
    hp: 1280,
    speed: 0.65,
    anchor: 10,
    shards: 65,
    hit: 44,
    size: 1.65,
    isBoss: true,
    armor: 0.5,
    slowResist: 0.65,
    gravityResist: 0.95,
    fireResist: 0.5,
  },
  galewraith: {
    id: 'galewraith',
    name: 'Gale Wraith',
    hp: 165,
    speed: 1.57,
    anchor: 2,
    shards: 8,
    hit: 14,
    size: 1.08,
    armor: 0.15,
    arrowResist: 0.25,
    electricResist: 0.5,
    gravityResist: 0.9,
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
    dmg: 55,
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
          'You have four defenses ready to deploy. Place Archer Towers and Frost Totems on any open ground beside the trail. Drop Spike Pits and Stone Golems anywhere along the dirt path to hold the line.',
        captions: [
          'Four defenses ready: place Archer Towers and Frost Totems on any open ground beside the trail.',
          'Drop Spike Pits and Stone Golems anywhere along the dirt path to hold the line.',
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
  waveEvery: 8,
  anchor: 20,
  minWaves: 5,
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
  freePlacement: true,
  noBuildZones: [
    // Large mossy boulders on open grass
    { u: 0.625, v: 0.08, r: 0.052, label: 'Boulder' },
    { u: 0.555, v: 0.345, r: 0.038, label: 'Boulder' },
    { u: 0.68, v: 0.575, r: 0.045, label: 'Boulder' },
    { u: 0.155, v: 0.64, r: 0.042, label: 'Boulder' },
  ],
  noBuildPolys: [
    // Far-right dense pine treeline beyond the river
    { points: [[0.82, 0.0], [1.0, 0.0], [1.0, 1.0], [0.80, 1.0], [0.84, 0.55]], label: 'Dense forest' },
    // Top-left dark rift cliff & purple pines
    { points: [[0.0, 0.0], [0.34, 0.0], [0.34, 0.18], [0.16, 0.36], [0.0, 0.42]], label: 'Rift cliff' },
    // Bottom-left dense trees
    { points: [[0.0, 0.56], [0.14, 0.72], [0.25, 0.92], [0.25, 1.0], [0.0, 1.0]], label: 'Dense forest' },
  ],
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
        { type: 'wisp', count: 10, gap: 1.45 },
        { type: 'thornback', count: 4, gap: 3.6, delay: 7.5 },
      ],
    },
    {
      hp: 1.25,
      groups: [
        { type: 'thornback', count: 7, gap: 3.1 },
        { type: 'wisp', count: 12, gap: 1.05, delay: 8.5 },
      ],
    },
    {
      hp: 1.6,
      groups: [
        { type: 'wisp', count: 16, gap: 0.82 },
        { type: 'thornback', count: 9, gap: 2.6, delay: 5.5 },
        { type: 'wisp', count: 8, gap: 0.75, delay: 16 },
      ],
    },
    {
      hp: 2.0,
      groups: [
        { type: 'thornback', count: 12, gap: 2.3 },
        { type: 'wisp', count: 18, gap: 0.78, delay: 6 },
        { type: 'thornback', count: 6, gap: 2.1, delay: 18 },
      ],
    },
    {
      hp: 2.45,
      groups: [
        { type: 'thornback', count: 16, gap: 1.95 },
        { type: 'wisp', count: 20, gap: 0.75, delay: 4 },
        { type: 'wisp', count: 12, gap: 0.55, delay: 22 },
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
  waveEvery: 8,
  anchor: 20,
  minWaves: 5,
  bonusSurgeWaves: 3,
  mastery: {
    window: 11,
    need: 10,
  },
  endless: {
    hpStep: 0.14,
    countStep: 0.14,
  },
  finalBoost: 1.25,
  hasWalkthrough: false,
  freePlacement: true,
  noBuildZones: [
    { u: 0.70, v: 0.07, r: 0.08, label: 'Bramble thicket' },
  ],
  noBuildPolys: [
    // Left & bottom-left thick brambles and pines
    { points: [[0.0, 0.0], [0.13, 0.0], [0.13, 0.60], [0.27, 0.84], [0.27, 1.0], [0.0, 1.0]], label: 'Bramble thicket' },
    // Top treeline & upper-right brambles
    { points: [[0.14, 0.0], [0.84, 0.0], [0.76, 0.16], [0.58, 0.18], [0.56, 0.10], [0.14, 0.10]], label: 'Dense forest' },
    // Right pines & brambles
    { points: [[0.84, 0.12], [1.0, 0.08], [1.0, 1.0], [0.87, 0.64], [0.80, 0.42]], label: 'Bramble thicket' },
    // Bottom trees beside river
    { points: [[0.43, 0.78], [0.68, 0.80], [0.74, 1.0], [0.40, 1.0]], label: 'Dense forest' },
  ],
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
        { type: 'wisp', count: 12, gap: 1.25 },
        { type: 'thornback', count: 5, gap: 3.1, delay: 6 },
      ],
    },
    {
      hp: 1.18,
      groups: [
        { type: 'bramble', count: 5, gap: 3.1 },
        { type: 'wisp', count: 14, gap: 0.85, delay: 5 },
        { type: 'thornback', count: 5, gap: 2.9, delay: 11 },
      ],
    },
    {
      hp: 1.4,
      groups: [
        { type: 'wisp', count: 18, gap: 0.72 },
        { type: 'bramble', count: 7, gap: 2.5, delay: 4.5 },
        { type: 'thornback', count: 7, gap: 2.5, delay: 10.5 },
      ],
    },
    {
      hp: 1.65,
      groups: [
        { type: 'bramble', count: 9, gap: 2.15 },
        { type: 'thornback', count: 10, gap: 2.2, delay: 4 },
        { type: 'wisp', count: 18, gap: 0.7, delay: 10 },
      ],
    },
    {
      hp: 1.95,
      groups: [
        { type: 'bramble', count: 12, gap: 1.85 },
        { type: 'wisp', count: 22, gap: 0.62, delay: 4 },
        { type: 'thornback', count: 11, gap: 1.95, delay: 9.5 },
      ],
    },
    {
      hp: 2.25,
      groups: [
        { type: 'bramble', count: 14, gap: 1.7 },
        { type: 'thornback', count: 13, gap: 1.8, delay: 4 },
        { type: 'wisp', count: 24, gap: 0.55, delay: 9 },
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
  waveEvery: 8,
  anchor: 20,
  minWaves: 5,
  bonusSurgeWaves: 3,
  mastery: {
    window: 11,
    need: 10,
  },
  endless: {
    hpStep: 0.15,
    countStep: 0.14,
  },
  finalBoost: 1.25,
  hasWalkthrough: false,
  freePlacement: true,
  noBuildZones: [],
  noBuildPolys: [
    // Sky, distant mountains, and upper treeline
    { points: [[0.0, 0.0], [1.0, 0.0], [1.0, 0.44], [0.75, 0.42], [0.73, 0.20], [0.42, 0.18], [0.0, 0.16]], label: 'Deep gorge' },
    // Canyon river chasm above the stone arch bridge
    { points: [[0.56, 0.18], [0.74, 0.18], [0.72, 0.45], [0.56, 0.45]], label: 'Deep gorge' },
    // Canyon river chasm below the stone arch bridge
    { points: [[0.53, 0.56], [0.72, 0.56], [0.66, 1.0], [0.48, 1.0]], label: 'Deep gorge' },
    // Left and bottom-left dense pine forest
    { points: [[0.0, 0.16], [0.15, 0.20], [0.15, 0.66], [0.24, 0.84], [0.48, 0.86], [0.48, 1.0], [0.0, 1.0]], label: 'Dense forest' },
  ],
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
        { type: 'bat', count: 10, gap: 1.2 },
        { type: 'thornback', count: 5, gap: 3.0, delay: 6.5 },
      ],
    },
    {
      hp: 1.18,
      groups: [
        { type: 'bat', count: 14, gap: 0.9 },
        { type: 'bramble', count: 5, gap: 2.9, delay: 5.5 },
        { type: 'wisp', count: 10, gap: 0.85, delay: 11 },
      ],
    },
    {
      hp: 1.4,
      groups: [
        { type: 'wisp', count: 16, gap: 0.72 },
        { type: 'bat', count: 16, gap: 0.78, delay: 4.5 },
        { type: 'bramble', count: 7, gap: 2.4, delay: 10 },
      ],
    },
    {
      hp: 1.66,
      groups: [
        { type: 'bramble', count: 9, gap: 2.1 },
        { type: 'bat', count: 18, gap: 0.7, delay: 4 },
        { type: 'thornback', count: 9, gap: 2.1, delay: 9.5 },
      ],
    },
    {
      hp: 1.96,
      groups: [
        { type: 'bat', count: 22, gap: 0.62 },
        { type: 'bramble', count: 11, gap: 1.9, delay: 4.5 },
        { type: 'thornback', count: 11, gap: 1.9, delay: 10.5 },
        { type: 'wisp', count: 16, gap: 0.6, delay: 16 },
      ],
    },
    {
      hp: 2.25,
      groups: [
        { type: 'bat', count: 26, gap: 0.56 },
        { type: 'bramble', count: 12, gap: 1.75, delay: 4 },
        { type: 'thornback', count: 12, gap: 1.8, delay: 10 },
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
  { w: 'fog', kind: 'real', options: ['fig', 'fug'], es: 'niebla' },
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
  waveEvery: 8,
  anchor: 20,
  minWaves: 6,
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
  freePlacement: true,
  noBuildZones: [],
  noBuildPolys: [
    // Tall ruined sanctuary back walls
    { points: [[0.42, 0.05], [0.74, 0.04], [0.89, 0.34], [0.83, 0.52], [0.74, 0.39], [0.62, 0.24], [0.42, 0.35]], label: 'Ruin wall' },
    // Central ruined archway and broken wall
    { points: [[0.56, 0.48], [0.65, 0.48], [0.63, 0.66], [0.45, 0.88], [0.41, 0.79]], label: 'Ruin wall' },
    // Dense pine forest perimeter (left, right, top)
    { points: [[0.0, 0.0], [0.11, 0.0], [0.11, 1.0], [0.0, 1.0]], label: 'Dense forest' },
    { points: [[0.89, 0.0], [1.0, 0.0], [1.0, 1.0], [0.89, 1.0]], label: 'Dense forest' },
    { points: [[0.11, 0.0], [0.89, 0.0], [0.89, 0.11], [0.11, 0.11]], label: 'Dense forest' },
  ],
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
        { type: 'splitter', count: 4, gap: 3.4 },
        { type: 'bat', count: 10, gap: 1.1, delay: 5.5 },
      ],
    },
    {
      hp: 1.16,
      groups: [
        { type: 'splitter', count: 5, gap: 2.9 },
        { type: 'bramble', count: 5, gap: 2.7, delay: 5 },
        { type: 'bat', count: 11, gap: 0.95, delay: 9.5 },
      ],
    },
    {
      hp: 1.36,
      groups: [
        { type: 'splitter', count: 7, gap: 2.5 },
        { type: 'bat', count: 14, gap: 0.8, delay: 4.5 },
        { type: 'bramble', count: 7, gap: 2.3, delay: 10 },
      ],
    },
    {
      hp: 1.6,
      groups: [
        { type: 'splitter', count: 9, gap: 2.2 },
        { type: 'bramble', count: 9, gap: 2.05, delay: 4.5 },
        { type: 'bat', count: 16, gap: 0.72, delay: 10 },
      ],
    },
    {
      hp: 1.88,
      groups: [
        { type: 'splitter', count: 11, gap: 1.95 },
        { type: 'bat', count: 19, gap: 0.65, delay: 4 },
        { type: 'bramble', count: 10, gap: 1.85, delay: 9.5 },
      ],
    },
    {
      hp: 2.18,
      groups: [
        { type: 'splitter', count: 13, gap: 1.8 },
        { type: 'bramble', count: 12, gap: 1.75, delay: 3.5 },
        { type: 'bat', count: 22, gap: 0.6, delay: 9 },
        { type: 'wisp', count: 18, gap: 0.55, delay: 15 },
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
  waveEvery: 8,
  anchor: 20,
  minWaves: 6,
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
  freePlacement: true,
  noBuildZones: [],
  noBuildPolys: [
    // Giant gnarled thorn-tree trunk at top-center
    { points: [[0.26, 0.0], [0.54, 0.0], [0.51, 0.31], [0.30, 0.31]], label: 'Ancient trunk' },
    // Central dark thorn chasm beneath the root bridge
    { points: [[0.36, 0.35], [0.54, 0.35], [0.61, 0.64], [0.50, 0.88], [0.42, 0.72], [0.34, 0.56]], label: 'Thorn chasm' },
    // Massive thorn arch top-right
    { points: [[0.79, 0.0], [1.0, 0.0], [1.0, 0.50], [0.85, 0.34]], label: 'Thorn thicket' },
    // Left cliff and crystal rim
    { points: [[0.0, 0.42], [0.13, 0.46], [0.16, 0.84], [0.38, 0.86], [0.42, 1.0], [0.0, 1.0]], label: 'Thorn cliff' },
    // Right bramble tangle above citadel
    { points: [[0.70, 0.55], [0.86, 0.50], [0.86, 0.66], [0.72, 0.68]], label: 'Thorn thicket' },
  ],
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
        { type: 'brute', count: 3, gap: 4.2 },
        { type: 'bat', count: 10, gap: 1.0, delay: 4 },
        { type: 'splitter', count: 4, gap: 3.1, delay: 10 },
      ],
    },
    {
      hp: 1.15,
      groups: [
        { type: 'brute', count: 4, gap: 3.5 },
        { type: 'splitter', count: 6, gap: 2.6, delay: 5 },
        { type: 'bramble', count: 6, gap: 2.3, delay: 10.5 },
      ],
    },
    {
      hp: 1.32,
      groups: [
        { type: 'brute', count: 5, gap: 3.1 },
        { type: 'bat', count: 14, gap: 0.82, delay: 4 },
        { type: 'splitter', count: 6, gap: 2.4, delay: 9.5 },
        { type: 'bramble', count: 6, gap: 2.1, delay: 14.5 },
      ],
    },
    {
      hp: 1.5,
      groups: [
        { type: 'thornking', count: 1, gap: 1.0, delay: 4.5 },
        { type: 'brute', count: 5, gap: 3.1, delay: 1 },
        { type: 'bat', count: 15, gap: 0.78, delay: 7 },
        { type: 'splitter', count: 5, gap: 2.4, delay: 13.5 },
      ],
    },
    {
      hp: 1.75,
      groups: [
        { type: 'brute', count: 7, gap: 2.65 },
        { type: 'splitter', count: 8, gap: 2.1, delay: 4.5 },
        { type: 'bramble', count: 8, gap: 1.95, delay: 9.5 },
        { type: 'bat', count: 18, gap: 0.68, delay: 14 },
      ],
    },
    {
      hp: 2.02,
      groups: [
        { type: 'thornking', count: 1, gap: 1.0, delay: 2.5 },
        { type: 'brute', count: 8, gap: 2.5, delay: 1 },
        { type: 'splitter', count: 9, gap: 1.95, delay: 6.5 },
        { type: 'bramble', count: 8, gap: 1.85, delay: 12 },
        { type: 'bat', count: 16, gap: 0.66, delay: 16.5 },
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
  nextLevelId: 'w2-l2',
  vowels: ['sh', 'ch'],
  defenders: ['archer', 'spike', 'golem', 'frost', 'ember', 'tesla'],
  runeRate: 0.28,
  startCrystals: 225,
  waveEvery: 8,
  anchor: 20,
  minWaves: 6,
  bonusSurgeWaves: 3,
  mastery: {
    window: 11,
    need: 10,
  },
  endless: {
    hpStep: 0.14,
    countStep: 0.14,
  },
  finalBoost: 1.25,
  hasWalkthrough: false,
  freePlacement: true,
  noBuildZones: [],
  noBuildPolys: [
    // Molten lava lake and volcanic cliffs along right edge
    { points: [[0.71, 0.0], [1.0, 0.0], [1.0, 0.66], [0.86, 0.52], [0.81, 0.24], [0.69, 0.13]], label: 'Molten lava' },
    // Top-left rift cliffs and upper foundry skyline
    { points: [[0.0, 0.0], [0.42, 0.0], [0.36, 0.15], [0.18, 0.38], [0.0, 0.54]], label: 'Volcanic cliff' },
    { points: [[0.40, 0.0], [0.73, 0.0], [0.68, 0.12], [0.40, 0.12]], label: 'Factory cliff' },
    // Bottom-left molten lava gorge
    { points: [[0.0, 0.56], [0.15, 0.68], [0.27, 0.90], [0.24, 1.0], [0.0, 1.0]], label: 'Molten lava' },
    // Anchor camp tents bottom-right
    { points: [[0.75, 0.70], [1.0, 0.66], [1.0, 1.0], [0.70, 1.0]], label: 'Anchor camp' },
  ],
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
        { type: 'cinderimp', count: 12, gap: 0.78 },
        { type: 'bramble', count: 4, gap: 3.0, delay: 5.5 },
      ],
    },
    {
      hp: 1.15,
      groups: [
        { type: 'cinderimp', count: 16, gap: 0.65 },
        { type: 'bat', count: 10, gap: 0.95, delay: 5 },
        { type: 'bramble', count: 5, gap: 2.6, delay: 10.5 },
      ],
    },
    {
      hp: 1.35,
      groups: [
        { type: 'cinderimp', count: 20, gap: 0.56 },
        { type: 'splitter', count: 5, gap: 2.6, delay: 4.5 },
        { type: 'bat', count: 12, gap: 0.85, delay: 10.5 },
      ],
    },
    {
      hp: 1.58,
      groups: [
        { type: 'cinderimp', count: 24, gap: 0.5 },
        { type: 'brute', count: 3, gap: 3.3, delay: 4.5 },
        { type: 'splitter', count: 6, gap: 2.4, delay: 9.5 },
        { type: 'bramble', count: 6, gap: 2.1, delay: 14 },
      ],
    },
    {
      hp: 1.84,
      groups: [
        { type: 'cinderimp', count: 28, gap: 0.46 },
        { type: 'brute', count: 4, gap: 2.9, delay: 4 },
        { type: 'bat', count: 15, gap: 0.74, delay: 8.5 },
        { type: 'splitter', count: 7, gap: 2.2, delay: 13.5 },
      ],
    },
    {
      hp: 2.12,
      groups: [
        { type: 'cinderimp', count: 32, gap: 0.42 },
        { type: 'brute', count: 5, gap: 2.65, delay: 3.5 },
        { type: 'bat', count: 18, gap: 0.68, delay: 8.5 },
        { type: 'splitter', count: 8, gap: 2.0, delay: 13.5 },
      ],
    },
  ],
  realWords: W2_L1_REAL_WORDS,
  runes: W2_L1_RUNES,
  cutscenes: W2_L1_CUTSCENES,
};

// ---------------------------------------------------------------------------
// World 2 · Level 2: Smelter Causeway (th, wh, -ck Digraphs + Shieldbearer + Rail Turret)
// ---------------------------------------------------------------------------
export const W2_L2_REAL_WORDS: WordEntry[] = [
  // th digraph (unvoiced & voiced, initial & final)
  { w: 'thin', kind: 'real', pattern: 'th', tiles: ['th', 'i', 'n'], targetTileIdx: 0, options: ['tin', 'fin'], es: 'delgado' },
  { w: 'path', kind: 'real', pattern: 'th', tiles: ['p', 'a', 'th'], targetTileIdx: 2, options: ['pat', 'pan'], es: 'sendero' },
  { w: 'bath', kind: 'real', pattern: 'th', tiles: ['b', 'a', 'th'], targetTileIdx: 2, options: ['bat', 'bag'], es: 'baño' },
  { w: 'math', kind: 'real', pattern: 'th', tiles: ['m', 'a', 'th'], targetTileIdx: 2, options: ['mat', 'map'], es: 'matemáticas' },
  { w: 'moth', kind: 'real', pattern: 'th', tiles: ['m', 'o', 'th'], targetTileIdx: 2, options: ['mop', 'lot'], es: 'polilla' },
  { w: 'with', kind: 'real', pattern: 'th', tiles: ['w', 'i', 'th'], targetTileIdx: 2, options: ['win', 'wig'], es: 'con' },
  { w: 'that', kind: 'real', pattern: 'th', tiles: ['th', 'a', 't'], targetTileIdx: 0, options: ['hat', 'cat'], es: 'ese' },
  { w: 'then', kind: 'real', pattern: 'th', tiles: ['th', 'e', 'n'], targetTileIdx: 0, options: ['ten', 'den'], es: 'entonces' },
  // wh digraph
  { w: 'whip', kind: 'real', pattern: 'wh', tiles: ['wh', 'i', 'p'], targetTileIdx: 0, options: ['rip', 'tip'], es: 'látigo' },
  { w: 'when', kind: 'real', pattern: 'wh', tiles: ['wh', 'e', 'n'], targetTileIdx: 0, options: ['hen', 'pen'], es: 'cuándo' },
  { w: 'whiz', kind: 'real', pattern: 'wh', tiles: ['wh', 'i', 'z'], targetTileIdx: 0, options: ['zip', 'win'], es: 'genio' },
  { w: 'whim', kind: 'real', pattern: 'wh', tiles: ['wh', 'i', 'm'], targetTileIdx: 0, options: ['rim', 'him'], es: 'capricho' },
  { w: 'wham', kind: 'real', pattern: 'wh', tiles: ['wh', 'a', 'm'], targetTileIdx: 0, options: ['jam', 'ram'], es: 'golpe fuerte' },
  { w: 'which', kind: 'real', pattern: 'wh', tiles: ['wh', 'i', 'ch'], targetTileIdx: 0, options: ['rich', 'wish'], es: 'cuál' },
  // -ck digraph
  { w: 'lock', kind: 'real', pattern: 'ck', tiles: ['l', 'o', 'ck'], targetTileIdx: 2, options: ['log', 'lot'], es: 'cerradura' },
  { w: 'rock', kind: 'real', pattern: 'ck', tiles: ['r', 'o', 'ck'], targetTileIdx: 2, options: ['rod', 'rot'], es: 'roca', cognate: true },
  { w: 'dock', kind: 'real', pattern: 'ck', tiles: ['d', 'o', 'ck'], targetTileIdx: 2, options: ['dot', 'dog'], es: 'muelle' },
  { w: 'back', kind: 'real', pattern: 'ck', tiles: ['b', 'a', 'ck'], targetTileIdx: 2, options: ['bag', 'bat'], es: 'espalda' },
  { w: 'deck', kind: 'real', pattern: 'ck', tiles: ['d', 'e', 'ck'], targetTileIdx: 2, options: ['den', 'red'], es: 'cubierta' },
  { w: 'kick', kind: 'real', pattern: 'ck', tiles: ['k', 'i', 'ck'], targetTileIdx: 2, options: ['kid', 'kit'], es: 'patear' },
  { w: 'luck', kind: 'real', pattern: 'ck', tiles: ['l', 'u', 'ck'], targetTileIdx: 2, options: ['lug', 'rug'], es: 'suerte' },
  { w: 'pack', kind: 'real', pattern: 'ck', tiles: ['p', 'a', 'ck'], targetTileIdx: 2, options: ['pan', 'pad'], es: 'paquete', cognate: true },
];

export const W2_L2_RUNES: WordEntry[] = [
  { w: 'thab', kind: 'rune', pattern: 'th', tiles: ['th', 'a', 'b'], targetTileIdx: 0, options: ['tab', 'cab'], azureRef: 'thabb' },
  { w: 'thip', kind: 'rune', pattern: 'th', tiles: ['th', 'i', 'p'], targetTileIdx: 0, options: ['tip', 'ship'], azureRef: 'thipp' },
  { w: 'thog', kind: 'rune', pattern: 'th', tiles: ['th', 'o', 'g'], targetTileIdx: 0, options: ['fog', 'log'], azureRef: 'thogg' },
  { w: 'whep', kind: 'rune', pattern: 'wh', tiles: ['wh', 'e', 'p'], targetTileIdx: 0, options: ['bep', 'web'], azureRef: 'whepp' },
  { w: 'whib', kind: 'rune', pattern: 'wh', tiles: ['wh', 'i', 'b'], targetTileIdx: 0, options: ['kib', 'rib'], azureRef: 'whibb' },
  { w: 'whum', kind: 'rune', pattern: 'wh', tiles: ['wh', 'u', 'm'], targetTileIdx: 0, options: ['hum', 'sum'], azureRef: 'whumm' },
  { w: 'teck', kind: 'rune', pattern: 'ck', tiles: ['t', 'e', 'ck'], targetTileIdx: 2, options: ['ten', 'teg'], azureRef: 'teck' },
  { w: 'bick', kind: 'rune', pattern: 'ck', tiles: ['b', 'i', 'ck'], targetTileIdx: 2, options: ['big', 'bit'], azureRef: 'bick' },
  { w: 'zock', kind: 'rune', pattern: 'ck', tiles: ['z', 'o', 'ck'], targetTileIdx: 2, options: ['zot', 'zod'], azureRef: 'zock' },
];

export const W2_L2_CUTSCENES: Record<CutsceneId, CutsceneScript> = {
  opening: {
    id: 'opening',
    title: 'World 2, Level 2: Smelter Causeway',
    subtitle: 'Opening Cutscene',
    beats: [
      {
        id: 'w2-l02-open-v1-1',
        image: '/src/assets/images/cutscene_w2_l2_opening_1795606912950.jpg',
        motion: 'zoom',
        durationMs: 10000,
        speaker: 'The Rift Warden',
        voiceText:
          'Welcome to Smelter Causeway, Runner. Heavily armored Shieldbearers are marching across the iron viaduct, and their forged shields block almost half of normal damage.',
        captions: [
          'Armored Shieldbearers are marching across Smelter Causeway.',
          'Their forged iron shields block nearly half of standard tower hits.',
        ],
        accent: 'violet',
        voiceStyle:
          'Steady, focused veteran guardian briefing a teenage partner above a volcanic iron bridge.',
      },
      {
        id: 'w2-l02-open-v1-2',
        image: '/src/assets/images/cutscene_w2_l2_opening_1795606912950.jpg',
        motion: 'pan',
        durationMs: 11000,
        speaker: 'The Rift Warden',
        voiceText:
          'Our foundry engineers finished the Rail Turret just in time. Its electromagnetic rounds punch straight through heavy armor. Use the Loadout button below to pick your six active defenders, and lock th, wh, and ck in the Forge.',
        captions: [
          'New tower unlocked: Rail Turret pierces heavy enemy armor on ground and air.',
          'Use the Loadout picker below to customize 6 active towers, and seal th, wh, and -ck.',
        ],
        accent: 'cyan',
        voiceStyle:
          'Confident, tactical mentor giving clear, direct battlefield guidance.',
      },
    ],
  },
  victory: {
    id: 'victory',
    title: 'Smelter Causeway: Rift Sealed',
    subtitle: 'Victory Cutscene',
    beats: [
      {
        id: 'w2-l02-vic-v1-1',
        image: '/src/assets/images/cutscene_w2_l2_victory_1795606914624.jpg',
        motion: 'lift',
        durationMs: 10000,
        speaker: 'The Rift Warden',
        voiceText:
          'Smelter Causeway is clear! Your Rail Turrets punched straight through the Shieldbearer column, and your clean th, wh, and ck reads locked the viaduct breach down tight.',
        captions: [
          'Smelter Causeway is clear! The armored Shieldbearer column is broken.',
          'Your sharp th, wh, and -ck reads sealed the viaduct Rift.',
        ],
        accent: 'cyan',
        voiceStyle:
          'Warm, proud veteran guardian celebrating a strong victory on the lava viaduct.',
      },
      {
        id: 'w2-l02-vic-v1-2',
        image: '/src/assets/images/cutscene_w2_l2_victory_1795606914624.jpg',
        motion: 'zoom',
        durationMs: 10000,
        speaker: 'The Rift Warden',
        voiceText:
          'Look past the smokestacks ahead. The high iron bridges of Ironrift Crossing are swarming with armored flying Shriekers. Keep those Rail Turrets and Tesla Spires tuned up for the skies.',
        captions: [
          'Ahead rise the high foundry bridges of Ironrift Crossing.',
          'Next stage ahead: Ironrift Crossing (armored Rift Shriekers + L and R blends).',
        ],
        accent: 'violet',
        voiceStyle:
          'Steady, watchful guardian looking ahead toward the towering foundry stacks.',
      },
    ],
  },
  defeat: {
    id: 'defeat',
    title: 'Causeway Breached',
    subtitle: 'Defeat Cutscene',
    beats: [
      {
        id: 'w2-l02-def-v1-1',
        image: '/src/assets/images/cutscene_defeat_breach_1795457392970.jpg',
        motion: 'zoom',
        durationMs: 9500,
        speaker: 'The Rift Warden',
        voiceText:
          'The Shieldbearers shrugged off light fire and pushed through to the Anchor. Shake it off, Runner. Place a Rail Turret inside the center viaduct bend and upgrade it to Piercing Rail or Shatter Coil next run.',
        captions: [
          'The armored Shieldbearers broke through to the Anchor.',
          'Tip: place a Rail Turret inside the center bend to punch through armor, then try again.',
        ],
        accent: 'crimson',
        voiceStyle:
          'Calm, encouraging mentor offering a clear tactical tip with zero blame.',
      },
    ],
  },
};

export const W2_LEVEL2: LevelConfig = {
  id: 'w2-l2',
  num: 2,
  worldId: 'w2',
  worldName: 'World 2: The Sunken Foundry',
  name: 'Smelter Causeway',
  headline: 'Break the Armor at Smelter Causeway',
  description:
    'Heavily armored Shieldbearers march across the iron viaduct while blocking nearly half of normal tower damage. Deploy the new electromagnetic Rail Turret and customize your 6-tower Loadout while mastering th, wh, and -ck digraphs.',
  enemiesSummary: 'Shieldbearers, Cinder Imps, and Bramble Stalkers',
  wordsSummary: 'th, wh, and -ck digraphs, plus runes',
  rewardSummary: 'Rail Turret + Side Loadout Selector unlocked',
  nextLevelId: 'w2-l3',
  vowels: ['th', 'wh', 'ck'],
  defenders: ['archer', 'spike', 'golem', 'frost', 'ember', 'tesla', 'rail'],
  runeRate: 0.28,
  startCrystals: 245,
  waveEvery: 8,
  anchor: 20,
  minWaves: 6,
  bonusSurgeWaves: 3,
  mastery: {
    window: 8,
    need: 7,
  },
  endless: {
    hpStep: 0.15,
    countStep: 0.14,
  },
  finalBoost: 1.25,
  hasWalkthrough: false,
  freePlacement: true,
  noBuildZones: [],
  noBuildPolys: [
    // Upper molten lava chasm & cross-bridge beneath the viaduct
    { points: [[0.39, 0.34], [0.64, 0.28], [0.65, 0.42], [0.43, 0.48]], label: 'Molten lava' },
    // Lower molten lava basin, bridge pillars & smelter pipes
    { points: [[0.48, 0.50], [0.70, 0.44], [0.84, 0.64], [0.50, 0.72]], label: 'Molten lava' },
    // Bottom molten lava river under the lower arch bridge
    { points: [[0.58, 0.76], [0.74, 0.76], [0.74, 1.0], [0.56, 1.0]], label: 'Molten lava' },
    // Far-right lava lake and volcanic cliff wall
    { points: [[0.79, 0.0], [1.0, 0.0], [1.0, 0.66], [0.85, 0.46], [0.80, 0.20], [0.70, 0.12]], label: 'Molten lava' },
    // Top-left rift cliff, brass smelter pipes, and background skyline
    { points: [[0.0, 0.0], [0.42, 0.0], [0.42, 0.20], [0.22, 0.32], [0.16, 0.50], [0.0, 0.54]], label: 'Foundry cliff' },
    { points: [[0.42, 0.0], [0.76, 0.0], [0.70, 0.12], [0.42, 0.12]], label: 'Foundry cliff' },
  ],
  backdropImage: '/src/assets/images/cutscene_w2_l2_opening_1795606912950.jpg',
  pathUv: [
    [0.215, 0.270],
    [0.285, 0.335],
    [0.385, 0.340],
    [0.495, 0.275],
    [0.585, 0.245],
    [0.665, 0.275],
    [0.700, 0.350],
    [0.660, 0.425],
    [0.560, 0.480],
    [0.440, 0.525],
    [0.345, 0.575],
    [0.310, 0.655],
    [0.350, 0.740],
    [0.440, 0.785],
    [0.545, 0.760],
    [0.640, 0.715],
    [0.730, 0.720],
    [0.810, 0.765],
  ],
  riverUv: [
    [0.73, 0.13],
    [0.85, 0.22],
    [0.91, 0.36],
    [0.91, 0.50],
    [0.81, 0.59],
    [0.66, 0.88],
  ],
  riftUv: [0.205, 0.235],
  campUv: [0.900, 0.785],
  wardenUv: [0.805, 0.785],
  pads: [
    { id: 'sc_t1', kind: 'tower', u: 0.495, v: 0.190 },
    { id: 'sc_t2', kind: 'tower', u: 0.628, v: 0.180 },
    { id: 'sc_t3', kind: 'tower', u: 0.728, v: 0.230 },
    { id: 'sc_t4', kind: 'tower', u: 0.758, v: 0.418 },
    { id: 'sc_t5', kind: 'tower', u: 0.287, v: 0.520 },
    { id: 'sc_t6', kind: 'tower', u: 0.223, v: 0.663 },
    { id: 'sc_t7', kind: 'tower', u: 0.398, v: 0.655 },
    { id: 'sc_t8', kind: 'tower', u: 0.256, v: 0.805 },
    { id: 'sc_t9', kind: 'tower', u: 0.366, v: 0.875 },
    { id: 'sc_t10', kind: 'tower', u: 0.515, v: 0.883 },
    { id: 'sc_r1', kind: 'trail', u: 0.495, v: 0.275 },
    { id: 'sc_r2', kind: 'trail', u: 0.560, v: 0.480 },
    { id: 'sc_r3', kind: 'trail', u: 0.310, v: 0.655 },
    { id: 'sc_r4', kind: 'trail', u: 0.640, v: 0.715 },
  ],
  waves: [
    {
      hp: 1.0,
      groups: [
        { type: 'shieldbearer', count: 5, gap: 3.1 },
        { type: 'cinderimp', count: 10, gap: 0.82, delay: 5 },
      ],
    },
    {
      hp: 1.15,
      groups: [
        { type: 'shieldbearer', count: 7, gap: 2.7 },
        { type: 'cinderimp', count: 14, gap: 0.68, delay: 4 },
        { type: 'bat', count: 10, gap: 0.95, delay: 9.5 },
      ],
    },
    {
      hp: 1.35,
      groups: [
        { type: 'shieldbearer', count: 9, gap: 2.35 },
        { type: 'bramble', count: 6, gap: 2.4, delay: 4.5 },
        { type: 'cinderimp', count: 16, gap: 0.58, delay: 10 },
      ],
    },
    {
      hp: 1.58,
      groups: [
        { type: 'shieldbearer', count: 11, gap: 2.1 },
        { type: 'splitter', count: 5, gap: 2.6, delay: 4 },
        { type: 'bat', count: 13, gap: 0.78, delay: 9 },
        { type: 'cinderimp', count: 18, gap: 0.52, delay: 13.5 },
      ],
    },
    {
      hp: 1.84,
      groups: [
        { type: 'shieldbearer', count: 13, gap: 1.9 },
        { type: 'brute', count: 3, gap: 3.1, delay: 4 },
        { type: 'cinderimp', count: 22, gap: 0.48, delay: 8.5 },
        { type: 'splitter', count: 6, gap: 2.25, delay: 13 },
      ],
    },
    {
      hp: 2.12,
      groups: [
        { type: 'shieldbearer', count: 15, gap: 1.75 },
        { type: 'brute', count: 4, gap: 2.8, delay: 3.5 },
        { type: 'bat', count: 16, gap: 0.7, delay: 8 },
        { type: 'cinderimp', count: 26, gap: 0.44, delay: 12.5 },
        { type: 'splitter', count: 7, gap: 2.1, delay: 16.5 },
      ],
    },
  ],
  realWords: W2_L2_REAL_WORDS,
  runes: W2_L2_RUNES,
  cutscenes: W2_L2_CUTSCENES,
};

export const W2_L3_REAL_WORDS: WordEntry[] = [
  // bl blend (6)
  { w: 'black', kind: 'real', pattern: 'bl', tiles: ['bl', 'a', 'ck'], targetTileIdx: 0, options: ['back', 'block'], es: 'negro' },
  { w: 'block', kind: 'real', pattern: 'bl', tiles: ['bl', 'o', 'ck'], targetTileIdx: 0, options: ['lock', 'black'], es: 'bloque', cognate: true },
  { w: 'blip', kind: 'real', pattern: 'bl', tiles: ['bl', 'i', 'p'], targetTileIdx: 0, options: ['lip', 'blob'], es: 'punto en el radar' },
  { w: 'blob', kind: 'real', pattern: 'bl', tiles: ['bl', 'o', 'b'], targetTileIdx: 0, options: ['bob', 'blot'], es: 'gota espesa' },
  { w: 'blot', kind: 'real', pattern: 'bl', tiles: ['bl', 'o', 't'], targetTileIdx: 0, options: ['lot', 'blob'], es: 'mancha' },
  { w: 'blush', kind: 'real', pattern: 'bl', tiles: ['bl', 'u', 'sh'], targetTileIdx: 0, options: ['gush', 'rush'], es: 'sonrojarse' },
  // cl blend (6)
  { w: 'clap', kind: 'real', pattern: 'cl', tiles: ['cl', 'a', 'p'], targetTileIdx: 0, options: ['cap', 'clip'], es: 'aplaudir' },
  { w: 'clip', kind: 'real', pattern: 'cl', tiles: ['cl', 'i', 'p'], targetTileIdx: 0, options: ['lip', 'clap'], es: 'sujetador', cognate: true },
  { w: 'clock', kind: 'real', pattern: 'cl', tiles: ['cl', 'o', 'ck'], targetTileIdx: 0, options: ['lock', 'clog'], es: 'reloj' },
  { w: 'club', kind: 'real', pattern: 'cl', tiles: ['cl', 'u', 'b'], targetTileIdx: 0, options: ['cub', 'clog'], es: 'club', cognate: true },
  { w: 'clam', kind: 'real', pattern: 'cl', tiles: ['cl', 'a', 'm'], targetTileIdx: 0, options: ['ram', 'clap'], es: 'almeja' },
  { w: 'clog', kind: 'real', pattern: 'cl', tiles: ['cl', 'o', 'g'], targetTileIdx: 0, options: ['log', 'clock'], es: 'atascar' },
  // fr blend (6)
  { w: 'frog', kind: 'real', pattern: 'fr', tiles: ['fr', 'o', 'g'], targetTileIdx: 0, options: ['fog', 'frock'], es: 'rana' },
  { w: 'fresh', kind: 'real', pattern: 'fr', tiles: ['fr', 'e', 'sh'], targetTileIdx: 0, options: ['mesh', 'fret'], es: 'fresco', cognate: true },
  { w: 'fret', kind: 'real', pattern: 'fr', tiles: ['fr', 'e', 't'], targetTileIdx: 0, options: ['met', 'frog'], es: 'preocuparse' },
  { w: 'frock', kind: 'real', pattern: 'fr', tiles: ['fr', 'o', 'ck'], targetTileIdx: 0, options: ['rock', 'frog'], es: 'túnica' },
  { w: 'frost', kind: 'real', pattern: 'fr', tiles: ['fr', 'o', 's', 't'], targetTileIdx: 0, options: ['rot', 'frog'], es: 'escarcha' },
  { w: 'frill', kind: 'real', pattern: 'fr', tiles: ['fr', 'i', 'll'], targetTileIdx: 0, options: ['fill', 'frog'], es: 'volante' },
  // gr blend (6)
  { w: 'grab', kind: 'real', pattern: 'gr', tiles: ['gr', 'a', 'b'], targetTileIdx: 0, options: ['gab', 'grub'], es: 'agarrar' },
  { w: 'grin', kind: 'real', pattern: 'gr', tiles: ['gr', 'i', 'n'], targetTileIdx: 0, options: ['fin', 'grip'], es: 'sonrisa amplia' },
  { w: 'grip', kind: 'real', pattern: 'gr', tiles: ['gr', 'i', 'p'], targetTileIdx: 0, options: ['rip', 'grin'], es: 'agarre' },
  { w: 'grit', kind: 'real', pattern: 'gr', tiles: ['gr', 'i', 't'], targetTileIdx: 0, options: ['bit', 'grid'], es: 'determinación' },
  { w: 'grub', kind: 'real', pattern: 'gr', tiles: ['gr', 'u', 'b'], targetTileIdx: 0, options: ['cub', 'grab'], es: 'larva' },
  { w: 'grid', kind: 'real', pattern: 'gr', tiles: ['gr', 'i', 'd'], targetTileIdx: 0, options: ['rid', 'grit'], es: 'red' },
];

export const W2_L3_RUNES: WordEntry[] = [
  { w: 'blap', kind: 'rune', pattern: 'bl', tiles: ['bl', 'a', 'p'], targetTileIdx: 0, options: ['bap', 'blip'], azureRef: 'blapp' },
  { w: 'bleg', kind: 'rune', pattern: 'bl', tiles: ['bl', 'e', 'g'], targetTileIdx: 0, options: ['beg', 'blug'], azureRef: 'blegg' },
  { w: 'clep', kind: 'rune', pattern: 'cl', tiles: ['cl', 'e', 'p'], targetTileIdx: 0, options: ['clap', 'clip'], azureRef: 'clepp' },
  { w: 'clug', kind: 'rune', pattern: 'cl', tiles: ['cl', 'u', 'g'], targetTileIdx: 0, options: ['clog', 'club'], azureRef: 'clugg' },
  { w: 'frab', kind: 'rune', pattern: 'fr', tiles: ['fr', 'a', 'b'], targetTileIdx: 0, options: ['fab', 'frib'], azureRef: 'frabb' },
  { w: 'frep', kind: 'rune', pattern: 'fr', tiles: ['fr', 'e', 'p'], targetTileIdx: 0, options: ['fret', 'frop'], azureRef: 'frepp' },
  { w: 'grem', kind: 'rune', pattern: 'gr', tiles: ['gr', 'e', 'm'], targetTileIdx: 0, options: ['grin', 'grub'], azureRef: 'gremm' },
  { w: 'grob', kind: 'rune', pattern: 'gr', tiles: ['gr', 'o', 'b'], targetTileIdx: 0, options: ['grab', 'grub'], azureRef: 'grahb' },
];

export const W2_L3_CUTSCENES: Record<CutsceneId, CutsceneScript> = {
  opening: {
    id: 'opening',
    title: 'WORLD 2 · LEVEL 3 · IRONRIFT CROSSING',
    subtitle: 'Armored Flyers Above the Molten Gorge',
    beats: [
      {
        id: 'w2-l03-open-v1-1',
        image: '/src/assets/images/cutscene_w2_l3_opening_1795608966519.jpg',
        motion: 'zoom',
        durationMs: 7400,
        speaker: 'THE RIFT WARDEN',
        voiceStyle: 'Focused, urgent, grounded veteran guardian warning a teenage recruit about armored airborne enemies.',
        voiceText:
          'Eyes up, Runner! Armored Rift Shriekers are diving straight across Ironrift Crossing. They fly right over Spike Pits and Stone Golems, and their steel plates shrug off light arrows.',
        captions: [
          'Armored Rift Shriekers dive straight across Ironrift Crossing.',
          'They fly over ground traps and deflect light arrows with steel plates.',
        ],
        accent: 'violet',
      },
      {
        id: 'w2-l03-open-v1-2',
        image: '/src/assets/images/cutscene_w2_l3_opening_1795608966519.jpg',
        motion: 'pan',
        durationMs: 7400,
        speaker: 'THE RIFT WARDEN',
        voiceStyle: 'Steady, tactical, encouraging mentor preparing a recruit for a combined air and ground defense.',
        voiceText:
          'Pair Rail Turrets and Tesla Spires across the central island to lock down the skies. Decode clean b l, c l, f r, and g r blends in the Rune Forge to unlock the Final Wave.',
        captions: [
          'Pair Rail Turrets and Tesla Spires on the center island to lock the skies.',
          'Seal the bl, cl, fr, and gr locks in the Forge to open the Final Wave.',
        ],
        accent: 'cyan',
      },
    ],
  },
  victory: {
    id: 'victory',
    title: 'IRONRIFT CROSSING SECURED',
    subtitle: 'Skies Cleared Across the Foundry Gorge',
    beats: [
      {
        id: 'w2-l03-vic-v1-1',
        image: '/src/assets/images/cutscene_w2_l3_victory_1795608966935.jpg',
        motion: 'lift',
        durationMs: 7200,
        speaker: 'THE RIFT WARDEN',
        voiceStyle: 'Warm, proud, grounded mentor celebrating a clean anti-air victory.',
        voiceText:
          'Ironrift Crossing is clear! The armored Shrieker flock broke apart over the gorge, and your steady blend reads kept our air grid locked tight.',
        captions: [
          'Ironrift Crossing is clear! The armored Shriekers broke above the gorge.',
          'Your clean bl, cl, fr, and gr reads kept the anti-air grid locked.',
        ],
        accent: 'cyan',
      },
      {
        id: 'w2-l03-vic-v1-2',
        image: '/src/assets/images/cutscene_w2_l3_victory_1795608966935.jpg',
        motion: 'zoom',
        durationMs: 7000,
        speaker: 'THE RIFT WARDEN',
        voiceStyle: 'Calm, resolute veteran looking across the bridge toward the fortress ahead.',
        voiceText:
          'Ahead stands Crucible Bastion, the last fortified gate before the Furnace Core. Catch your breath, Runner. The foundry is throwing everything it has left at us.',
        captions: [
          'Ahead burns Crucible Bastion, the final barrier before the Furnace Core.',
          'Level 3 cleared. Crucible Bastion lies ahead.',
        ],
        accent: 'violet',
      },
    ],
  },
  defeat: {
    id: 'defeat',
    title: 'THE SKYBRIDGE FELL',
    subtitle: 'Adjust Your Anti-Air Grid and Try Again',
    beats: [
      {
        id: 'w2-l03-def-v1-1',
        image: '/src/assets/images/cutscene_w2_l3_opening_1795608966519.jpg',
        motion: 'zoom',
        durationMs: 6800,
        speaker: 'THE RIFT WARDEN',
        voiceStyle: 'Calm, supportive, steady mentor giving clear tactical advice after a tough run.',
        voiceText:
          'The armored Shriekers slipped past the skybridge and struck the Anchor. Try pairing Rail Turrets and Tesla Spires on the central pads with a Frost Totem to slow the flock.',
        captions: [
          'The armored Shriekers slipped through and struck the Anchor.',
          'Tip: pair Rail Turrets and Tesla Spires on the center pads with Frost Totem.',
        ],
        accent: 'crimson',
      },
    ],
  },
};

export const W2_LEVEL3: LevelConfig = {
  id: 'w2-l3',
  worldId: 'w2',
  num: 3,
  worldName: 'World 2: The Sunken Foundry',
  name: 'Ironrift Crossing',
  headline: 'Lock the Skies at Ironrift Crossing',
  description:
    'Armored Rift Shriekers surge overhead across the foundry gorge, flying past ground traps while Shieldbearers press the bridges below. Decode initial L-blends and R-blends cleanly to keep your anti-air grid online.',
  enemiesSummary: 'Rift Shriekers (Armored Flyers), Shieldbearers, and Cinder Imps',
  wordsSummary: 'L-blends and R-blends (bl, cl, fr, gr) + runes',
  rewardSummary: 'Crucible Bastion path opens ahead',
  nextLevelId: 'w2-l4',
  vowels: ['bl', 'cl', 'fr', 'gr'],
  defenders: ['archer', 'spike', 'golem', 'frost', 'ember', 'tesla', 'rail'],
  runeRate: 0.32,
  startCrystals: 255,
  waveEvery: 8,
  anchor: 20,
  minWaves: 6,
  bonusSurgeWaves: 3,
  mastery: {
    window: 8,
    need: 7,
  },
  endless: {
    hpStep: 0.15,
    countStep: 0.14,
  },
  finalBoost: 1.25,
  hasWalkthrough: false,
  freePlacement: true,
  noBuildZones: [
    { u: 0.535, v: 0.305, r: 0.038, label: 'Jagged rock' },
  ],
  noBuildPolys: [
    // Upper smelters, cranes, and molten lava gorge
    { points: [[0.22, 0.0], [1.0, 0.0], [1.0, 0.42], [0.74, 0.38], [0.60, 0.27], [0.42, 0.29], [0.26, 0.22]], label: 'Foundry gorge' },
    // Left molten lava river beneath the suspension bridge
    { points: [[0.0, 0.30], [0.30, 0.40], [0.28, 0.64], [0.0, 0.56]], label: 'Molten lava' },
    // Right molten lava gorge beneath the steel bridges
    { points: [[0.74, 0.40], [1.0, 0.40], [1.0, 0.72], [0.80, 0.72], [0.71, 0.58]], label: 'Molten lava' },
    // Bottom molten lava chasm beneath the Anchor bridge
    { points: [[0.56, 0.76], [0.78, 0.78], [0.80, 1.0], [0.52, 1.0]], label: 'Molten lava' },
  ],
  backdropImage: '/src/assets/images/cutscene_w2_l3_opening_1795608966519.jpg',
  pathUv: [
    [0.115, 0.175],
    [0.185, 0.235],
    [0.285, 0.310],
    [0.380, 0.385],
    [0.422, 0.440],
    [0.388, 0.515],
    [0.400, 0.578],
    [0.478, 0.585],
    [0.528, 0.490],
    [0.575, 0.415],
    [0.635, 0.445],
    [0.640, 0.515],
    [0.592, 0.585],
    [0.595, 0.645],
    [0.680, 0.705],
    [0.785, 0.785],
    [0.865, 0.845],
  ],
  riverUv: [
    [0.49, 0.06],
    [0.49, 0.24],
    [0.35, 0.36],
    [0.24, 0.52],
    [0.16, 0.56],
  ],
  riftUv: [0.095, 0.115],
  campUv: [0.930, 0.850],
  wardenUv: [0.840, 0.845],
  pads: [
    { id: 'ic_t1', kind: 'tower', u: 0.465, v: 0.365 },
    { id: 'ic_t2', kind: 'tower', u: 0.525, v: 0.372 },
    { id: 'ic_t3', kind: 'tower', u: 0.342, v: 0.498 },
    { id: 'ic_t4', kind: 'tower', u: 0.445, v: 0.530 },
    { id: 'ic_t5', kind: 'tower', u: 0.582, v: 0.472 },
    { id: 'ic_t6', kind: 'tower', u: 0.690, v: 0.428 },
    { id: 'ic_t7', kind: 'tower', u: 0.668, v: 0.575 },
    { id: 'ic_t8', kind: 'tower', u: 0.573, v: 0.702 },
    { id: 'ic_t9', kind: 'tower', u: 0.472, v: 0.670 },
    { id: 'ic_t10', kind: 'tower', u: 0.155, v: 0.278 },
    { id: 'ic_r1', kind: 'trail', u: 0.285, v: 0.310 },
    { id: 'ic_r2', kind: 'trail', u: 0.400, v: 0.578 },
    { id: 'ic_r3', kind: 'trail', u: 0.575, v: 0.415 },
    { id: 'ic_r4', kind: 'trail', u: 0.680, v: 0.705 },
  ],
  waves: [
    {
      hp: 1.0,
      groups: [
        { type: 'shrieker', count: 6, gap: 2.3 },
        { type: 'cinderimp', count: 11, gap: 0.78, delay: 4.5 },
      ],
    },
    {
      hp: 1.16,
      groups: [
        { type: 'shieldbearer', count: 6, gap: 2.7 },
        { type: 'shrieker', count: 8, gap: 1.85, delay: 3.5 },
        { type: 'bat', count: 10, gap: 0.85, delay: 9.5 },
      ],
    },
    {
      hp: 1.35,
      groups: [
        { type: 'shrieker', count: 10, gap: 1.65 },
        { type: 'shieldbearer', count: 8, gap: 2.35, delay: 4 },
        { type: 'cinderimp', count: 16, gap: 0.56, delay: 9 },
      ],
    },
    {
      hp: 1.58,
      groups: [
        { type: 'shrieker', count: 12, gap: 1.45 },
        { type: 'shieldbearer', count: 9, gap: 2.1, delay: 3.5 },
        { type: 'splitter', count: 5, gap: 2.5, delay: 8 },
        { type: 'bat', count: 14, gap: 0.74, delay: 12.5 },
      ],
    },
    {
      hp: 1.84,
      groups: [
        { type: 'shrieker', count: 15, gap: 1.3 },
        { type: 'shieldbearer', count: 11, gap: 1.9, delay: 3.5 },
        { type: 'brute', count: 3, gap: 3.0, delay: 7.5 },
        { type: 'cinderimp', count: 20, gap: 0.48, delay: 12 },
      ],
    },
    {
      hp: 2.14,
      groups: [
        { type: 'shrieker', count: 18, gap: 1.18 },
        { type: 'shieldbearer', count: 13, gap: 1.75, delay: 3 },
        { type: 'brute', count: 4, gap: 2.75, delay: 7 },
        { type: 'splitter', count: 6, gap: 2.2, delay: 11.5 },
        { type: 'cinderimp', count: 22, gap: 0.44, delay: 15.5 },
      ],
    },
  ],
  realWords: W2_L3_REAL_WORDS,
  runes: W2_L3_RUNES,
  cutscenes: W2_L3_CUTSCENES,
};

// ---------------------------------------------------------------------------
// World 2 · Level 4: Crucible Bastion (sp, st, nd, mp Blends + Forge Weavers + Gravity Snare)
// ---------------------------------------------------------------------------
export const W2_L4_REAL_WORDS: WordEntry[] = [
  // sp initial blend
  { w: 'spin', kind: 'real', pattern: 'sp', tiles: ['sp', 'i', 'n'], targetTileIdx: 0, options: ['pin', 'sin'], es: 'girar' },
  { w: 'spot', kind: 'real', pattern: 'sp', tiles: ['sp', 'o', 't'], targetTileIdx: 0, options: ['pot', 'sot'], es: 'lugar o punto' },
  { w: 'spun', kind: 'real', pattern: 'sp', tiles: ['sp', 'u', 'n'], targetTileIdx: 0, options: ['pun', 'sun'], es: 'hiló o giró' },
  { w: 'spit', kind: 'real', pattern: 'sp', tiles: ['sp', 'i', 't'], targetTileIdx: 0, options: ['pit', 'sit'], es: 'escupir' },
  { w: 'span', kind: 'real', pattern: 'sp', tiles: ['sp', 'a', 'n'], targetTileIdx: 0, options: ['pan', 'san'], es: 'alcance o tramo' },
  { w: 'sped', kind: 'real', pattern: 'sp', tiles: ['sp', 'e', 'd'], targetTileIdx: 0, options: ['fed', 'red'], es: 'aceleró' },
  // st initial blend
  { w: 'stop', kind: 'real', pattern: 'st', tiles: ['st', 'o', 'p'], targetTileIdx: 0, options: ['top', 'sop'], es: 'parar o alto' },
  { w: 'step', kind: 'real', pattern: 'st', tiles: ['st', 'e', 'p'], targetTileIdx: 0, options: ['pep', 'set'], es: 'paso' },
  { w: 'stem', kind: 'real', pattern: 'st', tiles: ['st', 'e', 'm'], targetTileIdx: 0, options: ['hem', 'set'], es: 'tallo' },
  { w: 'stun', kind: 'real', pattern: 'st', tiles: ['st', 'u', 'n'], targetTileIdx: 0, options: ['sun', 'ton'], es: 'aturdir' },
  { w: 'stag', kind: 'real', pattern: 'st', tiles: ['st', 'a', 'g'], targetTileIdx: 0, options: ['tag', 'sag'], es: 'ciervo' },
  { w: 'stub', kind: 'real', pattern: 'st', tiles: ['st', 'u', 'b'], targetTileIdx: 0, options: ['tub', 'sub'], es: 'trozo o talón' },
  // -nd final blend
  { w: 'hand', kind: 'real', pattern: 'nd', tiles: ['h', 'a', 'nd'], targetTileIdx: 2, options: ['had', 'hat'], es: 'mano' },
  { w: 'sand', kind: 'real', pattern: 'nd', tiles: ['s', 'a', 'nd'], targetTileIdx: 2, options: ['sad', 'sat'], es: 'arena' },
  { w: 'land', kind: 'real', pattern: 'nd', tiles: ['l', 'a', 'nd'], targetTileIdx: 2, options: ['lad', 'lap'], es: 'tierra' },
  { w: 'band', kind: 'real', pattern: 'nd', tiles: ['b', 'a', 'nd'], targetTileIdx: 2, options: ['bad', 'bat'], es: 'banda', cognate: true },
  { w: 'bend', kind: 'real', pattern: 'nd', tiles: ['b', 'e', 'nd'], targetTileIdx: 2, options: ['bed', 'bet'], es: 'doblar' },
  { w: 'send', kind: 'real', pattern: 'nd', tiles: ['s', 'e', 'nd'], targetTileIdx: 2, options: ['fed', 'set'], es: 'enviar' },
  // -mp final blend
  { w: 'camp', kind: 'real', pattern: 'mp', tiles: ['c', 'a', 'mp'], targetTileIdx: 2, options: ['cap', 'cat'], es: 'campamento', cognate: true },
  { w: 'lamp', kind: 'real', pattern: 'mp', tiles: ['l', 'a', 'mp'], targetTileIdx: 2, options: ['lap', 'lad'], es: 'lámpara', cognate: true },
  { w: 'jump', kind: 'real', pattern: 'mp', tiles: ['j', 'u', 'mp'], targetTileIdx: 2, options: ['jug', 'jut'], es: 'saltar' },
  { w: 'bump', kind: 'real', pattern: 'mp', tiles: ['b', 'u', 'mp'], targetTileIdx: 2, options: ['bud', 'bug'], es: 'golpe o bache' },
  { w: 'pump', kind: 'real', pattern: 'mp', tiles: ['p', 'u', 'mp'], targetTileIdx: 2, options: ['pup', 'pug'], es: 'bomba de agua' },
  { w: 'ramp', kind: 'real', pattern: 'mp', tiles: ['r', 'a', 'mp'], targetTileIdx: 2, options: ['rap', 'rat'], es: 'rampa', cognate: true },
];

export const W2_L4_RUNES: WordEntry[] = [
  // sp runes
  { w: 'spab', kind: 'rune', pattern: 'sp', tiles: ['sp', 'a', 'b'], targetTileIdx: 0, options: ['pab', 'sab'], azureRef: 'spabb' },
  { w: 'spog', kind: 'rune', pattern: 'sp', tiles: ['sp', 'o', 'g'], targetTileIdx: 0, options: ['pog', 'sog'], azureRef: 'spogg' },
  // st runes
  { w: 'steb', kind: 'rune', pattern: 'st', tiles: ['st', 'e', 'b'], targetTileIdx: 0, options: ['teb', 'seb'], azureRef: 'stebb' },
  { w: 'stug', kind: 'rune', pattern: 'st', tiles: ['st', 'u', 'g'], targetTileIdx: 0, options: ['tug', 'sug'], azureRef: 'stugg' },
  // -nd runes
  { w: 'fand', kind: 'rune', pattern: 'nd', tiles: ['f', 'a', 'nd'], targetTileIdx: 2, options: ['fad', 'fan'], azureRef: 'fand' },
  { w: 'rond', kind: 'rune', pattern: 'nd', tiles: ['r', 'o', 'nd'], targetTileIdx: 2, options: ['rod', 'ron'], azureRef: 'rond' },
  // -mp runes
  { w: 'bamp', kind: 'rune', pattern: 'mp', tiles: ['b', 'a', 'mp'], targetTileIdx: 2, options: ['bap', 'bam'], azureRef: 'bamp' },
  { w: 'zump', kind: 'rune', pattern: 'mp', tiles: ['z', 'u', 'mp'], targetTileIdx: 2, options: ['zup', 'zum'], azureRef: 'zump' },
];

export const W2_L4_CUTSCENES: Record<CutsceneId, CutsceneScript> = {
  opening: {
    id: 'opening',
    title: 'World 2, Level 4: Crucible Bastion',
    subtitle: 'Opening Cutscene',
    beats: [
      {
        id: 'w2-l04-open-v1-1',
        image: '/src/assets/images/cutscene_w2_l4_opening_1795713155111.jpg',
        motion: 'zoom',
        durationMs: 10000,
        speaker: 'The Rift Warden',
        voiceText:
          'Crucible Bastion stands just ahead of the Furnace Core. Cloaked Forge Weavers are healing the iron column and wrapping their allies in golden shields.',
        captions: [
          'Crucible Bastion guards the gate to the Furnace Core.',
          'Forge Weavers heal and shield nearby allies until brought down.',
        ],
        accent: 'violet',
        voiceStyle:
          'Focused, tactical field commander briefing on Forge Weavers and the Gravity Snare.',
      },
      {
        id: 'w2-l04-open-v1-2',
        image: '/src/assets/images/cutscene_w2_l4_opening_1795713155111.jpg',
        motion: 'pan',
        durationMs: 11000,
        speaker: 'The Rift Warden',
        voiceText:
          'Our engineers unlocked the Gravity Snare. Drop it on the trail to drag both flyers and armored foes into range, and read every sp, st, nd, and mp blend cleanly to crack their line.',
        captions: [
          'New trap unlocked: Gravity Snare pulls ground and flying foes backward on the trail.',
          'Fill the sp, st, nd, and mp Rift Locks to open the Final Wave.',
        ],
        accent: 'cyan',
        voiceStyle:
          'Sharp, encouraging mentor introducing initial S-blends, final blends, and the Gravity Snare.',
      },
    ],
  },
  victory: {
    id: 'victory',
    title: 'Crucible Bastion: Rift Sealed',
    subtitle: 'Victory Cutscene',
    beats: [
      {
        id: 'w2-l04-vic-v1-1',
        image: '/src/assets/images/cutscene_w2_l4_victory_1795713157719.jpg',
        motion: 'lift',
        durationMs: 9500,
        speaker: 'The Rift Warden',
        voiceText:
          'Every Forge Weaver fell, and the Gravity Snares pinned the bastion garrison in its tracks. Your starting and ending blends stayed crisp under pressure.',
        captions: [
          'Crucible Bastion secured! Every Forge Weaver fell.',
          'Your clean sp, st, nd, and mp blend reads broke the bastion line.',
        ],
        accent: 'cyan',
        voiceStyle:
          'Warm, victorious commander praising strong blend mastery.',
      },
      {
        id: 'w2-l04-vic-v1-2',
        image: '/src/assets/images/cutscene_w2_l4_victory_1795713157719.jpg',
        motion: 'zoom',
        durationMs: 10000,
        speaker: 'The Rift Warden',
        voiceText:
          'The heavy gates stand open to the Furnace Core. Deep inside waits the Iron Warden. Bring your strongest loadout and get ready to seal the Sunken Foundry for good.',
        captions: [
          'The heavy gates stand open to the Furnace Core.',
          'World 2 Boss Finale unlocked: The Iron Warden awaits.',
        ],
        accent: 'violet',
        voiceStyle:
          'Steady, dramatic build-up to the World 2 boss finale.',
      },
    ],
  },
  defeat: {
    id: 'defeat',
    title: 'Bastion Line Broken',
    subtitle: 'Defeat Cutscene',
    beats: [
      {
        id: 'w2-l04-def-v1-1',
        image: '/src/assets/images/cutscene_defeat_breach_1795457392970.jpg',
        motion: 'zoom',
        durationMs: 9800,
        speaker: 'The Rift Warden',
        voiceText:
          'The Forge Weavers kept the armored column standing too long. Every lock progress count stays banked. Place a Gravity Snare at the bend with Rail Turrets overhead and try again.',
        captions: [
          'The Forge Weavers kept the armored column standing past the line.',
          'Tip: place a Gravity Snare at the bend with Rail Turrets overhead and try again.',
        ],
        accent: 'crimson',
        voiceStyle:
          'Calm, supportive mentor encouraging a tactical reset.',
      },
    ],
  },
};

export const W2_LEVEL4: LevelConfig = {
  id: 'w2-l4',
  worldId: 'w2',
  num: 4,
  worldName: 'World 2: The Sunken Foundry',
  name: 'Crucible Bastion',
  headline: 'Shatter the Line at Crucible Bastion',
  description:
    'Forge Weavers heal and shield armored foundry columns until focused down. Deploy the new Gravity Snare on key trail bends and decode initial S-blends and final blends cleanly.',
  enemiesSummary: 'Forge Weavers (Healers/Shielders), Rift Shriekers, and Shieldbearers',
  wordsSummary: 'S-blends and final blends (sp, st, nd, mp) + runes',
  rewardSummary: 'The Furnace Core boss stage + Gravity Snare unlocked',
  nextLevelId: 'w2-l5',
  vowels: ['sp', 'st', 'nd', 'mp'],
  defenders: ['archer', 'spike', 'golem', 'frost', 'ember', 'tesla', 'rail', 'gravity'],
  runeRate: 0.32,
  startCrystals: 265,
  waveEvery: 7,
  anchor: 20,
  minWaves: 7,
  bonusSurgeWaves: 3,
  mastery: {
    window: 8,
    need: 7,
  },
  endless: {
    hpStep: 0.16,
    countStep: 0.14,
  },
  finalBoost: 1.25,
  hasWalkthrough: false,
  freePlacement: true,
  noBuildZones: [
    { u: 0.62, v: 0.44, r: 0.068, label: 'Molten crucible' },
  ],
  noBuildPolys: [
    // Top cavern wall & glowing furnace arches
    { points: [[0.0, 0.0], [1.0, 0.0], [1.0, 0.22], [0.84, 0.17], [0.48, 0.14], [0.22, 0.16], [0.0, 0.24]], label: 'Foundry wall' },
    // Upper-center molten cauldron and lava river
    { points: [[0.33, 0.08], [0.54, 0.12], [0.44, 0.42], [0.34, 0.42], [0.32, 0.29]], label: 'Molten lava' },
    // Left molten cauldron and lower lava canyon
    { points: [[0.0, 0.36], [0.09, 0.37], [0.16, 0.58], [0.47, 0.70], [0.54, 1.0], [0.44, 1.0], [0.41, 0.75], [0.08, 0.62], [0.0, 0.56]], label: 'Molten lava' },
    // Right lava waterfall and pool
    { points: [[0.79, 0.58], [0.92, 0.39], [1.0, 0.36], [1.0, 0.64], [0.79, 0.63]], label: 'Molten lava' },
  ],
  backdropImage: '/src/assets/images/cutscene_w2_l4_opening_1795713155111.jpg',
  pathUv: [
    [0.115, 0.195],
    [0.190, 0.250],
    [0.245, 0.315],
    [0.240, 0.375],
    [0.195, 0.445],
    [0.215, 0.525],
    [0.295, 0.568],
    [0.385, 0.558],
    [0.455, 0.480],
    [0.515, 0.370],
    [0.595, 0.285],
    [0.695, 0.290],
    [0.765, 0.365],
    [0.750, 0.455],
    [0.665, 0.515],
    [0.595, 0.585],
    [0.605, 0.675],
    [0.670, 0.740],
    [0.765, 0.785],
    [0.835, 0.815],
  ],
  riverUv: [
    [0.50, 0.15],
    [0.42, 0.30],
    [0.36, 0.42],
    [0.48, 0.78],
    [0.51, 0.94],
  ],
  riftUv: [0.095, 0.125],
  campUv: [0.910, 0.800],
  wardenUv: [0.825, 0.835],
  pads: [
    { id: 'cb_t1', kind: 'tower', u: 0.138, v: 0.326 },
    { id: 'cb_t2', kind: 'tower', u: 0.285, v: 0.205 },
    { id: 'cb_t3', kind: 'tower', u: 0.305, v: 0.448 },
    { id: 'cb_t4', kind: 'tower', u: 0.567, v: 0.198 },
    { id: 'cb_t5', kind: 'tower', u: 0.745, v: 0.208 },
    { id: 'cb_t6', kind: 'tower', u: 0.852, v: 0.338 },
    { id: 'cb_t7', kind: 'tower', u: 0.836, v: 0.506 },
    { id: 'cb_t8', kind: 'tower', u: 0.514, v: 0.635 },
    { id: 'cb_t9', kind: 'tower', u: 0.747, v: 0.652 },
    { id: 'cb_t10', kind: 'tower', u: 0.576, v: 0.802 },
    { id: 'cb_t11', kind: 'tower', u: 0.678, v: 0.875 },
    { id: 'cb_r1', kind: 'trail', u: 0.242, v: 0.345 },
    { id: 'cb_r2', kind: 'trail', u: 0.365, v: 0.562 },
    { id: 'cb_r3', kind: 'trail', u: 0.655, v: 0.285 },
    { id: 'cb_r4', kind: 'trail', u: 0.600, v: 0.625 },
  ],
  waves: [
    {
      hp: 1.05,
      groups: [
        { type: 'shieldbearer', count: 5, gap: 2.6 },
        { type: 'weaver', count: 2, gap: 4.2, delay: 3.0 },
        { type: 'cinderimp', count: 10, gap: 0.78, delay: 6.0 },
      ],
    },
    {
      hp: 1.2,
      groups: [
        { type: 'shrieker', count: 7, gap: 1.95 },
        { type: 'shieldbearer', count: 6, gap: 2.35, delay: 2.8 },
        { type: 'weaver', count: 3, gap: 3.6, delay: 5.5 },
        { type: 'cinderimp', count: 12, gap: 0.65, delay: 9.0 },
      ],
    },
    {
      hp: 1.38,
      groups: [
        { type: 'shieldbearer', count: 7, gap: 2.15 },
        { type: 'weaver', count: 4, gap: 3.1, delay: 2.8 },
        { type: 'shrieker', count: 9, gap: 1.65, delay: 6.0 },
        { type: 'splitter', count: 5, gap: 2.3, delay: 9.5 },
        { type: 'cinderimp', count: 16, gap: 0.55, delay: 12.5 },
      ],
    },
    {
      hp: 1.6,
      groups: [
        { type: 'shieldbearer', count: 9, gap: 1.95 },
        { type: 'weaver', count: 5, gap: 2.75, delay: 2.5 },
        { type: 'shrieker', count: 11, gap: 1.45, delay: 5.5 },
        { type: 'brute', count: 4, gap: 2.8, delay: 9.5 },
      ],
    },
    {
      hp: 1.85,
      groups: [
        { type: 'shieldbearer', count: 11, gap: 1.8 },
        { type: 'weaver', count: 6, gap: 2.45, delay: 2.2 },
        { type: 'shrieker', count: 13, gap: 1.32, delay: 5.0 },
        { type: 'splitter', count: 6, gap: 2.1, delay: 8.5 },
        { type: 'cinderimp', count: 20, gap: 0.48, delay: 11.5 },
      ],
    },
    {
      hp: 2.12,
      groups: [
        { type: 'shieldbearer', count: 12, gap: 1.7 },
        { type: 'weaver', count: 7, gap: 2.25, delay: 2.0 },
        { type: 'brute', count: 5, gap: 2.6, delay: 5.0 },
        { type: 'shrieker', count: 15, gap: 1.22, delay: 9.0 },
        { type: 'cinderimp', count: 20, gap: 0.46, delay: 13.0 },
      ],
    },
    {
      hp: 2.4,
      groups: [
        { type: 'shieldbearer', count: 14, gap: 1.6 },
        { type: 'weaver', count: 8, gap: 2.1, delay: 2.0 },
        { type: 'shrieker', count: 17, gap: 1.12, delay: 5.0 },
        { type: 'brute', count: 6, gap: 2.4, delay: 9.0 },
        { type: 'splitter', count: 7, gap: 1.95, delay: 12.0 },
        { type: 'cinderimp', count: 24, gap: 0.42, delay: 15.0 },
      ],
    },
  ],
  realWords: W2_L4_REAL_WORDS,
  runes: W2_L4_RUNES,
  cutscenes: W2_L4_CUTSCENES,
};

// ---------------------------------------------------------------------------
// World 2 · Level 5: The Furnace Core (World 2 Boss Finale · The Iron Warden)
// ---------------------------------------------------------------------------
export const W2_L5_REAL_WORDS: WordEntry[] = [
  // sh review (5)
  { w: 'ship', kind: 'real', pattern: 'sh', tiles: ['sh', 'i', 'p'], targetTileIdx: 0, options: ['chip', 'sip'], es: 'barco' },
  { w: 'shop', kind: 'real', pattern: 'sh', tiles: ['sh', 'o', 'p'], targetTileIdx: 0, options: ['chop', 'cop'], es: 'tienda' },
  { w: 'shut', kind: 'real', pattern: 'sh', tiles: ['sh', 'u', 't'], targetTileIdx: 0, options: ['cut', 'rut'], es: 'cerrar' },
  { w: 'cash', kind: 'real', pattern: 'sh', tiles: ['c', 'a', 'sh'], targetTileIdx: 2, options: ['cat', 'cap'], es: 'efectivo' },
  { w: 'rush', kind: 'real', pattern: 'sh', tiles: ['r', 'u', 'sh'], targetTileIdx: 2, options: ['rug', 'run'], es: 'prisa' },
  // th review (5)
  { w: 'thin', kind: 'real', pattern: 'th', tiles: ['th', 'i', 'n'], targetTileIdx: 0, options: ['tin', 'fin'], es: 'delgado' },
  { w: 'this', kind: 'real', pattern: 'th', tiles: ['th', 'i', 's'], targetTileIdx: 0, options: ['dis', 'his'], es: 'esto o este' },
  { w: 'that', kind: 'real', pattern: 'th', tiles: ['th', 'a', 't'], targetTileIdx: 0, options: ['hat', 'cat'], es: 'eso o ese' },
  { w: 'path', kind: 'real', pattern: 'th', tiles: ['p', 'a', 'th'], targetTileIdx: 2, options: ['pat', 'pad'], es: 'camino' },
  { w: 'math', kind: 'real', pattern: 'th', tiles: ['m', 'a', 'th'], targetTileIdx: 2, options: ['mat', 'mad'], es: 'matemáticas', cognate: true },
  // bl review (5)
  { w: 'black', kind: 'real', pattern: 'bl', tiles: ['bl', 'a', 'ck'], targetTileIdx: 0, options: ['back', 'rack'], es: 'negro' },
  { w: 'block', kind: 'real', pattern: 'bl', tiles: ['bl', 'o', 'ck'], targetTileIdx: 0, options: ['lock', 'rock'], es: 'bloque', cognate: true },
  { w: 'blast', kind: 'real', pattern: 'bl', tiles: ['bl', 'a', 's', 't'], targetTileIdx: 0, options: ['last', 'fast'], es: 'explosión' },
  { w: 'blend', kind: 'real', pattern: 'bl', tiles: ['bl', 'e', 'n', 'd'], targetTileIdx: 0, options: ['bend', 'lend'], es: 'mezclar' },
  { w: 'blink', kind: 'real', pattern: 'bl', tiles: ['bl', 'i', 'n', 'k'], targetTileIdx: 0, options: ['link', 'sink'], es: 'parpadear' },
  // st review (5)
  { w: 'stop', kind: 'real', pattern: 'st', tiles: ['st', 'o', 'p'], targetTileIdx: 0, options: ['top', 'sop'], es: 'parar o alto' },
  { w: 'step', kind: 'real', pattern: 'st', tiles: ['st', 'e', 'p'], targetTileIdx: 0, options: ['pep', 'set'], es: 'paso' },
  { w: 'stem', kind: 'real', pattern: 'st', tiles: ['st', 'e', 'm'], targetTileIdx: 0, options: ['hem', 'set'], es: 'tallo' },
  { w: 'stun', kind: 'real', pattern: 'st', tiles: ['st', 'u', 'n'], targetTileIdx: 0, options: ['sun', 'ton'], es: 'aturdir' },
  { w: 'stag', kind: 'real', pattern: 'st', tiles: ['st', 'a', 'g'], targetTileIdx: 0, options: ['tag', 'sag'], es: 'ciervo' },
  // -mp review (5)
  { w: 'camp', kind: 'real', pattern: 'mp', tiles: ['c', 'a', 'mp'], targetTileIdx: 2, options: ['cap', 'cat'], es: 'campamento', cognate: true },
  { w: 'lamp', kind: 'real', pattern: 'mp', tiles: ['l', 'a', 'mp'], targetTileIdx: 2, options: ['lap', 'lad'], es: 'lámpara', cognate: true },
  { w: 'jump', kind: 'real', pattern: 'mp', tiles: ['j', 'u', 'mp'], targetTileIdx: 2, options: ['jug', 'jut'], es: 'saltar' },
  { w: 'bump', kind: 'real', pattern: 'mp', tiles: ['b', 'u', 'mp'], targetTileIdx: 2, options: ['bud', 'bug'], es: 'golpe o bache' },
  { w: 'ramp', kind: 'real', pattern: 'mp', tiles: ['r', 'a', 'mp'], targetTileIdx: 2, options: ['rap', 'rat'], es: 'rampa', cognate: true },
];

export const W2_L5_RUNES: WordEntry[] = [
  { w: 'shib', kind: 'rune', pattern: 'sh', tiles: ['sh', 'i', 'b'], targetTileIdx: 0, options: ['sib', 'chib'], azureRef: 'shibb' },
  { w: 'shog', kind: 'rune', pattern: 'sh', tiles: ['sh', 'o', 'g'], targetTileIdx: 0, options: ['sog', 'chog'], azureRef: 'shogg' },
  { w: 'thab', kind: 'rune', pattern: 'th', tiles: ['th', 'a', 'b'], targetTileIdx: 0, options: ['tab', 'fab'], azureRef: 'thabb' },
  { w: 'thip', kind: 'rune', pattern: 'th', tiles: ['th', 'i', 'p'], targetTileIdx: 0, options: ['tip', 'sip'], azureRef: 'thipp' },
  { w: 'blap', kind: 'rune', pattern: 'bl', tiles: ['bl', 'a', 'p'], targetTileIdx: 0, options: ['bap', 'lap'], azureRef: 'blapp' },
  { w: 'bleg', kind: 'rune', pattern: 'bl', tiles: ['bl', 'e', 'g'], targetTileIdx: 0, options: ['beg', 'leg'], azureRef: 'blegg' },
  { w: 'steb', kind: 'rune', pattern: 'st', tiles: ['st', 'e', 'b'], targetTileIdx: 0, options: ['teb', 'seb'], azureRef: 'stebb' },
  { w: 'stug', kind: 'rune', pattern: 'st', tiles: ['st', 'u', 'g'], targetTileIdx: 0, options: ['tug', 'sug'], azureRef: 'stugg' },
  { w: 'bamp', kind: 'rune', pattern: 'mp', tiles: ['b', 'a', 'mp'], targetTileIdx: 2, options: ['bap', 'bam'], azureRef: 'bamp' },
  { w: 'zump', kind: 'rune', pattern: 'mp', tiles: ['z', 'u', 'mp'], targetTileIdx: 2, options: ['zup', 'zum'], azureRef: 'zump' },
];

export const W2_L5_CUTSCENES: Record<CutsceneId, CutsceneScript> = {
  opening: {
    id: 'opening',
    title: 'World 2, Level 5: The Furnace Core',
    subtitle: 'Boss Finale Opening',
    beats: [
      {
        id: 'w2-l05-open-v1-1',
        image: '/src/assets/images/cutscene_w2_l5_opening_1795713159897.jpg',
        motion: 'zoom',
        durationMs: 10000,
        speaker: 'The Rift Warden',
        voiceText:
          'We have reached the heart of the Sunken Foundry. Out of the magma rift rises the Iron Warden, armored in furnace steel and backed by Forge Weavers.',
        captions: [
          'Boss Finale: The Iron Warden rises from the Furnace Core.',
          'Armored in furnace steel and backed by Forge Weavers.',
        ],
        accent: 'violet',
        voiceStyle:
          'Dramatic, resolute commander standing at the edge of the volcanic boss arena.',
      },
      {
        id: 'w2-l05-open-v1-2',
        image: '/src/assets/images/cutscene_w2_l5_opening_1795713159897.jpg',
        motion: 'pan',
        durationMs: 11000,
        speaker: 'The Rift Warden',
        voiceText:
          'Combine Gravity Snares, Rail Turrets, and Tesla Spires around the furnace ring. Seal all five digraph and blend locks, shatter the Iron Warden, and close this foundry rift forever.',
        captions: [
          'Combine Gravity Snares, Rail Turrets, and Tesla Spires around the molten ring.',
          'Seal all five World 2 locks and defeat the Iron Warden.',
        ],
        accent: 'cyan',
        voiceStyle:
          'Inspiring, confident field mentor rallying the Runner for the World 2 finale.',
      },
    ],
  },
  victory: {
    id: 'victory',
    title: 'The Sunken Foundry: Rift Sealed',
    subtitle: 'World 2 Finale Victory',
    beats: [
      {
        id: 'w2-l05-vic-v1-1',
        image: '/src/assets/images/cutscene_w2_l5_victory_1795713159483.jpg',
        motion: 'lift',
        durationMs: 9600,
        speaker: 'The Rift Warden',
        voiceText:
          'The Iron Warden is broken, and the Furnace Core grows cool. A pillar of pure Anchor light seals the last volcanic rift above the Sunken Foundry.',
        captions: [
          'The Iron Warden is defeated and the Furnace Core grows cool!',
          'Pure Anchor light seals the last volcanic rift above the Sunken Foundry.',
        ],
        accent: 'cyan',
        voiceStyle:
          'Triumphant, warm, and deeply proud at the end of World 2.',
      },
      {
        id: 'w2-l05-vic-v1-2',
        image: '/src/assets/images/cutscene_w2_l5_victory_1795713159483.jpg',
        motion: 'zoom',
        durationMs: 10200,
        speaker: 'The Rift Warden',
        voiceText:
          'Every digraph and consonant blend in the foundry is yours now, Runner. Step into the silver dawn beyond these iron arches. New skies and stronger magic await ahead.',
        captions: [
          'Every World 2 digraph and blend is mastered!',
          'World 2: The Sunken Foundry Completed.',
        ],
        accent: 'violet',
        voiceStyle:
          'Hopeful, calm, looking ahead toward World 3.',
      },
    ],
  },
  defeat: {
    id: 'defeat',
    title: 'The Core Overwhelmed the Line',
    subtitle: 'Defeat Cutscene',
    beats: [
      {
        id: 'w2-l05-def-v1-1',
        image: '/src/assets/images/cutscene_defeat_breach_1795457392970.jpg',
        motion: 'zoom',
        durationMs: 10200,
        speaker: 'The Rift Warden',
        voiceText:
          'The Iron Warden takes serious firepower to bring down. Your lock progress is already saved. Crack his armor with a Shatter Coil Rail Turret and hold him inside a Gravity Snare on the next run.',
        captions: [
          'The Iron Warden broke through the furnace ring.',
          'Tip: shatter his armor with a Rail Turret and hold him in a Gravity Snare.',
        ],
        accent: 'crimson',
        voiceStyle:
          'Steady, encouraging mentor after a tough boss battle.',
      },
    ],
  },
};

export const W2_LEVEL5: LevelConfig = {
  id: 'w2-l5',
  worldId: 'w2',
  num: 5,
  worldName: 'World 2: The Sunken Foundry',
  name: 'The Furnace Core',
  headline: 'Defeat the Iron Warden at the Core',
  description:
    'The World 2 boss finale. The towering Iron Warden fortifies escorts and summons Cinder Imps around the molten ring. Deploy your custom 6-defender loadout across all World 2 digraphs and blends.',
  enemiesSummary: 'The Iron Warden (Boss), Forge Weavers, Rift Shriekers, and Shieldbearers',
  wordsSummary: 'Boss Finale · World 2 digraphs & blends (sh, th, bl, st, mp)',
  rewardSummary: 'World 2: The Sunken Foundry Completed',
  vowels: ['sh', 'th', 'bl', 'st', 'mp'],
  defenders: ['archer', 'spike', 'golem', 'frost', 'ember', 'tesla', 'rail', 'gravity'],
  runeRate: 0.34,
  startCrystals: 280,
  waveEvery: 7,
  anchor: 20,
  minWaves: 7,
  bonusSurgeWaves: 0,
  mastery: {
    window: 7,
    need: 6,
  },
  endless: {
    hpStep: 0.18,
    countStep: 0.14,
  },
  finalBoost: 1.2,
  hasWalkthrough: false,
  freePlacement: true,
  noBuildZones: [
    // Central blazing molten furnace core cauldron
    { u: 0.495, v: 0.495, r: 0.132, label: 'Furnace core' },
  ],
  noBuildPolys: [
    // Upper cavern ceiling, stalactites, and lava waterfalls
    { points: [[0.0, 0.0], [1.0, 0.0], [1.0, 0.26], [0.78, 0.20], [0.54, 0.08], [0.30, 0.15], [0.18, 0.12], [0.0, 0.16]], label: 'Cavern wall' },
    // Left molten lava moat under the bridge
    { points: [[0.0, 0.30], [0.22, 0.38], [0.29, 0.66], [0.18, 0.66], [0.0, 0.54]], label: 'Molten lava' },
    // Right inner molten lava moat
    { points: [[0.70, 0.30], [0.83, 0.38], [0.82, 0.60], [0.70, 0.58]], label: 'Molten lava' },
    // Bottom molten lava chasm
    { points: [[0.42, 0.79], [0.68, 0.74], [0.70, 1.0], [0.40, 1.0]], label: 'Molten lava' },
    // Far-right molten lava pool
    { points: [[0.89, 0.26], [1.0, 0.26], [1.0, 0.66], [0.89, 0.64]], label: 'Molten lava' },
  ],
  backdropImage: '/src/assets/images/cutscene_w2_l5_opening_1795713159897.jpg',
  pathUv: [
    [0.095, 0.185],
    [0.185, 0.265],
    [0.270, 0.285],
    [0.380, 0.180],
    [0.490, 0.145],
    [0.615, 0.185],
    [0.640, 0.245],
    [0.610, 0.295],
    [0.485, 0.295],
    [0.365, 0.345],
    [0.312, 0.465],
    [0.335, 0.585],
    [0.440, 0.675],
    [0.565, 0.670],
    [0.645, 0.635],
    [0.715, 0.695],
    [0.795, 0.755],
    [0.870, 0.810],
  ],
  riverUv: [
    [0.49, 0.48],
    [0.54, 0.44],
    [0.46, 0.52],
  ],
  riftUv: [0.085, 0.125],
  campUv: [0.905, 0.805],
  wardenUv: [0.835, 0.845],
  pads: [
    { id: 'fc_t1', kind: 'tower', u: 0.358, v: 0.212 },
    { id: 'fc_t2', kind: 'tower', u: 0.483, v: 0.125 },
    { id: 'fc_t3', kind: 'tower', u: 0.727, v: 0.252 },
    { id: 'fc_t4', kind: 'tower', u: 0.652, v: 0.388 },
    { id: 'fc_t5', kind: 'tower', u: 0.665, v: 0.535 },
    { id: 'fc_t6', kind: 'tower', u: 0.265, v: 0.455 },
    { id: 'fc_t7', kind: 'tower', u: 0.365, v: 0.725 },
    { id: 'fc_t8', kind: 'tower', u: 0.560, v: 0.755 },
    { id: 'fc_t9', kind: 'tower', u: 0.824, v: 0.665 },
    { id: 'fc_t10', kind: 'tower', u: 0.735, v: 0.825 },
    { id: 'fc_r1', kind: 'trail', u: 0.255, v: 0.280 },
    { id: 'fc_r2', kind: 'trail', u: 0.618, v: 0.270 },
    { id: 'fc_r3', kind: 'trail', u: 0.315, v: 0.495 },
    { id: 'fc_r4', kind: 'trail', u: 0.708, v: 0.690 },
  ],
  waves: [
    {
      hp: 1.08,
      groups: [
        { type: 'shieldbearer', count: 6, gap: 2.5 },
        { type: 'weaver', count: 2, gap: 3.8, delay: 3.0 },
        { type: 'shrieker', count: 7, gap: 1.95, delay: 5.5 },
        { type: 'cinderimp', count: 12, gap: 0.65, delay: 9.0 },
      ],
    },
    {
      hp: 1.24,
      groups: [
        { type: 'shieldbearer', count: 7, gap: 2.2 },
        { type: 'weaver', count: 4, gap: 3.2, delay: 2.5 },
        { type: 'shrieker', count: 9, gap: 1.7, delay: 5.5 },
        { type: 'cinderimp', count: 16, gap: 0.56, delay: 10.0 },
      ],
    },
    {
      hp: 1.42,
      groups: [
        { type: 'shieldbearer', count: 8, gap: 2.0 },
        { type: 'weaver', count: 4, gap: 2.9, delay: 2.5 },
        { type: 'shrieker', count: 11, gap: 1.5, delay: 5.5 },
        { type: 'splitter', count: 6, gap: 2.15, delay: 8.5 },
        { type: 'brute', count: 3, gap: 2.9, delay: 11.0 },
      ],
    },
    {
      hp: 1.62,
      groups: [
        { type: 'shieldbearer', count: 10, gap: 1.85 },
        { type: 'weaver', count: 5, gap: 2.6, delay: 2.2 },
        { type: 'shrieker', count: 12, gap: 1.4, delay: 5.0 },
        { type: 'brute', count: 4, gap: 2.7, delay: 9.0 },
        { type: 'cinderimp', count: 18, gap: 0.5, delay: 13.0 },
      ],
    },
    {
      hp: 1.82,
      groups: [
        { type: 'ironwarden', count: 1, gap: 1.0, delay: 4.0 },
        { type: 'shieldbearer', count: 8, gap: 2.0, delay: 1.0 },
        { type: 'weaver', count: 5, gap: 2.8, delay: 4.5 },
        { type: 'shrieker', count: 12, gap: 1.35, delay: 8.5 },
        { type: 'cinderimp', count: 16, gap: 0.5, delay: 12.5 },
      ],
    },
    {
      hp: 2.05,
      groups: [
        { type: 'shieldbearer', count: 11, gap: 1.75 },
        { type: 'weaver', count: 6, gap: 2.4, delay: 2.0 },
        { type: 'shrieker', count: 14, gap: 1.25, delay: 5.0 },
        { type: 'splitter', count: 7, gap: 2.0, delay: 8.5 },
        { type: 'brute', count: 5, gap: 2.5, delay: 11.5 },
        { type: 'cinderimp', count: 22, gap: 0.46, delay: 14.5 },
      ],
    },
    {
      hp: 2.3,
      groups: [
        { type: 'ironwarden', count: 1, gap: 1.0, delay: 2.5 },
        { type: 'shieldbearer', count: 10, gap: 1.85, delay: 1.0 },
        { type: 'weaver', count: 6, gap: 2.5, delay: 4.0 },
        { type: 'shrieker', count: 15, gap: 1.2, delay: 8.0 },
        { type: 'brute', count: 4, gap: 2.6, delay: 11.5 },
        { type: 'cinderimp', count: 24, gap: 0.44, delay: 15.0 },
      ],
    },
  ],
  realWords: W2_L5_REAL_WORDS,
  runes: W2_L5_RUNES,
  cutscenes: W2_L5_CUTSCENES,
};

W2_LEVEL5.nextLevelId = 'w3-l1';
W2_LEVEL5.rewardSummary = 'World 3: The Silver Spires + Free Placement unlock';

// ---------------------------------------------------------------------------
// World 3 · Level 1: Dawnbreak Terrace (Silent-E Long a_e & i_e + Free Placement + Gale Wraith)
// ---------------------------------------------------------------------------
export const W3_L1_REAL_WORDS: WordEntry[] = [
  // Long a (a_e)
  { w: 'cake', kind: 'real', pattern: 'a_e', tiles: ['c', 'a', 'k', 'e'], targetTileIdx: 1, options: ['coke', 'bike'], es: 'pastel' },
  { w: 'make', kind: 'real', pattern: 'a_e', tiles: ['m', 'a', 'k', 'e'], targetTileIdx: 1, options: ['mike', 'mad'], es: 'hacer' },
  { w: 'lake', kind: 'real', pattern: 'a_e', tiles: ['l', 'a', 'k', 'e'], targetTileIdx: 1, options: ['like', 'lock'], es: 'lago' },
  { w: 'tape', kind: 'real', pattern: 'a_e', tiles: ['t', 'a', 'p', 'e'], targetTileIdx: 1, options: ['tap', 'top'], es: 'cinta' },
  { w: 'cape', kind: 'real', pattern: 'a_e', tiles: ['c', 'a', 'p', 'e'], targetTileIdx: 1, options: ['cap', 'cup'], es: 'capa', cognate: true },
  { w: 'gate', kind: 'real', pattern: 'a_e', tiles: ['g', 'a', 't', 'e'], targetTileIdx: 1, options: ['got', 'get'], es: 'portón' },
  { w: 'late', kind: 'real', pattern: 'a_e', tiles: ['l', 'a', 't', 'e'], targetTileIdx: 1, options: ['let', 'lot'], es: 'tarde' },
  { w: 'game', kind: 'real', pattern: 'a_e', tiles: ['g', 'a', 'm', 'e'], targetTileIdx: 1, options: ['gum', 'gem'], es: 'juego' },
  { w: 'name', kind: 'real', pattern: 'a_e', tiles: ['n', 'a', 'm', 'e'], targetTileIdx: 1, options: ['nine', 'nap'], es: 'nombre' },
  { w: 'made', kind: 'real', pattern: 'a_e', tiles: ['m', 'a', 'd', 'e'], targetTileIdx: 1, options: ['mad', 'mud'], es: 'hizo' },
  // Long i (i_e)
  { w: 'bike', kind: 'real', pattern: 'i_e', tiles: ['b', 'i', 'k', 'e'], targetTileIdx: 1, options: ['bake', 'back'], es: 'bicicleta' },
  { w: 'hike', kind: 'real', pattern: 'i_e', tiles: ['h', 'i', 'k', 'e'], targetTileIdx: 1, options: ['hate', 'hit'], es: 'caminata' },
  { w: 'like', kind: 'real', pattern: 'i_e', tiles: ['l', 'i', 'k', 'e'], targetTileIdx: 1, options: ['lake', 'lick'], es: 'gustar' },
  { w: 'time', kind: 'real', pattern: 'i_e', tiles: ['t', 'i', 'm', 'e'], targetTileIdx: 1, options: ['tame', 'tin'], es: 'tiempo' },
  { w: 'dime', kind: 'real', pattern: 'i_e', tiles: ['d', 'i', 'm', 'e'], targetTileIdx: 1, options: ['dim', 'dam'], es: 'moneda de diez centavos' },
  { w: 'line', kind: 'real', pattern: 'i_e', tiles: ['l', 'i', 'n', 'e'], targetTileIdx: 1, options: ['lane', 'lip'], es: 'línea', cognate: true },
  { w: 'pine', kind: 'real', pattern: 'i_e', tiles: ['p', 'i', 'n', 'e'], targetTileIdx: 1, options: ['pin', 'pan'], es: 'pino', cognate: true },
  { w: 'kite', kind: 'real', pattern: 'i_e', tiles: ['k', 'i', 't', 'e'], targetTileIdx: 1, options: ['kit', 'cat'], es: 'cometa' },
  { w: 'bite', kind: 'real', pattern: 'i_e', tiles: ['b', 'i', 't', 'e'], targetTileIdx: 1, options: ['bit', 'bat'], es: 'morder' },
  { w: 'ride', kind: 'real', pattern: 'i_e', tiles: ['r', 'i', 'd', 'e'], targetTileIdx: 1, options: ['rid', 'red'], es: 'montar' },
];

export const W3_L1_RUNES: WordEntry[] = [
  { w: 'bape', kind: 'rune', pattern: 'a_e', tiles: ['b', 'a', 'p', 'e'], targetTileIdx: 1, options: ['bipe', 'bap'], azureRef: 'bape' },
  { w: 'dake', kind: 'rune', pattern: 'a_e', tiles: ['d', 'a', 'k', 'e'], targetTileIdx: 1, options: ['dike', 'dak'], azureRef: 'dake' },
  { w: 'zate', kind: 'rune', pattern: 'a_e', tiles: ['z', 'a', 't', 'e'], targetTileIdx: 1, options: ['zite', 'zat'], azureRef: 'zate' },
  { w: 'mave', kind: 'rune', pattern: 'a_e', tiles: ['m', 'a', 'v', 'e'], targetTileIdx: 1, options: ['mive', 'mav'], azureRef: 'mave' },
  { w: 'bipe', kind: 'rune', pattern: 'i_e', tiles: ['b', 'i', 'p', 'e'], targetTileIdx: 1, options: ['bape', 'bip'], azureRef: 'bipe' },
  { w: 'zime', kind: 'rune', pattern: 'i_e', tiles: ['z', 'i', 'm', 'e'], targetTileIdx: 1, options: ['zame', 'zim'], azureRef: 'zime' },
  { w: 'tibe', kind: 'rune', pattern: 'i_e', tiles: ['t', 'i', 'b', 'e'], targetTileIdx: 1, options: ['tabe', 'tib'], azureRef: 'tibe' },
  { w: 'kide', kind: 'rune', pattern: 'i_e', tiles: ['k', 'i', 'd', 'e'], targetTileIdx: 1, options: ['kade', 'kid'], azureRef: 'kide' },
];

export const W3_L1_CUTSCENES: Record<CutsceneId, CutsceneScript> = {
  opening: {
    id: 'opening',
    title: 'Dawnbreak Terrace',
    subtitle: 'World 3 · Level 1 Opening',
    beats: [
      {
        id: 'w3-l01-open-v1-1',
        image: '/src/assets/images/cutscene_w3_l1_opening_1795720712774.jpg',
        motion: 'zoom',
        durationMs: 10000,
        speaker: 'The Rift Warden',
        voiceText:
          'Welcome to the Silver Spires, Runner. High above the clouds, Dawnbreak Terrace is under attack by Gale Wraiths that ride bursts of wind straight down the mountain road.',
        captions: [
          'Welcome to World 3: The Silver Spires.',
          'Gale Wraiths surge forward on sudden bursts of wind.',
        ],
        voiceStyle: 'Calm, inspiring veteran guardian surveying high mountain spires at sunrise.',
        accent: 'cyan',
      },
      {
        id: 'w3-l01-open-v1-2',
        image: '/src/assets/images/cutscene_w3_l1_opening_1795720712774.jpg',
        motion: 'pan',
        durationMs: 11000,
        speaker: 'The Rift Warden',
        voiceText:
          'You earned Free Placement here. Set towers anywhere on the open grass and snap road traps anywhere along the stone trail. Watch for silent e in the Rune Forge to lock in long a and long i.',
        captions: [
          'Free Placement unlocked! Build towers anywhere on open grass and traps anywhere on the road.',
          'Master silent-e long vowels (a_e and i_e) to seal Dawnbreak Terrace.',
        ],
        voiceStyle: 'Encouraging, energetic mentor unlocking a major new tactical ability.',
        accent: 'violet',
      },
    ],
  },
  victory: {
    id: 'victory',
    title: 'Terrace Cleared',
    subtitle: 'World 3 · Level 1 Victory',
    beats: [
      {
        id: 'w3-l01-vic-v1-1',
        image: '/src/assets/images/cutscene_w3_l1_victory_1795720712044.jpg',
        motion: 'lift',
        durationMs: 9500,
        speaker: 'The Rift Warden',
        voiceText:
          'Dawnbreak Terrace is clear! Your custom tower layout broke every Gale Wraith wind dash, and your silent-e readings locked in long a and long i.',
        captions: [
          'Dawnbreak Terrace secured! Every Gale Wraith dash was stopped cold.',
          'Long a (a_e) and long i (i_e) locks sealed.',
        ],
        voiceStyle: 'Warm, proud veteran guardian celebrating a crisp victory.',
        accent: 'cyan',
      },
      {
        id: 'w3-l01-vic-v1-2',
        image: '/src/assets/images/cutscene_w3_l1_victory_1795720712044.jpg',
        motion: 'zoom',
        durationMs: 9500,
        speaker: 'The Rift Warden',
        voiceText:
          'The upper bridges of the Silver Spires gleam ahead in the morning sun. Rest your voice, Runner. Even higher peaks await.',
        captions: [
          'The upper Silver Spires stand open ahead.',
          'World 3 · Level 1 Complete!',
        ],
        voiceStyle: 'Hopeful, poised veteran mentor looking up toward alpine citadels.',
        accent: 'violet',
      },
    ],
  },
  defeat: {
    id: 'defeat',
    title: 'Terrace Breached',
    subtitle: 'World 3 · Level 1 Defeat',
    beats: [
      {
        id: 'w3-l01-def-v1-1',
        image: '/src/assets/images/cutscene_defeat_breach_1795457392970.jpg',
        motion: 'zoom',
        durationMs: 9000,
        speaker: 'The Rift Warden',
        voiceText:
          'Those Gale Wraiths dashed right past our outer bend. With Free Placement, cluster a Frost Totem and Gravity Snare right on the hairpin curve to shut down their wind bursts.',
        captions: [
          'The Gale Wraith wind dashes slipped past the terrace defense.',
          'Tip: cluster a Frost Totem and Gravity Snare near the middle bend and try again.',
        ],
        voiceStyle: 'Calm, supportive mentor offering tactical advice after a defeat.',
        accent: 'crimson',
      },
    ],
  },
};

export const W3_LEVEL1: LevelConfig = {
  id: 'w3-l1',
  num: 1,
  worldId: 'w3',
  worldName: 'World 3: The Silver Spires',
  name: 'Dawnbreak Terrace',
  headline: 'Free Placement at Dawnbreak Terrace',
  description:
    'Place towers anywhere on the open alpine terraces and snap trail traps anywhere along the mountain road. Slow down dashing Gale Wraiths while mastering silent-e long vowels (a_e and i_e).',
  enemiesSummary: 'Gale Wraiths, Shieldbearers, Cinder Imps, Rift Shriekers, Forge Weavers, and Brutes',
  wordsSummary: 'silent-e long a (a_e) & long i (i_e), plus runes',
  rewardSummary: 'Free Placement unlocked for World 3',
  vowels: ['a_e', 'i_e'],
  defenders: ['archer', 'spike', 'golem', 'frost', 'ember', 'tesla', 'rail', 'gravity'],
  runeRate: 0.25,
  startCrystals: 260,
  waveEvery: 7,
  anchor: 20,
  minWaves: 7,
  bonusSurgeWaves: 3,
  mastery: {
    window: 10,
    need: 9,
  },
  endless: {
    hpStep: 0.16,
    countStep: 0.14,
  },
  finalBoost: 1.25,
  hasWalkthrough: false,
  freePlacement: true,
  noBuildZones: [],
  noBuildPolys: [
    // Upper fortress masonry & cliff face
    { points: [[0.0, 0.0], [0.70, 0.0], [0.68, 0.12], [0.38, 0.18], [0.31, 0.25], [0.0, 0.36]], label: 'Fortress wall' },
    // Right sky clouds & sheer cliff drop-off
    { points: [[0.68, 0.0], [1.0, 0.0], [1.0, 0.70], [0.86, 0.52], [0.84, 0.28], [0.72, 0.14]], label: 'Cliff drop' },
    // Bottom-left sheer cliff drop & clouds
    { points: [[0.0, 0.44], [0.09, 0.60], [0.19, 0.82], [0.24, 1.0], [0.0, 1.0]], label: 'Cliff drop' },
  ],
  backdropImage: '/src/assets/images/cutscene_w3_l1_opening_1795720712774.jpg',
  pathUv: [
    [0.175, 0.235],
    [0.225, 0.295],
    [0.285, 0.355],
    [0.345, 0.378],
    [0.415, 0.355],
    [0.475, 0.290],
    [0.535, 0.235],
    [0.610, 0.215],
    [0.695, 0.250],
    [0.735, 0.315],
    [0.700, 0.390],
    [0.630, 0.445],
    [0.568, 0.515],
    [0.555, 0.595],
    [0.590, 0.670],
    [0.665, 0.720],
    [0.745, 0.750],
    [0.805, 0.770],
  ],
  riverUv: [],
  riftUv: [0.165, 0.165],
  campUv: [0.848, 0.775],
  wardenUv: [0.775, 0.875],
  pads: [],
  waves: [
    {
      hp: 1.12,
      groups: [
        { type: 'galewraith', count: 6, gap: 2.1 },
        { type: 'shieldbearer', count: 5, gap: 2.7, delay: 3.5 },
        { type: 'cinderimp', count: 10, gap: 0.72, delay: 7.5 },
      ],
    },
    {
      hp: 1.3,
      groups: [
        { type: 'galewraith', count: 8, gap: 1.75 },
        { type: 'shrieker', count: 8, gap: 1.85, delay: 3.0 },
        { type: 'shieldbearer', count: 6, gap: 2.4, delay: 6.5 },
        { type: 'cinderimp', count: 14, gap: 0.6, delay: 10.5 },
      ],
    },
    {
      hp: 1.5,
      groups: [
        { type: 'galewraith', count: 10, gap: 1.5 },
        { type: 'weaver', count: 4, gap: 3.0, delay: 2.5 },
        { type: 'shrieker', count: 10, gap: 1.55, delay: 5.5 },
        { type: 'splitter', count: 6, gap: 2.2, delay: 9.0 },
      ],
    },
    {
      hp: 1.74,
      groups: [
        { type: 'shieldbearer', count: 8, gap: 1.95 },
        { type: 'galewraith', count: 12, gap: 1.35, delay: 2.5 },
        { type: 'weaver', count: 5, gap: 2.7, delay: 5.5 },
        { type: 'shrieker', count: 11, gap: 1.4, delay: 8.5 },
        { type: 'cinderimp', count: 18, gap: 0.5, delay: 12.0 },
      ],
    },
    {
      hp: 2.0,
      groups: [
        { type: 'galewraith', count: 14, gap: 1.2 },
        { type: 'shieldbearer', count: 10, gap: 1.8, delay: 2.2 },
        { type: 'weaver', count: 6, gap: 2.5, delay: 5.0 },
        { type: 'shrieker', count: 13, gap: 1.3, delay: 8.0 },
        { type: 'brute', count: 4, gap: 2.8, delay: 11.0 },
        { type: 'splitter', count: 6, gap: 2.0, delay: 14.0 },
      ],
    },
    {
      hp: 2.28,
      groups: [
        { type: 'galewraith', count: 16, gap: 1.1 },
        { type: 'shieldbearer', count: 11, gap: 1.7, delay: 2.0 },
        { type: 'weaver', count: 7, gap: 2.3, delay: 4.5 },
        { type: 'shrieker', count: 15, gap: 1.2, delay: 7.5 },
        { type: 'brute', count: 5, gap: 2.55, delay: 11.0 },
        { type: 'cinderimp', count: 22, gap: 0.44, delay: 14.5 },
      ],
    },
    {
      hp: 2.55,
      groups: [
        { type: 'galewraith', count: 18, gap: 1.0 },
        { type: 'shieldbearer', count: 13, gap: 1.6, delay: 2.0 },
        { type: 'weaver', count: 8, gap: 2.1, delay: 4.5 },
        { type: 'shrieker', count: 16, gap: 1.12, delay: 7.5 },
        { type: 'brute', count: 6, gap: 2.35, delay: 11.0 },
        { type: 'splitter', count: 7, gap: 1.9, delay: 14.0 },
        { type: 'cinderimp', count: 26, gap: 0.4, delay: 16.5 },
      ],
    },
  ],
  realWords: W3_L1_REAL_WORDS,
  runes: W3_L1_RUNES,
  cutscenes: W3_L1_CUTSCENES,
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
  'w3-l1': W3_LEVEL1,
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
  'w3-l1',
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
  w3: {
    id: 'w3',
    num: 3,
    name: 'World 3: The Silver Spires',
    subtitle: 'Silent-E Long Vowels (a_e, i_e) · Free Placement',
    levelIds: ['w3-l1'],
  },
};

export const WORLD_ORDER: WorldId[] = ['w1', 'w2', 'w3'];
