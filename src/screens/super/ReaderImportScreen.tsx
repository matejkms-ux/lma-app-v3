import { useNavigate } from 'react-router-dom';
import { SuperShell } from '../../superapp/SuperShell';

/**
 * R2 · Import text — paste or upload an L2 text. The dashed box previews the
 * pasted Khmer with a blinking caret; below, the detected language + title, then
 * "Add to library" tokenizes it (the indicator) and opens the reading view.
 */
export function ReaderImportScreen() {
  const navigate = useNavigate();
  return (
    <SuperShell tab="reader" tone="light" showNav={false}>
      <div className="scroll-region flex-1 bg-cream px-[22px] pb-7 pt-14">
        <div className="flex items-center gap-3.5">
          <button onClick={() => navigate('/read')} className="text-heading">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#15403B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <div className="font-serif text-[24px] text-heading">Import text</div>
        </div>

        <div className="mt-[26px] text-[12px] font-semibold uppercase tracking-[.06em] text-muted">Paste or upload</div>
        <div className="mt-2.5 min-h-[150px] rounded-[16px] border border-dashed border-locked bg-cream-panel p-4 font-khmer text-[17px] leading-[1.7] text-heading">
          ខ្ញុំទៅផ្សារនៅពេលព្រឹក។ ខ្ញុំចង់ទិញបន្លែនិងត្រី។
          <span className="animate-pulse ml-px inline-block h-5 w-0.5 align-[-3px] bg-coral" />
        </div>

        <div className="mt-3.5 flex gap-2.5">
          <div className="flex-1 rounded-[14px] border border-rule bg-cream-panel px-4 py-3">
            <div className="text-[11px] text-muted">Language</div>
            <div className="mt-0.5 text-[15px] font-medium text-heading">Khmer</div>
          </div>
          <div className="flex-1 rounded-[14px] border border-rule bg-cream-panel px-4 py-3">
            <div className="text-[11px] text-muted">Title</div>
            <div className="mt-0.5 text-[15px] font-medium text-heading">At the market</div>
          </div>
        </div>

        <button
          onClick={() => navigate('/read/text')}
          className="mt-[22px] flex w-full items-center justify-center gap-[9px] rounded-[16px] bg-coral py-4 text-[15px] font-semibold text-white"
        >
          Add to library
        </button>
        <div className="mt-4 flex items-center justify-center gap-2 text-[12.5px] text-muted">
          <span className="animate-pulse h-[7px] w-[7px] rounded-full bg-coral" />
          Tokenizing · finding known words…
        </div>
      </div>
    </SuperShell>
  );
}
