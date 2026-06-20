# Session summary

A record of what was asked and done while turning the LMA Practice Player design
handoff into a working app. Most recent session date: 2026-06-18.

## What you asked for (key points)

1. **Review the HTML prototype** before going further — delivered the standalone
   `prototype/index.html` (all 10 screens, no install).
2. **Wire up Supabase** with your project credentials (URL + anon key).
3. **Push the work to GitHub**, specifically into **`matejkms-ux/lma-app-v2`** as
   the **`main`** branch, as **the main project**.
4. **Confirm the files (src, package.json, etc.) are actually visible** in the repo.
5. **Run the dev server** so you could see the app in a browser (localhost URL).
6. **Push everything upstream so another person can take over** — including a
   project **README** and a **CLAUDE.md** describing what's been done.
7. **This summary**, as a markdown file in the repo.

## What was built

- **React 18 + TypeScript + Vite** app implementing all 10 designed screens
  (Entry, Home, Practice player, Lesson select, Lesson overview, Activities,
  plus shared components).
- The five-step practice engine — **GRASP → HUM → SHADOW → READ → RECALL** —
  with reps counting and the step gate (`src/practice/`).
- Design-token system (`src/tokens.ts`) feeding Tailwind; calm near-black + coral
  visual language.
- **Supabase integration (read path):** `src/lib/supabase.ts` (anon client +
  `useSupabase` switch), `src/data/api.ts` (Supabase-or-mock with fallback),
  wired into Entry / Lessons / Overview. Defaults to mock so the UI always renders.
- **Database schema** with RLS: `supabase/schema.sql`
  (users, lessons, sentences, step_progress, reps).
- **Content scripts** (`scripts/`): `import-sentences.ts` (CSV → sentences) and
  `upload-audio.ts` (MP3s → Storage + linked URLs). See `scripts/README.md`.
- Handoff docs: `README.md`, `CLAUDE.md`, `PROJECT.md`, and this file.
- `npm run build` and `npm run typecheck` pass clean.

## Outcomes / current state

- **Code is live** on `matejkms-ux/lma-app-v2`, branch `main` (force-pushed over
  the README-only main, since you wanted this as the main project). Verified via
  the GitHub API that `src/`, `scripts/`, `supabase/`, `package.json`, etc. are
  visible.
- **Dev server** boots clean (Vite, HTTP 200) and runs on mock data with no
  backend. It can't be served as *your* localhost from the remote container — run
  it on your machine: `npm install && npm run dev` → http://localhost:5173.
- **Docs commit** (README + CLAUDE.md + this summary) is signed and ready, pending
  a push (see below).

## Decisions made

- This React build is **the main project** in `lma-app-v2` (replaced the prior
  README-only `main`).
- Mock data is the default (`VITE_USE_SUPABASE=false`) so the app always renders;
  flip to live after running the schema + content scripts.
- Name-select is **not** authentication — a real auth/payment gate is deferred.

## Deferred (later milestones)

Stripe subscription + real auth gate; auto-scoring of pronunciation/melody;
persisting reps & step-progress back to Supabase (write path); the not-yet-designed
screens (milestone ladder, plan, tools, My Setup, passport, maintenance, onboarding).

## Environment notes worth knowing

- **Secrets:** anon key is safe client-side (RLS); the service-role key lives only
  in `scripts/.env` (gitignored). `.env.local` is gitignored; `.env.example` is the
  template. `.env.local` was intentionally **not** pushed.
- **Remote-session frictions encountered:** the managed commit signer was briefly
  erroring (some commits were made unsigned, then re-signed once it recovered);
  the Supabase host wasn't in the container's network egress allowlist; and this
  session had no GitHub push credentials, so pushes used a short-lived user-supplied
  fine-grained token (revoked afterward). None of these apply on a normal machine.
