import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  AudioLines,
  Flame,
  FlaskConical,
  Languages,
  Mic,
  SlidersHorizontal,
  Sparkles,
  Volume2,
} from 'lucide-react';
import {
  FORGE_CONFIG,
  getPatternRule,
  LevelConfig,
  PatternKey,
  WordEntry,
} from '../data/level1';
import { getWordGloss } from '../data/ellSpanish';
import { sound } from '../lib/audio';
import { countActiveEllSupports, GameSettings } from '../lib/metrics';
import { speech } from '../lib/speech';
import { QuickVoiceCheckModal } from './QuickVoiceCheckModal';
import { SoundRuleModal } from './SoundRuleModal';

export interface ForgeStats {
  forged: number;
  firstTry: number;
  crystals: number;
  help: number;
  misses: number;
  runes: number;
  runeFirst: number;
  practice: string[];
  slowBlendUsed?: number;
  meaningTapped?: number;
  voiceFitMatches?: number;
}

interface RecentForgeItem {
  word: string;
  how: string;
  amount: number;
}

export type SimProfileId = 'fluent' | 'steady' | 'guided';

export interface SimRoundResult {
  profile: SimProfileId;
  label: string;
  wordCount: number;
  crystals: number;
  cleanCount: number;
  megas: number;
  nextStreak: number;
  helpCount: number;
  shownCount: number;
  runeCount: number;
  runeClean: number;
}

export interface PlacementForgeGuide {
  stageNum: number;
  stageTotal: number;
  stageLabel: string;
  wordNum: number;
  wordTotal: number;
  forcedWord: WordEntry | null;
  settled: boolean;
  settledLevelLabel?: string;
  practicePool?: WordEntry[];
}

interface RuneForgePanelProps {
  level: LevelConfig;
  settings: GameSettings;
  unlockedPatterns?: PatternKey[];
  placementGuide?: PlacementForgeGuide | null;
  disabled: boolean;
  azureStatus: 'checking' | 'azure' | 'chrome' | 'off';
  tutorialHighlight?: boolean;
  lastWordWarning?: {
    title: string;
    body: string;
    urgent?: boolean;
  } | null;
  teacherMode?: boolean;
  onPay: (amount: number) => void;
  onWordForged: (pattern: PatternKey, firstTryClean: boolean, stats: ForgeStats) => void;
  onMegaForge: () => void;
  onSimulateRound: (result: SimRoundResult, stats: ForgeStats) => void;
  onRuleHold: (hold: boolean) => void;
  onOpenEll: () => void;
}

function computeSimRound(
  profile: SimProfileId,
  wordCount: number,
  runeRate: number,
  currentStreak: number
): SimRoundResult {
  const runeCount = Math.round(wordCount * runeRate);
  const realCount = Math.max(0, wordCount - runeCount);
  const realHelpPay = Math.round(FORGE_CONFIG.real * FORGE_CONFIG.helpShare);
  const runeHelpPay = Math.round(FORGE_CONFIG.rune * FORGE_CONFIG.helpShare);

  if (profile === 'fluent') {
    const totalStreak = currentStreak + wordCount;
    const megas = Math.floor(totalStreak / FORGE_CONFIG.megaPips);
    const nextStreak = totalStreak % FORGE_CONFIG.megaPips;
    const crystals =
      realCount * FORGE_CONFIG.speak +
      runeCount * FORGE_CONFIG.rune +
      megas * FORGE_CONFIG.mega;
    return {
      profile,
      label: 'Fluent',
      wordCount,
      crystals,
      cleanCount: wordCount,
      megas,
      nextStreak,
      helpCount: 0,
      shownCount: 0,
      runeCount,
      runeClean: runeCount,
    };
  }

  if (profile === 'steady') {
    const realClean = Math.round(realCount * 0.6);
    const realShown = Math.max(1, Math.round(realCount * 0.14));
    const realHelp = Math.max(0, realCount - realClean - realShown);
    const runeClean = Math.round(runeCount * 0.6);
    const runeShown = 0;
    const runeHelp = Math.max(0, runeCount - runeClean);
    const crystals =
      realClean * FORGE_CONFIG.speak +
      realHelp * realHelpPay +
      realShown * FORGE_CONFIG.shown +
      runeClean * FORGE_CONFIG.rune +
      runeHelp * runeHelpPay +
      runeShown * FORGE_CONFIG.shown;
    return {
      profile,
      label: 'Steady',
      wordCount,
      crystals,
      cleanCount: realClean + runeClean,
      megas: 0,
      nextStreak: 1,
      helpCount: realHelp + runeHelp,
      shownCount: realShown + runeShown,
      runeCount,
      runeClean,
    };
  }

  const realClean = Math.round(realCount * 0.28);
  const realShown = Math.round(realCount * 0.3);
  const realHelp = Math.max(0, realCount - realClean - realShown);
  const runeClean = 0;
  const runeShown = Math.min(runeCount, 1);
  const runeHelp = Math.max(0, runeCount - runeShown);
  const crystals =
    realClean * FORGE_CONFIG.speak +
    realHelp * realHelpPay +
    realShown * FORGE_CONFIG.shown +
    runeClean * FORGE_CONFIG.rune +
    runeHelp * runeHelpPay +
    runeShown * FORGE_CONFIG.shown;
  return {
    profile,
    label: 'Guided',
    wordCount,
    crystals,
    cleanCount: realClean + runeClean,
    megas: 0,
    nextStreak: 0,
    helpCount: realHelp + runeHelp,
    shownCount: realShown + runeShown,
    runeCount,
    runeClean,
  };
}

function getWordPattern(entry: WordEntry, fallback: PatternKey): PatternKey {
  if (entry.pattern) return entry.pattern;
  const m = entry.w.match(/[aeiou]/);
  return (m ? m[0] : fallback) as PatternKey;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const RuneForgePanel: React.FC<RuneForgePanelProps> = ({
  level,
  settings,
  unlockedPatterns = [],
  placementGuide = null,
  disabled,
  azureStatus,
  tutorialHighlight = false,
  lastWordWarning = null,
  teacherMode = false,
  onPay,
  onWordForged,
  onMegaForge,
  onSimulateRound,
  onRuleHold,
  onOpenEll,
}) => {
  const [cur, setCur] = useState<WordEntry>(() => placementGuide?.forcedWord || level.realWords[0]);
  const [choices, setChoices] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [eliminated, setEliminated] = useState<number[]>([]);
  const [shakeIdx, setShakeIdx] = useState<number | null>(null);
  const [tries, setTries] = useState(0);
  const [speakTries, setSpeakTries] = useState(0);
  const [usedHelp, setUsedHelp] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [showTiles, setShowTiles] = useState(false);
  const [showMeaning, setShowMeaning] = useState(false);
  const [blendTileIdx, setBlendTileIdx] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [scoreDetail, setScoreDetail] = useState<string>('');
  const [streak, setStreak] = useState(0);
  const [recent, setRecent] = useState<RecentForgeItem[]>([]);
  const [feedback, setFeedback] = useState<string>(
    'Read the word. Say it into the mic or tap each sound to pick the match.'
  );
  const [heatLeft, setHeatLeft] = useState(0);
  const [ruleModal, setRuleModal] = useState<{
    word: string;
    pattern: PatternKey;
    tiles?: string[];
    targetTileIdx?: number;
    full: boolean;
  } | null>(null);
  const [voiceCheckModal, setVoiceCheckModal] = useState<{
    pattern: PatternKey;
    word?: string;
  } | null>(null);
  const [voiceCheckOffer, setVoiceCheckOffer] = useState<{
    pattern: PatternKey;
    word?: string;
  } | null>(null);
  const [sessionShowChoices, setSessionShowChoices] = useState(false);
  const [graceVersion, setGraceVersion] = useState(0);

  const statsRef = useRef<ForgeStats>({
    forged: 0,
    firstTry: 0,
    crystals: 0,
    help: 0,
    misses: 0,
    runes: 0,
    runeFirst: 0,
    practice: [],
    slowBlendUsed: 0,
    meaningTapped: 0,
    voiceFitMatches: 0,
  });
  const recentWordsRef = useRef<string[]>([]);
  const fastGuessesRef = useRef<number[]>([]);
  const overheatsRef = useRef(0);
  const shownAtRef = useRef(performance.now());
  const ruleSeenRef = useRef<Record<string, boolean>>({});
  const practiceQueueRef = useRef<WordEntry[]>([]);
  const spokenMissCountRef = useRef<Record<string, number>>({});
  const voiceCheckOfferedRef = useRef<Set<string>>(new Set());
  const unlockedPatternsRef = useRef<PatternKey[]>(unlockedPatterns);
  unlockedPatternsRef.current = unlockedPatterns;
  const placementGuideRef = useRef<PlacementForgeGuide | null>(placementGuide);
  placementGuideRef.current = placementGuide;

  const loadWordEntry = useCallback((next: WordEntry) => {
    recentWordsRef.current = [next.w, ...recentWordsRef.current].slice(0, 6);
    setCur(next);
    setChoices(shuffle([next.w, next.options[0], next.options[1]]));
    setSelectedIdx(null);
    setEliminated([]);
    setShakeIdx(null);
    setTries(0);
    setSpeakTries(0);
    setUsedHelp(false);
    setRevealed(false);
    setShowTiles(false);
    setShowMeaning(false);
    setBlendTileIdx(null);
    shownAtRef.current = performance.now();
  }, []);

  const pickNextWord = useCallback(() => {
    const pg = placementGuideRef.current;
    if (pg && !pg.settled && pg.forcedWord) {
      loadWordEntry(pg.forcedWord);
      return;
    }

    let next: WordEntry;
    if (pg && pg.settled && pg.practicePool && pg.practicePool.length > 0) {
      const fresh = pg.practicePool.filter((w) => !recentWordsRef.current.includes(w.w));
      const candidates = fresh.length ? fresh : pg.practicePool;
      next = candidates[Math.floor(Math.random() * candidates.length)];
    } else if (practiceQueueRef.current.length > 0 && Math.random() < 0.35) {
      next = practiceQueueRef.current.shift()!;
    } else {
      const wantRune = Math.random() < level.runeRate;
      const pool = wantRune ? level.runes : level.realWords;
      const fresh = pool.filter((w) => !recentWordsRef.current.includes(w.w));
      let candidates = fresh.length ? fresh : pool;

      // Once some locks are already sealed, focus 75% of words on the remaining open locks
      const open = unlockedPatternsRef.current;
      if (open.length > 0 && open.length < level.vowels.length && Math.random() < 0.75) {
        const focused = candidates.filter((w) =>
          open.includes(getWordPattern(w, level.vowels[0]))
        );
        if (focused.length > 0) {
          candidates = focused;
        }
      }

      next = candidates[Math.floor(Math.random() * candidates.length)];
    }

    loadWordEntry(next);
  }, [level, loadWordEntry]);

  useEffect(() => {
    recentWordsRef.current = [];
    practiceQueueRef.current = [];
    spokenMissCountRef.current = {};
    voiceCheckOfferedRef.current.clear();
    setVoiceCheckOffer(null);
    setSessionShowChoices(false);
    pickNextWord();
  }, [pickNextWord]);

  // Keep Basic Training locked strictly to the active diagnostic probe word,
  // and switch cleanly to confidence-zone practice once placement settles.
  useEffect(() => {
    if (!placementGuide) return;
    if (!placementGuide.settled && placementGuide.forcedWord) {
      loadWordEntry(placementGuide.forcedWord);
    } else if (placementGuide.settled) {
      pickNextWord();
    }
  }, [
    placementGuide?.stageNum,
    placementGuide?.wordNum,
    placementGuide?.settled,
    placementGuide?.forcedWord?.w,
    loadWordEntry,
    pickNextWord,
  ]);

  // Overheat countdown timer
  useEffect(() => {
    if (heatLeft <= 0) return;
    const t = window.setInterval(() => {
      setHeatLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [heatLeft]);

  const liveEngine = azureStatus === 'checking' ? 'checking' : speech.engine();

  const canUseMic = useMemo(() => {
    if (azureStatus === 'off' || liveEngine === 'off') return false;
    return speech.canCheck(cur, settings.speakRunes);
  }, [azureStatus, liveEngine, cur, settings.speakRunes]);

  const activePattern = getWordPattern(cur, level.vowels[0]);
  const activePatternHasGrace = useMemo(
    () => speech.getPatternGrace(activePattern),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activePattern, graceVersion]
  );
  const activeVoiceProfile = useMemo(
    () => speech.getVoiceProfile(activePattern),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activePattern, graceVersion]
  );
  const activeWordOverride = useMemo(
    () => speech.getWordVoiceOverride(cur.w),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cur.w, graceVersion]
  );
  const hasActiveVoiceFit = activePatternHasGrace || Boolean(activeWordOverride);

  const hideTapChoices =
    canUseMic && !revealed && !sessionShowChoices && speakTries < settings.speakFirst;

  const currentPayout = (mode: 'tap' | 'speak') => {
    if (revealed) return FORGE_CONFIG.shown;
    const base =
      cur.kind === 'rune'
        ? FORGE_CONFIG.rune
        : mode === 'speak'
        ? FORGE_CONFIG.speak
        : FORGE_CONFIG.real;
    if (tries > 0 || usedHelp) {
      const refBase = cur.kind === 'rune' ? FORGE_CONFIG.rune : FORGE_CONFIG.real;
      return Math.round(refBase * FORGE_CONFIG.helpShare);
    }
    return base;
  };

  const triggerOverheatIfSpamming = () => {
    const now = performance.now();
    if (now - shownAtRef.current < FORGE_CONFIG.fastGuessMs) {
      fastGuessesRef.current.push(now);
      fastGuessesRef.current = fastGuessesRef.current.filter((ts) => now - ts < 9000);
      if (fastGuessesRef.current.length >= 2) {
        fastGuessesRef.current = [];
        overheatsRef.current += 1;
        const secs =
          overheatsRef.current === 1 ? FORGE_CONFIG.cooldownFirst : FORGE_CONFIG.cooldownLater;
        setHeatLeft(secs);
        setFeedback('The forge is overheating. Slow down and read each word.');
        sound.speakUI('forge.overheat', 'The forge is overheating. Read each one.');
      }
    }
  };

  const completeForge = useCallback(
    (mode: 'tap' | 'speak', usedVoiceFit = false) => {
      const firstClean = tries === 0 && !usedHelp && !revealed;
      let amount = currentPayout(mode);
      let mega = false;
      const nextStreak = firstClean ? streak + 1 : 0;

      if (nextStreak >= FORGE_CONFIG.megaPips) {
        mega = true;
        amount += FORGE_CONFIG.mega;
        setStreak(0);
      } else {
        setStreak(nextStreak);
      }

      const st = statsRef.current;
      st.forged += 1;
      st.crystals += amount;
      if (firstClean) st.firstTry += 1;
      if (usedHelp) st.help += 1;
      if (usedVoiceFit) st.voiceFitMatches = (st.voiceFitMatches || 0) + 1;
      if (cur.kind === 'rune') {
        st.runes += 1;
        if (firstClean) st.runeFirst += 1;
      }
      if (!firstClean && !st.practice.includes(cur.w)) {
        st.practice.push(cur.w);
      }
      if (revealed) {
        practiceQueueRef.current.push(cur);
      }

      const howLabel = revealed
        ? 'shown'
        : mode === 'speak' && firstClean
        ? 'said it, first try'
        : cur.kind === 'rune' && firstClean
        ? 'rune, first try'
        : usedHelp
        ? 'heard it first'
        : tries > 0
        ? 'second try'
        : 'first try';

      setRecent((prev) => [{ word: cur.w, how: howLabel, amount }, ...prev].slice(0, 4));
      onPay(amount);

      const pattern = getWordPattern(cur, level.vowels[0]);
      onWordForged(pattern, firstClean, { ...st, practice: [...st.practice] });

      if (mega) {
        setFeedback(`Mega Forge! Radiant light blasts every rift creature (+${FORGE_CONFIG.mega} crystals).`);
        sound.speakUI('forge.mega', 'Mega Forge! Light blasts the rift creatures.');
        onMegaForge();
      } else if (revealed) {
        sound.sfx('select');
        setFeedback("Forged. You'll see this word again soon.");
      } else if (tries > 0) {
        sound.sfx('select');
        setFeedback(
          usedVoiceFit
            ? 'Second try, and it landed (matched your voice profile).'
            : 'Second try, and it landed.'
        );
      } else if (usedHelp) {
        sound.sfx('select');
        setFeedback('Forged. Using the speaker is a smart move.');
      } else {
        sound.sfx('hit');
        if (usedVoiceFit) {
          setFeedback('Clean read (matched your voice profile).');
        } else {
          const lines = ['Clean read.', 'Forged.', 'Sharp.', 'Locked in.'];
          setFeedback(lines[st.forged % lines.length]);
        }
      }

      // During active Basic Training tiers, the parent updates placementGuide.forcedWord immediately
      if (!placementGuideRef.current || placementGuideRef.current.settled) {
        pickNextWord();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cur, onMegaForge, onPay, onWordForged, pickNextWord, revealed, streak, tries, usedHelp]
  );

  const simPreviews = useMemo(
    () => ({
      fluent: computeSimRound('fluent', level.waveEvery, level.runeRate, streak),
      steady: computeSimRound('steady', level.waveEvery, level.runeRate, streak),
      guided: computeSimRound('guided', level.waveEvery, level.runeRate, streak),
    }),
    [level.waveEvery, level.runeRate, streak]
  );

  const handleSimulate = (profile: SimProfileId) => {
    if (disabled || listening) return;
    const sim = simPreviews[profile];
    const st = statsRef.current;
    st.forged += sim.wordCount;
    st.crystals += sim.crystals;
    st.firstTry += sim.cleanCount;
    st.help += sim.helpCount;
    st.misses += Math.max(0, sim.wordCount - sim.cleanCount);
    st.runes += sim.runeCount;
    st.runeFirst += sim.runeClean;

    setStreak(sim.nextStreak);
    setRecent((prev) =>
      [
        {
          word: `${sim.wordCount}w`,
          how: `${sim.label} sim`,
          amount: sim.crystals,
        },
        ...prev,
      ].slice(0, 4)
    );
    setFeedback(
      `${sim.label} ${sim.wordCount}-word round simulated (+${sim.crystals} crystals). Build towers, then start the wave.`
    );
    sound.sfx(sim.megas > 0 ? 'mega' : 'hit');
    onSimulateRound(sim, { ...st, practice: [...st.practice] });
  };

  const handleHearWord = () => {
    if (disabled || listening) return;
    setUsedHelp(true);
    setBlendTileIdx(null);
    sound.sfx('tap');
    sound.speakWord(cur.w);
  };

  const handleHearWordSlow = () => {
    if (disabled || listening) return;
    setUsedHelp(true);
    setShowTiles(true);
    statsRef.current.slowBlendUsed = (statsRef.current.slowBlendUsed || 0) + 1;
    sound.sfx('tap');
    void sound.speakWordSlow(cur.w, cur.tiles, setBlendTileIdx);
  };

  const handlePickSound = (idx: number) => {
    if (disabled || heatLeft > 0 || listening || eliminated.includes(idx)) return;
    setSelectedIdx(idx);
    sound.sfx('tap');
    sound.speakWord(choices[idx]);
  };

  const openRuleForCurrent = (forceFull = false) => {
    const p = getWordPattern(cur, level.vowels[0]);
    const isFull = forceFull || !ruleSeenRef.current[p];
    ruleSeenRef.current[p] = true;
    onRuleHold(true);
    setRuleModal({
      word: cur.w,
      pattern: p,
      tiles: cur.tiles,
      targetTileIdx: cur.targetTileIdx,
      full: isFull,
    });
  };

  const handleForgeTap = () => {
    if (disabled || heatLeft > 0 || listening || selectedIdx === null) return;
    const picked = choices[selectedIdx];
    if (picked === cur.w) {
      completeForge('tap');
      return;
    }

    // Wrong choice: never lose crystals, teach with Sound Rule on first miss
    const nextTries = tries + 1;
    setTries(nextTries);
    statsRef.current.misses += 1;
    setEliminated((prev) => [...prev, selectedIdx]);
    setSelectedIdx(null);
    setShakeIdx(selectedIdx);
    window.setTimeout(() => setShakeIdx(null), 350);
    sound.sfx('soft');
    triggerOverheatIfSpamming();

    if (nextTries === 1) {
      setShowTiles(true);
      const pat = getWordPattern(cur, level.vowels[0]);
      setFeedback(
        pat.length > 1
          ? `Look at the "${pat}" sound, then try again.`
          : 'Look at the vowel sound, then try again.'
      );
      openRuleForCurrent(false);
    } else {
      setRevealed(true);
      setShowTiles(true);
      const correctIdx = choices.indexOf(cur.w);
      setSelectedIdx(correctIdx);
      setFeedback('Here it is. Listen, then tap Forge.');
      sound.speakWord(cur.w);
    }
  };

  const openVoiceCheck = (pat: PatternKey, word?: string) => {
    sound.stopSpeaking();
    speech.stop();
    onRuleHold(true);
    setVoiceCheckModal({ pattern: pat, word });
  };

  const handleSpeak = async () => {
    if (disabled || heatLeft > 0 || !canUseMic) return;
    if (listening) {
      // Clicking again while listening submits right away for fast readers
      speech.submitNow();
      return;
    }
    const pat = getWordPattern(cur, level.vowels[0]);
    sound.stopSpeaking();
    sound.duck(2);
    setListening(true);
    setMicReady(false);
    setMicLevel(0);
    setFeedback('Opening mic...');

    const res = await speech.listen(
      { ...cur, pattern: pat },
      {
        onReady: () => {
          setMicReady(true);
          setFeedback('Speak now... tap again when done.');
        },
        onLevel: (lvl) => setMicLevel(lvl),
      }
    );
    sound.duck(0);
    setListening(false);
    setMicReady(false);
    setMicLevel(0);

    const detailLine = res.heard
      ? `Heard "${res.heard}" · ${res.engine}: ${res.note}`
      : `${res.engine}: ${res.note}`;
    setScoreDetail(detailLine);

    if (res.outcome === 'match') {
      completeForge('speak', Boolean(res.diagnostic?.usedProfile));
      return;
    }

    if (res.outcome === 'down') {
      setFeedback(res.reason || 'Microphone unavailable. Tap mode works for every word.');
      return;
    }

    if (res.outcome === 'again' || res.outcome === 'switch') {
      setFeedback(
        res.outcome === 'again'
          ? 'The checker missed that one. Press the mic and say it again.'
          : 'Speak mode could not check this word right now. Use the sound choices below.'
      );
      return;
    }

    if (res.outcome === 'nothing') {
      setFeedback('The mic caught no word. Press SAY IT and read it clearly.');
      return;
    }

    const nextTries = tries + 1;
    setTries(nextTries);
    setSpeakTries((s) => s + 1);
    statsRef.current.misses += 1;
    sound.sfx('soft');

    // Cumulative genuine spoken misses for this sound in the current level
    const nextPatMisses = (spokenMissCountRef.current[pat] || 0) + 1;
    spokenMissCountRef.current[pat] = nextPatMisses;

    const shouldAutoOpenVoiceCheck =
      nextPatMisses >= 3 && !voiceCheckOfferedRef.current.has(pat);

    if (nextPatMisses >= 3) {
      setVoiceCheckOffer({ pattern: pat, word: cur.w });
    }

    if (shouldAutoOpenVoiceCheck) {
      voiceCheckOfferedRef.current.add(pat);
      setShowTiles(true);
      if (nextTries >= 2) {
        setRevealed(true);
        const correctIdx = choices.indexOf(cur.w);
        if (correctIdx >= 0) setSelectedIdx(correctIdx);
      }
      setFeedback(
        `Let's run a quick mic check on ${getPatternRule(pat).label} so Speak Mode fits your voice.`
      );
      openVoiceCheck(pat, cur.w);
      return;
    }

    if (nextTries === 1) {
      setShowTiles(true);
      setFeedback(
        pat.length > 1
          ? `Let's check the "${pat}" sound, then read it again.`
          : "Let's check the vowel sound, then read it again."
      );
      openRuleForCurrent(false);
    } else {
      setRevealed(true);
      setShowTiles(true);
      const correctIdx = choices.indexOf(cur.w);
      if (correctIdx >= 0) setSelectedIdx(correctIdx);
      setFeedback('Listen to the word, then say it or tap Forge.');
      sound.speakWord(cur.w);
    }
  };

  // Keyboard shortcuts (1, 2, 3, F, M, H)
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (disabled || ruleModal || voiceCheckModal || heatLeft > 0) return;
      if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) return;
      if (ev.key === '1' || ev.key === '2' || ev.key === '3') {
        if (!hideTapChoices) handlePickSound(Number(ev.key) - 1);
      } else if (ev.key === 'f' || ev.key === 'F') {
        if (!hideTapChoices && selectedIdx !== null) handleForgeTap();
      } else if (ev.key === 'm' || ev.key === 'M') {
        if (canUseMic && !listening) handleSpeak();
      } else if (ev.key === 'h' || ev.key === 'H') {
        handleHearWord();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const textScaleClass =
    settings.textSize === 'xlarge'
      ? 'text-5xl'
      : settings.textSize === 'large'
      ? 'text-4xl'
      : 'text-4xl';

  return (
    <>
      <aside
        className={`flex h-full w-[316px] xl:w-[344px] shrink-0 flex-col overflow-y-auto border-l-2 bg-[#151030] p-3 text-slate-100 select-none ${
          tutorialHighlight
            ? 'border-amber-300 shadow-[inset_0_0_24px_rgba(251,191,36,0.22)]'
            : 'border-purple-500/60'
        }`}
      >
        {/* Header, Español Button & Streak */}
        <div className="flex items-center justify-between gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => sound.speakUI('forge.title', 'Rune Forge')}
              aria-label="Hear Rune Forge"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-purple-400/60 bg-[#251d4d] text-cyan-300 hover:border-cyan-300 cursor-pointer"
            >
              <Volume2 className="h-3.5 w-3.5" />
            </button>
            <h2 className="font-display text-sm font-extrabold tracking-wider text-purple-100 uppercase truncate">
              Rune Forge
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {(() => {
              const ellCount = countActiveEllSupports(settings);
              return (
                <button
                  type="button"
                  disabled={listening}
                  onClick={() => {
                    sound.stopSpeaking();
                    sound.sfx('tap');
                    onOpenEll();
                  }}
                  title="Español / ELL Accommodations"
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                    ellCount > 0
                      ? 'border-emerald-400/75 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30'
                      : 'border-cyan-400/50 bg-[#231b4a] text-cyan-200 hover:border-cyan-300 hover:text-white'
                  }`}
                >
                  <Languages className="h-3 w-3 shrink-0" />
                  <span>Español</span>
                </button>
              );
            })()}

            <div className="flex items-center gap-1 rounded-full border border-amber-400/70 bg-[#271b48] px-2 py-0.5 font-tabular text-xs font-extrabold text-amber-300">
              <Flame className="h-3.5 w-3.5 text-amber-400 fill-amber-400/40" />
              <span>x{streak}</span>
            </div>
          </div>
        </div>

        {/* Mega Forge Progress Pips */}
        <div className="mt-2 shrink-0">
          <div className="flex gap-1">
            {Array.from({ length: FORGE_CONFIG.megaPips }).map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  idx < streak ? 'bg-amber-400' : 'bg-[#2c2254]'
                }`}
              />
            ))}
          </div>
          <p className="mt-1 text-[11px] text-purple-200/80">
            {FORGE_CONFIG.megaPips - streak} more for Mega Forge (+{FORGE_CONFIG.mega})
          </p>
        </div>

        {/* Last-Word Build Warning right above the word so students never miss it */}
        {lastWordWarning && (
          <div
            role="status"
            className={`mt-2 flex items-start gap-2 rounded-xl border-2 px-2.5 py-2 shrink-0 ${
              lastWordWarning.urgent
                ? 'border-amber-300 bg-amber-500/25 text-amber-50 animate-tutorial-pulse'
                : 'border-amber-400/85 bg-amber-500/18 text-amber-100'
            }`}
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <div className="min-w-0 leading-snug">
              <div className="text-xs font-extrabold text-amber-200">
                {lastWordWarning.title}
              </div>
              <div className="mt-0.5 text-[11px] text-amber-100/90">
                {lastWordWarning.body}
              </div>
              {settings.spanishCaptions && (
                <div className="mt-0.5 text-[10px] font-medium text-cyan-200/95">
                  Construye o mejora torres antes de la siguiente palabra.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Basic Training Tier Progress Line */}
        {placementGuide && (
          <div className="mt-2 rounded-xl border border-emerald-400/45 bg-emerald-950/35 px-2.5 py-1.5 text-[11px] leading-snug shrink-0">
            {placementGuide.settled ? (
              <div className="font-semibold text-emerald-200">
                Starting Level Ready:{' '}
                <span className="text-white">{placementGuide.settledLevelLabel}</span>
                <span className="text-emerald-300/80"> · Finish the Graduation Wave</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-1 text-emerald-100">
                <span className="font-bold text-emerald-300">
                  Tier {placementGuide.stageNum}/{placementGuide.stageTotal}: {placementGuide.stageLabel}
                </span>
                <span className="font-tabular font-extrabold text-cyan-200">
                  Word {placementGuide.wordNum} of {placementGuide.wordTotal}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Target Word Box (Zero Timers, Compact & Crisp) */}
        <div className="mt-2 flex flex-col items-center justify-center rounded-2xl border-2 border-purple-400/60 bg-[#1c1540] px-3 py-2.5 shadow-inner shrink-0">
          <div className="flex w-full items-center justify-between gap-2">
            <div className="text-[11px] font-bold text-amber-300 truncate">
              {cur.kind === 'rune'
                ? `Rune (+${FORGE_CONFIG.rune})`
                : getPatternRule(getWordPattern(cur, level.vowels[0])).label}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {settings.slowBlendAudio && (
                <button
                  type="button"
                  onClick={handleHearWordSlow}
                  title="Slow Blend: hear each sound clearly, then the whole word."
                  aria-label="Hear slow sound blend"
                  className={`flex h-7 items-center justify-center gap-1 rounded-lg border px-2 text-[10px] font-bold transition-colors cursor-pointer ${
                    blendTileIdx !== null
                      ? 'border-cyan-300 bg-cyan-500/30 text-white'
                      : 'border-emerald-400/60 bg-emerald-950/55 text-emerald-200 hover:border-cyan-300 hover:text-white'
                  }`}
                >
                  <AudioLines className="h-3.5 w-3.5" />
                  <span>Slow</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleHearWord}
                title="Hear the word. You still get crystals."
                aria-label="Hear the word"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-purple-400/60 bg-[#2a2159] text-cyan-300 hover:border-cyan-300 hover:text-white cursor-pointer"
              >
                <Volume2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {showTiles ? (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              {(() => {
                const tileArr = cur.tiles || cur.w.split('');
                const curPat = String(cur.pattern || '');
                const isSilentEPattern = /^[aiou]_e$/.test(curPat);
                return tileArr.map((tile, idx) => {
                  const isTarget = idx === (cur.targetTileIdx ?? 1);
                  const isSilentE = isSilentEPattern && idx === tileArr.length - 1 && tile.toLowerCase() === 'e';
                  const isBlendingNow = blendTileIdx === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        sound.speakPhoneme(
                          isSilentEPattern && (isTarget || isSilentE) ? curPat : tile
                        )
                      }
                      title={
                        isSilentE
                          ? 'Silent e makes the vowel say its long name'
                          : 'Tap to hear this sound'
                      }
                      className={`flex h-12 min-w-12 px-2 items-center justify-center rounded-xl border-2 font-reading text-2xl sm:text-3xl font-bold transition-transform cursor-pointer ${
                        isBlendingNow
                          ? 'scale-105 border-cyan-300 bg-cyan-400/30 text-white shadow-[0_0_12px_rgba(34,211,238,0.55)]'
                          : isSilentE
                          ? 'border-dashed border-amber-400/75 bg-amber-500/10 text-amber-200/80'
                          : isTarget
                          ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                          : 'border-purple-400/60 bg-[#130e2b] text-white'
                      }`}
                    >
                      {tile}
                    </button>
                  );
                });
              })()}
            </div>
          ) : (
            <div className={`mt-1.5 font-reading ${textScaleClass} font-bold tracking-wider text-white leading-tight`}>
              {cur.w}
            </div>
          )}

          {/* Optional Spanish Support & Tap-for-Meaning Gloss */}
          {settings.spanish && cur.kind === 'rune' && (
            <div className="mt-2 text-[11px] font-medium text-cyan-200/85">
              Runa mágica · palabra inventada
            </div>
          )}
          {settings.spanish && cur.kind !== 'rune' && (() => {
            const gloss = getWordGloss(cur.w, cur.es, cur.cognate);
            if (!gloss) return null;
            return (
              <div className="mt-2 flex w-full flex-col items-center">
                <button
                  type="button"
                  onClick={() => {
                    statsRef.current.meaningTapped = (statsRef.current.meaningTapped || 0) + 1;
                    sound.speakWord(gloss.es, 'es');
                    if (gloss.enDef) setShowMeaning((prev) => !prev);
                  }}
                  title={
                    gloss.enDef
                      ? 'Tap to hear in Spanish and show plain-English meaning'
                      : 'Tap to hear in Spanish'
                  }
                  className="inline-flex flex-wrap items-center justify-center gap-1.5 rounded-lg px-2 py-0.5 text-xs text-cyan-200 hover:bg-cyan-500/10 hover:text-white transition-colors cursor-pointer"
                >
                  <Volume2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span className="font-semibold">{gloss.es}</span>
                  {gloss.cognate && <span className="text-[11px] text-amber-300">(cognate)</span>}
                  {gloss.enDef && (
                    <span className="text-[10px] font-semibold text-cyan-300/85 underline decoration-cyan-400/50 underline-offset-2">
                      {showMeaning ? 'Hide' : 'Meaning'}
                    </span>
                  )}
                </button>
                {showMeaning && gloss.enDef && (
                  <div className="mt-1.5 w-full rounded-lg border border-cyan-400/35 bg-[#120e2c]/95 px-2.5 py-1.5 text-center text-[11px] leading-snug text-cyan-100">
                    {gloss.enDef}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Speak Mode Button with Live Mic Level Meter */}
        {canUseMic && (
          <button
            type="button"
            disabled={disabled || heatLeft > 0}
            onClick={handleSpeak}
            className={`relative mt-2 flex w-full shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl border-2 px-3 py-2.5 text-sm font-extrabold tracking-wide transition-colors cursor-pointer shadow-lg ${
              listening
                ? 'border-rose-300 bg-rose-600 text-white'
                : 'border-emerald-300/80 bg-emerald-600 text-white hover:bg-emerald-500'
            } ${disabled || heatLeft > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="relative z-10 flex items-center justify-center gap-2">
              <Mic className="h-4 w-4" />
              <span>
                {listening ? (micReady ? 'SPEAK NOW (TAP TO SEND)' : 'STARTING MIC...') : 'SAY IT'}
              </span>
              {!listening && (
                <span className="font-tabular text-xs text-cyan-200">+{currentPayout('speak')}</span>
              )}
            </div>
            {listening && (
              <div className="relative z-10 mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-rose-950/70">
                <div
                  className="h-full bg-amber-300 transition-[width] duration-75"
                  style={{ width: `${Math.max(6, Math.round(micLevel * 100))}%` }}
                />
              </div>
            )}
          </button>
        )}

        {/* Voice Verification Engine Note */}
        <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-purple-200/75 shrink-0">
          <span>
            {liveEngine === 'azure'
              ? 'Voice check: Azure sound scoring'
              : liveEngine === 'chrome'
              ? 'Voice check: Browser speech (Chrome)'
              : liveEngine === 'checking'
              ? 'Voice check: Connecting...'
              : 'Tap mode active'}
          </span>
          {canUseMic && hasActiveVoiceFit ? (
            <button
              type="button"
              disabled={disabled || listening}
              onClick={() => openVoiceCheck(activePattern, cur.w)}
              className="text-emerald-300 hover:text-emerald-200 font-semibold cursor-pointer disabled:opacity-50"
              title="Speak Mode is adapted for your voice. Click to review."
            >
              {activeWordOverride
                ? 'Word voice fit on'
                : activeVoiceProfile?.mode === 'accommodation'
                ? 'Voice fit on'
                : activeVoiceProfile
                ? 'Voice adapted'
                : 'Mic grace on'}
            </button>
          ) : canUseMic && settings.spanishL1Voice ? (
            <button
              type="button"
              disabled={disabled || listening}
              onClick={onOpenEll}
              className="text-emerald-300 hover:text-emerald-200 font-semibold cursor-pointer disabled:opacity-50"
              title="Spanish L1 Voice Fit is active. Click to adjust."
            >
              Spanish L1 fit
            </button>
          ) : hideTapChoices ? (
            <span className="text-cyan-300">
              Choices in {settings.speakFirst - speakTries}
            </span>
          ) : null}
        </div>

        {/* Tap Mode: 3 Sound Choices + Forge Button */}
        {!hideTapChoices && (
          <div className="mt-2 space-y-2 shrink-0">
            <div className="grid grid-cols-3 gap-1.5">
              {choices.map((ch, idx) => {
                const isSelected = selectedIdx === idx;
                const isElim = eliminated.includes(idx);
                const isCorrectGlow = revealed && ch === cur.w;
                return (
                  <button
                    key={`${cur.w}-${idx}`}
                    type="button"
                    disabled={disabled || heatLeft > 0 || isElim}
                    onClick={() => handlePickSound(idx)}
                    aria-label={`Sound ${idx + 1}`}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border-2 py-2 transition-colors cursor-pointer ${
                      shakeIdx === idx ? 'animate-shake' : ''
                    } ${
                      isElim
                        ? 'border-purple-900/50 bg-[#100c24] text-slate-600 cursor-not-allowed'
                        : isCorrectGlow
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                        : isSelected
                        ? 'border-cyan-300 bg-cyan-500/25 text-white'
                        : 'border-purple-500/50 bg-[#211947] text-slate-100 hover:border-cyan-300/70'
                    }`}
                  >
                    <Volume2 className="h-4 w-4 text-cyan-300" />
                    <span className="font-tabular text-sm font-bold">{idx + 1}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={disabled || heatLeft > 0 || selectedIdx === null}
              onClick={handleForgeTap}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-extrabold transition-colors ${
                selectedIdx !== null && heatLeft === 0 && !disabled
                  ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 cursor-pointer'
                  : 'bg-[#251d4a] text-purple-300/50 cursor-not-allowed'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Forge</span>
              <span className="font-tabular text-xs">+{currentPayout('tap')}</span>
            </button>
          </div>
        )}

        {/* Overheat Warning */}
        {heatLeft > 0 && (
          <div className="mt-2 rounded-xl border border-amber-400/60 bg-amber-500/15 px-3 py-1.5 text-center text-xs font-bold text-amber-200 shrink-0">
            Forge cooling down: {heatLeft}s
          </div>
        )}

        {/* Feedback Line + Live Azure Phoneme Score Detail */}
        <div className="mt-2 rounded-xl border border-purple-500/40 bg-[#1c153d] px-2.5 py-2 text-[11px] leading-snug text-purple-100 shrink-0">
          <div>{feedback}</div>
          {scoreDetail && (
            <div className="mt-1 font-tabular text-[10px] text-cyan-200/85 break-words">
              {scoreDetail}
            </div>
          )}
        </div>

        {/* Adaptive Quick Sound Check CTA (appears after 3 cumulative spoken misses on a sound in this level) */}
        {voiceCheckOffer && canUseMic && (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-cyan-400/50 bg-cyan-500/12 px-2.5 py-2 shrink-0">
            <div className="min-w-0 text-[11px] leading-snug text-cyan-100">
              Mic trouble with{' '}
              <span className="font-bold text-amber-200">
                {getPatternRule(voiceCheckOffer.pattern).label}
              </span>
              ?
            </div>
            <button
              type="button"
              disabled={disabled || listening}
              onClick={() => openVoiceCheck(voiceCheckOffer.pattern, voiceCheckOffer.word)}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-cyan-400 px-2.5 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-cyan-300 cursor-pointer disabled:opacity-50"
            >
              <SlidersHorizontal className="h-3 w-3" />
              <span>Sound Check</span>
            </button>
          </div>
        )}

        {/* Recent Forged Words (all tappable to hear) */}
        <div className="mt-2 pt-2 border-t border-purple-500/40">
          <div className="text-[10px] font-semibold text-purple-200/70 mb-1">
            Recent forged words (tap to hear)
          </div>
          {recent.length === 0 ? (
            <p className="text-[11px] text-purple-300/50">Your forged words show up here.</p>
          ) : (
            <div className="space-y-0.5">
              {recent.map((r, i) => (
                <div
                  key={`${r.word}-${i}`}
                  className="flex items-center justify-between text-[11px] text-purple-100"
                >
                  <button
                    type="button"
                    onClick={() => sound.speakWord(r.word)}
                    className="font-reading font-extrabold text-amber-300 hover:text-cyan-300 cursor-pointer"
                  >
                    {r.word}
                  </button>
                  <span className="text-purple-200/75">{r.how}</span>
                  <span className="font-tabular font-bold text-cyan-300">+{r.amount}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Playtest Economy Simulator (Teacher Mode only) */}
        {teacherMode && (
          <div className="mt-2 pt-2 border-t border-purple-500/35 shrink-0">
            <div className="flex items-center justify-between text-[10px] font-bold text-purple-200/75 mb-1.5">
              <span className="inline-flex items-center gap-1">
                <FlaskConical className="h-3 w-3 text-cyan-300" />
                <span>Playtest · {level.waveEvery} words</span>
              </span>
              <span className="text-[9px] font-semibold text-purple-300/60">
                Won&apos;t launch wave
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                disabled={disabled || listening}
                onClick={() => handleSimulate('fluent')}
                title={`Simulate ${level.waveEvery} clean spoken words (all first try + Mega Forge): +${simPreviews.fluent.crystals} crystals`}
                className="flex flex-col items-center rounded-xl border border-emerald-400/50 bg-emerald-500/15 px-1.5 py-1.5 text-center transition-colors hover:border-emerald-300 hover:bg-emerald-500/25 disabled:opacity-40 cursor-pointer"
              >
                <span className="text-[11px] font-extrabold text-emerald-200 leading-tight">
                  Fluent
                </span>
                <span className="font-tabular text-[11px] font-black text-cyan-200">
                  +{simPreviews.fluent.crystals}
                </span>
              </button>
              <button
                type="button"
                disabled={disabled || listening}
                onClick={() => handleSimulate('steady')}
                title={`Simulate ${level.waveEvery} words (${simPreviews.steady.cleanCount} first try, ${simPreviews.steady.helpCount} with help, ${simPreviews.steady.shownCount} shown): +${simPreviews.steady.crystals} crystals`}
                className="flex flex-col items-center rounded-xl border border-sky-400/50 bg-sky-500/15 px-1.5 py-1.5 text-center transition-colors hover:border-sky-300 hover:bg-sky-500/25 disabled:opacity-40 cursor-pointer"
              >
                <span className="text-[11px] font-extrabold text-sky-200 leading-tight">
                  Steady
                </span>
                <span className="font-tabular text-[11px] font-black text-cyan-200">
                  +{simPreviews.steady.crystals}
                </span>
              </button>
              <button
                type="button"
                disabled={disabled || listening}
                onClick={() => handleSimulate('guided')}
                title={`Simulate ${level.waveEvery} words (${simPreviews.guided.cleanCount} first try, ${simPreviews.guided.helpCount} with help, ${simPreviews.guided.shownCount} shown): +${simPreviews.guided.crystals} crystals`}
                className="flex flex-col items-center rounded-xl border border-amber-400/50 bg-amber-500/15 px-1.5 py-1.5 text-center transition-colors hover:border-amber-300 hover:bg-amber-500/25 disabled:opacity-40 cursor-pointer"
              >
                <span className="text-[11px] font-extrabold text-amber-200 leading-tight">
                  Guided
                </span>
                <span className="font-tabular text-[11px] font-black text-cyan-200">
                  +{simPreviews.guided.crystals}
                </span>
              </button>
            </div>
          </div>
        )}
      </aside>

      {ruleModal && (
        <SoundRuleModal
          word={ruleModal.word}
          pattern={ruleModal.pattern}
          tiles={ruleModal.tiles}
          targetTileIdx={ruleModal.targetTileIdx}
          fullRule={ruleModal.full}
          showSpanishRule={settings.spanishRules}
          onExpandFull={() => setRuleModal((prev) => (prev ? { ...prev, full: true } : null))}
          onClose={() => {
            setRuleModal(null);
            onRuleHold(false);
          }}
        />
      )}

      {voiceCheckModal && (
        <QuickVoiceCheckModal
          pattern={voiceCheckModal.pattern}
          missedWord={voiceCheckModal.word}
          source="forge"
          onGraceChange={() => setGraceVersion((v) => v + 1)}
          onSwitchToTap={() => {
            setSessionShowChoices(true);
            setVoiceCheckModal(null);
            setVoiceCheckOffer(null);
            setFeedback('Listen & Pick choices are open below. You can still use SAY IT anytime.');
            onRuleHold(false);
          }}
          onClose={(passedOrCalibrated) => {
            if (passedOrCalibrated) {
              spokenMissCountRef.current[voiceCheckModal.pattern] = 0;
              setVoiceCheckOffer((prev) =>
                prev && prev.pattern === voiceCheckModal.pattern ? null : prev
              );
            }
            setGraceVersion((v) => v + 1);
            setVoiceCheckModal(null);
            onRuleHold(false);
          }}
        />
      )}
    </>
  );
};
