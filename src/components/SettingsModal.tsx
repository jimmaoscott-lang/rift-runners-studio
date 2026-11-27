import React, { useMemo, useState } from 'react';
import {
  Check,
  ClipboardCopy,
  KeyRound,
  Languages,
  Lock,
  Mic,
  Play,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import {
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  getPatternRule,
  LevelConfig,
  LEVEL_ORDER,
  LEVELS,
  PatternKey,
  WARDEN_SAMPLE_LINE,
  WARDEN_VOICES,
  WardenVoiceId,
} from '../data/level1';
import { sound } from '../lib/audio';
import {
  buildAccommodationSnapshot,
  BUILDER_CODE,
  clampDialValue,
  countActiveEllSupports,
  DifficultyDialRow,
  DifficultyDials,
  formatDifficultyDialsTable,
  formatOverallTeacherNote,
  GameSettings,
  PatternLockStatus,
  StoredProgress,
} from '../lib/metrics';
import { PatternVoiceProfile, speech, WordVoiceOverride } from '../lib/speech';
import { QuickVoiceCheckModal } from './QuickVoiceCheckModal';

interface SettingsModalProps {
  level: LevelConfig;
  locks: PatternLockStatus[];
  progress: StoredProgress;
  settings: GameSettings;
  azureStatus: 'checking' | 'azure' | 'chrome' | 'off';
  teacherMode: boolean;
  builderMode: boolean;
  difficultyDials: DifficultyDials;
  onEnterTeacherMode: () => void;
  onEnterBuilderMode: () => void;
  onExitTeacherMode: () => void;
  onChangeDifficultyDials: (next: DifficultyDials) => void;
  onResetDifficultyDials: () => void;
  onChange: (next: GameSettings) => void;
  onClearActiveLocks: () => void;
  onClearAllLocks: () => void;
  onClearPlacement?: () => void;
  onOpenEll: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  level,
  locks,
  progress,
  settings,
  azureStatus,
  teacherMode,
  builderMode,
  difficultyDials,
  onEnterTeacherMode,
  onEnterBuilderMode,
  onExitTeacherMode,
  onChangeDifficultyDials,
  onResetDifficultyDials,
  onChange,
  onClearActiveLocks,
  onClearAllLocks,
  onClearPlacement,
  onOpenEll,
  onClose,
}) => {
  const ellActiveCount = countActiveEllSupports(settings);
  const [copiedProgress, setCopiedProgress] = useState(false);
  const [copiedDials, setCopiedDials] = useState(false);
  const [dialDrafts, setDialDrafts] = useState<Record<string, string>>({});
  const [micTesting, setMicTesting] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micTestWord, setMicTestWord] = useState<string>(() => level.runes[0]?.w || 'sun');
  const [micMessage, setMicMessage] = useState<string>('');
  const [auditioning, setAuditioning] = useState<WardenVoiceId | null>(null);
  const [voiceNote, setVoiceNote] = useState<string>('');
  const [locksNote, setLocksNote] = useState<string>('');
  const [voiceCheckPattern, setVoiceCheckPattern] = useState<PatternKey | null>(null);
  const [graceList, setGraceList] = useState<string[]>(() => speech.getAllPatternGrace());
  const [voiceProfiles, setVoiceProfiles] = useState<PatternVoiceProfile[]>(() =>
    speech.getAllVoiceProfiles()
  );
  const [wordOverrides, setWordOverrides] = useState<WordVoiceOverride[]>(() =>
    speech.getAllWordVoiceOverrides()
  );
  const [lastMicMiss, setLastMicMiss] = useState<{
    word: string;
    heard: string;
    heardIpa?: string;
  } | null>(null);
  const [showTeacherPrompt, setShowTeacherPrompt] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [newCodeInput, setNewCodeInput] = useState(settings.teacherCode || 'rift2026');
  const [changeCodeMsg, setChangeCodeMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const refreshVoiceAdaptations = () => {
    setGraceList(speech.getAllPatternGrace());
    setVoiceProfiles(speech.getAllVoiceProfiles());
    setWordOverrides(speech.getAllWordVoiceOverrides());
  };

  const currentSnapshot = useMemo(
    () => buildAccommodationSnapshot(settings, voiceProfiles, wordOverrides),
    [settings, voiceProfiles, wordOverrides]
  );

  const recentBattles = useMemo(() => [...progress.battles].slice(-5).reverse(), [progress.battles]);

  const handleCopyProgressNote = async () => {
    const text = formatOverallTeacherNote({
      progress,
      activeLevelLabel: `${level.worldName}, Level ${level.num}: ${level.name}`,
      locks,
      snapshot: currentSnapshot,
      levelNameLookup: (id) => {
        if (id === 'placement') return 'Runner Basic Training (Placement)';
        if (!id || !LEVELS[id]) return 'Level 1: Thornwood Edge';
        return `Lv ${LEVELS[id].num}: ${LEVELS[id].name}`;
      },
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
    setCopiedProgress(true);
    window.setTimeout(() => setCopiedProgress(false), 2400);
  };

  const update = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    const next = { ...settings, [key]: value };
    onChange(next);
  };

  const handleAudition = async (voiceId: WardenVoiceId) => {
    update('wardenVoice', voiceId);
    sound.setWardenVoice(voiceId);
    setAuditioning(voiceId);
    setVoiceNote(`Playing ${voiceId} sample...`);
    const ok = await sound.auditionVoice(voiceId, WARDEN_SAMPLE_LINE);
    setAuditioning((cur) => (cur === voiceId ? null : cur));
    if (ok) {
      setVoiceNote(`${voiceId} selected as your Rift Warden voice.`);
    } else {
      setVoiceNote(
        `${voiceId} is busy right now (API quota). Try Leda, Aoede, Charon, or Orus, which are cached ready.`
      );
    }
  };

  const runMicTest = async (wordToTest = micTestWord) => {
    if (micTesting) {
      speech.submitNow();
      return;
    }
    const allLevels = Object.values(LEVELS);
    const allRunes = allLevels.flatMap((lv) => lv.runes);
    const allReal = allLevels.flatMap((lv) => lv.realWords);
    const runeEntry = allRunes.find((r) => r.w === wordToTest);
    const realEntry = allReal.find((r) => r.w === wordToTest);
    const matchedEntry = runeEntry || realEntry;

    setMicTestWord(wordToTest);
    setMicTesting(true);
    setMicLevel(0);
    setLastMicMiss(null);
    setMicMessage(`Listening... Say "${wordToTest}" out loud.`);
    sound.duck(2);
    const res = await speech.listen(
      {
        w: wordToTest,
        kind: runeEntry ? 'rune' : 'real',
        pattern: matchedEntry?.pattern,
        azureRef: runeEntry?.azureRef,
        sayAlso: matchedEntry?.sayAlso || (wordToTest === 'sun' ? ['son'] : undefined),
      },
      {
        onLevel: (lvl) => setMicLevel(lvl),
      }
    );
    sound.duck(0);
    setMicTesting(false);
    setMicLevel(0);
    if (res.outcome === 'match') {
      sound.sfx('hit');
      setLastMicMiss(null);
      setMicMessage(
        `PASS on "${wordToTest}" (${res.engine}). Heard "${res.heard || wordToTest}" · ${res.note}`
      );
    } else if (res.outcome === 'down') {
      setMicMessage(res.reason || 'Microphone blocked or unavailable. Tap mode still works.');
    } else if (res.outcome === 'nothing') {
      setMicMessage(`No word heard for "${wordToTest}". Speak right after pressing Test.`);
    } else {
      if (res.outcome === 'miss' && res.heard) {
        setLastMicMiss({
          word: wordToTest,
          heard: res.heard,
          heardIpa: res.diagnostic?.observed?.heardIpa,
        });
      }
      setMicMessage(
        `MISS on "${wordToTest}" (${res.engine}). Heard "${res.heard || 'other'}" · ${res.note}`
      );
    }
  };

  const handleSaveTesterWordFit = () => {
    if (!lastMicMiss) return;
    sound.sfx('select');
    const saved = speech.saveWordVoiceOverride(
      lastMicMiss.word,
      lastMicMiss.heard,
      lastMicMiss.heardIpa
    );
    refreshVoiceAdaptations();
    if (saved) {
      setMicMessage(
        `Saved to voice profile: "${lastMicMiss.heard}" now counts as correct for "${lastMicMiss.word}". Press Test "${lastMicMiss.word}" again to verify.`
      );
    }
    setLastMicMiss(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-2xl border border-slate-700 bg-[#0e1526] p-5 shadow-2xl text-slate-100"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 id="settings-title" className="font-display text-lg md:text-xl font-bold text-white">
            Settings, Voices & Reading Support
          </h2>
          <button
            type="button"
            onClick={() => {
              sound.stopSpeaking();
              onClose();
            }}
            aria-label="Close settings"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-400 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-5">
          {/* Teacher Mode Only: Testing Tools (Clear Rift Locks) & Level Access */}
          {teacherMode && (
            <>
          {/* Testing Tools: Clear Rift Locks */}
          <section className="space-y-2.5 rounded-xl border border-rose-500/45 bg-rose-950/25 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-rose-200">Testing Tools: Rift Locks</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Reset saved Rift Locks to 0 so you can test full wave difficulty from scratch.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 font-tabular text-xs font-bold text-slate-200">
                {locks.map((lk) => (
                  <span key={lk.vowel} className={lk.done ? 'text-emerald-300' : 'text-slate-300'}>
                    {lk.label}: {lk.recentCorrect}/{lk.need}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  onClearActiveLocks();
                  setLocksNote(`Level ${level.num} locks cleared to 0.`);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/70 bg-rose-500/20 px-3.5 py-2 text-xs font-bold text-rose-100 hover:bg-rose-500/35 hover:text-white cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Clear Level {level.num} Locks
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearAllLocks();
                  setLocksNote('All Rift Locks across all levels cleared to 0.');
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-rose-400 hover:text-white cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Clear All Locks
              </button>
            </div>
            {locksNote && <p className="text-xs font-medium text-rose-200">{locksNote}</p>}
          </section>

          {/* Teacher Level Access & Basic Training Placement */}
          <section className="space-y-3 rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-emerald-200">
                  Teacher Level Access &amp; Placement
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Unlock All Levels lets a teacher jump into any shipped stage without clearing Basic Training or earlier levels first.
                </p>
              </div>
              <button
                type="button"
                onClick={() => update('unlockAllLevels', !settings.unlockAllLevels)}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  settings.unlockAllLevels
                    ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
                    : 'border border-slate-600 bg-slate-900 text-slate-200 hover:border-emerald-400 hover:text-white'
                }`}
              >
                {settings.unlockAllLevels ? 'All Levels Open: On' : 'Unlock All Levels: Off'}
              </button>
            </div>

            {progress.placement && (() => {
              const recLv = LEVELS[progress.placement.recommendedLevelId] || LEVELS['w1-l1'];
              return (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-emerald-500/25 pt-2.5 text-xs">
                  <div className="text-slate-200">
                    <span className="font-semibold text-emerald-300">Saved Basic Training: </span>
                    <span>
                      {recLv.worldName}, Level {recLv.num}: {recLv.name}
                    </span>
                    <span className="text-slate-400"> · </span>
                    <span className="font-tabular text-cyan-200">
                      {progress.placement.unlockedLevelIds.length} of {LEVEL_ORDER.length} levels open
                    </span>
                  </div>
                  {onClearPlacement && (
                    <button
                      type="button"
                      onClick={() => {
                        onClearPlacement();
                        setLocksNote('Basic Training placement cleared. Levels returned to campaign lock state.');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-rose-400 hover:text-white cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset Placement
                    </button>
                  )}
                </div>
              );
            })()}
          </section>
            </>
          )}

          {/* Rift Warden Voice Audition */}
          <section className="space-y-3 rounded-xl border border-purple-500/40 bg-[#141130] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-cyan-300">Rift Warden Voice Audition</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Tap any voice to hear a generated sample and set it for cutscenes and walkthrough tips. Words and letter sounds continue using your recorded Azure voice library.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {WARDEN_VOICES.map((v) => {
                const selected = settings.wardenVoice === v.id;
                const playing = auditioning === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleAudition(v.id)}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer ${
                      selected
                        ? 'border-cyan-400 bg-cyan-500/15 text-white'
                        : 'border-slate-700/80 bg-slate-900/70 text-slate-200 hover:border-purple-400'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <span>{v.label}</span>
                        <span className="text-[10px] font-medium text-purple-300">({v.role})</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{v.vibe}</div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {selected && <Check className="h-3.5 w-3.5 text-cyan-300" />}
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold ${
                          playing
                            ? 'bg-amber-400 text-slate-950'
                            : selected
                            ? 'bg-cyan-400 text-slate-950'
                            : 'bg-slate-800 text-cyan-200'
                        }`}
                      >
                        <Play className="h-3 w-3 fill-current" />
                        {playing ? 'Playing' : 'Sample'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {voiceNote && <p className="text-xs font-medium text-cyan-200">{voiceNote}</p>}
          </section>

          {/* Typography & Accessibility */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-cyan-300">Gameplay & Reading Display</h3>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-white">Battle Difficulty</div>
                <div className="text-xs text-slate-400">
                  {(DIFFICULTIES[settings.difficulty] || DIFFICULTIES.normal).desc}
                </div>
              </div>
              <div className="flex gap-1 rounded-lg bg-slate-900 p-1 border border-slate-800">
                {DIFFICULTY_ORDER.map((diffId) => {
                  const d = DIFFICULTIES[diffId];
                  const active = (settings.difficulty || 'normal') === diffId;
                  const activeStyle =
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
                      onClick={() => update('difficulty', diffId)}
                      className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                        active ? activeStyle : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-white">Reading Font</div>
                <div className="text-xs text-slate-400">Applies to all words, captions, and menus.</div>
              </div>
              <div className="flex gap-1 rounded-lg bg-slate-900 p-1 border border-slate-800">
                {(['lexend', 'dyslexic'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => update('font', f)}
                    className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      settings.font === f
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {f === 'lexend' ? 'Lexend' : 'OpenDyslexic'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-white">Text Size</div>
                <div className="text-xs text-slate-400">Scales the target word inside the Rune Forge.</div>
              </div>
              <div className="flex gap-1 rounded-lg bg-slate-900 p-1 border border-slate-800">
                {(
                  [
                    ['normal', 'Normal'],
                    ['large', 'Large'],
                    ['xlarge', 'Extra Large'],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => update('textSize', val)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      settings.textSize === val
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-white">Español / ELL Support</div>
                <div className="text-xs text-slate-400">
                  Spanish L1 voice fit, slow blend audio, word meanings, bilingual sound rules, and dual-language captions.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  sound.sfx('tap');
                  onOpenEll();
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  ellActiveCount > 0
                    ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30'
                    : 'border-cyan-400/60 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25'
                }`}
              >
                <Languages className="h-3.5 w-3.5" />
                <span>
                  {ellActiveCount > 0 ? `Español (${ellActiveCount} active)` : 'Open Español Menu'}
                </span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-white">Focus Mode (Half Speed)</div>
                <div className="text-xs text-slate-400">Starts battles at 0.5x speed and calms particle effects.</div>
              </div>
              <button
                type="button"
                onClick={() => update('focusMode', !settings.focusMode)}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  settings.focusMode
                    ? 'bg-cyan-500 text-slate-950'
                    : 'border border-slate-700 bg-slate-900 text-slate-300'
                }`}
              >
                {settings.focusMode ? 'On' : 'Off'}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-white">Reduced Motion</div>
                <div className="text-xs text-slate-400">Keeps cutscene framing steady without camera motion.</div>
              </div>
              <button
                type="button"
                onClick={() => update('reducedMotion', !settings.reducedMotion)}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  settings.reducedMotion
                    ? 'bg-cyan-500 text-slate-950'
                    : 'border border-slate-700 bg-slate-900 text-slate-300'
                }`}
              >
                {settings.reducedMotion ? 'On' : 'Off'}
              </button>
            </div>
          </section>

          {/* Voice Verification & Speak Mode */}
          <section className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-cyan-300">Voice Verification</h3>
              <span className="text-xs text-slate-400">
                Engine:{' '}
                {azureStatus === 'azure'
                  ? 'Azure Pronunciation Assessment (Connected)'
                  : azureStatus === 'chrome'
                  ? 'Browser Speech Backup'
                  : 'Tap Mode Only'}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-white">Speak First Tries</div>
                <div className="text-xs text-slate-400">
                  Number of voice tries before tap choices appear (0 shows both right away).
                </div>
              </div>
              <div className="flex gap-1 rounded-lg bg-slate-900 p-1 border border-slate-800">
                {[0, 1, 2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => update('speakFirst', n)}
                    className={`rounded-md px-3 py-1.5 font-tabular text-xs font-bold transition-colors cursor-pointer ${
                      settings.speakFirst === n
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-white">Spoken Runes (Azure)</div>
                <div className="text-xs text-slate-400">Allow reading made-up runes aloud when Azure is online.</div>
              </div>
              <button
                type="button"
                onClick={() => update('speakRunes', !settings.speakRunes)}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  settings.speakRunes
                    ? 'bg-cyan-500 text-slate-950'
                    : 'border border-slate-700 bg-slate-900 text-slate-300'
                }`}
              >
                {settings.speakRunes ? 'On' : 'Off'}
              </button>
            </div>

            {/* Adaptive Quick Sound Check & Voice Fit Controls */}
            <div className="rounded-xl border border-cyan-500/35 bg-[#121a30] p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                    <SlidersHorizontal className="h-4 w-4 text-cyan-300" />
                    <span>Quick Sound Check &amp; Voice Fit</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-300">
                    Opens automatically after 3 cumulative spoken misses on the same sound in a level. Launch any sound below to tune the mic or save an accent or speech accommodation.
                  </p>
                </div>
                {(graceList.length > 0 || voiceProfiles.length > 0 || wordOverrides.length > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      sound.sfx('tap');
                      speech.clearAllPatternGrace();
                      refreshVoiceAdaptations();
                    }}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-600 bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:border-cyan-400 hover:text-white cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset All Voice Fits
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {level.vowels.map((pat) => {
                  const rule = getPatternRule(pat);
                  const vp = speech.getVoiceProfile(pat);
                  const hasGrace = speech.getPatternGrace(pat);
                  return (
                    <button
                      key={pat}
                      type="button"
                      disabled={micTesting}
                      onClick={() => {
                        sound.sfx('tap');
                        setVoiceCheckPattern(pat);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                        hasGrace
                          ? 'border-emerald-400/70 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25'
                          : 'border-cyan-400/50 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/25'
                      }`}
                    >
                      {hasGrace && <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />}
                      <span>Check {rule.label}</span>
                      {vp?.mode === 'accommodation' ? (
                        <span className="text-[10px] font-semibold text-emerald-300">
                          (Voice fit)
                        </span>
                      ) : vp ? (
                        <span className="text-[10px] font-semibold text-emerald-300">
                          (Adapted · {vp.targetFloor})
                        </span>
                      ) : hasGrace ? (
                        <span className="text-[10px] font-semibold text-emerald-300">(Grace on)</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {(voiceProfiles.length > 0 || wordOverrides.length > 0) && (
                <div className="rounded-lg border border-emerald-500/35 bg-emerald-950/20 p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-200">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                    <span>Saved Voice Adaptations (Active Across Levels)</span>
                  </div>
                  <div className="space-y-1.5">
                    {voiceProfiles.map((vp) => (
                      <div
                        key={`vp-${vp.pattern}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/25 bg-[#0e1729] px-2.5 py-1.5 text-xs"
                      >
                        <div className="min-w-0 text-slate-200">
                          <span className="font-bold text-emerald-200">
                            {getPatternRule(vp.pattern as PatternKey).label}
                          </span>
                          <span className="text-slate-400"> · </span>
                          <span className="text-slate-300">
                            {vp.labelNote
                              ? vp.labelNote
                              : vp.mode === 'accommodation'
                              ? `Speech fit (accepts ${vp.allowedHeard?.join(', ') || 'custom pronunciation'})`
                              : `Calibrated floor ${vp.targetFloor}`}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            sound.sfx('tap');
                            speech.setPatternGrace(vp.pattern, false);
                            refreshVoiceAdaptations();
                          }}
                          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-semibold text-slate-300 hover:border-rose-400 hover:text-rose-200 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </button>
                      </div>
                    ))}
                    {wordOverrides.map((wo) => (
                      <div
                        key={`wo-${wo.word}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-cyan-500/25 bg-[#0e1729] px-2.5 py-1.5 text-xs"
                      >
                        <div className="min-w-0 text-slate-200">
                          <span className="font-reading font-bold text-cyan-200">
                            &ldquo;{wo.word}&rdquo;
                          </span>
                          <span className="text-slate-400"> · </span>
                          <span className="text-slate-300">
                            counts {wo.acceptedHeard.map((h) => `"${h}"`).join(', ')} as correct
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            sound.sfx('tap');
                            speech.removeWordVoiceOverride(wo.word);
                            refreshVoiceAdaptations();
                          }}
                          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-semibold text-slate-300 hover:border-rose-400 hover:text-rose-200 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-white">Microphone & Nonsense Rune Tester</div>
                  <div className="text-xs text-slate-400">
                    Pick any word or nonsense rune below, then click Test and read it aloud to see live Azure scoring.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => runMicTest(micTestWord)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-bold cursor-pointer whitespace-nowrap ${
                    micTesting
                      ? 'border-rose-400 bg-rose-600 text-white'
                      : 'border-cyan-400/60 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30'
                  }`}
                >
                  <Mic className="h-3.5 w-3.5" />
                  {micTesting ? `Listening (${micTestWord})... Tap to send` : `Test "${micTestWord}"`}
                </button>
              </div>

              {/* Quick word & active level nonsense runes selector */}
              <div className="flex flex-wrap gap-1.5">
                {(() => {
                  const pickedReal: string[] = [];
                  for (const v of level.vowels) {
                    const found = level.realWords.find(
                      (rw) => (rw.pattern === v || rw.w.includes(v)) && !pickedReal.includes(rw.w)
                    );
                    if (found && pickedReal.length < 4) pickedReal.push(found.w);
                  }
                  for (const rw of level.realWords) {
                    if (pickedReal.length >= 4) break;
                    if (!pickedReal.includes(rw.w)) pickedReal.push(rw.w);
                  }
                  const testWords = Array.from(
                    new Set([...pickedReal, ...level.runes.map((r) => r.w)])
                  );
                  return testWords.map((w) => {
                    const isRune = level.runes.some((r) => r.w === w);
                    const active = micTestWord === w;
                    return (
                      <button
                        key={w}
                        type="button"
                        disabled={micTesting}
                        onClick={() => setMicTestWord(w)}
                        className={`rounded-lg border px-2.5 py-1 font-reading text-xs font-bold transition-colors cursor-pointer ${
                          active
                            ? 'border-cyan-300 bg-cyan-400 text-slate-950'
                            : isRune
                            ? 'border-amber-400/45 bg-amber-500/10 text-amber-200 hover:border-amber-300'
                            : 'border-slate-700 bg-slate-800/80 text-slate-200 hover:border-cyan-400'
                        }`}
                      >
                        {w}
                      </button>
                    );
                  });
                })()}
              </div>

              {micTesting && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-amber-400 transition-[width] duration-75"
                    style={{ width: `${Math.max(6, Math.round(micLevel * 100))}%` }}
                  />
                </div>
              )}

              {micMessage && (
                <p className="font-tabular text-xs text-cyan-200 break-words">{micMessage}</p>
              )}

              {lastMicMiss && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-400/45 bg-emerald-500/12 px-3 py-2">
                  <span className="text-xs text-emerald-100">
                    Accent or speech difference? Save how you say &ldquo;{lastMicMiss.word}&rdquo;.
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveTesterWordFit}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-300 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Save &ldquo;{lastMicMiss.heard}&rdquo; for &ldquo;{lastMicMiss.word}&rdquo;
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Teacher Progress & Accommodation Snapshot */}
          <section className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-emerald-300">
                  Teacher Progress &amp; Accommodation Snapshot
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Copy a ready-to-paste IEP/ELL summary of active supports and recent reading sessions.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyProgressNote}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  copiedProgress
                    ? 'border-emerald-300 bg-emerald-400 text-slate-950'
                    : 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25 hover:text-white'
                }`}
              >
                {copiedProgress ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Copied Summary</span>
                  </>
                ) : (
                  <>
                    <ClipboardCopy className="h-3.5 w-3.5" />
                    <span>Copy Progress Note</span>
                  </>
                )}
              </button>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-3.5 space-y-2 text-xs">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-tabular text-slate-200">
                <span>
                  All-time words: <strong className="text-white">{progress.totalForged}</strong>
                </span>
                <span>
                  Wins: <strong className="text-emerald-300">{progress.wins}</strong>
                </span>
                <span>
                  Active ELL supports:{' '}
                  <strong className="text-cyan-200">{currentSnapshot.ellSupports.length}</strong>
                </span>
              </div>

              <div className="text-slate-300 leading-snug">
                <span className="font-semibold text-emerald-200">Active supports: </span>
                {currentSnapshot.ellSupports.length > 0 ||
                currentSnapshot.readingSupports.length > 0 ||
                currentSnapshot.voiceAdaptations.length > 0
                  ? [
                      ...currentSnapshot.ellSupports,
                      ...currentSnapshot.readingSupports,
                      ...currentSnapshot.voiceAdaptations,
                    ].join(', ')
                  : 'Standard settings (no accommodations active)'}
              </div>

              {recentBattles.length > 0 ? (
                <div className="pt-2 border-t border-emerald-500/20 space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Recent Sessions (Last {recentBattles.length})
                  </div>
                  {recentBattles.map((b, idx) => {
                    const lvName =
                      b.levelId === 'placement'
                        ? 'Runner Basic Training'
                        : b.levelId && LEVELS[b.levelId]
                        ? `Lv ${LEVELS[b.levelId].num}: ${LEVELS[b.levelId].name}`
                        : 'Lv 1: Thornwood Edge';
                    const pct = b.words > 0 ? Math.round((b.firstTry / b.words) * 100) : 0;
                    const ellCount = b.accommodations?.ellSupports.length ?? 0;
                    const vfCount = b.accommodations?.voiceAdaptations.length ?? 0;
                    const bDate = new Date(b.ts).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    });
                    return (
                      <div
                        key={`${b.ts}-${idx}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800/90 bg-[#0d1424] px-2.5 py-1.5 text-[11px]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-tabular text-slate-400 shrink-0">{bDate}</span>
                          <span className="font-semibold text-white truncate">{lvName}</span>
                          <span
                            className={`font-bold shrink-0 ${
                              b.win ? 'text-emerald-300' : 'text-amber-300'
                            }`}
                          >
                            {b.win ? `Win (${b.stars}*)` : 'Attempt'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 font-tabular text-slate-300 shrink-0">
                          <span>
                            {b.words}w ({pct}%)
                          </span>
                          <span className="text-cyan-200">
                            {ellCount > 0
                              ? `ELL: ${ellCount}`
                              : vfCount > 0
                              ? `Voice fit: ${vfCount}`
                              : 'Standard'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="pt-1 text-[11px] text-slate-400">
                  Completed battles will appear here with the exact accommodations used.
                </p>
              )}
            </div>
          </section>

          {/* Audio Sliders */}
          <section className="space-y-3 pt-4 border-t border-slate-800">
            <h3 className="text-sm font-semibold text-cyan-300">Audio Volumes</h3>
            {(
              [
                ['voiceVol', 'Voice & Words'],
                ['musicVol', 'Ambient Music'],
                ['effectsVol', 'Battle Effects'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex items-center gap-4">
                <Volume2 className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="w-32 text-sm text-slate-200">{label}</span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={settings[key]}
                  onChange={(e) => update(key, Number(e.target.value))}
                  className="flex-1 accent-cyan-400"
                />
                <span className="w-6 text-right font-tabular text-xs text-slate-300">
                  {settings[key]}
                </span>
              </div>
            ))}
          </section>
          {/* Builder-only Difficulty Dials */}
          {builderMode && (
            <section className="space-y-3 pt-4 border-t border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    Difficulty dials
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Multiplies on top of each difficulty preset for live testing. Resets on page reload.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const text = formatDifficultyDialsTable(difficultyDials);
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
                      setCopiedDials(true);
                      window.setTimeout(() => setCopiedDials(false), 2200);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/60 bg-cyan-500/15 px-3 py-1.5 text-xs font-bold text-cyan-200 hover:bg-cyan-500/25 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {copiedDials ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-300" />
                        Copied
                      </>
                    ) : (
                      <>
                        <ClipboardCopy className="h-3.5 w-3.5" />
                        Copy dial values
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sound.sfx('tap');
                      setDialDrafts({});
                      onResetDifficultyDials();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-amber-400/70 hover:text-amber-200 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset to default
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-amber-400/35 bg-slate-900/75 p-3">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-300">
                      <th className="py-1.5 pr-2">Difficulty</th>
                      <th className="px-1.5 py-1.5">Creature health %</th>
                      <th className="px-1.5 py-1.5">Creature speed %</th>
                      <th className="px-1.5 py-1.5">Number of creatures %</th>
                      <th className="pl-1.5 py-1.5">Extra words between waves</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {DIFFICULTY_ORDER.map((diffId) => {
                      const diffInfo = DIFFICULTIES[diffId];
                      const row = difficultyDials[diffId];
                      const fields: Array<{
                        key: keyof DifficultyDialRow;
                        label: string;
                        min: number;
                        max: number;
                      }> = [
                        { key: 'healthPct', label: 'Creature health %', min: 25, max: 300 },
                        { key: 'speedPct', label: 'Creature speed %', min: 50, max: 200 },
                        { key: 'countPct', label: 'Number of creatures %', min: 25, max: 300 },
                        { key: 'extraWords', label: 'Extra words between waves', min: -5, max: 10 },
                      ];
                      return (
                        <tr key={diffId}>
                          <td className="py-2 pr-2 font-bold text-white whitespace-nowrap">
                            {diffInfo.label}
                          </td>
                          {fields.map((field) => {
                            const draftKey = `${diffId}:${field.key}`;
                            const displayVal =
                              draftKey in dialDrafts ? dialDrafts[draftKey] : String(row[field.key]);
                            return (
                              <td key={field.key} className="px-1.5 py-2">
                                <input
                                  type="number"
                                  min={field.min}
                                  max={field.max}
                                  step={1}
                                  aria-label={`${diffInfo.label} ${field.label}`}
                                  value={displayVal}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    setDialDrafts((prev) => ({ ...prev, [draftKey]: raw }));
                                    const trimmed = raw.trim();
                                    if (trimmed === '' || trimmed === '-') return;
                                    const parsed = Number(trimmed);
                                    if (!Number.isFinite(parsed)) return;
                                    const clamped = clampDialValue(field.key, parsed);
                                    onChangeDifficultyDials({
                                      ...difficultyDials,
                                      [diffId]: {
                                        ...difficultyDials[diffId],
                                        [field.key]: clamped,
                                      },
                                    });
                                  }}
                                  onBlur={() => {
                                    setDialDrafts((prev) => {
                                      if (!(draftKey in prev)) return prev;
                                      const next = { ...prev };
                                      delete next[draftKey];
                                      return next;
                                    });
                                  }}
                                  className="w-20 rounded-lg border border-slate-700 bg-[#0b1122] px-2 py-1.5 font-tabular text-xs font-bold text-white focus:border-amber-400 focus:outline-none"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Teacher Tools Unlock & Code Management */}
          {(teacherMode || showTeacherPrompt) && (
            <section className="space-y-3 pt-4 border-t border-slate-800">
              {teacherMode ? (
              <div className="space-y-3 rounded-xl border border-amber-400/50 bg-amber-950/25 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-amber-200">
                    <KeyRound className="h-4 w-4 text-amber-300" />
                    <span>{builderMode ? 'Builder Mode on' : 'Teacher Mode on'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      sound.sfx('tap');
                      onExitTeacherMode();
                      setShowTeacherPrompt(false);
                      setCodeInput('');
                      setCodeError('');
                      setChangeCodeMsg(null);
                      setDialDrafts({});
                    }}
                    className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-amber-300 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Turn off
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const cleaned = newCodeInput.trim();
                    if (!/^[A-Za-z0-9]{4,20}$/.test(cleaned)) {
                      setChangeCodeMsg({
                        ok: false,
                        text: 'Use 4 to 20 letters or numbers.',
                      });
                      return;
                    }
                    sound.sfx('select');
                    update('teacherCode', cleaned);
                    setNewCodeInput(cleaned);
                    setChangeCodeMsg({ ok: true, text: 'Teacher code saved.' });
                  }}
                  className="space-y-2 pt-2 border-t border-amber-400/20"
                >
                  <label
                    htmlFor="change-teacher-code-input"
                    className="block text-xs font-semibold text-amber-100"
                  >
                    Change teacher code
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      id="change-teacher-code-input"
                      type="text"
                      value={newCodeInput}
                      onChange={(e) => {
                        setNewCodeInput(e.target.value);
                        if (changeCodeMsg) setChangeCodeMsg(null);
                      }}
                      minLength={4}
                      maxLength={20}
                      placeholder="4 to 20 letters or numbers"
                      autoComplete="off"
                      className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="rounded-lg border border-amber-400/70 bg-amber-500/20 px-3.5 py-2 text-xs font-bold text-amber-100 hover:bg-amber-500/30 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Save code
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">4 to 20 letters or numbers.</p>
                  {changeCodeMsg && (
                    <p
                      className={`text-xs font-semibold ${
                        changeCodeMsg.ok ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      {changeCodeMsg.text}
                    </p>
                  )}
                </form>
              </div>
            ) : showTeacherPrompt ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const entered = codeInput.trim();
                  const expected = settings.teacherCode || 'rift2026';
                  if (entered === BUILDER_CODE) {
                    sound.sfx('select');
                    setCodeInput('');
                    setCodeError('');
                    setShowTeacherPrompt(false);
                    setNewCodeInput(expected);
                    onEnterBuilderMode();
                  } else if (entered === expected) {
                    sound.sfx('select');
                    setCodeInput('');
                    setCodeError('');
                    setShowTeacherPrompt(false);
                    setNewCodeInput(expected);
                    onEnterTeacherMode();
                  } else {
                    sound.sfx('tap');
                    setCodeError('That code did not work.');
                  }
                }}
                className="space-y-2.5 rounded-xl border border-slate-700 bg-slate-900/80 p-4"
              >
                <label
                  htmlFor="teacher-code-input"
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-200"
                >
                  <Lock className="h-3.5 w-3.5 text-amber-300" />
                  <span>Enter teacher code</span>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    id="teacher-code-input"
                    type="password"
                    value={codeInput}
                    onChange={(e) => {
                      setCodeInput(e.target.value);
                      if (codeError) setCodeError('');
                    }}
                    placeholder="Teacher code"
                    autoComplete="off"
                    autoFocus
                    className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-[#0b1122] px-3 py-2 text-xs font-semibold text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-amber-400 px-3.5 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-300 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Unlock
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sound.sfx('tap');
                      setShowTeacherPrompt(false);
                      setCodeInput('');
                      setCodeError('');
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Cancel
                  </button>
                </div>
                {codeError && <p className="text-xs font-semibold text-rose-300">{codeError}</p>}
              </form>
            ) : null}
            </section>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 pt-4 border-t border-slate-800">
          {!teacherMode ? (
            <button
              type="button"
              onClick={() => {
                sound.sfx('tap');
                setShowTeacherPrompt((prev) => !prev);
                setCodeError('');
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-amber-400/70 hover:text-amber-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Teacher Tools</span>
            </button>
          ) : (
            <span className="text-xs font-semibold text-amber-300">
              {builderMode ? 'Builder Mode on' : 'Teacher Mode on'}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-300 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      {voiceCheckPattern && (
        <QuickVoiceCheckModal
          pattern={voiceCheckPattern}
          source="settings"
          onGraceChange={refreshVoiceAdaptations}
          onClose={() => {
            refreshVoiceAdaptations();
            setVoiceCheckPattern(null);
          }}
        />
      )}
    </div>
  );
};
