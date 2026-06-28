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
import { AUDIO_STEPS, type Step } from '../tokens';
import { supabase } from './supabase';

// ─── Supabase client ──────────────────────────────────────────────────────────

// Reuse the single shared browser client instead of creating a third one.
const _db = supabase;

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
  const extra = AUDIO_STEPS.filter(
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

/**
 * Reps are awarded per PLAY: every completed play of an audio step is worth a
 * flat REPS_PER_PLAY. Totals are DERIVED from the captured play count (the local
 * rep-event log and Supabase pass_count) — never from a stored points sum — so
 * the rule applies uniformly to all history without rewriting captured progress.
 * (Each rep event still records `points` for the log, but it does not drive totals.)
 */
export const REPS_PER_PLAY = 10;
export const REPS_PER_CORRECTION = 50;

const correctionPtsKey = (id: string) => `lma:correction-pts:${id}`;

/** Correction slugs already opened (to avoid double-counting). */
function correctionOpened(userId: string): Set<string> {
  return new Set(lsRead<string[]>(correctionPtsKey(userId), []));
}

/**
 * Award REPS_PER_CORRECTION for opening a correction page — idempotent per slug.
 * Returns true if points were actually awarded (first open), false if already seen.
 */
export function awardCorrectionPoints(userId: string, slug: string): boolean {
  const seen = correctionOpened(userId);
  if (seen.has(slug)) return false;
  seen.add(slug);
  lsWrite(correctionPtsKey(userId), [...seen]);
  return true;
}

/** Total reps earned from corrections alone. */
export function correctionReps(userId: string): number {
  return correctionOpened(userId).size * REPS_PER_CORRECTION;
}

export function lifetimeReps(userId: string): number {
  const events = repEvents(userId);

  // Count local plays per step-key (one event = one play).
  const localPlays: Record<string, number> = {};
  for (const e of events) {
    const k = `${e.lesson}:${e.step}`;
    localPlays[k] = (localPlays[k] ?? 0) + 1;
  }

  // reps = REPS_PER_PLAY × max(local play count, Supabase pass_count) per step.
  const cache = getSbCache(userId);
  const allKeys = new Set([...Object.keys(localPlays), ...Object.keys(cache)]);
  let plays = 0;
  for (const k of allKeys) {
    plays += Math.max(localPlays[k] ?? 0, cache[k]?.pass_count ?? 0);
  }
  return plays * REPS_PER_PLAY + correctionReps(userId);
}

export function repsToday(userId: string): number {
  const t0 = new Date();
  t0.setHours(0, 0, 0, 0);
  const playsToday = repEvents(userId).filter((e) => e.ts >= t0.getTime()).length;
  return playsToday * REPS_PER_PLAY;
}

export function isLessonUnlockComplete(userId: string, code: string, audioStepCount?: number): boolean {
  // A lesson with no audio can never be "passed" — nothing to master.
  if (audioStepCount === 0) return false;
  const { completedSteps } = lessonProgress(userId, code);
  // Nothing completed → not done.
  if (completedSteps.length === 0) return false;
  // Done when every audio step has been completed (played to the end once). This
  // is the SAME bar as the per-step "DONE" badge and the Next button, so the UI
  // can't say a step is done while the gate disagrees.
  if (audioStepCount !== undefined) return completedSteps.length >= audioStepCount;
  return true;
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

/**
 * Step-level auto score (whole-take pronunciation assessment vs the combined
 * reference). Writes ONLY auto_* — never the manual stars / reps / pass_count.
 */
export async function setStepAutoScore(
  userId: string, code: string, step: Step, combined: number, stars: number,
): Promise<void> {
  if (!_db) return;
  try {
    await _db.from('lesson_step_progress').upsert(
      // version is part of the PK (user_id,lesson_code,version,step). All live
      // lessons are v1; onConflict MUST list all 4 PK cols or PostgREST throws
      // 42P10 and the write is silently dropped. Thread real versions in when v2 lands.
      { user_id: userId, lesson_code: code, step, version: 1, auto_combined: combined, auto_stars: stars,
        updated_at: new Date().toISOString() },
      { onConflict: 'user_id,lesson_code,version,step' },
    );
  } catch { /* best-effort */ }
}

// ─── Supabase sync (internal) ─────────────────────────────────────────────────

async function _syncStep(userId: string, code: string, step: Step): Promise<void> {
  if (!_db) return;
  try {
    const events    = repEvents(userId);
    const stepEvt   = events.filter((e) => e.lesson === code && e.step === step);
    const passCount = stepEvt.length;
    const reps      = passCount * REPS_PER_PLAY; // derived: flat REPS_PER_PLAY per play
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
      // version is part of the PK (user_id,lesson_code,version,step). onConflict
      // must list all 4 cols or PostgREST throws 42P10 and the write is silently
      // dropped by the caller's try/catch. All live lessons are v1.
      { user_id: userId, lesson_code: code, step, version: 1, reps, stars, pass_count: passCount, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,lesson_code,version,step' },
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
      const localPass = stepEvt.length;
      const localStar = starsMap[key] ?? 0;
      const sb        = cache[key];

      if (!sb || localPass > sb.pass_count || localStar > sb.stars) {
        const pass = Math.max(localPass, sb?.pass_count ?? 0);
        pushes.push(_upsertRow(userId, code, step,
          pass * REPS_PER_PLAY, // derived: flat REPS_PER_PLAY per play
          Math.max(localStar, sb?.stars ?? 0),
          pass,
        ));
      }
    }
    await Promise.allSettled(pushes);
  } catch { /* Supabase unavailable — continue with localStorage */ }
}
