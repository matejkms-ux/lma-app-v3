/**
 * Super-app mode icons — the stroke set from the design brief. Each takes a
 * colour so the bottom nav can tint the active tab coral and the Hub cards can
 * render them cream-on-emerald.
 */
export type ModeIconName = 'home' | 'practice' | 'companion' | 'reader' | 'watch';

export function ModeIcon({ name, color, size = 20 }: { name: ModeIconName; color: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (name) {
    case 'home':
      return (
        <svg {...common} strokeWidth={1.8}>
          <path d="M3 10.5L12 3l9 7.5M5 9.5V21h14V9.5" />
        </svg>
      );
    case 'practice':
      return (
        <svg {...common}>
          <path d="M12 3v18M5 8l7-5 7 5" />
          <circle cx="12" cy="14" r="4" />
        </svg>
      );
    case 'companion':
      return (
        <svg {...common}>
          <path d="M3 10v4M7 7v10M12 4v16M17 7v10M21 10v4" />
        </svg>
      );
    case 'reader':
      return (
        <svg {...common}>
          <path d="M4 5a2 2 0 0 1 2-2h6v18H6a2 2 0 0 0-2 2V5zM20 5a2 2 0 0 0-2-2h-6v18h6a2 2 0 0 1 2 2V5z" />
        </svg>
      );
    case 'watch':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="M10 9.5l5 2.5-5 2.5z" fill={color} />
        </svg>
      );
  }
}
