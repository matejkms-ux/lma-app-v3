/**
 * Local persistence for the LMA Final App (Read / Podcast / Writing / Conversation
 * / Session). Mirrors the app's local-first pattern (see lib/progress.ts): plain
 * localStorage, keyed by userId + content scope. Star maps are index → 1–5★.
 */

import { supabase } from './supabase';

type StarMap = Record<number, number>;
export type FinalModule = 'read' | 'podcast' | 'writing' | 'conversation' | 'session';

const k = (kind: string, userId: string, scope: string) => `lma:final-${kind}:${userId}:${scope}`;

function readMap(key: string): StarMap {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as StarMap) : {};
  } catch {
    return {};
  }
}
function writeMap(key: string, map: StarMap) {
  try { localStorage.setItem(key, JSON.stringify(map)); } catch { /* ignore */ }
}

/* ── Essay (per-page ★) ── */
export const getEssayRatings = (u: string, s: string): StarMap => readMap(k('essay', u, s));
export function setEssayRating(u: string, s: string, page: number, stars: number) {
  const key = k('essay', u, s); const m = readMap(key); m[page] = stars; writeMap(key, m);
}

/* ── Podcast (per-check ★) ── */
export const getPodcastRatings = (u: string, s: string): StarMap => readMap(k('podcast', u, s));
export function setPodcastRating(u: string, s: string, check: number, stars: number) {
  const key = k('podcast', u, s); const m = readMap(key); m[check] = stars; writeMap(key, m);
}

/* ── Conversation (per-prompt ★) ── */
export const getConversationRatings = (u: string, s: string): StarMap => readMap(k('convo', u, s));
export function setConversationRating(u: string, s: string, prompt: number, stars: number) {
  const key = k('convo', u, s); const m = readMap(key); m[prompt] = stars; writeMap(key, m);
}

/* ── Writing (free text, one entry per prompt) ── */
export type WritingMap = Record<number, string>;

export function getWritingMap(u: string, s: string): WritingMap {
  try {
    const raw = localStorage.getItem(k('writing', u, s));
    return raw ? (JSON.parse(raw) as WritingMap) : {};
  } catch { return {}; }
}
export function setWritingEntry(u: string, s: string, index: number, text: string) {
  const key = k('writing', u, s);
  const map = getWritingMap(u, s);
  map[index] = text;
  try { localStorage.setItem(key, JSON.stringify(map)); } catch { /* ignore */ }
}

/**
 * Submit the learner's writing for human review by the Language Guide. The Final
 * Writing module is never auto-scored — these rows are read by the guide. Always
 * keeps a local copy; the Supabase upsert is best-effort (no-op when the client
 * isn't configured), so the flow never breaks offline. Returns true on a
 * successful remote save.
 */
export async function submitFinalWriting(
  userId: string,
  scope: string,
  language: string,
  locale: string,
  entries: { promptIndex: number; prompt: string; answer: string }[],
): Promise<boolean> {
  if (!supabase || entries.length === 0) return false;
  const rows = entries.map((e) => ({
    user_id: userId,
    scope,
    language,
    locale,
    prompt_index: e.promptIndex,
    prompt: e.prompt,
    answer: e.answer,
    word_count: e.answer.trim().split(/\s+/).filter(Boolean).length,
    updated_at: new Date().toISOString(),
  }));
  try {
    const { error } = await supabase
      .from('final_writing_submissions')
      .upsert(rows, { onConflict: 'user_id,scope,prompt_index' });
    return !error;
  } catch {
    return false;
  }
}

/* ── Per-module completion flags (drives the hub's ✓/locked state) ── */
export function getModuleDone(u: string, s: string): Record<FinalModule, boolean> {
  try {
    const raw = localStorage.getItem(k('done', u, s));
    return raw ? JSON.parse(raw) : ({} as Record<FinalModule, boolean>);
  } catch { return {} as Record<FinalModule, boolean>; }
}
export function markModuleDone(u: string, s: string, mod: FinalModule) {
  const key = k('done', u, s); const cur = getModuleDone(u, s); cur[mod] = true;
  try { localStorage.setItem(key, JSON.stringify(cur)); } catch { /* ignore */ }
}

/** Average of the recorded ratings (0 when none), rounded to one decimal. */
export function averageStars(map: StarMap): number {
  const vals = Object.values(map);
  if (!vals.length) return 0;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}
