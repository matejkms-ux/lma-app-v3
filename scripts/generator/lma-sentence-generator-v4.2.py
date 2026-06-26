#!/usr/bin/env python3
"""
LMA Sentence Generator — SIMPLE  (v4.2 · 2026-06-26 · MKMS)
=========================================================
One simple CSV (10 sentences for one learner)  ->  SEVEN MP3s for that set:

    grasp-NNN.mp3    L2 -> 5s -> L1 -> 1s -> L2 -> 1s          (per sentence, concatenated)
    hum-NNN.mp3      L2 -> gap -> L2 -> gap   (gap = max(HUM_GAP, clip length))
    shadow-NNN.mp3   L2 -> pgap -> L2 -> pgap
    read-NNN.mp3     L2 -> pgap -> L2 -> 1.5s
    recall-NNN.mp3   L1 -> pgap -> L2 -> pgap
    ref-NNN.mp3      every L2 sentence, clean, in order        (scoring reference)
    ref-en-NNN.mp3   every L1 meaning, clean, in order

v4.2 PAUSE CHANGE (learner feedback: "pauses way too short — I need time to say
the second part of the sentence"). The gaps where the learner PRODUCES the target
(SHADOW, READ, RECALL) are now sized off the L2 CLIP LENGTH itself (pgap): you always
get at least as long as it took to say the sentence, plus PAUSE_PAD breathing room,
never below a per-step floor. Clip-length-driven (like HUM) so it scales with sentence
length AND works for spaceless scripts (ja/th/km), unlike the old word-count gap.

Files land in a folder named after the learner, with the exact names the app's
upload page expects:  <APP_USERNAME>/grasp-001.mp3 , hum-001.mp3 , ...

------------------------------------------------------------------ CSV FORMAT
Six columns (header row required; order/caps/spaces don't matter — see TEMPLATE-SET-simple.csv):

    APP-USERNAME      learner handle, e.g. ANAMARIJAC2604-de   (used for the output folder)
    SENTENCE #        1..10
    SENTENCE CLAUSES  clause count (integer; carried as metadata)
    L2                the sentence in the language being learned   (REQUIRED — spoken target)
    L1                the same sentence's meaning (the bridge)      (REQUIRED — spoken in GRASP/RECALL)
    LANGUAGE          2-letter ISO of L2: de fr ja th km ru it es zh

------------------------------------------------------------------ USAGE
    python3 lma-sentence-generator-v4-simple-2026-0617-MKMS.py <set.csv> [NNN] [options]

    NNN          recording number, default 001  ->  grasp-001.mp3 ...
    only=STEP    build just one step (grasp|hum|shadow|read|recall)
    norefs       skip ref / ref-en

------------------------------------------------------------------ KEYS (env)
    ELEVENLABS_API_KEY    required (all languages except Khmer)
    AZURE_SPEECH_KEY      required only for Khmer (km)
    AZURE_SPEECH_REGION   required only for Khmer (km)

BEFORE RUNNING: set the REPLACE_ME voice IDs below (L1 bridge voice + each L2 language).
Khmer routes to Azure automatically. Thai (th) has no native ElevenLabs voice — pick one
or add "th" to AZURE_LANGS/AZURE_VOICE_MAP.
"""

import os, sys, io, csv

# --- auto-load keys from a .env next to this script (gitignored; never commit it) ---
# So you never have to re-supply ELEVENLABS_API_KEY / AZURE_SPEECH_KEY / AZURE_SPEECH_REGION.
# Real environment variables, if already set, take precedence over the file.
def _load_dotenv():
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k, v = k.strip(), v.strip().strip('"').strip("'")
            os.environ.setdefault(k, v)
_load_dotenv()

try:
    import requests
except ImportError:
    sys.exit("pip install requests --break-system-packages")
try:
    from pydub import AudioSegment
except ImportError:
    sys.exit("pip install pydub --break-system-packages  (also needs ffmpeg)")

# ============================ CONFIG ============================
MODEL_ID    = "eleven_v3"
L1_VOICE_ID = "UgBBYS2sOqTuMpoF3BR0"     # voice for the L1/meaning track (e.g. English "Mark")

VOICE_MAP = {                     # L2 voices per 2-letter ISO — REPLACE placeholders
    "de": "E13qNLHLLuVPKQvesCoy",
    "fr": "oQZyHVc6FnIvc9bYS5yl",
    "it": "nH7uLS5UdEnvKEOAXtlQ",
    "es": "cIBxLwfshLYhRB9lCXEg",
    "pt": "ejarTsrf33xoVlH9hMuy",    # Luis — European Portuguese (pt-PT)
    "ru": "rQOBu7YxCDxGiFdTm28w",
    "zh": "REPLACE_ME_ZH",
    "ja": "3JDquces8E8bkmvbh6Bc",   # Otani
    "th": "REPLACE_ME_TH",
}
AZURE_LANGS     = {"km", "he"}   # he: no native ElevenLabs Hebrew voice → route to Azure
AZURE_VOICE_MAP = {"km": "km-KH-PisethNeural",   # or km-KH-SreymomNeural
                   "he": "he-IL-AvriNeural"}     # male (matches Bryan); fem alt he-IL-HilaNeural
AZURE_LOCALE    = {"km": "km-KH", "th": "th-TH", "he": "he-IL"}
LANG_NAMES = {"de":"German","fr":"French","it":"Italian","es":"Spanish","ru":"Russian",
              "zh":"Mandarin","ja":"Japanese","th":"Thai","km":"Khmer","pt":"Portuguese","he":"Hebrew"}
ISO = {"deu":"de","ger":"de","de":"de","fra":"fr","fre":"fr","fr":"fr","jpn":"ja","jp":"ja","ja":"ja",
       "tha":"th","th":"th","khm":"km","km":"km","rus":"ru","ru":"ru","ita":"it","it":"it",
       "spa":"es","es":"es","zho":"zh","cmn":"zh","zh":"zh","por":"pt","pt":"pt"}

GRASP_GAP1, GRASP_GAP2 = 5.0, 1.0   # GRASP_GAP1 = time to say the English meaning
HUM_GAP                = 2.5
SHADOW_GAP             = 3.0        # floor for the production gap (pgap) per step
READ_GAP, READ_TAIL    = 3.0, 1.5
RECALL_GAP             = 3.0
REF_GAP                = 1.2
PAUSE_PAD              = 1.0        # breathing room added on top of the clip length
WPS, PAD, GMIN, GMAX   = 2.2, 0.5, 2.0, 12.0
L2_SPEED, SPEED, EMOTION = 0.7, 0.9, "neutral"
STEP_NUM = {"grasp":"1","hum":"2","shadow":"3","read":"4","recall":"5"}
STEPS = ["grasp","hum","shadow","read","recall"]

# ============================ helpers ============================
def sil(s): return AudioSegment.silent(duration=int(s*1000))
def rgap(t):
    g = max(1, len(t.split()))/WPS + PAD
    return max(GMIN, min(GMAX, g))
def pgap(l2clip, floor):
    # Production gap: give the learner at least the time it took to SAY the L2
    # (len(l2clip) is ms, and already includes the 0.4s trail) plus PAUSE_PAD of
    # breathing room — never below `floor`, never beyond GMAX. Clip-length-driven so
    # it scales with sentence length and works for spaceless scripts.
    return max(floor, min(GMAX, len(l2clip)/1000 + PAUSE_PAD))

# header normalizer -> canonical names
def canon(h):
    k = h.strip().lower().replace("#","nr").replace("-","_").replace(" ","_")
    while "__" in k: k = k.replace("__","_")
    return {
        "app_username":"user","appusername":"user","username":"user","user":"user",
        "sentence_nr":"nr","sentencenr":"nr","sentence_number":"nr","nr":"nr",
        "sentence_clauses":"clauses","clauses":"clauses","clause_count":"clauses",
        "l2":"l2","target":"l2",
        "l1":"l1","english":"l1","native":"l1","meaning":"l1",
        "language":"lang","lang":"lang","lang_abbr":"lang","iso":"lang",
    }.get(k, k)

_CACHE = {}
def _el(text, voice, speed):
    key = os.environ.get("ELEVENLABS_API_KEY") or sys.exit("ELEVENLABS_API_KEY not set (required for ElevenLabs TTS).")
    if voice.startswith("REPLACE_ME"):
        sys.exit(f"Voice '{voice}' is a placeholder — set a real ElevenLabs voice ID.")
    r = requests.post(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}",
        headers={"xi-api-key": key, "Content-Type":"application/json"},
        json={"text":text,"model_id":MODEL_ID,
              "voice_settings":{"stability":0.6,"similarity_boost":0.75,"speed":float(speed)}},
        timeout=120)
    if r.status_code != 200: sys.exit(f"ElevenLabs {r.status_code}: {r.text[:200]}")
    return AudioSegment.from_file(io.BytesIO(r.content), format="mp3")

def _az(text, voice, locale):
    key = os.environ.get("AZURE_SPEECH_KEY"); region = os.environ.get("AZURE_SPEECH_REGION")
    if not (key and region): sys.exit("AZURE_SPEECH_KEY / AZURE_SPEECH_REGION not set (Khmer).")
    ssml = f"<speak version='1.0' xml:lang='{locale}'><voice xml:lang='{locale}' name='{voice}'>{text}</voice></speak>"
    r = requests.post(f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1",
        data=ssml.encode("utf-8"),
        headers={"Ocp-Apim-Subscription-Key":key,"Content-Type":"application/ssml+xml",
                 "X-Microsoft-OutputFormat":"audio-24khz-96kbitrate-mono-mp3"}, timeout=120)
    if r.status_code != 200: sys.exit(f"Azure {r.status_code}: {r.text[:200]}")
    return AudioSegment.from_file(io.BytesIO(r.content), format="mp3")

def say(text, lang, is_l1=False):
    if is_l1:
        spoken, voice, eng, loc = text, L1_VOICE_ID, "el", None
    elif lang in AZURE_LANGS:
        spoken, voice, eng, loc = text, AZURE_VOICE_MAP[lang], "az", AZURE_LOCALE[lang]
    else:
        voice = VOICE_MAP.get(lang) or sys.exit(f"No voice for language '{lang}'.")
        # PLAIN text only. eleven_v3 vocalizes BOTH a trailing " …" (→ stray ゴム/チョ)
        # AND the "[… accent]" tag (→ a second voice) as audible junk between lines.
        # Verified clean with plain text + a language-appropriate VOICE_MAP voice.
        spoken, eng, loc = text, "el", None
    ck = (spoken, voice, eng)
    if ck in _CACHE: return _CACHE[ck]
    clip = _az(spoken, voice, loc) if eng == "az" else _el(spoken, voice, SPEED if is_l1 else L2_SPEED)
    if not is_l1: clip = clip + sil(0.4)
    _CACHE[ck] = clip
    return clip

# ============================ build ============================
def build_step(step, rows):
    out = AudioSegment.empty()
    for r in rows:
        l2 = say(r["l2"], r["lang"])
        if step in ("grasp","recall"): l1 = say(r["l1"], r["lang"], is_l1=True)
        if step == "grasp":   out += l2 + sil(GRASP_GAP1) + l1 + sil(GRASP_GAP2) + l2 + sil(GRASP_GAP2)
        elif step == "hum":
            # Gap scales with the clip — a flat HUM_GAP is too short to hum back
            # longer sentences. Give at least the clip's own length (len(l2)
            # includes the 0.4s trail), with HUM_GAP as a floor for short lines.
            # Clip-length-driven (not word-count) so spaceless scripts work too.
            g = max(HUM_GAP, len(l2)/1000)
            out += l2 + sil(g) + l2 + sil(g)
        elif step == "shadow":g = pgap(l2, SHADOW_GAP); out += l2 + sil(g) + l2 + sil(g)
        elif step == "read":  out += l2 + sil(pgap(l2, READ_GAP)) + l2 + sil(READ_TAIL)
        elif step == "recall":
            # L1 prompt -> gap to recall from memory -> reveal L2 once (no double).
            # v4.2: the produce-from-memory gap is sized off the L2 CLIP (pgap), so
            # she gets at least as long as the sentence takes to say. (Old word-count
            # rgap was sized off the L1 and ran short for longer targets — exactly the
            # "no time to say the second part of the sentence" complaint.)
            g = pgap(l2, RECALL_GAP); out += l1 + sil(g) + l2 + sil(g)
    return out

def build_ref(rows, l1=False):
    out = AudioSegment.empty()
    for r in rows:
        out += (say(r["l1"], r["lang"], is_l1=True) if l1 else say(r["l2"], r["lang"])) + sil(REF_GAP)
    return out

# ============================ main ============================
def main():
    if len(sys.argv) < 2:
        print("Usage: python3 lma-sentence-generator-v4-simple-2026-0617-MKMS.py <set.csv> [NNN] [only=STEP] [norefs]")
        sys.exit(1)
    path = sys.argv[1]
    opts = sys.argv[2:]
    nnn  = next((o for o in opts if o.isdigit()), "1")
    nnn  = f"{int(nnn):03d}"
    only = next((o.split("=",1)[1] for o in opts if o.startswith("only=")), "")
    norefs = "norefs" in opts

    rows, user = [], None
    with open(path, newline="", encoding="utf-8") as f:
        rdr = csv.reader(f)
        header = [canon(h) for h in next(rdr)]
        for raw in rdr:
            d = dict(zip(header, raw))
            if not (d.get("l2") or "").strip(): continue
            rows.append({"l2": d["l2"].strip(), "l1": (d.get("l1") or "").strip(),
                         "lang": ISO.get((d.get("lang") or "").strip().lower(), (d.get("lang") or "").strip().lower())})
            user = user or (d.get("user") or "").strip()
    if not rows: sys.exit("No sentences (need an L2 column with content).")
    user = user or "OUTPUT"
    from datetime import datetime
    import time as _t
    _stamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S") + "-" + str(int(_t.time()*1000))[-4:]
    outdir = os.path.join(user, _stamp)
    os.makedirs(outdir, exist_ok=True)
    print(f"{user}: {len(rows)} sentences, languages {sorted({r['lang'] for r in rows})}, recording {nnn}")

    written = []
    for step in ([only] if only else STEPS):
        if step not in STEPS: sys.exit(f"Unknown step '{step}'.")
        print(f"  {step.upper()} ..."); fn = os.path.join(outdir, f"{STEP_NUM[step]}{step}-{nnn}.mp3")
        build_step(step, rows).export(fn, format="mp3"); written.append(fn)
    if not norefs and not only:
        print("  REF ...");    fn = os.path.join(outdir, f"0ref-{nnn}.mp3");    build_ref(rows).export(fn, format="mp3"); written.append(fn)
        print("  REF-EN ..."); fn = os.path.join(outdir, f"0ref-en-{nnn}.mp3"); build_ref(rows, l1=True).export(fn, format="mp3"); written.append(fn)

    print(f"\nDone — {len(written)} file(s):")
    for w in written: print("  " + w)

if __name__ == "__main__":
    main()
