"""Template patches that connect the exported prototype to the corpus and the Library.

    python3 -I constellation/tools/patches.py            apply to constellation/index.html in place

unbundle.py applies these after every fresh export, so a new export from Claude Design keeps its
connection. Each patch names one exact anchor in the export; if the anchor is gone or appears
twice, the patch refuses and says which, so a redesign cannot silently drop the Library.
Idempotent: a patch already present (its data-bridge mark is in the page) is skipped.

What each patch adds (the behaviour behind it is in js/constellation-bridge.js):
  scripts          lib/core.js and the bridge, in the real <head>, ahead of the export's scripts
  heroes-library   a Library card on the member's Heroes tab
  hero-library     "Explore <name> in the library" on a hero page
  story-library    "Follow this story into the library" on a story
  library-overlay  the Library inside the member app, in the detail pane (frames bind src through
                   sc-camel-src, so the browser never fetches the raw "{{ }}" before the runtime compiles)
  coach-explore    the coach's Library tab: Explore (the Library) beside Find and send
  send-tabs        the same two tabs on the send screen
  send-verify      "Check the source in the Library" where a draft cannot be sent
  lib-none         the send screen's empty state: the corpus now covers all 22 situations
"""
import pathlib, sys

TABS = ('<div data-bridge="{mark}" style="flex:none;display:flex;align-items:center;gap:6px;padding:10px 28px;border-bottom:1px solid var(--hair)">'
        '<button sc-camel-on-click="{{{{ lt.explore.go }}}}" style="height:30px;padding:0 14px;border-radius:15px;border:1px solid {{{{ lt.explore.bd }}}};background:{{{{ lt.explore.bg }}}};color:{{{{ lt.explore.fg }}}};font:500 12px var(--sans);cursor:pointer">Explore</button>'
        '<button sc-camel-on-click="{{{{ lt.send.go }}}}" style="height:30px;padding:0 14px;border-radius:15px;border:1px solid {{{{ lt.send.bd }}}};background:{{{{ lt.send.bg }}}};color:{{{{ lt.send.fg }}}};font:500 12px var(--sans);cursor:pointer">Find and send</button>'
        '<span style="margin-left:10px;font:400 12px var(--sans);color:var(--faint)">{{{{ lt.line }}}}</span><span style="flex:1"></span>'
        '<a href="{{{{ cx.full }}}}" target="_blank" rel="noopener" style="font:500 12px var(--sans);color:var(--pru);text-decoration:none;display:flex;align-items:center;gap:6px">Open the library in a new tab <i class="ph ph-arrow-square-out"></i></a></div>')

PATCHES = [
    ("scripts", '<script src="/constellation/js/support.js"></script>', "after",
     '\n<script data-bridge="scripts" src="/constellation/lib/core.js"></script>'
     '\n<script data-bridge="scripts-bridge" src="/constellation/js/constellation-bridge.js"></script>'),
    ("heroes-library", '<sc-if value="{{ hz.addClosed }}" hint-placeholder-val="{{ true }}">', "before",
     '<button data-bridge="heroes-library" sc-camel-on-click="{{ hz.explore }}" style="display:flex;gap:14px;width:100%;text-align:left;padding:16px;margin:0 0 16px;border:1px solid var(--hair);border-radius:16px;background:var(--well);color:var(--ink);cursor:pointer;align-items:center" style-hover="border-color:var(--ink)">'
     '<div style="width:44px;height:44px;border-radius:50%;background:var(--paper);border:1px solid var(--hair);display:flex;align-items:center;justify-content:center;flex:none"><i class="ph ph-books" style="font-size:20px;color:var(--pru)"></i></div>'
     '<div style="flex:1;min-width:0"><div style="font:500 11px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--faint)">The library</div><div style="font:400 17px/1.35 var(--serif);margin-top:2px">{{ hz.exploreLine }}</div></div>'
     '<i class="ph ph-caret-right" style="color:var(--faint);flex:none;font-size:18px"></i></button>\n                      '),
    ("hero-library", '<sc-if value="{{ hv.hasWorks }}">', "before",
     '<button data-bridge="hero-library" sc-camel-on-click="{{ hv.explore }}" style="display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;min-height:48px;margin-top:22px;padding:0 18px;border:1px solid var(--ink);border-radius:24px;background:transparent;color:var(--ink);font:500 14px var(--sans);cursor:pointer;text-align:left" style-hover="background:var(--well)">'
     '<span style="display:flex;align-items:center;gap:8px"><i class="ph ph-books"></i>{{ hv.exploreLabel }}</span><i class="ph ph-caret-right"></i></button>\n                '),
    ("story-library", '<sc-if value="{{ sv.declined }}">', "before",
     '<button data-bridge="story-library" sc-camel-on-click="{{ sv.explore }}" style="display:flex;align-items:center;justify-content:space-between;width:100%;min-height:48px;margin-top:18px;padding:0;border:0;border-top:1px solid var(--hair);background:transparent;color:var(--pru);font:500 14px var(--sans);cursor:pointer;text-align:left">'
     '<span style="display:flex;align-items:center;gap:8px"><i class="ph ph-path"></i>{{ sv.exploreLabel }}</span><i class="ph ph-caret-right"></i></button>\n                '),
    ("library-overlay", '<sc-if value="{{ ov.thread }}">', "before",
     '<sc-if value="{{ ov.library }}"><div data-bridge="library-overlay" data-screen-label="M15 Library" style="position:absolute;top:0;left:0;right:0;bottom:0;background:var(--paper);z-index:20;display:flex;flex-direction:column;animation:cpUp 420ms var(--ease) both">'
     '<div style="height:52px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 10px;border-bottom:1px solid var(--hair)">'
     '<button sc-camel-on-click="{{ lx.back }}" aria-label="{{ lx.backLabel }}" style="width:44px;height:44px;border:0;background:transparent;color:var(--ink);font-size:20px;cursor:pointer"><i class="{{ lx.backIcon }}"></i></button>'
     '<span style="font:500 11px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--faint)">The library</span>'
     '<a href="{{ lx.full }}" target="_blank" rel="noopener" aria-label="Open the library in a new tab" style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--faint);font-size:18px"><i class="ph ph-arrow-square-out"></i></a></div>'
     '<iframe sc-camel-src="{{ lx.src }}" title="The Constellation library" style="flex:1;width:100%;border:0;background:var(--paper)"></iframe></div></sc-if>\n          '),
    ("coach-explore", '<sc-if value="{{ cs.C4 }}">', "before",
     '<sc-if value="{{ cs.CX }}"><div data-bridge="coach-explore" data-screen-label="CX Library" style="height:100%;display:flex;flex-direction:column">'
     + TABS.format(mark="coach-tabs") +
     '<iframe sc-camel-src="{{ cx.src }}" title="The Constellation library" style="flex:1;width:100%;border:0;background:var(--paper)"></iframe></div></sc-if>\n              '),
    ("send-tabs", '<div data-screen-label="C4 Library" style="display:grid;', "before", TABS.format(mark="send-tabs") + '\n                '),
    ("send-verify", '<sc-if value="{{ lib.dis }}"><div style="font:400 12px var(--sans);color:var(--mad)">Verify the source before sending.</div></sc-if>', "after",
     '<sc-if value="{{ lib.dis }}"><button data-bridge="send-verify" sc-camel-on-click="{{ lib.inLibrary }}" style="align-self:flex-start;height:30px;padding:0 12px;border-radius:15px;border:1px solid var(--pru);background:transparent;color:var(--pru);font:500 12px var(--sans);cursor:pointer">Check the source in the Library</button></sc-if>'),
    ("lib-none", "No stories match. The corpus covers eight of the twenty-two situations so far.", "replace",
     "No stories match these filters. Clear one, or open the Library to search the whole corpus."),
]

def apply(html):
    done = []
    for name, anchor, where, block in PATCHES:
        if f'data-bridge="{name}"' in html: continue
        if where == "replace" and block in html and anchor not in html: continue
        n = html.count(anchor)
        if n != 1: raise SystemExit(f"patch {name}: its anchor appears {n} times in the export; update tools/patches.py")
        html = html.replace(anchor, block + anchor if where == "before" else anchor + block if where == "after" else block)
        done.append(name)
    return html, done

if __name__ == "__main__":
    p = pathlib.Path(__file__).resolve().parent.parent / "index.html"
    html, done = apply(p.read_text(encoding="utf-8"))
    p.write_text(html, encoding="utf-8")
    print("patched: " + (", ".join(done) if done else "nothing new"))
