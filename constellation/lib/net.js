/* Constellation networks: who is kindred to whom, and why. Beside lib/core.js; window.CLN in a browser.
   Pure functions over the merged index (CLC.merge); same inputs, same output; no layout here (that is
   library/graph.js). Every tie carries its reasons, and every reason can be said as a sentence.

     CLN.tie(lib, a, b)            -> { shared, reasons, dy, w } or null    one tie, with its reasons
     CLN.why(lib, a, b, t)         -> ['Both ...', ...]                     the reasons as sentences
     CLN.kindred(lib, id, n)       -> ranked kin of one life
     CLN.route(lib, from, to, o)   -> [{ a, b, tie }]                       the strongest short chain
     CLN.bridge(lib, mid, icon, key) -> the chain from a member's three to a story's life
     CLN.near(lib, mid)            -> a member's situations, the lives in them, their three, stand-ins
     CLN.web(lib)                  -> situation pairs held by the same life, with the lives

   A tie needs one shared situation (the predicament) and one more reason: the same way of leading,
   within 15 years, or the same domain. Two shared situations make a tie on their own. Measured on the
   corpus: a shared situation alone gives each life a median of 35 neighbours (too many to mean anything);
   this rule gives a median of 19, and no life is left with none. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CLN = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // "Both ..." for each situation. Plain words a member would use; one sentence each.
  var BOTH = {
    'unnamed-expectations': 'took on a job nobody had explained to them',
    'renegotiating-standing': 'became the boss of people who had been their peers',
    'naming-an-unseen-problem': 'named a problem nobody else could see',
    'following-a-legend': 'followed someone the room had loved',
    'judging-unfamiliar-work': 'answered for work they could not judge themselves',
    'credit-and-attribution': 'had to win the credit for their own work',
    'style-against-expectation': 'led in a style nobody expected of them',
    'contradictory-feedback': 'were told one thing, then another',
    'unclassifiable-profile': 'were hard for others to place',
    'saying-it-in-your-own-words': 'found their own words for it',
    'expertise-without-pull': 'had to be heard in a room that decides',
    'selling-what-you-used-to-make': 'had to sell what they used to make',
    'borrowed-versus-owned-standing': 'built a name that belonged to them',
    'coalition-without-mandate': 'won the decision before the meeting',
    'leading-beyond-line-of-sight': 'led more people than they could see',
    'developing-without-a-bench': 'grew people with no bench behind them',
    'stopping-the-old-work': 'stopped work people were proud of',
    'carrying-somebody-elses-decision': 'carried a decision they did not make',
    'every-act-is-a-message': 'had every act read as a signal',
    'agreeing-and-not-moving': 'faced a room that agreed and did not move',
    'the-loss-inside-the-promotion': 'lost what they were best at when they stepped up',
    'competent-and-becalmed': 'were good at it, and becalmed'
  };
  var STANCE = { front: 'lead out front', earn: 'earn it daily', weight: 'carry the weight', grow: 'grow their people', close: 'stay close to their people', ootw: 'keep out of the way' };
  var FIELD = { public: 'public life', law: 'law', business: 'business', media: 'advertising and media', sport: 'sport', music: 'music', arts: 'the arts', ideas: 'science and ideas' };
  var NEAR_YEARS = 15;

  function both(key) { return BOTH[key] || ''; }
  function lower(s) { return String(s || '').replace(/&/g, 'and').toLowerCase(); }

  function tie(lib, A, B) {
    if (typeof A === 'string') A = lib.icon[A]; if (typeof B === 'string') B = lib.icon[B];
    if (!A || !B || A.id === B.id) return null;
    var shared = A.keys.filter(function (k) { return B.keys.indexOf(k) >= 0; });
    if (!shared.length) return null;
    var r = [], dy = A.year == null || B.year == null ? null : Math.abs(A.year - B.year);
    if (A.stance && A.stance === B.stance) r.push('stance');
    if (dy != null && dy <= NEAR_YEARS) r.push('time');
    if (A.domain && A.domain === B.domain) r.push('domain'); else if (A.field === B.field) r.push('field');
    if (shared.length < 2 && !r.length) return null;
    var w = shared.length * 3 + (r.indexOf('stance') >= 0 ? 2 : 0) + (r.indexOf('time') >= 0 ? 1 : 0) + (r.indexOf('domain') >= 0 ? 1.5 : r.indexOf('field') >= 0 ? 0.75 : 0);
    return { shared: shared, reasons: r, dy: dy, w: w };
  }

  // Sentences. The situation first, then the way of leading, then the world, then the years.
  function why(lib, A, B, t) {
    if (typeof A === 'string') A = lib.icon[A]; if (typeof B === 'string') B = lib.icon[B];
    t = t || tie(lib, A, B); if (!t) return [];
    var out = t.shared.map(function (k) { return 'Both ' + both(k) + '.'; });
    if (t.reasons.indexOf('stance') >= 0) out.push('Both ' + STANCE[A.stance] + '.');
    if (t.reasons.indexOf('domain') >= 0) out.push(world(A));
    else if (t.reasons.indexOf('field') >= 0) out.push('Both in ' + FIELD[A.field] + '.');
    if (t.dy != null) out.push(apart(t.dy));
    return out;
  }
  function apart(dy) { return dy === 0 ? 'The same year.' : dy + (dy === 1 ? ' year' : ' years') + ' apart.'; }
  // "Both in sport", "Both creators": the world they share, in a member's words
  function world(X) {
    var d = { influencer: 'Both creators.', film: 'Both in film and television.', literature: 'Both writers.', art: 'Both artists.', science: 'Both scientists.', law: 'Both in law.',
      politics: 'Both in politics.', military: 'Both soldiers.', music: 'Both musicians.', sport: 'Both in sport.', agency: 'Both in advertising.', banking: 'Both bankers.', finance: 'Both in finance.' }[X.domain];
    return d || 'Both in ' + lower(X.domainLabel) + '.';
  }
  // One short line for a link in a chain: the situation, and the strongest other reason.
  function short(lib, A, B, t) {
    if (typeof A === 'string') A = lib.icon[A]; if (typeof B === 'string') B = lib.icon[B];
    t = t || tie(lib, A, B); if (!t) return '';
    var s = 'Both ' + both(t.shared[0]);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // ---------- the graph ----------
  var cache = typeof WeakMap === 'function' ? new WeakMap() : null;
  function graph(lib) {
    if (cache && cache.has(lib)) return cache.get(lib);
    var lives = lib.icons.filter(function (i) { return i.stories.length; }), adj = {};
    lives.forEach(function (i) { adj[i.id] = []; });
    for (var a = 0; a < lives.length; a++) for (var b = a + 1; b < lives.length; b++) {
      var t = tie(lib, lives[a], lives[b]); if (!t) continue;
      adj[lives[a].id].push({ id: lives[b].id, t: t }); adj[lives[b].id].push({ id: lives[a].id, t: t });
    }
    var g = { lives: lives, adj: adj, deg: {} };
    Object.keys(adj).forEach(function (k) { g.deg[k] = adj[k].length; });
    if (cache) cache.set(lib, g);
    return g;
  }

  function byName(lib) { return function (a, b) { var x = lib.icon[a.id].name, y = lib.icon[b.id].name; return x < y ? -1 : x > y ? 1 : 0; }; }
  function kindred(lib, id, n) {
    var g = graph(lib), me = lib.icon[id]; if (!me || !g.adj[id]) return [];
    var list = g.adj[id].slice().sort(function (a, b) { return b.t.w - a.t.w || (a.t.dy || 0) - (b.t.dy || 0) || byName(lib)(a, b); });
    return list.slice(0, n || list.length).map(function (e) { return { id: e.id, tie: e.t, why: why(lib, me, lib.icon[e.id], e.t) }; });
  }

  // Dijkstra over ties. A strong tie is cheap; passing through a life with many ties costs more, so
  // chains do not all run through the two or three people who hold six situations.
  function route(lib, from, to, o) {
    o = o || {}; var g = graph(lib), max = o.max || 4, avoid = o.avoid || {};
    if (!g.adj[from] || !g.adj[to]) return null;
    if (from === to) return [];
    var dist = {}, prev = {}, steps = {}, done = {}; dist[from] = 0; steps[from] = 0;
    for (;;) {
      var u = null, best = Infinity;
      for (var k in dist) if (!done[k] && dist[k] < best) { best = dist[k]; u = k; }
      if (u == null || u === to) break;
      done[u] = 1;
      if (steps[u] >= max) continue;
      g.adj[u].forEach(function (e) {
        var v = e.id; if (avoid[v] && v !== to) return;
        var c = 1 + 6 / e.t.w + (v === to ? 0 : Math.log(1 + g.deg[v]) / 3) + (o.lastKey && v === to && e.t.shared.indexOf(o.lastKey) < 0 ? 1.5 : 0);
        if (dist[v] == null || dist[u] + c < dist[v] - 1e-9 || (Math.abs(dist[u] + c - dist[v]) < 1e-9 && u < prev[v].a)) { dist[v] = dist[u] + c; prev[v] = { a: u, t: e.t }; steps[v] = steps[u] + 1; }
      });
    }
    if (dist[to] == null) return null;
    var p = []; for (var x = to; x !== from; x = prev[x].a) p.unshift({ a: prev[x].a, b: x, tie: prev[x].t });
    p.cost = dist[to];
    return p;
  }
  // Up to n different chains: each later one may not reuse the people in the middle of the earlier ones.
  function routes(lib, from, to, n, o) {
    var out = [], avoid = {};
    for (var i = 0; i < (n || 3); i++) {
      var r = route(lib, from, to, Object.assign({}, o || {}, { avoid: avoid })); if (!r) break;
      if (out.some(function (x) { return x.map(function (s) { return s.b; }).join() === r.map(function (s) { return s.b; }).join(); })) break;
      out.push(r); r.slice(0, -1).forEach(function (s) { avoid[s.b] = 1; });
      if (r.length === 1) break;
    }
    return out;
  }

  function three(lib, mid) { var m = lib.members[mid]; return m ? ((m.heroes_icons || {}).core || []).filter(function (x) { return lib.icon[x]; }) : []; }

  // From the member's three to the life a story comes from. The last link should share the week's situation.
  function bridge(lib, mid, iconId, key, o) {
    var hs = o && o.three && o.three.length ? o.three : three(lib, mid);
    if (hs.indexOf(iconId) >= 0) return { hero: iconId, steps: [], own: true };
    var best = null;
    hs.forEach(function (h) {
      var r = route(lib, h, iconId, { max: 3, lastKey: key }); if (!r) return;
      if (!best || r.cost < best.steps.cost) best = { hero: h, steps: r };
    });
    return best;
  }

  // ---------- a member's neighbourhood ----------
  // How close a life sits to the member's three: the strongest tie to any of them, or, where they share
  // no situation, the same way of leading, the same domain and nearness in time.
  function affinity(lib, X, H) {
    var t = tie(lib, X, H); if (t) return { w: t.w, t: t };
    var w = 0, r = [];
    if (X.stance && X.stance === H.stance) { w += 2; r.push('stance'); }
    if (X.domain === H.domain) { w += 1.5; r.push('domain'); } else if (X.field === H.field) { w += 0.75; r.push('field'); }
    var dy = X.year == null || H.year == null ? null : Math.abs(X.year - H.year);
    if (dy != null && dy <= NEAR_YEARS) { w += 1; r.push('time'); }
    return { w: w, t: { shared: [], reasons: r, dy: dy, w: w } };
  }
  function sendable(lib, iconId, key) {
    return (lib.byIcon[iconId] || []).some(function (sid) { var s = lib.story[sid]; return s.keys.indexOf(key) >= 0 && (s.reach === 'near' || s.reach === 'mid'); });
  }
  // o.three: the member's heroes as the app holds them now, when they have changed since onboarding
  function near(lib, mid, o) {
    var m = lib.members[mid]; if (!m) return null;
    var keys = (m.sits || []).map(function (c) { return lib.sit[c] && lib.sit[c].key; }).filter(Boolean);
    var hs = o && o.three && o.three.length ? o.three.filter(function (x) { return lib.icon[x]; }) : three(lib, mid), H = hs.map(function (h) { return lib.icon[h]; });
    var lives = [];
    lib.icons.forEach(function (i) {
      if (!i.stories.length && hs.indexOf(i.id) < 0) return;
      var held = keys.filter(function (k) { return i.keys.indexOf(k) >= 0; });
      var hero = hs.indexOf(i.id) >= 0;
      if (!held.length && !hero) return;
      var best = { w: 0, h: null, t: null };
      H.forEach(function (h) { if (h.id === i.id) return; var a = affinity(lib, i, h); if (a.w > best.w) best = { w: a.w, h: h.id, t: a.t }; });
      lives.push({ id: i.id, held: held, hero: hero, near: best, sendable: held.filter(function (k) { return sendable(lib, i.id, k); }) });
    });
    lives.sort(function (a, b) { return (b.hero - a.hero) || b.held.length - a.held.length || b.near.w - a.near.w || (lib.icon[a.id].name < lib.icon[b.id].name ? -1 : 1); });
    // stand-ins: for each of the three and each situation they do not hold, the nearest life who does
    var standIns = [];
    H.forEach(function (h) {
      keys.forEach(function (k) {
        if (h.keys.indexOf(k) >= 0) return;
        var c = (lib.iconsByKey[k] || []).filter(function (x) { return x !== h.id && hs.indexOf(x) < 0 && sendable(lib, x, k); })
          .map(function (x) { return { id: x, a: affinity(lib, lib.icon[x], h) }; })
          .sort(function (p, q) { return q.a.w - p.a.w || (p.a.t.dy || 0) - (q.a.t.dy || 0) || (p.id < q.id ? -1 : 1); })[0];
        // a stand-in has to share something real with the hero: a situation, or the way they lead
        if (c && c.a.w >= 3 && (c.a.t.shared.length || c.a.t.reasons.indexOf('stance') >= 0)) standIns.push({ hero: h.id, key: k, id: c.id, a: c.a });
        else standIns.push({ hero: h.id, key: k, id: null });
      });
    });
    return { member: m, keys: keys, three: hs, lives: lives, standIns: standIns,
      covered: keys.map(function (k) { return { key: k, by: hs.filter(function (h) { return lib.icon[h].keys.indexOf(k) >= 0; }) }; }) };
  }
  function nearWhy(lib, X, H, a) {
    if (typeof X === 'string') X = lib.icon[X]; if (typeof H === 'string') H = lib.icon[H];
    a = a || affinity(lib, X, H);
    if (a.t.shared.length) return why(lib, X, H, a.t);
    var out = [];
    if (a.t.reasons.indexOf('stance') >= 0) out.push('Both ' + STANCE[X.stance] + '.');
    if (a.t.reasons.indexOf('domain') >= 0) out.push(world(X));
    else if (a.t.reasons.indexOf('field') >= 0) out.push('Both in ' + FIELD[X.field] + '.');
    if (a.t.dy != null) out.push(apart(a.t.dy));
    return out;
  }

  // ---------- one check fills this slot ----------
  // For a week with no checked story: the recall drafts in its situation that are near enough to send, ranked
  // by how close their life is to the member's three (one of the three, then one link, then two), then by id.
  // o.three: the heroes as the app holds them now; o.prefer: a draft already paired with the week, which comes first.
  function fillSlot(lib, mid, key, o) {
    o = o || {}; var hs = o.three && o.three.length ? o.three : three(lib, mid), out = [], ex = o.exclude || [], av = o.avoidIcons || [];
    (lib.byKey[key] || []).forEach(function (sid) {
      var s = lib.story[sid]; if (!s || s.verified || !(s.reach === 'near' || s.reach === 'mid') || ex.indexOf(sid) >= 0 || av.indexOf(s.icon) >= 0) return;
      var own = hs.indexOf(s.icon) >= 0, b = own ? null : bridge(lib, mid, s.icon, key, { three: hs });
      out.push({ story: s, links: own ? 0 : b && b.steps ? b.steps.length : 9, hero: own ? s.icon : b ? b.hero : null, steps: b ? b.steps : [] });
    });
    out.sort(function (a, b) { return (b.story.id === o.prefer) - (a.story.id === o.prefer) || a.links - b.links || (a.story.id < b.story.id ? -1 : 1); });
    return { pick: out[0] || null, next: out.slice(1, 3), total: out.length };
  }

  // ---------- how far a life is from a member's three ----------
  // hops: the fewest links from any of the three to every life with a story (0 for the three themselves),
  // breadth first over the ties, at most o.max (default 3). For sorting a list of stories by nearness.
  function hops(lib, mid, o) {
    o = o || {}; var g = graph(lib), hs = o.three && o.three.length ? o.three : three(lib, mid), max = o.max || 3, out = {}, q = [];
    hs.forEach(function (h) { if (lib.icon[h] && !out[h]) { out[h] = { links: 0, hero: h }; q.push(h); } });
    for (var i = 0; i < q.length; i++) {
      var u = q[i], du = out[u]; if (du.links >= max) continue;
      (g.adj[u] || []).forEach(function (e) { if (!out[e.id]) { out[e.id] = { links: du.links + 1, hero: du.hero }; q.push(e.id); } });
    }
    return out;
  }
  // linksTo: how one life reaches the member, in words: the chain bridge() finds, and one line for it
  // ("one link from Obama. Both had every act read as a signal.").
  function linksTo(lib, mid, iconId, key, o) {
    var hs = o && o.three && o.three.length ? o.three : three(lib, mid), b = bridge(lib, mid, iconId, key, { three: hs });
    var nm = function (id) { var I = lib.icon[id]; return I ? I.short || I.name : id; };
    if (!b) return { links: 9, hero: null, steps: [], line: 'Not near the three.' };
    if (b.own) return { links: 0, hero: iconId, steps: [], line: 'One of the three.' };
    var st = b.steps, w = why(lib, st[st.length - 1].a, st[st.length - 1].b, st[st.length - 1].tie)[0] || '';
    var line = st.length === 1 ? 'One link from ' + nm(b.hero) + '. ' + w
      : (st.length === 2 ? 'Two links' : st.length + ' links') + ' from ' + nm(b.hero) + ', through ' + st.slice(0, -1).map(function (x) { return nm(x.b); }).join(' and ') + '. ' + w;
    return { links: st.length, hero: b.hero, steps: st, line: line.trim() };
  }

  // ---------- your age, their age ----------
  // Every story in a member's situations, placed at the age its person was then (story year minus birth year),
  // beside the member's own age. Newly promoted leaders measure themselves by age; this ties the member to
  // lives through something true of both. o.three: the member's heroes as the app holds them now.
  function atAge(lib, mid, o) {
    o = o || {}; var m = lib.members[mid]; if (!m || !m.age) return null;
    var keys = (m.sits || []).map(function (c) { return lib.sit[c] && lib.sit[c].key; }).filter(Boolean);
    var hs = o.three && o.three.length ? o.three : three(lib, mid), seen = {}, out = [];
    keys.forEach(function (k) { (lib.byKey[k] || []).forEach(function (sid) {
      if (seen[sid]) return; seen[sid] = 1;
      var s = lib.story[sid], ic = lib.icon[s.icon]; if (!ic || ic.born == null || s.year == null) return;
      var age = s.year - ic.born; if (age < 12 || age > 95) return;
      out.push({ story: s, age: age, hero: hs.indexOf(s.icon) >= 0, gap: Math.abs(age - m.age), sit: lib.sitByKey[s.keys.filter(function (x) { return keys.indexOf(x) >= 0; })[0]].id });
    }); });
    out.sort(function (a, b) { return a.gap - b.gap || b.hero - a.hero || (a.story.id < b.story.id ? -1 : 1); });
    return { member: m, age: m.age, stories: out, near: out.filter(function (x) { return x.gap <= (o.span || 3); }) };
  }

  // ---------- the situation web ----------
  function web(lib) {
    var pairs = {};
    lib.icons.forEach(function (i) {
      if (i.keys.length < 2) return;
      var ids = i.keys.map(function (k) { return lib.sitByKey[k].id; }).sort();
      for (var x = 0; x < ids.length; x++) for (var y = x + 1; y < ids.length; y++) {
        var id = ids[x] + '+' + ids[y]; (pairs[id] = pairs[id] || { a: ids[x], b: ids[y], lives: [] }).lives.push(i.id);
      }
    });
    return Object.keys(pairs).map(function (k) { return pairs[k]; }).sort(function (p, q) { return q.lives.length - p.lives.length || (p.a + p.b < q.a + q.b ? -1 : 1); });
  }

  return { BOTH: BOTH, STANCE: STANCE, FIELD: FIELD, NEAR_YEARS: NEAR_YEARS, both: both, apart: apart, world: world,
    tie: tie, why: why, short: short, graph: graph, kindred: kindred, route: route, routes: routes, bridge: bridge,
    near: near, nearWhy: nearWhy, affinity: affinity, sendable: sendable, web: web, three: three, atAge: atAge, fillSlot: fillSlot, hops: hops, linksTo: linksTo };
}));
