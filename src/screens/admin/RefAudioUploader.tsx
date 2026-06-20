import { useState, useRef, useCallback, useEffect } from 'react';
import {
  getRefAudio,
  uploadRefAudio,
  deleteRefAudio,
  REF_SLOTS,
  type RefSlot,
} from '../../data/lessonAudio';

interface RefState {
  url: string | null;
  fileName: string | null;
  progress: number | null;
  error: string | null;
  dragOver: boolean;
}

const SLOT_LABEL: Record<RefSlot, string> = {
  ref_l2: 'REF L2',
  ref_l1: 'REF L1',
};

const SLOT_TITLE: Record<RefSlot, string> = {
  ref_l2: 'Target Language',
  ref_l1: 'English (L1)',
};

const SLOT_DESC: Record<RefSlot, string> = {
  ref_l2: 'Reference recording in the target language.',
  ref_l1: 'Reference recording in English.',
};

function initStates(): Record<RefSlot, RefState> {
  return Object.fromEntries(
    REF_SLOTS.map((s) => [s, { url: null, fileName: null, progress: null, error: null, dragOver: false }]),
  ) as Record<RefSlot, RefState>;
}

export function RefAudioUploader({ lessonCode }: { lessonCode: string }) {
  const [states, setStates] = useState<Record<RefSlot, RefState>>(initStates);
  const fileRefs = useRef<Record<RefSlot, HTMLInputElement | null>>(
    {} as Record<RefSlot, HTMLInputElement | null>,
  );

  const patch = useCallback((slot: RefSlot, delta: Partial<RefState>) => {
    setStates((prev) => ({ ...prev, [slot]: { ...prev[slot], ...delta } }));
  }, []);

  useEffect(() => {
    if (!lessonCode) return;
    setStates(initStates());
    void getRefAudio(lessonCode).then((rows) => {
      setStates((prev) => {
        const next = { ...prev };
        for (const slot of REF_SLOTS) {
          if (rows[slot]) {
            next[slot] = { ...next[slot], url: rows[slot]!.audio_url, fileName: rows[slot]!.file_name };
          }
        }
        return next;
      });
    });
  }, [lessonCode]);

  const handleFile = useCallback(
    async (slot: RefSlot, file: File) => {
      if (!file.name.match(/\.(mp3|mpeg)$/i)) {
        patch(slot, { error: 'Only .mp3 files are accepted.' });
        return;
      }
      patch(slot, { error: null, progress: 0 });
      const result = await uploadRefAudio(lessonCode, slot, file, (pct) =>
        patch(slot, { progress: pct }),
      );
      if ('error' in result) {
        patch(slot, { error: result.error, progress: null });
      } else {
        patch(slot, { url: result.url, fileName: file.name, progress: null });
        setTimeout(() => patch(slot, { progress: null }), 1200);
      }
    },
    [lessonCode, patch],
  );

  const handleDelete = useCallback(
    async (slot: RefSlot) => {
      patch(slot, { error: null });
      const { error } = await deleteRefAudio(lessonCode, slot);
      if (error) patch(slot, { error });
      else patch(slot, { url: null, fileName: null });
    },
    [lessonCode, patch],
  );

  return (
    <section className="mt-8">
      <div className="mb-4 text-[11px] font-bold tracking-[.1em] text-muted">REFERENCE AUDIO</div>
      <div className="grid gap-4 sm:grid-cols-2">
        {REF_SLOTS.map((slot) => {
          const st = states[slot];
          const uploaded = !!st.url;

          return (
            <div
              key={slot}
              className={`rounded-[18px] border bg-white p-5 transition-colors ${
                st.dragOver ? 'border-emerald bg-emerald/5' : 'border-rule'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                patch(slot, { dragOver: true });
              }}
              onDragLeave={() => patch(slot, { dragOver: false })}
              onDrop={(e) => {
                e.preventDefault();
                patch(slot, { dragOver: false });
                const file = e.dataTransfer.files[0];
                if (file) void handleFile(slot, file);
              }}
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <div className="text-[9.5px] font-bold tracking-[.14em] text-muted">
                    {SLOT_LABEL[slot]}
                  </div>
                  <div className="mt-[3px] text-lg font-extrabold text-heading">
                    {SLOT_TITLE[slot]}
                  </div>
                </div>
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                    uploaded ? 'bg-emerald text-cream' : 'bg-rule text-locked'
                  }`}
                >
                  {uploaded ? '✓' : '—'}
                </div>
              </div>

              <p className="mb-4 text-[11.5px] leading-[1.5] text-muted">{SLOT_DESC[slot]}</p>

              {uploaded && st.url && (
                <div className="mb-3 rounded-[10px] bg-cream px-3 py-2">
                  <div className="truncate text-[10.5px] font-semibold text-muted">
                    {st.fileName ?? 'uploaded'}
                  </div>
                  <audio controls src={st.url} className="mt-1.5 h-7 w-full" />
                </div>
              )}

              {st.progress !== null && (
                <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-rule">
                  <div
                    className="h-full rounded-full bg-coral transition-all duration-300"
                    style={{ width: `${st.progress}%` }}
                  />
                </div>
              )}

              {st.error && (
                <div className="mb-3 rounded-[8px] bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-600">
                  {st.error}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => fileRefs.current[slot]?.click()}
                  disabled={st.progress !== null}
                  className="flex-1 rounded-[10px] border border-dashed border-rule py-2.5 text-[11.5px] font-semibold text-muted transition-colors hover:border-emerald hover:text-emerald disabled:opacity-40"
                >
                  {uploaded ? 'Replace MP3' : 'Upload MP3'}
                </button>
                {uploaded && (
                  <button
                    onClick={() => void handleDelete(slot)}
                    className="rounded-[10px] border border-rule px-3 py-2.5 text-[11.5px] font-semibold text-muted hover:border-red-300 hover:text-red-500"
                  >
                    ✕
                  </button>
                )}
              </div>

              <input
                ref={(el) => {
                  fileRefs.current[slot] = el;
                }}
                type="file"
                accept=".mp3,audio/mpeg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(slot, file);
                  e.target.value = '';
                }}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
