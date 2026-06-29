import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { USERS, type User } from './data/mock';
import { initProgressSync } from './lib/progress';
import { getLessonCatalog } from './data/content';

/**
 * Session — who's "in". Name-select sets the current user (no auth; v3 brief §4)
 * and persists the choice in localStorage, so a reload keeps you signed in (and
 * keeps your progress, which is keyed by user id). No saved user → name select.
 */
interface SessionValue {
  user: User | null;
  selectUser: (user: User) => void;
  signOut: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);
const USER_KEY = 'lma:userId';
const USER_OBJ_KEY = 'lma:user';

function restore(): User | null {
  try {
    // Prefer the full stored object (has Supabase fields like unlock_all).
    const raw = localStorage.getItem(USER_OBJ_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as User;
      if (parsed?.id) return parsed;
    }
    // Fallback: legacy id-only storage → look up in mock list.
    const id = localStorage.getItem(USER_KEY);
    return (id && USERS.find((u) => u.id === id)) || null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(restore);

  // Sync Supabase progress + warm the lesson catalog whenever the active user
  // changes (login + page reload), so synchronous catalog reads are populated.
  useEffect(() => {
    if (user) {
      void initProgressSync(user.id);
      if (user.username) void getLessonCatalog(user.username);
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<SessionValue>(
    () => ({
      user,
      selectUser: (u) => {
        setUser(u);
        try {
          localStorage.setItem(USER_KEY, u.id);
          localStorage.setItem(USER_OBJ_KEY, JSON.stringify(u));
        } catch {
          /* ignore */
        }
      },
      signOut: () => {
        setUser(null);
        try {
          localStorage.removeItem(USER_KEY);
          localStorage.removeItem(USER_OBJ_KEY);
        } catch {
          /* ignore */
        }
      },
    }),
    [user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
