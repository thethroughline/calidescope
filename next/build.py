#!/usr/bin/env python3
"""Build the Calidescope homepage from the designer's page in next/source/.

Emits TWO files from one source: index.html (the homepage, canonical and
indexable) and next/index.html (the same page, noindex, kept as the staging
path where the next revision is reviewed before it reaches the root).

The source is a complete page — its own CSS, markup and script — so this keeps
all three verbatim and changes only what a public URL needs:

  head     doctype, viewport, colour-scheme, theme-colour, noindex, favicon;
           Google Fonts → assets/fonts. viewport-fit=cover is deliberately NOT
           carried over: nothing in the page uses env(safe-area-inset-*), so
           cover would put the nav under the iPhone home indicator.
  order    each row's cards sorted into column order in the DOM, so Tab and a
           screen reader walk backward → situation → opportunity → solution → case
           (the grid already places them that way; the source's DOM did not)
  form     the Formspree placeholder → /api/contact, a honeypot, an in-card reply
  size()   falls back to the window when the stage reads 0 wide (a hidden frame)
  script   next/app.js appended: the typing guard and the form handler

Run from anywhere:  python3 next/build.py
Never hand-edit either output — change the source or app.js and rebuild."""
import re, pathlib

HERE = pathlib.Path(__file__).resolve().parent
SRC  = HERE / "source" / "calidescope-situations_3.html"
OUT  = HERE / "index.html"                 # /next — noindex staging
ROOT = HERE.parent / "index.html"          # /      — the indexable homepage
src  = SRC.read_text()

# ── CSS, verbatim, plus the three rules the additions need ──
style = src[src.index("<style>"): src.index("</style>") + len("</style>")]
style = style.replace("</style>",
  "[hidden]{display:none!important}\n"
  ".btn[disabled]{opacity:.5;cursor:default}\n"
  "#csent:focus{outline:0}\n"
  "</style>")

# ── markup ──
body = src[src.index('<div id="stage">'): src.index("<script>")]
grid_end = body.index("</div></div>")
grid, rest = body[:grid_end], body[grid_end:]
sections = re.findall(r"<section\b.*?</section>", grid, re.S)
assert len(sections) == 41, len(sections)
key = lambda s: (int(re.search(r'data-row="(\d+)"', s).group(1)), int(re.search(r'data-col="(\d+)"', s).group(1)))
sections.sort(key=key)
body = '<div id="stage"><div id="grid">\n' + "\n".join(sections) + "\n" + rest

# the form
old_form = re.search(r"<form.*?</form>", body, re.S).group(0)
new_form = old_form
new_form = new_form.replace('<form action="https://formspree.io/f/YOUR-FORM-ID" method="post">',
                            '<form action="/api/contact" method="post" data-cform="1">')
new_form = re.sub(r'\s*<input type="hidden" name="_subject"[^>]*>', '', new_form)
new_form = new_form.replace('<button class="btn" type="submit">',
  '<input type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">\n'
  '    <button class="btn" type="submit">')
new_form += ('\n  <p class="line" id="cmsg" role="status" aria-live="polite" hidden style="color:var(--acc)"></p>'
             '\n  <div id="csent" hidden><h2 class="svc">Got it.</h2><p class="line">We read it and come back with what we see.</p></div>')
assert new_form != old_form
body = body.replace(old_form, new_form)
assert "formspree" not in body and "_subject" not in body

# ── script, verbatim but for one fallback, then the additions ──
script = src[src.index("<script>") + len("<script>"): src.index("</script>")]
old_size = "W=stage.clientWidth;H=stage.clientHeight;"
assert old_size in script
script = script.replace(old_size,
  "W=stage.clientWidth||window.innerWidth;"
  "H=Math.min(stage.clientHeight||1/0,(window.visualViewport&&window.visualViewport.height)||1/0)"
  "||window.innerHeight;")
script += "\n" + (HERE / "app.js").read_text()

SITE  = "https://calidescope.llc"
TITLE = "Calidescope &mdash; Situations We Solve For"
DESC  = ("Growth advisory services and software. Seven situations, "
         "and what changes when each one goes right.")

# The two outputs differ ONLY in the head. Same CSS, same markup, same script:
#   /       the homepage — canonical, Open Graph, indexable
#   /next   the staging copy — noindex, so a draft can be seen without being found
TARGETS = [
    (ROOT, f'''<title>{TITLE}</title>
<meta name="description" content="{DESC}">
<link rel="canonical" href="{SITE}/">
<meta property="og:type" content="website">
<meta property="og:url" content="{SITE}/">
<meta property="og:title" content="{TITLE}">
<meta property="og:description" content="{DESC}">'''),
    (OUT, f'''<title>Calidescope &mdash; next</title>
<meta name="description" content="{DESC}">
<meta name="robots" content="noindex, nofollow">'''),
]

for target, head in TARGETS:
    target.write_text(f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#FAF7EF">
{head}
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<!-- Local fonts only. No third-party call anywhere — see /privacy.html -->
<link rel="stylesheet" href="/assets/fonts/fonts.css">
{style}
</head>
<body>
{body}<script>{script}</script>
</body>
</html>
""")
    print("wrote", target.relative_to(HERE.parent), target.stat().st_size, "bytes")
