/* Calidescope — /next additions. The page's own logic lives in the source file
   and is inlined verbatim by build.py; this runs after it and adds two things
   the source does not have:
     1. a typing guard — keys typed into the form edit text, they do not move
        the grid or open the menu (the source's keydown listener would take
        an "m" in the email field as the menu shortcut);
     2. a focus seal — only the card on screen is reachable by keyboard;
     3. the contact form — posts JSON to /api/contact and swaps itself for
        "Got it." in place; with JavaScript off the form posts normally and
        the endpoint redirects to /thanks.html. */
(function () {
  'use strict';

  /* 1. Runs in the capture phase on document, so it is ahead of the source's
        bubble-phase listener on the same node and can stop it. */
  var typing = function (t) { return !!(t && t.closest && t.closest('input,textarea,select')); };
  document.addEventListener('keydown', function (e) {
    if (typing(e.target) && (/^Arrow|^Home$/.test(e.key) || e.key === 'm' || e.key === 'M')) {
      e.stopImmediatePropagation();
    }
  }, true);

  /* 2. All 41 cards sit in the DOM at once, so Tab walked straight off the
        card on screen and into the 24 controls on cards the reader cannot
        see — from "Better positioning" the next stop was "Software", three
        rows away. Everything but the settled card is marked inert, which
        takes it out of the tab order and the accessibility tree together.
        Recomputed after the grid settles, never mid-gesture: during a drag
        the neighbouring cards are meant to be visible, and a reader is not
        tabbing. The observer covers reduced motion too, where the transition
        is 0s and transitionend never fires. */
  var grid = document.getElementById('grid');
  var cells = [].slice.call(document.querySelectorAll('section.cell'));
  if (grid && cells.length) {
    var onscreen = function () {
      var best = null, area = 0, i, r, w, h;
      for (i = 0; i < cells.length; i++) {
        r = cells[i].getBoundingClientRect();
        w = Math.max(0, Math.min(r.right, window.innerWidth) - Math.max(r.left, 0));
        h = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0));
        if (w * h > area) { area = w * h; best = cells[i]; }
      }
      return best;
    };
    var seal = function () {
      var on = onscreen();
      if (!on) return;
      /* Where the reader was standing, before the seal can take it away:
         pressing "Better positioning" moves the grid, so the card holding
         that button is about to go inert and focus would fall to <body>,
         sending the next Tab back to the top of the document. If that is
         what is happening, hand focus to the card the button led to. */
      var had = document.activeElement;
      var losing = had && had !== document.body && on.contains && !on.contains(had) &&
                   had.closest && had.closest('section.cell');
      for (var i = 0; i < cells.length; i++) {
        if (cells[i] === on) cells[i].removeAttribute('inert');
        else cells[i].setAttribute('inert', '');
      }
      if (losing) {
        if (!on.hasAttribute('tabindex')) on.setAttribute('tabindex', '-1');
        try { on.focus({ preventScroll: true }); } catch (e) { on.focus(); }
      }
    };
    var pending;
    var settle = function () {
      clearTimeout(pending);
      var d = 0;
      try { d = (parseFloat(getComputedStyle(grid).transitionDuration) || 0) * 1000; } catch (e) {}
      pending = setTimeout(seal, d + 60);
    };
    if (window.MutationObserver) {
      new MutationObserver(settle).observe(grid, { attributes: true, attributeFilter: ['style'] });
    }
    window.addEventListener('resize', settle);
    seal();
  }

  /* 3. */
  var form = document.querySelector('[data-cform]');
  if (!form) return;
  var btn = form.querySelector('button[type="submit"]');
  var msg = document.getElementById('cmsg');
  var sent = document.getElementById('csent');
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
})();
