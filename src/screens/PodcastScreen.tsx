import { useCallback, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { DeviceFrame } from '../components/DeviceFrame';
import { StatusBar } from '../components/StatusBar';
import { useSession } from '../session';
import { finalProgramFor } from '../data/finalContent';
import { getPodcastRatings, setPodcastRating, averageStars, markModuleDone } from '../lib/finalProgress';

function fmt(secs: number) {
  if (!Number.isFinite(secs) || secs < 0) secs = 0;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PodcastScreen() {
  const navigate = useNavigate();
  const { user } = useSession();
  const program = useMemo(() => finalProgramFor(user?.username), [user?.username]);
  const pod = program?.podcast ?? null;
  const language = program?.language ?? '';

  const audioRef = useRef<HTMLAudioElement>(null);
  const [dur, setDur] = useState(0);
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(false);
  // The check (by .n) currently being asked, or null while listening.
  const [activeCheck, setActiveCheck] = useState<number | null>(null);
  const [ratings, setRatings] = useState<Record<number, number>>(() =>
    user ? getPodcastRatings(user.id, user.username ?? '') : {},
  );
  const [done, setDone] = useState(false);

  const checks = pod?.checks ?? [];
  const total = checks.length;
  const active = activeCheck != null ? checks.find((c) => c.n === activeCheck) ?? null : null;

  const resume = () => void audioRef.current?.play().catch(() => {});

  const finishIfAllRated = useCallback(
    (next: Record<number, number>) => {
      if (user && checks.every((c) => next[c.n] != null)) {
        markModuleDone(user.id, user.username ?? '', 'podcast');
        setDone(true);
        return true;
      }
      return false;
    },
    [user, checks],
  );

  const onTimeUpdate = useCallback(() => {
    const a = audioRef.current;
    if (!a || activeCheck !== null) return;
    setCur(a.currentTime);
    // Fire the earliest unrated check whose timestamp we've reached.
    for (const c of checks) {
      if (ratings[c.n] == null && a.currentTime >= c.timeSec) {
        a.pause();
        setActiveCheck(c.n);
        break;
      }
    }
  }, [activeCheck, checks, ratings]);

  const onEnded = useCallback(() => {
    setPlaying(false);
    // Any check we somehow passed without firing → ask it now; else finish.
    const pending = checks.find((c) => ratings[c.n] == null);
    if (pending) setActiveCheck(pending.n);
    else finishIfAllRated(ratings);
  }, [checks, ratings, finishIfAllRated]);

  const rate = (stars: number) => {
    if (activeCheck === null || !user) return;
    setPodcastRating(user.id, user.username ?? '', activeCheck, stars);
    const next = { ...ratings, [activeCheck]: stars };
    setRatings(next);
    setActiveCheck(null);
    if (!finishIfAllRated(next)) setTimeout(resume, 250);
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
            onClick={() => navigate('/final')}
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
            You listened to “{pod.title}” and answered all {total} understanding checks.
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
            onClick={() => navigate('/final')}
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
        <div className="text-[10px] font-bold tracking-[.16em] text-muted">{language} · PODCAST</div>
        <div className="mt-[2px] font-serif text-[24px] italic leading-tight text-heading">{pod.title}</div>
        <div className="text-[13px] text-muted">{pod.subtitle}</div>
      </div>

      {/* Check dots */}
      <div className="shrink-0 px-5">
        <div className="flex items-center justify-between rounded-2xl border border-rule bg-cream-panel px-4 py-3">
          <span className="text-[10px] font-bold tracking-[.12em] text-muted">UNDERSTANDING CHECKS</span>
          <div className="flex gap-1.5">
            {checks.map((c) => (
              <span
                key={c.n}
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  ratings[c.n] != null
                    ? 'bg-emerald text-cream'
                    : activeCheck === c.n
                    ? 'bg-coral text-cream'
                    : 'bg-rule text-muted'
                }`}
              >
                {ratings[c.n] != null ? '★' : c.n}
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
          {ratedCount} / {total} CHECKS DONE
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
            onClick={() => (playing ? audioRef.current?.pause() : resume())}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald text-[20px] text-cream active:scale-95"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? '❚❚' : '▶'}
          </button>
        </div>
      </div>

      {/* Check overlay — the content-defined question for this checkpoint */}
      {active && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-5 bg-cream/[.98] px-8 text-center">
          <div className="text-[11px] font-bold tracking-[.16em] text-coral">
            CHECK {active.n} OF {total}
          </div>
          <div className="font-serif text-[24px] italic leading-tight text-heading">{active.question}</div>
          <p className="max-w-[260px] text-[13px] leading-[1.55] text-muted">
            Think about your answer, then rate how well you understood — and keep listening.
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
