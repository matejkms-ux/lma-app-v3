/**
 * Recordings store — the learner's mic takes, kept locally in IndexedDB (blobs
 * don't fit in localStorage). This is the local stand-in for "save the recording
 * to the database"; when Supabase lands these blobs get uploaded.
 *
 * Keyed by `<userId>:<lessonCode>:<step>` so a re-take overwrites the prior one.
 * Every call is wrapped — if IndexedDB is unavailable the app keeps working,
 * just without saved audio.
 */
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
