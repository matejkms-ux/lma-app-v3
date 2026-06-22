import { useCallback, useEffect, useRef, useState } from 'react';
import { getSentences } from '../../data/api';
import { uploadSentenceAudio, deleteSentenceAudio } from '../../data/lessonAudio';

/**
 * Per-sentence reference audio uploader. Lists the lesson's sentences; for each,
 * upload/replace/delete one MP3 (→ sentences.l2_audio_url). This is the reference
 * audio the Sentences play-voice button and the per-sentence judged-step capture
 * flow use.
 */
interface Row {
  id: string;
  sentenceNr: number;
  l2: string;
  url: string | null;
  progress: number | null;
  error: string | null;
}

export function SentenceAudioUploader({ lessonCode }: { lessonCode: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!lessonCode) return;
    let alive = true;
    setLoading(true);
    void getSentences(lessonCode).then((sents) => {
      if (!alive) return;
      setRows(
        sents.map((s) => ({
          id: s.id,
          sentenceNr: s.sentenceNr,
          l2: s.l2,
          url: s.l2_audio_url ?? null,
          progress: null,
          error: null,
        })),
      );
      setLoading(false);
    });
    return () => { alive = false; };
  }, [lessonCode]);

  const patch = useCallback((id: string, delta: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...delta } : r)));
  }, []);

  const handleFile = useCallback(
    async (row: Row, file: File) => {
      if (!file.name.match(/\.(mp3|mpeg)$/i)) {
        patch(row.id, { error: 'Only .mp3 files are accepted.' });
        return;
      }
      patch(row.id, { error: null, progress: 0 });
      const result = await uploadSentenceAudio(lessonCode, row.id, row.sentenceNr, file, (pct) =>
        patch(row.id, { progress: pct }),
      );
      if ('error' in result) patch(row.id, { error: result.error, progress: null });
      else {
        patch(row.id, { url: result.url, progress: null });
        setTimeout(() => patch(row.id, { progress: null }), 1000);
      }
    },
    [lessonCode, patch],
  );

  const handleDelete = useCallback(
    async (row: Row) => {
      patch(row.id, { error: null });
      const { error } = await deleteSentenceAudio(lessonCode, row.id, row.sentenceNr);
      if (error) patch(row.id, { error });
      else patch(row.id, { url: null });
    },
    [lessonCode, patch],
  );

  const withAudio = rows.filter((r) => r.url).length;

  return (
    <section className="mt-8">
      <div className="mb-1 text-[11px] font-bold tracking-[.1em] text-muted">SENTENCE REFERENCE AUDIO</div>
      <p className="mb-4 text-[12px] text-muted">
        One reference clip per sentence ({withAudio}/{rows.length} uploaded). Feeds the Sentences
        play-voice button and per-sentence scoring.
      </p>
      <div className="rounded-[18px] border border-rule bg-white p-2">
        {loading ? (
          <div className="py-8 text-center text-sm font-semibold text-muted">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-[13px] italic text-muted">
            No sentences for this lesson yet — add them with the Sentence uploader above.
          </div>
        ) : (
          <ul className="divide-y divide-rule-soft">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <span className="font-mono text-[11px] font-bold text-muted">{r.sentenceNr}</span>
                <span className="min-w-[120px] flex-1 truncate text-[13px] text-heading">{r.l2}</span>
                {r.url && <audio controls src={r.url} className="h-7" playsInline />}
                {r.progress !== null && (
                  <span className="text-[11px] font-semibold text-coral">{r.progress}%</span>
                )}
                {r.error && <span className="text-[11px] font-semibold text-red-500">{r.error}</span>}
                <button
                  onClick={() => fileRefs.current[r.id]?.click()}
                  disabled={r.progress !== null}
                  className="rounded-[8px] border border-dashed border-rule px-3 py-1.5 text-[11px] font-semibold text-muted hover:border-emerald hover:text-emerald disabled:opacity-40"
                >
                  {r.url ? 'Replace' : 'Upload MP3'}
                </button>
                {r.url && (
                  <button
                    onClick={() => void handleDelete(r)}
                    className="rounded-[8px] border border-rule px-2.5 py-1.5 text-[11px] font-semibold text-muted hover:border-red-300 hover:text-red-500"
                  >
                    ✕
                  </button>
                )}
                <input
                  ref={(el) => { fileRefs.current[r.id] = el; }}
                  type="file"
                  accept=".mp3,audio/mpeg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(r, file);
                    e.target.value = '';
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
