/* Haidi site – shared URLs and delivery settings. */
(function () {
  var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var ext = local ? '.html' : '';
  window.HAIDI_SITE = {
    url: 'https://haidi.io',
    appUrl: 'https://app.haidi.io',
    email: 'hello@haidi.io',
    linkedin: 'https://www.linkedin.com/company/ibp-ready',
    contactApi: '/api/contact',
    paths: {
      home: '/home' + ext,
      product: '/product-overview' + ext,
      about: '/about' + ext,
      contact: '/contact' + ext,
      privacy: '/privacy' + ext,
      terms: '/terms' + ext,
      security: '/security' + ext
    }
  };
})();
