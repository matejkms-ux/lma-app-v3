import { ModelWaveform, LiveWaveform } from '../../components/Waveform';
import { PulseDot } from '../../components/MicIndicator';

/**
 * The per-step centrepieces. These are the visual chassis for a step; the live
 * recording signal is driven by the player, and text (READ) is deferred until
 * those clips arrive. GRASP and RECALL share the listening orb; SHADOW shows the
 * model voice over your live take.
 */

/**
 * GRASP / RECALL — the listening orb (audio only, no text). When `active` (the
 * clip is playing) it comes alive: the core breathes, a ring pulses outward, and
 * the bars bounce like an equalizer. Still when stopped.
 */
export function GraspBody({ active = false }: { active?: boolean }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="relative flex h-40 w-40 items-center justify-center">
        <span className="absolute h-40 w-40 rounded-full border border-teal/25" />
        <span className="absolute h-[120px] w-[120px] rounded-full border border-teal/35" />
        {active && <span className="absolute h-[72px] w-[72px] rounded-full border border-teal/40 animate-pring" />}
        <span
          className={`flex h-[88px] w-[88px] items-center justify-center rounded-full ${active ? 'animate-breathe' : ''}`}
          style={{ background: 'radial-gradient(circle at 50% 42%, rgba(143,192,184,.55), rgba(14,99,91,.6))' }}
        >
          <span className="flex h-[26px] items-center gap-[3px]">
            {[40, 75, 100, 60, 85].map((h, i) => (
              <i
                key={i}
                className={`w-[3px] origin-bottom rounded-[2px] bg-cream ${active ? 'animate-bwave' : ''}`}
                style={
                  active
                    ? { height: '100%', animationDelay: `${i * 0.1}s`, animationDuration: `${0.6 + (i % 3) * 0.2}s` }
                    : { height: `${h}%` }
                }
              />
            ))}
          </span>
        </span>
      </div>
    </div>
  );
}

/** HUM — model melody contour (teal) + your hum (coral). Decorative until HUM audio lands. */
export function HumBody() {
  return (
    <div className="flex flex-1 flex-col justify-center gap-3.5 px-[22px]">
      <div>
        <div className="mb-2 text-[9.5px] font-bold tracking-[.16em] text-teal">MODEL MELODY</div>
        <svg viewBox="0 0 300 60" className="block h-[50px] w-full">
          <path
            d="M4 44 C 40 44,50 14,86 16 S 140 46,168 30 S 220 6,252 22 S 288 40,296 30"
            fill="none"
            stroke="#8FC0B8"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="rounded-[14px] border border-coral/40 bg-coral/[.08] p-3.5">
        <div className="mb-2.5 flex items-center gap-2.5">
          <PulseDot />
          <span className="text-[10px] font-bold tracking-[.14em] text-coral">YOUR HUM · MIC OPEN</span>
        </div>
        <LiveWaveform />
      </div>
    </div>
  );
}

/** SHADOW — dual waveform: model voice (teal) + your voice (coral). */
export function ShadowBody() {
  return (
    <div className="flex flex-1 flex-col justify-center gap-3 px-[22px]">
      <div className="rounded-[14px] border border-teal/[.22] p-3.5">
        <div className="mb-[9px] text-[9.5px] font-bold tracking-[.16em] text-teal">MODEL VOICE</div>
        <ModelWaveform />
      </div>
      <div className="rounded-[14px] border border-coral/40 bg-coral/[.08] p-3.5">
        <div className="mb-[9px] flex items-center gap-2.5">
          <PulseDot />
          <span className="text-[10px] font-bold tracking-[.14em] text-coral">YOUR VOICE · RECORDING</span>
        </div>
        <LiveWaveform />
      </div>
    </div>
  );
}

/** READ — scrollable sentence list showing L2 text + transliteration. */
export function ReadBody({ sentences }: { sentences: { l2: string; translit: string }[] }) {
  return (
    <div className="flex-1 overflow-y-auto px-[22px] py-1">
      <ol className="space-y-2.5">
        {sentences.map((s, i) => (
          <li
            key={i}
            className="rounded-[12px] border border-teal/[.18] bg-teal/[.06] px-4 py-3"
          >
            <div className="font-serif text-[17px] leading-[1.4] text-cream">{s.l2}</div>
            <div className="mt-0.5 text-[11.5px] leading-[1.3] tracking-[.02em] text-teal/65">
              {s.translit}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
