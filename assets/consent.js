/* Calidescope — consent manager (opt-in, dormant until tracking is configured)
   ------------------------------------------------------------------
   HOW IT WORKS
   - TRACKING below is the single switch. With every id null, the site sets
     no cookies, loads no trackers, and shows no banner (there is nothing
     to consent to — the privacy policy says exactly that).
   - The moment an id is filled in (e.g. LinkedIn Insight Tag partner id),
     the banner appears for new visitors. Nothing loads until they say yes.
   - "Allow" and "No thanks" are equal-weight buttons; the choice is kept
     for 12 months in localStorage (first-party, no cookie needed) and can
     be changed any time via the "Cookie preferences" link in the footer.
*/
(function () {
  'use strict';

  var TRACKING = {
    linkedinPartnerId: null,   // e.g. "1234567" — enables LinkedIn Insight Tag
    ga4MeasurementId: null     // e.g. "G-XXXXXXX" — enables Google Analytics 4
  };

  var CONSENT_KEY = 'calidescope-consent';
  var CONSENT_TTL_DAYS = 365;

  function trackingConfigured() {
    return !!(TRACKING.linkedinPartnerId || TRACKING.ga4MeasurementId);
  }

  function readConsent() {
    try {
      var raw = localStorage.getItem(CONSENT_KEY);
      if (!raw) return null;
      var val = JSON.parse(raw);
      if (!val.ts || (Date.now() - val.ts) > CONSENT_TTL_DAYS * 864e5) {
        localStorage.removeItem(CONSENT_KEY);
        return null;
      }
      return val;
    } catch (e) { return null; }
  }

  function writeConsent(allowed) {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify({ allowed: allowed, ts: Date.now() }));
    } catch (e) { /* private mode — treat as no consent */ }
  }

  function loadTrackers() {
    if (TRACKING.linkedinPartnerId) {
      window._linkedin_partner_id = TRACKING.linkedinPartnerId;
      window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
      window._linkedin_data_partner_ids.push(TRACKING.linkedinPartnerId);
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
      document.body.appendChild(s);
    }
    if (TRACKING.ga4MeasurementId) {
      var g = document.createElement('script');
      g.async = true;
      g.src = 'https://www.googletagmanager.com/gtag/js?id=' + TRACKING.ga4MeasurementId;
      document.body.appendChild(g);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', TRACKING.ga4MeasurementId, { anonymize_ip: true });
    }
  }

  function buildBanner(isPrefsReopen) {
    var wrap = document.createElement('div');
    wrap.id = 'cs-consent';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-label', 'Cookie preferences');
    wrap.innerHTML =
      '<div class="cs-consent-inner">' +
        '<div class="cs-consent-text">' +
          (trackingConfigured()
            ? '<b>Cookies. (Only if you say yes.)</b><br>We’d like to measure whether our posts and pages actually help anyone. No consent, no cookies — simple as that. <a href="privacy.html">The details</a>.'
            : '<b>No tracking here right now.</b><br>This site currently sets no tracking cookies at all. If that ever changes, we’ll ask you first — right here. <a href="privacy.html">The details</a>.') +
        '</div>' +
        '<div class="cs-consent-actions">' +
          (trackingConfigured()
            ? '<button type="button" class="cs-btn" data-consent="yes">Allow</button>' +
              '<button type="button" class="cs-btn" data-consent="no">No thanks</button>'
            : '<button type="button" class="cs-btn" data-consent="close">Got it</button>') +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);

    wrap.addEventListener('click', function (e) {
      var b = e.target.closest('[data-consent]');
      if (!b) return;
      var v = b.getAttribute('data-consent');
      if (v === 'yes') { writeConsent(true); loadTrackers(); }
      if (v === 'no') { writeConsent(false); }
      wrap.remove();
    });
  }

  function injectStyles() {
    var css =
      '#cs-consent{position:fixed;left:0;right:0;bottom:0;z-index:200;background:#1F2024;color:#FAF7EF;box-shadow:0 -6px 24px rgba(31,32,36,.25)}' +
      '.cs-consent-inner{max-width:1120px;margin:0 auto;padding:18px clamp(20px,5vw,72px);display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}' +
      '.cs-consent-text{font:400 13.5px/1.6 Archivo,sans-serif;max-width:640px}' +
      '.cs-consent-text b{font-weight:600}' +
      '.cs-consent-text a{color:#DDE6FF}' +
      '.cs-consent-actions{display:flex;gap:10px}' +
      '.cs-btn{border:1.5px solid #FAF7EF;background:none;color:#FAF7EF;border-radius:999px;padding:10px 22px;font:600 13px Archivo,sans-serif;cursor:pointer}' +
      '.cs-btn:hover{background:#FAF7EF;color:#1F2024}';
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
  }

  function init() {
    injectStyles();

    // Footer "Cookie preferences" links reopen the banner.
    document.addEventListener('click', function (e) {
      var link = e.target.closest('[data-cookie-prefs]');
      if (!link) return;
      e.preventDefault();
      if (!document.getElementById('cs-consent')) buildBanner(true);
    });

    if (!trackingConfigured()) return;           // dormant: no banner, nothing loads
    var consent = readConsent();
    if (consent === null) { buildBanner(false); return; }  // ask
    if (consent.allowed) loadTrackers();          // honored for 12 months
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
