import { SPEECH_SCORE_CONFIG, WordEntry } from '../data/level1';
import { isStaticHosting } from './assetUrl';

const DIRECT_SPEECH_WORKER_URL = 'https://rift-runners-speech.jimmaoscott.workers.dev';

export type SpeechEngineMode = 'azure' | 'chrome' | 'off';

export interface ListenResult {
  outcome: 'match' | 'miss' | 'nothing' | 'down' | 'again' | 'switch';
  engine: SpeechEngineMode;
  heard: string;
  note: string;
  reason?: string;
}

export interface ListenOptions {
  onLevel?: (level01: number) => void;
  onReady?: () => void;
}

const VOWELS = [
  'æ', 'ɪ', 'ɛ', 'ɑ', 'ɔ', 'ʌ', 'ə', 'ʊ', 'i', 'u',
  'eɪ', 'aɪ', 'aʊ', 'ɔɪ', 'oʊ', 'ɝ', 'ɚ', 'a', 'e', 'o',
];

const SAME: Record<string, string[]> = {
  'æ': ['æ', 'a'],
  'ɪ': ['ɪ', 'i'],
  'ɛ': ['ɛ'],
  'ɑ': ['ɑ', 'ɔ'],
  'ɔ': ['ɔ', 'ɑ'],
  'ʌ': ['ʌ', 'ə'],
};

const NASAL = ['m', 'n', 'ŋ'];
const SHORT: Record<string, string> = { a: 'æ', e: 'ɛ', i: 'ɪ', o: 'ɑ', u: 'ʌ' };

function shortVowel(w: string): string | null {
  const m = /^[^aeiou]*([aeiou])[^aeiouy]*$/.exec(String(w || '').toLowerCase());
  return m ? SHORT[m[1]] || null : null;
}

function normTokens(s: string): string[] {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9' ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function acceptsWord(target: string, also?: string[]): string[] {
  const t = String(target).toLowerCase();
  const out = [t, ...(also || []).map((a) => String(a).toLowerCase())];
  // Gulf Coast pin/pen merger support
  for (let i = 0; i < t.length - 1; i++) {
    if ((t[i] === 'i' || t[i] === 'e') && (t[i + 1] === 'm' || t[i + 1] === 'n')) {
      out.push(t.slice(0, i) + (t[i] === 'i' ? 'e' : 'i') + t.slice(i + 1));
    }
  }
  return out;
}

export function matchesChromeTranscript(
  target: string,
  transcripts: string[],
  also?: string[]
): boolean {
  const ok = acceptsWord(target, also);
  return transcripts.some((tx) => normTokens(tx).some((w) => ok.includes(w)));
}

export function scoreAzureWord(
  res: any,
  target: string,
  isRune = false
): {
  outcome: 'match' | 'miss' | 'nothing';
  note: string;
  alignmentDrop?: boolean;
  nasalSchwa?: boolean;
} {
  const s = SPEECH_SCORE_CONFIG;
  if (!res || res.status !== 'Success' || !res.word) {
    return {
      outcome: res && res.heard ? 'miss' : 'nothing',
      note: 'azure ' + (res && res.status ? res.status : 'no-match'),
    };
  }
  const w = res.word;
  const ph: Array<{ p: string; score: number; best?: Array<{ p: string; score: number }> }> = w.phonemes || [];
  if (w.error === 'Omission' || !ph.length) {
    return {
      outcome: res.heard ? 'miss' : 'nothing',
      note: 'azure skipped the word',
    };
  }

  const vi = ph.findIndex((p) => VOWELS.includes(p.p));
  if (vi < 0) {
    return {
      outcome: (w.accuracy || 0) >= s.wordMin ? 'match' : 'miss',
      note: `word ${Math.round(w.accuracy || 0)}`,
    };
  }

  const v = ph[vi];
  const nasal = Boolean(ph[vi + 1] && NASAL.includes(ph[vi + 1].p));
  const want = shortVowel(target) || v.p;
  const offGuess = want !== v.p;

  let ok = (SAME[want] || [want]).slice();
  if (nasal && (want === 'ɪ' || want === 'ɛ')) {
    ok = ok.concat(['ɪ', 'ɛ', 'i']);
  }
  if (nasal && want === 'æ') {
    // Nasalized short a before m/n (e.g., fan) can raise slightly in Azure NBest
    ok = ok.concat(['ɛ']);
  }

  const bestList = Array.isArray(v.best) ? v.best : [];
  const top = bestList[0]?.p || null;
  const second = bestList[1] || null;
  const topOK = Boolean(top && ok.includes(top));
  const topOther = Boolean(top && !topOK && VOWELS.includes(top));

  // For nonsense runes where Azure's dictionary guesses the wrong reference vowel,
  // also accept if our intended short vowel is a strong #2 candidate and #1 is NOT the opposite Level 1 vowel.
  const oppositeTargetVowel = want === 'æ' ? 'ɪ' : want === 'ɪ' ? 'æ' : null;
  const runeSecondOK =
    isRune &&
    offGuess &&
    Boolean(second && ok.includes(second.p) && (second.score || 0) >= 42) &&
    top !== oppositeTargetVowel;

  // Natural Southern / relaxed short i can dip slightly toward ɛ or ə while keeping ɪ right behind as #2.
  // Never allow clear wrong vowels (æ, ɑ, ɔ, ʌ, aɪ, eɪ, oʊ, u).
  const relaxedShortIOK =
    want === 'ɪ' &&
    Boolean(top && ['ɛ', 'ə', 'ɨ'].includes(top)) &&
    Boolean(second && ok.includes(second.p) && (second.score || 0) >= 35) &&
    (v.score || 0) >= 25;

  const vs = v.score || 0;
  const vowelPass = offGuess
    ? topOK || runeSecondOK
    : (topOK && vs >= 10) ||
      relaxedShortIOK ||
      (vs >= s.vowelMin && !(topOther && vs < s.vowelClearMiss));

  const consPh = ph.filter((_p, k) => k !== vi);
  const cons = consPh.map((p) => p.score || 0);
  const avg = cons.length ? cons.reduce((a, b) => a + b, 0) / cons.length : 100;

  // Natural American English often leaves final voiced stops (b/d/g) or nasals (m/n) softly unreleased.
  // If the vowel and opening consonant are solid, accept a quiet final consonant whose NBest matches its place of articulation.
  const SOFT_FINAL_NEIGHBORS: Record<string, string[]> = {
    b: ['b', 'p', 'm'],
    d: ['d', 't', 'n'],
    g: ['g', 'k', 'ŋ'],
    n: ['n', 'm', 'ŋ', 'd'],
    m: ['m', 'n', 'b'],
    p: ['p', 'b'],
    t: ['t', 'd'],
  };
  let consEachOK = cons.every((c) => c >= s.consonantEachMin);
  if (!consEachOK && consPh.length >= 2 && (topOK || vs >= 55)) {
    const leadingOK = cons.slice(0, -1).every((c) => c >= s.consonantEachMin);
    const finalIdx = consPh.length - 1;
    const finalPh = consPh[finalIdx];
    const allowedFinals = SOFT_FINAL_NEIGHBORS[finalPh.p] || [finalPh.p];
    const finalNBest = (finalPh.best || []).slice(0, 3).map((b) => b.p);
    if (leadingOK && cons[finalIdx] >= 4 && finalNBest.some((p) => allowedFinals.includes(p))) {
      consEachOK = true;
    }
  }

  // Catch World 2 digraph swaps (sh, ch, th unvoiced/voiced, wh, -ck) using multi-voice calibrated cutoffs.
  // - /ʃ/ and /tʃ/ share the fricative half, so swaps score 42-72 while clean reads score 79-100.
  // - /θ/ (thin) is very quiet; clean male/female/noisy reads score 61-82 (often with s/f as NBest #1),
  //   whereas saying "tin" drops to ~29 (heard t).
  // - /ð/ (this) cleanly scores 89-91 across voices; saying "dis" drops to ~30 (heard d).
  // - wh (/w/) cleanly scores 90-99; saying "rip" drops to ~16 (heard ɹ).
  // - -ck (/k/) cleanly scores 95-100; saying "log" drops to ~45 (heard g).
  const targetLower = String(target || '').toLowerCase();
  const hasWh = targetLower.includes('wh');
  const endsCk = targetLower.endsWith('ck');
  let digraphSwapMiss = false;
  let digraphDetail = '';

  for (let ci = 0; ci < consPh.length; ci++) {
    const cp = consPh[ci];
    const topC = Array.isArray(cp.best) ? cp.best[0]?.p : null;
    const sc = cp.score || 0;
    const isFinalCons = ci === consPh.length - 1;

    if (cp.p === 'ʃ' || cp.p === 'tʃ') {
      digraphDetail = `, ${cp.p} ${Math.round(sc)}${topC ? ` (heard ${topC})` : ''}`;
      const swappedWithNeighbor =
        (cp.p === 'ʃ' && (topC === 'tʃ' || topC === 's' || topC === 'ʒ')) ||
        (cp.p === 'tʃ' && (topC === 'ʃ' || topC === 's' || topC === 't' || topC === 'dʒ'));
      if (sc < 70 || (swappedWithNeighbor && sc < 82)) {
        digraphSwapMiss = true;
      }
    } else if (cp.p === 'θ') {
      digraphDetail = `, θ ${Math.round(sc)}${topC ? ` (heard ${topC})` : ''}`;
      if (sc < 48 || (topC === 't' && sc < 65)) {
        digraphSwapMiss = true;
      }
    } else if (cp.p === 'ð') {
      digraphDetail = `, ð ${Math.round(sc)}${topC ? ` (heard ${topC})` : ''}`;
      const swappedVoicedTh = topC === 'd' || topC === 'z' || topC === 'v' || topC === 't';
      if (sc < 55 || (swappedVoicedTh && sc < 75)) {
        digraphSwapMiss = true;
      }
    } else if (hasWh && cp.p === 'w') {
      digraphDetail = `, w ${Math.round(sc)}${topC ? ` (heard ${topC})` : ''}`;
      if (sc < 50 || (topC && topC !== 'w' && sc < 70)) {
        digraphSwapMiss = true;
      }
    } else if (endsCk && isFinalCons && cp.p === 'k') {
      digraphDetail = `, k ${Math.round(sc)}${topC ? ` (heard ${topC})` : ''}`;
      const swappedCk = topC === 'g' || topC === 't' || topC === 'p' || topC === 'd';
      if (sc < 55 || (swappedCk && sc < 72)) {
        digraphSwapMiss = true;
      }
    }
  }

  const consPass = avg >= s.consonantAvgMin && consEachOK && !digraphSwapMiss;
  const wordPass = topOK || runeSecondOK || relaxedShortIOK || (w.accuracy || 0) >= s.wordMin;

  // Detect Azure forced-alignment collapse or cold-mic onset clip where every phoneme drops very low
  // (e.g., word 0/12/25, vowel <= 30, cons 0/0, 15/0, or 0/28 even when Azure recognized the word)
  const maxCons = cons.length ? Math.max(...cons) : 0;
  const minCons = cons.length ? Math.min(...cons) : 0;
  const alignmentDrop =
    Math.round(w.accuracy || 0) <= 30 &&
    Math.round(vs) <= 30 &&
    maxCons <= 35 &&
    minCons <= 5;

  const nasalSchwa =
    !isRune &&
    nasal &&
    (want === 'ɪ' || want === 'ɛ') &&
    Boolean(top && ['ɪ', 'ɛ', 'i', 'ə', 'ɨ'].includes(top));

  const consSummary = cons.map((c) => Math.round(c)).join('/');
  const note = `vowel ${v.p} ${Math.round(vs)}${top ? ` (heard ${top})` : ''}${digraphDetail}, cons ${consSummary || 'n/a'}, word ${Math.round(w.accuracy || 0)}`;

  return {
    outcome: vowelPass && consPass && wordPass ? 'match' : 'miss',
    note,
    alignmentDrop,
    nasalSchwa,
  };
}

function to16k(chunks: Float32Array[], rate: number): Float32Array {
  let total = 0;
  for (const c of chunks) total += c.length;
  const all = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    all.set(c, offset);
    offset += c.length;
  }
  if (Math.abs(rate - 16000) < 1) return all;
  const ratio = rate / 16000;
  const out = new Float32Array(Math.floor(total / ratio));
  for (let i = 0; i < out.length; i++) {
    const a = Math.floor(i * ratio);
    const b = Math.min(total, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let k = a; k < b; k++) sum += all[k];
    out[i] = sum / Math.max(1, b - a);
  }
  return out;
}

// Only trim excess leading/trailing silence on longer recordings (> 2.2s)
// so soft opening consonants (/h/, /p/, /f/, /r/, /m/) are never clipped on short CVC words.
function trimSilence(samples: Float32Array, rate: number, threshold: number): Float32Array {
  if (samples.length < rate * 2.2) return samples;
  const frameLen = Math.floor(rate * 0.02); // 20ms frames
  let firstActive = -1;
  let lastActive = -1;
  for (let i = 0; i < samples.length; i += frameLen) {
    const end = Math.min(samples.length, i + frameLen);
    let sumSq = 0;
    for (let k = i; k < end; k++) sumSq += samples[k] * samples[k];
    const rms = Math.sqrt(sumSq / Math.max(1, end - i));
    if (rms >= threshold) {
      if (firstActive < 0) firstActive = i;
      lastActive = end;
    }
  }
  if (firstActive < 0 || lastActive <= firstActive) return samples;
  const padBefore = Math.floor(rate * 0.4);
  const padAfter = Math.floor(rate * 0.35);
  const start = Math.max(0, firstActive - padBefore);
  const stop = Math.min(samples.length, lastActive + padAfter);
  return samples.subarray(start, stop);
}

// RMS-aware normalization with soft peak limiting + 220ms clean silence lead/tail
// so Azure's acoustic aligner gets a reliable silence runway before initial plosives (/p/, /b/, /k/)
// and after final stops (/d/, /b/, /t/).
function encodeWav(samples: Float32Array, rate: number): ArrayBuffer {
  let sumSq = 0;
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
    sumSq += samples[i] * samples[i];
  }
  const rms = Math.sqrt(sumSq / Math.max(1, samples.length));
  const targetRmsGain = rms > 0.0015 ? 0.19 / rms : 1;
  const peakSafeGain = peak > 0.0015 ? 0.95 / peak : 1;
  const gain = Math.max(1, Math.min(14, Math.min(targetRmsGain, peakSafeGain * 1.45)));

  const padSamples = Math.floor(rate * 0.22); // 220ms silence runway on both ends
  const totalSamples = padSamples + samples.length + padSamples;

  const buf = new ArrayBuffer(44 + totalSamples * 2);
  const dv = new DataView(buf);
  const writeStr = (o: number, str: string) => {
    for (let i = 0; i < str.length; i++) dv.setUint8(o + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  dv.setUint32(4, 36 + totalSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, 1, true);
  dv.setUint32(24, rate, true);
  dv.setUint32(28, rate * 2, true);
  dv.setUint16(32, 2, true);
  dv.setUint16(34, 16, true);
  writeStr(36, 'data');
  dv.setUint32(40, totalSamples * 2, true);

  const dataOffset = 44 + padSamples * 2;
  for (let i = 0; i < samples.length; i++) {
    // Soft clip with tanh above 0.85 so stop bursts stay crisp without harsh digital clipping
    const v = samples[i] * gain;
    const clamped = Math.abs(v) > 0.85 ? Math.tanh(v) : v;
    dv.setInt16(dataOffset + i * 2, Math.max(-1, Math.min(1, clamped)) * 0x7fff, true);
  }
  return buf;
}

class SpeechVerifier {
  public azureOnline = false;
  public azureRegion = '';
  public azureChecked = false;
  public micBlockedReason: string | null = null;
  public busy = false;
  private activeCancel: (() => void) | null = null;
  private activeSubmitNow: (() => void) | null = null;
  private azureFailures = 0;
  private azureCooldownUntil = 0;
  private speechApiBase = isStaticHosting() ? DIRECT_SPEECH_WORKER_URL : '/api/speech';

  // Persistent warm mic + AudioContext + 240ms in-memory pre-roll ring buffer
  // so clicking SAY IT never clips initial consonants (/p/, /m/, /h/) and zero audio is ever stored.
  private warmStream: MediaStream | null = null;
  private warmCtx: AudioContext | null = null;
  private warmSource: MediaStreamAudioSourceNode | null = null;
  private warmProc: ScriptProcessorNode | null = null;
  private warmGain: GainNode | null = null;
  private warmFramesSeen = 0;
  private preRollChunks: Float32Array[] = [];
  private preRollSamples = 0;
  private activeFrameHandler: ((chunk: Float32Array, rms: number) => void) | null = null;
  private warmIdleTimer = 0;

  private getSpeechRecCtor(): any {
    if (typeof window === 'undefined') return null;
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
  }

  private get canRecord(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(
      typeof navigator.mediaDevices?.getUserMedia === 'function' &&
        (window.AudioContext || (window as any).webkitAudioContext)
    );
  }

  private async ensureWarmPipeline(): Promise<{ sampleRate: number }> {
    clearTimeout(this.warmIdleTimer);

    const hasLiveStream = Boolean(
      this.warmStream &&
        this.warmStream.getAudioTracks().some((t) => t.readyState === 'live') &&
        this.warmCtx &&
        this.warmCtx.state !== 'closed' &&
        this.warmProc
    );

    if (hasLiveStream && this.warmCtx) {
      if (this.warmCtx.state === 'suspended') {
        await this.warmCtx.resume().catch(() => {});
      }
      return { sampleRate: this.warmCtx.sampleRate };
    }

    this.releaseMicStream();

    // Disable browser WebRTC noiseSuppression and autoGainControl because they gate/attenuate
    // isolated initial plosives (/p/, /t/, /k/) and soft nasals (/m/) on short CVC words.
    // Our encodeWav RMS normalization + Azure's speech acoustic frontend handle gain cleanly.
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    const AC = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }

    const source = ctx.createMediaStreamSource(stream);
    const proc = ctx.createScriptProcessor(1024, 1, 1);
    const silentGain = ctx.createGain();
    silentGain.gain.value = 0;

    this.warmStream = stream;
    this.warmCtx = ctx;
    this.warmSource = source;
    this.warmProc = proc;
    this.warmGain = silentGain;
    this.warmFramesSeen = 0;
    this.preRollChunks = [];
    this.preRollSamples = 0;

    const maxPreRollSamples = Math.floor(ctx.sampleRate * 0.08); // Tight 80ms pre-roll avoids capturing mouse clicks or trailing SFX

    proc.onaudioprocess = (ev) => {
      const data = ev.inputBuffer.getChannelData(0);
      const copy = new Float32Array(data);
      this.warmFramesSeen++;

      let sumSq = 0;
      for (let i = 0; i < copy.length; i++) sumSq += copy[i] * copy[i];
      const rms = Math.sqrt(sumSq / copy.length);

      if (this.activeFrameHandler) {
        this.activeFrameHandler(copy, rms);
      } else {
        this.preRollChunks.push(copy);
        this.preRollSamples += copy.length;
        while (this.preRollSamples > maxPreRollSamples && this.preRollChunks.length > 1) {
          const dropped = this.preRollChunks.shift();
          if (dropped) this.preRollSamples -= dropped.length;
        }
      }
    };

    source.connect(proc);
    proc.connect(silentGain);
    silentGain.connect(ctx.destination);

    // Wait briefly until cold-mic AEC ramp-up settles (fixes word #1 clipping on soft /sh/, /p/, /f/)
    await new Promise<void>((resolve) => {
      const startWait = performance.now();
      const check = () => {
        if (this.warmFramesSeen >= 6 || performance.now() - startWait >= 320 || !this.warmCtx) {
          resolve();
          return;
        }
        window.setTimeout(check, 20);
      };
      check();
    });
    // Discard cold ramp-up frames so the first word starts on clean steady mic gain
    this.preRollChunks = [];
    this.preRollSamples = 0;

    return { sampleRate: ctx.sampleRate };
  }

  private scheduleMicRelease() {
    clearTimeout(this.warmIdleTimer);
    this.warmIdleTimer = window.setTimeout(() => {
      if (!this.busy) this.releaseMicStream();
    }, 60000);
  }

  releaseMicStream() {
    clearTimeout(this.warmIdleTimer);
    this.activeFrameHandler = null;
    this.preRollChunks = [];
    this.preRollSamples = 0;
    this.warmFramesSeen = 0;
    try {
      if (this.warmProc) this.warmProc.disconnect();
      if (this.warmSource) this.warmSource.disconnect();
      if (this.warmGain) this.warmGain.disconnect();
      if (this.warmCtx) this.warmCtx.close().catch(() => {});
    } catch {
      // ignore
    }
    this.warmProc = null;
    this.warmSource = null;
    this.warmGain = null;
    this.warmCtx = null;

    if (this.warmStream) {
      try {
        this.warmStream.getTracks().forEach((t) => t.stop());
      } catch {
        // ignore
      }
      this.warmStream = null;
    }
  }

  async initAzure(): Promise<boolean> {
    if (!this.canRecord) {
      this.azureOnline = false;
      this.azureChecked = true;
      return false;
    }
    const candidates = isStaticHosting()
      ? [DIRECT_SPEECH_WORKER_URL]
      : ['/api/speech', DIRECT_SPEECH_WORKER_URL];

    for (const base of candidates) {
      try {
        const res = await fetch(`${base}/health`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(4000),
        });
        const data = await res.json().catch(() => ({ ok: false }));
        if (res.ok && data.ok) {
          this.speechApiBase = base;
          this.azureOnline = true;
          this.azureRegion = data.region || '';
          this.azureChecked = true;
          return true;
        }
      } catch {
        // try next endpoint
      }
    }
    this.azureOnline = false;
    this.azureChecked = true;
    return false;
  }

  engine(): SpeechEngineMode {
    if (this.micBlockedReason) return 'off';
    if (this.azureOnline && this.canRecord && performance.now() >= this.azureCooldownUntil) {
      return 'azure';
    }
    if (this.getSpeechRecCtor()) return 'chrome';
    return 'off';
  }

  usable(): boolean {
    return this.engine() !== 'off';
  }

  canCheck(word: WordEntry, allowSpokenRunes = true): boolean {
    if (!word || word.noSpeak) return false;
    const eng = this.engine();
    if (eng === 'azure') {
      return word.kind !== 'rune' || allowSpokenRunes;
    }
    if (eng === 'chrome') {
      return word.kind !== 'rune' && !/[ie][mn]/.test(word.w);
    }
    return false;
  }

  // Allow fast readers to click LISTENING again to immediately score what they just said
  submitNow() {
    if (this.activeSubmitNow) {
      this.activeSubmitNow();
    }
  }

  stop() {
    this.activeSubmitNow = null;
    if (this.activeCancel) {
      const fn = this.activeCancel;
      this.activeCancel = null;
      fn();
    }
    this.busy = false;
  }

  listen(
    word: Pick<WordEntry, 'w' | 'sayAlso' | 'kind' | 'azureRef'>,
    options?: ListenOptions
  ): Promise<ListenResult> {
    this.stop();
    const eng = this.engine();
    if (eng === 'off') {
      return Promise.resolve({
        outcome: 'down',
        engine: 'off',
        heard: '',
        note: 'Microphone unavailable',
        reason: this.micBlockedReason || 'This browser cannot use speak mode. Tap mode still works for everything.',
      });
    }

    if (eng === 'azure') {
      return this.listenAzureWithBackup(word, options);
    }
    return this.listenChromeOnly(word, options);
  }

  private listenChromeOnly(
    word: Pick<WordEntry, 'w' | 'sayAlso'>,
    options?: ListenOptions
  ): Promise<ListenResult> {
    return new Promise((resolve) => {
      const Rec = this.getSpeechRecCtor();
      if (!Rec) {
        resolve({ outcome: 'down', engine: 'off', heard: '', note: 'No speech recognizer' });
        return;
      }
      this.busy = true;
      const rec = new Rec();
      rec.lang = 'en-US';
      rec.interimResults = true;
      rec.continuous = true;
      rec.maxAlternatives = 5;

      const heard: string[] = [];
      let done = false;
      let settleTimer = 0;
      const maxTimer = window.setTimeout(() => finish('timeout'), SPEECH_SCORE_CONFIG.maxListenMs);

      const finish = (why: string, matched = false) => {
        if (done) return;
        done = true;
        clearTimeout(maxTimer);
        clearTimeout(settleTimer);
        this.busy = false;
        this.activeCancel = null;
        this.activeSubmitNow = null;
        options?.onLevel?.(0);
        try {
          rec.abort();
        } catch {
          // ignore
        }
        if (matched) {
          resolve({ outcome: 'match', engine: 'chrome', heard: heard.join(', '), note: 'matched in Chrome' });
        } else if (why === 'not-allowed' || why === 'service-not-allowed') {
          this.micBlockedReason = 'The microphone is blocked here. Tap mode still works for everything.';
          resolve({ outcome: 'down', engine: 'chrome', heard: '', note: why, reason: this.micBlockedReason });
        } else if (!heard.length) {
          resolve({ outcome: 'nothing', engine: 'chrome', heard: '', note: why });
        } else {
          resolve({ outcome: 'miss', engine: 'chrome', heard: heard.join(', '), note: 'heard different word' });
        }
      };

      this.activeCancel = () => finish('cancelled');
      this.activeSubmitNow = () => finish('manual-submit');

      rec.onstart = () => options?.onReady?.();
      rec.onresult = (ev: any) => {
        options?.onLevel?.(0.6);
        let isFinal = false;
        for (let i = ev.resultIndex || 0; i < ev.results.length; i++) {
          const r = ev.results[i];
          if (r.isFinal) isFinal = true;
          for (let k = 0; k < r.length; k++) {
            const tx = (r[k].transcript || '').trim();
            if (tx && !heard.includes(tx)) heard.push(tx);
          }
        }
        if (matchesChromeTranscript(word.w, heard, word.sayAlso)) {
          finish('matched', true);
          return;
        }
        if (isFinal) {
          clearTimeout(settleTimer);
          settleTimer = window.setTimeout(() => finish('settled'), 650);
        }
      };
      rec.onerror = (ev: any) => finish(ev?.error || 'error');
      rec.onend = () => finish('ended');

      try {
        rec.start();
      } catch {
        finish('start-error');
      }
    });
  }

  private listenAzureWithBackup(
    word: Pick<WordEntry, 'w' | 'sayAlso' | 'kind' | 'azureRef'>,
    options?: ListenOptions
  ): Promise<ListenResult> {
    return new Promise((resolve) => {
      this.busy = true;
      let done = false;
      const chunks: Float32Array[] = [];
      let speechStarted = false;
      let lastLoudAt = 0;
      let maxTimer = 0;

      // Voice activity detector: require sustained speech frames and ignore the initial click transient
      const voiceThreshold = 0.013;
      let peakRmsSeen = 0;
      let consecutiveVoiceFrames = 0;
      let speechStartedAt = 0;

      // Parallel Chrome backup (for real words only; runes go exclusively to Azure phoneme scoring)
      const Rec = this.getSpeechRecCtor();
      let rec: any = null;
      const chromeHeard: string[] = [];
      let chromeMatched = false;

      const stopMicCapture = (abortChrome: boolean) => {
        clearTimeout(maxTimer);
        this.activeSubmitNow = null;
        this.activeFrameHandler = null;
        options?.onLevel?.(0);
        try {
          if (rec) {
            if (abortChrome) rec.abort();
            else rec.stop();
          }
        } catch {
          // ignore
        }
        this.scheduleMicRelease();
      };

      const finish = (result: ListenResult) => {
        if (done) return;
        done = true;
        this.busy = false;
        this.activeCancel = null;
        stopMicCapture(true);
        resolve(result);
      };

      this.activeCancel = () => {
        finish({ outcome: 'nothing', engine: 'azure', heard: '', note: 'cancelled' });
      };

      const submitRecording = async (sampleRate: number) => {
        if (done) return;
        // Stop mic capture and let Chrome flush its final transcript while Azure runs in parallel
        stopMicCapture(false);
        const raw16k = to16k(chunks, sampleRate);
        if (raw16k.length < 1600 || peakRmsSeen < 0.005) {
          if (chromeMatched && word.kind !== 'rune') {
            finish({ outcome: 'match', engine: 'chrome', heard: chromeHeard.join(', '), note: 'Chrome backup' });
            return;
          }
          finish({ outcome: 'nothing', engine: 'azure', heard: chromeHeard.join(', '), note: 'too quiet' });
          return;
        }

        const trimmed = trimSilence(raw16k, 16000, 0.009);
        const clipToSend = trimmed.length >= 2400 ? trimmed : raw16k;
        const wav = encodeWav(clipToSend, 16000);
        const azureRefWord = (word.azureRef || word.w).toLowerCase();

        try {
          const isDirectWorker = this.speechApiBase.startsWith('http');
          const res = await fetch(`${this.speechApiBase}/check?ref=${encodeURIComponent(azureRefWord)}`, {
            method: 'POST',
            headers: {
              'Content-Type': isDirectWorker
                ? 'audio/wav; codecs=audio/pcm; samplerate=16000'
                : 'application/octet-stream',
            },
            body: wav,
            signal: AbortSignal.timeout(SPEECH_SCORE_CONFIG.checkTimeoutMs),
          });
          if (done) return;
          if (!res.ok) {
            if (res.status === 429) {
              this.azureCooldownUntil = performance.now() + 60000;
            } else if (res.status >= 500) {
              this.azureFailures++;
              if (this.azureFailures >= 3) {
                this.azureCooldownUntil = performance.now() + 30000;
                this.azureFailures = 0;
              }
            }
            if (chromeMatched && word.kind !== 'rune') {
              finish({ outcome: 'match', engine: 'chrome', heard: chromeHeard.join(', '), note: 'Chrome fallback' });
              return;
            }
            finish({ outcome: 'again', engine: 'azure', heard: chromeHeard.join(', '), note: `worker ${res.status}` });
            return;
          }
          const json = await res.json();
          const scored = scoreAzureWord(json, word.w, word.kind === 'rune');
          const heardText = json.heard || chromeHeard.join(', ');
          if (scored.outcome === 'match') {
            this.azureFailures = 0;
            finish({ outcome: 'match', engine: 'azure', heard: heardText, note: scored.note });
          } else if (scored.outcome === 'nothing') {
            if (chromeMatched && word.kind !== 'rune') {
              finish({ outcome: 'match', engine: 'chrome', heard: chromeHeard.join(', '), note: 'Chrome backup' });
              return;
            }
            finish({ outcome: 'nothing', engine: 'azure', heard: heardText, note: scored.note });
          } else if (
            chromeMatched &&
            word.kind !== 'rune' &&
            (scored.alignmentDrop || scored.nasalSchwa)
          ) {
            this.azureFailures = 0;
            finish({
              outcome: 'match',
              engine: 'azure',
              heard: heardText,
              note: `confirmed (${scored.note})`,
            });
          } else if (
            scored.alignmentDrop &&
            matchesChromeTranscript(
              word.w,
              [json.heard || ''],
              [...(word.sayAlso || []), ...(word.azureRef ? [word.azureRef] : [])]
            )
          ) {
            // Azure recognized the word but its phoneme aligner collapsed (e.g., word 0/12, cons 0/0).
            // Never penalize the reader's streak or payout for an aligner glitch; offer a clean retry.
            finish({
              outcome: 'again',
              engine: 'azure',
              heard: heardText,
              note: `aligner glitch (${scored.note})`,
            });
          } else {
            finish({ outcome: 'miss', engine: 'azure', heard: heardText, note: scored.note });
          }
        } catch {
          if (chromeMatched && word.kind !== 'rune') {
            finish({ outcome: 'match', engine: 'chrome', heard: chromeHeard.join(', '), note: 'Chrome timeout backup' });
            return;
          }
          finish({ outcome: 'again', engine: 'azure', heard: chromeHeard.join(', '), note: 'network timeout' });
        }
      };

      this.ensureWarmPipeline()
        .then(({ sampleRate }) => {
          if (done) return;

          // Prepend rolling 240ms pre-roll so starting to speak right on click never clips /p/ or /m/
          if (this.preRollChunks.length > 0) {
            for (const c of this.preRollChunks) {
              chunks.push(c);
            }
            this.preRollChunks = [];
            this.preRollSamples = 0;
          }

          if (Rec && word.kind !== 'rune') {
            try {
              rec = new Rec();
              rec.lang = 'en-US';
              rec.interimResults = true;
              rec.continuous = true;
              rec.maxAlternatives = 4;
              rec.onresult = (ev: any) => {
                for (let i = ev.resultIndex || 0; i < ev.results.length; i++) {
                  for (let k = 0; k < ev.results[i].length; k++) {
                    const tx = (ev.results[i][k].transcript || '').trim();
                    if (tx && !chromeHeard.includes(tx)) chromeHeard.push(tx);
                  }
                }
                if (matchesChromeTranscript(word.w, chromeHeard, word.sayAlso)) {
                  chromeMatched = true;
                }
              };
              rec.start();
            } catch {
              rec = null;
            }
          }

          const startedAt = performance.now();
          let submitted = false;

          const triggerSubmit = () => {
            if (!submitted && !done) {
              submitted = true;
              submitRecording(sampleRate);
            }
          };
          this.activeSubmitNow = triggerSubmit;

          this.activeFrameHandler = (chunk, rms) => {
            if (done || submitted) return;
            chunks.push(chunk);

            if (rms > peakRmsSeen) peakRmsSeen = rms;

            const now = performance.now();
            const elapsed = now - startedAt;

            // Live input meter normalized nicely for visual feedback
            options?.onLevel?.(Math.min(1, rms * 16));

            // Ignore the first 90ms after clicking SAY IT so mouse-click transients cannot arm end-of-speech early
            if (elapsed >= 90) {
              if (rms >= voiceThreshold) {
                consecutiveVoiceFrames++;
                lastLoudAt = now;
                if (!speechStarted && consecutiveVoiceFrames >= 3) {
                  speechStarted = true;
                  speechStartedAt = now;
                }
              } else {
                consecutiveVoiceFrames = 0;
              }
            }

            if (
              speechStarted &&
              now - speechStartedAt >= 200 &&
              now - lastLoudAt >= SPEECH_SCORE_CONFIG.endSilenceMs &&
              elapsed >= 650
            ) {
              triggerSubmit();
            }
          };

          options?.onReady?.();

          maxTimer = window.setTimeout(triggerSubmit, SPEECH_SCORE_CONFIG.maxListenMs);
        })
        .catch((err) => {
          const name = err?.name || 'Error';
          if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'NotFoundError') {
            this.micBlockedReason =
              'The microphone is blocked or not connected. Tap mode still works for everything.';
          }
          finish({
            outcome: 'down',
            engine: 'off',
            heard: '',
            note: name,
            reason:
              this.micBlockedReason ||
              'The microphone did not turn on. Tap mode still works for everything.',
          });
        });
    });
  }
}

export const speech = new SpeechVerifier();
