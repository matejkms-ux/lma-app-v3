import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import ZoomVideo, { VideoQuality } from '@zoom/videosdk';
import { useSession } from '../session';
import { fetchZoomSignature, topicForSession } from '../lib/zoom';
import { STEP_CONFIG } from '../practice/steps';
import { STEPS, colors, fonts, radius } from '../tokens';

// Minimal line icons (LMA chrome, cream/coral on emerald). 22px, currentColor.
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const IconMic = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
    <rect x="9" y="2.5" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><line x1="12" y1="18" x2="12" y2="21.5" />
  </svg>
);
const IconMicOff = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
    <rect x="9" y="2.5" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><line x1="12" y1="18" x2="12" y2="21.5" /><line x1="3.5" y1="3.5" x2="20.5" y2="20.5" />
  </svg>
);
const IconCam = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
    <rect x="2.5" y="6.5" width="13" height="11" rx="2.5" /><path d="M15.5 10.5l6-3.5v10l-6-3.5" />
  </svg>
);
const IconCamOff = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
    <rect x="2.5" y="6.5" width="13" height="11" rx="2.5" /><path d="M15.5 10.5l6-3.5v10l-6-3.5" /><line x1="3" y1="3" x2="21" y2="21" />
  </svg>
);
const IconLeave = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ transform: 'rotate(135deg)' }}>
    <path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11 11 0 0 0 3.5.56 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.2.2 2.4.56 3.5a1 1 0 0 1-.25 1L6.6 10.8z" />
  </svg>
);

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
  const [peerCount, setPeerCount] = useState(0);
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
            setPeerCount((c) => c + 1);
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
        setPeerCount((c) => c + 1);
      } else if (p.action === 'Stop') {
        await s.detachVideo(p.userId);
        setPeerCount((c) => Math.max(0, c - 1));
      }
    };
    const onUserRemoved = async (list: Array<{ userId: number }>) => {
      const s = stream();
      if (!s) return;
      for (const u of list) {
        await s.detachVideo(u.userId);
        setPeerCount((c) => Math.max(0, c - 1));
      }
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

  // The L · M · A wordmark, matching EntryScreen.
  const Wordmark = () => (
    <div
      style={{
        position: 'absolute',
        top: 22,
        left: 26,
        zIndex: 5,
        fontFamily: fonts.sans,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '.42em',
        color: colors.teal,
      }}
    >
      L · M · A
    </div>
  );

  if (error) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: colors.emerald,
          color: colors.cream,
          fontFamily: fonts.sans,
          padding: 32,
        }}
      >
        <Wordmark />
        <div style={{ maxWidth: 460, textAlign: 'center' }}>
          <div style={{ fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 28, lineHeight: 1.1 }}>
            The session was interrupted.
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: colors.teal }}>{error}</div>
          <button
            onClick={() => (window.location.href = '/')}
            style={{
              marginTop: 24,
              padding: '10px 22px',
              borderRadius: radius.pill,
              border: 'none',
              cursor: 'pointer',
              background: colors.coral,
              color: colors.cream,
              fontFamily: fonts.sans,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  const ctrlBtn: CSSProperties = {
    width: 54,
    height: 54,
    borderRadius: 27,
    border: 'none',
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center',
    background: colors.emerald2,
    color: colors.cream,
    transition: 'background .15s, color .15s',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: showPanel ? '1fr minmax(320px, 38%)' : '1fr', height: '100vh', background: colors.emerald }}>
      {/* Video region — LMA owns this layout, not Zoom. */}
      <section style={{ position: 'relative', background: colors.emerald, overflow: 'hidden' }}>
        <Wordmark />

        <video-player-container ref={peersRef} style={{ display: 'block', height: '100%', width: '100%' }} />

        {/* Self view */}
        <div
          style={{
            position: 'absolute',
            bottom: 96,
            right: 20,
            height: 150,
            width: 210,
            borderRadius: radius.card,
            overflow: 'hidden',
            background: colors.emerald2,
            border: `1px solid ${colors.teal}40`,
            boxShadow: '0 8px 24px rgba(0,0,0,.28)',
          }}
        >
          <video-player-container ref={selfRef} style={{ display: 'block', height: '100%', width: '100%' }} />
          <span
            style={{
              position: 'absolute',
              left: 10,
              bottom: 8,
              fontFamily: fonts.sans,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '.08em',
              color: colors.cream,
              textShadow: '0 1px 3px rgba(0,0,0,.5)',
            }}
          >
            {videoOn ? 'YOU' : 'CAMERA OFF'}
          </span>
        </div>

        {/* Connecting / waiting states */}
        {!joined && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', gap: 14, gridAutoFlow: 'row' }}>
            <span className="animate-pulse" style={{ width: 12, height: 12, borderRadius: 6, background: colors.coral }} />
            <div style={{ fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 24, color: colors.cream }}>Connecting…</div>
          </div>
        )}
        {joined && peerCount === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 26, color: colors.cream }}>You’re in.</div>
              <div style={{ marginTop: 8, fontFamily: fonts.sans, fontSize: 13, color: colors.teal }}>Waiting for the others to join…</div>
            </div>
          </div>
        )}

        {mediaNote && (
          <div
            style={{
              position: 'absolute',
              top: 18,
              left: '50%',
              transform: 'translateX(-50%)',
              maxWidth: 560,
              padding: '10px 16px',
              borderRadius: radius.pill,
              background: colors.coral,
              color: colors.cream,
              fontFamily: fonts.sans,
              fontSize: 13,
              textAlign: 'center',
              boxShadow: '0 6px 20px rgba(0,0,0,.28)',
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
              gap: 14,
              padding: '12px 18px',
              borderRadius: 36,
              background: 'rgba(8,40,37,0.66)',
              border: `1px solid ${colors.teal}26`,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            <button
              onClick={toggleAudio}
              style={{ ...ctrlBtn, color: audioMuted ? colors.coral : colors.cream }}
              title={audioMuted ? 'Unmute mic' : 'Mute mic'}
              aria-label={audioMuted ? 'Unmute mic' : 'Mute mic'}
            >
              {audioMuted ? <IconMicOff /> : <IconMic />}
            </button>
            <button
              onClick={toggleVideo}
              style={{ ...ctrlBtn, color: videoOn ? colors.cream : colors.coral }}
              title={videoOn ? 'Turn camera off' : 'Turn camera on'}
              aria-label={videoOn ? 'Turn camera off' : 'Turn camera on'}
            >
              {videoOn ? <IconCam /> : <IconCamOff />}
            </button>
            <button
              onClick={leave}
              style={{ ...ctrlBtn, background: colors.coral, color: colors.cream }}
              title="Leave"
              aria-label="Leave"
            >
              <IconLeave />
            </button>
          </div>
        )}
      </section>

      {/* LMA practice panel — hidden by default; ?panel=1 to show (sync wiring later). */}
      {showPanel && (
        <aside
          style={{
            overflowY: 'auto',
            borderLeft: `1px solid ${colors.teal}26`,
            padding: 28,
            background: colors.emerald2,
            fontFamily: fonts.sans,
            color: colors.cream,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.18em', color: colors.teal }}>PRACTICE</div>
          <ol style={{ marginTop: 16, listStyle: 'none', padding: 0 }}>
            {STEPS.filter((s) => s !== 'FREESTYLE').map((s) => (
              <li key={s} style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 18, color: colors.cream }}>{STEP_CONFIG[s].title}</div>
                <div style={{ marginTop: 2, fontSize: 13, lineHeight: 1.4, color: colors.teal }}>{STEP_CONFIG[s].instruction}</div>
              </li>
            ))}
          </ol>
        </aside>
      )}
    </div>
  );
}
