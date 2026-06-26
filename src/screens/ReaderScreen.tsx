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
        <span className="block text-[10.5px] font-bold tracking-[.08em] text-coral">
          LISTEN &amp; READ
        </span>
        <span className="block font-serif text-[19px] leading-[1.15] text-heading">{lesson.title}</span>
        <span className="mt-[2px] block text-[10.5px] font-semibold tracking-[.04em] text-muted">
          {fmtDur(lesson.durationSec)} · {lesson.sentences.length} sentences
        </span>
      </span>
      <span className="text-emerald text-xl">→</span>
    </button>
  );
}

/** Reader mode — listen-then-read conversations (her LingQ sessions with Hannah). */
export function ReaderScreen() {
  const navigate = useNavigate();
  const { user } = useSession();
  if (!user) return <Navigate to="/" replace />;

  const lessons = readerLessonsForScope(user.username ?? '');

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
            {lessons.map((l) => (
              <ReaderRow
                key={l.code}
                lesson={l}
                onOpen={() => navigate('/reader-lesson', { state: { code: l.code } })}
              />
            ))}
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
