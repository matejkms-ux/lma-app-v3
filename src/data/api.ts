import { supabase, useSupabase } from '../lib/supabase';
import { USERS, LESSONS, SENTENCES, type User, type Lesson, type Sentence } from './mock';

/** Roster for name-select. */
export async function getRoster(): Promise<User[]> {
  if (useSupabase && supabase) {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, language')
      .eq('role', 'adventurer')
      .order('name');
    if (!error && data && data.length) return data as User[];
  }
  return USERS;
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
    const { data, error } = await supabase
      .from('sentences')
      .select('id, sentenceNr:sentence_nr, l1, l2, l2_translit, l2_audio_url')
      .eq('lesson_code', lessonCode)
      .order('sentence_nr');
    if (!error && data && data.length) {
      return data.map((r) => ({ ...r, stars: 0, status: 'locked' as const })) as Sentence[];
    }
  }
  return SENTENCES;
}
