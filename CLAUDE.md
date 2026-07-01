# CLAUDE.md

Context for Claude working in this repo. Read `README.md`, `PROJECT.md`, and
**`DEPLOY.md` (the ship gate — run it before calling anything live)**.

_Rewritten 2026-07-01 to match the shipped app; the old "local-first MVP" notes
described machinery that no longer exists._

## What this is

**LMA Practice Player** (a.k.a. the Sentences app / "islands" app) — a
mobile-first language-practice app for paying learners ("adventurers"). Every
lesson is drilled through **six sequential steps**: GRASP → HUM → SHADOW → READ
→ RECALL → **FREESTYLE** (`STEPS` in `src/tokens.ts`; the first five are
`AUDIO_STEPS` and carry reference audio). Progress is counted in **reps**.
Design language: near-black canvas, single coral accent, large type, one moving
element at a time.

This repo deploys **two Netlify sites from one codebase**:
- **Learner site** `lma-islands-app.netlify.app` — Netlify git-builds `main`
  (no `VITE_APP_MODE`). This is production for learners.
- **Video site** `lma-video-app.netlify.app` — `.github/workflows/deploy.yml`
  builds `main` with `VITE_APP_MODE=video` (Zoom Video SDK session rooms) and
  deploys via CLI to a **pinned site ID**. Never point it at the learner site.

## Stack & conventions

- React 18 + TypeScript + Vite; Tailwind; React Router; Supabase JS.
- **Design tokens are the source of truth** (`src/tokens.ts`);
  `tailwind.config.js` reads from it. No hardcoded colours/spacing.
- **Keep logic out of presentation.** Behaviour lives in
  `src/practice/usePractice.ts` (step engine), `src/lib/progress.ts`
  (progress + Supabase sync), `src/data/api.ts` / `src/data/content.ts`
  (data + catalog). Screens are thin.
- Match the surrounding code's idiom and comment density.

## Current behaviour (the facts that bite)

- **No step records the learner's mic.** Recording was removed repo-wide
  2026-07-01 (`645e27a`). Steps 1–5 clear on listening; **FREESTYLE** is a
  pass-through: speak on your own, then **self-rate**
  (`screens/practice/FreestylePanel.tsx`) — that rating is the
  lesson-completion gate (`lib/progress.ts` `getFreestyleRatedLessons`).
  `useRecorder.ts` / `lib/audioGuard.ts` remain **only** for the Final Week
  Assessment capstone (`FinalConversationScreen.tsx`). Never call
  `getUserMedia` during playback on listen steps (Safari/Chrome regressions —
  see `lib/audioGuard.ts`).
- **The lesson catalog is derived from the DB**, scoped per learner by
  lesson-code prefix (`getLessonCatalog` in `src/data/content.ts`). There is no
  static lesson list.
- **Progress syncs to Supabase** (`lib/progress.ts` `initProgressSync`).
  Local keys `lma:progress|reps|stars:<id>` + `lma:sb:<id>` snapshot.
  `lesson_step_progress` upserts **must include `version` in `onConflict`**
  (4-column PK) or writes silently fail.
- A step clears (and Next unlocks) on **one full play** — the player treats
  ~1s-from-end as complete so trailing practice gaps don't cut the last
  sentence.
- **Lesson versioning:** `version` column is live; the `N.v` belongs in the
  title, never in `lesson_code`.
- **Bonus lessons** (`…-bonusNNN`) are always-open, excluded from Home
  hero/counts.
- Reading text sizes by script (`needsLargeScript`): large for Thai/CJK,
  normal for Latin.

## Content pipeline

CSV in `lesson-sets/` → `scripts/generator/lma-sentence-generator-v4.1.py`
(7 MP3s per lesson via ElevenLabs/Azure) → `scripts/generator/land-lesson.py`
(Storage upload + `lessons`/`sentences`/`lesson_audio` rows). Runnable in CI:
`.github/workflows/generate-lesson.yml` (manual dispatch). See
`scripts/generator/README.md` for which scripts are canonical vs one-off.

**Every lesson is exactly 10 sentences.** Never ship a lesson without playable
audio — generate + verify in the same pass (`npm run validate`, then play it).

## Deploy / verify

```bash
npm run typecheck && npm run build   # app gate
npm run validate                     # content gate — reads public.content_audit
```

`dist/` is **gitignored** (both sites build from source; nothing publishes a
committed dist). Secrets: anon key is client-safe (RLS); the service-role key
lives only in `scripts/.env` / CI secrets — never in the frontend. Full
checklist with the failure modes: **DEPLOY.md**.

## How to run

```bash
npm install
npm run dev          # http://localhost:5173 — mock data, no backend needed
```

Live data: `cp .env.example .env.local`, fill URL + anon key, set
`VITE_USE_SUPABASE=true`. Supabase project: `wcrwnfvwydibhggislne`.

Hosted at GitHub `matejkms-ux/lma-app-v3` (branch `main`). Jerod also pushes
here (`jerodwcox-Frontend`) — **always `git fetch origin` before you commit or
push**, and never `git add -A` (concurrent sessions share this working tree).
