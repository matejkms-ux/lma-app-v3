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
