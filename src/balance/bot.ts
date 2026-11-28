// Headless balance bot for Rift Runners.
// Samples legal placement spots, searches random tower plans, refines the top 20,
// and reports optimal (best), good (75th percentile), and their balance target average.

import {
  CREATURES,
  CreatureType,
  DEFENDERS,
  DefenderType,
  DifficultyId,
  FORGE_CONFIG,
  LevelConfig,
  LevelId,
  LEVELS,
} from '../data/level1';
import {
  ReadingAccuracy,
  SimDials,
  SimResult,
  simulateBattle,
  TargetPriority,
  TowerPlanItem,
  TowerUpgradeStep,
} from './sim';

const MAP_W = 1600;
const MAP_H = 900;
const RANGE_UNIT_PX = 26;

export interface PlacementSpot {
  id: string;
  kind: 'tower' | 'trail';
  u: number;
  v: number;
  x: number;
  y: number;
  /** Nearest normalized path position (0..1). */
  pathS: number;
  /** Reference pad ID on fixed-pad levels or legacy pad positions. */
  padId?: string;
  /** Number of path samples covered within ~7.5 world units (higher = better choke). */
  coverage: number;
}

export interface EvaluatedPlan {
  plan: TowerPlanItem[];
  result: SimResult;
  score: number;
  origin: 'random' | 'refined';
}

export interface MostLeakedInfo {
  type: CreatureType;
  name: string;
  count: number;
  anchorDmg: number;
}

export interface BalanceTargetSummary {
  winRate: number;
  anchorLeft: number;
  anchorPct: number;
  wavesCleared: number;
  score: number;
}

export interface BotSearchInput {
  levelId: LevelId;
  difficulty: DifficultyId;
  readingAccuracy: ReadingAccuracy;
  /** Number of random plans to test before local refinement (minimum 200, default 200). */
  randomPlans?: number;
  /** Number of top plans kept and refined each round (default 20). */
  topK?: number;
  /** Number of refinement rounds on the top plans (default 4). */
  refineRounds?: number;
  /** Small-change mutations tried per top plan per round (default 3). */
  mutationsPerPlan?: number;
  /** Target number of sampled placement spots (clamped to 40..60 on free-placement levels, default 50). */
  targetSpots?: number;
  /** Deterministic PRNG seed for plan generation & simulation (default 1). */
  seed?: number;
  /** Number of distinct word-roll seeds used to evaluate optimal & good plans (default 5). */
  wordRollSeeds?: number;
  /** Whether the robot uses charged Hero Powers (Rally, Meteor, Freeze). Default: true. */
  useHeroPowers?: boolean;
  /** Fixed sim timestep in seconds (default: 0.05). */
  dt?: number;
  /** Clean real-word payout mode (default 'speak'). */
  readMode?: 'speak' | 'tap';
  /** Whether to continue into Bonus Surge waves (default false). */
  playBonusSurge?: boolean;
  /** Optional safety cap on waves simulated (default 25). */
  maxWaves?: number;
  /** Optional builder difficulty dials. */
  dials?: SimDials;
  /** Optional override for level.startCrystals during Balance Lab verification probes. */
  overrideStartCrystals?: number;
  /** Optional override for level.balance[difficulty] during Balance Lab verification probes. */
  overrideBalanceScale?: number;
  /** Allow smaller plan counts strictly for fast suggestion-verification probes. */
  allowFastProbe?: boolean;
  /** Optional progress callback invoked periodically as plans finish evaluating. */
  onProgress?: (completedPlans: number, totalPlans: number) => void;
}

export interface BotSearchReport {
  levelId: LevelId;
  difficulty: DifficultyId;
  readingAccuracy: number;
  spots: PlacementSpot[];
  spotCount: number;
  towerSpotCount: number;
  trailSpotCount: number;
  evaluatedCount: number;
  randomCount: number;
  refinedCount: number;
  wordRollSeeds: number;
  winRateAll: number;
  winRateRandom: number;
  optimal: EvaluatedPlan;
  good: EvaluatedPlan;
  optimalWinRate: number;
  optimalAnchorPct: number;
  goodWinRate: number;
  goodAnchorPct: number;
  mostLeakedCreature?: MostLeakedInfo;
  balanceTarget: BalanceTargetSummary;
  top20: EvaluatedPlan[];
  durationMs: number;
}

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

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

// --- Geometry Helpers (matching CanvasBattleEngine.ts lines 282-381 & 699-836) ---

interface Vec2 {
  x: number;
  y: number;
}

class PathSampler {
  public readonly samples: Vec2[] = [];
  private readonly cumLen: number[] = [];
  public readonly totalLen: number;

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

  countCoveredSamples(x: number, y: number, radiusPx: number): number {
    const r2 = radiusPx * radiusPx;
    let count = 0;
    for (let i = 0; i < this.samples.length; i += 2) {
      const dx = this.samples[i].x - x;
      const dy = this.samples[i].y - y;
      if (dx * dx + dy * dy <= r2) count += 1;
    }
    return count;
  }
}

function isInsideNoBuildPoly(
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

function isLegalFreeSpot(
  level: LevelConfig,
  path: PathSampler,
  riverPath: PathSampler | null,
  wx: number,
  wy: number,
  kind: 'tower' | 'trail'
): { valid: boolean; x: number; y: number; pathS: number } {
  const riftPos = { x: level.riftUv[0] * MAP_W, y: level.riftUv[1] * MAP_H };
  const campPos = { x: level.campUv[0] * MAP_W, y: level.campUv[1] * MAP_H };
  const wardenPos = { x: level.wardenUv[0] * MAP_W, y: level.wardenUv[1] * MAP_H };
  const nearest = path.nearestPoint(wx, wy);

  if (kind === 'trail') {
    const px = nearest.x;
    const py = nearest.y;
    const u = px / MAP_W;
    const v = py / MAP_H;
    if (nearest.dist > 68) return { valid: false, x: wx, y: wy, pathS: nearest.s };
    if (u < 0.36 && v > 0.81) return { valid: false, x: px, y: py, pathS: nearest.s };
    if (Math.hypot(px - riftPos.x, py - riftPos.y) < 70) return { valid: false, x: px, y: py, pathS: nearest.s };
    if (Math.hypot(px - campPos.x, py - campPos.y) < 76) return { valid: false, x: px, y: py, pathS: nearest.s };
    return { valid: true, x: px, y: py, pathS: nearest.s };
  }

  const u = wx / MAP_W;
  const v = wy / MAP_H;
  if (u < 0.045 || u > 0.945 || v < 0.095 || v > 0.905) {
    return { valid: false, x: wx, y: wy, pathS: nearest.s };
  }
  if ((u < 0.36 && v > 0.79) || (u < 0.24 && v < 0.12)) {
    return { valid: false, x: wx, y: wy, pathS: nearest.s };
  }
  if (nearest.dist < 36) return { valid: false, x: wx, y: wy, pathS: nearest.s };
  if (riverPath && riverPath.nearestPoint(wx, wy).dist < 46) {
    return { valid: false, x: wx, y: wy, pathS: nearest.s };
  }
  if (Math.hypot(wx - riftPos.x, wy - riftPos.y) < 72) return { valid: false, x: wx, y: wy, pathS: nearest.s };
  if (Math.hypot(wx - campPos.x, wy - campPos.y) < 78) return { valid: false, x: wx, y: wy, pathS: nearest.s };
  if (Math.hypot(wx - wardenPos.x, wy - wardenPos.y) < 48) return { valid: false, x: wx, y: wy, pathS: nearest.s };
  if (level.noBuildZones) {
    for (const z of level.noBuildZones) {
      if (Math.hypot(wx - z.u * MAP_W, wy - z.v * MAP_H) < z.r * MAP_W) {
        return { valid: false, x: wx, y: wy, pathS: nearest.s };
      }
    }
  }
  if (level.noBuildPolys) {
    for (const poly of level.noBuildPolys) {
      if (isInsideNoBuildPoly(wx, wy, poly.points, 12)) {
        return { valid: false, x: wx, y: wy, pathS: nearest.s };
      }
    }
  }
  return { valid: true, x: wx, y: wy, pathS: nearest.s };
}

// --- 1. Legal Placement Spot Sampling (40 to 60 legal spots along the path) ---

export function samplePlacementSpots(levelId: LevelId, targetCount = 50): PlacementSpot[] {
  const level = LEVELS[levelId];
  if (!level) {
    throw new Error(`Unknown levelId "${levelId}".`);
  }

  const path = new PathSampler(level.pathUv);
  const riverPath = level.riverUv.length >= 2 ? new PathSampler(level.riverUv) : null;
  const coverRadius = 7.5 * RANGE_UNIT_PX;

  // Fixed-pad levels: return every pad defined on the level
  if (!level.freePlacement) {
    return level.pads.map((p) => {
      const x = p.u * MAP_W;
      const y = p.v * MAP_H;
      const nearest = path.nearestPoint(x, y);
      return {
        id: p.id,
        kind: p.kind,
        u: p.u,
        v: p.v,
        x,
        y,
        pathS: nearest.s,
        padId: p.id,
        coverage: path.countCoveredSamples(x, y, coverRadius),
      };
    });
  }

  const clampedTarget = Math.max(40, Math.min(60, Math.round(targetCount)));
  const desiredTrail = Math.min(18, Math.max(12, Math.round(clampedTarget * 0.3)));
  const desiredTower = clampedTarget - desiredTrail;

  const towerCandidates: PlacementSpot[] = [];
  const trailCandidates: PlacementSpot[] = [];

  const pushUnique = (
    list: PlacementSpot[],
    spot: PlacementSpot,
    minDist: number
  ) => {
    for (const existing of list) {
      if (Math.hypot(existing.x - spot.x, existing.y - spot.y) < minDist) {
        return;
      }
    }
    list.push(spot);
  };

  // Seed with any legacy level.pads coordinates that are legal under free-placement rules
  for (const p of level.pads) {
    const wx = p.u * MAP_W;
    const wy = p.v * MAP_H;
    const check = isLegalFreeSpot(level, path, riverPath, wx, wy, p.kind);
    if (check.valid) {
      const spot: PlacementSpot = {
        id: `pad-${p.id}`,
        kind: p.kind,
        u: check.x / MAP_W,
        v: check.y / MAP_H,
        x: check.x,
        y: check.y,
        pathS: check.pathS,
        padId: p.id,
        coverage: path.countCoveredSamples(check.x, check.y, coverRadius),
      };
      if (p.kind === 'trail') pushUnique(trailCandidates, spot, 48);
      else pushUnique(towerCandidates, spot, 50);
    }
  }

  // Sample trail spots evenly along the path
  const trailSteps = 44;
  for (let i = 0; i <= trailSteps; i++) {
    const s = 0.05 + (0.9 * i) / trailSteps;
    const pt = path.pointAt(s);
    const check = isLegalFreeSpot(level, path, riverPath, pt.x, pt.y, 'trail');
    if (check.valid) {
      pushUnique(
        trailCandidates,
        {
          id: `tr-${trailCandidates.length + 1}`,
          kind: 'trail',
          u: check.x / MAP_W,
          v: check.y / MAP_H,
          x: check.x,
          y: check.y,
          pathS: check.pathS,
          coverage: path.countCoveredSamples(check.x, check.y, 2.5 * RANGE_UNIT_PX),
        },
        48
      );
    }
  }

  // Sample tower spots on both sides of the path at multiple tactical distances
  const towerSteps = 42;
  const offsets = [50, 82, 118, 156];
  for (const offset of offsets) {
    for (let i = 0; i <= towerSteps; i++) {
      const s = 0.04 + (0.92 * i) / towerSteps;
      const pt = path.pointAt(s);
      const nx = -pt.ty;
      const ny = pt.tx;
      for (const side of [-1, 1]) {
        const wx = pt.x + nx * offset * side;
        const wy = pt.y + ny * offset * side;
        const check = isLegalFreeSpot(level, path, riverPath, wx, wy, 'tower');
        if (check.valid) {
          pushUnique(
            towerCandidates,
            {
              id: `tw-${towerCandidates.length + 1}`,
              kind: 'tower',
              u: check.x / MAP_W,
              v: check.y / MAP_H,
              x: check.x,
              y: check.y,
              pathS: check.pathS,
              coverage: path.countCoveredSamples(check.x, check.y, coverRadius),
            },
            50
          );
        }
      }
    }
  }

  // Select well-spread high-coverage spots to hit targetCount (40..60)
  const selectSpread = (candidates: PlacementSpot[], limit: number, minGap: number): PlacementSpot[] => {
    if (candidates.length <= limit) return [...candidates];
    const sorted = [...candidates].sort((a, b) => b.coverage - a.coverage || a.pathS - b.pathS);
    const chosen: PlacementSpot[] = [];

    // First pass: maximize coverage while keeping healthy separation
    for (const c of sorted) {
      if (chosen.length >= limit) break;
      const tooClose = chosen.some((o) => Math.hypot(o.x - c.x, o.y - c.y) < minGap);
      if (!tooClose) chosen.push(c);
    }
    // Second pass: fill remaining slots up to limit if needed
    for (const c of sorted) {
      if (chosen.length >= limit) break;
      if (!chosen.includes(c)) chosen.push(c);
    }
    return chosen;
  };

  // Sort trail spots evenly along pathS
  trailCandidates.sort((a, b) => a.pathS - b.pathS);
  const pickedTrails: PlacementSpot[] = [];
  if (trailCandidates.length <= desiredTrail) {
    pickedTrails.push(...trailCandidates);
  } else {
    for (let i = 0; i < desiredTrail; i++) {
      const idx = Math.min(
        trailCandidates.length - 1,
        Math.round((i * (trailCandidates.length - 1)) / Math.max(1, desiredTrail - 1))
      );
      const cand = trailCandidates[idx];
      if (!pickedTrails.includes(cand)) pickedTrails.push(cand);
    }
  }

  const remainingForTowers = Math.max(desiredTower, clampedTarget - pickedTrails.length);
  const pickedTowers = selectSpread(towerCandidates, remainingForTowers, 62);

  // If still below 40, top up from any unused legal trail or tower candidates
  const combined: PlacementSpot[] = [...pickedTowers, ...pickedTrails];
  if (combined.length < 40) {
    for (const c of [...towerCandidates, ...trailCandidates]) {
      if (combined.length >= 40) break;
      if (!combined.includes(c)) combined.push(c);
    }
  }

  return combined.slice(0, 60);
}

// --- 4. Plan Scoring (win first, then Anchor health left) ---

export function scorePlan(result: SimResult): number {
  const winScore = result.win ? 1_000_000 : 0;
  const anchorScore = result.finalAnchor * 1_000;
  // Tie-breakers for search gradient among 0-HP losses or identical-HP wins
  const waveScore = result.wavesCleared * 10;
  const crystalTie = Math.min(9.99, result.finalCrystals * 0.0001);
  return winScore + anchorScore + waveScore + crystalTie;
}

// --- 2. Plan Representation, Random Generation & Small Mutations ---

interface InternalTowerGene {
  type: DefenderType;
  spot: PlacementSpot;
  buyBeforeWave: number;
  lv2Wave: number | null;
  lv3Wave: number | null;
  spec: 'a' | 'b' | null;
  specWave: number | null;
  targetMode: TargetPriority;
}

function canPlaceAtSpot(
  spot: PlacementSpot,
  existing: InternalTowerGene[],
  ignoreIndex = -1
): boolean {
  const minDist = spot.kind === 'trail' ? 46 : 48;
  for (let i = 0; i < existing.length; i++) {
    if (i === ignoreIndex) continue;
    const other = existing[i].spot;
    if (other.id === spot.id) return false;
    if (other.kind === spot.kind && Math.hypot(other.x - spot.x, other.y - spot.y) < minDist) {
      return false;
    }
  }
  return true;
}

function normalizeGeneTiming(gene: InternalTowerGene, maxPlanWave: number): void {
  gene.buyBeforeWave = Math.max(1, Math.min(maxPlanWave, gene.buyBeforeWave));
  if (gene.lv2Wave !== null) {
    gene.lv2Wave = Math.max(gene.buyBeforeWave, Math.min(maxPlanWave, gene.lv2Wave));
  }
  if (gene.lv3Wave !== null) {
    if (gene.lv2Wave === null) gene.lv2Wave = gene.buyBeforeWave;
    gene.lv3Wave = Math.max(gene.lv2Wave, Math.min(maxPlanWave, gene.lv3Wave));
  }
  if (gene.spec !== null) {
    if (gene.lv2Wave === null) gene.lv2Wave = gene.buyBeforeWave;
    if (gene.lv3Wave === null) gene.lv3Wave = gene.lv2Wave;
    gene.specWave = Math.max(
      gene.lv3Wave,
      Math.min(maxPlanWave, gene.specWave ?? gene.lv3Wave)
    );
  } else {
    gene.specWave = null;
  }
}

function genesToTowerPlan(genes: InternalTowerGene[], freePlacement: boolean): TowerPlanItem[] {
  return genes.map((g, idx) => {
    const upgrades: TowerUpgradeStep[] = [];
    if (g.lv2Wave !== null) {
      upgrades.push({ level: 2, buyBeforeWave: g.lv2Wave });
    }
    if (g.lv3Wave !== null) {
      upgrades.push({ level: 3, buyBeforeWave: g.lv3Wave });
    }
    if (g.spec !== null && g.specWave !== null) {
      upgrades.push({ spec: g.spec, buyBeforeWave: g.specWave });
    }
    return {
      id: `bot-${idx + 1}`,
      type: g.type,
      position: !freePlacement && g.spot.padId ? g.spot.padId : { u: g.spot.u, v: g.spot.v },
      buyBeforeWave: g.buyBeforeWave,
      upgrades: upgrades.length > 0 ? upgrades : undefined,
      targetMode: g.targetMode,
    };
  });
}

function cloneGenes(genes: InternalTowerGene[]): InternalTowerGene[] {
  return genes.map((g) => ({ ...g }));
}

// --- Counter-Aware Wave Analysis & Skilled Student Buying ---

interface WaveCreatureEntry {
  type: CreatureType;
  count: number;
}

interface WaveThreatProfile {
  wave: number;
  entries: WaveCreatureEntry[];
  totalCount: number;
  hasFlying: boolean;
  flyingTypes: CreatureType[];
  hasArmored: boolean;
  armoredTypes: CreatureType[];
  hasSwarm: boolean;
  swarmTypes: CreatureType[];
  hasBoss: boolean;
  resistedTypes: CreatureType[];
  highSlowResist: boolean;
  highGravityResist: boolean;
}

function analyzeWaveThreats(level: LevelConfig, waveNum: number): WaveThreatProfile {
  const waveDef = level.waves[Math.min(waveNum - 1, level.waves.length - 1)];
  const countMap = new Map<CreatureType, number>();
  let totalCount = 0;
  let maxGroupCount = 0;

  for (const grp of waveDef.groups) {
    countMap.set(grp.type, (countMap.get(grp.type) || 0) + grp.count);
    totalCount += grp.count;
    if (grp.count > maxGroupCount) maxGroupCount = grp.count;
  }

  const entries: WaveCreatureEntry[] = Array.from(countMap.entries()).map(([type, count]) => ({
    type,
    count,
  }));

  const flyingTypes: CreatureType[] = [];
  const armoredTypes: CreatureType[] = [];
  const swarmTypes: CreatureType[] = [];
  const resistedTypes: CreatureType[] = [];
  let hasBoss = false;
  let slowResWeight = 0;
  let gravResWeight = 0;
  let totalWeight = 0;

  for (const { type, count } of entries) {
    const cfg = CREATURES[type];
    const weight = count * cfg.hp;
    totalWeight += weight;
    slowResWeight += weight * (cfg.slowResist || 0);
    gravResWeight += weight * (cfg.gravityResist || 0);

    if (cfg.flying) flyingTypes.push(type);
    if ((cfg.armor || 0) >= 0.2) armoredTypes.push(type);
    if (cfg.isBoss) hasBoss = true;
    if (
      count >= 5 ||
      type === 'wisp' ||
      type === 'bat' ||
      type === 'cinderimp' ||
      type === 'splitter'
    ) {
      swarmTypes.push(type);
    }
    if (
      (cfg.fireResist || 0) >= 0.25 ||
      (cfg.electricResist || 0) >= 0.25 ||
      (cfg.arrowResist || 0) >= 0.25 ||
      (cfg.slowResist || 0) >= 0.4 ||
      (cfg.gravityResist || 0) >= 0.4
    ) {
      resistedTypes.push(type);
    }
  }

  const hasSwarm = totalCount >= 7 || maxGroupCount >= 5 || swarmTypes.length > 0;
  return {
    wave: waveNum,
    entries,
    totalCount,
    hasFlying: flyingTypes.length > 0,
    flyingTypes,
    hasArmored: armoredTypes.length > 0,
    armoredTypes,
    hasSwarm,
    swarmTypes: swarmTypes.length > 0 ? swarmTypes : entries.map((e) => e.type),
    hasBoss,
    resistedTypes,
    highSlowResist: totalWeight > 0 && slowResWeight / totalWeight >= 0.45,
    highGravityResist: totalWeight > 0 && gravResWeight / totalWeight >= 0.55,
  };
}

function canTowerDamageAir(type: DefenderType): boolean {
  return type === 'archer' || type === 'ember' || type === 'tesla' || type === 'rail';
}

function getTowerResistAgainst(type: DefenderType, creature: CreatureType): number {
  const cfg = CREATURES[creature];
  if (cfg.flying && (type === 'spike' || type === 'golem')) return 1;
  if (type === 'ember') return cfg.fireResist || 0;
  if (type === 'tesla') return cfg.electricResist || 0;
  if (type === 'archer') return cfg.arrowResist || 0;
  if (type === 'frost') return cfg.slowResist || 0;
  if (type === 'gravity') return Math.max(cfg.gravityResist || 0, (cfg.slowResist || 0) * 0.5);
  return 0; // rail, spike, golem have no elemental type resist
}

function getTowerEffectiveness(
  type: DefenderType,
  creatures: CreatureType[],
  preferMulti = false
): number {
  if (creatures.length === 0) return 1;
  let sum = 0;
  let weightSum = 0;
  for (const crType of creatures) {
    const cfg = CREATURES[crType];
    const w = Math.max(20, cfg.hp);
    const resist = getTowerResistAgainst(type, crType);
    if (resist >= 1) {
      weightSum += w;
      continue;
    }
    const armor = cfg.armor || 0;
    const armorFactor = type === 'rail' ? 1 : 1 - armor;
    let eff = Math.max(0.22, armorFactor * (1 - resist));
    if (type === 'frost') eff *= 0.45; // support tower, not primary DPS
    if (type === 'gravity') eff *= 0.65;
    if (preferMulti) {
      if (type === 'tesla' || type === 'ember' || type === 'spike') eff *= 1.35;
      else if (type === 'archer') eff *= 1.1; // Volley specB
    }
    if (armor >= 0.3 && type === 'rail') eff *= 1.45;
    if (cfg.flying && canTowerDamageAir(type)) eff *= 1.15;
    sum += eff * w;
    weightSum += w;
  }
  return weightSum > 0 ? sum / weightSum : 0;
}

function isMultiTargetGene(g: InternalTowerGene): boolean {
  return (
    g.type === 'tesla' ||
    g.type === 'ember' ||
    g.type === 'spike' ||
    (g.type === 'archer' && g.spec === 'b')
  );
}

function isArmorAnswerGene(g: InternalTowerGene): boolean {
  return g.type === 'rail' || (g.type === 'gravity' && g.spec === 'a');
}

function chooseSmartSpec(
  rng: () => number,
  type: DefenderType,
  levelThreats: WaveThreatProfile[]
): 'a' | 'b' {
  const anyHeavyArmor = levelThreats.some((t) =>
    t.armoredTypes.some((c) => (CREATURES[c].armor || 0) >= 0.3)
  );
  const anyBoss = levelThreats.some((t) => t.hasBoss);
  const swarmy = levelThreats.filter((t) => t.hasSwarm).length >= Math.ceil(levelThreats.length * 0.5);

  if (type === 'archer') {
    return swarmy && rng() < 0.72 ? 'b' : rng() < 0.5 ? 'a' : 'b';
  }
  if (type === 'rail') {
    if (anyHeavyArmor || anyBoss) return rng() < 0.72 ? 'b' : 'a';
    return rng() < 0.55 ? 'a' : 'b';
  }
  if (type === 'tesla') {
    if (anyBoss && rng() < 0.45) return 'b';
    return swarmy && rng() < 0.75 ? 'a' : rng() < 0.5 ? 'a' : 'b';
  }
  if (type === 'gravity') {
    if (anyHeavyArmor) return rng() < 0.78 ? 'a' : 'b';
    return rng() < 0.5 ? 'a' : 'b';
  }
  if (type === 'ember') {
    return swarmy && rng() < 0.6 ? 'a' : rng() < 0.5 ? 'b' : 'a';
  }
  return rng() < 0.5 ? 'a' : 'b';
}

function estimateCumulativeBudgetAtWave(
  level: LevelConfig,
  accuracy: number,
  waveNum: number,
  readMode: 'speak' | 'tap',
  startCrystalsOverride?: number
): number {
  const realCleanPay = readMode === 'speak' ? FORGE_CONFIG.speak : FORGE_CONFIG.real;
  const realHelpPay = Math.round(FORGE_CONFIG.real * FORGE_CONFIG.helpShare);
  const runeHelpPay = Math.round(FORGE_CONFIG.rune * FORGE_CONFIG.helpShare);
  const avgClean = (1 - level.runeRate) * realCleanPay + level.runeRate * FORGE_CONFIG.rune;
  const avgMiss = (1 - level.runeRate) * realHelpPay + level.runeRate * runeHelpPay;

  let total = startCrystalsOverride ?? level.startCrystals;
  for (let w = 0; w < waveNum; w++) {
    const waveAcc = accuracy >= 1 ? 1 : Math.min(0.95, accuracy + w * 0.05);
    const perWord = waveAcc * avgClean + (1 - waveAcc) * avgMiss;
    const megaBonus =
      Math.pow(waveAcc, FORGE_CONFIG.megaPips) * (FORGE_CONFIG.mega / FORGE_CONFIG.megaPips);
    total += level.waveEvery * (perWord + megaBonus);
    if (w > 0) {
      // Previous wave bonus + kill crystals estimate
      total += 15 + w * 5 + 75;
    }
  }
  if (waveNum >= 4) {
    total += Math.min(level.vowels.length, waveNum - 3) * FORGE_CONFIG.lockBonus * 0.5;
  }
  return Math.round(total);
}

function pickWeightedCounterType(
  rng: () => number,
  candidates: DefenderType[],
  creatures: CreatureType[],
  preferMulti = false
): DefenderType | null {
  if (candidates.length === 0) return null;
  const scored = candidates
    .map((t) => ({
      type: t,
      score: getTowerEffectiveness(t, creatures, preferMulti),
    }))
    .filter((x) => x.score > 0.05)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return pick(rng, candidates);
  const topScore = scored[0].score;
  const nearTop = scored.filter((x) => x.score >= topScore * 0.72);
  // Strong preference for best counter with slight exploration among good counters
  if (nearTop.length === 1 || rng() < 0.62) {
    return nearTop[0].type;
  }
  return pick(rng, nearTop).type;
}

function generateRandomGenes(
  rng: () => number,
  level: LevelConfig,
  towerSpots: PlacementSpot[],
  trailSpots: PlacementSpot[],
  accuracy: number,
  maxPlanWave: number,
  readMode: 'speak' | 'tap',
  startCrystalsOverride?: number
): InternalTowerGene[] {
  const availableTowers = level.defenders.filter((t) => DEFENDERS[t].kind === 'tower');
  const availableTrails = level.defenders.filter((t) => DEFENDERS[t].kind === 'trail');
  const allAvailable = level.defenders;
  const planHorizon = Math.max(2, Math.min(maxPlanWave, level.waves.length));

  const levelThreats: WaveThreatProfile[] = [];
  for (let w = 1; w <= planHorizon; w++) {
    levelThreats.push(analyzeWaveThreats(level, w));
  }

  // Choose 1 or 2 high-coverage choke anchors for clustered killbox placement (85% of plans)
  const useKillbox = rng() < 0.85;
  const allSpotsSorted = [...towerSpots, ...trailSpots].sort((a, b) => b.coverage - a.coverage);
  const topAnchorCutoff = Math.max(1, Math.ceil(allSpotsSorted.length * 0.4));
  const anchor1 = allSpotsSorted[Math.floor(rng() * topAnchorCutoff)] || allSpotsSorted[0];
  let anchor2: PlacementSpot | null = null;
  if (useKillbox && rng() < 0.38 && allSpotsSorted.length > 4) {
    const farCandidates = allSpotsSorted
      .slice(0, Math.max(4, Math.ceil(allSpotsSorted.length * 0.7)))
      .filter((s) => Math.hypot(s.x - anchor1.x, s.y - anchor1.y) > 180);
    if (farCandidates.length > 0) {
      anchor2 = pick(rng, farCandidates);
    }
  }

  const genes: InternalTowerGene[] = [];

  const pickSpot = (kind: 'tower' | 'trail'): PlacementSpot | null => {
    const pool = (kind === 'trail' ? trailSpots : towerSpots).filter((s) =>
      canPlaceAtSpot(s, genes)
    );
    if (pool.length === 0) return null;

    if (useKillbox && anchor1) {
      const targetAnchor = anchor2 && rng() < 0.3 ? anchor2 : anchor1;
      const byNear = [...pool].sort((a, b) => {
        const da = Math.hypot(a.x - targetAnchor.x, a.y - targetAnchor.y) - a.coverage * 2.4;
        const db = Math.hypot(b.x - targetAnchor.x, b.y - targetAnchor.y) - b.coverage * 2.4;
        return da - db;
      });
      const cutoff = Math.max(1, Math.min(byNear.length, randInt(rng, 2, 5)));
      return byNear[Math.floor(rng() * cutoff)];
    }

    if (rng() < 0.75) {
      const ranked = [...pool].sort((a, b) => b.coverage - a.coverage);
      const cutoff = Math.max(1, Math.ceil(ranked.length * 0.45));
      return ranked[Math.floor(rng() * cutoff)];
    }
    return pick(rng, pool);
  };

  // Strategy archetype: tall (fewer towers, heavier upgrades) vs balanced vs wide
  const archetypeRoll = rng();
  const maxTowers = Math.min(
    towerSpots.length + trailSpots.length,
    archetypeRoll < 0.35 ? 8 : archetypeRoll < 0.78 ? 10 : 12
  );

  let plannedSpent = 0;

  const addTower = (
    type: DefenderType,
    buyBeforeWave: number,
    forcedSpec?: 'a' | 'b'
  ): InternalTowerGene | null => {
    if (genes.length >= maxTowers) return null;
    const spot = pickSpot(DEFENDERS[type].kind);
    if (!spot) return null;
    const defaultMode: TargetPriority = type === 'rail' ? 'strong' : 'first';
    const targetMode: TargetPriority =
      rng() < 0.9 ? defaultMode : pick(rng, ['first', 'strong', 'last'] as const);
    const gene: InternalTowerGene = {
      type,
      spot,
      buyBeforeWave,
      lv2Wave: null,
      lv3Wave: null,
      spec: forcedSpec ?? null,
      specWave: null,
      targetMode,
    };
    if (forcedSpec) {
      gene.lv2Wave = Math.min(planHorizon, buyBeforeWave + 1);
      gene.lv3Wave = Math.min(planHorizon, gene.lv2Wave + 1);
      gene.specWave = Math.min(planHorizon, gene.lv3Wave + 1);
    }
    normalizeGeneTiming(gene, maxPlanWave);
    genes.push(gene);
    plannedSpent += DEFENDERS[type].cost;
    return gene;
  };

  // Walk wave by wave: buy missing counters FIRST, then spend remaining budget on upgrades & support
  for (let w = 1; w <= planHorizon; w++) {
    const threat = levelThreats[w - 1];
    const waveBudget = Math.round(
      estimateCumulativeBudgetAtWave(level, accuracy, w, readMode, startCrystalsOverride) *
        (0.92 + rng() * 0.16)
    );
    const waveCreatureTypes = threat.entries.map((e) => e.type);

    const ownedByWave = () => genes.filter((g) => g.buyBeforeWave <= w);

    // 1. Air-capable counter if any creature flies in this wave
    if (threat.hasFlying) {
      const hasAirAnswer = ownedByWave().some(
        (g) =>
          canTowerDamageAir(g.type) &&
          threat.flyingTypes.some((f) => getTowerResistAgainst(g.type, f) < 0.35)
      );
      if (!hasAirAnswer) {
        const airPool = availableTowers.filter((t) => canTowerDamageAir(t));
        const chosen = pickWeightedCounterType(rng, airPool, threat.flyingTypes, false);
        if (chosen) addTower(chosen, w);
      }
    }

    // 2. Armor answer (Rail Turret or Gravity armorShred) if armored creatures come
    if (threat.hasArmored) {
      const hasArmorAnswer = ownedByWave().some((g) => isArmorAnswerGene(g));
      if (!hasArmorAnswer) {
        if (allAvailable.includes('rail')) {
          addTower('rail', w);
        } else if (allAvailable.includes('gravity')) {
          addTower('gravity', w, 'a');
        } else {
          // Before Rail/Gravity unlock, ensure at least one unresisted high-DPS tower
          const dpsPool = availableTowers.filter((t) => t !== 'frost');
          const chosen = pickWeightedCounterType(rng, dpsPool, threat.armoredTypes, false);
          if (chosen && ownedByWave().filter((g) => g.type === chosen).length === 0) {
            addTower(chosen, w);
          }
        }
      }
    }

    // 3. Multi-target tower (Tesla chain, Ember splash, Volley archer, Spike Pit) for swarms
    if (threat.hasSwarm) {
      const hasSwarmAnswer = ownedByWave().some(
        (g) =>
          isMultiTargetGene(g) &&
          threat.swarmTypes.some((s) => getTowerResistAgainst(g.type, s) < 0.35)
      );
      if (!hasSwarmAnswer) {
        const multiPool = allAvailable.filter(
          (t) => t === 'tesla' || t === 'ember' || t === 'spike' || t === 'archer'
        );
        const chosen = pickWeightedCounterType(rng, multiPool, threat.swarmTypes, true);
        if (chosen) {
          addTower(chosen, w, chosen === 'archer' ? 'b' : undefined);
        }
      }
    }

    // 4. Resistance coverage: ensure at least one owned DPS tower is NOT resisted by each resisted creature
    for (const resCr of threat.resistedTypes) {
      const hasUnresisted = ownedByWave().some(
        (g) =>
          g.type !== 'frost' &&
          g.type !== 'gravity' &&
          getTowerResistAgainst(g.type, resCr) <= 0.15
      );
      if (!hasUnresisted) {
        const unresistedPool = allAvailable.filter(
          (t) =>
            t !== 'frost' &&
            t !== 'gravity' &&
            getTowerResistAgainst(t, resCr) <= 0.15
        );
        const chosen = pickWeightedCounterType(rng, unresistedPool, [resCr], false);
        if (chosen) {
          addTower(chosen, w);
        }
      }
    }

    // Guarantee at least one opening DPS tower on Wave 1 even if Wave 1 has no special traits
    if (w === 1 && genes.length === 0) {
      const dpsPool = allAvailable.filter((t) => t !== 'frost');
      const chosen = pickWeightedCounterType(rng, dpsPool, waveCreatureTypes, threat.hasSwarm);
      if (chosen) addTower(chosen, 1);
    }

    // 5. After missing counters are owned, spend remaining wave budget on upgrades first,
    //    then complementary towers (more DPS counters or non-resisted slow/hold support).
    let safety = 0;
    while (plannedSpent < waveBudget - 45 && safety < 6) {
      safety += 1;
      const upgradeable = ownedByWave().filter((g) => {
        if (g.lv2Wave === null) return true;
        if (g.lv3Wave === null && w >= 2) return true;
        if (g.spec === null && w >= 3) return true;
        return false;
      });

      const wantUpgrade =
        upgradeable.length > 0 &&
        (w >= 2
          ? rng() < (archetypeRoll < 0.35 ? 0.78 : archetypeRoll < 0.78 ? 0.62 : 0.45)
          : genes.length >= 2 && rng() < 0.35);

      if (wantUpgrade) {
        // Prefer upgrading high-effectiveness DPS counters for this wave
        const rankedUp = [...upgradeable].sort((a, b) => {
          const ea = getTowerEffectiveness(a.type, waveCreatureTypes, threat.hasSwarm);
          const eb = getTowerEffectiveness(b.type, waveCreatureTypes, threat.hasSwarm);
          return eb - ea;
        });
        const pickIdx = Math.min(rankedUp.length - 1, Math.floor(rng() * Math.min(3, rankedUp.length)));
        const g = rankedUp[pickIdx];
        const cfg = DEFENDERS[g.type];

        if (g.lv2Wave === null) {
          g.lv2Wave = w;
          plannedSpent += cfg.up[0];
        } else if (g.lv3Wave === null) {
          g.lv3Wave = w;
          plannedSpent += cfg.up[1];
        } else if (g.spec === null) {
          g.spec = chooseSmartSpec(rng, g.type, levelThreats);
          g.specWave = w;
          plannedSpent += cfg.spec[g.spec].cost;
        }
        normalizeGeneTiming(g, maxPlanWave);
      } else if (genes.length < maxTowers) {
        // Add a complementary counter or support tower (avoid slow/gravity if heavily resisted)
        const pool = allAvailable.filter((t) => {
          if (t === 'frost' && threat.highSlowResist) return false;
          if (t === 'gravity' && threat.highGravityResist && !threat.hasArmored) return false;
          if (t === 'spike' && threat.hasFlying && threat.entries.every((e) => CREATURES[e.type].flying)) {
            return false;
          }
          return true;
        });
        const effectivePool = pool.length > 0 ? pool : allAvailable;
        const includeSupport =
          genes.length >= 2 &&
          rng() < 0.28 &&
          effectivePool.some((t) => t === 'frost' || t === 'gravity' || t === 'golem');

        let chosen: DefenderType | null = null;
        if (includeSupport) {
          const supPool = effectivePool.filter(
            (t) =>
              (t === 'frost' && !threat.highSlowResist) ||
              (t === 'gravity' && (!threat.highGravityResist || threat.hasArmored)) ||
              (t === 'golem' && !threat.entries.every((e) => CREATURES[e.type].flying))
          );
          if (supPool.length > 0) chosen = pick(rng, supPool);
        }
        if (!chosen) {
          const dpsPool = effectivePool.filter((t) => t !== 'frost');
          chosen = pickWeightedCounterType(
            rng,
            dpsPool.length > 0 ? dpsPool : effectivePool,
            waveCreatureTypes,
            threat.hasSwarm
          );
        }
        if (!chosen) break;
        const added = addTower(chosen, w);
        if (!added) break;
      } else {
        break;
      }
    }
  }

  // Ensure late-game upgrades/specs exist so excess endgame crystals are always spent
  for (const g of genes) {
    if (g.lv2Wave === null && rng() < 0.8) {
      g.lv2Wave = Math.min(maxPlanWave, g.buyBeforeWave + randInt(rng, 1, 2));
    }
    if (g.lv2Wave !== null && g.lv3Wave === null && rng() < 0.65) {
      g.lv3Wave = Math.min(maxPlanWave, g.lv2Wave + randInt(rng, 1, 2));
    }
    if (g.lv3Wave !== null && g.spec === null && rng() < 0.55) {
      g.spec = chooseSmartSpec(rng, g.type, levelThreats);
      g.specWave = Math.min(maxPlanWave, g.lv3Wave + randInt(rng, 0, 2));
    }
    normalizeGeneTiming(g, maxPlanWave);
  }

  return genes;
}

function mutateGenes(
  rng: () => number,
  parent: InternalTowerGene[],
  level: LevelConfig,
  towerSpots: PlacementSpot[],
  trailSpots: PlacementSpot[],
  maxPlanWave: number
): InternalTowerGene[] {
  const child = cloneGenes(parent);
  if (child.length === 0) return child;

  const availableTowers = level.defenders.filter((t) => DEFENDERS[t].kind === 'tower');
  const availableTrails = level.defenders.filter((t) => DEFENDERS[t].kind === 'trail');
  const planHorizon = Math.max(2, Math.min(maxPlanWave, level.waves.length));
  const levelThreats: WaveThreatProfile[] = [];
  for (let w = 1; w <= planHorizon; w++) {
    levelThreats.push(analyzeWaveThreats(level, w));
  }
  const allLevelCreatures = Array.from(
    new Set(levelThreats.flatMap((t) => t.entries.map((e) => e.type)))
  );

  // Apply 1 or 2 small mutations
  const numMutations = rng() < 0.7 ? 1 : 2;

  for (let m = 0; m < numMutations; m++) {
    const op = rng();

    if (op < 0.28) {
      // 1. Swap a tower type (counter-biased so swaps favor unresisted counters)
      const idx = Math.floor(rng() * child.length);
      const g = child[idx];
      const sameKindPool = (DEFENDERS[g.type].kind === 'trail' ? availableTrails : availableTowers).filter(
        (t) => t !== g.type
      );
      if (sameKindPool.length > 0 && rng() < 0.8) {
        const waveCreatures =
          levelThreats[Math.min(g.buyBeforeWave - 1, levelThreats.length - 1)]?.entries.map(
            (e) => e.type
          ) || allLevelCreatures;
        g.type =
          rng() < 0.7
            ? pickWeightedCounterType(rng, sameKindPool, waveCreatures, false) || pick(rng, sameKindPool)
            : pick(rng, sameKindPool);
        if (g.spec !== null) {
          g.spec = chooseSmartSpec(rng, g.type, levelThreats);
        }
        g.targetMode = g.type === 'rail' ? 'strong' : g.targetMode;
      } else {
        // Cross-kind swap with a legal spot of the other kind near current position
        const otherKind = DEFENDERS[g.type].kind === 'trail' ? 'tower' : 'trail';
        const otherTypes = otherKind === 'trail' ? availableTrails : availableTowers;
        const otherSpots = (otherKind === 'trail' ? trailSpots : towerSpots).filter((s) =>
          canPlaceAtSpot(s, child, idx)
        );
        if (otherTypes.length > 0 && otherSpots.length > 0) {
          otherSpots.sort(
            (a, b) =>
              Math.hypot(a.x - g.spot.x, a.y - g.spot.y) -
              Math.hypot(b.x - g.spot.x, b.y - g.spot.y)
          );
          g.type = pickWeightedCounterType(rng, otherTypes, allLevelCreatures, false) || pick(rng, otherTypes);
          g.spot = otherSpots[Math.floor(rng() * Math.min(4, otherSpots.length))];
          g.targetMode = g.type === 'rail' ? 'strong' : 'first';
        }
      }
    } else if (op < 0.56) {
      // 2. Move a tower to another legal spot (65% clustered near an existing tower)
      const idx = Math.floor(rng() * child.length);
      const g = child[idx];
      const kind = DEFENDERS[g.type].kind;
      const legalSpots = (kind === 'trail' ? trailSpots : towerSpots).filter(
        (s) => s.id !== g.spot.id && canPlaceAtSpot(s, child, idx)
      );
      if (legalSpots.length > 0) {
        if (rng() < 0.65 && child.length > 1) {
          const ref = child[(idx + 1 + Math.floor(rng() * (child.length - 1))) % child.length].spot;
          legalSpots.sort(
            (a, b) =>
              Math.hypot(a.x - ref.x, a.y - ref.y) - Math.hypot(b.x - ref.x, b.y - ref.y)
          );
          g.spot = legalSpots[Math.floor(rng() * Math.min(4, legalSpots.length))];
        } else {
          g.spot = pick(rng, legalSpots);
        }
      }
    } else if (op < 0.86) {
      // 3. Change upgrade order / timing or spec branch
      const subOp = rng();
      if (subOp < 0.35 && child.length >= 2) {
        const a = Math.floor(rng() * child.length);
        let b = Math.floor(rng() * child.length);
        if (b === a) b = (a + 1) % child.length;
        const tmpWave = child[a].buyBeforeWave;
        child[a].buyBeforeWave = child[b].buyBeforeWave;
        child[b].buyBeforeWave = tmpWave;
        [child[a], child[b]] = [child[b], child[a]];
        normalizeGeneTiming(child[a], maxPlanWave);
        normalizeGeneTiming(child[b], maxPlanWave);
      } else if (subOp < 0.72) {
        const idx = Math.floor(rng() * child.length);
        const g = child[idx];
        const delta = rng() < 0.5 ? -1 : 1;
        const which = rng();
        if (which < 0.35) {
          g.buyBeforeWave = Math.max(1, Math.min(maxPlanWave, g.buyBeforeWave + delta));
        } else if (which < 0.65) {
          if (g.lv2Wave === null) g.lv2Wave = Math.min(maxPlanWave, g.buyBeforeWave + 1);
          else g.lv2Wave = Math.max(g.buyBeforeWave, Math.min(maxPlanWave, g.lv2Wave + delta));
        } else if (which < 0.85) {
          if (g.lv3Wave === null) {
            g.lv2Wave = g.lv2Wave ?? g.buyBeforeWave;
            g.lv3Wave = Math.min(maxPlanWave, g.lv2Wave + 1);
          } else {
            g.lv3Wave = Math.max(g.lv2Wave ?? g.buyBeforeWave, Math.min(maxPlanWave, g.lv3Wave + delta));
          }
        } else {
          if (g.spec === null) {
            g.spec = chooseSmartSpec(rng, g.type, levelThreats);
            g.lv2Wave = g.lv2Wave ?? g.buyBeforeWave;
            g.lv3Wave = g.lv3Wave ?? g.lv2Wave;
            g.specWave = Math.min(maxPlanWave, g.lv3Wave + 1);
          } else if (rng() < 0.6) {
            g.spec = g.spec === 'a' ? 'b' : 'a';
          } else {
            g.specWave = Math.max(
              g.lv3Wave ?? g.buyBeforeWave,
              Math.min(maxPlanWave, (g.specWave ?? maxPlanWave) + delta)
            );
          }
        }
        normalizeGeneTiming(g, maxPlanWave);
      } else {
        const idx = Math.floor(rng() * child.length);
        const g = child[idx];
        if (g.spec !== null && rng() < 0.5) {
          g.spec = null;
          g.specWave = null;
        } else if (g.lv3Wave !== null && g.spec === null && rng() < 0.5) {
          g.lv3Wave = null;
        } else if (g.lv2Wave === null) {
          g.lv2Wave = Math.min(maxPlanWave, g.buyBeforeWave + 1);
        } else if (g.lv3Wave === null) {
          g.lv3Wave = Math.min(maxPlanWave, g.lv2Wave + 1);
        } else if (g.spec === null) {
          g.spec = chooseSmartSpec(rng, g.type, levelThreats);
          g.specWave = Math.min(maxPlanWave, g.lv3Wave + 1);
        }
        normalizeGeneTiming(g, maxPlanWave);
      }
    } else if (op < 0.94 && child.length < 14) {
      // 4. Add one new counter-aligned tower on an unoccupied legal spot
      const buyWave = randInt(rng, 1, Math.min(maxPlanWave, level.waves.length));
      const waveCreatures =
        levelThreats[Math.min(buyWave - 1, levelThreats.length - 1)]?.entries.map((e) => e.type) ||
        allLevelCreatures;
      const type =
        pickWeightedCounterType(rng, level.defenders, waveCreatures, false) ||
        pick(rng, level.defenders);
      const kind = DEFENDERS[type].kind;
      const legalSpots = (kind === 'trail' ? trailSpots : towerSpots).filter((s) =>
        canPlaceAtSpot(s, child)
      );
      if (legalSpots.length > 0) {
        const spot = pick(rng, legalSpots);
        const gene: InternalTowerGene = {
          type,
          spot,
          buyBeforeWave: buyWave,
          lv2Wave: rng() < 0.65 ? Math.min(maxPlanWave, buyWave + 1) : null,
          lv3Wave: null,
          spec: null,
          specWave: null,
          targetMode: type === 'rail' ? 'strong' : 'first',
        };
        normalizeGeneTiming(gene, maxPlanWave);
        child.push(gene);
      }
    } else if (child.length > 3) {
      // 5. Drop one tower to free budget for stronger upgrades
      const idx = Math.floor(rng() * child.length);
      child.splice(idx, 1);
    }
  }

  return child;
}

function aggregateMostLeaked(results: SimResult[]): MostLeakedInfo | undefined {
  const totals = new Map<CreatureType, { count: number; anchorDmg: number }>();
  for (const r of results) {
    for (const [k, v] of Object.entries(r.leakedByType) as Array<
      [CreatureType, { count: number; anchorDmg: number } | undefined]
    >) {
      if (!v || v.count <= 0) continue;
      const prev = totals.get(k) || { count: 0, anchorDmg: 0 };
      prev.count += v.count;
      prev.anchorDmg += v.anchorDmg;
      totals.set(k, prev);
    }
  }
  let best: MostLeakedInfo | undefined;
  for (const [type, stats] of totals.entries()) {
    if (
      !best ||
      stats.anchorDmg > best.anchorDmg ||
      (stats.anchorDmg === best.anchorDmg && stats.count > best.count)
    ) {
      best = {
        type,
        name: CREATURES[type]?.name || type,
        count: stats.count,
        anchorDmg: stats.anchorDmg,
      };
    }
  }
  return best;
}

// --- 3 & 5. Main Bot Search & Multi-Seed Report ---

export function runBalanceBot(input: BotSearchInput): BotSearchReport {
  const t0 = performance.now();
  const level = LEVELS[input.levelId];
  if (!level) {
    throw new Error(`Unknown levelId "${input.levelId}".`);
  }

  const minRandom = input.allowFastProbe ? 12 : 200;
  const randomPlans = Math.max(minRandom, Math.round(input.randomPlans ?? 200));
  const topK = Math.max(1, Math.min(randomPlans, Math.round(input.topK ?? 20)));
  const refineRounds = Math.max(0, Math.round(input.refineRounds ?? 4));
  const mutationsPerPlan = Math.max(1, Math.round(input.mutationsPerPlan ?? 3));
  const targetSpots = input.targetSpots ?? 50;
  const seed = input.seed ?? 1;
  const wordRollSeeds = Math.max(1, Math.round(input.wordRollSeeds ?? 5));
  const useHeroPowers = input.useHeroPowers ?? true;
  const dt = input.dt ?? 0.05;
  const readMode = input.readMode ?? 'speak';
  const playBonusSurge = Boolean(input.playBonusSurge);
  const maxWaves = input.maxWaves ?? 25;
  const maxPlanWave = Math.min(
    maxWaves,
    Math.max(level.waves.length, level.minWaves) + (playBonusSurge ? level.bonusSurgeWaves : 0) + 2
  );

  // Sample 40 to 60 legal placement spots along the path
  const spots = samplePlacementSpots(input.levelId, targetSpots);
  const towerSpots = spots.filter((s) => s.kind === 'tower');
  const trailSpots = spots.filter((s) => s.kind === 'trail');

  const rng = createRng(seed);
  // Distinct deterministic word-roll seeds for multi-seed evaluation
  const simSeeds: number[] = Array.from(
    { length: wordRollSeeds },
    (_, idx) => ((seed * 2654435761 + idx * 1013904223) >>> 0) || idx + 1
  );
  const primarySimSeed = simSeeds[0];
  const freePlacement = Boolean(level.freePlacement);

  const multiVerifyCount = wordRollSeeds > 1 ? Math.min(6, topK) + 1 : 0;
  const totalPlannedEvals =
    randomPlans +
    refineRounds * topK * mutationsPerPlan +
    multiVerifyCount * Math.max(0, wordRollSeeds - 1);
  let completedEvals = 0;

  const runSimWithSeed = (plan: TowerPlanItem[], simSeed: number): SimResult =>
    simulateBattle({
      levelId: input.levelId,
      difficulty: input.difficulty,
      towerPlan: plan,
      readingAccuracy: input.readingAccuracy,
      dt,
      seed: simSeed,
      readMode,
      playBonusSurge,
      maxWaves,
      strictBuildOrder: false,
      validatePlacement: true,
      dials: input.dials,
      overrideStartCrystals: input.overrideStartCrystals,
      overrideBalanceScale: input.overrideBalanceScale,
      useHeroPowers,
    });

  const evaluateGenes = (
    genes: InternalTowerGene[],
    origin: 'random' | 'refined'
  ): { genes: InternalTowerGene[]; evalPlan: EvaluatedPlan } => {
    const plan = genesToTowerPlan(genes, freePlacement);
    const result = runSimWithSeed(plan, primarySimSeed);
    const score = scorePlan(result);
    completedEvals += 1;
    if (input.onProgress && (completedEvals % 20 === 0 || completedEvals === totalPlannedEvals)) {
      input.onProgress(completedEvals, totalPlannedEvals);
    }
    return {
      genes,
      evalPlan: { plan, result, score, origin },
    };
  };

  const allEvaluated: EvaluatedPlan[] = [];
  let randomWins = 0;

  // Phase 1: Evaluate counter-aware random plans
  const candidates: Array<{ genes: InternalTowerGene[]; evalPlan: EvaluatedPlan }> = [];
  for (let i = 0; i < randomPlans; i++) {
    const genes = generateRandomGenes(
      rng,
      level,
      towerSpots,
      trailSpots,
      input.readingAccuracy,
      maxPlanWave,
      readMode,
      input.overrideStartCrystals
    );
    const entry = evaluateGenes(genes, 'random');
    allEvaluated.push(entry.evalPlan);
    if (entry.evalPlan.result.win) randomWins += 1;
    candidates.push(entry);
  }

  candidates.sort((a, b) => b.evalPlan.score - a.evalPlan.score);
  let elite = candidates.slice(0, topK);

  // Phase 2: Improve the best 20 with small changes for several rounds
  let refinedCount = 0;
  for (let round = 0; round < refineRounds; round++) {
    const nextPool = [...elite];
    for (const parent of elite) {
      for (let m = 0; m < mutationsPerPlan; m++) {
        const mutatedGenes = mutateGenes(
          rng,
          parent.genes,
          level,
          towerSpots,
          trailSpots,
          maxPlanWave
        );
        const childEntry = evaluateGenes(mutatedGenes, 'refined');
        allEvaluated.push(childEntry.evalPlan);
        refinedCount += 1;
        nextPool.push(childEntry);
      }
    }
    nextPool.sort((a, b) => b.evalPlan.score - a.evalPlan.score);
    elite = nextPool.slice(0, topK);
  }

  // Sort all evaluated plans ascending to locate 75th percentile ("good") and top candidates
  const sortedAsc = [...allEvaluated].sort((a, b) => a.score - b.score);
  const p75Idx = Math.floor(0.75 * (sortedAsc.length - 1));
  const good = sortedAsc[p75Idx];

  // Phase 3: Evaluate top elite plans + good (75th pct) across all wordRollSeeds (default 5)
  const evalMultiSeed = (ep: EvaluatedPlan) => {
    const results: SimResult[] = [ep.result];
    let scoreSum = ep.score;
    for (let s = 1; s < simSeeds.length; s++) {
      const r = runSimWithSeed(ep.plan, simSeeds[s]);
      results.push(r);
      scoreSum += scorePlan(r);
      completedEvals += 1;
      if (input.onProgress && (completedEvals % 10 === 0 || completedEvals === totalPlannedEvals)) {
        input.onProgress(completedEvals, totalPlannedEvals);
      }
    }
    const n = results.length;
    const winRate = results.filter((r) => r.win).length / n;
    const avgAnchorLeft = results.reduce((acc, r) => acc + r.finalAnchor, 0) / n;
    const avgAnchorPct = level.anchor > 0 ? avgAnchorLeft / level.anchor : 0;
    const avgWavesCleared = results.reduce((acc, r) => acc + r.wavesCleared, 0) / n;
    return {
      ep,
      results,
      avgScore: scoreSum / n,
      winRate,
      avgAnchorLeft,
      avgAnchorPct,
      avgWavesCleared,
    };
  };

  const eliteToVerify = elite.slice(0, Math.min(6, elite.length)).map((e) => e.evalPlan);
  let bestOptMulti = evalMultiSeed(eliteToVerify[0] || sortedAsc[sortedAsc.length - 1]);
  for (let i = 1; i < eliteToVerify.length; i++) {
    const cand = evalMultiSeed(eliteToVerify[i]);
    if (cand.avgScore > bestOptMulti.avgScore) {
      bestOptMulti = cand;
    }
  }

  const goodMulti = evalMultiSeed(good);
  const optimal = bestOptMulti.ep;

  const totalWins = allEvaluated.filter((e) => e.result.win).length;
  const maxAnchor = level.anchor;
  const avgAnchorLeft = (bestOptMulti.avgAnchorLeft + goodMulti.avgAnchorLeft) / 2;

  const balanceTarget: BalanceTargetSummary = {
    winRate: (bestOptMulti.winRate + goodMulti.winRate) / 2,
    anchorLeft: avgAnchorLeft,
    anchorPct: maxAnchor > 0 ? avgAnchorLeft / maxAnchor : 0,
    wavesCleared: (bestOptMulti.avgWavesCleared + goodMulti.avgWavesCleared) / 2,
    score: (bestOptMulti.avgScore + goodMulti.avgScore) / 2,
  };

  // Identify most-leaked creature across the multi-seed runs of optimal + good
  let mostLeakedCreature = aggregateMostLeaked([
    ...bestOptMulti.results,
    ...goodMulti.results,
  ]);
  if (!mostLeakedCreature) {
    mostLeakedCreature = aggregateMostLeaked(allEvaluated.slice(0, 40).map((e) => e.result));
  }

  return {
    levelId: input.levelId,
    difficulty: input.difficulty,
    readingAccuracy: input.readingAccuracy,
    spots,
    spotCount: spots.length,
    towerSpotCount: towerSpots.length,
    trailSpotCount: trailSpots.length,
    evaluatedCount: allEvaluated.length,
    randomCount: randomPlans,
    refinedCount,
    wordRollSeeds,
    winRateAll: allEvaluated.length > 0 ? totalWins / allEvaluated.length : 0,
    winRateRandom: randomPlans > 0 ? randomWins / randomPlans : 0,
    optimal,
    good,
    optimalWinRate: bestOptMulti.winRate,
    optimalAnchorPct: bestOptMulti.avgAnchorPct,
    goodWinRate: goodMulti.winRate,
    goodAnchorPct: goodMulti.avgAnchorPct,
    mostLeakedCreature,
    balanceTarget,
    top20: elite.map((e) => e.evalPlan),
    durationMs: Math.round((performance.now() - t0) * 10) / 10,
  };
}
