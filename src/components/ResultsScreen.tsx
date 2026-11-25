import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ClipboardCopy,
  Film,
  Gauge,
  Languages,
  RotateCcw,
  Settings,
  Shield,
  Star,
  Volume2,
} from 'lucide-react';
import { LevelConfig, LEVELS } from '../data/level1';
import { sound } from '../lib/audio';
import { assetUrl } from '../lib/assetUrl';
import {
  buildAccommodationSnapshot,
  computeThenAndNow,
  formatBattleTeacherNote,
  PatternLockStatus,
  StoredProgress,
} from '../lib/metrics';
import { speech } from '../lib/speech';
import { ForgeStats } from './RuneForgePanel';

export interface BattleEndData {
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
}

interface ResultsScreenProps {
  level: LevelConfig;
  result: BattleEndData;
  forgeStats: ForgeStats;
  progress: StoredProgress;
  locks: PatternLockStatus[];
  showHalfSpeedTip?: boolean;
  onDismissHalfSpeedTip?: () => void;
  onOpenSettings?: () => void;
  onNextLevel?: () => void;
  onPlayAgain: () => void;
  onReplayCutscene: () => void;
  onReturnTitle: () => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  level,
  result,
  forgeStats,
  progress,
  locks,
  showHalfSpeedTip = false,
  onDismissHalfSpeedTip,
  onOpenSettings,
  onNextLevel,
  onPlayAgain,
  onReplayCutscene,
  onReturnTitle,
}) => {
  const [copiedNote, setCopiedNote] = useState(false);
  const firstTryPct =
    forgeStats.forged > 0 ? Math.round((forgeStats.firstTry / forgeStats.forged) * 100) : 0;
  const growth = computeThenAndNow(progress, level.vowels);
  const nextLevel =
    level.nextLevelId && !LEVELS[level.nextLevelId]?.comingSoon
      ? LEVELS[level.nextLevelId]
      : null;
  const victoryImg =
    level.cutscenes.victory.beats[0]?.image ||
    '/src/assets/images/cutscene_victory_seal_1795457393110.jpg';

  const snapshot = useMemo(
    () =>
      buildAccommodationSnapshot(
        progress.settings,
        speech.getAllVoiceProfiles(),
        speech.getAllWordVoiceOverrides(),
        {
          slowBlendUsed: forgeStats.slowBlendUsed,
          meaningTapped: forgeStats.meaningTapped,
          voiceFitMatches: forgeStats.voiceFitMatches,
          helpUsed: forgeStats.help,
        }
      ),
    [progress.settings, forgeStats]
  );

  const hasAnyAccommodation =
    snapshot.ellSupports.length > 0 ||
    snapshot.readingSupports.length > 0 ||
    snapshot.voiceAdaptations.length > 0;

  const usageSummaryParts: string[] = [];
  if ((snapshot.helpUsed ?? 0) > 0) usageSummaryParts.push(`Audio help: ${snapshot.helpUsed}`);
  if ((snapshot.slowBlendUsed ?? 0) > 0) {
    usageSummaryParts.push(`Slow Blend: ${snapshot.slowBlendUsed}`);
  }
  if ((snapshot.meaningTapped ?? 0) > 0) {
    usageSummaryParts.push(`Spanish meanings: ${snapshot.meaningTapped}`);
  }
  if ((snapshot.voiceFitMatches ?? 0) > 0) {
    usageSummaryParts.push(`Voice-fit matches: ${snapshot.voiceFitMatches}`);
  }

  const handleCopyTeacherNote = async () => {
    const text = formatBattleTeacherNote({
      worldName: level.worldName,
      levelNum: level.num,
      levelName: level.name,
      win: result.win,
      stars: result.stars,
      waves: result.waves,
      forged: forgeStats.forged,
      firstTry: forgeStats.firstTry,
      runes: forgeStats.runes,
      runeFirst: forgeStats.runeFirst,
      practice: forgeStats.practice,
      locks,
      snapshot,
    });
    sound.sfx('tap');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedNote(true);
    window.setTimeout(() => setCopiedNote(false), 2400);
  };

  return (
    <div className="fixed inset-0 flex h-[100dvh] w-full items-start md:items-center justify-center overflow-y-auto bg-[#070a13] p-4 md:p-6 text-slate-100">
      {/* Subtle atmospheric backdrop */}
      <div className="pointer-events-none fixed inset-0">
        <img
          src={assetUrl(result.win ? victoryImg : '/src/assets/images/cutscene_defeat_breach_1795457392970.jpg')}
          alt={result.win ? `Rift sealed at ${level.name}` : 'Rift Warden defending the line'}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover opacity-28"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070a13] via-[#070a13]/85 to-[#070a13]/75" />
      </div>

      <div className="relative z-10 w-full max-w-3xl rounded-2xl border border-slate-700/80 bg-[#0d1425]/96 p-7 md:p-9 shadow-2xl">
        {/* Header & Stars */}
        <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="text-xs font-medium text-cyan-300">
              {level.worldName} · Level {level.num}: {level.name}
            </div>
            <h1 className="mt-1.5 font-display text-3xl md:text-4xl font-bold text-white">
              {result.win ? `${level.name} Sealed!` : 'The Anchor Fell'}
            </h1>
            <p className="mt-2 font-reading text-sm md:text-base text-slate-300">
              {result.win
                ? `You held the line at ${level.name}. Your reading powered every defender.`
                : 'Every rune you read made the line stronger. Ready to jump back in?'}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((n) => (
              <Star
                key={n}
                className={`h-8 w-8 ${
                  n <= result.stars ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Core Battle & Reading Stats */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-4">
            <div className="text-xs text-slate-400">Words Forged</div>
            <div className="mt-1 font-tabular text-2xl font-bold text-white">
              {forgeStats.forged}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-4">
            <div className="text-xs text-slate-400">First-Try Accuracy</div>
            <div className="mt-1 font-tabular text-2xl font-bold text-cyan-300">
              {firstTryPct}%
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-4">
            <div className="text-xs text-slate-400">Waves Cleared</div>
            <div className="mt-1 font-tabular text-2xl font-bold text-purple-200">
              {result.waves}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-4">
            <div className="text-xs text-slate-400">Anchor HP</div>
            <div className="mt-1 font-tabular text-2xl font-bold text-emerald-300">
              {result.anchor}/{level.anchor}
            </div>
          </div>
        </div>

        {/* Optional Bonus Surge Summary */}
        {result.win &&
          result.bonusTotal &&
          result.bonusTotal > 0 &&
          ((result.bonusWavesCleared ?? 0) > 0 || result.bonusAnchorFell) && (
            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
                result.bonusCompleted
                  ? 'border-amber-400/60 bg-amber-500/12 text-amber-200'
                  : 'border-cyan-400/45 bg-cyan-500/10 text-cyan-200'
              }`}
            >
              {result.bonusCompleted
                ? `Bonus Surge Mastered: Survived all ${result.bonusTotal} extra waves!`
                : `Bonus Surge: Cleared ${result.bonusWavesCleared ?? 0} of ${result.bonusTotal} extra waves. Your level win and stars stayed locked in!`}
            </div>
          )}

        {/* Then and Now Growth Box */}
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-cyan-300">Then and Now Growth</h2>
            <button
              type="button"
              onClick={() => sound.speakNarration('results-growth', growth.headline)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white cursor-pointer"
            >
              <Volume2 className="h-3.5 w-3.5 text-cyan-300" />
              Hear summary
            </button>
          </div>
          <p className="mt-1.5 font-reading text-base font-semibold text-white">
            {growth.headline}
          </p>

          <div className="mt-4 space-y-2.5">
            {growth.rows.map((row) => {
              const lk = locks.find((l) => l.vowel === row.vowel);
              return (
                <div
                  key={row.vowel}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm border-t border-slate-800/80 pt-2.5"
                >
                  <span className="font-semibold text-slate-100">{row.label}</span>
                  <div className="flex items-center gap-4 font-tabular text-xs text-slate-300">
                    {row.thenPct !== null ? (
                      <>
                        <span>Then: {row.thenPct}%</span>
                        <span className="text-cyan-300 font-bold">Now: {row.nowPct}%</span>
                      </>
                    ) : (
                      <span>Now: {row.nowPct}% (New this level)</span>
                    )}
                    {lk && (
                      <span className={lk.done ? 'text-emerald-300 font-bold' : 'text-slate-400'}>
                        Lock: {lk.recentCorrect}/{lk.need}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Teacher & IEP/ELL Accommodation Snapshot */}
        <div className="mt-5 rounded-xl border border-emerald-500/35 bg-emerald-950/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-200">
              <Languages className="h-4 w-4 text-emerald-300 shrink-0" />
              <span>Accommodation Snapshot (Teacher / IEP Note)</span>
            </div>
            <button
              type="button"
              onClick={handleCopyTeacherNote}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                copiedNote
                  ? 'border-emerald-300 bg-emerald-400 text-slate-950'
                  : 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25 hover:text-white'
              }`}
            >
              {copiedNote ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Copied Note</span>
                </>
              ) : (
                <>
                  <ClipboardCopy className="h-3.5 w-3.5" />
                  <span>Copy Teacher Note</span>
                </>
              )}
            </button>
          </div>

          {hasAnyAccommodation ? (
            <div className="mt-2.5 space-y-1.5 text-xs text-slate-200">
              {snapshot.ellSupports.length > 0 && (
                <div>
                  <span className="font-semibold text-emerald-300">ELL supports: </span>
                  <span>{snapshot.ellSupports.join(', ')}</span>
                </div>
              )}
              {snapshot.readingSupports.length > 0 && (
                <div>
                  <span className="font-semibold text-cyan-300">Reading &amp; display: </span>
                  <span>{snapshot.readingSupports.join(', ')}</span>
                </div>
              )}
              {snapshot.voiceAdaptations.length > 0 && (
                <div>
                  <span className="font-semibold text-amber-300">Voice adaptations: </span>
                  <span>{snapshot.voiceAdaptations.join('; ')}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-300">
              Standard settings were used for this battle (no ELL or display accommodations active).
            </p>
          )}

          {usageSummaryParts.length > 0 && (
            <div className="mt-2 pt-2 border-t border-emerald-500/20 font-tabular text-[11px] text-cyan-200/90">
              Used in battle: {usageSummaryParts.join(' · ')}
            </div>
          )}
        </div>

        {/* Practice Words (every word tappable to hear) */}
        {forgeStats.practice.length > 0 && (
          <div className="mt-5">
            <div className="text-xs font-semibold text-slate-400 mb-2">
              Words to practice (tap any word to hear it)
            </div>
            <div className="flex flex-wrap gap-2">
              {forgeStats.practice.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => sound.speakWord(w)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-reading text-base font-bold text-white hover:border-cyan-400 cursor-pointer"
                >
                  <Volume2 className="h-3.5 w-3.5 text-cyan-300" />
                  <span>{w}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Unlock Preview on Win */}
        {result.win && (
          <div className="mt-5 rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-amber-300">Unlocked Next</div>
              <div className="mt-0.5 font-reading text-sm font-bold text-white">
                {level.rewardSummary}
              </div>
            </div>
            <Shield className="h-6 w-6 text-amber-300 shrink-0" />
          </div>
        )}

        {/* One-time Half Speed tip after 2 losses (shown once ever, never repeated) */}
        {!result.win && showHalfSpeedTip && (
          <div className="mt-5 rounded-xl border border-cyan-400/50 bg-cyan-950/35 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <Gauge className="mt-0.5 h-5 w-5 text-cyan-300 shrink-0" />
              <div className="text-sm text-slate-200 leading-snug">
                <div className="font-bold text-cyan-200">Need a little more time to read?</div>
                <p className="mt-0.5 text-xs sm:text-sm text-slate-300">
                  You can turn battle speed down to 0.5x (Half Speed) in Settings (Focus Mode), or tap the speed button during battle.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={() => {
                    onDismissHalfSpeedTip?.();
                    onOpenSettings();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-cyan-300 cursor-pointer whitespace-nowrap"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Open Settings</span>
                </button>
              )}
              {onDismissHalfSpeedTip && (
                <button
                  type="button"
                  onClick={onDismissHalfSpeedTip}
                  className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-400 hover:text-white cursor-pointer whitespace-nowrap"
                >
                  Got it
                </button>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-slate-800">
          <div className="flex flex-wrap items-center gap-3">
            {result.win && nextLevel && onNextLevel && (
              <button
                type="button"
                onClick={onNextLevel}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-sm font-extrabold text-slate-950 hover:bg-amber-300 transition-colors cursor-pointer whitespace-nowrap shadow-lg"
              >
                <span>
                  {nextLevel.worldId !== level.worldId
                    ? `Continue to ${nextLevel.worldName}, Level ${nextLevel.num}: ${nextLevel.name}`
                    : `Continue to Level ${nextLevel.num}: ${nextLevel.name}`}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onPlayAgain}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-colors cursor-pointer whitespace-nowrap ${
                result.win && nextLevel && onNextLevel
                  ? 'border border-slate-600 bg-slate-900 text-slate-100 hover:border-cyan-400'
                  : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
              }`}
            >
              <RotateCcw className="h-4 w-4" />
              {result.win ? `Play Level ${level.num} Again` : 'Try Again'}
            </button>

            <button
              type="button"
              onClick={onReplayCutscene}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 hover:border-cyan-400 cursor-pointer whitespace-nowrap"
            >
              <Film className="h-4 w-4 text-cyan-300" />
              Replay {result.win ? 'Victory' : 'Defeat'} Cutscene
            </button>
          </div>

          <button
            type="button"
            onClick={onReturnTitle}
            className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-300 hover:border-slate-500 hover:text-white cursor-pointer whitespace-nowrap"
          >
            Back to Title
          </button>
        </div>
      </div>
    </div>
  );
};
