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
     #/saved              saved stories and kept trails
   Query string: as=reader|member|coach, m=<member id>, core=<icon ids>, embed=1, theme=dark.

   Every page opened joins the trail along the top; a trail can be kept. Saves and trails live in
   this browser and, when the back end has a store, on the server too. A coach's source check goes
   to the shared ledger, and inside the app it reaches the engine at once. */
(function () {
  'use strict';
  var CLC = window.CLC, CLQ = window.CLQ, CLN = window.CLN, Q = new URLSearchParams(location.search), EMBED = Q.get('embed') === '1';
  var LS = store(window.localStorage), SS = store(window.sessionStorage);
  var MODES = ['reader', 'member', 'coach'];
  var AS = MODES.indexOf(Q.get('as')) >= 0 ? Q.get('as') : (EMBED ? 'reader' : LS.get('cl-as', 'reader'));
  if (AS === 'member' && !Q.get('m')) AS = 'reader';
  var MID = Q.get('m') || null;
  var lib = null, M = null, me = null, ledger = {}, storeKind = 'none';
  // the trail in progress belongs to this tab and to who is reading: a coach's wandering and a member's stay apart
  var TRAIL_KEY = 'cl-trail-now:' + AS + (MID ? ':' + MID : '');
  // inside the member app the app's saved list is the only one: the frame asks for it and sets it, never toggles
  var APPSAVE = EMBED && AS === 'member';
  var saved = APPSAVE ? [] : LS.get('cl-saved', []), trails = LS.get('cl-trails', []), trail = SS.get(TRAIL_KEY, []);
  var NS = ns(), main = document.getElementById('main'), first = true;
  // inside the app, the pages read in this frame, oldest first, so the app's Back can walk them back
  // one at a time before it closes the frame: {k: the page, h: its hash, label, y: where the reader was}
  var hops = [], backTo = null;
  // the checks members have asked for, as the app holds them: [{mid, sid}] from ?asked=mid:sid,mid:sid
  var ASKED = (Q.get('asked') || '').split(',').map(function (x) { var i = x.indexOf(':'); return i > 0 ? { mid: x.slice(0, i), sid: x.slice(i + 1) } : null; }).filter(Boolean);

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
    if (!APPSAVE && !saved.length && Array.isArray(u.saved)) saved = u.saved;
    if (!trails.length && Array.isArray(u.trails)) trails = u.trails;
    CLC.applyVerification(lib, ledger);
    if (MID && lib.members[MID]) {
      var m = lib.members[MID], core = (Q.get('core') || '').split(',').filter(function (x) { return lib.icon[x]; });
      me = { id: MID, first: m.first, name: m.name, coach: lib.coaches[m.coach] || null, core: core.length ? core : (m.heroes_icons.core || []).slice(),
        reserve: m.heroes_icons.reserve, sits: m.sits || [] };
    }
    layout(); chrome(); route();
    window.addEventListener('hashchange', route);
    if (EMBED) window.addEventListener('message', function (e) {
      if (e.source !== window.parent || e.origin !== location.origin || !e.data || e.data.type !== 'cl:back') return;
      if (hops.length < 2) { post('cl:close'); return; }
      hops.pop(); backTo = hops[hops.length - 1]; location.hash = backTo.h;
    });
    if (APPSAVE) {
      window.addEventListener('message', function (e) {
        if (e.source !== window.parent || e.origin !== location.origin || !e.data || e.data.type !== 'cl:state' || !Array.isArray(e.data.saved)) return;
        saved = e.data.saved.slice();
        if (Array.isArray(e.data.asked)) ASKED = e.data.asked.filter(function (x) { return typeof x === 'string'; }).map(function (x) { return { mid: MID, sid: x }; });
        links(cur); if (cur === 'story' || cur === 'saved') route(true);
      });
      post('cl:hello');
    }
  }).catch(function (e) {
    main.innerHTML = '<h1>The library</h1><p class="lede">It could not load: ' + esc(e.message) + '.</p>';
  });

  // ---------- chrome: links, modes, theme, search ----------
  function chrome() {
    foot();
    // inside a member's app the app's bar is the only bar: the trail comes home to You, and search and the
    // links show on the library's front page, which the bar's Browse opens
    if (EMBED && AS === 'member') document.documentElement.classList.add('member-embed');
    document.getElementById('searchform').addEventListener('submit', function (e) {
      e.preventDefault(); var q = document.getElementById('q').value.trim(); if (!q) return;
      // three words or more read as a question and go to Ask; fewer are a name to search for
      location.hash = q.split(/\s+/).length >= 3 ? '#/ask?t=' + enc(q) + '&read=1' + (AS !== 'reader' && MID ? '&m=' + enc(MID) : '') : '#/search?q=' + enc(q);
    });
    var qt; document.getElementById('q').addEventListener('input', function (e) {
      clearTimeout(qt); var q = e.target.value.trim();
      qt = setTimeout(function () {
        if (q.length < 2) return;
        var h = '#/search?q=' + enc(q);
        if (cur === 'search') { history.replaceState(null, '', h); route({ typing: true }); } else location.hash = h;
      }, 260);
    });
    [main, document.getElementById('trail'), document.getElementById('foot')].forEach(function (el) { if (el) el.addEventListener('click', onClick); });
    main.addEventListener('change', function (e) {
      if (e.target.id === 'litsel') { lit = e.target.value || null; paintMap(); }
      if (e.target.id === 'asksit' && e.target.value) { var base = e.target.dataset.q; location.hash = '#/ask?' + (base ? base + '&' : '') + 'sit=' + enc(e.target.value); }
    });
    // a check needs its note: the button wakes when the note has words
    main.addEventListener('input', function (e) {
      if (e.target.name !== 'note') return; var b = e.target.form && e.target.form.querySelector('[data-act="verify"]');
      if (b) { b.disabled = !e.target.value.trim(); b.title = b.disabled ? 'Say what you checked it against first' : ''; }
    });
    main.addEventListener('keydown', function (e) { if (e.target.id === 'askq' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('askform').requestSubmit(); } });
    main.addEventListener('submit', function (e) {
      if (e.target.id === 'askform') {
        e.preventDefault(); var v = document.getElementById('askq').value.trim(); if (!v) return;
        var m = e.target.dataset.m || new URLSearchParams(location.hash.split('?')[1] || '').get('m') || (AS !== 'reader' && MID ? MID : '');
        location.hash = '#/ask?t=' + enc(v) + '&read=1' + (m ? '&m=' + enc(m) : ''); return;
      }
      if (e.target.id !== 'pathform') return; e.preventDefault();
      var byName = function (v) { v = CLC.fold(v).trim(); return lib.icons.filter(function (i) { return i.stories.length && CLC.fold(i.name) === v; })[0] || CLC.search(lib, v, 1).icons[0]; };
      var a = byName(document.getElementById('pfrom').value), b = byName(document.getElementById('pto').value);
      if (a && b) location.hash = '#/path?from=' + enc(a.id) + '&to=' + enc(b.id); else say('Pick two names from the list.');
    });
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () {
      if (document.getElementById('map')) paintMap();
      document.querySelectorAll('.graphbox').forEach(function (g) { if (g._paint) g._paint(); });
    }, 150); });
  }
  // The footer: who is reading, the theme, and what a draft is. Inside the app the app decides both.
  function foot() {
    var el = document.getElementById('foot'); if (!el) return;
    if (EMBED) { el.remove(); return; }
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    el.innerHTML = '<div class="foot-in"><p class="note">' + esc(draftsNote()) + '</p><div class="foot-controls">' +
      '<span class="meta" id="readas">Reading as</span><div class="seg" role="group" aria-labelledby="readas">' + [['reader', 'Reader'], ['coach', 'Coach']].map(function (m) {
        return '<button type="button" data-act="mode" data-mode="' + m[0] + '" aria-pressed="' + (AS === m[0]) + '">' + m[1] + '</button>'; }).join('') + '</div>' +
      '<button class="btn sm quiet" type="button" data-act="theme"><i class="ph ph-' + (dark ? 'sun' : 'moon') + '" aria-hidden="true"></i>' + (dark ? 'Light' : 'Dark') + '</button></div></div>';
  }
  function links(cur) {
    var L = [];
    if (me && AS === 'member') L.push(['member', H.member(me.id), 'For you']);
    L.push(['ask', '#/ask', 'Ask']);
    if (AS !== 'member') L.push(['situations', '#/situations', 'Situations']);  // a member's phone has room for four; situations and eras stay on the home page
    L.push(['people', '#/people', 'People']);
    if (AS === 'reader') L.push(['eras', '#/eras', 'Eras']);
    if (AS === 'coach') L.push(['members', '#/members', 'Members'], ['checks', '#/checks', 'Source checks']);
    L.push(['saved', '#/saved', 'Saved', saved.length]);
    document.getElementById('links').innerHTML = L.map(function (l) { return '<a href="' + l[1] + '"' + (cur === l[0] ? ' aria-current="page"' : '') + '>' + esc(l[2]) + (l[3] ? '<span class="count">' + l[3] + '</span>' : '') + '</a>'; }).join('');
  }

  // ---------- routing ----------
  var R = { '': home, icon: iconPage, story: storyPage, situation: sitPage, situations: sitsPage, people: peoplePage, era: eraPage, eras: erasPage,
    field: fieldPage, stance: stancePage, search: searchPage, path: pathPage, near: nearPage, age: agePage, ask: askPage, questions: askPage, cmp: cmpPage, gaps: gapsPage, member: memberPage, members: membersPage, checks: checksPage, saved: savedPage };
  var cur = '';
  function route(o) {
    if (!lib) return;
    o = o && o.type ? {} : (o === true ? { keepScroll: true } : (o || {}));
    var h = location.hash.replace(/^#\/?/, ''), qi = h.indexOf('?'), qs = new URLSearchParams(qi >= 0 ? h.slice(qi + 1) : '');
    var parts = (qi >= 0 ? h.slice(0, qi) : h).split('/').map(function (p) { try { return decodeURIComponent(p); } catch (e) { return p; } });
    var fn = R[parts[0]] || missing, v;
    try { v = fn(parts[1], qs) || missing(); } catch (e) { console.error(e); v = { title: 'Something went wrong', html: '<h1>Something went wrong</h1><p class="lede">' + esc(e.message) + '</p>' }; }
    document.title = (v.title ? v.title + ' · ' : '') + 'Constellation Library';
    if (hops.length && !backTo) hops[hops.length - 1].y = window.scrollY;  // the page being left, unless Back already took it off
    main.innerHTML = v.html;
    if (v.after) v.after();
    if (window.matchMedia && matchMedia('(min-width: 761px)').matches) main.querySelectorAll('details[data-fold]').forEach(function (d) { d.open = true; });
    if (v.node) step(v.node);
    cur = parts[0] || ''; trailBar(); links(cur);
    document.documentElement.classList.toggle('at-home', cur === '');
    var qbox = document.getElementById('q'); if (cur !== 'search' && document.activeElement !== qbox) qbox.value = '';
    var at = qs.get('at') && document.getElementById(qs.get('at')), back = hop(parts, v);
    if (back) { window.scrollTo(0, back.y || 0); main.focus({ preventScroll: true }); }
    else if (at) at.scrollIntoView();
    else if (!o.keepScroll && !o.typing) { window.scrollTo(0, 0); if (!first) main.focus({ preventScroll: true }); }
    first = false;
    var pv = hops.length > 1 ? hops[hops.length - 2] : null;
    var sic = parts[0] === 'story' && lib.story[CLC.resolve(lib, parts[1])] && lib.icon[lib.story[CLC.resolve(lib, parts[1])].icon];
    var barTitle = sic && qs.get('at') === 'others' ? 'Others who lived ' + surname(sic.name) + '\u2019s week' : v.title || 'The library';
    post('cl:route', { route: location.hash || '#/', as: AS, depth: hops.length, prev: pv ? pv.label : '', prevTo: pv ? pv.to : '', title: barTitle });
    if (EMBED) { var stops = trail.filter(function (t) { return t.k !== 'home:'; });
      post('cl:trail', { total: stops.length, nodes: stops.slice(-8).map(function (t) { return { label: t.label, href: t.href, kind: t.k.split(':')[0] }; }) }); }
  }
  // Keeps the frame's own history. A page read again on its own (search typing, a re-render) is the same hop;
  // a page equal to the one before is a step back, whether the app's Back or the browser's made it.
  // Returns the hop when this render is a step back, so the reader lands where they were.
  function hop(parts, v) {
    var k = parts.slice(0, 2).join('/'), h = location.hash || '#/', top = hops[hops.length - 1], b = backTo;
    backTo = null;
    if (b && b.k === k) return b;
    if (hops.length > 1 && hops[hops.length - 2].k === k) { hops.pop(); return hops[hops.length - 1]; }
    if (top && top.k === k) { top.h = h; return null; }
    var L = hopLabel(parts, v); hops.push({ k: k, h: h, label: L[0], to: L[1], y: 0 });
    if (hops.length > 40) hops.shift();
    return null;
  }
  function surname(name) { var w = String(name).replace(/,? (Jr\.?|Sr\.?|II|III|IV)$/, '').split(' '); return w[w.length - 1]; }
  // What the app's Back button says for a page, and where the line under the title says it goes:
  // a person's name when it is short, else the kind of page.
  function hopLabel(parts, v) {
    var ic = parts[0] === 'icon' && lib.icon[parts[1]], sid = parts[0] === 'story' && CLC.resolve(lib, parts[1]), s = sid && lib.story[sid];
    if (ic) return [surname(ic.name), ic.name];
    if (s && lib.icon[s.icon]) return [surname(lib.icon[s.icon].name), lib.icon[s.icon].name + '\u2019s story'];
    var W = { '': 'Library', story: 'Story', situation: 'This week', situations: 'Situations', people: 'People', era: 'Era', eras: 'Eras', field: 'Field',
      stance: 'Stance', search: 'Search', path: 'Path', near: 'Your three', age: 'Your age', ask: 'Ask', questions: 'Ask', cmp: 'Compare', gaps: 'Gaps',
      member: me && parts[1] === me.id ? 'For you' : 'Member', members: 'Members', checks: 'Checks', saved: 'Saved' };
    var w = W[parts[0]] || (v.title && v.title.length <= 16 ? v.title : 'Back');
    return [w, parts[0] === '' ? 'the library\u2019s front page' : v.title || w];
  }
  function missing() { return { title: 'Not here', html: '<h1>Not in the library</h1><p class="lede">That page is not here.</p><p style="margin-top:18px"><a class="btn" href="#/">Back to the library</a></p>' }; }

  // ---------- the trail ----------
  // the trail is the way walked: a page equal to the one before the last is a step back, and takes the last off
  function step(node) {
    var last = trail[trail.length - 1], prev = trail[trail.length - 2];
    if (last && last.k === node.k) { last.label = node.label; }
    else if (prev && prev.k === node.k) { trail.pop(); prev.label = node.label; }
    else { trail.push(node); if (trail.length > 30) trail = trail.slice(-30); }
    SS.set(TRAIL_KEY, trail);
  }
  var KIND = { icon: 'ph-user', story: 'ph-book-open-text', sit: 'ph-compass', era: 'ph-calendar-blank', field: 'ph-squares-four', stance: 'ph-footprints', member: 'ph-user-circle', home: 'ph-sparkle' };
  function trailBar() {
    var el = document.getElementById('trail'), stops = trail.filter(function (t) { return t.k !== 'home:'; });
    if (stops.length < 2) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    el.innerHTML = '<div class="trail-in"><span class="trail-label">Your trail</span><ol>' + stops.map(function (t) {
      return '<li><a href="' + esc(safe(t.href)) + '" title="' + esc(t.label) + '"><span>' + esc(t.label) + '</span></a></li>'; }).join('') + '</ol>' +
      '<div class="trail-act"><button class="btn sm" type="button" data-act="save-trail"><i class="ph ph-bookmark-simple" aria-hidden="true"></i>Keep this trail</button>' +
      '<button class="btn sm quiet" type="button" data-act="clear-trail" aria-label="Clear the trail"><i class="ph ph-x" aria-hidden="true"></i></button></div></div>';
    var ol = el.querySelector('ol'); if (ol) ol.scrollLeft = ol.scrollWidth;
  }

  // ---------- actions ----------
  function onClick(e) {
    var a = e.target.closest('[data-act]'); if (!a) return;
    var act = a.dataset.act, id = a.dataset.id;
    if (act === 'save') { toggleSave(id); route(true); }
    if (act === 'ask') { post('cl:ask', { story: id }); say('Opening a message to your coach.'); }
    if (act === 'send') { post('cl:send', { story: id, member: a.dataset.member || MID }); }
    if (act === 'check') {
      post('cl:check', { story: id }); ASKED.push({ mid: MID, sid: id });
      var cf = me && me.coach ? me.coach.first : 'your coach';
      a.outerHTML = '<span class="flash">Waiting for ' + esc(cf) + '’s check</span>'; say('Asked ' + cf + ' to check it against its source.');
    }
    if (act === 'add-hero') { post('cl:add-hero', { icon: id, name: lib.icon[id].name }); a.outerHTML = '<span class="flash">Sent to ' + esc(me && me.coach ? me.coach.first : 'your coach') + '</span>'; say('Sent to your coach to add to your heroes.'); }
    if (act === 'suggest-hero') { post('cl:suggest-hero', { icon: id, name: lib.icon[id].name, member: MID }); a.outerHTML = '<span class="flash">Suggested to ' + esc(me ? me.first : '') + '</span>'; say('Suggested.'); }
    if (act === 'save-trail') {
      var stops = trail.filter(function (t) { return t.k !== 'home:'; });
      trails.unshift({ name: stops[0].label + ' to ' + stops[stops.length - 1].label, at: new Date().toISOString(), nodes: stops });
      trails = trails.slice(0, 50); LS.set('cl-trails', trails); syncUser(); say('Trail kept.'); links(cur); a.outerHTML = '<span class="flash">Kept</span>';
    }
    if (act === 'clear-trail') { trail = []; SS.set(TRAIL_KEY, trail); trailBar(); }
    if (act === 'cmp') { var pk = cmpPick(), at = pk.indexOf(id); if (at >= 0) pk.splice(at, 1); else { pk.push(id); if (pk.length > 2) pk.shift(); } SS.set('cl-cmp', pk); route(true); say(at >= 0 ? 'Taken out of the comparison.' : pk.length === 2 ? 'Two chosen. Compare them at the foot of the page.' : 'Chosen. Choose one more to compare.'); }
    if (act === 'cmp-clear') { SS.set('cl-cmp', []); route(true); }
    if (act === 'open-trail') { var t = trails[+id]; if (t) { trail = t.nodes.slice(); SS.set(TRAIL_KEY, trail); location.hash = safe(t.nodes[t.nodes.length - 1].href); } }
    if (act === 'drop-trail') { trails.splice(+id, 1); LS.set('cl-trails', trails); syncUser(); route(true); }
    if (act === 'light') { var k = a.dataset.key; lit = lit === k ? null : k; paintMap(); }
    if (act === 'mode') { AS = a.dataset.mode; LS.set('cl-as', AS); TRAIL_KEY = 'cl-trail-now:' + AS + (MID ? ':' + MID : ''); trail = SS.get(TRAIL_KEY, []); foot(); route(true); }
    if (act === 'theme') { var th = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', th); try { localStorage.setItem('cl-theme', th); } catch (x) {} foot(); }
    if (act === 'verify') {
      var f = a.closest('form'), by = f.querySelector('[name=by]').value, note = f.querySelector('[name=note]').value.trim();
      e.preventDefault(); if (!note) return; verify(id, by, note);
    }
    if (act === 'unverify') { e.preventDefault(); unverify(id); }
  }
  function toggleSave(id) {
    var i = saved.indexOf(id);
    if (i >= 0) saved.splice(i, 1); else saved.unshift(id);
    if (!APPSAVE) { LS.set('cl-saved', saved); syncUser(); }
    post('cl:save', { story: id, on: i < 0 });
    say(i >= 0 ? 'Removed from saved.' : 'Saved.');
  }
  var syncT; function syncUser() { clearTimeout(syncT); syncT = setTimeout(function () { send('PUT', '/api/constellation/state/user?ns=' + enc(NS), { saved: saved, trails: trails }); }, 600); }
  function verify(id, by, note) {
    var s = lib.story[id]; if (!s) return;
    var entry = { by: by, at: new Date().toISOString(), note: note };
    ledger[id] = entry; var l = LS.get('cl-ledger', {}); l[id] = entry; LS.set('cl-ledger', l);
    s.verified = true; s.status = 'verified'; s.checked = entry;
    // the app hears of the check once the ledger has it: the frame may close as soon as the app knows
    send('POST', '/api/constellation/state/ledger', { story: id, by: by, note: note }).then(function () { post('cl:verified', { story: id, entry: entry }); });
    say('Checked against the source. It can be sent now.'); route(true);
  }
  function unverify(id) {
    var s = lib.story[id]; if (!s) return;
    delete ledger[id]; var l = LS.get('cl-ledger', {}); delete l[id]; LS.set('cl-ledger', l);
    s.verified = false; s.status = s.origin === 'sample' ? 'sample-draft' : 'recall'; delete s.checked;
    send('DELETE', '/api/constellation/state/ledger?story=' + enc(id)).then(function () { post('cl:unverified', { story: id }); });
    say('Check taken back.'); route(true);
  }

  // ---------- pieces ----------
  function coachFirst() { return me && me.coach ? me.coach.first : 'your coach'; }
  function isMine(id) { return !!(me && AS !== 'coach' && me.core.indexOf(id) >= 0); }
  function badge(s) {
    var st = CLC.STATUS[s.status] || CLC.STATUS.recall, ok = st.tone === 'ok';
    return '<span class="badge ' + (ok ? 'ok' : 'draft') + '" title="' + esc(st.note) + '">' + (ok ? '<i class="ph-fill ph-seal-check"></i>' : '') + esc(st.label) + '</span>';
  }
  function cardBadge(c) {
    if (c.verified) return '<span class="badge ok"><i class="ph-fill ph-seal-check" aria-hidden="true"></i>Verified</span>';
    return AS === 'coach' ? '<span class="badge draft">Recall draft</span>' : '';
  }
  function storyCard(c, o) {
    o = o || {};
    return '<a class="card" href="' + H.story(c.id) + '"><div class="top-line"><span class="place">' + esc(c.place || yl(c.year)) + '</span>' + cardBadge(c) + '</div>' +
      (o.noName ? '' : '<div class="who">' + esc(c.name) + '</div>') + '<div class="first">' + esc(c.first) + '</div>' +
      (c.pattern && !o.noQuote ? '<div class="pat">“' + esc(c.pattern) + '”</div>' : '') +
      (o.why ? '<div class="why' + (o.world ? ' world' : '') + '">' + esc(o.why.text) + '</div>' : '') + '</a>';
  }
  function personCard(c) {
    var mine = isMine(c.id);
    return '<a class="card' + (mine ? ' mine' : '') + '" href="' + H.icon(c.id) + '"><div class="person"><span class="disc' + (c.n ? '' : ' thin') + (mine ? ' mine' : '') + '">' + esc(c.ini) + '</span>' +
      '<div style="min-width:0"><div class="nm">' + esc(c.name) + '</div><div class="ds">' + esc(c.desc) + '</div></div></div>' +
      '<div class="meta" style="margin-top:10px">' + (c.n ? n(c.n, 'story', 'stories') : 'No story yet') + (c.year != null ? ' · ' + yl(c.year) : '') + (mine ? ' · <span style="color:var(--mad)">one of your three</span>' : '') + '</div></a>';
  }
  // a trail's heading is one large target that opens the whole trail
  function tlink(href, html) { return '<a class="tlink" href="' + href + '">' + html + '<i class="ph ph-arrow-right" aria-hidden="true"></i></a>'; }
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
  var FIELD_SHORT = { public: 'Public life', law: 'Law', business: 'Business', media: 'Media', sport: 'Sport', music: 'Music', arts: 'Arts & letters', ideas: 'Science & ideas' };
  function mapHTML(o) {
    mapOpts = o || {}; lit = mapOpts.key || null;
    var picker = '';
    if (mapOpts.chips !== false) {
      var by = {}; lib.situations.forEach(function (s) { (by[s.fam] = by[s.fam] || []).push(s); });
      picker = '<div class="mapbar"><label class="picker"><span class="sr">Light up a situation</span><select id="litsel"><option value="">Light up a situation</option>' +
        Object.keys(by).sort().map(function (f) { return '<optgroup label="' + esc(f + ' · ' + (CLC.FAMILY[f] || '')) + '">' + by[f].map(function (s) {
          return '<option value="' + esc(s.key) + '"' + (lit === s.key ? ' selected' : '') + '>' + esc(s.id + ' · ' + s.chip) + '</option>'; }).join('') + '</optgroup>'; }).join('') +
        '</select><i class="ph ph-caret-down" aria-hidden="true"></i></label></div>';
    }
    return picker + mapBox();
  }
  // the map, a sticky column of field names for when it scrolls, its caption, and the list a chosen star fills
  function mapBox() {
    return '<div class="map" id="map"><div class="map-scroll"></div><div class="mapfields" aria-hidden="true"></div><div class="tip" id="tip" hidden></div></div><p class="mapcap meta" id="mapcap" aria-live="polite"></p><div class="mapkin" id="mapkin"></div>';
  }
  function paintMap() {
    var host = document.getElementById('map'); if (!host) return;
    var key = lit, on = {};
    (key ? lib.iconsByKey[key] || [] : []).forEach(function (id) { on[id] = 1; });
    var mine = {}; (me && AS !== 'coach' ? me.core : []).forEach(function (id) { mine[id] = 1; });
    // SVG text scales with the drawing; hold the labels at 13px on screen whatever its width
    var sc0 = host.querySelector('.map-scroll'), drawn = Math.max(sc0.clientWidth || MW, 760), fs = (13 * MW / drawn).toFixed(1);
    var fresh = host.dataset.painted !== (key || '-'); host.dataset.painted = key || '-';
    var Hh = TOP + FIELDS.length * BAND + 30, s = '<svg viewBox="0 0 ' + MW + ' ' + Hh + '" tabindex="0" role="group" aria-label="' +
      esc('A map of ' + lib.icons.length + ' lives by field and by the year of their defining moment' + (key ? ', with ' + lib.sitByKey[key].chip + ' lit' : '') + '. Arrow keys move from life to life, Enter opens one.') + '">';
    FIELDS.forEach(function (f, k) { var y = TOP + k * BAND; if (k % 2 === 0) s += '<rect class="band" x="0" y="' + y + '" width="' + MW + '" height="' + BAND + '"/>'; s += '<text class="bandlabel" x="14" y="' + (y + BAND / 2 + fs * 0.35).toFixed(1) + '" font-size="' + fs + '">' + esc(FIELD_SHORT[f.id] || f.label) + '</text>'; });
    // a tick is drawn only where its label clears the last one drawn
    var lastRight = -1e9;
    TICKS.forEach(function (t) {
      var x = mx(t), half = (yl(t).length * 0.62 * fs + 12) / 2;
      if (x - half < lastRight) return;
      lastRight = x + half;
      s += '<line class="tick" x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + TOP + '" y2="' + (Hh - 26) + '"/><text class="ticklabel" x="' + x.toFixed(1) + '" y="' + (Hh - 8) + '" text-anchor="middle" font-size="' + fs + '">' + yl(t) + '</text>';
    });
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
    s += '<g class="threads" aria-hidden="true"></g><g class="curg" aria-hidden="true"></g>';
    lib.icons.forEach(function (i) { var p = pos[i.id]; if (p) s += '<circle class="hit" data-id="' + esc(i.id) + '" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="7"/>'; });
    s += '</svg>';
    host.classList.toggle('lit', !!key);
    host.querySelector('.map-scroll').innerHTML = s;
    document.querySelectorAll('.chips [data-act="light"]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.key === key); });
    var sel = document.getElementById('litsel'); if (sel && sel.value !== (key || '')) sel.value = key || '';
    var cap = document.getElementById('mapcap');
    if (cap) {
      if (key) {
        var st = lib.sitByKey[key], ys = Object.keys(on).map(function (id) { return lib.icon[id].year; }).filter(function (y) { return y != null; }).sort(function (a, b) { return a - b; });
        cap.innerHTML = '<b style="color:var(--pru)">' + esc(st.id) + '</b> ' + esc(st.chip) + '. ' + n(Object.keys(on).length, 'life', 'lives') + ', ' + n(st.stories.length, 'story', 'stories') +
          (ys.length ? ', from ' + yl(ys[0]) + ' to ' + yl(ys[ys.length - 1]) : '') + '. <a href="' + H.sit(st.id) + '">Open the situation</a>';
      } else cap.textContent = 'Each star is a life, placed by field and by the year of its defining moment. Larger stars hold more stories.' +
        (me && AS !== 'coach' ? ' Your three are ringed in red.' : '');
    }
    var sc = host.querySelector('.map-scroll');
    if (cap && sc.scrollWidth > sc.clientWidth + 4 && !cap.querySelector('.swipe')) cap.insertAdjacentHTML('afterbegin', '<span class="swipe">Swipe the map sideways to move through time. </span>');
    var tip = document.getElementById('tip'), svg = host.querySelector('svg');
    // threads: a life's kin (lib/net.js) drawn across the map, bowing upwards, thicker for three reasons or more;
    // the rest of the sky dims so the shape of the kinship shows: it leaps fields and centuries
    var thrOn = null, capText = cap ? cap.innerHTML : '';
    var threads = function (id) {
      var g = svg.querySelector('g.threads'); if (thrOn === id) return; thrOn = id;
      host.classList.toggle('threading', !!id);
      if (!id) { g.innerHTML = ''; if (cap) cap.innerHTML = capText; return; }
      var me0 = pos[id], kin = CLN.kindred(lib, id, 12).filter(function (k) { return pos[k.id]; }), t = '', boxes = [], w = function (txt) { return txt.length * fs * 0.56; };
      boxes.push({ x0: me0.x - 6, x1: me0.x + 6, y0: me0.y - 6, y1: me0.y + 6 });
      kin.forEach(function (k) {
        var q = pos[k.id], cx = (me0.x + q.x) / 2, lift = 18 + Math.abs(me0.x - q.x) * 0.12, cy = Math.min(me0.y, q.y) - lift, strong = k.tie.shared.length > 1 || k.tie.reasons.length >= 2;
        // the top of a quadratic curve sits halfway between its control point and its ends: if that leaves the map, bow down
        if ((me0.y + q.y) / 4 + cy / 2 < TOP + 4) cy = Math.min(Hh - 30, Math.max(me0.y, q.y) + lift);
        t += '<path class="thread' + (strong ? ' strong' : '') + '" d="M' + me0.x.toFixed(1) + ' ' + me0.y.toFixed(1) + ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + q.x.toFixed(1) + ' ' + q.y.toFixed(1) + '"/>';
      });
      kin.concat([{ id: id, me: true }]).forEach(function (k) {
        var q = pos[k.id], F = +fs, nm = k.me ? lib.icon[id].name : CLG.shortName(lib.icon[k.id].name), ww = w(nm), hh = F * 1.2, spots = [[q.x + 6, q.y + F * 0.35, 'start'], [q.x - 6, q.y + F * 0.35, 'end'], [q.x, q.y - 7, 'middle'], [q.x, q.y + F + 5, 'middle']];
        var ok = spots.filter(function (sp) { var x0 = sp[2] === 'start' ? sp[0] : sp[2] === 'end' ? sp[0] - ww : sp[0] - ww / 2, b = { x0: x0, x1: x0 + ww, y0: sp[1] - hh, y1: sp[1] + 2 }; return b.x0 > 0 && b.x1 < MW && b.y0 > 0 && b.y1 < Hh - 26 && !boxes.some(function (o) { return b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0; }); })[0];
        if (!ok) return;
        var x0 = ok[2] === 'start' ? ok[0] : ok[2] === 'end' ? ok[0] - ww : ok[0] - ww / 2; boxes.push({ x0: x0, x1: x0 + ww, y0: ok[1] - hh, y1: ok[1] + 2 });
        t += '<circle class="kin' + (k.me ? ' me' : '') + '" cx="' + q.x.toFixed(1) + '" cy="' + q.y.toFixed(1) + '" r="' + (k.me ? 4.5 : 3.6) + '"/><text class="kinlabel' + (k.me ? ' me' : '') + '" x="' + ok[0].toFixed(1) + '" y="' + ok[1].toFixed(1) + '" text-anchor="' + ok[2] + '" font-size="' + fs + '">' + esc(nm) + '</text>';
      });
      g.innerHTML = t;
      if (cap) cap.innerHTML = n(kin.length, 'thread', 'threads') + ' from <b>' + esc(lib.icon[id].name) + '</b> to the lives closest to them, each sharing a situation and one more thing. <a href="' + H.icon(id) + '">Open ' + esc(CLG.shortName(lib.icon[id].name)) + '</a>';
    };
    // a chosen star (a first tap, or the keys) keeps its threads, its tip and the list of its kin under the map
    var kinBox = document.getElementById('mapkin'), mcur = null, scale = function () { return svg.getBoundingClientRect().width / MW; };
    var tipAt = function (id) {
      var i = lib.icon[id], c = svg.querySelector('.hit[data-id="' + id + '"]'); if (!c) return;
      var b = host.getBoundingClientRect(), cb = c.getBoundingClientRect();
      tip.innerHTML = '<b>' + esc(i.name) + '</b>' + esc([yl(i.year), i.domainLabel, i.stories.length ? n(i.stories.length, 'story', 'stories') : 'no story yet'].filter(Boolean).join(' · '));
      tip.style.left = Math.max(70, Math.min(b.width - 70, cb.left + cb.width / 2 - b.left)) + 'px'; tip.style.top = (cb.top - b.top) + 'px'; tip.hidden = false;
    };
    var choose = function (id, how) {
      mcur = id; var g = svg.querySelector('g.curg');
      if (!id) { g.innerHTML = ''; tip.hidden = true; threads(null); if (kinBox) kinBox.innerHTML = ''; return; }
      var i = lib.icon[id], p = pos[id];
      threads(i.stories.length ? id : null); tip.hidden = true;
      g.innerHTML = '<circle class="cur" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="9"/>';
      var kin = i.stories.length ? CLN.kindred(lib, id, 12) : [];
      if (kinBox) kinBox.innerHTML = '<div class="kinhead"><h3>' + (kin.length ? 'Near ' + esc(i.name) : esc(i.name)) + '</h3><a class="btn sm" href="' + H.icon(id) + '">Open ' + esc(CLG.shortName(i.name)) + '</a></div>' +
        (kin.length ? '<ol class="kinlist">' + kin.map(function (k) { var o = lib.icon[k.id]; return '<li><a href="' + H.icon(k.id) + '"><b>' + esc(o.name) + '</b><span>' + esc([yl(o.year), CLN.short(lib, id, k.id, k.tie)].filter(Boolean).join(' · ')) + '</span></a></li>'; }).join('') + '</ol>'
          : '<p class="meta">No story yet, so no threads.</p>');
      if (cap) cap.innerHTML = '<b>' + esc(i.name) + '</b>, ' + esc([yl(i.year), i.domainLabel].filter(Boolean).join(', ')) + '. ' + (kin.length ? n(kin.length, 'life stands', 'lives stand') + ' nearest, listed below. ' : '') +
        (how === 'key' ? 'Left and right move through time, up and down change field, Enter opens.' : 'Tap again to open.');
      // keep the chosen star in view, clear of the field names
      var x = p.x * scale(), pad = sc.scrollWidth > sc.clientWidth + 4 ? 140 : 0;
      if (x < sc.scrollLeft + pad || x > sc.scrollLeft + sc.clientWidth - 24) sc.scrollLeft = x - pad - (sc.clientWidth - pad) / 2;
    };
    var rest = function () { tip.hidden = true; threads(mcur && lib.icon[mcur].stories.length ? mcur : null); };
    var show = function (e) {
      var c = e.target.closest('.hit'); if (!c) { rest(); return; }
      threads(lib.icon[c.dataset.id].stories.length ? c.dataset.id : null);
      tipAt(c.dataset.id);
    };
    svg.addEventListener('mousemove', show); svg.addEventListener('mouseleave', rest);
    var armed = null;
    svg.addEventListener('click', function (e) {
      var c = e.target.closest('.hit'), touch = matchMedia('(hover: none)').matches;
      if (!c) {
        // on a phone, a tap on a field's band names the lives of that field in view
        if (!touch || !kinBox) return;
        var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; var sp = pt.matrixTransform(svg.getScreenCTM().inverse()), f = FIELDS[Math.floor((sp.y - TOP) / BAND)];
        if (!f) return;
        var k0 = scale(), x0 = (sc.scrollLeft + 130) / k0, x1 = (sc.scrollLeft + sc.clientWidth) / k0;
        var inView = lib.icons.filter(function (i) { return i.field === f.id && pos[i.id] && pos[i.id].x >= x0 && pos[i.id].x <= x1; }).sort(function (a, b) { return a.year - b.year; });
        choose(null); armed = null;
        kinBox.innerHTML = '<div class="kinhead"><h3>' + esc(FIELD_SHORT[f.id] || f.label) + (inView.length ? ', ' + yl(inView[0].year) + ' to ' + yl(inView[inView.length - 1].year) : '') + '</h3><a class="btn sm" href="' + H.field(f.id) + '">All of ' + esc(FIELD_SHORT[f.id] || f.label) + '</a></div>' +
          (inView.length ? '<p class="fieldlives">' + inView.map(function (i) { return '<a href="' + H.icon(i.id) + '">' + esc(i.name) + '</a> ' + yl(i.year); }).join(', ') + '</p>' : '<p class="meta">No life in this stretch of years.</p>');
        return;
      }
      // on a touch screen the first tap chooses the star and the second opens it
      if (touch && armed !== c.dataset.id) { armed = c.dataset.id; choose(c.dataset.id, 'tap'); return; }
      location.hash = H.icon(c.dataset.id);
    });
    // the keys: one tab stop; left and right move through a field in time, up and down change field, Enter opens
    var rows = FIELDS.map(function (f) { return lib.icons.filter(function (i) { return i.field === f.id && pos[i.id]; }).sort(function (a, b) { return a.year - b.year || pos[a.id].x - pos[b.id].x; }).map(function (i) { return i.id; }); });
    var start = function () {
      if (mapOpts.focus && pos[mapOpts.focus]) return mapOpts.focus;
      var ids = Object.keys(key ? on : mine).filter(function (id) { return pos[id]; }).sort(function (a, b) { return lib.icon[a].year - lib.icon[b].year; });
      if (ids.length) return ids[0];
      return lib.icons.filter(function (i) { return pos[i.id]; }).sort(function (a, b) { return b.stories.length - a.stories.length || (a.id < b.id ? -1 : 1); })[0].id;
    };
    svg.addEventListener('focus', function () { if (!mcur && svg.matches(':focus-visible')) choose(start(), 'key'); });
    svg.addEventListener('keydown', function (e) {
      var k = e.key; if (!/^(ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Home|End|Enter|Escape)$/.test(k)) return;
      if (k === 'Escape') { if (mcur) { e.preventDefault(); choose(null); } return; }
      e.preventDefault();
      if (!mcur) { choose(start(), 'key'); return; }
      if (k === 'Enter') { location.hash = H.icon(mcur); return; }
      var f = fieldIx[lib.icon[mcur].field] || 0, row = rows[f], ix = row.indexOf(mcur), next = mcur;
      if (k === 'ArrowLeft') next = row[Math.max(0, ix - 1)]; else if (k === 'ArrowRight') next = row[Math.min(row.length - 1, ix + 1)];
      else if (k === 'Home') next = row[0]; else if (k === 'End') next = row[row.length - 1];
      else {
        var d = k === 'ArrowDown' ? 1 : -1, nf = f + d; while (rows[nf] && !rows[nf].length) nf += d;
        if (rows[nf]) { var y = lib.icon[mcur].year; next = rows[nf].reduce(function (b, id) { return Math.abs(lib.icon[id].year - y) < Math.abs(lib.icon[b].year - y) ? id : b; }); }
      }
      choose(next, 'key');
    });
    // the field names stay put while the map scrolls under them
    var fl = host.querySelector('.mapfields'), scrolls = sc.scrollWidth > sc.clientWidth + 4;
    host.classList.toggle('scrolls', scrolls);
    if (fl) fl.innerHTML = scrolls ? FIELDS.map(function (f, k) { return '<span style="top:' + ((TOP + k * BAND + BAND / 2) * scale() + 1).toFixed(1) + 'px">' + esc(FIELD_SHORT[f.id] || f.label) + '</span>'; }).join('') : '';
    // on a phone the map opens on the last century, or on the first year the lit situation was lived
    if (fresh && scrolls && innerWidth <= 600) {
      var ys0 = key ? Object.keys(on).filter(function (id) { return pos[id]; }).map(function (id) { return pos[id].x; }) : [];
      sc.scrollLeft = ys0.length ? Math.max(0, Math.min.apply(null, ys0) * scale() - 150) : sc.scrollWidth;
    }
  }

  // ---------- pages ----------
  function home() {
    var withStory = lib.icons.filter(function (i) { return i.stories.length; }).length;
    var h = '<h1>The library</h1><p class="lede">' + lib.stories.length + ' stories from ' + withStory + ' lives, each filed by the situation it speaks to. Start anywhere: every page leads to another.</p>';
    if (me && AS === 'member') {
      var three = me.core.map(function (id) { return CLC.iconCard(lib, lib.icon[id]); });
      h += sec('Start from your three', '<div class="grid people">' + three.map(personCard).join('') + '</div>' +
        '<div class="row" style="margin-top:16px">' + me.sits.map(function (c) { return lib.sit[c] ? sitChip(lib.sit[c]) : ''; }).join('') + '</div>',
        '<div class="row"><a class="btn sm" href="#/near">Who stands near them</a>' + (lib.members[me.id].age ? '<a class="btn sm" href="#/age">At your age</a>' : '') + '<a class="btn sm" href="' + H.member(me.id) + '">Reading for you</a></div>');
    }
    if (AS === 'coach') {
      h += sec('Prep for a member', '<div class="grid">' + lib.order.map(function (id) { return memberCard(id); }).join('') + '</div>', '<div class="row"><a class="btn sm" href="#/ask">Questions</a><a class="btn sm" href="#/checks">Source checks</a></div>');
    }
    h += sec('The constellation', mapHTML({}));
    h += sec('Start from a situation', fams());
    h += '<div style="margin-top:28px;display:flex;flex-direction:column;align-items:flex-start">' + tlink('#/situations', 'How the situations are lived together') + tlink('#/path', 'Connect two lives') + '</div>';
    var fieldLinks = FIELDS.map(function (f) {
      var k = lib.icons.filter(function (i) { return i.field === f.id; }).length;
      return '<a class="btn sm" href="' + H.field(f.id) + '">' + esc(f.label) + ' <span class="meta tabular">' + k + '</span></a>';
    }).join('');
    h += '<div class="two">' + sec('By era', eraBars()) + sec('By field', '<div class="fieldlinks">' + fieldLinks + '</div><p style="margin:18px 0 0"><a class="btn sm" href="#/people">Everyone, A to Z</a></p>') + '</div>';
    return { title: '', html: h, node: { k: 'home:', label: 'Library', href: '#/' }, after: paintMap };
  }
  function fams() {
    var by = {}; lib.situations.forEach(function (s) { (by[s.fam] = by[s.fam] || []).push(s); });
    return '<div class="fams">' + Object.keys(by).sort().map(function (f) {
      return '<div><h3><span class="code">' + esc(f) + '</span>' + esc(CLC.FAMILY[f] || '') + '</h3><ul class="list">' + by[f].map(function (s) {
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
    // a way of leading is our reading: a coach sees it marked proposed, everyone else reads it as ours
    var stance = ic.stance ? '<a href="' + H.stance(ic.stance) + '" title="' + esc(ic.stanceGloss) + '">' + esc(ic.stanceName) + '</a>' + (ic.stanceStatus === 'proposed' ? (AS === 'coach' ? ' <span class="meta">(proposed)</span>' : ' <span class="meta">as we read it</span>') : '') : '';
    var facts = [ic.desc || ic.domainLabel, ic.place, ic.born != null ? 'born ' + yl(ic.born) : ''].filter(Boolean).join(' · ');
    var h = '<div class="person" style="gap:18px;align-items:flex-start"><span class="disc lg' + (ic.stories.length ? '' : ' thin') + (mine ? ' mine' : '') + '">' + esc(ic.ini) + '</span><div style="min-width:0">' +
      '<h1>' + esc(ic.name) + '</h1><p class="meta" style="font-size:15px;margin:8px 0 0">' + esc(cap(facts)) + '</p>' +
      '<div class="row" style="margin-top:12px">' + (mine ? '<span class="badge mine">One of your three</span>' : '') + heroAction(ic) +
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
    // The ways on: the same world (their stories share words), then time, field, way of leading, a path.
    // Kindred, which needs a shared situation and one more reason, has its own section below.
    var world = CLC.kindred(lib, ic.id, 4, { mode: 'words' });
    var right = '<div class="panel well trails"><h2>Ways on</h2>';
    if (!ic.stories.length) right += '<p class="note">' + esc(ic.name) + ' has no story here yet, so there is nobody to compare. These lead on.</p>';
    if (world.length && AS !== 'member') right += '<h3 style="margin-top:14px">The same world</h3><p class="note" style="margin-top:-4px">Their stories share the words of these. A shared world, which is not the same as a shared week.</p><div style="margin-top:8px">' + world.map(function (x) { return kinRow(x, 'world'); }).join('') + '</div>';
    var ways = [];
    if (ic.year != null) ways.push(tlink(H.era(CLC.eraOf(ic.year).id), 'Their time: ' + esc(CLC.eraOf(ic.year).label.replace(/^The /, 'the '))));
    ways.push(tlink(H.field(ic.field), 'Same field: ' + esc(ic.domainLabel)));
    if (ic.stance) ways.push(tlink(H.stance(ic.stance), 'Leads the same way: ' + esc(ic.stanceName)));
    if (ic.stories.length) ways.push(tlink('#/path?from=' + enc(ic.id), 'Connect ' + esc(CLG.shortName(ic.name)) + ' to someone else'));
    right += '<div style="margin-top:22px;display:flex;flex-direction:column;align-items:flex-start">' + ways.join('') + '</div></div>';
    h += '<div class="two">' + '<div>' + left + '</div><div>' + right + '</div></div>';
    var K = kinSection(ic);
    h += K.html;
    return { title: ic.name, html: h, node: { k: 'icon:' + ic.id, label: ic.name, href: H.icon(ic.id) }, after: K.after };
  }
  // Kindred across time: a life's closest kin, each tie a shared situation and one more reason, said in
  // words. A band per shared situation with the year across (wide screens), and the same in a list.
  function kinSection(ic) {
    var kin = CLN.kindred(lib, ic.id, 12), all = CLN.kindred(lib, ic.id).length;
    if (!kin.length) return { html: ic.stories.length ? sec('Kindred', '<p class="note">Nobody in the library shares a situation with ' + esc(ic.name) + ' and one more thing yet.</p>') : '' };
    var cnt = {}; kin.forEach(function (k) { k.tie.shared.forEach(function (x) { cnt[x] = (cnt[x] || 0) + 1; }); });
    var bands = ic.keys.filter(function (k) { return cnt[k]; }).sort(function (a, b) { return cnt[b] - cnt[a] || ic.keys.indexOf(a) - ic.keys.indexOf(b); }).slice(0, 4);
    var seen = {};
    var spine = bands.map(function (key) {
      var st = lib.sitByKey[key], mem = kin.filter(function (k) { return k.tie.shared.indexOf(key) >= 0 && !seen[k.id]; });
      mem.forEach(function (k) { seen[k.id] = 1; }); if (!mem.length) return '';
      var rows = mem.map(function (k) { return { k: k, y: lib.icon[k.id].year }; }).concat([{ me: true, y: ic.year }]).sort(function (a, b) { return (a.y || 0) - (b.y || 0) || (a.me ? -1 : 1); });
      return '<h3 class="n-h"><span class="code">' + esc(st.id) + '</span>Both ' + esc(CLN.both(key)) + '</h3><ol class="spine">' + rows.map(function (r) {
        if (r.me) return '<li class="me"><span class="y">' + esc(yl(ic.year)) + '</span><span class="pt"></span><span><span class="nm">' + esc(ic.name) + '</span></span></li>';
        var i = lib.icon[r.k.id], rest = r.k.why.slice(r.k.tie.shared.length), also = r.k.tie.shared.filter(function (x) { return x !== key; });
        return '<li data-id="' + esc(r.k.id) + '"><span class="y">' + esc(yl(i.year)) + '</span><span class="pt"></span><span><a class="nm" href="' + H.icon(r.k.id) + '">' + esc(i.name) + '</a>' +
          '<div class="w">' + esc(also.map(function (x) { return 'Both ' + CLN.both(x) + '.'; }).concat(rest).join(' ')) + '</div></span></li>';
      }).join('') + '</ol>';
    }).join('');
    var lede = AS === 'member' ? n(all, 'life shares', 'lives share') + ' a situation with ' + esc(surname(ic.name)) + ' and one more thing. The closest ' + kin.length + ' sit at the year of their defining moment.'
      : 'The ' + kin.length + ' lives closest to ' + esc(ic.name) + ', of ' + all + ' who share a situation and one more thing. Each sits at the year of their defining moment.';
    // the picture earns its place only when a tie crosses more than fifty years; closer than that the list says it all
    var wide = ic.year != null && kin.some(function (k) { var y = lib.icon[k.id].year; return y != null && Math.abs(y - ic.year) > 50; });
    var html = sec('Kindred across time', '<p class="note" style="margin:-6px 0 0">' + lede + '</p>' +
      (wide ? '<div class="kinlayout"><div class="figcol"><div class="n-fig kfig graphbox" id="kfig"></div><ul class="n-key"><li><span class="ln dash"></span>' + esc(ic.name) + ', ' + esc(yl(ic.year)) + '</li></ul></div>' : '<div class="kinsolo">') +
      '<div id="spine">' + spine + '<p class="n-note">Ways of leading are proposed readings. Years are the year of each defining moment, written from recall.</p></div></div>');
    return { html: html, after: function () { var hst = document.getElementById('kfig'); if (hst) CLG.kinTime(hst, lib, ic, kin, bands, { list: 'spine' }); } };
  }
  // Others who lived this week (CLC.likeThis) and the same field (CLC.sameField): one heading names the situation,
  // each card says what sets it apart
  function likeCtx() { return { role: AS, three: me && AS === 'member' ? me.core : [] }; }
  function othersHTML(s) {
    var L = CLC.likeThis(lib, s.id, 4, likeCtx()), F = CLC.sameField(lib, s.id, 3, L.map(function (x) { return x.story.icon; })), st = lib.sitByKey[s.keys[0]];
    var head = AS === 'member' ? 'Others who lived this week' : 'Others who lived ' + (st ? st.id + ' · ' + st.chip : 'this week');
    return '<div id="others">' + sec(esc(head), '<div class="grid">' + L.map(function (x) { return storyCard(x.story, { noQuote: true, why: x.reasons[0] }); }).join('') + '</div>' +
      (F.length ? '<h3 style="margin-top:26px">In the same field</h3><div class="grid">' + F.map(function (x) { return storyCard(x.story, { noQuote: true, why: x.reasons[0], world: true }); }).join('') + '</div>' : '')) + '</div>';
  }
  // Every story of this week: the plot, with the path's numbers, and a list of the path for small screens
  // The week, quieter or closer: a 3x3 table of how directly each story was met against how close it sits to an
  // ordinary office. Each cell counts its stories, names two, and opens that slice of the answer.
  function gridHTML(key, hereId) {
    var g = CLN.grid(lib, key), st = lib.sitByKey[key], here = hereId && lib.story[hereId];
    var COLS = [['indirect', 'Indirect'], ['calibrated', 'Measured'], ['direct', 'Direct']], ROWS = [['near', 'Close to an ordinary office'], ['mid', 'Some way from one'], ['far', 'Far from one']];
    var cell = function (c) {
      var mine = here && here.reach === c.reach && here.directness === c.dir, names = c.ids.slice(0, 2).map(function (id) { var x = lib.story[id]; return esc(CLG.shortName(lib.icon[x.icon].name)) + (id === hereId ? ' <span class="here-mark">(this one)</span>' : ''); });
      if (mine && c.ids.slice(0, 2).indexOf(hereId) < 0) names[1] = esc(CLG.shortName(lib.icon[here.icon].name)) + ' <span class="here-mark">(this one)</span>';
      if (!c.n) return '<td class="none">None yet</td>';
      return '<td' + (mine ? ' class="here"' : '') + '><a href="' + esc(askUrl({ sit: st.id, dir: c.dir, reach: c.reach })) + '"><span class="n">' + n(c.n, 'story', 'stories') + '</span><span class="nm">' + names.join(', ') + '</span></a></td>';
    };
    return '<table class="wgrid"><caption>' + esc(g.sentence) + '</caption><thead><tr><td></td>' + COLS.map(function (c) { return '<th scope="col">' + c[1] + '</th>'; }).join('') + '</tr></thead><tbody>' +
      ROWS.map(function (r, ri) { return '<tr><th scope="row">' + r[1] + '</th>' + g.cells[ri].map(cell).join('') + '</tr>'; }).join('') + '</tbody></table>' +
      (g.unrated ? '<p class="note" style="margin-top:6px">' + n(g.unrated, 'story is', 'stories are') + ' not rated yet.</p>' : '');
  }
  function plotHTML(key, hereId, id) {
    var st = lib.sitByKey[key], P = CLC.readingPath(lib, key), all = (lib.byKey[key] || []).map(function (x) { return lib.story[x]; });
    return { P: P, html: '<div class="n-fig graphbox" id="' + id + '"></div><ul class="n-key"><li><span class="sw" style="background:var(--pru)"></span>Close to an ordinary office</li><li><span class="sw" style="background:var(--pru12);border:1.5px solid var(--pru)"></span>Some way from one</li><li><span class="sw" style="border:1.5px solid var(--pru)"></span>Far from one</li>' + (hereId ? '<li><span class="sw mad"></span>This story</li>' : '') + '<li><span class="sw" style="background:var(--ink)"></span>The path, in order</li></ul>' +
      '<p class="note" style="margin-top:6px">Spaced by the order of their years, so centuries apart can sit side by side.</p>',
      draw: function () { var host = document.getElementById(id); if (host) CLG.situationPlot(host, lib, all, hereId, P.map(function (x) { return x.story.id; })); } };
  }
  function pathHTML(P) {
    return '<ol class="pathsteps">' + P.map(function (x, i) {
      var I = lib.icon[x.story.icon], c = CLC.storyCard(lib, x.story);
      return '<li><span class="num" aria-hidden="true">' + (i + 1) + '</span><div><p class="sh">' + esc(x.heading) + '</p><p class="note preason">' + esc(x.reason) + '</p>' +
        '<a class="who" href="' + H.story(x.story.id) + '">' + esc(I.name) + '</a>' + (x.story.verified ? '' : ' ' + (AS === 'coach' ? '<span class="badge draft">Recall draft</span>' : '<span class="meta">Recall draft</span>')) +
        '<p class="meta" style="margin:2px 0 0">' + esc(x.story.place || yl(x.story.year)) + '</p>' + (c.pattern ? '<p class="pat">“' + esc(c.pattern) + '”</p>' : '') + '</div></li>';
    }).join('') + '</ol>';
  }
  function otherWayHTML(s) {
    var o = CLC.otherWay(lib, s.id); if (!o) return '';
    var side = function (x) { var I = lib.icon[x.icon], c = CLC.storyCard(lib, x), mv = (x.move_examples || [])[0];
      return '<div class="side"><p class="label">' + esc(cap(CLC.DIR_WORD[x.directness] || '')) + ' · ' + esc(yl(x.year)) + '</p><a class="who" href="' + H.story(x.id) + '" style="font:400 var(--t-title)/1.3 var(--serif);color:var(--ink);text-decoration:none">' + esc(I.name) + '</a>' +
        (c.pattern ? '<p class="pat" style="font:italic 400 var(--t-body)/1.5 var(--serif);color:var(--mute);margin:6px 0 0">“' + esc(c.pattern) + '”</p>' : '') + (mv ? '<p class="mv"><b>The move it suggests.</b> ' + esc(mv) + '</p>' : '') + '</div>'; };
    var A = lib.icon[s.icon], B = lib.icon[o.icon];
    // and every quieter way through the same week, for a story met head on
    var st0 = lib.sitByKey[s.keys[0]], qq = st0 && s.directness !== 'indirect' ? { than: s.icon, sit: st0.id } : null, nq = qq ? CLQ.answer(lib, qq).total : 0;
    return sec('The other way', '<p class="note" style="margin:-6px 0 14px">' + esc(A.name) + ' made ' + (s.directness === 'indirect' ? 'an ' : 'a ') + esc(CLC.DIR_WORD[s.directness]) + ' move; ' + esc(B.name) + ' ' + (o.directness === 'indirect' ? 'an ' : 'a ') + esc(CLC.DIR_WORD[o.directness]) + ' one.</p><div class="pair">' + side(s) + side(o) + '</div>' +
      (nq ? '<p style="margin-top:14px">' + tlink(askUrl(qq), 'Same week, a quieter way: ' + n(nq, 'story', 'stories')) + '</p>' : ''));
  }
  // Back into the app: a member sends a life to their coach as a hero; a coach suggests one to the member being prepped.
  function heroAction(ic) {
    if (!EMBED || !ic.stories.length) return '';
    if (AS === 'member' && me && me.core.indexOf(ic.id) < 0) return '<button class="btn sm pru" type="button" data-act="add-hero" data-id="' + esc(ic.id) + '"><i class="ph ph-plus" aria-hidden="true"></i>Add to my heroes</button>';
    if (AS === 'coach' && me) return '<button class="btn sm pru" type="button" data-act="suggest-hero" data-id="' + esc(ic.id) + '"><i class="ph ph-paper-plane-tilt" aria-hidden="true"></i>Suggest to ' + esc(me.first) + '</button>';
    return '';
  }
  function kinRow(x, kind) {
    var c = x.icon, r = x.reasons[0];
    return '<a class="kin" href="' + H.icon(c.id) + '"><span class="disc' + (c.n ? '' : ' thin') + '">' + esc(c.ini) + '</span><span style="min-width:0"><span class="nm" style="display:block">' + esc(c.name) + '</span>' +
      (r ? '<span class="why' + (kind === 'world' ? ' world' : '') + '">' + esc(r.text) + '</span>' : '') + '</span></a>';
  }
  // Draw a graph at a size that keeps its labels at 13px on screen, and redraw when the width changes.
  function drawGraph(id, build, note) {
    var host = document.getElementById(id); if (!host) return;
    var paint = function () {
      var w = Math.max(host.clientWidth || 820, 600), fs = Math.max(9, 13 * 820 / w);
      host.innerHTML = build(fs); CLG.bind(host.parentNode, { note: note });
    };
    paint(); host._paint = paint;
  }
  function workUrl(w) {
    if (w.url) return w.url;
    if (w.kind === 'book') return 'https://openlibrary.org/search?q=' + enc(w.title + ' ' + (w.by || ''));
    if (w.kind === 'audio') return 'https://open.spotify.com/search/' + enc(w.title);
    return 'https://www.imdb.com/find/?q=' + enc(w.title + (w.year ? ' ' + w.year : ''));
  }

  function storyPage(id) {
    var sid = CLC.resolve(lib, id), s = lib.story[sid]; if (!s) return missing();
    var ic = lib.icon[s.icon], t = CLC.storyTrails(lib, s.id, 4), st = CLC.STATUS[s.status] || CLC.STATUS.recall;
    var foreign = s.pattern_lang && s.pattern_lang !== 'en' && s.pattern_en, isSaved = saved.indexOf(s.id) >= 0;
    // a member or a reader sees a draft marked once, under the title; a coach sees the working panel
    var plain = AS !== 'coach', mineS = me && me.sits && s.keys.some(function (k) { return me.sits.some(function (x) { return lib.sit[x] && lib.sit[x].key === k; }); });
    var src = CLC.sourceFor(s, AS), caution = CLC.cautionFor(s, AS), why = CLC.whyFor(s, AS, mineS);
    var h = '<div class="two"><article>' +
      '<div class="row"><span class="meta">' + esc(s.place || s.era) + '</span>' + (s.verified ? badge(s) : '') + '</div>' +
      '<h1 style="margin-top:8px"><a href="' + H.icon(ic.id) + '" style="color:inherit;text-decoration:none">' + esc(ic.name) + '</a></h1>' +
      (plain && !s.verified ? '<p class="draftmark"><i class="ph ph-circle-dashed" aria-hidden="true"></i>' + esc(CLC.draftLine(AS === 'member' ? coachFirst() : '')) + '</p>' : '') +
      (s.context ? '<p class="meta" style="font-size:15px;margin:8px 0 0">' + esc(cap(s.context)) + '</p>' : '') +
      '<p class="prose">' + esc(s.moment) + '</p>' +
      (s.pattern ? '<blockquote class="quote">“' + esc(foreign ? s.pattern_en : s.pattern) + '”' + (foreign ? '<span class="orig" lang="' + esc(s.pattern_lang) + '">“' + esc(s.pattern) + '”</span>' : '') + '</blockquote>' +
        (s.by ? '<p class="meta" style="margin:8px 0 0">' + esc(s.by) + '</p>' : '') + (foreign && s.pattern_translation ? '<p class="meta" style="margin:8px 0 0">Translation: ' + esc(s.pattern_translation) + '</p>' : '') : '') +
      (src || caution || (why && AS !== 'reader') ? '<dl class="kv" style="margin-top:26px">' + (src ? '<dt>Source</dt><dd>' + esc(src) + '</dd>' : '') + (caution ? '<dt>' + (plain ? 'Context' : 'Caution') + '</dt><dd>' + esc(caution) + '</dd>' : '') +
        (why && AS !== 'reader' ? '<dt>Why it fits</dt><dd>' + esc(why) + '</dd>' : '') + '</dl>' : '') +
      '</article><aside style="padding-top:8px">';
    h += '<div class="panel">' + (plain && !s.verified ? '' : '<div class="row">' + badge(s) + '</div><p class="note" style="margin:10px 0 0">' + esc(CLC.statusLine(s, AS, coachFirst())) + '</p>') +
      (s.checked ? '<p class="note" style="margin:8px 0 0">Checked by ' + esc((lib.coaches[s.checked.by] || {}).name || s.checked.by) + ', ' + esc(when(s.checked.at)) + (s.checked.note ? ': ' + esc(s.checked.note) : '.') + '</p>' : '') +
      '<h3' + (plain && !s.verified ? '' : ' style="margin-top:18px"') + '>Filed under</h3><div class="row">' + s.keys.map(function (k) { return lib.sitByKey[k] ? sitChip(lib.sitByKey[k]) : ''; }).join('') + '</div>' +
      '<div class="row" style="margin-top:18px">' +
      '<button class="btn' + (isSaved ? ' on' : '') + '" type="button" data-act="save" data-id="' + esc(s.id) + '"><i class="' + (isSaved ? 'ph-fill' : 'ph') + ' ph-bookmark-simple"></i>' + (isSaved ? 'Saved' : 'Save') + '</button>' +
      (EMBED && me && AS === 'member' ? '<button class="btn" type="button" data-act="ask" data-id="' + esc(s.id) + '">Ask ' + esc(me.coach ? me.coach.first : 'your coach') + ' about this</button>' : '') +
      (EMBED && me && AS === 'member' && !s.verified ? (asked(s.id, me.id) ? '<span class="flash">Waiting for ' + esc(me.coach ? me.coach.first : 'your coach') + '’s check</span>'
        : '<button class="btn" type="button" data-act="check" data-id="' + esc(s.id) + '">Ask ' + esc(me.coach ? me.coach.first : 'your coach') + ' to check it</button>') : '') +
      (EMBED && AS === 'coach' ? '<button class="btn solid" type="button" data-act="send" data-id="' + esc(s.id) + '"' + (s.verified ? '' : ' disabled title="Check the source first"') + '>Send to a member</button>' : '') +
      '</div></div>';
    if (AS === 'coach') h += coachPanel(s);
    h += '</aside></div>';
    // Stories like this one, in two kinds, each saying why; then the picture; then the same situation across time.
    h += othersHTML(s);
    var stk = lib.sitByKey[s.keys[0]];
    h += sec('Every story of this week', '<div id="splot">' + gridHTML(s.keys[0], s.id) + '</div>' + (stk ? '<p class="note" style="margin-top:10px">' + tlink(H.sit(stk.id) + '?at=path', 'The situation’s path in five stories') + '</p>' : ''));
    h += otherWayHTML(s);
    if (t.moreFrom.length) h += sec('More from ' + esc(ic.name), '<div class="grid">' + t.moreFrom.map(function (c) { return storyCard(c, { noName: true }); }).join('') + '</div>');
    h += '<p style="margin-top:40px">' + tlink(H.era(t.era.id), 'Other stories from ' + esc(t.era.label.replace(/^The /, 'the '))) + '</p>';
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
    // the check is the checking coach's: the console that opened the frame says who, else the member's coach
    var coachId = lib.coaches[Q.get('by')] ? Q.get('by') : me && me.coach ? me.coach.id : 'jim';
    var h = '<div class="panel coach" style="margin-top:16px" id="check"><h2 style="font-size:21px">For the coach</h2>';
    if (s.status === 'sample-verified') { /* the status panel above says it */ }
    else if (s.verified) h += '<p class="note">Checked. It can be sent to a member now.</p><button class="btn sm" type="button" data-act="unverify" data-id="' + esc(s.id) + '">Take the check back</button>';
    else h += '<form class="form" style="margin-top:6px"><p class="note" style="margin:0">Read the story and the quotation against the source above. When both hold, mark it checked: it becomes sendable for every member.</p>' +
      '<label class="meta" for="by">Checked by</label><select id="by" name="by">' + Object.keys(lib.coaches).map(function (c) { return '<option value="' + esc(c) + '"' + (c === coachId ? ' selected' : '') + '>' + esc(lib.coaches[c].name) + '</option>'; }).join('') + '</select>' +
      '<label class="meta" for="note">What you checked it against</label><textarea id="note" name="note" placeholder="The edition, the page, the interview"></textarea>' +
      '<button class="btn pru" type="submit" data-act="verify" data-id="' + esc(s.id) + '" disabled title="Say what you checked it against first"><i class="ph ph-seal-check"></i>Mark as checked against the source</button></form>';
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
    var h = '<p class="meta" style="margin:0">' + esc(s.id + ' · ' + s.family) + '</p><h1 style="margin-top:6px">' + esc(s.chip) + '</h1><p class="lede">' + esc(s.line) + '</p>' +
      '<p class="note i" style="margin-top:10px">In a member’s words: “' + esc(s.member_line) + '”</p>';
    var splot = { P: CLC.readingPath(lib, s.key) };
    h += '<section id="path"><header><h2>A path in five stories</h2></header><p class="note" style="margin:-6px 0 14px">An order that teaches: start with the plainest case, go back in time, change worlds, see it handled the other way, then see the most at stake.</p>' + pathHTML(splot.P) + '</section>';
    h += sec('Every story of this week', '<div id="sitplot">' + gridHTML(s.key, null) + '</div>');
    h += sec('Who has lived it', mapBox() +
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
  function sitsPage() {
    var pairs = CLN.web(lib), N = lib.situations.length, two = pairs.filter(function (p) { return p.lives.length >= 2; }).length;
    return { title: 'Situations', html: '<h1>Situations</h1><p class="lede">' + N + ' situations a new leader meets, in ' + Object.keys(CLC.FAMILY).length + ' families. Every story is filed under at least one.</p>' +
      sec('Situations that travel together', '<p class="note" style="margin:-6px 0 14px">When one life has stories in two situations, the two travel together. ' + pairs.length + ' of the ' + (N * (N - 1) / 2) + ' pairs share a life, and ' + two + ' share two or more. Each row names the two it travels with most, with the lives they share' + (me && AS === 'member' ? '; yours are in red' : '') + '. Tap a situation to see who lived both.</p><div class="ladder graphbox" id="ladder"></div>') +
      sec('All situations', fams()),
      after: function () { CLG.ladder(document.getElementById('ladder'), lib, pairs, { mine: me && AS === 'member' ? me.sits : [], family: CLC.FAMILY }); } };
  }
  // Ask: a question in plain words, the reading shown and correctable, the stories that answer it.
  // ---------- asking: a question read into parts you can see and change (lib/ask.js) ----------
  // #/ask?t=<the question>&read=1 reads the words once and rewrites the address to the query it found, so an answer
  // is a link a coach can save, send or come back to. Every chip on the page can be taken away.
  function askUrl(q) { return '#/ask?' + CLQ.toQS(q); }
  function forWhom(q) { return q.m || (AS === 'member' && me ? me.id : AS === 'coach' && MID ? MID : ''); }
  // a member reads "your" where a coach reads the member's name
  function you(t) {
    if (!(AS === 'member' && me)) return t;
    var f = me.first;
    return t.replace(new RegExp('One of ' + f + '’s heroes'), 'One of your heroes').replace(new RegExp('; ' + f + ' is (\\d+)'), '; you are $1')
      .replace(new RegExp('which ' + f + ' follows'), 'which you follow').replace(new RegExp(f + '’s'), 'your');
  }
  function rsn(r) {
    var cls = r.type === 'fit' ? ' fit' : r.type === 'scene' ? ' scene' : '';
    return '<span class="rsn' + cls + '">' + esc(you(r.text)) + '</span>';
  }
  // What a coach can do now: the best checked story, ready to send, and the best draft, one check from it
  function leadHTML(a, M) {
    var who = M ? M.first : 'a member', card = function (it, kind) {
      var c = it.card, ready = kind === 'ready';
      var act = ready ? (EMBED ? '<button class="btn solid" type="button" data-act="send" data-id="' + esc(c.id) + '"' + (M ? ' data-member="' + esc(M.id) + '"' : '') + '>Send to ' + esc(who) + '</button>' : '<a class="btn" href="' + H.story(c.id) + '">Open it</a>')
        : '<a class="btn pru" href="' + H.story(c.id) + '?at=check">Check the source</a>';
      return '<div class="leadcard ' + kind + '"><p class="label">' + (ready ? 'Ready to send' : 'One check sends it') + '</p>' +
        '<h3><a href="' + H.story(c.id) + '">' + esc(c.name + ' \u00b7 ' + (c.place || yl(c.year))) + '</a></h3>' +
        '<p class="meta">' + esc(ready ? it.reasons.filter(function (r) { return r.type !== 'line' && r.type !== 'move'; }).map(function (r) { return r.text; }).slice(0, 2).join(' \u00b7 ') : 'Source: ' + (it.source || 'not given')) + '</p>' +
        (it.reasons.some(function (r) { return r.type === 'line'; }) ? '<p class="saidline">' + esc(it.reasons.filter(function (r) { return r.type === 'line'; })[0].text) + '</p>' : '') + act + '</div>';
    };
    return '<div class="lead2' + (a.ready && a.oneCheck ? '' : ' one') + '">' + (a.ready ? card(a.ready, 'ready') : '') + (a.oneCheck ? card(a.oneCheck, 'check') : '') + '</div>';
  }
  function answerCard(it) {
    var c = it.card, said = it.own.filter(function (r) { return r.type === 'line'; })[0], mv = it.own.filter(function (r) { return r.type === 'move'; })[0];
    var own = it.own.filter(function (r) { return r.type !== 'line' && r.type !== 'move'; });
    var card = '<a class="card" href="' + H.story(c.id) + '"><div class="top-line"><span class="place">' + esc(c.place || yl(c.year)) + '</span>' + cardBadge(c) + '</div>' +
      '<div class="who">' + esc(c.name) + '</div><div class="first">' + esc(c.first) + '</div>' +
      (own.length ? '<div class="rsns">' + own.map(rsn).join('') + '</div>' : '') + (mv ? '<p class="moveline">' + esc(mv.text) + '</p>' : '') + (said ? '<p class="saidline">' + esc(said.text) + '</p>' : '') + '</a>';
    if (AS !== 'coach') return card;
    var on = cmpPick().indexOf(c.id) >= 0;
    return '<div class="cardwrap">' + card + '<button class="btn sm quiet cmpbtn" type="button" data-act="cmp" data-id="' + esc(c.id) + '" aria-pressed="' + on + '">' +
      '<i class="ph ph-' + (on ? 'check-square' : 'square') + '" aria-hidden="true"></i>Compare</button></div>';
  }
  function cmpPick() { return SS.get('cl-cmp', []).filter(function (id) { return lib.story[id]; }); }
  function cmpBar(m) {
    var p = cmpPick(); if (!p.length) return '';
    return '<div class="cmpbar" role="region" aria-label="Compare"><span>' + (p.length === 1 ? 'One chosen. Choose one more to compare.' : 'Two chosen') + '</span>' +
      (p.length === 2 ? '<a class="btn sm solid" href="#/cmp?a=' + enc(p[0]) + '&b=' + enc(p[1]) + (m ? '&m=' + enc(m) : '') + '">Compare the two</a>' : '') +
      '<button class="btn sm quiet" type="button" data-act="cmp-clear">Clear</button></div>';
  }
  function sitSelect(q) {
    var by = {}; lib.situations.forEach(function (s) { (by[s.fam] = by[s.fam] || []).push(s); });
    var on = (q.sit || '').split('+');
    return '<label class="picker"><span class="sr">Change the situation</span><select id="asksit" data-q="' + esc(CLQ.toQS(CLQ.drop(q, 'sit'))) + '"><option value="">Change situation</option>' +
      Object.keys(by).sort().map(function (f) {
        return '<optgroup label="' + esc(CLC.FAMILY[f]) + '">' + by[f].map(function (s) {
          return '<option value="' + esc(s.id) + '"' + (on.indexOf(s.id) >= 0 ? ' disabled' : '') + '>' + esc(s.id + ' · ' + cap(CLQ.DID[s.id])) + ' (' + (lib.byKey[s.key] || []).length + ')</option>';
        }).join('') + '</optgroup>';
      }).join('') + '</select><i class="ph ph-caret-down" aria-hidden="true"></i></label>';
  }
  function askForm(q, placeholder) {
    return '<form id="askform" class="askform" autocomplete="off"><label class="sr" for="askq">Your question</label>' +
      '<textarea id="askq" rows="2" placeholder="' + esc(placeholder) + '">' + esc(q.t || '') + '</textarea>' +
      '<button class="btn solid" type="submit">Ask<i class="ph ph-arrow-right" aria-hidden="true"></i></button></form>';
  }
  function askPage(id, qs) {
    var q = CLQ.fromQS(qs), fresh = qs.get('read') === '1' || (qs.get('q') && !CLQ.isQuery(q));
    delete q.read;
    if (q.keys) { q.sit = q.keys.split(',').map(function (k) { return (lib.sitByKey[k] || {}).id; }).filter(Boolean).join('+'); delete q.keys; }   // the first Ask page's links
    if (q.for) { q.m = q.for; delete q.for; }
    var mid = forWhom(q);
    if (fresh && q.t) {
      // a situation in the address was chosen by someone (the member, tapping it): the reading keeps it
      var chosen = qs.get('sit'), rd = CLQ.read(lib, q.t, { m: mid }); q = rd.q;
      if (chosen && chosen.split('+').every(function (x) { return lib.sit[x]; })) { q.sit = chosen; delete q.mine; }
      history.replaceState(null, '', askUrl(q));
    }
    if (!q.m && mid && AS === 'member') q.m = mid;
    var M = lib.members[q.m] || null, coach = AS === 'coach';
    var title = coach ? 'What are you looking for' + (M ? ', for ' + M.first : '') + '?' : AS === 'member' ? 'What are you facing?' : 'What are you looking for?';
    var ph = coach ? 'She is announcing the reorg on Thursday, and the person who wanted her job will be in the room.'
      : AS === 'member' ? 'I am announcing the reorg on Thursday, and the person who wanted my job will be in the room.'
      : 'A woman who carried a decision she disagreed with';
    var h = '<h1>' + esc(title) + '</h1>' + askForm(q, ph);
    if (!CLQ.isQuery(q)) {
      // words that name no situation: say so, offer the nearest readings, and keep the shelf below
      if (q.t) {
        var rd0 = CLQ.read(lib, q.t, { m: mid });
        h += '<p class="lede" style="margin-top:18px">I could not tell the situation from this.' + (rd0.closest.length ? ' The closest three:' : ' Name the situation, or start from a question below.') + '</p>' +
          (rd0.closest.length ? '<ul class="list">' + rd0.closest.map(function (x) { return '<li><a class="rowlink" href="' + esc(askUrl(Object.assign({}, q, { sit: x.id }))) + '"><span><span class="t">' + esc(x.label) + '</span><span class="s" style="display:block">' + esc(n(x.n, 'story', 'stories')) + '</span></span></a></li>'; }).join('') + '</ul>' : '');
      }
      h += AS === 'member' ? memberStart() : shelfHTML(M ? M.id : '');
      return { title: 'Ask', html: h };
    }
    var rd2 = q.t ? CLQ.read(lib, q.t, { m: q.m }) : { alts: [], unused: [] };
    var a = CLQ.answer(lib, q, { limit: 30 });
    var chipsH = a.chips.filter(function (c) { return !(AS === 'member' && c.k === 'm'); }).map(function (c) {
      var to = askUrl(CLQ.drop(q, c.k, c.v));
      return '<a class="qchip' + (c.kind ? ' ' + c.kind : '') + '" href="' + esc(to) + '" title="Take this away">' + esc(you(c.label)) + '<i class="ph ph-x" aria-hidden="true"></i><span class="sr">, take this away</span></a>';
    }).join('');
    // what the words were read as, where the page now reads otherwise, comes first among the other readings
    var readSits = (rd2.q && rd2.q.sit ? rd2.q.sit.split('+') : []).map(function (id) { return { id: id, label: id + ' · ' + cap(CLQ.DID[id]) }; });
    var alts = readSits.concat(rd2.alts).filter(function (x, i, all) { return (q.sit || '').split('+').indexOf(x.id) < 0 && all.map(function (y) { return y.id; }).indexOf(x.id) === i; }).slice(0, 3);
    // the reading folds to one line on a phone ("Read as E1 + A2 · for Sarah · Change"); on a desktop it stays open
    var sumLine = (q.sit ? q.sit.split('+').join(' + ') : q.mine && M ? (AS === 'member' ? 'your situations' : M.first + '’s situations') : a.chips.filter(function (c) { return c.k !== 'm'; }).map(function (c) { return c.label; }).slice(0, 1).join('')) +
      (M && AS !== 'member' ? ' \u00b7 for ' + M.first : '');
    h += '<details class="readas" data-fold="1"><summary><span class="label">Read as</span> <span class="sumline">' + esc(sumLine) + '</span> <span class="change">Change</span></summary><div class="row">' + chipsH + sitSelect(q) + '</div>' +
      (alts.length ? '<p class="alts"><span class="meta">Or read it as</span>' + alts.map(function (x) { return '<a href="' + esc(askUrl(Object.assign({}, CLQ.drop(q, 'sit'), { sit: x.id }))) + '">' + esc(x.label) + '</a>'; }).join('') + '</p>' : '') +
      (rd2.unused.length ? '<p class="meta" style="margin:10px 0 0">Not used: ' + esc(rd2.unused.join(', ')) + '</p>' : '') + '</details>';
    if (coach && a.total && (a.ready || a.oneCheck)) h += leadHTML(a, M);
    if (!a.total) {
      h += '<h2 class="count">Nothing answers all of this</h2>';
    } else {
      h += '<h2 class="count">' + n(a.total, 'story', 'stories') + ' from ' + n(a.lives, 'life', 'lives') + '</h2><p class="lede" style="margin-top:6px">' + esc(a.line) + '</p>' +
        (coach ? '<p class="note">' + (a.checked ? a.checked + (a.checked === 1 ? ' is' : ' are') + ' checked against the source. The rest are' : 'None is checked against its source yet. All are') + ' recall drafts: each needs a check before it is sent.</p>' : '');
    }
    if (a.nearest.length) h += sec('Nearest answers', '<ul class="list">' + a.nearest.map(function (x) {
      return '<li><a class="rowlink" href="' + esc(askUrl(Object.assign({ t: q.t }, x.q))) + '"><span class="t">Without “' + esc(you(x.without)) + '”</span><span class="meta tabular">' + n(x.n, 'story', 'stories') + '</span></a></li>';
    }).join('') + '</ul>');
    if (a.refine.length) h += '<div class="narrow"><p class="label">Narrow</p><div class="row">' + a.refine.map(function (r) {
      var o = {}; o[r.k] = r.v; return '<a class="btn sm" href="' + esc(askUrl(Object.assign({}, q, o))) + '">' + esc(r.label) + ' <span class="meta tabular">' + r.n + '</span></a>';
    }).join('') + '</div></div>';
    if (a.items.length) h += '<div class="grid answers">' + a.items.map(answerCard).join('') + '</div>' +
      (a.total > a.items.length ? '<p class="note" style="margin-top:14px">The first ' + a.items.length + ' shown' + (M ? ', ' + (AS === 'member' ? 'yours' : M.first + '’s') + ' first' : '') + '. Narrow to see the rest.</p>' : '');
    if (coach) h += cmpBar(q.m);
    var lab = q.t || a.chips.map(function (c) { return c.label; }).join(', ');
    return { title: 'Ask: ' + lab.slice(0, 40), html: h, node: { k: 'ask:' + CLQ.toQS(q), label: 'Ask: ' + (lab.length > 28 ? lab.slice(0, 26) + '…' : lab), href: askUrl(q) } };
  }
  // the coach's shelf: the questions coaches bring, grouped, each with its live count
  function shelfHTML(mid) {
    var who = '<div class="row" style="margin-top:6px"><span class="meta">For</span>' + lib.order.map(function (id) {
      return '<a class="btn sm' + (mid === id ? ' on' : '') + '" href="' + (mid === id ? '#/ask' : '#/ask?m=' + enc(id)) + '"' + (mid === id ? ' aria-pressed="true"' : '') + '>' + esc(lib.members[id].first) + '</a>';
    }).join('') + '</div>';
    return sec('Or start from a question coaches ask', '<p class="note" style="margin:-6px 0 12px">Each count is how many stories answer the question today.</p>' + who +
      CLQ.shelf(lib, mid).map(function (g) {
        return '<h3 class="shelf-h">' + esc(g.group) + '</h3><ul class="list shelf">' + g.items.map(function (it) {
          return '<li><a class="rowlink" href="' + esc(askUrl(it.q)) + '"><span class="t">' + esc(it.text) + '</span><span class="meta tabular' + (it.n < 4 ? ' thin' : '') + '">' + n(it.n, 'story', 'stories') + '</span></a></li>';
        }).join('') + '</ul>';
      }).join('') + '<div style="margin-top:22px">' + tlink('#/gaps', 'Where the answers are thin') + '</div>');
  }
  // the member's start: their own three situations in their own words first, then every other one
  function memberStart() {
    var line = function (s) { return '<li><a class="rowlink" href="' + esc(askUrl({ t: s.member_line, sit: s.id, m: me.id })) + '"><span class="t" style="font-style:italic">“' + esc(s.member_line) + '”</span><span class="code">' + esc(s.id) + '</span></a></li>'; };
    var mine = me.sits.map(function (id) { return lib.sit[id]; }).filter(Boolean);
    var by = {}; lib.situations.forEach(function (s) { if (me.sits.indexOf(s.id) < 0) (by[s.fam] = by[s.fam] || []).push(s); });
    return sec('Which is closest to your week?', '<ul class="list">' + mine.map(line).join('') + '</ul>' +
      '<details class="more" style="margin-top:14px"><summary>None of these</summary>' + Object.keys(by).sort().map(function (f) {
        return '<h3 class="shelf-h">' + esc(CLC.FAMILY[f]) + '</h3><ul class="list">' + by[f].map(line).join('') + '</ul>';
      }).join('') + '</details>');
  }

  // Two stories side by side: what they share, then only the rows where they differ. Facts, never a verdict.
  function cmpPage(id, qs) {
    var c = CLQ.compare(lib, qs.get('a'), qs.get('b')); if (!c) return missing();
    var m = lib.members[qs.get('m')] || null, IA = lib.icon[c.a.icon], IB = lib.icon[c.b.icon];
    var col = function (s, ic) {
      var card = CLC.storyCard(lib, s), mv = (s.move_examples || [])[0];
      return '<div class="cmpcol"><p class="place">' + esc(s.place || yl(s.year)) + '</p><h3>' + esc(ic.name) + '</h3><p>' + esc(card.first) + '</p>' +
        (card.pattern ? '<p class="pat">“' + esc(card.pattern) + '”</p>' : '') +
        (mv ? '<p class="meta" style="margin-top:12px">A move it suggests</p><p>' + esc(mv) + '</p>' : '') +
        '<a class="btn sm" href="' + H.story(s.id) + '">' + (AS === 'coach' && m ? 'Check, then send to ' + esc(m.first) : 'Open the story') + '<i class="ph ph-arrow-right" aria-hidden="true"></i></a></div>';
    };
    var h = '<p class="meta" style="margin:0">Compare</p><h1 style="margin-top:6px">' + esc(IA.name) + ' and ' + esc(IB.name) + '</h1>' +
      (c.shared.length ? '<div class="row" style="margin-top:14px">' + c.shared.map(function (t) { return '<span class="rsn">' + esc(t) + '</span>'; }).join('') + '</div>' : '') +
      sec('Where they differ', c.rows.length ? '<table class="cmp"><thead><tr><th scope="col"><span class="sr">Fact</span></th><th scope="col">' + esc(IA.short || IA.name) + '</th><th scope="col">' + esc(IB.short || IB.name) + '</th></tr></thead><tbody>' +
        c.rows.map(function (r) { return '<tr><th scope="row">' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>'; }).join('') + '</tbody></table>' : '<p class="note">On every field the library keeps, these two are the same.</p>') +
      '<div class="cmpcols">' + col(c.a, IA) + col(c.b, IB) + '</div>';
    return { title: 'Compare ' + IA.name + ' and ' + IB.name, html: h, node: { k: 'cmp:' + c.a.id + ':' + c.b.id, label: 'Compare ' + (IA.short || IA.name) + ' and ' + (IB.short || IB.name), href: '#/cmp?a=' + enc(c.a.id) + '&b=' + enc(c.b.id) } };
  }

  // Where the answers are thin: the questions coaches bring that the library answers with fewer than four stories,
  // and how the situations stand on the facets coaches ask for. Coach only.
  function gapsPage() {
    if (AS !== 'coach') return missing();
    var G = CLQ.gaps(lib);
    var h = '<h1>Where the answers are thin</h1><p class="lede">The questions coaches bring that the library answers with fewer than four stories. Write and check here first.</p>';
    h += sec(n(G.length, 'thin answer', 'thin answers'), '<ul class="list">' + G.map(function (g) {
      var who = g.member ? lib.members[g.member].first + ' · ' : '';
      return '<li><a class="rowlink" href="' + esc(askUrl(g.q)) + '"><span class="t">' + esc(who + g.text) + (g.nearest ? '<span class="meta" style="display:block;margin-top:2px">Without “' + esc(g.nearest.without) + '”: ' + n(g.nearest.n, 'story', 'stories') + '</span>' : '') + '</span><span class="meta tabular thin">' + n(g.n, 'story', 'stories') + '</span></a></li>';
    }).join('') + '</ul>');
    var I = lib.icon, cols = [['Stories', function () { return true; }], ['Quieter', function (s) { return s.directness === 'calibrated' || s.directness === 'indirect'; }],
      ['Checked', function (s) { return s.verified; }], ['Before 1950', function (s) { return s.year < 1950; }], ['Women', function (s) { return I[s.icon].sex === 'f'; }],
      ['Outside the US', function (s) { return !/US/.test(I[s.icon].geo || 'US'); }], ['Close to an office', function (s) { return s.reach === 'near'; }]];
    h += sec('Each situation, by what coaches ask for', '<div class="tablewrap"><table class="cover"><thead><tr><th scope="col">Situation</th>' + cols.map(function (c) { return '<th scope="col">' + c[0] + '</th>'; }).join('') + '</tr></thead><tbody>' +
      lib.situations.map(function (s) {
        var ss = (lib.byKey[s.key] || []).map(function (id) { return lib.story[id]; }).filter(Boolean);
        return '<tr><th scope="row"><a href="' + H.sit(s.id) + '"><b>' + esc(s.id) + '</b> ' + esc(s.chip) + '</a></th>' + cols.map(function (c) { var k = ss.filter(c[1]).length; return '<td class="tabular' + (k < 3 ? ' thin' : '') + '">' + k + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div><p class="note" style="margin-top:10px">Fewer than three is marked. A quieter move exists for every situation even where quieter stories do not.</p>');
    return { title: 'Where the answers are thin', html: h, node: { k: 'gaps:', label: 'Thin answers', href: '#/gaps' } };
  }


  // From one life to another. Any two lives here are at most three situations apart, so the number of steps
  // says little: the way shown is the one with the strongest reasons at each step (CLN.route), and it does
  // not run every route through the few lives who hold six situations. Up to two other ways follow.
  function chainHTML(ids, o) {
    o = o || {};
    return '<div class="n-chain" role="list">' + ids.map(function (cid, i) {
      var I = lib.icon[cid], cls = i === 0 ? (o.firstMine ? ' mine' : ' from') : i === ids.length - 1 ? ' goal' : '';
      return (i ? '<span class="link" aria-hidden="true"><span>' + i + '</span></span>' : '') + '<a class="who" role="listitem" href="' + H.icon(cid) + '"><span class="disc' + cls + '">' + esc(I.ini) + '</span><span class="nm">' + esc(I.name) + '<small>' + esc(yl(I.year)) + '</small></span></a>';
    }).join('') + '</div>';
  }
  function stepsHTML(steps) {
    return '<ol class="n-steps">' + steps.map(function (x) {
      var w = CLN.why(lib, x.a, x.b, x.tie);
      return '<li><span><b>' + esc(lib.icon[x.a].name) + '</b> and <b>' + esc(lib.icon[x.b].name) + '</b> ' + esc(w[0].replace(/^Both /, 'both ')) + (w.length > 1 ? '<span class="ex">' + esc(w.slice(1).join(' ')) + '</span>' : '') + '</span></li>';
    }).join('') + '</ol>';
  }
  function pathPage(id, qs) {
    var from = lib.icon[qs.get('from')] || null, to = lib.icon[qs.get('to')] || null;
    var withStory = lib.icons.filter(function (i) { return i.stories.length; }).sort(function (a, b) { return CLC.fold(a.name) < CLC.fold(b.name) ? -1 : 1; });
    var h = '<h1>' + (from && to ? 'From ' + esc(from.name) + ' to ' + esc(to.name) : 'Connect two lives') + '</h1><p class="lede">Pick any two people. The library walks from one to the other, and says at each step what the two share.</p>' +
      '<form id="pathform" class="pathbar" style="margin-top:26px" autocomplete="off"><div><label for="pfrom">From</label><input id="pfrom" list="lives" value="' + esc(from ? from.name : '') + '" placeholder="Billie Jean King"></div>' +
      '<div><label for="pto">To</label><input id="pto" list="lives" value="' + esc(to ? to.name : '') + '" placeholder="Abraham Lincoln"></div>' +
      '<button class="btn solid" type="submit">Find the way</button></form><datalist id="lives">' + withStory.map(function (i) { return '<option value="' + esc(i.name) + '">'; }).join('') + '</datalist>';
    if (from && to) {
      var direct = CLN.tie(lib, from, to), rs = CLN.routes(lib, from.id, to.id, 3, { max: 4 });
      if (!from.stories.length || !to.stories.length) h += '<p class="empty" style="margin-top:26px">' + esc((from.stories.length ? to : from).name) + ' has no story in the library yet, so there is no way to walk.</p>';
      else if (!rs.length) h += '<p class="empty" style="margin-top:26px">No way within four steps where every step has two reasons.</p>';
      else {
        h += '<p class="n-sent">' + (direct ? esc(from.name) + ' and ' + esc(to.name) + ' stand side by side. ' + esc(CLN.why(lib, from, to, direct).join(' ')) : 'The strongest way takes ' + n(rs[0].length, 'step', 'steps') + '. Every step is a situation both lived, and one more thing they share.') + '</p>';
        var names = ['The strongest way', 'Another way', 'A third way'];
        rs.forEach(function (r, ri) {
          if (direct && ri === 0 && r.length === 1) return;
          h += '<section class="route"><h2>' + names[ri] + ' · ' + n(r.length, 'step', 'steps') + '</h2>' + chainHTML([from.id].concat(r.map(function (x) { return x.b; }))) + stepsHTML(r) + '</section>';
        });
        h += '<p class="n-note">Any two lives in the library are at most three situations apart, so the number of steps says little. What matters is the reason at each step.</p>';
      }
    } else {
      h += sec('Try', '<div style="display:flex;flex-direction:column;align-items:flex-start">' + [['billie-jean-king', 'abraham-lincoln'], ['rihanna', 'karl-marx'], ['barack-obama', 'jane-austen'], ['serena-williams', 'warren-buffett']]
        .filter(function (p) { return lib.icon[p[0]] && lib.icon[p[1]]; }).map(function (p) { return tlink('#/path?from=' + p[0] + '&to=' + p[1], esc(lib.icon[p[0]].name + ' to ' + lib.icon[p[1]].name)); }).join('') + '</div>');
    }
    return { title: from && to ? 'From ' + from.name + ' to ' + to.name : 'Connect two lives', html: h, node: from && to ? { k: 'path:' + from.id + ':' + to.id, label: CLG.shortName(from.name) + ' to ' + CLG.shortName(to.name), href: '#/path?from=' + enc(from.id) + '&to=' + enc(to.id) } : null };
  }

  // Your age, their age: who stood in the member's situations at about the member's age.
  function agePage(id, qs) {
    var mid = AS === 'member' && me ? me.id : AS === 'coach' ? qs.get('m') || MID : null;
    if (!mid || !lib.members[mid]) return missing();
    var m = lib.members[mid], coach = AS === 'coach', A = CLN.atAge(lib, mid, { three: AS === 'member' && me ? me.core : null });
    var title = coach ? 'At ' + m.first + '’s age' : 'At your age';
    if (!A) return { title: title, html: '<h1>' + esc(title) + '</h1><p class="lede">' + esc(m.first) + ' has not given a birth year, so there is no age to stand beside. A coach can add it to the member’s record.</p>' };
    var you = coach ? m.first + ' is ' : 'you are ', near = A.stories.slice(0, Math.max(6, A.near.length));
    var h = '<h1>' + esc(title) + '</h1><p class="lede">' + n(A.near.length, 'story', 'stories') + ' in ' + (coach ? m.first + '’s' : 'your') + ' situations happened to someone within three years of ' + A.age + '. Each dot is a story, placed at the age its person was then.</p>' +
      '<section><div class="n-fig graphbox" id="agestrip"></div><ul class="n-key"><li><span class="sw mad"></span>' + (coach ? m.first + '’s' : 'Your') + ' three</li><li><span class="sw dot"></span>A story in ' + (coach ? m.first + '’s' : 'your') + ' situations</li></ul></section>';
    h += sec('Nearest to ' + A.age, '<div class="grid">' + near.map(function (x) {
      return storyCard(CLC.storyCard(lib, x.story), { noQuote: true, why: { text: 'About ' + x.age + ' then; ' + you + A.age + (x.hero ? '. One of ' + (coach ? m.first + '’s' : 'your') + ' three' : '') } });
    }).join('') + '</div><p class="note" style="margin-top:14px">Ages are the story’s year less the year of birth, so each can be a year out. Most stories are recall drafts.</p>');
    return { title: title, html: h, node: { k: 'age:' + mid, label: title, href: '#/age' + (coach ? '?m=' + enc(mid) : '') },
      after: function () { CLG.ageStrip(document.getElementById('agestrip'), lib, A, { who: coach ? m.first : 'You' }); } };
  }

  // Who stands near a member's three: their situations as overlapping circles, the three where they stand,
  // the few lives in more than one, and for each of the three the nearest life where they have no story.
  function nearPage(id, qs) {
    var mid = AS === 'member' && me ? me.id : AS === 'coach' ? qs.get('m') || MID : null;
    if (!mid || !lib.members[mid]) return missing();
    var nb = CLN.near(lib, mid, { three: AS === 'member' && me ? me.core : null }), m = nb.member, first = m.first, coach = AS === 'coach';
    var keys = nb.keys, hs = nb.three, byId = {}; nb.lives.forEach(function (l) { byId[l.id] = l; });
    var you = coach ? first + '’s' : 'your', You = coach ? first + '’s' : 'Your', list = function (a) { return a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; };
    var outside = hs.filter(function (x) { return !byId[x] || !byId[x].held.length; });
    var parts = [], all3 = nb.lives.filter(function (l) { return l.held.length === keys.length && keys.length > 1 && !l.hero; });
    if (all3.length) parts.push('<b>' + esc(list(all3.map(function (l) { return lib.icon[l.id].name; }))) + '</b> ' + (all3.length === 1 ? 'has' : 'have') + ' stood in all ' + (keys.length === 3 ? 'three' : 'both') + ' of ' + you + ' situations.');
    hs.forEach(function (x) { var l = byId[x]; if (l && l.held.length) parts.push('<b class="mad">' + esc(lib.icon[x].name) + '</b>, one of ' + you + ' three, has stood in ' + (l.held.length === keys.length ? (keys.length === 1 ? 'it' : 'all of them') : l.held.length === 1 ? 'one' : 'two') + '.'); });
    if (outside.length) parts.push('<b class="mad">' + esc(list(outside.map(function (x) { return lib.icon[x].name; }))) + '</b> ' + (outside.length === 1 ? 'has' : 'have') + ' not stood in any of them yet.');
    var h = '<h1>Who stands near ' + (coach ? esc(first) + '’s' : 'your') + ' three</h1><p class="n-sent">' + parts.join(' ') + '</p>' +
      '<section><div class="n-fig graphbox" id="venn"></div><ul class="n-key"><li><span class="sw mad"></span>' + You + ' three</li><li><span class="sw pru"></span>Lives in more than one</li><li><span class="sw dot"></span>One life with a story here</li></ul></section>';
    var chips = function (held) { return '<div class="chipline">' + held.map(function (k) { var st = lib.sitByKey[k]; return '<span class="sit"><b>' + esc(st.id) + '</b>' + esc(st.chip) + '</span>'; }).join('') + '</div>'; };
    var closeTo = function (l) {
      if (!l.near || !l.near.h) return '';
      return '<div class="n-why">Close to ' + (coach ? '' : 'your ') + '<b>' + esc(lib.icon[l.near.h].name) + '</b>. ' + esc(CLN.nearWhy(lib, l.id, l.near.h, { w: l.near.w, t: l.near.t }).join(' ')) + '</div>';
    };
    var row = function (l, extra) { var i = lib.icon[l.id]; return '<li><a class="n-row" href="' + H.icon(l.id) + '"><span class="disc' + (l.hero ? ' mine' : '') + '">' + esc(i.ini) + '</span><span><span class="nm">' + esc(i.name) + '</span><span class="yr">' + esc(yl(i.year)) + '</span>' + (extra || '') + '</span></a></li>'; };
    var many = nb.lives.filter(function (l) { return !l.hero && l.held.length >= 2; });
    if (many.length) h += sec('Stood in more than one of ' + you + ' situations', '<ul class="n-list">' + many.map(function (l) { return row(l, chips(l.held) + closeTo(l)); }).join('') + '</ul>');
    h += sec(You + ' three', '<ul class="n-list">' + hs.map(function (hid) {
      var l = byId[hid], held = l ? l.held : [], ins = nb.standIns.filter(function (x) { return x.hero === hid; }), I = lib.icon[hid], nm = I.short || I.name;
      var x = held.length ? chips(held) : '<div class="n-why">' + (I.stories.length ? 'Not in ' + you + ' situations yet.' : 'Has no record in the library yet.') + '</div>';
      x += ins.map(function (si) {
        var st = lib.sitByKey[si.key];
        var where = '<span class="standin-sit"><b>' + esc(st.id) + '</b> ' + esc(st.chip) + '</span>';
        if (!si.id) return '<div class="standin">' + where + 'Nobody close to ' + esc(nm) + ' has a story here yet.</div>';
        return '<div class="standin">' + where + 'Nearest to ' + esc(nm) + ': <b>' + esc(lib.icon[si.id].name) + '</b>. ' + esc(CLN.nearWhy(lib, si.id, hid, si.a).join(' ')) + '</div>';
      }).join('');
      return row(l || { id: hid, hero: true }, x);
    }).join('') + '</ul>');
    keys.forEach(function (k) {
      var st = lib.sitByKey[k], inK = nb.lives.filter(function (l) { return l.held.length === 1 && l.held[0] === k && !l.hero; });
      var tops = inK.slice().sort(function (a, b) { return b.near.w - a.near.w || (a.id < b.id ? -1 : 1); }).slice(0, 4);
      var inc = nb.lives.filter(function (l) { return l.held.indexOf(k) >= 0; }), canSend = inc.filter(function (l) { return l.sendable.indexOf(k) >= 0; });
      var none = !nb.covered.filter(function (c) { return c.key === k; })[0].by.length;
      var body = (coach ? '<p class="note" style="color:var(--pru)">' + canSend.length + ' of ' + inc.length + ' lives have a story near enough to send this season.' + (none ? ' None of the three has stood here, so these weeks come from beyond them.' : '') + '</p>' : '') +
        '<ul class="n-list">' + tops.map(function (l) { return row(l, closeTo(l)); }).join('') + '</ul>' + tlink(H.sit(st.id), 'Every life in ' + esc(st.id));
      h += '<details class="more"' + (coach ? ' open' : '') + '><summary>Closest to ' + you + ' three in ' + esc(st.id) + ' · ' + esc(st.chip) + ' <span class="meta tabular">' + inK.length + '</span></summary>' + body + '</details>';
    });
    h += '<p class="n-note" style="margin-top:28px">A life counts here when it has a story filed under one of ' + you + ' situations. Ways of leading are proposed readings. Most stories are recall drafts, checked against their source before they are sent.</p>';
    return { title: 'Who stands near ' + (coach ? first + '’s' : 'your') + ' three', html: h, node: { k: 'near:' + mid, label: coach ? 'Near ' + first + '’s three' : 'Near your three', href: '#/near' + (coach ? '?m=' + enc(mid) : '') },
      after: function () { CLG.venn(document.getElementById('venn'), lib, nb, { you: you, label: You + ' ' + keys.length + ' situations as overlapping circles. ' + You + ' three, and the lives in more than one, are named. The lists below say the same in words.' }); } };
  }

  function eraPage(id) {
    var es = CLC.eras(lib), i = es.map(function (e) { return e.id; }).indexOf(id); if (i < 0) return missing();
    var e = es[i], v = CLC.eraView(lib, id), prev = es[i - 1], next = es[i + 1];
    var h = '<h1>' + esc(e.label) + '</h1><p class="lede">' + n(v.stories.length, 'story', 'stories') + ' set in these years, and ' + n(v.icons.length, 'life', 'lives') + ' whose defining moment falls here.</p>' +
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
    var h = '<h1>' + esc(f.label) + '</h1><p class="lede">' + n(ppl.length, 'life', 'lives') + ', ' + n(ppl.reduce(function (a, i) { return a + i.stories.length; }, 0), 'story', 'stories') + '.</p>';
    Object.keys(by).sort(function (a, b) { return by[b].length - by[a].length; }).forEach(function (d) {
      h += sec(esc(d), '<div class="grid people">' + by[d].sort(function (a, b) { return (a.year || 0) - (b.year || 0); }).map(function (i) { return personCard(CLC.iconCard(lib, i)); }).join('') + '</div>');
    });
    return { title: f.label, html: h, node: { k: 'field:' + id, label: f.label, href: H.field(id) } };
  }
  function stancePage(id) {
    var s = lib.stances.filter(function (x) { return x.id === id; })[0]; if (!s) return missing();
    var ppl = lib.icons.filter(function (i) { return i.stance === id; }).sort(function (a, b) { return b.stories.length - a.stories.length || (a.name < b.name ? -1 : 1); });
    var h = '<p class="meta" style="margin:0">How they lead</p><h1 style="margin-top:6px">' + esc(s.name) + '</h1><p class="lede">' + esc(s.gloss) + '</p><p class="note" style="margin-top:10px">Stances are proposed for every life until a coach rules on them. ' + n(ppl.length, 'life carries', 'lives carry') + ' this one.</p>' +
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
    var h = '<p class="meta" style="margin:0">' + (mine ? 'For you' : 'Coached by ' + esc(m.coach ? m.coach.name : '')) + '</p><h1 style="margin-top:6px">' + esc(mine ? 'Reading for ' + m.first : m.name) + '</h1>' +
      '<p class="meta" style="font-size:15px;margin:8px 0 0">' + esc(m.role + ' · ' + m.co) + '</p><p class="lede" style="font-style:italic">“' + esc(m.goal) + '”</p>' +
      '<div class="row" style="margin-top:14px">' + m.situations.map(function (s) { return sitChip(s); }).join('') + '</div>';
    if (AS === 'coach') {
      // the coach's question first, read from the member's week, answered here: ready to send, one check from it,
      // and the first three stories
      var M0 = lib.members[id], upL = M0.up19 ? String(M0.up19.label).split(' \u00b7 ').slice(1).join(' \u00b7 ') : '';
      var rq = upL ? CLQ.read(lib, upL, { m: id }).q : {}; if (!CLQ.isQuery(rq) && M0.up19) rq = { sit: M0.up19.sit, m: id };
      rq.m = id; var pa = CLQ.answer(lib, rq, { limit: 3 });
      h += sec('What is ' + esc(m.first) + ' facing this week?', askForm({ t: upL }, 'What is ' + m.first + ' facing?').replace('<form id="askform"', '<form id="askform" data-m="' + esc(id) + '"') +
        (pa.total ? leadHTML(pa, M0) + (pa.items.length ? '<div class="grid answers" style="margin-top:14px">' + pa.items.map(answerCard).join('') + '</div>' : '') +
          '<p style="margin-top:12px"><a class="btn sm" href="' + esc(askUrl(rq)) + '">All ' + pa.total + ' stories for this</a></p>' : ''));
      var wk = CLQ.shelf(lib, id)[0];
      h += sec(esc(wk.group), '<ul class="list shelf">' + wk.items.map(function (it) {
        return '<li><a class="rowlink" href="' + esc(askUrl(it.q)) + '"><span class="t">' + esc(it.text) + '</span><span class="meta tabular' + (it.n < 4 ? ' thin' : '') + '">' + n(it.n, 'story', 'stories') + '</span></a></li>';
      }).join('') + '</ul>', '<a class="btn sm" href="#/ask?m=' + enc(id) + '">Every question for ' + esc(m.first) + '</a>');
      h += '<div style="margin-top:6px">' + tlink('#/near?m=' + enc(id), 'Who stands near ' + esc(m.first) + '’s three') + (lib.members[id].age ? tlink('#/age?m=' + enc(id), 'Who stood here at ' + esc(m.first) + '’s age') : '') + '</div>';
    }
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
  // how a week's story reaches the member's three, for the coach choosing which hero to name in the note
  function reachLine(mid, s, sit) {
    var key = sit && sit.id && lib.sit[sit.id] ? lib.sit[sit.id].key : s.keys[0], b = CLN.bridge(lib, mid, s.icon, key), first = lib.members[mid].first;
    if (!b) return '<div class="meta reach">No short way from ' + esc(first) + '’s three</div>';
    var hn = lib.icon[b.hero].short || lib.icon[b.hero].name;
    if (b.own) return '<div class="meta reach mad">One of ' + esc(first) + '’s three</div>';
    var mid1 = b.steps.slice(0, -1).map(function (x) { return lib.icon[x.b].name; });
    return '<div class="meta reach" title="' + esc(b.steps.map(function (x) { return CLN.why(lib, x.a, x.b, x.tie)[0]; }).join(' ')) + '">From ' + esc(hn) + (mid1.length ? ', through ' + esc(mid1.join(' and ')) : ', next to them') + '</div>';
  }
  function season(id) {
    var paint = function (rows, source) {
      var el = document.getElementById('season'); if (!el) return;
      el.innerHTML = '<table class="season"><thead><tr><th>Week</th><th>Situation</th><th>Move</th><th>Line</th><th>Story</th></tr></thead><tbody>' + rows.map(function (w) {
        var s = w.story && lib.story[CLC.resolve(lib, w.story.id)];
        return '<tr><td class="tabular">' + w.week + '</td><td>' + (w.sit.id ? '<a href="' + H.sit(w.sit.id) + '"><span><b>' + esc(w.sit.id) + '</b> ' + esc(w.sit.chip) + '</span></a>' : esc(w.sit.chip)) + '</td>' +
          '<td><span class="t">' + esc(w.move ? w.move.behaviour : '') + '</span>' + (w.move ? '<div class="meta">' + (w.move.status === 'exemplar' ? 'Exemplar' : 'Draft') + (w.mode ? ' · ' + esc(w.mode) : '') + '</div>' : '') + '</td>' +
          '<td><span class="t" style="font-style:italic">' + esc(w.line ? w.line.message : '') + '</span></td>' +
          '<td>' + (s ? '<a href="' + H.story(s.id) + '">' + esc(lib.icon[s.icon].name) + '</a><div class="meta">' + esc(s.place || s.era) + '</div>' + reachLine(id, s, w.sit) + badge(s) : '<span class="meta">Nothing fits</span>') + '</td></tr>';
      }).join('') + '</tbody></table><p class="meta" style="margin-top:10px">' + (source === 'api' ? 'Served by the back end at /api/constellation/members/' + esc(id) + '/season.' : 'Worked out in this browser; the back end did not answer.') + '</p>';
    };
    getJSON('/api/constellation/members/' + enc(id) + '/season?weeks=8').then(function (r) { paint(r.season, 'api'); }, function () { paint(CLC.season(lib, M, id, 8), 'local'); });
  }
  function asked(sid, mid) { return ASKED.some(function (x) { return CLC.resolve(lib, x.sid) === CLC.resolve(lib, sid) && (!mid || x.mid === mid); }); }
  // The drafts members asked to have checked: the most asked first, then one that fits the asker's next situation
  function askedHTML() {
    var by = {};
    ASKED.forEach(function (x) {
      var id = CLC.resolve(lib, x.sid), s = lib.story[id], m = lib.members[x.mid]; if (!s || s.verified || !m) return;
      var e = by[id] || (by[id] = { s: s, who: [], fits: 0 });
      if (e.who.indexOf(m.first) < 0) e.who.push(m.first);
      var up = m.up19 && lib.sit[m.up19.sit]; if (up && s.keys.indexOf(up.key) >= 0) e.fits = 1;
    });
    var list = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.who.length - a.who.length || b.fits - a.fits || (a.s.id < b.s.id ? -1 : 1); });
    if (!list.length) return '';
    return sec('Members asked', '<ul class="list">' + list.map(function (e) {
      return '<li><a class="rowlink" href="' + H.story(e.s.id) + '"><span><span class="t">' + esc(lib.icon[e.s.icon].name + ', ' + (e.s.place || e.s.era)) + '</span><span class="s" style="display:block">' +
        esc(e.who.join(' and ') + ' asked' + (e.fits ? '. It fits ' + (e.who.length > 1 ? 'a' : e.who[0] + '’s') + ' next situation.' : '.')) + '</span></span></a></li>';
    }).join('') + '</ul>');
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
    h += askedHTML();
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
    var h = '<h1>Saved</h1><p class="lede">' + (APPSAVE ? 'Stories you saved, here or in the app, and trails you kept.' : 'Stories you saved and trails you kept, in this browser' + (storeKind === 'kv' ? ' and on the server' : '') + '.') + '</p>';
    h += sec('Stories', ss.length ? '<div class="grid">' + ss.map(function (c) { return storyCard(c); }).join('') + '</div>' : '<p class="empty">Nothing saved yet. Save a story from its page.</p>');
    h += sec('Trails', trails.length ? '<ul class="list">' + trails.map(function (t, i) {
      return '<li style="display:flex;gap:10px;align-items:center;padding:12px 4px"><span style="flex:1;min-width:0"><span class="t" style="font:400 17px/1.35 var(--serif);display:block">' + esc(t.name) + '</span><span class="meta">' + n(t.nodes.length, 'stop') + ' · ' + esc(when(t.at)) + ' · ' + esc(t.nodes.map(function (x) { return x.label; }).join(', ')) + '</span></span>' +
        '<button class="btn sm" type="button" data-act="open-trail" data-id="' + i + '">Walk it again</button><button class="btn sm" type="button" data-act="drop-trail" data-id="' + i + '" aria-label="Remove this trail"><i class="ph ph-x"></i></button></li>';
    }).join('') + '</ul>' : '<p class="empty">No trails kept yet. Wander for a while, then keep the trail from the bar along the top.</p>');
    return { title: 'Saved', html: h };
  }

  // for the tests and for a curious reader
  window.CLL = { get lib() { return lib; }, get trail() { return trail; }, get as() { return AS; }, get store() { return storeKind; } };
})();
