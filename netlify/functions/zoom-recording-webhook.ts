/**
 * Receives Zoom Video SDK recording webhooks and records the asset on the
 * session row — this is what makes Zoom cloud recording the system of record
 * (spec "Version 1 - LMA Video SDK Build Spec" §4b). Validates the
 * x-zm-signature HMAC; answers the url_validation challenge.
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY (writes bypass RLS) + ZOOM_WEBHOOK_SECRET_TOKEN.
 * Register the URL (https://<site>/.netlify/functions/zoom-recording-webhook) and
 * subscribe to recording.completed in the Marketplace app's Event Subscriptions.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const handler = async (event: {
  httpMethod: string;
  body: string | null;
  headers: Record<string, string | undefined>;
}) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const secret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;
  if (!secret) return json(500, { error: 'Webhook secret not configured' });

  const raw = event.body ?? '';
  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  // 1) Zoom endpoint URL-validation handshake.
  if (body.event === 'endpoint.url_validation') {
    const plainToken = body.payload?.plainToken ?? '';
    const encryptedToken = createHmac('sha256', secret).update(plainToken).digest('hex');
    return json(200, { plainToken, encryptedToken });
  }

  // 2) Verify signature: "v0:{timestamp}:{rawBody}" -> HMAC-SHA256 -> "v0=<hex>".
  const ts = event.headers['x-zm-request-timestamp'] ?? '';
  const sig = event.headers['x-zm-signature'] ?? '';
  const expected = 'v0=' + createHmac('sha256', secret).update(`v0:${ts}:${raw}`).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return json(401, { error: 'Bad signature' });
  }

  // 3) recording.completed -> store the play URL against the matching topic.
  if (body.event === 'recording.completed') {
    const obj = body.payload?.object ?? {};
    const topic: string | undefined = obj.topic;
    const files: any[] = obj.recording_files ?? [];
    const video = files.find((f) => f.file_type === 'MP4') ?? files[0];

    const supaUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (topic && supaUrl && serviceKey) {
      const admin = createClient(supaUrl, serviceKey);
      // Upsert by topic: sessions aren't pre-created (topics are derived from
      // usernames on the fly), so insert the row if it doesn't exist yet.
      await admin
        .from('video_sessions')
        .upsert(
          {
            topic,
            status: 'ended',
            recording_status: 'available',
            recording_url: video?.play_url ?? video?.download_url ?? null,
            recording_file_id: video?.id ?? null,
            recording_completed_at: new Date().toISOString(),
          },
          { onConflict: 'topic' },
        );
    }
  }

  return json(200, { ok: true });
};
