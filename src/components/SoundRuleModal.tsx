import React, { useEffect, useState } from 'react';
import { Languages, Volume2 } from 'lucide-react';
import { getSpanishRuleTip } from '../data/ellSpanish';
import { getPatternRule, PatternKey } from '../data/level1';
import { sound } from '../lib/audio';

interface SoundRuleModalProps {
  word: string;
  pattern: PatternKey;
  tiles?: string[];
  targetTileIdx?: number;
  fullRule: boolean;
  showSpanishRule?: boolean;
  onExpandFull: () => void;
  onClose: () => void;
}

export const SoundRuleModal: React.FC<SoundRuleModalProps> = ({
  word,
  pattern,
  tiles,
  targetTileIdx,
  fullRule,
  showSpanishRule = false,
  onExpandFull,
  onClose,
}) => {
  const rule = getPatternRule(pattern);
  const spanishTip = showSpanishRule ? getSpanishRuleTip(pattern) : null;
  const soundTiles = tiles && tiles.length > 0 ? tiles : word.split('');
  const highlightIdx = targetTileIdx ?? 1;
  const patternDisplay = rule.shortLabel || pattern;
  const [litTarget, setLitTarget] = useState<'rule' | 'vowel' | 'whole' | number | null>(null);
  const [ready, setReady] = useState(false);

  const playSequence = (includeRuleLine: boolean) => {
    setReady(false);
    const steps: Array<{
      id?: string;
      word?: string;
      snd?: string;
      text?: string;
      pause?: number;
      on?: () => void;
    }> = [];

    if (fullRule) {
      if (includeRuleLine) {
        steps.push({
          id: rule.ruleAudioId,
          text: rule.ruleLine,
          on: () => setLitTarget('rule'),
        });
        steps.push({ pause: 150 });
      }
      steps.push({ snd: patternDisplay, on: () => setLitTarget('vowel') });
      steps.push({ id: 'rule.asIn', text: 'as in' });
      steps.push({ word: rule.word });
      steps.push({ pause: 240 });
    }

    const isSilentEPattern = /^[aiou]_e$/.test(String(pattern));
    soundTiles.forEach((tile, idx) => {
      const isSilentE = isSilentEPattern && idx === soundTiles.length - 1 && tile.toLowerCase() === 'e';
      if (isSilentE) return;
      const sndKey = isSilentEPattern && idx === highlightIdx ? String(pattern) : tile;
      steps.push({ snd: sndKey, on: () => setLitTarget(idx) });
      steps.push({ pause: 130 });
    });

    steps.push({
      word,
      on: () => {
        setLitTarget('whole');
        window.setTimeout(() => setReady(true), 650);
      },
    });

    const safety = window.setTimeout(() => setReady(true), fullRule ? 12000 : 7500);
    sound.speakSequence(steps).then(() => {
      clearTimeout(safety);
      setReady(true);
    });
  };

  useEffect(() => {
    playSequence(true);
    return () => {
      sound.stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word, pattern, fullRule]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.key === 'Enter' || ev.key === ' ') && ready) {
        ev.preventDefault();
        sound.sfx('select');
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ready, onClose]);

  const keywordClean = patternDisplay.replace(/_/g, '');
  const keywordMatchIdx = rule.word.toLowerCase().indexOf(keywordClean.toLowerCase());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sound-rule-title"
        className="w-full max-w-2xl max-h-[92dvh] overflow-y-auto rounded-2xl border border-cyan-500/40 bg-[#101729] px-5 py-4 md:px-7 md:py-5 shadow-2xl text-center"
      >
        <h2
          id="sound-rule-title"
          className="font-display text-base md:text-lg font-bold tracking-wider text-cyan-300"
        >
          Sound Rule
        </h2>

        {fullRule && (
          <div className="mt-2.5 space-y-2.5">
            <button
              type="button"
              onClick={() =>
                ready &&
                (rule.ruleAudioId
                  ? sound.speakUI(rule.ruleAudioId, rule.ruleLine)
                  : sound.speakFallback(rule.ruleLine))
              }
              className={`w-full rounded-xl border px-4 py-2 font-reading text-sm md:text-base leading-snug transition-colors cursor-pointer ${
                litTarget === 'rule'
                  ? 'border-amber-400 bg-amber-500/15 text-amber-100'
                  : 'border-slate-700 bg-slate-900/80 text-slate-200 hover:border-slate-500'
              }`}
            >
              {rule.ruleLine}
            </button>

            <div
              className={`flex flex-wrap items-center justify-center gap-3 rounded-xl border px-3.5 py-2 transition-colors ${
                litTarget === 'vowel'
                  ? 'border-amber-400 bg-amber-500/15'
                  : 'border-slate-700/80 bg-slate-900/60'
              }`}
            >
              <button
                type="button"
                onClick={() => ready && sound.speakPhoneme(patternDisplay)}
                className="flex h-11 min-w-11 px-2.5 items-center justify-center rounded-xl border border-amber-400/70 bg-amber-500/20 font-reading text-2xl font-bold text-amber-300 cursor-pointer"
              >
                {patternDisplay}
              </button>
              <button
                type="button"
                onClick={() => ready && sound.speakPhoneme(patternDisplay)}
                className="font-reading text-xl font-bold text-cyan-200 cursor-pointer"
              >
                {rule.show}
              </button>
              <button
                type="button"
                onClick={() => ready && sound.speakWord(rule.word)}
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 hover:border-cyan-400 cursor-pointer"
              >
                <span className="text-xs font-medium text-slate-400">Key word</span>
                <span className="flex gap-1">
                  {rule.word.split('').map((ch, idx) => {
                    const isSilentEPat = /^[aiou]_e$/.test(String(pattern));
                    const inChunk = isSilentEPat
                      ? (idx === rule.word.length - 3 && ch.toLowerCase() === String(pattern)[0]) ||
                        (idx === rule.word.length - 1 && ch.toLowerCase() === 'e')
                      : keywordMatchIdx >= 0 &&
                        idx >= keywordMatchIdx &&
                        idx < keywordMatchIdx + keywordClean.length;
                    return (
                      <span
                        key={idx}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-md font-reading text-lg font-bold ${
                          inChunk
                            ? 'bg-amber-400/25 text-amber-200 border border-amber-400/60'
                            : 'bg-slate-900 text-slate-100 border border-slate-700'
                        }`}
                      >
                        {ch}
                      </span>
                    );
                  })}
                </span>
              </button>
            </div>
          </div>
        )}

        {spanishTip && (
          <div className="mt-2.5 rounded-xl border border-emerald-400/45 bg-emerald-950/25 px-3.5 py-2.5 text-left">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-200">
                <Languages className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                <span>Puente en español: {spanishTip.labelEs}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  sound.stopSpeaking();
                  void sound.speakFallback(`${spanishTip.tipEs} ${spanishTip.bridgeEs}`, 'es-MX');
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/50 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-100 hover:bg-emerald-500/25 cursor-pointer shrink-0"
              >
                <Volume2 className="h-3 w-3" />
                <span>Escuchar</span>
              </button>
            </div>
            <p className="mt-1 font-reading text-xs sm:text-sm text-emerald-50 leading-snug">
              {spanishTip.tipEs}
            </p>
            <p className="mt-0.5 text-xs text-cyan-200/90 leading-snug">{spanishTip.bridgeEs}</p>
          </div>
        )}

        {/* Word broken into interactive phoneme tiles + Whole word button */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {soundTiles.map((tile, idx) => {
              const isSilentEPat = /^[aiou]_e$/.test(String(pattern));
              const isTarget = idx === highlightIdx;
              const isSilentE = isSilentEPat && idx === soundTiles.length - 1 && tile.toLowerCase() === 'e';
              const isLit = litTarget === idx || litTarget === 'whole' || (isSilentE && litTarget === highlightIdx);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    ready && sound.speakPhoneme(isSilentEPat && (isTarget || isSilentE) ? String(pattern) : tile)
                  }
                  title={isSilentE ? 'Silent e makes the vowel say its long name' : 'Tap to hear this sound'}
                  className={`flex h-14 min-w-14 sm:h-16 sm:min-w-16 px-2.5 items-center justify-center rounded-xl border-2 font-reading text-2xl sm:text-3xl font-bold transition-transform cursor-pointer ${
                    isLit
                      ? 'scale-105 border-amber-300 bg-amber-400/25 text-white'
                      : isSilentE
                      ? 'border-dashed border-amber-400/75 bg-amber-500/10 text-amber-200/80'
                      : isTarget
                      ? 'border-amber-400/70 bg-amber-500/15 text-amber-200'
                      : 'border-slate-600 bg-slate-900 text-slate-100'
                  }`}
                >
                  {tile}
                </button>
              );
            })}
          </div>

          <span className="hidden sm:inline text-slate-500 text-lg font-bold" aria-hidden="true">
            =
          </span>

          <button
            type="button"
            onClick={() => ready && sound.speakWord(word)}
            className={`inline-flex items-center gap-2.5 rounded-xl border px-5 py-2.5 font-reading text-2xl sm:text-3xl font-bold transition-colors cursor-pointer ${
              litTarget === 'whole'
                ? 'border-cyan-300 bg-cyan-500/20 text-white'
                : 'border-slate-700 bg-slate-900 text-slate-100 hover:border-cyan-400'
            }`}
          >
            <Volume2 className="h-5 w-5 text-cyan-300" />
            <span>{word}</span>
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-400">
          Tap any letter or word to hear it again.
        </p>

        {/* Footer Controls */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
          {!fullRule && (
            <button
              type="button"
              onClick={() => {
                sound.sfx('tap');
                onExpandFull();
              }}
              className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:border-cyan-400 cursor-pointer whitespace-nowrap shrink-0"
            >
              Show the rule
            </button>
          )}
          <button
            type="button"
            disabled={!ready}
            onClick={() => {
              sound.sfx('tap');
              playSequence(false);
            }}
            className={`inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition-opacity whitespace-nowrap shrink-0 ${
              ready ? 'opacity-100 hover:border-cyan-400 cursor-pointer' : 'opacity-40 cursor-not-allowed'
            }`}
          >
            <Volume2 className="h-4 w-4 text-cyan-300" />
            Hear it again
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => {
              sound.sfx('select');
              onClose();
            }}
            className={`rounded-lg bg-cyan-400 px-6 py-2 text-sm md:text-base font-bold text-slate-950 transition-opacity whitespace-nowrap shrink-0 ${
              ready ? 'opacity-100 hover:bg-cyan-300 cursor-pointer' : 'opacity-40 cursor-not-allowed'
            }`}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
