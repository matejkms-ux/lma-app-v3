/**
 * Adventure schedule — the one place that turns a learner's start date + adventure
 * number (sourced from Airtable, stored on the user) into the human-facing
 * "Friday · Adventure 1 · Day 2 of 42" kicker shown across the app.
 *
 * Source of truth: Airtable "LMA Super-App Build" → Learners (Adventure number /
 * Adventure start / Adventure length), synced into the Supabase `users.adventure`
 * jsonb column. `mock.ts` carries the same values for the offline/dev fallback.
 */

export interface Adventure {
  /** Which adventure this is for the learner (1 = their first). */
  number: number;
  /** ISO date (yyyy-mm-dd) the adventure began. Absent until scheduled. */
  startDate?: string;
  /** Length of the adventure in days — enables the "Day N of M" count. */
  totalDays?: number;
}

export interface AdventureStatus {
  number: number;
  /** 1-based day within the adventure (clamped to [1, total]); undefined if not scheduled. */
  day?: number;
  total?: number;
  /** True once the start date has arrived. */
  started: boolean;
  /** Compact label, e.g. "Adventure 1 · Day 2 of 42". */
  label: string;
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

/** Resolve a learner's adventure into a displayable status, or null if none set. */
export function adventureStatus(adv?: Adventure | null, now: Date = new Date()): AdventureStatus | null {
  if (!adv) return null;
  const advLabel = `Adventure ${adv.number}`;

  if (!adv.startDate) {
    return { number: adv.number, started: false, label: advLabel };
  }

  const start = new Date(`${adv.startDate}T00:00:00`);
  const elapsed = Math.floor((startOfDay(now) - startOfDay(start)) / MS_PER_DAY);
  const started = elapsed >= 0;

  if (adv.totalDays && adv.totalDays > 0) {
    const day = Math.min(Math.max(elapsed + 1, 1), adv.totalDays);
    return {
      number: adv.number,
      day,
      total: adv.totalDays,
      started,
      label: started ? `${advLabel} · Day ${day} of ${adv.totalDays}` : `${advLabel} · starts ${fmtDate(start)}`,
    };
  }

  return {
    number: adv.number,
    started,
    label: started ? `${advLabel} · began ${fmtDate(start)}` : `${advLabel} · starts ${fmtDate(start)}`,
  };
}

/** Full kicker line: weekday + adventure/day, e.g. "Friday · Adventure 1 · Day 2 of 42". */
export function adventureKicker(adv?: Adventure | null, now: Date = new Date()): string {
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
  const status = adventureStatus(adv, now);
  return status ? `${weekday} · ${status.label}` : weekday;
}

export { ordinal as ordinalNumber };
