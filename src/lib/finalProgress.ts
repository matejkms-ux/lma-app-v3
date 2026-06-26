/**
 * Local persistence for the final-week assessment (paged essay + podcast checks).
 * Mirrors the app's local-first pattern (see lib/progress.ts): plain localStorage,
 * keyed by userId + content scope. Each value is a map of index → 1–5★ rating.
 */

type StarMap = Record<number, number>;

const essayKey = (userId: string, scope: string) => `lma:final-essay:${userId}:${scope}`;
const podcastKey = (userId: string, scope: string) => `lma:final-podcast:${userId}:${scope}`;

function read(key: string): StarMap {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as StarMap) : {};
  } catch {
    return {};
  }
}

function write(key: string, map: StarMap) {
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* ignore quota/availability */
  }
}

export const getEssayRatings = (userId: string, scope: string): StarMap =>
  read(essayKey(userId, scope));

export function setEssayRating(userId: string, scope: string, page: number, stars: number) {
  const k = essayKey(userId, scope);
  const map = read(k);
  map[page] = stars;
  write(k, map);
}

export const getPodcastRatings = (userId: string, scope: string): StarMap =>
  read(podcastKey(userId, scope));

export function setPodcastRating(userId: string, scope: string, check: number, stars: number) {
  const k = podcastKey(userId, scope);
  const map = read(k);
  map[check] = stars;
  write(k, map);
}

/** Average of the recorded ratings (0 when none), rounded to one decimal. */
export function averageStars(map: StarMap): number {
  const vals = Object.values(map);
  if (!vals.length) return 0;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}
