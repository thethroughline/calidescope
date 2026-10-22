// The house voice, checked on the screens people read. Walks the app as each member and each coach, and the
// Library in its three modes, takes the text as rendered, removes what the corpus and the demo data say (a
// story's own words are the story's), and fails on what is left that breaks a rule: a word the house avoids,
// "X, not Y", an exclamation mark, an American spelling, a corpus key where a person should read words, or a
// second name for one thing. Each failure names the screen, the rule and the words around it.
//   node constellation/tests/voice.mjs
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const HERE = path.dirname(fileURLToPath(import.meta.url));
let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); }
catch (e) { ({ chromium } = createRequire(execSync('npm root -g').toString().trim() + '/')('playwright')); }
const J = (p) => JSON.parse(fs.readFileSync(path.join(HERE, p), 'utf8'));
const corpus = J('../data/corpus.json'), demo = J('../data/demo.json');

// ---------- what the corpus and the demo data say, which the rules leave alone ----------
const own = new Set();
const take = (v) => {
  if (typeof v === 'string') { const t = v.trim(); if (t.length >= 12) own.add(t); return; }
  if (Array.isArray(v)) return v.forEach(take);
  if (v && typeof v === 'object') Object.values(v).forEach(take);
};
take(corpus); take(demo);
for (const f of ['../js/constellation-proto-data.js']) {
  // the prototype's own data file: its strings are the demo's script, quoted as written
  const src = fs.readFileSync(path.join(HERE, f), 'utf8');
  for (const m of src.matchAll(/'((?:[^'\\]|\\.){12,})'|"((?:[^"\\]|\\.){12,})"/g)) own.add((m[1] || m[2]).replace(/\\'/g, "'").replace(/\\"/g, '"'));
}
const ownList = [...own].sort((a, b) => b.length - a.length);
const KEYS = corpus.situations.map((s) => s.match_key).filter(Boolean);
function residue(text) {
  let t = ' ' + text + ' ';
  for (const s of ownList) if (t.includes(s)) t = t.split(s).join(' ');
  // quotations are someone's words
  return t.replace(/“[^”]*”/g, ' ').replace(/"[^"\n]*"/g, ' ').replace(/‘[^’\n]*’/g, ' ');
}

// ---------- the rules ----------
const US = ['color', 'colors', 'favorite', 'center', 'centers', 'behavior', 'organize', 'organized', 'analyze', 'honor', 'labor', 'defense', 'catalog', 'traveled', 'modeled', 'judgment call', 'gray'];
const RULES = [
  ['a word the house avoids', /\b(rather than|instead of|actually|really|just)\b/i],
  ['"X, not Y"', /\b\w+, not (a |an |the )?\w+/],
  ['an exclamation mark', /[A-Za-z)]!(\s|$)/],
  ['an American spelling', new RegExp('\\b(' + US.join('|') + ')\\b')],   // lower case: "Labor Department" is a name
  ['a corpus key', new RegExp('\\b(' + KEYS.join('|') + ')\\b')],
  ['a second name for a checked story or a draft', /\bVerified\b|Draft — must verify|\bmust verify\b/],
  ['engine words', /\bpaired\b|\bslot\b|\bReachability\b|\bKeys inferred\b|\bthe rule proposes\b|\bauto-send\b/i],
  ['a broken join', /a week where there|Leads by [A-Z]|\bLeads by \(proposed\)/],
];

const port = await new Promise((r) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const server = spawn(process.execPath, [path.join(HERE, '../tools/dev-server.mjs'), String(port)], { stdio: 'ignore' });
const BASE = `http://localhost:${port}`;
await new Promise((r) => setTimeout(r, 600));
const browser = await chromium.launch();
const screens = [];
const shot = async (page, label) => {
  const t = await page.evaluate(() => {
    const vis = (sel) => [...document.querySelectorAll(sel)].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.innerText).join('\n');
    const st = window.CLB && CLB.c && CLB.c.state, v = window.CPE && CLB.c ? CPE.vals(CLB.c) : {};
    return [vis('[data-screen-label="Member app"]'), vis('[data-screen-label="Coach console"]'), st && st.toast, st && st.ctoast, v.cn && v.cn.show ? v.cn.text : '', v.nt && v.nt.show ? v.nt.text : ''].filter(Boolean).join('\n');
  }).catch(() => '');
  let frames = '';
  for (const f of page.frames()) { if (f === page.mainFrame()) continue; frames += '\n' + await f.evaluate(() => (document.querySelector('main') || document.body).innerText).catch(() => ''); }
  screens.push({ label, text: t + frames });
};
try {
  // ---------- the app ----------
  for (const persona of ['Sarah', 'Maya', 'Michael']) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1100 } });
    await page.goto(`${BASE}/constellation`); await page.waitForFunction(() => window.CLB && CLB.ready && CLB.lib);
    await page.locator('button', { hasText: persona + ',' }).first().click(); await page.waitForTimeout(300);
    for (const i of [1, 3, 4, 6, 7, 8, 9, 10, 11]) { await page.click(`button[title^="${i} ·"]`); await page.waitForTimeout(350); await shot(page, `${persona} clock ${i}`); }
    await page.click('button[title^="9 ·"]'); await page.waitForTimeout(300);
    await page.evaluate(() => CLB.c.setState({ role: 'member', m: 'app', published: true, overlay: null }));
    for (const tab of ['week', 'ask', 'heroes', 'you']) { await page.evaluate((tab) => CLB.c.setState({ tab, overlay: null }), tab); await page.waitForTimeout(300); await shot(page, `${persona} ${tab}`); }
    const ids = await page.evaluate(() => { const st = CLB.c.state, S = CPD.story, core = st.core.length ? st.core : CPD.members[st.p].core, ss = Object.keys(S);
      return { ver: ss.find((k) => core.includes(S[k].hero) && S[k].verified), dr: ss.find((k) => core.includes(S[k].hero) && !S[k].verified), far: ss.find((k) => !core.includes(S[k].hero) && !S[k].verified), hero: core[0] }; });
    for (const sid of [ids.ver, ids.dr, ids.far].filter(Boolean)) { await page.evaluate((sid) => CLB.c.setState({ overlay: 'story', sid, sctx: {}, sstack: [] }), sid); await page.waitForTimeout(350); await shot(page, `${persona} story ${sid}`); }
    await page.evaluate((hid) => CLB.c.setState({ overlay: 'hero', hid, hctx: {}, sstack: [] }), ids.hero); await page.waitForTimeout(350); await shot(page, `${persona} hero`);
    await page.evaluate(() => CLB.c.setState({ overlay: 'library', libRoute: '#/', libBack: null, libDepth: 1 })); await page.waitForTimeout(1200); await shot(page, `${persona} library`);
    await page.evaluate(() => CLB.c.setState({ overlay: null, tab: 'ask', ask: Object.assign({}, CLB.c.state.ask, { stage: 'confirm', text: 'I still answer every client email myself at midnight.', key: null, story: null, sent: false }) })); await page.waitForTimeout(300);
    await page.locator('[data-screen-label="M8 Ask"] button').first().click().catch(() => {}); await page.waitForTimeout(1600); await shot(page, `${persona} ask answer`);
    await page.click('button[title^="10 ·"]'); await page.waitForTimeout(400);
    await page.evaluate(() => CLB.c.setState({ role: 'coach' }));
    for (const c of ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'CK']) { await page.evaluate((c) => CLB.c.setState({ c, swapFor: null, rvOpen: null, planOpen: null }), c); await page.waitForTimeout(350); await shot(page, `${persona} coach ${c}`); }
    for (const mid of ['sarah', 'michael', 'david']) { await page.evaluate((mid) => CLB.c.setState({ c: 'C3', rvAll: true, rvOpen: mid, fillOpen: mid }), mid); await page.waitForTimeout(350); await shot(page, `${persona} coach review ${mid}`); }
    await page.evaluate(() => CLB.c.setState({ c: 'C3', rvAll: false, rvOpen: null, swapFor: 'michael', swapHero: 'all' })); await page.waitForTimeout(350); await shot(page, `${persona} coach swap`);
    await page.close();
  }
  // ---------- the Library, in its three modes ----------
  const routes = ['#/', '#/situations', '#/situation/E1', '#/story/st-bjk-1973-riggs', '#/story/s-A2-elena-kagan', '#/icon/barack-obama', '#/icon/steve-jobs', '#/people', '#/eras', '#/stance/close',
    '#/ask?t=' + encodeURIComponent('She is announcing the reorg on Thursday and the person who wanted her job will be in the room') + '&read=1', '#/path?from=barack-obama&to=serena-williams', '#/cmp?a=st-bjk-1973-riggs&b=s-A2-barack-obama'];
  for (const as of ['reader', 'member', 'coach']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(`${BASE}/constellation/library?as=${as}&m=sarah#/`); await page.waitForSelector('main h1');
    const all = routes.concat(as === 'coach' ? ['#/checks', '#/member/sarah', '#/gaps', '#/near?m=sarah', '#/age?m=sarah'] : as === 'member' ? ['#/near', '#/age', '#/member/sarah'] : []);
    for (const r of all) { await page.evaluate((r) => { location.hash = r; }, r); await page.waitForTimeout(250); screens.push({ label: `library ${as} ${r}`, text: await page.evaluate(() => document.body.innerText) }); }
    await page.close();
  }
} finally {
  await browser.close(); server.kill();
}

let bad = 0;
const seen = new Set();
for (const s of screens) {
  const r = residue(s.text);
  for (const [name, re] of RULES) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    for (const m of r.matchAll(g)) {
      const at = r.slice(Math.max(0, m.index - 50), m.index + m[0].length + 50).replace(/\s+/g, ' ').trim(), key = name + '|' + at;
      if (seen.has(key)) continue; seen.add(key); bad++;
      if (bad <= 60) console.log(`  NOT ${s.label} · ${name}: …${at}…`);
    }
  }
}
console.log(`\n${screens.length} screens read, ${bad} breaks of the house voice`);
process.exit(bad ? 1 : 0);
