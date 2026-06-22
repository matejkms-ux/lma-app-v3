/**
 * Azure Pronunciation Assessment (server-side; spec §2). The Azure key is read
 * ONLY here via process.env.AZURE_SPEECH_KEY and never reaches the client.
 *
 * Request JSON: { audioBase64, referenceText, locale }
 *   - audioBase64: 16 kHz, 16-bit, mono PCM (raw, little-endian), base64-encoded.
 *     The client decodes its recording to this format so the function needs no
 *     native transcoder (GStreamer isn't available in the Lambda runtime).
 * Response: { word_accuracy, pronunciation, combined, auto_stars }
 *   or { auto_unavailable: true, reason } when the locale is unsupported / errors.
 */
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

/** Combined-score weighting (spec §2: 50/50, tunable). Mirrors src/lib/scoring.ts. */
const WORD_ACCURACY_WEIGHT = 0.5;

/**
 * Locales Azure pronunciation assessment supports (subset; Accuracy + Completeness
 * are available for all of these). Thai/Khmer are NOT covered → manual-only.
 */
const SUPPORTED_LOCALES = new Set([
  'en-US', 'en-GB', 'en-AU', 'de-DE', 'es-ES', 'es-MX', 'fr-FR', 'it-IT',
  'ja-JP', 'ko-KR', 'pt-BR', 'zh-CN', 'zh-HK', 'nl-NL', 'ru-RU', 'pl-PL',
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

  // Unsupported locale (e.g. Thai, Khmer) → manual-only, never fail the flow.
  if (!SUPPORTED_LOCALES.has(locale)) {
    return json(200, { auto_unavailable: true, reason: 'locale_unsupported' });
  }

  try {
    const pcm = Buffer.from(audioBase64, 'base64');

    const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
    speechConfig.speechRecognitionLanguage = locale;

    // 16 kHz, 16-bit, mono PCM — matches what the client sends.
    const format = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
    const pushStream = sdk.AudioInputStream.createPushStream(format);
    pushStream.write(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength));
    pushStream.close();
    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

    const paConfig = new sdk.PronunciationAssessmentConfig(
      referenceText,
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Phoneme,
      false,
    );

    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    paConfig.applyTo(recognizer);

    const result = await new Promise<sdk.SpeechRecognitionResult>((resolve, reject) => {
      recognizer.recognizeOnceAsync(
        (r) => { recognizer.close(); resolve(r); },
        (e) => { recognizer.close(); reject(e); },
      );
    });

    if (result.reason !== sdk.ResultReason.RecognizedSpeech) {
      // No speech recognized (silence / format / unsupported) — advisory unavailable.
      const details =
        result.reason === sdk.ResultReason.Canceled
          ? sdk.CancellationDetails.fromResult(result).errorDetails
          : 'no_match';
      return json(200, { auto_unavailable: true, reason: 'no_result', detail: details });
    }

    const pa = sdk.PronunciationAssessmentResult.fromResult(result);
    const pronunciation = pa.accuracyScore;          // 0–100 (pronunciation)
    const word_accuracy = pa.completenessScore;       // 0–100 (transcript vs reference)
    const combined = word_accuracy * WORD_ACCURACY_WEIGHT + pronunciation * (1 - WORD_ACCURACY_WEIGHT);
    return json(200, {
      word_accuracy,
      pronunciation,
      combined,
      auto_stars: starsFromCombined(combined),
    });
  } catch (err) {
    return json(200, { auto_unavailable: true, reason: 'azure_error', detail: String(err) });
  }
};
