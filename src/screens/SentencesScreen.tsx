import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { DeviceFrame } from '../components/DeviceFrame';
import { StatusBar } from '../components/StatusBar';
import { BottomNav } from '../components/BottomNav';
import { useSession } from '../session';
import { lessonsForLanguage } from '../data/content';
import { getSentences } from '../data/api';
import { getLessonTitle } from '../data/lessonAudio';
import {
  getSentenceScores,
  setManualStars,
  JUDGED_STEPS,
  type JudgedStep,
  type ScoresBySentence,
} from '../lib/scoring';

interface Row {
  id: string;
  sentenceNr: number;
  l1: string;
  l2: string;
  l2_translit: string | null;
  l2_audio_url: string | null;
}

/** Read-only advisory stars (auto). */
function AutoStars({ stars }: { stars: number | null }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[.08em] text-muted">
      auto
      <span className="text-[12px] leading-none">
        {stars != null ? (
          [1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={n <= stars ? 'text-emerald/70' : 'text-star-empty'}>★</span>
          ))
        ) : (
          <span className="text-muted/50">—</span>
        )}
      </span>
    </span>
  );
}

/**
 * Sentences diagnostic (spec §4). Lists all of a lesson's sentences; for each,
 * shows L1/L2, a play-voice button, and the three judged steps (GRASP/SHADOW/
 * RECALL) with an editable manual self-rating (authoritative) plus the auto
 * score alongside (advisory). A manual edit writes only manual_stars.
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
  const [scores, setScores] = useState<ScoresBySentence>({});
  const [loading, setLoading] = useState(true);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !code) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    void (async () => {
      const [sents, t] = await Promise.all([getSentences(code), getLessonTitle(code)]);
      if (!alive) return;
      const mapped: Row[] = sents.map((s) => ({
        id: s.id,
        sentenceNr: s.sentenceNr,
        l1: s.l1,
        l2: s.l2,
        l2_translit: s.l2_translit || null,
        l2_audio_url: s.l2_audio_url ?? null,
      }));
      setRows(mapped);
      setTitle(t);
      setScores(await getSentenceScores(user.id, mapped.map((r) => r.id)));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user?.id, code]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return <Navigate to="/" replace />;

  const rate = (sentenceId: string, step: JudgedStep, n: number) => {
    setScores((prev) => {
      const cur = prev[sentenceId]?.[step];
      return {
        ...prev,
        [sentenceId]: {
          ...prev[sentenceId],
          [step]: { ...(cur ?? { sentence_id: sentenceId, step, auto_word_accuracy: null, auto_pronunciation: null, auto_combined: null, auto_stars: null, needs_redo: false }), manual_stars: n },
        },
      };
    });
    void setManualStars(user.id, sentenceId, step, n);
  };

  const togglePlay = (row: Row) => {
    const a = audioRef.current;
    if (!a || !row.l2_audio_url) return;
    if (playingId === row.id && !a.paused) { a.pause(); return; }
    a.src = row.l2_audio_url;
    setPlayingId(row.id);
    void a.play().catch(() => setPlayingId(null));
  };

  return (
    <DeviceFrame tone="light">
      <StatusBar tone="light" />

      <div className="flex shrink-0 items-center justify-between px-6 pb-2 pt-[18px]">
        <button onClick={() => navigate('/lessons')} className="p-1 text-xl text-muted" aria-label="Back">‹</button>
        <div className="text-center">
          <div className="text-[11px] font-bold tracking-[.16em] text-muted">{code ?? '—'}</div>
          <div className="font-serif text-[22px] italic text-heading">{title ?? 'Sentences'}</div>
        </div>
        <span className="w-6" />
      </div>

      <audio ref={audioRef} playsInline onPause={() => setPlayingId(null)} onEnded={() => setPlayingId(null)} />

      <div className="scroll-region flex-1 px-5 pb-5 pt-1.5">
        {loading ? (
          <div className="mt-10 text-center text-sm font-semibold text-muted">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="mt-10 px-2 text-center font-serif text-[15px] italic text-muted">
            No sentences loaded for this lesson yet.
          </div>
        ) : (
          <ol className="space-y-3">
            {rows.map((r) => (
              <li key={r.id} className="rounded-[14px] border border-rule bg-cream-panel px-4 py-3.5">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => togglePlay(r)}
                    disabled={!r.l2_audio_url}
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald/40 text-[12px] text-emerald disabled:opacity-30"
                    aria-label={playingId === r.id ? 'Pause sentence audio' : 'Play sentence audio'}
                  >
                    {playingId === r.id ? '❚❚' : '▶'}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[11px] font-bold text-muted">{r.sentenceNr}</span>
                      <span className="font-serif text-[17px] leading-[1.3] text-heading">{r.l2}</span>
                    </div>
                    {r.l2_translit && <div className="mt-0.5 pl-5 text-[12px] text-muted">{r.l2_translit}</div>}
                    <div className="mt-0.5 pl-5 text-[12px] italic text-muted">{r.l1}</div>
                  </div>
                </div>

                {/* Three judged steps: editable manual + advisory auto */}
                <div className="mt-3 space-y-1.5 border-t border-rule-soft pt-2.5">
                  {JUDGED_STEPS.map((step) => {
                    const sc = scores[r.id]?.[step];
                    const manual = sc?.manual_stars ?? null;
                    return (
                      <div key={step} className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span className="w-[58px] shrink-0 text-[10px] font-bold tracking-[.1em] text-muted">{step}</span>
                        <span className="flex items-center gap-[3px]">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              onClick={() => rate(r.id, step, n)}
                              className={`text-[18px] leading-none transition-transform hover:scale-110 active:scale-95 ${
                                manual != null && n <= manual ? 'text-coral' : 'text-star-empty'
                              }`}
                              aria-label={`${step}: set ${n} stars on sentence ${r.sentenceNr}`}
                            >
                              ★
                            </button>
                          ))}
                        </span>
                        <AutoStars stars={sc?.auto_stars ?? null} />
                        {sc?.needs_redo && (
                          <span className="rounded-full bg-coral/15 px-2 py-[1px] text-[9px] font-bold tracking-[.1em] text-coral">
                            NEEDS REDO
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <BottomNav active="practice" />
    </DeviceFrame>
  );
}
