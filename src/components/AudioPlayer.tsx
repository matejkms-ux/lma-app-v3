import { useEffect, useRef, useState } from 'react';

/**
 * Audio player (spec §5): two controls — reverse and a play/pause toggle. There
 * is no hard-stop; pausing keeps the position, and reverse seeks back a few
 * seconds. Reaching the end fires `onEnded`, the gate that clears the step.
 */
const REVERSE_SECONDS = 5;

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
}: {
  src: string;
  onEnded?: () => void;
  onPlay?: () => void;
  onPlayingChange?: (playing: boolean) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);

  // A new clip resets the transport.
  useEffect(() => {
    const a = audioRef.current;
    setPlaying(false);
    setCur(0);
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
    a.currentTime = Math.max(0, a.currentTime - REVERSE_SECONDS);
  };

  const pct = dur > 0 ? Math.min(100, (cur / dur) * 100) : 0;

  return (
    <div className="flex shrink-0 items-center gap-3 px-6">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        playsInline
        crossOrigin="anonymous"
        onPlay={() => {
          setPlaying(true);
          onPlay?.();
        }}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setCur(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
        onEnded={() => {
          setPlaying(false);
          setCur(0);
          onEnded?.();
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
