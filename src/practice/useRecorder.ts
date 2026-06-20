/**
 * Mic recorder — captures the learner while a step's audio plays. Started on
 * playback, finalized when the clip ends (its blob handed back for storage),
 * or cancelled if they stop early.
 *
 * Browser reality: Safari (incl. iOS) writes audio/mp4, Chrome writes audio/webm,
 * so we feature-detect the container with isTypeSupported. getUserMedia needs a
 * secure context (https or localhost). If permission is denied or the API is
 * missing we degrade gracefully — playback + points still work, just no take.
 */
import { useCallback, useRef, useState } from 'react';

export type RecorderStatus = 'idle' | 'recording' | 'denied' | 'unsupported';

export interface RecorderResult {
  blob: Blob;
  mime: string;
}

const MIME_CANDIDATES = [
  'audio/mp4',
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
];

function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const m of MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m;
    } catch {
      /* ignore and try the next */
    }
  }
  return '';
}

export function useRecorder() {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const start = useCallback(async () => {
    if (recRef.current) return; // already recording
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setStatus('unsupported');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recRef.current = rec;
      rec.start();
      setStatus('recording');
    } catch {
      setStatus('denied');
      releaseStream();
    }
  }, []);

  /** Stop and return the finished take (or null if nothing was captured). */
  const stop = useCallback((): Promise<RecorderResult | null> => {
    return new Promise((resolve) => {
      const rec = recRef.current;
      if (!rec || rec.state === 'inactive') {
        recRef.current = null;
        releaseStream();
        setStatus('idle');
        resolve(null);
        return;
      }
      rec.onstop = () => {
        const mime = rec.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mime });
        chunksRef.current = [];
        recRef.current = null;
        releaseStream();
        setStatus('idle');
        resolve(blob.size > 0 ? { blob, mime } : null);
      };
      try {
        rec.stop();
      } catch {
        recRef.current = null;
        releaseStream();
        setStatus('idle');
        resolve(null);
      }
    });
  }, []);

  /** Stop and discard (used when the learner stops the clip early). */
  const cancel = useCallback(() => {
    const rec = recRef.current;
    chunksRef.current = [];
    if (rec && rec.state !== 'inactive') {
      rec.onstop = null;
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    }
    recRef.current = null;
    releaseStream();
    setStatus((s) => (s === 'denied' || s === 'unsupported' ? s : 'idle'));
  }, []);

  return { status, start, stop, cancel };
}
