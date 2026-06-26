import { useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { DeviceFrame } from '../components/DeviceFrame';
import { StatusBar } from '../components/StatusBar';
import { useSession } from '../session';
import { finalProgramFor } from '../data/finalContent';
import { getModuleDone, markModuleDone, type FinalModule } from '../lib/finalProgress';

/**
 * Final Session — the live graduation conversation with the Language Companion /
 * Guide over the Zoom Video SDK. HARD-GATED: locked until the four prep modules
 * (read, podcast, writing, conversation) are done, with the remaining steps shown.
 * Join routes to /session/<sessionId> (the in-app video room). `scheduledAt` is a
 * lightweight per-adventurer schedule (data-driven; a real booking layer is
 * deferred — see FINAL-APP.md).
 */
const PREP: { key: FinalModule; label: string; route: string }[] = [
  { key: 'read', label: 'Final reading', route: '/final-reading' },
  { key: 'podcast', label: 'Podcast', route: '/podcast' },
  { key: 'writing', label: 'Writing', route: '/final-writing' },
  { key: 'conversation', label: 'Conversation', route: '/final-conversation' },
];

function formatSchedule(iso?: string): { when: string; rel: string } | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const when = new Date(t).toLocaleString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
  const diffMin = Math.round((t - Date.now()) / 60000);
  let rel: string;
  if (diffMin > 90) rel = `in ${Math.round(diffMin / 60)} h`;
  else if (diffMin > 1) rel = `in ${diffMin} min`;
  else if (diffMin > -90) rel = 'now';
  else rel = 'scheduled';
  return { when, rel };
}

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
  const remaining = PREP.filter((p) => !done[p.key]);
  const unlocked = remaining.length === 0;
  const sched = formatSchedule(session.scheduledAt);

  return (
    <DeviceFrame tone="light">
      <StatusBar tone="light" />
      <div className="scroll-region flex-1 px-5 pb-6 pt-[16px]">
        <div className="text-[10px] font-bold tracking-[.16em] text-muted">{language} · FINAL SESSION</div>
        <div className="mt-1 font-serif text-[28px] italic leading-tight text-heading">{session.title}</div>
        <p className="mt-3 text-[15px] leading-[1.6] text-heading">{session.note}</p>

        {/* Schedule card */}
        {sched && (
          <div className="mt-5 rounded-2xl border border-rule bg-cream-panel p-4">
            <div className="text-[10px] font-bold tracking-[.14em] text-muted">SCHEDULED</div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-[15px] font-bold text-heading">{sched.when}</span>
              <span className="text-[12px] font-bold text-emerald">{sched.rel}</span>
            </div>
            {session.durationMin && <div className="mt-0.5 text-[12px] text-muted">{session.durationMin} min with your guide</div>}
          </div>
        )}

        {/* Prep checklist — the gate */}
        <div className="mt-6 flex items-center justify-between">
          <div className="text-[11px] font-bold tracking-[.12em] text-muted">YOUR PREP</div>
          <div className="text-[11px] font-bold text-emerald">{PREP.length - remaining.length} / {PREP.length}</div>
        </div>
        <div className="mt-2 flex flex-col gap-2">
          {PREP.map((p) => (
            <button
              key={p.key}
              onClick={() => !done[p.key] && navigate(p.route)}
              className="flex items-center gap-3 rounded-[14px] border border-rule bg-cream-panel px-4 py-3 text-left"
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${done[p.key] ? 'bg-emerald text-cream' : 'bg-rule text-muted'}`}>
                {done[p.key] ? '✓' : ''}
              </span>
              <span className="text-[14px] text-heading">{p.label}</span>
              <span className="ml-auto text-[11px] font-semibold text-muted">{done[p.key] ? 'done' : 'do this →'}</span>
            </button>
          ))}
        </div>

        {!unlocked && (
          <div className="mt-4 rounded-2xl border border-coral/30 bg-coral/[.06] p-4">
            <div className="flex items-center gap-2 text-[13px] font-bold text-coral">
              <span>🔒</span> Locked until prep is complete
            </div>
            <p className="mt-1 text-[12.5px] leading-[1.5] text-muted">
              Finish {remaining.map((r) => r.label).join(', ')} to unlock your live session.
            </p>
          </div>
        )}
      </div>

      <div className="px-5 pb-5">
        <button
          onClick={() => { markModuleDone(user.id, user.username ?? '', 'session'); navigate(`/session/${encodeURIComponent(session.sessionId)}`); }}
          disabled={!unlocked}
          className="w-full rounded-[15px] bg-emerald py-4 text-[15px] font-bold tracking-[.01em] text-cream disabled:opacity-40"
        >
          {unlocked ? 'Join the live room →' : `🔒 Complete ${remaining.length} more to unlock`}
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
