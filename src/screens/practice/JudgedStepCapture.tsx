import { useCallback, useEffect, useRef, useState } from 'react';
import { useRecorder } from '../../practice/useRecorder';
import { PulseDot } from '../../components/MicIndicator';
import { getSentences } from '../../data/api';
import { assessPronunciation, assessTargetForStep, isUnavailable } from '../../lib/assess';
import { setAutoScore, GRASP_GATE_STARS, type JudgedStep } from '../../lib/scoring';

/**
 * Per-sentence capture for a judged step (GRASP / SHADOW / RECALL). The learner
 * records each sentence in turn; each take is scored via the Azure function and
 * written to sentence_scores (auto_* only). GRASP scores the spoken English
 * meaning against L1 (en-US); SHADOW/RECALL score the spoken L2. Finishing the
 * pass calls onComplete (which awards the step's reps, like the audio steps).
 *
 * Prompt: plays the sentence's reference audio when present; otherwise shows the
 * L2 text so the step still works before per-sentence audio is loaded.
 */
interface Sent {
  id: string;
  sentenceNr: number;
  l1: string;
  l2: string;
  l2_translit: string | null;
  l2_audio_url: string | null;
}

type Outcome =
  | { kind: 'scored'; stars: number; word: number; pron: number }
  | { kind: 'unavailable' }
  | null;

export function JudgedStepCapture({
  userId,
  lessonCode,
  language,
  step,
  onComplete,
}: {
  userId: string;
  lessonCode: string;
  language: string;
  step: JudgedStep;
  onComplete: () => void;
}) {
  const recorder = useRecorder();
  const [sentences, setSentences] = useState<Sent[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [assessing, setAssessing] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [reveal, setReveal] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void getSentences(lessonCode).then((rows) => {
      if (!alive) return;
      setSentences(
        rows.map((s) => ({
          id: s.id,
          sentenceNr: s.sentenceNr,
          l1: s.l1,
          l2: s.l2,
          l2_translit: s.l2_translit || null,
          l2_audio_url: s.l2_audio_url ?? null,
        })),
      );
      setLoading(false);
    });
    return () => { alive = false; };
  }, [lessonCode]);

  const cur = sentences[idx];
  const showText = step === 'GRASP' ? false : step === 'SHADOW' ? false : reveal;
  const hideUntilReveal = step === 'RECALL' && !reveal;

  const handleTake = useCallback(
    async (blob: Blob) => {
      if (!cur) return;
      setAssessing(true);
      const { referenceText, locale } = assessTargetForStep(step, cur, language);
      const r = await assessPronunciation(blob, referenceText, locale);
      if (isUnavailable(r)) {
        setOutcome({ kind: 'unavailable' });
      } else {
        await setAutoScore(userId, cur.id, step, { wordAccuracy: r.word_accuracy, pronunciation: r.pronunciation });
        setOutcome({ kind: 'scored', stars: r.auto_stars, word: r.word_accuracy, pron: r.pronunciation });
      }
      setAssessing(false);
    },
    [cur, step, language, userId],
  );

  const onRecordTap = useCallback(async () => {
    if (assessing) return;
    if (recorder.status === 'recording') {
      const take = await recorder.stop();
      if (take) void handleTake(take.blob);
    } else {
      setOutcome(null);
      await recorder.start();
    }
  }, [assessing, recorder, handleTake]);

  const playReference = () => {
    const a = audioRef.current;
    if (!a || !cur?.l2_audio_url) return;
    a.src = cur.l2_audio_url;
    void a.play().catch(() => {});
  };

  const next = () => {
    setOutcome(null);
    setReveal(false);
    if (idx >= sentences.length - 1) onComplete();
    else setIdx((i) => i + 1);
  };

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-sm font-semibold text-teal">Loading…</div>;
  }
  if (sentences.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-1 px-8 text-center">
        <span className="text-[11px] font-bold tracking-[.16em] text-teal-dim">NO SENTENCES</span>
        <span className="font-serif text-[13px] italic text-teal-dim">This lesson has no sentences loaded yet.</span>
      </div>
    );
  }

  const recording = recorder.status === 'recording';
  const unsupported = recorder.status === 'unsupported';
  const promptHint =
    step === 'GRASP' ? 'Say the meaning in English' : step === 'SHADOW' ? 'Speak along with the voice' : 'Say it from memory';

  return (
    <div className="flex flex-1 flex-col overflow-hidden px-[22px]">
      <audio ref={audioRef} playsInline />

      <div className="mb-2 flex shrink-0 items-center justify-between">
        <span className="text-[10px] font-bold tracking-[.14em] text-teal">
          SENTENCE {idx + 1} / {sentences.length}
        </span>
        {cur?.l2_audio_url && (
          <button
            onClick={playReference}
            className="rounded-full border border-teal/40 px-3 py-1 text-[10px] font-bold tracking-[.08em] text-teal"
          >
            ▶ HEAR IT
          </button>
        )}
      </div>

      {/* Prompt */}
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        {hideUntilReveal ? (
          <button
            onClick={() => setReveal(true)}
            className="font-serif text-[15px] italic text-teal underline-offset-2 hover:underline"
          >
            tap to reveal after your take
          </button>
        ) : showText || step === 'GRASP' ? (
          // GRASP shows L2 text as the prompt when there's no per-sentence audio.
          <>
            {(showText || (step === 'GRASP' && !cur?.l2_audio_url)) && (
              <div className="font-serif text-[24px] leading-[1.35] text-cream">{cur?.l2}</div>
            )}
            {showText && cur?.l2_translit && <div className="text-[13px] text-teal">{cur.l2_translit}</div>}
            {step === 'GRASP' && <div className="text-[13px] italic text-teal-dim">grasp the meaning</div>}
          </>
        ) : (
          <div className="font-serif text-[15px] italic text-teal-dim">listen, then speak</div>
        )}

        {/* Result */}
        {outcome?.kind === 'scored' && (
          <div className="mt-1 flex flex-col items-center gap-1">
            <span className="text-[20px] leading-none">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={n <= outcome.stars ? 'text-coral' : 'text-teal/25'}>★</span>
              ))}
            </span>
            <span className="text-[10px] font-bold tracking-[.1em] text-teal-dim">
              {Math.round(outcome.word)} words · {Math.round(outcome.pron)} pron
            </span>
            {step === 'GRASP' && outcome.stars < GRASP_GATE_STARS && (
              <span className="rounded-full bg-coral/15 px-2 py-[1px] text-[9px] font-bold tracking-[.1em] text-coral">
                NEEDS REDO (under 4★)
              </span>
            )}
          </div>
        )}
        {outcome?.kind === 'unavailable' && (
          <span className="mt-1 text-[10px] font-semibold tracking-[.08em] text-teal-dim">
            AUTO-SCORE UNAVAILABLE · manual only
          </span>
        )}
      </div>

      {/* Record control */}
      <div className="mb-3 flex shrink-0 flex-col items-center gap-2">
        {unsupported ? (
          <span className="py-3 text-[11px] font-semibold tracking-[.08em] text-teal-dim">
            RECORDING UNAVAILABLE ON THIS BROWSER
          </span>
        ) : (
          <>
            <button
              onClick={() => void onRecordTap()}
              disabled={assessing}
              className={`flex h-[68px] w-[68px] items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-50 ${
                recording ? 'bg-coral' : 'border-2 border-coral/70 bg-coral/10'
              }`}
              aria-label={recording ? 'Stop and score' : 'Record'}
            >
              {recording ? <span className="h-5 w-5 rounded-[4px] bg-cream" /> : <span className="h-6 w-6 rounded-full bg-coral" />}
            </button>
            <span className="flex items-center gap-2 text-[11px] font-bold tracking-[.1em] text-teal">
              {assessing ? (
                'SCORING…'
              ) : recording ? (
                <>
                  <PulseDot /> TAP TO STOP &amp; SCORE
                </>
              ) : (
                promptHint.toUpperCase()
              )}
            </span>
          </>
        )}
      </div>

      {/* Advance */}
      <div className="mb-2 flex shrink-0 justify-end">
        <button
          onClick={next}
          className="rounded-full border border-teal/40 px-4 py-1.5 text-[11px] font-bold tracking-[.08em] text-teal"
        >
          {idx >= sentences.length - 1 ? 'FINISH STEP ✓' : 'NEXT SENTENCE ›'}
        </button>
      </div>
    </div>
  );
}
