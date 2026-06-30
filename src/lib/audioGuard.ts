/**
 * App-wide invariant: NEVER request the microphone while reference audio is
 * playing. getUserMedia briefly suspends an active <audio> element on Safari
 * AND Chrome (each in its own way) — this has frozen the practice player at
 * PAUSED 0:00 twice (2026-06-29 Safari, 2026-06-30 Chrome, then Safari again
 * after a partial fix). The lasting fix was removing mic capture from the
 * listen steps entirely (GRASP/HUM/SHADOW/READ/RECALL) — but to make sure this
 * class of bug can never come back, `useRecorder.start()` itself refuses to
 * acquire the mic whenever this guard says reference audio is active, no
 * matter which screen calls it or why. A future change that re-adds
 * `recorder.start()` to an onPlay handler will silently no-op (with a loud
 * console.error) instead of freezing playback for a learner.
 *
 * Every <audio>/AudioPlayer that plays REFERENCE content (not a recorded take
 * being reviewed) must call `enterPlayback()` on play and the returned
 * release function on pause/end/error/unmount. Ref-counted so multiple
 * players (rare, but not impossible) don't fight over a single boolean.
 */
let activeCount = 0;

export function enterPlayback(): () => void {
  activeCount += 1;
  let released = false;
  return () => {
    if (released) return; // idempotent — a double release must never go negative
    released = true;
    activeCount = Math.max(0, activeCount - 1);
  };
}

export function isPlaybackActive(): boolean {
  return activeCount > 0;
}
