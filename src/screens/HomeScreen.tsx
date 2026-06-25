import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DeviceFrame } from '../components/DeviceFrame';
import { StatusBar } from '../components/StatusBar';
import { BottomNav } from '../components/BottomNav';
import { getLessonCatalog, lessonsForUser } from '../data/content';
import { lessonProgress, lifetimeReps, repsToday, isLessonUnlockComplete, getStepStars } from '../lib/progress';
import { STEPS, AUDIO_STEPS } from '../tokens';
import { useSession } from '../session';
import { displayName } from '../data/mock';

/** Home — the adventure. Warm greeting, reps (now real) as the hero, current step, CTA. */
export function HomeScreen() {
  const navigate = useNavigate();
  const { user } = useSession();
  const name = user ? displayName(user) : 'adventurer';
  const language = user?.language ?? 'JAPANESE';

  const scope = user?.username ?? '';
  const [lessons, setLessons] = useState(() => lessonsForUser(scope));
  useEffect(() => {
    if (scope) void getLessonCatalog(scope).then(setLessons);
  }, [scope]);
  const lesson = lessons[0];
  const reps = user ? lifetimeReps(user.id) : 0;
  const today = user ? repsToday(user.id) : 0;

  const available = lesson ? STEPS.filter((s) => lesson.audio[s]) : [];
  const progress = user && lesson ? lessonProgress(user.id, lesson.code) : null;
  const doneCount = progress ? available.filter((s) => progress.completedSteps.includes(s)).length : 0;
  const currentIdx = Math.min(doneCount, Math.max(0, available.length - 1));

  // Real progress stats — only lessons with audio count toward "passed"
  const practicableLessons = lessons.filter((l) => l.audioStepCount > 0);
  const lessonsPassed = user
    ? practicableLessons.filter((l) => isLessonUnlockComplete(user.id, l.code, l.audioStepCount)).length
    : 0;
  const allRatedStars = user
    ? lessons.flatMap((l) =>
        AUDIO_STEPS.map((s) => getStepStars(user.id, l.code, s)).filter((v): v is number => v !== null),
      )
    : [];
  const avgGrade =
    allRatedStars.length > 0
      ? (allRatedStars.reduce((sum, s) => sum + s, 0) / allRatedStars.length).toFixed(1)
      : null;

  const openPractice = () => {
    if (lesson) navigate('/practice', { state: { lessonCode: lesson.code } });
    else navigate('/lessons');
  };

  return (
    <DeviceFrame tone="light">
      <StatusBar tone="light" />

      <div className="scroll-region flex-1 px-6 pb-5 pt-3.5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold tracking-[.04em] text-muted">{language}</div>
            <div className="mt-[7px] font-serif text-[32px] italic leading-[1.06] text-heading">
              Welcome back,
              <br />
              {name}.
            </div>
          </div>
          <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-emerald font-serif text-lg text-teal">
            {(user?.calledName ?? user?.firstName ?? name)[0]}
          </span>
        </div>

        {/* Hero: reps (real) */}
        <div className="mt-[22px] rounded-[22px] border border-rule bg-cream-panel px-5 py-[22px]">
          <div className="text-[11px] font-bold tracking-[.14em] text-muted">REPS GATHERED</div>
          <div className="mt-1.5 flex items-baseline gap-3">
            <div className="text-[62px] font-extrabold leading-[.9] tracking-[-.02em] text-emerald">{reps}</div>
            {today > 0 && <div className="text-sm font-bold text-coral">+{today} today</div>}
          </div>
          <div className="mt-[7px] font-serif text-sm italic text-muted">
            Every take is a rep. The reps are the road.
          </div>
        </div>

        {/* Continue lesson */}
        {lesson && (
          <button
            onClick={openPractice}
            className="mt-3.5 w-full rounded-[18px] border border-rule bg-white p-4 text-left"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-[.14em] text-muted">
                {doneCount > 0 ? 'CONTINUE' : 'START'} · {lesson.code}
              </span>
              <span className="text-[11px] font-semibold text-muted">
                {doneCount} / {available.length}
              </span>
            </div>
            <div className="mt-[5px] font-serif text-[22px] text-heading">{lesson.title}</div>
            <div className="mt-3 flex gap-[5px]">
              {available.map((_, i) => (
                <div
                  key={i}
                  className={`h-[5px] flex-1 rounded-[3px] ${i < doneCount ? 'bg-emerald' : 'bg-rule'}`}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[9.5px] font-semibold tracking-[.04em]">
              {available.map((s, i) => (
                <span
                  key={s}
                  className={
                    i === currentIdx ? 'font-extrabold text-heading' : i < doneCount ? 'text-muted' : 'text-locked'
                  }
                >
                  {s}
                </span>
              ))}
            </div>
          </button>
        )}

        {/* Stats — real values from progress store */}
        <div className="mt-3.5 flex gap-3">
          <div className="flex-1 rounded-[18px] border border-rule bg-white p-3.5">
            <div className="text-[10px] font-bold tracking-[.1em] text-muted">LESSONS PASSED</div>
            <div className="mt-[3px] font-serif text-lg text-heading">
              {lessonsPassed} of {practicableLessons.length}
            </div>
          </div>
          <div className="flex-1 rounded-[18px] border border-rule bg-white p-3.5">
            <div className="text-[10px] font-bold tracking-[.1em] text-muted">AVG GRADE</div>
            <div className="mt-[3px] font-serif text-lg text-heading">
              {avgGrade !== null ? `${avgGrade}★` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="-mt-5 bg-gradient-to-t from-cream from-40% to-transparent px-6 pb-3">
        <button
          onClick={openPractice}
          className="w-full rounded-[15px] bg-emerald py-4 text-[15px] font-bold tracking-[.01em] text-cream"
        >
          {lesson && doneCount > 0 ? 'Continue practice →' : 'Start practice →'}
        </button>
      </div>

      <BottomNav active="home" />
    </DeviceFrame>
  );
}
