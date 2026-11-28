// Keep in sync with CanvasBattleEngine.ts combat rules.

import {
  CREATURES,
  CreatureType,
  DEFENDERS,
  DefenderLevelStats,
  DefenderType,
  DIFFICULTIES,
  DifficultyId,
  FORGE_CONFIG,
  LevelConfig,
  LevelId,
  LEVELS,
  PatternKey,
  WaveDef,
  WordEntry,
} from '../data/level1';

// Logical 16:9 coordinate space & world-unit scale (CanvasBattleEngine.ts lines 99-100, 480)
const MAP_W = 1600;
const MAP_H = 900;
const RANGE_UNIT_PX = 26;
const PATH_UNIT_FACTOR = 0.055; // CanvasBattleEngine.ts line 2171

export type TargetPriority = 'first' | 'last' | 'strong';
export type ReadingAccuracy = 0.4 | 0.6 | 0.8 | 1.0 | number;

export type TowerPosition =
  | string
  | { padId: string }
  | { u: number; v: number }
  | { x: number; y: number };

export interface TowerUpgradeStep {
  /** Upgrade base level (2 or 3). */
  level?: 2 | 3;
  /** Choose Level 4 specialization ('a' or 'b'). Automatically requires Level 3. */
  spec?: 'a' | 'b';
  /** 1-indexed wave number before which to purchase this upgrade. Defaults to the tower's buyBeforeWave. */
  buyBeforeWave?: number;
}

export interface TowerPlanItem {
  /** Optional label/id for diagnostics. */
  id?: string;
  type: DefenderType;
  /** Fixed pad ID (e.g. 't1'), normalized { u, v } in 0..1, or logical { x, y } in 1600x900 space. */
  position: TowerPosition;
  /** 1-indexed wave number before which to build this defender (default: 1). */
  buyBeforeWave?: number;
  /** Ordered upgrade / specialization steps for this defender. */
  upgrades?: TowerUpgradeStep[];
  /** Optional target mode override (defaults to 'strong' for rail, 'first' otherwise). */
  targetMode?: TargetPriority;
  /** Optional 1-indexed wave number before which to sell this defender (70% crystal refund). */
  sellBeforeWave?: number;
}

export interface SimDials {
  healthPct?: number;
  speedPct?: number;
  countPct?: number;
  extraWords?: number;
}

export interface SimInput {
  levelId: LevelId;
  difficulty: DifficultyId;
  towerPlan: TowerPlanItem[];
  readingAccuracy: ReadingAccuracy;
  /** Fixed simulation time step in seconds (default: 0.05). */
  dt?: number;
  /** Deterministic PRNG seed (default: 1). */
  seed?: number;
  /** Clean real-word payout mode: 'speak' (18) or 'tap' (12). Default: 'speak'. */
  readMode?: 'speak' | 'tap';
  /** If true, continues into Bonus Surge waves after clearing the Final Wave. Default: false. */
  playBonusSurge?: boolean;
  /** Safety cap on total waves simulated (prevents infinite endless waves at low accuracy). Default: 25. */
  maxWaves?: number;
  /** Safety cap on seconds per wave. Default: 600. */
  maxWaveDuration?: number;
  /** When true, waits to afford the next scheduled action instead of skipping to cheaper later ones. Default: true. */
  strictBuildOrder?: boolean;
  /** When true, enforces map pad kinds & free-placement geometry rules. Default: true. */
  validatePlacement?: boolean;
  /** Optional builder difficulty dials (defaults to 100/100/100/0). */
  dials?: SimDials;
  /** Optional override for level.startCrystals (used by Balance Lab what-if probes). */
  overrideStartCrystals?: number;
  /** Optional override for level.balance[difficulty] (used by Balance Lab what-if probes). */
  overrideBalanceScale?: number;
}

export interface WaveSnapshot {
  wave: number;
  isFinalWave: boolean;
  isBonusWave: boolean;
  bonusWaveNum: number;
  anchorAfter: number;
  anchorLost: number;
  crystalsBeforeReading: number;
  crystalsFromReading: number;
  crystalsFromLocks: number;
  crystalsSpent: number;
  crystalsFromKills: number;
  crystalsFromWaveBonus: number;
  crystalsAfter: number;
  kills: number;
  durationSec: number;
  locksReady: boolean;
  defendersBuilt: number;
  upgradesBought: number;
}

export interface SimResult {
  win: boolean;
  outcome: 'win' | 'loss' | 'max_waves' | 'wave_timeout';
  stars: number;
  levelId: LevelId;
  difficulty: DifficultyId;
  readingAccuracy: number;
  wavesCleared: number;
  totalWavesRun: number;
  finalAnchor: number;
  maxAnchor: number;
  finalCrystals: number;
  totalKills: number;
  totalShards: number;
  totalWordsRead: number;
  totalCleanReads: number;
  megaForges: number;
  locksSealed: PatternKey[];
  locksReady: boolean;
  bonusWavesCleared: number;
  bonusTotal: number;
  bonusCompleted: boolean;
  bonusAnchorFell: boolean;
  waves: WaveSnapshot[];
  placementWarnings: string[];
}

// --- Internal Runtime Types (mirroring CanvasBattleEngine.ts lines 102-280) ---

interface Vec2 {
  x: number;
  y: number;
}

interface PadRuntime {
  id: string;
  kind: 'tower' | 'trail';
  x: number;
  y: number;
  s: number;
  def: DefenderRuntime | null;
}

interface DefenderRuntime {
  id: string;
  planIndex: number;
  type: DefenderType;
  pad: PadRuntime;
  level: number;
  spec: 'a' | 'b' | null;
  targetMode: TargetPriority;
  spent: number;
  cd: number;
  freezeCd: number;
  hp: number;
  maxHp: number;
  downTimer: number;
  holding: CreatureRuntime[];
  facingLeft: boolean;
  beamTargetId?: string | null;
  beamStacks?: number;
  pullCd?: number;
}

interface CreatureRuntime {
  id: string;
  type: CreatureType;
  s: number;
  lane: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  speed: number;
  anchorDmg: number;
  shards: number;
  hitDmg: number;
  alive: boolean;
  slowMult: number;
  slowTimer: number;
  freezeTimer: number;
  freezeImmuneTimer: number;
  pullImmuneTimer: number;
  armorShredTimer: number;
  shieldTimer: number;
  abilityCd: number;
  dashTimer: number;
  summonsUsed: number;
  heldBy: DefenderRuntime | null;
  attackCd: number;
}

interface ProjectileRuntime {
  kind: 'arrow' | 'ember';
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  target: CreatureRuntime;
  progress: number;
  duration: number;
  dmg: number;
  splashRadius?: number;
}

interface SpawnTicket {
  type: CreatureType;
  at: number;
  hpMult: number;
}

type PlanAction =
  | { kind: 'build'; planIndex: number; buyBeforeWave: number; order: number }
  | { kind: 'upgrade'; planIndex: number; level?: 2 | 3; spec?: 'a' | 'b'; buyBeforeWave: number; order: number }
  | { kind: 'sell'; planIndex: number; buyBeforeWave: number; order: number };

// --- Deterministic PRNG (Mulberry32) ---

function createRng(seed: number): () => number {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- SmoothPath (copied exactly from CanvasBattleEngine.ts lines 282-381) ---

class SmoothPath {
  private samples: Vec2[] = [];
  private cumLen: number[] = [];
  public totalLen = 1;

  constructor(uvs: [number, number][]) {
    const pts = uvs.map(([u, v]) => ({ x: u * MAP_W, y: v * MAP_H }));
    const stepsPerSeg = 20;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let st = 0; st < stepsPerSeg; st++) {
        const t = st / stepsPerSeg;
        this.samples.push(this.catmullRom(p0, p1, p2, p3, t));
      }
    }
    this.samples.push(pts[pts.length - 1]);

    let acc = 0;
    this.cumLen.push(0);
    for (let i = 1; i < this.samples.length; i++) {
      const dx = this.samples[i].x - this.samples[i - 1].x;
      const dy = this.samples[i].y - this.samples[i - 1].y;
      acc += Math.hypot(dx, dy);
      this.cumLen.push(acc);
    }
    this.totalLen = Math.max(1, acc);
  }

  private catmullRom(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
    const t2 = t * t;
    const t3 = t2 * t;
    return {
      x:
        0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      y:
        0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    };
  }

  pointAt(s: number): { x: number; y: number; tx: number; ty: number } {
    const clamped = Math.max(0, Math.min(1, s));
    const target = clamped * this.totalLen;
    let lo = 0;
    let hi = this.cumLen.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (this.cumLen[mid] <= target) lo = mid;
      else hi = mid;
    }
    const segLen = Math.max(0.0001, this.cumLen[hi] - this.cumLen[lo]);
    const frac = (target - this.cumLen[lo]) / segLen;
    const a = this.samples[lo];
    const b = this.samples[hi];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    return {
      x: a.x + dx * frac,
      y: a.y + dy * frac,
      tx: dx / d,
      ty: dy / d,
    };
  }

  nearestS(x: number, y: number): number {
    return this.nearestPoint(x, y).s;
  }

  nearestPoint(x: number, y: number): { x: number; y: number; s: number; dist: number } {
    let bestIdx = 0;
    let bestD2 = Infinity;
    for (let i = 0; i < this.samples.length; i++) {
      const dx = this.samples[i].x - x;
      const dy = this.samples[i].y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        bestIdx = i;
      }
    }
    const pt = this.samples[bestIdx];
    return {
      x: pt.x,
      y: pt.y,
      s: this.cumLen[bestIdx] / this.totalLen,
      dist: Math.sqrt(bestD2),
    };
  }
}

// --- Reading & Pattern Helpers (matching RuneForgePanel.tsx & metrics.ts) ---

function getWordPattern(entry: WordEntry, fallback: PatternKey): PatternKey {
  if (entry.pattern) return entry.pattern;
  const m = entry.w.match(/[aeiou]/);
  return (m ? m[0] : fallback) as PatternKey;
}

// --- Headless Battle Simulator ---

// Immutable per-level path cache for fast repeated simulations
const PATH_CACHE = new Map<string, SmoothPath>();
const RIVER_PATH_CACHE = new Map<string, SmoothPath | null>();

function getCachedPath(level: LevelConfig): SmoothPath {
  let cached = PATH_CACHE.get(level.id);
  if (!cached) {
    cached = new SmoothPath(level.pathUv);
    PATH_CACHE.set(level.id, cached);
  }
  return cached;
}

function getCachedRiverPath(level: LevelConfig): SmoothPath | null {
  if (!RIVER_PATH_CACHE.has(level.id)) {
    RIVER_PATH_CACHE.set(level.id, level.riverUv.length >= 2 ? new SmoothPath(level.riverUv) : null);
  }
  return RIVER_PATH_CACHE.get(level.id) ?? null;
}

class HeadlessBattleSim {
  private readonly level: LevelConfig;
  private readonly difficulty: DifficultyId;
  private readonly accuracy: number;
  private readonly dt: number;
  private readonly readMode: 'speak' | 'tap';
  private readonly playBonusSurge: boolean;
  private readonly maxWaves: number;
  private readonly maxWaveDuration: number;
  private readonly strictBuildOrder: boolean;
  private readonly validatePlacement: boolean;
  private readonly dial: { healthPct: number; speedPct: number; countPct: number; extraWords: number };
  private readonly overrideBalanceScale?: number;
  private readonly rng: () => number;

  private readonly path: SmoothPath;
  private readonly riverPath: SmoothPath | null;
  private readonly riftPos: Vec2;
  private readonly campPos: Vec2;
  private readonly wardenPos: Vec2;

  private pads: PadRuntime[] = [];
  private defenders: DefenderRuntime[] = [];
  private defendersByPlan = new Map<number, DefenderRuntime>();
  private creatures: CreatureRuntime[] = [];
  private projectiles: ProjectileRuntime[] = [];
  private spawnQueue: SpawnTicket[] = [];
  private idCounter = 1;

  // Gameplay state
  private crystals: number;
  private anchor: number;
  private wave = 0;
  private finalWave = false;
  private bankedWin = false;
  private bankedStars = 0;
  private bankedAnchor = 0;
  private bonusActive = false;
  private bonusWave = 0;
  private bonusWavesCleared = 0;
  private bonusAnchorFell = false;
  private waveClock = 0;
  private kills = 0;
  private shards = 0;
  private done = false;
  private win = false;
  private outcome: 'win' | 'loss' | 'max_waves' | 'wave_timeout' = 'loss';

  // Per-wave telemetry counters
  private waveKills = 0;
  private waveKillCrystals = 0;

  // Forge reading & lock state
  private streak = 0;
  private totalWordsRead = 0;
  private totalCleanReads = 0;
  private megaForges = 0;
  private recentWords: string[] = [];
  private patternReads = new Map<PatternKey, boolean[]>();
  private sealedLocks = new Set<PatternKey>();
  private locksReady = false;

  // Tower plan state
  private readonly plan: TowerPlanItem[];
  private pendingActions: PlanAction[] = [];
  private placementWarnings: string[] = [];
  private waveSnapshots: WaveSnapshot[] = [];

  constructor(input: SimInput) {
    const level = LEVELS[input.levelId];
    if (!level) {
      throw new Error(`Unknown levelId "${input.levelId}". Available: ${Object.keys(LEVELS).join(', ')}`);
    }

    this.level = level;
    this.difficulty = input.difficulty;
    this.accuracy = Math.max(0, Math.min(1, input.readingAccuracy));
    this.dt = input.dt && input.dt > 0 ? input.dt : 0.05;
    this.readMode = input.readMode ?? 'speak';
    this.playBonusSurge = Boolean(input.playBonusSurge);
    this.maxWaves = input.maxWaves ?? 25;
    this.maxWaveDuration = input.maxWaveDuration ?? 600;
    this.strictBuildOrder = input.strictBuildOrder ?? true;
    this.validatePlacement = input.validatePlacement ?? true;
    this.dial = {
      healthPct: input.dials?.healthPct ?? 100,
      speedPct: input.dials?.speedPct ?? 100,
      countPct: input.dials?.countPct ?? 100,
      extraWords: input.dials?.extraWords ?? 0,
    };
    this.overrideBalanceScale = input.overrideBalanceScale;
    this.rng = createRng(input.seed ?? 1);

    this.crystals = input.overrideStartCrystals ?? level.startCrystals;
    this.anchor = level.anchor;

    this.path = getCachedPath(level);
    this.riverPath = getCachedRiverPath(level);
    this.riftPos = { x: level.riftUv[0] * MAP_W, y: level.riftUv[1] * MAP_H };
    this.campPos = { x: level.campUv[0] * MAP_W, y: level.campUv[1] * MAP_H };
    this.wardenPos = { x: level.wardenUv[0] * MAP_W, y: level.wardenUv[1] * MAP_H };

    for (const pat of level.vowels) {
      this.patternReads.set(pat, []);
    }

    this.plan = input.towerPlan;
    this.initPads();
    this.buildActionQueue();
  }

  private initPads() {
    // CanvasBattleEngine.ts lines 539-556
    if (this.level.freePlacement) {
      this.pads = [];
      return;
    }
    this.pads = this.level.pads.map((p) => {
      const x = p.u * MAP_W;
      const y = p.v * MAP_H;
      return {
        id: p.id,
        kind: p.kind,
        x,
        y,
        s: p.kind === 'trail' ? this.path.nearestS(x, y) : 0,
        def: null,
      };
    });
  }

  private buildActionQueue() {
    const actions: PlanAction[] = [];
    let order = 0;

    for (let i = 0; i < this.plan.length; i++) {
      const item = this.plan[i];
      const buildWave = Math.max(1, item.buyBeforeWave ?? 1);
      actions.push({
        kind: 'build',
        planIndex: i,
        buyBeforeWave: buildWave,
        order: order++,
      });

      if (item.upgrades && item.upgrades.length > 0) {
        for (const up of item.upgrades) {
          actions.push({
            kind: 'upgrade',
            planIndex: i,
            level: up.level,
            spec: up.spec,
            buyBeforeWave: Math.max(buildWave, up.buyBeforeWave ?? buildWave),
            order: order++,
          });
        }
      }

      if (item.sellBeforeWave !== undefined) {
        actions.push({
          kind: 'sell',
          planIndex: i,
          buyBeforeWave: Math.max(buildWave + 1, item.sellBeforeWave),
          order: order++,
        });
      }
    }

    const kindRank = (k: PlanAction['kind']) => (k === 'sell' ? 0 : k === 'build' ? 1 : 2);
    actions.sort(
      (a, b) =>
        a.buyBeforeWave - b.buyBeforeWave ||
        kindRank(a.kind) - kindRank(b.kind) ||
        a.order - b.order
    );
    this.pendingActions = actions;
  }

  // --- Geometry & Placement Validation (CanvasBattleEngine.ts lines 699-836) ---

  private isInsideNoBuildPoly(
    wx: number,
    wy: number,
    points: [number, number][],
    marginPx = 12
  ): boolean {
    if (points.length < 3) return false;
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i][0] * MAP_W;
      const yi = points[i][1] * MAP_H;
      const xj = points[j][0] * MAP_W;
      const yj = points[j][1] * MAP_H;

      const dx = xj - xi;
      const dy = yj - yi;
      const lenSq = dx * dx + dy * dy;
      const t = lenSq > 0 ? Math.max(0, Math.min(1, ((wx - xi) * dx + (wy - yi) * dy) / lenSq)) : 0;
      const dist = Math.hypot(wx - (xi + t * dx), wy - (yi + t * dy));
      if (dist < marginPx) return true;

      const intersect = yi > wy !== yj > wy && wx < ((xj - xi) * (wy - yi)) / (yj - yi + 1e-9) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  private evaluateFreePlacement(
    wx: number,
    wy: number,
    type: DefenderType
  ): { x: number; y: number; s: number; valid: boolean; reason?: string; kind: 'tower' | 'trail' } {
    const cfg = DEFENDERS[type];
    const nearest = this.path.nearestPoint(wx, wy);

    if (cfg.kind === 'trail') {
      const px = nearest.x;
      const py = nearest.y;
      const u = px / MAP_W;
      const v = py / MAP_H;
      if (nearest.dist > 68) {
        return { x: wx, y: wy, s: nearest.s, valid: false, reason: 'Place on trail', kind: 'trail' };
      }
      if (u < 0.36 && v > 0.81) {
        return { x: px, y: py, s: nearest.s, valid: false, reason: 'Keep HUD clear', kind: 'trail' };
      }
      if (Math.hypot(px - this.riftPos.x, py - this.riftPos.y) < 70) {
        return { x: px, y: py, s: nearest.s, valid: false, reason: 'Too close to Rift', kind: 'trail' };
      }
      if (Math.hypot(px - this.campPos.x, py - this.campPos.y) < 76) {
        return { x: px, y: py, s: nearest.s, valid: false, reason: 'Too close to Anchor', kind: 'trail' };
      }
      for (const def of this.defenders) {
        if (def.pad.kind === 'trail' && Math.hypot(px - def.pad.x, py - def.pad.y) < 46) {
          return { x: px, y: py, s: nearest.s, valid: false, reason: 'Space occupied', kind: 'trail' };
        }
      }
      return { x: px, y: py, s: nearest.s, valid: true, kind: 'trail' };
    }

    const u = wx / MAP_W;
    const v = wy / MAP_H;
    if (u < 0.045 || u > 0.945 || v < 0.095 || v > 0.905) {
      return { x: wx, y: wy, s: 0, valid: false, reason: 'Outside map', kind: 'tower' };
    }
    if ((u < 0.36 && v > 0.79) || (u < 0.24 && v < 0.12)) {
      return { x: wx, y: wy, s: 0, valid: false, reason: 'Keep HUD clear', kind: 'tower' };
    }
    if (nearest.dist < 36) {
      return { x: wx, y: wy, s: 0, valid: false, reason: 'Too close to trail', kind: 'tower' };
    }
    if (this.riverPath && this.riverPath.nearestPoint(wx, wy).dist < 46) {
      return {
        x: wx,
        y: wy,
        s: 0,
        valid: false,
        reason: this.level.worldId === 'w2' ? 'Molten lava' : 'Over water',
        kind: 'tower',
      };
    }
    if (Math.hypot(wx - this.riftPos.x, wy - this.riftPos.y) < 72) {
      return { x: wx, y: wy, s: 0, valid: false, reason: 'Too close to Rift', kind: 'tower' };
    }
    if (Math.hypot(wx - this.campPos.x, wy - this.campPos.y) < 78) {
      return { x: wx, y: wy, s: 0, valid: false, reason: 'Too close to Anchor', kind: 'tower' };
    }
    if (Math.hypot(wx - this.wardenPos.x, wy - this.wardenPos.y) < 48) {
      return { x: wx, y: wy, s: 0, valid: false, reason: 'Too close to Warden', kind: 'tower' };
    }
    if (this.level.noBuildZones) {
      for (const z of this.level.noBuildZones) {
        if (Math.hypot(wx - z.u * MAP_W, wy - z.v * MAP_H) < z.r * MAP_W) {
          return { x: wx, y: wy, s: 0, valid: false, reason: z.label || 'Blocked terrain', kind: 'tower' };
        }
      }
    }
    if (this.level.noBuildPolys) {
      for (const poly of this.level.noBuildPolys) {
        if (this.isInsideNoBuildPoly(wx, wy, poly.points, 12)) {
          return { x: wx, y: wy, s: 0, valid: false, reason: poly.label || 'Blocked terrain', kind: 'tower' };
        }
      }
    }
    for (const def of this.defenders) {
      if (Math.hypot(wx - def.pad.x, wy - def.pad.y) < 48) {
        return { x: wx, y: wy, s: 0, valid: false, reason: 'Space occupied', kind: 'tower' };
      }
    }
    return { x: wx, y: wy, s: 0, valid: true, kind: 'tower' };
  }

  private resolvePadForPlan(item: TowerPlanItem): PadRuntime | null {
    const cfg = DEFENDERS[item.type];
    const pos = item.position;

    let wx: number;
    let wy: number;

    if (typeof pos === 'string' || 'padId' in pos) {
      const padId = typeof pos === 'string' ? pos : pos.padId;
      if (!this.level.freePlacement) {
        const pad = this.pads.find((p) => p.id === padId);
        if (!pad) {
          this.placementWarnings.push(`Pad "${padId}" not found on level "${this.level.id}".`);
          return null;
        }
        if (pad.def) {
          this.placementWarnings.push(`Pad "${padId}" is already occupied.`);
          return null;
        }
        if (this.validatePlacement && pad.kind !== cfg.kind) {
          this.placementWarnings.push(`Pad "${padId}" (${pad.kind}) cannot hold ${item.type} (${cfg.kind}).`);
          return null;
        }
        return pad;
      }
      // On free-placement levels, still allow referencing coordinates from level.pads by id
      const spec = this.level.pads.find((p) => p.id === padId);
      if (!spec) {
        this.placementWarnings.push(`Pad "${padId}" not found in level "${this.level.id}" pads.`);
        return null;
      }
      wx = spec.u * MAP_W;
      wy = spec.v * MAP_H;
    } else {
      wx = 'u' in pos ? pos.u * MAP_W : pos.x;
      wy = 'v' in pos ? pos.v * MAP_H : pos.y;
    }

    if (!this.level.freePlacement) {
      // On fixed-pad levels, match nearest unoccupied compatible pad
      let best: PadRuntime | null = null;
      let bestDist = Infinity;
      for (const pad of this.pads) {
        if (pad.def) continue;
        if (this.validatePlacement && pad.kind !== cfg.kind) continue;
        const d = Math.hypot(pad.x - wx, pad.y - wy);
        if (d < bestDist) {
          bestDist = d;
          best = pad;
        }
      }
      if (!best) {
        this.placementWarnings.push(
          `No free ${cfg.kind} pad available for ${item.type} near (${wx.toFixed(0)}, ${wy.toFixed(0)}).`
        );
      }
      return best;
    }

    if (this.validatePlacement) {
      const check = this.evaluateFreePlacement(wx, wy, item.type);
      if (!check.valid) {
        this.placementWarnings.push(
          `Invalid free placement for ${item.type} at (${(wx / MAP_W).toFixed(3)}, ${(wy / MAP_H).toFixed(3)}): ${check.reason || 'blocked'}.`
        );
        return null;
      }
      const dynPad: PadRuntime = {
        id: `free-${this.idCounter++}`,
        kind: check.kind,
        x: check.x,
        y: check.y,
        s: check.kind === 'trail' ? check.s : 0,
        def: null,
      };
      this.pads.push(dynPad);
      return dynPad;
    }

    // Unvalidated free placement: still snap trail traps onto path
    const nearest = cfg.kind === 'trail' ? this.path.nearestPoint(wx, wy) : null;
    const dynPad: PadRuntime = {
      id: `free-${this.idCounter++}`,
      kind: cfg.kind,
      x: nearest ? nearest.x : wx,
      y: nearest ? nearest.y : wy,
      s: nearest ? nearest.s : 0,
      def: null,
    };
    this.pads.push(dynPad);
    return dynPad;
  }

  // --- Pre-Wave Reading Model (RuneForgePanel.tsx + metrics.ts + CanvasBattleEngine.ts lines 1098-1111) ---

  private getWordsPerWave(): number {
    // metrics.ts lines 49-56
    return Math.max(3, Math.min(15, this.level.waveEvery + this.dial.extraWords));
  }

  private pickSimulatedWord(): WordEntry {
    // Mirrors RuneForgePanel.tsx lines 320-336
    const wantRune = this.rng() < this.level.runeRate;
    const primaryPool = wantRune && this.level.runes.length > 0 ? this.level.runes : this.level.realWords;
    const pool = primaryPool.length > 0 ? primaryPool : this.level.runes;
    const fresh = pool.filter((w) => !this.recentWords.includes(w.w));
    let candidates = fresh.length > 0 ? fresh : pool;

    const open = this.level.vowels.filter((p) => !this.sealedLocks.has(p));
    if (open.length > 0 && open.length < this.level.vowels.length && this.rng() < 0.75) {
      const focused = candidates.filter((w) => open.includes(getWordPattern(w, this.level.vowels[0])));
      if (focused.length > 0) {
        candidates = focused;
      }
    }

    const chosen = candidates[Math.floor(this.rng() * candidates.length)];
    this.recentWords = [chosen.w, ...this.recentWords].slice(0, 4);
    return chosen;
  }

  private getCurrentReadingAccuracy(): number {
    // Learning reading curve: starts at chosen accuracy, gains +5% after each completed wave,
    // capped at 95% (100% stays 100%).
    if (this.accuracy >= 1) return 1;
    return Math.min(0.95, this.accuracy + this.wave * 0.05);
  }

  private runPreWaveReading(): { readingCrystals: number; lockCrystals: number } {
    const wordsCount = this.getWordsPerWave();
    const curAccuracy = this.getCurrentReadingAccuracy();
    let readingCrystals = 0;
    let lockCrystals = 0;

    for (let i = 0; i < wordsCount; i++) {
      const entry = this.pickSimulatedWord();
      const isRune = entry.kind === 'rune';
      const isClean = this.rng() < curAccuracy;

      this.totalWordsRead += 1;

      let pay: number;
      if (isClean) {
        this.totalCleanReads += 1;
        // Real Forge pay: Rune (25), Speak (18), or Tap (12) — RuneForgePanel.tsx lines 409-414
        pay = isRune
          ? FORGE_CONFIG.rune
          : this.readMode === 'speak'
          ? FORGE_CONFIG.speak
          : FORGE_CONFIG.real;

        // Mega Forge streak — RuneForgePanel.tsx lines 448-456
        this.streak += 1;
        if (this.streak >= FORGE_CONFIG.megaPips) {
          this.streak = 0;
          pay += FORGE_CONFIG.mega;
          this.megaForges += 1;
        }
      } else {
        // Missed word pays helpShare — RuneForgePanel.tsx lines 106-107, 415-421
        const refBase = isRune ? FORGE_CONFIG.rune : FORGE_CONFIG.real;
        pay = Math.round(refBase * FORGE_CONFIG.helpShare);
        this.streak = 0;
      }

      this.crystals += pay;
      readingCrystals += pay;

      // Locks fill from clean reads only (sliding mastery window — metrics.ts lines 589-594, 673-678)
      const pattern = getWordPattern(entry, this.level.vowels[0]);
      if (this.patternReads.has(pattern) && !this.sealedLocks.has(pattern)) {
        const reads = this.patternReads.get(pattern)!;
        reads.push(isClean);
        if (reads.length > 120) reads.shift();

        const win = this.level.mastery.window;
        const need = this.level.mastery.need;
        const slice = reads.slice(-win);
        const cleanInWindow = slice.filter(Boolean).length;
        if (slice.length >= win && cleanInWindow >= need) {
          this.sealedLocks.add(pattern);
          // Lock bonus — CanvasBattleEngine.ts lines 1109-1111
          const bonus = FORGE_CONFIG.lockBonus;
          this.crystals += bonus;
          this.shards += bonus;
          lockCrystals += bonus;
        }
      }

      this.locksReady = this.level.vowels.every((v) => this.sealedLocks.has(v));
    }

    return { readingCrystals, lockCrystals };
  }

  // --- Tower Buying, Upgrading & Selling (CanvasBattleEngine.ts lines 1430-1595) ---

  private executePlanBeforeWave(nextWaveNum: number): {
    spent: number;
    defendersBuilt: number;
    upgradesBought: number;
  } {
    let spent = 0;
    let defendersBuilt = 0;
    let upgradesBought = 0;

    const remaining: PlanAction[] = [];
    let blockedByBudget = false;

    for (const action of this.pendingActions) {
      if (action.buyBeforeWave > nextWaveNum) {
        remaining.push(action);
        continue;
      }
      if (blockedByBudget && this.strictBuildOrder) {
        remaining.push(action);
        continue;
      }

      const item = this.plan[action.planIndex];

      if (action.kind === 'build') {
        const cfg = DEFENDERS[item.type];
        if (this.crystals < cfg.cost) {
          remaining.push(action);
          blockedByBudget = true;
          continue;
        }
        const pad = this.resolvePadForPlan(item);
        if (!pad) {
          // Invalid/occupied placement: drop action so it does not stall the whole queue
          continue;
        }
        const def = this.placeDefender(pad, item.type, action.planIndex, item.targetMode);
        this.defendersByPlan.set(action.planIndex, def);
        spent += cfg.cost;
        defendersBuilt += 1;
      } else if (action.kind === 'upgrade') {
        const def = this.defendersByPlan.get(action.planIndex);
        if (!def) {
          // Tower not yet built; keep waiting if its build is still pending
          const buildStillPending = remaining.some(
            (a) => a.kind === 'build' && a.planIndex === action.planIndex
          );
          if (buildStillPending) {
            remaining.push(action);
            if (this.strictBuildOrder) blockedByBudget = true;
          }
          continue;
        }

        const cfg = DEFENDERS[def.type];
        if (action.spec) {
          // Specialization requires level 3 first
          if (def.level < 3) {
            const upCost = cfg.up[def.level - 1];
            if (this.crystals < upCost) {
              remaining.push(action);
              blockedByBudget = true;
              continue;
            }
            this.upgradeDefenderLevel(def);
            spent += upCost;
            upgradesBought += 1;
            // Re-check if still needs level 3 or spec
            if (def.level < 3) {
              const upCost2 = cfg.up[def.level - 1];
              if (this.crystals < upCost2) {
                remaining.push(action);
                blockedByBudget = true;
                continue;
              }
              this.upgradeDefenderLevel(def);
              spent += upCost2;
              upgradesBought += 1;
            }
          }
          if (!def.spec) {
            const specCost = cfg.spec[action.spec].cost;
            if (this.crystals < specCost) {
              remaining.push(action);
              blockedByBudget = true;
              continue;
            }
            this.specializeDefender(def, action.spec);
            spent += specCost;
            upgradesBought += 1;
          }
        } else if (action.level) {
          const targetLv = Math.min(3, action.level);
          let affordAll = true;
          while (def.level < targetLv) {
            const upCost = cfg.up[def.level - 1];
            if (this.crystals < upCost) {
              affordAll = false;
              break;
            }
            this.upgradeDefenderLevel(def);
            spent += upCost;
            upgradesBought += 1;
          }
          if (!affordAll) {
            remaining.push(action);
            blockedByBudget = true;
          }
        }
      } else if (action.kind === 'sell') {
        const def = this.defendersByPlan.get(action.planIndex);
        if (def) {
          this.sellDefender(def);
          this.defendersByPlan.delete(action.planIndex);
        }
      }
    }

    this.pendingActions = remaining;
    return { spent, defendersBuilt, upgradesBought };
  }

  private placeDefender(
    pad: PadRuntime,
    type: DefenderType,
    planIndex: number,
    targetMode?: TargetPriority
  ): DefenderRuntime {
    // CanvasBattleEngine.ts lines 1572-1595
    const cfg = DEFENDERS[type];
    this.crystals -= cfg.cost;
    const baseStats = cfg.levels[0];
    const def: DefenderRuntime = {
      id: `def-${this.idCounter++}`,
      planIndex,
      type,
      pad,
      level: 1,
      spec: null,
      targetMode: targetMode ?? (type === 'rail' ? 'strong' : 'first'),
      spent: cfg.cost,
      cd: 0,
      freezeCd: 4,
      hp: baseStats.hp || 0,
      maxHp: baseStats.hp || 0,
      downTimer: 0,
      holding: [],
      facingLeft: false,
    };
    pad.def = def;
    this.defenders.push(def);
    return def;
  }

  private upgradeDefenderLevel(def: DefenderRuntime) {
    // CanvasBattleEngine.ts lines 1435-1450
    const cfg = DEFENDERS[def.type];
    const cost = cfg.up[def.level - 1];
    this.crystals -= cost;
    def.spent += cost;
    def.level += 1;
    const st = this.getDefenderStats(def);
    if (st.hp) {
      def.maxHp = st.hp;
      def.hp = st.hp;
    }
  }

  private specializeDefender(def: DefenderRuntime, specChoice: 'a' | 'b') {
    // CanvasBattleEngine.ts lines 1465-1479
    const cfg = DEFENDERS[def.type];
    const sp = cfg.spec[specChoice];
    this.crystals -= sp.cost;
    def.spent += sp.cost;
    def.spec = specChoice;
    const st = this.getDefenderStats(def);
    if (st.hp) {
      def.maxHp = st.hp;
      def.hp = st.hp;
    }
  }

  private sellDefender(def: DefenderRuntime) {
    // CanvasBattleEngine.ts lines 1513-1526
    const refund = Math.round(def.spent * 0.7);
    this.crystals += refund;
    for (const cr of def.holding) {
      cr.heldBy = null;
    }
    def.pad.def = null;
    if (this.level.freePlacement) {
      this.pads = this.pads.filter((p) => p !== def.pad);
    }
    this.defenders = this.defenders.filter((d) => d !== def);
  }

  // --- Core Combat Helpers (CanvasBattleEngine.ts lines 1536-1570) ---

  private getDefenderStats(def: DefenderRuntime): DefenderLevelStats {
    const cfg = DEFENDERS[def.type];
    if (def.spec) {
      return { ...cfg.spec[def.spec].stats };
    }
    return { ...cfg.levels[Math.min(def.level - 1, cfg.levels.length - 1)] };
  }

  private sortTargetsByPriority(
    candidates: CreatureRuntime[],
    mode: TargetPriority,
    preferArmor = false
  ): CreatureRuntime[] {
    if (mode === 'last') {
      return candidates.sort((a, b) => a.s - b.s);
    }
    if (mode === 'strong') {
      return candidates.sort((a, b) => {
        const aCfg = CREATURES[a.type];
        const bCfg = CREATURES[b.type];
        const aBoss = aCfg.isBoss ? 1 : 0;
        const bBoss = bCfg.isBoss ? 1 : 0;
        if (aBoss !== bBoss) return bBoss - aBoss;
        if (preferArmor) {
          const aArmor = (aCfg.armor || 0) > 0 && a.armorShredTimer <= 0 ? 1 : 0;
          const bArmor = (bCfg.armor || 0) > 0 && b.armorShredTimer <= 0 ? 1 : 0;
          if (aArmor !== bArmor) return bArmor - aArmor;
        }
        if (b.hp !== a.hp) return b.hp - a.hp;
        if (b.maxHp !== a.maxHp) return b.maxHp - a.maxHp;
        return b.s - a.s;
      });
    }
    return candidates.sort((a, b) => b.s - a.s);
  }

  // --- Wave Spawning (CanvasBattleEngine.ts lines 1615-1750) ---

  private startNextWave() {
    this.wave += 1;

    let waveDef: WaveDef;
    let hpScale = 1;
    let waveCountMult = 1;

    if (this.bonusActive) {
      this.bonusWave += 1;
      this.finalWave = false;
      const baseIdx = Math.min(
        this.level.waves.length - 1,
        Math.max(0, this.level.waves.length - 3 + (this.bonusWave - 1))
      );
      waveDef = this.level.waves[baseIdx];
      hpScale = (waveDef.hp || 1) * (1.2 + this.bonusWave * 0.22);
      waveCountMult = 1 + this.bonusWave * 0.16;
    } else {
      const waveIdx = Math.min(this.wave - 1, this.level.waves.length - 1);
      waveDef = this.level.waves[waveIdx];
      const extraWaves = Math.max(0, this.wave - this.level.waves.length);
      const extraScale = 1 + extraWaves * this.level.endless.hpStep;
      this.finalWave = this.locksReady && this.wave >= this.level.minWaves;
      hpScale = (waveDef.hp || 1) * extraScale * (this.finalWave ? this.level.finalBoost : 1);
      waveCountMult = extraWaves > 0 ? 1 + extraWaves * this.level.endless.countStep : 1;
    }

    this.waveClock = 0;
    this.spawnQueue = [];
    this.waveKills = 0;
    this.waveKillCrystals = 0;

    const diffCfg = DIFFICULTIES[this.difficulty] || DIFFICULTIES.normal;

    let t = 0.6;
    for (const grp of waveDef.groups) {
      const startAt = grp.delay !== undefined ? Math.max(0.6, grp.delay) : t;
      let cursor = startAt;
      const isBoss = Boolean(CREATURES[grp.type]?.isBoss);
      const baseCount = waveCountMult > 1 ? Math.round(grp.count * waveCountMult) : grp.count;
      const count = isBoss
        ? baseCount
        : Math.max(1, Math.round((baseCount * diffCfg.countMult * this.dial.countPct) / 100));
      for (let i = 0; i < count; i++) {
        this.spawnQueue.push({
          type: grp.type,
          at: cursor,
          hpMult: hpScale,
        });
        cursor += grp.gap;
      }
      t = Math.max(t, cursor + 0.9);
    }
    this.spawnQueue.sort((a, b) => a.at - b.at);
  }

  private spawnCreature(type: CreatureType, hpMult: number, startS = 0, startLane?: number) {
    // CanvasBattleEngine.ts lines 1700-1750
    const cfg = CREATURES[type];
    const diffCfg = DIFFICULTIES[this.difficulty] || DIFFICULTIES.normal;
    const levelScale = this.overrideBalanceScale ?? (this.level.balance?.[this.difficulty] ?? 1);
    const scaledHp = Math.max(
      1,
      Math.round(cfg.hp * hpMult * diffCfg.hpMult * levelScale * (this.dial.healthPct / 100))
    );
    const startPt = this.path.pointAt(startS);
    const lane = startLane !== undefined ? startLane : (this.rng() - 0.5) * 20;
    const nx = -startPt.ty;
    const ny = startPt.tx;

    const cr: CreatureRuntime = {
      id: `cr-${this.idCounter++}`,
      type,
      s: startS,
      lane,
      x: startPt.x + nx * lane,
      y: startPt.y + ny * lane,
      vx: startPt.tx,
      vy: startPt.ty,
      hp: scaledHp,
      maxHp: scaledHp,
      speed: cfg.speed * diffCfg.speedMult * (this.dial.speedPct / 100),
      anchorDmg: cfg.anchor,
      shards: cfg.shards,
      hitDmg: cfg.hit,
      alive: true,
      slowMult: 1,
      slowTimer: 0,
      freezeTimer: 0,
      freezeImmuneTimer: 0,
      pullImmuneTimer: 0,
      armorShredTimer: 0,
      shieldTimer: 0,
      abilityCd: type === 'weaver' ? 2.4 : type === 'ironwarden' ? 4.8 : type === 'galewraith' ? 3.2 : 0,
      dashTimer: 0,
      summonsUsed: 0,
      heldBy: null,
      attackCd: 0.8,
    };
    this.creatures.push(cr);
  }

  // --- Damage, Armor, Resists, Armor Shred, Kill Crystals & Splitters (CanvasBattleEngine.ts lines 1752-1945) ---

  private damageCreature(
    cr: CreatureRuntime,
    dmg: number,
    opts?: {
      armorPierce?: boolean;
      armorShred?: number;
      damageType?: 'arrow' | 'fire' | 'electric' | 'frost' | 'gravity' | 'physical' | 'rail' | 'true';
      isDot?: boolean;
    }
  ) {
    if (!cr.alive) return;
    const cfg = CREATURES[cr.type];
    const baseArmor = cfg.armor || 0;
    const shieldArmor = cr.shieldTimer > 0 ? 0.25 : 0;
    const effectiveArmor = cr.armorShredTimer > 0 ? 0 : Math.min(0.65, baseArmor + shieldArmor);
    const armorActive = effectiveArmor > 0;
    const dType = opts?.damageType || 'physical';

    let typeResist = 0;
    if (dType === 'fire') {
      typeResist = cfg.fireResist || 0;
    } else if (dType === 'electric') {
      typeResist = cfg.electricResist || 0;
    } else if (dType === 'arrow') {
      typeResist = cfg.arrowResist || 0;
    } else if (dType === 'frost') {
      typeResist = cfg.slowResist || 0;
    } else if (dType === 'gravity') {
      typeResist = cfg.gravityResist || 0;
    }

    const armorFactor = armorActive && !opts?.armorPierce && dType !== 'true' ? 1 - effectiveArmor : 1;
    const typeFactor = dType !== 'true' ? 1 - typeResist : 1;
    const totalMult = Math.max(0.22, armorFactor * typeFactor);
    const mitigated = dmg * totalMult;

    if (opts?.isDot) {
      cr.hp -= mitigated;
    } else {
      const rounded = Math.max(1, Math.round(mitigated));
      cr.hp -= rounded;
    }

    if (opts?.armorShred && opts.armorShred > 0) {
      cr.armorShredTimer = Math.max(cr.armorShredTimer, opts.armorShred);
      if (cr.shieldTimer > 0) cr.shieldTimer = 0;
    }

    if (cr.hp <= 0) {
      cr.alive = false;
      if (cr.heldBy) {
        cr.heldBy.holding = cr.heldBy.holding.filter((c) => c !== cr);
        cr.heldBy = null;
      }
      this.kills += 1;
      this.waveKills += 1;
      this.shards += cr.shards;
      this.crystals += cr.shards;
      this.waveKillCrystals += cr.shards;

      if (cfg.splitsInto) {
        const childHpMult = Math.max(1, cr.maxHp / Math.max(1, cfg.hp));
        const count = cfg.splitsInto.count;
        for (let i = 0; i < count; i++) {
          const offset = count === 1 ? 0 : i === 0 ? -18 : 18;
          this.spawnCreature(
            cfg.splitsInto.type,
            childHpMult,
            Math.min(0.95, Math.max(0.02, cr.s)),
            Math.max(-24, Math.min(24, cr.lane + offset))
          );
        }
      }
    }
  }

  // --- Simulation Step (CanvasBattleEngine.ts lines 2156-3256) ---

  private stepWaveTick(dt: number): 'running' | 'wave_cleared' | 'anchor_fell' {
    // Spawn creatures during active wave (lines 2162-2168)
    this.waveClock += dt;
    while (this.spawnQueue.length > 0 && this.spawnQueue[0].at <= this.waveClock) {
      const ticket = this.spawnQueue.shift()!;
      this.spawnCreature(ticket.type, ticket.hpMult);
    }

    // Update creatures (lines 2171-2452)
    for (const cr of this.creatures) {
      if (!cr.alive) continue;

      if (cr.slowTimer > 0) {
        cr.slowTimer -= dt;
        if (cr.slowTimer <= 0) cr.slowMult = 1;
      }
      if (cr.armorShredTimer > 0) {
        cr.armorShredTimer = Math.max(0, cr.armorShredTimer - dt);
      }
      if (cr.shieldTimer > 0) {
        cr.shieldTimer = Math.max(0, cr.shieldTimer - dt);
      }
      if (cr.pullImmuneTimer > 0) {
        cr.pullImmuneTimer = Math.max(0, cr.pullImmuneTimer - dt);
      }
      if (cr.freezeImmuneTimer > 0) {
        cr.freezeImmuneTimer = Math.max(0, cr.freezeImmuneTimer - dt);
      }

      if (cr.freezeTimer > 0) {
        cr.freezeTimer = Math.max(0, cr.freezeTimer - dt);
        continue;
      }

      // Forge Weaver: periodic Golden Forge Pulse heals & shields up to 3 nearby allies (lines 2203-2237)
      if (cr.type === 'weaver') {
        cr.abilityCd -= dt;
        if (cr.abilityCd <= 0) {
          cr.abilityCd = 3.4;
          const auraR = 2.9 * RANGE_UNIT_PX;
          const allies = this.creatures
            .filter(
              (a) =>
                a.alive &&
                a !== cr &&
                Math.hypot(a.x - cr.x, a.y - cr.y) <= auraR
            )
            .sort((a, b) => a.hp / Math.max(1, a.maxHp) - b.hp / Math.max(1, b.maxHp))
            .slice(0, 3);
          for (const ally of allies) {
            const healAmt = Math.max(8, Math.round(ally.maxHp * 0.14));
            ally.hp = Math.min(ally.maxHp, ally.hp + healAmt);
            ally.shieldTimer = Math.max(ally.shieldTimer, 3.0);
          }
        }
      } else if (cr.type === 'ironwarden') {
        // Iron Warden boss: Iron Aegis shield slam + Cinder Imp summons (lines 2238-2278)
        cr.abilityCd -= dt;
        if (cr.abilityCd <= 0) {
          cr.abilityCd = 6.5;
          const slamR = 3.4 * RANGE_UNIT_PX;
          for (const ally of this.creatures) {
            if (!ally.alive || ally === cr) continue;
            if (Math.hypot(ally.x - cr.x, ally.y - cr.y) <= slamR) {
              ally.shieldTimer = Math.max(ally.shieldTimer, 3.5);
            }
          }
          if (cr.summonsUsed < 6 && cr.s > 0.05 && cr.s < 0.88) {
            const count = Math.min(2, 6 - cr.summonsUsed);
            cr.summonsUsed += count;
            for (let k = 0; k < count; k++) {
              this.spawnCreature(
                'cinderimp',
                1.25,
                Math.max(0.01, cr.s - 0.015),
                k === 0 ? -18 : 18
              );
            }
          }
        }
      }

      if (cr.dashTimer > 0) {
        cr.dashTimer = Math.max(0, cr.dashTimer - dt);
      }

      // Gale Wraith wind dash (lines 2297-2316)
      if (cr.type === 'galewraith' && !cr.heldBy) {
        cr.abilityCd -= dt;
        if (cr.abilityCd <= 0 && cr.slowTimer <= 0 && cr.s > 0.04 && cr.s < 0.9) {
          cr.abilityCd = 4.8;
          cr.dashTimer = 1.15;
        }
      }

      // Held in melee combat by a Stone Golem (lines 2318-2340)
      if (cr.heldBy) {
        const golem = cr.heldBy;
        if (golem.downTimer > 0 || !this.defenders.includes(golem)) {
          cr.heldBy = null;
        } else {
          cr.attackCd -= dt;
          if (cr.attackCd <= 0) {
            cr.attackCd = 1.15;
            golem.hp -= cr.hitDmg;
            if (golem.hp <= 0) {
              golem.hp = 0;
              golem.downTimer = 10;
              for (const c of golem.holding) c.heldBy = null;
              golem.holding = [];
            }
          }
          continue;
        }
      }

      // Path movement (lines 2342-2383)
      const prevX = cr.x;
      const prevY = cr.y;
      const dashMult = cr.dashTimer > 0 ? 1.85 : 1;
      cr.s += cr.speed * cr.slowMult * dashMult * PATH_UNIT_FACTOR * dt;

      if (cr.s >= 1) {
        cr.alive = false;
        this.anchor = Math.max(0, this.anchor - cr.anchorDmg);
        if (this.anchor <= 0) {
          return 'anchor_fell';
        }
        continue;
      }

      const pt = this.path.pointAt(cr.s);
      const nx = -pt.ty;
      const ny = pt.tx;
      cr.x = pt.x + nx * cr.lane;
      cr.y = pt.y + ny * cr.lane;
      cr.vx = cr.x - prevX;
      cr.vy = cr.y - prevY;
    }

    this.creatures = this.creatures.filter((c) => c.alive);

    // Update defenders (lines 2455-3106; rateBoost = 1 since hero powers are not cast)
    const rateBoost = 1;
    for (const def of this.defenders) {
      const st = this.getDefenderStats(def);

      if (def.type === 'archer') {
        // Archer Tower (lines 2462-2498)
        def.cd -= dt * rateBoost;
        if (def.cd <= 0) {
          const rangePx = (st.range || 6.8) * RANGE_UNIT_PX;
          const inRange = this.sortTargetsByPriority(
            this.creatures.filter(
              (cr) => cr.alive && Math.hypot(cr.x - def.pad.x, cr.y - def.pad.y) <= rangePx
            ),
            def.targetMode
          );
          const maxShots = st.multi || 1;
          const targets = inRange.slice(0, maxShots);
          if (targets.length > 0) {
            def.cd = 1 / (st.rate || 1.1);
            def.facingLeft = targets[0].x < def.pad.x;
            for (const target of targets) {
              this.projectiles.push({
                kind: 'arrow',
                sx: def.pad.x,
                sy: def.pad.y - 54,
                tx: target.x,
                ty: target.y - 22,
                target,
                progress: 0,
                duration: Math.max(
                  0.16,
                  Math.min(0.42, Math.hypot(target.x - def.pad.x, target.y - def.pad.y) / 760)
                ),
                dmg: st.dmg || 14,
              });
            }
          }
        }
      } else if (def.type === 'ember') {
        // Ember Cannon (lines 2499-2535)
        def.cd -= dt * rateBoost;
        if (def.cd <= 0) {
          const rangePx = (st.range || 6.6) * RANGE_UNIT_PX;
          const inRange = this.sortTargetsByPriority(
            this.creatures.filter(
              (cr) => cr.alive && Math.hypot(cr.x - def.pad.x, cr.y - def.pad.y) <= rangePx
            ),
            def.targetMode
          );
          const target = inRange[0] || null;
          if (target) {
            def.cd = 1 / (st.rate || 0.65);
            def.facingLeft = target.x < def.pad.x;
            this.projectiles.push({
              kind: 'ember',
              sx: def.pad.x,
              sy: def.pad.y - 58,
              tx: target.x,
              ty: target.y - 16,
              target,
              progress: 0,
              duration: Math.max(
                0.28,
                Math.min(0.58, Math.hypot(target.x - def.pad.x, target.y - def.pad.y) / 560)
              ),
              dmg: st.dmg || 22,
              splashRadius: (st.splash || 2.3) * RANGE_UNIT_PX,
            });
          }
        }
      } else if (def.type === 'tesla') {
        // Tesla Spire: Overcharge Beam & Chain Lightning (lines 2536-2691)
        def.cd -= dt * rateBoost;
        if (def.cd <= 0) {
          const rangePx = (st.range || 6.4) * RANGE_UNIT_PX;

          if (st.beamRamp) {
            let target: CreatureRuntime | null = null;
            if (def.beamTargetId) {
              const existing = this.creatures.find(
                (cr) =>
                  cr.alive &&
                  cr.id === def.beamTargetId &&
                  Math.hypot(cr.x - def.pad.x, cr.y - def.pad.y) <= rangePx
              );
              if (existing) target = existing;
            }
            if (!target) {
              const inRange = this.sortTargetsByPriority(
                this.creatures.filter(
                  (cr) => cr.alive && Math.hypot(cr.x - def.pad.x, cr.y - def.pad.y) <= rangePx
                ),
                def.targetMode
              );
              target = inRange[0] || null;
            }

            if (target) {
              if (def.beamTargetId === target.id) {
                def.beamStacks = Math.min(7, (def.beamStacks || 0) + 1);
              } else {
                def.beamTargetId = target.id;
                def.beamStacks = 0;
              }
              const stacks = def.beamStacks || 0;
              const mult = 1 + stacks * st.beamRamp;
              const hitDmg = Math.round((st.dmg || 38) * mult);
              def.cd = 1 / (st.rate || 1.5);
              def.facingLeft = target.x < def.pad.x;
              this.damageCreature(target, hitDmg, { damageType: 'electric' });
            } else {
              def.beamTargetId = null;
              def.beamStacks = 0;
            }
          } else {
            const inRange = this.sortTargetsByPriority(
              this.creatures.filter(
                (cr) => cr.alive && Math.hypot(cr.x - def.pad.x, cr.y - def.pad.y) <= rangePx
              ),
              def.targetMode
            );
            const primary = inRange[0] || null;
            if (primary) {
              def.cd = 1 / (st.rate || 0.9);
              def.facingLeft = primary.x < def.pad.x;

              const maxTargets = Math.max(1, st.chain || 3);
              const chainRangePx = (st.chainRange || 3.4) * RANGE_UNIT_PX;
              const struck: CreatureRuntime[] = [primary];
              const struckIds = new Set<string>([primary.id]);

              while (struck.length < maxTargets) {
                const prev = struck[struck.length - 1];
                let nextTarget: CreatureRuntime | null = null;
                let bestDist = chainRangePx;
                for (const cand of this.creatures) {
                  if (!cand.alive || struckIds.has(cand.id)) continue;
                  const d = Math.hypot(cand.x - prev.x, cand.y - prev.y);
                  if (d <= bestDist) {
                    bestDist = d;
                    nextTarget = cand;
                  }
                }
                if (!nextTarget) break;
                struck.push(nextTarget);
                struckIds.add(nextTarget.id);
              }

              const baseDmg = st.dmg || 20;
              struck.forEach((cr, hopIdx) => {
                const hopMult = Math.max(0.55, Math.pow(0.86, hopIdx));
                const hopDmg = Math.round(baseDmg * hopMult);
                this.damageCreature(cr, hopDmg, { damageType: 'electric' });
              });
            }
          }
        }
      } else if (def.type === 'rail') {
        // Rail Turret: armor pierce, line pierce, armor shred (lines 2692-2805)
        def.cd -= dt * rateBoost;
        if (def.cd <= 0) {
          const rangePx = (st.range || 8.6) * RANGE_UNIT_PX;
          const inRange = this.sortTargetsByPriority(
            this.creatures.filter(
              (cr) => cr.alive && Math.hypot(cr.x - def.pad.x, cr.y - def.pad.y) <= rangePx
            ),
            def.targetMode,
            true
          );
          const primary = inRange[0] || null;
          if (primary) {
            def.cd = 1 / (st.rate || 0.72);
            def.facingLeft = primary.x < def.pad.x;
            const muzzleX = def.pad.x + (def.facingLeft ? -26 : 26);
            const muzzleY = def.pad.y - 62;
            const ty = primary.y - (CREATURES[primary.type].flying ? 34 : 24);
            const dx = primary.x - muzzleX;
            const dy = ty - muzzleY;
            const dist = Math.max(1, Math.hypot(dx, dy));
            const ux = dx / dist;
            const uy = dy / dist;

            const pierceMax = st.pierceCount || 1;
            const hitTargets: CreatureRuntime[] = [primary];

            if (pierceMax > 1) {
              const beamLen = Math.min(rangePx * 1.15, dist + 240);
              const extras: Array<{ cr: CreatureRuntime; proj: number }> = [];
              for (const cand of this.creatures) {
                if (!cand.alive || cand === primary) continue;
                const cy = cand.y - (CREATURES[cand.type].flying ? 34 : 24);
                const rx = cand.x - muzzleX;
                const ry = cy - muzzleY;
                const proj = rx * ux + ry * uy;
                if (proj < 16 || proj > beamLen) continue;
                const perp = Math.abs(rx * -uy + ry * ux);
                if (perp <= 38) {
                  extras.push({ cr: cand, proj });
                }
              }
              extras.sort((a, b) => a.proj - b.proj);
              for (const ex of extras) {
                if (hitTargets.length >= pierceMax) break;
                hitTargets.push(ex.cr);
              }
            }

            const baseDmg = st.dmg || 34;
            hitTargets.forEach((cr, idx) => {
              const hitDmg = idx === 0 ? baseDmg : Math.round(baseDmg * 0.85);
              this.damageCreature(cr, hitDmg, {
                armorPierce: Boolean(st.armorPierce),
                armorShred: st.armorShred,
                damageType: 'rail',
              });
            });
          }
        }
      } else if (def.type === 'spike') {
        // Spike Pit / Blade Pit / Tar Pit: ground-only DoT & optional slow (lines 2806-2831)
        const rangePx = (st.radius || st.range || 2.2) * RANGE_UNIT_PX;
        for (const cr of this.creatures) {
          if (!cr.alive || CREATURES[cr.type].flying) continue;
          if (Math.hypot(cr.x - def.pad.x, cr.y - def.pad.y) <= rangePx) {
            this.damageCreature(cr, (st.dps || 12) * rateBoost * dt, {
              damageType: 'physical',
              isDot: true,
            });
            if (st.slow) {
              const resist = CREATURES[cr.type].slowResist || 0;
              const mult = 1 - st.slow * (1 - resist);
              if (mult < cr.slowMult) cr.slowMult = mult;
              cr.slowTimer = Math.max(cr.slowTimer, 0.45 * (1 - resist * 0.5));
            }
          }
        }
      } else if (def.type === 'gravity') {
        // Gravity Snare / Singularity Well / Stasis Anchor (lines 2832-2958)
        const rangePx = (st.radius || 2.25) * RANGE_UNIT_PX;
        const trapped: CreatureRuntime[] = [];
        for (const cr of this.creatures) {
          if (!cr.alive) continue;
          const cfg = CREATURES[cr.type];
          if (cfg.flying && !st.hitsAir) continue;
          if (Math.hypot(cr.x - def.pad.x, cr.y - def.pad.y) <= rangePx) {
            trapped.push(cr);
            this.damageCreature(cr, (st.dps || 9) * rateBoost * dt, {
              armorPierce: Boolean(st.armorPierce),
              damageType: 'gravity',
              isDot: true,
            });
            if (st.slow) {
              const gravResist = Math.max(cfg.gravityResist || 0, (cfg.slowResist || 0) * 0.55);
              const mult = 1 - st.slow * (1 - gravResist);
              if (mult < cr.slowMult) cr.slowMult = mult;
              cr.slowTimer = Math.max(cr.slowTimer, 0.5 * (1 - gravResist * 0.5));
            }
          }
        }

        // Periodic graviton pull-back pulse (lines 2858-2918)
        def.pullCd = (def.pullCd ?? (st.pullEvery || 3.2)) - dt * rateBoost;
        if (def.pullCd <= 0 && trapped.length > 0) {
          def.pullCd = st.pullEvery || 3.2;
          for (const cr of trapped) {
            const cfg = CREATURES[cr.type];
            const gravResist = cfg.gravityResist || 0;
            if (gravResist < 0.85 && cr.pullImmuneTimer <= 0) {
              const pull =
                (st.pullStrength || 0.018) *
                (1 - gravResist) *
                (cfg.isBoss ? 0.4 : 1);
              if (pull > 0.002) {
                cr.s = Math.max(0.01, cr.s - pull);
                const pt = this.path.pointAt(cr.s);
                const nx = -pt.ty;
                const ny = pt.tx;
                cr.x = pt.x + nx * cr.lane;
                cr.y = pt.y + ny * cr.lane;
                cr.pullImmuneTimer = 5.5;
              }
            }
            if (st.armorShred && st.armorShred > 0) {
              cr.armorShredTimer = Math.max(cr.armorShredTimer, st.armorShred);
              cr.shieldTimer = 0;
            }
          }
        }

        // Stasis Anchor periodic gravity freeze lock (lines 2921-2954)
        if (st.freezeEvery && st.freezeTime) {
          def.freezeCd -= dt * rateBoost;
          if (def.freezeCd <= 0 && trapped.length > 0) {
            def.freezeCd = st.freezeEvery;
            for (const cr of trapped) {
              const cfg = CREATURES[cr.type];
              const resist = Math.max(cfg.gravityResist || 0, cfg.slowResist || 0);
              if (resist >= 0.75) continue;
              if (cr.freezeImmuneTimer > 0) continue;
              const dur = st.freezeTime * (1 - resist * 0.65) * (cfg.isBoss ? 0.45 : 1);
              if (dur >= 0.25) {
                cr.freezeTimer = Math.max(cr.freezeTimer, dur);
                cr.freezeImmuneTimer = dur + 3.5;
              }
            }
          }
        }
      } else if (def.type === 'golem') {
        // Stone Golem / Mountain Golem / Quake Golem (lines 2959-3031)
        if (def.downTimer > 0) {
          def.downTimer = Math.max(0, def.downTimer - dt);
          if (def.downTimer === 0) {
            def.hp = def.maxHp;
          }
          continue;
        }

        def.holding = def.holding.filter((c) => c.alive);
        const holdCap = st.hold || 2;
        if (def.holding.length < holdCap) {
          for (const cr of this.creatures) {
            if (!cr.alive || cr.heldBy || CREATURES[cr.type].flying || def.holding.length >= holdCap) {
              continue;
            }
            if (Math.hypot(cr.x - def.pad.x, cr.y - def.pad.y) <= 68) {
              cr.heldBy = def;
              def.holding.push(cr);
            }
          }
        }

        if (def.holding.length > 0) {
          def.cd -= dt * rateBoost;
          if (def.cd <= 0) {
            def.cd = 1 / (st.rate || 0.85);
            const target = def.holding[0];
            def.facingLeft = target.x < def.pad.x;
            this.damageCreature(target, st.dmg || 16, { damageType: 'physical' });

            if (st.cleave) {
              for (const cr of this.creatures) {
                if (
                  cr.alive &&
                  cr !== target &&
                  !CREATURES[cr.type].flying &&
                  Math.hypot(cr.x - def.pad.x, cr.y - def.pad.y) <= 105
                ) {
                  this.damageCreature(cr, (st.dmg || 16) * 0.65, { damageType: 'physical' });
                }
              }
            }
          }
        } else if (def.hp < def.maxHp) {
          def.hp = Math.min(def.maxHp, def.hp + def.maxHp * 0.08 * dt);
        }
      } else if (def.type === 'frost') {
        // Frost Totem / Glacier Totem / Blizzard Totem (lines 3032-3105)
        const rangePx = (st.range || 3.8) * RANGE_UNIT_PX;
        for (const cr of this.creatures) {
          if (!cr.alive) continue;
          if (Math.hypot(cr.x - def.pad.x, cr.y - def.pad.y) <= rangePx) {
            const resist = CREATURES[cr.type].slowResist || 0;
            const mult = 1 - (st.slow || 0.35) * (1 - resist);
            if (mult < cr.slowMult) cr.slowMult = mult;
            cr.slowTimer = Math.max(cr.slowTimer, 0.45 * (1 - resist * 0.5));
            if (st.dps) {
              this.damageCreature(cr, st.dps * rateBoost * dt, {
                damageType: 'frost',
                isDot: true,
              });
            }
          }
        }
        if (st.freezeEvery) {
          def.freezeCd -= dt * rateBoost;
          if (def.freezeCd <= 0) {
            const victims = this.creatures.filter(
              (c) => c.alive && Math.hypot(c.x - def.pad.x, c.y - def.pad.y) <= rangePx
            );
            if (victims.length > 0) {
              def.freezeCd = st.freezeEvery;
              for (const v of victims) {
                const vCfg = CREATURES[v.type];
                const slowRes = vCfg.slowResist || 0;
                if (slowRes >= 0.75) continue;
                if (v.freezeImmuneTimer > 0) continue;
                const dur = (st.freezeTime || 1.45) * (1 - slowRes * 0.65) * (vCfg.isBoss ? 0.45 : 1);
                if (dur >= 0.25) {
                  v.freezeTimer = Math.max(v.freezeTimer, dur);
                  v.freezeImmuneTimer = dur + 3.5;
                }
              }
            }
          }
        }
      }
    }

    // Update arrows & ember cannon shells (lines 3109-3193)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.target.alive) {
        p.tx = p.target.x;
        p.ty = p.target.y - (p.kind === 'ember' ? 14 : 22);
      }
      p.progress += dt / p.duration;
      if (p.progress >= 1) {
        if (p.kind === 'ember' && p.splashRadius) {
          for (const cr of this.creatures) {
            if (!cr.alive) continue;
            if (Math.hypot(cr.x - p.tx, cr.y - p.ty) <= p.splashRadius) {
              this.damageCreature(cr, p.dmg, { damageType: 'fire' });
            }
          }
        } else {
          if (p.target.alive) {
            this.damageCreature(p.target, p.dmg, { damageType: 'arrow' });
          }
        }
        this.projectiles.splice(i, 1);
      }
    }

    // Check wave completion (line 3196)
    if (this.spawnQueue.length === 0 && this.creatures.length === 0) {
      return 'wave_cleared';
    }
    return 'running';
  }

  public run(): SimResult {
    let wavesCleared = 0;

    while (!this.done && this.wave < this.maxWaves) {
      const nextWaveNum = this.wave + 1;
      const crystalsBeforeReading = this.crystals;
      const anchorBeforeWave = this.anchor;

      // 1. Pre-wave reading round (no reading during waves)
      const { readingCrystals, lockCrystals } = this.runPreWaveReading();

      // 2. Execute tower builds, upgrades & sells scheduled before this wave
      const { spent, defendersBuilt, upgradesBought } = this.executePlanBeforeWave(nextWaveNum);

      // 3. Start wave and run fixed-step combat loop until cleared or anchor falls
      this.startNextWave();
      const wasFinalWave = this.finalWave;
      const wasBonusWave = this.bonusActive;
      const currentBonusWaveNum = this.bonusActive ? this.bonusWave : 0;

      let tickStatus: 'running' | 'wave_cleared' | 'anchor_fell' = 'running';
      let elapsed = 0;
      while (tickStatus === 'running' && elapsed < this.maxWaveDuration) {
        tickStatus = this.stepWaveTick(this.dt);
        elapsed += this.dt;
      }

      let waveBonusAwarded = 0;

      if (tickStatus === 'anchor_fell') {
        // CanvasBattleEngine.ts lines 2365-2371
        if (this.bonusActive && this.bankedWin) {
          this.bonusAnchorFell = true;
          this.win = true;
          this.outcome = 'win';
        } else {
          this.win = false;
          this.outcome = 'loss';
        }
        this.done = true;
      } else if (tickStatus === 'running') {
        this.win = this.bankedWin;
        this.outcome = 'wave_timeout';
        this.done = true;
      } else {
        // Wave cleared — CanvasBattleEngine.ts lines 3196-3255
        wavesCleared += 1;

        // Between-wave recovery while reading next waveEvery words:
        // in-flight projectiles finish, attack cooldowns ready, beams unlock, golems rebuild/regen.
        this.projectiles = [];
        for (const def of this.defenders) {
          def.cd = 0;
          def.beamTargetId = null;
          def.beamStacks = 0;
          def.holding = [];
          if (def.type === 'golem') {
            def.downTimer = 0;
            def.hp = def.maxHp;
          }
        }

        if (this.bonusActive) {
          this.bonusWavesCleared = this.bonusWave;
          if (this.bonusWave >= this.level.bonusSurgeWaves) {
            this.win = true;
            this.outcome = 'win';
            this.done = true;
          } else {
            waveBonusAwarded = 15 + this.wave * 5;
            this.crystals += waveBonusAwarded;
            this.shards += waveBonusAwarded;
          }
        } else if (this.finalWave) {
          const ratio = this.anchor / this.level.anchor;
          this.bankedWin = true;
          this.bankedStars = ratio >= 0.85 ? 3 : ratio >= 0.45 ? 2 : 1;
          this.bankedAnchor = this.anchor;

          if (this.level.bonusSurgeWaves > 0) {
            waveBonusAwarded = 15 + this.wave * 5;
            this.crystals += waveBonusAwarded;
            this.shards += waveBonusAwarded;
            if (this.playBonusSurge) {
              this.bonusActive = true;
              this.bonusWave = 0;
              this.bonusWavesCleared = 0;
              this.finalWave = false;
            } else {
              this.win = true;
              this.outcome = 'win';
              this.done = true;
            }
          } else {
            this.win = true;
            this.outcome = 'win';
            this.done = true;
          }
        } else {
          waveBonusAwarded = 15 + this.wave * 5;
          this.crystals += waveBonusAwarded;
          this.shards += waveBonusAwarded;
        }
      }

      this.waveSnapshots.push({
        wave: this.wave,
        isFinalWave: wasFinalWave,
        isBonusWave: wasBonusWave,
        bonusWaveNum: currentBonusWaveNum,
        anchorAfter: this.anchor,
        anchorLost: anchorBeforeWave - this.anchor,
        crystalsBeforeReading,
        crystalsFromReading: readingCrystals,
        crystalsFromLocks: lockCrystals,
        crystalsSpent: spent,
        crystalsFromKills: this.waveKillCrystals,
        crystalsFromWaveBonus: waveBonusAwarded,
        crystalsAfter: this.crystals,
        kills: this.waveKills,
        durationSec: Math.round(elapsed * 100) / 100,
        locksReady: this.locksReady,
        defendersBuilt,
        upgradesBought,
      });
    }

    if (!this.done) {
      this.win = this.bankedWin;
      this.outcome = this.bankedWin ? 'win' : 'max_waves';
    }

    // Finish battle star & anchor rules — CanvasBattleEngine.ts lines 3405-3411
    const ratio = this.anchor / this.level.anchor;
    const computedStars = !this.win ? 0 : ratio >= 0.85 ? 3 : ratio >= 0.45 ? 2 : 1;
    const finalWin = this.bankedWin || this.win;
    const finalStars = this.bankedWin ? Math.max(this.bankedStars, computedStars) : computedStars;
    const finalAnchor = this.bankedWin && this.bonusAnchorFell ? this.bankedAnchor : this.anchor;
    const bonusTotal = this.level.bonusSurgeWaves;
    const bonusCompleted = this.bonusActive && this.bonusWavesCleared >= bonusTotal && bonusTotal > 0;

    return {
      win: finalWin,
      outcome: this.outcome,
      stars: finalStars,
      levelId: this.level.id,
      difficulty: this.difficulty,
      readingAccuracy: this.accuracy,
      wavesCleared,
      totalWavesRun: this.wave,
      finalAnchor,
      maxAnchor: this.level.anchor,
      finalCrystals: this.crystals,
      totalKills: this.kills,
      totalShards: this.shards,
      totalWordsRead: this.totalWordsRead,
      totalCleanReads: this.totalCleanReads,
      megaForges: this.megaForges,
      locksSealed: Array.from(this.sealedLocks),
      locksReady: this.locksReady,
      bonusWavesCleared: this.bonusActive ? this.bonusWavesCleared : 0,
      bonusTotal,
      bonusCompleted,
      bonusAnchorFell: this.bonusAnchorFell,
      waves: this.waveSnapshots,
      placementWarnings: this.placementWarnings,
    };
  }
}

/**
 * Run a single headless battle simulation at fixed time steps.
 */
export function simulateBattle(input: SimInput): SimResult {
  return new HeadlessBattleSim(input).run();
}
