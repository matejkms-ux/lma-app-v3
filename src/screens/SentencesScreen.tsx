import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { DeviceFrame } from '../components/DeviceFrame';
import { StatusBar } from '../components/StatusBar';
import { BottomNav } from '../components/BottomNav';
import { useSession } from '../session';
import { lessonsForLanguage } from '../data/content';
import { getSentences } from '../data/api';
import { getLessonTitle } from '../data/lessonAudio';
import { getSentenceStars, setSentenceStars } from '../lib/progress';

interface Row {
  sentenceNr: number;
  l1: string;
  l2: string;
  l2_translit: string | null;
}

/**
 * Sentences screen — the full sentence list for one lesson, each with a 1–5★
 * self-rating saved per learner. Reached from the practice screen (tap the
 * lesson title). Stars are local-first (see lib/progress).
 */
export function SentencesScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSession();

  const stateCode = (location.state as { lessonCode?: string } | null)?.lessonCode;
  const code = useMemo(
    () => stateCode ?? (user ? lessonsForLanguage(user.language)[0]?.code : undefined),
    [stateCode, user],
  );

  const [rows, setRows] = useState<Row[]>([]);
  const [title, setTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stars, setStars] = useState<Record<number, number | null>>({});

  useEffect(() => {
    if (!user || !code) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    void Promise.all([getSentences(code), getLessonTitle(code)]).then(([sents, t]) => {
      if (!alive) return;
      const mapped = sents.map((s) => ({
        sentenceNr: s.sentenceNr,
        l1: s.l1,
        l2: s.l2,
        l2_translit: s.l2_translit || null,
      }));
      setRows(mapped);
      setTitle(t);
      setStars(
        Object.fromEntries(mapped.map((r) => [r.sentenceNr, getSentenceStars(user.id, code, r.sentenceNr)])),
      );
      setLoading(false);
    });
    return () => { alive = false; };
  }, [user?.id, code]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return <Navigate to="/" replace />;

  const rate = (nr: number, n: number) => {
    setSentenceStars(user.id, code!, nr, n);
    setStars((prev) => ({ ...prev, [nr]: n }));
  };

  return (
    <DeviceFrame tone="light">
      <StatusBar tone="light" />

      <div className="flex shrink-0 items-center justify-between px-6 pb-2 pt-[18px]">
        <button onClick={() => navigate('/lessons')} className="p-1 text-xl text-muted" aria-label="Back">
          ‹
        </button>
        <div className="text-center">
          <div className="text-[11px] font-bold tracking-[.16em] text-muted">{code ?? '—'}</div>
          <div className="font-serif text-[22px] italic text-heading">{title ?? 'Sentences'}</div>
        </div>
        <span className="w-6" />
      </div>

      <div className="scroll-region flex-1 px-5 pb-5 pt-1.5">
        {loading ? (
          <div className="mt-10 text-center text-sm font-semibold text-muted">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="mt-10 px-2 text-center font-serif text-[15px] italic text-muted">
            No sentences loaded for this lesson yet.
          </div>
        ) : (
          <ol className="space-y-2.5">
            {rows.map((r) => {
              const s = stars[r.sentenceNr] ?? null;
              return (
                <li
                  key={r.sentenceNr}
                  className="rounded-[14px] border border-rule bg-cream-panel px-4 py-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 font-mono text-[11px] font-bold text-muted">{r.sentenceNr}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-serif text-[17px] leading-[1.35] text-heading">{r.l2}</div>
                      {r.l2_translit && (
                        <div className="mt-0.5 text-[12px] text-muted">{r.l2_translit}</div>
                      )}
                      <div className="mt-0.5 text-[12px] italic text-muted">{r.l1}</div>
                      <div className="mt-2 flex items-center gap-[5px]">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            onClick={() => rate(r.sentenceNr, n)}
                            className={`text-[20px] leading-none transition-transform hover:scale-110 active:scale-95 ${
                              s !== null && n <= s ? 'text-coral' : 'text-star-empty'
                            }`}
                            aria-label={`Rate sentence ${r.sentenceNr} ${n} stars`}
                          >
                            ★
                          </button>
                        ))}
                        <span className={`ml-1.5 text-[10px] font-bold tracking-[.1em] ${s !== null ? 'text-coral/70' : 'text-muted/50'}`}>
                          {s !== null ? `${s}/5` : 'RATE'}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <BottomNav active="practice" />
    </DeviceFrame>
  );
}
