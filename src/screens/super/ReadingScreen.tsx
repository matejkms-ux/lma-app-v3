import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SuperShell } from '../../superapp/SuperShell';
import { useSuperApp } from '../../superapp/store';
import { READING_CONTEXT, READING_TOKENS } from '../../data/superApp';

/**
 * R3 · Reading view — the LingQ-style passage. Every word is tappable and tinted
 * by its status (new = underlined, learning = coral wash, known = plain); tapping
 * opens the shared word sheet. "Read while listening" highlights the active
 * sentence as the audio plays.
 */
export function ReadingScreen() {
  const navigate = useNavigate();
  const { statusOf, openWord, knownWords } = useSuperApp();
  const [listening, setListening] = useState(false);

  // Track the running sentence index so listening can highlight sentence 1.
  let sentence = 0;

  return (
    <SuperShell tab="reader" tone="light" showNav={false}>
      <div className="scroll-region flex-1 bg-cream px-6 pb-9 pt-[54px]">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/read')} className="text-heading">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#15403B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <div className="text-[13px] font-semibold text-teal-dim">At the market</div>
          <div className="text-[13px] font-bold text-heading">
            {knownWords} <span className="font-medium text-muted">known</span>
          </div>
        </div>

        <div className="mt-[26px] font-khmer text-[27px] leading-[2.1] text-heading">
          {READING_TOKENS.map((t, i) => {
            if (t.punct) {
              const node = <span key={i}>{t.l2} </span>;
              sentence += 1;
              return node;
            }
            const st = statusOf(t.l2, t.status);
            const isLearning = st === 'learning';
            const isNew = st === 'new';
            const highlight = listening && sentence === 0;
            return (
              <span key={i}>
                <span
                  role="button"
                  onClick={() =>
                    openWord({
                      l2: t.l2,
                      translit: t.translit ?? '',
                      pos: t.pos ?? '',
                      gloss: `${t.l2} — ${t.gloss ?? ''}`,
                      context: READING_CONTEXT,
                      status: t.status,
                    })
                  }
                  className="cursor-pointer rounded-[4px] px-px"
                  style={{
                    color: isLearning ? '#EF6A47' : '#15403B',
                    borderBottom: isNew ? '2px solid #0A554E' : '2px solid transparent',
                    background: highlight ? 'rgba(143,192,184,.28)' : isLearning ? 'rgba(239,106,71,.10)' : 'transparent',
                  }}
                >
                  {t.l2}
                </span>
                <span> </span>
              </span>
            );
          })}
        </div>

        {/* legend */}
        <div className="mt-[30px] flex flex-wrap items-center gap-4 text-[11.5px] text-muted">
          <span className="flex items-center gap-[5px]">
            <span className="px-1 text-heading" style={{ borderBottom: '2px solid #0A554E' }}>ก</span>new
          </span>
          <span className="flex items-center gap-[5px]">
            <span className="rounded-[3px] px-1 text-coral" style={{ background: 'rgba(239,106,71,.12)' }}>ก</span>learning
          </span>
          <span className="flex items-center gap-[5px]">
            <span className="px-1 text-heading">ก</span>known
          </span>
        </div>

        <button
          onClick={() => setListening((l) => !l)}
          className="mt-6 flex w-full items-center justify-center gap-[9px] rounded-[14px] border border-rule py-3.5 text-sm font-semibold"
          style={{ background: listening ? '#EF6A47' : '#FBF5EA', color: listening ? '#fff' : '#15403B' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9v6h4l5 5V4L7 9H3z" />
          </svg>
          {listening ? 'Listening · sentence 1' : 'Read while listening'}
        </button>
      </div>
    </SuperShell>
  );
}
