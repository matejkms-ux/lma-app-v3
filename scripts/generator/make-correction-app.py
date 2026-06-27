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
import os, sys, io, re, json, base64, html as _html

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

def tts_b64(text, voice, key):
    r = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice}",
        headers={"xi-api-key": key, "Content-Type": "application/json"},
        json={"text": text, "model_id": "eleven_v3",
              "voice_settings": {"stability": 0.6, "similarity_boost": 0.75, "speed": 0.85}},
        timeout=120)
    if r.status_code != 200:
        sys.exit(f"ElevenLabs {r.status_code}: {r.text[:200]}")
    return base64.b64encode(r.content).decode()

def plain(s):
    return _html.unescape(re.sub(r"<[^>]+>", "", s)).strip()

def render(spec, audio_b64):
    cards = spec["cards"]
    card_html = []
    for i, c in enumerate(cards, 1):
        good = c.get("good")
        badge = "✓ stark" if good else f"{i:02d}"
        card_html.append(f'''
    <article class="card{' card--good' if good else ''}" id="card-{i}">
      <header class="card__h"><span class="num">{badge}</span></header>
      <p class="said"><span class="lbl lbl--said">So gesagt</span>{c['said']}</p>
      <div class="nat">
        <span class="lbl lbl--nat">Natürlich</span>
        <p class="nat__t">{c['nat']}</p>
        <button class="play" data-n="{i}" aria-label="Diesen Satz anhören">
          <span class="play__i" aria-hidden="true"></span><span class="play__x">Anhören</span>
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
  .allbar {{ display:flex; align-items:center; gap:12px; margin:22px 0 6px; padding:14px 16px;
    border:1px solid var(--line); border-radius:16px;
    background:linear-gradient(180deg,rgba(143,192,184,.07),rgba(143,192,184,.02)); }}
  .allbar .t {{ font-size:13.5px; color:var(--teal); flex:1; }}
  .allbar .t b {{ color:var(--cream); }}
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
  <div class="allbar">
    <span class="t"><b>Die ganze Geschichte</b> — richtig gesprochen, Satz für Satz.</span>
    <button class="playall" id="playall"><span class="play__i" aria-hidden="true"></span><span id="pa-x">Alles anhören</span></button>
  </div>
  <div class="cards">{''.join(card_html)}
  </div>
  <div class="foot">
    <p class="big">{spec['foot_html']}</p>
    <div class="legend">
      <span><span class="dot dot--r"></span> weglassen / ändern</span>
      <span><span class="dot dot--g"></span> so ist es natürlich</span>
    </div>
    <p class="sig">{spec['sig']}</p>
  </div>
</div></div>

{audio_tags}

<script>
(function(){{
  var cur=null, curBtn=null, curCard=null;
  function stop(){{
    if(cur){{ cur.pause(); cur.currentTime=0; }}
    if(curBtn){{ curBtn.classList.remove('is-playing'); var x=curBtn.querySelector('.play__x'); if(x)x.textContent='Anhören'; }}
    if(curCard) curCard.classList.remove('is-playing');
    cur=curBtn=curCard=null;
    var pa=document.getElementById('pa-x'); if(pa)pa.textContent='Alles anhören';
    document.getElementById('playall').classList.remove('is-playing');
  }}
  function playOne(n, onend){{
    var a=document.getElementById('a'+n);
    var btn=document.querySelector('.play[data-n="'+n+'"]');
    var card=document.getElementById('card-'+n);
    cur=a; curBtn=btn; curCard=card;
    if(btn){{ btn.classList.add('is-playing'); var x=btn.querySelector('.play__x'); if(x)x.textContent='Läuft…'; }}
    if(card) card.classList.add('is-playing');
    a.onended=function(){{
      if(btn){{ btn.classList.remove('is-playing'); var x=btn.querySelector('.play__x'); if(x)x.textContent='Anhören'; }}
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
  var order=[{order}];
  document.getElementById('playall').addEventListener('click',function(){{
    if(cur){{ stop(); return; }}
    document.getElementById('pa-x').textContent='Stopp';
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
        '<!doctype html>\n<html lang="de">\n<head>\n'
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
    audio_b64 = {}
    for i, c in enumerate(spec["cards"], 1):
        audio_b64[i] = tts_b64(plain(c["nat"]), voice, key)
        print(f"  {i:02d} audio ok")
    out_html = render(spec, audio_b64)
    os.makedirs(PUBLIC_FEEDBACK, exist_ok=True)
    out = os.path.join(PUBLIC_FEEDBACK, f"{spec['slug']}.html")
    open(out, "w", encoding="utf-8").write(out_html)
    print(f"\nwrote {out} ({len(out_html)} chars)")
    print(f"link to send:  {LIVE_BASE}/{spec['slug']}.html")
    print(f"in-app: add this learner to src/data/feedback.ts -> /feedback/{spec['slug']}.html")

if __name__ == "__main__":
    main()
