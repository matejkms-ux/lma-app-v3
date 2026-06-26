# Version 1 — LMA In-App Video Sessions (Zoom Video SDK)

> **Status:** spec + scaffolding, not yet built.
> **Decision locked:** recording = **Zoom Video SDK cloud recording** is the system of record for in-app sessions (chosen over Grain). This adds the `cloud_recording` feature to the Marketplace app, a recording webhook, and recording columns on the session table.
> **Auth decision:** ship to a **trusted pilot** (option c) — accept that the token endpoint is gated only on "topic exists," protect it with unguessable topics + short JWTs (see [§7.1](#7-risks--open-decisions)), and add a join-code or real auth **before wider rollout**. This is a recorded, accepted risk, not an oversight.

Goal: embed live Companion ↔ adventurer video inside `lma-app-v3`, inside an LMA-designed shell (practice flow, sentence panel, branding) — **not** a Zoom-branded UI. Use the **Video SDK for Web** (`@zoom/videosdk`), not the Meeting SDK.

---

## 0. How this differs from the original spec (read first)

The original spec assumed a generic React/Vite + Supabase + Netlify app. The actual v3 repo differs in three ways that change the build:

| Original spec said | v3 reality | Consequence |
|---|---|---|
| Token service = **Supabase Edge Function** (Deno) | Backend is **Netlify Functions** (`netlify/functions/*.ts`, esbuild, Node Lambda). Supabase is **DB-only**. | Token + webhook are **Netlify Functions**, matching `assess-pronunciation.ts`. JWT signed with `node:crypto` — no new dependency. |
| Gate token behind **Supabase auth**; verify the user is entitled to the `topic` | v3 has **no auth** — name-select + `localStorage` (`src/session.tsx`), RLS-anon reads | There is **no verified identity to gate on**. See [§7](#7-risks--open-decisions). This is the one thing to settle before going live. |
| Keep Grain as system of record (was open) | **Decided: Zoom cloud recording** | Marketplace app needs `cloud_recording`; add webhook + recording columns; Grain is no longer canonical for these sessions. |

Stack confirmed from the repo: React 18 + Vite 5 + `react-router-dom` 6, `@supabase/supabase-js`, Netlify Functions, Tailwind. Steps are `['GRASP','HUM','SHADOW','READ','RECALL','FREESTYLE']` (`src/tokens.ts`); the five canonical steps carry audio/reps, FREESTYLE sits outside.

---

## 1. Hard rules from the SDK (do not deviate)

1. **Lifecycle order is strict:** `createClient()` → `init()` → `join()` → `getMediaStream()`. Calling `getMediaStream()` before `join()` returns `undefined` and silently fails.
2. **Use `attachVideo()`, never `renderVideo()`** (deprecated). `attachVideo()` resolves to a `VideoPlayer` element you append to the DOM.
3. **Rendering is event-driven.** Listen for `peer-video-state-change`, `user-added`, `user-removed`. On a mid-session join, existing participants' video does **not** auto-render — iterate `getAllUser()` and attach manually.
4. **JWT is server-side only.** The SDK Key/Secret must never reach the client bundle (no `VITE_` prefix).

---

## 2. Architecture

```
Browser (/session/:sessionId)                 Netlify Functions (Node)            Supabase (DB only)
┌───────────────────────────┐   POST token   ┌──────────────────────────┐        ┌───────────────┐
│ VideoSessionScreen.tsx     │ ─────────────► │ zoom-video-token.ts      │        │ video_sessions │
│  @zoom/videosdk lifecycle  │ ◄───────────── │  signs Video SDK JWT     │ ─────► │ (read topic +  │
│  + LMA practice panel      │   { signature }│  (node:crypto HS256)     │  RLS   │  entitlement)  │
└───────────────────────────┘                └──────────────────────────┘        └───────┬───────┘
            │ join(topic, signature)                                                       │ service role
            ▼                                                                              ▼
      Zoom Video SDK ───── recording.completed webhook ─────► zoom-recording-webhook.ts ──► UPDATE recording_*
```

Files this spec adds:

- `supabase/migrations/<ts>_video_sessions.sql` — session + recording schema
- `netlify/functions/zoom-video-token.ts` — JWT issuer
- `netlify/functions/zoom-recording-webhook.ts` — recording system-of-record sync
- `src/lib/zoom.ts` — client token fetch
- `src/screens/VideoSessionScreen.tsx` — the room (named to avoid colliding with `src/session.tsx`, which is the *who-is-signed-in* provider)
- `public/_headers` — **path-scoped** cross-origin isolation (see [§5](#5-hd-video--cross-origin-isolation))
- one route line in `src/App.tsx`

Secrets (Netlify env, **never** `VITE_`):
`ZOOM_VIDEO_SDK_KEY`, `ZOOM_VIDEO_SDK_SECRET`, `ZOOM_WEBHOOK_SECRET_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

---

## 3. Session + recording schema

`users.id` is **TEXT** in v3 (migration `20260620202513`), so the foreign keys are text.

```sql
-- supabase/migrations/<ts>_video_sessions.sql
-- In-app video sessions. `topic` is the deterministic join key shared by both
-- parties (lma-{id}). Zoom cloud recording is the system of record for the
-- session video, so the recording_* columns are filled by the recording webhook.

create extension if not exists "pgcrypto";

create table if not exists public.video_sessions (
  id            uuid primary key default gen_random_uuid(),
  topic         text unique not null,                 -- == client.join() topic == JWT tpc
  companion_id  text references public.users(id),
  adventurer_id text references public.users(id),
  lesson_code   text,                                 -- optional: lesson the panel loads
  status        text not null default 'scheduled'
                  check (status in ('scheduled','live','ended','cancelled')),

  -- Zoom cloud recording (system of record for in-app sessions)
  recording_status       text not null default 'none'
                  check (recording_status in ('none','recording','processing','available','failed')),
  recording_url          text,                        -- play URL once Zoom finishes processing
  recording_file_id      text,                        -- Zoom recording asset id
  recording_started_at   timestamptz,
  recording_completed_at timestamptz,

  created_at    timestamptz not null default now()
);

-- topic is derived as 'lma-' || id; keep it stable and unique.
create index if not exists video_sessions_companion_idx  on public.video_sessions (companion_id);
create index if not exists video_sessions_adventurer_idx on public.video_sessions (adventurer_id);

alter table public.video_sessions enable row level security;

-- Read policy mirrors the rest of v3 (anon read; tighten when auth lands — §7).
create policy "video_sessions readable" on public.video_sessions
  for select using (true);
-- No anon insert/update: rows are created by admin tooling / service role only.
```

`topic` is deterministic: `lma-{video_sessions.id}`. Both parties join the same `topic`; the JWT's `tpc` claim must match it exactly.

---

## 4. Netlify Functions

### 4a. `netlify/functions/zoom-video-token.ts` — JWT issuer

Signs a Video SDK JWT with `node:crypto` (HS256) — no `jsonwebtoken` dependency. Mirrors the `handler` / `json()` style of `assess-pronunciation.ts`.

```ts
// netlify/functions/zoom-video-token.ts
// Issues a Zoom Video SDK JWT. Key/Secret live ONLY here via process.env and
// never reach the client. role 1 = host/Companion (can start cloud recording),
// role 0 = participant/adventurer.
//
// ⚠️ ENTITLEMENT: v3 has no auth yet, so this CANNOT verify *who* is asking.
// Today it only verifies the topic exists. See spec §7 before exposing publicly.
import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

function signVideoSdkJwt(payload: Record<string, unknown>, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encHeader = b64url(JSON.stringify(header));
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

  // Entitlement check (weak until auth lands): the topic must be a known session.
  const supaUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supaUrl && serviceKey) {
    const admin = createClient(supaUrl, serviceKey);
    const { data, error } = await admin
      .from('video_sessions')
      .select('id')
      .eq('topic', topic)
      .maybeSingle();
    if (error) return json(500, { error: 'Session lookup failed' });
    if (!data) return json(404, { error: 'Unknown session topic' });
  }

  const iat = Math.floor(Date.now() / 1000) - 30;     // small clock-skew buffer
  const exp = iat + 60 * 60 * 2;                        // 2h session ceiling

  const jwtPayload = {
    app_key: sdkKey,
    tpc: topic,                                        // MUST equal client.join() topic
    role_type: role,                                   // 1 host (Companion), 0 participant
    version: 1,
    iat,
    exp,
    user_identity: userIdentity ?? undefined,
    // Cloud recording (system of record): allow the host to start it.
    cloud_recording_option: 1,
    cloud_recording_election: 0,
  };

  return json(200, { signature: signVideoSdkJwt(jwtPayload, sdkSecret) });
};
```

### 4b. `netlify/functions/zoom-recording-webhook.ts` — make Zoom canonical

Handles Zoom's **URL validation** challenge and the **`recording.completed`** event, verifying the `x-zm-signature` HMAC, then writes the play URL back to `video_sessions`. This is what makes Zoom the system of record.

```ts
// netlify/functions/zoom-recording-webhook.ts
// Receives Zoom Video SDK recording webhooks and records the asset on the
// session row. Validates the x-zm-signature HMAC; answers the url_validation
// challenge. Requires SUPABASE_SERVICE_ROLE_KEY (writes through RLS).
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
  try { body = JSON.parse(raw); } catch { return json(400, { error: 'Invalid JSON' }); }

  // 1) Zoom endpoint URL validation handshake.
  if (body.event === 'endpoint.url_validation') {
    const plainToken = body.payload?.plainToken ?? '';
    const encryptedToken = createHmac('sha256', secret).update(plainToken).digest('hex');
    return json(200, { plainToken, encryptedToken });
  }

  // 2) Verify signature: v0:{timestamp}:{rawBody} -> HMAC-SHA256 -> "v0=<hex>".
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
      await admin
        .from('video_sessions')
        .update({
          recording_status: 'available',
          recording_url: video?.play_url ?? video?.download_url ?? null,
          recording_file_id: video?.id ?? null,
          recording_completed_at: new Date().toISOString(),
        })
        .eq('topic', topic);
    }
  }

  return json(200, { ok: true });
};
```

Register the webhook URL (`https://<site>/.netlify/functions/zoom-recording-webhook`) and subscribe to **Recording → recording.completed** (and optionally `recording.started`) in the Marketplace app's Feature/Event Subscriptions.

---

## 5. HD video / cross-origin isolation

720p/1080p needs `SharedArrayBuffer`, which requires cross-origin isolation (`COOP` + `COEP`). **The catch is real for v3:** the app fetches lesson audio from Supabase Storage and TTS/ElevenLabs cross-origin. Blanket `Cross-Origin-Embedder-Policy: require-corp` would block those unless every cross-origin resource sends CORP headers — it would break the existing practice player.

**Two mitigations, applied together:**

1. **Scope isolation to the session route only** so the rest of the app is untouched.
2. **Use `credentialless`** instead of `require-corp` — it allows cross-origin resources without requiring them to send CORP, by dropping credentials. Safer for Supabase Storage / ElevenLabs / fonts.

```
# public/_headers   (append; keeps existing _redirects untouched)
/session/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: credentialless
```

> If a cross-origin asset still fails to load under `credentialless`, fall back to running the room at **360p without isolation headers** (`stream.isSupportHDVideo()` returns false → request 360p). Test the existing player under these headers **before** committing — this is the most likely thing to break the live app.

---

## 6. React room

### 6a. `src/lib/zoom.ts` — token fetch

```ts
// src/lib/zoom.ts
export const topicForSession = (sessionId: string) => `lma-${sessionId}`;

export async function fetchZoomSignature(topic: string, role: 0 | 1, userIdentity?: string): Promise<string> {
  const res = await fetch('/.netlify/functions/zoom-video-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, role, userIdentity }),
  });
  if (!res.ok) throw new Error(`Token request failed (${res.status})`);
  const { signature } = (await res.json()) as { signature: string };
  return signature;
}
```

### 6b. `src/screens/VideoSessionScreen.tsx` — manual lifecycle

Pick **one** style and stay consistent. This is the manual `useEffect` pattern (no extra dep beyond `@zoom/videosdk`). The official `@zoom/videosdk-react` hooks (`useSession`, `useSessionUsers`, `useVideoState`) are the alternative if the team prefers less boilerplate.

```tsx
// src/screens/VideoSessionScreen.tsx
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import ZoomVideo, { type VideoClient, type Stream } from '@zoom/videosdk';
import { useSession } from '../session';
import { fetchZoomSignature, topicForSession } from '../lib/zoom';
import { STEP_CONFIG } from '../practice/steps';
import { STEPS } from '../tokens';

export default function VideoSessionScreen() {
  const { sessionId = '' } = useParams();
  const { user } = useSession();
  const clientRef = useRef<typeof VideoClient | null>(null);
  const streamRef = useRef<typeof Stream | null>(null);
  const selfRef = useRef<HTMLDivElement>(null);
  const peersRef = useRef<HTMLDivElement>(null);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // #1 create + init; destroy on unmount.
  useEffect(() => {
    const client = ZoomVideo.createClient();
    clientRef.current = client;
    void client.init('en-US', 'Global', { patchJsMedia: true });
    return () => { ZoomVideo.destroyClient(); };
  }, []);

  // #2 fetch JWT -> join -> getMediaStream -> start own video/audio.
  useEffect(() => {
    if (!user || !sessionId) return;
    const client = clientRef.current!;
    let cancelled = false;

    (async () => {
      try {
        const topic = topicForSession(sessionId);
        // role: Companion = host (1), adventurer = participant (0).
        const role: 0 | 1 = user.role === 'companion' ? 1 : 0; // adjust to your User model
        const signature = await fetchZoomSignature(topic, role, user.id);
        await client.join(topic, signature, user.name ?? user.id);
        if (cancelled) return;

        const stream = client.getMediaStream(); // ONLY valid after join()
        streamRef.current = stream;
        await stream.startAudio();
        await stream.startVideo();

        // Attach own video.
        const me = client.getCurrentUserInfo();
        const myEl = await stream.attachVideo(me.userId, 3 /* VideoQuality_720P */);
        selfRef.current?.appendChild(myEl as unknown as Node);

        // Render anyone already in the room (mid-session join won't auto-fire).
        for (const u of client.getAllUser()) {
          if (u.userId !== me.userId && u.bVideoOn) {
            const el = await stream.attachVideo(u.userId, 2 /* 360P */);
            peersRef.current?.appendChild(el as unknown as Node);
          }
        }
        setJoined(true);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();

    return () => { cancelled = true; void client.leave(); };
  }, [user, sessionId]);

  // #3 event-driven render; remove listeners on cleanup.
  useEffect(() => {
    const client = clientRef.current!;
    const stream = () => streamRef.current!;

    const onPeerVideo = async (p: { action: string; userId: number }) => {
      if (p.action === 'Start') {
        const el = await stream().attachVideo(p.userId, 2);
        peersRef.current?.appendChild(el as unknown as Node);
      } else if (p.action === 'Stop') {
        await stream().detachVideo(p.userId);
      }
    };
    const onUserRemoved = async (list: { userId: number }[]) => {
      for (const u of list) await stream().detachVideo(u.userId);
    };

    client.on('peer-video-state-change', onPeerVideo);
    client.on('user-added', () => {/* video arrives via peer-video-state-change */});
    client.on('user-removed', onUserRemoved);
    client.on('connection-change', (p: { state: string }) => {
      if (p.state === 'Closed') setJoined(false);
    });
    return () => {
      client.off('peer-video-state-change', onPeerVideo);
      client.off('user-removed', onUserRemoved);
    };
  }, []);

  if (error) return <div className="p-8 text-coral">Video session error: {error}</div>;

  return (
    <div className="grid h-screen grid-cols-[1fr,minmax(360px,38%)]">
      {/* Video region — LMA owns this layout, not Zoom. */}
      <section className="relative bg-ink">
        <div ref={peersRef} className="h-full w-full" />
        <div ref={selfRef} className="absolute bottom-4 right-4 h-40 w-56 overflow-hidden rounded-xl" />
        {!joined && <div className="absolute inset-0 grid place-items-center text-mist">Connecting…</div>}
      </section>

      {/* LMA practice panel — the five-step flow lives here. */}
      <aside className="overflow-y-auto border-l border-line p-6">
        <h2 className="font-display text-lg">Practice</h2>
        <ol className="mt-4 space-y-2">
          {STEPS.filter((s) => s !== 'FREESTYLE').map((s) => (
            <li key={s} className="text-sm text-slate">
              <span className="font-medium">{STEP_CONFIG[s].title}</span> — {STEP_CONFIG[s].instruction}
            </li>
          ))}
        </ol>
        {/* Phase 7: command-channel step-sync goes here. */}
      </aside>
    </div>
  );
}
```

> The `user.role` / `user.name` references are placeholders — wire them to the real `User` model in `src/data/mock.ts`. Tailwind class names (`ink`, `mist`, `coral`, `line`, `slate`) are illustrative; map to the real tokens in `tailwind.config.js`.

### 6c. Route — `src/App.tsx`

```tsx
import VideoSessionScreen from './screens/VideoSessionScreen';
// …inside <Routes>:
<Route path="/session/:sessionId" element={<VideoSessionScreen />} />
```

### 6d. Dependency

```bash
npm i @zoom/videosdk
```

> **Build-gate note:** `npm run build` runs `tsc -b`, and `DEPLOY.md` gates deploys on `npm run validate`. Don't commit `VideoSessionScreen.tsx` (which imports `@zoom/videosdk`) until the package is installed, or the typecheck/build breaks for everyone.

---

## 7. Risks & open decisions

1. **Auth gap — DECIDED: trusted pilot (option c).** v3 has no auth, so the token endpoint can only check that a `topic` exists, not *who* is asking. For the pilot this is accepted, with these guardrails (build them in now, they're cheap):
   - **Unguessable topics.** `topic = lma-{uuid}` already is — never expose a session list, sequential ids, or the topic in any public/linkable surface. The session link is the capability.
   - **Short JWT lifetime.** The 2h `exp` in `zoom-video-token.ts` is the ceiling; tighten to the booked session window if you can pass it in.
   - **`recording_url` stays admin-only.** Don't surface recordings to learners while the endpoint is unauthenticated.
   - **Keep the function quiet.** No CORS for arbitrary origins; it's same-origin from the app only.

   **Before wider rollout**, replace with one of: **(a)** a short-lived single-use **session join code** verified in `zoom-video-token.ts` (low lift, no auth system), or **(b)** real Supabase auth gated on the JWT (matches the original spec's intent). Track this as a hard pre-GA item.
2. **COEP breakage** — `credentialless` + path-scoping should protect the existing player, but test Supabase Storage audio + ElevenLabs/TTS under the session headers before committing. 360p-without-isolation is the fallback.
3. **Recording cost/retention** — Zoom cloud recording has storage limits and retention settings; decide retention + whether `recording_url` is exposed to learners or admin-only. Grain is now *out* for these sessions; don't double-record.
4. **Naming** — `src/session.tsx` is the signed-in-user provider; the room is `VideoSessionScreen` / `video_sessions`. Keep these distinct.

---

## 8. Build order

1. Marketplace: create **Video SDK** app; enable **Cloud Recording**; get Key/Secret; set webhook + event subscription. Add Netlify env secrets.
2. Migration `video_sessions` + a couple of seed rows.
3. `zoom-video-token.ts` with the **pilot guardrails (§7.1)**: unguessable topics, short JWT, `recording_url` admin-only. (Join-code / real auth is a tracked pre-GA item, not a pilot blocker.)
4. Bare join/leave with own video (no panel) — prove the lifecycle.
5. Two-party render via events.
6. Wrap with the LMA practice panel + layout.
7. `public/_headers` scoped isolation + HD test (or 360p fallback).
8. `zoom-recording-webhook.ts` — confirm `recording.completed` writes `recording_url`.
9. (Optional, later) command channel (`getCommandClient`) for Companion-drives-the-step sync; live transcription; preflight diagnostics.
