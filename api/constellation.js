/* Constellation — the back end of the prototype at /constellation and its Library.

   One function, many routes: vercel.json rewrites /api/constellation/<path> to this file with
   ?path=<path>. Everything it reads is in the repo: the corpus bundle (constellation/data/corpus.json,
   exported by the corpus repo), the demo world (constellation/data/demo.json: six fictional members,
   three coaches) and the shared core (constellation/lib/core.js), the same code the browser runs.

   Read routes (GET, cacheable)
     /                              what is here, with counts
     /members  /members/:id         the clients, with their situations, heroes and coach
     /members/:id/reading           a coach's prep reading: stories for their situations, from their heroes first
     /members/:id/season?weeks=8    their weeks as the corpus matcher would serve them
     /coaches  /coaches/:id         the coaches and who they coach
     /demo                          the demo world the prototype boots from
     /icons?field=&domain=&stance=&sit=&era=&q=&limit=&offset=      /icons/:id
     /stories?sit=&icon=&reach=&status=&era=&limit=&offset=         /stories/:id
     /situations  /situations/:id   /eras  /eras/:id  /search?q=
   Write routes (no cache)
     GET  /state?ns=                the shared verification ledger and this browser's own record
     POST /state/ledger             { story, by, note } a coach has read a story against its source
     DELETE /state/ledger?story=    take a check back
     PUT  /state/user?ns=           { saved, trails, notes } this browser's own record

   No route returns survey popularity numbers or law titles: the bundle never carries them. */

const CLC = require('../constellation/lib/core.js');
const corpus = require('../constellation/data/corpus.json');
const demo = require('../constellation/data/demo.json');
const store = require('./_constellation-store.js');

let LIB = null, MATCH = null;
function lib() { if (!LIB) { LIB = CLC.merge(corpus, demo); MATCH = CLC.matcher(corpus); } return LIB; }

const NS = /^[a-z0-9-]{8,48}$/;
const MAX_USER_BYTES = 32 * 1024;

function send(res, code, body, cache) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cache ? 'public, max-age=60, s-maxage=600, stale-while-revalidate=86400' : 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.end(JSON.stringify(body));
}
const ok = (res, body) => send(res, 200, body, true);
const fail = (res, code, error) => send(res, code, { error }, false);

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return null; } }
  const chunks = []; let n = 0;
  for await (const c of req) { n += c.length; if (n > MAX_USER_BYTES * 2) return null; chunks.push(c); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { return null; }
}

function page(list, q) {
  const limit = Math.max(1, Math.min(200, parseInt(q.limit, 10) || 50));
  const offset = Math.max(0, parseInt(q.offset, 10) || 0);
  return { total: list.length, offset, limit, items: list.slice(offset, offset + limit) };
}

function sitFrom(L, v) { return v ? L.sit[v] || L.sitByKey[v] || null : null; }

async function ledger() { return (await store.get('ledger')) || {}; }
async function verifiedLib() {
  const L = lib();
  const led = await ledger().catch(() => ({}));
  if (!Object.keys(led).length) return L;
  return CLC.applyVerification(CLC.merge(corpus, demo), led);
}

const routes = {
  async ''(req, res) {
    const L = lib();
    ok(res, {
      name: 'Constellation API', corpus: corpus.meta.commit, store: store.kind(),
      counts: { members: L.order.length, coaches: Object.keys(L.coaches).length, icons: L.icons.length, stories: L.stories.length, situations: L.situations.length },
      rules: corpus.meta.rules,
      routes: ['members', 'members/:id', 'members/:id/reading', 'members/:id/season', 'coaches', 'coaches/:id', 'demo', 'icons', 'icons/:id',
        'stories', 'stories/:id', 'situations', 'situations/:id', 'eras', 'eras/:id', 'search?q=', 'state'],
    });
  },
  async members(req, res, [id, sub]) {
    const L = lib();
    if (!id) return ok(res, { items: L.order.map((m) => CLC.member(L, m)) });
    if (!L.members[id]) return fail(res, 404, `no member ${id}`);
    if (!sub) return ok(res, CLC.member(L, id));
    if (sub === 'reading') return ok(res, CLC.readingFor(L, id, 6));
    if (sub === 'season') {
      const weeks = Math.max(1, Math.min(40, parseInt(req.query.weeks, 10) || 8));
      return ok(res, { member: id, weeks, note: 'Every story here is a recall draft until a coach reads it against its source.', season: CLC.season(L, MATCH, id, weeks) });
    }
    fail(res, 404, `no route members/${id}/${sub}`);
  },
  async coaches(req, res, [id]) {
    const L = lib();
    const view = (c) => ({ ...c, members: L.order.filter((m) => L.members[m].coach === c.id).map((m) => ({ id: m, name: L.members[m].name, role: L.members[m].role })) });
    if (!id) return ok(res, { items: Object.values(L.coaches).map(view) });
    if (!L.coaches[id]) return fail(res, 404, `no coach ${id}`);
    ok(res, view(L.coaches[id]));
  },
  async demo(req, res) {
    ok(res, { coaches: demo.coaches, members: demo.members, order: demo.order, personas: demo.personas, msgs: demo.msgs, source: 'api' });
  },
  async icons(req, res, [id]) {
    const L = lib(), q = req.query;
    if (id) {
      const ic = L.icon[id] || Object.values(L.icon).find((i) => i.proto === id);
      if (!ic) return fail(res, 404, `no icon ${id}`);
      return ok(res, { ...ic, stories: ic.stories.map((s) => CLC.storyCard(L, L.story[s])), works: ic.works.map((w) => L.work[w]), trails: CLC.iconTrails(L, ic.id) });
    }
    let list = L.icons;
    if (q.q) { const hits = new Set(CLC.search(L, q.q, 1000).icons.map((i) => i.id)); list = list.filter((i) => hits.has(i.id)); }
    if (q.field) list = list.filter((i) => i.field === q.field);
    if (q.domain) list = list.filter((i) => i.domain === q.domain);
    if (q.stance) list = list.filter((i) => i.stance === q.stance);
    if (q.era) list = list.filter((i) => CLC.eraOf(i.year).id === q.era);
    if (q.sit) { const s = sitFrom(L, q.sit); if (!s) return fail(res, 404, `no situation ${q.sit}`); list = list.filter((i) => i.keys.indexOf(s.key) >= 0); }
    ok(res, page(list.map((i) => CLC.iconCard(L, i)), q));
  },
  async stories(req, res, [id]) {
    const L = await verifiedLib(), q = req.query;
    if (id) {
      const s = L.story[CLC.resolve(L, id)];
      if (!s) return fail(res, 404, `no story ${id}`);
      return ok(res, { ...s, statusNote: (CLC.STATUS[s.status] || {}).note, icon: CLC.iconCard(L, L.icon[s.icon]), trails: CLC.storyTrails(L, s.id) });
    }
    let list = L.stories;
    if (q.sit) { const s = sitFrom(L, q.sit); if (!s) return fail(res, 404, `no situation ${q.sit}`); list = list.filter((x) => x.keys.indexOf(s.key) >= 0); }
    if (q.icon) list = list.filter((x) => x.icon === q.icon);
    if (q.reach) list = list.filter((x) => x.reach === q.reach);
    if (q.status) list = list.filter((x) => (q.status === 'verified' ? x.verified : q.status === 'draft' ? !x.verified : x.status === q.status));
    if (q.era) list = list.filter((x) => CLC.eraOf(x.year).id === q.era);
    ok(res, page(list.map((x) => CLC.storyCard(L, x)), q));
  },
  async situations(req, res, [id]) {
    const L = lib();
    if (!id) return ok(res, { items: L.situations.map((s) => ({ id: s.id, family: s.family, key: s.key, chip: s.chip, line: s.line, member_line: s.member_line, stories: s.stories.length, people: s.icons.length })) });
    const s = sitFrom(L, id);
    if (!s) return fail(res, 404, `no situation ${id}`);
    ok(res, { ...s, stories: s.stories.map((x) => CLC.storyCard(L, L.story[x])), icons: s.icons.map((x) => CLC.iconCard(L, L.icon[x])) });
  },
  async eras(req, res, [id]) {
    const L = lib();
    if (!id) return ok(res, { items: CLC.eras(L) });
    const v = CLC.eraView(L, id);
    if (!v.stories.length && !v.icons.length) return fail(res, 404, `no era ${id}`);
    ok(res, v);
  },
  async search(req, res) {
    const q = String(req.query.q || '').slice(0, 120);
    ok(res, CLC.search(lib(), q, Math.max(1, Math.min(50, parseInt(req.query.limit, 10) || 12))));
  },
  async state(req, res, [which]) {
    const L = lib(), ns = String(req.query.ns || '');
    if (req.method === 'GET' && !which) {
      const user = NS.test(ns) ? (await store.get('user:' + ns)) || {} : {};
      return send(res, 200, { store: store.kind(), ledger: await ledger(), user }, false);
    }
    if (which === 'ledger' && req.method === 'POST') {
      const b = await readBody(req);
      const id = b && CLC.resolve(L, String(b.story || ''));
      if (!id || !L.story[id]) return fail(res, 400, 'story must be a story id');
      if (L.story[id].status === 'sample-verified') return fail(res, 409, 'already verified');
      if (!b.by || !L.coaches[b.by]) return fail(res, 400, 'by must be a coach id');
      const led = await ledger();
      led[id] = { by: b.by, at: new Date().toISOString(), note: String(b.note || '').slice(0, 400) };
      await store.set('ledger', led);
      return send(res, 200, { store: store.kind(), ledger: led }, false);
    }
    if (which === 'ledger' && req.method === 'DELETE') {
      const led = await ledger(), id = CLC.resolve(L, String(req.query.story || ''));
      delete led[id]; await store.set('ledger', led);
      return send(res, 200, { store: store.kind(), ledger: led }, false);
    }
    if (which === 'user' && req.method === 'PUT') {
      if (!NS.test(ns)) return fail(res, 400, 'ns must be 8 to 48 lowercase letters, digits or hyphens');
      const b = await readBody(req);
      if (!b || typeof b !== 'object' || Array.isArray(b)) return fail(res, 400, 'body must be a JSON object');
      const doc = { saved: Array.isArray(b.saved) ? b.saved.filter((x) => typeof x === 'string').slice(0, 500) : [],
        trails: Array.isArray(b.trails) ? b.trails.slice(0, 50) : [], notes: b.notes && typeof b.notes === 'object' ? b.notes : {}, at: new Date().toISOString() };
      if (JSON.stringify(doc).length > MAX_USER_BYTES) return fail(res, 413, 'record too large');
      await store.set('user:' + ns, doc);
      return send(res, 200, { store: store.kind(), user: doc }, false);
    }
    fail(res, 405, `${req.method} not allowed on state${which ? '/' + which : ''}`);
  },
};

module.exports = async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://x');
    req.query = req.query || Object.fromEntries(url.searchParams);
    let p = String(req.query.path != null ? req.query.path : url.pathname.replace(/^\/api\/constellation\/?/, ''));
    let parts;
    try { parts = p.split('/').filter(Boolean).map((s) => decodeURIComponent(s)); } catch (e) { return fail(res, 400, 'malformed path'); }
    const head = parts.shift() || '';
    const route = Object.prototype.hasOwnProperty.call(routes, head) ? routes[head] : null;
    if (!route) return fail(res, 404, `no route ${head}`);
    if (req.method !== 'GET' && head !== 'state') return fail(res, 405, 'read only');
    await route(req, res, parts);
  } catch (e) {
    console.error(e);
    fail(res, 500, 'something went wrong');
  }
};
