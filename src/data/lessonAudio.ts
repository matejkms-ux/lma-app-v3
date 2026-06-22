import { createClient } from '@supabase/supabase-js';
import type { Step } from '../tokens';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Direct client — always initialised when env vars are present.
export const adminClient = url && anonKey ? createClient(url, anonKey) : null;

export const AUDIO_BUCKET = 'lesson-audio';

export interface LessonAudioRow {
  lesson_code: string;
  step: Step;
  audio_url: string;
  file_name: string | null;
  updated_at: string;
}

/** Returns the set of lesson codes that have at least one row in lesson_audio. */
export async function getUploadedLessonCodes(): Promise<Set<string>> {
  if (!adminClient) return new Set();
  const { data } = await adminClient.from('lesson_audio').select('lesson_code');
  if (!data) return new Set();
  return new Set(data.map((r: { lesson_code: string }) => r.lesson_code));
}

/** Fetch all uploaded step audio for a lesson. */
export async function getLessonAudio(lessonCode: string): Promise<Record<Step, LessonAudioRow> | null> {
  if (!adminClient) return null;
  const { data, error } = await adminClient
    .from('lesson_audio')
    .select('lesson_code, step, audio_url, file_name, updated_at')
    .eq('lesson_code', lessonCode);
  if (error || !data) return null;
  return Object.fromEntries(data.map((r) => [r.step, r])) as Record<Step, LessonAudioRow>;
}

/** Upload an MP3 file to storage and upsert the URL into lesson_audio. */
export async function uploadStepAudio(
  lessonCode: string,
  step: Step,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ url: string } | { error: string }> {
  if (!adminClient) return { error: 'Supabase not configured' };

  const ext = file.name.split('.').pop() ?? 'mp3';
  const objectPath = `${lessonCode}/${step}.${ext}`;

  // Signal start
  onProgress?.(5);

  const { error: upErr } = await adminClient.storage
    .from(AUDIO_BUCKET)
    .upload(objectPath, file, { contentType: file.type || 'audio/mpeg', upsert: true });

  if (upErr) return { error: upErr.message };
  onProgress?.(70);

  const { data: pub } = adminClient.storage.from(AUDIO_BUCKET).getPublicUrl(objectPath);
  const audioUrl = pub.publicUrl;

  const { error: dbErr } = await adminClient.from('lesson_audio').upsert(
    {
      lesson_code: lessonCode,
      step,
      audio_url: audioUrl,
      file_name: file.name,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'lesson_code,step' },
  );

  if (dbErr) return { error: dbErr.message };
  onProgress?.(100);
  return { url: audioUrl };
}

/** Remove a step's audio from storage and delete the DB row. */
export async function deleteStepAudio(lessonCode: string, step: Step): Promise<{ error?: string }> {
  if (!adminClient) return { error: 'Supabase not configured' };

  await adminClient.storage.from(AUDIO_BUCKET).remove([`${lessonCode}/${step}.mp3`]);

  const { error } = await adminClient
    .from('lesson_audio')
    .delete()
    .eq('lesson_code', lessonCode)
    .eq('step', step);

  return error ? { error: error.message } : {};
}

// ─── Reference audio (ref_l2 / ref_l1) ──────────────────────────────────────

export type RefSlot = 'ref_l2' | 'ref_l1';
export const REF_SLOTS: RefSlot[] = ['ref_l2', 'ref_l1'];

export interface RefAudioRow {
  lesson_code: string;
  slot: RefSlot;
  audio_url: string;
  file_name: string | null;
  updated_at: string;
}

export async function getRefAudio(lessonCode: string): Promise<Partial<Record<RefSlot, RefAudioRow>>> {
  if (!adminClient) return {};
  const { data, error } = await adminClient
    .from('lesson_audio')
    .select('lesson_code, step, audio_url, file_name, updated_at')
    .eq('lesson_code', lessonCode)
    .in('step', REF_SLOTS);
  if (error || !data) return {};
  const result: Partial<Record<RefSlot, RefAudioRow>> = {};
  for (const r of data as Array<{ lesson_code: string; step: string; audio_url: string; file_name: string | null; updated_at: string }>) {
    result[r.step as RefSlot] = {
      lesson_code: r.lesson_code,
      slot: r.step as RefSlot,
      audio_url: r.audio_url,
      file_name: r.file_name,
      updated_at: r.updated_at,
    };
  }
  return result;
}

export async function uploadRefAudio(
  lessonCode: string,
  slot: RefSlot,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ url: string } | { error: string }> {
  if (!adminClient) return { error: 'Supabase not configured' };

  const ext = file.name.split('.').pop() ?? 'mp3';
  const objectPath = `${lessonCode}/${slot}.${ext}`;

  onProgress?.(5);

  const { error: upErr } = await adminClient.storage
    .from(AUDIO_BUCKET)
    .upload(objectPath, file, { contentType: file.type || 'audio/mpeg', upsert: true });

  if (upErr) return { error: upErr.message };
  onProgress?.(70);

  const { data: pub } = adminClient.storage.from(AUDIO_BUCKET).getPublicUrl(objectPath);
  const audioUrl = pub.publicUrl;

  const { error: dbErr } = await adminClient.from('lesson_audio').upsert(
    { lesson_code: lessonCode, step: slot, audio_url: audioUrl, file_name: file.name, updated_at: new Date().toISOString() },
    { onConflict: 'lesson_code,step' },
  );

  if (dbErr) return { error: dbErr.message };
  onProgress?.(100);
  return { url: audioUrl };
}

export async function deleteRefAudio(lessonCode: string, slot: RefSlot): Promise<{ error?: string }> {
  if (!adminClient) return { error: 'Supabase not configured' };

  await adminClient.storage.from(AUDIO_BUCKET).remove([`${lessonCode}/${slot}.mp3`]);

  const { error } = await adminClient
    .from('lesson_audio')
    .delete()
    .eq('lesson_code', lessonCode)
    .eq('step', slot);

  return error ? { error: error.message } : {};
}

// ─── Sentence import ──────────────────────────────────────────────────────────

export interface SentenceImportRow {
  sentence_nr: number;
  l1: string;
  l2: string;
  l2_translit: string | null;
}

export async function upsertSentences(
  lessonCode: string,
  language: string,
  lessonNr: number,
  sentences: SentenceImportRow[],
): Promise<{ error?: string }> {
  if (!adminClient) return { error: 'Supabase not configured' };

  const { error: lessonErr } = await adminClient
    .from('lessons')
    .upsert(
      { lesson_code: lessonCode, language, title: `Lesson ${lessonNr}` },
      { onConflict: 'lesson_code' },
    );
  if (lessonErr) return { error: lessonErr.message };

  const rows = sentences.map((s) => ({
    lesson_code: lessonCode,
    sentence_nr: s.sentence_nr,
    l1: s.l1,
    l2: s.l2,
    l2_translit: s.l2_translit || null,
  }));

  const { error } = await adminClient
    .from('sentences')
    .upsert(rows, { onConflict: 'lesson_code,sentence_nr' });

  return error ? { error: error.message } : {};
}

// ─── Bulk CSV import (sentences across one or more lessons) ──────────────────

/**
 * Reverse of the admin LANG_CODE map — used to derive a lesson's language and
 * number from a well-formed lesson_code during bulk CSV import (the CSV carries
 * lesson_code per row but no language, and sentences FK → lessons.lesson_code).
 */
const CODE_LANG: Record<string, string> = {
  de: 'GERMAN',
  ja: 'JAPANESE',
  km: 'KHMER',
  th: 'THAI',
  es: 'SPANISH',
  fr: 'FRENCH',
  zh: 'MANDARIN',
  ar: 'ARABIC',
};

export interface ParsedLessonCode {
  language: string;
  lessonNr: number;
}

/**
 * A lesson_code is well-formed when it is `<prefix>-<2-letter-lang>-<number>`
 * and the language segment is a known code (e.g. JERODC2604-th-001). Returns the
 * derived language + lesson number, or null when malformed.
 */
export function parseLessonCode(code: string): ParsedLessonCode | null {
  const m = /^([A-Za-z0-9]+)-([a-z]{2})-(\d{1,4})$/.exec(code.trim());
  if (!m) return null;
  const language = CODE_LANG[m[2]];
  if (!language) return null;
  return { language, lessonNr: parseInt(m[3], 10) };
}

export interface BulkSentenceRow {
  lesson_code: string;
  sentence_nr: number;
  l1: string;
  l2: string;
  l2_translit: string | null;
}

/**
 * Bulk-upsert sentences that already carry their own lesson_code + sentence_nr
 * (from a CSV). Ensures a lessons row exists for each distinct code first — only
 * creating ones that are missing, so existing lesson metadata is left intact —
 * then upserts every sentence on (lesson_code, sentence_nr).
 */
export async function upsertSentencesBulk(
  rows: BulkSentenceRow[],
): Promise<{ error?: string; lessons?: number; sentences?: number }> {
  if (!adminClient) return { error: 'Supabase not configured' };
  if (!rows.length) return { error: 'No rows to import' };

  const distinct = Array.from(new Set(rows.map((r) => r.lesson_code)));

  const { data: existing, error: selErr } = await adminClient
    .from('lessons')
    .select('lesson_code')
    .in('lesson_code', distinct);
  if (selErr) return { error: selErr.message };

  const have = new Set((existing ?? []).map((r: { lesson_code: string }) => r.lesson_code));
  const toCreate = distinct
    .filter((c) => !have.has(c))
    .map((c) => {
      const parsed = parseLessonCode(c);
      return {
        lesson_code: c,
        language: parsed?.language ?? 'UNKNOWN',
        title: `Lesson ${parsed?.lessonNr ?? 1}`,
      };
    });

  if (toCreate.length) {
    const { error: insErr } = await adminClient
      .from('lessons')
      .upsert(toCreate, { onConflict: 'lesson_code' });
    if (insErr) return { error: insErr.message };
  }

  const { error } = await adminClient.from('sentences').upsert(
    rows.map((r) => ({
      lesson_code: r.lesson_code,
      sentence_nr: r.sentence_nr,
      l1: r.l1,
      l2: r.l2,
      l2_translit: r.l2_translit || null,
    })),
    { onConflict: 'lesson_code,sentence_nr' },
  );
  if (error) return { error: error.message };

  return { lessons: distinct.length, sentences: rows.length };
}
