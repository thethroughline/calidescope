# Constellation · how it works

Three things live here, on one deployment:

| URL | What it is |
|---|---|
| `/constellation` | The prototype: the member app and the coach console, with the demo clock along the top |
| `/constellation/library` | The Library: every story and every life in the corpus, to read and to wander |
| `/api/constellation` | The back end: members, coaches, the corpus, the matcher, and the record of source checks |

All three are `noindex`. The data is sample data: members and companies are fictional, heroes are real people.

## The prototype, as exported

The prototype is a Claude Design export, unbundled by `tools/unbundle.py`. Its files stay as exported:

- `index.html` is a template (`<x-dc>`) that `js/support.js` (the design runtime) compiles to React. `{{ }}` binds a value, `sc-if` shows a block, `sc-for` repeats one.
- `js/constellation-proto-data.js` sets `window.CPD`: 107 heroes with 13 sample stories, the six members and three coaches, the messages, and the demo clock.
- `js/constellation-proto-engine.js` sets `window.CPE`. `init()` builds the demo state; `vals()` turns that state into every value the template binds; `mount()` wires resize, keys and the persona.

The engine runs the programme's rules:

- **The bracket.** 16 contenders: 8 leaders (cross-generational first, then nearest the member's formative years, born + 10 to born + 25) and 8 from interests (8, 4 + 4 or 3 + 3 + 2). Pairings keep finalists apart. The member keeps three; the fourth is the reserve.
- **The fit check.** Each of the three lines up, partly fits, or pulls the other way. A coach can keep, scope or swap a hero that pulls.
- **The selection rule.** A story must carry the week's situation and be verified. Then it comes from the member's three before their extended heroes before the library. Far stories go to Ask answers only. No hero twice in 14 days, nothing the member declined, and a tie breaks on id.
- **Precedence.** Pinned beats paired in Moves, which beats approved or swapped in Review, which beats the rule. Review auto-sends at 18:00 on Sunday unless a member is on Hold.
- **The move.** It passes at least five of the six tests, and the behaviour runs to 18 words or fewer.

The demo clock steps through days 6 to 21: the bracket, final four and fit check, the coach's roster, publishing Move 1, the Monday card, the run sheet, the debrief, an Ask, the review queue and check-in prep.

## How the corpus reaches it

```
constellation-corpus (data/)                    calidescope (constellation/)
  scripts/export_app.py  ───────────────▶  data/corpus.json      437 lives, 525 stories, 22 situations,
                                                                 66 moves, 66 lines, calibration, outcomes
  js/constellation-proto-data.js ─ tools/build_demo.mjs ─▶ data/demo.json
                                                                 members, coaches, messages, heroes, works,
                                                                 the 13 samples, the id map, the twins,
                                                                 labels for all 22 situations
                     lib/core.js  merge(corpus, demo)  ─▶  one index: 531 stories from 476 lives
```

- **What the export leaves behind.** Survey popularity numbers and flags stay out, and so do law references and titles; both need a licence before they reach a product. Quote texts and candidates stay out too. The export refuses to write if any of them slips through.
- **The id map.** 68 of the prototype's 107 heroes are on the roster (`obama` is `barack-obama`). The other 39 join the Library under a slug of their name, with no story yet.
- **Twins.** Seven samples tell the same moment as a corpus record, such as the Law Review election. Each sample keeps its id, because the demo script points at it, and takes the corpus record's keys and examples. The corpus copy is not listed twice, and its id resolves to the sample everywhere.
- **Situations.** The prototype listed 11 situations with a label and a line. All 22 now have one: five lines and six labels are new, written to match. A1 takes the corpus key, `unnamed-expectations`.
- **The bridge** (`js/constellation-bridge.js`) runs from the page head. It holds the engine back until the corpus, the demo world (from `/api/constellation/demo`, else `data/demo.json`) and the ledger of source checks have loaded, then merges them into `window.CPD`. The runtime renders twice, so it feeds and wraps again on every assignment. The engine's rules are untouched. Corpus stories arrive as recall drafts, so the rule still sends verified stories only, and the scripted demo plays out as designed. A coach's source check in the Library lifts a draft at once.
- **The template patches** (`tools/patches.py`, 26 of them, each listed at the top of the file) add the Library card on Heroes, the Library buttons on a hero page and a story, the Library overlay, the coach's Explore tab, related reading under a story and a hero, "How it reaches your three", "Who stands near your three", "Find a story for this" under a member's Ask, and the demo bar at every width. `unbundle.py` re-applies them to every new export and refuses if an anchor has moved. Anchors are written as the export writes them, so they match a fresh export and the floored page alike, and a fresh export reproduces today's `index.html`.
- **Three engines, one index.** `lib/core.js` (the merge, the matcher, likeness), `lib/ask.js` (a question read into a query and answered, the shelf of coach questions, compare, gaps) and `lib/net.js` (kindred ties with their reasons, routes between two lives, how a story reaches a member's three, where the three stand). All are pure and run in the browser, the app and the API alike.

## The back end · `/api/constellation`

One function, `api/constellation.js`. `vercel.json` rewrites `/api/constellation/<path>` to it.

| Route | Answers with |
|---|---|
| `GET /` | counts and the route list |
| `GET /members`, `/members/:id` | the six members, with situations, heroes and coach |
| `GET /members/:id/reading` | a coach's prep reading: stories for their situations, from their heroes first |
| `GET /members/:id/season?weeks=8` | their weeks as the corpus matcher would serve them |
| `GET /coaches`, `/coaches/:id` | Jim, Bret and Jennifer, and who each coaches |
| `GET /demo` | the demo world the prototype boots from |
| `GET /icons`, `/icons/:id` | lives, with filters (`field`, `domain`, `stance`, `sit`, `era`, `q`), stories, works and trails |
| `GET /stories`, `/stories/:id` | stories, with filters (`sit`, `icon`, `reach`, `status`, `era`) and trails |
| `GET /situations`, `/situations/:id` | the 22 situations, with moves, lines, calibration and outcome |
| `GET /eras`, `/eras/:id`, `/search?q=` | eras and search |
| `GET /stories/:id/similar` | the same kind of week, and the same world, each with its reason |
| `GET /icons/:id/kindred`, `/icons/:id/ego` | kin (a shared situation and one more reason, said in words), and the neighbourhood to draw |
| `GET /situations/web` | the situations, joined where the same lives lived both |
| `GET /path?from=&to=` | up to three ways from one life to another, every step with its reasons |
| `GET /ask?t=&m=` | a question read into a query (chips, other readings, words not used) and answered with reasons; or pass the query itself: `sit`, `sex`, `field`, `before`, `after`, `age`, `dir`, `reach`, `ok`, `m` |
| `GET /members/:id/shelf` | the questions coaches bring, for this member, each counted |
| `GET /members/:id/near` | where the member's three stand among the member's situations, the lives in more than one, stand-ins |
| `GET /state?ns=` | the shared ledger of source checks, and this browser's own record |
| `POST /state/ledger` | `{ story, by, note }`: a coach has read a story against its source |
| `DELETE /state/ledger?story=` | take a check back |
| `PUT /state/user?ns=` | `{ saved, trails }`: this browser's own record |

The matcher in `lib/core.js` is a line-for-line port of the corpus repo's `scripts/match.py`. The test suite replays all 15 member files for 40 weeks through both and compares every pick: 600 member-weeks, identical.

**Storage.** With a Redis store connected, the ledger and saved trails persist and are shared between coaches. Add the Upstash Redis integration to the Vercel project: it sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`, and the code reads them, or `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Without a store, records sit in the function's memory, which Vercel recycles. Each browser then keeps its own copy, so the demo works with or without one.

**Writes are open.** Anyone with the URL can mark a story checked. That suits a demo. Put sign-in in front before working coaches rely on it.

## The Library · `/constellation/library`

- **The constellation.** Each star is a life, placed by field and by the year of its defining moment; larger stars hold more stories. Pick one of the 22 situations and its lives light up and join in time order. Hover a star and threads run to its closest kin, across fields and centuries; a thread that would leave the top of the map bows downward. Tap a star once on a phone, or reach it by keyboard (the map is one tab stop: left and right move through a field in time, up and down change field, Enter opens), and the twelve nearest lives are listed under the map, each with its year and the situation they share. On a phone the map opens on the last century, its field names held still at the left edge as it scrolls, and a tap on a field's band names the lives of that field in view.
- **Pages.** A life (stories, defining moments, works, kindred across time); a story (source, caution, status; others who lived this week, each with the reason that sets it apart; every story of the week plotted by year and field; the other way, a life that met the same week by the opposite means); a situation (a path in five stories, from the plainest case to the furthest, and every story of the week); an era, a field, a stance, people, search.
- **Ask.** A question in plain words ("She is announcing the reorg on Thursday, and the person who wanted her job will be in the room") is read into chips: the situations, a woman or a man, a field, an era, an age, a quieter register, the member it is for. Every chip can be taken away, the situation can be changed, other readings are offered and words that were not used are named. A question can anchor on a life: "a quieter story than Obama" keeps Obama's situations and finds who met them less directly than Obama did, each card saying so ("Measured, where Obama was direct"); a story met head on links to the same week, a quieter way. It also reads who the line will be said to ("the colleague who wanted the job", "a client or their counsel") and the room ("a team meeting", "a pitch"); both rank and never filter, and each card then shows the line and the move set in that room. A member named keeps the answer inside their own situations, a scene asked for on its own ("who got fired") is the question, and words that name no situation are said so, with the closest three. For a coach the answer leads with two cards: a checked story ready to send, leaving out what the member already has, and the draft one check from sending, with its source. On a phone the reading folds to one line. The answer counts its stories and lives, offers ways to narrow with their counts, gives each card the reasons that set it apart, and when fewer than four stories fit, says what to drop. The query is the address, so an answer is a link.
- **The shelf** (coach). The questions coaches bring, grouped (what is happening, who my member is, who will land with them, how it should land), each with its live count, the member's own week first. **Where the answers are thin** lists the questions with fewer than four stories and a grid of the situations against what coaches ask for. **Compare** sets two stories side by side: what they share, then only the rows where they differ.
- **Families of moves** (a situation page): the situation's stories joined where their moves meet (tf-idf over each story's moves and lines, a tie needing two shared words and mutual nearness), each family a card headed by its hub's move in the corpus's words, rows by year with arcs in the gutter and "Joined to …: both moves use …"; the stories that make a move of their own fold below. E1 has nine families holding 25 of its 41 stories. A story page adds "The same move in another week" when another life made the same move in another situation, judged on the moves alone (112 stories have one; David Ogilvy's D3 story finds Steve Jobs's E3). The life map waits behind "See the lives on the map", and the 3x3 grid is the coach's.
- **Networks.** Kindred across time on each life: a list with every tie said in words, and, when a tie crosses more than fifty years, a band for each situation the life shares with its kin, years across. **Situations that travel together**: the 22 as rows in words, each saying how many lives hold it and the two situations it travels with most ("A1 · Nobody told you what the job asks · 30 lives · most often with C3 (4) and E1 (3)"); a row opens on who lived both. **Connect two lives**: the strongest way and up to two others, each step a shared situation and one more reason. **Who stands near your three**: the member's situations as overlapping circles, their three where they stand, the lives in more than one, and for each hero the nearest life where they have no story. **At your age**: every story in the member's situations placed by the age its person was then, beside the member's own age, the nearest named.
- **Trails.** Every page offers ways on: the same situation in another century, contemporaries, the same field, the same way of leading. Every page opened joins the trail along the top, and a trail can be kept and walked again.
- **Modes.**
  - Reader: the default when standalone.
  - Member: inside the app, starting from the member's three.
  - Coach: everything, plus moves, lines, calibration, prep for each member, the season ahead, and source checks.
- **Inside the app, both ways (member).**
  - A story ends with three: the next story, when the member wants it (checked first, then the life nearest their three), then two others who lived the same week, the nearest the three first, each with its own reason ("One step from Obama: both had every act read as a signal"), and one way into the library: "All of this week, in the library". Each opens in place, with Back walking the stack. A story from beyond the three says how it reaches them ("Elena Kagan is one step from Obama, one of your three"), each person at the year of their own story in the situation they share. A hero page lists all their stories and kindred lives, each tie said in words.
  - The reader keeps their place: a story opened from another starts at its top, Back returns each page to where it was left, and Back from "Ask Jim about this" in the Library returns to the Library page it came from. A held week offers a way in while it waits ("While you wait: Alexander Hamilton, in a recall draft. Bret checks it before it is sent."). In the Library a member reads situations in words, with no codes.
  - A member's story is honest once: a draft carries one mark ("Recall draft · Jim checks it before it is sent") and no coach's working note, internal id or source; a checked story shows its source and one sentence of context. "Why it fits" names the week ("It fits your week: …").
  - The Library opens under one bar: Back, named for where it goes ("‹ Kagan"), the page's title ("Others who lived Kagan's week") and Browse, which opens the library's front page with its search. Back walks the pages read in the frame one at a time, to the place on each page where the reader was, then returns to the story, the hero or the tab it was opened from. Inside the app the frame adds no bars of its own. Save there says "Saved. It's on You."
  - The trail comes home. You shows "Your last trail" with its last three stops (a step back takes a stop off), and This week, below the line, offers to pick up there. This week holds the story, the move and the line; prep shows the day it opens until it does.
  - Heroes says what the library holds for each of the three: checked stories, and drafts waiting for the coach's check. "Who stands near your three" lives on Heroes; You has the last trail, "At your age" and the whole library.
  - On a recall draft, "Ask Jim to check it" puts the story in the coach's thread and a signal on the member's record. You shows "Waiting for Jim's check"; once checked, This week says so.
  - Ask lists the member's own situations in their own words, ordered by what they wrote, with "None of these" and "Send it to Jim as it is". The answer leaves out what the member already has and says so ("You already have Barack Obama's story from Chicago, December 2008 for this. Here is another."); when no checked story is left, the draft nearest their three answers, with "Ask Jim to check it" and how it reaches the three. Heroes with no story share one line. In the Library, Save saves in the app (one saved list), "Ask Jim about this" opens the thread with the story attached, and "Add to my heroes" goes to the coach.
- **Inside the app, both ways (coach).**
  - The Library tab opens on Explore, with its own Back. A check there makes a story sendable in the engine at once.
  - Nothing unchecked or repeated goes out. The send guard (an engine patch, so a fresh export keeps it) holds any chosen story that has not been checked, whatever chose it, and a coach's pin or swap wins over a pairing. The 18:00 notice counts only what will go ("2 stories go out at 18:00. Sarah's waits for one check."), a held row says "Waiting for your check · nothing goes to Sarah until then", and the member's week says "Your story comes once Jim has checked it." Each row says when it goes, in one phrase ("Goes to Sarah at 18:00 today"), and names a life the member had in the last fortnight ("Sarah had Obama on 12 Oct").
  - Review reads "Your week, Jim": one line for each member of the coach whose console is open ("All members" shows the rest), those waiting for a check first, then by the day of their week. Each line holds when they meet ("You meet Tue 10:00", with Prep), their week ("Thu 22 Oct · Reorg announcement · E1 · Everything you do gets read as a signal"), what goes ("Goes to Priya at 18:00 today · Barack Obama · Chicago, December 2008"), the life they had last fortnight, an open Ask, and one action: Swap in, Check, Approve, Answer or Prep. When a checked story already carries the week the line says "Ready now · Billie Jean King, Houston, September 1973", with "Or one check · Jimmy Carter" under it, and Swap in sends it with no check. Details folds the line open onto the full row, with the coach's question about the member's week at the top ("What is Sarah facing?"), answered in place: the story ready now and the one a check from sending, each saying how it reaches the member, and the whole answer in the Library. The 18:00 notice, Members, Review and the badge give one count ("Two stories go out at 18:00. Sarah's and David's wait for your check."). Below the lines, "For the weeks ahead" lists the checks after this week's that give every member four checked stories to choose from (CLN.checkPlan; Golda Meir first, which gives David and Priya a story and is one of Priya's three), each checked in place; a check for a later week is marked checked and sent nowhere. The bulk approve counts only what can go ("Approve the two ready"). Check-ins opens prep for each of the coach's members: the console's member in the console, the others as the Library's reading for them. A move's tests tick from its fields.
  - Review stays honest: a row showing a recall draft cannot be approved (nor by the bulk approve), and a row with no story, or a draft, names the one draft whose check fills the slot, never a story the member has or a life they had last week. The check happens on a card in the row: the scene, the quotation and the source, one required note, "Checked by" fixed to the coach whose console is open, and "Checked. Send to Michael at 18:00", which puts the story in the slot. The Swap panel lists the drafts nearest the member, each with the same card, and says when choosing another story unpairs the row. A member's asks show on Members, on Review and first on Source checks ("Members asked").
  - Find and send opens on the member's week, far stories set aside behind one chip, with the member's question above the filters (it opens the Library's answer). For the member chosen, it lists the stories nearest their three first, marking only the three, says how the chosen story reaches them ("For Sarah: one link from Obama. Both had every act read as a signal."), gives related stories with the reason each differs, and compares the story with the member's pick for the week.
  - Member prep in the Library starts from the coach's question for the week, answered in place: ready to send, one check from it, and the first three stories.
  - Under a member's Ask in Messages the answer waits in the thread: the story ready to send (nothing the member has, no life they had last week), a note, and "Send to Sarah", two taps; the Ask then reads "Answered with …". "Other stories for this" opens the Library's answer. "Send to a member" in the Library opens Find and send with the story chosen, and "Suggest to Sarah" lands in Sarah's thread. In the Library, a check is recorded in the name of the coach whose console opened it, and needs a note.
- **The demo bar** fits every width: one clock stepper below 1880px, and below 600px only the stepper and a Demo button, which opens a sheet with the view, the member, the device, the eleven moments, the theme and reset. On a phone the member app fills the screen.

## Tests

```
node --test constellation/tests/*.test.mjs     28 tests: matcher parity, the merge, every API route, the Redis protocol,
                                               likeness, coach questions read as situations, the question engine, the networks,
                                               the house voice, and round two (reasons that differ, the path in five, the other
                                               way, no working note reaches a member, the slot a check fills, links to the three), and round three
                                               (member-safe text, questions read right, the lead pair, said to, the room), and
                                               round four (no check offered for what the member has or had last week, and
                                               the check plan: nine checks, Golda Meir first, one fewer once a draft is checked), and
                                               round five (one name for each thing and no broken joins across 531 stories and six
                                               members; families of moves; the coach's twenty questions in tests/ask-panel.json)
node constellation/tests/voice.mjs             the house voice on the screens people read: every persona, both roles and the
                                               Library in three modes, with the corpus's own words set aside; it names the screen,
                                               the rule and the words
node constellation/tests/e2e.mjs               132 checks in a browser: prototype, Library, both roles, phone and desktop,
                                               light and dark, every persona at every step of the clock, in-app reading
                                               both ways, Ask, the shelf, the networks, no console errors and no
                                               request the server refuses
node constellation/tools/dev-server.mjs        the site and the API locally, routed as Vercel routes them
```

## Refreshing

- **New corpus.** In the corpus repo, run `python3 scripts/export_app.py <calidescope>/constellation/data/corpus.json --parity <calidescope>/constellation/tests/fixtures/parity.json`. Then run `node constellation/tools/build_demo.mjs` and both test commands.
- **New prototype export.** Run `python3 -I constellation/tools/unbundle.py <export.html> <phosphor-package-dir>`, which re-applies the patches. Then run `node constellation/tools/build_demo.mjs` and the tests.

## Still open

- Every corpus story is a recall draft until a coach reads it against its source. Of the 13 samples, six are verified for the demo.
- Quotations are cleared for prototype use only; each needs permission or a fair-use review before publishing.
- Stances are proposed for every life until a coach rules on them. Defining-moment years are recall-authored.
- The house voice is applied to the prototype's product copy by rewrites in `lib/core.js` (`COPY`), the members' goals among them; template lines are rewritten by patches. An Ask in the demo script still sets one thing against another; the designer may want to change it at the source. A real work keeps its real title ("Teach girls bravery, not perfection").
- The five checked samples with no corpus twin carry a directness rating, moves and lines written here (`tools/build_demo.mjs`, `RATED`), in our words as the corpus's are. A coach should read them before they are relied on. Two corpus member lines (A1, D1) lose a filler adverb at merge; the fix belongs in the corpus repo.
- In the demo script, Maya's first message says none of Maya's three has a story in the record. The corpus now holds one recall draft for Simone Biles. The script's words are the prototype's and are left as written.
