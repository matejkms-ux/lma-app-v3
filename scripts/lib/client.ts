/**
 * Admin Supabase client for the content-loading scripts. Uses the SERVICE ROLE
 * key — full write access, bypasses RLS — so it must NEVER ship to the browser.
 * Loaded from the environment (scripts/.env), never committed.
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Load scripts/.env regardless of where the script is invoked from.
const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, '../.env') });

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Copy scripts/.env.example to scripts/.env and fill them in.',
  );
  process.exit(1);
}

export const admin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

/** The Storage bucket holding the MP3 clips. */
export const AUDIO_BUCKET = process.env.SUPABASE_AUDIO_BUCKET ?? 'lesson-audio';
