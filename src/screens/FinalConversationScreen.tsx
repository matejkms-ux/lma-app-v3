import { useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { DeviceFrame } from '../components/DeviceFrame';
import { StatusBar } from '../components/StatusBar';
import { useSession } from '../session';
import { finalProgramFor } from '../data/finalContent';
import { getConversationRatings, setConversationRating, averageStars, markModuleDone } from '../lib/finalProgress';
import { useRecorder } from '../practice/useRecorder';
import { assessSpeaking, isUnavailable } from '../lib/assess';

/**
 * Final Conversation — productive speaking, solo. For each question-prompt the
 * host/LC voice asks (target-language audio), the learner records a spoken answer;
 * the answer is auto-scored by the Azure pronunciation pipeline in the program's
 * locale (unscripted: pronunciation + fluency, NOT meaning — the only Final module
 * that auto-scores). Locales Azure can't assess (th/km) fall back to a self-rating.
 * Per-adventurer content; nothing here is learner-specific.
 */
type PromptResult =
  | { kind: 'scoring' }
  | { kind: 'auto'; stars: number; combined: number; pronunciation: number; fluency: number }
  | { kind: 'manual' };

export function FinalConversationScreen() {
  const navigate = useNavigate();
  const { user } = useSession();
  const program = useMemo(() => finalProgramFor(user?.username), [user?.username]);
  const convo = program?.conversation ?? null;
  const language = program?.language ?? '';
  const locale = program?.locale ?? 'en-US';

  const recorder = useRecorder();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [recordingIdx, setRecordingIdx] = useState<number | null>(null);
  const [results, setResults] = useState<Record<number, PromptResult>>({});
  const [ratings, setRatings] = useState<Record<number, number>>(() =>
    user ? getConversationRatings(user.id, user.username ?? '') : {},
  );
  const [done, setDone] = useState(false);

  if (!user) return <Navigate to="/" replace />;

  if (!convo) {
    return (
      <DeviceFrame tone="light">
        <StatusBar tone="light" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="font-serif text-2xl italic text-heading">No conversation yet</div>
          <button onClick={() => navigate('/final')} className="rounded-full border border-rule px-5 py-2 text-[12px] font-bold tracking-[.08em] text-muted">‹ BACK</button>
        </div>
      </DeviceFrame>
    );
  }

  const total = convo.prompts.length;
  const allAnswered = convo.prompts.every((_, i) => ratings[i] != null);

  const persistStars = (i: number, stars: number) => {
    setConversationRating(user.id, user.username ?? '', i, stars);
    setRatings((prev) => ({ ...prev, [i]: stars }));
  };

  const playPrompt = (i: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    el.src = convo.prompts[i].audioUrl;
    void el.play().catch(() => { /* autoplay/network — non-fatal */ });
  };

  const startAnswer = async (i: number) => {
    audioRef.current?.pause();
    setRecordingIdx(i);
    await recorder.start();
  };

  const stopAnswer = async (i: number) => {
    const take = await recorder.stop();
    setRecordingIdx(null);
    if (!take) {
      // mic blocked / nothing captured → let them self-rate instead
      setResults((r) => ({ ...r, [i]: { kind: 'manual' } }));
      return;
    }
    setResults((r) => ({ ...r, [i]: { kind: 'scoring' } }));
    const score = await assessSpeaking(take.blob, locale);
    if (isUnavailable(score)) {
      setResults((r) => ({ ...r, [i]: { kind: 'manual' } }));
      return;
    }
    setResults((r) => ({
      ...r,
      [i]: { kind: 'auto', stars: score.auto_stars, combined: score.combined, pronunciation: score.pronunciation, fluency: score.fluency },
    }));
    persistStars(i, score.auto_stars);
  };

  const redo = (i: number) => setResults((r) => { const n = { ...r }; delete n[i]; return n; });

  if (done) {
    return (
      <DeviceFrame tone="light">
        <StatusBar tone="light" />
        <div className="flex flex-1 flex-col items-center justify-center px-7 pb-10 text-center">
          <div className="text-[42px]">💬</div>
          <div className="mt-4 font-serif text-[28px] italic leading-snug text-heading">Bien hablado, {user.calledName ?? user.firstName ?? 'Neal'}.</div>
          <p className="mt-3 text-[14px] leading-[1.65] text-muted">You answered all {total} prompts out loud.</p>
          <div className="mt-7 w-full rounded-2xl border border-rule bg-cream-panel p-5">
            <div className="text-[10px] font-bold tracking-[.14em] text-muted">PRONUNCIATION · FLUENCY</div>
            <div className="mt-1.5 flex items-baseline justify-center gap-1.5">
              <span className="font-serif text-[40px] font-bold leading-none text-emerald">{averageStars(ratings).toFixed(1)}</span>
              <span className="text-[14px] font-bold text-muted">/ 5 avg</span>
            </div>
          </div>
        </div>
        <div className="px-5 pb-5">
          <button onClick={() => navigate('/final')} className="w-full rounded-[15px] bg-emerald py-4 text-[15px] font-bold tracking-[.01em] text-cream">Done</button>
        </div>
      </DeviceFrame>
    );
  }

  return (
    <DeviceFrame tone="light">
      <StatusBar tone="light" />
      <audio ref={audioRef} className="hidden" />
      <div className="shrink-0 px-5 pb-1 pt-[16px]">
        <div className="text-[10px] font-bold tracking-[.16em] text-muted">{language} · FINAL CONVERSATION</div>
        <div className="mt-1 font-serif text-[26px] italic leading-tight text-heading">{convo.title}</div>
        <p className="mt-1.5 text-[13px] leading-[1.55] text-muted">{convo.intro}</p>
      </div>

      <div className="scroll-region flex-1 px-5 pb-6 pt-3">
        <div className="flex flex-col gap-3">
          {convo.prompts.map((p, i) => {
            const res = results[i];
            const isRec = recordingIdx === i;
            const answered = ratings[i] != null;
            return (
              <div key={i} className="rounded-2xl border border-rule bg-cream-panel p-4">
                <div className="flex items-start gap-2.5">
                  <span className={`mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${answered ? 'bg-emerald text-cream' : 'bg-emerald/15 text-emerald'}`}>
                    {answered ? '✓' : i + 1}
                  </span>
                  <p className="flex-1 text-[15px] leading-[1.5] text-heading">{p.text}</p>
                </div>

                <div className="mt-3 flex items-center gap-2 pl-7">
                  <button
                    onClick={() => playPrompt(i)}
                    className="rounded-full border border-rule bg-white px-3 py-1.5 text-[12px] font-bold tracking-[.04em] text-emerald active:scale-95"
                  >
                    ▶ Escuchar
                  </button>

                  {!isRec && res?.kind !== 'scoring' && (
                    <button
                      onClick={() => startAnswer(i)}
                      className="rounded-full bg-coral px-3 py-1.5 text-[12px] font-bold tracking-[.04em] text-white active:scale-95"
                    >
                      ● {answered ? 'Regrabar' : 'Grabar respuesta'}
                    </button>
                  )}
                  {isRec && (
                    <button
                      onClick={() => stopAnswer(i)}
                      className="flex items-center gap-1.5 rounded-full bg-heading px-3 py-1.5 text-[12px] font-bold tracking-[.04em] text-cream active:scale-95"
                    >
                      <span className="h-2 w-2 animate-pulse rounded-[2px] bg-coral" /> Detener
                    </button>
                  )}
                  {res?.kind === 'scoring' && (
                    <span className="text-[12px] font-semibold text-muted">Evaluando…</span>
                  )}
                </div>

                {/* Auto score */}
                {res?.kind === 'auto' && (
                  <div className="mt-2 flex items-center gap-2 pl-7">
                    <span className="text-coral">{'★'.repeat(res.stars)}<span className="text-locked">{'★'.repeat(5 - res.stars)}</span></span>
                    <span className="text-[11px] font-semibold text-muted">
                      Pron {res.pronunciation} · Fluidez {res.fluency}
                    </span>
                    <button onClick={() => redo(i)} className="ml-auto text-[11px] font-bold text-emerald">Repetir</button>
                  </div>
                )}

                {/* Manual fallback (mic blocked or locale Azure can't score) */}
                {res?.kind === 'manual' && (
                  <div className="mt-2 flex items-center gap-1.5 pl-7">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => persistStars(i, n)}
                        aria-label={`${n} of 5`}
                        className={`text-[20px] leading-none transition-transform active:scale-90 ${ratings[i] != null && n <= ratings[i] ? 'text-coral' : 'text-locked'}`}
                      >
                        ★
                      </button>
                    ))}
                    <span className="ml-1.5 text-[10px] font-semibold tracking-[.06em] text-locked">
                      {ratings[i] != null ? 'self-rated' : 'auto unavailable — self-rate'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="-mt-5 bg-gradient-to-t from-cream from-40% to-transparent px-5 pb-4 pt-2">
        <button
          onClick={() => { markModuleDone(user.id, user.username ?? '', 'conversation'); setDone(true); }}
          disabled={!allAnswered}
          className="w-full rounded-[15px] bg-emerald py-4 text-[15px] font-bold tracking-[.01em] text-cream disabled:opacity-40"
        >
          Finish conversation →
        </button>
      </div>
    </DeviceFrame>
  );
}
