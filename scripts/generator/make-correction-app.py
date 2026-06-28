#!/usr/bin/env python3
"""
make-correction-app.py — turn one learner voice note into a red/green "say it
naturally" page with audio, served by the app at /feedback/<slug>.html.

This is the standard way ALL learner-message feedback gets done. Write a small
spec JSON, run this, commit the generated public/feedback/<slug>.html + the spec,
push. The page is then BOTH a link to send (https://lma-islands-app.netlify.app/
feedback/<slug>.html) and reachable in-app (add the learner to src/data/feedback.ts).

Spec JSON shape:
{
  "slug": "anamarija-fischer",
  "voice": "E13qNLHLLuVPKQvesCoy",          # ElevenLabs L2 voice id
  "eyebrow": "Deine Sprachnachricht · korrigiert",
  "title_html": "Dein <em>Angel&#8209;Morgen</em>, auf Deutsch 🐟",
  "lede_html": "Anamarija — ...",
  "foot_html": "Ehrlich, ... 👏",
  "sig": "— Matej · LMA",
  "cards": [
    {"said": "... <s>weglassen</s> ...", "nat": "... <b>natürlich</b> ...",
     "tip": "...", "good": false}
  ]
}
- said: the learner's words; wrap the parts to drop/change in <s>…</s> (shown red).
- nat:  the natural version; wrap the fixes in <b>…</b> (shown green). The PLAIN
        text of `nat` (tags stripped) is what gets spoken.
- good: true marks a near-perfect line (green card, "✓ stark").

Usage:  python3 make-correction-app.py feedback/<slug>.json
Env:    ELEVENLABS_API_KEY (in .env next to this script).
"""
import os, sys, io, re, json, base64, subprocess, tempfile, html as _html

HERE = os.path.dirname(os.path.abspath(__file__))
PUBLIC_FEEDBACK = os.path.normpath(os.path.join(HERE, "..", "..", "public", "feedback"))
LIVE_BASE = "https://lma-islands-app.netlify.app/feedback"

def _env(name):
    # real env wins, else .env next to this script
    if os.environ.get(name):
        return os.environ[name]
    p = os.path.join(HERE, ".env")
    if os.path.exists(p):
        for line in open(p, encoding="utf-8"):
            if line.strip().startswith(name + "="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None

try:
    import requests
except ImportError:
    sys.exit("pip install requests --break-system-packages")

def tts_bytes(text, voice, key, speed=0.85):
    r = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice}",
        headers={"xi-api-key": key, "Content-Type": "application/json"},
        json={"text": text, "model_id": "eleven_v3",
              "voice_settings": {"stability": 0.6, "similarity_boost": 0.75, "speed": float(speed)}},
        timeout=120)
    if r.status_code != 200:
        sys.exit(f"ElevenLabs {r.status_code}: {r.text[:200]}")
    return r.content

def plain(s):
    return _html.unescape(re.sub(r"<[^>]+>", "", s)).strip()

def opus_to_mp3_file(path, out_mp3):
    """Convert the learner's original voice note to mp3 (browser-safe) written to
    out_mp3 — kept as a SEPARATE streaming file (not inlined) so the page stays
    light and the long original only loads when tapped. Returns 'M:SS' duration."""
    dur = float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", path], capture_output=True, text=True).stdout.strip() or 0)
    subprocess.run(["ffmpeg", "-y", "-i", path, "-ac", "1", "-b:a", "64k", out_mp3],
                   capture_output=True)
    return f"{int(dur // 60)}:{int(dur % 60):02d}"

def render(spec, audio_b64, original=None, full=None):
    ui = {
        "said": "So gesagt", "nat": "Natürlich", "listen": "Anhören",
        "playing": "Läuft…", "orig": "Deine Aufnahme", "full": "Am Stück",
        "all": "Alles anhören", "stop": "Stopp",
        "hear_diff": "Hör den Unterschied", "hear_sub": "erst deine Aufnahme, dann richtig.",
        "legend_drop": "weglassen / ändern", "legend_nat": "so ist es natürlich",
        "good_badge": "✓ stark", "dur_unit": "Min", "lang": "de",
    }
    ui.update(spec.get("ui", {}))
    cards = spec["cards"]
    card_html = []
    for i, c in enumerate(cards, 1):
        good = c.get("good")
        badge = ui["good_badge"] if good else f"{i:02d}"
        card_html.append(f'''
    <article class="card{' card--good' if good else ''}" id="card-{i}">
      <header class="card__h"><span class="num">{badge}</span></header>
      <p class="said"><span class="lbl lbl--said">{ui["said"]}</span>{c['said']}</p>
      <div class="nat">
        <span class="lbl lbl--nat">{ui["nat"]}</span>
        <p class="nat__t">{c['nat']}</p>
        <button class="play" data-n="{i}" aria-label="{ui['listen']}">
          <span class="play__i" aria-hidden="true"></span><span class="play__x">{ui["listen"]}</span>
        </button>
      </div>
      <p class="tip"><span aria-hidden="true">💡</span> {c['tip']}</p>
    </article>''')
    audio_tags = "\n".join(
        f'<audio id="a{i}" preload="none" src="data:audio/mpeg;base64,{audio_b64[i]}"></audio>'
        for i in range(1, len(cards) + 1))
    rise = ''.join(f'.cards .card:nth-child({i+1}){{animation-delay:{0.05+i*0.05:.2f}s}}'
                   for i in range(len(cards)))
    order = ','.join(str(i) for i in range(1, len(cards) + 1))
    rb, rd = spec.get("recorded_by"), spec.get("recorded_date")
    if rb:
        dur = f' · {original["mmss"]} {ui["dur_unit"]}' if original else ''
        date = f' · {rd}' if rd else ''
        meta_html = f'<div class="meta"><span class="mic" aria-hidden="true">🎙️</span> <b>{rb}</b>{dur}{date}</div>'
    else:
        meta_html = ''
    orig_btn = (f'<button class="playorig" id="playorig"><span class="play__i" aria-hidden="true"></span>'
                f'<span id="po-x">{ui["orig"]}</span></button>') if original else ''
    orig_audio_tag = (f'<audio id="orig" preload="none" src="{original["url"]}"></audio>'
                      if original else '')
    # Written correction: show the learner's original text in a message-bubble block
    orig_text = spec.get("original_text")
    orig_text_html = (
        f'<div class="orig-text"><div class="orig-text__lbl">{ui.get("orig_text_lbl", "Lo que escribiste")}</div>'
        f'<p class="orig-text__body">{_html.escape(orig_text)}</p></div>'
    ) if orig_text else ''
    full_btn = (f'<button class="playfull" id="playfull"><span class="play__i" aria-hidden="true"></span>'
                f'<span id="pf-x">{ui["full"]}</span></button>') if full else ''
    full_audio_tag = (f'<audio id="full" preload="none" src="{full["url"]}"></audio>'
                      if full else '')
    sig_html = f'<p class="sig">{spec["sig"]}</p>' if spec.get("sig") else ''
    lang = ui["lang"]
    body = f'''<style>
  :root {{
    --ground:#0E1A17; --ground2:#102019; --cream:#F2ECE0; --teal:#8FC0B8;
    --teal-dim:#6E8C86; --green:#79D29B; --green-bg:rgba(121,210,155,.15);
    --red:#E6907E; --red-bg:rgba(230,144,126,.12); --line:rgba(143,192,184,.16);
  }}
  * {{ box-sizing:border-box; }}
  .wrap {{ min-height:100%;
    background:radial-gradient(120% 80% at 50% -10%, #16302a 0%, var(--ground) 55%);
    color:var(--cream); font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
    -webkit-font-smoothing:antialiased; line-height:1.5; padding:28px 18px 56px; }}
  .inner {{ max-width:560px; margin:0 auto; }}
  .serif {{ font-family:Georgia,"Iowan Old Style",Palatino,"Times New Roman",serif; }}
  .eyebrow {{ font-size:11px; letter-spacing:.22em; text-transform:uppercase; color:var(--teal); font-weight:700; }}
  h1 {{ font-family:Georgia,"Iowan Old Style",Palatino,serif; font-weight:600;
        font-size:clamp(28px,8vw,40px); line-height:1.08; margin:.32em 0 .15em;
        text-wrap:balance; color:var(--cream); }}
  h1 em {{ font-style:italic; color:var(--green); }}
  .lede {{ color:var(--teal); font-size:15px; max-width:46ch; }}
  .lede b {{ color:var(--cream); font-weight:600; }}
  .meta {{ margin-top:14px; display:inline-flex; align-items:center; gap:8px; font-size:12.5px;
    color:var(--teal-dim); font-weight:600; letter-spacing:.01em; }}
  .meta .mic {{ font-size:14px; }}
  .meta b {{ color:var(--teal); font-weight:700; }}
  .allbar {{ display:flex; align-items:center; gap:12px 14px; flex-wrap:wrap; margin:18px 0 6px; padding:14px 16px;
    border:1px solid var(--line); border-radius:16px;
    background:linear-gradient(180deg,rgba(143,192,184,.07),rgba(143,192,184,.02)); }}
  .allbar .t {{ font-size:13.5px; color:var(--teal); flex:1; min-width:140px; }}
  .allbar .t b {{ color:var(--cream); }}
  .abtns {{ display:flex; gap:8px; flex-wrap:wrap; }}
  .playorig {{ display:inline-flex; align-items:center; gap:9px; cursor:pointer;
    border:1px solid rgba(143,192,184,.5); background:transparent; color:var(--teal);
    border-radius:999px; padding:10px 16px; font-size:13px; font-weight:700; letter-spacing:.02em; }}
  .playorig:hover {{ background:rgba(143,192,184,.1); }}
  .playorig.is-playing {{ background:var(--teal); color:#0E1A17; }}
  .playorig:focus-visible, .playfull:focus-visible {{ outline:2px solid var(--cream); outline-offset:2px; }}
  .playfull {{ display:inline-flex; align-items:center; gap:9px; cursor:pointer;
    border:1px solid rgba(121,210,155,.55); background:transparent; color:var(--green);
    border-radius:999px; padding:10px 16px; font-size:13px; font-weight:700; letter-spacing:.02em; }}
  .playfull:hover {{ background:var(--green-bg); }}
  .playfull.is-playing {{ background:var(--green); color:#0E1A17; }}
  .playall {{ display:inline-flex; align-items:center; gap:9px; cursor:pointer; border:none;
    border-radius:999px; padding:11px 17px; font-size:13px; font-weight:700; letter-spacing:.02em;
    color:#0E1A17; background:var(--green); white-space:nowrap; }}
  .playall:focus-visible, .play:focus-visible {{ outline:2px solid var(--cream); outline-offset:2px; }}
  .cards {{ display:flex; flex-direction:column; gap:16px; margin-top:20px; }}
  .card {{ border:1px solid var(--line); border-radius:18px; padding:18px 17px 16px;
    background:rgba(143,192,184,.045); display:flex; flex-direction:column; gap:11px;
    transition:border-color .25s, box-shadow .25s, transform .25s; }}
  .card.is-playing {{ border-color:var(--green); box-shadow:0 0 0 1px var(--green), 0 8px 30px -12px rgba(121,210,155,.5); }}
  .card--good {{ background:linear-gradient(180deg,var(--green-bg),rgba(121,210,155,.03)); border-color:rgba(121,210,155,.4); }}
  .card__h {{ display:flex; }}
  .num {{ font-size:11px; font-weight:700; letter-spacing:.14em; color:var(--teal-dim); font-variant-numeric:tabular-nums; }}
  .card--good .num {{ color:var(--green); }}
  .lbl {{ display:block; font-size:10px; letter-spacing:.18em; text-transform:uppercase; font-weight:700; margin-bottom:5px; }}
  .lbl--said {{ color:var(--red); }}
  .lbl--nat {{ color:var(--green); }}
  .said {{ font-family:Georgia,"Iowan Old Style",Palatino,serif; font-size:17px; line-height:1.5; color:rgba(242,236,224,.6); }}
  .said s {{ text-decoration:line-through; text-decoration-color:var(--red); text-decoration-thickness:2px;
    color:var(--red); background:var(--red-bg); border-radius:4px; padding:0 3px; }}
  .nat {{ border-top:1px dashed var(--line); padding-top:12px; }}
  .nat__t {{ font-family:Georgia,"Iowan Old Style",Palatino,serif; font-size:18px; line-height:1.5; color:var(--cream); margin:0 0 12px; }}
  .nat__t b {{ color:var(--green); background:var(--green-bg); border-radius:4px; padding:0 3px; font-weight:600; }}
  .play {{ display:inline-flex; align-items:center; gap:9px; cursor:pointer; border:1px solid rgba(121,210,155,.55);
    background:transparent; color:var(--green); border-radius:999px; padding:8px 15px 8px 13px; font-size:12.5px;
    font-weight:700; letter-spacing:.04em; transition:background .2s,color .2s; }}
  .play:hover {{ background:var(--green-bg); }}
  .play.is-playing {{ background:var(--green); color:#0E1A17; }}
  .play__i {{ width:0; height:0; border-style:solid; border-width:6px 0 6px 10px; border-color:transparent transparent transparent currentColor; }}
  .play.is-playing .play__i {{ border:none; width:10px; height:11px; border-left:3px solid currentColor; border-right:3px solid currentColor; }}
  .tip {{ font-size:13px; color:var(--teal); line-height:1.45; }}
  .tip i {{ color:var(--cream); font-style:italic; }}
  .tip b {{ color:var(--green); font-weight:600; }}
  .foot {{ margin-top:30px; padding:20px 18px; border:1px solid var(--line); border-radius:18px; background:rgba(143,192,184,.05); }}
  .foot .big {{ font-family:Georgia,"Iowan Old Style",Palatino,serif; font-style:italic; font-size:18px; color:var(--cream); line-height:1.45; margin:0; }}
  .foot .sig {{ margin-top:12px; font-size:13px; color:var(--teal-dim); }}
  .legend {{ display:flex; gap:18px; margin-top:14px; font-size:12px; color:var(--teal-dim); flex-wrap:wrap; }}
  .legend span {{ display:inline-flex; align-items:center; gap:7px; }}
  .dot {{ width:11px; height:11px; border-radius:3px; }}
  .dot--r {{ background:var(--red-bg); border:1px solid var(--red); }}
  .dot--g {{ background:var(--green-bg); border:1px solid var(--green); }}
  .orig-text {{ margin:16px 0 4px; padding:14px 16px; border-radius:16px;
    background:rgba(143,192,184,.06); border:1px solid var(--line); }}
  .orig-text__lbl {{ font-size:10px; font-weight:700; letter-spacing:.18em; text-transform:uppercase;
    color:var(--teal-dim); margin-bottom:8px; }}
  .orig-text__body {{ font-family:Georgia,"Iowan Old Style",Palatino,serif; font-size:15px;
    line-height:1.6; color:rgba(242,236,224,.7); white-space:pre-wrap; margin:0; }}
  @media (prefers-reduced-motion:no-preference) {{
    .card {{ opacity:0; transform:translateY(10px); animation:rise .5s ease forwards; }}
    {rise}
    @keyframes rise {{ to {{ opacity:1; transform:none; }} }}
  }}
</style>

<div class="wrap"><div class="inner">
  <p class="eyebrow">{spec['eyebrow']}</p>
  <h1 class="serif">{spec['title_html']}</h1>
  <p class="lede">{spec['lede_html']}</p>
  {meta_html}
  {orig_text_html}
  <div class="allbar">
    <span class="t"><b>{ui["hear_diff"]}</b> — {ui["hear_sub"]}</span>
    <div class="abtns">
      {orig_btn}
      {full_btn}
      <button class="playall" id="playall"><span class="play__i" aria-hidden="true"></span><span id="pa-x">{ui["all"]}</span></button>
    </div>
  </div>
  <div class="cards">{''.join(card_html)}
  </div>
  <div class="foot">
    <p class="big">{spec['foot_html']}</p>
    <div class="legend">
      <span><span class="dot dot--r"></span> {ui["legend_drop"]}</span>
      <span><span class="dot dot--g"></span> {ui["legend_nat"]}</span>
    </div>
    {sig_html}
  </div>
</div></div>

{orig_audio_tag}
{full_audio_tag}
{audio_tags}

<script>
(function(){{
  var cur=null, curBtn=null, curCard=null;
  function stop(){{
    if(cur){{ cur.pause(); cur.currentTime=0; }}
    if(curBtn){{ curBtn.classList.remove('is-playing'); var x=curBtn.querySelector('.play__x'); if(x)x.textContent='{ui["listen"]}'; }}
    if(curCard) curCard.classList.remove('is-playing');
    cur=curBtn=curCard=null;
    var pa=document.getElementById('pa-x'); if(pa)pa.textContent='{ui["all"]}';
    document.getElementById('playall').classList.remove('is-playing');
    var pox=document.getElementById('po-x'); if(pox)pox.textContent='{ui["orig"]}';
    var pob=document.getElementById('playorig'); if(pob)pob.classList.remove('is-playing');
    var pfx=document.getElementById('pf-x'); if(pfx)pfx.textContent='{ui["full"]}';
    var pfb=document.getElementById('playfull'); if(pfb)pfb.classList.remove('is-playing');
  }}
  function playOne(n, onend){{
    var a=document.getElementById('a'+n);
    var btn=document.querySelector('.play[data-n="'+n+'"]');
    var card=document.getElementById('card-'+n);
    cur=a; curBtn=btn; curCard=card;
    if(btn){{ btn.classList.add('is-playing'); var x=btn.querySelector('.play__x'); if(x)x.textContent='{ui["playing"]}'; }}
    if(card) card.classList.add('is-playing');
    a.onended=function(){{
      if(btn){{ btn.classList.remove('is-playing'); var x=btn.querySelector('.play__x'); if(x)x.textContent='{ui["listen"]}'; }}
      if(card) card.classList.remove('is-playing');
      if(onend) onend();
    }};
    a.play();
  }}
  document.querySelectorAll('.play').forEach(function(b){{
    b.addEventListener('click',function(){{
      var n=this.getAttribute('data-n'); var same = curBtn===this;
      stop(); if(!same) playOne(n);
    }});
  }});
  function playSolo(btn, audioId, xId){{
    var same=curBtn===btn; stop(); if(same) return;
    var a=document.getElementById(audioId); if(!a) return;
    cur=a; curBtn=btn; curCard=null;
    btn.classList.add('is-playing'); var x=document.getElementById(xId); if(x)x.textContent='{ui["playing"]}';
    a.onended=function(){{ stop(); }};
    a.play();
  }}
  var pobtn=document.getElementById('playorig');
  if(pobtn) pobtn.addEventListener('click',function(){{ playSolo(this,'orig','po-x'); }});
  var pfbtn=document.getElementById('playfull');
  if(pfbtn) pfbtn.addEventListener('click',function(){{ playSolo(this,'full','pf-x'); }});
  var order=[{order}];
  document.getElementById('playall').addEventListener('click',function(){{
    if(cur){{ stop(); return; }}
    document.getElementById('pa-x').textContent='{ui["stop"]}';
    this.classList.add('is-playing');
    var i=0;
    (function next(){{
      if(i>=order.length){{ stop(); return; }}
      var n=order[i++];
      playOne(n,next);
      document.getElementById('card-'+n).scrollIntoView({{behavior:'smooth',block:'center'}});
    }})();
  }});
}})();
</script>'''
    return (
        f'<!doctype html>\n<html lang="{lang}">\n<head>\n'
        '<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        '<meta name="theme-color" content="#0E1A17">\n'
        f'<title>{plain(spec["title_html"])}</title>\n'
        '<style>html,body{margin:0;height:100%;background:#0E1A17}</style>\n'
        '</head>\n<body>\n' + body + '\n</body>\n</html>\n'
    )

def main():
    if len(sys.argv) < 2:
        sys.exit("Usage: python3 make-correction-app.py <spec.json>")
    spec = json.load(open(sys.argv[1], encoding="utf-8"))
    key = _env("ELEVENLABS_API_KEY") or sys.exit("ELEVENLABS_API_KEY not set.")
    voice = spec["voice"]
    print(f"{spec['slug']}: {len(spec['cards'])} sentences, voice {voice}")
    os.makedirs(PUBLIC_FEEDBACK, exist_ok=True)
    audio_b64 = {}
    for i, c in enumerate(spec["cards"], 1):
        audio_b64[i] = base64.b64encode(tts_bytes(plain(c["nat"]), voice, key)).decode()
        print(f"  {i:02d} audio ok")
    # One smooth, continuous natural read-through of the whole corrected text — a
    # separate streaming file (not inlined) so the page stays light.
    full_text = " ".join(plain(c["nat"]) for c in spec["cards"])
    full_name = f"{spec['slug']}-full.mp3"
    open(os.path.join(PUBLIC_FEEDBACK, full_name), "wb").write(
        tts_bytes(full_text, voice, key, spec.get("full_speed", 0.95)))
    full = {"url": full_name}
    print(f"  smooth full read-through -> public/feedback/{full_name}")
    original = None
    if spec.get("original_opus"):
        opath = os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), spec["original_opus"])
        orig_name = f"{spec['slug']}-original.mp3"
        mmss = opus_to_mp3_file(opath, os.path.join(PUBLIC_FEEDBACK, orig_name))
        original = {"url": orig_name, "mmss": mmss}  # relative to /feedback/<slug>.html
        print(f"  original voice -> public/feedback/{orig_name} ({mmss})")
    out_html = render(spec, audio_b64, original, full)
    os.makedirs(PUBLIC_FEEDBACK, exist_ok=True)
    out = os.path.join(PUBLIC_FEEDBACK, f"{spec['slug']}.html")
    open(out, "w", encoding="utf-8").write(out_html)
    print(f"\nwrote {out} ({len(out_html)} chars)")
    print(f"link to send:  {LIVE_BASE}/{spec['slug']}.html")
    print(f"in-app: add this learner to src/data/feedback.ts -> /feedback/{spec['slug']}.html")

if __name__ == "__main__":
    main()
