/* The Constellation library: every story and every life in the corpus, to read and to wander.

   Reads the same files the app does (data/corpus.json, data/demo.json) through lib/core.js, so a
   page here and a card in the app can never disagree. Pages are hash routes, so any page is a link:
     #/                   home: the constellation map and the ways in
     #/icon/<id>          a life: stories, defining moments, works, and the trails out
     #/story/<id>         a story, its source and status, and the same situation across time
     #/situation/<code>   one of the 22 situations, its stories and people (and, for coaches, its moves)
     #/era/<id> #/field/<id> #/stance/<id> #/people #/situations #/eras #/search?q=
     #/member/<id>        a member's reading, and the season the matcher would serve them
     #/members #/checks   coach only: the roster, and the stories waiting for a source check
     #/saved              saved stories and saved trails
   Query string: as=reader|member|coach, m=<member id>, core=<icon ids>, embed=1, theme=dark.

   Every page opened joins the trail along the top; a trail can be saved. Saves and trails live in
   this browser and, when the back end has a store, on the server too. A coach's source check goes
   to the shared ledger, and inside the app it reaches the engine at once. */
(function () {
  'use strict';
  var CLC = window.CLC, Q = new URLSearchParams(location.search), EMBED = Q.get('embed') === '1';
  var LS = store(window.localStorage), SS = store(window.sessionStorage);
  var MODES = ['reader', 'member', 'coach'];
  var AS = MODES.indexOf(Q.get('as')) >= 0 ? Q.get('as') : (EMBED ? 'reader' : LS.get('cl-as', 'reader'));
  if (AS === 'member' && !Q.get('m')) AS = 'reader';
  var MID = Q.get('m') || null;
  var lib = null, M = null, me = null, ledger = {}, storeKind = 'none';
  // the trail in progress belongs to this tab and to who is reading: a coach's wandering and a member's stay apart
  var TRAIL_KEY = 'cl-trail-now:' + AS + (MID ? ':' + MID : '');
  var saved = LS.get('cl-saved', []), trails = LS.get('cl-trails', []), trail = SS.get(TRAIL_KEY, []);
  var NS = ns(), main = document.getElementById('main'), first = true;

  function store(s) {
    return { get: function (k, d) { try { var v = s.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
      set: function (k, v) { try { s.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  }
  function ns() {
    try { var v = localStorage.getItem('cl-ns'); if (!v) { v = 'b' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); localStorage.setItem('cl-ns', v); } return v; }
    catch (e) { return 'anonymous-browser'; }
  }
  function getJSON(u) { return fetch(u, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error(u + ' answered ' + r.status); return r.json(); }); }
  function send(method, u, body) { return fetch(u, { method: method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
  function post(type, data) { if (EMBED && window.parent !== window) window.parent.postMessage(Object.assign({ type: type }, data || {}), location.origin); }
  function say(t) { var l = document.getElementById('live'); l.textContent = ''; setTimeout(function () { l.textContent = t; }, 30); }

  // ---------- text ----------
  // a trail stop only ever links within the Library (saved trails come back from the server)
  function safe(h) { return /^#\/[\w\-/%?=&.]*$/.test(String(h || '')) ? h : '#/'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cap(s) { s = String(s || ''); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function n(k, one, many) { return k + ' ' + (k === 1 ? one : (many || one + 's')); }
  function yl(y) { return CLC.yearLabel(y); }
  function enc(s) { return encodeURIComponent(s); }
  function when(iso) { try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return iso; } }
  var H = { icon: function (id) { return '#/icon/' + enc(id); }, story: function (id) { return '#/story/' + enc(id); }, sit: function (id) { return '#/situation/' + enc(id); },
    era: function (id) { return '#/era/' + enc(id); }, field: function (id) { return '#/field/' + enc(id); }, stance: function (id) { return '#/stance/' + enc(id); }, member: function (id) { return '#/member/' + enc(id); } };

  // ---------- boot ----------
  Promise.all([
    getJSON('/constellation/data/corpus.json'), getJSON('/constellation/data/demo.json'),
    getJSON('/api/constellation/state?ns=' + enc(NS)).catch(function () { return null; })
  ]).then(function (r) {
    lib = CLC.merge(r[0], r[1]); M = CLC.matcher(r[0]);
    var server = r[2] || {};
    storeKind = server.store || 'none';
    ledger = Object.assign({}, server.ledger || {}, LS.get('cl-ledger', {}));
    var u = server.user || {};
    if (!saved.length && Array.isArray(u.saved)) saved = u.saved;
    if (!trails.length && Array.isArray(u.trails)) trails = u.trails;
    CLC.applyVerification(lib, ledger);
    if (MID && lib.members[MID]) {
      var m = lib.members[MID], core = (Q.get('core') || '').split(',').filter(function (x) { return lib.icon[x]; });
      me = { id: MID, first: m.first, name: m.name, coach: lib.coaches[m.coach] || null, core: core.length ? core : (m.heroes_icons.core || []).slice(),
        reserve: m.heroes_icons.reserve, sits: m.sits || [] };
    }
    layout(); chrome(); route();
    window.addEventListener('hashchange', route);
  }).catch(function (e) {
    main.innerHTML = '<h1>The library</h1><p class="lede">It could not load: ' + esc(e.message) + '.</p>';
  });

  // ---------- chrome: links, modes, theme, search ----------
  function chrome() {
    var modes = document.getElementById('modes');
    if (EMBED) modes.remove();
    else modes.innerHTML = [['reader', 'Reader'], ['coach', 'Coach']].map(function (m) { return '<button type="button" data-mode="' + m[0] + '" aria-pressed="' + (AS === m[0]) + '">' + m[1] + '</button>'; }).join('');
    modes.addEventListener && modes.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return; AS = b.dataset.mode; LS.set('cl-as', AS);
      TRAIL_KEY = 'cl-trail-now:' + AS + (MID ? ':' + MID : ''); trail = SS.get(TRAIL_KEY, []);
      modes.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.mode === AS); });
      route(true);
    });
    var th = document.getElementById('theme');
    var paint = function () { th.innerHTML = '<i class="ph ph-' + (document.documentElement.getAttribute('data-theme') === 'dark' ? 'sun' : 'moon') + '"></i>'; };
    paint();
    th.addEventListener('click', function () { var t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem('cl-theme', t); } catch (e) {} paint(); });
    document.getElementById('searchform').addEventListener('submit', function (e) { e.preventDefault(); var q = document.getElementById('q').value.trim(); if (q) location.hash = '#/search?q=' + enc(q); });
    var qt; document.getElementById('q').addEventListener('input', function (e) {
      clearTimeout(qt); var q = e.target.value.trim();
      qt = setTimeout(function () {
        if (q.length < 2) return;
        var h = '#/search?q=' + enc(q);
        if (cur === 'search') { history.replaceState(null, '', h); route({ typing: true }); } else location.hash = h;
      }, 260);
    });
    main.addEventListener('click', onClick);
    document.getElementById('trail').addEventListener('click', onClick);
  }
  function links(cur) {
    var L = [];
    if (me && AS === 'member') L.push(['member', H.member(me.id), 'For you']);
    L.push(['situations', '#/situations', 'Situations'], ['people', '#/people', 'People'], ['eras', '#/eras', 'Eras']);
    if (AS === 'coach') L.push(['members', '#/members', 'Members'], ['checks', '#/checks', 'Source checks']);
    L.push(['saved', '#/saved', 'Saved' + (saved.length ? ' · ' + saved.length : '')]);
    document.getElementById('links').innerHTML = L.map(function (l) { return '<a href="' + l[1] + '"' + (cur === l[0] ? ' aria-current="page"' : '') + '>' + esc(l[2]) + '</a>'; }).join('');
  }

  // ---------- routing ----------
  var R = { '': home, icon: iconPage, story: storyPage, situation: sitPage, situations: sitsPage, people: peoplePage, era: eraPage, eras: erasPage,
    field: fieldPage, stance: stancePage, search: searchPage, member: memberPage, members: membersPage, checks: checksPage, saved: savedPage };
  var cur = '';
  function route(o) {
    if (!lib) return;
    o = o && o.type ? {} : (o === true ? { keepScroll: true } : (o || {}));
    var h = location.hash.replace(/^#\/?/, ''), qi = h.indexOf('?'), qs = new URLSearchParams(qi >= 0 ? h.slice(qi + 1) : '');
    var parts = (qi >= 0 ? h.slice(0, qi) : h).split('/').map(function (p) { try { return decodeURIComponent(p); } catch (e) { return p; } });
    var fn = R[parts[0]] || missing, v;
    try { v = fn(parts[1], qs) || missing(); } catch (e) { console.error(e); v = { title: 'Something went wrong', html: '<h1>Something went wrong</h1><p class="lede">' + esc(e.message) + '</p>' }; }
    document.title = (v.title ? v.title + ' · ' : '') + 'Constellation Library';
    main.innerHTML = v.html;
    if (v.after) v.after();
    if (v.node) step(v.node);
    cur = parts[0] || ''; trailBar(); links(cur);
    var qbox = document.getElementById('q'); if (cur !== 'search' && document.activeElement !== qbox) qbox.value = '';
    if (!o.keepScroll && !o.typing) { window.scrollTo(0, 0); if (!first) main.focus({ preventScroll: true }); }
    first = false;
    post('cl:route', { route: location.hash || '#/', as: AS });
  }
  function missing() { return { title: 'Not here', html: '<h1>Not in the library</h1><p class="lede">That page is not here. <a href="#/">Back to the library</a>.</p>' }; }

  // ---------- the trail ----------
  function step(node) {
    var last = trail[trail.length - 1];
    if (last && last.k === node.k) { last.label = node.label; }
    else { trail.push(node); if (trail.length > 30) trail = trail.slice(-30); }
    SS.set(TRAIL_KEY, trail);
  }
  var KIND = { icon: 'ph-user', story: 'ph-book-open-text', sit: 'ph-compass', era: 'ph-calendar-blank', field: 'ph-squares-four', stance: 'ph-footprints', member: 'ph-user-circle', home: 'ph-sparkle' };
  function trailBar() {
    var el = document.getElementById('trail'), stops = trail.filter(function (t) { return t.k !== 'home:'; });
    var list = stops.length
      ? '<ol>' + stops.map(function (t) { return '<li><a href="' + esc(safe(t.href)) + '" title="' + esc(t.label) + '"><span>' + esc(t.label) + '</span></a></li>'; }).join('') + '</ol>'
      : '<p class="trail-empty">Every page you open joins your trail.</p>';
    el.innerHTML = '<div class="trail-in"><span class="trail-label">Your trail</span>' + list +
      '<div class="trail-act">' + (stops.length > 1 ? '<button class="btn sm" type="button" data-act="save-trail"><i class="ph ph-bookmark-simple"></i>Save</button>' : '') +
      (stops.length ? '<button class="btn sm" type="button" data-act="clear-trail">Start again</button>' : '') + '</div></div>';
    var ol = el.querySelector('ol'); if (ol) ol.scrollLeft = ol.scrollWidth;
  }

  // ---------- actions ----------
  function onClick(e) {
    var a = e.target.closest('[data-act]'); if (!a) return;
    var act = a.dataset.act, id = a.dataset.id;
    if (act === 'save') { toggleSave(id); route(true); }
    if (act === 'ask') { post('cl:ask', { story: id }); say('Opening a message to your coach.'); }
    if (act === 'send') { post('cl:send', { story: id, member: a.dataset.member || MID }); }
    if (act === 'save-trail') {
      var stops = trail.filter(function (t) { return t.k !== 'home:'; });
      trails.unshift({ name: stops[0].label + ' to ' + stops[stops.length - 1].label, at: new Date().toISOString(), nodes: stops });
      trails = trails.slice(0, 50); LS.set('cl-trails', trails); syncUser(); say('Trail saved.'); links(cur); a.outerHTML = '<span class="flash">Saved</span>';
    }
    if (act === 'clear-trail') { trail = []; SS.set(TRAIL_KEY, trail); trailBar(); }
    if (act === 'open-trail') { var t = trails[+id]; if (t) { trail = t.nodes.slice(); SS.set(TRAIL_KEY, trail); location.hash = safe(t.nodes[t.nodes.length - 1].href); } }
    if (act === 'drop-trail') { trails.splice(+id, 1); LS.set('cl-trails', trails); syncUser(); route(true); }
    if (act === 'light') { var k = a.dataset.key; lit = lit === k ? null : k; paintMap(); }
    if (act === 'verify') {
      var f = a.closest('form'), by = f.querySelector('[name=by]').value, note = f.querySelector('[name=note]').value.trim();
      e.preventDefault(); verify(id, by, note);
    }
    if (act === 'unverify') { e.preventDefault(); unverify(id); }
  }
  function toggleSave(id) {
    var i = saved.indexOf(id);
    if (i >= 0) saved.splice(i, 1); else saved.unshift(id);
    LS.set('cl-saved', saved); syncUser(); post('cl:save', { story: id });
    say(i >= 0 ? 'Removed from saved.' : 'Saved.');
  }
  var syncT; function syncUser() { clearTimeout(syncT); syncT = setTimeout(function () { send('PUT', '/api/constellation/state/user?ns=' + enc(NS), { saved: saved, trails: trails }); }, 600); }
  function verify(id, by, note) {
    var s = lib.story[id]; if (!s) return;
    var entry = { by: by, at: new Date().toISOString(), note: note };
    ledger[id] = entry; var l = LS.get('cl-ledger', {}); l[id] = entry; LS.set('cl-ledger', l);
    s.verified = true; s.status = 'verified'; s.checked = entry;
    send('POST', '/api/constellation/state/ledger', { story: id, by: by, note: note });
    post('cl:verified', { story: id, entry: entry });
    say('Checked against the source. It can be sent now.'); route(true);
  }
  function unverify(id) {
    var s = lib.story[id]; if (!s) return;
    delete ledger[id]; var l = LS.get('cl-ledger', {}); delete l[id]; LS.set('cl-ledger', l);
    s.verified = false; s.status = s.origin === 'sample' ? 'sample-draft' : 'recall'; delete s.checked;
    send('DELETE', '/api/constellation/state/ledger?story=' + enc(id));
    post('cl:unverified', { story: id });
    say('Check taken back.'); route(true);
  }

  // ---------- pieces ----------
  function isMine(id) { return !!(me && AS !== 'coach' && me.core.indexOf(id) >= 0); }
  function badge(s) {
    var st = CLC.STATUS[s.status] || CLC.STATUS.recall, ok = st.tone === 'ok';
    return '<span class="badge ' + (ok ? 'ok' : 'draft') + '" title="' + esc(st.note) + '">' + (ok ? '<i class="ph-fill ph-seal-check"></i>' : '') + esc(st.label) + '</span>';
  }
  function storyCard(c, o) {
    o = o || {};
    return '<a class="card" href="' + H.story(c.id) + '"><div class="top-line"><span class="label">' + esc(c.place || yl(c.year)) + '</span>' + badge(c) + '</div>' +
      (o.noName ? '' : '<div class="who">' + esc(c.name) + '</div>') + '<div class="first">' + esc(c.first) + '</div>' +
      (c.pattern && !o.noQuote ? '<div class="pat">“' + esc(c.pattern) + '”</div>' : '') + '</a>';
  }
  function personCard(c) {
    var mine = isMine(c.id);
    return '<a class="card' + (mine ? ' mine' : '') + '" href="' + H.icon(c.id) + '"><div class="person"><span class="disc' + (c.n ? '' : ' thin') + (mine ? ' mine' : '') + '">' + esc(c.ini) + '</span>' +
      '<div style="min-width:0"><div class="nm">' + esc(c.name) + '</div><div class="ds">' + esc(c.desc) + '</div></div></div>' +
      '<div class="meta" style="margin-top:10px">' + (c.n ? n(c.n, 'story', 'stories') : 'No story yet') + (c.year != null ? ' · ' + yl(c.year) : '') + (mine ? ' · <span style="color:var(--mad)">one of your three</span>' : '') + '</div></a>';
  }
  function pchip(c) { return '<a class="pchip" href="' + H.icon(c.id) + '"><span class="d">' + esc(c.ini) + '</span>' + esc(c.name) + (c.year != null ? ' <span class="y">' + yl(c.year) + '</span>' : '') + '</a>'; }
  function sitChip(s) { return '<a class="sit" href="' + H.sit(s.id) + '"><b>' + esc(s.id) + '</b>' + esc(s.chip) + '</a>'; }
  function sec(title, body, aside) { return '<section><header><h2>' + title + '</h2>' + (aside || '') + '</header>' + body + '</section>'; }
  function draftsNote() {
    var c = lib.stories.filter(function (s) { return s.verified; }).length;
    return 'Most stories here are recall drafts: written from a named source and not yet read against it. Each one is marked. ' +
      'A coach checks a story against its source before it is sent to a member. ' + n(c, 'story is', 'stories are') + ' checked so far.';
  }
  function spread(people, around, k) {
    // a trail across time: the nearest few in years, and the furthest few, in year order
    if (people.length <= k) return people;
    var d = function (p) { return p.year == null || around == null ? 1e6 : Math.abs(p.year - around); };
    var by = people.slice().sort(function (a, b) { return d(a) - d(b); }), near = by.slice(0, Math.ceil(k / 2)), far = by.slice(-Math.floor(k / 2));
    var out = near.concat(far.filter(function (p) { return near.indexOf(p) < 0; }));
    return out.sort(function (a, b) { return (a.year == null ? 1e9 : a.year) - (b.year == null ? 1e9 : b.year); });
  }

  // ---------- the constellation map ----------
  var FIELDS = CLC.FIELDS, fieldIx = {}; FIELDS.forEach(function (f, i) { fieldIx[f.id] = i; });
  var MW = 1000, X0 = 172, X1 = 986, TOP = 10, BAND = 46, TICKS = [-500, 1500, 1800, 1900, 1925, 1950, 1975, 2000, 2025];
  var pos = null, lit = null, mapOpts = null;
  function mx(y) {
    var t = y == null ? 0 : y < 1700 ? 0.07 * Math.max(0, y + 600) / 2300 : y < 1900 ? 0.07 + 0.15 * (y - 1700) / 200 : 0.22 + 0.78 * Math.min(1, (y - 1900) / 126);
    return X0 + (X1 - X0) * t;
  }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
  function layout() {
    pos = {};
    lib.icons.forEach(function (i) { if (i.year == null) return; var f = fieldIx[i.field] || 0; pos[i.id] = { x: mx(i.year) + (hash(i.id + 'x') - 0.5) * 7, y: TOP + f * BAND + BAND * (0.16 + 0.68 * hash(i.id)) }; });
  }
  function mapHTML(o) {
    mapOpts = o || {}; lit = mapOpts.key || null;
    var chips = mapOpts.chips === false ? '' : '<div class="chips" role="group" aria-label="Light up one situation">' + lib.situations.map(function (s) {
      return '<button type="button" class="sit" data-act="light" data-key="' + esc(s.key) + '" aria-pressed="' + (lit === s.key) + '" title="' + esc(s.chip) + '"><b>' + esc(s.id) + '</b></button>';
    }).join('') + '</div>';
    return '<div class="map" id="map"><div class="map-scroll"></div><div class="tip" id="tip" hidden></div></div>' + chips + '<p class="mapcap meta" id="mapcap"></p>';
  }
  function paintMap() {
    var host = document.getElementById('map'); if (!host) return;
    var key = lit, on = {};
    (key ? lib.iconsByKey[key] || [] : []).forEach(function (id) { on[id] = 1; });
    var mine = {}; (me && AS !== 'coach' ? me.core : []).forEach(function (id) { mine[id] = 1; });
    var Hh = TOP + FIELDS.length * BAND + 30, s = '<svg viewBox="0 0 ' + MW + ' ' + Hh + '" role="img" aria-label="' +
      esc('A map of ' + lib.icons.length + ' lives by field and by the year of their defining moment' + (key ? ', with ' + lib.sitByKey[key].chip + ' lit' : '')) + '">';
    FIELDS.forEach(function (f, k) { var y = TOP + k * BAND; if (k % 2 === 0) s += '<rect class="band" x="0" y="' + y + '" width="' + MW + '" height="' + BAND + '"/>'; s += '<text class="bandlabel" x="14" y="' + (y + BAND / 2 + 4) + '">' + esc(f.label) + '</text>'; });
    TICKS.forEach(function (t) { var x = mx(t).toFixed(1); s += '<line class="tick" x1="' + x + '" x2="' + x + '" y1="' + TOP + '" y2="' + (Hh - 26) + '"/><text class="ticklabel" x="' + x + '" y="' + (Hh - 9) + '" text-anchor="middle">' + yl(t) + '</text>'; });
    if (key) {
      var pts = Object.keys(on).filter(function (id) { return pos[id]; }).map(function (id) { return lib.icon[id]; }).sort(function (a, b) { return a.year - b.year || (a.id < b.id ? -1 : 1); })
        .map(function (i) { return pos[i.id].x.toFixed(1) + ',' + pos[i.id].y.toFixed(1); });
      if (pts.length > 1) s += '<polyline class="path" points="' + pts.join(' ') + '"/>';
    }
    lib.icons.forEach(function (i) {
      var p = pos[i.id]; if (!p) return;
      var k = i.stories.length, r = k ? 1.9 + Math.sqrt(k) * 1.3 : 1.7;
      s += '<circle class="star' + (k ? '' : ' none') + (on[i.id] ? ' on' : '') + (mine[i.id] ? ' mine' : '') + '" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + r.toFixed(1) + '"/>';
      if (mine[i.id]) s += '<circle class="ring" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + (r + 3.5).toFixed(1) + '"/>';
      if (mapOpts.focus === i.id) s += '<circle class="hl" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + (r + 5).toFixed(1) + '"/>';
    });
    lib.icons.forEach(function (i) { var p = pos[i.id]; if (p) s += '<circle class="hit" data-id="' + esc(i.id) + '" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="7"/>'; });
    s += '</svg>';
    host.classList.toggle('lit', !!key);
    host.querySelector('.map-scroll').innerHTML = s;
    document.querySelectorAll('.chips [data-act="light"]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.key === key); });
    var cap = document.getElementById('mapcap');
    if (cap) {
      if (key) {
        var st = lib.sitByKey[key], ys = Object.keys(on).map(function (id) { return lib.icon[id].year; }).filter(function (y) { return y != null; }).sort(function (a, b) { return a - b; });
        cap.innerHTML = '<b style="color:var(--pru)">' + esc(st.id) + '</b> ' + esc(st.chip) + '. ' + n(Object.keys(on).length, 'life', 'lives') + ', ' + n(st.stories.length, 'story', 'stories') +
          (ys.length ? ', from ' + yl(ys[0]) + ' to ' + yl(ys[ys.length - 1]) : '') + '. <a href="' + H.sit(st.id) + '">Open the situation</a>';
      } else cap.textContent = 'Each star is a life, placed by field and by the year of its defining moment. Larger stars hold more stories; rings mark lives with none yet.' +
        (me && AS !== 'coach' ? ' Your three are in madder.' : '') + ' Pick a situation to see who has lived it.';
    }
    var sc = host.querySelector('.map-scroll');
    if (cap && sc.scrollWidth > sc.clientWidth + 4 && !cap.querySelector('.swipe')) cap.insertAdjacentHTML('afterbegin', '<span class="swipe">Swipe the map sideways to move through time. </span>');
    var tip = document.getElementById('tip'), svg = host.querySelector('svg');
    var show = function (e) {
      var c = e.target.closest('.hit'); if (!c) { tip.hidden = true; return; }
      var i = lib.icon[c.dataset.id], b = host.getBoundingClientRect(), cb = c.getBoundingClientRect();
      tip.innerHTML = '<b>' + esc(i.name) + '</b>' + esc([yl(i.year), i.domainLabel, i.stories.length ? n(i.stories.length, 'story', 'stories') : 'no story yet'].filter(Boolean).join(' · '));
      tip.style.left = (cb.left + cb.width / 2 - b.left) + 'px'; tip.style.top = (cb.top - b.top) + 'px'; tip.hidden = false;
    };
    svg.addEventListener('mousemove', show); svg.addEventListener('mouseleave', function () { tip.hidden = true; });
    var armed = null;
    svg.addEventListener('click', function (e) {
      var c = e.target.closest('.hit'); if (!c) return;
      // on a touch screen the first tap names the star and the second opens it
      if (matchMedia('(hover: none)').matches && armed !== c.dataset.id) { armed = c.dataset.id; show(e); return; }
      location.hash = H.icon(c.dataset.id);
    });
  }

  // ---------- pages ----------
  function home() {
    var withStory = lib.icons.filter(function (i) { return i.stories.length; }).length;
    var h = '<h1>The library</h1><p class="lede">' + lib.stories.length + ' stories from ' + withStory + ' lives, each filed by the situation it speaks to. Start anywhere. Every page leads to another.</p>' +
      '<p class="note" style="margin-top:14px">' + esc(draftsNote()) + '</p>';
    if (me && AS === 'member') {
      var three = me.core.map(function (id) { return CLC.iconCard(lib, lib.icon[id]); });
      h += sec('Start from your three', '<div class="grid people">' + three.map(personCard).join('') + '</div>' +
        '<div class="row" style="margin-top:16px"><span class="meta">Your situations</span>' + me.sits.map(function (c) { return lib.sit[c] ? sitChip(lib.sit[c]) : ''; }).join('') + '</div>',
        '<a class="btn sm" href="' + H.member(me.id) + '">Reading for you</a>');
    }
    if (AS === 'coach') {
      h += sec('Prep for a member', '<div class="grid">' + lib.order.map(function (id) { return memberCard(id); }).join('') + '</div>', '<a class="btn sm" href="#/checks">Source checks</a>');
    }
    h += sec('The constellation', mapHTML({}));
    h += sec('Start from a situation', fams());
    var fieldRows = FIELDS.map(function (f) {
      var ppl = lib.icons.filter(function (i) { return i.field === f.id; }), st = ppl.reduce(function (a, i) { return a + i.stories.length; }, 0);
      return '<li><a class="rowlink" href="' + H.field(f.id) + '"><span class="t">' + esc(f.label) + '</span><span class="n">' + n(ppl.length, 'life', 'lives') + ' · ' + n(st, 'story', 'stories') + '</span></a></li>';
    }).join('');
    var stanceRows = lib.stances.map(function (s) {
      var k = lib.icons.filter(function (i) { return i.stance === s.id; }).length;
      return '<li><a class="rowlink" href="' + H.stance(s.id) + '"><span><span class="t">' + esc(s.name) + '</span><span class="s" style="display:block">' + esc(s.gloss) + '</span></span><span class="n">' + n(k, 'life', 'lives') + '</span></a></li>';
    }).join('');
    h += '<div class="two" style="margin-top:0">' + sec('By field', '<ul class="list">' + fieldRows + '</ul>') + sec('By how they lead', '<ul class="list">' + stanceRows + '</ul>' +
      '<p class="note" style="margin-top:10px">Each life carries a proposed stance until a coach rules on it.</p>') + '</div>';
    h += sec('By era', eraBars(), '<a class="btn sm" href="#/eras">All eras</a>');
    return { title: '', html: h, node: { k: 'home:', label: 'Library', href: '#/' }, after: paintMap };
  }
  function fams() {
    var by = {}; lib.situations.forEach(function (s) { (by[s.fam] = by[s.fam] || []).push(s); });
    return '<div class="fams">' + Object.keys(by).sort().map(function (f) {
      return '<div><h3>' + esc(f + ' · ' + (CLC.FAMILY[f] || '')) + '</h3><ul class="list">' + by[f].map(function (s) {
        return '<li><a class="rowlink" href="' + H.sit(s.id) + '"><span class="code">' + esc(s.id) + '</span><span><span class="t">' + esc(s.chip) + '</span><span class="s" style="display:block">' + esc(s.line) + '</span></span><span class="n">' + s.stories.length + '</span></a></li>';
      }).join('') + '</ul></div>';
    }).join('') + '</div>';
  }
  function eraBars() {
    var es = CLC.eras(lib).filter(function (e) { return e.id !== 'undated'; }), mxn = Math.max.apply(null, es.map(function (e) { return e.stories; }));
    return '<div class="bars">' + es.map(function (e) {
      return '<a class="bar" href="' + H.era(e.id) + '"><span>' + esc(e.label.replace(/^The /, '')) + '</span><span class="track"><span class="fill" style="display:block;width:' + (100 * e.stories / mxn).toFixed(1) + '%"></span></span><span class="n">' + e.stories + '</span></a>';
    }).join('') + '</div>';
  }
  function memberCard(id) {
    var m = CLC.member(lib, id);
    return '<a class="card" href="' + H.member(id) + '"><div class="person"><span class="disc">' + esc(m.ini) + '</span><div style="min-width:0"><div class="nm">' + esc(m.name) + '</div><div class="ds">' + esc(m.role + ' · ' + m.co) + '</div></div></div>' +
      '<div class="meta" style="margin-top:10px">' + esc(m.situations.map(function (s) { return s.id; }).join(' · ')) + ' · coached by ' + esc(m.coach ? m.coach.first : '') + '</div>' +
      '<div class="first" style="font-style:italic">“' + esc(m.goal) + '”</div></a>';
  }

  function iconPage(id) {
    var ic = lib.icon[id] || lib.icon[lib.idmap[id]]; if (!ic) return missing();
    var t = CLC.iconTrails(lib, ic.id), mine = isMine(ic.id);
    var stance = ic.stance ? '<a href="' + H.stance(ic.stance) + '" title="' + esc(ic.stanceGloss) + '">' + esc(ic.stanceName) + '</a>' + (ic.stanceStatus === 'proposed' ? ' <span class="meta">(proposed)</span>' : '') : '';
    var facts = [ic.desc || ic.domainLabel, ic.place, ic.born != null ? 'born ' + yl(ic.born) : ''].filter(Boolean).join(' · ');
    var h = '<div class="person" style="gap:18px;align-items:flex-start"><span class="disc lg' + (ic.stories.length ? '' : ' thin') + (mine ? ' mine' : '') + '">' + esc(ic.ini) + '</span><div style="min-width:0">' +
      '<h1>' + esc(ic.name) + '</h1><p class="meta" style="font-size:15px;margin:8px 0 0">' + esc(cap(facts)) + '</p>' +
      '<div class="row" style="margin-top:12px">' + (mine ? '<span class="badge mine">One of your three</span>' : '') +
      (stance ? '<span class="meta">Leads by ' + stance + '</span>' : '') + '<a class="btn sm" href="' + esc(ic.wiki) + '" target="_blank" rel="noopener">Wikipedia <i class="ph ph-arrow-up-right"></i></a></div>' +
      (ic.q && ic.q.length ? '<p class="note i" style="margin-top:12px">' + ic.q.map(esc).join(' · ') + '</p>' : '') + '</div></div>';
    var stories = ic.stories.map(function (sid) { return CLC.storyCard(lib, lib.story[sid]); });
    var left = sec(n(stories.length, 'story', 'stories'), stories.length ? '<div class="stack">' + stories.map(function (c) { return storyCard(c, { noName: true }); }).join('') + '</div>'
      : '<p class="empty">No story from ' + esc(ic.name) + ' in the library yet.' + (ic.inCorpus ? '' : ' ' + esc(ic.short || ic.name) + ' is a hero in the app and waits for a record.') + '</p>');
    if (ic.moments.length) left += sec('Defining moments', '<ol class="moments">' + ic.moments.map(function (m) {
      return '<li><span class="y">' + esc(yl(m.year)) + '</span><div><div class="l">' + esc(cap(m.label)) + '</div>' + (m.source ? '<div class="src">' + esc(m.source) + '</div>' : '') + '</div></li>';
    }).join('') + '</ol><p class="note" style="margin-top:10px">Written from recall. Each year waits for a check against its source.</p>');
    if (ic.works.length) {
      var K = { book: ['Read', 'ph-book-open'], audio: ['Listen', 'ph-headphones'], film: ['Watch', 'ph-film-strip'] };
      left += sec('Read, listen, watch', ['book', 'audio', 'film'].map(function (k) {
        var ws = ic.works.map(function (w) { return lib.work[w]; }).filter(function (w) { return w.kind === k; }); if (!ws.length) return '';
        return '<h3 style="margin-top:14px">' + K[k][0] + '</h3><div class="works">' + ws.map(function (w) {
          return '<a href="' + esc(workUrl(w)) + '" target="_blank" rel="noopener"><i class="ph ' + K[k][1] + '"></i><span style="flex:1;min-width:0"><span class="t" style="display:block">' + esc(w.title) + '</span><span class="m">' + esc([w.form, w.by, w.year].filter(Boolean).join(' · ')) + '</span></span><i class="ph ph-arrow-up-right"></i></a>';
        }).join('') + '</div>';
      }).join('') + '<p class="note" style="margin-top:10px">These open a public catalogue search outside Constellation.</p>');
    }
    var right = '<div class="panel well" style="margin-top:52px"><h2 style="font-size:23px">Trails from here</h2><p class="note">Follow any of these. Each opens a page with trails of its own.</p>';
    if (t.situations.length) right += t.situations.map(function (x) {
      return '<div class="trailgroup"><h3><a href="' + H.sit(x.sit.id) + '">' + esc(x.sit.id) + '</a> ' + esc(x.sit.chip) + '</h3><p class="meta" style="margin:-4px 0 8px">' + n(x.total, 'other life', 'other lives') + ' in this situation</p><div class="people-row">' + spread(x.people, ic.year, 6).map(pchip).join('') + '</div></div>';
    }).join('');
    if (t.contemporaries.length) right += '<div class="trailgroup"><h3>Their time · <a href="' + H.era(CLC.eraOf(ic.year).id) + '">' + esc(CLC.eraOf(ic.year).label) + '</a></h3><div class="people-row">' + t.contemporaries.slice(0, 6).map(pchip).join('') + '</div></div>';
    if (t.field.length) right += '<div class="trailgroup"><h3>Same field · <a href="' + H.field(ic.field) + '">' + esc(ic.domainLabel) + '</a></h3><div class="people-row">' + t.field.slice(0, 6).map(pchip).join('') + '</div></div>';
    if (t.stance.length) right += '<div class="trailgroup"><h3>Leads the same way · <a href="' + H.stance(ic.stance) + '">' + esc(ic.stanceName) + '</a></h3><div class="people-row">' + t.stance.slice(0, 6).map(pchip).join('') + '</div></div>';
    right += '</div>';
    h += '<div class="two">' + '<div>' + left + '</div><div>' + right + '</div></div>';
    if (pos[ic.id]) h += sec('Where ' + esc(ic.name) + ' sits', '<div class="map" id="map"><div class="map-scroll"></div><div class="tip" id="tip" hidden></div></div><p class="mapcap meta" id="mapcap"></p>' +
      (ic.keys.length > 1 ? '<div class="chips" role="group" aria-label="Light up one of their situations">' + ic.keys.map(function (k) { var s = lib.sitByKey[k]; return '<button type="button" class="sit" data-act="light" data-key="' + esc(k) + '" title="' + esc(s.chip) + '"><b>' + esc(s.id) + '</b> ' + esc(s.chip) + '</button>'; }).join('') + '</div>' : ''));
    return { title: ic.name, html: h, node: { k: 'icon:' + ic.id, label: ic.name, href: H.icon(ic.id) },
      after: function () { if (pos[ic.id]) { mapOpts = { focus: ic.id, chips: false }; lit = ic.keys[0] || null; paintMap(); } } };
  }
  function workUrl(w) {
    if (w.url) return w.url;
    if (w.kind === 'book') return 'https://openlibrary.org/search?q=' + enc(w.title + ' ' + (w.by || ''));
    if (w.kind === 'audio') return 'https://open.spotify.com/search/' + enc(w.title);
    return 'https://www.imdb.com/find/?q=' + enc(w.title + (w.year ? ' ' + w.year : ''));
  }

  function storyPage(id) {
    var sid = CLC.resolve(lib, id), s = lib.story[sid]; if (!s) return missing();
    var ic = lib.icon[s.icon], t = CLC.storyTrails(lib, s.id), st = CLC.STATUS[s.status] || CLC.STATUS.recall;
    var foreign = s.pattern_lang && s.pattern_lang !== 'en' && s.pattern_en, isSaved = saved.indexOf(s.id) >= 0;
    var h = '<div class="two"><article>' +
      '<div class="row"><span class="label">' + esc(s.place || s.era) + '</span>' + badge(s) + '</div>' +
      '<h1 style="margin-top:8px"><a href="' + H.icon(ic.id) + '" style="color:inherit;text-decoration:none">' + esc(ic.name) + '</a></h1>' +
      (s.context ? '<p class="meta" style="font-size:15px;margin:8px 0 0">' + esc(cap(s.context)) + '</p>' : '') +
      '<p class="prose">' + esc(s.moment) + '</p>' +
      (s.pattern ? '<blockquote class="quote">“' + esc(foreign ? s.pattern_en : s.pattern) + '”' + (foreign ? '<span class="orig" lang="' + esc(s.pattern_lang) + '">“' + esc(s.pattern) + '”</span>' : '') + '</blockquote>' +
        (s.by ? '<p class="meta" style="margin:8px 0 0">' + esc(s.by) + '</p>' : '') + (foreign && s.pattern_translation ? '<p class="meta" style="margin:8px 0 0">Translation: ' + esc(s.pattern_translation) + '</p>' : '') : '') +
      '<dl class="kv" style="margin-top:26px"><dt>Source</dt><dd>' + esc(s.source || 'Not yet sourced.') + '</dd>' + (s.caution ? '<dt>Caution</dt><dd>' + esc(s.caution) + '</dd>' : '') +
      (s.why && AS !== 'reader' ? '<dt>Why it fits</dt><dd>' + esc(s.why) + '</dd>' : '') + '</dl>' +
      '</article><aside style="padding-top:8px">';
    h += '<div class="panel"><div class="row">' + badge(s) + '</div><p class="note" style="margin:10px 0 0">' + esc(st.note) + '</p>' +
      (s.checked ? '<p class="note" style="margin:8px 0 0">Checked by ' + esc((lib.coaches[s.checked.by] || {}).name || s.checked.by) + ', ' + esc(when(s.checked.at)) + (s.checked.note ? ': ' + esc(s.checked.note) : '.') + '</p>' : '') +
      (!s.verified && AS !== 'coach' ? '<p class="note" style="margin:8px 0 0">The quotation in a draft is unchecked.</p>' : '') +
      '<h3 style="margin-top:18px">Filed under</h3><div class="row">' + s.keys.map(function (k) { return lib.sitByKey[k] ? sitChip(lib.sitByKey[k]) : ''; }).join('') + '</div>' +
      '<div class="row" style="margin-top:18px">' +
      '<button class="btn' + (isSaved ? ' on' : '') + '" type="button" data-act="save" data-id="' + esc(s.id) + '"><i class="' + (isSaved ? 'ph-fill' : 'ph') + ' ph-bookmark-simple"></i>' + (isSaved ? 'Saved' : 'Save') + '</button>' +
      (EMBED && me && AS === 'member' ? '<button class="btn" type="button" data-act="ask" data-id="' + esc(s.id) + '">Ask ' + esc(me.coach ? me.coach.first : 'your coach') + ' about this</button>' : '') +
      (EMBED && AS === 'coach' ? '<button class="btn solid" type="button" data-act="send" data-id="' + esc(s.id) + '"' + (s.verified ? '' : ' disabled title="Check the source first"') + '>Send to a member</button>' : '') +
      '</div></div>';
    if (AS === 'coach') h += coachPanel(s);
    h += '</aside></div>';
    var trailsH = t.situations.map(function (x) {
      var here = x.stories[x.at], before = x.stories[x.at - 1], after = x.stories[x.at + 1];
      return '<div class="trailgroup"><h3><a href="' + H.sit(x.sit.id) + '">' + esc(x.sit.id) + '</a> ' + esc(x.sit.chip) + ', across time</h3>' + strip(x.stories, here) +
        '<div class="neighbours">' + (before ? '<div><p class="meta" style="margin:0 0 6px">Earlier</p>' + storyCard(before, { noQuote: true }) + '</div>' : '<div></div>') +
        (after ? '<div><p class="meta" style="margin:0 0 6px">Later</p>' + storyCard(after, { noQuote: true }) + '</div>' : '') + '</div>' +
        '<p style="margin:10px 0 0"><a class="meta" href="' + H.sit(x.sit.id) + '">All ' + x.total + ' stories in ' + esc(x.sit.id) + '</a></p></div>';
    }).join('');
    h += sec('Trails from this story', '<div class="panel well">' + trailsH + '</div>');
    if (t.moreFrom.length) h += sec('More from ' + esc(ic.name), '<div class="grid">' + t.moreFrom.map(function (c) { return storyCard(c, { noName: true }); }).join('') + '</div>');
    if (t.sameEra.length) h += sec('The same years, other lives', '<div class="grid">' + t.sameEra.map(function (c) { return storyCard(c); }).join('') + '</div>', '<a class="btn sm" href="' + H.era(t.era.id) + '">' + esc(t.era.label) + '</a>');
    return { title: ic.name + ', ' + (s.place || s.era), html: h, node: { k: 'story:' + s.id, label: ic.name + ', ' + (s.year != null ? yl(s.year) : s.era), href: H.story(s.id) } };
  }
  function strip(list, here) {
    var ys = list.map(function (c) { return c.year; }).filter(function (y) { return y != null; });
    if (!ys.length) return '';
    var lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys), span = Math.max(1, hi - lo);
    var x = function (y) { return y == null ? 0 : 2 + 96 * (y - lo) / span; };
    return '<div class="strip" role="list"><div class="line"></div>' + list.map(function (c) {
      return '<a role="listitem" href="' + H.story(c.id) + '"' + (c === here ? ' class="here" aria-current="page"' : '') + ' style="left:' + x(c.year).toFixed(2) + '%" title="' + esc(c.name + ', ' + (c.place || yl(c.year))) + '"><span class="sr">' + esc(c.name + ', ' + yl(c.year)) + '</span></a>';
    }).join('') + '<span class="yl" style="left:2%">' + yl(lo) + '</span><span class="yl" style="left:98%">' + yl(hi) + '</span></div>';
  }
  function coachPanel(s) {
    var coachId = me && me.coach ? me.coach.id : 'jim';
    var h = '<div class="panel coach" style="margin-top:16px" id="check"><h2 style="font-size:21px">For the coach</h2>';
    if (s.status === 'sample-verified') h += '<p class="note">A demo sample, checked for the prototype.</p>';
    else if (s.verified) h += '<p class="note">Checked. It can be sent to a member now.</p><button class="btn sm" type="button" data-act="unverify" data-id="' + esc(s.id) + '">Take the check back</button>';
    else h += '<form class="form" style="margin-top:6px"><p class="note" style="margin:0">Read the story and the quotation against the source above. When both hold, mark it checked: it becomes sendable for every member.</p>' +
      '<label class="meta" for="by">Checked by</label><select id="by" name="by">' + Object.keys(lib.coaches).map(function (c) { return '<option value="' + esc(c) + '"' + (c === coachId ? ' selected' : '') + '>' + esc(lib.coaches[c].name) + '</option>'; }).join('') + '</select>' +
      '<label class="meta" for="note">What you checked it against</label><textarea id="note" name="note" placeholder="The edition, the page, the interview"></textarea>' +
      '<button class="btn pru" type="submit" data-act="verify" data-id="' + esc(s.id) + '"><i class="ph ph-seal-check"></i>Mark as checked against the source</button></form>';
    if (s.move_examples.length) h += '<h3 style="margin-top:20px">Move examples</h3><ul class="list">' + s.move_examples.map(function (m) { return '<li style="padding:10px 0;font:400 15px/1.5 var(--serif)">' + esc(m) + '</li>'; }).join('') + '</ul>';
    if (s.line_examples.length) h += '<h3 style="margin-top:20px">Line examples</h3><ul class="list">' + s.line_examples.map(function (m) { return '<li style="padding:10px 0;font:italic 400 15px/1.5 var(--serif)">' + esc(m) + '</li>'; }).join('') + '</ul>';
    var rv = s.review || {};
    h += '<dl class="kv" style="margin-top:18px">' + (s.voice ? '<dt>Voice</dt><dd>' + esc(s.voice === 'both' ? 'Jim and Jennifer' : cap(s.voice)) + '</dd>' : '') + (s.directness ? '<dt>Directness</dt><dd>' + esc(cap(s.directness)) + '</dd>' : '') +
      (rv.fit ? '<dt>Fit</dt><dd>' + esc(cap(rv.fit)) + '</dd>' : '') + (rv.quote_risk ? '<dt>Quote risk</dt><dd>' + esc(cap(rv.quote_risk)) + '</dd>' : '') +
      (s.rights && s.rights.quote ? '<dt>Rights</dt><dd>' + esc(cap(s.rights.quote)) + '</dd>' : '') + '<dt>Reach</dt><dd>' + esc(cap(s.reach)) + '</dd>' +
      (s.corpus ? '<dt>Corpus record</dt><dd class="tabular">' + esc(s.corpus) + '</dd>' : '') + '</dl></div>';
    return h;
  }

  function sitPage(code, qs) {
    var s = lib.sit[code] || lib.sitByKey[code]; if (!s) return missing();
    var f = qs.get('f') || 'all', stories = s.stories.map(function (x) { return lib.story[x]; })
      .filter(function (x) { return f === 'all' || (f === 'near' ? x.reach !== 'far' : x.verified); });
    var seg = function (k, label) { return '<a class="btn sm' + (f === k ? ' on' : '') + '" href="' + H.sit(s.id) + (k === 'all' ? '' : '?f=' + k) + '">' + label + '</a>'; };
    var h = '<p class="label">' + esc(s.id + ' · ' + s.family) + '</p><h1 style="margin-top:8px">' + esc(s.chip) + '</h1><p class="lede">' + esc(s.line) + '</p>' +
      '<p class="note i" style="margin-top:10px">In a member’s words: “' + esc(s.member_line) + '”</p>';
    h += sec('Who has lived it', '<div class="map" id="map"><div class="map-scroll"></div><div class="tip" id="tip" hidden></div></div><p class="mapcap meta" id="mapcap"></p>' +
      '<div class="people-row" style="margin-top:14px">' + s.icons.map(function (i) { return lib.icon[i]; }).sort(function (a, b) { return (a.year || 0) - (b.year || 0); }).map(function (i) { return pchip(CLC.iconCard(lib, i)); }).join('') + '</div>');
    h += sec(n(stories.length, 'story', 'stories'), stories.length ? '<div class="grid">' + stories.map(function (x) { return storyCard(CLC.storyCard(lib, x)); }).join('') + '</div>' : '<p class="empty">Nothing matches that filter yet.</p>',
      '<div class="row">' + seg('all', 'All') + seg('near', 'Near and mid') + seg('checked', 'Checked') + '</div>');
    if (AS === 'coach') {
      var o = s.outcome || {}, c = s.calibration || {};
      var mv = s.moves.map(function (m) {
        return '<li style="padding:14px 0"><div class="row"><span class="badge' + (m.status === 'exemplar' ? ' ok' : '') + '">' + (m.status === 'exemplar' ? 'Exemplar · ' + esc(cap(m.author)) : 'Draft') + '</span><span class="meta">Variant ' + esc(m.variant) + ' · ' + esc(m.directness) + '</span></div>' +
          '<p style="font:400 18px/1.45 var(--serif);margin:8px 0 6px">' + esc(m.behaviour) + '</p><dl class="kv"><dt>Where</dt><dd>' + esc(cap(m.trigger)) + '</dd><dt>First failure</dt><dd>' + esc(cap(m.first_failure)) + '</dd><dt>Observable</dt><dd>' + esc(cap(m.observable)) + '</dd><dt>Retire when</dt><dd>' + esc(cap(m.retire_when)) + '</dd>' +
          (m.indirect_variant ? '<dt>Indirect form</dt><dd>' + esc(m.indirect_variant.behaviour) + '</dd>' : '') + '</dl></li>';
      }).join('');
      var ln = s.lines.map(function (l) {
        return '<li style="padding:14px 0"><span class="badge">' + (l.status === 'draft' ? 'Draft' : esc(cap(l.status))) + '</span><p style="font:italic 400 18px/1.45 var(--serif);margin:8px 0 6px">' + esc(l.message) + '</p><dl class="kv"><dt>Lean into</dt><dd>' + esc(l.lean_into) + '</dd><dt>Watch for</dt><dd>' + esc(cap(l.watch_for)) + '</dd><dt>Off the table</dt><dd>' + esc(cap(l.off_the_table)) + '</dd><dt>Format</dt><dd>' + esc(cap(l.format)) + '</dd></dl></li>';
      }).join('');
      h += '<section class="panel coach"><h2>For the coach</h2><div class="two" style="gap:40px;margin-top:14px"><div>' +
        '<h3>What growth looks like</h3><p style="font:400 17px/1.5 var(--serif);margin:0">' + esc(o.member_growth || '') + '</p>' +
        '<h3 style="margin-top:16px">What the firm gets</h3><p style="font:400 17px/1.5 var(--serif);margin:0">' + esc(o.firm_outcome || '') + '</p>' +
        '<dl class="kv" style="margin-top:14px">' + (o.firm_indicator ? '<dt>Indicator</dt><dd>' + esc(cap(o.firm_indicator)) + '</dd>' : '') + (o.horizon_weeks ? '<dt>Horizon</dt><dd>' + esc(o.horizon_weeks) + ' weeks</dd>' : '') + (s.owner ? '<dt>Owner</dt><dd>' + esc(cap(s.owner)) + '</dd>' : '') + '</dl></div><div>' +
        '<h3>Calibration</h3><dl class="kv"><dt>Default</dt><dd>' + esc(cap(c.directness_default || '')) + '</dd>' + ((c.go_indirect_when || []).length ? '<dt>Go indirect when</dt><dd>' + esc(c.go_indirect_when.join(', ')) + '</dd>' : '') +
        (c.indirect_principle ? '<dt>Indirect principle</dt><dd>' + esc(c.indirect_principle) + '</dd>' : '') + (c.guardrail ? '<dt>Guardrail</dt><dd>' + esc(c.guardrail) + '</dd>' : '') + '</dl>' +
        (s.literature.length ? '<h3 style="margin-top:16px">Reading behind it</h3><ul class="list">' + s.literature.map(function (l) { return '<li style="padding:8px 0;font:400 15px/1.45 var(--serif)">' + esc(l) + '</li>'; }).join('') + '</ul>' : '') +
        '</div></div><h3 style="margin-top:26px">Moves</h3><ul class="list">' + mv + '</ul><h3 style="margin-top:26px">Lines</h3><ul class="list">' + ln + '</ul></section>';
    }
    var fam = lib.situations.filter(function (x) { return x.fam === s.fam && x.id !== s.id; });
    h += sec('The rest of ' + esc(s.fam + ' · ' + s.family), '<div class="row">' + fam.map(sitChip).join('') + '</div>');
    return { title: s.id + ' ' + s.chip, html: h, node: { k: 'sit:' + s.id, label: s.id + ' ' + s.chip, href: H.sit(s.id) },
      after: function () { mapOpts = { key: s.key, chips: false }; lit = s.key; paintMap(); } };
  }
  function sitsPage() { return { title: 'Situations', html: '<h1>Situations</h1><p class="lede">Twenty-two situations a new leader meets, in five families. Every story is filed under at least one.</p>' + sec('All situations', fams()) }; }

  function eraPage(id) {
    var es = CLC.eras(lib), i = es.map(function (e) { return e.id; }).indexOf(id); if (i < 0) return missing();
    var e = es[i], v = CLC.eraView(lib, id), prev = es[i - 1], next = es[i + 1];
    var h = '<p class="label">Era</p><h1 style="margin-top:8px">' + esc(e.label) + '</h1><p class="lede">' + n(v.stories.length, 'story', 'stories') + ' set in these years, and ' + n(v.icons.length, 'life', 'lives') + ' whose defining moment falls here.</p>' +
      '<div class="row" style="margin-top:16px">' + (prev ? '<a class="btn sm" href="' + H.era(prev.id) + '"><i class="ph ph-arrow-left"></i>' + esc(prev.label) + '</a>' : '') + (next ? '<a class="btn sm" href="' + H.era(next.id) + '">' + esc(next.label) + '<i class="ph ph-arrow-right"></i></a>' : '') + '</div>';
    h += sec('Stories', '<div class="grid">' + v.stories.map(function (c) { return storyCard(c); }).join('') + '</div>');
    if (v.icons.length) h += sec('Lives', '<div class="people-row">' + v.icons.map(pchip).join('') + '</div>');
    return { title: e.label, html: h, node: { k: 'era:' + id, label: e.label, href: H.era(id) } };
  }
  function erasPage() { return { title: 'Eras', html: '<h1>Eras</h1><p class="lede">Every story placed in its decade. The early centuries share one row.</p>' + sec('Stories by era', eraBars()) }; }

  function fieldPage(id) {
    var f = FIELDS.filter(function (x) { return x.id === id; })[0]; if (!f) return missing();
    var ppl = lib.icons.filter(function (i) { return i.field === id; }), by = {};
    ppl.forEach(function (i) { (by[i.domainLabel] = by[i.domainLabel] || []).push(i); });
    var h = '<p class="label">Field</p><h1 style="margin-top:8px">' + esc(f.label) + '</h1><p class="lede">' + n(ppl.length, 'life', 'lives') + ', ' + n(ppl.reduce(function (a, i) { return a + i.stories.length; }, 0), 'story', 'stories') + '.</p>';
    Object.keys(by).sort(function (a, b) { return by[b].length - by[a].length; }).forEach(function (d) {
      h += sec(esc(d), '<div class="grid people">' + by[d].sort(function (a, b) { return (a.year || 0) - (b.year || 0); }).map(function (i) { return personCard(CLC.iconCard(lib, i)); }).join('') + '</div>');
    });
    return { title: f.label, html: h, node: { k: 'field:' + id, label: f.label, href: H.field(id) } };
  }
  function stancePage(id) {
    var s = lib.stances.filter(function (x) { return x.id === id; })[0]; if (!s) return missing();
    var ppl = lib.icons.filter(function (i) { return i.stance === id; }).sort(function (a, b) { return b.stories.length - a.stories.length || (a.name < b.name ? -1 : 1); });
    var h = '<p class="label">How they lead</p><h1 style="margin-top:8px">' + esc(s.name) + '</h1><p class="lede">' + esc(s.gloss) + '</p><p class="note" style="margin-top:10px">Stances are proposed for every life until a coach rules on them. ' + n(ppl.length, 'life carries', 'lives carry') + ' this one.</p>' +
      '<div class="row" style="margin-top:16px">' + lib.stances.filter(function (x) { return x.id !== id; }).map(function (x) { return '<a class="btn sm" href="' + H.stance(x.id) + '">' + esc(x.name) + '</a>'; }).join('') + '</div>';
    h += sec('Lives', '<div class="grid people">' + ppl.map(function (i) { return personCard(CLC.iconCard(lib, i)); }).join('') + '</div>');
    return { title: s.name, html: h, node: { k: 'stance:' + id, label: s.name, href: H.stance(id) } };
  }
  function peoplePage(id, qs) {
    var fld = qs.get('field') || '', sort = qs.get('sort') || 'name', only = qs.get('stories') === '1';
    var url = function (p) { var q = new URLSearchParams({ field: fld, sort: sort, stories: only ? '1' : '' }); Object.keys(p).forEach(function (k) { q.set(k, p[k]); }); ['field', 'stories'].forEach(function (k) { if (!q.get(k)) q.delete(k); }); if (q.get('sort') === 'name') q.delete('sort'); var s = q.toString(); return '#/people' + (s ? '?' + s : ''); };
    var ppl = lib.icons.filter(function (i) { return (!fld || i.field === fld) && (!only || i.stories.length); });
    ppl.sort(sort === 'year' ? function (a, b) { return (a.year == null ? 1e9 : a.year) - (b.year == null ? 1e9 : b.year) || (a.name < b.name ? -1 : 1); } : function (a, b) { return CLC.fold(a.name) < CLC.fold(b.name) ? -1 : 1; });
    var h = '<h1>People</h1><p class="lede">' + n(lib.icons.length, 'life', 'lives') + ' in the library. ' + lib.icons.filter(function (i) { return i.stories.length; }).length + ' have at least one story.</p>' +
      '<div class="row" style="margin-top:18px"><a class="btn sm' + (!fld ? ' on' : '') + '" href="' + url({ field: '' }) + '">Every field</a>' + FIELDS.map(function (f) { return '<a class="btn sm' + (fld === f.id ? ' on' : '') + '" href="' + url({ field: f.id }) + '">' + esc(f.label) + '</a>'; }).join('') + '</div>' +
      '<div class="row" style="margin-top:8px"><a class="btn sm' + (sort === 'name' ? ' on' : '') + '" href="' + url({ sort: 'name' }) + '">A to Z</a><a class="btn sm' + (sort === 'year' ? ' on' : '') + '" href="' + url({ sort: 'year' }) + '">By year</a>' +
      '<a class="btn sm' + (only ? ' on' : '') + '" href="' + url({ stories: only ? '' : '1' }) + '">With stories</a><span class="meta">' + n(ppl.length, 'life', 'lives') + ' shown</span></div>';
    h += '<div class="grid people" style="margin-top:22px">' + ppl.map(function (i) { return personCard(CLC.iconCard(lib, i)); }).join('') + '</div>';
    return { title: 'People', html: h };
  }
  function searchPage(id, qs) {
    var q = qs.get('q') || '', r = CLC.search(lib, q, 40), box = document.getElementById('q');
    if (document.activeElement !== box) box.value = q;
    var h = '<h1>Search</h1><p class="lede">' + (q ? (r.icons.length + r.stories.length + r.situations.length ? 'Results for “' + esc(q) + '”.' : 'Nothing for “' + esc(q) + '” yet. Try a surname, a city or a year.') : 'Type a name, a place, a year or a situation.') + '</p>';
    if (r.eras.length) h += sec('Era', '<div class="row">' + r.eras.map(function (e) { return '<a class="btn" href="' + H.era(e.id) + '">' + esc(e.label) + '</a>'; }).join('') + '</div>');
    if (r.icons.length) h += sec('People' + (r.total.icons > r.icons.length ? ' · the first ' + r.icons.length + ' of ' + r.total.icons : ''), '<div class="grid people">' + r.icons.map(personCard).join('') + '</div>');
    if (r.situations.length) h += sec('Situations', '<div class="row">' + r.situations.map(function (s) { return sitChip(s); }).join('') + '</div>');
    if (r.stories.length) h += sec('Stories' + (r.total.stories > r.stories.length ? ' · the first ' + r.stories.length + ' of ' + r.total.stories : ''), '<div class="grid">' + r.stories.map(function (c) { return storyCard(c); }).join('') + '</div>');
    return { title: q ? 'Search: ' + q : 'Search', html: h };
  }

  function membersPage() {
    if (AS !== 'coach') return missing();
    var h = '<h1>Members</h1><p class="lede">Six members, three coaches. Open a member for their reading and the season the matcher would serve them.</p>';
    h += sec('Members', '<div class="grid">' + lib.order.map(memberCard).join('') + '</div>');
    h += sec('Coaches', '<div class="grid">' + Object.keys(lib.coaches).map(function (c) {
      var co = lib.coaches[c], ms = lib.order.filter(function (m) { return lib.members[m].coach === c; });
      return '<div class="card"><div class="person"><span class="disc">' + esc(co.ini) + '</span><div><div class="nm">' + esc(co.name) + '</div><div class="ds">' + esc(co.title + ' · ' + co.spec) + '</div></div></div>' +
        '<div class="row" style="margin-top:12px">' + ms.map(function (m) { return '<a class="btn sm" href="' + H.member(m) + '">' + esc(lib.members[m].first) + '</a>'; }).join('') + '</div></div>';
    }).join('') + '</div>');
    h += '<p class="note" style="margin-top:22px">Sample data. Members and companies are fictional. Heroes are real people.</p>';
    return { title: 'Members', html: h };
  }
  function memberPage(id) {
    var mine = me && me.id === id && AS === 'member';
    if (!lib.members[id] || (AS !== 'coach' && !mine)) return missing();
    var r = CLC.readingFor(lib, id, 4), m = r.member;
    var h = '<p class="label">' + (mine ? 'For you' : 'Member · coached by ' + esc(m.coach ? m.coach.name : '')) + '</p><h1 style="margin-top:8px">' + esc(mine ? 'Reading for ' + m.first : m.name) + '</h1>' +
      '<p class="meta" style="font-size:15px;margin:8px 0 0">' + esc(m.role + ' · ' + m.co) + '</p><p class="lede" style="font-style:italic">“' + esc(m.goal) + '”</p>' +
      '<div class="row" style="margin-top:14px">' + m.situations.map(function (s) { return sitChip(s); }).join('') + '</div>';
    h += r.bySituation.map(function (b) {
      return sec('<a href="' + H.sit(b.sit.id) + '" style="color:inherit;text-decoration:none">' + esc(b.sit.id + ' · ' + b.sit.chip) + '</a>',
        '<p class="note" style="margin:-6px 0 14px">' + esc(b.sit.line) + ' ' + n(b.total, 'story', 'stories') + ' in the library.</p>' +
        (b.fromHeroes.length ? '<h3>From ' + (mine ? 'your' : 'their') + ' heroes</h3><div class="grid" style="margin-bottom:18px">' + b.fromHeroes.map(function (c) { return storyCard(c); }).join('') + '</div>' : '<p class="note">None of ' + (mine ? 'your' : 'their') + ' heroes has a story here yet. These come from further out.</p>') +
        '<h3>Further out</h3><div class="grid">' + b.beyond.map(function (c) { return storyCard(c); }).join('') + '</div>');
    }).join('');
    h += sec(mine ? 'Your heroes in the library' : 'Their heroes in the library', '<div class="grid people">' + r.heroes.map(function (x) {
      return '<div>' + personCard(x.icon) + '<p class="meta" style="margin:8px 4px 0">' + (x.covers.length ? 'Covers ' + esc(x.covers.join(', ')) : 'Covers none of ' + (mine ? 'your' : 'their') + ' situations yet') + '</p></div>';
    }).join('') + '</div>');
    if (AS === 'coach') h += sec('The season ahead', '<p class="note" style="margin:-6px 0 14px">The first eight weeks as the corpus matcher would serve them: the week’s situation, the move, the line and the story. Every story here is a recall draft until it is checked, and the app sends checked stories only.</p><div class="tablewrap" id="season"><p class="empty">Working it out…</p></div>');
    return { title: m.name, html: h, node: { k: 'member:' + id, label: mine ? 'For you' : m.name, href: H.member(id) },
      after: function () { if (AS === 'coach') season(id); } };
  }
  function season(id) {
    var paint = function (rows, source) {
      var el = document.getElementById('season'); if (!el) return;
      el.innerHTML = '<table class="season"><thead><tr><th>Week</th><th>Situation</th><th>Move</th><th>Line</th><th>Story</th></tr></thead><tbody>' + rows.map(function (w) {
        var s = w.story && lib.story[CLC.resolve(lib, w.story.id)];
        return '<tr><td class="tabular">' + w.week + '</td><td>' + (w.sit.id ? '<a href="' + H.sit(w.sit.id) + '">' + esc(w.sit.id) + '</a> ' : '') + esc(w.sit.chip) + '</td>' +
          '<td><span class="t">' + esc(w.move ? w.move.behaviour : '') + '</span>' + (w.move ? '<div class="meta">' + (w.move.status === 'exemplar' ? 'Exemplar' : 'Draft') + (w.mode ? ' · ' + esc(w.mode) : '') + '</div>' : '') + '</td>' +
          '<td><span class="t" style="font-style:italic">' + esc(w.line ? w.line.message : '') + '</span></td>' +
          '<td>' + (s ? '<a href="' + H.story(s.id) + '">' + esc(lib.icon[s.icon].name) + '</a><div class="meta">' + esc(s.place || s.era) + '</div>' + badge(s) : '<span class="meta">Nothing fits</span>') + '</td></tr>';
      }).join('') + '</tbody></table><p class="meta" style="margin-top:10px">' + (source === 'api' ? 'Served by the back end at /api/constellation/members/' + esc(id) + '/season.' : 'Worked out in this browser; the back end did not answer.') + '</p>';
    };
    getJSON('/api/constellation/members/' + enc(id) + '/season?weeks=8').then(function (r) { paint(r.season, 'api'); }, function () { paint(CLC.season(lib, M, id, 8), 'local'); });
  }
  function checksPage() {
    if (AS !== 'coach') return missing();
    var seen = {}, need = [];
    lib.order.forEach(function (mid) {
      var m = lib.members[mid], up = m.up19 && lib.sit[m.up19.sit]; if (!up) return;
      var mine = (m.heroes_icons.core || []).concat(m.heroes_icons.reserve ? [m.heroes_icons.reserve] : []);
      var list = (lib.byKey[up.key] || []).map(function (x) { return lib.story[x]; }).filter(function (s) { return !s.verified && s.reach !== 'far' && !seen[s.id]; })
        .sort(function (a, b) { return (mine.indexOf(b.icon) >= 0) - (mine.indexOf(a.icon) >= 0) || (a.reach === 'near' ? 0 : 1) - (b.reach === 'near' ? 0 : 1) || (a.id < b.id ? -1 : 1); }).slice(0, 3);
      list.forEach(function (s) { seen[s.id] = 1; });
      need.push({ m: m, up: up, list: list });
    });
    var done = Object.keys(ledger).filter(function (id) { return lib.story[id]; }).sort(function (a, b) { return ledger[b].at < ledger[a].at ? -1 : 1; });
    var h = '<h1>Source checks</h1><p class="lede">A story reaches a member once a coach has read it against its source. These are the drafts each member’s next situation needs first.</p>' +
      '<p class="note" style="margin-top:10px">' + (storeKind === 'kv' ? 'Checks are shared: every coach on this deployment sees them.' : 'Checks are kept in this browser' + (storeKind === 'memory' ? ' and, for a while, on the server' : '') + '. Connect a Redis store to the deployment to share them between coaches.') + '</p>';
    h += need.map(function (x) {
      return sec(esc(x.m.first + ' · ' + x.m.up19.label), '<p class="note" style="margin:-6px 0 14px"><a href="' + H.sit(x.up.id) + '">' + esc(x.up.id) + '</a> ' + esc(x.up.chip) + '</p>' +
        (x.list.length ? '<div class="grid">' + x.list.map(function (s) { return storyCard(CLC.storyCard(lib, s)); }).join('') + '</div>' : '<p class="empty">Nothing waiting here.</p>'));
    }).join('');
    h += sec('Checked', done.length ? '<ul class="list">' + done.map(function (id) {
      var s = lib.story[id], e = ledger[id];
      return '<li><a class="rowlink" href="' + H.story(id) + '"><span><span class="t">' + esc(lib.icon[s.icon].name + ', ' + (s.place || s.era)) + '</span><span class="s" style="display:block">' + esc(((lib.coaches[e.by] || {}).name || e.by) + ', ' + when(e.at) + (e.note ? ': ' + e.note : '')) + '</span></span></a></li>';
    }).join('') + '</ul>' : '<p class="empty">Nothing checked yet.</p>');
    return { title: 'Source checks', html: h };
  }
  function savedPage() {
    var ss = saved.filter(function (id) { return lib.story[CLC.resolve(lib, id)]; }).map(function (id) { return CLC.storyCard(lib, lib.story[CLC.resolve(lib, id)]); });
    var h = '<h1>Saved</h1><p class="lede">Stories you saved and trails you kept, in this browser' + (storeKind === 'kv' ? ' and on the server' : '') + '.</p>';
    h += sec('Stories', ss.length ? '<div class="grid">' + ss.map(function (c) { return storyCard(c); }).join('') + '</div>' : '<p class="empty">Nothing saved yet. Save a story from its page.</p>');
    h += sec('Trails', trails.length ? '<ul class="list">' + trails.map(function (t, i) {
      return '<li style="display:flex;gap:10px;align-items:center;padding:12px 4px"><span style="flex:1;min-width:0"><span class="t" style="font:400 17px/1.35 var(--serif);display:block">' + esc(t.name) + '</span><span class="meta">' + n(t.nodes.length, 'stop') + ' · ' + esc(when(t.at)) + ' · ' + esc(t.nodes.map(function (x) { return x.label; }).join(', ')) + '</span></span>' +
        '<button class="btn sm" type="button" data-act="open-trail" data-id="' + i + '">Walk it again</button><button class="btn sm" type="button" data-act="drop-trail" data-id="' + i + '" aria-label="Remove this trail"><i class="ph ph-x"></i></button></li>';
    }).join('') + '</ul>' : '<p class="empty">No trails kept yet. Wander for a while, then save the trail from the bar along the top.</p>');
    return { title: 'Saved', html: h };
  }

  // for the tests and for a curious reader
  window.CLL = { get lib() { return lib; }, get trail() { return trail; }, get as() { return AS; }, get store() { return storeKind; } };
})();
