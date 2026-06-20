/**
 * Audio upload — push a folder of MP3s to Supabase Storage and link the public
 * URLs onto the matching sentence rows (matched by position within a lesson).
 *
 * MP3 naming convention (by position):
 *   REF-001.mp3      → L2 (target-language) audio for position 1   → l2_audio_url
 *   REF-EN-001.mp3   → L1 (English) audio for position 1           → l1_audio_url
 *
 *   npm run upload:audio -- --lesson LMPI-003 --dir ./audio/LMPI-003
 *
 * One command per lesson, not 20 drag-and-drops (brief §10, Option B).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { admin, AUDIO_BUCKET } from './lib/client';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** REF-001.mp3 → {position:1, lang:'l2'};  REF-EN-001.mp3 → {position:1, lang:'l1'}. */
function parseName(file: string): { position: number; lang: 'l1' | 'l2' } | null {
  const m = /^REF-(EN-)?(\d+)\.mp3$/i.exec(file);
  if (!m) return null;
  return { lang: m[1] ? 'l1' : 'l2', position: Number(m[2]) };
}

async function main() {
  const lessonCode = arg('lesson');
  const dir = arg('dir');
  if (!lessonCode || !dir) {
    console.error('Usage: npm run upload:audio -- --lesson LMPI-003 --dir ./audio/LMPI-003');
    process.exit(1);
  }

  const files = readdirSync(dir).filter((f) => extname(f).toLowerCase() === '.mp3');
  if (!files.length) {
    console.error(`No .mp3 files in ${dir}.`);
    process.exit(1);
  }

  let uploaded = 0;
  let linked = 0;

  for (const file of files) {
    const parsed = parseName(file);
    if (!parsed) {
      console.warn(`• skipping ${file} (name doesn't match REF-NNN / REF-EN-NNN)`);
      continue;
    }

    // Upload (upsert) to a per-lesson path in the bucket.
    const objectPath = `${lessonCode}/${file}`;
    const { error: upErr } = await admin.storage
      .from(AUDIO_BUCKET)
      .upload(objectPath, readFileSync(join(dir, file)), {
        contentType: 'audio/mpeg',
        upsert: true,
      });
    if (upErr) {
      console.error(`✗ upload failed for ${file}: ${upErr.message}`);
      continue;
    }
    uploaded++;

    const { data: pub } = admin.storage.from(AUDIO_BUCKET).getPublicUrl(objectPath);
    const column = parsed.lang === 'l2' ? 'l2_audio_url' : 'l1_audio_url';

    // Link the URL onto the matching sentence row (by lesson + position).
    const { error: linkErr, count } = await admin
      .from('sentences')
      .update({ [column]: pub.publicUrl }, { count: 'exact' })
      .eq('lesson_code', lessonCode)
      .eq('position', parsed.position);
    if (linkErr) {
      console.error(`✗ link failed for ${file}: ${linkErr.message}`);
      continue;
    }
    if (!count) {
      console.warn(`• uploaded ${file} but no sentence at position ${parsed.position} in ${lessonCode}`);
      continue;
    }
    linked++;
  }

  console.log(`✓ Uploaded ${uploaded} file(s); linked ${linked} URL(s) onto ${lessonCode}.`);
}

main().catch((e) => {
  console.error('Upload failed:', e.message ?? e);
  process.exit(1);
});
