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
