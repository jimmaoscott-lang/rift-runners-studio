import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const SPEECH_WORKER_URL = 'https://rift-runners-speech.jimmaoscott.workers.dev';

const MAX_AUDIO_BYTES = 200 * 1024;

// Disk + memory cache for generated Warden voice WAV clips (never stores student audio)
const TTS_CACHE_DIR = path.resolve(__dirname, 'public', 'assets', 'audio', 'tts-cache');
try {
  fs.mkdirSync(TTS_CACHE_DIR, { recursive: true });
} catch {
  // ignore if read-only filesystem
}
const cutsceneAudioCache = new Map<string, { buffer: Buffer; contentType: string }>();

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();

  app.use('/api/tts', express.json({ limit: '16kb' }));

  // -------------------------------------------------------------------------
  // Speech Verification Proxy (Azure Pronunciation Assessment)
  // Proxies server-to-server to the live Rift Runners Cloudflare Speech Worker.
  // Zero student audio is stored or logged.
  // -------------------------------------------------------------------------
  app.get('/api/speech/health', async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const workerRes = await fetch(`${SPEECH_WORKER_URL}/health`, {
        signal: AbortSignal.timeout(3500),
      });
      const data = await workerRes.json().catch(() => ({ ok: false }));
      return res.status(workerRes.ok ? 200 : 502).json({
        ...data,
        mode: 'azure-worker',
      });
    } catch {
      return res.status(502).json({ ok: false, mode: 'azure-worker', error: 'unreachable' });
    }
  });

  app.post(
    '/api/speech/check',
    express.raw({ type: () => true, limit: '256kb' }),
    async (req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      const ref = String(req.query.ref || '').trim().toLowerCase();
      if (!/^[a-z]{1,12}$/.test(ref)) {
        return res.status(400).json({ ok: false, error: 'bad-word' });
      }
      const audioBuf = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      if (audioBuf.byteLength < 1000 || audioBuf.byteLength > MAX_AUDIO_BYTES) {
        return res.status(400).json({ ok: false, error: 'bad-audio', bytes: audioBuf.byteLength });
      }

      try {
        const workerRes = await fetch(
          `${SPEECH_WORKER_URL}/check?ref=${encodeURIComponent(ref)}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
            },
            body: new Uint8Array(audioBuf),
            signal: AbortSignal.timeout(5000),
          }
        );
        const data = await workerRes.json().catch(() => ({ ok: false, error: 'bad-json' }));
        return res.status(workerRes.status).json(data);
      } catch {
        return res.status(502).json({ ok: false, error: 'worker-timeout' });
      }
    }
  );

  // -------------------------------------------------------------------------
  // Voice Acting & Narration via Gemini TTS (gemini-3.8-flash-lite-tts)
  // Supports selectable mentor voices for cutscenes, walkthrough steps, and
  // the in-app Voice Audition picker.
  // -------------------------------------------------------------------------
  const ALLOWED_VOICES = new Set([
    'Kore',
    'Zephyr',
    'Aoede',
    'Leda',
    'Charon',
    'Fenrir',
    'Puck',
    'Orus',
  ]);

  function ensureWavBuffer(raw: Buffer, sampleRate = 24000): Buffer {
    if (raw.length >= 12 && raw.subarray(0, 4).toString('ascii') === 'RIFF') {
      return raw;
    }
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const dataSize = raw.length;
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);
    return Buffer.concat([header, raw]);
  }

  type TtsGenerationResult =
    | { ok: true; buffer: Buffer; contentType: string }
    | { ok: false; status: number; code: string; error: string; retryAfterSec?: number };

  const ttsInFlight = new Map<string, Promise<TtsGenerationResult>>();
  let ttsQueueTail: Promise<void> = Promise.resolve();
  let ttsQuotaCooldownUntil = 0;
  let lastTtsCallAt = 0;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  function parseRetryAfterSec(msg: string, isDaily: boolean): number {
    const match = msg.match(/retry(?:\s+in|\s+after)?\s+(\d+(?:\.\d+)?)s/i);
    if (match) {
      const parsed = Math.ceil(Number(match[1]));
      if (Number.isFinite(parsed) && parsed > 0) return Math.min(300, Math.max(15, parsed));
    }
    return isDaily ? 180 : 60;
  }

  function enqueueTtsWork<T>(fn: () => Promise<T>): Promise<T> {
    const run = ttsQueueTail.then(async () => {
      const elapsed = Date.now() - lastTtsCallAt;
      if (elapsed < 450) {
        await sleep(450 - elapsed);
      }
      lastTtsCallAt = Date.now();
      return fn();
    });
    ttsQueueTail = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  app.post('/api/tts/cutscene', async (req, res) => {
    const id = String(req.body?.id || '').trim();
    const text = String(req.body?.text || '').trim();
    const requestedVoice = String(req.body?.voiceName || 'Leda').trim();
    const voiceName = ALLOWED_VOICES.has(requestedVoice) ? requestedVoice : 'Leda';
    const style = String(
      req.body?.style ||
        'Calm, steady, plain-spoken veteran guardian talking to a teenage recruit. Clear natural pacing, grounded and encouraging.'
    ).trim();

    if (!id || !text || text.length > 650) {
      return res.status(400).json({ ok: false, code: 'BAD_REQUEST', error: 'Invalid voice request.' });
    }

    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
    const cacheKey = `${voiceName}_${safeId}`;
    const diskMp3Path = path.join(TTS_CACHE_DIR, `${cacheKey}.mp3`);
    const diskPath = path.join(TTS_CACHE_DIR, `${cacheKey}.wav`);

    const memCached = cutsceneAudioCache.get(cacheKey);
    if (memCached) {
      res.setHeader('Content-Type', memCached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(memCached.buffer);
    }

    if (fs.existsSync(diskMp3Path)) {
      try {
        const diskBuf = fs.readFileSync(diskMp3Path);
        if (diskBuf.length > 256) {
          cutsceneAudioCache.set(cacheKey, { buffer: diskBuf, contentType: 'audio/mpeg' });
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return res.send(diskBuf);
        }
      } catch {
        // continue to wav fallback
      }
    }

    if (fs.existsSync(diskPath)) {
      try {
        const diskBuf = fs.readFileSync(diskPath);
        if (diskBuf.length > 44) {
          cutsceneAudioCache.set(cacheKey, { buffer: diskBuf, contentType: 'audio/wav' });
          res.setHeader('Content-Type', 'audio/wav');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return res.send(diskBuf);
        }
      } catch {
        // continue to regenerate
      }
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        ok: false,
        code: 'MISSING_API_KEY',
        error: 'Gemini TTS unavailable because no API key is configured.',
      });
    }

    const now = Date.now();
    if (now < ttsQuotaCooldownUntil) {
      const retryAfterSec = Math.max(1, Math.ceil((ttsQuotaCooldownUntil - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        ok: false,
        code: 'QUOTA_EXHAUSTED',
        retryAfterSec,
        error: 'Voice generation quota temporarily reached. Captions remain active.',
      });
    }

    let pending = ttsInFlight.get(cacheKey);
    if (!pending) {
      pending = enqueueTtsWork(async (): Promise<TtsGenerationResult> => {
        // Re-check cache & cooldown in case an earlier queued request populated them
        const cachedAfterWait = cutsceneAudioCache.get(cacheKey);
        if (cachedAfterWait) {
          return { ok: true, buffer: cachedAfterWait.buffer, contentType: cachedAfterWait.contentType };
        }
        const waitNow = Date.now();
        if (waitNow < ttsQuotaCooldownUntil) {
          return {
            ok: false,
            status: 429,
            code: 'QUOTA_EXHAUSTED',
            retryAfterSec: Math.max(1, Math.ceil((ttsQuotaCooldownUntil - waitNow) / 1000)),
            error: 'Voice generation quota temporarily reached. Captions remain active.',
          };
        }

        const model = 'gemini-3.8-flash-lite-tts';
        const maxAttempts = 2;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            const response = await ai.models.generateContent({
              model,
              contents: [
                {
                  role: 'user',
                  parts: [{ text, speechMetadata: { style } } as any],
                },
              ],
              config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName },
                  },
                },
              },
            });

            const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
            const base64Audio = inlineData?.data;
            if (!base64Audio) {
              return {
                ok: false,
                status: 502,
                code: 'EMPTY_AUDIO',
                error: 'No audio was returned by the voice service.',
              };
            }

            const rawBuffer = Buffer.from(base64Audio, 'base64');
            const wavBuffer = ensureWavBuffer(rawBuffer, 24000);
            cutsceneAudioCache.set(cacheKey, { buffer: wavBuffer, contentType: 'audio/wav' });
            try {
              fs.writeFileSync(diskPath, wavBuffer);
            } catch {
              // ignore disk write error if read-only
            }
            return { ok: true, buffer: wavBuffer, contentType: 'audio/wav' };
          } catch (err: any) {
            const msg = err?.message || String(err);
            const statusCode = Number(err?.status || err?.code || 0);
            const isQuota =
              statusCode === 429 ||
              msg.includes('429') ||
              msg.includes('RESOURCE_EXHAUSTED') ||
              msg.toLowerCase().includes('quota');
            const isDailyQuota = /perday|daily|requestsperday/i.test(msg);
            const isAuth =
              statusCode === 401 ||
              statusCode === 403 ||
              msg.includes('PERMISSION_DENIED') ||
              msg.includes('API_KEY_INVALID');
            const isTransient =
              statusCode === 500 ||
              statusCode === 503 ||
              msg.includes('500') ||
              msg.includes('503') ||
              msg.includes('UNAVAILABLE');

            if (isAuth) {
              return {
                ok: false,
                status: 403,
                code: 'API_KEY_ERROR',
                error: 'Gemini API key permission error. Check your key in Settings > Secrets.',
              };
            }

            if (isQuota) {
              // Retry once after brief backoff only if not explicitly a daily limit
              if (!isDailyQuota && attempt === 0) {
                await sleep(1600);
                continue;
              }
              const retryAfterSec = parseRetryAfterSec(msg, isDailyQuota);
              ttsQuotaCooldownUntil = Date.now() + retryAfterSec * 1000;
              return {
                ok: false,
                status: 429,
                code: 'QUOTA_EXHAUSTED',
                retryAfterSec,
                error: 'Voice generation quota temporarily reached. Captions remain active.',
              };
            }

            if (isTransient && attempt === 0) {
              await sleep(1000);
              continue;
            }

            return {
              ok: false,
              status: 502,
              code: 'TTS_FAILED',
              error: 'Voice generation failed temporarily.',
            };
          }
        }

        return {
          ok: false,
          status: 502,
          code: 'TTS_FAILED',
          error: 'Voice generation failed temporarily.',
        };
      });

      ttsInFlight.set(cacheKey, pending);
      pending.finally(() => {
        ttsInFlight.delete(cacheKey);
      });
    }

    const result = await pending;
    if (result.ok) {
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(result.buffer);
    }

    if (result.retryAfterSec) {
      res.setHeader('Retry-After', String(result.retryAfterSec));
    }
    return res.status(result.status).json({
      ok: false,
      code: result.code,
      retryAfterSec: result.retryAfterSec,
      error: result.error,
    });
  });

  // -------------------------------------------------------------------------
  // Vite Middleware (Dev) or Static Assets (Prod)
  // -------------------------------------------------------------------------
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gemini Version: Rift Runner server running on http://localhost:${PORT}`);
  });
}

startServer();
