#!/usr/bin/env python3
"""Calidescope — lean site generator. Sparing by design.
Rules held on every page: one governing thought, every claim carries evidence,
one word per idea, no timing promises, no client names, natural language."""
import os

SITE = "https://calidescope.llc"
TL   = "https://throughline.builders"
FORM = "/api/contact"   # our own endpoint — api/contact.js mails it to bret@calidescope.llc

# ── the offer ───────────────────────────────────────────────────────
PARTS = {
 "promise": dict(name="Promise", verb="Win it", h1="Win it.", colour="var(--blue)", cls="b",
   line="Your deck gets forwarded. It has to work without you in the room.",
   get=[("Your deck or page, marked up.","Line by line, where a reader speeds up and where they stop.","markup"),
        ("A score out of 100.","So you can tell if the next version is better.","score"),
        ("The section that matters, rewritten.","Copy you can paste in.","pen")],
   pain="The line your buyer repeats to their boss. The page that turns a visit into a call.",
   cases=["renamed","platform","search"]),
 "perform": dict(name="Perform", verb="Keep it", h1="Keep it.", colour="var(--violet)", cls="v",
   line="Sales hands to delivery.",
   get=[("A map of how the work moves today.","Every handoff, in order.","map"),
        ("The two or three changes worth making first.","Ranked, with what each one frees up.","rank"),
        ("A meeting agenda and a handoff doc.","With names and dates on them.","cal")],
   pain="The Monday meeting that ends with owners and dates. The handoff doc someone owns.",
   cases=["analytics","venues","merger"]),
 "proof": dict(name="Proof", verb="Renew it", h1="Renew it.", colour="var(--pink)", cls="p",
   line="Your client has to defend the renewal.",
   get=[("Your quarterly review, marked up.","Slide by slide, where the claim comes through.","markup"),
        ("One claim, with the evidence under it.","A number finance can check on their own.","claim"),
        ("The rewrite.","Copy you can paste in.","pen")],
   pain="The quarterly review that ends in a renewal. The case study your next prospect reads.",
   cases=["atrisk","fiveceos","forecast"]),
}

# ── the record — nine engagements, client names withheld ────────────
CASES = [
 dict(k="renamed", part="promise", slug="case-study-data-business-renamed", n="+70%",
   head="One promise, after three renames.", who="Holding company one", when="2025&ndash;2026",
   chips=[("+70%","REVENUE, ONE YEAR"),("3","RENAMES SURVIVED")],
   s="A data business inside a global holding company had been renamed three times in four years.",
   t="Give it one promise its own sellers could repeat.",
   a="Rebuilt the pitch top down: one claim, the support under it, one ask.",
   r="Revenue grew 70% in a year."),
 dict(k="platform", part="promise", slug="case-study-platform-adoption", n="5&times;",
   head="Putting a finished platform to work.", who="Holding company one", when="2018",
   chips=[("5&times;","REVENUE"),("300%","USAGE GROWTH")],
   s="An identity platform was built, funded and launched. Adoption was the next job.",
   t="Show the planning teams what it did, in their own terms.",
   a="Rewrote the internal pitch as one argument, and took it to the planning teams.",
   r="Usage and the revenue attached to it grew fivefold."),
 dict(k="search", part="promise", slug="case-study-search-to-store", n="$2M",
   head="Proving search drove store sales, in a recession.", who="An analytics firm, London", when="2007&ndash;2010",
   chips=[("$2M","NEW BUSINESS"),("3&times;","RENEWAL RATE")],
   s="A US analytics firm opened in London into the worst ad market in thirty years.",
   t="Make an econometric argument a marketing director could repeat to a finance director.",
   a="Built the models, then built the pitch around one claim with the evidence stacked under it.",
   r="Two million in new international business, and the renewal rate tripled."),
 dict(k="atrisk", part="proof", slug="case-study-account-at-risk", n="Renewed",
   head="Turning a quarterly review into a renewal.", who="A financial services account", when="2022&ndash;2023",
   chips=[("Renewed","THE ACCOUNT"),("4","QUARTERS REBUILT")],
   s="The account was up for its annual look, and the quarterly review was the room that would decide it.",
   t="Build the review around the effect of the work.",
   a="Rebuilt the review around one claim with evidence under it, then rebuilt the cadence that fed it.",
   r="The account renewed."),
 dict(k="fiveceos", part="proof", slug="case-study-five-ceos", n="$40M+",
   head="Five CEOs, one platform.", who="Holding company two", when="2018&ndash;2020",
   chips=[("$40M+","ACCOUNTS RETAINED"),("20+","GLOBAL TEAM")],
   s="Five operating companies, five CEOs, five separate audience platforms.",
   t="Land on one without losing the clients attached to the other four.",
   a="Built a single global data layer, then made the case for it one company at a time.",
   r="Over forty million in accounts retained through the consolidation."),
 dict(k="analytics", part="perform", slug="case-study-analytics-revenue", n="+150%",
   head="Five teams, one way of working.", who="Holding company three", when="2010&ndash;2017",
   chips=[("+150%","ANALYTICS REVENUE"),("40+","PEOPLE LED")],
   s="Five analytics teams sat across one network, each with its own way of running a job.",
   t="Get them onto one operating model, and make the work visible enough to pay for.",
   a="Consolidated the teams, set one intake and one reporting rhythm, and gave every client a single claim per quarter.",
   r="Analytics revenue grew 150% across the portfolio."),
 dict(k="venues", part="perform", slug="case-study-venue-portfolio", n="$50M",
   head="One view of the audience, across every venue.", who="A live-entertainment group", when="2003&ndash;2007",
   chips=[("$50M","TICKET SALES ENABLED")],
   s="Each venue ran its own ticketing system, so a fan who came in two cities looked like two people.",
   t="Build one shared view, and give operators a reason to work from it.",
   a="Designed the shared data layer, then built the weekly reporting each venue actually used.",
   r="Fifty million in ticket sales enabled across the portfolio."),
 dict(k="merger", part="perform", slug="case-study-merger-records", n="$25M",
   head="One customer record, after a merger.", who="A national venue brand", when="2001&ndash;2002",
   chips=[("$25M","SALES GENERATED")],
   s="Two businesses merged, each arriving with its own customer list and its own way of using it.",
   t="Build one record, and set the handoffs so both sides worked from it.",
   a="Built the database, then put marketing and the venues on one intake and one campaign rhythm.",
   r="Twenty-five million in sales generated against the new record."),
 dict(k="forecast", part="proof", slug="case-study-demand-forecast", n="&plusmn;3%",
   head="Forecasting demand before the tools existed.", who="A national telecom", when="1995&ndash;1999",
   chips=[("&plusmn;3%","30-DAY ACCURACY")],
   s="Thirty-day demand forecasts were needed before the modelling tools were commercially available.",
   t="Build the forecast, and make the number trusted enough to plan against.",
   a="Built the models in-house, then showed operators where the forecast had been right and where it missed.",
   r="Forecasts landed within three percent, and were used for capacity planning."),
]
BYK = {c["k"]: c for c in CASES}

WHEEL = ('<svg width="{w}" height="{w}" viewBox="0 0 40 40" fill="none" stroke="#1F2024" stroke-width="{sw}"'
 ' aria-hidden="true"><circle cx="20" cy="20" r="17"/><path d="M20 3v34M5 11.5l30 17M5 28.5l30-17"/>'
 '<circle cx="20" cy="20" r="3.2" fill="#1F2024" stroke="none"/></svg>')
MARKS = {"promise":'<path d="M20 7 L34 32 L6 32 Z" fill="none" stroke="{c}" stroke-width="2.6" stroke-linejoin="round"/>',
         "perform":'<rect x="8" y="8" width="24" height="24" fill="none" stroke="{c}" stroke-width="2.6"/>',
         "proof":'<circle cx="20" cy="20" r="13" fill="none" stroke="{c}" stroke-width="2.6"/>'}
def mark(p, s=36):
    return (f'<svg width="{s}" height="{s}" viewBox="0 0 40 40" aria-hidden="true" style="display:block;margin-bottom:18px">'
            + MARKS[p].format(c=PARTS[p]["colour"]) + '</svg>')

# the knot: doubles back, crosses three times, five points visible — then one line
DRAW = """<svg class="draw" viewBox="0 0 440 340" width="100%" style="display:block;max-width:450px;margin:0 auto"
     aria-label="A tangled pitch, doubling back on itself, straightened into one line">
  <path class="ink" pathLength="1" d="M28 78 C70 26 128 34 148 82 C168 130 96 156 74 118 C52 80 132 46 214 74
        C286 98 268 158 206 148 C144 138 190 60 268 62 C318 63 340 96 326 124"
        fill="none" stroke="#1F2024" stroke-width="2.6" stroke-linecap="round"/>
  <circle class="knot k1" cx="28"  cy="78"  r="5" fill="#1F2024"/>
  <circle class="knot k2" cx="148" cy="82"  r="5" fill="#1F2024"/>
  <circle class="knot k3" cx="74"  cy="118" r="5" fill="#1F2024"/>
  <circle class="knot k4" cx="206" cy="148" r="5" fill="#1F2024"/>
  <circle class="knot k5" cx="326" cy="124" r="5" fill="#1F2024"/>
  <path class="fall" pathLength="1" d="M220 196 v40" fill="none" stroke="#6E6B65" stroke-width="2" stroke-linecap="round"/>
  <path class="pop n1" d="M212 234 L220 250 L228 234 z" fill="#6E6B65"/>
  <path class="line" pathLength="1" d="M34 292 H386" fill="none" stroke="#1E40FF" stroke-width="3.4" stroke-linecap="round"/>
  <circle class="pop n2" cx="34"  cy="292" r="7.5" fill="#1E40FF"/>
  <circle class="pop n3" cx="152" cy="292" r="7.5" fill="#7A3AD2"/>
  <circle class="pop n4" cx="270" cy="292" r="7.5" fill="#E933A6"/>
  <path class="pop n4" d="M386 281 L414 292 L386 303 z" fill="#1E40FF"/>
</svg>"""



# ── small ink glyphs. Geometric, 2px, no ornament. ──
GLYPH = {
 "deck":'<rect x="4" y="8" width="48" height="32" rx="1"/><path d="M14 20h20M14 28h12"/><path d="M28 40v6M20 46h16"/>',
 "home":'<rect x="4" y="8" width="48" height="40" rx="1"/><path d="M4 18h48"/><circle cx="11" cy="13" r="1.6" fill="currentColor" stroke="none"/><path d="M14 28h26M14 36h16"/>',
 "sales":'<rect x="10" y="4" width="36" height="48" rx="1"/><path d="M19 16h18M19 25h18M19 34h11"/>',
 "case":'<rect x="6" y="6" width="44" height="44" rx="1"/><path d="M15 40V29M25 40V22M35 40V33M45 40V15"/>',
 "flow":'<rect x="3" y="16" width="18" height="18" rx="1"/><rect x="35" y="16" width="18" height="18" rx="1"/><path d="M23 25h8M27 21l5 4-5 4"/>',
 "markup":'<rect x="8" y="5" width="40" height="46" rx="1"/><path d="M17 17h22M17 35h22M17 43h13"/><path d="M17 26h22"/><circle cx="28" cy="26" r="9"/>',
 "score":'<path d="M7 42a21 21 0 0 1 42 0"/><path d="M28 42 40 27"/><circle cx="28" cy="42" r="3" fill="currentColor" stroke="none"/><path d="M7 47h42"/>',
 "pen":'<rect x="8" y="5" width="32" height="46" rx="1"/><path d="M17 17h14M17 26h9"/><path d="M47 22 27 42l-7 2 2-7z"/>',
 "map":'<circle cx="10" cy="14" r="5"/><circle cx="28" cy="34" r="5"/><circle cx="46" cy="14" r="5"/><path d="M14 18l10 12M32 30l10-12"/><path d="M28 39v9M22 48h12"/>',
 "rank":'<path d="M6 13h42M6 27h28M6 41h14"/><circle cx="52" cy="13" r="2.4" fill="currentColor" stroke="none"/>',
 "cal":'<rect x="5" y="10" width="46" height="40" rx="1"/><path d="M5 22h46M17 5v9M39 5v9"/><path d="M15 32h8M15 41h8M31 32h10M31 41h6"/>',
 "claim":'<rect x="12" y="5" width="32" height="14" rx="1"/><path d="M28 19v9M12 28h32M12 28v6M28 28v6M44 28v6"/><rect x="5" y="34" width="14" height="14" rx="1"/><rect x="21" y="34" width="14" height="14" rx="1"/><rect x="37" y="34" width="14" height="14" rx="1"/>',
}
def glyph(k, size=52, cls="gl"):
    return ('<svg class="%s" viewBox="0 0 56 56" width="%d" height="%d" aria-hidden="true" fill="none" '
            'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">%s</svg>'
            % (cls, size, size, GLYPH[k]))

# ── the three jobs, in order. HTML not SVG, so the labels stay readable on a phone. ──
NUMWORD = {2:'two',3:'three',4:'four'}
ZONES_BY = [("promise",["Homepage","Deck","Proposal"]),("perform",["Kickoff","Handoff","Cadence"]),("proof",["Review","Renewal"])]
ZONES = [("Promise","promise","b",["Homepage","Deck","Proposal"]),
         ("Perform","perform","v",["Kickoff","Handoff","Cadence"]),
         ("Proof","proof","k",["Review","Renewal"])]

def arc(active=None):
    """active: a part key, or None to light all three."""
    out = ['<div class="arc">']
    for name, key, cls, stops in ZONES:
        lit = "lit " + cls if (active is None or active == key) else "dim"
        dots = "".join(f'<span class="stop"><i></i><em>{t}</em></span>' for t in stops)
        out.append(f'<div class="zone {lit}"><span class="zn">{name}</span>'
                   f'<div class="stops">{dots}</div></div>')
    out.append('<div class="tip" aria-hidden="true">'
               '<svg viewBox="0 0 34 16" width="34" height="16"><path d="M0 8h26M22 2l8 6-8 6" '
               'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
               '</div>')
    out.append('</div>')
    return "".join(out)

NAV = [("promise.html","Promise"),("perform.html","Perform"),("proof.html","Proof"),
       ("case-studies.html","Case studies"),("why.html","About")]

def shell(page, title, desc, body, cls="", js="", noindex=False):
    ON = ' class="on"'
    links = "".join('<a href="%s"%s>%s</a>' % (h, ON if h == page else "", t) for h, t in NAV)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
{'<meta name="robots" content="noindex">' if noindex else ''}
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="website">
<meta property="og:url" content="{SITE}/{page}">
<link rel="canonical" href="{SITE}/{page}">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<!-- Local fonts only. No third-party font call anywhere — see privacy.html -->
<link rel="stylesheet" href="assets/fonts/fonts.css">
<link rel="stylesheet" href="assets/site.css">
</head>
<body class="{cls}">
<a class="skip" href="#main">Skip to content</a>
<nav><div class="wrap in">
  <a class="logo" href="index.html">{WHEEL.format(w=23,sw=1.8)}Calidescope</a>
  <div class="links">{links}<a href="{TL}" target="_blank" rel="noopener" class="btn">Get a read &nearr;</a></div>
</div></nav>
<main id="main">
{body}
</main>
<div class="wrap"><footer>
  <span class="m">Calidescope &middot; Promise to Proof.</span>
  <div class="fl">
    <a href="promise.html">Promise</a><a href="perform.html">Perform</a><a href="proof.html">Proof</a>
    <a href="throughline.html">Throughline</a><a href="case-studies.html">Case studies</a>
    <a href="why.html">About</a><a href="contact.html">Contact</a>
    <a href="privacy.html">Privacy</a><a href="terms.html">Terms</a>
  </div>
</footer></div>
<script src="assets/consent.js" defer></script>
{f'<script src="{js}" defer></script>' if js else ''}
</body>
</html>
"""

def getlist(items, acc_note=""):
    rows = "".join(
      f'<div class="i"><span class="ic">{glyph(g, 40)}</span>'
      f'<span class="no">0{i+1}</span><p class="t"><b>{a}</b> <span>{b}</span></p></div>'
      for i,(a,b,g) in enumerate(items))
    tail = f'<p class="note">{acc_note}</p>' if acc_note else ""
    return f'<h2>What you get back.</h2><div class="list">{rows}</div>{tail}'

def case_tile(c):
    return (f'<a class="case {PARTS[c["part"]]["cls"]}" href="{c["slug"]}.html">'
            f'<p class="n">{c["n"]}</p><h3>{c["head"]}</h3>'
            f'<span class="w">{c["who"]} &middot; {c["when"]} &rarr;</span></a>')

PAGES = {}

# ══════════ HOME ══════════
PAGES["index.html"] = dict(cls="", title="Calidescope &mdash; Win it. Then keep it.",
 desc="You're good at the work. The hard part is getting people to see it when you're not in the room. Calidescope works on the pitch, the process and the proof.",
 body=f"""
<section class="hero"><div class="wrap grid">
  <div>
    <h1>Win it.<br>Then keep it.</h1>
    <p class="lead">You're good at the work. The hard part is getting people to see it when you're not in the room.</p>
    <div class="acts">
      <a href="{TL}" target="_blank" rel="noopener" class="btn lg">Get a read on your page &nearr;</a>
      <a href="#get" class="plain">Or see what you get</a>
    </div>
  </div>
  <div>{DRAW}</div>
</div></section>

<div class="strip"><div class="wrap"><p>For people with deep expertise who also have to sell.</p></div></div>

<section class="sec"><div class="wrap">
  <div class="row3">
    <div>{mark('promise',30)}<p class="p">Promise</p><span class="do mono b">Win it</span>
      <p class="d">Your deck and your homepage, so they hold up when you're not there.</p></div>
    <div>{mark('perform',30)}<p class="p">Perform</p><span class="do mono v">Keep it</span>
      <p class="d">Your handoffs and your meetings, so work moves between teams.</p></div>
    <div>{mark('proof',30)}<p class="p">Proof</p><span class="do mono k">Renew it</span>
      <p class="d">Your reviews and case studies, so a client can see what they got.</p></div>
  </div>
  <p class="note">We do all three by hand. The first one is also software:
    <a href="throughline.html">Throughline</a> reads your page and scores it. Free, and live now.</p>
</div></section>

<section class="sec sand"><div class="wrap">
  <h2>Three jobs, in order.</h2>
  {arc()}
</div></section>

<section class="sec" id="get"><div class="wrap">
  {getlist(PARTS['promise']['get'], "Workflow and review work come back the same way.")}
</div></section>

<section class="nums"><div class="wrap g">
  <a href="case-study-data-business-renamed.html"><p class="n">+70%</p><p class="c">revenue in a year &middot; holding company one</p><span class="go">Read it &rarr;</span></a>
  <a href="case-study-five-ceos.html"><p class="n">$40M+</p><p class="c">in accounts kept &middot; holding company two</p><span class="go">Read it &rarr;</span></a>
  <a href="case-studies.html"><p class="n">300+</p><p class="c">pitches and reviews since 2001</p><span class="go">All nine &rarr;</span></a>
</div></section>

<section class="sec sand"><div class="wrap">
  <h2>Which one could be better?</h2>
  <div class="tiles">
    <div class="tile"><svg class="gl" viewBox="0 0 56 56" width="52" height="52" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="48" height="32" rx="1"/><path d="M14 20h20M14 28h12"/><path d="M28 40v6M20 46h16"/></svg><b>The deck</b><p>One line the room repeats.</p></div>
    <div class="tile"><svg class="gl" viewBox="0 0 56 56" width="52" height="52" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="48" height="40" rx="1"/><path d="M4 18h48"/><circle cx="11" cy="13" r="1.6" fill="currentColor" stroke="none"/><path d="M14 28h26M14 36h16"/></svg><b>The homepage</b><p>Traffic that turns into calls.</p></div>
    <div class="tile"><svg class="gl" viewBox="0 0 56 56" width="52" height="52" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="4" width="36" height="48" rx="1"/><path d="M19 16h18M19 25h18M19 34h11"/></svg><b>The sales material</b><p>The thing only you can say.</p></div>
    <div class="tile"><svg class="gl" viewBox="0 0 56 56" width="52" height="52" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="44" height="44" rx="1"/><path d="M15 40V29M25 40V22M35 40V33M45 40V15"/></svg><b>The case study</b><p>What changed for the client.</p></div>
    <div class="tile"><svg class="gl" viewBox="0 0 56 56" width="52" height="52" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="16" width="18" height="18" rx="1"/><rect x="35" y="16" width="18" height="18" rx="1"/><path d="M23 25h8M27 21l5 4-5 4"/></svg><b>The workflow</b><p>A clean handoff, every time.</p></div>
  </div>
  <p class="punch">Your work is the best in the room. <span>When the collateral is too, they choose you twice.</span></p>
  <div class="acts" style="margin-top:44px">
    <a href="contact.html" class="btn lg">Show us something that could be better</a>
    <a href="{TL}" target="_blank" rel="noopener" class="plain">Or score it yourself first &nearr;</a>
  </div>
</div></section>
""")

# ══════════ THE THREE PART PAGES ══════════
for key, p in PARTS.items():
    tiles = "".join(case_tile(BYK[k]) for k in p["cases"])
    PAGES[f"{key}.html"] = dict(cls=key,
      title=f'{p["name"]} &mdash; {p["h1"]} &middot; Calidescope',
      desc=f'{p["line"]} {p["get"][0][0]} {p["get"][2][0]}',
      body=f"""
<section class="hero tint"><div class="wrap">
  {mark(key)}
  <p class="mono acc" style="margin:0 0 16px">{p['name']} &middot; {p['verb'].lower()}</p>
  <h1>{p['h1']}</h1>
  <p class="lead">{p['line']}</p>
  <div class="acts"><a href="contact.html" class="btn lg">Show us something that could be better</a></div>
</div></section>

<section class="sec"><div class="wrap">
  {arc(key)}
  <p class="punch" style="margin-top:44px;max-width:26ch">{p['pain']}</p>
</div></section>

<section class="sec sand"><div class="wrap">
  {getlist(p['get'])}
</div></section>

<section class="sec"><div class="wrap">
  <h2>Where it worked.</h2>
  <div class="cases">{tiles}</div>
  <p class="note"><a href="case-studies.html">All nine &rarr;</a></p>
</div></section>
""")

# ══════════ THROUGHLINE ══════════
PAGES["throughline.html"] = dict(cls="promise",
 title="Throughline &mdash; paste a page, get a read &middot; Calidescope",
 desc="Throughline reads your page the way its readers will and shows you the one thing to fix. Free, and live now.",
 body=f"""
<section class="hero tint"><div class="wrap">
  <p class="mono acc" style="margin:0 0 16px">Promise &middot; the software</p>
  <h1>Throughline.</h1>
  <p class="lead">Paste a URL. You get a score out of 100 and the one change that matters most.</p>
  <div class="acts">
    <a href="{TL}" target="_blank" rel="noopener" class="btn lg">Get a read on your page &nearr;</a>
    <span class="mono">Free &middot; live now</span>
  </div>
</div></section>

<section class="sec"><div class="wrap">
  <h2>Three steps.</h2>
  <div class="list">
    <div class="i"><span class="no">01</span><p class="t"><b>Paste a URL.</b> <span>Nothing to install.</span></p></div>
    <div class="i"><span class="no">02</span><p class="t"><b>Pick what matters</b> <span>for the page in front of you.</span></p></div>
    <div class="i"><span class="no">03</span><p class="t"><b>Make the moves.</b> <span>Ranked, with the reason for each one.</span></p></div>
  </div>
  <p class="note">It reads your page three ways: the person who has to approve it, the person skimming it
    on a phone, and the person looking for the catch.</p>
</div></section>

<section class="sec sand"><div class="wrap">
  <h2>Throughline reads pages.<br>We read the rest.</h2>
  <div class="row3">
    <div>{mark('promise',30)}<p class="p">Promise</p><span class="do mono b">Win it</span>
      <p class="d">Decks, homepages, proposals. Throughline, or by hand.</p></div>
    <div>{mark('perform',30)}<p class="p">Perform</p><span class="do mono v">Keep it</span>
      <p class="d">Handoffs and meetings. By hand.</p></div>
    <div>{mark('proof',30)}<p class="p">Proof</p><span class="do mono k">Renew it</span>
      <p class="d">Reviews and case studies. By hand.</p></div>
  </div>
  <p class="note"><a href="contact.html">Show us something that could be better &rarr;</a></p>
</div></section>
""")

# ══════════ CASE STUDIES ══════════
prom = [c for c in CASES if c["part"] == "promise"]
perf = [c for c in CASES if c["part"] == "perform"]
prf  = [c for c in CASES if c["part"] == "proof"]
PAGES["case-studies.html"] = dict(cls="",
 title="Case studies &mdash; nine of them &middot; Calidescope",
 desc="Nine engagements, three under each part. Client names withheld. The numbers are as they were.",
 body=f"""
<section class="hero"><div class="wrap">
  <h1>Won it.<br>Then kept it.</h1>
</div></section>

<section class="sec"><div class="wrap">
  <h2>Promise &mdash; winning it.</h2>
  <div class="cases">{"".join(case_tile(c) for c in prom)}</div>
</div></section>

<section class="sec sand"><div class="wrap">
  <h2>Perform &mdash; running it.</h2>
  <div class="cases">{"".join(case_tile(c) for c in perf)}</div>
</div></section>

<section class="sec"><div class="wrap">
  <h2>Proof &mdash; renewing it.</h2>
  <div class="cases">{"".join(case_tile(c) for c in prf)}</div>
</div></section>

<section class="sec sand"><div class="wrap">
  <p class="punch" style="margin:0">Yours is next. <span>Show us something you think could be better.</span></p>
  <div class="acts" style="margin-top:36px"><a href="contact.html" class="btn lg">Show us something that could be better</a></div>
</div></section>
""")

# ══════════ CASE DETAIL ══════════
for i, c in enumerate(CASES):
    p = PARTS[c["part"]]
    prev_c, next_c = (CASES[i-1] if i else None), (CASES[i+1] if i < len(CASES)-1 else None)
    chips = "".join(f'<div class="chip"><span class="v">{v}</span><span class="k">{k}</span></div>' for v,k in c["chips"])
    pager = ('<div class="pager">'
      + (f'<a href="{prev_c["slug"]}.html">&larr; {prev_c["head"]}</a>' if prev_c else "<span></span>")
      + (f'<a href="{next_c["slug"]}.html" style="text-align:right">{next_c["head"]} &rarr;</a>' if next_c else "<span></span>")
      + '</div>')
    PAGES[c["slug"] + ".html"] = dict(cls=c["part"],
      title=f'{c["head"]} &middot; Calidescope', desc=f'{c["s"]} {c["r"]}',
      body=f"""
<section class="hero"><div class="wrap">
  <a href="case-studies.html" class="back">&larr; All nine</a>
  {mark(c['part'], 32)}
  <p class="mono acc" style="margin:0 0 16px">{p['name']} &middot; {p['verb'].lower()} &middot; {c['when']}</p>
  <h1 style="font-size:clamp(34px,4.6vw,60px);max-width:18ch">{c['head']}</h1>
  <p class="lead" style="margin-bottom:30px">{c['who']}</p>
  <div class="chips">{chips}</div>
</div></section>

<section class="sec" style="padding-top:0"><div class="wrap">
  <div class="star"><span class="l">Situation</span><p>{c['s']}</p></div>
  <div class="star"><span class="l">Task</span><p>{c['t']}</p></div>
  <div class="star"><span class="l">Action</span><p>{c['a']}</p></div>
  <div class="star"><span class="l">Result</span><p>{c['r']}</p></div>
  {pager}
  <div class="acts" style="margin-top:44px"><a href="contact.html" class="btn lg">Show us something that could be better</a></div>
</div></section>
""")

# ══════════ ABOUT ══════════
PAGES["why.html"] = dict(cls="",
 title="About &mdash; Calidescope",
 desc="Thirty years on both sides of the promise and the proof. Bret Leece, and the discipline Calidescope runs on.",
 body="""
<section class="hero"><div class="wrap">
  <h1>Why.</h1>
  <p class="lead">One page can be read six ways. Six of them, held against each other, tell you what to change.</p>
</div></section>

<section class="sec" style="padding-top:0"><div class="wrap">
  <div class="stats">
    <div><p class="n">300+</p><p>pitches and reviews since 2001, on both sides of the table</p></div>
    <div><p class="n">30 years</p><p>on both sides of the promise and the proof</p></div>
    <div><p class="n">One founder</p><p>so you get the person who does the work</p></div>
  </div>
  <p class="note" style="max-width:52ch">Bret Leece. Agencies, holding companies, measurement firms, and the
    software built inside all of them. Take what you found, what it means and what to do next, and make it simple.</p>
</div></section>

<section class="sec sand"><div class="wrap">
  <div class="row3">
    <div><p class="p">The pitch</p><span class="do mono b">Promise</span><p class="d">Keeping one idea clear while the deck grows.</p></div>
    <div><p class="p">The workflow</p><span class="do mono v">Perform</span><p class="d">Most of the gain is between the teams.</p></div>
    <div><p class="p">The proof</p><span class="do mono k">Proof</span><p class="d">The number is easy. The claim it supports is the work.</p></div>
  </div>
  <div class="acts" style="margin-top:40px"><a href="contact.html" class="btn lg">Show us something that could be better</a></div>
</div></section>
""")

# ══════════ CONTACT ══════════
PAGES["contact.html"] = dict(cls="promise", js="assets/contact.js",
 title="Show us something you think could be better &middot; Calidescope",
 desc="Send one thing and one line about what it has to do. We read it and hand back something you can use right away.",
 body=f"""
<section class="hero"><div class="wrap">
  <h1>Show us something<br>you think could be better.</h1>
  <p class="lead">One thing at a time works best.</p>
</div></section>

<section class="sec" style="padding-top:0"><div class="wrap">
  <form class="form" id="cform" action="{FORM}" method="POST">
    <div class="f"><label for="name">Your name</label><input id="name" name="name" type="text" autocomplete="name" maxlength="120" required></div>
    <div class="f"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" maxlength="200" required></div>
    <div class="f"><label for="what">What is it?</label>
      <select id="what" name="what" required>
        <option value="">Pick one</option>
        <option>A homepage</option><option>A pitch deck</option><option>A proposal</option>
        <option>Sales material</option><option>A case study</option>
        <option>A quarterly review</option><option>A renewal deck</option>
        <option>A workflow</option><option>Something else</option>
      </select></div>
    <div class="f"><label for="link">Link, if there is one</label><input id="link" name="link" type="url" maxlength="500" placeholder="https://"></div>
    <div class="f full"><label for="job">What does it have to do?</label>
      <textarea id="job" name="job" maxlength="4000" placeholder="One line is plenty. Win it, keep it, or renew it." required></textarea></div>
    <input class="hp" type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true">
    <div class="full"><button type="submit" class="btn lg" id="csend">Send it over</button>
      <p class="fmsg" id="cmsg" role="status" aria-live="polite" hidden></p></div>
  </form>
  <div class="sent" id="csent" hidden>
    <h2>Got it.</h2>
    <p class="lead">We read it and come back with what we see.</p>
    <p class="note"><a href="{TL}" target="_blank" rel="noopener">Score it yourself on Throughline &nearr;</a></p>
  </div>
  <p class="note" id="cnote">We read it and come back with what we see. If you would rather look first,
    <a href="{TL}" target="_blank" rel="noopener">score it yourself on Throughline &nearr;</a></p>
</div></section>
""")

# ══════════ THANK YOU (the no-JavaScript landing after a send) ══════════
PAGES["thanks.html"] = dict(cls="promise", noindex=True,
 title="Got it &middot; Calidescope",
 desc="We have your note. We read it and come back with what we see.",
 body=f"""
<section class="hero"><div class="wrap">
  <h1>Got it.</h1>
  <p class="lead">We read it and come back with what we see.</p>
</div></section>

<section class="sec" style="padding-top:0"><div class="wrap">
  <p class="note">If you would rather look first,
    <a href="{TL}" target="_blank" rel="noopener">score it yourself on Throughline &nearr;</a></p>
  <p class="note" style="margin-top:14px"><a href="case-studies.html">Or read what this looks like finished &rarr;</a></p>
</div></section>
""")

# ══════════ LEGAL ══════════
EFFECTIVE = "August 4, 2026"

def legal(kicker, lead, sections):
    """A legal page in the site's own hand: hero, then hairline-ruled sections."""
    secs = "".join(f"<section><h2>{h}</h2>{''.join(f'<p>{p}</p>' for p in ps)}</section>"
                   for h, ps in sections)
    return f"""
<section class="hero"><div class="wrap">
  <p class="mono">{kicker}</p>
  <h1>{lead[0]}</h1>
  <p class="lead">{lead[1]}</p>
</div></section>

<section class="sec" style="padding-top:0"><div class="wrap"><div class="legal">
  <p class="eff">Effective {EFFECTIVE}</p>
  {secs}
</div></div></section>
"""

PAGES["privacy.html"] = dict(cls="promise", noindex=True,
 title="Privacy policy &middot; Calidescope",
 desc="What Calidescope collects, which is very little, and what you can ask us to do about it.",
 body=legal("Calidescope LLC",
   ("Privacy policy.", "This site collects almost nothing, and we would like to keep it that way."),
   [("Who we are", [
      'Calidescope LLC, a California limited liability company. For anything in this policy, '
      'use the <a href="contact.html">contact form</a> and say it is about privacy.']),
    ("What we collect", [
      "<b>If you just read:</b> this site sets no tracking cookies and has no accounts. Our host keeps "
      "standard server logs — IP address, browser, pages, timestamps — for security and reliability, as "
      "every website's host does. We do not use those logs to identify or profile you.",
      "<b>Fonts:</b> served from this site directly, so reading it sends your IP address to no font network.",
      "<b>If you use the form:</b> we collect your name, your email, what the thing is, the link if you "
      "give one, and the line about what it has to do. It reaches us as an email and we use it to answer "
      "you. Our mail provider handles that delivery and holds nothing else.",
      "<b>If you subscribe to something</b> — a newsletter, once one exists — we collect your email with "
      "your consent, use it for that alone, and put a working unsubscribe in every issue."]),
    ("Cookies and measurement", [
      "Today: none. No analytics, no advertising pixels, no tracking cookies.",
      "If we ever add measurement, it is opt-in. A banner asks first, nothing loads until you agree, "
      "declining takes the same one click as accepting, and your answer holds for twelve months. The "
      "banner brings its own preferences link so you can change your mind. The only thing kept before "
      "you answer is the answer itself, in your own browser."]),
    ("What we never do", [
      "We do not sell personal information. We do not share it for cross-context behavioural advertising. "
      "We do not buy lists, scrape inboxes, or add anyone to outreach they did not invite."]),
    ("Your rights", [
      "Depending on where you live — the EU and UK under GDPR, California under CCPA and CPRA, and a "
      "growing list of other states — you may have rights to see, correct, delete, or export what we hold, "
      "and to object to some processing. Our policy is simpler than the map: ask through the "
      '<a href="contact.html">contact form</a> and we honour any reasonable request wherever you live, '
      "within thirty days. We hold so little that most of these are short conversations."]),
    ("Other services, how long we keep things, children", [
      'Links here — to <a href="https://throughline.builders" target="_blank" rel="noopener">Throughline</a> '
      "or LinkedIn, say — lead to services with their own policies. Correspondence is kept as long as it is "
      "useful to our working relationship and then deleted in the ordinary course. This is a business site, "
      "not directed at children under sixteen, and we do not knowingly collect their information."]),
    ("Changes", [
      "If this changes in any way that matters — especially if measurement is ever turned on — the date "
      "above moves and the banner does its job before anything else does."])]))

PAGES["terms.html"] = dict(cls="promise", noindex=True,
 title="Terms of use &middot; Calidescope",
 desc="The terms that come with reading calidescope.llc.",
 body=legal("Calidescope LLC",
   ("Terms of use.", "The short version: read it, link to it, keep it as ours."),
   [("The site", [
      'calidescope.llc is the business website of Calidescope LLC ("we", "us"). Using it means you agree '
      "to these terms. If you do not, the fix is easy: do not use the site."]),
    ("What is ours", [
      "The text, the design, the Calidescope name and mark, the case studies and the drawings belong to "
      "Calidescope LLC unless we say otherwise. You are welcome to read it, link to it and share it. You "
      "may not republish it as your own, use it to train a competing product, or use our name or mark "
      "without permission. The case studies describe real engagements without naming the clients."]),
    ("Not advice, and not yet an engagement", [
      "What is here is general information about our work, not professional advice for your situation. "
      'Reading it starts no client relationship. That takes a conversation and an agreement, which is what '
      'the <a href="contact.html">contact form</a> is for.']),
    ("The figures in the case studies", [
      "They are real outcomes from specific engagements, reported accurately and in context. They are "
      "history, not a promise of the same result for you — every situation is its own situation, which is "
      "rather the point of the work."]),
    ("Warranties and liability", [
      'The site is provided "as is". We work to keep it accurate and available, but we make no warranty '
      "about completeness, accuracy or uninterrupted access, and to the fullest extent the law allows, "
      "Calidescope LLC is not liable for damages arising from its use. Links out are a convenience; what "
      "is on the other end is not ours."]),
    ("Governing law", [
      "These terms are governed by the laws of the State of California, without regard to conflict-of-law "
      "rules. Any dispute belongs to the state or federal courts sitting in California."]),
    ("Changes", [
      "We may update these terms. The date above says when we last did. Using the site after a change "
      "means you accept it."])]))

# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    for page, d in PAGES.items():
        open(os.path.join(here, page), "w").write(
          shell(page, d["title"], d["desc"], d["body"],
                d.get("cls",""), d.get("js",""), d.get("noindex", False)))
    urls = "\n".join(f"  <url><loc>{SITE}/{p}</loc><changefreq>monthly</changefreq>"
      f"<priority>{'1.0' if p=='index.html' else '0.6' if p.startswith('case-study-') else '0.8'}</priority></url>"
      for p, d in PAGES.items() if not d.get("noindex"))
    open(os.path.join(here,"sitemap.xml"),"w").write(
      f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}\n</urlset>\n')
    open(os.path.join(here,"robots.txt"),"w").write(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n")
    print(f"{len(PAGES)} pages + sitemap.xml + robots.txt")
