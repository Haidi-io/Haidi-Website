/* Haidi site – shared interactions (no external deps).
   Header shade · IO reveals · mobile menu · scroll-sync · chart draw-in · counters.
   Reduced-motion safe: animations are skipped, content shows immediately. */
(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initHeader() {
    var h = document.querySelector('.site-header');
    if (!h) return;
    var on = function () { h.classList.toggle('scrolled', window.scrollY > 12); };
    on(); window.addEventListener('scroll', on, { passive: true });
  }

  function initReveal() {
    if (window.__HAIDI_GSAP__) return;
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || !els.length) {
      els.forEach(function (e) { e.classList.add('in'); }); return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  function initMenu() {
    var burger = document.querySelector('.nav-burger');
    var menu = document.querySelector('.mobile-menu');
    if (!burger || !menu) return;
    function setOpen(open) {
      menu.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    burger.addEventListener('click', function () { setOpen(!menu.classList.contains('open')); });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
  }

  /* hover/click-driven panel switcher */
  function initScrollSync() {
    document.querySelectorAll('[data-scrollsync]').forEach(function (root) {
      var cards = Array.prototype.slice.call(root.querySelectorAll('.ss-card'));
      var views = Array.prototype.slice.call(root.querySelectorAll('.ss-view'));
      if (!cards.length || !views.length) return;
      function activate(idx) {
        cards.forEach(function (c) { c.classList.toggle('active', +c.dataset.index === idx); });
        views.forEach(function (v) {
          var on = +v.dataset.index === idx;
          v.classList.toggle('active', on);
          if (on) drawFrame(v);
        });
      }
      cards.forEach(function (c) {
        c.addEventListener('mouseenter', function () { activate(+c.dataset.index); });
        c.addEventListener('click', function () { activate(+c.dataset.index); });
      });
      activate(0);
    });
  }

  /* ── chart draw-in ─────────────────────────────────────── */
  function drawFrame(scope) {
    if (reduced || !scope) return;
    scope.querySelectorAll('svg path[stroke]').forEach(function (p) {
      var f = p.getAttribute('fill');
      if (f && f !== 'none') return;
      if (p.getAttribute('stroke-dasharray')) return;
      var len; try { len = p.getTotalLength(); } catch (e) { return; }
      if (!len) return;
      p.animate(
        [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
        { duration: 1300, easing: 'cubic-bezier(0.4,0,0.2,1)', fill: 'backwards' }
      );
      p.style.strokeDasharray = len; p.style.strokeDashoffset = '0';
      setTimeout(function () { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; }, 1400);
    });
    scope.querySelectorAll('svg path[fill^="url"]').forEach(function (a) {
      a.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1100, delay: 300, easing: 'ease-out', fill: 'backwards' });
    });
    /* grow bar meters built by haidi-mocks */
    scope.querySelectorAll('[data-bar]').forEach(function (bar) {
      var w = bar.style.width;
      bar.animate([{ width: '0%' }, { width: w }], { duration: 1000, easing: 'cubic-bezier(0.16,1,0.3,1)', fill: 'backwards' });
    });
  }

  function initFrameDraw() {
    if (reduced) return;
    var frames = document.querySelectorAll('.frame-body, [data-draw]');
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          if (en.target.closest('.ss-view') && !en.target.closest('.ss-view').classList.contains('active')) return;
          drawFrame(en.target); io.unobserve(en.target);
          var loopEl = en.target.closest('[data-loop]');
          if (loopEl && !loopEl.__looping) {
            loopEl.__looping = true; var t = en.target;
            setInterval(function () {
              var r = t.getBoundingClientRect();
              if (r.top < window.innerHeight && r.bottom > 0 && !document.hidden) drawFrame(t);
            }, 6500 + Math.random() * 2000);
          }
        }
      });
    }, { threshold: 0.25 });
    frames.forEach(function (f) { io.observe(f); });
  }

  /* ── number counters ───────────────────────────────────── */
  function initCounters() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;
    function run(el) {
      if (reduced) { el.textContent = el.dataset.count + (el.dataset.suffix || ''); return; }
      var target = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length;
      var suffix = el.dataset.suffix || '', t0 = null, dur = 1400;
      function step(t) {
        if (!t0) t0 = t;
        var p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * e).toFixed(dec) + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.5 });
    els.forEach(function (e) { io.observe(e); });
  }

  function init() { initHeader(); initReveal(); initMenu(); initScrollSync(); initFrameDraw(); initCounters(); }
  window.haidiInit = init;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
