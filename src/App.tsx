import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Gem } from 'lucide-react';
import {
  CutsceneId,
  DEFENDERS,
  DefenderType,
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  DifficultyId,
  HeroPowerId,
  LevelConfig,
  LevelId,
  LEVELS,
  PatternKey,
} from './data/level1';
import { SPANISH_DEFENDERS } from './data/ellSpanish';
import { BattleEngine, BattleSnapshot } from './game/CanvasBattleEngine';
import { loadGameSprites } from './game/sprites';
import { sound } from './lib/audio';
import {
  clearPatternLocks,
  GameSettings,
  getPatternLocks,
  loadProgress,
  recordPatternRead,
  saveProgress,
  StoredProgress,
} from './lib/metrics';
import { speech } from './lib/speech';
import { BattleHUD, WalkthroughInfo, WaveBannerInfo } from './components/BattleHUD';
import { CutscenePlayer } from './components/CutscenePlayer';
import { EllSupportModal } from './components/EllSupportModal';
import { BattleEndData, ResultsScreen } from './components/ResultsScreen';
import { ForgeStats, RuneForgePanel, SimRoundResult } from './components/RuneForgePanel';
import { SettingsModal } from './components/SettingsModal';
import { TitleScreen } from './components/TitleScreen';

type SceneMode = 'title' | 'cutscene' | 'battle' | 'results';

interface AppState {
  scene: SceneMode;
  activeLevelId: LevelId;
  activeCutscene: CutsceneId;
  cutsceneReturnTo: 'battle' | 'results' | 'title';
  battleKey: number;
  lastResult: BattleEndData | null;
  lastForgeStats: ForgeStats;
  settingsOpen: boolean;
}

type AppAction =
  | { type: 'SELECT_LEVEL'; levelId: LevelId }
  | { type: 'START_WITH_OPENING' }
  | { type: 'START_LEVEL_WITH_OPENING'; levelId: LevelId }
  | { type: 'START_DIRECT_BATTLE' }
  | { type: 'PREVIEW_CUTSCENE'; id: CutsceneId; returnTo: 'title' | 'results' }
  | { type: 'CUTSCENE_DONE' }
  | { type: 'BATTLE_FINISHED'; result: BattleEndData; forgeStats: ForgeStats }
  | { type: 'RETURN_TITLE' }
  | { type: 'SET_SETTINGS_OPEN'; open: boolean };

const EMPTY_FORGE_STATS: ForgeStats = {
  forged: 0,
  firstTry: 0,
  crystals: 0,
  help: 0,
  misses: 0,
  runes: 0,
  runeFirst: 0,
  practice: [],
};

const WALKTHROUGH_STEPS: Omit<WalkthroughInfo, 'stepNum' | 'totalSteps' | 'isLast'>[] = [
  {
    title: 'Pick Your First Defender',
    body: 'Click Archer Tower in the bottom bar (60 crystals).',
    highlight: 'archer',
    canManualNext: false,
  },
  {
    title: 'Place Your Tower',
    body: 'Click any glowing hexagonal stone pad beside the brown trail.',
    highlight: 'pad',
    canManualNext: false,
  },
  {
    title: 'Guard the Trail',
    body: 'You have 40 crystals left. Click Spike Pit below and place it on a dashed circle right on the trail.',
    highlight: 'spike',
    canManualNext: true,
  },
  {
    title: 'Forge Words for Crystals',
    body: 'Look at the Rune Forge on the right. Press SAY IT, or tap sounds 1, 2, 3 and press Forge to earn crystals.',
    highlight: 'forge',
    canManualNext: false,
  },
  {
    title: 'Launch Wave 1',
    body: 'Click Send now on the top bar (or keep forging 10 words) to face Wave 1 from the Rift.',
    highlight: 'wave',
    canManualNext: false,
  },
  {
    title: 'Upgrade Any Defender',
    body: 'Click any tower you built on the map to see its range, upgrade it, or pick a specialty at Level 3.',
    highlight: 'tower',
    canManualNext: true,
  },
  {
    title: 'Rift Locks & Hero Powers',
    body: 'Fill both vertical Rift Locks (a and i) on the left with clean reads to unlock the Final Wave. Use Rally, Meteor, and Freeze on the top bar when charged.',
    highlight: 'locks',
    canManualNext: true,
  },
];

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SELECT_LEVEL':
      return {
        ...state,
        activeLevelId: action.levelId,
      };
    case 'START_WITH_OPENING':
      return {
        ...state,
        scene: 'cutscene',
        activeCutscene: 'opening',
        cutsceneReturnTo: 'battle',
        battleKey: state.battleKey + 1,
        lastForgeStats: { ...EMPTY_FORGE_STATS, practice: [] },
      };
    case 'START_LEVEL_WITH_OPENING':
      return {
        ...state,
        activeLevelId: action.levelId,
        scene: 'cutscene',
        activeCutscene: 'opening',
        cutsceneReturnTo: 'battle',
        battleKey: state.battleKey + 1,
        lastForgeStats: { ...EMPTY_FORGE_STATS, practice: [] },
      };
    case 'START_DIRECT_BATTLE':
      return {
        ...state,
        scene: 'battle',
        battleKey: state.battleKey + 1,
        lastForgeStats: { ...EMPTY_FORGE_STATS, practice: [] },
      };
    case 'PREVIEW_CUTSCENE':
      return {
        ...state,
        scene: 'cutscene',
        activeCutscene: action.id,
        cutsceneReturnTo: action.returnTo,
      };
    case 'CUTSCENE_DONE':
      return {
        ...state,
        scene: state.cutsceneReturnTo,
      };
    case 'BATTLE_FINISHED':
      return {
        ...state,
        scene: 'cutscene',
        activeCutscene: action.result.win ? 'victory' : 'defeat',
        cutsceneReturnTo: 'results',
        lastResult: action.result,
        lastForgeStats: action.forgeStats,
      };
    case 'RETURN_TITLE':
      return {
        ...state,
        scene: 'title',
      };
    case 'SET_SETTINGS_OPEN':
      return {
        ...state,
        settingsOpen: action.open,
      };
    default:
      return state;
  }
}

function makeInitialSnapshot(
  level: LevelConfig,
  difficulty: DifficultyId = 'normal'
): BattleSnapshot {
  return {
    phase: 'build',
    crystals: level.startCrystals,
    anchor: level.anchor,
    anchorMax: level.anchor,
    wave: 0,
    totalWaves: level.waves.length,
    finalWave: false,
    locksReady: false,
    milestoneStars: 0,
    bonusActive: false,
    bonusWave: 0,
    bonusTotal: level.bonusSurgeWaves,
    wordsUntilWave: level.waveEvery,
    creaturesAlive: 0,
    defendersCount: 0,
    upgradedCount: 0,
    kills: 0,
    shards: 0,
    powers: { rally: 0, meteor: 0, freeze: 0 },
    rallyActive: false,
    freezeActive: false,
    buildSel: null,
    selectedDef: null,
    paused: false,
    speed: 1,
    difficulty,
    cameraPreset: 'tactical',
    labels: [],
  };
}

export default function App() {
  const [state, dispatch] = useReducer(appReducer, {
    scene: 'title',
    activeLevelId: 'w1-l1',
    activeCutscene: 'opening',
    cutsceneReturnTo: 'battle',
    battleKey: 1,
    lastResult: null,
    lastForgeStats: { ...EMPTY_FORGE_STATS, practice: [] },
    settingsOpen: false,
  });

  const activeLevel = LEVELS[state.activeLevelId];
  const [progress, setProgress] = useState<StoredProgress>(() => loadProgress());
  const [azureStatus, setAzureStatus] = useState<'checking' | 'azure' | 'chrome' | 'off'>('checking');
  const [snap, setSnap] = useState<BattleSnapshot>(() => makeInitialSnapshot(LEVELS['w1-l1']));
  const [toast, setToast] = useState<string>('');
  const [customVideos, setCustomVideos] = useState<Partial<Record<string, string>>>({});
  const [defenderThumbs, setDefenderThumbs] = useState<Partial<Record<DefenderType, string>>>({});

  // Level 1 Guided Walkthrough & Fly-in Wave Announcements
  const [tutorialIdx, setTutorialIdx] = useState<number | null>(0);
  const [forgedCount, setForgedCount] = useState(0);
  const [waveBanner, setWaveBanner] = useState<WaveBannerInfo | null>(null);
  const [showHalfSpeedTip, setShowHalfSpeedTip] = useState(false);
  const [ellOpen, setEllOpen] = useState(false);

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<BattleEngine | null>(null);
  const forgeStatsRef = useRef<ForgeStats>({ ...EMPTY_FORGE_STATS, practice: [] });
  const toastTimerRef = useRef<number>(0);
  const bannerTimerRef = useRef<number>(0);
  const bannerIdRef = useRef<number>(1);
  const prevWaveRef = useRef<number>(0);
  const progressRef = useRef<StoredProgress>(progress);
  progressRef.current = progress;

  const settings = progress.settings;

  useEffect(() => {
    speech.setSpanishL1Mode(Boolean(settings.spanishL1Voice));
  }, [settings.spanishL1Voice]);

  const openEllModal = useCallback(() => {
    if (state.scene === 'battle') {
      engineRef.current?.setExternalHold(true);
    }
    setEllOpen(true);
  }, [state.scene]);

  const closeEllModal = useCallback(() => {
    setEllOpen(false);
    if (state.scene === 'battle' && !state.settingsOpen) {
      engineRef.current?.setExternalHold(false);
    }
  }, [state.scene, state.settingsOpen]);

  const locks = getPatternLocks(
    progress,
    activeLevel.vowels,
    activeLevel.mastery.window,
    activeLevel.mastery.need,
    activeLevel.id
  );

  const triggerWaveBanner = useCallback(
    (title: string, subtitle: string, accent: 'cyan' | 'magenta' | 'amber') => {
      clearTimeout(bannerTimerRef.current);
      bannerIdRef.current += 1;
      setWaveBanner({ id: bannerIdRef.current, title, subtitle, accent });
      bannerTimerRef.current = window.setTimeout(() => {
        setWaveBanner(null);
      }, 3000);
    },
    []
  );

  // Sync fonts, reduced motion, and volumes
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--reading-font',
      settings.font === 'dyslexic'
        ? "'OpenDyslexic', 'Lexend', sans-serif"
        : "'Lexend', system-ui, sans-serif"
    );
    document.body.classList.toggle('reduced-motion', settings.reducedMotion);
    sound.setVolumes({
      voice: settings.voiceVol,
      music: settings.musicVol,
      effects: settings.effectsVol,
    });
    sound.setWardenVoice(settings.wardenVoice);
    if (engineRef.current) {
      engineRef.current.setFocusMode(settings.focusMode);
      engineRef.current.setDifficulty(settings.difficulty || 'normal');
    }
  }, [settings]);

  // Preload cutout sprites, audio manifests, and Azure voice verification once on startup
  useEffect(() => {
    sound.init();
    speech.initAzure().then((ok) => {
      if (ok) setAzureStatus('azure');
      else setAzureStatus(speech.engine());
    });
    loadGameSprites()
      .then((bank) => {
        setDefenderThumbs({
          archer: bank.sprites.archer.dataUrl,
          spike: bank.sprites.spike.dataUrl,
          golem: bank.sprites.golem.dataUrl,
          frost: bank.sprites.frost.dataUrl,
          ember: bank.sprites.ember.dataUrl,
          tesla: bank.sprites.tesla.dataUrl,
        });
      })
      .catch(() => {
        // Fallback thumbnails handled cleanly
      });
  }, []);

  const showToast = useCallback((msg: string, speakId?: string) => {
    setToast(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(''), 4800);
    if (speakId) {
      sound.speakUI(speakId, msg);
    }
  }, []);

  // Mount / unmount the Painted 2.5D BattleEngine when entering/leaving battle scene
  useEffect(() => {
    if (state.scene !== 'battle' || !canvasMountRef.current) return;

    const lv = LEVELS[state.activeLevelId];
    forgeStatsRef.current = { ...EMPTY_FORGE_STATS, practice: [] };
    setSnap(makeInitialSnapshot(lv, settings.difficulty || 'normal'));
    setForgedCount(0);
    setShowHalfSpeedTip(false);
    setTutorialIdx(lv.hasWalkthrough ? 0 : null);
    prevWaveRef.current = 0;
    setToast('');
    sound.setMusic('calm');

    // Fly-in level start announcement
    triggerWaveBanner(
      `LEVEL ${lv.num}: ${lv.name.toUpperCase()}`,
      lv.hasWalkthrough ? 'Guided Walkthrough · Defend the Rift Anchor' : lv.wordsSummary,
      'cyan'
    );

    const engine = new BattleEngine(canvasMountRef.current, lv, {
      onSnapshot: (nextSnap) => setSnap(nextSnap),
      onToast: (msg, speakId) => showToast(msg, speakId),
      onBattleEnd: (res) => {
        const curProg = progressRef.current;
        const previewLosses = (curProg.losses || 0) + (res.win ? 0 : 1);
        const triggerTip =
          !res.win &&
          previewLosses >= 2 &&
          !curProg.seenHalfSpeedTip &&
          !curProg.settings.focusMode;
        setShowHalfSpeedTip(triggerTip);
        setProgress((prev) => {
          const prevLevelStars = prev.levelStars?.[lv.id] ?? 0;
          const prevLevelWins = prev.levelWins?.[lv.id] ?? 0;
          const nextLosses = (prev.losses || 0) + (res.win ? 0 : 1);
          const updated: StoredProgress = {
            ...prev,
            bestStars: Math.max(prev.bestStars, res.stars),
            wins: prev.wins + (res.win ? 1 : 0),
            losses: nextLosses,
            seenHalfSpeedTip: prev.seenHalfSpeedTip || triggerTip,
            levelStars: {
              ...prev.levelStars,
              [lv.id]: Math.max(prevLevelStars, res.stars),
            },
            levelWins: {
              ...prev.levelWins,
              [lv.id]: prevLevelWins + (res.win ? 1 : 0),
            },
            battles: [
              ...prev.battles,
              {
                ts: Date.now(),
                levelId: lv.id,
                win: res.win,
                stars: res.stars,
                words: forgeStatsRef.current.forged,
                firstTry: forgeStatsRef.current.firstTry,
                waves: res.waves,
                anchor: res.anchor,
              },
            ].slice(-20),
          };
          saveProgress(updated);
          return updated;
        });
        dispatch({
          type: 'BATTLE_FINISHED',
          result: res,
          forgeStats: { ...forgeStatsRef.current, practice: [...forgeStatsRef.current.practice] },
        });
      },
    });
    engine.setFocusMode(settings.focusMode);
    engine.setDifficulty(settings.difficulty || 'normal');
    if (settings.focusMode) {
      engine.setSpeed(0.5, true);
    }
    const initialLocks = getPatternLocks(
      progress,
      lv.vowels,
      lv.mastery.window,
      lv.mastery.need,
      lv.id
    );
    engine.setLocksReady(initialLocks.every((l) => l.done));
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.scene, state.battleKey, state.activeLevelId]);

  // Trigger dramatic fly-in & dissolve Wave Announcement whenever a wave launches
  useEffect(() => {
    if (state.scene !== 'battle') return;
    if (snap.wave > prevWaveRef.current) {
      prevWaveRef.current = snap.wave;
      if (snap.bonusActive) {
        triggerWaveBanner(
          `BONUS WAVE ${snap.bonusWave} OF ${snap.bonusTotal}`,
          'Bonus Surge! Test your strongest defenders.',
          'cyan'
        );
      } else if (snap.finalWave) {
        triggerWaveBanner('FINAL WAVE', `Hold the line to seal ${activeLevel.name}!`, 'amber');
      } else {
        triggerWaveBanner(
          `WAVE ${snap.wave}`,
          snap.wave === 1 ? `${activeLevel.enemiesSummary} incoming!` : 'Hold the Anchor!',
          'magenta'
        );
      }
    }
  }, [
    snap.wave,
    snap.finalWave,
    snap.bonusActive,
    snap.bonusWave,
    snap.bonusTotal,
    state.scene,
    activeLevel.name,
    activeLevel.enemiesSummary,
    triggerWaveBanner,
  ]);

  // Interactive Level 1 Walkthrough auto-advancement based on real player actions
  useEffect(() => {
    if (state.scene !== 'battle' || tutorialIdx === null) return;

    if (tutorialIdx === 0 && (snap.buildSel !== null || snap.defendersCount >= 1)) {
      setTutorialIdx(snap.defendersCount >= 1 ? 2 : 1);
    } else if (tutorialIdx === 1 && snap.defendersCount >= 1) {
      // If they still have >= 40 crystals, guide them to place a Spike Pit; otherwise jump straight to Rune Forge
      setTutorialIdx(snap.crystals >= DEFENDERS.spike.cost ? 2 : 3);
    } else if (tutorialIdx === 2 && (snap.defendersCount >= 2 || snap.crystals < DEFENDERS.spike.cost)) {
      setTutorialIdx(3);
    } else if (tutorialIdx === 3 && forgedCount >= 1) {
      setTutorialIdx(snap.wave >= 1 ? 5 : 4);
    } else if (tutorialIdx === 4 && snap.wave >= 1) {
      setTutorialIdx(5);
    } else if (tutorialIdx === 5 && (snap.selectedDef !== null || snap.upgradedCount >= 1)) {
      setTutorialIdx(6);
    }
  }, [
    state.scene,
    tutorialIdx,
    snap.buildSel,
    snap.defendersCount,
    snap.crystals,
    snap.wave,
    snap.selectedDef,
    snap.upgradedCount,
    forgedCount,
  ]);

  // Global keyboard shortcuts during battle (Escape, P, S)
  useEffect(() => {
    if (state.scene !== 'battle') return;
    const onKey = (ev: KeyboardEvent) => {
      if (state.settingsOpen) {
        if (ev.key === 'Escape') dispatch({ type: 'SET_SETTINGS_OPEN', open: false });
        return;
      }
      if (ev.key === 'Escape') {
        if (snap.buildSel || snap.selectedDef) {
          engineRef.current?.clearSelection();
        } else {
          engineRef.current?.setPaused(!snap.paused);
        }
      } else if (ev.key === 'p' || ev.key === 'P') {
        engineRef.current?.setPaused(!snap.paused);
      } else if (ev.key === 's' || ev.key === 'S') {
        engineRef.current?.callWave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.scene, state.settingsOpen, snap.buildSel, snap.selectedDef, snap.paused]);

  const handleSettingsChange = (next: GameSettings) => {
    setProgress((prev) => {
      const updated = { ...prev, settings: next };
      saveProgress(updated);
      return updated;
    });
  };

  const handleChangeDifficulty = useCallback((diff: DifficultyId) => {
    setProgress((prev) => {
      const updated: StoredProgress = {
        ...prev,
        settings: { ...prev.settings, difficulty: diff },
      };
      saveProgress(updated);
      return updated;
    });
    engineRef.current?.setDifficulty(diff);
  }, []);

  const handleCycleDifficulty = useCallback(() => {
    sound.sfx('tap');
    const curIdx = DIFFICULTY_ORDER.indexOf(settings.difficulty || 'normal');
    const nextDiff = DIFFICULTY_ORDER[(curIdx + 1) % DIFFICULTY_ORDER.length];
    handleChangeDifficulty(nextDiff);
    showToast(`Difficulty: ${DIFFICULTIES[nextDiff].label}. ${DIFFICULTIES[nextDiff].desc}`);
  }, [handleChangeDifficulty, settings.difficulty, showToast]);

  const handlePayCrystals = useCallback((amount: number) => {
    engineRef.current?.grantCrystals(amount);
  }, []);

  const handleWordForged = useCallback(
    (pattern: PatternKey, firstTryClean: boolean, stats: ForgeStats) => {
      forgeStatsRef.current = stats;
      setForgedCount(stats.forged);
      setProgress((prev) => {
        const next = recordPatternRead(
          prev,
          pattern,
          firstTryClean,
          activeLevel.id,
          activeLevel.mastery
        );
        const nextLocks = getPatternLocks(
          next,
          activeLevel.vowels,
          activeLevel.mastery.window,
          activeLevel.mastery.need,
          activeLevel.id
        );
        engineRef.current?.onWordRead(nextLocks.every((l) => l.done));
        return next;
      });
    },
    [activeLevel]
  );

  const handleClearLocks = useCallback(
    (all = false, singlePattern?: PatternKey) => {
      sound.sfx('tap');
      setProgress((prev) => {
        const next = all
          ? clearPatternLocks(prev)
          : clearPatternLocks(
              prev,
              singlePattern ? [singlePattern] : activeLevel.vowels,
              activeLevel.id
            );
        engineRef.current?.setLocksReady(false);
        return next;
      });
      showToast(
        all
          ? 'All Rift Locks across all levels cleared to 0.'
          : singlePattern
          ? `Level ${activeLevel.num} "${singlePattern}" lock cleared to 0.`
          : `Level ${activeLevel.num} Rift Locks cleared to 0.`
      );
    },
    [activeLevel, showToast]
  );

  const handleMegaForge = useCallback(() => {
    engineRef.current?.triggerMegaBlast();
  }, []);

  const handleSimulateRound = useCallback(
    (sim: SimRoundResult, stats: ForgeStats) => {
      forgeStatsRef.current = stats;
      setForgedCount(stats.forged);
      engineRef.current?.grantCrystals(sim.crystals);
      if (sim.megas > 0 && snap.phase === 'wave') {
        engineRef.current?.triggerMegaBlast();
      }
      setProgress((prev) => {
        let next = prev;
        const vowels = activeLevel.vowels;
        for (let i = 0; i < sim.wordCount; i++) {
          const pattern = vowels[i % vowels.length];
          const clean = i < sim.cleanCount;
          next = recordPatternRead(next, pattern, clean, activeLevel.id, activeLevel.mastery);
        }
        const nextLocks = getPatternLocks(
          next,
          activeLevel.vowels,
          activeLevel.mastery.window,
          activeLevel.mastery.need,
          activeLevel.id
        );
        engineRef.current?.onSimulatedRound(sim.wordCount, nextLocks.every((l) => l.done));
        return next;
      });
    },
    [activeLevel, snap.phase]
  );

  const handleRuleHold = useCallback((hold: boolean) => {
    engineRef.current?.setExternalHold(hold);
  }, []);

  const handleUploadCustomVideo = (id: CutsceneId, url: string) => {
    const key = `${activeLevel.id}:${id}`;
    setCustomVideos((prev) => ({ ...prev, [key]: url }));
  };

  const activeWalkthrough: WalkthroughInfo | null =
    activeLevel.hasWalkthrough && tutorialIdx !== null && WALKTHROUGH_STEPS[tutorialIdx]
      ? {
          ...WALKTHROUGH_STEPS[tutorialIdx],
          stepNum: tutorialIdx + 1,
          totalSteps: WALKTHROUGH_STEPS.length,
          isLast: tutorialIdx === WALKTHROUGH_STEPS.length - 1,
        }
      : null;

  const isLastWordBeforeWave =
    (snap.phase === 'build' || snap.phase === 'between') && snap.wordsUntilWave === 1;

  const lastWordWarning = isLastWordBeforeWave
    ? (() => {
        const nextIsFinal =
          !snap.bonusActive && snap.locksReady && snap.wave + 1 >= activeLevel.minWaves;
        if (snap.defendersCount === 0) {
          return {
            title: 'Build defenders before this word!',
            body: 'Your next word guess starts Wave 1 right away. Place towers first.',
            urgent: true,
          };
        }
        if (snap.bonusActive) {
          return {
            title: `Build before Bonus Wave ${snap.bonusWave + 1}!`,
            body: 'Guessing this last word launches the wave right away. Spend crystals first.',
            urgent: false,
          };
        }
        if (nextIsFinal) {
          return {
            title: 'Build before the Final Wave!',
            body: 'Guessing this last word launches the Final Wave right away. Upgrade towers first.',
            urgent: true,
          };
        }
        return {
          title: `Build before Wave ${snap.wave + 1}!`,
          body: 'Guessing this last word launches the wave right away. Place or upgrade towers first.',
          urgent: snap.crystals >= 40,
        };
      })()
    : null;

  return (
    <div className="fixed inset-0 h-[100dvh] w-full overflow-hidden bg-[#120d26] font-reading text-slate-100">
      {state.scene === 'title' && (
        <TitleScreen
          activeLevel={activeLevel}
          progress={progress}
          locks={locks}
          azureStatus={azureStatus}
          onSelectLevel={(levelId) => dispatch({ type: 'SELECT_LEVEL', levelId })}
          onChangeDifficulty={handleChangeDifficulty}
          onStartWithCutscene={() => dispatch({ type: 'START_WITH_OPENING' })}
          onStartDirect={() => dispatch({ type: 'START_DIRECT_BATTLE' })}
          onOpenCutscene={(id) => dispatch({ type: 'PREVIEW_CUTSCENE', id, returnTo: 'title' })}
          onOpenSettings={() => dispatch({ type: 'SET_SETTINGS_OPEN', open: true })}
          onOpenEll={openEllModal}
          onClearLocks={(pattern) => handleClearLocks(false, pattern)}
        />
      )}

      {state.scene === 'cutscene' && (
        <CutscenePlayer
          script={activeLevel.cutscenes[state.activeCutscene]}
          wardenVoice={settings.wardenVoice}
          customVideoUrl={customVideos[`${activeLevel.id}:${state.activeCutscene}`] || null}
          reducedMotion={settings.reducedMotion}
          spanishCaptions={settings.spanishCaptions}
          onComplete={() => dispatch({ type: 'CUTSCENE_DONE' })}
          onOpenVoicePicker={() => dispatch({ type: 'SET_SETTINGS_OPEN', open: true })}
          onOpenEll={openEllModal}
          onUploadCustomVideo={handleUploadCustomVideo}
        />
      )}

      {state.scene === 'battle' && (
        <div className="flex h-full w-full flex-col overflow-hidden bg-[#120d26]">
          {/* Upper Area: Painted 2.5D Battlefield + Right-Docked Rune Forge */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <div
              className={`relative flex-1 min-w-0 h-full overflow-hidden ${
                activeLevel.worldId === 'w2' ? 'bg-[#1c1210]' : 'bg-[#1b3a22]'
              }`}
            >
              <div ref={canvasMountRef} className="h-full w-full" />
              <BattleHUD
                level={activeLevel}
                snap={snap}
                locks={locks}
                toast={toast}
                waveBanner={waveBanner}
                walkthrough={activeWalkthrough}
                spanishCaptions={settings.spanishCaptions}
                onClearLocks={(pattern) => handleClearLocks(false, pattern)}
                onWalkthroughNext={() => {
                  sound.sfx('tap');
                  setTutorialIdx((prev) =>
                    prev === null || prev >= WALKTHROUGH_STEPS.length - 1 ? null : prev + 1
                  );
                }}
                onWalkthroughSkip={() => {
                  sound.sfx('tap');
                  setTutorialIdx(null);
                }}
                onToggleWalkthrough={() => {
                  sound.sfx('tap');
                  setTutorialIdx((prev) => (prev === null ? 0 : null));
                }}
                onUpgrade={(spec) => engineRef.current?.upgradeSelected(spec)}
                onSell={() => engineRef.current?.sellSelected()}
                onClosePopup={() => engineRef.current?.clearSelection()}
                onCastPower={(id: HeroPowerId) => engineRef.current?.castHeroPower(id)}
                onStartWave={() => engineRef.current?.callWave()}
                onSealRift={() => engineRef.current?.acceptVictoryAndFinish()}
                onStartBonusSurge={() => engineRef.current?.startBonusSurge()}
                onTogglePause={() => engineRef.current?.setPaused(!snap.paused)}
                onToggleSpeed={() => {
                  const nextSpeed = snap.speed === 1 ? 2 : snap.speed === 2 ? 0.5 : 1;
                  engineRef.current?.setSpeed(nextSpeed);
                }}
                onCycleDifficulty={handleCycleDifficulty}
                onOpenSettings={() => {
                  engineRef.current?.setExternalHold(true);
                  dispatch({ type: 'SET_SETTINGS_OPEN', open: true });
                }}
                onExitToTitle={() => {
                  sound.stopSpeaking();
                  speech.stop();
                  speech.releaseMicStream();
                  dispatch({ type: 'RETURN_TITLE' });
                }}
              />
            </div>

            {/* Right-Docked Rune Forge Panel (Always zero timers, compact & scrollable) */}
            <RuneForgePanel
              key={`${activeLevel.id}-${state.battleKey}`}
              level={activeLevel}
              settings={settings}
              unlockedPatterns={locks.filter((l) => !l.done).map((l) => l.vowel)}
              disabled={snap.phase === 'done' || snap.phase === 'milestone'}
              azureStatus={azureStatus}
              tutorialHighlight={activeWalkthrough?.highlight === 'forge'}
              lastWordWarning={lastWordWarning}
              onPay={handlePayCrystals}
              onWordForged={handleWordForged}
              onMegaForge={handleMegaForge}
              onSimulateRound={handleSimulateRound}
              onRuleHold={handleRuleHold}
              onOpenEll={openEllModal}
            />
          </div>

          {/* Compact Bottom Defender Bar (sleek horizontal cards so nothing clips on shorter screens) */}
          <footer
            className={`shrink-0 border-t-2 px-3 py-1.5 select-none transition-colors ${
              isLastWordBeforeWave
                ? 'border-amber-400 bg-[#1f1636]'
                : 'border-purple-500/55 bg-[#120d26]'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto">
                {activeLevel.defenders.map((id) => {
                  const def = DEFENDERS[id];
                  const active = snap.buildSel === id;
                  const canAfford = snap.crystals >= def.cost;
                  const thumb = defenderThumbs[id];
                  const isGuideTarget =
                    (activeWalkthrough?.highlight === 'archer' && id === 'archer') ||
                    (activeWalkthrough?.highlight === 'spike' && id === 'spike');

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => engineRef.current?.selectBuild(id)}
                      title={
                        settings.spanishCaptions
                          ? `${def.name}: ${def.desc} | ${SPANISH_DEFENDERS[id].nameEs}: ${SPANISH_DEFENDERS[id].descEs}`
                          : `${def.name}: ${def.desc}`
                      }
                      className={`group flex shrink-0 items-center gap-2 rounded-xl border-2 px-2.5 py-1 transition-all cursor-pointer ${
                        active
                          ? 'border-cyan-300 bg-[#2a2060] shadow-[0_0_14px_rgba(56,224,255,0.45)]'
                          : isGuideTarget
                          ? 'border-amber-300 bg-[#2a205c] animate-tutorial-pulse'
                          : canAfford
                          ? 'border-purple-400/55 bg-[#1b153b] hover:border-cyan-300/80 hover:bg-[#241c4f]'
                          : 'border-purple-900/60 bg-[#130f2b] opacity-65 hover:opacity-85'
                      }`}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={def.name}
                            className="h-9 w-9 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)] group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-purple-900/60" />
                        )}
                      </div>
                      <div className="flex flex-col items-start text-left leading-tight">
                        <span className="text-xs font-bold text-white whitespace-nowrap">
                          {def.name}
                        </span>
                        {settings.spanishCaptions && (
                          <span className="text-[10px] font-medium text-cyan-200/85 whitespace-nowrap">
                            {SPANISH_DEFENDERS[id].nameEs}
                          </span>
                        )}
                        <span className="mt-0.5 inline-flex items-center gap-1 font-tabular text-[11px] font-extrabold text-cyan-300">
                          <Gem className="h-3 w-3 text-cyan-300 fill-cyan-300/30" />
                          {def.cost}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Clean placement guidance on the right side of the bottom bar */}
              <div className="hidden lg:flex flex-col items-end text-right text-xs text-purple-200/80 pr-1 shrink-0">
                <span className={`font-bold ${isLastWordBeforeWave && !snap.buildSel ? 'text-amber-300' : 'text-white'}`}>
                  {snap.buildSel
                    ? `Placing ${DEFENDERS[snap.buildSel].name}`
                    : isLastWordBeforeWave
                    ? 'Build before your next word!'
                    : 'Tap a defender to place'}
                </span>
                <span className={`text-[11px] ${isLastWordBeforeWave && !snap.buildSel ? 'text-amber-200/90' : 'text-purple-300/80'}`}>
                  {snap.buildSel
                    ? DEFENDERS[snap.buildSel].kind === 'tower'
                      ? 'Click a glowing stone pad beside the trail'
                      : 'Click a glowing spot right on the dirt trail'
                    : isLastWordBeforeWave
                    ? 'The wave launches right after your next word guess'
                    : 'Tap any placed defender to upgrade or sell'}
                </span>
                {settings.spanishCaptions && (
                  <span className="text-[10px] font-medium text-cyan-200/90">
                    {snap.buildSel
                      ? DEFENDERS[snap.buildSel].kind === 'tower'
                        ? `Colocando ${SPANISH_DEFENDERS[snap.buildSel].nameEs} en una base de piedra`
                        : `Colocando ${SPANISH_DEFENDERS[snap.buildSel].nameEs} sobre el sendero`
                      : isLastWordBeforeWave
                      ? 'La oleada inicia con la siguiente palabra'
                      : 'Toca un defensor para colocarlo o mejorarlo'}
                  </span>
                )}
              </div>
            </div>
          </footer>
        </div>
      )}

      {state.scene === 'results' && state.lastResult && (
        <ResultsScreen
          level={activeLevel}
          result={state.lastResult}
          forgeStats={state.lastForgeStats}
          progress={progress}
          locks={locks}
          showHalfSpeedTip={showHalfSpeedTip}
          onDismissHalfSpeedTip={() => setShowHalfSpeedTip(false)}
          onOpenSettings={() => dispatch({ type: 'SET_SETTINGS_OPEN', open: true })}
          onNextLevel={
            activeLevel.nextLevelId && !LEVELS[activeLevel.nextLevelId]?.comingSoon
              ? () => {
                  setShowHalfSpeedTip(false);
                  dispatch({
                    type: 'START_LEVEL_WITH_OPENING',
                    levelId: activeLevel.nextLevelId!,
                  });
                }
              : undefined
          }
          onPlayAgain={() => {
            setShowHalfSpeedTip(false);
            dispatch({ type: 'START_DIRECT_BATTLE' });
          }}
          onReplayCutscene={() =>
            dispatch({
              type: 'PREVIEW_CUTSCENE',
              id: state.lastResult!.win ? 'victory' : 'defeat',
              returnTo: 'results',
            })
          }
          onReturnTitle={() => {
            setShowHalfSpeedTip(false);
            dispatch({ type: 'RETURN_TITLE' });
          }}
        />
      )}

      {state.settingsOpen && (
        <SettingsModal
          level={activeLevel}
          locks={locks}
          settings={settings}
          azureStatus={azureStatus}
          onChange={handleSettingsChange}
          onClearActiveLocks={() => handleClearLocks(false)}
          onClearAllLocks={() => handleClearLocks(true)}
          onOpenEll={openEllModal}
          onClose={() => {
            dispatch({ type: 'SET_SETTINGS_OPEN', open: false });
            if (state.scene === 'battle' && !ellOpen) {
              engineRef.current?.setExternalHold(false);
            }
          }}
        />
      )}

      {ellOpen && (
        <EllSupportModal
          settings={settings}
          onChange={handleSettingsChange}
          onClose={closeEllModal}
        />
      )}
    </div>
  );
}
