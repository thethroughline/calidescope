/* Calidescope — the card grid. A plain-JavaScript port of the design's logic
   class: 9 rows × 5 columns, one card per viewport, no page scroll.
   Down moves through the story, right moves through one situation's beats.
   This file is inlined into index.html by transplant.py; it is kept here
   so the logic can be read on its own. */
(function () {
  'use strict';

  var NAME  = ['Calidescope', 'Positioning', 'Collateral', 'Presence', 'Enablement', 'Workflow', 'Proof', 'Throughline', 'Contact'];
  var BEAT  = ['Backward', 'Situation', 'Result', 'Solution', 'In action'];
  var MAXC  = [1, 4, 4, 4, 4, 4, 4, 4, 3];
  var NROWS = 9;
  var EASE  = 'cubic-bezier(.22,.61,.16,1)';
  var TINT  = ['#1F2024', '#1E40FF', '#1E40FF', '#7A3AD2', '#7A3AD2', '#7A3AD2', '#E933A6', '#1E40FF', '#1E40FF'];

  var q = function (s) { return document.querySelector(s); };
  var stage = q('[data-stage]'), grid = q('[data-grid]'), dialog = q('[data-menudialog]');
  if (!stage || !grid) return;

  var row = 0, col = 1, W = 0, H = 0, moved = false, menuOpen = false, tries = 0;

  function minCol(r) { return r === 0 ? 1 : 0; }
  function maxCol(r) { return MAXC[r]; }
  function settle() { grid.style.transform = 'translate3d(' + (-col * W) + 'px,' + (-row * H) + 'px,0)'; }

  function size() {
    /* the stage is fixed inset:0, so the viewport IS its box */
    W = window.innerWidth  || document.documentElement.clientWidth  || stage.clientWidth;
    H = window.innerHeight || document.documentElement.clientHeight || stage.clientHeight;
    if (!W || !H) { if (++tries < 40) setTimeout(size, 60); return; }
    document.documentElement.style.setProperty('--w', W + 'px');
    document.documentElement.style.setProperty('--h', H + 'px');
    grid.style.transition = 'none';
    settle();
    requestAnimationFrame(function () { grid.style.transition = 'transform .5s ' + EASE; });
  }

  function paint() {
    var r = row, c = col;
    var dark = r > 0 && c === 0;
    var chrome = dark ? '#FAF7EF' : '#1F2024';
    ['[data-bar]', '[data-pad]', '[data-prog]', '[data-downcap]'].forEach(function (s) {
      var n = q(s); if (n) n.style.color = chrome;
    });
    var prog = q('[data-prog]');
    if (prog) { prog.style.background = chrome; prog.style.transform = 'scaleX(' + (r / (NROWS - 1)) + ')'; }
    var mark = q('[data-markbtn]');
    if (mark) {
      mark.style.opacity = r === 0 ? '0' : '1';
      mark.style.transform = r === 0 ? 'scale(.55)' : 'scale(1)';
      mark.style.pointerEvents = r === 0 ? 'none' : 'auto';
    }
    var cap = q('[data-downcap]');
    if (cap) cap.style.opacity = r === 0 ? '.62' : '0';
    var where = q('[data-where]');
    if (where) where.textContent = r === 0 ? NAME[r] : NAME[r] + ' · ' + BEAT[c];
    var beat = q('[data-beat]');
    if (beat) [].forEach.call(beat.children, function (b, i) {
      b.style.opacity = (r > 0 && i === c) ? '1' : '.2';
      b.style.visibility = (r === 0 || i > maxCol(r)) ? 'hidden' : 'visible';
    });
    var dis = { up: r === 0, down: r === NROWS - 1, left: c <= minCol(r), right: c >= maxCol(r) };
    Object.keys(dis).forEach(function (k) {
      var b = q('[data-nav="' + k + '"]');
      if (!b) return;
      b.disabled = dis[k];
      b.style.opacity = dis[k] ? '.14' : (k === 'right' ? '1' : '.85');
      b.style.cursor = dis[k] ? 'default' : 'pointer';
      b.style.color = (k === 'right' && !dis[k]) ? TINT[r] : 'inherit';
    });
    var hint = q('[data-hint]');
    if (hint && moved) hint.style.opacity = '0';
  }

  function to(r, c) {
    r = Math.max(0, Math.min(NROWS - 1, r));
    c = Math.max(minCol(r), Math.min(maxCol(r), c));
    if (r === row && c === col) { settle(); return; }
    row = r; col = c; moved = true;
    settle(); paint();
  }
  function vert(d) { var r = row + d; if (r < 0 || r > NROWS - 1) { settle(); return; } to(r, 1); }
  function horz(d) { to(row, col + d); }

  /* ── menu ── */
  function openMenu() {
    if (!dialog) return;
    menuOpen = true; dialog.hidden = false;
    var x = dialog.querySelector('[data-closemenu]'); if (x) x.focus();
  }
  function closeMenu() {
    if (!dialog) return;
    menuOpen = false; dialog.hidden = true;
    var m = q('[data-markbtn]'); if (m && row !== 0) m.focus();
  }

  /* ── keys ── */
  var typing = function (t) { return !!(t && t.closest && t.closest('input,textarea,select')); };
  document.addEventListener('keydown', function (e) {
    if (menuOpen) { if (e.key === 'Escape') closeMenu(); return; }
    if (typing(e.target)) return;   /* arrows inside the form edit text, not the grid */
    var k = e.key;
    if      (k === 'ArrowUp')    { e.preventDefault(); vert(-1); }
    else if (k === 'ArrowDown')  { e.preventDefault(); vert(1); }
    else if (k === 'ArrowLeft')  { e.preventDefault(); horz(-1); }
    else if (k === 'ArrowRight') { e.preventDefault(); horz(1); }
    else if (k === 'Home')       { e.preventDefault(); to(0, 1); }
    else if (k === 'm' || k === 'M') openMenu();
  });

  /* ── clicks: d-pad, shortcut buttons, menu ── */
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t || !t.closest) return;
    var nav = t.closest('[data-nav]');
    if (nav) {
      var k = nav.dataset.nav;
      if (k === 'up') vert(-1); else if (k === 'down') vert(1); else if (k === 'left') horz(-1); else horz(1);
      return;
    }
    var jump = t.closest('[data-jump]');
    if (jump) { to(+jump.dataset.jump, 3); return; }
    var mi = t.closest('[data-menu]');
    if (mi) { closeMenu(); to(+mi.dataset.menu, 1); return; }
    if (t.closest('[data-closemenu]')) { closeMenu(); return; }
    if (t.closest('[data-markbtn]')) openMenu();
  });

  /* ── drag, on either axis ── */
  var sx = 0, sy = 0, dx = 0, dy = 0, dn = false, t0 = 0, axis = null;
  var isUI = function (t) { return !!(t && t.closest && t.closest('button,a,input,textarea,label,form')); };
  stage.addEventListener('pointerdown', function (e) {
    if (menuOpen || isUI(e.target)) return;
    dn = true; axis = null; dx = dy = 0; sx = e.clientX; sy = e.clientY; t0 = Date.now();
    grid.style.transition = 'none';
    try { stage.setPointerCapture(e.pointerId); } catch (err) {}
  });
  stage.addEventListener('pointermove', function (e) {
    if (!dn) return;
    dx = e.clientX - sx; dy = e.clientY - sy;
    if (!axis && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (!axis) return;
    var ox = 0, oy = 0;
    if (axis === 'x') { ox = dx; if ((dx > 0 && col <= minCol(row)) || (dx < 0 && col >= maxCol(row))) ox = dx * 0.28; }
    else              { oy = dy; if ((dy > 0 && row === 0) || (dy < 0 && row === NROWS - 1)) oy = dy * 0.28; }
    grid.style.transform = 'translate3d(' + (-col * W + ox) + 'px,' + (-row * H + oy) + 'px,0)';
  });
  function release(e) {
    if (!dn) return;
    dn = false;
    grid.style.transition = 'transform .5s ' + EASE;
    var dt = Date.now() - t0, dist = Math.max(Math.abs(dx), Math.abs(dy));
    if (dist < 9 && dt < 350 && !isUI(e.target)) { settle(); return; }
    var thr = dt < 300 ? 36 : Math.min(W, H) * 0.22;
    if (axis === 'x')      { if (dx <= -thr) horz(1); else if (dx >= thr) horz(-1); else settle(); }
    else if (axis === 'y') { if (dy <= -thr) vert(1); else if (dy >= thr) vert(-1); else settle(); }
    else settle();
  }
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', function () { dn = false; grid.style.transition = 'transform .5s ' + EASE; settle(); });

  /* ── wheel / trackpad ── */
  var wlock = false;
  stage.addEventListener('wheel', function (e) {
    if (menuOpen) return;
    e.preventDefault();
    if (wlock) return;
    var ax = Math.abs(e.deltaX), ay = Math.abs(e.deltaY);
    if (Math.max(ax, ay) < 14) return;
    wlock = true; setTimeout(function () { wlock = false; }, 430);
    if (ax > ay) horz(e.deltaX > 0 ? 1 : -1); else vert(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  /* ── the contact card ── */
  var form = q('[data-cform]');
  if (form) {
    var btn = form.querySelector('button[type="submit"]'), msg = q('[data-cmsg]'), sent = q('[data-csent]');
    var label = btn ? btn.textContent : 'Send';
    form.addEventListener('submit', function (e) {
      if (!form.reportValidity()) return;
      e.preventDefault();
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      btn.disabled = true; btn.textContent = 'Sending'; if (msg) msg.hidden = true;
      fetch(form.getAttribute('action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (b) { return { ok: r.ok, body: b }; });
        })
        .then(function (res) {
          if (!res.ok) throw new Error(res.body.error || 'That did not go through.');
          form.hidden = true;
          if (sent) { sent.hidden = false; sent.setAttribute('tabindex', '-1'); sent.focus({ preventScroll: true }); }
        })
        .catch(function (err) {
          btn.disabled = false; btn.textContent = label;
          if (msg) { msg.textContent = err.message + ' Try it again in a moment.'; msg.hidden = false; }
        });
    });
  }

  /* ── go ── */
  window.addEventListener('resize', size);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', size);
  if (window.ResizeObserver) new ResizeObserver(size).observe(stage);
  size(); paint();
  requestAnimationFrame(size);
  setTimeout(size, 120);
  setTimeout(size, 600);
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    /* one small nudge downward, so a first-time reader sees there is more */
    setTimeout(function () {
      if (moved) return;
      grid.style.transform = 'translate3d(' + (-col * W) + 'px,-18px,0)';
      setTimeout(function () { if (!moved) settle(); }, 540);
    }, 1200);
  }
})();
