/* Haidi – shared header + footer injected into [data-chrome] slots.
   Set <body data-nav="product|about"> to mark active link. */
(function () {
  var cfg = window.HAIDI_SITE || {};
  var p = cfg.paths || {};
  var home = p.home || '/home';
  var product = p.product || '/product-overview';
  var about = p.about || '/about';
  var contact = p.contact || '/contact';
  var LOGO = 'assets/haidi.png';
  var APP = cfg.appUrl || 'https://app.haidi.io';
  var LINKEDIN = cfg.linkedin || 'https://www.linkedin.com/company/ibp-ready';
  var NAV = [
    { href: product, label: 'Product', key: 'product' },
    { href: about, label: 'About', key: 'about' }
  ];

  function navLinks(active, mobile) {
    return NAV.map(function (n) {
      var cls = n.key === active ? ' class="active"' : '';
      return '<a href="' + n.href + '"' + (mobile ? '' : cls) + '>' + n.label + '</a>';
    }).join('');
  }

  function themeToggle() {
    return '' +
      '<button class="theme-toggle" type="button" aria-label="Switch to light theme" title="Switch to light theme">' +
        '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
          '<path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' +
        '</svg>' +
        '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
          '<circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.8"/>' +
          '<path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
        '</svg>' +
      '</button>';
  }

  function header(active) {
    return '' +
    '<a class="skip-link" href="#main">Skip to content</a>' +
    '<header class="site-header"><div class="wrap-wide"><nav class="nav">' +
      '<a class="logo" href="' + home + '" aria-label="Haidi home"><img src="' + LOGO + '" alt="Haidi" width="120" height="27" loading="lazy" /></a>' +
      '<div class="nav-links">' + navLinks(active) + '</div>' +
      '<div class="nav-actions">' +
        themeToggle() +
        '<a class="btn btn-ghost btn-sm" href="' + APP + '" rel="noopener">Sign in</a>' +
        '<a class="btn btn-primary btn-sm" href="' + contact + '">Prepare to launch</a>' +
        '<button class="nav-burger" type="button" aria-label="Menu" aria-expanded="false" aria-controls="mobile-menu"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>' +
      '</div>' +
    '</nav></div></header>' +
    '<div class="mobile-menu" id="mobile-menu">' + navLinks(active, true) +
      themeToggle() +
      '<a href="' + APP + '" rel="noopener">Sign in</a>' +
      '<a class="btn btn-primary" href="' + contact + '" style="margin-top:12px">Prepare to launch</a>' +
    '</div>';
  }

  function footer() {
    var privacy = p.privacy || '/privacy';
    var terms = p.terms || '/terms';
    var security = p.security || '/security';
    return '' +
    '<footer class="site-footer"><div class="wrap-wide">' +
      '<div class="footer-grid">' +
        '<div class="footer-brand"><img src="' + LOGO + '" alt="Haidi" width="120" height="26" loading="lazy" />' +
          '<p>A supply chain planning platform for teams that need clearer forecasts, structured demand review, and planning decisions they can explain.</p></div>' +
        '<div class="footer-col"><h5>Product</h5>' +
          '<a href="' + product + '">Overview</a>' +
          '<a href="' + product + '#scenario">Scenario Planning</a>' +
          '<a href="' + product + '#demand-review">Demand Review</a>' +
          '<a href="' + product + '#forecast-lab">Forecast Lab</a>' +
          '<a href="' + product + '#haidi-gen">Haidi Gen</a></div>' +
        '<div class="footer-col"><h5>Industries</h5>' +
          '<a href="' + home + '#industries">Pharma</a>' +
          '<a href="' + home + '#industries">Manufacturing</a>' +
          '<a href="' + home + '#industries">Energy</a>' +
          '<a href="' + home + '#industries">FMCG</a></div>' +
        '<div class="footer-col"><h5>Company</h5>' +
          '<a href="' + about + '">About Haidi</a>' +
          '<a href="' + about + '#ibp">IBP Ready</a>' +
          '<a href="' + contact + '">Contact</a>' +
          '<a href="' + LINKEDIN + '" target="_blank" rel="noopener noreferrer">LinkedIn</a></div>' +
      '</div>' +
      '<div class="footer-bottom">' +
        '<span>© 2026 Haidi · Built by IBP Ready, Switzerland</span>' +
        '<span style="display:flex;gap:22px"><a href="' + privacy + '">Privacy</a><a href="' + terms + '">Terms</a><a href="' + security + '">Security</a></span>' +
      '</div>' +
    '</div></footer>';
  }

  function inject() {
    var active = document.body.getAttribute('data-nav') || '';
    var h = document.querySelector('[data-chrome="header"]');
    var f = document.querySelector('[data-chrome="footer"]');
    if (h) h.outerHTML = header(active);
    if (f) f.outerHTML = footer();
    if (window.haidiInitThemeToggle) window.haidiInitThemeToggle();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
})();
