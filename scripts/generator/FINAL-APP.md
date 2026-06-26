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

### 2. Render the conversation prompt audios (host / LC voice)
`final-prompts.py` is generic — pass a UTF-8 file of prompts (one per line, in the
target language), the host / Language-Companion voice, and the language. It renders
one short mp3 per prompt and uploads them. Use the **same host voice** as the podcast.

```bash
cd scripts/generator
python3 final-prompts.py \
  --prompts <adventurer>-convo-prompts.txt \
  --scope <USERNAME> --lang <es|ja|th|km|de|it|…> \
  --voice <host_elevenlabs_voice_id> \
  --object-prefix <USERNAME>-conversation --upload
```
Writes `<USERNAME>-conversation-prompts.json` with `[{n,text,audioUrl}]` — paste
those into the record's `conversation.prompts`.

### 3. Add the FinalProgram record
In `src/data/finalContent.ts`, add an entry to `FINAL_PROGRAMS` keyed by the
scope. Copy Neal's block and fill:
- `language`, `locale` (target-language locale, e.g. `ja-JP`), `scriptType`
  (`latin | cjk | thai | khmer` — drives transliteration display in the reader).
- `essay`: title, subtitle, and `pages[]` (one section per page). For non-Latin
  languages, add a parallel `translit: string[]` to a page (one entry per
  paragraph) and the reader shows it under each paragraph automatically.
- `podcast`: title/subtitle, `hostVoiceId`/`learnerVoiceId`, and paste
  `audioUrl` + `checks` straight from the render's `*-podcast-checks.json`.
  (Bump a `?v=N` on the URL when you re-render the same object, to bust the CDN cache.)
- `writing`: 2–4 open `prompts[]` (`{ prompt, helper?, minWords }`) drawn from the
  adventurer's life-story themes, in the target language. **Human-judged only —
  never auto-scored.** On submit, every answer is saved to the Supabase
  `final_writing_submissions` table for the Language Guide to review.
- `conversation`: `title`/`intro` + `prompts[]` of `{ text, audioUrl }` (paste the
  audioUrls from step 2). Each recorded answer is **auto-scored** by the Azure
  pronunciation pipeline in `locale` (pronunciation + fluency, *not* meaning — the
  only auto-scored Final module). Locales Azure can't assess (Thai/Khmer) fall back
  to a self-rating automatically.
- `session`: `sessionId` (the room key — join route `/session/<sessionId>`, Zoom
  topic `lma-<sessionId>`), optional `scheduledAt` (ISO timestamp) + `durationMin`.
  The live room uses the Zoom Video SDK. **Final Session stays LOCKED** until the
  four prep modules (read, podcast, writing, conversation) are done.

### 4. Done
The learner now sees the Final App (Hub CTA + Activities entry) and all five
modules work. No code change, no rebuild logic — just the data + the audio files.

> - Progress is local (`src/lib/finalProgress.ts`, localStorage keyed by user+scope);
>   writing submissions also persist to Supabase for guide review.
> - Conversation auto-scoring needs `AZURE_SPEECH_KEY` / `AZURE_SPEECH_REGION` in the
>   Netlify env (already set in prod) and runs on the deployed HTTPS site (mic capture
>   needs a secure context).
> - Scheduling is **data-driven** (`session.scheduledAt`); a real per-learner booking
>   layer (DB table + invites) is deferred — add it when more than the pilot needs it.
