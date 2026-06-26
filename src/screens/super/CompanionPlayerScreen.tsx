import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SuperShell } from '../../superapp/SuperShell';
import { useCompanion } from '../../superapp/useCompanion';
import { useSuperApp } from '../../superapp/store';
import { COMPANION_BEATS, COMPANION_SCRIPT } from '../../data/superApp';

/**
 * C2 · Companion player — the hands-free orb. Tap to play; the orb breathes
 * while audio plays and rings out while the mic listens for your turn. Optional
 * mic + text toggles. Finishing the last phrase awards reps and shows C3.
 *
 * A `runId` remount key resets the whole run (engine + local toggles) when the
 * learner starts the next lesson from the complete screen.
 */
export function CompanionPlayerScreen() {
  const [runId, setRunId] = useState(0);
  return <PlayerRun key={runId} onRestart={() => setRunId((r) => r + 1)} />;
}

const GUIDANCE: Record<string, string> = {
  teach: 'Listen, then repeat aloud',
  anticipation: 'Your turn — say it now',
  confirm: 'Yes — that’s it',
};

function PlayerRun({ onRestart }: { onRestart: () => void }) {
  const navigate = useNavigate();
  const { awardReps } = useSuperApp();
  const [done, setDone] = useState(false);
  const [showText, setShowText] = useState(false);
  const [mic, setMic] = useState(false);

  const finish = () => {
    awardReps(9);
    setDone(true);
  };
  const { playing, beat, item, listening, toggle, back10, skip } = useCompanion(finish);

  if (done) {
    return (
      <SuperShell tab="companion" tone="dark" showNav={false}>
        <div className="flex h-full flex-col items-center justify-center bg-gradient-to-b from-emerald via-[#093f3a] to-emerald2 px-[30px] py-14 text-center text-cream">
          <div className="text-[12px] font-bold uppercase tracking-[.14em] text-teal">Lesson 4 complete</div>
          <div className="animate-pop mt-6 flex items-baseline gap-2.5">
            <span className="font-serif text-[96px] font-medium leading-[.9] text-coral">+9</span>
            <span className="font-serif text-[30px] text-cream">reps</span>
          </div>
          <div className="mt-1.5 text-[15px] text-teal">gathered, hands-free</div>

          <div className="mt-[34px] flex gap-3.5">
            <div className="rounded-[14px] bg-white/[.07] px-[22px] py-4">
              <div className="font-serif text-[30px]">3</div>
              <div className="mt-[3px] text-[12px] text-teal">phrases learned</div>
            </div>
            <div className="rounded-[14px] bg-white/[.07] px-[22px] py-4">
              <div className="font-serif text-[30px]">7</div>
              <div className="mt-[3px] text-[12px] text-teal">day streak</div>
            </div>
          </div>

          <button onClick={onRestart} className="mt-10 w-full rounded-[16px] bg-coral py-4 text-[15px] font-semibold text-white">
            Next lesson →
          </button>
          <button onClick={() => navigate('/hub')} className="mt-3.5 text-sm text-teal">
            Back to Hub
          </button>
        </div>
      </SuperShell>
    );
  }

  const cur = COMPANION_SCRIPT[item] ?? COMPANION_SCRIPT[0];
  const beatIdx = COMPANION_BEATS.indexOf(beat);
  const orbAnim = !playing ? '' : listening ? 'animate-listen' : 'animate-orb-breathe';

  return (
    <SuperShell tab="companion" tone="dark" showNav={false}>
      <div className="flex h-full flex-col bg-gradient-to-b from-emerald to-[#093f3a] px-[26px] pb-[30px] pt-14 text-cream">
        {/* top bar */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[.12em] text-teal-dim">Lesson 4 · At the market</div>
            <div className="mt-[3px] text-[13px] text-teal">
              Phrase {item + 1} of {COMPANION_SCRIPT.length} · 4:12 / 10:00
            </div>
          </div>
          <button
            onClick={() => navigate('/companion')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[.08]"
          >
            <CloseIcon />
          </button>
        </div>

        {/* beat strip */}
        <div className="mt-[18px] flex gap-[7px]">
          {COMPANION_BEATS.map((b, i) => (
            <div
              key={b}
              className="h-[3px] flex-1 rounded-[2px]"
              style={{ background: i < beatIdx ? '#8FC0B8' : i === beatIdx ? '#EF6A47' : 'rgba(255,255,255,.15)' }}
            />
          ))}
        </div>

        {/* center orb */}
        <div className="flex flex-1 flex-col items-center justify-center gap-[30px]">
          <button onClick={toggle} className={`flex h-[150px] w-[150px] items-center justify-center rounded-full bg-coral ${orbAnim}`}>
            {listening ? (
              <div className="flex h-12 items-end gap-[5px]">
                {[0, 0.12, 0.24, 0.36, 0.48].map((d) => (
                  <span key={d} className="animate-wave w-1.5 rounded-[3px] bg-white" style={{ animationDelay: `${d}s`, height: '40%' }} />
                ))}
              </div>
            ) : playing ? (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="#fff">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg width="46" height="46" viewBox="0 0 24 24" fill="#fff">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <div className="min-h-[26px] text-center text-[18px] font-medium text-cream">{GUIDANCE[beat]}</div>

          {showText && (
            <div className="min-w-[240px] rounded-[16px] bg-white/[.06] px-[22px] py-[18px] text-center">
              <div className="text-[13px] text-teal">{cur.l1}</div>
              <div className="mt-2 font-khmer text-[30px] text-white">{cur.l2}</div>
              <div className="mt-1.5 font-serif text-[15px] italic text-teal">{cur.translit}</div>
            </div>
          )}
        </div>

        {/* controls */}
        <div className="mb-[22px] flex items-center justify-center gap-[34px]">
          <button onClick={back10} className="flex flex-col items-center gap-[3px] text-teal">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8FC0B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 7L5 12l6 5M19 7l-6 5 6 5" />
            </svg>
            <span className="text-[10px]">10s</span>
          </button>
          <button onClick={toggle} className="flex h-[62px] w-[62px] items-center justify-center rounded-full border-2 border-white/25">
            {playing ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#F8F0E2">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#F8F0E2">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button onClick={skip} className="flex flex-col items-center gap-[3px] text-teal">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8FC0B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 7l6 5-6 5M5 7l6 5-6 5" />
            </svg>
            <span className="text-[10px]">Next</span>
          </button>
        </div>

        {/* toggles */}
        <div className="flex gap-2.5">
          <button
            onClick={() => setMic((m) => !m)}
            className="flex-1 rounded-[14px] py-3 text-center text-[13px] font-semibold"
            style={{ background: mic ? '#EF6A47' : 'rgba(255,255,255,.10)', color: mic ? '#fff' : '#8FC0B8' }}
          >
            {mic ? 'Mic on · listening' : 'Mic off'}
          </button>
          <button
            onClick={() => setShowText((t) => !t)}
            className="flex-1 rounded-[14px] py-3 text-center text-[13px] font-semibold text-teal"
            style={{ background: showText ? 'rgba(255,255,255,.16)' : 'transparent' }}
          >
            {showText ? 'Hide text' : 'Show text'}
          </button>
        </div>
      </div>
    </SuperShell>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cfe6e0" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
