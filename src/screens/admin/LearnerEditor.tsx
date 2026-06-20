import { useState } from 'react';
import { upsertUser } from '../../data/api';
import { displayName, type User } from '../../data/mock';

const LANGUAGES = ['GERMAN', 'JAPANESE', 'KHMER', 'THAI', 'SPANISH', 'FRENCH', 'MANDARIN', 'ARABIC'];

interface Props {
  user: User | null;
  onSaved: (user: User) => void;
}

interface FormState {
  firstName: string;
  lastNames: string;
  calledName: string;
  username: string;
  language: string;
}

function toForm(user: User | null): FormState {
  return {
    firstName: user?.firstName ?? '',
    lastNames: user?.lastNames ?? '',
    calledName: user?.calledName ?? '',
    username: user?.username ?? '',
    language: user?.language ?? 'GERMAN',
  };
}

export function LearnerEditor({ user, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(() => toForm(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = (k: keyof FormState, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  };

  const preview: User = {
    id: user?.id ?? '',
    name: [form.firstName, form.lastNames].filter(Boolean).join(' ') || '—',
    firstName: form.firstName || undefined,
    lastNames: form.lastNames || undefined,
    calledName: form.calledName || undefined,
    language: form.language,
    username: form.username || undefined,
  };

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastNames.trim() || !form.username.trim()) {
      setError('First name, last name(s), and username are required.');
      return;
    }
    setSaving(true);
    setError(null);
    const id = await upsertUser({
      name: [form.firstName.trim(), form.lastNames.trim()].join(' '),
      firstName: form.firstName.trim(),
      lastNames: form.lastNames.trim(),
      calledName: form.calledName.trim() || undefined,
      language: form.language,
      username: form.username.trim(),
    });
    setSaving(false);
    if (!id) {
      setError('Save failed. Check the console or Supabase connection.');
      return;
    }
    const updated: User = { ...preview, id };
    setSaved(true);
    onSaved(updated);
  };

  return (
    <div className="mt-8 rounded-[18px] border border-rule bg-white p-6">
      <div className="mb-5 text-[11px] font-bold tracking-[.1em] text-muted">
        {user ? 'EDIT LEARNER' : 'ADD LEARNER'}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="FIRST NAME" required>
          <input
            value={form.firstName}
            onChange={(e) => set('firstName', e.target.value)}
            placeholder="e.g. Won-Chak"
            className={inputCls}
          />
        </Field>

        <Field label="LAST NAME(S)" required>
          <input
            value={form.lastNames}
            onChange={(e) => set('lastNames', e.target.value)}
            placeholder="e.g. Leung"
            className={inputCls}
          />
        </Field>

        <Field label="CALLED NAME" hint="Leave blank if same as first name">
          <input
            value={form.calledName}
            onChange={(e) => set('calledName', e.target.value)}
            placeholder="e.g. Charles"
            className={inputCls}
          />
        </Field>

        <Field label="USERNAME" required>
          <input
            value={form.username}
            onChange={(e) => set('username', e.target.value)}
            placeholder="e.g. WONCHAKL2401-ja"
            className={inputCls}
          />
        </Field>

        <Field label="LANGUAGE">
          <select
            value={form.language}
            onChange={(e) => set('language', e.target.value)}
            className={`${inputCls} appearance-none`}
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </Field>

        <Field label="DISPLAY PREVIEW">
          <div className="flex h-[46px] items-center rounded-[12px] border border-rule bg-cream px-4">
            <span className="text-sm font-semibold text-heading">
              {preview.firstName ? displayName(preview) : '—'}
            </span>
          </div>
        </Field>
      </div>

      {error && (
        <div className="mt-4 rounded-[10px] bg-red-50 px-4 py-2.5 text-[12px] font-semibold text-red-600">
          {error}
        </div>
      )}

      {saved && (
        <div className="mt-4 rounded-[10px] bg-emerald/10 px-4 py-2.5 text-[12px] font-semibold text-emerald">
          Saved.
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-[12px] bg-emerald px-6 py-2.5 text-[13px] font-bold text-cream transition-opacity disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save learner'}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold tracking-[.1em] text-muted">
        {label}
        {required && <span className="ml-1 text-coral">*</span>}
        {hint && <span className="ml-2 font-normal normal-case tracking-normal text-locked">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full rounded-[12px] border border-rule bg-cream px-4 py-3 text-sm text-heading placeholder:text-locked focus:border-emerald focus:outline-none';
