/**
 * Transcription-based scoring (server-side; spec fallback for locales Azure
 * pronunciation assessment doesn't cover, e.g. Khmer). Transcribes the learner's
 * audio with Azure speech-to-text, then compares the transcript to the reference
 * text by normalized character similarity → stars. Captures "did they say the
 * right words", not fine pronunciation.
 *
 * Request JSON: { audioBase64 (16 kHz mono 16-bit PCM), referenceText, locale }
 * Response: { word_accuracy, pronunciation, combined, auto_stars, transcript }
 *   or { auto_unavailable: true, reason }.
 */
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

function starsFromCombined(c: number): number {
  if (c >= 90) return 5;
  if (c >= 80) return 4;
  if (c >= 65) return 3;
  if (c >= 50) return 2;
  return 1;
}

/** Strip whitespace + common punctuation (Latin + Khmer) so we compare content. */
function normalize(s: string): string {
  return s.replace(/[\s.,!?;:"'’‘“”…។៕៘៚៖]/gu, '').toLowerCase();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let cur = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

function similarity(transcript: string, reference: string): number {
  const a = normalize(transcript), b = normalize(reference);
  if (!a && !b) return 100;
  const dist = levenshtein(a, b);
  return Math.max(0, Math.min(100, (1 - dist / Math.max(a.length, b.length)) * 100));
}

export const handler = async (event: { httpMethod: string; body: string | null }) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) return json(500, { error: 'Azure speech not configured' });

  let payload: { audioBase64?: string; referenceText?: string; locale?: string };
  try {
    payload = JSON.parse(event.body ?? '{}');
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }
  const { audioBase64, referenceText, locale } = payload;
  if (!audioBase64 || !referenceText || !locale) {
    return json(400, { error: 'audioBase64, referenceText and locale are required' });
  }

  try {
    const pcm = Buffer.from(audioBase64, 'base64');
    const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
    speechConfig.speechRecognitionLanguage = locale;

    const format = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
    const pushStream = sdk.AudioInputStream.createPushStream(format);
    pushStream.write(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength));
    pushStream.close();
    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    const result = await new Promise<sdk.SpeechRecognitionResult>((resolve, reject) => {
      recognizer.recognizeOnceAsync(
        (r) => { recognizer.close(); resolve(r); },
        (e) => { recognizer.close(); reject(e); },
      );
    });

    if (result.reason !== sdk.ResultReason.RecognizedSpeech || !result.text) {
      const detail =
        result.reason === sdk.ResultReason.Canceled
          ? sdk.CancellationDetails.fromResult(result).errorDetails
          : 'no_match';
      return json(200, { auto_unavailable: true, reason: 'no_result', detail });
    }

    const score = similarity(result.text, referenceText);
    return json(200, {
      word_accuracy: score,
      pronunciation: score,
      combined: score,
      auto_stars: starsFromCombined(score),
      transcript: result.text,
    });
  } catch (err) {
    return json(200, { auto_unavailable: true, reason: 'azure_error', detail: String(err) });
  }
};
