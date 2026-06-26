/**
 * Waveforms. The model voice is a static teal waveform; your take is the coral
 * waveform that animates only while the mic is open (coral is the one moving
 * element on the screen).
 */

const MODEL_HEIGHTS = [35, 65, 50, 90, 70, 100, 55, 80, 40, 72, 48, 85, 60];

// Per-bar animation timing so the live coral bars feel organic.
const LIVE_TIMING = [
  '0.7s 0s', '0.9s 0.1s', '0.8s 0.2s', '1s 0.08s', '0.75s 0.25s', '0.85s 0.15s',
  '0.95s 0.3s', '0.7s 0.18s', '0.9s 0.05s', '0.82s 0.22s', '1s 0.32s', '0.78s 0.1s', '0.88s 0.26s',
];

export function ModelWaveform() {
  return (
    <div className="flex h-[38px] items-center gap-[3px]">
      {MODEL_HEIGHTS.map((h, i) => (
        <i key={i} className="flex-1 rounded-[2px] bg-teal" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

export function LiveWaveform() {
  return (
    <div className="flex h-[38px] items-center gap-[3px]">
      {LIVE_TIMING.map((t, i) => {
        const [dur, delay] = t.split(' ');
        return (
          <i
            key={i}
            className="h-full flex-1 origin-bottom rounded-[2px] bg-coral animate-bwave"
            style={{ animationDuration: dur, animationDelay: delay }}
          />
        );
      })}
    </div>
  );
}

/** Coral, static — the "your take" slot before live capture is wired (no motion). */
export function StaticCoralWaveform() {
  return (
    <div className="flex h-[38px] items-center gap-[3px]">
      {MODEL_HEIGHTS.map((h, i) => (
        <i key={i} className="flex-1 rounded-[2px] bg-coral" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}
