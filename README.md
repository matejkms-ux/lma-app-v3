# LMA Practice Player

A mobile-first language-practice app built on the LMA method: every sentence is
drilled through five sequential steps — **GRASP → HUM → SHADOW → READ → RECALL** —
and progress is measured in **reps**. The UI is deliberately calm: one coral accent
on a near-black canvas, large type, minimal chrome, one thing moving at a time.

> Built from a Claude Design handoff. The original design intent lives in
> [`chats/`](chats/) (the design conversation) and the HTML prototype in
> [`prototype/`](prototype/). Architecture/decision notes are in
> [`PROJECT.md`](PROJECT.md). **Start with this file**, then `PROJECT.md`.

## Quick start

Requires **Node 18+**.

```bash
npm install
npm run dev          # http://localhost:5173
```

The app runs immediately on **bundled mock data** — no backend needed to see all
ten screens. Other scripts:

```bash
npm run build        # type-check (tsc) + production build to dist/
npm run typecheck    # types only
npm run preview      # serve the production build
```

## Tech stack

- **React 18 + TypeScript + Vite**
- **Tailwind CSS**, driven by design tokens in `src/tokens.ts` (single source of
  truth for colour/type/spacing; `tailwind.config.js` reads from it)
- **React Router** for screen navigation
- **Supabase** (`@supabase/supabase-js`) for data — wired, with mock fallback

## Project structure

```
src/
  tokens.ts            # design tokens (colour/type/spacing)
  session.tsx          # who's "in" (name-select; stand-in for auth)
  lib/
    supabase.ts        # browser client (anon key); useSupabase switch
    useAsync.ts        # mount-fetch hook with fallback seed
  data/
    mock.ts            # users, lessons, sentences, metrics
    api.ts             # the data layer screens read from: Supabase-or-mock
  practice/
    steps.ts           # declarative per-step config
    usePractice.ts     # the reps + gate engine (no UI)
  components/          # DeviceFrame, BottomNav, AudioPlayer, StepIndicator,
                       # Gate/Stars, Waveform, MicIndicator, RevealToggle, …
  screens/             # one per screen (Entry, Home, Practice, Lessons,
                       # Overview, Activities)
supabase/schema.sql    # tables for the brief entities + RLS
scripts/               # CSV import + audio upload (see scripts/README.md)
prototype/index.html   # the original standalone HTML prototype (all 10 screens)
```

Logic is kept out of presentation: the practice engine (`usePractice.ts`) and the
data layer (`data/api.ts`) hold the behaviour; screens are thin compositions.

## Data: mock now, Supabase when ready

`src/data/api.ts` is the **single place screens fetch from**. It returns live
Supabase rows when `VITE_USE_SUPABASE=true` **and** tables are populated; otherwise
it falls back to bundled mock data, so the UI always renders. Entry (roster),
Lesson select, and Lesson overview already call it.

To go live:

1. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor.
2. Load a lesson with the scripts (see [`scripts/README.md`](scripts/README.md)).
3. Configure env and flip the switch:
   ```bash
   cp .env.example .env.local      # fill in URL + anon key
   # set VITE_USE_SUPABASE=true
   npm run dev
   ```

> The **anon** key is safe in client code (RLS-governed). The **service-role** key
> belongs only in `scripts/.env` (gitignored) and must never reach the browser.
> Name-select is **not** auth — gate payments/credentials behind a stronger step
> before exposing sensitive tables.

## Content loading

Two scripts feed live lessons (run from a machine with the service-role key):

```bash
npm run import:sentences -- --lesson LMPI-003 --file ./LMPI-003.csv
npm run upload:audio     -- --lesson LMPI-003 --dir ./audio/LMPI-003
```

Full instructions, CSV format, and MP3 naming in [`scripts/README.md`](scripts/README.md).

## Status

**Built:** all 10 designed screens; the five-step practice engine + reps/gate;
design-token system; Supabase client + schema + RLS; the data layer (read path)
with mock fallback; the CSV-import and audio-upload scripts.

**Deferred (later milestones):** Stripe subscription + a real auth gate;
auto-scoring of pronunciation/melody; persisting reps & step-progress back to
Supabase (write path); the not-yet-designed screens (milestone ladder, plan,
tools, My Setup, passport, maintenance, onboarding).
