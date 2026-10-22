// End to end: the prototype and the Library in a real browser, served the way Vercel serves them.
//
//   node constellation/tests/e2e.mjs            (needs Playwright; uses a global install when there is one)
//
// Starts tools/dev-server.mjs on a free port, then checks, failing on the first wrong answer and on
// any console error or failed request:
//   the bridge     the prototype boots on the merged corpus (531 stories, 22 situations), from the API
//   member         Heroes -> Library card -> the frame -> a story -> Save reaches the app; Ask opens the thread;
//                  a hero page and a story each open the Library at the right page
//   coach          Review collapses the drafts; Library opens on Explore; a source check reaches the engine
//                  and the API ledger; Send to a member lands on Find and send with the story chosen
//   in-app         a story lists related reading that opens in place, back returns; a hero lists kindred lives;
//                  a story from beyond the three says how it reaches them; Heroes shows who stands near them;
//                  Add to my heroes reaches the coach, Suggest reaches the member's thread; a member's Ask in
//                  the coach's thread opens the Library's answer to it
//   library        every page type, reader and coach, desktop and phone, light and dark, no sideways scroll;
//                  Ask reads a question into chips and answers; the shelf counts; kindred across time, the
//                  situation ladder, routes between two lives and the circles of a member's three all draw
//   phone          the demo bar fits, the member app fills the screen, the Demo sheet and stepper work
//   while you wait Maya's held first week shows the story that fits her best; a tap opens it, Back returns in place
//   first week     Maya's first week says what is true: her coach's name, the bracket's counts, the move whole, the hour
//                  before with no pronoun, one status per hero, a fit line from the stories each hero has
//   at Publish     a first week no checked story fills says so above Publish, with three checks; one check fills it
//   her story      why it is hers, one year on every story, Recall draft said once, and the ask said after the tap
//   one answer     the line, Details and the Ask reply offer one story per member and week; the plan sends nothing
//   18:00          Review opens on what goes at 18:00, uncovered at two laptop sizes; every action changes its line's
//                  outcome and Undo puts it back; the type reads at 16px
//   one coach      each line meets at the member's own time; Messages are the console coach's members; a question
//                  prefilled for the room of the week
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const HERE = path.dirname(fileURLToPath(import.meta.url));
let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); }
catch (e) { ({ chromium } = createRequire(execSync('npm root -g').toString().trim() + '/')('playwright')); }

const port = await new Promise((r) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const server = spawn(process.execPath, [path.join(HERE, '../tools/dev-server.mjs'), String(port)], { stdio: 'ignore' });
const BASE = `http://localhost:${port}`;
await new Promise((r) => setTimeout(r, 600));

let failed = 0, passed = 0;
const errs = [];
function check(ok, what) { if (ok) { passed++; console.log('  ok  ' + what); } else { failed++; console.log('  NOT ' + what); } }
const browser = await chromium.launch();
function watch(p, tag) {
  p.on('console', (m) => { if (m.type() === 'error') errs.push(`${tag}: ${m.text()}`); });
  p.on('pageerror', (e) => errs.push(`${tag}: ${e.message}`));
  // a load cut short because its frame closed is not a fault; anything the server refuses is
  p.on('requestfailed', (r) => { if (!/ERR_ABORTED/.test((r.failure() || {}).errorText || '')) errs.push(`${tag}: failed ${r.url()} ${(r.failure() || {}).errorText}`); });
  p.on('response', (r) => { if (r.status() >= 400 && !/\/api\/constellation\/(path\?from=nobody|nope)/.test(r.url())) errs.push(`${tag}: ${r.status()} ${r.url()}`); });
}

try {
  console.log('prototype');
  const p = await browser.newPage({ viewport: { width: 1920, height: 1000 } });  // the full demo bar, with its eleven pills
  watch(p, 'prototype');
  await p.goto(BASE + '/constellation');
  await p.waitForFunction(() => window.CLB && CLB.ready && CLB.c, null, { timeout: 20000 });
  const boot = await p.evaluate(() => ({ source: CLB.source, errors: CLB.errors, stories: CPD.stories.length, sits: CPD.sits.length, heroes: CPD.heroes.length }));
  check(boot.source === 'api', 'members and coaches come from the back end');
  check(boot.stories === 531 && boot.sits === 22 && boot.heroes > 400, `the engine holds the corpus (${boot.stories} stories, ${boot.sits} situations, ${boot.heroes} heroes)`);
  check(boot.errors.length === 0, 'the bridge reports no errors');

  await p.click('button[title^="6 ·"]'); await p.waitForTimeout(500);
  const mon = await p.locator('body').innerText();
  check(/From Barack Obama, one of your three/i.test(mon) && /Chicago, December 2008/.test(mon), 'the scripted Monday card still serves the Obama sample, naming the hero once');
  await p.locator('button', { hasText: 'Heroes' }).last().click(); await p.waitForTimeout(300);
  check(/531 stories/.test(await p.locator('[data-bridge="heroes-library"]').innerText()), 'Heroes shows the Library card');
  await p.click('[data-bridge="heroes-library"]');
  const fr = p.frameLocator('iframe[title="The Constellation library"]');
  await fr.locator('.card.mine').first().waitFor();
  check((await fr.locator('.card.mine .nm').allInnerTexts()).join() === 'Barack Obama,Serena Williams,Rihanna', 'the member frame starts from Sarah’s three');
  await fr.locator('.card.mine').first().click();
  await fr.locator('a.card[href^="#/story/"]').first().click();
  const sid = await fr.locator('[data-act="save"]').getAttribute('data-id');
  await fr.locator('[data-act="save"]').click(); await p.waitForTimeout(200);
  check(await p.evaluate((id) => CLB.state().saved.includes(id), sid) && await p.evaluate(() => /on You/.test(CLB.state().toast || '')), 'Save in the Library saves in the app, and says where it went');
  await fr.locator('[data-act="ask"]').click(); await p.waitForTimeout(200);
  check((await p.evaluate(() => [CLB.state().overlay, CLB.state().attach])).join() === 'thread,' + sid, 'Ask opens the thread with the story attached');
  await p.evaluate(() => CLB.c.setState({ overlay: 'hero', hid: 'obama', hctx: {} })); await p.waitForTimeout(200);
  await p.click('[data-bridge="hero-library"]');
  await p.frameLocator('iframe[title="The Constellation library"]').locator('h1', { hasText: 'Barack Obama' }).waitFor();
  check(true, 'a hero page opens the Library on that life');
  await p.evaluate(() => CLB.c.setState({ overlay: 'story', sid: 's-A1-beverley-mclachlin', sctx: {} })); await p.waitForTimeout(200);
  check((await p.locator('[data-screen-label="M7 Story"] p').first().innerText()).startsWith('Beverley McLachlin, 37'), 'a corpus story drops the dateline the eyebrow already shows');
  check(await p.locator('[data-bridge="story-library"]').count() === 0, 'a member’s story has one way into the library');
  await p.locator('[data-bridge="story-related"] button', { hasText: 'All of this week, in the library' }).click();
  await p.frameLocator('iframe[title="The Constellation library"]').locator('main h1').waitFor(); await p.waitForTimeout(200);
  check(/^#\/situation\/[A-E]\d$/.test(await p.evaluate(() => CLB.state().libRoute)), 'All of this week opens the week’s situation in the Library, with no second copy of the story');
  // member-safe text: a draft is marked once, and no working note reaches the member
  await p.evaluate(() => CLB.c.setState({ overlay: 'story', sid: 's-A2-elena-kagan', sctx: {}, sstack: [] })); await p.waitForTimeout(250);
  const kag = (await p.locator('[data-screen-label="M7 Story"]').innerText()).split(/\nIN THE LIBRARY\n|\nIn the library\n/i)[0];
  check(!/verify|Recall-authored|s-D4-/i.test(kag) && (kag.match(/Recall draft/g) || []).length === 1 && /It fits your week/.test(kag), 'a member’s draft says so once, with no coach’s note');
  await p.evaluate(() => CLB.c.setState({ overlay: 'library', libRoute: '#/story/s-A2-condoleezza-rice', libBack: null, libDepth: 1 }));
  const rf = p.frameLocator('iframe[title="The Constellation library"]'); await rf.locator('main h1', { hasText: 'Condoleezza Rice' }).waitFor();
  const rice = await rf.locator('main').innerText();
  check((rice.match(/Recall draft/g) || []).length === 1 && !/verify|Shown once|unchecked/i.test(rice), 'the frame marks a draft once for a member');
  await p.evaluate(() => CLB.c.setState({ overlay: null }));

  console.log('in-app reading, both ways');
  const first = 's-A1-beverley-mclachlin';
  await p.evaluate((s) => CLB.c.setState({ overlay: 'story', sid: s, sctx: {}, sstack: [] }), first); await p.waitForTimeout(250);
  const rel = p.locator('[data-bridge="story-related"] button');
  const relT = await p.locator('[data-bridge="story-related"]').innerText(), whys = (await p.locator('[data-bridge="story-related"] button').allInnerTexts()).map((t) => t.split('\n').slice(1).join(' '));
  check(await rel.count() >= 3 && /Next, when you want it/.test(relT) && /Others who lived this week/i.test(relT) && /All of this week, in the library/.test(relT) && new Set(whys).size === whys.length, 'a story ends with the next story, two others who lived the week, and the whole week in the library, no reason twice');
  await rel.first().click(); await p.waitForTimeout(250);
  const moved = await p.evaluate(() => [CLB.state().sid, (CLB.state().sstack || []).length]);
  check(moved[0] !== first && moved[1] === 1, 'a related story opens in place, keeping the first to go back to');
  await p.locator('[data-screen-label="M7 Story"] button').first().click(); await p.waitForTimeout(250);
  check(await p.evaluate(() => [CLB.state().overlay, CLB.state().sid].join()) === 'story,' + first, 'back returns to the story you came from');
  await p.evaluate(() => CLB.c.setState({ overlay: 'hero', hid: 'obama', hctx: {}, sstack: [] })); await p.waitForTimeout(250);
  const hrel = p.locator('[data-bridge="hero-related"] button');
  check(await hrel.count() >= 3, 'a hero page lists their stories and kindred lives');
  await hrel.last().click(); await p.waitForTimeout(250);
  const kin = await p.evaluate(() => [CLB.state().overlay, CLB.state().hid, (CLB.state().sstack || []).length]);
  check(kin[0] === 'hero' && kin[1] !== 'obama' && kin[2] === 1, `a kindred life opens as a hero page in the app (${kin[1]})`);
  await p.evaluate(() => CLB.c.setState({ overlay: 'story', sid: 's-D3-bayard-rustin', sctx: {}, sstack: [] })); await p.waitForTimeout(250);
  await p.locator('[data-bridge="story-reach"] summary').click(); await p.waitForTimeout(150);   // a closed disclosure since round six
  const reach = await p.locator('[data-bridge="story-reach"]').innerText().catch(() => '');
  check(/two steps from Obama, one of your three/.test(reach) && /both /.test(reach), 'a story from beyond the three says how it reaches them, in words');
  await p.locator('[data-bridge="story-reach"] button').nth(1).click(); await p.waitForTimeout(250);
  check(await p.evaluate(() => CLB.state().overlay === 'hero' && (CLB.state().sstack || []).length === 1), 'a name in the chain opens that life in place');
  await p.evaluate(() => CLB.c.setState({ overlay: null, sstack: [], tab: 'heroes', m: 'app' })); await p.waitForTimeout(250);
  check(/Who stands near your three/.test(await p.locator('[data-bridge="heroes-near"]').innerText().catch(() => '')), 'Heroes offers who stands near the three');
  const askAs = async (t) => { await p.evaluate((t) => CLB.c.setState({ overlay: null, m: 'app', tab: 'ask', askMore: false, ask: Object.assign({}, CLB.c.state.ask, { stage: 'confirm', text: t, key: null, story: null, sent: false }) }), t); await p.waitForTimeout(250); return p.locator('[data-screen-label="M8 Ask"] button').allInnerTexts(); };
  const ch = await askAs('I still answer every client email myself at midnight.');
  check(/my old job/.test(ch[0]) && ch.includes('None of these') && /as it is$/.test(ch[ch.length - 1]), 'a member’s Ask offers their own situations in their own words, the closest first');
  await p.locator('[data-screen-label="M8 Ask"] button', { hasText: 'None of these' }).click(); await p.waitForTimeout(250);
  const more = await p.locator('[data-screen-label="M8 Ask"] button').allInnerTexts();
  check(more.length >= 5 && !more.some((x) => /my old job/.test(x)), 'None of these opens the other situations');
  await p.locator('[data-screen-label="M8 Ask"] button').first().click(); await p.waitForTimeout(1700);
  check(['answer', 'else'].includes(await p.evaluate(() => CLB.c.state.ask.stage)), 'any situation chosen gets an answer or goes to the coach');
  await askAs('I am announcing the reorg on Thursday and Dan wanted my job.');
  await p.locator('[data-screen-label="M8 Ask"] button').first().click(); await p.waitForTimeout(1700);
  const ans = await p.evaluate(() => CLB.c.state.ask), ansT = await p.locator('[data-screen-label="M8 Ask"]').innerText();
  check(ans.stage === 'answer' && ans.story !== 'st-obama-2008-clinton' && /Ask Jim to check it|Waiting for Jim/.test(ansT) && !/isn’t in this one|isn't in this one/.test(ansT) && /You already have/.test(ansT), 'a member’s Ask answers with something new, one check away, and says what they already have');
  await p.evaluate(() => CLB.c.setState({ overlay: null, m: 'app', tab: 'you' })); await p.waitForTimeout(300);
  const you = await p.locator('[data-screen-label="M11 You"]').innerText();
  check(/At your age/.test(you) && !/Who stands near your three/.test(you), 'You leads into the library at your age; who stands near the three stays on Heroes');
  await p.locator('[data-screen-label="M11 You"] button', { hasText: 'At your age' }).click();
  await p.frameLocator('iframe[title="The Constellation library"]').locator('#agestrip svg').waitFor();
  check(true, 'At your age opens inside the app');
  await p.evaluate(() => CLB.c.setState({ overlay: 'story', sid: 'st-bjk-1973-riggs', sctx: {}, sstack: [] })); await p.waitForTimeout(250);
  await p.locator('[data-bridge="story-related"] button', { hasText: 'All of this week, in the library' }).click();
  const bf = p.frameLocator('iframe[title="The Constellation library"]');
  await bf.locator('main a[href^="#/story/"]').first().waitFor(); await p.waitForTimeout(300);
  const barT = await p.locator('[data-bridge="library-overlay"] > div').first().innerText(), wkChip = await p.evaluate(() => { const L = CLB.lib, s = L.story['st-bjk-1973-riggs'], mine = L.members[CLB.c.state.p].sits.map((id) => L.sit[id].key); return L.sitByKey[s.keys.find((k) => mine.includes(k)) || s.keys[0]].chip; });   // the member's own week the story carries (FE-03)
  check(/^King/.test(barT.trim()) && barT.indexOf(wkChip) >= 0 && !(await bf.locator('header.top').isVisible()) && !(await bf.locator('#trail').isVisible()), 'one bar: Back names the story, the title names the page, and the frame adds no bars');
  await bf.locator('main a[href^="#/story/"]').first().click(); await p.waitForTimeout(400);
  await bf.locator('main a[href^="#/icon/"]').first().click(); await p.waitForTimeout(400);
  const walk = [];
  for (let i = 0; i < 3; i++) { await p.locator('[data-bridge="library-overlay"] button').first().click(); await p.waitForTimeout(450); walk.push(await p.evaluate(() => CLB.state().overlay)); }
  check(walk.join() === 'library,library,story', `Back walks the frame's own pages, then returns to the story (${walk.join()})`);
  await p.evaluate(() => CLB.c.setState({ overlay: null, tab: 'you' })); await p.waitForTimeout(300);
  const youT = await p.locator('[data-screen-label="M11 You"]').innerText();
  check(/Your last trail/.test(youT) && /\d+ stops?/.test(youT) && /Pick up where you left off/.test(youT), 'the trail read in the frame comes home to You');
  await p.evaluate(() => CLB.c.setState({ tab: 'heroes' })); await p.waitForTimeout(300);
  const hz = await p.locator('[data-screen-label="M13 Heroes"]').innerText();
  check((hz.match(/1 story in the library, waiting for Jim’s check/g) || []).length === 2 && !/Nothing paired yet/.test(hz), 'Heroes says what the library holds for each of the three');
  await p.evaluate(() => CLB.c.setState({ tab: 'week', clock: 5, published: true })); await p.waitForTimeout(300);
  const wk3 = await p.locator('[data-screen-label="M6 This week"]').innerText();
  const wkOrder = await p.evaluate(() => { const t = document.querySelector('[data-bridge="week-trail"]'), l = [...document.querySelectorAll('[data-screen-label="M6 This week"] div')].find((e) => e.textContent === 'Developed with Jim'); return !!(t && l && (l.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING)); });
  check(/Prep for Thursday’s first group meeting opens Wednesday\./.test(wk3) && !/Start the prep/.test(wk3) && /From Barack Obama, one of your three/i.test(wk3) && wkOrder, 'This week holds the story, the line and where you were, with no dead button');
  await p.evaluate(() => CLB.c.setState({ overlay: 'story', sid: 's-E3-serena-williams', sctx: {}, sstack: [] })); await p.waitForTimeout(250);
  await p.click('[data-bridge="story-check"]'); await p.waitForTimeout(250);
  const asked = await p.evaluate(() => { const st = CLB.state(), last = st.msgs[st.p].slice(-1)[0]; return [st.signals.some((g) => g.kind === 'check' && g.sid === 's-E3-serena-williams'), last.kind, last.story].join(); });
  check(asked === 'true,story,s-E3-serena-williams' && /^Asked\. Jim has it\./.test(await p.locator('[data-bridge="story-check"]').innerText()), 'a member asks for a draft to be checked: a card in the coach’s thread, and the ask is with Jim');
  await p.evaluate(() => CLB.c.setState({ overlay: null }));
  await p.evaluate(() => CLB.c.setState({ overlay: 'library', libRoute: '#/icon/billie-jean-king', libBack: null, sstack: [] }));
  const lf = p.frameLocator('iframe[title="The Constellation library"]');
  await lf.locator('[data-act="add-hero"]').click(); await p.waitForTimeout(300);
  check(await p.evaluate(() => CLB.state().pending.some((x) => x.why === 'Found in the library' && /Billie Jean King/.test(x.name))), 'Add to my heroes in the Library reaches the coach as a hero to add');

  console.log('coach');
  await p.locator('button[aria-label="Coach"]').click(); await p.waitForTimeout(300);
  await p.evaluate(() => CLB.c.setState({ c: 'C3' })); await p.waitForTimeout(300);
  const review = await p.evaluate(() => CPE.vals(CLB.c).rq.rows.map((r) => r.trace.join(' ')).join(' '));
  check(/recall drafts? also carr/.test(review) && !/tie-break|precedence|every-act-is-a-message/.test(review), 'Review collapses the recall drafts into one line per member, in plain words');
  check(/Sarah asked you to check Serena Williams, \d{4}\. It is first on Source checks/.test(await p.locator('[data-bridge="review-line"]', { hasText: 'Sarah Kessler' }).innerText().catch(() => '')), 'Review says what Sarah asked Jim to check, on her line');
  await p.evaluate(() => CLB.c.setState({ swapFor: 'michael', swapHero: 'all' })); await p.waitForTimeout(300);
  const sw = p.locator('[data-screen-label="C3 Swap panel"]');
  check(await sw.locator('button[disabled]').count() === 0 && await sw.locator('[data-bridge="swap-check"]').count() >= 3 && /John Coltrane, New York 1957/i.test(await sw.innerText()) && !/Muhammad Ali, /i.test(await sw.innerText()), 'Swap offers Check the source on the week’s drafts as the line ranks them (CLN.nextFor), leaving out the life Michael had last week');
  await p.evaluate(() => CLB.c.setState({ swapFor: null })); await p.waitForTimeout(150);
  await p.locator('button[aria-label="Library"]').click();
  const cf = p.frameLocator('iframe[title="The Constellation library"]');
  await cf.locator('h2', { hasText: 'Prep for a member' }).waitFor();
  check(true, 'Library opens on Explore, in coach mode');
  await p.evaluate(() => CLB.c.setState({ cxRoute: '#/checks' })); await cf.locator('main section h2', { hasText: 'Members asked' }).waitFor();
  check(/Serena Williams/.test(await cf.locator('main section').first().innerText()), 'Source checks puts the members’ asks first');
  const target = 's-A2-tom-petty';
  await p.evaluate((t) => CLB.c.setState({ cxRoute: '#/story/' + t }), target);
  await cf.locator('textarea[name=note]').waitFor();
  check(await cf.locator('[data-act="send"]').isDisabled(), 'a recall draft cannot be sent');
  await cf.locator('textarea[name=note]').fill('Read against the interview.');
  await cf.locator('[data-act="verify"]').click(); await p.waitForTimeout(400);
  check(await p.evaluate((t) => CPD.story[t].verified, target), 'a source check reaches the engine at once');
  check(await p.evaluate((t) => fetch('/api/constellation/state').then((r) => r.json()).then((j) => !!j.ledger[t]), target), 'and the back end ledger');
  await cf.locator('[data-act="send"]').click(); await p.waitForTimeout(400);
  check((await p.evaluate(() => [CLB.state().c, CLB.state().lib.sel])).join() === 'C4,' + target, 'Send to a member lands on Find and send with the story chosen');
  check(await p.locator('[data-bridge="send-related"] button').count() >= 2 && !/Also filed/.test(await p.locator('[data-screen-label="C4 Library"]').innerText()), 'Find and send lists stories related to the one chosen, each with its own reason');
  check(/^For Sarah: /.test(await p.locator('[data-bridge="send-for"]').innerText().catch(() => '')), 'Find and send says how the chosen story reaches the member');
  const marks = await p.evaluate(() => CPE.vals(CLB.c).lib.results.slice(0, 5).map((r) => r.reach));
  check(/one of Sarah’s three/.test(marks[0]) && !marks.some((m) => /1 link/.test(m)), 'Find and send lists Sarah’s three first, and marks only them');
  check(!/Draft — must verify/.test(await p.locator('body').innerText()), 'one name for a draft everywhere');
  await p.locator('button', { hasText: 'Send now' }).click(); await p.waitForTimeout(200);
  check(await p.evaluate((t) => { const st = CLB.state(); return st.msgs[st.lib.to].slice(-1)[0].story === t; }, target), 'Send now delivers it to the member thread');
  await p.evaluate(() => CLB.c.setState({ c: 'CX', lib: Object.assign({}, CLB.c.state.lib, { to: 'david' }) })); await p.waitForTimeout(300);
  await p.locator('[data-bridge="coach-tabs"] button', { hasText: 'Find and send' }).click(); await p.waitForTimeout(300);
  const c4 = await p.evaluate(() => ({ key: CLB.c.state.lib.key, want: CLB.lib.sit[CLB.lib.members.david.up19.sit].key, n: CPE.vals(CLB.c).lib.results.length, far: !!CPE.vals(CLB.c).lib.farChip }));
  check(c4.key === c4.want && c4.n < 531 && c4.far, 'Find and send opens on the member’s week, with far stories set aside');
  // the send guard: nothing unchecked or repeated goes out, and the coach's choice wins
  await p.click('button[title^="10 ·"]'); await p.waitForTimeout(400);
  const notice = await p.evaluate(() => CPE.vals(CLB.c).cn.text), row = async () => p.evaluate(() => { const r = CPE.vals(CLB.c).rq.rows.find((x) => x.mid === 'sarah'); return { status: r.status, guard: r.guard, s: r.s && r.s.eyebrow, fill: r.fill && r.fill.title }; });
  const r0 = await row();
  check(/^Two stories go out at 18:00\./.test(notice) && /^Nothing goes to Sarah yet: the story is a recall draft\.$/.test(r0.status) && /had Barack Obama on 12 Oct/.test(r0.guard) && r0.fill === 'Michelle Obama, Milwaukee 2008', `nothing unchecked or repeated goes out: Sarah’s paired draft waits, the row names the life she had last week, and the check offered is a new one (${notice} | ${r0.status})`);
  await p.evaluate(() => CLB.c.setState({ review: Object.assign({}, CLB.c.state.review, { sarah: { action: 'swap', story: 'st-bjk-1973-riggs' } }) })); await p.waitForTimeout(200);
  const r1 = await row();
  check(/^Billie Jean King/.test(r1.s) && /^Goes to Sarah at 18:00/.test(r1.status), 'a swap wins over the pairing, and the row says when it goes');
  await p.evaluate(() => CLB.c.setState({ review: Object.assign({}, CLB.c.state.review, { sarah: {} }), c: 'C3', cnotif: null, rvAll: false })); await p.waitForTimeout(300);
  // "Your week, Jim": one line per member of this coach, each with one action, and the checks to make first
  const wk = await p.evaluate(() => { const root = document.querySelector('[data-screen-label="C3 Review queue"]'), ls = [...root.querySelectorAll('[data-bridge="review-line"]')];
    return { title: CPE.vals(CLB.c).cTitle, names: ls.map((x) => x.innerText.split('\n')[1] || x.innerText), acts: ls.map((x) => [...x.querySelectorAll('button')].map((b) => b.innerText.trim()).filter((t) => /^(Approve|Check|Answer|Prep|Send .+)$/.test(t)).slice(-1)[0] || '-'),
      sarah: (ls.find((x) => /Sarah Kessler/.test(x.innerText)) || { innerText: '' }).innerText.replace(/\s+/g, ' '), david: (ls.find((x) => /David Okafor/.test(x.innerText)) || { innerText: '' }).innerText.replace(/\s+/g, ' '), counts: [CPE.vals(CLB.c).rosterSummary, CPE.vals(CLB.c).rq.count, (CPE.vals(CLB.c).nav.find((n) => n.label === 'Review') || {}).badge], plan: (root.querySelector('[data-bridge="review-plan"]') || {}).innerText || '', bulk: root.firstElementChild.innerText, details: root.querySelectorAll('[data-bridge="review-why"]').length }; });
  check(wk.title === 'Your week, Jim' && wk.names.join() === 'David Okafor,Sarah Kessler,Priya Raman,Tom Whitfield' && wk.acts.join('|') === 'Check|Send Michelle Obama, Philadelphia 2016|Prep|-' && !wk.details &&
    /Thu 22 Oct · Reorg announcement · E1 · Everything you do gets read as a signal/.test(wk.sarah) && /Ready now · Michelle Obama, Philadelphia 2016/.test(wk.sarah) && /Or one check · Michelle Obama, Milwaukee 2008/.test(wk.sarah) && /You meet Tue 10:00 · Prep/.test(wk.sarah),
    `Review reads "Your week, Jim": a line for each of Jim's four members, those waiting for a check first, each with one action (${wk.acts.join(', ')})`);
  check(/1 waits for your check · 1 ready to send/.test(wk.counts[0]) && /1 waits for your check · 1 ready to send/.test(wk.counts[1]) && wk.counts[2] === 2, `the 18:00 notice, Members, Review and the badge give one count: David waits for a check, Sarah has a checked story to send (${wk.counts.join(' | ')})`);
  check(/For the weeks ahead/i.test(wk.plan) && /After David’s check, \S+ more give Sarah and Tom four checked stories, with one in every week of theirs ahead\. No checked story yet for David’s weeks of 26 Oct and 2 Nov, or for Priya’s week of 26 Oct\. Their recall drafts would fill a line that waits this week, so they come into this plan after Sunday 18:00\./.test(wk.plan) && !/still needs? more stories written/.test(wk.plan) && /\nFor (Sarah|David|Priya|Tom), week of \d+ (Oct|Nov)/.test(wk.plan) && !/Golda Meir/.test(wk.plan) && /One check · Billie Jean King, 1970 Or one check · Golda Meir, Chicago 1948/.test(wk.david) && !/Approve/.test(wk.bulk), 'below the lines, the checks for the weeks after this one; Golda Meir, who carries David’s week, is his line’s other check; and no bulk approve, as anything left goes at 18:00');
  // Send: a checked story that carries the week goes at once, with no check, and the button names it
  await p.locator('[data-bridge="review-line"]', { hasText: 'Sarah Kessler' }).locator('button', { hasText: 'Send Michelle Obama' }).click(); await p.waitForTimeout(300);
  const rs = await row();
  check(/^Michelle Obama/.test(rs.s) && /^Goes to Sarah at 18:00/.test(rs.status) && await p.evaluate(() => CLB.c.state.ctoast) === 'Michelle Obama, Philadelphia 2016 goes to Sarah at 18:00.', 'Send Michelle Obama sends the checked story to Sarah at 18:00, with no check needed, and the toast names it by its title');
  await p.evaluate(() => CLB.c.setState({ review: Object.assign({}, CLB.c.state.review, { sarah: {} }) })); await p.waitForTimeout(200);
  await p.locator('[data-bridge="review-line"]', { hasText: 'Sarah Kessler' }).locator('button', { hasText: 'Details' }).click(); await p.waitForTimeout(250);
  await p.locator('[data-bridge="review-fill"] button', { hasText: 'Check the source here' }).first().click(); await p.waitForTimeout(300);
  const posted = []; await p.route('**/api/constellation/state/ledger', (rt) => { if (rt.request().method() === 'POST') { posted.push(JSON.parse(rt.request().postData())); return rt.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); } return rt.continue(); });
  const cc = p.locator('[data-bridge="check-card"]').first(), ccSend = cc.locator('button').first();
  const ccDis = await ccSend.isDisabled();
  await cc.locator('input').fill('Campaign remarks, Milwaukee, video transcript'); await p.waitForTimeout(150);
  await ccSend.click(); await p.waitForTimeout(600);
  const r2 = await row();
  check(ccDis && posted.length === 1 && posted[0].by === 'jim' && posted[0].note && posted[0].story === 's-E1-michelle-obama' && /^Michelle Obama/.test(r2.s) && /^Goes to Sarah/.test(r2.status), 'the check card needs a note, records the console’s coach, and fills the slot');
  await p.unroute('**/api/constellation/state/ledger');
  await p.evaluate(() => { window.postMessage({ type: 'cl:unverified', story: 's-E1-michelle-obama' }, location.origin); CLB.c.setState({ review: Object.assign({}, CLB.c.state.review, { sarah: {} }), fillOpen: null }); }); await p.waitForTimeout(300);
  await p.click('button[title^="11 ·"]'); await p.waitForTimeout(300);
  await p.locator('button[aria-label="Member"]').click(); await p.evaluate(() => CLB.c.setState({ m: 'app', tab: 'week', overlay: null })); await p.waitForTimeout(400);
  const held = await p.locator('[data-screen-label="M6 This week"]').innerText(), waitT = await p.locator('[data-bridge="week-wait"]').innerText().catch(() => '');
  check(/Your story comes once Jim has chosen one/.test(held) && !/chose to wait|is looking for one/.test(held), 'a held week tells the member why, in one line: the paired story’s life is one Sarah had last fortnight');
  const waitL = waitT.split('\n');
  check(/While you wait/i.test(held) && /^While you wait$/i.test(waitL[0]) && / · /.test(waitL[1] || '') && /^(Checked\. |Recall draft\. Jim checks it before it is sent\. )/.test(waitL[2] || ''), `a held week still opens the corpus, on screen (${waitL.join(' / ')})`);
  await p.locator('[data-bridge="week-wait"]').click(); await p.waitForTimeout(400);
  check(await p.evaluate(() => CLB.state().overlay) === 'story' && (await p.locator('[data-screen-label="M7 Story"]').innerText()).startsWith((waitL[1] || '?').split(' · ')[0]), 'While you wait opens its story in the app');
  // the reader keeps their place: a story opened from another starts at its top, and Back returns to where they were
  const FIND = `(() => { const pane = document.querySelector('[data-screen-label="M7 Story"]'); return pane && [pane, ...pane.querySelectorAll('div')].find((e) => { const oy = getComputedStyle(e).overflowY; return (oy === 'auto' || oy === 'scroll') && e.scrollHeight > e.clientHeight; }); })()`;
  await p.evaluate(() => CLB.c.setState({ overlay: 'story', sid: 'st-obama-2008-clinton', sctx: {}, sstack: [] })); await p.waitForTimeout(400);
  const top0 = await p.evaluate((F) => { const b = eval(F); b.scrollTop = 400; return b.scrollTop; }, FIND);
  await p.evaluate(() => { const b = [...document.querySelectorAll('[data-bridge="story-related"] button')][0]; b.click(); }); await p.waitForTimeout(500);
  const topNew = await p.evaluate((F) => eval(F).scrollTop, FIND);
  await p.evaluate(() => CPE.vals(CLB.c).sv.back()); await p.waitForTimeout(500);
  const topBack = await p.evaluate((F) => eval(F).scrollTop, FIND);
  check(top0 > 100 && topNew === 0 && Math.abs(topBack - top0) <= 10, `the next story opens at its top, and Back returns to where the reader was (${top0} → ${topNew} → ${topBack})`);
  await p.evaluate(() => CLB.c.setState({ overlay: null, tab: 'ask', ask: Object.assign({}, CLB.c.state.ask, { stage: 'confirm', text: 'I still answer every client email myself at midnight.', key: null, story: null, sent: false }) })); await p.waitForTimeout(300);
  await p.locator('[data-screen-label="M8 Ask"] button').first().click(); await p.waitForTimeout(1600);
  const about = await p.locator('[data-bridge="ask-about"]').first().innerText().catch(() => '');
  check(/^About: you/.test(about), `a member's answer is about the week in their own words (${about})`);
  await p.locator('button[aria-label="Coach"]').click(); await p.waitForTimeout(200);
  // prep for every member of the console's coach; another coach's member stays theirs
  await p.evaluate(() => CLB.c.setState({ c: 'CK' })); await p.waitForTimeout(200);
  const ck = await p.evaluate(() => CPE.vals(CLB.c).ck.map((k) => k.name.split(' ')[0] + ':' + (k.prepDis ? 'no' : 'yes')).join());
  await p.evaluate(() => CPE.vals(CLB.c).ck.find((k) => /^David/.test(k.name)).prep()); await p.waitForTimeout(300);
  const dp = await p.evaluate(() => [CLB.c.state.c, CLB.c.state.cxRoute].join());
  check(/^Sarah:yes,David:yes,Priya:yes,Tom:yes$/.test(ck) && dp === 'CX,#/member/david', `Check-ins lists Jim’s own members, soonest first, a check-in already past after them, and opens prep for each, David’s as the Library’s reading for him (${ck})`);
  await p.locator('button', { hasText: 'Michael,' }).first().click(); await p.waitForTimeout(300);
  await p.click('button[title^="10 ·"]'); await p.waitForTimeout(300); await p.locator('button[aria-label="Coach"]').click();
  await p.evaluate(() => CLB.c.setState({ c: 'C3', cnotif: null, rvAll: false })); await p.waitForTimeout(300);
  const jen = await p.evaluate(() => { const v = CPE.vals(CLB.c); return { title: v.cTitle, mids: v.rq.rows.map((r) => r.mid).join(), man: v.rq.manifest.rows.map((r) => r.mid).join() }; });
  check(jen.title === 'Your week, Jennifer' && jen.mids === 'michael' && jen.man === 'michael', 'Jennifer’s console shows her one member, and its 18:00 manifest names only Michael');
  await p.evaluate(() => CLB.c.setState({ c: 'CK' })); await p.waitForTimeout(150);
  await p.locator('button', { hasText: 'Maya,' }).first().click(); await p.waitForTimeout(300);
  check(await p.evaluate(() => CPE.vals(CLB.c).ck.filter((k) => !k.prepDis).map((k) => k.name.split(' ')[0]).join()) === 'Maya', 'prep opens for Maya in Bret’s console, and for no one else');
  await p.locator('button', { hasText: 'Sarah,' }).first().click(); await p.waitForTimeout(300);
  console.log('every persona, every step of the demo clock, both roles');
  let stepErrs = [];
  for (const persona of ['Maya', 'Sarah', 'Michael']) {
    await p.locator('button', { hasText: persona + ',' }).first().click(); await p.waitForTimeout(300);
    for (let i = 1; i <= 11; i++) {
      await p.click(`button[title^="${i} ·"]`); await p.waitForTimeout(150);
      for (const role of ['Member', 'Coach']) { await p.locator(`button[aria-label="${role}"]`).click(); await p.waitForTimeout(80); }
      const e = await p.evaluate(() => CLB.errors.slice()); if (e.length) stepErrs.push(`${persona} step ${i}: ${e.join('; ')}`);
    }
  }
  check(!stepErrs.length, '3 personas × 11 steps × 2 roles render with the bridge in place' + (stepErrs.length ? ': ' + stepErrs.slice(0, 3).join(' | ') : ''));
  await p.locator('button', { hasText: 'Sarah,' }).first().click(); await p.waitForTimeout(300);
  await p.click('button[title^="6 ·"]'); await p.locator('button[aria-label="Member"]').click(); await p.waitForTimeout(300);
  const every = await p.evaluate(async () => {
    const tick = () => new Promise((ok) => setTimeout(ok, 10)); let s = 0, h = 0, reach = 0;
    for (const sid of Object.keys(CPD.story)) { CLB.c.setState({ overlay: 'story', sid, sctx: {}, sstack: [] }); await tick(); if (document.querySelector('[data-screen-label="M7 Story"]')) s++; if (document.querySelector('[data-bridge="story-reach"]')) reach++; }
    for (const hid of Object.keys(CPD.hero)) { CLB.c.setState({ overlay: 'hero', hid, hctx: {}, sstack: [] }); await tick(); if (document.querySelector('[data-screen-label="M14 Hero"]')) h++; }
    CLB.c.setState({ overlay: null }); return { s, h, reach, n: Object.keys(CPD.story).length, nh: Object.keys(CPD.hero).length, err: CLB.errors.length };
  });
  check(every.s === every.n && every.h === every.nh && every.err === 0 && every.reach > 400, `every story (${every.s}) and every life (${every.h}) opens in the app; ${every.reach} stories say how they reach Sarah’s three`);
  await p.locator('button[aria-label="Coach"]').click(); await p.evaluate(() => CLB.c.setState({ c: 'CX', cxRoute: '#/icon/billie-jean-king' }));
  const sf = p.frameLocator('iframe[title="The Constellation library"]');
  await sf.locator('[data-act="suggest-hero"]').click(); await p.waitForTimeout(300);
  check(await p.evaluate(() => Object.values(CLB.state().msgs).some((t) => /suggest Billie Jean King/.test((t.slice(-1)[0] || {}).body || ''))), "Suggest in the Library lands in the member's thread");
  await p.evaluate(() => {
    const st = CLB.c.state, e1 = CPD.sits.find((x) => x.id === 'E1'), mm = Object.assign({}, st.msgs);
    mm.sarah = (st.msgs.sarah || []).concat([{ id: 'e2e-ask', from: 'member', kind: 'ask', body: 'I am announcing the reorg on Thursday and Dan wanted my job.', chip: e1.chip, day: 1, at: 'Tue 08:10', live: true }]);
    CLB.c.setState({ c: 'C8', thread: 'sarah', msgs: mm });
  }); await p.waitForTimeout(300);
  const reply = p.locator('[data-bridge="ask-reply"]').last();
  check(/Ready to send/i.test(await reply.innerText()) && !/Barack Obama/.test(await reply.innerText()), 'a member’s Ask is answered in its own thread, with nothing Sarah had last week');
  await reply.locator('button', { hasText: 'Other stories for this' }).click();
  await sf.locator('h2.count').waitFor();
  const desk = await sf.locator('.readas a.qchip').allInnerTexts();
  check(desk.some((t) => t.startsWith('E1')) && desk.some((t) => /For Sarah/.test(t)), "Find a story for this opens the Library's answer to the member's Ask, with the situation Sarah chose");
  await p.close();

  console.log('the demo on a phone');
  const ph = await browser.newPage({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  watch(ph, 'phone');
  await ph.goto(BASE + '/constellation');
  await ph.waitForFunction(() => window.CLB && CLB.ready && CLB.c, null, { timeout: 20000 });
  check(await ph.evaluate(() => document.querySelector('[data-screen-label="Demo bar"]').scrollWidth <= innerWidth), 'the demo bar fits a phone');
  check(await ph.evaluate(() => { const f = document.querySelector('[data-screen-label="M0 Welcome"]'); return !!f && Math.round(f.getBoundingClientRect().width) === innerWidth; }), 'the member app fills the phone, with no device drawn around it');
  await ph.locator('[data-bridge="demo-menu"]').click();
  await ph.locator('[role="dialog"][aria-label="Demo controls"] button', { hasText: 'Coach console' }).click(); await ph.waitForTimeout(250);
  check(await ph.evaluate(() => CLB.state().role) === 'coach' && await ph.locator('[data-bridge="demo-coach-note"]').count() === 1, 'the Demo sheet switches to the coach console, which says it is made for a laptop');
  await ph.locator('[data-bridge="demo-menu"]').click();
  await ph.locator('[role="dialog"][aria-label="Demo controls"] button', { hasText: 'Member app' }).click(); await ph.waitForTimeout(200);
  await ph.locator('[data-bridge="demo-stepper"] button[aria-label="Next demo step"]').click(); await ph.waitForTimeout(250);
  check(await ph.evaluate(() => CLB.state().clock) === 1, 'the stepper moves the demo clock');
  await ph.close();

  console.log('while you wait, on a phone');
  // Maya's first week waits for Bret's check: This week shows the story that fits her best, a tap opens it, and Back
  // returns to the week where she left it
  const mw = await browser.newPage({ viewport: { width: 390, height: 640 }, hasTouch: true, isMobile: true });
  watch(mw, 'while you wait');
  await mw.goto(BASE + '/constellation'); await mw.waitForFunction(() => window.CLB && CLB.ready && CLB.c, null, { timeout: 20000 });
  await mw.evaluate(() => CPE.vals(CLB.c).personas.find((x) => /^Maya/.test(x.label)).go()); await mw.waitForTimeout(300);
  const WBOX = `(() => { let b = document.querySelector('[data-screen-label="M6 This week"]'); while (b && !/(auto|scroll)/.test(getComputedStyle(b).overflowY)) b = b.parentElement; return b; })()`;
  // a story read leaves While you wait, as it leaves Next (FF-15): Michelle Obama at step 6, then King, then Robinson
  const WAITS = { 6: ['Michelle Obama · Philadelphia, July 2016', 'From Michelle Obama, your reserve'], 7: ['Billie Jean King · Houston, September 1973', 'One step from Simone Biles'], 8: ['Jackie Robinson · Brooklyn, August 1945', 'One step from Simone Biles'] };
  for (const step of [6, 7, 8]) {
    await mw.evaluate((i) => CPE.vals(CLB.c).steps[i - 1].go(), step); await mw.waitForTimeout(500);
    const wkT = await mw.locator('[data-screen-label="M6 This week"]').innerText(), wrow = mw.locator('[data-bridge="week-wait"]'), wl = (await wrow.innerText()).split('\n');
    const top0 = await mw.evaluate((F) => { const b = eval(F); b.scrollTop = b.scrollHeight; return b.scrollTop; }, WBOX);
    await wrow.tap(); await mw.waitForTimeout(500);
    const opened = await mw.locator('[data-screen-label="M7 Story"]').innerText().catch(() => '');
    await mw.locator('[data-screen-label="M7 Story"] button').first().tap(); await mw.waitForTimeout(500);
    const back = await mw.evaluate((F) => ({ overlay: CLB.state().overlay, top: eval(F) ? eval(F).scrollTop : -1 }), WBOX);
    const [who, place] = WAITS[step][0].split(' · ');
    check(/While you wait/i.test(wkT) && !/Hamilton/.test(wkT) && wl[1] === WAITS[step][0] && wl[2] === 'Checked. ' + WAITS[step][1] + ', for another of your weeks: everything you do gets read as a signal.' &&
      opened.startsWith(who + '\n' + place.toUpperCase()) && back.overlay === null && top0 > 0 && back.top === top0,
      `Maya, step ${step}: This week shows While you wait, a tap opens the story, and Back returns to the week at the same scroll (${top0} → ${back.top})`);
  }
  await mw.close();

  console.log('Maya’s first week, said truly');
  // the line is developed with Bret; the bracket says its own counts; the move is the headline, whole, with this week's step
  // under it; the hour before names no pronoun and no story that has not come; each hero card has one status, and a hero
  // with no story and nobody tied to them is close to no one; the fit check's line comes from the stories each hero has
  const fw = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  watch(fw, 'first week');
  await fw.goto(BASE + '/constellation'); await fw.waitForFunction(() => window.CLB && CLB.ready && CLB.c, null, { timeout: 20000 });
  await fw.evaluate(() => CPE.vals(CLB.c).personas.find((x) => /^Maya/.test(x.label)).go()); await fw.waitForTimeout(300);
  const appT = () => fw.locator('[data-screen-label="Member app"]').innerText();
  await fw.evaluate(() => CLB.c.setState({ m: 'M2' })); await fw.waitForTimeout(250);
  const m2 = await appT();
  check(/Your bracket: 16 people\. Eight leaders, and eight from Creators, Sport and Film & TV\./.test(m2) && !/to 128/.test(m2), 'M2 says the bracket by its counts: 16 people, eight leaders and eight from Creators, Sport and Film & TV');
  await fw.evaluate(() => CPE.vals(CLB.c).steps[2].go()); await fw.waitForTimeout(400);
  const m4 = await appT();
  check(/No story from MrBeast yet\. Nobody in the library is tied to MrBeast, so Bret chooses your stories by hand\./.test(m4) && !/close to MrBeast|close to Reshma Saujani/.test(m4), 'the final four: a hero with no story and nobody tied to them is close to no one');
  await fw.evaluate(() => CLB.c.setState({ m: 'M5', core: ['michelle', 'biles', 'mrbeast'], fitSent: false })); await fw.waitForTimeout(250);
  const m5 = await appT();
  check(/Michelle Obama has a checked story for one of your weeks: everything you do gets read as a signal\./.test(m5) && !/not all/.test(m5), 'the fit check says what the hero has: Michelle Obama’s checked story for one of Maya’s weeks');
  await fw.evaluate(() => CPE.vals(CLB.c).personas.find((x) => /^Maya/.test(x.label)).go()); await fw.waitForTimeout(300);
  await fw.evaluate(() => CPE.vals(CLB.c).steps[5].go()); await fw.waitForTimeout(500);
  const w6 = await fw.locator('[data-screen-label="M6 This week"]').innerText(), mvBox = await fw.evaluate(() => { const l = document.querySelector('[data-bridge="week-one-line"]'); return l ? l.parentElement.innerText : ''; });
  check(/Developed with Bret/.test(w6) && !/Developed with Jennifer/.test(w6), 'Maya’s line is developed with Bret, her coach');
  check(/^YOUR MOVE\nSend one paragraph with a position in it to one person, the day before the meeting\.\nWeek 1 of 6: send it to one person\.\nSix weeks to make this a habit\./.test(mvBox) && (w6.match(/Six weeks to make this a habit/g) || []).length === 1,
    'the move is its whole behaviour, then “Week 1 of 6: send it to one person.”, and once what the six weeks are for');
  check(/Prep for Thursday’s product review opens Wednesday\./.test(w6), 'prep says the day it opens and the room it is for');
  await fw.evaluate(() => CPE.vals(CLB.c).steps[6].go()); await fw.waitForTimeout(400);
  const n7 = await fw.evaluate(() => CLB.c.state.notif && CLB.c.state.notif.text);
  check(n7 === 'In an hour: your move and your line.', `the hour before names what the week holds, and no pronoun (${n7})`);
  await fw.evaluate(() => CLB.c.setState({ tab: 'heroes', notif: null })); await fw.waitForTimeout(300);
  const hz6 = await fw.locator('[data-screen-label="M13 Heroes"]').innerText();
  const cards6 = await fw.evaluate(() => [...document.querySelectorAll('[data-screen-label="M13 Heroes"] > button')].slice(0, 3).map((b) => b.innerText));
  check(cards6.length === 3 && cards6.every((t) => t.split('\n').filter((l) => /^(No story from|\d+ stor(y|ies) in the library|None sent yet|\d+ stor(y|ies) received)/i.test(l)).length === 1) && /Simone Biles[\s\S]*1 story in the library, waiting for Bret’s check\./.test(hz6) && !/None sent yet/i.test(hz6) && !/close to MrBeast|close to Reshma Saujani/.test(hz6),
    'each hero card shows one status: Biles’s “1 story in the library, waiting for Bret’s check.”, and no one is close to MrBeast');
  await fw.close();

  console.log('the first week, at Publish');
  // above Publish Move 1, a first week no checked story fills says so, with the three checks that would fill it, the week's
  // own draft first; one check (the ledger mocked) and the block goes, and Monday's card carries the story
  const pb = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watch(pb, 'publish');
  await pb.route('**/api/constellation/state/ledger', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  await pb.goto(BASE + '/constellation'); await pb.waitForFunction(() => window.CLB && CLB.ready && CLB.c, null, { timeout: 20000 });
  await pb.evaluate(() => CPE.vals(CLB.c).personas.find((x) => /^Sarah/.test(x.label)).go()); await pb.waitForTimeout(300);
  await pb.evaluate(() => CPE.vals(CLB.c).steps[4].go()); await pb.waitForTimeout(500);
  check(await pb.locator('[data-bridge="mv-gap"]').count() === 0, 'Sarah’s first week has a checked story: no block above Publish');
  await pb.evaluate(() => CPE.vals(CLB.c).personas.find((x) => /^Maya/.test(x.label)).go()); await pb.waitForTimeout(300);
  await pb.evaluate(() => CPE.vals(CLB.c).steps[4].go()); await pb.waitForTimeout(600);
  const gapB = pb.locator('[data-bridge="mv-gap"]'), gapT = await gapB.innerText().catch(() => '');
  const pubOk = await pb.evaluate(() => { const b = [...document.querySelectorAll('[data-screen-label="Coach console"] button')].find((x) => /^Publish to Maya/.test(x.innerText.trim())); return !!b && !b.disabled; });
  check(/Maya’s first week has no checked story for “I’m the expert\. I’m not the person they call\.” One check fills it/.test(gapT) && await gapB.locator('button', { hasText: /^Check$/ }).count() === 3 &&
    /Katherine Johnson, Langley\nClose to Reshma Saujani, by Bret’s choice/.test(gapT) && /One of Maya’s interests: /.test(gapT) && pubOk, 'Maya at Publish: her first week has no checked story, three checks with one reason each, and Publish still open');
  await gapB.locator('button', { hasText: /^Check$/ }).first().click(); await pb.waitForTimeout(250);
  await gapB.locator('[data-bridge="check-card"] input').fill('NASA oral history, the 2008 interview transcript'); await pb.waitForTimeout(150);
  await gapB.locator('[data-bridge="check-card"] button').first().click(); await pb.waitForTimeout(700);
  check(await pb.locator('[data-bridge="mv-gap"]').count() === 0 && await pb.evaluate(() => CLB.lib.story['st-kjohnson-1958-langley'].verified), 'one check fills the week, and the block goes');
  await pb.evaluate(() => CPE.vals(CLB.c).steps[5].go()); await pb.waitForTimeout(500);
  const w6b = await pb.locator('[data-screen-label="M6 This week"]').innerText();
  check(await pb.evaluate(() => CPE.vals(CLB.c).wk.hasStory) && /Katherine Johnson/.test(w6b) && !/Your story comes once/.test(w6b) && /^Bret chose this$/im.test(w6b) && !/close to Reshma Saujani/i.test(w6b),
    'on Monday Maya’s week carries the story, as Bret’s choice (nobody in the library is tied to Reshma Saujani), with no “Your story comes once…”');
  await pb.evaluate(() => CPE.vals(CLB.c).steps[6].go()); await pb.waitForTimeout(400);
  const n7b = await pb.evaluate(() => CLB.c.state.notif && CLB.c.state.notif.text);
  check(n7b === 'In an hour: your move, your line and Katherine Johnson’s story.', `with a story delivered, the hour before names whose it is (${n7b})`);
  await pb.close();

  console.log('her story, said for her');
  // why the story is hers, under its title; one year per story on the page, the chip and the life it opens; no age where
  // the year is unsettled; Recall draft explained on the first draft and folded on the next; the ask said after the tap
  const hs = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  watch(hs, 'her story');
  await hs.goto(BASE + '/constellation'); await hs.waitForFunction(() => window.CLB && CLB.ready && CLB.c, null, { timeout: 20000 });
  await hs.evaluate(() => CPE.vals(CLB.c).personas.find((x) => /^Maya/.test(x.label)).go()); await hs.waitForTimeout(300);
  await hs.evaluate(() => CPE.vals(CLB.c).steps[5].go()); await hs.waitForTimeout(400);
  await hs.evaluate(() => CLB.c.setState({ overlay: 'story', sid: 'st-kjohnson-1958-langley', sctx: {}, sstack: [] })); await hs.waitForTimeout(500);
  const kjT = await hs.locator('[data-screen-label="M7 Story"]').innerText();
  check(/^Katherine Johnson\n+LANGLEY, VIRGINIA\n+Bret chose this for Thursday’s product review\.\n+Johnson, a mathematician/i.test(kjT) && await hs.locator('[data-bridge="story-age"]').count() === 0 && !/1950|1953|late 1950s/i.test(kjT.split('\n').slice(0, 4).join(' ')),
    'Johnson’s story: Bret’s choice for Thursday’s product review under the title, no year where her record and her dateline disagree (FF-3, FF-4), no age line, and no dateline opening the body');
  // Johnson is three steps from Maya's three, so her page has no reach; King's Riggs story is one, and says so
  const kjReach = await hs.locator('[data-bridge="story-reach"]').count();
  await hs.evaluate(() => CLB.c.setState({ sid: 'st-bjk-1973-riggs', sstack: [] })); await hs.waitForTimeout(400);
  const reachOpen = await hs.evaluate(() => document.querySelector('[data-bridge="story-reach"]').open);
  await hs.locator('[data-bridge="story-reach"] summary').tap(); await hs.waitForTimeout(200);
  const chipY = await hs.evaluate(() => { const p = CPE.vals(CLB.c).sv.reach.people; return p[p.length - 1].year; });
  check(kjReach === 0 && reachOpen === false && chipY === '1973', `How it reaches your three is a closed disclosure, shown only within two steps, and the chip says the story’s year (${chipY})`);
  await hs.evaluate(() => CLB.c.setState({ sid: 'st-kjohnson-1958-langley', sstack: [] })); await hs.waitForTimeout(400);
  const ib = await hs.evaluate(() => { const b = document.querySelector('[data-bridge="story-draft"] [data-bridge="draft-info"]'), r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), b.getAttribute('aria-expanded')]; });
  const why1 = await hs.locator('[data-bridge="draft-why"]').innerText().catch(() => '');
  check(ib.join() === '44,44,true' && why1 === 'Written from memory. Bret reads it against the source, the NASA oral-history interviews, before it is sent, so every detail you repeat holds.',
    `the first draft Maya meets says what a recall draft is, open, with a 44px info button (${ib.join('×')})`);
  await hs.evaluate(() => CLB.c.setState({ overlay: 'story', sid: 's-B6-zaha-hadid', sctx: {}, sstack: [] })); await hs.waitForTimeout(400);
  const why2a = await hs.locator('[data-bridge="draft-why"]').count();
  await hs.locator('[data-bridge="story-draft"] [data-bridge="draft-info"]').tap(); await hs.waitForTimeout(250);
  check(why2a === 0 && /^Written from memory\. Bret reads it against /.test(await hs.locator('[data-bridge="draft-why"]').innerText().catch(() => '')), 'the next draft folds the line, and the info button opens it');
  await hs.locator('[data-bridge="story-check"]').tap(); await hs.waitForTimeout(300);
  const askedT = await hs.locator('[data-screen-label="M7 Story"]').innerText();
  check(/Asked\. Bret has it\.\n+You will see it here once Bret has checked it\./.test(askedT) && !/\b(today|tomorrow|Monday|Tuesday|Wednesday|Thursday|Friday|within)\b/.test(askedT.split('Asked. Bret has it.')[1].split(/\n+/).slice(0, 2).join(' ')), 'after the ask, the button says Bret has it and promises no day');
  await hs.evaluate(() => CLB.c.setState({ overlay: null, tab: 'you' })); await hs.waitForTimeout(300);
  check(/Waiting for Bret’s check/.test(await hs.locator('[data-screen-label="M11 You"]').innerText()), 'You shows the ask as waiting for Bret’s check');
  // every story: its page, its own chip and its life's card give one year, and no body opens with its dateline
  const years = await hs.evaluate(async () => {
    const tick = () => new Promise((ok) => setTimeout(ok, 0)), bad = []; let n = 0, chips = 0;
    for (const sid of Object.keys(CPD.story)) {
      CLB.c.setState({ overlay: 'story', sid, sctx: {}, sstack: [] }); await tick();
      const v = CPE.vals(CLB.c).sv, s = CLB.lib.story[CLC.resolve(CLB.lib, sid)], card = CLC.storyCard(CLB.lib, s); n++;
      const chip = v.hasReach ? v.reach.people[v.reach.people.length - 1].year : null; if (chip) chips++;
      if (CLC.oneYear(v.place, s.year).clash || (chip && chip !== CLC.yearLabel(s.year)) || CLC.oneYear(card.place, s.year).clash || (v.place && String(v.moment).toLowerCase().startsWith(String(s.placeAsWritten || v.place).toLowerCase()))) bad.push(sid);
    }
    CLB.c.setState({ overlay: null }); return { n, chips, bad };
  });
  check(years.n === 531 && years.chips > 300 && !years.bad.length, `every story (${years.n}) gives one year on its page, its chip (${years.chips}) and its life card, and no body opens with its dateline${years.bad.length ? ': ' + years.bad.slice(0, 5).join(', ') : ''}`);
  await hs.close();

  console.log('one answer per member and week');
  // the line, its Details and the Ask reply give one story ready now; no two buttons in a row name different stories
  // alike; every title on Review is one story's; and the plan's checks send nothing
  const q4 = await browser.newPage({ viewport: { width: 1920, height: 1000 } });
  watch(q4, 'one answer');
  await q4.goto(BASE + '/constellation'); await q4.waitForFunction(() => window.CLB && CLB.ready && CLB.c, null, { timeout: 20000 });
  const one = [];
  for (const persona of ['Sarah', 'Maya', 'Michael']) {
    await q4.locator('button', { hasText: persona + ',' }).first().click(); await q4.waitForTimeout(300);
    await q4.click('button[title^="10 ·"]'); await q4.waitForTimeout(400);
    one.push(...await q4.evaluate(async () => {
      const tick = () => new Promise((ok) => setTimeout(ok, 40)), out = [];
      CLB.c.setState({ role: 'coach', c: 'C3', cnotif: null, rvAll: false }); await tick();
      const mids = CPE.vals(CLB.c).rq.rows.map((r) => r.mid), mm = Object.assign({}, CLB.c.state.msgs), q = (mid) => CLB.lib.members[mid].ask1 || CLB.lib.members[mid].up19.label;
      mids.forEach((mid) => { const sit = CLB.lib.sit[CLB.lib.members[mid].up19.sit]; mm[mid] = (mm[mid] || []).concat([{ id: 'one-' + mid, from: 'member', kind: 'ask', body: q(mid), chip: sit.chip, day: 18, at: 'Sun 18 Oct, 11:40', live: true }]); });
      CLB.c.setState({ msgs: mm }); await tick();
      for (const mid of mids) {
        const asked = {}; asked[mid] = q(mid);
        CLB.c.setState({ c: 'C3', rvOpen: mid, rvAsked: asked }); await tick();
        const r = CPE.vals(CLB.c).rq.rows.find((x) => x.mid === mid), cards = (r.q && r.q.res && r.q.res.cards) || [];
        CLB.c.setState({ c: 'C8', thread: mid }); await tick();
        const m = ((CPE.vals(CLB.c).msg || {}).list || []).find((x) => x.id === 'one-' + mid);
        out.push({ mid, line: r.ready ? r.ready.id : null, details: cards[0] && cards[0].label === 'Ready now' ? cards[0].id : null, reply: m && m.reply ? m.reply.id : null,
          sends: (r.act && /^Send /.test(r.act.label) ? [[r.act.label, r.ready.id]] : []).concat(cards.filter((k) => k.swap).map((k) => [k.sendLabel, k.id])),
          titles: [r.ready && [r.ready.title, r.ready.id], r.fill && [r.fill.title, r.fill.id]].filter(Boolean).concat(cards.map((k) => [k.title, k.id])) });
      }
      CLB.c.setState({ c: 'C3', rvOpen: null, planAll: true }); await tick();
      const plan = CPE.vals(CLB.c).rq.plan, cardsP = [];
      for (const it of (plan && plan.items) || []) { CLB.c.setState({ planOpen: it.id }); await tick(); const c0 = CPE.vals(CLB.c).rq.plan.items.find((x) => x.id === it.id).card; cardsP.push(c0 ? c0.sendLabel + (c0.both ? '+only' : '') : 'none'); }
      const planBtns = [...document.querySelectorAll('[data-bridge="review-plan"] button')].map((b) => b.innerText.trim());
      CLB.c.setState({ planOpen: null, planAll: false });
      if (plan) out.push({ mid: 'plan', titles: plan.items.map((it) => [it.title, it.id]), cardsP, planBtns });
      return out;
    }));
  }
  const rows4 = one.filter((x) => x.mid !== 'plan'), agree = rows4.filter((x) => x.line === x.details && x.details === x.reply);
  check(rows4.length === 6 && agree.length === 6 && rows4.some((x) => x.line), `the line, Details and the Ask reply offer the same story ready now, for all six members (${rows4.map((x) => x.mid + ':' + [x.line, x.details, x.reply].join('/')).join('; ')})`);
  const clashes = rows4.filter((x) => { const by = {}; x.sends.forEach(([l, id]) => { (by[l] = by[l] || new Set()).add(id); }); return Object.values(by).some((v) => v.size > 1); });
  check(!clashes.length && rows4.some((x) => x.sends.length), `no two buttons in a row share a label while naming different stories${clashes.length ? ' (' + clashes.map((x) => x.mid).join(', ') + ')' : ''}`);
  const byTitle = {}; one.forEach((x) => x.titles.forEach(([t, id]) => { (byTitle[t] = byTitle[t] || new Set()).add(id); }));
  const twice = Object.keys(byTitle).filter((t) => byTitle[t].size > 1);
  check(Object.keys(byTitle).length > 5 && !twice.length, `every story title on Review names one story${twice.length ? ' (' + twice.join('; ') + ')' : ''}`);
  const planP = one.filter((x) => x.mid === 'plan');
  check(planP.some((x) => x.cardsP.length) && planP.every((x) => x.cardsP.every((l) => l === 'Mark it checked') && !x.planBtns.some((b) => /Send|Checked only/.test(b))), `no plan card offers a send (${planP.map((x) => x.cardsP.length).join(', ')} cards)`);
  await q4.close();

  console.log('the 18:00 manifest');
  // Review opens on what goes at 18:00, in the queue's own flow: nothing covers a button at either laptop size, each line
  // leads with its row of the manifest, every action on offer changes that outcome, Undo puts the line back exactly,
  // and the type reads at 16px
  for (const [w, h] of [[1440, 900], [1024, 768]]) {
    const mf = await browser.newPage({ viewport: { width: w, height: h } });
    watch(mf, 'manifest ' + w);
    await mf.goto(BASE + '/constellation'); await mf.waitForFunction(() => window.CLB && CLB.ready && CLB.c, null, { timeout: 20000 });
    await mf.evaluate(() => document.querySelector('button[title^="10 ·"]').click()); await mf.waitForTimeout(600);
    const lay = await mf.evaluate(() => {
      const q = document.querySelector('[data-screen-label="C3 Review queue"]'), man = q.querySelector('[data-bridge="review-manifest"]');
      let box = q; while (box && !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) box = box.parentElement;
      const v = box.getBoundingClientRect(), top = Math.max(0, v.top), bot = Math.min(innerHeight, v.bottom), seen = [], covered = [];
      q.querySelectorAll('button').forEach((b) => { const r = b.getBoundingClientRect(); if (!r.width || r.top < top || r.bottom > bot) return; const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); seen.push(b.innerText.trim()); if (!b.contains(t)) covered.push(b.innerText.trim() + ' under ' + ((t && t.innerText) || '').slice(0, 30)); });
      const rows = [...man.querySelectorAll('[data-mid]')].map((x) => [x.getAttribute('data-mid'), x.innerText]);
      const lines = Object.fromEntries(CPE.vals(CLB.c).rq.rows.map((r) => [r.mid, [...q.querySelectorAll('[data-bridge="review-line"]')].find((l) => l.innerText.includes(r.name)).querySelector('[data-bridge="review-outcome"]').innerText]));
      return { seen, covered, flow: getComputedStyle(man).position, notice: CPE.vals(CLB.c).cn.show, head: man.innerText.split('\n')[0], rows, lines };
    });
    const leads = lay.rows.filter(([mid, t]) => (lay.lines[mid] || '').endsWith(t.replace(/^[^·]+ · /, '')));
    const away = await mf.evaluate(() => { CLB.c.setState({ c: 'C8' }); const s = CPE.vals(CLB.c).cn.show; CLB.c.setState({ c: 'C3' }); return s; }); await mf.waitForTimeout(200);
    check(lay.seen.includes('All members') && !lay.covered.length && lay.flow === 'static' && lay.notice === false && away === false,
      `${w}×${h}: Review shows the 18:00 manifest in its flow, in place of the notice (which stays read on the next screen), and nothing covers a button (${lay.seen.length} on screen${lay.covered.length ? '; covered: ' + lay.covered.join(', ') : ''})`);
    if (w !== 1440) { await mf.close(); continue; }
    check(lay.head === 'At 18:00 today' && lay.rows.length === 4 && leads.length === 4 && /^Priya · Barack Obama, Chicago 2008$/.test(lay.rows[0][1]) && lay.rows.some(([m, t]) => m === 'david' && t === 'David · Nothing yet. Waits for your check.') &&
      lay.rows.some(([m, t]) => m === 'sarah' && /^Sarah · Nothing yet\. Barack Obama, Cambridge 1990 is a recall draft, and Sarah had Barack Obama on 12 Oct\.$/.test(t)), `the manifest says what goes to whom at 18:00 today, and each line leads with its own row (${lay.rows.map((r) => r[1]).join(' / ')})`);
    // every action on offer: the line's own (a send; a check, then its send), and Hold in Details; each changes the line's
    // outcome, and Undo restores review[mid] exactly
    await mf.route('**/api/constellation/state/ledger', (rt) => rt.request().method() === 'POST' ? rt.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }) : rt.continue());
    const outc = (mid) => mf.evaluate((mid) => { const r = CPE.vals(CLB.c).rq.rows.find((x) => x.mid === mid); return r.lead; }, mid);
    const rvOf = (mid) => mf.evaluate((mid) => JSON.stringify(CLB.c.state.review[mid] === undefined ? null : CLB.c.state.review[mid]), mid);
    const line = (n) => mf.locator('[data-bridge="review-line"]', { hasText: n });
    const acts = await mf.evaluate(() => CPE.vals(CLB.c).rq.rows.map((r) => [r.mid, r.name, r.act ? r.act.label : '']));
    const done = [];
    for (const [mid, name, label] of acts) {
      if (!/^(Send .+|Check|Approve)$/.test(label)) { done.push(mid + ':' + label + ' (opens a page)'); continue; }
      const b0 = await rvOf(mid), o0 = await outc(mid), fid = await mf.evaluate((mid) => (CPE.vals(CLB.c).rq.rows.find((x) => x.mid === mid).fill || {}).id, mid);
      await line(name).locator('button', { hasText: label }).first().click(); await mf.waitForTimeout(300);
      if (label === 'Check') { const cc = mf.locator('[data-bridge="check-card"]').first(); await cc.locator('input').fill('Read against the source, e2e'); await mf.waitForTimeout(120); await cc.locator('button').first().click(); await mf.waitForTimeout(600); }
      const o1 = await outc(mid), un = await line(name).locator('[data-bridge="review-undo"]').count();
      if (un) { await line(name).locator('[data-bridge="review-undo"]').click(); await mf.waitForTimeout(300); }
      done.push({ mid, label, changed: o1 !== o0, un, back: (await rvOf(mid)) === b0, o0, o1 });
      if (label === 'Check' && fid) { await mf.evaluate((sid) => window.postMessage({ type: 'cl:unverified', story: sid }, location.origin), fid); await mf.waitForTimeout(300); }
    }
    const priya = await (async () => {
      const b0 = await rvOf('priya'), o0 = await outc('priya');
      await line('Priya Raman').locator('button', { hasText: 'Details' }).click(); await mf.waitForTimeout(300);
      const btns = await mf.evaluate(() => CPE.vals(CLB.c).rq.rows.find((x) => x.mid === 'priya').btns.map((b) => b.label));
      await mf.evaluate(() => CPE.vals(CLB.c).rq.rows.find((x) => x.mid === 'priya').btns.find((b) => b.label === 'Hold').go()); await mf.waitForTimeout(300);
      const o1 = await outc('priya');
      await line('Priya Raman').locator('[data-bridge="review-undo"]').click(); await mf.waitForTimeout(300);
      return { btns, changed: o1 !== o0, o1, back: (await rvOf('priya')) === b0 && (await outc('priya')) === o0 };
    })();
    const ok = done.filter((x) => typeof x === 'object');
    check(ok.length >= 2 && ok.every((x) => x.changed && x.un && x.back) && priya.changed && priya.back && priya.o1 === 'Held. Nothing goes to Priya this week.' && !priya.btns.includes('Approve'),
      `every action on offer changes its line's outcome, and Undo restores review[mid] exactly (${ok.map((x) => x.mid + ': ' + x.label + ' → ' + x.o1).join('; ')}; Priya: Hold → ${priya.o1}; ${done.filter((x) => typeof x === 'string').join(', ')})`);
    await mf.evaluate(() => CLB.c.setState({ rvOpen: null, fillOpen: null })); await mf.waitForTimeout(300);
    const type = await mf.evaluate(() => {
      const q = document.querySelector('[data-screen-label="C3 Review queue"]'), all = [], tw = document.createTreeWalker(q, NodeFilter.SHOW_TEXT); let n;
      while ((n = tw.nextNode())) { const t = n.textContent.trim(), el = n.parentElement; if (!t || !el.getBoundingClientRect().width) continue; const fs = parseFloat(getComputedStyle(el).fontSize); for (let i = 0; i < t.length; i++) all.push(fs); }
      all.sort((a, b) => a - b); return { median: all[all.length >> 1], n: all.length, words: [CPE.vals(CLB.c).countdown, (q.querySelector('[data-bridge="review-explain"]') || {}).innerText] };
    });
    check(type.median >= 16 && type.words[0] === 'Sends in 6 hours' && type.words[1] === 'Anything you leave goes out today at 18:00, in each member’s own time, unless you hold it.',
      `Review reads at a median of ${type.median}px over ${type.n} characters, and says the time in words: "${type.words.join('" and "')}"`);
    await mf.evaluate(() => CLB.c.setState({ swapFor: 'priya', swapHero: 'all' })); await mf.waitForTimeout(300);
    const sw = await mf.locator('[data-screen-label="C3 Swap panel"]').innerText(), dead = await mf.evaluate(() => CPE.vals(CLB.c).rq.rows.reduce((n, r) => n + (r.btns || []).filter((b) => b.dis).length, 0));
    check(!/Verified/.test(sw) && /· Checked/.test(sw) && !dead, `the Swap panel says Checked, one name for a checked story, and no line offers a button that cannot be pressed (${dead})`);
    await mf.close();
  }

  console.log('one coach’s world');
  // each line meets at the member's own time, whichever persona is open; a moved check-in moves only its member's line;
  // Messages lists the console coach's own members, the rest read only; the question is prefilled for the week's room
  const cw = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watch(cw, 'one coach');
  await cw.goto(BASE + '/constellation'); await cw.waitForFunction(() => window.CLB && CLB.ready && CLB.c, null, { timeout: 20000 });
  const world = [];
  for (const persona of ['Sarah', 'Maya', 'Michael']) {
    await cw.locator('button', { hasText: persona + ',' }).first().click(); await cw.waitForTimeout(300);
    await cw.evaluate(() => document.querySelector('button[title^="10 ·"]').click()); await cw.waitForTimeout(400);
    world.push(await cw.evaluate(async () => {
      const tick = () => new Promise((ok) => setTimeout(ok, 40)), L = CLB.lib, st = () => CLB.c.state, cc = L.members[st().p].coach;
      const hm = (x) => { const m = /^(\w{3}) \d+ \w{3}, (\d\d:\d\d)$/.exec(x || ''); return m ? 'You meet ' + m[1] + ' ' + m[2] : 'No check-in booked'; };
      CLB.c.setState({ role: 'coach', c: 'C3', rvAll: true, cnotif: null }); await tick();
      const meet = CPE.vals(CLB.c).rq.rows.map((r) => [r.mid, r.when, hm(L.members[r.mid].next)]);
      CLB.c.setState({ c: 'C8', msgAll: false, thread: st().p }); await tick();
      const name2mid = Object.fromEntries(Object.values(L.members).map((m) => [m.name, m.id || Object.keys(L.members).find((k) => L.members[k] === m)]));
      const owners = CPE.vals(CLB.c).msg.threads.map((t) => L.members[name2mid[t.name]].coach);
      CLB.c.setState({ msgAll: true }); await tick();
      const allN = CPE.vals(CLB.c).msg.threads.length, other = Object.keys(L.members).find((k) => L.members[k].coach !== cc);
      CLB.c.setState({ thread: other }); await tick();
      const ro = { compose: getComputedStyle(document.querySelector('[data-bridge="msg-compose"]')).display, send: !!document.querySelector('[data-bridge="msg-head"]'), reply: document.querySelectorAll('[data-bridge="ask-reply"],[data-bridge="ask-find"]').length, note: CPE.vals(CLB.c).msg.readOnly };
      CLB.c.setState({ c: 'C3', rvAll: false, msgAll: false, thread: st().p, rvOpen: st().p }); await tick();
      const ask = CPE.vals(CLB.c).rq.rows.find((r) => r.mid === st().p).q.text;
      CLB.c.setState({ rvOpen: null }); await tick();
      return { p: st().p, cc, meet, owners, allN, ro, ask };
    }));
  }
  const offMeet = world.flatMap((x) => x.meet.filter(([, a, b]) => a !== b).map(([m, a, b]) => x.p + '/' + m + ': ' + a + ' ≠ ' + b));
  check(world.length === 3 && world.every((x) => x.meet.length === 6) && !offMeet.length, `every line meets at the member's own time (M.next), whichever persona is open${offMeet.length ? ': ' + offMeet.join('; ') : ''}`);
  check(world.every((x) => x.owners.length && x.owners.every((o) => o === x.cc) && x.allN === 6 && x.ro.compose === 'none' && !x.ro.send && !x.ro.reply && /coaches .+\. You can read this thread\./.test(x.ro.note)),
    `Messages lists only the console coach's members (${world.map((x) => x.p + ': ' + x.owners.length).join(', ')}); All members adds the rest, read only`);
  const ask3 = Object.fromEntries(world.map((x) => [x.p, x.ask]));
  check(/^The Calder Foods pitch is Thursday/.test(ask3.michael) && /^I’m announcing the reorg/.test(ask3.sarah) && /^The roadmap review/.test(ask3.maya),
    `the question is prefilled for the week's room: the member's own words only when they are about it (${Object.values(ask3).join(' | ')})`);
  // a member who moves their check-in moves their own line, and no one else's
  await cw.evaluate(() => { CLB.c.setState({ role: 'member', m: 'app', overlay: 'thread' }); }); await cw.waitForTimeout(300);
  await cw.evaluate(() => CPE.vals(CLB.c).th.list.find((x) => x.isCheckin).slots[1].pick()); await cw.waitForTimeout(200);
  const movedT = await cw.evaluate(() => { CLB.c.setState({ role: 'coach', c: 'C3', rvAll: true, overlay: null }); return CPE.vals(CLB.c).rq.rows.map((r) => r.mid + ' ' + r.when); });
  check(movedT.includes('michael You meet Tue 16:00') && movedT.includes('sarah You meet Tue 10:00') && movedT.includes('maya You meet Tue 11:00'), `a moved check-in moves only its member's line (${movedT.join(', ')})`);
  await cw.close();

  console.log('round six: what the coach does is what goes');
  // every check in the plan, every check on a line, Checked only and Undo, measured against all six lines (the ledger's
  // POST answered here, so the server's record stays as it was for the pages after)
  const r6 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watch(r6, 'round six');
  let r6posts = 0;
  await r6.route('**/api/constellation/state/ledger', (rt) => { if (rt.request().method() !== 'POST') return rt.continue(); r6posts++; return rt.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
  await r6.goto(BASE + '/constellation'); await r6.waitForFunction(() => window.CLB && CLB.ready && CLB.c, null, { timeout: 20000 });
  await r6.evaluate(() => document.querySelector('button[title^="10 ·"]').click()); await r6.waitForTimeout(400);
  const acts = await r6.evaluate(async () => {
    const tick = (ms) => new Promise((ok) => setTimeout(ok, ms || 60)), S = (p) => CLB.c.setState(p), V = () => CPE.vals(CLB.c);
    S({ role: 'coach', c: 'C3', rvAll: true, rvOpen: null, cnotif: null }); await tick(200);
    const leads = () => Object.fromEntries(V().rq.every.map((r) => [r.mid, r.lead]));
    const unverify = async (sid) => { window.postMessage({ type: 'cl:unverified', story: sid }, location.origin); await tick(200); };
    const note = async (sid) => { const m = Object.assign({}, CLB.c.state.checkNote); m[sid] = 'Read against the source.'; S({ checkNote: m }); await tick(); };
    const base = JSON.stringify(leads()), out = { plan: [], david: {}, priya: {} };
    // CM-01: no plan check changes what goes this week, on any line
    S({ planAll: true }); await tick(150);
    for (const it of ((V().rq.plan || {}).items || []).map((x) => x.id)) {
      S({ planOpen: it }); await tick(); await note(it);
      const card = (V().rq.plan.items.find((x) => x.id === it) || {}).card; if (!card) continue;
      card.send(); await tick(400);
      out.plan.push(JSON.stringify(leads()) === base ? 'same' : it); S({ planOpen: null }); await unverify(it);
    }
    S({ planAll: false }); await tick();
    // CM-06: Checked only records the check and sends nothing; CM-05: Undo after a check and send puts back what goes
    const fid = V().rq.every.find((r) => r.mid === 'david').fill.id;
    S({ rvOpen: 'david', fillOpen: 'david' }); await tick(); await note(fid);
    V().rq.every.find((r) => r.mid === 'david').fill.card.only(); await tick(400);
    out.david.only = [V().rq.every.find((r) => r.mid === 'david').lead, CLB.c.state.ctoast];
    await unverify(fid); S({ rvOpen: 'david', fillOpen: 'david' }); await tick(); await note(fid);
    V().rq.every.find((r) => r.mid === 'david').fill.card.send(); await tick(400);
    out.david.sent = V().rq.every.find((r) => r.mid === 'david').lead;
    V().rq.every.find((r) => r.mid === 'david').undo(); await tick(300);
    out.david.undone = V().rq.every.find((r) => r.mid === 'david').lead;
    await unverify(fid);
    // CM-02: a check and send on Priya's line names the other line it readies, and sends nothing there
    S({ rvOpen: 'priya', swapFor: 'priya', swapHero: 'all', review: {}, rvUndo: [] }); await tick(200);
    const ex = (V().sp.excluded || []).findIndex((e) => e.draft && /Golda Meir/.test(e.eyebrow || '') && /^Check/.test(e.goLabel || ''));
    if (ex >= 0) {
      V().sp.excluded[ex].go(); await tick(); const sid = String(CLB.c.state.fillOpen || '').replace(/^swap:/, ''); await note(sid);
      V().sp.excluded[ex].card.send(); await tick(400);
      out.priya = { priya: V().rq.every.find((r) => r.mid === 'priya').lead, david: V().rq.every.find((r) => r.mid === 'david').lead, toast: CLB.c.state.ctoast };
      await unverify(sid);
    }
    return out;
  });
  check(acts.plan.length >= 5 && acts.plan.every((x) => x === 'same'), `no check in the plan changes what goes this week, on any of the six lines (${acts.plan.length} checks${acts.plan.filter((x) => x !== 'same').length ? '; changed by ' + acts.plan.filter((x) => x !== 'same').join(', ') : ''})`);
  check(/^Nothing yet\. Waits for you to send /.test(acts.david.only[0]) && /is ready to send\.$/.test(acts.david.only[1] || ''), `Checked only records the check and sends nothing (${acts.david.only.join(' | ')})`);
  check(/^At 18:00 today · /.test(acts.david.sent) && /^Nothing yet\./.test(acts.david.undone), `Undo after a check and send puts back what goes at 18:00 (${acts.david.sent} → ${acts.david.undone})`);
  check(/^At 18:00 today · Golda Meir/.test(acts.priya.priya || '') && !/^At 18:00/.test(acts.priya.david || '') && /David/.test(acts.priya.toast || ''), `a check on Priya’s line sends nothing on David’s, and the toast names him (${acts.priya.toast})`);
  // CM-04: after Sunday 18:00 the week is a record: no line sends, holds, approves or checks
  await r6.evaluate(() => document.querySelector('button[title^="11 ·"]').click()); await r6.waitForTimeout(400);
  const rec = await r6.evaluate(async () => { CLB.c.setState({ role: 'coach', c: 'C3', rvAll: true }); await new Promise((ok) => setTimeout(ok, 150)); const v = CPE.vals(CLB.c);
    return { head: v.rq.manifest.head, live: v.rq.every.filter((r) => (r.btns || []).length || r.fill || (r.act && /^(Send|Approve|Check)/.test(r.act.label || ''))).map((r) => r.mid) }; });
  check(rec.head === 'Sent on Sunday at 18:00' && !rec.live.length, `after 18:00 on Sunday the week is a record, with nothing on a line to send or check${rec.live.length ? ' (' + rec.live.join(', ') + ')' : ''}`);
  // and a check made after 18:00, in the plan (which takes up the waiting drafts after Sunday) or from the Library, does
  // not rewrite why nothing went
  const rec2 = await r6.evaluate(async () => {
    const tick = (ms) => new Promise((ok) => setTimeout(ok, ms || 80)), S = (p) => CLB.c.setState(p), V = () => CPE.vals(CLB.c);
    const leads = () => JSON.stringify(Object.fromEntries(V().rq.every.map((r) => [r.mid, r.lead]))), base = leads(), changed = [];
    const unverify = async (sid) => { window.postMessage({ type: 'cl:unverified', story: sid }, location.origin); await tick(200); };
    S({ planAll: true }); await tick(150);
    const ids = ((V().rq.plan || {}).items || []).map((x) => x.id);
    for (const it of ids) {
      S({ planOpen: it }); await tick(); const m = Object.assign({}, CLB.c.state.checkNote); m[it] = 'Read against the source.'; S({ checkNote: m }); await tick();
      const card = (V().rq.plan.items.find((x) => x.id === it) || {}).card; if (!card) continue;
      card.send(); await tick(400); if (leads() !== base) changed.push(it); S({ planOpen: null }); await unverify(it);
    }
    S({ planAll: false });
    window.postMessage({ type: 'cl:verified', story: 's-C1-billie-jean-king', entry: { by: 'jim', note: 'Read against the source.' } }, location.origin); await tick(300);
    const david = V().rq.every.find((r) => r.mid === 'david').lead; await unverify('s-C1-billie-jean-king');
    return { n: ids.length, changed, david, same: leads() === base };
  });
  check(rec2.n >= 3 && !rec2.changed.length && rec2.david === 'Nothing went. It waited for your check.' && rec2.same, `after 18:00, ${rec2.n} plan checks and a Library check leave the week's record as it was (${rec2.david}${rec2.changed.length ? '; changed by ' + rec2.changed.join(', ') : ''})`);
  // CM-08, CM-09, FE-01, FE-06: prep and its recap are this member's own; a hero a member added says who added it
  const prep = await r6.evaluate(async () => {
    const tick = () => new Promise((ok) => setTimeout(ok, 200)), out = {};
    for (const who of ['Sarah', 'Maya', 'Michael']) {
      CPE.vals(CLB.c).personas.find((x) => x.label.startsWith(who)).go(); await tick();
      document.querySelector('button[title^="11 ·"]').click(); await tick();
      CLB.c.setState({ role: 'coach', c: 'C7', cm: CLB.c.state.p, ciNotes: '' }); await tick();
      const root = document.querySelector('[data-screen-label="Coach console"]');
      out[who] = { text: root.innerText, talk: [...root.querySelectorAll('textarea, input')].map((e) => e.value).filter(Boolean) };
      CPE.vals(CLB.c).ci.send(); await tick();
      const l = CLB.c.state.msgs[CLB.c.state.p]; out[who].recap = l[l.length - 1].body;
    }
    return out;
  });
  check(/Shonda Rhimes · added by Maya · no checked story yet/.test(prep.Maya.text) && /Dawn Staley · added by Sarah · no checked story yet/.test(prep.Sarah.text) && !/verified/i.test(prep.Maya.text + prep.Sarah.text),
    'check-in prep says which member added a hero, and says checked');
  check(prep.Sarah.talk.includes('Did Dan get the account in the room? Nothing is marked yet.') && prep.Maya.talk.some((t) => /^Simone Biles has one recall draft and no checked story yet\. Check it, or choose another\./.test(t)),
    `prep's talking points are read from the record (${prep.Maya.talk[1]})`);
  // FE-06: every talking point names the member, never a pronoun read from a name, and a point about the week ahead is
  // about the member's own room (Michael's is the Calder pitch, not David's Ardent); the steps carry curly apostrophes
  const talkAll = ['Sarah', 'Maya', 'Michael'].flatMap((w) => prep[w].talk);
  check(talkAll.length >= 9 && !talkAll.some((t) => /\b(she|he|his|her|him)\b/i.test(t)) && prep.Michael.talk.includes('Who at the Calder pitch should hear Michael\u2019s name first?') && /Take the client\u2019s first question yourself\./.test(prep.Michael.text) && !/client's|they'd/.test(prep.Michael.text),
    `prep's talking points name the member and their own room (${prep.Michael.talk.join(' | ')})`);
  check(/^Recap from our check-in\. Thanks for today\. We agreed: /.test(prep.Maya.recap) && /roadmap/.test(prep.Maya.recap) && !/Dan|reorg/.test(prep.Maya.recap), `the recap is built from this member’s own week (${prep.Maya.recap})`);
  // CM-10: Find and send writes only to the console coach's members
  const toNames = await r6.evaluate(async () => { CPE.vals(CLB.c).personas.find((x) => x.label.startsWith('Sarah')).go(); await new Promise((ok) => setTimeout(ok, 200)); CLB.c.setState({ role: 'coach', c: 'C4' }); await new Promise((ok) => setTimeout(ok, 200));
    return [...document.querySelectorAll('[data-screen-label="C4 Library"] button')].map((b) => b.innerText.trim()).filter((t) => /^(Sarah|Maya|Michael|David|Priya|Tom)$/.test(t)); });
  check(toNames.length && !toNames.some((t) => /^(Maya|Michael)$/.test(t)), `Find and send offers only Jim’s members (${toNames.join(', ')})`);
  // FF-1, CM-07: the member's week gives the manifest's reason
  const why9 = await r6.evaluate(async () => { const tick = () => new Promise((ok) => setTimeout(ok, 250));
    CPE.vals(CLB.c).personas.find((x) => x.label.startsWith('Maya')).go(); await tick(); document.querySelector('button[title^="9 ·"]').click(); await tick();
    CLB.c.setState({ role: 'member', m: 'app', tab: 'week', overlay: null }); await tick();
    return (document.querySelector('[data-screen-label="M6 This week"]') || document.body).innerText; });
  check(/Your story comes once Bret has checked one\./.test(why9) && !/chose to wait|is looking for one/.test(why9), 'Maya’s week says what Bret’s Review says: her story waits for his check');
  // S2: a check made in the coach's Library tab reaches the app at once, though Review is pressed before its POST returns
  const xc = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watch(xc, 'library check');
  let xPosted = 0;
  await xc.route('**/api/constellation/state/ledger', async (rt) => { if (rt.request().method() !== 'POST') return rt.continue(); xPosted++; await new Promise((ok) => setTimeout(ok, 1500)); try { await rt.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); } catch (e) {} });
  await xc.goto(BASE + '/constellation'); await xc.waitForFunction(() => window.CLB && CLB.ready && CLB.c, null, { timeout: 20000 });
  await xc.evaluate(() => { localStorage.removeItem('cl-ledger'); document.querySelector('button[title^="10 ·"]').click(); }); await xc.waitForTimeout(400);
  await xc.evaluate(() => CLB.c.setState({ role: 'coach', c: 'CX', cm: 'david', cxRoute: '#/story/s-C1-billie-jean-king' }));
  let xf; for (let i = 0; i < 400; i++) { xf = xc.frames().find((x) => /library/.test(x.url())); if (xf && await xf.evaluate(() => !!document.querySelector('[data-act="verify"]')).catch(() => false)) break; await xc.waitForTimeout(25); }
  await xf.fill('[name=note]', 'Read against the source.'); await xf.click('[data-act="verify"]'); await xc.waitForTimeout(150);
  await xc.evaluate(() => CLB.c.setState({ c: 'C3' })); await xc.waitForTimeout(2300);
  const xs = await xc.evaluate(() => ({ engine: CPD.story['s-C1-billie-jean-king'].verified, lib: CLB.lib.story['s-C1-billie-jean-king'].verified, line: (CPE.vals(CLB.c).rq.every.find((r) => r.mid === 'david') || {}).outcome }));
  check(xPosted === 1 && xs.engine && xs.lib && /^Nothing yet\. Waits for you to send Billie Jean King\.$/.test(xs.line), `a check in the coach’s Library tab is in the app at once, and Review offers its send (${xs.line})`);
  await xc.evaluate(() => localStorage.removeItem('cl-ledger'));
  await xc.close();
  // FE-02: a member reads a translation only where the note names a published one, and never a working note
  const tr = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  watch(tr, 'translation');
  const trOf = async (id) => { await tr.goto(`${BASE}/constellation/library?as=member&m=maya#/story/${id}`); await tr.waitForSelector('main h1'); return (await tr.locator('main').innerText()).split('\n').filter((l) => /^Translation:/.test(l)); };
  const trM = await trOf('s-B2-henri-matisse'), trC = await trOf('s-A1-catherine-the-great');
  check(trM.join() === 'Translation: Jack Flam, Matisse on Art (revised edition, 1995)' && !trC.length, `a member reads a published translation, and no working note (${trM.join()})`);
  await tr.close();
  // FF-2, FF-6: Michael's week carries no note written for another story; his Ask says which hero has a draft waiting
  const mk = await browser.newPage({ viewport: { width: 1920, height: 1100 } });
  watch(mk, 'michael');
  await mk.route('**/api/constellation/state/ledger', (rt) => rt.request().method() === 'POST' ? rt.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }) : rt.continue());
  await mk.goto(BASE + '/constellation'); await mk.waitForFunction(() => window.CLB && CLB.ready && CLB.c, null, { timeout: 20000 });
  await mk.locator('button', { hasText: 'Michael,' }).first().click(); await mk.waitForTimeout(400);
  await mk.click('button[title^="5 ·"]'); await mk.waitForTimeout(800);
  const mgap = mk.locator('[data-bridge="mv-gap"]'), mFirst = (await mgap.innerText()).split('\n').filter(Boolean)[2];
  await mgap.locator('button', { hasText: /^Check$/ }).first().click(); await mk.waitForTimeout(400);
  const mcard = mgap.locator('[data-bridge="check-card"]');
  await mcard.locator('input').fill('Read against the liner notes.'); await mk.waitForTimeout(150);
  await mcard.locator('button').first().click(); await mk.waitForTimeout(800);
  await mk.click('button[title^="6 ·"]'); await mk.waitForTimeout(800);
  const mw6 = await mk.locator('[data-screen-label="M6 This week"]').innerText();
  check(/^John Coltrane/.test(mFirst) && /John Coltrane/.test(mw6) && !/changed his name/i.test(mw6), 'Michael’s first week carries the Coltrane story Jennifer checked, with no note written for Ali');
  await mk.click('button[title^="9 ·"]'); await mk.waitForTimeout(500);
  const pre = await mk.evaluate(() => CLB.c.state.ask && CLB.c.state.ask.text);
  check(/^The Calder Foods pitch is Thursday/.test(pre || ''), `Michael’s Ask is prefilled for his own room (${pre})`);
  // FF-7: the clock and This week name the same room at step 9 as the Ask does
  const mStep = await mk.evaluate(() => document.querySelector('button[title^="9 ·"]').title);
  await mk.evaluate(() => CLB.c.setState({ tab: 'week', overlay: null, notif: null })); await mk.waitForTimeout(400);
  const mw9 = await mk.locator('[data-screen-label="M6 This week"]').innerText();
  check(mStep === '9 · Ask: the Calder Foods pitch' && /Thursday · Pitch to Calder Foods/.test(mw9) && !/Ardent/.test(mStep + mw9), `step 9 names Michael’s own room on the clock and on This week (${mStep})`);
  // FF-2: once Coltrane fills the first week, the week's step no longer sits on Ali's card
  await mk.evaluate(() => CLB.c.setState({ tab: 'heroes' })); await mk.waitForTimeout(400);
  const aliCard = await mk.evaluate(() => { const b = [...document.querySelectorAll('[data-screen-label="M13 Heroes"] > button')].find((x) => /Muhammad Ali/.test(x.innerText)); return b ? b.innerText : ''; });
  check(/Muhammad Ali/.test(aliCard) && !/Helps with/.test(aliCard), 'Ali’s card no longer helps with the week Coltrane’s story fills');
  // FF-6: the Ask's "how your three would walk in" names the hero whose draft waits for the week
  await mk.evaluate(() => CLB.c.setState({ tab: 'ask' })); await mk.waitForTimeout(400);
  const mAsk = mk.locator('[data-screen-label="M8 Ask"]');
  await mAsk.locator('button', { hasText: /^Ask$/ }).first().click(); await mk.waitForTimeout(800);
  await mAsk.locator('button').first().click(); await mk.waitForTimeout(1800);
  const mAns = await mAsk.innerText();
  check(/Muhammad Ali has a recall draft for this, waiting for Jennifer’s check\./.test(mAns) && /Michael Jordan and Barack Obama have no story for this yet\./.test(mAns) && !/Muhammad Ali, Michael Jordan and Barack Obama have no story/.test(mAns),
    'Michael’s Ask says Ali has a recall draft for the week, waiting for Jennifer’s check, and the other two have none');
  await mk.close();
  // FE-03: a story page reads one week for the member: the first of its situations that is one of theirs gives Why,
  // Others who lived this week and All of this week alike (Billie Jean King at Houston carries E2 first, Maya's E1 second)
  const ow = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  watch(ow, 'one week');
  await ow.goto(BASE + '/constellation'); await ow.waitForFunction(() => window.CLB && CLB.ready && CLB.c, null, { timeout: 20000 });
  await ow.evaluate(() => CPE.vals(CLB.c).personas.find((x) => /^Maya/.test(x.label)).go()); await ow.waitForTimeout(300);
  await ow.evaluate(() => CPE.vals(CLB.c).steps[5].go()); await ow.waitForTimeout(400);
  await ow.evaluate(() => CLB.c.setState({ notif: null, overlay: 'story', sid: 'st-bjk-1973-riggs', sctx: {}, sstack: [] })); await ow.waitForTimeout(500);
  const oneWk = await ow.evaluate(() => {
    const L = CLB.lib, s = L.story['st-bjk-1973-riggs'], mine = L.members.maya.sits.map((id) => L.sit[id].key), wk = s.keys.find((k) => mine.includes(k));
    const t = document.querySelector('[data-screen-label="M7 Story"]').innerText, rel = CPE.vals(CLB.c).sv.rel, g = rel.find((x) => /Others who lived/.test(x.label)) || { items: [] };
    const byTitle = (title) => { const [nm, pl] = title.split(' · '); return L.stories.find((x) => (L.icon[x.icon] || {}).name === nm && (!pl || String(x.place || '').split(',')[0] === pl.split(',')[0] || CLC.yearLabel(x.year) === pl)); };
    return { first: L.sitByKey[s.keys[0]].id, wk: wk && L.sitByKey[wk].id, why: (t.match(/It fits (?:your week|one of your weeks): [^\n]+/) || [''])[0], others: g.items.map((r) => { const o = byTitle(r.title); return o ? o.keys.includes(wk) : false; }) };
  });
  await ow.locator('[data-bridge="story-related"] button', { hasText: 'All of this week' }).tap(); await ow.waitForTimeout(400);
  const owRoute = await ow.evaluate(() => CLB.state().libRoute);
  check(oneWk.first !== oneWk.wk && oneWk.wk === 'E1' && oneWk.why === 'It fits one of your weeks: everything you do gets read as a signal.' && oneWk.others.length === 2 && oneWk.others.every(Boolean) && owRoute === '#/situation/E1',
    `one week per story page: Why, Others who lived this week and All of this week all take Maya’s ${oneWk.wk}, though the story’s first situation is ${oneWk.first} (${owRoute})`);
  await ow.close();

  console.log('the first story, from tables built while the app sat idle');
  {
    const ip = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    watch(ip, 'idle build');
    await ip.goto(BASE + '/constellation');
    await ip.waitForFunction(() => window.CLB && CLB.ready && CLB.c, null, { timeout: 20000 });
    await ip.evaluate(() => document.querySelector('button[title^="6 ·"]').click()); await ip.waitForTimeout(300);   // the pills sit in the Demo sheet on a phone
    await ip.evaluate(() => CLB.c.setState({ role: 'member', m: 'app', tab: 'week', overlay: null }));
    // the move vectors, the text vectors, all 22 situations' families and Sarah's chains, made in idle slices
    const built = await ip.waitForFunction(() => { const L = CLB.lib; return !!(L._mv && L._tx && Object.keys(L._mv.fam).length === 22 && L._bridge && L._bridge.size >= 70); }, null, { timeout: 20000, polling: 100 }).then(() => true, () => false);
    const r = await ip.evaluate(async () => {
      const L = CLB.lib, mv = L._mv, tx = L._tx, n0 = L._bridge.size;
      const b = [...document.querySelectorAll('[data-screen-label="M6 This week"] [role=button]')].find((x) => /one of your three/i.test(x.innerText) && x.getBoundingClientRect().width > 0);
      b.click(); await new Promise((ok) => requestAnimationFrame(() => setTimeout(ok, 50)));
      return { same: L._mv === mv && L._tx === tx && Object.keys(L._mv.fam).length === 22, grew: L._bridge.size - n0, overlay: CLB.c.state.overlay, rel: (document.querySelector('[data-bridge="story-related"]') || {}).innerText || '' };
    });
    check(built && r.same && r.grew === 0 && r.overlay === 'story' && /Others who lived this week/i.test(r.rel), `the first story Sarah opens reads tables the idle app built, and builds none (${built ? 'built' : 'not built'}, ${r.grew} new chains)`);
    // inside the app the Library's frame reads the same index: E1's families are there before it opens
    await ip.evaluate(() => { window.__e1 = CLB.lib._mv.fam[CLB.lib.sit.E1.key]; CLB.c.setState({ overlay: 'library', libRoute: '#/situation/E1', libBack: null, libDepth: 1 }); });
    await ip.waitForFunction(() => { const f = document.querySelector('[data-bridge="library-overlay"] iframe'); try { return f && f.contentWindow.location.hash === '#/situation/E1' && f.contentDocument.querySelector('main h1:not(.sr)'); } catch (e) { return false; } }, null, { timeout: 15000 });
    check(await ip.evaluate(() => { const f = document.querySelector('[data-bridge="library-overlay"] iframe'); return !!window.__e1 && CLB.lib._mv.fam[CLB.lib.sit.E1.key] === window.__e1 && f.contentWindow.CLN !== window.CLN && !!f.contentDocument.querySelector('#moves .mfam'); }), 'the in-app Library draws E1’s families from the app’s index, made before it opened');
    await ip.close();
  }

  console.log('one library for the session');
  {
    const op = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    watch(op, 'one library');
    await op.goto(BASE + '/constellation');
    await op.waitForFunction(() => window.CLB && CLB.ready && CLB.c, null, { timeout: 20000 });
    let corpusAsks = 0; op.on('request', (r) => { if (/\/data\/(corpus|demo)\.json/.test(r.url())) corpusAsks++; });
    await op.evaluate(() => CLB.c.setState({ role: 'member', m: 'app', tab: 'week', overlay: null })); await op.waitForTimeout(200);
    const lf = () => op.evaluate(() => { const f = document.querySelector('[data-bridge="library-overlay"] iframe'); return f && f.contentWindow; });
    const landed = (h) => op.waitForFunction((h) => { const f = document.querySelector('[data-bridge="library-overlay"] iframe'); try { return f && f.contentWindow.location.hash === h && f.contentDocument.querySelector('main h1') && CLB.c.state.libRoute === h; } catch (e) { return false; } }, h, { timeout: 15000 });
    const marked = () => op.evaluate(() => { const f = document.querySelector('[data-bridge="library-overlay"] iframe'); return !!(f && f.contentWindow.__kept); });
    const open = async (route, extra) => { await op.evaluate(([route, extra]) => CLB.c.setState(Object.assign({ overlay: 'library', libRoute: route, libBack: null, libDepth: 1, libPrev: '', libPrevTo: '' }, extra || {})), [route, extra]); await landed(route); await op.waitForTimeout(150); };
    const close = async () => { await op.evaluate(() => CLB.c.setState({ overlay: null, libDepth: 0 })); await op.waitForTimeout(200); };
    await open('#/situation/E1');
    await op.evaluate(() => { document.querySelector('[data-bridge="library-overlay"] iframe').contentWindow.__kept = 1; });
    const h1s = [];
    for (let i = 0; i < 3; i++) { if (i) await open('#/situation/E1'); h1s.push(await op.evaluate(() => document.querySelector('[data-bridge="library-overlay"] iframe').contentDocument.querySelector('main h1').innerText)); await close(); }
    check(corpusAsks === 0 && await marked() && h1s.every((t) => t === h1s[0]), `three opens of the Library read the app’s index: no corpus fetched, one frame kept (${corpusAsks} fetches)`);
    check(await op.evaluate(() => { const w = document.querySelector('[data-bridge="library-overlay"] iframe').contentWindow; return w.document.querySelector('main h1') && getComputedStyle(document.querySelector('[data-bridge="library-overlay"]')).display === 'none' && getComputedStyle(document.querySelector('[data-screen-label="Detail pane"]')).display === 'none'; }), 'closed, the frame is kept out of sight, and the pane with it');
    // a fresh open starts the frame's own pages again: Back walks only what was read since
    await open('#/situation/E1');
    const fl = op.frameLocator('[data-bridge="library-overlay"] iframe');
    await fl.locator('main a[href^="#/story/"]').first().click(); await op.waitForTimeout(400);
    const d2 = await op.evaluate(() => CLB.c.state.libDepth);
    await close(); await open('#/people');
    const d1 = await op.evaluate(() => [CLB.c.state.libDepth, CLB.lx.depth].join());
    await op.evaluate(() => CPE.vals(CLB.c).lx.back()); await op.waitForTimeout(300);
    check(d2 === 2 && d1 === '1,1' && await op.evaluate(() => CLB.c.state.overlay) === null && await marked(), `a new open starts the frame's pages afresh, and Back then closes it (${d2} → ${d1})`);
    // put back where it was: a thread's Back returns to the same page, scrolled where the reader left it
    await open('#/story/s-A2-elena-kagan');
    const y0 = await op.evaluate(() => { const w = document.querySelector('[data-bridge="library-overlay"] iframe').contentWindow; w.scrollTo(0, 420); return Math.round(w.scrollY); });
    await fl.locator('[data-act="ask"]').first().click(); await op.waitForTimeout(300);
    const inThread = await op.evaluate(() => CLB.c.state.overlay);
    await op.evaluate(() => CPE.vals(CLB.c).th.back()); await op.waitForTimeout(400);
    const y1 = await op.evaluate(() => { const w = document.querySelector('[data-bridge="library-overlay"] iframe').contentWindow; return [w.location.hash, Math.round(w.scrollY)]; });
    check(inThread === 'thread' && y0 > 100 && y1[0] === '#/story/s-A2-elena-kagan' && Math.abs(y1[1] - y0) <= 10 && await marked(), `Ask from the frame and Back return to the same page at the same place (${y0} → ${y1[1]})`);
    // what the member saves while the frame is out of sight is what the frame shows when it comes back
    await close();
    const was = await fl.locator('[data-act="save"]').innerText();
    await op.evaluate(() => { const st = CLB.c.state, id = 's-A2-elena-kagan'; CLB.c.setState({ saved: st.saved.includes(id) ? st.saved.filter((x) => x !== id) : st.saved.concat([id]) }); }); await op.waitForTimeout(200);
    await open('#/story/s-A2-elena-kagan'); await op.waitForTimeout(300);
    const now = await fl.locator('[data-act="save"]').innerText();
    check(was.trim() !== now.trim() && await marked(), `a story saved or unsaved while the frame was hidden reads so when it is shown (${was.trim()} → ${now.trim()})`);
    await close();
    // a long session: after fifty pages the next open loads the frame afresh
    await open('#/situation/E1');
    const ids = await op.evaluate(() => Object.keys(CLB.lib.story).slice(0, 52));
    for (const id of ids) await op.evaluate((h) => new Promise((ok) => { const w = document.querySelector('[data-bridge="library-overlay"] iframe').contentWindow; w.location.hash = h; const t = () => (CLB.c.state.libRoute === h ? ok() : setTimeout(t, 5)); t(); }), '#/story/' + id);
    const hops = await op.evaluate(() => CLB.lx.hops);
    await close(); await open('#/situation/E1');
    check(hops >= 50 && !(await marked()) && await op.evaluate(() => CLB.lx.gen === 1 && CLB.lx.hops <= 1 && CLB.c.state.libDepth === 1), `after ${hops} pages the next open loads the frame afresh, at the page asked for`);
    check(corpusAsks === 0, 'and even that frame reads the app’s index');
    await op.close();
    // a page that has moved on drops a late answer: Sarah's season, held back, never paints on David's page
    const lp = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    watch(lp, 'late answer');
    await lp.route('**/api/constellation/members/sarah/season*', async (rt) => { await new Promise((ok) => setTimeout(ok, 1200)); try { await rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ season: [{ week: 1, sit: { id: '', chip: 'LATE-ANSWER' }, move: null, line: null, story: null }] }) }); } catch (e) {} });
    await lp.goto(BASE + '/constellation/library?as=coach#/member/sarah'); await lp.waitForSelector('main h1');
    await lp.evaluate(() => { location.hash = '#/member/david'; }); await lp.waitForTimeout(1800);
    const seasonT = await lp.evaluate(() => (document.getElementById('season') || {}).innerText || '');
    check(/David/.test(await lp.locator('main h1').innerText()) && !/LATE-ANSWER/.test(seasonT) && /\bweek\b/i.test(seasonT), 'a late answer for the page left behind is dropped, and the page read now paints its own');
    await lp.close();
  }

  console.log('library');
  const routes = ['#/', '#/situations', '#/situation/A2', '#/situation/E4?f=near', '#/people', '#/people?field=sport&sort=year', '#/eras', '#/era/1970s', '#/era/before-1800',
    '#/field/law', '#/stance/weight', '#/search?q=wimbledon', '#/search?q=1963', '#/icon/sun-tzu', '#/icon/reshma-saujani', '#/icon/obama', '#/story/st-bjk-1973-riggs',
    '#/story/s-A2-barack-obama', '#/saved'];
  for (const [as, w, h, scheme] of [['reader', 1280, 860, 'light'], ['coach', 1280, 860, 'dark'], ['reader', 390, 844, 'light'], ['coach', 390, 844, 'dark']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme });
    const q = await ctx.newPage(); watch(q, `library ${as} ${w}`);
    await q.goto(`${BASE}/constellation/library?as=${as}#/`); await q.waitForSelector('#map svg');
    const all = routes.concat(as === 'coach' ? ['#/members', '#/member/sarah', '#/member/tom', '#/checks', '#/situation/C2', '#/ask', '#/ask?m=tom', '#/near?m=maya', '#/near?m=tom', '#/age?m=maya', '#/age?m=tom', '#/gaps', '#/ask?sit=D4&sex=f&m=tom'] : ['#/member/sarah', '#/nowhere', '#/ask', '#/ask?sit=A4&dir=quiet', '#/cmp?a=st-bjk-1973-riggs&b=s-A2-barack-obama']);
    let over = [], blank = [];
    for (const r of all) {
      await q.evaluate((r) => { location.hash = r; }, r); await q.waitForTimeout(r.startsWith('#/member/') ? 600 : 120);
      const t = await q.evaluate(() => ({ h1: document.querySelector('main h1')?.innerText || '', over: document.documentElement.scrollWidth - innerWidth }));
      if (t.over > 1) over.push(r);
      const expectMissing = r === '#/nowhere' || (r === '#/member/sarah' && as === 'reader');
      if (!t.h1 || (t.h1 === 'Not in the library') !== expectMissing) blank.push(r + ' → ' + t.h1);
    }
    check(!over.length, `${as} ${w}px ${scheme}: no page scrolls sideways${over.length ? ' (' + over.join(', ') + ')' : ''}`);
    check(!blank.length, `${as} ${w}px ${scheme}: every page renders its heading${blank.length ? ' (' + blank.join('; ') + ')' : ''}`);
    check(await q.evaluate(() => document.documentElement.dataset.theme) === scheme, `${as} ${w}px follows the ${scheme} system theme`);
    if (as === 'coach' && w > 1000) {
      await q.evaluate(() => { location.hash = '#/member/sarah'; }); await q.waitForSelector('table.season tbody tr');
      check(await q.locator('table.season tbody tr').count() === 8, 'the season table has eight weeks from the back end');
    }
    if (w > 1000) {
      await q.evaluate(() => { location.hash = '#/'; }); await q.waitForSelector('#litsel');
      await q.selectOption('#litsel', 'renegotiating-standing');
      check(await q.locator('#map polyline.path').count() === 1 && /A2/.test(await q.locator('#mapcap').innerText()), 'lighting a situation draws its constellation');
      await q.fill('#q', 'mclachlin'); await q.waitForTimeout(500);
      check(await q.locator('main .card .nm', { hasText: 'Beverley McLachlin' }).count() === 1, 'search finds a person as you type');
      check((await q.evaluate(() => window.CLL.trail.map((t) => t.k))).length > 3, 'pages join the trail');
      await q.evaluate(() => { location.hash = '#/ask'; }); await q.waitForSelector('#askq');
      await q.fill('#askq', (as === 'coach' ? 'She is' : 'I am') + ' announcing the reorg on Thursday, and the person who wanted ' + (as === 'coach' ? 'her' : 'my') + ' job will be in the room.');
      await q.click('#askform button[type=submit]'); await q.waitForSelector('main h2.count');
      const read = (await q.locator('.readas a.qchip.sit').allInnerTexts()).map((t) => t.split(' ')[0]);
      check(read[0] === 'E1' && read.includes('A2') && await q.locator('.grid.answers .card').count() > 3 && /\?.*sit=E1%2BA2/.test(await q.evaluate(() => location.hash)), `Ask reads the question as ${read.join(' and ')}, answers with stories, and the address holds the query`);
      if (as === 'coach') check(await q.locator('.lead2 .leadcard.ready').count() === 1 && await q.locator('.lead2 .leadcard.check a', { hasText: 'Check the source' }).count() === 1 && /Said to: the colleague who wanted the job/.test(await q.locator('.readas').innerText()), 'a coach’s answer leads with a story ready to send and the draft one check from it, and reads who the line is said to');
      const before = await q.evaluate(() => location.hash);
      await q.locator('.readas a.qchip.sit').nth(1).click();
      check(await q.waitForFunction((h) => location.hash !== h && document.querySelectorAll('.readas a.qchip.sit').length === 1, before, { timeout: 5000 }).then(() => true, () => false), 'a chip taken away narrows the reading');
      await q.evaluate(() => { location.hash = '#/ask?sit=C2&field=law'; }); await q.waitForSelector('main h2.count');
      check(await q.locator('main section h2', { hasText: 'Nearest answers' }).count() === 1, 'a thin answer offers the nearest answers, one per part dropped');
      if (as === 'coach') {
        await q.evaluate(() => { location.hash = '#/ask?m=sarah'; }); await q.waitForSelector('.list.shelf');
        check(await q.locator('.list.shelf li').count() > 20 && /For Sarah this week/.test(await q.locator('main').innerText()), 'the shelf of coach questions counts every answer, Sarah’s week first');
        await q.evaluate(() => { location.hash = '#/near?m=sarah'; }); await q.waitForSelector('#venn svg circle.n-set');
        check(await q.locator('#venn circle.n-set').count() === 3 && /Billie Jean King/.test(await q.locator('.n-sent').innerText()), 'Sarah’s three situations draw as circles, and the bridge across all three is named');
        const near = await q.evaluate(() => { const ws = [...document.querySelectorAll('.n-why, .standin')].map((e) => e.innerText.split('\n').pop()); return { back: ws.filter((w) => /for the reasons given above\.$/.test(w)).length, twice: ws.filter((w, i) => /^(Close to|Nearest to)/.test(w) && /\. Both/.test(w) && ws.indexOf(w) !== i).length, king: ws.filter((w) => /Billie Jean King/.test(w) && /\. Both had every act/.test(w)).length + ws.filter((w) => /^Close to Barack Obama\. Both had every act read as a signal\. Both became the boss/.test(w)).length }; });
        check(near.back >= 1 && !near.twice && near.king === 1, `a tie two lives share is said once on the near page, and pointed back to after (${near.back} pointers)`);
      }
      await q.evaluate(() => { location.hash = '#/'; }); await q.waitForSelector('#map svg .hit');
      await q.locator('#map svg .hit[data-id="billie-jean-king"]').dispatchEvent('mousemove');
      check(await q.locator('#map .thread').count() >= 8 && /threads from/.test(await q.locator('#mapcap').innerText()), 'a star on the map draws threads to its kin');
      const sweep = await q.evaluate(() => { let ok = 0, none = 0, n = 0; document.querySelectorAll('#map svg .hit').forEach((c) => { n++; c.dispatchEvent(new MouseEvent('mousemove', { bubbles: true })); const k = document.querySelectorAll('#map .thread').length; const has = window.CLL && true; if (k) ok++; else none++; }); return { n, ok, none }; });
      check(sweep.n > 400 && sweep.ok > 300 && sweep.none > 0, `every star can be hovered: ${sweep.ok} draw threads, ${sweep.none} have no story and draw none`);
      await q.evaluate(() => { location.hash = '#/situation/E1'; }); await q.waitForSelector('.mfam[data-fam]');
      const fam = await q.evaluate(() => ({ cards: document.querySelectorAll('.mfam[data-fam]').length, lede: (document.querySelector('.mfams') || { previousElementSibling: null }).previousElementSibling ? document.querySelector('.mfams').previousElementSibling.innerText : '', rows: document.querySelectorAll('.mfam[data-fam] .mf-row').length }));
      check(fam.cards === 5 && fam.rows === 12, `a situation's stories draw as families of moves: five families holding 12 of E1's stories (${fam.cards}, ${fam.rows})`);
      await q.evaluate(() => { location.hash = '#/'; }); await q.waitForSelector('#map svg .hit');
      const top = await q.evaluate(() => { const st = document.querySelector('#map svg').getBoundingClientRect().top; let worst = 1e9; document.querySelectorAll('#map svg .hit').forEach((c) => { c.dispatchEvent(new MouseEvent('mousemove', { bubbles: true })); document.querySelectorAll('#map .thread').forEach((t) => { worst = Math.min(worst, t.getBoundingClientRect().top - st); }); }); return worst; });
      check(top > 0, `no thread leaves the top of the map (highest ${top.toFixed(1)}px below it)`);
      if (as === 'reader') {
        await q.locator('#map svg').dispatchEvent('mouseleave');
        await q.locator('#litsel').focus(); await q.keyboard.press('Tab');
        const kb = await q.evaluate(() => ({ tabs: document.querySelectorAll('#map [tabindex]').length, on: document.activeElement.closest('#map') !== null, rows: document.querySelectorAll('#mapkin .kinlist li').length, cap: document.getElementById('mapcap').innerText }));
        await q.keyboard.press('ArrowRight'); await q.keyboard.press('ArrowDown');
        const moved = await q.locator('#mapcap').innerText();
        await q.keyboard.press('Enter'); await q.waitForTimeout(300);
        check(kb.tabs === 1 && kb.on && kb.rows === 12 && /Enter opens/.test(kb.cap) && moved !== kb.cap && /^#\/icon\//.test(await q.evaluate(() => location.hash)), `the map is one tab stop: the keys move from life to life, list the twelve nearest, and Enter opens one (${kb.cap.split('.')[0]})`);
      }
      if (as === 'coach') {
        await q.evaluate(() => { location.hash = '#/age?m=sarah'; }); await q.waitForSelector('#agestrip svg');
        check(await q.locator('#agestrip .agedot').count() > 40 && /within three years of 41/.test(await q.locator('main .lede').innerText()), 'At Sarah’s age places Sarah’s situations’ stories by age, the nearest named');
      }
      await q.evaluate(() => { location.hash = '#/icon/abraham-lincoln'; }); await q.waitForSelector('#spine li[data-id]');
      check(await q.locator('#kfig a.kn').count() >= 6 && await q.locator('#spine li[data-id]').count() >= 6 && /Both became the boss/.test(await q.locator('#spine').innerText()), 'a life shows its kindred across time, each tie said in words');
      await q.evaluate(() => { location.hash = '#/icon/steve-jobs'; }); await q.waitForSelector('#spine li[data-id]');
      check(!await q.locator('#kfig').count() && await q.locator('#spine li[data-id]').count() >= 6 && !/Two reasons/.test(await q.locator('main').innerText()), 'kin within fifty years read as a list alone, with no picture and no key it does not use');
      await q.evaluate(() => { location.hash = '#/story/st-bjk-1973-riggs'; }); await q.waitForSelector('#splot table.wgrid');
      const why = await q.locator('#others .preason, #others .note').allInnerTexts();
      check(await q.locator('#others a[href^="#/story/"]').count() >= 3 && new Set(why).size === why.length, 'a story lists others who lived this week, each with its own reason');
      check(await q.locator('#splot table.wgrid td a').count() >= 4 && await q.locator('#splot td.here').count() === 1 && /sit close to an ordinary office|no story sits close/.test(await q.locator('#splot caption').innerText()), 'a story sets every story of its week in a grid, quieter or closer, this one ringed and the grid said in a sentence');
      await q.evaluate(() => { location.hash = '#/situations'; }); await q.waitForSelector('.ladder .rows li[data-id]');
      const lad = await q.evaluate(() => { const l = document.querySelector('.ladder'); return { t: l.textContent, a1: l.querySelector('li[data-id="A1"] button').textContent, svg: l.querySelectorAll('svg').length }; });
      check(await q.locator('.ladder .rows li[data-id]').count() === 22 && !lad.svg && !/[A-E]\d[A-Z]/.test(lad.t) && /^A1 · .+ · \d+ lives · most often with C3 \(4\) and E1 \(3\)$/.test(lad.a1), 'the situations read as words: each row says what it travels with most (' + lad.a1 + ')');
      await q.locator('.ladder .rows li[data-id="A3"] button').click();
      const pane = await q.locator('.ladder li.on .pane').innerText();
      check(/Barack Obama/.test(pane) && /C3 · .+ · 5 lives/.test(pane) && await q.locator('.ladder li[data-id="A3"] button').getAttribute('aria-expanded') === 'true', 'a situation in the ladder says who lived it with another, A3 and C3 five lives');
      await q.evaluate(() => { location.hash = '#/path?from=rihanna&to=abraham-lincoln'; }); await q.waitForSelector('.route .n-chain');
      check(await q.locator('.route').count() >= 2 && await q.locator('.route .n-steps li').count() >= 2, 'two lives connect by the strongest way and another, every step said');
      await q.evaluate(() => { location.hash = '#/cmp?a=st-bjk-1973-riggs&b=s-A2-barack-obama'; }); await q.waitForSelector('table.cmp');
      check(await q.locator('table.cmp tbody tr').count() >= 3 && await q.locator('.cmpcol').count() === 2, 'two stories compare side by side, facts only');
    }
    if (w < 500) {
      await q.evaluate(() => { location.hash = '#/situation/E1'; }); await q.waitForSelector('.mfam[data-fam]'); await q.evaluate(() => document.fonts.ready);
      const mv = await q.evaluate(() => { const m = document.querySelector('#moves'), d = m.querySelector('details.mf-more');
        return { h: Math.round(m.getBoundingClientRect().height), joined: m.querySelectorAll('.mf-j, button[data-act="mjoin"]').length, drafts: [...m.querySelectorAll('.mf-row')].filter((r) => /Recall draft/.test(r.innerText)).length,
          rows: m.querySelectorAll('.mf-row').length, mv: m.querySelectorAll('.mf-row .mv').length, open: m.querySelectorAll(':scope > .mfams > .mfam[data-fam]').length, folded: d ? d.querySelectorAll('.mfam[data-fam]').length : 0,
          summary: d ? d.querySelector('summary').innerText : '', cap: m.querySelector('.mf-c').innerText, onlyLinks: [...m.querySelectorAll('.mf-rows')].every((ol) => !ol.querySelector('button') && [...ol.children].every((li) => li.querySelector(':scope > a.mf-a'))) }; });
      check(mv.h < 1500 && !mv.joined && !mv.drafts && mv.rows === mv.mv && mv.open === 3 && mv.folded === 2 && mv.onlyLinks && /^Two more families, and 29 moves of their own$/.test(mv.summary) && /^Four stories, all recall drafts$/.test(mv.cap),
        `${as} 390px: E1's families are lists of links, each row saying its own move, three open and the rest folded, in ${mv.h}px (${mv.summary}; ${mv.cap})`);
      const arcs = await q.evaluate(async () => { const d = document.querySelector('#moves details.mf-more'), svgs = [...d.querySelectorAll('.mf-arcs')];
        svgs.forEach((sv) => { sv.innerHTML = ''; sv.setAttribute('height', '0'); }); d.open = true; await new Promise((r) => setTimeout(r, 300));
        return svgs.every((sv) => { const ol = sv.parentNode.querySelector('.mf-rows'); return +sv.getAttribute('height') === ol.offsetHeight && ol.offsetHeight > 0 && sv.querySelectorAll('circle').length === ol.children.length && sv.querySelectorAll('path').length >= 1; }); });
      check(arcs, `${as} 390px: the folded families draw their arcs when they open`);
      await q.evaluate(() => { location.hash = '#/story/s-B4-constance-baker-motley'; }); await q.waitForSelector('.samemove');
      const sm = await q.locator('.samemove').innerText();
      check(/^The same move in another week: Charlotte Beers, 1970, C1 · Selling what you used to make\s+Motley: tell the partner leading it which part you will present\.\s+Beers: ask the partner leading it for one section you will present alone, and present it\.$/.test(sm.trim()), 'the same move in another week says the clause each story makes it in (' + sm.replace(/\n+/g, ' / ') + ')');
    }
    if (as === 'reader' && w < 500) {
      const mctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme });
      const mm = await mctx.newPage(); watch(mm, 'library member words');
      await mm.goto(`${BASE}/constellation/library?as=member&m=sarah#/`); await mm.waitForSelector('main h1');
      const codes = [];
      for (const r of ['#/', '#/situations', '#/situation/E1', '#/story/st-bjk-1973-riggs', '#/icon/billie-jean-king', '#/near', '#/member/sarah', '#/ask?t=' + encodeURIComponent('I am announcing the reorg on Thursday and Dan wanted my job') + '&read=1&m=sarah']) {
        await mm.evaluate((r) => { location.hash = r; }, r); await mm.waitForTimeout(300);
        const m = (await mm.evaluate(() => document.querySelector('main').innerText)).match(/\b[A-E][1-6]\b/g); if (m) codes.push(r + ': ' + m.slice(0, 3).join(' '));
      }
      const h390 = await mm.evaluate(async () => { location.hash = '#/situation/E1'; await new Promise((ok) => setTimeout(ok, 400)); return document.documentElement.scrollHeight; });
      check(!codes.length && h390 < 7000, `a member reads situations in words, with no codes, and a situation page stays short on a phone (${h390}px${codes.length ? '; ' + codes.join('; ') : ''})`);
      // FE-16: a member's week leads with the stories closest to their three; the path, the families and the map wait
      // behind one fold, and a link to the path opens it. Michelle Obama's card names Sarah's hero in full, as the
      // Ask's route does ("One step from Barack Obama")
      const lead = await mm.evaluate(() => { const hs = [...document.querySelectorAll('main h2, main summary')].filter((e) => e.offsetParent).map((e) => e.innerText.trim()), w = document.getElementById('ways');
        return { hs, ways: !!w && !w.open, cards: [...document.querySelectorAll('main section:first-of-type .card .why')].map((e) => e.innerText), h: document.documentElement.scrollHeight }; });
      const atPath = await mm.evaluate(async () => { location.hash = '#/situation/E1?at=path'; await new Promise((ok) => setTimeout(ok, 400)); return document.getElementById('ways').open && document.getElementById('path').getBoundingClientRect().top < 200; });
      check(lead.hs[0] === 'Closest to your three' && lead.hs[1] === 'More ways to read this week' && lead.ways && lead.cards.length === 3 && lead.cards.every((t) => /^(From .+, one of your three|One step from .+|Two steps from .+)$/.test(t)) && lead.cards.includes('One step from Barack Obama') && lead.h < 2200 && atPath,
        `a member's week leads with the three stories closest to their three, the rest folded, in ${lead.h}px (${lead.cards.join('; ')})`);
      await mm.evaluate(() => { location.hash = '#/situations'; }); await mm.waitForSelector('.ladder .rows li[data-id]');
      await mm.locator('.ladder .rows li[data-id="A1"] button').click();
      const lad = await mm.locator('.ladder li.on .pane').innerText();
      check(/Open: Nobody told you what the job asks/.test(lad) && !/\b[A-E][1-6]\b/.test(lad), 'a member opens a situation from the ladder by its words (' + lad.split('\n').pop() + ')');
      await mm.evaluate(() => { location.hash = '#/story/s-B4-constance-baker-motley'; }); await mm.waitForSelector('.samemove');
      const smT = await mm.locator('.samemove').innerText();
      check(/^The same move in another week: Charlotte Beers, 1970, “Selling what you used to make”\n/.test(smT), 'a member reads the same move in another week with no code (' + smT.split('\n')[0] + ')');
      await mctx.close();
      const tctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, colorScheme: scheme });
      const t = await tctx.newPage(); watch(t, 'library map touch');
      await t.goto(`${BASE}/constellation/library?as=member&m=sarah#/`); await t.waitForSelector('#map svg .hit');
      const v = await t.evaluate(() => { const sc = document.querySelector('.map-scroll'), b = sc.getBoundingClientRect(); const ticks = [...sc.querySelectorAll('.ticklabel')].filter((x) => { const r = x.getBoundingClientRect(); return r.left >= b.left && r.right <= b.right; }).map((x) => x.textContent); return { sl: sc.scrollLeft, ticks, fields: document.querySelectorAll('.mapfields span').length }; });
      check(v.sl > 0 && v.ticks.length && v.ticks.every((y) => +y > 1900) && v.fields === 8, `on a phone the map opens on the last century, its field names held still (${v.ticks.join(', ')})`);
      await t.locator('#map .hit[data-id="barack-obama"]').tap({ force: true });
      const one = await t.evaluate(() => ({ hash: location.hash, rows: document.querySelectorAll('#mapkin .kinlist li a').length, small: [...document.querySelectorAll('#mapkin .kinlist a')].filter((a) => a.getBoundingClientRect().height < 44).length }));
      await t.locator('#map .hit[data-id="barack-obama"]').tap({ force: true }); await t.waitForTimeout(300);
      check(one.hash === '#/' && one.rows === 12 && !one.small && await t.evaluate(() => location.hash) === '#/icon/barack-obama', 'on a phone the first tap lists the twelve nearest lives, each a full-size link, and the second opens the life');
      await tctx.close();
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}
check(errs.length === 0, 'no console errors and no failed requests' + (errs.length ? ':\n    ' + errs.slice(0, 12).join('\n    ') : ''));
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
