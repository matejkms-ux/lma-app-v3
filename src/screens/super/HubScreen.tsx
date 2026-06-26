import { useNavigate } from 'react-router-dom';
import { SuperShell } from '../../superapp/SuperShell';
import { ModeIcon, type ModeIconName } from '../../superapp/icons';
import { useSuperApp } from '../../superapp/store';
import { useSession } from '../../session';
import { displayName } from '../../data/mock';
import { adventureKicker } from '../../data/adventure';
import { finalProgramFor } from '../../data/finalContent';

/**
 * S1 · Adventure Hub — the super-app landing. A warm greeting, reps gathered as
 * the hero, three mini-stats, the "due today" review CTA, and the four modes on
 * the shared Lexicon spine. Coral is the only thing that moves (the +today chip
 * and the Companion "next" dot).
 */
interface ModeCard {
  title: string;
  status: string;
  icon: ModeIconName;
  route: string;
  next?: boolean;
}

export function HubScreen() {
  const navigate = useNavigate();
  const { user } = useSession();
  const { reps, repsToday, knownWords, streak, dueToday } = useSuperApp();
  const first = user ? displayName(user).split(' ')[0] : 'adventurer';
  const kicker = adventureKicker(user?.adventure);
  const hasFinal = Boolean(finalProgramFor(user?.username));

  const cards: ModeCard[] = [
    { title: 'Practice', status: 'Lesson 4 of 30', icon: 'practice', route: '/lessons' },
    { title: 'Companion', status: 'Lesson 4 · audio', icon: 'companion', route: '/companion', next: true },
    { title: 'Reader', status: `3 texts · ${knownWords} words`, icon: 'reader', route: '/read' },
    { title: 'Watch', status: '12 clips ready', icon: 'watch', route: '/watch' },
  ];

  return (
    <SuperShell tab="home" tone="light">
      <div className="scroll-region flex-1 bg-cream px-[22px] pb-7 pt-16">
        <div className="text-[12px] font-semibold uppercase tracking-[.12em] text-muted">{kicker}</div>
        <div className="mt-2 font-serif text-[34px] font-medium leading-[1.05] text-heading">Morning, {first}</div>

        {/* Reps hero */}
        <div className="relative mt-[22px] overflow-hidden rounded-[18px] border border-rule bg-cream-panel px-[22px] py-6">
          <div className="font-serif text-[72px] font-medium leading-[.9] text-heading">{reps}</div>
          <div className="mt-1.5 text-[15px] text-muted">reps gathered</div>
          {repsToday > 0 && (
            <div className="animate-pulse absolute right-[22px] top-[22px] flex items-center gap-1.5 rounded-[14px] bg-coral px-[13px] py-[7px] text-[13px] font-bold text-white">
              +{repsToday} today
            </div>
          )}
        </div>

        {/* Mini stats */}
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {[
            { v: knownWords, label: 'words known' },
            { v: streak, label: 'day streak' },
            { v: dueToday, label: 'due today' },
          ].map((s) => (
            <div key={s.label} className="rounded-[14px] border border-rule bg-cream-panel px-3 py-3.5">
              <div className="font-serif text-[26px] leading-none text-heading">{s.v}</div>
              <div className="mt-[5px] text-[11.5px] text-muted">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Due today CTA */}
        <button
          onClick={() => navigate('/review')}
          className="mt-2.5 flex w-full items-center justify-between rounded-[14px] bg-emerald2 px-[18px] py-3.5"
        >
          <span className="text-sm font-semibold text-cream">Review · {dueToday} due across all modes</span>
          <span className="text-lg text-teal">→</span>
        </button>

        <div className="mb-3 mt-[26px] px-0.5 text-[12px] font-semibold uppercase tracking-[.12em] text-muted">
          Choose your path
        </div>

        {/* Mode cards 2×2 */}
        <div className="grid grid-cols-2 gap-3">
          {cards.map((m) => (
            <button
              key={m.title}
              onClick={() => navigate(m.route)}
              className="relative flex min-h-[128px] flex-col justify-between rounded-[18px] border border-rule bg-cream-panel px-4 pb-4 pt-[18px] text-left"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-emerald">
                  <ModeIcon name={m.icon} color="#F8F0E2" />
                </div>
                {m.next && <span className="animate-pulse mt-1 inline-block h-[9px] w-[9px] rounded-full bg-coral" />}
              </div>
              <div>
                <div className="mt-3.5 font-serif text-[22px] font-medium text-heading">{m.title}</div>
                <div className="mt-[3px] text-[12.5px] text-muted">{m.status}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Final App — the capstone, shown once the learner has Final content. */}
        {hasFinal && (
          <button
            onClick={() => navigate('/final')}
            className="mt-3 flex w-full items-center justify-between rounded-[18px] border border-rule bg-cream-panel px-[18px] py-4 text-left"
          >
            <span className="flex items-center gap-3">
              <span className="text-[24px]">🏁</span>
              <span>
                <span className="block font-serif text-[20px] font-medium text-heading">Final week</span>
                <span className="block text-[12.5px] text-muted">Read · Podcast · Writing · Conversation · Session</span>
              </span>
            </span>
            <span className="text-lg text-muted">→</span>
          </button>
        )}
      </div>
    </SuperShell>
  );
}
