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
  check(/From Obama, one of your three/i.test(mon) && /Chicago, December 2008/.test(mon), 'the scripted Monday card still serves the Obama sample, naming the hero once');
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
  await p.frameLocator('iframe[title="The Constellation library"]').locator('#others').waitFor();
  check(true, 'Others who lived this week opens the Library at the others');
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
  await bf.locator('#others a[href^="#/story/"]').first().waitFor(); await p.waitForTimeout(300);
  const barT = await p.locator('[data-bridge="library-overlay"] > div').first().innerText();
  check(/^King/.test(barT.trim()) && /Others who lived King’s week/.test(barT) && !(await bf.locator('header.top').isVisible()) && !(await bf.locator('#trail').isVisible()), 'one bar: Back names the story, the title names the page, and the frame adds no bars');
  await bf.locator('#others a[href^="#/story/"]').first().click(); await p.waitForTimeout(400);
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
  const wkOrder = await p.evaluate(() => { const t = document.querySelector('[data-bridge="week-trail"]'), l = [...document.querySelectorAll('[data-screen-label="M6 This week"] div')].find((e) => e.textContent === 'Developed with Jennifer'); return !!(t && l && (l.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING)); });
  check(/Prep opens Wednesday\./.test(wk3) && !/Start the prep/.test(wk3) && /From Obama, one of your three/i.test(wk3) && wkOrder, 'This week holds the story, the line and where you were, with no dead button');
  await p.evaluate(() => CLB.c.setState({ overlay: 'story', sid: 's-E3-serena-williams', sctx: {}, sstack: [] })); await p.waitForTimeout(250);
  await p.click('[data-bridge="story-check"]'); await p.waitForTimeout(250);
  const asked = await p.evaluate(() => { const st = CLB.state(), last = st.msgs[st.p].slice(-1)[0]; return [st.signals.some((g) => g.kind === 'check' && g.sid === 's-E3-serena-williams'), last.kind, last.story].join(); });
  check(asked === 'true,story,s-E3-serena-williams' && /Waiting for Jim’s check/.test(await p.locator('[data-bridge="story-check"]').innerText()), 'a member asks for a draft to be checked: a card in the coach’s thread, and Waiting');
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
  check(/Sarah asked for 1 check/.test(await p.locator('[data-bridge="review-line"]').first().innerText().catch(() => '')), 'Review says Sarah asked for a check, on her line');
  await p.evaluate(() => CLB.c.setState({ swapFor: 'michael', swapHero: 'all' })); await p.waitForTimeout(300);
  const sw = p.locator('[data-screen-label="C3 Swap panel"]');
  check(await sw.locator('button[disabled]').count() === 0 && await sw.locator('[data-bridge="swap-check"]').count() >= 3 && /Muriel Siebert/i.test(await sw.innerText()) && !/Muhammad Ali · Miami/i.test(await sw.innerText()), 'Swap offers Check the source on the drafts nearest the member, leaving out the life Michael had last week');
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
  await p.evaluate(() => CLB.c.setState({ c: 'CX', lib: Object.assign({}, CLB.c.state.lib, { to: 'michael' }) })); await p.waitForTimeout(300);
  await p.locator('[data-bridge="coach-tabs"] button', { hasText: 'Find and send' }).click(); await p.waitForTimeout(300);
  const c4 = await p.evaluate(() => ({ key: CLB.c.state.lib.key, want: CLB.lib.sit[CLB.lib.members.michael.up19.sit].key, n: CPE.vals(CLB.c).lib.results.length, far: !!CPE.vals(CLB.c).lib.farChip }));
  check(c4.key === c4.want && c4.n < 531 && c4.far, 'Find and send opens on the member’s week, with far stories set aside');
  // the send guard: nothing unchecked or repeated goes out, and the coach's choice wins
  await p.click('button[title^="10 ·"]'); await p.waitForTimeout(400);
  const notice = await p.evaluate(() => CLB.c.state.cnotif && CLB.c.state.cnotif.text), row = async () => p.evaluate(() => { const r = CPE.vals(CLB.c).rq.rows.find((x) => x.mid === 'sarah'); return { status: r.status, guard: r.guard, s: r.s && r.s.eyebrow, fill: r.fill && r.fill.title }; });
  const r0 = await row();
  check(/Sarah’s waits for one check/.test(notice) && /^Waiting for your check/.test(r0.status) && /had Obama on 12 Oct/.test(r0.guard) && /Jimmy Carter/.test(r0.fill), 'nothing unchecked goes out: Sarah’s paired draft waits, the row names the life she had last week, and the check offered is a new one');
  await p.evaluate(() => CLB.c.setState({ review: Object.assign({}, CLB.c.state.review, { sarah: { action: 'swap', story: 'st-bjk-1973-riggs' } }) })); await p.waitForTimeout(200);
  const r1 = await row();
  check(/^Billie Jean King/.test(r1.s) && /^Goes to Sarah at 18:00/.test(r1.status), 'a swap wins over the pairing, and the row says when it goes');
  await p.evaluate(() => CLB.c.setState({ review: Object.assign({}, CLB.c.state.review, { sarah: {} }), c: 'C3', cnotif: null, rvAll: false })); await p.waitForTimeout(300);
  // "Your week, Jim": one line per member of this coach, each with one action, and the checks to make first
  const wk = await p.evaluate(() => { const root = document.querySelector('[data-screen-label="C3 Review queue"]'), ls = [...root.querySelectorAll('[data-bridge="review-line"]')];
    return { title: CPE.vals(CLB.c).cTitle, names: ls.map((x) => x.innerText.split('\n')[1] || x.innerText), acts: ls.map((x) => [...x.querySelectorAll('button')].map((b) => b.innerText.trim()).filter((t) => /^(Approve|Check|Answer|Prep)$/.test(t)).slice(-1)[0] || ''),
      sarah: ls[0] ? ls[0].innerText.replace(/\s+/g, ' ') : '', plan: (root.querySelector('[data-bridge="review-plan"]') || {}).innerText || '', bulk: root.firstElementChild.innerText, details: root.querySelectorAll('[data-bridge="review-why"]').length }; });
  check(wk.title === 'Your week, Jim' && wk.names.join() === 'Sarah Kessler,David Okafor,Priya Raman,Tom Whitfield' && wk.acts.join() === 'Check,Check,Approve,Approve' && !wk.details &&
    /Thu 22 Oct · Reorg announcement · E1 · Everything you do gets read as a signal/.test(wk.sarah) && /One check · Jimmy Carter/.test(wk.sarah) && /Tue 10:00 · Prep/.test(wk.sarah),
    `Review reads "Your week, Jim": a line for each of Jim's four members, each with one action (${wk.acts.join(', ')})`);
  check(/Nine checks give each of Jim’s members four/.test(wk.plan) && /Golda Meir[^\n]*\nFills David and Priya; one of Priya’s three/.test(wk.plan) && /Approve the two ready/.test(wk.bulk), 'below the lines, the checks to make first: Golda Meir fills David and Priya; and the bulk approve counts only what can go');
  await p.locator('[data-bridge="review-line"]').first().locator('button', { hasText: 'Check' }).click(); await p.waitForTimeout(300);
  const posted = []; await p.route('**/api/constellation/state/ledger', (rt) => { if (rt.request().method() === 'POST') { posted.push(JSON.parse(rt.request().postData())); return rt.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); } return rt.continue(); });
  const cc = p.locator('[data-bridge="check-card"]').first(), ccSend = cc.locator('button').first();
  const ccDis = await ccSend.isDisabled();
  await cc.locator('input').fill('Carter, inaugural address, Georgia State Archives'); await p.waitForTimeout(150);
  await ccSend.click(); await p.waitForTimeout(600);
  const r2 = await row();
  check(ccDis && posted.length === 1 && posted[0].by === 'jim' && posted[0].note && /^Jimmy Carter/.test(r2.s) && /^Goes to Sarah/.test(r2.status), 'the check card needs a note, records the console’s coach, and fills the slot');
  await p.unroute('**/api/constellation/state/ledger');
  await p.evaluate(() => { window.postMessage({ type: 'cl:unverified', story: 's-A3-jimmy-carter' }, location.origin); CLB.c.setState({ review: Object.assign({}, CLB.c.state.review, { sarah: {} }), fillOpen: null }); }); await p.waitForTimeout(300);
  await p.click('button[title^="11 ·"]'); await p.waitForTimeout(300);
  await p.locator('button[aria-label="Member"]').click(); await p.evaluate(() => CLB.c.setState({ m: 'app', tab: 'week', overlay: null })); await p.waitForTimeout(400);
  check(/Your story comes once Jim has checked it/.test(await p.locator('[data-screen-label="M6 This week"]').innerText()), 'a held week tells the member why');
  await p.locator('button[aria-label="Coach"]').click(); await p.waitForTimeout(200);
  // prep for every member of the console's coach; another coach's member stays theirs
  await p.evaluate(() => CLB.c.setState({ c: 'CK' })); await p.waitForTimeout(200);
  const ck = await p.evaluate(() => CPE.vals(CLB.c).ck.map((k) => k.name.split(' ')[0] + ':' + (k.prepDis ? 'no' : 'yes')).join());
  await p.evaluate(() => CPE.vals(CLB.c).ck.find((k) => /^David/.test(k.name)).prep()); await p.waitForTimeout(300);
  const dp = await p.evaluate(() => [CLB.c.state.c, CLB.c.state.cxRoute].join());
  check(ck === 'Sarah:yes,Maya:no,Michael:no,David:yes,Priya:yes,Tom:yes' && dp === 'CX,#/member/david', `Check-ins opens prep for each of Jim’s members, David’s as the Library’s reading for him (${ck})`);
  await p.locator('button', { hasText: 'Michael,' }).first().click(); await p.waitForTimeout(300);
  await p.click('button[title^="10 ·"]'); await p.waitForTimeout(300); await p.locator('button[aria-label="Coach"]').click();
  await p.evaluate(() => CLB.c.setState({ c: 'C3', cnotif: null, rvAll: false })); await p.waitForTimeout(300);
  const jen = await p.evaluate(() => { const v = CPE.vals(CLB.c), before = JSON.stringify(CLB.c.state.review); if (v.rq.canBulk) v.rq.bulk(); const after = CLB.c.state.review;
    return { title: v.cTitle, mids: v.rq.rows.map((r) => r.mid).join(), touched: Object.keys(after).filter((k) => JSON.stringify(after[k]) !== JSON.stringify(JSON.parse(before)[k])).join() }; });
  check(jen.title === 'Your week, Jennifer' && jen.mids === 'michael' && (jen.touched === '' || jen.touched === 'michael'), 'Jennifer’s console shows her one member, and its bulk approve touches only Michael');
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
      }
      await q.evaluate(() => { location.hash = '#/'; }); await q.waitForSelector('#map svg .hit');
      await q.locator('#map svg .hit[data-id="billie-jean-king"]').dispatchEvent('mousemove');
      check(await q.locator('#map .thread').count() >= 8 && /threads from/.test(await q.locator('#mapcap').innerText()), 'a star on the map draws threads to its kin');
      const sweep = await q.evaluate(() => { let ok = 0, none = 0, n = 0; document.querySelectorAll('#map svg .hit').forEach((c) => { n++; c.dispatchEvent(new MouseEvent('mousemove', { bubbles: true })); const k = document.querySelectorAll('#map .thread').length; const has = window.CLL && true; if (k) ok++; else none++; }); return { n, ok, none }; });
      check(sweep.n > 400 && sweep.ok > 300 && sweep.none > 0, `every star can be hovered: ${sweep.ok} draw threads, ${sweep.none} have no story and draw none`);
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
    if (as === 'reader' && w < 500) {
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
