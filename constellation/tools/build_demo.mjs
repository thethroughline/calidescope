// Build constellation/data/demo.json: the prototype's demo world as data the back end serves.
//
//   node constellation/tools/build_demo.mjs
//
// Reads js/constellation-proto-data.js (the Claude Design export, never edited by hand) and
// data/corpus.json (written by the corpus repo's scripts/export_app.py), and writes:
//   members, coaches, msgs, order, personas   the six clients and three coaches, as the prototype has them
//   heroes, works, samples                    the prototype's heroes, its works list and its 13 sample stories
//   idmap                                     prototype hero id -> library icon id (a corpus id when the
//                                             person is on the roster, else a slug of the name)
//   twins                                     sample story -> the corpus record of the same moment (reviewed)
//   situations                                the member-facing label for all 22 situations
// Deterministic: same inputs, same bytes.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(read('js/constellation-proto-data.js'), ctx);
import { createRequire } from 'node:module';
const CLC = createRequire(import.meta.url)('../lib/core.js');
// the house voice over the prototype's product copy (CLC.COPY); members' own words stay as written
const CPD = CLC.voice(JSON.parse(JSON.stringify(ctx.window.CPD, (k, v) => (typeof v === 'function' ? undefined : v))));
const corpus = JSON.parse(read('data/corpus.json'));

const slug = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const byName = new Map(corpus.icons.map((i) => [slug(i.name), i.id]));
const ids = new Set(corpus.icons.map((i) => i.id));
// Names the roster spells differently. Each one checked by hand against the roster record.
const SPELLING = { beyonce: 'beyonce-knowles' };

const idmap = {};
for (const h of CPD.heroes) {
  const hit = SPELLING[h.id] || byName.get(slug(h.name));
  if (hit && !ids.has(hit)) throw new Error(`spelling override ${h.id} -> ${hit} is not on the roster`);
  idmap[h.id] = hit || slug(h.name);
}
// A prototype-only hero must not take the id of a different roster icon.
for (const [pid, uid] of Object.entries(idmap)) {
  const icon = corpus.icons.find((i) => i.id === uid);
  const h = CPD.hero[pid];
  if (icon && slug(icon.name) !== slug(h.name) && !SPELLING[pid]) throw new Error(`id clash: ${pid} -> ${uid}`);
}

// Sample stories that tell the same moment as a corpus record. Read side by side, 22 October 2026:
// same person, same scene, same year. The sample keeps its id (the demo script points at it) and
// takes the corpus record's keys, examples and review; the corpus record is not listed twice.
const TWINS = {
  'st-jackie-robinson-1945-rickey': 's-E1-jackie-robinson',
  'st-kjohnson-1958-langley': 's-B6-katherine-johnson',
  'st-obama-1990-law-review': 's-A2-barack-obama',
  'st-schultz-1987-seattle': 's-A2-howard-schultz',
  'st-ali-1964-miami': 's-B4-muhammad-ali',
  'st-marley-1960s-kingston': 's-C2-bob-marley',
  'st-bjk-1973-gloucester': 's-A2-billie-jean-king',
};
const storyIds = new Set(corpus.stories.map((s) => s.id));
for (const [a, b] of Object.entries(TWINS)) {
  if (!CPD.story[a]) throw new Error(`twin sample missing: ${a}`);
  if (!storyIds.has(b)) throw new Error(`twin corpus record missing: ${b}`);
  const cs = corpus.stories.find((s) => s.id === b);
  if (cs.icon !== idmap[CPD.story[a].hero]) throw new Error(`twin ${a} and ${b} are different people`);
}

// The prototype names A1 by a working key; the corpus key is the one every record carries.
const KEYMAP = { 'nobody-told-you-what-the-job-asks': 'unnamed-expectations' };
const mapKey = (k) => KEYMAP[k] || k;

// Member-facing labels. Eleven come from the prototype with their line, five with a label only, and
// six are new here, written to match: a short label, then one line in the second person.
const LABELS = {};
for (const s of CPD.sits) LABELS[mapKey(s.key)] = { chip: s.chip, line: s.line || '', from: 'prototype' };
const ADDED = {
  'naming-an-unseen-problem': [null, 'You inherited a problem and everyone here thinks things are fine.'],
  'following-a-legend': ['Following someone they loved', 'The person before you was loved here, and you are measured against them.'],
  'judging-unfamiliar-work': ["Accountable for work you can't judge", 'You answer for work you could not do yourself.'],
  'credit-and-attribution': [null, "Your work reaches the client in somebody else's voice."],
  'style-against-expectation': [null, 'You are quiet in meetings, and you are not going to start shouting.'],
  'unclassifiable-profile': [null, 'People do not know what to do with you.'],
  'saying-it-in-your-own-words': [null, 'You have to announce yourself, and every draft sounds like everyone else.'],
  'leading-beyond-line-of-sight': ['More people than you can see', 'Your team is bigger than the people you see each week.'],
  'developing-without-a-bench': ['Growing people without a bench', 'The people you used to grow through have gone.'],
  'the-loss-inside-the-promotion': ['Losing what you were best at', 'The promotion took away the work you were best at.'],
  'competent-and-becalmed': ['Good at it, and becalmed', 'It works, you are good at it, and you are bored.'],
};
for (const [k, [chip, line]] of Object.entries(ADDED)) {
  const cur = LABELS[k] || { chip: '', line: '', from: 'added' };
  LABELS[k] = { chip: chip || cur.chip, line: cur.line || line, from: cur.from === 'prototype' ? 'prototype+line' : 'added' };
}
const situations = corpus.situations.map((s) => {
  const L = LABELS[s.match_key];
  if (!L || !L.chip || !L.line) throw new Error(`no member label for ${s.match_key}`);
  return { id: s.id, key: s.match_key, chip: L.chip, line: L.line, label_from: L.from };
});

const heroes = CPD.heroes.map((h) => ({
  id: h.id, icon: idmap[h.id], name: h.name, short: h.short, ini: h.ini, area: h.area, sex: h.sex,
  stance: h.stance || '', desc: h.desc, q: h.q || [], wiki: h.wiki || null, year: h.year || null, cross: !!h.cross,
}));
const works = CPD.works.map((w) => ({ ...w, icon: idmap[w.hero] }));
// The checked samples with no corpus twin carry no rating, no moves and no lines of their own, so a facet ("quieter",
// "a line to borrow") would drop the only stories a coach can send. Rated here, the lines in our words,
// as the corpus's lines are. A twin's own rating and lines win where a twin exists.
const RATED = {
  'st-bjk-1973-riggs': { directness: 'direct', move_examples: [
    'This week, put the conversation you have been avoiding in the diary, and open it by naming what the two of you will decide. Ten minutes.',
    'At the team meeting, say yes to the thing you turned down, and say why waiting costs more. One minute.'], line_examples: [
    "To the colleague you have been putting off: Let's settle it this week. Here is when, and here is what we decide.",
    "To your team: I said no once. I'm saying yes now, because waiting costs all of us more."] },
  'st-michelle-obama-2016-go-high': { directness: 'calibrated', move_examples: [
    'At the team meeting after a cruel remark, leave its author unnamed; say what the team stands for, then move to the next item. One minute.'], line_examples: [
    "To your team, after a cruel remark in the meeting: We won't answer that in kind. Here is what we stand for, and we'll hold to it.",
    "To a peer who wants you to hit back: Let the room compare us. I won't attack; watch what we do next."] },
  'st-obama-2008-clinton': { directness: 'calibrated', move_examples: [
    'At the first team meeting, give the colleague who wanted the job the senior seat on the biggest piece of work, and announce it standing beside them. Two minutes.'], line_examples: [
    "To the colleague who wanted the job: I want you in the senior seat on this, and I'll say so in front of the team.",
    "To your team: They were the strongest candidate for this job, and that is why they lead this work. I'm standing beside them as I say it."] },
  'st-obama-2008-more-perfect-union': { directness: 'direct', move_examples: [
    'At the team meeting, say the hardest part of the news yourself, in your own words, before anyone else can frame it. Three minutes.'], line_examples: [
    "To your team, before the rumour reaches them: Here is the hard part, in my words, before anyone else tells it.",
    "To your boss: I'm going to address it in full this week, in my own words. Here is the outline."] },
  'st-stevie-wonder-1971-motown': { directness: 'direct', move_examples: [
    'In your next client meeting, bring the finished piece and present it yourself, with your name on the cover. Twenty minutes.'], line_examples: [
    "To your manager: This work is mine. I want my name on it when it goes out.",
    "To the client lead: I'll bring the finished piece to the meeting, and I'll present it myself."] },
};
const samples = CPD.stories.map((s) => ({ ...s, keys: s.keys.map(mapKey), icon: idmap[s.hero], twin: TWINS[s.id] || null, ...(RATED[s.id] || {}) }));

const members = {};
for (const id of CPD.order) {
  const m = CPD.members[id];
  members[id] = { ...m, heroes_icons: { core: (m.core || []).map((h) => idmap[h]), reserve: m.reserve ? idmap[m.reserve] : null } };
}

const out = {
  meta: {
    built_from: ['js/constellation-proto-data.js', 'data/corpus.json'], corpus_commit: corpus.meta.commit,
    note: 'Sample data. Members and companies are fictional. Heroes are real people.',
  },
  coaches: CPD.coaches, members, order: CPD.order, personas: CPD.personas, msgs: CPD.msgs,
  heroes, works, samples, idmap, twins: TWINS, keymap: KEYMAP, situations,
};
fs.writeFileSync(path.join(ROOT, 'data/demo.json'), JSON.stringify(out, null, 1) + '\n');
const matched = Object.values(idmap).filter((v) => ids.has(v)).length;
console.log(`written data/demo.json · ${CPD.order.length} members · ${Object.keys(CPD.coaches).length} coaches · ` +
  `${heroes.length} heroes (${matched} on the roster) · ${samples.length} samples (${Object.keys(TWINS).length} twins) · ${works.length} works`);
