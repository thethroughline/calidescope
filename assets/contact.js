/* Calidescope — contact form.
   Posts to /api/contact (a Vercel function that mails bret@calidescope.llc).
   With JavaScript off the form still posts normally and the function
   redirects to thanks.html, so this file is an enhancement, not a dependency. */
(function () {
  'use strict';

  var form = document.getElementById('cform');
  if (!form) return;

  var btn  = document.getElementById('csend');
  var msg  = document.getElementById('cmsg');
  var sent = document.getElementById('csent');
  var note = document.getElementById('cnote');
  var label = btn ? btn.textContent : 'Send it over';

  function say(text) {
    if (!msg) return;
    msg.textContent = text;
    msg.hidden = !text;
  }

  form.addEventListener('submit', function (e) {
    if (!form.reportValidity()) return;          // let the browser show its own hints
    e.preventDefault();

    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = v; });

    btn.disabled = true;
    btn.textContent = 'Sending';
    say('');

    fetch(form.getAttribute('action'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; })
          .then(function (body) { return { ok: r.ok, body: body }; });
      })
      .then(function (res) {
        if (!res.ok) throw new Error(res.body.error || 'That did not go through.');
        form.hidden = true;
        if (note) note.hidden = true;
        if (sent) {
          sent.hidden = false;
          sent.setAttribute('tabindex', '-1');
          /* The page just got shorter by the height of the form, so put the
             answer back under the reader's eye before moving focus to it. */
          sent.focus({ preventScroll: true });
          sent.scrollIntoView({ block: 'center' });
        }
      })
      .catch(function (err) {
        btn.disabled = false;
        btn.textContent = label;
        say(err.message + ' Try it again in a moment.');
      });
  });
})();
