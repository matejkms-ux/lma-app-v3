#!/usr/bin/env python3
"""
Build + upload Jerod Thai Lesson 2 audio (Azure male voices), matching the
v4.1 generator's step/gap recipe exactly. Uploads the 7 MP3s to the
lesson-audio bucket under a NON-colliding folder (002b), since Lesson 1's
live audio is served from the 002/ folder.
"""
import os, io, sys, pathlib, requests
from pydub import AudioSegment

# --- keys from generator/.env ---
env = {}
for line in pathlib.Path(__file__).with_name(".env").read_text().splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1); env[k.strip()] = v.strip()
AZ_KEY = env["AZURE_SPEECH_KEY"]; AZ_REGION = env["AZURE_SPEECH_REGION"]

SB_URL = "https://wcrwnfvwydibhggislne.supabase.co"
ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcnduZnZ3eWRpYmhnZ2lzbG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3OTU2NTMsImV4cCI6MjA5NzM3MTY1M30.oiw_YI9oiqvdSlvgxGUd9DFPY3vgZLYPfz5-cfCmDmQ"
BUCKET = "lesson-audio"
FOLDER = "JERODC2604-th-002b"

TH_VOICE = "th-TH-NiwatNeural"; TH_RATE = "-30%"   # ~70% speed
EN_VOICE = "en-US-GuyNeural";   EN_RATE = "-10%"

# (sentence_nr, L1 English, L2 Thai with natural khrap map)
SENTENCES = [
    (1,  "God loves you",              "พระเจ้ารักคุณครับ"),
    (2,  "I want to tell you",         "ผมอยากบอกคุณนะครับ"),
    (3,  "Merit is not enough",        "บุญไม่พอ"),
    (4,  "Jesus gives you life",       "พระเยซูให้ชีวิตคุณครับ"),
    (5,  "Do you pray?",               "คุณสวดมนต์ไหมครับ"),
    (6,  "Why do you pray?",           "ทำไมคุณสวดมนต์"),
    (7,  "I pray to God",              "ผมอธิษฐานต่อพระเจ้าครับ"),
    (8,  "God hears you",              "พระเจ้าได้ยินคุณครับ"),
    (9,  "What is peace?",             "สันติคืออะไร"),
    (10, "Do you want to know Jesus?", "คุณอยากรู้จักพระเยซูไหมครับ"),
]

# gap recipe (seconds) — identical to lma-sentence-generator-v4.1.py
GRASP_GAP1, GRASP_GAP2 = 4.0, 1.0
HUM_GAP = 2.5; SHADOW_GAP = 2.0; READ_GAP, READ_TAIL = 2.0, 1.0; REF_GAP = 1.2
WPS, PAD, GMIN, GMAX = 2.2, 0.5, 2.0, 12.0

def sil(s): return AudioSegment.silent(duration=int(s*1000))
def rgap(t):
    g = max(1, len(t.split()))/WPS + PAD
    return max(GMIN, min(GMAX, g))

_CACHE = {}
def _azure(text, voice, lang, rate):
    ssml = (f"<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='{lang}'>"
            f"<voice name='{voice}'><prosody rate='{rate}'>{text}</prosody></voice></speak>")
    r = requests.post(f"https://{AZ_REGION}.tts.speech.microsoft.com/cognitiveservices/v1",
        data=ssml.encode("utf-8"),
        headers={"Ocp-Apim-Subscription-Key": AZ_KEY, "Content-Type": "application/ssml+xml",
                 "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
                 "User-Agent": "lma-jerod-l2"}, timeout=120)
    if r.status_code != 200: sys.exit(f"Azure {r.status_code}: {r.text[:200]}")
    return AudioSegment.from_file(io.BytesIO(r.content), format="mp3")

def L2(text):
    ck = ("th", text)
    if ck not in _CACHE: _CACHE[ck] = _azure(text, TH_VOICE, "th-TH", TH_RATE) + sil(0.4)
    return _CACHE[ck]
def L1(text):
    ck = ("en", text)
    if ck not in _CACHE: _CACHE[ck] = _azure(text, EN_VOICE, "en-US", EN_RATE)
    return _CACHE[ck]

def build(step):
    out = AudioSegment.empty()
    for _nr, l1, l2 in SENTENCES:
        a = L2(l2)
        if step == "GRASP":   out += a + sil(GRASP_GAP1) + L1(l1) + sil(GRASP_GAP2) + a + sil(GRASP_GAP2)
        elif step == "HUM":   out += a + sil(HUM_GAP) + a + sil(HUM_GAP)
        elif step == "SHADOW":out += a + sil(SHADOW_GAP) + a + sil(SHADOW_GAP)
        elif step == "READ":  out += a + sil(READ_GAP) + a + sil(READ_TAIL)
        elif step == "RECALL":
            # Prompt in L1, leave a gap to recall from memory, THEN reveal the L2
            # once. (Recall must not pre-play the answer twice — that's GRASP.)
            g = rgap(l2); out += L1(l1) + sil(g) + a + sil(g)
    return out

def build_ref(l1=False):
    out = AudioSegment.empty()
    for _nr, en, th in SENTENCES:
        out += (L1(en) if l1 else L2(th)) + sil(REF_GAP)
    return out

def upload(name, seg):
    buf = io.BytesIO(); seg.export(buf, format="mp3"); data = buf.getvalue()
    obj = f"{FOLDER}/{name}"
    r = requests.post(f"{SB_URL}/storage/v1/object/{BUCKET}/{obj}",
        headers={"apikey": ANON, "Authorization": f"Bearer {ANON}",
                 "Content-Type": "audio/mpeg", "x-upsert": "true"},
        data=data, timeout=120)
    ok = r.status_code in (200, 201)
    print(f"  {'up ' if ok else 'X  '} {obj}  ({len(data)} bytes)  {r.status_code}")
    if not ok: print("     ", r.text[:200])
    return ok

print("Generating + uploading Jerod Lesson 2 audio (Azure)...")
targets = [("GRASP.mp3", build("GRASP")), ("HUM.mp3", build("HUM")),
           ("SHADOW.mp3", build("SHADOW")), ("READ.mp3", build("READ")),
           ("RECALL.mp3", build("RECALL")),
           ("ref_l2.mp3", build_ref(l1=False)), ("ref_l1.mp3", build_ref(l1=True))]
allok = True
for name, seg in targets:
    allok &= upload(name, seg)
print("\nDone." if allok else "\nFINISHED WITH ERRORS.")
