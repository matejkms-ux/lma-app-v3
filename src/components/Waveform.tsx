/**
 * The model voice — a static teal waveform shown as the shadowing target. (There
 * is no live coral waveform yet; live voice capture/comparison is a future feature,
 * so we don't render a fake one.)
 */

const MODEL_HEIGHTS = [35, 65, 50, 90, 70, 100, 55, 80, 40, 72, 48, 85, 60];

export function ModelWaveform() {
  return (
    <div className="flex h-[38px] items-center gap-[3px]">
      {MODEL_HEIGHTS.map((h, i) => (
        <i key={i} className="flex-1 rounded-[2px] bg-teal" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}
