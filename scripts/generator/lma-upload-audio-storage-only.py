#!/usr/bin/env python3
"""
LMA audio uploader — STORAGE-ONLY (no database writes)
======================================================
Uploads per-step lesson clips for learner ANAMARIJAC2604-de to a Supabase
Storage bucket. It does NOT touch any table (the schema has no home for per-step
clips yet) and is NOT part of the app — it talks to the Supabase Storage REST API
directly, so nothing in the lma-app-v2 repo is modified.

Safe by default: prints the full manifest and does NOTHING over the network
unless you pass --commit.

------------------------------------------------------------------ MODEL
Process ONE source folder per run (e.g. a lesson folder, or a generator
timestamp folder). --lesson sets the number used in the TARGET names; --suffix
is the number in the SOURCE filenames (defaults to the lesson number).

Source filenames:   <step>-<suffix>.mp3        e.g. 1grasp-001.mp3
Target object name: ANAMARIJAC2604-de-<NNN>-<step>.mp3   (flat; the confirmed scheme)
                    (LAYOUT="foldered" -> ANAMARIJAC2604-de-<NNN>/<step>.mp3)

The 5 step files are uploaded by default; pass --refs to also include the two
reference clips (0ref, 0ref-en).

------------------------------------------------------------------ USAGE
    # Dry run (NO network) — review the names:
    python3 lma-upload-audio-storage-only.py \
        --src ~/Downloads/ANAMARIJAC2604-de/2026-06-19T14-25-45-5048 --lesson 1

    # Commit (needs creds + a public 'lesson-audio' bucket):
    export SUPABASE_URL="https://<project>.supabase.co"
    export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"   # bypasses RLS — keep secret
    python3 lma-upload-audio-storage-only.py --src <folder> --lesson 1 --commit
"""

import os, sys, argparse
from urllib.parse import quote

try:
    import requests
except ImportError:
    sys.exit("pip install requests --break-system-packages")

# ============================ CONFIG ============================
USER       = "ANAMARIJAC2604-de"                               # APP-USERNAME / learner handle
STEP_FILES = ["1grasp", "2hum", "3shadow", "4read", "5recall"] # the 5 practice steps
REF_FILES  = ["0ref", "0ref-en"]                               # added only with --refs
BUCKET     = os.environ.get("SUPABASE_AUDIO_BUCKET", "lesson-audio")
LAYOUT     = "flat"                                            # "flat" -> USER-NNN-step.mp3

def source_name(step, suffix): return f"{step}-{suffix}.mp3"   # 1grasp-001.mp3
def target_name(step, n):
    return (f"{USER}-{n:03d}-{step}.mp3" if LAYOUT == "flat"
            else f"{USER}-{n:03d}/{step}.mp3")

# ============================ helpers ============================
def public_url(base, obj): return f"{base}/storage/v1/object/public/{BUCKET}/{quote(obj)}"

def upload(base, key, obj, data):
    return requests.post(
        f"{base}/storage/v1/object/{BUCKET}/{quote(obj)}",
        headers={"Authorization": f"Bearer {key}", "apikey": key,
                 "Content-Type": "audio/mpeg", "x-upsert": "true",
                 "cache-control": "max-age=3600"},
        data=data, timeout=120)

# ============================ main ============================
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="folder containing the .mp3 files")
    ap.add_argument("--lesson", type=int, default=1, help="lesson number for TARGET names (default 1)")
    ap.add_argument("--suffix", default=None, help="SOURCE filename suffix (default = lesson NNN)")
    ap.add_argument("--refs", action="store_true", help="also include 0ref / 0ref-en")
    ap.add_argument("--commit", action="store_true", help="actually upload (default: dry run)")
    args = ap.parse_args()

    n      = args.lesson
    suffix = args.suffix if args.suffix is not None else f"{n:03d}"
    steps  = (REF_FILES + STEP_FILES) if args.refs else STEP_FILES
    base   = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
    key    = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    print(f"User    : {USER}")
    print(f"Source  : {args.src}")
    print(f"Lesson  : {n:03d}   Source suffix: {suffix}   Files: {len(steps)} ({'with refs' if args.refs else '5 step files'})")
    print(f"Bucket  : {BUCKET}   Layout: {LAYOUT}")
    print(f"Mode    : {'COMMIT (uploading)' if args.commit else 'DRY RUN (no network)'}\n")

    plan, missing = [], []
    for step in steps:
        src = os.path.join(args.src, source_name(step, suffix))
        obj = target_name(step, n)
        present = os.path.isfile(src)
        if not present: missing.append(src)
        plan.append((src, obj, present))
        print(f"  {'ok ' if present else 'MISS'}  {source_name(step, suffix)}  ->  {BUCKET}/{obj}")

    print(f"\n{len(plan)} files planned, {len(plan)-len(missing)} present, {len(missing)} missing.")
    if missing:
        print("Missing source files:")
        for m in missing: print("  - " + m)

    if not args.commit:
        print("\nDry run only — nothing uploaded. Re-run with --commit to upload.")
        return

    if not (base and key):
        sys.exit("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — cannot commit.")
    if missing:
        sys.exit("Refusing to commit with missing source files.")

    done = 0
    for src, obj, _ in plan:
        with open(src, "rb") as f:
            r = upload(base, key, obj, f.read())
        if r.status_code not in (200, 201):
            print(f"  X  {obj}: {r.status_code} {r.text[:200]}")
            continue
        done += 1
        print(f"  up  {obj}\n      {public_url(base, obj)}")
    print(f"\nDone — uploaded {done}/{len(plan)} object(s) to '{BUCKET}'.")

if __name__ == "__main__":
    main()
