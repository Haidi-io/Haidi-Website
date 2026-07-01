/* Design-time Tweaks panel – loads on all hosts. */
(function () {
  var root = document.createElement('div');
  root.id = 'tweaks-root';
  document.body.appendChild(root);

  var launch = document.createElement('button');
  launch.id = 'haidi-tweaks-launch';
  launch.type = 'button';
  launch.textContent = 'Loading tweaks…';
  launch.setAttribute('aria-label', 'Open dev tweaks panel');
  document.body.appendChild(launch);

  var launchStyle = document.createElement('style');
  launchStyle.textContent =
    '#haidi-tweaks-launch{position:fixed;right:16px;bottom:16px;z-index:2147483645;' +
    'padding:10px 14px;border:1px solid rgba(255,255,255,.14);border-radius:999px;' +
    'background:rgba(20,22,29,.92);color:#f4f6fa;font:600 12px/1 ui-sans-serif,system-ui,sans-serif;' +
    'cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.35);backdrop-filter:blur(10px)}' +
    '#haidi-tweaks-launch:hover{border-color:rgba(71,185,187,.5);color:#5fd0d2}' +
    '#haidi-tweaks-launch.is-hidden{display:none}';
  document.head.appendChild(launchStyle);

  function showLaunch() { launch.classList.remove('is-hidden'); }
  function hideLaunch() { launch.classList.add('is-hidden'); }

  launch.addEventListener('click', function () {
    window.postMessage({ type: '__activate_edit_mode' }, '*');
    hideLaunch();
  });

  window.addEventListener('message', function (e) {
    var t = e.data && e.data.type;
    if (t === '__activate_edit_mode') hideLaunch();
    if (t === '__deactivate_edit_mode' || t === '__edit_mode_dismissed') showLaunch();
  });

  function load(src, attrs) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      if (attrs) Object.keys(attrs).forEach(function (k) { s.setAttribute(k, attrs[k]); });
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Failed to load ' + src)); };
      document.body.appendChild(s);
    });
  }

  function run(code) {
    var s = document.createElement('script');
    s.textContent = code;
    document.body.appendChild(s);
  }

  var heroContentDefault = (window.haidiResolveHeroContent && window.haidiResolveHeroContent()) || 'tagline';
  var heroAnimDefault = (window.haidiResolveHeroAnimation && window.haidiResolveHeroAnimation()) || 'canvas';
  // The cursor module loads as a deferred module, so haidiResolveCursor may not be
  // exposed yet when this runs – fall back to the persisted value so the panel's
  // dropdown reflects the cursor actually in effect rather than always showing 'trace'.
  var cursorDefault = (window.haidiResolveCursor && window.haidiResolveCursor()) ||
    (function () { try { return sessionStorage.getItem('haidi-cursor'); } catch (e) { return null; } })() ||
    'dot-ring';
  var defaults = {
    displayType: 'inter',
    canvas: 'graphite',
    accent: '#47B9BB',
    cursor: cursorDefault,
    heroContent: heroContentDefault,
    heroAnimation: heroAnimDefault,
    taglineWidth: 22,
    ctaBg: 'teal',
    ctaArt: 'constellation',
    insideVariant: 'carousel'
  };
  var hasHero = !!document.querySelector('[data-hero-root]');
  var hasCta = !!document.querySelector('.cta-banner');
  var hasInside = !!document.querySelector('.inside-product');

  Promise.resolve()
    .then(function () {
      return load('https://unpkg.com/react@18.3.1/umd/react.development.js', { crossorigin: 'anonymous' });
    })
    .then(function () {
      return load('https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js', { crossorigin: 'anonymous' });
    })
    .then(function () {
      return load('https://unpkg.com/@babel/standalone@7.26.0/babel.min.js', { crossorigin: 'anonymous' });
    })
    .then(function () {
      return fetch('/assets/tweaks-panel.jsx').then(function (r) {
        if (!r.ok) throw new Error('Failed to fetch tweaks-panel.jsx');
        return r.text();
      });
    })
    .then(function (jsx) {
      run(Babel.transform(jsx, { presets: ['react'] }).code);
      if (typeof window.useTweaks !== 'function') throw new Error('tweaks-panel failed to register');
    })
    .then(function () {
      var app =
        'var TWEAK_FONTS = {' +
        '  geist: "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap",' +
        '  plex: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap",' +
        '  manrope: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap"' +
        '};' +
        'function ensureFont(key) {' +
        '  var url = TWEAK_FONTS[key]; if (!url) return;' +
        '  if (document.querySelector("link[data-tweak-font=" + key + "]")) return;' +
        '  var l = document.createElement("link"); l.rel = "stylesheet"; l.href = url;' +
        '  l.setAttribute("data-tweak-font", key); document.head.appendChild(l);' +
        '}' +
        'function applyTweaks(t) {' +
        '  var d = document.documentElement;' +
        '  ensureFont(t.displayType);' +
        "  d.setAttribute('data-font', t.displayType);" +
        "  d.setAttribute('data-canvas', t.canvas);" +
        "  d.style.setProperty('--teal', t.accent);" +
        "  d.style.setProperty('--teal-bright', t.accent === '#47B9BB' ? '#5FD0D2' : t.accent);" +
        "  d.style.setProperty('--tagline-width', t.taglineWidth + 'ch');" +
        "  d.setAttribute('data-cta-bg', t.ctaBg);" +
        "  d.setAttribute('data-cta-art', t.ctaArt);" +
        "  d.setAttribute('data-inside-variant', t.insideVariant);" +
        '  if (window.haidiApplyHero) window.haidiApplyHero({ content: t.heroContent, animation: t.heroAnimation });' +
        '  if (window.haidiApplyCursor) window.haidiApplyCursor(t.cursor);' +
        '}' +
        'function TweaksApp() {' +
        '  var _use = useTweaks(' + JSON.stringify(defaults) + ');' +
        '  var t = _use[0], setTweak = _use[1];' +
        '  React.useEffect(function () { applyTweaks(t); }, [t]);' +
        '  function copyHeroLink() {' +
        '    try { navigator.clipboard.writeText(location.href); } catch (e) {}' +
        '  }' +
        '  return React.createElement(TweaksPanel, { title: "Dev tweaks", defaultOpen: false },' +
        (hasHero
          ? '    React.createElement(TweakSection, { label: "Hero" }),' +
            '    React.createElement(TweakRadio, { label: "Content", value: t.heroContent, options: ["workspace","minimal","tagline"], onChange: function (v) { setTweak("heroContent", v); } }),' +
            '    React.createElement(TweakSlider, { label: "Tagline width", value: t.taglineWidth, min: 14, max: 48, unit: "ch", onChange: function (v) { setTweak("taglineWidth", v); } }),' +
            '    React.createElement(TweakSelect, { label: "Animation", value: t.heroAnimation, options: ["canvas","streams","waves","network","flow","supply","globe","terrain","field3d","network3d","none"], onChange: function (v) { setTweak("heroAnimation", v); } }),' +
            '    React.createElement(TweakButton, { label: "Copy share link", secondary: true, onClick: copyHeroLink }),'
          : '') +
        '    React.createElement(TweakSection, { label: "Cursor" }),' +
        '    React.createElement(TweakSelect, { label: "Style", value: t.cursor, options: [' +
        '      { value: "none", label: "System default" },' +
        '      { value: "dot", label: "Minimal dot" },' +
        '      { value: "dot-ring", label: "Dot & ring" },' +
        '      { value: "crosshair", label: "Reticle" },' +
        '      { value: "snap", label: "Magnetic" },' +
        '      { value: "trace", label: "Comet trail" },' +
        '      { value: "bracket", label: "Action pill" }' +
        '    ], onChange: function (v) { setTweak("cursor", v); } }),' +
        '    React.createElement(TweakSection, { label: "Typography" }),' +
        '    React.createElement(TweakSelect, { label: "Body font", value: t.displayType, options: [' +
        '      { value: "inter", label: "Inter" },' +
        '      { value: "geist", label: "Geist" },' +
        '      { value: "plex", label: "IBM Plex Sans" },' +
        '      { value: "manrope", label: "Manrope" },' +
        '      { value: "system", label: "System" }' +
        '    ], onChange: function (v) { setTweak("displayType", v); } }),' +
        '    React.createElement(TweakSection, { label: "Canvas" }),' +
        '    React.createElement(TweakRadio, { label: "Darkness", value: t.canvas, options: ["black","graphite","navy"], onChange: function (v) { setTweak("canvas", v); } }),' +
        '    React.createElement(TweakColor, { label: "Accent", value: t.accent, options: ["#47B9BB","#5BC8B8","#5FD0D2","#3FA7A9"], onChange: function (v) { setTweak("accent", v); } })' +
        (hasCta
          ? '    ,React.createElement(TweakSection, { label: "CTA banner" })' +
            '    ,React.createElement(TweakSelect, { label: "Background", value: t.ctaBg, options: [' +
            '      { value: "teal", label: "Teal (default)" },' +
            '      { value: "midnight", label: "Midnight" },' +
            '      { value: "aurora", label: "Aurora" },' +
            '      { value: "mesh", label: "Mesh" },' +
            '      { value: "emerald", label: "Emerald" },' +
            '      { value: "slate", label: "Slate" }' +
            '    ], onChange: function (v) { setTweak("ctaBg", v); } })' +
            '    ,React.createElement(TweakSelect, { label: "Art", value: t.ctaArt, options: [' +
            '      { value: "none", label: "None" },' +
            '      { value: "constellation", label: "Supply network" },' +
            '      { value: "forecast", label: "Forecast curves" },' +
            '      { value: "contours", label: "Contours" },' +
            '      { value: "grid", label: "Data grid" },' +
            '      { value: "orbits", label: "Orbits" }' +
            '    ], onChange: function (v) { setTweak("ctaArt", v); } })'
          : '') +
        (hasInside
          ? '    ,React.createElement(TweakSection, { label: "Inside the product" })' +
            '    ,React.createElement(TweakSelect, { label: "Demand layout", value: t.insideVariant, options: [' +
            '      { value: "carousel", label: "Carousel" },' +
            '      { value: "tabs", label: "Tabs" }' +
            '    ], onChange: function (v) { setTweak("insideVariant", v); } })'
          : '') +
        '  );' +
        '}' +
        "ReactDOM.createRoot(document.getElementById('tweaks-root')).render(React.createElement(TweaksApp));";
      run(Babel.transform(app, { presets: ['react'] }).code);
      launch.textContent = 'Tweaks';
      showLaunch();
    })
    .catch(function (err) {
      launch.textContent = 'Tweaks failed';
      launch.title = String(err && err.message || err);
      console.warn('[haidi-tweaks]', err);
    });
})();
