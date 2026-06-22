# Lesson audio generator → Supabase

Generates the LMA step audio for a 10-sentence set and lands it (audio + sentences)
in Supabase so the app shows the lesson. Runs server-side via GitHub Actions
(Python + ffmpeg) — Supabase Edge Functions can't run this.

## Files
- `lma-sentence-generator-v4.1.py` — the generator. One CSV → 7 MP3s:
  `1grasp / 2hum / 3shadow / 4read / 5recall` (each = all 10 sentences with the
  method's gaps) + `0ref` (all L2 clean, scoring reference) + `0ref-en` (all L1).
  ElevenLabs for most languages; Azure for Khmer (`km`).
- `land-lesson.py` — uploads those 7 MP3s to the `lesson-audio` bucket and upserts
  `lesson_audio` rows (`1grasp→GRASP … 0ref→ref_l2, 0ref-en→ref_l1`), ensures the
  `lessons` row, and upserts the sentences (`l1`,`l2`) into `sentences`.
- `lma-upload-audio-storage-only.py` — older storage-only uploader (kept for reference).

## Run it (GitHub Actions)
1. Add repo secrets (Settings → Secrets and variables → Actions):
   `ELEVENLABS_API_KEY`, `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`,
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
2. Commit a CSV under `lesson-sets/` (see `lesson-sets/tom-km-001.csv`).
   Columns: `APP-USERNAME, SENTENCE #, SENTENCE CLAUSES, L2, L1, LANGUAGE`.
3. Actions tab → **Generate lesson** → Run workflow → set `csv_path`,
   `app_username`, `nnn`. It generates + lands the lesson.

## Run it locally (alternative)
```
export ELEVENLABS_API_KEY=... AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=eastus
python3 lma-sentence-generator-v4.1.py ../../lesson-sets/tom-km-001.csv 001
export SUPABASE_URL=https://wcrwnfvwydibhggislne.supabase.co SUPABASE_SERVICE_ROLE_KEY=...
python3 land-lesson.py --src TOMR2504-km/<timestamp> --csv ../../lesson-sets/tom-km-001.csv \
  --app-username TOMR2504-km --nnn 001 --commit
```

Note: the v4 CSV has no transliteration column, so `land-lesson.py` writes `l1`/`l2`
only and leaves any existing `l2_translit` untouched.
