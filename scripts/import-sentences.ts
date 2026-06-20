/**
 * CSV import — sentences (text + transliteration + clause count) into Supabase.
 *
 * Author the 10 sentences for a lesson in Airtable, export a CSV with columns:
 *   sentence_number, position, l1_text, l2_text, transliteration, clause_count
 * then run this to upsert the rows onto the lesson.
 *
 *   npm run import:sentences -- --lesson LMPI-003 --file ./LMPI-003.csv
 *
 * Upserts on (lesson_code, position), so re-running with a corrected CSV is safe.
 */
import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { admin } from './lib/client';

interface CsvRow {
  sentence_number: string;
  position: string;
  l1_text: string;
  l2_text: string;
  transliteration: string;
  clause_count: string;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const lessonCode = arg('lesson');
  const file = arg('file');
  if (!lessonCode || !file) {
    console.error('Usage: npm run import:sentences -- --lesson LMPI-003 --file ./LMPI-003.csv');
    process.exit(1);
  }

  // Confirm the lesson exists so we fail loudly rather than orphaning rows.
  const { data: lesson, error: lessonErr } = await admin
    .from('lessons')
    .select('code')
    .eq('code', lessonCode)
    .maybeSingle();
  if (lessonErr) throw lessonErr;
  if (!lesson) {
    console.error(`Lesson ${lessonCode} not found. Create it in the lessons table first.`);
    process.exit(1);
  }

  const rows = parse(readFileSync(file, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRow[];

  if (!rows.length) {
    console.error('CSV has no rows.');
    process.exit(1);
  }

  const records = rows.map((r) => ({
    lesson_code: lessonCode,
    sentence_number: Number(r.sentence_number),
    position: Number(r.position),
    l1_text: r.l1_text,
    l2_text: r.l2_text,
    transliteration: r.transliteration || null,
    clause_count: r.clause_count ? Number(r.clause_count) : null,
  }));

  const { error } = await admin
    .from('sentences')
    .upsert(records, { onConflict: 'lesson_code,position' });
  if (error) throw error;

  console.log(`✓ Imported ${records.length} sentences into ${lessonCode}.`);
}

main().catch((e) => {
  console.error('Import failed:', e.message ?? e);
  process.exit(1);
});
