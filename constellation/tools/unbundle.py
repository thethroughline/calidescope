#!/usr/bin/env python3
"""Rebuild /constellation from a Claude Design bundled export of "Constellation Prototype".

    python3 -I constellation/tools/unbundle.py <bundled-export.html> [<phosphor-package-dir>]

    The second argument is the unpacked npm package @phosphor-icons/web@2.1.1 (npm pack, then tar -xzf):
    the regular, bold and fill weights the design uses are copied to vendor/phosphor/ and the design's
    icon loader is pointed at them, so the page loads nothing from a CDN.

The export is one HTML file: a gzip+base64 manifest of every asset, plus the page template that
refers to each asset by uuid. This writes the page and its assets as plain static files, so the
site serves everything itself:

    constellation/index.html                 the page (template, uuids swapped for paths)
    constellation/js/*.js                    the design runtime, data, engine, icon loader
    constellation/vendor/*.js                React 18.3.1 and ReactDOM, as bundled by the export
    constellation/fonts/*.woff2              Newsreader and IBM Plex Sans, as bundled

window.__resources maps the runtime's CDN URLs for React to the vendored copies. Deterministic.
"""
import sys, json, re, base64, gzip, pathlib, collections
OUT = pathlib.Path(__file__).resolve().parent.parent
BASE = "/constellation/"   # absolute: the site serves the folder at /constellation (trailingSlash false)
src = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")

def block(t):
    m = re.search(r'<script type="__bundler/%s">(.*?)</script>' % re.escape(t), src, re.S)
    return m.group(1) if m else None

manifest = json.loads(block("manifest"))
template = json.loads(block("template"))
ext = {e["uuid"]: e["id"] for e in json.loads(block("ext_resources") or "[]")}

def data(u):
    e = manifest[u]; b = base64.b64decode(e["data"])
    return gzip.decompress(b) if e.get("compressed") else b

# scripts, identified by what they are
def script_name(u, body):
    head = body[:400].decode("utf-8", "replace")
    if "dc-runtime" in head: return "js/support.js"
    if "phosphor-icons" in head: return "js/phosphor-icons.js"
    text = body.decode("utf-8", "replace")
    if re.search(r"window\.CPE\s*=", text): return "js/constellation-proto-engine.js"
    if re.search(r"window\.CPD\s*=", text): return "js/constellation-proto-data.js"
    raise SystemExit(f"unrecognised script {u}")

paths = {}
for u, e in manifest.items():
    body = data(u)
    if u in ext:  # React / ReactDOM from the CDN, bundled by the export
        paths[u] = "vendor/" + ext[u].rsplit("/", 1)[-1]
    elif e["mime"] in ("text/javascript", "application/javascript"):
        paths[u] = script_name(u, body)
    elif e["mime"].startswith("font/"):
        paths[u] = None  # named from its @font-face below
    else:
        raise SystemExit(f"unexpected asset type {e['mime']}")

# fonts: name each file by family, style and subset from the @font-face that uses it (each file is a
# variable font that serves several weights)
for m in re.finditer(r"/\* ([\w-]+) \*/\s*@font-face \{(.*?)\}", template, re.S):
    subset, body = m.group(1), m.group(2)
    fam = re.search(r"font-family: '([^']+)'", body).group(1).lower().replace(" ", "-")
    sty = re.search(r"font-style: (\w+)", body).group(1)
    wt = re.search(r"font-weight: (\d+)", body).group(1)
    u = re.search(r'url\("([0-9a-f-]{36})"\)', body).group(1)
    if paths.get(u) is None:
        paths[u] = f"fonts/{fam}{'' if sty == 'normal' else '-' + sty}-{subset}.woff2"

for u, p in paths.items():
    if p is None: raise SystemExit(f"font {u} is never used by an @font-face")
    f = OUT / p; f.parent.mkdir(parents=True, exist_ok=True); f.write_bytes(data(u))
    if p == "js/constellation-proto-engine.js":   # the send guard and the other engine patches (tools/patches.py)
        sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent)); from patches import apply_engine
        f.write_text(apply_engine(f.read_text(encoding="utf-8"))[0], encoding="utf-8")

page = template
for u, p in paths.items():
    page = page.replace(u, BASE + p)
resources = {ext[u]: BASE + paths[u] for u in ext}
head = ('<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        '<title>Constellation</title>\n<meta name="robots" content="noindex, nofollow">\n'
        '<link rel="icon" href="' + BASE + 'favicon.svg" type="image/svg+xml">\n'
        f'<script>window.__resources = {json.dumps(resources)};</script>\n')
page = page.replace('<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n', head, 1)
# the export's "Made with Claude Design" badge is the design tool's, not the product's
page, n = re.subn(r'<div id="__claude_design_branding".*?</div>(?=</body>)', '', page, flags=re.S)
if not n: raise SystemExit("design-tool badge not found; check the export")
# the corpus connection and the Library: re-applied to every export (see tools/patches.py)
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from patches import apply as apply_patches
page, patched = apply_patches(page)
(OUT / "index.html").write_text(page, encoding="utf-8")

# icons: vendor the Phosphor weights the design uses and point its loader at them
CDN = "https://unpkg.com/@phosphor-icons/web@2.1.1/src/"
WEIGHTS = ["regular", "bold", "fill"]
loader = OUT / "js/phosphor-icons.js"
lt = loader.read_text(encoding="utf-8")
assert CDN in lt, "the icon loader no longer points at Phosphor 2.1.1 on unpkg; check the export"
if len(sys.argv) > 2:
    import shutil
    pkg = pathlib.Path(sys.argv[2])
    for w in WEIGHTS:
        d = OUT / "vendor/phosphor" / w; d.mkdir(parents=True, exist_ok=True)
        shutil.copy(pkg / "src" / w / "style.css", d / "style.css")
        for f in (pkg / "src" / w).glob("*.woff2"): shutil.copy(f, d / f.name)
    shutil.copy(pkg / "LICENSE", OUT / "vendor/phosphor/LICENSE")
    lt = lt.replace(CDN, BASE + "vendor/phosphor/")
    lt = re.sub(r'\[\s*"regular",[^\]]*\]', json.dumps(WEIGHTS), lt, count=1)
    loader.write_text(lt, encoding="utf-8")

assert not re.search(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", page), "an asset uuid was left in the page"
counts = collections.Counter(p.split("/")[0] for p in paths.values())
print(f"index.html · " + " · ".join(f"{k} {v}" for k, v in sorted(counts.items())))
