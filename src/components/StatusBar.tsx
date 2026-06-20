/** The faux iOS status bar at the top of every screen. */
export function StatusBar({ tone }: { tone: 'dark' | 'light' }) {
  const color = tone === 'dark' ? 'text-teal' : 'text-muted';
  return (
    <div className={`flex shrink-0 items-center justify-between px-6 pt-3.5 text-[13px] font-semibold ${color}`}>
      <span>9:41</span>
      <span className="flex items-center gap-1">
        <span className="h-[5px] w-[5px] rounded-full bg-current" />
        <span className="h-[5px] w-[5px] rounded-full bg-current" />
        <span className="h-[10px] w-[18px] rounded-[3px] border-[1.4px] border-current" />
      </span>
    </div>
  );
}
