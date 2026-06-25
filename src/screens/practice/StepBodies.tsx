import { useState } from 'react';
import { ModelWaveform, LiveWaveform, StaticWaveform } from '../../components/Waveform';
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

/** HUM — model melody contour (teal) + your hum (gray/static until HUM recording is wired). */
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
      <div className="rounded-[14px] border border-rule bg-cream-panel/60 p-3.5">
        <div className="mb-2.5 flex items-center gap-2.5">
          <span className="h-3 w-3 shrink-0 rounded-full bg-locked" />
          <span className="text-[10px] font-bold tracking-[.14em] text-locked">YOUR HUM · COMING SOON</span>
        </div>
        <StaticWaveform />
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

/**
 * READ — scrollable sentence list with up to THREE transliteration levels.
 *
 * The level set adapts to the language and to which fields are populated:
 *   Japanese → Kanji (l2) · Hiragana (l2_translit_1) · Rōmaji (l2_translit_2)
 *   Thai / Khmer → Script (l2) · Roman (l2_translit_2)   [no level-1 in data]
 *   German etc. → single level (l2), no toggle.
 * A non-native level is only offered when at least one sentence carries a distinct
 * value for it, so we never show an empty or duplicate tab.
 */
type ReadSentence = {
  l2: string;
  l2_translit: string | null;
  l2_translit_1: string | null;
  l2_translit_2: string | null;
};

export function ReadBody({
  sentences,
  language,
}: {
  sentences: ReadSentence[];
  language?: string;
}) {
  const isJa = (language ?? '').toUpperCase() === 'JAPANESE';

  // Candidate levels (native first), labelled for the learner's language.
  const candidates: Array<{ label: string; get: (s: ReadSentence) => string | null }> = [
    { label: isJa ? 'Kanji' : 'Script', get: (s) => s.l2 },
    {
      label: isJa ? 'Hiragana' : 'Reading',
      // fall back to the legacy single translit if level-1 is empty
      get: (s) => s.l2_translit_1 || (isJa ? s.l2_translit : null),
    },
    {
      label: isJa ? 'Rōmaji' : 'Roman',
      get: (s) => s.l2_translit_2 || (!isJa ? s.l2_translit : null),
    },
  ];

  // Keep the native level always; keep others only when they add distinct content.
  const levels = candidates.filter((lvl, idx) => {
    if (idx === 0) return true;
    return sentences.some((s) => {
      const v = lvl.get(s);
      return v && v !== s.l2;
    });
  });

  const [level, setLevel] = useState(0);
  const active = levels[Math.min(level, levels.length - 1)];

  return (
    <div className="flex flex-1 flex-col overflow-hidden px-[22px]">
      {/* Level toggle — only when more than one level exists */}
      {levels.length > 1 && (
        <div className="mb-2 flex shrink-0 justify-end">
          <div className="flex overflow-hidden rounded-full border border-teal/[.28]">
            {levels.map((lvl, i) => (
              <button
                key={lvl.label}
                onClick={() => setLevel(i)}
                className={`px-3 py-1 text-[10px] font-bold tracking-[.08em] transition-colors ${
                  i === level ? 'bg-teal/20 text-cream' : 'text-teal/50'
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <ol className="flex-1 space-y-2.5 overflow-y-auto py-1">
        {sentences.length === 0 ? (
          <li className="py-6 text-center font-serif text-[14px] italic text-teal/50">
            Sentences loading…
          </li>
        ) : (
          sentences.map((s, i) => {
            const display = active.get(s) || s.l2;
            return (
              <li
                key={i}
                className="rounded-[12px] border border-teal/[.18] bg-teal/[.06] px-4 py-3"
              >
                <div className="font-serif text-[17px] leading-[1.4] text-cream">{display}</div>
              </li>
            );
          })
        )}
      </ol>
    </div>
  );
}
