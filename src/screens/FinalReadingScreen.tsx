import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { DeviceFrame } from '../components/DeviceFrame';
import { StatusBar } from '../components/StatusBar';
import { useSession } from '../session';
import { finalProgramFor } from '../data/finalContent';
import { getEssayRatings, setEssayRating, averageStars, markModuleDone } from '../lib/finalProgress';

/** A 1–5 star self-rating row. Tapping a star sets the value. */
function StarRow({ value, onRate }: { value: number | null; onRate: (n: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onRate(n)}
          aria-label={`${n} of 5`}
          className={`text-[30px] leading-none transition-transform active:scale-90 ${
            value !== null && n <= value ? 'text-coral' : 'text-locked'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function FinalReadingScreen() {
  const navigate = useNavigate();
  const { user } = useSession();
  const program = useMemo(() => finalProgramFor(user?.username), [user?.username]);
  const essay = program?.essay ?? null;
  const language = program?.language ?? '';

  const [page, setPage] = useState(0);
  const [ratings, setRatings] = useState<Record<number, number>>(() =>
    user ? getEssayRatings(user.id, user.username ?? '') : {},
  );
  const [done, setDone] = useState(false);

  if (!user) return <Navigate to="/" replace />;

  if (!essay) {
    return (
      <DeviceFrame tone="light">
        <StatusBar tone="light" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="font-serif text-2xl italic text-heading">Nothing to read yet</div>
          <div className="text-sm text-muted">Your final essay isn't loaded for this learner yet.</div>
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

  const total = essay.pages.length;
  const cur = essay.pages[page];
  const rated = ratings[page] ?? null;
  const isLast = page === total - 1;
  const allRated = essay.pages.every((_, i) => ratings[i] != null);

  const rate = (n: number) => {
    setEssayRating(user.id, user.username ?? '', page, n);
    setRatings((prev) => ({ ...prev, [page]: n }));
  };

  if (done) {
    return (
      <DeviceFrame tone="light">
        <StatusBar tone="light" />
        <div className="flex flex-1 flex-col items-center justify-center px-7 pb-10 text-center">
          <div className="text-[42px]">📖</div>
          <div className="mt-4 font-serif text-[28px] italic leading-snug text-heading">
            You read the whole story, {user.calledName ?? user.firstName ?? 'Neal'}.
          </div>
          <p className="mt-3 text-[14px] leading-[1.65] text-muted">
            That's “{essay.title}” — all {total} pages, the day before your final session.
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

  return (
    <DeviceFrame tone="light">
      <StatusBar tone="light" />

      {/* Header */}
      <div className="shrink-0 px-5 pb-2.5 pt-[14px]">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[10px] font-bold tracking-[.16em] text-muted">
              {language} · FINAL READING
            </div>
            <div className="mt-[2px] truncate font-serif text-[20px] italic leading-tight text-heading">
              {essay.title}
            </div>
          </div>
          <div className="shrink-0 pl-3 text-right">
            <div className="text-[10px] font-bold tracking-[.1em] text-muted">PAGE</div>
            <div className="font-mono text-[22px] font-extrabold leading-none tabular-nums text-heading">
              {page + 1}<span className="text-muted">/{total}</span>
            </div>
          </div>
        </div>
        {/* Progress dots */}
        <div className="mt-2.5 flex gap-1">
          {essay.pages.map((_, i) => (
            <span
              key={i}
              className={`h-[3px] flex-1 rounded-full ${
                i === page ? 'bg-emerald' : ratings[i] != null ? 'bg-emerald/40' : 'bg-rule'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Page text */}
      <div className="scroll-region flex-1 px-5 pb-6">
        <div className="rounded-2xl border border-rule bg-cream-panel p-5">
          <div className="text-[11px] font-bold tracking-[.18em] text-emerald">
            {cur.roman}
          </div>
          <h1 className="mb-4 mt-1 font-serif text-[33px] font-bold leading-snug text-heading">
            {cur.heading}
          </h1>
          {cur.paragraphs.map((para, i) => (
            <div key={i} className="mb-3 last:mb-0">
              <p className="text-[33px] leading-[1.7] text-heading">{para}</p>
              {cur.translit?.[i] && (
                <p className="mt-1 text-[22px] leading-[1.6] text-muted">{cur.translit[i]}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Understanding gate + nav */}
      <div className="-mt-5 bg-gradient-to-t from-cream from-40% to-transparent px-5 pb-4 pt-2">
        <div className="rounded-2xl border border-rule bg-white p-3.5">
          <div className="text-center text-[11px] font-bold tracking-[.1em] text-muted">
            HOW WELL DID YOU UNDERSTAND THIS PAGE?
          </div>
          <div className="mt-2.5">
            <StarRow value={rated} onRate={rate} />
          </div>
          <div className="mt-1.5 text-center text-[10px] font-semibold tracking-[.08em] text-locked">
            {rated !== null ? `${rated} / 5` : 'Rate to continue'}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2.5">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-full border border-rule px-4 py-2.5 text-[12px] font-bold tracking-[.06em] text-muted disabled:opacity-30"
          >
            ‹
          </button>
          {isLast ? (
            <button
              onClick={() => { markModuleDone(user.id, user.username ?? '', 'read'); setDone(true); }}
              disabled={!allRated}
              className="flex-1 rounded-[15px] bg-emerald py-3.5 text-[15px] font-bold tracking-[.01em] text-cream disabled:opacity-40"
            >
              Finish reading →
            </button>
          ) : (
            <button
              onClick={() => setPage((p) => Math.min(total - 1, p + 1))}
              disabled={rated === null}
              className="flex-1 rounded-[15px] bg-emerald py-3.5 text-[15px] font-bold tracking-[.01em] text-cream disabled:opacity-40"
            >
              Next page →
            </button>
          )}
        </div>
      </div>
    </DeviceFrame>
  );
}
