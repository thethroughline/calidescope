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
    var ask = as === 'coach' && st ? asksOf(st).map(function (g) { return encodeURIComponent(st.p + ':' + g.sid); }).join(',') : '';
    return BASE + 'library?embed=1&as=' + as + (mid ? '&m=' + encodeURIComponent(mid) : '') + core + th + (ask ? '&asked=' + ask : '') + (route || '#/');
  }
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
    // Back walks the pages read in the frame one at a time, then returns to where the Library was opened
    // from; the header says which, so Back is never a guess
    var depth = st.libDepth || 1, home = libHome(st, lib), canBack = depth > 1 || hasBack(st.libBack);
    out.lx = {
      src: libSrc(st.libRoute || '#/', 'member', P),
      back: function () {
        var f = depth > 1 && document.querySelector('[data-bridge="library-overlay"] iframe');
        if (f && f.contentWindow) f.contentWindow.postMessage({ type: 'cl:back' }, location.origin);
        else S({ overlay: st.libBack || null, libDepth: 0 });
      },
      backIcon: canBack ? 'ph ph-caret-left' : 'ph ph-x',
      backText: depth > 1 ? st.libPrev || 'Back' : canBack ? home.word : '',
      backLabel: depth > 1 ? 'Back to ' + (st.libPrevTo || st.libPrev || 'the page before') : canBack ? 'Back to ' + home.to : 'Close the library',
      title: st.libTitle || 'Library',
      // Browse opens the library's front page in the frame, where search and the ways in are
      canBrowse: (st.libRoute || '#/').replace(/\?.*$/, '') !== '#/', browse: function () { S({ libRoute: '#/' }); }
    };
    var openLib = function (route, back) { return function () { S({ overlay: 'library', libRoute: route, libBack: back || null, libDepth: 1, libPrev: '', libPrevTo: '' }); }; };
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
        var v = L.verified, w = L.n - v, nm = d.hero[hid].name;
        h.libLine = !L.n ? 'No story in the library yet. When none fits your week, you\u2019ll get one from someone close to ' + nm + '.'
          : !v ? (w === 1 ? '1 story in the library, waiting for ' : w + ' stories in the library, waiting for ') + cf + '\u2019s check.'
          : v + (v === 1 ? ' story' : ' stories') + ' in the library' + (w ? ', and ' + w + ' more waiting for ' + cf + '\u2019s check.' : '.');
        if (L.n && h.helps && /^Nothing paired yet/.test(h.helps.text)) h.helps = { text: 'Not paired with one of your moves yet.', c: h.helps.c };
        if (L.n && h.count === 'No stories yet') h.count = 'None sent to you yet';
      });
    }
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
      if (wait.length) rows.unshift({ icon: 'ph ph-hourglass-medium', title: 'Waiting for ' + cf0 + '\u2019s check', line: wait.map(function (g) { return d.story[g.sid].hero ? d.hero[d.story[g.sid].hero].name + ', ' + d.story[g.sid].place : g.sid; }).join('; ') + '. You asked on ' + d.lab(wait[0].day) + '.',
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
      // prep: no dead button until it opens, only the day it opens
      var WD = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], ev = WD.indexOf(String(out.wk.coming || '').split(' ')[0]);
      out.wk.prepOpen = !out.wk.prepDis;
      if (out.wk.prepDis) out.wk.prepHint = ev >= 0 ? 'Prep opens ' + WD[(ev + 6) % 7] + '.' : 'Prep opens the day before.';
      // the story card names the hero once: "From Obama, one of your three", then the place
      if (out.wk.hasStory && out.wk.ins && /^From one of your three/.test(out.wk.ins.eyebrow) && out.wk.story) {
        out.wk.ins = Object.assign({}, out.wk.ins, { eyebrow: 'From ' + out.wk.story.short + ', one of your three' });
        out.wk.story = Object.assign({}, out.wk.story, { eyebrow: out.wk.story.place });
      }
    }
    stackBack(c, out, st);

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
    var askedLine = function (M, n) { return (M ? M.first : 'A member') + ' asked for ' + (n === 1 ? '1 check' : n + ' checks') + '. They are first on Source checks.'; };
    if (pendingAsks.length) (out.ro || []).forEach(function (r) { if (r.mid === P) r.last = 'Asked for ' + (pendingAsks.length === 1 ? '1 check' : pendingAsks.length + ' checks'); });
    // Review stays honest: a row that shows a recall draft cannot be approved, and a row with nothing to send
    // (or a draft) offers the one check that fills it, done in the row (lib/net.js fillSlot)
    if (out.rq && out.rq.rows && window.CLN) {
      var flagged = [], short = function (id) { var I = lib.icon[id]; return I ? (I.short || I.name) : id; };
      out.rq.rows.forEach(function (r) {
        r.asked = r.mid === P && pendingAsks.length ? askedLine(lib.members[P], pendingAsks.length) : '';
        var sitId = String(r.key || '').split(' · ')[0], sit = lib.sit[sitId], M = lib.members[r.mid]; if (!sit || !M) return;
        var shownDraft = r.has && r.s && !r.s.verified, ap = r.btns && r.btns[0];
        if (shownDraft && ap && !ap.dis) {
          ap.dis = true; ap.op = 0.4; ap.title = 'The story shown is a recall draft. Check its source first.'; ap.go = function () {};
          r.pairNote = 'Paired with the move. Recall draft: check the source before it can go.'; flagged.push(r.mid);
        }
        if (!(r.none || shownDraft)) return;
        var hs = r.mid === P ? (st.core || []).map(function (h) { return iconOf[h] || h; }) : null;
        var f = window.CLN.fillSlot(lib, r.mid, sit.key, { three: hs, prefer: shownDraft ? window.CLC.resolve(lib, r.s.id) : null }); if (!f.pick) return;
        var x = f.pick, I = lib.icon[x.story.icon], first = M.first, poss = first + '’s';
        var why = x.links === 0 ? 'From one of ' + poss + ' three.' : x.links === 1 ? 'One link from ' + short(x.hero) + ': ' + window.CLN.why(lib, x.steps[0].a, x.steps[0].b, x.steps[0].tie)[0].replace(/^Both /, 'both ') : (x.links < 9 ? x.links + ' links from ' + poss + ' three.' : 'Not near ' + poss + ' three.');
        var open = st.fillOpen === r.mid;
        r.fill = { title: I.name + ' · ' + (x.story.place || x.story.year), why: why + ' Carries ' + sit.id + ' · ' + sit.chip + '. ' + (x.story.reach === 'near' ? 'Near' : 'Mid') + ' reach. Recall draft.',
          checkLabel: open ? 'Close the check' : 'Check the source here', open: open, src: libSrc('#/story/' + encodeURIComponent(x.story.id), 'coach', r.mid),
          check: function () { S({ fillOpen: open ? null : r.mid }); }, read: function () { S({ c: 'CX', cm: r.mid, cxRoute: '#/story/' + encodeURIComponent(x.story.id) }); },
          hasNext: f.next.length > 0, next: f.next.length ? 'Also near: ' + f.next.map(function (y) { return lib.icon[y.story.icon].name + (y.links === 0 ? ' (one of the three)' : y.links === 1 ? ' (one link)' : y.links < 9 ? ' (' + y.links + ' links)' : ''); }).join(', ') + '.' : '' };
      });
      var bulk0 = out.rq.bulk;
      if (flagged.length && bulk0) out.rq.bulk = function () {
        bulk0(); var rv = Object.assign({}, c.state.review);
        flagged.forEach(function (mid) { if (rv[mid] && rv[mid].action === 'approve') rv[mid] = Object.assign({}, rv[mid], { action: null }); });
        c.setState({ review: rv, ctoast: 'Approved every slot that can go. ' + flagged.length + (flagged.length === 1 ? ' shows' : ' show') + ' a recall draft and waits for a check.' });
        setTimeout(function () { c.setState({ ctoast: null }); }, 3200);
      };
    }
    // one name for a draft on the coach's side too
    var relabel = function (x) { if (x && x.verLabel === DRAFT) x.verLabel = 'Recall draft'; };
    (out.rq && out.rq.rows || []).forEach(function (r) { relabel(r.s); });
    if (out.lib) relabel(out.lib.p);
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
      send: tab(st.c === 'C4', function () { S({ c: 'C4', lib: sendEntry(st, st.lib.to) }); }),
      line: nStories + ' stories from ' + nLives + ' lives · ' + d.stories.filter(function (s) { return !s.verified && s.origin === 'corpus'; }).length + ' recall drafts waiting for a source check',
      // the coach's Explore walks back through its own pages; Find and send has none
      hasBack: st.c === 'CX' && (st.cxDepth || 1) > 1, backLabel: st.cxPrev || 'Back', backAria: 'Back to ' + (st.cxPrev || 'the page before'),
      backGo: function () { var f = document.querySelector('[data-bridge="coach-explore"] iframe'); if (f && f.contentWindow) f.contentWindow.postMessage({ type: 'cl:back' }, location.origin); }
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
      // for the member it would go to: the stories nearest their three first, each marked with its links
      var to = lib.members[L.to] ? L.to : P, toM = lib.members[to], toThree = to === P && st.core && st.core.length ? st.core.map(function (h) { return iconOf[h] || h; }) : toM ? toM.heroes_icons.core : [];
      var farN = 0;
      var fil = d.stories.filter(function (s) { return (L.key === 'all' || s.keys.indexOf(L.key) >= 0) && (L.hero === 'all' || s.hero === L.hero) && (L.reach === 'all' || s.reach === L.reach) && (L.ver === 'all' || (L.ver === 'verified') === s.verified); });
      if (toM && window.CLN && fil.length === (out.lib.results || []).length) {
        var hk = to + ':' + toThree.join(','), Hm = hopsCache[hk] || (hopsCache[hk] = window.CLN.hops(lib, to, { three: toThree }));
        var lk = function (s) { var ic = lib.story[s.id] ? lib.story[s.id].icon : null, h = ic && Hm[ic]; return h ? h.links : 9; };
        var mark = function (n) { return n === 0 ? 'one of ' + toM.first + '\u2019s three' : ''; };   // nearly every life is one link away, so only the three are marked
        var hideFar = L.hideFar && L.reach === 'all';
        out.lib.results = out.lib.results.map(function (r, i) { var n = lk(fil[i]); r.reach = r.reach + (mark(n) ? ' \u00b7 ' + mark(n) : ''); return { r: r, n: n, i: i, far: fil[i].reach === 'far' }; })
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
      out.lib.inLibrary = function () { S({ c: 'CX', cxRoute: sel ? '#/story/' + encodeURIComponent(sel) : '#/' }); };
      // how the chosen story reaches that member, and the week's pick beside it
      out.lib.forLine = ''; out.lib.cmp = null;
      if (sel && lib.story[sel] && toM && window.CLN) {
        var ss = lib.story[sel], upK = toM.up19 && lib.sit[toM.up19.sit] ? lib.sit[toM.up19.sit].key : null;
        var key = L.key !== 'all' ? L.key : upK && ss.keys.indexOf(upK) >= 0 ? upK : ss.keys[0], lt = window.CLN.linksTo(lib, to, ss.icon, key, { three: toThree });
        out.lib.forLine = 'For ' + toM.first + ': ' + (lt.links === 0 ? 'one of ' + toM.first + '\u2019s three.' : lt.links < 9 ? lt.line.charAt(0).toLowerCase() + lt.line.slice(1) : 'not near ' + toM.first + '\u2019s three.');
        var wr = (out.rq && out.rq.rows || []).filter(function (r) { return r.mid === to; })[0], pick = wr && wr.has && wr.s && wr.s.id;
        if (pick && pick !== sel) out.lib.cmp = { label: 'Compare with ' + toM.first + '\u2019s pick for the week', go: function () { S({ c: 'CX', cm: to, cxRoute: '#/cmp?a=' + encodeURIComponent(sel) + '&b=' + encodeURIComponent(pick) + '&m=' + encodeURIComponent(to) }); } };
      }
      // stories related to the one chosen, each with what sets it apart: one tap makes another the choice
      var rel = sel && lib.story[sel] ? window.CLC.likeThis(lib, sel, 4, { role: 'coach' }) : [];
      out.lib.hasRel = rel.length > 0;
      // situations by their name, the way the rest of the app writes them
      (out.lib.pKeys || []).forEach(function (k) { var si = d.sitByKey[k.k]; if (si && si.id) k.k = si.id + ' · ' + si.chip; });
      out.lib.rel = rel.map(function (x) {
        var c2 = x.story; return { title: c2.name + ' · ' + (c2.place || ''), why: (x.reasons[0] || {}).text || '', go: function () { S({ lib: Object.assign({}, st.lib, { sel: c2.id, msg: '' }) }); } };
      });
    }
    if (out.rq && out.rq.rows) out.rq.rows.forEach(function (r) { r.trace = collapseTrace(r.trace || []); });
    // Swap: the drafts that carry this week's situation, nearest the member's three first, each one check
    // away from the list above it; the hero chips are the member's own three
    if (out.sp && out.sp.open && out.sp.excluded) {
      var srow = (out.rq && out.rq.rows || []).filter(function (r) { return r.mid === st.swapFor; })[0];
      var ssit = srow && lib.sit[String(srow.key || '').split(' · ')[0]], smem = lib.members[st.swapFor];
      var rest = out.sp.excluded.filter(function (e) { return !e.draft; }), nDraft = out.sp.excluded.length - rest.length;
      if (ssit && smem && window.CLN) {
        var three = st.swapFor === P && st.core && st.core.length ? st.core.map(function (h) { return iconOf[h] || h; }) : smem.heroes_icons.core;
        var F = window.CLN.fillSlot(lib, st.swapFor, ssit.key, { three: three }), picks = F.pick ? [F.pick].concat(F.next) : [];
        var sfirst = smem.first, nm = function (id) { var I = lib.icon[id]; return I ? I.name : id; };
        var dr = picks.map(function (x) {
          var I = lib.icon[x.story.icon], key = 'swap:' + x.story.id, open = st.fillOpen === key;
          var near = x.links === 0 ? 'One of ' + sfirst + '\u2019s three.' : x.links === 1 ? 'One link from ' + nm(x.hero) + '.' : x.links < 9 ? x.links + ' links from ' + sfirst + '\u2019s three.' : 'Not near ' + sfirst + '\u2019s three.';
          return { eyebrow: I.name + ' \u00b7 ' + (x.story.place || x.story.year), why: 'Recall draft. ' + near, draft: true, goLabel: open ? 'Close the check' : 'Check the source',
            go: function () { S({ fillOpen: open ? null : key }); }, open: open, src: libSrc('#/story/' + encodeURIComponent(x.story.id), 'coach', st.swapFor) };
        });
        var more = nDraft - dr.length;
        if (more > 0) dr.push({ eyebrow: more + ' more recall drafts carry ' + ssit.id + '.', why: 'Every story of this week, in the library.', draft: true, goLabel: 'Open them in the library',
          go: function () { S({ c: 'CX', cm: st.swapFor, cxRoute: '#/situation/' + ssit.id + '?at=sitplot', swapFor: null }); } });
        out.sp.excluded = rest.concat(dr); out.sp.hasExcluded = out.sp.excluded.length > 0;
        var shorts = three.map(function (i) { var h = d.hero[appOf[i] || i]; return h ? h.short : ''; });
        if (out.sp.filters) out.sp.filters = out.sp.filters.filter(function (f) { return f.label === 'All heroes' || shorts.indexOf(f.label) >= 0; });
      }
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
    var groups = [];
    if (st.role === 'coach') {
      // a coach reading in the app: others who lived this week, each with what sets it apart
      var L = CLC.likeThis(lib, s.id, 3, { role: 'coach' });
      if (L.length) groups.push({ label: 'Others who lived this week', items: L.map(function (x) { return row(c, x.story, x.reasons[0].text); }) });
    } else {
      // one next story, when the member wants it: checked first, then the life nearest their three
      var core = (st.core || []).map(function (h) { return iconOf[h] || h; }), M = lib.members[st.p] || {};
      var mine = (M.sits || []).map(function (id) { return lib.sit[id] && lib.sit[id].key; });
      var opened = (st.opened || []).map(function (x) { return CLC.resolve(lib, x); });
      var cand = CLC.similarStories(lib, s.id, 40, { sameKey: true }).map(function (x) { return lib.story[x.story.id]; })
        .filter(function (o) { return o && opened.indexOf(o.id) < 0 && o.id !== s.id && o.keys.some(function (k) { return mine.indexOf(k) >= 0 || s.keys.indexOf(k) >= 0; }); });
      var links = function (o) { if (core.indexOf(o.icon) >= 0) return 0; var b = window.CLN ? window.CLN.bridge(lib, st.p, o.icon, s.keys[0], { three: core }) : null; return b && b.steps ? b.steps.length : 9; };
      var ranked = cand.map(function (o, i) { return { o: o, i: i, l: links(o) }; }).sort(function (a, b) { return (b.o.verified ? 1 : 0) - (a.o.verified ? 1 : 0) || a.l - b.l || a.i - b.i; });
      var next = ranked[0];
      if (next) {
        var oldest = Math.min.apply(null, (lib.byKey[s.keys[0]] || []).map(function (id) { var y = lib.story[id].year; return y == null ? 1e9 : y; }));
        var I = lib.icon[next.o.icon] || {}, why = core.indexOf(next.o.icon) >= 0 ? 'From ' + (I.short || I.name) + ', one of your three' : CLC.reasonFor(lib, s, next.o, { role: 'member', three: core }, {}, oldest).text;
        if (M.age && I.born != null && next.o.year != null && Math.abs((next.o.year - I.born) - M.age) <= 4) why += '. ' + (next.o.year - I.born) + ' that week; you are ' + M.age;
        var co = (lib.coaches[M.coach] || {}).first || 'your coach';
        groups.push({ label: 'Next, when you want it', items: [row(c, CLC.storyCard(lib, next.o), why + (next.o.verified ? '' : ' \u00b7 Recall draft'))] });
      }
      groups.push({ label: '', items: [{ title: 'Others who lived this week', why: 'In the library, each with what sets it apart', open: function () { S_(c, { overlay: 'library', libRoute: '#/story/' + encodeURIComponent(s.id) + '?at=others', libBack: 'story', libDepth: 1, libPrev: '', libPrevTo: '' }); } }] });
    }
    out.sv.rel = groups; out.sv.hasRel = groups.length > 0;
    reachOf(c, out, st, lib, s);
    out.sv.isDraft = !s.verified;
    if (st.role !== 'coach' && !s.verified) {
      var coF = ((lib.coaches[(lib.members[st.p] || {}).coach] || {}).first) || 'your coach', was = asksOf(st).some(function (g) { return g.sid === st.sid; });
      out.sv.checkAsk = { label: was ? 'Waiting for ' + coF + '\u2019s check' : 'Ask ' + coF + ' to check it', dis: was, go: function () { askCheck(c, st.sid); } };
    } else out.sv.checkAsk = null;
    var co = ((lib.members[st.p] || {}).coach && lib.coaches[lib.members[st.p].coach]) || {};
    out.sv.draftNote = st.role === 'coach' ? 'Recall draft. Check it against its source before you send it.' : window.CLC.draftLine(co.first);
    // a coach's working note never reaches a member; the citation shows once the story is checked
    if (st.role !== 'coach') {
      var src = window.CLC.sourceFor(s, 'member'), cau = window.CLC.cautionFor(s, 'member'), M0 = lib.members[st.p] || {};
      var mine0 = (M0.sits || []).some(function (id) { return lib.sit[id] && s.keys.indexOf(lib.sit[id].key) >= 0; });
      out.sv.source = src ? 'Source: ' + src : ''; out.sv.caution = cau; out.sv.hasCaution = !!cau;
      if (out.sv.why) out.sv.why = window.CLC.whyFor({ why: out.sv.why }, 'member', mine0);
    }
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
    // each person at the year of their own story in the situation they share with the next
    var yearIn = function (id, i) {
      var step = best.r[i] || best.r[i - 1], ks = step && step.tie ? step.tie.shared : [];
      var y = (lib.byIcon[id] || []).map(function (x) { return lib.story[x]; }).filter(function (x) { return x && x.keys.some(function (k) { return ks.indexOf(k) >= 0; }); }).map(function (x) { return x.year; })[0];
      return window.CLC.yearLabel(y != null ? y : lib.icon[id].year);
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
    out.ak.weekNote = ''; out.ak.reach = ''; out.ak.checkAsk = null; out.ak.draftMark = '';
    if (A.weekHad && d.story[A.weekHad]) { var w = d.story[A.weekHad]; out.ak.weekNote = 'You already have ' + d.hero[w.hero].name + '’s story from ' + w.place + ' for this. Here is another.'; }
    if (s && !s.verified) {
      var was = asksOf(st).some(function (g) { return g.sid === A.story; });
      out.ak.draftMark = window.CLC.draftLine(co);
      out.ak.checkAsk = { label: was ? 'Waiting for ' + co + '\u2019s check' : 'Ask ' + co + ' to check it', dis: was, go: function () { askCheck(c, A.story); } };
    }
    if (s && window.CLN) {
      var three = (st.core || []).map(function (h) { return iconOf[h] || h; }), key = A.key || s.keys[0], lt = window.CLN.linksTo(lib, st.p, s.icon, key, { three: three });
      var nm = function (id) { var I = lib.icon[id]; return I ? I.short || I.name : id; };
      out.ak.reach = lt.links === 0 ? 'From ' + nm(lt.hero) + ', one of your three.' : lt.links === 1 ? 'One step from ' + nm(lt.hero) + ': ' + (window.CLN.why(lib, lt.steps[0].a, lt.steps[0].b, lt.steps[0].tie)[0] || '').replace(/^Both /, 'both ') : lt.links < 9 ? lt.line : '';
    }
    var none = (out.ak.walk || []).filter(function (w) { return w.none && !/using/.test(w.text); }), keep = (out.ak.walk || []).filter(function (w) { return !(w.none && !/using/.test(w.text)); });
    if (none.length) {
      var names = none.map(function (w) { return w.text.split(' isn')[0]; }).map(function (sh) { var h = d.heroes.filter(function (x) { return x.short === sh; })[0]; return h ? h.name : sh; });
      keep.push({ has: false, none: true, text: (names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] + ' have' : names[0] + ' has') + ' no story for this yet.' });
    }
    out.ak.walk = keep;
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
  // the name a Back button carries: the surname, without Jr. or III ("Kagan", "King"); one name stays whole
  function surname(name) { var w = String(name).replace(/,? (Jr\.?|Sr\.?|II|III|IV)$/, '').split(' '); return w[w.length - 1]; }
  function CLG_short(name) { var w = String(name).split(' '); return w.length > 2 && !/^(de|van|von)$/i.test(w[w.length - 2]) ? w[0] + ' ' + w[w.length - 1] : name; }

  // ---------- 4 · messages from the Library frame ----------
  var SAVED_TOAST = 'Saved. It\u2019s on You.';
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || !e.data || typeof e.data.type !== 'string' || e.data.type.indexOf('cl:') !== 0) return;
    var c = B.c, m = e.data; if (!c || !_cpd) return;
    var st = c.state, d = _cpd, sid = m.story && B.lib ? window.CLC.resolve(B.lib, m.story) : m.story;
    if (m.type === 'cl:verified' && sid) { markVerified(sid, m.entry); c.setState({ _ledger: Date.now() }); }
    if (m.type === 'cl:unverified' && sid) { markUnverified(sid); c.setState({ _ledger: Date.now() }); }
    if (m.type === 'cl:send' && sid && d.story[sid]) c.setState({ c: 'C4', lib: Object.assign({}, sendEntry(st, m.member && d.members[m.member] ? m.member : st.lib.to, sid), { sel: sid, hero: 'all', reach: 'all', ver: 'all', to: m.member && d.members[m.member] ? m.member : st.lib.to, msg: '' }) });
    // one saved list, the app's: the frame says on or off and is told the list back
    var tell = function (list) { if (e.source) e.source.postMessage({ type: 'cl:state', saved: list, asked: asksOf(c.state).map(function (g) { return g.sid; }) }, location.origin); };
    if (m.type === 'cl:hello') tell(st.saved || []);
    if (m.type === 'cl:save' && sid && d.story[sid]) {
      var has = st.saved.indexOf(sid) >= 0, on = typeof m.on === 'boolean' ? m.on : !has;
      var next = on ? (has ? st.saved : st.saved.concat([sid])) : st.saved.filter(function (x) { return x !== sid; });
      c.setState({ saved: next, toast: on ? SAVED_TOAST : null }); tell(next);
      if (on) setTimeout(function () { if (c.state.toast === SAVED_TOAST) c.setState({ toast: null }); }, 2800);
    }
    if (m.type === 'cl:ask' && sid && d.story[sid]) c.setState({ overlay: 'thread', attach: sid });
    if (m.type === 'cl:check' && sid && d.story[sid]) { askCheck(c, sid); tell(c.state.saved || []); }
    if (m.type === 'cl:route' && typeof m.route === 'string' && m.route.charAt(0) === '#') {
      var hop = { depth: Math.max(1, m.depth | 0), prev: String(m.prev || '').slice(0, 24), to: String(m.prevTo || '').slice(0, 80), title: String(m.title || '').slice(0, 120) };
      c.setState(m.as === 'coach' ? { cxRoute: m.route, cxDepth: hop.depth, cxPrev: hop.prev } : { libRoute: m.route, libDepth: hop.depth, libPrev: hop.prev, libPrevTo: hop.to, libTitle: hop.title });
    }
    // the trail read in the frame comes home: You can pick it up where it stopped
    if (m.type === 'cl:trail' && Array.isArray(m.nodes) && m.nodes.length) {
      var nodes = m.nodes.filter(function (n) { return n && typeof n.href === 'string' && n.href.charAt(0) === '#' && typeof n.label === 'string'; }).slice(-8)
        .map(function (n) { return { label: n.label.slice(0, 60), href: n.href, kind: String(n.kind || '') }; });
      var total = Math.max(nodes.length, Math.min(999, m.total | 0));
      if (nodes.length && (total !== (st.trail && st.trail.total) || JSON.stringify(nodes) !== JSON.stringify(st.trail && st.trail.nodes))) c.setState({ trail: { nodes: nodes, total: total, day: (d.clock[st.clock] || d.clock[0]).day } });
    }
    if (m.type === 'cl:close' && st.overlay === 'library') c.setState({ overlay: st.libBack || null, libDepth: 0 });
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
