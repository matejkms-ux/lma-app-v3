import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { DeviceFrame } from '../components/DeviceFrame';
import { StatusBar } from '../components/StatusBar';
import { useSession } from '../session';
import { finalProgramFor } from '../data/finalContent';
import { getConversationRatings, setConversationRating, averageStars, markModuleDone } from '../lib/finalProgress';

/**
 * Final Conversation — the learner practises the questions their guide will ask in
 * the final session, out loud, and self-rates how each answer felt. Prompts are
 * per-adventurer content; nothing here is learner-specific.
 */
export function FinalConversationScreen() {
  const navigate = useNavigate();
  const { user } = useSession();
  const program = useMemo(() => finalProgramFor(user?.username), [user?.username]);
  const convo = program?.conversation ?? null;
  const language = program?.language ?? '';

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
  const allRated = convo.prompts.every((_, i) => ratings[i] != null);

  const rate = (i: number, stars: number) => {
    setConversationRating(user.id, user.username ?? '', i, stars);
    setRatings((prev) => ({ ...prev, [i]: stars }));
  };

  if (done) {
    return (
      <DeviceFrame tone="light">
        <StatusBar tone="light" />
        <div className="flex flex-1 flex-col items-center justify-center px-7 pb-10 text-center">
          <div className="text-[42px]">💬</div>
          <div className="mt-4 font-serif text-[28px] italic leading-snug text-heading">Ready to talk, {user.calledName ?? user.firstName ?? 'Neal'}.</div>
          <p className="mt-3 text-[14px] leading-[1.65] text-muted">You practised all {total} prompts out loud.</p>
          <div className="mt-7 w-full rounded-2xl border border-rule bg-cream-panel p-5">
            <div className="text-[10px] font-bold tracking-[.14em] text-muted">HOW IT FELT</div>
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
      <div className="shrink-0 px-5 pb-1 pt-[16px]">
        <div className="text-[10px] font-bold tracking-[.16em] text-muted">{language} · FINAL CONVERSATION</div>
        <div className="mt-1 font-serif text-[26px] italic leading-tight text-heading">{convo.title}</div>
        <p className="mt-1.5 text-[13px] leading-[1.55] text-muted">{convo.intro}</p>
      </div>

      <div className="scroll-region flex-1 px-5 pb-6 pt-3">
        <div className="flex flex-col gap-3">
          {convo.prompts.map((p, i) => (
            <div key={i} className="rounded-2xl border border-rule bg-cream-panel p-4">
              <div className="flex items-start gap-2.5">
                <span className="mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald/15 text-[11px] font-bold text-emerald">{i + 1}</span>
                <p className="flex-1 text-[15px] leading-[1.5] text-heading">{p}</p>
              </div>
              <div className="mt-3 flex items-center gap-1.5 pl-7">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => rate(i, n)}
                    aria-label={`${n} of 5`}
                    className={`text-[22px] leading-none transition-transform active:scale-90 ${
                      ratings[i] != null && n <= ratings[i] ? 'text-coral' : 'text-locked'
                    }`}
                  >
                    ★
                  </button>
                ))}
                <span className="ml-1.5 text-[10px] font-semibold tracking-[.08em] text-locked">
                  {ratings[i] != null ? `${ratings[i]} / 5` : 'say it aloud, then rate'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="-mt-5 bg-gradient-to-t from-cream from-40% to-transparent px-5 pb-4 pt-2">
        <button
          onClick={() => { markModuleDone(user.id, user.username ?? '', 'conversation'); setDone(true); }}
          disabled={!allRated}
          className="w-full rounded-[15px] bg-emerald py-4 text-[15px] font-bold tracking-[.01em] text-cream disabled:opacity-40"
        >
          Finish practice →
        </button>
      </div>
    </DeviceFrame>
  );
}
