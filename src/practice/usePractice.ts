/**
 * The practice engine — progressive, persisted, and over the full five-step
 * method.
 *
 * Navigation runs through ALL five canonical steps (GRASP → HUM → SHADOW → READ →
 * RECALL), in order, even when a step has no audio yet — a missing clip must never
 * block reaching the next step. A step that HAS audio is cleared by playing its
 * clip to the end (worth `pointsPerStep` reps); a step WITHOUT audio is just a
 * pass-through until its clip lands. Progress is saved locally so a reload resumes
 * where the learner left off.
 */
import { useCallback, useMemo, useState } from 'react';
import { STEPS, type Step } from '../tokens';
import type { PracticeLesson } from '../data/content';
import { lessonProgress, markStepComplete, setCurrentStep, stepPassCount } from '../lib/progress';

function pickInitial(completed: Step[], saved: Step | null): Step {
  if (saved && STEPS.includes(saved)) return saved;
  return STEPS.find((s) => !completed.includes(s)) ?? STEPS[0];
}

export function usePractice(lesson: PracticeLesson, userId: string, startAt?: Step) {
  // Steps that currently have a clip — used for point totals, not navigation.
  const audioSteps = useMemo(() => STEPS.filter((s) => Boolean(lesson.audio[s])), [lesson]);

  const saved = useMemo(() => lessonProgress(userId, lesson.code), [userId, lesson.code]);
  const [completed, setCompleted] = useState<Step[]>(saved.completedSteps);
  const [step, setStep] = useState<Step>(() =>
    startAt ?? pickInitial(saved.completedSteps, saved.currentStep),
  );

  // Per-step pass counts for this lesson, initialised from the rep log.
  const [passes, setPasses] = useState<Record<Step, number>>(() =>
    Object.fromEntries(STEPS.map((s) => [s, stepPassCount(userId, lesson.code, s)])) as Record<Step, number>
  );

  const stepIndex = STEPS.indexOf(step);

  const goTo = useCallback(
    (s: Step) => {
      setStep(s);
      setCurrentStep(userId, lesson.code, s);
    },
    [userId, lesson.code],
  );

  const completeStep = useCallback(() => {
    if (!lesson.audio[step]) return; // no clip → nothing to clear
    markStepComplete(userId, lesson.code, step);
    setCompleted((prev) => (prev.includes(step) ? prev : [...prev, step]));
  }, [userId, lesson.code, step]);

  const bumpPass = useCallback((s: Step) => {
    setPasses((prev) => ({ ...prev, [s]: (prev[s] ?? 0) + 1 }));
  }, []);

  const next = useCallback(() => {
    const i = STEPS.indexOf(step);
    if (i < STEPS.length - 1) goTo(STEPS[i + 1]);
  }, [step, goTo]);

  const prev = useCallback(() => {
    const i = STEPS.indexOf(step);
    if (i > 0) goTo(STEPS[i - 1]);
  }, [step, goTo]);

  return {
    step,
    stepIndex,
    steps: STEPS,
    audioSteps,
    hasAudio: Boolean(lesson.audio[step]),
    completed,
    passes,
    isCompleted: (s: Step) => completed.includes(s),
    currentUrl: lesson.audio[step],
    pointsPerStep: lesson.pointsPerStep,
    isFirst: stepIndex <= 0,
    isLast: stepIndex >= STEPS.length - 1,
    allDone: audioSteps.length > 0 && audioSteps.every((s) => completed.includes(s)),
    completeStep,
    bumpPass,
    goTo,
    next,
    prev,
  };
}

export type PracticeApi = ReturnType<typeof usePractice>;
