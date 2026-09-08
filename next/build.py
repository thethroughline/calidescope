#!/usr/bin/env python3
"""Build next/index.html from the designer's page in next/source/.

The source is a complete page — its own CSS, markup and script — so this keeps
all three verbatim and changes only what a public URL needs:

  head     doctype, viewport, noindex, favicon; Google Fonts → assets/fonts
  order    each row's cards sorted into column order in the DOM, so Tab and a
           screen reader walk backward → situation → result → solution → case
           (the grid already places them that way; the source's DOM did not)
  form     the Formspree placeholder → /api/contact, a honeypot, an in-card reply
  size()   falls back to the window when the stage reads 0 wide (a hidden frame)
  script   next/app.js appended: the typing guard and the form handler

Run from anywhere:  python3 next/build.py
Never hand-edit next/index.html — change the source or app.js and rebuild."""
import re, pathlib

HERE = pathlib.Path(__file__).resolve().parent
SRC  = HERE / "source" / "calidescope-situations_2.html"
OUT  = HERE / "index.html"
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
assert len(sections) == 40, len(sections)
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
script = script.replace(old_size, "W=stage.clientWidth||window.innerWidth;H=stage.clientHeight||window.innerHeight;")
script += "\n" + (HERE / "app.js").read_text()

OUT.write_text(f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Calidescope &mdash; next</title>
<meta name="description" content="Growth advisory, software and services. Eight situations, and the two ways each one ends.">
<meta name="robots" content="noindex, nofollow">
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
print("wrote", OUT.name, OUT.stat().st_size, "bytes")
