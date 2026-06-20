/**
 * The live-mic indicator — coral, pulsing: the one live signal per screen.
 * `variant="strip"` is the compact inline form (READ); `variant="block"` is the
 * boxed record state (RECALL).
 */
export function PulseDot({ size = 12 }: { size?: number }) {
  return (
    <span className="relative shrink-0" style={{ width: size, height: size }}>
      <span className="absolute inset-0 rounded-full bg-coral/50 animate-pring" />
      <span className="absolute rounded-full bg-coral" style={{ inset: 2 }} />
    </span>
  );
}

export function MicStrip({ label }: { label: string }) {
  return (
    <div className="mb-2.5 flex items-center gap-2.5 px-6">
      <PulseDot />
      <span className="text-[10px] font-bold tracking-[.14em] text-coral">{label}</span>
      <span className="ml-auto flex h-[18px] items-center gap-[2px]">
        {['0.7s 0s', '0.9s 0.1s', '0.8s 0.2s', '1s 0.08s', '0.75s 0.25s'].map((t, i) => {
          const [dur, delay] = t.split(' ');
          return (
            <i
              key={i}
              className="h-full w-[3px] origin-bottom rounded-[2px] bg-coral animate-bwave"
              style={{ animationDuration: dur, animationDelay: delay }}
            />
          );
        })}
      </span>
    </div>
  );
}

export function MicBlock({ label }: { label: string }) {
  return (
    <div className="px-[22px] pb-2.5">
      <div className="flex items-center gap-3.5 rounded-2xl border border-coral/40 bg-coral/[.08] px-3.5 py-3">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
          <span className="absolute inset-0 rounded-full border-2 border-coral animate-pring" />
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-coral">
            <span className="h-3 w-3 rounded-[4px] bg-cream" />
          </span>
        </div>
        <span className="text-[11px] font-bold tracking-[.1em] text-coral">{label}</span>
      </div>
    </div>
  );
}
