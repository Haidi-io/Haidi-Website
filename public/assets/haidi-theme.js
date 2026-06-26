/* Haidi — light/dark theme (runs in <head> to avoid flash). */
(function () {
  var KEY = 'haidi-theme';

  function resolve() {
    try {
      var saved = localStorage.getItem(KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) {}
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function label(theme) {
    return 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' theme';
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(KEY, theme); } catch (e) {}
    document.querySelectorAll('.theme-toggle').forEach(function (btn) {
      btn.setAttribute('aria-label', label(theme));
      btn.setAttribute('title', label(theme));
    });
  }

  apply(resolve());

  function initToggle() {
    document.querySelectorAll('.theme-toggle').forEach(function (btn) {
      if (btn.__themeBound) return;
      btn.__themeBound = true;
      btn.addEventListener('click', function () {
        var cur = document.documentElement.getAttribute('data-theme') || 'dark';
        apply(cur === 'dark' ? 'light' : 'dark');
      });
    });
  }

  window.haidiSetTheme = apply;
  window.haidiInitThemeToggle = initToggle;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initToggle);
  else initToggle();
})();
