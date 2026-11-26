import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Mic,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import { getPatternRule, PatternKey } from '../data/level1';
import { sound } from '../lib/audio';
import {
  ListenResult,
  normalizePatternKey,
  PatternVoiceProfile,
  speech,
  WordVoiceOverride,
} from '../lib/speech';

interface VoiceCheckProfile {
  label: string;
  soundTile: string;
  anchor: string;
  contrast: string;
  contrastPattern: string;
  tip: string;
  swapHint?: string;
}

const VOICE_CHECK_PROFILES: Record<string, VoiceCheckProfile> = {
  a: {
    label: 'Short a',
    soundTile: 'a',
    anchor: 'cat',
    contrast: 'cut',
    contrastPattern: 'u',
    tip: 'Drop your jaw wide and keep the front of your tongue low for a crisp "a" sound.',
  },
  e: {
    label: 'Short e',
    soundTile: 'e',
    anchor: 'red',
    contrast: 'rid',
    contrastPattern: 'i',
    tip: 'Open your mouth halfway and relax your lips so the "e" stays clear and steady.',
  },
  i: {
    label: 'Short i',
    soundTile: 'i',
    anchor: 'pig',
    contrast: 'peg',
    contrastPattern: 'e',
    tip: 'Keep the sound quick and relaxed near the front of your mouth, without stretching it long.',
  },
  o: {
    label: 'Short o',
    soundTile: 'o',
    anchor: 'top',
    contrast: 'tap',
    contrastPattern: 'a',
    tip: 'Open wide and pull the sound toward the back of your mouth for a clean "ah" vowel.',
  },
  u: {
    label: 'Short u',
    soundTile: 'u',
    anchor: 'cup',
    contrast: 'cop',
    contrastPattern: 'o',
    tip: 'Keep your mouth relaxed in the middle for a short, quick "uh" sound.',
  },
  sh: {
    label: 'sh Sound',
    soundTile: 'sh',
    anchor: 'ship',
    contrast: 'chip',
    contrastPattern: 'ch',
    tip: 'Round your lips slightly and let one smooth, steady stream of air flow out.',
    swapHint: 'Keep the air smooth from the start without tapping your tongue first.',
  },
  ch: {
    label: 'ch Sound',
    soundTile: 'ch',
    anchor: 'chip',
    contrast: 'ship',
    contrastPattern: 'sh',
    tip: 'Touch your tongue behind your top teeth, then release a sharp, crisp burst of air.',
    swapHint: 'Give the start a firm tongue tap so it pops sharply instead of gliding.',
  },
  th: {
    label: 'th Sound',
    soundTile: 'th',
    anchor: 'thin',
    contrast: 'tin',
    contrastPattern: 't',
    tip: 'Rest the tip of your tongue gently between your teeth and blow steady air past it.',
    swapHint: 'Let your tongue peek slightly between your teeth so it stays airy.',
  },
  wh: {
    label: 'wh Sound',
    soundTile: 'wh',
    anchor: 'whip',
    contrast: 'rip',
    contrastPattern: 'r',
    tip: 'Round your lips tight like a small circle, then glide smoothly into the vowel.',
  },
  ck: {
    label: '-ck Sound',
    soundTile: 'ck',
    anchor: 'lock',
    contrast: 'log',
    contrastPattern: 'g',
    tip: 'Finish with a quick, unvoiced pop from the back of your tongue so the ending stays crisp.',
    swapHint: 'Keep the final "k" sharp and unvoiced instead of humming through it.',
  },
  bl: {
    label: 'bl Blend',
    soundTile: 'bl',
    anchor: 'black',
    contrast: 'back',
    contrastPattern: 'b',
    tip: 'Pop the "b" with your lips and glide straight into "l" by lifting your tongue tip behind your top teeth.',
    swapHint: 'Make sure both the "b" and the "l" come through before the vowel.',
  },
  cl: {
    label: 'cl Blend',
    soundTile: 'cl',
    anchor: 'clap',
    contrast: 'cap',
    contrastPattern: 'c',
    tip: 'Tap a crisp "k" sound at the back of your mouth and slide smoothly into "l" with your tongue tip up.',
    swapHint: 'Let the "l" follow right after "c" so both sounds stay clear.',
  },
  fr: {
    label: 'fr Blend',
    soundTile: 'fr',
    anchor: 'frog',
    contrast: 'fog',
    contrastPattern: 'f',
    tip: 'Blow a quick "f" across your bottom lip and pull your tongue slightly back into a smooth "r".',
    swapHint: 'Keep the "r" gliding right after "f" without rounding into a "w".',
  },
  gr: {
    label: 'gr Blend',
    soundTile: 'gr',
    anchor: 'grab',
    contrast: 'gab',
    contrastPattern: 'g',
    tip: 'Start with a voiced "g" in the back of your mouth and slide directly into a smooth "r".',
    swapHint: 'Keep both the "g" and the "r" steady before moving into the vowel.',
  },
  sp: {
    label: 'sp Blend',
    soundTile: 'sp',
    anchor: 'spin',
    contrast: 'pin',
    contrastPattern: 'p',
    tip: 'Start with a crisp "s" hiss right before popping your lips for "p", with no vowel sound in front.',
    swapHint: 'Keep the "s" audible right at the start before the "p".',
  },
  st: {
    label: 'st Blend',
    soundTile: 'st',
    anchor: 'stop',
    contrast: 'top',
    contrastPattern: 't',
    tip: 'Hiss a clear "s" and tap your tongue directly into "t" so both sounds ring cleanly.',
    swapHint: 'Let the "s" and "t" flow together cleanly before the vowel.',
  },
  nd: {
    label: '-nd Blend',
    soundTile: 'nd',
    anchor: 'hand',
    contrast: 'had',
    contrastPattern: 'd',
    tip: 'Hum the "n" briefly at the end of the vowel and finish with a clean "d" tap.',
    swapHint: 'Make sure both the humming "n" and the final "d" come through.',
  },
  mp: {
    label: '-mp Blend',
    soundTile: 'mp',
    anchor: 'camp',
    contrast: 'cap',
    contrastPattern: 'p',
    tip: 'Close your lips on "m" and pop them open with a crisp "p" at the end.',
    swapHint: 'Close into "m" before releasing the final "p" burst.',
  },
  a_e: {
    label: 'Long a (a_e)',
    soundTile: 'a_e',
    anchor: 'cape',
    contrast: 'cap',
    contrastPattern: 'a',
    tip: 'Let the silent e make the vowel say its long name, "ay", smoothly before the final consonant.',
    swapHint: 'Stretch the vowel to say its name ("ay") instead of the short "a" sound.',
  },
  i_e: {
    label: 'Long i (i_e)',
    soundTile: 'i_e',
    anchor: 'bite',
    contrast: 'bit',
    contrastPattern: 'i',
    tip: 'Let the silent e make the vowel say its long name, "eye", clearly before the final consonant.',
    swapHint: 'Glide the vowel up to its name ("eye") instead of stopping on short "i".',
  },
};

function getProfile(pattern: PatternKey): VoiceCheckProfile {
  const key = normalizePatternKey(pattern);
  if (VOICE_CHECK_PROFILES[key]) return VOICE_CHECK_PROFILES[key];
  const rule = getPatternRule(pattern);
  return {
    label: rule.label,
    soundTile: rule.shortLabel || key || pattern,
    anchor: rule.word,
    contrast: '',
    contrastPattern: '',
    tip: 'Listen to the sound and anchor word once, then read the anchor word at a steady pace.',
  };
}

function buildStep1Coaching(
  res: ListenResult,
  targetWord: string,
  profile: VoiceCheckProfile
): string {
  if (res.outcome === 'match') {
    return res.diagnostic?.usedProfile
      ? `Matched "${targetWord}" using your saved voice profile! Future words with this sound will adapt automatically.`
      : `Clean match! Speak Mode heard "${targetWord}" clearly. You are ready to jump back in.`;
  }
  if (res.outcome === 'down') {
    return res.reason || 'Your microphone is unavailable right now. Listen & Pick works for every word.';
  }
  if (res.outcome === 'again') {
    return 'The audio checker hiccuped on that clip. Press the mic and try once more.';
  }
  if (res.outcome === 'nothing' || res.diagnostic?.kind === 'quiet') {
    return 'The mic barely picked up your voice. Lean a bit closer and read at a steady, normal volume.';
  }
  const heardLabel = res.heard ? `"${res.heard}"` : 'a nearby sound';
  if (profile.contrast) {
    return `The mic heard ${heardLabel} for "${targetWord}". Say "${profile.contrast}" next so the game can check your contrast, or save this pronunciation below as your personal voice fit.`;
  }
  return `The mic heard ${heardLabel} for "${targetWord}". Try again or save this pronunciation below as your personal voice fit.`;
}

interface QuickVoiceCheckModalProps {
  pattern: PatternKey;
  missedWord?: string;
  source?: 'forge' | 'settings';
  onSwitchToTap?: () => void;
  onGraceChange?: (pattern: PatternKey, enabled: boolean) => void;
  onClose: (passedOrCalibrated: boolean) => void;
}

export const QuickVoiceCheckModal: React.FC<QuickVoiceCheckModalProps> = ({
  pattern,
  missedWord,
  source = 'forge',
  onSwitchToTap,
  onGraceChange,
  onClose,
}) => {
  const normKey = normalizePatternKey(pattern);
  const profile = getProfile(pattern);
  const targetWord = missedWord || profile.anchor;

  const [step, setStep] = useState<'target' | 'contrast' | 'adapted'>('target');
  const [listening, setListening] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [tries, setTries] = useState(0);
  const [passed, setPassed] = useState(false);
  const [targetSample, setTargetSample] = useState<ListenResult | null>(null);
  const [lastMissSample, setLastMissSample] = useState<ListenResult | null>(null);
  const [voiceProfile, setVoiceProfile] = useState<PatternVoiceProfile | null>(() =>
    speech.getVoiceProfile(normKey)
  );
  const [wordOverride, setWordOverride] = useState<WordVoiceOverride | null>(() =>
    speech.getWordVoiceOverride(targetWord)
  );
  const [graceOn, setGraceOn] = useState<boolean>(() => speech.getPatternGrace(normKey));
  const [savedBanner, setSavedBanner] = useState<string>('');
  const [coachText, setCoachText] = useState<string>(
    profile.contrast
      ? `Say "${targetWord}" first. If the mic misses your pronunciation, you can compare with "${profile.contrast}" or save a voice fit for your accent or speech style.`
      : 'Tap the sound or anchor word to listen, then test your mic with one quick read.'
  );
  const [techNote, setTechNote] = useState<string>('');

  const listeningRef = useRef(false);
  listeningRef.current = listening;
  const closeStateRef = useRef({ passed, graceOn, voiceProfile, wordOverride, onClose });
  closeStateRef.current = { passed, graceOn, voiceProfile, wordOverride, onClose };

  // Unmount-only cleanup so toggling `listening` never cancels an active recording
  useEffect(() => {
    return () => {
      sound.stopSpeaking();
      speech.stop();
    };
  }, []);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' && !listeningRef.current) {
        ev.preventDefault();
        sound.stopSpeaking();
        const {
          passed: p,
          graceOn: g,
          voiceProfile: vp,
          wordOverride: wo,
          onClose: closeFn,
        } = closeStateRef.current;
        closeFn(p || g || Boolean(vp) || Boolean(wo));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleToggleGrace = (next: boolean) => {
    sound.sfx('tap');
    speech.setPatternGrace(normKey, next);
    if (!next) {
      speech.removeWordVoiceOverride(targetWord);
      setWordOverride(null);
      setSavedBanner('');
    }
    setGraceOn(next);
    setVoiceProfile(speech.getVoiceProfile(normKey));
    onGraceChange?.(pattern, next);
    if (next) {
      setCoachText(
        `Mic Grace is active for ${profile.label}. Borderline mic reads get extra room while clear wrong-sound swaps still get flagged.`
      );
    } else {
      setStep('target');
      setTargetSample(null);
      setCoachText(`Standard mic sensitivity restored for ${profile.label}.`);
    }
  };

  const handleSaveWordFit = () => {
    if (!lastMissSample) return;
    sound.sfx('hit');
    const saved = speech.saveWordVoiceOverride(
      targetWord,
      lastMissSample.heard,
      lastMissSample.diagnostic?.observed?.heardIpa
    );
    if (saved) {
      setWordOverride(saved);
      setStep('adapted');
      const heardLabel = saved.acceptedHeard.join('", "');
      setSavedBanner(
        `Saved to your voice profile: "${heardLabel}" now counts as correct whenever you read "${targetWord}" in future gameplay.`
      );
      setCoachText(`Try saying "${targetWord}" right now to see your saved voice fit pass.`);
      onGraceChange?.(pattern, true);
    }
  };

  const handleSaveSoundAccommodation = () => {
    if (!lastMissSample) return;
    sound.sfx('hit');
    const saved = speech.saveSpeechAccommodation(pattern, lastMissSample);
    setVoiceProfile(saved);
    setGraceOn(true);
    setStep('adapted');
    setSavedBanner(
      `Saved to your voice profile for ${profile.label} (${saved.labelNote || 'voice fit'}). Future ${profile.label} words will adapt to your pronunciation while still checking the rest of each word.`
    );
    setCoachText(`Try saying "${targetWord}" right now to verify your adapted ${profile.label} profile.`);
    onGraceChange?.(pattern, true);
  };

  const handleRecordWord = async (mode: 'target' | 'contrast') => {
    if (listening) {
      speech.submitNow();
      return;
    }
    const wordToSay = mode === 'contrast' ? profile.contrast : targetWord;
    const patToUse = mode === 'contrast' ? profile.contrastPattern : pattern;

    sound.stopSpeaking();
    sound.duck(2);
    setListening(true);
    setMicReady(false);
    setMicLevel(0);
    setCoachText('Opening mic...');

    const res = await speech.listen(
      {
        w: wordToSay,
        kind: 'real',
        pattern: patToUse,
      },
      {
        onReady: () => {
          setMicReady(true);
          setCoachText(`Speak now: say "${wordToSay}". Tap again when done.`);
        },
        onLevel: (lvl) => setMicLevel(lvl),
      }
    );

    sound.duck(0);
    setListening(false);
    setMicReady(false);
    setMicLevel(0);
    setTries((prev) => prev + 1);
    setTechNote(
      res.heard ? `Heard "${res.heard}" · ${res.note}` : `${res.engine}: ${res.note}`
    );

    if (mode === 'target') {
      if (res.outcome === 'match') {
        sound.sfx('hit');
        setPassed(true);
        setTargetSample(null);
        setCoachText(buildStep1Coaching(res, targetWord, profile));
        return;
      }

      if (res.outcome === 'miss') {
        sound.sfx('soft');
        setTargetSample(res);
        setLastMissSample(res);
        setCoachText(buildStep1Coaching(res, targetWord, profile));
        if (profile.contrast) {
          setStep('contrast');
        }
        return;
      }

      setCoachText(buildStep1Coaching(res, targetWord, profile));
      return;
    }

    // Step 2: Compare target sample against contrast sample to adapt to the student's voice
    if (!targetSample) {
      setStep('target');
      return;
    }

    const cal = speech.calibratePattern(
      pattern,
      targetWord,
      profile.contrast,
      targetSample,
      res,
      profile.label
    );
    setCoachText(cal.summary);

    if (cal.adapted && cal.profile) {
      sound.sfx('hit');
      setVoiceProfile(cal.profile);
      setGraceOn(true);
      setStep('adapted');
      setSavedBanner(
        `Saved Personal Voice Profile for ${profile.label} (floor ${cal.profile.targetFloor}). Future ${profile.label} words now adapt to your voice.`
      );
      onGraceChange?.(pattern, true);
    } else {
      sound.sfx('soft');
      setStep('target');
      setTargetSample(null);
    }
  };

  const activeWord = step === 'contrast' ? profile.contrast : targetWord;
  const showManualGrace = graceOn || tries >= 1 || source === 'settings';
  const hasAnyAdaptation = Boolean(voiceProfile || wordOverride);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-voice-check-title"
        className="w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-2xl border border-cyan-500/45 bg-[#101729] p-4 md:p-5 shadow-2xl text-slate-100"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="quick-voice-check-title"
                className="font-display text-base md:text-lg font-bold tracking-wider text-cyan-300"
              >
                Quick Sound Check
              </h2>
              <span className="rounded-md border border-amber-400/60 bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-200">
                {profile.label}
              </span>
              {hasAnyAdaptation && (
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/60 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-200">
                  <Sparkles className="h-3 w-3" />
                  Voice Fit Saved
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-300 leading-snug">
              Checks how the mic hears your voice and lets Speak Mode adapt for accents, speech differences, or quiet mics.
            </p>
          </div>
          <button
            type="button"
            disabled={listening}
            onClick={() => {
              sound.stopSpeaking();
              onClose(passed || graceOn || hasAnyAdaptation);
            }}
            aria-label="Close Quick Sound Check"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-400 hover:text-white cursor-pointer disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Saved Profile Notification Banner */}
        {savedBanner && (
          <div
            role="status"
            className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-400/65 bg-emerald-500/15 px-3 py-2 text-xs text-emerald-100"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            <span className="font-medium leading-snug">{savedBanner}</span>
          </div>
        )}

        {/* Step 1: Listen & Articulation Cue */}
        <div className="mt-3 rounded-xl border border-slate-700/80 bg-slate-900/70 p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              disabled={listening}
              onClick={() => sound.speakPhoneme(profile.soundTile)}
              className="flex h-12 min-w-14 items-center justify-center gap-1.5 rounded-xl border-2 border-amber-400/75 bg-amber-500/15 px-3 font-reading text-xl font-bold text-amber-200 hover:bg-amber-500/25 cursor-pointer disabled:opacity-50"
              title="Hear the pure sound"
            >
              <Volume2 className="h-4 w-4 text-amber-300" />
              <span>{profile.soundTile}</span>
            </button>

            <button
              type="button"
              disabled={listening}
              onClick={() => sound.speakWord(targetWord)}
              className={`flex h-12 items-center gap-2 rounded-xl border-2 px-3.5 font-reading text-xl font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                step === 'target' || step === 'adapted'
                  ? 'border-cyan-400 bg-cyan-500/20 text-white'
                  : 'border-slate-700 bg-slate-800/80 text-slate-200 hover:border-cyan-400'
              }`}
              title="Hear the target word"
            >
              <Volume2 className="h-4 w-4 text-cyan-300" />
              <span>{targetWord}</span>
            </button>

            {profile.contrast && (
              <button
                type="button"
                disabled={listening}
                onClick={() => sound.speakWord(profile.contrast)}
                className={`flex h-12 items-center gap-1.5 rounded-xl border-2 px-3 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                  step === 'contrast'
                    ? 'border-amber-300 bg-amber-500/20 text-white'
                    : 'border-slate-700 bg-slate-800/90 text-slate-200 hover:border-cyan-400'
                }`}
                title="Compare with a nearby sound"
              >
                <Volume2 className="h-3.5 w-3.5 text-slate-400" />
                <span>Compare:</span>
                <span className="font-reading text-base font-bold text-slate-100">
                  {profile.contrast}
                </span>
              </button>
            )}
          </div>

          <p className="text-center text-xs leading-snug text-slate-300">
            {profile.tip}
          </p>
        </div>

        {/* Step 2: Live Voice Calibration Action */}
        <div className="mt-3 space-y-2.5">
          {step === 'contrast' && (
            <div className="flex items-center justify-between rounded-lg border border-amber-400/50 bg-amber-500/12 px-3 py-1.5 text-xs text-amber-100">
              <span>
                Step 2 of 2: Now say <strong className="font-reading text-amber-200">{profile.contrast}</strong> to check your contrast.
              </span>
              <button
                type="button"
                disabled={listening}
                onClick={() => {
                  setStep('target');
                  setTargetSample(null);
                  setCoachText(`Ready to retry "${targetWord}".`);
                }}
                className="ml-2 shrink-0 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 cursor-pointer"
              >
                Retry {targetWord}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => handleRecordWord(step === 'contrast' ? 'contrast' : 'target')}
            className={`relative flex w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 px-4 py-2.5 text-sm font-extrabold tracking-wide transition-colors cursor-pointer shadow-lg ${
              listening
                ? 'border-rose-300 bg-rose-600 text-white'
                : step === 'contrast'
                ? 'border-amber-300 bg-amber-400 text-slate-950 hover:bg-amber-300'
                : passed || step === 'adapted'
                ? 'border-emerald-300 bg-emerald-600 text-white hover:bg-emerald-500'
                : 'border-cyan-300/80 bg-cyan-500 text-slate-950 hover:bg-cyan-400'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              {(passed || step === 'adapted') && !listening ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              <span>
                {listening
                  ? micReady
                    ? `LISTENING FOR "${activeWord.toUpperCase()}" (TAP TO SEND)`
                    : 'STARTING MIC...'
                  : step === 'contrast'
                  ? `STEP 2: SAY "${profile.contrast.toUpperCase()}"`
                  : step === 'adapted'
                  ? `TEST "${targetWord.toUpperCase()}" WITH YOUR VOICE FIT`
                  : passed
                  ? `TEST "${targetWord.toUpperCase()}" AGAIN`
                  : `SAY "${targetWord.toUpperCase()}"`}
              </span>
            </div>

            {listening && (
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-rose-950/70">
                <div
                  className="h-full bg-amber-300 transition-[width] duration-75"
                  style={{ width: `${Math.max(6, Math.round(micLevel * 100))}%` }}
                />
              </div>
            )}
          </button>

          {/* Plain-English Coaching Feedback */}
          <div
            className={`rounded-xl border px-3 py-2 text-xs leading-snug ${
              passed || step === 'adapted'
                ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100'
                : 'border-slate-700 bg-slate-900/80 text-slate-200'
            }`}
          >
            <p className="font-medium">{coachText}</p>
            {techNote && (
              <p className="mt-1 font-tabular text-[10px] text-cyan-200/80 break-words">
                {techNote}
              </p>
            )}
          </div>
        </div>

        {/* Speech / Accent Voice Fit Accommodation Buttons (shown after a missed sample) */}
        {lastMissSample && !passed && (
          <div className="mt-3 rounded-xl border border-amber-400/45 bg-amber-500/10 p-3 space-y-2">
            <div className="text-xs font-bold text-amber-200">
              Accent or speech difference? Save how you say this:
            </div>
            <p className="text-[11px] leading-snug text-slate-300">
              For accents (such as Spanish ch/sh transfer) or speech patterns (such as final -sh sounding like -st), you can teach the game to count your pronunciation as correct in future battles.
            </p>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {lastMissSample.heard && (
                <button
                  type="button"
                  disabled={listening}
                  onClick={handleSaveWordFit}
                  className="rounded-lg border border-amber-300/75 bg-amber-400/20 px-3 py-1.5 text-xs font-bold text-amber-100 hover:bg-amber-400/35 cursor-pointer disabled:opacity-40"
                >
                  Count &quot;{lastMissSample.heard}&quot; for &quot;{targetWord}&quot;
                </button>
              )}
              <button
                type="button"
                disabled={listening}
                onClick={handleSaveSoundAccommodation}
                className="rounded-lg border border-emerald-400/70 bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-100 hover:bg-emerald-500/35 cursor-pointer disabled:opacity-40"
              >
                Adapt all {profile.label} words to my voice
              </button>
            </div>
          </div>
        )}

        {/* Active Voice Profile / Manual Mic Grace Card */}
        {(voiceProfile || wordOverride || showManualGrace) && (
          <div className="mt-3 rounded-xl border border-purple-500/40 bg-[#171233] p-3">
            {voiceProfile || wordOverride ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-200">
                    <ShieldCheck className="h-4 w-4 text-emerald-300 shrink-0" />
                    <span>
                      {voiceProfile
                        ? `${profile.label}: ${voiceProfile.labelNote || `adapted floor ${voiceProfile.targetFloor}`}`
                        : `"${targetWord}" accepts "${wordOverride?.acceptedHeard.join('", "')}"`}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-300">
                    Saved on this device. Speak Mode uses this automatically on future words.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={listening}
                  onClick={() => handleToggleGrace(false)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-600 bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:border-rose-400 hover:text-white cursor-pointer disabled:opacity-40"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-100">
                    {graceOn ? (
                      <ShieldCheck className="h-4 w-4 text-emerald-300 shrink-0" />
                    ) : (
                      <SlidersHorizontal className="h-4 w-4 text-cyan-300 shrink-0" />
                    )}
                    <span>Ease mic strictness for {profile.label}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-300">
                    Gives extra room for quiet mics, accents, or speech differences while still checking for clear sound swaps.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={listening}
                  onClick={() => handleToggleGrace(!graceOn)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40 ${
                    graceOn
                      ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
                      : 'border border-cyan-400/60 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/30'
                  }`}
                >
                  {graceOn ? 'Grace On' : 'Turn On'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-slate-800">
          {source === 'forge' && onSwitchToTap ? (
            <button
              type="button"
              disabled={listening}
              onClick={() => {
                sound.sfx('tap');
                onSwitchToTap();
              }}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-cyan-400 hover:text-white cursor-pointer disabled:opacity-40"
            >
              Use Listen &amp; Pick for now
            </button>
          ) : (
            <span className="text-[11px] text-slate-400">
              Voice adaptations are saved on this device.
            </span>
          )}

          <button
            type="button"
            disabled={listening}
            onClick={() => {
              sound.sfx('select');
              onClose(passed || graceOn || hasAnyAdaptation);
            }}
            className="rounded-lg bg-cyan-400 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300 cursor-pointer disabled:opacity-40"
          >
            {source === 'settings' ? 'Done' : 'Back to Battle'}
          </button>
        </div>
      </div>
    </div>
  );
};
