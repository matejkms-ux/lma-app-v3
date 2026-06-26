#!/usr/bin/env python3
"""
LMA Final Podcast renderer — GENERIC, per-adventurer.
=====================================================
Turns a two-voice interview script (.docx) into one mp3 + a checkpoint manifest,
then (optionally) uploads it to the public lesson-audio bucket. Reusable for ANY
adventurer / language: pass the script, the two voices, the speaker labels, and
the language. Nothing here is wired to a specific learner.

The script may contain inline comprehension markers:
    ◉ CHECK k/N — <question>
Each marker records the AUDIO TIMESTAMP reached at that point + its question, so
the player can pause exactly there. Stage directions [..], segment headers
("Title (m:mm – m:mm)") and the meta header lines are skipped.

Usage:
  export ELEVENLABS_API_KEY=... (or rely on scripts/generator/.env)
  python3 final-podcast.py \
      --script "/path/Version 2 - Neal Podcast.docx" \
      --scope NEALG2603-es --lang es \
      --host-label "ANA SOFÍA" --host-voice ewn5JTa3lNPY8QVuZJi6 \
      --learner-label NEAL     --learner-voice cIBxLwfshLYhRB9lCXEg \
      --object NEALG2603-es-podcast/cuatro-movimientos.mp3 --upload

Writes <scope>-podcast-checks.json: { durationSec, audioUrl, checks:[{n,timeSec,question}] }.
ElevenLabs eleven_v3, plain text (no accent tag — avoids the artefact). Voices are
the caller's choice; for non-Latin target languages (ja/zh/th/km) pass voices that
speak that language — the model reads the native script directly.
"""
import os, io, re, sys, json, time, zipfile, argparse
from urllib.parse import quote
import requests
from pydub import AudioSegment

HERE = os.path.dirname(os.path.abspath(__file__))

def env_from(path, key):
    try:
        for line in open(path):
            if line.strip().startswith(key + "="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    except FileNotFoundError:
        pass
    return ""

def docx_paragraphs(path):
    xml = zipfile.ZipFile(path).read("word/document.xml").decode("utf-8", "ignore")
    out = []
    for p in re.split(r"</w:p>", xml):
        t = "".join(re.findall(r"<w:t[^>]*>(.*?)</w:t>", p, re.S))
        for a, b in [("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"), ("&#8217;", "’"),
                     ("&#8220;", "“"), ("&#8221;", "”"), ("&#8230;", "…"),
                     ("&#8211;", "–"), ("&#8212;", "—")]:
            t = t.replace(a, b)
        out.append(t.strip())
    return out

CHECK_RE = re.compile(r"^◉?\s*CHECK\s+(\d+)\s*/\s*(\d+)\s*[—–-]\s*(.+)$")
SEG_RE = re.compile(r"\(\d+:\d{2}\s*[–-]\s*\d+:\d{2}\)\s*$")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--script", required=True)
    ap.add_argument("--scope", required=True)
    ap.add_argument("--lang", default="es", help="target-language code (es/ja/th/km/de/it/…)")
    ap.add_argument("--host-label", required=True)
    ap.add_argument("--host-voice", required=True)
    ap.add_argument("--learner-label", required=True)
    ap.add_argument("--learner-voice", required=True)
    ap.add_argument("--object", required=True, help="storage object path under lesson-audio/")
    ap.add_argument("--model", default="eleven_v3")
    ap.add_argument("--upload", action="store_true")
    args = ap.parse_args()

    elk = os.environ.get("ELEVENLABS_API_KEY") or env_from(os.path.join(HERE, ".env"), "ELEVENLABS_API_KEY")
    assert elk, "ELEVENLABS_API_KEY missing"
    appenv = "/Users/matejsedmak/Claude/Projects/lma-app-v3/.env.local"
    su = env_from(appenv, "VITE_SUPABASE_URL").rstrip("/")
    ak = env_from(appenv, "VITE_SUPABASE_ANON_KEY")

    voice = {args.host_label: args.host_voice, args.learner_label: args.learner_voice}
    label_re = re.compile(r"^(%s)\s*:\s*(.+)$" % "|".join(re.escape(l) for l in voice))

    paras = docx_paragraphs(args.script)
    # Build an ordered program of ("say", speaker, text) and ("check", n, question).
    program, checks_meta = [], 0
    for t in paras:
        if not t:
            continue
        mc = CHECK_RE.match(t)
        if mc:
            program.append(("check", int(mc.group(1)), mc.group(3).strip()))
            checks_meta = max(checks_meta, int(mc.group(2)))
            continue
        if t.startswith("[") or SEG_RE.search(t):
            continue  # stage direction / segment header
        ms = label_re.match(t)
        if ms:
            program.append(("say", ms.group(1), ms.group(2).strip()))
    turns = sum(1 for x in program if x[0] == "say")
    nchecks = sum(1 for x in program if x[0] == "check")
    print(f"Parsed {turns} turns, {nchecks} checks (declared /{checks_meta})", flush=True)
    assert turns >= 10 and nchecks >= 1, "parse sanity failed"

    def tts(text, vid):
        for attempt in range(4):
            r = requests.post(f"https://api.elevenlabs.io/v1/text-to-speech/{vid}",
                headers={"xi-api-key": elk, "Content-Type": "application/json"},
                json={"text": text, "model_id": args.model,
                      "voice_settings": {"stability": 0.5, "similarity_boost": 0.75, "speed": 1.0}},
                timeout=180)
            if r.status_code == 200:
                return AudioSegment.from_file(io.BytesIO(r.content), format="mp3")
            if r.status_code in (429, 500, 502, 503) and attempt < 3:
                time.sleep(2 ** attempt); continue
            sys.exit(f"ElevenLabs {r.status_code}: {r.text[:200]}")

    sil_same = AudioSegment.silent(duration=300)
    sil_turn = AudioSegment.silent(duration=620)
    audio = AudioSegment.silent(duration=400)
    checks, prev, done = [], None, 0
    for item in program:
        if item[0] == "check":
            checks.append({"n": item[1], "timeSec": round(len(audio) / 1000.0, 2), "question": item[2]})
            continue
        _, spk, text = item
        seg = tts(text, voice[spk])
        if prev is not None:
            audio += sil_turn if spk != prev else sil_same
        audio += seg
        prev = spk
        done += 1
        if done % 10 == 0:
            print(f"  rendered {done}/{turns} turns, {len(audio)/1000:.0f}s", flush=True)
    audio += AudioSegment.silent(duration=700)

    local = os.path.join(HERE, f"_final_{args.scope}.mp3")
    audio.export(local, format="mp3", bitrate="128k")
    dur = round(len(audio) / 1000.0, 1)
    public_url = f"{su}/storage/v1/object/public/lesson-audio/{quote(args.object)}" if su else ""
    manifest = {"scope": args.scope, "lang": args.lang, "durationSec": dur,
                "audioUrl": public_url, "checks": checks}
    open(os.path.join(HERE, f"{args.scope}-podcast-checks.json"), "w").write(
        json.dumps(manifest, ensure_ascii=False, indent=2))
    print(f"DURATION_SECONDS={dur}")
    print("CHECKS=" + json.dumps(checks, ensure_ascii=False))

    if args.upload:
        assert su and ak, "supabase creds missing for --upload"
        with open(local, "rb") as fh:
            up = requests.post(f"{su}/storage/v1/object/lesson-audio/{quote(args.object)}",
                headers={"apikey": ak, "Authorization": f"Bearer {ak}",
                         "Content-Type": "audio/mpeg", "x-upsert": "true",
                         "cache-control": "max-age=3600"},
                data=fh.read(), timeout=300)
        print("UPLOAD", up.status_code, "OK" if up.status_code in (200, 201) else up.text[:160])
        print("PUBLIC_URL=" + public_url)

if __name__ == "__main__":
    main()
