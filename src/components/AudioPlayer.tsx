import { useEffect, useRef, useState } from 'react';

/**
 * The forward-only audio player (v3 brief §2), now real. Two controls only:
 *   - Play
 *   - Stop → resets to the very start; you must press play again.
 * There is no scrubbing and no seek-back. Reaching the end fires `onEnded`, which
 * is the gate that clears the step.
 */
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
  onStop,
  onPlayingChange,
}: {
  src: string;
  onEnded?: () => void;
  onPlay?: () => void;
  onStop?: () => void;
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

  // Surface play/stop to the parent (drives the orb animation).
  useEffect(() => {
    onPlayingChange?.(playing);
  }, [playing, onPlayingChange]);

  const play = () => {
    void audioRef.current?.play().catch(() => {
      /* autoplay/permission edge — leave UI as-is */
    });
  };

  const stop = () => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    setPlaying(false);
    setCur(0);
    onStop?.();
  };

  const pct = dur > 0 ? Math.min(100, (cur / dur) * 100) : 0;

  return (
    <div className="flex shrink-0 items-center gap-3.5 px-6">
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
        onClick={() => (playing ? stop() : play())}
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cream text-base text-emerald"
        aria-label={playing ? 'Stop' : 'Play'}
      >
        {playing ? '■' : '▶'}
      </button>
      <div className="flex-1">
        <div className="h-[5px] overflow-hidden rounded-[3px] bg-teal/[.22]">
          <div className="h-full rounded-[3px] bg-teal transition-[width] duration-200" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] font-bold tracking-[.1em] text-teal-dim">
          <span>{fmt(cur)}</span>
          <span>{playing ? 'STOP RESETS' : 'FORWARD ONLY'}</span>
          <span>{fmt(dur)}</span>
        </div>
      </div>
    </div>
  );
}
