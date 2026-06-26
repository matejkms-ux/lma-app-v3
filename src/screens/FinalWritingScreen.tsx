import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { DeviceFrame } from '../components/DeviceFrame';
import { StatusBar } from '../components/StatusBar';
import { useSession } from '../session';
import { finalProgramFor } from '../data/finalContent';
import { getWritingMap, setWritingEntry, markModuleDone, submitFinalWriting } from '../lib/finalProgress';

/**
 * Final Writing — productive writing, human-judged (never auto-scored, consistent
 * with the GRASP-against-L1 caution). The learner answers 2–4 open prompts in the
 * target language; submitting saves every answer to Supabase for the Language
 * Guide to review. Per-adventurer content; nothing here is learner-specific.
 */
export function FinalWritingScreen() {
  const navigate = useNavigate();
  const { user } = useSession();
  const program = useMemo(() => finalProgramFor(user?.username), [user?.username]);
  const writing = program?.writing ?? null;
  const language = program?.language ?? '';

  const [answers, setAnswers] = useState<Record<number, string>>(() =>
    user ? getWritingMap(user.id, user.username ?? '') : {},
  );
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [remoteSaved, setRemoteSaved] = useState(false);

  if (!user) return <Navigate to="/" replace />;

  if (!writing || writing.prompts.length === 0) {
    return (
      <DeviceFrame tone="light">
        <StatusBar tone="light" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="font-serif text-2xl italic text-heading">No writing task yet</div>
          <button onClick={() => navigate('/final')} className="rounded-full border border-rule px-5 py-2 text-[12px] font-bold tracking-[.08em] text-muted">‹ BACK</button>
        </div>
      </DeviceFrame>
    );
  }

  const wordCount = (i: number) => (answers[i] ?? '').trim().split(/\s+/).filter(Boolean).length;
  const allEnough = writing.prompts.every((p, i) => wordCount(i) >= p.minWords);

  const save = (i: number, t: string) => {
    setAnswers((prev) => ({ ...prev, [i]: t }));
    setWritingEntry(user.id, user.username ?? '', i, t);
  };

  const submit = async () => {
    setSaving(true);
    const ok = await submitFinalWriting(
      user.id,
      program!.scope,
      program!.language,
      program!.locale,
      writing.prompts.map((p, i) => ({ promptIndex: i, prompt: p.prompt, answer: answers[i] ?? '' })),
    );
    setRemoteSaved(ok);
    markModuleDone(user.id, user.username ?? '', 'writing');
    setSaving(false);
    setDone(true);
  };

  if (done) {
    const totalWords = writing.prompts.reduce((sum, _p, i) => sum + wordCount(i), 0);
    return (
      <DeviceFrame tone="light">
        <StatusBar tone="light" />
        <div className="flex flex-1 flex-col items-center justify-center px-7 pb-10 text-center">
          <div className="text-[42px]">✍️</div>
          <div className="mt-4 font-serif text-[28px] italic leading-snug text-heading">Enviado, {user.calledName ?? user.firstName ?? 'Neal'}.</div>
          <p className="mt-3 text-[14px] leading-[1.65] text-muted">
            {totalWords} words across {writing.prompts.length} prompts.{' '}
            {remoteSaved ? 'Your guide will read this before your final session.' : 'Saved on this device; it will sync for your guide when online.'}
          </p>
        </div>
        <div className="px-5 pb-5">
          <button onClick={() => navigate('/final')} className="w-full rounded-[15px] bg-emerald py-4 text-[15px] font-bold tracking-[.01em] text-cream">Done</button>
        </div>
      </DeviceFrame>
    );
  }

  return (
    <DeviceFrame tone="light">
      <StatusBar tone="light" />
      <div className="shrink-0 px-5 pb-1 pt-[16px]">
        <div className="text-[10px] font-bold tracking-[.16em] text-muted">{language} · FINAL WRITING</div>
        <div className="mt-1 font-serif text-[26px] italic leading-tight text-heading">{writing.title}</div>
        {writing.intro && <p className="mt-1.5 text-[13px] leading-[1.55] text-muted">{writing.intro}</p>}
      </div>

      <div className="scroll-region flex-1 px-5 pb-6 pt-3">
        <div className="flex flex-col gap-5">
          {writing.prompts.map((p, i) => {
            const words = wordCount(i);
            const enough = words >= p.minWords;
            return (
              <div key={i}>
                <div className="flex items-start gap-2.5">
                  <span className={`mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${enough ? 'bg-emerald text-cream' : 'bg-emerald/15 text-emerald'}`}>
                    {enough ? '✓' : i + 1}
                  </span>
                  <p className="flex-1 text-[15px] font-semibold leading-[1.45] text-heading">{p.prompt}</p>
                </div>
                {p.helper && <p className="mt-1.5 pl-7 text-[12px] leading-[1.5] text-muted">{p.helper}</p>}
                <textarea
                  value={answers[i] ?? ''}
                  onChange={(e) => save(i, e.target.value)}
                  placeholder="…"
                  className="mt-2 min-h-[140px] w-full resize-none rounded-2xl border border-rule bg-white p-4 text-[15px] leading-[1.65] text-heading placeholder:text-locked focus:border-emerald focus:outline-none"
                />
                <p className="mt-1 text-right text-[11px] text-muted">
                  {words} words{!enough && ` · ${p.minWords} min`}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="-mt-5 bg-gradient-to-t from-cream from-40% to-transparent px-5 pb-4 pt-2">
        <button
          onClick={submit}
          disabled={!allEnough || saving}
          className="w-full rounded-[15px] bg-emerald py-4 text-[15px] font-bold tracking-[.01em] text-cream disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Submit for review →'}
        </button>
      </div>
    </DeviceFrame>
  );
}
