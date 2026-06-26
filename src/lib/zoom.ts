/**
 * Client helpers for the Zoom Video SDK session room. The JWT is fetched from a
 * Netlify Function (server-side signing) — the SDK Key/Secret never reach here.
 */

/** Deterministic join key shared by both parties (spec §2). */
export const topicForSession = (sessionId: string) => `lma-${sessionId}`;

export async function fetchZoomSignature(
  topic: string,
  role: 0 | 1,
  userIdentity?: string,
): Promise<string> {
  const res = await fetch('/.netlify/functions/zoom-video-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, role, userIdentity }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Token request failed (${res.status}) ${detail}`);
  }
  const { signature } = (await res.json()) as { signature: string };
  return signature;
}
