// The speed budget, on a phone-sized window with the CPU slowed four times (CDP Emulation.setCPUThrottlingRate),
// which is about where a mid-range phone sits. Starts tools/dev-server.mjs on a free port and measures, each the
// better of two tries so one busy moment on the machine does not fail it:
//   ready        navigation to the app booted on the corpus (CLB.ready, and the engine has drawn)    under 2.0 s
//   first press  the first demo step pressed (6, the Monday card) to the frame painted after it        under 500 ms
//   warm press   a tab changed with setState, once the app is warm, to the frame painted (median)      under 200 ms
//   gaps         the Library's #/gaps, the first visit and the second                             under 400 / 150 ms
//   routes       every Library page on its second visit (a warm route)                                under 300 ms
//   opens        the Library inside the app, opened at E1 a second and a third time                   under 300 ms
//   first story  the member's first story opened from This week, after six seconds idle             under 500 ms
//   story task   the longest task in that first story (the move vectors and families built while idle)  under 200 ms
//   E1 first     the Library's #/situation/E1 the first time, after the first page                    under 400 ms
//   first open   the Library inside the app, opened at E1 the first time                            under 1.0 s
//   explore      the coach’s Library tab (Explore), opened the first time                           under 1.0 s
// Each line prints both tries beside the better one, so a budget met only once shows. The first Review (step 10) and
// every other page's first visit are printed as well, without a budget.
//   node constellation/tests/perf.mjs
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const HERE = path.dirname(fileURLToPath(import.meta.url));
let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); }
catch (e) { ({ chromium } = createRequire(execSync('npm root -g').toString().trim() + '/')('playwright')); }

const RATE = 4, W = 390, H = 844;
const BUDGET = { ready: 2000, firstPress: 500, warmPress: 200, gapsFirst: 400, gapsSecond: 150, route: 300, open: 300, firstStory: 500, storyTask: 200, e1First: 400, firstOpen: 1000, explore: 1000 };
const ROUTES = ['#/', '#/situations', '#/situation/E1', '#/situation/B6', '#/story/st-bjk-1973-houston', '#/story/s-D3-david-ogilvy', '#/icon/barack-obama', '#/people',
  '#/ask?t=' + encodeURIComponent('She is announcing the reorg on Thursday and the person who wanted her job will be in the room') + '&read=1&m=sarah',
  '#/near?m=sarah', '#/age?m=sarah', '#/path?from=barack-obama&to=serena-williams', '#/checks', '#/member/sarah', '#/members', '#/eras'];

const port = await new Promise((r) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const server = spawn(process.execPath, [path.join(HERE, '../tools/dev-server.mjs'), String(port)], { stdio: 'ignore' });
const BASE = `http://localhost:${port}`;
await new Promise((r) => setTimeout(r, 600));
const browser = await chromium.launch();

async function slowPage() {
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  const page = await ctx.newPage(), cdp = await ctx.newCDPSession(page), errs = [];
  page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
  await page.addInitScript(() => { window.__lt = []; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push([e.startTime, e.duration]))).observe({ type: 'longtask' }); } catch (e) {} });
  return { ctx, page, errs };
}
// from the call to the first frame painted after it: the work, then the paint, then the next task
const PAINTED = 'new Promise((ok) => requestAnimationFrame(() => setTimeout(ok, 0)))';
const timed = (page, fn, arg) => page.evaluate(new Function('arg', `return (async () => { const t0 = performance.now(); (${fn})(arg); await ${PAINTED}; return Math.round(performance.now() - t0); })();`), arg);
const median = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];

async function app() {
  const { ctx, page, errs } = await slowPage();
  const t0 = Date.now();
  await page.goto(BASE + '/constellation');
  await page.waitForFunction(() => window.CLB && CLB.ready && CLB.c, null, { timeout: 60000, polling: 16 });
  const ready = Date.now() - t0;
  await page.waitForTimeout(1000);
  const firstPress = await timed(page, () => document.querySelector('button[title^="6 ·"]').click());
  await page.waitForTimeout(300);
  const later = [];
  for (const s of ['7 ·', '8 ·', '9 ·']) { later.push(await timed(page, (s) => document.querySelector('button[title^="' + s + '"]').click(), s)); await page.waitForTimeout(250); }
  const review = await timed(page, () => document.querySelector('button[title^="10 ·"]').click());
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('button[title^="6 ·"]').click()); await page.waitForTimeout(400);
  await page.evaluate(() => CLB.c.setState({ role: 'member', m: 'app', tab: 'week', overlay: null })); await page.waitForTimeout(400);
  // the member's main action: the week's story, opened by its button after the app has sat idle (S1)
  await page.waitForTimeout(6000);
  const t1 = await page.evaluate(() => performance.now());
  const firstStory = await timed(page, () => [...document.querySelectorAll('[data-screen-label="M6 This week"] [role=button]')].find((b) => /one of your three/i.test(b.innerText) && b.getBoundingClientRect().width > 0).click());
  await page.waitForTimeout(400);
  const storyTask = await page.evaluate((t1) => Math.round(Math.max(0, ...window.__lt.filter((x) => x[0] >= t1).map((x) => x[1]))), t1);
  await page.evaluate(() => CLB.c.setState({ overlay: null })); await page.waitForTimeout(400);
  const warm = [];
  for (const tab of ['heroes', 'you', 'ask', 'week', 'heroes', 'week']) { warm.push(await timed(page, (tab) => CLB.c.setState({ tab }), tab)); await page.waitForTimeout(200); }
  // the Library inside the app, three times at E1
  const opens = [];
  for (let i = 0; i < 3; i++) {
    opens.push(await page.evaluate(() => new Promise((ok) => {
      const t0 = performance.now(); CLB.c.setState({ overlay: 'library', libRoute: '#/situation/E1', libBack: null, libDepth: 1 });
      (function tick() {
        const f = document.querySelector('[data-bridge="library-overlay"] iframe'); let w = null;
        // drawn: the frame shown, at E1, with E1's page in it (the frame's own "Opening the library" is not the page)
        try { w = f && getComputedStyle(f.parentElement).display !== 'none' && f.contentWindow.location.hash === '#/situation/E1' && /signal/i.test(f.contentDocument.title) && f.contentDocument.querySelector('main h1:not(.sr)') ? f.contentWindow : null; } catch (e) {}
        if (w) w.requestAnimationFrame(() => setTimeout(() => ok(Math.round(performance.now() - t0)), 0)); else setTimeout(tick, 4);
      })();
    })));
    await page.waitForTimeout(500); await page.evaluate(() => CLB.c.setState({ overlay: null })); await page.waitForTimeout(300);
  }
  // the coach's Library tab, the first time: Explore at its first page
  await page.evaluate(() => document.querySelector('button[title^="10 ·"]').click()); await page.waitForTimeout(600);
  const explore = await page.evaluate(() => new Promise((ok) => {
    const t0 = performance.now(); CLB.c.setState({ role: 'coach', c: 'CX' });
    (function tick() {
      const f = document.querySelector('[data-bridge="coach-explore"] iframe'); let w = null;
      try { w = f && f.contentDocument.querySelector('main h1:not(.sr)') ? f.contentWindow : null; } catch (e) {}
      if (w) w.requestAnimationFrame(() => setTimeout(() => ok(Math.round(performance.now() - t0)), 0)); else setTimeout(tick, 4);
    })();
  }));
  const bridgeErrs = await page.evaluate(() => CLB.errors.slice());
  await ctx.close();
  return { ready, firstPress, later, review, firstStory, storyTask, explore, warm: median(warm), warmAll: warm, opens, errs: errs.concat(bridgeErrs) };
}

async function library() {
  const { ctx, page, errs } = await slowPage();
  const t0 = Date.now();
  await page.goto(BASE + '/constellation/library?as=coach&m=sarah#/');
  await page.waitForFunction(() => document.querySelector('main#main h1'), null, { timeout: 60000, polling: 16 });
  const ready = Date.now() - t0;
  await page.waitForTimeout(1500);
  // a link's hashchange comes a task after the hash is set, and may come after the frame the timing waits for:
  // the address moves without one, and the page is drawn by the event dispatched here, inside the timing
  const go = (r) => timed(page, (r) => { history.pushState(null, '', r); window.dispatchEvent(new HashChangeEvent('hashchange')); }, r);
  const gapsFirst = await go('#/gaps'); await page.waitForTimeout(300);
  await go('#/'); await page.waitForTimeout(300);
  const gapsSecond = await go('#/gaps'); await page.waitForTimeout(300);
  const first = {}, warm = {};
  for (const r of ROUTES) { first[r] = await go(r); await page.waitForTimeout(250); }
  for (const r of ROUTES) { await go('#/gaps'); await page.waitForTimeout(150); warm[r] = await go(r); await page.waitForTimeout(250); }
  await ctx.close();
  return { ready, gapsFirst, gapsSecond, first, warm, errs };
}

const best = (a, b, f) => Math.min(f(a), f(b)), both = (a, b, f) => ' (tries ' + f(a) + ' and ' + f(b) + ')';
let failed = 0;
function check(ms, budget, what) { const ok = ms < budget; if (!ok) failed++; console.log(`  ${ok ? 'ok ' : 'NOT'} ${String(ms).padStart(5)} ms  (under ${budget})  ${what}`); }
try {
  console.log(`speed at ${RATE}x CPU, ${W}x${H}`);
  const A = [await app(), await app()], L = [await library(), await library()];
  for (const [i, a] of A.entries()) console.log(`  app try ${i + 1}: ready ${a.ready} · first press ${a.firstPress} · later presses ${a.later.join(', ')} · first Review ${a.review} · first story ${a.firstStory} (longest task ${a.storyTask}) · warm ${a.warmAll.join(', ')} · Library opens ${a.opens.join(', ')} · Explore ${a.explore}`);
  for (const [i, l] of L.entries()) console.log(`  Library try ${i + 1}: ready ${l.ready} · gaps ${l.gapsFirst} then ${l.gapsSecond} · first visits ${Object.entries(l.first).map(([r, ms]) => r.split('?')[0] + ' ' + ms).join(', ')}`);
  const ckA = (f, budget, what) => check(best(A[0], A[1], f), budget, what + both(A[0], A[1], f)), ckL = (f, budget, what) => check(best(L[0], L[1], f), budget, what + both(L[0], L[1], f));
  ckA((a) => a.ready, BUDGET.ready, 'the app is ready');
  ckA((a) => a.firstPress, BUDGET.firstPress, 'the first step pressed is painted');
  ckA((a) => a.firstStory, BUDGET.firstStory, 'the first story opened from This week is painted');
  ckA((a) => a.storyTask, BUDGET.storyTask, 'and its longest task');
  ckA((a) => a.warm, BUDGET.warmPress, 'a warm change of tab is painted (median)');
  ckL((l) => l.gapsFirst, BUDGET.gapsFirst, '#/gaps, first visit');
  ckL((l) => l.gapsSecond, BUDGET.gapsSecond, '#/gaps, second visit');
  ckL((l) => l.first['#/situation/E1'], BUDGET.e1First, '#/situation/E1, first visit');
  for (const r of ROUTES) ckL((l) => l.warm[r], BUDGET.route, 'warm ' + (r.length > 60 ? r.slice(0, 57) + '…' : r));
  ckA((a) => a.opens[0], BUDGET.firstOpen, 'the Library in the app, opened at E1 the first time');
  ckA((a) => Math.max(a.opens[1], a.opens[2]), BUDGET.open, 'the Library in the app, opened at E1 the second and third time');
  ckA((a) => a.explore, BUDGET.explore, 'the coach’s Library tab, opened the first time');
  const errs = A.concat(L).flatMap((x) => x.errs);
  if (errs.length) { failed++; console.log('  NOT errors: ' + errs.slice(0, 5).join(' | ')); }
} finally {
  await browser.close(); server.kill();
}
console.log(failed ? `\n${failed} over budget` : '\nevery budget met');
process.exit(failed ? 1 : 0);
