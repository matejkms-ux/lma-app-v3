import { useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { DeviceFrame } from '../components/DeviceFrame';
import { StatusBar } from '../components/StatusBar';
import { useSession } from '../session';
import { finalProgramFor } from '../data/finalContent';
import { getWriting, setWriting, markModuleDone } from '../lib/finalProgress';

export function FinalWritingScreen() {
  const navigate = useNavigate();
  const { user } = useSession();
  const program = useMemo(() => finalProgramFor(user?.username), [user?.username]);
  const writing = program?.writing ?? null;
  const language = program?.language ?? '';

  const [text, setText] = useState(() => (user ? getWriting(user.id, user.username ?? '') : ''));
  const [done, setDone] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  if (!user) return <Navigate to="/" replace />;

  if (!writing) {
    return (
      <DeviceFrame tone="light">
        <StatusBar tone="light" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="font-serif text-2xl italic text-heading">No writing task yet</div>
          <button onClick={() => navigate('/final')} className="rounded-full border border-rule px-5 py-2 text-[12px] font-bold tracking-[.08em] text-muted">‹ BACK</button>
        </div>
      </DeviceFrame>
    );
  }

  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const enough = words >= writing.minWords;

  const save = (t: string) => {
    setText(t);
    setWriting(user.id, user.username ?? '', t);
  };

  if (done) {
    return (
      <DeviceFrame tone="light">
        <StatusBar tone="light" />
        <div className="flex flex-1 flex-col items-center justify-center px-7 pb-10 text-center">
          <div className="text-[42px]">✍️</div>
          <div className="mt-4 font-serif text-[28px] italic leading-snug text-heading">Saved, {user.calledName ?? user.firstName ?? 'Neal'}.</div>
          <p className="mt-3 text-[14px] leading-[1.65] text-muted">{words} words written. Bring this to your final session.</p>
          <div className="mt-7 w-full rounded-2xl border border-rule bg-cream-panel p-5 text-left">
            <div className="text-[10px] font-bold tracking-[.14em] text-muted">YOUR WRITING</div>
            <p className="mt-2 whitespace-pre-wrap text-[14px] leading-[1.65] text-heading">{text}</p>
          </div>
        </div>
        <div className="px-5 pb-5">
          <button onClick={() => navigate('/final')} className="w-full rounded-[15px] bg-emerald py-4 text-[15px] font-bold tracking-[.01em] text-cream">Done</button>
        </div>
      </DeviceFrame>
    );
  }

  return (
    <DeviceFrame tone="light">
      <StatusBar tone="light" />
      <div className="scroll-region flex-1 px-5 pb-6 pt-[16px]">
        <div className="text-[10px] font-bold tracking-[.16em] text-muted">{language} · FINAL WRITING</div>
        <div className="mt-1 font-serif text-[26px] italic leading-tight text-heading">{writing.title}</div>
        <p className="mt-3 rounded-2xl border border-rule bg-cream-panel p-4 text-[15px] leading-[1.6] text-heading">
          {writing.prompt}
        </p>
        <p className="mt-2 text-[12px] leading-[1.5] text-muted">{writing.helper}</p>
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => save(e.target.value)}
          placeholder="…"
          className="mt-4 min-h-[240px] w-full resize-none rounded-2xl border border-rule bg-white p-4 text-[15px] leading-[1.65] text-heading placeholder:text-locked focus:border-emerald focus:outline-none"
        />
        <p className="mt-2 text-right text-[11px] text-muted">
          {words} words{!enough && ` · ${writing.minWords} min`}
        </p>
      </div>
      <div className="-mt-5 bg-gradient-to-t from-cream from-40% to-transparent px-5 pb-4 pt-2">
        <button
          onClick={() => { markModuleDone(user.id, user.username ?? '', 'writing'); setDone(true); }}
          disabled={!enough}
          className="w-full rounded-[15px] bg-emerald py-4 text-[15px] font-bold tracking-[.01em] text-cream disabled:opacity-40"
        >
          Save &amp; finish →
        </button>
      </div>
    </DeviceFrame>
  );
}
