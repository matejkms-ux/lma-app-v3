import { useCallback, useEffect, useRef, useState } from 'react';
import { useRecorder } from '../../practice/useRecorder';
import { PulseDot } from '../../components/MicIndicator';
import { MicNotice } from '../../components/MicNotice';
import {
  listFreestyleRecordings,
  updateFreestyleStars,
  uploadFreestyleRecording,
  FREESTYLE_COMPLETE_SECONDS,
  type FreestyleTake,
} from '../../lib/recordings';

/**
 * FREESTYLE (the 6th step) — open-ended free production. No reference audio:
 * the learner presses record, speaks for up to 60s (live timer, auto-stop), and
 * the take is saved to the freestyle bucket with a 1–5 star self-rating. Every
 * take is kept; the learner can play back their full history. Nothing here is
 * auto-scored, and it does not touch the rep/progress/unlock system.
 *
 * Recording reuses `useRecorder`, which already feature-detects MediaRecorder /
 * getUserMedia and degrades gracefully on iOS Safari and unsupported browsers.
 */
const MAX_SECONDS = 60; // auto-stop cap
const COMPLETE_SECONDS = FREESTYLE_COMPLETE_SECONDS; // a take this long finishes the lesson

function fmt(secs: number): string {
  const s = Math.max(0, Math.floor(secs));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

export function FreestylePanel({
  userId,
  lesson,
  onCompletionChange,
}: {
  userId: string;
  lesson: string;
  /** Reports whether a full-length (≥ MAX_SECONDS) take exists — the lesson gate. */
  onCompletionChange?: (complete: boolean) => void;
}) {
  const recorder = useRecorder();

  const [takes, setTakes] = useState<FreestyleTake[]>([]);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  // Set when stop() yields no audio (mic produced nothing) so the failure is
  // visible instead of the take silently vanishing.
  const [captureFailed, setCaptureFailed] = useState(false);

  const startedAtRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  // Local-only playback of the take just recorded (covers the case where the
  // cloud is unconfigured, and gives instant playback before the signed URL).
  const [lastTakeUrl, setLastTakeUrl] = useState<string | null>(null);
  const lastTakeUrlRef = useRef<string | null>(null);
  const setLastTake = useCallback((blob: Blob | null) => {
    if (lastTakeUrlRef.current) URL.revokeObjectURL(lastTakeUrlRef.current);
    const url = blob ? URL.createObjectURL(blob) : null;
    lastTakeUrlRef.current = url;
    setLastTakeUrl(url);
  }, []);

  // Shared playback element — only one take plays at a time.
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const rows = await listFreestyleRecordings(userId, lesson);
    setTakes(rows);
    setLoading(false);
  }, [userId, lesson]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  const clearTick = () => {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  // Cleanup on unmount.
  useEffect(
    () => () => {
      clearTick();
      if (lastTakeUrlRef.current) URL.revokeObjectURL(lastTakeUrlRef.current);
    },
    [],
  );

  const finish = useCallback(async () => {
    clearTick();
    const seconds = startedAtRef.current ? (Date.now() - startedAtRef.current) / 1000 : elapsed;
    startedAtRef.current = null;
    setRecording(false);
    const take = await recorder.stop();
    if (!take) {
      setCaptureFailed(true);
      return;
    }
    setCaptureFailed(false);
    setLastTake(take.blob);
    setSaving(true);
    await uploadFreestyleRecording(userId, lesson, take.blob, seconds, null);
    await refresh();
    setSaving(false);
  }, [recorder, userId, lesson, elapsed, setLastTake, refresh]);

  const toggleRecord = useCallback(() => {
    if (recording) {
      void finish();
      return;
    }
    setElapsed(0);
    setCaptureFailed(false);
    void recorder.start();
  }, [recording, finish, recorder]);

  // Begin the timer once recording has actually started; auto-stop at the cap.
  useEffect(() => {
    if (recorder.status === 'recording' && !recording) {
      setRecording(true);
      startedAtRef.current = Date.now();
      clearTick();
      tickRef.current = window.setInterval(() => {
        const started = startedAtRef.current;
        if (!started) return;
        const secs = (Date.now() - started) / 1000;
        setElapsed(secs);
        if (secs >= MAX_SECONDS) void finish();
      }, 200);
    }
  }, [recorder.status, recording, finish]);

  const rate = useCallback((id: string, n: number) => {
    setTakes((prev) => prev.map((t) => (t.id === id ? { ...t, stars: n } : t)));
    void updateFreestyleStars(id, n);
  }, []);

  const togglePlay = useCallback((take: FreestyleTake) => {
    const a = audioRef.current;
    if (!a || !take.url) return;
    if (playingId === take.id && !a.paused) {
      a.pause();
      return;
    }
    a.src = take.url;
    setPlayingId(take.id);
    void a.play().catch(() => setPlayingId(null));
  }, [playingId]);

  // Completion gate: a take of at least COMPLETE_SECONDS must exist. Recording
  // auto-stops at the 60s cap, but anything past ~50s counts so a take that ends
  // a beat early still finishes the lesson. Shorter stops are kept in history.
  const complete = takes.some((t) => (t.duration_seconds ?? 0) >= COMPLETE_SECONDS);
  useEffect(() => {
    onCompletionChange?.(complete);
  }, [complete, onCompletionChange]);

  const unavailable = recorder.status === 'unsupported';
  const denied = recorder.status === 'denied';
  const remaining = Math.max(0, MAX_SECONDS - Math.floor(elapsed));

  return (
    <div className="flex flex-1 flex-col overflow-hidden px-[22px]">
      <MicNotice
        status={recorder.status}
        errorName={recorder.errorName}
        onRetry={() => void recorder.prime()}
      />
      {/* Record control */}
      <div className="flex shrink-0 flex-col items-center gap-2 pt-1">
        {unavailable ? (
          <span className="py-4 text-center text-[11px] font-semibold tracking-[.08em] text-teal-dim">
            RECORDING UNAVAILABLE ON THIS BROWSER
          </span>
        ) : (
          <>
            <button
              onClick={toggleRecord}
              disabled={saving}
              className={`flex h-[78px] w-[78px] items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-50 ${
                recording ? 'bg-coral' : 'border-2 border-coral/70 bg-coral/10'
              }`}
              aria-label={recording ? 'Stop recording' : 'Start recording'}
            >
              {recording ? (
                <span className="h-6 w-6 rounded-[5px] bg-cream" />
              ) : (
                <span className="h-7 w-7 rounded-full bg-coral" />
              )}
            </button>

            {recording ? (
              <div className="flex items-center gap-2.5">
                <PulseDot />
                <span className="font-serif text-[22px] tabular-nums text-cream">{fmt(elapsed)}</span>
                <span className="text-[10px] font-bold tracking-[.12em] text-coral">
                  {remaining}s LEFT
                </span>
              </div>
            ) : saving ? (
              <span className="text-[11px] font-bold tracking-[.12em] text-teal">SAVING TAKE…</span>
            ) : captureFailed && !denied ? (
              <span className="text-[11px] font-bold tracking-[.12em] text-coral">
                NO AUDIO CAPTURED · CHECK MIC &amp; TAP TO RETRY
              </span>
            ) : (
              <span className="text-[11px] font-bold tracking-[.12em] text-teal">
                {denied ? 'MIC OFF · enable to record' : 'TAP TO RECORD · UP TO 60s'}
              </span>
            )}
          </>
        )}

        {!unavailable && (
          <span
            className={`mt-0.5 text-[10px] font-bold tracking-[.08em] ${
              complete ? 'text-teal' : 'text-teal-dim'
            }`}
          >
            {complete
              ? 'FULL TAKE SAVED ✓ · LESSON COMPLETE'
              : 'SPEAK ~50s+ (AUTO-STOPS AT 60s) TO FINISH THE LESSON'}
          </span>
        )}
      </div>

      {/* History */}
      <div className="mt-3 mb-1 flex shrink-0 items-center justify-between">
        <span className="text-[9.5px] font-bold tracking-[.16em] text-teal">YOUR TAKES</span>
        {takes.length > 0 && (
          <span className="text-[9.5px] font-semibold tracking-[.08em] text-teal-dim">
            {takes.length} saved
          </span>
        )}
      </div>

      <audio
        ref={audioRef}
        playsInline
        onPlay={() => {/* playingId already set */}}
        onPause={() => setPlayingId(null)}
        onEnded={() => setPlayingId(null)}
      />

      <ol className="flex-1 space-y-2 overflow-y-auto pb-1">
        {loading ? (
          <li className="py-5 text-center font-serif text-[13px] italic text-teal/50">Loading…</li>
        ) : takes.length === 0 ? (
          <li className="py-5 text-center font-serif text-[13px] italic text-teal/50">
            {lastTakeUrl
              ? 'Take recorded.'
              : 'No takes yet — record your first freestyle above.'}
          </li>
        ) : (
          takes.map((t, i) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-[12px] border border-teal/[.18] bg-teal/[.06] px-3 py-2.5"
            >
              <button
                onClick={() => togglePlay(t)}
                disabled={!t.url}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-coral/50 text-[11px] text-coral disabled:opacity-40"
                aria-label={playingId === t.id ? 'Pause' : 'Play'}
              >
                {playingId === t.id ? '❚❚' : '▶'}
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold tracking-[.06em] text-cream">
                  TAKE {takes.length - i}
                  {t.duration_seconds != null && (
                    <span className="ml-1.5 font-semibold text-teal-dim">· {fmt(t.duration_seconds)}</span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-[3px]">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => rate(t.id, n)}
                      className={`text-[15px] leading-none transition-transform hover:scale-110 active:scale-95 ${
                        t.stars != null && n <= t.stars ? 'text-coral' : 'text-teal/25'
                      }`}
                      aria-label={`Rate ${n}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            </li>
          ))
        )}
      </ol>
    </div>
  );
}
