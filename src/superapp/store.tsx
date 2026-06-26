import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { SheetWord, WordStatus } from '../data/superApp';

/**
 * Super-app store — the small slice of cross-mode state the design shares:
 * the LingQ-style word statuses, the live "words known" count, the rep tallies
 * shown on the Hub, and the single shared word sheet.
 *
 * This mirrors the prototype's component state (claude.ai/design handoff): it is
 * session-scoped, not persisted, since the Companion / Reader / Watch modes run
 * on mock content until the backend path lands (same staging as the rest of the
 * app — see CLAUDE.md "mock→Supabase"). Reps earned here are illustrative.
 */
interface SuperAppValue {
  /** l2 → status overrides applied on top of the content's default status. */
  wordStatuses: Record<string, WordStatus>;
  statusOf: (l2: string, fallback?: WordStatus) => WordStatus;
  knownWords: number;
  reps: number;
  repsToday: number;
  streak: number;
  dueToday: number;
  /** The currently-open word sheet, or null. */
  sheetWord: SheetWord | null;
  /** One-shot flag that fires the speak animation on the sheet. */
  justSpoke: boolean;
  openWord: (w: SheetWord) => void;
  closeWord: () => void;
  setStatus: (status: WordStatus) => void;
  speak: () => void;
  /** Award reps from a finished mode (Companion / Watch / Review). */
  awardReps: (n: number) => void;
}

const Ctx = createContext<SuperAppValue | null>(null);

export function SuperAppProvider({ children }: { children: ReactNode }) {
  const [wordStatuses, setWordStatuses] = useState<Record<string, WordStatus>>({});
  const [knownWords, setKnownWords] = useState(218);
  const [reps, setReps] = useState(47);
  const [repsToday, setRepsToday] = useState(12);
  const [sheetWord, setSheetWord] = useState<SheetWord | null>(null);
  const [justSpoke, setJustSpoke] = useState(false);

  const statusOf = useCallback(
    (l2: string, fallback: WordStatus = 'new') => wordStatuses[l2] ?? fallback,
    [wordStatuses],
  );

  const openWord = useCallback((w: SheetWord) => {
    setJustSpoke(false);
    setSheetWord(w);
  }, []);

  const closeWord = useCallback(() => setSheetWord(null), []);

  const setStatus = useCallback(
    (status: WordStatus) => {
      setSheetWord((w) => {
        if (!w) return null;
        setWordStatuses((prev) => {
          const wasKnown = prev[w.l2] === 'known';
          if (status === 'known' && !wasKnown) setKnownWords((k) => k + 1);
          if (status !== 'known' && wasKnown) setKnownWords((k) => k - 1);
          return { ...prev, [w.l2]: status };
        });
        return null; // close the sheet on a choice, matching the prototype
      });
    },
    [],
  );

  const speak = useCallback(() => {
    setJustSpoke(true);
    setTimeout(() => setJustSpoke(false), 900);
  }, []);

  const awardReps = useCallback((n: number) => {
    setReps((r) => r + n);
    setRepsToday((r) => r + n);
  }, []);

  const value = useMemo<SuperAppValue>(
    () => ({
      wordStatuses,
      statusOf,
      knownWords,
      reps,
      repsToday,
      streak: 6,
      dueToday: 14,
      sheetWord,
      justSpoke,
      openWord,
      closeWord,
      setStatus,
      speak,
      awardReps,
    }),
    [wordStatuses, statusOf, knownWords, reps, repsToday, sheetWord, justSpoke, openWord, closeWord, setStatus, speak, awardReps],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSuperApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSuperApp must be used within a SuperAppProvider');
  return ctx;
}
