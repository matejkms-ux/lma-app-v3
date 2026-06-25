/**
 * Recordings store — two layers:
 *   1. Local IndexedDB (fast, offline): the most-recent take per step.
 *   2. Supabase Storage (cloud): every take, encoded to MP3 at 96 kbps.
 *
 * IndexedDB key: `<userId>:<lessonCode>:<step>` — re-take overwrites prior.
 * Storage path:  `<userId>/<lessonCode>/<step>/<unix-ms>.mp3`
 * Both layers wrapped in try/catch — if unavailable the app keeps working.
 */
import { supabase, useSupabase } from './supabase';
import { encodeToMp3 } from './encodemp3';

const DB_NAME = 'lma';
const STORE = 'recordings';
const VERSION = 1;

export interface StoredRecording {
  blob: Blob;
  mime: string;
  ts: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const key = (userId: string, lesson: string, step: string) => `${userId}:${lesson}:${step}`;

export async function saveRecording(
  userId: string,
  lesson: string,
  step: string,
  blob: Blob,
  mime: string,
): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ blob, mime, ts: Date.now() } as StoredRecording, key(userId, lesson, step));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* no IndexedDB — recording just isn't persisted this session */
  }
}

export async function getRecording(
  userId: string,
  lesson: string,
  step: string,
): Promise<StoredRecording | null> {
  try {
    const db = await openDb();
    const result = await new Promise<StoredRecording | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const r = tx.objectStore(STORE).get(key(userId, lesson, step));
      r.onsuccess = () => resolve((r.result as StoredRecording) ?? null);
      r.onerror = () => reject(r.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}

/**
 * Encode the raw take to MP3 then upload to Supabase Storage.
 * Every take is kept — the path includes a timestamp so re-takes never
 * overwrite each other.  No-ops silently when Supabase is not configured.
 */
export async function uploadRecording(
  userId: string,
  lesson: string,
  step: string,
  blob: Blob,
): Promise<void> {
  if (!useSupabase || !supabase) return;
  try {
    const mp3 = await encodeToMp3(blob);
    const path = `${userId}/${lesson}/${step}/${Date.now()}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from('learner-recordings')
      .upload(path, mp3, { contentType: 'audio/mpeg', upsert: false });
    if (uploadError) return;
    await supabase.from('learner_recordings').insert({
      user_id: userId,
      lesson_code: lesson,
      step,
      storage_path: path,
    });
  } catch {
    /* upload failure is non-fatal */
  }
}

// ─── Freestyle (the 6th step) ───────────────────────────────────────────────
//
// Freestyle takes are kept in full — every recording is its own row in the same
// learner_recordings table (step = 'FREESTYLE'), with the learner's 1–5 star
// self-rating and the take's duration. Audio lives compressed in a dedicated
// private bucket; playback uses short-lived signed URLs. This is intentionally
// separate from the rep/progress system (no auto-scoring, no reps).

export const FREESTYLE_BUCKET = 'freestyle-recordings';
const FREESTYLE_STEP = 'FREESTYLE';

/**
 * A freestyle take of at least this many seconds finishes the lesson. Recording
 * auto-stops at 60s, but anything past ~50s counts so a take that ends a beat
 * early still completes. Single source of truth for FreestylePanel + the lessons
 * list so they can't disagree.
 */
export const FREESTYLE_COMPLETE_SECONDS = 50;

export interface FreestyleTake {
  id: string;
  storage_path: string;
  duration_seconds: number | null;
  stars: number | null;
  created_at: string;
  /** Short-lived signed URL for playback; null if it could not be created. */
  url: string | null;
}

/**
 * Encode a freestyle take to MP3, upload it to the freestyle bucket, and record
 * one row (with duration + self-rating) in learner_recordings. Returns the new
 * row id on success, or null if Supabase is unavailable / the write failed.
 */
export async function uploadFreestyleRecording(
  userId: string,
  lesson: string,
  blob: Blob,
  durationSeconds: number,
  stars: number | null,
): Promise<string | null> {
  if (!useSupabase || !supabase) return null;
  try {
    const mp3 = await encodeToMp3(blob);
    const path = `${userId}/${lesson}/${Date.now()}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from(FREESTYLE_BUCKET)
      .upload(path, mp3, { contentType: 'audio/mpeg', upsert: false });
    if (uploadError) return null;

    const { data, error } = await supabase
      .from('learner_recordings')
      .insert({
        user_id: userId,
        lesson_code: lesson,
        step: FREESTYLE_STEP,
        storage_path: path,
        duration_seconds: Math.round(durationSeconds),
        stars,
      })
      .select('id')
      .single();
    if (error || !data) return null;
    return (data as { id: string }).id;
  } catch {
    return null;
  }
}

/**
 * The learner's freestyle takes for a lesson, newest first, each with a signed
 * playback URL. Returns [] when Supabase is unavailable.
 */
export async function listFreestyleRecordings(
  userId: string,
  lesson: string,
): Promise<FreestyleTake[]> {
  if (!useSupabase || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('learner_recordings')
      .select('id, storage_path, duration_seconds, stars, created_at')
      .eq('user_id', userId)
      .eq('lesson_code', lesson)
      .eq('step', FREESTYLE_STEP)
      .order('created_at', { ascending: false });
    if (error || !data) return [];

    const rows = data as Array<Omit<FreestyleTake, 'url'>>;
    const signed = await Promise.all(
      rows.map(async (r) => {
        try {
          const { data: s } = await supabase!.storage
            .from(FREESTYLE_BUCKET)
            .createSignedUrl(r.storage_path, 3600);
          return { ...r, url: s?.signedUrl ?? null };
        } catch {
          return { ...r, url: null };
        }
      }),
    );
    return signed;
  } catch {
    return [];
  }
}

/** Update the self-rating on a single freestyle take. Best-effort. */
export async function updateFreestyleStars(id: string, stars: number): Promise<void> {
  if (!useSupabase || !supabase) return;
  try {
    await supabase.from('learner_recordings').update({ stars }).eq('id', id);
  } catch {
    /* best-effort */
  }
}

/**
 * The set of lesson codes for which this learner has a completed freestyle take
 * (a recording of at least FREESTYLE_COMPLETE_SECONDS). Used to count freestyle
 * toward lesson progress in the lessons list. Empty set when Supabase is down.
 */
export async function getCompletedFreestyleLessons(userId: string): Promise<Set<string>> {
  if (!useSupabase || !supabase) return new Set();
  try {
    const { data, error } = await supabase
      .from('learner_recordings')
      .select('lesson_code')
      .eq('user_id', userId)
      .eq('step', FREESTYLE_STEP)
      .gte('duration_seconds', FREESTYLE_COMPLETE_SECONDS);
    if (error || !data) return new Set();
    return new Set((data as Array<{ lesson_code: string }>).map((r) => r.lesson_code));
  } catch {
    return new Set();
  }
}
