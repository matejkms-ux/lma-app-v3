import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The browser Supabase client (anon key, RLS-protected). Created lazily and only
 * when configured; otherwise the data layer falls back to bundled mock data so
 * the UI renders before the backend exists.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Master switch: read from Supabase only when explicitly enabled AND configured. */
export const useSupabase =
  import.meta.env.VITE_USE_SUPABASE === 'true' && Boolean(url && anonKey);

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;
