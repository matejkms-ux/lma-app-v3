import { useEffect, useState } from 'react';
import { getStepStars, setStepStars } from '../../lib/progress';

/**
 * FREESTYLE (the 6th step) — open-ended free production, no reference audio and
 * no recording. The learner speaks on their own (out loud, unrecorded) and then
 * self-rates the take; rating it is what finishes the lesson.
 */
export function FreestylePanel({
  userId,
  lesson,
  onCompletionChange,
}: {
  userId: string;
  lesson: string;
  /** Reports whether the take has been self-rated — the lesson gate. */
  onCompletionChange?: (complete: boolean) => void;
}) {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    setStars(getStepStars(userId, lesson, 'FREESTYLE'));
  }, [userId, lesson]);

  useEffect(() => {
    onCompletionChange?.(stars != null);
  }, [stars, onCompletionChange]);

  const rate = (n: number) => {
    setStepStars(userId, lesson, 'FREESTYLE', n);
    setStars(n);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
      <span className="font-serif text-[15px] italic leading-[1.5] text-teal">
        Say it out loud, on your own. When you're done, rate how it felt.
      </span>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => rate(n)}
            className={`text-[30px] leading-none transition-transform hover:scale-110 active:scale-95 ${
              stars != null && n <= stars ? 'text-coral' : 'text-teal/25'
            }`}
            aria-label={`Rate ${n}`}
          >
            ★
          </button>
        ))}
      </div>
      <span
        className={`text-[10px] font-bold tracking-[.12em] ${stars != null ? 'text-teal' : 'text-teal-dim'}`}
      >
        {stars != null ? 'RATED ✓ · LESSON COMPLETE' : 'TAP A STAR TO FINISH'}
      </span>
    </div>
  );
}
