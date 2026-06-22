#!/usr/bin/env python3
"""
LMA "land a lesson" — uploads generated audio + writes sentences into Supabase so
the app picks the lesson up. Pairs with lma-sentence-generator-v4.1.py.

Given a generator output folder + the source CSV, this:
  1. uploads the 7 MP3s to the public `lesson-audio` bucket at
     <lesson_code>/<STEP>.mp3 and upserts lesson_audio rows, mapping:
        1grasp -> GRASP   2hum -> HUM   3shadow -> SHADOW
        4read  -> READ    5recall -> RECALL
        0ref   -> ref_l2 (L2 scoring reference)   0ref-en -> ref_l1
  2. ensures a lessons row, then upserts the sentences (l1, l2) from the CSV.
     (The v4 CSV has no transliteration column, so l2_translit is left as-is.)

Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (service role bypasses RLS — keep secret).

Usage:
  python3 land-lesson.py --src <gen-folder> --csv <set.csv> --app-username TOMR2504-km \
      --nnn 001 [--commit]
  lesson_code defaults to "<app-username>-<nnn>" (e.g. TOMR2504-km-001).
"""
import os, sys, csv, argparse, json
from urllib.parse import quote

try:
    import requests
except ImportError:
    sys.exit("pip install requests")

BUCKET = "lesson-audio"
# generator file stem -> lesson_audio.step
STEP_MAP = {
    "1grasp": "GRASP", "2hum": "HUM", "3shadow": "SHADOW",
    "4read": "READ", "5recall": "RECALL",
    "0ref": "ref_l2", "0ref-en": "ref_l1",
}
ISO_LANG = {"de": "GERMAN", "fr": "FRENCH", "it": "ITALIAN", "es": "SPANISH",
            "ru": "RUSSIAN", "zh": "MANDARIN", "ja": "JAPANESE", "th": "THAI", "km": "KHMER"}


def canon(h):
    k = h.strip().lower().replace("#", "nr").replace("-", "_").replace(" ", "_")
    while "__" in k:
        k = k.replace("__", "_")
    return {
        "app_username": "user", "appusername": "user", "username": "user", "user": "user",
        "sentence_nr": "nr", "sentencenr": "nr", "sentence_number": "nr", "nr": "nr",
        "l2": "l2", "target": "l2",
        "l1": "l1", "english": "l1", "native": "l1", "meaning": "l1",
        "language": "lang", "lang": "lang", "iso": "lang",
    }.get(k, k)


def read_csv(path):
    rows, user, lang = [], None, None
    with open(path, newline="", encoding="utf-8") as f:
        rdr = csv.reader(f)
        header = [canon(h) for h in next(rdr)]
        for i, raw in enumerate(rdr):
            d = dict(zip(header, raw))
            if not (d.get("l2") or "").strip():
                continue
            rows.append({
                "sentence_nr": int(d.get("nr") or len(rows) + 1),
                "l1": (d.get("l1") or "").strip(),
                "l2": d["l2"].strip(),
            })
            user = user or (d.get("user") or "").strip()
            lang = lang or (d.get("lang") or "").strip().lower()
    return rows, user, lang


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="generator output folder with the .mp3 files")
    ap.add_argument("--csv", required=True, help="the source sentence CSV")
    ap.add_argument("--app-username", required=True, help="e.g. TOMR2504-km")
    ap.add_argument("--nnn", default="001")
    ap.add_argument("--lesson-code", default=None)
    ap.add_argument("--commit", action="store_true", help="actually write (default: dry run)")
    args = ap.parse_args()

    nnn = f"{int(args.nnn):03d}"
    lesson_code = args.lesson_code or f"{args.app_username}-{nnn}"
    base = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    rows, _user, lang = read_csv(args.csv)
    language = ISO_LANG.get(lang or "", (lang or "").upper())
    if not rows:
        sys.exit("No sentences in CSV.")

    # Plan the 7 audio files.
    plan = []
    for stem, step in STEP_MAP.items():
        src = os.path.join(args.src, f"{stem}-{nnn}.mp3")
        plan.append((src, step, os.path.isfile(src)))

    print(f"Lesson  : {lesson_code}  ({language})")
    print(f"Sentences: {len(rows)}   Audio files present: {sum(p[2] for p in plan)}/7")
    for src, step, ok in plan:
        print(f"  {'ok ' if ok else 'MISS'}  {os.path.basename(src)} -> lesson_audio[{step}]")
    print(f"Mode    : {'COMMIT' if args.commit else 'DRY RUN'}\n")
    if not args.commit:
        print("Dry run — nothing written. Re-run with --commit.")
        return
    if not (base and key):
        sys.exit("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set.")

    H = {"apikey": key, "Authorization": f"Bearer {key}"}

    # 1. upload audio + lesson_audio rows
    audio_rows = []
    for src, step, ok in plan:
        if not ok:
            continue
        obj = f"{lesson_code}/{step}.mp3"
        with open(src, "rb") as fh:
            r = requests.post(f"{base}/storage/v1/object/{BUCKET}/{quote(obj)}",
                              headers={**H, "Content-Type": "audio/mpeg", "x-upsert": "true"},
                              data=fh.read(), timeout=120)
        if r.status_code not in (200, 201):
            print(f"  X storage {obj}: {r.status_code} {r.text[:160]}"); continue
        url = f"{base}/storage/v1/object/public/{BUCKET}/{quote(obj)}"
        audio_rows.append({"lesson_code": lesson_code, "step": step, "audio_url": url,
                           "file_name": os.path.basename(src)})
        print(f"  up  {obj}")
    if audio_rows:
        r = requests.post(f"{base}/rest/v1/lesson_audio?on_conflict=lesson_code,step",
                          headers={**H, "Content-Type": "application/json",
                                   "Prefer": "resolution=merge-duplicates"},
                          data=json.dumps(audio_rows), timeout=60)
        print(f"  lesson_audio upsert: {r.status_code}")

    # 2. ensure lessons row + upsert sentences
    requests.post(f"{base}/rest/v1/lessons?on_conflict=lesson_code",
                  headers={**H, "Content-Type": "application/json",
                           "Prefer": "resolution=merge-duplicates"},
                  data=json.dumps([{"lesson_code": lesson_code, "language": language,
                                    "title": f"Lesson {int(nnn)}"}]), timeout=60)
    sent_rows = [{"lesson_code": lesson_code, "sentence_nr": s["sentence_nr"],
                  "l1": s["l1"], "l2": s["l2"]} for s in rows]
    r = requests.post(f"{base}/rest/v1/sentences?on_conflict=lesson_code,sentence_nr",
                      headers={**H, "Content-Type": "application/json",
                               "Prefer": "resolution=merge-duplicates"},
                      data=json.dumps(sent_rows), timeout=60)
    print(f"  sentences upsert: {r.status_code}  ({len(sent_rows)} rows)")
    print("\nDone.")


if __name__ == "__main__":
    main()
