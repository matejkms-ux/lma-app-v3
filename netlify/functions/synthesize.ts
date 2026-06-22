/**
 * Text-to-speech via Azure (server-side; key only in process.env). Synthesizes
 * a sentence with a chosen neural voice and returns the MP3 as base64. Used to
 * generate per-sentence reference audio (e.g. Khmer km-KH-SreymomNeural).
 *
 * Request JSON: { text, voice } for a single voice, OR { ssml } to render a full
 * SSML document (multi-voice + <break> gaps — used to build the method's step
 * clips). Response: { audioBase64 } | { error }
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

  let payload: { text?: string; voice?: string; ssml?: string };
  try {
    payload = JSON.parse(event.body ?? '{}');
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }
  const { text, voice, ssml } = payload;
  if (!ssml && !(text && voice)) return json(400, { error: 'provide ssml, or text + voice' });

  try {
    const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
    if (voice) speechConfig.speechSynthesisVoiceName = voice;
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;

    // null audio config → no speaker output; bytes come back in result.audioData.
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null as unknown as sdk.AudioConfig);

    const audio = await new Promise<ArrayBuffer>((resolve, reject) => {
      const cb = (result: sdk.SpeechSynthesisResult) => {
        synthesizer.close();
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) resolve(result.audioData);
        else reject(new Error(result.errorDetails || 'synthesis_failed'));
      };
      const errCb = (err: string) => { synthesizer.close(); reject(new Error(err)); };
      if (ssml) synthesizer.speakSsmlAsync(ssml, cb, errCb);
      else synthesizer.speakTextAsync(text as string, cb, errCb);
    });

    return json(200, { audioBase64: Buffer.from(audio).toString('base64') });
  } catch (err) {
    return json(500, { error: String(err) });
  }
};
