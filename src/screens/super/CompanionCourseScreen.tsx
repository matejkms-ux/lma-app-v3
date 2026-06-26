import { useNavigate } from 'react-router-dom';
import { SuperShell } from '../../superapp/SuperShell';
import {
  COMPANION_LESSONS,
  COMPANION_UNIT_ORDER,
  CURRENT_COMPANION_LESSON,
  type CompanionLesson,
} from '../../data/superApp';
import { colors } from '../../tokens';

/**
 * C1 · Companion course — the audio-first ladder. A continue card jumps into the
 * current lesson; below it the lessons are grouped by unit with done / current /
 * locked affordances. Lessons before the current one are done, the current one
 * pulses, later ones are locked.
 */
type LessonState = 'done' | 'current' | 'locked';
const stateOf = (n: number): LessonState =>
  n < CURRENT_COMPANION_LESSON ? 'done' : n === CURRENT_COMPANION_LESSON ? 'current' : 'locked';

export function CompanionCourseScreen() {
  const navigate = useNavigate();
  const goPlayer = () => navigate('/companion/play');

  return (
    <SuperShell tab="companion" tone="light">
      <div className="scroll-region flex-1 bg-cream px-[22px] pb-7 pt-[60px]">
        <div className="text-[12px] font-semibold uppercase tracking-[.12em] text-muted">Companion · Khmer</div>
        <div className="mt-1.5 font-serif text-[30px] font-medium leading-[1.05] text-heading">Speak before you read</div>
        <div className="mt-2 text-[13.5px] text-muted">30 lessons · ~10 min each · ~5 hrs</div>

        {/* Continue card */}
        <button
          onClick={goPlayer}
          className="mt-5 flex w-full items-center justify-between rounded-[18px] bg-coral p-[22px] text-left"
        >
          <div>
            <div className="text-[11.5px] font-bold uppercase tracking-[.1em] text-white/85">Continue · Lesson 4</div>
            <div className="mt-[5px] font-serif text-[24px] text-white">At the market</div>
            <div className="mt-1 text-[12.5px] text-white/85">10 min · 3 of 14 phrases</div>
          </div>
          <span className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full bg-white/[.18]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>

        {/* Units */}
        {COMPANION_UNIT_ORDER.map((unit) => {
          const lessons = COMPANION_LESSONS.filter((l) => l.u === unit);
          return (
            <div key={unit} className="mt-[26px]">
              <div className="mb-2.5 text-[11.5px] font-bold uppercase tracking-[.12em] text-teal-dim">{unit}</div>
              <div className="flex flex-col gap-2">
                {lessons.map((l) => (
                  <LessonRow key={l.n} lesson={l} onOpen={goPlayer} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </SuperShell>
  );
}

function LessonRow({ lesson, onOpen }: { lesson: CompanionLesson; onOpen: () => void }) {
  const st = stateOf(lesson.n);
  const locked = st === 'locked';
  const numColor = locked ? colors.locked : st === 'current' ? colors.coral : colors.heading;
  const themeColor = locked ? colors.locked : colors.heading;

  return (
    <button
      onClick={locked ? undefined : onOpen}
      className="flex items-center gap-3.5 rounded-[14px] border border-rule bg-cream-panel px-4 py-3.5 text-left"
    >
      <div className="w-6 text-center font-serif text-[20px]" style={{ color: numColor }}>
        {lesson.n}
      </div>
      <div className="flex-1">
        <div className="text-[15px] font-medium" style={{ color: themeColor }}>
          {lesson.theme}
        </div>
        <div className="mt-0.5 text-[12px] text-muted">{lesson.dur}</div>
      </div>
      {st === 'done' && (
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-emerald2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}
      {st === 'current' && <span className="animate-pulse h-[9px] w-[9px] rounded-full bg-coral" />}
      {locked && (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={colors.locked} strokeWidth="2">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      )}
    </button>
  );
}
