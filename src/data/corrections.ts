/**
 * Per-learner corrections — the "Corrections" section. Each is a standalone red/green
 * "say it naturally" page served from public/feedback/<slug>.html (also a sendable
 * link), produced by scripts/generator/make-correction-app.py. Newest first.
 * Keyed by username (lesson-code prefix).
 */
export interface Correction {
  slug: string;
  title: string;
  note: string;
  date: string;
  type?: 'audio' | 'written';
}

export const CORRECTIONS_BY_USER: Record<string, Correction[]> = {
  'NEALG2603-es': [
    { slug: 'neal-written-message-1', title: 'Tu español escrito · I', note: 'Tu mensaje de WhatsApp 📱', date: '28 de junio de 2026', type: 'written' },
    { slug: 'neal-spanish-message-2', title: 'Tu español natural · II', note: 'Tu mensaje de voz 🇲🇽', date: '23 de junio de 2026', type: 'audio' },
    { slug: 'neal-spanish-message', title: 'Tu español natural · I', note: 'Tu mensaje de voz 🇲🇽', date: '17 de junio de 2026', type: 'audio' },
  ],
  'ANAMARIJAC2604-de': [
    { slug: 'anamarija-freestyle', title: 'Dein Freestyle', note: 'Frei gesprochen nach der Lektion 🎤', date: '27. Juni 2026' },
    { slug: 'anamarija-fischer', title: 'Dein Angel-Morgen', note: 'Deine Sprachnachricht 🐟', date: '27. Juni 2026' },
  ],
};

/** The standalone correction page for a slug (served from public/). */
export const correctionHref = (slug: string) => `/feedback/${slug}.html`;

export function correctionsFor(username?: string | null): Correction[] {
  if (!username) return [];
  return CORRECTIONS_BY_USER[username] ?? [];
}
