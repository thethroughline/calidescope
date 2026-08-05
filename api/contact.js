/* Calidescope — contact endpoint.
   Takes the form on contact.html and mails it to bret@calidescope.llc.

   Vercel runs this file as a Node function at /api/contact. It needs one
   environment variable:

     RESEND_API_KEY   from resend.com — the only required setting

   Two optional ones, if you ever want to change where mail goes or comes from:

     CONTACT_TO       default bret@calidescope.llc
     CONTACT_FROM     default "Calidescope <onboarding@resend.dev>"
                      Resend's shared sender works with no DNS setup and
                      delivers to the address the Resend account is under.
                      Once calidescope.llc is verified in Resend, set this to
                      something like "Calidescope <hello@calidescope.llc>".

   The form posts JSON when JavaScript is on and a normal form body when it
   is off; this handles both, and answers each the way it asked. */

const TO   = process.env.CONTACT_TO   || 'bret@calidescope.llc';
const FROM = process.env.CONTACT_FROM || 'Calidescope <onboarding@resend.dev>';

/* The key. `RESEND_API_KEY` is the name to use, but a key saved under `Resend`
   or `RESEND` is obviously the same key, so take it rather than sit there
   silent. Read at request time — the variable can change under us between
   deploys. Trimmed, because a pasted key often carries a newline. */
const KEY_NAMES = ['RESEND_API_KEY', 'RESEND', 'Resend', 'resend'];
function apiKey() {
  for (const name of KEY_NAMES) {
    const v = (process.env[name] || '').trim();
    if (v) return { key: v, name };
  }
  return { key: '', name: null };
}

const LIMITS = { name: 120, email: 200, what: 80, link: 500, job: 4000 };
const WHAT = [
  'A homepage', 'A pitch deck', 'A proposal', 'Sales material', 'A case study',
  'A quarterly review', 'A renewal deck', 'A workflow', 'Something else'
];

/* Five sends per address per ten minutes, per instance. Enough to stop a
   stuck submit button from becoming a mailbox full of the same note. */
const RECENT = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_IN_WINDOW = 5;

function throttled(key) {
  const now = Date.now();
  const hits = (RECENT.get(key) || []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  RECENT.set(key, hits);
  if (RECENT.size > 500) {
    for (const [k, v] of RECENT) if (!v.some((t) => now - t < WINDOW_MS)) RECENT.delete(k);
  }
  return hits.length > MAX_IN_WINDOW;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;

  let raw = typeof req.body === 'string' ? req.body : '';
  if (!raw) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    raw = Buffer.concat(chunks).toString('utf8');
  }
  if (!raw) return {};

  const type = String(req.headers['content-type'] || '');
  if (type.includes('application/json')) {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return Object.fromEntries(new URLSearchParams(raw));
}

const clean = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);

const escape = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

module.exports = async function handler(req, res) {
  /* /api/contact?check=1 — says whether the function can see its settings.
     Names and destinations only; the key itself is never returned. */
  if (req.method === 'GET' && new URL(req.url, 'https://x').searchParams.has('check')) {
    const { key, name } = apiKey();
    return res.status(200).json({
      configured: !!key,
      readFrom: name,
      keyLooksRight: /^re_/.test(key),
      to: TO,
      from: FROM,
      sawTheseNames: Object.keys(process.env)
        .filter((k) => /RESEND|CONTACT/i.test(k)).sort()
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Send it as a POST.' });
  }

  const body = await readBody(req);
  const wantsJson = String(req.headers['accept'] || '').includes('application/json') ||
                    String(req.headers['content-type'] || '').includes('application/json');

  const done = (status, payload) => {
    if (wantsJson) return res.status(status).json(payload);
    if (status < 400) {
      res.setHeader('Location', '/thanks.html');
      return res.status(303).end();
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(status).send(
      `<!DOCTYPE html><meta charset="utf-8"><title>That did not send</title>` +
      `<body style="font:18px/1.5 system-ui;max-width:34em;margin:12vh auto;padding:0 24px;background:#FAF7EF;color:#1F2024">` +
      `<h1 style="font-size:28px">That did not send.</h1><p>${escape(payload.error)}</p>` +
      `<p><a href="/contact.html">Back to the form</a></p></body>`);
  };

  /* The honeypot. A person never sees this field, so anything in it is a bot.
     Answer as though it worked — a bot told it failed just tries again. */
  if (clean(body._gotcha, 200)) return done(200, { ok: true });

  const form = {
    name:  clean(body.name,  LIMITS.name),
    email: clean(body.email, LIMITS.email),
    what:  clean(body.what,  LIMITS.what),
    link:  clean(body.link,  LIMITS.link),
    job:   String(body.job == null ? '' : body.job).trim().slice(0, LIMITS.job)
  };

  const missing = ['name', 'email', 'what', 'job'].filter((k) => !form[k]);
  if (missing.length) return done(400, { error: 'Fill in every field except the link.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) {
    return done(400, { error: 'That email address does not look right.' });
  }
  if (!WHAT.includes(form.what)) form.what = 'Something else';
  if (form.link && !/^https?:\/\//i.test(form.link)) form.link = 'https://' + form.link;

  if (throttled(form.email.toLowerCase())) {
    return done(429, { error: 'We already have that one. Give it a minute.' });
  }

  const { key } = apiKey();
  if (!key) {
    console.error('contact: no Resend key in the environment — nothing was sent');
    return done(500, { error: 'The form is not connected yet.' });
  }

  const rows = [
    ['From',  `${form.name} <${form.email}>`],
    ['What',  form.what],
    ['Link',  form.link || '—'],
    ['Job',   form.job]
  ];

  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
  const html =
    `<div style="font:16px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1F2024">` +
    `<p style="font:500 12px/1 ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase;color:#6B6C70">` +
    `calidescope.llc &middot; contact</p>` +
    rows.map(([k, v]) =>
      `<p style="margin:0 0 14px"><b style="display:block;font:500 11px/1 ui-monospace,monospace;` +
      `letter-spacing:.16em;text-transform:uppercase;color:#6B6C70;margin-bottom:4px">${k}</b>` +
      `${escape(v).replace(/\n/g, '<br>')}</p>`).join('') +
    `</div>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: form.email,
        replyTo: form.email,   /* the REST API takes reply_to; send both so a
                                  camelCase-only reader cannot drop it either */
        subject: `${form.what} — ${form.name}`,
        text,
        html
      })
    });

    if (!r.ok) {
      console.error('contact: resend said', r.status, await r.text());
      return done(502, { error: 'The mail did not go out.' });
    }
  } catch (err) {
    console.error('contact: could not reach resend', err);
    return done(502, { error: 'The mail did not go out.' });
  }

  return done(200, { ok: true });
};
