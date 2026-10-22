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
//   library        every page type, reader and coach, desktop and phone, light and dark, no sideways scroll
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
  p.on('requestfailed', (r) => errs.push(`${tag}: failed ${r.url()}`));
}

try {
  console.log('prototype');
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watch(p, 'prototype');
  await p.goto(BASE + '/constellation');
  await p.waitForFunction(() => window.CLB && CLB.ready && CLB.c, null, { timeout: 20000 });
  const boot = await p.evaluate(() => ({ source: CLB.source, errors: CLB.errors, stories: CPD.stories.length, sits: CPD.sits.length, heroes: CPD.heroes.length }));
  check(boot.source === 'api', 'members and coaches come from the back end');
  check(boot.stories === 531 && boot.sits === 22 && boot.heroes > 400, `the engine holds the corpus (${boot.stories} stories, ${boot.sits} situations, ${boot.heroes} heroes)`);
  check(boot.errors.length === 0, 'the bridge reports no errors');

  await p.click('button[title^="6 ·"]'); await p.waitForTimeout(500);
  check(/Barack Obama · Chicago, December 2008/.test(await p.locator('body').innerText()), 'the scripted Monday card still serves the Obama sample');
  await p.locator('button', { hasText: 'Heroes' }).last().click(); await p.waitForTimeout(300);
  check(/531 stories/.test(await p.locator('[data-bridge="heroes-library"]').innerText()), 'Heroes shows the Library card');
  await p.click('[data-bridge="heroes-library"]');
  const fr = p.frameLocator('iframe[title="The Constellation library"]');
  await fr.locator('.card.mine').first().waitFor();
  check((await fr.locator('.card.mine .nm').allInnerTexts()).join() === 'Barack Obama,Serena Williams,Rihanna', 'the member frame starts from her three');
  await fr.locator('.card.mine').first().click();
  await fr.locator('a.card[href^="#/story/"]').first().click();
  const sid = await fr.locator('[data-act="save"]').getAttribute('data-id');
  await fr.locator('[data-act="save"]').click(); await p.waitForTimeout(200);
  check(await p.evaluate((id) => CLB.state().saved.includes(id), sid), 'Save in the Library saves in the app');
  await fr.locator('[data-act="ask"]').click(); await p.waitForTimeout(200);
  check((await p.evaluate(() => [CLB.state().overlay, CLB.state().attach])).join() === 'thread,' + sid, 'Ask opens the thread with the story attached');
  await p.evaluate(() => CLB.c.setState({ overlay: 'hero', hid: 'obama', hctx: {} })); await p.waitForTimeout(200);
  await p.click('[data-bridge="hero-library"]');
  await p.frameLocator('iframe[title="The Constellation library"]').locator('h1', { hasText: 'Barack Obama' }).waitFor();
  check(true, 'a hero page opens the Library on that life');
  await p.evaluate(() => CLB.c.setState({ overlay: 'story', sid: 's-A1-beverley-mclachlin', sctx: {} })); await p.waitForTimeout(200);
  check((await p.locator('[data-screen-label="M7 Story"] p').first().innerText()).startsWith('Beverley McLachlin, 37'), 'a corpus story drops the dateline the eyebrow already shows');
  await p.click('[data-bridge="story-library"]');
  await p.frameLocator('iframe[title="The Constellation library"]').locator('.prose').waitFor();
  check(true, 'a story opens the Library on that story');

  console.log('coach');
  await p.locator('button[aria-label="Coach"]').click(); await p.waitForTimeout(300);
  await p.evaluate(() => CLB.c.setState({ c: 'C3' })); await p.waitForTimeout(300);
  const review = await p.locator('[data-screen-label="Coach console"]').innerText();
  check(/recall drafts also carry this key/.test(review), 'Review collapses the recall drafts into one line per member');
  await p.locator('button[aria-label="Library"]').click();
  const cf = p.frameLocator('iframe[title="The Constellation library"]');
  await cf.locator('h2', { hasText: 'Prep for a member' }).waitFor();
  check(true, 'Library opens on Explore, in coach mode');
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
  await p.locator('button', { hasText: 'Send now' }).click(); await p.waitForTimeout(200);
  check(await p.evaluate((t) => { const st = CLB.state(); return st.msgs[st.lib.to].slice(-1)[0].story === t; }, target), 'Send now delivers it to the member thread');
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
  await p.close();

  console.log('library');
  const routes = ['#/', '#/situations', '#/situation/A2', '#/situation/E4?f=near', '#/people', '#/people?field=sport&sort=year', '#/eras', '#/era/1970s', '#/era/before-1800',
    '#/field/law', '#/stance/weight', '#/search?q=wimbledon', '#/search?q=1963', '#/icon/sun-tzu', '#/icon/reshma-saujani', '#/icon/obama', '#/story/st-bjk-1973-riggs',
    '#/story/s-A2-barack-obama', '#/saved'];
  for (const [as, w, h, scheme] of [['reader', 1280, 860, 'light'], ['coach', 1280, 860, 'dark'], ['reader', 390, 844, 'light'], ['coach', 390, 844, 'dark']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme });
    const q = await ctx.newPage(); watch(q, `library ${as} ${w}`);
    await q.goto(`${BASE}/constellation/library?as=${as}#/`); await q.waitForSelector('#map svg');
    const all = routes.concat(as === 'coach' ? ['#/members', '#/member/sarah', '#/member/tom', '#/checks', '#/situation/C2'] : ['#/member/sarah', '#/nowhere']);
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
      await q.evaluate(() => { location.hash = '#/'; }); await q.waitForSelector('.chips [data-key="renegotiating-standing"]');
      await q.click('.chips [data-key="renegotiating-standing"]');
      check(await q.locator('#map polyline.path').count() === 1 && /A2/.test(await q.locator('#mapcap').innerText()), 'lighting a situation draws its constellation');
      await q.fill('#q', 'mclachlin'); await q.waitForTimeout(500);
      check(await q.locator('main .card .nm', { hasText: 'Beverley McLachlin' }).count() === 1, 'search finds a person as you type');
      check((await q.evaluate(() => window.CLL.trail.map((t) => t.k))).length > 3, 'pages join the trail');
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
