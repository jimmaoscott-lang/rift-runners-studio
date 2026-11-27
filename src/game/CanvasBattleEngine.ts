import {
  CREATURES,
  CreatureType,
  DEFENDERS,
  DefenderLevelStats,
  DefenderType,
  DIFFICULTIES,
  DifficultyId,
  FORGE_CONFIG,
  HERO_POWERS,
  HeroPowerId,
  LevelConfig,
  WaveDef,
} from '../data/level1';
import { sound } from '../lib/audio';
import {
  createDefaultDifficultyDials,
  DEFAULT_DIFFICULTY_DIAL_ROW,
  DifficultyDials,
  getWordsBetweenWaves,
} from '../lib/metrics';
import { GameSpriteBank, loadGameSprites, SpriteKey } from './sprites';

export type CameraPreset = 'tactical' | 'action' | 'rift' | 'camp';

export type TargetPriority = 'first' | 'last' | 'strong';

export interface SelectedDefenderInfo {
  padId: string;
  type: DefenderType;
  level: number;
  spec: 'a' | 'b' | null;
  targetMode: TargetPriority;
  spent: number;
  screenX: number;
  screenY: number;
}

export interface OverlayLabel {
  id: string;
  kind: 'creature' | 'golem';
  x: number;
  y: number;
  hpRatio: number;
  tag: string;
  color: string;
}

export interface BattleSnapshot {
  phase: 'build' | 'wave' | 'between' | 'milestone' | 'done';
  crystals: number;
  anchor: number;
  anchorMax: number;
  wave: number;
  totalWaves: number;
  finalWave: boolean;
  locksReady: boolean;
  milestoneStars: number;
  bonusActive: boolean;
  bonusWave: number;
  bonusTotal: number;
  wordsUntilWave: number;
  creaturesAlive: number;
  defendersCount: number;
  upgradedCount: number;
  kills: number;
  shards: number;
  powers: Record<HeroPowerId, number>;
  rallyActive: boolean;
  freezeActive: boolean;
  buildSel: DefenderType | null;
  selectedDef: SelectedDefenderInfo | null;
  paused: boolean;
  speed: number;
  difficulty: DifficultyId;
  cameraPreset: CameraPreset;
  labels: OverlayLabel[];
}

export interface BattleEngineCallbacks {
  onSnapshot: (snap: BattleSnapshot) => void;
  onToast: (message: string, speakId?: string) => void;
  onBattleEnd: (result: {
    win: boolean;
    stars: number;
    waves: number;
    anchor: number;
    kills: number;
    shards: number;
    powersUsed: number;
    bonusWavesCleared?: number;
    bonusTotal?: number;
    bonusCompleted?: boolean;
    bonusAnchorFell?: boolean;
  }) => void;
}

// Logical 16:9 coordinate space matching painted 2.5D battlefield maps
const MAP_W = 1600;
const MAP_H = 900;

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
  recoil: number;
  facingLeft: boolean;
  pulsePhase: number;
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
  dotAccum: number;
  resistTextCd: number;
  abilityCd: number;
  dashTimer: number;
  summonsUsed: number;
  heldBy: DefenderRuntime | null;
  attackCd: number;
  hitFlash: number;
  animPhase: number;
}

interface ProjectileRuntime {
  kind: 'arrow' | 'ember';
  sx: number;
  sy: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  target: CreatureRuntime;
  progress: number;
  duration: number;
  arcHeight: number;
  dmg: number;
  splashRadius?: number;
  color: string;
}

interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  age: number;
  life: number;
  scale: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  age: number;
  life: number;
  glow?: boolean;
  kind?: 'dot' | 'streak' | 'smoke' | 'shard';
  gravity?: number;
  drag?: number;
  rot?: number;
  vrot?: number;
}

interface RingEffect {
  x: number;
  y: number;
  r0: number;
  r1: number;
  color: string;
  lineWidth: number;
  age: number;
  life: number;
  fillAlpha?: number;
}

type ExplosionTheme = 'fire' | 'inferno' | 'plasma' | 'electric' | 'frost' | 'earth' | 'gravity' | 'boss';

interface ExplosionLobe {
  ox: number;
  oy: number;
  scale: number;
  delay: number;
}

interface ExplosionFX {
  x: number;
  y: number;
  radius: number;
  age: number;
  life: number;
  theme: ExplosionTheme;
  lobes: ExplosionLobe[];
}

interface CraterDecal {
  x: number;
  y: number;
  radius: number;
  age: number;
  life: number;
  glowColor: string;
}

interface MeteorFX {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  age: number;
  life: number;
  impacted: boolean;
}

interface LightningArcFX {
  points: Array<{ x: number; y: number }>;
  color: string;
  coreColor: string;
  width: number;
  age: number;
  life: number;
}

interface SpawnTicket {
  type: CreatureType;
  at: number;
  hpMult: number;
}

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

export class BattleEngine {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private level: LevelConfig;
  private callbacks: BattleEngineCallbacks;

  private sprites: GameSpriteBank | null = null;
  private readonly terrainMaskW = 320;
  private readonly terrainMaskH = 180;
  private terrainPixels: Uint8ClampedArray | null = null;
  private path: SmoothPath;
  private riverPath: SmoothPath | null;
  private riftPos: Vec2;
  private campPos: Vec2;
  private wardenPos: Vec2;

  // Viewport transform (maps 1600x900 painted world cleanly into canvas pixels)
  private viewW = 1280;
  private viewH = 720;
  private mapScale = 1;
  private mapOffX = 0;
  private mapOffY = 0;

  // Gameplay state
  private phase: 'build' | 'wave' | 'between' | 'milestone' | 'done' = 'build';
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
  private wordsUntilWave: number;
  private wordsForgedInWait = 0;
  private kills = 0;
  private shards = 0;
  private powersUsed = 0;
  private upgradedCount = 0;
  private locksReady = false;
  private rewardedLocks = new Set<string>();
  private paused = false;
  private externalHold = false;
  private speed = 1;
  private difficulty: DifficultyId = 'normal';
  private difficultyDials: DifficultyDials = createDefaultDifficultyDials();
  private focusMode = false;
  private cameraPreset: CameraPreset = 'tactical';

  private powers: Record<HeroPowerId, number> = { rally: 0, meteor: 0, freeze: 0 };
  private rallyTimer = 0;
  private freezeTimer = 0;
  private wardenCastTimer = 0;
  private shakeTimer = 0;
  private shakeStrength = 0;

  private pads: PadRuntime[] = [];
  private defenders: DefenderRuntime[] = [];
  private creatures: CreatureRuntime[] = [];
  private projectiles: ProjectileRuntime[] = [];
  private particles: Particle[] = [];
  private rings: RingEffect[] = [];
  private explosions: ExplosionFX[] = [];
  private craters: CraterDecal[] = [];
  private floatingTexts: FloatingText[] = [];
  private meteors: MeteorFX[] = [];
  private lightningArcs: LightningArcFX[] = [];
  private spawnQueue: SpawnTicket[] = [];
  private waveClock = 0;
  private ambientMotes: { x: number; y: number; phase: number; speed: number; r: number; violet: boolean }[] = [];
  private riverRipples: { s: number; offset: number; speed: number; len: number }[] = [];

  private buildSel: DefenderType | null = null;
  private selectedDef: DefenderRuntime | null = null;
  private hoverPad: PadRuntime | null = null;
  private pointerWorld: Vec2 | null = null;
  private freePreview: {
    x: number;
    y: number;
    s: number;
    valid: boolean;
    reason?: string;
    kind: 'tower' | 'trail';
  } | null = null;
  private idCounter = 1;

  private rafId = 0;
  private lastTs = 0;
  private clock = 0;
  private snapAccum = 0;
  private disposed = false;

  // Scale conversion: 1 world unit in level1.ts stats -> 26px in 1600x900 map space
  // Keeps Level 1 towers focused on their local curve and Level 3 / Sharpshooter genuinely tactical.
  private readonly RANGE_UNIT_PX = 26;

  constructor(
    container: HTMLElement,
    level: LevelConfig,
    callbacks: BattleEngineCallbacks,
    initialDifficulty: DifficultyId = 'normal',
    initialDials?: DifficultyDials
  ) {
    this.container = container;
    this.level = level;
    this.callbacks = callbacks;
    this.difficulty = initialDifficulty;
    if (initialDials) {
      this.difficultyDials = initialDials;
    }

    this.crystals = level.startCrystals;
    this.anchor = level.anchor;
    this.wordsForgedInWait = 0;
    this.wordsUntilWave = this.getWordsPerWave();
    this.path = new SmoothPath(level.pathUv);
    this.riverPath = level.riverUv.length >= 2 ? new SmoothPath(level.riverUv) : null;
    this.riftPos = { x: level.riftUv[0] * MAP_W, y: level.riftUv[1] * MAP_H };
    this.campPos = { x: level.campUv[0] * MAP_W, y: level.campUv[1] * MAP_H };
    this.wardenPos = { x: level.wardenUv[0] * MAP_W, y: level.wardenUv[1] * MAP_H };

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'block h-full w-full cursor-pointer';
    this.container.innerHTML = '';
    this.container.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('2D canvas context unavailable');
    }
    this.ctx = ctx;

    this.initPads();
    this.initAtmosphere();
    this.bindEvents();
    this.handleResize();

    loadGameSprites()
      .then((bank) => {
        if (!this.disposed) {
          this.sprites = bank;
          this.initTerrainMask();
        }
      })
      .catch(() => {
        // Fallback drawing handles missing images gracefully
      });

    this.emitSnapshot();
    this.lastTs = performance.now();
    this.loop(this.lastTs);
  }

  private initPads() {
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

  private initAtmosphere() {
    this.ambientMotes = Array.from({ length: 34 }, (_, i) => {
      const violet = i < 12;
      return {
        x: violet ? (0.08 + Math.random() * 0.24) * MAP_W : (0.24 + Math.random() * 0.56) * MAP_W,
        y: violet ? (0.14 + Math.random() * 0.30) * MAP_H : (0.12 + Math.random() * 0.78) * MAP_H,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.7,
        r: 2 + Math.random() * 2.6,
        violet,
      };
    });

    this.riverRipples = Array.from({ length: 18 }, (_, i) => ({
      s: i / 18,
      offset: (Math.random() - 0.5) * 34,
      speed: 0.055 + Math.random() * 0.035,
      len: 16 + Math.random() * 20,
    }));
  }

  private bindEvents() {
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointerleave', this.onPointerLeave);
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = () => {
    const rect = this.container.getBoundingClientRect();
    this.viewW = Math.max(320, rect.width || window.innerWidth);
    this.viewH = Math.max(240, rect.height || window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.viewW * dpr);
    this.canvas.height = Math.round(this.viewH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Fill entire battlefield stage seamlessly while keeping the playable corridor (u: 0.14..0.78, v: 0.14..0.88)
    // comfortably framed inside the viewport.
    const coverScale = Math.max(this.viewW / MAP_W, this.viewH / MAP_H);
    const safeFitScale = Math.min(this.viewW / (MAP_W * 0.88), this.viewH / (MAP_H * 0.94));
    this.mapScale = Math.min(coverScale, Math.max(Math.min(this.viewW / MAP_W, this.viewH / MAP_H), safeFitScale));
    this.mapOffX = (this.viewW - MAP_W * this.mapScale) * 0.5;
    this.mapOffY = (this.viewH - MAP_H * this.mapScale) * 0.5;
  };

  private screenToWorld(sx: number, sy: number): Vec2 {
    return {
      x: (sx - this.mapOffX) / this.mapScale,
      y: (sy - this.mapOffY) / this.mapScale,
    };
  }

  private worldToScreen(wx: number, wy: number): Vec2 {
    return {
      x: wx * this.mapScale + this.mapOffX,
      y: wy * this.mapScale + this.mapOffY,
    };
  }

  private findPadAt(wx: number, wy: number): PadRuntime | null {
    let best: PadRuntime | null = null;
    let bestDist = 48;
    for (const pad of this.pads) {
      // Slightly generous vertical hit box for tall towers
      const cy = pad.def ? pad.y - 18 : pad.y;
      const d = Math.hypot(wx - pad.x, wy - cy);
      if (d < bestDist) {
        bestDist = d;
        best = pad;
      }
    }
    return best;
  }

  private initTerrainMask() {
    const mapImg = this.sprites?.maps[this.level.id] || this.sprites?.map;
    if (!mapImg || !mapImg.complete || mapImg.naturalWidth === 0) return;
    try {
      const off = document.createElement('canvas');
      off.width = this.terrainMaskW;
      off.height = this.terrainMaskH;
      const octx = off.getContext('2d', { willReadFrequently: true });
      if (!octx) return;
      octx.drawImage(mapImg, 0, 0, this.terrainMaskW, this.terrainMaskH);
      this.terrainPixels = octx.getImageData(0, 0, this.terrainMaskW, this.terrainMaskH).data;
    } catch {
      this.terrainPixels = null;
    }
  }

  private sampleTerrainHazard(wx: number, wy: number): string | null {
    const data = this.terrainPixels;
    if (!data) return null;
    const w = this.terrainMaskW;
    const h = this.terrainMaskH;
    const sxScale = w / MAP_W;
    const syScale = h / MAP_H;

    // Sample a 17-point footprint disc where the tower foundation sits (center + 2 rings)
    const sampleOffsets: Array<[number, number]> = [[0, 2]];
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4;
      sampleOffsets.push([Math.cos(ang) * 11, 2 + Math.sin(ang) * 11]);
      sampleOffsets.push([Math.cos(ang) * 22, 2 + Math.sin(ang) * 22]);
    }

    let lavaHits = 0;
    let waterHits = 0;
    let skyHits = 0;

    for (const [ox, oy] of sampleOffsets) {
      const px = Math.max(0, Math.min(w - 1, Math.round((wx + ox) * sxScale)));
      const py = Math.max(0, Math.min(h - 1, Math.round((wy + oy) * syScale)));
      const idx = (py * w + px) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      if (this.level.worldId === 'w2') {
        if ((r >= 188 && r - b >= 92 && g >= 58 && b <= 120) || (r >= 225 && g >= 145 && b <= 110)) {
          lavaHits += 1;
        }
      } else if (this.level.worldId === 'w1') {
        if (b >= 118 && b - r >= 28 && g >= 98) {
          waterHits += 1;
        }
      } else if (this.level.worldId === 'w3') {
        if (r >= 188 && g >= 200 && b >= 212 && b >= r - 8) {
          skyHits += 1;
        }
      }
    }

    if (lavaHits >= 2) return 'Molten lava';
    if (waterHits >= 3) return 'Over water';
    if (skyHits >= 4) return 'Cliff drop';
    return null;
  }

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

      // Edge proximity check so tower bases never hang over lava or cliff edges
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

    // Open-terrain ranged tower validation
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
          return {
            x: wx,
            y: wy,
            s: 0,
            valid: false,
            reason: z.label || 'Blocked terrain',
            kind: 'tower',
          };
        }
      }
    }
    if (this.level.noBuildPolys) {
      for (const poly of this.level.noBuildPolys) {
        if (this.isInsideNoBuildPoly(wx, wy, poly.points, 12)) {
          return {
            x: wx,
            y: wy,
            s: 0,
            valid: false,
            reason: poly.label || 'Blocked terrain',
            kind: 'tower',
          };
        }
      }
    }
    const pixelHazard = this.sampleTerrainHazard(wx, wy);
    if (pixelHazard) {
      return {
        x: wx,
        y: wy,
        s: 0,
        valid: false,
        reason: pixelHazard,
        kind: 'tower',
      };
    }
    for (const def of this.defenders) {
      if (Math.hypot(wx - def.pad.x, wy - def.pad.y) < 48) {
        return { x: wx, y: wy, s: 0, valid: false, reason: 'Space occupied', kind: 'tower' };
      }
    }
    return { x: wx, y: wy, s: 0, valid: true, kind: 'tower' };
  }

  private onPointerLeave = () => {
    this.pointerWorld = null;
    this.freePreview = null;
    this.hoverPad = null;
  };

  private onContextMenu = (ev: MouseEvent) => {
    if (this.buildSel || this.selectedDef) {
      ev.preventDefault();
      this.buildSel = null;
      this.selectedDef = null;
      this.freePreview = null;
      this.emitSnapshot();
    }
  };

  private onPointerMove = (ev: PointerEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const pt = this.screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top);
    this.pointerWorld = pt;
    this.hoverPad = this.findPadAt(pt.x, pt.y);

    if (this.level.freePlacement && this.buildSel) {
      this.freePreview = this.evaluateFreePlacement(pt.x, pt.y, this.buildSel);
      this.canvas.style.cursor = this.freePreview.valid ? 'crosshair' : 'not-allowed';
      return;
    }

    this.freePreview = null;
    this.canvas.style.cursor = this.hoverPad ? 'pointer' : 'default';
  };

  private onPointerDown = (ev: PointerEvent) => {
    if (ev.button !== 0 || this.phase === 'done' || this.phase === 'milestone') return;
    const rect = this.canvas.getBoundingClientRect();
    const pt = this.screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top);
    const pad = this.findPadAt(pt.x, pt.y);

    // Free Placement flow (World 3 open terrain)
    if (this.level.freePlacement) {
      if (pad && pad.def && !this.buildSel) {
        this.selectedDef = this.selectedDef === pad.def ? null : pad.def;
        sound.sfx('tap');
        this.emitSnapshot();
        return;
      }

      if (this.buildSel) {
        const cfg = DEFENDERS[this.buildSel];
        const check = this.evaluateFreePlacement(pt.x, pt.y, this.buildSel);
        this.freePreview = check;
        if (!check.valid) {
          this.callbacks.onToast(
            check.reason === 'Place on trail'
              ? `${cfg.name} snaps right onto the trail.`
              : `${check.reason || 'Cannot build here'}. Try another spot.`
          );
          sound.sfx('soft');
          return;
        }
        if (this.crystals < cfg.cost) {
          this.callbacks.onToast(`Need ${cfg.cost} crystals for ${cfg.name}. Forge words to earn more.`);
          sound.sfx('soft');
          return;
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
        this.freePreview = null;
        this.placeDefender(dynPad, this.buildSel);
        return;
      }

      if (this.selectedDef) {
        this.selectedDef = null;
        this.emitSnapshot();
      }
      return;
    }

    if (!pad) {
      if (this.selectedDef || this.buildSel) {
        this.selectedDef = null;
        this.buildSel = null;
        this.emitSnapshot();
      }
      return;
    }

    if (pad.def) {
      this.buildSel = null;
      this.selectedDef = this.selectedDef === pad.def ? null : pad.def;
      sound.sfx('tap');
      this.emitSnapshot();
      return;
    }

    if (this.buildSel) {
      const cfg = DEFENDERS[this.buildSel];
      if (cfg.kind !== pad.kind) {
        this.callbacks.onToast(
          cfg.kind === 'tower'
            ? `${cfg.name} goes on a stone pad beside the trail.`
            : `${cfg.name} goes right on a glowing trail spot.`
        );
        sound.sfx('soft');
        return;
      }
      if (this.crystals < cfg.cost) {
        this.callbacks.onToast(`Need ${cfg.cost} crystals for ${cfg.name}. Forge words to earn more.`);
        sound.sfx('soft');
        return;
      }
      this.placeDefender(pad, this.buildSel);
    } else {
      const towerHint = this.level.defenders.includes('rail')
        ? 'Pick Archer, Frost, Ember, Tesla, or Rail Turret below to build on this stone pad.'
        : this.level.defenders.includes('tesla')
        ? 'Pick Archer, Frost, Ember Cannon, or Tesla Spire below to build on this stone pad.'
        : this.level.defenders.includes('ember')
        ? 'Pick Archer Tower, Frost Totem, or Ember Cannon below to build on this stone pad.'
        : 'Pick Archer Tower or Frost Totem below to build on this stone pad.';
      this.callbacks.onToast(
        pad.kind === 'tower'
          ? towerHint
          : 'Pick Spike Pit or Stone Golem below to place on this trail spot.'
      );
      sound.sfx('tap');
    }
  };

  // --- Public API (matches BattleEngine interface in App.tsx) ---

  public selectBuild(type: DefenderType | null) {
    this.selectedDef = null;
    this.buildSel = this.buildSel === type ? null : type;
    if (this.buildSel) {
      const cfg = DEFENDERS[this.buildSel];
      sound.sfx('tap');
      if (this.level.freePlacement) {
        this.freePreview = this.pointerWorld
          ? this.evaluateFreePlacement(this.pointerWorld.x, this.pointerWorld.y, this.buildSel)
          : null;
        this.callbacks.onToast(
          cfg.kind === 'tower'
            ? `${cfg.name} (${cfg.cost} crystals): click any open ground beside the trail to place.`
            : `${cfg.name} (${cfg.cost} crystals): click anywhere along the glowing trail to place.`
        );
      } else {
        this.callbacks.onToast(
          `${cfg.name} (${cfg.cost} crystals): tap a glowing ${cfg.kind === 'tower' ? 'stone pad' : 'trail spot'}.`
        );
      }
    } else {
      this.freePreview = null;
    }
    this.emitSnapshot();
  }

  public clearSelection() {
    this.buildSel = null;
    this.selectedDef = null;
    this.freePreview = null;
    this.emitSnapshot();
  }

  public setPaused(val: boolean) {
    this.paused = val;
    this.emitSnapshot();
  }

  public setExternalHold(val: boolean) {
    this.externalHold = val;
  }

  public setSpeed(val: number, silent = false) {
    this.speed = val === 0.5 ? 0.5 : val === 2 ? 2 : 1;
    if (!silent) sound.sfx('tap');
    this.emitSnapshot();
  }

  public setFocusMode(val: boolean) {
    this.focusMode = val;
  }

  private getWordsPerWave(): number {
    return getWordsBetweenWaves(this.level.waveEvery, this.difficulty, this.difficultyDials);
  }

  private syncWordsUntilWave() {
    if (this.phase === 'build' || this.phase === 'between') {
      const target = this.getWordsPerWave();
      this.wordsUntilWave = Math.max(1, target - this.wordsForgedInWait);
    }
  }

  public setDifficulty(diff: DifficultyId) {
    if (this.difficulty === diff) return;
    this.difficulty = diff;
    this.syncWordsUntilWave();
    this.emitSnapshot();
  }

  public setDifficultyDials(dials: DifficultyDials) {
    this.difficultyDials = dials;
    this.syncWordsUntilWave();
    this.emitSnapshot();
  }

  public setLocksReady(val: boolean, clearedPatterns?: string[]) {
    this.locksReady = val;
    if (!val) {
      if (clearedPatterns && clearedPatterns.length > 0) {
        for (const p of clearedPatterns) this.rewardedLocks.delete(p);
      } else {
        this.rewardedLocks.clear();
      }
    }
    this.emitSnapshot();
  }

  public acceptVictoryAndFinish() {
    if (!this.bankedWin || this.phase === 'done') return;
    this.finishBattle(true, false);
  }

  public startBonusSurge() {
    if (this.phase !== 'milestone' || this.level.bonusSurgeWaves <= 0) return;
    this.bonusActive = true;
    this.bonusWave = 0;
    this.bonusWavesCleared = 0;
    this.finalWave = false;
    this.phase = 'between';
    this.wordsForgedInWait = 0;
    this.wordsUntilWave = this.getWordsPerWave();
    sound.sfx('power');
    sound.setMusic('calm');
    this.callbacks.onToast(
      `Bonus Surge active! Upgrade your towers or press Send for Bonus Wave 1 of ${this.level.bonusSurgeWaves}.`
    );
    this.emitSnapshot();
  }

  public setCameraPreset(preset: CameraPreset) {
    this.cameraPreset = preset;
    this.emitSnapshot();
  }

  public grantCrystals(amount: number) {
    this.crystals += amount;
    this.spawnFloatingText(this.campPos.x, this.campPos.y - 45, `+${amount}`, '#38e0ff', 1.15);
    this.emitSnapshot();
  }

  public triggerLockSealBonus(
    newlyLocked: Array<{ vowel: string; label: string }>,
    allLocksDone: boolean
  ): number {
    const fresh = newlyLocked.filter((lk) => !this.rewardedLocks.has(lk.vowel));
    if (fresh.length === 0) return 0;

    for (const lk of fresh) {
      this.rewardedLocks.add(lk.vowel);
    }

    const bonusAmount = fresh.length * FORGE_CONFIG.lockBonus;
    this.crystals += bonusAmount;
    this.shards += bonusAmount;
    this.wardenCastTimer = Math.max(this.wardenCastTimer, 0.85);
    this.shakeTimer = Math.max(this.shakeTimer, 0.25);
    this.shakeStrength = Math.max(this.shakeStrength, 5);

    this.rings.push({
      x: this.campPos.x,
      y: this.campPos.y,
      r0: 22,
      r1: 380,
      color: '#fbbf24',
      lineWidth: 7,
      age: 0,
      life: 0.65,
      fillAlpha: 0.14,
    });
    this.rings.push({
      x: this.campPos.x,
      y: this.campPos.y,
      r0: 14,
      r1: 270,
      color: '#38e0ff',
      lineWidth: 5,
      age: 0,
      life: 0.55,
    });
    this.spawnBurst(this.campPos.x, this.campPos.y, '#fbbf24', 22);
    this.spawnBurst(this.campPos.x, this.campPos.y, '#38e0ff', 14);

    const floatLabel =
      fresh.length === 1
        ? `${fresh[0].label.toUpperCase()} LOCKED! +${bonusAmount}`
        : `${fresh.length} LOCKS SEALED! +${bonusAmount}`;
    this.spawnFloatingText(this.campPos.x, this.campPos.y - 82, floatLabel, '#fbbf24', 1.4);
    sound.sfx('power');

    const lockNames = fresh.map((lk) => lk.label).join(' & ');
    if (allLocksDone && !this.bonusActive && !this.bankedWin) {
      const wavesLeft = this.level.minWaves - this.wave - 1;
      const tail =
        wavesLeft <= 0
          ? 'The next wave is the Final Wave.'
          : wavesLeft === 1
          ? 'Clear 1 more wave to unlock the Final Wave.'
          : `Clear ${wavesLeft} more waves to reach the Final Wave.`;
      this.callbacks.onToast(
        `${lockNames} Lock Sealed (+${bonusAmount} bonus crystals)! All Rift Locks filled. ${tail}`
      );
    } else {
      this.callbacks.onToast(
        `${lockNames} Lock Sealed! +${bonusAmount} bonus crystals awarded.`
      );
    }

    this.emitSnapshot();
    return bonusAmount;
  }

  public triggerPlacementTierClear(
    tierLabel: string,
    openedLabel: string,
    bonusCrystals: number
  ) {
    this.crystals += bonusCrystals;
    this.shards += bonusCrystals;
    this.wardenCastTimer = Math.max(this.wardenCastTimer, 0.85);
    this.shakeTimer = Math.max(this.shakeTimer, 0.22);
    this.shakeStrength = Math.max(this.shakeStrength, 4.5);

    this.rings.push({
      x: this.campPos.x,
      y: this.campPos.y,
      r0: 22,
      r1: 360,
      color: '#fbbf24',
      lineWidth: 7,
      age: 0,
      life: 0.65,
      fillAlpha: 0.14,
    });
    this.rings.push({
      x: this.campPos.x,
      y: this.campPos.y,
      r0: 14,
      r1: 260,
      color: '#34d399',
      lineWidth: 5,
      age: 0,
      life: 0.55,
    });
    this.spawnBurst(this.campPos.x, this.campPos.y, '#fbbf24', 20);
    this.spawnBurst(this.campPos.x, this.campPos.y, '#34d399', 14);
    this.spawnFloatingText(
      this.campPos.x,
      this.campPos.y - 82,
      `${tierLabel.toUpperCase()} CLEARED! +${bonusCrystals}`,
      '#34d399',
      1.35
    );
    sound.sfx('power');
    this.callbacks.onToast(
      `${tierLabel} cleared (+${bonusCrystals} crystals)! ${openedLabel} opened!`
    );
    this.emitSnapshot();
  }

  public onWordRead(
    allLocksDone: boolean,
    newlyLocked: Array<{ vowel: string; label: string }> = []
  ) {
    const justCompletedLocks = !this.locksReady && allLocksDone;
    this.locksReady = allLocksDone;
    for (const id of ['rally', 'meteor', 'freeze'] as HeroPowerId[]) {
      const max = HERO_POWERS[id].charge;
      if (this.powers[id] < max) {
        this.powers[id] = Math.min(max, this.powers[id] + 1);
      }
    }

    const awardedLockBonus = this.triggerLockSealBonus(newlyLocked, allLocksDone);

    if (
      justCompletedLocks &&
      awardedLockBonus === 0 &&
      !this.bonusActive &&
      !this.bankedWin &&
      !this.level.isPlacement
    ) {
      const wavesLeft = this.level.minWaves - this.wave - 1;
      const tail =
        wavesLeft <= 0
          ? 'The next wave is the Final Wave.'
          : wavesLeft === 1
          ? 'Clear 1 more wave to unlock the Final Wave.'
          : `Clear ${wavesLeft} more waves to reach the Final Wave.`;
      this.callbacks.onToast(`All Rift Locks filled! ${tail}`);
    }

    if (this.phase === 'build' || this.phase === 'between') {
      this.wordsForgedInWait += 1;
      this.wordsUntilWave = Math.max(0, this.wordsUntilWave - 1);
      if (this.wordsUntilWave === 0) {
        this.startNextWave();
      } else if (this.wordsUntilWave === 1) {
        const nextIsFinal =
          !this.bonusActive && this.locksReady && this.wave + 1 >= this.level.minWaves;
        const warnMsg =
          this.defenders.length === 0
            ? 'Last word before Wave 1! Place defenders now before you guess.'
            : this.bonusActive
            ? `Last word before Bonus Wave ${this.bonusWave + 1}! Build or upgrade towers before you guess.`
            : nextIsFinal
            ? 'Last word before the Final Wave! Build or upgrade towers before you guess.'
            : `Last word before Wave ${this.wave + 1}! Build or upgrade defenders before you guess.`;
        this.callbacks.onToast(warnMsg);
      }
    }
    this.emitSnapshot();
  }

  public onSimulatedRound(
    wordCount: number,
    allLocksDone: boolean,
    newlyLocked: Array<{ vowel: string; label: string }> = []
  ) {
    const justCompletedLocks = !this.locksReady && allLocksDone;
    this.locksReady = allLocksDone;
    for (const id of ['rally', 'meteor', 'freeze'] as HeroPowerId[]) {
      const max = HERO_POWERS[id].charge;
      if (this.powers[id] < max) {
        this.powers[id] = Math.min(max, this.powers[id] + wordCount);
      }
    }

    const awardedLockBonus = this.triggerLockSealBonus(newlyLocked, allLocksDone);

    if (
      justCompletedLocks &&
      awardedLockBonus === 0 &&
      !this.bonusActive &&
      !this.bankedWin &&
      !this.level.isPlacement
    ) {
      const wavesLeft = this.level.minWaves - this.wave - 1;
      const tail =
        wavesLeft <= 0
          ? 'The next wave is the Final Wave.'
          : wavesLeft === 1
          ? 'Clear 1 more wave to unlock the Final Wave.'
          : `Clear ${wavesLeft} more waves to reach the Final Wave.`;
      this.callbacks.onToast(`All Rift Locks filled! ${tail}`);
    }

    this.emitSnapshot();
  }

  public callWave() {
    if (this.phase === 'build' || this.phase === 'between') {
      this.startNextWave();
    }
  }

  public triggerMegaBlast() {
    this.wardenCastTimer = 1.2;
    this.shakeTimer = 0.45;
    this.shakeStrength = 10;
    this.rings.push({
      x: this.campPos.x,
      y: this.campPos.y,
      r0: 30,
      r1: 1150,
      color: '#38e0ff',
      lineWidth: 10,
      age: 0,
      life: 0.78,
      fillAlpha: 0.18,
    });
    this.rings.push({
      x: this.campPos.x,
      y: this.campPos.y,
      r0: 16,
      r1: 900,
      color: '#fbbf24',
      lineWidth: 6,
      age: 0,
      life: 0.65,
    });
    this.spawnExplosion(this.campPos.x, this.campPos.y - 12, 130, 'plasma', { shake: 11, crater: false });
    this.spawnBurst(this.campPos.x, this.campPos.y, '#38e0ff', 28);
    this.spawnFloatingText(this.campPos.x, this.campPos.y - 75, 'MEGA FORGE!', '#fbbf24', 1.45);

    for (const cr of this.creatures) {
      if (!cr.alive) continue;
      this.spawnBurst(cr.x, cr.y - 16, '#fbbf24', 8);
      this.damageCreature(cr, FORGE_CONFIG.megaBlast, { armorPierce: true, damageType: 'true' });
    }
    sound.sfx('mega');
    this.emitSnapshot();
  }

  public castHeroPower(id: HeroPowerId) {
    const cfg = HERO_POWERS[id];
    if (this.powers[id] < cfg.charge || this.phase === 'done' || this.phase === 'milestone') return;

    this.powers[id] = 0;
    this.powersUsed += 1;
    this.wardenCastTimer = 1.0;

    if (id === 'rally') {
      this.rallyTimer = cfg.time || 10;
      sound.sfx('power');
      for (const def of this.defenders) {
        this.rings.push({
          x: def.pad.x,
          y: def.pad.y,
          r0: 14,
          r1: 88,
          color: '#fbbf24',
          lineWidth: 5,
          age: 0,
          life: 0.65,
        });
        this.spawnBurst(def.pad.x, def.pad.y - 16, '#fbbf24', 10);
      }
      this.spawnFloatingText(this.wardenPos.x, this.wardenPos.y - 72, 'RALLY!', '#fbbf24', 1.3);
      this.callbacks.onToast('Rally active! Defenders strike faster.', 'power.rally');
    } else if (id === 'meteor') {
      const alive = this.creatures.filter((c) => c.alive);
      let targetPos: Vec2 = this.path.pointAt(0.42);
      if (alive.length > 0) {
        let best = alive[0];
        let bestCount = -1;
        for (const c of alive) {
          const cnt = alive.filter((o) => Math.hypot(o.x - c.x, o.y - c.y) < 150).length;
          if (cnt > bestCount) {
            bestCount = cnt;
            best = c;
          }
        }
        targetPos = { x: best.x, y: best.y };
      }

      this.meteors.push({
        sx: targetPos.x + 260,
        sy: targetPos.y - 480,
        tx: targetPos.x,
        ty: targetPos.y,
        age: 0,
        life: 0.44,
        impacted: false,
      });
      sound.sfx('meteorLaunch');
      this.callbacks.onToast('Meteor strike incoming!', 'power.meteor');
    } else if (id === 'freeze') {
      this.freezeTimer = cfg.time || 5;
      sound.sfx('frost');
      this.rings.push({
        x: this.riftPos.x + 280,
        y: this.riftPos.y + 160,
        r0: 20,
        r1: 960,
        color: '#7dd3fc',
        lineWidth: 8,
        age: 0,
        life: 0.72,
        fillAlpha: 0.16,
      });
      for (const cr of this.creatures) {
        if (!cr.alive) continue;
        cr.freezeTimer = Math.max(cr.freezeTimer, this.freezeTimer);
        this.spawnBurst(cr.x, cr.y - 12, '#7dd3fc', 8);
      }
      this.spawnFloatingText(this.wardenPos.x, this.wardenPos.y - 72, 'TIME FREEZE!', '#7dd3fc', 1.3);
      this.callbacks.onToast('Time Freeze! Every creature is frozen solid.', 'power.freeze');
    }

    this.emitSnapshot();
  }

  public upgradeSelected(specChoice?: 'a' | 'b') {
    const def = this.selectedDef;
    if (!def) return;
    const cfg = DEFENDERS[def.type];

    if (def.level < 3) {
      const cost = cfg.up[def.level - 1];
      if (this.crystals < cost) {
        this.callbacks.onToast(`Need ${cost} crystals to upgrade.`);
        sound.sfx('soft');
        return;
      }
      this.crystals -= cost;
      def.spent += cost;
      def.level += 1;
      this.upgradedCount += 1;
      const st = this.getDefenderStats(def);
      if (st.hp) {
        def.maxHp = st.hp;
        def.hp = st.hp;
      }
      this.rings.push({
        x: def.pad.x,
        y: def.pad.y,
        r0: 12,
        r1: 72,
        color: '#fbbf24',
        lineWidth: 4,
        age: 0,
        life: 0.55,
      });
      this.spawnBurst(def.pad.x, def.pad.y - 18, '#fbbf24', 14);
      this.spawnFloatingText(def.pad.x, def.pad.y - 60, `LV ${def.level}!`, '#fbbf24', 1.1);
      sound.sfx('select');
      this.callbacks.onToast(`${cfg.name} upgraded to Level ${def.level}!`);
    } else if (!def.spec && specChoice) {
      const sp = cfg.spec[specChoice];
      if (this.crystals < sp.cost) {
        this.callbacks.onToast(`Need ${sp.cost} crystals for ${sp.name}.`);
        sound.sfx('soft');
        return;
      }
      this.crystals -= sp.cost;
      def.spent += sp.cost;
      def.spec = specChoice;
      const st = this.getDefenderStats(def);
      if (st.hp) {
        def.maxHp = st.hp;
        def.hp = st.hp;
      }
      this.rings.push({
        x: def.pad.x,
        y: def.pad.y,
        r0: 16,
        r1: 92,
        color: '#c084fc',
        lineWidth: 5,
        age: 0,
        life: 0.65,
      });
      this.spawnBurst(def.pad.x, def.pad.y - 20, '#c084fc', 18);
      this.spawnFloatingText(def.pad.x, def.pad.y - 64, sp.name.toUpperCase(), '#e879f9', 1.15);
      sound.sfx('power');
      this.callbacks.onToast(`${cfg.name} specialized into ${sp.name}!`);
    }

    this.emitSnapshot();
  }

  public setSelectedTargetMode(mode: TargetPriority) {
    const def = this.selectedDef;
    if (!def || def.targetMode === mode) return;
    def.targetMode = mode;
    if (def.beamTargetId) {
      def.beamTargetId = null;
      def.beamStacks = 0;
    }
    sound.sfx('tap');
    const label = mode === 'first' ? 'FIRST' : mode === 'last' ? 'LAST' : 'STRONG';
    this.spawnFloatingText(def.pad.x, def.pad.y - 62, `TARGET: ${label}`, '#67e8f9', 0.92);
    this.emitSnapshot();
  }

  public sellSelected() {
    const def = this.selectedDef;
    if (!def) return;
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
    this.selectedDef = null;
    this.spawnBurst(def.pad.x, def.pad.y - 12, '#38e0ff', 10);
    this.spawnFloatingText(def.pad.x, def.pad.y - 36, `+${refund}`, '#38e0ff', 1.05);
    sound.sfx('tap');
    this.callbacks.onToast(`Defender sold for +${refund} crystals.`);
    this.emitSnapshot();
  }

  // --- Core Combat Simulation ---

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

  private placeDefender(pad: PadRuntime, type: DefenderType) {
    const cfg = DEFENDERS[type];
    this.crystals -= cfg.cost;
    const baseStats = cfg.levels[0];
    const def: DefenderRuntime = {
      id: `def-${this.idCounter++}`,
      type,
      pad,
      level: 1,
      spec: null,
      targetMode: type === 'rail' ? 'strong' : 'first',
      spent: cfg.cost,
      cd: 0,
      freezeCd: 4,
      hp: baseStats.hp || 0,
      maxHp: baseStats.hp || 0,
      downTimer: 0,
      holding: [],
      recoil: 0.35,
      facingLeft: false,
      pulsePhase: Math.random() * Math.PI * 2,
    };
    pad.def = def;
    this.defenders.push(def);
    this.buildSel = null;
    this.selectedDef = null;

    this.rings.push({
      x: pad.x,
      y: pad.y,
      r0: 10,
      r1: 62,
      color: '#38e0ff',
      lineWidth: 4,
      age: 0,
      life: 0.45,
    });
    this.spawnBurst(pad.x, pad.y - 12, '#38e0ff', 14);
    sound.sfx('build');
    this.callbacks.onToast(`${cfg.name} built!`);
    this.emitSnapshot();
  }

  private startNextWave() {
    this.wave += 1;

    let waveDef: WaveDef;
    let hpScale = 1;
    let countMult = 1;

    if (this.bonusActive) {
      this.bonusWave += 1;
      this.finalWave = false;
      const baseIdx = Math.min(
        this.level.waves.length - 1,
        Math.max(0, this.level.waves.length - 3 + (this.bonusWave - 1))
      );
      waveDef = this.level.waves[baseIdx];
      hpScale = (waveDef.hp || 1) * (1.2 + this.bonusWave * 0.22);
      countMult = 1 + this.bonusWave * 0.16;
    } else {
      const waveIdx = Math.min(this.wave - 1, this.level.waves.length - 1);
      waveDef = this.level.waves[waveIdx];
      const extraWaves = Math.max(0, this.wave - this.level.waves.length);
      const extraScale = 1 + extraWaves * this.level.endless.hpStep;
      // Next wave becomes the Final Wave once all locks are filled (with minWaves floor)
      this.finalWave = this.locksReady && this.wave >= this.level.minWaves;
      hpScale = (waveDef.hp || 1) * extraScale * (this.finalWave ? this.level.finalBoost : 1);
      countMult = extraWaves > 0 ? 1 + extraWaves * this.level.endless.countStep : 1;
    }

    this.phase = 'wave';
    this.waveClock = 0;
    this.spawnQueue = [];

    const dial = this.difficultyDials[this.difficulty] || DEFAULT_DIFFICULTY_DIAL_ROW;
    const dialCountMult = dial.countPct / 100;

    let t = 0.6;
    for (const grp of waveDef.groups) {
      const startAt = grp.delay !== undefined ? Math.max(0.6, grp.delay) : t;
      let cursor = startAt;
      const isBoss = Boolean(CREATURES[grp.type]?.isBoss);
      const baseCount = countMult > 1 ? Math.round(grp.count * countMult) : grp.count;
      const count = isBoss ? baseCount : Math.max(1, Math.round(baseCount * dialCountMult));
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

    this.rings.push({
      x: this.riftPos.x,
      y: this.riftPos.y,
      r0: 18,
      r1: 150,
      color: this.bonusActive ? '#38e0ff' : '#e879f9',
      lineWidth: 5,
      age: 0,
      life: 0.75,
    });

    sound.setMusic('battle');
    sound.sfx('waveStart');
    if (this.bonusActive) {
      this.callbacks.onToast(
        `Bonus Wave ${this.bonusWave} of ${this.level.bonusSurgeWaves} incoming!`,
        `battle.waveStart.${this.bonusWave}`
      );
    } else {
      this.callbacks.onToast(
        this.finalWave
          ? `Final Wave! Hold the Rift Anchor to seal ${this.level.name}.`
          : `Wave ${this.wave} incoming from the Rift!`,
        this.finalWave ? 'battle.finalWave' : `battle.waveStart.${this.wave}`
      );
    }
    this.emitSnapshot();
  }

  private spawnCreature(type: CreatureType, hpMult: number, startS = 0, startLane?: number) {
    const cfg = CREATURES[type];
    const diffCfg = DIFFICULTIES[this.difficulty] || DIFFICULTIES.normal;
    const dial = this.difficultyDials[this.difficulty] || DEFAULT_DIFFICULTY_DIAL_ROW;
    const scaledHp = Math.max(
      1,
      Math.round(cfg.hp * hpMult * diffCfg.hpMult * (dial.healthPct / 100))
    );
    const startPt = this.path.pointAt(startS);
    const lane = startLane !== undefined ? startLane : (Math.random() - 0.5) * 20;
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
      speed: cfg.speed * diffCfg.speedMult * (dial.speedPct / 100),
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
      dotAccum: 0,
      resistTextCd: 0,
      abilityCd: type === 'weaver' ? 2.4 : type === 'ironwarden' ? 4.8 : type === 'galewraith' ? 3.2 : 0,
      dashTimer: 0,
      summonsUsed: 0,
      heldBy: null,
      attackCd: 0.8,
      hitFlash: 0,
      animPhase: Math.random() * Math.PI * 2,
    };
    this.creatures.push(cr);
    if (startS === 0) {
      this.spawnBurst(this.riftPos.x, this.riftPos.y, cfg.isBoss ? '#fbbf24' : '#e879f9', cfg.isBoss ? 18 : 8);
    }
  }

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
    let resistLabel = '';
    if (dType === 'fire') {
      typeResist = cfg.fireResist || 0;
      resistLabel = 'FIRE RESIST';
    } else if (dType === 'electric') {
      typeResist = cfg.electricResist || 0;
      resistLabel = 'SHOCK RESIST';
    } else if (dType === 'arrow') {
      typeResist = cfg.arrowResist || 0;
      resistLabel = 'ARROW RESIST';
    } else if (dType === 'frost') {
      typeResist = cfg.slowResist || 0;
      resistLabel = 'FROST RESIST';
    } else if (dType === 'gravity') {
      typeResist = cfg.gravityResist || 0;
      resistLabel = 'GRAV RESIST';
    }

    const armorFactor = armorActive && !opts?.armorPierce && dType !== 'true' ? 1 - effectiveArmor : 1;
    const typeFactor = dType !== 'true' ? 1 - typeResist : 1;
    const totalMult = Math.max(0.22, armorFactor * typeFactor);
    const mitigated = dmg * totalMult;
    const heavilyResisted = typeResist >= 0.4 || (armorActive && !opts?.armorPierce && dType !== 'true');

    if (opts?.isDot) {
      cr.hp -= mitigated;
      cr.dotAccum += mitigated;
      if (cr.dotAccum >= 6) {
        const shown = Math.round(cr.dotAccum);
        cr.dotAccum = 0;
        cr.hitFlash = Math.max(cr.hitFlash, 0.08);
        const dmgColor = heavilyResisted
          ? '#94a3b8'
          : dType === 'frost'
          ? '#7dd3fc'
          : dType === 'gravity'
          ? '#c084fc'
          : '#fbbf24';
        this.spawnFloatingText(
          cr.x + (Math.random() - 0.5) * 18,
          cr.y - 38,
          `-${shown}`,
          dmgColor,
          0.85
        );
      }
    } else {
      const rounded = Math.max(1, Math.round(mitigated));
      cr.hp -= rounded;
      cr.hitFlash = 0.14;

      if (typeResist >= 0.4 && resistLabel && cr.resistTextCd <= 0) {
        cr.resistTextCd = 2.6;
        this.spawnFloatingText(cr.x, cr.y - 56, resistLabel, '#cbd5e1', 0.78);
      }

      if (armorActive && !opts?.armorPierce && dmg >= 8 && Math.random() < 0.32) {
        this.spawnBurst(cr.x, cr.y - 26, '#fbbf24', 3);
      }

      if (rounded >= 4 || Math.random() < 0.35) {
        const dmgColor =
          opts?.armorPierce && armorActive
            ? '#38e0ff'
            : heavilyResisted
            ? '#94a3b8'
            : '#fbbf24';
        this.spawnFloatingText(
          cr.x + (Math.random() - 0.5) * 18,
          cr.y - 38,
          `-${rounded}`,
          dmgColor,
          rounded >= 25 ? 1.2 : 0.95
        );
      }
    }

    if (opts?.armorShred && opts.armorShred > 0) {
      const wasIntact = cr.armorShredTimer <= 0 && (baseArmor > 0 || cr.shieldTimer > 0);
      cr.armorShredTimer = Math.max(cr.armorShredTimer, opts.armorShred);
      if (cr.shieldTimer > 0) cr.shieldTimer = 0;
      if (wasIntact) {
        this.spawnFloatingText(cr.x, cr.y - 68, 'ARMOR CRACKED!', '#38e0ff', 1.05);
      }
    }

    if (cr.hp <= 0) {
      cr.alive = false;
      if (cr.heldBy) {
        cr.heldBy.holding = cr.heldBy.holding.filter((c) => c !== cr);
        cr.heldBy = null;
      }
      this.kills += 1;
      this.shards += cr.shards;
      this.crystals += cr.shards;

      const burstCol =
        cr.type === 'wisp' || cr.type === 'bat'
          ? '#f0abfc'
          : cr.type === 'shrieker' || cr.type === 'cinderimp'
          ? '#fb923c'
          : cr.type === 'shieldbearer' || cr.type === 'weaver'
          ? '#f59e0b'
          : cr.type === 'ironwarden'
          ? '#fb923c'
          : cr.type === 'splitter'
          ? '#38e0ff'
          : cr.type === 'thornking'
          ? '#c084fc'
          : '#a3e635';
      this.spawnBurst(cr.x, cr.y - 12, burstCol, cfg.isBoss ? 36 : 14);
      this.spawnFloatingText(cr.x, cr.y - 52, `+${cr.shards}`, '#38e0ff', cfg.isBoss ? 1.35 : 0.95);

      if (cfg.splitsInto) {
        const childHpMult = Math.max(1, cr.maxHp / Math.max(1, cfg.hp));
        const count = cfg.splitsInto.count;
        for (let i = 0; i < count; i++) {
          const offset = count === 1 ? 0 : (i === 0 ? -18 : 18);
          this.spawnCreature(
            cfg.splitsInto.type,
            childHpMult,
            Math.min(0.95, Math.max(0.02, cr.s)),
            Math.max(-24, Math.min(24, cr.lane + offset))
          );
        }
        this.rings.push({
          x: cr.x,
          y: cr.y,
          r0: 12,
          r1: 72,
          color: '#38e0ff',
          lineWidth: 4,
          age: 0,
          life: 0.45,
        });
        this.spawnBurst(cr.x, cr.y - 16, '#e879f9', 12);
        this.spawnFloatingText(cr.x, cr.y - 76, 'SPLIT!', '#38e0ff', 1.1);
      }

      if (cfg.isBoss) {
        const bossTitle = cr.type === 'ironwarden' ? 'IRON WARDEN FALLS!' : 'THORNKING FALLS!';
        this.spawnExplosion(cr.x, cr.y - 26, 175, 'boss', { shake: 15, crater: true });
        this.rings.push({
          x: cr.x,
          y: cr.y,
          r0: 20,
          r1: 255,
          color: '#fbbf24',
          lineWidth: 9,
          age: 0,
          life: 0.78,
          fillAlpha: 0.24,
        });
        this.rings.push({
          x: cr.x,
          y: cr.y,
          r0: 12,
          r1: 195,
          color: '#e879f9',
          lineWidth: 6,
          age: 0,
          life: 0.62,
        });
        this.spawnFloatingText(cr.x, cr.y - 96, bossTitle, '#fbbf24', 1.45);
      } else {
        this.spawnExplosion(cr.x, cr.y - 14, 34, cr.type === 'cinderimp' ? 'fire' : 'plasma', {
          shake: 0,
          crater: false,
          light: true,
        });
      }

      sound.sfx(cfg.isBoss ? 'bossDie' : 'enemyDie', cfg.isBoss ? 0 : 60);
    }
  }

  private spawnFloatingText(x: number, y: number, text: string, color: string, scale = 1) {
    this.floatingTexts.push({
      x,
      y,
      vy: -42,
      text,
      color,
      age: 0,
      life: 0.95,
      scale,
    });
  }

  private pushParticle(p: Particle) {
    const cap = this.focusMode ? 90 : 340;
    if (this.particles.length >= cap) {
      this.particles.shift();
    }
    this.particles.push(p);
  }

  private addShake(strength: number, duration = 0.28) {
    if (this.focusMode || strength <= 0) return;
    this.shakeStrength = Math.max(this.shakeStrength, strength);
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  private spawnExplosion(
    x: number,
    y: number,
    radius: number,
    theme: ExplosionTheme,
    opts?: { shake?: number; crater?: boolean; light?: boolean }
  ) {
    const isLight = Boolean(opts?.light);
    const scale = this.focusMode ? 0.68 : 1;
    const r = radius * scale;
    const lobeCount = isLight ? 3 : this.focusMode ? 4 : theme === 'inferno' || theme === 'boss' ? 8 : 6;
    const lobes: ExplosionLobe[] = [];
    for (let i = 0; i < lobeCount; i++) {
      const ang = (Math.PI * 2 * i) / lobeCount + (Math.random() - 0.5) * 0.55;
      const dist = i === 0 ? 0 : r * (0.22 + Math.random() * 0.28);
      lobes.push({
        ox: Math.cos(ang) * dist,
        oy: Math.sin(ang) * dist * 0.72,
        scale: i === 0 ? 0.85 : 0.42 + Math.random() * 0.34,
        delay: i === 0 ? 0 : Math.random() * 0.14,
      });
    }

    if (this.explosions.length >= 28) this.explosions.shift();
    this.explosions.push({
      x,
      y,
      radius: r,
      age: 0,
      life: isLight ? 0.28 : theme === 'inferno' || theme === 'boss' ? 0.72 : 0.5,
      theme,
      lobes,
    });

    if (opts?.crater && !this.focusMode) {
      if (this.craters.length >= 14) this.craters.shift();
      const glowColor =
        theme === 'fire' || theme === 'inferno'
          ? '#f97316'
          : theme === 'boss'
          ? '#fbbf24'
          : theme === 'frost'
          ? '#38e0ff'
          : theme === 'gravity'
          ? '#a855f7'
          : '#94a3b8';
      this.craters.push({
        x,
        y: y + 6,
        radius: Math.min(110, r * 0.56),
        age: 0,
        life: 3.4,
        glowColor,
      });
    }

    if (opts?.shake) {
      this.addShake(opts.shake, theme === 'inferno' || theme === 'boss' ? 0.48 : 0.26);
    }

    if (isLight) return;

    // Directional streaking sparks + shards + rising smoke plume
    const palette: Record<ExplosionTheme, { sparks: string[]; shard: string; smoke?: string }> = {
      fire: { sparks: ['#fef08a', '#fbbf24', '#f97316', '#ef4444'], shard: '#fb923c', smoke: 'rgba(30, 27, 26, 0.58)' },
      inferno: { sparks: ['#ffffff', '#fef08a', '#fb923c', '#ef4444'], shard: '#f97316', smoke: 'rgba(24, 18, 16, 0.66)' },
      plasma: { sparks: ['#ffffff', '#67e8f9', '#38e0ff', '#fbbf24'], shard: '#38e0ff' },
      electric: { sparks: ['#ffffff', '#67e8f9', '#38e0ff', '#c084fc'], shard: '#a5f3fc' },
      frost: { sparks: ['#ffffff', '#bae6fd', '#38e0ff'], shard: '#e0f2fe' },
      earth: { sparks: ['#fef08a', '#d6d3d1', '#a8a29e'], shard: '#78716c', smoke: 'rgba(68, 64, 60, 0.48)' },
      gravity: { sparks: ['#f5d0fe', '#c084fc', '#38e0ff'], shard: '#a855f7' },
      boss: { sparks: ['#ffffff', '#fef08a', '#fbbf24', '#e879f9'], shard: '#fbbf24', smoke: 'rgba(28, 16, 38, 0.58)' },
    };
    const pal = palette[theme];
    const sparkCount = this.focusMode ? 6 : Math.min(28, Math.max(10, Math.round(r * 0.2)));
    for (let i = 0; i < sparkCount; i++) {
      const ang = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.45;
      const spd = (95 + Math.random() * 210) * Math.min(1.5, Math.max(0.75, r / 85));
      this.pushParticle({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd * 0.8 - 35,
        r: 2.2 + Math.random() * 2.6,
        color: pal.sparks[i % pal.sparks.length],
        age: 0,
        life: 0.3 + Math.random() * 0.34,
        glow: true,
        kind: 'streak',
        drag: 2.2,
        gravity: 170,
      });
    }

    const shardCount = this.focusMode ? 3 : Math.min(14, Math.max(5, Math.round(r * 0.09)));
    for (let i = 0; i < shardCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 70 + Math.random() * 160;
      this.pushParticle({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd * 0.75 - 55,
        r: 3.4 + Math.random() * 3.8,
        color: pal.shard,
        age: 0,
        life: 0.42 + Math.random() * 0.32,
        glow: theme !== 'earth',
        kind: 'shard',
        drag: 1.4,
        gravity: 240,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 14,
      });
    }

    if (pal.smoke && !this.focusMode) {
      const smokeCount = Math.min(10, Math.max(4, Math.round(r * 0.07)));
      for (let i = 0; i < smokeCount; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 18 + Math.random() * 44;
        this.pushParticle({
          x: x + (Math.random() - 0.5) * r * 0.35,
          y: y + (Math.random() - 0.5) * r * 0.25,
          vx: Math.cos(ang) * spd,
          vy: -24 - Math.random() * 38,
          r: 10 + Math.random() * (r * 0.16),
          color: pal.smoke,
          age: 0,
          life: 0.65 + Math.random() * 0.55,
          kind: 'smoke',
          drag: 1.8,
          gravity: -22,
        });
      }
    }
  }

  private spawnBurst(x: number, y: number, color: string, count: number) {
    if (this.focusMode) count = Math.min(count, 4);
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const spd = 55 + Math.random() * 145;
      this.pushParticle({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 24,
        r: 2.5 + Math.random() * 3.4,
        color,
        age: 0,
        life: 0.34 + Math.random() * 0.32,
        glow: true,
        kind: i % 2 === 0 ? 'streak' : 'dot',
        drag: 1.8,
        gravity: 110,
      });
    }
  }

  private loop = (ts: number) => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.loop);

    const rawDt = Math.min(0.05, Math.max(0.001, (ts - this.lastTs) / 1000));
    this.lastTs = ts;
    this.clock += rawDt;

    if (!this.paused && !this.externalHold && this.phase !== 'done' && this.phase !== 'milestone') {
      this.stepSimulation(rawDt * this.speed);
    }

    this.stepEffects(rawDt);
    this.render();

    this.snapAccum += rawDt;
    if (this.snapAccum >= 0.14) {
      this.snapAccum = 0;
      this.emitSnapshot();
    }
  };

  private stepSimulation(dt: number) {
    if (this.rallyTimer > 0) this.rallyTimer = Math.max(0, this.rallyTimer - dt);
    if (this.freezeTimer > 0) this.freezeTimer = Math.max(0, this.freezeTimer - dt);
    if (this.wardenCastTimer > 0) this.wardenCastTimer = Math.max(0, this.wardenCastTimer - dt);

    // Spawn creatures during active wave
    if (this.phase === 'wave') {
      this.waveClock += dt;
      while (this.spawnQueue.length > 0 && this.spawnQueue[0].at <= this.waveClock) {
        const ticket = this.spawnQueue.shift()!;
        this.spawnCreature(ticket.type, ticket.hpMult);
      }
    }

    // Update creatures
    const pathUnitFactor = 0.055; // maps level1 speed (~1.05..1.9) cleanly to ~11-18s traverse across S-curve
    for (const cr of this.creatures) {
      if (!cr.alive) continue;
      cr.animPhase += dt * (cr.type === 'wisp' ? 7 : cr.type === 'cinderimp' ? 12 : 8.5);
      if (cr.hitFlash > 0) cr.hitFlash = Math.max(0, cr.hitFlash - dt);

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
      if (cr.resistTextCd > 0) {
        cr.resistTextCd = Math.max(0, cr.resistTextCd - dt);
      }

      if (cr.freezeTimer > 0) {
        cr.freezeTimer = Math.max(0, cr.freezeTimer - dt);
        continue;
      }

      // Forge Weaver: periodic Golden Forge Pulse heals & shields up to 3 nearby allies
      if (cr.type === 'weaver') {
        cr.abilityCd -= dt;
        if (cr.abilityCd <= 0) {
          cr.abilityCd = 3.4;
          const auraR = 2.9 * this.RANGE_UNIT_PX;
          const allies = this.creatures
            .filter(
              (a) =>
                a.alive &&
                a !== cr &&
                Math.hypot(a.x - cr.x, a.y - cr.y) <= auraR
            )
            .sort((a, b) => a.hp / Math.max(1, a.maxHp) - b.hp / Math.max(1, b.maxHp))
            .slice(0, 3);
          if (allies.length > 0) {
            this.rings.push({
              x: cr.x,
              y: cr.y - 24,
              r0: 12,
              r1: auraR * 0.72,
              color: '#fbbf24',
              lineWidth: 3.5,
              age: 0,
              life: 0.48,
              fillAlpha: 0.08,
            });
            for (const ally of allies) {
              const healAmt = Math.max(8, Math.round(ally.maxHp * 0.14));
              ally.hp = Math.min(ally.maxHp, ally.hp + healAmt);
              ally.shieldTimer = Math.max(ally.shieldTimer, 3.0);
              this.spawnBurst(ally.x, ally.y - 28, '#fde047', 6);
              this.spawnFloatingText(ally.x, ally.y - 54, `+${healAmt}`, '#fde047', 0.9);
            }
          }
        }
      } else if (cr.type === 'ironwarden') {
        // The Iron Warden boss: periodic Iron Aegis warhammer slam shields nearby escorts & spawns Cinder Imps
        cr.abilityCd -= dt;
        if (cr.abilityCd <= 0) {
          cr.abilityCd = 6.5;
          const slamR = 3.4 * this.RANGE_UNIT_PX;
          this.shakeTimer = Math.max(this.shakeTimer, 0.25);
          this.shakeStrength = Math.max(this.shakeStrength, 6);
          this.rings.push({
            x: cr.x,
            y: cr.y - 18,
            r0: 18,
            r1: slamR,
            color: '#fb923c',
            lineWidth: 5,
            age: 0,
            life: 0.58,
            fillAlpha: 0.12,
          });
          this.spawnFloatingText(cr.x, cr.y - 96, 'IRON AEGIS!', '#fb923c', 1.25);
          for (const ally of this.creatures) {
            if (!ally.alive || ally === cr) continue;
            if (Math.hypot(ally.x - cr.x, ally.y - cr.y) <= slamR) {
              ally.shieldTimer = Math.max(ally.shieldTimer, 3.5);
              this.spawnBurst(ally.x, ally.y - 24, '#fbbf24', 5);
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
        if (Math.random() < dt * 16) {
          this.particles.push({
            x: cr.x - cr.vx * 18 + (Math.random() - 0.5) * 14,
            y: cr.y - 26 + (Math.random() - 0.5) * 16,
            vx: -cr.vx * 45,
            vy: -cr.vy * 45 - 8,
            r: 2.8 + Math.random() * 2.2,
            color: '#67e8f9',
            age: 0,
            life: 0.32,
            glow: true,
          });
        }
      }

      if (cr.type === 'galewraith' && !cr.heldBy) {
        cr.abilityCd -= dt;
        // Gale Wraith triggers a Wind Dash speed burst unless chilled/snared
        if (cr.abilityCd <= 0 && cr.slowTimer <= 0 && cr.s > 0.04 && cr.s < 0.9) {
          cr.abilityCd = 4.8;
          cr.dashTimer = 1.15;
          this.rings.push({
            x: cr.x,
            y: cr.y - 24,
            r0: 10,
            r1: 48,
            color: '#67e8f9',
            lineWidth: 3.5,
            age: 0,
            life: 0.4,
          });
          this.spawnBurst(cr.x, cr.y - 24, '#a5f3fc', 8);
          this.spawnFloatingText(cr.x, cr.y - 62, 'GALE DASH!', '#67e8f9', 0.92);
        }
      }

      // Held in melee combat by a Stone Golem
      if (cr.heldBy) {
        const golem = cr.heldBy;
        if (golem.downTimer > 0 || !this.defenders.includes(golem)) {
          cr.heldBy = null;
        } else {
          cr.attackCd -= dt;
          if (cr.attackCd <= 0) {
            cr.attackCd = 1.15;
            golem.hp -= cr.hitDmg;
            this.spawnBurst(golem.pad.x, golem.pad.y - 20, '#fb923c', 5);
            if (golem.hp <= 0) {
              golem.hp = 0;
              golem.downTimer = 10;
              for (const c of golem.holding) c.heldBy = null;
              golem.holding = [];
              this.spawnBurst(golem.pad.x, golem.pad.y - 16, '#94a3b8', 16);
              sound.sfx('soft');
            }
          }
          continue;
        }
      }

      const prevX = cr.x;
      const prevY = cr.y;
      const dashMult = cr.dashTimer > 0 ? 1.85 : 1;
      cr.s += cr.speed * cr.slowMult * dashMult * pathUnitFactor * dt;

      if (cr.s >= 1) {
        cr.alive = false;
        this.anchor = Math.max(0, this.anchor - cr.anchorDmg);
        this.shakeTimer = 0.35;
        this.shakeStrength = 8;
        this.rings.push({
          x: this.campPos.x,
          y: this.campPos.y,
          r0: 14,
          r1: 95,
          color: '#fb7185',
          lineWidth: 5,
          age: 0,
          life: 0.55,
        });
        this.spawnFloatingText(this.campPos.x, this.campPos.y - 50, `-${cr.anchorDmg} HP`, '#fb7185', 1.25);
        sound.sfx('anchorHit');

        if (this.anchor <= 0) {
          if (this.bonusActive && this.bankedWin) {
            this.finishBattle(true, true);
          } else {
            this.finishBattle(false, false);
          }
          return;
        }
        continue;
      }

      const pt = this.path.pointAt(cr.s);
      // Perpendicular lane offset so packs look organic instead of single-file
      const nx = -pt.ty;
      const ny = pt.tx;
      cr.x = pt.x + nx * cr.lane;
      cr.y = pt.y + ny * cr.lane;
      cr.vx = cr.x - prevX;
      cr.vy = cr.y - prevY;

      // Subtle arcane/ember spark trail behind ethereal, fiery, flying, splitting, weaver, and boss creatures
      if (
        (cr.type === 'wisp' ||
          cr.type === 'cinderimp' ||
          cr.type === 'bat' ||
          cr.type === 'shrieker' ||
          cr.type === 'weaver' ||
          cr.type === 'bramble' ||
          cr.type === 'splitter' ||
          cr.type === 'thornking' ||
          cr.type === 'ironwarden') &&
        !this.focusMode &&
        Math.random() <
          dt *
            (cr.type === 'wisp' ||
            cr.type === 'cinderimp' ||
            cr.type === 'shrieker' ||
            cr.type === 'thornking' ||
            cr.type === 'ironwarden'
              ? 9
              : 5)
      ) {
        this.particles.push({
          x: cr.x + (Math.random() - 0.5) * (cr.type === 'thornking' || cr.type === 'ironwarden' ? 34 : 12),
          y:
            cr.y -
            (cr.type === 'bat' || cr.type === 'shrieker'
              ? 42
              : cr.type === 'weaver'
              ? 36
              : cr.type === 'cinderimp'
              ? 18
              : 24),
          vx: (Math.random() - 0.5) * 18,
          vy: -12 - Math.random() * 14,
          r: 2.2 + Math.random() * 2.2,
          color:
            cr.type === 'cinderimp' || cr.type === 'ironwarden'
              ? Math.random() < 0.5
                ? '#fb923c'
                : '#fde047'
              : cr.type === 'weaver'
              ? Math.random() < 0.5
                ? '#fbbf24'
                : '#38e0ff'
              : cr.type === 'shrieker'
              ? Math.random() < 0.5
                ? '#fb923c'
                : '#c084fc'
              : cr.type === 'splitter'
              ? Math.random() < 0.5
                ? '#38e0ff'
                : '#c084fc'
              : cr.type === 'thornking'
              ? Math.random() < 0.5
                ? '#fbbf24'
                : '#c084fc'
              : Math.random() < 0.5
              ? '#e879f9'
              : '#c084fc',
          age: 0,
          life: 0.45,
          glow: true,
        });
      }
    }

    this.creatures = this.creatures.filter((c) => c.alive);

    // Update defenders
    const rateBoost = this.rallyTimer > 0 ? 2 : 1;
    for (const def of this.defenders) {
      def.pulsePhase += dt * 3;
      if (def.recoil > 0) def.recoil = Math.max(0, def.recoil - dt * 2.6);

      const st = this.getDefenderStats(def);

      if (def.type === 'archer') {
        def.cd -= dt * rateBoost;
        if (def.cd <= 0) {
          const rangePx = (st.range || 6.8) * this.RANGE_UNIT_PX;
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
            def.recoil = 0.5;
            def.facingLeft = targets[0].x < def.pad.x;
            for (const target of targets) {
              this.projectiles.push({
                kind: 'arrow',
                sx: def.pad.x,
                sy: def.pad.y - 54,
                x: def.pad.x,
                y: def.pad.y - 54,
                tx: target.x,
                ty: target.y - 22,
                target,
                progress: 0,
                duration: Math.max(0.16, Math.min(0.42, Math.hypot(target.x - def.pad.x, target.y - def.pad.y) / 760)),
                arcHeight: 46,
                dmg: st.dmg || 14,
                color: def.spec === 'b' ? '#fbbf24' : '#38e0ff',
              });
            }
            this.spawnBurst(def.pad.x, def.pad.y - 54, def.spec === 'b' ? '#fbbf24' : '#67e8f9', 3);
            sound.sfx('arrow', 45);
          }
        }
      } else if (def.type === 'ember') {
        def.cd -= dt * rateBoost;
        if (def.cd <= 0) {
          const rangePx = (st.range || 6.6) * this.RANGE_UNIT_PX;
          const inRange = this.sortTargetsByPriority(
            this.creatures.filter(
              (cr) => cr.alive && Math.hypot(cr.x - def.pad.x, cr.y - def.pad.y) <= rangePx
            ),
            def.targetMode
          );
          const target = inRange[0] || null;
          if (target) {
            def.cd = 1 / (st.rate || 0.65);
            def.recoil = 0.72;
            def.facingLeft = target.x < def.pad.x;
            this.projectiles.push({
              kind: 'ember',
              sx: def.pad.x,
              sy: def.pad.y - 58,
              x: def.pad.x,
              y: def.pad.y - 58,
              tx: target.x,
              ty: target.y - 16,
              target,
              progress: 0,
              duration: Math.max(0.28, Math.min(0.58, Math.hypot(target.x - def.pad.x, target.y - def.pad.y) / 560)),
              arcHeight: 82,
              dmg: st.dmg || 22,
              splashRadius: (st.splash || 2.3) * this.RANGE_UNIT_PX,
              color: def.spec === 'a' ? '#f97316' : '#fbbf24',
            });
            // Fiery muzzle flash blast & smoke kickback
            this.spawnExplosion(def.pad.x, def.pad.y - 58, 28, 'fire', { shake: 0, light: true });
            this.spawnBurst(def.pad.x, def.pad.y - 56, '#fbbf24', 8);
            sound.sfx('cannonFire', 60);
          }
        }
      } else if (def.type === 'tesla') {
        def.cd -= dt * rateBoost;
        if (def.cd <= 0) {
          const rangePx = (st.range || 6.4) * this.RANGE_UNIT_PX;
          const orbX = def.pad.x;
          const orbY = def.pad.y - 78;

          // Overcharge Beam specialty (locks onto one high-priority target and ramps damage)
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
              def.recoil = 0.45;
              def.facingLeft = target.x < def.pad.x;

              const ty = target.y - (CREATURES[target.type].flying ? 34 : 20);
              this.lightningArcs.push({
                points: this.buildJaggedArcPoints(orbX, orbY, target.x, ty, 11 + stacks * 1.4),
                color: stacks >= 4 ? '#e879f9' : '#38e0ff',
                coreColor: '#ffffff',
                width: 3.8 + stacks * 0.72,
                age: 0,
                life: 0.26,
              });
              // Secondary crackling plasma filament
              this.lightningArcs.push({
                points: this.buildJaggedArcPoints(orbX, orbY, target.x, ty, 19 + stacks * 2),
                color: stacks >= 4 ? '#c084fc' : '#67e8f9',
                coreColor: '#ffffff',
                width: 1.6 + stacks * 0.2,
                age: 0,
                life: 0.18,
              });
              this.spawnExplosion(target.x, ty, 34 + stacks * 7, 'electric', {
                shake: stacks >= 4 ? 3.5 : 0,
                light: stacks < 3,
              });
              this.spawnBurst(target.x, ty, stacks >= 4 ? '#f0abfc' : '#67e8f9', 8 + stacks);
              this.damageCreature(target, hitDmg, { damageType: 'electric' });
              sound.sfx('zap', 60);
            } else {
              def.beamTargetId = null;
              def.beamStacks = 0;
            }
          } else {
            // Chain Lightning mode (hits primary target and arcs across nearby enemies, ground & air)
            const inRange = this.sortTargetsByPriority(
              this.creatures.filter(
                (cr) => cr.alive && Math.hypot(cr.x - def.pad.x, cr.y - def.pad.y) <= rangePx
              ),
              def.targetMode
            );
            const primary = inRange[0] || null;
            if (primary) {
              def.cd = 1 / (st.rate || 0.9);
              def.recoil = 0.55;
              def.facingLeft = primary.x < def.pad.x;

              const maxTargets = Math.max(1, st.chain || 3);
              const chainRangePx = (st.chainRange || 3.4) * this.RANGE_UNIT_PX;
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

              let prevX = orbX;
              let prevY = orbY;
              const baseDmg = st.dmg || 20;
              this.spawnExplosion(orbX, orbY, 24, 'electric', { shake: 0, light: true });
              struck.forEach((cr, hopIdx) => {
                const ty = cr.y - (CREATURES[cr.type].flying ? 34 : 20);
                const hopMult = Math.max(0.55, Math.pow(0.86, hopIdx));
                const hopDmg = Math.round(baseDmg * hopMult);
                this.lightningArcs.push({
                  points: this.buildJaggedArcPoints(prevX, prevY, cr.x, ty, hopIdx === 0 ? 13 : 10),
                  color: def.spec === 'a' ? '#a855f7' : '#38e0ff',
                  coreColor: '#e0f2fe',
                  width: Math.max(2.4, 4.6 - hopIdx * 0.4),
                  age: 0,
                  life: 0.25,
                });
                if (hopIdx === 0) {
                  this.lightningArcs.push({
                    points: this.buildJaggedArcPoints(prevX, prevY, cr.x, ty, 22),
                    color: def.spec === 'a' ? '#e879f9' : '#67e8f9',
                    coreColor: '#ffffff',
                    width: 1.6,
                    age: 0,
                    life: 0.17,
                  });
                  this.spawnExplosion(cr.x, ty, 44, 'electric', { shake: 2.2 });
                } else {
                  this.spawnExplosion(cr.x, ty, 28, 'electric', { shake: 0, light: true });
                }
                this.rings.push({
                  x: cr.x,
                  y: ty,
                  r0: 6,
                  r1: hopIdx === 0 ? 46 : 30,
                  color: def.spec === 'a' ? '#c084fc' : '#38e0ff',
                  lineWidth: 2.5,
                  age: 0,
                  life: 0.24,
                });
                this.spawnBurst(cr.x, ty, '#38e0ff', hopIdx === 0 ? 10 : 6);
                this.damageCreature(cr, hopDmg, { damageType: 'electric' });
                prevX = cr.x;
                prevY = ty;
              });
              sound.sfx('zap', 60);
            }
          }
        }
      } else if (def.type === 'rail') {
        def.cd -= dt * rateBoost;
        if (def.cd <= 0) {
          const rangePx = (st.range || 8.6) * this.RANGE_UNIT_PX;
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
            def.recoil = 0.72;
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

            const endDist =
              pierceMax > 1 ? Math.min(rangePx * 1.12, Math.max(dist + 95, 220)) : dist;
            const endX = muzzleX + ux * endDist;
            const endY = muzzleY + uy * endDist;

            this.lightningArcs.push({
              points: [
                { x: muzzleX, y: muzzleY },
                { x: endX, y: endY },
              ],
              color: def.spec === 'b' ? '#f59e0b' : '#22d3ee',
              coreColor: '#ffffff',
              width: def.spec ? 6.4 : 5.2,
              age: 0,
              life: 0.28,
            });
            // Crackling electromagnetic helix around rail slug
            this.lightningArcs.push({
              points: this.buildJaggedArcPoints(muzzleX, muzzleY, endX, endY, 10),
              color: def.spec === 'b' ? '#fde047' : '#67e8f9',
              coreColor: '#ffffff',
              width: 1.8,
              age: 0,
              life: 0.2,
            });
            this.spawnExplosion(muzzleX, muzzleY, 32, 'plasma', { shake: 0, light: true });
            this.rings.push({
              x: muzzleX,
              y: muzzleY,
              r0: 6,
              r1: 38,
              color: def.spec === 'b' ? '#fbbf24' : '#38e0ff',
              lineWidth: 3.5,
              age: 0,
              life: 0.24,
            });

            const baseDmg = st.dmg || 34;
            hitTargets.forEach((cr, idx) => {
              const cy = cr.y - (CREATURES[cr.type].flying ? 34 : 24);
              const hitDmg = idx === 0 ? baseDmg : Math.round(baseDmg * 0.85);
              this.spawnExplosion(cr.x, cy, def.spec === 'b' ? 66 : 48, def.spec === 'b' ? 'fire' : 'plasma', {
                shake: idx === 0 ? (def.spec ? 4.8 : 3.2) : 0,
              });
              this.rings.push({
                x: cr.x,
                y: cy,
                r0: 10,
                r1: def.spec === 'b' ? 68 : 48,
                color: def.spec === 'b' ? '#fbbf24' : '#38e0ff',
                lineWidth: 4,
                age: 0,
                life: 0.34,
                fillAlpha: 0.16,
              });
              this.damageCreature(cr, hitDmg, {
                armorPierce: Boolean(st.armorPierce),
                armorShred: st.armorShred,
                damageType: 'rail',
              });
            });
            sound.sfx('rail', 70);
          }
        }
      } else if (def.type === 'spike') {
        const rangePx = (st.radius || st.range || 2.2) * this.RANGE_UNIT_PX;
        let hitAny = false;
        for (const cr of this.creatures) {
          if (!cr.alive || CREATURES[cr.type].flying) continue;
          if (Math.hypot(cr.x - def.pad.x, cr.y - def.pad.y) <= rangePx) {
            hitAny = true;
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
        if (hitAny) {
          def.recoil = Math.max(def.recoil, 0.35);
          if (Math.random() < dt * 8) {
            this.spawnBurst(def.pad.x + (Math.random() - 0.5) * 32, def.pad.y, st.slow ? '#a855f7' : '#38e0ff', 4);
            sound.sfx('spike', 155);
          }
        }
      } else if (def.type === 'gravity') {
        const rangePx = (st.radius || 2.25) * this.RANGE_UNIT_PX;
        let hitAny = false;
        const trapped: CreatureRuntime[] = [];
        for (const cr of this.creatures) {
          if (!cr.alive) continue;
          const cfg = CREATURES[cr.type];
          if (cfg.flying && !st.hitsAir) continue;
          if (Math.hypot(cr.x - def.pad.x, cr.y - def.pad.y) <= rangePx) {
            hitAny = true;
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

        // Periodic graviton pull-back pulse (drags lighter foes back, grants 5.5s pull anchor recovery, optional armor shred)
        def.pullCd = (def.pullCd ?? (st.pullEvery || 3.2)) - dt * rateBoost;
        if (def.pullCd <= 0 && trapped.length > 0) {
          def.pullCd = st.pullEvery || 3.2;
          def.recoil = 0.65;
          this.rings.push({
            x: def.pad.x,
            y: def.pad.y,
            r0: rangePx * 0.85,
            r1: 18,
            color: '#a855f7',
            lineWidth: 4,
            age: 0,
            life: 0.44,
            fillAlpha: 0.14,
          });
          this.rings.push({
            x: def.pad.x,
            y: def.pad.y,
            r0: 14,
            r1: rangePx * 0.65,
            color: '#38e0ff',
            lineWidth: 2.5,
            age: 0,
            life: 0.36,
          });
          this.spawnExplosion(def.pad.x, def.pad.y, rangePx * 0.62, 'gravity', { shake: 2.8 });
          for (const cr of trapped) {
            const cfg = CREATURES[cr.type];
            const gravResist = cfg.gravityResist || 0;
            if (gravResist >= 0.85) {
              if (cr.resistTextCd <= 0) {
                cr.resistTextCd = 2.8;
                this.spawnFloatingText(cr.x, cr.y - 58, 'GRAV RESIST!', '#d8b4fe', 0.82);
              }
            } else if (cr.pullImmuneTimer <= 0) {
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
                this.spawnBurst(cr.x, cr.y - 16, '#c084fc', 7);
              }
            }
            if (st.armorShred && st.armorShred > 0) {
              const wasIntact = cr.armorShredTimer <= 0 && ((cfg.armor || 0) > 0 || cr.shieldTimer > 0);
              cr.armorShredTimer = Math.max(cr.armorShredTimer, st.armorShred);
              cr.shieldTimer = 0;
              if (wasIntact) {
                this.spawnFloatingText(cr.x, cr.y - 68, 'ARMOR CRACKED!', '#38e0ff', 1.0);
              }
            }
          }
          sound.sfx('gravity', 160);
        }

        // Stasis Anchor specialty: periodic gravity freeze lock (respects gravity/slow resistance & recovery)
        if (st.freezeEvery && st.freezeTime) {
          def.freezeCd -= dt * rateBoost;
          if (def.freezeCd <= 0 && trapped.length > 0) {
            def.freezeCd = st.freezeEvery;
            for (const cr of trapped) {
              const cfg = CREATURES[cr.type];
              const resist = Math.max(cfg.gravityResist || 0, cfg.slowResist || 0);
              if (resist >= 0.75) {
                if (cr.resistTextCd <= 0) {
                  cr.resistTextCd = 2.8;
                  this.spawnFloatingText(cr.x, cr.y - 58, 'STASIS RESIST!', '#d8b4fe', 0.82);
                }
                continue;
              }
              if (cr.freezeImmuneTimer > 0) continue;
              const dur = st.freezeTime * (1 - resist * 0.65) * (cfg.isBoss ? 0.45 : 1);
              if (dur >= 0.25) {
                cr.freezeTimer = Math.max(cr.freezeTimer, dur);
                cr.freezeImmuneTimer = dur + 3.5;
              }
            }
            this.rings.push({
              x: def.pad.x,
              y: def.pad.y,
              r0: 16,
              r1: rangePx,
              color: '#38e0ff',
              lineWidth: 4.5,
              age: 0,
              life: 0.45,
              fillAlpha: 0.12,
            });
          }
        }

        if (hitAny && Math.random() < dt * 7) {
          this.spawnBurst(def.pad.x + (Math.random() - 0.5) * 32, def.pad.y, '#c084fc', 3);
        }
      } else if (def.type === 'golem') {
        if (def.downTimer > 0) {
          def.downTimer = Math.max(0, def.downTimer - dt);
          if (def.downTimer === 0) {
            def.hp = def.maxHp;
            this.rings.push({
              x: def.pad.x,
              y: def.pad.y,
              r0: 10,
              r1: 68,
              color: '#38e0ff',
              lineWidth: 4,
              age: 0,
              life: 0.5,
            });
          }
          continue;
        }

        // Grab nearby passing ground enemies up to hold capacity (flying creatures pass overhead)
        def.holding = def.holding.filter((c) => c.alive);
        const holdCap = st.hold || 2;
        if (def.holding.length < holdCap) {
          for (const cr of this.creatures) {
            if (!cr.alive || cr.heldBy || CREATURES[cr.type].flying || def.holding.length >= holdCap) continue;
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
            def.recoil = 0.65;
            const target = def.holding[0];
            def.facingLeft = target.x < def.pad.x;
            this.damageCreature(target, st.dmg || 16, { damageType: 'physical' });
            this.spawnExplosion(target.x, target.y, st.cleave ? 78 : 50, 'earth', {
              shake: st.cleave ? 5.2 : 3.0,
              crater: Boolean(st.cleave),
            });
            this.rings.push({
              x: target.x,
              y: target.y,
              r0: 10,
              r1: st.cleave ? 96 : 58,
              color: st.cleave ? '#fbbf24' : '#38e0ff',
              lineWidth: st.cleave ? 5.5 : 4,
              age: 0,
              life: 0.42,
              fillAlpha: 0.14,
            });
            sound.sfx('golemSlam', 85);

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
        const rangePx = (st.range || 3.8) * this.RANGE_UNIT_PX;
        let slowedAny = false;
        for (const cr of this.creatures) {
          if (!cr.alive) continue;
          if (Math.hypot(cr.x - def.pad.x, cr.y - def.pad.y) <= rangePx) {
            slowedAny = true;
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
        if (slowedAny && Math.random() < dt * 2.2) {
          this.rings.push({
            x: def.pad.x,
            y: def.pad.y,
            r0: 16,
            r1: rangePx * 0.85,
            color: '#7dd3fc',
            lineWidth: 2.5,
            age: 0,
            life: 0.65,
          });
        }
        if (st.freezeEvery) {
          def.freezeCd -= dt * rateBoost;
          if (def.freezeCd <= 0) {
            const victims = this.creatures.filter(
              (c) => c.alive && Math.hypot(c.x - def.pad.x, c.y - def.pad.y) <= rangePx
            );
            if (victims.length > 0) {
              def.freezeCd = st.freezeEvery;
              def.recoil = 0.5;
              for (const v of victims) {
                const vCfg = CREATURES[v.type];
                const slowRes = vCfg.slowResist || 0;
                if (slowRes >= 0.75) {
                  if (v.resistTextCd <= 0) {
                    v.resistTextCd = 2.8;
                    this.spawnFloatingText(v.x, v.y - 58, 'FROST RESIST!', '#7dd3fc', 0.82);
                  }
                  continue;
                }
                if (v.freezeImmuneTimer > 0) continue;
                const dur = (st.freezeTime || 1.45) * (1 - slowRes * 0.65) * (vCfg.isBoss ? 0.45 : 1);
                if (dur >= 0.25) {
                  v.freezeTimer = Math.max(v.freezeTimer, dur);
                  v.freezeImmuneTimer = dur + 3.5;
                }
              }
              this.spawnExplosion(def.pad.x, def.pad.y, rangePx * 0.72, 'frost', { shake: 2.6 });
              this.rings.push({
                x: def.pad.x,
                y: def.pad.y,
                r0: 12,
                r1: rangePx,
                color: '#38e0ff',
                lineWidth: 6,
                age: 0,
                life: 0.58,
                fillAlpha: 0.18,
              });
              sound.sfx('frost', 120);
            }
          }
        }
      }
    }

    // Update arrows & ember cannon shells
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.target.alive) {
        p.tx = p.target.x;
        p.ty = p.target.y - (p.kind === 'ember' ? 14 : 22);
      }
      p.progress += dt / p.duration;
      if (p.progress >= 1) {
        if (p.kind === 'ember' && p.splashRadius) {
          const isInferno = p.splashRadius >= 75;
          this.spawnExplosion(
            p.tx,
            p.ty,
            Math.max(58, p.splashRadius * 0.96),
            isInferno ? 'inferno' : 'fire',
            { shake: isInferno ? 7.2 : 4.6, crater: true }
          );
          this.rings.push({
            x: p.tx,
            y: p.ty,
            r0: 12,
            r1: p.splashRadius * 1.15,
            color: '#fb923c',
            lineWidth: 7,
            age: 0,
            life: 0.48,
            fillAlpha: 0.24,
          });
          this.rings.push({
            x: p.tx,
            y: p.ty,
            r0: 6,
            r1: p.splashRadius * 0.72,
            color: '#fef08a',
            lineWidth: 4.5,
            age: 0,
            life: 0.3,
          });
          for (const cr of this.creatures) {
            if (!cr.alive) continue;
            if (Math.hypot(cr.x - p.tx, cr.y - p.ty) <= p.splashRadius) {
              this.damageCreature(cr, p.dmg, { damageType: 'fire' });
            }
          }
          sound.sfx('explosion', 55);
        } else {
          if (p.target.alive) {
            this.damageCreature(p.target, p.dmg, { damageType: 'arrow' });
          }
          this.spawnBurst(p.tx, p.ty, p.color, 7);
          this.rings.push({
            x: p.tx,
            y: p.ty,
            r0: 4,
            r1: 22,
            color: p.color,
            lineWidth: 2.5,
            age: 0,
            life: 0.18,
          });
          sound.sfx('arrowHit', 65);
        }
        this.projectiles.splice(i, 1);
      } else {
        const t = p.progress;
        p.x = p.sx + (p.tx - p.sx) * t;
        p.y = p.sy + (p.ty - p.sy) * t - Math.sin(t * Math.PI) * p.arcHeight;
        // Live fire & smoke trail behind airborne Ember Cannon shells
        if (p.kind === 'ember' && !this.focusMode && Math.random() < dt * 36) {
          this.pushParticle({
            x: p.x + (Math.random() - 0.5) * 6,
            y: p.y + (Math.random() - 0.5) * 6,
            vx: (Math.random() - 0.5) * 26,
            vy: -14 - Math.random() * 20,
            r: 4 + Math.random() * 4.5,
            color: Math.random() < 0.55 ? '#fb923c' : 'rgba(38, 32, 30, 0.52)',
            age: 0,
            life: 0.28 + Math.random() * 0.2,
            kind: Math.random() < 0.55 ? 'dot' : 'smoke',
            gravity: -18,
            drag: 1.5,
          });
        }
      }
    }

    // Check wave completion
    if (this.phase === 'wave' && this.spawnQueue.length === 0 && this.creatures.length === 0) {
      if (this.bonusActive) {
        this.bonusWavesCleared = this.bonusWave;
        if (this.bonusWave >= this.level.bonusSurgeWaves) {
          this.finishBattle(true, false);
        } else {
          const waveBonus = 15 + this.wave * 5;
          this.crystals += waveBonus;
          this.shards += waveBonus;
          this.spawnFloatingText(this.campPos.x, this.campPos.y - 72, `+${waveBonus} Wave Bonus`, '#38e0ff', 1.25);
          this.phase = 'between';
          this.wordsForgedInWait = 0;
          this.wordsUntilWave = this.getWordsPerWave();
          sound.setMusic('calm');
          this.callbacks.onToast(
            `Bonus Wave ${this.bonusWave} of ${this.level.bonusSurgeWaves} cleared (+${waveBonus} crystals)! Keep forging or launch the next wave.`,
            `battle.waveClear.${this.bonusWave}`
          );
          this.emitSnapshot();
        }
      } else if (this.finalWave) {
        // Lock in and bank the level win & stars immediately before offering Bonus Surge
        const ratio = this.anchor / this.level.anchor;
        this.bankedWin = true;
        this.bankedStars = ratio >= 0.85 ? 3 : ratio >= 0.45 ? 2 : 1;
        this.bankedAnchor = this.anchor;

        if (this.level.bonusSurgeWaves > 0) {
          const waveBonus = 15 + this.wave * 5;
          this.crystals += waveBonus;
          this.shards += waveBonus;
          this.spawnFloatingText(this.campPos.x, this.campPos.y - 72, `+${waveBonus} Wave Bonus`, '#38e0ff', 1.25);
          this.phase = 'milestone';
          this.selectedDef = null;
          this.buildSel = null;
          sound.setMusic('calm');
          sound.sfx('win');
          this.emitSnapshot();
        } else {
          this.finishBattle(true, false);
        }
      } else {
        const waveBonus = 15 + this.wave * 5;
        this.crystals += waveBonus;
        this.shards += waveBonus;
        this.spawnFloatingText(this.campPos.x, this.campPos.y - 72, `+${waveBonus} Wave Bonus`, '#38e0ff', 1.25);
        this.phase = 'between';
        this.wordsForgedInWait = 0;
        this.wordsUntilWave = this.getWordsPerWave();
        sound.setMusic('calm');
        const nextIsFinal = this.locksReady && this.wave + 1 >= this.level.minWaves;
        this.callbacks.onToast(
          nextIsFinal
            ? `Wave ${this.wave} cleared (+${waveBonus} crystals)! All locks filled. Launch the Final Wave when ready.`
            : `Wave ${this.wave} cleared (+${waveBonus} crystals)! Forge words to fill your locks or start the next wave.`,
          `battle.waveClear.${this.wave}`
        );
        this.emitSnapshot();
      }
    }
  }

  private stepEffects(dt: number) {
    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);

    // River sparkles drift continuously
    for (const rp of this.riverRipples) {
      rp.s = (rp.s + rp.speed * dt) % 1;
    }

    // Meteor strikes
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.age += dt;
      // Blazing comet trail particles as meteor streaks across the sky
      if (!m.impacted && !this.focusMode && Math.random() < dt * 75) {
        const mt = Math.min(1, m.age / m.life);
        const mx = m.sx + (m.tx - m.sx) * mt;
        const my = m.sy + (m.ty - m.sy) * mt;
        this.pushParticle({
          x: mx + (Math.random() - 0.5) * 18,
          y: my + (Math.random() - 0.5) * 18,
          vx: 40 + Math.random() * 55,
          vy: -55 - Math.random() * 55,
          r: 8 + Math.random() * 9,
          color: Math.random() < 0.65 ? '#fb923c' : 'rgba(28, 20, 18, 0.55)',
          age: 0,
          life: 0.34 + Math.random() * 0.24,
          kind: Math.random() < 0.65 ? 'dot' : 'smoke',
          gravity: -15,
          drag: 1.5,
        });
      }
      if (m.age >= m.life && !m.impacted) {
        m.impacted = true;
        this.spawnExplosion(m.tx, m.ty, 182, 'inferno', { shake: 16, crater: true });
        this.rings.push({
          x: m.tx,
          y: m.ty,
          r0: 16,
          r1: 225,
          color: '#fb923c',
          lineWidth: 11,
          age: 0,
          life: 0.72,
          fillAlpha: 0.3,
        });
        this.rings.push({
          x: m.tx,
          y: m.ty,
          r0: 10,
          r1: 145,
          color: '#fef08a',
          lineWidth: 6,
          age: 0,
          life: 0.44,
        });
        this.rings.push({
          x: m.tx,
          y: m.ty,
          r0: 26,
          r1: 260,
          color: '#ef4444',
          lineWidth: 4.5,
          age: 0,
          life: 0.85,
        });
        sound.sfx('meteorImpact');
        for (const cr of this.creatures) {
          if (cr.alive && Math.hypot(cr.x - m.tx, cr.y - m.ty) <= 195) {
            this.damageCreature(cr, HERO_POWERS.meteor.dmg || 55, {
              armorPierce: true,
              damageType: 'true',
            });
          }
        }
        this.meteors.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.particles.splice(i, 1);
      } else {
        const drag = p.drag ?? 0;
        if (drag > 0) {
          const damp = Math.max(0, 1 - drag * dt);
          p.vx *= damp;
          p.vy *= damp;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += (p.gravity ?? 90) * dt;
        if (p.rot !== undefined && p.vrot !== undefined) {
          p.rot += p.vrot * dt;
        }
      }
    }

    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const ex = this.explosions[i];
      ex.age += dt;
      if (ex.age >= ex.life) {
        this.explosions.splice(i, 1);
      }
    }

    for (let i = this.craters.length - 1; i >= 0; i--) {
      const c = this.craters[i];
      c.age += dt;
      if (c.age >= c.life) {
        this.craters.splice(i, 1);
      }
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.age += dt;
      if (r.age >= r.life) {
        this.rings.splice(i, 1);
      }
    }

    for (let i = this.lightningArcs.length - 1; i >= 0; i--) {
      const arc = this.lightningArcs[i];
      arc.age += dt;
      if (arc.age >= arc.life) {
        this.lightningArcs.splice(i, 1);
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.age += dt;
      if (ft.age >= ft.life) {
        this.floatingTexts.splice(i, 1);
      } else {
        ft.y += ft.vy * dt;
        ft.vy *= 0.96;
      }
    }
  }

  private finishBattle(win: boolean, bonusAnchorFell = false) {
    if (this.phase === 'done') return;
    this.phase = 'done';
    sound.setMusic('calm');
    const ratio = this.anchor / this.level.anchor;
    const computedStars = !win ? 0 : ratio >= 0.85 ? 3 : ratio >= 0.45 ? 2 : 1;
    const finalWin = this.bankedWin || win;
    const finalStars = this.bankedWin ? Math.max(this.bankedStars, computedStars) : computedStars;
    const finalAnchor = this.bankedWin && bonusAnchorFell ? this.bankedAnchor : this.anchor;
    const bonusTotal = this.level.bonusSurgeWaves;
    const bonusCompleted = this.bonusActive && this.bonusWavesCleared >= bonusTotal && bonusTotal > 0;
    this.emitSnapshot();
    this.callbacks.onBattleEnd({
      win: finalWin,
      stars: finalStars,
      waves: this.wave,
      anchor: finalAnchor,
      kills: this.kills,
      shards: this.shards,
      powersUsed: this.powersUsed,
      bonusWavesCleared: this.bonusActive ? this.bonusWavesCleared : 0,
      bonusTotal,
      bonusCompleted,
      bonusAnchorFell,
    });
  }

  // --- Rich Painted 2.5D Renderer ---

  private render() {
    const ctx = this.ctx;
    ctx.save();

    // Biome-aware backdrop fallback
    ctx.fillStyle = this.level.worldId === 'w2' ? '#1c1210' : '#1b3a22';
    ctx.fillRect(0, 0, this.viewW, this.viewH);

    // Subtle screen shake on impacts
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTimer > 0 && !this.focusMode) {
      const mag = this.shakeStrength * (this.shakeTimer / 0.45);
      shakeX = (Math.random() - 0.5) * mag;
      shakeY = (Math.random() - 0.5) * mag;
    }

    ctx.translate(this.mapOffX + shakeX, this.mapOffY + shakeY);
    ctx.scale(this.mapScale, this.mapScale);

    // 1. Hand-painted sunlit battlefield map for the active level
    const mapImg = this.sprites?.maps[this.level.id] || this.sprites?.map;
    if (mapImg) {
      ctx.drawImage(mapImg, 0, 0, MAP_W, MAP_H);
    } else {
      const g = ctx.createLinearGradient(0, 0, MAP_W, MAP_H);
      g.addColorStop(0, '#3a225c');
      g.addColorStop(0.4, '#4eb640');
      g.addColorStop(1, '#398f32');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, MAP_W, MAP_H);
    }

    // 2. Animated sparkling river shimmer
    this.drawRiverShimmer(ctx);

    // 3. Swirling Rift Portal vortex at upper-left
    this.drawRiftPortal(ctx);

    // 4. Warm golden Anchor Sanctuary rune pad
    this.drawCampSanctuary(ctx);

    // 5. Build pads & range preview rings
    this.drawPads(ctx);

    // 6. Ground-level craters & expanding spell rings
    this.drawCraters(ctx);
    this.drawRings(ctx);

    // 7. Depth-sorted 2.5D entities (Spike Pits first on ground, then Towers, Golems, Warden, Creatures by Y)
    this.drawDepthSortedEntities(ctx);

    // 8. Projectiles, Lightning Arcs, Meteors & Multi-Stage Explosions
    this.drawProjectiles(ctx);
    this.drawLightningArcs(ctx);
    this.drawMeteors(ctx);
    this.drawExplosions(ctx);

    // 9. Particles & ambient sunlit meadow motes
    this.drawParticles(ctx);

    // 10. Crisp outlined floating damage numbers
    this.drawFloatingTexts(ctx);

    // 11. In-world landmark badges (matching Mr. Scott's screenshot!)
    this.drawLandmarkBadges(ctx);

    ctx.restore();
  }

  private drawRiverShimmer(ctx: CanvasRenderingContext2D) {
    if (!this.riverPath) return;
    ctx.save();
    ctx.lineCap = 'round';
    for (const rp of this.riverRipples) {
      const pt = this.riverPath.pointAt(rp.s);
      const nx = -pt.ty;
      const ny = pt.tx;
      const x = pt.x + nx * rp.offset;
      const y = pt.y + ny * rp.offset;
      const alpha = Math.sin(rp.s * Math.PI) * (this.level.worldId === 'w2' ? 0.65 : 0.55);
      ctx.strokeStyle =
        this.level.worldId === 'w2'
          ? `rgba(255, 224, 130, ${alpha.toFixed(2)})`
          : `rgba(224, 247, 255, ${alpha.toFixed(2)})`;
      ctx.lineWidth = this.level.worldId === 'w2' ? 4.2 : 3.2;
      ctx.beginPath();
      ctx.moveTo(x - pt.tx * rp.len * 0.5, y - pt.ty * rp.len * 0.5);
      ctx.lineTo(x + pt.tx * rp.len * 0.5, y + pt.ty * rp.len * 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawRiftPortal(ctx: CanvasRenderingContext2D) {
    const { x, y } = this.riftPos;
    const pulse = 1 + Math.sin(this.clock * 3.8) * 0.1;

    ctx.save();
    // Outer neon-magenta ambient glow on cracked stone
    const grad = ctx.createRadialGradient(x, y, 8, x, y, 108 * pulse);
    grad.addColorStop(0, 'rgba(255, 225, 255, 0.95)');
    grad.addColorStop(0.28, 'rgba(232, 121, 249, 0.78)');
    grad.addColorStop(0.62, 'rgba(147, 51, 234, 0.38)');
    grad.addColorStop(1, 'rgba(147, 51, 234, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, 108 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Rotating arcane vortex rings
    ctx.translate(x, y);
    ctx.scale(1, 0.68);
    ctx.rotate(this.clock * 1.4);
    ctx.strokeStyle = 'rgba(245, 208, 254, 0.85)';
    ctx.lineWidth = 4;
    ctx.setLineDash([18, 12]);
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.stroke();

    ctx.rotate(-this.clock * 2.5);
    ctx.strokeStyle = 'rgba(217, 70, 239, 0.9)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Blazing white-violet vertical tear core
    ctx.scale(1, 1.45);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#e879f9';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.ellipse(0, -10, 14 * pulse, 30 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawCampSanctuary(ctx: CanvasRenderingContext2D) {
    const { x, y } = this.campPos;
    const pulse = 1 + Math.sin(this.clock * 2.8) * 0.08;

    ctx.save();
    // Warm sunlit golden-cyan aura over camp center
    const grad = ctx.createRadialGradient(x, y, 8, x, y, 96 * pulse);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.82)');
    grad.addColorStop(0.35, 'rgba(56, 224, 255, 0.45)');
    grad.addColorStop(0.7, 'rgba(251, 191, 36, 0.22)');
    grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, 96 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Glowing cyan sanctuary rune ring
    ctx.strokeStyle = 'rgba(56, 224, 255, 0.72)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y + 6, 46, 26, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Floating cyan Anchor Crystal diamond
    const bob = Math.sin(this.clock * 3.1) * 5;
    const cy = y - 18 + bob;
    ctx.shadowColor = '#38e0ff';
    ctx.shadowBlur = 18;

    // Left facet
    ctx.fillStyle = '#38e0ff';
    ctx.beginPath();
    ctx.moveTo(x, cy - 26);
    ctx.lineTo(x - 16, cy);
    ctx.lineTo(x, cy + 20);
    ctx.closePath();
    ctx.fill();

    // Right bright facet
    ctx.fillStyle = '#bae6fd';
    ctx.beginPath();
    ctx.moveTo(x, cy - 26);
    ctx.lineTo(x + 16, cy);
    ctx.lineTo(x, cy + 20);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, cy - 26);
    ctx.lineTo(x + 16, cy);
    ctx.lineTo(x, cy + 20);
    ctx.lineTo(x - 16, cy);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  private drawPads(ctx: CanvasRenderingContext2D) {
    const wantKind = this.buildSel ? DEFENDERS[this.buildSel].kind : null;
    const pulse = 0.5 + 0.5 * Math.sin(this.clock * 4.5);

    // Draw range circle for hovered pad while placing, or selected placed defender
    if (this.selectedDef) {
      const st = this.getDefenderStats(this.selectedDef);
      const rUnits = st.range || st.radius;
      if (rUnits) {
        this.drawRangeCircle(
          ctx,
          this.selectedDef.pad.x,
          this.selectedDef.pad.y,
          rUnits * this.RANGE_UNIT_PX,
          '#38e0ff'
        );
      } else if (this.selectedDef.type === 'golem') {
        this.drawRangeCircle(ctx, this.selectedDef.pad.x, this.selectedDef.pad.y, 68, '#38e0ff');
      }
    } else if (this.level.freePlacement && this.buildSel) {
      const cfg = DEFENDERS[this.buildSel];

      // Always illuminate the trail immediately when a trail defender is picked
      if (cfg.kind === 'trail') {
        ctx.save();
        ctx.strokeStyle = `rgba(56, 224, 255, ${(0.22 + pulse * 0.16).toFixed(2)})`;
        ctx.lineWidth = 18;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i <= 50; i++) {
          const p = this.path.pointAt(i / 50);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        ctx.restore();
      }

      if (this.freePreview) {
      const fp = this.freePreview;
      const rUnits = cfg.levels[0].range || cfg.levels[0].radius;
      const previewColor = fp.valid ? '#34d399' : '#fb7185';

      if (rUnits) {
        this.drawRangeCircle(ctx, fp.x, fp.y, rUnits * this.RANGE_UNIT_PX, previewColor);
      } else if (this.buildSel === 'golem') {
        this.drawRangeCircle(ctx, fp.x, fp.y, 68, previewColor);
      }

      // Ground footprint ring
      ctx.save();
      ctx.translate(fp.x, fp.y);
      ctx.fillStyle = fp.valid ? 'rgba(52, 211, 153, 0.24)' : 'rgba(251, 113, 133, 0.26)';
      ctx.strokeStyle = previewColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 2, 30, 19, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Ghost preview sprite of the defender being placed
      const ghostSprite = this.sprites?.sprites[this.buildSel as SpriteKey];
      if (ghostSprite) {
        const isFlatTrap = this.buildSel === 'spike' || this.buildSel === 'gravity';
        const targetH =
          this.buildSel === 'archer'
            ? 106
            : this.buildSel === 'rail'
            ? 104
            : this.buildSel === 'tesla'
            ? 108
            : this.buildSel === 'ember'
            ? 104
            : this.buildSel === 'frost'
            ? 102
            : this.buildSel === 'golem'
            ? 86
            : this.buildSel === 'gravity'
            ? 66
            : 60;
        const aspect = ghostSprite.width / Math.max(1, ghostSprite.height);
        const drawW = targetH * aspect;
        ctx.globalAlpha = fp.valid ? 0.78 : 0.45;
        if (!fp.valid) {
          ctx.filter = 'hue-rotate(300deg) saturate(1.8) brightness(0.92)';
        }
        ctx.drawImage(
          ghostSprite.canvas,
          -drawW * 0.5,
          isFlatTrap ? 14 - targetH * 0.68 : 6 - targetH * 0.94,
          drawW,
          targetH
        );
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
      }

      if (!fp.valid && fp.reason) {
        ctx.font = '700 13px system-ui, -apple-system, sans-serif';
        const tw = ctx.measureText(fp.reason).width;
        const bw = tw + 18;
        const bh = 24;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.strokeStyle = '#fb7185';
        ctx.lineWidth = 2;
        this.roundRect(ctx, -bw / 2, 24, bw, bh, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fecdd3';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fp.reason, 0, 36);
      }
      ctx.restore();
      }
    } else if (this.buildSel && this.hoverPad && !this.hoverPad.def) {
      const cfg = DEFENDERS[this.buildSel];
      const rUnits = cfg.levels[0].range || cfg.levels[0].radius;
      if (cfg.kind === this.hoverPad.kind && rUnits) {
        this.drawRangeCircle(
          ctx,
          this.hoverPad.x,
          this.hoverPad.y,
          rUnits * this.RANGE_UNIT_PX,
          '#fbbf24'
        );
      }
    }

    for (const pad of this.pads) {
      const isHovered = this.hoverPad === pad;
      const isValidTarget = !pad.def && wantKind === pad.kind;
      const isSelected = Boolean(pad.def && pad.def === this.selectedDef);

      // On Free Placement levels, placed defenders sit directly on the open grass/road with a sleek rune rim
      if (this.level.freePlacement) {
        if (!pad.def) continue;
        ctx.save();
        ctx.translate(pad.x, pad.y);
        ctx.fillStyle = pad.kind === 'tower' ? 'rgba(15, 23, 42, 0.34)' : 'rgba(56, 224, 255, 0.14)';
        ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(56, 224, 255, 0.55)';
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.beginPath();
        ctx.ellipse(0, 3, pad.kind === 'tower' ? 28 : 26, pad.kind === 'tower' ? 16 : 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        continue;
      }

      ctx.save();
      ctx.translate(pad.x, pad.y);

      if (pad.kind === 'tower') {
        // Carved hexagonal stone rune pad (matching Mr. Scott's screenshot!)
        const rx = 31;
        const ry = 21;

        // Ground shadow rim
        ctx.fillStyle = 'rgba(15, 28, 18, 0.42)';
        this.traceHex(ctx, 0, 5, rx + 2, ry + 2);
        ctx.fill();

        // Beveled stone body
        ctx.fillStyle = isValidTarget
          ? '#dbeafe'
          : isHovered
          ? '#cbd5e1'
          : '#94a3b8';
        ctx.strokeStyle = isSelected || isValidTarget ? '#38e0ff' : '#334155';
        ctx.lineWidth = isSelected || isValidTarget ? 3.5 : 2.5;
        this.traceHex(ctx, 0, 0, rx, ry);
        ctx.fill();
        ctx.stroke();

        // Inner glowing cyan rune octagon
        ctx.strokeStyle = isValidTarget
          ? `rgba(56, 224, 255, ${(0.7 + pulse * 0.3).toFixed(2)})`
          : 'rgba(56, 224, 255, 0.55)';
        ctx.lineWidth = 2.2;
        this.traceHex(ctx, 0, 0, rx * 0.62, ry * 0.62);
        ctx.stroke();

        if (isValidTarget) {
          ctx.strokeStyle = `rgba(251, 191, 36, ${(0.55 + pulse * 0.45).toFixed(2)})`;
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.ellipse(0, 0, rx + 7 + pulse * 4, ry + 5 + pulse * 3, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else {
        // Trail spot: recessed rune ring right on the brown dirt path
        const rx = 28;
        const ry = 19;
        ctx.fillStyle = isValidTarget
          ? 'rgba(56, 224, 255, 0.25)'
          : 'rgba(120, 74, 38, 0.38)';
        ctx.strokeStyle = isValidTarget
          ? `rgba(251, 191, 36, ${(0.7 + pulse * 0.3).toFixed(2)})`
          : 'rgba(196, 181, 253, 0.65)';
        ctx.lineWidth = isValidTarget ? 3.5 : 2.2;
        ctx.setLineDash(pad.def ? [] : [8, 6]);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fill();
        ctx.setLineDash([]);
      }

      ctx.restore();
    }
  }

  private traceHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      const px = cx + Math.cos(a) * rx;
      const py = cy + Math.sin(a) * ry;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  private drawRangeCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
    ctx.save();
    ctx.fillStyle =
      color === '#fbbf24'
        ? 'rgba(251, 191, 36, 0.12)'
        : color === '#34d399'
        ? 'rgba(52, 211, 153, 0.13)'
        : color === '#fb7185'
        ? 'rgba(251, 113, 133, 0.14)'
        : 'rgba(56, 224, 255, 0.12)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  private drawDepthSortedEntities(ctx: CanvasRenderingContext2D) {
    // 1. Flat trail traps (Spike Pit & Gravity Snare) lie recessed in the trail under walking creatures
    for (const def of this.defenders) {
      if (def.type === 'spike' || def.type === 'gravity') {
        this.drawDefenderSprite(ctx, def);
      }
    }

    // 2. Collect all standing entities (towers, golems, Rift Warden, creatures) and sort by Y
    type DrawItem = { y: number; draw: () => void };
    const items: DrawItem[] = [];

    for (const def of this.defenders) {
      if (def.type === 'spike' || def.type === 'gravity') continue;
      items.push({ y: def.pad.y, draw: () => this.drawDefenderSprite(ctx, def) });
    }

    // Rift Warden hero standing guard at the Anchor Camp
    items.push({
      y: this.wardenPos.y,
      draw: () => this.drawWardenSprite(ctx),
    });

    for (const cr of this.creatures) {
      if (!cr.alive) continue;
      items.push({ y: cr.y, draw: () => this.drawCreatureSprite(ctx, cr) });
    }

    items.sort((a, b) => a.y - b.y);
    for (const it of items) {
      it.draw();
    }
  }

  private drawDefenderSprite(ctx: CanvasRenderingContext2D, def: DefenderRuntime) {
    const sprite = this.sprites?.sprites[def.type as SpriteKey];
    const { x, y } = def.pad;
    const isSelected = def === this.selectedDef;
    const isFlatTrap = def.type === 'spike' || def.type === 'gravity';

    ctx.save();
    ctx.translate(x, y);

    // Subtle spinning graviton aura ring for Gravity Snare
    if (def.type === 'gravity') {
      const pulse = 0.45 + 0.35 * Math.sin(this.clock * 4.5 + def.pulsePhase);
      ctx.strokeStyle = `rgba(168, 85, 247, ${pulse.toFixed(2)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 2, 42 + pulse * 8, 24 + pulse * 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Tier & Specialty glowing ground rune rings
    if (def.level >= 2 || def.spec || this.rallyTimer > 0) {
      ctx.strokeStyle =
        this.rallyTimer > 0
          ? '#fbbf24'
          : def.spec
          ? '#e879f9'
          : def.level === 3
          ? '#fbbf24'
          : '#38e0ff';
      ctx.lineWidth = def.spec ? 4 : 3;
      ctx.beginPath();
      ctx.ellipse(0, 2, 34, 20, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (isSelected) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 2, 38, 23, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Grounded contact shadow (except flat trail traps)
    if (!isFlatTrap) {
      ctx.fillStyle = 'rgba(12, 22, 16, 0.44)';
      ctx.beginPath();
      ctx.ellipse(0, 4, def.type === 'golem' ? 32 : 29, 13, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Downed Stone Golem re-forming indicator
    if (def.type === 'golem' && def.downTimer > 0) {
      ctx.globalAlpha = 0.35;
    }

    // Subtle squash-and-stretch recoil + tier scale growth
    const tierScale = 1 + (def.level - 1) * 0.08 + (def.spec ? 0.06 : 0);
    const recoilStretch = 1 + def.recoil * 0.14;
    const recoilSquash = 1 - def.recoil * 0.09;
    const idleBob = def.type === 'golem' ? Math.sin(def.pulsePhase) * 2 : 0;

    const targetH =
      def.type === 'archer'
        ? 106
        : def.type === 'rail'
        ? 104
        : def.type === 'tesla'
        ? 108
        : def.type === 'ember'
        ? 104
        : def.type === 'frost'
        ? 102
        : def.type === 'golem'
        ? 86
        : def.type === 'gravity'
        ? 66
        : 60;

    if (sprite) {
      const aspect = sprite.width / Math.max(1, sprite.height);
      const drawH = targetH * tierScale;
      const drawW = drawH * aspect;

      ctx.save();
      ctx.translate(0, isFlatTrap ? 14 : 6 + idleBob);
      if (def.facingLeft && (def.type === 'golem' || def.type === 'rail')) {
        ctx.scale(-recoilSquash, recoilStretch);
      } else {
        ctx.scale(recoilSquash, recoilStretch);
      }
      ctx.drawImage(
        sprite.canvas,
        -drawW * 0.5,
        isFlatTrap ? -drawH * 0.68 : -drawH * 0.94,
        drawW,
        drawH
      );
      ctx.restore();
    } else {
      ctx.fillStyle = '#38e0ff';
      ctx.beginPath();
      ctx.arc(0, -24, 24, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    // Level star pips above upgraded towers (Lv 2, Lv 3, or Specialty star)
    if (def.level >= 2 || def.spec) {
      const pipY = isFlatTrap ? -26 : -targetH * tierScale - 2;
      const count = def.spec ? 4 : def.level;
      const gap = 11;
      const startX = -((count - 1) * gap) / 2;
      for (let i = 0; i < count; i++) {
        ctx.fillStyle = def.spec && i === count - 1 ? '#e879f9' : '#fbbf24';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(startX + i * gap, pipY, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Stone Golem HP bar (or reforming timer)
    if (def.type === 'golem') {
      const barW = 48;
      const barY = -92;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fillRect(-barW / 2 - 1, barY - 1, barW + 2, 8);
      if (def.downTimer > 0) {
        const pct = 1 - def.downTimer / 10;
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-barW / 2, barY, barW * pct, 6);
      } else {
        const pct = Math.max(0, def.hp / Math.max(1, def.maxHp));
        ctx.fillStyle = '#38e0ff';
        ctx.fillRect(-barW / 2, barY, barW * pct, 6);
      }
    }

    ctx.restore();
  }

  private drawWardenSprite(ctx: CanvasRenderingContext2D) {
    const sprite = this.sprites?.sprites.warden;
    const { x, y } = this.wardenPos;
    const breathe = Math.sin(this.clock * 2.6) * 1.8;

    ctx.save();
    ctx.translate(x, y);

    // Shadow
    ctx.fillStyle = 'rgba(12, 22, 16, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 24, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Casting glow ring when hero power or Mega Forge fires
    if (this.wardenCastTimer > 0) {
      ctx.strokeStyle = '#38e0ff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 2, 34, 18, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (sprite) {
      const drawH = 88;
      const drawW = drawH * (sprite.width / Math.max(1, sprite.height));
      ctx.drawImage(sprite.canvas, -drawW * 0.5, -drawH * 0.94 + breathe, drawW, drawH);
    }
    ctx.restore();
  }

  private drawCreatureSprite(ctx: CanvasRenderingContext2D, cr: CreatureRuntime) {
    const cfg = CREATURES[cr.type];
    const key: SpriteKey = cr.type;
    const sprite = this.sprites?.sprites[key];

    ctx.save();
    ctx.translate(cr.x, cr.y);

    const facingLeft = cr.vx < -0.05;
    const isFrozen = cr.freezeTimer > 0;
    const isSlowed = cr.slowTimer > 0;

    const shadowR =
      cr.type === 'thornking' || cr.type === 'ironwarden'
        ? 46
        : cr.type === 'brute'
        ? 36
        : cr.type === 'shieldbearer'
        ? 34
        : cr.type === 'weaver'
        ? 28
        : cr.type === 'galewraith'
        ? 26
        : cr.type === 'shrieker'
        ? 26
        : cr.type === 'bramble'
        ? 31
        : cr.type === 'splitter'
        ? 30
        : cr.type === 'thornback'
        ? 28
        : cr.type === 'cinderimp'
        ? 22
        : 20;

    // Boss arcane/molten aura ring beneath feet
    if (cfg.isBoss) {
      const pulse = 0.65 + 0.35 * Math.sin(this.clock * 4);
      ctx.strokeStyle =
        cr.type === 'ironwarden'
          ? `rgba(251, 146, 60, ${pulse.toFixed(2)})`
          : `rgba(192, 132, 252, ${pulse.toFixed(2)})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 4, shadowR + 10, 18, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Gale Wraith active Wind Dash cyan slipstream ring
    if (cr.type === 'galewraith' && cr.dashTimer > 0) {
      ctx.strokeStyle = 'rgba(103, 232, 249, 0.85)';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(0, 2, shadowR + 9, 14, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Forge Weaver / Iron Aegis golden shield ring on buffed allies
    if (cr.shieldTimer > 0 && cr.armorShredTimer <= 0) {
      const spulse = 0.55 + 0.3 * Math.sin(this.clock * 6 + cr.animPhase);
      ctx.strokeStyle = `rgba(251, 191, 36, ${spulse.toFixed(2)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 2, shadowR + 6, 13, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Ground contact shadow
    ctx.fillStyle =
      cr.type === 'bat' || cr.type === 'shrieker'
        ? 'rgba(35, 18, 60, 0.28)'
        : cr.type === 'galewraith'
        ? 'rgba(14, 116, 144, 0.35)'
        : cr.type === 'wisp'
        ? 'rgba(107, 33, 168, 0.4)'
        : cr.type === 'cinderimp' || cr.type === 'ironwarden'
        ? 'rgba(124, 45, 18, 0.48)'
        : 'rgba(12, 22, 16, 0.48)';
    ctx.beginPath();
    ctx.ellipse(0, 3, shadowR, cfg.isBoss ? 15 : 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Animated locomotion by archetype
    const bobY = isFrozen
      ? cr.type === 'bat' || cr.type === 'shrieker'
        ? -22
        : cr.type === 'weaver' || cr.type === 'galewraith'
        ? -12
        : 0
      : cr.type === 'bat'
      ? -26 + Math.sin(cr.animPhase * 1.7) * 7
      : cr.type === 'shrieker'
      ? -28 + Math.sin(cr.animPhase * 1.35) * 8
      : cr.type === 'galewraith'
      ? -14 + Math.sin(cr.animPhase * 1.4) * 6
      : cr.type === 'weaver'
      ? -12 + Math.sin(cr.animPhase * 1.15) * 5
      : cr.type === 'wisp'
      ? -12 + Math.sin(cr.animPhase) * 6
      : cr.type === 'cinderimp'
      ? -Math.abs(Math.sin(cr.animPhase)) * 9
      : cr.type === 'splitter'
      ? -4 + Math.sin(cr.animPhase * 1.1) * 4
      : cr.type === 'thornking' || cr.type === 'ironwarden'
      ? -Math.abs(Math.sin(cr.animPhase * 0.65)) * 5
      : cr.type === 'brute' || cr.type === 'shieldbearer'
      ? -Math.abs(Math.sin(cr.animPhase * 0.72)) * 5
      : -Math.abs(Math.sin(cr.animPhase)) * 7;

    const tilt = isFrozen
      ? 0
      : cr.type === 'galewraith' && cr.dashTimer > 0
      ? (facingLeft ? -0.18 : 0.18)
      : cr.type === 'bat' || cr.type === 'shrieker'
      ? Math.sin(cr.animPhase * 0.9) * 0.09
      : cr.type === 'wisp' || cr.type === 'weaver' || cr.type === 'galewraith'
      ? Math.sin(cr.animPhase * 0.6) * 0.06
      : cr.type === 'cinderimp'
      ? Math.sin(cr.animPhase) * 0.11
      : cr.type === 'thornking' || cr.type === 'ironwarden' || cr.type === 'shieldbearer'
      ? Math.sin(cr.animPhase * 0.65) * 0.04
      : Math.sin(cr.animPhase) * 0.07;

    const drawH =
      cr.type === 'ironwarden'
        ? 136
        : cr.type === 'thornking'
        ? 124
        : cr.type === 'brute'
        ? 98
        : cr.type === 'shieldbearer'
        ? 90
        : cr.type === 'weaver'
        ? 88
        : cr.type === 'splitter'
        ? 84
        : cr.type === 'shrieker' || cr.type === 'galewraith'
        ? 82
        : cr.type === 'bramble'
        ? 80
        : cr.type === 'thornback'
        ? 74
        : cr.type === 'bat'
        ? 66
        : cr.type === 'cinderimp'
        ? 64
        : 58;

    if (sprite) {
      const drawW = drawH * (sprite.width / Math.max(1, sprite.height));
      ctx.save();
      ctx.translate(0, bobY);
      ctx.rotate(tilt);
      // Cinder Imp source art faces left; mirror when moving right so it sprints head-first
      const flipX = cr.type === 'cinderimp' ? !facingLeft : facingLeft;
      if (flipX) ctx.scale(-1, 1);

      if (cr.hitFlash > 0) {
        ctx.filter = 'brightness(1.85) saturate(1.4)';
      } else if (isFrozen) {
        ctx.filter = 'hue-rotate(155deg) brightness(1.35) saturate(1.5)';
      } else if (isSlowed) {
        ctx.filter = 'hue-rotate(115deg) brightness(1.12)';
      } else if (cr.type === 'galewraith' && cr.dashTimer > 0) {
        ctx.filter = 'brightness(1.28) saturate(1.35)';
      }

      ctx.drawImage(sprite.canvas, -drawW * 0.5, -drawH * 0.9, drawW, drawH);
      ctx.filter = 'none';
      ctx.restore();
    } else {
      ctx.fillStyle =
        cr.type === 'cinderimp' || cr.type === 'ironwarden'
          ? '#fb923c'
          : cr.type === 'galewraith'
          ? '#67e8f9'
          : cr.type === 'shieldbearer' || cr.type === 'shrieker' || cr.type === 'weaver'
          ? '#f59e0b'
          : cr.type === 'wisp' || cr.type === 'bat'
          ? '#e879f9'
          : '#4d7c0f';
      ctx.beginPath();
      ctx.arc(0, -24 + bobY, cfg.isBoss ? 32 : 20, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crisp frozen crystal diamond sheath
    if (isFrozen) {
      const sheathW = cfg.isBoss ? 36 : 24;
      ctx.strokeStyle = '#bae6fd';
      ctx.fillStyle = 'rgba(125, 211, 252, 0.28)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -drawH + bobY - 2);
      ctx.lineTo(sheathW, -drawH * 0.45 + bobY);
      ctx.lineTo(sheathW * 0.68, 4 + bobY);
      ctx.lineTo(-sheathW * 0.68, 4 + bobY);
      ctx.lineTo(-sheathW, -drawH * 0.45 + bobY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Crisp HP bar (elevated for flying creatures, wider & golden-rimmed for bosses)
    const barW = cfg.isBoss
      ? 84
      : cr.type === 'brute' || cr.type === 'shieldbearer'
      ? 60
      : cr.type === 'shrieker' || cr.type === 'weaver'
      ? 54
      : cr.type === 'wisp' || cr.type === 'bat'
      ? 44
      : 52;
    const barH = cfg.isBoss ? 8 : 6;
    const barY =
      -drawH -
      12 +
      (cr.type === 'bat' || cr.type === 'shrieker'
        ? -22
        : cr.type === 'wisp' || cr.type === 'weaver'
        ? -10
        : cfg.isBoss
        ? -8
        : 0);
    const ratio = Math.max(0, Math.min(1, cr.hp / Math.max(1, cr.maxHp)));

    if (cfg.isBoss) {
      const bossTitle = cr.type === 'ironwarden' ? 'IRON WARDEN' : 'THORNKING';
      ctx.font = '800 13px Lexend, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 4;
      ctx.strokeText(bossTitle, 0, barY - 4);
      ctx.fillStyle = cr.type === 'ironwarden' ? '#fb923c' : '#fbbf24';
      ctx.fillText(bossTitle, 0, barY - 4);
    }

    ctx.fillStyle = cfg.isBoss ? '#fbbf24' : '#0f172a';
    this.roundRect(ctx, -barW / 2 - 2, barY - 2, barW + 4, barH + 4, 4);
    ctx.fill();

    if (cfg.isBoss) {
      ctx.fillStyle = '#0f172a';
      this.roundRect(ctx, -barW / 2 - 0.5, barY - 0.5, barW + 1, barH + 1, 3);
      ctx.fill();
    }

    ctx.fillStyle =
      cr.type === 'ironwarden'
        ? '#fb923c'
        : cfg.isBoss
        ? '#c084fc'
        : ratio > 0.35
        ? '#fb7185'
        : '#ef4444';
    if (ratio > 0) {
      this.roundRect(ctx, -barW / 2, barY, Math.max(4, barW * ratio), barH, 3);
      ctx.fill();
    }

    // Armored / Aegis shield emblem beside HP bar (glows amber while protected, cyan cracked when shredded)
    if ((cfg.armor || 0) > 0 || cr.shieldTimer > 0) {
      const sx = -barW / 2 - 11;
      const sy = barY + barH / 2;
      const shredded = cr.armorShredTimer > 0;
      ctx.save();
      ctx.fillStyle = shredded ? '#22d3ee' : '#f59e0b';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 6);
      ctx.lineTo(sx + 5.5, sy - 3.5);
      ctx.lineTo(sx + 4.5, sy + 2.5);
      ctx.lineTo(sx, sy + 6);
      ctx.lineTo(sx - 4.5, sy + 2.5);
      ctx.lineTo(sx - 5.5, sy - 3.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (shredded) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(sx - 2, sy - 3.5);
        ctx.lineTo(sx + 1, sy);
        ctx.lineTo(sx - 1, sy + 3.5);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Compact color-coded resistance pips to the right of the HP bar (max 2 primary traits)
    const resistBadges: Array<{ color: string; stroke: string; glyph: string }> = [];
    if ((cfg.slowResist || 0) >= 0.45) {
      resistBadges.push({ color: '#0284c7', stroke: '#bae6fd', glyph: 'I' });
    }
    if ((cfg.gravityResist || 0) >= 0.65) {
      resistBadges.push({ color: '#7e22ce', stroke: '#e9d5ff', glyph: 'G' });
    }
    if ((cfg.fireResist || 0) >= 0.45) {
      resistBadges.push({ color: '#c2410c', stroke: '#fed7aa', glyph: 'F' });
    }
    if ((cfg.electricResist || 0) >= 0.45) {
      resistBadges.push({ color: '#a16207', stroke: '#fef08a', glyph: 'Z' });
    }
    if ((cfg.arrowResist || 0) >= 0.4) {
      resistBadges.push({ color: '#475569', stroke: '#e2e8f0', glyph: 'A' });
    }
    if (resistBadges.length > 0) {
      const shown = resistBadges.slice(0, 2);
      ctx.save();
      ctx.font = '800 8px Lexend, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      shown.forEach((b, idx) => {
        const bx = barW / 2 + 9 + idx * 12;
        const by = barY + barH / 2;
        ctx.fillStyle = b.color;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(bx, by, 5.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = b.stroke;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(b.glyph, bx, by + 0.5);
      });
      ctx.restore();
    }

    ctx.restore();
  }

  private drawProjectiles(ctx: CanvasRenderingContext2D) {
    for (const p of this.projectiles) {
      if (p.kind === 'ember') {
        ctx.save();
        ctx.translate(p.x, p.y);

        // Glowing fiery aura
        const grad = ctx.createRadialGradient(0, 0, 3, 0, 0, 22);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.35, '#fbbf24');
        grad.addColorStop(0.75, '#ea580c');
        grad.addColorStop(1, 'rgba(234, 88, 12, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();

        // Molten cannonball core
        ctx.fillStyle = '#fde68a';
        ctx.strokeStyle = '#7c2d12';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
        continue;
      }

      const nextT = Math.min(1, p.progress + 0.05);
      const nx = p.sx + (p.tx - p.sx) * nextT;
      const ny = p.sy + (p.ty - p.sy) * nextT - Math.sin(nextT * Math.PI) * p.arcHeight;
      const ang = Math.atan2(ny - p.y, nx - p.x);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);

      // Glowing energy trail
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.moveTo(-26, 0);
      ctx.lineTo(2, 0);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Crisp arrow shaft & glowing arrowhead
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(10, 0);
      ctx.stroke();

      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(9, 0);
      ctx.stroke();

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(4, -5);
      ctx.lineTo(6, 0);
      ctx.lineTo(4, 5);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  private buildJaggedArcPoints(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    jitter = 11
  ): Array<{ x: number; y: number }> {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const segments = Math.max(4, Math.min(10, Math.round(dist / 36)));
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.max(1, dist);
    const nx = -dy / len;
    const ny = dx / len;
    const pts: Array<{ x: number; y: number }> = [{ x: x1, y: y1 }];
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const offset = (Math.random() - 0.5) * 2 * jitter;
      pts.push({
        x: x1 + dx * t + nx * offset,
        y: y1 + dy * t + ny * offset,
      });
    }
    pts.push({ x: x2, y: y2 });
    return pts;
  }

  private drawLightningArcs(ctx: CanvasRenderingContext2D) {
    if (!this.lightningArcs.length) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const arc of this.lightningArcs) {
      if (arc.points.length < 2) continue;
      const alpha = Math.max(0, 1 - arc.age / arc.life);

      // Outer electric glow stroke
      ctx.globalAlpha = alpha * 0.55;
      ctx.strokeStyle = arc.color;
      ctx.lineWidth = arc.width * 2.4;
      ctx.shadowColor = arc.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(arc.points[0].x, arc.points[0].y);
      for (let i = 1; i < arc.points.length; i++) {
        ctx.lineTo(arc.points[i].x, arc.points[i].y);
      }
      ctx.stroke();

      // Inner blazing white-cyan lightning core
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 6;
      ctx.strokeStyle = arc.coreColor;
      ctx.lineWidth = Math.max(1.5, arc.width * 0.72);
      ctx.beginPath();
      ctx.moveTo(arc.points[0].x, arc.points[0].y);
      for (let i = 1; i < arc.points.length; i++) {
        ctx.lineTo(arc.points[i].x, arc.points[i].y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawMeteors(ctx: CanvasRenderingContext2D) {
    for (const m of this.meteors) {
      const t = Math.min(1, m.age / m.life);
      const x = m.sx + (m.tx - m.sx) * t;
      const y = m.sy + (m.ty - m.sy) * t;

      // Target warning reticle on ground
      ctx.save();
      ctx.strokeStyle = 'rgba(251, 146, 60, 0.85)';
      ctx.fillStyle = 'rgba(251, 146, 60, 0.18)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(m.tx, m.ty, 95 * (1 - t * 0.25), 55 * (1 - t * 0.25), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Blazing fireball meteor
      const grad = ctx.createRadialGradient(x, y, 4, x, y, 46);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.35, '#fbbf24');
      grad.addColorStop(0.75, '#ea580c');
      grad.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawCraters(ctx: CanvasRenderingContext2D) {
    if (!this.craters.length) return;
    ctx.save();
    for (const c of this.craters) {
      const t = c.age / c.life;
      const alpha = t < 0.65 ? 0.55 : Math.max(0, 0.55 * (1 - (t - 0.65) / 0.35));
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(1, 0.64);
      const grad = ctx.createRadialGradient(0, 0, c.radius * 0.1, 0, 0, c.radius);
      grad.addColorStop(0, `rgba(12, 10, 9, ${alpha.toFixed(2)})`);
      grad.addColorStop(0.55, `rgba(28, 22, 20, ${(alpha * 0.72).toFixed(2)})`);
      grad.addColorStop(1, 'rgba(12, 10, 9, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
      ctx.fill();

      // Cooling glowing ember core in first 1.2 seconds
      if (t < 0.38) {
        const emberAlpha = (1 - t / 0.38) * 0.55;
        ctx.globalAlpha = emberAlpha;
        ctx.fillStyle = c.glowColor;
        ctx.beginPath();
        ctx.arc(0, 0, c.radius * 0.32, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  private drawExplosions(ctx: CanvasRenderingContext2D) {
    if (!this.explosions.length) return;
    const themes: Record<ExplosionTheme, { core: string; mid: string; outer: string; edge: string }> = {
      fire: { core: '#ffffff', mid: '#fef08a', outer: '#f97316', edge: 'rgba(220, 38, 38, 0)' },
      inferno: { core: '#ffffff', mid: '#fde047', outer: '#ea580c', edge: 'rgba(185, 28, 28, 0)' },
      plasma: { core: '#ffffff', mid: '#a5f3fc', outer: '#06b6d4', edge: 'rgba(14, 116, 144, 0)' },
      electric: { core: '#ffffff', mid: '#e0f2fe', outer: '#38bdf8', edge: 'rgba(168, 85, 247, 0)' },
      frost: { core: '#ffffff', mid: '#e0f2fe', outer: '#38bdf8', edge: 'rgba(14, 165, 233, 0)' },
      earth: { core: '#fef3c7', mid: '#d6d3d1', outer: '#78716c', edge: 'rgba(41, 37, 36, 0)' },
      gravity: { core: '#ffffff', mid: '#f5d0fe', outer: '#9333ea', edge: 'rgba(56, 224, 255, 0)' },
      boss: { core: '#ffffff', mid: '#fef08a', outer: '#e879f9', edge: 'rgba(249, 115, 22, 0)' },
    };

    ctx.save();
    for (const ex of this.explosions) {
      const t = Math.min(1, ex.age / ex.life);
      const pal = themes[ex.theme];

      // Billowing multi-lobe radial fire/energy clouds
      for (const lobe of ex.lobes) {
        const lt = Math.max(0, Math.min(1, (t - lobe.delay) / Math.max(0.15, 1 - lobe.delay)));
        if (lt <= 0 || lt >= 1) continue;
        const easeOut = 1 - Math.pow(1 - lt, 3);
        const rad = ex.radius * lobe.scale * (0.28 + 0.88 * easeOut);
        const alpha = lt < 0.25 ? 0.96 : Math.max(0, (1 - (lt - 0.25) / 0.75) * 0.94);
        const lx = ex.x + lobe.ox * easeOut;
        const ly = ex.y + lobe.oy * easeOut - easeOut * (ex.theme === 'fire' || ex.theme === 'inferno' ? 14 : 4);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.globalCompositeOperation = ex.theme === 'earth' ? 'source-over' : 'lighter';
        const grad = ctx.createRadialGradient(lx, ly, rad * 0.06, lx, ly, rad);
        grad.addColorStop(0, pal.core);
        grad.addColorStop(0.28, pal.mid);
        grad.addColorStop(0.68, pal.outer);
        grad.addColorStop(1, pal.edge);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(lx, ly, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Blinding hot flash bloom in the first 28% of detonation
      if (t < 0.28) {
        const ft = t / 0.28;
        const flashR = ex.radius * (0.45 + 0.55 * ft);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (1 - ft) * 0.92;
        const flashGrad = ctx.createRadialGradient(ex.x, ex.y, 2, ex.x, ex.y, flashR);
        flashGrad.addColorStop(0, '#ffffff');
        flashGrad.addColorStop(0.45, pal.mid);
        flashGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = flashGrad;
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, flashR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  private drawRings(ctx: CanvasRenderingContext2D) {
    for (const r of this.rings) {
      const t = r.age / r.life;
      const rad = r.r0 + (r.r1 - r.r0) * (1 - Math.pow(1 - t, 3));
      const alpha = Math.max(0, 1 - t);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.lineWidth * (1 - t * 0.5);
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, rad, rad * 0.68, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (r.fillAlpha) {
        ctx.globalAlpha = alpha * r.fillAlpha;
        ctx.fillStyle = r.color;
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    // Combat sparks, fiery streaks, shards & rising smoke
    for (const p of this.particles) {
      const t = p.age / p.life;
      const alpha = Math.max(0, 1 - t);
      ctx.save();
      if (p.kind === 'smoke') {
        ctx.globalAlpha = alpha * 0.72;
        ctx.fillStyle = p.color;
        const rad = p.r * (0.75 + t * 1.15);
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'streak') {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1.4, p.r * (0.55 + 0.5 * alpha));
        ctx.lineCap = 'round';
        const tail = 0.055;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * tail, p.y - p.vy * tail);
        ctx.stroke();
      } else if (p.kind === 'shard') {
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot || 0);
        const s = p.r * (0.5 + 0.55 * alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(0, -s * 1.35);
        ctx.lineTo(s * 0.72, 0);
        ctx.lineTo(0, s * 1.1);
        ctx.lineTo(-s * 0.72, 0);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (0.4 + 0.6 * alpha), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Gentle sunlit pollen & violet Rift motes
    if (!this.focusMode) {
      for (const m of this.ambientMotes) {
        const mx = m.x + Math.sin(this.clock * m.speed + m.phase) * 18;
        const my = m.y + Math.cos(this.clock * m.speed * 0.8 + m.phase) * 12;
        const alpha = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(this.clock * 2.2 + m.phase));
        ctx.fillStyle = m.violet
          ? `rgba(232, 121, 249, ${alpha.toFixed(2)})`
          : this.level.worldId === 'w2'
          ? `rgba(251, 146, 60, ${alpha.toFixed(2)})`
          : `rgba(254, 240, 138, ${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(mx, my, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawFloatingTexts(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const ft of this.floatingTexts) {
      const t = ft.age / ft.life;
      const alpha = t < 0.7 ? 1 : Math.max(0, (1 - t) / 0.3);
      ctx.globalAlpha = alpha;
      const fontSize = Math.round(22 * ft.scale);
      ctx.font = `800 ${fontSize}px Lexend, system-ui, sans-serif`;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 5;
      ctx.lineJoin = 'round';
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.restore();
  }

  private drawLandmarkBadges(ctx: CanvasRenderingContext2D) {
    // 1. "The Rift" badge above the Rift Portal
    const riftLabel =
      this.phase === 'wave'
        ? 'The Rift · wave incoming'
        : this.finalWave
        ? 'The Rift · final wave ready'
        : 'The Rift · quiet';
    this.drawWorldPill(ctx, this.riftPos.x + 28, this.riftPos.y - 62, riftLabel, '#d946ef', '#fdf4ff');

    // 2. "Rift Anchor 20/20" badge neatly below the Anchor Crystal
    const anchorLabel = `♦ Rift Anchor ${this.anchor}/${this.level.anchor}`;
    this.drawWorldPill(
      ctx,
      this.campPos.x,
      this.campPos.y + 44,
      anchorLabel,
      this.anchor <= 6 ? '#fb7185' : '#38e0ff',
      '#ecfeff'
    );
  }

  private drawWorldPill(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    text: string,
    borderColor: string,
    textColor: string
  ) {
    ctx.save();
    ctx.font = '700 18px Lexend, system-ui, sans-serif';
    const w = ctx.measureText(text).width + 32;
    const h = 34;

    ctx.fillStyle = 'rgba(18, 14, 40, 0.9)';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2.5;
    this.roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 17);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy + 1);
    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  private emitSnapshot() {
    let selInfo: SelectedDefenderInfo | null = null;
    if (this.selectedDef) {
      const sc = this.worldToScreen(this.selectedDef.pad.x, this.selectedDef.pad.y - 45);
      selInfo = {
        padId: this.selectedDef.pad.id,
        type: this.selectedDef.type,
        level: this.selectedDef.level,
        spec: this.selectedDef.spec,
        targetMode: this.selectedDef.targetMode,
        spent: this.selectedDef.spent,
        screenX: sc.x,
        screenY: sc.y,
      };
    }

    this.callbacks.onSnapshot({
      phase: this.phase,
      crystals: this.crystals,
      anchor: this.anchor,
      anchorMax: this.level.anchor,
      wave: this.wave,
      totalWaves: this.level.waves.length,
      finalWave: this.finalWave,
      locksReady: this.locksReady,
      milestoneStars: this.bankedStars,
      bonusActive: this.bonusActive,
      bonusWave: this.bonusWave,
      bonusTotal: this.level.bonusSurgeWaves,
      wordsUntilWave: this.wordsUntilWave,
      creaturesAlive: this.creatures.length + this.spawnQueue.length,
      defendersCount: this.defenders.length,
      upgradedCount: this.upgradedCount,
      kills: this.kills,
      shards: this.shards,
      powers: { ...this.powers },
      rallyActive: this.rallyTimer > 0,
      freezeActive: this.freezeTimer > 0,
      buildSel: this.buildSel,
      selectedDef: selInfo,
      paused: this.paused,
      speed: this.speed,
      difficulty: this.difficulty,
      cameraPreset: this.cameraPreset,
      labels: [], // Health bars are rendered crisply in-canvas for zero lag
    });
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('resize', this.handleResize);
    this.container.innerHTML = '';
  }
}
