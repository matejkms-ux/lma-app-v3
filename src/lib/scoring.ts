/**
 * Auto-assessment scoring (spec §2) and the sentence_scores data layer (§3).
 *
 * Manual and auto scores are independent: `setManualStars` writes ONLY
 * `manual_stars`; `setAutoScore` writes ONLY the `auto_*` fields + `needs_redo`.
 * Neither path ever mutates the other (partial upsert on the (user, sentence,
 * step) conflict key leaves untouched columns alone).
 */
import { supabase, useSupabase } from './supabase';

/** Combined-score weighting (spec §2: 50/50, tunable). Must sum to 1. */
export const WORD_ACCURACY_WEIGHT = 0.5;
export const PRONUNCIATION_WEIGHT = 1 - WORD_ACCURACY_WEIGHT;

/** GRASP gate: a sentence must reach this many stars (4★ ⇔ ≥80 combined). */
export const GRASP_GATE_STARS = 4;

export type JudgedStep = 'GRASP' | 'SHADOW' | 'RECALL';
export const JUDGED_STEPS: JudgedStep[] = ['GRASP', 'SHADOW', 'RECALL'];

/** combined = weighted mean of the two raw 0–100 scores. */
export function combinedScore(wordAccuracy: number, pronunciation: number): number {
  return wordAccuracy * WORD_ACCURACY_WEIGHT + pronunciation * PRONUNCIATION_WEIGHT;
}

/** Map a 0–100 combined score to 1–5 stars (spec §2). */
export function starsFromCombined(combined: number): number {
  if (combined >= 90) return 5;
  if (combined >= 80) return 4;
  if (combined >= 65) return 3;
  if (combined >= 50) return 2;
  return 1;
}

export interface SentenceScore {
  sentence_id: string;
  step: JudgedStep;
  auto_word_accuracy: number | null;
  auto_pronunciation: number | null;
  auto_combined: number | null;
  auto_stars: number | null;
  manual_stars: number | null;
  needs_redo: boolean;
}

/** { sentence_id: { step: score } } */
export type ScoresBySentence = Record<string, Partial<Record<JudgedStep, SentenceScore>>>;

const SELECT_COLS =
  'sentence_id, step, auto_word_accuracy, auto_pronunciation, auto_combined, auto_stars, manual_stars, needs_redo';

/** All scores for a learner across the given sentence ids, grouped by sentence. */
export async function getSentenceScores(
  userId: string,
  sentenceIds: string[],
): Promise<ScoresBySentence> {
  if (!useSupabase || !supabase || sentenceIds.length === 0) return {};
  try {
    const { data, error } = await supabase
      .from('sentence_scores')
      .select(SELECT_COLS)
      .eq('user_id', userId)
      .in('sentence_id', sentenceIds);
    if (error || !data) return {};
    const map: ScoresBySentence = {};
    for (const r of data as SentenceScore[]) {
      (map[r.sentence_id] ??= {})[r.step] = r;
    }
    return map;
  } catch {
    return {};
  }
}

/** Human edit — writes ONLY manual_stars. Auto fields are never touched. */
export async function setManualStars(
  userId: string,
  sentenceId: string,
  step: JudgedStep,
  stars: number,
): Promise<{ error?: string }> {
  if (!useSupabase || !supabase) return { error: 'Supabase not configured' };
  const { error } = await supabase.from('sentence_scores').upsert(
    { user_id: userId, sentence_id: sentenceId, step, manual_stars: stars, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,sentence_id,step' },
  );
  return error ? { error: error.message } : {};
}

/**
 * Auto-assessment result — writes ONLY auto_* + needs_redo. Computes combined,
 * stars, and the GRASP redo gate from the two raw 0–100 scores. (Intended for the
 * server-side assessment pipeline; manual_stars is never set here.)
 */
export async function setAutoScore(
  userId: string,
  sentenceId: string,
  step: JudgedStep,
  raw: { wordAccuracy: number; pronunciation: number },
): Promise<{ error?: string }> {
  if (!useSupabase || !supabase) return { error: 'Supabase not configured' };
  const combined = combinedScore(raw.wordAccuracy, raw.pronunciation);
  const stars = starsFromCombined(combined);
  const needs_redo = step === 'GRASP' && stars < GRASP_GATE_STARS;
  const { error } = await supabase.from('sentence_scores').upsert(
    {
      user_id: userId,
      sentence_id: sentenceId,
      step,
      auto_word_accuracy: raw.wordAccuracy,
      auto_pronunciation: raw.pronunciation,
      auto_combined: combined,
      auto_stars: stars,
      needs_redo,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,sentence_id,step' },
  );
  return error ? { error: error.message } : {};
}
