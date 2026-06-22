import { useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../session';

type Tab = 'home' | 'practice' | 'activities';

const ROUTE: Record<Tab, string> = {
  home: '/home',
  practice: '/lessons',
  activities: '/activities',
};

function HomeIcon() {
  return <span className="h-5 w-5 rounded-md border-[1.8px] border-current" />;
}
function PracticeIcon() {
  return <span className="h-5 w-5 rounded-full border-[1.8px] border-current" />;
}
function ActivitiesIcon() {
  return (
    <span className="flex h-5 w-5 items-end gap-[2.5px]">
      <i className="w-[5px] rounded-[1px] bg-current" style={{ height: '40%' }} />
      <i className="w-[5px] rounded-[1px] bg-current" style={{ height: '68%' }} />
      <i className="w-[5px] rounded-[1px] bg-current" style={{ height: '100%' }} />
    </span>
  );
}

const ITEMS: { tab: Tab; label: string; Icon: () => JSX.Element }[] = [
  { tab: 'home', label: 'Home', Icon: HomeIcon },
  { tab: 'practice', label: 'Practice', Icon: PracticeIcon },
  { tab: 'activities', label: 'Activities', Icon: ActivitiesIcon },
];

/**
 * The bottom tab bar — Home / Practice / Activities / Switch learner.
 * Appears only once you're "in"; the entry screen has none (v3 brief §2).
 */
export function BottomNav({ active }: { active: Tab }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useSession();

  const isActive = (tab: Tab) => {
    if (tab === active) return true;
    if (tab === 'practice') {
      return ['/lessons', '/practice', '/overview'].includes(location.pathname);
    }
    return false;
  };

  const handleSwitch = () => {
    signOut();
    navigate('/');
  };

  return (
    <div className="relative flex shrink-0 items-start justify-around border-t border-teal/20 bg-emerald pb-5 pt-3">
      {ITEMS.map(({ tab, label, Icon }) => {
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

      {/* Admin (always available) */}
      <button
        onClick={() => navigate('/admin')}
        className="flex flex-col items-center gap-[5px] px-3 text-teal-dim"
      >
        <span className="flex h-5 w-5 items-center justify-center text-[15px] leading-none">⚙</span>
        <span className="text-[10px] font-semibold">Admin</span>
      </button>

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
