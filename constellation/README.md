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

- **The constellation.** Each star is a life, placed by field and by the year of its defining moment; larger stars hold more stories. Pick one of the 22 situations and its lives light up and join in time order. Hover a star (or tap it once on a phone) and threads run to its closest kin, across fields and centuries.
- **Pages.** A life (stories, defining moments, works, kindred across time), a story (source, caution, status, stories near it, the same situation across time), a situation, an era, a field, a stance, people, search.
- **Ask.** A question in plain words ("She is announcing the reorg on Thursday, and the person who wanted her job will be in the room") is read into chips: the situations, a woman or a man, a field, an era, an age, a quieter register, the member it is for. Every chip can be taken away, the situation can be changed, other readings are offered and words that were not used are named. The answer counts its stories and lives, offers ways to narrow with their counts, gives each card the reasons that set it apart, and when fewer than four stories fit, says what to drop. The query is the address, so an answer is a link.
- **The shelf** (coach). The questions coaches bring, grouped (what is happening, who my member is, who will land with them, how it should land), each with its live count, the member's own week first. **Where the answers are thin** lists the questions with fewer than four stories and a grid of the situations against what coaches ask for. **Compare** sets two stories side by side: what they share, then only the rows where they differ.
- **Networks.** Kindred across time on each life: a band for each situation the life shares with its kin, years across, and the same as a list with every tie said in words. **Situations that travel together**: the 22 as rows, arcs between those the same lives lived. **Connect two lives**: the strongest way and up to two others, each step a shared situation and one more reason. **Who stands near your three**: the member's situations as overlapping circles, their three where they stand, the lives in more than one, and for each hero the nearest life where they have no story. **At your age**: every story in the member's situations placed by the age its person was then, beside the member's own age, the nearest named.
- **Trails.** Every page offers ways on: the same situation in another century, contemporaries, the same field, the same way of leading. Every page opened joins the trail along the top, and a trail can be saved and walked again.
- **Modes.**
  - Reader: the default when standalone.
  - Member: inside the app, starting from the member's three.
  - Coach: everything, plus moves, lines, calibration, prep for each member, the season ahead, and source checks.
- **Inside the app, both ways.** Members reach it from Heroes, a hero page or a story. A story in the app lists related reading from the Library (the same kind of week, the same world, more from the person) that opens in place, with a way back; a story from beyond the member's three says how it reaches them, in at most two links. A hero page lists all their stories and kindred lives, each tie said in words. Heroes offers "Who stands near your three"; You offers it too, with "At your age" and the whole library. Ask lists the member's own situations in their own words, ordered by what they wrote, with "None of these" and "Send it to Jim as it is". In the Library, Save saves in the app, "Ask Jim about this" opens the thread with the story attached, and "Add to my heroes" goes to the coach. Coaches reach it from the Library tab, which opens on Explore. A check there makes a story sendable in the engine at once, "Send to a member" opens Find and send with the story chosen, "Suggest to Sarah" lands in her thread, and under a member's Ask in Messages, "Find a story for this" opens the Library's answer to it.
- **The demo bar** fits every width: one clock stepper below 1880px, and below 600px only the stepper and a Demo button, which opens a sheet with the view, the member, the device, the eleven moments, the theme and reset. On a phone the member app fills the screen.

## Tests

```
node --test constellation/tests/*.test.mjs     21 tests: matcher parity, the merge, every API route, the Redis protocol,
                                               likeness, coach questions read as situations, the question engine, the networks,
                                               the house voice
node constellation/tests/e2e.mjs               85 checks in a browser: prototype, Library, both roles, phone and desktop,
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
- The house voice is applied to the prototype's product copy by eleven rewrites in `lib/core.js` (`COPY`). Members' own words in the demo script keep the prototype's phrasing, including four goals and an Ask written as "X, not Y"; the designer may want to change them at the source. Two corpus member lines (A1, D1) lose "actually" at merge; the fix belongs in the corpus repo.
- In the demo script, Maya's first message says none of her three has a story in the record. The corpus now holds one recall draft for Simone Biles. The script's words are the prototype's and are left as written.
