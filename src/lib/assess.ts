/**
 * Client side of pronunciation assessment. Decodes a recorded take to 16 kHz
 * mono 16-bit PCM in the browser (so the Netlify function needs no native
 * transcoder) and POSTs it to the server-side function, which holds the Azure
 * key. Returns the scores or an "unavailable" flag — never throws into the UI.
 */

/** Map our uppercase language to a BCP-47 locale for Azure. */
export const LOCALE_BY_LANGUAGE: Record<string, string> = {
  GERMAN: 'de-DE',
  JAPANESE: 'ja-JP',
  SPANISH: 'es-ES',
  PORTUGUESE: 'pt-PT',
  FRENCH: 'fr-FR',
  MANDARIN: 'zh-CN',
  ARABIC: 'ar-EG',
  HEBREW: 'he-IL', // no Azure pronunciation assessment → SHADOW/RECALL fall back to STT word-accuracy (like Khmer)
  THAI: 'th-TH', // not supported by Azure → function returns auto_unavailable
  KHMER: 'km-KH', // not supported → auto_unavailable
};

/** L1 here is English. */
export const L1_LOCALE = 'en-US';

/**
 * What to assess for a judged step (decision: GRASP scores the spoken English
 * meaning against L1 in en-US — so it's scorable for every learner; SHADOW and
 * RECALL score the spoken L2 against the target text/locale).
 */
export function assessTargetForStep(
  step: 'GRASP' | 'SHADOW' | 'RECALL',
  sentence: { l1: string; l2: string },
  language: string,
): { referenceText: string; locale: string } {
  if (step === 'GRASP') return { referenceText: sentence.l1, locale: L1_LOCALE };
  return { referenceText: sentence.l2, locale: LOCALE_BY_LANGUAGE[language] ?? 'en-US' };
}

export interface AssessResult {
  word_accuracy: number;
  pronunciation: number;
  combined: number;
  auto_stars: number;
}
export interface AssessUnavailable {
  auto_unavailable: true;
  reason: string;
}

/** Unscripted speaking score (Final Conversation): pronunciation + fluency, no reference. */
export interface SpeakingResult {
  fluency: number;
  pronunciation: number;
  combined: number;
  auto_stars: number;
}

export function isUnavailable(
  r: AssessResult | SpeakingResult | AssessUnavailable,
): r is AssessUnavailable {
  return (r as AssessUnavailable).auto_unavailable === true;
}

async function blobToPcm16kMono(blob: Blob): Promise<ArrayBuffer> {
  const arrayBuf = await blob.arrayBuffer();
  const AC: typeof AudioContext =
    window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(arrayBuf);
  } finally {
    void ctx.close();
  }

  // Downmix to mono.
  const channels = decoded.numberOfChannels;
  const len = decoded.length;
  const mono = new Float32Array(len);
  for (let c = 0; c < channels; c++) {
    const data = decoded.getChannelData(c);
    for (let i = 0; i < len; i++) mono[i] += data[i] / channels;
  }

  // Resample to 16 kHz via OfflineAudioContext.
  const targetRate = 16000;
  const frames = Math.max(1, Math.ceil((len * targetRate) / decoded.sampleRate));
  const offline = new OfflineAudioContext(1, frames, targetRate);
  const srcBuf = offline.createBuffer(1, len, decoded.sampleRate);
  srcBuf.copyToChannel(mono, 0);
  const node = offline.createBufferSource();
  node.buffer = srcBuf;
  node.connect(offline.destination);
  node.start();
  const rendered = await offline.startRendering();
  const f32 = rendered.getChannelData(0);

  // Float32 → 16-bit PCM little-endian.
  const i16 = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]));
    i16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return i16.buffer;
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Score a recorded take against a reference text in a given locale (use
 * assessTargetForStep to derive both). Unsupported locales resolve to
 * auto_unavailable server-side. Never throws, so manual scoring is unaffected.
 */
export async function assessPronunciation(
  blob: Blob,
  referenceText: string,
  locale: string,
): Promise<AssessResult | AssessUnavailable> {
  try {
    const pcm = await blobToPcm16kMono(blob);
    const res = await fetch('/.netlify/functions/assess-pronunciation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64: toBase64(pcm), referenceText, locale }),
    });
    if (!res.ok) return { auto_unavailable: true, reason: `http_${res.status}` };
    return (await res.json()) as AssessResult | AssessUnavailable;
  } catch {
    return { auto_unavailable: true, reason: 'client_error' };
  }
}

/**
 * Transcription-based scoring (fallback for locales pronunciation assessment
 * doesn't cover, e.g. Khmer): Azure speech-to-text transcribes the take and the
 * server scores transcript-vs-reference similarity. Captures word accuracy, not
 * fine pronunciation. Same result shape as assessPronunciation.
 */
export async function transcribeScore(
  blob: Blob,
  referenceText: string,
  locale: string,
): Promise<AssessResult | AssessUnavailable> {
  try {
    const pcm = await blobToPcm16kMono(blob);
    const res = await fetch('/.netlify/functions/transcribe-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64: toBase64(pcm), referenceText, locale }),
    });
    if (!res.ok) return { auto_unavailable: true, reason: `http_${res.status}` };
    return (await res.json()) as AssessResult | AssessUnavailable;
  } catch {
    return { auto_unavailable: true, reason: 'client_error' };
  }
}

/**
 * Score a FREE spoken answer (Final Conversation) — unscripted pronunciation +
 * fluency in the given locale, no reference text. Grades how it's said, not what
 * it means. Unsupported locales (Thai/Khmer) resolve to auto_unavailable, so the
 * UI falls back to a self-rating. Never throws.
 */
export async function assessSpeaking(
  blob: Blob,
  locale: string,
): Promise<SpeakingResult | AssessUnavailable> {
  try {
    const pcm = await blobToPcm16kMono(blob);
    const res = await fetch('/.netlify/functions/assess-speaking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64: toBase64(pcm), locale }),
    });
    if (!res.ok) return { auto_unavailable: true, reason: `http_${res.status}` };
    return (await res.json()) as SpeakingResult | AssessUnavailable;
  } catch {
    return { auto_unavailable: true, reason: 'client_error' };
  }
}
