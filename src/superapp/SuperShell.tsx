import type { ReactNode } from 'react';
import { DeviceFrame } from '../components/DeviceFrame';
import { SuperNav, type SuperTab } from './SuperNav';
import { WordSheet } from './WordSheet';

/**
 * The super-app screen shell. Wraps a mode screen in the phone frame, mounts the
 * shared word sheet (so any tapped token can open it over the content), and
 * renders the five-tab nav unless the screen is a full-immersive player
 * (`showNav={false}`). `tone` picks the emerald (immersive) or cream ground.
 *
 * Screens supply their own scroll region / padding so immersive players can lay
 * themselves out as a full-height flex column.
 */
export function SuperShell({
  tab,
  tone = 'light',
  showNav = true,
  children,
}: {
  tab: SuperTab;
  tone?: 'dark' | 'light';
  showNav?: boolean;
  children: ReactNode;
}) {
  return (
    <DeviceFrame tone={tone}>
      {children}
      {showNav && <SuperNav active={tab} />}
      <WordSheet />
    </DeviceFrame>
  );
}
