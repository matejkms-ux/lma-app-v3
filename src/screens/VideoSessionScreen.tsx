import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import ZoomVideo, { VideoQuality } from '@zoom/videosdk';
import { useSession } from '../session';
import { fetchZoomSignature, topicForSession } from '../lib/zoom';
import { STEP_CONFIG } from '../practice/steps';
import { STEPS } from '../tokens';

// The Zoom SDK registers these custom elements; declare them for JSX/TS.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'video-player-container': any;
      'video-player': any;
    }
  }
}

/**
 * attachVideo returns a <video-player> custom element. It only renders inside a
 * <video-player-container> (Safari is strict about this) — append it there and
 * size it to fill.
 */
function mountVideo(container: HTMLElement | null, el: unknown) {
  if (container && el instanceof HTMLElement) {
    el.style.width = '100%';
    el.style.height = '100%';
    container.appendChild(el);
  }
}

/**
 * VideoSessionScreen — the in-app live room (spec "Version 1 - LMA Video SDK
 * Build Spec" §6). Named to avoid colliding with src/session.tsx (the signed-in
 * user provider). Manual lifecycle: createClient → init → join → getMediaStream,
 * then event-driven peer rendering.
 *
 * Role for the PILOT: derived from ?host=1 (Companion = host), since v3 has no
 * role field on the user model yet. Replace with a real role once auth lands.
 */
export default function VideoSessionScreen() {
  const { sessionId = '' } = useParams();
  const [search] = useSearchParams();
  const { user } = useSession();
  // Practice panel is hidden by default (video-only). Add ?panel=1 to show it.
  const showPanel = search.get('panel') === '1';

  const clientRef = useRef<ReturnType<typeof ZoomVideo.createClient> | null>(null);
  const streamRef = useRef<ReturnType<NonNullable<typeof clientRef.current>['getMediaStream']> | null>(null);
  const selfRef = useRef<HTMLElement>(null);
  const peersRef = useRef<HTMLElement>(null);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoOn, setVideoOn] = useState(true);
  const [audioMuted, setAudioMuted] = useState(false);
  const [mediaNote, setMediaNote] = useState<string | null>(null);
  const joinedOnceRef = useRef(false);
  // Unique per tab so two opens never collide as the same Zoom identity
  // (duplicate identity → forced reconnect / OPERATION_CANCELLED).
  const identityRef = useRef(
    (user?.id ?? 'guest') + '-' + Math.random().toString(36).slice(2, 8),
  );

  // #1 create + init; destroy on unmount.
  useEffect(() => {
    const client = ZoomVideo.createClient();
    clientRef.current = client;
    void client.init('en-US', 'Global', { patchJsMedia: true });
    return () => {
      ZoomVideo.destroyClient();
    };
  }, []);

  // #2 fetch JWT → join → getMediaStream → start own video/audio.
  // Joins EXACTLY ONCE per mount (guarded) so re-renders never re-trigger join.
  useEffect(() => {
    if (!sessionId) return;
    const client = clientRef.current;
    if (!client) return;
    if (joinedOnceRef.current) return;
    joinedOnceRef.current = true;
    let cancelled = false;

    (async () => {
      try {
        const topic = topicForSession(sessionId);
        const role: 0 | 1 = search.get('host') === '1' ? 1 : 0;
        const userName = user?.calledName ?? user?.name ?? 'Guest';
        const signature = await fetchZoomSignature(topic, role, identityRef.current);
        await client.join(topic, signature, userName);
        if (cancelled) return;

        const stream = client.getMediaStream(); // valid only AFTER join()
        streamRef.current = stream;
        const me = client.getCurrentUserInfo();

        // We're connected — show the room immediately so a slow/blocked camera
        // never leaves the user stuck on "Connecting…".
        setJoined(true);

        // Mic (non-fatal): a failure just means start muted.
        try {
          await stream.startAudio();
        } catch {
          setAudioMuted(true);
          setMediaNote('Mic unavailable — check the browser mic permission, then tap 🎤.');
        }

        // Camera (non-fatal): commonly fails when another app/tab is holding the
        // camera (e.g. a Safari session still open) or permission is blocked.
        try {
          await stream.startVideo();
          const myEl = await stream.attachVideo(me.userId, VideoQuality.Video_360P);
          mountVideo(selfRef.current, myEl);
        } catch {
          setVideoOn(false);
          setMediaNote(
            'Camera unavailable — another app or browser tab may be using it (close other sessions), or permission is blocked. Tap 📹 to retry.',
          );
        }

        // Render anyone already in the room (mid-join won't fire the event).
        for (const u of client.getAllUser()) {
          if (u.userId !== me.userId && u.bVideoOn) {
            const el = await stream.attachVideo(u.userId, VideoQuality.Video_360P);
            mountVideo(peersRef.current, el);
          }
        }
      } catch (e) {
        // Zoom SDK errors are plain objects ({ type, reason, errorCode }) — String()
        // would render "[object Object]", so surface the real detail.
        const msg =
          e instanceof Error
            ? e.message
            : e && typeof e === 'object'
              ? JSON.stringify(e)
              : String(e);
        if (!cancelled) setError(msg);
      }
    })();

    return () => {
      cancelled = true;
      void client.leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // #3 event-driven render; remove listeners on cleanup.
  useEffect(() => {
    const client = clientRef.current;
    if (!client) return;
    const stream = () => streamRef.current;

    const onPeerVideo = async (p: { action: string; userId: number }) => {
      const s = stream();
      if (!s) return;
      if (p.action === 'Start') {
        const el = await s.attachVideo(p.userId, VideoQuality.Video_360P);
        mountVideo(peersRef.current, el);
      } else if (p.action === 'Stop') {
        await s.detachVideo(p.userId);
      }
    };
    const onUserRemoved = async (list: Array<{ userId: number }>) => {
      const s = stream();
      if (!s) return;
      for (const u of list) await s.detachVideo(u.userId);
    };
    const onConnection = (p: { state: string }) => {
      if (p.state === 'Closed') setJoined(false);
    };

    client.on('peer-video-state-change', onPeerVideo);
    client.on('user-removed', onUserRemoved);
    client.on('connection-change', onConnection);
    return () => {
      client.off('peer-video-state-change', onPeerVideo);
      client.off('user-removed', onUserRemoved);
      client.off('connection-change', onConnection);
    };
  }, []);

  async function toggleVideo() {
    const s = streamRef.current;
    const c = clientRef.current;
    if (!s || !c) return;
    if (videoOn) {
      await s.stopVideo();
      setVideoOn(false);
    } else {
      try {
        await s.startVideo();
        const me = c.getCurrentUserInfo();
        if (selfRef.current) selfRef.current.innerHTML = ''; // avoid a stale duplicate tile
        const el = await s.attachVideo(me.userId, VideoQuality.Video_360P);
        mountVideo(selfRef.current, el);
        setVideoOn(true);
        setMediaNote(null);
      } catch {
        setMediaNote('Still can’t start the camera — close any other app/tab using it, then try again.');
      }
    }
  }

  async function toggleAudio() {
    const s = streamRef.current;
    if (!s) return;
    if (audioMuted) {
      try {
        await s.unmuteAudio();
        setAudioMuted(false);
        setMediaNote(null);
      } catch {
        await s.startAudio().catch(() => undefined); // mic may not have started yet
        setAudioMuted(false);
      }
    } else {
      await s.muteAudio();
      setAudioMuted(true);
    }
  }

  function leave() {
    void clientRef.current?.leave();
    window.location.href = '/';
  }

  if (error) {
    return <div style={{ padding: 32, color: '#e2725b' }}>Video session error: {error}</div>;
  }

  const ctrlBtn = (active: boolean): CSSProperties => ({
    width: 56,
    height: 56,
    borderRadius: 28,
    border: 'none',
    cursor: 'pointer',
    fontSize: 22,
    color: '#fff',
    background: active ? 'rgba(255,255,255,0.15)' : '#e2725b',
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: showPanel ? '1fr minmax(320px, 38%)' : '1fr', height: '100vh' }}>
      {/* Video region — LMA owns this layout, not Zoom. */}
      <section style={{ position: 'relative', background: '#11131a' }}>
        <video-player-container ref={peersRef} style={{ display: 'block', height: '100%', width: '100%' }} />
        <video-player-container
          ref={selfRef}
          style={{ position: 'absolute', bottom: 16, right: 16, height: 160, width: 224, overflow: 'hidden', borderRadius: 12, background: '#000' }}
        />
        {!joined && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#aab' }}>
            Connecting…
          </div>
        )}

        {mediaNote && (
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              maxWidth: 560,
              padding: '10px 16px',
              borderRadius: 10,
              background: 'rgba(226,114,91,0.95)',
              color: '#fff',
              fontSize: 14,
              textAlign: 'center',
            }}
          >
            {mediaNote}
          </div>
        )}

        {/* Control bar */}
        {joined && (
          <div
            style={{
              position: 'absolute',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 16,
              padding: '12px 20px',
              borderRadius: 40,
              background: 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <button
              onClick={toggleAudio}
              style={ctrlBtn(!audioMuted)}
              title={audioMuted ? 'Unmute mic' : 'Mute mic'}
              aria-label={audioMuted ? 'Unmute mic' : 'Mute mic'}
            >
              {audioMuted ? '🔇' : '🎤'}
            </button>
            <button
              onClick={toggleVideo}
              style={ctrlBtn(videoOn)}
              title={videoOn ? 'Turn camera off' : 'Turn camera on'}
              aria-label={videoOn ? 'Turn camera off' : 'Turn camera on'}
            >
              {videoOn ? '📹' : '🚫'}
            </button>
            <button
              onClick={leave}
              style={{ ...ctrlBtn(false), background: '#c0392b' }}
              title="Leave"
              aria-label="Leave"
            >
              📞
            </button>
          </div>
        )}
      </section>

      {/* LMA practice panel — hidden by default; ?panel=1 to show (sync wiring later). */}
      {showPanel && (
        <aside style={{ overflowY: 'auto', borderLeft: '1px solid #2a2e3a', padding: 24 }}>
          <h2>Practice</h2>
          <ol>
            {STEPS.filter((s) => s !== 'FREESTYLE').map((s) => (
              <li key={s} style={{ marginBottom: 8, fontSize: 14 }}>
                <strong>{STEP_CONFIG[s].title}</strong> — {STEP_CONFIG[s].instruction}
              </li>
            ))}
          </ol>
        </aside>
      )}
    </div>
  );
}
