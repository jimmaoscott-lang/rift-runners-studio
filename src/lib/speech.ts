import { SPEECH_SCORE_CONFIG, WordEntry } from '../data/level1';
import { isStaticHosting } from './assetUrl';

const DIRECT_SPEECH_WORKER_URL = 'https://rift-runners-speech.jimmaoscott.workers.dev';

export type SpeechEngineMode = 'azure' | 'chrome' | 'off';

export interface ObservedPhoneme {
  targetIpa?: string;
  targetScore?: number;
  heardIpa?: string;
  wordScore?: number;
}

export interface SpeechDiagnostic {
  kind: 'pass' | 'quiet' | 'vowel_swap' | 'digraph_swap' | 'borderline' | 'consonant' | 'unclear';
  expected?: string;
  heard?: string;
  score?: number;
  usedGrace?: boolean;
  usedProfile?: boolean;
  observed?: ObservedPhoneme;
}

export interface ListenResult {
  outcome: 'match' | 'miss' | 'nothing' | 'down' | 'again' | 'switch';
  engine: SpeechEngineMode;
  heard: string;
  note: string;
  reason?: string;
  diagnostic?: SpeechDiagnostic;
}

export interface ListenOptions {
  onLevel?: (level01: number) => void;
  onReady?: () => void;
}

export interface PatternVoiceProfile {
  pattern: string;
  mode: 'calibrated' | 'grace' | 'accommodation';
  targetFloor: number;
  allowedHeard?: string[];
  allowContrastOverlap?: boolean;
  labelNote?: string;
  targetSampleScore?: number;
  contrastSampleScore?: number;
  updatedAt: number;
}

export interface WordVoiceOverride {
  word: string;
  acceptedHeard: string[];
  acceptedHeardIpa?: string[];
  updatedAt: number;
}

export interface CalibrationOutcome {
  adapted: boolean;
  reason:
    | 'already_clean'
    | 'calibrated_floor'
    | 'calibrated_signature'
    | 'same_sound_swap'
    | 'contrast_unclear'
    | 'too_quiet';
  profile?: PatternVoiceProfile;
  summary: string;
}

const MIC_GRACE_KEY = 'rift_runners_mic_grace_v1';
const VOICE_PROFILES_KEY = 'rift_runners_voice_profiles_v1';
const WORD_VOICES_KEY = 'rift_runners_word_voices_v1';

export function normalizePatternKey(pattern?: string): string {
  return String(pattern || '')
    .trim()
    .toLowerCase()
    .replace(/^[-_]+|[-_]+$/g, '');
}

function loadMicGraceSet(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(MIC_GRACE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((item) => normalizePatternKey(String(item))).filter(Boolean));
  } catch {
    return new Set();
  }
}

function saveMicGraceSet(set: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MIC_GRACE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore storage quota / private mode errors
  }
}

function loadVoiceProfiles(): Record<string, PatternVoiceProfile> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(VOICE_PROFILES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, PatternVoiceProfile> = {};
    for (const [k, val] of Object.entries(parsed)) {
      const key = normalizePatternKey(k);
      if (key && val && typeof val === 'object' && typeof (val as any).targetFloor === 'number') {
        out[key] = { ...(val as PatternVoiceProfile), pattern: key };
      }
    }
    return out;
  } catch {
    return {};
  }
}

function saveVoiceProfiles(map: Record<string, PatternVoiceProfile>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(VOICE_PROFILES_KEY, JSON.stringify(map));
  } catch {
    // ignore storage quota / private mode errors
  }
}

function loadWordVoiceOverrides(): Record<string, WordVoiceOverride> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(WORD_VOICES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, WordVoiceOverride> = {};
    for (const [k, val] of Object.entries(parsed)) {
      const key = String(k || '').trim().toLowerCase();
      if (key && val && typeof val === 'object' && Array.isArray((val as any).acceptedHeard)) {
        out[key] = { ...(val as WordVoiceOverride), word: key };
      }
    }
    return out;
  } catch {
    return {};
  }
}

function saveWordVoiceOverrides(map: Record<string, WordVoiceOverride>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WORD_VOICES_KEY, JSON.stringify(map));
  } catch {
    // ignore storage quota / private mode errors
  }
}

let micGraceCache: Set<string> | null = null;
let voiceProfilesCache: Record<string, PatternVoiceProfile> | null = null;
let wordVoicesCache: Record<string, WordVoiceOverride> | null = null;

function getMicGraceStore(): Set<string> {
  if (!micGraceCache) {
    micGraceCache = loadMicGraceSet();
  }
  return micGraceCache;
}

function getVoiceProfileStore(): Record<string, PatternVoiceProfile> {
  if (!voiceProfilesCache) {
    voiceProfilesCache = loadVoiceProfiles();
  }
  return voiceProfilesCache;
}

function getWordVoiceStore(): Record<string, WordVoiceOverride> {
  if (!wordVoicesCache) {
    wordVoicesCache = loadWordVoiceOverrides();
  }
  return wordVoicesCache;
}

export function getWordVoiceOverride(word: string): WordVoiceOverride | null {
  const key = String(word || '').trim().toLowerCase();
  if (!key) return null;
  return getWordVoiceStore()[key] || null;
}

export function saveWordVoiceOverride(
  word: string,
  heardText: string,
  heardIpa?: string
): WordVoiceOverride | null {
  const key = String(word || '').trim().toLowerCase();
  if (!key) return null;
  const tokens = normTokens(heardText).filter((t) => t.length >= 2);
  if (!tokens.length && !heardIpa) return null;
  const store = getWordVoiceStore();
  const prev = store[key];
  const mergedHeard = Array.from(new Set([...(prev?.acceptedHeard || []), ...tokens]));
  const mergedIpa = Array.from(
    new Set([...(prev?.acceptedHeardIpa || []), ...(heardIpa ? [heardIpa] : [])])
  );
  const next: WordVoiceOverride = {
    word: key,
    acceptedHeard: mergedHeard,
    acceptedHeardIpa: mergedIpa.length ? mergedIpa : undefined,
    updatedAt: Date.now(),
  };
  store[key] = next;
  saveWordVoiceOverrides(store);
  return next;
}

export function removeWordVoiceOverride(word: string): void {
  const key = String(word || '').trim().toLowerCase();
  if (!key) return;
  const store = getWordVoiceStore();
  delete store[key];
  saveWordVoiceOverrides(store);
}

export function getAllWordVoiceOverrides(): WordVoiceOverride[] {
  return Object.values(getWordVoiceStore());
}

export function clearAllWordVoiceOverrides(): void {
  const store = getWordVoiceStore();
  for (const k of Object.keys(store)) {
    delete store[k];
  }
  saveWordVoiceOverrides(store);
}

export function matchesWordVoiceOverride(
  word: string,
  heardTexts: string[],
  observedHeardIpa?: string
): string | null {
  const ov = getWordVoiceOverride(word);
  if (!ov) return null;
  for (const tx of heardTexts) {
    for (const tok of normTokens(tx)) {
      if (ov.acceptedHeard.includes(tok)) {
        return tok;
      }
    }
  }
  if (observedHeardIpa && ov.acceptedHeardIpa?.includes(observedHeardIpa)) {
    return ov.acceptedHeard[0] || ipaToPlainSound(observedHeardIpa) || observedHeardIpa;
  }
  return null;
}

const SPANISH_L1_STORAGE_KEY = 'rift_runners_spanish_l1_v1';
let spanishL1Cache: boolean | null = null;

export function getSpanishL1Mode(): boolean {
  if (spanishL1Cache !== null) return spanishL1Cache;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      spanishL1Cache = window.localStorage.getItem(SPANISH_L1_STORAGE_KEY) === '1';
      return spanishL1Cache;
    }
  } catch {
    // ignore
  }
  spanishL1Cache = false;
  return false;
}

export function setSpanishL1Mode(enabled: boolean): void {
  spanishL1Cache = Boolean(enabled);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SPANISH_L1_STORAGE_KEY, enabled ? '1' : '0');
    }
  } catch {
    // ignore
  }
}

export function matchesSpanishSBlendEpenthesis(target: string, heardTexts: string[]): string | null {
  const t = String(target || '').trim().toLowerCase();
  if (!/^s[ptkclmnw]/.test(t)) return null;
  const epenthetic = `e${t}`;
  for (const tx of heardTexts) {
    const toks = normTokens(tx);
    for (let i = 0; i < toks.length; i++) {
      if (toks[i] === epenthetic) return toks[i];
      if ((toks[i] === 'e' || toks[i] === 'eh') && toks[i + 1] === t) {
        return `${toks[i]} ${toks[i + 1]}`;
      }
    }
  }
  return null;
}

export function getVoiceProfile(pattern: string): PatternVoiceProfile | null {
  const key = normalizePatternKey(pattern);
  if (!key) return null;
  return getVoiceProfileStore()[key] || null;
}

export function saveVoiceProfile(profile: PatternVoiceProfile): void {
  const key = normalizePatternKey(profile.pattern);
  if (!key) return;
  const store = getVoiceProfileStore();
  store[key] = { ...profile, pattern: key };
  saveVoiceProfiles(store);
}

export function removeVoiceProfile(pattern: string): void {
  const key = normalizePatternKey(pattern);
  if (!key) return;
  const store = getVoiceProfileStore();
  delete store[key];
  saveVoiceProfiles(store);
}

export function getAllVoiceProfiles(): PatternVoiceProfile[] {
  return Object.values(getVoiceProfileStore());
}

export function saveSpeechAccommodation(
  pattern: string,
  sample: ListenResult,
  customNote?: string
): PatternVoiceProfile {
  const key = normalizePatternKey(pattern);
  const obs = sample.diagnostic?.observed;
  const cfg = DEFAULT_PATTERN_FLOOR[key] || { base: 55, min: 30, forbiddenSwaps: [] };
  const prev = getVoiceProfile(key);
  const heardSet = new Set<string>(prev?.allowedHeard || []);
  if (obs?.heardIpa) {
    heardSet.add(obs.heardIpa);
  }
  // If a student's ch sample came through as a sh-word transcript (e.g. Spanish L1 "ship" for "chip")
  // or sh came through as s/st (e.g. "rust" for "rush"), include the matching IPA signature cleanly.
  const heardLower = String(sample.heard || '').toLowerCase();
  if (key === 'ch' && (heardLower.includes('sh') || sample.diagnostic?.heard === 'sh')) {
    heardSet.add('ʃ');
  }
  if (key === 'sh' && (heardLower.endsWith('st') || heardLower.endsWith('s') || sample.diagnostic?.heard === 's')) {
    heardSet.add('s');
  }
  const allowedHeard = Array.from(heardSet);
  const plainList = allowedHeard.map((ipa) => ipaToPlainSound(ipa) || ipa).join('/');
  const labelNote =
    customNote ||
    (plainList
      ? `accepts "${plainList}" voice fit`
      : 'adapted to student voice');

  const rawScore = obs?.targetScore ?? sample.diagnostic?.score ?? 45;
  const floor = Math.max(cfg.min, Math.min(cfg.base - 6, Math.round(rawScore - 10)));

  const profile: PatternVoiceProfile = {
    pattern: key,
    mode: 'accommodation',
    targetFloor: floor,
    allowedHeard: allowedHeard.length ? allowedHeard : undefined,
    allowContrastOverlap: true,
    labelNote,
    targetSampleScore: Math.round(rawScore),
    updatedAt: Date.now(),
  };
  saveVoiceProfile(profile);
  return profile;
}

export function getPatternGrace(pattern: string): boolean {
  const key = normalizePatternKey(pattern);
  if (!key) return false;
  return getMicGraceStore().has(key) || Boolean(getVoiceProfileStore()[key]);
}

export function setPatternGrace(pattern: string, enabled: boolean): void {
  const key = normalizePatternKey(pattern);
  if (!key) return;
  const store = getMicGraceStore();
  if (enabled) {
    store.add(key);
  } else {
    store.delete(key);
    removeVoiceProfile(key);
  }
  saveMicGraceSet(store);
}

export function getAllPatternGrace(): string[] {
  const keys = new Set<string>([
    ...Array.from(getMicGraceStore()),
    ...Object.keys(getVoiceProfileStore()),
  ]);
  return Array.from(keys);
}

export function clearAllPatternGrace(): void {
  const store = getMicGraceStore();
  store.clear();
  saveMicGraceSet(store);
  const profiles = getVoiceProfileStore();
  for (const k of Object.keys(profiles)) {
    delete profiles[k];
  }
  saveVoiceProfiles(profiles);
  clearAllWordVoiceOverrides();
}

const DEFAULT_PATTERN_FLOOR: Record<string, { base: number; min: number; forbiddenSwaps: string[] }> = {
  sh: { base: 70, min: 36, forbiddenSwaps: ['tʃ'] },
  ch: { base: 70, min: 36, forbiddenSwaps: ['ʃ'] },
  th: { base: 48, min: 28, forbiddenSwaps: ['t', 'd'] },
  wh: { base: 50, min: 30, forbiddenSwaps: ['ɹ', 'r'] },
  ck: { base: 55, min: 32, forbiddenSwaps: ['g', 'd'] },
  bl: { base: 42, min: 26, forbiddenSwaps: [] },
  cl: { base: 42, min: 26, forbiddenSwaps: [] },
  fr: { base: 42, min: 26, forbiddenSwaps: ['w'] },
  gr: { base: 42, min: 26, forbiddenSwaps: ['w'] },
  sp: { base: 44, min: 26, forbiddenSwaps: [] },
  st: { base: 44, min: 26, forbiddenSwaps: [] },
  nd: { base: 42, min: 24, forbiddenSwaps: [] },
  mp: { base: 42, min: 24, forbiddenSwaps: [] },
  a: { base: 52, min: 28, forbiddenSwaps: ['æ', 'ɪ', 'ɑ', 'ɔ', 'ʌ', 'u', 'oʊ'].filter((x) => x !== 'æ') },
  e: { base: 52, min: 28, forbiddenSwaps: ['æ', 'ɑ', 'ɔ', 'ʌ', 'u', 'oʊ'] },
  i: { base: 52, min: 28, forbiddenSwaps: ['æ', 'ɑ', 'ɔ', 'ʌ', 'u', 'oʊ'] },
  o: { base: 52, min: 28, forbiddenSwaps: ['æ', 'ɪ', 'ɛ', 'i', 'eɪ'] },
  u: { base: 52, min: 28, forbiddenSwaps: ['æ', 'ɪ', 'ɛ', 'i', 'eɪ'] },
};

export function calibratePatternFromSamples(
  pattern: string,
  targetWord: string,
  contrastWord: string,
  targetRes: ListenResult,
  contrastRes: ListenResult,
  label?: string
): CalibrationOutcome {
  const key = normalizePatternKey(pattern);
  const displayLabel = label || key;

  if (targetRes.outcome === 'match') {
    return {
      adapted: false,
      reason: 'already_clean',
      summary: `Your voice already passes cleanly on ${displayLabel}. No adjustment needed.`,
    };
  }

  const tObs = targetRes.diagnostic?.observed;
  const cObs = contrastRes.diagnostic?.observed;
  const tScore = tObs?.targetScore ?? targetRes.diagnostic?.score ?? 0;
  const tWordScore = tObs?.wordScore ?? 0;
  const cWordScore = cObs?.wordScore ?? 0;

  if (
    targetRes.outcome === 'nothing' ||
    targetRes.outcome === 'down' ||
    targetRes.outcome === 'again' ||
    (tWordScore < 32 && tScore < 22)
  ) {
    return {
      adapted: false,
      reason: 'too_quiet',
      summary: `The mic barely caught "${targetWord}". Lean a bit closer and try again, or turn on Mic Grace manually below.`,
    };
  }

  const cfg = DEFAULT_PATTERN_FLOOR[key] || { base: 55, min: 32, forbiddenSwaps: [] };
  const tHeard = tObs?.heardIpa;
  const cTarget = cObs?.targetIpa;
  const cHeard = cObs?.heardIpa;

  // Reject calibration if the student actually produced the contrast word's target sound
  // (for example, saying "chip" /tʃ/ when asked to read "ship" /ʃ/, or saying short "a" for short "i").
  const saidContrastSound =
    Boolean(tHeard && cTarget && tHeard === cTarget && tHeard !== tObs?.targetIpa) ||
    Boolean(tHeard && cfg.forbiddenSwaps.includes(tHeard) && tScore < 55);

  if (saidContrastSound) {
    return {
      adapted: false,
      reason: 'same_sound_swap',
      summary: `To the mic, "${targetWord}" sounded just like "${contrastWord}". Listen to both words side by side, then try again.`,
    };
  }

  const contrastReadable =
    contrastRes.outcome === 'match' ||
    cWordScore >= 38 ||
    (cObs?.targetScore ?? 0) >= 35;

  if (!contrastReadable) {
    return {
      adapted: false,
      reason: 'contrast_unclear',
      summary: `The mic did not clearly hear "${contrastWord}" for comparison. Try saying "${contrastWord}" once more, or toggle Mic Grace below.`,
    };
  }

  // Also check that both words didn't collapse to the exact same heard phoneme
  if (tHeard && cHeard && tHeard === cHeard && tObs?.targetIpa !== cObs?.targetIpa) {
    return {
      adapted: false,
      reason: 'same_sound_swap',
      summary: `Both "${targetWord}" and "${contrastWord}" sounded identical to the mic. Listen to the contrast above and try once more.`,
    };
  }

  const effectiveTargetScore = Math.max(tScore, Math.round(tWordScore * 0.7));
  const personalizedFloor = Math.max(
    cfg.min,
    Math.min(cfg.base - 4, Math.round(effectiveTargetScore - 10))
  );

  // If the student's voice consistently maps this target to a distinct non-contrast sound
  // (e.g., a mild lisp producing 's' for 'sh' while keeping 'ch' clearly /tʃ/), learn that signature!
  const allowedHeard: string[] = [];
  if (
    tHeard &&
    tHeard !== tObs?.targetIpa &&
    tHeard !== cTarget &&
    tHeard !== cHeard &&
    !cfg.forbiddenSwaps.includes(tHeard)
  ) {
    allowedHeard.push(tHeard);
  }

  const profile: PatternVoiceProfile = {
    pattern: key,
    mode: 'calibrated',
    targetFloor: personalizedFloor,
    allowedHeard: allowedHeard.length ? allowedHeard : undefined,
    targetSampleScore: Math.round(tScore),
    contrastSampleScore: Math.round(cObs?.targetScore ?? cWordScore),
    updatedAt: Date.now(),
  };

  saveVoiceProfile(profile);

  return {
    adapted: true,
    reason: allowedHeard.length ? 'calibrated_signature' : 'calibrated_floor',
    profile,
    summary: `Adapted Speak Mode to your voice for ${displayLabel}! Your reading clearly separates "${targetWord}" from "${contrastWord}", so scoring is now tuned for your voice while still catching sound swaps.`,
  };
}

function inferWordPatterns(target: string, explicitPattern?: string): string[] {
  const keys = new Set<string>();
  const explicit = normalizePatternKey(explicitPattern);
  if (explicit) keys.add(explicit);
  const t = String(target || '').toLowerCase();
  if (t.includes('sh')) keys.add('sh');
  if (t.includes('ch')) keys.add('ch');
  if (t.includes('th')) keys.add('th');
  if (t.includes('wh')) keys.add('wh');
  if (t.endsWith('ck')) keys.add('ck');
  const blendMatch = /^(bl|cl|fl|gl|pl|sl|br|cr|dr|fr|gr|pr|tr|sp|st|sc|sk|sm|sn|sw)/.exec(t);
  if (blendMatch) keys.add(blendMatch[1]);
  const endBlendMatch = /(nd|mp|nt|nk|ft|lt)$/.exec(t);
  if (endBlendMatch) keys.add(endBlendMatch[1]);
  const vm = /^[^aeiou]*([aeiou])[^aeiouy]*$/.exec(t);
  if (vm && vm[1]) keys.add(vm[1]);
  return Array.from(keys);
}

function ipaToPlainSound(ipa?: string | null): string | undefined {
  if (!ipa) return undefined;
  const map: Record<string, string> = {
    'æ': 'short a',
    'ɛ': 'short e',
    'ɪ': 'short i',
    'ɑ': 'short o',
    'ɔ': 'short o',
    'ʌ': 'short u',
    'ə': 'short u',
    'ʃ': 'sh',
    'tʃ': 'ch',
    'θ': 'th',
    'ð': 'th',
    'w': 'wh',
    'k': 'ck',
    's': 's',
    't': 't',
    'd': 'd',
    'g': 'g',
    'b': 'b',
    'p': 'p',
    'l': 'l',
    'z': 'z',
    'f': 'f',
    'v': 'v',
    'dʒ': 'j',
    'ʒ': 'zh',
    'ɹ': 'r',
    'n': 'n',
    'm': 'm',
    'ŋ': 'ng',
  };
  return map[ipa];
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
  isRune = false,
  opts?: {
    pattern?: string;
    grace?: boolean;
    profile?: PatternVoiceProfile | null;
    spanishL1?: boolean;
  }
): {
  outcome: 'match' | 'miss' | 'nothing';
  note: string;
  alignmentDrop?: boolean;
  nasalSchwa?: boolean;
  diagnostic: SpeechDiagnostic;
} {
  const s = SPEECH_SCORE_CONFIG;
  if (!res || res.status !== 'Success' || !res.word) {
    return {
      outcome: res && res.heard ? 'miss' : 'nothing',
      note: 'azure ' + (res && res.status ? res.status : 'no-match'),
      diagnostic: { kind: res && res.heard ? 'unclear' : 'quiet' },
    };
  }
  const w = res.word;
  const ph: Array<{ p: string; score: number; best?: Array<{ p: string; score: number }> }> = w.phonemes || [];
  if (w.error === 'Omission' || !ph.length) {
    return {
      outcome: res.heard ? 'miss' : 'nothing',
      note: 'azure skipped the word',
      diagnostic: { kind: res.heard ? 'unclear' : 'quiet' },
    };
  }

  const inferredPatterns = inferWordPatterns(target, opts?.pattern);
  const explicitKey = normalizePatternKey(opts?.pattern);
  const activeProfile: PatternVoiceProfile | null =
    opts?.profile !== undefined
      ? opts.profile
      : (explicitKey ? getVoiceProfile(explicitKey) : null) ||
        inferredPatterns.map((k) => getVoiceProfile(k)).find(Boolean) ||
        null;

  const graceActive =
    typeof opts?.grace === 'boolean'
      ? opts.grace
      : Boolean(activeProfile) || inferredPatterns.some((k) => getMicGraceStore().has(k));

  const profileForVowel =
    activeProfile && ['a', 'e', 'i', 'o', 'u'].includes(activeProfile.pattern)
      ? activeProfile
      : null;

  const vowelMin = profileForVowel
    ? Math.min(s.vowelMin, profileForVowel.targetFloor)
    : graceActive
    ? Math.max(36, s.vowelMin - 14)
    : s.vowelMin;
  const vowelClearMiss = graceActive ? Math.max(50, s.vowelClearMiss - 8) : s.vowelClearMiss;
  const consAvgMin = activeProfile
    ? Math.max(22, s.consonantAvgMin - 10)
    : graceActive
    ? Math.max(26, s.consonantAvgMin - 7)
    : s.consonantAvgMin;
  const wordMin = activeProfile
    ? Math.max(28, s.wordMin - 10)
    : graceActive
    ? Math.max(32, s.wordMin - 8)
    : s.wordMin;

  const vi = ph.findIndex((p) => VOWELS.includes(p.p));
  if (vi < 0) {
    const pass = (w.accuracy || 0) >= wordMin;
    const tag = activeProfile ? ' [adapted]' : graceActive ? ' [grace]' : '';
    return {
      outcome: pass ? 'match' : 'miss',
      note: `word ${Math.round(w.accuracy || 0)}${tag}`,
      diagnostic: {
        kind: pass ? 'pass' : 'unclear',
        score: Math.round(w.accuracy || 0),
        usedGrace: graceActive,
        usedProfile: Boolean(activeProfile),
        observed: { wordScore: Math.round(w.accuracy || 0) },
      },
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
  const spanishL1 = typeof opts?.spanishL1 === 'boolean' ? opts.spanishL1 : getSpanishL1Mode();
  let usedSpanishL1 = false;

  if (nasal && want === 'æ') {
    // Nasalized short a before m/n (e.g., fan) can raise slightly in Azure NBest
    ok = ok.concat(['ɛ']);
  }
  if (spanishL1 && want === 'ɪ') {
    // Spanish L1 has one /i/ vowel; short i ("ship", "sit") often realizes as tense /i/
    ok = ok.concat(['i']);
  }
  if (profileForVowel?.allowedHeard?.length) {
    ok = ok.concat(profileForVowel.allowedHeard);
  }

  const bestList = Array.isArray(v.best) ? v.best : [];
  const top = bestList[0]?.p || null;
  const second = bestList[1] || null;
  const topOK = Boolean(top && ok.includes(top));
  const topOther = Boolean(top && !topOK && VOWELS.includes(top));
  const spanishShortIOK =
    spanishL1 &&
    want === 'ɪ' &&
    (top === 'i' || Boolean(second && second.p === 'i' && (second.score || 0) >= 48));
  if (spanishShortIOK) {
    usedSpanishL1 = true;
  }

  // For nonsense runes where Azure's dictionary guesses the wrong reference vowel,
  // also accept if our intended short vowel is a strong #2 candidate and #1 is NOT the opposite Level 1 vowel.
  const oppositeTargetVowel = want === 'æ' ? 'ɪ' : want === 'ɪ' ? 'æ' : null;
  const runeSecondOK =
    isRune &&
    offGuess &&
    Boolean(second && ok.includes(second.p) && (second.score || 0) >= (graceActive ? 34 : 42)) &&
    top !== oppositeTargetVowel;

  // Natural Southern / relaxed short i can dip slightly toward ɛ or ə while keeping ɪ right behind as #2.
  // Never allow clear wrong vowels (æ, ɑ, ɔ, ʌ, aɪ, eɪ, oʊ, u).
  const relaxedShortIOK =
    want === 'ɪ' &&
    Boolean(top && ['ɛ', 'ə', 'ɨ'].includes(top)) &&
    Boolean(second && ok.includes(second.p) && (second.score || 0) >= (graceActive ? 28 : 35)) &&
    (v.score || 0) >= (graceActive ? 20 : 25);

  const vs = v.score || 0;
  const vowelPass = offGuess
    ? topOK || runeSecondOK || spanishShortIOK
    : spanishShortIOK ||
      (topOK && vs >= 10) ||
      relaxedShortIOK ||
      (vs >= vowelMin && !(topOther && vs < vowelClearMiss));

  const consPh = ph.filter((_p, k) => k !== vi);
  const cons = consPh.map((p) => p.score || 0);
  const effectiveCons = cons.slice();

  // Catch World 2 digraph swaps (sh, ch, th unvoiced/voiced, wh, -ck) using multi-voice calibrated cutoffs.
  // When a student has a calibrated PatternVoiceProfile (or explicit Speech/ELL Accommodation), apply their
  // verified personal floor and allowed speech signature while keeping all other sounds in the word graded.
  const targetLower = String(target || '').toLowerCase();
  const hasWh = targetLower.includes('wh');
  const endsCk = targetLower.endsWith('ck');
  let digraphSwapMiss = false;
  let digraphBorderlineMiss = false;
  let digraphExpected: string | undefined;
  let digraphHeard: string | undefined;
  let digraphScore: number | undefined;
  let digraphDetail = '';
  let observedDigraph: ObservedPhoneme | null = null;
  let usedAccommodation = false;

  const getDigraphProfile = (patKey: string): PatternVoiceProfile | null => {
    if (activeProfile && activeProfile.pattern === patKey) return activeProfile;
    return opts?.profile !== undefined ? null : getVoiceProfile(patKey);
  };

  for (let ci = 0; ci < consPh.length; ci++) {
    const cp = consPh[ci];
    const topC = Array.isArray(cp.best) ? cp.best[0]?.p : null;
    const sc = cp.score || 0;
    const isFinalCons = ci === consPh.length - 1;

    if (cp.p === 'ʃ' || cp.p === 'tʃ') {
      const wantsCh =
        (!isFinalCons && targetLower.startsWith('ch')) ||
        (isFinalCons && targetLower.endsWith('ch'));
      const wantsSh =
        (!isFinalCons && targetLower.startsWith('sh')) ||
        (isFinalCons && targetLower.endsWith('sh'));
      const expected = wantsCh ? 'tʃ' : wantsSh ? 'ʃ' : cp.p;
      const patKey = expected === 'tʃ' ? 'ch' : 'sh';
      const dgProfile = getDigraphProfile(patKey);
      const dgGrace = graceActive || Boolean(dgProfile);
      const azureDictMismatch = expected !== cp.p;

      observedDigraph = {
        targetIpa: expected,
        targetScore: Math.round(sc),
        heardIpa: topC || undefined,
        wordScore: Math.round(w.accuracy || 0),
      };

      digraphDetail = `, ${expected} ${Math.round(sc)}${topC ? ` (heard ${topC})` : ''}`;
      if (azureDictMismatch) {
        const secondC = Array.isArray(cp.best) ? cp.best[1] : null;
        const allowedSig = Boolean(topC && dgProfile?.allowedHeard?.includes(topC));
        const spanishChSh =
          spanishL1 && ((expected === 'tʃ' && topC === 'ʃ') || (expected === 'ʃ' && topC === 'tʃ'));
        const accommodated = Boolean((dgProfile?.allowContrastOverlap && allowedSig) || spanishChSh);
        const heardExpected =
          accommodated ||
          topC === expected ||
          Boolean(
            secondC &&
              secondC.p === expected &&
              (secondC.score || 0) >= (dgGrace ? 45 : 55) &&
              topC !== cp.p
          );
        if (accommodated) {
          usedAccommodation = true;
          if (spanishChSh) usedSpanishL1 = true;
          effectiveCons[ci] = Math.max(effectiveCons[ci], 78);
        }
        if (!heardExpected) {
          digraphSwapMiss = true;
          digraphExpected = ipaToPlainSound(expected);
          digraphHeard = ipaToPlainSound(topC);
          digraphScore = Math.round(sc);
        }
      } else {
        const allowedSig = Boolean(topC && dgProfile?.allowedHeard?.includes(topC));
        const spanishChSh =
          spanishL1 && ((expected === 'tʃ' && topC === 'ʃ') || (expected === 'ʃ' && topC === 'tʃ'));
        const accommodatedOverlap = Boolean(
          (dgProfile?.allowContrastOverlap && allowedSig) || spanishChSh
        );
        if (accommodatedOverlap) {
          usedAccommodation = true;
          if (spanishChSh) usedSpanishL1 = true;
          effectiveCons[ci] = Math.max(effectiveCons[ci], 78);
        } else {
          const directOpposite =
            (expected === 'ʃ' && topC === 'tʃ') || (expected === 'tʃ' && topC === 'ʃ');
          const swappedWithNeighbor =
            directOpposite ||
            (!allowedSig &&
              ((expected === 'ʃ' && (topC === 's' || topC === 'ʒ')) ||
                (expected === 'tʃ' && (topC === 's' || topC === 't' || topC === 'dʒ'))));
          const baseFloor = dgProfile ? dgProfile.targetFloor : dgGrace ? 55 : 70;
          const swapFloor = dgGrace ? 78 : 82;
          if (sc < baseFloor || (swappedWithNeighbor && sc < swapFloor)) {
            digraphSwapMiss = true;
            digraphBorderlineMiss = !swappedWithNeighbor && sc >= 36;
            digraphExpected = ipaToPlainSound(expected);
            digraphHeard = ipaToPlainSound(topC);
            digraphScore = Math.round(sc);
          }
        }
      }
    } else if (cp.p === 'θ') {
      const dgProfile = getDigraphProfile('th');
      const dgGrace = graceActive || Boolean(dgProfile);
      observedDigraph = {
        targetIpa: 'θ',
        targetScore: Math.round(sc),
        heardIpa: topC || undefined,
        wordScore: Math.round(w.accuracy || 0),
      };
      digraphDetail = `, θ ${Math.round(sc)}${topC ? ` (heard ${topC})` : ''}`;
      const allowedSig = Boolean(topC && dgProfile?.allowedHeard?.includes(topC));
      const spanishUnvoicedTh = spanishL1 && Boolean(topC && ['t', 's', 'f'].includes(topC));
      if ((dgProfile?.allowContrastOverlap && allowedSig) || spanishUnvoicedTh) {
        usedAccommodation = true;
        if (spanishUnvoicedTh) usedSpanishL1 = true;
        effectiveCons[ci] = Math.max(effectiveCons[ci], 78);
      } else {
        const swapped = topC === 't';
        const baseFloor = dgProfile ? dgProfile.targetFloor : dgGrace ? 36 : 48;
        const swapFloor = dgGrace ? 62 : 65;
        if (sc < baseFloor || (swapped && sc < swapFloor)) {
          digraphSwapMiss = true;
          digraphBorderlineMiss = !swapped && sc >= 24;
          digraphExpected = 'th';
          digraphHeard = ipaToPlainSound(topC);
          digraphScore = Math.round(sc);
        }
      }
    } else if (cp.p === 'ð') {
      const dgProfile = getDigraphProfile('th');
      const dgGrace = graceActive || Boolean(dgProfile);
      observedDigraph = {
        targetIpa: 'ð',
        targetScore: Math.round(sc),
        heardIpa: topC || undefined,
        wordScore: Math.round(w.accuracy || 0),
      };
      digraphDetail = `, ð ${Math.round(sc)}${topC ? ` (heard ${topC})` : ''}`;
      const allowedSig = Boolean(topC && dgProfile?.allowedHeard?.includes(topC));
      const spanishVoicedTh = spanishL1 && Boolean(topC && ['d', 'z', 't'].includes(topC));
      if ((dgProfile?.allowContrastOverlap && allowedSig) || spanishVoicedTh) {
        usedAccommodation = true;
        if (spanishVoicedTh) usedSpanishL1 = true;
        effectiveCons[ci] = Math.max(effectiveCons[ci], 78);
      } else {
        const swappedVoicedTh =
          topC === 'd' || topC === 't' || (!allowedSig && (topC === 'z' || topC === 'v'));
        const baseFloor = dgProfile ? dgProfile.targetFloor : dgGrace ? 42 : 55;
        const swapFloor = dgGrace ? 72 : 75;
        if (sc < baseFloor || (swappedVoicedTh && sc < swapFloor)) {
          digraphSwapMiss = true;
          digraphBorderlineMiss = !swappedVoicedTh && sc >= 28;
          digraphExpected = 'th';
          digraphHeard = ipaToPlainSound(topC);
          digraphScore = Math.round(sc);
        }
      }
    } else if (hasWh && cp.p === 'w') {
      const dgProfile = getDigraphProfile('wh');
      const dgGrace = graceActive || Boolean(dgProfile);
      observedDigraph = {
        targetIpa: 'w',
        targetScore: Math.round(sc),
        heardIpa: topC || undefined,
        wordScore: Math.round(w.accuracy || 0),
      };
      digraphDetail = `, w ${Math.round(sc)}${topC ? ` (heard ${topC})` : ''}`;
      const allowedSig = Boolean(topC && dgProfile?.allowedHeard?.includes(topC));
      if (dgProfile?.allowContrastOverlap && allowedSig) {
        usedAccommodation = true;
        effectiveCons[ci] = Math.max(effectiveCons[ci], 78);
      } else {
        const swapped = Boolean(topC && topC !== 'w' && !allowedSig);
        const baseFloor = dgProfile ? dgProfile.targetFloor : dgGrace ? 38 : 50;
        const swapFloor = dgGrace ? 66 : 70;
        if (sc < baseFloor || (swapped && sc < swapFloor)) {
          digraphSwapMiss = true;
          digraphBorderlineMiss = !swapped && sc >= 26;
          digraphExpected = 'wh';
          digraphHeard = ipaToPlainSound(topC);
          digraphScore = Math.round(sc);
        }
      }
    } else if (endsCk && isFinalCons && cp.p === 'k') {
      const dgProfile = getDigraphProfile('ck');
      const dgGrace = graceActive || Boolean(dgProfile);
      observedDigraph = {
        targetIpa: 'k',
        targetScore: Math.round(sc),
        heardIpa: topC || undefined,
        wordScore: Math.round(w.accuracy || 0),
      };
      digraphDetail = `, k ${Math.round(sc)}${topC ? ` (heard ${topC})` : ''}`;
      const allowedSig = Boolean(topC && dgProfile?.allowedHeard?.includes(topC));
      if (dgProfile?.allowContrastOverlap && allowedSig) {
        usedAccommodation = true;
        effectiveCons[ci] = Math.max(effectiveCons[ci], 78);
      } else {
        const swappedCk =
          topC === 'g' || topC === 'd' || (!allowedSig && (topC === 't' || topC === 'p'));
        const baseFloor = dgProfile ? dgProfile.targetFloor : dgGrace ? 42 : 55;
        const swapFloor = dgGrace ? 68 : 72;
        if (sc < baseFloor || (swappedCk && sc < swapFloor)) {
          digraphSwapMiss = true;
          digraphBorderlineMiss = !swappedCk && sc >= 28;
          digraphExpected = 'ck';
          digraphHeard = ipaToPlainSound(topC);
          digraphScore = Math.round(sc);
        }
      }
    } else if (spanishL1 && (cp.p === 'v' || cp.p === 'b')) {
      const vbSwap =
        (cp.p === 'v' && (topC === 'b' || topC === 'β')) ||
        (cp.p === 'b' && (topC === 'v' || topC === 'β'));
      if (vbSwap) {
        usedSpanishL1 = true;
        usedAccommodation = true;
        effectiveCons[ci] = Math.max(effectiveCons[ci], 78);
      }
    } else if (spanishL1 && ci === 0 && cp.p === 's' && /^s[ptkclmnw]/.test(targetLower)) {
      const secondC = Array.isArray(cp.best) ? cp.best[1] : null;
      if ((topC === 's' || secondC?.p === 's') && sc >= 24 && sc < 72) {
        usedSpanishL1 = true;
        effectiveCons[ci] = Math.max(effectiveCons[ci], 72);
      }
    }
  }

  // Catch initial L-blend and R-blend drops or l/r swaps (bl, cl, fr, gr, etc.) while honoring Personal Voice Profiles.
  const initBlendMatch = targetLower.match(/^(bl|cl|fl|gl|pl|sl|br|cr|dr|fr|gr|pr|tr)/);
  if (initBlendMatch && !digraphSwapMiss && consPh.length >= 2) {
    const blendKey = initBlendMatch[1];
    const isLBlend = blendKey[1] === 'l';
    const expectedLiquid = isLBlend ? 'l' : 'ɹ';
    const leadPh = consPh[0];
    const liquidPh = consPh[1];
    const leadSc = effectiveCons[0] ?? 0;
    const liqSc = effectiveCons[1] ?? 0;
    const leadTop = Array.isArray(leadPh.best) ? leadPh.best[0]?.p : null;
    const liqTop = Array.isArray(liquidPh.best) ? liquidPh.best[0]?.p : null;
    const blendProfile = getDigraphProfile(blendKey);
    const blendGrace = graceActive || Boolean(blendProfile);

    if (!observedDigraph || explicitKey === blendKey) {
      observedDigraph = {
        targetIpa: expectedLiquid,
        targetScore: Math.round(liqSc),
        heardIpa: liqTop || undefined,
        wordScore: Math.round(w.accuracy || 0),
      };
    }
    digraphDetail += `, ${blendKey} ${Math.round(leadSc)}/${Math.round(liqSc)}${
      leadTop && leadTop !== leadPh.p ? ` (lead ${leadTop})` : ''
    }${liqTop ? ` (heard ${liqTop})` : ''}`;

    const allowedLiqSig = Boolean(liqTop && blendProfile?.allowedHeard?.includes(liqTop));
    if (blendProfile?.allowContrastOverlap && allowedLiqSig) {
      usedAccommodation = true;
      effectiveCons[1] = Math.max(effectiveCons[1], 76);
    } else {
      const mismatchedLiquid = Boolean(liqTop && liqTop !== expectedLiquid);
      const mismatchedLead = Boolean(leadTop && leadTop !== leadPh.p);
      const leadSwallowedByLiquid = Boolean(leadTop && leadTop === expectedLiquid && leadTop !== leadPh.p);
      // Check if Azure transcribed the dropped-liquid single-consonant word (e.g., "back" for "black", "fog" for "frog")
      const droppedLiquidWord = blendKey[0] + targetLower.slice(2);
      const heardSingleWord = normTokens(res.heard || '').includes(droppedLiquidWord);
      const liqBaseFloor = blendProfile ? blendProfile.targetFloor : blendGrace ? 30 : 42;
      const liqSwapFloor = blendGrace ? 82 : 92;
      const leadFloor = blendGrace ? 24 : 34;
      const leadSwapFloor = blendGrace ? 84 : 95;

      if (
        liqSc < liqBaseFloor ||
        (mismatchedLiquid && liqSc < liqSwapFloor) ||
        (heardSingleWord && liqSc < 84)
      ) {
        digraphSwapMiss = true;
        digraphBorderlineMiss = !mismatchedLiquid && !heardSingleWord && liqSc >= 24;
        digraphExpected = blendKey;
        digraphHeard = heardSingleWord
          ? blendKey[0]
          : ipaToPlainSound(liqTop);
        digraphScore = Math.round(liqSc);
      } else if (
        leadSc < leadFloor ||
        (mismatchedLead && leadSc < leadSwapFloor) ||
        (leadSwallowedByLiquid && !blendGrace && leadSc < 99)
      ) {
        digraphSwapMiss = true;
        digraphBorderlineMiss = !mismatchedLead && leadSc >= 20;
        digraphExpected = blendKey;
        digraphHeard = ipaToPlainSound(leadTop);
        digraphScore = Math.round(leadSc);
      }
    }
  }

  // Catch initial S-blend drops (sp, st, sc, sk, sm, sn, sw -> pin/sin, top/sop) while honoring Spanish L1 & Voice Profiles.
  const initSBlendMatch = targetLower.match(/^(sp|st|sc|sk|sm|sn|sw)/);
  if (initSBlendMatch && !digraphSwapMiss && consPh.length >= 2 && vi >= 2) {
    const blendKey = initSBlendMatch[1];
    const sPh = consPh[0];
    const secondPh = consPh[1];
    const sSc = effectiveCons[0] ?? 0;
    const secondSc = effectiveCons[1] ?? 0;
    const sTop = Array.isArray(sPh.best) ? sPh.best[0]?.p : null;
    const secondTop = Array.isArray(secondPh.best) ? secondPh.best[0]?.p : null;
    const blendProfile = getDigraphProfile(blendKey);
    const blendGrace = graceActive || Boolean(blendProfile);
    const heardTokens = normTokens(res.heard || '');
    const droppedSWord = targetLower.slice(1); // spin -> pin, stop -> top
    const droppedSecondWord = 's' + targetLower.slice(2); // spin -> sin, stop -> sop
    const heardDroppedS = heardTokens.includes(droppedSWord);
    const heardDroppedSecond = heardTokens.includes(droppedSecondWord);

    if (!observedDigraph || explicitKey === blendKey) {
      observedDigraph = {
        targetIpa: sSc <= secondSc ? 's' : secondPh.p,
        targetScore: Math.round(Math.min(sSc, secondSc)),
        heardIpa: (sSc <= secondSc ? sTop : secondTop) || undefined,
        wordScore: Math.round(w.accuracy || 0),
      };
    }
    digraphDetail += `, ${blendKey} ${Math.round(sSc)}/${Math.round(secondSc)}${
      sTop && sTop !== 's' ? ` (s->${sTop})` : ''
    }${secondTop && secondTop !== secondPh.p ? ` (${secondPh.p}->${secondTop})` : ''}`;

    const allowedSBlendSig = Boolean(
      (sTop && blendProfile?.allowedHeard?.includes(sTop)) ||
        (secondTop && blendProfile?.allowedHeard?.includes(secondTop))
    );
    if (blendProfile?.allowContrastOverlap && allowedSBlendSig) {
      usedAccommodation = true;
      effectiveCons[0] = Math.max(effectiveCons[0], 76);
      effectiveCons[1] = Math.max(effectiveCons[1], 76);
    } else {
      const sFloor = blendProfile ? blendProfile.targetFloor : blendGrace ? 28 : 40;
      const secondFloor = blendProfile ? blendProfile.targetFloor : blendGrace ? 30 : 42;
      const sMismatched = Boolean(sTop && sTop !== 's');
      const secondMismatched = Boolean(secondTop && secondTop !== secondPh.p);
      const swapFloor = blendGrace ? 76 : 86;

      if (
        sSc < sFloor ||
        (sMismatched && sSc < swapFloor) ||
        (heardDroppedS && sSc < 88)
      ) {
        digraphSwapMiss = true;
        digraphBorderlineMiss = !sMismatched && !heardDroppedS && sSc >= 22;
        digraphExpected = blendKey;
        digraphHeard = heardDroppedS ? blendKey[1] : ipaToPlainSound(sTop);
        digraphScore = Math.round(sSc);
      } else if (
        secondSc < secondFloor ||
        (secondMismatched && secondSc < swapFloor) ||
        (heardDroppedSecond && secondSc < 88)
      ) {
        digraphSwapMiss = true;
        digraphBorderlineMiss = !secondMismatched && !heardDroppedSecond && secondSc >= 22;
        digraphExpected = blendKey;
        digraphHeard = heardDroppedSecond ? 's' : ipaToPlainSound(secondTop);
        digraphScore = Math.round(secondSc);
      }
    }
  }

  // Catch final nasal/stop blend drops (nd, mp, nt, nk, ft, lt -> had/hat, cap/cat) while allowing soft final stop release.
  const endBlendMatch = targetLower.match(/(nd|mp|nt|nk|ft|lt)$/);
  if (endBlendMatch && !digraphSwapMiss && consPh.length >= 2 && ph.length - 1 - vi >= 2) {
    const blendKey = endBlendMatch[1];
    const firstIdx = consPh.length - 2;
    const secondIdx = consPh.length - 1;
    const firstPh = consPh[firstIdx];
    const secondPh = consPh[secondIdx];
    const firstSc = effectiveCons[firstIdx] ?? 0;
    const secondSc = effectiveCons[secondIdx] ?? 0;
    const firstTop = Array.isArray(firstPh.best) ? firstPh.best[0]?.p : null;
    const secondTop = Array.isArray(secondPh.best) ? secondPh.best[0]?.p : null;
    const blendProfile = getDigraphProfile(blendKey);
    const blendGrace = graceActive || Boolean(blendProfile);
    const heardTokens = normTokens(res.heard || '');
    const droppedFirstWord = targetLower.slice(0, -2) + blendKey[1]; // hand -> had, camp -> cap
    const droppedSecondWord = targetLower.slice(0, -1); // hand -> han, camp -> cam
    const heardDroppedFirst = heardTokens.includes(droppedFirstWord);
    const heardDroppedSecond = heardTokens.includes(droppedSecondWord);

    if (!observedDigraph || explicitKey === blendKey) {
      observedDigraph = {
        targetIpa: firstSc <= secondSc ? firstPh.p : secondPh.p,
        targetScore: Math.round(Math.min(firstSc, secondSc)),
        heardIpa: (firstSc <= secondSc ? firstTop : secondTop) || undefined,
        wordScore: Math.round(w.accuracy || 0),
      };
    }
    digraphDetail += `, -${blendKey} ${Math.round(firstSc)}/${Math.round(secondSc)}${
      firstTop && firstTop !== firstPh.p ? ` (${firstPh.p}->${firstTop})` : ''
    }${secondTop && secondTop !== secondPh.p ? ` (${secondPh.p}->${secondTop})` : ''}`;

    const allowedEndSig = Boolean(
      (firstTop && blendProfile?.allowedHeard?.includes(firstTop)) ||
        (secondTop && blendProfile?.allowedHeard?.includes(secondTop))
    );
    if (blendProfile?.allowContrastOverlap && allowedEndSig) {
      usedAccommodation = true;
      effectiveCons[firstIdx] = Math.max(effectiveCons[firstIdx], 76);
      effectiveCons[secondIdx] = Math.max(effectiveCons[secondIdx], 76);
    } else {
      const firstFloor = blendProfile ? blendProfile.targetFloor : blendGrace ? 26 : 36;
      const secondFloor = blendProfile ? Math.max(20, blendProfile.targetFloor - 8) : blendGrace ? 20 : 28;
      const firstMismatched = Boolean(firstTop && firstTop !== firstPh.p);
      // Allow devoiced /t/ for final /d/ after /n/ or soft unreleased final stop when Azure's top-2 matches
      const secondNBest = (secondPh.best || []).slice(0, 2).map((b) => b.p);
      const softFinalStopOK =
        (secondPh.p === 'd' && secondNBest.some((p) => p === 'd' || p === 't')) ||
        (secondPh.p === 'p' && secondNBest.some((p) => p === 'p' || p === 'b')) ||
        (secondPh.p === 't' && secondNBest.some((p) => p === 't' || p === 'd'));
      const secondMismatched = Boolean(secondTop && secondTop !== secondPh.p && !softFinalStopOK);
      const swapFloor = blendGrace ? 74 : 84;

      if (
        firstSc < firstFloor ||
        (firstMismatched && firstSc < swapFloor) ||
        (heardDroppedFirst && firstSc < 88)
      ) {
        digraphSwapMiss = true;
        digraphBorderlineMiss = !firstMismatched && !heardDroppedFirst && firstSc >= 20;
        digraphExpected = blendKey;
        digraphHeard = heardDroppedFirst ? blendKey[1] : ipaToPlainSound(firstTop);
        digraphScore = Math.round(firstSc);
      } else if (
        secondSc < secondFloor ||
        (secondMismatched && secondSc < swapFloor) ||
        (heardDroppedSecond && secondSc < 84)
      ) {
        digraphSwapMiss = true;
        digraphBorderlineMiss = !secondMismatched && !heardDroppedSecond && secondSc >= 16;
        digraphExpected = blendKey;
        digraphHeard = heardDroppedSecond ? blendKey[0] : ipaToPlainSound(secondTop);
        digraphScore = Math.round(secondSc);
      }
    }
  }

  const avg = effectiveCons.length
    ? effectiveCons.reduce((a, b) => a + b, 0) / effectiveCons.length
    : 100;

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
  let consEachOK = effectiveCons.every((c) => c >= s.consonantEachMin);
  if (!consEachOK && consPh.length >= 2 && (topOK || vs >= 55)) {
    const leadingOK = effectiveCons.slice(0, -1).every((c) => c >= s.consonantEachMin);
    const finalIdx = consPh.length - 1;
    const finalPh = consPh[finalIdx];
    const allowedFinals = SOFT_FINAL_NEIGHBORS[finalPh.p] || [finalPh.p];
    const finalNBest = (finalPh.best || []).slice(0, 3).map((b) => b.p);
    if (leadingOK && effectiveCons[finalIdx] >= 4 && finalNBest.some((p) => allowedFinals.includes(p))) {
      consEachOK = true;
    }
  }

  const consPass = avg >= consAvgMin && consEachOK && !digraphSwapMiss;
  const wordPass =
    usedSpanishL1 ||
    usedAccommodation ||
    topOK ||
    runeSecondOK ||
    relaxedShortIOK ||
    (w.accuracy || 0) >= wordMin;

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

  const primaryObserved: ObservedPhoneme =
    observedDigraph && (!explicitKey || explicitKey.length > 1)
      ? observedDigraph
      : {
          targetIpa: want,
          targetScore: Math.round(vs),
          heardIpa: top || undefined,
          wordScore: Math.round(w.accuracy || 0),
        };

  const passed = vowelPass && consPass && wordPass;
  let diagnostic: SpeechDiagnostic;
  if (passed) {
    diagnostic = {
      kind: 'pass',
      score: Math.round(w.accuracy || 0),
      usedGrace: graceActive,
      usedProfile: Boolean(activeProfile || usedSpanishL1),
      observed: primaryObserved,
    };
  } else if (digraphSwapMiss) {
    diagnostic = {
      kind: digraphBorderlineMiss ? 'borderline' : 'digraph_swap',
      expected: digraphExpected,
      heard: digraphHeard,
      score: digraphScore,
      usedGrace: graceActive,
      usedProfile: Boolean(activeProfile || usedSpanishL1),
      observed: primaryObserved,
    };
  } else if (!vowelPass) {
    const isBorderlineVowel = !topOther && vs >= 34;
    diagnostic = {
      kind: isBorderlineVowel ? 'borderline' : 'vowel_swap',
      expected: ipaToPlainSound(want),
      heard: ipaToPlainSound(top),
      score: Math.round(vs),
      usedGrace: graceActive,
      usedProfile: Boolean(activeProfile || usedSpanishL1),
      observed: primaryObserved,
    };
  } else if (!consPass) {
    diagnostic = {
      kind: avg >= 24 ? 'borderline' : 'consonant',
      score: Math.round(avg),
      usedGrace: graceActive,
      usedProfile: Boolean(activeProfile || usedSpanishL1),
      observed: primaryObserved,
    };
  } else {
    diagnostic = {
      kind: (w.accuracy || 0) >= 28 ? 'borderline' : 'unclear',
      score: Math.round(w.accuracy || 0),
      usedGrace: graceActive,
      usedProfile: Boolean(activeProfile || usedSpanishL1),
      observed: primaryObserved,
    };
  }

  const consSummary = cons.map((c) => Math.round(c)).join('/');
  const tag = usedSpanishL1
    ? ' [Spanish L1 fit]'
    : usedAccommodation
    ? ' [voice fit]'
    : activeProfile
    ? ' [adapted]'
    : graceActive
    ? ' [grace]'
    : '';
  const note = `vowel ${v.p} ${Math.round(vs)}${top ? ` (heard ${top})` : ''}${digraphDetail}, cons ${consSummary || 'n/a'}, word ${Math.round(w.accuracy || 0)}${tag}`;

  return {
    outcome: passed ? 'match' : 'miss',
    note,
    alignmentDrop,
    nasalSchwa,
    diagnostic,
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

  getVoiceProfile(pattern: string): PatternVoiceProfile | null {
    return getVoiceProfile(pattern);
  }

  removeVoiceProfile(pattern: string): void {
    removeVoiceProfile(pattern);
  }

  getAllVoiceProfiles(): PatternVoiceProfile[] {
    return getAllVoiceProfiles();
  }

  saveSpeechAccommodation(
    pattern: string,
    sample: ListenResult,
    customNote?: string
  ): PatternVoiceProfile {
    return saveSpeechAccommodation(pattern, sample, customNote);
  }

  getWordVoiceOverride(word: string): WordVoiceOverride | null {
    return getWordVoiceOverride(word);
  }

  saveWordVoiceOverride(
    word: string,
    heardText: string,
    heardIpa?: string
  ): WordVoiceOverride | null {
    return saveWordVoiceOverride(word, heardText, heardIpa);
  }

  removeWordVoiceOverride(word: string): void {
    removeWordVoiceOverride(word);
  }

  getAllWordVoiceOverrides(): WordVoiceOverride[] {
    return getAllWordVoiceOverrides();
  }

  clearAllWordVoiceOverrides(): void {
    clearAllWordVoiceOverrides();
  }

  getSpanishL1Mode(): boolean {
    return getSpanishL1Mode();
  }

  setSpanishL1Mode(enabled: boolean): void {
    setSpanishL1Mode(enabled);
  }

  calibratePattern(
    pattern: string,
    targetWord: string,
    contrastWord: string,
    targetRes: ListenResult,
    contrastRes: ListenResult,
    label?: string
  ): CalibrationOutcome {
    return calibratePatternFromSamples(pattern, targetWord, contrastWord, targetRes, contrastRes, label);
  }

  getPatternGrace(pattern: string): boolean {
    return getPatternGrace(pattern);
  }

  setPatternGrace(pattern: string, enabled: boolean): void {
    setPatternGrace(pattern, enabled);
  }

  getAllPatternGrace(): string[] {
    return getAllPatternGrace();
  }

  clearAllPatternGrace(): void {
    clearAllPatternGrace();
  }

  listen(
    word: Pick<WordEntry, 'w' | 'sayAlso' | 'kind' | 'azureRef' | 'pattern'>,
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
          const learnedMatch = matchesWordVoiceOverride(word.w, heard);
          if (learnedMatch) {
            resolve({
              outcome: 'match',
              engine: 'chrome',
              heard: heard.join(', '),
              note: `matched saved "${learnedMatch}" [word voice fit]`,
              diagnostic: { kind: 'pass', usedProfile: true },
            });
          } else {
            resolve({ outcome: 'miss', engine: 'chrome', heard: heard.join(', '), note: 'heard different word' });
          }
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
        if (
          matchesChromeTranscript(word.w, heard, word.sayAlso) ||
          matchesWordVoiceOverride(word.w, heard) ||
          (getSpanishL1Mode() && matchesSpanishSBlendEpenthesis(word.w, heard))
        ) {
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
    word: Pick<WordEntry, 'w' | 'sayAlso' | 'kind' | 'azureRef' | 'pattern'>,
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
          finish({
            outcome: 'nothing',
            engine: 'azure',
            heard: chromeHeard.join(', '),
            note: 'too quiet',
            diagnostic: { kind: 'quiet' },
          });
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
              finish({ outcome: 'match', engine: 'chrome', heard: chromeHeard.join(', '), note: 'Chrome fallback', diagnostic: { kind: 'pass' } });
              return;
            }
            finish({ outcome: 'again', engine: 'azure', heard: chromeHeard.join(', '), note: `worker ${res.status}` });
            return;
          }
          const json = await res.json();
          const scored = scoreAzureWord(json, word.w, word.kind === 'rune', {
            pattern: word.pattern,
          });
          const heardText = json.heard || chromeHeard.join(', ');
          const learnedWordMatch = matchesWordVoiceOverride(
            word.w,
            [json.heard || '', ...chromeHeard],
            scored.diagnostic?.observed?.heardIpa
          );
          const spanishSBlendMatch = getSpanishL1Mode()
            ? matchesSpanishSBlendEpenthesis(word.w, [json.heard || '', ...chromeHeard])
            : null;
          if (scored.outcome === 'match') {
            this.azureFailures = 0;
            finish({
              outcome: 'match',
              engine: 'azure',
              heard: heardText,
              note: scored.note,
              diagnostic: scored.diagnostic,
            });
          } else if (learnedWordMatch) {
            this.azureFailures = 0;
            finish({
              outcome: 'match',
              engine: 'azure',
              heard: heardText,
              note: `matched saved "${learnedWordMatch}" [word voice fit] (${scored.note})`,
              diagnostic: { ...scored.diagnostic, kind: 'pass', usedProfile: true },
            });
          } else if (spanishSBlendMatch) {
            this.azureFailures = 0;
            finish({
              outcome: 'match',
              engine: 'azure',
              heard: heardText,
              note: `matched s-blend "${spanishSBlendMatch}" [Spanish L1 fit] (${scored.note})`,
              diagnostic: { ...scored.diagnostic, kind: 'pass', usedProfile: true },
            });
          } else if (scored.outcome === 'nothing') {
            if (chromeMatched && word.kind !== 'rune') {
              finish({ outcome: 'match', engine: 'chrome', heard: chromeHeard.join(', '), note: 'Chrome backup', diagnostic: { kind: 'pass' } });
              return;
            }
            finish({
              outcome: 'nothing',
              engine: 'azure',
              heard: heardText,
              note: scored.note,
              diagnostic: scored.diagnostic,
            });
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
              diagnostic: { kind: 'pass' },
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
            finish({
              outcome: 'miss',
              engine: 'azure',
              heard: heardText,
              note: scored.note,
              diagnostic: scored.diagnostic,
            });
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
