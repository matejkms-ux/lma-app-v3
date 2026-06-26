import { useState, useEffect, useRef } from 'react';
import { ModelWaveform, StaticCoralWaveform } from '../../components/Waveform';

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

/**
 * HUM — the model melody contour. The learner hums this shape along with the clip
 * (the mic records via the player, same as every audio step). No per-hum capture
 * UI is shown; pitch/melody feedback is tracked as a future feature.
 */
export function HumBody() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-[22px]">
      <div className="w-full">
        <div className="mb-2 text-center text-[9.5px] font-bold tracking-[.16em] text-teal">MODEL MELODY</div>
        <svg viewBox="0 0 300 60" className="block h-[60px] w-full">
          <path
            d="M4 44 C 40 44,50 14,86 16 S 140 46,168 30 S 220 6,252 22 S 288 40,296 30"
            fill="none"
            stroke="#8FC0B8"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="font-serif text-[13px] italic text-teal">Hum the shape of the sound.</div>
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
          <span className="h-3 w-3 shrink-0 rounded-full bg-coral" />
          <span className="text-[10px] font-bold tracking-[.14em] text-coral">YOUR VOICE</span>
        </div>
        <StaticCoralWaveform />
      </div>
    </div>
  );
}

/**
 * READ — scrollable sentence list. The native script is always shown; reading aids
 * stack BELOW each line and are added/removed with toggle chips (choice persists):
 * Convention: l2_translit_1 is the PRIMARY transliteration (always filled when a
 * language has a reading aid); l2_translit_2 is the optional SECOND one. What each
 * slot is called varies by language:
 *   Japanese → Kanji (l2) + Furigana (l2_translit_1) + Rōmaji (l2_translit_2)
 *   Thai / Khmer → Script (l2) + Roman (l2_translit_1)  — one transliteration only
 *   German etc. → script only, no chips.
 * An aid is offered only when at least one sentence carries a distinct value for it,
 * so we never show an empty or duplicate line. Defaults to all aids on.
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
  playing = false,
  progress = 0,
}: {
  sentences: ReadSentence[];
  language?: string;
  /** READ clip is playing — drives the hands-free auto-scroll. */
  playing?: boolean;
  /** Playback position 0–1; the list glides to match so reading flows. */
  progress?: number;
}) {
  const isJa = (language ?? '').toUpperCase() === 'JAPANESE';
  const lang = (language ?? 'xx').toUpperCase();

  // Extra reading aids shown BELOW the native script, each independently toggleable.
  // Japanese → up to two (Furigana, Rōmaji); Thai/Khmer → one (Roman). Keys are
  // language-based (not content-based) so the default survives async sentence load.
  const allExtras = isJa
    ? [
        { key: 'furigana', label: 'Furigana', get: (s: ReadSentence) => s.l2_translit_1 || s.l2_translit },
        { key: 'romaji', label: 'Rōmaji', get: (s: ReadSentence) => s.l2_translit_2 },
      ]
    : [{ key: 'roman', label: 'Roman', get: (s: ReadSentence) => s.l2_translit_1 || s.l2_translit_2 || s.l2_translit }];

  // Offer a toggle only for an aid that actually carries distinct content.
  const extras = allExtras.filter((e) =>
    sentences.some((s) => {
      const v = e.get(s);
      return v && v !== s.l2;
    }),
  );

  // Which aids are on. Default: all of them (script + roman shown together), then
  // the learner can remove any. Choice persists per language.
  const storeKey = `lma:readTranslit:${lang}`;
  const [enabled, setEnabled] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) return new Set(JSON.parse(raw) as string[]);
    } catch {
      /* storage unavailable */
    }
    return new Set(allExtras.map((e) => e.key));
  });
  useEffect(() => {
    try {
      localStorage.setItem(storeKey, JSON.stringify([...enabled]));
    } catch {
      /* ignore */
    }
  }, [enabled, storeKey]);

  const toggle = (key: string) =>
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const activeExtras = extras.filter((e) => enabled.has(e.key));

  // Hands-free flow: while the READ clip plays, the list scrolls so its position
  // tracks the audio. We map the playback fraction straight onto scrollTop on
  // each progress tick (~4Hz from the <audio> timeupdate) — over a clip the
  // steps are a couple of pixels each, so it glides without any CSS smooth-scroll
  // (which stalls when re-triggered every tick) or rAF (which the OS pauses when
  // the tab is backgrounded). When there's no READ audio the step is a
  // pass-through (playing stays false) and the learner just scrolls by hand.
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = listRef.current;
    if (!el || !playing) return;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 0) return;
    el.scrollTop = Math.max(0, Math.min(max, progress * max));
  }, [playing, progress]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden px-[22px]">
      {/* Add/remove the reading aids that show below each line */}
      {extras.length > 0 && (
        <div className="mb-2 flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {extras.map((e) => {
            const on = enabled.has(e.key);
            return (
              <button
                key={e.key}
                onClick={() => toggle(e.key)}
                aria-pressed={on}
                className={`rounded-full border px-3 py-1 text-[10px] font-bold tracking-[.08em] transition-colors ${
                  on ? 'border-teal/40 bg-teal/20 text-cream' : 'border-teal/[.28] text-teal/45'
                }`}
              >
                {on ? '✓ ' : '+ '}
                {e.label}
              </button>
            );
          })}
        </div>
      )}
      <ol
        ref={listRef}
        className="flex-1 space-y-1.5 overflow-y-auto py-1"
      >
        {sentences.length === 0 ? (
          <li className="py-6 text-center font-serif text-[14px] italic text-teal/50">
            Sentences loading…
          </li>
        ) : (
          sentences.map((s, i) => (
            <li
              key={i}
              className="rounded-[10px] border border-teal/[.18] bg-teal/[.06] px-3.5 py-2"
            >
              <div className="font-serif text-[14px] leading-[1.35] text-cream">{s.l2}</div>
              {activeExtras.map((e) => {
                const v = e.get(s);
                if (!v || v === s.l2) return null;
                return (
                  <div key={e.key} className="mt-0.5 text-[11px] leading-[1.35] text-teal-dim">
                    {v}
                  </div>
                );
              })}
            </li>
          ))
        )}
      </ol>
    </div>
  );
}
