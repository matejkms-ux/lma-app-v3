import { useState, useRef, useCallback, useEffect } from 'react';
import { AUDIO_STEPS, type Step } from '../tokens';
import { STEP_CONFIG } from '../practice/steps';
import {
  getLessonAudio,
  uploadStepAudio,
  deleteStepAudio,
  getLessonTitle,
  setLessonTitle,
  getLessonStepIndex,
  getSentenceLessonCodes,
  getLessonTitles,
  parseLessonCode,
  adminClient,
  type LessonAudioRow,
} from '../data/lessonAudio';
import { USERS, displayName, type User } from '../data/mock';
import { SentenceUploader } from './admin/SentenceUploader';
import { SentenceAudioUploader } from './admin/SentenceAudioUploader';
import { RefAudioUploader } from './admin/RefAudioUploader';
import { LearnerEditor } from './admin/LearnerEditor';

// Fixed cohort suffix for this programme cohort.
const COHORT = 'C2604';

const LANG_CODE: Record<string, string> = {
  GERMAN: 'de',
  JAPANESE: 'ja',
  KHMER: 'km',
  THAI: 'th',
  SPANISH: 'es',
  PORTUGUESE: 'pt',
  FRENCH: 'fr',
  MANDARIN: 'zh',
  ARABIC: 'ar',
};

function buildLessonCode(user: User, nr: number): string {
  const n = nr.toString().padStart(3, '0');
  if (user.username) return `${user.username}-${n}`;
  const lang = LANG_CODE[user.language] ?? user.language.toLowerCase().slice(0, 2);
  return `${user.name.toUpperCase()}${COHORT}-${lang}-${n}`;
}

interface StepState {
  row: LessonAudioRow | null;
  file: File | null;
  progress: number | null;
  error: string | null;
  dragOver: boolean;
}

function initStates(): Record<Step, StepState> {
  return Object.fromEntries(
    AUDIO_STEPS.map((s) => [s, { row: null, file: null, progress: null, error: null, dragOver: false }]),
  ) as Record<Step, StepState>;
}

export function AdminScreen() {
  const [roster, setRoster] = useState<User[]>(USERS);
  const [selectedId, setSelectedId] = useState<string>(
    USERS.find((u) => u.firstName === 'Anamarija')?.id ?? USERS[0]?.id ?? '',
  );
  const [lessonNr, setLessonNr] = useState(1);
  const [states, setStates] = useState<Record<Step, StepState>>(initStates);
  const [loading, setLoading] = useState(false);
  const fileRefs = useRef<Record<Step, HTMLInputElement | null>>({} as Record<Step, HTMLInputElement | null>);

  // Custom lesson title (rename). `defaultTitle` is the "Lesson N" fallback.
  const defaultTitle = `Lesson ${lessonNr}`;
  const [lessonTitle, setLessonTitle_] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const [titleStatus, setTitleStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  // Load roster from Supabase, fall back to mock.
  useEffect(() => {
    if (!adminClient) return;
    adminClient
      .from('users')
      .select('id, name, first_name, last_names, called_name, language, username')
      .eq('role', 'adventurer')
      .order('name')
      .then(({ data }) => {
        if (data && data.length) {
          const mapped: User[] = data.map((r) => ({
            id: r.id as string,
            name: r.name as string,
            firstName: (r.first_name as string | null) ?? undefined,
            lastNames: (r.last_names as string | null) ?? undefined,
            calledName: (r.called_name as string | null) ?? undefined,
            language: r.language as string,
            username: (r.username as string | null) ?? undefined,
          }));
          setRoster(mapped);
          const anamarija = mapped.find((u) => u.firstName === 'Anamarija');
          setSelectedId(anamarija?.id ?? mapped[0].id);
        }
      });
  }, []);

  const selectedUser = roster.find((u) => u.id === selectedId) ?? roster[0];
  const lessonCode = selectedUser ? buildLessonCode(selectedUser, lessonNr) : '';

  // Lessons that have CONTENT (sentences) but NO voice yet — these are locked from
  // learners, so prompt the admin to record/create them.
  const [needsVoice, setNeedsVoice] = useState<{ code: string; nr: number; title: string }[]>([]);
  useEffect(() => {
    const scope = selectedUser?.username;
    if (!scope) { setNeedsVoice([]); return; }
    let alive = true;
    void Promise.all([getLessonStepIndex(), getSentenceLessonCodes()]).then(async ([stepIndex, sentCodes]) => {
      const mine = sentCodes.filter((c) => c.startsWith(`${scope}-`));
      const missing = mine.filter((c) => !(stepIndex[c]?.length));
      const titles = await getLessonTitles(missing);
      const rows = missing
        .map((c) => ({ code: c, nr: parseLessonCode(c)?.lessonNr ?? 0, title: titles[c] || '' }))
        .sort((a, b) => a.nr - b.nr);
      if (alive) setNeedsVoice(rows);
    });
    return () => { alive = false; };
  }, [selectedUser?.username, lessonCode]);

  const patch = useCallback((step: Step, delta: Partial<StepState>) => {
    setStates((prev) => ({ ...prev, [step]: { ...prev[step], ...delta } }));
  }, []);

  const fetchExisting = useCallback(async (code: string) => {
    if (!code) return;
    setLoading(true);
    setStates(initStates());
    const rows = await getLessonAudio(code);
    if (rows) {
      setStates((prev) => {
        const next = { ...prev };
        for (const s of AUDIO_STEPS) {
          if (rows[s]) next[s] = { ...next[s], row: rows[s] };
        }
        return next;
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchExisting(lessonCode);
  }, [lessonCode, fetchExisting]);

  // Load the lesson's custom title (blank field = no custom title, shows "Lesson N").
  useEffect(() => {
    let alive = true;
    setTitleStatus(null);
    setLessonTitle_('');
    if (!lessonCode) return;
    void getLessonTitle(lessonCode).then((t) => {
      if (alive && t && t !== `Lesson ${lessonNr}`) setLessonTitle_(t);
    });
    return () => { alive = false; };
  }, [lessonCode, lessonNr]);

  const handleSaveTitle = useCallback(async () => {
    if (!lessonCode) return;
    setSavingTitle(true);
    setTitleStatus(null);
    const title = lessonTitle.trim() || `Lesson ${lessonNr}`;
    const { error } = await setLessonTitle(lessonCode, title);
    setSavingTitle(false);
    setTitleStatus(error ? { ok: false, msg: error } : { ok: true, msg: 'Saved.' });
  }, [lessonCode, lessonTitle, lessonNr]);

  const handleFile = useCallback(
    async (step: Step, file: File) => {
      if (!file.name.match(/\.(mp3|mpeg)$/i)) {
        patch(step, { error: 'Only .mp3 files are accepted.' });
        return;
      }
      patch(step, { file, error: null, progress: 0 });
      const result = await uploadStepAudio(lessonCode, step, file, (pct) =>
        patch(step, { progress: pct }),
      );
      if ('error' in result) {
        patch(step, { error: result.error, progress: null });
      } else {
        patch(step, {
          progress: 100,
          row: {
            lesson_code: lessonCode,
            step,
            audio_url: result.url,
            file_name: file.name,
            updated_at: new Date().toISOString(),
          },
          file: null,
        });
        setTimeout(() => patch(step, { progress: null }), 1200);
      }
    },
    [lessonCode, patch],
  );

  const handleDelete = useCallback(
    async (step: Step) => {
      patch(step, { error: null });
      const { error } = await deleteStepAudio(lessonCode, step);
      if (error) patch(step, { error });
      else patch(step, { row: null, file: null, progress: null });
    },
    [lessonCode, patch],
  );

  const handleDrop = useCallback(
    (step: Step, e: React.DragEvent) => {
      e.preventDefault();
      patch(step, { dragOver: false });
      const file = e.dataTransfer.files[0];
      if (file) handleFile(step, file);
    },
    [handleFile, patch],
  );

  return (
    <div className="min-h-screen bg-cream font-sans">
      {/* Header */}
      <div className="border-b border-rule bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-[.12em] text-muted">LMA ADMIN</div>
            <div className="mt-0.5 font-serif text-xl italic text-heading">Audio Uploader</div>
          </div>
          <a href="/" className="text-xs font-semibold text-muted hover:text-heading">
            Back to app
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Prompt: lessons that have content but no voice yet (locked from learners) */}
        {needsVoice.length > 0 && (
          <div className="mb-6 rounded-[18px] border border-coral/40 bg-coral/[.06] p-5">
            <div className="flex items-center gap-2">
              <span className="text-[15px]">🎙️</span>
              <div className="text-sm font-bold text-heading">
                {needsVoice.length} lesson{needsVoice.length > 1 ? 's' : ''} need{needsVoice.length > 1 ? '' : 's'} voice
              </div>
            </div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
              These lessons have sentences but no audio, so they're <strong>locked</strong> for{' '}
              {selectedUser ? displayName(selectedUser) : 'this learner'}. Record/create them so they unlock.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {needsVoice.slice(0, 12).map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLessonNr(l.nr)}
                  className="rounded-full border border-coral/40 bg-white px-3 py-[5px] text-[11px] font-bold text-heading hover:bg-coral/10"
                  title={l.title || l.code}
                >
                  {l.title || `Lesson ${l.nr}`}
                </button>
              ))}
              {needsVoice.length > 12 && (
                <span className="self-center text-[11px] font-semibold text-muted">
                  +{needsVoice.length - 12} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Learner + lesson selector */}
        <div className="mb-8 rounded-[18px] border border-rule bg-white p-5">
          <div className="flex flex-wrap items-end gap-4">
            {/* Learner dropdown */}
            <div className="min-w-[180px] flex-1">
              <label className="mb-1.5 block text-[11px] font-bold tracking-[.1em] text-muted">
                LEARNER
              </label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full appearance-none rounded-[12px] border border-rule bg-cream px-4 py-3 text-sm font-semibold text-heading focus:border-emerald focus:outline-none"
              >
                {roster.map((u) => (
                  <option key={u.id} value={u.id}>
                    {displayName(u)} · {u.language}
                  </option>
                ))}
              </select>
            </div>

            {/* Lesson number */}
            <div>
              <label className="mb-1.5 block text-[11px] font-bold tracking-[.1em] text-muted">
                LESSON
              </label>
              <div className="flex items-center gap-1 rounded-[12px] border border-rule bg-cream px-2 py-2">
                <button
                  onClick={() => setLessonNr((n) => Math.max(1, n - 1))}
                  disabled={lessonNr <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-[8px] text-lg font-bold text-muted transition-colors hover:bg-rule disabled:opacity-30"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-extrabold text-heading">{lessonNr}</span>
                <button
                  onClick={() => setLessonNr((n) => n + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-[8px] text-lg font-bold text-muted transition-colors hover:bg-rule"
                >
                  +
                </button>
              </div>
            </div>

            {/* Computed code badge */}
            <div className="flex-1">
              <div className="mb-1.5 text-[11px] font-bold tracking-[.1em] text-muted">
                LESSON CODE
              </div>
              <div className="flex h-[46px] items-center rounded-[12px] border border-emerald/40 bg-emerald/5 px-4">
                <span className="font-mono text-[13px] font-bold tracking-[.04em] text-emerald">
                  {lessonCode}
                </span>
              </div>
            </div>
          </div>

          {/* Rename lesson — custom title shown in the app over "Lesson N" */}
          <div className="mt-4 border-t border-rule pt-4">
            <label className="mb-1.5 block text-[11px] font-bold tracking-[.1em] text-muted">
              LESSON TITLE
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                value={lessonTitle}
                onChange={(e) => { setLessonTitle_(e.target.value); setTitleStatus(null); }}
                placeholder={defaultTitle}
                className="min-w-[220px] flex-1 rounded-[12px] border border-rule bg-cream px-4 py-3 text-sm font-semibold text-heading placeholder:text-locked focus:border-emerald focus:outline-none"
              />
              <button
                onClick={() => void handleSaveTitle()}
                disabled={savingTitle}
                className="rounded-[10px] bg-emerald px-5 py-2.5 text-[12px] font-bold tracking-[.04em] text-cream disabled:opacity-40"
              >
                {savingTitle ? 'Saving…' : 'Save title'}
              </button>
              {titleStatus && (
                <span className={`text-[12px] font-semibold ${titleStatus.ok ? 'text-emerald' : 'text-red-500'}`}>
                  {titleStatus.msg}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-muted">
              Shown in the app as the lesson name, with “{defaultTitle}” beneath it. Leave blank to use “{defaultTitle}”.
            </p>
          </div>
        </div>

        {loading && (
          <div className="py-12 text-center text-sm font-semibold text-muted">Loading…</div>
        )}

        {!loading && (
          <>
            <div className="mb-4 text-[11px] font-bold tracking-[.1em] text-muted">
              {lessonCode} — ALL FIVE STEPS
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {AUDIO_STEPS.map((step) => {
                const cfg = STEP_CONFIG[step];
                const st = states[step];
                const uploaded = !!st.row;

                return (
                  <div
                    key={step}
                    className={`rounded-[18px] border bg-white p-5 transition-colors ${
                      st.dragOver ? 'border-emerald bg-emerald/5' : 'border-rule'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); patch(step, { dragOver: true }); }}
                    onDragLeave={() => patch(step, { dragOver: false })}
                    onDrop={(e) => handleDrop(step, e)}
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <div className="text-[9.5px] font-bold tracking-[.14em] text-muted">
                          {cfg.ordinal}
                        </div>
                        <div className="mt-[3px] text-lg font-extrabold text-heading">
                          {cfg.title}
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

                    <p className="mb-4 text-[11.5px] leading-[1.5] text-muted">
                      {cfg.instruction}
                    </p>

                    {uploaded && st.row && (
                      <div className="mb-3 rounded-[10px] bg-cream px-3 py-2">
                        <div className="truncate text-[10.5px] font-semibold text-muted">
                          {st.row.file_name ?? 'uploaded'}
                        </div>
                        <audio controls src={st.row.audio_url} className="mt-1.5 h-7 w-full" playsInline />
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
                        onClick={() => fileRefs.current[step]?.click()}
                        disabled={st.progress !== null && st.progress < 100}
                        className="flex-1 rounded-[10px] border border-dashed border-rule py-2.5 text-[11.5px] font-semibold text-muted transition-colors hover:border-emerald hover:text-emerald disabled:opacity-40"
                      >
                        {uploaded ? 'Replace MP3' : 'Upload MP3'}
                      </button>
                      {uploaded && (
                        <button
                          onClick={() => handleDelete(step)}
                          className="rounded-[10px] border border-rule px-3 py-2.5 text-[11.5px] font-semibold text-muted hover:border-red-300 hover:text-red-500"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <input
                      ref={(el) => { fileRefs.current[step] = el; }}
                      type="file"
                      accept=".mp3,audio/mpeg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(step, file);
                        e.target.value = '';
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Summary bar */}
            <div className="mt-8 flex items-center gap-3 rounded-[14px] border border-rule bg-white px-5 py-4">
              <div className="flex gap-1.5">
                {AUDIO_STEPS.map((s) => (
                  <div
                    key={s}
                    className={`h-2 w-8 rounded-full ${states[s].row ? 'bg-emerald' : 'bg-rule'}`}
                  />
                ))}
              </div>
              <span className="text-[11.5px] font-semibold text-muted">
                {AUDIO_STEPS.filter((s) => states[s].row).length} of 5 steps uploaded for {lessonCode}
              </span>
            </div>

            <RefAudioUploader lessonCode={lessonCode} />

            <LearnerEditor
              user={selectedUser ?? null}
              onSaved={(updated) => {
                setRoster((prev) =>
                  prev.some((u) => u.id === updated.id)
                    ? prev.map((u) => (u.id === updated.id ? updated : u))
                    : [...prev, updated],
                );
                setSelectedId(updated.id);
              }}
            />

            <SentenceUploader
              lessonCode={lessonCode}
              language={selectedUser?.language ?? ''}
              lessonNr={lessonNr}
            />

            <SentenceAudioUploader lessonCode={lessonCode} />
          </>
        )}
      </div>
    </div>
  );
}
