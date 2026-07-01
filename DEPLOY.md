# Deploy checklist — nothing ships unchecked

The rule: **if a check doesn't pass, it isn't deployed.** Half-done content (a
title that disagrees with its data, a lesson with no sentences) is treated as a
bug, not a "minor thing to fix later".

This file is the gate. Run it top to bottom before announcing anything live.

---

## 1 · Content gate (the data: lessons, sentences, titles, audio)

```bash
npm run validate              # all learners
npm run validate -- ANAMARIJA # one learner / program
```

- Reads the `public.content_audit` view
  (`supabase/migrations/20260625150000_content_audit_view.sql`).
- **Exit 0 = safe. Exit 1 = a FAIL exists — do not ship.**
- WARN rows (currently `NO_AUDIO_YET`) don't block, but you must *know* they're
  there. Audio is pending the Azure key; that's the only acceptable WARN.

What FAIL catches (every one is "the name/data disagree with each other"):

| Check | Means |
|---|---|
| `TITLE_PREFIX_MISMATCH` | The `N.v` in the title ≠ the row's `lesson_number.version`. *(This is the Anamarija "1.2" bug.)* |
| `CODE_SUFFIX_MISMATCH` | The `-NNN` in `lesson_code` ≠ `lesson_number`. |
| `LESSON_NUMBER_NULL` | An active lesson has no number. |
| `LESSON_NO_SENTENCES` | An active lesson has zero sentences. |
| `SENTENCE_NR_GAP` | Sentences don't run 1..N contiguously. |
| `EMPTY_L1_OR_L2` | A sentence is missing its English or its target text. |
| `JA_MISSING_TRANSLIT` | A Japanese sentence is missing furigana or romaji. |
| `DUP_CODE_VERSION` / `DUP_LESSON_NUMBER` | Two rows claim the same slot. |
| `ORPHAN_SENTENCE` / `ORPHAN_AUDIO` | Points at a lesson that doesn't exist. |

To add a rule, add one `union all` block to the view migration, re-apply it, and
add a row to the table above. The view is the single source of truth — the script
is just a runner, so a new check is live everywhere the moment the view changes.

### When this runs
After **any** content change — `import:sentences`, `land-lesson.py`, or a manual
edit in the Supabase SQL editor — and before telling anyone a lesson is ready.

---

## 2 · App gate (the frontend build)

```bash
npm run typecheck     # tsc, no emit
npm run build         # tsc -b && vite build — must pass clean
```

Repo-specific deploy facts (don't relearn these the hard way):
- Netlify SPA redirect lives in **`public/_redirects`** (so it lands in `dist/`).
- `dist/` is **not** committed (gitignored since 2026-07-01). Both sites build
  from source on every push to `main`:
  - **Learner site** `lma-islands-app.netlify.app` — Netlify's own git build
    (`netlify.toml`: `npm run build`, publish `dist`). No `VITE_APP_MODE`.
  - **Video site** `lma-video-app.netlify.app` — `.github/workflows/deploy.yml`
    builds with `VITE_APP_MODE=video` and deploys via CLI. Its site ID is
    **pinned in the workflow** (`0cb0a16d-…`) so a misconfigured secret can
    never point the video build at the learner site again (the 2026-06-27 outage).
- Service-role key only in `scripts/.env` (gitignored). Never in the frontend.

---

## 3 · Verify the actual experience

For a content change, open the affected learner in the app and confirm the lesson
renders the way the data says it should — title, sentences, order. Don't declare
PASS from green checks alone; look at what the learner sees.
