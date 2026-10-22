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
  // two lives whose only second reason was an unruled reading of how they lead: a reading is never the reason for a tie
  assert.deepEqual(lives.filter((i) => !CLN.kindred(lib, i.id).length).map((i) => i.name).sort(), ['Aristotle', 'Ludwig van Beethoven'], 'every other life with a story has kin');
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

test('voice: the house rules hold in our own copy, and every rewrite of the export still applies', () => {
  const fs = require('node:fs'), vm = require('node:vm');
  const files = ['../library/library.js', '../library/graph.js', '../lib/ask.js', '../lib/net.js', '../js/constellation-bridge.js', '../tools/patches.py', '../README.md'];
  const bad = /\b(rather than|instead of|actually|really)\b|\bjust\b(?! ?[=(])|, not (?:a|an|the|my|your|their|his|her|in|for|just)\b/i;
  for (const f of files) {
    const lines = fs.readFileSync(new URL(f, import.meta.url), 'utf8').split('\n');
    lines.forEach((l, i) => { if (!/STOPW|var COPY|^\s*\[["']/.test(l) && bad.test(l)) assert.fail(f + ':' + (i + 1) + ' ' + l.trim().slice(0, 120)); });
  }
  const ctx = { window: {} }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(new URL('../js/constellation-proto-data.js', import.meta.url), 'utf8'), ctx);
  const used = {}; CLC.voice(JSON.parse(JSON.stringify(ctx.window.CPD, (k, v) => (typeof v === 'function' ? undefined : v))), { used });
  CLC.voice(corpus.situations.map((s) => s.member_line), { used });
  assert.ok(lib.situations.every((s) => !/\b(actually|really|just)\b/.test(s.member_line)), 'member lines reach the reader in the house voice');
  CLC.COPY.forEach((c, i) => assert.ok(used[i], 'a rewrite no longer matches the export: ' + c[0]));
});

test('round two: others like this, the path in five, the other way, honest drafts, and the slot a check fills', () => {
  const CLN = require('../lib/net.js');
  for (const s of lib.stories) {
    const L = CLC.likeThis(lib, s.id, 4, { role: 'reader' }), why = L.map((x) => x.reasons[0].text), me = lib.icon[s.icon];
    assert.equal(new Set(why).size, why.length, s.id + ': each one has its own reason');
    assert.equal(new Set(L.map((x) => x.story.icon)).size, L.length, s.id + ': one story per life');
    assert.ok(L.filter((x) => lib.icon[x.story.icon].field === me.field).length <= 1, s.id + ': at most one from its own field');
    const old = lib.stories.some((o) => o.icon !== s.icon && o.keys.some((k) => s.keys.includes(k)) && o.year != null && o.year < 1900);
    if (old) assert.ok(L.some((x) => x.story.year != null && x.story.year < 1900), s.id + ': one from before 1900 when the week has one');
  }
  assert.ok(lib.situations.every((x) => CLC.readingPath(lib, x.key).length === 5), 'every situation has a path in five stories');
  assert.equal(lib.stories.filter((s) => s.directness && CLC.otherWay(lib, s.id)).length, lib.stories.filter((s) => s.directness).length, 'every story with a way of acting finds the other way');
  // a member never sees a coach's working note, and sees a citation only once the story is checked
  for (const s of lib.stories) {
    const m = CLC.sourceFor(s, 'member');
    if (!s.verified) assert.equal(m, '');
    assert.ok(!/\b(verify|verified|check|checked|confirm)\b|^corpus draft/i.test(CLC.sourceFor(s, 'reader')), s.id + ': no working note reaches a reader');
  }
  assert.match(CLC.statusLine({ status: 'sample-draft', verified: false }, 'member', 'Jim'), /Jim/);
  const fill = (m, k) => CLN.fillSlot(lib, m, lib.sit[k].key).pick;
  assert.equal(fill('michael', 'C2').story.id, 's-B1-muriel-siebert', 'Ali in Miami Beach names no work to check against (sourceOk), so it is no check');
  assert.equal(fill('david', 'C1').story.id, 's-C1-billie-jean-king');
  assert.equal(fill('sarah', 'E1').story.id, 'st-obama-1990-law-review');
  assert.equal(fill('maya', 'B6').links, 2);
  // how far each life sits from a member's three: the list's marker and the chosen story's line agree
  for (const mid of lib.order) {
    const H = CLN.hops(lib, mid);
    for (const s of lib.stories.slice(0, 120)) assert.equal(H[s.icon] ? H[s.icon].links : 9, CLN.linksTo(lib, mid, s.icon, s.keys[0]).links, mid + ' ' + s.id);
  }
  assert.equal(CLN.linksTo(lib, 'sarah', 'jimmy-carter', lib.sit.E1.key).line, 'One step from Obama. Both had every act read as a signal.');
});

test('round three: member-safe text, questions read right, the lead pair, who the line is said to, and the room', () => {
  const CLQ = require('../lib/ask.js');
  // nobody but a coach reads a working note, an internal id or a publishing aside
  for (const s of lib.stories) for (const as of ['member', 'reader']) {
    const t = [CLC.cautionFor(s, as), CLC.whyFor(s, as, true)].join(' '), src = CLC.sourceFor(s, as);
    assert.ok(!/\bverify\b|Recall-authored|publish|s-[A-E]\d-/.test(t), s.id + ' ' + as + ': ' + t.slice(0, 120));
    assert.ok(!/\bverify\b|Recall-authored|s-[A-E]\d-/.test(src), s.id + ' ' + as + ' source: ' + src.slice(0, 120));   // a citation may say where it was published
    if (!s.verified) assert.equal(CLC.cautionFor(s, as), '');
  }
  assert.match(CLC.whyFor({ why: 'Chosen because the people you sat beside now report to you.' }, 'member', true), /^It fits your week: the people/);
  const read = (t, m) => CLQ.read(lib, t, { m }).q;
  const tom = CLQ.answer(lib, read('something from before 1900 for Tom'));
  assert.equal(tom.total, 8, 'a member named keeps their situations, whatever else is asked');
  assert.equal(CLQ.answer(lib, read('who got fired and came back stronger')).total, 11, 'a scene asked for on its own filters');
  const ardent = read('The Ardent pitch is Thursday and their general counsel knows the firm, not me.', 'michael');
  assert.ok(!ardent.field && /C1/.test(ardent.sit) && ardent.to === 'out' && CLQ.answer(lib, ardent).total >= 50, 'general counsel is a person in the room, never a field');
  assert.ok(read('The VP picked the roadmap I argued against and I have to present it', 'maya').sit.startsWith('D4'));
  assert.equal(read('Sarah still rewrites every deck her team sends her').sit, 'D3');
  assert.ok(read('who has walked into a team that did not want them').sit.startsWith('A4'));
  assert.ok(read('Priya keeps getting talked over in the leadership meeting').sit.startsWith('B6'));
  for (const id of lib.order) { const M = lib.members[id]; if (M.ask1) assert.ok(!read(M.ask1, id).field, id + ': a member’s own Ask reads no field'); }
  // the lead pair: a checked story the member does not have, and a draft one check from sending
  const reorg = read('Sarah announces the reorg Thursday and the person who wanted her job will be in the room');
  const a = CLQ.answer(lib, reorg);
  assert.ok(a.ready.story.verified && !CLQ.sentTo(lib, 'sarah').includes(a.ready.story.id) && !a.oneCheck.story.verified && a.oneCheck.source);
  assert.equal(reorg.to, 'rival'); assert.equal(reorg.room, 'team');
  const top = [a.ready, a.oneCheck].concat(a.items).slice(0, 10);
  assert.ok(top.filter((x) => CLQ.moveIn(x.story, 'team')).length >= 8, 'the room ranks the stories whose move is set there');
  assert.ok(top.slice(0, 6).some((x) => x.story.id === 's-A2-elena-kagan'), 'a line said to the colleague who wanted the job ranks high');
  // quieter than a named life: the same situations, met less directly, by someone else
  const qt = read('a quieter story than Obama'), qa = CLQ.answer(lib, qt), qall = [qa.ready, qa.oneCheck].concat(qa.items).filter(Boolean);
  assert.equal(qt.than, 'barack-obama');
  assert.ok(qa.total > 20 && qall.every((x) => x.story.icon !== 'barack-obama' && ['calibrated', 'indirect'].includes(x.story.directness)));
  assert.ok(qall[0].reasons.some((r) => /where Obama was direct/.test(r.text)));
  // facets keep a checked story whose field is empty
  assert.equal(CLQ.answer(lib, { sit: 'A2', line: 1 }).total, CLQ.answer(lib, { sit: 'A2' }).total);
});

test('round four: nothing the member has, and no life from last week, is offered as the next check or the lead', () => {
  const CLQ = require('../lib/ask.js'), CLN = require('../lib/net.js');
  const fill = (m, k) => CLN.fillSlot(lib, m, lib.sit[k].key, { exclude: CLQ.sentTo(lib, m), avoidIcons: CLQ.recentTo(lib, m).map((x) => x.icon) }).pick.story.id;
  assert.equal(fill('sarah', 'E1'), 's-A3-jimmy-carter');
  assert.equal(fill('michael', 'C2'), 's-B1-muriel-siebert');
  for (const m of lib.order) {
    const avoid = CLQ.recentTo(lib, m).map((x) => x.icon), M = lib.members[m];
    for (const sid of M.sits) {
      const f = CLN.fillSlot(lib, m, lib.sit[sid].key, { exclude: CLQ.sentTo(lib, m), avoidIcons: avoid });
      if (f.pick) assert.ok(!avoid.includes(f.pick.story.icon) && !CLQ.sentTo(lib, m).includes(f.pick.story.id), m + ' ' + sid);
    }
  }
  const a = CLQ.answer(lib, CLQ.read(lib, 'Sarah announces the reorg Thursday and Dan wanted her job', {}).q);
  assert.ok(a.ready.story.icon !== 'barack-obama', 'the lead is not the life Sarah had last week');
});

test('round four: the check plan gives every member four, Golda Meir first, and shortens once a draft is checked', () => {
  const CLQ = require('../lib/ask.js'), CLN = require('../lib/net.js');
  const sent = {}, avoid = {};
  for (const m of lib.order) { sent[m] = CLQ.sentTo(lib, m).map((x) => CLC.resolve(lib, x)); avoid[m] = CLQ.recentTo(lib, m).map((x) => x.icon); }
  const plan = CLN.checkPlan(lib, { sent, avoid });
  assert.equal(plan.picks.length, 11, 'ten, and one more for Michael’s week of C1, which had no checked story of its own');
  assert.equal(plan.members.find((m) => m.id === 'david').have, 0);
  assert.ok(plan.members.every((m) => m.left === 0 && !m.later.length), 'every gap closes, David’s included, and every week of every member has a checked story');
  assert.equal(plan.picks[0].story.icon, 'golda-meir');
  assert.deepEqual(plan.picks[0].serves, ['michael', 'david', 'priya']);
  assert.ok(plan.picks[0].near.some((x) => x.id === 'priya' && x.links === 0), 'one of Priya’s three');
  for (const p of plan.picks) assert.ok(!p.story.verified && ['near', 'mid'].includes(p.story.reach));
  // check the first and plan again: one fewer
  const s0 = lib.story[plan.picks[0].story.id];
  s0.verified = true;
  try { assert.equal(CLN.checkPlan(lib, { sent, avoid }).picks.length, 10); } finally { s0.verified = false; }
  // a coach's own members only
  const jim = lib.order.filter((m) => lib.members[m].coach === 'jim');
  assert.deepEqual(CLN.checkPlan(lib, { members: jim, sent, avoid }).members.map((m) => m.id), jim);
});

test('round five: one name for each thing, and no broken joins', () => {
  const BAD = /a week where there|Leads by [A-Z]|\bslot\b|paired|Verified|\b[a-z]+(-[a-z]+){2,}\b/;
  let n = 0;
  for (const s of lib.stories) {
    // a member's why: for a week they are in, and for one they are not, read with the index
    for (const m of lib.order) {
      const keys = (lib.members[m].sits || []).map((id) => lib.sit[id].key), mine = s.keys.find((k) => keys.includes(k)) || false;
      const w = CLC.whyFor({ why: 'Chosen because there are weeks when you have to say where you stand.', keys: s.keys }, 'member', mine, lib);
      assert.ok(!BAD.test(w) && /^It fits (your|this kind of) week: [a-z].+\.$/.test(w), w); n++;
    }
    const t = CLC.teaser(s);
    assert.ok(t && !/^(?:[A-Z][a-z]+ )?\d{3,4}\.?$/.test(t), 'a teaser is never only a date: ' + s.id + ' ' + t);
    assert.ok(!/\b[A-Z]\.$/.test(t) && t.length <= 161, 'a teaser never ends on an initial and stays short: ' + s.id);
    assert.ok(!BAD.test(CLC.REACH_WORD[s.reach] || ''), s.reach);
    assert.equal(CLC.storyCard(lib, s).statusLabel, s.verified ? 'Checked' : 'Recall draft');
  }
  assert.ok(n > 3000);
  for (const i of lib.icons) if (i.stance) assert.ok(/^(By )?[A-Z][a-z]+ing\b/.test(CLC.stanceGerund(i.stance)) || CLC.stanceGerund(i.stance) === '', i.stance);
  assert.equal(CLC.gapWords(-10), 'Ten years earlier'.replace('Ten', '10'));
  assert.equal(CLC.gapWords(5), 'Five years later');
  assert.equal(CLC.sourceFor({ source: 'Corpus draft. Remnick, The Bridge (2010); verify the appointments detail.' }, 'coach'), 'Remnick, The Bridge (2010). Check the appointments detail.');
  assert.equal(CLC.sitLabel(lib, 'E1'), 'E1 · Everything you do gets read as a signal');
  assert.equal(CLC.lifeName(lib, 'barack-obama'), 'Barack Obama', 'a shared surname keeps the whole name');
});

test('round five: families of moves', () => {
  const CLN = require('../lib/net.js');
  assert.equal(CLN.stem('repeat'), CLN.stem('repeated')); assert.equal(CLN.stem('repeating'), CLN.stem('repeats'));
  // E1, frozen as measured: five families, 12 of 41 stories in one, 29 with a move of their own (round six, read by
  // hand: the chance pairs on "leave" and "out loud" are apart)
  const E1 = CLN.moveFamilies(lib, lib.sit.E1.key);
  assert.deepEqual(E1.fams.map((f) => f.members.length), [4, 2, 2, 2, 2]);
  assert.equal(E1.alone.length, 29);
  assert.equal(CLN.moveFamilies(lib, 'E1'), E1, 'a code reads as its situation');
  assert.equal(CLN.stem('need'), CLN.stem('needed')); assert.notEqual(CLN.stem('feed'), CLN.stem('fee'));
  assert.equal(E1.fams[0].hub, 's-E1-thomas-lamont');
  assert.equal(E1.fams[0].move, 'Write the one sentence you want repeated in the corridor afterwards');
  let ties = 0;
  for (const st of lib.situations) {
    const F = CLN.moveFamilies(lib, st.key), seen = new Set();
    for (const f of F.fams) {
      assert.ok(f.members.includes(f.hub) && f.members.length >= 2 && f.move, st.id + ': a family has a hub and a move');
      for (const id of f.members) { assert.ok(lib.story[id].keys.includes(st.key), st.id + ': ' + id + ' carries the key'); assert.ok(!seen.has(id), id + ' in one family'); seen.add(id); }
      for (const t of f.ties) {
        ties++;
        assert.ok(t.stems.length >= 2 && t.w >= 0.1 && (t.pair || t.w >= 0.25), st.id + ': ' + t.a + ' and ' + t.b + ' share two words at least, in one clause each or at a cosine of 0.25');
        assert.notEqual(lib.story[t.a].icon, lib.story[t.b].icon, 'a tie joins two lives');
      }
    }
    F.alone.forEach((id) => { assert.ok(!seen.has(id)); seen.add(id); });
    assert.equal(seen.size, (lib.byKey[st.key] || []).length, st.id + ': every story is in a family or alone');
  }
  assert.equal(ties, 154);
  // the same move in another week: never a story of the same situation or the same life
  let away = 0;
  for (const s of lib.stories) {
    const m = CLN.sameMoveElsewhere(lib, s.id); if (!m) continue; away++;
    assert.ok(m.story.icon !== s.icon && !m.story.keys.some((k) => s.keys.includes(k)) && m.w >= 0.35 && m.pair.a && m.pair.b, s.id);
  }
  assert.equal(away, 12);
  // judged on the moves alone, Ogilvy's D3 story makes Jobs's E3 move: block, slot, craft, hand
  const og = CLN.sameMoveElsewhere(lib, 's-D3-david-ogilvy');
  assert.equal(og.story.id, 's-E3-steve-jobs'); assert.ok(og.words.includes('craft') && og.words.includes('block'));
  // no family title or reason opens on a fragment ("With the successor copied")
  const FR = /^(with|in|at|on|by|for|from|to|which|each|whose|where|when|until|before|after)\b/i;
  for (const st of lib.situations) for (const f of CLN.moveFamilies(lib, st.key).fams) assert.ok(!FR.test(f.move), st.id + ': ' + f.move);
  assert.equal(CLN.moveWords(lib, 's-E1-thomas-lamont', 's-E1-john-foster-dulles'), 'The same move. Thomas Lamont: write the one sentence you want repeated in the corridor afterwards. John Foster Dulles: write the one sentence you want repeated in the corridor.');
  assert.equal(CLN.moveWords(lib, 's-E1-george-washington', 's-E1-miles-davis'), '');
});

test('round six: families and the same move joined on a shared clause', () => {
  const CLN = require('../lib/net.js');
  const fold = (t) => String(t || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const wrote = (id, w) => { const t = ' ' + fold((lib.story[id].move_examples || []).join(' ')).replace(/[^a-z]+/g, ' ') + ' '; return w.split(' ').every((x) => t.includes(' ' + x + ' ')); };
  // weighed within the situation: a word in more than half of E1 ("sentence") still counts, and a stop word that carries
  // the move reads with the word beside it ("one sentence")
  const S = CLN.sitVectors(lib, 'E1');
  assert.ok(S.df.sentenc > S.n / 2 && S.vec['s-E1-thomas-lamont'].sentenc > 0 && S.vec['s-E1-thomas-lamont']['one sentenc'] > 0);
  // the corridor family: the stories that write down the sentence they want carried
  const corridor = CLN.moveFamilies(lib, 'E1').fams.find((f) => f.members.includes('s-E1-thomas-lamont'));
  for (const id of ['s-E1-john-foster-dulles', 's-E1-warren-buffett', 's-E1-martin-luther-king-jr']) assert.ok(corridor.members.includes(id), id + ' is in the corridor family');
  let ties = 0, rows = 0, big = 0;
  for (const st of lib.situations) for (const f of CLN.moveFamilies(lib, st.key).fams) {
    // no tie shows a word missing from either move, and a row marks only words another row of its family wrote, in any form
    for (const t of f.ties) { ties++; for (const w of t.words) assert.ok(wrote(t.a, w) && wrote(t.b, w), st.id + ': ' + w + ' in both ' + t.a + ' and ' + t.b); }
    for (const id of f.members) {
      const r = f.rows[id]; rows++;
      assert.ok(r.text && fold(lib.story[id].move_examples.join(' ')).includes(fold(r.text)), id + ' says its own clause');
      for (const w of r.marks) assert.ok(wrote(id, w) && f.members.some((m) => m !== id && fold(f.rows[m].text).split(/[^a-z]+/).some((x) => CLN.stem(x) === CLN.stem(w))), id + ' marks ' + w);
    }
    // a family of four or more is no chain: each row is tied to the hub, or to two rows
    if (f.members.length >= 4) { big++; for (const id of f.members) if (id !== f.hub) {
      const mine = f.ties.filter((t) => t.a === id || t.b === id);
      assert.ok(mine.some((t) => t.a === f.hub || t.b === f.hub) || mine.length >= 2, st.id + ': ' + id + ' is tied to the hub or to two');
    } }
  }
  assert.ok(ties >= 150 && rows >= 170 && big >= 9, ties + ' ties, ' + rows + ' rows, ' + big + ' families of four or more');
  // a same-move link comes with the clause each story makes it in; a chance pair of words makes none
  assert.equal(CLN.sameMoveElsewhere(lib, 'st-bjk-1973-riggs'), null, 'King to Eisenhower, on "conversation" and "turned", is no link');
  const mb = CLN.sameMoveElsewhere(lib, 's-B4-constance-baker-motley');
  assert.equal(mb.story.id, 's-C1-charlotte-beers');
  assert.deepEqual([mb.pair.a, mb.pair.b], ['Tell the partner leading it which part you will present', 'Ask the partner leading it for one section you will present alone, and present it']);
  for (const s of lib.stories) { const m = CLN.sameMoveElsewhere(lib, s.id); if (m) for (const w of m.words) assert.ok(wrote(s.id, w) && wrote(m.story.id, w), s.id + ' ' + w); }
  // "direct" and "directly" weigh together and are never said as one word
  assert.ok(!CLN.moveTie(lib, 's-E1-john-foster-dulles', 's-E1-emma-watson').words.some((w) => /^direct/.test(w)));
  // round six, read by hand: two moves that share only their frame ("ask your manager", "tell your team", "chair") or a
  // word in two senses are no family, and no same-move link
  const famOf = (sit, id) => CLN.moveFamilies(lib, sit).fams.findIndex((f) => f.members.includes(id));
  for (const [sit, a, b] of [['A1', 's-A1-shirley-chisholm', 's-A1-ricardo-semler'], ['A1', 's-A1-jane-maas', 's-A1-laura-bush'], ['C3', 's-C3-nelson-mandela', 'st-bjk-1973-gloucester'],
    ['B4', 's-B4-alicia-keys', 's-B4-caroline-robinson-jones'], ['E4', 's-E4-mary-wells-lawrence', 's-E4-lilly-singh'], ['E1', 's-E1-gillian-triggs', 's-E1-betty-white']]) {
    const fa = famOf(sit, a); assert.ok(fa < 0 || fa !== famOf(sit, b), sit + ': ' + a + ' and ' + b + ' share only a frame');
  }
  assert.equal(CLN.sameMoveElsewhere(lib, 'st-kjohnson-1958-langley'), null, 'Johnson to Bezos, on manager and meeting, is no link');
  assert.equal(CLN.sameMoveElsewhere(lib, 's-E2-steve-jobs'), null, 'Jobs to Murakami, on "tell one colleague", is no link');
  // "The same move" on an Others card holds only where the tie does: not Durant to Curry, nor King to Washington
  const sameOn = (id) => CLC.likeThis(lib, id, 4, { role: 'reader', three: [] }).filter((x) => x.reasons[0] && x.reasons[0].type === 'move').map((x) => x.story.icon);
  assert.ok(!sameOn('s-D4-kevin-durant').includes('stephen-curry') && !sameOn('st-bjk-1973-riggs').includes('george-washington'));
  // every row is one whole action, in the clause its tie is on
  for (const st of lib.situations) for (const f of CLN.moveFamilies(lib, st.key).fams) for (const t of [f.move].concat(f.members.map((id) => f.rows[id].text))) {
    assert.equal((t.match(/\(/g) || []).length, (t.match(/\)/g) || []).length, st.id + ': ' + t);
    assert.ok(!/^(That|What|Which|Under|Where|Who|Whose|Than)\b/.test(t) && !/; where\b|: the [a-z]+$/.test(t), st.id + ': ' + t);
  }
  assert.equal(CLN.moveFamilies(lib, 'C1').fams.find((f) => f.members.includes('s-C1-mark-zuckerberg')).rows['s-C1-mark-zuckerberg'].text, 'Write its first paragraph yourself and read it aloud to the partner who will sign it');
});

test('round six, read again by hand: no family, link or reason rests on a word in two senses, and every row is whole', () => {
  const CLN = require('../lib/net.js'), fold = (x) => String(x || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  // N1: the pairs read by hand as two moves (a word in two senses, or a frame with a placeholder) join no family, no
  // same-move link and no reason, whichever story the page opens
  const pairs = Object.keys(CLN.APART).map((k) => k.split('|')).filter(([a, b]) => a < b);
  assert.equal(pairs.length, 53);
  for (const st of lib.situations) for (const f of CLN.moveFamilies(lib, st.key).fams) for (const t of f.ties) assert.ok(!t.pair || !CLN.APART[t.a + '|' + t.b], st.id + ': ' + t.a + ' and ' + t.b);
  for (const [a, b] of pairs) {
    assert.equal(CLN.moveWords(lib, a, b), ''); assert.equal(CLN.moveWords(lib, b, a), '');
    for (const [x, y] of [[a, b], [b, a]]) { const m = CLN.sameMoveElsewhere(lib, x); assert.ok(!m || m.story.id !== y, x + ' to ' + y); }
  }
  // the reviewers' cases stay apart: "the one thing", "senior", "whiteboard", "junior", "standard", "method", "out loud",
  // "leave", "decides"
  const famOf = (sit, id) => CLN.moveFamilies(lib, sit).fams.findIndex((f) => f.members.includes(id));
  for (const [sit, a, b] of [['A1', 's-A1-caroline-robinson-jones', 's-A1-laura-bush'], ['A2', 's-A2-elena-kagan', 'st-obama-2008-clinton'], ['D2', 's-D2-archimedes', 's-A3-vannevar-bush'],
    ['D2', 's-D2-ruth-bader-ginsburg', 's-D2-madeleine-albright'], ['D2', 's-D2-paul-mccartney', 's-D2-pat-summitt'], ['C2', 's-C2-ada-lovelace', 's-C2-madam-c-j-walker'],
    ['E3', 's-E3-martha-graham', 's-E3-indra-nooyi'], ['E4', 's-E4-stevie-wonder', 's-E4-ashleigh-barty'], ['E1', 's-E1-fannie-lou-hamer', 's-E1-lloyd-blankfein'],
    ['E1', 'st-jackie-robinson-1945-rickey', 's-E1-lebron-james'], ['B6', 's-B6-ulysses-s-grant', 'st-kjohnson-1958-langley']]) {
    const fa = famOf(sit, a); assert.ok(fa < 0 || fa !== famOf(sit, b), sit + ': ' + a + ' and ' + b);
  }
  // E1, the page Sarah's week opens on: its open cards are moves every row makes
  assert.deepEqual(CLN.moveFamilies(lib, 'E1').fams.slice(0, 3).map((f) => f.move), ['Write the one sentence you want repeated in the corridor afterwards', 'Read the complaint aloud', 'List three acts people will read as signals']);
  // N3: "The same move" on an Others card gives the open story's clause and the other's, each one its own move says
  // (core reads the moves through the page's CLN)
  let said = 0; const was = global.CLN; global.CLN = CLN;
  try {
  for (const s of lib.stories) for (const x of CLC.likeThis(lib, s.id, 4, { role: 'reader', three: [] })) {
    const r = x.reasons[0]; if (!r || r.type !== 'move') continue; said++;
    const one = /^The same move: (.+)\.$/.exec(r.text), two = /^The same move\. [^:]+: (.+?)\. [^:]+: (.+)\.$/.exec(r.text);
    assert.ok(one || two, r.text);
    const mine = fold(s.move_examples.join(' ')), theirs = fold(lib.story[x.story.id].move_examples.join(' '));
    if (two) assert.ok(mine.includes(fold(two[1])) && theirs.includes(fold(two[2])), s.id + ': ' + r.text);
    else assert.ok(mine.includes(fold(one[1])) && theirs.includes(fold(one[1])), s.id + ': ' + r.text);
  }
  assert.ok(said >= 50, said + ' cards say the same move');
  assert.equal(CLC.likeThis(lib, 's-B2-pat-benatar', 4, { role: 'reader', three: [] }).map((x) => x.reasons[0].text).filter((t) => /^The same move/.test(t))[0],
    'The same move. Pat Benatar: say once, at your normal volume, the direction you want and the reason, then stop. James Madison: answer its two strongest claims in order, at your normal volume, and stop.');
  } finally { global.CLN = was; }
  // N8: a clause is one whole action: it never opens on a determiner, a participle, a condition or a preposition, and a
  // short opening clause keeps what follows it
  const V = CLN.moveVectors(lib);
  for (const s of lib.stories) for (const c of V.clauses[s.id] || []) {
    assert.ok(!/^(?:the|a|an|your|their|its|this|these|those|so|even|because|though|although|whether|unless|with|within|in|inside|at|on|by|beside|for|from|to|which|each|whose|where|when|until|before|after|during|without|than|as|that|what|under|who|whom)\b/i.test(c.text), s.id + ': ' + c.text);
    assert.ok(!/^(?!(?:bring|ring|thing|string|swing|spring|sting)\b)[a-z]+ing\b/i.test(c.text) && !/^(?!(?:need|feed|proceed|succeed|shed|embed|speed)\b)[a-z]{3,}ed\b/i.test(c.text), s.id + ': ' + c.text);
  }
  const clauseOf = (id, re) => V.clauses[id].map((c) => c.text).find((t) => re.test(t));
  assert.equal(clauseOf('s-B2-henri-matisse', /second to last/), 'speak once, second to last, with one prepared sentence on your view');
  assert.equal(clauseOf('s-D1-frances-arnold', /review you skipped/), 'write the correction to the client yourself before anyone asks, naming the review you skipped');
  assert.equal(clauseOf('s-C1-joe-wicks', /response was none/), 'show the one piece you published this week and the response it drew, even if the response was none');
  assert.equal(clauseOf('s-B5-meryl-streep', /rival/), 'read your opening line aloud to a colleague; if it could sit on a rival\'s slide, rewrite it there and then');
  assert.equal(clauseOf('s-A3-howard-schultz', /numbers are read/), 'Send it the night before, so the numbers are read beside it');
});

test('round six: a way of leading is a reading until a coach rules on it', () => {
  const CLN = require('../lib/net.js');
  const k = CLN.kindred(lib, 'barack-obama').find((x) => x.id === 'elizabeth-dole');
  assert.equal(k.tie.w, 5.5, 'one situation (3), the way of leading unruled (1), the same domain (1.5)');
  assert.deepEqual(k.why, ['Both had every act read as a signal.', 'Both in politics.', '21 years apart.', 'Both may stay close to their people. A coach has yet to rule on this.']);
  for (const x of CLN.kindred(lib, 'barack-obama')) for (const w of x.why) assert.ok(!/^Both (lead out front|earn it daily|carry the weight|grow their people|stay close to their people|keep out of the way)\./.test(w), w);
  // ruled for both, it weighs 2 and says what it is
  const A = lib.icon['barack-obama'], B = lib.icon['elizabeth-dole'], was = [A.stanceStatus, B.stanceStatus];
  A.stanceStatus = B.stanceStatus = 'ruled';
  try { const t = CLN.tie(lib, A, B); assert.equal(t.w, 6.5); assert.equal(CLN.why(lib, A, B, t)[1], 'Both stay close to their people.'); } finally { [A.stanceStatus, B.stanceStatus] = was; }
});

test('round five: the coach\'s twenty questions', () => {
  const CLQ = require('../lib/ask.js');
  const panel = J('./ask-panel.json').questions;
  assert.equal(panel.length, 20);
  // every facet a reading can set: the panel's q is exact, and a facet it does not list must be absent
  const KEYS = ['m', 'sit', 'mine', 'to', 'room', 'cue', 'line', 'than', 'dir', 'sex', 'before', 'after', 'age', 'field', 'domain', 'nocel', 'notus', 'reach', 'stance', 'ok'];
  const CHIP = { before: (q) => (q.after ? 'era' : 'before'), after: (q) => (q.before ? 'era' : 'after') };
  for (const e of panel) {
    const r = CLQ.read(lib, e.t, { m: e.m }), q = r.q, M = lib.members[e.m], id = '#' + e.n + ' ' + e.t;
    for (const k of KEYS) {
      if (k === 'sit' && e.sitFirst) { assert.equal((q.sit || '').split('+')[0], e.sitFirst, id + ' sit'); continue; }
      assert.deepEqual(q[k], e.q[k], id + ' ' + k);
    }
    // each facet read shows as a chip the coach can take away
    for (const k of Object.keys(e.q)) { const ck = CHIP[k] ? CHIP[k](q) : k; assert.ok(r.chips.some((c) => c.k === ck), id + ' chip ' + ck); }
    for (const w of e.unread || []) assert.ok(r.unused.includes(w), id + ': "' + w + '" is said to be unread');
    for (const w of e.read || []) assert.ok(!r.unused.map((x) => x.toLowerCase()).includes(w), id + ': "' + w + '" is read');
    const a = CLQ.answer(lib, q), sent = CLQ.sentTo(lib, e.m).map((x) => CLC.resolve(lib, x)), recent = CLQ.recentTo(lib, e.m).map((x) => x.icon);
    const asked = (q.sit ? q.sit.split('+') : M.sits).map((x) => lib.sit[x].key);
    assert.ok(a.ready || a.oneCheck, id + ': a lead');
    for (const L of [a.ready, a.oneCheck].filter(Boolean)) {
      assert.ok(!sent.includes(L.story.id) && !recent.includes(L.story.icon), id + ': the lead is new to ' + M.first);
      assert.ok(L.story.keys.some((k) => asked.includes(k)), id + ': the lead carries a situation asked about');
      assert.ok(L.route === '' || L.route.startsWith('For ' + M.first + ': '), id + ': ' + L.route);
      // one of the three needs no route; every other lead says how it reaches the member
      assert.equal(L.route === '', CLQ.threeOf(M).includes(L.story.icon), id + ': ' + L.story.icon + ' route "' + L.route + '"');
    }
    // what the member already has sorts last, and says when
    const had = a.items.map((x) => !!x.had); assert.ok(had.indexOf(true) < 0 || had.slice(had.indexOf(true)).every(Boolean), id + ': had sorts last');
    const L = e.lead || {};
    if (L.ready) assert.equal(a.ready && a.ready.story.id, L.ready, id + ' ready');
    if (L.readyVerified) assert.ok(a.ready.story.verified, id);
    if (L.readyReason) assert.ok(a.ready.reasons.some((x) => x.text === L.readyReason), id + ' ' + a.ready.reasons.map((x) => x.text).join(' / '));
    if (L.readyRoute) assert.ok(a.ready.route.startsWith(L.readyRoute), id + ' ' + a.ready.route);
    if (L.oneCheck) assert.equal(a.oneCheck && a.oneCheck.story.id, L.oneCheck, id + ' one check');
    if (L.oneCheckYear) assert.equal(a.oneCheck.story.year, L.oneCheckYear);
    if (L.oneCheckReason) assert.ok(a.oneCheck.reasons.some((x) => x.text === L.oneCheckReason), id + ' ' + a.oneCheck.reasons.map((x) => x.text).join(' / '));
    if (L.oneCheckRoute != null) assert.equal(a.oneCheck.route, L.oneCheckRoute);
    if (L.oneCheckSource) assert.equal(a.oneCheck.source, L.oneCheckSource);
    if (L.cueN != null) assert.equal(a.cueN, L.cueN, id + ' scene count');
    if (L.hadLast) assert.equal(a.items[a.items.length - 1].had, L.hadLast, id + ' had');
  }
  const read = (t, m) => CLQ.read(lib, t, { m }).q;
  // #3: the room's words leave the reading, so "group meeting" is no longer C3's meeting
  assert.ok(!/C3/.test(read(panel[2].t, 'sarah').sit || ''));
  // #4: the person named first is the one spoken to, and a team reads as the member's team
  assert.equal(read(panel[3].t, 'sarah').to, 'down');
  assert.equal(read('Tom has to back his head of brand in front of the board', 'tom').to, 'down');
  assert.equal(read('Michael has to tell the partners the merger is off', 'michael').to, 'up');
  // the setback scene, from the meeting that went badly, the vote that was lost, or "a setback"
  for (const t of ['something for Sarah after the meeting went badly', 'Sarah lost the vote on the new structure', 'it went badly for Sarah', 'Sarah had a setback at the offsite']) {
    const q = read(t); assert.equal(q.cue, 'setback', t); assert.ok(!/C3/.test(q.sit || ''), t);
  }
  assert.equal(CLQ.answer(lib, read(panel[7].t, 'maya')).oneCheck.story.id, 's-B6-george-c-marshall');
  // a line: "can say to", "what to say"
  assert.equal(read('what to say to the VP after it went badly', 'maya').line, 1);
  // a member's age by first name, and no age read for a member whose age is not on record
  assert.equal(read('someone Sarah\'s age who led former peers').age, 41);
  assert.ok(!read('someone David\'s age who won work on his own name').age);
  // a word that names one domain reads as that domain: a creator is the creators, a small part of media
  const cr = read('A story from a creator for Maya about speaking up');
  assert.equal(cr.domain, 'influencer'); assert.ok(!cr.field);
  assert.ok(CLQ.answer(lib, cr).items.concat([CLQ.answer(lib, cr).oneCheck]).filter(Boolean).every((x) => lib.icon[x.story.icon].domain === 'influencer'));
  // interests by domain: a newspaper editor is no answer to "Maya follows creators"
  const evans = CLQ.reasons(lib, lib.story['s-C3-harold-evans'], { m: 'maya', sit: 'C3' }).map((x) => x.text);
  assert.ok(!evans.some((t) => /creators/.test(t)), evans.join(' / '));
  // the three and the reserve, each said as it is
  const tag = (s, m) => CLQ.reasons(lib, lib.story[s], { m, sit: 'E1' }).map((x) => x.text);
  assert.ok(tag('st-michelle-obama-2016-go-high', 'sarah').includes('Sarah’s reserve hero'));
  assert.ok(tag('st-obama-1990-law-review', 'sarah').includes('One of Sarah’s three'));
  assert.ok(!tag('st-michelle-obama-2016-go-high', 'sarah').some((t) => /heroes/.test(t)));
  // the lead's route, said as a sentence: one step from a hero, and the last link in the situation's words
  const maya = CLQ.answer(lib, { m: 'maya', sit: 'E1' }).ready;
  assert.match(maya.route, /^For Maya: (one|two|three) steps? from [A-Z]/);
  // what a member already had: a date from the data, and Sarah's week-one story last
  const sar = CLQ.answer(lib, { m: 'sarah', sit: 'A2' }, { limit: 99 }), last = sar.items.filter((x) => x.had);
  assert.ok(last.some((x) => x.story.id === 'st-obama-2008-clinton' && x.had === 'Sarah had this on 12 Oct'));
  assert.equal(CLQ.recentTo(lib, 'sarah')[0].day, 'Mon 12 Oct');
  // one wording for a situation, a member's own line said back to them, the compare row and the source line
  assert.equal(CLQ.sitLabel(lib, 'E1'), 'E1 · Everything you do gets read as a signal');
  assert.equal(CLQ.about(lib, 'D3'), "About: you're still doing your old job as well as this one");
  const c = CLQ.compare(lib, 'st-bjk-1973-riggs', 's-A2-barack-obama'), way = c.rows.find((x) => x[0] === 'Way of leading, as we read it');
  assert.deepEqual(way, ['Way of leading, as we read it', 'Carrying the weight', 'Staying close']);
  assert.ok(c.shared.includes('E1 · Everything you do gets read as a signal'));
  for (const st of lib.situations) for (const m of lib.order) for (const L of ['ready', 'oneCheck']) assert.ok(!/^(Corpus draft|Verify against)/i.test((CLQ.answer(lib, { sit: st.id, m })[L] || {}).source || ''), st.id + ' ' + m);
  assert.equal(CLQ.answer(lib, { sit: 'C2', sex: 'm', after: 1960, before: 1970, m: 'david' }).oneCheck.source, 'White, Catch a Fire (1983).');
});

test('round six: the Ask reads what the coach wrote, again', () => {
  const CLQ = require('../lib/ask.js'), CLN = require('../lib/net.js');
  const read = (t, m) => CLQ.read(lib, t, { m }).q;
  // 1: the lead card's route is a plain meta line, never the path page's bordered .route box
  const ljs = fs.readFileSync(new URL('../library/library.js', import.meta.url), 'utf8'), lcss = fs.readFileSync(new URL('../library/library.css', import.meta.url), 'utf8');
  const leadJs = ljs.slice(ljs.indexOf('function leadHTML'), ljs.indexOf('function answerCard'));
  assert.ok(/<p class="meta leadroute">/.test(leadJs) && !/class="meta route"/.test(leadJs));
  assert.ok(/\.leadcard \.leadroute \{[^}]*\}/.test(lcss) && !/\.leadroute \{[^}]*(border|padding)/.test(lcss));
  // 2: no card says "paired"; a later week is nobody's "had"; this week's chosen story is marked for a coach only
  const mem = CLQ.answer(lib, { m: 'sarah', mine: 1 }, { limit: 999 }), co = CLQ.answer(lib, { m: 'sarah', mine: 1 }, { limit: 999, as: 'coach' });
  const marks = (a) => a.items.flatMap((it) => it.reasons.filter((r) => r.type === 'had').map((r) => r.text));
  assert.ok(!marks(mem).concat(marks(co)).some((t) => /paired/i.test(t)));
  for (const a of [mem, co]) assert.ok(!a.items.find((it) => it.story.id === 'st-schultz-1987-seattle').reasons.some((r) => r.type === 'had'), 'week four is the plan, not had');
  assert.ok(co.items.find((it) => it.story.id === 'st-obama-1990-law-review').reasons.some((r) => r.text === 'Already chosen for Sarah’s week of 19 Oct'));
  assert.ok(!mem.items.find((it) => it.story.id === 'st-obama-1990-law-review').reasons.some((r) => r.type === 'had'));
  assert.deepEqual(mem.items.filter((it) => it.had).map((it) => it.story.id), ['st-obama-2008-clinton'], 'only what went before this week is demoted');
  // 3: what the member had stays inside the list, last, at the Library's limit and the API's
  for (const limit of [30, 12]) {
    const a = CLQ.answer(lib, { m: 'michael', sit: 'C2' }, { limit }), f = a.items.map((x) => !!x.had);
    assert.ok(a.items.length <= limit && a.items[a.items.length - 1].had === 'Michael had this on 12 Oct' && f.filter(Boolean).length === 1, 'limit ' + limit);
  }
  assert.equal(CLQ.answer(lib, { m: 'sarah', sit: 'A2' }, { limit: 12 }).items[11].had, 'Sarah had this on 12 Oct', 'the API\'s twelve keep it');
  // 4: "a general" is a person in the army only as "a general who/in/from/at/during", or "generals"
  const gs = read('Sarah has a general sense the team reads everything');
  assert.ok(!gs.domain && gs.field !== 'public' && CLQ.answer(lib, gs).total > 0);
  assert.ok(!read('In general Tom agrees and does not move').domain);
  assert.equal(read('a story from generals').domain, 'military');
  assert.equal(read('a general who followed someone the place loved').field, 'public', 'the military, widened to its field when it holds too few (5)');
  // 5: a domain that leaves fewer than three stories widens to its field, and the chip names the field
  const mk = CLQ.read(lib, 'a marketer for Maya who is not heard', {});
  assert.ok(!mk.q.domain && mk.q.field === 'media' && mk.chips.some((c) => c.k === 'field' && c.label === 'From advertising and media') && CLQ.answer(lib, mk.q).total > 0);
  assert.equal(read('a designer who led in a style nobody expected').field, 'arts');
  assert.equal(read('a story from a journalist').domain, 'media', 'a domain that answers stays the domain');
  assert.equal(read('A story from a creator for Maya about speaking up').domain, 'influencer', 'creators stay creators, however few');
  // 6: a person named overrides only the team an announcement implies; a day or a month is nobody
  assert.equal(read('What should Sarah say to Dan at the team meeting?').room, 'team');
  assert.notEqual(read("Something Sarah can say to Thursday's group").room, 'one');
  assert.equal(read('Something Sarah can say to Dan the morning after the announcement.').room, 'one');
  assert.equal(read('What can Sarah say to Dan after she announces the reorg?').room, 'one');
  // 7: the person spoken to is never a word of the room's phrase, and the words after "say to" or "tell" come first
  const boss = read('At the team meeting, what can Sarah say to her boss?');
  assert.equal(boss.to, 'up'); assert.equal(boss.room, 'team');
  assert.equal(read('Before the board meeting, what should Tom tell his team?').to, 'down');
  assert.ok(!read('What should Sarah say at the team meeting?').to);
  // 8: a committee or board asked to back, support or approve is C3
  for (const t of ['Priya needs the committee to back her plan', 'Priya has to get the steering group to support the change', 'Maya wants the committee to sign off her roadmap']) assert.ok(/C3/.test(read(t).sit || ''), t);
  // 9: the source line never stops inside a bracket or on an abbreviation
  assert.equal(CLQ.sourceLine(lib.story['s-A3-john-locke']), 'John Locke, An Essay Concerning Human Understanding (London, 1690. Issued December 1689)\u2026');
  for (const s of lib.stories) {
    const t = CLQ.sourceLine(s);
    assert.ok((t.match(/[([]/g) || []).length <= (t.match(/[)\]]/g) || []).length && !/\b(?:Col|Gen|Brig|Lt|Capt|dir|eds|Inc|Co|Ltd|approx)\.$/.test(t), s.id + ': ' + t);
  }
  // 10 and 11: one sentence for a route, CLN.linksTo's, in the Library and the Review; its reason is the situation
  // asked about whenever a step of the chain shares it, and a chain of two names the pair it says "both" of
  for (const m of lib.order) for (const st of lib.situations) {
    const a = CLQ.answer(lib, { m, sit: st.id }, { limit: 1 });
    for (const L of [a.ready, a.oneCheck]) {
      if (!L || !L.route) continue;
      const lt = CLN.linksTo(lib, m, L.story.icon, st.key);
      const f1 = lib.members[m].first;
      assert.equal(L.route, 'For ' + f1 + ': ' + (lt.links >= 9 ? 'not near ' + f1 + '\u2019s three.' : lt.line.charAt(0).toLowerCase() + lt.line.slice(1)));
      if (lt.steps.some((x) => x.tie.shared.includes(st.key))) assert.ok(L.route.includes(CLN.both(st.key)), m + ' ' + st.id + ': ' + L.route);
      if (lt.links > 1 && lt.links < 9) assert.ok(!/\. Both /.test(lt.line) && /^(Two|Three) steps from [^,]+, through /.test(lt.line), lt.line);
    }
  }
  // 12: counts never work out a route: the shelf and the gaps pass routes: false, and a lead's route waits to be read
  const linksTo = CLN.linksTo; let calls = 0; CLN.linksTo = function () { calls++; return linksTo.apply(this, arguments); };
  try {
    CLQ.shelf(lib, 'sarah'); CLQ.gaps(lib); assert.equal(calls, 0, 'the shelf and the gaps never route');
    const a = CLQ.answer(lib, { m: 'maya', sit: 'E1' }); assert.equal(calls, 0, 'an answer routes only when its route is read');
    assert.match(a.ready.route, /^For Maya: /); assert.ok(calls > 0);
    assert.equal(CLQ.answer(lib, { m: 'maya', sit: 'E1' }, { routes: false }).ready.route, '');
  } finally { CLN.linksTo = linksTo; }
  // 13: "to say" alone is no line; turning a promotion down is a choice; a setback quoted is never the day they won
  assert.ok(!read('Tom tends to say yes to everything').line);
  assert.equal(read('What should she say to her boss?').line, 1);
  assert.notEqual(read('Tom turned down the promotion').cue, 'setback');
  assert.equal(read("Maya's plan was turned down by the VP").cue, 'setback');
  for (const id of ['st-bjk-1973-riggs', 'st-obama-2008-clinton']) assert.ok(!CLQ.reasons(lib, lib.story[id], { cue: 'setback', sit: 'E1' }).some((r) => r.type === 'scene'), id);
  const sb = CLQ.answer(lib, read('Sarah lost the vote on the new structure'), { limit: 99 });
  const quoted = [sb.ready, sb.oneCheck].concat(sb.items).filter(Boolean).map((x) => (x.reasons.find((r) => r.type === 'scene') || {}).text).filter(Boolean);
  assert.match(quoted[0], /\b(lost|defeat\w*|failed|went badly)\b/i);
});

test('round six: one ranker for what next, one answer per member and week, and a plan for later weeks only', () => {
  const CLQ = require('../lib/ask.js'), CLN = require('../lib/net.js');
  const had = (m) => CLQ.sentTo(lib, m).map((x) => CLC.resolve(lib, x)), recent = (m) => CLQ.recentTo(lib, m).map((x) => x.icon);
  // #1 While you wait and the story's Next rank with CLN.fitFor: Maya's first is checked, and no longer Hamilton
  const maya = CLN.fitFor(lib, 'maya', { exclude: had('maya'), avoidIcons: recent('maya') });
  assert.ok(maya[0].story.verified && maya[0].story.icon !== 'alexander-hamilton');
  assert.deepEqual(maya.slice(0, 2).map((x) => x.story.id), ['st-michelle-obama-2016-go-high', 'st-bjk-1973-riggs']);
  assert.equal(maya[0].why, 'From Michelle Obama, your reserve, for a week when everything you do gets read as a signal.');
  for (const m of lib.order) {
    const keys = lib.members[m].sits.map((id) => lib.sit[id].key), top = CLN.fitFor(lib, m, { exclude: had(m), avoidIcons: recent(m), n: 1 })[0];
    assert.ok(top && top.story.keys.some((k) => keys.includes(k)), m + ': the top pick carries one of their situations');
    assert.ok(!had(m).includes(top.story.id) && !recent(m).includes(top.story.icon), m + ': nothing they have had, no life from the last fortnight');
  }
  // an age counts only where the year holds: Johnson's 1953 against "late 1950s" does not
  assert.ok(!CLN.yearAgrees(lib.story['st-kjohnson-1958-langley']) && CLN.yearAgrees(lib.story['st-bjk-1973-riggs']));
  assert.ok(!CLN.fitFor(lib, 'maya', {}).some((x) => x.story.id === 'st-kjohnson-1958-langley' && x.terms.some((t) => t.k === 'age')));
  // #4 one answer per member and week: it carries the week, could be sent, and never offers what already goes
  for (const m of lib.order) {
    const key = lib.sit[lib.members[m].up19.sit].key, n0 = CLN.nextFor(lib, m, { key, exclude: had(m), avoid: recent(m) });
    for (const x of [n0.ready, n0.pick].concat(n0.next).filter(Boolean)) assert.ok(x.story.keys.includes(key) && ['near', 'mid'].includes(x.story.reach) && !had(m).includes(x.story.id) && CLN.sourceOk(x.story), m + ' ' + x.story.id);
    if (n0.ready) assert.notEqual((CLN.nextFor(lib, m, { key, exclude: had(m), avoid: recent(m), going: [n0.ready.story.id] }).ready || { story: {} }).story.id, n0.ready.story.id, m + ': what goes is never offered again');
  }
  assert.equal(CLN.nextFor(lib, 'sarah', { key: lib.sit.E1.key, exclude: had('sarah'), avoid: recent('sarah') }).ready.story.id, 'st-michelle-obama-2016-go-high');
  // one title per story: life, short place and year, the dateline's own words where the year cannot say it, and no
  // year where the dateline's and the record's disagree, until a coach settles it (round six #8; FF-3, FF-4)
  assert.equal(CLC.storyTitle(lib, 'st-bjk-1973-riggs'), 'Billie Jean King, Houston 1973');
  assert.equal(CLC.storyTitle(lib, 's-C3-golda-meir'), 'Golda Meir, Chicago 1948');
  assert.equal(CLC.storyTitle(lib, 'st-kjohnson-1958-langley'), 'Katherine Johnson, Langley');
  assert.equal(new Set(lib.stories.map((s) => CLC.storyTitle(lib, s))).size, lib.stories.length, 'no two stories share a title');
  // #6 a source a coach can check names a work: Gloucester names none, Johnson's NASA oral-history interviews do,
  // and "Verify against" keeps its book
  assert.ok(!CLN.sourceOk(lib.story['st-bjk-1973-gloucester']) && !CLN.sourceOk(lib.story['st-ali-1964-miami']));
  assert.ok(CLN.sourceOk(lib.story['st-kjohnson-1958-langley']) && CLN.sourceOk(lib.story['st-schultz-1987-seattle']));
  for (const m of lib.order) for (const sid of lib.members[m].sits) {
    const f = CLN.fillSlot(lib, m, lib.sit[sid].key, { exclude: had(m), avoidIcons: recent(m) });
    for (const x of [f.pick].concat(f.next).filter(Boolean)) assert.ok(CLN.sourceOk(x.story), m + ' ' + sid + ' ' + x.story.id);
  }
  // the plan is for the weeks after this one: no pick carries a waiting member's week, and Golda Meir, who carries
  // David's, is his line's other check
  const jim = lib.order.filter((m) => lib.members[m].coach === 'jim'), sent = {}, avoid = {};
  for (const m of jim) { sent[m] = had(m); avoid[m] = recent(m); }
  const first = CLN.nextFor(lib, 'david', { key: lib.sit.C1.key, exclude: sent.david, avoid: avoid.david }).pick.story.id;
  const plan = CLN.checkPlan(lib, { members: jim, sent, avoid, first: [first], thisWeek: { david: 'C1' } });
  assert.ok(plan.picks.length > 1 && plan.picks.every((pk) => CLN.sourceOk(pk.story) && (pk.given || !pk.story.keys.includes(lib.sit.C1.key))));
  assert.equal(plan.alts.david.story.id, 's-C3-golda-meir');
  assert.ok(!plan.picks.some((pk) => pk.story.id === 's-C3-golda-meir'));
});

test('round six: a hero’s fit from the stories they have, and the first week guaranteed at Publish', () => {
  const CLN = require('../lib/net.js');
  // #2d the fit line is built from what the hero has in the member's weeks; the "not all" form is gone
  assert.equal(CLN.fitLine(lib, 'maya', 'michelle', { coach: 'Bret' }), 'Michelle Obama has a checked story for one of your weeks: everything you do gets read as a signal.');
  assert.match(CLN.fitLine(lib, 'maya', 'biles', { coach: 'Bret' }), /^Simone Biles has a story for one of your weeks: .+\. It is a recall draft, waiting for Bret’s check\.$/);
  // #2e a hero with no story and nobody tied to them says so, and is never "close to" anyone
  for (const h of ['mrbeast', 'reshma-saujani']) {
    assert.equal(CLN.kindred(lib, h).length, 0);
    const t = CLN.fitLine(lib, 'maya', h, { coach: 'Bret' });
    assert.ok(/^No story from .+ yet\. Nobody in the library is tied to .+, so Bret chooses your stories by hand\.$/.test(t) && !/close to/.test(t), t);
  }
  for (const m of lib.order) for (const i of lib.icons.slice(0, 120)) assert.ok(!/not all/.test(CLN.fitLine(lib, m, i.id, {})), m + ' ' + i.id);
  // #7 Maya's first week (B6) has no checked story: the week's own draft comes first, as Bret chose it, then fitFor's
  const w1 = lib.members.maya.micro[0].ins, gap = CLN.firstWeekGap(lib, 'maya', { prefer: w1.story, closeTo: 'reshma-saujani', coach: 'Bret' });
  assert.equal(gap.length, 1); assert.ok(gap[0].first && gap[0].sit === 'B6' && gap[0].picks.length === 3);
  assert.equal(gap[0].picks[0].story.id, 'st-kjohnson-1958-langley');
  assert.equal(gap[0].picks[0].reason, 'Close to Reshma Saujani, by Bret’s choice');
  assert.ok(gap[0].picks.every((x) => !x.story.verified && CLN.sourceOk(x.story) && x.story.keys.includes(lib.sit.B6.key) && x.reason));
  assert.ok(gap[0].picks.slice(1).some((x) => /^One of Maya’s interests: /.test(x.reason)));
  // Sarah's first week has a checked story, so she gets no block; one check fills Maya's, and the block goes
  assert.equal(CLN.firstWeekGap(lib, 'sarah', {}).filter((g) => g.first).length, 0);
  const lib2 = CLC.applyVerification(CLC.merge(corpus, demo), { 'st-kjohnson-1958-langley': { by: 'bret', at: '2026-10-07T10:00:00Z' } });
  assert.equal(CLN.firstWeekGap(lib2, 'maya', { prefer: w1.story }).length, 0);
});

test('round six: one year per story, why it is yours, and a recall draft said once', () => {
  // #8 every story's dateline agrees with its year: where the dateline's year words disagreed with the record's, the
  // dateline keeps its place and no year at all (the record's is never written into a dateline that says otherwise),
  // and the coach is told. Johnson's year is her record's (1953, as her twin and her other story say)
  for (const s of lib.stories) assert.equal(CLC.oneYear(s.place, s.year).clash, '', s.id + ' ' + s.place + ' ' + s.year);
  const kj = lib.story['st-kjohnson-1958-langley'];
  assert.equal(kj.year, 1953); assert.equal(kj.place, 'Langley, Virginia'); assert.equal(kj.yearClash, 'Years disagree: 1953, late 1950s');
  assert.equal(lib.stories.filter((s) => s.yearClash).length, 12);
  // no body opens with its own dateline
  for (const s of lib.stories) {
    const b = CLC.bodyAfterPlace(s.moment, s.placeAsWritten || s.place).toLowerCase();
    assert.ok(!b.startsWith(String(s.placeAsWritten || s.place).toLowerCase()) && (!s.place || !b.startsWith(String(s.place).toLowerCase())), s.id);
  }
  assert.ok(CLC.bodyAfterPlace(kj.moment, kj.placeAsWritten).startsWith('Johnson, a mathematician'));
  // an age beside the member's only on a checked story whose year holds: none on Johnson's, even once checked
  const ck = CLC.applyVerification(CLC.merge(corpus, demo), { 'st-kjohnson-1958-langley': { by: 'bret' } });
  assert.equal(CLC.ageLine(ck, ck.story['st-kjohnson-1958-langley'], 32), '');
  const mo = lib.story['st-michelle-obama-2016-go-high'], moA = mo.year - lib.icon[mo.icon].born;
  // the record holds a year of birth, so an age is one of two years (FF-11: King was 29 at the Riggs match, never "30")
  assert.equal(CLC.ageLine(lib, mo, moA), 'Michelle Obama was ' + (moA - 1) + ' or ' + moA + ' then, about your age.');
  assert.equal(CLC.ageLine(lib, mo, moA + 3), 'Michelle Obama was ' + (moA - 1) + ' or ' + moA + ' then, about three years younger than you are.');
  assert.equal(CLC.ageLine(lib, lib.story['st-bjk-1973-riggs'], 30), 'Billie Jean King was 29 or 30 then, about your age.');
  assert.equal(CLC.ageLine(lib, mo, moA + 4), '');
  // #9 a recall draft, said once: the work by its title alone, never a working note
  assert.equal(CLC.draftWhy(kj, 'Bret'), 'Written from memory. Bret reads it against the source, the NASA oral-history interviews, before it is sent, so every detail you repeat holds.');
  assert.equal(CLC.workOf(lib.story['st-marley-1960s-kingston']), 'Catch a Fire');
  for (const s of lib.stories.filter((x) => !x.verified)) {
    const w = CLC.workOf(s), t = CLC.draftWhy(s, 'Bret');
    assert.ok(!/verify|check|confirm|corpus draft|\(|\d{4}/i.test(w), s.id + ': ' + w);
    assert.ok(/^Written from memory\. Bret reads it against (the source, .+,|its source) before it is sent, so every detail you repeat holds\.$/.test(t), s.id);
  }
});

test('round six: the shelf and the gaps count without building answers, to the same numbers; the chains are kept', () => {
  const CLQ = require('../lib/ask.js'), CLN = require('../lib/net.js'), snap = J('./fixtures/shelf.json');
  // every count on the shelf, for nobody and for each member, is the count before counting alone
  for (const mid of ['-'].concat(lib.order)) {
    const got = CLQ.shelf(lib, mid === '-' ? '' : mid).map((g) => [g.group, g.items.map((it) => [it.text, it.n])]);
    assert.deepEqual(got, snap.shelf[mid], mid);
    CLQ.shelf(lib, mid === '-' ? '' : mid).forEach((g) => g.items.forEach((it) => {
      const c = CLQ.answer(lib, it.q, { count: true }), full = CLQ.answer(lib, it.q, { limit: 1, routes: false });
      assert.deepEqual(Object.keys(c), ['total', 'lives'], 'a count is the numbers alone');
      assert.deepEqual([c.total, c.lives], [full.total, full.lives], it.text);
      assert.equal(c.lives, snap.lives[mid + '|' + g.group + '|' + it.text], it.text);
    }));
  }
  assert.deepEqual(CLQ.gaps(lib).map((g) => [g.member, g.text, g.n, g.nearest ? [g.nearest.k, g.nearest.n] : null]), snap.gaps);
  assert.deepEqual(CLQ.answer(lib, {}, { count: true }), { total: 0, lives: 0 });
  // CLN.bridge answers each member, life, week and three once; a check clears what it kept
  const L = CLC.merge(corpus, demo), key = L.sit.E1.key, a = CLN.bridge(L, 'sarah', 'katherine-johnson', key);
  assert.ok(a && a.steps.length && CLN.bridge(L, 'sarah', 'katherine-johnson', key) === a, 'the second ask is the first answer');
  assert.ok(CLN.bridge(L, 'sarah', 'katherine-johnson', key, { three: ['simone-biles'] }) !== a, 'another three is another chain');
  assert.ok(L._bridge.size >= 2);
  CLC.applyVerification(L, {});
  assert.equal(L._bridge.size, 0, 'applyVerification starts the chains afresh');
  assert.deepEqual(CLN.bridge(L, 'sarah', 'katherine-johnson', key), a);
});

test('round six, reviewed: the plan touches no line this week, sources and years said truly, and a reading is never a reason', () => {
  const CLQ = require('../lib/ask.js'), CLN = require('../lib/net.js');
  const had = (m) => CLQ.sentTo(lib, m).map((x) => CLC.resolve(lib, x)), recent = (m) => CLQ.recentTo(lib, m).map((x) => x.icon);
  // CM-01: each member still waiting this week, whoever's console it is: no pick in any coach's plan carries one of
  // their weeks, so no plan check can change what goes on another coach's line; CM-21: a week of a member's with no
  // checked story weighs in the plan, and one whose drafts all carry this week's story comes back after Sunday
  const thisWeek = { sarah: 'E1', maya: 'B6', michael: 'C2', david: 'C1', priya: 'C3', tom: 'E2' }, wkKeys = Object.values(thisWeek).map((id) => lib.sit[id].key);
  for (const coach of ['jim', 'bret', 'jennifer']) {
    const mem = lib.order.filter((m) => lib.members[m].coach === coach), sent = {}, avoid = {};
    for (const m of mem) { sent[m] = had(m); avoid[m] = recent(m); }
    const plan = CLN.checkPlan(lib, { members: mem, sent, avoid, thisWeek });
    for (const pk of plan.picks) assert.ok(!pk.story.keys.some((k) => wkKeys.includes(k)), coach + ': ' + pk.story.id + ' carries a week someone waits on');
    // the week a member waits on comes round again in their season: that week ahead needs a second checked story, and its
    // drafts wait for Sunday too, so Bret sees Maya's B6 gap; drafts that wait are not stories still to be written
    if (coach === 'jennifer') assert.deepEqual(plan.members.find((m) => m.id === 'michael').later, ['C2', 'C1'], 'Michael’s C2 comes round again, and his C1 waits for David’s week to pass');
    if (coach === 'bret') assert.deepEqual(plan.members.find((m) => m.id === 'maya').later, ['B6'], 'Maya’s B6 comes round again after this week');
    assert.ok(plan.members.every((m) => m.left === 0), coach + ': every gap is closed by the plan or by drafts that wait for Sunday');
  }
  {
    // CM-21: only David waits; his C1 check this week is spent by his next C1 week, which the plan says waits for Sunday
    const jim = lib.order.filter((m) => lib.members[m].coach === 'jim'), sent = {}, avoid = {};
    for (const m of jim) { sent[m] = had(m); avoid[m] = recent(m); }
    const p1 = CLN.checkPlan(lib, { members: jim, sent, avoid, first: ['s-C1-billie-jean-king'], thisWeek: { david: 'C1' } }), dv = p1.members.find((m) => m.id === 'david');
    assert.ok(dv.later.includes('C1') && dv.weeks >= 1 && dv.left === 0, JSON.stringify(dv));
    assert.ok(p1.members.find((m) => m.id === 'sarah').gap === 0 && !p1.members.find((m) => m.id === 'sarah').weeks, 'the plan makes Sarah whole');
  }
  // CM-12, N7: a dated address, speech or statement is a work to check against; only three drafts name nothing
  assert.deepEqual(lib.stories.filter((s) => !s.verified && !CLN.sourceOk(s)).map((s) => s.id).sort(), ['st-ali-1964-miami', 'st-ali-1967-induction', 'st-bjk-1973-gloucester']);
  // FF-5: "It fits your week" only for the week it is
  const mo = lib.story['st-michelle-obama-2016-go-high'];
  assert.equal(CLC.whyFor(mo, 'member', lib.sit.E1.key, lib, lib.sit.E1.key), 'It fits your week: everything you do gets read as a signal.');
  assert.equal(CLC.whyFor(mo, 'member', lib.sit.E1.key, lib, lib.sit.B6.key), 'It fits one of your weeks: everything you do gets read as a signal.');
  // N4, N6: no way of leading has been ruled on, so no member card leads with one, and no tie stands on one
  for (const m of ['sarah', 'maya']) for (const s of lib.stories.slice(0, 120)) for (const x of CLC.likeThis(lib, s.id, 4, { role: 'member', three: CLN.three(lib, m) })) assert.ok(!x.reasons.some((r) => r.type === 'fit'), m + ' ' + s.id);
  const readings = CLC.kindred(lib, 'barack-obama', 12).flatMap((x) => x.reasons).filter((r) => r.type === 'stance');
  assert.ok(readings.length && readings.every((r) => /^Both may lead .+\. A coach has yet to rule on this\.$/.test(r.text)), 'a way of leading is said as a reading');
  for (const i of lib.icons.filter((x) => x.stories.length).slice(0, 150)) for (const k of CLN.kindred(lib, i.id)) assert.ok(!(k.tie.shared.length === 1 && k.tie.reasons.length === 1 && k.tie.reasons[0] === 'stance'), i.id + ' and ' + k.id + ' tied on a reading alone');
  // N5: "close to" a hero only on something the record holds; Tesla and Lovelace are close to nobody of Maya's
  const nb = CLN.near(lib, 'maya');
  for (const id of ['nikola-tesla', 'ada-lovelace']) assert.equal((nb.lives.find((l) => l.id === id) || { near: { h: null } }).near.h, null, id);
  for (const l of nb.lives) if (l.near && l.near.h) assert.ok(l.near.t.shared.length || l.near.t.reasons.some((r) => r === 'field' || r === 'domain' || r === 'time'), l.id);
  // FF-4: a year still to settle is said nowhere, and no other year is reckoned from it
  assert.deepEqual(CLC.likeThis(lib, 'st-kjohnson-1958-langley', 4, { role: 'member', three: [] }).map((x) => x.reasons[0].text).filter((t) => /earlier|later/.test(t)), []);
  // FF-4: no teaser opens with its dateline, in either form ("Place, year." or "Place, year:"), and At your age gives no
  // age to a story whose years still disagree
  for (const s of lib.stories) { const pw = String(s.placeAsWritten || s.place || ''); if (pw) assert.ok(!CLC.teaser(s).toLowerCase().startsWith(pw.toLowerCase()), s.id + ': ' + CLC.teaser(s).slice(0, 60)); }
  for (const m of lib.order) { const A = CLN.atAge(lib, m); if (A) assert.ok(A.stories.every((x) => !x.story.yearClash), m); }
  // FF-8: the fit check counts a hero's stories in words, after the hero's own record ("Jordan’s record is mostly…")
  for (const m of lib.order) for (const h of CLN.three(lib, m)) assert.ok(!/\d/.test(CLN.fitLine(lib, m, h, { coach: 'Jim' })), m + ' ' + h);
  assert.equal(CLN.fitLine(lib, 'michael', 'michael-jordan', { coach: 'Jennifer' }), 'Michael Jordan’s two stories are about other kinds of week.');
  assert.match(demo.members.michael.fit.jordan[1], /^Jordan’s record is mostly about/); assert.match(demo.members.sarah.fit.serena[1], /^Her record is mostly about/);
  // FE-28: the script's own words reach every screen with curly apostrophes; the stories and works keep the record's
  const straight = /[A-Za-z]'[a-z]/, script = JSON.stringify([demo.members, demo.msgs, demo.heroes.map((x) => x.q)]);
  assert.ok(!straight.test(script), 'a straight apostrophe in the demo script: ' + (script.match(/.{30}[A-Za-z]'[a-z].{10}/) || [''])[0]);
  assert.ok(demo.samples.some((s) => straight.test(s.moment)), 'a sample keeps the record’s typography');
  assert.deepEqual(CLC.voice({ line: "Here's where I land", stories: [{ moment: "he didn't" }], works: [{ title: "Beginner's Mind" }] }), { line: 'Here’s where I land', stories: [{ moment: "he didn't" }], works: [{ title: "Beginner's Mind" }] });
  assert.ok(lib.situations.every((s) => !/’/.test(s.member_line) || /’/.test(corpus.situations.find((c) => c.id === s.id).member_line)), 'a member line keeps the corpus’s typography');
});

test('round six: the shipped tables are the ones the corpus gives, and are read only while they match', () => {
  const crypto = require('node:crypto'), D = J('../data/derived.json');
  const hash = crypto.createHash('sha256').update(fs.readFileSync(new URL('../data/corpus.json', import.meta.url))).digest('hex');
  const fresh = CLC.merge(corpus, demo);
  // parity: data/derived.json is what tools/build_demo.mjs would write now (if not, run it)
  assert.equal(D.hash, hash, 'derived.json was built from this corpus.json');
  assert.deepEqual(CLC.derive(fresh, hash), D, 'derived.json is stale: run node constellation/tools/build_demo.mjs');
  // an index reading the tables gives what an index building them gives, to the last bit
  const shipped = CLC.merge(corpus, demo);
  assert.ok(CLC.useDerived(shipped, D, hash));
  for (const s of fresh.stories) {
    assert.deepEqual(CLC.likeThis(shipped, s.id, 4, { role: 'member', three: ['barack-obama'] }), CLC.likeThis(fresh, s.id, 4, { role: 'member', three: ['barack-obama'] }), s.id);
    assert.deepEqual(CLC.similarStories(shipped, s.id, 3), CLC.similarStories(fresh, s.id, 3), s.id);
  }
  assert.deepEqual(shipped._tx.vec, fresh._tx.vec); assert.deepEqual(shipped._tx.ivec, fresh._tx.ivec); assert.deepEqual(shipped._likeUse, fresh._likeUse);
  // another corpus, or another sample, and the tables are built here as before
  assert.ok(!CLC.useDerived(CLC.merge(corpus, demo), D, 'f'.repeat(64)));
  assert.ok(!CLC.useDerived(CLC.merge(corpus, demo), D, null));
  const demo2 = JSON.parse(JSON.stringify(demo)); demo2.samples[0].moment += ' One more sentence.';
  assert.ok(!CLC.useDerived(CLC.merge(corpus, demo2), D, hash), 'a changed sample is a changed basis');
  // the sentences of a moment are split once, and a caller's copy is its own
  const s = fresh.story['s-A1-beverley-mclachlin'], ss = CLC.sentences(s.moment);
  ss.push('x'); assert.notEqual(CLC.sentences(s.moment).slice(-1)[0], 'x');
  const app = Object.assign({}, s, { moment: CLC.bodyAfterPlace(s.moment, s.place) });
  for (const x of [s, app, s, app]) assert.equal(CLC.teaser(x), CLC.teaser(Object.assign({}, x, { id: undefined })), 'the engine’s copy and the index’s each keep their own teaser');
  assert.equal(CLC.teaser(Object.assign({}, s, { moment: 'Ottawa, 2000. A new first line here.' })), 'A new first line here.', 'a changed moment is read again');
  assert.equal(CLC.lead(s.moment, s.place, s), CLC.lead(s.moment, s.place));
});

test('round six, reviewed: what is built while the page is idle is what is built at once, and what is kept is said again', () => {
  const crypto = require('node:crypto'), CLN = require('../lib/net.js'), CLQ = require('../lib/ask.js'), D = J('../data/derived.json');
  const hash = crypto.createHash('sha256').update(fs.readFileSync(new URL('../data/corpus.json', import.meta.url))).digest('hex');
  const strip = (V) => JSON.stringify(Object.assign({}, V, { fam: 0, away: 0, sit: 0 })), had = globalThis.CLN;
  globalThis.CLN = CLN;   // as a page has it (window.CLN), so the warm can reach the move vectors
  // the move vectors, the text vectors and every situation's families, built a slice at a time (in node, at once)
  const now = CLC.merge(corpus, demo), idle = CLC.merge(corpus, demo); CLC.useDerived(now, D, hash); CLC.useDerived(idle, D, hash);
  let done = 0; CLC.warm(idle, [idle.sit.E1.key, 'not-a-situation'], () => { done++; });
  assert.equal(done, 1, 'the warm finishes, once');
  assert.equal(strip(idle._mv), strip(CLN.moveVectors(now)), 'the move vectors built in slices are the ones built at once');
  assert.deepEqual(idle._tx, CLC.textIndex(now), 'and so are the text vectors');
  assert.deepEqual(Object.keys(idle._mv.fam).sort(), idle.situations.map((s) => s.key).sort(), 'every situation’s families are made');
  for (const s of idle.situations) assert.deepEqual(idle._mv.fam[s.key], CLN.moveFamilies(now, s.key), s.id);
  const mv = idle._mv, tx0 = idle._tx, fam = idle._mv.fam[idle.sit.E1.key];
  CLC.warm(idle, [], () => { done++; });
  assert.ok(done === 2 && idle._mv === mv && idle._tx === tx0 && !!fam && idle._mv.fam[idle.sit.E1.key] === fam, 'a second warm of the same index builds nothing, and says so');
  // built from the corpus, with no shipped counts, the text vectors in slices are the same as well
  const bare = CLC.merge(corpus, demo), bare2 = CLC.merge(corpus, demo); let tx = null; CLC.textIndexIdle(bare, (t) => { tx = t; });
  assert.deepEqual(tx, CLC.textIndex(bare2));
  // a story's reasons on the warmed index are the reasons on a cold one
  for (const id of ['st-obama-2008-clinton', 'st-michelle-obama-2016-go-high', 's-E1-jane-fraser']) assert.deepEqual(CLC.likeThis(idle, id, 8, { role: 'member', three: ['barack-obama'] }), CLC.likeThis(now, id, 8, { role: 'member', three: ['barack-obama'] }), id);
  // the gaps are counted once while the checks and the members hold, and afresh once a story is checked
  const G = CLC.merge(corpus, demo), g1 = CLQ.gaps(G);
  assert.deepEqual(CLQ.gaps(G), g1); assert.notEqual(CLQ.gaps(G), CLQ.gaps(G), 'each caller has its own list');
  const all = {}; G.stories.forEach((s) => { all[s.id] = { by: 'coach', at: '2026-10-19T09:00:00Z' }; });
  CLC.applyVerification(G, all);
  const fresh = CLC.applyVerification(CLC.merge(corpus, demo), all), g2 = CLQ.gaps(G);
  assert.notDeepEqual(g2, g1, 'a check changes what is thin'); assert.deepEqual(g2, CLQ.gaps(fresh));
  // a source is said once for each reader and status, and a check changes what a member reads
  const s0 = Object.assign({}, now.stories.find((s) => !s.verified && /;/.test(s.source || '')));
  const asMember = CLC.sourceFor(s0, 'member'); assert.equal(asMember, '');
  assert.equal(CLC.sourceFor(s0, 'member'), asMember);
  assert.notEqual(CLC.sourceFor(Object.assign({}, s0, { verified: true }), 'member'), '', 'once checked, the member reads its citation');
  assert.equal(CLC.sourceFor(s0, 'coach'), CLC.sourceFor(Object.assign({}, s0), 'coach'));
  globalThis.CLN = had;
});

test('round six: the Ask, a second pass', () => {
  const CLQ = require('../lib/ask.js'), CLN = require('../lib/net.js');
  const read = (t, m) => CLQ.read(lib, t, { m }).q;
  const scene = (id) => (CLQ.reasons(lib, lib.story[id], { cue: 'setback', sit: 'B6' }).find((r) => r.type === 'scene') || {}).text;
  // A: a loss is somebody else's only when their name opens the sentence as its subject; her own work's loss stays hers
  assert.match(scene('s-B6-zaha-hadid') || '', /she had lost the competition/);
  assert.match(scene('s-A4-jackie-chan') || '', /Chan's films failed/);
  for (const id of ['st-bjk-1973-riggs', 'st-obama-2008-clinton']) assert.ok(!scene(id), id);
  const p8 = CLQ.answer(lib, read("Maya's roadmap review went badly and the directors talked over her. Something for Friday.", 'maya'), { limit: 30 });
  assert.equal(p8.cueN, 3); assert.equal(p8.items[1].story.id, 's-B6-zaha-hadid');
  // an adverb or a short aside between the name and the loss leaves it that name's loss
  const lostBy = (icon, moment) => !CLQ.reasons(lib, { id: 'x-' + icon, icon, keys: [], moment }, { cue: 'setback' }).some((r) => r.type === 'scene');
  for (const x of ['Richard Nixon narrowly lost the election.', 'Richard Nixon, the sitting vice president, lost.', 'Richard Nixon had narrowly lost.']) assert.ok(lostBy('john-f-kennedy', x), x);
  assert.ok(lostBy('barack-obama', 'Hillary Clinton eventually lost the nomination.'));
  for (const x of ['Barack Obama, then a state senator, lost the primary.', 'Barack Obama narrowly lost the primary.']) assert.ok(!lostBy('barack-obama', x), x);
  // a name may carry a capital inside it
  for (const x of ['John McCain, the Republican nominee, lost the election.', "Tip O'Neill finally lost the vote.", 'Charles DeGaulle lost.']) assert.ok(lostBy('barack-obama', x), x);
  assert.ok(!lostBy('douglas-macarthur', 'Douglas MacArthur then lost the argument.'));
  // B: a department, a group or the question's own member is nobody a one-to-one is held with
  for (const t of ['What should I tell Sarah before she announces the reorg?', 'What do I tell Maya before she announces the new roadmap?', 'Something Sarah said to Marketing after the announcement',
    'What should Sarah tell Engineering when she announces the reorg?', 'What can I say to Priya before she announces the change?', 'What should Sarah tell Customers when she announces the reorg?']) assert.equal(read(t).room, 'team', t);
  assert.ok(!read('How do I tell Tom his plan was turned down?').room);
  // a person the line is told to, or said to, is a one-to-one, and a member who is not the question's is such a person
  for (const t of ['What can Sarah say to Dan after she announces the reorg?', 'What should Sarah tell Dan after she announces the reorg?', 'What can Sarah tell Dan when he is upset?',
    'What should I tell Sarah to say to Dan?', 'What can Maya say to Tom after she announces the roadmap?', "What should Sarah tell Dan's boss after she announces the reorg?",
    'What should Sarah tell Dan Smith after she announces the reorg?']) assert.equal(read(t).room, 'one', t);
  // a name whose group is told is no such person, and nor is a group's word outside the list
  for (const t of ["What should Sarah tell Dan's team after she announces the reorg?", "What should Sarah tell Dan's whole department after she announces the reorg?",
    'What should Sarah say to Senior Leadership after she announces the reorg?', 'What should Sarah tell Head Office after she announces the reorg?',
    'What should Sarah tell Partners after she announces the reorg?', 'What should Sarah say to Group Finance after she announces the reorg?']) assert.equal(read(t).room, 'team', t);
  // the member is the question's subject; a member named as the one spoken to, or for an age, is not
  for (const [t, m] of [['What can Maya say to Tom after she announces the roadmap?', 'maya'], ['Michael could say to Tom at the board meeting', 'michael'],
    ['What should I tell Sarah before she announces the reorg?', 'sarah'], ["Someone Michael's age for Sarah", 'sarah']]) assert.equal(read(t).m, m, t);
  assert.equal(read("Someone Michael's age for Sarah").age, lib.members.michael.age);
  // a member named in a leading clause, spoken to or met with, is not the question's subject
  for (const [t, m] of [['When Sarah announces the reorg, what should Tom tell his team?', 'tom'], ["After Maya's review went badly, what can Priya say to her?", 'priya'],
    ['Because Sarah wanted his job, what can Tom say to her?', 'tom'], ['After talking to Maya, Sarah announces the reorg', 'sarah'], ['In her one-to-one with Tom, what should Sarah say?', 'sarah']]) assert.equal(read(t).m, m, t);
  // on a member's own thread another member only spoken to leaves the member, and the room, as they were
  const own = CLQ.read(lib, 'What can I say to Tom?', { m: 'maya' }).q;
  assert.equal(own.m, 'maya'); assert.equal(own.room, 'one');
  assert.equal(read('Before the board meeting, what should Tom tell his team?').to, 'down');
  // C: a room named outright comes before the team an announcement implies
  assert.equal(read('Sarah announces the reorg in an email. What can she say to Dan?').room, 'writing');
  assert.equal(read('Sarah announces the reorg at the offsite. What can she say to Dan?').room, 'team');
  // the room an announcement is placed in comes first; a room only mentioned leaves the announcement its team
  for (const [t, room] of [['Sarah announces the reorg at the board meeting; what can she say?', 'board'], ['Sarah announces the reorg by email', 'writing'],
    ['Sarah announces the reorg to the press', 'pub'], ['Sarah announces the reorg in private', 'one'], ['Sarah announces the reorg in a short email', 'writing'],
    ["Sarah announces the reorg at this week's board meeting", 'board'], ['Sarah is giving a speech to announce the reorg', 'pub'], ['Sarah has drafted an email announcing the reorg', 'writing']]) assert.equal(read(t).room, room, t);
  for (const t of ["Sarah announces the committee's decision to her team", "Sarah announces the reorg after Dan's pitch went badly", 'Priya announces the new deck template to the team',
    "Sarah announces the panel's findings to the group", 'Sarah announces the reorg after the conference']) assert.equal(read(t).room, 'team', t);
  // with no announcement the first room in the list stays first
  assert.equal(read('At the keynote Sarah needs the committee to back her').room, 'board');
  // D: turning it down is a choice when the member, I or we did it, or she or he turned down a thing; a person turned
  // down by somebody else is the setback
  for (const t of ['She turned it down because the timing was wrong', 'Priya turned them down and kept her team', 'Sarah turned him down for the role']) assert.notEqual(read(t).cue, 'setback', t);
  for (const t of ['The CEO turned her down for the role', 'The board turned it down', "Maya's plan was turned down by the VP",
    'Priya asked her boss for the budget and he turned her down.', 'Sarah went to the CEO and he flatly turned her down.']) assert.equal(read(t).cue, 'setback', t);
  assert.notEqual(read('She turned down his proposal').cue, 'setback');
  // when the member pitched, asked, or took or put something to a person, the she, he or they who turns it down next
  // is that person, whatever the member: no sex is read from a name, and Priya and David have none on record
  for (const t of ['Maya pitched the roadmap to the VP and he turned it down', 'Sarah asked the CEO for more headcount but he turned it down', 'Maya asked Tom for help and Tom turned her down',
    'Maya pitched the roadmap to the VP and she turned it down.', 'Priya asked her boss for budget and he turned down her request', 'David asked his manager for more time and she turned it down',
    'Priya took her case to the committee and she turned it down', "Sarah's boss turned her request down"]) assert.equal(read(t).cue, 'setback', t);
  // the one asked, or offered it, who turns it down chose: the subject of the clause before carries on
  for (const t of ['The VP asked Maya to lead it and she turned it down', 'Dan asked Priya to take the role and she turned it down', 'She was offered the role and turned it down',
    'Maya was offered the job and turned it down', 'She turned his request down']) assert.notEqual(read(t).cue, 'setback', t);
  assert.equal(read('The VP was offered the plan and turned it down').cue, 'setback');
  // E: "can tell" with what is seen after it asks for no line; telling a person something does
  for (const t of ['Sarah can tell her team is anxious', 'Tom could tell the plan was failing', 'Maya can tell the directors are not listening', 'Sarah can tell when her team is tired', 'Sarah can tell that the team is tired']) assert.ok(!read(t).line, t);
  for (const t of ['What might Maya tell the VP?', 'What can Sarah tell her team about the reorg?', 'Something Sarah can tell Dan',
    // only "can" or "could", never in a question that opens with what or how, past a clause, or into the next sentence
    'What can Sarah tell Dan when he is upset?', 'What should Tom tell his team that will calm them?', 'What should Maya tell that VP?',
    'What should Sarah tell the board? She was talked over', 'What could Tom tell Ana, who was passed over?', 'Sarah can tell the board. She was talked over', 'Tom could tell the team it is over', 'Sarah could tell that VP about the reorg',
    // a "can tell" that is seen leaves a later one asking for words, and a name after the people told is what they hear
    'Sarah can tell the team is anxious. What can Sarah tell Dan?', 'Sarah can tell the team Dan is leaving', 'Can you tell me what Sarah should say to Dan?', 'Words Tom can use with his team']) assert.equal(read(t).line, 1, t);
  // asking the Library for a story is no line, and telling whether, if or from what is judging it
  for (const t of ['Can you tell me a story where someone was talked over?', 'Could you tell me who handled a rival well?', 'How can Sarah tell whether the team trusts her?',
    'Tom could tell from the room that it had gone badly']) assert.ok(!read(t).line, t);
  // the hero goes by the whole name when a life in the line holds the short one, and a name ending "Jr." takes one full stop
  assert.match(CLQ.answer(lib, { m: 'sarah', sit: 'E1' }).ready.route, /^For Sarah: one step from Barack Obama\. /);
  const three = ['jimmy-carter', 'john-f-kennedy', 'barack-obama'], kin = (icon, key) => CLN.linksTo(lib, 'david', icon, lib.sit[key].key, { three }).line;
  assert.match(kin('jacqueline-kennedy-onassis', 'E1'), /^One step from John F\. Kennedy\. /);
  // (a way of leading weighs 1 in a nearness since round six, so with Obama in the three Rosalynn Carter is reached
  // through John Lewis; without him, through King)
  const kin2 = (icon, key) => CLN.linksTo(lib, 'david', icon, lib.sit[key].key, { three: three.slice(0, 2) }).line;
  assert.match(kin2('rosalynn-carter', 'D4'), /^Two steps from Jimmy Carter, through Martin Luther King Jr\. Martin/);
  assert.match(kin('winston-churchill', 'D4'), /^Two steps from Carter, through Martin Luther King Jr\. Martin/);
  assert.equal(CLN.linksTo(lib, 'sarah', 'jimmy-carter', lib.sit.E1.key).line, 'One step from Obama. Both had every act read as a signal.');
  // the Ask's reading of a story stays beside it, so the API sends the story as the corpus has it
  CLQ.answer(lib, read("Maya's roadmap review went badly. What should she say to the VP?", 'maya'), { limit: 99 });
  assert.ok(lib.stories.every((s) => !Object.keys(s).some((k) => /^_(scene|saidTo)$/.test(k))));
  // the source line: no abbreviation in any case ends it, and no working note is left in it
  assert.ok(!/\bRev\.$/.test(CLQ.sourceLine(lib.story['s-D1-cesar-chavez'])));
  assert.equal(CLQ.sourceLine(lib.story['st-bjk-1973-riggs']), 'Billiejeanking.com, “Battle of the Sexes”.');
  // a citation still being checked keeps beside it the source the record names for the moment
  assert.equal(CLQ.sourceLine(lib.story['s-B5-michelle-obama']), 'Michelle Obama, Becoming (Crown, 2018); the moment is from her speech to the Democratic National Convention, Denver, 25 August 2008.');
  for (const s of lib.stories) { const t = CLQ.sourceLine(s); assert.ok(!/\b(?:rev|mrs|vol|trans|eds)\.$/i.test(t) && !/\b(?:check|confirm)\b/i.test(t), s.id + ': ' + t); }
  // the committee pattern adds weight and leads only when nothing plainer is said
  assert.equal(read('Michael needs the board to approve his pitch to Calder Foods').sit, 'C1+C3');
  assert.equal(read('Priya needs the committee to back her plan').sit, 'C3');
  // beside another cue it is read second, and it leads when the rest is too thin to be read beside it
  // beside the situation the other cue names, never one read from loose words alone: the reorg is D4, for Sarah as for
  // Tom, whose own situation it is
  for (const [t, sit] of [['Sarah needs the board to support the reorg', 'D4+C3'], ['David wants the committee to sign off the hire he can\'t judge', 'A5+C3'],
    ['How does Maya get the committee to support a plan her peers wrote?', 'C3+A2'], ['Tom wants the steering group to support the reorg. What should he tell Mark after the meeting went badly?', 'D4+C3']]) assert.equal(read(t).sit, sit, t);
  assert.equal(read('Needs the board to support the reorg', 'tom').sit, 'D4+C3');
  // a loose word lifted by nothing never puts it third
  for (const [t, sit] of [['Sarah needs the committee to back her, and everyone noticed she was talked over', 'B6+C3'],
    ["David needs the board to sign off the hire he can't judge, and the announcement is Monday", 'A5+C3']]) assert.equal(read(t).sit, sit, t);
  // the words the pattern reads are its own: "the board to sign off" is no A5
  assert.equal(read('Priya needs the board to sign off the budget').sit, 'C3');
  // compare says "and", as the chips do
  assert.ok(CLQ.compare(lib, 'st-obama-2008-clinton', 's-A2-barack-obama').shared.includes('Both from politics and public life'));
  // a short list keeps one place for what the member had, a longer one two
  const M = lib.members.maya, keep = M.micro, extra = CLQ.answer(lib, { m: 'maya', sit: 'B6' }, { limit: 99 }).items.filter((x) => !x.had)[5].story.id;
  M.micro = keep.concat([{ w: 0, ins: { story: extra } }]);
  try {
    const had = (limit) => CLQ.answer(lib, { m: 'maya', sit: 'B6' }, { limit }).items.filter((x) => x.had).length;
    assert.deepEqual([3, 5, 6, 12].map(had), [1, 1, 2, 2]);
  } finally { M.micro = keep; }
  // and what the member had fills the places the fresh stories leave
  const all = CLQ.answer(lib, { m: 'maya', sit: 'B6' }, { limit: 99 }), lead = [all.ready, all.oneCheck].filter(Boolean).map((x) => x.story.id);
  M.micro = keep.concat(all.items.map((x) => x.story.id).filter((id) => !lead.includes(id)).slice(1).map((id) => ({ w: 0, ins: { story: id } })));
  try { assert.deepEqual([3, 5].map((limit) => CLQ.answer(lib, { m: 'maya', sit: 'B6' }, { limit }).items.length), [3, 5]); } finally { M.micro = keep; }
  // a member's own manager is above them
  assert.equal(read('In the staff meeting, what should Tom tell his manager?').to, 'up');
  assert.equal(read('Sarah has to win over her manager').to, 'up');
});
