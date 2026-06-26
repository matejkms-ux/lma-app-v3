/**
 * Super-App mock content — the Hub / Companion / Reader / Watch / Review modes.
 *
 * These modes are demonstrated against the same Khmer content the design brief
 * mocked (claude.ai/design handoff). They follow the app's established
 * mock→Supabase pattern: the shapes here are what the backend will eventually
 * serve, so screens stay thin and don't change when the data path lands.
 *
 * Word status drives the LingQ-style colouring shared by Reader + Watch:
 *   new      → fresh, underlined
 *   learning → coral
 *   known    → plain
 *   ignore   → treated as known, never surfaced for review
 */
export type WordStatus = 'new' | 'learning' | 'known' | 'ignore';

/** A tappable L2 token with the gloss shown in the shared word sheet. */
export interface Token {
  l2: string;
  translit?: string;
  pos?: string;
  gloss?: string;
  /** Trailing punctuation only — rendered inline, not tappable. */
  punct?: boolean;
  status?: WordStatus;
}

/** The word object the shared bottom sheet renders. */
export interface SheetWord {
  l2: string;
  translit: string;
  pos: string;
  gloss: string;
  context: string;
  status?: WordStatus;
}

// ─────────────────────────────── Companion ───────────────────────────────

export interface CompanionLesson {
  u: string;
  n: number;
  theme: string;
  dur: string;
}

export const COMPANION_LESSONS: CompanionLesson[] = [
  { u: 'Survival', n: 1, theme: 'First greetings', dur: '9 min' },
  { u: 'Survival', n: 2, theme: 'Do you understand?', dur: '10 min' },
  { u: 'Survival', n: 3, theme: 'Numbers & money', dur: '10 min' },
  { u: 'Daily life', n: 4, theme: 'At the market', dur: '10 min' },
  { u: 'Daily life', n: 5, theme: 'Ordering food', dur: '11 min' },
  { u: 'Daily life', n: 6, theme: 'Getting around', dur: '10 min' },
  { u: 'Social', n: 7, theme: 'Meeting friends', dur: '11 min' },
  { u: 'Social', n: 8, theme: 'Making plans', dur: '12 min' },
];

export const COMPANION_UNIT_ORDER = ['Survival', 'Daily life', 'Social'];

/** The current lesson (4) is in progress; 1–3 done; 5+ locked. */
export const CURRENT_COMPANION_LESSON = 4;

export interface CompanionItem {
  l1: string;
  l2: string;
  translit: string;
}

export const COMPANION_SCRIPT: CompanionItem[] = [
  { l1: 'the market', l2: 'ផ្សារ', translit: 'phsaa' },
  { l1: 'I would like', l2: 'ខ្ញុំចង់បាន', translit: 'khnhom chang baan' },
  { l1: 'How much is it?', l2: 'តម្លៃប៉ុន្មាន', translit: 'tâmlai ponmaan' },
];

/** The three hands-free beats and how long each holds before advancing. */
export const COMPANION_BEATS = ['teach', 'anticipation', 'confirm'] as const;
export type CompanionBeat = (typeof COMPANION_BEATS)[number];
export const COMPANION_BEAT_DUR: Record<CompanionBeat, number> = {
  teach: 3200,
  anticipation: 4000,
  confirm: 2600,
};

// ──────────────────────────────── Reader ─────────────────────────────────

export interface ReaderText {
  id: string;
  title: string;
  titleEn: string;
  level: string;
  len: string;
  pct: number;
}

export const READER_TEXTS: ReaderText[] = [
  { id: 'market', title: 'នៅផ្សារ', titleEn: 'At the market', level: 'Beginner', len: '118 words', pct: 64 },
  { id: 'trip', title: 'ដំណើរកម្សាន្ត', titleEn: 'A short trip', level: 'Intermediate', len: '240 words', pct: 38 },
  { id: 'letter', title: 'សំបុត្រពីម្តាយ', titleEn: 'A letter from mother', level: 'Intermediate', len: '310 words', pct: 21 },
];

/** Reading passage tokens. status: new | learning | known. punct: trailing only. */
export const READING_TOKENS: Token[] = [
  { l2: 'ខ្ញុំ', translit: 'khnhom', pos: 'pronoun', gloss: 'I, me', status: 'known' },
  { l2: 'ទៅ', translit: 'tɨv', pos: 'verb', gloss: 'to go', status: 'known' },
  { l2: 'ផ្សារ', translit: 'phsaa', pos: 'noun', gloss: 'market', status: 'learning' },
  { l2: 'នៅ', translit: 'nɨv', pos: 'prep', gloss: 'at, in', status: 'known' },
  { l2: 'ពេលព្រឹក', translit: 'pel prɨk', pos: 'noun', gloss: 'morning', status: 'new' },
  { l2: '។', punct: true },
  { l2: 'ខ្ញុំ', translit: 'khnhom', pos: 'pronoun', gloss: 'I, me', status: 'known' },
  { l2: 'ចង់', translit: 'chang', pos: 'aux', gloss: 'to want', status: 'learning' },
  { l2: 'ទិញ', translit: 'tɨñ', pos: 'verb', gloss: 'to buy', status: 'new' },
  { l2: 'បន្លែ', translit: 'banlae', pos: 'noun', gloss: 'vegetables', status: 'new' },
  { l2: 'និង', translit: 'nɨng', pos: 'conj', gloss: 'and', status: 'known' },
  { l2: 'ត្រី', translit: 'trəy', pos: 'noun', gloss: 'fish', status: 'learning' },
  { l2: '។', punct: true },
  { l2: 'តម្លៃ', translit: 'tâmlai', pos: 'noun', gloss: 'price', status: 'known' },
  { l2: 'ថោក', translit: 'thaok', pos: 'adj', gloss: 'cheap', status: 'new' },
  { l2: 'ណាស់', translit: 'nah', pos: 'adv', gloss: 'very', status: 'known' },
  { l2: '។', punct: true },
];

export const READING_CONTEXT = 'ខ្ញុំទៅផ្សារនៅពេលព្រឹក។';

// ──────────────────────────────── Review ─────────────────────────────────

export interface ReviewCard {
  before: string;
  blank: string;
  after: string;
  translit: string;
  en: string;
  answerEn: string;
}

export const REVIEW_CARDS: ReviewCard[] = [
  { before: 'ខ្ញុំចង់ទិញ', blank: 'បន្លែ', after: 'និងត្រី។', translit: 'khnhom chang tɨñ ___ nɨng trəy', en: 'I want to buy ___ and fish.', answerEn: 'vegetables' },
  { before: 'តម្លៃ', blank: 'ថោក', after: 'ណាស់។', translit: 'tâmlai ___ nah', en: 'The price is very ___.', answerEn: 'cheap' },
  { before: 'ខ្ញុំទៅ', blank: 'ផ្សារ', after: 'នៅពេលព្រឹក។', translit: 'khnhom tɨv ___ nɨv pel prɨk', en: 'I go to the ___ in the morning.', answerEn: 'market' },
];

// ───────────────────────────────── Watch ─────────────────────────────────

export interface WatchClip {
  id: string;
  title: string;
  level: string;
  len: string;
  grad: string;
}

export const WATCH_CLIPS: WatchClip[] = [
  { id: 'market', title: 'A morning at the market', level: 'Beginner', len: '0:48', grad: 'linear-gradient(135deg,#0E635B,#0A554E)' },
  { id: 'street', title: 'Street food in Phnom Penh', level: 'Intermediate', len: '1:12', grad: 'linear-gradient(135deg,#15403B,#0E635B)' },
  { id: 'temple', title: 'Visiting the temple', level: 'Intermediate', len: '1:35', grad: 'linear-gradient(135deg,#0A554E,#093f3a)' },
];

export interface Caption {
  l1: string;
  tokens: Token[];
}

export const CAPTIONS: Caption[] = [
  {
    l1: 'This is the morning market.',
    tokens: [
      { l2: 'នេះ', translit: 'nih', pos: 'pronoun', gloss: 'this', status: 'known' },
      { l2: 'ជា', translit: 'chie', pos: 'verb', gloss: 'to be', status: 'known' },
      { l2: 'ផ្សារ', translit: 'phsaa', pos: 'noun', gloss: 'market', status: 'learning' },
      { l2: 'ពេលព្រឹក', translit: 'pel prɨk', pos: 'noun', gloss: 'morning', status: 'new' },
    ],
  },
  {
    l1: 'The vendor sells fresh fish.',
    tokens: [
      { l2: 'អ្នកលក់', translit: 'neak luək', pos: 'noun', gloss: 'vendor', status: 'new' },
      { l2: 'លក់', translit: 'luək', pos: 'verb', gloss: 'to sell', status: 'learning' },
      { l2: 'ត្រី', translit: 'trəy', pos: 'noun', gloss: 'fish', status: 'learning' },
      { l2: 'ស្រស់', translit: 'srâh', pos: 'adj', gloss: 'fresh', status: 'new' },
    ],
  },
  {
    l1: 'It is very cheap here.',
    tokens: [
      { l2: 'វា', translit: 'vie', pos: 'pronoun', gloss: 'it', status: 'known' },
      { l2: 'ថោក', translit: 'thaok', pos: 'adj', gloss: 'cheap', status: 'new' },
      { l2: 'ណាស់', translit: 'nah', pos: 'adv', gloss: 'very', status: 'known' },
      { l2: 'នៅទីនេះ', translit: 'nɨv ti nih', pos: 'adv', gloss: 'here', status: 'new' },
    ],
  },
];

export interface QuizItem {
  type: string;
  q: string;
  en: string;
  opts: string[];
  optEn: string[];
  correct: number;
}

export const QUIZ_ITEMS: QuizItem[] = [
  { type: 'Fill the gap', q: 'អ្នកលក់លក់___ស្រស់។', en: 'The vendor sells fresh ___.', opts: ['ត្រី', 'ផ្សារ', 'នេះ'], optEn: ['fish', 'market', 'this'], correct: 0 },
  { type: 'Meaning match', q: 'ថោក', en: 'What does this word mean?', opts: ['cheap', 'fresh', 'morning'], optEn: ['', '', ''], correct: 0 },
  { type: 'Listening', q: '🔊', en: 'Which line did you hear?', opts: ['នេះជាផ្សារពេលព្រឹក', 'វាថោកណាស់នៅទីនេះ', 'អ្នកលក់លក់ត្រីស្រស់'], optEn: ['This is the morning market', 'It is very cheap here', 'The vendor sells fresh fish'], correct: 2 },
];
