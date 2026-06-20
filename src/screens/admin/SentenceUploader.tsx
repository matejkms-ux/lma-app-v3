import { useMemo, useState } from 'react';
import { upsertSentences } from '../../data/lessonAudio';

interface ParsedRow {
  l1: string;
  l2: string;
  l2_translit: string;
}

function parseInput(text: string): ParsedRow[] {
  return text
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.split('\t').map((c) => c.trim()))
    .filter((cols) => cols.length >= 2 && (cols[0] || cols[1]))
    .map((cols) => ({ l1: cols[0] ?? '', l2: cols[1] ?? '', l2_translit: cols[2] ?? '' }));
}

export function SentenceUploader({
  lessonCode,
  language,
  lessonNr,
}: {
  lessonCode: string;
  language: string;
  lessonNr: number;
}) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [importing, setImporting] = useState(false);

  const rows = useMemo(() => parseInput(text), [text]);

  const handleImport = async () => {
    if (!rows.length || !lessonCode) return;
    setImporting(true);
    setStatus(null);
    const result = await upsertSentences(
      lessonCode,
      language,
      lessonNr,
      rows.map((r, i) => ({
        sentence_nr: i + 1,
        l1: r.l1,
        l2: r.l2,
        l2_translit: r.l2_translit || null,
      })),
    );
    setImporting(false);
    if (result.error) {
      setStatus({ ok: false, msg: result.error });
    } else {
      setStatus({
        ok: true,
        msg: `${rows.length} sentence${rows.length === 1 ? '' : 's'} imported for ${lessonCode}.`,
      });
    }
  };

  return (
    <section className="mt-8">
      <div className="mb-4 text-[11px] font-bold tracking-[.1em] text-muted">SENTENCE UPLOADER</div>
      <div className="rounded-[18px] border border-rule bg-white p-5">
        <p className="mb-3 text-[12px] text-muted">
          Paste one sentence per line, columns separated by a tab:{' '}
          <span className="font-mono font-semibold text-heading">L1 ⇥ L2 ⇥ L2_translit</span>.
          L2_translit may be blank (e.g. German). Confirm overwrites existing rows for this lesson.
        </p>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setStatus(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              e.preventDefault();
              const el = e.currentTarget;
              const start = el.selectionStart;
              const end = el.selectionEnd;
              const next = text.slice(0, start) + '\t' + text.slice(end);
              setText(next);
              setStatus(null);
              requestAnimationFrame(() => {
                el.selectionStart = el.selectionEnd = start + 1;
              });
            }
          }}
          placeholder={
            'I went to temple.\tผมไปวัด\tPhŏm bpai wát\nWhy did you go?\tทำไมคุณไป\tTham-mai khun bpai'
          }
          rows={6}
          className="w-full rounded-[12px] border border-rule bg-cream px-4 py-3 font-mono text-[12px] leading-[1.7] text-heading placeholder:text-locked focus:border-emerald focus:outline-none"
        />

        {rows.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-[12px] border border-rule">
            <table className="w-full text-left text-[11.5px]">
              <thead>
                <tr className="border-b border-rule bg-cream">
                  <th className="px-3 py-2 font-bold text-muted">#</th>
                  <th className="px-3 py-2 font-bold text-muted">L1</th>
                  <th className="px-3 py-2 font-bold text-muted">L2</th>
                  <th className="px-3 py-2 font-bold text-muted">TRANSLIT</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-rule-soft last:border-0">
                    <td className="px-3 py-2 font-mono text-locked">{i + 1}</td>
                    <td className="px-3 py-2 text-muted">{r.l1}</td>
                    <td className="px-3 py-2 font-semibold text-heading">{r.l2}</td>
                    <td className="px-3 py-2 text-muted">{r.l2_translit || <span className="text-locked">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => void handleImport()}
            disabled={rows.length === 0 || importing}
            className="rounded-[10px] bg-emerald px-5 py-2.5 text-[12px] font-bold tracking-[.04em] text-cream disabled:opacity-40"
          >
            {importing
              ? 'Importing…'
              : `Import ${rows.length} sentence${rows.length === 1 ? '' : 's'}`}
          </button>
          {status && (
            <span
              className={`text-[12px] font-semibold ${status.ok ? 'text-emerald' : 'text-red-500'}`}
            >
              {status.msg}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
