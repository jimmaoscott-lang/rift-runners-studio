import React, { useEffect, useRef, useState } from 'react';
import { FastForward, Play, RotateCcw, Upload, Volume2 } from 'lucide-react';
import { CutsceneId, CutsceneScript } from '../data/level1';
import { sound } from '../lib/audio';
import { assetUrl } from '../lib/assetUrl';

interface CutscenePlayerProps {
  script: CutsceneScript;
  wardenVoice: string;
  customVideoUrl?: string | null;
  reducedMotion?: boolean;
  onComplete: () => void;
  onOpenVoicePicker?: () => void;
  onUploadCustomVideo?: (id: CutsceneId, url: string) => void;
}

export const CutscenePlayer: React.FC<CutscenePlayerProps> = ({
  script,
  wardenVoice,
  customVideoUrl,
  reducedMotion = false,
  onComplete,
  onOpenVoicePicker,
  onUploadCustomVideo,
}) => {
  const cutsceneId = script.id;
  const [beatIndex, setBeatIndex] = useState(0);
  const [captionIndex, setCaptionIndex] = useState(0);
  const [voiceState, setVoiceState] = useState<'loading' | 'playing' | 'done' | 'error' | 'quota'>('loading');
  const [progress, setProgress] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [replayNonce, setReplayNonce] = useState(0);
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const beat = script.beats[beatIndex];

  useEffect(() => {
    setBeatIndex(0);
    setCaptionIndex(0);
    setProgress(0);
    setImgError(false);
  }, [script]);

  // Play neural voice line and ONLY auto-advance after the audio actually finishes
  useEffect(() => {
    if (customVideoUrl || !beat) return;
    let active = true;
    let autoNextTimer: number | null = null;
    let fallbackCapTimer: number | null = null;

    setVoiceState('loading');
    setCaptionIndex(0);
    setProgress(0);
    setImgError(false);

    sound.setMusic('calm');

    const nextBeat = script.beats[beatIndex + 1];

    sound
      .speakCutsceneLine(beat.id, beat.voiceText, beat.voiceStyle, {
        voiceName: wardenVoice,
        onStart: () => {
          if (!active) return;
          setVoiceState('playing');
          // Preload the next beat only after the current beat is ready and playing
          if (nextBeat && !sound.isTtsInCooldown()) {
            sound.preloadCutsceneLine(nextBeat.id, nextBeat.voiceText, nextBeat.voiceStyle, wardenVoice);
          }
        },
        onProgress: (pct) => {
          if (!active) return;
          setProgress(pct);
          if (beat.captions.length > 1) {
            const idx = Math.min(
              beat.captions.length - 1,
              Math.floor((pct / 100) * beat.captions.length)
            );
            setCaptionIndex(idx);
          }
        },
      })
      .then((res) => {
        if (!active || res.cancelled) return;
        if (!res.ok) {
          // Do not cut off or skip on voice error; show captions calmly and let user advance
          setVoiceState(res.quotaExceeded ? 'quota' : 'error');
          setProgress(100);
          if (beat.captions.length > 1) {
            fallbackCapTimer = window.setTimeout(() => {
              if (active) setCaptionIndex(beat.captions.length - 1);
            }, 3400);
          }
          return;
        }
        setVoiceState('done');
        setProgress(100);
        setCaptionIndex(beat.captions.length - 1);

        // Wait a natural breath after the voice finishes before advancing
        autoNextTimer = window.setTimeout(() => {
          if (!active) return;
          if (beatIndex < script.beats.length - 1) {
            setBeatIndex((b) => b + 1);
          } else {
            sound.stopSpeaking();
            onComplete();
          }
        }, 1450);
      });

    return () => {
      active = false;
      if (autoNextTimer !== null) clearTimeout(autoNextTimer);
      if (fallbackCapTimer !== null) clearTimeout(fallbackCapTimer);
      sound.stopSpeaking();
    };
  }, [beat, beatIndex, customVideoUrl, onComplete, replayNonce, script.beats, wardenVoice]);

  // Subtle atmospheric embers / rift sparks canvas layer
  useEffect(() => {
    if (reducedMotion || customVideoUrl) return;
    const canvas = particleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const particles = Array.from({ length: 30 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 1.2 + Math.random() * 2.2,
      vx: (Math.random() - 0.5) * 0.00035,
      vy: -(0.00025 + Math.random() * 0.00055),
      alpha: 0.25 + Math.random() * 0.55,
    }));

    const resize = () => {
      canvas.width = canvas.clientWidth || 1280;
      canvas.height = canvas.clientHeight || 720;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const color =
        beat?.accent === 'crimson'
          ? '244, 63, 94'
          : beat?.accent === 'cyan'
          ? '56, 224, 255'
          : '192, 132, 252';

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -0.05) {
          p.y = 1.05;
          p.x = Math.random();
        }
        if (p.x < -0.05) p.x = 1.05;
        if (p.x > 1.05) p.x = -0.05;

        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${p.alpha})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [beat?.accent, customVideoUrl, reducedMotion]);

  const handleAdvance = () => {
    sound.stopSpeaking();
    sound.sfx('tap');
    if (!customVideoUrl && beatIndex < script.beats.length - 1) {
      setBeatIndex((b) => b + 1);
    } else {
      onComplete();
    }
  };

  const handleReplayLine = () => {
    sound.sfx('tap');
    setReplayNonce((n) => n + 1);
  };

  const handleFileChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file || !onUploadCustomVideo) return;
    const url = URL.createObjectURL(file);
    onUploadCustomVideo(cutsceneId, url);
  };

  const motionClass =
    reducedMotion || !beat
      ? ''
      : beat.motion === 'zoom'
      ? 'animate-ken-zoom'
      : beat.motion === 'pan'
      ? 'animate-ken-pan'
      : 'animate-ken-lift';

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden bg-[#06080f] text-slate-100 select-none">
      {/* Slim Top Cinema Header */}
      <div className="relative z-20 flex items-center justify-between gap-2 px-4 py-2 bg-[#06080f] border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2.5 text-xs md:text-sm text-slate-300 min-w-0">
          <span className="font-display text-xs md:text-sm font-bold tracking-wide text-slate-100 truncate">
            {script.title}
          </span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="text-cyan-300 text-xs whitespace-nowrap">{script.subtitle}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenVoicePicker && (
            <button
              type="button"
              onClick={() => {
                sound.stopSpeaking();
                sound.sfx('tap');
                onOpenVoicePicker();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/60 bg-purple-950/60 px-2.5 py-1 text-xs font-semibold text-purple-100 hover:border-cyan-400 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Volume2 className="h-3.5 w-3.5 text-cyan-300" />
              Voice: {wardenVoice}
            </button>
          )}
          {onUploadCustomVideo && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-200 hover:border-cyan-400/60 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" />
                Load MP4
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              sound.stopSpeaking();
              sound.sfx('tap');
              onComplete();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-100 hover:border-cyan-400 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FastForward className="h-3.5 w-3.5" />
            Skip
          </button>
        </div>
      </div>

      {/* Main Widescreen Stage (100% unobstructed) */}
      <div className="relative flex-1 min-h-0 overflow-hidden flex items-center justify-center bg-black">
        {customVideoUrl ? (
          <video
            src={customVideoUrl}
            controls
            autoPlay
            onEnded={onComplete}
            className="h-full w-full object-contain"
          />
        ) : (
          beat && (
            <div className="relative h-full w-full overflow-hidden">
              {!imgError ? (
                <img
                  key={beat.id}
                  src={assetUrl(beat.image)}
                  alt={beat.voiceText}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className={`h-full w-full object-cover ${motionClass}`}
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-[#0e1629] via-[#1b1235] to-[#0b1f29] flex items-center justify-center">
                  <span className="font-display text-3xl text-cyan-300/80">{script.title}</span>
                </div>
              )}

              <canvas
                ref={particleCanvasRef}
                className="pointer-events-none absolute inset-0 h-full w-full"
              />
            </div>
          )
        )}
      </div>

      {/* Slim Bottom Cinema Subtitle Bar (always fits in viewport, never clips) */}
      {!customVideoUrl && beat && (
        <div className="relative z-20 shrink-0 bg-[#070a14] border-t border-slate-800/90">
          <div className="h-1 w-full bg-slate-900 overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mx-auto max-w-6xl px-4 py-2.5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleReplayLine}
              className="min-w-0 flex-1 text-left group cursor-pointer"
              title="Tap to hear this line again"
            >
              <div className="flex items-center gap-2 text-xs text-cyan-300 font-semibold mb-0.5">
                <span>{beat.speaker}</span>
                <span className="text-slate-600" aria-hidden="true">·</span>
                <span className="text-slate-400">
                  Scene {beatIndex + 1} of {script.beats.length}
                </span>
                {voiceState === 'loading' && (
                  <span className="text-amber-300 text-[11px]">Preparing voice...</span>
                )}
                {voiceState === 'error' && (
                  <span className="text-amber-300 text-[11px]">Voice unavailable. Press Next when ready.</span>
                )}
                {voiceState === 'quota' && (
                  <span className="text-amber-300 text-[11px]">Voice quota reached. Captions are active, press Next when ready.</span>
                )}
              </div>
              <p className="font-reading text-sm md:text-base font-semibold text-white leading-snug group-hover:text-cyan-200 transition-colors">
                {beat.captions[captionIndex] || beat.voiceText}
              </p>
            </button>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleReplayLine}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-cyan-200 hover:border-cyan-400 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Volume2 className="h-3.5 w-3.5" />
                {voiceState === 'playing' ? 'Speaking' : voiceState === 'loading' ? 'Loading' : 'Replay'}
              </button>
              {beatIndex > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    sound.stopSpeaking();
                    setBeatIndex(0);
                  }}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restart
                </button>
              )}
              <button
                type="button"
                onClick={handleAdvance}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3.5 py-1.5 text-xs md:text-sm font-bold text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                {beatIndex < script.beats.length - 1 ? 'Next' : 'Start Level'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
