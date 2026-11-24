import React from 'react';
import { Film, Lock, Play, Settings, Shield, Star, Volume2 } from 'lucide-react';
import {
  CutsceneId,
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  DifficultyId,
  LevelConfig,
  LevelId,
  LEVELS,
  PatternKey,
  WORLD_ORDER,
  WORLDS,
} from '../data/level1';
import { sound } from '../lib/audio';
import { PatternLockStatus, StoredProgress } from '../lib/metrics';

interface TitleScreenProps {
  activeLevel: LevelConfig;
  progress: StoredProgress;
  locks: PatternLockStatus[];
  azureStatus: 'checking' | 'azure' | 'chrome' | 'off';
  onSelectLevel: (id: LevelId) => void;
  onChangeDifficulty: (diff: DifficultyId) => void;
  onStartWithCutscene: () => void;
  onStartDirect: () => void;
  onOpenCutscene: (id: CutsceneId) => void;
  onOpenSettings: () => void;
  onClearLocks: (pattern?: PatternKey) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  activeLevel,
  progress,
  locks,
  azureStatus,
  onSelectLevel,
  onChangeDifficulty,
  onStartWithCutscene,
  onStartDirect,
  onOpenCutscene,
  onOpenSettings,
  onClearLocks,
}) => {
  const activeDiff = DIFFICULTIES[progress.settings.difficulty] || DIFFICULTIES.normal;
  const activeBestStars = progress.levelStars?.[activeLevel.id] ?? (activeLevel.id === 'w1-l1' ? progress.bestStars : 0);
  const activeWorld = WORLDS[activeLevel.worldId] || WORLDS.w1;
  const worldLevelIds = activeWorld.levelIds;
  const isWorld2 = activeWorld.id === 'w2';
  const playableWorldLevelId =
    worldLevelIds.find((id) => !LEVELS[id]?.comingSoon) || worldLevelIds[0];

  return (
    <div className="fixed inset-0 flex h-[100dvh] w-full flex-col justify-between overflow-y-auto bg-[#070a13] text-slate-100 select-none">
      {/* Full-bleed illustrated level backdrop */}
      <div className="pointer-events-none fixed inset-0">
        <img
          key={activeLevel.backdropImage}
          src={activeLevel.backdropImage}
          alt={`${activeLevel.name} battlefield illustration`}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-center opacity-55 transition-opacity duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070a13] via-[#070a13]/82 to-[#070a13]/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070a13] via-transparent to-[#070a13]/70" />
      </div>

      {/* Clean 3-Zone Top Bar */}
      <header className="relative z-10 flex items-center justify-between gap-4 px-6 py-3.5 border-b border-white/10 shrink-0">
        <span className="font-display text-lg font-bold tracking-wider text-white whitespace-nowrap shrink-0">
          Rift Runners
        </span>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            type="button"
            onClick={() => onOpenCutscene('opening')}
            className="hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Opening Scene
          </button>
          <button
            type="button"
            onClick={() => onOpenCutscene('victory')}
            className="hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Victory Scene
          </button>
          <button
            type="button"
            onClick={() => onOpenCutscene('defeat')}
            className="hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Defeat Scene
          </button>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              sound.sfx('tap');
              onOpenSettings();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-400/70 bg-purple-950/75 px-3 py-2 text-xs font-semibold text-purple-100 hover:border-cyan-400 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Volume2 className="h-3.5 w-3.5 text-cyan-300" />
            Voice: {progress.settings.wardenVoice}
          </button>
          <button
            type="button"
            onClick={() => {
              sound.sfx('tap');
              onOpenSettings();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600/80 bg-slate-900/90 px-3 py-2 text-xs font-semibold text-slate-100 hover:border-cyan-400 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </button>
        </div>
      </header>

      {/* Hero Center Content */}
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-8 py-6">
        <div className="w-full max-w-4xl">
          {/* World Switcher (appears automatically when World 2+ are added) & 5-Node Interactive Trail Map */}
          <div className="mb-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-300 mb-2.5">
              {WORLD_ORDER.length > 1 ? (
                <div className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-950/75 p-0.5">
                  {WORLD_ORDER.map((wid) => {
                    const w = WORLDS[wid];
                    const isCurrent = w.id === activeWorld.id;
                    return (
                      <button
                        key={wid}
                        type="button"
                        onClick={() => {
                          sound.sfx('tap');
                          onSelectLevel(w.levelIds[0]);
                        }}
                        className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                          isCurrent
                            ? wid === 'w2'
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-cyan-400 text-slate-950'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {w.name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <span className="text-cyan-300 uppercase tracking-wider">{activeWorld.name}</span>
              )}
              <span className="font-tabular text-slate-400">
                {worldLevelIds.reduce(
                  (acc, id) =>
                    acc + (progress.levelStars?.[id] ?? (id === 'w1-l1' ? progress.bestStars : 0)),
                  0
                )}{' '}
                / {worldLevelIds.length * 3} Stars
              </span>
            </div>

            <div className="relative grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div
                aria-hidden="true"
                className={`pointer-events-none hidden sm:block absolute left-8 right-8 top-5 h-0.5 ${
                  isWorld2 ? 'bg-amber-500/40' : 'bg-slate-700/80'
                }`}
              />
              {worldLevelIds.map((id) => {
                const lv = LEVELS[id];
                const selected = lv.id === activeLevel.id;
                const isUpcoming = Boolean(lv.comingSoon);
                const lvStars =
                  progress.levelStars?.[lv.id] ?? (lv.id === 'w1-l1' ? progress.bestStars : 0);
                const shortSkill = isUpcoming
                  ? lv.num === 5
                    ? 'Boss · Next'
                    : `${lv.vowels.slice(0, 3).join(' · ')} · Next`
                  : lv.num === 5
                  ? `Boss · ${lv.vowels.length > 3 ? `All ${lv.vowels.length}` : lv.vowels.join(' · ')}`
                  : lv.vowels.length >= 5
                  ? `All ${lv.vowels.length}`
                  : lv.vowels.join(' · ');

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      sound.sfx('tap');
                      onSelectLevel(id);
                    }}
                    className={`relative z-10 flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer ${
                      selected
                        ? isWorld2
                          ? 'border-amber-300 bg-[#2d1812]/95 text-white shadow-[0_0_20px_rgba(251,146,60,0.26)]'
                          : 'border-cyan-300 bg-[#122645]/95 text-white shadow-[0_0_20px_rgba(56,224,255,0.22)]'
                        : isUpcoming
                        ? 'border-slate-700/65 bg-[#0b0f1b]/78 text-slate-300 hover:border-amber-400/50 hover:bg-[#1a1314]/88'
                        : 'border-slate-700/85 bg-[#0b1122]/88 text-slate-200 hover:border-cyan-400/60 hover:bg-[#111932]/92'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between gap-1.5">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full font-tabular text-[11px] font-extrabold ${
                          selected
                            ? isWorld2
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-cyan-400 text-slate-950'
                            : lvStars > 0
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {lv.num}
                      </span>
                      {isUpcoming ? (
                        <span className="text-[10px] font-semibold text-amber-300/85">Preview</span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5">
                          {[1, 2, 3].map((n) => (
                            <Star
                              key={n}
                              className={`h-3 w-3 ${
                                n <= lvStars
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-700'
                              }`}
                            />
                          ))}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 text-xs font-bold leading-tight truncate w-full">
                      {lv.name}
                    </div>
                    <div
                      className={`mt-0.5 text-[11px] font-medium truncate w-full ${
                        selected
                          ? isWorld2
                            ? 'text-amber-300'
                            : 'text-cyan-300'
                          : 'text-slate-400'
                      }`}
                    >
                      {shortSkill}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-cyan-300">
            <span>{activeLevel.worldName}</span>
            <span className="text-slate-500" aria-hidden="true">·</span>
            <span>
              Level {activeLevel.num}: {activeLevel.name}
            </span>
            <span className="text-slate-500" aria-hidden="true">·</span>
            <span>{activeLevel.wordsSummary}</span>
          </div>

          <h1
            className="mt-2.5 font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.08]"
            style={{ textWrap: 'balance' }}
          >
            {activeLevel.headline}
          </h1>

          <p className="mt-4 max-w-xl font-reading text-base md:text-lg text-slate-300 leading-relaxed">
            {activeLevel.description}
          </p>

          {/* Battle Difficulty Selector */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Difficulty
            </span>
            <div className="inline-flex items-center gap-1 rounded-xl border border-slate-700/85 bg-[#0b1122]/92 p-1">
              {DIFFICULTY_ORDER.map((diffId) => {
                const d = DIFFICULTIES[diffId];
                const isSelected = activeDiff.id === diffId;
                const activeTone =
                  diffId === 'easy'
                    ? 'bg-emerald-400 text-slate-950'
                    : diffId === 'normal'
                    ? 'bg-cyan-400 text-slate-950'
                    : diffId === 'hard'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-rose-400 text-slate-950';
                return (
                  <button
                    key={diffId}
                    type="button"
                    onClick={() => {
                      sound.sfx('tap');
                      onChangeDifficulty(diffId);
                    }}
                    title={d.desc}
                    className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? activeTone
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
            <span className="text-xs text-slate-400">{activeDiff.desc}</span>
          </div>

          {/* Primary Actions */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            {activeLevel.comingSoon ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    sound.sfx('select');
                    onSelectLevel(playableWorldLevelId);
                  }}
                  className="inline-flex items-center gap-2.5 rounded-xl bg-amber-400 px-7 py-4 text-base font-bold text-slate-950 shadow-lg hover:bg-amber-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Play className="h-5 w-5 fill-current" />
                  Select Playable Stage (World 2, Level 1)
                </button>
                <div className="text-xs font-medium text-amber-200/90">
                  Upcoming stage · Enemies: {activeLevel.enemiesSummary} · Unlock: {activeLevel.rewardSummary}
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    sound.sfx('select');
                    onStartWithCutscene();
                  }}
                  className={`inline-flex items-center gap-2.5 rounded-xl px-7 py-4 text-base font-bold text-slate-950 shadow-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    isWorld2
                      ? 'bg-amber-400 hover:bg-amber-300'
                      : 'bg-cyan-400 hover:bg-cyan-300'
                  }`}
                >
                  <Play className="h-5 w-5 fill-current" />
                  Play Level {activeLevel.num} (With Opening Cutscene)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.sfx('tap');
                    onStartDirect();
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-900/90 px-5 py-4 text-sm font-semibold text-slate-100 hover:border-cyan-400 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Shield className="h-4 w-4 text-cyan-300" />
                  Jump Straight to Battle
                </button>
              </>
            )}
          </div>

          {/* Local Progress & Mastery Summary (Clean unboxed metadata) */}
          <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Level {activeLevel.num} Rift Locks</span>
                {locks.some((l) => l.recentCount > 0) && (
                  <button
                    type="button"
                    onClick={() => onClearLocks()}
                    title={`Click to clear only Level ${activeLevel.num} Rift Locks`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-300 hover:text-rose-200 cursor-pointer"
                  >
                    <Lock className="h-3 w-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-tabular text-sm font-semibold text-white">
                {locks.map((l) => (
                  <button
                    key={l.vowel}
                    type="button"
                    onClick={() => onClearLocks(l.vowel)}
                    title={`Click to reset ${l.label} on Level ${activeLevel.num}`}
                    className={`inline-flex items-center gap-1 hover:text-rose-300 transition-colors cursor-pointer ${
                      l.done ? 'text-emerald-300' : 'text-slate-200'
                    }`}
                  >
                    {l.done && <Lock className="h-3 w-3" />}
                    <span>
                      {locks.length > 2 ? l.vowel : l.label}: {l.recentCorrect}/{l.need}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400">Best Defense (Lv {activeLevel.num})</div>
              <div className="mt-1.5 flex items-center gap-2 font-tabular text-sm font-semibold text-amber-300">
                <span className="inline-flex items-center gap-1">
                  {[1, 2, 3].map((n) => (
                    <Star
                      key={n}
                      className={`h-4 w-4 ${
                        n <= activeBestStars ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                      }`}
                    />
                  ))}
                </span>
                <span className="text-slate-300 font-normal">
                  {progress.totalForged} forged
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400">Voice Verification</div>
              <div className="mt-1.5 flex items-center gap-2 text-sm font-medium text-slate-200">
                <button
                  type="button"
                  onClick={() => sound.speakUI(`level.${activeLevel.id}`, activeLevel.name)}
                  className="inline-flex items-center gap-1.5 text-cyan-300 hover:text-white cursor-pointer"
                >
                  <Volume2 className="h-4 w-4" />
                  <span>
                    {azureStatus === 'azure'
                      ? 'Azure Ready'
                      : azureStatus === 'chrome'
                      ? 'Browser Mic Ready'
                      : azureStatus === 'checking'
                      ? 'Checking...'
                      : 'Tap Mode Ready'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Quiet Footer with Cutscene Theater Shortcut */}
      <footer className="relative z-10 flex flex-wrap items-center justify-between gap-4 px-8 py-4 border-t border-white/10 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span>Every word can be heard</span>
          <span aria-hidden="true">·</span>
          <span>No timers while reading</span>
          <span aria-hidden="true">·</span>
          <span>Progress stays on this device</span>
        </div>
        <div className="flex items-center gap-3">
          <Film className="h-3.5 w-3.5 text-cyan-300" />
          <button
            type="button"
            onClick={() => onOpenCutscene('opening')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Preview Opening
          </button>
          <span aria-hidden="true">/</span>
          <button
            type="button"
            onClick={() => onOpenCutscene('victory')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Victory
          </button>
          <span aria-hidden="true">/</span>
          <button
            type="button"
            onClick={() => onOpenCutscene('defeat')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Defeat
          </button>
        </div>
      </footer>
    </div>
  );
};
