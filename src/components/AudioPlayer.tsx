import { useEffect, useRef, useState } from 'react';

/**
 * Audio player (spec §5): two controls — reverse and a play/pause toggle. There
 * is no hard-stop; pausing keeps the position, and reverse seeks back a few
 * seconds. The step-clearing gate `onEnded` fires once per pass when playback
 * reaches COMPLETE_FRACTION (95%) OR the natural end, whichever comes first — the
 * learner doesn't have to sit through the last sliver. It re-arms on each replay,
 * so steps that require two listens still need two genuine passes.
 *
 * The gate is sized in SECONDS from the end (not a % of duration): clips now carry
 * long trailing practice gaps, so a fixed 95% landed inside the last sentence's
 * second repetition and cut it off. Completing ~1s from the end clears only true
 * trailing silence regardless of clip length.
 */
const REVERSE_SECONDS = 5;
const COMPLETE_TAIL_SECONDS = 1.0;

function fmt(secs: number): string {
  if (!Number.isFinite(secs) || secs < 0) secs = 0;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AudioPlayer({
  src,
  onEnded,
  onPlay,
  onPlayingChange,
  onProgress,
}: {
  src: string;
  onEnded?: () => void;
  onPlay?: () => void;
  onPlayingChange?: (playing: boolean) => void;
  /** Playback position as a 0–1 fraction (drives READ auto-scroll). */
  onProgress?: (fraction: number) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  // Whether the completion gate has already fired for the current pass. Re-armed
  // whenever a fresh pass starts from before the threshold (incl. a replay).
  const firedRef = useRef(false);

  // A new clip resets the transport.
  useEffect(() => {
    const a = audioRef.current;
    setPlaying(false);
    setCur(0);
    firedRef.current = false;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
  }, [src]);

  // Surface play/pause to the parent (drives the orb animation).
  useEffect(() => {
    onPlayingChange?.(playing);
  }, [playing, onPlayingChange]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      void a.play().catch(() => {
        /* autoplay/permission edge — leave UI as-is */
      });
    } else {
      a.pause(); // pause keeps position — no reset
    }
  };

  const reverse = () => {
    const a = audioRef.current;
    if (!a) return;
    const now = Number.isFinite(a.currentTime) ? a.currentTime : 0;
    const target = Math.max(0, now - REVERSE_SECONDS);
    try {
      a.currentTime = target;
    } catch {
      /* ignore unseekable edge */
    }
    setCur(target);
  };

  const pct = dur > 0 ? Math.min(100, (cur / dur) * 100) : 0;

  return (
    <div className="flex shrink-0 items-center gap-3 px-6">
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        playsInline
        onPlay={(e) => {
          setPlaying(true);
          // Re-arm the gate for a fresh pass (replay seeks back to the start).
          const a = e.currentTarget;
          if (!a.duration || a.duration - a.currentTime > COMPLETE_TAIL_SECONDS) {
            firedRef.current = false;
          }
          onPlay?.();
        }}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setCur(a.currentTime);
          if (a.duration > 0) {
            onProgress?.(a.currentTime / a.duration);
            // Count the pass complete once within ~1s of the end — clears the
            // trailing silence but never the last sentence. Fires once per pass.
            if (!firedRef.current && a.duration - a.currentTime <= COMPLETE_TAIL_SECONDS) {
              firedRef.current = true;
              onEnded?.();
            }
          }
        }}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
        onError={() => {
          // A clip that won't load/play (bad src, network, decode) must not throw
          // out of the player — log it and reset the transport. The step can still
          // be cleared by playback gating once a working clip arrives.
          console.warn('Audio failed to load/play:', src);
          setPlaying(false);
        }}
        onEnded={() => {
          setPlaying(false);
          setCur(0);
          onProgress?.(1);
          // Natural end — fire the gate only if 95% didn't already trip it.
          if (!firedRef.current) {
            firedRef.current = true;
            onEnded?.();
          }
        }}
      />
      <button
        onClick={reverse}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cream/40 text-[13px] text-cream"
        aria-label={`Reverse ${REVERSE_SECONDS} seconds`}
      >
        ↺
      </button>
      <button
        onClick={togglePlay}
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cream text-base text-emerald"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <div className="flex-1">
        <div className="h-[5px] overflow-hidden rounded-[3px] bg-teal/[.22]">
          <div className="h-full rounded-[3px] bg-teal transition-[width] duration-200" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] font-bold tracking-[.1em] text-teal-dim">
          <span>{fmt(cur)}</span>
          <span>{playing ? 'PLAYING' : 'PAUSED'}</span>
          <span>{fmt(dur)}</span>
        </div>
      </div>
    </div>
  );
}
