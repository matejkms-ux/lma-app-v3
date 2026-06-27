import { AUDIO_STEPS, type Step } from '../tokens';
import {
  getLessonAudio,
  getLessonStepIndex,
  getSentenceLessonCodes,
  getLessonTitle,
  getLessonTitles,
  parseLessonCode,
} from './lessonAudio';

export interface PracticeLesson {
  code: string;
  /** Display title — the custom DB title when set, else the static "Lesson N". */
  title: string;
  /** The static "Lesson N" label, kept so a custom title can show it as a sublabel. */
  defaultTitle?: string;
  language: string;
  /** canonical step → audio URL. Only steps present here are playable. */
  audio: Partial<Record<Step, string>>;
  /** reps awarded for finishing a step's audio. */
  pointsPerStep: number;
  /** How many of this lesson's steps have audio (denominator for the counter). */
  audioStepCount: number;
  /** Bonus lessons (`…-bonus001`) group at the top, always open, off the main path. */
  bonus: boolean;
}

const DEFAULT_POINTS_PER_STEP = 10;

/**
 * The catalog is DERIVED FROM THE DATABASE — there is no hand-maintained list, so
 * it can never drift out of sync with what's actually uploaded (the old static
 * `PRACTICE_LESSONS` array caused lessons to go missing, e.g. JERODC2604-th-002,
 * and made ghosts of lessons that were never uploaded). A lesson is real when it
 * has step audio or sentences.
 *
 * Lessons are SCOPED PER LEARNER: a lesson belongs to a user when its code is
 * prefixed with that user's `scope` (their username, e.g. `JERODC2604-th`). This
 * keeps one learner from seeing another's lessons even though audio is stored in a
 * shared bucket. Malformed/legacy codes (ISL001, case-mismatched dupes) fail to
 * parse and are skipped. Cached per scope for synchronous reads.
 */
const _catalog: Record<string, PracticeLesson[]> = {};

/** A lesson's owning scope — the code minus its trailing `-<number>` / `-bonus<number>`. */
export function lessonScope(code: string): string {
  return code.replace(/-(?:bonus)?\d{1,4}$/, '');
}

function buildLesson(code: string, audioSteps: Step[], title?: string): PracticeLesson | null {
  const parsed = parseLessonCode(code);
  if (!parsed) return null; // legacy / malformed code → not a real catalog lesson
  const defaultTitle = parsed.bonus ? `Bonus ${parsed.lessonNr}` : `Lesson ${parsed.lessonNr}`;
  return {
    code,
    title: title && title !== defaultTitle ? title : defaultTitle,
    defaultTitle,
    language: parsed.language,
    audio: {},
    pointsPerStep: DEFAULT_POINTS_PER_STEP,
    audioStepCount: audioSteps.length,
    bonus: parsed.bonus,
  };
}

/**
 * Load a learner's lesson catalog (codes prefixed with `scope`) from the DB and
 * cache it. `scope` is the user's username; an empty scope yields no lessons.
 */
export async function getLessonCatalog(scope: string): Promise<PracticeLesson[]> {
  if (!scope) return [];
  const [stepIndex, sentenceCodes] = await Promise.all([
    getLessonStepIndex(),
    getSentenceLessonCodes(),
  ]);

  const codes = new Set<string>([...Object.keys(stepIndex), ...sentenceCodes]);
  const titles = await getLessonTitles([...codes]);

  const mine: PracticeLesson[] = [];
  for (const code of codes) {
    if (!code.startsWith(`${scope}-`)) continue; // only this learner's lessons
    const lesson = buildLesson(code, stepIndex[code] ?? [], titles[code]);
    if (!lesson) continue;
    mine.push(lesson);
  }
  // Bonus lessons first (their own group at the top), then the main path by number.
  mine.sort((a, b) =>
    a.bonus !== b.bonus
      ? (a.bonus ? -1 : 1)
      : parseLessonCode(a.code)!.lessonNr - parseLessonCode(b.code)!.lessonNr,
  );
  _catalog[scope] = mine;
  return mine;
}

/**
 * Synchronous read of a learner's last-loaded catalog. Returns [] until
 * `getLessonCatalog` has resolved for that scope (warmed on login + each screen).
 */
export function lessonsForUser(scope: string): PracticeLesson[] {
  return _catalog[scope] ?? [];
}

/**
 * Resolve a single lesson by code — with its audio URLs and custom title — directly
 * from the DB. Works for ANY well-formed code, not a fixed list, so newly uploaded
 * lessons open without a code change.
 */
export async function getPracticeLessonWithAudio(code: string): Promise<PracticeLesson | undefined> {
  const parsed = parseLessonCode(code);
  if (!parsed) return undefined;

  const [rows, customTitle] = await Promise.all([getLessonAudio(code), getLessonTitle(code)]);

  const audio: Partial<Record<Step, string>> = {};
  let audioStepCount = 0;
  if (rows) {
    for (const step of AUDIO_STEPS) {
      if (rows[step]?.audio_url) {
        audio[step] = rows[step].audio_url;
        audioStepCount++;
      }
    }
  }

  const defaultTitle = parsed.bonus ? `Bonus ${parsed.lessonNr}` : `Lesson ${parsed.lessonNr}`;
  return {
    code,
    title: customTitle && customTitle !== defaultTitle ? customTitle : defaultTitle,
    defaultTitle,
    language: parsed.language,
    audio,
    pointsPerStep: DEFAULT_POINTS_PER_STEP,
    audioStepCount,
    bonus: parsed.bonus,
  };
}
