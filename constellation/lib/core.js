/* Constellation core. One index over the corpus and the demo world, shared by three readers:
   the API (api/constellation.js), the prototype bridge (js/constellation-bridge.js) and the
   Library (library/). Pure functions only: same inputs, same output.

     CLC.merge(corpus, demo)          -> lib      the unified index (icons, stories, situations, members)
     CLC.search(lib, q)               -> { icons, stories, situations, eras }
     CLC.iconTrails / storyTrails     -> where to go next from a page
     CLC.readingFor(lib, memberId)    -> a coach's prep reading for one member
     CLC.pick / CLC.replay            -> the corpus matcher, ported line for line from scripts/match.py
                                         and scripts/simulate.py in the corpus repo

   Loads as a CommonJS module in Node and as window.CLC in the browser. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CLC = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- vocabulary ----------
  var DOMAINS = {
    politics: ['Politics', 'public'], government: ['Government', 'public'], 'public-service': ['Public service', 'public'], military: ['Military', 'public'],
    law: ['Law', 'law'],
    business: ['Business', 'business'], finance: ['Finance', 'business'], banking: ['Banking', 'business'], 'professional-services': ['Professional services', 'business'],
    agency: ['Advertising', 'media'], media: ['Media', 'media'], marketing: ['Marketing', 'media'], influencer: ['Creators', 'media'],
    sport: ['Sport', 'sport'],
    music: ['Music', 'music'],
    film: ['Film & TV', 'arts'], literature: ['Books & writing', 'arts'], art: ['Art', 'arts'], architecture: ['Architecture', 'arts'], design: ['Fashion & design', 'arts'], food: ['Food', 'arts'],
    science: ['Science', 'ideas'], thought: ['Thought', 'ideas'], religion: ['Faith', 'ideas'], activism: ['Faith & activism', 'ideas'], exploration: ['Exploration', 'ideas']
  };
  var FIELDS = [
    { id: 'public', label: 'Politics & public life' }, { id: 'law', label: 'Law' }, { id: 'business', label: 'Business & finance' },
    { id: 'media', label: 'Advertising & media' }, { id: 'sport', label: 'Sport' }, { id: 'music', label: 'Music' },
    { id: 'arts', label: 'Film, art & letters' }, { id: 'ideas', label: 'Science, ideas & faith' }
  ];
  // The prototype files its heroes by interest area; the library files people by domain.
  var AREA_DOMAIN = { Leader: 'business', Music: 'music', Sport: 'sport', 'Film & TV': 'film', Creators: 'influencer', 'Fashion & design': 'design',
    Business: 'business', 'Politics & public life': 'politics', 'Science & invention': 'science', Art: 'art', 'Books & writing': 'literature',
    Food: 'food', Exploration: 'exploration', 'Faith & activism': 'activism' };
  var STANCE_OF_LABEL = { 'out front': 'front', 'earn it daily': 'earn', 'carry the weight': 'weight', 'grow them': 'grow', 'stay close': 'close', 'out of the way': 'ootw' };
  var FAMILY = { A: 'The new room', B: 'Being heard', C: 'Winning the work', D: 'Carrying people', E: 'The ones nobody sells' };
  var GEO = { AR: 'Argentina', AT: 'Austria', AU: 'Australia', BB: 'Barbados', BR: 'Brazil', CA: 'Canada', CH: 'Switzerland', CN: 'China', CO: 'Colombia',
    CR: 'Costa Rica', CU: 'Cuba', CZ: 'Czechia', DE: 'Germany', ES: 'Spain', FR: 'France', GH: 'Ghana', GR: 'Greece', HU: 'Hungary', IE: 'Ireland',
    IL: 'Israel', IN: 'India', IQ: 'Iraq', IT: 'Italy', JM: 'Jamaica', JP: 'Japan', KE: 'Kenya', LR: 'Liberia', MX: 'Mexico', NZ: 'New Zealand',
    PK: 'Pakistan', PL: 'Poland', PT: 'Portugal', RO: 'Romania', RU: 'Russia', SE: 'Sweden', UK: 'United Kingdom', US: 'United States', VN: 'Vietnam', ZA: 'South Africa' };
  var STATUS = {
    'sample-verified': { label: 'Checked', tone: 'ok', note: 'A demo sample, checked for the prototype.' },
    'sample-draft': { label: 'Recall draft', tone: 'draft', note: 'Written from recall. Read it against the named source before it is sent.' },
    recall: { label: 'Recall draft', tone: 'draft', note: 'Written from recall. Read it against the named source before it is sent.' },
    verified: { label: 'Checked', tone: 'ok', note: 'Read against its source by a coach.' }
  };

  // One name for a draft everywhere, and one line for a member, naming their coach
  // The status as each reader should hear it: a coach the working note, a member their coach's name, anyone else plainly
  function statusLine(s, role, coachFirst) {
    var st = STATUS[s.status] || STATUS.recall;
    if (role === 'coach') return st.note;
    if (s.verified) return 'Checked against its source.';
    return role === 'member' ? draftLine(coachFirst) : 'Not yet checked against its source.';
  }
  // the one mark a member or reader sees on a draft
  function draftLine(coachFirst) { return 'Recall draft \u00b7 ' + (coachFirst || 'a coach') + ' checks it before it is sent'; }
  // The source as a reader may see it. A coach sees everything. A member sees a citation once the story is
  // checked. Nobody but a coach sees a working note ("Corpus draft", "Verify the numbers", "Check wording").
  var NOTE = /^corpus draft\b|\b(?:verify|verified|check|checked|confirm)\b/i;
  function sourceFor(s, as) {
    var src = String((s && s.source) || '');
    // a coach sees the note too, said once as what to do: "Remnick, The Bridge (2010). Check the appointments detail."
    if (as === 'coach') return src.replace(/^corpus draft\.\s*/i, '').split(/;\s*/).map(function (x) {
      x = x.trim().replace(/^(?:verify|confirm)\b/i, 'Check').replace(/\b[Vv]erify\b/g, function (w) { return w.charAt(0) === 'V' ? 'Check' : 'check'; });
      return x.charAt(0).toUpperCase() + x.slice(1);
    }).filter(Boolean).join('. ').replace(/\.\./g, '.');
    if (as === 'member' && !s.verified) return '';
    // clauses end at a full stop or a semicolon; a clause that tells a coach what to do is dropped
    var kept = src.split(/(?<=\.)\s+|;\s*/).filter(function (x) { return x && !NOTE.test(x); }).map(function (x) { return x.trim(); });
    return kept.join('. ').replace(/\.\./g, '.').replace(/([^.])$/, '$1.');
  }
  // A coach's caution as a reader may see it: a coach all of it; on a draft nobody else anything; on a checked
  // story the first sentence that is context, with no working note, no aside to the coach and no internal id
  var ASIDE = /recall-authored|\bverify\b|\bpublish|\bthe fit to\b|\ba member\b|\bmembers\b|\bcoach/i;
  function cautionFor(s, as) {
    var c = String((s && s.caution) || '');
    if (as === 'coach') return c;
    if (!s.verified) return '';
    var kept = c.replace(/\s*\(s-[A-E]\d-[a-z0-9-]+\)/g, '').split(/(?<=\.)\s+/).filter(function (x) { return x && !NOTE.test(x) && !ASIDE.test(x); });
    return kept.length ? kept[0].trim() : '';
  }
  // Why a story fits, as a reader hears it: nobody "chose" a story in the library, so the line names the week in
  // the situation's own words ("It fits your week: everything you do gets read as a signal.", or for a week the
  // member is not in, "It fits this kind of week: saying it in your own words."). mine: the situation key of the
  // member's that the story carries, or true; lib, when given, supplies the words.
  function whyFor(s, as, mine, lib) {
    var w = String((s && s.why) || ''), m = /^Chosen because (.+)$/.exec(w);
    if (as === 'coach' || !m) return w;
    var key = typeof mine === 'string' ? mine : s && s.keys && s.keys[0], st = lib && key && lib.sitByKey[key];
    if (!st) return (mine ? 'It fits your week: ' : 'It fits this kind of week: ') + m[1];
    return (mine ? 'It fits your week: ' : 'It fits this kind of week: ') + lowerFirst(st.chip) + '.';
  }
  function lowerFirst(t) { t = String(t || ''); return /^[A-Z][a-z]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t; }
  function fold(s) { return String(s == null ? '' : s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function slug(s) { return fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function initials(name) { var w = String(name).replace(/[^\p{L}\s'-]/gu, '').split(/\s+/).filter(Boolean); if (!w.length) return '?'; return (w.length === 1 ? w[0].slice(0, 2) : w[0][0] + w[w.length - 1][0]).toUpperCase(); }
  function geoName(g) { if (!g) return ''; return g.split('/').filter(function (c) { return !/^Q\d+$/.test(c); }).map(function (c) { return GEO[c] || c; }).filter(function (c, i, a) { return a.indexOf(c) === i; }).join(' and '); }
  function yearOf(text) {
    var m = /(\d{3,4})(?:\s*(?:-\s*\d+\s*)?(BC|BCE))?/.exec(text || ''); if (!m) return null;
    var y = +m[1]; if (m[2] || /\bBCE?\b/.test(text)) y = -y; return y;
  }
  function eraOf(y) {
    if (y == null) return { id: 'undated', label: 'Undated', from: null, to: null };
    if (y < 1800) return { id: 'before-1800', label: 'Before 1800', from: -9999, to: 1799 };
    if (y < 1900) return { id: '1800s', label: 'The 1800s', from: 1800, to: 1899 };
    var d = Math.floor(y / 10) * 10; return { id: d + 's', label: 'The ' + d + 's', from: d, to: d + 9 };
  }
  function yearLabel(y) { return y == null ? '' : y < 0 ? -y + ' BC' : String(y); }
  // Sentences, without breaking on initials or the usual abbreviations ("J. Walter Thompson", "c. 1976").
  function sentences(t) {
    var out = [], cur = '', w = String(t || '').split(/(\s+)/);
    for (var i = 0; i < w.length; i++) {
      cur += w[i];
      if (/[.!?]["”’)]?$/.test(w[i]) && !/^(?:(?:[A-Z]\.)+|(?:c|ca|St|Mr|Mrs|Ms|Dr|Jr|Sr|vol|no|pp?)\.)$/.test(w[i]) && (i + 2 >= w.length || /^["“‘(]?[A-Z0-9]/.test(w[i + 2] || ''))) { out.push(cur.trim()); cur = ''; }
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function firstSentence(t) { return sentences(t)[0] || ''; }
  // The opening line of a story for a card: past a leading "Place, date." sentence, which the card shows already.
  function lead(moment, place) {
    var ss = sentences(moment), i = 0;
    while (i < ss.length - 1 && (dateline(ss[i], place))) i++;
    return ss[i] || '';
  }
  // The teaser on a card: past a dateline and past an opening of four words or fewer ("September 2017."), cut at
  // 160 characters on a word.
  function teaser(s, max) {
    max = max || 160; var ss = sentences(s && s.moment), i = 0;
    while (i < ss.length - 1 && (dateline(ss[i], s.place) || ss[i].split(/\s+/).length <= 4)) i++;
    var t = ss[i] || '';
    if (t.length > max) { var cut = t.lastIndexOf(' ', max - 1); t = t.slice(0, cut > max / 2 ? cut : max - 1).replace(/[,;:\u2014-]+$/, '') + '\u2026'; }
    return t;
  }
  function dateline(s, place) {
    var b = s.replace(/[.:]$/, '');
    if (place && b === place) return true;
    if (/\b(?:he|she|they|I|we|it|was|were|had|has|is|did|took|made)\b/.test(b)) return false;
    if (b.length <= 48 && /\d/.test(b)) return true;                                                        // "Vancouver, 1981"
    if (b.length <= 40 && /^(?:[A-Z\u00C0-\u024F][\w\u00C0-\u024F'’.-]*\s?)+$/.test(b)) return true;        // "New York", "Königsberg"
    return b.length <= 40 && /^[A-Z\u00C0-\u024F][\w\u00C0-\u024F'’ .-]*,\s/.test(b);                          // "Syracuse, third century BC"
  }
  // A moment without its leading "Place, date." sentence, for views that print the place above it.
  function bodyAfterPlace(moment, place) {
    if (!place) return moment;
    var ss = sentences(moment);
    return ss.length > 1 && ss[0].replace(/[.:]$/, '') === place ? ss.slice(1).join(' ') : moment;
  }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  function byYear(a, b) { return (a.year == null ? 1e9 : a.year) - (b.year == null ? 1e9 : b.year) || (a.id < b.id ? -1 : 1); }

  // ---------- the unified index ----------
  function merge(corpus, demo) {
    demo = demo || {};
    var heroByIcon = {}; (demo.heroes || []).forEach(function (h) { heroByIcon[h.icon] = h; });
    var stanceById = {}; corpus.stances.forEach(function (s) { stanceById[s.id] = s; });
    var labelByKey = {}; (demo.situations || []).forEach(function (s) { labelByKey[s.key] = s; });
    var twinOf = {}, twinned = {}; Object.keys(demo.twins || {}).forEach(function (sid) { twinOf[demo.twins[sid]] = sid; twinned[demo.twins[sid]] = 1; });

    var lib = { meta: corpus.meta, fields: FIELDS, stances: corpus.stances, icons: [], icon: {}, stories: [], story: {}, situations: [], sit: {}, sitByKey: {},
      works: [], work: {}, byIcon: {}, byKey: {}, iconsByKey: {}, protoOf: {}, idmap: demo.idmap || {}, twinOf: twinOf,
      members: demo.members || {}, coaches: demo.coaches || {}, order: demo.order || [], msgs: demo.msgs || {} };

    function decorate(i, h) {
      var d = DOMAINS[i.domain] || [i.domain || 'Other', 'ideas'];
      var st = stanceById[i.stance];
      return {
        id: i.id, name: i.name, short: h ? h.short : i.name, ini: h ? h.ini : initials(i.name), born: i.born == null ? null : i.born,
        sex: i.sex, geo: i.geo || null, place: geoName(i.geo), domain: i.domain, domainLabel: d[0], field: d[1],
        stance: i.stance || null, stanceName: st ? st.name : '', stanceGloss: st ? st.gloss : '', stanceStatus: i.stance_status || 'proposed',
        reach: i.reach || null, year: i.year == null ? (h && h.year) || null : i.year, moments: i.moments || [],
        desc: h ? h.desc : '', q: h ? h.q : [], proto: h ? h.id : null, inCorpus: !!i.inCorpus,
        wiki: h && h.wiki ? 'https://en.wikipedia.org/wiki/' + encodeURIComponent(h.wiki) : 'https://en.wikipedia.org/w/index.php?search=' + encodeURIComponent(i.name),
        stories: [], keys: [], works: []
      };
    }
    corpus.icons.forEach(function (i) { lib.icons.push(decorate(Object.assign({ inCorpus: true }, i), heroByIcon[i.id])); });
    (demo.heroes || []).forEach(function (h) {
      if (lib.icons.some(function (x) { return x.id === h.icon; })) return;
      lib.icons.push(decorate({ id: h.icon, name: h.name, sex: h.sex, domain: AREA_DOMAIN[h.area] || 'business', stance: STANCE_OF_LABEL[h.stance] || null,
        stance_status: 'proposed', year: h.year, moments: [], inCorpus: false }, h));
    });
    lib.icons.forEach(function (i) { lib.icon[i.id] = i; if (i.proto) lib.protoOf[i.id] = i.proto; });

    var corpusById = {}; corpus.stories.forEach(function (s) { corpusById[s.id] = s; });
    function fromCorpus(s) {
      return { id: s.id, icon: s.icon, era: s.era, year: s.year, place: s.place || s.era, context: s.context || '', keys: s.keys.slice(), reach: s.reach,
        moment: s.moment, pattern: s.pattern || '', pattern_lang: s.pattern_lang || null, pattern_en: s.pattern_en || null, pattern_translation: s.pattern_translation || null,
        by: '', source: s.source || '', caution: s.caution || '', why: '', gist: '', walk: '',
        verified: s.verification === 'verified', status: s.verification === 'verified' ? 'verified' : 'recall', origin: 'corpus', corpus: s.id,
        move_examples: s.move_examples || [], line_examples: s.line_examples || [], voice: s.voice, directness: s.directness,
        rights: s.rights || {}, review: s.review || {}, deeper: [] };
    }
    function fromSample(s) {
      var t = s.twin ? corpusById[s.twin] : null, ic = lib.icon[s.icon];
      var y = yearOf(s.place); if (y == null && t) y = t.year; if (y == null && ic) y = ic.year;
      return { id: s.id, icon: s.icon, era: t ? t.era : (y == null ? '' : String(y)), year: y, place: s.place, context: t ? t.context : '',
        keys: uniq(s.keys.concat(t ? t.keys : [])), reach: s.reach, moment: s.moment, pattern: s.pattern || '', pattern_lang: 'en', pattern_en: null, pattern_translation: null,
        by: s.by || '', source: s.source || '', caution: s.caution || '', why: s.why || '', gist: s.gist || '', walk: s.walk || '',
        verified: !!s.verified, status: s.verified ? 'sample-verified' : 'sample-draft', origin: 'sample', corpus: t ? t.id : null,
        move_examples: t && t.move_examples && t.move_examples.length ? t.move_examples : s.move_examples || [], line_examples: t && t.line_examples && t.line_examples.length ? t.line_examples : s.line_examples || [], voice: t ? t.voice : null,
        directness: t && t.directness ? t.directness : s.directness || null,
        rights: t ? t.rights : {}, review: t ? t.review : {}, deeper: s.deeper || [] };
    }
    (demo.samples || []).forEach(function (s) { lib.stories.push(fromSample(s)); });
    corpus.stories.forEach(function (s) { if (!twinned[s.id]) lib.stories.push(fromCorpus(s)); });
    lib.stories.forEach(function (s) {
      lib.story[s.id] = s;
      var ic = lib.icon[s.icon]; if (ic) { ic.stories.push(s.id); s.keys.forEach(function (k) { if (ic.keys.indexOf(k) < 0) ic.keys.push(k); }); }
      (lib.byIcon[s.icon] = lib.byIcon[s.icon] || []).push(s.id);
      s.keys.forEach(function (k) { (lib.byKey[k] = lib.byKey[k] || []).push(s.id); var a = (lib.iconsByKey[k] = lib.iconsByKey[k] || []); if (a.indexOf(s.icon) < 0) a.push(s.icon); });
    });
    Object.keys(lib.byIcon).forEach(function (k) { lib.byIcon[k].sort(function (a, b) { return byYear(lib.story[a], lib.story[b]); }); });
    lib.icons.forEach(function (i) { i.stories.sort(function (a, b) { return byYear(lib.story[a], lib.story[b]); }); });
    Object.keys(lib.byKey).forEach(function (k) { lib.byKey[k].sort(function (a, b) { return byYear(lib.story[a], lib.story[b]); }); });

    var calib = {}; (corpus.calibration || []).forEach(function (c) { calib[c.match_key] = c; });
    var outc = {}; (corpus.outcomes || []).forEach(function (o) { outc[o.match_key] = o; });
    corpus.situations.forEach(function (s) {
      var L = labelByKey[s.match_key] || {};
      var x = { id: s.id, fam: s.id[0], family: s.family || FAMILY[s.id[0]], key: s.match_key, chip: L.chip || s.member_line, line: L.line || '',
        member_line: voice(s.member_line), owner: s.owner, literature: s.literature || [], calibration: calib[s.match_key] || null, outcome: outc[s.match_key] || null,
        moves: (corpus.moves || []).filter(function (m) { return m.match_key === s.match_key; }).sort(function (a, b) { return (a.variant || 0) - (b.variant || 0); }),
        lines: (corpus.lines || []).filter(function (l) { return l.match_key === s.match_key; }).sort(function (a, b) { return a.id < b.id ? -1 : 1; }),
        stories: lib.byKey[s.match_key] || [], icons: lib.iconsByKey[s.match_key] || [] };
      lib.situations.push(x); lib.sit[x.id] = x; lib.sitByKey[x.key] = x;
    });
    lib.stories.forEach(function (s) { if (!s.why) { var st = lib.sitByKey[s.keys[0]]; s.why = st && st.line ? 'Chosen because ' + st.line.charAt(0).toLowerCase() + st.line.slice(1) : ''; } });

    (demo.works || []).forEach(function (w) { var o = Object.assign({}, w); lib.works.push(o); lib.work[o.id] = o; if (lib.icon[o.icon]) lib.icon[o.icon].works.push(o.id); });
    return lib;
  }

  // A coach's source check, recorded in the ledger, makes a draft sendable. The ledger is
  // { storyId: { by, at, note } }; anything not in the corpus or the samples is ignored.
  function applyVerification(lib, ledger) {
    Object.keys(ledger || {}).forEach(function (id) {
      var s = lib.story[resolve(lib, id)]; if (!s || s.verified) return;
      s.verified = true; s.status = 'verified'; s.checked = ledger[id];
    });
    return lib;
  }
  function resolve(lib, storyId) { return lib.twinOf[storyId] || storyId; }

  // ---------- reading the index ----------
  function storyCard(lib, s) {
    var ic = lib.icon[s.icon] || { name: s.icon };
    var st = STATUS[s.status] || STATUS.recall;
    return { id: s.id, icon: s.icon, name: ic.name, place: s.place, year: s.year, era: s.era, reach: s.reach, keys: s.keys,
      first: teaser(s), pattern: s.pattern_lang && s.pattern_lang !== 'en' && s.pattern_en ? s.pattern_en : s.pattern,
      status: s.status, statusLabel: st.label, verified: s.verified };
  }
  function iconCard(lib, i) {
    return { id: i.id, name: i.name, ini: i.ini, desc: i.desc || [i.domainLabel, i.place].filter(Boolean).join(' · '), year: i.year,
      domainLabel: i.domainLabel, field: i.field, stance: i.stance, stanceName: i.stanceName, n: i.stories.length, sex: i.sex };
  }

  function search(lib, q, limit) {
    limit = limit || 12;
    var toks = fold(q).split(/[^a-z0-9']+/).filter(function (t) { return t.length > 1 || /\d/.test(t); });
    if (!toks.length) return { q: q, icons: [], stories: [], situations: [], eras: [] };
    function all(h) { return toks.every(function (t) { return h.indexOf(t) >= 0; }); }
    var icons = [];
    lib.icons.forEach(function (i) {
      var nm = fold(i.name), hay = nm + ' ' + fold(i.desc) + ' ' + fold(i.domainLabel) + ' ' + fold(i.place) + ' ' + fold(i.stanceName);
      if (!all(hay)) return;
      var sc = nm === fold(q).trim() ? 200 : 0;
      toks.forEach(function (t) { if (nm.indexOf(t) === 0) sc += 80; else if (new RegExp('(^|[^a-z])' + t.replace(/[^a-z0-9]/g, '')).test(nm)) sc += 60; else if (nm.indexOf(t) >= 0) sc += 30; else sc += 8; });
      icons.push({ sc: sc + Math.min(i.stories.length, 5), i: i });
    });
    icons.sort(function (a, b) { return b.sc - a.sc || (a.i.name < b.i.name ? -1 : 1); });
    var stories = [];
    lib.stories.forEach(function (s) {
      var ic = lib.icon[s.icon] || {}, nm = fold(ic.name), head = fold(s.place) + ' ' + fold(s.context) + ' ' + fold(s.pattern) + ' ' + fold(s.pattern_en);
      var hay = nm + ' ' + head + ' ' + fold(s.moment) + ' ' + fold(s.source) + ' ' + fold(s.era);
      if (!all(hay)) return;
      var sc = 0; toks.forEach(function (t) { sc += nm.indexOf(t) >= 0 ? 40 : head.indexOf(t) >= 0 ? 20 : 8; });
      stories.push({ sc: sc, s: s });
    });
    stories.sort(function (a, b) { return b.sc - a.sc || byYear(a.s, b.s); });
    var sits = lib.situations.filter(function (s) { return all(fold([s.id, s.chip, s.line, s.member_line, s.key.replace(/-/g, ' '), s.family].join(' '))); });
    var eras = [];
    var ym = /^(\d{3,4})s?$/.exec(String(q).trim());
    if (ym) { var e = eraOf(+ym[1]); eras.push(e); }
    return { q: q, total: { icons: icons.length, stories: stories.length, situations: sits.length },
      icons: icons.slice(0, limit).map(function (x) { return iconCard(lib, x.i); }),
      stories: stories.slice(0, limit).map(function (x) { return storyCard(lib, x.s); }),
      situations: sits.slice(0, limit).map(function (s) { return { id: s.id, chip: s.chip, line: s.line, n: s.stories.length }; }), eras: eras };
  }

  function dist(a, b) { return a.year == null || b.year == null ? 1e6 : Math.abs(a.year - b.year); }
  function iconTrails(lib, id, n) {
    n = n || 8; var ic = lib.icon[id]; if (!ic) return null;
    var others = lib.icons.filter(function (o) { return o.id !== id; });
    var near = function (a, b) { return dist(a, ic) - dist(b, ic) || b.stories.length - a.stories.length || (a.name < b.name ? -1 : 1); };
    return {
      situations: ic.keys.map(function (k) {
        var s = lib.sitByKey[k]; if (!s) return null;
        var people = (lib.iconsByKey[k] || []).filter(function (x) { return x !== id; }).map(function (x) { return lib.icon[x]; }).sort(byYear);
        return { sit: { id: s.id, chip: s.chip, line: s.line }, total: people.length, people: people.map(function (p) { return iconCard(lib, p); }) };
      }).filter(Boolean),
      contemporaries: others.filter(function (o) { return dist(o, ic) <= 8; }).sort(near).slice(0, n).map(function (p) { return iconCard(lib, p); }),
      field: others.filter(function (o) { return o.domain === ic.domain || o.field === ic.field; })
        .sort(function (a, b) { return (a.domain === ic.domain ? 0 : 1) - (b.domain === ic.domain ? 0 : 1) || near(a, b); }).slice(0, n).map(function (p) { return iconCard(lib, p); }),
      stance: ic.stance ? others.filter(function (o) { return o.stance === ic.stance && o.stories.length; })
        .sort(function (a, b) { return b.stories.length - a.stories.length || near(a, b); }).slice(0, n).map(function (p) { return iconCard(lib, p); }) : []
    };
  }
  function storyTrails(lib, id, n) {
    n = n || 6; var s = lib.story[resolve(lib, id)]; if (!s) return null;
    var era = eraOf(s.year);
    return {
      situations: s.keys.map(function (k) {
        var st = lib.sitByKey[k]; if (!st) return null;
        var list = (lib.byKey[k] || []).map(function (x) { return lib.story[x]; });
        return { sit: { id: st.id, chip: st.chip, line: st.line }, total: list.length, at: list.indexOf(s), stories: list.map(function (x) { return storyCard(lib, x); }) };
      }).filter(Boolean),
      moreFrom: (lib.byIcon[s.icon] || []).filter(function (x) { return x !== s.id; }).map(function (x) { return storyCard(lib, lib.story[x]); }),
      sameEra: lib.stories.filter(function (x) { return x.icon !== s.icon && eraOf(x.year).id === era.id; })
        .sort(function (a, b) { return dist(a, s) - dist(b, s) || (a.id < b.id ? -1 : 1); })
        .filter(function (x, i, a) { return a.map(function (y) { return y.icon; }).indexOf(x.icon) === i; }).slice(0, n).map(function (x) { return storyCard(lib, x); }),
      era: era
    };
  }
  function eraView(lib, eraId) {
    var stories = lib.stories.filter(function (s) { return eraOf(s.year).id === eraId; }).sort(byYear);
    var icons = lib.icons.filter(function (i) { return eraOf(i.year).id === eraId; }).sort(byYear);
    return { era: eraId, stories: stories.map(function (s) { return storyCard(lib, s); }), icons: icons.map(function (i) { return iconCard(lib, i); }) };
  }
  function eras(lib) {
    var c = {};
    lib.stories.forEach(function (s) { var e = eraOf(s.year); c[e.id] = c[e.id] || Object.assign({ stories: 0 }, e); c[e.id].stories++; });
    return Object.keys(c).map(function (k) { return c[k]; }).sort(function (a, b) { return (a.from == null ? 1e9 : a.from) - (b.from == null ? 1e9 : b.from); });
  }

  // ---------- likeness ----------
  // Two signals, and they answer different questions. Situations say "the same kind of week": strong
  // and sparse (of 65,000 pairs of lives, 7,100 share one situation and 143 share two). The words of
  // the moment say "the same world": courts and judges, bands and labels, cabinets and elections.
  // Every link carries its reasons, so a reader can see why two things sit together.
  var STOP = {};
  ('the a an and or of to in on at by for with from as is was were be been being had has have he she his her him they them their it its ' +
   'that this which who whom what when where while after before into over under than then there these those not no but if so up out about ' +
   'one two three four five would could should may might did do does said says told also only more most other some such own same very can ' +
   'will like first last new old years year time made make many much any all each every between during because through against without ' +
   'within whose whom upon off again still even back down away later early late month months week weeks day days ' +
   'thought people way part place took went came asked told gave called began became left got put set get take came come know knew ' +
   'want wanted next whether though although around instead rather actually really just never always already enough something nothing ' +
   'anyone someone everyone everything another himself herself themselves itself own nearly almost both either neither once twice ' +
   'lost loss turned turn going went gone given give seen see saw found find kept keep held hold called call named front second rest ' +
   'six seven eight nine ten eleven twelve twenty thirty forty fifty sixty seventy eighty ninety hundred thousand million billion ' +
   'thirteen fourteen fifteen sixteen seventeen eighteen nineteen half too then keeps getting member members leader leaders ' +
   'thursday monday tuesday wednesday friday whole').split(' ').forEach(function (w) { STOP[w] = 1; });
  function words(text) { return (fold(text).match(/[a-z][a-z'-]{2,}/g) || []).filter(function (w) { return !STOP[w] && w.indexOf("'") < 0; }); }
  function textIndex(lib) {
    if (lib._tx) return lib._tx;
    var N = lib.stories.length, df = {}, docs = {};
    lib.stories.forEach(function (s) {
      var name = {}; words((lib.icon[s.icon] || {}).name).forEach(function (w) { name[w] = 1; });
      var d = words([s.moment, s.pattern_en || s.pattern, s.context].join(' ')).filter(function (w) { return !name[w]; });
      docs[s.id] = d; var seen = {}; d.forEach(function (w) { if (!seen[w]) { seen[w] = 1; df[w] = (df[w] || 0) + 1; } });
    });
    function vecOf(d) {
      var tf = {}, v = {}, n = 0; d.forEach(function (w) { tf[w] = (tf[w] || 0) + 1; });
      Object.keys(tf).forEach(function (w) { if (df[w] < 2 || df[w] > N * 0.15) return; v[w] = (1 + Math.log(tf[w])) * Math.log(N / df[w]); n += v[w] * v[w]; });
      n = Math.sqrt(n) || 1; Object.keys(v).forEach(function (w) { v[w] /= n; }); return v;
    }
    var vec = {}; lib.stories.forEach(function (s) { vec[s.id] = vecOf(docs[s.id]); });
    var ivec = {};
    lib.icons.forEach(function (i) {
      if (!i.stories.length) return; var v = {}, n = 0;
      i.stories.forEach(function (sid) { var x = vec[sid]; Object.keys(x).forEach(function (w) { v[w] = (v[w] || 0) + x[w]; }); });
      Object.keys(v).forEach(function (w) { n += v[w] * v[w]; }); n = Math.sqrt(n) || 1; Object.keys(v).forEach(function (w) { v[w] /= n; });
      ivec[i.id] = v;
    });
    var withStory = lib.icons.filter(function (i) { return i.stories.length; }).length, kidf = {};
    lib.situations.forEach(function (s) { kidf[s.key] = Math.log(withStory / Math.max(1, s.icons.length)); });
    lib._tx = { vec: vec, ivec: ivec, kidf: kidf };
    return lib._tx;
  }
  function cosine(a, b) { var s = 0, k; if (Object.keys(a).length > Object.keys(b).length) { k = a; a = b; b = k; } for (k in a) if (b[k]) s += a[k] * b[k]; return s; }
  function sharedWords(a, b, n) { return Object.keys(a).filter(function (w) { return b[w]; }).sort(function (x, y) { return b[y] * a[y] - b[x] * a[x]; }).slice(0, n || 3); }
  function sitName(lib, k) { var s = lib.sitByKey[k]; return s ? s.id + ' · ' + s.chip : k; }

  // Stories like this one. score = situations (rarity-weighted overlap) + words + small pulls for the same field,
  // the same way of leading and nearby years. A different person every time: same-person stories live elsewhere.
  // ---------- others who lived this week, and the same field ----------
  // likeThis: stories of the same situation, ranked by how close the scene is (shared situations and words),
  // then chosen for range: at most one from the story's own field, no two from the same century where another
  // is close, and one from before 1900 when the situation has one. The lesson carries best from another world.
  // Every card gets one reason no other card in the list repeats, and no reason names the situation (the
  // heading does). ctx: { role, three: [icon ids], heroName: function } for "as Obama does".
  var STANCE_BY = { front: 'by going out front', earn: 'by earning it daily', weight: 'by carrying the weight', grow: 'by growing others', close: 'by staying close', ootw: 'by stepping out of the way' };
  var MOVE_WORD = { direct: 'a direct move', calibrated: 'a measured move', indirect: 'an indirect move' };
  // How often each life would be shown as another who lived the week, across every story: a life that answers far
  // more weeks than most gives way a little, so the same few do not stand beside every story. Counted once per index.
  function jit(a, b) { var h = 2166136261, t = a + '|' + b; for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
  function likeUse(lib) {
    if (lib._likeUse) return lib._likeUse;
    var use = lib._likeUse = {};   // set first: the counting pass reads an empty table, so it counts without damping
    lib.stories.forEach(function (s) { likeThis(lib, s.id, 4, null, true).forEach(function (x) { use[x.icon] = (use[x.icon] || 0) + 1; }); });
    return use;
  }
  function likeThis(lib, id, k, ctx, raw) {
    ctx = ctx || {}; k = k || 4;
    var s = lib.story[resolve(lib, id)]; if (!s) return [];
    var use = raw ? {} : likeUse(lib);
    var tx = textIndex(lib), me = lib.icon[s.icon] || {}, best = {};
    lib.stories.forEach(function (o) {
      if (o.icon === s.icon || !o.keys.some(function (x) { return s.keys.indexOf(x) >= 0; })) return;
      var shared = o.keys.filter(function (x) { return s.keys.indexOf(x) >= 0; });
      var sk = shared.reduce(function (a, x) { return a + (tx.kidf[x] || 1); }, 0) / Math.max(1, Math.sqrt(s.keys.length * o.keys.length));
      var score = 0.9 * sk + 6 * cosine(tx.vec[s.id], tx.vec[o.id]);
      if (!best[o.icon] || score > best[o.icon].score || (score === best[o.icon].score && o.id < best[o.icon].o.id)) best[o.icon] = { o: o, score: score, oi: lib.icon[o.icon] || {} };
    });
    var pool = Object.keys(best).map(function (x) { return best[x]; }).sort(function (a, b) { return b.score - a.score || (a.o.id < b.o.id ? -1 : 1); });
    var cent = function (y) { return y == null ? 'none' : Math.floor(y / 100); }, picked = [], fields = {}, cents = {};
    while (picked.length < k && pool.length) {
      var at = -1, top = -Infinity;
      pool.forEach(function (x, i) {
        var own = x.oi.field === me.field, v = x.score - (fields[x.oi.field] ? 0.8 : 0) - (cents[cent(x.o.year)] ? 0.4 : 0) - (own && fields.__own ? 10 : 0) - 0.1 * Math.max(0, (use[x.o.icon] || 0) - 8) + (raw ? 0 : 0.5 * jit(s.id, x.o.icon));
        if (v > top) { top = v; at = i; }
      });
      var x = pool.splice(at, 1)[0]; picked.push(x); fields[x.oi.field] = 1; cents[cent(x.o.year)] = 1; if (x.oi.field === me.field) fields.__own = 1;
    }
    var isOwn = function (x) { return x.oi.field === me.field; }, isOld = function (x) { return x.o.year != null && x.o.year < 1900; };
    if (picked.length && !picked.some(isOld)) {
      // the older story turns among the best few, so a handful of old lives do not answer every week
      var olds = pool.filter(function (x) { return isOld(x) && !isOwn(x); }); if (!olds.length) olds = pool.filter(isOld);
      var spin = 0; for (var hi = 0; hi < s.id.length; hi++) spin = (spin * 31 + s.id.charCodeAt(hi)) >>> 0;
      var old = olds[spin % Math.min(olds.length, 6)];
      if (old) { var drop = picked.map(isOwn).lastIndexOf(true); picked[drop >= 0 && picked.filter(isOwn).length > 1 ? drop : picked.length - 1] = old; pool.splice(pool.indexOf(old), 1); }
    }
    // never more than one from the story's own field while another field can stand in
    while (picked.filter(isOwn).length > 1) {
      var alt = pool.filter(function (x) { return !isOwn(x); })[0]; if (!alt) break;
      var j = picked.map(isOwn).lastIndexOf(true); if (isOld(picked[j]) && picked.filter(isOld).length === 1) j = picked.map(isOwn).indexOf(true);
      picked[j] = alt; pool.splice(pool.indexOf(alt), 1);
    }
    var used = {}, oldest = Math.min.apply(null, (lib.byKey[s.keys[0]] || []).map(function (sid) { var y = lib.story[sid].year; return y == null ? 1e9 : y; }));
    if (raw) return picked.map(function (x) { return { icon: x.o.icon }; });
    return picked.map(function (x) { var r = reasonFor(lib, s, x.o, ctx, used, oldest); used[r.text] = 1; return { story: storyCard(lib, x.o), score: +x.score.toFixed(3), reasons: [r] }; });
  }
  // A reason says what the two share before it says when: the same move, the same way of leading as one of the
  // member's three, another world, and only then the years.
  function moveWordsOf(lib, a, b) {
    var N = (typeof self !== 'undefined' && self.CLN) || (typeof global !== 'undefined' && global.CLN);
    return N && N.moveWords ? N.moveWords(lib, a, b) : '';
  }
  function reasonFor(lib, here, o, ctx, used, oldest) {
    var oi = lib.icon[o.icon] || {}, me = lib.icon[here.icon] || {}, c = [];
    var mw = moveWordsOf(lib, here.id, o.id); if (mw) c.push({ type: 'move', text: mw });
    (ctx.three || []).forEach(function (h) { var H = lib.icon[h]; if (ctx.role === 'member' && H && h !== o.icon && oi.stance && oi.stance === H.stance && STANCE_BY[oi.stance]) c.push({ type: 'fit', text: 'Leads ' + STANCE_BY[oi.stance] + ', as ' + (H.short || H.name) + ' does' }); });
    var dom = String(oi.domainLabel || oi.field || '').toLowerCase(), mv = MOVE_WORD[o.directness];
    var when = o.year == null ? '' : o.year === oldest ? yearLabel(o.year) + ', the oldest of this week'
      : here.year != null && o.year !== here.year && Math.abs(o.year - here.year) <= 10 ? lowerFirst(gapWords(o.year - here.year)) + ', ' + yearLabel(o.year) : yearLabel(o.year);
    if (oi.field !== me.field) c.push({ type: 'field', text: 'From ' + dom + ', ' + when });
    if (mv && o.directness !== here.directness) c.push({ type: 'way', text: cap1(mv) + ', where ' + (me.short || me.name || 'this one') + '\u2019s was ' + (DIR_WORD[here.directness] || 'marked otherwise') });
    c.push({ type: 'field', text: (oi.field === me.field ? 'Also in ' : 'From ') + dom + ', ' + when });
    if (o.year != null && o.year < 1900) c.push({ type: 'years', text: 'The same kind of week, in ' + yearLabel(o.year) });
    return c.filter(function (r) { return !used[r.text]; })[0] || { type: 'field', text: (oi.name || '') + ', ' + yearLabel(o.year) };
  }
  function cap1(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

  // ---------- one name for each thing ----------
  // Every surface says a thing the same way: a situation as its code and chip, reach and directness in words, a
  // story's status as Checked or Recall draft, numbers one to nine as words, a gap in years as a person says it.
  var NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  function num(n) { return n >= 0 && n < 10 && n === Math.floor(n) ? NUM[n] : String(n); }
  var REACH_WORD = { near: 'Close to an office', mid: 'Some way from an office', far: 'Far from an office' };
  var REACH_SHORT = { near: 'Close', mid: 'Some way', far: 'Far' };
  var DIRECT_WORD = { indirect: 'Indirect', calibrated: 'Measured', direct: 'Direct' };
  function sitLabel(lib, id) { var x = lib.sit[id] || lib.sitByKey[id]; return x ? x.id + ' \u00b7 ' + x.chip : String(id || ''); }
  function statusWord(s) { return s && s.verified ? 'Checked' : 'Recall draft'; }
  // A story by its life, its place and its year, the one name the coach's lines, toasts and plan give it: "Billie Jean
  // King, Houston 1973". The place is the dateline's first part when that is a place; the year is the record's, or
  // the dateline's own words when they give a span or a decade the year cannot ("Katherine Johnson, Langley, late
  // 1950s"). Two stories of one life that would read the same keep their whole datelines, or else add their week.
  var DATEISH = /\d|^(?:early|late|mid|c\.|circa|spring|summer|autumn|fall|winter|january|february|march|april|may|june|july|august|september|october|november|december)\b/i;
  function titleOf(lib, s, whole) {
    var name = (lib.icon[s.icon] || {}).name || s.icon, parts = String(s.place || '').split(/,\s*/).map(function (x) { return x.trim(); }).filter(Boolean);
    var where = parts.length && !DATEISH.test(parts[0]) ? parts[0] : '', y = yearLabel(s.year), date = parts.filter(function (x) { return /\d/.test(x); }).pop() || '';
    if (whole && s.place) return name + ', ' + s.place;
    // a dateline that is a day, a month or a year, ending on the record's own year, says no more than the year
    var plain = !date || (y && new RegExp('^(?:\\d{1,2} )?(?:[A-Z][a-z]+ )?' + y.replace(/ BC$/, '') + '(?: BC)?$').test(date));
    var when = plain ? y : date;
    return name + (where || when ? ', ' : '') + where + (where && when ? (plain ? ' ' : ', ') : '') + when;
  }
  function storyTitle(lib, s) {
    if (typeof s === 'string') s = lib.story[resolve(lib, s)]; if (!s) return '';
    if (!lib._titles) {
      var by = {}, out = lib._titles = {};
      lib.stories.forEach(function (x) { var t = titleOf(lib, x); (by[t] = by[t] || []).push(x); });
      Object.keys(by).forEach(function (t) {
        var xs = by[t]; if (xs.length === 1) { out[xs[0].id] = t; return; }
        var whole = xs.map(function (x) { return titleOf(lib, x, true); });
        xs.forEach(function (x, i) {
          var w = whole[i], st = lib.sitByKey[x.keys[0]];
          out[x.id] = whole.filter(function (v) { return v === w; }).length === 1 ? w : w + (st ? ' · ' + st.chip : '');
        });
      });
    }
    return lib._titles[s.id] || titleOf(lib, s);
  }
  function gapWords(dy) { var a = Math.abs(dy); return a === 0 ? 'The same year' : cap1(num(a)) + (a === 1 ? ' year ' : ' years ') + (dy < 0 ? 'earlier' : 'later'); }
  function stanceGerund(stance) { var b = STANCE_BY[stance]; return b ? cap1(b.replace(/^by /, '')) : ''; }
  // a life's name as a Back button or a short line says it: the surname when no other life shares it
  function lifeName(lib, id) {
    var I = lib.icon[id]; if (!I) return String(id || '');
    var sur = String(I.name).replace(/,? (Jr\.?|Sr\.?|II|III|IV)$/, '').split(' ').pop();
    if (!lib._surnames) { lib._surnames = {}; lib.icons.forEach(function (x) { var k = String(x.name).replace(/,? (Jr\.?|Sr\.?|II|III|IV)$/, '').split(' ').pop(); lib._surnames[k] = (lib._surnames[k] || 0) + 1; }); }
    return lib._surnames[sur] > 1 ? I.name : sur;
  }
  // sameField: the same domain (else the same field), nearest in time first, leaving out the lives in exclude
  function sameField(lib, id, k, exclude) {
    k = k || 3; var s = lib.story[resolve(lib, id)]; if (!s) return [];
    var me = lib.icon[s.icon] || {}, ex = {}; (exclude || []).forEach(function (x) { ex[x] = 1; }); ex[s.icon] = 1;
    var pick = function (test) {
      var seen = {}; return lib.stories.filter(function (o) { var oi = lib.icon[o.icon] || {}; return !ex[o.icon] && test(oi); })
        .sort(function (a, b) { return Math.abs((a.year || 0) - (s.year || 0)) - Math.abs((b.year || 0) - (s.year || 0)) || (a.id < b.id ? -1 : 1); })
        .filter(function (o) { if (seen[o.icon]) return false; seen[o.icon] = 1; return true; });
    };
    var list = pick(function (oi) { return oi.domain && oi.domain === me.domain; });
    if (list.length < k) list = list.concat(pick(function (oi) { return oi.field === me.field && oi.domain !== me.domain; }));
    return list.slice(0, k).map(function (o) { var oi = lib.icon[o.icon] || {}; return { story: storyCard(lib, o), reasons: [{ type: 'field', text: 'Also in ' + String(oi.domainLabel || oi.field).toLowerCase() + ', ' + yearLabel(o.year) }] }; });
  }

  // ---------- a path in five stories, and the other way ----------
  // One situation read in an order that teaches: recognise it close to home, see it is old, see it travel to
  // another world, see it handled the other way, see it with the most at stake. Deterministic; each life once.
  var DIR_WORD = { direct: 'direct', calibrated: 'measured', indirect: 'indirect' };
  function readingPath(lib, key) {
    var tx = textIndex(lib), L = (lib.byKey[key] || []).map(function (id) { return lib.story[id]; }).filter(Boolean);
    if (L.length < 5) return [];
    var cen = {}; L.forEach(function (s) { var v = tx.vec[s.id] || {}; Object.keys(v).forEach(function (w) { cen[w] = (cen[w] || 0) + v[w]; }); });
    var typ = function (s) { return cosine(tx.vec[s.id] || {}, cen); }, F = function (s) { return (lib.icon[s.icon] || {}).field; }, used = {}, steps = [];
    var best = function (arr, f) { return arr.filter(function (s) { return !used[s.icon]; }).sort(function (a, b) { return f(b) - f(a) || (a.id < b.id ? -1 : 1); })[0]; };
    var take = function (s, h, r) { if (!s) return null; used[s.icon] = 1; steps.push({ story: s, heading: h, reason: r }); return s; };
    var p1 = take(best(L.filter(function (s) { return s.reach !== 'far' && s.year >= 1950 && s.directness === 'direct'; }), typ) || best(L.filter(function (s) { return s.reach !== 'far'; }), typ) || best(L, typ),
      'Begin close to home', null);
    if (p1.reach !== 'near') steps[0].heading = 'The plainest case';   // the heading never promises a closeness the story lacks
    steps[0].reason = (p1.reach === 'near' ? 'Close to an ordinary office' : 'Some way from an office') + (p1.directness ? ', and ' + (p1.directness === 'indirect' ? 'an' : 'a') + ' ' + DIR_WORD[p1.directness] + ' move' : '') + ': the plainest version of this week, in ' + yearLabel(p1.year) + '.';
    var old = L.filter(function (s) { return s.year != null && s.year < 1900; });
    var p2 = take(best(old.length ? old : L, function (s) { return -s.year + typ(s) * 100; }), 'The same week, long ago', '');
    if (p2) steps[1].reason = yearLabel(p2.year) + ': ' + Math.max(0, p1.year - p2.year) + ' years earlier, the same week was already hard.';
    // the other way is the scarcest (D3 has one quieter story), so it is chosen before another world
    var p4 = otherWay(lib, p1.id, used); if (p4) used[p4.icon] = 1;
    var p3 = take(best(L.filter(function (s) { return F(s) !== F(p1) && (!p2 || F(s) !== F(p2)) && s.year >= 1800; }), typ) || best(L.filter(function (s) { return F(s) !== F(p1); }), typ), 'In another world', '');
    if (p3) steps[steps.length - 1].reason = 'From ' + String((lib.icon[p3.icon] || {}).domainLabel || F(p3)).toLowerCase() + ': the week travels from one world to another.';
    if (p4) take(p4, 'Handled the other way', (p4.directness === 'indirect' ? 'An' : 'A') + ' ' + DIR_WORD[p4.directness] + ' move, where step one was ' + DIR_WORD[p1.directness] + '. Set them side by side.');
    var p5 = take(best(L.filter(function (s) { return s.reach === 'far'; }), typ), 'With the most at stake', '');
    if (p5) steps[steps.length - 1].reason = 'Far from an ordinary office: the same week with the world watching, ' + yearLabel(p5.year) + '.';
    return steps;
  }
  // The same situation handled with a different directness, the closest in words; o: lives to leave out
  function otherWay(lib, id, skip) {
    var s = lib.story[resolve(lib, id)]; if (!s || !s.directness) return null;
    var tx = textIndex(lib), sk = skip || {};
    return lib.stories.filter(function (o) { return o.icon !== s.icon && !sk[o.icon] && o.directness && o.directness !== s.directness && o.keys.some(function (k) { return s.keys.indexOf(k) >= 0; }); })
      .sort(function (a, b) { return cosine(tx.vec[s.id] || {}, tx.vec[b.id] || {}) - cosine(tx.vec[s.id] || {}, tx.vec[a.id] || {}) || (a.id < b.id ? -1 : 1); })[0] || null;
  }

  function similarStories(lib, id, k, opt) {
    opt = opt || {}; k = k || 6;
    var s = lib.story[resolve(lib, id)]; if (!s) return [];
    var tx = textIndex(lib), me = lib.icon[s.icon] || {}, out = [];
    lib.stories.forEach(function (o) {
      if (o.icon === s.icon) return;
      if (opt.sameKey === true && !o.keys.some(function (x) { return s.keys.indexOf(x) >= 0; })) return;
      if (opt.sameKey === false && o.keys.some(function (x) { return s.keys.indexOf(x) >= 0; })) return;
      var oi = lib.icon[o.icon] || {}, shared = o.keys.filter(function (x) { return s.keys.indexOf(x) >= 0; });
      var sk = shared.reduce(function (a, x) { return a + (tx.kidf[x] || 1); }, 0) / Math.max(1, Math.sqrt(s.keys.length * o.keys.length));
      var c = cosine(tx.vec[s.id], tx.vec[o.id]), dy = s.year == null || o.year == null ? 999 : Math.abs(s.year - o.year);
      var score = opt.mode === 'words' ? c : 0.9 * sk + 6 * c + (oi.field === me.field ? 0.25 : 0) + (oi.stance && oi.stance === me.stance ? 0.2 : 0) + 0.25 * Math.exp(-dy / 25);
      if (opt.mode === 'words' && c < 0.05) return;
      out.push({ o: o, score: score, shared: shared, c: c, dy: dy, oi: oi });
    });
    out.sort(function (a, b) { return b.score - a.score || (a.o.id < b.o.id ? -1 : 1); });
    // one story per person, so a list of six is six lives
    var seen = {}, res = [];
    for (var i = 0; i < out.length && res.length < k; i++) {
      var x = out[i]; if (seen[x.o.icon]) continue; seen[x.o.icon] = 1;
      var r = [];
      x.shared.forEach(function (key) { r.push({ type: 'situation', key: key, text: 'Also filed under ' + sitName(lib, key) }); });
      if (x.c >= 0.06) r.push({ type: 'words', text: 'Shared words: ' + sharedWords(tx.vec[s.id], tx.vec[x.o.id], 3).join(', ') });
      if (x.dy <= 10) r.push({ type: 'years', text: x.dy === 0 ? 'The same year, ' + yearLabel(x.o.year) : gapWords(x.o.year - (s.year == null ? x.o.year : s.year)) + ', ' + yearLabel(x.o.year) });
      if (x.oi.stance && x.oi.stance === me.stance) r.push({ type: 'stance', text: 'Both lead by ' + (x.oi.stanceName || x.oi.stance) });
      if (x.oi.field === me.field && !r.length) r.push({ type: 'field', text: 'Both in ' + (x.oi.domainLabel || x.oi.field) });
      res.push({ story: storyCard(lib, x.o), score: +x.score.toFixed(3), reasons: r });
    }
    return res;
  }

  // Lives most like this one: shared situations, weighted by how rare each is, then the words of their stories,
  // the same way of leading, the same field and nearby years.
  function kindred(lib, iconId, k, opt) {
    k = k || 8; opt = opt || {}; var me = lib.icon[iconId]; if (!me) return [];
    var tx = textIndex(lib), mv = tx.ivec[iconId] || {}, out = [];
    lib.icons.forEach(function (o) {
      if (o.id === iconId || !o.stories.length) return;
      var shared = o.keys.filter(function (x) { return me.keys.indexOf(x) >= 0; });
      var sk = shared.reduce(function (a, x) { return a + (tx.kidf[x] || 1); }, 0);
      var c = me.stories.length ? cosine(mv, tx.ivec[o.id] || {}) : 0, dy = me.year == null || o.year == null ? 999 : Math.abs(me.year - o.year);
      var score = 0.8 * sk + 5 * c + (o.stance && o.stance === me.stance ? 0.35 : 0) + (o.field === me.field ? 0.3 : 0) + 0.3 * Math.exp(-dy / 30);
      if (opt.mode === 'words') { if (shared.length || c < 0.08) return; score = c; }
      out.push({ o: o, score: score, shared: shared, c: c, dy: dy });
    });
    out.sort(function (a, b) { return b.score - a.score || (a.o.name < b.o.name ? -1 : 1); });
    return out.slice(0, k).map(function (x) {
      var r = [];
      if (x.shared.length) r.push({ type: 'situation', keys: x.shared, text: (x.shared.length > 1 ? 'Lived ' + x.shared.length + ' of the same situations: ' : 'Lived the same situation: ') + x.shared.map(function (key) { return (lib.sitByKey[key] || {}).id || key; }).join(', ') });
      if (x.c >= 0.08) r.push({ type: 'words', text: 'Shared words: ' + sharedWords(mv, tx.ivec[x.o.id] || {}, 3).join(', ') });
      if (x.o.stance && x.o.stance === me.stance) r.push({ type: 'stance', text: 'Both lead by ' + x.o.stanceName });
      if (x.dy <= 10) r.push({ type: 'years', text: 'The same years' });
      if (!r.length && x.o.field === me.field) r.push({ type: 'field', text: 'Both in ' + x.o.domainLabel });
      return { icon: iconCard(lib, x.o), score: +x.score.toFixed(3), reasons: r };
    });
  }

  // The neighbourhood of one life, ready to draw: its situations, the closest lives in each, and kindred
  // lives found by their words alone.
  function ego(lib, iconId, per) {
    per = per || 4; var me = lib.icon[iconId]; if (!me) return null;
    var kin = kindred(lib, iconId, 60), rank = {}; kin.forEach(function (x, i) { rank[x.icon.id] = i; });
    var used = {}; used[iconId] = 1;
    var sits = me.keys.map(function (key) {
      var st = lib.sitByKey[key]; if (!st) return null;
      var people = (lib.iconsByKey[key] || []).filter(function (x) { return x !== iconId; })
        .sort(function (a, b) { return (rank[a] == null ? 999 : rank[a]) - (rank[b] == null ? 999 : rank[b]) || (a < b ? -1 : 1); }).slice(0, per);
      people.forEach(function (x) { used[x] = 1; });
      return { sit: { id: st.id, key: st.key, chip: st.chip, fam: st.fam }, total: (lib.iconsByKey[key] || []).length - 1, people: people.map(function (x) { return iconCard(lib, lib.icon[x]); }) };
    }).filter(Boolean);
    var words = kindred(lib, iconId, 4, { mode: 'words' });
    return { center: iconCard(lib, me), situations: sits, kindred: words };
  }

  // How the 22 situations sit together: stories filed under both, and lives with stories in both.
  function situationWeb(lib) {
    var links = {};
    function add(a, b, f) { var k = a < b ? a + '|' + b : b + '|' + a; links[k] = links[k] || { a: a < b ? a : b, b: a < b ? b : a, stories: 0, lives: 0 }; links[k][f]++; }
    lib.stories.forEach(function (s) { for (var i = 0; i < s.keys.length; i++) for (var j = i + 1; j < s.keys.length; j++) add(s.keys[i], s.keys[j], 'stories'); });
    lib.icons.forEach(function (ic) { for (var i = 0; i < ic.keys.length; i++) for (var j = i + 1; j < ic.keys.length; j++) add(ic.keys[i], ic.keys[j], 'lives'); });
    return { nodes: lib.situations.map(function (s) { return { id: s.id, key: s.key, chip: s.chip, fam: s.fam, stories: s.stories.length, lives: s.icons.length }; }),
      links: Object.keys(links).map(function (k) { return links[k]; }).sort(function (x, y) { return (y.stories + y.lives) - (x.stories + x.lives); }) };
  }

  // From one life to another through the situations they lived: the shortest walk, life to situation to life.
  function path(lib, from, to, maxDepth) {
    maxDepth = maxDepth || 4; if (!lib.icon[from] || !lib.icon[to]) return null; if (from === to) return [{ icon: iconCard(lib, lib.icon[from]) }];
    var prev = {}, q = [from], depth = {}; prev[from] = null; depth[from] = 0;
    while (q.length) {
      var cur = q.shift(); if (depth[cur] >= maxDepth) continue;
      var keys = lib.icon[cur].keys.slice().sort(function (a, b) { return (lib.iconsByKey[a] || []).length - (lib.iconsByKey[b] || []).length; });
      for (var i = 0; i < keys.length; i++) {
        var nb = (lib.iconsByKey[keys[i]] || []).slice().sort();
        for (var j = 0; j < nb.length; j++) {
          var x = nb[j]; if (x in prev) continue;
          prev[x] = { from: cur, key: keys[i] }; depth[x] = depth[cur] + 1;
          if (x === to) { var steps = [], y = to; while (prev[y]) { steps.unshift({ icon: iconCard(lib, lib.icon[y]), via: { id: lib.sitByKey[prev[y].key].id, chip: lib.sitByKey[prev[y].key].chip } }); y = prev[y].from; } steps.unshift({ icon: iconCard(lib, lib.icon[from]) }); return steps; }
          q.push(x);
        }
      }
    }
    return null;
  }

  // ---------- asking ----------
  // A question in plain words, read against the 22 situations. Each situation is known by its own label
  // and lines, by the words of its stories, and by the ways coaches and members say it. The reading is
  // shown, so a reader can correct it; the stories that answer it say why they are there.
  var SAYINGS = {
    'unnamed-expectations': 'new job new role promoted promotion expectations nobody told criteria judged what the job asks unclear first days started',
    'renegotiating-standing': 'peers former peers colleagues used to be boss of report to me reporting friends team I was on promoted over wanted my job rival rivals',
    'naming-an-unseen-problem': 'inherited mess problem nobody sees everyone thinks fine warning risk denial broken hidden',
    'following-a-legend': 'predecessor legend loved follow replace succeed shadow founder previous boss',
    'judging-unfamiliar-work': 'can\'t judge expertise technical specialists accountable don\'t understand engineers scientists experts',
    'credit-and-attribution': 'credit my work someone else voice attribution took credit recognition behind the scenes ghost',
    'style-against-expectation': 'quiet introvert shouting loud style not the type soft-spoken calm presence reserved',
    'contradictory-feedback': 'feedback too nice too tough mixed messages contradictory can\'t win perception',
    'unclassifiable-profile': 'don\'t fit unusual background hard to place career change label box outsider',
    'saying-it-in-your-own-words': 'announce own words voice speech introduce myself sound like everyone authentic statement',
    'expertise-without-pull': 'expert not listened ignored overlooked influence analysis data not called answer present presented presenting presentation recommendation review roadmap',
    'selling-what-you-used-to-make': 'sell sales win work business development pitch clients revenue rainmaker',
    'borrowed-versus-owned-standing': 'firm name brand reputation my name ask for me own standing credentials',
    'coalition-without-mandate': 'don\'t control influence without authority stakeholders persuade alliance before the meeting politics buy-in decide decides decided directors vp executives committee steering board',
    'leading-beyond-line-of-sight': 'large team scale can\'t see everyone remote layers managers distance',
    'developing-without-a-bench': 'develop people bench succession talent grow mentor no one to delegate',
    'stopping-the-old-work': 'old job stop let go delegate still doing legacy kill project proud',
    'carrying-somebody-elses-decision': 'decision I didn\'t make disagree disagreed change I didn\'t choose restructure restructuring layoffs redundancies carry defend defending',
    'every-act-is-a-message': 'signal signals watched everything I do symbolic scrutiny read into announcement announcing announced announce reorg reorganisation all-hands',
    'agreeing-and-not-moving': 'procrastinate avoid stuck know what to do not doing it delay conversation I avoid',
    'the-loss-inside-the-promotion': 'lost miss best at craft no longer do identity grief',
    'competent-and-becalmed': 'bored plateau stagnant coasting comfortable restless next challenge'
  };
  function sitIndex(lib) {
    if (lib._sx) return lib._sx;
    var tx = textIndex(lib), out = {};
    lib.situations.forEach(function (s) {
      var v = {};
      (lib.byKey[s.key] || []).forEach(function (id) { var x = tx.vec[id] || {}; Object.keys(x).forEach(function (w) { v[w] = (v[w] || 0) + x[w] / 6; }); });
      words([s.chip, s.line, s.member_line, SAYINGS[s.key] || ''].join(' ')).forEach(function (w) { v[w] = (v[w] || 0) + 1.2; });
      var n = 0; Object.keys(v).forEach(function (w) { n += v[w] * v[w]; }); n = Math.sqrt(n) || 1; Object.keys(v).forEach(function (w) { v[w] /= n; });
      out[s.key] = v;
    });
    lib._sx = out; return out;
  }
  // words too common in how people describe work to say which situation a question is about
  var QSTOP = { job: 1, work: 1, team: 1, role: 1, group: 1, people: 1, person: 1, thing: 1, things: 1, company: 1, firm: 0, boss: 0, week: 1, today: 1, tomorrow: 1, next: 1 };
  // "will be in the room" says who is present, not that the room is ignoring anyone
  function queryVec(text) { var v = {}, n = 0; words(String(text || '').replace(/\b(?:be|is|was|were|are|being)\s+in the room\b/gi, ' ')).filter(function (w) { return !QSTOP[w]; }).forEach(function (w) { v[w] = (v[w] || 0) + 1; }); Object.keys(v).forEach(function (w) { n += v[w] * v[w]; }); n = Math.sqrt(n) || 1; Object.keys(v).forEach(function (w) { v[w] /= n; }); return v; }
  function interpret(lib, text, k) {
    k = k || 3; var q = queryVec(text), sx = sitIndex(lib), low = fold(text);
    var r = lib.situations.map(function (s) {
      // the words of the question, and their plain inflections, read against the situation
      var c = cosine(q, sx[s.key]);
      // a whole saying in the question ("wanted my job", "too nice") counts for more than its words
      // a whole saying, in any person ("wanted my job", "wanted her job"), counts for more than its words
      var P = '(?:my|her|his|their|your|our)';
      var phrases = { 'renegotiating-standing': ['wanted ' + P + ' (?:job|role|seat)', 'former peers', P + ' (?:old )?peers', 'used to be (?:my|her|his|their) (?:peer|colleague)', 'promoted over'],
        'contradictory-feedback': ['too nice', 'too tough', 'mixed messages'],
        'every-act-is-a-message': ['reorg announcement', 'announc\\w* (?:the |a |our )?(?:reorg|reorganisation|restructure|changes?)', 'everything (?:i|she|he|they) do'],
        'expertise-without-pull': ['(?:the )?room (?:decides|ignores|moves on|talks over)', 'not (?:being )?listened', 'nobody (?:listens|asks|hears)', 'expert in the room'], 'agreeing-and-not-moving': ['(?:keeps?|kept) putting off', 'not doing it', '(?:i|she|he|they) avoids?'],
        'carrying-somebody-elses-decision': ["(?:didn't|did not) (?:choose|make|pick)", 'disagrees? with'], 'coalition-without-mandate': ["(?:don't|doesn't|do not) report to", 'without authority', 'before the meeting'],
        'following-a-legend': ['(?:following|replacing|succeeding) (?:a|the|someone)'], 'credit-and-attribution': ['(?:took|takes|taking) (?:the )?credit'],
        'the-loss-inside-the-promotion': ['(?:miss|misses|missing) (?:the|doing)'], 'competent-and-becalmed': ['(?:bored|coasting|plateau)'] }[s.key] || [];
      phrases.forEach(function (ph) { if (new RegExp('\\b' + ph).test(low)) c += 0.25; });
      if (s.key === 'every-act-is-a-message' && /\bannounc|\breorg/.test(low)) c += 0.12;
      if (s.key === 'expertise-without-pull' && /\bpresent|\breview\b|\bdecide/.test(low)) c += 0.08;
      if (s.key === 'coalition-without-mandate' && /\bdecide|\bdirectors?\b|\bvp\b|\bboard\b/.test(low)) c += 0.08;
      return { sit: { id: s.id, key: s.key, chip: s.chip, line: s.line }, score: +c.toFixed(3) };
    }).filter(function (x) { return x.score > 0.04; }).sort(function (a, b) { return b.score - a.score; });
    return r.slice(0, k);
  }
  // Stories that answer a question. opts: keys (the reading to use), heroes (icon ids to put first), sex, era ('before-1900'|'1900-1970'|'after-1970'),
  // reach ('near' = near and mid), quiet (indirect or calibrated), limit.
  function ask(lib, text, opts) {
    opts = opts || {}; var reading = opts.keys ? opts.keys.map(function (k) { var s = lib.sitByKey[k] || lib.sit[k]; return s ? { sit: { id: s.id, key: s.key, chip: s.chip, line: s.line }, score: 1 } : null; }).filter(Boolean) : interpret(lib, text, 3);
    var keys = reading.map(function (r) { return r.sit.key; }), q = queryVec(text), tx = textIndex(lib), heroes = opts.heroes || [];
    var pool = lib.stories.filter(function (s) {
      if (keys.length && !s.keys.some(function (k) { return keys.indexOf(k) >= 0; })) return false;
      if (!keys.length && cosine(q, tx.vec[s.id] || {}) < 0.06) return false;
      var ic = lib.icon[s.icon] || {};
      if (opts.sex && ic.sex !== opts.sex) return false;
      if (opts.era === 'before-1900' && !(s.year < 1900)) return false;
      if (opts.era === '1900-1970' && !(s.year >= 1900 && s.year < 1970)) return false;
      if (opts.era === 'after-1970' && !(s.year >= 1970)) return false;
      if (opts.reach === 'near' && s.reach === 'far') return false;
      if (opts.quiet && !(s.directness === 'indirect' || s.directness === 'calibrated')) return false;
      return true;
    });
    var res = pool.map(function (s) {
      var rk = keys.indexOf(s.keys.filter(function (k) { return keys.indexOf(k) >= 0; })[0]);
      var c = cosine(q, tx.vec[s.id] || {}), mine = heroes.indexOf(s.icon) >= 0;
      var score = (rk < 0 ? 0 : (3 - rk) * 0.5) + 4 * c + (mine ? 1.5 : 0) + (s.reach === 'near' ? 0.3 : s.reach === 'mid' ? 0.2 : 0) + (s.verified ? 0.2 : 0);
      var why = [];
      if (mine && rk >= 0) why.push({ type: 'hero', text: (opts.heroLabel || 'One of their heroes') + ' · ' + sitName(lib, keys[rk]) });
      else if (mine) why.push({ type: 'hero', text: opts.heroLabel || 'One of their heroes' });
      else if (rk >= 0) why.push({ type: 'situation', text: 'Filed under ' + sitName(lib, keys[rk]) });
      if (c >= 0.05) why.push({ type: 'words', text: 'Shares your words: ' + sharedWords(q, tx.vec[s.id] || {}, 3).join(', ') });
      return { story: storyCard(lib, s), score: +score.toFixed(3), reasons: why };
    }).sort(function (a, b) { return b.score - a.score || (a.story.id < b.story.id ? -1 : 1); });
    return { reading: reading, total: res.length, results: res.slice(0, opts.limit || 12) };
  }

  // ---------- the house voice, applied to the prototype's own copy ----------
  // The export is the designer's source and is never edited by hand. Where its product copy (labels, moves,
  // fit notes, a coach's note) breaks a house rule (no "X, not Y"; no actually, just, really, rather than,
  // instead of), the rewrite lives here, exact text for exact text, and is applied wherever that copy enters:
  // tools/build_demo.mjs (the Library and the API) and the bridge (the app). Members' own words, quotations
  // and titles stay as written. A rewrite whose text has left the export is reported by the tests.
  var COPY = [
    ["Standing that's yours, not the firm's", 'Standing in your own name'],
    ["Chosen because standing on your own name, not the firm's, is the work this year.", 'Chosen because standing on your own name is the work this year.'],
    ['Chosen because everything you say this week will be read for what it means, not just what it says.', 'Chosen because this week everything you say will be read for what it means as well as what it says.'],
    ['The restraint was a condition, not a temperament. Robinson spoke out forcefully once it lifted.', 'The restraint was a condition of the deal. Robinson spoke out forcefully once it lifted.'],
    ['ask whether any rule actually bars you from the room. Then sit in.', 'ask whether any rule bars you from the room. Then sit in.'],
    ['Useful for some of your weeks, not all.', 'Useful for some of your weeks.'],
    ["You'll send analysis, not a position.", "You'll send analysis with no position in it."],
    ['Someone replies to the position, not the data.', 'Someone replies to the position you took.'],
    ["A client repeats your point back to you, not the firm's.", 'A client repeats your own point back to you.'],
    ['You answered it, not the senior associate.', 'You answered it yourself, before the senior associate spoke.'],
    ["He's for the weeks you stand on your own name, not for the pitch itself.", "He's for the weeks you stand on your own name. The pitch itself needs a different story."],
    ['He had just beaten Hillary Clinton in a primary that ran seventeen months.', 'Weeks earlier he had beaten Hillary Clinton in a primary that ran seventeen months.'],
    // members' goals, as the demo script gives them: the same aims, said once
    ['Be the person they call before the decision, not after it.', 'Be the person they call before the decision.'],
    ["The partner clients ask for by name, not the firm's name on the door.", 'The partner clients ask for by name.'],
    ['Leading the change, not being changed by it.', 'Leading the change from the front.'],
    // two member lines from the corpus (the fix belongs in the corpus repo; until then it is made here, at merge)
    ['I got the job. Nobody told me what it actually asks.', 'I got the job. Nobody told me what it asks.'],
    ['I have more people than I can actually see.', 'I have more people than I can see.']
  ];
  // returns a copy of v with every rewrite applied to every string in it; o.used collects the rewrites that fired
  function voice(v, o) {
    if (typeof v === 'string') { var t = v; COPY.forEach(function (c, i) { if (t.indexOf(c[0]) >= 0) { t = t.split(c[0]).join(c[1]); if (o && o.used) o.used[i] = 1; } }); return t; }
    if (Array.isArray(v)) return v.map(function (x) { return voice(x, o); });
    if (v && typeof v === 'object') { var out = {}; Object.keys(v).forEach(function (k) { out[k] = typeof v[k] === 'function' ? v[k] : voice(v[k], o); }); return out; }
    return v;
  }

  // ---------- members ----------
  function member(lib, id) {
    var m = lib.members[id]; if (!m) return null;
    var co = lib.coaches[m.coach] || null;
    var core = ((m.heroes_icons || {}).core || []).filter(function (x) { return lib.icon[x]; });
    var reserve = (m.heroes_icons || {}).reserve;
    return { id: m.id, name: m.name, first: m.first, ini: m.ini, role: m.role, co: m.co, goal: m.goal, born: m.born || null, gen: m.gen || null,
      interests: m.ints || [], coach: co ? { id: co.id, name: co.name, first: co.first } : null, status: m.status, last: m.last, next: m.next,
      move: m.move || (m.mv && m.mv.behaviour) || '', line: typeof m.line === 'string' ? m.line : (m.line && m.line.text) || '',
      situations: (m.sits || []).map(function (code) { var s = lib.sit[code]; return s ? { id: s.id, key: s.key, chip: s.chip, line: s.line } : null; }).filter(Boolean),
      heroes: { core: core.map(function (x) { return iconCard(lib, lib.icon[x]); }), reserve: reserve && lib.icon[reserve] ? iconCard(lib, lib.icon[reserve]) : null },
      upcoming: m.up19 ? { label: m.up19.label, sit: m.up19.sit } : null };
  }
  function readingFor(lib, id, n) {
    n = n || 4; var m = lib.members[id]; if (!m) return null;
    var mine = ((m.heroes_icons || {}).core || []).concat((m.heroes_icons || {}).reserve ? [m.heroes_icons.reserve] : []);
    var rank = function (s) { return (mine.indexOf(s.icon) >= 0 ? 0 : 1) * 10 + (s.reach === 'near' ? 0 : s.reach === 'mid' ? 1 : 2) + (s.verified ? 0 : 0.5); };
    return {
      member: member(lib, id),
      bySituation: (m.sits || []).map(function (code) {
        var st = lib.sit[code]; if (!st) return null;
        var list = (lib.byKey[st.key] || []).map(function (x) { return lib.story[x]; }).sort(function (a, b) { return rank(a) - rank(b) || byYear(a, b); });
        return { sit: { id: st.id, chip: st.chip, line: st.line, key: st.key }, total: list.length,
          fromHeroes: list.filter(function (s) { return mine.indexOf(s.icon) >= 0; }).map(function (s) { return storyCard(lib, s); }),
          beyond: list.filter(function (s) { return mine.indexOf(s.icon) < 0; }).slice(0, n).map(function (s) { return storyCard(lib, s); }) };
      }).filter(Boolean),
      heroes: mine.filter(function (x) { return lib.icon[x]; }).map(function (x) {
        var ic = lib.icon[x];
        return { icon: iconCard(lib, ic), covers: (m.sits || []).filter(function (code) { return lib.sit[code] && ic.keys.indexOf(lib.sit[code].key) >= 0; }),
          stories: ic.stories.map(function (sid) { return storyCard(lib, lib.story[sid]); }) };
      })
    };
  }
  // The member as the matcher sees them: their situations in order, their three as stars.
  function matcherMember(lib, id) {
    var m = lib.members[id]; if (!m) return null;
    return { id: id, situation_keys: (m.sits || []).map(function (c) { return lib.sit[c] && lib.sit[c].key; }).filter(Boolean),
      stars: ((m.heroes_icons || {}).core || []).slice(), kept_quotes: [], context: {}, rep_pattern: 'steady' };
  }

  // ---------- the matcher (port of match.py and simulate.py; keep the two in step) ----------
  var ORDER = { near: 0, mid: 1, far: 2 };
  var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  var STORY_REPEAT_WEEKS = 8, ICON_REPEAT_WEEKS = 2, LADDER_WEEKS = 12, DEFAULT_REPS = 4;
  function cmpTuple(a, b) { for (var i = 0; i < a.length; i++) { if (a[i] < b[i]) return -1; if (a[i] > b[i]) return 1; } return 0; }
  function stanceProfile(corpus, kept) {
    var by = {}; corpus.stances.forEach(function (s) { by[s.id] = { kept: 0, total: 0 }; });
    var k = {}; (kept || []).forEach(function (q) { k[q] = 1; });
    var qs = corpus.quote_stances || {};
    Object.keys(qs).forEach(function (qid) { var b = by[qs[qid]]; if (!b) return; b.total++; if (k[qid]) b.kept++; });
    var out = {}; Object.keys(by).forEach(function (s) { out[s] = by[s].total ? by[s].kept / by[s].total : 0; }); return out;
  }
  function contextTags(m) { var c = m.context || {}, t = []; ['setting', 'temperature'].forEach(function (k) { if (c[k]) t.push(k + ':' + c[k]); }); return t; }
  function moveDay(mv) { var t = (mv.trigger || '').toLowerCase(); for (var i = 0; i < DAYS.length; i++) if (t.indexOf(DAYS[i].toLowerCase()) >= 0) return DAYS[i]; return 'Thursday'; }
  function chooseMode(mv, calib, tags, prog) {
    var d = mv.directness || 'direct';
    if (d !== 'direct' || !mv.indirect_variant) return [d, null];
    if ((prog.fails || 0) >= 2) return ['indirect', 'two first failures logged on the direct version'];
    var hit = tags.filter(function (t) { return ((calib || {}).go_indirect_when || []).indexOf(t) >= 0; }).sort();
    if (hit.length) return ['indirect', 'context ' + hit.join(', ')];
    return ['direct', null];
  }
  function matcher(corpus) {
    var roster = {}; corpus.icons.forEach(function (r) { roster[r.id] = r; });
    var calib = {}; (corpus.calibration || []).forEach(function (c) { calib[c.match_key] = c; });
    return { corpus: corpus, roster: roster, calib: calib };
  }
  function pick(M, member, week, state) {
    var corpus = M.corpus, roster = M.roster;
    state = state || { served: [], progress: {} };
    var keys = member.situation_keys, key = keys[week % keys.length];
    var visit = state.served.filter(function (e) { return e.key === key; }).length;
    var tags = contextTags(member), cal = M.calib[key];
    var out = { week: week, match_key: key, gaps: [], why: [] };
    var moves = corpus.moves.filter(function (m) { return m.match_key === key; })
      .sort(function (a, b) { return cmpTuple([a.variant || 0, a.id], [b.variant || 0, b.id]); });
    var live = moves.filter(function (m) { return !((state.progress[m.id] || {}).retired); });
    var mv = live.length ? live[0] : (moves.length ? moves[moves.length - 1] : null);
    if (moves.length && !live.length) out.why.push('every move for this key retired; holding the last');
    out.move = mv;
    var mode = null;
    if (mv) {
      var cm = chooseMode(mv, cal, tags, state.progress[mv.id] || {}); mode = cm[0];
      if (cm[1]) out.why.push('indirect: ' + cm[1]);
      var ind = mode === 'indirect' && mv.directness === 'direct';
      out.behaviour = ind ? mv.indirect_variant.behaviour : mv.behaviour;
      out.observable = ind ? mv.indirect_variant.observable : mv.observable;
    }
    out.mode = mode;
    var servedRecent = {}, iconsRecent = {}, last = {};
    state.served.forEach(function (e) {
      if (week - e.week <= STORY_REPEAT_WEEKS && e.story) servedRecent[e.story] = 1;
      if (e.icon && week - e.week <= ICON_REPEAT_WEEKS) iconsRecent[e.icon] = 1;
      if (e.story) last[e.story] = e.week;
    });
    var pool = corpus.stories.filter(function (s) { return s.keys.indexOf(key) >= 0 && (s.reach === 'near' || s.reach === 'mid'); });
    var unseen = pool.filter(function (s) { return !servedRecent[s.id]; });
    var exhausted = pool.length > 0 && !unseen.length;
    if (exhausted) out.why.push('story pool exhausted inside 8 weeks; serving the least recently served');
    pool = unseen.length ? unseen : pool;
    var fresh = pool.filter(function (s) { return !iconsRecent[s.icon]; }); pool = fresh.length ? fresh : pool;
    var stars = {}; (member.stars || []).forEach(function (s) { stars[s] = 1; });
    var top = null;
    if ((member.kept_quotes || []).length) {
      var prof = stanceProfile(corpus, member.kept_quotes), ks = Object.keys(prof).sort(), mx = Math.max.apply(null, ks.map(function (k) { return prof[k]; }));
      if (ks.length && mx > 0) top = ks.filter(function (k) { return prof[k] === mx; })[0];
    }
    var want = { direct: ['direct'], calibrated: ['calibrated', 'direct', 'indirect'], indirect: ['indirect', 'calibrated'] }[mode || 'direct'];
    var grain = (mv || {}).grain;
    var keyOf = function (s) {
      var st = (roster[s.icon] || {}).stance, ladder = week < LADDER_WEEKS ? ORDER[s.reach] : -ORDER[s.reach];
      var t = [stars[s.icon] ? 0 : 1, want.indexOf(s.directness) >= 0 ? 0 : 1, st === grain ? 0 : 1, top && st === top ? 0 : 1, ladder, s.id];
      return exhausted ? [s.id in last ? last[s.id] : -1].concat(t) : t;
    };
    pool = pool.map(function (s) { return { s: s, k: keyOf(s) }; }).sort(function (a, b) { return cmpTuple(a.k, b.k); }).map(function (x) { return x.s; });
    out.story = pool.length ? pool[0] : null;
    var lines = corpus.lines.filter(function (l) { return l.match_key === key; }).sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
    out.line = lines.length ? lines[visit % lines.length] : null;
    out.delivery = { story: out.story ? 'Monday' : null, move: mv ? moveDay(mv) : null, line: mv ? moveDay(mv) : null };
    ['move', 'line', 'story'].forEach(function (k) { if (out[k] == null) out.gaps.push('no ' + k + " for '" + key + "'"); });
    return out;
  }
  function repFor(member, week, moveId, visits) {
    var reps = member.reps || [];
    for (var i = 0; i < reps.length; i++) if (reps[i].week === week && reps[i].move === moveId) return reps[i].logged;
    if (reps.length) return 'none';
    var p = member.rep_pattern || 'steady';
    if (p === 'steady') return 'observable';
    if (p === 'slow') return visits % 2 === 0 ? 'observable' : 'none';
    if (p === 'stalls') return visits < 2 ? 'first_failure' : 'observable';
    return 'none';
  }
  function replay(M, member, weeks) {
    var st = { served: [], progress: {} }, log = [], visits = {};
    for (var w = 0; w < weeks; w++) {
      var r = pick(M, member, w, JSON.parse(JSON.stringify(st)));
      var mv = r.move, story = r.story, logged = null;
      if (mv) {
        logged = repFor(member, w, mv.id, visits[mv.id] || 0);
        visits[mv.id] = (visits[mv.id] || 0) + 1;
        var p = st.progress[mv.id] = st.progress[mv.id] || { reps: 0, fails: 0, retired: false };
        if (logged === 'observable') p.reps++;
        if (logged === 'first_failure') p.fails++;
        if (p.reps >= (mv.reps_to_retire || DEFAULT_REPS)) p.retired = true;
      }
      st.served.push({ week: w, key: r.match_key, story: story ? story.id : null, icon: story ? story.icon : null });
      log.push({ week: w, key: r.match_key, move: mv ? mv.id : null, mode: r.mode, behaviour: r.behaviour || null, line: r.line ? r.line.id : null,
        story: story ? story.id : null, icon: story ? story.icon : null, delivery: r.delivery, logged: logged, why: r.why, gaps: r.gaps });
    }
    return log;
  }
  // A member's season as the corpus engine would serve it, dressed for reading.
  function season(lib, M, memberId, weeks) {
    var mm = matcherMember(lib, memberId); if (!mm || !mm.situation_keys.length) return null;
    return replay(M, mm, weeks || 8).map(function (e) {
      var sid = e.story ? resolve(lib, e.story) : null, s = sid ? lib.story[sid] : null, sit = lib.sitByKey[e.key];
      var mv = e.move ? M.corpus.moves.filter(function (m) { return m.id === e.move; })[0] : null;
      var ln = e.line ? M.corpus.lines.filter(function (l) { return l.id === e.line; })[0] : null;
      return { week: e.week + 1, sit: sit ? { id: sit.id, chip: sit.chip } : { id: '', chip: e.key }, mode: e.mode,
        move: mv ? { id: mv.id, behaviour: e.behaviour || mv.behaviour, status: mv.status, author: mv.author } : null,
        line: ln ? { id: ln.id, message: ln.message, status: ln.status } : null,
        story: s ? storyCard(lib, s) : null, delivery: e.delivery, gaps: e.gaps };
    });
  }

  return { DOMAINS: DOMAINS, FIELDS: FIELDS, FAMILY: FAMILY, STATUS: STATUS, GEO: GEO,
    fold: fold, slug: slug, yearOf: yearOf, eraOf: eraOf, yearLabel: yearLabel, firstSentence: firstSentence, lead: lead, bodyAfterPlace: bodyAfterPlace, sentences: sentences, geoName: geoName,
    merge: merge, applyVerification: applyVerification, resolve: resolve, storyCard: storyCard, iconCard: iconCard,
    search: search, iconTrails: iconTrails, storyTrails: storyTrails, eraView: eraView, eras: eras,
    member: member, readingFor: readingFor, matcherMember: matcherMember,
    matcher: matcher, pick: pick, replay: replay, season: season, stanceProfile: stanceProfile,
    similarStories: similarStories, kindred: kindred, ego: ego, situationWeb: situationWeb, path: path, words: words,
    interpret: interpret, ask: ask, sitIndex: sitIndex, queryVec: queryVec, COPY: COPY, voice: voice, STANCE_BY: STANCE_BY, draftLine: draftLine, sourceFor: sourceFor, cautionFor: cautionFor, whyFor: whyFor, statusLine: statusLine, teaser: teaser, lowerFirst: lowerFirst, cap1: cap1,
    num: num, REACH_WORD: REACH_WORD, REACH_SHORT: REACH_SHORT, DIRECT_WORD: DIRECT_WORD, sitLabel: sitLabel, statusWord: statusWord, storyTitle: storyTitle, gapWords: gapWords, stanceGerund: stanceGerund, lifeName: lifeName, likeThis: likeThis, sameField: sameField, reasonFor: reasonFor, readingPath: readingPath, otherWay: otherWay, DIR_WORD: DIR_WORD };
}));
