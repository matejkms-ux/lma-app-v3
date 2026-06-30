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
import { useCallback, useEffect, useRef, useState } from 'react';

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
  /** DOMException name from the last failed getUserMedia (e.g. NotAllowedError,
   * NotFoundError) — lets the UI distinguish "blocked" from "no mic found". */
  const [errorName, setErrorName] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // Once the mic is denied/unsupported, STOP re-requesting it on every play. The
  // listen steps call start() on each ▶ (onPlay); on Safari a fresh getUserMedia
  // against a blocked/contended mic can interrupt the just-started <audio> (it fires
  // an involuntary `pause`), and the player's self-heal only re-kicks a few times
  // before landing on PAUSED — so a learner with the mic blocked couldn't play the
  // clip at all, even though playback is supposed to "still count". After the first
  // failure we latch this and start() becomes a no-op until prime() (the Retry-mic
  // button) re-grants access — leaving playback completely undisturbed.
  const blockedRef = useRef(false);

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  // Learn the mic permission state WITHOUT calling getUserMedia. This is the crux of
  // the Safari blocked-mic stall: the listen step starts the recorder on the ▶ tap,
  // and on Safari a getUserMedia against a blocked mic aborts the just-started
  // <audio> — play() rejects with NO `pause` event, so the player's self-heal (which
  // hooks onPause) never fires and it sits at PAUSED 0:00. The Permissions API tells
  // us "denied" up front (no gesture, no mic acquisition, no playback interruption),
  // so we can latch blockedRef BEFORE the first play and never touch the mic during
  // playback. 'granted'/'prompt' leave the normal play→start() path intact, so a
  // learner who would allow the mic still records. Unsupported (older Safari) → no-op,
  // falls back to the runtime catch latch in start().
  useEffect(() => {
    let cancelled = false;
    let permRef: PermissionStatus | null = null;
    const onChange = () => {
      if (!permRef) return;
      if (permRef.state === 'denied') {
        blockedRef.current = true;
        setStatus('denied');
      } else {
        // Re-granted (or now promptable) out of band — let start() acquire again.
        blockedRef.current = false;
        setStatus((s) => (s === 'denied' ? 'idle' : s));
      }
    };
    try {
      const perms = (navigator as Navigator & { permissions?: Permissions }).permissions;
      // `microphone` isn't in the TS PermissionName union but Safari/Chrome accept it.
      void perms
        ?.query({ name: 'microphone' as PermissionName })
        .then((status) => {
          if (cancelled) return;
          permRef = status;
          onChange();
          status.addEventListener?.('change', onChange);
        })
        .catch(() => {
          /* unsupported / not allowed to query — fall back to runtime detection */
        });
    } catch {
      /* no Permissions API — fall back */
    }
    return () => {
      cancelled = true;
      permRef?.removeEventListener?.('change', onChange);
    };
  }, []);

  const start = useCallback(async () => {
    // Already have a recorder: if it was paused (playback stalled or the learner
    // paused), resume it rather than spinning up a second capture. Active → no-op.
    const existing = recRef.current;
    if (existing) {
      if (existing.state === 'paused') {
        try {
          existing.resume();
        } catch {
          /* ignore — finalized elsewhere */
        }
      }
      return;
    }
    // Mic already known-unavailable this session: never re-request (see blockedRef).
    if (blockedRef.current) return;
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      blockedRef.current = true;
      setStatus('unsupported');
      return;
    }
    try {
      // Reuse a pre-warmed stream (opened by warmMic() before playback started)
      // rather than calling getUserMedia during the onPlay event. On Chrome, a
      // getUserMedia call while an <audio> element is playing briefly suspends
      // the element (involuntary pause event), causing the "MIC OPEN but audio
      // stuck at 0:00 PAUSED" symptom. Falls back to a fresh getUserMedia if
      // warmMic was never called, so recording still works without pre-warming.
      const stream = streamRef.current ?? await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      // A recorder that errors mid-clip (iOS audio-session interruption — Siri, an
      // incoming call, the control centre — or the mic track being revoked) would
      // otherwise die silently and lose the take. Surface it and release so the next
      // play() can cleanly re-acquire the mic.
      rec.onerror = () => {
        setErrorName('RecorderError');
        recRef.current = null;
        releaseStream();
        setStatus('idle');
      };
      // The OS yanking the mic (call/Siri/another app) ends or mutes the track
      // without a recorder error on some browsers — treat it the same way.
      stream.getAudioTracks().forEach((t) => {
        t.onended = () => {
          recRef.current = null;
          releaseStream();
          setStatus('idle');
        };
      });
      recRef.current = rec;
      // Flush a chunk every second: without a timeslice, data is only delivered at
      // stop(), so any mid-clip failure loses everything. Periodic chunks salvage
      // whatever was captured before the failure.
      rec.start(1000);
      setErrorName(null);
      setStatus('recording');
    } catch (e) {
      blockedRef.current = true; // don't re-request on the next play — leave playback alone
      setErrorName((e as DOMException)?.name ?? 'Error');
      setStatus('denied');
      releaseStream();
    }
  }, []);

  /** Pause capture without finalizing — used while playback is buffering/stalled so
   * the take doesn't accumulate dead air. Resumed by resume(). */
  const pause = useCallback(() => {
    const rec = recRef.current;
    if (rec && rec.state === 'recording') {
      try {
        rec.pause();
      } catch {
        /* ignore */
      }
    }
  }, []);

  /** Resume a paused take when playback recovers from a stall. Resume-ONLY: it never
   * acquires the mic, so a stall after the take is already finalized is a safe no-op
   * (unlike start(), which is the begin-a-take path). */
  const resume = useCallback(() => {
    const rec = recRef.current;
    if (rec && rec.state === 'paused') {
      try {
        rec.resume();
      } catch {
        /* ignore */
      }
    }
  }, []);

  /**
   * Explicitly request mic permission outside the play flow — backs a "Retry"
   * button so a learner who was blocked can grant access and try again without
   * leaving the step. Releases the stream immediately; recording still happens
   * via start(). Returns true if permission is now granted.
   */
  const prime = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      blockedRef.current = true;
      setStatus('unsupported');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      blockedRef.current = false; // re-granted — start() may acquire the mic again
      setErrorName(null);
      setStatus('idle');
      return true;
    } catch (e) {
      blockedRef.current = true;
      setErrorName((e as DOMException)?.name ?? 'Error');
      setStatus('denied');
      return false;
    }
  }, []);

  /**
   * Pre-warm the mic stream BEFORE playback starts. On Chrome, calling getUserMedia
   * during the onPlay event briefly suspends the <audio> element (audio session
   * conflict), causing the "MIC OPEN but audio stuck at 0:00 PAUSED" symptom.
   * Call once when the lesson loads; start() reuses the open stream. Safe no-op if
   * the mic is already blocked, unsupported, or already warmed.
   */
  const warmMic = useCallback(async (): Promise<void> => {
    if (blockedRef.current || streamRef.current) return;
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      blockedRef.current = true;
      setStatus('unsupported');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      stream.getAudioTracks().forEach((t) => {
        t.onended = () => {
          if (recRef.current === null) streamRef.current = null;
        };
      });
    } catch {
      // Silently latch so start() skips future getUserMedia calls (which would
      // only interrupt playback again). The Permissions API useEffect sets the
      // user-visible 'denied' status; don't double-set here.
      blockedRef.current = true;
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

  return { status, errorName, start, pause, resume, stop, cancel, prime, warmMic };
}
