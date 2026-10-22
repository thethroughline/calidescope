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
     CLN.checkPlan(lib, o)         -> { members: [{ id, have, left, later }], picks: [{ story, serves, near, given }], alts }  the checks to make first
     CLN.fitFor(lib, mid, o)       -> [{ story, score, terms, links, hero, key, why }]  what next for one member, ranked
     CLN.nextFor(lib, mid, o)      -> { ready, pick, next, total }               one answer per member and week
     CLN.sourceOk(s)               -> true when the source names a work a coach can check it against
     CLN.fitLine(lib, mid, hero, o) -> 'Michelle Obama has a checked story for one of your weeks: …'  a hero's fit, from their stories
     CLN.firstWeekGap(lib, mid, o) -> [{ sit, key, first, picks }]          the first weeks no checked story fills, and the checks
     CLN.moveVectors(lib)          -> { vec, form, clauses }                 tf-idf over each story's move and line, cached per lib
     CLN.sitVectors(lib, key)      -> { ids, vec, df, n }                    the same, weighed within one situation
     CLN.moveTie(lib, a, b)        -> { w, words } or null                   how far two stories make the same move
     CLN.coLocated(lib, a, b, o)   -> { a, b, words } or null                the clause pair in which two stories make it
     CLN.moveFamilies(lib, key)    -> { fams: [{ members, ties, hub, words, move, rows }], alone }  one situation's stories, by move
     CLN.sameMoveElsewhere(lib, id) -> { story, w, words, pair } or null     the same move in another week, from another life
     CLN.moveWords(lib, a, b)      -> 'The same move. A: ... B: ...' or ''   the shared move as a reason, in both clauses

   A tie needs one shared situation (the predicament) and one more reason: the same way of leading,
   within 15 years, or the same domain. Two shared situations make a tie on their own. Measured on the
   corpus: a shared situation alone gives each life a median of 35 neighbours (too many to mean anything);
   this rule gives a median of 19, and no life is left with none. A way of leading is a reading a coach
   has yet to rule on for every life: until both lives' are ruled it weighs half, and is said as a "may". */
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
  function ruled(X) { return !!X.stanceStatus && X.stanceStatus !== 'proposed'; }
  // the way of leading two lives share, as fact once a coach has ruled on both, as a reading until then
  function stanceLine(A, B) { return ruled(A) && ruled(B) ? 'Both ' + STANCE[A.stance] + '.' : 'Both may ' + STANCE[A.stance] + '. A coach has yet to rule on this.'; }
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
    // a way of leading not yet ruled on is a reading: it never makes the one more reason a tie needs on its own
    if (shared.length < 2 && !r.some(function (x) { return x !== 'stance' || (ruled(A) && ruled(B)); })) return null;
    var w = shared.length * 3 + (r.indexOf('stance') >= 0 ? (ruled(A) && ruled(B) ? 2 : 1) : 0) + (r.indexOf('time') >= 0 ? 1 : 0) + (r.indexOf('domain') >= 0 ? 1.5 : r.indexOf('field') >= 0 ? 0.75 : 0);
    return { shared: shared, reasons: r, dy: dy, w: w };
  }

  // Sentences. The situation first, then the way of leading, then the world, then the years; a way of leading not
  // yet ruled on comes last, as the reading it is.
  function why(lib, A, B, t) {
    if (typeof A === 'string') A = lib.icon[A]; if (typeof B === 'string') B = lib.icon[B];
    t = t || tie(lib, A, B); if (!t) return [];
    var out = t.shared.map(function (k) { return 'Both ' + both(k) + '.'; }), st = t.reasons.indexOf('stance') >= 0 ? stanceLine(A, B) : '';
    if (st && ruled(A) && ruled(B)) { out.push(st); st = ''; }
    if (t.reasons.indexOf('domain') >= 0) out.push(world(A));
    else if (t.reasons.indexOf('field') >= 0) out.push('Both in ' + FIELD[A.field] + '.');
    if (t.dy != null) out.push(apart(t.dy));
    if (st) out.push(st);
    return out;
  }
  // one to nine in words, as every surface says them ("Two years apart.", "21 years apart."). APART, further down, is
  // another list: the pairs of stories read by hand as two moves
  var YEARS_APART = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  function apart(dy) { return dy === 0 ? 'The same year.' : (YEARS_APART[dy] || dy) + (dy === 1 ? ' year' : ' years') + ' apart.'; }
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
  // Tables built from an index are kept on the index (not enumerable, so it still prints as data): a Library frame inside
  // the app reads the app's own index, and finds them built
  function keep(lib, k, v) { try { Object.defineProperty(lib, k, { value: v, configurable: true, writable: true, enumerable: false }); } catch (e) { lib[k] = v; } return v; }
  function graph(lib) {
    if (lib._graph) return lib._graph;
    var lives = lib.icons.filter(function (i) { return i.stories.length; }), adj = {};
    lives.forEach(function (i) { adj[i.id] = []; });
    for (var a = 0; a < lives.length; a++) for (var b = a + 1; b < lives.length; b++) {
      var t = tie(lib, lives[a], lives[b]); if (!t) continue;
      adj[lives[a].id].push({ id: lives[b].id, t: t }); adj[lives[b].id].push({ id: lives[a].id, t: t });
    }
    var g = { lives: lives, adj: adj, deg: {} };
    Object.keys(adj).forEach(function (k) { g.deg[k] = adj[k].length; });
    return keep(lib, '_graph', g);
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
  // Each answer is kept on the index, by member, life, week and three: the Review, Find and send and a story's
  // next asks the same chain on every render. CLC.applyVerification and a check made in the app clear it.
  function bridge(lib, mid, iconId, key, o) {
    var hs = o && o.three && o.three.length ? o.three : three(lib, mid);
    if (hs.indexOf(iconId) >= 0) return { hero: iconId, steps: [], own: true };
    var memo = lib._bridge || (lib._bridge = new Map()), mk = mid + '|' + iconId + '|' + key + '|' + hs.join('/');
    if (memo.has(mk)) return memo.get(mk);
    var best = null;
    hs.forEach(function (h) {
      var r = route(lib, h, iconId, { max: 3, lastKey: key }); if (!r) return;
      if (!best || r.cost < best.steps.cost) best = { hero: h, steps: r };
    });
    memo.set(mk, best);
    return best;
  }

  // ---------- a member's neighbourhood ----------
  // How close a life sits to the member's three: the strongest tie to any of them, or, where they share
  // no situation, the same way of leading, the same domain and nearness in time.
  function affinity(lib, X, H) {
    var t = tie(lib, X, H); if (t) return { w: t.w, t: t };
    var w = 0, r = [];
    if (X.stance && X.stance === H.stance) { w += ruled(X) && ruled(H) ? 2 : 1; r.push('stance'); }
    if (X.domain === H.domain) { w += 1.5; r.push('domain'); } else if (X.field === H.field) { w += 0.75; r.push('field'); }
    var dy = X.year == null || H.year == null ? null : Math.abs(X.year - H.year);
    if (dy != null && dy <= NEAR_YEARS) { w += 1; r.push('time'); }
    return { w: w, t: { shared: [], reasons: r, dy: dy, w: w } };
  }
  // what makes a life close to a hero is something the record holds: a situation, the same world or field, or years within
  // fifteen; a way of leading counts only once a coach has ruled on it for both
  function heldIn(lib, a, X, H) { return a.t.shared.length || a.t.reasons.some(function (x) { return x !== 'stance' || (ruled(X) && ruled(H)); }); }
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
      H.forEach(function (h) { if (h.id === i.id) return; var a = affinity(lib, i, h); if (a.w > best.w && heldIn(lib, a, i, h)) best = { w: a.w, h: h.id, t: a.t }; });
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
        // a stand-in has to share something the record holds with the hero (heldIn), and weigh three at least
        if (c && c.a.w >= 3 && heldIn(lib, c.a, lib.icon[c.id], h)) standIns.push({ hero: h.id, key: k, id: c.id, a: c.a });
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
    var out = [], st = a.t.reasons.indexOf('stance') >= 0 ? stanceLine(X, H) : '';
    if (st && ruled(X) && ruled(H)) { out.push(st); st = ''; }
    if (a.t.reasons.indexOf('domain') >= 0) out.push(world(X));
    else if (a.t.reasons.indexOf('field') >= 0) out.push('Both in ' + FIELD[X.field] + '.');
    if (a.t.dy != null) out.push(apart(a.t.dy));
    if (st) out.push(st);
    return out;
  }

  // ---------- one check fills this slot ----------
  // For a week with no checked story: the recall drafts in its situation that are near enough to send, ranked
  // by how close their life is to the member's three (one of the three, then one link, then two), then by id.
  // o.three: the heroes as the app holds them now; o.prefer: a draft already paired with the week, which comes first.
  // ready: a checked story that carries the week and could go today, ranked the same way, so a slot a check would
  // fill may not need one at all.
  // A draft whose source names no work (sourceOk) is no check at all, and is left out.
  function fillSlot(lib, mid, key, o) {
    o = o || {}; var hs = o.three && o.three.length ? o.three : three(lib, mid), out = [], ok = [], ex = o.exclude || [], av = o.avoidIcons || [];
    (lib.byKey[key] || []).forEach(function (sid) {
      var s = lib.story[sid]; if (!s || !(s.reach === 'near' || s.reach === 'mid') || ex.indexOf(sid) >= 0 || av.indexOf(s.icon) >= 0) return;
      if (!s.verified && !sourceOk(s)) return;
      var own = hs.indexOf(s.icon) >= 0, b = own ? null : bridge(lib, mid, s.icon, key, { three: hs });
      (s.verified ? ok : out).push({ story: s, links: own ? 0 : b && b.steps ? b.steps.length : 9, hero: own ? s.icon : b ? b.hero : null, steps: b ? b.steps : [] });
    });
    var rank = function (a, b) { return (b.story.id === o.prefer) - (a.story.id === o.prefer) || a.links - b.links || (a.story.id < b.story.id ? -1 : 1); };
    out.sort(rank); ok.sort(rank);
    return { ready: ok[0] || null, pick: out[0] || null, next: out.slice(1, 3), total: out.length };
  }

  // ---------- a source a coach can check ----------
  // A draft can be checked only against something with a name: a title with its author, a publisher or a bracketed
  // year; a web address; or an interview, an oral history, an archive, a transcript, a letter or a memoir (and their
  // kin: testimony, a memorandum, a catalogue, a recording). The corpus's "Corpus draft." goes first, and so does
  // every clause that tells a coach what to check, though "Verify against White, Catch a Fire (1983)" keeps its book.
  // A dated address, speech, remarks, statement, lecture or sermon is a work too: it was given once, and its text can be
  // found. Measured on the corpus: 4 of 531 sources name no work, among them the WTA's founding at the Gloucester Hotel
  // ("Verify the numbers") and Ali's press conference in Miami Beach.
  var SRC_NOTE = /\b(?:verify|verified|check|checked)\b/i, SRC_PLACE = /\b(?:University|College|School|Institute|Hotel|Stadium|Centre|Center|Hall|House|Palace|Theatre|Beach)\b/;
  var SRC_NAME = "(?:[A-Z][\\w’'.-]*|de|van|von|der|bin|al|da|le|la)";
  var SRC_WORK = [
    /\([^()]*\b\d{4}\b[^()]*\)/,                                                   // a bracketed year: "Remnick, The Bridge (2010)"
    /https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|org|gov|edu|net|int|uk)\b/i,           // a web address
    /\binterview|\boral[- ]histor|\barchive|\btranscri|\bletters?\b|\bmemoir|\bautobiograph|\bdiary\b|\brecording\b|\btestimony\b|\bmemorand|\bcatalogue\b|\bfacsimile\b|\bas told to\b|\bpp\.\s*\d/i,
    new RegExp('^[A-Z][\\w’\'.-]+(?:\\s+' + SRC_NAME + '){1,4},\\s+[“‘\'"A-Z0-9]'),   // an author, then a title
    /\b(?:by|directed by|edited by|ed\.)\s+[A-Z][\w’'.-]+\s+[A-Z]|[“‘][^”’]{4,}[”’]|\bin [A-Z][\w’'.-]+ [A-Z][\w’'.-]+, [A-Z]/,
    /\b(?:published|printed|quoted|reproduced|reprinted)\b|\btext (?:at|in)\b/i,
    /\b(?:address|speech|remarks|statement|lecture|sermon)\b[^;]*\b(?:1\d{3}|20\d{2})\b/i,      // a dated address, speech, remarks or statement
    /\b[A-Z][\w&’'.-]* (?:Press|Books|Publishing|Publishers)\b|\b(?:Penguin|Knopf|Viking|HarperCollins|Times|Post|Journal|Review|Magazine|News|Herald|Guardian|Gazette|Tribune|Quarterly|Monthly|Bulletin|Register|Observer|Telegraph|Economist|New Yorker|Variety|Vogue|Rolling Stone|TIME|TED\w*|BBC|CNN|NPR|ABC|CBS|NBC|ESPN|C-SPAN|Reuters|Associated Press|Hansard|Public Papers|Nature|Science|Netflix|YouTube|Instagram|Twitter|Facebook|IndieWire|Refinery29)\b/
  ];
  // a title, then its author and the year ("Thrive, Arianna Huffington, 2014"), where the name is no building
  var SRC_BYLINE = /,\s+([A-Z][\w’'.-]+(?:\s+[A-Z][\w’'.-]+){1,3}),\s+\d{4}\b/g;
  var srcMemo = {};
  function sourceOk(s) {
    var src = String((s && s.source) || ''), k = (s && s.id) + '|' + src; if (k in srcMemo) return srcMemo[k];
    var t = src.replace(/^corpus draft\.\s*/i, '').split(/(?<=[.?!])\s+(?=[A-Z])|;\s*/).map(function (x) {
      return x.trim().replace(/^(?:verify|check)\s+against\s+/i, '').replace(/\s*\([^()]*\b(?:verify|check|confirm)[^()]*\)/gi, '');
    }).filter(function (x) { return x && !SRC_NOTE.test(x); }).join('; '), m, by = false;
    SRC_BYLINE.lastIndex = 0;
    while (!by && (m = SRC_BYLINE.exec(t))) by = !SRC_PLACE.test(m[1]);
    return (srcMemo[k] = by || SRC_WORK.some(function (re) { return re.test(t); }));
  }

  // ---------- what next, for one member ----------
  // One ranker for "what next": While you wait on This week, the Next under a story, and inside one week (nextFor)
  // the Review's line. Every story that carries one of the member's situations (o.keys, the week's first) scores 8 if
  // checked; 4 from one of their three; 3 from their reserve or a hero they added; 2 a link from the three, 1 two
  // links; 1.5 from a world the member follows (INT_FIELDS); 1 when its person was within four years of the member's
  // age then, counted only where the year holds (the story is checked, or its dateline gives that year alone). Ties go
  // by id. Out goes what they have had or declined, and any life they had in the last fortnight (o.exclude,
  // o.avoidIcons). The reason is the strongest term after the check, with the week it fits, the first of o.keys the
  // story carries: "From your fourth hero, for a week when everything you do gets read as a signal."
  var INT_FIELDS = { Creators: ['influencer', 'media'], Sport: ['sport'], 'Film & TV': ['film', 'entertainment', 'television'], Music: ['music'] };
  var INT_WORDS = { Creators: 'creators', Sport: 'sport', 'Film & TV': 'film and television', Music: 'music' };
  // "for a week when ...": each situation as the week a member is in
  var WHEN = {
    'unnamed-expectations': 'nobody told you what the job asks',
    'renegotiating-standing': 'you are the boss of people who were your peers',
    'naming-an-unseen-problem': 'you have to name a problem nobody sees',
    'following-a-legend': 'you follow someone the room loved',
    'judging-unfamiliar-work': 'you answer for work you can’t judge',
    'credit-and-attribution': 'your work needs your name on it',
    'style-against-expectation': 'you lead in a style nobody expected',
    'contradictory-feedback': 'you were told one thing, then another',
    'unclassifiable-profile': 'people find you hard to place',
    'saying-it-in-your-own-words': 'you have to say it in your own words',
    'expertise-without-pull': 'you have to be heard in a room that decides',
    'selling-what-you-used-to-make': 'you sell what you used to make',
    'borrowed-versus-owned-standing': 'you stand in your own name',
    'coalition-without-mandate': 'the decision gets made before the meeting',
    'leading-beyond-line-of-sight': 'you lead more people than you can see',
    'developing-without-a-bench': 'you grow people with no bench behind you',
    'stopping-the-old-work': 'you stop work people are proud of',
    'carrying-somebody-elses-decision': 'you carry a decision you didn’t make',
    'every-act-is-a-message': 'everything you do gets read as a signal',
    'agreeing-and-not-moving': 'everyone agrees, and nothing moves',
    'the-loss-inside-the-promotion': 'you lose what you were best at',
    'competent-and-becalmed': 'you are good at it, and becalmed'
  };
  function when(key) { return WHEN[key] ? 'for a week when ' + WHEN[key] : ''; }
  // the year holds when the dateline names it and nothing else ("Houston, September 1973"); "late 1950s", "c. 1976"
  // and "1975-76" do not pin a year, and nor does a dateline whose own year words disagreed (CLC.oneYear's yearClash)
  function yearAgrees(s) {
    var p = String((s && s.place) || ''), ys = p.match(/\b\d{3,4}s?\b/g) || [];
    if (s.year == null || s.yearClash || !ys.length || /\bc\.\s*\d|\d{3,4}\s*(?:[-–]|to|and)\s*\d/.test(p)) return false;
    return ys.every(function (y) { return +y === s.year; });
  }
  var FIT_ORDER = ['three', 'reserve', 'added', 'link', 'interest', 'age', 'link2'];
  var YEARS = ['', 'a year', 'two years', 'three years', 'four years'];
  function memberKeys(lib, M) {
    var up = M.up19 && lib.sit[M.up19.sit] ? [M.up19.sit] : [];
    return up.concat(M.sits || []).map(function (c) { return lib.sit[c] && lib.sit[c].key; }).filter(function (k, i, a) { return k && a.indexOf(k) === i; });
  }
  function fitWhy(lib, M, x, now) {
    var nm = function (id) { var J = lib.icon[id]; return J ? J.short || J.name : id; }, s = x.story;
    var t = x.terms.filter(function (y) { return y.k !== 'checked'; }).sort(function (a, b) { return b.w - a.w || FIT_ORDER.indexOf(a.k) - FIT_ORDER.indexOf(b.k); })[0];
    var gap = t && t.k === 'age' ? t.a - M.age : 0;
    var lead = !t ? '' : t.k === 'three' ? 'From ' + nm(s.icon) + ', one of your three' : t.k === 'reserve' ? 'From ' + nm(s.icon) + ', your reserve'
      : t.k === 'added' ? 'From ' + nm(s.icon) + ', a hero you added' : t.k === 'link' ? 'One step from ' + nm(x.hero)
      : t.k === 'interest' ? 'From ' + INT_WORDS[t.n] + ', one of your interests'
      : t.k === 'age' ? nm(s.icon) + ' was ' + (t.a - 1) + ' or ' + t.a + ' then, ' + (gap === 0 ? 'about your age' : 'about ' + YEARS[Math.abs(gap)] + (gap < 0 ? ' younger' : ' older') + ' than you are')
      : 'Two steps from your three';
    // the week it fits: this week, another of theirs (o.now, the week it is now, when known), or a week when ...
    var w = now && x.key && WHEN[x.key] ? (x.key === now ? 'for this week: ' : 'for another of your weeks: ') + WHEN[x.key] : when(x.key);
    return lead ? lead + (w ? ', ' + w : '') + '.' : w ? w.charAt(0).toUpperCase() + w.slice(1) + '.' : '';
  }
  // o.three, o.reserve, o.extended: the heroes as the app holds them now; o.keys: the situations, in order (the week's
  // first); o.near: close enough to send only; o.sourced: a draft only with a source a coach can check; o.checked or
  // o.drafts: one kind only; o.n: how many
  function fitFor(lib, mid, o) {
    o = o || {}; var M = lib.members[mid]; if (!M) return [];
    var hs = o.three && o.three.length ? o.three : three(lib, mid), hi = M.heroes_icons || {}, res = o.reserve !== undefined ? o.reserve : hi.reserve || null, add = o.extended || [];
    var keys = (o.keys && o.keys.length ? o.keys : memberKeys(lib, M)).filter(function (k, i, a) { return lib.sitByKey[k] && a.indexOf(k) === i; });
    var ex = {}, av = {}; (o.exclude || []).forEach(function (x) { ex[x] = 1; }); (o.avoidIcons || []).forEach(function (x) { av[x] = 1; });
    var H = hops(lib, mid, { three: hs, max: 2 }), age = o.age !== undefined ? o.age : M.age, doms = {}, seen = {}, out = [];
    (o.ints || M.ints || []).forEach(function (n) { (INT_FIELDS[n] || []).forEach(function (dm) { if (!doms[dm]) doms[dm] = n; }); });
    keys.forEach(function (k) { (lib.byKey[k] || []).forEach(function (sid) {
      if (seen[sid]) return; seen[sid] = 1;
      var s = lib.story[sid], I = s && lib.icon[s.icon]; if (!I || ex[sid] || av[s.icon]) return;
      if ((o.near && s.reach !== 'near' && s.reach !== 'mid') || (o.checked && !s.verified) || (o.drafts && s.verified) || (o.sourced && !s.verified && !sourceOk(s))) return;
      var h = H[s.icon], links = h ? h.links : 9, t = [], a = I.born != null && s.year != null ? s.year - I.born : null;
      if (s.verified) t.push({ k: 'checked', w: 8 });
      if (links === 0) t.push({ k: 'three', w: 4 });
      if (s.icon === res || add.indexOf(s.icon) >= 0) t.push({ k: s.icon === res ? 'reserve' : 'added', w: 3 });
      if (links === 1) t.push({ k: 'link', w: 2 }); else if (links === 2) t.push({ k: 'link2', w: 1 });
      if (doms[I.domain]) t.push({ k: 'interest', w: 1.5, n: doms[I.domain] });
      if (age && a != null && Math.abs(a - age) <= 4 && (s.verified || yearAgrees(s))) t.push({ k: 'age', w: 1, a: a });
      out.push({ story: s, score: t.reduce(function (n, y) { return n + y.w; }, 0), terms: t, links: links, hero: h ? h.hero : null, key: keys.filter(function (x) { return s.keys.indexOf(x) >= 0; })[0] });
    }); });
    out.sort(function (x, y) { return y.score - x.score || (x.story.id < y.story.id ? -1 : 1); });
    if (o.n) out = out.slice(0, o.n);
    out.forEach(function (x) { x.why = fitWhy(lib, M, x, o.now); });
    return out;
  }

  // ---------- one answer per member and week ----------
  // The story for a member's week, said once and read by every surface that offers one: the Review's line (ready, and
  // the one check), its Details, the Ask reply and the plan. fillSlot's candidates (the week's situation, close enough to
  // send, a draft only with a source a coach can check, nothing the member has, no life from the last fortnight),
  // ranked by fitFor. o.going: what already goes to them this week (the Review's slot, anything sent or answered), which
  // no surface offers again; o.prefer: a draft already chosen for the week comes first among the drafts. Each answer
  // carries its chain from the three, as fillSlot's do (links, hero, steps).
  function nextFor(lib, mid, o) {
    o = o || {}; var key = lib.sit[o.key] ? lib.sit[o.key].key : o.key, hs = o.three && o.three.length ? o.three : three(lib, mid);
    var all = fitFor(lib, mid, { keys: [key], three: hs, reserve: o.reserve, extended: o.extended, ints: o.ints, age: o.age, exclude: (o.exclude || []).concat(o.going || []), avoidIcons: o.avoid || o.avoidIcons || [], near: true, sourced: true });
    var ok = all.filter(function (x) { return x.story.verified; }), dr = all.filter(function (x) { return !x.story.verified; });
    if (o.prefer) dr.sort(function (a, b) { return (b.story.id === o.prefer) - (a.story.id === o.prefer); });
    var chain = function (x) {
      if (!x || x.steps) return x || null;
      var b = x.links === 0 ? null : bridge(lib, mid, x.story.icon, key, { three: hs });
      if (b && b.steps) { x.links = b.steps.length; x.hero = b.hero; x.steps = b.steps; } else x.steps = [];
      return x;
    };
    return { ready: chain(ok[0]), pick: chain(dr[0]), next: dr.slice(1, 3).map(chain), total: dr.length, checked: ok.length };
  }

  // ---------- a hero's fit, from the stories they have ----------
  // The fit check's line for a hero, said from what the library holds for them in the member's situations: a checked
  // story for one of their weeks ("Michelle Obama has a checked story for one of your weeks: everything you do gets read
  // as a signal."), a recall draft for one, stories about other kinds of week, or none yet; and with none, the truth about
  // who stands in for them (nobody tied to them in the library means the coach chooses by hand). o.coach: the coach's
  // first name. heroId may be the prototype's id ("michelle") or the library's.
  function fitLine(lib, mid, heroId, o) {
    o = o || {}; var M = lib.members[mid] || {}, id = lib.icon[heroId] ? heroId : (lib.idmap || {})[heroId] || heroId, I = lib.icon[id]; if (!I) return '';
    var co = o.coach || 'your coach', nm = I.name, mine = (M.sits || []).map(function (c) { return lib.sit[c]; }).filter(Boolean);
    var all = (lib.byIcon[id] || []).map(function (x) { return lib.story[x]; }).filter(Boolean);
    var weeks = function (pick) { return mine.filter(function (st) { return all.some(function (s) { return pick(s) && s.keys.indexOf(st.key) >= 0; }); }); };
    var say = function (ws) { var w = ws.map(function (st) { return WHEN[st.key] || st.chip.toLowerCase(); }); return w.length <= 1 ? w.join('') : w.slice(0, -1).join(', ') + ' and ' + w[w.length - 1]; };
    var NW = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'], ok = weeks(function (s) { return s.verified; }), dr = weeks(function (s) { return !s.verified; });
    if (ok.length) return nm + (ok.length === 1 ? ' has a checked story for one of your weeks: ' : ' has checked stories for ' + NW[ok.length] + ' of your weeks: ') + say(ok) + '.';
    if (dr.length) return nm + (dr.length === 1 ? ' has a story for one of your weeks: ' : ' has stories for ' + NW[dr.length] + ' of your weeks: ') + say(dr) + '. ' + (dr.length === 1 ? 'It is a recall draft' : 'They are recall drafts') + ', waiting for ' + co + '’s check.';
    if (all.length) return nm + (all.length === 1 ? '’s one story is about another kind of week.' : '’s ' + (NW[all.length] || all.length) + ' stories are about other kinds of week.');
    return 'No story from ' + nm + ' yet. ' + (kindred(lib, id, 1).length ? 'When none fits your week, ' + co + ' sends one from someone close to ' + nm + '.' : 'Nobody in the library is tied to ' + nm + ', so ' + co + ' chooses your stories by hand.');
  }

  // ---------- the first week, before Move 1 is published ----------
  // The member's first fortnight, guaranteed at the moment the coach publishes: each situation of the move (o.sit) and of
  // the next meeting (up19), counted once, that no checked story could fill (fillSlot's ready), with the three drafts
  // whose check fills it: fitFor inside the week, close enough to send, with a source a coach can check. o.prefer, the
  // draft the week already holds, comes first. Each pick says why, for the coach: "Close to Reshma Saujani, by Bret’s
  // choice" (o.closeTo, o.coach), "One of Maya’s interests: Creators", "One step from Simone Biles".
  function firstWeekGap(lib, mid, o) {
    o = o || {}; var M = lib.members[mid]; if (!M) return [];
    var first = M.first, poss = first + '’s', nm = function (x) { var J = lib.icon[x]; return J ? J.name : x; }, seen = {};
    return [o.sit || (M.mv && M.mv.sit), M.up19 && M.up19.sit].filter(function (c) { var k = lib.sit[c] && lib.sit[c].key; if (!k || seen[k]) return false; seen[k] = 1; return true; }).map(function (c, i) {
      var key = lib.sit[c].key, f = fillSlot(lib, mid, key, { three: o.three, exclude: o.exclude, avoidIcons: o.avoidIcons });
      if (f.ready) return null;
      var picks = fitFor(lib, mid, { keys: [key], three: o.three, reserve: o.reserve, extended: o.extended, ints: o.ints, age: o.age, exclude: o.exclude, avoidIcons: o.avoidIcons, near: true, drafts: true, sourced: true });
      if (o.prefer) picks.sort(function (a, b) { return (b.story.id === o.prefer) - (a.story.id === o.prefer); });
      return { sit: c, key: key, first: i === 0, picks: picks.slice(0, 3).map(function (x) {
        var t = x.terms.slice().sort(function (a, b) { return b.w - a.w || FIT_ORDER.indexOf(a.k) - FIT_ORDER.indexOf(b.k); })[0];
        x.reason = x.story.id === o.prefer ? (o.closeTo ? 'Close to ' + nm(o.closeTo) + ', by ' + (o.coach || 'the coach') + '’s choice' : 'Chosen by ' + (o.coach || 'the coach') + ' for the week')
          : !t ? 'It carries the week'
          : t.k === 'three' ? 'One of ' + poss + ' three' : t.k === 'reserve' ? poss + ' fourth hero' : t.k === 'added' ? 'A hero ' + first + ' added'
          : t.k === 'link' ? 'One step from ' + nm(x.hero) : t.k === 'interest' ? 'One of ' + poss + ' interests: ' + t.n
          : t.k === 'age' ? nm(x.story.icon) + ' was ' + (t.a - 1) + ' or ' + t.a + ' then, near ' + poss + ' age' : 'Two steps from ' + poss + ' three';
        return x;
      }) };
    }).filter(Boolean);
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
  // linksTo: how one life reaches the member, in words: the chain bridge() finds, and one line for it ("One step from
  // Obama. Both had every act read as a signal."). The reason is the situation asked about (key, then o.keys) from
  // the step whose tie shares it, the last link first; a chain that shares none says its last link's own reason.
  // After a chain of two, "Both" names its pair. The hero goes by the short name the member knows ("Obama"), every
  // other life by its whole name, and so does the hero when a life the line is about holds the short name too:
  // Michelle Obama's card says "one step from Barack Obama". The Review's rows and the Library's lead route both
  // say this line.
  function linksTo(lib, mid, iconId, key, o) {
    o = o || {}; var hs = o.three && o.three.length ? o.three : three(lib, mid), b = bridge(lib, mid, iconId, key, { three: hs });
    var full = function (id) { var I = lib.icon[id]; return I ? I.name : id; };
    if (!b) return { links: 9, hero: null, steps: [], line: 'Not near the three.' };
    if (b.own) return { links: 0, hero: iconId, steps: [], line: 'One of the three.' };
    var st = b.steps, last = st[st.length - 1], ks = [key].concat(o.keys || []).filter(function (k, i, a) { return k && a.indexOf(k) === i; }), at = null, w;
    var sh = (lib.icon[b.hero] || {}).short || full(b.hero), lives = [iconId].concat(st.map(function (x) { return x.a; }), st.map(function (x) { return x.b; }));
    var nm = function (id) { return id === b.hero && !lives.some(function (x) { return x !== b.hero && (' ' + full(x) + ' ').indexOf(' ' + sh + ' ') >= 0; }) ? sh : full(id); };
    for (var i = st.length - 1; i >= 0 && !at; i--) for (var j = 0; j < ks.length && !at; j++) if (st[i].tie.shared.indexOf(ks[j]) >= 0 && both(ks[j])) at = { x: st[i], k: ks[j] };
    w = at ? 'Both ' + both(at.k) + '.' : why(lib, last.a, last.b, last.tie)[0] || '';
    if (st.length > 1) w = w.replace(/^Both /, full((at || { x: last }).x.a) + ' and ' + full((at || { x: last }).x.b) + ' both ');
    var NUMW = ['', 'One', 'Two', 'Three', 'Four', 'Five'], stop = function (t) { return /\.$/.test(t) ? t : t + '.'; };   // "through Martin Luther King Jr."
    var line = st.length === 1 ? stop('One step from ' + nm(b.hero)) + ' ' + w
      : stop((NUMW[st.length] || st.length) + ' steps from ' + nm(b.hero) + ', through ' + st.slice(0, -1).map(function (x) { return full(x.b); }).join(' and ')) + ' ' + w;
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
      // no age for a story whose dateline gave another year, until a coach settles it
      var s = lib.story[sid], ic = lib.icon[s.icon]; if (!ic || ic.born == null || s.year == null || s.yearClash) return;
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
  // is within one link of that member's three. Check one and run it again: the plan shortens. A draft whose source names
  // no work (sourceOk) is never a pick. Each week a member has ahead needs a checked story of its own as well, and a week
  // of theirs with none weighs 1.5. o.thisWeek ({ mid: situation }): the members still waiting for this week's story;
  // a draft that carries one of their weeks belongs on that member's line, so it leaves the plan, and the best of them
  // for each waiting member comes back as alts[mid], the line's other check.
  function checkPlan(lib, o) {
    o = o || {}; var need = o.need || 4, ids = o.members || Object.keys(lib.members), sent = o.sent || {}, avoid = o.avoid || {}, th = o.three || {}, tw = o.thisWeek || {};
    var wk = {}; Object.keys(tw).forEach(function (mid) { var k = lib.sit[tw[mid]] ? lib.sit[tw[mid]].key : tw[mid]; if (k) wk[mid] = k; });
    var wkKeys = Object.keys(wk).map(function (mid) { return wk[mid]; }), thisWeek = function (s) { return s.keys.some(function (k) { return wkKeys.indexOf(k) >= 0; }); };
    var M = ids.filter(function (mid) { return lib.members[mid]; }).map(function (mid) {
      var keys = (lib.members[mid].sits || []).map(function (c) { return lib.sit[c] && lib.sit[c].key; }).filter(Boolean), ex = sent[mid] || [], av = avoid[mid] || [];
      var seen = {}, have = 0, pool = [], all = [], hk = {};
      keys.forEach(function (k) { hk[k] = 0; });
      keys.forEach(function (k) { (lib.byKey[k] || []).forEach(function (sid) {
        var s = lib.story[sid]; if (seen[sid] || !s) return; seen[sid] = 1;
        if (ex.indexOf(sid) >= 0 || av.indexOf(s.icon) >= 0) return;
        if (s.reach !== 'near' && s.reach !== 'mid') return;   // the weekly rule never sends a far story
        if (s.verified) { have++; keys.forEach(function (x) { if (s.keys.indexOf(x) >= 0) hk[x]++; }); }
        else if (sourceOk(s)) { all.push(sid); if (!thisWeek(s)) pool.push(sid); }
      }); });
      return { id: mid, have: have, gap: Math.max(0, need - have), pool: pool, all: all, keys: keys, hk: hk, near: hops(lib, mid, { max: 1, three: th[mid] }) };
    });
    // a week of theirs ahead with no checked story. The situation a member waits on this week comes round again in their
    // season, and the story this week's check sends is spent by then, so that week ahead needs a second checked story
    var empty = function (m, s) { return m.keys.filter(function (k) { return m.hk[k] < (k === wk[m.id] ? 2 : 1) && (!s || s.keys.indexOf(k) >= 0); }); };
    var wants = function (m) { return m.gap > 0 || empty(m).length > 0; };
    var takes = function (m, s) { return empty(m, s).length ? 1.5 : m.gap > 0 ? 1 : 0; };
    var fill = function (m, s) { m.gap--; m.keys.forEach(function (k) { if (s.keys.indexOf(k) >= 0) m.hk[k]++; }); };
    var byId = {}; M.forEach(function (m) { byId[m.id] = m; });
    var picks = [], used = {}, alts = {};
    var nearOf = function (s, serves) { return serves.filter(function (mid) { return byId[mid].near[s.icon]; }).map(function (mid) { return { id: mid, links: byId[mid].near[s.icon].links, hero: byId[mid].near[s.icon].hero }; }); };
    // o.first: checks already asked for (this week's), counted before the plan picks its own
    (o.first || []).forEach(function (sid) {
      var s = lib.story[sid]; if (!s || used[sid]) return; used[sid] = 1;
      var serves = M.filter(function (m) { return wants(m) && takes(m, s) && m.all.indexOf(sid) >= 0; }).map(function (m) { return m.id; });
      serves.forEach(function (mid) { fill(byId[mid], s); });
      picks.push({ story: s, serves: serves, given: true, near: nearOf(s, serves) });
    });
    // the other check for each waiting member's line: the draft in their week that closes the most gaps
    Object.keys(wk).forEach(function (mid) {
      var me = byId[mid], best = null; if (!me) return;
      me.all.forEach(function (sid) {
        var s = lib.story[sid]; if (used[sid] || s.keys.indexOf(wk[mid]) < 0) return;
        var serves = M.filter(function (m) { return m.gap > 0 && m.all.indexOf(sid) >= 0; }), w = 0;
        serves.forEach(function (m) { w += m.near[s.icon] ? 1.2 : 1; });
        if (!best || w > best.w + 1e-9 || (Math.abs(w - best.w) < 1e-9 && sid < best.sid)) best = { sid: sid, w: w, serves: serves.map(function (m) { return m.id; }) };
      });
      if (best) alts[mid] = { story: lib.story[best.sid], serves: best.serves, near: nearOf(lib.story[best.sid], best.serves) };
    });
    for (;;) {
      var score = {}, best = null;
      M.forEach(function (m) { if (!wants(m)) return; m.pool.forEach(function (sid) {
        var t = used[sid] ? 0 : takes(m, lib.story[sid]); if (!t) return; var x = score[sid] = score[sid] || { w: 0, serves: [] };
        x.w += t * (m.near[lib.story[sid].icon] ? 1.2 : 1); x.serves.push(m.id);
      }); });
      Object.keys(score).sort().forEach(function (sid) { if (!best || score[sid].w > best.w + 1e-9) best = { sid: sid, w: score[sid].w, serves: score[sid].serves }; });
      if (!best) break;
      used[best.sid] = 1;
      best.serves.forEach(function (mid) { fill(byId[mid], lib.story[best.sid]); });
      picks.push({ story: lib.story[best.sid], serves: best.serves, near: nearOf(lib.story[best.sid], best.serves) });
    }
    // a week still empty at the end has no draft to check (left), or only drafts that carry this week's story for
    // someone, which come into the plan once this week has gone (later: its situation ids)
    var later = function (m) { return empty(m).filter(function (k) { return m.all.some(function (sid) { return lib.story[sid].keys.indexOf(k) >= 0; }); }); };
    // gap: checked stories still short of need once the plan is checked; weeks: weeks ahead still without one; left: what
    // still needs writing (a gap the waiting drafts will close after Sunday is not), and later: the weeks that wait for Sunday
    var waiting = function (m) { return m.all.filter(function (sid) { return !used[sid] && thisWeek(lib.story[sid]); }).length; };
    return { need: need, members: M.map(function (m) { var w = later(m); return { id: m.id, have: m.have, gap: Math.max(0, m.gap), weeks: empty(m).length, left: Math.max(0, m.gap - waiting(m)) + empty(m).length - w.length, later: w.map(function (k) { return lib.sitByKey[k].id; }) }; }), picks: picks, alts: alts };
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
  // ("Two minutes.") cut off. Moves meet on their words: each word that is not a stop word, as a light stem, so
  // "repeat", "repeated" and "repeating" weigh as one; and each stop word that carries a move ("one", "first",
  // "before") with the word beside it, read across the glue between them ("one sentence", "say it first", "before they
  // hear"). Out go the life's own name and any other name (a capital inside a sentence).
  // Two moves are the same move when one clause of each holds two of the same words: side by side (within four words,
  // in the same order) with one of them outside the week's commonest, or anywhere in the clause when neither is among
  // the week's commonest and one is rare (coLocated). Within a situation the words weigh against its own stories: a
  // word in more than half of them weighs as one in half, so the week's own words ("read", "sentence" in E1) count for
  // little and still count. A reason says only the words both stories wrote in the same form: "direct" and "directly"
  // weigh together and are never said as one word.
  // Measured on the corpus at the rules below: 67 families hold 175 of 563 story slots (31%), with 154 ties between their
  // stories; none of the 9 families of four or more is a chain; E1 has five families holding 12 of its 41 stories, the
  // largest the four that write down the sentence they want repeated. The same move in another week: 12 stories (the
  // nearest move alone gave 112, many on chance words, as King to Eisenhower on "conversation" and "turned"). Round six
  // read 40 ties by hand and found 13 joined on the frame alone ("ask your manager", "chair"); the frame rule below keeps
  // those apart, at the cost of some families a reader would have kept. A second reading, of every tie, parted the pairs
  // that share a word in two senses (APART, below).
  var STOPW = {}; ('actually really just rather instead the a an and or of to in on at by for with from as is was were be been being had has have he she his her him ' +
    'they them their it its that this which who whom what when where while after before into over under than then there these those not no but if so up out ' +
    'about one two three four five would could should may might did do does said says told also only more most other some such own same very can will like ' +
    'first last new old years year time made make many much any all each every between during because through against without within whose upon off again ' +
    'still even back down away later early late month months week weeks day days thought people way part place took went came asked gave called began became ' +
    'left got put set get take come know knew want wanted next whether though although around never always already enough something nothing anyone someone ' +
    'everyone everything another himself herself themselves itself nearly almost both either neither once twice six seven eight nine ten twenty thirty forty ' +
    'fifty sixty ninety hundred half too getting member members whole you your yours yourself we our ours us me my mine myself don doesn didn isn won aren ' +
    'let here per minute minutes second seconds hour hours tonight today tomorrow morning afternoon evening monday tuesday wednesday thursday friday are move moves').split(' ')
    .forEach(function (w) { STOPW[w] = 1; });
  // the stop words that carry a move beside another word, and the glue such a pair reads across; any other stop word ends it
  var PIVOT = {}, GLUE = {};
  'one two three first last before after only same own never once again not every each nothing out'.split(' ').forEach(function (w) { PIVOT[w] = 1; });
  'a an the it its they them their you your he she his her him we our us me my this that these those is are was were be to of'.split(' ').forEach(function (w) { GLUE[w] = 1; });
  var SETTING = /^(?:in|at|on|when|whenever|before|after|once|within|during|this|the|tonight|today|tomorrow|with|every|each|next|by|if|as|from|over|until|while|for)\b/i;
  // The frame of a move: the verbs that open almost every move and the people and things they are done to. Two clauses
  // that share only these share no move ("ask your manager" and "ask each long-serving manager"; "Chair it yourself" and
  // "Ask the chair"): a tie needs a word of the move itself, outside the frame, uncommon in the week, in the clause's own
  // head (before any "before", "until" or "when" that times it), and neither clause may do its work on a bare "it" or "them".
  var FRAME = {}; ('ask say tell name write send hand give read list put call phone ring open keep make take bring show answer reply book get use used ' +
    'person people team manager boss client lead room chair colleague partner peer group meeting member line sentence word note page question piece ' +
    'work job role firm office organisation organization company time how why serve serving need run state front best see think want look stay help know find part side way end start hold hear meet doing done').split(' ').forEach(function (w) { FRAME[stem(w)] = 1; FRAME[w] = 1; });
  // two forms of one word, or one inflected from the other ("repeat", "repeated"); not two words a stem joined ("site", "sits")
  function inflected(a, b) { if (a === b) return true; var x = a.length < b.length ? a : b, y = a.length < b.length ? b : a, r = y.slice(x.length); return y.indexOf(x) === 0 && /^(?:s|es|d|ed|ing|ly)$/.test(r) || y.indexOf(x.replace(/e$/, '')) === 0 && /^(?:ing|ed)$/.test(y.slice(x.length - 1)); }
  // a counting word with a frame word is still the frame ("one sentence", "three people"); "own name" or "first word" is not
  var COUNTING = { one: 1, two: 1, three: 1, four: 1, five: 1, six: 1, seven: 1, eight: 1, nine: 1, ten: 1, each: 1, every: 1 };
  function framed(k) {
    var p = k.split(' '); if (p.length === 1) return !!FRAME[k];
    var piv = PIVOT[p[0]] ? p[0] : p[1], w = PIVOT[p[0]] ? p[1] : p[0];
    return !!FRAME[w] && !!COUNTING[piv];
  }
  var TIMED = /\s+(?:before|after|until|once|when|whenever|while|so that|then)\s+/i, BARE = /^[A-Za-z]+\s+(?:them|it)\b/i;
  var TAKES = /^(?:under |about |up to )?(?:a|an|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|forty|sixty|ninety|\d+) (?:minutes?|seconds?|hours?)\b/i;
  var MIN_TIE = 0.10, MIN_WORDS = 2, ELSEWHERE = 0.35, SAME_MOVE = 0.2, COMMON = 0.5, RARE = 0.1, BESIDE = 4, ON_ITS_OWN = 0.25;
  function fold(s) { return String(s == null ? '' : s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  // light stemming: plurals, -ed, -ing, -ly, a doubled last letter and a final e, so the forms of a word meet
  function stem(w) {
    if (w.length <= 3) return w;
    if (/i(?:es|ed)$/.test(w) && w.length > 4) w = w.slice(0, -3) + 'y';
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
  // [term, form, at] in the order written: a word as [stem, word, its place among the words]; a pivot and the word beside
  // it as ["one sentenc", "one sentence", ...]. A comma, a dash, a name or any other stop word ends a pair.
  function toks(text, drop) {
    var out = [], at = -1;
    String(text || '').replace(/[’']s\b/g, '').split(/(?<=[.?!:;])\s+/).forEach(function (sen) {
      var prev = null, i = 0;
      (sen.match(/[A-Za-zÀ-ɏ]+|[,;:()—–]/g) || []).forEach(function (w) {
        if (!/^[A-Za-zÀ-ɏ]/.test(w)) { prev = null; return; }
        at++;
        if (i++ > 0 && /^[A-ZÀ-Þ]/.test(w)) { prev = null; return; }
        w = fold(w); if (GLUE[w]) return;
        var stop = w.length < 3 || STOPW[w] || STOPW[w.replace(/s$/, '')], st = stem(w);
        if ((stop && !PIVOT[w]) || (!stop && drop[st])) { prev = null; return; }
        var cur = stop ? { t: w, w: w, p: 1 } : { t: st, w: w, p: 0 };
        if (!stop) out.push([st, w, at]);
        if (prev && prev.p !== cur.p) out.push([prev.t + ' ' + cur.t, prev.w + ' ' + cur.w, at]);
        prev = cur;
      });
    });
    return out;
  }
  function dot(a, b) { var s = 0; for (var k in a) if (b[k]) s += a[k] * b[k]; return s; }
  function common(a, b) { return Object.keys(a).filter(function (k) { return b[k]; }).sort(function (x, y) { return b[y] * a[y] - b[x] * a[x] || (x < y ? -1 : 1); }); }
  function dfOf(docs, ids) { var df = {}; ids.forEach(function (id) { var seen = {}; docs[id].forEach(function (w) { if (!seen[w]) { seen[w] = 1; df[w] = (df[w] || 0) + 1; } }); }); return df; }
  // tf-idf over N documents. A term in one document is chance. Over the corpus a term in more than 15% of the stories is
  // dropped (o.drop); within a situation a term in more than half weighs as one in half (o.cap).
  function tfidf(doc, df, N, o) {
    var tf = {}, v = {}, n = 0; doc.forEach(function (w) { tf[w] = (tf[w] || 0) + 1; });
    Object.keys(tf).forEach(function (w) {
      if (df[w] < 2 || (o.drop && df[w] > N * o.drop)) return;
      v[w] = (1 + Math.log(tf[w])) * Math.log(N / (o.cap ? Math.min(df[w], N * o.cap) : df[w])); n += v[w] * v[w];
    });
    n = Math.sqrt(n) || 1; Object.keys(v).forEach(function (w) { v[w] /= n; }); return v;
  }

  // The move vectors, built a story at a time (moveBuild), so a page can build them in idle slices that yield to a tap
  // (moveVectorsIdle); a call that needs them at once finishes whatever is left. Kept on the index (keep).
  function moveBuild(lib) {
    if (lib._mvb) return lib._mvb;
    var b = { i: 0, docs: {}, mdocs: {}, terms: {}, forms: {}, wrote: {}, cl: {}, boil: {} };
    lib.situations.forEach(function (st) { var x = {}; plain([st.chip, st.line, st.member_line, st.key.replace(/-/g, ' ')].join(' ')).forEach(function (w) { x[w] = 1; }); b.boil[st.key] = x; });
    return keep(lib, '_mvb', b);
  }
  function moveStep(lib, b, n) {
    for (var end = Math.min(lib.stories.length, b.i + n); b.i < end; b.i++) {
      var s = lib.stories[b.i], me = {}; plain((lib.icon[s.icon] || {}).name).forEach(function (w) { me[w] = 1; });
      var drop = Object.assign({}, me); s.keys.forEach(function (k) { Object.keys(b.boil[k] || {}).forEach(function (w) { drop[w] = 1; }); });
      var mt = [], wr = b.wrote[s.id] = {}, cs = b.cl[s.id] = [];
      (s.move_examples || []).forEach(function (m) {
        mt = mt.concat(toks(action(m), me));
        // each clause of the move, with the terms it holds: where, and in which form
        clauses(action(m)).forEach(function (x) {
          var at = {}, head = {}; toks(x, me).forEach(function (p) { (at[p[0]] = at[p[0]] || { f: {}, at: [] }).f[p[1]] = 1; at[p[0]].at.push(p[2]); });
          toks(x.split(TIMED)[0], me).forEach(function (p) { head[p[0]] = 1; });
          cs.push({ text: x, at: at, head: head, bare: BARE.test(x.trim()) });
        });
      });
      // the forms the moves wrote each term in; across the corpus, the situation's own words go as well as the name
      mt.forEach(function (p) { (wr[p[0]] = wr[p[0]] || {})[p[1]] = 1; });
      var dm = mt.filter(function (p) { return !p[0].split(' ').some(function (w) { return !PIVOT[w] && drop[w]; }); }), d = dm.slice();
      (s.line_examples || []).forEach(function (l) { d = d.concat(toks(said(l), drop)); });
      var forms = b.forms; b.docs[s.id] = d.map(function (t) { var f = forms[t[0]] = forms[t[0]] || {}; f[t[1]] = (f[t[1]] || 0) + 1; return t[0]; });
      b.mdocs[s.id] = dm.map(function (t) { return t[0]; }); b.terms[s.id] = mt.map(function (t) { return t[0]; });
    }
    return b.i >= lib.stories.length;
  }
  // the weight of each term in each story, a few stories at a time once every story is read (moveStep). The move and its
  // line join two stories of a week; the same move in another week is judged on the moves alone, where a chance word in a
  // line ("table", "joke") cannot carry two stories together
  function moveWeigh(lib, b, n) {
    var N = lib.stories.length, ids = function () { return lib.stories.map(function (s) { return s.id; }); };
    if (!b.df) { b.df = dfOf(b.docs, ids()); b.vec = {}; b.mvec = {}; b.w = 0; if (n < N) return false; }
    if (!b.mdf) { b.mdf = dfOf(b.mdocs, ids()); if (n < N) return false; }
    for (var end = Math.min(N, b.w + n); b.w < end; b.w++) { var s = lib.stories[b.w]; b.vec[s.id] = tfidf(b.docs[s.id], b.df, N, { drop: 0.15 }); b.mvec[s.id] = tfidf(b.mdocs[s.id], b.mdf, N, { drop: 0.15 }); }
    return b.w >= N;
  }
  function moveVectors(lib) {
    if (lib._mv) return lib._mv;
    var b = moveBuild(lib); moveStep(lib, b, lib.stories.length); moveWeigh(lib, b, lib.stories.length);
    var N = lib.stories.length, forms = b.forms, form = {};
    // a term reads as the form the corpus uses most
    Object.keys(forms).forEach(function (k) { form[k] = Object.keys(forms[k]).sort(function (x, y) { return forms[k][y] - forms[k][x] || x.length - y.length || (x < y ? -1 : 1); })[0]; });
    return keep(lib, '_mv', { vec: b.vec, mvec: b.mvec, form: form, df: b.df, mdf: b.mdf, n: N, terms: b.terms, wrote: b.wrote, clauses: b.cl, fam: {}, away: {}, sit: {} });
  }
  // Work done while the page is idle, in slices of up to 30 ms that give the main thread back between them, so a tap
  // waits for one slice at most: each(i) is called until it returns true, then done(). In node, at once.
  var NOW = function () { return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now(); };
  function idleRun(each, done) {
    var idle = typeof requestIdleCallback === 'function' ? requestIdleCallback : typeof window === 'undefined' ? null : function (f) { return setTimeout(function () { f({ timeRemaining: function () { return 30; } }); }, 16); };
    if (!idle) { while (!each()) {} if (done) done(); return; }
    (function slice(dl) {
      var t0 = NOW();
      while (!each()) if (!dl || dl.timeRemaining() < 3 || NOW() - t0 > 30) return idle(slice);
      if (done) done();
    })(null);
  }
  // Build the move vectors while the page is idle, a few stories a slice; done(V) once they are built. A page that needs
  // them before then builds the rest at once.
  function moveVectorsIdle(lib, done) {
    if (lib._mv) { if (done) done(lib._mv); return; }
    var b = moveBuild(lib);
    idleRun(function () { return !!lib._mv || (moveStep(lib, b, 4) && moveWeigh(lib, b, 8)); }, function () { var V = moveVectors(lib); if (done) done(V); });
  }
  // Each situation's families (moveFamilies), one situation a slice once the vectors are built, the keys given first and
  // then the rest: a story's reasons and a situation page then find them made. done() once all are.
  function familiesIdle(lib, keys, done) {
    var all = (keys || []).filter(function (k) { return lib.sitByKey[k]; }).concat(lib.situations.map(function (s) { return s.key; })), i = 0;
    moveVectorsIdle(lib, function (V) {
      idleRun(function () { while (i < all.length && V.fam[all[i]]) i++; if (i >= all.length) return true; moveFamilies(lib, all[i++]); return false; }, done);
    });
  }
  // One situation's moves, weighed against that situation's own stories.
  function sitVectors(lib, key) {
    if (lib.sit[key]) key = lib.sit[key].key;
    var V = moveVectors(lib); if (V.sit[key]) return V.sit[key];
    var ids = (lib.byKey[key] || []).filter(function (id) { return lib.story[id]; }), df = dfOf(V.terms, ids), n = ids.length, vec = {};
    ids.forEach(function (id) { vec[id] = tfidf(V.terms[id], df, n, { cap: COMMON }); });
    return (V.sit[key] = { key: key, ids: ids, vec: vec, df: df, n: n });
  }
  function sid(x) { return x && typeof x === 'object' ? x.id : x; }
  // the words two stories both wrote in their moves, in the same form, in the order of stems given
  function sameWords(V, a, b, stems) {
    var wa = V.wrote[a] || {}, wb = V.wrote[b] || {}, out = [];
    stems.forEach(function (k) { var f = Object.keys(wa[k] || {}).filter(function (w) { return wb[k] && wb[k][w]; }).sort()[0]; if (f && out.indexOf(f) < 0) out.push(f); });
    return out;
  }
  // Two clauses make the same move: the words they share (in both vectors x and y), or null. o: { df, n } of the stories
  // the words weigh against, which say what is common (more than half) and what is rare (a tenth, three at least).
  function meets(ca, cb, x, y, o) {
    if (ca.bare || cb.bare) return null;
    var ks = Object.keys(ca.at).filter(function (k) { return cb.at[k] && x[k] && y[k]; }), ws = ks.filter(function (k) { return k.indexOf(' ') < 0; });
    var com = function (k) { return o.df[k] > o.n * COMMON; }, rare = function (k) { return o.df[k] <= Math.max(3, o.n * RARE); };
    // a word of the move itself, in the head of both clauses: two of them, or one that is rare in the week and written
    // as the same word in both
    var own = ks.filter(function (k) { return !framed(k) && !com(k) && (!ca.head || ca.head[k]) && (!cb.head || cb.head[k]); });
    if (!own.length) return null;
    if (own.length === 1 && (!rare(own[0]) || !Object.keys(ca.at[own[0]].f).some(function (f) { return Object.keys(cb.at[own[0]].f).some(function (g) { return inflected(f, g); }); }))) return null;
    var beside = function (c, p, q) { return c.at[p].at.some(function (i) { return c.at[q].at.some(function (j) { return j > i && j - i <= BESIDE; }); }); };
    for (var i = 0; i < ws.length; i++) for (var j = 0; j < ws.length; j++) {
      var p = ws[i], q = ws[j]; if (i === j) continue;
      if ((!com(p) || !com(q)) && beside(ca, p, q) && beside(cb, p, q)) return ks;
      if (i < j && !com(p) && !com(q) && (rare(p) || rare(q))) return ks;
    }
    return null;
  }
  // The words cannot tell a word's two senses apart ("the senior seat" and "each senior colleague", "the one thing you
  // learned" and "the one thing you will work on"), nor a frame from a move when a placeholder carries it. Round six read
  // every tie that holds a family, and every same move another week or an Others card says, by hand (222 of them): these
  // 53 pairs share words and make two different moves, and are kept apart. A new corpus wants its ties read the same way.
  var APART = {}; [
    's-A1-caroline-robinson-jones s-A1-laura-bush', 's-A1-caroline-robinson-jones s-A1-mia-hamm',
    's-A1-florence-nightingale s-A1-mahatma-gandhi', 's-A2-elena-kagan st-obama-2008-clinton',
    's-A3-arthur-levitt s-A3-harry-markopolos', 's-A3-arthur-levitt s-A3-howard-schultz',
    's-A3-brooksley-born s-A3-harry-markopolos', 's-A3-martin-baron s-A4-angela-ahrendts',
    's-A3-vannevar-bush s-D2-archimedes', 's-A4-aristotle s-A4-satya-nadella', 's-A5-mary-barra s-A5-nelson-mandela',
    's-B1-albert-einstein st-stevie-wonder-1971-motown', 's-B1-nora-ephron s-B1-tom-burrell',
    's-B3-anne-frank s-B3-coco-gauff', 's-B3-ivanka-trump s-B3-martina-navratilova',
    's-B4-caroline-robinson-jones s-B4-sara-blakely', 's-B5-abraham-lincoln s-B5-bill-bernbach',
    's-B5-margaret-thatcher s-B5-meryl-streep', 's-B6-george-c-marshall s-B6-ulysses-s-grant',
    's-B6-harry-markopolos s-B6-nikola-tesla', 's-B6-ulysses-s-grant s-E3-john-adams',
    's-B6-ulysses-s-grant st-kjohnson-1958-langley', 's-C2-ada-lovelace s-C2-madam-c-j-walker',
    's-C2-eleanor-roosevelt s-C2-jo-malone', 's-C2-jo-malone s-C2-mary-wells-lawrence',
    's-C3-dolores-huerta s-C3-j-robert-oppenheimer', 's-C3-fannie-lou-hamer s-C3-venus-williams',
    's-C3-j-robert-oppenheimer s-C3-sabrina-ionescu', 's-D1-anne-boden s-D1-bill-walsh',
    's-D1-anne-boden s-D1-wangari-maathai', 's-D1-bill-walsh s-D1-theodore-roosevelt',
    's-D1-cesar-chavez s-D1-ricardo-semler', 's-D1-frances-arnold s-D1-paul-cravath',
    's-D1-ricardo-semler s-D1-theodore-roosevelt', 's-D2-charlie-munger s-D2-rene-descartes',
    's-D2-giorgio-armani s-D2-rene-descartes', 's-D2-madeleine-albright s-D2-ruth-bader-ginsburg',
    's-D2-pat-summitt s-D2-paul-mccartney', 's-D2-rene-descartes s-D2-walt-disney', 's-D3-john-legend s-D3-mo-ibrahim',
    's-E1-archibald-cox s-E1-tim-tebow', 's-E1-fannie-lou-hamer s-E1-lloyd-blankfein',
    's-E1-halle-berry s-E1-paige-bueckers', 's-E1-lebron-james st-jackie-robinson-1945-rickey',
    's-E2-erin-callan s-E4-yo-yo-ma', 's-E3-antonio-banderas s-E3-magic-johnson', 's-E3-indra-nooyi s-E3-magic-johnson',
    's-E3-indra-nooyi s-E3-martha-graham', 's-E3-ludwig-van-beethoven s-E3-wilma-rudolph',
    's-E3-magic-johnson s-E3-martha-graham', 's-E4-ashleigh-barty s-E4-stevie-wonder',
    's-E4-joan-didion s-E4-mary-wells-lawrence', 's-E4-michael-jordan s-E4-peter-drucker'
  ].forEach(function (p) { var x = p.split(' '); APART[x[0] + '|' + x[1]] = APART[x[1] + '|' + x[0]] = 1; });
  // coLocated: the clause pair in which two stories make the same move, { a, b, stems, words, sc } or null: the pair that
  // shares the most, then the heaviest. o.x, o.y and o.df/o.n: the vectors and counts to judge with (the corpus's moves
  // when not given).
  function coLocated(lib, a, b, o) {
    a = sid(a); b = sid(b); o = o || {};
    if (APART[a + '|' + b]) return null;
    var V = moveVectors(lib), x = o.x || V.mvec[a], y = o.y || V.mvec[b], n = o.df ? o : { df: V.mdf, n: V.n }, best = null; if (!x || !y || a === b) return null;
    (V.clauses[a] || []).forEach(function (ca) { (V.clauses[b] || []).forEach(function (cb) {
      var ks = meets(ca, cb, x, y, n); if (!ks) return;
      var sc = ks.reduce(function (s, k) { return s + x[k] * y[k]; }, 0);
      if (!best || ks.length > best.stems.length || (ks.length === best.stems.length && sc > best.sc + 1e-12)) best = { a: ca.text, b: cb.text, stems: ks, sc: sc };
    }); });
    if (best) best.words = sameWords(V, a, b, best.stems.sort(function (p, q) { return y[q] * x[q] - y[p] * x[p] || (p < q ? -1 : 1); }));
    return best;
  }
  function moveTie(lib, a, b) {
    a = sid(a); b = sid(b);
    var V = moveVectors(lib), x = V.vec[a], y = V.vec[b]; if (!x || !y || a === b) return null;
    var st = common(x, y); if (!st.length) return null;
    return { w: dot(x, y), words: sameWords(V, a, b, st), stems: st };
  }
  // the clauses of a move, in the corpus's words. A fragment ("in one sentence"), a short tail ("and stop"), a piece with
  // no verb of its own ("the direction you want", "naming the review you skipped", "so the numbers are read beside it",
  // "even if the response was none") and whatever follows a clause too short to stand ("speak once, second to last")
  // read with the clause before it; a fragment that opens a sentence is a setting, and goes.
  var FRAGMENT = /^(?:with|within|in|inside|at|on|by|beside|alongside|for|from|to|which|each|whose|where|when|until|before|after|during|without|than|as|that|what|under|who|whom)\b/i;
  var TAIL = /^(?:so|even|if|unless|because|though|although|whether|the|a|an|your|their|its|this|these|those|(?!(?:bring|thing|string|swing|spring|sting)\b)[a-z]{2,}ing|(?!(?:need|feed|proceed|succeed|shed|embed|speed)\b)[a-z]{3,}ed|([a-z]+) (?:by|for) \1$|[a-z]+ [a-z]+ each$)\b/i;
  function clauses(t) {
    var out = [], KEEP = '\u0000';
    String(t).replace(/[.?!]+$/, '').split(/[.?!]\s+/).forEach(function (sen) {
      // a comma inside brackets, or in a list after a colon, does not end a clause
      sen = sen.replace(/\([^()]*\)/g, function (m0) { return m0.replace(/,\s+/g, ',' + KEEP); }).replace(/:\s[^;—–]*$/, function (m0) { return m0.replace(/,\s+/g, ',' + KEEP); });
      var cs = sen.split(/(,\s+|;\s+|\s+[—–]\s+)/).map(function (x) { return x.split(',' + KEEP).join(', '); }), cur = null, cond = false;
      for (var i = 0; i < cs.length; i += 2) {
        var raw = cs[i].trim(), c = raw.replace(/^(?:(?:and|then|but|so|or)\s+)+/i, ''); if (!c) continue;
        // a condition ("if it could sit on a rival's slide") takes the clause it governs with it
        if (cur && (cond || FRAGMENT.test(c) || TAIL.test(raw) || TAIL.test(c) || c.split(/\s+/).length < 3 || cur.split(/\s+/).length < 3)) { cond = /^(?:if|unless)\b/i.test(c); cur += cs[i - 1] + raw; continue; }
        if (FRAGMENT.test(c)) continue;
        if (cur) out.push(cur);
        cur = c; cond = /^(?:if|unless)\b/i.test(c);
      }
      if (cur) out.push(cur);
    });
    out = out.filter(function (c) { return c.split(/\s+/).length >= 3; });
    return out.length ? out : [String(t).replace(/[.?!]+$/, '')];
  }
  function cap1(t) { t = String(t || ''); return t.charAt(0).toUpperCase() + t.slice(1); }
  // the clause of a story's move that carries most of the weight in want ({ term: w })
  function moveClause(lib, id, want) {
    var s = lib.story[sid(id)], best = null; if (!s) return null; want = want || {};
    (moveVectors(lib).clauses[s.id] || []).forEach(function (c, ci) {
      var sc = Object.keys(c.at).reduce(function (a, k) { return a + (want[k] || 0); }, 0);
      if (ci === 0) sc *= 1.15;   // the clause that opens the move says it best, all else near equal
      if (!best || sc > best.sc + 1e-12) best = { sc: sc, text: cap1(c.text) };
    });
    return best;
  }
  function byYearId(lib) { return function (a, b) { var x = lib.story[a], y = lib.story[b]; return (x.year == null ? 1e9 : x.year) - (y.year == null ? 1e9 : y.year) || (a < b ? -1 : 1); }; }

  // Within one situation two stories are tied when one clause of each makes the same move (coLocated) and their moves
  // have a cosine of 0.10, or on a cosine of 0.25 alone. A family is a move several stories make: the clause that most
  // stories tied to its story make too, which heads the card; its story is the hub, and the family is the hub with every
  // story tied to it that makes that clause's move, then any story tied to two of them that makes the move as they do.
  // The next family is found among the stories left. A tie on weight alone joins nobody: it has no move to head a card.
  function moveFamilies(lib, key) {
    if (lib.sit[key]) key = lib.sit[key].key;   // "E1" reads as its situation
    var V = moveVectors(lib); if (V.fam[key]) return V.fam[key];
    var S = sitVectors(lib, key), ids = S.ids, yr = byYearId(lib), ties = [], adj = {}, left = {}, fams = [];
    ids.forEach(function (id) { adj[id] = {}; left[id] = 1; });
    for (var i = 0; i < ids.length; i++) for (var j = i + 1; j < ids.length; j++) {
      var a = ids[i], b = ids[j]; if (lib.story[a].icon === lib.story[b].icon) continue;
      var x = S.vec[a], y = S.vec[b], st = common(x, y), w = dot(x, y);
      if (st.length < MIN_WORDS || w < MIN_TIE) continue;
      var pr = coLocated(lib, a, b, { x: x, y: y, df: S.df, n: S.n }); if (!pr && w < ON_ITS_OWN) continue;
      if (yr(a, b) > 0) { var z = a; a = b; b = z; if (pr) pr = { a: pr.b, b: pr.a, stems: pr.stems, words: pr.words, sc: pr.sc }; }
      var t = { a: a, b: b, w: w, stems: st, words: sameWords(V, a, b, st), pair: pr };
      ties.push(t); adj[a][b] = adj[b][a] = t;
    }
    // the clause of s that makes the move of h's clause c: the one its tie to h is on, when that one does, else the first
    var makes = function (c, h, s) {
      var ok = (V.clauses[s] || []).filter(function (d) { return meets(c, d, S.vec[h], S.vec[s], S); }), t = adj[h] && adj[h][s], on = t && t.pair ? (t.a === s ? t.pair.a : t.pair.b) : null;
      return ok.filter(function (d) { return d.text === on; })[0] || ok[0];
    };
    for (;;) {
      var best = null;
      ids.forEach(function (h) { if (left[h]) (V.clauses[h] || []).forEach(function (c, ci) {
        var by = ids.filter(function (s) { return left[s] && adj[h][s] && adj[h][s].pair && makes(c, h, s); });
        var sc = by.reduce(function (z, s) { return z + adj[h][s].w; }, 0);
        if (by.length && (!best || by.length > best.by.length || (by.length === best.by.length && sc > best.sc + 1e-12))) best = { h: h, c: c, by: by, sc: sc };
      }); });
      if (!best) break;
      var row = {}, mem = [best.h].concat(best.by);
      row[best.h] = best.c; best.by.forEach(function (s) { row[s] = makes(best.c, best.h, s); });
      // a story tied to two members joins only when its clause makes the headline's move as well
      ids.forEach(function (o) {
        if (!left[o] || row[o]) return;
        var two = best.by.concat(best.h).map(function (m) { return adj[o][m] && adj[o][m].pair ? makes(row[m], m, o) : null; }).filter(Boolean), head = makes(best.c, best.h, o);
        if (two.length >= 2 && head) { mem.push(o); row[o] = head; }
      });
      mem.forEach(function (m) { delete left[m]; });
      fams.push(family(lib, V, S, mem.sort(yr), best.h, row, ties));
    }
    fams.sort(function (p, q) { return q.members.length - p.members.length || yr(p.members[0], q.members[0]); });
    return (V.fam[key] = { fams: fams, alone: ids.filter(function (id) { return left[id]; }).sort(yr), ties: ties.length });
  }
  // one family as the page reads it: its ties, its move, and each row's own clause with the words another row's clause
  // wrote in the same form marked (the week's commonest aside)
  function family(lib, V, S, mem, hub, row, ties) {
    var yr = byYearId(lib), w = {}, rows = {}, used = {};
    var T = ties.filter(function (t) { return mem.indexOf(t.a) >= 0 && mem.indexOf(t.b) >= 0; }).sort(function (p, q) { return q.w - p.w || yr(p.a, q.a); });
    T.forEach(function (t) { t.stems.forEach(function (k) { w[k] = (w[k] || 0) + S.vec[t.a][k] * S.vec[t.b][k]; }); });
    mem.forEach(function (id) {
      var c = row[id], marks = [];
      Object.keys(c.at).forEach(function (k) {
        if (k.indexOf(' ') >= 0 || !S.vec[id][k] || S.df[k] > S.n * COMMON || framed(k)) return;
        if (!mem.some(function (m) { return m !== id && row[m].at[k]; })) return;
        Object.keys(c.at[k].f).forEach(function (f) { if (marks.indexOf(f) < 0) { marks.push(f); used[f] = (used[f] || 0) + (w[k] || 0); } });
      });
      rows[id] = { text: cap1(c.text), marks: marks };
    });
    var words = Object.keys(used).sort(function (p, q) { return used[q] - used[p] || (p < q ? -1 : 1); });
    return { members: mem, ties: T, hub: hub, words: words.slice(0, 3), move: cap1(row[hub].text), rows: rows };
  }
  // The same move in another week: the nearest move in the corpus from a story that shares no situation and no life,
  // said only when one clause of each makes it (coLocated): { story, w, words, pair: { a, b } }, a this story's clause.
  function sameMoveElsewhere(lib, id) {
    id = sid(id); var V = moveVectors(lib); if (Object.prototype.hasOwnProperty.call(V.away, id)) return V.away[id];
    var s = lib.story[id], xm = V.mvec[id], best = null; if (!s || !xm) return null;
    lib.stories.forEach(function (o) {
      if (o.icon === s.icon || o.keys.some(function (k) { return s.keys.indexOf(k) >= 0; })) return;
      var y = V.mvec[o.id], w = dot(xm, y); if (w < ELSEWHERE || (best && (w < best.w - 1e-12 || (Math.abs(w - best.w) < 1e-12 && o.id > best.id)))) return;
      if (common(xm, y).length >= MIN_WORDS) best = { id: o.id, w: w };
    });
    var pr = best && coLocated(lib, id, best.id);
    return (V.away[id] = pr ? { story: lib.story[best.id], w: best.w, words: pr.words, pair: { a: cap1(pr.a), b: cap1(pr.b) } } : null);
  }
  // A reason in a sentence, said only when one clause of each makes the move, with both clauses so a reader can see it is
  // one move: "The same move. Pat Benatar: say once, at your normal volume, the direction you want and the reason, then
  // stop. James Madison: answer …" a is the story the page opens, b the one the reason stands
  // beside; two clauses in the same words are said once ("The same move: decide in the room."). Two stories tied in a
  // family say it in the clause pair their tie holds; any other two are judged on the corpus.
  function moveWords(lib, a, b) {
    a = sid(a); b = sid(b);
    var A = lib.story[a], B = lib.story[b], ca = null, cb = null; if (!A || !B || a === b) return '';
    A.keys.forEach(function (k) { if (ca || B.keys.indexOf(k) < 0) return; moveFamilies(lib, k).fams.forEach(function (f) {
      var t = f.ties.filter(function (x) { return x.pair && ((x.a === a && x.b === b) || (x.a === b && x.b === a)); })[0];
      if (!ca && t) { ca = t.a === a ? t.pair.a : t.pair.b; cb = t.a === a ? t.pair.b : t.pair.a; }
    }); });
    if (!ca) {
      var t = moveTie(lib, a, b); if (!t || t.w < SAME_MOVE || t.stems.length < MIN_WORDS) return '';
      var V = moveVectors(lib), pr = coLocated(lib, a, b, { x: V.vec[a], y: V.vec[b], df: V.df, n: V.n }); if (!pr) return '';
      ca = pr.a; cb = pr.b;
    }
    var low = function (c) { return c.charAt(0).toLowerCase() + c.slice(1); }, nm = function (S) { var I = lib.icon[S.icon] || {}; return I.short || I.name || ''; };
    if (low(ca) === low(cb)) return 'The same move: ' + low(ca) + '.';
    return 'The same move. ' + nm(A) + ': ' + low(ca) + '. ' + nm(B) + ': ' + low(cb) + '.';
  }

  return { BOTH: BOTH, STANCE: STANCE, FIELD: FIELD, NEAR_YEARS: NEAR_YEARS, both: both, apart: apart, world: world,
    tie: tie, why: why, short: short, graph: graph, kindred: kindred, route: route, routes: routes, bridge: bridge, idleRun: idleRun, familiesIdle: familiesIdle,
    near: near, nearWhy: nearWhy, affinity: affinity, sendable: sendable, web: web, three: three, atAge: atAge, fillSlot: fillSlot, hops: hops, linksTo: linksTo, grid: grid, checkPlan: checkPlan,
    sourceOk: sourceOk, fitFor: fitFor, nextFor: nextFor, fitLine: fitLine, firstWeekGap: firstWeekGap, yearAgrees: yearAgrees, when: when, INT_FIELDS: INT_FIELDS, WHEN: WHEN,
    moveVectors: moveVectors, moveVectorsIdle: moveVectorsIdle, sitVectors: sitVectors, moveTie: moveTie, coLocated: coLocated, moveFamilies: moveFamilies, sameMoveElsewhere: sameMoveElsewhere, moveWords: moveWords, moveClause: moveClause, stem: stem, APART: APART };
}));
