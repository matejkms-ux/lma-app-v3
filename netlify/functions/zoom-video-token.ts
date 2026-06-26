/**
 * Issues a Zoom Video SDK JWT (spec: "Version 1 - LMA Video SDK Build Spec" §4a).
 * Key/Secret live ONLY here via process.env and never reach the client.
 * role 1 = host/Companion (can start cloud recording), role 0 = participant.
 *
 * ⚠️ AUTH: v3 has no auth (pilot decision), so this CANNOT verify *who* is asking.
 * Topics are derived from usernames on the fly (not pre-created), so there is NO
 * DB entitlement check here — it just signs. Replace with a join-code or real auth
 * before wider rollout — see spec §7.1.
 */
import { createHmac } from 'node:crypto';

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

function signVideoSdkJwt(payload: Record<string, unknown>, secret: string): string {
  const encHeader = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const encPayload = b64url(JSON.stringify(payload));
  const signature = b64url(createHmac('sha256', secret).update(`${encHeader}.${encPayload}`).digest());
  return `${encHeader}.${encPayload}.${signature}`;
}

export const handler = async (event: { httpMethod: string; body: string | null }) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const sdkKey = process.env.ZOOM_VIDEO_SDK_KEY;
  const sdkSecret = process.env.ZOOM_VIDEO_SDK_SECRET;
  if (!sdkKey || !sdkSecret) return json(500, { error: 'Zoom Video SDK not configured' });

  let payload: { topic?: string; role?: number; userIdentity?: string };
  try {
    payload = JSON.parse(event.body ?? '{}');
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }
  const { topic, role, userIdentity } = payload;
  if (!topic || (role !== 0 && role !== 1)) {
    return json(400, { error: 'topic and role (0|1) are required' });
  }

  const iat = Math.floor(Date.now() / 1000) - 30; // small clock-skew buffer
  const exp = iat + 60 * 60 * 2; // 2h ceiling

  const signature = signVideoSdkJwt(
    {
      app_key: sdkKey,
      tpc: topic, // MUST equal client.join() topic
      role_type: role, // 1 host (Companion), 0 participant
      version: 1,
      iat,
      exp,
      user_identity: userIdentity ?? undefined,
      cloud_recording_option: 1, // allow host to start cloud recording (system of record)
      cloud_recording_election: 0,
    },
    sdkSecret,
  );

  return json(200, { signature });
};
