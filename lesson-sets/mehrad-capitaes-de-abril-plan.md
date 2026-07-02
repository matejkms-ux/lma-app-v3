# Mehrad · *Capitães de Abril* — 12-lesson Portuguese film arc

Learner: **Mehrad** (`MEHRAD2606-pt`, European Portuguese / pt-PT)
Film: **Capitães de Abril / April Captains** (2000, Maria de Medeiros) — the Carnation Revolution, 25 April 1974. Runtime ≈124 min → 12 lessons (~10-min segments).

## Method (watch → lesson → re-watch)

For each segment:
1. **Watch** the ~10-min segment on his **own access** (his Netflix / a DVD / an official source).
2. **Do the lesson** in the app — the 10-sentence drill for that segment (GRASP→…→FREESTYLE), plus the context note + key vocab below.
3. **Re-watch** the same segment — now with comprehension unlocked.

First-watch = gist & immersion · lesson = targeted language · second watch = consolidation. Repeated narrow viewing is the point.

## Legal note (why this is clean)

The **app never serves the film.** Mehrad supplies his own playback; the app only holds our original teaching material (sentences, TTS audio, context, a still or two per segment). Funding his access is fine — give him his **own** subscription / a gift card / a Netflix paid "extra member" or reimburse his own, rather than sharing a password (that breaches Netflix's terms). **Verify the film is on Netflix in his region first** (JustWatch); if not, the DVD or an official source is the access path.

## Segment map

> Timestamps are **approximate** — calibrate to the actual cut as you watch. Lesson titles in the app are **"N.1 — <PT segment name>"** (retitled 2026-07-01; the validator requires the `N.v` title prefix, and the bare "Lesson N" titles failed `TITLE_PREFIX_MISMATCH`). The segment map below is the source of those titles.

| # | ≈Time | Segment (PT · EN) | Beat | CSV |
|---|-------|-------------------|------|-----|
| 001 | 0:00–0:10 | A história num fôlego · The story in one breath | Overview — pre-teaches the arc's key words | `mehrad-pt-001.csv` |
| 002 | 0:10–0:20 | O plano no quartel · The plan in the barracks | MFA officers meet; Capt. Salgueiro Maia lays out the plan | `mehrad-pt-002.csv` |
| 003 | 0:20–0:30 | O sinal na rádio · The signal on the radio | The radio songs ("Grândola"); columns mobilise at midnight | `mehrad-pt-003.csv` |
| 004 | 0:30–0:40 | A marcha noturna · The night march | The column rolls from Santarém toward Lisbon | `mehrad-pt-004.csv` |
| 005 | 0:40–0:50 | A chegada a Lisboa · Reaching Lisbon | Troops take the Terreiro do Paço by the river | `mehrad-pt-005.csv` |
| 006 | 0:50–1:00 | O confronto · The standoff | Loyalist tank ordered to fire on Maia's men — refuses | `mehrad-pt-006.csv` |
| 007 | 1:00–1:10 | O povo nas ruas · The people in the streets | Despite radio warnings, crowds pour out | `mehrad-pt-007.csv` |
| 008 | 1:10–1:20 | Os cravos · The carnations | Flowers placed in the gun barrels — the revolution's image | `mehrad-pt-008.csv` |
| 009 | 1:20–1:30 | O cerco do Carmo · The siege of Carmo | Caetano takes refuge in the Carmo barracks; siege begins | `mehrad-pt-009.csv` |
| 010 | 1:30–1:40 | O ultimato · The ultimatum | Maia demands surrender; tense negotiation | `mehrad-pt-010.csv` |
| 011 | 1:40–1:50 | A queda do regime · The fall of the regime | Caetano hands power to Spínola; shots at PIDE HQ (the day's only deaths) | `mehrad-pt-011.csv` |
| 012 | 1:50–2:04 | A liberdade · Freedom | Political prisoners freed; jubilation; democracy dawns | `mehrad-pt-012.csv` |

## Key vocabulary spine (recurs across segments)

Abril · soldado · capitão · quartel · ordem · rádio · canção · sinal · coluna · cidade · tanque · disparar / tiro · recusar · povo · multidão · praça · cravo · espingarda · liberdade · ditadura · governo · render-se · revolução · democracia.

## Level

Sentences sit around **A1–A2**: present tense, short concrete clauses, with the film's topical nouns (ditadura, espingarda, cravo…) carried by the audio + context. Tune up/down per how Mehrad handles segment 1.

## Build status / how to ship

- ✅ Portuguese wired across the app + generator + land script (`pt` → PORTUGUESE / pt-PT).
- ✅ Mehrad in the roster (`u7` / `MEHRAD2606-pt`, live DB + mock).
- ✅ All 12 sentence CSVs drafted (`lesson-sets/mehrad-pt-001.csv` … `-012.csv`).
- ⛔ **One blocker before audio:** a European-Portuguese ElevenLabs voice ID in `VOICE_MAP["pt"]` (currently `REPLACE_ME_PT`).

Then, **per lesson** (001…012): run the "Generate lesson" Action (csv `lesson-sets/mehrad-pt-00N.csv`, app_username `MEHRAD2606-pt`, nnn `00N`) → `npm run validate -- MEHRAD2606`.

> **Do not land a lesson until its audio exists** — a no-audio lesson hard-locks the lessons after it in the learner's catalog. Generate audio and land each lesson together.
