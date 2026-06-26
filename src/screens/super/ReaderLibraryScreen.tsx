import { useNavigate } from 'react-router-dom';
import { SuperShell } from '../../superapp/SuperShell';
import { useSuperApp } from '../../superapp/store';
import { READER_TEXTS } from '../../data/superApp';

/**
 * R1 · Reader library — imported texts as cards, each showing its level, length
 * and "% known" progress. Import opens R2; tapping a text opens the reading view.
 */
export function ReaderLibraryScreen() {
  const navigate = useNavigate();
  const { knownWords } = useSuperApp();

  return (
    <SuperShell tab="reader" tone="light">
      <div className="scroll-region flex-1 bg-cream px-[22px] pb-7 pt-[60px]">
        <div className="flex items-end justify-between">
          <div>
            <div className="font-serif text-[30px] font-medium text-heading">Reader</div>
            <div className="mt-0.5 text-[13px] text-muted">{knownWords} words known</div>
          </div>
          <button
            onClick={() => navigate('/read/import')}
            className="flex items-center gap-[7px] rounded-[14px] bg-emerald2 px-[15px] py-2.5 text-[13px] font-semibold text-cream"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F8F0E2" strokeWidth="2.4" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Import
          </button>
        </div>

        <div className="mt-[22px] flex flex-col gap-3">
          {READER_TEXTS.map((t) => (
            <button
              key={t.id}
              onClick={() => navigate('/read/text')}
              className="rounded-[18px] border border-rule bg-cream-panel p-[18px] text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="font-khmer text-[24px] text-heading">{t.title}</div>
                <div className="whitespace-nowrap pt-1 text-[11px] font-bold uppercase tracking-[.06em] text-teal-dim">
                  {t.level}
                </div>
              </div>
              <div className="mt-[3px] text-[13.5px] text-muted">
                {t.titleEn} · {t.len}
              </div>
              <div className="mt-3.5 flex items-center gap-2.5">
                <div className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-rule">
                  <div className="h-full rounded-[3px] bg-emerald2" style={{ width: `${t.pct}%` }} />
                </div>
                <div className="text-[12px] font-semibold text-teal-dim">{t.pct}% known</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </SuperShell>
  );
}
