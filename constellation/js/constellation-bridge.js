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

  // the house voice over the prototype's product copy, in place, so the engine's own references hold (CLC.COPY)
  function voiced(o, seen) {
    seen = seen || [];
    if (!o || typeof o !== 'object' || seen.indexOf(o) >= 0) return; seen.push(o);
    Object.keys(o).forEach(function (k) { var v = o[k]; if (typeof v === 'string') { var t = window.CLC.voice(v); if (t !== v) o[k] = t; } else if (v && typeof v === 'object') voiced(v, seen); });
  }
  function feed(d, corpus, demo) {
    var CLC = window.CLC;
    if (!d.__voiced) { voiced(d); d.__voiced = true; }
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

  // ---------- frames at true size ----------
  // The export shrinks a device to fit the window's height, so on a 1280 x 800 laptop the phone's body
  // copy reads at 84% and the coach console's 11px labels at 9px. Hold the scale at 1 whenever the
  // window is wide enough, and let the frame be shorter instead (down to three quarters of its height,
  // or 70% for the console) before any type shrinks. The console also takes the window's own width,
  // between 1360 and 1440, so its nine-column roster keeps room to breathe.
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
      var ciw = tab ? 1194 : Math.max(1360, Math.min(1440, vw - cpad)), cih0 = tab ? 834 : 900;
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
      // where the three stand among the member's own situations, said in one line, and the picture a tap away
      out.hz.near = openLib('#/near', null);
      var nb = window.CLN ? window.CLN.near(lib, P, { three: (st.core || []).map(function (h) { return iconOf[h] || h; }) }) : null;
      var held = nb ? nb.three.filter(function (h) { return nb.lives.some(function (l) { return l.id === h && l.held.length; }); }).length : 0;
      out.hz.nearLine = !nb ? '' : held === nb.three.length ? 'All three of your heroes have stood in your situations.' : held ? held + ' of your three ' + (held === 1 ? 'has' : 'have') + ' stood in your situations. See who stands near the others.' : 'None of your three has stood in your situations yet. See who stands near them.';
    }
    if (st.overlay === 'hero' && st.hid && out.hv) {
      var hh = d.hero[st.hid], n = d.libOf(st.hid).n;
      out.hv.explore = openLib(iconRoute(st.hid), 'hero');
      out.hv.exploreLabel = n ? 'Explore ' + hh.short + ' in the library · ' + n + (n === 1 ? ' story' : ' stories') : 'Explore ' + hh.short + ' in the library';
    }
    if (st.overlay === 'story' && st.sid && out.sv) {
      out.sv.explore = openLib('#/story/' + encodeURIComponent(st.sid), 'story');
      out.sv.exploreLabel = 'Follow this story into the library';
      relatedStory(c, out, st, lib);
    }
    if (st.overlay === 'hero' && st.hid && out.hv) relatedHero(c, out, st, lib);
    stackBack(c, out, st);

    // coach: Library opens on Explore; the send screen is one tab along
    var onLib = st.c === 'C4' || st.c === 'CX';
    (out.nav || []).forEach(function (n) {
      if (n.label !== 'Library') return;
      n.bg = onLib ? 'var(--well)' : 'transparent'; n.fg = onLib ? 'var(--ink)' : 'var(--mute)';
      n.go = function () { S({ c: 'CX', swapFor: null }); };
    });
    out.cs.CX = st.c === 'CX';
    // the answer desk: a member's Ask in the coach's thread opens the Library's answer to it, read for that
    // member, with the situation they chose kept as chosen
    if (out.msg && out.msg.list && st.thread) {
      var tid = st.thread;
      out.msg.list.forEach(function (m) {
        if (!m.isAsk) return;
        var chip = window.CLC.fold(m.chip || ''), sit = lib.situations.filter(function (x) { return window.CLC.fold(x.chip) === chip; })[0];
        m.find = function () { S({ c: 'CX', cm: tid, cxRoute: '#/ask?t=' + encodeURIComponent(m.body || '') + '&read=1&m=' + encodeURIComponent(tid) + (sit ? '&sit=' + sit.id : '') }); };
      });
    }
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
      // stories related to the one chosen: one tap makes another the choice
      var rel = sel && lib.story[sel] ? window.CLC.similarStories(lib, sel, 4) : [];
      out.lib.hasRel = rel.length > 0;
      // situations by their name, the way the rest of the app writes them
      (out.lib.pKeys || []).forEach(function (k) { var si = d.sitByKey[k.k]; if (si && si.id) k.k = si.id + ' · ' + si.chip; });
      out.lib.rel = rel.map(function (x) {
        var c2 = x.story; return { title: c2.name + ' · ' + (c2.place || ''), why: (x.reasons[0] || {}).text || '', go: function () { S({ lib: Object.assign({}, st.lib, { sel: c2.id, msg: '' }) }); } };
      });
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

  // ---------- reading on inside the app ----------
  // A story in the app opens onto the corpus: the same kind of week, the same world, more from the person.
  // Each opens in the same overlay; the back button walks the way you came, one step at a time.
  function here(st) { return { overlay: st.overlay, sid: st.sid, sctx: st.sctx, hid: st.hid, hctx: st.hctx }; }
  function openStoryHere(c, sid) {
    var st = c.state, stack = st.overlay ? (st.sstack || []).concat([here(st)]) : [];
    c.setState({ overlay: 'story', sid: sid, sctx: { back: 'stack' }, sstack: stack, notForMe: false, opened: st.opened.indexOf(sid) >= 0 ? st.opened : st.opened.concat([sid]) });
  }
  function openHeroHere(c, hid) {
    var st = c.state, stack = st.overlay ? (st.sstack || []).concat([here(st)]) : [];
    c.setState({ overlay: 'hero', hid: hid, hctx: { back: 'stack' }, sstack: stack, notForMe: false });
  }
  function stackBack(c, out, st) {
    var back = function () { var s2 = c.state, stk = (s2.sstack || []).slice(), prev = stk.pop(); if (!prev) return c.setState({ overlay: null }); c.setState(Object.assign({ sstack: stk, notForMe: false }, prev)); };
    if (st.overlay === 'story' && st.sctx && st.sctx.back === 'stack' && out.sv) out.sv.back = back;
    if (st.overlay === 'hero' && st.hctx && st.hctx.back === 'stack' && out.hv) out.hv.back = back;
    // the engine sends a story's "more about" to the hero page with back: 'story'; keep the stack whole when it does
    if (st.overlay === 'story' && out.sv && out.sv.openHero) { var hid0 = (_cpd.story[st.sid] || {}).hero; out.sv.openHero = function () { openHeroHere(c, hid0); }; }
  }
  function row(c, card, why) { return { title: card.name + ' · ' + (card.place || window.CLC.yearLabel(card.year)), why: why, open: function () { openStoryHere(c, card.id); } }; }
  function relatedStory(c, out, st, lib) {
    var CLC = window.CLC, s = lib.story[CLC.resolve(lib, st.sid)]; if (!s) return;
    var week = CLC.similarStories(lib, s.id, 3), seen = {};
    week.forEach(function (x) { seen[x.story.icon] = 1; });
    var world = CLC.similarStories(lib, s.id, 4, { mode: 'words' }).filter(function (x) { return !seen[x.story.icon]; }).slice(0, 2);
    var more = (lib.byIcon[s.icon] || []).filter(function (id) { return id !== s.id; }).slice(0, 3).map(function (id) { return CLC.storyCard(lib, lib.story[id]); });
    var groups = [];
    if (week.length) groups.push({ label: 'The same kind of week', items: week.map(function (x) { return row(c, x.story, (x.reasons[0] || {}).text || ''); }) });
    if (world.length) groups.push({ label: 'The same world', items: world.map(function (x) { return row(c, x.story, ((x.reasons.filter(function (r) { return r.type === 'words'; })[0]) || x.reasons[0] || {}).text || ''); }) });
    if (more.length) groups.push({ label: 'More from ' + (lib.icon[s.icon] || {}).name, items: more.map(function (cd) { return row(c, cd, cd.first); }) });
    out.sv.rel = groups; out.sv.hasRel = groups.length > 0;
    reachOf(c, out, st, lib, s);
    out.sv.isDraft = !s.verified;
    out.sv.draftNote = 'A recall draft from the library. ' + (st.role === 'coach' ? 'Check it against its source before you send it.' : 'Your coach has not checked it against its source yet.');
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
    var lede = best.r.length === 1 ? X.name + ' stands next to your ' + hn + '.' : X.name + ' is two steps from your ' + hn + ', through ' + lib.icon[ids[1]].name + '.';
    out.sv.hasReach = true;
    out.sv.reach = {
      lede: lede,
      people: ids.map(function (id, i) {
        var I = lib.icon[id], last = i === ids.length - 1;
        return { link: i > 0, n: i, ini: I.ini, name: nm(id), year: window.CLC.yearLabel(I.year),
          bg: i === 0 ? 'var(--mad12)' : last ? 'var(--pru)' : 'var(--pru12)', fg: i === 0 ? 'var(--mad)' : last ? 'var(--paper)' : 'var(--pru)',
          open: function () { openHeroHere(c, appId(id)); } };
      }),
      steps: best.r.map(function (x, i) { var w = CLN.why(lib, x.a, x.b, x.tie); return { n: i + 1, text: nm(x.a) + ' and ' + nm(x.b) + ' ' + w[0].replace(/^Both /, 'both ') }; })
    };
  }
  function relatedHero(c, out, st, lib) {
    var CLC = window.CLC, iconId = iconOf[st.hid] || st.hid, ic = lib.icon[iconId]; if (!ic) return;
    var received = (out.hv.stories || []).length, groups = [];
    var shown = {}; (c.state.saved || []).forEach(function (id) { shown[id] = 1; });
    var theirs = ic.stories.map(function (id) { return CLC.storyCard(lib, lib.story[id]); });
    if (theirs.length) groups.push({ label: (received ? 'All ' : '') + theirs.length + (theirs.length === 1 ? ' story' : ' stories') + ' from ' + CLG_short(ic.name), items: theirs.map(function (cd) { return row(c, cd, cd.first); }) });
    // kindred: a shared situation and one more reason, said in words, as the Library says it (lib/net.js)
    var kin = window.CLN ? window.CLN.kindred(lib, iconId, 3) : [];
    if (kin.length) groups.push({ label: 'Kindred lives', items: kin.map(function (x) { var k = lib.icon[x.id]; return { title: k.name, why: x.why.slice(0, 2).join(' '), open: function () { openHeroHere(c, appId(k.id)); } }; }) });
    out.hv.lib = groups; out.hv.hasLib = groups.length > 0;
    if (theirs.length) out.hv.moreInLib = false;
  }
  function CLG_short(name) { var w = String(name).split(' '); return w.length > 2 && !/^(de|van|von)$/i.test(w[w.length - 2]) ? w[0] + ' ' + w[w.length - 1] : name; }

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
      mm[m.member] = (st.msgs[m.member] || []).concat([{ id: 'c' + Date.now(), from: 'coach', kind: 'text', body: "I'd like to suggest " + nm + ' for your heroes. Have a look in the library and tell me yes or no.', day: day, at: at, live: true }]);
      c.setState({ msgs: mm, ctoast: 'Suggested ' + nm + ' to ' + d.members[m.member].first + '.' });
      setTimeout(function () { c.setState({ ctoast: null }); }, 2800);
    }
  });
  B.state = function () { return B.c ? B.c.state : null; };
})();
