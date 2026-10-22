// The API through a real HTTP server, routed as Vercel routes it.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const handler = require('../../api/constellation.js');
const store = require('../../api/_constellation-store.js');

let base, server;
test.before(async () => {
  server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    req.query = Object.fromEntries(u.searchParams);
    req.query.path = u.pathname.replace(/^\/api\/constellation\/?/, '');
    handler(req, res);
  });
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}/api/constellation`;
});
test.after(() => server.close());

const get = async (p) => { const r = await fetch(base + p); return { status: r.status, body: await r.json(), headers: r.headers }; };
const call = async (method, p, body) => {
  const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json() };
};

test('index names the routes and the counts', async () => {
  const r = await get('');
  assert.equal(r.status, 200);
  assert.equal(r.body.counts.members, 6);
  assert.equal(r.body.counts.coaches, 3);
  assert.ok(r.body.counts.stories > 500);
  assert.equal(r.body.store, 'memory');
  assert.match(r.headers.get('cache-control'), /s-maxage/);
});

test('members and coaches carry the demo world', async () => {
  const m = await get('/members');
  assert.deepEqual(m.body.items.map((x) => x.id), ['sarah', 'maya', 'michael', 'david', 'priya', 'tom']);
  const sarah = await get('/members/sarah');
  assert.equal(sarah.body.coach.name, 'Jim Elms');
  assert.deepEqual(sarah.body.situations.map((s) => s.id), ['A2', 'E1', 'D3']);
  assert.equal(sarah.body.heroes.core[0].id, 'barack-obama');
  const maya = await get('/members/maya');
  assert.equal(maya.body.coach.name, 'Bret Leece');
  const c = await get('/coaches');
  const jim = c.body.items.find((x) => x.id === 'jim');
  assert.deepEqual(jim.members.map((x) => x.id), ['sarah', 'david', 'priya', 'tom']);
  assert.equal((await get('/coaches/jennifer')).body.members[0].id, 'michael');
  assert.equal((await get('/members/nobody')).status, 404);
});

test('reading and season for a member', async () => {
  const r = await get('/members/sarah/reading');
  assert.equal(r.body.bySituation[0].sit.id, 'A2');
  assert.ok(r.body.bySituation[0].fromHeroes.some((s) => s.icon === 'barack-obama'));
  const s = await get('/members/michael/season?weeks=4');
  assert.equal(s.body.season.length, 4);
  assert.equal(s.body.season[0].sit.id, 'C2');
});

test('icons, stories, situations, eras and search', async () => {
  const bjk = await get('/icons/billie-jean-king');
  assert.equal(bjk.body.name, 'Billie Jean King');
  assert.ok(bjk.body.stories.length >= 3);
  assert.ok(bjk.body.trails.situations.length > 0);
  assert.equal((await get('/icons/obama')).body.id, 'barack-obama', 'prototype ids resolve');
  const sport = await get('/icons?field=sport&limit=5');
  assert.equal(sport.body.items.length, 5);
  assert.ok(sport.body.total > 60);
  const a2 = await get('/situations/A2');
  assert.equal(a2.body.key, 'renegotiating-standing');
  assert.ok(a2.body.moves.length > 0 && a2.body.lines.length > 0);
  assert.equal((await get('/situations/renegotiating-standing')).body.id, 'A2');
  const twin = await get('/stories/s-A2-barack-obama');
  assert.equal(twin.body.id, 'st-obama-1990-law-review', 'a twinned corpus id resolves to the sample');
  const st = await get('/stories?sit=E1&status=verified');
  assert.ok(st.body.items.every((x) => x.verified));
  assert.ok((await get('/eras')).body.items.some((e) => e.id === '1970s'));
  assert.ok((await get('/eras/1970s')).body.stories.length > 5);
  assert.equal((await get('/search?q=katherine johnson')).body.icons[0].id, 'katherine-johnson');
  assert.equal((await get('/nope')).status, 404);
  assert.equal((await get('/icons/%E0%A4%A')).status, 400, 'a malformed escape is a bad request');
  assert.equal((await call('POST', '/members')).status, 405);
});

test('no route leaks survey numbers or law references', async () => {
  for (const p of ['/icons/barack-obama', '/stories/s-A1-beverley-mclachlin', '/situations/A1', '/members/sarah/season?weeks=12']) {
    const t = JSON.stringify((await get(p)).body);
    for (const w of ['salience', 'popularity', 'yougov', 'YouGov', 'law_refs']) assert.ok(!t.includes(w), `${p} carries ${w}`);
  }
});

test('the ledger verifies a story for everyone, and a browser keeps its own record', async () => {
  store._reset();
  const id = 's-A1-beverley-mclachlin';
  assert.equal((await get('/stories/' + id)).body.verified, false);
  assert.equal((await call('POST', '/state/ledger', { story: id, by: 'nobody' })).status, 400);
  assert.equal((await call('POST', '/state/ledger', { story: 'st-bjk-1973-riggs', by: 'jim' })).status, 409);
  const v = await call('POST', '/state/ledger', { story: id, by: 'jim', note: 'Read against the memoir.' });
  assert.equal(v.status, 200);
  assert.equal(v.body.ledger[id].by, 'jim');
  const after = await get('/stories/' + id);
  assert.equal(after.body.verified, true);
  assert.equal(after.body.status, 'verified');
  assert.equal((await call('DELETE', '/state/ledger?story=' + id)).body.ledger[id], undefined);
  assert.equal((await call('PUT', '/state/user?ns=bad')).status, 400);
  const u = await call('PUT', '/state/user?ns=abcdef123456', { saved: ['st-bjk-1973-riggs'], trails: [{ name: 't', nodes: ['icon:rihanna'] }] });
  assert.equal(u.status, 200);
  const g = await get('/state?ns=abcdef123456');
  assert.deepEqual(g.body.user.saved, ['st-bjk-1973-riggs']);
  assert.equal(g.body.store, 'memory');
});

test('with a Redis store connected, records go to it over the Upstash REST protocol', async () => {
  const db = new Map(), seen = [];
  const kv = http.createServer(async (req, res) => {
    let b = ''; for await (const c of req) b += c;
    const [cmd, key, val] = JSON.parse(b);
    seen.push([cmd, key, req.headers.authorization]);
    const result = cmd === 'GET' ? (db.has(key) ? db.get(key) : null) : (db.set(key, val), 'OK');
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ result }));
  });
  await new Promise((r) => kv.listen(0, r));
  process.env.KV_REST_API_URL = `http://127.0.0.1:${kv.address().port}`;
  process.env.KV_REST_API_TOKEN = 'test-token';
  try {
    assert.equal(store.kind(), 'kv');
    const v = await call('POST', '/state/ledger', { story: 's-A2-tom-petty', by: 'bret', note: 'checked' });
    assert.equal(v.body.store, 'kv');
    assert.ok(JSON.parse(db.get('constellation:ledger'))['s-A2-tom-petty']);
    assert.ok(seen.every(([, , auth]) => auth === 'Bearer test-token'));
    assert.equal((await get('/stories/s-A2-tom-petty')).body.verified, true);
  } finally {
    delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN; kv.close();
  }
});

test('likeness routes', async () => {
  const s = await get('/stories/st-bjk-1973-riggs/similar');
  assert.equal(s.status, 200); assert.equal(s.body.sameWeek.length, 6); assert.ok(s.body.sameWorld.length > 0);
  const k = await get('/icons/obama/kindred');
  assert.equal(k.body.icon, 'barack-obama'); assert.ok(k.body.sameWeek[0].reasons.length);
  const e = await get('/icons/billie-jean-king/ego');
  assert.ok(e.body.situations.length >= 3);
  const w = await get('/situations/web');
  assert.equal(w.body.nodes.length, 22);
  const p = await get('/path?from=billie-jean-king&to=abraham-lincoln');
  assert.equal(p.body.steps.length, 2);
  assert.equal((await get('/path?from=nobody&to=rihanna')).status, 404);
  assert.equal((await get('/icons/rihanna/nope')).status, 404);
});

test('asking and networks', async () => {
  const a = await get('/ask?t=' + encodeURIComponent('Sarah is announcing the reorg Thursday and Dan wanted her job'));
  assert.equal(a.status, 200);
  assert.ok(/sit=E1%2BA2/.test(a.body.query) && /m=sarah/.test(a.body.query), a.body.query);
  // the answer leads with what a coach can do now, leaving out what Sarah already has
  assert.ok(a.body.ready && a.body.ready.verified && a.body.ready.id !== 'st-obama-2008-clinton', 'a checked story Sarah does not have leads');
  assert.ok(a.body.oneCheck && !a.body.oneCheck.verified && a.body.oneCheck.source, 'then the draft one check from sending, with its source');
  assert.ok(a.body.items.slice(0, 3).some((it) => it.name === 'Barack Obama' && it.reasons.some((r) => r.type === 'scene')), 'the rival scene is quoted');
  assert.ok(a.body.chips.some((c) => /^Said to: the colleague who wanted the job/.test(c.label)) && a.body.chips.some((c) => /^In the room: a team meeting/.test(c.label)), 'who the line is said to, and the room');
  const thin = await get('/ask?sit=C2&field=law');
  assert.ok(thin.body.total < 4 && thin.body.nearest.length >= 2);
  assert.equal((await get('/ask')).status, 400);
  assert.equal((await get('/ask?t=x&m=nobody')).status, 404);
  const sh = await get('/members/sarah/shelf');
  assert.equal(sh.body.groups[0].group, 'For Sarah this week'); assert.ok(sh.body.groups[0].items.every((i) => typeof i.n === 'number'));
  const nr = await get('/members/sarah/near');
  assert.deepEqual(nr.body.situations, ['A2', 'E1', 'D3']);
  assert.ok(nr.body.lives.some((l) => l.id === 'billie-jean-king' && l.held.length === 3));
  const k = await get('/icons/abraham-lincoln/kindred');
  assert.ok(k.body.kin.length >= 6 && k.body.kin.every((x) => x.why.length >= 2));
  const p = await get('/path?from=rihanna&to=abraham-lincoln');
  assert.ok(p.body.ways.length >= 2 && p.body.ways.every((w) => w.every((s) => s.why.length >= 2)));
});
