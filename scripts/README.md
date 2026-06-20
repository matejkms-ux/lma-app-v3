# Content-loading scripts

Two scripts feed the live app (brief §10). They run **from your machine** with
the Supabase **service-role** key — never from the browser, never committed.

## Setup (once)

1. Create the tables: run [`supabase/schema.sql`](../supabase/schema.sql) in the
   Supabase SQL editor.
2. Create a Storage bucket for audio (default name `lesson-audio`) and make it
   public (or adjust the policy).
3. `cp scripts/.env.example scripts/.env` and fill in:
   - `SUPABASE_URL` — your project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — from Dashboard → Settings → API (keep secret)
   - `SUPABASE_AUDIO_BUCKET` — if not `lesson-audio`
4. Make sure the lesson row exists in `lessons` (the import refuses to orphan
   sentences onto a missing lesson).

## 1 · Import sentences (CSV → `sentences` table)

Author the 10 sentences in Airtable, export a CSV with columns:

```
sentence_number, position, l1_text, l2_text, transliteration, clause_count
```

(See [`samples/LMPI-003.csv`](samples/LMPI-003.csv).) Then:

```bash
npm run import:sentences -- --lesson LMPI-003 --file ./LMPI-003.csv
```

Upserts on `(lesson_code, position)`, so re-running with a corrected CSV is safe.

## 2 · Upload audio (MP3s → Storage, URLs → rows)

Name MP3s by position:

- `REF-001.mp3` → L2 (target) audio for position 1 → `l2_audio_url`
- `REF-EN-001.mp3` → L1 (English) audio for position 1 → `l1_audio_url`

Then one command per lesson:

```bash
npm run upload:audio -- --lesson LMPI-003 --dir ./audio/LMPI-003
```

Each file is uploaded to `lesson-audio/LMPI-003/…` and its public URL written
onto the matching sentence row (matched by lesson + position).

## End-to-end

```
generate MP3s (ElevenLabs) → CSV of sentences (Airtable)
   → import:sentences  (text in)
   → upload:audio      (audio in + linked)
   → the lesson is live
```
