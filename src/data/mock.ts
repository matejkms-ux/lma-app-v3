/**
 * Mock data — stands in for Supabase until the backend lands.
 * Shapes mirror the flat data model so swapping to live data is a fetch swap.
 */

export interface User {
  id: string;
  name: string;
  language: string;
}

export interface Sentence {
  id: string;
  sentenceNr: number;
  l2: string;
  l2_translit: string;
  l1: string;
  /** done | active | locked */
  status: 'done' | 'active' | 'locked';
  /** 0–5 accuracy stars; 0 when not yet graded */
  stars: number;
}

export interface Lesson {
  id: string;
  lesson_code: string;
  language: string;
  title: string;
}

export const USERS: User[] = [
  { id: 'u1', name: 'Charles', language: 'JAPANESE' },
  { id: 'u2', name: 'Tom', language: 'KHMER' },
  { id: 'u3', name: 'Anamarija', language: 'GERMAN' },
  { id: 'u4', name: 'Jerod', language: 'THAI' },
  { id: 'u5', name: 'Jason', language: 'JAPANESE' },
  { id: 'u6', name: 'Trenton', language: 'SPANISH' },
];

/** Placeholder sentences — replaced by live data once sentences are imported. */
export const SENTENCES: Sentence[] = [
  { id: 's1', sentenceNr: 1, l2: '...', l2_translit: '', l1: '...', status: 'locked', stars: 0 },
];

export const LESSONS: Lesson[] = [
  { id: 'l1', lesson_code: 'ANAMARIJAC2604-de-001', language: 'GERMAN', title: 'Lesson 1' },
];

/** The lesson currently in progress — drives Home, Practice and Overview. */
export const ACTIVE_LESSON = LESSONS[0];

/** Hero + long-view metrics (v3 brief §2 — reps are the hero). */
export const METRICS = {
  repsLifetime: 312,
  repsToday: 24,
  lessonsPassed: 2,
  lessonsTotal: 6,
  avgGradeSelf: 4.5,
  dayStreak: 9,
  dayOfProgram: 9,
  programLength: 28,
};

export const RECENT_ACTIVITY = [
  { date: 'Jun 19', text: 'Started Lesson 1 · Grasp step' },
  { date: 'Jun 18', text: 'Audio uploaded for Lesson 1' },
  { date: 'Jun 17', text: 'Programme begins' },
];

/** Bar heights for the "reps gathered" mini-chart on Activities (10 buckets). */
export const REPS_CHART = [28, 42, 35, 58, 50, 74, 64, 88, 78, 100];
