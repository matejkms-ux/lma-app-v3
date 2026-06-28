import { useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../session';
import { readerLessonsForScope } from '../data/readerLessons';
import { finalProgramFor } from '../data/finalContent';

type Tab = 'home' | 'practice' | 'read' | 'corrections' | 'final';

const ROUTE: Record<Tab, string> = {
  home: '/home',
  practice: '/lessons',
  read: '/reader',
  corrections: '/corrections',
  final: '/final',
};

function HomeIcon() {
  return <span className="h-5 w-5 rounded-md border-[1.8px] border-current" />;
}
function PracticeIcon() {
  return <span className="h-5 w-5 rounded-full border-[1.8px] border-current" />;
}
function ReadIcon() {
  return (
    <span className="flex h-5 w-5 items-center justify-center">
      <span className="h-[15px] w-[13px] rounded-[2px] border-[1.8px] border-current">
        <span className="mx-auto mt-[3px] block h-[1.6px] w-[7px] rounded bg-current" />
        <span className="mx-auto mt-[2px] block h-[1.6px] w-[7px] rounded bg-current" />
      </span>
    </span>
  );
}
function CorrectionsIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
      <path d="M3 6l7 5 7-5" />
    </svg>
  );
}
function FinalIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="10,2.5 12.5,8 18.5,8.5 14,12.5 15.5,18.5 10,15 4.5,18.5 6,12.5 1.5,8.5 7.5,8" />
    </svg>
  );
}

const ALL_ITEMS: { tab: Tab; label: string; Icon: () => JSX.Element }[] = [
  { tab: 'home', label: 'Home', Icon: HomeIcon },
  { tab: 'practice', label: 'Lessons', Icon: PracticeIcon },
  { tab: 'read', label: 'Read', Icon: ReadIcon },
  { tab: 'corrections', label: 'Corrections', Icon: CorrectionsIcon },
  { tab: 'final', label: 'Final', Icon: FinalIcon },
];

/**
 * The bottom tab bar — Home / Practice / Read / Switch learner.
 * Appears only once you're "in"; the entry screen has none (v3 brief §2).
 */
export function BottomNav({ active }: { active: Tab }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useSession();

  const scope = user?.username ?? '';
  const hasReader = readerLessonsForScope(scope).length > 0;
  const hasFinal = !!finalProgramFor(user?.username);

  const items = ALL_ITEMS.filter((item) => {
    if (item.tab === 'read') return hasReader;
    if (item.tab === 'final') return hasFinal;
    return true;
  });

  const isActive = (tab: Tab) => {
    if (tab === active) return true;
    if (tab === 'practice') {
      return ['/sentences', '/lessons', '/practice', '/overview'].includes(location.pathname);
    }
    if (tab === 'read') {
      return ['/reader', '/reader-lesson'].includes(location.pathname);
    }
    if (tab === 'corrections') return location.pathname === '/corrections';
    if (tab === 'final') return location.pathname.startsWith('/final');
    return false;
  };

  const handleSwitch = () => {
    signOut();
    navigate('/');
  };

  return (
    <div className="relative flex shrink-0 items-start justify-around border-t border-teal/20 bg-emerald pb-5 pt-3">
      {items.map(({ tab, label, Icon }) => {
        const on = isActive(tab);
        return (
          <button
            key={tab}
            onClick={() => navigate(ROUTE[tab])}
            className={`flex flex-col items-center gap-[5px] px-3 ${on ? 'text-cream' : 'text-teal-dim'}`}
          >
            <span className="flex h-5 w-5 items-center justify-center">
              <Icon />
            </span>
            <span className={`text-[10px] ${on ? 'font-bold' : 'font-semibold'}`}>{label}</span>
          </button>
        );
      })}

      {/* Switch learner */}
      <button
        onClick={handleSwitch}
        className="flex flex-col items-center gap-[5px] px-3 text-teal-dim"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal/20 font-serif text-[11px] font-bold leading-none text-cream/70">
          {user?.name[0] ?? '·'}
        </span>
        <span className="text-[10px] font-semibold">Switch</span>
      </button>

      <div className="absolute bottom-[7px] left-1/2 h-[5px] w-[120px] -translate-x-1/2 rounded-[3px] bg-cream/35" />
    </div>
  );
}
