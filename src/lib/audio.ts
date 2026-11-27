import { assetUrl, isStaticHosting } from './assetUrl';

type ManifestEntry = string | [number, number];

interface Manifest {
  sprite?: string;
  en: Record<string, ManifestEntry>;
  es?: Record<string, ManifestEntry>;
}

export interface AudioVolumes {
  voice: number;   // 0..10
  music: number;   // 0..10
  effects: number; // 0..10
}

class SoundManager {
  private wordManifest: Manifest = { en: {}, es: {} };
  private uiManifest: Manifest = { en: {}, es: {} };
  private loaded = false;
  private initPromise: Promise<void> | null = null;
  private activeVoice: HTMLAudioElement | null = null;
  private activeSource: AudioBufferSourceNode | null = null;
  private spriteBuffers = new Map<string, Promise<AudioBuffer | null>>();
  private seqToken = 0;
  private audioCtx: AudioContext | null = null;
  private fxMasterGain: GainNode | null = null;
  private fxCompressor: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private musicNodes: { gain: GainNode; oscs: OscillatorNode[] } | null = null;
  private musicMood: 'calm' | 'battle' | null = null;
  private duckLevel = 0; // 0 = normal, 1 = soft, 2 = muted for mic
  private volumes: AudioVolumes = { voice: 8, music: 5, effects: 8 };
  private wardenVoice = 'Leda';
  private cutsceneBlobCache = new Map<string, string>();
  private inFlightTts = new Map<string, Promise<{ url: string | null; quotaExceeded: boolean }>>();
  private ttsQuotaUntil = 0;
  private lastFxAt = new Map<string, number>();

  isTtsInCooldown(): boolean {
    return Date.now() < this.ttsQuotaUntil;
  }

  async init(): Promise<void> {
    if (this.loaded) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      try {
        const [wm, um] = await Promise.all([
          fetch(assetUrl('/assets/audio/words/manifest.json')).then((r) => (r.ok ? r.json() : { en: {}, es: {} })),
          fetch(assetUrl('/assets/audio/ui/manifest.json')).then((r) => (r.ok ? r.json() : { en: {}, es: {} })),
        ]);
        this.wordManifest = wm;
        this.uiManifest = um;
        this.loaded = true;
      } catch {
        // Manifests optional
      } finally {
        this.initPromise = null;
      }
    })();
    return this.initPromise;
  }

  setVolumes(v: AudioVolumes) {
    this.volumes = { ...v };
    this.applyMusicGain();
  }

  setWardenVoice(voiceName: string) {
    if (voiceName) this.wardenVoice = voiceName;
  }

  getWardenVoice(): string {
    return this.wardenVoice;
  }

  duck(level: 0 | 1 | 2) {
    this.duckLevel = level;
    this.applyMusicGain();
    this.applyFxMasterGain();
  }

  private getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (AC) {
        this.audioCtx = new AC();
        this.fxMasterGain = this.audioCtx.createGain();
        this.fxMasterGain.gain.value = this.duckLevel === 2 ? 0 : 1;
        // Soft limiter/compressor keeps simultaneous explosions punchy without speaker clipping
        this.fxCompressor = this.audioCtx.createDynamicsCompressor();
        this.fxCompressor.threshold.value = -10;
        this.fxCompressor.knee.value = 14;
        this.fxCompressor.ratio.value = 6;
        this.fxCompressor.attack.value = 0.004;
        this.fxCompressor.release.value = 0.16;
        this.fxMasterGain.connect(this.fxCompressor);
        this.fxCompressor.connect(this.audioCtx.destination);
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const len = Math.floor(ctx.sampleRate * 1.6);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    // Warm slightly shaped broadband white noise for explosive rumble and crisp snaps
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buf;
    return buf;
  }

  private applyFxMasterGain() {
    if (!this.fxMasterGain || !this.audioCtx) return;
    const target = this.duckLevel === 2 ? 0 : 1;
    const tc = this.duckLevel === 2 ? 0.012 : 0.06;
    try {
      this.fxMasterGain.gain.setTargetAtTime(target, this.audioCtx.currentTime, tc);
    } catch {
      // ignore
    }
  }

  private voiceGain(): number {
    if (this.duckLevel === 2) return 0;
    return Math.max(0, Math.min(1, this.volumes.voice / 10));
  }

  private fxGain(): number {
    if (this.duckLevel === 2) return 0;
    const base = Math.max(0, Math.min(1, this.volumes.effects / 10));
    return this.duckLevel === 1 ? base * 0.35 : base;
  }

  private applyMusicGain() {
    if (!this.musicNodes || !this.audioCtx) return;
    const base = Math.max(0, Math.min(1, this.volumes.music / 10)) * 0.085;
    const mult = this.duckLevel === 2 ? 0 : this.duckLevel === 1 ? 0.3 : 1;
    const target = base * mult;
    const tc = this.duckLevel === 2 ? 0.02 : 0.18;
    try {
      this.musicNodes.gain.gain.setTargetAtTime(target, this.audioCtx.currentTime, tc);
    } catch {
      // ignore
    }
  }

  stopSpeaking() {
    this.seqToken++;
    if (this.activeVoice) {
      try {
        this.activeVoice.pause();
        this.activeVoice.currentTime = 0;
      } catch {
        // ignore
      }
      this.activeVoice = null;
    }
    if (this.activeSource) {
      try {
        this.activeSource.stop();
        this.activeSource.disconnect();
      } catch {
        // ignore
      }
      this.activeSource = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }

  private loadSpriteBuffer(spriteUrl: string): Promise<AudioBuffer | null> {
    const existing = this.spriteBuffers.get(spriteUrl);
    if (existing) return existing;
    const promise = (async () => {
      try {
        const ctx = this.getCtx();
        if (!ctx) return null;
        const res = await fetch(assetUrl(spriteUrl));
        if (!res.ok) return null;
        const arr = await res.arrayBuffer();
        return await ctx.decodeAudioData(arr);
      } catch {
        this.spriteBuffers.delete(spriteUrl);
        return null;
      }
    })();
    this.spriteBuffers.set(spriteUrl, promise);
    return promise;
  }

  private async playManifestEntry(
    manifest: Manifest,
    baseDir: string,
    entry: ManifestEntry
  ): Promise<boolean> {
    if (typeof entry === 'string') {
      return this.playUrl(`${baseDir}/${entry}`);
    }
    const vol = this.voiceGain();
    if (vol <= 0.001) return true;
    const spriteUrl = manifest.sprite;
    if (!spriteUrl) return false;
    const buf = await this.loadSpriteBuffer(spriteUrl);
    const ctx = this.getCtx();
    if (!buf || !ctx) return false;
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }
    const [startSec, durSec] = entry;
    const safeStart = Math.max(0, Math.min(startSec, Math.max(0, buf.duration - 0.02)));
    const safeDur = Math.max(0.02, Math.min(durSec, buf.duration - safeStart));
    return new Promise((resolve) => {
      try {
        const src = ctx.createBufferSource();
        const gain = ctx.createGain();
        src.buffer = buf;
        gain.gain.value = vol;
        src.connect(gain);
        gain.connect(ctx.destination);
        this.activeSource = src;
        let done = false;
        const finish = (ok: boolean) => {
          if (done) return;
          done = true;
          if (this.activeSource === src) this.activeSource = null;
          try {
            src.disconnect();
            gain.disconnect();
          } catch {
            // ignore
          }
          resolve(ok);
        };
        src.onended = () => finish(true);
        src.start(0, safeStart, safeDur);
      } catch {
        resolve(false);
      }
    });
  }

  private playUrl(
    url: string,
    onProgress?: (pct: number, currentSec: number, durationSec: number) => void
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const vol = this.voiceGain();
      if (vol <= 0.001) {
        onProgress?.(100, 0, 0);
        resolve(true);
        return;
      }
      const el = new Audio(assetUrl(url));
      el.volume = vol;
      this.activeVoice = el;
      let finished = false;
      const done = (ok: boolean) => {
        if (finished) return;
        finished = true;
        if (this.activeVoice === el) this.activeVoice = null;
        if (ok) onProgress?.(100, el.duration || 0, el.duration || 0);
        resolve(ok);
      };
      el.ontimeupdate = () => {
        if (el.duration && Number.isFinite(el.duration) && el.duration > 0) {
          const pct = Math.min(100, (el.currentTime / el.duration) * 100);
          onProgress?.(pct, el.currentTime, el.duration);
        }
      };
      el.onended = () => done(true);
      el.onerror = () => done(false);
      el.play().catch(() => done(false));
    });
  }

  speakFallback(text: string, lang = 'en-US'): Promise<void> {
    return new Promise((resolve) => {
      const vol = this.voiceGain();
      if (vol <= 0.001 || typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve();
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        u.rate = 0.94;
        u.volume = vol;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        window.speechSynthesis.speak(u);
      } catch {
        resolve();
      }
    });
  }

  private wordFallbackText(word: string): string {
    const key = word.toLowerCase();
    const runeSpellings: Record<string, string> = {
      shab: 'shabb',
      shep: 'shepp',
      shib: 'shibb',
      shom: 'shahm',
      shup: 'shupp',
      chab: 'chabb',
      chep: 'chepp',
      chib: 'chibb',
      chot: 'chaht',
      chup: 'chupp',
      thab: 'thabb',
      thip: 'thipp',
      thog: 'thahg',
      whep: 'whepp',
      whib: 'whibb',
      whum: 'whumm',
      teck: 'teck',
      bick: 'bick',
      zock: 'zahck',
      teg: 'tegg',
      zod: 'zahd',
      zot: 'zaht',
      blap: 'blapp',
      bleg: 'blegg',
      blug: 'blugg',
      bap: 'bapp',
      clep: 'clepp',
      clug: 'clugg',
      clob: 'clahb',
      frab: 'frabb',
      frep: 'frepp',
      frib: 'fribb',
      frop: 'frahp',
      fab: 'fabb',
      grem: 'gremm',
      grob: 'grahb',
      spab: 'spabb',
      spog: 'spahg',
      steb: 'stebb',
      stug: 'stugg',
      fand: 'fannd',
      rond: 'rahnd',
      bamp: 'bammpp',
      zump: 'zummpp',
      shog: 'shahg',
      chog: 'chahg',
      pab: 'pabb',
      sab: 'sabb',
      pog: 'pahg',
      sog: 'sahg',
      teb: 'tebb',
      seb: 'sebb',
      sug: 'sugg',
      zup: 'zupp',
      zum: 'zumm',
      dis: 'diss',
      bape: 'bayp',
      dake: 'dayk',
      zate: 'zayt',
      mave: 'mayv',
      bipe: 'bype',
      zime: 'zyme',
      tibe: 'tybe',
      kide: 'kyde',
      dike: 'dyke',
      zite: 'zyte',
      mive: 'myve',
      zame: 'zaym',
      tabe: 'tayb',
      kade: 'kayd',
      dak: 'dakk',
      zat: 'zatt',
      mav: 'mavv',
      bip: 'bipp',
      zim: 'zimm',
      tib: 'tibb',
    };
    return runeSpellings[key] || word;
  }

  private async playNeuralOrFallback(
    cacheId: string,
    text: string,
    style: string,
    token?: number,
    lang = 'en-US'
  ): Promise<void> {
    if (lang === 'en-US') {
      const { url } = await this.fetchNeuralVoiceUrl(cacheId, text, style);
      if (token !== undefined && token !== this.seqToken) return;
      if (url) {
        const ok = await this.playUrl(url);
        if (ok) return;
      }
    }
    if (token !== undefined && token !== this.seqToken) return;
    await this.speakFallback(text, lang);
  }

  preloadPhonicsClip(kind: 'rule' | 'snd' | 'word', keyOrId: string, text: string): void {
    if (this.isTtsInCooldown()) return;
    const cleanKey = keyOrId.toLowerCase();
    if (kind === 'word' && this.wordManifest.en[cleanKey]) return;
    if (kind === 'snd' && this.wordManifest.en[`snd:${cleanKey}`]) return;
    if (kind === 'rule' && this.uiManifest.en[keyOrId]) return;

    if (kind === 'rule') {
      const cacheId = `rule-${cleanKey.replace(/[^a-z0-9_-]/g, '-')}`;
      void this.fetchNeuralVoiceUrl(
        cacheId,
        text,
        'Warm, clear, plain-spoken reading coach teaching a teenager a phonics rule. Calm, steady, natural pacing.'
      );
    } else if (kind === 'snd') {
      const spoken = this.phonemeFallbackText(cleanKey);
      const cacheId = `snd-${cleanKey.replace(/[^a-z0-9_-]/g, '-')}`;
      void this.fetchNeuralVoiceUrl(
        cacheId,
        spoken,
        'Phonics teacher pronouncing only one isolated English speech sound clearly and crisply, with no extra words.'
      );
    } else {
      const spoken = this.wordFallbackText(cleanKey);
      const cacheId = `word-${cleanKey.replace(/[^a-z0-9_-]/g, '-')}`;
      void this.fetchNeuralVoiceUrl(
        cacheId,
        spoken,
        'Clear, natural American English reading teacher pronouncing one single word cleanly with a crisp short vowel and clear consonants.'
      );
    }
  }

  async speakWord(word: string, lang: 'en' | 'es' = 'en'): Promise<void> {
    await this.init();
    this.stopSpeaking();
    const myToken = this.seqToken;
    const map = lang === 'es' ? this.wordManifest.es || {} : this.wordManifest.en || {};
    const key = lang === 'en' ? word.toLowerCase() : word;
    const rel = map[key] || map[word];
    if (rel) {
      await this.playManifestEntry(this.wordManifest, '/assets/audio/words', rel);
    } else if (lang === 'en') {
      const spoken = this.wordFallbackText(word);
      const cacheId = `word-${key.replace(/[^a-z0-9_-]/g, '-')}`;
      await this.playNeuralOrFallback(
        cacheId,
        spoken,
        'Clear, natural American English reading teacher pronouncing one single word cleanly with a crisp short vowel and clear consonants.',
        myToken
      );
    } else {
      await this.speakFallback(word, 'es-MX');
    }
  }

  private splitBlendTiles(word: string, tiles?: string[]): string[] {
    if (tiles && tiles.length > 0) return tiles;
    const lower = word.toLowerCase();
    const out: string[] = [];
    const digraphs = ['sh', 'ch', 'th', 'wh', 'ck', 'ng', 'nk', 'ph', 'qu'];
    let i = 0;
    while (i < lower.length) {
      const pair = lower.slice(i, i + 2);
      if (digraphs.includes(pair)) {
        out.push(pair);
        i += 2;
      } else {
        out.push(lower[i]);
        i += 1;
      }
    }
    return out;
  }

  async speakWordSlow(
    word: string,
    tiles?: string[],
    onTileIdx?: (idx: number | null) => void
  ): Promise<void> {
    await this.init();
    this.stopSpeaking();
    const myToken = this.seqToken;
    const parts = this.splitBlendTiles(word, tiles);
    const isSilentEVce =
      parts.length >= 4 &&
      parts[parts.length - 1].toLowerCase() === 'e' &&
      /^[aiou]$/.test(parts[parts.length - 3].toLowerCase()) &&
      !/^[aeiou]$/.test(parts[parts.length - 2].toLowerCase());
    const vceVowelIdx = isSilentEVce ? parts.length - 3 : -1;

    try {
      for (let i = 0; i < parts.length; i++) {
        if (myToken !== this.seqToken) return;
        if (isSilentEVce && i === parts.length - 1) continue;
        onTileIdx?.(i);
        const rawKey = parts[i].toLowerCase();
        const key =
          isSilentEVce && i === vceVowelIdx
            ? `${rawKey}_e`
            : rawKey === 'll'
            ? 'l'
            : rawKey === 'ss'
            ? 's'
            : rawKey === 'ff'
            ? 'f'
            : rawKey === 'zz'
            ? 'z'
            : rawKey;
        const rel = this.wordManifest.en[`snd:${key}`];
        if (rel) {
          await this.playManifestEntry(this.wordManifest, '/assets/audio/words', rel);
        } else {
          const spoken = this.phonemeFallbackText(key);
          const cacheId = `snd-${key.replace(/[^a-z0-9_-]/g, '-')}`;
          await this.playNeuralOrFallback(
            cacheId,
            spoken,
            'Phonics teacher pronouncing only one isolated English speech sound clearly and crisply, with no extra words.',
            myToken
          );
        }
        if (myToken !== this.seqToken) return;
        const lastSpokenIdx = isSilentEVce ? parts.length - 2 : parts.length - 1;
        if (i < lastSpokenIdx) {
          await new Promise((r) => setTimeout(r, 175));
        }
      }

      if (myToken !== this.seqToken) return;
      onTileIdx?.(null);
      await new Promise((r) => setTimeout(r, 240));
      if (myToken !== this.seqToken) return;

      const wordKey = word.toLowerCase();
      const wordRel = this.wordManifest.en[wordKey] || this.wordManifest.en[word];
      if (wordRel) {
        await this.playManifestEntry(this.wordManifest, '/assets/audio/words', wordRel);
      } else {
        const spoken = this.wordFallbackText(word);
        const cacheId = `word-${wordKey.replace(/[^a-z0-9_-]/g, '-')}`;
        await this.playNeuralOrFallback(
          cacheId,
          spoken,
          'Clear, natural American English reading teacher pronouncing one single word cleanly with a crisp short vowel and clear consonants.',
          myToken
        );
      }
    } finally {
      if (myToken === this.seqToken) {
        onTileIdx?.(null);
      }
    }
  }

  private phonemeFallbackText(key: string): string {
    const fallbackMap: Record<string, string> = {
      sh: 'shhh',
      ch: 'ch',
      th: 'thh',
      wh: 'wuh',
      ck: 'kuh',
      ng: 'ng',
      nk: 'nk',
      ph: 'fff',
      qu: 'kwuh',
      ll: 'lll',
      ss: 'sss',
      ff: 'fff',
      zz: 'zzz',
      bl: 'bl',
      cl: 'cl',
      fr: 'fr',
      gr: 'gr',
      sp: 'sp',
      st: 'st',
      nd: 'nd',
      mp: 'mp',
      a_e: 'ay',
      i_e: 'eye',
      o_e: 'oh',
      u_e: 'oo',
    };
    return fallbackMap[key] || key;
  }

  async speakPhoneme(letter: string): Promise<void> {
    await this.init();
    this.stopSpeaking();
    const myToken = this.seqToken;
    const rawKey = letter.toLowerCase();
    const key =
      rawKey === 'll' ? 'l' : rawKey === 'ss' ? 's' : rawKey === 'ff' ? 'f' : rawKey === 'zz' ? 'z' : rawKey;
    const rel = this.wordManifest.en[`snd:${key}`];
    if (rel) {
      await this.playManifestEntry(this.wordManifest, '/assets/audio/words', rel);
    } else {
      const spoken = this.phonemeFallbackText(key);
      const cacheId = `snd-${key.replace(/[^a-z0-9_-]/g, '-')}`;
      await this.playNeuralOrFallback(
        cacheId,
        spoken,
        'Phonics teacher pronouncing only one isolated English speech sound clearly and crisply, with no extra words.',
        myToken
      );
    }
  }

  async speakUI(id: string, fallbackText?: string, lang: 'en' | 'es' = 'en'): Promise<void> {
    await this.init();
    this.stopSpeaking();
    const map = lang === 'es' ? this.uiManifest.es || {} : this.uiManifest.en || {};

    // Dynamic wave announcements use pre-recorded studio clips ("Wave" + number, "Final wave", "Wave cleared")
    const waveStartMatch = id.match(/^battle\.waveStart\.(\d+)$/);
    if (waveStartMatch) {
      const n = waveStartMatch[1];
      if (map['hud.wave'] && map[`num.${n}`]) {
        await this.speakSequence([{ id: 'hud.wave' }, { id: `num.${n}` }]);
        return;
      }
      if (fallbackText) {
        await this.speakFallback(fallbackText, lang === 'es' ? 'es-MX' : 'en-US');
      }
      return;
    }

    if (id === 'battle.finalWave') {
      if (map['hud.finalWave']) {
        await this.playManifestEntry(this.uiManifest, '/assets/audio/ui', map['hud.finalWave']);
        return;
      }
    }

    if (id.startsWith('battle.waveClear')) {
      if (map['hud.waveCleared']) {
        await this.playManifestEntry(this.uiManifest, '/assets/audio/ui', map['hud.waveCleared']);
        return;
      }
    }

    const rel = map[id];
    if (rel) {
      await this.playManifestEntry(this.uiManifest, '/assets/audio/ui', rel);
    } else if (fallbackText) {
      if (lang === 'en' && id.startsWith('rule.')) {
        const myToken = this.seqToken;
        const cacheId = `rule-${id.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`;
        await this.playNeuralOrFallback(
          cacheId,
          fallbackText,
          'Warm, clear, plain-spoken reading coach teaching a teenager a phonics rule. Calm, steady, natural pacing.',
          myToken
        );
        return;
      }
      // Use static cached clip if one was pre-generated, otherwise browser speech so HUD toasts never consume Gemini TTS quota
      const staticUrl = await this.checkStaticTtsCache(`ui-${id}`, this.wardenVoice);
      if (staticUrl) {
        await this.playUrl(staticUrl);
      } else {
        await this.speakFallback(fallbackText, lang === 'es' ? 'es-MX' : 'en-US');
      }
    }
  }

  async speakSequence(
    steps: Array<{
      id?: string;
      word?: string;
      snd?: string;
      text?: string;
      pause?: number;
      on?: () => void;
    }>
  ): Promise<void> {
    await this.init();
    this.stopSpeaking();
    const myToken = this.seqToken;

    for (const step of steps) {
      if (myToken !== this.seqToken) return;
      if (step.on) step.on();
      if (step.pause) {
        await new Promise((r) => setTimeout(r, step.pause));
        continue;
      }
      if (step.snd) {
        const rawKey = step.snd.toLowerCase();
        const key =
          rawKey === 'll' ? 'l' : rawKey === 'ss' ? 's' : rawKey === 'ff' ? 'f' : rawKey === 'zz' ? 'z' : rawKey;
        const rel = this.wordManifest.en[`snd:${key}`];
        if (rel) {
          await this.playManifestEntry(this.wordManifest, '/assets/audio/words', rel);
        } else {
          const spoken = this.phonemeFallbackText(key);
          const cacheId = `snd-${key.replace(/[^a-z0-9_-]/g, '-')}`;
          await this.playNeuralOrFallback(
            cacheId,
            spoken,
            'Phonics teacher pronouncing only one isolated English speech sound clearly and crisply, with no extra words.',
            myToken
          );
        }
      } else if (step.word) {
        const key = step.word.toLowerCase();
        const rel = this.wordManifest.en[key];
        if (rel) {
          await this.playManifestEntry(this.wordManifest, '/assets/audio/words', rel);
        } else {
          const spoken = this.wordFallbackText(step.word);
          const cacheId = `word-${key.replace(/[^a-z0-9_-]/g, '-')}`;
          await this.playNeuralOrFallback(
            cacheId,
            spoken,
            'Clear, natural American English reading teacher pronouncing one single word cleanly with a crisp short vowel and clear consonants.',
            myToken
          );
        }
      } else if (step.id) {
        const rel = this.uiManifest.en[step.id];
        if (rel) {
          await this.playManifestEntry(this.uiManifest, '/assets/audio/ui', rel);
        } else if (step.text) {
          const cacheId = `rule-${step.id.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`;
          await this.playNeuralOrFallback(
            cacheId,
            step.text,
            'Warm, clear, plain-spoken reading coach teaching a teenager a phonics rule. Calm, steady, natural pacing.',
            myToken
          );
        }
      } else if (step.text) {
        await this.speakFallback(step.text);
      }
    }
  }

  private async checkStaticTtsCache(id: string, voiceName: string): Promise<string | null> {
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
    const base = assetUrl(`/assets/audio/tts-cache/${encodeURIComponent(voiceName)}_${encodeURIComponent(safeId)}`);
    for (const ext of ['mp3', 'wav']) {
      const staticPath = `${base}.${ext}`;
      try {
        const head = await fetch(staticPath, { method: 'HEAD' });
        if (head.ok && head.headers.get('content-type')?.includes('audio')) {
          return staticPath;
        }
      } catch {
        // try next extension
      }
    }
    return null;
  }

  private async fetchNeuralVoiceUrl(
    id: string,
    text: string,
    style?: string,
    voiceName?: string
  ): Promise<{ url: string | null; quotaExceeded: boolean }> {
    const voice = voiceName || this.wardenVoice || 'Leda';
    const key = `${voice}:${id}`;
    const existing = this.cutsceneBlobCache.get(key);
    if (existing) return { url: existing, quotaExceeded: false };

    const pending = this.inFlightTts.get(key);
    if (pending) return pending;

    const req = (async (): Promise<{ url: string | null; quotaExceeded: boolean }> => {
      // 1. Check pre-cached MP3/WAV on disk first (zero API call, works even during quota cooldown)
      const staticUrl =
        (await this.checkStaticTtsCache(id, voice)) ||
        (voice !== 'Leda' ? await this.checkStaticTtsCache(id, 'Leda') : null);
      if (staticUrl) {
        this.cutsceneBlobCache.set(key, staticUrl);
        return { url: staticUrl, quotaExceeded: false };
      }

      // 2. On static hosting (GitHub Pages), skip server-only /api/tts route cleanly
      if (isStaticHosting()) {
        return { url: null, quotaExceeded: false };
      }

      // 3. Respect active quota cooldown so we never spam the endpoint
      if (Date.now() < this.ttsQuotaUntil) {
        return { url: null, quotaExceeded: true };
      }

      try {
        const res = await fetch('/api/tts/cutscene', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, text, style, voiceName: voice }),
        });
        if (res.ok && res.headers.get('content-type')?.includes('audio')) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          this.cutsceneBlobCache.set(key, url);
          return { url, quotaExceeded: false };
        }
        if (res.status === 429) {
          const retryHeader = Number(res.headers.get('Retry-After') || 0);
          let retrySec = Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader : 60;
          try {
            const payload = await res.json();
            if (payload?.retryAfterSec && Number(payload.retryAfterSec) > 0) {
              retrySec = Number(payload.retryAfterSec);
            }
          } catch {
            // ignore JSON parse error
          }
          this.ttsQuotaUntil = Date.now() + retrySec * 1000;
          return { url: null, quotaExceeded: true };
        }
      } catch {
        // Network error
      }
      return { url: null, quotaExceeded: false };
    })();

    this.inFlightTts.set(key, req);
    try {
      return await req;
    } finally {
      this.inFlightTts.delete(key);
    }
  }

  preloadCutsceneLine(id: string, text: string, style?: string, voiceName?: string): void {
    if (this.isTtsInCooldown()) return;
    void this.fetchNeuralVoiceUrl(id, text, style, voiceName);
  }

  async speakCutsceneLine(
    id: string,
    text: string,
    style?: string,
    options?: {
      voiceName?: string;
      onStart?: () => void;
      onProgress?: (pct: number, currentSec: number, durationSec: number) => void;
    }
  ): Promise<{ ok: boolean; cancelled: boolean; quotaExceeded?: boolean }> {
    this.stopSpeaking();
    const myToken = this.seqToken;
    const vol = this.voiceGain();
    if (vol <= 0.001) {
      return { ok: true, cancelled: false };
    }

    const { url, quotaExceeded } = await this.fetchNeuralVoiceUrl(id, text, style, options?.voiceName);
    if (myToken !== this.seqToken) {
      return { ok: false, cancelled: true };
    }
    if (!url) {
      return { ok: false, cancelled: false, quotaExceeded };
    }

    options?.onStart?.();
    const played = await this.playUrl(url, options?.onProgress);
    if (myToken !== this.seqToken) {
      return { ok: false, cancelled: true };
    }
    return { ok: played, cancelled: false };
  }

  async speakNarration(id: string, text: string): Promise<boolean> {
    // Check static pre-generated clip first; avoid spending Gemini TTS quota on ephemeral HUD readouts
    const staticUrl = await this.checkStaticTtsCache(id, this.wardenVoice);
    if (staticUrl) {
      this.stopSpeaking();
      const played = await this.playUrl(staticUrl);
      if (played) return true;
    }
    await this.speakFallback(text);
    return true;
  }

  async auditionVoice(voiceName: string, sampleText: string): Promise<boolean> {
    const res = await this.speakCutsceneLine(
      `sample-v2`,
      sampleText,
      'Calm, steady, plain-spoken veteran guardian talking to a teenage recruit. Clear natural pacing.',
      { voiceName }
    );
    return res.ok;
  }

  // -------------------------------------------------------------------------
  // Procedural Layered Web Audio Weapon & Explosion SFX
  // -------------------------------------------------------------------------
  sfx(
    name:
      | 'tap'
      | 'select'
      | 'hit'
      | 'soft'
      | 'mega'
      | 'arrow'
      | 'arrowHit'
      | 'golemSlam'
      | 'frost'
      | 'spike'
      | 'cannonFire'
      | 'cannon'
      | 'explosion'
      | 'meteorLaunch'
      | 'meteorImpact'
      | 'zap'
      | 'rail'
      | 'gravity'
      | 'enemyDie'
      | 'bossDie'
      | 'waveStart'
      | 'waveClear'
      | 'anchorHit'
      | 'build'
      | 'upgrade'
      | 'sell'
      | 'power'
      | 'win'
      | 'lose',
    throttleMs = 0
  ) {
    const g = this.fxGain();
    if (g <= 0.001) return;
    if (throttleMs > 0) {
      const now = performance.now();
      const prev = this.lastFxAt.get(name) || 0;
      if (now - prev < throttleMs) return;
      this.lastFxAt.set(name, now);
    }
    const ctx = this.getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const dest = this.fxMasterGain || ctx.destination;
    const jitter = (pct = 0.06) => 1 + (Math.random() * 2 - 1) * pct;

    const tone = (
      freqStart: number,
      freqEnd: number,
      dur: number,
      type: OscillatorType,
      vol: number,
      delay = 0,
      attack = 0.01
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(20, freqStart), t + delay);
      if (freqEnd !== freqStart) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + delay + dur);
      }
      gain.gain.setValueAtTime(0.0001, t + delay);
      gain.gain.linearRampToValueAtTime(vol * g, t + delay + Math.min(attack, dur * 0.4));
      gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t + delay);
      osc.stop(t + delay + dur + 0.03);
    };

    const noise = (opts: {
      dur: number;
      vol: number;
      filterType?: BiquadFilterType;
      freqStart: number;
      freqEnd?: number;
      q?: number;
      delay?: number;
      attack?: number;
    }) => {
      const delay = opts.delay || 0;
      const attack = opts.attack ?? 0.008;
      const src = ctx.createBufferSource();
      src.buffer = this.getNoiseBuffer(ctx);
      // Random offset inside noise buffer so repeated explosions never phase-clone
      const maxOffset = Math.max(0.01, src.buffer.duration - opts.dur - 0.05);
      const offset = Math.random() * maxOffset;

      const filter = ctx.createBiquadFilter();
      filter.type = opts.filterType || 'lowpass';
      filter.Q.value = opts.q ?? 1.2;
      filter.frequency.setValueAtTime(Math.max(30, opts.freqStart), t + delay);
      if (opts.freqEnd && opts.freqEnd !== opts.freqStart) {
        filter.frequency.exponentialRampToValueAtTime(Math.max(30, opts.freqEnd), t + delay + opts.dur);
      }

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t + delay);
      gain.gain.linearRampToValueAtTime(opts.vol * g, t + delay + Math.min(attack, opts.dur * 0.35));
      gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + opts.dur);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      src.start(t + delay, offset, opts.dur + 0.03);
      src.stop(t + delay + opts.dur + 0.04);
    };

    switch (name) {
      case 'tap':
        tone(520, 420, 0.055, 'triangle', 0.14);
        break;
      case 'select':
        tone(540, 740, 0.09, 'triangle', 0.18);
        break;
      case 'hit':
        tone(523.25, 659.25, 0.11, 'triangle', 0.22);
        tone(783.99, 1046.5, 0.16, 'sine', 0.18, 0.06);
        break;
      case 'soft':
        tone(240, 175, 0.18, 'sine', 0.16);
        break;
      case 'mega':
        // Huge arcane shockwave + triumphant chord burst
        tone(135, 34, 0.55, 'sine', 0.42, 0, 0.008);
        noise({ dur: 0.52, vol: 0.28, filterType: 'bandpass', freqStart: 1400, freqEnd: 260, q: 1.0 });
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          tone(f, f * 1.04, 0.38, 'triangle', 0.22, i * 0.05);
        });
        break;
      case 'arrow': {
        // Crisp bowstring snap + feathered air whoosh
        const j = jitter(0.08);
        tone(520 * j, 175 * j, 0.075, 'triangle', 0.13, 0, 0.004);
        tone(1120 * j, 480 * j, 0.045, 'sine', 0.07, 0.004, 0.003);
        noise({ dur: 0.08, vol: 0.11, filterType: 'bandpass', freqStart: 2800 * j, freqEnd: 1100 * j, q: 2.2, attack: 0.004 });
        break;
      }
      case 'arrowHit': {
        // Tactile thwack + crisp crystal spark tick
        const j = jitter(0.1);
        tone(280 * j, 115 * j, 0.065, 'triangle', 0.14, 0, 0.004);
        noise({ dur: 0.045, vol: 0.12, filterType: 'bandpass', freqStart: 1900 * j, freqEnd: 850, q: 1.8, attack: 0.003 });
        break;
      }
      case 'cannonFire': {
        // Deep heavy mortar THOOMP launch from barrel
        const j = jitter(0.07);
        tone(165 * j, 42 * j, 0.24, 'sine', 0.34, 0, 0.006);
        tone(240 * j, 68 * j, 0.16, 'triangle', 0.2, 0, 0.005);
        noise({ dur: 0.22, vol: 0.28, filterType: 'lowpass', freqStart: 900 * j, freqEnd: 180, q: 1.4, attack: 0.005 });
        break;
      }
      case 'cannon':
      case 'explosion': {
        // Full multi-layered fiery KABOOM detonation (sub-bass punch + roaring blast + fiery crackle)
        const j = jitter(0.07);
        tone(118 * j, 26, 0.44, 'sine', 0.46, 0, 0.005);
        tone(82 * j, 30, 0.36, 'sawtooth', 0.18, 0.01, 0.008);
        noise({ dur: 0.48, vol: 0.38, filterType: 'lowpass', freqStart: 1150 * j, freqEnd: 130, q: 1.1, attack: 0.006 });
        noise({ dur: 0.28, vol: 0.24, filterType: 'bandpass', freqStart: 1950 * j, freqEnd: 420, q: 1.3, delay: 0.015, attack: 0.005 });
        noise({ dur: 0.32, vol: 0.11, filterType: 'highpass', freqStart: 2600, freqEnd: 1200, q: 0.8, delay: 0.04, attack: 0.01 });
        break;
      }
      case 'meteorLaunch': {
        // Screaming blazing sky-fall whistle before impact
        tone(740, 190, 0.42, 'sawtooth', 0.12, 0, 0.02);
        noise({ dur: 0.42, vol: 0.22, filterType: 'bandpass', freqStart: 2100, freqEnd: 340, q: 2.2, attack: 0.03 });
        break;
      }
      case 'meteorImpact': {
        // Cataclysmic earth-shattering MEGA BOOM
        tone(105, 22, 0.72, 'sine', 0.56, 0, 0.005);
        tone(68, 24, 0.62, 'sawtooth', 0.24, 0.015, 0.008);
        tone(190, 42, 0.35, 'triangle', 0.28, 0, 0.004);
        noise({ dur: 0.78, vol: 0.48, filterType: 'lowpass', freqStart: 1600, freqEnd: 95, q: 1.0, attack: 0.005 });
        noise({ dur: 0.46, vol: 0.32, filterType: 'bandpass', freqStart: 2400, freqEnd: 320, q: 1.2, delay: 0.02, attack: 0.006 });
        noise({ dur: 0.54, vol: 0.16, filterType: 'highpass', freqStart: 2800, freqEnd: 900, q: 0.7, delay: 0.06, attack: 0.015 });
        break;
      }
      case 'zap': {
        // High-voltage Tesla CRACK-SNAP + ozone spark buzz
        const j = jitter(0.08);
        tone(1680 * j, 360 * j, 0.095, 'sawtooth', 0.17, 0, 0.003);
        tone(1140 * j, 220 * j, 0.125, 'square', 0.11, 0.018, 0.004);
        tone(220 * j, 72, 0.09, 'triangle', 0.16, 0, 0.004);
        noise({ dur: 0.11, vol: 0.22, filterType: 'highpass', freqStart: 2600 * j, freqEnd: 1100, q: 1.5, attack: 0.002 });
        noise({ dur: 0.14, vol: 0.16, filterType: 'bandpass', freqStart: 1900 * j, freqEnd: 650, q: 2.4, delay: 0.015, attack: 0.004 });
        break;
      }
      case 'rail': {
        // Iconic electromagnetic RAILGUN hypervelocity CRACK + sub-bass sonic boom
        const j = jitter(0.05);
        tone(820 * j, 2750 * j, 0.042, 'sine', 0.14, 0, 0.004);
        tone(290 * j, 40, 0.34, 'sine', 0.42, 0.02, 0.004);
        tone(1820 * j, 210 * j, 0.22, 'sawtooth', 0.21, 0.02, 0.003);
        tone(1280 * j, 540 * j, 0.18, 'triangle', 0.15, 0.035, 0.005);
        noise({ dur: 0.14, vol: 0.32, filterType: 'highpass', freqStart: 2200 * j, freqEnd: 700, q: 1.2, delay: 0.018, attack: 0.002 });
        noise({ dur: 0.3, vol: 0.26, filterType: 'lowpass', freqStart: 1400, freqEnd: 190, q: 1.0, delay: 0.022, attack: 0.004 });
        break;
      }
      case 'golemSlam': {
        // Heavy seismic boulder GROUND CRUSH + stone debris crunch
        const j = jitter(0.07);
        tone(124 * j, 30, 0.32, 'sine', 0.42, 0, 0.005);
        tone(155 * j, 46, 0.24, 'sawtooth', 0.16, 0, 0.005);
        noise({ dur: 0.28, vol: 0.32, filterType: 'lowpass', freqStart: 780 * j, freqEnd: 140, q: 1.3, attack: 0.004 });
        noise({ dur: 0.15, vol: 0.18, filterType: 'bandpass', freqStart: 1200 * j, freqEnd: 420, q: 1.6, delay: 0.015, attack: 0.004 });
        break;
      }
      case 'frost': {
        // Crystalline ice shatter + shimmering glacial chime
        const j = jitter(0.06);
        tone(1480 * j, 2240 * j, 0.22, 'sine', 0.14, 0, 0.006);
        tone(2217 * j, 2960 * j, 0.26, 'triangle', 0.1, 0.025, 0.006);
        noise({ dur: 0.22, vol: 0.2, filterType: 'highpass', freqStart: 3200 * j, freqEnd: 1600, q: 1.6, attack: 0.005 });
        noise({ dur: 0.26, vol: 0.12, filterType: 'bandpass', freqStart: 1200, freqEnd: 480, q: 1.1, attack: 0.01 });
        break;
      }
      case 'spike': {
        // Sharp metallic blade slice + steel clang
        const j = jitter(0.09);
        tone(820 * j, 340 * j, 0.085, 'sawtooth', 0.11, 0, 0.003);
        tone(1340 * j, 620 * j, 0.07, 'triangle', 0.08, 0.01, 0.003);
        noise({ dur: 0.075, vol: 0.15, filterType: 'highpass', freqStart: 3000 * j, freqEnd: 1400, q: 2.0, attack: 0.002 });
        break;
      }
      case 'gravity': {
        // Deep sci-fi graviton vortex implosion WUB + cosmic shimmer
        const j = jitter(0.05);
        tone(195 * j, 48 * j, 0.34, 'sine', 0.36, 0, 0.015);
        tone(120 * j, 260 * j, 0.22, 'triangle', 0.18, 0.08, 0.02);
        noise({ dur: 0.32, vol: 0.24, filterType: 'bandpass', freqStart: 1350, freqEnd: 210, q: 2.8, attack: 0.02 });
        tone(660 * j, 440 * j, 0.24, 'sine', 0.11, 0.04, 0.015);
        break;
      }
      case 'enemyDie': {
        // Crisp shattering pop when an enemy dissolves
        const j = jitter(0.12);
        tone(340 * j, 120 * j, 0.12, 'triangle', 0.16, 0, 0.004);
        tone(680 * j, 980 * j, 0.09, 'sine', 0.1, 0.02, 0.005);
        noise({ dur: 0.11, vol: 0.14, filterType: 'bandpass', freqStart: 1650 * j, freqEnd: 480, q: 1.5, attack: 0.004 });
        break;
      }
      case 'bossDie': {
        // Massive boss chain-detonation with golden resonance
        tone(110, 22, 0.85, 'sine', 0.56, 0, 0.005);
        tone(165, 34, 0.55, 'sawtooth', 0.22, 0.04, 0.008);
        noise({ dur: 0.88, vol: 0.46, filterType: 'lowpass', freqStart: 1500, freqEnd: 100, q: 1.0, attack: 0.006 });
        noise({ dur: 0.42, vol: 0.3, filterType: 'bandpass', freqStart: 2200, freqEnd: 380, q: 1.3, delay: 0.12, attack: 0.005 });
        [392, 523.25, 659.25, 783.99].forEach((f, i) => {
          tone(f, f * 1.03, 0.45, 'triangle', 0.18, 0.08 + i * 0.07);
        });
        break;
      }
      case 'build':
        tone(220, 330, 0.12, 'triangle', 0.22);
        tone(440, 587, 0.15, 'triangle', 0.18, 0.06);
        noise({ dur: 0.08, vol: 0.12, filterType: 'lowpass', freqStart: 700, freqEnd: 240, q: 1.2 });
        break;
      case 'upgrade':
        [392, 523.25, 659.25, 783.99].forEach((f, i) => tone(f, f * 1.02, 0.16, 'triangle', 0.19, i * 0.05));
        break;
      case 'sell':
        tone(440, 290, 0.14, 'triangle', 0.16);
        break;
      case 'waveStart':
        tone(146.83, 142, 0.52, 'sawtooth', 0.16);
        tone(220, 218, 0.6, 'triangle', 0.18, 0.12);
        tone(73.42, 68, 0.65, 'sine', 0.26, 0.04);
        break;
      case 'waveClear':
        [440, 554.37, 659.25, 880].forEach((f, i) => tone(f, f, 0.24, 'triangle', 0.18, i * 0.08));
        break;
      case 'anchorHit':
        tone(145, 42, 0.38, 'sawtooth', 0.28, 0, 0.005);
        tone(96, 30, 0.42, 'sine', 0.36, 0, 0.005);
        noise({ dur: 0.32, vol: 0.28, filterType: 'lowpass', freqStart: 950, freqEnd: 160, q: 1.2, attack: 0.004 });
        break;
      case 'power':
        tone(293.66, 587.33, 0.32, 'sawtooth', 0.18);
        tone(587.33, 880, 0.38, 'triangle', 0.2, 0.08);
        noise({ dur: 0.28, vol: 0.14, filterType: 'bandpass', freqStart: 1600, freqEnd: 600, q: 1.5, delay: 0.05 });
        break;
      case 'win':
        [392, 493.88, 587.33, 783.99, 987.77].forEach((f, i) =>
          tone(f, f, 0.36, 'triangle', 0.22, i * 0.09)
        );
        break;
      case 'lose':
        [293.66, 261.63, 220, 174.61].forEach((f, i) =>
          tone(f, f * 0.96, 0.32, 'sine', 0.18, i * 0.12)
        );
        break;
    }
  }

  setMusic(mood: 'calm' | 'battle' | null) {
    if (mood === this.musicMood) return;
    this.musicMood = mood;
    if (this.musicNodes) {
      try {
        this.musicNodes.oscs.forEach((o) => o.stop());
        this.musicNodes.gain.disconnect();
      } catch {
        // ignore
      }
      this.musicNodes = null;
    }
    if (!mood) return;
    const ctx = this.getCtx();
    if (!ctx) return;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = mood === 'battle' ? 420 : 280;

    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    filter.connect(gain);
    gain.connect(ctx.destination);

    // Subtle twilight forest drone (D minor atmospheric pad)
    const freqs = mood === 'battle' ? [73.42, 110.0, 146.83, 174.61] : [73.42, 110.0, 164.81];
    const oscs = freqs.map((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.value = f;
      osc.detune.value = (i - 1) * 4;
      osc.connect(filter);
      osc.start();
      return osc;
    });

    this.musicNodes = { gain, oscs };
    this.applyMusicGain();
  }
}

export const sound = new SoundManager();
