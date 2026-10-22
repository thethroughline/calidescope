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
