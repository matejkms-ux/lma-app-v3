import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { DeviceFrame } from '../components/DeviceFrame';
import { StatusBar } from '../components/StatusBar';
import { BottomNav } from '../components/BottomNav';
import { useSession } from '../session';
import { readerLessonsForScope, type ReaderLesson } from '../data/readerLessons';

function fmtDur(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Conversations are grouped into Adventures of 16 (Adv 1 = #1–16, Adv 2 = #17–32, …). */
function adventureOf(sessionNr: number): number {
  return Math.floor((sessionNr - 1) / 16) + 1;
}

/** Tutor name pulled off the lesson title ("Conversation #N with Hannah" → "Hannah"). */
function tutorOf(lessons: ReaderLesson[]): string {
  const m = lessons[0]?.title.match(/with\s+(.+?)\s*$/i);
  return m ? m[1].trim() : '';
}

/** One reader lesson — always enterable (no sequential lock; it's free listening). */
function ReaderRow({ lesson, onOpen }: { lesson: ReaderLesson; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="mb-[11px] flex w-full items-center gap-3.5 rounded-2xl border border-emerald bg-cream-panel px-4 py-[15px] text-left"
    >
      <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-emerald/10 font-serif text-[15px] text-emerald">
        {lesson.sessionNr}
      </span>
      <span className="flex-1">
        <span className="block text-[10.5px] font-bold tracking-[.08em] text-coral">LISTEN &amp; READ</span>
        <span className="block font-serif text-[19px] leading-[1.15] text-heading">{lesson.title}</span>
        <span className="mt-[2px] block text-[10.5px] font-semibold tracking-[.04em] text-muted">
          {fmtDur(lesson.durationSec)} · {lesson.sentences.length} sentences
        </span>
      </span>
      <span className="text-emerald text-xl">→</span>
    </button>
  );
}

/** A course = one Adventure with the tutor; expands to its conversations. */
function CourseSection({
  adventure,
  tutor,
  lessons,
  open,
  onToggle,
  onOpenLesson,
}: {
  adventure: number;
  tutor: string;
  lessons: ReaderLesson[];
  open: boolean;
  onToggle: () => void;
  onOpenLesson: (l: ReaderLesson) => void;
}) {
  return (
    <div className="mb-3.5">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3.5 rounded-2xl border border-emerald/40 bg-emerald/[.07] px-4 py-[14px] text-left"
      >
        <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-emerald font-serif text-[16px] text-cream">
          {adventure}
        </span>
        <span className="flex-1">
          <span className="block text-[10.5px] font-bold tracking-[.12em] text-coral">
            ADVENTURE {adventure}
          </span>
          <span className="block font-serif text-[20px] leading-[1.1] text-heading">
            {tutor ? `with ${tutor}` : 'Conversations'}
          </span>
          <span className="mt-[2px] block text-[10.5px] font-semibold tracking-[.04em] text-muted">
            {lessons.length} {lessons.length === 1 ? 'conversation' : 'conversations'}
          </span>
        </span>
        <span className="text-emerald text-lg">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="mt-2.5 pl-3">
          {lessons.map((l) => (
            <ReaderRow key={l.code} lesson={l} onOpen={() => onOpenLesson(l)} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Reader mode — listen-then-read conversations, grouped into Adventures (courses). */
export function ReaderScreen() {
  const navigate = useNavigate();
  const { user } = useSession();

  const lessons = readerLessonsForScope(user?.username ?? '');

  // Group conversations into Adventures, newest first.
  const byAdventure = new Map<number, ReaderLesson[]>();
  for (const l of lessons) {
    const a = adventureOf(l.sessionNr);
    if (!byAdventure.has(a)) byAdventure.set(a, []);
    byAdventure.get(a)!.push(l);
  }
  const adventures = [...byAdventure.keys()].sort((a, b) => b - a);
  const latest = adventures[0];

  // The newest adventure is expanded by default; earlier ones collapse.
  const [openSet, setOpenSet] = useState<Set<number>>(() => new Set(latest ? [latest] : []));
  const toggle = (a: number) =>
    setOpenSet((prev) => {
      const next = new Set(prev);
      next.has(a) ? next.delete(a) : next.add(a);
      return next;
    });

  if (!user) return <Navigate to="/" replace />;

  return (
    <DeviceFrame tone="light">
      <StatusBar tone="light" />
      <div className="shrink-0 px-6 pb-2 pt-[18px]">
        <div className="text-[11px] font-bold tracking-[.16em] text-muted">{user.language} · READER</div>
        <div className="mt-1 font-serif text-[30px] italic text-heading">Listen &amp; read</div>
      </div>
      <div className="scroll-region flex-1 px-5 pb-5 pt-1.5">
        {lessons.length === 0 ? (
          <div className="mt-10 px-2 text-center font-serif text-[15px] italic text-muted">
            No reader lessons yet for {user.name}.
          </div>
        ) : (
          <>
            {adventures.map((a) => {
              const group = byAdventure.get(a)!;
              return (
                <CourseSection
                  key={a}
                  adventure={a}
                  tutor={tutorOf(group)}
                  lessons={group}
                  open={openSet.has(a)}
                  onToggle={() => toggle(a)}
                  onOpenLesson={(l) => navigate('/reader-lesson', { state: { code: l.code } })}
                />
              );
            })}
            <div className="mt-2 px-1 text-[11px] text-muted">
              Listen to the whole conversation first, then read it sentence by sentence.
            </div>
          </>
        )}
      </div>
      <BottomNav active="read" />
    </DeviceFrame>
  );
}
