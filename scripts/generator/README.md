# Lesson audio generator → Supabase

Generates the LMA step audio for a 10-sentence set and lands it (audio + sentences)
in Supabase so the app shows the lesson. Runs server-side via GitHub Actions
(Python + ffmpeg) — Supabase Edge Functions can't run this.

## The canonical pipeline
- `lma-sentence-generator-v4.1.py` — **what CI calls today**. One CSV → 7 MP3s:
  `1grasp / 2hum / 3shadow / 4read / 5recall` (each = all 10 sentences with the
  method's gaps) + `0ref` (all L2 clean, scoring reference) + `0ref-en` (all L1).
  ElevenLabs for most languages; Azure for Khmer (`km`).
- `lma-sentence-generator-v4.2.py` — **newer**: scales RECALL/step pauses off the
  L2 clip length (fixes too-short pauses on long sentences). Verified on the
  Anamarija DE regens (2026-06-26) but not yet across languages — switch
  `generate-lesson.yml` to it only after one verified non-DE run.
- `land-lesson.py` — uploads the 7 MP3s to the `lesson-audio` bucket and upserts
  `lesson_audio` rows (`1grasp→GRASP … 0ref→ref_l2, 0ref-en→ref_l1`), ensures the
  `lessons` row, and upserts the sentences (`l1`,`l2`) into `sentences`.
- After landing anything: `npm run validate` from the repo root (DEPLOY.md gate),
  then actually play the lesson. **Never call a lesson live with unplayed audio.**

## Other load-bearing scripts (don't delete)
- `make-correction-app.py` — voice-note/freestyle → red-green correction page
  (`public/feedback/<slug>.html`), listed on `/corrections`.
- `final-podcast.py` + `final-prompts.py` — Final Week Assessment content pipeline.
- `pull-reader.py` — pulls LingQ lessons into `src/data/readerLessons.ts`
  (the islands **Read** tab source).
- `batch-audio.py` — multi-lesson batch wrapper around the generator.

## One-off learner scripts (`_<name>_*.py`, `land-jason-*`, `fix-jason-*`, `quick-jp-audio.py`)
Point-in-time builds/repairs for a single learner's content. Keep the ones whose
work is still pending; the rest are historical reference:
- **Still pending** (do not touch): `_charles_audio*.py` (arc 1–7 not yet
  rendered — blocked on Azure/ElevenLabs credits), `_bryan_he_audio.py` (held for
  Abram review + TTS key), `_kang_audio.py` (waiting on Kang's life-story homework).
- **Done & verified** (reference only): Anamarija (`_anamarija_*` — regens
  verified 2026-06-26), Jerod (`_jerod_*`, `_build_jerod_l2.py`,
  `_reshuffle_jerod_folders.py` — folders normalized 2026-06-24), Jason
  (`land-jason-v2*.py`, `fix-jason-1-6.py`), Neal (`_neal_*`), Mehrad
  (`_mehrad_generate.py`), Katja (`_katja_audio.py`), Mateja (`_mateja_audio.py`).
- Utilities: `_transcribe.py`, `_tts_sample.py`, `_verify_live.py`.
- `lma-upload-audio-storage-only.py` — superseded by `land-lesson.py` (reference).

Work dirs (`*_work/`, learner-code dirs), `*.log`, `*.jsonl` manifests, and
`tts-samples/` are local artifacts — untracked/gitignored; safe to prune once
the related regen is confirmed live.

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
