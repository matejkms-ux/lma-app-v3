import { useMemo, useRef, useState } from 'react';
import {
  upsertSentencesBulk,
  parseLessonCode,
  type BulkSentenceRow,
} from '../../data/lessonAudio';

/**
 * Bulk CSV sentence import. The CSV carries its own lesson_code + sentence_nr per
 * row, so it can populate one or many lessons at once — independent of the
 * learner/lesson selected above. Columns:
 *
 *   lesson_code, sentence_nr, l1, l2, l2_translit
 *
 * A header row (matching those names, any order) is optional; without one the
 * columns are read positionally. Rows are validated and previewed before commit;
 * l2_translit may be blank. Upserts on (lesson_code, sentence_nr).
 */

const EXPECTED = ['lesson_code', 'sentence_nr', 'l1', 'l2', 'l2_translit'] as const;

interface PreviewRow {
  lesson_code: string;
  sentence_nr: string;
  l1: string;
  l2: string;
  l2_translit: string;
  error: string | null;
}

/** Minimal RFC-4180-ish CSV parser: handles quotes, escaped quotes, CRLF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop fully-empty lines.
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function validateRow(r: Omit<PreviewRow, 'error'>): string | null {
  if (!parseLessonCode(r.lesson_code)) {
    return r.lesson_code ? `Malformed lesson_code "${r.lesson_code}"` : 'Missing lesson_code';
  }
  const nr = Number(r.sentence_nr);
  if (!Number.isInteger(nr) || nr <= 0) return `sentence_nr must be a positive integer`;
  if (!r.l1.trim()) return 'L1 is empty';
  if (!r.l2.trim()) return 'L2 is empty';
  return null;
}

function toPreview(text: string): PreviewRow[] {
  const grid = parseCsv(text);
  if (!grid.length) return [];

  // Optional header — detected when the first row names the lesson_code column.
  const first = grid[0].map((c) => c.trim().toLowerCase());
  const hasHeader = first.includes('lesson_code');
  const idx: Record<(typeof EXPECTED)[number], number> = {
    lesson_code: 0,
    sentence_nr: 1,
    l1: 2,
    l2: 3,
    l2_translit: 4,
  };
  if (hasHeader) {
    for (const col of EXPECTED) {
      const at = first.indexOf(col);
      if (at !== -1) idx[col] = at;
    }
  }

  const body = hasHeader ? grid.slice(1) : grid;
  return body.map((cols) => {
    const base = {
      lesson_code: (cols[idx.lesson_code] ?? '').trim(),
      sentence_nr: (cols[idx.sentence_nr] ?? '').trim(),
      l1: (cols[idx.l1] ?? '').trim(),
      l2: (cols[idx.l2] ?? '').trim(),
      l2_translit: (cols[idx.l2_translit] ?? '').trim(),
    };
    return { ...base, error: validateRow(base) };
  });
}

export function CsvSentenceUploader() {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => toPreview(text), [text]);
  const invalid = rows.filter((r) => r.error);
  const valid = rows.filter((r) => !r.error);
  const canImport = rows.length > 0 && invalid.length === 0 && !importing;

  const loadFile = (file: File) => {
    setStatus(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ''));
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!canImport) return;
    setImporting(true);
    setStatus(null);
    const payload: BulkSentenceRow[] = valid.map((r) => ({
      lesson_code: r.lesson_code,
      sentence_nr: Number(r.sentence_nr),
      l1: r.l1,
      l2: r.l2,
      l2_translit: r.l2_translit || null,
    }));
    const result = await upsertSentencesBulk(payload);
    setImporting(false);
    if (result.error) {
      setStatus({ ok: false, msg: result.error });
    } else {
      const lessons = result.lessons ?? 0;
      setStatus({
        ok: true,
        msg: `${result.sentences} sentence${result.sentences === 1 ? '' : 's'} imported across ${lessons} lesson${lessons === 1 ? '' : 's'}.`,
      });
    }
  };

  return (
    <section className="mt-8">
      <div className="mb-4 text-[11px] font-bold tracking-[.1em] text-muted">CSV SENTENCE UPLOAD (BULK)</div>
      <div className="rounded-[18px] border border-rule bg-white p-5">
        <p className="mb-3 text-[12px] text-muted">
          Upload or paste a CSV with columns{' '}
          <span className="font-mono font-semibold text-heading">
            lesson_code, sentence_nr, l1, l2, l2_translit
          </span>
          . A header row is optional; <span className="font-semibold">l2_translit</span> may be blank.
          Rows upsert on <span className="font-mono">(lesson_code, sentence_nr)</span> and may span
          multiple lessons.
        </p>

        <div className="mb-3 flex flex-wrap items-center gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-[10px] border border-dashed border-rule px-4 py-2.5 text-[12px] font-semibold text-muted transition-colors hover:border-emerald hover:text-emerald"
          >
            Choose CSV file
          </button>
          {fileName && <span className="text-[11.5px] font-semibold text-heading">{fileName}</span>}
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) loadFile(file);
              e.target.value = '';
            }}
          />
        </div>

        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setStatus(null);
          }}
          placeholder={
            'lesson_code,sentence_nr,l1,l2,l2_translit\nJERODC2604-th-001,1,I went to temple.,ผมไปวัด,Phŏm bpai wát\nANAMARIJAC2604-de-001,1,Good morning.,Guten Morgen,'
          }
          rows={6}
          className="w-full rounded-[12px] border border-rule bg-cream px-4 py-3 font-mono text-[12px] leading-[1.7] text-heading placeholder:text-locked focus:border-emerald focus:outline-none"
        />

        {rows.length > 0 && (
          <>
            <div className="mt-4 max-h-[320px] overflow-auto rounded-[12px] border border-rule">
              <table className="w-full text-left text-[11.5px]">
                <thead>
                  <tr className="border-b border-rule bg-cream">
                    <th className="px-3 py-2 font-bold text-muted">#</th>
                    <th className="px-3 py-2 font-bold text-muted">LESSON_CODE</th>
                    <th className="px-3 py-2 font-bold text-muted">NR</th>
                    <th className="px-3 py-2 font-bold text-muted">L1</th>
                    <th className="px-3 py-2 font-bold text-muted">L2</th>
                    <th className="px-3 py-2 font-bold text-muted">TRANSLIT</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={i}
                      className={`border-b border-rule-soft last:border-0 ${r.error ? 'bg-red-50' : ''}`}
                    >
                      <td className="px-3 py-2 font-mono text-locked">{i + 1}</td>
                      <td className="px-3 py-2 font-mono text-[10.5px] text-emerald">{r.lesson_code}</td>
                      <td className="px-3 py-2 font-mono text-muted">{r.sentence_nr}</td>
                      <td className="px-3 py-2 text-muted">{r.l1}</td>
                      <td className="px-3 py-2 font-semibold text-heading">{r.l2}</td>
                      <td className="px-3 py-2 text-muted">
                        {r.l2_translit || <span className="text-locked">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invalid.length > 0 && (
              <div className="mt-3 rounded-[10px] bg-red-50 px-3 py-2 text-[11.5px] font-semibold text-red-600">
                {invalid.length} invalid row{invalid.length === 1 ? '' : 's'} — fix before importing:
                <ul className="mt-1 list-disc pl-5 font-normal">
                  {invalid.slice(0, 5).map((r, i) => (
                    <li key={i}>
                      Row {rows.indexOf(r) + 1}: {r.error}
                    </li>
                  ))}
                  {invalid.length > 5 && <li>…and {invalid.length - 5} more</li>}
                </ul>
              </div>
            )}
          </>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => void handleImport()}
            disabled={!canImport}
            className="rounded-[10px] bg-emerald px-5 py-2.5 text-[12px] font-bold tracking-[.04em] text-cream disabled:opacity-40"
          >
            {importing ? 'Importing…' : `Import ${valid.length} sentence${valid.length === 1 ? '' : 's'}`}
          </button>
          {status && (
            <span className={`text-[12px] font-semibold ${status.ok ? 'text-emerald' : 'text-red-500'}`}>
              {status.msg}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
