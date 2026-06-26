#!/usr/bin/env python3
"""Pull learners' LingQ conversation lessons into the Reader (listen → rate → read).

LANGUAGE-DEPENDENT by design. The learner's `language` drives two things:
  1. the LingQ API path  ->  /api/v3/<code>/...   (de, ja, th, km, …)
  2. how the target text is normalised: scripts WITHOUT word spaces
     (Japanese, Chinese, Thai, Khmer) have LingQ's tokenizer spaces *stripped*
     so they read naturally (今日は… not 今日 は …); space-delimited languages
     (German, Spanish, …) keep their spacing.

Usage:
    python3 pull-reader.py            # regenerate the whole Reader from SOURCES

Requires `LINGQ_API_KEY` in scripts/generator/.env. Audio is written to
public/audio/reader/<code>/ (existing files are kept — delete to re-download).
Output: src/data/readerLessons.ts. Re-running is idempotent.

To add a learner: append to SOURCES below (a LingQ `collection` id, or an
explicit `lessons` id list), then run. New languages: add a row to LANG.
"""
import json
import os
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]  # repo root
ENV = pathlib.Path(__file__).with_name(".env")

# language -> (LingQ lang code, spaceless?)   spaceless = no word boundaries in the script
LANG = {
    "GERMAN": ("de", False), "ENGLISH": ("en", False), "SPANISH": ("es", False),
    "FRENCH": ("fr", False), "ITALIAN": ("it", False), "RUSSIAN": ("ru", False),
    "JAPANESE": ("ja", True), "CHINESE": ("zh", True), "THAI": ("th", True),
    "KHMER": ("km", True),
}

# One entry per learner. Source is either an explicit `lessons` id list or a
# LingQ `collection` id (all its lessons). `base` names the audio files /
# lesson codes; `tutor` is shown in the title ("Conversation #N with <tutor>").
SOURCES = [
    {
        "scope": "ANAMARIJAC2604-de", "language": "GERMAN", "base": "hannah", "tutor": "Hannah",
        "lessons": [44428318, 44447591, 44494789, 44745726, 44745727, 44752562, 44781911,
                    44817097, 44853608, 44898607, 44906014, 44938524, 44938525, 45002027,
                    45017597, 45039283],
    },
    {
        "scope": "WONCHAKL2401-ja", "language": "JAPANESE", "base": "charles", "tutor": "Yuka",
        "collection": 2762858,
    },
]


def _load_key():
    for line in ENV.read_text().splitlines():
        line = line.strip()
        if line.startswith("LINGQ_API_KEY="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("LINGQ_API_KEY missing from scripts/generator/.env")


TOKEN = _load_key()


def _curl(url, out=None):
    # curl is reliable for LingQ; python urllib gets a 403 on its default User-Agent.
    cmd = ["curl", "-s", "-m", "120", "-H", f"Authorization: Token {TOKEN}", url]
    if out:
        subprocess.run(cmd + ["-o", out], check=True)
        return None
    return subprocess.run(cmd, check=True, capture_output=True).stdout


def _json(url):
    return json.loads(_curl(url))


def _lesson_ids(code, src):
    if src.get("lessons"):
        return src["lessons"]
    d = _json(f"https://www.lingq.com/api/v3/{code}/collections/{src['collection']}/lessons/?page_size=200")
    items = d.get("lessons") or d.get("results") or []
    return [l["id"] for l in items]


def build_source(src):
    if src["language"] not in LANG:
        raise SystemExit(f"Unknown language {src['language']} — add it to LANG")
    code, spaceless = LANG[src["language"]]
    audio_dir = ROOT / "public" / "audio" / "reader" / code
    audio_dir.mkdir(parents=True, exist_ok=True)

    lessons = []
    for lid in _lesson_ids(code, src):
        meta = _json(f"https://www.lingq.com/api/v3/{code}/lessons/{lid}/")
        m = re.search(r"#(\d+)\.", meta.get("title") or "")
        if not m:
            print(f"  skip {lid}: no '#N' in title {meta.get('title')!r}")
            continue
        n = int(m.group(1))

        sentences = []
        for x in _json(f"https://www.lingq.com/api/v3/{code}/lessons/{lid}/sentences/"):
            if not isinstance(x, dict):
                continue
            ts = x.get("timestamp") or [None, None]
            l2 = x.get("cleanText") or x.get("text") or ""
            l2 = "".join(l2.split()) if spaceless else l2.strip()  # <- language-dependent
            if not l2:
                continue
            en = next((t["text"] for t in x.get("translations", []) if t.get("language") == "en"), "")
            sentences.append({"i": x.get("index"), "start": ts[0], "end": ts[1], "l2": l2, "en": en})

        fn = audio_dir / f"{src['base']}-{n:02d}.mp3"
        if meta.get("audioUrl") and not fn.exists():
            _curl(meta["audioUrl"], str(fn))

        lessons.append({
            "code": f"{src['scope']}-{src['base']}-{n:02d}",
            "scope": src["scope"], "language": src["language"], "sessionNr": n,
            "title": f"Conversation #{n} with {src['tutor']}",
            "audio": f"/audio/reader/{code}/{src['base']}-{n:02d}.mp3",
            "durationSec": meta.get("duration"), "sentences": sentences,
        })
        print(f"  #{n:02d} {meta.get('title')} -> {len(sentences)} sentences")

    lessons.sort(key=lambda x: x["sessionNr"])
    return lessons


HEADER = """// AUTO-GENERATED by scripts/generator/pull-reader.py — do not hand-edit.
// Per-learner listen-then-(rate)-then-read content; audio in public/audio/reader/<lang>/.
// Language-dependent: spaceless scripts (ja/zh/th/km) have tokenizer spaces stripped.

export interface ReaderSentence {
  i: number;
  start: number;
  end: number;
  /** target-language sentence (German, Japanese, …). */
  l2: string;
  /** English translation (revealed on tap). */
  en: string;
}
export interface ReaderLesson {
  code: string; scope: string; language: string; sessionNr: number;
  title: string; audio: string; durationSec: number; sentences: ReaderSentence[];
}

export const READER_LESSONS: ReaderLesson[] = """

FOOTER = """

export function readerLessonsForScope(scope: string): ReaderLesson[] {
  return READER_LESSONS.filter((l) => l.scope === scope).sort((a, b) => a.sessionNr - b.sessionNr);
}
export function readerLessonByCode(code: string): ReaderLesson | undefined {
  return READER_LESSONS.find((l) => l.code === code);
}
"""


def main():
    all_lessons = []
    for src in SOURCES:
        print(f"== {src['scope']} ({src['language']}) ==")
        all_lessons += build_source(src)
    out = ROOT / "src" / "data" / "readerLessons.ts"
    out.write_text(HEADER + json.dumps(all_lessons, ensure_ascii=False, indent=2) + ";" + FOOTER)
    by_lang = {}
    for l in all_lessons:
        by_lang[l["language"]] = by_lang.get(l["language"], 0) + 1
    print(f"\nWrote {out.relative_to(ROOT)} — {len(all_lessons)} lessons {by_lang}")


if __name__ == "__main__":
    main()
