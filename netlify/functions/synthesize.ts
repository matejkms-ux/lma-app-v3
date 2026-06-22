/**
 * Text-to-speech via Azure (server-side; key only in process.env). Synthesizes
 * a sentence with a chosen neural voice and returns the MP3 as base64. Used to
 * generate per-sentence reference audio (e.g. Khmer km-KH-SreymomNeural).
 *
 * Request JSON: { text, voice }   Response: { audioBase64 } | { error }
 */
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

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

  let payload: { text?: string; voice?: string };
  try {
    payload = JSON.parse(event.body ?? '{}');
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }
  const { text, voice } = payload;
  if (!text || !voice) return json(400, { error: 'text and voice are required' });

  try {
    const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
    speechConfig.speechSynthesisVoiceName = voice;
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;

    // null audio config → no speaker output; bytes come back in result.audioData.
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null as unknown as sdk.AudioConfig);

    const audio = await new Promise<ArrayBuffer>((resolve, reject) => {
      synthesizer.speakTextAsync(
        text,
        (result) => {
          synthesizer.close();
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) resolve(result.audioData);
          else reject(new Error(result.errorDetails || 'synthesis_failed'));
        },
        (err) => { synthesizer.close(); reject(err); },
      );
    });

    return json(200, { audioBase64: Buffer.from(audio).toString('base64') });
  } catch (err) {
    return json(500, { error: String(err) });
  }
};
