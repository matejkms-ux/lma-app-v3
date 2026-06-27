/**
 * LMA design tokens — the single source of truth for colour, type and spacing.
 *
 * These are the values the design locked (v3 brief §2). Tailwind reads from here
 * (tailwind.config.js imports this module), and any raw inline style should pull
 * from `tokens` rather than hard-coding a hex. Coral is the ONLY element that moves
 * and the single live signal per screen — never decorative.
 */
export const colors = {
  /** Deep emerald — immersive practice & entry grounds. */
  emerald: '#0A554E',
  /** Lighter emerald — cards/panels on dark. */
  emerald2: '#0E635B',
  /** The single live signal: mic open, recording, +N today, active dot. */
  coral: '#EF6A47',
  /** Light ground — home, lesson select, lesson overview. */
  cream: '#F8F0E2',
  /** Slightly warmer cream for raised panels on cream. */
  creamPanel: '#FBF5EA',
  /** Muted labels on dark + the model (non-live) waveform. */
  teal: '#8FC0B8',
  /** Dimmed teal for inactive nav / secondary text on dark. */
  tealDim: '#5C857D',
  /** Headings on cream. */
  heading: '#15403B',
  /** Muted labels on cream. */
  muted: '#6F8B85',
  /** Hairline rules on cream. */
  rule: '#E2D8C4',
  /** Hairline between list rows on cream. */
  ruleSoft: '#EEE5D4',
  /** Empty/disabled star on cream. */
  starEmpty: '#D8CDB6',
  /** Locked iconography on cream. */
  locked: '#C9BEA8',
} as const;

export const fonts = {
  /** Newsreader — "the soul": headlines, the human/emotional register. */
  serif: "'Newsreader', Georgia, serif",
  /** Hanken Grotesk — "the method": all UI, structure, labels, data. */
  sans: "'Hanken Grotesk', system-ui, sans-serif",
  /** Japanese L2 text. */
  jp: "'Noto Serif JP', 'Newsreader', serif",
  /** Khmer L2 text (Companion / Reader / Watch super-app content). */
  khmer: "'Noto Serif Khmer', 'Newsreader', serif",
} as const;

export const radius = {
  device: '46px',
  card: '18px',
  pill: '14px',
} as const;

/**
 * The practice steps, in fixed order. The first five are the canonical method
 * steps backed by reference audio + rep/mastery progress. FREESTYLE is a sixth,
 * open-ended production step: no reference audio, the learner speaks freely and
 * self-rates. It sits OUTSIDE the rep/unlock system (see lib/recordings).
 */
export const STEPS = ['GRASP', 'HUM', 'SHADOW', 'READ', 'RECALL', 'FREESTYLE'] as const;
export type Step = (typeof STEPS)[number];

/**
 * The five steps that carry reference audio and feed the rep/progress/unlock
 * system. FREESTYLE has no reference audio, so it stays out of AUDIO_STEPS — but
 * it IS a valid step value in the DB now: the `lesson_step_progress`,
 * `lesson_audio` and `sentence_scores` step CHECKs all include it (migration
 * 20260626140000_freestyle_step_in_checks). FREESTYLE takes/ratings live in
 * `learner_recordings`.
 */
export const AUDIO_STEPS = ['GRASP', 'HUM', 'SHADOW', 'READ', 'RECALL'] as const;
export type AudioStep = (typeof AUDIO_STEPS)[number];

export const tokens = { colors, fonts, radius, STEPS, AUDIO_STEPS };
export default tokens;
