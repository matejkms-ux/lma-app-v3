# LMA Final App — how to add an adventurer

The Final App (Read · Podcast · Writing · Conversation · Session) is **fully
per-adventurer and language-generic**. Adding a new adventurer is a **data + audio**
operation — you never touch a screen. Neal (Spanish) is the working reference.

The whole content layer is one record per learner in
[`src/data/finalContent.ts`](../../src/data/finalContent.ts), keyed by the learner's
**lesson-code scope** (= `user.username`, e.g. `NEALG2603-es`). The screens
(`FinalHubScreen`, `FinalReadingScreen`, `PodcastScreen`, `FinalWritingScreen`,
`FinalConversationScreen`, `FinalSessionScreen`) render whatever that record holds.

## Prerequisite
The adventurer must already have their **life-story narration** written (the same
artefact the program test produces). From it you derive the essay and the podcast
script. Do not generate generic filler.

## Steps

### 1. Render the podcast (any language, two voices)
`final-podcast.py` is generic — pass the script, the two voices, the speaker
labels, and the language. It parses speaker turns **and** inline check markers and
emits exact checkpoint timestamps + questions.

Script format (.docx):
- Two speakers, one per paragraph: `HOST LABEL: …` and `LEARNER LABEL: …`.
- Inline comprehension markers, placed where the check should fire:
  `◉ CHECK k/N — <question in the target language>`
- Stage directions `[...]` and segment headers `Title (m:mm – m:mm)` are ignored.

Pick the voices (ElevenLabs `/v1/voices`): a **host** voice and the learner's own
voice — both must speak the target language. For non-Latin targets (ja/zh/th/km)
the voices read the native script directly; no transliteration needed for audio.

```bash
cd scripts/generator
python3 final-podcast.py \
  --script "/path/<Adventurer> Podcast.docx" \
  --scope <USERNAME> --lang <es|ja|th|km|de|it|…> \
  --host-label "HOST" --host-voice <elevenlabs_voice_id> \
  --learner-label "LEARNER" --learner-voice <elevenlabs_voice_id> \
  --object <USERNAME>-podcast/<slug>.mp3 --upload
```
This uploads the mp3 to the public `lesson-audio` bucket (anon key from
`../../.env.local`) and writes `<USERNAME>-podcast-checks.json` with
`{ durationSec, audioUrl, checks:[{n,timeSec,question}] }`.

### 2. Add the FinalProgram record
In `src/data/finalContent.ts`, add an entry to `FINAL_PROGRAMS` keyed by the
scope. Copy Neal's block and fill:
- `language`, `locale` (target-language locale, e.g. `ja-JP`), `scriptType`
  (`latin | cjk | thai | khmer` — drives transliteration display in the reader).
- `essay`: title, subtitle, and `pages[]` (one section per page). For non-Latin
  languages, add a parallel `translit: string[]` to a page (one entry per
  paragraph) and the reader shows it under each paragraph automatically.
- `podcast`: title/subtitle, `hostVoiceId`/`learnerVoiceId`, and paste
  `audioUrl` + `checks` straight from the render's `*-podcast-checks.json`.
- `writing`, `conversation`, `session`: prompts in the target language.

### 3. Done
The learner now sees the Final App (Hub CTA + Activities entry) and all five
modules work. No code change, no rebuild logic — just the data + the audio file.

> Progress is local (`src/lib/finalProgress.ts`, localStorage keyed by user+scope),
> consistent with the rest of the app's local-first path.
