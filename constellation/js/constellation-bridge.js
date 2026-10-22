/* Constellation bridge: the corpus inside the prototype.

   The prototype (index.html, js/constellation-proto-data.js, js/constellation-proto-engine.js) is a
   Claude Design export and stays as exported. This file sits beside it and does four things:

   1  Feeds it. It holds the engine back until the corpus bundle (data/corpus.json), the demo world
      from the back end (/api/constellation/demo, falling back to data/demo.json) and the shared
      verification ledger have loaded, then merges them into window.CPD through lib/core.js. The
      prototype's 13 sample stories keep their ids; the corpus's 525 stories and 437 lives join them.
      The likeness tables come ready made (data/derived.json) while they match the corpus loaded.
   2  Keeps the rules. Corpus stories arrive as recall drafts, so the engine's own rule (only a
      verified story is sent) still decides every week. A coach's source check in the Library lifts it.
   3  Opens the Library. Members reach it from Heroes, a hero page or a story, in one frame kept for
      the session; coaches from the Library tab, which now opens on Explore, with the old send screen
      one tab along. Either frame reads this page's index (CLB.lib), so neither fetches the corpus.
   4  Talks to the Library frame (same origin, postMessage): send to a member, save, ask the coach,
      a story verified.

   It loads from the page head, before the runtime injects the export's scripts (which run in no
   fixed order), and catches window.CPD and window.CPE as they are assigned. */
(function () {
  'use strict';
  var BASE = '/constellation/';
  var _cpd = null, _cpe = null, ready = false, loaded = null, failed = false, t0 = Date.now();
  var B = window.CLB = { ready: false, source: null, lib: null, ledger: {}, ns: null, c: null, errors: [], inflight: {} };

  // The runtime can render the template twice (it re-reads the page), which runs the export's
  // scripts again and assigns CPD and CPE afresh; each assignment after the first is fed and
  // wrapped on arrival, so the prototype never sees a bare copy.
  Object.defineProperty(window, 'CPD', { configurable: true, get: function () { return _cpd; }, set: function (v) {
    if (ready && v && loaded && window.CLC) { try { feed(v, loaded.corpus, loaded.demo); } catch (e) { B.errors.push('merge: ' + e.message); } }
    _cpd = v; B.cpdSets = (B.cpdSets || 0) + 1; settle();
  } });
  // The prototype boots when it sees both CPD and CPE; CPE stays hidden until the merge is done.
  Object.defineProperty(window, 'CPE', { configurable: true, get: function () { return ready ? _cpe : undefined; }, set: function (v) {
    if (ready && v && !v.__bridged) { try { wrap(v); } catch (e) { B.errors.push('wrap: ' + e.message); } }
    _cpe = v; B.cpeSets = (B.cpeSets || 0) + 1; settle();
  } });

  function ns() {
    try { var v = localStorage.getItem('cl-ns'); if (!v) { v = 'b' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); localStorage.setItem('cl-ns', v); } return v; }
    catch (e) { return 'anonymous-browser'; }
  }
  function localLedger() { try { return JSON.parse(localStorage.getItem('cl-ledger') || '{}') || {}; } catch (e) { return {}; } }
  function getJSON(url) { return fetch(url, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); }); }
  // corpus.json with the SHA-256 of its bytes, which says whether data/derived.json was built from it (the digest
  // runs off the main thread; without it the tables are built here, as before)
  function getCorpus(url) {
    return fetch(url, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error(url + ' ' + r.status); return r.arrayBuffer(); }).then(function (buf) {
      var json = JSON.parse(new TextDecoder().decode(buf)), sub = window.crypto && window.crypto.subtle;
      if (!sub) return { json: json, hash: null };
      return sub.digest('SHA-256', buf).then(function (h) { return { json: json, hash: Array.prototype.map.call(new Uint8Array(h), function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join('') }; }, function () { return { json: json, hash: null }; });
    });
  }

  B.ns = ns();
  // the back end's demo world and ledger are waited for a moment, no longer: past it the app boots on data/demo.json and
  // this browser's own checks, and the shared ledger is applied when it lands
  var LATE = {}, soon = function (p, ms) { return Promise.race([p, new Promise(function (ok) { setTimeout(function () { ok(LATE); }, ms); })]); };
  var stateP = getJSON('/api/constellation/state?ns=' + encodeURIComponent(B.ns)).catch(function (e) { B.errors.push(String(e)); return null; });
  Promise.all([
    getCorpus(BASE + 'data/corpus.json'),
    getJSON(BASE + 'data/demo.json'),
    soon(getJSON('/api/constellation/demo').then(function (p) { B.source = 'api'; return p; }, function (e) { B.source = 'static'; B.errors.push(String(e)); return null; }), 1500),
    soon(stateP, 1500),
    getJSON(BASE + 'data/derived.json').catch(function () { return null; })
  ]).then(function (r) {
    var demo = r[1];
    if (r[2] === LATE) { B.source = 'static'; r[2] = null; }
    if (r[2]) { ['coaches', 'members', 'order', 'personas', 'msgs'].forEach(function (k) { if (r[2][k]) demo[k] = r[2][k]; }); }
    if (r[3] === LATE) {
      r[3] = null;
      stateP.then(function (sv) {
        if (!sv) return; B.store = sv.store;
        Object.keys(sv.ledger || {}).forEach(function (id) { if (!B.ledger[id]) markVerified(id, sv.ledger[id]); });
        if (B.c) B.c.setState({ _ledger: Date.now() });
      });
    }
    B.ledger = Object.assign({}, (r[3] && r[3].ledger) || {}, localLedger());
    B.store = r[3] ? r[3].store : 'none';
    B.corpus = r[0].json;
    loaded = { corpus: r[0].json, demo: demo, hash: r[0].hash, derived: r[4] };
    settle();
  }, function (e) { failed = true; B.errors.push(String(e)); settle(); });
  // Never strand the prototype: if the corpus cannot load, it boots on its own sample data.
  setTimeout(function () { if (!ready) { failed = true; B.errors.push('timed out waiting for the corpus'); settle(); } }, 12000);

  function settle() {
    if (ready || !_cpd || !_cpe) return;
    if (!loaded && !failed) return;
    if (!window.CLC && !failed && Date.now() - t0 < 12000) { setTimeout(settle, 30); return; }
    try { if (loaded && window.CLC) feed(_cpd, loaded.corpus, loaded.demo); } catch (e) { B.errors.push('merge: ' + e.message); console.error(e); }
    try { wrap(_cpe); } catch (e) { B.errors.push('wrap: ' + e.message); console.error(e); }
    ready = B.ready = true;
    // the tables a first story reads (the move vectors, the words of every story, each situation's families, the open
    // member's first), built while the app is idle, a slice at a time, so the first tap on a story finds them built and no
    // slice holds a tap back (CLC.warm); the Library's frame reads the same index, and finds them built too
    if (B.lib && window.CLC.warm) setTimeout(function () {
      var lib = B.lib, st = (B.c && B.c.state) || {}, M = lib.members[st.p] || {}, keys = (M.sits || []).map(function (id) { return lib.sit[id] && lib.sit[id].key; }).filter(Boolean);
      window.CLC.warm(lib, keys, function () {
        // then the chains from the member's three to each life in their weeks, which a story's Others are ranked by (CLN.bridge);
        // before the member has chosen, the three the record holds for them
        var N = window.CLN, core = coreIcons(st).length ? coreIcons(st) : ((M.heroes_icons || {}).core || []).slice(), todo = [], seen = {};
        if (!N.idleRun) return;
        if (core.length) keys.forEach(function (k) { (lib.byKey[k] || []).forEach(function (id) {
          var ic = lib.story[id] && lib.story[id].icon; if (!ic || seen[ic + '|' + k]) return; seen[ic + '|' + k] = 1;
          todo.push(function () { N.bridge(lib, st.p, ic, k, { three: core }); });
        }); });
        // then each member's season and weeks as the Review asks them (CLN.nextFor), so the first Review finds them made
        lib.order.forEach(function (mid) {
          todo.push(function () { seasonOf(lib, mid); });
          ((lib.members[mid] || {}).sits || []).forEach(function (id) { if (lib.sit[id]) todo.push(function () { N.nextFor(lib, mid, { key: lib.sit[id].key }); }); });
        });
        N.idleRun(function () { var f = todo.shift(); if (f) f(); return !todo.length; });
      });
    }, 600);
  }

  // ---------- 1 · feed ----------
  var appOf = {};   // library icon id -> the hero id the prototype uses
  var iconOf = {};  // prototype hero id -> library icon id
  var fillMemo = {};  // CLN.fitFor and CLN.nextFor results, cleared whenever a check is made or taken back
  function appId(iconId) { return appOf[iconId] || iconId; }

  // the house voice over the prototype's product copy, in place, so the engine's own references hold (CLC.COPY)
  // (the stories and works keep the record's typography, CLC.KEEP_TYPE)
  function voiced(o, seen, raw) {
    seen = seen || [];
    if (!o || typeof o !== 'object' || seen.indexOf(o) >= 0) return; seen.push(o);
    Object.keys(o).forEach(function (k) { var v = o[k]; if (typeof v === 'string') { var t = window.CLC.voice(v, null, raw); if (t !== v) o[k] = t; } else if (v && typeof v === 'object') voiced(v, seen, raw || !!window.CLC.KEEP_TYPE[k]); });
  }
  function feed(d, corpus, demo) {
    var CLC = window.CLC;
    if (!d.__voiced) { voiced(d); d.__voiced = true; }
    // a second render of the template feeds a second CPD from the same corpus: it keeps the index, and with it
    // every table already built (the ties, the words, the chains), so the first tap pays for none of them again
    var lib = B.lib && B.libOf === corpus ? B.lib : CLC.merge(corpus, demo);
    if (lib !== B.lib) B.derived = CLC.useDerived(lib, loaded && loaded.derived, loaded && loaded.hash);
    CLC.applyVerification(lib, B.ledger);
    B.lib = lib; B.libOf = corpus;
    Object.keys(demo.idmap || {}).forEach(function (pid) { iconOf[pid] = demo.idmap[pid]; appOf[demo.idmap[pid]] = pid; });

    // people from the back end
    ['coaches', 'members', 'order', 'personas', 'msgs'].forEach(function (k) { if (demo[k]) d[k] = demo[k]; });

    // every situation, under the corpus keys
    d.sits = lib.situations.map(function (s) { return { id: s.id, fam: s.fam, key: s.key, chip: s.chip, line: s.line }; });
    d.sit = {}; d.sitByKey = {};
    d.sits.forEach(function (s) { d.sit[s.id] = s; d.sitByKey[s.key] = s; });
    Object.keys(demo.keymap || {}).forEach(function (old) { d.sitByKey[old] = d.sitByKey[demo.keymap[old]]; });

    // every life in the library becomes a hero the prototype can open
    lib.icons.forEach(function (i) {
      if (i.proto && d.hero[i.proto]) return;
      var h = { id: i.id, name: i.name, short: i.name, ini: i.ini, area: i.domainLabel, sex: i.sex, stance: (i.stanceName || '').toLowerCase(),
        desc: i.desc || [i.domainLabel, i.place].filter(Boolean).join(' · '), q: [], canon: false,
        wiki: 'Special:Search?go=Go&search=' + encodeURIComponent(i.name), year: i.year || 0, salient: 0, cross: false };
      d.heroes.push(h); d.hero[h.id] = h;
    });

    // every story, in the prototype's shape
    d.stories = lib.stories.map(function (s) {
      var foreign = s.pattern_lang && s.pattern_lang !== 'en' && s.pattern_en;
      // a story whose dateline gave another year keeps its place and no year (CLC.oneYear): its era would give one
      return { id: s.id, hero: appId(s.icon), place: s.yearClash ? s.place || '' : s.place || s.era || '', keys: s.keys.slice(), reach: s.reach, verified: !!s.verified, checked: !!s.checked,
        moment: CLC.bodyAfterPlace(s.moment, s.placeAsWritten || s.place), pattern: foreign ? s.pattern_en : s.pattern, by: s.by || (foreign ? 'translated; the original is in the Library' : ''),
        why: s.why, source: s.source, caution: s.caution, gist: s.gist || CLC.firstSentence(s.moment), walk: s.walk || '',
        origin: s.origin, deeper: s.deeper || [], status: s.status };
    });
    d.story = {}; d.stories.forEach(function (s) { d.story[s.id] = s; });

    // the record counts the prototype shows ("Stories in the library: 4") now come from the corpus
    d.libOf = function (hid) {
      var own = d.stories.filter(function (s) { return s.hero === hid; }), cov = [];
      own.forEach(function (s) { s.keys.forEach(function (k) { var si = d.sitByKey[k]; if (si && si.id && cov.indexOf(si.id) < 0) cov.push(si.id); }); });
      return { n: own.length, cov: cov, verified: own.filter(function (s) { return s.verified; }).length };
    };
    B.counts = { stories: d.stories.length, lives: lib.icons.length, withStory: lib.icons.filter(function (i) { return i.stories.length; }).length,
      recall: d.stories.filter(function (s) { return s.status === 'recall'; }).length };
  }

  // a coach's source check, arriving from the Library
  function markVerified(id, entry) {
    var lib = B.lib, sid = lib ? window.CLC.resolve(lib, id) : id;
    B.ledger[sid] = entry || { by: 'coach', at: new Date().toISOString() }; fillMemo = {}; if (lib && lib._bridge) lib._bridge.clear();
    // a coach's check makes a story sendable; the rule's own pick for a week stays a story the record held checked
    // (the engine's rule-own), so a check fills only the line a coach sends it to
    if (lib && lib.story[sid] && !lib.story[sid].verified) { lib.story[sid].verified = true; lib.story[sid].status = 'verified'; lib.story[sid].checked = B.ledger[sid]; }
    if (_cpd && _cpd.story[sid] && !_cpd.story[sid].verified) { _cpd.story[sid].verified = true; _cpd.story[sid].status = 'verified'; _cpd.story[sid].checked = true; }
    try { var l = localLedger(); l[sid] = B.ledger[sid]; localStorage.setItem('cl-ledger', JSON.stringify(l)); } catch (e) {}
  }

  function markUnverified(sid) {
    delete B.ledger[sid]; fillMemo = {}; if (B.lib && B.lib._bridge) B.lib._bridge.clear();
    [B.lib && B.lib.story[sid], _cpd && _cpd.story[sid]].forEach(function (s) { if (s && s.status === 'verified' && s.checked) { s.verified = false; s.status = s.origin === 'sample' ? 'sample-draft' : 'recall'; delete s.checked; } });
    try { var l = localLedger(); delete l[sid]; localStorage.setItem('cl-ledger', JSON.stringify(l)); } catch (e) {}
  }

  // ---------- 3 · the Library, from inside the app ----------
  function libSrc(route, as, mid) {
    var st = B.c && B.c.state, th = st && st.theme === 'dark' ? '&theme=dark' : '';
    var core = as === 'member' && st && st.core && st.core.length ? '&core=' + st.core.map(function (h) { return encodeURIComponent(iconOf[h] || h); }).join(',') : '';
    var ask = as === 'coach' && st ? asksOf(st).map(function (g) { return encodeURIComponent(st.p + ':' + g.sid); }).join(',') : '';
    var by = as === 'coach' && st ? '&by=' + encodeURIComponent(consoleCoach(st)) : '';
    return BASE + 'library?embed=1&as=' + as + (mid ? '&m=' + encodeURIComponent(mid) : '') + core + th + by + (ask ? '&asked=' + ask : '') + (route || '#/');
  }
  // The member's Library is one frame for the session. It mounts the first time it opens, then hides and shows, and
  // is sent each page to open (cl:go): so a second open fetches nothing, builds nothing and lands at once, and Back
  // in the app still walks only the pages read since this open. A frame put back where it was (a thread's Back, the
  // same page at the same depth) is left as it is, scroll and all. A new member, three or theme loads it afresh,
  // and so does an open after FRAME_HOPS pages, so a long session never grows one page without end.
  var FRAME_HOPS = 50;
  function libFrame(st, P) {
    var F = B.lx, open = st.overlay === 'library', route = st.libRoute || '#/', key = libSrc('#', 'member', P).replace(/#.*$/, '');
    if (F && !F.el) F.el = document.querySelector('[data-bridge="library-overlay"] iframe');
    if (F && F.el && !F.el.isConnected) F = B.lx = null;   // the member app was taken down (the coach's view): the frame went with it
    var back = F && route === F.at && (st.libDepth || 1) === F.depth;   // the frame put back where it was, scroll and all
    if (open && (!F || F.key !== key || (!F.open && F.hops >= FRAME_HOPS && !back))) {
      var gen = F && F.key === key ? F.gen + 1 : 0;
      return (B.lx = { key: key, gen: gen, src: key + (gen ? '&f=' + gen : '') + route, at: route, depth: 1, hops: 0, open: true, el: null });
    }
    if (!F) return null;
    if (open && !F.open) {
      // what was saved or asked for while the frame was out of sight reaches it before it is shown
      var told = { type: 'cl:state', saved: (st.saved || []).slice(), asked: asksOf(st).map(function (g) { return g.sid; }) };
      if (JSON.stringify(told) !== F.told) { F.told = JSON.stringify(told); frameTell(F, told); }
      if (route === F.at && (st.libDepth || 1) === F.depth) frameTell(F, { type: 'cl:show' }); else frameGo(F, route, true);
    }
    else if (open && F.open && route !== F.at) frameGo(F, route, false);
    F.open = open;
    return F;
  }
  function frameGo(F, route, fresh) { F.at = route; if (fresh) F.depth = 1; frameTell(F, { type: 'cl:go', route: route, fresh: fresh }); }
  // after this render is on screen, so a frame shown again can find its place
  function frameTell(F, m) { setTimeout(function () { var f = F.el || document.querySelector('[data-bridge="library-overlay"] iframe'); if (f && f.contentWindow) f.contentWindow.postMessage(m, location.origin); }, 0); }
  // The trail last read in the Library, as You and This week say it: the last three names, how many stops,
  // how many of its stories are saved, and the page to pick up from
  function trailHome(st, d) {
    var nodes = st.trail && st.trail.nodes; if (!nodes || !nodes.length) return null;
    var last = nodes[nodes.length - 1], stories = nodes.filter(function (n) { return n.kind === 'story'; });
    var sv = stories.filter(function (n) { var id = decodeURIComponent(n.href.replace(/^#\/story\//, '').split('?')[0]); return (st.saved || []).indexOf(id) >= 0; }).length;
    var names = nodes.slice(-3).map(function (n) { return n.label; }).join(' \u2192 ');
    return { last: last, day: d.lab(st.trail.day), names: (nodes.length > 3 ? '\u2026 ' : '') + names,
      count: (st.trail.total || nodes.length) + ((st.trail.total || nodes.length) === 1 ? ' stop' : ' stops') + (sv ? ', ' + sv + ' saved' : ''),
      where: last.kind === 'story' ? 'You were reading ' + last.label + '.' : last.kind === 'icon' ? 'You were reading ' + last.label + '\u2019s life.' : 'You were in the library: ' + last.label + '.' };
  }
  // Where the Library frame returns to when its own pages run out: the word for the Back button and the line
  // Find and send opens on the member's week: their next situation (or the chosen story's own), far stories aside
  function sendEntry(st, to, sid) {
    var lib = B.lib, M = lib && lib.members[to], up = M && M.up19 && lib.sit[M.up19.sit], s = sid && lib && lib.story[window.CLC.resolve(lib, sid)];
    var key = up ? up.key : 'all';
    if (s && s.keys.indexOf(key) < 0) key = s.keys[0];
    return Object.assign({}, st.lib, { to: to || st.lib.to, key: key, reach: 'all', hideFar: true, msg: '' });
  }
  function libHome(st, lib) {
    if (st.libBack === 'story') {
      var sid = lib && window.CLC.resolve(lib, st.sid), s = sid && lib.story[sid], ic = s && lib.icon[s.icon];
      return { word: ic ? surname(ic.name) : 'Story', to: ic ? ic.name + '\u2019s story' : 'the story' };
    }
    if (st.libBack === 'hero') { var hi = lib && lib.icon[iconOf[st.hid] || st.hid]; return { word: hi ? surname(hi.name) : 'Hero', to: hi ? hi.name : 'your hero' }; }
    var t = { week: 'This week', ask: 'Ask', heroes: 'Heroes', you: 'You' }[st.tab] || 'This week';
    return { word: t, to: t };
  }
  // What the library holds for one of a member's heroes, one status in one sentence, as Heroes and M4 both say it: checked
  // stories, drafts waiting for the coach's check, or with none, who stands in for them, said truly (CLN.fitLine)
  function heroStatus(lib, P, hid, cf) {
    var L = _cpd.libOf(hid), v = L.verified, w = L.n - v;
    return !L.n ? (window.CLN ? window.CLN.fitLine(lib, P, hid, { coach: cf }) : '')
      : !v ? (w === 1 ? '1 story in the library, waiting for ' : w + ' stories in the library, waiting for ') + cf + '\u2019s check.'
      : v + (v === 1 ? ' story' : ' stories') + ' in the library' + (w ? ', and ' + w + ' more waiting for ' + cf + '\u2019s check.' : '.');
  }
  function iconRoute(heroId) { return '#/icon/' + encodeURIComponent(iconOf[heroId] || heroId); }

  // ---------- 2 · wrap the engine's view ----------
  var DRAFT = 'Draft — must verify';
  // The rule's trace as a coach reads it: one sentence a line, no precedence numbers or tie-breaks
  function traceWords(lines, r, lib, d) {
    var M = lib.members[r.mid] || {}, first = M.first || 'the member', sit = lib.sit[String(r.key || '').split(' \u00b7 ')[0]];
    var heroOf = function (x) { return String(x).trim(); }, out = [];
    // a life the member had in the last fortnight, by its whole name and the day, as the line says it ("Sarah had Barack
    // Obama on 12 Oct"), never "Obama" beside Michelle Obama
    var hadWords = function (who, n) {
      var h = Object.keys(d.hero).map(function (k) { return d.hero[k]; }).filter(function (x) { return x.short === who; })[0], nm = h ? h.name : who;
      var y = h && window.CLQ ? window.CLQ.recentTo(lib, r.mid).filter(function (z) { return z.icon === (iconOf[h.id] || h.id); })[0] : null;
      return first + ' had ' + nm + (y ? ' on ' + String(y.day).replace(/^\w{3} /, '') : ' ' + n + ' days ago');
    };
    lines.forEach(function (t) {
      if (typeof t !== 'string') { out.push(t); return; }
      var m, x = t.replace(/^rule: /, '');
      if (/^tie-break|^extended: none/.test(x)) return;
      if ((m = /^coach (pinned|swapped)/.exec(x))) return out.push('You ' + m[1] + ' it; your choice wins.');
      if (/^\u2713 situation /.test(x)) return out.push(sit ? 'It carries ' + sit.id + ' \u00b7 ' + sit.chip + '.' : 'It carries the week\u2019s situation.');
      if (/^\u2713 verified/.test(x)) return out.push('It is checked against its source.');
      if ((m = /^\u2713 hero: core \((.+)\)/.exec(x))) return out.push(heroOf(m[1]) + ' is one of ' + first + '\u2019s three.');
      if ((m = /^\u2713 extended \((.+)\)/.exec(x))) return out.push(heroOf(m[1]) + ' is on ' + first + '\u2019s wider list.');
      if ((m = /^\u2713 library \((.+)\)/.exec(x))) return out.push('From the library: ' + heroOf(m[1]) + '.');
      if (/^core heroes: none eligible/.test(x)) return out.push('None of ' + first + '\u2019s three has a checked story for this.');
      if ((m = /^\u2713 reach (\w+)/.exec(x))) return out.push(m[1] === 'near' ? 'Close to an ordinary office.' : m[1] === 'mid' ? 'Some way from an office.' : 'Far from an office.');
      if ((m = /^\u00b7 skipped ([^:]+): (.+)$/.exec(x))) {
        var who = m[1], why = m[2], k;
        if ((k = /sent (\d+) days ago/.exec(why))) return out.push(hadWords(who, k[1]) + ', so the rule skipped that life this week.');
        if ((k = /^Already sent (.+)$/.exec(why))) return out.push('That story went to ' + first + ' on ' + k[1] + ', so the rule skipped it.');
        if (/not for me/.test(why)) return out.push(first + ' said \u201cnot for me\u201d to ' + who + '\u2019s story.');
        if (/^Far/.test(why)) return out.push(who + '\u2019s story is far from an office: Ask can still answer with it.');
        if (/scoped to/.test(why)) return out.push(why.replace(/ is scoped to /, ' is kept for ') + '.');
        return out.push(who + ': ' + why + '.');
      }
      if ((m = /^\u00b7 (\d+) recall drafts? also carr/.exec(x))) return out.push(m[1] + (m[1] === '1' ? ' recall draft also carries it, waiting for a check.' : ' recall drafts also carry it, each waiting for a check.'));
      if ((m = /nothing eligible: (.+)$/.exec(x))) {
        if (/every candidate is a recall draft/.test(m[1])) return out.push('Nothing checked carries this yet.');
        return out.push('Nothing checked can go: ' + m[1].split('; ').map(function (why) {
          var k = /^(.+) sent (\d+) days ago/.exec(why); if (k) return hadWords(k[1], k[2]);
          k = /^Already sent (.+)$/.exec(why); if (k) return 'one went to ' + first + ' on ' + k[1];
          return why.replace(/ \(no hero twice in 14 days\)/, '');
        }).join('; ') + '.');
      }
      out.push(x);
    });
    return out;
  }
  function collapseTrace(lines) {
    var n = 0, out = [];
    lines.forEach(function (t) {
      if (typeof t !== 'string') { out.push(t); return; }
      if (t.indexOf(DRAFT) >= 0 && /skipped/.test(t)) { n++; return; }
      if (t.indexOf('nothing eligible') >= 0) {
        var at = t.indexOf(': ', t.indexOf('nothing eligible')), head = t.slice(0, at + 2), parts = t.slice(at + 2).split('; '), k = parts.filter(function (p) { return p.indexOf(DRAFT) >= 0; }).length;
        n += k; parts = parts.filter(function (p) { return p && p.indexOf(DRAFT) < 0; });
        t = head + (parts.length ? parts.join('; ') : 'every candidate is a recall draft');
      }
      out.push(t);
    });
    if (n) out.push('· ' + n + ' recall draft' + (n === 1 ? '' : 's') + ' also carr' + (n === 1 ? 'ies' : 'y') + ' this key, waiting for a source check in the Library');
    return out;
  }

  function wrap(cpe) {
    if (cpe.__bridged) return;
    cpe.__bridged = true;
    var vals0 = cpe.vals;
    cpe.vals = function (c) {
      var out = vals0(c);
      B.c = c;
      try { decorate(c, out); } catch (e) { if (!B._warned) { B._warned = 1; console.error(e); } B.errors.push('decorate: ' + e.message); }
      return out;
    };
  }

  // ---------- frames at true size ----------
  // The export shrinks a device to fit the window's height, so on a 1280 x 800 laptop the phone's body
  // copy reads at 84% and the coach console's 11px labels at 9px. Hold the scale at 1 whenever the
  // window is wide enough, and let the frame be shorter instead (down to three quarters of its height,
  // or 70% for the console) before any type shrinks. The console also takes the window's own width,
  // between 960 and 1440, and reflows in it, so a laptop reads its type at the size it was set.
  var DEVICE = { phone: [390, 844, 10], tabP: [834, 1194, 14], tabL: [1194, 834, 14], desk: [1280, 800, 0] };
  function fitFrames(st, out) {
    var vw = st.vw, vh = st.vh;
    var dv = DEVICE[st.device];
    if (out.dvf && dv) {
      var pad = dv[2] ? 40 + dv[2] * 2 : 32, avail = vh - 52 - 36, iw = dv[0];
      var s = Math.min(1, (vw - pad) / iw), ih = Math.min(dv[1], Math.max(Math.round(dv[1] * 0.75), Math.floor(avail / s)));
      if (ih * s > avail) s = Math.max(0.2, avail / ih);
      out.dvf.s = s; out.dvf.ih = ih; out.dvf.w = Math.round(iw * s); out.dvf.h = Math.round(ih * s);
    }
    if (out.cf) {
      var tab = st.cdev === 'tab', bz = tab ? 14 : 0, cpad = bz ? 40 + bz * 2 : 32, cav = vh - 52 - 28;
      // the console takes the window's width down to 960px and reflows there, so its 12px type is never drawn smaller
      var ciw = tab ? 1194 : Math.max(960, Math.min(1440, vw - cpad)), cih0 = tab ? 834 : 900;
      var cs = Math.min(1, (vw - cpad) / ciw), cih = Math.min(cih0, Math.max(Math.round(cih0 * 0.7), Math.floor(cav / cs)));
      if (cih * cs > cav) cs = Math.max(0.2, cav / cih);
      out.cf.s = cs; out.cf.iw = ciw; out.cf.ih = cih; out.cf.w = Math.round(ciw * cs); out.cf.h = Math.round(cih * cs);
    }
  }

  // ---------- the demo bar at every width ----------
  // Eleven numbered pills, a date line and six labelled buttons fit an 1880 window and nothing narrower:
  // at 1280 the pills were cut to "0 · 11", at 320 half the bar was off screen. Below 1880 the clock
  // becomes one stepper (back, "3 / 11", the moment, forward); below 1100 the personas drop their ages.
  // Below 600 the bar keeps only the wordmark, the stepper and a Demo button; everything else moves
  // into a sheet under the bar, and on a phone the member app fills the screen with no device drawn
  // around it, because the phone in the hand is the device.
  var PHONE = 600;
  function fitBar(c, st, out) {
    var vw = st.vw, n = (out.steps || []).length, i = st.clock || 0;
    var wide = vw >= 1880, phone = vw < PHONE, open = !!(phone && st.barSheet);
    var S = function (p) { c.setState(p); }, shut = function (f) { return function () { S({ barSheet: false }); f(); }; };
    out.wide = wide; out.wideDisp = wide ? 'inline' : 'none';
    out.narrow = vw < 1000 && !phone;
    (out.devs || []).forEach(function (dv) { dv.disp = wide ? 'inline' : 'none'; });
    var people = (out.personas || []).map(function (p) { return { name: p.label, sub: p.title, go: shut(p.go), bg: p.bg, fg: p.fg, on: p.on }; });
    (out.personas || []).forEach(function (p) { if (vw < 1100) p.label = p.label.split(',')[0]; });
    out.bar = {
      fit: phone ? 'phone' : 'full', phone: phone, sheet: open,
      toggle: function () { S({ barSheet: !st.barSheet }); }, close: function () { S({ barSheet: false }); },
      menuBg: open ? 'var(--ink)' : 'transparent', menuFg: open ? 'var(--paper)' : 'var(--ink)',
      brandDisp: vw >= 360 ? 'block' : 'none', gap: vw >= 1000 ? 14 : 8, pad: vw >= 480 ? 18 : 12,
      pillsDisp: wide ? 'flex' : 'none', compact: !wide, clockMin: wide ? '0' : 'min-content',
      clockWord: vw >= 2000, clockLine: wide,
      step: (i + 1) + ' / ' + n, label: out.clockLabel || '', labelOn: vw >= 1000,
      labelMax: vw >= 1300 ? 300 : vw >= 1150 ? 200 : 130,
      prevOp: i <= 0 ? '0.4' : '1', nextOp: i >= n - 1 ? '0.4' : '1',
      people: people,
      devs: (out.devs || []).map(function (dv) { return { label: dv.label, icon: dv.icon, title: dv.title, go: shut(dv.go), bg: dv.bg, fg: dv.fg }; }),
      steps: (out.steps || []).map(function (s, j) { var on = j === i; return { n: s.n, title: s.title.replace(/^\S+ · /, ''), go: shut(s.go), bg: on ? 'var(--well)' : 'transparent', weight: on ? 500 : 400 }; }),
      toMember: shut(out.toMember), toCoach: shut(out.toCoach), theme: shut(out.toggleTheme), reset: shut(out.reset),
      coachSmall: phone && st.role === 'coach'
    };
    if (phone && st.role === 'member' && st.device === 'phone' && out.dvf) {
      var h = st.vh - 52;
      out.dvf.s = 1; out.dvf.iw = vw; out.dvf.ih = h; out.dvf.w = vw; out.dvf.h = h;
      out.dvf.r = 0; out.dvf.shadow = 'none'; out.dvf.status = false; out.dvf.top = 0; out.dvf.ob = vw;
      if (out.col) out.col.max = vw;
    }
  }

  function decorate(c, out) {
    var st = c.state, d = _cpd, S = function (p) { c.setState(p); };
    var P = st.p, lib = B.lib;
    fitFrames(st, out);
    fitBar(c, st, out);
    // a banner that arrives while a story, a hero or the Library is open waits until it closes, so it
    // never sits over the back button
    if (st.overlay && out.nt) out.nt.show = false;
    if (!lib) return;
    var nStories = d.stories.length, nLives = B.counts.withStory;
    var hasBack = function (b) { return b || !out.lg; };

    // member: the Library as an overlay, in one frame for the session (libFrame)
    out.ov.library = st.overlay === 'library';
    var LF = libFrame(st, P);
    // the frame lives in the detail pane: the pane stays while the frame is kept, out of sight with nothing open
    if (out.pane) out.pane.disp = 'block';
    if (LF && out.ov) { out.ov.any = true; if (out.pane && !st.overlay) out.pane.disp = 'none'; }
    // Back walks the pages read in the frame one at a time, then returns to where the Library was opened
    // from; the header says which, so Back is never a guess
    var depth = st.libDepth || 1, home = libHome(st, lib), canBack = depth > 1 || hasBack(st.libBack);
    out.lx = {
      mounted: !!LF, disp: out.ov.library ? 'flex' : 'none', src: LF ? LF.src : '',
      back: function () {
        var f = depth > 1 && document.querySelector('[data-bridge="library-overlay"] iframe');
        if (f && f.contentWindow) f.contentWindow.postMessage({ type: 'cl:back' }, location.origin);
        else { S({ overlay: st.libBack || null, libDepth: 0 }); if (st.libBack) toTop(B.libFromTop); }
      },
      backIcon: canBack ? 'ph ph-caret-left' : 'ph ph-x',
      backText: depth > 1 ? st.libPrev || 'Back' : canBack ? home.word : '',
      backLabel: depth > 1 ? 'Back to ' + (st.libPrevTo || st.libPrev || 'the page before') : canBack ? 'Back to ' + home.to : 'Close the library',
      title: st.libTitle || 'Library',
      // Browse opens the library's front page in the frame, where search and the ways in are
      canBrowse: (st.libRoute || '#/').replace(/\?.*$/, '') !== '#/', browse: function () { S({ libRoute: '#/' }); }
    };
    var openLib = function (route, back) { return function () { B.libFromTop = readerTop(); S({ overlay: 'library', libRoute: route, libBack: back || null, libDepth: 1, libPrev: '', libPrevTo: '' }); }; };
    if (out.hz) {
      out.hz.explore = openLib('#/', null);
      out.hz.exploreLine = nStories + ' stories from ' + nLives + ' lives. Start from your three and follow the trail.';
      // where the three stand among the member's own situations, said in one line, and the picture a tap away
      out.hz.near = openLib('#/near', null);
      var nb = window.CLN ? window.CLN.near(lib, P, { three: (st.core || []).map(function (h) { return iconOf[h] || h; }) }) : null;
      var held = nb ? nb.three.filter(function (h) { return nb.lives.some(function (l) { return l.id === h && l.held.length; }); }).length : 0;
      out.hz.nearLine = !nb ? '' : held === nb.three.length ? 'All three of your heroes have stood in your situations.' : held ? held + ' of your three ' + (held === 1 ? 'has' : 'have') + ' stood in your situations. See who stands near the others.' : 'None of your three has stood in your situations yet. See who stands near them.';
      // each of the three says what the library holds for them: checked stories, and drafts waiting for the coach
      var cf = out.coach && out.coach.first ? out.coach.first : 'your coach';
      (out.hz.core || []).forEach(function (h, i) {
        var hid = (st.core || [])[i], L = hid && d.libOf(hid); if (!L) return;
        var v = L.verified, w = L.n - v;
        h.libLine = heroStatus(lib, P, hid, cf);
        // one status on a card: until a story has come, what the library holds for them, said once; once one has, what came
        // and what more the library holds, in one line
        if (h.count === 'No stories yet') {
          h.count = '';
          if (!h.helps || /^Nothing paired yet/.test(h.helps.text)) { h.helps = { text: h.libLine, c: 'var(--mute)' }; h.libLine = ''; }
        } else if (/^\d+ stor(?:y|ies) received$/.test(h.count || '') && L.n) {
          var got = +h.count.split(' ')[0], more = Math.max(0, v - got);
          h.libLine = (got === 1 ? '1 story received' : got + ' stories received') + (more || w ? '. ' + (more ? more + ' more checked' : '') + (more && w ? ' and ' : '') + (w ? w + ' waiting for ' + cf + '\u2019s check' : '') : '') + '.';
          h.count = '';
        }
      });
    }
    // the final four: a hero with no story says who stands in for them, truly (CLN.fitLine); the bracket says its own counts
    if (st.m === 'M4' && out.ff && window.CLN) {
      var ff4 = (st.picks || []).length === 12 ? st.picks.slice(8) : [];
      // each of the four says what the library holds for them in the words Heroes uses
      out.ff.forEach(function (h, i) { if (ff4[i]) h.libLine = heroStatus(lib, P, ff4[i], (out.coach && out.coach.first) || 'your coach'); });
    }
    if (st.m === 'M2' && _cpe && _cpe.dbg) bracketWords(st, out);
    if (st.overlay === 'hero' && st.hid && out.hv) {
      var hh = d.hero[st.hid], n = d.libOf(st.hid).n;
      out.hv.explore = openLib(iconRoute(st.hid), 'hero');
      out.hv.exploreLabel = n ? 'Explore ' + hh.short + ' in the library · ' + n + (n === 1 ? ' story' : ' stories') : 'Explore ' + hh.short + ' in the library';
    }
    if (st.overlay === 'story' && st.sid && out.sv) {
      out.sv.explore = openLib('#/story/' + encodeURIComponent(st.sid), 'story');
      out.sv.exploreShow = st.role === 'coach';   // a member reaches the library from Others who lived this week
      out.sv.exploreLabel = 'Follow this story into the library';
      relatedStory(c, out, st, lib);
    }
    if (st.overlay === 'hero' && st.hid && out.hv) relatedHero(c, out, st, lib);
    if (st.role === 'member' && out.ak && out.ak.confirm) askChoices(c, out, st, lib);
    if (st.role === 'member' && out.ak && out.ak.answer) askAnswer(c, out, st, lib);
    // You: the member's own ways into the library, each said in one line
    if (out.yu && window.CLN) {
      var mem = lib.members[P], core3 = (st.core || []).map(function (h) { return iconOf[h] || h; }), rows = [];
      var A = mem && mem.age ? window.CLN.atAge(lib, P, { three: core3 }) : null;
      if (A) rows.push({ icon: 'ph ph-hourglass-medium', title: 'At your age', line: A.near.length + ' stories in your situations happened to someone within three years of ' + A.age + '.', go: openLib('#/age', null) });
      rows.push({ icon: 'ph ph-books', title: 'The whole library', line: nStories + ' stories from ' + nLives + ' lives.', go: openLib('#/', null) });
      var tr = trailHome(st, d);
      if (tr) rows.unshift({ icon: 'ph ph-path', title: 'Your last trail · ' + tr.day, line: tr.names + '. ' + tr.count + '. Pick up where you left off.', go: openLib(tr.last.href, null) });
      var wait = asksOf(st).filter(function (g) { return d.story[g.sid] && !d.story[g.sid].verified; }), cf0 = (out.coach && out.coach.first) || 'your coach';
      if (wait.length) rows.unshift({ icon: 'ph ph-hourglass-medium', title: 'Waiting for ' + cf0 + '\u2019s check', line: wait.map(function (g) { var w = String(d.story[g.sid].place || '').replace(/^The\s+(?=\S)/, 'the '); return d.story[g.sid].hero ? d.hero[d.story[g.sid].hero].name + (w ? ', ' + w : '') : g.sid; }).join('; ') + '. You asked on ' + d.lab(wait[0].day) + '.',
        go: function () { openStoryHere(c, wait[0].sid); } });
      out.yu.lib = rows;
    }
    // This week: once the member has read in the Library, where they were
    if (out.wk && out.wk.live) {
      var tw = trailHome(st, d), notes = [], cf1 = (out.coach && out.coach.first) || 'Your coach';
      asksOf(st).forEach(function (g) {
        var s1 = d.story[g.sid]; if (!s1 || !s1.verified || (st.checkSeen || []).indexOf(g.sid) >= 0) return;
        notes.push({ icon: 'ph ph-seal-check', text: cf1 + ' checked ' + d.hero[s1.hero].name + '\u2019s story.', cta: 'Read it', go: function () { c.setState({ checkSeen: (c.state.checkSeen || []).concat([g.sid]) }); openStoryHere(c, g.sid); } });
      });
      // the trail, unless its last page is a story the member has already read here
      var lastSid = tw && tw.last.kind === 'story' ? window.CLC.resolve(lib, decodeURIComponent(tw.last.href.replace(/^#\/story\//, '').split('?')[0])) : null;
      if (tw && !(lastSid && (st.opened || []).some(function (x) { return window.CLC.resolve(lib, x) === lastSid; }))) notes.push({ icon: 'ph ph-path', text: tw.where, cta: 'Pick up there', go: openLib(tw.last.href, null) });
      out.wk.notes = notes;
      // prep: no dead button until it opens, only the day it opens, for the room it is for ("Prep for Thursday’s product
      // review opens Wednesday.")
      var WD = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], ev = WD.indexOf(String(out.wk.coming || '').split(' ')[0]);
      var rmW = roomOf(lib, P, (d.clock[st.clock] || d.clock[0]).day >= 19 ? 1 : 0);
      out.wk.prepOpen = !out.wk.prepDis && !passed0(st, d);
      if (out.wk.prepDis) out.wk.prepHint = ev >= 0 ? 'Prep ' + (rmW ? 'for ' + WD[ev] + '’s ' + rmW + ' ' : '') + 'opens ' + WD[(ev + 6) % 7] + '.' : 'Prep opens the day before.';
      // the story card names the hero once: "From Obama, one of your three", then the place
      if (out.wk.hasStory && out.wk.ins && /^From one of your three/.test(out.wk.ins.eyebrow) && out.wk.story) {
        out.wk.ins = Object.assign({}, out.wk.ins, { eyebrow: 'From ' + out.wk.story.hero + ', one of your three' });
        out.wk.story = Object.assign({}, out.wk.story, { eyebrow: out.wk.story.place });
      }
      // a coach's choice "close to" a hero nobody in the library is tied to is said as the coach's choice: the library
      // holds no tie that would make it close
      var cl = out.wk.hasStory && out.wk.ins && /^From someone close to your three · close to (.+)$/.exec(out.wk.ins.eyebrow || ''), clI = cl && lib.icons.filter(function (i) { return i.name === cl[1]; })[0];
      if (clI && window.CLN && !window.CLN.kindred(lib, clI.id, 1).length) out.wk.ins = Object.assign({}, out.wk.ins, { eyebrow: cf1 + ' chose this' });
      // a coach's note is written for one story: once a check has put another in the first week, the note stays with the
      // story it was written for, and the card carries none
      var kw = (d.clock[st.clock] || d.clock[0]).day, wi = kw >= 19 ? 1 : 0, rec = ((lib.members[P] || {}).micro || [])[wi], nowW = (st.micro || [])[wi];
      if (wi === 0 && out.wk.hasNote && out.wk.story && rec && rec.ins && window.CLC.resolve(lib, rec.ins.story) !== window.CLC.resolve(lib, out.wk.story.id)) {
        var wsid = out.wk.story.id; out.wk.hasNote = false; out.wk.note = '';
        out.wk.open = function () { var s0 = c.state; c.setState({ overlay: 'story', sid: wsid, sctx: {}, notForMe: false, opened: s0.opened.indexOf(wsid) >= 0 ? s0.opened : s0.opened.concat([wsid]) }); };
      }
      // once the week's room has passed, This week says it happened and offers no prep
      var roomDay = kw >= 19 ? 22 : 15, passed = kw > roomDay || (kw === roomDay && (d.clock[st.clock] || d.clock[0]).hm >= '15:00');
      out.wk.comingHead = passed ? 'Done' : 'Coming up';
      if (passed) { out.wk.prepOpen = false; out.wk.prepDis = false; }
    }
    stackBack(c, out, st);
    // the run sheet an hour before the room: the time on the 24-hour clock, and the whole move, asking whether a step due
    // the day before was taken
    if (out.pr && st.mv) {
      out.pr.when = String(out.pr.when || '').replace(/\b2pm\b/, '14:00');
      var dayBefore = /\bthe day before\b/i.test(st.mv.behaviour || ''), today = /^Today/.test(out.pr.when);
      out.pr.move = st.mv.behaviour + (dayBefore && today ? ' Did it go yesterday?' : '');
    }
    // plain words for the clock and an empty week
    if (typeof out.countdown === 'string') out.countdown = out.countdown.replace(/^Auto-send in (?:(\d+) days? )?(\d+) h$/, function (m0, dd, hh) {
      var p = []; if (+dd) p.push(dd + (+dd === 1 ? ' day' : ' days')); if (+hh || !p.length) p.push(hh + (+hh === 1 ? ' hour' : ' hours'));
      return 'Sends in ' + p.join(' and ');
    }).replace(/^Sent Sunday 18:00$/, 'Sent on Sunday at 18:00');
    if (out.wk && /^No story paired yet\. /.test(out.wk.nothingText || '')) out.wk.nothingText = out.wk.nothingText.replace(/^No story paired yet\. /, 'No story yet. ');
    // the week's move names the person it is for ("Give Dan the account"), wherever the member reads it
    var named = (lib.members[P] || {}).microNamed;
    if (named && st.micro) {
      var say = function (t) { var hit = st.micro.filter(function (m) { return m.b === t && named[m.w]; })[0]; return hit ? named[hit.w] : t; };
      if (out.wk && out.wk.micro) out.wk.micro = say(out.wk.micro);
      if (typeof out.ak.move === 'string') out.ak.move = say(out.ak.move);
      (out.hz && out.hz.core || []).forEach(function (h) { if (h.helps && /^Helps with: /.test(h.helps.text)) h.helps = { text: 'Helps with: ' + say(h.helps.text.slice(12)), c: h.helps.c }; });
    }
    // the move as its headline, whole ("Send one paragraph with a position in it to one person, the day before the meeting."),
    // then this week's step of it ("Week 1 of 6: send it to one person."), and in the first week what the six weeks are for;
    // the coach's preview of the Monday card says the same
    if (out.wk && st.mv && /Week \d+ of \d+/.test(out.wk.weekN || '')) {
      var wn = /Week (\d+) of (\d+)/.exec(out.wk.weekN);
      out.wk.weekLine = 'Week ' + wn[1] + ' of ' + wn[2] + ': ' + window.CLC.lowerFirst(out.wk.micro || '');
      out.wk.habit = wn[1] === '1' ? window.CLC.cap1(window.CLC.num(+wn[2])) + ' weeks to make this a habit.' : '';
      out.wk.weekN = 'Your move'; out.wk.micro = st.mv.behaviour;
    }
    if (out.mv && st.mv && st.micro && st.micro[0]) {
      out.mv.prevWeek = 'Your move'; out.mv.prevMicro = st.mv.behaviour;
      out.mv.prevLine = 'Week ' + st.micro[0].w + ' of 6: ' + window.CLC.lowerFirst(((lib.members[P] || {}).microNamed || {})[st.micro[0].w] || st.micro[0].b || '');
    }
    // while you wait: a held week still opens the corpus, with the story that fits the member best (CLN.fitFor, the
    // ranker the story's Next uses), the week's situation named first; a tap opens it, and Back returns here
    if (out.wk && out.wk.live && out.wk.held && window.CLN && P && lib.members[P]) {
      var Mw = lib.members[P], kd0 = (d.clock[st.clock] || d.clock[0]).day, rv0 = (st.review || {})[P] || {};
      var keys0 = (kd0 >= 19 && Mw.up19 ? [Mw.up19.sit] : st.mv && st.mv.sit ? [st.mv.sit] : []).concat(Mw.sits || []).map(function (id) { return lib.sit[id] && lib.sit[id].key; }).filter(Boolean);
      // what they have read here goes too, as it does from Next
      var read0 = (st.opened || []).map(function (x) { return window.CLC.resolve(lib, x); });
      var got = fitOf(lib, P, Object.assign(asNow(st, lib), { three: coreIcons(st), extended: addedIcons(st), keys: keys0, now: keys0[0], exclude: hasAlready(st, lib).concat(rv0.story ? [rv0.story] : [], read0), avoidIcons: recentIcons(lib, P), n: 1 }))[0];
      if (got && d.story[got.story.id]) {
        var gS = got.story, cfw = (out.coach && out.coach.first) || 'your coach';
        var gAt = gS.place || (gS.yearClash ? '' : window.CLC.yearLabel(gS.year));
        out.wk.wait = { title: lib.icon[gS.icon].name + (gAt ? ' · ' + gAt : ''),
          line: (gS.verified ? 'Checked. ' : 'Recall draft. ' + cfw + ' checks it before it is sent. ') + got.why,
          go: function () { B.weekTop = weekTop(); openStoryHere(c, gS.id); } };
      }
    }
    // the reader's place: a story opened from another starts at its top, and Back returns each page where it was left
    if (st.overlay === 'thread' && st.threadBack && out.th) {
      var tb = st.threadBack;
      out.th.back = function () { S(Object.assign({ threadBack: null }, tb)); };
      out.th.backIcon = 'ph ph-arrow-left'; out.th.backLabel = 'Back to ' + (tb.libTitle || 'the library');
    }

    // coach: Library opens on Explore; the send screen is one tab along
    var onLib = st.c === 'C4' || st.c === 'CX';
    (out.nav || []).forEach(function (n) {
      if (n.label !== 'Library') return;
      n.bg = onLib ? 'var(--well)' : 'transparent'; n.fg = onLib ? 'var(--ink)' : 'var(--mute)';
      n.go = function () { S({ c: 'CX', swapFor: null }); };
    });
    out.cs.CX = st.c === 'CX';
    // a member's asks for a check, where the coach looks: Members and Review
    var pendingAsks = asksOf(st).filter(function (g) { return d.story[g.sid] && !d.story[g.sid].verified; });
    var askedLine = function (M, n) {
      var who = M ? M.first : 'A member', g = pendingAsks[0], s1 = g && lib.story[window.CLC.resolve(lib, g.sid)];
      if (n === 1 && s1) return who + ' asked you to check ' + lib.icon[s1.icon].name + ', ' + window.CLC.yearLabel(s1.year) + '. It is first on Source checks.';
      return who + ' asked you to check ' + window.CLC.num(n) + ' stories. They are first on Source checks.';
    };
    if (pendingAsks.length) (out.ro || []).forEach(function (r) { if (r.mid === P) r.last = 'Asked for ' + (pendingAsks.length === 1 ? '1 check' : pendingAsks.length + ' checks'); });
    // Review stays honest: a row that shows a recall draft cannot be approved, and a row with nothing to send
    // (or a draft) offers the one check that fills it, done in the row (lib/net.js nextFor)
    var onReview = st.role === 'coach' && st.c === 'C3';
    if (out.rq && out.rq.rows && window.CLN) {
      var short = function (id) { var I = lib.icon[id]; return I ? (I.short || I.name) : id; };
      out.rq.rows.forEach(function (r) {
        r.asked = r.mid === P && pendingAsks.length ? askedLine(lib.members[P], pendingAsks.length) : '';
        var sitId = String(r.key || '').split(' · ')[0], sit = lib.sit[sitId], M = lib.members[r.mid]; if (!sit || !M) return;
        r.key = sit.id + ' \u00b7 ' + sit.chip;   // one name for a situation everywhere
        // the rule's fortnight, said on the row: a life the member had last fortnight waits, whatever chose it
        var recent = window.CLQ ? window.CLQ.recentTo(lib, r.mid) : [], avoid = recent.map(function (x) { return x.icon; });
        var rowS = r.s && r.s.id && lib.story[window.CLC.resolve(lib, r.s.id)], rowIc = rowS ? rowS.icon : null, had = rowIc ? recent.filter(function (x) { return x.icon === rowIc; })[0] : null;
        r.guard = had ? M.first + ' had ' + lib.icon[rowIc].name + ' on ' + String(had.day).replace(/^\w{3} /, '') : '';
        var shownDraft = r.has && r.s && !r.s.verified, ap = r.btns && r.btns[0];
        if ((shownDraft || r.guard) && ap && !ap.dis) { ap.dis = true; ap.op = 0.4; ap.title = shownDraft ? 'The story shown is a recall draft. Check its source first.' : r.guard + '.'; ap.go = function () {}; }
        // a check is asked for only where it would let the story go
        r.pairNote = shownDraft && !r.guard ? 'Recall draft: check its source before it goes.' : '';
        // the search for the draft that fills a slot is the costly part: done only in the coach's console, and remembered.
        // The week's one answer (CLN.nextFor) is the line's, its Details', the Ask reply's and the plan's
        if (!(r.none || shownDraft || r.guard) || st.role !== 'coach') return;
        var shownId = shownDraft ? window.CLC.resolve(lib, r.s.id) : null, shownIc = shownId && lib.story[shownId] ? lib.story[shownId].icon : null;
        var f = weekAnswer(st, lib, r, { prefer: shownIc && avoid.indexOf(shownIc) < 0 ? shownId : null });
        // a checked story that carries the week and could go today: no check needed
        if (f.ready) { var R0 = f.ready.story, RI = lib.icon[R0.icon];
          r.ready = { id: R0.id, icon: R0.icon, title: window.CLC.storyTitle(lib, R0), name: RI.name, go: sendNow(c, r.mid, R0.id) }; }
        if (!f.pick) return;
        var x = f.pick, first = M.first, poss = first + '’s';
        var why = x.links === 0 ? 'From one of ' + poss + ' three.' : x.links === 1 ? 'One step from ' + short(x.hero) + ': ' + window.CLN.why(lib, x.steps[0].a, x.steps[0].b, x.steps[0].tie)[0].replace(/^Both /, 'both ') : (x.links < 9 ? window.CLC.cap1(window.CLC.num(x.links)) + ' steps from ' + poss + ' three.' : 'Not near ' + poss + ' three.');
        var open = st.fillOpen === r.mid;
        r.none = false;   // the check card below says what the week holds
        r.fill = { id: x.story.id, icon: x.story.icon, title: window.CLC.storyTitle(lib, x.story), why: why + ' Carries ' + sit.id + ' · ' + sit.chip + '. ' + window.CLC.REACH_WORD[x.story.reach] + '. Recall draft.',
          checkLabel: open ? 'Close' : 'Check the source here', open: open, card: open ? checkCard(c, x.story.id, r.mid, 'row') : null,
          bg: open ? 'transparent' : 'var(--ink)', fg: open ? 'var(--ink)' : 'var(--paper)', bd: open ? '1px solid var(--hair)' : '0',
          check: function () { S({ fillOpen: open ? null : r.mid }); }, read: function () { S({ c: 'CX', cm: r.mid, cxRoute: '#/story/' + encodeURIComponent(x.story.id) }); },
          hasNext: f.next.length > 0, next: f.next.length ? 'Also near: ' + f.next.map(function (y) { return lib.icon[y.story.icon].name + (y.links === 0 ? ' (one of the three)' : y.links === 1 ? ' (one step away)' : y.links < 9 ? ' (' + window.CLC.num(y.links) + ' steps away)' : ''); }).join(', ') + '.' : '' };
      });
    }
    // "Your week, Jim": one line per member of the coach whose console this is (a switch shows everyone), each
    // with when they meet, their week, what goes, the guard, an open Ask, and one action; a line folds open onto
    // the row as it was. The lines that wait for a check come first, then by the day of the member's week. Every
    // count of the queue (the 18:00 notice, Members, Review, the badge) comes from queueOf, so they agree. Below the
    // lines, the checks for the weeks ahead, after this week's (CLN.checkPlan).
    if (out.rq && out.rq.rows && window.CLN) {
      var C = window.CLC, cc = consoleCoach(st), CC = lib.coaches[cc] || { first: 'you' }, all = !!st.rvAll;
      var mineM = function (mid) { return (lib.members[mid] || {}).coach === cc; };
      var clip = function (t, n) { t = String(t).trim(); return t.length <= n ? t : t.slice(0, t.lastIndexOf(' ', n - 1) > n / 2 ? t.lastIndexOf(' ', n - 1) : n - 1) + '\u2026'; };
      var dayNow = (d.clock[st.clock] || d.clock[0]).day, shown = function (m) { return m.live || m.day <= dayNow; };
      var hm = function (x) { var m = /^(\w{3}) \d+ \w{3}, (\d\d:\d\d)$/.exec(String(x || '')); return m ? m[1] + ' ' + m[2] : ''; };
      var firstOf = function (mid) { return (lib.members[mid] || {}).first || mid; }, andList = function (a) { return a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; };
      var prepFor = function (mid) {
        if (!mineM(mid)) return null;
        return mid === P ? function () { S({ c: 'C7', cm: P }); } : function () { S({ c: 'CX', cm: mid, cxRoute: '#/member/' + encodeURIComponent(mid) }); };
      };
      var openAsk = function (mid) {
        var l = (st.msgs[mid] || []).filter(shown), asks = l.filter(function (m) { return m.from === 'member' && m.kind === 'ask' && !l.some(function (x) { return x.from === 'coach' && x.replyTo === m.id; }); });
        return asks[asks.length - 1] || null;
      };
      // the coach's last answer to an Ask, with the story it sent
      var answeredAsk = function (mid) {
        var l = (st.msgs[mid] || []).filter(shown), ans = l.filter(function (x) { return x.from === 'coach' && x.kind === 'story' && x.replyTo && lib.story[C.resolve(lib, x.story)] && l.some(function (m) { return m.id === x.replyTo && m.kind === 'ask'; }); });
        return ans.length ? ans[ans.length - 1] : null;
      };
      var actOf = function (r) { return (st.review[r.mid] || {}).action; };
      // a story goes when it is checked and its life is not one the member had in the last fortnight (r.guard)
      // (after 18:00 on Sunday, a story checked later was a recall draft when the week went: the record stays as it was)
      var isReady = function (r) { return r.has && r.s && r.s.verified && !r.guard && actOf(r) !== 'hold' && !(gone18 && lateCheck(C.resolve(lib, r.s.id))); };
      // a line waits for the coach's check when nothing checked could go; one with a checked story to send is ready to send
      var sendable = function (r) { return actOf(r) !== 'hold' && !isReady(r) && !!r.ready; };
      var waits = function (r) { return actOf(r) !== 'hold' && !isReady(r) && !r.ready; };
      // what goes at 18:00 if the coach does nothing more: a checked story, unless the member is on Hold for me and
      // nobody has approved it
      var goesAt = function (r) { return isReady(r) && (!r.holdMode || !!actOf(r)); };
      var dayOf = function (r) { var m = /\b(\d{1,2}) \w{3}\b/.exec(r.up || ''); return m ? +m[1] : 99; };
      // the send is Sunday 18 Oct at 18:00: before it, today or on Sunday (dated, before that week); after it, what went
      var k18 = d.clock[st.clock] || d.clock[0], gone18 = k18.day + (+k18.hm.slice(0, 2)) / 24 + (+k18.hm.slice(3)) / 1440 >= 18.75;
      var sun18 = k18.day === 18 ? 'today' : k18.day >= 12 ? 'on Sunday' : 'on Sunday 18 Oct', send18 = gone18 ? 'Sent on Sunday at 18:00' : 'At 18:00 ' + sun18;
      // the coach's question, prefilled: the member's own words when they are about this week's room, or else the room
      var WDAY = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };
      var askFor = function (M) {
        var lab = (M.up19 && M.up19.label) || '', room = lab.replace(/^\w{3} \d+ \w{3} \u00b7 /, ''), ws = room.split(' '); if (!room) return M.ask1 || '';
        var named = /^[A-Z]/.test(ws[1] || ''), proper = ws.filter(function (w, i) { return /^[A-Z]/.test(w) && (i > 0 || named); });
        var keys = (proper.length ? proper : ws.filter(function (w) { return w.length > 3; })).map(function (w) { return w.toLowerCase(); });
        if (M.ask1 && keys.some(function (w) { return M.ask1.toLowerCase().indexOf(w) >= 0; })) return M.ask1.replace(/'/g, '\u2019');
        var day = WDAY[lab.slice(0, 3)];
        return 'What is ' + M.first + ' facing at the ' + (named ? room : room.charAt(0).toLowerCase() + room.slice(1)) + (day ? ' on ' + day : '') + '?';
      };
      out.rq.rows.forEach(function (r) {
        var M = lib.members[r.mid] || {}, first = M.first || r.name, open = st.rvOpen === r.mid, act = actOf(r);
        // after 18:00 on Sunday the week is a record: nothing on the line sends, holds, approves or swaps
        // and a check made after it does not rewrite why nothing went ("It waited for your check." stays)
        if (gone18) { r.btns = []; r.fill = null; if (r.ready && lateCheck(r.ready.id)) r.ready = null; }
        var ap = r.btns && r.btns[0];
        var S2 = function (p2) { S(Object.assign({ rvOpen: r.mid }, p2)); };
        var at = meetOf(st, lib, r.mid), when = hm(at), am = /^\w{3} (\d+) \w{3}, (\d\d):(\d\d)$/.exec(String(at || '')), kn = d.clock[st.clock] || d.clock[0];
        var past = am && +am[1] * 1440 + +am[2] * 60 + +am[3] < kn.day * 1440 + (+kn.hm.slice(0, 2)) * 60 + (+kn.hm.slice(3));
        r.first = first;
        r.when = (when ? (past ? 'Met ' : 'You meet ') + when : 'No check-in booked') + (r.holdMode ? ' \u00b7 Hold for me' : '');
        r.prep = when && !past ? prepFor(r.mid) : null;
        r.week = r.up + ' \u00b7 ' + r.key;
        var sI = r.has && r.s && r.s.id && lib.story[C.resolve(lib, r.s.id)], who = sI ? C.storyTitle(lib, sI) : '', draftI = !!sI && (!sI.verified || (gone18 && lateCheck(sI.id)));
        var ready = isReady(r), goes = goesAt(r);
        // a send names its story by the person, or by the whole title where another story of that person is on the line
        var sameLife = function (k) { return k && r.ready && k.icon === r.ready.icon && k.id !== r.ready.id; };
        var wkR = lib.sit[String(r.key || '').split(' \u00b7 ')[0]], twin = r.ready && wkR && (lib.byKey[wkR.key] || []).some(function (sid) { var o = lib.story[sid]; return o && o.verified && sameLife(o); });
        var sendName = r.ready ? (sameLife(r.fill) || twin ? r.ready.title : r.ready.name) : '';
        // the line leads with what happens at 18:00, in the manifest's words: the story, or nothing yet and why; once 18:00
        // has passed, what went
        var whyNot = ready && r.holdMode ? (gone18 ? 'It waited for your approval, as ' : 'Waits for your approval, as ') + first + ' is on Hold for me.'
          : draftI ? who + (gone18 ? ' was' : ' is') + ' a recall draft' + (r.guard ? ', and ' + r.guard : '') + '.'
          : sI && r.guard ? who + (gone18 ? ' waited, as ' : ' waits, as ') + r.guard + '.'
          : r.ready ? (gone18 ? r.ready.title + ' was ready, and was not sent.' : 'Waits for you to send ' + sendName + '.')
          : r.fill || (gone18 && !sI) ? (gone18 ? 'It waited for your check.' : 'Waits for your check.') : 'No checked story carries ' + first + '\u2019s week.';
        r.outcome = act === 'hold' ? 'Held. Nothing ' + (gone18 ? 'went' : 'goes') + ' to ' + first + ' this week.' : goes ? who : (gone18 ? 'Nothing went. ' : 'Nothing yet. ') + whyNot;
        r.lead = goes ? send18 + ' \u00b7 ' + who : r.outcome;
        r.guardShut = r.guard && r.outcome.indexOf(r.guard) < 0 ? r.guard : '';
        // the row's own status, in the same words (the engine's said "Proposed by the rule")
        r.status = act === 'hold' ? r.outcome : goes ? (gone18 ? 'Went to ' + first + ' on Sunday at 18:00' : 'Goes to ' + first + ' at 18:00 ' + sun18)
          : (gone18 ? 'Nothing went to ' : 'Nothing goes to ') + first + (gone18 ? '' : ' yet') + (draftI ? (gone18 ? ': the story was a recall draft.' : ': the story is a recall draft.') : r.guard ? ': ' + r.guard + '.' : ready && r.holdMode ? ': it waits for your approval.' : '.');
        r.noteLine = r.hasNote ? 'Your note: \u201c' + r.note + '\u201d' : '';
        // then what the coach can do about it, until 18:00
        r.goes = gone18 || goes || act === 'hold' ? '' : r.ready ? 'Ready now \u00b7 ' + r.ready.title : r.fill ? 'One check \u00b7 ' + r.fill.title : sI && !sI.verified && !r.guard ? 'One check \u00b7 ' + who : '';
        r.goesAlt = !gone18 && !ready && r.ready && r.fill ? 'Or one check \u00b7 ' + r.fill.title : '';
        // a line the coach changed can be put back, until 18:00
        r.undo = !gone18 && undoFor(st, r.mid) >= 0 ? function () { undoLast(c, r.mid); } : null;
        var ask = openAsk(r.mid), ans = ask ? null : answeredAsk(r.mid);
        r.askOpen = ask ? 'Asked ' + (hm(ask.at) || ask.at) + ' \u00b7 \u201c' + clip(ask.body || '', 60) + '\u201d'
          : ans ? 'Answered ' + (hm(ans.at) || ans.at) + ' \u00b7 ' + C.storyTitle(lib, ans.story) : '';
        // one action: what this line needs first; a send names whom it sends. A line that goes anyway has no Approve
        // (it would change nothing); a member on Hold for me still needs one
        (r.btns || []).forEach(function (b) {
          if (b.title === 'Verify the source before sending.') b.title = 'Check the source before sending.';
          if (/^(Approve|Pin|Hold)$/.test(b.label)) b.go = undoable(c, r.mid, b.go);
        });
        // only what would change the line is on offer: no Approve or Pin on a line that goes anyway (a member on Hold for
        // me still needs Approve), and nothing that cannot be pressed
        r.btns = (r.btns || []).filter(function (b) { return !b.dis && !(goes && b.label === 'Pin') && !(goes && !r.holdMode && b.label === 'Approve'); });
        if (r.saveNote) r.saveNote = undoable(c, r.mid, r.saveNote);
        if (r.corpusLabel) r.corpusLabel = r.corpusOn ? 'Asked the library team for more stories' : 'Ask the library team for more stories';
        r.act = gone18 ? null : !ready && r.ready && act !== 'hold' ? { label: 'Send ' + sendName, go: r.ready.go }
          : r.fill ? { label: 'Check', go: function () { S2({ fillOpen: r.mid }); } }
          : r.has && !r.s.verified && !r.guard ? { label: 'Check', go: function () { S2({}); } }
          : ready && !act && r.holdMode && ap && !ap.dis ? { label: 'Approve', go: ap.go }
          : null;
        if (!r.act) r.act = ask ? { label: 'Answer', go: function () { S({ c: 'C8', thread: r.mid }); } }
          : r.prep ? { label: 'Prep', go: r.prep } : null;
        if (r.act && r.act.label === 'Prep') r.prep = null;
        // the coach's question about this member's week, asked in place: the Library's answer, read for this member
        r.q = null;
        if (open && window.CLQ && window.CLN) {
          var qk = r.mid, typed = (st.rvQ || {})[qk], asked = (st.rvAsked || {})[qk], sitR = lib.sit[String(r.key || '').split(' \u00b7 ')[0]];
          var qText = typed != null ? typed : askFor(M);
          r.q = { text: qText, ph: 'What is ' + first + ' facing this week?', label: 'What is ' + first + ' facing?',
            set: function (e) { var o = Object.assign({}, c.state.rvQ); o[qk] = String(e.target.value).slice(0, 240); c.setState({ rvQ: o }); },
            go: function () { var t0 = String(((c.state.rvQ || {})[qk] != null ? c.state.rvQ[qk] : qText) || '').trim(); if (!t0) return; var o = Object.assign({}, c.state.rvAsked); o[qk] = t0; c.setState({ rvAsked: o }); },
            res: null };
          r.q.key = function (e) { if (e.key === 'Enter') r.q.go(); };
          if (asked) {
            var rd = window.CLQ.read(lib, asked, { m: r.mid }), an = window.CLQ.answer(lib, rd.q), libAsk = '#/ask?t=' + encodeURIComponent(asked) + '&read=1&m=' + encodeURIComponent(r.mid);
            // the week's one answer first (CLN.nextFor, the line's own), then the Library's answer to the question inside
            // the week; a story from another week says so, and opens in the library only
            var nf = sitR ? weekAnswer(st, lib, r, {}) : { ready: null, pick: null }, seenQ = {}, cards = [];
            var qcard = function (xs, label) {
              var xi = lib.icon[xs.icon] || {}, inWeek = !!sitR && xs.keys.indexOf(sitR.key) >= 0;
              var lt = window.CLN.linksTo(lib, r.mid, xs.icon, inWeek ? sitR.key : xs.keys[0], {});
              seenQ[xs.id] = 1;
              return { id: xs.id, icon: xs.icon, label: gone18 ? (xs.verified ? 'Checked' : 'Recall draft') : inWeek ? label : 'Another week', title: C.storyTitle(lib, xs), name: xi.name,
                why: window.CLQ.reasons(lib, xs, rd.q).filter(function (y) { return y.type !== 'move' && y.type !== 'line'; }).map(function (y) { return y.text; }).slice(0, 2).join(' \u00b7 '),
                route: lt.links === 0 ? 'One of ' + first + '\u2019s three.' : lt.links < 9 ? lt.line : '', open: function () { S({ c: 'CX', cm: r.mid, cxRoute: '#/story/' + encodeURIComponent(xs.id) }); },
                swap: inWeek && xs.verified && !gone18 ? sendNow(c, r.mid, xs.id) : null };
            };
            if (nf.ready) cards.push(qcard(nf.ready.story, 'Ready now'));
            // the draft one check from sending is the line's own check, shown below with its card; it is not shown twice
            var below = !!(nf.pick && r.fill && r.fill.id === nf.pick.story.id);
            if (nf.pick && !below) cards.push(qcard(nf.pick.story, 'One check from sending'));
            else if (below) seenQ[nf.pick.story.id] = 1;
            var hadQ = window.CLQ.sentTo(lib, r.mid).map(function (x) { return C.resolve(lib, x); }).concat(goingTo(st, lib, r.mid, r)), avQ = recentIcons(lib, r.mid);
            // the week's two cards; the Library's own answer stands in only where the week has neither, and the rest
            // wait behind "All N stories"
            [an.ready, an.oneCheck].concat(an.items || []).filter(Boolean).map(function (x) { return x.story; })
              .filter(function (xs) { return !seenQ[xs.id] && hadQ.indexOf(xs.id) < 0 && avQ.indexOf(xs.icon) < 0 && (xs.verified || xs.reach !== 'far') && !!sitR && xs.keys.indexOf(sitR.key) >= 0; }).slice(0, Math.max(0, 2 - cards.length - (below ? 1 : 0)))
              .forEach(function (xs) { cards.push(qcard(xs, xs.verified ? 'Ready now' : 'One check from sending')); });
            // a send names its story as the line's button does: the person, or the whole title where another story of that
            // person is on the line or in Details, or is checked for the week too
            var byName = {}; cards.concat([r.ready, r.fill].filter(Boolean).map(function (k) { return { name: (lib.icon[k.icon] || {}).name, id: k.id }; })).forEach(function (k) { (byName[k.name] = byName[k.name] || {})[k.id] = 1; });
            var twinQ = function (k) { return !!sitR && (lib.byKey[sitR.key] || []).some(function (sid) { var o = lib.story[sid]; return o && o.verified && o.icon === k.icon && o.id !== k.id; }); };
            cards.forEach(function (k) { k.sendLabel = 'Send ' + (Object.keys(byName[k.name] || {}).length > 1 || twinQ(k) ? k.title : k.name); });
            r.q.res = { reading: 'Read as ' + (rd.chips || []).map(function (x) { return x && x.label || String(x); }).filter(function (x) { return !/^For /.test(x); }).join(' \u00b7 '),
              change: function () { S({ c: 'CX', cm: r.mid, cxRoute: libAsk }); }, cards: cards,
              all: { label: an.total === 1 ? 'The one story, in the library' : 'All ' + an.total + ' stories, in the library', go: function () { S({ c: 'CX', cm: r.mid, cxRoute: libAsk }); } } };
          }
        }
        r.open = open; r.shut = !open; r.openS = open ? 'true' : 'false';
        r.foldLabel = open ? 'Close' : 'Details'; r.foldIcon = open ? 'ph ph-caret-up' : 'ph ph-caret-down'; r.foldAria = (open ? 'Close ' : 'Open ') + first + '\u2019s week';
        r.fold = function () { S({ rvOpen: open ? null : r.mid }); };
      });
      // after Undo, the toast says what the line does now
      var und = B.undone && out.rq.rows.filter(function (r) { return r.mid === B.undone.mid; })[0];
      if (und && out.ctoast && !st.ctoast) out.ctoast = { show: true, text: 'Undone. ' + (goesAt(und) ? (lib.story[C.resolve(lib, und.s.id)] ? C.storyTitle(lib, und.s.id) : 'The story') + ' goes to ' + und.first + ' at 18:00.' : actOf(und) === 'hold' ? und.outcome : 'Nothing goes to ' + und.first + ' yet.') };
      // the queue, once: what goes at 18:00 and who waits for a check, for this coach's members
      var mine = out.rq.rows.filter(function (r) { return mineM(r.mid); });
      var Q = { members: mine.length, goes: mine.filter(goesAt), waits: mine.filter(waits), ready: mine.filter(sendable) };
      var poss = function (rs) { return andList(rs.map(function (r) { return firstOf(r.mid) + '\u2019s'; })); };
      var queueLine = function (rs) {
        var w = rs.filter(waits).length, rd = rs.filter(sendable).length;
        return (w ? ' \u00b7 ' + w + (w === 1 ? ' waits' : ' wait') + ' for your check' : '') + (rd ? ' \u00b7 ' + rd + ' ready to send' : '');
      };
      out.rosterSummary = Q.members + ' of your members' + queueLine(mine);
      if (st.cnotif && st.cnotif.go === 'C3' && out.cn) out.cn.text = (Q.goes.length ? C.cap1(C.num(Q.goes.length)) + (Q.goes.length === 1 ? ' story goes' : ' stories go') + ' out at 18:00.' : 'Nothing goes out at 18:00 yet.') +
        (Q.waits.length ? ' ' + poss(Q.waits) + (Q.waits.length === 1 ? ' waits' : ' wait') + ' for your check.' : '') + (Q.ready.length ? ' ' + poss(Q.ready) + (Q.ready.length === 1 ? ' is' : ' are') + ' ready to send.' : '');
      (out.nav || []).forEach(function (n) { if (n.label === 'Review') { n.badge = Q.waits.length + Q.ready.length; n.hasBadge = n.badge > 0; } });
      // the lines, those waiting for the coach first, then by the day of the member's week: sorted when Review opens and
      // held in that order while it stays open, so a line the coach changes keeps its place (and its Undo)
      var sortKey = st.p + '|' + st.clock + '|' + (all ? 'all' : 'mine'), order = B.rvOrder && B.rvOrder.key === sortKey && B.lastC === 'C3' ? B.rvOrder.mids : null;
      var scoped = (all ? out.rq.rows : mine).slice().sort(function (a, b) {
        if (order) return order.indexOf(a.mid) - order.indexOf(b.mid);
        return (waits(b) || sendable(b)) - (waits(a) || sendable(a)) || dayOf(a) - dayOf(b);
      });
      if (st.c === 'C3') B.rvOrder = { key: sortKey, mids: scoped.map(function (r) { return r.mid; }) };
      // the lines of this console still without a story for the week, by the week they carry: a check made on one line
      // says which of these it would fill as well
      B.rvOpenWeeks = {}; mine.forEach(function (r) { var sw = lib.sit[String(r.key || '').split(' \u00b7 ')[0]]; if (sw && !goesAt(r) && actOf(r) !== 'hold') B.rvOpenWeeks[r.mid] = sw.key; });
      // the 18:00 manifest, in the queue's own flow where the floating notice stood: who gets which story, then who gets
      // nothing yet and why, in the words each line leads with
      out.rq.manifest = scoped.length ? { head: send18,
        rows: scoped.filter(goesAt).concat(scoped.filter(function (r) { return !goesAt(r); })).map(function (r) { return { mid: r.mid, first: r.first, outcome: r.outcome }; }),
        explain: gone18 ? '' : 'Anything you leave goes out ' + sun18 + ' at 18:00, in each member\u2019s own time, unless you hold it.' } : null;
      // the notice about Review is read once Review is open, and does not drop in again on the next screen
      if (out.cn && st.cnotif && st.c === 'C3') B.cnSeen = st.cnotif;
      if (out.cn && (st.c === 'C3' || (st.cnotif && st.cnotif === B.cnSeen))) out.cn.show = false;
      var askN = scoped.filter(function (r) { return r.askOpen; }).length;
      out.rq.every = out.rq.rows; out.rq.rows = scoped;   // lookups by member (swap, Find and send) use every row
      out.rq.count = (all ? scoped.length + ' members' + queueLine(scoped) : out.rosterSummary) + (askN ? ' \u00b7 ' + askN + (askN === 1 ? ' Ask' : ' Asks') + ' to answer' : '');
      out.rq.scope = { on: all ? 'true' : 'false', icon: all ? 'ph-fill ph-toggle-right' : 'ph ph-toggle-left', bd: all ? 'var(--ink)' : 'var(--hair)', go: function () { S({ rvAll: !all, rvOpen: null }); } };
      if (st.c === 'C3') out.cTitle = 'Your week, ' + CC.first;
      // once 18:00 has passed, the header says what went: to the member a page is about, or to everyone
      if (gone18 && typeof out.countdown === 'string') {
        var cmRow = ['C2', 'C5', 'C6', 'C7'].indexOf(st.c) >= 0 && out.rq.every.filter(function (r) { return r.mid === st.cm; })[0];
        out.countdown = cmRow ? (goesAt(cmRow) ? 'Sent to ' + cmRow.first + ' on Sunday' : 'Nothing sent to ' + cmRow.first + ' on Sunday') : 'Sunday\u2019s stories went at 18:00';
      }
      // the weeks ahead: the checks after this week's, which the lines above already ask for
      var pm = scoped.map(function (r) { return r.mid; }), sentM = {}, avoidM = {}, threeM = {};
      // a story going to a member this week (or gone, after 18:00) is spent for the weeks ahead, as one already sent is
      pm.forEach(function (mid) {
        sentM[mid] = (window.CLQ ? window.CLQ.sentTo(lib, mid).map(function (x) { return C.resolve(lib, x); }) : []).concat(goingTo(st, lib, mid, scoped.filter(function (r) { return r.mid === mid && goesAt(r); })[0]));
        avoidM[mid] = window.CLQ ? window.CLQ.recentTo(lib, mid).map(function (x) { return x.icon; }) : [];
      });
      if (st.core && st.core.length) threeM[P] = st.core.map(function (h) { return iconOf[h] || h; });
      var given = scoped.filter(function (r) { return waits(r) && !r.ready && r.fill; });
      // a member still waiting for this week's story: a draft that carries their week is their line's other check, and
      // the plan keeps to the weeks after this one
      // every member's, whoever's console this is, so no check in this plan touches another coach's line either
      // (until Sunday 18:00: after it nothing goes this week, and the plan takes those drafts up)
      var thisWeek = {}; if (!gone18) out.rq.every.forEach(function (r) { var sit = lib.sit[String(r.key || '').split(' \u00b7 ')[0]]; if (sit && waits(r)) thisWeek[r.mid] = sit.id; });
      // the same plan for the same lines until a check is made or taken back (fillMemo), so a render on Review rebuilds none of it
      var planIn = { members: pm, sent: sentM, avoid: avoidM, three: threeM, first: given.map(function (r) { return r.fill.id; }), thisWeek: thisWeek }, planK = 'plan|' + JSON.stringify(planIn);
      var plan = onReview ? fillMemo[planK] || (fillMemo[planK] = window.CLN.checkPlan(lib, planIn)) : { picks: [], members: [], alts: {} };
      scoped.forEach(function (r) {
        var alt = (plan.alts || {})[r.mid];
        if (alt && !r.goesAlt && !isReady(r) && actOf(r) !== 'hold' && !(r.fill && r.fill.id === alt.story.id)) r.goesAlt = 'Or one check \u00b7 ' + C.storyTitle(lib, alt.story);
      });
      var ahead = plan.picks.filter(function (pk) { return !pk.given; });
      // the week each check is for: the first week of the member's season, after this one, that the story carries
      var forWeeks = function (pk) {
        return 'For ' + andList(pk.serves.map(function (mid) {
          var w = (seasonOf(lib, mid) || []).filter(function (x) { return x.week > NOW_W && x.sit && lib.sit[x.sit.id] && pk.story.keys.indexOf(lib.sit[x.sit.id].key) >= 0; })[0];
          return firstOf(mid) + (w && window.CLQ ? ', week of ' + window.CLQ.weekDay(w.week) : ', a later week');
        }));
      };
      // a member's week whose only drafts would fill a line still waiting this week (theirs or another member's): the plan
      // takes it up after Sunday
      var weekOf = function (mid, sid) { var w = (seasonOf(lib, mid) || []).filter(function (x) { return x.week > NOW_W && x.sit && x.sit.id === sid; })[0]; return w && window.CLQ ? window.CLQ.weekDay(w.week) : ''; };
      var lw = gone18 ? [] : plan.members.filter(function (m) { return m.later && m.later.length; }), nw = lw.reduce(function (n, m) { return n + m.later.length; }, 0);
      // "No checked story yet for David’s weeks of 26 Oct and 2 Nov, or for Priya’s week of 26 Oct."
      var laterLine = nw ? ' No checked story yet for ' + lw.map(function (m) {
        var ds = m.later.map(function (sid) { return weekOf(m.id, sid); }).filter(function (x, i, a) { return x && a.indexOf(x) === i; });
        return firstOf(m.id) + '\u2019s ' + (ds.length > 1 ? 'weeks of ' + andList(ds) : ds.length ? 'week of ' + ds[0] : 'later weeks');
      }).join(', or for ') + '. ' + (nw === 1 ? 'Its recall drafts' : 'Their recall drafts') + ' would fill a line that waits this week, so they come into this plan after Sunday 18:00.' : '';
      var whole = plan.members.filter(function (m) { return !m.gap && !m.weeks; });
      out.rq.plan = ahead.length || laterLine ? {
        head: 'For the weeks ahead',
        // what the checks give, said only of the members they make whole: four checked stories and one in every week ahead
        line: ((ahead.length ? (given.length ? 'After ' + poss(given) + (given.length === 1 ? ' check, ' : ' checks, ') + C.num(ahead.length) + ' more ' : C.cap1(C.num(ahead.length)) + (ahead.length === 1 ? ' check ' : ' checks ')) +
          (!whole.length ? (ahead.length === 1 ? 'is' : 'are') + ' for the weeks ahead.' : (ahead.length === 1 ? 'gives ' : 'give ') + (whole.length === plan.members.length ? (all ? 'every member ' : 'each of your members ') : andList(whole.map(function (m) { return firstOf(m.id); })) + ' ') +
          C.num(plan.need) + ' checked stories, with one in every week of theirs ahead.') : '') +
          (plan.members.some(function (m) { return m.left; }) ? ' ' + andList(plan.members.filter(function (m) { return m.left; }).map(function (m) { return firstOf(m.id); })) + (plan.members.filter(function (m) { return m.left; }).length === 1 ? ' still needs' : ' still need') + ' more stories written.' : '') + laterLine).trim(),
        items: (st.planAll ? ahead : ahead.slice(0, 3)).map(function (pk) {
          var sid = pk.story.id, open = st.planOpen === sid;
          // a check for a later week marks the story checked and sends nothing
          var card = open ? checkCard(c, sid, pk.serves[0], 'plan') : null;
          if (card) {
            card.title = '';   // the plan's line above already names it
            card.sendLabel = 'Mark it checked'; card.both = false;
            card.send = function () { var n = String((c.state.checkNote || {})[sid] || '').trim(); card.only(); if (n) c.setState({ planOpen: null }); };
          }
          return { id: sid, title: C.storyTitle(lib, pk.story), serves: forWeeks(pk), label: open ? 'Close' : 'Check', card: card, go: function () { S({ planOpen: open ? null : sid }); } };
        }),
        more: ahead.length > 3 ? { label: st.planAll ? 'The first three' : 'All ' + C.num(ahead.length), go: function () { S({ planAll: !st.planAll, planOpen: null }); } } : null
      } : null;
    }
    // one time for each member's check-in: the export keeps one slot, which is the booking of the member who moved it
    // (st.slotFor); everyone else meets at the time on their record (M.next), whichever persona is open
    var meetP = meetOf(st, lib, P);
    (out.ro || []).forEach(function (r) { if (r.mid === P && r.next === st.slot) r.next = meetP; });
    (out.ck || []).forEach(function (k, i) { if (d.order[i] === P && k.when === st.slot) k.when = meetP; });
    if (out.ci && typeof out.ci.when === 'string') out.ci.when = out.ci.when.replace(st.slot, meetP);
    [[out.th && out.th.list, P], [out.msg && out.msg.list, st.thread]].forEach(function (x) {
      var at = meetOf(st, lib, x[1]); if (!at || !/\d\d:\d\d$/.test(at)) return;
      (x[0] || []).forEach(function (m) {
        if (!m.isCheckin) return; m.slot = at + ', 15 min';
        (m.slots || []).forEach(function (sl) { sl.on = sl.t === at; sl.bd = sl.on ? 'var(--ink)' : 'var(--hair)'; });
      });
    });
    // prep for every member of the console's coach: Sarah's in the console, the others as the Library's reading
    // Check-ins are the console coach's own members, soonest first; All members adds the rest, whose prep is in their
    // own coach's console. A check-in already past reads as past
    if (out.ck) {
      var ckC = consoleCoach(st), ckAll = !!st.ckAll, ckNow = (d.clock[st.clock] || d.clock[0]), nowMin = ckNow.day * 1440 + (+ckNow.hm.slice(0, 2)) * 60 + (+ckNow.hm.slice(3));
      var atMin = function (x) { var m = /^\w{3} (\d+) \w{3}, (\d\d):(\d\d)$/.exec(String(x || '')); return m ? +m[1] * 1440 + +m[2] * 60 + +m[3] : null; };
      var ckRows = out.ck.map(function (k, i) {
        var mid = d.order[i], M = lib.members[mid] || {}, mine = M.coach === ckC, at = atMin(k.when);
        k.prepDis = !mine; k.prepOp = mine ? 1 : 0.4; k.prepTitle = mine ? '' : (lib.coaches[M.coach] || {}).first + '\u2019s member: prep is in their console.';
        if (mine) k.prep = mid === P ? function () { S({ c: 'C7', cm: P }); } : function () { S({ c: 'CX', cm: mid, cxRoute: '#/member/' + encodeURIComponent(mid) }); };
        if (at != null && at < nowMin) k.when = 'Met ' + k.when;
        if (!mine) k.name = k.name + ' \u00b7 ' + ((lib.coaches[M.coach] || {}).first || 'Another coach') + '\u2019s member';
        return { k: k, mine: mine, at: at == null ? 1e9 : at < nowMin ? 1e8 + at : at, i: i };
      });
      out.ck = ckRows.filter(function (x) { return x.mine || ckAll; }).sort(function (a, b) { return b.mine - a.mine || a.at - b.at || a.i - b.i; }).map(function (x) { return x.k; });
      out.ckScope = { head: ckAll ? 'Every member' : ((lib.coaches[ckC] || {}).first || 'Your') + '\u2019s members', on: ckAll ? 'true' : 'false', icon: ckAll ? 'ph-fill ph-toggle-right' : 'ph ph-toggle-left', bd: ckAll ? 'var(--ink)' : 'var(--hair)', go: function () { S({ ckAll: !ckAll }); } };
    }
    // the coach reads a situation as its code and words, never a corpus key ("every-act-is-a-message")
    if (st.role === 'coach') {
      var CW = window.CLC;
      if (!lib._keyRe) lib._keyRe = new RegExp('(?:\\b([A-E]\\d) \\u00b7 )?\\b(' + lib.situations.map(function (x) { return x.key; }).sort(function (a, b) { return b.length - a.length; }).join('|') + ')\\b', 'g');
      var unslug = function (t) {
        return t.replace(lib._keyRe, function (m0, code, key) { return CW.sitLabel(lib, key); })
          .replace(/ · covers /, ' · carries ').replace(/ · verified$/, ' · checked').replace(/ · draft$/, ' · recall draft');
      };
      var walk = function (o, depth) {
        if (!o || depth > 4) return;
        Object.keys(o).forEach(function (k) { var v = o[k]; if (typeof v === 'string') o[k] = unslug(v); else if (v && typeof v === 'object') walk(v, depth + 1); });
      };
      [out.fr, out.o2, out.ci].forEach(function (o) { walk(o, 0); });
      var Ms = lib.members[P] || {};
      if (out.fr && Ms.sits) out.fr.goalKeys = Ms.sits.map(function (id) { return CW.sitLabel(lib, id); }).join('; ');
      if (out.o2 && out.o2.sits) out.o2.sits.forEach(function (x) { var si = lib.sit[x.id]; if (si) { x.key = x.line; x.line = si.chip; } });
      if (out.mv && st.mv && lib.sit[st.mv.sit]) { out.mv.sitLabel = st.mv.sit; out.mv.sitLine = lib.sit[st.mv.sit].chip; }
      // a move's tests tick from its fields: a room in the trigger, a watchable verb that runs inside two minutes,
      // the grain, a named first failure; "word for word" stays the coach's call
      if (out.mv && st.mv) {
        var mvv = st.mv, bw = String(mvv.behaviour || '').trim().split(/\s+/).filter(Boolean).length;
        var met = [!!String(mvv.trigger || '').trim(), bw > 0, bw > 0 && bw <= 18, !!String(mvv.grain || '').trim(), !!String(mvv.failure || '').trim(), !!(st.tests || [])[5]];
        var nT = (out.mv.tests || []).length, nMet = met.slice(0, nT).filter(Boolean).length;
        (out.mv.tests || []).forEach(function (t, i) { if (i < 5) { t.icon = met[i] ? 'ph-fill ph-check-square' : 'ph ph-square'; t.c = met[i] ? 'var(--ink)' : 'var(--faint)'; t.go = function () {}; } });
        out.mv.ticks = nMet + ' of ' + nT + ' tests met' + (nMet < 5 ? ' · five needed to publish' : '');
        out.mv.canPub = nMet >= 5 && bw <= 18; out.mv.canPubNot = !out.mv.canPub; out.mv.pubOp = out.mv.canPub ? 1 : 0.4;
        out.mv.pubTitle = nMet < 5 ? 'Meet at least five tests to publish.' : bw > 18 ? 'Keep the behaviour to 18 words.' : '';
        if (out.o2 && out.o2.tests) out.o2.tests.forEach(function (t, i) { if (i < 5) { t.mark = met[i] ? '✓' : '·'; t.c = met[i] ? 'var(--ink)' : 'var(--faint)'; } });
      }
      // before Move 1 goes out, the first week's guarantee, above Publish (which it never stops)
      if (out.mv) out.mv.gap = st.c === 'C6' && st.mv && window.CLN ? firstWeek(c, st, lib) : null;
      // Find and send's filters say what they mean
      var SEG = { All: 'Any', Near: 'Close', Mid: 'Some way', Verified: 'Checked', Draft: 'Recall draft' };
      if (out.lib) ['verSegs', 'reachSegs'].forEach(function (k) { (out.lib[k] || []).forEach(function (x) { if (SEG[x.label]) x.label = SEG[x.label]; }); });
      var RW = { near: 'Close', mid: 'Some way', far: 'Far' };
      if (out.lib && out.lib.results) out.lib.results.forEach(function (x) { if (RW[x.reach]) x.reach = RW[x.reach]; });
      if (out.lib && out.lib.p && RW[out.lib.p.reach]) out.lib.p.reach = RW[out.lib.p.reach].toLowerCase();
    }
    // the engine's own words where they said less than they meant; one form for a hero's name in a list, and a span of
    // years said whole where it crosses a century ("1995–2010")
    (out.ro || []).forEach(function (r) {
      if (r.pill && r.pill.t === 'One colour') r.pill = Object.assign({}, r.pill, { t: 'All acted, none said' });
      if (typeof r.born === 'string') r.born = r.born.replace(/\b(\d{2})(\d{2})\u2013(\d{2})\b/, function (m0, cc, yy, ee) { return +ee < +yy ? cc + yy + '\u2013' + (+cc + 1) + ee : m0; });
      var Mr = d.members[r.mid]; if (Mr && Array.isArray(r.heroes)) r.heroes = (r.mid === P ? st.core : Mr.core || []).map(function (h) { return d.hero[h] ? d.hero[h].name : h; });
    });
    if (out.yu && st.core) out.yu.heroNames = st.core.map(function (h) { return d.hero[h] ? d.hero[h].name : h; }).join(' \u00b7 ');
    [out.o2 && out.o2.from, out.from].forEach(function (f) {
      var m = f && /^16 contenders · (\d+) from their years · (\d+) across generations · 8 from interests$/.exec(f.makeup || '');
      if (m) f.makeup = '16 contenders: ' + m[1] + ' from their years (' + window.CLC.num(+m[2]) + ' of them admired across generations) and 8 from interests';
    });
    (out.fr && out.fr.pending || []).forEach(function (p) {
      var m = /^Thin record — (\d+) verified/.exec(p.thinText || ''); if (!m) return;
      p.thinText = +m[1] === 0 ? 'No checked story from ' + p.name + ' yet, so few weeks will bring one.' : 'Only ' + window.CLC.num(+m[1]) + ' checked ' + (+m[1] === 1 ? 'story' : 'stories') + ' from ' + p.name + ', so few weeks will bring one.';
    });
    // Members lists the console coach's own members first, each group in the engine's order of who needs the coach
    if (out.ro) { var ccR = consoleCoach(st); out.ro = out.ro.map(function (r, i) { return { r: r, i: i, own: (lib.members[r.mid] || {}).coach === ccR }; }).sort(function (a, b) { return b.own - a.own || a.i - b.i; }).map(function (x) { return x.r; }); }
    // C1 says the whole roster and this coach's share of the queue
    if (out.rosterSummary && out.ro) {
      var ccN = out.ro.filter(function (r) { return (lib.members[r.mid] || {}).coach === consoleCoach(st); }).length;
      if (ccN < out.ro.length) out.rosterSummary = out.rosterSummary.replace(/^\d+ of your members/, out.ro.length + ' members, ' + ccN + ' of them yours');
    }
    // Check-in prep (C7) says what the record holds for this member: who added each hero and how many checked stories
    // they have, talking points read from the library and the marks, and a recap built from this member's own move and line
    if (out.ci && st.role === 'coach' && lib.members[P]) {
      var MP = lib.members[P], C7 = window.CLC, num7 = function (n, one, many) { return (n === 1 ? 'one ' + one : C7.num(n) + ' ' + many); };
      var holds = function (hid) {
        var L = d.libOf(hid), h = d.hero[hid] || {}, v = L.verified, w = L.n - v;
        return v ? h.name + ' has ' + num7(v, 'checked story', 'checked stories') + (w ? ' and ' + num7(w, 'recall draft', 'recall drafts') : '') + '.'
          : w ? h.name + ' has ' + num7(w, 'recall draft', 'recall drafts') + ' and no checked story yet.' : h.name + ' has no stories yet.';
      };
      (out.ci.heroes || []).forEach(function (t, i, a) {
        a[i] = String(t).replace(/ \u00b7 added by Sarah(?: \u00b7 thin record: (\d+) verified)?$/, function (m0, n) {
          return ' \u00b7 added by ' + MP.first + (n == null ? '' : +n === 0 ? ' \u00b7 no checked story yet' : ' \u00b7 only ' + num7(+n, 'checked story', 'checked stories'));
        });
      });
      var acted = (st.marks || []).some(function (m) { return m.kind === 'acted'; }), three7 = (st.core || []).filter(function (h) { return d.hero[h]; });
      var TALK = {
        'Dan took the account on Thursday. What did the room do?': function () { return acted ? '' : 'Did Dan get the account in the room? Nothing is marked yet.'; },
        'Her three have no stories in the record yet. Suggest Ardern or Gauff?': function () {
          var some = three7.filter(function (h) { return d.libOf(h).n; }), none = three7.filter(function (h) { return !d.libOf(h).n; });
          if (!some.length) return '';
          return some.map(holds).join(' ') + ' ' + (some.some(function (h) { return d.libOf(h).verified; }) ? 'Send one, or choose another.' : 'Check it, or choose another.') +
            (none.length ? ' ' + andWords(none.map(function (h) { return d.hero[h].name; })) + (none.length === 1 ? ' has' : ' have') + ' no stories yet.' : '');
        },
        'Dawn Staley has no stories yet. Keep her, or point Sarah to someone with a deeper record?': function () { return holds('staley') + ' Keep Staley, or point ' + MP.first + ' to someone with a deeper record?'; },
        'Ali is scoped to C2. Does Miami Beach land, or does it read as bravado?': function () { return (st.scopes || {}).ali ? '' : 'Ali\u2019s Miami Beach story is a recall draft. Does it land, or does it read as bravado?'; },
        // the member by name, never a pronoun read from it, and the room of the week ahead where a point looks forward
        'The reorg announcement: which part will she be tempted to explain?': function () { return 'The reorg announcement: which part will ' + MP.first + ' be tempted to explain?'; },
        'Which meeting is the one she should ask to be in?': function () { return 'Which meeting is the one ' + MP.first + ' should ask to be in?'; },
        'The Ardent pitch: what did he say before the credentials?': function () { return 'The Ardent pitch: what did ' + MP.first + ' say before the credentials?'; },
        'Who at Ardent should hear his name first?': function () { var r1 = roomOf(lib, P, 1); return r1 ? 'Who at the ' + r1 + ' should hear ' + MP.first + '\u2019s name first?' : ''; }
      };
      (out.ci.talk || []).forEach(function (t) { var f = TALK[t.t], r = f && f(); if (r) t.t = r; });
      // the recap, when the coach writes none: this member's own step for the week and their line, in the week's room
      var k7 = d.clock[st.clock] || d.clock[0], wk7 = (st.micro || [])[k7.day >= 19 ? 1 : 0] || (st.micro || [])[0], room7 = roomOf(lib, P, k7.day >= 19 ? 1 : 0);
      out.ci.send = function () {
        var s0 = c.state, body = String(s0.ciNotes || '').trim() || 'Thanks for today. We agreed: ' + C7.lowerFirst(String((wk7 && (((MP.microNamed || {})[wk7.w]) || wk7.b)) || 'keep running the move').replace(/\.$/, '')) + ', and say the line once' + (room7 ? ' in the ' + room7 : '') + '.';
        var k0 = d.clock[s0.clock] || d.clock[0], mm = Object.assign({}, s0.msgs);
        mm[P] = (s0.msgs[P] || []).concat([{ id: 'c' + Date.now(), from: 'coach', kind: 'text', body: 'Recap from our check-in. ' + body, day: k0.day, at: d.lab(k0.day) + ', ' + k0.hm, live: true }]);
        c.setState({ msgs: mm, summarySent: true }); ctoast(c, 'Summary sent to ' + MP.first + '.');
      };
    }
    // one record of marks: a persona's marks live in their own console, so another console shows none for them
    (out.ro || []).forEach(function (r) { if (r.mid !== P && (d.personas || []).indexOf(r.mid) >= 0) r.last = '\u2014'; });
    // one name for a draft on the coach's side too
    var relabel = function (x) { if (x && x.verLabel === DRAFT) x.verLabel = 'Recall draft'; };
    (out.rq && (out.rq.every || out.rq.rows) || []).forEach(function (r) { relabel(r.s); });
    if (out.lib) relabel(out.lib.p);
    // the answer desk: a member's Ask in the coach's thread opens the Library's answer to it, read for that
    // member, with the situation they chose kept as chosen
    if (out.msg && out.msg.list && st.thread) {
      var tid = st.thread;
      out.msg.list.forEach(function (m) {
        if (!m.isAsk) return;
        var chip = window.CLC.fold(m.chip || ''), sit = lib.situations.filter(function (x) { return window.CLC.fold(x.chip) === chip; })[0];
        m.find = function () { S({ c: 'CX', cm: tid, cxRoute: '#/ask?t=' + encodeURIComponent(m.body || '') + '&read=1&m=' + encodeURIComponent(tid) + (sit ? '&sit=' + sit.id : '') }); };
        // answered in its own thread: the story ready to send, a note, and Send
        var thr = (st.msgs[tid] || []), ans = thr.filter(function (x) { return x.replyTo === m.id && x.kind === 'story'; })[0], TM = lib.members[tid];
        m.reply = null; m.answered = '';
        if (ans) { m.answered = 'Answered with ' + (lib.story[window.CLC.resolve(lib, ans.story)] ? window.CLC.storyTitle(lib, ans.story) : 'a story'); m.find = null; return; }
        if (!window.CLQ || !TM || !window.CLN) return;
        var rq = window.CLQ.read(lib, m.body || '', { m: tid }).q; if (sit) { rq.sit = sit.id; delete rq.mine; }
        // the week's one answer (CLN.nextFor), for the situation the member chose: never what already goes to them
        var trow = (out.rq && (out.rq.every || out.rq.rows) || []).filter(function (r) { return r.mid === tid; })[0], tsit = trow && lib.sit[String(trow.key || '').split(' \u00b7 ')[0]];
        var akey = sit ? sit.key : tsit ? tsit.key : null; if (!akey) return;
        var tAsk = Object.assign(tid === P ? asNow(st, lib) : {}, { three: tid === P && st.core && st.core.length ? coreIcons(st) : null, extended: tid === P ? addedIcons(st) : [], prefer: null,
          exclude: window.CLQ.sentTo(lib, tid).map(function (x) { return window.CLC.resolve(lib, x); }), avoid: recentIcons(lib, tid) });
        var gone = goingTo(st, lib, tid, trow), lead = (trow && tsit && tsit.key === akey ? weekAnswer(st, lib, trow, {}) : nextOf(lib, tid, akey, Object.assign({ going: gone }, tAsk))).ready;
        if (!lead || !d.story[lead.story.id]) return;
        var was = gone.length ? nextOf(lib, tid, akey, Object.assign({ going: [] }, tAsk)).ready : null; was = was && gone.indexOf(was.story.id) >= 0 ? was.story : null;
        var Ls = lead.story, noteK = 'reply:' + m.id, nt = (st.replyNote || {})[noteK] || '';
        var wasMsg = was ? (st.msgs[tid] || []).filter(function (x) { return x.from === 'coach' && x.kind === 'story' && window.CLC.resolve(lib, x.story) === was.id; })[0] : null;
        m.reply = { id: Ls.id, title: window.CLC.storyTitle(lib, Ls), why: window.CLQ.reasons(lib, Ls, rq).filter(function (r) { return r.type !== 'line' && r.type !== 'move'; }).map(function (r) { return r.text; }).slice(0, 2).join(' \u00b7 '),
          was: !was ? '' : lib.icon[was.icon].name + (wasMsg ? ' went to ' + TM.first + ' on ' + String(wasMsg.at || '').replace(/,.*$/, '') + '.' : ' already goes to ' + TM.first + ' at 18:00.') + ' Here is another.',
          note: nt, ph: 'A note for ' + TM.first + ' (optional)', sendLabel: 'Send to ' + TM.first, other: m.find,
          setNote: function (e) { var o = Object.assign({}, c.state.replyNote); o[noteK] = String(e.target.value).slice(0, 240); c.setState({ replyNote: o }); },
          send: function () {
            var s0 = c.state, k0 = d.clock[s0.clock] || d.clock[0], mm = Object.assign({}, s0.msgs), body = String((s0.replyNote || {})[noteK] || '').trim();
            mm[tid] = (s0.msgs[tid] || []).concat([{ id: 'r' + Date.now(), from: 'coach', kind: 'story', story: Ls.id, body: body, day: k0.day, at: d.lab(k0.day) + ', ' + k0.hm, live: true, replyTo: m.id }]);
            c.setState({ msgs: mm, ctoast: 'Sent to ' + TM.first + '.' }); setTimeout(function () { if (c.state.ctoast === 'Sent to ' + TM.first + '.') c.setState({ ctoast: null }); }, 2800);
          } };
        m.find = null;   // the card carries "Other stories for this"
      });
    }
    // Messages are the console coach's own members' threads, and its badge counts theirs; All members lists the rest,
    // which read only: no reply, no story to send, no answer to an Ask
    if (out.msg && out.msg.threads) {
      var mc = consoleCoach(st), MC = lib.coaches[mc] || { first: 'you' }, allT = !!st.msgAll, dayT = (d.clock[st.clock] || d.clock[0]).day;
      var ownT = function (mid) { return (lib.members[mid] || {}).coach === mc; };
      var unT = function (mid) { var l = (st.msgs[mid] || []).filter(function (m) { return m.live || m.day <= dayT; }), z = l[l.length - 1]; return !!(z && z.from === 'member'); };
      var thr = d.order.map(function (mid, i) { return { mid: mid, t: out.msg.threads[i] }; }).filter(function (x) { return x.t && (ownT(x.mid) || allT || x.mid === st.thread); });
      out.msg.threads = thr.filter(function (x) { return ownT(x.mid); }).concat(thr.filter(function (x) { return !ownT(x.mid); }).map(function (x) {
        var oc = (lib.coaches[(lib.members[x.mid] || {}).coach] || {}).first || 'Another coach';
        x.t.prev = oc + '\u2019s member \u00b7 ' + x.t.prev; return x;
      })).map(function (x) { return x.t; });
      out.msg.scope = { head: allT ? 'Every member' : MC.first + '\u2019s members', on: allT ? 'true' : 'false', icon: allT ? 'ph-fill ph-toggle-right' : 'ph ph-toggle-left', bd: allT ? 'var(--ink)' : 'var(--hair)', go: function () { S({ msgAll: !allT }); } };
      var TO = lib.members[st.thread] || {}, ro = !!st.thread && !ownT(st.thread);
      out.msg.canWrite = !ro; out.msg.composeDisp = ro ? 'none' : 'flex';
      out.msg.readOnly = ro ? ((lib.coaches[TO.coach] || {}).first || 'Another coach') + ' coaches ' + (TO.first || 'this member') + '. You can read this thread.' : '';
      if (ro) {
        out.msg.send = function () {}; out.msg.onKey = function () {}; out.msg.drawer = false; out.msg.toggleDrawer = function () {};
        (out.msg.list || []).forEach(function (m) { m.find = null; m.reply = null; });
      }
      (out.nav || []).forEach(function (n) { if (n.label === 'Messages') { n.badge = d.order.filter(function (mid) { return ownT(mid) && unT(mid); }).length; n.hasBadge = n.badge > 0; } });
    }
    if (st.c === 'CX') out.cTitle = 'Library';
    var tab = function (on, go) { return { bg: on ? 'var(--ink)' : 'transparent', fg: on ? 'var(--paper)' : 'var(--ink)', bd: on ? 'var(--ink)' : 'var(--hair)', go: go }; };
    out.lt = {
      explore: tab(st.c === 'CX', function () { S({ c: 'CX' }); }),
      send: tab(st.c === 'C4', function () { S({ c: 'C4', lib: sendEntry(st, st.lib.to) }); }),
      line: (function () { var ok = d.stories.filter(function (s) { return s.verified; }).length; return nStories + ' stories from ' + nLives + ' lives \u00b7 ' + ok + ' checked, ' + (nStories - ok) + ' recall drafts'; })(),
      // the coach's Explore walks back through its own pages; Find and send has none
      hasBack: st.c === 'CX' && (st.cxDepth || 1) > 1, backLabel: st.cxPrev || 'Back', backAria: 'Back to ' + (st.cxPrev || 'the page before'),
      backGo: function () { var f = document.querySelector('[data-bridge="coach-explore"] iframe'); if (f && f.contentWindow) f.contentWindow.postMessage({ type: 'cl:back' }, location.origin); }
    };
    // the coach's Explore is one frame for the session, as the member's Library is: mounted at the first visit, hidden
    // between visits, and loaded afresh only when its member, asks or coach change (a new address past the #)
    if (st.role !== 'coach') B.cxMounted = false; else if (st.c === 'CX') B.cxMounted = true;
    out.cx = { src: libSrc(st.cxRoute || '#/', 'coach', st.cm), full: libSrc(st.cxRoute || '#/', 'coach', st.cm).replace('embed=1&', ''), mounted: !!B.cxMounted, disp: st.c === 'CX' ? 'flex' : 'none' };

    // the send screen, sized for a corpus of five hundred stories
    if (out.lib) {
      var L = st.lib, ccL = consoleCoach(st), k18L = d.clock[st.clock] || d.clock[0], goneL = k18L.day + (+k18L.hm.slice(0, 2)) / 24 + (+k18L.hm.slice(3)) / 1440 >= 18.75;
      // one coach's world: it sends only to this console's own members, as Messages writes only to them; a send says so
      var ownL = function (mid) { return (lib.members[mid] || {}).coach === ccL; };
      out.lib.to = (out.lib.to || []).filter(function (t, i) { return ownL(d.order[i]); });
      if (!ownL(L.to) && st.c === 'C4') { var firstOwn = d.order.filter(ownL)[0]; if (firstOwn) setTimeout(function () { if (!ownL(c.state.lib.to)) c.setState({ lib: Object.assign({}, c.state.lib, { to: firstOwn, msg: '' }) }); }, 0); }
      var send0 = out.lib.sendNow, pin0 = out.lib.pinFor, toN = (lib.members[L.to] || {}).first || 'the member';
      out.lib.sendNow = function () { if (!ownL(c.state.lib.to)) return; send0(); if (d.story[c.state.lib.sel] && d.story[c.state.lib.sel].verified) ctoast(c, window.CLC.storyTitle(lib, c.state.lib.sel) + ' sent to ' + toN + ' now.'); };
      out.lib.pinFor = goneL ? function () { ctoast(c, 'This week\u2019s stories went on Sunday at 18:00. Send it now, or pin it next Sunday.'); } : function () { if (ownL(c.state.lib.to)) pin0(); };
      out.lib.groups = (out.lib.groups || []).filter(function (g) { return g.items.length; }).map(function (g) {
        var f = g.fam.replace('Family ', ''); return Object.assign({}, g, { fam: lib.situations.some(function (s) { return s.fam === f; }) ? f + ' · ' + (window.CLC.FAMILY[f] || '') : g.fam });
      });
      var mine = [];
      d.order.forEach(function (mid) { var m = d.members[mid]; (mid === P ? st.core : (m.core || [])).concat(m.reserve ? [m.reserve] : []).forEach(function (h) { if (mine.indexOf(h) < 0) mine.push(h); }); });
      if (L.hero !== 'all' && mine.indexOf(L.hero) < 0) mine.unshift(L.hero);
      var seg = function (id, label) { var on = L.hero === id; return { label: label, bg: on ? 'var(--ink)' : 'transparent', fg: on ? 'var(--paper)' : 'var(--ink)', bd: on ? 'var(--ink)' : 'var(--hair)', go: function () { S({ lib: Object.assign({}, st.lib, { hero: id }) }); } }; };
      out.lib.heroSegs = [seg('all', 'All')].concat(mine.filter(function (h) { return d.hero[h]; }).map(function (h) { return seg(h, d.hero[h].short); }));
      // for the member it would go to: the stories nearest their three first, each marked with its links
      var to = lib.members[L.to] ? L.to : P, toM = lib.members[to], toThree = to === P && st.core && st.core.length ? st.core.map(function (h) { return iconOf[h] || h; }) : toM ? toM.heroes_icons.core : [];
      var farN = 0;
      var fil = d.stories.filter(function (s) { return (L.key === 'all' || s.keys.indexOf(L.key) >= 0) && (L.hero === 'all' || s.hero === L.hero) && (L.reach === 'all' || s.reach === L.reach) && (L.ver === 'all' || (L.ver === 'verified') === s.verified); });
      if (toM && window.CLN && fil.length === (out.lib.results || []).length) {
        var hk = to + ':' + toThree.join(','), Hm = hopsCache[hk] || (hopsCache[hk] = window.CLN.hops(lib, to, { three: toThree }));
        var lk = function (s) { var ic = lib.story[s.id] ? lib.story[s.id].icon : null, h = ic && Hm[ic]; return h ? h.links : 9; };
        var mark = function (n) { return n === 0 ? 'one of ' + toM.first + '\u2019s three' : ''; };   // nearly every life is one link away, so only the three are marked
        var hideFar = L.hideFar && L.reach === 'all';
        // as Review does: a life the member had last fortnight, and a draft with no source to check it against, are said
        // on the card
        var hadL = window.CLQ ? window.CLQ.recentTo(lib, to) : [], held = function (s) {
          var x = lib.story[s.id], h = x && hadL.filter(function (y) { return y.icon === x.icon; })[0];
          return h ? toM.first + ' had ' + (lib.icon[x.icon] || {}).name + ' on ' + String(h.day).replace(/^\w{3} /, '') : x && !x.verified && !window.CLN.sourceOk(x) ? 'needs a source' : '';
        };
        // each card by the story's one title, as Review names it
        out.lib.results = out.lib.results.map(function (r, i) { var n = lk(fil[i]), hd = held(fil[i]); r.eyebrow = window.CLC.storyTitle(lib, fil[i].id); r.reach = r.reach + (mark(n) ? ' \u00b7 ' + mark(n) : '') + (hd ? ' \u00b7 ' + hd : ''); return { r: r, n: n, i: i, far: fil[i].reach === 'far', hd: !!hd }; })
          .filter(function (x) { if (hideFar && x.far) { farN++; return false; } return true; })
          .sort(function (a, b) { return a.n - b.n || a.i - b.i; }).map(function (x) { return x.r; });
      }
      // far stories wait behind one chip until the coach asks for them
      if (farN) out.lib.count = out.lib.results.length + (out.lib.results.length === 1 ? ' story' : ' stories') + ' close enough to send this week';
      out.lib.farChip = farN ? { label: 'Far stories (' + farN + ')', go: function () { S({ lib: Object.assign({}, st.lib, { hideFar: false }) }); } } : null;
      (out.lib.results || []).forEach(function (r) { if (r.ver === DRAFT) r.ver = 'Recall draft'; });
      var toM2 = lib.members[L.to] || null;
      out.lib.toFirst = toM2 ? toM2.first : 'a member';
      out.lib.askPh = toM2 && toM2.up19 ? 'What is ' + toM2.first + ' facing? ' + toM2.up19.label : 'What is the member facing?';
      out.lib.ask = st.c4ask || '';
      out.lib.setAsk = function (e) { S({ c4ask: e.target.value }); };
      out.lib.askGo = function () { var t = (c.state.c4ask || '').trim(); S({ c: 'CX', cm: L.to, cxRoute: t ? '#/ask?t=' + encodeURIComponent(t) + '&read=1&m=' + encodeURIComponent(L.to) : '#/ask?m=' + encodeURIComponent(L.to) }); };
      var CAP = 120, total = (out.lib.results || []).length;
      if (total > CAP) { out.lib.results = out.lib.results.slice(0, CAP); out.lib.count = total + ' stories · the first ' + CAP + ' shown. Pick a situation or a hero to narrow them.'; }
      var sel = d.story[L.sel] ? L.sel : null;
      if (sel && out.lib.p && lib.story[window.CLC.resolve(lib, sel)]) out.lib.p.eyebrow = window.CLC.storyTitle(lib, sel);
      out.lib.inLibrary = function () { S({ c: 'CX', cxRoute: sel ? '#/story/' + encodeURIComponent(sel) : '#/' }); };
      // how the chosen story reaches that member, and the week's pick beside it
      out.lib.forLine = ''; out.lib.cmp = null;
      if (sel && lib.story[sel] && toM && window.CLN) {
        var ss = lib.story[sel], upK = toM.up19 && lib.sit[toM.up19.sit] ? lib.sit[toM.up19.sit].key : null;
        var key = L.key !== 'all' ? L.key : upK && ss.keys.indexOf(upK) >= 0 ? upK : ss.keys[0], lt = window.CLN.linksTo(lib, to, ss.icon, key, { three: toThree });
        var hadSel = (window.CLQ ? window.CLQ.recentTo(lib, to) : []).filter(function (y) { return y.icon === ss.icon; })[0];
        out.lib.forLine = (hadSel ? toM.first + ' had ' + (lib.icon[ss.icon] || {}).name + ' on ' + String(hadSel.day).replace(/^\w{3} /, '') + '. ' : '') + 'For ' + toM.first + ': ' + (lt.links === 0 ? 'one of ' + toM.first + '\u2019s three.' : lt.links < 9 ? lt.line.charAt(0).toLowerCase() + lt.line.slice(1) : 'not near ' + toM.first + '\u2019s three.');
        var wr = (out.rq && (out.rq.every || out.rq.rows) || []).filter(function (r) { return r.mid === to; })[0], pick = wr && wr.has && wr.s && wr.s.id;
        if (pick && pick !== sel) out.lib.cmp = { label: 'Compare with ' + toM.first + '\u2019s pick for the week', go: function () { S({ c: 'CX', cm: to, cxRoute: '#/cmp?a=' + encodeURIComponent(sel) + '&b=' + encodeURIComponent(pick) + '&m=' + encodeURIComponent(to) }); } };
      }
      // stories related to the one chosen, each with what sets it apart: one tap makes another the choice (worked
      // out while Find and send is open, so the first render of the app does not build the likeness tables for it)
      var rel = st.c === 'C4' && sel && lib.story[sel] ? window.CLC.likeThis(lib, sel, 4, { role: 'coach' }) : [];
      out.lib.hasRel = rel.length > 0;
      // situations by their name, the way the rest of the app writes them
      (out.lib.pKeys || []).forEach(function (k) { var si = d.sitByKey[k.k]; if (si && si.id) k.k = si.id + ' · ' + si.chip; });
      out.lib.rel = rel.map(function (x) {
        var c2 = x.story; return { title: c2.name + ' · ' + (c2.place || ''), why: (x.reasons[0] || {}).text || '', go: function () { S({ lib: Object.assign({}, st.lib, { sel: c2.id, msg: '' }) }); } };
      });
    }
    if (out.rq && out.rq.rows) (out.rq.every || out.rq.rows).forEach(function (r) { r.trace = traceWords(collapseTrace(r.trace || []), r, lib, d); });
    // Swap: the drafts that carry this week's situation, nearest the member's three first, each one check
    // away from the list above it; the hero chips are the member's own three
    // after 18:00 on Sunday the week is a record, and the Swap panel does not open on it
    var k18s = d.clock[st.clock] || d.clock[0];
    if (out.sp && out.sp.open && k18s.day + (+k18s.hm.slice(0, 2)) / 24 + (+k18s.hm.slice(3)) / 1440 >= 18.75) out.sp = { open: false };
    if (out.sp && out.sp.open && out.sp.excluded) {
      var srow = (out.rq && (out.rq.every || out.rq.rows) || []).filter(function (r) { return r.mid === st.swapFor; })[0];
      var ssit = srow && lib.sit[String(srow.key || '').split(' · ')[0]], smem = lib.members[st.swapFor];
      var rest = out.sp.excluded.filter(function (e) { return !e.draft; }), nDraft = out.sp.excluded.length - rest.length;
      out.sp.pairLine = srow && st.swapFor === P && srow.pairNote ? 'This story goes with week 2 of the move. Choose another and the move goes without it.' : '';
      if (ssit) out.sp.sit = String(out.sp.sit).replace(/ \u00b7 [a-z-]+$/, '') + ' \u00b7 ' + ssit.id + ' \u00b7 ' + ssit.chip;
      if (typeof out.sp.heroesLine === 'string') out.sp.heroesLine = out.sp.heroesLine.replace("'s heroes: ", '\u2019s heroes: ');
      // each checked story by its one title, the line's ready story first (CLN.nextFor), and Choose and Pin only where they
      // would change the line; each change shows Changed \u00b7 Undo on the line, and its toast names the story by its title
      var swapSit = srow && lib.sit[String(srow.key || '').split(' \u00b7 ')[0]], eye = {};
      if (swapSit) d.stories.forEach(function (x) { if (x.keys.indexOf(swapSit.key) >= 0 && x.verified && d.hero[x.hero]) eye[d.hero[x.hero].name + ' \u00b7 ' + x.place] = x.id; });
      var readyId = srow && srow.ready ? srow.ready.id : null, swapFor = st.swapFor;
      out.sp.ranked = (out.sp.ranked || []).map(function (o, i) { return { o: o, i: i, id: eye[o.eyebrow] || null }; })
        .sort(function (a, b) { return (b.id === readyId) - (a.id === readyId) || a.i - b.i; }).map(function (x, i) {
          var o = x.o, title = x.id ? window.CLC.storyTitle(lib, x.id) : o.eyebrow, ch = undoable(c, swapFor, o.choose), pn = undoable(c, swapFor, o.pin);
          o.rank = String(i + 1); o.eyebrow = title; o.canPick = !o.isCur;
          o.choose = function () { ch(); ctoast(c, 'Swapped to ' + title + '.'); };
          o.pin = function () { pn(); ctoast(c, 'Pinned ' + title + '.'); };
          return o;
        });
      // the checked stories the rule passed over, by their titles, and a life the member had in the last fortnight said as
      // the line says it ("Sarah had Barack Obama on 12 Oct"), so "Obama" never stands beside Michelle Obama unexplained
      var hadS = window.CLQ && smem ? window.CLQ.recentTo(lib, st.swapFor) : [];
      rest.forEach(function (e) {
        var id = eye[e.eyebrow], x = id && lib.story[window.CLC.resolve(lib, id)]; if (!x) return;
        e.eyebrow = window.CLC.storyTitle(lib, x);
        var h = hadS.filter(function (y) { return y.icon === x.icon; })[0];
        if (h && / sent \d+ days? ago/.test(e.why || '')) e.why = smem.first + ' had ' + lib.icon[x.icon].name + ' on ' + String(h.day).replace(/^\w{3} /, '') + ' (no hero twice in 14 days)';
      });
      if (ssit && smem && window.CLN) {
        var three = st.swapFor === P && st.core && st.core.length ? st.core.map(function (h) { return iconOf[h] || h; }) : smem.heroes_icons.core;
        var F = weekAnswer(st, lib, srow, {}), picks = F.pick ? [F.pick].concat(F.next) : [];   // the week's one answer, as the line has it
        var sfirst = smem.first, nm = function (id) { var I = lib.icon[id]; return I ? I.name : id; };
        var dr = picks.map(function (x) {
          var I = lib.icon[x.story.icon], key = 'swap:' + x.story.id, open = st.fillOpen === key;
          var near = x.links === 0 ? 'One of ' + sfirst + '\u2019s three.' : x.links === 1 ? 'One step from ' + nm(x.hero) + '.' : x.links < 9 ? window.CLC.cap1(window.CLC.num(x.links)) + ' steps from ' + sfirst + '\u2019s three.' : 'Not near ' + sfirst + '\u2019s three.';
          return { eyebrow: window.CLC.storyTitle(lib, x.story), why: 'Recall draft. ' + near, draft: true, goLabel: open ? 'Close' : 'Check the source',
            go: function () { S({ fillOpen: open ? null : key }); }, open: open, card: open ? checkCard(c, x.story.id, st.swapFor, 'swap') : null };
        });
        var more = nDraft - dr.length;
        if (more > 0) dr.push({ eyebrow: more + ' more recall drafts carry ' + ssit.id + '.', why: 'Every story of this week, in the library.', draft: true, goLabel: 'Open them in the library',
          go: function () { S({ c: 'CX', cm: st.swapFor, cxRoute: '#/situation/' + ssit.id + '?at=sitplot', swapFor: null }); } });
        out.sp.excluded = rest.concat(dr); out.sp.hasExcluded = out.sp.excluded.length > 0;
        var shorts = three.map(function (i) { var h = d.hero[appOf[i] || i]; return h ? h.short : ''; });
        if (out.sp.filters) out.sp.filters = out.sp.filters.filter(function (f) { return f.label === 'All heroes' || shorts.indexOf(f.label) >= 0; });
      }
    }
    B.lastC = st.c;
    if (out.msg && out.msg.drawerList) {
      var dl = out.msg.drawerList, ver = dl.filter(function (x) { return !x.dis; });
      if (dl.length > ver.length) out.msg.drawerList = ver.concat([{ eyebrow: (dl.length - ver.length) + ' recall drafts are in the Library', first: 'Check one against its source there and it appears here, ready to send.', dis: true, op: 0.45, title: '', ver: 'Recall draft', go: function () {} }]);
    }
  }

  // ---------- reading on inside the app ----------
  // A story in the app opens onto the corpus: the same kind of week, the same world, more from the person.
  // Each opens in the same overlay; the back button walks the way you came, one step at a time.
  function here(st) { return { overlay: st.overlay, sid: st.sid, sctx: st.sctx, hid: st.hid, hctx: st.hctx, top: readerTop() }; }
  // the scroller of the story or hero page open in the member app, and putting it back where it was
  function readerBox() {
    var pane = document.querySelector('[data-screen-label="M7 Story"], [data-screen-label="M14 Hero"]'); if (!pane) return null;
    var scrolls = function (el) { var oy = getComputedStyle(el).overflowY; return (oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight; };
    var inner = [pane].concat([].slice.call(pane.querySelectorAll('div'))).filter(scrolls)[0]; if (inner) return inner;
    for (var el = pane.parentElement; el && el !== document.body; el = el.parentElement) if (scrolls(el)) return el;
    return null;
  }
  function readerTop() { var b = readerBox(); return b ? b.scrollTop : 0; }
  function toTop(top) { requestAnimationFrame(function () { requestAnimationFrame(function () { var b = readerBox(); if (b) b.scrollTop = top || 0; }); }); }
  // This week's scroller, so a story opened from While you wait comes back to the week where it was left
  function weekBox() {
    for (var el = document.querySelector('[data-screen-label="M6 This week"]'); el && el !== document.body; el = el.parentElement) { var oy = getComputedStyle(el).overflowY; if (oy === 'auto' || oy === 'scroll') return el; }
    return null;
  }
  function weekTop() { var b = weekBox(); return b ? b.scrollTop : 0; }
  // the week's room is behind the member: Thursday, after its 14:00 start and an hour's meeting
  function passed0(st, d) { var k = d.clock[st.clock] || d.clock[0], rd = k.day >= 19 ? 22 : 15; return k.day > rd || (k.day === rd && k.hm >= '15:00'); }
  // A member asks the coach to check a recall draft: one signal, and the story in the coach's thread with the ask
  var hopsCache = {};
  function asksOf(st) { return (st.signals || []).filter(function (g) { return g.kind === 'check'; }); }
  function askCheck(c, sid) {
    var st = c.state, d = _cpd, P = st.p; if (!d || !d.story[sid] || d.story[sid].verified) return;
    if (asksOf(st).some(function (g) { return g.sid === sid; })) return;
    var k = d.clock[st.clock] || d.clock[0], mm = Object.assign({}, st.msgs);
    mm[P] = (st.msgs[P] || []).concat([{ id: 'k' + Date.now(), from: 'member', kind: 'story', story: sid, body: 'Would you check this one against its source?', day: k.day, at: d.lab(k.day) + ', ' + k.hm, live: true }]);
    c.setState({ signals: st.signals.concat([{ kind: 'check', sid: sid, day: k.day }]), msgs: mm });
  }
  function openStoryHere(c, sid) {
    var st = c.state, stack = st.overlay ? (st.sstack || []).concat([here(st)]) : [];
    c.setState({ overlay: 'story', sid: sid, sctx: { back: 'stack' }, sstack: stack, notForMe: false, opened: st.opened.indexOf(sid) >= 0 ? st.opened : st.opened.concat([sid]) });
    toTop(0);
  }
  function openHeroHere(c, hid) {
    var st = c.state, stack = st.overlay ? (st.sstack || []).concat([here(st)]) : [];
    c.setState({ overlay: 'hero', hid: hid, hctx: { back: 'stack' }, sstack: stack, notForMe: false });
    toTop(0);
  }
  function stackBack(c, out, st) {
    var back = function () {
      var s2 = c.state, stk = (s2.sstack || []).slice(), prev = stk.pop();
      if (!prev) {
        var wt = s2.tab === 'week' ? B.weekTop : null; B.weekTop = null; c.setState({ overlay: null });
        if (wt != null) requestAnimationFrame(function () { requestAnimationFrame(function () { var b = weekBox(); if (b) b.scrollTop = wt; }); });
        return;
      }
      var top = prev.top; delete prev.top; c.setState(Object.assign({ sstack: stk, notForMe: false }, prev)); toTop(top);
    };
    if (st.overlay === 'story' && st.sctx && st.sctx.back === 'stack' && out.sv) out.sv.back = back;
    if (st.overlay === 'hero' && st.hctx && st.hctx.back === 'stack' && out.hv) out.hv.back = back;
    // the engine sends a story's "more about" to the hero page with back: 'story'; keep the stack whole when it does
    if (st.overlay === 'story' && out.sv && out.sv.openHero) { var hid0 = (_cpd.story[st.sid] || {}).hero; out.sv.openHero = function () { openHeroHere(c, hid0); }; }
  }
  // a related story's row: the person and the place (or the year); a reason that ends on the year the title gives says it once
  function row(c, card, why) {
    var at = card.place || (card.clash ? '' : window.CLC.yearLabel(card.year)), y = window.CLC.yearLabel(card.year);
    // a year the title already says is not said again in the reason ("Sonia Sotomayor · Washington, July 2009 / From law")
    if (y && (!card.place || String(card.place).indexOf(y) >= 0) && typeof why === 'string') why = why.replace(new RegExp(',\\s*' + y + '(?=$|\\s\\u00b7)'), '');
    return { title: card.name + (at ? ' · ' + at : ''), why: why, open: function () { openStoryHere(c, card.id); } };
  }
  function relatedStory(c, out, st, lib) {
    var CLC = window.CLC, s = lib.story[CLC.resolve(lib, st.sid)]; if (!s) return;
    var groups = [];
    if (st.role === 'coach') {
      // a coach reading in the app: others who lived this week, each with what sets it apart
      var L = CLC.likeThis(lib, s.id, 3, { role: 'coach' });
      if (L.length) groups.push({ label: 'Others who lived this week', items: L.map(function (x) { return row(c, x.story, x.reasons[0].text); }) });
    } else {
      // one next story, when the member wants it: the ranker While you wait uses (CLN.fitFor), this story's situations
      // named first, leaving out what they have had and what they have read here
      var core = coreIcons(st), M = lib.members[st.p] || {}, wk = weekKeyOf(st, lib, s);
      var mine = (M.sits || []).map(function (id) { return lib.sit[id] && lib.sit[id].key; });
      var opened = (st.opened || []).map(function (x) { return CLC.resolve(lib, x); });
      var links = function (o) { if (core.indexOf(o.icon) >= 0) return 0; var b = window.CLN ? window.CLN.bridge(lib, st.p, o.icon, wk.key, { three: core }) : null; return b && b.steps ? b.steps.length : 9; };
      var fit = window.CLN && lib.members[st.p] ? fitOf(lib, st.p, Object.assign(asNow(st, lib), { three: core, extended: addedIcons(st), keys: [wk.key].concat(s.keys, mine), now: wk.now, exclude: hasAlready(st, lib).concat(opened, [s.id]), avoidIcons: recentIcons(lib, st.p), n: 1 }))[0] : null;
      var next = fit ? { o: fit.story } : null;
      if (next) groups.push({ label: 'Next, when you want it', items: [row(c, CLC.storyCard(lib, next.o), fit.why.replace(/\.$/, '') + (next.o.verified ? '' : ' \u00b7 Recall draft'))] });
      // then two others who lived this week, the nearest the member's three first, each tie said in words
      var taken = {}; if (next) taken[next.o.icon] = 1; taken[s.icon] = 1;
      var L2 = CLC.likeThis(lib, s.id, 8, { role: 'member', three: core, key: wk.key }).map(function (x, i) { return { x: x, i: i, o: lib.story[x.story.id] }; })
        .filter(function (y) { return y.o && !taken[y.o.icon] && opened.indexOf(y.o.id) < 0; });
      L2.forEach(function (y) { y.l = links(y.o); });
      var said = {};
      var two = L2.sort(function (a, b) { return a.l - b.l || a.i - b.i; }).slice(0, 2).map(function (y) {
        var lt = window.CLN && y.l === 1 ? window.CLN.linksTo(lib, st.p, y.o.icon, wk.key, { three: core }) : null;
        var why = y.l === 0 ? 'From ' + ((lib.icon[y.o.icon] || {}).short || '') + ', one of your three' : lt && lt.steps.length ? 'One step from ' + ((lib.icon[lt.hero] || {}).short || '') + ': ' + (window.CLN.why(lib, lt.steps[0].a, lt.steps[0].b, lt.steps[0].tie)[0] || '').replace(/^Both /, 'both ').replace(/\.$/, '') : y.x.reasons[0].text;
        if (said[why]) why = y.x.reasons[0].text; said[why] = 1;   // no reason twice in one list
        return row(c, y.x.story, why + (y.o.verified ? '' : ' \u00b7 Recall draft'));
      });
      if (two.length) groups.push({ label: 'Others who lived this week', items: two });
      var nWeek = (lib.byKey[wk.key] || []).length;
      // the week itself, in the library: its situation page (the story's own page would show this story again)
      var wSit = lib.sitByKey[wk.key];
      groups.push({ label: '', items: [{ title: 'All of this week, in the library', why: nWeek + ' stories, each with what sets it apart', open: function () { B.libFromTop = readerTop(); S_(c, { overlay: 'library', libRoute: wSit ? '#/situation/' + wSit.id : '#/story/' + encodeURIComponent(s.id) + '?at=others', libBack: 'story', libDepth: 1, libPrev: '', libPrevTo: '' }); } }] });
    }
    out.sv.rel = groups; out.sv.hasRel = groups.length > 0;
    reachOf(c, out, st, lib, s);
    out.sv.isDraft = !s.verified;
    var coF = ((lib.coaches[(lib.members[st.p] || {}).coach] || {}).first) || 'your coach';
    // a recall draft, said once (draftInfo); once asked for, the ask says it is with the coach, and promises no day
    if (st.role !== 'coach' && !s.verified) {
      var was = asksOf(st).some(function (g) { return g.sid === st.sid; });
      out.sv.checkAsk = { label: was ? 'Asked. ' + coF + ' has it.' : 'Ask ' + coF + ' to check it', dis: was, go: function () { askCheck(c, st.sid); }, after: was ? 'You will see it here once ' + coF + ' has checked it.' : '' };
      out.sv.draftInfo = draftInfo(c, st, s, coF);
    } else { out.sv.checkAsk = null; out.sv.draftInfo = null; }
    // why this story, for you: the coach's choice for the week's room (the export's rooms are on Thursdays), said first
    // ("Bret chose this for Thursday’s product review."); the person's age then beside the member's, only on a checked
    // story whose year holds (CLC.ageLine)
    out.sv.forYou = ''; out.sv.ageLine = '';
    if (st.role !== 'coach') {
      var rv = (st.review || {})[st.p] || {}, wkOf = -1;
      (st.micro || []).forEach(function (m) { if ((m.w === 1 || m.w === 2) && m.ins && CLC.resolve(lib, m.ins.story) === s.id) wkOf = m.w - 1; });
      if (wkOf < 0 && (rv.action === 'swap' || rv.action === 'pin') && rv.story && CLC.resolve(lib, rv.story) === s.id) wkOf = 1;
      var rm = wkOf >= 0 ? roomOf(lib, st.p, wkOf) : '';
      if (rm) { out.sv.forYou = coF + ' chose this for Thursday\u2019s ' + rm + '.'; out.sv.pinned = false; }
      var nowA = asNow(st, lib).age;
      out.sv.ageLine = CLC.ageLine(lib, s, nowA === undefined ? (lib.members[st.p] || {}).age : nowA);
    }
    var co = ((lib.members[st.p] || {}).coach && lib.coaches[lib.members[st.p].coach]) || {};
    out.sv.draftNote = st.role === 'coach' ? 'Recall draft. Check it against its source before you send it.' : window.CLC.draftLine(co.first);
    // a coach's working note never reaches a member; the citation shows once the story is checked
    if (st.role !== 'coach') {
      var src = window.CLC.sourceFor(s, 'member'), cau = window.CLC.cautionFor(s, 'member'), M0 = lib.members[st.p] || {};
      var wk0 = weekKeyOf(st, lib, s);
      out.sv.source = src ? 'Source: ' + src : ''; out.sv.caution = cau; out.sv.hasCaution = !!cau;
      if (out.sv.why) out.sv.why = window.CLC.whyFor({ why: out.sv.why, keys: s.keys }, 'member', wk0.mine ? wk0.key : false, lib, wk0.now);
    }
  }
  // The one week a story page is about, for this member: this week's situation when the story carries it, else the first
  // of their own situations it carries, else its own first. Why, Others who lived this week and All of this week read it.
  function weekKeyOf(st, lib, s) {
    var M = lib.members[st.p] || {}, k = _cpd.clock[st.clock] || _cpd.clock[0], nowSit = k.day >= 19 && M.up19 ? M.up19.sit : st.mv && st.mv.sit;
    var now = lib.sit[nowSit] ? lib.sit[nowSit].key : null, mine = (M.sits || []).map(function (id) { return lib.sit[id] && lib.sit[id].key; }).filter(Boolean);
    var key = now && s.keys.indexOf(now) >= 0 ? now : s.keys.filter(function (x) { return mine.indexOf(x) >= 0; })[0] || s.keys[0];
    return { key: key, now: now, mine: mine.indexOf(key) >= 0 };
  }
  // How a story from beyond the three reaches them: the strongest chain, at most two links, from one of the
  // member's heroes to the story's life, every link a shared situation and one more reason (lib/net.js).
  // Hidden when the story is from one of the three, or when no chain is that short.
  function reachOf(c, out, st, lib, s) {
    var CLN = window.CLN; out.sv.hasReach = false;
    if (!CLN || st.role !== 'member') return;
    var core = (st.core || []).map(function (h) { return iconOf[h] || h; }).filter(function (id) { return lib.icon[id]; });
    if (!core.length || core.indexOf(s.icon) >= 0 || !lib.icon[s.icon] || !lib.icon[s.icon].stories.length) return;
    var mine = ((lib.members[st.p] || {}).sits || []).map(function (id) { return lib.sit[id] && lib.sit[id].key; });
    var key = s.keys.filter(function (k) { return mine.indexOf(k) >= 0; })[0] || s.keys[0], best = null;
    core.forEach(function (h) { var r = CLN.route(lib, h, s.icon, { max: 2, lastKey: key }); if (r && (!best || r.cost < best.r.cost)) best = { h: h, r: r }; });
    if (!best || !best.r.length) return;
    var H = lib.icon[best.h], X = lib.icon[s.icon], hn = H.short || H.name, ids = [best.h].concat(best.r.map(function (x) { return x.b; }));
    var nm = function (id) { return id === best.h ? hn : lib.icon[id].name; };
    var lede = best.r.length === 1 ? X.name + ' is one step from ' + hn + ', one of your three.' : X.name + ' is two steps from ' + hn + ', one of your three, through ' + lib.icon[ids[1]].name + '.';
    // each person at the year of their own story in the situation they share with the next; the story's own life at the
    // year of this story, the one year its page shows
    var yearIn = function (id, i) {
      if (id === s.icon) return s.yearClash ? '' : window.CLC.yearLabel(s.year);
      var step = best.r[i] || best.r[i - 1], ks = step && step.tie ? step.tie.shared : [];
      var x0 = (lib.byIcon[id] || []).map(function (x) { return lib.story[x]; }).filter(function (x) { return x && x.keys.some(function (k) { return ks.indexOf(k) >= 0; }); })[0];
      return x0 ? (x0.yearClash ? '' : window.CLC.yearLabel(x0.year)) : window.CLC.yearLabel(lib.icon[id].year);
    };
    out.sv.hasReach = true;
    out.sv.reach = {
      lede: lede,
      people: ids.map(function (id, i) {
        var I = lib.icon[id], last = i === ids.length - 1;
        return { link: i > 0, n: i, ini: I.ini, name: nm(id), year: yearIn(id, i),
          bg: i === 0 ? 'var(--mad12)' : last ? 'var(--pru)' : 'var(--pru12)', fg: i === 0 ? 'var(--mad)' : last ? 'var(--paper)' : 'var(--pru)',
          open: function () { openHeroHere(c, appId(id)); } };
      }),
      steps: best.r.map(function (x, i) { var w = CLN.why(lib, x.a, x.b, x.tie); return { n: i + 1, text: nm(x.a) + ' and ' + nm(x.b) + ' ' + w[0].replace(/^Both /, 'both ') }; })
    };
  }
  // The member's Ask: "Is this about…". Members describe their week, so the words can only order the list;
  // the member's tap decides. Their own situations come first, in their own words, ordered by what they
  // wrote; "None of these" opens the closest others; "Send it to Jim as it is" is always there. Measured
  // on 30 fresh member asks: the old three keyword rules found a situation for 1 of them.
  function askChoices(c, out, st, lib) {
    var d = _cpd, CLQ = window.CLQ, M = lib.members[st.p]; if (!M || !d) return;
    var text = (st.ask && st.ask.text) || '', sc = {};
    (CLQ ? CLQ.situationScores(lib, text, M) : []).forEach(function (x) { sc[x.id] = x.score; });
    var engine = {}; (out.ak.chips || []).forEach(function (ch) { var hit = d.sits.filter(function (x) { return x.chip === ch.label; })[0]; if (hit) engine[hit.id] = ch.pick; else engine.else = ch.pick; });
    var reset = function (f) { return function () { c.setState({ askMore: false }); f(); }; };
    // every situation goes through one rule, the bridge's: what the member already has is left out, and a draft
    // near their three answers when nothing checked does
    var pick = function (sid) { return function () { chooseHere(c, sid); }; };
    var line = function (sid) { var x = lib.sit[sid]; return x ? '“' + x.member_line + '”' : d.sit[sid].chip; };
    var byScore = function (a, b) { return (sc[b] || 0) - (sc[a] || 0) || (a < b ? -1 : 1); };
    var mine = (M.sits || []).filter(function (x) { return d.sit[x]; }).sort(byScore);
    var co = (lib.coaches[M.coach] || {}).first || 'your coach';
    var send = { label: 'Send it to ' + co + ' as it is', pick: reset(engine.else || function () {}) };
    if (st.askMore) {
      var others = lib.situations.map(function (x) { return x.id; }).filter(function (x) { return mine.indexOf(x) < 0 && d.sit[x]; }).sort(byScore).slice(0, 6);
      out.ak.chips = others.map(function (x) { return { label: line(x), pick: pick(x) }; }).concat([send]);
    } else {
      var lead = Object.keys(sc).filter(function (x) { return mine.indexOf(x) < 0 && d.sit[x] && sc[x] >= 0.3 && sc[x] > (sc[mine[0]] || 0); }).sort(byScore).slice(0, 1);
      out.ak.chips = lead.concat(mine).map(function (x) { return { label: line(x), pick: pick(x) }; })
        .concat([{ label: 'None of these', pick: function () { c.setState({ askMore: true }); } }, send]);
    }
  }
  // the engine's own choice, for a situation its three keyword rules never offer: the same rule (verified,
  // in the situation, not declined, inside a hero's scope; the member's three first, then the extended
  // heroes, then the library; near before far; then by id)
  // The member's answer: a draft says so once and can be sent to the coach to check; how its life reaches the
  // three is said in words; a checked story the member already holds is named; heroes with no story share a line
  function askAnswer(c, out, st, lib) {
    var d = _cpd, A = st.ask || {}, ds = A.story && d.story[A.story], s = ds && lib.story[window.CLC.resolve(lib, A.story)];
    var co = (lib.coaches[(lib.members[st.p] || {}).coach] || {}).first || 'your coach';
    out.ak.weekNote = ''; out.ak.reach = ''; out.ak.checkAsk = null; out.ak.draftMark = ''; out.ak.draftInfo = null;
    if (A.weekHad && d.story[A.weekHad]) { var w = d.story[A.weekHad]; out.ak.weekNote = 'You already have ' + d.hero[w.hero].name + '’s story from ' + w.place + ' for this. Here is another.'; }
    if (s && !s.verified) {
      var was = asksOf(st).some(function (g) { return g.sid === A.story; });
      out.ak.draftMark = window.CLC.draftLine(co); out.ak.draftInfo = draftInfo(c, st, s, co);
      out.ak.checkAsk = { label: was ? 'Asked. ' + co + ' has it.' : 'Ask ' + co + ' to check it', dis: was, go: function () { askCheck(c, A.story); }, after: was ? 'You will see it on This week once ' + co + ' has checked it.' : '' };
    }
    if (s && window.CLN) {
      var three = (st.core || []).map(function (h) { return iconOf[h] || h; }), key = A.key || s.keys[0], lt = window.CLN.linksTo(lib, st.p, s.icon, key, { three: three });
      var nm = function (id) { var I = lib.icon[id]; return I ? I.short || I.name : id; };
      out.ak.reach = lt.links === 0 ? 'From ' + nm(lt.hero) + ', one of your three.' : lt.links === 1 ? 'One step from ' + nm(lt.hero) + ': ' + (window.CLN.why(lib, lt.steps[0].a, lt.steps[0].b, lt.steps[0].tie)[0] || '').replace(/^Both /, 'both ') : lt.links < 9 ? lt.line : '';
    }
    var none = (out.ak.walk || []).filter(function (w) { return w.none && !/using/.test(w.text); }), keep = (out.ak.walk || []).filter(function (w) { return !(w.none && !/using/.test(w.text)); });
    if (none.length) {
      // a hero with a recall draft for this week says so, waiting for the coach's check; the rest share one line
      var hs = none.map(function (w) { return w.text.split(' isn')[0]; }).map(function (sh) { return d.heroes.filter(function (x) { return x.short === sh; })[0] || { name: sh, id: null }; });
      var drafty = hs.filter(function (h) { return h.id && A.key && d.stories.some(function (x) { return x.hero === h.id && !x.verified && x.keys.indexOf(A.key) >= 0; }); }), bare = hs.filter(function (h) { return drafty.indexOf(h) < 0; });
      drafty.forEach(function (h) { keep.push({ has: false, none: true, text: h.name + ' has a recall draft for this, waiting for ' + co + '\u2019s check.' }); });
      if (bare.length) keep.push({ has: false, none: true, text: andWords(bare.map(function (h) { return h.name; })) + (bare.length > 1 ? ' have' : ' has') + ' no story for this yet.' });
    }
    out.ak.walk = keep;
    out.ak.anyWay = keep.some(function (w) { return w.has; });
    // the answer is about the week in the member's own words
    var akSit = A.key && lib.sitByKey[A.key];
    out.ak.about = akSit && window.CLQ && window.CLQ.about ? window.CLQ.about(lib, akSit.id) : (out.ak.chipLabel ? 'About: ' + out.ak.chipLabel : '');
  }
  // CLN.fitFor and CLN.nextFor remembered: the same member, heroes, week and exclusions give the same answer until a check
  // is made or taken back (markVerified and markUnverified clear it), so a keystroke in a check note does not search the
  // graph again. fitOf: what next for a member; nextOf: the week's one answer
  function fitOf(lib, mid, o) { var k = 'fit|' + mid + '|' + JSON.stringify(o); return fillMemo[k] || (fillMemo[k] = window.CLN.fitFor(lib, mid, o)); }
  function nextOf(lib, mid, key, o) { var k = 'next|' + mid + '|' + key + '|' + JSON.stringify(o); return fillMemo[k] || (fillMemo[k] = window.CLN.nextFor(lib, mid, Object.assign({ key: key }, o))); }
  // the member's heroes as the app holds them now (the persona's three and the heroes they added), as library lives
  function coreIcons(st) { return (st.core || []).map(function (h) { return iconOf[h] || h; }); }
  function addedIcons(st) { return (st.extended || []).map(function (x) { return x && (iconOf[x.hero] || x.hero); }).filter(Boolean); }
  function recentIcons(lib, mid) { return window.CLQ ? window.CLQ.recentTo(lib, mid).map(function (x) { return x.icon; }) : []; }
  // the member's interests and age as the app holds them now: no age when they chose not to give a birth year
  function asNow(st, lib) {
    var M = lib.members[st.p] || {}, age = st.bornSkip ? null : st.born && M.born && M.age ? M.age + (M.born - st.born) : undefined;
    return { reserve: st.reserve ? iconOf[st.reserve] || st.reserve : undefined, ints: st.interests && st.interests.length ? st.interests.slice() : undefined, age: age };
  }
  // what already goes to a member this week: the story their Review row sends, and any story a coach sent them or
  // answered an Ask with since Monday; no surface offers one of these again
  function goingTo(st, lib, mid, row) {
    var k = _cpd.clock[st.clock] || _cpd.clock[0], mon = 12 + 7 * Math.floor((k.day - 12) / 7), rv = (st.review || {})[mid] || {}, out = [];
    if (row && row.has && row.s && row.s.verified && rv.action !== 'hold') out.push(window.CLC.resolve(lib, row.s.id));
    (st.msgs[mid] || []).forEach(function (m) { if (m.from === 'coach' && m.kind === 'story' && m.story && m.day >= mon) out.push(window.CLC.resolve(lib, m.story)); });
    return out;
  }
  // the week's one answer for a Review row (CLN.nextFor): the line's ready and its one check, Details' first two cards,
  // the Ask reply and the plan's checks for this week all read it
  function weekAnswer(st, lib, r, o) {
    var sit = lib.sit[String(r.key || '').split(' · ')[0]]; if (!sit) return { ready: null, pick: null, next: [], total: 0 };
    return nextOf(lib, r.mid, sit.key, Object.assign(r.mid === st.p ? asNow(st, lib) : {}, { three: r.mid === st.p && st.core && st.core.length ? coreIcons(st) : null, extended: r.mid === st.p ? addedIcons(st) : [], prefer: (o && o.prefer) || null,
      exclude: window.CLQ.sentTo(lib, r.mid).map(function (x) { return window.CLC.resolve(lib, x); }), avoid: recentIcons(lib, r.mid), going: goingTo(st, lib, r.mid, r) }));
  }
  // a checked story sent to a member at 18:00 in place of the week's, said in a toast by its title
  function sendNow(c, mid, sid) {
    return function () {
      var lib = B.lib, M = lib.members[mid] || {};
      var msg = window.CLC.storyTitle(lib, sid) + ' goes to ' + (M.first || 'the member') + ' at 18:00.';
      c.setState(Object.assign(rvChange(c, mid, { action: 'swap', story: sid }), { ctoast: msg })); setTimeout(function () { if (c.state.ctoast === msg) c.setState({ ctoast: null }); }, 3200);
    };
  }
  // A change to a member's line on Review, kept so the line can say "Changed · Undo" until 18:00 (st.rvUndo). Each entry
  // holds the line as it was and as the change left it, so a reset or a later change leaves it stale and unshown
  function rvChange(c, mid, entry) {
    var st = c.state, rv = Object.assign({}, st.review); rv[mid] = entry;
    return { review: rv, rvUndo: (st.rvUndo || []).concat([{ mid: mid, before: (st.review || {})[mid], after: entry }]) };
  }
  // the engine's own changes to a line (Approve, Pin, Hold, the Swap panel's Choose and Pin), kept the same way as
  // they reach setState
  function undoable(c, mid, fn) {
    return function () {
      var own = Object.prototype.hasOwnProperty.call(c, 'setState'), set0 = c.setState, before = (c.state.review || {})[mid];
      c.setState = function (p, cb) {
        if (p && p.review && p.review[mid] !== before) p = Object.assign({}, p, { rvUndo: (c.state.rvUndo || []).concat([{ mid: mid, before: before, after: p.review[mid] }]) });
        return set0.call(c, p, cb);
      };
      try { return fn.apply(this, arguments); } finally { if (own) c.setState = set0; else delete c.setState; }
    };
  }
  // the member's last change, while the line is still as it left it; Undo puts the line back as it was
  function undoFor(st, mid) {
    var u = st.rvUndo || [];
    for (var i = u.length - 1; i >= 0; i--) if (u[i].mid === mid) return u[i].after === (st.review || {})[mid] ? i : -1;
    return -1;
  }
  // Undo puts the line back, and the toast says what the line now does at 18:00 (decorate reads B.undone)
  function undoLast(c, mid) {
    var st = c.state, i = undoFor(st, mid); if (i < 0) return;
    var u = st.rvUndo.slice(), e = u.splice(i, 1)[0], rv = Object.assign({}, st.review), mark = { mid: mid, at: Date.now() };
    if (e.before === undefined) delete rv[mid]; else rv[mid] = e.before;
    B.undone = mark; c.setState({ review: rv, rvUndo: u, ctoast: null });
    setTimeout(function () { if (B.undone === mark) { B.undone = null; c.setState({ _undone: Date.now() }); } }, 3200);
  }
  // when a member meets their coach: the slot the export keeps, if it was this member who moved it, or else the time on
  // their record
  function meetOf(st, lib, mid) { var M = lib.members[mid] || {}; return st.slotFor === mid ? st.slot : M.next; }
  // the room of a member's week (0 the move's first, 1 the next) by its short name, as a sentence says it: "product
  // review", "first group meeting", and "Ardent pitch" kept, as its long name ("Pitch to Ardent Health") names Ardent
  function roomOf(lib, mid, w) {
    var r = ((lib.members[mid] || {}).rooms || [])[w]; if (!r) return '';
    var short = String(r[1] || r[0]), first = short.split(' ')[0];
    return new RegExp('\\s' + first + '\\b').test(String(r[0])) ? short : window.CLC.lowerFirst(short);
  }
  // M2's bracket by its own counts (CPE.dbg.bracketOf, as the bracket is built): "Your bracket: 16 people. Eight leaders,
  // and eight from Creators, Sport and Film & TV." A short interest's places go to leaders, and are counted as theirs
  function bracketWords(st, out) {
    var C = window.CLC, ints = (st.interests || []).slice(0, 3), br = _cpe.dbg.bracketOf(st), by = {}, names = [], extra = 0;
    br.ints.forEach(function (id) { var t = (br.meta[id] || {}).interest; if (!t) { extra++; return; } if (!by[t]) { by[t] = 0; names.push(t); } by[t]++; });
    var lead = br.leaders.length + extra, love = br.ints.length - extra, and = function (a) { return a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; };
    out.m2Bracket = 'Your bracket: ' + br.ids.length + ' people. ' + (!ints.length ? 'Half are leaders, and half come from what you pick.'
      : C.cap1(C.num(lead)) + ' leaders, and ' + C.num(love) + ' from ' + and(names) + '.');
    if (ints.length) out.m2Line = 'Your bracket draws from: ' + names.map(function (n) { return n + ' ' + by[n]; }).join(' · ');
  }
  // C6, step 5: the first week's guarantee (CLN.firstWeekGap), before anything has gone to the member. The week's own draft
  // first, as the coach chose it for the week; each row opens the check card in place. A check of the week's draft fills the week; a check of another also
  // makes it the week's story (the first micro-move's), or marks it checked only. Gone once a checked story fills the week.
  function firstWeek(c, st, lib) {
    var P = st.p, M = lib.members[P], C = window.CLC; if (!M || !st.mv || !lib.sit[st.mv.sit]) return null;
    var CO = lib.coaches[M.coach] || {}, w1 = (st.micro || [])[0], ins = w1 && w1.ins && lib.story[C.resolve(lib, w1.ins.story)] ? w1.ins : null;
    var held = ins && !lib.story[C.resolve(lib, ins.story)].verified ? C.resolve(lib, ins.story) : null;
    var o = Object.assign(asNow(st, lib), { sit: st.mv.sit, three: coreIcons(st), extended: addedIcons(st), exclude: st.declined || [], prefer: held, closeTo: ins && ins.closeTo ? iconOf[ins.closeTo] || ins.closeTo : null, coach: CO.first });
    var k = 'gap|' + P + '|' + JSON.stringify(o), gaps = fillMemo[k] || (fillMemo[k] = window.CLN.firstWeekGap(lib, P, o));
    var g = gaps.filter(function (x) { return x.first; })[0]; if (!g || !g.picks.length) return null;
    var sit = lib.sit[g.sit], up = M.up19 && lib.sit[M.up19.sit], day = (/^\w{3} (\d+ \w{3})/.exec((M.up19 || {}).label || '') || [])[1];
    var twice = up && up.key === g.key && day;   // the next meeting asks for the same kind of week: one story cannot go twice
    return {
      // weeks are named by their Monday, as Review names them
      line: M.first + '’s first week has no checked story for “' + String(sit.member_line).replace(/'/g, '’') + '” One check fills it.' + (twice && window.CLQ ? ' The week of ' + window.CLQ.weekDay(2) + ' needs a second.' : ''),
      rows: g.picks.map(function (x) {
        var sid = x.story.id, open = st.gapOpen === sid, card = open ? checkCard(c, sid, P, 'first') : null, mine = sid === held;
        if (card) {
          card.title = '';   // the row above names it
          card.sendLabel = 'Checked. It goes to ' + M.first + ' on Monday'; card.both = !mine;
          card.send = function () { var n = String((c.state.checkNote || {})[sid] || '').trim(); if (!n) return; doCheck(c, sid, n, function () {
            var p = { gapOpen: null, ctoast: 'Checked. ' + C.storyTitle(lib, x.story) + ' goes to ' + M.first + ' on Monday.' };
            if (!mine) p.micro = c.state.micro.map(function (m, i) { return i === 0 ? Object.assign({}, m, { ins: { story: sid, src: 'coach' } }) : m; });
            c.setState(p); setTimeout(function () { if (c.state.ctoast === p.ctoast) c.setState({ ctoast: null }); }, 3200);
          }); };
        }
        return { id: sid, title: C.storyTitle(lib, x.story), why: x.reason, label: open ? 'Close' : 'Check', card: card, go: function () { c.setState({ gapOpen: open ? null : sid }); } };
      })
    };
  }
  // "Recall draft", said once: its line is open on the first draft a member meets (st.seen, by member) and folded on every
  // other, and the 44px info button beside the mark opens or folds it (st.draftTap)
  function draftInfo(c, st, s, coF) {
    var seenK = 'draft:' + st.p, first = (st.seen || {})[seenK], tap = st.draftTap || {};
    if (!first) setTimeout(function () { if (!(c.state.seen || {})[seenK]) { var sn = Object.assign({}, c.state.seen); sn[seenK] = s.id; c.setState({ seen: sn }); } }, 0);
    var open = Object.prototype.hasOwnProperty.call(tap, s.id) ? !!tap[s.id] : !first || first === s.id;
    return { open: open, openS: open ? 'true' : 'false', text: window.CLC.draftWhy(s, coF),
      toggle: function () { var t = Object.assign({}, c.state.draftTap); t[s.id] = !open; c.setState({ draftTap: t }); } };
  }
  // a member's season as the corpus matcher serves it (CLC.season), worked out once: which week a later check is for.
  // The demo's week is the move's second (lib/ask.js's CURRENT_W)
  var NOW_W = 2, seasons = {};
  function seasonOf(lib, mid) {
    if (!(mid in seasons)) { try { B.matcher = B.matcher || window.CLC.matcher(loaded.corpus); seasons[mid] = window.CLC.season(lib, B.matcher, mid, 8); } catch (e) { seasons[mid] = null; } }
    return seasons[mid];
  }
  // The coach whose console is open: a check is recorded in their name
  function consoleCoach(st) { var lib = B.lib, m = lib && lib.members[st.p]; return (m && m.coach) || 'jim'; }
  // A source check made in the coach's console: the ledger first, then the engine, then whatever comes next. One check
  // at a time for a story (B.inflight): its card says so while the ledger records it, so a second press makes no second
  // check. The check always reaches the engine; what comes next happens only in the console that asked for it (the same
  // persona, step and view), so a late answer never paints on another coach's console.
  function sameView(st) { return st.p + '|' + st.clock + '|' + st.role; }
  // the demo clock as a day and its fraction (Sunday 18 Oct at 18:00 is 18.75); a check carries the moment it was made, so
  // the week's record after 18:00 is not rewritten by a check made later
  function demoNow(st) { var k = _cpd.clock[st.clock] || _cpd.clock[0]; return k.day + (+k.hm.slice(0, 2)) / 24 + (+k.hm.slice(3)) / 1440; }
  function lateCheck(sid) { var e = B.ledger[sid]; return !!(e && e.demoAt >= 18.75); }
  function doCheck(c, sid, note, then) {
    if (B.inflight[sid]) return;
    var st0 = c.state, tok = sameView(st0), by = consoleCoach(st0), entry = { by: by, note: note, at: new Date().toISOString(), demoAt: demoNow(st0) };
    B.inflight[sid] = 1; c.setState({ _ledger: Date.now() });
    fetch('/api/constellation/state/ledger', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ story: sid, by: by, note: note }) })
      .catch(function () { return null; }).then(function () {
        delete B.inflight[sid]; markVerified(sid, entry); c.setState({ _ledger: Date.now() });
        if (then && sameView(c.state) === tok) then();
      });
  }
  // a toast that clears itself, unless another has taken its place
  function ctoast(c, msg) { c.setState({ ctoast: msg }); setTimeout(function () { if (c.state.ctoast === msg) c.setState({ ctoast: null }); }, 3200); }
  // The check card: the scene, the quotation and the source, one required note, the coach's name, and the choice
  // to send it to the member at 18:00 or to mark it checked only. After 18:00 on Sunday a check sends nothing: the card
  // marks the story checked, for a later week
  function checkCard(c, sid, mid, where) {
    var st = c.state, lib = B.lib, s = lib.story[sid], I = s && lib.icon[s.icon], M = lib.members[mid]; if (!s || !I || !M) return null;
    var byId = consoleCoach(st), by = (lib.coaches[byId] || {}).name || byId, note = (st.checkNote || {})[sid] || '', entry = B.ledger[sid];
    var noteNow = function () { return String((c.state.checkNote || {})[sid] || '').trim(); }, busy = !!B.inflight[sid];
    var k18 = _cpd.clock[st.clock] || _cpd.clock[0], late = k18.day + (+k18.hm.slice(0, 2)) / 24 + (+k18.hm.slice(3)) / 1440 >= 18.75;
    var title = window.CLC.storyTitle(lib, s), dis = !note.trim() || busy;
    var only = function () { var n = noteNow(); if (!n) return; doCheck(c, sid, n, function () {
      var p = { ctoast: 'Checked. ' + title + (late || where === 'plan' ? ' is ready for a later week.' : ' is ready to send.') };
      if (where === 'row' || where === 'swap') p.fillOpen = null;
      c.setState(p); setTimeout(function () { if (c.state.ctoast === p.ctoast) c.setState({ ctoast: null }); }, 3200);
    }); };
    return { show: true, title: title, moment: window.CLC.bodyAfterPlace(s.moment, s.placeAsWritten || s.place), pattern: s.pattern ? '\u201c' + s.pattern + '\u201d' : '',
      source: (window.CLC.sourceFor(s, 'coach') || 'not given') + (s.yearClash ? ' ' + s.yearClash + '.' : ''), todo: !s.verified, done: !!s.verified,
      doneText: 'Checked by ' + (((lib.coaches[(entry || {}).by] || {}).name) || by) + (entry && entry.note ? ' against ' + entry.note : '') + '.',
      note: note, by: by, dis: dis, op: dis ? 0.45 : 1,
      setNote: function (e) { var m = Object.assign({}, c.state.checkNote); m[sid] = String(e.target.value).slice(0, 240); c.setState({ checkNote: m }); },
      sendLabel: busy ? 'Recording the check\u2026' : late ? 'Mark it checked' : 'Checked. Send to ' + M.first + ' at 18:00', both: !late && !busy,
      send: late ? only : function () { var n = noteNow(); if (!n) return; doCheck(c, sid, n, function () {
        var too = Object.keys(B.rvOpenWeeks || {}).filter(function (m) { return m !== mid && s.keys.indexOf(B.rvOpenWeeks[m]) >= 0 && lib.members[m]; }).map(function (m) { return lib.members[m].first; });
        var msg = 'Checked. ' + title + ' goes to ' + M.first + ' at 18:00.' + (too.length ? ' It is ready to send to ' + andWords(too) + ' too.' : '');
        c.setState(Object.assign(rvChange(c, mid, { action: 'swap', story: sid }), { fillOpen: null, swapFor: where === 'swap' ? null : c.state.swapFor, ctoast: msg }));
        setTimeout(function () { if (c.state.ctoast === msg) c.setState({ ctoast: null }); }, 3200);
      }); },
      only: only
    };
  }
  // what a member already has: each week's pairing, the stories a coach sent them, and what they declined
  function hasAlready(st, lib) {
    var P = st.p, d = _cpd, out = window.CLQ ? window.CLQ.sentTo(lib, P).map(function (x) { return window.CLC.resolve(lib, x); }) : [];
    (st.msgs && st.msgs[P] || []).forEach(function (m) { if (m.from === 'coach' && m.kind === 'story' && m.story) out.push(m.story); });
    return out.concat(st.declined || []);
  }
  function chooseHere(c, sid) {
    var d = _cpd, st = c.state, k = d.clock[st.clock] || d.clock[0], key = d.sit[sid].key;
    c.setState({ ask: Object.assign({}, st.ask, { stage: 'loading', key: key, draft: false, weekHad: null }), askMore: false });
    setTimeout(function () {
      var s2 = c.state, A = s2.ask, core = s2.core || [], ext = (s2.extended || []).map(function (x) { return x.hero; }), scopes = s2.scopes || {}, lib = B.lib, had = hasAlready(s2, lib);
      var tier = function (h) { return core.indexOf(h) >= 0 ? 0 : ext.indexOf(h) >= 0 ? 1 : 2; };
      var inKey = d.stories.filter(function (x) { return x.keys.indexOf(key) >= 0 && x.verified && !(scopes[x.hero] && scopes[x.hero].indexOf(key) < 0); });
      var ok = inKey.filter(function (x) { return had.indexOf(x.id) < 0; }).map(function (x) { return { s: x, tier: tier(x.hero) }; });
      var near = ok.filter(function (o) { return o.s.reach !== 'far'; }), pool = (near.length ? near : ok).sort(function (a, b) { return a.tier - b.tier || (a.s.id < b.s.id ? -1 : 1); });
      var p = pool[0], at = d.lab(k.day) + ', ' + k.hm;
      // the member already holds the checked story for this: say so, and offer the draft nearest their three
      var heldIt = inKey.filter(function (x) { return had.indexOf(x.id) >= 0 && (s2.declined || []).indexOf(x.id) < 0; })[0];
      if (!p && lib && window.CLN) {
        var three = core.map(function (h) { return iconOf[h] || h; }), f = window.CLN.fillSlot(lib, s2.p, key, { three: three, exclude: had });
        if (f.pick && d.story[f.pick.story.id]) {
          var dr = f.pick.story.id;
          return c.setState({ ask: Object.assign({}, A, { stage: 'answer', story: dr, tier: f.pick.links === 0 ? 0 : 2, draft: true, weekHad: heldIt ? heldIt.id : null }),
            askHist: s2.askHist.concat([{ text: A.text, key: key, story: dr, day: k.day }]) });
        }
      }
      if (!p) {
        var mm = Object.assign({}, s2.msgs); mm[s2.p] = s2.msgs[s2.p].concat([{ id: 'a' + Date.now(), from: 'member', kind: 'ask', body: A.text, chip: d.sit[sid].chip, day: k.day, at: at, live: true }]);
        return c.setState({ ask: Object.assign({}, A, { stage: 'else' }), msgs: mm, askHist: s2.askHist.concat([{ text: A.text, key: key, story: null, day: k.day }]) });
      }
      c.setState({ ask: Object.assign({}, A, { stage: 'answer', story: p.s.id, tier: p.tier, draft: false, weekHad: heldIt ? heldIt.id : null }), askHist: s2.askHist.concat([{ text: A.text, key: key, story: p.s.id, day: k.day }]) });
    }, 1200);
  }
  function S_(c, p) { c.setState(p); }
  function andWords(a) { return a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function relatedHero(c, out, st, lib) {
    var CLC = window.CLC, iconId = iconOf[st.hid] || st.hid, ic = lib.icon[iconId]; if (!ic) return;
    var received = (out.hv.stories || []).length, groups = [];
    var shown = {}; (c.state.saved || []).forEach(function (id) { shown[id] = 1; });
    var theirs = ic.stories.map(function (id) { return CLC.storyCard(lib, lib.story[id]); });
    if (theirs.length) groups.push({ label: (received ? 'All ' : '') + theirs.length + (theirs.length === 1 ? ' story' : ' stories') + ' from ' + CLG_short(ic.name), items: theirs.map(function (cd) { return row(c, cd, cd.first + (cd.verified ? '' : ' \u00b7 Recall draft')); }) });
    // kindred: a shared situation and one more reason, said in words, as the Library says it (lib/net.js); a reason given
    // once is pointed to after that ("As above, and two years apart.")
    var kin = window.CLN ? window.CLN.kindred(lib, iconId, 3) : [], saidK = {};
    if (kin.length) groups.push({ label: 'Kindred lives', items: kin.map(function (x) {
      var k = lib.icon[x.id], again = x.why.some(function (w) { return saidK[w]; }), fresh = x.why.filter(function (w) { return !saidK[w]; }).slice(0, 2); x.why.forEach(function (w) { saidK[w] = 1; });
      var why = !fresh.length ? 'For the reasons given above.' : again ? 'As above, and ' + CLC.lowerFirst(fresh.join(' ')) : fresh.join(' ');
      return { title: k.name, why: why, open: function () { openHeroHere(c, appId(k.id)); } };
    }) });
    out.hv.lib = groups; out.hv.hasLib = groups.length > 0;
    // one way into the library: the count is the list's, above
    if (theirs.length) { out.hv.moreInLib = false; out.hv.exploreLabel = 'Explore ' + (d0Hero(st.hid) || ic.name) + ' in the library'; }
  }
  // the name a Back button carries: the surname, without Jr. or III ("Kagan", "King"); one name stays whole
  function d0Hero(hid) { return _cpd && _cpd.hero[hid] ? _cpd.hero[hid].short : ''; }
  function surname(name) { var w = String(name).replace(/,? (Jr\.?|Sr\.?|II|III|IV)$/, '').split(' '); return w[w.length - 1]; }
  function CLG_short(name) { var w = String(name).split(' '); return w.length > 2 && !/^(de|van|von)$/i.test(w[w.length - 2]) ? w[0] + ' ' + w[w.length - 1] : name; }

  // ---------- 4 · messages from the Library frame ----------
  var SAVED_TOAST = 'Saved. It\u2019s on You.';
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || !e.data || typeof e.data.type !== 'string' || e.data.type.indexOf('cl:') !== 0) return;
    var c = B.c, m = e.data; if (!c || !_cpd) return;
    var st = c.state, d = _cpd, sid = m.story && B.lib ? window.CLC.resolve(B.lib, m.story) : m.story;
    // a check made in the Library frame reaches the engine at once; the app records it, so the record outlives the frame
    if (m.type === 'cl:verified' && sid) {
      var en = m.entry && typeof m.entry === 'object' ? { by: String(m.entry.by || 'coach'), note: String(m.entry.note || ''), at: String(m.entry.at || new Date().toISOString()), demoAt: demoNow(st) } : { by: 'coach', note: '', at: new Date().toISOString(), demoAt: demoNow(st) };
      markVerified(sid, en); c.setState({ _ledger: Date.now() });
      if (m.record) fetch('/api/constellation/state/ledger', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ story: sid, by: en ? en.by : 'coach', note: en ? en.note : '' }), keepalive: true }).catch(function () {});
    }
    if (m.type === 'cl:unverified' && sid) {
      markUnverified(sid); c.setState({ _ledger: Date.now() });
      if (m.record) fetch('/api/constellation/state/ledger?story=' + encodeURIComponent(sid), { method: 'DELETE', keepalive: true }).catch(function () {});
    }
    if (m.type === 'cl:send' && sid && d.story[sid]) c.setState({ c: 'C4', lib: Object.assign({}, sendEntry(st, m.member && d.members[m.member] ? m.member : st.lib.to, sid), { sel: sid, hero: 'all', reach: 'all', ver: 'all', to: m.member && d.members[m.member] ? m.member : st.lib.to, msg: '' }) });
    // one saved list, the app's: the frame says on or off and is told the list back
    var tell = function (list) {
      var told = { type: 'cl:state', saved: list, asked: asksOf(c.state).map(function (g) { return g.sid; }) };
      if (e.source) e.source.postMessage(told, location.origin);
      if (B.lx && B.lx.el && e.source === B.lx.el.contentWindow) B.lx.told = JSON.stringify(told);
    };
    if (m.type === 'cl:hello') tell(st.saved || []);
    if (m.type === 'cl:save' && sid && d.story[sid]) {
      var has = st.saved.indexOf(sid) >= 0, on = typeof m.on === 'boolean' ? m.on : !has;
      var next = on ? (has ? st.saved : st.saved.concat([sid])) : st.saved.filter(function (x) { return x !== sid; });
      c.setState({ saved: next, toast: on ? SAVED_TOAST : null }); tell(next);
      if (on) setTimeout(function () { if (c.state.toast === SAVED_TOAST) c.setState({ toast: null }); }, 2800);
    }
    if (m.type === 'cl:ask' && sid && d.story[sid]) c.setState({ overlay: 'thread', attach: sid,
      threadBack: st.overlay === 'library' ? { overlay: 'library', libRoute: st.libRoute, libBack: st.libBack, libDepth: st.libDepth, libPrev: st.libPrev, libPrevTo: st.libPrevTo, libTitle: st.libTitle } : null });
    if (m.type === 'cl:check' && sid && d.story[sid]) { askCheck(c, sid); tell(c.state.saved || []); }
    if (m.type === 'cl:route' && typeof m.route === 'string' && m.route.charAt(0) === '#') {
      var hop = { depth: Math.max(1, m.depth | 0), prev: String(m.prev || '').slice(0, 24), to: String(m.prevTo || '').slice(0, 80), title: String(m.title || '').slice(0, 120) };
      if (m.as !== 'coach' && B.lx) { B.lx.at = m.route; B.lx.depth = hop.depth; B.lx.hops++; }
      c.setState(m.as === 'coach' ? { cxRoute: m.route, cxDepth: hop.depth, cxPrev: hop.prev } : { libRoute: m.route, libDepth: hop.depth, libPrev: hop.prev, libPrevTo: hop.to, libTitle: hop.title });
    }
    // the trail read in the frame comes home: You can pick it up where it stopped
    if (m.type === 'cl:trail' && Array.isArray(m.nodes) && m.nodes.length) {
      var nodes = m.nodes.filter(function (n) { return n && typeof n.href === 'string' && n.href.charAt(0) === '#' && typeof n.label === 'string'; }).slice(-8)
        .map(function (n) { return { label: n.label.slice(0, 60), href: n.href, kind: String(n.kind || '') }; });
      var total = Math.max(nodes.length, Math.min(999, m.total | 0));
      if (nodes.length && (total !== (st.trail && st.trail.total) || JSON.stringify(nodes) !== JSON.stringify(st.trail && st.trail.nodes))) c.setState({ trail: { nodes: nodes, total: total, day: (d.clock[st.clock] || d.clock[0]).day } });
    }
    if (m.type === 'cl:close' && st.overlay === 'library') { c.setState({ overlay: st.libBack || null, libDepth: 0 }); if (st.libBack) toTop(B.libFromTop); }
    // the Library hands a story to the app: it opens here, and back returns to the Library where it was
    if (m.type === 'cl:open' && sid && d.story[sid]) openStoryHere(c, sid);
    var k = d.clock[st.clock] || d.clock[0], day = k.day, at = d.lab(k.day) + ', ' + k.hm;
    // a member found someone in the Library: it goes to the coach as a hero to add, the prototype's own flow
    if (m.type === 'cl:add-hero' && m.icon) {
      var hid = appId(m.icon), name = (B.lib.icon[m.icon] || {}).name || m.name;
      if (!st.pending.concat(st.extended).some(function (p) { return p.hero === hid; }) && st.core.indexOf(hid) < 0)
        c.setState({ pending: st.pending.concat([{ name: name, hero: hid, why: 'Found in the library', day: day, live: true }]), toast: 'Sent to ' + (d.coaches[d.members[st.p].coach] || {}).first + '.' });
      setTimeout(function () { c.setState({ toast: null }); }, 2800);
    }
    // a coach suggests someone to the member being prepped, in that member's thread
    if (m.type === 'cl:suggest-hero' && m.icon && d.members[m.member]) {
      var nm = (B.lib.icon[m.icon] || {}).name || m.name, mm = Object.assign({}, st.msgs);
      mm[m.member] = (st.msgs[m.member] || []).concat([{ id: 'c' + Date.now(), from: 'coach', kind: 'text', body: 'I\u2019d like to suggest ' + nm + ' for your heroes. Have a look in the library and tell me yes or no.', day: day, at: at, live: true }]);
      c.setState({ msgs: mm, ctoast: 'Suggested ' + nm + ' to ' + d.members[m.member].first + '.' });
      setTimeout(function () { c.setState({ ctoast: null }); }, 2800);
    }
  });
  B.state = function () { return B.c ? B.c.state : null; };
  // the send guard's fortnight, for the engine (send-guard-week): a story whose life the member had in the last 14 days
  // waits, whatever chose it
  B.hadLife = function (mid, sid) { var lib = B.lib, s = lib && lib.story[window.CLC.resolve(lib, sid)]; return !!s && recentIcons(lib, mid).indexOf(s.icon) >= 0; };
})();
