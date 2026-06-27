import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DeviceFrame } from '../components/DeviceFrame';
import { StatusBar } from '../components/StatusBar';
import { BottomNav } from '../components/BottomNav';
import { getLessonCatalog, lessonsForUser } from '../data/content';
import { lessonProgress, lifetimeReps, repsToday } from '../lib/progress';
import { STEPS } from '../tokens';
import { useSession } from '../session';
import { displayName } from '../data/mock';
import { adventureStatus, adventureEndLabel } from '../data/adventure';
import { finalProgramFor } from '../data/finalContent';

/** Tailwind classes for the small adventure status chip, keyed by phase. */
const PHASE_CHIP: Record<string, string> = {
  active: 'bg-emerald text-teal',
  upcoming: 'bg-rule text-muted',
  completed: 'bg-coral/15 text-coral',
  paused: 'bg-rule text-muted',
};

/** Home — the adventure. Warm greeting, reps (now real) as the hero, current step, CTA. */
export function HomeScreen() {
  const navigate = useNavigate();
  const { user } = useSession();
  const name = user ? displayName(user) : 'adventurer';
  const language = user?.language ?? 'JAPANESE';
  const adventure = adventureStatus(user?.adventure);

  const scope = user?.username ?? '';
  const [lessons, setLessons] = useState(() => lessonsForUser(scope));
  useEffect(() => {
    if (scope) void getLessonCatalog(scope).then(setLessons);
  }, [scope]);
  // Bonus lessons live in their own group and never drive the main "Continue" CTA
  // or the lessons-passed count — those track the real adventure path only.
  const mainLessons = lessons.filter((l) => !l.bonus);
  const lesson = mainLessons[0];
  const reps = user ? lifetimeReps(user.id) : 0;
  const today = user ? repsToday(user.id) : 0;

  // Adventurer's own live room (participant) — username minus language, lowercased.
  const sessionId = (user?.username ?? '').replace(/-[a-z]{2}$/i, '').toLowerCase();
  const videoUrl = sessionId ? `https://lma-video-app.netlify.app/session/${sessionId}` : null;

  // The practice flow walks all canonical STEPS (the in-lesson counter is X/6); the
  // catalog lesson carries no per-step audio map, so count progress over STEPS here
  // (using lesson.audio would always be 0/0).
  const available = lesson ? STEPS : [];
  const progress = user && lesson ? lessonProgress(user.id, lesson.code) : null;
  const doneCount = progress ? available.filter((s) => progress.completedSteps.includes(s)).length : 0;
  const currentIdx = Math.min(doneCount, Math.max(0, available.length - 1));

  const finalProgram = finalProgramFor(user?.username);

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
            <div className="flex items-center gap-2 text-xs font-semibold tracking-[.04em] text-muted">
              <span>
                {language}
                {adventure && <span className="text-coral"> · {adventure.label}</span>}
              </span>
              {adventure && (
                <span
                  className={`rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-[.08em] ${PHASE_CHIP[adventure.phase] ?? PHASE_CHIP.upcoming}`}
                >
                  {adventure.pill}
                </span>
              )}
            </div>
            {adventure && (adventure.languagePair || adventureEndLabel(user?.adventure)) && (
              <div className="mt-[3px] text-[10px] font-semibold text-muted">
                {adventure.languagePair}
                {adventure.languagePair && adventureEndLabel(user?.adventure) && ' · '}
                {adventureEndLabel(user?.adventure)}
              </div>
            )}
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

        {/* Previous adventures — appears once the learner has finished at least one */}
        {adventure && adventure.history.length > 0 && (
          <div className="mt-3.5 rounded-[18px] border border-rule bg-white px-4 py-3.5">
            <div className="text-[10px] font-bold tracking-[.1em] text-muted">PREVIOUS ADVENTURES</div>
            <div className="mt-1.5 space-y-1">
              {adventure.history.map((h) => (
                <div key={h.number} className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-heading">
                    Adventure {h.number}
                    {h.languageTo && <span className="font-normal text-muted"> · {h.languageTo}</span>}
                  </span>
                  <span className="text-muted">
                    {h.endDate
                      ? new Date(`${h.endDate}T00:00:00`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                      : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

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

        {/* Final App — the capstone; sits right under practice so it's easy to reach.
            Only for learners with a final program loaded. */}
        {finalProgram && (
          <button
            onClick={() => navigate('/final')}
            className="mt-3.5 flex w-full items-center gap-3 rounded-[18px] border border-rule bg-white p-4 text-left active:scale-[.99]"
          >
            <span className="text-[26px]">🏁</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold tracking-[.14em] text-muted">FINAL WEEK</span>
              <span className="mt-[3px] block font-serif text-[18px] text-heading">The final week</span>
              <span className="block truncate text-[12px] text-muted">
                Read · Podcast · Writing · Conversation · Session
              </span>
            </span>
            <span className="text-muted">›</span>
          </button>
        )}

        {/* Live session — opens the adventurer's own room (participant) in the video app */}
        {videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener"
            className="mt-3.5 flex w-full items-center justify-between rounded-[18px] border border-rule bg-white p-4"
          >
            <div>
              <div className="text-[11px] font-bold tracking-[.14em] text-muted">LIVE SESSION</div>
              <div className="mt-[5px] font-serif text-[18px] text-heading">Join your video session</div>
            </div>
            <span className="text-sm font-bold text-coral">Join →</span>
          </a>
        )}

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
