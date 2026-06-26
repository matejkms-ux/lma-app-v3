import { useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { DeviceFrame } from '../components/DeviceFrame';
import { StatusBar } from '../components/StatusBar';
import { useSession } from '../session';
import { finalProgramFor } from '../data/finalContent';
import { getModuleDone, type FinalModule } from '../lib/finalProgress';

interface ModuleCard {
  key: FinalModule;
  route: string;
  emoji: string;
  title: string;
  desc: string;
}

/**
 * The LMA Final App — the capstone of an adventurer's program. Five modules over
 * a shared, per-adventurer content layer (data/finalContent.ts). This hub is fully
 * generic: it renders whatever modules the learner's FinalProgram provides.
 */
export function FinalHubScreen() {
  const navigate = useNavigate();
  const { user } = useSession();
  const program = useMemo(() => finalProgramFor(user?.username), [user?.username]);

  if (!user) return <Navigate to="/" replace />;

  if (!program) {
    return (
      <DeviceFrame tone="light">
        <StatusBar tone="light" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="text-[40px]">🏁</div>
          <div className="font-serif text-[24px] italic leading-snug text-heading">Final app coming soon</div>
          <div className="text-sm text-muted">
            Your Final content (essay, podcast, conversation) isn't loaded yet. It's added once
            your life-story narration exists.
          </div>
          <button
            onClick={() => navigate('/hub')}
            className="rounded-full border border-rule px-5 py-2 text-[12px] font-bold tracking-[.08em] text-muted"
          >
            ‹ BACK
          </button>
        </div>
      </DeviceFrame>
    );
  }

  const done = getModuleDone(user.id, user.username ?? '');
  // Gate: the four prep modules must be done before Final Session unlocks.
  const PREP: FinalModule[] = ['read', 'podcast', 'writing', 'conversation'];
  const prepLeft = PREP.filter((k) => !done[k]).length;
  const cards: ModuleCard[] = [
    { key: 'read', route: '/final-reading', emoji: '📖', title: 'Final Read', desc: `“${program.essay.title}” · ${program.essay.pages.length} pages` },
    { key: 'podcast', route: '/podcast', emoji: '🎧', title: 'Final Podcast', desc: `${program.podcast.title} · ${program.podcast.checks.length} checks` },
    { key: 'writing', route: '/final-writing', emoji: '✍️', title: 'Final Writing', desc: `${program.writing.prompts.length} prompts to write` },
    { key: 'conversation', route: '/final-conversation', emoji: '💬', title: 'Final Conversation', desc: `${program.conversation.prompts.length} prompts · auto-scored` },
    {
      key: 'session', route: '/final-session', emoji: '🏁', title: 'Final Session',
      desc: prepLeft > 0 ? `Locked · finish ${prepLeft} prep step${prepLeft > 1 ? 's' : ''} first` : program.session.title,
    },
  ];
  const doneCount = cards.filter((c) => done[c.key]).length;

  return (
    <DeviceFrame tone="light">
      <StatusBar tone="light" />
      <div className="shrink-0 px-6 pb-1 pt-4">
        <div className="text-[11px] font-bold tracking-[.14em] text-muted">{program.language} · FINAL APP</div>
        <div className="mt-1 font-serif text-[28px] italic leading-tight text-heading">The final week</div>
        <p className="mt-1.5 text-[13px] leading-[1.5] text-muted">
          Five steps to close your adventure — read, listen, write, talk, and meet.
        </p>
      </div>

      <div className="scroll-region flex-1 px-5 pb-6 pt-3">
        <div className="mb-3 flex items-center justify-between rounded-2xl border border-rule bg-cream-panel px-4 py-3">
          <span className="text-[11px] font-bold tracking-[.12em] text-muted">PROGRESS</span>
          <span className="text-[13px] font-extrabold text-emerald">{doneCount} / {cards.length}</span>
        </div>

        <div className="flex flex-col gap-2.5">
          {cards.map((c, i) => {
            const locked = c.key === 'session' && prepLeft > 0;
            return (
              <button
                key={c.key}
                onClick={() => navigate(c.route)}
                aria-disabled={locked}
                className={`flex items-center gap-3 rounded-[18px] border border-rule bg-white p-4 text-left active:scale-[.99] ${locked ? 'opacity-60' : ''}`}
              >
                <span className="text-[26px]">{locked ? '🔒' : c.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-[.1em] text-muted">STEP {i + 1}</span>
                    {done[c.key] && (
                      <span className="rounded-full bg-emerald/15 px-1.5 py-[1px] text-[9px] font-bold tracking-[.06em] text-emerald">✓ DONE</span>
                    )}
                    {locked && (
                      <span className="rounded-full bg-coral/15 px-1.5 py-[1px] text-[9px] font-bold tracking-[.06em] text-coral">LOCKED</span>
                    )}
                  </span>
                  <span className="block text-[15px] font-bold text-heading">{c.title}</span>
                  <span className="block truncate text-[12px] text-muted">{c.desc}</span>
                </span>
                <span className="text-muted">›</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 pb-5">
        <button
          onClick={() => navigate('/hub')}
          className="w-full rounded-[15px] border border-rule py-3 text-[13px] font-bold tracking-[.04em] text-muted"
        >
          ‹ Back to adventure hub
        </button>
      </div>
    </DeviceFrame>
  );
}
