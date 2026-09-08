#!/usr/bin/env python3
"""Build next/index.html from the Claude Design handoff in next/source/.
Same template, same styles, no runtime: React/Babel/support.js are replaced
by next/app.js (plain JavaScript, inlined); Google Fonts by the faces this
repo already self-hosts; the Formspree placeholder by /api/contact.

Run from anywhere:  python3 next/build.py
Never hand-edit next/index.html — change the source or app.js and rebuild."""
import re, pathlib

HERE = pathlib.Path(__file__).resolve().parent

SRC = HERE / "source" / "Calidescope Site.dc.html"
OUT = HERE / "index.html"
src = SRC.read_text()

# ── the page's own CSS (drop the Google Fonts links around it) ──
style = re.search(r"<helmet>.*?(<style>.*?</style>).*?</helmet>", src, re.S).group(1)
style = style.replace("</style>",
  "[hidden]{display:none!important}\n"
  "button[disabled]{opacity:.5;cursor:default}\n"
  "[data-csent]:focus{outline:0}\n"  # focus lands here after a send; no ring on a heading
  "</style>")

# ── the template: stage → menu, verbatim ──
body = src[src.index('<div data-stage="1"'): src.index("</sc-if>") + len("</sc-if>")]
# menu: the runtime's conditional becomes a hidden dialog + a data hook
body = re.sub(r'<sc-if[^>]*>\n?', '', body)
body = body.replace('</sc-if>', '')
body = body.replace('<div role="dialog" aria-modal="true" aria-label="Menu" style=',
                    '<div role="dialog" aria-modal="true" aria-label="Menu" data-menudialog="1" hidden style=')
body = body.replace('onClick="{{ closeMenu }}"', 'data-closemenu="1"')
assert '{{' not in body and 'sc-if' not in body, "runtime syntax left behind"

# ── the form: our endpoint, honeypot, an inline reply ──
contact = re.search(r'<section data-row="8" data-col="3".*?</section>', body, re.S).group(0)
h2s = re.search(r'<h2 style="([^"]*)">Start</h2>', contact).group(1)
ps  = re.search(r'<p style="([^"]*)">A five minute conversation\.</p>', contact).group(1)
new = contact
new = new.replace('<form action="https://formspree.io/f/YOUR-FORM-ID" method="post"',
                  '<form action="/api/contact" method="post" data-cform="1"')
new = re.sub(r'\s*<input type="hidden" name="_subject"[^>]*/>', '', new)
new = new.replace('<button type="submit"',
  '<input type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px" />\n'
  '    <button type="submit"')
new = new.replace('</form>',
  '</form>\n'
  f'  <p data-cmsg="1" role="status" aria-live="polite" hidden style="{ps};color:#1E40FF;margin-top:10px"></p>\n'
  f'  <div data-csent="1" hidden><h2 style="{h2s}">Got it.</h2><p style="{ps}">We read it and come back with what we see.</p></div>')
assert new != contact
body = body.replace(contact, new)
assert 'formspree' not in body

js = (HERE / "app.js").read_text()

OUT.write_text(f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Calidescope &mdash; next</title>
<meta name="description" content="Growth advisory, software and services. Seven situations we solve for, and a way to start.">
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<!-- Local fonts only. No third-party call anywhere — see /privacy.html -->
<link rel="stylesheet" href="/assets/fonts/fonts.css">
{style}
</head>
<body>
{body}
<script>
{js}
</script>
</body>
</html>
""")
print("wrote", OUT, OUT.stat().st_size, "bytes")
