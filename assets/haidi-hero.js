/* Haidi — hero "living planning workspace" canvas.
   Demand signals flow into a breathing forecast line that forks into
   scenario branches; driver nodes pulse. Brand palette only.
   Subtle, professional, reduced-motion safe (renders one static frame). */
(function () {
  var canvas = document.querySelector('.hero-canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var TEAL = '71,185,187', CORAL = '240,137,137', INK = '244,246,250';
  var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  var sources = [], drivers = [], dots = [], small = false;

  function resize() {
    var r = canvas.getBoundingClientRect();
    W = r.width; H = r.height; small = W < 760;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  function build() {
    var n = small ? 4 : 6;
    sources = [];
    for (var i = 0; i < n; i++) {
      var y = H * (0.20 + (0.62 * i) / (n - 1));
      sources.push({ x: W * (small ? 0.12 : 0.10), y: y, r: 2.4 + Math.random() * 1.6, ph: Math.random() * 6.28, amp: 0.5 + Math.random() * 0.6 });
    }
    drivers = [];
    var dn = small ? 2 : 3;
    for (var j = 0; j < dn; j++) {
      drivers.push({ x: W * (small ? 0.30 : 0.27), y: H * (0.34 + (0.34 * j) / (dn - 1)), ph: Math.random() * 6.28 });
    }
    dots = [];
    sources.forEach(function (s, i) {
      var cnt = 1 + (i % 2);
      for (var k = 0; k < cnt; k++) dots.push({ src: i, t: Math.random(), spd: 0.0011 + Math.random() * 0.0013 });
    });
  }

  function hub() { return { x: W * (small ? 0.46 : 0.40), y: H * 0.52 }; }
  function splitX() { return W * (small ? 0.74 : 0.66); }

  // forecast baseline y at given x-fraction p (0..1 across forecast span), animated
  var BASE = [0.30, 0.40, 0.34, 0.50, 0.56, 0.50, 0.62];
  function forecastY(p, time) {
    var seg = p * (BASE.length - 1), i0 = Math.floor(seg), f = seg - i0;
    var a = BASE[i0], b = BASE[Math.min(i0 + 1, BASE.length - 1)];
    var v = a + (b - a) * (f * f * (3 - 2 * f));
    var wob = Math.sin(time * 0.0006 + p * 5) * 0.018 + Math.sin(time * 0.0011 + p * 9) * 0.01;
    return H * (0.80 - (v + wob) * 0.62);
  }

  function curve(x1, y1, x2, y2) {
    var mx = (x1 + x2) / 2;
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2);
  }
  function bezPt(x1, y1, x2, y2, t) {
    var mx = (x1 + x2) / 2, u = 1 - t;
    var x = u*u*u*x1 + 3*u*u*t*mx + 3*u*t*t*mx + t*t*t*x2;
    var y = u*u*u*y1 + 3*u*u*t*y1 + 3*u*t*t*y2 + t*t*t*y2;
    return { x: x, y: y };
  }

  function frame(time) {
    ctx.clearRect(0, 0, W, H);
    var hb = hub(), sx = splitX();

    /* connections: sources -> drivers -> hub */
    ctx.lineWidth = 1;
    sources.forEach(function (s) {
      var d = drivers[Math.floor((s.y / H) * drivers.length) % drivers.length] || drivers[0];
      ctx.strokeStyle = 'rgba(' + TEAL + ',0.12)';
      curve(s.x, s.y, d.x, d.y); ctx.stroke();
    });
    drivers.forEach(function (d) {
      ctx.strokeStyle = 'rgba(' + TEAL + ',0.16)';
      curve(d.x, d.y, hb.x, hb.y); ctx.stroke();
    });

    /* traveling signal dots along source->driver curves */
    dots.forEach(function (dt) {
      var s = sources[dt.src];
      var d = drivers[Math.floor((s.y / H) * drivers.length) % drivers.length] || drivers[0];
      var p = bezPt(s.x, s.y, d.x, d.y, dt.t);
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, 6.2832);
      ctx.fillStyle = 'rgba(' + TEAL + ',' + (0.5 + 0.4 * Math.sin(dt.t * 3.14)) + ')'; ctx.fill();
    });

    /* source + driver nodes */
    sources.forEach(function (s) {
      var pulse = reduced ? 1 : 1 + 0.35 * Math.sin(time * 0.002 * s.amp + s.ph);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * pulse, 0, 6.2832);
      ctx.fillStyle = 'rgba(' + INK + ',0.5)'; ctx.fill();
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * pulse + 4, 0, 6.2832);
      ctx.strokeStyle = 'rgba(' + TEAL + ',0.18)'; ctx.lineWidth = 1; ctx.stroke();
    });
    drivers.forEach(function (d) {
      var pulse = reduced ? 1 : 1 + 0.3 * Math.sin(time * 0.0024 + d.ph);
      ctx.beginPath(); ctx.arc(d.x, d.y, 3.4 * pulse, 0, 6.2832);
      ctx.fillStyle = 'rgba(' + TEAL + ',0.85)'; ctx.shadowColor = 'rgba(' + TEAL + ',0.6)'; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
    });

    /* hub node */
    ctx.beginPath(); ctx.arc(hb.x, hb.y, 5, 0, 6.2832);
    ctx.fillStyle = 'rgba(' + TEAL + ',0.95)'; ctx.shadowColor = 'rgba(' + TEAL + ',0.7)'; ctx.shadowBlur = 16; ctx.fill(); ctx.shadowBlur = 0;

    /* forecast confidence band (forecast portion only) */
    var span = W * 0.96 - hb.x, steps = 60;
    ctx.beginPath();
    for (var i = 0; i <= steps; i++) {
      var x = hb.x + span * i / steps, p = (x - hb.x) / span;
      var y = forecastY(p, time), w = x < sx ? 0 : (x - sx) / (W * 0.96 - sx) * H * 0.10;
      var py = y - w; i === 0 ? ctx.moveTo(x, py) : ctx.lineTo(x, py);
    }
    for (var j = steps; j >= 0; j--) {
      var x2 = hb.x + span * j / steps, p2 = (x2 - hb.x) / span;
      var y2 = forecastY(p2, time), w2 = x2 < sx ? 0 : (x2 - sx) / (W * 0.96 - sx) * H * 0.10;
      ctx.lineTo(x2, y2 + w2);
    }
    ctx.closePath(); ctx.fillStyle = 'rgba(' + TEAL + ',0.07)'; ctx.fill();

    /* forecast line: solid (history) then dashed (forecast) */
    ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath();
    for (var k = 0; k <= steps; k++) {
      var xx = hb.x + span * k / steps;
      if (xx > sx) break;
      var yy = forecastY((xx - hb.x) / span, time);
      k === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy);
    }
    ctx.strokeStyle = 'rgba(' + TEAL + ',0.9)'; ctx.stroke();

    ctx.setLineDash([5, 5]); ctx.beginPath();
    var started = false;
    for (var m = 0; m <= steps; m++) {
      var xm = hb.x + span * m / steps;
      if (xm < sx) continue;
      var ym = forecastY((xm - hb.x) / span, time);
      started ? ctx.lineTo(xm, ym) : (ctx.moveTo(xm, ym), started = true);
    }
    ctx.strokeStyle = 'rgba(' + TEAL + ',0.55)'; ctx.stroke(); ctx.setLineDash([]);

    /* scenario branches diverging from the split point */
    var splY = forecastY((sx - hb.x) / span, time), endX = W * 0.97;
    var slopes = small ? [-0.12, 0.10] : [-0.16, 0.04, 0.16];
    slopes.forEach(function (sl, idx) {
      var ey = splY + (endX - sx) * sl;
      ey = Math.max(H * 0.16, Math.min(H * 0.84, ey));
      ctx.setLineDash([4, 6]); ctx.beginPath();
      ctx.moveTo(sx, splY);
      ctx.bezierCurveTo(sx + (endX - sx) * 0.4, splY, sx + (endX - sx) * 0.6, ey, endX, ey);
      ctx.strokeStyle = 'rgba(' + (idx === 1 ? TEAL : idx === 0 ? CORAL : INK) + ',0.30)'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(endX, ey, 3, 0, 6.2832);
      ctx.fillStyle = 'rgba(' + (idx === 1 ? TEAL : idx === 0 ? CORAL : INK) + ',0.7)'; ctx.fill();
    });

    /* split marker */
    ctx.beginPath(); ctx.arc(sx, splY, 4, 0, 6.2832);
    ctx.fillStyle = 'rgba(' + INK + ',0.85)'; ctx.shadowColor = 'rgba(' + TEAL + ',0.6)'; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
    if (!small) {
      ctx.font = '600 10px ' + (getComputedStyle(document.body).getPropertyValue('--mono') || 'monospace');
      ctx.fillStyle = 'rgba(' + INK + ',0.4)'; ctx.textAlign = 'center';
      ctx.fillText('NOW', sx, splY - 14);
    }
  }

  var raf;
  function loop(time) {
    if (!reduced) dots.forEach(function (d) { d.t += d.spd; if (d.t > 1) d.t = 0; });
    frame(time || 0);
    raf = requestAnimationFrame(loop);
  }

  resize();
  if (reduced) { frame(1200); }
  else { loop(0); }

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { dpr = Math.min(window.devicePixelRatio || 1, 2); resize(); if (reduced) frame(1200); }, 160);
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { cancelAnimationFrame(raf); }
    else if (!reduced) { raf = requestAnimationFrame(loop); }
  });
})();
