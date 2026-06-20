import { Navigate } from 'react-router-dom';
import { DeviceFrame } from '../components/DeviceFrame';
import { StatusBar } from '../components/StatusBar';
import { BottomNav } from '../components/BottomNav';
import { SENTENCES, type Sentence } from '../data/mock';
import { getSentences } from '../data/api';
import { useAsync } from '../lib/useAsync';
import { useSession } from '../session';
import { lessonsForLanguage } from '../data/content';

function Summary() {
  const cells = [
    { v: '—', l: 'PASSED' },
    { v: '—', l: 'AVG SCORE' },
    { v: '—', l: 'REPS' },
  ];
  return (
    <div className="flex shrink-0 gap-2.5 px-5 pb-1.5 pt-2.5">
      {cells.map((c) => (
        <div key={c.l} className="flex-1 rounded-[14px] border border-rule bg-white px-2 py-3 text-center">
          <div className="text-[22px] font-extrabold leading-none text-emerald">{c.v}</div>
          <div className="mt-1 text-[9px] font-semibold tracking-[.06em] text-muted">{c.l}</div>
        </div>
      ))}
    </div>
  );
}

function SentenceStars({ value, dim }: { value: number; dim?: boolean }) {
  return (
    <span className="text-[11px] tracking-[.5px]">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= value ? (dim ? 'text-star-empty' : 'text-emerald') : 'text-star-empty'}>
          ★
        </span>
      ))}
    </span>
  );
}

function Row({ s, last }: { s: Sentence; last: boolean }) {
  if (s.status === 'active') {
    return (
      <div className="-mx-2.5 my-1 flex items-center gap-3 rounded-xl bg-[#FBF1E9] px-2.5 py-3">
        <span className="relative flex h-[22px] w-[22px] shrink-0 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-coral/[.28] animate-pring" />
          <span className="relative h-[11px] w-[11px] rounded-full bg-coral" />
        </span>
        <div className="flex-1">
          <div className="font-jp text-[15px] text-heading">{s.l2}</div>
          <div className="text-[10px] font-bold text-coral">In progress</div>
        </div>
        <span className="text-[11px] tracking-[.5px] text-locked">— — — — —</span>
      </div>
    );
  }
  if (s.status === 'locked') {
    return (
      <div className={`flex items-center gap-3 py-[11px] opacity-55 ${last ? '' : 'border-b border-rule-soft'}`}>
        <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-locked text-[10px]">
          🔒
        </span>
        <div className="flex-1">
          <div className="font-jp text-[15px] text-heading">{s.l2}</div>
          <div className="text-[10px] text-muted">{s.l1}</div>
        </div>
        <SentenceStars value={5} dim />
      </div>
    );
  }
  return (
    <div className={`flex items-center gap-3 py-[11px] ${last ? '' : 'border-b border-rule-soft'}`}>
      <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-emerald text-[11px] text-cream">
        ✓
      </span>
      <div className="flex-1">
        <div className="font-jp text-[15px] text-heading">{s.l2}</div>
        <div className="text-[10px] text-muted">{s.l1}</div>
      </div>
      <SentenceStars value={s.stars} />
    </div>
  );
}

/** Lesson overview & grades — the sentences with status + star grade. */
export function OverviewScreen() {
  const { user } = useSession();
  const lesson = user ? lessonsForLanguage(user.language)[0] : undefined;
  const lessonCode = lesson?.code ?? '';
  const { data: sentences } = useAsync(() => getSentences(lessonCode), SENTENCES);

  if (!user) return <Navigate to="/" replace />;

  return (
    <DeviceFrame tone="light">
      <StatusBar tone="light" />
      <div className="shrink-0 px-6 pb-1 pt-4">
        <div className="text-[11px] font-bold tracking-[.12em] text-muted">{lessonCode} · {user.language}</div>
        <div className="mt-1 font-serif text-[28px] italic text-heading">{lesson?.title ?? 'Lesson'}</div>
      </div>
      <Summary />
      <div className="scroll-region flex-1 px-5 pb-5 pt-1">
        {sentences.map((s, i) => (
          <Row key={s.id} s={s} last={i === sentences.length - 1} />
        ))}
      </div>
      <BottomNav active="practice" />
    </DeviceFrame>
  );
}
