import { Navigate, useNavigate } from 'react-router-dom';
import { DeviceFrame } from '../components/DeviceFrame';
import { StatusBar } from '../components/StatusBar';
import { BottomNav } from '../components/BottomNav';
import { useSession } from '../session';
import { correctionsFor, correctionHref } from '../data/corrections';

/**
 * Corrections — the learner's personal "say it naturally" feedback. Each card opens
 * a standalone red/green correction page (her own words, the natural version, audio).
 * Self-paced; the page is also a link Matej can send.
 */
export function CorrectionsScreen() {
  const navigate = useNavigate();
  const { user } = useSession();
  if (!user) return <Navigate to="/" replace />;

  const corrections = correctionsFor(user.username);

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
          Deine eigenen Worte — rot zum Ändern, grün natürlich, zum Anhören.
        </div>
      </div>

      <div className="scroll-region flex-1 px-5 pb-5 pt-1.5">
        {corrections.length === 0 ? (
          <div className="mt-10 px-2 text-center font-serif text-[15px] italic text-muted">
            Noch keine Korrekturen — sie erscheinen hier, sobald Matej welche schickt.
          </div>
        ) : (
          corrections.map((c) => (
            <a
              key={c.slug}
              href={correctionHref(c.slug)}
              target="_blank"
              rel="noopener"
              className="mb-[11px] flex w-full items-center gap-3.5 rounded-2xl border border-rule bg-white px-4 py-[15px] text-left active:scale-[.99]"
            >
              <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-coral/12 text-[17px]">
                📩
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
          ))
        )}
      </div>

      <BottomNav active="corrections" />
    </DeviceFrame>
  );
}
