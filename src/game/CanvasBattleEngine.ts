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
import { GameSpriteBank, loadGameSprites, SpriteKey } from './sprites';

export type CameraPreset = 'tactical' | 'action' | 'rift' | 'camp';

export interface SelectedDefenderInfo {
  padId: string;
  type: DefenderType;
  level: number;
  spec: 'a' | 'b' | null;
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
  armorShredTimer: number;
  shieldTimer: number;
  abilityCd: number;
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
    let bestIdx = 0;
    let bestD = Infinity;
    for (let i = 0; i < this.samples.length; i++) {
      const dx = this.samples[i].x - x;
      const dy = this.samples[i].y - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    }
    return this.cumLen[bestIdx] / this.totalLen;
  }
}

export class BattleEngine {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private level: LevelConfig;
  private callbacks: BattleEngineCallbacks;

  private sprites: GameSpriteBank | null = null;
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
  private idCounter = 1;

  private rafId = 0;
  private lastTs = 0;
  private clock = 0;
  private snapAccum = 0;
  private disposed = false;

  // Scale conversion: 1 world unit in level1.ts stats -> 26px in 1600x900 map space
  // Keeps Level 1 towers focused on their local curve and Level 3 / Sharpshooter genuinely tactical.
  private readonly RANGE_UNIT_PX = 26;

  constructor(container: HTMLElement, level: LevelConfig, callbacks: BattleEngineCallbacks) {
    this.container = container;
    this.level = level;
    this.callbacks = callbacks;

    this.crystals = level.startCrystals;
    this.anchor = level.anchor;
    this.wordsUntilWave = level.waveEvery;
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

  private onPointerMove = (ev: PointerEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const pt = this.screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top);
    this.hoverPad = this.findPadAt(pt.x, pt.y);
    this.canvas.style.cursor = this.hoverPad ? 'pointer' : 'default';
  };

  private onPointerDown = (ev: PointerEvent) => {
    if (ev.button !== 0 || this.phase === 'done' || this.phase === 'milestone') return;
    const rect = this.canvas.getBoundingClientRect();
    const pt = this.screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top);
    const pad = this.findPadAt(pt.x, pt.y);

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
      this.callbacks.onToast(
        `${cfg.name} (${cfg.cost} crystals): tap a glowing ${cfg.kind === 'tower' ? 'stone pad' : 'trail spot'}.`
      );
    }
    this.emitSnapshot();
  }

  public clearSelection() {
    this.buildSel = null;
    this.selectedDef = null;
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

  public setDifficulty(diff: DifficultyId) {
    if (this.difficulty === diff) return;
    this.difficulty = diff;
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
    this.wordsUntilWave = this.level.waveEvery;
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
      this.callbacks.onToast(
        this.wave + 1 >= this.level.minWaves
          ? `${lockNames} Lock Sealed (+${bonusAmount} bonus crystals)! All Rift Locks filled. The next wave is the Final Wave.`
          : `${lockNames} Lock Sealed (+${bonusAmount} bonus crystals)! All Rift Locks filled. Clear the next wave to unlock the Final Wave.`
      );
    } else {
      this.callbacks.onToast(
        `${lockNames} Lock Sealed! +${bonusAmount} bonus crystals awarded.`
      );
    }

    this.emitSnapshot();
    return bonusAmount;
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

    if (justCompletedLocks && awardedLockBonus === 0 && !this.bonusActive && !this.bankedWin) {
      this.callbacks.onToast(
        this.wave + 1 >= this.level.minWaves
          ? 'All Rift Locks filled! The next wave is the Final Wave.'
          : 'All Rift Locks filled! Clear the next wave to unlock the Final Wave.'
      );
    }

    if (this.phase === 'build' || this.phase === 'between') {
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

    if (justCompletedLocks && awardedLockBonus === 0 && !this.bonusActive && !this.bankedWin) {
      this.callbacks.onToast(
        this.wave + 1 >= this.level.minWaves
          ? 'All Rift Locks filled! The next wave is the Final Wave.'
          : 'All Rift Locks filled! Clear the next wave to unlock the Final Wave.'
      );
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
    this.spawnBurst(this.campPos.x, this.campPos.y, '#38e0ff', 28);
    this.spawnFloatingText(this.campPos.x, this.campPos.y - 75, 'MEGA FORGE!', '#fbbf24', 1.45);

    for (const cr of this.creatures) {
      if (!cr.alive) continue;
      this.damageCreature(cr, FORGE_CONFIG.megaBlast, { armorPierce: true });
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
        life: 0.42,
        impacted: false,
      });
      sound.sfx('mega');
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

  public sellSelected() {
    const def = this.selectedDef;
    if (!def) return;
    const refund = Math.round(def.spent * 0.7);
    this.crystals += refund;
    for (const cr of def.holding) {
      cr.heldBy = null;
    }
    def.pad.def = null;
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

    let t = 0.6;
    for (const grp of waveDef.groups) {
      const startAt = grp.delay !== undefined ? Math.max(0.6, grp.delay) : t;
      let cursor = startAt;
      const count = countMult > 1 ? Math.round(grp.count * countMult) : grp.count;
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
    const scaledHp = Math.max(1, Math.round(cfg.hp * hpMult * diffCfg.hpMult));
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
      speed: cfg.speed * diffCfg.speedMult,
      anchorDmg: cfg.anchor,
      shards: cfg.shards,
      hitDmg: cfg.hit,
      alive: true,
      slowMult: 1,
      slowTimer: 0,
      freezeTimer: 0,
      armorShredTimer: 0,
      shieldTimer: 0,
      abilityCd: type === 'weaver' ? 2.4 : type === 'ironwarden' ? 4.8 : 0,
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
    opts?: { armorPierce?: boolean; armorShred?: number }
  ) {
    if (!cr.alive) return;
    const cfg = CREATURES[cr.type];
    const baseArmor = cfg.armor || 0;
    const shieldArmor = cr.shieldTimer > 0 ? 0.25 : 0;
    const effectiveArmor = cr.armorShredTimer > 0 ? 0 : Math.min(0.65, baseArmor + shieldArmor);
    const armorActive = effectiveArmor > 0;
    const mitigated = armorActive && !opts?.armorPierce ? dmg * (1 - effectiveArmor) : dmg;
    const rounded = Math.max(1, Math.round(mitigated));
    cr.hp -= rounded;
    cr.hitFlash = 0.14;

    if (opts?.armorShred && opts.armorShred > 0) {
      const wasIntact = cr.armorShredTimer <= 0 && (baseArmor > 0 || cr.shieldTimer > 0);
      cr.armorShredTimer = Math.max(cr.armorShredTimer, opts.armorShred);
      if (cr.shieldTimer > 0) cr.shieldTimer = 0;
      if (wasIntact) {
        this.spawnFloatingText(cr.x, cr.y - 68, 'ARMOR CRACKED!', '#38e0ff', 1.05);
      }
    }

    if (armorActive && !opts?.armorPierce && dmg >= 8 && Math.random() < 0.32) {
      this.spawnBurst(cr.x, cr.y - 26, '#fbbf24', 3);
    }

    if (rounded >= 4 || Math.random() < 0.35) {
      const dmgColor = opts?.armorPierce && armorActive
        ? '#38e0ff'
        : armorActive && !opts?.armorPierce
        ? '#cbd5e1'
        : '#fbbf24';
      this.spawnFloatingText(
        cr.x + (Math.random() - 0.5) * 18,
        cr.y - 38,
        `-${rounded}`,
        dmgColor,
        rounded >= 25 ? 1.2 : 0.95
      );
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
        this.shakeTimer = 0.45;
        this.shakeStrength = 10;
        this.rings.push({
          x: cr.x,
          y: cr.y,
          r0: 20,
          r1: 220,
          color: '#fbbf24',
          lineWidth: 8,
          age: 0,
          life: 0.72,
          fillAlpha: 0.2,
        });
        this.spawnBurst(cr.x, cr.y - 30, '#fbbf24', 24);
        this.spawnFloatingText(cr.x, cr.y - 96, 'THORNKING FALLS!', '#fbbf24', 1.4);
      }

      sound.sfx(cfg.isBoss ? 'mega' : 'arrowHit');
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

  private spawnBurst(x: number, y: number, color: string, count: number) {
    if (this.focusMode) count = Math.min(count, 4);
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const spd = 45 + Math.random() * 125;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 20,
        r: 2.4 + Math.random() * 3.4,
        color,
        age: 0,
        life: 0.35 + Math.random() * 0.32,
        glow: true,
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
      cr.s += cr.speed * cr.slowMult * pathUnitFactor * dt;

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
          const inRange = this.creatures
            .filter((cr) => cr.alive && Math.hypot(cr.x - def.pad.x, cr.y - def.pad.y) <= rangePx)
            .sort((a, b) => b.s - a.s);
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
            sound.sfx('arrow');
          }
        }
      } else if (def.type === 'ember') {
        def.cd -= dt * rateBoost;
        if (def.cd <= 0) {
          const rangePx = (st.range || 6.6) * this.RANGE_UNIT_PX;
          let target: CreatureRuntime | null = null;
          let bestS = -1;
          for (const cr of this.creatures) {
            if (!cr.alive) continue;
            if (Math.hypot(cr.x - def.pad.x, cr.y - def.pad.y) <= rangePx && cr.s > bestS) {
              bestS = cr.s;
              target = cr;
            }
          }
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
            this.spawnBurst(def.pad.x, def.pad.y - 54, '#fb923c', 6);
            sound.sfx('cannon');
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
              let bestScore = -1;
              for (const cr of this.creatures) {
                if (!cr.alive) continue;
                if (Math.hypot(cr.x - def.pad.x, cr.y - def.pad.y) <= rangePx) {
                  const bossBonus = CREATURES[cr.type].isBoss ? 10000 : 0;
                  const score = bossBonus + cr.hp * 2 + cr.s * 120;
                  if (score > bestScore) {
                    bestScore = score;
                    target = cr;
                  }
                }
              }
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
                width: 3.4 + stacks * 0.65,
                age: 0,
                life: 0.24,
              });
              this.spawnBurst(target.x, ty, stacks >= 4 ? '#f0abfc' : '#67e8f9', 6);
              this.damageCreature(target, hitDmg);
              sound.sfx('zap');
            } else {
              def.beamTargetId = null;
              def.beamStacks = 0;
            }
          } else {
            // Chain Lightning mode (hits primary target and arcs across nearby enemies, ground & air)
            let primary: CreatureRuntime | null = null;
            let bestS = -1;
            for (const cr of this.creatures) {
              if (!cr.alive) continue;
              if (Math.hypot(cr.x - def.pad.x, cr.y - def.pad.y) <= rangePx && cr.s > bestS) {
                bestS = cr.s;
                primary = cr;
              }
            }
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
              struck.forEach((cr, hopIdx) => {
                const ty = cr.y - (CREATURES[cr.type].flying ? 34 : 20);
                const hopMult = Math.max(0.55, Math.pow(0.86, hopIdx));
                const hopDmg = Math.round(baseDmg * hopMult);
                this.lightningArcs.push({
                  points: this.buildJaggedArcPoints(prevX, prevY, cr.x, ty, hopIdx === 0 ? 12 : 9),
                  color: def.spec === 'a' ? '#a855f7' : '#38e0ff',
                  coreColor: '#e0f2fe',
                  width: Math.max(2.2, 4.2 - hopIdx * 0.4),
                  age: 0,
                  life: 0.22,
                });
                this.spawnBurst(cr.x, ty, '#38e0ff', hopIdx === 0 ? 7 : 4);
                this.damageCreature(cr, hopDmg);
                prevX = cr.x;
                prevY = ty;
              });
              sound.sfx('zap');
            }
          }
        }
      } else if (def.type === 'rail') {
        def.cd -= dt * rateBoost;
        if (def.cd <= 0) {
          const rangePx = (st.range || 8.6) * this.RANGE_UNIT_PX;
          // Prioritize armored enemies & bosses in range, then furthest along the path
          let primary: CreatureRuntime | null = null;
          let bestScore = -1;
          for (const cr of this.creatures) {
            if (!cr.alive) continue;
            if (Math.hypot(cr.x - def.pad.x, cr.y - def.pad.y) <= rangePx) {
              const cfg = CREATURES[cr.type];
              const armorBonus = (cfg.armor || 0) > 0 && cr.armorShredTimer <= 0 ? 500 : 0;
              const bossBonus = cfg.isBoss ? 1200 : 0;
              const score = bossBonus + armorBonus + cr.s * 300;
              if (score > bestScore) {
                bestScore = score;
                primary = cr;
              }
            }
          }
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
              width: def.spec ? 5.2 : 4.2,
              age: 0,
              life: 0.24,
            });
            this.rings.push({
              x: muzzleX,
              y: muzzleY,
              r0: 6,
              r1: 28,
              color: '#38e0ff',
              lineWidth: 3,
              age: 0,
              life: 0.22,
            });

            const baseDmg = st.dmg || 34;
            hitTargets.forEach((cr, idx) => {
              const cy = cr.y - (CREATURES[cr.type].flying ? 34 : 24);
              const hitDmg = idx === 0 ? baseDmg : Math.round(baseDmg * 0.85);
              this.spawnBurst(cr.x, cy, def.spec === 'b' ? '#fbbf24' : '#38e0ff', idx === 0 ? 10 : 6);
              if (def.spec === 'b') {
                this.rings.push({
                  x: cr.x,
                  y: cy,
                  r0: 10,
                  r1: 52,
                  color: '#fbbf24',
                  lineWidth: 3.5,
                  age: 0,
                  life: 0.34,
                });
              }
              this.damageCreature(cr, hitDmg, {
                armorPierce: Boolean(st.armorPierce),
                armorShred: st.armorShred,
              });
            });
            sound.sfx('rail');
          }
        }
      } else if (def.type === 'spike') {
        const rangePx = (st.radius || st.range || 2.2) * this.RANGE_UNIT_PX;
        let hitAny = false;
        for (const cr of this.creatures) {
          if (!cr.alive || CREATURES[cr.type].flying) continue;
          if (Math.hypot(cr.x - def.pad.x, cr.y - def.pad.y) <= rangePx) {
            hitAny = true;
            this.damageCreature(cr, (st.dps || 18) * rateBoost * dt * 1.4);
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
            this.spawnBurst(def.pad.x + (Math.random() - 0.5) * 28, def.pad.y, st.slow ? '#a855f7' : '#38e0ff', 3);
          }
        }
      } else if (def.type === 'gravity') {
        const rangePx = (st.radius || 2.35) * this.RANGE_UNIT_PX;
        let hitAny = false;
        const trapped: CreatureRuntime[] = [];
        for (const cr of this.creatures) {
          if (!cr.alive) continue;
          if (CREATURES[cr.type].flying && !st.hitsAir) continue;
          if (Math.hypot(cr.x - def.pad.x, cr.y - def.pad.y) <= rangePx) {
            hitAny = true;
            trapped.push(cr);
            this.damageCreature(cr, (st.dps || 14) * rateBoost * dt * 1.25, {
              armorPierce: Boolean(st.armorPierce),
            });
            if (st.slow) {
              const resist = (CREATURES[cr.type].slowResist || 0) * 0.5;
              const mult = 1 - st.slow * (1 - resist);
              if (mult < cr.slowMult) cr.slowMult = mult;
              cr.slowTimer = Math.max(cr.slowTimer, 0.55);
            }
          }
        }

        // Periodic graviton pull-back pulse (drags enemies back along path + optional armor shred)
        def.pullCd = (def.pullCd ?? (st.pullEvery || 2.8)) - dt * rateBoost;
        if (def.pullCd <= 0 && trapped.length > 0) {
          def.pullCd = st.pullEvery || 2.8;
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
          for (const cr of trapped) {
            const pull = (st.pullStrength || 0.02) * (CREATURES[cr.type].isBoss ? 0.45 : 1);
            cr.s = Math.max(0.01, cr.s - pull);
            const pt = this.path.pointAt(cr.s);
            const nx = -pt.ty;
            const ny = pt.tx;
            cr.x = pt.x + nx * cr.lane;
            cr.y = pt.y + ny * cr.lane;
            if (st.armorShred && st.armorShred > 0) {
              cr.armorShredTimer = Math.max(cr.armorShredTimer, st.armorShred);
              cr.shieldTimer = 0;
            }
            this.spawnBurst(cr.x, cr.y - 16, '#c084fc', 5);
          }
          sound.sfx('frost', 180);
        }

        // Stasis Anchor specialty: periodic gravity freeze lock
        if (st.freezeEvery && st.freezeTime) {
          def.freezeCd -= dt * rateBoost;
          if (def.freezeCd <= 0 && trapped.length > 0) {
            def.freezeCd = st.freezeEvery;
            for (const cr of trapped) {
              cr.freezeTimer = Math.max(
                cr.freezeTimer,
                st.freezeTime * (CREATURES[cr.type].isBoss ? 0.55 : 1)
              );
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
            this.damageCreature(target, st.dmg || 16);
            this.rings.push({
              x: target.x,
              y: target.y,
              r0: 10,
              r1: 52,
              color: '#38e0ff',
              lineWidth: 3.5,
              age: 0,
              life: 0.38,
            });
            sound.sfx('golemSlam');

            if (st.cleave) {
              for (const cr of this.creatures) {
                if (
                  cr.alive &&
                  cr !== target &&
                  !CREATURES[cr.type].flying &&
                  Math.hypot(cr.x - def.pad.x, cr.y - def.pad.y) <= 105
                ) {
                  this.damageCreature(cr, (st.dmg || 16) * 0.65);
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
              this.damageCreature(cr, st.dps * rateBoost * dt);
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
                v.freezeTimer = Math.max(v.freezeTimer, st.freezeTime || 1.6);
              }
              this.rings.push({
                x: def.pad.x,
                y: def.pad.y,
                r0: 12,
                r1: rangePx,
                color: '#38e0ff',
                lineWidth: 5,
                age: 0,
                life: 0.55,
                fillAlpha: 0.14,
              });
              sound.sfx('frost');
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
          this.rings.push({
            x: p.tx,
            y: p.ty,
            r0: 10,
            r1: p.splashRadius,
            color: '#fb923c',
            lineWidth: 6,
            age: 0,
            life: 0.42,
            fillAlpha: 0.24,
          });
          this.spawnBurst(p.tx, p.ty, '#fbbf24', 14);
          this.spawnBurst(p.tx, p.ty, '#f97316', 10);
          for (const cr of this.creatures) {
            if (!cr.alive) continue;
            if (Math.hypot(cr.x - p.tx, cr.y - p.ty) <= p.splashRadius) {
              this.damageCreature(cr, p.dmg);
            }
          }
          sound.sfx('cannon');
        } else {
          if (p.target.alive) {
            this.damageCreature(p.target, p.dmg);
          }
          this.spawnBurst(p.tx, p.ty, p.color, 5);
        }
        this.projectiles.splice(i, 1);
      } else {
        const t = p.progress;
        p.x = p.sx + (p.tx - p.sx) * t;
        p.y = p.sy + (p.ty - p.sy) * t - Math.sin(t * Math.PI) * p.arcHeight;
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
          this.wordsUntilWave = this.level.waveEvery;
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
        this.wordsUntilWave = this.level.waveEvery;
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
      if (m.age >= m.life && !m.impacted) {
        m.impacted = true;
        this.shakeTimer = 0.45;
        this.shakeStrength = 12;
        this.rings.push({
          x: m.tx,
          y: m.ty,
          r0: 14,
          r1: 185,
          color: '#fb923c',
          lineWidth: 9,
          age: 0,
          life: 0.65,
          fillAlpha: 0.28,
        });
        this.spawnBurst(m.tx, m.ty, '#fbbf24', 24);
        this.spawnBurst(m.tx, m.ty, '#fb7185', 14);
        for (const cr of this.creatures) {
          if (cr.alive && Math.hypot(cr.x - m.tx, cr.y - m.ty) <= 190) {
            this.damageCreature(cr, HERO_POWERS.meteor.dmg || 80, { armorPierce: true });
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
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 90 * dt;
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

    // 6. Ground-level expanding spell rings
    this.drawRings(ctx);

    // 7. Depth-sorted 2.5D entities (Spike Pits first on ground, then Towers, Golems, Warden, Creatures by Y)
    this.drawDepthSortedEntities(ctx);

    // 8. Projectiles, Lightning Arcs & Meteors
    this.drawProjectiles(ctx);
    this.drawLightningArcs(ctx);
    this.drawMeteors(ctx);

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
    ctx.fillStyle = color === '#fbbf24' ? 'rgba(251, 191, 36, 0.12)' : 'rgba(56, 224, 255, 0.12)';
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
        : cr.type === 'weaver'
        ? -10
        : 0
      : cr.type === 'bat'
      ? -26 + Math.sin(cr.animPhase * 1.7) * 7
      : cr.type === 'shrieker'
      ? -28 + Math.sin(cr.animPhase * 1.35) * 8
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
      : cr.type === 'bat' || cr.type === 'shrieker'
      ? Math.sin(cr.animPhase * 0.9) * 0.09
      : cr.type === 'wisp' || cr.type === 'weaver'
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
        : cr.type === 'shrieker'
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
      }

      ctx.drawImage(sprite.canvas, -drawW * 0.5, -drawH * 0.9, drawW, drawH);
      ctx.filter = 'none';
      ctx.restore();
    } else {
      ctx.fillStyle =
        cr.type === 'cinderimp' || cr.type === 'ironwarden'
          ? '#fb923c'
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
    // Combat sparks
    for (const p of this.particles) {
      const alpha = Math.max(0, 1 - p.age / p.life);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (0.4 + 0.6 * alpha), 0, Math.PI * 2);
      ctx.fill();
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
    window.removeEventListener('resize', this.handleResize);
    this.container.innerHTML = '';
  }
}
