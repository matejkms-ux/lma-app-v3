/** A coral pulsing dot — the one live-signal marker used around the app. */
export function PulseDot({ size = 12 }: { size?: number }) {
  return (
    <span className="relative shrink-0" style={{ width: size, height: size }}>
      <span className="absolute inset-0 rounded-full bg-coral/50 animate-pring" />
      <span className="absolute rounded-full bg-coral" style={{ inset: 2 }} />
    </span>
  );
}
