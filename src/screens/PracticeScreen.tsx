import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { DeviceFrame } from '../components/DeviceFrame';
import { StatusBar } from '../components/StatusBar';
import { StepIndicator } from '../components/StepIndicator';
import { AudioPlayer } from '../components/AudioPlayer';
import { PulseDot } from '../components/MicIndicator';
import { GraspBody, HumBody, ShadowBody, ReadBody } from './practice/StepBodies';
import { FreestylePanel } from './practice/FreestylePanel';
import { STEP_CONFIG } from '../practice/steps';
import { usePractice } from '../practice/usePractice';
import { useRecorder } from '../practice/useRecorder';
import { useSession } from '../session';
import {
  getPracticeLessonWithAudio,
  lessonsForLanguage,
  type PracticeLesson,
} from '../data/content';
import { getSentences } from '../data/api';
import { getRecording, saveRecording, uploadRecording } from '../lib/recordings';
import { lifetimeReps, addRepEvent, getStepStars, setStepStars, setStepAutoScore, REPS_PER_PLAY } from '../lib/progress';
import { assessPronunciation, transcribeScore, isUnavailable, LOCALE_BY_LANGUAGE } from '../lib/assess';
import { JUDGED_STEPS } from '../lib/scoring';
import { STEPS, AUDIO_STEPS, type Step } from '../tokens';

export function PracticeScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSession();

  const locationState = location.state as { lessonCode?: string; startAt?: Step } | null;
  const stateCode = locationState?.lessonCode;
  const startAt = locationState?.startAt;

  const [lesson, setLesson] = useState<PracticeLesson | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(true);

  useEffect(() => {
    if (!user) return;
    const code = stateCode ?? lessonsForLanguage(user.language)[0]?.code;
    if (!code) {
      setLoadingLesson(false);
      return;
    }
    void getPracticeLessonWithAudio(code).then((l) => {
      setLesson(l ?? null);
      setLoadingLesson(false);
    });
  }, [stateCode, user?.language]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return <Navigate to="/" replace />;

  if (loadingLesson) {
    return (
      <DeviceFrame tone="dark">
        <StatusBar tone="dark" />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-sm font-semibold text-teal">Loading…</div>
        </div>
      </DeviceFrame>
    );
  }

  if (!lesson) {
    return (
      <DeviceFrame tone="dark">
        <StatusBar tone="dark" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="font-serif text-2xl italic text-cream">No audio yet</div>
          <div className="text-sm text-teal">No lessons are loaded for {user.language} yet.</div>
          <button
            onClick={() => navigate('/lessons')}
            className="rounded-full border border-teal/40 px-5 py-2 text-[12px] font-bold tracking-[.08em] text-teal"
          >
            ‹ BACK TO LESSONS
          </button>
        </div>
      </DeviceFrame>
    );
  }

  return <Player key={lesson.code} lesson={lesson} userId={user.id} startAt={startAt} />;
}

function Player({ lesson, userId, startAt }: { lesson: PracticeLesson; userId: string; startAt?: Step }) {
  const navigate = useNavigate();
  const api = usePractice(lesson, userId, startAt);
  const recorder = useRecorder();
  const cfg = STEP_CONFIG[api.step];
  const [lifetime, setLifetime] = useState(() => lifetimeReps(userId));
  const [playing, setPlaying] = useState(false);
  const [stars, setStarsState] = useState<number | null>(null);

  const [sentences, setSentences] = useState<Array<{ l1: string; l2: string; l2_translit: string | null }>>([]);
  useEffect(() => {
    void getSentences(lesson.code).then((rows) =>
      setSentences(rows.map((r) => ({ l1: r.l1, l2: r.l2, l2_translit: r.l2_translit || null }))),
    );
  }, [lesson.code]);

  // Whole-take auto score for the current step (judged steps only).
  const [autoScore, setAutoScore] = useState<
    null | 'scoring' | 'unavailable' | { stars: number; combined: number }
  >(null);

  // Stars for the five audio steps — needed to compute unlock status reactively.
  // FREESTYLE is excluded: it carries no rep/unlock state (its takes are rated
  // individually and stored separately).
  const [allStars, setAllStars] = useState<Record<Step, number | null>>(() =>
    Object.fromEntries(AUDIO_STEPS.map((s) => [s, getStepStars(userId, lesson.code, s)])) as Record<Step, number | null>
  );

  const [flash, setFlash] = useState<number | null>(null);
  const flashTimer = useRef<number | null>(null);

  // FREESTYLE gate: the lesson can only be finished once a full 60s freestyle
  // take exists (reported by the panel). Audio steps + this = lesson complete.
  const [freestyleComplete, setFreestyleComplete] = useState(false);

  const [takeUrl, setTakeUrl] = useState<string | null>(null);
  const [takePlaying, setTakePlaying] = useState(false);
  const takeAudioRef = useRef<HTMLAudioElement>(null);
  const takeUrlRef = useRef<string | null>(null);
  const setTake = useCallback((blob: Blob | null) => {
    if (takeUrlRef.current) URL.revokeObjectURL(takeUrlRef.current);
    const url = blob ? URL.createObjectURL(blob) : null;
    takeUrlRef.current = url;
    setTakeUrl(url);
  }, []);

  useEffect(() => {
    let alive = true;
    void getRecording(userId, lesson.code, api.step).then((rec) => {
      if (alive) setTake(rec ? rec.blob : null);
    });
    return () => { alive = false; };
  }, [userId, lesson.code, api.step, setTake]);

  useEffect(() => {
    setAutoScore(null); // clear the previous step's auto score
    setStarsState(getStepStars(userId, lesson.code, api.step));
  }, [userId, lesson.code, api.step]);

  useEffect(() => () => {
    if (takeUrlRef.current) URL.revokeObjectURL(takeUrlRef.current);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
  }, []);

  // A step is unlock-complete when it has no audio (pass-through) OR
  // the learner has 2+ passes OR 4+ stars on it.
  const isUnlockComplete = useCallback((s: Step): boolean => {
    if (!lesson.audio[s]) return true;
    return (api.passes[s] ?? 0) >= 2 || (allStars[s] ?? 0) >= 4;
  }, [lesson.audio, api.passes, allStars]);

  // GRASP is always unlocked; every other step requires the previous to be unlock-complete.
  const isUnlocked = useCallback((s: Step): boolean => {
    const idx = STEPS.indexOf(s);
    if (idx <= 0) return true;
    return isUnlockComplete(STEPS[idx - 1]);
  }, [isUnlockComplete]);

  const stepDone = api.isCompleted(api.step);
  const url = api.currentUrl;
  const hasAudio = Boolean(url);
  const isCurrentStepUnlocked = isUnlocked(api.step);

  // NEXT is available once the current step is unlock-complete (which unlocks the next).
  const canAdvance = useMemo(() => isUnlockComplete(api.step), [isUnlockComplete, api.step]);

  useEffect(() => {
    if (!hasAudio) setPlaying(false);
  }, [hasAudio]);

  const onPlay = useCallback(() => { void recorder.start(); }, [recorder]);

  const onEnded = useCallback(async () => {
    const take = await recorder.stop();
    if (take) {
      await saveRecording(userId, lesson.code, api.step, take.blob, take.mime);
      setTake(take.blob);
      void uploadRecording(userId, lesson.code, api.step, take.blob);
    }
    addRepEvent(userId, lesson.code, api.step, REPS_PER_PLAY);
    api.bumpPass(api.step);
    api.completeStep();
    const newTotal = lifetimeReps(userId);
    setLifetime(newTotal);
    setFlash(REPS_PER_PLAY);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 1900);

    // Whole-take auto evaluation for the judged steps (GRASP/SHADOW/RECALL):
    // score the recording of all sentences against the combined reference.
    // GRASP = spoken English meaning vs combined L1 (en-US); SHADOW/RECALL = L2.
    if (take && (JUDGED_STEPS as readonly string[]).includes(api.step) && sentences.length) {
      const isGrasp = api.step === 'GRASP';
      const referenceText = sentences.map((s) => (isGrasp ? s.l1 : s.l2)).join(' ');
      const locale = isGrasp ? 'en-US' : (LOCALE_BY_LANGUAGE[lesson.language] ?? 'en-US');
      setAutoScore('scoring');
      let r = await assessPronunciation(take.blob, referenceText, locale);
      // Pronunciation assessment unsupported for this locale (e.g. Khmer) →
      // fall back to transcription-based scoring (word accuracy).
      if (isUnavailable(r) && r.reason === 'locale_unsupported') {
        r = await transcribeScore(take.blob, referenceText, locale);
      }
      if (isUnavailable(r)) {
        setAutoScore('unavailable');
      } else {
        setAutoScore({ stars: r.auto_stars, combined: r.combined });
        void setStepAutoScore(userId, lesson.code, api.step, r.combined, r.auto_stars);
      }
    }
  }, [recorder, userId, lesson.code, lesson.language, api, setTake, sentences]);

  const handleRate = useCallback((n: number) => {
    setStepStars(userId, lesson.code, api.step, n);
    setStarsState(n);
    setAllStars((prev) => ({ ...prev, [api.step]: n }));
  }, [userId, lesson.code, api.step]);

  const toggleTake = () => {
    const a = takeAudioRef.current;
    if (!a) return;
    if (a.paused) void a.play().catch(() => {});
    else a.pause();
  };

  const body = () => {
    switch (cfg.body) {
      case 'dualWave': return <ShadowBody />;
      case 'melody':   return <HumBody />;
      case 'text':     return <ReadBody sentences={sentences} />;
      default:         return <GraspBody active={playing} />;
    }
  };

  // Hint text shown when NEXT is blocked by the unlock rule.
  const unlockHint = useMemo(() => {
    if (!hasAudio || canAdvance) return null;
    const passes = api.passes[api.step] ?? 0;
    const s = allStars[api.step] ?? 0;
    if (passes === 0) return null; // first play not done yet — standard "play to end" prompt shows
    if (passes === 1 && s < 4) return '1 more play or 4★ to unlock next step';
    if (s < 4) return `${2 - passes} more play${passes === 1 ? '' : 's'} or 4★ to unlock`;
    return null;
  }, [hasAudio, canAdvance, api.passes, api.step, allStars]);

  return (
    <DeviceFrame tone="dark">
      <StatusBar tone="dark" />

      {flash !== null && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <div className="animate-pop rounded-[26px] bg-coral px-9 py-6 text-center shadow-2xl">
            <div className="font-serif text-[52px] font-extrabold leading-none text-cream">+{flash}</div>
            <div className="mt-1.5 text-[12px] font-bold tracking-[.2em] text-cream/90">REPS EARNED</div>
          </div>
        </div>
      )}

      <div className="flex shrink-0 items-center justify-between px-5 pt-2.5 text-xs text-teal">
        <button onClick={() => navigate('/lessons')} className="p-1 text-xl" aria-label="Back">
          ‹
        </button>
        <button
          onClick={() => navigate('/sentences', { state: { lessonCode: lesson.code } })}
          className="font-semibold tracking-[.04em] underline-offset-2 hover:underline"
          aria-label="View sentences"
        >
          {lesson.code} · {lesson.title}
        </button>
        <span className="font-bold">
          {api.stepIndex + 1}/{api.steps.length}
        </span>
      </div>

      <StepIndicator
        currentIndex={api.stepIndex}
        isUnlocked={isUnlocked}
        onGoto={api.goTo}
      />

      <div className="shrink-0 px-7 pt-4 text-center">
        <div className="text-[11px] font-bold tracking-[.34em] text-teal">{cfg.ordinal}</div>
        <div className="mt-1 font-serif text-[40px] font-medium text-cream">{cfg.title}</div>
        <div className="mx-auto mt-1.5 max-w-[280px] font-serif text-[15px] italic leading-[1.5] text-teal">
          {cfg.instruction}
        </div>
      </div>

      {api.step === 'FREESTYLE' ? (
        isCurrentStepUnlocked ? (
          <FreestylePanel userId={userId} lesson={lesson.code} onCompletionChange={setFreestyleComplete} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 px-8 text-center">
            <span className="text-[11px] font-bold tracking-[.16em] text-teal-dim">STEP LOCKED</span>
            <span className="font-serif text-[13px] italic text-teal-dim">
              Complete the previous step to unlock freestyle.
            </span>
          </div>
        )
      ) : (
        <>
      {body()}

      {isCurrentStepUnlocked ? (
        url ? (
          <>
            <div className="mb-2 flex h-5 shrink-0 items-center justify-center gap-2.5">
              {recorder.status === 'recording' && (
                <>
                  <PulseDot />
                  <span className="text-[10px] font-bold tracking-[.14em] text-coral">{cfg.micLabel}</span>
                </>
              )}
              {(recorder.status === 'denied' || recorder.status === 'unsupported') && (
                <span className="text-[10px] font-semibold tracking-[.08em] text-teal-dim">
                  {recorder.status === 'unsupported'
                    ? 'RECORDING UNAVAILABLE ON THIS BROWSER'
                    : 'MIC OFF · playback still counts'}
                </span>
              )}
            </div>
            <div className="mb-3">
              <AudioPlayer
                src={url}
                onPlay={onPlay}
                onEnded={onEnded}
                onPlayingChange={setPlaying}
              />
            </div>
          </>
        ) : (
          <div className="mb-3 flex shrink-0 flex-col items-center gap-1 px-8 pb-1 text-center">
            <span className="text-[11px] font-bold tracking-[.16em] text-teal-dim">AUDIO COMING SOON</span>
            <span className="font-serif text-[13px] italic text-teal-dim">
              This step's recording isn't loaded yet — you can keep going.
            </span>
          </div>
        )
      ) : (
        <div className="mb-3 flex shrink-0 flex-col items-center gap-1 px-8 pb-1 text-center">
          <span className="text-[11px] font-bold tracking-[.16em] text-teal-dim">STEP LOCKED</span>
          <span className="font-serif text-[13px] italic text-teal-dim">
            Complete the previous step to play this one.
          </span>
        </div>
      )}

      <div className="mx-6 shrink-0 border-t border-teal/[.18] pb-3 pt-3.5">
        <div className="flex items-center gap-2.5">
          {!isCurrentStepUnlocked ? (
            <span className="text-[11px] font-bold tracking-[.06em] text-teal-dim">
              UNLOCK PREVIOUS STEP FIRST
            </span>
          ) : !hasAudio ? (
            <span className="text-[11px] font-bold tracking-[.06em] text-teal-dim">NO REPS HERE YET</span>
          ) : stepDone ? (
            <span className="inline-flex items-center gap-[7px] rounded-[20px] border border-teal/40 bg-teal/[.16] px-3 py-[5px]">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-teal text-[10px] text-emerald">
                ✓
              </span>
              <span className="text-[11px] font-extrabold tracking-[.06em] text-cream">
                +{REPS_PER_PLAY} REPS · DONE
              </span>
            </span>
          ) : (
            <span className="text-[11px] font-bold tracking-[.06em] text-teal">
              PLAY TO THE END FOR +{REPS_PER_PLAY} REPS
            </span>
          )}
          <span className="ml-auto font-serif text-[13px] italic text-teal-dim">
            {lifetime} reps
          </span>
        </div>

        {isCurrentStepUnlocked && unlockHint && (
          <div className="mt-1.5 text-[10px] font-semibold tracking-[.06em] text-teal/50">
            {unlockHint}
          </div>
        )}

        {autoScore && (
          <div className="mt-2 flex items-center gap-2 text-[11px] font-bold tracking-[.06em]">
            {autoScore === 'scoring' ? (
              <span className="text-teal-dim">SCORING…</span>
            ) : autoScore === 'unavailable' ? (
              <span className="text-teal-dim">AUTO-SCORE UNAVAILABLE · manual only</span>
            ) : (
              <>
                <span className="text-teal">AUTO</span>
                <span className="text-[15px] leading-none">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className={n <= autoScore.stars ? 'text-coral' : 'text-teal/25'}>★</span>
                  ))}
                </span>
                <span className="text-teal-dim">{Math.round(autoScore.combined)}/100</span>
              </>
            )}
          </div>
        )}

        {isCurrentStepUnlocked && stepDone && hasAudio && (
          <div className="mt-2.5 flex items-center gap-[5px]">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => handleRate(n)}
                className={`text-[22px] leading-none transition-transform hover:scale-110 active:scale-95 ${
                  stars !== null && n <= stars ? 'text-coral' : 'text-teal/25'
                }`}
              >
                ★
              </button>
            ))}
            <span className={`ml-1.5 text-[10px] font-bold tracking-[.1em] transition-opacity ${stars !== null ? 'text-coral/70' : 'text-teal/40'}`}>
              {stars !== null ? `${stars}/5` : 'RATE THIS STEP'}
            </span>
          </div>
        )}
        {isCurrentStepUnlocked && takeUrl && (
          <>
            <audio
              ref={takeAudioRef}
              src={takeUrl}
              playsInline
              onPlay={() => setTakePlaying(true)}
              onPause={() => setTakePlaying(false)}
              onEnded={() => setTakePlaying(false)}
            />
            <button
              onClick={toggleTake}
              className="mt-2.5 inline-flex items-center gap-2 rounded-full border border-coral/50 px-3 py-1.5 text-[11px] font-bold tracking-[.07em] text-coral"
            >
              <span className="text-[9px]">{takePlaying ? '❚❚' : '▶'}</span>
              {takePlaying ? 'PAUSE TAKE' : 'HEAR YOUR TAKE'}
            </button>
          </>
        )}
      </div>
        </>
      )}

      <div className="flex shrink-0 items-center justify-between gap-2 px-6 pb-5 pt-1">
        <button
          onClick={api.prev}
          disabled={api.isFirst}
          className="rounded-full border border-teal/30 px-4 py-1.5 text-[11px] font-bold tracking-[.08em] text-teal disabled:opacity-30"
        >
          ‹ PREV
        </button>
        <div className="flex gap-1.5">
          {api.steps.map((s) => (
            <span
              key={s}
              className={`h-1.5 w-1.5 rounded-full ${
                s === api.step ? 'bg-coral'
                : !isUnlocked(s) ? 'bg-teal/[.12]'
                : api.isCompleted(s) ? 'bg-teal'
                : 'bg-teal/30'
              }`}
              aria-label={s}
            />
          ))}
        </div>
        {api.isLast ? (
          <button
            onClick={() => navigate('/home')}
            disabled={!(api.allDone && freestyleComplete)}
            className="rounded-full border border-teal/30 px-4 py-1.5 text-[11px] font-bold tracking-[.08em] text-teal disabled:opacity-30"
          >
            {api.allDone && freestyleComplete ? 'FINISH ✓' : 'FINISH'}
          </button>
        ) : (
          <button
            onClick={api.next}
            disabled={!canAdvance}
            className="rounded-full border border-teal/30 px-4 py-1.5 text-[11px] font-bold tracking-[.08em] text-teal disabled:opacity-30"
          >
            NEXT ›
          </button>
        )}
      </div>
    </DeviceFrame>
  );
}
