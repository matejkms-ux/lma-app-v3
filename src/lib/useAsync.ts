import { useEffect, useState } from 'react';

/**
 * Minimal data-loading hook: runs an async fetch on mount, returning the result
 * (seeded with a fallback so the UI never flashes empty) and a loading flag.
 */
export function useAsync<T>(fn: () => Promise<T>, fallback: T, deps: unknown[] = []) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fn()
      .then((res) => {
        if (alive) setData(res);
      })
      .catch(() => {
        /* keep fallback */
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading };
}
