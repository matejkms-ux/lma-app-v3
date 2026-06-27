import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { DeviceFrame } from '../components/DeviceFrame';
import { StatusBar } from '../components/StatusBar';
import { BottomNav } from '../components/BottomNav';
import { PulseDot } from '../components/MicIndicator';
import { useSession } from '../session';
import { getLessonCatalog, type PracticeLesson } from '../data/content';
// scope = the learner's username (lesson-code prefix)
import { lessonProgress, isLessonUnlockComplete } from '../lib/progress';
import { getCompletedFreestyleLessons } from '../lib/recordings';
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
function LessonRow({
  userId,
  lesson,
  freestyleDone,
  onOpen,
}: {
  userId: string;
  lesson: PracticeLesson;
  freestyleDone?: boolean;
  onOpen: () => void;
}) {
  const { completedSteps, currentStep } = lessonProgress(userId, lesson.code);
  // The counter is over the SIX canonical steps (GRASP→…→FREESTYLE), matching the
  // player's "X/6" — so every lesson reads /6 regardless of how many clips it has.
  const total = STEPS.length;
  const audioTotal = lesson.audioStepCount;
  const completedCount = Math.min(completedSteps.length, audioTotal) + (freestyleDone ? 1 : 0);
  const finished = completedCount >= total || (audioTotal > 0 && completedCount >= audioTotal + 1);
  // Numerator = current step position (1-based), so a fresh lesson shows 1/6.
  const position = finished ? total : STEPS.indexOf(currentStep ?? STEPS[0]) + 1;
  const done = position;
  const label = finished ? 'complete' : (currentStep ?? STEPS[0]).toLowerCase();
  const renamed = !!lesson.defaultTitle && lesson.title !== lesson.defaultTitle;

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
        {renamed && (
          <span className="mt-[2px] block text-[10.5px] font-semibold tracking-[.04em] text-muted">
            {lesson.defaultTitle}
          </span>
        )}
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

/**
 * Locked lesson — visible but not enterable. Two reasons:
 *  - sequential lock (finish the previous lesson first) → "LOCKED"
 *  - no audio yet (not recorded) → "COMING SOON" — a learner must NEVER be able to
 *    enter a voiceless lesson, so these are locked even if the previous is done.
 */
function LockedLessonRow({ lesson, comingSoon = false }: { lesson: PracticeLesson; comingSoon?: boolean }) {
  const renamed = !!lesson.defaultTitle && lesson.title !== lesson.defaultTitle;
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
          {renamed && (
            <span className="mt-[2px] block text-[10.5px] font-semibold tracking-[.04em] text-muted/40">
              {lesson.defaultTitle}
            </span>
          )}
        </span>
        <span className="flex flex-col items-end gap-1.5">
          <span className="h-4 w-7 rounded bg-teal/[.12]" />
          <span className="h-2.5 w-10 rounded bg-teal/[.08]" />
        </span>
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-end rounded-2xl bg-cream/25 pr-4">
        <div className="flex items-center gap-1.5 rounded-full border border-teal/[.22] bg-cream-panel/90 px-3 py-[5px]">
          {!comingSoon && <span className="text-teal/50"><LockIcon size={12} /></span>}
          <span className="text-[10px] font-bold tracking-[.1em] text-teal/50">
            {comingSoon ? 'COMING SOON' : 'LOCKED'}
          </span>
        </div>
      </div>
    </div>
  );
}

/** A labeled divider separating lesson groups (Bonus vs the main path). */
function GroupLabel({ children }: { children: string }) {
  return (
    <div className="mb-2 mt-1 flex items-center gap-3 px-1">
      <span className="shrink-0 text-[10.5px] font-bold uppercase tracking-[.16em] text-muted">{children}</span>
      <span className="h-px flex-1 bg-rule" />
    </div>
  );
}

/** Lesson select — the lessons loaded for the signed-in learner's language. */
export function LessonsScreen() {
  const navigate = useNavigate();
  const { user } = useSession();
  // null = still loading; [] = loaded, none for this language.
  const [lessons, setLessons] = useState<PracticeLesson[] | null>(null);
  const [freestyleDone, setFreestyleDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    void getLessonCatalog(user.username ?? '').then(setLessons);
    void getCompletedFreestyleLessons(user.id).then(setFreestyleDone);
  }, [user?.id, user?.username]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return <Navigate to="/" replace />;

  return (
    <DeviceFrame tone="light">
      <StatusBar tone="light" />
      <div className="shrink-0 px-6 pb-2 pt-[18px]">
        <div className="text-[11px] font-bold tracking-[.16em] text-muted">{user.language}</div>
        <div className="mt-1 font-serif text-[30px] italic text-heading">Your lessons</div>
      </div>
      <div className="scroll-region flex-1 px-5 pb-5 pt-1.5">
        {lessons === null ? (
          <div className="mt-10 px-2 text-center font-serif text-[15px] italic text-muted">Loading…</div>
        ) : lessons.length === 0 ? (
          <div className="mt-10 px-2 text-center font-serif text-[15px] italic text-muted">
            No lessons are loaded for {user.language} yet.
          </div>
        ) : (
          <>
            {(() => {
              // A lesson must have VOICE to be entered — never walk a learner into a
              // voiceless lesson (empty "AUDIO COMING SOON").
              const renderRow = (l: PracticeLesson, unlocked: boolean) =>
                l.audioStepCount > 0 && unlocked ? (
                  <LessonRow
                    key={l.code}
                    userId={user.id}
                    lesson={l}
                    freestyleDone={freestyleDone.has(l.code)}
                    onOpen={() => navigate('/practice', { state: { lessonCode: l.code, startAt: 'GRASP' } })}
                  />
                ) : (
                  <LockedLessonRow key={l.code} lesson={l} comingSoon={l.audioStepCount === 0} />
                );

              const bonus = lessons.filter((l) => l.bonus);
              const main = lessons.filter((l) => !l.bonus);
              return (
                <>
                  {/* Bonus lessons — their own group, always open (off the main path). */}
                  {bonus.length > 0 && (
                    <>
                      <GroupLabel>Bonus · jederzeit offen</GroupLabel>
                      {bonus.map((l) => renderRow(l, true))}
                      <GroupLabel>Deine Lektionen</GroupLabel>
                    </>
                  )}
                  {/* Main path — unlocks sequentially, once the previous lesson is complete. */}
                  {main.map((l, i) => {
                    const prev = main[i - 1];
                    const unlocked =
                      !prev || isLessonUnlockComplete(user.id, prev.code, prev.audioStepCount);
                    return renderRow(l, unlocked);
                  })}
                </>
              );
            })()}

            {/* Final reading test — German only */}
            {user.language === 'GERMAN' && (
              <button
                onClick={() => navigate('/reading-test')}
                className="mb-[11px] mt-3 flex w-full items-center gap-3.5 rounded-2xl border-2 border-emerald bg-emerald px-4 py-[15px] text-left"
              >
                <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-white/20 text-[15px]">
                  📖
                </span>
                <span className="flex-1">
                  <span className="block text-[10.5px] font-bold tracking-[.08em] text-teal">
                    FINAL TEST · ADVENTURE 1
                  </span>
                  <span className="block font-serif text-[19px] leading-[1.15] text-cream">
                    Read &amp; Respond
                  </span>
                  <span className="block text-[11px] text-teal">
                    3,000 words · 20 min timer
                  </span>
                </span>
                <span className="text-cream/70 text-xl">→</span>
              </button>
            )}

            <div className="mt-2 flex items-center gap-2 px-1 text-[11px] text-muted">
              <PulseDot size={9} />
              Coral marks the lesson you're inside right now.
            </div>
          </>
        )}
      </div>
      <BottomNav active="practice" />
    </DeviceFrame>
  );
}
