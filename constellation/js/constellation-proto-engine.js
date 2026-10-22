(function () {
  var D = function () { return window.CPD; };
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var uniq = function (a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); };
  var words = function (s) { return (s || '').trim().split(/\s+/).filter(Boolean).length; };
  var P = 'sarah', _bm = { key: null, v: null }, PERMS = [];
  (function perm(a, l) { if (l === 4) return PERMS.push(a.slice()); for (var i = l; i < 4; i++) { var t = a[l]; a[l] = a[i]; a[i] = t; perm(a, l + 1); t = a[l]; a[l] = a[i]; a[i] = t; } })([0, 1, 2, 3], 0);
  function pairAt(br, picks, i) { if (i < 8) return br.r1[i]; if (i < 12) return [picks[(i - 8) * 2], picks[(i - 8) * 2 + 1]]; return null; }
  // Rebrief §4: the bracket rule. Deterministic, the same code for every persona; memoised on its inputs.
  function bracketOf(st, mid) {
    mid = mid || P;
    var d = D(), m = d.members[mid], born = st.bornSkip ? null : st.born, ints = (st.interests || []).slice(0, 3);
    var key = mid + '|' + born + '|' + ints.join(',');
    if (_bm.key === key) return _bm.v;
    var w0 = born + 10, w1 = born + 25;
    var yr = function (p) { return p.salient || p.year; };
    var inside = function (p) { return born != null && yr(p) >= w0 && yr(p) <= w1; };
    var dist = function (p) { if (born == null) return 0; var y = yr(p); return y < w0 ? w0 - y : y > w1 ? y - w1 : 0; };
    var L = d.pools.leaders.map(function (id) { return d.hero[id]; });
    var crossL = L.filter(function (p) { return p.cross; }).slice(0, 4);
    var restL = L.filter(function (p) { return !p.cross; }).map(function (p, i) { return { p: p, i: i }; }).sort(function (a, b) { return dist(a.p) - dist(b.p) || a.i - b.i; }).map(function (x) { return x.p; });
    var leaders = crossL.concat(restL.slice(0, 4));
    var taken = {}; leaders.forEach(function (p) { taken[p.id] = 1; });
    var split = ints.length === 1 ? [8] : ints.length === 2 ? [4, 4] : [3, 3, 2];
    var icon = [];
    ints.forEach(function (name, k) {
      var pool = (d.pools[name] || []).map(function (id) { return d.hero[id]; }).filter(function (p) { return !taken[p.id]; });
      var ranked = pool.map(function (p, i) { return { p: p, i: i }; }).sort(function (a, b) { return (inside(b.p) - inside(a.p)) || (b.p.cross - a.p.cross) || (dist(a.p) - dist(b.p)) || (a.i - b.i); });
      ranked.slice(0, split[k]).forEach(function (x) { taken[x.p.id] = 1; icon.push({ p: x.p, interest: name }); });
    });
    restL.slice(4).forEach(function (p) { if (icon.length < 8 && !taken[p.id]) { taken[p.id] = 1; icon.push({ p: p, interest: null }); } });
    var fin = m.finalists || [], isF = function (id) { return fin.indexOf(id) >= 0; };
    var pairUp = function (items, idOf, score) {
      var left = items.slice().sort(function (a, b) { return isF(idOf(b)) - isF(idOf(a)); }), pairs = [];
      while (left.length) { var a = left.shift(), bi = 0, best = -1; left.forEach(function (b, j) { var s = score(a, b, left); if (s > best) { best = s; bi = j; } }); var b = left.splice(bi, 1)[0]; pairs.push(b ? [a, b] : [a, a]); }
      return pairs;
    };
    var LP = pairUp(leaders, function (p) { return p.id; }, function (a, b) { return isF(b.id) ? 0 : 5; });
    var IP = pairUp(icon, function (x) { return x.p.id; }, function (a, b, left) { return (a.interest !== b.interest ? 10 : 0) + (isF(b.p.id) ? 0 : 5) + left.filter(function (z) { return z.interest === b.interest; }).length; });
    var fc = function (pr, idOf) { return pr.filter(function (x) { return isF(idOf(x)); }).length; };
    var bestP = PERMS[0], bestMax = 9;
    PERMS.forEach(function (pm) { var mx = 0; pm.forEach(function (ii, q) { var n = fc(LP[q], function (p) { return p.id; }) + fc(IP[ii], function (x) { return x.p.id; }); if (n > mx) mx = n; }); if (mx < bestMax) { bestMax = mx; bestP = pm; } });
    var r1 = [], ids = [], seed = {}, meta = {};
    leaders.forEach(function (p, i) { seed[p.id] = i + 1; meta[p.id] = { half: 'leaders', interest: null }; });
    icon.forEach(function (x, i) { seed[x.p.id] = 9 + i; meta[x.p.id] = { half: 'interests', interest: x.interest }; });
    bestP.forEach(function (ii, q) { var lp = LP[q], ip = IP[ii]; r1.push([lp[0].id, ip[0].p.id]); r1.push([lp[1].id, ip[1].p.id]); });
    r1.forEach(function (pr) { ids.push(pr[0], pr[1]); });
    var tagOf = function (id) {
      var p = d.hero[id], mt = meta[id] || {}, kind = inside(p) ? 'years' : p.cross ? 'cross' : mt.interest ? 'love' : 'leader', t;
      if (kind === 'years') t = { text: 'From your years · ' + yr(p), band: true, icon: '' };
      else if (kind === 'cross') t = { text: 'Admired across generations', band: false, icon: 'ph ph-dots-three-outline' };
      else if (kind === 'love') t = { text: 'From what you love · ' + mt.interest, band: false, icon: 'ph ph-' + (d.intIcon[mt.interest] || 'heart') };
      else t = { text: 'A leader most people know', band: false, icon: 'ph ph-users-three' };
      t.kind = kind; t.hasIcon = !!t.icon; t.before = born != null && p.year < born ? 'Before your time · ' + p.year : ''; t.hasBefore = !!t.before;
      return t;
    };
    var tags = {}; ids.forEach(function (id) { tags[id] = tagOf(id); });
    var v = { r1: r1, ids: ids, seed: seed, meta: meta, tags: tags, tag: function (id) { return tags[id] || tagOf(id); }, leaders: leaders.map(function (p) { return p.id; }), ints: icon.map(function (x) { return x.p.id; }), split: split,
      counts: { years: ids.filter(function (id) { return tags[id].kind === 'years'; }).length, cross: ids.filter(function (id) { return tags[id].kind === 'cross'; }).length } };
    _bm = { key: key, v: v };
    return v;
  }
  // Demo: skip to final four. The scripted finalists win if all four are still alive; otherwise the higher seed does.
  function autoPicks(st) {
    var d = D(), m = d.members[P], br = bracketOf(st), picks = st.picks.slice(), elim = {};
    var fin = (m.finalists || []).filter(function (h) { return br.ids.indexOf(h) >= 0; });
    for (var i = 0; i < picks.length; i++) { var pr = pairAt(br, picks, i); if (pr) elim[pr[0] === picks[i] ? pr[1] : pr[0]] = 1; }
    var scripted = fin.length === 4 && fin.every(function (h) { return !elim[h]; });
    var hi = function (a, b) { return (br.seed[a] || 99) <= (br.seed[b] || 99) ? a : b; };
    while (picks.length < 12) { var p2 = pairAt(br, picks, picks.length); if (!p2) break; picks.push(scripted ? (fin.indexOf(p2[0]) >= 0 ? p2[0] : fin.indexOf(p2[1]) >= 0 ? p2[1] : hi(p2[0], p2[1])) : hi(p2[0], p2[1])); }
    var ff = picks.slice(8), keep = {}, k3 = (m.keep3 || []).every(function (h) { return ff.indexOf(h) >= 0; }) && m.keep3 ? m.keep3 : ff.slice(0, 3);
    k3.forEach(function (h) { keep[h] = true; });
    return { picks: picks, keep: keep, core: k3, reserve: ff.filter(function (h) { return k3.indexOf(h) < 0; })[0] };
  }
  function pairedFor(st, w) { var mm = (st.micro || []).filter(function (x) { return x.w === w; })[0]; return mm && mm.ins && D().story[mm.ins.story] ? mm.ins : null; }
  // Years-that-shaped-you timeline (rebrief §9), as positions in percent
  function timeline(born, skip) {
    if (skip || !born) return { show: false, win: '', caption: '', short: '' };
    var d = D(), end = 2026, span = (end - born) || 1, px = function (y) { return Math.max(0, Math.min(100, (y - born) / span * 100)); };
    var w0 = born + 10, w1 = Math.min(born + 25, end);
    var ticks = d.pew.filter(function (e) { return e[0] >= w0 && e[0] <= w1; }).map(function (e, i) { return { x: px(e[0]), year: String(e[0]), label: e[1], up: i % 2 === 0, down: i % 2 === 1 }; });
    var b0 = px(w0), b1 = px(w1);
    var winShow = !ticks.some(function (t) { return t.down && t.x > b0 - 3 && t.x < b0 + 26; });
    return { show: true, b0: b0, b1: b1, bw: b1 - b0, ticks: ticks, winDisp: winShow ? 'block' : 'none', win: w0 + '–' + w1, short: w0 + '–' + String(w1).slice(2), caption: 'The years that shaped you: ' + w0 + '–' + w1 + '.' };
  }
  function wheelRef(c) { if (!c._wref) c._wref = function (el) { c._wheel = el; c._wkey = null; syncWheel(c); }; return c._wref; }
  function syncWheel(c) { var el = c._wheel || document.getElementById('cp-wheel'), st = c.state; if (!el || !st || st.bornSkip || st.m !== 'M1b') return; var key = st.p + ':' + st.m; if (c._wkey === key) return; c._wkey = key; el.scrollTop = (st.born - 1950) * 36; }
  function libLine(hid) { var d = D(), L = d.libOf(hid); return L.n >= 3 ? 'Stories in the library: ' + L.n : "Few stories yet. When none fits your week, you'll get one from someone close to " + d.hero[hid].name + '.'; }

  function init(pid) {
    var d = D(); if (pid && d.members[pid]) P = pid; var m = d.members[P];
    return {
      role: 'member', theme: 'light', clock: 0, vw: window.innerWidth || 1280, vh: window.innerHeight || 860, device: 'phone', cdev: 'desk', hid: null, hctx: null, seenMsg: 0,
      p: P, born: m.born, bornSkip: false, grew: m.grew || 'United States', m3a: false,
      m: 'M0', tab: 'week', overlay: null, sid: null, sctx: null,
      goal: m.goal, interests: m.ints.slice(), shake: false, tooMany: false,
      picks: [], inter: false, keep: {}, fitSent: false, core: [], reserve: null,
      scopes: {}, resolved: {}, scopeEdit: null, scopeKeys: [], suggestOpen: false,
      pending: [], extended: [],
      published: false,
      mv: clone(m.mv),
      tests: [true, true, true, true, false, false],
      micro: clone(m.micro),
      line: clone(m.line),
      marks: [], landed: [], saved: [], declined: [], opened: [], signals: [],
      whyOpen: false, notForMe: false,
      ask: { stage: 'compose', text: '', key: null, note: '', sent: false, story: null },
      askHist: [],
      db: { acted: false, said: false, note: '' },
      ready: false, addOpen: false, addName: '', addWhy: '',
      review: { sarah: {}, maya: {}, michael: {}, david: {}, priya: {}, tom: {} },
      swapFor: null, swapHero: 'all', noteFor: null, noteDraft: '', corpus: false,
      hold: {},
      c: 'C1', cm: P,
      lib: { key: 'all', hero: 'all', reach: 'all', ver: 'all', sel: 'st-obama-2008-more-perfect-union', to: P, note: '', msg: '' },
      msgs: clone(d.msgs), compose: '', attach: null, attachOpen: false, cCompose: '', thread: P, drawer: false, playing: null, bookOpen: false, slot: 'Tue 20 Oct, 10:00',
      talk: (m.talk || d.talk).slice(), ciNotes: '', summarySent: false,
      notif: null, cnotif: null, toast: null, ctoast: null
    };
  }

  function later(c, fn, ms) { c._t = c._t || []; c._t.push(setTimeout(fn, ms)); }
  function clearT(c) { (c._t || []).forEach(clearTimeout); c._t = []; }
  function now(st) { var k = D().clock[st.clock]; return k.day + (+k.hm.slice(0, 2)) / 24 + (+k.hm.slice(3)) / 1440; }
  function stamp(st) { var k = D().clock[st.clock]; return D().lab(k.day) + ', ' + k.hm; }

  function pairOf(st) { return pairAt(bracketOf(st), st.picks, st.picks.length); }

  function core(st, mid) { return mid === P ? (st.core.length ? st.core : []) : D().members[mid].core; }
  function extended(st, mid) { return mid === P ? st.extended.map(function (e) { return e.hero; }).filter(Boolean) : []; }

  // Precedence (rebrief §8, C6): pinned > paired in C6 > approved or swapped in C3 > the system rule.
  function weekDelivery(st, mid, week) {
    if (mid !== P) return null;
    var d = D(), m = d.members[P], r = st.review[P] || {};
    var paired = pairedFor(st, week === 12 ? 1 : 2);
    var pd = function (day, note) { return { story: paired.story, source: paired.src === 'coach' ? 'coach' : 'paired', origin: paired.src, closeTo: paired.closeTo, note: note, day: day }; };
    if (week === 12) {
      if (paired) return pd(12, m.note12 || '');
      var sel0 = select(st, P, d.sit[st.mv.sit].key, 'week', 12);
      return { story: sel0.pick && sel0.pick.id, source: 'system', note: '', day: 12 };
    }
    var sel = select(st, P, d.sit[m.up19.sit].key, 'week', 19);
    if (r.action === 'hold') return { held: true };
    if (r.action === 'pin') return { story: r.story, source: 'pinned', note: r.note, day: 19 };
    if (paired) return pd(19, r.note);
    if (r.action === 'swap') return { story: r.story, source: 'coach', note: r.note, day: 19 };
    if (r.action === 'approve') return { story: sel.pick && sel.pick.id, source: 'coach', note: r.note, day: 19 };
    if (st.hold[P]) return { held: true };
    return { story: sel.pick && sel.pick.id, source: 'system', note: r.note, day: 19 };
  }
  function prevDeliveries(st, mid, before) {
    if (mid !== P) return [];
    var out = [];
    if (before > 12) { var w12 = weekDelivery(st, mid, 12); if (w12 && w12.story) out.push({ story: w12.story, day: 12 }); }
    if (before > 19) { var w = weekDelivery(st, mid, 19); if (w && w.story) out.push({ story: w.story, day: 19 }); }
    return out;
  }

  // §7.2 — the selection rule. Pure over state.
  function select(st, mid, key, mode, at) {
    var d = D(), cr = core(st, mid), ex = extended(st, mid);
    var scopes = mid === P ? st.scopes : {};
    var declined = mid === P ? st.declined : [];
    var prev = prevDeliveries(st, mid, at);
    var tier = function (h) { return cr.indexOf(h) >= 0 ? 0 : ex.indexOf(h) >= 0 ? 1 : 2; };
    var cand = d.stories.filter(function (s) { return s.keys.indexOf(key) >= 0; });
    var ok = [], out = [];
    cand.forEach(function (s) {
      var h = d.hero[s.hero];
      if (!s.verified) return out.push({ s: s, why: 'Draft — must verify' });
      if (scopes[s.hero] && scopes[s.hero].indexOf(key) < 0) return out.push({ s: s, why: h.short + ' is scoped to ' + scopes[s.hero].join(', ') });
      if (declined.indexOf(s.id) >= 0) return out.push({ s: s, why: 'Member said “not for me”' });
      var sent = prev.filter(function (p) { return p.story === s.id; })[0];
      if (sent) return out.push({ s: s, why: 'Already sent ' + d.lab(sent.day) });
      if (mode === 'week') {
        if (s.reach === 'far') return out.push({ s: s, why: 'Far: Ask answers only' });
        var last = prev.filter(function (p) { return d.story[p.story].hero === s.hero; }).map(function (p) { return p.day; }).sort().pop();
        if (last != null && at - last < 14) return out.push({ s: s, why: h.short + ' sent ' + (at - last) + ' days ago (no hero twice in 14 days)' });
      }
      ok.push({ s: s, tier: tier(s.hero) });
    });
    var pool = ok;
    if (mode === 'ask') { var nm = ok.filter(function (o) { return o.s.reach !== 'far'; }); pool = nm.length ? nm : ok; }
    pool.sort(function (a, b) { return a.tier - b.tier || (a.s.id < b.s.id ? -1 : 1); });
    var p = pool[0], trace = [];
    if (!cand.length) trace = ['✗ no verified story carries ' + key];
    else if (!p) trace = ['✓ situation ' + key, '✗ nothing eligible: ' + out.map(function (e) { return e.why; }).join('; ')];
    else {
      var hn = d.hero[p.s.hero].name;
      trace.push('✓ situation ' + key);
      trace.push('✓ verified');
      if (p.tier === 0) trace.push('✓ hero: core (' + hn + ')');
      else { trace.push('core heroes: none eligible for this key'); if (p.tier === 2) { trace.push('extended: none'); trace.push('✓ library (' + hn + ')'); } else trace.push('✓ extended (' + hn + ')'); }
      trace.push('✓ reach ' + p.s.reach);
      out.forEach(function (e) { trace.push('· skipped ' + d.hero[e.s.hero].short + ': ' + e.why); });
      if (pool.filter(function (o) { return o.tier === p.tier; }).length > 1) trace.push('tie-break: id');
    }
    return { pick: p ? p.s : null, tier: p ? p.tier : null, ranked: pool, excluded: out, trace: trace, any: cand.length > 0 };
  }

  function fit(st, hid) {
    var d = D(), h = d.hero[hid], m = d.members[P], canned = (m.fit || {})[hid], L = d.libOf(hid), has = L.cov.indexOf(m.sits[0]) >= 0, state, line;
    if (canned) { state = canned[0]; line = canned[1]; }
    else if (has) { state = 'up'; line = h.short + ' has a story for exactly the kind of week you have coming.'; }
    else if (L.n > 0) { state = 'partly'; line = h.short + "'s stories are mostly about other kinds of weeks. Useful for some of yours, not all."; }
    else { state = 'partly'; line = "We don't have stories from " + h.short + ' yet. Your coach will find some, or someone close.'; }
    var covered = m.sits.map(function (id) { return { k: d.sit[id].key, ok: L.cov.indexOf(id) >= 0 }; });
    return { state: state, line: line, n: L.n, keys: covered.filter(function (x) { return x.ok; }).map(function (x) { return x.k; }), covered: covered, thin: L.n < 3 };
  }
  var FITL = { up: 'Lines up', partly: 'Partly', pulls: 'Pulls the other way' };
  function dot(state) {
    return state === 'up' ? { bg: 'var(--pru)', bd: '0' } : state === 'partly' ? { bg: 'linear-gradient(90deg,var(--pru) 50%,transparent 50%)', bd: '1px solid var(--pru)' } : { bg: 'transparent', bd: '2px solid var(--mad)' };
  }

  function scopePhrase(st, hid) {
    var d = D(), ks = st.scopes[hid] || [];
    if (ks.length === 1 && ks[0] === 'saying-it-in-your-own-words') return 'the weeks you have to announce yourself';
    if (ks.length === 1 && ks[0] === 'borrowed-versus-owned-standing') return 'the weeks you have to stand on your own name';
    return 'the weeks about ' + ks.map(function (k) { return (d.sitByKey[k] ? d.sitByKey[k].chip : k).toLowerCase(); }).join(' or ');
  }

  function fs(s) {
    if (!s) return {};
    var d = D(), h = d.hero[s.hero];
    return { id: s.id, hero: h.name, short: h.short, ini: h.ini, place: s.place, eyebrow: h.name + ' · ' + s.place, moment: s.moment, hasPattern: !!s.pattern, patternQ: s.pattern ? '“' + s.pattern + '”' : '', hasBy: !!s.by, by: '— ' + s.by,
      source: 'Source: ' + s.source, hasCaution: !!s.caution, caution: s.caution, why: s.why, verified: s.verified, verLabel: s.verified ? 'Verified' : 'Draft — must verify', verC: s.verified ? 'var(--ink)' : 'var(--mad)',
      first: s.moment.split(/\.\s/)[0] + '.', reach: s.reach, keys: s.keys.join(' · '), gist: s.pattern ? '“' + s.pattern + '”' : s.gist };
  }

  function msgView(c, m, viewer, mid) {
    var d = D(), st = c.state, mine = (m.from === 'member') === (viewer === 'member');
    var S = function (p) { c.setState(p); };
    var v = { id: m.id, at: m.at, justify: mine ? 'flex-end' : 'flex-start', align: mine ? 'right' : 'left', bg: mine ? 'var(--pru12)' : 'var(--well)', body: m.body || '',
      isText: m.kind === 'text', isStory: m.kind === 'story', isAsk: m.kind === 'ask', isVoice: m.kind === 'voice', isCheckin: m.kind === 'checkin', isRecap: m.kind === 'recap' };
    if (m.kind === 'story') { var s = d.story[m.story]; v.s = fs(s); v.open = viewer === 'member' ? function () { open(c, s.id, { back: 'thread' }); } : function () { S({ c: 'C4', lib: Object.assign({}, st.lib, { sel: s.id }) }); }; v.hasNote = !!m.body; }
    if (m.kind === 'ask') { v.chip = m.chip; v.hasNote = !!m.note; v.note = m.note; }
    if (m.kind === 'voice') {
      var on = st.playing === m.id;
      v.playIcon = on ? 'ph ph-pause' : 'ph ph-play';
      v.playLabel = on ? 'Pause voice note' : 'Play voice note';
      v.dur = m.dur;
      v.toggle = function () { S({ playing: on ? null : m.id }); if (!on) later(c, function () { c.setState({ playing: null }); }, 6000); };
      v.bars = d.bars.map(function (h, i) { return { h: h, c: on ? 'var(--ink)' : 'var(--faint)', anim: on ? 'cpBar 900ms ease-in-out ' + (i * 45) + 'ms infinite' : 'none' }; });
    }
    if (m.kind === 'checkin') {
      v.slot = st.slot + ', 15 min';
      v.toggleBook = function () { S({ bookOpen: !st.bookOpen }); };
      v.bookOpen = st.bookOpen;
      v.slots = d.slots.map(function (sl) { return { t: sl, on: sl === st.slot, bd: sl === st.slot ? 'var(--ink)' : 'var(--hair)', pick: function () { S({ slot: sl, bookOpen: false }); toast(c, viewer === 'member' ? 'Check-in moved to ' + sl + '.' : 'Check-in moved to ' + sl + '.', viewer); } }; });
    }
    return v;
  }

  function toast(c, text, where) {
    var k = where === 'coach' ? 'ctoast' : 'toast', p = {}; p[k] = text; c.setState(p);
    later(c, function () { var q = {}; q[k] = null; c.setState(q); }, 2800);
  }

  function open(c, sid, ctx) {
    var st = c.state;
    c.setState({ overlay: 'story', sid: sid, sctx: ctx || {}, notForMe: false, opened: st.opened.indexOf(sid) >= 0 ? st.opened : st.opened.concat([sid]) });
  }

  function openHero(c, hid, ctx) { c.setState({ overlay: 'hero', hid: hid, hctx: ctx || {}, notForMe: false }); }
  // Device frames the member app is shown in. Layout inside the frame follows the frame's logical width (see vals: lg / split).
  var DEV = {
    phone: { iw: 390, ih: 844, r: 46, bezel: 10, top: 44, sbPad: '0 30px' },
    tabP: { iw: 834, ih: 1194, r: 28, bezel: 14, top: 32, sbPad: '0 22px' },
    tabL: { iw: 1194, ih: 834, r: 28, bezel: 14, top: 32, sbPad: '0 22px' },
    desk: { iw: 1280, ih: 800, r: 10, bezel: 0, top: 0, sbPad: '0' }
  };
  var KIND = { book: ['Read', 'ph ph-book-open'], audio: ['Listen', 'ph ph-headphones'], film: ['Watch', 'ph ph-film-strip'] };
  function workUrl(w) {
    if (w.url) return w.url;
    if (w.kind === 'book') return 'https://openlibrary.org/search?q=' + encodeURIComponent(w.title + ' ' + (w.by || ''));
    if (w.kind === 'audio') return 'https://open.spotify.com/search/' + encodeURIComponent(w.title);
    return 'https://www.imdb.com/find/?q=' + encodeURIComponent(w.title + (w.year ? ' ' + w.year : ''));
  }
  function workView(w) { var k = KIND[w.kind] || KIND.book; return { title: w.title, meta: [w.form, w.by, w.year].filter(Boolean).join(' · '), icon: k[1], url: workUrl(w), line: w.line || '', hasLine: !!w.line }; }
  function deeperFor(s) { var d = D(), dp = (s.deeper || []).map(function (id) { return d.work[id]; }).filter(Boolean); if (!dp.length) dp = d.works.filter(function (w) { return w.hero === s.hero; }).slice(0, 2); return dp.map(workView); }

  function onboardPatch(st) {
    var d = D(), m = d.members[P];
    if (st.m === 'app' && st.core.length === 3) return {};
    var st2 = Object.assign({}, st, { goal: st.goal || m.goal, interests: st.interests.length ? st.interests : m.ints.slice() });
    var ap = autoPicks(st2), ff = ap.picks.slice(8);
    var cr = ff.filter(function (h) { return st.keep[h]; });
    if (cr.length !== 3) cr = ap.core;
    var keep = {}; cr.forEach(function (h) { keep[h] = true; });
    return { goal: st2.goal, interests: st2.interests, picks: ap.picks, core: cr, reserve: ff.filter(function (h) { return cr.indexOf(h) < 0; })[0], keep: keep, fitSent: true, m: 'app' };
  }

  function queueRows(st) {
    var d = D();
    return d.order.map(function (mid) {
      var m = d.members[mid], up = m.up19, s = d.sit[up.sit];
      var sel = select(st, mid, s.key, 'week', 19);
      var r = st.review[mid] || {};
      var pr = mid === P ? pairedFor(st, 2) : null;
      var chosen = r.action === 'pin' ? r.story : pr ? pr.story : r.action === 'swap' ? r.story : (sel.pick && sel.pick.id);
      return { mid: mid, m: m, up: up, sit: s, sel: sel, r: r, chosen: chosen };
    });
  }

  function goStep(c, i) {
    var d = D(), k = d.clock[i], st = c.state;
    if (st.p && d.members[st.p]) P = st.p;
    clearT(c);
    if (k.n === 1) { var f = init(); f.theme = st.theme; f.vw = st.vw; f.vh = st.vh; f.device = st.device; f.cdev = st.cdev; c.setState(f); return; }
    var p = { clock: i, role: k.role, notif: null, cnotif: null, overlay: null, swapFor: null };
    if (!st.goal) p.goal = d.members[P].goal;
    if (!st.interests.length) p.interests = d.members[P].ints.slice();
    if (k.n === 2) { p.m = 'M3'; p.picks = []; p.inter = false; }
    if (k.n === 3) { var ap = autoPicks(Object.assign({}, st, p)); p.picks = ap.picks; p.keep = ap.keep; p.m = 'M4'; p.fitSent = false; }
    if (k.n >= 4) Object.assign(p, onboardPatch(Object.assign({}, st, p)));
    if (k.n >= 4 && !st.pending.length && !st.extended.length) p.pending = [Object.assign({ day: 7 }, d.members[P].pend)];
    if (k.n === 4) p.c = 'C1';
    if (k.n === 5) { p.c = 'C6'; p.cm = P; }
    if (k.n >= 6) { p.published = true; p.m = 'app'; }
    if (k.n === 6) { p.tab = 'week'; var w12n = weekDelivery(Object.assign({}, st, p), P, 12); p.notif = { text: 'Your week: one move, one line' + (w12n && w12n.story ? ', one story from ' + d.hero[d.story[w12n.story].hero].name : '') + '.', go: 'week' }; }
    if (k.n === 7) { p.tab = 'week'; p.ready = false; p.notif = { text: 'In an hour. Your move, your line, his story.', go: 'prep' }; }
    if (k.n === 8) { p.tab = 'week'; p.db = { acted: false, said: false, note: '' }; p.notif = { text: 'How did this week go? Two taps.', go: 'debrief' }; }
    if (k.n === 9) { p.tab = 'ask'; p.ask = { stage: 'compose', text: d.members[P].ask1 || d.ask1, key: null, note: '', sent: false, story: null }; }
    if (k.n === 10) {
      p.c = 'C3';
      var rows = queueRows(Object.assign({}, st, p));
      var n = rows.filter(function (r) { return r.chosen; }).length, w = rows.filter(function (r) { return !r.r.action; }).length;
      p.cnotif = { text: n + ' stories go out at 18:00. ' + w + ' are waiting for you.', go: 'C3' };
    }
    if (k.n === 11) { p.c = 'C7'; p.cm = P; }
    c.setState(p);
  }

  function chart(st) {
    var e = (window.CPE.R || window.React).createElement, W = 346, Hh = 236, x0 = 26, y0 = 206, x1 = 318, y1 = 26;
    var mk = st.marks, slots = Math.max(10, mk.length + 3);
    var dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), px = -dy / len, py = dx / len;
    var pts = mk.map(function (m, i) { var t = (i + 1) / slots, off = (i % 2 ? -1 : 1) * 20; return { x: x0 + dx * t + px * off, y: y0 + dy * t + py * off, m: m }; });
    var line = [[x0, y0]].concat(pts.map(function (p) { return [p.x, p.y]; }));
    if (!pts.length) line.push([x0 + dx * 0.05, y0 + dy * 0.05]);
    var ptsStr = line.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
    var kids = [
      e('line', { key: 'd', x1: x0, y1: y0, x2: x1, y2: y1, stroke: 'var(--mute)', strokeWidth: 1.2, strokeDasharray: '1 6', strokeLinecap: 'round' }),
      e('polyline', { key: 'p', points: ptsStr, fill: 'none', stroke: 'var(--ink)', strokeWidth: 1.25, strokeLinejoin: 'round', strokeLinecap: 'round' }),
      e('circle', { key: 's', cx: x0, cy: y0, r: 3, fill: 'var(--ink)' }),
      e('text', { key: 't', x: x0 - 4, y: y0 + 22, fill: 'var(--faint)', style: { font: '500 11px var(--sans)', letterSpacing: '.1em' } }, 'TODAY'),
      e('path', { key: 'g', transform: 'translate(' + x1 + ' ' + y1 + ')', d: 'M0 -7L1.7 -1.7L7 0L1.7 1.7L0 7L-1.7 1.7L-7 0L-1.7 -1.7Z', fill: 'var(--ink)' })
    ];
    pts.forEach(function (p) {
      var land = st.landed.indexOf(p.m.id) >= 0;
      kids.push(e('circle', { key: p.m.id, cx: p.x, cy: p.y, r: 4, fill: p.m.kind === 'acted' ? 'var(--pru)' : 'var(--mad)',
        style: land ? { animation: 'cpLand 700ms cubic-bezier(.16,1,.3,1) both', transformOrigin: p.x + 'px ' + p.y + 'px' } : null }));
    });
    return e('svg', { viewBox: '0 0 ' + W + ' ' + Hh, width: '100%', role: 'img', 'aria-label': 'Your shape: ' + mk.length + ' marks on the way to your goal', style: { display: 'block' } }, kids);
  }

  function vals(c) {
    var d = D(), st = c.state, S = function (p) { c.setState(p); };
    if (st.p && d.members[st.p]) P = st.p;
    if (window.innerWidth && window.innerHeight && (st.vw !== window.innerWidth || st.vh !== window.innerHeight) && c._fit) setTimeout(c._fit, 0);
    var t = now(st), day = Math.floor(t), k = d.clock[st.clock], sarah = d.members[P];
    var stp = stamp(st), CO = d.coaches[sarah.coach];
    syncWheel(c);
    if (st.m === 'M1b' && !st.bornSkip && c._wkey !== st.p + ':' + st.m) setTimeout(function () { syncWheel(c); }, 40);
    var stepLabel = function (q) { return q.n === 1 ? sarah.first + ' opens the app' : q.n === 9 ? (sarah.askLabel || q.label) : q.label; };
    var showMsg = function (m) { return m.live || m.day <= day; };
    var libLineFor = libLine;
    var helpsFor = function (hid) {
      if (!st.published) return { text: "You'll see what they help with after your first session with " + CO.first + '.', c: 'var(--faint)' };
      var mm = st.micro.filter(function (x) { return x.ins && d.story[x.ins.story] && d.story[x.ins.story].hero === hid; })[0];
      return mm ? { text: 'Helps with: ' + mm.b, c: 'var(--pru)' } : { text: 'Nothing paired yet. ' + CO.first + ' is looking.', c: 'var(--faint)' };
    };

    // ---------- shell ----------
    var vw = st.vw, vh = st.vh;
    var dv = DEV[st.device] || DEV.phone, dpad = dv.bezel ? 40 + dv.bezel * 2 : 32;
    var ps = Math.max(0.2, Math.min(1, (vh - 52 - 36) / dv.ih, (vw - dpad) / dv.iw));
    var lg = dv.iw >= 760, split = dv.iw >= 1100, pmode = !lg ? 'full' : split ? 'split' : 'over';
    var cdv = st.cdev === 'tab' ? { iw: 1194, ih: 834, sbW: 72, full: false, r: 28, bezel: 14 } : { iw: 1440, ih: 900, sbW: 220, full: true, r: 10, bezel: 0 };
    var cpad = cdv.bezel ? 40 + cdv.bezel * 2 : 32;
    var cs = Math.max(0.2, Math.min(1, (vw - cpad) / cdv.iw, (vh - 52 - 28) / cdv.ih));
    var anyOv = !!st.overlay;
    var backIcon = function (hasBack) { return hasBack || pmode === 'full' ? 'ph ph-arrow-left' : 'ph ph-x'; };
    var backLabel = function (hasBack) { return hasBack || pmode === 'full' ? 'Back' : 'Close'; };
    var devOpts = st.role === 'member' ? [['phone', 'Phone', 'ph ph-device-mobile', 'Phone · 390 × 844'], ['tab', 'Tablet', 'ph ph-device-tablet', 'Tablet · 1194 × 834, rotates'], ['desk', 'Desktop', 'ph ph-desktop', 'Desktop web · 1280 × 800']] : [['desk', 'Desktop', 'ph ph-desktop', 'Desktop web · 1440 × 900'], ['tab', 'Tablet', 'ph ph-device-tablet', 'Tablet · 1194 × 834']];
    var curDev = st.role === 'member' ? (st.device === 'tabP' || st.device === 'tabL' ? 'tab' : st.device) : st.cdev;
    var wide = vw >= 1240;
    var steps = d.clock.map(function (q, i) { var on = i === st.clock; return { n: q.n, title: q.n + ' · ' + stepLabel(q), go: function () { goStep(c, i); }, bg: on ? 'var(--ink)' : 'transparent', fg: on ? 'var(--paper)' : 'var(--ink)', bd: on ? 'var(--ink)' : 'var(--hair)' }; });
    var out = {
      theme: st.theme, isMember: st.role === 'member', isCoach: st.role === 'coach',
      roleM: { bg: st.role === 'member' ? 'var(--ink)' : 'transparent', fg: st.role === 'member' ? 'var(--paper)' : 'var(--ink)' },
      roleC: { bg: st.role === 'coach' ? 'var(--ink)' : 'transparent', fg: st.role === 'coach' ? 'var(--paper)' : 'var(--ink)' },
      toMember: function () { S({ role: 'member' }); }, toCoach: function () { S({ role: 'coach' }); },
      steps: steps, clockLabel: d.lab(k.day) + ', ' + k.hm + ' · ' + stepLabel(k),
      prevStep: function () { if (st.clock > 0) goStep(c, st.clock - 1); }, nextStep: function () { if (st.clock < d.clock.length - 1) goStep(c, st.clock + 1); },
      themeLabel: st.theme === 'light' ? 'Dark' : 'Light', themeIcon: st.theme === 'light' ? 'ph ph-moon' : 'ph ph-sun',
      toggleTheme: function () { var n = st.theme === 'light' ? 'dark' : 'light'; try { localStorage.setItem('cp-theme', n); } catch (e) {} S({ theme: n }); },
      reset: function () { goStep(c, 0); },
      dvf: { w: Math.round(dv.iw * ps), h: Math.round(dv.ih * ps), iw: dv.iw, ih: dv.ih, s: ps, r: dv.r, top: dv.top, status: dv.top > 0, sbPad: dv.sbPad, ob: lg ? 560 : dv.iw,
        shadow: dv.bezel ? '0 0 0 ' + dv.bezel + 'px var(--bezel),0 30px 80px rgba(0,0,0,.28)' : '0 0 0 1px var(--hair),0 30px 80px rgba(0,0,0,.2)' },
      cf: { w: Math.round(cdv.iw * cs), h: Math.round(cdv.ih * cs), iw: cdv.iw, ih: cdv.ih, s: cs, sbW: cdv.sbW, full: cdv.full, rail: !cdv.full, r: cdv.r, navJ: cdv.full ? 'flex-start' : 'center', navPx: cdv.full ? 10 : 0,
        shadow: cdv.bezel ? '0 0 0 ' + cdv.bezel + 'px var(--bezel),0 30px 80px rgba(0,0,0,.28)' : '0 0 0 1px var(--hair),0 30px 80px rgba(0,0,0,.2)' },
      lg: lg, notLg: !lg, col: { pad: lg ? '12px 48px 48px' : '0 22px 28px', max: lg ? 620 : dv.iw },
      pane: { scrim: anyOv && pmode === 'over', pos: pmode === 'split' ? 'relative' : 'absolute', left: pmode === 'full' ? '0' : 'auto', w: pmode === 'full' ? 'auto' : '440px', bd: pmode === 'full' ? '0' : '1px solid var(--hair)', shadow: pmode === 'over' ? '-20px 0 50px rgba(0,0,0,.14)' : 'none' },
      closeOverlay: function () { S({ overlay: null }); },
      devs: devOpts.map(function (o) { var on = curDev === o[0]; return { label: o[1], icon: o[2], title: o[3], on: on, disp: wide ? 'inline' : 'none', bg: on ? 'var(--ink)' : 'transparent', fg: on ? 'var(--paper)' : 'var(--ink)',
        go: function () { if (st.role === 'member') { var nd = o[0] === 'tab' ? (st.device === 'tabP' ? 'tabP' : 'tabL') : o[0]; try { localStorage.setItem('cp-device', nd); } catch (e) {} S({ device: nd }); } else { try { localStorage.setItem('cp-cdev', o[0]); } catch (e) {} S({ cdev: o[0] }); } } }; }),
      canRotate: st.role === 'member' && (st.device === 'tabP' || st.device === 'tabL'),
      rotate: function () { var nd = st.device === 'tabL' ? 'tabP' : 'tabL'; try { localStorage.setItem('cp-device', nd); } catch (e) {} S({ device: nd }); },
      statusTime: k.hm, wide: wide, wideDisp: wide ? 'inline' : 'none', midDisp: vw >= 1100 ? 'inline' : 'none', stepPx: vw >= 1100 ? 24 : 22,
      narrow: vw < 1000, devGroupDisp: vw < 1000 ? 'none' : 'flex', curDevIcon: (devOpts.filter(function (o) { return o[0] === curDev; })[0] || devOpts[0])[2], curDevLabel: (devOpts.filter(function (o) { return o[0] === curDev; })[0] || devOpts[0])[1],
      cycleDev: function () { var i = devOpts.map(function (o) { return o[0]; }).indexOf(curDev), nx = devOpts[(i + 1) % devOpts.length][0]; if (st.role === 'member') { var nd = nx === 'tab' ? 'tabL' : nx; try { localStorage.setItem('cp-device', nd); } catch (e) {} S({ device: nd }); } else { try { localStorage.setItem('cp-cdev', nx); } catch (e) {} S({ cdev: nx }); } },
    };

    // ---------- member onboarding ----------
    out.sc = { M0: st.m === 'M0', M1: st.m === 'M1', M1b: st.m === 'M1b', M2: st.m === 'M2', M3: st.m === 'M3', M4: st.m === 'M4', M5: st.m === 'M5', app: st.m === 'app' };
    out.coach = { name: CO.name, first: CO.first, ini: CO.ini, title: CO.title, pro: CO.pro, notJennifer: CO.id !== 'jennifer' };
    out.member = { name: sarah.name, first: sarah.first, ini: sarah.ini, pos: sarah.sex === 'm' ? 'his' : 'her' };
    out.personas = d.personas.map(function (pid) { var pm = d.members[pid], on = pid === P; return { label: wide ? pm.first + ', ' + pm.age : pm.first, title: pm.name + ' · ' + pm.role + ' · coached by ' + d.coaches[pm.coach].name, on: on, bg: on ? 'var(--ink)' : 'transparent', fg: on ? 'var(--paper)' : 'var(--ink)',
      go: function () { if (pid === P) return; clearT(c); var f = init(pid); f.theme = st.theme; f.vw = st.vw; f.vh = st.vh; f.device = st.device; f.cdev = st.cdev; f.role = st.role; if (st.role === 'coach') { f.c = 'C2'; f.cm = pid; } try { localStorage.setItem('cp-persona', pid); } catch (e) {} c.setState(f); } }; });
    out.start = function () { S({ m: 'M1' }); };
    out.back = function () { var o = { M1: 'M0', M1b: 'M1', M2: 'M1b', M3: 'M2', M4: 'M3', M5: 'M4' }; S({ m: o[st.m] || 'M0' }); };
    out.goal = st.goal; out.setGoal = function (e) { S({ goal: e.target.value }); };
    out.goalChips = d.goalChips.map(function (g) { return { t: g, pick: function () { S({ goal: g }); }, bd: st.goal === g ? 'var(--ink)' : 'var(--hair)' }; });
    out.m1Dis = !st.goal.trim(); out.m1Op = st.goal.trim() ? 1 : 0.4; out.m1Next = function () { if (st.goal.trim()) S({ m: 'M1b' }); };
    out.yb = (function () {
      var years = [], b = st.born, GR = ['United States', 'United Kingdom', 'Somewhere else'];
      for (var y = 1950; y <= 2006; y++) (function (yy) { var dl = Math.abs(yy - b), on = yy === b; years.push({ y: String(yy), on: on, c: on ? 'var(--ink)' : dl === 1 ? 'var(--mute)' : 'var(--faint)', size: on ? 24 : dl === 1 ? 19 : 16, pick: function () { var el = c._wheel || document.getElementById('cp-wheel'); if (el) el.scrollTo({ top: (yy - 1950) * 36, behavior: 'smooth' }); S({ born: yy, picks: [] }); } }); })(y);
      return {
        years: years, ref: wheelRef(c),
        onScroll: function (e) { var el = e.currentTarget || e.target; clearTimeout(c._wt); c._wt = setTimeout(function () { var i = Math.round(el.scrollTop / 36), yy = Math.max(1950, Math.min(2006, 1950 + i)); if (yy !== c.state.born) c.setState({ born: yy, picks: [] }); }, 90); },
        skipped: st.bornSkip, notSkipped: !st.bornSkip, skip: function () { S({ bornSkip: true, picks: [] }); }, unskip: function () { c._wkey = null; S({ bornSkip: false, picks: [] }); },
        grew: GR.map(function (g) { var on = st.grew === g; return { label: g, on: on, bd: on ? 'var(--ink)' : 'var(--hair)', bg: on ? 'var(--pru12)' : 'transparent', pick: function () { S({ grew: g }); } }; }),
        nonUS: st.grew !== 'United States', tl: timeline(st.born, st.bornSkip),
        next: function () { S({ m: 'M2' }); }
      };
    })();
    out.ints = d.ints.map(function (r) {
      var on = st.interests.indexOf(r[0]) >= 0;
      return { label: r[0], icon: 'ph ph-' + r[1], on: on, bg: on ? 'var(--pru12)' : 'transparent', bd: on ? 'var(--ink)' : 'var(--hair)',
        toggle: function () {
          if (on) return S({ interests: st.interests.filter(function (x) { return x !== r[0]; }), tooMany: false });
          if (st.interests.length >= 3) { S({ shake: true, tooMany: true }); later(c, function () { c.setState({ shake: false }); }, 420); return; }
          S({ interests: st.interests.concat([r[0]]) });
        } };
    });
    out.tooMany = st.tooMany; out.m2Anim = st.shake ? 'cpShake 380ms var(--ease)' : 'none';
    var m2ok = st.interests.length >= 1; out.m2Dis = !m2ok; out.m2Op = m2ok ? 1 : 0.4; out.m2Next = function () { if (m2ok) S({ m: 'M3', picks: [], inter: false }); };
    out.m2Line = (function () { var n = st.interests.length, sp = n === 1 ? [8] : n === 2 ? [4, 4] : [3, 3, 2]; return n ? 'Your bracket draws from: ' + st.interests.slice(0, 3).map(function (nm, i) { return nm + ' ' + sp[i]; }).join(' · ') : 'Pick at least one. Half of your bracket comes from here.'; })();

    var pk = st.picks, idx = pk.length, pair = pairOf(st);
    var pick = function (hid) {
      if (st.inter) return;
      var np = st.picks.concat([hid]);
      if (np.length === 8) { S({ picks: np, inter: true }); later(c, function () { c.setState({ inter: false }); }, 900); return; }
      if (np.length === 12) { var ff = np.slice(8), kp = {}; ff.slice(0, 3).forEach(function (h) { kp[h] = true; }); S({ picks: np, m: 'M4', keep: kp }); return; }
      S({ picks: np });
    };
    c._pick = pick; c._pair = pair;
    var brk = bracketOf(st);
    var card = function (hid) { var h = d.hero[hid], mt = brk.meta[hid] || {}; return { name: h.name, desc: h.desc, area: mt.half === 'leaders' ? 'Leader' : (mt.interest || h.area), ini: h.ini, tag: brk.tag(hid), pick: function () { pick(hid); }, aria: 'Choose ' + h.name }; };
    out.br = {
      roundLabel: idx < 8 ? 'Round 1 · ' + (idx + 1) + ' of 8' : 'Round 2 · ' + Math.min(idx - 7, 4) + ' of 4',
      pct: Math.round(idx / 12 * 100) + '%', a: pair ? card(pair[0]) : {}, b: pair ? card(pair[1]) : {},
      anim: (idx % 2 ? 'cpIn1' : 'cpIn2') + ' 280ms var(--ease) both', inter: st.inter, live: !st.inter && !!pair, interText: 'Round 2. Eight left.',
      undo: function () { if (st.picks.length) S({ picks: st.picks.slice(0, -1), inter: false }); }, noUndo: idx === 0, undoOp: idx === 0 ? 0.35 : 1,
      skip: function () { var ap = autoPicks(st); S({ picks: ap.picks, m: 'M4', keep: ap.keep, inter: false }); }, how: function () { S({ m3a: true }); }
    };
    out.m3a = { open: st.m3a, close: function () { S({ m3a: false }); }, loveLine: st.interests.slice(0, 3).map(function (nm, i) { return nm + ' ' + brk.split[i]; }).join(' · ') };

    var ff4 = pk.length === 12 ? pk.slice(8) : [];
    var kept = ff4.filter(function (h) { return st.keep[h]; });
    out.ff = ff4.map(function (hid) {
      var h = d.hero[hid], on = !!st.keep[hid];
      return { name: h.name, desc: h.desc, ini: h.ini, q: h.q || [], libLine: libLine(hid), keep: on, keepLabel: on ? 'Kept' : 'Keep', aria: (on ? 'Kept: ' : 'Keep ') + h.name,
        bg: on ? 'var(--ink)' : 'transparent', fg: on ? 'var(--paper)' : 'var(--ink)', bd: on ? 'var(--ink)' : 'var(--hair)', op: on || kept.length < 3 ? 1 : 0.5,
        toggle: function () { var kp = Object.assign({}, st.keep); kp[hid] = !kp[hid]; S({ keep: kp }); }, foot: 'Stories from ' + h.name + ' will come to you when they fit.' };
    });
    var m4ok = kept.length === 3;
    out.m4Dis = !m4ok; out.m4Op = m4ok ? 1 : 0.4; out.m4Count = kept.length + ' of 3 kept';
    out.m4Next = function () { if (!m4ok) return; S({ core: kept, reserve: ff4.filter(function (h) { return kept.indexOf(h) < 0; })[0], m: 'M5', fitSent: false }); };

    out.goalQ = '“' + (st.goal || sarah.goal) + '”';
    out.fitRows = st.core.map(function (hid) { var f = fit(st, hid), dd = dot(f.state); return { name: d.hero[hid].name, line: f.line, stateLabel: FITL[f.state], dotBg: dd.bg, dotBd: dd.bd }; });
    out.allUp = st.core.length > 0 && st.core.every(function (h) { return fit(st, h).state === 'up'; });
    out.fitAsk = !st.fitSent; out.fitDone = st.fitSent;
    out.fitSend = function () { S({ fitSent: true }); };
    out.changeOne = function () { S({ m: 'M4' }); };
    out.toApp = function () { S({ m: 'app', tab: 'week' }); };

    // ---------- member app ----------
    var tabs = [['week', 'This week', 'sun-horizon'], ['ask', 'Ask', 'chat-circle-text'], ['heroes', 'Heroes', 'star-four'], ['you', 'You', 'path']];
    out.tabs = tabs.map(function (r) { var on = st.tab === r[0]; return { label: r[1], icon: 'ph ph-' + r[2], c: on ? 'var(--ink)' : 'var(--faint)', bg: on ? 'var(--well)' : 'transparent', cur: on ? 'page' : 'false', go: function () { S({ tab: r[0], overlay: null }); } }; });
    out.tb = { week: st.tab === 'week', ask: st.tab === 'ask', heroes: st.tab === 'heroes', you: st.tab === 'you' };
    out.tabTitle = { week: 'This week', ask: 'Ask', heroes: 'Heroes', you: 'You' }[st.tab];
    var visN = st.msgs[P].filter(showMsg).length;
    out.openThread = function () { S({ overlay: 'thread', seenMsg: visN }); };
    out.unread = visN > st.seenMsg && st.overlay !== 'thread';
    out.threadBg = st.overlay === 'thread' ? 'var(--well)' : 'transparent';

    var wkNo = t >= 19 ? 19 : 12;
    var del = weekDelivery(st, P, wkNo);
    var waiting = !st.published || t < 12.3125;
    var ms = st.micro[wkNo === 19 ? 1 : 0] || st.micro[0];
    var sObj = del && del.story ? d.story[del.story] : null;
    var origin = null, closeName = '';
    if (sObj) { origin = del.origin || (del.source === 'pinned' ? 'coach' : st.core.indexOf(sObj.hero) >= 0 ? 'core' : 'close'); if (origin === 'close' && del.closeTo && d.hero[del.closeTo]) closeName = d.hero[del.closeTo].name; }
    var ins = origin === 'core' ? { eyebrow: 'From one of your three · ' + d.hero[sObj.hero].name, c: 'var(--pru)' } : origin === 'close' ? { eyebrow: 'From someone close to your three' + (closeName ? ' · close to ' + closeName : ''), c: 'var(--mad)' } : { eyebrow: CO.first + ' chose this', c: 'var(--mute)' };
    var sitDay = wkNo === 19 ? 22 : 15;
    var isSaved = function (id) { return st.saved.indexOf(id) >= 0; };
    var toggleSave = function (id) { return function (e) { if (e && e.stopPropagation) e.stopPropagation(); var on = isSaved(id); S({ saved: on ? st.saved.filter(function (x) { return x !== id; }) : st.saved.concat([id]), signals: on ? st.signals : st.signals.concat([{ kind: 'save', sid: id, day: day }]) }); toast(c, on ? 'Removed from saved.' : 'Saved to You.', 'member'); }; };
    out.wk = {
      waiting: waiting, live: !waiting,
      dateLine: waiting ? d.long(day) : (wkNo === 19 ? 'Monday 19 October' : 'Monday 12 October'),
      coming: 'Thursday · ' + sarah.rooms[wkNo === 19 ? 1 : 0][0], ins: ins, nothing: !sObj && !(del && del.held), nothingText: 'No story paired yet. ' + CO.first + ' is looking for one.',
      weekN: 'Your move · Week ' + ms.w + ' of 6', micro: ms.b, parent: st.mv.behaviour, whyOpen: st.whyOpen, whyIcon: st.whyOpen ? 'ph ph-caret-up' : 'ph ph-caret-down',
      toggleWhy: function () { S({ whyOpen: !st.whyOpen }); }, failure: st.mv.failure,
      line: '“' + st.line.text + '”',
      hasStory: !!sObj, held: !sObj, story: fs(sObj), pinned: !!(del && del.source === 'pinned'), hasNote: !!(del && del.note), note: del ? del.note : '',
      open: function () { if (sObj) open(c, sObj.id, { note: del.note, pinned: del.source === 'pinned' }); },
      saveIcon: sObj && isSaved(sObj.id) ? 'ph-fill ph-bookmark-simple' : 'ph ph-bookmark-simple', saveLabel: sObj && isSaved(sObj.id) ? 'Saved' : 'Save story',
      toggleSave: sObj ? toggleSave(sObj.id) : function () {},
      prepDis: t < sitDay - 1, prepOp: t < sitDay - 1 ? 0.4 : 1, prepHint: 'Opens the day before.',
      prep: function () { if (t >= sitDay - 1) S({ overlay: 'prep', ready: false }); }
    };
    out.heroChips = st.core.map(function (h) { return { name: d.hero[h].name, ini: d.hero[h].ini }; });

    // story overlay
    var sv = {};
    if (st.overlay === 'story' && st.sid) {
      var s0 = d.story[st.sid], cx = st.sctx || {};
      sv = Object.assign(fs(s0), {
        pinned: !!cx.pinned, lib: !!cx.lib, hasNote: !!cx.note, note: cx.note || '',
        saveIcon: isSaved(s0.id) ? 'ph-fill ph-bookmark-simple' : 'ph ph-bookmark-simple', saveLabel: isSaved(s0.id) ? 'Saved' : 'Save', toggleSave: toggleSave(s0.id),
        askJim: function () { S({ overlay: 'thread', attach: s0.id, seenMsg: visN }); },
        openHero: function () { openHero(c, s0.hero, { back: 'story' }); }, heroAria: 'More about ' + d.hero[s0.hero].name, moreLabel: 'More from ' + d.hero[s0.hero].short,
        deeper: deeperFor(s0), hasDeeper: deeperFor(s0).length > 0,
        backIcon: backIcon(!!cx.back), backLabel: backLabel(!!cx.back),
        notForMe: function () { S({ declined: st.declined.concat([s0.id]), signals: st.signals.concat([{ kind: 'decline', sid: s0.id, day: day }]), notForMe: true }); },
        declined: st.notForMe, notDeclined: !st.notForMe,
        back: function () { S({ overlay: cx.back || null }); }
      });
    }
    out.sv = sv;
    out.ov = { story: st.overlay === 'story', thread: st.overlay === 'thread', prep: st.overlay === 'prep', debrief: st.overlay === 'debrief', hero: st.overlay === 'hero', any: anyOv };

    // thread
    var thList = st.msgs[P].filter(showMsg).map(function (m) { return msgView(c, m, 'member', P); });
    var sendMember = function () {
      var body = st.compose.trim(); if (!body && !st.attach) return;
      var add = [];
      if (st.attach) add.push({ id: 'm' + Date.now() + 's', from: 'member', kind: 'story', story: st.attach, body: '', day: day, at: stp, live: true });
      if (body) add.push({ id: 'm' + Date.now(), from: 'member', kind: 'text', body: body, day: day, at: stp, live: true });
      var mm = Object.assign({}, st.msgs); mm[P] = st.msgs[P].concat(add);
      S({ msgs: mm, compose: '', attach: null, attachOpen: false });
    };
    out.th = {
      list: thList, back: function () { S({ overlay: null }); }, backIcon: backIcon(false), backLabel: backLabel(false),
      compose: st.compose, setCompose: function (e) { S({ compose: e.target.value }); }, send: sendMember,
      onKey: function (e) { if (e.key === 'Enter') sendMember(); },
      hasAttach: !!st.attach, attachS: st.attach ? fs(d.story[st.attach]) : {}, clearAttach: function () { S({ attach: null }); },
      toggleAttach: function () { S({ attachOpen: !st.attachOpen }); }, attachOpen: st.attachOpen,
      savedList: st.saved.map(function (id) { var s = fs(d.story[id]); return { eyebrow: s.eyebrow, pick: function () { S({ attach: id, attachOpen: false }); } }; }),
      noSaved: st.saved.length === 0
    };

    // prep
    out.pr = {
      when: day === sitDay ? 'Today, 2pm' : (wkNo === 19 ? 'Thursday 22 October, 2pm' : 'Thursday 15 October, 2pm'),
      sit: sarah.rooms[wkNo === 19 ? 1 : 0][1],
      move: ms.b, line: '“' + st.line.text + '”', heroLine: sObj ? d.hero[sObj.hero].name + ' · ' + sObj.place : '', pattern: sObj ? fs(sObj).gist : '', hasPattern: !!sObj,
      ready: st.ready, box: st.ready ? 'var(--ink)' : 'transparent', boxIcon: st.ready ? 'ph-bold ph-check' : '', readyText: st.ready ? 'Ready. Go well.' : "I'm ready",
      toggle: function () { S({ ready: !st.ready }); }, close: function () { S({ overlay: null }); }
    };

    // debrief
    var dbt = function (k2, label, col) {
      var on = st.db[k2];
      return { label: label, on: on, col: col, bd: on ? col : 'var(--hair)', bg: on ? (k2 === 'acted' ? 'var(--pru12)' : 'var(--mad12)') : 'transparent', knob: on ? 'translateX(20px)' : 'none', track: on ? col : 'var(--hair)',
        toggle: function () { var db = Object.assign({}, st.db); db[k2] = !db[k2]; S({ db: db }); } };
    };
    out.db = {
      sit: sarah.rooms[wkNo === 19 ? 1 : 0][1] + ' · Thursday',
      acted: dbt('acted', 'I ran the move', 'var(--pru)'), said: dbt('said', 'I said the line', 'var(--mad)'),
      note: st.db.note, setNote: function (e) { S({ db: Object.assign({}, st.db, { note: e.target.value }) }); },
      dis: !st.db.acted && !st.db.said, op: (!st.db.acted && !st.db.said) ? 0.4 : 1,
      done: function () {
        var add = [], base = 'mk' + Date.now();
        if (st.db.acted) add.push({ id: base + 'a', day: day, kind: 'acted', note: st.db.note });
        if (st.db.said) add.push({ id: base + 's', day: day, kind: 'said', note: st.db.note });
        if (!add.length) return;
        S({ marks: st.marks.concat(add), landed: add.map(function (a) { return a.id; }), overlay: null, tab: 'you', db: { acted: false, said: false, note: '' } });
        later(c, function () { c.setState({ landed: [] }); }, 1200);
      },
      none: function () { S({ overlay: null, db: { acted: false, said: false, note: '' }, signals: st.signals.concat([{ kind: 'nohappen', day: day }]) }); toast(c, 'Noted. ' + CO.first + ' will see it.', 'member'); },
      close: function () { S({ overlay: null }); }
    };

    // ask
    var A = st.ask;
    var chipsFor = function (text) {
      var x = text.toLowerCase();
      if (/reorg|\bdan\b|announc|wanted my job/.test(x)) return ['E1', 'A2'];
      if (/chang|what she wants|what he wants/.test(x)) return ['B3', 'A1'];
      if (/\belt\b|cfo|present|board|steer/.test(x)) return ['B6', 'C3'];
      return [];
    };
    var setAsk = function (p) { S({ ask: Object.assign({}, A, p) }); };
    var choose = function (sid) {
      if (sid === 'else') {
        var mm = Object.assign({}, st.msgs); mm[P] = st.msgs[P].concat([{ id: 'a' + Date.now(), from: 'member', kind: 'ask', body: A.text, chip: 'Something else', day: day, at: stp, live: true }]);
        S({ ask: Object.assign({}, A, { stage: 'else', key: null }), msgs: mm, askHist: st.askHist.concat([{ text: A.text, key: null, story: null, day: day }]) });
        return;
      }
      var key = d.sit[sid].key;
      setAsk({ stage: 'loading', key: key });
      later(c, function () {
        var s2 = c.state, sel = select(s2, P, key, 'ask', day);
        if (!sel.pick) {
          var mm2 = Object.assign({}, s2.msgs); mm2[P] = s2.msgs[P].concat([{ id: 'a' + Date.now(), from: 'member', kind: 'ask', body: s2.ask.text, chip: d.sit[sid].chip, day: day, at: stamp(s2), live: true }]);
          c.setState({ ask: Object.assign({}, s2.ask, { stage: 'else' }), msgs: mm2, askHist: s2.askHist.concat([{ text: s2.ask.text, key: key, story: null, day: day }]) });
          return;
        }
        c.setState({ ask: Object.assign({}, s2.ask, { stage: 'answer', story: sel.pick.id, tier: sel.tier }), askHist: s2.askHist.concat([{ text: s2.ask.text, key: key, story: sel.pick.id, day: day }]) });
      }, 1200);
    };
    var walk = function (key) {
      return st.core.map(function (hid) {
        var h = d.hero[hid], pr = h.sex === 'f' ? 'her' : 'him', sc = st.scopes[hid], scopedOut = sc && sc.indexOf(key) < 0;
        var ov = d.walkOver[key + '|' + hid];
        if (ov && !scopedOut) return { has: true, none: false, lead: 'In the spirit of ' + h.short + ':', text: ' ' + ov.text, open: function () { open(c, ov.story, { back: null }); } };
        var s = !scopedOut && d.stories.filter(function (s1) { return s1.hero === hid && s1.verified && s1.keys.indexOf(key) >= 0 && s1.walk; })[0];
        if (s) return { has: true, none: false, lead: 'In the spirit of ' + h.short + ':', text: ' ' + s.walk, open: function () { open(c, s.id, {}); } };
        if (sc) return { has: false, none: true, text: h.short + " isn't in this one. " + CO.first + "'s using " + pr + ' for ' + scopePhrase(st, hid) + '.' };
        return { has: false, none: true, text: h.short + " isn't in this one. There's no story from " + pr + ' for this yet.' };
      });
    };
    var askStory = A.story ? d.story[A.story] : null;
    var curMoveKey = d.sit[st.mv.sit].key;
    out.ak = {
      compose: A.stage === 'compose', confirm: A.stage === 'confirm', loading: A.stage === 'loading', answer: A.stage === 'answer', elseSent: A.stage === 'else',
      text: A.text, setText: function (e) { setAsk({ text: e.target.value }); },
      dis: !A.text.trim(), op: A.text.trim() ? 1 : 0.4,
      submit: function () { if (A.text.trim()) setAsk({ stage: 'confirm' }); },
      recent: uniq(st.askHist.map(function (h) { return h.text; })).slice(-3).map(function (tx) { return { t: tx, pick: function () { setAsk({ text: tx }); } }; }),
      hasRecent: st.askHist.length > 0,
      quoted: '“' + A.text + '”',
      chips: chipsFor(A.text).map(function (sid) { return { label: d.sit[sid].chip, pick: function () { choose(sid); } }; }).concat([{ label: 'Something else', pick: function () { choose('else'); } }]),
      chipLabel: A.key ? d.sitByKey[A.key].chip : '',
      lib: A.tier === 2, story: fs(askStory), storyHasPattern: !!(askStory && askStory.pattern),
      openStory: function () { if (askStory) open(c, askStory.id, { lib: A.tier === 2 }); },
      walk: A.key ? walk(A.key) : [],
      hasMove: !!A.key && A.key === curMoveKey && st.published, move: ms.b, moveParent: st.mv.behaviour,
      note: A.note, setNote: function (e) { setAsk({ note: e.target.value }); },
      notSent: !A.sent, sent: A.sent,
      sendJim: function () {
        var mm = Object.assign({}, st.msgs);
        mm[P] = st.msgs[P].concat([{ id: 'a' + Date.now(), from: 'member', kind: 'ask', body: A.text, chip: A.key ? d.sitByKey[A.key].chip : 'Something else', note: A.note, story: A.story, day: day, at: stp, live: true }]);
        S({ msgs: mm, ask: Object.assign({}, A, { sent: true }) });
      },
      restart: function () { setAsk({ stage: 'compose', text: '', key: null, note: '', sent: false, story: null }); }
    };

    // heroes tab
    var delivered = [];
    if (st.published && t >= 12.3125) { var w12d = weekDelivery(st, P, 12); if (w12d && w12d.story) delivered.push(w12d.story); }
    if (t >= 19.3125) { var w19 = weekDelivery(st, P, 19); if (w19 && w19.story) delivered.push(w19.story); }
    st.askHist.forEach(function (h) { if (h.story) delivered.push(h.story); });
    var countFor = function (hid) { var n = delivered.filter(function (id) { return d.story[id].hero === hid; }).length; return n === 0 ? 'No stories yet' : n === 1 ? '1 story received' : n + ' stories received'; };
    // hero screen (M14)
    var hv = {};
    if (st.overlay === 'hero' && st.hid && d.hero[st.hid]) {
      var hh = d.hero[st.hid], hcx = st.hctx || {}, her = hh.sex === 'f' ? 'her' : 'his';
      var recd = uniq(delivered.concat(st.saved)).filter(function (id) { return d.story[id] && d.story[id].hero === st.hid; });
      var ws = d.works.filter(function (w) { return w.hero === st.hid; });
      var verN = d.libOf(st.hid).n;
      var tier = st.core.indexOf(st.hid) >= 0 ? 'One of your three' : st.reserve === st.hid ? 'Reserve' : st.extended.some(function (e) { return e.hero === st.hid; }) ? 'Added by you' : st.pending.some(function (e) { return e.hero === st.hid; }) ? 'Waiting for ' + CO.first : 'From the library';
      hv = {
        name: hh.name, ini: hh.ini, desc: hh.desc, q: hh.q, tier: tier, scoped: !!st.scopes[st.hid], scopeLine: CO.first + "'s using " + hh.short + ' for ' + scopePhrase(st, st.hid) + '.',
        storiesLabel: recd.length ? "Stories you've received" : 'Stories',
        stories: recd.map(function (id) { var f = fs(d.story[id]); return { place: f.place, first: f.first, open: function () { open(c, id, { back: 'hero' }); } }; }),
        noStories: !recd.length, noStoriesText: verN ? 'Nothing yet. ' + (hh.sex === 'f' ? 'Her' : 'His') + ' stories come to you when they fit the week.' : 'No stories from ' + hh.short + ' in the record yet.',
        moreInLib: recd.length > 0 && verN > recd.length, moreText: 'More of ' + her + ' record is with ' + CO.first + '. Stories come when they fit your week.',
        hasWorks: ws.length > 0, noWorks: ws.length === 0,
        groups: ['book', 'audio', 'film'].map(function (k2) { return { label: KIND[k2][0], items: ws.filter(function (w) { return w.kind === k2; }).map(workView) }; }).filter(function (g) { return g.items.length; }),
        wiki: 'https://en.wikipedia.org/wiki/' + hh.wiki, wikiLabel: hh.name + ' on Wikipedia',
        back: function () { S({ overlay: hcx.back || null }); }, backIcon: backIcon(!!hcx.back), backLabel: backLabel(!!hcx.back)
      };
    }
    out.hv = hv;
    out.hz = {
      core: st.core.map(function (hid) { var h = d.hero[hid]; return { name: h.name, desc: h.desc, ini: h.ini, q: h.q || [], count: countFor(hid), helps: helpsFor(hid), libLine: libLineFor(hid), scoped: !!st.scopes[hid], scopeLine: CO.first + "'s using " + h.short + ' for ' + scopePhrase(st, hid) + '.', aria: 'More about ' + h.name, open: function () { openHero(c, hid, {}); } }; }),
      hasReserve: !!st.reserve, reserve: st.reserve ? { name: d.hero[st.reserve].name, desc: d.hero[st.reserve].desc, ini: d.hero[st.reserve].ini, aria: 'More about ' + d.hero[st.reserve].name, open: function () { openHero(c, st.reserve, {}); } } : {},
      ext: st.pending.concat(st.extended).map(function (p, i) { var known = !!p.hero; return { name: p.name, ini: p.name.split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2), status: i < st.pending.length ? 'Waiting for ' + CO.first : 'Added by ' + CO.first, why: p.why || '', hasHero: known, aria: known ? 'More about ' + p.name : p.name, open: function () { if (known) openHero(c, p.hero, {}); } }; }),
      addOpen: st.addOpen, addClosed: !st.addOpen, openAdd: function () { S({ addOpen: true }); }, cancelAdd: function () { S({ addOpen: false }); },
      name: st.addName, setName: function (e) { S({ addName: e.target.value }); }, why: st.addWhy, setWhy: function (e) { S({ addWhy: e.target.value }); },
      dis: !st.addName.trim(), op: st.addName.trim() ? 1 : 0.4,
      submit: function () {
        var nm = st.addName.trim(); if (!nm) return;
        var hit = d.heroes.filter(function (h) { return h.name.toLowerCase() === nm.toLowerCase(); })[0];
        var p = { name: hit ? hit.name : nm, hero: hit ? hit.id : null, why: st.addWhy.trim(), day: day, live: true };
        S({ pending: st.pending.concat([p]), addOpen: false, addName: '', addWhy: '' });
        later(c, function () {
          var s2 = c.state; if (!s2.pending.some(function (x) { return x.name === p.name; })) return;
          c.setState({ pending: s2.pending.filter(function (x) { return x.name !== p.name; }), extended: s2.extended.concat([p]) });
          toast(c, CO.first + ' added ' + p.name + ' to your heroes.', 'member');
        }, 3000);
      }
    };

    // you tab
    var acted = st.marks.filter(function (m) { return m.kind === 'acted'; }).length, said = st.marks.length - acted;
    out.yu = {
      goal: st.goal || sarah.goal, chart: chart(st), acted: acted + ' acted', said: said + ' said', empty: st.marks.length === 0,
      saved: st.saved.map(function (id) { var s = fs(d.story[id]); return { eyebrow: s.eyebrow, first: s.first, open: function () { open(c, id, {}); } }; }),
      hasSaved: st.saved.length > 0, noSaved: st.saved.length === 0,
      toHeroes: function () { S({ tab: 'heroes' }); },
      heroNames: st.core.map(function (h) { return d.hero[h].short; }).join(' · '),
      move: st.mv.behaviour, moveStatus: st.published ? 'Live · developed with ' + CO.first : CO.first + ' is writing it with you'
    };

    out.nt = { show: !!st.notif && st.role === 'member', text: st.notif ? st.notif.text : '',
      open: function () { var g = st.notif && st.notif.go; var p = { notif: null, m: 'app' }; if (g === 'week') { p.tab = 'week'; p.overlay = null; } if (g === 'prep') { p.overlay = 'prep'; p.ready = false; } if (g === 'debrief') p.overlay = 'debrief'; S(p); },
      close: function (e) { if (e && e.stopPropagation) e.stopPropagation(); S({ notif: null }); } };
    out.toast = { show: !!st.toast, text: st.toast || '' };

    // ---------- coach ----------
    var lastMsgAsk = function () { var l = st.msgs[P].filter(function (m) { return m.from === 'member' || m.from === 'coach'; }); var last = l[l.length - 1]; return !!(last && last.from === 'member' && last.kind === 'ask'); };
    var flagged = st.core.filter(function (h) { return fit(st, h).state === 'pulls' && !st.resolved[h]; });
    var sarahOn = st.m === 'app' || st.fitSent;
    var PILL = { needs: ['Needs you', 'var(--paper)', 'var(--ink)'], oc: ['On course', 'var(--oc-t)', 'var(--oc-b)'], one: ['One colour', 'var(--one-t)', 'var(--one-b)'], quiet: ['Quiet', 'var(--mute)', 'var(--well)'] };
    var statusOf = function (mid) {
      if (mid !== P) return d.members[mid].status;
      if (!sarahOn) return 'quiet';
      if (flagged.length || st.pending.length || lastMsgAsk()) return 'needs';
      var a = st.marks.filter(function (m) { return m.kind === 'acted'; }).length;
      if (st.marks.length >= 6 && (a === 0 || a === st.marks.length)) return 'one';
      return 'oc';
    };
    var pill = function (k2) { var p = PILL[k2]; return { t: p[0], fg: p[1], bg: p[2] }; };
    var rank = { needs: 0, quiet: 1, one: 2, oc: 3 };
    var lastMark = st.marks.length ? st.marks[st.marks.length - 1].day : null;
    var rel = function (dd) { if (dd == null) return '—'; var n = day - dd; return n <= 0 ? 'Today' : n === 1 ? 'Yesterday' : n + ' days ago'; };
    var nameList = function (ids) { return ids.map(function (h) { return d.hero[h].short; }); };
    var bornCell = function (mid) { var m = d.members[mid], act = mid === P, b = act ? (st.bornSkip ? null : st.born) : m.born; if (b == null) return 'Not given'; return b + ' · ' + (m.gen || '').split(',')[0] + ' · ' + timeline(b, false).short; };
    var fromBlock = function (mid) {
      var m = d.members[mid]; if (m.born == null) return { has: false, tl: { show: false } };
      var act = mid === P, b = act ? (st.bornSkip ? null : st.born) : m.born, ints = act ? st.interests : m.ints;
      var bk = act ? bracketOf(st) : bracketOf({ born: m.born, bornSkip: false, interests: m.ints, picks: [] }, mid);
      return { has: true, born: b == null ? 'Not given' : String(b), gen: m.gen, grew: act ? st.grew : m.grew, ints: ints.join(' · '), tl: timeline(b, b == null),
        makeup: '16 contenders · ' + bk.counts.years + ' from their years · ' + bk.counts.cross + ' across generations · 8 from interests' };
    };
    var ro = d.order.map(function (mid) {
      var m = d.members[mid], isS = mid === P, s = statusOf(mid);
      return { mid: mid, name: m.name, ini: m.ini, role: m.role + ' · ' + m.co, goal: isS ? (sarahOn ? st.goal || m.goal : 'Onboarding now') : m.goal, born: bornCell(mid), coach: d.coaches[m.coach].first,
        heroes: isS ? (sarahOn ? nameList(st.core) : []) : nameList(m.core), move: isS ? (st.published ? st.mv.behaviour : 'Not written yet') : m.move,
        last: isS ? rel(lastMark) : m.last, pill: pill(s), rank: rank[s], next: isS ? (sarahOn ? st.slot : 'Not booked') : m.next,
        open: function () { S({ c: 'C2', cm: mid }); } };
    }).sort(function (a, b) { return a.rank - b.rank; });
    var rows = queueRows(st);
    var waitingRows = rows.filter(function (r) { return !r.r.action; }).length;
    var needsN = ro.filter(function (r) { return r.rank === 0; }).length;
    out.ro = ro;
    out.rosterSummary = d.order.length + ' members · ' + needsN + ' need' + (needsN === 1 ? 's' : '') + ' you · Review queue: ' + rows.filter(function (r) { return r.chosen; }).length + ' stories for next week';

    var unans = function (mid) { var l = st.msgs[mid].filter(showMsg); var last = l[l.length - 1]; return !!(last && last.from === 'member'); };
    var unThreads = d.order.filter(unans).length;
    var navDef = [['C1', 'Members', 'users-three', needsN], ['C3', 'Review', 'stack', waitingRows], ['C4', 'Library', 'books', 0], ['C8', 'Messages', 'chats-circle', unThreads], ['CK', 'Check-ins', 'calendar-check', 0]];
    var navOn = { C1: 'C1', C2: 'C1', C5: 'C1', C6: 'C1', C3: 'C3', C4: 'C4', C8: 'C8', CK: 'CK', C7: 'CK' }[st.c];
    out.nav = navDef.map(function (n) { var on = navOn === n[0]; return { label: n[1], icon: 'ph ph-' + n[2], bg: on ? 'var(--well)' : 'transparent', fg: on ? 'var(--ink)' : 'var(--mute)', badge: n[3], hasBadge: n[3] > 0, j: cdv.full ? 'flex-start' : 'center', px: cdv.full ? 10 : 0, disp: cdv.full ? 'inline' : 'none', go: function () { S({ c: n[0], swapFor: null }); } }; });
    out.cs = { C1: st.c === 'C1', C2: st.c === 'C2', C3: st.c === 'C3', C4: st.c === 'C4', C5: st.c === 'C5', C6: st.c === 'C6', C7: st.c === 'C7', C8: st.c === 'C8', CK: st.c === 'CK' };
    var cm = st.cm, M = d.members[cm], isS = cm === P, MLine = typeof M.line === 'string' ? M.line : (M.line && M.line.text) || '';
    out.cTitle = { C1: 'Members', C2: M.name, C3: 'Review', C4: 'Library', C5: sarah.name, C6: sarah.name, C7: sarah.name, C8: 'Messages', CK: 'Check-ins' }[st.c];
    out.cSub = stp;
    var diff = 18.75 - t;
    out.countdown = diff > 0 ? 'Auto-send in ' + (Math.floor(diff) ? Math.floor(diff) + (Math.floor(diff) === 1 ? ' day ' : ' days ') : '') + Math.round((diff - Math.floor(diff)) * 24) + ' h' : 'Sent Sunday 18:00';
    var mtabsOn = isS && ['C2', 'C5', 'C6', 'C7'].indexOf(st.c) >= 0;
    out.mtabsShow = mtabsOn;
    out.mtabs = [['C2', 'Overview'], ['C5', 'Hero fit'], ['C6', 'Moves'], ['C7', 'Check-in prep']].map(function (r) { var on = st.c === r[0]; return { label: r[1], go: function () { S({ c: r[0], cm: P }); }, bd: on ? 'var(--ink)' : 'transparent', fg: on ? 'var(--ink)' : 'var(--mute)' }; });
    out.cn = { show: !!st.cnotif && st.role === 'coach', text: st.cnotif ? st.cnotif.text : '', open: function () { S({ cnotif: null, c: st.cnotif.go }); }, close: function (e) { if (e && e.stopPropagation) e.stopPropagation(); S({ cnotif: null }); } };
    out.ctoast = { show: !!st.ctoast, text: st.ctoast || '' };

    // C2 overview
    var mcore = isS ? st.core : M.core, mres = isS ? st.reserve : M.reserve;
    var heroRow = function (hid, tier) {
      var h = d.hero[hid], f = isS && tier === 'Core' ? fit(st, hid) : null, dd = f ? dot(f.state) : { bg: 'var(--hair)', bd: '0' };
      return { name: h.name, ini: h.ini, tier: tier, fit: f ? FITL[f.state] + (st.resolved[hid] ? ' · ' + st.resolved[hid] : '') : '', dotBg: dd.bg, dotBd: dd.bd,
        hasScope: isS && !!st.scopes[hid], scope: isS && st.scopes[hid] ? 'Scoped to ' + st.scopes[hid].join(', ') : '' };
    };
    var hrows = mcore.map(function (h) { return heroRow(h, 'Core'); });
    if (mres) hrows.push(heroRow(mres, 'Reserve'));
    if (isS) st.extended.forEach(function (e) { hrows.push({ name: e.name, ini: e.name.slice(0, 2).toUpperCase(), tier: 'Extended', fit: e.hero && d.stories.some(function (s) { return s.hero === e.hero && s.verified; }) ? '' : 'Thin record', dotBg: 'var(--hair)', dotBd: '0', hasScope: false }); });
    var microDone = function (w) { var s0 = 12 + 7 * (w - 1); return st.marks.some(function (m) { return m.kind === 'acted' && m.day >= s0 && m.day < s0 + 7; }); };
    var events = [];
    if (isS) {
      if (sarahOn) events.push({ day: 6, icon: 'ph ph-flag', title: 'Goal and heroes set', detail: '“' + (st.goal || sarah.goal) + '”', hasAct: false });
      if (sarahOn && st.core.some(function (h) { return fit(st, h).state === 'pulls'; })) events.push({ day: 6, icon: 'ph ph-warning-circle', title: 'Fit check: ' + st.core.filter(function (h) { return fit(st, h).state === 'pulls'; }).map(function (h) { return d.hero[h].short; }).join(', ') + ' pulls the other way', detail: flagged.length ? 'Not reviewed yet' : 'Reviewed', hasAct: true, act: 'Review fit', go: function () { S({ c: 'C5' }); } });
      st.pending.forEach(function (p) { events.push({ day: p.day, live: p.live, icon: 'ph ph-user-plus', title: 'Hero added by ' + sarah.first + ': ' + p.name, detail: p.why ? '“' + p.why + '”' : '', hasAct: true, act: 'Review', go: function () { S({ c: 'C5' }); } }); });
      if (st.published && t >= 12.3125) {
        var w12e = weekDelivery(st, P, 12), w12id = w12e && w12e.story, o12 = st.opened.indexOf(w12id) >= 0, sv12 = isSaved(w12id), dc12 = st.declined.indexOf(w12id) >= 0;
        if (w12id) events.push({ day: 12, icon: 'ph ph-book-open-text', title: 'Story · ' + fs(d.story[w12id]).eyebrow, detail: dc12 ? 'Not for me' : sv12 ? 'Opened · saved' : o12 ? 'Opened' : 'Delivered · not opened yet', hasAct: true, act: 'Pin a better story', go: function () { S({ c: 'C3', swapFor: P, swapHero: 'all' }); } });
      }
      if (t >= 19.3125) { var w = weekDelivery(st, P, 19); if (w && w.story) events.push({ day: 19, icon: 'ph ph-book-open-text', title: 'Story · ' + fs(d.story[w.story]).eyebrow, detail: ({ pinned: 'Pinned by you', coach: 'Chosen by you', system: 'Sent by the rule' })[w.source] + (st.opened.indexOf(w.story) >= 0 ? ' · opened' : ''), hasAct: false }); }
      st.marks.forEach(function (mk) { events.push({ day: mk.day, live: true, icon: mk.kind === 'acted' ? 'ph-fill ph-circle' : 'ph-fill ph-circle', ic: mk.kind === 'acted' ? 'var(--pru)' : 'var(--mad)', title: mk.kind === 'acted' ? 'Mark · ran the move' : 'Mark · said the line', detail: mk.note || '', hasAct: false }); });
      st.signals.forEach(function (sg) { if (sg.kind === 'decline') events.push({ day: sg.day, live: true, icon: 'ph ph-x-circle', title: 'Not for me · ' + fs(d.story[sg.sid]).eyebrow, detail: 'Never shown again to ' + sarah.first, hasAct: false }); if (sg.kind === 'nohappen') events.push({ day: sg.day, live: true, icon: 'ph ph-minus-circle', title: "Debrief: it didn't happen this week", detail: '', hasAct: false }); });
      st.msgs[P].filter(function (m) { return m.from === 'member' && m.live; }).forEach(function (m) {
        events.push({ day: m.day, live: true, icon: m.kind === 'ask' ? 'ph ph-question' : 'ph ph-chat-circle', title: m.kind === 'ask' ? 'Ask · ' + m.chip : m.kind === 'story' ? 'Shared a story' : 'Message', detail: m.kind === 'story' ? fs(d.story[m.story]).eyebrow : '“' + m.body + '”' + (m.story ? ' → ' + fs(d.story[m.story]).eyebrow : ''), hasAct: true, act: 'Reply', go: function () { S({ c: 'C8', thread: P }); } });
      });
    } else events = (M.events || []).map(function (e) { return Object.assign({ hasAct: false, icon: 'ph ' + e.icon }, e); });
    events = events.filter(function (e) { return e.live || e.day <= day; }).sort(function (a, b) { return b.day - a.day; }).map(function (e) { return Object.assign({ date: d.lab(e.day), ic: e.ic || 'var(--faint)' }, e); });
    out.o2 = {
      from: fromBlock(cm),
      name: M.name, role: M.role + ' · ' + M.co, ini: M.ini, goal: '“' + (isS ? (st.goal || M.goal) : M.goal) + '”',
      hasSelf: !!M.self, noSelf: !M.self, self: (M.self || []).map(function (r) { return { k: r[0], v: r[1] }; }),
      heroes: hrows, sits: M.sits.map(function (id) { var s = d.sit[id]; return { id: id, line: s.line, key: s.key }; }),
      move: isS ? st.mv.behaviour : M.move, isS: isS, notS: !isS,
      mvRows: isS ? [['Trigger', st.mv.trigger], ['Grain', st.mv.grain], ['First failure', st.mv.failure], ['Observable', st.mv.obs], ['Retire when', st.mv.retire]].map(function (r) { return { k: r[0], v: r[1] }; }) : [],
      tests: isS ? d.tests.slice(0, 6).map(function (lb, i) { return { label: lb, mark: st.tests[i] ? '✓' : '·', c: st.tests[i] ? 'var(--ink)' : 'var(--faint)' }; }) : [],
      moveStatus: (isS && !st.published ? 'Draft · ' : 'Live · ') + d.coaches[M.coach].first,
      micro: isS ? st.micro.map(function (mm) { var dn = microDone(mm.w); return { w: 'Wk ' + mm.w, b: mm.b, mark: dn ? 'ph-fill ph-check-circle' : 'ph ph-circle', c: dn ? 'var(--pru)' : 'var(--faint)' }; }) : [],
      lines: isS ? [{ text: '“' + st.line.text + '”', found: st.line.found, reh: st.line.reh }] : (MLine ? [{ text: '“' + MLine + '”', found: 'Session 1', reh: 'practising' }] : []),
      noLine: !isS && !MLine, lineNote: M.lineNote || '',
      events: events, noEvents: events.length === 0,
      hold: !!st.hold[cm], holdLabel: st.hold[cm] ? 'Hold for me: on' : 'Hold for me: off', holdBg: st.hold[cm] ? 'var(--ink)' : 'transparent', holdFg: st.hold[cm] ? 'var(--paper)' : 'var(--ink)',
      toggleHold: function () { var h = Object.assign({}, st.hold); h[cm] = !h[cm]; S({ hold: h }); },
      message: function () { S({ c: 'C8', thread: cm }); }, book: function () { S({ c: 'CK' }); }, prep: function () { S({ c: 'C7', cm: P }); }, canPrep: isS, back: function () { S({ c: 'C1' }); }
    };

    // C3 review
    out.rq = {
      week: 'Week of 19 October', count: rows.length + ' slots · ' + waitingRows + ' waiting for you',
      bulk: function () {
        var rv = Object.assign({}, st.review);
        rows.forEach(function (r) { if (!r.r.action && r.sel.pick && !st.hold[r.mid]) rv[r.mid] = Object.assign({}, r.r, { action: 'approve' }); });
        S({ review: rv }); toast(c, 'Approved every remaining slot not on Hold for me.', 'coach');
      },
      rows: rows.map(function (q) {
        var s = q.chosen ? d.story[q.chosen] : null, r = q.r, act = r.action, auto = !act && t >= 18.75 && !st.hold[q.mid];
        var setR = function (p) { var rv = Object.assign({}, st.review); rv[q.mid] = Object.assign({}, r, p); S({ review: rv }); };
        var btn = function (key, label, on, dis, title, fn) { return { label: label, on: on, bg: on ? 'var(--ink)' : 'transparent', fg: on ? 'var(--paper)' : 'var(--ink)', bd: on ? 'var(--ink)' : 'var(--hair)', dis: dis, op: dis ? 0.4 : 1, title: title || '', go: function () { if (!dis) fn(); } }; };
        var pinDis = !s || !s.verified;
        return {
          mid: q.mid, name: q.m.name, ini: q.m.ini, up: q.up.label, key: q.sit.id + ' · ' + q.sit.key, holdMode: !!st.hold[q.mid],
          has: !!s, none: !s, s: fs(s), hasNote: !!r.note, note: r.note || '',
          status: act === 'approve' ? 'Approved · sends Monday' : act === 'swap' ? 'Swapped by you · sends Monday' : act === 'pin' ? 'Pinned by you · overrides the rule' : act === 'hold' ? 'Held · nothing sent this week' : auto ? 'Sent as proposed (auto-send)' : st.hold[q.mid] ? 'Hold for me · waits for you' : 'Proposed by the rule',
          trace: (act === 'swap' || act === 'pin' ? ['coach ' + (act === 'pin' ? 'pinned' : 'swapped') + ': overrides the rule (precedence ' + (act === 'pin' ? '1' : '2') + ')'] : []).concat(q.sel.trace.map(function (x) { return (act === 'swap' || act === 'pin' ? 'rule: ' : '') + x; })),
          btns: [
            btn('a', 'Approve', act === 'approve', !q.sel.pick || !q.sel.pick.verified, !q.sel.pick ? 'Nothing eligible to approve.' : '', function () { setR({ action: 'approve', story: null }); }),
            btn('s', 'Swap', act === 'swap', !q.sel.any, !q.sel.any ? 'No story carries this situation yet.' : '', function () { S({ swapFor: q.mid, swapHero: 'all' }); }),
            btn('p', 'Pin', act === 'pin', pinDis, pinDis ? (s ? 'Verify the source before sending.' : 'Nothing to pin.') : '', function () { setR({ action: 'pin', story: q.chosen }); }),
            btn('n', 'Add note', st.noteFor === q.mid, !s, '', function () { S({ noteFor: st.noteFor === q.mid ? null : q.mid, noteDraft: r.note || '' }); }),
            btn('h', 'Hold', act === 'hold', false, '', function () { setR({ action: act === 'hold' ? null : 'hold' }); })
          ],
          noteOpen: st.noteFor === q.mid, noteDraft: st.noteDraft, noteCount: st.noteDraft.length + ' / 240',
          setNote: function (e) { S({ noteDraft: e.target.value.slice(0, 240) }); },
          saveNote: function () { setR({ note: st.noteDraft.trim() }); S({ noteFor: null }); },
          isDavid: !s, corpusOn: st.corpus, corpusLabel: st.corpus ? 'On the corpus request list' : 'Add to corpus request list', corpusIcon: st.corpus ? 'ph-fill ph-check-square' : 'ph ph-square',
          toggleCorpus: function () { S({ corpus: !st.corpus }); }
        };
      })
    };
    // swap panel
    var sp = { open: false };
    if (st.swapFor) {
      var q = rows.filter(function (r) { return r.mid === st.swapFor; })[0];
      var mc = core(st, q.mid);
      var heroesIn = uniq(q.sel.ranked.map(function (o) { return o.s.hero; }).concat(q.sel.excluded.map(function (e) { return e.s.hero; })));
      var setR2 = function (p) { var rv = Object.assign({}, st.review); rv[q.mid] = Object.assign({}, q.r, p); S({ review: rv, swapFor: null }); };
      sp = {
        open: true, title: 'Swap · ' + q.m.name, sit: q.up.label + ' · ' + q.sit.key,
        heroesLine: q.m.first + "'s heroes: " + mc.map(function (h) { return d.hero[h].short + (q.mid === P && st.scopes[h] ? ' (scoped to ' + st.scopes[h].join(', ') + ')' : ''); }).join(' · '),
        close: function () { S({ swapFor: null }); },
        filters: ['all'].concat(heroesIn).map(function (h) { var on = st.swapHero === h; return { label: h === 'all' ? 'All heroes' : d.hero[h].short, bg: on ? 'var(--ink)' : 'transparent', fg: on ? 'var(--paper)' : 'var(--ink)', bd: on ? 'var(--ink)' : 'var(--hair)', go: function () { S({ swapHero: h }); } }; }),
        ranked: q.sel.ranked.filter(function (o) { return st.swapHero === 'all' || o.s.hero === st.swapHero; }).map(function (o, i) {
          var f = fs(o.s); return { rank: String(i + 1), eyebrow: f.eyebrow, first: f.first, tier: ['Core hero', 'Extended hero', 'From the library'][o.tier], cur: o.s.id === q.chosen ? 'Current' : '', isCur: o.s.id === q.chosen,
            choose: function () { setR2({ action: 'swap', story: o.s.id }); toast(c, 'Swapped to ' + f.eyebrow + '.', 'coach'); }, pin: function () { setR2({ action: 'pin', story: o.s.id }); toast(c, 'Pinned ' + f.eyebrow + '.', 'coach'); } };
        }),
        excluded: q.sel.excluded.filter(function (e) { return st.swapHero === 'all' || e.s.hero === st.swapHero; }).map(function (e) { var f = fs(e.s); return { eyebrow: f.eyebrow, why: e.why, draft: !e.s.verified }; })
      };
      sp.noRanked = sp.ranked.length === 0; sp.hasExcluded = sp.excluded.length > 0;
    }
    out.sp = sp;

    // C4 library
    var L = st.lib, setL = function (p) { S({ lib: Object.assign({}, L, p) }); };
    var fil = d.stories.filter(function (s) { return (L.key === 'all' || s.keys.indexOf(L.key) >= 0) && (L.hero === 'all' || s.hero === L.hero) && (L.reach === 'all' || s.reach === L.reach) && (L.ver === 'all' || (L.ver === 'verified') === s.verified); });
    var lsel = d.story[L.sel] || fil[0];
    var fams = ['A', 'B', 'C', 'D', 'E', '·'];
    var segs = function (cur, opts, key) { return opts.map(function (o) { var on = cur === o[0]; return { label: o[1], bg: on ? 'var(--ink)' : 'transparent', fg: on ? 'var(--paper)' : 'var(--ink)', bd: on ? 'var(--ink)' : 'var(--hair)', go: function () { var p = {}; p[key] = o[0]; setL(p); } }; }); };
    var lf = fs(lsel);
    out.lib = {
      groups: fams.map(function (f) { return { fam: f === '·' ? 'Other keys in the sample' : 'Family ' + f, items: d.sits.filter(function (s) { return s.fam === f; }).map(function (s) { var on = L.key === s.key; var n = d.stories.filter(function (x) { return x.keys.indexOf(s.key) >= 0; }).length; return { label: (s.id ? s.id + ' ' : '') + s.chip, n: n ? String(n) : '', fg: on ? 'var(--ink)' : (n ? 'var(--mute)' : 'var(--faint)'), bg: on ? 'var(--well)' : 'transparent', go: function () { setL({ key: on ? 'all' : s.key }); } }; }) }; }),
      allOn: L.key === 'all', allBg: L.key === 'all' ? 'var(--well)' : 'transparent', all: function () { setL({ key: 'all' }); },
      heroSegs: segs(L.hero, [['all', 'All']].concat(uniq(d.stories.map(function (s) { return s.hero; })).map(function (h) { return [h, d.hero[h].short]; })), 'hero'),
      reachSegs: segs(L.reach, [['all', 'All'], ['near', 'Near'], ['mid', 'Mid'], ['far', 'Far']], 'reach'),
      verSegs: segs(L.ver, [['all', 'All'], ['verified', 'Verified'], ['draft', 'Draft']], 'ver'),
      count: fil.length + (fil.length === 1 ? ' story' : ' stories'),
      results: fil.map(function (s) { var f = fs(s), on = lsel && s.id === lsel.id; return { eyebrow: f.eyebrow, first: f.first, ver: f.verLabel, verC: f.verC, reach: s.reach, bg: on ? 'var(--well)' : 'transparent', go: function () { setL({ sel: s.id, msg: '' }); } }; }),
      none: fil.length === 0,
      p: lf, hasSel: !!lsel, pKeys: lsel ? lsel.keys.map(function (k2) { return { k: k2, label: d.sitByKey[k2] ? d.sitByKey[k2].chip : k2 }; }) : [],
      to: d.order.map(function (mid) { var on = L.to === mid; return { label: d.members[mid].first, bg: on ? 'var(--ink)' : 'transparent', fg: on ? 'var(--paper)' : 'var(--ink)', bd: on ? 'var(--ink)' : 'var(--hair)', go: function () { setL({ to: mid, msg: '' }); } }; }),
      note: L.note, setNote: function (e) { setL({ note: e.target.value.slice(0, 240) }); },
      dis: !lsel || !lsel.verified, op: !lsel || !lsel.verified ? 0.4 : 1, title: lsel && !lsel.verified ? 'Verify the source before sending.' : '',
      pinFor: function () { if (!lsel || !lsel.verified) return; var rv = Object.assign({}, st.review); rv[L.to] = Object.assign({}, rv[L.to], { action: 'pin', story: lsel.id, note: L.note.trim() || (rv[L.to] || {}).note }); S({ review: rv, lib: Object.assign({}, L, { msg: 'Pinned for ' + d.members[L.to].first + "'s week of 19 October.", note: '' }) }); },
      sendNow: function () { if (!lsel || !lsel.verified) return; var mm = Object.assign({}, st.msgs); mm[L.to] = st.msgs[L.to].concat([{ id: 'c' + Date.now(), from: 'coach', kind: 'story', story: lsel.id, body: L.note.trim(), day: day, at: stp, live: true }]); S({ msgs: mm, lib: Object.assign({}, L, { msg: 'Sent to ' + d.members[L.to].first + ' now.', note: '' }) }); },
      msg: L.msg, hasMsg: !!L.msg
    };

    // C5 hero fit
    var picksB = st.picks.length === 12 ? st.picks : autoPicks(st).picks, brC = bracketOf(st);
    var short = function (h) { return d.hero[h].name; };
    out.fr = {
      r1: brC.r1.map(function (p) { return { a: short(p[0]), b: short(p[1]), aw: picksB.slice(0, 8).indexOf(p[0]) >= 0 ? 'var(--ink)' : 'var(--faint)', bw: picksB.slice(0, 8).indexOf(p[1]) >= 0 ? 'var(--ink)' : 'var(--faint)' }; }),
      r2: [0, 1, 2, 3].map(function (i) { var a = picksB[i * 2], b = picksB[i * 2 + 1], f4 = picksB.slice(8); return { a: short(a), b: short(b), aw: f4.indexOf(a) >= 0 ? 'var(--ink)' : 'var(--faint)', bw: f4.indexOf(b) >= 0 ? 'var(--ink)' : 'var(--faint)' }; }),
      f4: picksB.slice(8).map(function (h) { var kept2 = st.core.indexOf(h) >= 0, res = st.reserve === h; return { name: short(h), tag: kept2 ? 'Kept' : res ? 'Reserve' : '', c: kept2 ? 'var(--ink)' : 'var(--mute)' }; }),
      goalKeys: sarah.sits.map(function (id) { return d.sit[id].key; }).join(' · '),
      heroes: st.core.map(function (hid) {
        var h = d.hero[hid], f = fit(st, hid), dd = dot(f.state), hs = d.stories.filter(function (s) { return s.hero === hid; });
        var keysAll = uniq(hs.reduce(function (a, s) { return a.concat(s.keys); }, []).concat(sarah.sits.map(function (id) { return d.sit[id].key; })));
        var editing = st.scopeEdit === hid;
        return {
          name: h.name, ini: h.ini, stance: 'Stance: ' + h.stance, state: FITL[f.state], dotBg: dd.bg, dotBd: dd.bd,
          resolved: st.resolved[hid] ? 'Decision: ' + st.resolved[hid] : (f.state === 'pulls' ? 'Flagged · needs your call' : ''), hasResolved: !!st.resolved[hid] || f.state === 'pulls',
          resC: st.resolved[hid] ? 'var(--ink)' : 'var(--mad)',
          covered: f.covered.map(function (x) { return { t: (x.ok ? '✓ ' : '✗ ') + x.k, c: x.ok ? 'var(--ink)' : 'var(--faint)' }; }),
          counts: hs.length ? hs.map(function (s) { return s.keys.join(', ') + (s.verified ? ' · verified' : ' · draft'); }) : ['No story records yet'],
          memberLine: f.line,
          scoped: !!st.scopes[hid], scopeText: st.scopes[hid] ? 'Use ' + h.short + ' only for: ' + st.scopes[hid].join(', ') : '',
          keep: function () { var r = Object.assign({}, st.resolved); r[hid] = 'Keep'; S({ resolved: r }); toast(c, 'Kept ' + h.short + '.', 'coach'); },
          scope: function () { S({ scopeEdit: editing ? null : hid, scopeKeys: st.scopes[hid] || (f.state === 'pulls' ? [d.sit[sarah.sits[0]].key] : []) }); },
          swap: function () {
            if (!st.reserve) return;
            var nc = st.core.map(function (x) { return x === hid ? st.reserve : x; }), r = Object.assign({}, st.resolved); r[hid] = 'Swapped with reserve';
            S({ core: nc, reserve: hid, resolved: r, scopeEdit: null }); toast(c, d.hero[st.reserve].short + ' is now core. ' + h.short + ' is the reserve.', 'coach');
          },
          editing: editing,
          opts: keysAll.map(function (k2) { var on = st.scopeKeys.indexOf(k2) >= 0; return { k: k2, icon: on ? 'ph-fill ph-check-square' : 'ph ph-square', go: function () { S({ scopeKeys: on ? st.scopeKeys.filter(function (x) { return x !== k2; }) : st.scopeKeys.concat([k2]) }); } }; }),
          apply: function () {
            var sc = Object.assign({}, st.scopes), r = Object.assign({}, st.resolved);
            if (st.scopeKeys.length) { sc[hid] = st.scopeKeys.slice(); r[hid] = 'Scoped'; } else { delete sc[hid]; delete r[hid]; }
            S({ scopes: sc, resolved: r, scopeEdit: null }); toast(c, st.scopeKeys.length ? 'Scoped ' + h.short + '. ' + sarah.first + ' sees one line about it.' : 'Scope cleared.', 'coach');
          }
        };
      }),
      hasReserve: !!st.reserve, reserve: st.reserve ? d.hero[st.reserve].name : '', reserveFit: st.reserve ? FITL[fit(st, st.reserve).state] + ' · covers ' + fit(st, st.reserve).covered.filter(function (x) { return x.ok; }).map(function (x) { return x.k; }).join(', ') : '',
      pending: st.pending.map(function (p) {
        var n = p.hero ? d.stories.filter(function (s) { return s.hero === p.hero && s.verified; }).length : 0;
        return { name: p.name, why: p.why ? '“' + p.why + '”' : 'No reason given', thin: n < 3, thinText: 'Thin record — ' + n + ' verified ' + (n === 1 ? 'story' : 'stories') + ". They'll rarely be matched.",
          approve: function () { S({ pending: st.pending.filter(function (x) { return x !== p; }), extended: st.extended.concat([p]) }); toast(c, p.name + ' added to ' + sarah.first + '\'s heroes (extended).', 'coach'); },
          decline: function () {
            var mm = Object.assign({}, st.msgs); mm[P] = st.msgs[P].concat([{ id: 'c' + Date.now(), from: 'coach', kind: 'text', body: "I've held off on " + p.name + ' for now. There are no verified stories from her yet. Let\'s talk about it on Tuesday.', day: day, at: stp, live: true }]);
            S({ pending: st.pending.filter(function (x) { return x !== p; }), msgs: mm }); toast(c, 'Declined, with a note to ' + sarah.first + '.', 'coach');
          } };
      }),
      hasPending: st.pending.length > 0, noPending: st.pending.length === 0,
      suggestOpen: st.suggestOpen, toggleSuggest: function () { S({ suggestOpen: !st.suggestOpen }); },
      suggestList: d.heroes.filter(function (h) { return st.core.indexOf(h.id) < 0 && h.id !== st.reserve && d.stories.some(function (s) { return s.hero === h.id && s.verified; }); }).map(function (h) {
        var n = d.stories.filter(function (s) { return s.hero === h.id && s.verified; }).length;
        return { name: h.name, meta: n + ' verified ' + (n === 1 ? 'story' : 'stories'), go: function () {
          var mm = Object.assign({}, st.msgs); mm[P] = st.msgs[P].concat([{ id: 'c' + Date.now(), from: 'coach', kind: 'text', body: "I'd like to suggest " + h.name + ' for your heroes. Have a look and tell me yes or no.', day: day, at: stp, live: true }]);
          S({ msgs: mm, suggestOpen: false }); toast(c, 'Suggested ' + h.name + ' to ' + sarah.first + '.', 'coach'); } };
      })
    };

    // C6 moves
    var setMv = function (k2) { return function (e) { var mv = Object.assign({}, st.mv); mv[k2] = e.target.value; S({ mv: mv }); }; };
    var fam = d.sit[st.mv.sit].fam, showRepeat = fam === 'A' || fam === 'C';
    var nTests = showRepeat ? 6 : 5, ticks = st.tests.slice(0, nTests).filter(Boolean).length, bw = words(st.mv.behaviour);
    out.mv = {
      sitLabel: st.mv.sit + ' · ' + d.sit[st.mv.sit].key, sitLine: d.sit[st.mv.sit].line,
      sitOpts: sarah.sits.map(function (id) { var on = st.mv.sit === id; return { label: id, bg: on ? 'var(--ink)' : 'transparent', fg: on ? 'var(--paper)' : 'var(--ink)', bd: on ? 'var(--ink)' : 'var(--hair)', go: function () { S({ mv: Object.assign({}, st.mv, { sit: id }) }); } }; }),
      trigger: st.mv.trigger, setTrigger: setMv('trigger'), behaviour: st.mv.behaviour, setBehaviour: setMv('behaviour'),
      bCount: bw + ' / 18 words', bC: bw > 18 ? 'var(--mad)' : 'var(--faint)',
      grain: st.mv.grain, setGrain: setMv('grain'), failure: st.mv.failure, setFailure: setMv('failure'), obs: st.mv.obs, setObs: setMv('obs'), retire: st.mv.retire, setRetire: setMv('retire'),
      tests: d.tests.slice(0, nTests).map(function (lb, i) { var on = st.tests[i]; return { label: lb + (i === 5 ? ' (families A and C)' : ''), icon: on ? 'ph-fill ph-check-square' : 'ph ph-square', c: on ? 'var(--ink)' : 'var(--faint)', go: function () { var tt = st.tests.slice(); tt[i] = !tt[i]; S({ tests: tt }); } }; }),
      ticks: ticks + ' of ' + nTests + ' ticked' + (ticks < 5 ? ' · 5 needed to publish' : ''),
      micro: st.micro.map(function (mm, i) {
        var set = function (k2) { return function (e) { var m2 = st.micro.map(function (x) { return Object.assign({}, x); }); m2[i][k2] = k2 === 'w' ? (parseInt(e.target.value, 10) || 1) : e.target.value; S({ micro: m2 }); }; };
        var mv2 = function (dir) { return function () { var j = i + dir; if (j < 0 || j >= st.micro.length) return; var m2 = st.micro.slice(); var tmp = m2[i]; m2[i] = m2[j]; m2[j] = tmp; S({ micro: m2 }); }; };
        var wn = words(mm.b);
        return { w: String(mm.w), b: mm.b, o: mm.o, setW: set('w'), setB: set('b'), setO: set('o'), count: wn + '/14', cc: wn > 14 ? 'var(--mad)' : 'var(--faint)', up: mv2(-1), down: mv2(1), upOp: i === 0 ? 0.3 : 1, downOp: i === st.micro.length - 1 ? 0.3 : 1,
          remove: function () { if (st.micro.length > 3) S({ micro: st.micro.filter(function (_, j) { return j !== i; }) }); }, rmOp: st.micro.length > 3 ? 1 : 0.3 };
      }),
      canAdd: st.micro.length < 5, addOp: st.micro.length < 5 ? 1 : 0.35,
      addMicro: function () { if (st.micro.length >= 5) return; var lastW = st.micro[st.micro.length - 1].w; S({ micro: st.micro.concat([{ w: lastW + 1, b: '', o: '' }]) }); },
      prevMicro: st.micro[0] ? st.micro[0].b : '', prevWeek: 'Your move · Week ' + (st.micro[0] ? st.micro[0].w : 1) + ' of 6',
      line: st.line.text, setLine: function (e) { S({ line: Object.assign({}, st.line, { text: e.target.value }) }); },
      found: st.line.found, setFound: function (e) { S({ line: Object.assign({}, st.line, { found: e.target.value }) }); },
      reh: [['not yet', 'Not yet'], ['practising', 'Practising'], ['owned', 'Owned']].map(function (r) { var on = st.line.reh === r[0]; return { label: r[1], bg: on ? 'var(--ink)' : 'transparent', fg: on ? 'var(--paper)' : 'var(--ink)', bd: on ? 'var(--ink)' : 'var(--hair)', go: function () { S({ line: Object.assign({}, st.line, { reh: r[0] }) }); } }; }),
      canPub: ticks >= 5 && bw <= 18, canPubNot: !(ticks >= 5 && bw <= 18), pubOp: ticks >= 5 && bw <= 18 ? 1 : 0.4,
      pubLabel: st.published ? 'Update ' + sarah.first + "'s app" : 'Publish to ' + sarah.first + "'s app", status: st.published ? 'Live on ' + sarah.first + "'s app" : 'Draft',
      pubTitle: ticks < 5 ? 'Tick at least five tests to publish.' : bw > 18 ? 'Keep the behaviour to 18 words.' : '',
      publish: function () { if (ticks < 5 || bw > 18) return; S({ published: true }); toast(c, st.published ? 'Updated on ' + sarah.first + "'s app." : 'Published to ' + sarah.first + "'s app. It reaches the Monday card.", 'coach'); }
    };

    // C7 check-in prep
    var a7 = st.marks.filter(function (m) { return m.kind === 'acted'; }).length, s7 = st.marks.length - a7;
    var storyRows = delivered.filter(function (id, i) { return delivered.indexOf(id) === i; }).map(function (id) {
      var f = fs(d.story[id]), o = st.opened.indexOf(id) >= 0, sv2 = isSaved(id), dc = st.declined.indexOf(id) >= 0;
      return { eyebrow: f.eyebrow, state: dc ? 'Not for me' : sv2 ? 'Opened · saved' : o ? 'Opened' : 'Not opened' };
    });
    var askRows = st.askHist.map(function (h) { return { text: '“' + h.text + '”', meta: d.lab(h.day) + ' · ' + (h.key ? d.sitByKey[h.key].chip : 'Something else') + ' → ' + (h.story ? fs(d.story[h.story]).eyebrow : 'sent straight to you') }; });
    var lastCoach = -1; st.msgs[P].forEach(function (m, i) { if (m.from === 'coach') lastCoach = i; });
    var unN = st.msgs[P].filter(function (m, i) { return i > lastCoach && m.from === 'member'; }).length;
    out.ci = {
      when: 'Check-in · ' + st.slot + ' · 15 min',
      dots: st.marks.map(function (m) { return { c: m.kind === 'acted' ? 'var(--pru)' : 'var(--mad)' }; }), noMarks: st.marks.length === 0,
      markCount: a7 + ' acted · ' + s7 + ' said',
      micro: st.micro.map(function (mm) { var dn = microDone(mm.w); return { w: 'Week ' + mm.w, b: mm.b, state: dn ? 'Done' : 'Not yet', c: dn ? 'var(--pru)' : 'var(--faint)' }; }),
      stories: storyRows, noStories: storyRows.length === 0,
      asks: askRows, noAsks: askRows.length === 0,
      unanswered: unN === 0 ? 'Nothing unanswered' : unN + ' message' + (unN === 1 ? '' : 's') + ' from ' + sarah.first + ' waiting for a reply',
      heroes: st.core.map(function (h) { return d.hero[h].short + (st.scopes[h] ? ' · scoped to ' + st.scopes[h].join(', ') : ''); }).concat(st.extended.concat(st.pending).map(function (p) { var n = p.hero ? d.stories.filter(function (s) { return s.hero === p.hero && s.verified; }).length : 0; return p.name + ' · added by Sarah' + (n < 3 ? ' · thin record: ' + n + ' verified' : ''); })),
      talk: st.talk.map(function (tx, i) { return { n: String(i + 1), t: tx, set: function (e) { var a = st.talk.slice(); a[i] = e.target.value; S({ talk: a }); } }; }),
      notes: st.ciNotes, setNotes: function (e) { S({ ciNotes: e.target.value }); },
      sent: st.summarySent, notSent: !st.summarySent,
      send: function () {
        var body = st.ciNotes.trim() || 'Thanks for today. We agreed: keep running the move with Dan, and say the line once in the reorg announcement.';
        var mm = Object.assign({}, st.msgs); mm[P] = st.msgs[P].concat([{ id: 'c' + Date.now(), from: 'coach', kind: 'text', body: 'Recap from our check-in. ' + body, day: day, at: stp, live: true }]);
        S({ msgs: mm, summarySent: true }); toast(c, 'Summary sent to ' + sarah.first + '.', 'coach');
      }
    };

    // C8 messages
    var tid = st.thread;
    out.msg = {
      threads: d.order.map(function (mid) {
        var l = st.msgs[mid].filter(showMsg), last = l[l.length - 1], on = mid === tid;
        var prev = !last ? '' : last.kind === 'text' ? last.body : last.kind === 'story' ? 'Story · ' + fs(d.story[last.story]).eyebrow : last.kind === 'ask' ? 'Ask · ' + last.body : last.kind === 'voice' ? 'Voice note' : 'Check-in booking';
        return { name: d.members[mid].name, ini: d.members[mid].ini, prev: prev, at: last ? last.at : '', un: unans(mid), bg: on ? 'var(--well)' : 'transparent', go: function () { S({ thread: mid, drawer: false }); } };
      }),
      name: d.members[tid].name, list: st.msgs[tid].filter(showMsg).map(function (m) { return msgView(c, m, 'coach', tid); }),
      compose: st.cCompose, setCompose: function (e) { S({ cCompose: e.target.value }); },
      send: function () { var b = st.cCompose.trim(); if (!b) return; var mm = Object.assign({}, st.msgs); mm[tid] = st.msgs[tid].concat([{ id: 'c' + Date.now(), from: 'coach', kind: 'text', body: b, day: day, at: stp, live: true }]); S({ msgs: mm, cCompose: '' }); },
      onKey: function (e) { if (e.key === 'Enter') out.msg.send(); },
      drawer: st.drawer, toggleDrawer: function () { S({ drawer: !st.drawer }); },
      drawerList: d.stories.map(function (s) { var f = fs(s); return { eyebrow: f.eyebrow, first: f.first, dis: !s.verified, op: s.verified ? 1 : 0.45, title: s.verified ? '' : 'Verify the source before sending.', ver: f.verLabel,
        go: function () { if (!s.verified) return; var mm = Object.assign({}, st.msgs); mm[tid] = st.msgs[tid].concat([{ id: 'c' + Date.now(), from: 'coach', kind: 'story', story: s.id, body: '', day: day, at: stp, live: true }]); S({ msgs: mm, drawer: false }); } }; })
    };

    // check-ins
    out.ck = d.order.map(function (mid) {
      var m = d.members[mid], isS2 = mid === P;
      return { name: m.name, ini: m.ini, when: isS2 ? (sarahOn ? st.slot : 'Not booked') : m.next, prepDis: !isS2, prepOp: isS2 ? 1 : 0.4, prepTitle: isS2 ? '' : 'Prep is assembled the evening before.',
        prep: function () { if (isS2) S({ c: 'C7', cm: P }); }, open: function () { S({ c: 'C2', cm: mid }); } };
    });
    out.footer = 'Sample data. Members and companies are fictional. Heroes are real people; their story records here are samples.';
    return out;
  }

  window.CPE = {
    init: init,
    vals: vals,
    dbg: { bracketOf: bracketOf, autoPicks: autoPicks, persona: function (p) { if (p) P = p; return P; } },
    mount: function (c) {
      c._fit = function () { var w = window.innerWidth || document.documentElement.clientWidth, h = window.innerHeight || document.documentElement.clientHeight; if (!w || !h) return; if (w !== c.state.vw || h !== c.state.vh) c.setState({ vw: w, vh: h }); };
      window.addEventListener('resize', c._fit);
      if (window.ResizeObserver) { c._ro = new ResizeObserver(function () { c._fit(); }); c._ro.observe(document.documentElement); }
      requestAnimationFrame(c._fit);
      // Boot can happen in a hidden pane (0×0) with no resize event when it is shown: poll until a real size has been applied, then every 2 s as a backstop.
      c._applied = false; var t0 = Date.now();
      c._poll = setInterval(function () { var w = window.innerWidth, h = window.innerHeight; if (w && h) { if (w !== c.state.vw || h !== c.state.vh) c.setState({ vw: w, vh: h }); c._applied = true; } if (c._applied && Date.now() - t0 > 10000) { clearInterval(c._poll); c._poll = setInterval(c._fit, 2000); } }, 300);
      ['visibilitychange', 'pageshow', 'focus'].forEach(function (ev) { window.addEventListener(ev, c._fit); document.addEventListener(ev, c._fit); });
      if (c._ro && document.body) c._ro.observe(document.body);
      c._key = function (e) {
        var st = c.state;
        if (e.key === 'Escape' && st.overlay) { c.setState({ overlay: null, swapFor: null }); return; }
        if (st.role !== 'member' || st.m !== 'M3' || st.inter || !c._pair) return;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); c._pick(c._pair[0]); }
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); c._pick(c._pair[1]); }
      };
      window.addEventListener('keydown', c._key);
      try { var th = localStorage.getItem('cp-theme'), dv0 = localStorage.getItem('cp-device'), cd0 = localStorage.getItem('cp-cdev'), pp = localStorage.getItem('cp-persona'), p0 = {}; if (pp && pp !== P && D().members[pp]) Object.assign(p0, init(pp)); if (th) p0.theme = th; if (dv0 && DEV[dv0]) p0.device = dv0; if (cd0 === 'tab' || cd0 === 'desk') p0.cdev = cd0; c.setState(p0); } catch (e) {}
      c._fit();
    },
    unmount: function (c) { window.removeEventListener('resize', c._fit); if (c._ro) c._ro.disconnect(); clearInterval(c._poll); ['visibilitychange', 'pageshow', 'focus'].forEach(function (ev) { window.removeEventListener(ev, c._fit); document.removeEventListener(ev, c._fit); }); window.removeEventListener('keydown', c._key); clearT(c); }
  };
})();
