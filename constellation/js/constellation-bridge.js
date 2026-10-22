/* Constellation bridge: the corpus inside the prototype.

   The prototype (index.html, js/constellation-proto-data.js, js/constellation-proto-engine.js) is a
   Claude Design export and stays as exported. This file sits beside it and does four things:

   1  Feeds it. It holds the engine back until the corpus bundle (data/corpus.json), the demo world
      from the back end (/api/constellation/demo, falling back to data/demo.json) and the shared
      verification ledger have loaded, then merges them into window.CPD through lib/core.js. The
      prototype's 13 sample stories keep their ids; the corpus's 525 stories and 437 lives join them.
   2  Keeps the rules. Corpus stories arrive as recall drafts, so the engine's own rule (only a
      verified story is sent) still decides every week. A coach's source check in the Library lifts it.
   3  Opens the Library. Members reach it from Heroes, a hero page or a story; coaches from the
      Library tab, which now opens on Explore, with the old send screen one tab along.
   4  Talks to the Library frame (same origin, postMessage): send to a member, save, ask the coach,
      a story verified.

   It loads from the page head, before the runtime injects the export's scripts (which run in no
   fixed order), and catches window.CPD and window.CPE as they are assigned. */
(function () {
  'use strict';
  var BASE = '/constellation/';
  var _cpd = null, _cpe = null, ready = false, loaded = null, failed = false, t0 = Date.now();
  var B = window.CLB = { ready: false, source: null, lib: null, ledger: {}, ns: null, c: null, errors: [] };

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

  B.ns = ns();
  Promise.all([
    getJSON(BASE + 'data/corpus.json'),
    getJSON(BASE + 'data/demo.json'),
    getJSON('/api/constellation/demo').then(function (p) { B.source = 'api'; return p; }, function (e) { B.source = 'static'; B.errors.push(String(e)); return null; }),
    getJSON('/api/constellation/state?ns=' + encodeURIComponent(B.ns)).catch(function (e) { B.errors.push(String(e)); return null; })
  ]).then(function (r) {
    var demo = r[1];
    if (r[2]) { ['coaches', 'members', 'order', 'personas', 'msgs'].forEach(function (k) { if (r[2][k]) demo[k] = r[2][k]; }); }
    B.ledger = Object.assign({}, (r[3] && r[3].ledger) || {}, localLedger());
    B.store = r[3] ? r[3].store : 'none';
    loaded = { corpus: r[0], demo: demo };
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
  }

  // ---------- 1 · feed ----------
  var appOf = {};   // library icon id -> the hero id the prototype uses
  var iconOf = {};  // prototype hero id -> library icon id
  function appId(iconId) { return appOf[iconId] || iconId; }

  function feed(d, corpus, demo) {
    var CLC = window.CLC;
    var lib = CLC.merge(corpus, demo);
    CLC.applyVerification(lib, B.ledger);
    B.lib = lib;
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
      return { id: s.id, hero: appId(s.icon), place: s.place || s.era || '', keys: s.keys.slice(), reach: s.reach, verified: !!s.verified,
        moment: s.origin === 'corpus' ? CLC.bodyAfterPlace(s.moment, s.place) : s.moment, pattern: foreign ? s.pattern_en : s.pattern, by: s.by || (foreign ? 'translated; the original is in the Library' : ''),
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
    B.ledger[sid] = entry || { by: 'coach', at: new Date().toISOString() };
    if (lib && lib.story[sid]) { lib.story[sid].verified = true; lib.story[sid].status = 'verified'; }
    if (_cpd && _cpd.story[sid]) { _cpd.story[sid].verified = true; _cpd.story[sid].status = 'verified'; }
    try { var l = localLedger(); l[sid] = B.ledger[sid]; localStorage.setItem('cl-ledger', JSON.stringify(l)); } catch (e) {}
  }

  function markUnverified(sid) {
    delete B.ledger[sid];
    [B.lib && B.lib.story[sid], _cpd && _cpd.story[sid]].forEach(function (s) { if (s && s.status === 'verified') { s.verified = false; s.status = s.origin === 'sample' ? 'sample-draft' : 'recall'; } });
    try { var l = localLedger(); delete l[sid]; localStorage.setItem('cl-ledger', JSON.stringify(l)); } catch (e) {}
  }

  // ---------- 3 · the Library, from inside the app ----------
  function libSrc(route, as, mid) {
    var st = B.c && B.c.state, th = st && st.theme === 'dark' ? '&theme=dark' : '';
    var core = as === 'member' && st && st.core && st.core.length ? '&core=' + st.core.map(function (h) { return encodeURIComponent(iconOf[h] || h); }).join(',') : '';
    return BASE + 'library?embed=1&as=' + as + (mid ? '&m=' + encodeURIComponent(mid) : '') + core + th + (route || '#/');
  }
  function iconRoute(heroId) { return '#/icon/' + encodeURIComponent(iconOf[heroId] || heroId); }

  // ---------- 2 · wrap the engine's view ----------
  var DRAFT = 'Draft — must verify';
  function collapseTrace(lines) {
    var n = 0, out = [];
    lines.forEach(function (t) {
      if (typeof t !== 'string') { out.push(t); return; }
      if (t.indexOf(DRAFT) >= 0 && /skipped/.test(t)) { n++; return; }
      if (t.indexOf('nothing eligible') >= 0) {
        var parts = t.split('; '), k = parts.filter(function (p) { return p.indexOf(DRAFT) >= 0; }).length;
        n += k; t = parts.filter(function (p) { return p.indexOf(DRAFT) < 0; }).join('; ');
        if (/eligible:\s*$/.test(t)) t = t.replace(/:\s*$/, ': every candidate is a recall draft');
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

  function decorate(c, out) {
    var st = c.state, d = _cpd, S = function (p) { c.setState(p); };
    var P = st.p, lib = B.lib;
    if (!lib) return;
    var nStories = d.stories.length, nLives = B.counts.withStory;
    var hasBack = function (b) { return b || !out.lg; };

    // member: the Library as an overlay
    out.ov.library = st.overlay === 'library';
    out.lx = {
      src: libSrc(st.libRoute || '#/', 'member', P),
      back: function () { S({ overlay: st.libBack || null }); },
      backIcon: hasBack(st.libBack) ? 'ph ph-arrow-left' : 'ph ph-x', backLabel: hasBack(st.libBack) ? 'Back' : 'Close',
      full: libSrc(st.libRoute || '#/', 'member', P).replace('embed=1&', '')
    };
    var openLib = function (route, back) { return function () { S({ overlay: 'library', libRoute: route, libBack: back || null }); }; };
    if (out.hz) {
      out.hz.explore = openLib('#/', null);
      out.hz.exploreLine = nStories + ' stories from ' + nLives + ' lives. Start from your three and follow the trail.';
    }
    if (st.overlay === 'hero' && st.hid && out.hv) {
      var hh = d.hero[st.hid], n = d.libOf(st.hid).n;
      out.hv.explore = openLib(iconRoute(st.hid), 'hero');
      out.hv.exploreLabel = n ? 'Explore ' + hh.short + ' in the library · ' + n + (n === 1 ? ' story' : ' stories') : 'Explore ' + hh.short + ' in the library';
    }
    if (st.overlay === 'story' && st.sid && out.sv) {
      out.sv.explore = openLib('#/story/' + encodeURIComponent(st.sid), 'story');
      out.sv.exploreLabel = 'Follow this story into the library';
    }

    // coach: Library opens on Explore; the send screen is one tab along
    var onLib = st.c === 'C4' || st.c === 'CX';
    (out.nav || []).forEach(function (n) {
      if (n.label !== 'Library') return;
      n.bg = onLib ? 'var(--well)' : 'transparent'; n.fg = onLib ? 'var(--ink)' : 'var(--mute)';
      n.go = function () { S({ c: 'CX', swapFor: null }); };
    });
    out.cs.CX = st.c === 'CX';
    if (st.c === 'CX') out.cTitle = 'Library';
    var tab = function (on, go) { return { bg: on ? 'var(--ink)' : 'transparent', fg: on ? 'var(--paper)' : 'var(--ink)', bd: on ? 'var(--ink)' : 'var(--hair)', go: go }; };
    out.lt = {
      explore: tab(st.c === 'CX', function () { S({ c: 'CX' }); }),
      send: tab(st.c === 'C4', function () { S({ c: 'C4' }); }),
      line: nStories + ' stories from ' + nLives + ' lives · ' + d.stories.filter(function (s) { return !s.verified && s.origin === 'corpus'; }).length + ' recall drafts waiting for a source check'
    };
    out.cx = { src: libSrc(st.cxRoute || '#/', 'coach', st.cm), full: libSrc(st.cxRoute || '#/', 'coach', st.cm).replace('embed=1&', '') };

    // the send screen, sized for a corpus of five hundred stories
    if (out.lib) {
      var L = st.lib;
      out.lib.groups = (out.lib.groups || []).filter(function (g) { return g.items.length; }).map(function (g) {
        var f = g.fam.replace('Family ', ''); return Object.assign({}, g, { fam: lib.situations.some(function (s) { return s.fam === f; }) ? f + ' · ' + (window.CLC.FAMILY[f] || '') : g.fam });
      });
      var mine = [];
      d.order.forEach(function (mid) { var m = d.members[mid]; (mid === P ? st.core : (m.core || [])).concat(m.reserve ? [m.reserve] : []).forEach(function (h) { if (mine.indexOf(h) < 0) mine.push(h); }); });
      if (L.hero !== 'all' && mine.indexOf(L.hero) < 0) mine.unshift(L.hero);
      var seg = function (id, label) { var on = L.hero === id; return { label: label, bg: on ? 'var(--ink)' : 'transparent', fg: on ? 'var(--paper)' : 'var(--ink)', bd: on ? 'var(--ink)' : 'var(--hair)', go: function () { S({ lib: Object.assign({}, st.lib, { hero: id }) }); } }; };
      out.lib.heroSegs = [seg('all', 'All')].concat(mine.filter(function (h) { return d.hero[h]; }).map(function (h) { return seg(h, d.hero[h].short); }));
      var CAP = 120, total = (out.lib.results || []).length;
      if (total > CAP) { out.lib.results = out.lib.results.slice(0, CAP); out.lib.count = total + ' stories · the first ' + CAP + ' shown. Pick a situation or a hero to narrow them.'; }
      var sel = d.story[L.sel] ? L.sel : null;
      out.lib.inLibrary = function () { S({ c: 'CX', cxRoute: sel ? '#/story/' + encodeURIComponent(sel) : '#/' }); };
    }
    if (out.rq && out.rq.rows) out.rq.rows.forEach(function (r) { r.trace = collapseTrace(r.trace || []); });
    if (out.sp && out.sp.open && out.sp.excluded) {
      var drafts = out.sp.excluded.filter(function (e) { return e.draft; }), rest = out.sp.excluded.filter(function (e) { return !e.draft; });
      if (drafts.length > 5) out.sp.excluded = rest.concat(drafts.slice(0, 5), [{ eyebrow: '+ ' + (drafts.length - 5) + ' more recall drafts', why: 'Check one against its source in the Library and it can be sent.', draft: true }]);
    }
    if (out.msg && out.msg.drawerList) {
      var dl = out.msg.drawerList, ver = dl.filter(function (x) { return !x.dis; });
      if (dl.length > ver.length) out.msg.drawerList = ver.concat([{ eyebrow: (dl.length - ver.length) + ' recall drafts are in the Library', first: 'Check one against its source there and it appears here, ready to send.', dis: true, op: 0.45, title: '', ver: 'Draft', go: function () {} }]);
    }
  }

  // ---------- 4 · messages from the Library frame ----------
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || !e.data || typeof e.data.type !== 'string' || e.data.type.indexOf('cl:') !== 0) return;
    var c = B.c, m = e.data; if (!c || !_cpd) return;
    var st = c.state, d = _cpd, sid = m.story && B.lib ? window.CLC.resolve(B.lib, m.story) : m.story;
    if (m.type === 'cl:verified' && sid) { markVerified(sid, m.entry); c.setState({ _ledger: Date.now() }); }
    if (m.type === 'cl:unverified' && sid) { markUnverified(sid); c.setState({ _ledger: Date.now() }); }
    if (m.type === 'cl:send' && sid && d.story[sid]) c.setState({ c: 'C4', lib: Object.assign({}, st.lib, { sel: sid, key: 'all', hero: 'all', reach: 'all', ver: 'all', to: m.member && d.members[m.member] ? m.member : st.lib.to, msg: '' }) });
    if (m.type === 'cl:save' && sid && d.story[sid]) c.setState({ saved: st.saved.indexOf(sid) >= 0 ? st.saved.filter(function (x) { return x !== sid; }) : st.saved.concat([sid]) });
    if (m.type === 'cl:ask' && sid && d.story[sid]) c.setState({ overlay: 'thread', attach: sid });
    if (m.type === 'cl:route' && typeof m.route === 'string' && m.route.charAt(0) === '#') c.setState(m.as === 'coach' ? { cxRoute: m.route } : { libRoute: m.route });
    if (m.type === 'cl:close') c.setState({ overlay: st.libBack || null });
  });
  B.state = function () { return B.c ? B.c.state : null; };
})();
