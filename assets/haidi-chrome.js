/* Haidi — shared header + footer injected into [data-chrome] slots.
   Set <body data-nav="product|how|industries|stories|about"> to mark active link. */
(function () {
  var LOGO = 'assets/haidi.png';
  var NAV = [
    { href: 'product-overview.html', label: 'Product', key: 'product' },
    { href: 'home.html#how', label: 'How it works', key: 'how' },
    { href: 'home.html#industries', label: 'Industries', key: 'industries' },
    { href: 'home.html#stories', label: 'Stories', key: 'stories' },
    { href: 'about.html', label: 'About', key: 'about' }
  ];

  function navLinks(active, mobile) {
    return NAV.map(function (n) {
      var cls = n.key === active ? ' class="active"' : '';
      return '<a href="' + n.href + '"' + (mobile ? '' : cls) + '>' + n.label + '</a>';
    }).join('');
  }

  function header(active) {
    return '' +
    '<header class="site-header"><div class="wrap-wide"><nav class="nav">' +
      '<a class="logo" href="home.html" aria-label="Haidi home"><img src="' + LOGO + '" alt="Haidi" /></a>' +
      '<div class="nav-links">' + navLinks(active) + '</div>' +
      '<div class="nav-actions">' +
        '<a class="btn btn-ghost btn-sm" href="contact.html">Sign in</a>' +
        '<a class="btn btn-primary btn-sm" href="contact.html">Prepare to launch</a>' +
        '<button class="nav-burger" aria-label="Menu"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>' +
      '</div>' +
    '</nav></div></header>' +
    '<div class="mobile-menu">' + navLinks(active, true) +
      '<a href="contact.html">Sign in</a>' +
      '<a class="btn btn-primary" href="contact.html" style="margin-top:12px">Prepare to launch</a>' +
    '</div>';
  }

  function footer() {
    return '' +
    '<footer class="site-footer"><div class="wrap-wide">' +
      '<div class="footer-grid">' +
        '<div class="footer-brand"><img src="' + LOGO + '" alt="Haidi" />' +
          '<p>A supply chain planning platform for teams that need clearer forecasts, structured demand review, and planning decisions they can explain.</p></div>' +
        '<div class="footer-col"><h5>Product</h5>' +
          '<a href="product-overview.html">Overview</a>' +
          '<a href="product-overview.html#scenario">Scenario Planning</a>' +
          '<a href="product-overview.html#demand-review">Demand Review</a>' +
          '<a href="product-overview.html#forecast-lab">Forecast Lab</a>' +
          '<a href="product-overview.html#haidi-gen">Haidi Gen</a></div>' +
        '<div class="footer-col"><h5>Industries</h5>' +
          '<a href="home.html#industries">Pharma</a>' +
          '<a href="home.html#industries">Manufacturing</a>' +
          '<a href="home.html#industries">Energy</a>' +
          '<a href="home.html#industries">FMCG</a></div>' +
        '<div class="footer-col"><h5>Company</h5>' +
          '<a href="about.html">About Haidi</a>' +
          '<a href="about.html#ibp">IBP Ready</a>' +
          '<a href="contact.html">Contact</a>' +
          '<a href="https://www.linkedin.com" target="_blank" rel="noopener">LinkedIn</a></div>' +
      '</div>' +
      '<div class="footer-bottom">' +
        '<span>© 2026 Haidi · Built by IBP Ready, Switzerland</span>' +
        '<span style="display:flex;gap:22px"><a href="#" style="color:inherit">Privacy</a><a href="#" style="color:inherit">Terms</a><a href="#" style="color:inherit">Security</a></span>' +
      '</div>' +
    '</div></footer>';
  }

  function inject() {
    var active = document.body.getAttribute('data-nav') || '';
    var h = document.querySelector('[data-chrome="header"]');
    var f = document.querySelector('[data-chrome="footer"]');
    if (h) h.outerHTML = header(active);
    if (f) f.outerHTML = footer();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
})();
