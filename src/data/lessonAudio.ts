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

// ─── Per-sentence reference audio (sentences.l2_audio_url) ───────────────────
//
// One reference clip per sentence, stored in the public lesson-audio bucket under
// <lessonCode>/sentences/<nr>.<ext>; the public URL is written to the sentence's
// l2_audio_url. Feeds the Sentences play-voice button and the per-sentence
// judged-step capture flow.

export async function uploadSentenceAudio(
  lessonCode: string,
  sentenceId: string,
  sentenceNr: number,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ url: string } | { error: string }> {
  if (!adminClient) return { error: 'Supabase not configured' };

  const ext = file.name.split('.').pop() ?? 'mp3';
  const objectPath = `${lessonCode}/sentences/${sentenceNr}.${ext}`;

  onProgress?.(5);
  const { error: upErr } = await adminClient.storage
    .from(AUDIO_BUCKET)
    .upload(objectPath, file, { contentType: file.type || 'audio/mpeg', upsert: true });
  if (upErr) return { error: upErr.message };
  onProgress?.(70);

  const { data: pub } = adminClient.storage.from(AUDIO_BUCKET).getPublicUrl(objectPath);
  const audioUrl = pub.publicUrl;

  const { error: dbErr } = await adminClient
    .from('sentences')
    .update({ l2_audio_url: audioUrl })
    .eq('id', sentenceId);
  if (dbErr) return { error: dbErr.message };

  onProgress?.(100);
  return { url: audioUrl };
}

export async function deleteSentenceAudio(
  lessonCode: string,
  sentenceId: string,
  sentenceNr: number,
): Promise<{ error?: string }> {
  if (!adminClient) return { error: 'Supabase not configured' };
  await adminClient.storage.from(AUDIO_BUCKET).remove([`${lessonCode}/sentences/${sentenceNr}.mp3`]);
  const { error } = await adminClient
    .from('sentences')
    .update({ l2_audio_url: null })
    .eq('id', sentenceId);
  return error ? { error: error.message } : {};
}

// ─── Lesson code parsing + custom titles ────────────────────────────────────

/**
 * Reverse of the admin LANG_CODE map — derives a lesson's language and number
 * from a well-formed lesson_code (used when creating a lessons row on rename).
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

/** The custom title stored in the DB for a lesson, or null if none. */
export async function getLessonTitle(lessonCode: string): Promise<string | null> {
  if (!adminClient || !lessonCode) return null;
  const { data, error } = await adminClient
    .from('lessons')
    .select('title')
    .eq('lesson_code', lessonCode)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { title: string | null }).title ?? null;
}

/** Custom titles for many lessons at once, as a { lesson_code: title } map. */
export async function getLessonTitles(lessonCodes: string[]): Promise<Record<string, string>> {
  if (!adminClient || lessonCodes.length === 0) return {};
  const { data, error } = await adminClient
    .from('lessons')
    .select('lesson_code, title')
    .in('lesson_code', lessonCodes);
  if (error || !data) return {};
  const map: Record<string, string> = {};
  for (const r of data as Array<{ lesson_code: string; title: string | null }>) {
    if (r.title) map[r.lesson_code] = r.title;
  }
  return map;
}

/**
 * Set a lesson's display title. Upserts the lessons row (creating it with a
 * language derived from the code if it doesn't exist yet) so renaming works even
 * for lessons that have no sentences/audio yet.
 */
export async function setLessonTitle(
  lessonCode: string,
  title: string,
): Promise<{ error?: string }> {
  if (!adminClient) return { error: 'Supabase not configured' };
  const trimmed = title.trim();
  if (!trimmed) return { error: 'Title cannot be empty' };
  const parsed = parseLessonCode(lessonCode);
  const { error } = await adminClient.from('lessons').upsert(
    { lesson_code: lessonCode, language: parsed?.language ?? 'UNKNOWN', title: trimmed },
    { onConflict: 'lesson_code' },
  );
  return error ? { error: error.message } : {};
}
