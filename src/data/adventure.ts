/**
 * Adventure schedule — the one place that turns a learner's start date + adventure
 * number (sourced from Airtable, stored on the user) into the human-facing
 * "Friday · Adventure 1 · Day 2 of 42" kicker shown across the app, plus its
 * status, end date, language pair, and the learner's history of past adventures.
 *
 * Source of truth: Airtable "LMA Super-App Build" → Programs (the per-adventure
 * ledger: number / start / length / end / status / language) + Learners (the
 * current-adventure snapshot), synced into the Supabase `users.adventure` jsonb
 * column by `scripts/sync-adventures.mjs`. `mock.ts` carries the same shape for the
 * offline/dev fallback.
 */

/** Where an adventure sits in time. Prefers an explicit Airtable status; else derived. */
export type AdventurePhase = 'upcoming' | 'active' | 'completed' | 'paused';

/** A prior adventure the learner has finished — drives the "Previous adventures" list. */
export interface PastAdventure {
  number: number;
  startDate?: string;
  endDate?: string;
  /** Target language (L2) for that adventure, e.g. "German". */
  languageTo?: string;
  status: AdventurePhase;
}

export interface Adventure {
  /** Which adventure this is for the learner (1 = their first). */
  number: number;
  /** ISO date (yyyy-mm-dd) the adventure began. Absent until scheduled. */
  startDate?: string;
  /** ISO end date. Derived from start + length when absent (last practice day = Day M). */
  endDate?: string;
  /** Length of the adventure in days — enables the "Day N of M" count. */
  totalDays?: number;
  /** Explicit phase from Airtable Programs.Status; else derived from the dates. */
  status?: AdventurePhase;
  /** Source language (L1), e.g. "English". */
  languageFrom?: string;
  /** Target language (L2), e.g. "German" — mirrors users.language. */
  languageTo?: string;
  /** Completed prior adventures, oldest first. Empty/absent for a learner's first. */
  history?: PastAdventure[];
}

export interface AdventureStatus {
  number: number;
  /** 1-based day within the adventure (clamped to [1, total]); undefined if not scheduled. */
  day?: number;
  total?: number;
  /** True once the start date has arrived. */
  started: boolean;
  /** Where the adventure sits in time. */
  phase: AdventurePhase;
  /** Short status chip word, e.g. "Active", "Upcoming", "Completed", "Paused". */
  pill: string;
  /** ISO end date (resolved/derived), if known. */
  endDate?: string;
  /** Source language (L1), if known. */
  languageFrom?: string;
  /** Target language (L2), if known. */
  languageTo?: string;
  /** "English → German" when both ends are known; else undefined. */
  languagePair?: string;
  /** Compact label, e.g. "Adventure 1 · Day 2 of 42". */
  label: string;
  /** Past adventures, oldest first. */
  history: PastAdventure[];
}

const MS_PER_DAY = 86_400_000;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function parseISO(iso?: string): Date | null {
  return iso ? new Date(`${iso}T00:00:00`) : null;
}

function toISO(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** End date: explicit if set, else start + (totalDays - 1) so the last day is "Day M of M". */
function resolveEnd(adv: Adventure): Date | null {
  const explicit = parseISO(adv.endDate);
  if (explicit) return explicit;
  const start = parseISO(adv.startDate);
  if (start && adv.totalDays && adv.totalDays > 0) {
    const end = new Date(start);
    end.setDate(end.getDate() + adv.totalDays - 1);
    return end;
  }
  return null;
}

const PILL: Record<AdventurePhase, string> = {
  upcoming: 'Upcoming',
  active: 'Active',
  completed: 'Completed',
  paused: 'Paused',
};

/** Resolve a learner's adventure into a displayable status, or null if none set. */
export function adventureStatus(adv?: Adventure | null, now: Date = new Date()): AdventureStatus | null {
  if (!adv) return null;
  const advLabel = `Adventure ${adv.number}`;
  const history = adv.history ?? [];
  const start = parseISO(adv.startDate);
  const end = resolveEnd(adv);
  const elapsed = start ? Math.floor((startOfDay(now) - startOfDay(start)) / MS_PER_DAY) : -1;
  const started = elapsed >= 0;

  // Phase: an explicit Airtable status wins (lets us show "Paused"); else derive from dates.
  let phase: AdventurePhase;
  if (adv.status) phase = adv.status;
  else if (!started) phase = 'upcoming';
  else if (end && startOfDay(now) > startOfDay(end)) phase = 'completed';
  else phase = 'active';

  const languageFrom = adv.languageFrom;
  const languageTo = adv.languageTo;
  const languagePair = languageFrom && languageTo ? `${languageFrom} → ${languageTo}` : undefined;

  const base = {
    number: adv.number,
    started,
    phase,
    pill: PILL[phase],
    endDate: end ? toISO(end) : undefined,
    languageFrom,
    languageTo,
    languagePair,
    history,
  };

  if (!start) {
    return { ...base, label: advLabel };
  }

  if (adv.totalDays && adv.totalDays > 0) {
    const day = Math.min(Math.max(elapsed + 1, 1), adv.totalDays);
    const label =
      phase === 'completed'
        ? `${advLabel} · complete`
        : started
          ? `${advLabel} · Day ${day} of ${adv.totalDays}`
          : `${advLabel} · starts ${fmtDate(start)}`;
    return { ...base, day, total: adv.totalDays, label };
  }

  return {
    ...base,
    label: started ? `${advLabel} · began ${fmtDate(start)}` : `${advLabel} · starts ${fmtDate(start)}`,
  };
}

/** Full kicker line: weekday + adventure/day, e.g. "Friday · Adventure 1 · Day 2 of 42". */
export function adventureKicker(adv?: Adventure | null, now: Date = new Date()): string {
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
  const status = adventureStatus(adv, now);
  return status ? `${weekday} · ${status.label}` : weekday;
}

/** Human end-date label, e.g. "ends 23 Jul 2026" — empty when no end is known. */
export function adventureEndLabel(adv?: Adventure | null): string {
  const end = adv ? resolveEnd(adv) : null;
  return end ? `ends ${fmtDate(end)}` : '';
}

export { ordinal as ordinalNumber };
