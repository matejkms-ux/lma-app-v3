/**
 * Mock data — stands in for Supabase until the backend lands.
 * Shapes mirror the flat data model so swapping to live data is a fetch swap.
 */

export interface User {
  id: string;
  /** Full birth name: firstName + " " + lastNames. */
  name: string;
  firstName?: string;
  lastNames?: string;
  /** Preferred name if different from firstName (e.g. "Charles" for Won-Chak). */
  calledName?: string;
  language: string;
  username?: string;
}

export interface Sentence {
  id: string;
  sentenceNr: number;
  l2: string;
  l2_translit: string;
  l1: string;
  /** Per-sentence reference audio URL (may be absent). */
  l2_audio_url?: string | null;
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
  { id: 'u3', name: 'Anamarija Cvelbar', firstName: 'Anamarija', lastNames: 'Cvelbar',                      language: 'GERMAN',   username: 'ANAMARIJAC2604-de' },
  { id: 'u4', name: 'Jerod Cox',         firstName: 'Jerod',     lastNames: 'Cox',                           language: 'THAI',     username: 'JERODC2604-th'    },
  { id: 'u2', name: 'Tom Roberge',       firstName: 'Tom',       lastNames: 'Roberge',                       language: 'KHMER',    username: 'TOMR2504-km'      },
  { id: 'u1', name: 'Won-Chak Leung',    firstName: 'Won-Chak',  lastNames: 'Leung',    calledName: 'Charles', language: 'JAPANESE', username: 'WONCHAKL2401-ja'  },
];

/**
 * Display label: called name (or first name) + initials.
 * - When called == first name → append surname initials only: "Anamarija C"
 * - When called is a nickname  → append all birth-name initials: "Charles WCL"
 */
export function displayName(user: User): string {
  const fn = user.firstName ?? user.name.split(' ')[0] ?? '';
  const ln = user.lastNames ?? user.name.split(' ').slice(1).join(' ') ?? '';
  const called = user.calledName || fn || user.name;

  if (!fn || !ln) return called;

  // Split full birth name into tokens (handles hyphenated names like Won-Chak).
  const allParts = `${fn} ${ln}`.split(/[\s-]+/).filter(Boolean);

  const calledMatchesFirst = !user.calledName || user.calledName === fn;
  const initialsSource = calledMatchesFirst
    ? allParts.slice(1)  // called IS the first name: only surname initials
    : allParts;          // called is a nickname: initials of entire birth name

  const initials = initialsSource.map((p) => p[0].toUpperCase()).join('');
  return initials ? `${called} ${initials}` : called;
}

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
