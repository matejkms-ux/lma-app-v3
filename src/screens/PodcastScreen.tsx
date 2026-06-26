import { useCallback, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { DeviceFrame } from '../components/DeviceFrame';
import { StatusBar } from '../components/StatusBar';
import { useSession } from '../session';
import { finalPodcastForScope } from '../data/finalReading';
import { getPodcastRatings, setPodcastRating, averageStars } from '../lib/finalProgress';

function fmt(secs: number) {
  if (!Number.isFinite(secs) || secs < 0) secs = 0;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PodcastScreen() {
  const navigate = useNavigate();
  const { user } = useSession();
  const pod = useMemo(() => finalPodcastForScope(user?.username), [user?.username]);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [dur, setDur] = useState(0);
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(false);
  // The check (1..checks) currently being asked, or null while listening.
  const [activeCheck, setActiveCheck] = useState<number | null>(null);
  const [ratings, setRatings] = useState<Record<number, number>>(() =>
    user ? getPodcastRatings(user.id, user.username ?? '') : {},
  );
  const [done, setDone] = useState(false);

  const checks = pod?.checks ?? 6;
  // Interior checkpoints fire mid-playback (every dur/checks); the final check fires
  // at the end — together that's exactly `checks` understanding checks across the show.
  const interiorTimes = useMemo(
    () => (dur > 0 ? Array.from({ length: checks - 1 }, (_, i) => (dur * (i + 1)) / checks) : []),
    [dur, checks],
  );

  const pause = () => audioRef.current?.pause();
  const resume = () => void audioRef.current?.play().catch(() => {});

  const onTimeUpdate = useCallback(() => {
    const a = audioRef.current;
    if (!a || activeCheck !== null) return;
    setCur(a.currentTime);
    // Smallest interior checkpoint reached but not yet rated → ask it.
    for (let k = 1; k <= interiorTimes.length; k++) {
      if (ratings[k] == null && a.currentTime >= interiorTimes[k - 1]) {
        a.pause();
        setActiveCheck(k);
        break;
      }
    }
  }, [activeCheck, interiorTimes, ratings]);

  const onEnded = useCallback(() => {
    setPlaying(false);
    if (ratings[checks] == null) setActiveCheck(checks); // final check
    else setDone(true);
  }, [ratings, checks]);

  const rate = (stars: number) => {
    if (activeCheck === null || !user) return;
    setPodcastRating(user.id, user.username ?? '', activeCheck, stars);
    const next = { ...ratings, [activeCheck]: stars };
    setRatings(next);
    const wasFinal = activeCheck === checks;
    setActiveCheck(null);
    if (wasFinal) setDone(true);
    else setTimeout(resume, 250); // brief beat, then keep listening
  };

  if (!user) return <Navigate to="/" replace />;

  if (!pod) {
    return (
      <DeviceFrame tone="light">
        <StatusBar tone="light" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="font-serif text-2xl italic text-heading">No podcast yet</div>
          <div className="text-sm text-muted">This learner's podcast isn't loaded yet.</div>
          <button
            onClick={() => navigate('/activities')}
            className="rounded-full border border-rule px-5 py-2 text-[12px] font-bold tracking-[.08em] text-muted"
          >
            ‹ BACK
          </button>
        </div>
      </DeviceFrame>
    );
  }

  const ratedCount = Object.keys(ratings).length;

  if (done) {
    return (
      <DeviceFrame tone="light">
        <StatusBar tone="light" />
        <div className="flex flex-1 flex-col items-center justify-center px-7 pb-10 text-center">
          <div className="text-[42px]">🎧</div>
          <div className="mt-4 font-serif text-[28px] italic leading-snug text-heading">
            Episode complete, {user.calledName ?? user.firstName ?? 'Neal'}.
          </div>
          <p className="mt-3 text-[14px] leading-[1.65] text-muted">
            You listened to “{pod.title}” and logged all {checks} understanding checks.
          </p>
          <div className="mt-7 w-full rounded-2xl border border-rule bg-cream-panel p-5">
            <div className="text-[10px] font-bold tracking-[.14em] text-muted">YOUR UNDERSTANDING</div>
            <div className="mt-1.5 flex items-baseline justify-center gap-1.5">
              <span className="font-serif text-[40px] font-bold leading-none text-emerald">
                {averageStars(ratings).toFixed(1)}
              </span>
              <span className="text-[14px] font-bold text-muted">/ 5 avg</span>
            </div>
          </div>
        </div>
        <div className="px-5 pb-5">
          <button
            onClick={() => navigate('/activities')}
            className="w-full rounded-[15px] bg-emerald py-4 text-[15px] font-bold tracking-[.01em] text-cream"
          >
            Done
          </button>
        </div>
      </DeviceFrame>
    );
  }

  const pct = dur > 0 ? Math.min(100, (cur / dur) * 100) : 0;

  return (
    <DeviceFrame tone="light">
      <StatusBar tone="light" />

      <audio
        ref={audioRef}
        src={pod.audioUrl}
        preload="auto"
        playsInline
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
      />

      {/* Header */}
      <div className="shrink-0 px-5 pb-2.5 pt-[14px]">
        <div className="text-[10px] font-bold tracking-[.16em] text-muted">{pod.language} · PODCAST</div>
        <div className="mt-[2px] font-serif text-[24px] italic leading-tight text-heading">{pod.title}</div>
        <div className="text-[13px] text-muted">{pod.subtitle}</div>
      </div>

      {/* Check dots */}
      <div className="shrink-0 px-5">
        <div className="flex items-center justify-between rounded-2xl border border-rule bg-cream-panel px-4 py-3">
          <span className="text-[10px] font-bold tracking-[.12em] text-muted">UNDERSTANDING CHECKS</span>
          <div className="flex gap-1.5">
            {Array.from({ length: checks }, (_, i) => i + 1).map((k) => (
              <span
                key={k}
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  ratings[k] != null
                    ? 'bg-emerald text-cream'
                    : activeCheck === k
                    ? 'bg-coral text-cream'
                    : 'bg-rule text-muted'
                }`}
              >
                {ratings[k] != null ? '★' : k}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Centrepiece */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div
          className={`flex h-40 w-40 items-center justify-center rounded-full border-4 ${
            playing ? 'border-emerald' : 'border-rule'
          }`}
        >
          <div className="text-[56px]">🎙️</div>
        </div>
        <div className="mt-6 text-[12px] font-bold tracking-[.1em] text-muted">
          {ratedCount} / {checks} CHECKS DONE
        </div>
        <div className="mt-1 font-serif text-[15px] italic text-heading">
          {playing ? 'Listening… stay with the conversation.' : 'Press play to begin the episode.'}
        </div>
      </div>

      {/* Transport */}
      <div className="shrink-0 px-6 pb-6">
        <div className="h-[5px] overflow-hidden rounded-[3px] bg-rule">
          <div className="h-full rounded-[3px] bg-emerald transition-[width] duration-200" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] font-bold tracking-[.1em] text-muted">
          <span>{fmt(cur)}</span>
          <span>{playing ? 'PLAYING' : 'PAUSED'}</span>
          <span>{fmt(dur)}</span>
        </div>
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => (playing ? pause() : resume())}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald text-[20px] text-cream active:scale-95"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? '❚❚' : '▶'}
          </button>
        </div>
      </div>

      {/* Check overlay */}
      {activeCheck !== null && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-5 bg-cream/[.98] px-8 text-center">
          <div className="text-[11px] font-bold tracking-[.16em] text-coral">
            CHECK {activeCheck} OF {checks}
          </div>
          <div className="font-serif text-[26px] italic leading-tight text-heading">
            How well did you<br />understand so far?
          </div>
          <p className="max-w-[260px] text-[13px] leading-[1.55] text-muted">
            Rate your understanding of the last few minutes, then keep listening.
          </p>
          <div className="flex items-center justify-center gap-2.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => rate(n)}
                aria-label={`${n} of 5`}
                className="text-[36px] leading-none text-locked transition-transform hover:text-coral active:scale-90"
              >
                ★
              </button>
            ))}
          </div>
        </div>
      )}
    </DeviceFrame>
  );
}
