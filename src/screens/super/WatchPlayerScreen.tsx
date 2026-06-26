import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SuperShell } from '../../superapp/SuperShell';
import { useSuperApp } from '../../superapp/store';
import { CAPTIONS } from '../../data/superApp';

/**
 * W2 · Interactive player — the clip with tappable captions. Tap any L2 word to
 * open the word sheet; cycle caption modes (dual / Khmer only / hidden), loop a
 * line, or step between lines. The "Learn mode" strip opens the quiz (W3).
 */
type CaptionMode = 'dual' | 'l2' | 'hidden';
const MODE_LABEL: Record<CaptionMode, string> = { dual: 'Dual', l2: 'Khmer only', hidden: 'Hidden' };
const MODE_ORDER: CaptionMode[] = ['dual', 'l2', 'hidden'];

export function WatchPlayerScreen() {
  const navigate = useNavigate();
  const { statusOf, openWord } = useSuperApp();
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [looping, setLooping] = useState(false);
  const [mode, setMode] = useState<CaptionMode>('dual');

  const cap = CAPTIONS[idx] ?? CAPTIONS[0];
  const showL2 = mode !== 'hidden';
  const showL1 = mode === 'dual';

  const cycleMode = () => setMode((m) => MODE_ORDER[(MODE_ORDER.indexOf(m) + 1) % MODE_ORDER.length]);

  return (
    <SuperShell tab="watch" tone="dark" showNav={false}>
      <div className="flex h-full flex-col bg-emerald px-5 pb-[26px] pt-[54px] text-cream">
        <div className="mb-3.5 flex items-center justify-between">
          <button onClick={() => navigate('/watch')} className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white/[.08]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#cfe6e0" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <button onClick={cycleMode} className="rounded-[10px] bg-white/[.08] px-3 py-[7px] text-[12px] font-semibold text-teal">
            Captions · {MODE_LABEL[mode]}
          </button>
        </div>

        {/* video frame */}
        <div className="relative h-[184px] overflow-hidden rounded-[18px] bg-gradient-to-br from-emerald2 to-[#093f3a]">
          <button onClick={() => setPlaying((p) => !p)} className="absolute inset-0 flex items-center justify-center">
            {!playing && (
              <span className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-coral">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            )}
          </button>
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-[20px] bg-black/30 px-2.5 py-[5px]">
            <span className="animate-pulse h-1.5 w-1.5 rounded-full bg-coral" />
            <span className="text-[11px] font-semibold text-white">your Language Companion</span>
          </div>
          <div className="absolute bottom-3 right-3.5 text-[11px] text-[#cfe6e0]">0:18 / {CAPTIONS.length} lines</div>
        </div>

        <div className="mt-4 text-center text-[12px] text-teal">Tap any word to learn it</div>

        {/* caption card */}
        <div className="flex flex-1 flex-col justify-center gap-3">
          <div className="rounded-[18px] bg-white/[.06] px-[18px] py-[22px] text-center">
            {showL2 && (
              <div className="font-khmer text-[26px] leading-[1.7] text-white">
                {cap.tokens.map((t, i) => {
                  const st = statusOf(t.l2, t.status);
                  return (
                    <span key={i}>
                      <span
                        role="button"
                        onClick={() => {
                          setPlaying(false);
                          openWord({
                            l2: t.l2,
                            translit: t.translit ?? '',
                            pos: t.pos ?? '',
                            gloss: `${t.l2} — ${t.gloss ?? ''}`,
                            context: cap.l1,
                            status: t.status,
                          });
                        }}
                        className="cursor-pointer px-px"
                        style={{
                          color: st === 'learning' ? '#EF6A47' : '#fff',
                          borderBottom: st === 'new' ? '2px solid #8FC0B8' : '2px solid transparent',
                        }}
                      >
                        {t.l2}
                      </span>
                      <span> </span>
                    </span>
                  );
                })}
              </div>
            )}
            {showL1 && <div className="mt-3 font-serif text-[15px] italic text-teal">{cap.l1}</div>}
          </div>
        </div>

        {/* controls */}
        <div className="mb-4 flex items-center justify-center gap-3">
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            className="flex h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-white/[.08]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cfe6e0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 7l-6 5 6 5M19 7l-6 5 6 5" />
            </svg>
          </button>
          <button
            onClick={() => setLooping((l) => !l)}
            className="flex h-[46px] flex-1 items-center justify-center gap-2 rounded-[14px] text-[13px] font-semibold"
            style={{ background: looping ? '#EF6A47' : 'rgba(255,255,255,.10)', color: looping ? '#fff' : '#8FC0B8' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 2l4 4-4 4" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
            Loop line
          </button>
          <button
            onClick={() => setIdx((i) => Math.min(CAPTIONS.length - 1, i + 1))}
            className="flex h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-white/[.08]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cfe6e0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 7l6 5-6 5M5 7l6 5-6 5" />
            </svg>
          </button>
        </div>

        {/* learn mode strip */}
        <button onClick={() => navigate('/watch/quiz')} className="flex items-center justify-between rounded-[16px] bg-coral px-[18px] py-[15px]">
          <div className="text-left">
            <div className="text-sm font-bold text-white">Learn mode</div>
            <div className="mt-px text-[12px] text-white/85">3 quiz items from this clip</div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </SuperShell>
  );
}
