import type { ReactNode } from 'react';

/**
 * The phone-frame shell. Every screen is a full-height column: status bar at
 * the top, a flexible body, and (when "in") a bottom nav. `tone` picks the
 * emerald (immersive) or cream (body-page) ground.
 */
export function DeviceFrame({
  tone,
  children,
}: {
  tone: 'dark' | 'light';
  children: ReactNode;
}) {
  const ground = tone === 'dark' ? 'bg-emerald text-cream' : 'bg-cream text-heading';
  return (
    <div className="device-shell">
      <div className={`relative flex h-full flex-col ${ground}`}>{children}</div>
    </div>
  );
}
