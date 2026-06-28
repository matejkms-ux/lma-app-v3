import { useState, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { DeviceFrame } from '../components/DeviceFrame';
import { StatusBar } from '../components/StatusBar';
import { BottomNav } from '../components/BottomNav';
import { useSession } from '../session';
import { correctionsFor, correctionHref, type Correction } from '../data/corrections';
import { awardCorrectionPoints, REPS_PER_CORRECTION } from '../lib/progress';

function CorrectionCard({
  c,
  userId,
  onPoints,
}: {
  c: Correction;
  userId: string;
  onPoints: () => void;
}) {
  const icon = c.type === 'written' ? '📝' : '🎙️';

  const handleClick = useCallback(() => {
    const awarded = awardCorrectionPoints(userId, c.slug);
    if (awarded) onPoints();
  }, [userId, c.slug, onPoints]);

  return (
    <a
      href={correctionHref(c.slug)}
      target="_blank"
      rel="noopener"
      onClick={handleClick}
      className="mb-[11px] flex w-full items-center gap-3.5 rounded-2xl border border-rule bg-white px-4 py-[15px] text-left active:scale-[.99]"
    >
      <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-coral/12 text-[17px]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10.5px] font-bold tracking-[.08em] text-coral">
          {c.date}
        </span>
        <span className="block font-serif text-[19px] leading-[1.15] text-heading">{c.title}</span>
        <span className="block truncate text-[11.5px] text-muted">{c.note}</span>
      </span>
      <span className="text-muted">›</span>
    </a>
  );
}

/**
 * Corrections — grouped into WRITTEN CORRECTIONS and AUDIO CORRECTIONS.
 * Each card opens a standalone red/green correction page.
 */
export function CorrectionsScreen() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [toast, setToast] = useState(false);

  const handlePoints = useCallback(() => {
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  }, []);

  if (!user) return <Navigate to="/" replace />;

  const corrections = correctionsFor(user.username);
  const written = corrections.filter((c) => c.type === 'written');
  const audio = corrections.filter((c) => c.type === 'audio' || !c.type);

  return (
    <DeviceFrame tone="light">
      <StatusBar tone="light" />
      <div className="shrink-0 px-6 pb-2 pt-[18px]">
        <button
          onClick={() => navigate('/home')}
          className="mb-2 text-[12px] font-bold tracking-[.06em] text-muted"
        >
          ‹ HOME
        </button>
        <div className="text-[11px] font-bold tracking-[.16em] text-muted">FROM MATEJ</div>
        <div className="mt-1 font-serif text-[30px] italic text-heading">Corrections</div>
        <div className="mt-1 text-[12px] text-muted">
          Your own words — red to change, green is natural.
        </div>
      </div>

      <div className="scroll-region flex-1 px-5 pb-5 pt-1.5">
        {corrections.length === 0 ? (
          <div className="mt-10 px-2 text-center font-serif text-[15px] italic text-muted">
            No corrections yet — they'll appear here once Matej sends some.
          </div>
        ) : (
          <>
            {written.length > 0 && (
              <div className="mb-3 mt-3">
                <div className="mb-2 text-[10px] font-bold tracking-[.18em] text-muted">
                  WRITTEN CORRECTIONS
                </div>
                {written.map((c) => (
                  <CorrectionCard key={c.slug} c={c} userId={user.id} onPoints={handlePoints} />
                ))}
              </div>
            )}
            {audio.length > 0 && (
              <div className="mb-3 mt-3">
                <div className="mb-2 text-[10px] font-bold tracking-[.18em] text-muted">
                  AUDIO CORRECTIONS
                </div>
                {audio.map((c) => (
                  <CorrectionCard key={c.slug} c={c} userId={user.id} onPoints={handlePoints} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* +50 reps toast */}
      {toast && (
        <div className="pointer-events-none absolute inset-x-0 top-[30%] flex justify-center">
          <span className="animate-pop rounded-full bg-coral px-5 py-2 font-bold text-white text-[15px] shadow-lg">
            +{REPS_PER_CORRECTION} reps
          </span>
        </div>
      )}

      <BottomNav active="corrections" />
    </DeviceFrame>
  );
}
