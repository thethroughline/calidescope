// node --test constellation/tests
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const CLC = require('../lib/core.js');
const J = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf8'));
const corpus = J('../data/corpus.json'), demo = J('../data/demo.json'), parity = J('./fixtures/parity.json');
const lib = CLC.merge(corpus, demo);

test('the matcher port picks what match.py picks, every member, every week', () => {
  const M = CLC.matcher(corpus);
  let weeks = 0;
  for (const [id, p] of Object.entries(parity)) {
    const log = CLC.replay(M, p.member, p.log.length);
    p.log.forEach((want, w) => {
      const got = log[w];
      for (const k of ['key', 'move', 'mode', 'line', 'story', 'icon', 'logged']) assert.equal(got[k], want[k], `${id} week ${w} ${k}`);
      weeks++;
    });
  }
  assert.ok(weeks >= 600, `checked ${weeks} member-weeks`);
});

test('the merged index holds every corpus story once, plus the samples', () => {
  const twins = Object.keys(demo.twins).length;
  assert.equal(lib.stories.length, corpus.stories.length + demo.samples.length - twins);
  const ids = new Set(lib.stories.map((s) => s.id));
  assert.equal(ids.size, lib.stories.length, 'story ids are unique');
  for (const [sample, rec] of Object.entries(demo.twins)) {
    assert.ok(!ids.has(rec), `${rec} is folded into ${sample}`);
    assert.equal(CLC.resolve(lib, rec), sample);
    assert.equal(lib.story[sample].corpus, rec);
  }
  for (const s of lib.stories) {
    assert.ok(lib.icon[s.icon], `${s.id} has an icon`);
    s.keys.forEach((k) => assert.ok(lib.sitByKey[k], `${s.id} key ${k} is a situation`));
  }
  assert.equal(lib.situations.length, 22);
  lib.situations.forEach((s) => { assert.ok(s.chip && s.line, `${s.id} has a label and a line`); assert.ok(s.stories.length > 0, `${s.id} has stories`); });
});

test('nothing in the index is sendable until it is verified', () => {
  const recall = lib.stories.filter((s) => s.origin === 'corpus');
  assert.ok(recall.length > 500);
  assert.ok(recall.every((s) => !s.verified && s.status === 'recall'));
  const one = recall[0].id;
  const lib2 = CLC.applyVerification(CLC.merge(corpus, demo), { [one]: { by: 'jim', at: '2026-10-22', note: 'checked' } });
  assert.equal(lib2.story[one].verified, true);
  assert.equal(lib2.story[one].status, 'verified');
  assert.equal(lib.story[one].verified, false, 'the original index is untouched');
});

test('prototype heroes keep their ids through the map', () => {
  assert.equal(demo.idmap.obama, 'barack-obama');
  assert.equal(lib.icon['barack-obama'].proto, 'obama');
  assert.equal(lib.icon['reshma-saujani'].inCorpus, false);
  assert.deepEqual(demo.members.sarah.heroes_icons.core, ['barack-obama', 'serena-williams', 'rihanna']);
  assert.equal(lib.icons.length, corpus.icons.length + Object.values(demo.idmap).filter((v) => !corpus.icons.some((i) => i.id === v)).length);
});

test('search finds people, stories and situations', () => {
  const r = CLC.search(lib, 'billie jean');
  assert.equal(r.icons[0].id, 'billie-jean-king');
  assert.ok(r.stories.some((s) => s.icon === 'billie-jean-king'));
  assert.ok(CLC.search(lib, 'peers').situations.some((s) => s.id === 'A2'));
  assert.equal(CLC.search(lib, '1973').eras[0].id, '1970s');
  assert.equal(CLC.search(lib, 'mclachlin').icons[0].id, 'beverley-mclachlin');
  assert.deepEqual(CLC.search(lib, ' ').icons, []);
});

test('trails lead somewhere from every icon and every story', () => {
  for (const ic of lib.icons) {
    const t = CLC.iconTrails(lib, ic.id);
    assert.ok(t.field.length > 0, `${ic.id} has field neighbours`);
    t.situations.forEach((x) => assert.ok(!x.people.some((p) => p.id === ic.id)));
  }
  for (const s of lib.stories) {
    const t = CLC.storyTrails(lib, s.id);
    assert.ok(t.situations.length === s.keys.length);
    t.situations.forEach((x) => assert.ok(x.at >= 0, `${s.id} sits on its own situation line`));
  }
  assert.ok(CLC.eras(lib).length > 10);
});

test('members, reading and season', () => {
  for (const id of demo.order) {
    const m = CLC.member(lib, id);
    assert.ok(m.coach && m.coach.name, `${id} has a coach`);
    assert.ok(m.situations.length >= 2);
    const r = CLC.readingFor(lib, id);
    assert.equal(r.bySituation.length, m.situations.length);
  }
  const s = CLC.season(lib, CLC.matcher(corpus), 'sarah', 6);
  assert.equal(s.length, 6);
  assert.deepEqual(s.slice(0, 3).map((w) => w.sit.id), ['A2', 'E1', 'D3']);
  assert.ok(s.every((w) => w.story && w.move && w.line));
  assert.equal(CLC.season(lib, CLC.matcher(corpus), 'nobody'), null);
});

test('likeness: stories like this one, kindred lives, the neighbourhood, the web and the path', () => {
  const week = CLC.similarStories(lib, 's-A1-beverley-mclachlin', 6);
  assert.equal(week.length, 6);
  assert.equal(new Set(week.map((x) => x.story.icon)).size, 6, 'one story per person');
  assert.ok(week.every((x) => x.story.icon !== 'beverley-mclachlin'));
  assert.ok(week.every((x) => x.reasons.length > 0), 'every link says why');
  assert.deepEqual(CLC.similarStories(lib, 's-A1-beverley-mclachlin', 6).map((x) => x.story.id), week.map((x) => x.story.id), 'deterministic');
  const world = CLC.similarStories(lib, 's-A1-beverley-mclachlin', 4, { mode: 'words' });
  assert.ok(world.some((x) => ['ketanji-brown-jackson', 'louis-brandeis', 'belva-lockwood'].includes(x.story.icon)), 'a judge finds judges by their words');
  assert.ok(world.every((x) => x.reasons.some((r) => r.type === 'words')));
  const kin = CLC.kindred(lib, 'billie-jean-king', 6);
  assert.equal(kin[0].icon.id, 'barack-obama');
  assert.ok(kin[0].reasons[0].text.startsWith('Lived 3 of the same situations'));
  const ego = CLC.ego(lib, 'billie-jean-king', 4);
  assert.equal(ego.situations.length, lib.icon['billie-jean-king'].keys.length);
  assert.ok(ego.situations.every((s) => s.people.length <= 4 && !s.people.some((p) => p.id === 'billie-jean-king')));
  assert.ok(ego.kindred.some((k) => k.icon.id === 'althea-gibson' || k.icon.id === 'coco-gauff'), 'word-kin for a tennis player are tennis players');
  const web = CLC.situationWeb(lib);
  assert.equal(web.nodes.length, 22);
  assert.ok(web.links.every((l) => l.a < l.b && (l.stories + l.lives) > 0));
  const p = CLC.path(lib, 'rihanna', 'karl-marx');
  assert.equal(p[0].icon.id, 'rihanna'); assert.equal(p[p.length - 1].icon.id, 'karl-marx');
  assert.ok(p.slice(1).every((s) => s.via && lib.sit[s.via.id]));
  assert.equal(CLC.path(lib, 'rihanna', 'sun-tzu'), null, 'a life with no story has no path');
  for (const s of lib.stories.slice(0, 60)) assert.ok(CLC.similarStories(lib, s.id, 3).length === 3);
});

test('ask: a coach question, in anyone\'s words, reads as the situation a coach would name', () => {
  const cases = [
    ['She is announcing the reorg on Thursday, and the person who wanted her job will be in the room.', 'E1', 'A2'],
    ['I am announcing the reorg on Thursday, and the person who wanted my job will be in the room.', 'E1', 'A2'],
    ['The roadmap review is Friday and she thinks the room will decide before she gets to speak', 'B6'],
    ["I'm the expert in the room and nobody asks me", 'B6'],
    ['My boss took the credit for my analysis again', 'B1'],
    ['I keep putting off the conversation with my old peer', 'E2'],
    ['She has to lead a restructure she did not choose', 'D4'],
    ['Nobody told me what this job actually needs', 'A1'],
    ['I miss doing the actual design work', 'E3'],
    ['He is following a founder everyone loved', 'A4'],
    ['The Ardent pitch is on Monday and the client asks for the partner by name', 'C2'],
  ];
  for (const [q, first, also] of cases) {
    const r = CLC.interpret(lib, q, 3).map((x) => x.sit.id);
    assert.equal(r[0], first, `${q} → ${r.join(', ')}`);
    if (also) assert.ok(r.includes(also), `${q} → ${r.join(', ')} should include ${also}`);
  }
  const a = CLC.ask(lib, cases[0][0], { heroes: ['barack-obama'], heroLabel: 'Your hero' });
  assert.ok(a.total > 3 && a.results.every((x) => x.story.keys.some((k) => a.reading.map((y) => y.sit.key).includes(k))), 'every answer carries a situation the question was read as');
});

test('ask.js: facets are read from plain words, and the query is the address', () => {
  const CLQ = require('../lib/ask.js');
  const r = CLQ.read(lib, 'a quieter story about a woman in law before 1950 who stood on her own name', {});
  assert.equal(r.q.sit, 'C2'); assert.equal(r.q.sex, 'f'); assert.equal(r.q.field, 'law'); assert.equal(r.q.before, 1950); assert.equal(r.q.dir, 'quiet');
  const back = CLQ.fromQS(new URLSearchParams(CLQ.toQS(r.q)));
  assert.deepEqual(Object.keys(back).sort(), Object.keys(r.q).filter((k) => k !== 'trait').sort());
  const a = CLQ.answer(lib, { sit: 'C2', field: 'law' });
  assert.ok(a.total < 4 && a.nearest.length >= 2, 'a thin answer names what to drop');
  assert.ok(CLQ.answer(lib, { sit: 'D4', sex: 'f' }).items.every((it) => it.story.keys.includes('carrying-somebody-elses-decision') && lib.icon[it.story.icon].sex === 'f'));
  const shelf = CLQ.shelf(lib, 'sarah');
  assert.equal(shelf[0].group, 'For Sarah this week');
  assert.ok(shelf.flatMap((g) => g.items).filter((i) => i.n === 0).length <= 1, 'the shelf asks questions the library can answer');
  const c = CLQ.compare(lib, 'st-bjk-1973-riggs', 's-A2-barack-obama');
  assert.ok(c.rows.length >= 3 && c.rows.every((row) => row[1] !== row[2]), 'compare shows only the rows that differ');
});

test('net.js: every tie has two reasons, nobody is left alone, and every season week reaches the three', () => {
  const CLN = require('../lib/net.js');
  const lives = lib.icons.filter((i) => i.stories.length), deg = lives.map((i) => CLN.kindred(lib, i.id).length).sort((a, b) => a - b);
  assert.ok(deg[0] > 0, 'no life with a story is left without kin');
  const med = deg[Math.floor(deg.length / 2)]; assert.ok(med >= 8 && med <= 40, 'median kin ' + med);
  for (const k of CLN.kindred(lib, 'abraham-lincoln', 12)) assert.ok(k.tie.shared.length >= 2 || k.tie.reasons.length >= 1);
  const M = CLC.matcher(corpus);
  let weeks = 0, reached = 0;
  for (const mid of lib.order) for (const w of CLC.season(lib, M, mid, 8)) {
    if (!w.story) continue; weeks++;
    const s = lib.story[CLC.resolve(lib, w.story.id)], b = CLN.bridge(lib, mid, s.icon, w.sit && w.sit.id ? lib.sit[w.sit.id].key : s.keys[0]);
    if (b && (b.own || b.steps.length <= 3)) reached++;
  }
  assert.ok(weeks >= 40 && reached === weeks, reached + ' of ' + weeks + ' weeks reach the three');
  const nb = CLN.near(lib, 'sarah');
  assert.ok(nb.lives.some((l) => l.id === 'billie-jean-king' && l.held.length === 3));
});
