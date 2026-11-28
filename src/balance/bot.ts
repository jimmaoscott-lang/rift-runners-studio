// Headless balance bot for Rift Runners.
// Samples legal placement spots, searches random tower plans, refines the top 20,
// and reports optimal (best), good (75th percentile), and their balance target average.

import {
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
  /** Fixed sim timestep in seconds (default 0.05). */
  dt?: number;
  /** Clean real-word payout mode (default 'speak'). */
  readMode?: 'speak' | 'tap';
  /** Whether to continue into Bonus Surge waves (default false). */
  playBonusSurge?: boolean;
  /** Optional safety cap on waves simulated (default 25). */
  maxWaves?: number;
  /** Optional builder difficulty dials. */
  dials?: SimDials;
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
  winRateAll: number;
  winRateRandom: number;
  optimal: EvaluatedPlan;
  good: EvaluatedPlan;
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

function estimateTotalBudget(
  level: LevelConfig,
  accuracy: number,
  planWaves: number,
  readMode: 'speak' | 'tap'
): number {
  const realCleanPay = readMode === 'speak' ? FORGE_CONFIG.speak : FORGE_CONFIG.real;
  const realHelpPay = Math.round(FORGE_CONFIG.real * FORGE_CONFIG.helpShare);
  const runeHelpPay = Math.round(FORGE_CONFIG.rune * FORGE_CONFIG.helpShare);
  const avgClean = (1 - level.runeRate) * realCleanPay + level.runeRate * FORGE_CONFIG.rune;
  const avgMiss = (1 - level.runeRate) * realHelpPay + level.runeRate * runeHelpPay;
  const perWord = accuracy * avgClean + (1 - accuracy) * avgMiss;
  const megaBonus = Math.pow(accuracy, FORGE_CONFIG.megaPips) * (FORGE_CONFIG.mega / FORGE_CONFIG.megaPips);
  const wordsTotal = planWaves * level.waveEvery;
  const readTotal = wordsTotal * (perWord + megaBonus);
  const lockTotal = accuracy >= 0.75 ? level.vowels.length * FORGE_CONFIG.lockBonus : 0;
  let waveBonusTotal = 0;
  for (let w = 1; w <= planWaves; w++) waveBonusTotal += 15 + w * 5;
  const killEstimate = planWaves * 85;
  return level.startCrystals + readTotal + lockTotal + waveBonusTotal + killEstimate;
}

function generateRandomGenes(
  rng: () => number,
  level: LevelConfig,
  towerSpots: PlacementSpot[],
  trailSpots: PlacementSpot[],
  accuracy: number,
  maxPlanWave: number,
  readMode: 'speak' | 'tap'
): InternalTowerGene[] {
  const availableTowers = level.defenders.filter((t) => DEFENDERS[t].kind === 'tower');
  const availableTrails = level.defenders.filter((t) => DEFENDERS[t].kind === 'trail');
  const allTypes = level.defenders;

  const estBudget = estimateTotalBudget(level, accuracy, maxPlanWave, readMode);
  // Vary strategy archetype across random plans: wide (more towers) vs tall (fewer towers, heavy specs)
  const archetypeRoll = rng();
  const minCount = archetypeRoll < 0.35 ? 4 : archetypeRoll < 0.75 ? 6 : 8;
  const maxCount = Math.min(
    towerSpots.length + trailSpots.length,
    Math.max(minCount + 1, Math.min(14, Math.round(estBudget / 170)))
  );
  const desiredTowers = randInt(rng, minCount, Math.max(minCount, maxCount));

  // Estimate Wave 1 affordable budget so first 1-3 towers actually build before Wave 1
  const wave1ReadMin = level.waveEvery * Math.round(FORGE_CONFIG.real * FORGE_CONFIG.helpShare);
  const wave1Budget = level.startCrystals + wave1ReadMin + Math.round(level.waveEvery * accuracy * 14);

  const genes: InternalTowerGene[] = [];

  // Prefer higher-coverage spots with controlled randomness so random search explores good ground
  const pickSpot = (kind: 'tower' | 'trail'): PlacementSpot | null => {
    const pool = (kind === 'trail' ? trailSpots : towerSpots).filter((s) =>
      canPlaceAtSpot(s, genes)
    );
    if (pool.length === 0) return null;
    if (rng() < 0.65) {
      // Top half by coverage
      const ranked = [...pool].sort((a, b) => b.coverage - a.coverage);
      const cutoff = Math.max(1, Math.ceil(ranked.length * 0.55));
      return ranked[Math.floor(rng() * cutoff)];
    }
    return pick(rng, pool);
  };

  let wave1Spent = 0;

  for (let i = 0; i < desiredTowers; i++) {
    // Pick tower vs trail type (usually 65-80% ranged towers, 20-35% trail traps/golems)
    let type: DefenderType;
    const wantTrail = availableTrails.length > 0 && trailSpots.length > 0 && rng() < 0.28;
    if (wantTrail) {
      type = pick(rng, availableTrails);
    } else if (availableTowers.length > 0 && towerSpots.length > 0) {
      type = pick(rng, availableTowers);
    } else {
      type = pick(rng, allTypes);
    }

    const kind = DEFENDERS[type].kind;
    let spot = pickSpot(kind);
    if (!spot) {
      // Fallback to other kind if one category ran out of pads
      const altTypes = kind === 'trail' ? availableTowers : availableTrails;
      if (altTypes.length === 0) break;
      type = pick(rng, altTypes);
      spot = pickSpot(DEFENDERS[type].kind);
      if (!spot) break;
    }

    const cost = DEFENDERS[type].cost;
    let buyBeforeWave: number;
    if (i === 0 || (wave1Spent + cost <= wave1Budget && i < 3 && rng() < 0.85)) {
      buyBeforeWave = 1;
      wave1Spent += cost;
    } else {
      buyBeforeWave = randInt(rng, 1, Math.max(2, Math.min(maxPlanWave, level.waves.length + 1)));
    }

    // Decide upgrade path depth based on archetype
    const upRoll = rng();
    const tallBias = archetypeRoll < 0.35 ? 0.22 : archetypeRoll < 0.75 ? 0.08 : -0.1;
    let lv2Wave: number | null = null;
    let lv3Wave: number | null = null;
    let spec: 'a' | 'b' | null = null;
    let specWave: number | null = null;

    if (upRoll < 0.82 + tallBias) {
      lv2Wave = Math.min(maxPlanWave, buyBeforeWave + randInt(rng, 0, 2));
      if (upRoll < 0.58 + tallBias) {
        lv3Wave = Math.min(maxPlanWave, lv2Wave + randInt(rng, 1, 2));
        if (upRoll < 0.38 + tallBias) {
          spec = rng() < 0.5 ? 'a' : 'b';
          specWave = Math.min(maxPlanWave, lv3Wave + randInt(rng, 1, 2));
        }
      }
    }

    const defaultMode: TargetPriority = type === 'rail' ? 'strong' : 'first';
    const targetMode: TargetPriority =
      rng() < 0.85 ? defaultMode : pick(rng, ['first', 'strong', 'last'] as const);

    const gene: InternalTowerGene = {
      type,
      spot,
      buyBeforeWave,
      lv2Wave,
      lv3Wave,
      spec,
      specWave,
      targetMode,
    };
    normalizeGeneTiming(gene, maxPlanWave);
    genes.push(gene);
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

  // Apply 1 or 2 small mutations
  const numMutations = rng() < 0.7 ? 1 : 2;

  for (let m = 0; m < numMutations; m++) {
    const op = rng();

    if (op < 0.28) {
      // 1. Swap a tower type (same kind or cross-kind with compatible legal spot)
      const idx = Math.floor(rng() * child.length);
      const g = child[idx];
      const sameKindPool = (DEFENDERS[g.type].kind === 'trail' ? availableTrails : availableTowers).filter(
        (t) => t !== g.type
      );
      if (sameKindPool.length > 0 && rng() < 0.8) {
        g.type = pick(rng, sameKindPool);
        if (g.spec !== null && rng() < 0.5) {
          g.spec = g.spec === 'a' ? 'b' : 'a';
        }
        g.targetMode = g.type === 'rail' ? 'strong' : g.targetMode;
      } else {
        // Cross-kind swap with a legal spot of the other kind
        const otherKind = DEFENDERS[g.type].kind === 'trail' ? 'tower' : 'trail';
        const otherTypes = otherKind === 'trail' ? availableTrails : availableTowers;
        const otherSpots = (otherKind === 'trail' ? trailSpots : towerSpots).filter((s) =>
          canPlaceAtSpot(s, child, idx)
        );
        if (otherTypes.length > 0 && otherSpots.length > 0) {
          g.type = pick(rng, otherTypes);
          g.spot = pick(rng, otherSpots);
          g.targetMode = g.type === 'rail' ? 'strong' : 'first';
        }
      }
    } else if (op < 0.56) {
      // 2. Move a tower to another legal spot of the same kind
      const idx = Math.floor(rng() * child.length);
      const g = child[idx];
      const kind = DEFENDERS[g.type].kind;
      const legalSpots = (kind === 'trail' ? trailSpots : towerSpots).filter(
        (s) => s.id !== g.spot.id && canPlaceAtSpot(s, child, idx)
      );
      if (legalSpots.length > 0) {
        g.spot = pick(rng, legalSpots);
      }
    } else if (op < 0.86) {
      // 3. Change upgrade order / timing or spec branch
      const subOp = rng();
      if (subOp < 0.35 && child.length >= 2) {
        // Swap order of two towers in the plan (changes priority when crystals are tight)
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
        // Shift a tower's build or upgrade wave earlier/later by 1-2 waves
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
            g.spec = rng() < 0.5 ? 'a' : 'b';
            g.lv2Wave = g.lv2Wave ?? g.buyBeforeWave;
            g.lv3Wave = g.lv3Wave ?? g.lv2Wave;
            g.specWave = Math.min(maxPlanWave, g.lv3Wave + 1);
          } else if (rng() < 0.6) {
            g.spec = g.spec === 'a' ? 'b' : 'a';
          } else {
            g.specWave = Math.max(g.lv3Wave ?? g.buyBeforeWave, Math.min(maxPlanWave, (g.specWave ?? maxPlanWave) + delta));
          }
        }
        normalizeGeneTiming(g, maxPlanWave);
      } else {
        // Trim or deepen a tower's upgrade tier
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
          g.spec = rng() < 0.5 ? 'a' : 'b';
          g.specWave = Math.min(maxPlanWave, g.lv3Wave + 1);
        }
        normalizeGeneTiming(g, maxPlanWave);
      }
    } else if (op < 0.94 && child.length < 14) {
      // 4. Add one new tower on an unoccupied legal spot
      const type = pick(rng, level.defenders);
      const kind = DEFENDERS[type].kind;
      const legalSpots = (kind === 'trail' ? trailSpots : towerSpots).filter((s) =>
        canPlaceAtSpot(s, child)
      );
      if (legalSpots.length > 0) {
        const spot = pick(rng, legalSpots);
        const buyWave = randInt(rng, 1, Math.min(maxPlanWave, level.waves.length + 1));
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

// --- 3 & 5. Main Bot Search & Report ---

export function runBalanceBot(input: BotSearchInput): BotSearchReport {
  const t0 = performance.now();
  const level = LEVELS[input.levelId];
  if (!level) {
    throw new Error(`Unknown levelId "${input.levelId}".`);
  }

  const randomPlans = Math.max(200, Math.round(input.randomPlans ?? 200));
  const topK = Math.max(1, Math.round(input.topK ?? 20));
  const refineRounds = Math.max(1, Math.round(input.refineRounds ?? 4));
  const mutationsPerPlan = Math.max(1, Math.round(input.mutationsPerPlan ?? 3));
  const targetSpots = input.targetSpots ?? 50;
  const seed = input.seed ?? 1;
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
  // Use a fixed simulation seed within this test so plans are compared fairly on identical word rolls
  const simSeed = (seed * 2654435761) >>> 0 || 1;
  const freePlacement = Boolean(level.freePlacement);

  const evaluateGenes = (
    genes: InternalTowerGene[],
    origin: 'random' | 'refined'
  ): { genes: InternalTowerGene[]; evalPlan: EvaluatedPlan } => {
    const plan = genesToTowerPlan(genes, freePlacement);
    const result = simulateBattle({
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
    });
    const score = scorePlan(result);
    return {
      genes,
      evalPlan: { plan, result, score, origin },
    };
  };

  const allEvaluated: EvaluatedPlan[] = [];
  let randomWins = 0;

  // Phase 1: Evaluate at least 200 random plans
  let candidates: Array<{ genes: InternalTowerGene[]; evalPlan: EvaluatedPlan }> = [];
  for (let i = 0; i < randomPlans; i++) {
    const genes = generateRandomGenes(
      rng,
      level,
      towerSpots,
      trailSpots,
      input.readingAccuracy,
      maxPlanWave,
      readMode
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

  // Sort all evaluated plans ascending to compute exact 75th percentile ("good") and best ("optimal")
  const sortedAsc = [...allEvaluated].sort((a, b) => a.score - b.score);
  const optimal = sortedAsc[sortedAsc.length - 1];
  const p75Idx = Math.floor(0.75 * (sortedAsc.length - 1));
  const good = sortedAsc[p75Idx];

  const totalWins = allEvaluated.filter((e) => e.result.win).length;
  const maxAnchor = level.anchor;
  const avgAnchorLeft = (optimal.result.finalAnchor + good.result.finalAnchor) / 2;

  const balanceTarget: BalanceTargetSummary = {
    winRate: ((optimal.result.win ? 1 : 0) + (good.result.win ? 1 : 0)) / 2,
    anchorLeft: avgAnchorLeft,
    anchorPct: maxAnchor > 0 ? avgAnchorLeft / maxAnchor : 0,
    wavesCleared: (optimal.result.wavesCleared + good.result.wavesCleared) / 2,
    score: (optimal.score + good.score) / 2,
  };

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
    winRateAll: allEvaluated.length > 0 ? totalWins / allEvaluated.length : 0,
    winRateRandom: randomPlans > 0 ? randomWins / randomPlans : 0,
    optimal,
    good,
    balanceTarget,
    top20: elite.map((e) => e.evalPlan),
    durationMs: Math.round((performance.now() - t0) * 10) / 10,
  };
}
