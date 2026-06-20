import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { DeviceFrame } from '../components/DeviceFrame';
import { StatusBar } from '../components/StatusBar';
import { BottomNav } from '../components/BottomNav';
import { PulseDot } from '../components/MicIndicator';
import { useSession } from '../session';
import { lessonsForLanguage, type PracticeLesson } from '../data/content';
import { lessonProgress, isLessonUnlockComplete } from '../lib/progress';
import { getUploadedLessonCodes } from '../data/lessonAudio';
import { STEPS } from '../tokens';

function LockIcon({ size = 18 }: { size?: number }) {
  const h = size;
  const w = Math.round(size * 0.78);
  return (
    <svg width={w} height={h} viewBox="0 0 14 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 8V5.5a4 4 0 0 1 8 0V8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect x="1" y="7.5" width="12" height="10" rx="2.5" fill="currentColor" fillOpacity="0.9" />
    </svg>
  );
}

/** Unlocked lesson — progress-aware, tappable. */
function LessonRow({ userId, lesson, onOpen }: { userId: string; lesson: PracticeLesson; onOpen: () => void }) {
  const { completedSteps, currentStep } = lessonProgress(userId, lesson.code);
  const done = completedSteps.length;
  const total = lesson.audioStepCount;
  const finished = total > 0 && done >= total;
  const label = finished
    ? 'complete'
    : (currentStep ?? STEPS[0]).toLowerCase();

  return (
    <button
      onClick={onOpen}
      className="mb-[11px] flex w-full items-center gap-3.5 rounded-2xl border border-emerald bg-cream-panel px-4 py-[15px] text-left"
    >
      <span className="relative flex h-[30px] w-[30px] shrink-0 items-center justify-center">
        {!finished && <span className="absolute inset-0 rounded-full bg-coral/30 animate-pring" />}
        <span className={`relative h-[13px] w-[13px] rounded-full ${finished ? 'bg-emerald' : 'bg-coral'}`} />
      </span>
      <span className="flex-1">
        <span className="block text-[10.5px] font-bold tracking-[.08em] text-coral">
          {lesson.code} · {finished ? 'COMPLETE' : done > 0 ? 'IN PROGRESS' : 'START'}
        </span>
        <span className="block font-serif text-[19px] leading-[1.15] text-heading">{lesson.title}</span>
      </span>
      <span className="text-right">
        <span className="block text-sm font-extrabold text-emerald">
          {done}/{total}
        </span>
        <span className="mt-[2px] block text-[10px] capitalize text-muted">{label}</span>
      </span>
    </button>
  );
}

/** Locked lesson — visible but not enterable. Tapping does nothing. */
function LockedLessonRow({ lesson }: { lesson: PracticeLesson }) {
  return (
    <div className="relative mb-[11px] overflow-hidden rounded-2xl border border-teal/[.12] bg-cream-panel/30 px-4 py-[15px]">
      <div className="flex items-center gap-3.5">
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-teal/[.15]">
          <span className="h-[11px] w-[11px] rounded-full bg-teal/20" />
        </span>
        <span className="flex-1">
          <span className="block text-[10.5px] font-bold tracking-[.08em] text-muted/40">
            {lesson.code}
          </span>
          <span className="block font-serif text-[19px] leading-[1.15] text-heading/35">{lesson.title}</span>
        </span>
        <span className="flex flex-col items-end gap-1.5">
          <span className="h-4 w-7 rounded bg-teal/[.12]" />
          <span className="h-2.5 w-10 rounded bg-teal/[.08]" />
        </span>
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-end rounded-2xl bg-cream/25 pr-4">
        <div className="flex items-center gap-1.5 rounded-full border border-teal/[.22] bg-cream-panel/90 px-3 py-[5px]">
          <span className="text-teal/50"><LockIcon size={12} /></span>
          <span className="text-[10px] font-bold tracking-[.1em] text-teal/50">LOCKED</span>
        </div>
      </div>
    </div>
  );
}

/** Lesson select — the lessons loaded for the signed-in learner's language. */
export function LessonsScreen() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [uploadedCodes, setUploadedCodes] = useState<Set<string> | null>(null);

  useEffect(() => {
    void getUploadedLessonCodes().then(setUploadedCodes);
  }, []);

  if (!user) return <Navigate to="/" replace />;

  const lessons = lessonsForLanguage(user.language);

  return (
    <DeviceFrame tone="light">
      <StatusBar tone="light" />
      <div className="shrink-0 px-6 pb-2 pt-[18px]">
        <div className="text-[11px] font-bold tracking-[.16em] text-muted">{user.language}</div>
        <div className="mt-1 font-serif text-[30px] italic text-heading">Your lessons</div>
      </div>
      <div className="scroll-region flex-1 px-5 pb-5 pt-1.5">
        {lessons.length > 0 ? (
          <>
            {lessons.map((l, i) => {
              const unlocked =
                i === 0 || isLessonUnlockComplete(user.id, lessons[i - 1].code, lessons[i - 1].audioStepCount);

              if (unlocked) {
                return (
                  <LessonRow
                    key={l.code}
                    userId={user.id}
                    lesson={l}
                    onOpen={() => navigate('/practice', { state: { lessonCode: l.code, startAt: 'GRASP' } })}
                  />
                );
              }

              // Locked: only show if audio has been uploaded for this lesson.
              // While the upload-codes fetch is in flight, hide locked rows to
              // avoid a flash of incorrect content.
              if (!uploadedCodes || !uploadedCodes.has(l.code)) return null;

              return <LockedLessonRow key={l.code} lesson={l} />;
            })}
            <div className="mt-2 flex items-center gap-2 px-1 text-[11px] text-muted">
              <PulseDot size={9} />
              Coral marks the lesson you're inside right now.
            </div>
          </>
        ) : (
          <div className="mt-10 px-2 text-center font-serif text-[15px] italic text-muted">
            No lessons are loaded for {user.language} yet.
          </div>
        )}
      </div>
      <BottomNav active="practice" />
    </DeviceFrame>
  );
}
