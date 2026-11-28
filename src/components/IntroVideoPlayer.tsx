import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FastForward, Play, ArrowRight } from 'lucide-react';
import { assetUrl } from '../lib/assetUrl';
import { sound } from '../lib/audio';

interface IntroVideoPlayerProps {
  onComplete: () => void;
}

const INTRO_VIDEO_PATH = '/assets/video/rift-intro.mp4';

export const IntroVideoPlayer: React.FC<IntroVideoPlayerProps> = ({ onComplete }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [status, setStatus] = useState<'loading' | 'playing' | 'blocked' | 'error'>('loading');
  const videoSrc = assetUrl(INTRO_VIDEO_PATH);

  const finishOnce = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    const el = videoRef.current;
    if (el) {
      try {
        el.pause();
        el.currentTime = 0;
      } catch {
        // ignore media cleanup errors
      }
    }
    sound.stopSpeaking();
    sound.duck(0);
    onCompleteRef.current();
  }, []);

  // Stop game music, narration, and SFX while the intro video plays; restore normal audio afterward
  useEffect(() => {
    sound.stopSpeaking();
    sound.setMusic(null);
    sound.duck(2);

    const el = videoRef.current;
    if (el) {
      el.muted = false;
      const playAttempt = el.play();
      if (playAttempt !== undefined) {
        playAttempt
          .then(() => {
            if (!completedRef.current) {
              setStatus('playing');
            }
          })
          .catch((err: unknown) => {
            if (completedRef.current) return;
            const errName =
              typeof err === 'object' && err !== null && 'name' in err
                ? String((err as { name?: unknown }).name)
                : '';
            if (errName === 'AbortError') return;
            setStatus((prev) => (prev === 'error' ? 'error' : 'blocked'));
          });
      }
    }

    return () => {
      if (el) {
        try {
          el.pause();
        } catch {
          // ignore
        }
      }
      sound.duck(0);
      sound.setMusic('calm');
    };
  }, []);

  const handleTapToPlay = () => {
    const el = videoRef.current;
    if (!el || completedRef.current) return;
    sound.stopSpeaking();
    sound.setMusic(null);
    sound.duck(2);
    el.muted = false;
    const playAttempt = el.play();
    if (playAttempt !== undefined) {
      playAttempt
        .then(() => {
          if (!completedRef.current) {
            setStatus('playing');
          }
        })
        .catch(() => {
          if (!completedRef.current) {
            setStatus('error');
          }
        });
    } else {
      setStatus('playing');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-black text-slate-100 select-none">
      <video
        ref={videoRef}
        src={videoSrc}
        playsInline
        autoPlay
        preload="auto"
        onPlaying={() => {
          if (!completedRef.current) setStatus('playing');
        }}
        onEnded={finishOnce}
        onError={() => {
          if (!completedRef.current) setStatus('error');
        }}
        className="h-full w-full object-contain"
      />

      {/* Clear Skip Button */}
      <button
        type="button"
        onClick={finishOnce}
        className="absolute top-4 right-4 z-20 inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-400/60 bg-slate-950/80 px-4 py-2 text-sm font-bold text-white shadow-lg backdrop-blur-sm transition-colors hover:border-cyan-300 hover:bg-slate-900 cursor-pointer"
      >
        <FastForward className="h-4 w-4 text-cyan-300" />
        <span>Skip</span>
      </button>

      {/* Autoplay Blocked Fallback */}
      {status === 'blocked' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 p-6 backdrop-blur-xs">
          <button
            type="button"
            onClick={handleTapToPlay}
            className="inline-flex items-center gap-3 rounded-2xl bg-cyan-400 px-8 py-5 text-xl font-extrabold text-slate-950 shadow-2xl transition-colors hover:bg-cyan-300 cursor-pointer"
          >
            <Play className="h-6 w-6 fill-current" />
            <span>Tap to Play</span>
          </button>
        </div>
      )}

      {/* Load Failure Fallback */}
      {status === 'error' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-black/85 p-6 text-center">
          <p className="max-w-md text-base font-semibold text-slate-200">
            The intro video could not be loaded right now.
          </p>
          <button
            type="button"
            onClick={finishOnce}
            className="inline-flex items-center gap-2.5 rounded-2xl bg-cyan-400 px-7 py-4 text-lg font-extrabold text-slate-950 shadow-xl transition-colors hover:bg-cyan-300 cursor-pointer"
          >
            <span>Continue</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
};
