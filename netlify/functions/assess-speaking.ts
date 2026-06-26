/**
 * Azure UNSCRIPTED pronunciation assessment (server-side) — for the Final
 * Conversation module. Unlike assess-pronunciation.ts (which scores a spoken
 * sentence against a known reference text, used by SHADOW/RECALL), this scores a
 * FREE spoken answer with no reference: it grades pronunciation + fluency, not
 * meaning. That's the right tool for open question-answers (spec: "auto-scores
 * pronunciation/fluency, not meaning").
 *
 * Request JSON: { audioBase64, locale }
 *   - audioBase64: 16 kHz, 16-bit, mono PCM (raw, little-endian), base64-encoded
 *     (same client preprocessing as assess-pronunciation).
 * Response: { fluency, pronunciation, combined, auto_stars }
 *   or { auto_unavailable: true, reason } when the locale is unsupported / errors.
 *
 * Answers can run longer than one utterance, so this uses CONTINUOUS recognition
 * and aggregates each segment's scores weighted by word count.
 */
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

/** combined = mean(accuracy, fluency). Mirrors the 50/50 weighting elsewhere. */
const ACCURACY_WEIGHT = 0.5;

/** Same supported set as scripted assessment (Thai/Khmer unsupported → manual). */
const SUPPORTED_LOCALES = new Set([
  'en-US', 'en-GB', 'en-AU', 'de-DE', 'es-ES', 'es-MX', 'fr-FR', 'it-IT',
  'ja-JP', 'ko-KR', 'pt-BR', 'pt-PT', 'zh-CN', 'zh-HK', 'nl-NL', 'ru-RU', 'pl-PL',
  'sv-SE', 'nb-NO', 'da-DK', 'fi-FI', 'tr-TR', 'ar-EG', 'hi-IN',
]);

function starsFromCombined(combined: number): number {
  if (combined >= 90) return 5;
  if (combined >= 80) return 4;
  if (combined >= 65) return 3;
  if (combined >= 50) return 2;
  return 1;
}

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const handler = async (event: { httpMethod: string; body: string | null }) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) return json(500, { error: 'Azure speech not configured' });

  let payload: { audioBase64?: string; locale?: string };
  try {
    payload = JSON.parse(event.body ?? '{}');
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }
  const { audioBase64, locale } = payload;
  if (!audioBase64 || !locale) {
    return json(400, { error: 'audioBase64 and locale are required' });
  }
  if (!SUPPORTED_LOCALES.has(locale)) {
    return json(200, { auto_unavailable: true, reason: 'locale_unsupported' });
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

    // Empty reference text → UNSCRIPTED mode (no accuracy-vs-script / completeness).
    const paConfig = new sdk.PronunciationAssessmentConfig(
      '',
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Phoneme,
      false,
    );
    paConfig.enableProsodyAssessment = true;

    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    paConfig.applyTo(recognizer);

    // Aggregate across utterances, weighting each segment by its word count.
    let accW = 0;
    let fluW = 0;
    let words = 0;

    await new Promise<void>((resolve, reject) => {
      recognizer.recognized = (_s, e) => {
        if (e.result.reason !== sdk.ResultReason.RecognizedSpeech) return;
        const pa = sdk.PronunciationAssessmentResult.fromResult(e.result);
        const w = Math.max(1, (e.result.text ?? '').trim().split(/\s+/).filter(Boolean).length);
        accW += (pa.accuracyScore ?? 0) * w;
        fluW += (pa.fluencyScore ?? 0) * w;
        words += w;
      };
      recognizer.canceled = (_s, e) => {
        if (e.reason === sdk.CancellationReason.Error) {
          recognizer.stopContinuousRecognitionAsync(() => recognizer.close());
          reject(new Error(e.errorDetails || 'canceled'));
          return;
        }
        recognizer.stopContinuousRecognitionAsync(() => { recognizer.close(); resolve(); });
      };
      recognizer.sessionStopped = () => {
        recognizer.stopContinuousRecognitionAsync(() => { recognizer.close(); resolve(); });
      };
      recognizer.startContinuousRecognitionAsync(undefined, (err) => reject(err));
    });

    if (words === 0) {
      return json(200, { auto_unavailable: true, reason: 'no_result' });
    }

    const pronunciation = Math.round(accW / words);
    const fluency = Math.round(fluW / words);
    const combined = Math.round(pronunciation * ACCURACY_WEIGHT + fluency * (1 - ACCURACY_WEIGHT));
    return json(200, {
      fluency,
      pronunciation,
      combined,
      auto_stars: starsFromCombined(combined),
    });
  } catch (err) {
    return json(200, { auto_unavailable: true, reason: 'azure_error', detail: String(err) });
  }
};
