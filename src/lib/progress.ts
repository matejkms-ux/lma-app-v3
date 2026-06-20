/**
 * Progress store — localStorage for instant synchronous reads; Supabase for
 * cross-device persistence. Key families per user:
 *
 *   lma:progress:<userId>  → completedSteps + currentStep per lesson
 *   lma:reps:<userId>      → append-only rep-event log (drives counters + today)
 *   lma:stars:<userId>     → step star ratings
 *   lma:sb:<userId>        → snapshot of last Supabase fetch (merged on load)
 *
 * All read functions remain synchronous. Writes hit localStorage immediately,
 * then Supabase async (best-effort). On load, initProgressSync fetches Supabase
 * and merges it into the local snapshot so any device sees accumulated progress.
 */
import { createClient } from '@supabase/supabase-js';
import { STEPS, type Step } from '../tokens';

// ─── Supabase client ──────────────────────────────────────────────────────────

const _url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const _key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const _db  = _url && _key ? createClient(_url, _key) : null;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LessonProgress {
  completedSteps: Step[];
  currentStep: Step | null;
}
export type UserProgress = Record<string, LessonProgress>;

export interface RepEvent {
  ts: number;
  points: number;
  lesson: string;
  step: Step;
}

interface SbStepData { reps: number; stars: number; pass_count: number; }
type SbCache = Record<string, SbStepData>; // "lessonCode:step" → data

// ─── Storage helpers ──────────────────────────────────────────────────────────

const progressKey = (id: string) => `lma:progress:${id}`;
const repsKey     = (id: string) => `lma:reps:${id}`;
const starsKey    = (id: string) => `lma:stars:${id}`;
const sbCacheKey  = (id: string) => `lma:sb:${id}`;

function lsRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function lsWrite(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota / SSR */ }
}

function getSbCache(userId: string): SbCache {
  return lsRead<SbCache>(sbCacheKey(userId), {});
}

// ─── Public read API (synchronous) ───────────────────────────────────────────

export function loadProgress(userId: string): UserProgress {
  return lsRead<UserProgress>(progressKey(userId), {});
}

export function lessonProgress(userId: string, code: string): LessonProgress {
  const local = loadProgress(userId)[code] ?? { completedSteps: [], currentStep: null };

  // Augment completedSteps with any steps the Supabase cache shows as passed
  const cache = getSbCache(userId);
  const extra = STEPS.filter(
    (s) => (cache[`${code}:${s}`]?.pass_count ?? 0) > 0 && !local.completedSteps.includes(s),
  );
  return extra.length === 0 ? local : { ...local, completedSteps: [...local.completedSteps, ...extra] };
}

export function repEvents(userId: string): RepEvent[] {
  return lsRead<RepEvent[]>(repsKey(userId), []);
}

export function stepPassCount(userId: string, code: string, step: Step): number {
  const local = repEvents(userId).filter((e) => e.lesson === code && e.step === step).length;
  const sb    = getSbCache(userId)[`${code}:${step}`]?.pass_count ?? 0;
  return Math.max(local, sb);
}

export function getStepStars(userId: string, code: string, step: Step): number | null {
  const localVal = lsRead<Record<string, number>>(starsKey(userId), {})[`${code}:${step}`] ?? null;
  const sbVal    = getSbCache(userId)[`${code}:${step}`]?.stars ?? null;
  if (localVal === null && sbVal === null) return null;
  return Math.max(localVal ?? 0, sbVal ?? 0);
}

export function lifetimeReps(userId: string): number {
  const events = repEvents(userId);

  // Aggregate local reps per step-key
  const localPerStep: Record<string, number> = {};
  for (const e of events) {
    const k = `${e.lesson}:${e.step}`;
    localPerStep[k] = (localPerStep[k] ?? 0) + e.points;
  }

  // Sum max(local, supabase) per step
  const cache = getSbCache(userId);
  const allKeys = new Set([...Object.keys(localPerStep), ...Object.keys(cache)]);
  let total = 0;
  for (const k of allKeys) {
    total += Math.max(localPerStep[k] ?? 0, cache[k]?.reps ?? 0);
  }
  return total;
}

export function repsToday(userId: string): number {
  const t0 = new Date();
  t0.setHours(0, 0, 0, 0);
  return repEvents(userId)
    .filter((e) => e.ts >= t0.getTime())
    .reduce((sum, e) => sum + e.points, 0);
}

export function isLessonUnlockComplete(userId: string, code: string): boolean {
  return STEPS.some(
    (s) => stepPassCount(userId, code, s) >= 2 || (getStepStars(userId, code, s) ?? 0) >= 4,
  );
}

// ─── Public write API ─────────────────────────────────────────────────────────

export function setCurrentStep(userId: string, code: string, step: Step): void {
  const all = loadProgress(userId);
  const lp  = all[code] ?? { completedSteps: [], currentStep: null };
  all[code] = { ...lp, currentStep: step };
  lsWrite(progressKey(userId), all);
}

export function markStepComplete(userId: string, code: string, step: Step): void {
  const all = loadProgress(userId);
  const lp  = all[code] ?? { completedSteps: [], currentStep: null };
  if (lp.completedSteps.includes(step)) return;
  all[code] = { completedSteps: [...lp.completedSteps, step], currentStep: step };
  lsWrite(progressKey(userId), all);
}

export function addRepEvent(userId: string, code: string, step: Step, points: number): void {
  const events = repEvents(userId);
  events.push({ ts: Date.now(), points, lesson: code, step });
  lsWrite(repsKey(userId), events);
  void _syncStep(userId, code, step);
}

export function setStepStars(userId: string, code: string, step: Step, stars: number): void {
  const all = lsRead<Record<string, number>>(starsKey(userId), {});
  all[`${code}:${step}`] = stars;
  lsWrite(starsKey(userId), all);
  void _syncStep(userId, code, step);
}

// ─── Supabase sync (internal) ─────────────────────────────────────────────────

async function _syncStep(userId: string, code: string, step: Step): Promise<void> {
  if (!_db) return;
  try {
    const events    = repEvents(userId);
    const stepEvt   = events.filter((e) => e.lesson === code && e.step === step);
    const reps      = stepEvt.reduce((s, e) => s + e.points, 0);
    const passCount = stepEvt.length;
    const stars     = lsRead<Record<string, number>>(starsKey(userId), {})[`${code}:${step}`] ?? 0;
    await _upsertRow(userId, code, step, reps, stars, passCount);
  } catch { /* best-effort */ }
}

async function _upsertRow(
  userId: string, code: string, step: Step,
  reps: number, stars: number, passCount: number,
): Promise<void> {
  if (!_db) return;
  await _db
    .from('lesson_step_progress')
    .upsert(
      { user_id: userId, lesson_code: code, step, reps, stars, pass_count: passCount, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,lesson_code,step' },
    );
}

/**
 * Fetch Supabase progress for this user, merge it into the local SbCache so
 * read functions reflect cross-device history, then push any local-only data
 * up to Supabase. Call once after a user session is established.
 */
export async function initProgressSync(userId: string): Promise<void> {
  if (!_db) return;
  try {
    const { data, error } = await _db
      .from('lesson_step_progress')
      .select('lesson_code,step,reps,stars,pass_count')
      .eq('user_id', userId);

    if (error || !data) return;

    // Build SbCache from Supabase rows
    const cache: SbCache = {};
    for (const row of data as Array<{ lesson_code: string; step: Step; reps: number; stars: number; pass_count: number }>) {
      cache[`${row.lesson_code}:${row.step}`] = { reps: row.reps, stars: row.stars, pass_count: row.pass_count };
    }
    lsWrite(sbCacheKey(userId), cache);

    // Push local rows that are absent or ahead in Supabase
    const events   = repEvents(userId);
    const starsMap = lsRead<Record<string, number>>(starsKey(userId), {});

    const localKeys = new Set<string>();
    for (const e of events) localKeys.add(`${e.lesson}:${e.step}`);
    for (const k of Object.keys(starsMap)) localKeys.add(k);

    const pushes: Promise<void>[] = [];
    for (const key of localKeys) {
      const colonIdx  = key.indexOf(':');
      const code      = key.slice(0, colonIdx);
      const step      = key.slice(colonIdx + 1) as Step;
      const stepEvt   = events.filter((e) => e.lesson === code && e.step === step);
      const localReps = stepEvt.reduce((s, e) => s + e.points, 0);
      const localPass = stepEvt.length;
      const localStar = starsMap[key] ?? 0;
      const sb        = cache[key];

      if (!sb || localReps > sb.reps || localPass > sb.pass_count || localStar > sb.stars) {
        pushes.push(_upsertRow(userId, code, step,
          Math.max(localReps, sb?.reps ?? 0),
          Math.max(localStar, sb?.stars ?? 0),
          Math.max(localPass, sb?.pass_count ?? 0),
        ));
      }
    }
    await Promise.allSettled(pushes);
  } catch { /* Supabase unavailable — continue with localStorage */ }
}
