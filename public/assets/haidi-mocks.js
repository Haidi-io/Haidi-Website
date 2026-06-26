/* Haidi — schematic product mockups (neutral, stylized planning UI, not fake screenshots).
   Usage: el.innerHTML = haidiMock('review'); or auto-hydrate [data-mock]. */
(function () {
  var T = '#47B9BB', C = '#F08989', M = 'var(--text-body)', F = 'var(--text)', U = 'var(--text-muted)';

  function linePath(vals, w, h, pad) {
    pad = pad || 6; var n = vals.length, iw = w - pad * 2, ih = h - pad * 2;
    return vals.map(function (v, i) {
      var x = pad + (iw * i) / (n - 1), y = pad + ih * (1 - v);
      return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }).join(' ');
  }
  function areaPath(vals, w, h, pad) {
    pad = pad || 6; var n = vals.length, iw = w - pad * 2, ih = h - pad * 2;
    var d = 'M' + pad + ' ' + (h - pad);
    vals.forEach(function (v, i) { var x = pad + (iw * i) / (n - 1), y = pad + ih * (1 - v); d += ' L' + x.toFixed(1) + ' ' + y.toFixed(1); });
    d += ' L' + (w - pad) + ' ' + (h - pad) + ' Z'; return d;
  }

  var A = [.28,.34,.30,.42,.46,.40,.52,.58,.55,.64,.70,.66,.78];
  var B = [.22,.26,.30,.33,.38,.44,.47,.50,.56,.60,.63,.68,.72];
  var D = [.30,.38,.34,.50,.44,.62,.56,.72,.66,.80,.74,.86,.82];

  function chart(vals, vals2, band) {
    var w = 560, h = 200, id = 'g' + Math.random().toString(36).slice(2, 7), pad = 18;
    var bandHtml = '';
    if (band) {
      var up = vals.map(function (v) { return Math.min(v + 0.09, 1); });
      var lo = vals.map(function (v) { return Math.max(v - 0.09, 0); });
      var n = up.length, iw = w - pad * 2, ih = h - pad * 2, dd = '';
      up.forEach(function (v, i) { var x = pad + iw * i / (n - 1), y = pad + ih * (1 - v); dd += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); });
      for (var k = lo.length - 1; k >= 0; k--) { var x2 = pad + iw * k / (n - 1), y2 = pad + ih * (1 - lo[k]); dd += 'L' + x2.toFixed(1) + ' ' + y2.toFixed(1); }
      dd += 'Z'; bandHtml = '<path d="' + dd + '" fill="' + T + '" fill-opacity="0.10"/>';
    }
    var second = vals2 ? '<path d="' + linePath(vals2, w, h, pad) + '" fill="none" stroke="rgba(240,137,137,0.6)" stroke-width="2" stroke-dasharray="4 4"/>' : '';
    var grid = '';
    for (var i = 1; i < 4; i++) grid += '<line x1="' + pad + '" x2="' + (w-pad) + '" y1="' + (pad + (h-pad*2)*i/4) + '" y2="' + (pad + (h-pad*2)*i/4) + '" stroke="rgba(255,255,255,0.05)"/>';
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" style="width:100%;height:100%;display:block">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + T + '" stop-opacity="0.28"/><stop offset="1" stop-color="' + T + '" stop-opacity="0"/></linearGradient></defs>' +
      grid + bandHtml +
      '<path d="' + areaPath(vals, w, h, pad) + '" fill="url(#' + id + ')"/>' +
      '<path d="' + linePath(vals, w, h, pad) + '" fill="none" stroke="' + T + '" stroke-width="2.5" stroke-linecap="round"/>' +
      second + '</svg>';
  }

  function bars(rows) {
    return '<div style="display:flex;flex-direction:column;gap:13px">' + rows.map(function (r) {
      var col = r.tone === 'c' ? C : T;
      return '<div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">' +
        '<span style="color:' + M + '">' + r.label + '</span>' +
        '<span style="color:' + col + ';font-family:var(--mono);font-weight:600">' + r.val + '</span></div>' +
        '<div style="height:8px;border-radius:6px;background:rgba(255,255,255,0.06);overflow:hidden">' +
        '<div data-bar style="height:100%;width:' + r.pct + '%;border-radius:6px;background:' + col + ';opacity:.85"></div></div></div>';
    }).join('') + '</div>';
  }

  function kpis(items) {
    return '<div style="display:grid;grid-template-columns:repeat(' + items.length + ',1fr);gap:12px">' +
      items.map(function (k) {
        return '<div style="background:rgba(255,255,255,0.025);border:1px solid var(--line);border-radius:11px;padding:14px">' +
          '<div style="font-size:11px;color:' + U + ';text-transform:uppercase;letter-spacing:.07em">' + k.label + '</div>' +
          '<div style="font-size:23px;font-weight:600;color:' + F + ';margin-top:6px">' + k.val + '</div>' +
          (k.delta ? '<div style="font-size:12px;color:' + (k.delta[0] === '-' ? C : T) + ';margin-top:2px;font-family:var(--mono)">' + k.delta + '</div>' : '') +
          '</div>';
      }).join('') + '</div>';
  }

  function table(head, rows) {
    var cols = head.map(function () { return '1fr'; }).join(' ');
    return '<div style="border:1px solid var(--line);border-radius:11px;overflow:hidden">' +
      '<div style="display:grid;grid-template-columns:' + cols + ';background:rgba(71,185,187,0.10);padding:10px 14px;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:' + U + '">' +
      head.map(function (h) { return '<span>' + h + '</span>'; }).join('') + '</div>' +
      rows.map(function (r, i) {
        return '<div style="display:grid;grid-template-columns:' + cols + ';padding:11px 14px;font-size:13px;color:' + M + ';border-top:1px solid var(--line)' + (i % 2 ? ';background:rgba(255,255,255,0.015)' : '') + '">' +
          r.map(function (c, j) { return '<span style="' + (j === 0 ? 'color:' + F : '') + (c.t ? ';color:' + (c.t === 'c' ? C : T) : '') + '">' + (c.v !== undefined ? c.v : c) + '</span>'; }).join('') + '</div>';
      }).join('') + '</div>';
  }

  function shell(title, tabs, body, active) {
    active = active || 1;
    var tabsHtml = (tabs || []).map(function (t, i) {
      return '<span style="font-size:12px;padding:6px 12px;border-radius:7px;' + (i === 0 ? 'background:rgba(71,185,187,0.16);color:' + T + ';border:1px solid rgba(71,185,187,0.3)' : 'color:' + U + '') + '">' + t + '</span>';
    }).join('');
    return '<div style="display:flex;min-height:340px">' +
      '<div style="width:52px;border-right:1px solid var(--line);padding:14px 0;display:flex;flex-direction:column;align-items:center;gap:13px;background:rgba(255,255,255,0.015)">' +
        '<div style="width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,' + T + ',' + C + ')"></div>' +
        ['','','','',''].map(function (_, i) { return '<div style="width:22px;height:22px;border-radius:7px;background:' + (i === active ? 'rgba(71,185,187,0.2)' : 'rgba(255,255,255,0.05)') + '"></div>'; }).join('') +
      '</div>' +
      '<div style="flex:1;display:flex;flex-direction:column;min-width:0">' +
        '<div style="display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--line)">' +
          '<span style="font-size:14px;font-weight:600;color:' + F + '">' + title + '</span>' +
          '<div style="display:flex;gap:6px;margin-left:auto">' + tabsHtml + '</div>' +
        '</div>' +
        '<div style="padding:18px;display:flex;flex-direction:column;gap:15px;flex:1">' + body + '</div>' +
      '</div></div>';
  }

  var chartBox = function (inner) { return '<div style="flex:1;min-height:150px;background:rgba(255,255,255,0.02);border:1px solid var(--line);border-radius:11px;padding:12px;display:flex">' + inner + '</div>'; };

  function statusRow(label, status, tone) {
    var col = tone === 'c' ? C : tone === 'm' ? U : T;
    return '<div style="display:flex;align-items:center;gap:12px;padding:12px 15px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,0.02)">' +
      '<span style="width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:' + (tone === 'c' ? 'rgba(240,137,137,0.16)' : tone === 'm' ? 'rgba(255,255,255,0.05)' : 'rgba(71,185,187,0.18)') + ';color:' + col + ';font-size:11px">' + (tone === 'c' ? '!' : tone === 'm' ? '•' : '✓') + '</span>' +
      '<span style="font-size:13.5px;color:' + F + '">' + label + '</span>' +
      '<span style="margin-left:auto;font-size:12px;font-family:var(--mono);color:' + col + '">' + status + '</span></div>';
  }

  var BUILDERS = {
    review: function () {
      return shell('Demand Review', ['Forecast', 'Business input', 'Final plan'],
        kpis([{label:'Forecast units', val:'128.4k', delta:'+4.2%'},{label:'Bias', val:'-1.8%', delta:'-0.6%'},{label:'Accuracy', val:'92.1%', delta:'+1.1%'}]) +
        chartBox(chart(A, B, true)) +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><span class="ui-pill coral">3 exceptions</span><span class="ui-pill muted">12 SKUs to review</span><span class="ui-pill teal">Owner: Demand team</span></div>', 1);
    },
    drivers: function () {
      return shell('Demand Drivers', ['Ranked', 'Seasonal', 'Events'],
        '<div style="font-size:12px;color:' + U + '">Impact on the selected forecast</div>' +
        bars([{label:'Promotion calendar', val:'+18%', pct:78}, {label:'Price change', val:'+11%', pct:54}, {label:'Seasonality', val:'+9%', pct:44}, {label:'Competitor activity', val:'-6%', pct:30, tone:'c'}, {label:'Weather index', val:'+3%', pct:18}]) +
        chartBox(chart(D, B)), 2);
    },
    experiments: function () {
      return shell('Forecast Lab', ['Experiments', 'Compare', 'Accuracy'],
        table(['Experiment', 'Method', 'MAPE'], [
          [{v:'EXP-204'}, 'Gradient boost', {v:'7.9%', t:'t'}],
          [{v:'EXP-203'}, 'Ensemble', {v:'8.4%'}],
          [{v:'EXP-201'}, 'Seasonal naive', {v:'12.1%', t:'c'}],
          [{v:'EXP-198'}, 'Driver regression', {v:'9.2%'}]
        ]) + chartBox(chart(B, A)), 2);
    },
    scenario: function () {
      return shell('Scenario Planning', ['Baseline', 'Scenario A', 'Scenario B'],
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><span class="ui-pill teal">Baseline</span><span class="ui-pill muted">+ Promo uplift</span><span class="ui-pill muted">− Supply cap</span><span class="ui-pill muted">+ New listing</span></div>' +
        chartBox(chart(A, B, true)) +
        kpis([{label:'Scenario A Δ', val:'+6.4k', delta:'+5.1%'},{label:'Scenario B Δ', val:'-2.1k', delta:'-1.7%'},{label:'Decision', val:'Review'}]), 3);
    },
    inventory: function () {
      return shell('Inventory Review', ['Projection', 'Exposure', 'Targets'],
        kpis([{label:'At-risk SKUs', val:'14', delta:'+3'},{label:'Coverage', val:'5.8 wks', delta:'-0.4'},{label:'Service level', val:'97.2%', delta:'+0.5%'}]) +
        chartBox(chart(B.map(function(v){return 1-v*0.7;}), A.map(function(v){return 0.55;}))) +
        '<div style="display:flex;flex-direction:column;gap:9px">' +
          statusRow('SKU-5102 · projected shortage in wk 3', 'Action', 'c') +
          statusRow('SKU-4820 · within target band', 'Healthy', 't') +
          statusRow('SKU-6001 · excess vs target plan', 'Review', 'm') +
        '</div>', 3);
    },
    results: function () {
      return shell('Forecast Run Results', ['Latest', 'Previous', 'Diff'],
        kpis([{label:'MAPE', val:'7.9%', delta:'-0.5%'},{label:'Coverage', val:'98%', delta:'+2%'},{label:'Runtime', val:'42s'}]) +
        chartBox(chart(A, B, true)), 1);
    },
    integrations: function () {
      return shell('Integrations & API', ['Sources', 'Mapping', 'Status'],
        '<div style="display:flex;flex-direction:column;gap:9px">' +
          statusRow('SAP S/4HANA · demand history', 'Connected', 't') +
          statusRow('Data warehouse · master data', 'Connected', 't') +
          statusRow('Commercial plan · spreadsheet import', 'Mapped', 't') +
          statusRow('External signals · API', 'Syncing', 'm') +
        '</div>' +
        bars([{label:'Master data mapped', val:'100%', pct:100}, {label:'Validated rows', val:'98%', pct:98}, {label:'Quality warnings', val:'3', pct:9, tone:'c'}]), 4);
    },
    deployment: function () {
      var rows = [['Validate scenario', 'Passed', 't'], ['Lock assumptions', 'Passed', 't'], ['Generate plan', 'Running', 't'], ['Publish to review', 'Queued', 'm']];
      return shell('Planning Deployment', ['Pipeline', 'History'],
        '<div style="display:flex;flex-direction:column;gap:10px">' + rows.map(function (r) { return statusRow(r[0], r[1], r[2]); }).join('') + '</div>', 4);
    },
    chat: function () {
      return '<div style="display:flex;min-height:340px">' +
        '<div style="flex:1.2;border-right:1px solid var(--line);padding:18px;display:flex;flex-direction:column;gap:14px">' +
          '<span style="font-size:14px;font-weight:600;color:' + F + '">Demand Review · SKU-4820</span>' +
          chartBox(chart(A, B, true)) +
          '<div style="display:flex;gap:8px;flex-wrap:wrap"><span class="ui-pill teal">+18% promo</span><span class="ui-pill coral">−6% competitor</span></div>' +
        '</div>' +
        '<div style="flex:1;display:flex;flex-direction:column">' +
          '<div style="padding:14px 16px;border-bottom:1px solid var(--line);font-size:13px;font-weight:600;color:' + T + '">Haidi Gen</div>' +
          '<div style="padding:16px;display:flex;flex-direction:column;gap:12px;flex:1">' +
            '<div style="align-self:flex-end;max-width:82%;background:rgba(71,185,187,0.14);border:1px solid rgba(71,185,187,0.25);border-radius:14px 14px 4px 14px;padding:10px 13px;font-size:13px;color:' + F + '">What changed in this forecast?</div>' +
            '<div style="align-self:flex-start;max-width:90%;background:rgba(255,255,255,0.04);border:1px solid var(--line);border-radius:14px 14px 14px 4px;padding:10px 13px;font-size:13px;color:' + M + ';line-height:1.5">The promotion calendar driver added +18%, partly offset by a −6% competitor signal. Seasonality is in line with prior periods.</div>' +
            '<div style="margin-top:auto;border:1px solid var(--line);border-radius:10px;padding:10px 13px;font-size:12px;color:' + U + '">Ask about drivers, scenarios, exceptions…</div>' +
          '</div>' +
        '</div></div>';
    },
    data: function () {
      return shell('Master Data', ['Products', 'Locations', 'Hierarchy'],
        table(['SKU', 'Category', 'Status'], [
          [{v:'SKU-4820'}, 'Beverages', {v:'Active', t:'t'}],
          [{v:'SKU-4821'}, 'Beverages', {v:'Active', t:'t'}],
          [{v:'SKU-5102'}, 'Snacks', {v:'Review', t:'c'}],
          [{v:'SKU-5530'}, 'Frozen', {v:'Active', t:'t'}]
        ]), 1);
    },
    import: function () {
      return shell('Data Import', ['Upload', 'Map', 'Validate'],
        '<div style="border:1px dashed rgba(71,185,187,0.4);border-radius:11px;padding:20px;text-align:center;font-size:13px;color:' + U + ';background:rgba(71,185,187,0.05)">demand_history_2026.csv · 14,820 rows</div>' +
        bars([{label:'Mapped columns', val:'12/12', pct:100}, {label:'Validated rows', val:'98%', pct:98}, {label:'Warnings', val:'3', pct:9, tone:'c'}]), 1);
    },
    measures: function () {
      return shell('Measures', ['Definitions', 'Calculations'],
        table(['Measure', 'Type', 'Owner'], [
          [{v:'Final Forecast'}, 'Calculated', {v:'System'}],
          [{v:'Business Override'}, 'Input', {v:'Planner'}],
          [{v:'Baseline'}, 'Statistical', {v:'System'}],
          [{v:'Promo Uplift'}, 'Driver', {v:'Planner'}]
        ]), 1);
    }
  };

  /* compact fragments for the Planning Tools section */
  function frag(title, body) {
    return '<div style="border:1px solid var(--line);border-radius:11px;overflow:hidden;background:var(--bg-1)">' +
      '<div style="display:flex;align-items:center;gap:8px;padding:11px 14px;border-bottom:1px solid var(--line);font-size:12.5px;font-weight:600;color:' + F + '">' +
        '<span style="width:7px;height:7px;border-radius:2px;background:' + T + '"></span>' + title + '</div>' +
      '<div style="padding:14px">' + body + '</div></div>';
  }
  var FRAGMENTS = {
    'master-data': function () { return frag('Master Data', table(['SKU', 'Status'], [[{v:'SKU-4820'},{v:'Active',t:'t'}],[{v:'SKU-5102'},{v:'Review',t:'c'}],[{v:'SKU-5530'},{v:'Active',t:'t'}]])); },
    'data-import': function () { return frag('Data Import', '<div style="border:1px dashed rgba(71,185,187,0.4);border-radius:9px;padding:14px;text-align:center;font-size:12px;color:' + U + ';background:rgba(71,185,187,0.05);margin-bottom:12px">demand_history.csv</div>' + bars([{label:'Mapped', val:'12/12', pct:100},{label:'Valid', val:'98%', pct:98}])); },
    'measures': function () { return frag('Measures', table(['Measure', 'Type'], [[{v:'Final Forecast'},'Calculated'],[{v:'Override'},'Input'],[{v:'Baseline'},'Statistical']])); },
    'settings': function () {
      var toggle = function (l, on) { return '<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;font-size:13px;color:' + M + '"><span>' + l + '</span><span style="width:34px;height:19px;border-radius:999px;background:' + (on ? T : 'rgba(255,255,255,0.12)') + ';position:relative"><span style="position:absolute;top:2px;' + (on ? 'right:2px' : 'left:2px') + ';width:15px;height:15px;border-radius:50%;background:#fff"></span></span></div>'; };
      return frag('Settings', toggle('Auto-run forecast', true) + toggle('Exception alerts', true) + toggle('Lock published plan', false));
    },
    'roles': function () { return frag('Roles & Permissions', table(['Member', 'Role'], [[{v:'A. Meier'},{v:'Planner',t:'t'}],[{v:'L. Roth'},'Reviewer'],[{v:'S. Frei'},'Admin']])); },
    'config': function () { return frag('Planning Configuration', bars([{label:'Demand cycle', val:'Weekly', pct:70},{label:'Horizon', val:'52 wks', pct:88},{label:'Aggregation', val:'SKU × DC', pct:60}])); }
  };

  window.haidiMock = function (type) { return (BUILDERS[type] || BUILDERS.review)(); };
  window.haidiFrag = function (type) { return (FRAGMENTS[type] || FRAGMENTS['master-data'])(); };
  window.haidiHydrateMocks = function (root) {
    (root || document).querySelectorAll('[data-mock]').forEach(function (el) {
      if (!el.dataset.hydrated) { el.innerHTML = window.haidiMock(el.dataset.mock); el.dataset.hydrated = '1'; }
    });
    (root || document).querySelectorAll('[data-frag]').forEach(function (el) {
      if (!el.dataset.hydrated) { el.innerHTML = window.haidiFrag(el.dataset.frag); el.dataset.hydrated = '1'; }
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { window.haidiHydrateMocks(); });
  else window.haidiHydrateMocks();
})();
