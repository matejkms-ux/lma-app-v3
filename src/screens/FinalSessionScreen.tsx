import { useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { DeviceFrame } from '../components/DeviceFrame';
import { StatusBar } from '../components/StatusBar';
import { useSession } from '../session';
import { finalProgramFor } from '../data/finalContent';
import { getModuleDone, markModuleDone } from '../lib/finalProgress';

/**
 * Final Session — the live capstone. Confirms the learner has worked the other
 * modules, then drops them into the live video room. Per-adventurer note + room.
 */
export function FinalSessionScreen() {
  const navigate = useNavigate();
  const { user } = useSession();
  const program = useMemo(() => finalProgramFor(user?.username), [user?.username]);
  const session = program?.session ?? null;
  const language = program?.language ?? '';

  if (!user) return <Navigate to="/" replace />;

  if (!session) {
    return (
      <DeviceFrame tone="light">
        <StatusBar tone="light" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="font-serif text-2xl italic text-heading">No session yet</div>
          <button onClick={() => navigate('/final')} className="rounded-full border border-rule px-5 py-2 text-[12px] font-bold tracking-[.08em] text-muted">‹ BACK</button>
        </div>
      </DeviceFrame>
    );
  }

  const done = getModuleDone(user.id, user.username ?? '');
  const prep: { key: 'read' | 'podcast' | 'writing' | 'conversation'; label: string }[] = [
    { key: 'read', label: 'Final reading' },
    { key: 'podcast', label: 'Podcast' },
    { key: 'writing', label: 'Writing' },
    { key: 'conversation', label: 'Conversation' },
  ];

  return (
    <DeviceFrame tone="light">
      <StatusBar tone="light" />
      <div className="scroll-region flex-1 px-5 pb-6 pt-[16px]">
        <div className="text-[10px] font-bold tracking-[.16em] text-muted">{language} · FINAL SESSION</div>
        <div className="mt-1 font-serif text-[28px] italic leading-tight text-heading">{session.title}</div>
        <p className="mt-3 text-[15px] leading-[1.6] text-heading">{session.note}</p>

        <div className="mt-6 text-[11px] font-bold tracking-[.12em] text-muted">YOUR PREP</div>
        <div className="mt-2 flex flex-col gap-2">
          {prep.map((p) => (
            <div key={p.key} className="flex items-center gap-3 rounded-[14px] border border-rule bg-cream-panel px-4 py-3">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${done[p.key] ? 'bg-emerald text-cream' : 'bg-rule text-muted'}`}>
                {done[p.key] ? '✓' : ''}
              </span>
              <span className="text-[14px] text-heading">{p.label}</span>
              <span className="ml-auto text-[11px] font-semibold text-muted">{done[p.key] ? 'done' : 'pending'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 pb-5">
        <button
          onClick={() => { markModuleDone(user.id, user.username ?? '', 'session'); navigate(session.roomPath); }}
          className="w-full rounded-[15px] bg-emerald py-4 text-[15px] font-bold tracking-[.01em] text-cream"
        >
          Join the live room →
        </button>
        <button
          onClick={() => navigate('/final')}
          className="mt-2 w-full rounded-[15px] border border-rule py-3 text-[13px] font-bold tracking-[.04em] text-muted"
        >
          Back to Final app
        </button>
      </div>
    </DeviceFrame>
  );
}
