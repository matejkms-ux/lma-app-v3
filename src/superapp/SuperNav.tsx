import { useNavigate } from 'react-router-dom';
import { ModeIcon, type ModeIconName } from './icons';
import { colors } from '../tokens';

export type SuperTab = 'home' | 'practice' | 'companion' | 'reader' | 'watch';

const ITEMS: { tab: SuperTab; label: string; icon: ModeIconName; route: string }[] = [
  { tab: 'home', label: 'Home', icon: 'home', route: '/hub' },
  { tab: 'practice', label: 'Practice', icon: 'practice', route: '/lessons' },
  { tab: 'companion', label: 'Companion', icon: 'companion', route: '/companion' },
  { tab: 'reader', label: 'Reader', icon: 'reader', route: '/read' },
  { tab: 'watch', label: 'Watch', icon: 'watch', route: '/watch' },
];

/**
 * The super-app bottom nav — five modes on the shared Lexicon spine. Coral is
 * the single live signal: the active tab is coral, the rest muted. Full-immersive
 * players hide the nav entirely (the shell decides), so this only renders on the
 * library/landing screens.
 */
export function SuperNav({ active }: { active: SuperTab }) {
  const navigate = useNavigate();
  return (
    <div className="relative z-20 flex h-[84px] shrink-0 items-start border-t border-rule bg-cream-panel px-2 pt-2.5">
      {ITEMS.map(({ tab, label, icon, route }) => {
        const on = tab === active;
        const tint = on ? colors.coral : colors.muted;
        return (
          <button
            key={tab}
            onClick={() => navigate(route)}
            className="flex flex-1 flex-col items-center gap-1 pt-1"
          >
            <ModeIcon name={icon} color={tint} size={icon === 'home' ? 22 : 20} />
            <span className="text-[10.5px] font-semibold" style={{ color: tint }}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
