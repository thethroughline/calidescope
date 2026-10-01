# -*- coding: utf-8 -*-
"""The record under /dev/record: the hub pages, rehosted on calidescope.llc.

Sources: hub/*.html and hub/sectors/*.html (the published hub, byte for byte),
notes/*.md (the two research notes). Output: ../../dev/record/.
The CSV and JSON files under dev/record/{data,adjudication} are the hub's own,
copied verbatim; this script does not touch them.

What the rehost changes, and nothing else:
  - Google Fonts -> the site's local fonts (/assets/fonts/fonts.css) + favicon + noindex
  - sector pages: hrefs written root-relative on the hub get ../ so they resolve here
  - index: a proper <head>; ids on the categories / adjudication / data sections so the
    deck's four cards can land on them; "The argument" card -> the Outcomes Opportunity
    deck; a back link to the deck; "140 companies read" -> 138 (two sites blocked
    capture); a section for the two research notes
  - method: the same research-notes section
"""
import re, sys, os, io, html
from pathlib import Path
import markdown

HERE = Path(__file__).resolve().parent
HUB  = HERE / "hub"
OUT  = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE.parent.parent / "dev" / "record"

LOCAL = ('<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">\n'
         '<link rel="stylesheet" href="/assets/fonts/fonts.css">\n'
         '<meta name="robots" content="noindex, nofollow">')
GF = re.compile(r'<link rel="preconnect" href="https://fonts\.googleapis\.com">\s*'
                r'<link rel="preconnect" href="https://fonts\.gstatic\.com" crossorigin>\s*'
                r'<link href="https://fonts\.googleapis\.com/css2\?[^"]*" rel="stylesheet">')

NOTES = [
  ("notes/guarantee-history.html", "Research note",
   "The audience guarantee and the make-good",
   "Dated evidence for the precedent: who guaranteed what, when, and what the remedy was. "
   "Every entry carries its source."),
  ("notes/agentic-capture.html", "Research note",
   "Agentic claims capture: same 64 companies, same instrument",
   "Sixty-four companies re-read on 30 September for claims about AI agents. "
   "Eighty claims coded on the same five rungs."),
]
def notes_section(prefix=""):
    cards = "".join(
        '<a class="card" href="%s%s"><div class="k">%s</div><div class="t">%s</div>'
        '<div class="d">%s</div></a>' % (prefix, u, k, t, d) for u, k, t, d in NOTES)
    return ('<section id="notes"><h2>Two research notes</h2><p class="sub">The reading behind '
            'the precedent and the agentic comparison. Each one names its sources and what it '
            'could not establish.</p><div class="cards">%s</div></section>' % cards)

def must(s, old, new, n=1):
    assert s.count(old) == n, (old[:60], s.count(old))
    return s.replace(old, new)

def write(rel, s):
    p = OUT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    io.open(p, "w", encoding="utf-8").write(s)
    print("%-36s %7d bytes" % (rel, len(s.encode("utf-8"))))

# ---------- plain pages: fonts only ----------
for name in ["deck.html", "deep-dive.html", "method.html"]:
    s = (HUB / name).read_text(encoding="utf-8")
    s, n = GF.subn(LOCAL, s); assert n == 1, name
    if name == "deck.html":   # the hub's earlier 17-stage cut: same rule as the deck, 138 where it counts companies read
        s = must(s, "140 companies read page by page", "138 companies read page by page")
        s = must(s, "140 advertising and media companies were read page by page", "138 advertising and media companies were read page by page")
    if name == "method.html":
        s = must(s, '<section><div class="note thanks">', notes_section() + '<section><div class="note thanks">')
    write(name, s)

# ---------- sector pages: fonts + hrefs ----------
for p in sorted((HUB / "sectors").glob("*.html")):
    s = p.read_text(encoding="utf-8")
    s, n = GF.subn(LOCAL, s); assert n == 1, p.name
    s = re.sub(r'href="(?!https?:|#|\.\./|/)', 'href="../', s)
    write("sectors/" + p.name, s)

# ---------- index: rebuild the head, add ids, the back link, the notes ----------
s = (HUB / "index.html").read_text(encoding="utf-8")
m = re.match(r'(?s)^.*?<body>\s*<title>(.*?)</title>\s*' + GF.pattern + r'\s*<style>', s)
assert m, "index head shape"
head = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        '<title>%s</title>\n%s\n<style>' % (m.group(1), LOCAL))
s = head + s[m.end():]
s = must(s, '</style>\n<div class="wrap">', '</style>\n</head><body><div class="wrap">')
s = must(s, '<header class="top">\n<p class="eyebrow">',
            '<header class="top">\n<a class="back" href="../landscape.html">&larr; The Outcomes Opportunity</a>\n<p class="eyebrow">')
s = must(s, '<span class="n">140</span><span class="l">companies read</span>',
            '<span class="n">138</span><span class="l">companies read</span>')
s = must(s, '<a class="card" href="deck.html"><div class="k">17 stages &middot; 12 min</div><div class="t">The argument</div>'
            '<div class="d">Who sells outcomes, how far each one commits, and the language they use to do it.</div></a>',
            '<a class="card" href="../landscape.html"><div class="k">14 stages</div><div class="t">The argument</div>'
            '<div class="d">What 140 advertising and media companies promise on their own websites, and what the gap is worth to whoever closes it first.</div></a>')
s = must(s, '<section><h2>The thirteen categories</h2>', '<section id="categories"><h2>The thirteen categories</h2>')
s = must(s, '<section><h2>The adjudication</h2>', '<section id="adjudication"><h2>The adjudication</h2>')
s = must(s, '<section><h2>The full data</h2>', '<section id="data"><h2>The full data</h2>')
s = must(s, '<section><h2>Five things the record will not support</h2>',
            notes_section() + '<section><h2>Five things the record will not support</h2>')
s = must(s, '</body></html>', '</body></html>')
write("index.html", s)

# ---------- the two research notes ----------
STYLE = re.search(r'(?s)<style>.*?</style>', (HUB / "method.html").read_text(encoding="utf-8")).group(0)
PROSE = """
<style>
.prose{max-width:76ch}
.prose h2{font-size:22px;margin:46px 0 10px}
.prose h3{font-size:17px;margin:30px 0 8px;letter-spacing:-.008em}
.prose p,.prose li{font-size:15.5px;line-height:1.6}
.prose p{margin:0 0 14px}
.prose ul,.prose ol{padding-left:22px;margin:0 0 16px}
.prose li{margin:0 0 7px}
.prose a{word-break:break-word}
.prose code{font-family:var(--mono);font-size:.9em;background:var(--desk);padding:1px 5px;border-radius:2px}
.prose blockquote{border-left:2px solid var(--blue);margin:0 0 16px;padding:2px 0 2px 16px;color:var(--muted)}
.prose hr{border:0;border-top:1px solid var(--hair);margin:30px 0}
.prose .tw{margin:0 0 22px;max-width:none}
.prose table{font-size:13px;min-width:640px}
.prose td,.prose th{padding:9px 12px 9px 0;line-height:1.45}
.prose th{white-space:nowrap}
</style>"""
FOOT = ('<footer>Calidescope LLC &middot; a research note behind <a href="../../landscape.html">The Outcomes Opportunity</a>'
        '<br>Sources are linked where they were read. Counts describe the pages read, not the market.</footer>')
for rel, k, t, d in NOTES:
    md = (HERE / rel.replace(".html", ".md").replace("notes/", "notes/")).read_text(encoding="utf-8")
    lines = md.split("\n")
    assert lines[0].startswith("# "), rel
    title = lines[0][2:].strip()
    body = markdown.markdown("\n".join(lines[1:]), extensions=["tables", "sane_lists", "fenced_code"])
    body = re.sub(r'<table>', '<div class="tw"><table>', body)
    body = re.sub(r'</table>', '</table></div>', body)
    body = re.sub(r'<a href="(https?://[^"]+)"', r'<a href="\1" rel="noopener"', body)
    # bare URLs in the notes are written as text; make them links (trailing punctuation stays text)
    def auto(m):
        u = m.group(1); tail = ""
        while u and u[-1] in ".,;:)]": tail = u[-1] + tail; u = u[:-1]
        return '<a href="%s" rel="noopener">%s</a>%s' % (u, u, tail)
    parts = re.split(r'(<a [^>]*>.*?</a>|<[^>]+>)', body)
    body = "".join(pt if (pt.startswith("<") ) else re.sub(r'(https?://[^\s<"]+)', auto, pt) for pt in parts)
    page = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<title>%s &mdash; research note</title>\n%s\n%s%s\n</head><body><div class="wrap">\n'
            '<header class="top">\n<a class="back" href="../index.html">&larr; The record</a>\n'
            '<p class="eyebrow">%s</p>\n<h1>%s</h1>\n<p class="lede">%s</p>\n</header>\n'
            '<div class="prose">\n%s\n</div>\n%s\n</div></body></html>'
            % (html.escape(title), LOCAL, STYLE, PROSE, k, html.escape(title), d, body, FOOT))
    write(rel, page)
