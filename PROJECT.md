# LMA Practice Player — frontend

A premium language-acquisition practice companion for enrolled adventurers.
This is the **frontend, on mock data** — the first build pass against the v3
Engineering Build Brief. React + TypeScript + Vite + Tailwind, mobile-first.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
npm run typecheck  # types only
```

## What's here (this pass)

All ten designed screens, faithful to `project/LMA Practice Player.dc.html`:

| Route          | Screen                  | Ground  |
| -------------- | ----------------------- | ------- |
| `/`            | Entry — name select     | Emerald |
| `/home`        | Home — the adventure    | Cream   |
| `/lessons`     | Lesson select           | Cream   |
| `/practice`    | The five steps          | Emerald |
| `/overview`    | Lesson overview & grades| Cream   |
| `/activities`  | Activities — long view  | Cream   |

The practice player runs all five steps on one chassis — **GRASP → HUM →
SHADOW → READ → RECALL** — with the method invariants held:

- GRASP / HUM / SHADOW are **audio only** (ears before eyes); no text shown.
- READ is where text first appears, with **tap-to-open** transliteration and
  translation folds (per the user note + Matej's comment).
- RECALL plays a cue only; the model L2 stays blurred until **Reveal**.
- Forward-only player; **coral** is the one live signal and the only thing that
  moves (live mic, recording, +N today, active dot).
- The **reps + gate** loop with the three-reps fallback path: one 4★ take passes,
  otherwise three reps clear it. Stars are tappable; the gate updates live.

A small dev control at the bottom of `/practice` lets you walk all five steps on
one device — the real flow advances on a cleared gate.

## Architecture (logic separate from presentation — brief §1)

```
src/
  tokens.ts            # single source of truth for colour/type/spacing
  tailwind.config.js   # reads tokens.ts
  session.tsx          # who's "in" (name-select; stand-in for Supabase auth)
  lib/
    supabase.ts        # browser client (anon key); useSupabase master switch
    useAsync.ts        # tiny mount-fetch hook with fallback seed
  data/
    mock.ts            # users, sentences, lessons, metrics (mirror brief §6 shapes)
    api.ts             # the data layer screens read from: Supabase-or-mock
  practice/
    steps.ts           # declarative per-step config
    usePractice.ts     # the reps + gate engine (no UI)
  components/          # DeviceFrame, StatusBar, BottomNav, AudioPlayer,
                       # StepIndicator, Gate/Stars, Waveform, MicIndicator, RevealToggle
  screens/             # thin compositions, one per screen
supabase/schema.sql    # tables for the brief §6 entities + RLS
scripts/               # CSV import + audio upload (brief §10); see scripts/README.md
```

## Supabase (wired, mock-fallback)

The client reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from `.env.local`
(copy from `.env.example`). The data layer (`src/data/api.ts`) is the single
place screens fetch from — Entry, Lesson select and Lesson overview already call
it; it returns live rows when `VITE_USE_SUPABASE=true` **and** tables are
populated, otherwise it falls back to the bundled mock so the UI always renders.

To go live:

1. Run `supabase/schema.sql` in the Supabase SQL editor.
2. Load a lesson with the two scripts (`scripts/README.md`).
3. Set `VITE_USE_SUPABASE=true` in `.env.local` and restart `npm run dev`.

> The anon key is safe in client code (RLS-governed). The **service-role** key
> lives only in `scripts/.env` (gitignored) and never reaches the browser.
> Name-select is not auth — gate payments/credentials behind a stronger step
> (brief §4) before exposing sensitive tables.

## Deferred (per your scope call — frontend + mock data first)

Not in this pass; the brief's later milestones:

- **Stripe** — the $147/mo subscription (and a stronger gate in front of payment;
  name-select is not auth, brief §4).
- **Auto-scoring** — pronunciation (SHADOW/READ/RECALL) and melody (HUM) via a
  speech API. The three-reps path is built first by design, exactly as §3 asks.
- **Live writes** — recording reps and step-progress back to Supabase (read path
  is wired; writes follow once the practice loop persists).
- **Not-yet-designed screens** — milestone ladder, plan, tools, My Setup,
  passport, maintenance, onboarding. They'll build to the same token system.

Done this pass: Supabase client + schema + RLS, the data layer with mock
fallback (read path), and the CSV-import + audio-upload scripts (§10).

The original Claude Design export is preserved under `project/`, and the
interactive single-file HTML prototype under `prototype/`.
