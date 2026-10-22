// A seeded random walk: 150 clicks in each of five ways in (the member's phone, the coach's console, and the Library
// as a reader, a member and a coach), each click on something a person could press, in the order seed 7 picks.
// Content inside a closed <details> is skipped, as are .sr links (a reader's shortcuts) and links that leave the
// site. It fails on any console error, uncaught error, failed request or refused request, and on any error the
// bridge records. A load cut short (ERR_ABORTED) once the page or frame that asked for it has moved on is not a
// fault: it is printed as information. A write cut short (a POST, PUT or DELETE) is always a fault. A failure prints the mode, the click, what was pressed and the address, so
// the same seed walks the same way to it again.
//   node constellation/tests/walk.mjs [seed] [clicks]
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const HERE = path.dirname(fileURLToPath(import.meta.url));
let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); }
catch (e) { ({ chromium } = createRequire(execSync('npm root -g').toString().trim() + '/')('playwright')); }

const SEED = +(process.argv[2] || 7), CLICKS = +(process.argv[3] || 150);
const MODES = [
  { name: 'member app', url: '/constellation', w: 390, h: 844, touch: true, app: true, setup: () => CLB.c.setState({ role: 'member', m: 'app', tab: 'week' }) },
  { name: 'coach console', url: '/constellation', w: 1440, h: 900, app: true, setup: () => { document.querySelector('button[title^="10 ·"]').click(); CLB.c.setState({ role: 'coach', c: 'C3' }); } },
  { name: 'library reader', url: '/constellation/library?as=reader#/', w: 1280, h: 900 },
  { name: 'library member', url: '/constellation/library?as=member&m=sarah#/', w: 390, h: 844, touch: true },
  { name: 'library coach', url: '/constellation/library?as=coach&m=sarah#/', w: 1280, h: 900 },
];

// mulberry32: the same seed, the same walk
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// everything in one document a person could press: visible, enabled, outside a closed <details>, not a .sr link,
// not a link off the site or into a new window. A <summary> is pressable: it opens its own <details>.
const PRESSABLE = () => {
  const out = [];
  document.querySelectorAll('a[href], button, summary, [role="button"], input[type="checkbox"], input[type="radio"]').forEach((el) => {
    if (el.disabled || el.closest('.sr') || el.classList.contains('sr')) return;
    const d = el.closest('details:not([open])'); if (d && !(el.tagName === 'SUMMARY' && el.parentElement === d)) return;
    if (el.tagName === 'A') { const h = el.getAttribute('href') || ''; if (el.target === '_blank' || el.hasAttribute('download') || (/^[a-z]+:/i.test(h) && !h.startsWith(location.origin))) return; }
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.pointerEvents === 'none') return;
    let hidden = false; for (let e = el; e; e = e.parentElement) if (getComputedStyle(e).display === 'none') { hidden = true; break; }
    if (hidden) return;
    out.push(el);
  });
  return out;
};

const port = await new Promise((r) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const server = spawn(process.execPath, [path.join(HERE, '../tools/dev-server.mjs'), String(port)], { stdio: 'ignore' });
const BASE = `http://localhost:${port}`;
await new Promise((r) => setTimeout(r, 600));
const browser = await chromium.launch();
const faults = [], info = [];
let clicks = 0;

try {
  const next = rng(SEED);
  for (const mode of MODES) {
    const ctx = await browser.newContext({ viewport: { width: mode.w, height: mode.h }, hasTouch: !!mode.touch, isMobile: !!mode.touch });
    const page = await ctx.newPage();
    let step = 0, last = '(the first page)';
    const where = () => `${mode.name} click ${step} (${last}) at ${page.url().replace(BASE, '')}`;
    // a request cut short because its document or frame moved on (a new page, a frame closed or reloaded, the Library
    // dropping a page's fetch as it leaves the page) is news, not a fault; cut short anywhere else, it is a fault
    // (a frame's address changes only once its next page arrives, so a cut is judged after the click has settled)
    const askedAt = new WeakMap(), cut = [];
    page.on('request', (r) => { try { askedAt.set(r, r.frame().url()); } catch (e) {} });
    page.on('requestfailed', (r) => {
      const why = (r.failure() || {}).errorText || '', at = `${where()}: ${why} ${r.url().replace(BASE, '')}`;
      if (/ERR_ABORTED/.test(why)) cut.push([r, at]); else faults.push(at);
    });
    // a write cut short is a lost write whatever the frame did (a check, a saved list), so only a read may be news
    const judge = () => cut.splice(0).forEach(([r, at]) => {
      let left = true; try { left = r.isNavigationRequest() || r.frame().isDetached() || r.frame().url() !== askedAt.get(r); } catch (e) {}
      (left && r.method() === 'GET' ? info : faults).push(at);
    });
    page.on('response', (r) => { if (r.status() >= 400) faults.push(`${where()}: ${r.status()} ${r.url().replace(BASE, '')}`); });
    page.on('console', (m) => { if (m.type() === 'error') faults.push(`${where()}: console: ${m.text()}`); });
    page.on('pageerror', (e) => faults.push(`${where()}: uncaught: ${e.message}`));
    page.on('popup', (p) => { faults.push(`${where()}: opened a window at ${p.url()}`); p.close().catch(() => {}); });
    const start = async () => {
      await page.goto(BASE + mode.url);
      if (mode.app) { await page.waitForFunction(() => window.CLB && CLB.ready && CLB.c, null, { timeout: 30000 }); await page.evaluate(mode.setup); }
      else await page.waitForSelector('main#main h1', { timeout: 30000 });
      await page.waitForTimeout(400);
    };
    await start();
    for (step = 1; step <= CLICKS; step++) {
      if (!page.url().startsWith(BASE + '/constellation')) { info.push(`${where()}: left for ${page.url()}, walked back to the start`); await start(); }
      // what can be pressed in the page and in each frame of the same site
      const frames = page.frames().filter((f) => f.url().startsWith(BASE));
      const lists = [];
      for (const f of frames) {
        const n = await f.evaluate((src) => { window.__walk = new Function('return (' + src + ')()')(); return window.__walk.length; }, PRESSABLE.toString()).catch(() => 0);
        for (let i = 0; i < n; i++) lists.push([f, i]);
      }
      if (!lists.length) { info.push(`${where()}: nothing to press, walked back to the start`); await start(); continue; }
      const [f, i] = lists[Math.floor(next() * lists.length)];
      last = await f.evaluate((i) => { const el = window.__walk[i]; const t = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('href') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 50); el.click(); return el.tagName.toLowerCase() + ' “' + t + '”'; }, i).catch((e) => `a press that did not land (${e.message.split('\n')[0].slice(0, 60)})`);
      clicks++;
      await page.waitForTimeout(mode.app ? 160 : 120);
      judge();
      if (mode.app) { const errs = await page.evaluate(() => (window.CLB && CLB.errors ? CLB.errors.splice(0) : [])).catch(() => []); errs.forEach((e) => faults.push(`${where()}: bridge: ${e}`)); }
    }
    await page.waitForTimeout(300); judge();
    await ctx.close();
    console.log(`  ${mode.name}: ${CLICKS} clicks`);
  }
} finally {
  await browser.close(); server.kill();
}
if (info.length) { console.log(`\n${info.length} for information:`); info.slice(0, 20).forEach((x) => console.log('  · ' + x)); }
if (faults.length) { console.log(`\n${faults.length} faults:`); faults.slice(0, 40).forEach((x) => console.log('  NOT ' + x)); }
console.log(`\nseed ${SEED}, ${clicks} clicks in ${MODES.length} modes, ${faults.length} faults`);
process.exit(faults.length ? 1 : 0);
