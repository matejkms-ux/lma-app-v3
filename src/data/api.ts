import { supabase, useSupabase } from '../lib/supabase';
import { USERS, LESSONS, type User, type Lesson, type Sentence, type LearnerPlan } from './mock';
import type { Adventure } from './adventure';
import { getActiveVersion } from './lessonAudio';

/** Roster for name-select. */
export async function getRoster(): Promise<User[]> {
  if (useSupabase && supabase) {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, first_name, last_names, called_name, language, username, plan, adventure')
      .eq('role', 'adventurer')
      .order('name');
    if (!error && data && data.length) {
      return data.map((r) => ({
        id: r.id as string,
        name: r.name as string,
        firstName: (r.first_name as string | null) ?? undefined,
        lastNames: (r.last_names as string | null) ?? undefined,
        calledName: (r.called_name as string | null) ?? undefined,
        language: r.language as string,
        username: (r.username as string | null) ?? undefined,
        plan: (r.plan as LearnerPlan | null) ?? undefined,
        adventure: (r.adventure as Adventure | null) ?? undefined,
      })) as User[];
    }
  }
  return USERS;
}

/**
 * Upsert a learner to the users table, keyed by username.
 * Returns the Supabase-assigned UUID on success, null otherwise.
 */
export async function upsertUser(
  userData: Omit<User, 'id'>,
): Promise<string | null> {
  if (!useSupabase || !supabase || !userData.username) return null;
  const fullName = [userData.firstName, userData.lastNames].filter(Boolean).join(' ').trim()
    || userData.name;
  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        name: fullName,
        first_name: userData.firstName ?? null,
        last_names: userData.lastNames ?? null,
        called_name: userData.calledName ?? null,
        language: userData.language,
        username: userData.username,
        role: 'adventurer',
      },
      { onConflict: 'username' },
    )
    .select('id')
    .maybeSingle();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

/** All lessons, ordered alphabetically by lesson_code. */
export async function getLessons(): Promise<Lesson[]> {
  if (useSupabase && supabase) {
    const { data, error } = await supabase
      .from('lessons')
      .select('id, lesson_code, language, title')
      .order('lesson_code');
    if (!error && data && data.length) return data as Lesson[];
  }
  return LESSONS;
}

/** The sentences for a lesson, in sentence_nr order. */
export async function getSentences(lessonCode: string): Promise<Sentence[]> {
  if (useSupabase && supabase) {
    const version = await getActiveVersion(lessonCode);
    const { data, error } = await supabase
      .from('sentences')
      .select('id, sentenceNr:sentence_nr, l1, l2, l2_translit, l2_translit_1, l2_translit_2, l2_audio_url')
      .eq('lesson_code', lessonCode)
      .eq('version', version)
      .order('sentence_nr');
    if (!error && data && data.length) {
      return data.map((r) => ({ ...r, stars: 0, status: 'locked' as const })) as Sentence[];
    }
  }
  return [];
}
