/* Hero variants – content layout + background animation. ?heroContent= · ?heroAnim= */
(function () {
  var CONTENT = ['workspace', 'minimal', 'tagline'];
  var ANIMATION = ['canvas', 'streams', 'waves', 'network', 'flow', 'supply', 'globe', 'terrain', 'field3d', 'network3d', 'none'];
  var KEY_CONTENT = 'haidi-hero-content';
  var KEY_ANIM = 'haidi-hero-animation';
  var LEGACY_KEY = 'haidi-hero';
  var DEFAULT_CONTENT = 'tagline';
  var DEFAULT_ANIM = 'canvas';

  function resolveContent() {
    try {
      var q = new URLSearchParams(location.search);
      var c = q.get('heroContent') || q.get('hero');
      if (c && CONTENT.indexOf(c) !== -1) return c;
    } catch (e) {}
    try {
      var saved = sessionStorage.getItem(KEY_CONTENT) || sessionStorage.getItem(LEGACY_KEY);
      if (saved && CONTENT.indexOf(saved) !== -1) return saved;
    } catch (e) {}
    return DEFAULT_CONTENT;
  }

  function resolveAnimation() {
    try {
      var a = new URLSearchParams(location.search).get('heroAnim');
      if (a && ANIMATION.indexOf(a) !== -1) return a;
    } catch (e) {}
    try {
      var saved = sessionStorage.getItem(KEY_ANIM);
      if (saved && ANIMATION.indexOf(saved) !== -1) return saved;
    } catch (e) {}
    return DEFAULT_ANIM;
  }

  function syncUrl(content, animation) {
    try {
      var url = new URL(location.href);
      if (content === DEFAULT_CONTENT) url.searchParams.delete('heroContent');
      else url.searchParams.set('heroContent', content);
      url.searchParams.delete('hero');
      if (animation === DEFAULT_ANIM) url.searchParams.delete('heroAnim');
      else url.searchParams.set('heroAnim', animation);
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch (e) {}
  }

  function apply(opts) {
    opts = opts || {};
    var content = opts.content || DEFAULT_CONTENT;
    var animation = opts.animation || DEFAULT_ANIM;
    if (CONTENT.indexOf(content) === -1) content = DEFAULT_CONTENT;
    if (ANIMATION.indexOf(animation) === -1) animation = DEFAULT_ANIM;

    document.documentElement.setAttribute('data-hero-content', content);
    document.documentElement.setAttribute('data-hero-animation', animation);
    document.documentElement.removeAttribute('data-hero');

    if (!opts.skipStore) {
      try {
        sessionStorage.setItem(KEY_CONTENT, content);
        sessionStorage.setItem(KEY_ANIM, animation);
        sessionStorage.removeItem(LEGACY_KEY);
      } catch (e) {}
    }
    if (!opts.skipUrl) syncUrl(content, animation);

    if (window.haidiHeroSetActive) window.haidiHeroSetActive(animation);
    window.dispatchEvent(new CustomEvent('haidi:hero-variant', {
      detail: { content: content, animation: animation }
    }));
  }

  window.HAIDI_HERO_CONTENT = CONTENT;
  window.HAIDI_HERO_ANIMATION = ANIMATION;
  window.haidiApplyHero = apply;
  window.haidiResolveHeroContent = resolveContent;
  window.haidiResolveHeroAnimation = resolveAnimation;
  window.haidiApplyHeroVariant = function (id) { apply({ content: id }); };

  apply({ content: resolveContent(), animation: resolveAnimation(), skipStore: true, skipUrl: true });
})();
