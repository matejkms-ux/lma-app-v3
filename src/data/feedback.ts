/**
 * Per-learner feedback corrections — standalone pages served from public/feedback/,
 * so each is BOTH a link to send (lma-islands-app.netlify.app/feedback/<slug>.html)
 * and reachable in-app from Home. Each page is a red/green "say it naturally"
 * walkthrough of a learner's voice note, with audio, produced by
 * scripts/generator/make-correction-app.py. Keyed by username (lesson-code prefix).
 */
export interface FeedbackLink {
  /** path under public/ — served at the site root */
  href: string;
  /** card title on Home */
  title: string;
  /** one-line note under the title */
  note: string;
}

export const FEEDBACK_BY_USER: Record<string, FeedbackLink> = {
  'ANAMARIJAC2604-de': {
    href: '/feedback/anamarija-fischer.html',
    title: 'Deine Korrektur',
    note: 'Dein Angel-Morgen, auf Deutsch 🐟',
  },
};

export function feedbackFor(username?: string | null): FeedbackLink | null {
  if (!username) return null;
  return FEEDBACK_BY_USER[username] ?? null;
}
