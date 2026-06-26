import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SuperShell } from '../../superapp/SuperShell';
import { useSuperApp } from '../../superapp/store';
import { REVIEW_CARDS } from '../../data/superApp';

/**
 * R4 · Review — the cross-mode cloze SRS. Each card hides one word; Reveal shows
 * the answer, then Again / Good / Easy grades it and advances. Clearing the queue
 * awards reps and shows the reward. Reached from the Hub "due today" CTA.
 */
export function ReviewScreen() {
  const navigate = useNavigate();
  const { awardReps } = useSuperApp();
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);

  const card = REVIEW_CARDS[idx] ?? REVIEW_CARDS[0];

  const grade = () => {
    const next = idx + 1;
    if (next >= REVIEW_CARDS.length) {
      awardReps(6);
      setDone(true);
    } else {
      setIdx(next);
      setRevealed(false);
    }
  };

  return (
    <SuperShell tab="reader" tone="light" showNav={false}>
      <div className="flex h-full flex-col bg-cream px-6 pb-[30px] pt-14">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/hub')} className="text-heading">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#15403B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <div className="text-[13px] font-semibold text-teal-dim">Review · due today</div>
          <div className="w-[22px]" />
        </div>

        {!done ? (
          <>
            <div className="mt-[22px] flex gap-1.5">
              {REVIEW_CARDS.map((_, i) => (
                <div
                  key={i}
                  className="h-1 flex-1 rounded-[2px]"
                  style={{ background: i < idx ? '#0E635B' : i === idx ? '#EF6A47' : '#E2D8C4' }}
                />
              ))}
            </div>

            <div className="flex flex-1 flex-col justify-center">
              <div className="text-center text-[12px] font-semibold uppercase tracking-[.08em] text-muted">Fill the blank</div>
              <div className="mt-5 text-center font-khmer text-[30px] leading-[1.7] text-heading">
                {card.before}{' '}
                {revealed ? (
                  <span className="text-coral">{card.blank}</span>
                ) : (
                  <span className="inline-block h-[30px] min-w-[60px] align-[-4px]" style={{ borderBottom: '3px solid #EF6A47' }} />
                )}{' '}
                {card.after}
              </div>
              <div className="mt-3.5 text-center font-serif text-[15px] italic text-teal-dim">{card.en}</div>
              {revealed && (
                <div className="mt-2.5 text-center text-sm text-muted">
                  {card.blank} — {card.answerEn}
                </div>
              )}
            </div>

            {!revealed ? (
              <button
                onClick={() => setRevealed(true)}
                className="rounded-[16px] bg-coral py-4 text-center text-[15px] font-semibold text-white"
              >
                Reveal
              </button>
            ) : (
              <div className="flex gap-2.5">
                <button onClick={grade} className="flex-1 rounded-[14px] border border-rule bg-cream-panel py-[15px] text-center text-sm font-semibold text-heading">
                  Again
                </button>
                <button onClick={grade} className="flex-1 rounded-[14px] bg-emerald2 py-[15px] text-center text-sm font-semibold text-white">
                  Good
                </button>
                <button onClick={grade} className="flex-1 rounded-[14px] border border-rule bg-cream-panel py-[15px] text-center text-sm font-semibold text-heading">
                  Easy
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="animate-pop flex items-baseline gap-2">
              <span className="font-serif text-[80px] leading-[.9] text-coral">+6</span>
              <span className="font-serif text-[26px] text-heading">reps</span>
            </div>
            <div className="mt-2 text-[15px] text-muted">3 words reinforced · queue clear</div>
            <button onClick={() => navigate('/hub')} className="mt-8 rounded-[16px] bg-coral px-10 py-[15px] text-[15px] font-semibold text-white">
              Back to Hub
            </button>
          </div>
        )}
      </div>
    </SuperShell>
  );
}
