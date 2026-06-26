#!/usr/bin/env python3
"""
LMA Final Conversation prompt renderer — GENERIC, per-adventurer.
=================================================================
Renders each conversation question-prompt (one short line of target-language
text) to its own mp3 in the host / Language-Companion voice, then (optionally)
uploads them to the public lesson-audio bucket. Reusable for ANY adventurer /
language: pass the prompts file, the voice, and the language. Nothing here is
wired to a specific learner.

Usage:
  export ELEVENLABS_API_KEY=... (or rely on scripts/generator/.env)
  python3 final-prompts.py \
      --prompts neal-convo-prompts.txt \
      --scope NEALG2603-es --lang es \
      --voice ewn5JTa3lNPY8QVuZJi6 \
      --object-prefix NEALG2603-es-conversation --upload

`--prompts` is a UTF-8 text file, one prompt per non-empty line, in order.
Writes <scope>-conversation-prompts.json: [{ n, text, audioUrl }]. For non-Latin
targets (ja/zh/th/km) pass a voice that speaks that language — the model reads the
native script directly, consistent with the lesson pipeline.
"""
import os, io, re, sys, json, time, argparse
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--prompts", required=True, help="UTF-8 file, one prompt per line")
    ap.add_argument("--scope", required=True)
    ap.add_argument("--lang", default="es")
    ap.add_argument("--voice", required=True, help="host / Language-Companion voice id")
    ap.add_argument("--object-prefix", required=True, help="storage folder under lesson-audio/, e.g. <scope>-conversation")
    ap.add_argument("--model", default="eleven_v3")
    ap.add_argument("--upload", action="store_true")
    args = ap.parse_args()

    elk = os.environ.get("ELEVENLABS_API_KEY") or env_from(os.path.join(HERE, ".env"), "ELEVENLABS_API_KEY")
    assert elk, "ELEVENLABS_API_KEY missing"
    appenv = "/Users/matejsedmak/Claude/Projects/lma-app-v3/.env.local"
    su = env_from(appenv, "VITE_SUPABASE_URL").rstrip("/")
    ak = env_from(appenv, "VITE_SUPABASE_ANON_KEY")

    prompts = [ln.strip() for ln in open(args.prompts, encoding="utf-8") if ln.strip()]
    assert prompts, "no prompts found"
    print(f"Rendering {len(prompts)} prompts (lang={args.lang}, voice={args.voice})", flush=True)

    def tts(text):
        for attempt in range(4):
            r = requests.post(f"https://api.elevenlabs.io/v1/text-to-speech/{args.voice}",
                headers={"xi-api-key": elk, "Content-Type": "application/json"},
                json={"text": text, "model_id": args.model,
                      "voice_settings": {"stability": 0.5, "similarity_boost": 0.75, "speed": 1.0}},
                timeout=180)
            if r.status_code == 200:
                return AudioSegment.from_file(io.BytesIO(r.content), format="mp3")
            if r.status_code in (429, 500, 502, 503) and attempt < 3:
                time.sleep(2 ** attempt); continue
            sys.exit(f"ElevenLabs {r.status_code}: {r.text[:200]}")

    manifest = []
    for i, text in enumerate(prompts, start=1):
        seg = AudioSegment.silent(duration=250) + tts(text) + AudioSegment.silent(duration=300)
        obj = f"{args.object_prefix}/q{i}.mp3"
        local = os.path.join(HERE, f"_final_{args.scope}_q{i}.mp3")
        seg.export(local, format="mp3", bitrate="128k")
        public_url = f"{su}/storage/v1/object/public/lesson-audio/{quote(obj)}" if su else ""
        if args.upload:
            assert su and ak, "supabase creds missing for --upload"
            with open(local, "rb") as fh:
                up = requests.post(f"{su}/storage/v1/object/lesson-audio/{quote(obj)}",
                    headers={"apikey": ak, "Authorization": f"Bearer {ak}",
                             "Content-Type": "audio/mpeg", "x-upsert": "true",
                             "cache-control": "max-age=3600"},
                    data=fh.read(), timeout=180)
            print(f"  q{i} upload {up.status_code} {'OK' if up.status_code in (200,201) else up.text[:120]}", flush=True)
        manifest.append({"n": i, "text": text, "audioUrl": public_url})

    out = os.path.join(HERE, f"{args.scope}-conversation-prompts.json")
    open(out, "w").write(json.dumps(manifest, ensure_ascii=False, indent=2))
    print("MANIFEST=" + json.dumps(manifest, ensure_ascii=False))


if __name__ == "__main__":
    main()
