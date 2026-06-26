import { useSuperApp } from './store';
import type { WordStatus } from '../data/superApp';
import { colors } from '../tokens';

/**
 * S2 · Shared word sheet — the bottom sheet that opens whenever a learner taps
 * an L2 token in Reader or Watch. Word, transliteration, part of speech, gloss,
 * the line it appeared in, and the three status buttons (+ Ignore). Setting a
 * status updates the shared "words known" count and closes the sheet.
 */
const STATUS_TINT: Record<'new' | 'learning' | 'known', string> = {
  new: colors.tealDim,
  learning: colors.coral,
  known: colors.emerald2,
};

const STATUS_BUTTONS: { key: 'new' | 'learning' | 'known'; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'learning', label: 'Learning' },
  { key: 'known', label: 'Known' },
];

export function WordSheet() {
  const { sheetWord, justSpoke, statusOf, closeWord, setStatus, speak } = useSuperApp();
  if (!sheetWord) return null;

  const current: WordStatus = statusOf(sheetWord.l2, sheetWord.status ?? 'new');

  return (
    <div
      onClick={closeWord}
      className="absolute inset-0 z-40 flex items-end"
      style={{ background: 'rgba(11,30,27,.42)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-rise w-full rounded-t-[24px] bg-cream-panel px-6 pb-[30px] pt-3"
      >
        <div className="mx-auto mb-[18px] h-[5px] w-[42px] rounded-[3px] bg-rule" />

        <div className="flex items-center gap-3.5">
          <div className="font-khmer text-[34px] font-medium text-heading">{sheetWord.l2}</div>
          <button
            onClick={speak}
            className={`flex h-[42px] w-[42px] items-center justify-center rounded-full bg-coral ${justSpoke ? 'animate-listen' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" />
            </svg>
          </button>
        </div>

        <div className="mt-1.5 font-serif text-sm italic text-teal-dim">{sheetWord.translit}</div>
        <div className="mt-3.5 text-[13px] font-semibold uppercase tracking-[.04em] text-muted">{sheetWord.pos}</div>
        <div className="mt-1.5 font-serif text-[21px] text-heading">{sheetWord.gloss}</div>
        <div className="mt-3 border-l-2 border-rule pl-3 text-[13.5px] leading-[1.5] text-muted">
          {sheetWord.context} <span className="italic text-locked">· in context</span>
        </div>

        <div className="mt-[22px] flex gap-[9px]">
          {STATUS_BUTTONS.map((b) => {
            const on = current === b.key;
            const tint = STATUS_TINT[b.key];
            return (
              <button
                key={b.key}
                onClick={() => setStatus(b.key)}
                className="flex-1 rounded-[14px] border py-[13px] text-center text-[13.5px] font-semibold"
                style={{
                  background: on ? tint : '#fff',
                  color: on ? '#fff' : colors.heading,
                  borderColor: on ? tint : colors.rule,
                }}
              >
                {b.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setStatus('ignore')}
          className="mt-3.5 w-full text-center text-[13px] text-locked"
        >
          Ignore this word
        </button>
      </div>
    </div>
  );
}
