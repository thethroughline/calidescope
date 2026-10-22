/* Constellation graphs: pictures of how lives, stories and situations connect.

   Each function returns an SVG string drawn from data the core already computed (CLC.ego,
   CLC.similarStories, CLC.situationWeb), so the picture and the lists beside it can never disagree.
   Layouts are radial and deterministic: the same page always draws the same way, which a reader can
   learn and come back to. Every node is a real link (<a href>), focusable and named, with the
   reason it is there in its tooltip.

     CLG.ego(ego, o)                    a life at the centre, its situations around it, the closest lives in each
     CLG.storyHood(story, week, world)  a story with the same kind of week on the left and the same world on the right
     CLG.web(web, o)                    the 22 situations, joined by the lives that lived both
     CLG.bind(host, o)                  hover and focus: light a node's links, show its note

   Drawn into a host at its own width (these measure, so they paint and repaint themselves; host._paint):
     CLG.venn(host, lib, near, o)       a member's situations as overlapping circles, their three where they stand
     CLG.kinTime(host, lib, me, kin, bands)   kindred across time: a band per shared situation, years across
     CLG.ladder(host, lib, pairs, o)    the situations as rows, arcs between those the same lives lived

   o.fs is the font size in drawing units that renders at 13px on screen (the caller measures). */
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rad(d) { return d * Math.PI / 180; }
  function pt(cx, cy, r, a) { return [cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a))]; }
  function f1(x) { return (+x).toFixed(1); }
  // a short name for a crowded picture: the surname, without Jr. or III; the full name stays in the tooltip
  function shortName(name) {
    var w = String(name).replace(/,? (Jr\.|Sr\.|II|III|IV)$/, '').split(' ').filter(Boolean);
    if (w.length < 2) return name;
    var last = w[w.length - 1];
    if (/^(de|da|von|van|le|la|du)$/i.test(w[w.length - 2])) last = w[w.length - 2] + ' ' + last;
    return last;
  }
  function anchor(a) { var c = Math.cos(rad(a)); return c > 0.25 ? 'start' : c < -0.25 ? 'end' : 'middle'; }
  function yearLabel(y) { return y == null ? '' : y < 0 ? -y + ' BC' : String(y); }

  function ego(e, o) {
    o = o || {}; var fs = o.fs || 13, W = 820, H = 620, cx = W / 2, cy = H / 2, r1 = 128, r2 = 236;
    var sits = e.situations, k = sits.length || 1, per = k >= 5 ? 3 : 4;
    var nodes = {}, edges = [], s = '';
    sits.forEach(function (x, i) {
      var a = -90 + i * 360 / k, p = pt(cx, cy, r1, a);
      x._a = a; x._p = p;
      var people = x.people.slice(0, per), m = people.length, spread = Math.min(15, (360 / k) / (m + 0.6));
      people.forEach(function (pp, j) {
        if (nodes[pp.id]) { nodes[pp.id].links.push(x.sit.id); return; }
        var aa = a + (j - (m - 1) / 2) * spread;
        nodes[pp.id] = { c: pp, a: aa, p: pt(cx, cy, r2, aa), links: [x.sit.id], j: j };
      });
    });
    // lines first, so nodes sit on top
    sits.forEach(function (x) { s += '<line class="g-edge g-core" data-a="center" data-b="' + esc(x.sit.id) + '" x1="' + cx + '" y1="' + cy + '" x2="' + f1(x._p[0]) + '" y2="' + f1(x._p[1]) + '"/>'; });
    Object.keys(nodes).forEach(function (id) {
      var n = nodes[id];
      n.links.forEach(function (sid) {
        var x = sits.filter(function (y) { return y.sit.id === sid; })[0];
        s += '<line class="g-edge' + (n.links.length > 1 ? ' g-strong' : '') + '" data-a="' + esc(sid) + '" data-b="' + esc(id) + '" x1="' + f1(x._p[0]) + '" y1="' + f1(x._p[1]) + '" x2="' + f1(n.p[0]) + '" y2="' + f1(n.p[1]) + '"/>';
      });
    });
    sits.forEach(function (x) {
      var w = Math.max(44, fs * 2.6), h = fs * 2;
      s += '<a href="#/situation/' + esc(x.sit.id) + '" class="g-node g-sit" data-id="' + esc(x.sit.id) + '" aria-label="' + esc(x.sit.id + ' ' + x.sit.chip + ', ' + x.total + ' other lives') + '">' +
        '<title>' + esc(x.sit.id + ' · ' + x.sit.chip + ' · ' + x.total + ' other lives') + '</title>' +
        '<rect x="' + f1(x._p[0] - w / 2) + '" y="' + f1(x._p[1] - h / 2) + '" width="' + f1(w) + '" height="' + f1(h) + '" rx="' + f1(h / 2) + '"/>' +
        '<text x="' + f1(x._p[0]) + '" y="' + f1(x._p[1] + fs * 0.36) + '" text-anchor="middle" font-size="' + f1(fs) + '">' + esc(x.sit.id) + '</text></a>';
    });
    Object.keys(nodes).forEach(function (id) {
      var n = nodes[id], r = 9 + 4 * (n.links.length - 1), lp = pt(cx, cy, r2 + r + 6 + (n.j % 2) * fs * 1.1, n.a), an = anchor(n.a);
      var dy = Math.sin(rad(n.a)) > 0.5 ? fs : Math.sin(rad(n.a)) < -0.5 ? -fs * 0.2 : fs * 0.36;
      s += '<a href="#/icon/' + esc(id) + '" class="g-node g-person' + (n.links.length > 1 ? ' g-strong' : '') + '" data-id="' + esc(id) + '" aria-label="' + esc(n.c.name + ', ' + (n.links.length > 1 ? n.links.length + ' shared situations' : 'shares ' + n.links[0])) + '">' +
        '<title>' + esc(n.c.name + (n.c.year != null ? ', ' + yearLabel(n.c.year) : '') + ' · shares ' + n.links.join(', ')) + '</title>' +
        '<circle cx="' + f1(n.p[0]) + '" cy="' + f1(n.p[1]) + '" r="' + r + '"/>' +
        '<text x="' + f1(lp[0]) + '" y="' + f1(lp[1] + dy) + '" text-anchor="' + an + '" font-size="' + f1(fs) + '">' + esc(shortName(n.c.name)) + '</text></a>';
    });
    s += '<g class="g-center" data-id="center"><circle cx="' + cx + '" cy="' + cy + '" r="40"/><text x="' + cx + '" y="' + f1(cy + fs * 0.4) + '" text-anchor="middle" font-size="' + f1(fs * 1.25) + '">' + esc(e.center.ini) + '</text></g>';
    return '<svg class="graph" viewBox="0 0 ' + W + ' ' + H + '" role="group" aria-label="' + esc('The neighbourhood of ' + e.center.name + ': ' + sits.length + ' situations and the closest lives in each') + '">' + s + '</svg>';
  }

  function storyHood(center, week, world, o) {
    o = o || {}; var fs = o.fs || 13, W = 820, H = 460, cx = W / 2, cy = H / 2 + 6, s = '';
    function place(list, a0, a1, cls) {
      var max = Math.max.apply(null, list.map(function (x) { return x.score; }).concat([1e-6])), min = Math.min.apply(null, list.map(function (x) { return x.score; }).concat([max]));
      return list.map(function (x, i) {
        var t = list.length === 1 ? 0.5 : i / (list.length - 1), a = a0 + (a1 - a0) * t;
        var rr = 120 + (max === min ? 0.4 : (max - x.score) / (max - min)) * 90;
        return { x: x, a: a, p: pt(cx, cy, rr, a), cls: cls };
      });
    }
    var onLeft = {}; week.forEach(function (x) { onLeft[x.story.icon] = 1; });
    world = world.filter(function (x) { return !onLeft[x.story.icon]; });
    var L = place(week, 130, 230, 'g-week'), R = place(world, -50, 50, 'g-world'), all = L.concat(R);
    all.forEach(function (n) { s += '<line class="g-edge ' + n.cls + '" data-a="center" data-b="' + esc(n.x.story.id) + '" x1="' + cx + '" y1="' + cy + '" x2="' + f1(n.p[0]) + '" y2="' + f1(n.p[1]) + '"/>'; });
    all.forEach(function (n) {
      var c = n.x.story, lp = pt(cx, cy, 0, 0), an = anchor(n.a), off = Math.cos(rad(n.a)) >= 0 ? 16 : -16;
      lp = [n.p[0] + off, n.p[1]];
      s += '<a href="#/story/' + esc(c.id) + '" class="g-node g-story ' + n.cls + '" data-id="' + esc(c.id) + '" aria-label="' + esc(c.name + ', ' + (c.place || yearLabel(c.year)) + '. ' + n.x.reasons.map(function (r) { return r.text; }).join('. ')) + '">' +
        '<title>' + esc(c.name + ' · ' + (c.place || yearLabel(c.year)) + '\n' + n.x.reasons.map(function (r) { return r.text; }).join('\n')) + '</title>' +
        '<circle cx="' + f1(n.p[0]) + '" cy="' + f1(n.p[1]) + '" r="10"/>' +
        '<text x="' + f1(lp[0]) + '" y="' + f1(lp[1] + fs * 0.36) + '" text-anchor="' + (off > 0 ? 'start' : 'end') + '" font-size="' + f1(fs) + '">' + esc(shortName(c.name) + (c.year != null ? ' ' + yearLabel(c.year) : '')) + '</text></a>';
    });
    s += '<g class="g-center"><circle cx="' + cx + '" cy="' + cy + '" r="15"/><text class="g-label" x="' + cx + '" y="' + f1(cy + 15 + fs * 1.3) + '" text-anchor="middle" font-size="' + f1(fs) + '" style="fill:var(--ink)">' + esc(shortName(center.name) + (center.year != null ? ' ' + yearLabel(center.year) : '')) + '</text></g>' +
      '<text class="g-cap" x="' + f1(cx - 230) + '" y="' + f1(fs * 1.6) + '" text-anchor="middle" font-size="' + f1(fs) + '">The same kind of week</text>' +
      '<text class="g-cap" x="' + f1(cx + 230) + '" y="' + f1(fs * 1.6) + '" text-anchor="middle" font-size="' + f1(fs) + '">The same world</text>';
    return '<svg class="graph" viewBox="0 0 ' + W + ' ' + H + '" role="group" aria-label="' + esc('Stories near ' + center.name + ', ' + (center.place || '') + ': the same kind of week on the left, the same world on the right') + '">' + s + '</svg>';
  }

  function web(w, o) {
    o = o || {}; var fs = o.fs || 13, W = 820, H = 700, cx = W / 2, cy = H / 2, R = 250, s = '';
    var fams = []; w.nodes.forEach(function (n) { if (fams.indexOf(n.fam) < 0) fams.push(n.fam); });
    var gap = 7, step = (360 - gap * fams.length) / w.nodes.length, a = -90 + gap / 2, pos = {};
    fams.forEach(function (f) {
      var start = a;
      w.nodes.filter(function (n) { return n.fam === f; }).forEach(function (n) { pos[n.key] = { a: a + step / 2, n: n }; a += step; });
      var mid = (start + a) / 2, lp = pt(cx, cy, R + fs * 4.4, mid), p0 = pt(cx, cy, R + fs * 2.6, start + 1), p1 = pt(cx, cy, R + fs * 2.6, a - 1);
      s += '<path class="g-fam" d="M' + f1(p0[0]) + ' ' + f1(p0[1]) + ' A' + f1(R + fs * 2.6) + ' ' + f1(R + fs * 2.6) + ' 0 0 1 ' + f1(p1[0]) + ' ' + f1(p1[1]) + '"/>' +
        '<text class="g-famlabel" x="' + f1(lp[0]) + '" y="' + f1(lp[1] + fs * 0.36) + '" text-anchor="' + anchor(mid) + '" font-size="' + f1(fs) + '">' + esc(f + ' · ' + (o.family && o.family[f] || '')) + '</text>';
      a += gap;
    });
    // Most pairs share one life; drawing them all makes a hairball. Pairs lived by three or more show;
    // the rest appear when their situation is hovered or focused.
    var max = Math.max.apply(null, w.links.map(function (l) { return l.lives; }).concat([1])), strong = o.strong || 3, company = {};
    w.links.forEach(function (l) { [[l.a, l.b], [l.b, l.a]].forEach(function (p) { (company[p[0]] = company[p[0]] || []).push({ k: p[1], n: l.lives }); }); });
    w.links.forEach(function (l) {
      var A = pos[l.a], B = pos[l.b]; if (!A || !B) return;
      var p = pt(cx, cy, R, A.a), q = pt(cx, cy, R, B.a), wt = l.lives;
      s += '<path class="g-edge g-chord' + (l.lives < strong ? ' g-weak' : '') + '" data-a="' + esc(A.n.id) + '" data-b="' + esc(B.n.id) + '" d="M' + f1(p[0]) + ' ' + f1(p[1]) + ' Q' + cx + ' ' + cy + ' ' + f1(q[0]) + ' ' + f1(q[1]) + '" stroke-width="' + f1(1 + 6 * wt / max) + '"><title>' + esc(A.n.id + ' and ' + B.n.id + ': ' + l.lives + ' lives lived both' + (l.stories ? ', ' + l.stories + ' stories are filed under both' : '')) + '</title></path>';
    });
    w.nodes.forEach(function (n) {
      var P = pos[n.key], p = pt(cx, cy, R, P.a), lp = pt(cx, cy, R + 14, P.a), r = 4 + Math.sqrt(n.stories) * 1.15;
      var top = (company[n.key] || []).sort(function (a, b) { return b.n - a.n; }).slice(0, 3).filter(function (c) { return c.n > 1; });
      var withTxt = top.length ? ' · lived most often with ' + top.map(function (c) { return (pos[c.k] ? pos[c.k].n.id : c.k) + ' (' + c.n + ')'; }).join(', ') : '';
      s += '<a href="#/situation/' + esc(n.id) + '" class="g-node g-sit2" data-id="' + esc(n.id) + '" aria-label="' + esc(n.id + ' ' + n.chip + ': ' + n.stories + ' stories, ' + n.lives + ' lives' + withTxt) + '">' +
        '<title>' + esc(n.id + ' · ' + n.chip + withTxt) + '</title>' +
        '<circle cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="' + f1(r) + '"/>' +
        '<text x="' + f1(lp[0]) + '" y="' + f1(lp[1] + fs * 0.36) + '" text-anchor="' + anchor(P.a) + '" font-size="' + f1(fs) + '">' + esc(n.id) + '</text></a>';
    });
    return '<svg class="graph" viewBox="0 0 ' + W + ' ' + H + '" role="group" aria-label="The 22 situations, joined where the same lives lived both">' + s + '</svg>';
  }

  // Hover or focus a node: its own links light, the rest fade, and the note line says what it is.
  function bind(host, o) {
    o = o || {}; var svg = host.querySelector('svg'); if (!svg) return;
    var note = o.note ? host.querySelector(o.note) : null, rest = note ? note.innerHTML : '';
    function on(id, label) {
      svg.classList.add('g-focus');
      svg.querySelectorAll('.g-edge').forEach(function (e) { e.classList.toggle('g-hot', e.dataset.a === id || e.dataset.b === id); });
      svg.querySelectorAll('.g-node').forEach(function (n) { n.classList.toggle('g-hot', n.dataset.id === id); });
      if (note && label) note.textContent = label;
    }
    function off() { svg.classList.remove('g-focus'); svg.querySelectorAll('.g-hot').forEach(function (e) { e.classList.remove('g-hot'); }); if (note) note.innerHTML = rest; }
    svg.querySelectorAll('.g-node').forEach(function (n) {
      var label = (n.querySelector('title') || {}).textContent || '';
      n.addEventListener('mouseenter', function () { on(n.dataset.id, label.replace(/\n/g, ' · ')); });
      n.addEventListener('focus', function () { on(n.dataset.id, label.replace(/\n/g, ' · ')); });
      n.addEventListener('mouseleave', off); n.addEventListener('blur', off);
    });
  }

  // ---------- a member's situations as overlapping circles (CLN.near) ----------
  // Equal circles, labelled outside. The three sit in madder where they stand; any of them outside every
  // circle waits in a corner with a dashed ring. Lives in two or more circles are named; every other life
  // is a dot packed towards the outer edge of its own circle. Every position means something.
  var cv = null;
  function measure(text, font) { cv = cv || document.createElement('canvas').getContext('2d'); cv.font = font; return cv.measureText(text).width; }
  function wrap(text, px, max) { var w = text.split(' '), out = [], cur = ''; w.forEach(function (x) { var t = cur ? cur + ' ' + x : x; if (measure(t, '500 ' + px + 'px "IBM Plex Sans", system-ui, sans-serif') > max && cur) { out.push(cur); cur = x; } else cur = t; }); if (cur) out.push(cur); return out; }
  function venn(host, lib, nb, o) {
    o = o || {};
    var keys = nb.keys, k = keys.length, hs = nb.three, byId = {}, you = o.you || 'your', href = o.href || function (id) { return '#/icon/' + encodeURIComponent(id); };
    nb.lives.forEach(function (l) { byId[l.id] = l; });
    var named = nb.lives.filter(function (l) { return l.hero || l.held.length >= 2; }), outside = hs.filter(function (h) { return !byId[h] || !byId[h].held.length; });
    var paint = function () {
      var W = Math.min(host.clientWidth || 820, 820); if (!k) { host.innerHTML = ''; return; }
      var px = 14, lh = 19, narrow = W < 520;
      var R = k === 3 ? Math.min(165, (W - 24) / 3.14) : k === 2 ? Math.min(170, (W - 24) / 3.3) : Math.min(170, W / 2 - 20), d = R * (k === 3 ? 1.14 : 1.2);
      var half = W / 2 - 18, labW = keys.map(function (key, i) { return k === 3 ? (i === 0 ? Math.min(320, W - 24) : Math.min(half, 260)) : k === 2 ? Math.min(half, 260) : Math.min(320, W - 24); });
      var labs = keys.map(function (key, i) { var st = lib.sitByKey[key]; return wrap(st.id + ' ' + st.chip, px, labW[i]); });
      var topPad = (k === 3 ? labs[0].length : Math.max.apply(null, labs.map(function (l) { return l.length; }))) * lh + 30, C;
      if (k === 3) C = [{ x: W / 2, y: topPad + R }, { x: W / 2 - d / 2, y: topPad + R + d * 0.866 }, { x: W / 2 + d / 2, y: topPad + R + d * 0.866 }];
      else if (k === 2) C = [{ x: W / 2 - d / 2, y: topPad + R }, { x: W / 2 + d / 2, y: topPad + R }];
      else C = [{ x: W / 2, y: topPad + R }];
      var bottomLab = k === 3 ? (Math.max(labs[1].length, labs[2].length) + 1) * lh + 26 : 0;
      var Hh = Math.max.apply(null, C.map(function (c) { return c.y + R; })) + bottomLab + 18;
      var gc = { x: C.reduce(function (a, c) { return a + c.x; }, 0) / k, y: C.reduce(function (a, c) { return a + c.y; }, 0) / k };
      // the regions, sampled on a hex grid
      var step = 9, M = 7, reg = {}, row = 0;
      for (var y = 0; y < Hh; y += step * 0.866, row++) for (var x = (row % 2) * step / 2; x < W; x += step) {
        var sig = [], amb = false;
        C.forEach(function (c, i) { var dd = Math.hypot(x - c.x, y - c.y); if (dd < R - M) sig.push(i); else if (dd < R + M) amb = true; });
        if (amb || !sig.length) continue;
        (reg[sig.join('')] = reg[sig.join('')] || []).push({ x: x, y: y });
      }
      var s = '';
      C.forEach(function (c, i) { s += '<circle class="n-set" data-k="' + i + '" cx="' + f1(c.x) + '" cy="' + f1(c.y) + '" r="' + f1(R) + '"/>'; });
      keys.forEach(function (key, i) {
        var st = lib.sitByKey[key], c = C[i], below = k === 3 && i > 0, lines = labs[i], n = (lib.iconsByKey[key] || []).length, x0 = c.x, an = 'middle';
        if ((k === 3 && i > 0) || k === 2) { var left = k === 3 ? i === 1 : i === 0; an = left ? 'end' : 'start'; x0 = left ? W / 2 - 12 : W / 2 + 12; if (!narrow) x0 = left ? c.x + R * 0.25 : c.x - R * 0.25; }
        var y0 = below ? c.y + R + 24 : c.y - R - 14 - (lines.length - 1) * lh;
        if (k === 2) y0 = topPad - 14 - (lines.length - 1) * lh;
        lines.forEach(function (ln, j) {
          s += '<text x="' + f1(x0) + '" y="' + f1(y0 + j * lh) + '" text-anchor="' + an + '" font-size="' + px + '" font-weight="500">' + (j === 0 ? '<tspan class="t-pru">' + esc(st.id) + ' </tspan>' + esc(ln.slice(st.id.length + 1)) : esc(ln)) + '</text>';
        });
        s += '<text class="t-mute" x="' + f1(x0) + '" y="' + f1(below ? y0 + lines.length * lh : y0 - lh) + '" text-anchor="' + an + '" font-size="13">' + n + ' lives</text>';
      });
      var outN = '';
      outside.forEach(function (hid, j) {
        var i = lib.icon[hid], x = j % 2 === 0 ? 30 : W - 30, y = (k === 3 ? topPad + R * 0.35 : topPad + 2 * R + 46) + Math.floor(j / 2) * 70;
        if (k !== 3) x = W / 2 + (j - (outside.length - 1) / 2) * 110;
        outN += '<a class="n-node n-hero out" href="' + esc(href(hid)) + '" aria-label="' + esc(i.name + ', one of ' + you + ' three, with no story in these situations yet') + '" data-tip="' + esc(i.name + '|One of ' + you + ' three. No story in these situations yet.') + '">' +
          '<circle class="d" cx="' + x + '" cy="' + f1(y) + '" r="15" stroke-dasharray="3 3"/><text class="i" x="' + x + '" y="' + f1(y + 4.5) + '" text-anchor="middle" font-size="12">' + esc(i.ini) + '</text>' +
          '<text x="' + x + '" y="' + f1(y + 32) + '" text-anchor="middle" font-size="13">' + esc(i.short || shortName(i.name)) + '</text></a>';
      });
      if (k !== 3 && outside.length) Hh += 80;
      var boxes = [], nodes = '', groups = {}, lw = function (t) { return measure(t, '400 13px "IBM Plex Sans", system-ui, sans-serif'); };
      named.forEach(function (l) { var sg = l.held.map(function (kk) { return keys.indexOf(kk); }).sort().join(''); if (!sg) return; (groups[sg] = groups[sg] || []).push(l); });
      Object.keys(groups).forEach(function (sg) {
        var pts = reg[sg] || []; if (!pts.length) return;
        var cx = 0, cy = 0; pts.forEach(function (p) { cx += p.x; cy += p.y; }); cx /= pts.length; cy /= pts.length;
        var ax = { x: 1, y: 0 };
        if (sg.length === 2) { var A = C[+sg[0]], B = C[+sg[1]], dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy); ax = { x: -dy / L, y: dx / L }; if (ax.y < 0) ax = { x: -ax.x, y: -ax.y }; }
        if (sg.length === 3) ax = { x: 0, y: 1 };
        var list = groups[sg].slice().sort(function (p, q) { return q.hero - p.hero; }), shown = list.slice(0, 2), more = list.length - shown.length;
        var labels = shown.map(function (l) { var i = lib.icon[l.id]; return l.hero ? (i.short || shortName(i.name)) : shortName(i.name); });
        var sp = Math.abs(ax.y) > 0.5 ? 58 : Math.max(64, Math.max.apply(null, labels.map(lw)) + 14);
        shown.forEach(function (l, j) {
          var off = (j - (shown.length - 1) / 2) * sp, want = { x: cx + ax.x * off, y: cy + ax.y * off };
          var p = pts.slice().sort(function (u, v) { return Math.hypot(u.x - want.x, u.y - want.y) - Math.hypot(v.x - want.x, v.y - want.y); })[0];
          var i = lib.icon[l.id], cls = l.hero ? 'n-hero' : 'n-life', nm = labels[j], hw = Math.max(18, lw(nm) / 2) + 4;
          boxes.push({ x0: p.x - hw, x1: p.x + hw, y0: p.y - 20, y1: p.y + 38 });
          var why = l.held.map(function (kk) { return lib.sitByKey[kk].id; }).join(', ');
          nodes += '<a class="n-node ' + cls + '" href="' + esc(href(l.id)) + '" data-id="' + esc(l.id) + '" aria-label="' + esc(i.name + (l.hero ? ', one of ' + you + ' three' : '') + ', has stood in ' + why) + '" data-tip="' + esc(i.name + '|' + (l.hero ? 'One of ' + you + ' three. ' : '') + 'Stood in ' + why + '.') + '">' +
            '<circle class="hit" cx="' + f1(p.x) + '" cy="' + f1(p.y + 8) + '" r="24" fill="transparent"/>' +
            '<circle class="d" cx="' + f1(p.x) + '" cy="' + f1(p.y) + '" r="15"/><text class="i" x="' + f1(p.x) + '" y="' + f1(p.y + 4.5) + '" text-anchor="middle" font-size="12">' + esc(i.ini) + '</text>' +
            '<text x="' + f1(p.x) + '" y="' + f1(p.y + 33) + '" text-anchor="middle" font-size="13">' + esc(nm) + '</text></a>';
          if (j === shown.length - 1 && more > 0) nodes += '<text class="t-mute" x="' + f1(p.x + hw + 4) + '" y="' + f1(p.y + 5) + '" font-size="13">+' + more + '</text>';
        });
      });
      keys.forEach(function (key, i) {
        var rest = nb.lives.filter(function (l) { return l.held.length === 1 && l.held[0] === key && !l.hero; });
        var dd = Math.hypot(C[i].x - gc.x, C[i].y - gc.y) || 1, u = k === 1 ? { x: 0, y: 1 } : { x: (C[i].x - gc.x) / dd, y: (C[i].y - gc.y) / dd };
        var pole = { x: C[i].x + u.x * R * 0.5, y: C[i].y + u.y * R * 0.5 };
        var pts = (reg[String(i)] || []).filter(function (p) { return boxes.every(function (b) { return p.x < b.x0 - 3 || p.x > b.x1 + 3 || p.y < b.y0 - 3 || p.y > b.y1 + 3; }); })
          .sort(function (a, b) { return Math.hypot(a.x - pole.x, a.y - pole.y) - Math.hypot(b.x - pole.x, b.y - pole.y); });
        rest.forEach(function (l, j) { var p = pts[j]; if (!p) return; s += '<circle class="n-dot' + (l.sendable.length ? ' send' : '') + '" cx="' + f1(p.x) + '" cy="' + f1(p.y) + '" r="3.2"><title>' + esc(lib.icon[l.id].name) + '</title></circle>'; });
      });
      host.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + Math.round(Hh) + '" width="' + W + '" height="' + Math.round(Hh) + '" style="max-width:' + W + 'px;margin:0 auto" role="img" aria-label="' + esc(o.label || 'The situations as overlapping circles. The list below says the same in words.') + '">' + s + nodes + outN + '</svg><div class="venn-tip" hidden></div>';
      var tip = host.querySelector('.venn-tip');
      host.querySelectorAll('a.n-node').forEach(function (a) {
        function show() { var t = a.dataset.tip.split('|'), b = host.getBoundingClientRect(), r = a.querySelector('circle.d').getBoundingClientRect(); tip.innerHTML = '<b>' + esc(t[0]) + '</b>' + esc(t[1]); tip.style.left = (r.left + r.width / 2 - b.left) + 'px'; tip.style.top = (r.top - b.top) + 'px'; tip.hidden = false; }
        a.addEventListener('mouseenter', show); a.addEventListener('focus', show);
        a.addEventListener('mouseleave', function () { tip.hidden = true; }); a.addEventListener('blur', function () { tip.hidden = true; });
      });
    };
    paint(); host._paint = paint;
  }

  // ---------- kindred across time (CLN.kindred) ----------
  // A band for each situation the life shares with its kin, the year across on the map's own scale (early
  // centuries pressed together, the last 125 years open). Filled dots have three reasons or more.
  function kinTime(host, lib, me, kin, bands, o) {
    o = o || {}; var href = o.href || function (id) { return '#/icon/' + encodeURIComponent(id); };
    var strong = function (k) { return k.tie.shared.length > 1 || k.tie.reasons.length >= 2; };
    var paint = function () {
      var W = host.clientWidth; if (!W) return;
      var L = 16, TOP = 54, fs = 13, LANE = 28, HEAD = 34;
      var ys = kin.map(function (k) { return lib.icon[k.id].year; }).concat([me.year]).filter(function (y) { return y != null; });
      var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
      var t = function (y) { return y < 1700 ? 0.07 * Math.max(0, y + 600) / 2300 : y < 1900 ? 0.07 + 0.15 * (y - 1700) / 200 : 0.22 + 0.78 * Math.min(1, (y - 1900) / 126); };
      var t0 = t(y0) - 0.02, t1 = Math.min(1, t(y1) + 0.02);
      var X = function (y) { return L + 8 + (W - L - 120) * (t(y) - t0) / ((t1 - t0) || 1); };
      var order = kin.slice().sort(function (a, b) { return lib.icon[a.id].year - lib.icon[b.id].year; }), lanes = bands.map(function () { return []; }), at = {};
      order.forEach(function (k) {
        var i = lib.icon[k.id], x = X(i.year), w = measure(shortName(i.name), '400 13px "IBM Plex Sans", system-ui, sans-serif') + 22;
        k.tie.shared.forEach(function (key) {
          var b = bands.indexOf(key); if (b < 0) return;
          var L2 = lanes[b], j = 0; while (L2[j] && !L2[j].every(function (r) { return x > r[1] + 4 || x + w < r[0] - 4; })) j++;
          (L2[j] = L2[j] || []).push([x - 8, x + w]); at[k.id + '|' + key] = j;
        });
      });
      var bandTop = [], yy0 = TOP;
      bands.forEach(function (key, b) { bandTop[b] = yy0; yy0 += HEAD + Math.max(1, lanes[b].length) * LANE + 10; });
      var Hh = yy0 + 34, s = '';
      bands.forEach(function (key, b) { if (b % 2 === 0) s += '<rect class="kband" x="0" y="' + bandTop[b] + '" width="' + W + '" height="' + (HEAD + Math.max(1, lanes[b].length) * LANE + 10) + '" rx="10"/>'; });
      var last = -1e9;
      [-500, 1500, 1700, 1800, 1850, 1900, 1925, 1950, 1975, 2000, 2025].forEach(function (yy) {
        if (yy < y0 - 30 || yy > y1 + 10) return; var x = X(yy); if (x - last < 56 || x > W - 30) return; last = x;
        s += '<line class="ktick" x1="' + f1(x) + '" x2="' + f1(x) + '" y1="' + TOP + '" y2="' + (Hh - 26) + '"/><text class="t-mute" x="' + f1(x) + '" y="' + (Hh - 8) + '" text-anchor="middle" font-size="' + fs + '">' + yearLabel(yy) + '</text>';
      });
      var labelsTxt = bands.map(function (key, b) { var st = lib.sitByKey[key]; return '<text class="kbandlabel" x="' + L + '" y="' + (bandTop[b] + 21) + '" font-size="' + fs + '"><tspan class="t-pru">' + esc(st.id) + ' </tspan>' + esc(st.chip) + '</text>'; }).join('');
      var mx = X(me.year);
      s += '<line class="kme" x1="' + f1(mx) + '" x2="' + f1(mx) + '" y1="' + (TOP - 12) + '" y2="' + (Hh - 26) + '"/><text x="' + f1(Math.max(90, Math.min(W - 90, mx))) + '" y="' + (TOP - 20) + '" text-anchor="middle" font-size="14" font-weight="500">' + esc(me.name) + ', ' + yearLabel(me.year) + '</text>';
      var nodes = '', joins = '';
      order.forEach(function (k) {
        var i = lib.icon[k.id], x = X(i.year), nm = shortName(i.name), pts = [];
        k.tie.shared.forEach(function (key) {
          var b = bands.indexOf(key); if (b < 0) return;
          var y = bandTop[b] + HEAD + 12 + at[k.id + '|' + key] * LANE; pts.push(y);
          nodes += '<a class="kn" href="' + esc(href(k.id)) + '" data-id="' + esc(k.id) + '" aria-label="' + esc(i.name + ', ' + yearLabel(i.year) + '. ' + k.why.join(' ')) + '"><title>' + esc(i.name + ', ' + yearLabel(i.year) + '\n' + k.why.join('\n')) + '</title>' +
            '<circle cx="' + f1(x) + '" cy="' + y + '" r="16" fill="transparent"/><circle class="kdot' + (strong(k) ? '' : ' weak') + '" cx="' + f1(x) + '" cy="' + y + '" r="6.5"/>' +
            '<text x="' + f1(x + 11) + '" y="' + (y + 4.5) + '" font-size="' + fs + '">' + esc(nm) + '</text></a>';
        });
        if (pts.length > 1) joins += '<line class="kjoin" x1="' + f1(x) + '" x2="' + f1(x) + '" y1="' + Math.min.apply(null, pts) + '" y2="' + Math.max.apply(null, pts) + '"/>';
      });
      host.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" width="' + W + '" height="' + Hh + '" role="img" aria-label="' + esc('The lives closest to ' + me.name + ', in a band for each situation they share, placed by year. The list says the same in words.') + '">' + s + joins + labelsTxt + nodes + '</svg>';
      var list = o.list ? document.getElementById(o.list) : null;
      host.querySelectorAll('a.kn').forEach(function (a) {
        var id = a.dataset.id, row = list ? list.querySelector('li[data-id="' + id + '"]') : null;
        function on() { host.classList.add('focus'); host.querySelectorAll('a.kn').forEach(function (b) { b.classList.toggle('hot', b.dataset.id === id); }); if (row) row.classList.add('hot'); }
        function off() { host.classList.remove('focus'); host.querySelectorAll('a.kn.hot').forEach(function (b) { b.classList.remove('hot'); }); if (row) row.classList.remove('hot'); }
        a.addEventListener('mouseenter', on); a.addEventListener('focus', on); a.addEventListener('mouseleave', off); a.addEventListener('blur', off);
      });
    };
    paint(); host._paint = paint;
  }

  // ---------- situations that travel together (CLN.web) ----------
  // The situations as rows in family order, full words, never rotated. Arcs in a narrow gutter join two
  // rows when the same lives lived both; by default only pairs three or more lives share, and a
  // member's own pairs in madder. Tapping a row lights its arcs and says who lived both.
  function ladder(host, lib, pairs, o) {
    o = o || {}; var mine = o.mine || [], on = null, list = function (a) { return a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; };
    var fam = '', h = '<svg class="arcs" aria-hidden="true"></svg><ul class="rows">';
    lib.situations.forEach(function (s) {
      if (s.fam !== fam) { fam = s.fam; h += '<li class="fam">' + esc(s.fam + ' · ' + (o.family ? o.family[s.fam] : '')) + '</li>'; }
      h += '<li data-id="' + esc(s.id) + '" class="' + (mine.indexOf(s.id) >= 0 ? 'mine' : '') + '"><button type="button" aria-expanded="false"><span class="c">' + esc(s.id) + '</span><span>' + esc(s.chip) + '</span><span class="n">' + n(s.icons.length) + '</span></button></li>';
    });
    function n(k) { return k + (k === 1 ? ' life' : ' lives'); }
    host.innerHTML = h + '</ul>';
    var svg = host.querySelector('svg.arcs'), rows = host.querySelector('.rows');
    function centre(id) { var b = rows.querySelector('li[data-id="' + id + '"] button'), hb = host.getBoundingClientRect(), r = b.getBoundingClientRect(); return r.top - hb.top + r.height / 2; }
    var paint = function () {
      var G = 96, s = '';
      svg.setAttribute('width', G); svg.setAttribute('height', host.clientHeight);
      pairs.forEach(function (p) {
        var hot = on && (p.a === on || p.b === on), mn = mine.indexOf(p.a) >= 0 && mine.indexOf(p.b) >= 0;
        if (p.lives.length < 3 && !hot && !mn) return;
        var y1 = centre(p.a), y2 = centre(p.b), span = Math.abs(y2 - y1), bulge = Math.min(G - 8, 10 + Math.sqrt(span) * 2.6);
        s += '<path class="arc' + (hot ? ' hot' : '') + (mn ? ' mine' : '') + '" stroke-width="' + f1(1 + 1.6 * (p.lives.length - 1)) + '" d="M' + G + ' ' + f1(y1) + ' C' + f1(G - bulge * 1.3) + ' ' + f1(y1) + ' ' + f1(G - bulge * 1.3) + ' ' + f1(y2) + ' ' + G + ' ' + f1(y2) + '"/>';
      });
      svg.innerHTML = s; host.classList.toggle('focus', !!on);
    };
    rows.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return; var li = b.parentNode, id = li.dataset.id;
      rows.querySelectorAll('.pane').forEach(function (x) { x.remove(); }); rows.querySelectorAll('li.on').forEach(function (x) { x.classList.remove('on'); x.querySelector('button').setAttribute('aria-expanded', 'false'); });
      if (on === id) { on = null; paint(); return; }
      on = id; li.classList.add('on'); b.setAttribute('aria-expanded', 'true');
      var its = pairs.filter(function (p) { return p.a === id || p.b === id; });
      li.insertAdjacentHTML('beforeend', '<div class="pane">' + (its.length ? its.slice(0, 6).map(function (p) {
        var other = lib.sit[p.a === id ? p.b : p.a];
        return '<p><a href="#/situation/' + esc(other.id) + '"><b>' + esc(other.id) + '</b> ' + esc(other.chip) + '</a>: ' + list(p.lives.map(function (x) { return '<a href="#/icon/' + esc(x) + '">' + esc(lib.icon[x].name) + '</a>'; })) + '</p>';
      }).join('') + (its.length > 6 ? '<p>And ' + (its.length - 6) + ' more situations.</p>' : '') + '<p><a href="#/situation/' + esc(id) + '">Open ' + esc(id) + '</a></p>' : 'No life in the library has a story here and in another situation yet.') + '</div>');
      paint();
    });
    paint(); host._paint = paint;
    if (o.open) { var ob = rows.querySelector('li[data-id="' + o.open + '"] button'); if (ob) ob.click(); }
  }

  window.CLG = { ego: ego, storyHood: storyHood, web: web, bind: bind, shortName: shortName, venn: venn, kinTime: kinTime, ladder: ladder };
})();
