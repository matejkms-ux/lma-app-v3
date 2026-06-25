# CLAUDE.md

Context for Claude working in this repo. Read `README.md` and `PROJECT.md` too.

> **Status note (2026-06-25).** Some details below are out of date — current reality:
> - **Six** steps, not five: GRASP → HUM → SHADOW → READ → RECALL → **FREESTYLE**
>   (`STEPS` in `tokens.ts`; the first five are `AUDIO_STEPS`). FREESTYLE has no
>   reference audio and finishes the lesson with a >=50s take
>   (`FREESTYLE_COMPLETE_SECONDS` in `lib/recordings.ts`).
> - **Progress syncs to Supabase** (`lib/progress.ts` `initProgressSync`) — not
>   "100% local". Local keys: `lma:progress|reps|stars:<id>` + a `lma:sb:<id>`
>   snapshot of the last Supabase fetch.
> - **The lesson catalog is DERIVED FROM THE DB**, scoped per learner by lesson-code
>   prefix (`getLessonCatalog` in `data/content.ts`). There is no static
>   `PRACTICE_LESSONS` list anymore — it had drifted and hidden real lessons.
> - A step clears (and Next / next-lesson unlock) on **one full play** — the same
>   bar as the "DONE" badge.
> - **Recall clips:** the generator now does `L1 -> gap -> L2` once (was revealing
>   L2 twice). EXISTING clips in Storage must be regenerated to pick this up.

## What this is

**LMA Practice Player** — a mobile-first language-practice app. Every sentence is
drilled through five sequential steps **GRASP → HUM → SHADOW → READ → RECALL**;
progress is counted in **reps**. Design language: near-black canvas, a single coral
accent, large type, minimal chrome, one moving element at a time.

Origin: a Claude Design handoff (HTML prototype in `prototype/`, design
conversation in `chats/`). The React app is the production implementation.

## Stack & conventions

- React 18 + TypeScript + Vite; Tailwind; React Router; Supabase JS.
- **Design tokens are the source of truth** (`src/tokens.ts`); `tailwind.config.js`
  reads from it. Don't hardcode colours/spacing in components — use tokens/Tailwind.
- **Keep logic out of presentation.** Behaviour lives in `src/practice/usePractice.ts`
  (the progressive practice engine), `src/practice/useRecorder.ts` (mic capture),
  `src/lib/progress.ts` + `src/lib/recordings.ts` (local persistence), and
  `src/data/api.ts` / `src/data/content.ts` (data + content). Screens are thin.
- Match the surrounding code's idiom and comment density.

## What has been done

- All 10 designed screens built (Entry, Home, Practice player, Lesson select,
  Lesson overview, Activities, plus shared components).
- The **local-first practice MVP** — real audio playback, points, mic recording,
  and persisted progress (see "Practice MVP" below). Supersedes the original
  mock-only five-step engine.
- Design-token system + Tailwind wiring.
- **Supabase integration (read path):** `lib/supabase.ts` (anon client + a
  `useSupabase` switch), `data/api.ts` (Supabase-or-mock, falls back to
  `data/mock.ts`), wired into Entry/Lessons/Overview. Defaults to mock so the UI
  always renders.
- `supabase/schema.sql` — tables (users, lessons, sentences, step_progress, reps)
  with RLS.
- Content scripts (`scripts/`): `import-sentences.ts` (CSV → sentences) and
  `upload-audio.ts` (MP3s → Storage + linked URLs). See `scripts/README.md`.
- `npm run build` and `npm run typecheck` pass clean.

## Practice MVP — local-first (current working build)

The practice loop is now **real and local** (no backend yet). This is the active
shape of the app; the older "10 sentences × 5 steps, all mock" framing is superseded.

**Model.** A *lesson* has **one audio clip per step** — finishing a clip clears the
step. There is no per-sentence drilling in this path; the clip is the exercise.
Content lives in `src/data/content.ts` as `PracticeLesson { code, title, language,
audio: Partial<Record<Step, url>>, pointsPerStep }`. Only steps present in `audio`
are playable; others are simply absent from the flow.

**First wired lesson — German, `ISL001` ("Lektion 1"), user Anamarija.** Source MP3s
are in `audio-files/de/` (named `Anamarija-DE-ISL001-<STEP>.mp3.mpeg`); the app
serves cleaned copies from `public/audio/de/ISL001-{GRASP,MIMIC,EXPRESS}.mp3`
(Vite serves `public/` at root). The three clips fill the **first three steps in
order** so practice advances with no gaps: `GRASP→GRASP`, `MIMIC→HUM`,
`EXPRESS→SHADOW`. **READ and RECALL have no audio yet** and await their clips.
(Earlier builds mapped "by meaning" GRASP/SHADOW/RECALL, which made Next skip HUM —
changed to consecutive on request.)

**The loop** (`src/screens/PracticeScreen.tsx` → `<Player>`):
- Walks **all five canonical steps** (GRASP→HUM→SHADOW→READ→RECALL) in order
  (counter `X/5`). A step WITH a clip is gated (Next unlocks once its audio
  finishes); a step WITHOUT a clip shows **"AUDIO COMING SOON"** and is a free
  pass-through (Next always enabled) — missing audio never blocks reaching later
  steps. `usePractice` navigates `STEPS`; `lesson.audio[step]` decides gated vs
  pass-through. Resumes at the saved step on reload.
- `AudioPlayer` is a real `<audio>`: **Play / Stop only**, Stop resets to 0, **no
  seeking**. Reaching the end (`onEnded`) is the gate. It reports play/stop via
  `onPlayingChange`, which drives the **listening orb animation** (`GraspBody`
  `active` prop → breathe + equalizer + pulse-ring while a clip plays; `breathe`
  keyframe is in `tailwind.config.js`).
- On end: award **`pointsPerStep` reps (10)**, mark the step cleared, enable Next.
- While the clip plays, the mic records (`useRecorder`: getUserMedia + MediaRecorder,
  container chosen via `isTypeSupported` — Safari `audio/mp4`, Chrome `audio/webm`).
  On end the take is saved to **IndexedDB** (`src/lib/recordings.ts`); on Stop it's
  discarded. Needs a secure context (https/localhost) + mic permission; **degrades
  gracefully** (playback + points still work if denied/unsupported). A completed
  step shows **"▶ Hear your take"** (plays the saved blob back — also the way to
  confirm the mic captured).

**Persistence (local stand-ins for the Supabase write path):**
- `src/lib/progress.ts` — `localStorage`: `lma:progress:<userId>` (cleared steps +
  current step per lesson) and `lma:reps:<userId>` (append-only rep log → lifetime +
  "today"). `markStepComplete` is idempotent (no double-counting). Reload resumes
  the lesson and the **Home "REPS GATHERED" number is real** (other Home stats are
  still illustrative).
- `src/lib/recordings.ts` — IndexedDB blob store, keyed `userId:lesson:step`.
- `src/session.tsx` — selected user persists in `localStorage` (`lma:userId`); no
  saved user → name-select. Progress is keyed by user id.

**Navigation:** Entry (name-select) → `/lessons` (lessons for the user's language) →
tap a lesson (passes `{ lessonCode }` via route state) → `/practice`. A language with
no `PracticeLesson` shows an empty state.

On finishing a step a coral **"+N reps" celebration** pops (`animate-pop`).

**Verify:** `npm run dev`, pick **Anamarija**, open **Lektion 1** → starts at GRASP;
play to the end → +10 celebration + Next unlocks; Next → HUM (MIMIC) → SHADOW
(EXPRESS), each consecutive; reload → resumes with reps intact; Home shows the real
total. (Mic capture can't be exercised in a headless browser — verify on a real
device; "Hear your take" plays/pauses the saved take.)

## Adding audio — steps · lessons · languages (guide)

How to wire new clips so the app picks them up. The **step key in
`src/data/content.ts` is the source of truth** — a filename is only a label.
The five step keys (from `src/tokens.ts`): `GRASP`, `HUM`, `SHADOW`, `READ`, `RECALL`.

### Add a clip to a step
1. Put the mp3 in `public/audio/<lang>/` (Vite serves `public/` at the site root,
   so the URL is `/audio/<lang>/<file>`). Source drops often arrive as `.mp3.mpeg` —
   they are plain MP3s, just copy/rename and name by the step it belongs to:
   `cp "audio-files/de/<whatever>.mp3.mpeg" public/audio/de/ISL001-HUM.mp3`
2. In `content.ts`, set that step's URL on the lesson's `audio` map:
   `audio: { …, HUM: '/audio/de/ISL001-HUM.mp3' }`
3. Refresh. That step becomes a gated, point-earning, mic-recording step. A step
   with **no** key is an "AUDIO COMING SOON" pass-through (still reachable via Next).

> **"Exactly mapped" files:** assign each file to its real step by putting its URL
> under that step's key. The current ISL001 `GRASP`/`HUM`/`SHADOW` URLs are
> placeholders — their files are still named by the source method (`GRASP`/`MIMIC`/
> `EXPRESS`) and `MIMIC`→HUM, `EXPRESS`→SHADOW. When the exact-mapped clips arrive,
> drop them in, name them by step, and overwrite these URLs.

### Add a new lesson (same language)
Append a `PracticeLesson` to `PRACTICE_LESSONS` in `content.ts`:
```ts
{ code: 'ISL002', title: 'Lektion 2', language: 'GERMAN',
  audio: { GRASP: '/audio/de/ISL002-GRASP.mp3', /* … */ }, pointsPerStep: 10 }
```
It auto-appears on the Lessons screen for German learners; put its clips in
`public/audio/de/`.

### Add a new language (+ learner)
1. Add (or confirm) a user with that language in `src/data/mock.ts` `USERS` — the
   `language` string must match **exactly, uppercase** (e.g. `'SPANISH'`). The Entry
   roster reads from here (mock) until Supabase.
2. Add `PracticeLesson`(s) with `language: 'SPANISH'` to `content.ts`.
3. Put clips in `public/audio/es/…`.
4. That learner now sees those lessons (Entry → Lessons → Practice). A language with
   no lessons shows an empty state.

Audio is **language-scoped, not per-user** for now (per-user/personalised audio
comes with the Supabase path). Points: `pointsPerStep` per lesson (default 10);
lesson total = (#steps with a clip) × `pointsPerStep`.

### Where it's read / when Supabase lands
`lessonsForLanguage(language)` (content.ts) feeds Lessons + Home; `getPracticeLesson(code)`
resolves the tapped lesson in Practice. When the backend lands, swap `content.ts` for
fetches (lessons + audio URLs), move `public/audio/` to Supabase Storage, and upload
the IndexedDB recordings — the step-keyed `audio` shape stays identical, so screens
don't change. (Note: clips are committed under `public/audio/` for now, ~21 MB; this
moves to Storage later.)

## Not yet done (deferred milestones)

Stripe subscription + a real auth gate (name-select is NOT auth); auto-scoring of
pronunciation/melody; **Supabase for this path** — uploading the IndexedDB recordings
and syncing reps/progress to the backend (currently 100% local; content is bundled,
not fetched); the remaining DE step clips (HUM, READ) and other languages/users;
the per-lesson 10-sentence CSV shown only in READ (schema + `import-sentences.ts`
exist, not wired into the player yet); not-yet-designed screens (milestone ladder,
plan, tools, My Setup, passport, maintenance, onboarding).

## How to run

```bash
npm install
npm run dev          # http://localhost:5173 — runs on mock data, no backend needed
```

To use live data: run `supabase/schema.sql`, load a lesson via the scripts,
`cp .env.example .env.local` and fill URL + anon key, set `VITE_USE_SUPABASE=true`.

## Gotchas / environment notes

- **Secrets:** the anon key is safe client-side (RLS). The **service-role** key
  goes only in `scripts/.env` (gitignored), never in the frontend. `.env.local`
  is gitignored; `.env.example` is the template.
- **Remote-session caveats seen during the build:** the managed commit signer was
  failing (commits made with signing disabled); the Supabase host was not in the
  network egress allowlist (couldn't hit it from the container); and this session
  had no GitHub push credentials (pushed via a user-supplied token). On a normal
  machine none of these apply.
- Hosted in GitHub repo `matejkms-ux/lma-app-v2` (branch `main`).
