import { useCallback, useEffect, useRef, useState } from 'react';
import {
  COMPANION_BEAT_DUR,
  COMPANION_BEATS,
  COMPANION_SCRIPT,
  type CompanionBeat,
} from '../data/superApp';

/**
 * The Companion player engine — the hands-free three-beat loop the design's
 * orb runs. Each phrase cycles teach → anticipation → confirm; the last beat of
 * the last phrase finishes the lesson. Kept out of the screen so the player view
 * stays a thin projection of `playing` / `beat` / `item`.
 */
export function useCompanion(onFinish: () => void) {
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState<CompanionBeat>('teach');
  const [item, setItem] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  // advanceBeat reads the latest state via the functional updater chain so the
  // scheduled timeout never closes over a stale beat/item.
  const advance = useCallback(() => {
    setBeat((b) => {
      const bi = COMPANION_BEATS.indexOf(b);
      if (bi < COMPANION_BEATS.length - 1) return COMPANION_BEATS[bi + 1];
      // last beat → next phrase
      setItem((i) => {
        const ni = i + 1;
        if (ni >= COMPANION_SCRIPT.length) {
          clear();
          setPlaying(false);
          onFinish();
          return i;
        }
        return ni;
      });
      return 'teach';
    });
  }, [clear, onFinish]);

  // (Re)schedule the current beat whenever play state, beat, or item changes.
  useEffect(() => {
    clear();
    if (!playing) return;
    timer.current = setTimeout(advance, COMPANION_BEAT_DUR[beat]);
    return clear;
  }, [playing, beat, item, advance, clear]);

  useEffect(() => clear, [clear]);

  const toggle = useCallback(() => setPlaying((p) => !p), []);
  const back10 = useCallback(() => setBeat('teach'), []);
  const skip = useCallback(() => advance(), [advance]);

  return {
    playing,
    beat,
    item,
    listening: beat === 'anticipation',
    toggle,
    back10,
    skip,
  };
}
