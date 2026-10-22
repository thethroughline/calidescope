"""Template patches that connect the exported prototype to the corpus and the Library.

    python3 -I constellation/tools/patches.py            apply to constellation/index.html in place

unbundle.py applies these after every fresh export, so a new export from Claude Design keeps its
connection. Each patch names one exact anchor in the export; if the anchor is gone or appears
twice, the patch refuses and says which, so a redesign cannot silently drop the Library.
Idempotent: a patch already present (its data-bridge mark is in the page) is skipped.

What each patch adds (the behaviour behind it is in js/constellation-bridge.js):
  scripts          lib/core.js and the bridge, in the real <head>, ahead of the export's scripts
  heroes-library   a Library card on the member's Heroes tab
  you-library      on You, In the library: the last trail read, at your age, who stands near your three
  heroes-near      under it: Who stands near your three, a line on where the three stand, opening the picture
  hero-library     "Explore <name> in the library" on a hero page
  week-trail       on This week, below the line: a check the member asked for, now done, and where they were in
                   the Library
  week-prep        until prep opens there is no dead button, only the day it opens ("Prep opens Wednesday.")
  story-check      on a recall draft in the member's story: Ask <coach> to check it (a thread card and a signal)
  review-asked     on a Review row: <member> asked for N checks
  story-library    "Follow this story into the library" on a story
  library-overlay  the Library inside the member app, in the detail pane (frames bind src through
                   sc-camel-src, so the browser never fetches the raw "{{ }}" before the runtime compiles);
                   mounted once it first opens and hidden between opens, so the session keeps one frame
  pane-kept        the detail pane hides (display) where it would go, while the Library's frame is kept in it
  coach-explore    the coach's Library tab: Explore (the Library) beside Find and send, its frame kept for the session
  send-tabs        the same two tabs on the send screen
  send-verify      "Check the source in the Library" where a draft cannot be sent
  lib-none         the send screen's empty state: the corpus now covers all 22 situations
  story-draft      on a story opened from the library, a line saying it is an unchecked recall draft
  story-related    under a story in the app: the same kind of week, the same world, more from the person,
                   each opening in the same overlay with a way back
  hero-related     on a hero page: the rest of their stories and their kindred lives, inside the app
  send-related     on Find and send: stories related to the one chosen, one tap to choose another
  demo-bar         the prototype's own bar at every width (values set by fitBar in the bridge): one
  demo-brand       clock stepper below 1880; below 600 only the wordmark, the stepper and a Demo button,
  demo-clock       which opens demo-sheet with the view, the person, the device, the eleven moments,
  demo-steps       the theme and reset; demo-css hides the full controls on a phone; demo-coach-note
  demo-menu        says the coach console is made for a laptop when it is opened on a phone
  demo-sheet       (demo-clock-word and demo-clock-line show the "Demo clock" word and the date line
  demo-css         only where the eleven pills leave room for them)
  story-reach      under Why this story, for a story from beyond the member's three: the chain, at most two
                   links, from one of their heroes to the story's life, each link said in words
  review-fill      on a Review row showing a recall draft, or with no story: why it cannot go, and the one
                   draft whose check fills the slot (one of the member's three first), checked in the row
  ask-reply        under a member's Ask in the coach's thread: the story ready to send (nothing the member has, no
                   life they had last week), a note, and Send, two taps; once sent, the Ask says it was answered
  ask-find         under a member's Ask in the coach's thread: Find a story for this, which opens the
                   Library's answer to the Ask, read for that member, with the situation they chose
  mute-token       the light theme's secondary grey one step darker (#5E626B, as the Library has it), so it
                   clears 4.5:1 on the tinted panels as well as on paper
  send-ask         on Find and send, above the filters: the member's question, answered by the Library's Ask
  send-far         far stories set aside behind one chip until the coach asks for them
  send-for         on Find and send, under the story chosen: how it reaches the member it would go to, and a
                   button to compare it with that member's pick for the week
  ask-lib-a/-b     "From the library, beyond your three" where the export said "— not one of your three"
  ask-shape        "Pick the closest, and a story follows." under the member's choice of situation
  ask-words        "Our reading of their stories, in our words." for the export's "X. Not Y." line
  ask-sent         the coach's pronoun is not assumed: "It shows in your timeline."
  ask-draft        on a member's Ask answer: a checked story they already hold is named, a draft is marked once
                   and can be sent to the coach to check, and how its life reaches the three is said in words
  review-why       on a Review row: the rule's reasons in plain words, folded behind "Why this story"
  review-manifest  at the top of Review, in place of the floating notice: what goes at 18:00 to whom, who gets nothing
                   yet and why, in the words each line then leads with (and Changed · Undo on a line the coach changed)
  msg-scope        Messages lists the console coach's own members; All members adds the rest, read only (msg-head,
  msg-head         msg-compose: no Send a story and no reply on another coach's member)
  msg-compose
  review-guard     on a Review row: the rule's fortnight said plainly ("Sarah had Obama on 12 Oct")
  swap-pair        in Swap on a paired row: choosing another story unpairs it
  week-held        a held week says why: the story waits for the coach's check, or the coach chose to wait
  week-wait        under it, While you wait: one row, the story that fits the member best (CLN.fitFor), opening in place
  week-coach       the line is developed with the member's own coach; week-one-line: under the move, now said whole as
                   the headline, this week's step of it ("Week 1 of 6: send it to one person.") and, in week 1, the six
  m2-bracket       on M2, the bracket by its own counts, where the export said "to 128"
  mv-preview-line  the coach's preview of the Monday card, as the card now reads
  mv-gap           above Publish Move 1 (C6): a first week no checked story fills, with the three checks that would fill it
  story-for        under a member's story title: the coach's choice for the week's room, and an age beside theirs where
                   the year holds; story-draft and ask-draft carry a 44px info button that says what a recall draft is
  swap-check       in the Swap panel, the recall drafts nearest the member, each with "Check the source" opening
                   the check in the panel (the export's disabled "Draft — must verify" buttons go)
  (engine)         ENGINE_PATCHES, below, change js/constellation-proto-engine.js (unbundle.py applies them too):
                   the send guard (send-guard-*) and the held week's words (held-text); the hour before the room
                   with no pronoun read from a name (notif-hour); the fit check's line from a hero's stories (fit-line)
  apostrophes      the export's straight apostrophes inside a word, in text between tags, set curly ("you’re")
  type-floor       no text under 12px: the export's 10px and 11px labels become 12px, and the 9px
                   initials in the 24px avatars become 13px (a regex over the template's inline styles)
"""
import pathlib, re, sys

TABS = ('<div data-bridge="{mark}" style="flex:none;display:flex;align-items:center;gap:6px;padding:10px 28px;border-bottom:1px solid var(--hair)">'
        '<sc-if value="{{{{ lt.hasBack }}}}"><button sc-camel-on-click="{{{{ lt.backGo }}}}" aria-label="{{{{ lt.backAria }}}}" style="height:32px;display:flex;align-items:center;gap:2px;padding:0 12px 0 6px;margin-right:6px;border:0;border-radius:16px;background:transparent;color:var(--ink);font:500 13px var(--sans);cursor:pointer"><i class="ph ph-caret-left" style="font-size:16px"></i>{{{{ lt.backLabel }}}}</button></sc-if>'
        '<button sc-camel-on-click="{{{{ lt.explore.go }}}}" style="height:30px;padding:0 14px;border-radius:15px;border:1px solid {{{{ lt.explore.bd }}}};background:{{{{ lt.explore.bg }}}};color:{{{{ lt.explore.fg }}}};font:500 12px var(--sans);cursor:pointer">Explore</button>'
        '<button sc-camel-on-click="{{{{ lt.send.go }}}}" style="height:30px;padding:0 14px;border-radius:15px;border:1px solid {{{{ lt.send.bd }}}};background:{{{{ lt.send.bg }}}};color:{{{{ lt.send.fg }}}};font:500 12px var(--sans);cursor:pointer">Find and send</button>'
        '<span style="margin-left:10px;font:400 12px var(--sans);color:var(--faint)">{{{{ lt.line }}}}</span><span style="flex:1"></span>'
        '<a href="{{{{ cx.full }}}}" target="_blank" rel="noopener" style="font:500 12px var(--sans);color:var(--pru);text-decoration:none;display:flex;align-items:center;gap:6px;min-height:32px">Open the library in a new tab <i class="ph ph-arrow-square-out"></i></a></div>')

# A related-reading row and its groups, shared by the story and hero overlays: the person's name and
# place on one line, why it is here on the next, the whole row one target.
ROW = ('<button sc-camel-on-click="{{ r.open }}" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;min-height:56px;padding:10px 0;border:0;border-bottom:1px solid var(--hair);background:transparent;color:var(--ink);cursor:pointer" style-hover="color:var(--pru)">'
       '<span style="flex:1;min-width:0"><span style="display:block;font:400 17px/1.3 var(--serif)">{{ r.title }}</span><span style="display:block;font:400 16px/1.45 var(--sans);color:var(--mute);margin-top:3px">{{ r.why }}</span></span>'
       '<i class="ph ph-caret-right" style="color:var(--faint);flex:none;font-size:16px"></i></button>')
GROUPS = ('<sc-for list="{{ @LIST@ }}" as="g"><div style="font:500 13px var(--sans);color:var(--mute);margin-top:16px">{{ g.label }}</div>'
          '<sc-for list="{{ g.items }}" as="r">' + ROW + '</sc-for></sc-for>')
# "Recall draft" said once: a 44px info button beside the mark, opening the line that says what a recall draft is
DRAFT_INFO = ('<sc-if value="{{ @V@.draftInfo }}"><button data-bridge="draft-info" sc-camel-on-click="{{ @V@.draftInfo.toggle }}" aria-expanded="{{ @V@.draftInfo.openS }}" aria-label="What a recall draft is" '
              'style="flex:none;width:44px;height:44px;margin:-10px 0;padding:0;border:0;border-radius:22px;background:transparent;color:var(--mad);font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center"><i class="ph ph-info"></i></button></sc-if>')
# the check card in a row of the first week's guarantee (C6): the scene, the source, one note, one or two ways to check
CARD_FIRST = ('<sc-if value="{{ g.card.show }}"><div data-bridge="check-card" style="margin-top:10px;padding:14px 16px;border:1px solid var(--hair);border-radius:12px;background:var(--paper)"><p style="font:400 16px/1.55 var(--serif);color:var(--ink);margin:0">{{ g.card.moment }}</p><sc-if value="{{ g.card.pattern }}"><p style="font:italic 400 16px/1.5 var(--serif);color:var(--mute);margin:8px 0 0">{{ g.card.pattern }}</p></sc-if><p style="font:400 13px/1.5 var(--sans);color:var(--mute);margin:10px 0 0">Source: {{ g.card.source }}</p><sc-if value="{{ g.card.todo }}"><label style="display:block;font:500 12px var(--sans);letter-spacing:.06em;text-transform:uppercase;color:var(--faint);margin:12px 0 4px">What you checked it against</label><input value="{{ g.card.note }}" sc-camel-on-change="{{ g.card.setNote }}" placeholder="The edition, the page, the interview" aria-label="What you checked it against" style="width:100%;box-sizing:border-box;min-height:40px;padding:0 12px;border:1px solid var(--hair);border-radius:10px;background:var(--well);color:var(--ink);font:400 14px var(--sans)"><div style="font:400 12px var(--sans);color:var(--mute);margin-top:6px">Checked by {{ g.card.by }}</div><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px"><button sc-camel-on-click="{{ g.card.send }}" disabled="{{ g.card.dis }}" style="min-height:40px;padding:0 16px;border-radius:20px;border:0;background:var(--ink);color:var(--paper);font:500 13px var(--sans);cursor:pointer;opacity:{{ g.card.op }}">{{ g.card.sendLabel }}</button><sc-if value="{{ g.card.both }}"><button sc-camel-on-click="{{ g.card.only }}" disabled="{{ g.card.dis }}" style="min-height:40px;padding:0 10px;border:0;background:transparent;color:var(--pru);font:500 13px var(--sans);cursor:pointer;opacity:{{ g.card.op }}">Checked only</button></sc-if></div></sc-if><sc-if value="{{ g.card.done }}"><p style="font:500 13px/1.45 var(--sans);color:var(--pru);margin:12px 0 0"><i class="ph ph-seal-check"></i> {{ g.card.doneText }}</p></sc-if></div></sc-if>')
HEAD = '<div style="font:500 12px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--faint)">In the library</div>'

STEP_BTN = ('<button sc-camel-on-click="{{{{ {fn} }}}}" aria-label="{label}" style="width:32px;height:32px;border-radius:16px;border:1px solid var(--hair);background:transparent;color:var(--ink);cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none;opacity:{{{{ {op} }}}}"><i class="ph ph-caret-{dir}"></i></button>')

STEPPER = ('<sc-if value="{{ bar.compact }}"><div data-bridge="demo-stepper" role="group" aria-label="Demo clock" style="display:flex;align-items:center;gap:8px;flex:none">'
           + STEP_BTN.format(fn="prevStep", label="Previous demo step", op="bar.prevOp", dir="left")
           + '<span style="font:500 13px var(--sans);font-variant-numeric:tabular-nums;white-space:nowrap">{{ bar.step }}</span>'
           '<sc-if value="{{ bar.labelOn }}"><span title="{{ bar.label }}" style="font:400 12px var(--sans);color:var(--mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:{{ bar.labelMax }}px">{{ bar.label }}</span></sc-if>'
           + STEP_BTN.format(fn="nextStep", label="Next demo step", op="bar.nextOp", dir="right")
           + '</div></sc-if>')

# The sheet a phone gets in place of the bar's controls: big targets, one column, every choice closes it.
SHEET_H = '<div style="font:500 12px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--faint);margin:18px 0 8px">{t}</div>'
SHEET_PILL = ('<button sc-camel-on-click="{{{{ {v}.go }}}}" style="min-height:44px;padding:0 16px;border-radius:22px;border:1px solid var(--hair);background:{{{{ {v}.bg }}}};color:{{{{ {v}.fg }}}};font:500 14px var(--sans);cursor:pointer;display:flex;align-items:center;gap:8px">{inner}</button>')
SHEET = ('<sc-if value="{{ bar.sheet }}"><div data-bridge="demo-sheet" aria-hidden="true" sc-camel-on-click="{{ bar.close }}" style="position:fixed;left:0;right:0;top:52px;bottom:0;z-index:40;background:rgba(10,12,16,.32)"></div>'
         '<div role="dialog" aria-label="Demo controls" style="position:fixed;left:0;right:0;top:52px;z-index:41;max-height:calc(100vh - 52px);overflow-y:auto;background:var(--paper);border-bottom:1px solid var(--hair);padding:2px 16px 22px;font-family:var(--sans);color:var(--ink);box-shadow:0 20px 40px rgba(0,0,0,.18)">'
         + SHEET_H.format(t='View') +
         '<div style="display:flex;gap:8px;flex-wrap:wrap">'
         '<button sc-camel-on-click="{{ bar.toMember }}" style="min-height:44px;padding:0 16px;border-radius:22px;border:1px solid var(--hair);background:{{ roleM.bg }};color:{{ roleM.fg }};font:500 14px var(--sans);cursor:pointer;display:flex;align-items:center;gap:8px"><i class="ph ph-user"></i>Member app</button>'
         '<button sc-camel-on-click="{{ bar.toCoach }}" style="min-height:44px;padding:0 16px;border-radius:22px;border:1px solid var(--hair);background:{{ roleC.bg }};color:{{ roleC.fg }};font:500 14px var(--sans);cursor:pointer;display:flex;align-items:center;gap:8px"><i class="ph ph-chalkboard-teacher"></i>Coach console</button></div>'
         + SHEET_H.format(t='Member') +
         '<sc-for list="{{ bar.people }}" as="q"><button sc-camel-on-click="{{ q.go }}" style="display:block;width:100%;text-align:left;min-height:56px;padding:10px 14px;margin-bottom:6px;border:1px solid var(--hair);border-radius:14px;background:{{ q.bg }};color:{{ q.fg }};cursor:pointer">'
         '<span style="display:block;font:500 15px var(--sans)">{{ q.name }}</span><span style="display:block;font:400 13px/1.4 var(--sans);opacity:.85;margin-top:2px">{{ q.sub }}</span></button></sc-for>'
         + SHEET_H.format(t='Device') +
         '<div style="display:flex;gap:8px;flex-wrap:wrap"><sc-for list="{{ bar.devs }}" as="dv">' + SHEET_PILL.format(v='dv', inner='<i class="{{ dv.icon }}"></i>{{ dv.label }}') + '</sc-for></div>'
         + SHEET_H.format(t='Demo clock') +
         '<sc-for list="{{ bar.steps }}" as="s"><button sc-camel-on-click="{{ s.go }}" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;min-height:44px;padding:0 12px;border:0;border-radius:10px;background:{{ s.bg }};color:var(--ink);font:{{ s.weight }} 14px var(--sans);cursor:pointer">'
         '<span style="width:22px;text-align:right;color:var(--mute);font-variant-numeric:tabular-nums">{{ s.n }}</span><span>{{ s.title }}</span></button></sc-for>'
         '<div style="display:flex;gap:8px;margin-top:18px">'
         '<button sc-camel-on-click="{{ bar.theme }}" style="min-height:44px;padding:0 16px;border-radius:22px;border:1px solid var(--hair);background:transparent;color:var(--ink);font:500 14px var(--sans);cursor:pointer;display:flex;align-items:center;gap:8px"><i class="{{ themeIcon }}"></i>{{ themeLabel }}</button>'
         '<button sc-camel-on-click="{{ bar.reset }}" style="min-height:44px;padding:0 16px;border-radius:22px;border:1px solid var(--hair);background:transparent;color:var(--ink);font:500 14px var(--sans);cursor:pointer;display:flex;align-items:center;gap:8px"><i class="ph ph-arrow-counter-clockwise"></i>Start again</button></div>'
         '</div></sc-if>'
         '<sc-if value="{{ bar.coachSmall }}"><div data-bridge="demo-coach-note" style="position:fixed;left:12px;right:12px;bottom:12px;z-index:30;padding:14px 16px;border-radius:14px;background:var(--ink);color:var(--paper);font:400 14px/1.45 var(--sans)">'
         'The coach console is made for a laptop. Open this page on a wider screen to read it, or switch to the member app.</div></sc-if>')
DEMO_CSS = ('\n<style data-bridge="demo-css">'
            '[data-fit="phone"] [aria-label="Persona"],[data-fit="phone"] [aria-label="Device"],[data-fit="phone"] button[aria-label^="Device:"],'
            '[data-fit="phone"] div:has(> button[aria-label="Member"]),[data-fit="phone"] button[aria-label="Reset the demo"],'
            '[data-fit="phone"] button[aria-label="Dark"],[data-fit="phone"] button[aria-label="Light"]{display:none!important}'
            '[data-fit="phone"]{justify-content:space-between}'
            '[data-screen-label="Demo bar"]::-webkit-scrollbar{display:none}'
            'details[open]>summary [data-bridge="reach-caret"]{transform:rotate(180deg)}'
            '@media (max-width:1299px){[data-m=goal],[data-m=born]{display:none!important}'
            '[data-m=grid]{grid-template-columns:minmax(0,1.4fr) 64px minmax(0,1fr) minmax(0,1.2fr) 80px minmax(96px,auto) 112px!important}'
            '[data-m=rvline]{grid-template-columns:minmax(150px,190px) minmax(0,1fr) auto!important;gap:20px!important}'
            '[data-m=rvopen]{grid-template-columns:0 minmax(0,1fr) 220px!important;gap:20px!important}}</style>')

PATCHES = [
    ("scripts", '<script src="/constellation/js/support.js"></script>', "after",
     '\n<script data-bridge="scripts" src="/constellation/lib/core.js"></script>'
     '\n<script data-bridge="scripts-net" src="/constellation/lib/net.js"></script>'
     '\n<script data-bridge="scripts-ask" src="/constellation/lib/ask.js"></script>'
     '\n<script data-bridge="scripts-bridge" src="/constellation/js/constellation-bridge.js"></script>'),
    ("heroes-library", '<sc-if value="{{ hz.addClosed }}" hint-placeholder-val="{{ true }}">', "before",
     '<button data-bridge="heroes-library" sc-camel-on-click="{{ hz.explore }}" style="display:flex;gap:14px;width:100%;text-align:left;padding:16px;margin:0 0 16px;border:1px solid var(--hair);border-radius:16px;background:var(--well);color:var(--ink);cursor:pointer;align-items:center" style-hover="border-color:var(--ink)">'
     '<div style="width:44px;height:44px;border-radius:50%;background:var(--paper);border:1px solid var(--hair);display:flex;align-items:center;justify-content:center;flex:none"><i class="ph ph-books" style="font-size:20px;color:var(--pru)"></i></div>'
     '<div style="flex:1;min-width:0"><div style="font:500 12px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--faint)">The library</div><div style="font:400 17px/1.35 var(--serif);margin-top:2px">{{ hz.exploreLine }}</div></div>'
     '<i class="ph ph-caret-right" style="color:var(--faint);flex:none;font-size:18px"></i></button>\n                      '),
    ("hero-library", '<sc-if value="{{ hv.hasWorks }}">', "before",
     '<button data-bridge="hero-library" sc-camel-on-click="{{ hv.explore }}" style="display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;min-height:48px;margin-top:22px;padding:0 18px;border:1px solid var(--ink);border-radius:24px;background:transparent;color:var(--ink);font:500 14px var(--sans);cursor:pointer;text-align:left" style-hover="background:var(--well)">'
     '<span style="display:flex;align-items:center;gap:8px"><i class="ph ph-books"></i>{{ hv.exploreLabel }}</span><i class="ph ph-caret-right"></i></button>\n                '),
    ("week-trail", 'Developed with Jennifer</div>\n                      </div>', "after",
     '\n                      <div data-bridge="week-trail" style="margin-top:4px"><sc-for list="{{ wk.notes }}" as="n"><button sc-camel-on-click="{{ n.go }}" style="display:flex;align-items:center;gap:10px;width:100%;min-height:48px;padding:8px 0;border:0;border-top:1px solid var(--hair);background:transparent;color:var(--ink);font:400 14px/1.45 var(--sans);cursor:pointer;text-align:left" style-hover="color:var(--pru)">'
     '<i class="{{ n.icon }}" style="font-size:18px;color:var(--faint);flex:none"></i><span style="flex:1;min-width:0">{{ n.text }} <span style="color:var(--pru)">{{ n.cta }}</span></span><i class="ph ph-caret-right" style="color:var(--faint);flex:none"></i></button></sc-for></div>'),
    ("story-library", '<sc-if value="{{ sv.declined }}">', "before",
     '<sc-if value="{{ sv.exploreShow }}"><button data-bridge="story-library" sc-camel-on-click="{{ sv.explore }}" style="display:flex;align-items:center;justify-content:space-between;width:100%;min-height:48px;margin-top:18px;padding:0;border:0;border-top:1px solid var(--hair);background:transparent;color:var(--pru);font:500 14px var(--sans);cursor:pointer;text-align:left">'
     '<span style="display:flex;align-items:center;gap:8px"><i class="ph ph-path"></i>{{ sv.exploreLabel }}</span><i class="ph ph-caret-right"></i></button></sc-if>\n                '),
    ("library-overlay", '<sc-if value="{{ ov.thread }}">', "before",
     '<sc-if value="{{ lx.mounted }}"><div data-bridge="library-overlay" data-screen-label="M15 Library" style="position:absolute;top:0;left:0;right:0;bottom:0;background:var(--paper);z-index:20;display:{{ lx.disp }};flex-direction:column;animation:cpUp 420ms var(--ease) both">'
     '<div style="height:52px;flex:none;display:flex;align-items:center;gap:4px;padding:0 6px;border-bottom:1px solid var(--hair)">'
     '<button sc-camel-on-click="{{ lx.back }}" aria-label="{{ lx.backLabel }}" style="flex:none;max-width:42%;min-width:44px;height:44px;display:flex;align-items:center;gap:2px;padding:0 10px 0 4px;border:0;border-radius:22px;background:transparent;color:var(--pru);font:500 15px var(--sans);cursor:pointer;white-space:nowrap;overflow:hidden"><i class="{{ lx.backIcon }}" style="font-size:20px;flex:none"></i><span style="overflow:hidden;text-overflow:ellipsis">{{ lx.backText }}</span></button>'
     '<div data-bridge="library-where" style="flex:1;min-width:0;padding:0 4px;font:500 15px var(--sans);color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ lx.title }}</div>'
     '<sc-if value="{{ lx.canBrowse }}"><button sc-camel-on-click="{{ lx.browse }}" style="flex:none;min-width:44px;height:44px;padding:0 10px;border:0;border-radius:22px;background:transparent;color:var(--pru);font:500 14px var(--sans);cursor:pointer">Browse</button></sc-if></div>'
     '<iframe sc-camel-src="{{ lx.src }}" title="The Constellation library" style="flex:1;width:100%;border:0;background:var(--paper)"></iframe></div></sc-if>\n          '),
    ("pane-kept", '<div data-screen-label="Detail pane" style="position:{{ pane.pos }};', "replace",
     '<div data-bridge="pane-kept" data-screen-label="Detail pane" style="display:{{ pane.disp }};position:{{ pane.pos }};'),
    ("coach-explore", '<sc-if value="{{ cs.C4 }}">', "before",
     '<sc-if value="{{ cx.mounted }}"><div data-bridge="coach-explore" data-screen-label="CX Library" style="height:100%;display:{{ cx.disp }};flex-direction:column">'
     + TABS.format(mark="coach-tabs") +
     '<iframe sc-camel-src="{{ cx.src }}" title="The Constellation library" style="flex:1;width:100%;border:0;background:var(--paper)"></iframe></div></sc-if>\n              '),
    ("send-tabs", '<div data-screen-label="C4 Library" style="display:grid;', "before", TABS.format(mark="send-tabs") + '\n                '),
    ("send-verify", '<sc-if value="{{ lib.dis }}"><div style="font:400 12px var(--sans);color:var(--mad)">Verify the source before sending.</div></sc-if>', "after",
     '<sc-if value="{{ lib.dis }}"><button data-bridge="send-verify" sc-camel-on-click="{{ lib.inLibrary }}" style="align-self:flex-start;height:30px;padding:0 12px;border-radius:15px;border:1px solid var(--pru);background:transparent;color:var(--pru);font:500 12px var(--sans);cursor:pointer">Check the source in the Library</button></sc-if>'),
    ("lib-none", "No stories match. The corpus covers eight of the twenty-two situations so far.", "replace",
     "No stories match these filters. Clear one, or open the Library to search the whole corpus."),
    ("story-draft", '<sc-if value="{{ sv.hasPattern }}">', "before",
     '<sc-if value="{{ sv.isDraft }}"><div data-bridge="story-draft" style="display:flex;align-items:center;gap:2px;margin:12px 0 0"><p style="font:400 14px/1.45 var(--sans);color:var(--mad);margin:0">{{ sv.draftNote }}</p>'
     + DRAFT_INFO.replace('@V@', 'sv') + '</div>'
     '<sc-if value="{{ sv.draftInfo.open }}"><p data-bridge="draft-why" style="font:400 16px/1.5 var(--sans);color:var(--ink);margin:2px 0 0">{{ sv.draftInfo.text }}</p></sc-if></sc-if>\n                '),
    ("story-check", '<sc-if value="{{ sv.hasPattern }}">', "before",
     '<sc-if value="{{ sv.checkAsk }}"><button data-bridge="story-check" sc-camel-on-click="{{ sv.checkAsk.go }}" disabled="{{ sv.checkAsk.dis }}" style="margin-top:10px;min-height:44px;padding:0 18px;border-radius:22px;border:1px solid var(--mad);background:transparent;color:var(--mad);font:500 13px var(--sans);cursor:pointer">{{ sv.checkAsk.label }}</button>'
     '<sc-if value="{{ sv.checkAsk.after }}"><p style="font:400 14px/1.45 var(--sans);color:var(--mute);margin:6px 0 0">{{ sv.checkAsk.after }}</p></sc-if></sc-if>\n                '),
    ("story-related", '<sc-if value="{{ sv.exploreShow }}"><button data-bridge="story-library"', "before",
     '<sc-if value="{{ sv.hasRel }}"><div data-bridge="story-related" style="margin-top:22px;padding-top:14px;border-top:1px solid var(--hair)">' + HEAD + GROUPS.replace('@LIST@', 'sv.rel') + '</div></sc-if>\n                '),
    ("hero-related", '<button data-bridge="hero-library"', "before",
     '<sc-if value="{{ hv.hasLib }}"><div data-bridge="hero-related" style="margin-top:28px;padding-top:14px;border-top:1px solid var(--hair)">' + HEAD + GROUPS.replace('@LIST@', 'hv.lib') + '</div></sc-if>\n                '),
    ("send-related", '<sc-if value="{{ lib.hasMsg }}"><div style="font:500 12px var(--sans);color:var(--pru)">{{ lib.msg }}</div></sc-if>', "after",
     '<sc-if value="{{ lib.hasRel }}"><div data-bridge="send-related" style="margin-top:10px;border-top:1px solid var(--hair);padding-top:12px">'
     '<div style="font:500 12px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--faint)">Related in the library</div>'
     '<sc-for list="{{ lib.rel }}" as="r"><button sc-camel-on-click="{{ r.go }}" style="display:block;width:100%;text-align:left;padding:9px 0;border:0;border-bottom:1px solid var(--hair);background:transparent;color:var(--ink);cursor:pointer" style-hover="color:var(--pru)">'
     '<span style="display:block;font:400 15px/1.35 var(--serif)">{{ r.title }}</span><span style="display:block;font:400 12px/1.45 var(--sans);color:var(--mute);margin-top:2px">{{ r.why }}</span></button></sc-for>'
     '<button sc-camel-on-click="{{ lib.inLibrary }}" style="margin-top:10px;height:32px;padding:0 13px;border-radius:16px;border:1px solid var(--pru);background:transparent;color:var(--pru);font:500 12px var(--sans);cursor:pointer">Open this story in the Library</button></div></sc-if>'),
    ("demo-bar", '<div data-screen-label="Demo bar" style="height:52px;display:flex;align-items:center;gap:14px;padding:0 18px;', "replace",
     '<div data-bridge="demo-bar" data-fit="{{ bar.fit }}" data-screen-label="Demo bar" style="height:52px;display:flex;align-items:center;gap:{{ bar.gap }}px;padding:0 {{ bar.pad }}px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;'),
    ("demo-brand", '<div style="font-family:var(--serif);font-size:20px;letter-spacing:-.02em">Constellation</div>', "replace",
     '<div data-bridge="demo-brand" style="display:{{ bar.brandDisp }};flex:none;font-family:var(--serif);font-size:20px;letter-spacing:-.02em">Constellation</div>'),
    ("demo-clock", '<div style="flex:1;display:flex;align-items:center;justify-content:flex-end;gap:8px;min-width:0;overflow:hidden">', "replace",
     '<div data-bridge="demo-clock" style="flex:1;display:flex;align-items:center;justify-content:flex-end;gap:8px;min-width:{{ bar.clockMin }};overflow:hidden">'),
    ("demo-steps", '<div style="display:flex;gap:2px;flex:none;min-width:0">', "replace",
     STEPPER + '<div data-bridge="demo-steps" style="display:{{ bar.pillsDisp }};gap:2px;flex:none;min-width:0">'),
    ("demo-menu", '<button sc-camel-on-click="{{ toggleTheme }}"', "before",
     '<sc-if value="{{ bar.phone }}"><button data-bridge="demo-menu" sc-camel-on-click="{{ bar.toggle }}" aria-expanded="{{ bar.sheet }}" aria-label="Demo controls" style="height:36px;padding:0 14px;border-radius:18px;border:1px solid var(--hair);background:{{ bar.menuBg }};color:{{ bar.menuFg }};font:500 13px var(--sans);display:flex;align-items:center;gap:6px;flex:none;cursor:pointer"><i class="ph ph-sliders-horizontal" style="font-size:16px"></i>Demo</button></sc-if>'),
    ("demo-sheet", '<div style="position:relative;height:calc(100vh - 52px);display:flex;align-items:center;justify-content:center;overflow:hidden">', "before", SHEET + '\n  '),
    ("demo-css", '<script src="/constellation/js/support.js"></script>', "after", DEMO_CSS),
    ("demo-clock-word", '<sc-if value="{{ wide }}"><span style="font:500 11px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--faint);white-space:nowrap">Demo clock</span></sc-if>', "replace",
     '<sc-if value="{{ bar.clockWord }}"><span data-bridge="demo-clock-word" style="font:500 12px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--faint);white-space:nowrap">Demo clock</span></sc-if>'),
    ("demo-clock-line", '<sc-if value="{{ wide }}"><span title="{{ clockLabel }}"', "replace",
     '<sc-if value="{{ bar.clockLine }}"><span data-bridge="demo-clock-line" title="{{ clockLabel }}"'),
    ("ask-find", '<div style="font:400 11px var(--sans);color:var(--faint);margin-top:4px">{{ m.at }}</div>', "before",
     '<sc-if value="{{ m.find }}"><button data-bridge="ask-find" sc-camel-on-click="{{ m.find }}" style="margin-top:8px;height:32px;padding:0 13px;border-radius:16px;border:1px solid var(--pru);background:transparent;color:var(--pru);font:500 12px var(--sans);cursor:pointer;display:flex;align-items:center;gap:6px"><i class="ph ph-books"></i>Find a story for this</button></sc-if>'),
    ("ask-reply", '<div style="font:400 11px var(--sans);color:var(--faint);margin-top:4px">{{ m.at }}</div>', "before",
     '<sc-if value="{{ m.reply }}"><div data-bridge="ask-reply" style="margin-top:10px;padding:12px 14px;border:1px solid var(--hair);border-radius:12px;background:var(--paper);text-align:left;max-width:440px">'
     '<div style="font:500 12px var(--sans);letter-spacing:.06em;text-transform:uppercase;color:var(--faint)">Ready to send</div>'
     '<sc-if value="{{ m.reply.was }}"><div style="font:400 13px/1.45 var(--sans);color:var(--mute);margin-top:4px">{{ m.reply.was }}</div></sc-if>'
     '<div style="font:400 17px/1.3 var(--serif);color:var(--ink);margin-top:4px">{{ m.reply.title }}</div>'
     '<div style="font:400 13px/1.45 var(--sans);color:var(--mute);margin-top:4px">{{ m.reply.why }}</div>'
     '<input value="{{ m.reply.note }}" sc-camel-on-change="{{ m.reply.setNote }}" placeholder="{{ m.reply.ph }}" aria-label="{{ m.reply.ph }}" style="width:100%;box-sizing:border-box;min-height:36px;margin-top:10px;padding:0 10px;border:1px solid var(--hair);border-radius:10px;background:var(--well);color:var(--ink);font:400 13px var(--sans)">'
     '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"><button sc-camel-on-click="{{ m.reply.send }}" style="min-height:36px;padding:0 14px;border-radius:18px;border:0;background:var(--ink);color:var(--paper);font:500 13px var(--sans);cursor:pointer">{{ m.reply.sendLabel }}</button>'
     '<button sc-camel-on-click="{{ m.reply.other }}" style="min-height:36px;padding:0 10px;border:0;background:transparent;color:var(--pru);font:500 13px var(--sans);cursor:pointer">Other stories for this</button></div></div></sc-if>'
     '<sc-if value="{{ m.answered }}"><div data-bridge="ask-answered" style="margin-top:8px;font:500 12px var(--sans);color:var(--pru)"><i class="ph ph-check" style="margin-right:4px"></i>{{ m.answered }}</div></sc-if>'),
    ("story-reach", '<p style="font:400 16px/1.5 var(--serif);margin:6px 0 0">{{ sv.why }}</p>', "after",
     '<sc-if value="{{ sv.hasReach }}"><details data-bridge="story-reach" style="margin-top:16px;padding:4px 16px;border-radius:16px;background:var(--well)">'
     '<summary style="cursor:pointer;min-height:44px;display:flex;align-items:center;justify-content:space-between;font:500 12px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--faint)">How it reaches your three<i class="ph ph-caret-down" data-bridge="reach-caret" aria-hidden="true" style="font-size:16px;color:var(--pru)"></i></summary>'
     '<p style="font:400 16px/1.45 var(--serif);margin:6px 0 0">{{ sv.reach.lede }}</p>'
     '<div role="list" style="display:flex;align-items:flex-start;margin-top:12px"><sc-for list="{{ sv.reach.people }}" as="p">'
     '<sc-if value="{{ p.link }}"><span aria-hidden="true" style="flex:1;min-width:16px;max-width:90px;height:1.5px;background:var(--pru);opacity:.6;margin-top:22px;position:relative"><span style="position:absolute;top:-9px;left:50%;transform:translateX(-50%);width:18px;height:18px;border-radius:50%;background:var(--paper);border:1.25px solid var(--pru);font:500 12px/16px var(--sans);color:var(--pru);text-align:center">{{ p.n }}</span></span></sc-if>'
     '<button role="listitem" sc-camel-on-click="{{ p.open }}" style="border:0;background:transparent;padding:0;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;width:84px;flex:none;color:var(--ink)"><span style="width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:500 14px var(--sans);background:{{ p.bg }};color:{{ p.fg }}">{{ p.ini }}</span>'
     '<span style="font:400 13px/1.3 var(--sans);text-align:center">{{ p.name }}<span style="display:block;font-size:12px;color:var(--faint)">{{ p.year }}</span></span></button></sc-for></div>'
     '<ol style="list-style:none;margin:12px 0 0;padding:0"><sc-for list="{{ sv.reach.steps }}" as="x"><li style="display:grid;grid-template-columns:26px minmax(0,1fr);gap:10px;padding:6px 0;font:400 16px/1.5 var(--serif)"><span aria-hidden="true" style="width:18px;height:18px;margin-top:3px;border-radius:50%;border:1.25px solid var(--pru);font:500 12px/16px var(--sans);color:var(--pru);text-align:center">{{ x.n }}</span><span>{{ x.text }}</span></li></sc-for></ol>'
     '<p style="font:400 16px/1.45 var(--sans);color:var(--ink);margin:8px 0 12px">Tap a name to read about them.</p></details></sc-if>'),
    ("heroes-near", '<sc-if value="{{ hz.addClosed }}" hint-placeholder-val="{{ true }}">', "before",
     '<button data-bridge="heroes-near" sc-camel-on-click="{{ hz.near }}" style="display:flex;gap:14px;width:100%;text-align:left;padding:14px 16px;margin:-6px 0 16px;border:1px solid var(--hair);border-radius:16px;background:transparent;color:var(--ink);cursor:pointer;align-items:center" style-hover="border-color:var(--ink)">'
     '<div style="width:44px;height:44px;border-radius:50%;background:var(--well);display:flex;align-items:center;justify-content:center;flex:none"><i class="ph ph-circles-three" style="font-size:20px;color:var(--mad)"></i></div>'
     '<div style="flex:1;min-width:0"><div style="font:400 17px/1.3 var(--serif)">Who stands near your three</div><div style="font:400 16px/1.45 var(--sans);color:var(--mute);margin-top:3px">{{ hz.nearLine }}</div></div>'
     '<i class="ph ph-caret-right" style="color:var(--faint);flex:none;font-size:18px"></i></button>\n                      '),
    ("mute-token", '--mute:#6B6F78;', "replace", '--mute:#5E626B;'),
    ("you-library", '<div style="font:500 11px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--faint);margin:26px 0 4px">Your moves</div>', "before",
     '<div data-bridge="you-library" style="font:500 12px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--faint);margin:26px 0 4px">In the library</div>'
     '<sc-for list="{{ yu.lib }}" as="r"><button sc-camel-on-click="{{ r.go }}" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;min-height:56px;padding:10px 0;border:0;border-top:1px solid var(--hair);background:transparent;color:var(--ink);cursor:pointer" style-hover="color:var(--pru)">'
     '<i class="{{ r.icon }}" style="font-size:20px;color:var(--faint);flex:none"></i><span style="flex:1;min-width:0"><span style="display:block;font:400 17px/1.3 var(--serif)">{{ r.title }}</span><span style="display:block;font:400 16px/1.45 var(--sans);color:var(--mute);margin-top:2px">{{ r.line }}</span></span>'
     '<i class="ph ph-caret-right" style="color:var(--faint);flex:none;font-size:16px"></i></button></sc-for>\n                    '),
    ("review-fill", '<sc-if value="{{ r.none }}"><div style="font:400 17px/1.5 var(--serif);color:var(--mute)">No eligible story.</div></sc-if>', "after",
     '<sc-if value="{{ r.pairNote }}"><div data-bridge="review-pair" style="margin-top:10px;padding:8px 12px;border-radius:10px;background:var(--mad12);color:var(--mad);font:400 13px/1.45 var(--sans)">{{ r.pairNote }}</div></sc-if>'
     '<sc-if value="{{ r.fill }}"><div data-bridge="review-fill" style="margin-top:12px;padding:14px 16px;border:1px solid var(--hair);border-radius:12px;background:var(--well)">'
     '<div style="font:500 12px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--faint)">One check and {{ r.first }} has a story</div>'
     '<div style="font:400 16px/1.4 var(--serif);margin-top:6px">{{ r.fill.title }}</div>'
     '<div style="font:400 13px/1.45 var(--sans);color:var(--mute);margin-top:4px">{{ r.fill.why }}</div>'
     '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button sc-camel-on-click="{{ r.fill.check }}" style="height:34px;padding:0 14px;border-radius:17px;border:{{ r.fill.bd }};background:{{ r.fill.bg }};color:{{ r.fill.fg }};font:500 13px var(--sans);cursor:pointer">{{ r.fill.checkLabel }}</button>'
     '<button sc-camel-on-click="{{ r.fill.read }}" style="height:34px;padding:0 14px;border-radius:17px;border:1px solid var(--hair);background:transparent;color:var(--ink);font:500 13px var(--sans);cursor:pointer">Read it in the library</button></div>'
     '<sc-if value="{{ r.fill.hasNext }}"><div style="font:400 13px/1.45 var(--sans);color:var(--mute);margin-top:10px">{{ r.fill.next }}</div></sc-if>'
     '<sc-if value="{{ r.fill.card.show }}"><div data-bridge="check-card" style="margin-top:12px;padding:14px 16px;border:1px solid var(--hair);border-radius:12px;background:var(--paper)"><div style="font:400 18px/1.3 var(--serif);color:var(--ink)">{{ r.fill.card.title }}</div><p style="font:400 16px/1.55 var(--serif);color:var(--ink);margin:8px 0 0">{{ r.fill.card.moment }}</p><sc-if value="{{ r.fill.card.pattern }}"><p style="font:italic 400 16px/1.5 var(--serif);color:var(--mute);margin:8px 0 0">{{ r.fill.card.pattern }}</p></sc-if><p style="font:400 13px/1.5 var(--sans);color:var(--mute);margin:10px 0 0">Source: {{ r.fill.card.source }}</p><sc-if value="{{ r.fill.card.todo }}"><label style="display:block;font:500 12px var(--sans);letter-spacing:.06em;text-transform:uppercase;color:var(--faint);margin:12px 0 4px">What you checked it against</label><input value="{{ r.fill.card.note }}" sc-camel-on-change="{{ r.fill.card.setNote }}" placeholder="The edition, the page, the interview" aria-label="What you checked it against" style="width:100%;box-sizing:border-box;min-height:40px;padding:0 12px;border:1px solid var(--hair);border-radius:10px;background:var(--well);color:var(--ink);font:400 14px var(--sans)"><div style="font:400 12px var(--sans);color:var(--mute);margin-top:6px">Checked by {{ r.fill.card.by }}</div><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px"><button sc-camel-on-click="{{ r.fill.card.send }}" disabled="{{ r.fill.card.dis }}" style="min-height:40px;padding:0 16px;border-radius:20px;border:0;background:var(--ink);color:var(--paper);font:500 13px var(--sans);cursor:pointer;opacity:{{ r.fill.card.op }}">{{ r.fill.card.sendLabel }}</button><sc-if value="{{ r.fill.card.both }}"><button sc-camel-on-click="{{ r.fill.card.only }}" disabled="{{ r.fill.card.dis }}" style="min-height:40px;padding:0 10px;border:0;background:transparent;color:var(--pru);font:500 13px var(--sans);cursor:pointer;opacity:{{ r.fill.card.op }}">Checked only</button></sc-if></div></sc-if><sc-if value="{{ r.fill.card.done }}"><p style="font:500 13px/1.45 var(--sans);color:var(--pru);margin:12px 0 0"><i class="ph ph-seal-check"></i> {{ r.fill.card.doneText }}</p></sc-if></div></sc-if>'
     '</div></sc-if>'),
    ("review-asked", '<sc-if value="{{ r.none }}"><div style="font:400 17px/1.5 var(--serif);color:var(--mute)">No eligible story.</div></sc-if>', "after",
     '<sc-if value="{{ r.asked }}"><div data-bridge="review-asked" style="margin-top:8px;font:500 13px/1.45 var(--sans);color:var(--pru)"><i class="ph ph-hand-waving" style="margin-right:6px"></i>{{ r.asked }}</div></sc-if>'),
    ("send-for", '<p style="font:400 16px/1.55 var(--serif);margin:12px 0 0">{{ lib.p.moment }}</p>', "after",
     '<sc-if value="{{ lib.forLine }}"><div data-bridge="send-for" style="margin-top:12px;padding:10px 12px;border-radius:10px;background:var(--well);font:400 13px/1.5 var(--sans);color:var(--ink)">{{ lib.forLine }}'
     '<sc-if value="{{ lib.cmp }}"><button sc-camel-on-click="{{ lib.cmp.go }}" style="display:block;margin-top:8px;min-height:32px;padding:0 14px;border-radius:16px;border:1px solid var(--pru);background:transparent;color:var(--pru);font:500 12px var(--sans);cursor:pointer">{{ lib.cmp.label }}</button></sc-if></div></sc-if>'),
    ("ask-lib-a", 'margin-bottom:6px">From the library — not one of your three', "replace", 'margin-bottom:6px">From the library, beyond your three'),
    ("ask-lib-b", 'margin-bottom:8px">From the library — not one of your three', "replace", 'margin-bottom:8px">From the library, beyond your three'),
    ("ask-words", "Interpretation, drawn from their stories. Not their words.", "replace", "Our reading of their stories, in our words."),
    ("ask-sent", "He'll see it in your timeline.", "replace", "It shows in your timeline."),
    ("ask-draft", '<div style="font:500 11px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--faint);margin-bottom:4px">How your three would walk in</div>', "before",
     '<div data-bridge="ask-draft" style="margin:0 0 18px">'
     '<sc-if value="{{ ak.weekNote }}"><p style="font:400 14px/1.5 var(--sans);color:var(--mute);margin:0 0 8px">{{ ak.weekNote }}</p></sc-if>'
     '<sc-if value="{{ ak.draftMark }}"><div style="display:flex;align-items:center;gap:2px;margin:0 0 8px"><p style="font:500 13px/1.45 var(--sans);color:var(--mad);margin:0">{{ ak.draftMark }}</p>' + DRAFT_INFO.replace('@V@', 'ak') + '</div>'
     '<sc-if value="{{ ak.draftInfo.open }}"><p style="font:400 16px/1.5 var(--sans);color:var(--ink);margin:0 0 10px">{{ ak.draftInfo.text }}</p></sc-if></sc-if>'
     '<sc-if value="{{ ak.reach }}"><p style="font:400 15px/1.5 var(--serif);color:var(--ink);margin:0 0 10px">{{ ak.reach }}</p></sc-if>'
     '<sc-if value="{{ ak.checkAsk }}"><button sc-camel-on-click="{{ ak.checkAsk.go }}" disabled="{{ ak.checkAsk.dis }}" style="min-height:44px;padding:0 18px;border-radius:22px;border:1px solid var(--mad);background:transparent;color:var(--mad);font:500 13px var(--sans);cursor:pointer">{{ ak.checkAsk.label }}</button>'
     '<sc-if value="{{ ak.checkAsk.after }}"><p style="font:400 14px/1.45 var(--sans);color:var(--mute);margin:6px 0 0">{{ ak.checkAsk.after }}</p></sc-if></sc-if>'
     '</div>'),
    ("week-prep", '<button sc-camel-on-click="{{ wk.prep }}" disabled="{{ wk.prepDis }}" style="height:48px;border-radius:24px;background:var(--ink);color:var(--paper);border:0;font:500 14px var(--sans);cursor:pointer;width:100%;opacity:{{ wk.prepOp }}">Start the prep</button>', "replace",
     '<sc-if value="{{ wk.prepOpen }}"><button sc-camel-on-click="{{ wk.prep }}" style="height:48px;border-radius:24px;background:var(--ink);color:var(--paper);border:0;font:500 14px var(--sans);cursor:pointer;width:100%">Start the prep</button></sc-if>'),
    ("week-prep-hint", '<sc-if value="{{ wk.prepDis }}"><div style="font:400 12px var(--sans);color:var(--faint);text-align:center">{{ wk.prepHint }}</div></sc-if>', "replace",
     '<sc-if value="{{ wk.prepDis }}"><div data-bridge="week-prep" style="font:400 16px/1.5 var(--serif);color:var(--mute)">{{ wk.prepHint }}</div></sc-if>'),
    ("send-ask", '<div style="font:500 11px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--faint);padding:0 8px 6px">Situation</div>', "before",
     '<div data-bridge="send-ask" style="padding:0 8px 16px"><div style="font:500 12px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--faint);padding:0 0 6px">Ask for {{ lib.toFirst }}</div>'
     '<textarea rows="2" value="{{ lib.ask }}" sc-camel-on-change="{{ lib.setAsk }}" placeholder="{{ lib.askPh }}" aria-label="What is the member facing?" style="width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--hair);border-radius:10px;background:var(--well);color:var(--ink);font:400 14px/1.45 var(--sans);resize:vertical"></textarea>'
     '<button sc-camel-on-click="{{ lib.askGo }}" style="margin-top:6px;min-height:32px;padding:0 14px;border-radius:16px;border:1px solid var(--pru);background:transparent;color:var(--pru);font:500 12px var(--sans);cursor:pointer">Ask the library</button></div>'),
    ("send-far", '<div style="font:500 12px var(--sans);color:var(--mute);margin-bottom:8px">{{ lib.count }}</div>', "after",
     '<sc-if value="{{ lib.farChip }}"><button data-bridge="send-far" sc-camel-on-click="{{ lib.farChip.go }}" style="margin:0 0 10px;min-height:32px;padding:0 12px;border-radius:16px;border:1px dashed var(--hair);background:transparent;color:var(--mute);font:500 12px var(--sans);cursor:pointer">{{ lib.farChip.label }}</button></sc-if>'),
    ("ask-shape", "You choose the shape. The story follows from it.", "replace", "Pick the closest, and a story follows."),
    ("review-guard", '<sc-if value="{{ r.none }}"><div style="font:400 17px/1.5 var(--serif);color:var(--mute)">No eligible story.</div></sc-if>', "after",
     '<sc-if value="{{ r.guard }}"><div data-bridge="review-guard" style="margin-top:8px;font:400 13px/1.45 var(--sans);color:var(--mute)"><i class="ph ph-clock-counter-clockwise" style="margin-right:6px"></i>{{ r.guard }}</div></sc-if>'),
    ("swap-pair", '<div style="font:400 12px/1.45 var(--sans);color:var(--faint);margin-top:4px">{{ sp.heroesLine }}</div>', "after",
     '<sc-if value="{{ sp.pairLine }}"><div data-bridge="swap-pair" style="margin-top:8px;padding:8px 10px;border-radius:8px;background:var(--well);font:400 13px/1.45 var(--sans);color:var(--ink)">{{ sp.pairLine }}</div></sc-if>'),
    ("review-why", '<div style="margin-top:8px;display:flex;flex-direction:column;gap:2px">\n                          <sc-for list="{{ r.trace }}" as="t"><div style="font:400 12px/1.45 var(--sans);color:var(--faint)">{{ t }}</div></sc-for>\n                        </div>', "replace",
     '<details data-bridge="review-why" style="margin-top:8px"><summary style="cursor:pointer;min-height:32px;display:flex;align-items:center;font:500 13px var(--sans);color:var(--pru)">Why this story</summary>'
     '<div style="display:flex;flex-direction:column;gap:4px;margin-top:4px"><sc-for list="{{ r.trace }}" as="t"><div style="font:400 14px/1.5 var(--sans);color:var(--mute)">{{ t }}</div></sc-for></div></details>'),
    # under the held line: While you wait, one row opening the story that fits the member best (CLN.fitFor)
    ("week-wait", 'No story this week. {{ coach.first }} chose to wait.</p></sc-if>', "after",
     '<sc-if value="{{ wk.wait }}"><button data-bridge="week-wait" sc-camel-on-click="{{ wk.wait.go }}" style="display:flex;align-items:center;gap:12px;width:100%;min-height:56px;margin:-8px 0 0;padding:12px 0 2px;border:0;border-top:1px solid var(--hair);background:transparent;color:var(--ink);cursor:pointer;text-align:left" style-hover="color:var(--pru)">'
     '<span style="flex:1;min-width:0"><span style="display:block;font:500 12px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--faint)">While you wait</span>'
     '<span style="display:block;font:400 16px/1.35 var(--serif);margin-top:4px">{{ wk.wait.title }}</span>'
     '<span style="display:block;font:400 16px/1.45 var(--sans);color:var(--mute);margin-top:3px">{{ wk.wait.line }}</span></span>'
     '<i class="ph ph-caret-right" style="color:var(--faint);flex:none;font-size:16px"></i></button></sc-if>'),
    ("week-held", "No story this week. {{ coach.first }} chose to wait.", "replace", "{{ wk.heldText }}"),
    ("review-note-ph", 'placeholder="Shows on the member\'s story card"', "replace", 'data-bridge="review-note-ph" placeholder="Shows on the member\u2019s story card"'),
    ("swap-checked", '<span style="font:400 12px var(--sans);color:var(--faint);flex:1">{{ s.tier }} \u00b7 Verified</span>', "replace",
     '<span data-bridge="swap-checked" style="font:400 12px var(--sans);color:var(--faint);flex:1">{{ s.tier }} \u00b7 Checked</span>'),
    ("swap-check", '<sc-if value="{{ x.draft }}"><button disabled="{{ true }}" title="Verify the source before sending." style="margin-top:6px;height:28px;padding:0 10px;border-radius:14px;border:1px solid var(--mad);background:transparent;color:var(--mad);font:500 11px var(--sans);opacity:.6">Draft — must verify</button></sc-if>', "replace",
     '<sc-if value="{{ x.go }}"><button data-bridge="swap-check" sc-camel-on-click="{{ x.go }}" style="margin-top:8px;min-height:32px;padding:0 14px;border-radius:16px;border:1px solid var(--pru);background:transparent;color:var(--pru);font:500 12px var(--sans);cursor:pointer">{{ x.goLabel }}</button></sc-if>'
     '<sc-if value="{{ x.card.show }}"><div data-bridge="check-card" style="margin-top:12px;padding:14px 16px;border:1px solid var(--hair);border-radius:12px;background:var(--paper)"><div style="font:400 18px/1.3 var(--serif);color:var(--ink)">{{ x.card.title }}</div><p style="font:400 16px/1.55 var(--serif);color:var(--ink);margin:8px 0 0">{{ x.card.moment }}</p><sc-if value="{{ x.card.pattern }}"><p style="font:italic 400 16px/1.5 var(--serif);color:var(--mute);margin:8px 0 0">{{ x.card.pattern }}</p></sc-if><p style="font:400 13px/1.5 var(--sans);color:var(--mute);margin:10px 0 0">Source: {{ x.card.source }}</p><sc-if value="{{ x.card.todo }}"><label style="display:block;font:500 12px var(--sans);letter-spacing:.06em;text-transform:uppercase;color:var(--faint);margin:12px 0 4px">What you checked it against</label><input value="{{ x.card.note }}" sc-camel-on-change="{{ x.card.setNote }}" placeholder="The edition, the page, the interview" aria-label="What you checked it against" style="width:100%;box-sizing:border-box;min-height:40px;padding:0 12px;border:1px solid var(--hair);border-radius:10px;background:var(--well);color:var(--ink);font:400 14px var(--sans)"><div style="font:400 12px var(--sans);color:var(--mute);margin-top:6px">Checked by {{ x.card.by }}</div><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px"><button sc-camel-on-click="{{ x.card.send }}" disabled="{{ x.card.dis }}" style="min-height:40px;padding:0 16px;border-radius:20px;border:0;background:var(--ink);color:var(--paper);font:500 13px var(--sans);cursor:pointer;opacity:{{ x.card.op }}">{{ x.card.sendLabel }}</button><button sc-camel-on-click="{{ x.card.only }}" disabled="{{ x.card.dis }}" style="min-height:40px;padding:0 10px;border:0;background:transparent;color:var(--pru);font:500 13px var(--sans);cursor:pointer;opacity:{{ x.card.op }}">Checked only</button></div></sc-if><sc-if value="{{ x.card.done }}"><p style="font:500 13px/1.45 var(--sans);color:var(--pru);margin:12px 0 0"><i class="ph ph-seal-check"></i> {{ x.card.doneText }}</p></sc-if></div></sc-if>'),
    ("swap-pick", '<button sc-camel-on-click="{{ s.choose }}" style="height:30px;padding:0 12px;border-radius:15px;border:1px solid var(--ink);background:transparent;color:var(--ink);font:500 12px var(--sans);cursor:pointer">Choose</button>\n                          <button sc-camel-on-click="{{ s.pin }}" style="height:30px;padding:0 12px;border-radius:15px;border:1px solid var(--hair);background:transparent;color:var(--ink);font:500 12px var(--sans);cursor:pointer">Pin</button>', "replace",
     '<sc-if value="{{ s.canPick }}"><button data-bridge="swap-pick" sc-camel-on-click="{{ s.choose }}" style="height:30px;padding:0 12px;border-radius:15px;border:1px solid var(--ink);background:transparent;color:var(--ink);font:500 12px var(--sans);cursor:pointer">Choose</button>'
     '<button sc-camel-on-click="{{ s.pin }}" style="height:30px;padding:0 12px;border-radius:15px;border:1px solid var(--hair);background:transparent;color:var(--ink);font:500 12px var(--sans);cursor:pointer">Pin</button></sc-if>'),
    ("swap-head", '<div style="font:500 11px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--faint)">Eligible, in rule order</div>', "replace",
     '<div data-bridge="swap-head" style="font:500 11px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--faint)">Checked for this week, the line\u2019s first</div>'),
    # Check-ins: the console coach's own members, with All members for the rest, as Messages has it
    ("ck-scope", '<div data-screen-label="Check-ins" style="padding:22px 28px">', "after",
     '<sc-if value="{{ ckScope }}"><div data-bridge="ck-scope" style="display:flex;align-items:center;gap:8px;padding:0 0 12px"><span style="flex:1;font:500 12px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--faint)">{{ ckScope.head }}</span>'
     '<button sc-camel-on-click="{{ ckScope.go }}" aria-pressed="{{ ckScope.on }}" style="display:flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:16px;border:1px solid {{ ckScope.bd }};background:transparent;color:var(--mute);font:500 13px var(--sans);cursor:pointer"><i class="{{ ckScope.icon }}" style="font-size:18px"></i>All members</button></div></sc-if>'),
    # This week's room, once it has passed, is said as done (wk.comingHead)
    ("week-coming", '<div style="font:500 11px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--faint)">Coming up</div><div style="font:400 16px/1.35 var(--serif);margin-top:2px">{{ wk.coming }}</div>', "replace",
     '<div data-bridge="week-coming" style="font:500 11px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--faint)">{{ wk.comingHead }}</div><div style="font:400 16px/1.35 var(--serif);margin-top:2px">{{ wk.coming }}</div>'),
    # the console's line is developed with the member's own coach, as the member's card says
    ("line-coach", '>Line · Jennifer</div>', "replace", ' data-bridge="line-coach">Line · with {{ coach.first }}</div>'),
    # a member reads sentences at 16px: what the library holds for a hero (M4 and Heroes), and the targets reach 44px
    ("m4-status", '<div style="font:400 13px/1.45 var(--sans);color:var(--faint);margin-top:8px">{{ h.libLine }}</div>\n                    </div>', "replace",
     '<div data-bridge="m4-status" style="font:400 16px/1.45 var(--serif);color:var(--mute);margin-top:8px">{{ h.libLine }}</div>\n                    </div>'),
    ("hero-status", '<div style="font:400 14px/1.45 var(--sans);color:{{ h.helps.c }};margin-top:8px">{{ h.helps.text }}</div>\n                          <div style="font:400 13px/1.45 var(--sans);color:var(--faint);margin-top:4px">{{ h.libLine }}</div>', "replace",
     '<div data-bridge="hero-status" style="font:400 16px/1.45 var(--serif);color:{{ h.helps.c }};margin-top:8px">{{ h.helps.text }}</div>\n                          <div style="font:400 16px/1.45 var(--serif);color:var(--mute);margin-top:4px">{{ h.libLine }}</div>'),
    ("how-built", 'style="height:36px;padding:0;border:0;background:transparent;color:var(--pru);font:500 12px var(--sans);cursor:pointer;display:flex;align-items:center;gap:4px">How we built this', "replace",
     'data-bridge="how-built" style="min-height:44px;padding:0;border:0;background:transparent;color:var(--pru);font:500 12px var(--sans);cursor:pointer;display:flex;align-items:center;gap:4px">How we built this'),
    ("why-target", '<button sc-camel-on-click="{{ wk.toggleWhy }}" style="height:44px;padding:0;', "replace", '<button data-bridge="why-target" sc-camel-on-click="{{ wk.toggleWhy }}" style="height:44px;min-width:44px;padding:0;'),
    # small words: what a mark is, said where You first mentions one; a curly apostrophe
    ("you-marks", "Your first mark lands after Friday.", "replace", '<span data-bridge="you-marks">Your first marks show after Friday: what you did and what you said.</span>'),
    ("welcome-apos", "will meet you after you've picked your heroes.", "replace", 'will meet you after you\u2019ve picked your heroes.'),
    # Members: a long status wraps in its own column, never over the check-in beside it
    ("members-pill", 'font:500 12px/1.4 var(--sans);white-space:nowrap">{{ r.pill.t }}</span>', "replace", 'font:500 12px/1.4 var(--sans);white-space:normal;max-width:100%" data-bridge="members-pill">{{ r.pill.t }}</span>'),
    # the console reflows on a laptop narrower than 1300px: Members drops its Goal and Born columns (each member's page
    # holds both), and Review's columns narrow, so nothing is drawn under 12px and nothing overlaps (console-fit)
    ("members-grid", '<div style="display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr) 150px 64px minmax(0,1fr) minmax(0,1.1fr) 78px 94px 112px;gap:12px;padding:0 0 10px', "replace",
     '<div data-bridge="members-grid" data-m="grid" style="display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr) 150px 64px minmax(0,1fr) minmax(0,1.1fr) 78px 94px 112px;gap:12px;padding:0 0 10px'),
    ("members-headcells", '<span>Member</span><span>Goal</span><span>Born</span>', "replace", '<span data-bridge="members-headcells">Member</span><span data-m="goal">Goal</span><span data-m="born">Born</span>'),
    ("members-row", 'role="button" tabindex="0" style="display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr) 150px 64px minmax(0,1fr) minmax(0,1.1fr) 78px 94px 112px;gap:12px;padding:16px 0', "replace",
     'role="button" tabindex="0" data-bridge="members-row" data-m="grid" style="display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr) 150px 64px minmax(0,1fr) minmax(0,1.1fr) 78px 94px 112px;gap:12px;padding:16px 0'),
    ("members-goal", '<div style="font:italic 400 14px/1.4 var(--serif);color:var(--mute);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">{{ r.goal }}</div>', "replace",
     '<div data-bridge="members-goal" data-m="goal" style="font:italic 400 14px/1.4 var(--serif);color:var(--mute);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">{{ r.goal }}</div>'),
    ("members-born", '<div style="font:400 12px/1.45 var(--sans);color:var(--mute);font-variant-numeric:tabular-nums">{{ r.born }}</div>', "replace",
     '<div data-bridge="members-born" data-m="born" style="font:400 12px/1.45 var(--sans);color:var(--mute);font-variant-numeric:tabular-nums">{{ r.born }}</div>'),
    # "Your week, Jim": the header's switch for every member; no bulk approve, as anything left goes at 18:00 anyway
    ("review-head", '<button sc-camel-on-click="{{ rq.bulk }}" style="height:34px;padding:0 14px;border-radius:17px;border:1px solid var(--ink);background:transparent;color:var(--ink);font:500 13px var(--sans);cursor:pointer">Approve all remaining</button>', "replace",
     '<button data-bridge="review-head" sc-camel-on-click="{{ rq.scope.go }}" aria-pressed="{{ rq.scope.on }}" style="display:flex;align-items:center;gap:6px;height:34px;padding:0 12px;border-radius:17px;border:1px solid {{ rq.scope.bd }};background:transparent;color:var(--mute);font:500 13px var(--sans);cursor:pointer"><i class="{{ rq.scope.icon }}" style="font-size:18px"></i>All members</button>'),
    # one line per member: what happens at 18:00 (and Changed · Undo), what the coach can do, their week, when they meet
    # (and Prep), the guard, an open Ask and one action;
    # Details folds the line open onto the row as it was, its first column kept for alignment and hidden
    ("review-line", '<div style="display:grid;grid-template-columns:210px minmax(0,1fr) 300px;gap:28px;padding:20px 0;border-top:1px solid var(--hair)">\n                      <div>', "replace",
     '<div data-bridge="review-line" data-m="rvline" style="display:grid;grid-template-columns:236px minmax(0,1fr) auto;gap:28px;align-items:start;padding:16px 0;border-top:1px solid var(--hair)">'
     '<div><div style="display:flex;align-items:center;gap:10px"><span style="width:32px;height:32px;border-radius:50%;background:var(--well);border:1px solid var(--hair);display:flex;align-items:center;justify-content:center;font:500 12px var(--sans)">{{ r.ini }}</span><span style="font:400 17px var(--serif)">{{ r.name }}</span></div>'
     '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:0 6px;margin:4px 0 0 42px;font:400 14px/1.5 var(--sans);color:var(--mute)"><span>{{ r.when }}</span><sc-if value="{{ r.prep }}"><span aria-hidden="true">\u00b7</span><button sc-camel-on-click="{{ r.prep }}" style="min-height:28px;padding:0 2px;border:0;background:transparent;color:var(--pru);font:500 14px var(--sans);cursor:pointer">Prep</button></sc-if></div></div>'
     '<div style="min-width:0"><div data-bridge="review-outcome" style="font:500 16px/1.45 var(--sans);color:var(--ink)">{{ r.lead }}</div>'
     '<sc-if value="{{ r.undo }}"><div style="display:flex;align-items:center;gap:6px;font:400 14px/1.5 var(--sans);color:var(--mute)"><span>Changed</span><span aria-hidden="true">\u00b7</span><button data-bridge="review-undo" sc-camel-on-click="{{ r.undo }}" style="min-height:28px;padding:0 2px;border:0;background:transparent;color:var(--pru);font:500 14px var(--sans);cursor:pointer">Undo</button></div></sc-if>'
     '<sc-if value="{{ r.noteLine }}"><div data-bridge="review-note" style="font:italic 400 15px/1.5 var(--serif);color:var(--mute);margin-top:2px">{{ r.noteLine }}</div></sc-if>'
     '<sc-if value="{{ r.goes }}"><div style="font:400 16px/1.5 var(--sans);color:var(--ink);margin-top:4px">{{ r.goes }}</div></sc-if><sc-if value="{{ r.goesAlt }}"><div style="font:400 16px/1.5 var(--sans);color:var(--mute)">{{ r.goesAlt }}</div></sc-if>'
     '<div style="font:400 14px/1.5 var(--sans);color:var(--mute);margin-top:4px">{{ r.week }}</div>'
     '<sc-if value="{{ r.shut }}"><sc-if value="{{ r.guardShut }}"><div style="margin-top:4px;font:400 14px/1.45 var(--sans);color:var(--mute)"><i class="ph ph-clock-counter-clockwise" style="margin-right:6px"></i>{{ r.guardShut }}</div></sc-if><sc-if value="{{ r.asked }}"><div style="margin-top:4px;font:500 14px/1.45 var(--sans);color:var(--pru)"><i class="ph ph-hand-waving" style="margin-right:6px"></i>{{ r.asked }}</div></sc-if></sc-if>'
     '<sc-if value="{{ r.askOpen }}"><div style="margin-top:4px;font:400 14px/1.45 var(--sans);color:var(--pru)"><i class="ph ph-question" style="margin-right:6px"></i>{{ r.askOpen }}</div></sc-if></div>'
     '<div style="display:flex;gap:8px;align-items:center;justify-content:flex-end"><sc-if value="{{ r.act }}"><button sc-camel-on-click="{{ r.act.go }}" style="min-height:34px;max-width:220px;padding:6px 16px;border-radius:17px;border:0;background:var(--ink);color:var(--paper);font:500 13px/1.25 var(--sans);cursor:pointer">{{ r.act.label }}</button></sc-if>'
     '<button sc-camel-on-click="{{ r.fold }}" aria-expanded="{{ r.openS }}" aria-label="{{ r.foldAria }}" style="display:flex;align-items:center;gap:6px;height:34px;padding:0 12px;border-radius:17px;border:1px solid var(--hair);background:transparent;color:var(--ink);font:500 13px var(--sans);cursor:pointer">{{ r.foldLabel }}<i class="{{ r.foldIcon }}"></i></button></div></div>'
     '<sc-if value="{{ r.open }}"><div data-m="rvopen" style="display:grid;grid-template-columns:236px minmax(0,1fr) 300px;gap:28px;padding:0 0 22px">\n                      <div aria-hidden="true" style="visibility:hidden">'),
    ("review-line-end", '{{ r.corpusLabel }}</button></sc-if>\n                      </div>\n                    </div>', "after", '</sc-if><i data-bridge="review-line-end" hidden></i>'),
    # below the lines: the checks that give every member enough to send in the weeks after this one, each marked checked in
    # place and never sent from here; All eight opens the rest
    ("review-plan", '</sc-for>\n                </div>\n              </sc-if>\n              <sc-if value="{{ cx.mounted }}">', "replace", '</sc-for>' + '<sc-if value="{{ rq.plan }}"><div data-bridge="review-plan" style="margin-top:24px;padding:18px 20px 8px;border:1px solid var(--hair);border-radius:14px;background:var(--well)"><div style="font:500 12px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--faint)">{{ rq.plan.head }}</div><div style="font:400 16px/1.5 var(--sans);color:var(--ink);margin:4px 0 6px">{{ rq.plan.line }}</div><sc-for list="{{ rq.plan.items }}" as="p"><div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px 16px;align-items:center;padding:12px 0;border-top:1px solid var(--hair)"><div style="min-width:0"><div style="font:400 16px/1.35 var(--serif);color:var(--ink)">{{ p.title }}</div><div style="font:400 14px/1.45 var(--sans);color:var(--mute);margin-top:2px">{{ p.serves }}</div></div><button sc-camel-on-click="{{ p.go }}" style="height:34px;padding:0 16px;border-radius:17px;border:1px solid var(--ink);background:transparent;color:var(--ink);font:500 13px var(--sans);cursor:pointer">{{ p.label }}</button><sc-if value="{{ p.card.show }}"><div data-bridge="check-card" style="grid-column:1/-1;margin-top:4px;padding:14px 16px;border:1px solid var(--hair);border-radius:12px;background:var(--paper)"><div style="font:400 18px/1.3 var(--serif);color:var(--ink)">{{ p.card.title }}</div><p style="font:400 16px/1.55 var(--serif);color:var(--ink);margin:8px 0 0">{{ p.card.moment }}</p><sc-if value="{{ p.card.pattern }}"><p style="font:italic 400 16px/1.5 var(--serif);color:var(--mute);margin:8px 0 0">{{ p.card.pattern }}</p></sc-if><p style="font:400 13px/1.5 var(--sans);color:var(--mute);margin:10px 0 0">Source: {{ p.card.source }}</p><sc-if value="{{ p.card.todo }}"><label style="display:block;font:500 12px var(--sans);letter-spacing:.06em;text-transform:uppercase;color:var(--faint);margin:12px 0 4px">What you checked it against</label><input value="{{ p.card.note }}" sc-camel-on-change="{{ p.card.setNote }}" placeholder="The edition, the page, the interview" aria-label="What you checked it against" style="width:100%;box-sizing:border-box;min-height:40px;padding:0 12px;border:1px solid var(--hair);border-radius:10px;background:var(--well);color:var(--ink);font:400 14px var(--sans)"><div style="font:400 12px var(--sans);color:var(--mute);margin-top:6px">Checked by {{ p.card.by }}</div><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px"><button sc-camel-on-click="{{ p.card.send }}" disabled="{{ p.card.dis }}" style="min-height:40px;padding:0 16px;border-radius:20px;border:0;background:var(--ink);color:var(--paper);font:500 13px var(--sans);cursor:pointer;opacity:{{ p.card.op }}">{{ p.card.sendLabel }}</button><sc-if value="{{ p.card.both }}"><button sc-camel-on-click="{{ p.card.only }}" disabled="{{ p.card.dis }}" style="min-height:40px;padding:0 10px;border:0;background:transparent;color:var(--pru);font:500 13px var(--sans);cursor:pointer;opacity:{{ p.card.op }}">Checked only</button></sc-if></div></sc-if><sc-if value="{{ p.card.done }}"><p style="font:500 13px/1.45 var(--sans);color:var(--pru);margin:12px 0 0"><i class="ph ph-seal-check"></i> {{ p.card.doneText }}</p></sc-if></div></sc-if></div></sc-for><sc-if value="{{ rq.plan.more }}"><button sc-camel-on-click="{{ rq.plan.more.go }}" style="margin:4px 0 10px;min-height:36px;padding:0 14px;border-radius:18px;border:1px solid var(--pru);background:transparent;color:var(--pru);font:500 13px var(--sans);cursor:pointer">{{ rq.plan.more.label }}</button></sc-if></div></sc-if>' + '\n                </div>\n              </sc-if>\n              <sc-if value="{{ cx.mounted }}">'),
    # round five, one name for each thing: the export's own words where they said something untrue or internal
    # the 18:00 manifest at the top of the queue, in its flow (the floating notice stays off Review): who gets which story,
    # who gets nothing yet and why, then the rule for anything left, said for the day it is
    ("review-manifest", '<div style="font:400 12px var(--sans);color:var(--faint);margin-bottom:10px">Rows you don\'t act on go out as proposed on Sunday at 18:00, member-local, unless the member is on Hold for me.</div>', "replace",
     '<sc-if value="{{ rq.manifest }}"><div data-bridge="review-manifest" style="margin:8px 0 18px;padding:14px 18px;border:1px solid var(--hair);border-radius:14px;background:var(--well)">'
     '<div style="font:600 16px/1.4 var(--sans);color:var(--ink);margin-bottom:2px">{{ rq.manifest.head }}</div>'
     '<sc-for list="{{ rq.manifest.rows }}" as="x"><div data-mid="{{ x.mid }}" style="font:400 16px/1.5 var(--sans);color:var(--ink);margin-top:4px"><span style="font-weight:500">{{ x.first }}</span> \u00b7 {{ x.outcome }}</div></sc-for>'
     '<sc-if value="{{ rq.manifest.explain }}"><div data-bridge="review-explain" style="font:400 14px/1.5 var(--sans);color:var(--mute);margin-top:10px">{{ rq.manifest.explain }}</div></sc-if></div></sc-if>'),
    ("send-reach", '>Reachability</div>', "replace", ' data-bridge="send-reach">How close to an office</div>'),
    ("send-checked", '>Verification</div>', "replace", ' data-bridge="send-checked">Checked</div>'),
    ("fit-keys", "Keys inferred from {{ member.pos }} goal", "replace", '<span data-bridge="fit-keys">Situations read from {{ member.first }}\u2019s goal</span>'),
    ("hero-elsewhere", "Opens outside Constellation. The stories above are the checked record; these are places to read and listen further.", "replace",
     '<span data-bridge="hero-elsewhere">Opens outside Constellation: places to read, listen and watch further.</span>'),
    ("ask-words-if", '<div style="font:400 12px/1.4 var(--sans);color:var(--faint);padding-top:10px;border-top:1px solid var(--hair)">Our reading of their stories, in our words.</div>', "replace",
     '<sc-if value="{{ ak.anyWay }}"><div data-bridge="ask-words-if" style="font:400 12px/1.4 var(--sans);color:var(--faint);padding-top:10px;border-top:1px solid var(--hair)">Our reading of their stories, in our words.</div></sc-if>'),
    # the week's story names its hero without a kicker above it; the week's move is one line, the whole move behind Why
    ("week-no-kicker", '<div style="min-width:0"><div style="font:500 11px/1.4 var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--faint)">Inspired by</div><div style="font:500 11px/1.4 var(--sans);letter-spacing:.1em;text-transform:uppercase;color:{{ wk.ins.c }};margin-top:3px">{{ wk.ins.eyebrow }}</div></div>', "replace",
     '<div data-bridge="week-no-kicker" style="min-width:0"><div style="font:500 12px/1.4 var(--sans);letter-spacing:.1em;text-transform:uppercase;color:{{ wk.ins.c }}">{{ wk.ins.eyebrow }}</div></div>'),
    ("week-no-kicker-b", '<div style="border-left:2px solid var(--hair);padding:2px 0 2px 16px"><div style="font:500 11px/1.4 var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--faint)">Inspired by</div><p style="font:400 16px/1.5 var(--serif);color:var(--mute);margin:8px 0 0">{{ wk.nothingText }}</p></div>', "replace",
     '<div data-bridge="week-no-kicker-b" style="border-left:2px solid var(--hair);padding:2px 0 2px 16px"><p style="font:400 16px/1.5 var(--serif);color:var(--mute);margin:0">{{ wk.nothingText }}</p></div>'),
    ("week-one-line", '<div style="font:400 16px/1.55 var(--serif);color:var(--mute);margin-top:6px">{{ wk.parent }}</div>', "replace",
     '<div data-bridge="week-one-line" style="font:400 16px/1.55 var(--serif);color:var(--mute);margin-top:6px">{{ wk.weekLine }}</div>'
     '<sc-if value="{{ wk.habit }}"><div style="font:400 16px/1.45 var(--sans);color:var(--mute);margin-top:2px">{{ wk.habit }}</div></sc-if>'),
    ("week-why-move", '<sc-if value="{{ wk.whyOpen }}"><p style="font:italic 400 16px/1.5 var(--serif);margin:0;padding:10px 12px;background:var(--well);border-radius:10px">{{ wk.failure }}', "replace",
     '<sc-if value="{{ wk.whyOpen }}"><p data-bridge="week-why-move" style="font:italic 400 16px/1.5 var(--serif);margin:0;padding:10px 12px;background:var(--well);border-radius:10px">{{ wk.failure }}'),
    # the coach's question on a Review row (inside Details): asked in place, answered with the week's one answer first (the
    # line's own story ready now and its one check, CLN.nextFor), then the Library's answer inside the week, each saying how
    # it reaches the member, a story from another week opening in the library only; and the whole answer in the library
    ("review-ask", '<div style="min-width:0">\n                        <sc-if value="{{ r.has }}">', "replace", '<div style="min-width:0">\n<sc-if value="{{ r.q }}"><div data-bridge="review-ask" style="margin:0 0 16px;padding:12px 14px;border:1px solid var(--hair);border-radius:12px;background:var(--well)"><label style="display:block;font:500 13px var(--sans);color:var(--mute);margin:0 0 6px">{{ r.q.label }}</label><div style="display:flex;gap:8px"><input value="{{ r.q.text }}" sc-camel-on-change="{{ r.q.set }}" sc-camel-on-key-down="{{ r.q.key }}" placeholder="{{ r.q.ph }}" aria-label="{{ r.q.label }}" style="flex:1;min-width:0;min-height:40px;padding:0 12px;border:1px solid var(--hair);border-radius:10px;background:var(--paper);color:var(--ink);font:400 16px var(--sans)"><button sc-camel-on-click="{{ r.q.go }}" style="min-height:40px;padding:0 16px;border-radius:20px;border:0;background:var(--ink);color:var(--paper);font:500 13px var(--sans);cursor:pointer">Ask</button></div><sc-if value="{{ r.q.res }}"><div style="display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;font:400 13px/1.5 var(--sans);color:var(--mute);margin-top:10px"><span>{{ r.q.res.reading }}</span><button sc-camel-on-click="{{ r.q.res.change }}" style="min-height:32px;padding:0 4px;border:0;background:transparent;color:var(--pru);font:500 13px var(--sans);cursor:pointer">Change</button></div><sc-for list="{{ r.q.res.cards }}" as="k"><div style="margin-top:10px;padding:12px 14px;border:1px solid var(--hair);border-radius:12px;background:var(--paper)"><div style="font:500 13px var(--sans);color:var(--mute)">{{ k.label }}</div><div style="font:400 16px/1.35 var(--serif);color:var(--ink);margin-top:4px">{{ k.title }}</div><sc-if value="{{ k.why }}"><div style="font:400 13px/1.5 var(--sans);color:var(--mute);margin-top:4px">{{ k.why }}</div></sc-if><sc-if value="{{ k.route }}"><div style="font:400 13px/1.5 var(--sans);color:var(--ink);margin-top:4px">{{ k.route }}</div></sc-if><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"><sc-if value="{{ k.swap }}"><button sc-camel-on-click="{{ k.swap }}" style="min-height:36px;padding:0 14px;border-radius:18px;border:0;background:var(--ink);color:var(--paper);font:500 13px var(--sans);cursor:pointer">{{ k.sendLabel }}</button></sc-if><button sc-camel-on-click="{{ k.open }}" style="min-height:36px;padding:0 14px;border-radius:18px;border:1px solid var(--hair);background:transparent;color:var(--ink);font:500 13px var(--sans);cursor:pointer">Open in the library</button></div></div></sc-for><button sc-camel-on-click="{{ r.q.res.all.go }}" style="margin-top:10px;min-height:36px;padding:0 14px;border-radius:18px;border:1px solid var(--pru);background:transparent;color:var(--pru);font:500 13px var(--sans);cursor:pointer">{{ r.q.res.all.label }}</button></sc-if></div></sc-if>\n                        <sc-if value="{{ r.has }}">'),
    # a member's answer echoes the words they chose ("About: you're still doing your old job as well as this one")
    ("ask-about", '<div style="font:500 11px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--faint);margin-top:10px">About · {{ ak.chipLabel }}</div>', "replace",
     '<div data-bridge="ask-about" style="font:500 13px/1.45 var(--sans);color:var(--mute);margin-top:10px">{{ ak.about }}</div>'),
    # Messages: the console coach's own members, with All members for the rest, whose threads read only (no reply, no
    # story to send); the switch heads the list, and a read-only thread says whose member it is where Send a story stood
    ("msg-scope", '<div style="border-right:1px solid var(--hair);padding:10px">', "after",
     '<sc-if value="{{ msg.scope }}"><div data-bridge="msg-scope" style="display:flex;align-items:center;gap:8px;padding:4px 10px 10px"><span style="flex:1;font:500 12px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--faint)">{{ msg.scope.head }}</span>'
     '<button sc-camel-on-click="{{ msg.scope.go }}" aria-pressed="{{ msg.scope.on }}" style="display:flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:16px;border:1px solid {{ msg.scope.bd }};background:transparent;color:var(--mute);font:500 13px var(--sans);cursor:pointer"><i class="{{ msg.scope.icon }}" style="font-size:18px"></i>All members</button></div></sc-if>'),
    ("msg-head", '<button sc-camel-on-click="{{ msg.toggleDrawer }}" style="height:32px;padding:0 12px;border-radius:16px;border:1px solid var(--ink);background:transparent;color:var(--ink);font:500 12px var(--sans);cursor:pointer">Send a story</button>', "replace",
     '<sc-if value="{{ msg.canWrite }}"><button data-bridge="msg-head" sc-camel-on-click="{{ msg.toggleDrawer }}" style="height:32px;padding:0 12px;border-radius:16px;border:1px solid var(--ink);background:transparent;color:var(--ink);font:500 12px var(--sans);cursor:pointer">Send a story</button></sc-if>'
     '<sc-if value="{{ msg.readOnly }}"><span style="font:400 14px var(--sans);color:var(--mute)">{{ msg.readOnly }}</span></sc-if>'),
    ("msg-compose", '<div style="flex:none;display:flex;gap:8px;padding:12px 22px;border-top:1px solid var(--hair)">', "replace",
     '<div data-bridge="msg-compose" style="flex:none;display:{{ msg.composeDisp }};gap:8px;padding:12px 22px;border-top:1px solid var(--hair)">'),
    # round six, the member's first week and story: the line is developed with the member's own coach; the bracket said by
    # its counts; the coach's preview of the Monday card as the card now reads; the first week's guarantee above Publish
    ("week-coach", 'Developed with Jennifer</div>', "replace", '<span data-bridge="week-coach">Developed with {{ coach.first }}</span></div>'),
    ("m2-bracket", "We narrow everyone with a story worth telling to 128 for you: leaders admired across the years, people from your years, and people from what you love.", "replace",
     '<span data-bridge="m2-bracket">{{ m2Bracket }}</span>'),
    ("mv-preview-line", '<div style="font:400 14px/1.5 var(--serif);color:var(--mute);margin-top:4px">{{ mv.behaviour }}</div>', "replace",
     '<div data-bridge="mv-preview-line" style="font:400 14px/1.5 var(--serif);color:var(--mute);margin-top:4px">{{ mv.prevLine }}</div>'),
    ("mv-gap", '<button sc-camel-on-click="{{ mv.publish }}"', "before",
     '<sc-if value="{{ mv.gap }}"><div data-bridge="mv-gap" style="padding:14px 16px 6px;border:1px solid var(--mad);border-radius:12px">'
     '<div style="font:500 12px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--mad)">The first week</div>'
     '<p style="font:400 16px/1.5 var(--sans);color:var(--ink);margin:6px 0 4px">{{ mv.gap.line }}</p>'
     '<sc-for list="{{ mv.gap.rows }}" as="g"><div style="padding:10px 0;border-top:1px solid var(--hair)"><div style="display:flex;align-items:center;gap:10px">'
     '<div style="flex:1;min-width:0"><div style="font:400 16px/1.35 var(--serif);color:var(--ink)">{{ g.title }}</div><div style="font:400 14px/1.45 var(--sans);color:var(--mute);margin-top:2px">{{ g.why }}</div></div>'
     '<button sc-camel-on-click="{{ g.go }}" style="flex:none;height:34px;padding:0 14px;border-radius:17px;border:1px solid var(--ink);background:transparent;color:var(--ink);font:500 13px var(--sans);cursor:pointer">{{ g.label }}</button></div>'
     + CARD_FIRST + '</div></sc-for></div></sc-if>\n                    '),
    # a member's story says why it is theirs, under its title: the coach's choice for the week's room, and an age beside theirs
    ("story-for", '<p style="font:400 18px/1.55 var(--serif);margin:18px 0 0;text-wrap:pretty">{{ sv.moment }}</p>', "before",
     '<sc-if value="{{ sv.forYou }}"><p data-bridge="story-for" style="font:400 16px/1.5 var(--serif);color:var(--ink);margin:10px 0 0">{{ sv.forYou }}</p></sc-if>'
     '<sc-if value="{{ sv.ageLine }}"><p data-bridge="story-age" style="font:400 16px/1.5 var(--serif);color:var(--ink);margin:6px 0 0">{{ sv.ageLine }}</p></sc-if>'),
]

# Sizes as the export writes them inside inline `font:` shorthands, and what they become.
TYPE_FLOOR = {"9": "13", "10": "12", "11": "12"}
FONT_RE = re.compile(r'(font:\s*(?:italic\s+)?\d{3}\s+)(9|10|11)(px)')

def type_floor(html):
    mark = '<meta data-bridge="type-floor" name="cl-type-floor" content="12">'
    if mark in html: return html, False
    head_end = html.index("</head>")
    start = html.index("<x-dc>")
    body = FONT_RE.sub(lambda m: m.group(1) + TYPE_FLOOR[m.group(2)] + m.group(3), html[start:])
    return html[:head_end] + mark + "\n" + html[head_end:start] + body, True

# The export's own words with a straight apostrophe inside a word ("you're", "didn't") set curly, as every screen sets
# them: in text between tags only, never in an attribute, a {{ }} binding, a script or a style. Idempotent.
APOS_RE = re.compile(r"([A-Za-z])'([a-z])")
BIND_RE = re.compile(r"(\{\{.*?\}\})")

def apostrophes(html):
    start = html.index("<x-dc>")
    parts, out, n, skip = re.split(r"(<[^>]*>)", html[start:]), [], 0, None
    for x in parts:
        if x.startswith("<"):
            t = re.match(r"</?\s*([a-zA-Z-]+)", x)
            tag = t.group(1).lower() if t else ""
            if skip is None and tag in ("script", "style") and not x.startswith("</"): skip = tag
            elif skip == tag and x.startswith("</"): skip = None
            out.append(x); continue
        if skip or "'" not in x: out.append(x); continue
        y = "".join(seg if BIND_RE.fullmatch(seg) else APOS_RE.sub(lambda m: m.group(1) + "\u2019" + m.group(2), seg) for seg in BIND_RE.split(x))
        n += y != x; out.append(y)
    return html[:start] + "".join(out), n > 0

# Patches to the export's engine (js/constellation-proto-engine.js), for behaviour the template cannot change.
# Each block carries a /*bridge:<name>*/ mark, so a second pass skips it; a missing anchor refuses, as above.
ENGINE_PATCHES = [
    # The send guard: a coach's pin or swap wins over a pairing, and nothing unchecked goes out, whatever
    # chose it. A paired or chosen recall draft is held until a coach has checked it.
    ("send-guard-week",
     "    var pd = function (day, note) { return { story: paired.story, source: paired.src === 'coach' ? 'coach' : 'paired', origin: paired.src, closeTo: paired.closeTo, note: note, day: day }; };\n",
     "after",
     "    /*bridge:send-guard-week*/ var checked = function (x) { var s = x && x.story && d.story[x.story]; if (!s) return x; if (x.day === 19 && window.CLB && window.CLB.hadLife && window.CLB.hadLife(P, s.id)) return { held: true, why: 'recent', waiting: x.story, day: x.day }; return !s.verified ? { held: true, why: 'check', waiting: x.story, day: x.day } : x; };\n"),
    ("send-guard-w12", "      if (paired) return pd(12, m.note12 || '');", "replace",
     "      if (paired) return checked(pd(12, m.note12 || ''));   /*bridge:send-guard-w12*/"),
    ("send-guard-w19",
     "    if (r.action === 'pin') return { story: r.story, source: 'pinned', note: r.note, day: 19 };\n"
     "    if (paired) return pd(19, r.note);\n"
     "    if (r.action === 'swap') return { story: r.story, source: 'coach', note: r.note, day: 19 };\n"
     "    if (r.action === 'approve') return { story: sel.pick && sel.pick.id, source: 'coach', note: r.note, day: 19 };\n"
     "    if (st.hold[P]) return { held: true };\n"
     "    return { story: sel.pick && sel.pick.id, source: 'system', note: r.note, day: 19 };",
     "replace",
     "    /*bridge:send-guard-w19*/\n"
     "    if (r.action === 'pin') return checked({ story: r.story, source: 'pinned', note: r.note, day: 19 });\n"
     "    if (r.action === 'swap') return checked({ story: r.story, source: 'coach', note: r.note, day: 19 });\n"
     "    if (paired) return checked(pd(19, r.note));\n"
     "    if (r.action === 'approve') return checked({ story: sel.pick && sel.pick.id, source: 'coach', note: r.note, day: 19 });\n"
     "    if (st.hold[P]) return { held: true };\n"
     "    return checked({ story: sel.pick && sel.pick.id, source: 'system', note: r.note, day: 19 });"),
    ("send-guard-rows",
     "      var chosen = r.action === 'pin' ? r.story : pr ? pr.story : r.action === 'swap' ? r.story : (sel.pick && sel.pick.id);",
     "replace",
     "      var chosen = r.action === 'pin' ? r.story : r.action === 'swap' ? r.story : pr ? pr.story : (sel.pick && sel.pick.id);   /*bridge:send-guard-rows*/"),
    ("send-guard-notice",
     "      var n = rows.filter(function (r) { return r.chosen; }).length, w = rows.filter(function (r) { return !r.r.action; }).length;\n"
     "      p.cnotif = { text: n + ' stories go out at 18:00. ' + w + ' are waiting for you.', go: 'C3' };",
     "replace",
     "      /*bridge:send-guard-notice*/ var ok = function (r) { return r.chosen && d.story[r.chosen] && d.story[r.chosen].verified; };\n"
     "      var n = rows.filter(ok).length, hd = rows.filter(function (r) { return r.chosen && !ok(r); }), w = rows.filter(function (r) { return !r.r.action; }).length;\n"
     "      p.cnotif = { text: n + (n === 1 ? ' story goes' : ' stories go') + ' out at 18:00.' + (hd.length ? ' ' + hd.map(function (r) { return r.m.first + '\\u2019s'; }).join(' and ') + (hd.length === 1 ? ' waits' : ' wait') + ' for one check.' : '') + (w ? ' ' + w + ' ' + (w === 1 ? 'is' : 'are') + ' waiting for you.' : ''), go: 'C3' };"),
    # the rule's own pick for a week is a story the record held checked: a story a coach checks goes where that coach sends
    # it (a check on one line fills that line, and a check for a later week sends nothing this week); the Swap panel still
    # lists it among the eligible
    ("rule-own", "    var p = pool[0], trace = [];", "replace",
     "    var p = (mode === 'week' ? pool.filter(function (o) { return !o.s.checked; }) : pool)[0], trace = [];   /*bridge:rule-own*/"),
    ("held-text", "hasStory: !!sObj, held: !sObj,", "replace",
     "hasStory: !!sObj, held: !sObj, /*bridge:held-text*/ nothing: false, heldText: !del || !del.held ? 'Your story comes once ' + CO.first + ' has checked one.' : del.why === 'check' ? 'Your story comes once ' + CO.first + ' has checked it.' : del.why === 'recent' ? 'Your story comes once ' + CO.first + ' has chosen one.' : 'No story this week. ' + CO.first + ' chose to wait.',"),
    # one name for each thing in the story the engine formats: Checked or Recall draft; the card's teaser past a
    # dateline and cut on a word (CLC.teaser); the coach's source with the working note said as what to do
    ("fs-words", "verLabel: s.verified ? 'Verified' : 'Draft \u2014 must verify',", "replace",
     "verLabel: s.verified ? 'Checked' : 'Recall draft', /*bridge:fs-words*/"),
    ("fs-place", "eyebrow: h.name + ' · ' + s.place,", "replace", "eyebrow: h.name + (s.place ? ' · ' + s.place : ''), /*bridge:fs-place*/"),
    ("fs-first", "first: s.moment.split(/\\.\\s/)[0] + '.',", "replace",
     "first: window.CLC && window.CLC.teaser ? window.CLC.teaser(s) : s.moment.split(/\\.\\s/)[0] + '.', /*bridge:fs-first*/"),
    ("fs-source", "source: 'Source: ' + s.source,", "replace",
     "source: 'Source: ' + (window.CLC && window.CLC.sourceFor ? window.CLC.sourceFor(s, 'coach') : s.source), /*bridge:fs-source*/"),
    # one check-in time per member: the export keeps one slot, so a move records whose booking it is, and a fresh start
    # clears it (the bridge's meetOf gives everyone else the time on their record)
    ("slot-for", "S({ slot: sl, bookOpen: false });", "replace", "S({ slot: sl, slotFor: mid, bookOpen: false }); /*bridge:slot-for*/"),
    ("slot-for-init", "bookOpen: false, slot: 'Tue 20 Oct, 10:00',", "replace", "bookOpen: false, slot: 'Tue 20 Oct, 10:00', slotFor: null, /*bridge:slot-for-init*/"),
    # the hour before the room: what the week holds, with no pronoun read from a name, and a story only when one came
    ("notif-hour", "p.notif = { text: 'In an hour. Your move, your line, his story.', go: 'prep' };", "replace",
     "var w12h = weekDelivery(Object.assign({}, st, p), P, 12); p.notif = { text: 'In an hour: your move' + (w12h && w12h.story ? ', your line and ' + d.hero[d.story[w12h.story].hero].name + '\\u2019s story.' : ' and your line.'), go: 'prep' }; /*bridge:notif-hour*/"),
    # a coach's written fit keeps its stance and its reading of the hero, and says what the library holds from the stories
    # the hero has (CLN.fitLine) where it said what they are "useful for"
    ("fit-canned", "    if (canned) { state = canned[0]; line = canned[1]; }", "replace",
     "    if (canned) { state = canned[0]; line = canned[1]; if (/\\buseful for\\b/i.test(line) && window.CLN && window.CLN.fitLine && window.CLB && window.CLB.lib) line = line.replace(/\\s*Useful for[^.]*\\./, '') + ' ' + window.CLN.fitLine(window.CLB.lib, P, hid, { coach: (d.coaches[m.coach] || {}).first }); }   /*bridge:fit-canned*/"),
    # the fit check's line from the stories the hero has (CLN.fitLine), where the export said "Useful for some of yours, not all"
    ("fit-line",
     "    else if (L.n > 0) { state = 'partly'; line = h.short + \"'s stories are mostly about other kinds of weeks. Useful for some of yours, not all.\"; }\n"
     "    else { state = 'partly'; line = \"We don't have stories from \" + h.short + ' yet. Your coach will find some, or someone close.'; }",
     "replace",
     "    else { state = 'partly'; line = window.CLN && window.CLN.fitLine && window.CLB && window.CLB.lib ? window.CLN.fitLine(window.CLB.lib, P, hid, { coach: (d.coaches[m.coach] || {}).first }) : h.short + (L.n ? \"'s stories are mostly about other kinds of weeks.\" : ' has no stories yet.'); }   /*bridge:fit-line*/"),
    # a member's formative years in full on Members ("1995–2010"): two digits read as a month beside a year
    ("born-window", "short: w0 + '\u2013' + String(w1).slice(2),", "replace", "short: w0 + '\u2013' + w1,   /*bridge:born-window*/"),
    # a row with no story asks for more stories of its situation, in the console's own words
    ("corpus-label", "corpusLabel: st.corpus ? 'On the corpus request list' : 'Add to corpus request list',", "replace",
     "corpusLabel: st.corpus ? 'More stories asked for' : 'Ask for more stories of this situation',   /*bridge:corpus-label*/"),
    # the heroes a coach can suggest: each life's checked stories counted in one pass over the stories, where the export
    # read every story for each of the 500 lives on every render, the member's as well as the coach's (about 30 ms at 4x)
    ("suggest-count",
     "      suggestList: d.heroes.filter(function (h) { return st.core.indexOf(h.id) < 0 && h.id !== st.reserve && d.stories.some(function (s) { return s.hero === h.id && s.verified; }); }).map(function (h) {\n"
     "        var n = d.stories.filter(function (s) { return s.hero === h.id && s.verified; }).length;\n"
     "        return { name: h.name, meta: n + ' verified ' + (n === 1 ? 'story' : 'stories'), go: function () {\n",
     "replace",
     "      suggestList: (function (vc) { d.stories.forEach(function (s) { if (s.verified) vc[s.hero] = (vc[s.hero] || 0) + 1; }); return d.heroes.filter(function (h) { return st.core.indexOf(h.id) < 0 && h.id !== st.reserve && vc[h.id]; }).map(function (h) {   /*bridge:suggest-count*/\n"
     "        var n = vc[h.id];\n"
     "        return { name: h.name, meta: n + ' checked ' + (n === 1 ? 'story' : 'stories'), go: function () {\n"),
    ("suggest-count-end",
     "          S({ msgs: mm, suggestOpen: false }); toast(c, 'Suggested ' + h.name + ' to ' + sarah.first + '.', 'coach'); } };\n      })\n    };",
     "replace",
     "          S({ msgs: mm, suggestOpen: false }); toast(c, 'Suggested ' + h.name + ' to ' + sarah.first + '.', 'coach'); } };\n      }); })({})   /*bridge:suggest-count-end*/\n    };"),
]

ENGINE_DQ = re.compile(r'"(?:[^"\\\n]|\\.)*"')

def apply_engine(js):
    done = []
    for name, anchor, where, block in ENGINE_PATCHES:
        if f"/*bridge:{name}*/" in js: continue
        n = js.count(anchor)
        if n != 1: raise SystemExit(f"engine patch {name}: its anchor appears {n} times in the export; update tools/patches.py")
        js = js.replace(anchor, block + anchor if where == "before" else anchor + block if where == "after" else block)
        done.append(name)
    # the engine's own words, as the template's: a straight apostrophe inside a word in a string is set curly
    esc = lambda m: m.group(1) + "\\u2019" + m.group(2)
    curled = re.sub(r"([A-Za-z])\\'([a-z])", esc, ENGINE_DQ.sub(lambda m: APOS_RE.sub(esc, m.group(0)), js))
    if curled != js: js = curled; done.append("apostrophes")
    return js, done

def apply(html):
    done = []
    for name, anchor, where, block in PATCHES:
        if f'data-bridge="{name}"' in html: continue
        if where == "replace" and block in html and anchor not in html: continue
        # anchors are written as the export writes them; a page already held to the type floor is matched floored
        if html.count(anchor) == 0 and 'data-bridge="type-floor"' in html: anchor = FONT_RE.sub(lambda m: m.group(1) + TYPE_FLOOR[m.group(2)] + m.group(3), anchor)
        n = html.count(anchor)
        if n != 1: raise SystemExit(f"patch {name}: its anchor appears {n} times in the export; update tools/patches.py")
        html = html.replace(anchor, block + anchor if where == "before" else anchor + block if where == "after" else block)
        done.append(name)
    html, floored = type_floor(html)  # last, so the inserted blocks are held to the same floor
    if floored: done.append("type-floor")
    html, curled = apostrophes(html)
    if curled: done.append("apostrophes")
    return html, done

if __name__ == "__main__":
    root = pathlib.Path(__file__).resolve().parent.parent
    p = root / "index.html"
    html, done = apply(p.read_text(encoding="utf-8"))
    p.write_text(html, encoding="utf-8")
    e = root / "js" / "constellation-proto-engine.js"
    js, edone = apply_engine(e.read_text(encoding="utf-8"))
    e.write_text(js, encoding="utf-8")
    print("patched: " + (", ".join(done + edone) if done or edone else "nothing new"))
