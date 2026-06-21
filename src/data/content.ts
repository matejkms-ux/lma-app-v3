import { AUDIO_STEPS, type Step } from '../tokens';
import { getLessonAudio } from './lessonAudio';

export interface PracticeLesson {
  code: string;
  title: string;
  language: string;
  /** canonical step → audio URL. Only steps present here are playable. */
  audio: Partial<Record<Step, string>>;
  /** reps awarded for finishing a step's audio. */
  pointsPerStep: number;
  /**
   * How many steps have (or will have) audio for this lesson.
   * Used as the denominator in the lesson counter before audio is async-loaded.
   */
  audioStepCount: number;
}

export const PRACTICE_LESSONS: PracticeLesson[] = [
  {
    code: 'ANAMARIJAC2604-de-001',
    title: 'Lesson 1',
    language: 'GERMAN',
    audio: {},
    pointsPerStep: 10,
    audioStepCount: 5,
  },
  {
    code: 'ANAMARIJAC2604-de-002',
    title: 'Lesson 2',
    language: 'GERMAN',
    audio: {},
    pointsPerStep: 1,
    audioStepCount: 0,
  },
  {
    code: 'ANAMARIJAC2604-de-003',
    title: 'Lesson 3',
    language: 'GERMAN',
    audio: {},
    pointsPerStep: 1,
    audioStepCount: 0,
  },
  {
    code: 'ANAMARIJAC2604-de-004',
    title: 'Lesson 4',
    language: 'GERMAN',
    audio: {},
    pointsPerStep: 1,
    audioStepCount: 0,
  },
  {
    code: 'JERODC2604-th-001',
    title: 'Lesson 1',
    language: 'THAI',
    audio: {},
    pointsPerStep: 1,
    audioStepCount: 5,
  },
  {
    code: 'JERODC2604-th-002',
    title: 'Lesson 2',
    language: 'THAI',
    audio: {},
    pointsPerStep: 1,
    audioStepCount: 5,
  },
  {
    code: 'JERODC2604-th-003',
    title: 'Lesson 3',
    language: 'THAI',
    audio: {},
    pointsPerStep: 1,
    audioStepCount: 0,
  },
  {
    code: 'JERODC2604-th-004',
    title: 'Lesson 4',
    language: 'THAI',
    audio: {},
    pointsPerStep: 1,
    audioStepCount: 0,
  },
  {
    code: 'TOMR2504-km-001',
    title: 'Lesson 1',
    language: 'KHMER',
    audio: {},
    pointsPerStep: 1,
    audioStepCount: 0,
  },
  {
    code: 'WONCHAKL2401-ja-001',
    title: 'Lesson 1',
    language: 'JAPANESE',
    audio: {},
    pointsPerStep: 1,
    audioStepCount: 0,
  },
];

export function getPracticeLesson(code: string): PracticeLesson | undefined {
  return PRACTICE_LESSONS.find((l) => l.code === code);
}

/** The lessons available for a language. */
export function lessonsForLanguage(language: string): PracticeLesson[] {
  return PRACTICE_LESSONS.filter((l) => l.language === language);
}

/**
 * Loads a lesson's audio URLs from Supabase lesson_audio, overlaying them on
 * the static lesson entry. Falls back to the static audio map if Supabase is
 * unreachable. Returns undefined if the lesson code is not registered.
 */
export async function getPracticeLessonWithAudio(code: string): Promise<PracticeLesson | undefined> {
  const base = getPracticeLesson(code);
  if (!base) return undefined;

  const rows = await getLessonAudio(code);
  if (!rows) return base;

  const audio: Partial<Record<Step, string>> = { ...base.audio };
  for (const step of AUDIO_STEPS) {
    if (rows[step]?.audio_url) audio[step] = rows[step].audio_url;
  }
  return { ...base, audio };
}
