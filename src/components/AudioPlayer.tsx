import { useCallback, useEffect, useRef, useState } from 'react';
import { enterPlayback } from '../lib/audioGuard';

/**
 * Audio player (spec §5): two controls — reverse and a play/pause toggle. There
 * is no hard-stop; pausing keeps the position, and reverse seeks back a few
 * seconds. The step-clearing gate `onEnded` fires once per pass when playback
 * reaches COMPLETE_FRACTION (95%) OR the natural end, whichever comes first — the
 * learner doesn't have to sit through the last sliver. It re-arms on each replay,
 * so steps that require two listens still need two genuine passes.
 *
 * The gate is sized in SECONDS from the end (not a % of duration): clips now carry
 * long trailing practice gaps, so a fixed 95% landed inside the last sentence's
 * second repetition and cut it off. Completing ~1s from the end clears only true
 * trailing silence regardless of clip length.
 */
const REVERSE_SECONDS = 5;
const COMPLETE_TAIL_SECONDS = 1.0;
// Clips stream from remote Storage, so a slow phone connection can underrun a long
// (2 min+) clip mid-playback: the element fires `waiting`/`stalled`, playback halts
// (often with an audible glitch at the buffer boundary) and `timeupdate` stops — so
// the completion gate never reaches the tail and the step can't clear. We surface a
// BUFFERING state and a watchdog that re-kicks playback, then offers a retry, instead
// of leaving the learner stuck having to stop and replay by hand.
const STALL_RENUDGE_MS = 6000; // re-issue play() if still buffering after this
const STALL_HARD_MS = 14000; // give up auto-recovery and show a retry hint
// Safari (macOS + iOS) switches the audio session to "record" the instant the mic
// opens via getUserMedia — and the listen steps start the recorder the moment
// playback begins (onPlay → recorder.start()). That session switch INTERRUPTS the
// just-started <audio> element: it fires `pause` a beat after `play`, so the learner
// taps ▶, hears nothing, and the bar sits at PAUSED while the mic records. Chrome
// doesn't do this. The element has already begun (so it's "user-activated"), and the
// session is in record mode after the first interruption — so simply re-issuing
// play() makes it stick. We re-arm on any pause we didn't initiate, capped so a
// genuinely failed clip doesn't loop forever.
const RESUME_AFTER_INTERRUPT_MS = 200;
const MAX_RESUME_REISSUES = 3;

function fmt(secs: number): string {
  if (!Number.isFinite(secs) || secs < 0) secs = 0;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AudioPlayer({
  src,
  onEnded,
  onPlay,
  onPlayingChange,
  onProgress,
  onBufferingChange,
}: {
  src: string;
  onEnded?: () => void;
  onPlay?: () => void;
  onPlayingChange?: (playing: boolean) => void;
  /** Playback position as a 0–1 fraction (drives READ auto-scroll). */
  onProgress?: (fraction: number) => void;
  /** True while playback has stalled on buffering — lets the parent pause the mic
   * recorder so the take doesn't accumulate dead air during the gap. */
  onBufferingChange?: (buffering: boolean) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  // Buffering = mid-playback underrun (waiting/stalled). `hardStall` = it didn't
  // recover on its own and we've stopped auto-nudging, so we prompt a manual retry.
  const [buffering, setBuffering] = useState(false);
  const [hardStall, setHardStall] = useState(false);
  // Whether the completion gate has already fired for the current pass. Re-armed
  // whenever a fresh pass starts from before the threshold (incl. a replay).
  const firedRef = useRef(false);
  const renudgeTimer = useRef<number | null>(null);
  const hardTimer = useRef<number | null>(null);
  // Mirrors `buffering` for synchronous reads outside render — lets us fire
  // onBufferingChange exactly on each transition (not inside a setState updater).
  const bufferingRef = useRef(false);
  // Safari mic-interruption recovery: `playIntentRef` = the learner wants it playing
  // (set on the ▶ gesture, cleared on a deliberate pause / end / new clip).
  // `selfPauseRef` flags a pause WE issued (deliberate toggle, hard-stall) so the
  // resume watchdog doesn't fight it. `resumeReissues` caps the re-kicks.
  const playIntentRef = useRef(false);
  const selfPauseRef = useRef(false);
  const resumeReissues = useRef(0);
  const resumeTimer = useRef<number | null>(null);
  // Holds the release fn from audioGuard.enterPlayback() while this clip is
  // playing — lets useRecorder.start() refuse to touch the mic app-wide. Must
  // be released exactly once per play (pause/end/error/new-clip/unmount).
  const releasePlaybackRef = useRef<(() => void) | null>(null);
  const releasePlayback = useCallback(() => {
    releasePlaybackRef.current?.();
    releasePlaybackRef.current = null;
  }, []);

  const clearStallTimers = useCallback(() => {
    if (renudgeTimer.current) { window.clearTimeout(renudgeTimer.current); renudgeTimer.current = null; }
    if (hardTimer.current) { window.clearTimeout(hardTimer.current); hardTimer.current = null; }
    if (resumeTimer.current) { window.clearTimeout(resumeTimer.current); resumeTimer.current = null; }
  }, []);

  // Buffering recovered (or playback stopped): clear the stall UI + watchdog and let
  // the parent resume the recorder.
  const clearBuffering = useCallback(() => {
    clearStallTimers();
    setHardStall(false);
    if (bufferingRef.current) {
      bufferingRef.current = false;
      setBuffering(false);
      onBufferingChange?.(false);
    }
  }, [clearStallTimers, onBufferingChange]);

  // Entered a buffering underrun: surface it, pause the recorder, and arm the
  // watchdog — first re-issue play() (often re-kicks a hung media element), then if
  // it's still stuck, fall back to a manual retry prompt.
  const enterBuffering = useCallback(() => {
    const a = audioRef.current;
    if (!a || a.paused || a.ended) return; // a real pause/end isn't a stall
    if (!bufferingRef.current) {
      bufferingRef.current = true;
      setBuffering(true);
      onBufferingChange?.(true);
    }
    if (renudgeTimer.current || hardTimer.current) return; // watchdog already armed
    renudgeTimer.current = window.setTimeout(() => {
      const el = audioRef.current;
      if (el && !el.paused && !el.ended) void el.play().catch(() => {});
    }, STALL_RENUDGE_MS);
    hardTimer.current = window.setTimeout(() => {
      const el = audioRef.current;
      if (el && !el.paused && !el.ended) {
        selfPauseRef.current = true; // our pause — don't let the resume watchdog fight it
        el.pause(); // stop the spinner; the learner taps ▶ to retry from here
        setHardStall(true);
      }
    }, STALL_HARD_MS);
  }, [onBufferingChange]);

  // A new clip resets the transport.
  useEffect(() => {
    const a = audioRef.current;
    setPlaying(false);
    setCur(0);
    firedRef.current = false;
    playIntentRef.current = false;
    selfPauseRef.current = false;
    resumeReissues.current = 0;
    clearBuffering();
    releasePlayback();
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
  }, [src, clearBuffering, releasePlayback]);

  // Tidy the watchdog and the playback guard on unmount.
  useEffect(() => () => { clearStallTimers(); releasePlayback(); }, [clearStallTimers, releasePlayback]);

  // Surface play/pause to the parent (drives the orb animation).
  useEffect(() => {
    onPlayingChange?.(playing);
  }, [playing, onPlayingChange]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      playIntentRef.current = true; // we want it playing — arm interruption recovery
      resumeReissues.current = 0;
      setHardStall(false);
      void a.play().catch(() => {
        // Safari can ABORT this play() when something touches the audio session
        // (e.g. a getUserMedia against a blocked mic) — it rejects WITHOUT ever
        // firing a `pause` event, so the onPause self-heal never runs and the bar
        // sticks at PAUSED 0:00. Retry once shortly after: by then the session
        // settled and (for a blocked mic) the recorder no longer re-requests, so
        // the second play() sticks. Guarded by playIntentRef so a deliberate pause
        // in the gap cancels it.
        if (resumeReissues.current >= MAX_RESUME_REISSUES) return;
        resumeReissues.current += 1;
        if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
        resumeTimer.current = window.setTimeout(() => {
          const el = audioRef.current;
          if (el && el.paused && !el.ended && playIntentRef.current) {
            void el.play().catch(() => {});
          }
        }, RESUME_AFTER_INTERRUPT_MS);
      });
    } else {
      selfPauseRef.current = true; // deliberate pause — suppress the resume watchdog
      playIntentRef.current = false;
      a.pause(); // pause keeps position — no reset
    }
  };

  const reverse = () => {
    const a = audioRef.current;
    if (!a) return;
    const now = Number.isFinite(a.currentTime) ? a.currentTime : 0;
    const target = Math.max(0, now - REVERSE_SECONDS);
    try {
      a.currentTime = target;
    } catch {
      /* ignore unseekable edge */
    }
    setCur(target);
  };

  const pct = dur > 0 ? Math.min(100, (cur / dur) * 100) : 0;

  return (
    <div className="flex shrink-0 items-center gap-3 px-6">
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        playsInline
        onPlay={(e) => {
          setPlaying(true);
          playIntentRef.current = true; // playback is live — arm interruption recovery
          selfPauseRef.current = false;
          // Reference audio is live — block any getUserMedia call app-wide until
          // this clip pauses/ends/errors. See lib/audioGuard.ts.
          if (!releasePlaybackRef.current) releasePlaybackRef.current = enterPlayback();
          // Re-arm the gate for a fresh pass (replay seeks back to the start).
          const a = e.currentTarget;
          if (!a.duration || a.duration - a.currentTime > COMPLETE_TAIL_SECONDS) {
            firedRef.current = false;
          }
          onPlay?.();
        }}
        onPause={(e) => {
          setPlaying(false);
          clearBuffering();
          releasePlayback();
          const a = e.currentTarget;
          // Distinguish OUR pauses (deliberate toggle, hard-stall) from an external
          // interruption. On Safari, the recorder opening the mic right after play
          // pauses the element involuntarily — we still intend to play and we're not
          // at the end, so re-issue play(). The element has already started, so this
          // is allowed without a fresh gesture, and the audio session is now in
          // record mode so the second play() sticks.
          if (selfPauseRef.current) {
            selfPauseRef.current = false; // consume; nothing to recover
            return;
          }
          if (
            playIntentRef.current &&
            !a.ended &&
            resumeReissues.current < MAX_RESUME_REISSUES
          ) {
            resumeReissues.current += 1;
            if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
            resumeTimer.current = window.setTimeout(() => {
              const el = audioRef.current;
              if (el && el.paused && !el.ended && playIntentRef.current) {
                void el.play().catch(() => {});
              }
            }, RESUME_AFTER_INTERRUPT_MS);
          }
        }}
        onWaiting={enterBuffering}
        onStalled={enterBuffering}
        // Real progress is the only reliable "recovered" signal: `playing`/`canplay`
        // can fire while the element is still catching up.
        onPlaying={clearBuffering}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setCur(a.currentTime);
          if (bufferingRef.current) clearBuffering(); // real progress = recovered
          if (a.duration > 0) {
            onProgress?.(a.currentTime / a.duration);
            // Count the pass complete once within ~1s of the end — clears the
            // trailing silence but never the last sentence. Fires once per pass.
            if (!firedRef.current && a.duration - a.currentTime <= COMPLETE_TAIL_SECONDS) {
              firedRef.current = true;
              onEnded?.();
            }
          }
        }}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
        onError={() => {
          // A clip that won't load/play (bad src, network, decode) must not throw
          // out of the player — log it and reset the transport. The step can still
          // be cleared by playback gating once a working clip arrives.
          console.warn('Audio failed to load/play:', src);
          playIntentRef.current = false; // a real error — don't fight it with resumes
          setPlaying(false);
          clearBuffering();
          releasePlayback();
        }}
        onEnded={() => {
          playIntentRef.current = false; // reached the end — no resume
          setPlaying(false);
          setCur(0);
          clearBuffering();
          releasePlayback();
          onProgress?.(1);
          // Natural end — fire the gate only if 95% didn't already trip it.
          if (!firedRef.current) {
            firedRef.current = true;
            onEnded?.();
          }
        }}
      />
      <button
        onClick={reverse}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cream/40 text-[13px] text-cream"
        aria-label={`Reverse ${REVERSE_SECONDS} seconds`}
      >
        ↺
      </button>
      <button
        onClick={togglePlay}
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cream text-base text-emerald"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <div className="flex-1">
        <div className="h-[5px] overflow-hidden rounded-[3px] bg-teal/[.22]">
          <div className="h-full rounded-[3px] bg-teal transition-[width] duration-200" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] font-bold tracking-[.1em] text-teal-dim">
          <span>{fmt(cur)}</span>
          <span className={hardStall ? 'text-coral' : buffering ? 'text-cream' : undefined}>
            {hardStall ? 'CONNECTION SLOW · TAP ▶' : buffering ? 'BUFFERING…' : playing ? 'PLAYING' : 'PAUSED'}
          </span>
          <span>{fmt(dur)}</span>
        </div>
      </div>
    </div>
  );
}
