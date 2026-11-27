import React from 'react';
import {
  Check,
  ChevronRight,
  Crosshair,
  FastForward,
  Flame,
  Gem,
  HelpCircle,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Shield,
  Snowflake,
  Sparkles,
  Square,
  Star,
  Trash2,
  TrendingUp,
  Volume2,
  X,
} from 'lucide-react';
import {
  SPANISH_DEFENDERS,
  SPANISH_HERO_POWERS,
  SPANISH_WALKTHROUGH_STEPS,
} from '../data/ellSpanish';
import {
  DEFENDERS,
  DIFFICULTIES,
  FORGE_CONFIG,
  getPatternRule,
  HERO_POWER_ORDER,
  HERO_POWERS,
  HeroPowerId,
  LevelConfig,
  PatternKey,
} from '../data/level1';
import { PLACEMENT_STAGES, PlacementRunState } from '../data/placement';
import { BattleSnapshot, TargetPriority } from '../game/CanvasBattleEngine';
import { sound } from '../lib/audio';
import { PatternLockStatus } from '../lib/metrics';

export interface WalkthroughInfo {
  stepNum: number;
  totalSteps: number;
  title: string;
  body: string;
  highlight: 'archer' | 'pad' | 'spike' | 'forge' | 'wave' | 'tower' | 'locks';
  canManualNext: boolean;
  isLast: boolean;
}

export interface WaveBannerInfo {
  id: number;
  title: string;
  subtitle: string;
  accent: 'cyan' | 'magenta' | 'amber';
}

interface BattleHUDProps {
  level: LevelConfig;
  snap: BattleSnapshot;
  locks: PatternLockStatus[];
  placementRun?: PlacementRunState | null;
  toast: string;
  waveBanner: WaveBannerInfo | null;
  walkthrough: WalkthroughInfo | null;
  lockBonusFlash?: { patterns: PatternKey[]; amount: number } | null;
  spanishCaptions?: boolean;
  teacherMode?: boolean;
  onTurnOffTeacherMode?: () => void;
  onWalkthroughNext: () => void;
  onWalkthroughSkip: () => void;
  onToggleWalkthrough: () => void;
  onClearLocks: (pattern?: PatternKey) => void;
  onUpgrade: (spec?: 'a' | 'b') => void;
  onSetTargetMode: (mode: TargetPriority) => void;
  onSell: () => void;
  onClosePopup: () => void;
  onCastPower: (id: HeroPowerId) => void;
  onStartWave: () => void;
  onSealRift: () => void;
  onStartBonusSurge: () => void;
  onTogglePause: () => void;
  onToggleSpeed: () => void;
  onCycleDifficulty: () => void;
  onOpenSettings: () => void;
  onExitToTitle: () => void;
}

const LOCK_STYLE_PALETTE = [
  {
    icon: 'text-amber-300',
    filled: 'border-amber-200 bg-amber-400',
    btn: 'border-amber-400/70 bg-amber-500/15 text-amber-300 hover:bg-amber-500/30',
  },
  {
    icon: 'text-emerald-300',
    filled: 'border-emerald-200 bg-emerald-400',
    btn: 'border-emerald-400/70 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/30',
  },
  {
    icon: 'text-purple-300',
    filled: 'border-fuchsia-200 bg-purple-400',
    btn: 'border-purple-400/70 bg-purple-500/15 text-purple-200 hover:bg-purple-500/30',
  },
  {
    icon: 'text-orange-300',
    filled: 'border-orange-200 bg-orange-400',
    btn: 'border-orange-400/70 bg-orange-500/15 text-orange-300 hover:bg-orange-500/30',
  },
  {
    icon: 'text-cyan-300',
    filled: 'border-cyan-200 bg-cyan-400',
    btn: 'border-cyan-400/70 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/30',
  },
];

const VOWEL_LOCK_STYLES: Record<string, { icon: string; filled: string; btn: string }> = {
  a: LOCK_STYLE_PALETTE[0],
  e: LOCK_STYLE_PALETTE[1],
  i: LOCK_STYLE_PALETTE[2],
  o: LOCK_STYLE_PALETTE[3],
  u: LOCK_STYLE_PALETTE[4],
  a_e: LOCK_STYLE_PALETTE[4],
  i_e: LOCK_STYLE_PALETTE[2],
  o_e: LOCK_STYLE_PALETTE[3],
  u_e: LOCK_STYLE_PALETTE[1],
  sh: LOCK_STYLE_PALETTE[3],
  ch: LOCK_STYLE_PALETTE[4],
  th: LOCK_STYLE_PALETTE[0],
  wh: LOCK_STYLE_PALETTE[4],
  ck: LOCK_STYLE_PALETTE[2],
  bl: LOCK_STYLE_PALETTE[4],
  cl: LOCK_STYLE_PALETTE[0],
  fr: LOCK_STYLE_PALETTE[3],
  gr: LOCK_STYLE_PALETTE[1],
  sp: LOCK_STYLE_PALETTE[4],
  st: LOCK_STYLE_PALETTE[3],
  nd: LOCK_STYLE_PALETTE[1],
  mp: LOCK_STYLE_PALETTE[2],
};

function getLockStyle(pattern: PatternKey, index: number) {
  return VOWEL_LOCK_STYLES[pattern] || LOCK_STYLE_PALETTE[index % LOCK_STYLE_PALETTE.length];
}

const TARGET_PRIORITY_OPTIONS: Array<{ id: TargetPriority; label: string; labelEs: string }> = [
  { id: 'first', label: 'First', labelEs: 'Primero' },
  { id: 'last', label: 'Last', labelEs: 'Último' },
  { id: 'strong', label: 'Strong', labelEs: 'Fuerte' },
];

export const BattleHUD: React.FC<BattleHUDProps> = ({
  level,
  snap,
  locks,
  placementRun = null,
  toast,
  waveBanner,
  walkthrough,
  lockBonusFlash = null,
  spanishCaptions = false,
  teacherMode = false,
  onTurnOffTeacherMode,
  onWalkthroughNext,
  onWalkthroughSkip,
  onToggleWalkthrough,
  onClearLocks,
  onUpgrade,
  onSetTargetMode,
  onSell,
  onClosePopup,
  onCastPower,
  onStartWave,
  onSealRift,
  onStartBonusSurge,
  onTogglePause,
  onToggleSpeed,
  onCycleDifficulty,
  onOpenSettings,
  onExitToTitle,
}) => {
  const selectedDefCfg = snap.selectedDef ? DEFENDERS[snap.selectedDef.type] : null;
  const nextUpCost =
    snap.selectedDef && selectedDefCfg && snap.selectedDef.level < 3
      ? selectedDefCfg.up[snap.selectedDef.level - 1]
      : null;

  const highlightWave = walkthrough?.highlight === 'wave';
  const highlightLocks = walkthrough?.highlight === 'locks';

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden select-none">
      {/* Single Slim Top Bar (strictly single-row, zero wrapping over the Rift) */}
      <div className="pointer-events-auto absolute inset-x-2 top-2 z-20 flex items-center justify-between gap-1.5">
        <div className="flex flex-nowrap items-center gap-1 min-w-0 overflow-x-auto">
          {/* Crystals */}
          <div
            title="Rune Crystals"
            className="flex h-8 items-center gap-1 rounded-xl border-2 border-purple-400/65 bg-[#171232]/94 px-2 font-tabular text-xs sm:text-sm font-extrabold text-white shadow-md shrink-0"
          >
            <Gem className="h-3.5 w-3.5 text-cyan-300 fill-cyan-300/30" />
            <span>{snap.crystals}</span>
          </div>

          {/* Hero Powers moved cleanly onto the single top bar */}
          <div
            className={`flex items-center gap-1 rounded-xl ${
              highlightLocks ? 'animate-tutorial-pulse ring-2 ring-amber-300' : ''
            }`}
          >
            {HERO_POWER_ORDER.map((pid) => {
              const p = HERO_POWERS[pid];
              const cur = snap.powers[pid];
              const ready = cur >= p.charge;
              const pct = Math.min(100, Math.round((cur / p.charge) * 100));
              const Icon = pid === 'rally' ? Sparkles : pid === 'meteor' ? Flame : Snowflake;
              const shortLabel = pid === 'freeze' ? 'Freeze' : p.name;
              const borderCol =
                pid === 'rally'
                  ? 'border-amber-400/75'
                  : pid === 'meteor'
                  ? 'border-orange-400/75'
                  : 'border-cyan-400/75';
              const barCol =
                pid === 'rally'
                  ? 'bg-amber-400'
                  : pid === 'meteor'
                  ? 'bg-orange-400'
                  : 'bg-cyan-400';

              return (
                <button
                  key={pid}
                  type="button"
                  disabled={!ready}
                  onClick={() => onCastPower(pid)}
                  title={
                    spanishCaptions
                      ? `${p.name}: ${p.desc} (${cur}/${p.charge}) | ${SPANISH_HERO_POWERS[pid].nameEs}: ${SPANISH_HERO_POWERS[pid].descEs}`
                      : `${p.name}: ${p.desc} (${cur}/${p.charge})`
                  }
                  className={`flex h-8 flex-col justify-center rounded-xl border-2 px-1.5 transition-all shadow-md shrink-0 ${
                    ready
                      ? `${borderCol} bg-[#2b1d5e]/96 text-white hover:brightness-115 cursor-pointer ring-2 ring-amber-300/70`
                      : `${borderCol} bg-[#171232]/90 text-slate-200 opacity-90 cursor-not-allowed`
                  }`}
                >
                  <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold leading-none whitespace-nowrap">
                    <Icon
                      className={`h-3 w-3 shrink-0 ${
                        pid === 'rally'
                          ? 'text-amber-300'
                          : pid === 'meteor'
                          ? 'text-orange-300'
                          : 'text-cyan-300'
                      }`}
                    />
                    <span>{shortLabel}</span>
                    <span className="font-tabular text-[10px] text-purple-200/90">
                      {ready ? 'GO!' : `${cur}/${p.charge}`}
                    </span>
                  </div>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-900/90">
                    <div className={`h-full ${barCol} transition-[width]`} style={{ width: `${pct}%` }} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Next Wave Countdown / Send Now Button / Bonus Surge Status */}
          {(() => {
            const nextIsFinal =
              !snap.bonusActive && snap.locksReady && snap.wave + 1 >= level.minWaves;
            const isLastWord = snap.wordsUntilWave === 1;
            if (snap.phase === 'build' || snap.phase === 'between') {
              return (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={onStartWave}
                    title={
                      isLastWord
                        ? 'Your next word guess launches the wave! Build first or click to launch now.'
                        : 'Click to launch the next wave now'
                    }
                    className={`flex h-8 items-center gap-1.5 rounded-xl border-2 px-2.5 font-tabular text-xs font-bold shadow-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      highlightWave
                        ? 'border-amber-300 bg-[#2d1e68] text-white animate-tutorial-pulse'
                        : isLastWord
                        ? 'border-amber-300 bg-[#3a2210]/95 text-amber-100 hover:border-amber-200 hover:bg-[#4c2c13] animate-tutorial-pulse'
                        : snap.bonusActive
                        ? 'border-cyan-400/80 bg-[#122645]/95 text-cyan-100 hover:border-cyan-300 hover:bg-[#19355d]'
                        : nextIsFinal
                        ? 'border-amber-400 bg-[#3a2210]/95 text-amber-100 hover:border-amber-300 hover:bg-[#4c2c13]'
                        : 'border-purple-400/70 bg-[#1c1440]/94 text-purple-100 hover:border-cyan-300 hover:bg-[#261c54]'
                    }`}
                  >
                    <span className="text-[11px] opacity-95">
                      {snap.bonusActive
                        ? `Bonus ${snap.bonusWave + 1}/${snap.bonusTotal} · ${snap.wordsUntilWave}w`
                        : nextIsFinal
                        ? `Final Wave · ${snap.wordsUntilWave}w`
                        : isLastWord
                        ? `Build first! W${snap.wave + 1} · 1w`
                        : `W${snap.wave + 1} · ${snap.wordsUntilWave}w`}
                    </span>
                    <span
                      className={`font-extrabold ${
                        nextIsFinal || isLastWord ? 'text-amber-300' : 'text-cyan-300'
                      }`}
                    >
                      Send now
                    </span>
                  </button>
                  {snap.bonusActive && (
                    <button
                      type="button"
                      onClick={onSealRift}
                      title="Finish level now (your win and stars are already saved)"
                      className="flex h-8 items-center gap-1 rounded-xl border-2 border-emerald-400/75 bg-emerald-950/85 px-2.5 text-xs font-extrabold text-emerald-200 hover:bg-emerald-900/90 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Finish
                    </button>
                  )}
                </div>
              );
            }
            return (
              <div className="flex items-center gap-1 shrink-0">
                <div
                  className={`flex h-8 items-center gap-1.5 rounded-xl border-2 px-2.5 font-tabular text-xs font-bold shadow-md whitespace-nowrap shrink-0 ${
                    snap.bonusActive
                      ? 'border-cyan-400/80 bg-[#122645]/95 text-cyan-100'
                      : snap.finalWave
                      ? 'border-amber-400 bg-[#3a2210]/95 text-amber-200'
                      : 'border-fuchsia-400/75 bg-[#25113d]/94 text-fuchsia-100'
                  }`}
                >
                  <span>
                    {snap.bonusActive
                      ? `Bonus ${snap.bonusWave}/${snap.bonusTotal}`
                      : snap.finalWave
                      ? 'Final Wave'
                      : `Wave ${snap.wave}`}
                  </span>
                  <span className="opacity-60">·</span>
                  <span>{snap.creaturesAlive} left</span>
                </div>
                {snap.bonusActive && (
                  <button
                    type="button"
                    onClick={onSealRift}
                    title="Finish level now (your win and stars are already saved)"
                    className="flex h-8 items-center gap-1 rounded-xl border-2 border-emerald-400/75 bg-emerald-950/85 px-2.5 text-xs font-extrabold text-emerald-200 hover:bg-emerald-900/90 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Finish
                  </button>
                )}
              </div>
            );
          })()}
        </div>

        {/* Right-aligned Utility Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {teacherMode && (
            <div className="flex h-8 items-center gap-1.5 rounded-xl border-2 border-amber-400/85 bg-amber-950/90 px-2 text-[11px] font-bold text-amber-200 shadow-md whitespace-nowrap shrink-0">
              <span>Teacher Mode on</span>
              {onTurnOffTeacherMode && (
                <button
                  type="button"
                  onClick={() => {
                    sound.sfx('tap');
                    onTurnOffTeacherMode();
                  }}
                  className="rounded-md bg-amber-400 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-950 hover:bg-amber-300 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Turn off
                </button>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={onTogglePause}
            aria-label={snap.paused ? 'Resume' : 'Pause'}
            title={snap.paused ? 'Resume (P)' : 'Pause (P)'}
            className={`flex h-8 w-8 items-center justify-center rounded-xl border-2 shadow-md transition-colors cursor-pointer ${
              snap.paused
                ? 'border-cyan-300 bg-cyan-500 text-slate-950'
                : 'border-purple-400/60 bg-[#171232]/92 text-white hover:border-cyan-300'
            }`}
          >
            {snap.paused ? <Play className="h-3.5 w-3.5 fill-current" /> : <Pause className="h-3.5 w-3.5" />}
          </button>

          <button
            type="button"
            onClick={onCycleDifficulty}
            title={`Difficulty: ${DIFFICULTIES[snap.difficulty].label}. ${DIFFICULTIES[snap.difficulty].desc} Click to cycle Easy / Normal / Hard / Expert.`}
            className={`inline-flex h-8 items-center rounded-xl border-2 px-2 text-xs font-extrabold shadow-md transition-colors cursor-pointer whitespace-nowrap ${
              snap.difficulty === 'easy'
                ? 'border-emerald-400/80 bg-emerald-950/85 text-emerald-200 hover:border-emerald-300'
                : snap.difficulty === 'normal'
                ? 'border-cyan-400/70 bg-[#132440]/92 text-cyan-200 hover:border-cyan-300'
                : snap.difficulty === 'hard'
                ? 'border-amber-400/80 bg-amber-950/80 text-amber-200 hover:border-amber-300'
                : 'border-rose-400/85 bg-rose-950/85 text-rose-200 hover:border-rose-300'
            }`}
          >
            {DIFFICULTIES[snap.difficulty].shortLabel}
          </button>

          <button
            type="button"
            onClick={onToggleSpeed}
            title={
              snap.speed === 0.5
                ? 'Battle speed: 0.5x (Half Speed). Click to switch to 1x.'
                : snap.speed === 2
                ? 'Battle speed: 2x (Fast). Click to switch to 0.5x.'
                : 'Battle speed: 1x (Normal). Click to cycle 2x / 0.5x.'
            }
            className={`inline-flex h-8 items-center gap-0.5 rounded-xl border-2 px-2 font-tabular text-xs font-extrabold shadow-md transition-colors cursor-pointer whitespace-nowrap ${
              snap.speed === 2
                ? 'border-amber-200 bg-amber-400 text-slate-950'
                : snap.speed === 0.5
                ? 'border-cyan-200 bg-cyan-400 text-slate-950'
                : 'border-purple-400/60 bg-[#171232]/92 text-amber-200 hover:border-amber-300'
            }`}
          >
            <FastForward className="h-3 w-3" />
            <span>{snap.speed}x</span>
          </button>

          {level.hasWalkthrough && (
            <button
              type="button"
              onClick={onToggleWalkthrough}
              aria-label="Toggle Walkthrough Guide"
              title={walkthrough ? 'Hide Walkthrough' : 'Show Walkthrough Guide'}
              className={`flex h-8 w-8 items-center justify-center rounded-xl border-2 shadow-md transition-colors cursor-pointer ${
                walkthrough
                  ? 'border-amber-300 bg-amber-400/20 text-amber-200'
                  : 'border-purple-400/60 bg-[#171232]/92 text-slate-200 hover:border-amber-300 hover:text-amber-200'
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open Settings"
            title="Settings"
            className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-purple-400/60 bg-[#171232]/92 text-slate-200 hover:border-cyan-300 hover:text-white shadow-md cursor-pointer"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={onExitToTitle}
            aria-label="Stop Game and Return to Title"
            title="Stop game and return to title"
            className="inline-flex h-8 items-center gap-1 rounded-xl border-2 border-rose-400/75 bg-[#2a1228]/95 px-2.5 text-xs font-extrabold text-rose-100 hover:border-rose-300 hover:bg-rose-500/30 hover:text-white shadow-md cursor-pointer whitespace-nowrap"
          >
            <Square className="h-3 w-3 fill-current" />
            <span>Stop</span>
          </button>
        </div>
      </div>

      {/* Interactive Level 1 Walkthrough Banner (slim, voiced, non-blocking) */}
      {walkthrough && (
        <div className="pointer-events-auto absolute left-1/2 top-12 z-20 w-[min(92%,540px)] -translate-x-1/2">
          <div className="flex items-center gap-2.5 rounded-xl border-2 border-amber-300/85 bg-[#191238]/96 px-3 py-2 shadow-2xl">
            <button
              type="button"
              onClick={() =>
                sound.speakNarration(
                  `walkthrough-free-v2-step-${walkthrough.stepNum}`,
                  `${walkthrough.title}. ${walkthrough.body}`
                )
              }
              title="Hear this step"
              aria-label="Hear tutorial step"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-300/60 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25 cursor-pointer"
            >
              <Volume2 className="h-4 w-4" />
            </button>

            <div className="min-w-0 flex-1 leading-snug">
              <div className="flex items-center gap-2 text-[11px] font-extrabold text-amber-300 uppercase tracking-wide">
                <span>
                  Step {walkthrough.stepNum} of {walkthrough.totalSteps}
                </span>
                <span className="text-purple-400" aria-hidden="true">·</span>
                <span className="text-white normal-case tracking-normal truncate">
                  {walkthrough.title}
                </span>
              </div>
              <p className="mt-0.5 text-xs font-medium text-purple-100">{walkthrough.body}</p>
              {spanishCaptions && SPANISH_WALKTHROUGH_STEPS[walkthrough.stepNum - 1] && (() => {
                const esStep = SPANISH_WALKTHROUGH_STEPS[walkthrough.stepNum - 1];
                return (
                  <div className="mt-1 flex items-start gap-1.5 border-t border-amber-300/25 pt-1 text-[11px] font-medium text-cyan-200/95">
                    <button
                      type="button"
                      onClick={() =>
                        sound.speakFallback(`${esStep.titleEs}. ${esStep.bodyEs}`, 'es-MX')
                      }
                      title="Escuchar este paso en español"
                      aria-label="Escuchar este paso en español"
                      className="mt-0.5 text-cyan-300 hover:text-white cursor-pointer shrink-0"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </button>
                    <span>
                      <strong className="text-cyan-100">{esStep.titleEs}:</strong> {esStep.bodyEs}
                    </span>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {walkthrough.canManualNext && (
                <button
                  type="button"
                  onClick={onWalkthroughNext}
                  className="inline-flex items-center gap-0.5 rounded-lg bg-amber-400 px-2.5 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-amber-300 cursor-pointer whitespace-nowrap"
                >
                  <span>{walkthrough.isLast ? 'Finish' : 'Next'}</span>
                  {!walkthrough.isLast && <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              )}
              <button
                type="button"
                onClick={onWalkthroughSkip}
                title="Skip walkthrough"
                className="rounded-lg border border-purple-500/50 bg-[#251c4f] px-2 py-1.5 text-[11px] font-semibold text-purple-200 hover:text-white hover:border-purple-300 cursor-pointer whitespace-nowrap"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fly-In & Dissolve Wave / Level Start Announcement */}
      {waveBanner && (
        <div
          key={waveBanner.id}
          className="pointer-events-none absolute left-1/2 top-[34%] z-30 animate-wave-announce"
        >
          <div
            className={`rounded-2xl border-2 px-8 py-3.5 text-center shadow-[0_12px_40px_rgba(0,0,0,0.65)] ${
              waveBanner.accent === 'magenta'
                ? 'border-fuchsia-300 bg-[#210f3d]/94'
                : waveBanner.accent === 'amber'
                ? 'border-amber-300 bg-[#2b1a0c]/94'
                : 'border-cyan-300 bg-[#12193b]/94'
            }`}
          >
            <div className="font-display text-2xl sm:text-3xl font-extrabold tracking-widest text-white drop-shadow">
              {waveBanner.title}
            </div>
            <div
              className={`mt-1 text-xs sm:text-sm font-bold ${
                waveBanner.accent === 'magenta'
                  ? 'text-fuchsia-200'
                  : waveBanner.accent === 'amber'
                  ? 'text-amber-200'
                  : 'text-cyan-200'
              }`}
            >
              {waveBanner.subtitle}
            </div>
          </div>
        </div>
      )}

      {/* Subtle Toast Banner (hidden when walkthrough or defender popover is open so they never stack) */}
      {toast && !walkthrough && !snap.selectedDef && (
        <div className="pointer-events-auto absolute left-1/2 top-12 z-20 -translate-x-1/2 hidden md:flex max-w-md items-center gap-2 rounded-xl border border-cyan-400/50 bg-[#14102e]/92 px-3 py-1 text-xs font-medium text-cyan-100 shadow-lg">
          <button
            type="button"
            onClick={() => sound.speakNarration('hud-toast', toast)}
            className="text-cyan-300 hover:text-white cursor-pointer shrink-0"
            aria-label="Hear message"
          >
            <Volume2 className="h-3.5 w-3.5" />
          </button>
          <span className="truncate">{toast}</span>
        </div>
      )}

      {/* Paused Banner (Rune Forge stays open!) */}
      {snap.paused && (
        <div className="pointer-events-auto absolute left-1/2 top-28 z-20 flex -translate-x-1/2 items-center gap-4 rounded-xl border-2 border-cyan-400/80 bg-[#151030]/96 px-5 py-2.5 shadow-2xl">
          <span className="text-xs sm:text-sm font-bold text-white">
            Battle paused. The Rune Forge stays open.
          </span>
          <button
            type="button"
            onClick={onTogglePause}
            className="rounded-lg bg-cyan-400 px-3 py-1 text-xs font-extrabold text-slate-950 hover:bg-cyan-300 cursor-pointer whitespace-nowrap"
          >
            Resume
          </button>
        </div>
      )}

      {/* Compact Bottom-Left Bar: Placement Skill Ladder in Basic Training, or Rift Locks in Campaign */}
      {level.isPlacement && placementRun ? (
        <div className="pointer-events-auto absolute bottom-2 left-2 z-20 flex max-w-[calc(100%-16px)] items-center gap-1.5 overflow-x-auto rounded-xl border-2 border-emerald-400/70 bg-[#121a2d]/95 px-2.5 py-1.5 shadow-xl">
          <div className="flex flex-col items-center justify-center gap-0.5 pr-1.5 border-r border-emerald-500/35 text-[9px] font-extrabold tracking-wider text-emerald-200 uppercase shrink-0">
            <Sparkles className="h-3 w-3 text-emerald-300" />
            <span>Tiers</span>
          </div>
          <div className="flex items-center gap-1">
            {PLACEMENT_STAGES.map((st, idx) => {
              const res = placementRun.stageResults[idx];
              const isCurrent = !placementRun.settled && idx === placementRun.stageIdx;
              const isPassed = res?.status === 'passed';
              const isPlacedHere = res?.status === 'placed_here';
              return (
                <div
                  key={st.id}
                  title={`${st.label}${isPassed ? ' (Cleared)' : isPlacedHere ? ' (Starting skill)' : isCurrent ? ` (Testing: ${placementRun.wordIdx}/${st.probeWords.length})` : ''}`}
                  className={`flex items-center gap-1 rounded-lg border px-1.5 py-1 text-[10px] font-bold whitespace-nowrap transition-colors ${
                    isPassed
                      ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-100'
                      : isPlacedHere
                      ? 'border-amber-400/80 bg-amber-500/20 text-amber-100'
                      : isCurrent
                      ? 'border-cyan-300 bg-cyan-500/25 text-white shadow-[0_0_10px_rgba(56,224,255,0.35)]'
                      : 'border-slate-700/80 bg-[#0d1222]/85 text-slate-400'
                  }`}
                >
                  {isPassed && <Check className="h-2.5 w-2.5 text-emerald-300 shrink-0" />}
                  <span>{st.shortLabel}</span>
                  {isCurrent && (
                    <span className="font-tabular text-cyan-200">
                      {placementRun.wordIdx}/{st.probeWords.length}
                    </span>
                  )}
                  {isPlacedHere && <span className="text-amber-300">Start</span>}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          className={`pointer-events-auto absolute bottom-2 left-2 z-20 flex items-center gap-2 rounded-xl border-2 bg-[#161030]/94 px-2.5 py-1.5 shadow-xl transition-all ${
            lockBonusFlash
              ? 'border-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.55)]'
              : highlightLocks
              ? 'border-amber-300 animate-tutorial-pulse'
              : 'border-purple-500/75'
          }`}
        >
          {lockBonusFlash && (
            <div className="pointer-events-none absolute -top-8 left-2 flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-400 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-950 shadow-[0_0_18px_rgba(251,191,36,0.75)] animate-bounce">
              <Gem className="h-3.5 w-3.5 text-slate-950 fill-cyan-300" />
              <span>Lock Sealed! +{lockBonusFlash.amount} Crystals</span>
            </div>
          )}
          {teacherMode ? (
            <button
              type="button"
              onClick={() => onClearLocks()}
              title={`Seal each Rift Lock for +${FORGE_CONFIG.lockBonus} bonus crystals. Click to clear all Level ${level.num} Rift Locks.`}
              className="flex flex-col items-center justify-center gap-0.5 pr-1.5 border-r border-purple-500/40 text-[9px] font-extrabold tracking-wider text-purple-200 uppercase hover:text-rose-200 cursor-pointer transition-colors shrink-0"
            >
              <Lock className="h-3 w-3 text-cyan-300" />
              <span>Locks</span>
            </button>
          ) : (
            <div
              title={`Seal each Rift Lock for +${FORGE_CONFIG.lockBonus} bonus crystals.`}
              className="flex flex-col items-center justify-center gap-0.5 pr-1.5 border-r border-purple-500/40 text-[9px] font-extrabold tracking-wider text-purple-200 uppercase shrink-0"
            >
              <Lock className="h-3 w-3 text-cyan-300" />
              <span>Locks</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            {locks.map((lk, idx) => {
              const st = getLockStyle(lk.vowel, idx);
              const fillCount = lk.done ? lk.need : Math.min(lk.need, lk.recentCorrect);
              const shortTag = getPatternRule(lk.vowel).shortLabel || lk.vowel;
              const justSealed = Boolean(lockBonusFlash?.patterns.includes(lk.vowel));
              const statusContent = (
                <>
                  <div className="flex items-center gap-0.5 font-tabular text-[10px] font-extrabold leading-none text-slate-200 group-hover:text-rose-200">
                    {lk.done ? (
                      <>
                        <Lock className={`h-2.5 w-2.5 ${st.icon} group-hover:text-rose-300`} />
                        <span className={st.icon}>Done</span>
                      </>
                    ) : (
                      <span>
                        {fillCount}/{lk.need}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-[2px]">
                    {Array.from({ length: lk.need }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 ${lk.need > 6 ? 'w-1' : 'w-1.5'} rounded-[1px] border ${
                          i < fillCount ? st.filled : 'border-purple-700/80 bg-[#0d0920]'
                        }`}
                      />
                    ))}
                  </div>
                </>
              );
              return (
                <div
                  key={lk.vowel}
                  className={`flex items-center gap-1 rounded-lg border px-1.5 py-1 transition-all ${
                    justSealed
                      ? 'border-amber-300 bg-amber-400/20 shadow-[0_0_14px_rgba(251,191,36,0.55)]'
                      : 'border-purple-500/35 bg-[#0e0a22]/85'
                  }`}
                >
                  {/* Tappable pattern label to hear the phoneme */}
                  <button
                    type="button"
                    onClick={() => sound.speakPhoneme(shortTag)}
                    title={`Tap to hear ${lk.label}`}
                    className={`flex h-5 min-w-5 px-1 text-[11px] items-center justify-center rounded-md border font-reading font-extrabold transition-colors cursor-pointer ${st.btn}`}
                  >
                    {shortTag}
                  </button>

                  {/* Status + compact horizontal pip bar (clickable to clear in Teacher Mode only) */}
                  {teacherMode ? (
                    <button
                      type="button"
                      onClick={() => onClearLocks(lk.vowel)}
                      title={
                        lk.done
                          ? `${lk.label} locked (+${FORGE_CONFIG.lockBonus} crystals awarded)! Click to clear only this lock on Level ${level.num}`
                          : `${lk.label}: ${fillCount}/${lk.need} (+${FORGE_CONFIG.lockBonus} crystals when locked). Click to clear on Level ${level.num}`
                      }
                      className="group flex flex-col items-start gap-0.5 rounded px-0.5 hover:bg-rose-500/20 cursor-pointer transition-colors"
                    >
                      {statusContent}
                    </button>
                  ) : (
                    <div
                      title={
                        lk.done
                          ? `${lk.label} locked (+${FORGE_CONFIG.lockBonus} crystals awarded)`
                          : `${lk.label}: ${fillCount}/${lk.need} (+${FORGE_CONFIG.lockBonus} crystals when locked)`
                      }
                      className="flex flex-col items-start gap-0.5 rounded px-0.5"
                    >
                      {statusContent}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Testing utility: one-click Clear Level Locks reset (Teacher Mode only) */}
          {teacherMode && (
            <button
              type="button"
              onClick={() => onClearLocks()}
              title={`Reset only Level ${level.num} Rift Locks to 0`}
              className="inline-flex h-7 items-center justify-center gap-1 rounded-lg border border-rose-400/55 bg-rose-950/55 px-2 text-[10px] font-bold text-rose-200 hover:border-rose-300 hover:bg-rose-500/25 hover:text-white cursor-pointer shrink-0"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      )}

      {/* Placed Defender Upgrade / Specialty / Sell Popover (kept safely inside battlefield viewport) */}
      {snap.selectedDef && selectedDefCfg && (() => {
        const isSpecialtyPicker = snap.selectedDef.level === 3 && !snap.selectedDef.spec;
        const placeBelow = snap.selectedDef.screenY < 290;
        const sideRight = snap.selectedDef.screenX < 380;
        const popoverStyle: React.CSSProperties = isSpecialtyPicker
          ? {
              left: `clamp(152px, ${Math.round(
                snap.selectedDef.screenX + (sideRight ? 175 : -175)
              )}px, calc(100% - 152px))`,
              top: '50%',
            }
          : {
              left: `clamp(142px, ${Math.round(snap.selectedDef.screenX)}px, calc(100% - 142px))`,
              top: placeBelow
                ? `clamp(52px, ${Math.round(snap.selectedDef.screenY + 26)}px, calc(100% - 255px))`
                : `clamp(255px, ${Math.round(snap.selectedDef.screenY - 22)}px, calc(100% - 14px))`,
            };
        return (
          <div
            style={popoverStyle}
            className={`pointer-events-auto absolute z-40 ${
              isSpecialtyPicker ? 'w-72 -translate-y-1/2 max-h-[calc(100%-84px)]' : 'w-64 max-h-[calc(100%-64px)]'
            } -translate-x-1/2 ${
              !isSpecialtyPicker && !placeBelow ? '-translate-y-full' : ''
            } overflow-y-auto rounded-2xl border-2 border-cyan-400/85 bg-[#151030]/98 p-2.5 shadow-2xl text-slate-100`}
          >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-extrabold text-white">
                {snap.selectedDef.spec
                  ? selectedDefCfg.spec[snap.selectedDef.spec].name
                  : selectedDefCfg.name}
              </div>
              <div className="text-xs font-semibold text-cyan-300">
                {snap.selectedDef.spec ? 'Specialty Mastered' : `Level ${snap.selectedDef.level} of 3`}
              </div>
              {spanishCaptions && (() => {
                const esDef = SPANISH_DEFENDERS[snap.selectedDef.type];
                const esTitle = snap.selectedDef.spec
                  ? esDef.spec[snap.selectedDef.spec].nameEs
                  : esDef.nameEs;
                const esDesc = snap.selectedDef.spec
                  ? esDef.spec[snap.selectedDef.spec].descEs
                  : esDef.descEs;
                return (
                  <div className="mt-0.5 text-[10px] leading-snug text-cyan-200/90">
                    <span className="font-bold text-cyan-100">{esTitle}:</span> {esDesc}
                  </div>
                );
              })()}
            </div>
            <button
              type="button"
              onClick={onClosePopup}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {['archer', 'ember', 'tesla', 'rail'].includes(snap.selectedDef.type) && (
            <div className="mt-2 rounded-xl border border-cyan-500/30 bg-slate-950/70 p-1.5">
              <div className="mb-1 flex items-center justify-between px-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                <span className="inline-flex items-center gap-1 text-cyan-200">
                  <Crosshair className="h-3 w-3 text-cyan-400" />
                  Target
                </span>
                {spanishCaptions && (
                  <span className="font-semibold normal-case tracking-normal text-cyan-300/90">
                    Objetivo
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1">
                {TARGET_PRIORITY_OPTIONS.map((opt) => {
                  const active = snap.selectedDef!.targetMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onSetTargetMode(opt.id)}
                      className={`rounded-lg px-1.5 py-1 text-center text-[11px] font-extrabold transition-colors cursor-pointer ${
                        active
                          ? 'bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(56,224,255,0.45)]'
                          : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div>{opt.label}</div>
                      {spanishCaptions && (
                        <div
                          className={`text-[9px] font-semibold leading-tight ${
                            active ? 'text-slate-900/85' : 'text-cyan-300/80'
                          }`}
                        >
                          {opt.labelEs}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-2 space-y-1.5">
            {nextUpCost !== null && (
              <button
                type="button"
                disabled={snap.crystals < nextUpCost}
                onClick={() => onUpgrade()}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-extrabold transition-colors ${
                  snap.crystals >= nextUpCost
                    ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Upgrade to Lv {snap.selectedDef.level + 1}
                </span>
                <span className="font-tabular">{nextUpCost}</span>
              </button>
            )}

            {isSpecialtyPicker && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-amber-300">Pick a specialty:</div>
                {(['a', 'b'] as const).map((spKey) => {
                  const sp = selectedDefCfg.spec[spKey];
                  const afford = snap.crystals >= sp.cost;
                  return (
                    <button
                      key={spKey}
                      type="button"
                      disabled={!afford}
                      onClick={() => onUpgrade(spKey)}
                      className={`w-full rounded-xl border p-2 text-left transition-colors ${
                        afford
                          ? 'border-amber-400/70 bg-amber-500/15 hover:bg-amber-500/25 cursor-pointer'
                          : 'border-slate-800 bg-slate-900/60 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-white">
                        <span>{sp.name}</span>
                        <span className="font-tabular text-amber-300">{sp.cost}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-300 leading-snug">{sp.desc}</p>
                      {spanishCaptions && (
                        <p className="mt-0.5 text-[10px] text-cyan-200/90 leading-snug">
                          <span className="font-semibold text-cyan-100">
                            {SPANISH_DEFENDERS[snap.selectedDef!.type].spec[spKey].nameEs}:
                          </span>{' '}
                          {SPANISH_DEFENDERS[snap.selectedDef!.type].spec[spKey].descEs}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={onSell}
              className="flex w-full items-center justify-between rounded-xl border border-rose-500/50 bg-rose-500/12 px-3 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-500/22 cursor-pointer"
            >
              <span className="inline-flex items-center gap-1.5">
                <Trash2 className="h-3.5 w-3.5" />
                Sell Defender
              </span>
              <span className="font-tabular">+{Math.round(snap.selectedDef.spent * 0.7)}</span>
            </button>
          </div>
        </div>
        );
      })()}

      {/* Victory Milestone Choice Overlay (Banked win + optional +3 Bonus Surge Waves) */}
      {snap.phase === 'milestone' && (
        <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-[#070a14]/75 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl border-2 border-cyan-400/80 bg-[#120d26]/98 p-6 text-center shadow-[0_24px_64px_rgba(0,0,0,0.85)]">
            <div className="flex items-center justify-center gap-1.5">
              {[1, 2, 3].map((n) => (
                <Star
                  key={n}
                  className={`h-7 w-7 ${
                    n <= snap.milestoneStars
                      ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                      : 'text-slate-700'
                  }`}
                />
              ))}
            </div>

            <div className="mt-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
              Level {level.num}: {level.name}
            </div>
            <h2 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-white">
              Rift Sealed!
            </h2>
            <p className="mt-2 font-reading text-sm text-slate-200 leading-relaxed">
              Your win and stars are locked in. Seal the Rift to finish now, or test your towers
              against {snap.bonusTotal} tougher bonus waves for extra reading practice.
            </p>
            {spanishCaptions && (
              <p className="mt-1.5 font-reading text-xs text-cyan-200/95 leading-relaxed">
                Tu victoria y tus estrellas ya están guardadas. Sella la grieta para terminar o
                prueba {snap.bonusTotal} oleadas extra para seguir practicando.
              </p>
            )}

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onSealRift}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-extrabold text-slate-950 hover:bg-cyan-300 transition-colors cursor-pointer"
              >
                <Shield className="h-4 w-4" />
                Seal the Rift & Finish Level
              </button>

              {snap.bonusTotal > 0 && (
                <button
                  type="button"
                  onClick={onStartBonusSurge}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-amber-400/75 bg-amber-500/15 px-4 py-2.5 text-sm font-extrabold text-amber-200 hover:bg-amber-500/25 hover:text-white transition-colors cursor-pointer"
                >
                  <Flame className="h-4 w-4 text-amber-300" />
                  Bonus Surge: Survive +{snap.bonusTotal} Waves
                </button>
              )}
            </div>

            {snap.bonusTotal > 0 && (
              <p className="mt-3 text-[11px] text-slate-400">
                Your victory and stars stay saved even if the Anchor falls during Bonus Surge.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
