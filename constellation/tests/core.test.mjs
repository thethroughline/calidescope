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
  assert.equal(plan.picks.length, 10, 'nine, and one more for the drafts whose sources name no work (the Gloucester Hotel among them)');
  assert.equal(plan.members.find((m) => m.id === 'david').have, 0);
  assert.ok(plan.members.every((m) => m.left === 0), 'every gap closes, David’s included');
  assert.equal(plan.picks[0].story.icon, 'golda-meir');
  assert.deepEqual(plan.picks[0].serves, ['david', 'priya']);
  assert.ok(plan.picks[0].near.some((x) => x.id === 'priya' && x.links === 0), 'one of Priya’s three');
  for (const p of plan.picks) assert.ok(!p.story.verified && ['near', 'mid'].includes(p.story.reach));
  // check the first and plan again: one fewer
  const s0 = lib.story[plan.picks[0].story.id];
  s0.verified = true;
  try { assert.equal(CLN.checkPlan(lib, { sent, avoid }).picks.length, 9); } finally { s0.verified = false; }
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
  // E1, frozen as measured: seven families, 27 of 41 stories in one, 14 with a move of their own
  const E1 = CLN.moveFamilies(lib, lib.sit.E1.key);
  assert.deepEqual(E1.fams.map((f) => f.members.length), [8, 6, 4, 3, 2, 2, 2]);
  assert.equal(E1.alone.length, 14);
  assert.equal(CLN.moveFamilies(lib, 'E1'), E1, 'a code reads as its situation');
  assert.equal(CLN.stem('need'), CLN.stem('needed')); assert.notEqual(CLN.stem('feed'), CLN.stem('fee'));
  assert.equal(E1.fams[0].hub, 's-E1-martin-luther-king-jr');
  assert.equal(E1.fams[0].move, 'Write the one sentence you expect people to repeat about your reaction');
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
  assert.equal(ties, 494);
  // the same move in another week: never a story of the same situation or the same life
  let away = 0;
  for (const s of lib.stories) {
    const m = CLN.sameMoveElsewhere(lib, s.id); if (!m) continue; away++;
    assert.ok(m.story.icon !== s.icon && !m.story.keys.some((k) => s.keys.includes(k)) && m.w >= 0.35 && m.pair.a && m.pair.b, s.id);
  }
  assert.equal(away, 31);
  // judged on the moves alone, Ogilvy's D3 story makes Jobs's E3 move: block, slot, craft, hand
  const og = CLN.sameMoveElsewhere(lib, 's-D3-david-ogilvy');
  assert.equal(og.story.id, 's-E3-steve-jobs'); assert.ok(og.words.includes('craft') && og.words.includes('block'));
  // no family title or reason opens on a fragment ("With the successor copied")
  const FR = /^(with|in|at|on|by|for|from|to|which|each|whose|where|when|until|before|after)\b/i;
  for (const st of lib.situations) for (const f of CLN.moveFamilies(lib, st.key).fams) assert.ok(!FR.test(f.move), st.id + ': ' + f.move);
  assert.equal(CLN.moveWords(lib, 's-E1-thomas-lamont', 's-E1-john-foster-dulles'), 'The same move: write the one sentence you want repeated in the corridor');
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
  for (const id of ['s-E1-john-foster-dulles', 's-E1-warren-buffett', 's-E1-lloyd-blankfein']) assert.ok(corridor.members.includes(id), id + ' is in the corridor family');
  let ties = 0, rows = 0, big = 0;
  for (const st of lib.situations) for (const f of CLN.moveFamilies(lib, st.key).fams) {
    // no tie shows a word missing from either move, and a row marks only words another row of its family wrote the same way
    for (const t of f.ties) { ties++; for (const w of t.words) assert.ok(wrote(t.a, w) && wrote(t.b, w), st.id + ': ' + w + ' in both ' + t.a + ' and ' + t.b); }
    for (const id of f.members) {
      const r = f.rows[id]; rows++;
      assert.ok(r.text && fold(lib.story[id].move_examples.join(' ')).includes(fold(r.text)), id + ' says its own clause');
      for (const w of r.marks) assert.ok(wrote(id, w) && f.members.some((m) => m !== id && fold(f.rows[m].text).split(/[^a-z]+/).includes(w)), id + ' marks ' + w);
    }
    // a family of four or more is no chain: each row is tied to the hub, or to two rows
    if (f.members.length >= 4) { big++; for (const id of f.members) if (id !== f.hub) {
      const mine = f.ties.filter((t) => t.a === id || t.b === id);
      assert.ok(mine.some((t) => t.a === f.hub || t.b === f.hub) || mine.length >= 2, st.id + ': ' + id + ' is tied to the hub or to two');
    } }
  }
  assert.ok(ties > 400 && rows > 350 && big >= 30, ties + ' ties, ' + rows + ' rows, ' + big + ' families of four or more');
  // a same-move link comes with the clause each story makes it in; a chance pair of words makes none
  assert.equal(CLN.sameMoveElsewhere(lib, 'st-bjk-1973-riggs'), null, 'King to Eisenhower, on "conversation" and "turned", is no link');
  const mb = CLN.sameMoveElsewhere(lib, 's-B4-constance-baker-motley');
  assert.equal(mb.story.id, 's-C1-charlotte-beers');
  assert.deepEqual([mb.pair.a, mb.pair.b], ['Tell the partner leading it which part you will present', 'Ask the partner leading it for one section you will present alone, and present it']);
  for (const s of lib.stories) { const m = CLN.sameMoveElsewhere(lib, s.id); if (m) for (const w of m.words) assert.ok(wrote(s.id, w) && wrote(m.story.id, w), s.id + ' ' + w); }
  // "direct" and "directly" weigh together and are never said as one word
  assert.ok(!CLN.moveTie(lib, 's-E1-john-foster-dulles', 's-E1-emma-watson').words.some((w) => /^direct/.test(w)));
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
      assert.equal(L.route, 'For ' + lib.members[m].first + ': ' + lt.line.charAt(0).toLowerCase() + lt.line.slice(1));
      if (lt.steps.some((x) => x.tie.shared.includes(st.key))) assert.ok(L.route.includes(CLN.both(st.key)), m + ' ' + st.id + ': ' + L.route);
      if (lt.links > 1) assert.ok(!/\. Both /.test(lt.line) && /^(Two|Three) steps from [^,]+, through /.test(lt.line), lt.line);
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
  assert.equal(maya[0].why, 'From your fourth hero, for a week when everything you do gets read as a signal.');
  for (const m of lib.order) {
    const keys = lib.members[m].sits.map((id) => lib.sit[id].key), top = CLN.fitFor(lib, m, { exclude: had(m), avoidIcons: recent(m), n: 1 })[0];
    assert.ok(top && top.story.keys.some((k) => keys.includes(k)), m + ': the top pick carries one of their situations');
    assert.ok(!had(m).includes(top.story.id) && !recent(m).includes(top.story.icon), m + ': nothing they have had, no life from the last fortnight');
  }
  // an age counts only where the year holds: Johnson's 1950 against "late 1950s" does not
  assert.ok(!CLN.yearAgrees(lib.story['st-kjohnson-1958-langley']) && CLN.yearAgrees(lib.story['st-bjk-1973-riggs']));
  assert.ok(!CLN.fitFor(lib, 'maya', {}).some((x) => x.story.id === 'st-kjohnson-1958-langley' && x.terms.some((t) => t.k === 'age')));
  // #4 one answer per member and week: it carries the week, could be sent, and never offers what already goes
  for (const m of lib.order) {
    const key = lib.sit[lib.members[m].up19.sit].key, n0 = CLN.nextFor(lib, m, { key, exclude: had(m), avoid: recent(m) });
    for (const x of [n0.ready, n0.pick].concat(n0.next).filter(Boolean)) assert.ok(x.story.keys.includes(key) && ['near', 'mid'].includes(x.story.reach) && !had(m).includes(x.story.id) && CLN.sourceOk(x.story), m + ' ' + x.story.id);
    if (n0.ready) assert.notEqual((CLN.nextFor(lib, m, { key, exclude: had(m), avoid: recent(m), going: [n0.ready.story.id] }).ready || { story: {} }).story.id, n0.ready.story.id, m + ': what goes is never offered again');
  }
  assert.equal(CLN.nextFor(lib, 'sarah', { key: lib.sit.E1.key, exclude: had('sarah'), avoid: recent('sarah') }).ready.story.id, 'st-michelle-obama-2016-go-high');
  // one title per story: life, short place and year, the dateline's own words where the year cannot say it
  assert.equal(CLC.storyTitle(lib, 'st-bjk-1973-riggs'), 'Billie Jean King, Houston 1973');
  assert.equal(CLC.storyTitle(lib, 's-C3-golda-meir'), 'Golda Meir, Chicago 1948');
  assert.equal(CLC.storyTitle(lib, 'st-kjohnson-1958-langley'), 'Katherine Johnson, Langley, late 1950s');
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
