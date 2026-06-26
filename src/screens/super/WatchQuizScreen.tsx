import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SuperShell } from '../../superapp/SuperShell';
import { useSuperApp } from '../../superapp/store';
import { QUIZ_ITEMS } from '../../data/superApp';
import { colors } from '../../tokens';

/**
 * W3 · Learn mode — the quiz generated from the clip. Each item is multiple
 * choice; picking locks the answer (green = correct, coral = your wrong pick),
 * then Continue advances. Clearing the set awards reps and shows the score.
 */
export function WatchQuizScreen() {
  const navigate = useNavigate();
  const { awardReps } = useSuperApp();
  const [idx, setIdx] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = QUIZ_ITEMS[idx] ?? QUIZ_ITEMS[0];
  const answered = pick !== null;

  const choose = (i: number) => {
    if (answered) return;
    setPick(i);
    if (i === q.correct) setScore((s) => s + 1);
  };
  const next = () => {
    const ni = idx + 1;
    if (ni >= QUIZ_ITEMS.length) {
      awardReps(5);
      setDone(true);
    } else {
      setIdx(ni);
      setPick(null);
    }
  };

  return (
    <SuperShell tab="watch" tone="light" showNav={false}>
      <div className="flex h-full flex-col bg-cream px-6 pb-[30px] pt-14">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/watch')} className="text-heading">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#15403B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <div className="text-[13px] font-semibold text-teal-dim">Learn · from this clip</div>
          <div className="w-[22px]" />
        </div>

        {!done ? (
          <>
            <div className="mt-5 text-center text-[12px] text-muted">
              {idx + 1} of {QUIZ_ITEMS.length} · {q.type}
            </div>
            <div className="flex flex-1 flex-col justify-center">
              <div className="text-center font-khmer text-[30px] leading-[1.6] text-heading">{q.q}</div>
              <div className="mt-3 text-center font-serif text-[15px] italic text-teal-dim">{q.en}</div>

              <div className="mt-[30px] flex flex-col gap-2.5">
                {q.opts.map((o, i) => {
                  const isCorrect = i === q.correct;
                  const picked = pick === i;
                  let bg = '#FBF5EA';
                  let fg: string = colors.heading;
                  let bd: string = colors.rule;
                  if (answered && isCorrect) {
                    bg = '#0E635B';
                    fg = '#fff';
                    bd = '#0E635B';
                  } else if (picked && !isCorrect) {
                    bg = 'rgba(239,106,71,.14)';
                    fg = '#EF6A47';
                    bd = '#EF6A47';
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => choose(i)}
                      className="flex items-center justify-between rounded-[14px] border px-[18px] py-[15px]"
                      style={{ background: bg, color: fg, borderColor: bd }}
                    >
                      <span className="font-khmer text-[18px] font-medium">{o}</span>
                      {q.optEn[i] && <span className="text-[13px] opacity-70">{q.optEn[i]}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {answered && (
              <button onClick={next} className="rounded-[16px] bg-coral py-4 text-center text-[15px] font-semibold text-white">
                Continue →
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="text-[12px] font-bold uppercase tracking-[.12em] text-teal-dim">Clip mastered</div>
            <div className="animate-pop mt-[18px] flex items-baseline gap-2">
              <span className="font-serif text-[80px] leading-[.9] text-coral">+5</span>
              <span className="font-serif text-[26px] text-heading">reps</span>
            </div>
            <div className="mt-2 text-[15px] text-muted">
              Scored {score} / {QUIZ_ITEMS.length} · 4 words reinforced
            </div>
            <button onClick={() => navigate('/hub')} className="mt-8 rounded-[16px] bg-coral px-10 py-[15px] text-[15px] font-semibold text-white">
              Back to Hub
            </button>
          </div>
        )}
      </div>
    </SuperShell>
  );
}
