/* Haidi — multi-step qualification form.
   Self-contained. Steps marked [data-step]; chip groups [data-field];
   text/select inputs [data-field]. Persists to localStorage, validates,
   builds a summary, and shows a success screen on submit. */
(function () {
  function init() {
    var form = document.querySelector('[data-cform]');
    if (!form) return;

    var STORE = 'haidi_cform_v1';
    var steps = Array.prototype.slice.call(form.querySelectorAll('[data-step]'));
    var total = steps.length; // includes summary as last
    var current = 0;
    var data = {};
    try { data = JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (e) { data = {}; }

    var progressFill = form.querySelector('[data-progress-fill]');
    var progressLabel = form.querySelector('[data-progress-label]');
    var dotsWrap = form.querySelector('[data-dots]');
    var dots = [];
    if (dotsWrap) {
      for (var i = 0; i < total; i++) {
        var d = document.createElement('span'); d.className = 'cf-dot'; dotsWrap.appendChild(d); dots.push(d);
      }
    }

    function save() { try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (e) {} }

    /* ---- restore field values ---- */
    function restore() {
      form.querySelectorAll('input[data-field], textarea[data-field], select[data-field]').forEach(function (el) {
        var f = el.dataset.field;
        if (data[f] != null) el.value = data[f];
      });
      form.querySelectorAll('[data-chips]').forEach(function (group) {
        var f = group.dataset.field, multi = group.hasAttribute('data-multi');
        var val = data[f];
        group.querySelectorAll('.cf-chip').forEach(function (chip) {
          var on = multi ? (Array.isArray(val) && val.indexOf(chip.dataset.value) !== -1) : (val === chip.dataset.value);
          chip.classList.toggle('on', !!on);
          chip.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      });
    }

    /* ---- input bindings ---- */
    form.querySelectorAll('input[data-field], textarea[data-field], select[data-field]').forEach(function (el) {
      el.addEventListener('input', function () { data[el.dataset.field] = el.value; clearError(el.closest('[data-row]') || el); save(); });
    });
    form.querySelectorAll('[data-chips]').forEach(function (group) {
      var f = group.dataset.field, multi = group.hasAttribute('data-multi');
      group.querySelectorAll('.cf-chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
          if (multi) {
            var arr = Array.isArray(data[f]) ? data[f].slice() : [];
            var idx = arr.indexOf(chip.dataset.value);
            if (idx === -1) arr.push(chip.dataset.value); else arr.splice(idx, 1);
            data[f] = arr;
            chip.classList.toggle('on');
            chip.setAttribute('aria-pressed', chip.classList.contains('on') ? 'true' : 'false');
          } else {
            data[f] = chip.dataset.value;
            group.querySelectorAll('.cf-chip').forEach(function (c) { c.classList.toggle('on', c === chip); c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
          }
          clearError(group.closest('[data-row]') || group); save();
        });
      });
    });

    /* ---- validation ---- */
    function setError(el, msg) {
      var row = el.closest ? (el.closest('[data-row]') || el) : el;
      row.classList.add('cf-err');
      var m = row.querySelector('[data-msg]');
      if (m) m.textContent = msg;
    }
    function clearError(row) { if (row && row.classList) { row.classList.remove('cf-err'); var m = row.querySelector && row.querySelector('[data-msg]'); if (m) m.textContent = ''; } }

    function validateStep(stepEl) {
      var ok = true, firstBad = null;
      stepEl.querySelectorAll('[data-required]').forEach(function (el) {
        var type = el.dataset.required; // text | email | chips
        if (type === 'chips') {
          var f = el.dataset.field, multi = el.hasAttribute('data-multi');
          var v = data[f];
          var empty = multi ? !(Array.isArray(v) && v.length) : !v;
          if (empty) { ok = false; setError(el, 'Please choose at least one option.'); firstBad = firstBad || el; }
        } else {
          var val = (data[el.dataset.field] || '').trim();
          if (!val) { ok = false; setError(el, 'This field is required.'); firstBad = firstBad || el; }
          else if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) { ok = false; setError(el, 'Enter a valid work email.'); firstBad = firstBad || el; }
        }
      });
      return ok;
    }

    /* ---- summary ---- */
    var LABELS = {
      name: 'Name', email: 'Work email', company: 'Company', title: 'Job title', country: 'Country / region', industry: 'Industry',
      planningAreas: 'Planning areas', tools: 'Current tools', maturity: 'Planning maturity',
      challenges: 'Main challenges', improve: 'What to improve',
      historical: 'Historical data', masterData: 'Master data', drivers: 'Planning drivers', timing: 'Timeline'
    };
    function buildSummary() {
      var box = form.querySelector('[data-summary]');
      if (!box) return;
      var order = ['company','industry','country','planningAreas','tools','maturity','challenges','improve','historical','masterData','drivers','timing'];
      var html = '';
      order.forEach(function (k) {
        var v = data[k];
        if (v == null || v === '' || (Array.isArray(v) && !v.length)) return;
        if (Array.isArray(v)) v = v.join(', ');
        html += '<div class="cf-sum-row"><span class="cf-sum-k">' + (LABELS[k] || k) + '</span><span class="cf-sum-v">' + String(v).replace(/</g,'&lt;') + '</span></div>';
      });
      if (!html) html = '<div class="cf-sum-row"><span class="cf-sum-v" style="color:var(--text-muted)">Your answers will appear here.</span></div>';
      box.innerHTML = html;
    }

    /* ---- navigation ---- */
    function show(idx) {
      current = Math.max(0, Math.min(idx, total - 1));
      steps.forEach(function (s, i) { s.classList.toggle('on', i === current); });
      dots.forEach(function (d, i) { d.classList.toggle('done', i < current); d.classList.toggle('active', i === current); });
      var pct = total > 1 ? (current / (total - 1)) * 100 : 100;
      if (progressFill) progressFill.style.width = pct + '%';
      if (progressLabel) progressLabel.textContent = 'Step ' + Math.min(current + 1, total) + ' of ' + total;
      if (steps[current].hasAttribute('data-summary-step')) buildSummary();
      var top = form.getBoundingClientRect().top + window.scrollY - 110;
      if (window.scrollY > top + 40) window.scrollTo({ top: top, behavior: 'smooth' });
      var f = steps[current].querySelector('input[data-field], textarea[data-field]');
      if (f && current !== 0) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) {} }, 120);
    }

    form.querySelectorAll('[data-next]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (validateStep(steps[current])) { save(); show(current + 1); }
        else { var bad = steps[current].querySelector('.cf-err'); if (bad) bad.scrollIntoView ? null : null; }
      });
    });
    form.querySelectorAll('[data-back]').forEach(function (btn) {
      btn.addEventListener('click', function () { show(current - 1); });
    });

    /* ---- submit ---- */
    var submitBtn = form.querySelector('[data-submit]');
    if (submitBtn) submitBtn.addEventListener('click', function () {
      var done = form.querySelector('[data-done]');
      var card = form.querySelector('[data-card]');
      if (card && done) {
        card.style.display = 'none';
        done.classList.add('on');
        var nm = (data.name || '').trim().split(' ')[0];
        var greet = done.querySelector('[data-greet]');
        if (greet && nm) greet.textContent = ' ' + nm;
      }
      try { localStorage.removeItem(STORE); } catch (e) {}
      var top = form.getBoundingClientRect().top + window.scrollY - 110;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });

    restore();
    show(0);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
