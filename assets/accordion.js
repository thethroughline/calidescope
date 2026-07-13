// Calidescope — tiny vanilla-JS disclosure/accordion behavior.
// Replaces the design-tool's runtime with plain, dependency-free JS.
(function () {
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-toggle]');
    if (!btn) return;

    var panel = document.getElementById(btn.getAttribute('data-toggle'));
    if (!panel) return;

    var group = btn.getAttribute('data-group');
    var willOpen = btn.getAttribute('aria-expanded') !== 'true';

    if (group) {
      // single-open-at-a-time behavior within the group
      document.querySelectorAll('[data-group="' + group + '"]').forEach(function (other) {
        if (other === btn) return;
        other.setAttribute('aria-expanded', 'false');
        var otherPanel = document.getElementById(other.getAttribute('data-toggle'));
        if (otherPanel) otherPanel.hidden = true;
        var otherGlyph = other.querySelector('.glyph, .glyph-sm');
        if (otherGlyph) otherGlyph.textContent = '+';
      });
    }

    btn.setAttribute('aria-expanded', String(willOpen));
    panel.hidden = !willOpen;
    var glyph = btn.querySelector('.glyph, .glyph-sm');
    if (glyph) glyph.textContent = willOpen ? '−' : '+';
  });
})();
