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
    'sample-verified': { label: 'Verified', tone: 'ok', note: 'A demo sample, checked for the prototype.' },
    'sample-draft': { label: 'Draft', tone: 'draft', note: 'A demo sample still waiting for its source check.' },
    recall: { label: 'Recall draft', tone: 'draft', note: 'Written from recall. Read it against the named source before it is sent.' },
    verified: { label: 'Verified', tone: 'ok', note: 'Read against its source by a coach.' }
  };

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
        move_examples: t ? t.move_examples : [], line_examples: t ? t.line_examples : [], voice: t ? t.voice : null, directness: t ? t.directness : null,
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
        member_line: s.member_line, owner: s.owner, literature: s.literature || [], calibration: calib[s.match_key] || null, outcome: outc[s.match_key] || null,
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
      first: lead(s.moment, s.place), pattern: s.pattern_lang && s.pattern_lang !== 'en' && s.pattern_en ? s.pattern_en : s.pattern,
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
    matcher: matcher, pick: pick, replay: replay, season: season, stanceProfile: stanceProfile };
}));
