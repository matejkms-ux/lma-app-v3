import { useNavigate } from 'react-router-dom';
import { SuperShell } from '../../superapp/SuperShell';
import { WATCH_CLIPS } from '../../data/superApp';

/**
 * W1 · Watch library — short clips generated from your Companion, each with
 * tappable captions and a built-in quiz. Tapping a clip opens the player.
 */
export function WatchLibraryScreen() {
  const navigate = useNavigate();
  return (
    <SuperShell tab="watch" tone="light">
      <div className="scroll-region flex-1 bg-cream px-[22px] pb-7 pt-[60px]">
        <div className="font-serif text-[30px] font-medium text-heading">Watch</div>
        <div className="mt-0.5 text-[13px] text-muted">Tappable captions · built-in quizzes</div>

        <div className="mt-[22px] flex flex-col gap-3.5">
          {WATCH_CLIPS.map((c) => (
            <button key={c.id} onClick={() => navigate('/watch/play')} className="text-left">
              <div className="relative flex h-[152px] items-end overflow-hidden rounded-[18px] p-3.5" style={{ background: c.grad }}>
                <div className="absolute left-1/2 top-1/2 flex h-[52px] w-[52px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/[.16]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-[20px] bg-black/[.28] px-2.5 py-[5px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-coral" />
                  <span className="text-[11px] font-semibold text-white">your Companion</span>
                </div>
                <div className="absolute right-3 top-3 rounded-lg bg-black/[.28] px-2 py-[3px] text-[11px] font-semibold text-white">{c.len}</div>
              </div>
              <div className="mt-[9px] flex items-center justify-between">
                <div className="text-[15.5px] font-medium text-heading">{c.title}</div>
                <div className="text-[11px] font-bold uppercase tracking-[.05em] text-teal-dim">{c.level}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </SuperShell>
  );
}
