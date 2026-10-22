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
     CLN.checkPlan(lib, o)         -> { members: [{ id, have, left }], picks: [{ story, serves, near, given }] }  the checks to make first
     CLN.moveVectors(lib)          -> { vec, form }                          tf-idf over each story's move and line, cached per lib
     CLN.moveTie(lib, a, b)        -> { w, words } or null                   how far two stories make the same move
     CLN.moveFamilies(lib, key)    -> { fams: [{ members, ties, hub, words, move }], alone }  one situation's stories, by move
     CLN.sameMoveElsewhere(lib, id) -> { story, w, words } or null           the same move in another week, from another life
     CLN.moveWords(lib, a, b)      -> 'The same move: ...' or ''             the shared move as a reason

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
    // the nearest unsettled life comes off a binary heap; equal distances go in the order each life was first
    // reached, which is the order a scan of the reached lives would find them
    var dist = {}, prev = {}, steps = {}, done = {}, seq = {}, n = 0, heap = [];
    var less = function (a, b) { return a.d < b.d || (a.d === b.d && a.s < b.s); };
    var push = function (id) {
      if (seq[id] == null) seq[id] = n++;
      var x = { d: dist[id], s: seq[id], id: id }, i = heap.push(x) - 1;
      while (i > 0) { var j = (i - 1) >> 1; if (!less(x, heap[j])) break; heap[i] = heap[j]; i = j; } heap[i] = x;
    };
    var pop = function () {
      var top = heap[0], last = heap.pop();
      if (heap.length) {
        var i = 0, m = heap.length;
        for (;;) { var l = 2 * i + 1, r = l + 1, k = i; if (l < m && less(heap[l], k === i ? last : heap[k])) k = l; if (r < m && less(heap[r], k === i ? last : heap[k])) k = r; if (k === i) break; heap[i] = heap[k]; i = k; }
        heap[i] = last;
      }
      return top;
    };
    dist[from] = 0; steps[from] = 0; push(from);
    while (heap.length) {
      var top = pop(), u = top.id;
      if (done[u] || top.d !== dist[u]) continue;
      if (u === to) break;
      done[u] = 1;
      if (steps[u] >= max) continue;
      g.adj[u].forEach(function (e) {
        var v = e.id; if (avoid[v] && v !== to) return;
        var c = 1 + 6 / e.t.w + (v === to ? 0 : Math.log(1 + g.deg[v]) / 3) + (o.lastKey && v === to && e.t.shared.indexOf(o.lastKey) < 0 ? 1.5 : 0);
        if (dist[v] == null || dist[u] + c < dist[v] - 1e-9 || (Math.abs(dist[u] + c - dist[v]) < 1e-9 && u < prev[v].a)) { dist[v] = dist[u] + c; prev[v] = { a: u, t: e.t }; steps[v] = steps[u] + 1; push(v); }
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
  // ready: a checked story that carries the week and could go today, ranked the same way, so a slot a check would
  // fill may not need one at all.
  function fillSlot(lib, mid, key, o) {
    o = o || {}; var hs = o.three && o.three.length ? o.three : three(lib, mid), out = [], ok = [], ex = o.exclude || [], av = o.avoidIcons || [];
    (lib.byKey[key] || []).forEach(function (sid) {
      var s = lib.story[sid]; if (!s || !(s.reach === 'near' || s.reach === 'mid') || ex.indexOf(sid) >= 0 || av.indexOf(s.icon) >= 0) return;
      var own = hs.indexOf(s.icon) >= 0, b = own ? null : bridge(lib, mid, s.icon, key, { three: hs });
      (s.verified ? ok : out).push({ story: s, links: own ? 0 : b && b.steps ? b.steps.length : 9, hero: own ? s.icon : b ? b.hero : null, steps: b ? b.steps : [] });
    });
    var rank = function (a, b) { return (b.story.id === o.prefer) - (a.story.id === o.prefer) || a.links - b.links || (a.story.id < b.story.id ? -1 : 1); };
    out.sort(rank); ok.sort(rank);
    return { ready: ok[0] || null, pick: out[0] || null, next: out.slice(1, 3), total: out.length };
  }

  // ---------- the week, quieter or closer ----------
  // A situation's stories in a 3x3: how directly each was met (indirect, measured, direct) against how close it
  // sits to an ordinary office (near, mid, far), with a sentence that says what the grid shows.
  var DIRS = ['indirect', 'calibrated', 'direct'], REACHES = ['near', 'mid', 'far'];
  var DIR_WORDS = { indirect: 'indirect', calibrated: 'measured', direct: 'direct' };
  function grid(lib, key) {
    var all = (lib.byKey[key] || []).map(function (id) { return lib.story[id]; }).filter(Boolean), st = lib.sitByKey[key] || {};
    var cells = REACHES.map(function (r) { return DIRS.map(function (dd) {
      var ids = all.filter(function (s) { return s.reach === r && s.directness === dd; }).sort(function (a, b) { return (b.verified - a.verified) || ((a.year || 0) - (b.year || 0)); }).map(function (s) { return s.id; });
      return { dir: dd, reach: r, n: ids.length, ids: ids };
    }); });
    var near = cells[0], nNear = near.reduce(function (a, c) { return a + c.n; }, 0), dirsNear = near.filter(function (c) { return c.n; });
    var nInd = cells.reduce(function (a, row) { return a + row[0].n; }, 0), unrated = all.filter(function (s) { return !s.directness || REACHES.indexOf(s.reach) < 0; }).length;
    var sentence = 'For ' + (st.id || key) + ', ' + (nNear === 0 ? 'no story sits close to an ordinary office.' : nNear + (nNear === 1 ? ' story sits' : ' stories sit') + ' close to an ordinary office' +
      (dirsNear.length === 1 ? (nNear === 1 ? ', ' : ', all ') + DIR_WORDS[dirsNear[0].dir] + '.' : ': ' + dirsNear.map(function (c) { return c.n + ' ' + DIR_WORDS[c.dir]; }).join(', ') + '.')) +
      (nInd === 0 ? ' None is indirect.' : '');
    return { cells: cells, sentence: sentence, total: all.length, unrated: unrated };
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
  // ("One step from Obama. Both had every act read as a signal.").
  function linksTo(lib, mid, iconId, key, o) {
    var hs = o && o.three && o.three.length ? o.three : three(lib, mid), b = bridge(lib, mid, iconId, key, { three: hs });
    var nm = function (id) { var I = lib.icon[id]; return I ? I.short || I.name : id; };
    if (!b) return { links: 9, hero: null, steps: [], line: 'Not near the three.' };
    if (b.own) return { links: 0, hero: iconId, steps: [], line: 'One of the three.' };
    var st = b.steps, w = why(lib, st[st.length - 1].a, st[st.length - 1].b, st[st.length - 1].tie)[0] || '';
    var NUMW = ['', 'One', 'Two', 'Three', 'Four', 'Five'];
    var line = st.length === 1 ? 'One step from ' + nm(b.hero) + '. ' + w
      : (NUMW[st.length] || st.length) + ' steps from ' + nm(b.hero) + ', through ' + st.slice(0, -1).map(function (x) { return nm(x.b); }).join(' and ') + '. ' + w;
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

  // ---------- the check plan: the fewest checks that give every member enough to send ----------
  // A member needs o.need checked stories (4 by default) in their situations that they have not been sent
  // (o.sent[mid]) and whose life they did not have last week (o.avoid[mid]). The plan picks recall drafts, near
  // or mid reach, greedily: the draft that closes the most gaps first, a gap counting 1.2 when the draft's life
  // is within one link of that member's three. Check one and run it again: the plan shortens.
  function checkPlan(lib, o) {
    o = o || {}; var need = o.need || 4, ids = o.members || Object.keys(lib.members), sent = o.sent || {}, avoid = o.avoid || {}, th = o.three || {};
    var M = ids.filter(function (mid) { return lib.members[mid]; }).map(function (mid) {
      var keys = (lib.members[mid].sits || []).map(function (c) { return lib.sit[c] && lib.sit[c].key; }).filter(Boolean), ex = sent[mid] || [], av = avoid[mid] || [];
      var seen = {}, have = 0, pool = [];
      keys.forEach(function (k) { (lib.byKey[k] || []).forEach(function (sid) {
        var s = lib.story[sid]; if (seen[sid] || !s) return; seen[sid] = 1;
        if (ex.indexOf(sid) >= 0 || av.indexOf(s.icon) >= 0) return;
        if (s.reach !== 'near' && s.reach !== 'mid') return;   // the weekly rule never sends a far story
        if (s.verified) have++; else pool.push(sid);
      }); });
      return { id: mid, have: have, gap: Math.max(0, need - have), pool: pool, near: hops(lib, mid, { max: 1, three: th[mid] }) };
    });
    var byId = {}; M.forEach(function (m) { byId[m.id] = m; });
    var picks = [], used = {};
    // o.first: checks already asked for (this week's), counted before the plan picks its own
    (o.first || []).forEach(function (sid) {
      var s = lib.story[sid]; if (!s || used[sid]) return; used[sid] = 1;
      var serves = M.filter(function (m) { return m.gap > 0 && m.pool.indexOf(sid) >= 0; }).map(function (m) { return m.id; });
      serves.forEach(function (mid) { byId[mid].gap--; });
      picks.push({ story: s, serves: serves, given: true, near: serves.filter(function (mid) { return byId[mid].near[s.icon]; }).map(function (mid) { return { id: mid, links: byId[mid].near[s.icon].links, hero: byId[mid].near[s.icon].hero }; }) });
    });
    for (;;) {
      var score = {}, best = null;
      M.forEach(function (m) { if (m.gap <= 0) return; m.pool.forEach(function (sid) {
        if (used[sid]) return; var x = score[sid] = score[sid] || { w: 0, serves: [] };
        x.w += m.near[lib.story[sid].icon] ? 1.2 : 1; x.serves.push(m.id);
      }); });
      Object.keys(score).sort().forEach(function (sid) { if (!best || score[sid].w > best.w + 1e-9) best = { sid: sid, w: score[sid].w, serves: score[sid].serves }; });
      if (!best) break;
      used[best.sid] = 1;
      var ic = lib.story[best.sid].icon;
      best.serves.forEach(function (mid) { byId[mid].gap--; });
      picks.push({ story: lib.story[best.sid], serves: best.serves,
        near: best.serves.filter(function (mid) { return byId[mid].near[ic]; }).map(function (mid) { return { id: mid, links: byId[mid].near[ic].links, hero: byId[mid].near[ic].hero }; }) });
    }
    return { need: need, members: M.map(function (m) { return { id: m.id, have: m.have, left: Math.max(0, m.gap) }; }), picks: picks };
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

  // ---------- families of moves: stories whose moves meet ----------
  // A story's move is its move_examples, with the setting clause ("In Thursday's review,") and the time it takes
  // ("Two minutes.") cut off, and its line_examples, without "To your team:". Two moves meet on their words:
  // tf-idf over light stems, so "repeat", "repeated" and "repeating" are one word. Out go the stop words, the
  // life's own name, any other name (a capital inside a sentence) and the situation's own words: every E1 story
  // says "read" and "signal", and that is the week, which the page already names.
  // Measured on the corpus at the rules below: 276 ties, and 375 of 563 story slots (67%) in a family; E1 has nine
  // families holding 26 of its 41 stories. The same move in another week needs a cosine of 0.29: stemming lifts every
  // cosine, and at 0.25 it found 227 of 531 stories, most of the extra on chance words ("page", "quarter"). At 0.29, 94.
  var STOPW = {}; ('actually really just rather instead the a an and or of to in on at by for with from as is was were be been being had has have he she his her him ' +
    'they them their it its that this which who whom what when where while after before into over under than then there these those not no but if so up out ' +
    'about one two three four five would could should may might did do does said says told also only more most other some such own same very can will like ' +
    'first last new old years year time made make many much any all each every between during because through against without within whose upon off again ' +
    'still even back down away later early late month months week weeks day days thought people way part place took went came asked gave called began became ' +
    'left got put set get take come know knew want wanted next whether though although around never always already enough something nothing anyone someone ' +
    'everyone everything another himself herself themselves itself nearly almost both either neither once twice six seven eight nine ten twenty thirty forty ' +
    'fifty sixty ninety hundred half too getting member members whole you your yours yourself we our ours us me my mine myself don doesn didn isn won aren ' +
    'let here per minute minutes second seconds hour hours tonight today tomorrow morning afternoon evening monday tuesday wednesday thursday friday').split(' ')
    .forEach(function (w) { STOPW[w] = 1; });
  var SETTING = /^(?:in|at|on|when|whenever|before|after|once|within|during|this|the|tonight|today|tomorrow|with|every|each|next|by|if|as|from|over|until|while|for)\b/i;
  var TAKES = /^(?:under |about |up to )?(?:a|an|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|forty|sixty|ninety|\d+) (?:minutes?|seconds?|hours?)\b/i;
  var MIN_TIE = 0.10, MIN_WORDS = 2, ELSEWHERE = 0.29, SAME_MOVE = 0.2;
  function fold(s) { return String(s == null ? '' : s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  // light stemming: plurals, -ed, -ing, -ly, a doubled last letter and a final e, so the forms of a word meet
  function stem(w) {
    if (w.length <= 3) return w;
    if (/i(?:es|ed)$/.test(w) && w.length > 4) w = w.slice(0, -3) + 'y';
    else if (/eed$/.test(w)) w = w.slice(0, -1);
    else if (/s$/.test(w) && !/(?:ss|us|is)$/.test(w)) w = w.slice(0, -1);
    if (/ing$/.test(w) && w.length > 5) w = w.slice(0, -3);
    else if (/ed$/.test(w) && w.length > 4) w = w.slice(0, -2);
    else if (/ly$/.test(w) && w.length > 5) w = w.slice(0, -2);
    if (/([^aeioulsfz])\1$/.test(w)) w = w.slice(0, -1);
    if (/e$/.test(w) && w.length > 3) w = w.slice(0, -1);
    return w;
  }
  // the action of a move: past its setting clauses, without the time it takes
  function action(m) {
    var ss = String(m || '').trim().split(/(?<=[.?!])\s+/);
    if (ss.length > 1 && TAKES.test(ss[ss.length - 1])) ss.pop();
    var t = ss.join(' ');
    while (SETTING.test(t) && t.indexOf(', ') > 0) t = t.slice(t.indexOf(', ') + 2);
    return t;
  }
  function said(l) { return String(l || '').replace(/^To [^:]{1,80}:\s*/, ''); }
  function plain(text) { return (fold(text).match(/[a-z]+/g) || []).filter(function (w) { return w.length >= 3 && !STOPW[w] && !STOPW[w.replace(/s$/, '')]; }).map(stem); }
  // [stem, word] pairs; a capital inside a sentence is a name (a person, a firm, a city) and stays out
  function toks(text, drop) {
    var out = [];
    String(text || '').replace(/[’']s\b/g, '').split(/(?<=[.?!:;])\s+/).forEach(function (sen) {
      (sen.match(/[A-Za-zÀ-ɏ]+/g) || []).forEach(function (w, i) {
        if (i > 0 && /^[A-ZÀ-Þ]/.test(w)) return;
        w = fold(w); if (w.length < 3 || STOPW[w] || STOPW[w.replace(/s$/, '')]) return;
        var st = stem(w); if (!drop[st]) out.push([st, w]);
      });
    });
    return out;
  }
  function dot(a, b) { var s = 0; for (var k in a) if (b[k]) s += a[k] * b[k]; return s; }
  function common(a, b) { return Object.keys(a).filter(function (k) { return b[k]; }).sort(function (x, y) { return b[y] * a[y] - b[x] * a[x] || (x < y ? -1 : 1); }); }

  var mcache = typeof WeakMap === 'function' ? new WeakMap() : null;
  function moveVectors(lib) {
    var c = mcache ? mcache.get(lib) : lib._mv; if (c) return c;
    var N = lib.stories.length, df = {}, docs = {}, forms = {}, boil = {};
    lib.situations.forEach(function (st) { var b = {}; plain([st.chip, st.line, st.member_line, st.key.replace(/-/g, ' ')].join(' ')).forEach(function (w) { b[w] = 1; }); boil[st.key] = b; });
    lib.stories.forEach(function (s) {
      var drop = {}; plain((lib.icon[s.icon] || {}).name).forEach(function (w) { drop[w] = 1; });
      s.keys.forEach(function (k) { Object.keys(boil[k] || {}).forEach(function (w) { drop[w] = 1; }); });
      var d = [];
      (s.move_examples || []).forEach(function (m) { d = d.concat(toks(action(m), drop)); });
      (s.line_examples || []).forEach(function (l) { d = d.concat(toks(said(l), drop)); });
      docs[s.id] = d.map(function (t) { var f = forms[t[0]] = forms[t[0]] || {}; f[t[1]] = (f[t[1]] || 0) + 1; return t[0]; });
      var seen = {}; docs[s.id].forEach(function (w) { if (!seen[w]) { seen[w] = 1; df[w] = (df[w] || 0) + 1; } });
    });
    var vec = {}, form = {};
    lib.stories.forEach(function (s) {
      var tf = {}, v = {}, n = 0; docs[s.id].forEach(function (w) { tf[w] = (tf[w] || 0) + 1; });
      Object.keys(tf).forEach(function (w) { if (df[w] < 2 || df[w] > N * 0.15) return; v[w] = (1 + Math.log(tf[w])) * Math.log(N / df[w]); n += v[w] * v[w]; });
      n = Math.sqrt(n) || 1; Object.keys(v).forEach(function (w) { v[w] /= n; }); vec[s.id] = v;
    });
    // a stem reads as the form the corpus uses most
    Object.keys(forms).forEach(function (k) { form[k] = Object.keys(forms[k]).sort(function (x, y) { return forms[k][y] - forms[k][x] || x.length - y.length || (x < y ? -1 : 1); })[0]; });
    c = { vec: vec, form: form, df: df, fam: {}, away: {} };
    if (mcache) mcache.set(lib, c); else lib._mv = c;
    return c;
  }
  function sid(x) { return x && typeof x === 'object' ? x.id : x; }
  function moveTie(lib, a, b) {
    a = sid(a); b = sid(b);
    var V = moveVectors(lib), x = V.vec[a], y = V.vec[b]; if (!x || !y || a === b) return null;
    var st = common(x, y); if (!st.length) return null;
    return { w: dot(x, y), words: st.map(function (k) { return V.form[k]; }), stems: st };
  }
  // the move in the corpus's words, one clause: the clause that carries most of the weight in want ({ stem: w })
  function clauses(t) {
    var cs = String(t).replace(/[.?!]+$/, '').split(/,\s+|;\s+|[.?!]\s+|\s+[—–]\s+/)
      .map(function (c) { return c.replace(/^(?:and|then|but|so|or)\s+/i, '').trim(); }).filter(function (c) { return c.split(/\s+/).length >= 3; });
    return cs.length ? cs : [String(t).replace(/[.?!]+$/, '')];
  }
  function moveClause(lib, id, want) {
    var s = lib.story[sid(id)], best = null; if (!s) return null; want = want || {};
    (s.move_examples || []).forEach(function (m) { clauses(action(m)).forEach(function (c) {
      var seen = {}, sc = 0; toks(c, {}).forEach(function (t) { if (want[t[0]] && !seen[t[0]]) { seen[t[0]] = 1; sc += want[t[0]]; } });
      if (!best || sc > best.sc + 1e-12) best = { sc: sc, text: c.charAt(0).toUpperCase() + c.slice(1) };
    }); });
    return best;
  }
  function weights(lib, ties) {
    var V = moveVectors(lib), w = {};
    ties.forEach(function (t) { var x = V.vec[t.a], y = V.vec[t.b]; t.stems.forEach(function (k) { w[k] = (w[k] || 0) + x[k] * y[k]; }); });
    return w;
  }
  function byYearId(lib) { return function (a, b) { var x = lib.story[a], y = lib.story[b]; return (x.year == null ? 1e9 : x.year) - (y.year == null ? 1e9 : y.year) || (a < b ? -1 : 1); }; }

  // Within one situation: each story's two nearest moves from other lives. A tie needs the two to choose each other,
  // a cosine of 0.10 and two shared words at least; a family is what the ties join. The hub has the most ties.
  function moveFamilies(lib, key) {
    var V = moveVectors(lib); if (V.fam[key]) return V.fam[key];
    var ids = (lib.byKey[key] || []).filter(function (id) { return lib.story[id]; }), top = {}, yr = byYearId(lib);
    ids.forEach(function (a) {
      top[a] = ids.filter(function (b) { return b !== a && lib.story[b].icon !== lib.story[a].icon; })
        .map(function (b) { return { id: b, w: dot(V.vec[a], V.vec[b]) }; })
        .sort(function (p, q) { return q.w - p.w || (p.id < q.id ? -1 : 1); }).slice(0, 2).map(function (x) { return x.id; });
    });
    var ties = [], up = {};
    ids.forEach(function (a) { up[a] = a; top[a].forEach(function (b) {
      if (a > b || top[b].indexOf(a) < 0) return;
      var t = moveTie(lib, a, b); if (!t || t.w < MIN_TIE || t.words.length < MIN_WORDS) return;
      var p = yr(a, b) <= 0 ? [a, b] : [b, a];
      ties.push({ a: p[0], b: p[1], w: t.w, words: t.words, stems: t.stems });
    }); });
    var find = function (x) { while (up[x] !== x) { up[x] = up[up[x]]; x = up[x]; } return x; };
    ties.forEach(function (t) { up[find(t.a)] = find(t.b); });
    var comp = {}; ids.forEach(function (id) { (comp[find(id)] = comp[find(id)] || []).push(id); });
    var fams = [], alone = [];
    Object.keys(comp).forEach(function (r) {
      var mem = comp[r].sort(yr); if (mem.length < 2) { alone.push(mem[0]); return; }
      var T = ties.filter(function (t) { return mem.indexOf(t.a) >= 0; }).sort(function (p, q) { return q.w - p.w || yr(p.a, q.a); });
      var deg = {}, str = {}; T.forEach(function (t) { [t.a, t.b].forEach(function (x) { deg[x] = (deg[x] || 0) + 1; str[x] = (str[x] || 0) + t.w; }); });
      var hub = mem.slice().sort(function (p, q) { return deg[q] - deg[p] || str[q] - str[p] || yr(p, q); })[0];
      var w = weights(lib, T), st = Object.keys(w).sort(function (p, q) { return w[q] - w[p] || (p < q ? -1 : 1); });
      var mv = moveClause(lib, hub, w);
      fams.push({ members: mem, ties: T, hub: hub, words: st.slice(0, 3).map(function (k) { return V.form[k]; }), move: mv ? mv.text : '' });
    });
    fams.sort(function (p, q) { return q.members.length - p.members.length || yr(p.members[0], q.members[0]); });
    return (V.fam[key] = { fams: fams, alone: alone.sort(yr) });
  }
  // The same move in another week: the nearest move in the corpus from a story that shares no situation and no life.
  function sameMoveElsewhere(lib, id) {
    id = sid(id); var V = moveVectors(lib); if (Object.prototype.hasOwnProperty.call(V.away, id)) return V.away[id];
    var s = lib.story[id], x = V.vec[id], best = null; if (!s || !x) return null;
    lib.stories.forEach(function (o) {
      if (o.icon === s.icon || o.keys.some(function (k) { return s.keys.indexOf(k) >= 0; })) return;
      var y = V.vec[o.id], w = dot(x, y); if (w < ELSEWHERE || (best && (w < best.w - 1e-12 || (Math.abs(w - best.w) < 1e-12 && o.id > best.id)))) return;
      if (common(x, y).length >= MIN_WORDS) best = { id: o.id, w: w };
    });
    var t = best && moveTie(lib, id, best.id);
    return (V.away[id] = t ? { story: lib.story[best.id], w: t.w, words: t.words } : null);
  }
  // A reason in a sentence: "The same move: write the one sentence you want repeated in the corridor afterwards".
  // The move is the hub's when the two share a family, else whichever of the two says the shared words most.
  function moveWords(lib, a, b) {
    a = sid(a); b = sid(b);
    var t = moveTie(lib, a, b); if (!t || t.w < SAME_MOVE || t.words.length < MIN_WORDS) return '';
    var A = lib.story[a], B = lib.story[b], side = null, V = moveVectors(lib), want = {};
    t.stems.forEach(function (k) { want[k] = V.vec[a][k] * V.vec[b][k]; });
    A.keys.forEach(function (k) { if (side || B.keys.indexOf(k) < 0) return; moveFamilies(lib, k).fams.forEach(function (f) {
      if (!side && (f.hub === a || f.hub === b) && f.members.indexOf(a) >= 0 && f.members.indexOf(b) >= 0) side = f.hub;
    }); });
    var ca = moveClause(lib, a, want), cb = moveClause(lib, b, want);
    var c = side === a ? ca : side === b ? cb : cb && (!ca || cb.sc > ca.sc + 1e-12) ? cb : ca;
    return c && c.sc > 0 ? 'The same move: ' + c.text.charAt(0).toLowerCase() + c.text.slice(1) : '';
  }

  return { BOTH: BOTH, STANCE: STANCE, FIELD: FIELD, NEAR_YEARS: NEAR_YEARS, both: both, apart: apart, world: world,
    tie: tie, why: why, short: short, graph: graph, kindred: kindred, route: route, routes: routes, bridge: bridge,
    near: near, nearWhy: nearWhy, affinity: affinity, sendable: sendable, web: web, three: three, atAge: atAge, fillSlot: fillSlot, hops: hops, linksTo: linksTo, grid: grid, checkPlan: checkPlan,
    moveVectors: moveVectors, moveTie: moveTie, moveFamilies: moveFamilies, sameMoveElsewhere: sameMoveElsewhere, moveWords: moveWords, moveClause: moveClause, stem: stem };
}));
