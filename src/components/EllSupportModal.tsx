import React, { useEffect } from 'react';
import {
  AudioLines,
  BookOpen,
  Languages,
  Mic,
  ShieldCheck,
  Sparkles,
  Subtitles,
  Volume2,
  X,
} from 'lucide-react';
import { sound } from '../lib/audio';
import { countActiveEllSupports, GameSettings } from '../lib/metrics';

interface EllSupportModalProps {
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  onClose: () => void;
}

export const EllSupportModal: React.FC<EllSupportModalProps> = ({
  settings,
  onChange,
  onClose,
}) => {
  const activeCount = countActiveEllSupports(settings);
  const allOn = activeCount === 5;

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const update = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    sound.sfx('tap');
    onChange({ ...settings, [key]: value });
  };

  const toggleAll = () => {
    sound.sfx(allOn ? 'tap' : 'select');
    const nextVal = !allOn;
    onChange({
      ...settings,
      spanish: nextVal,
      spanishL1Voice: nextVal,
      slowBlendAudio: nextVal,
      spanishRules: nextVal,
      spanishCaptions: nextVal,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-3">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ell-support-title"
        className="w-full max-w-xl max-h-[90dvh] overflow-y-auto rounded-2xl border border-cyan-500/45 bg-[#0e1526] p-5 shadow-2xl text-slate-100"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-cyan-300" />
              <h2
                id="ell-support-title"
                className="font-display text-lg md:text-xl font-bold text-white"
              >
                Español / ELL Support
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-300">
              Turn on Spanish and English-learner accommodations below. Changes apply right away and stay saved on this device.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.sfx('tap');
              onClose();
            }}
            aria-label="Close Español / ELL Support"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-400 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3.5">
          {/* One-Tap Master Preset */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-400/50 bg-emerald-950/30 p-3.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-200">
                <Sparkles className="h-4 w-4 text-emerald-300" />
                <span>Full Spanish ELL Support</span>
              </div>
              <div className="mt-0.5 text-xs text-slate-300">
                Soporte completo en español ({activeCount} of 5 active)
              </div>
            </div>
            <button
              type="button"
              onClick={toggleAll}
              className={`rounded-lg px-4 py-2 text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap ${
                allOn
                  ? 'border border-emerald-400/70 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30'
                  : 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
              }`}
            >
              {allOn ? 'Turn All Off' : 'Turn All On'}
            </button>
          </div>

          {/* All 5 Live ELL Toggles */}
          <div className="space-y-2.5">
            {/* 1. Spanish L1 Voice Fit */}
            <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-700/80 bg-[#131c33] p-3">
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-white">
                  <Mic className="h-4 w-4 text-cyan-300 shrink-0" />
                  <span>Spanish L1 Voice Fit</span>
                  <span className="text-[11px] font-medium text-cyan-300/90">(Ajuste de voz)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Adapts Speak Mode for common Spanish-to-English transfers (ch/sh, short i/ee, v/b, th/t/d, and opening s-blends like estop) while grading the rest of every word.
                </p>
              </div>
              <button
                type="button"
                onClick={() => update('spanishL1Voice', !settings.spanishL1Voice)}
                className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  settings.spanishL1Voice
                    ? 'bg-emerald-400 text-slate-950'
                    : 'border border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-400'
                }`}
              >
                {settings.spanishL1Voice ? 'On' : 'Off'}
              </button>
            </div>

            {/* 2. Slow Blend Audio Button */}
            <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-700/80 bg-[#131c33] p-3">
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-white">
                  <AudioLines className="h-4 w-4 text-cyan-300 shrink-0" />
                  <span>Slow Blend Audio Button</span>
                  <span className="text-[11px] font-medium text-cyan-300/90">(Audio lento)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Adds a sound-by-sound Slow button beside the speaker in the Rune Forge that plays each pure sound before blending the whole word.
                </p>
              </div>
              <button
                type="button"
                onClick={() => update('slowBlendAudio', !settings.slowBlendAudio)}
                className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  settings.slowBlendAudio
                    ? 'bg-emerald-400 text-slate-950'
                    : 'border border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-400'
                }`}
              >
                {settings.slowBlendAudio ? 'On' : 'Off'}
              </button>
            </div>

            {/* 3. Spanish Word Meanings & Cognates */}
            <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-700/80 bg-[#131c33] p-3">
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-white">
                  <Volume2 className="h-4 w-4 text-cyan-300 shrink-0" />
                  <span>Spanish Meanings &amp; Glosses</span>
                  <span className="text-[11px] font-medium text-cyan-300/90">(Significados)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Shows tappable Spanish translations, cognates, and brief plain-English meanings right under real words (and marks made-up runes clearly).
                </p>
              </div>
              <button
                type="button"
                onClick={() => update('spanish', !settings.spanish)}
                className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  settings.spanish
                    ? 'bg-emerald-400 text-slate-950'
                    : 'border border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-400'
                }`}
              >
                {settings.spanish ? 'On' : 'Off'}
              </button>
            </div>

            {/* 4. Bilingual Sound Rule Tips */}
            <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-700/80 bg-[#131c33] p-3">
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-white">
                  <BookOpen className="h-4 w-4 text-cyan-300 shrink-0" />
                  <span>Bilingual Sound Rule Tips</span>
                  <span className="text-[11px] font-medium text-cyan-300/90">(Reglas en español)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Adds a Spanish mouth-placement tip and English-to-Spanish sound bridge (with tap-to-hear Spanish audio) inside Sound Rule cards.
                </p>
              </div>
              <button
                type="button"
                onClick={() => update('spanishRules', !settings.spanishRules)}
                className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  settings.spanishRules
                    ? 'bg-emerald-400 text-slate-950'
                    : 'border border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-400'
                }`}
              >
                {settings.spanishRules ? 'On' : 'Off'}
              </button>
            </div>

            {/* 5. Dual-Language Captions */}
            <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-700/80 bg-[#131c33] p-3">
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-white">
                  <Subtitles className="h-4 w-4 text-cyan-300 shrink-0" />
                  <span>Spanish Captions &amp; Tower Tips</span>
                  <span className="text-[11px] font-medium text-cyan-300/90">(Subtítulos)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Displays Spanish subtitles underneath English lines in cutscenes, walkthrough steps, tower upgrade menus, and placement tips.
                </p>
              </div>
              <button
                type="button"
                onClick={() => update('spanishCaptions', !settings.spanishCaptions)}
                className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  settings.spanishCaptions
                    ? 'bg-emerald-400 text-slate-950'
                    : 'border border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-400'
                }`}
              >
                {settings.spanishCaptions ? 'On' : 'Off'}
              </button>
            </div>
          </div>

          {settings.spanishL1Voice && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-500/35 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-100">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              <span>
                Spanish L1 Voice Fit is active across all levels and in the Settings mic tester. Reads matched through this fit show [Spanish L1 fit].
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              sound.sfx('tap');
              onClose();
            }}
            className="rounded-lg bg-cyan-400 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
