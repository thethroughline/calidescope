/* Calidescope — /next additions. The page's own logic lives in the source file
   and is inlined verbatim by build.py; this runs after it and adds two things
   the source does not have:
     1. a typing guard — keys typed into the form edit text, they do not move
        the grid or open the menu (the source's keydown listener would take
        an "m" in the email field as the menu shortcut);
     2. the contact form — posts JSON to /api/contact and swaps itself for
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

  /* 2. */
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
