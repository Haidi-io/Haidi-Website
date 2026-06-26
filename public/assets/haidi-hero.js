/* Haidi — hero canvas animations (brand palette, reduced-motion safe). */
(function () {
  var canvas = document.querySelector('.hero-canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var TEAL = '71,185,187', CORAL = '240,137,137', INK = '244,246,250';
  var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  var small = false;
  var state = {};

  function mode() {
    var a = document.documentElement.getAttribute('data-hero-animation');
    if (!a || a === 'none') return null;
    return a;
  }

  function mono() {
    return getComputedStyle(document.body).getPropertyValue('--mono') || 'monospace';
  }

  function resize() {
    var r = canvas.getBoundingClientRect();
    W = r.width; H = r.height; small = W < 760;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  function build() {
    var m = mode();
    if (m === 'canvas') buildCanvas();
    else if (m === 'orbit') buildOrbit();
    else if (m === 'streams') buildStreams();
    else if (m === 'waves') buildWaves();
    else if (m === 'grid') buildGrid();
  }

  /* ── canvas (forecast workspace) ─────────────────────────── */
  function buildCanvas() {
    var n = small ? 4 : 6;
    state.sources = [];
    for (var i = 0; i < n; i++) {
      var y = H * (0.20 + (0.62 * i) / (n - 1));
      state.sources.push({ x: W * (small ? 0.12 : 0.10), y: y, r: 2.4 + Math.random() * 1.6, ph: Math.random() * 6.28, amp: 0.5 + Math.random() * 0.6 });
    }
    state.drivers = [];
    var dn = small ? 2 : 3;
    for (var j = 0; j < dn; j++) {
      state.drivers.push({ x: W * (small ? 0.30 : 0.27), y: H * (0.34 + (0.34 * j) / (dn - 1)), ph: Math.random() * 6.28 });
    }
    state.dots = [];
    state.sources.forEach(function (s, i) {
      for (var k = 0; k < 1 + (i % 2); k++) state.dots.push({ src: i, t: Math.random(), spd: 0.0011 + Math.random() * 0.0013 });
    });
  }

  var BASE = [0.30, 0.40, 0.34, 0.50, 0.56, 0.50, 0.62];
  function hub() { return { x: W * (small ? 0.46 : 0.40), y: H * 0.52 }; }
  function splitX() { return W * (small ? 0.74 : 0.66); }
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
    return {
      x: u * u * u * x1 + 3 * u * u * t * mx + 3 * u * t * t * mx + t * t * t * x2,
      y: u * u * u * y1 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y2
    };
  }

  function tickCanvas() {
    state.dots.forEach(function (d) { d.t += d.spd; if (d.t > 1) d.t = 0; });
  }

  function frameCanvas(time) {
    ctx.clearRect(0, 0, W, H);
    var hb = hub(), sx = splitX();
    ctx.lineWidth = 1;
    state.sources.forEach(function (s) {
      var d = state.drivers[Math.floor((s.y / H) * state.drivers.length) % state.drivers.length] || state.drivers[0];
      ctx.strokeStyle = 'rgba(' + TEAL + ',0.18)'; curve(s.x, s.y, d.x, d.y); ctx.stroke();
    });
    state.drivers.forEach(function (d) {
      ctx.strokeStyle = 'rgba(' + TEAL + ',0.24)'; curve(d.x, d.y, hb.x, hb.y); ctx.stroke();
    });
    state.dots.forEach(function (dt) {
      var s = state.sources[dt.src];
      var d = state.drivers[Math.floor((s.y / H) * state.drivers.length) % state.drivers.length] || state.drivers[0];
      var p = bezPt(s.x, s.y, d.x, d.y, dt.t);
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, 6.2832);
      ctx.fillStyle = 'rgba(' + TEAL + ',' + (0.5 + 0.4 * Math.sin(dt.t * 3.14)) + ')'; ctx.fill();
    });
    state.sources.forEach(function (s) {
      var pulse = reduced ? 1 : 1 + 0.35 * Math.sin(time * 0.002 * s.amp + s.ph);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * pulse, 0, 6.2832);
      ctx.fillStyle = 'rgba(' + INK + ',0.5)'; ctx.fill();
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * pulse + 4, 0, 6.2832);
      ctx.strokeStyle = 'rgba(' + TEAL + ',0.18)'; ctx.lineWidth = 1; ctx.stroke();
    });
    state.drivers.forEach(function (d) {
      var pulse = reduced ? 1 : 1 + 0.3 * Math.sin(time * 0.0024 + d.ph);
      ctx.beginPath(); ctx.arc(d.x, d.y, 3.4 * pulse, 0, 6.2832);
      ctx.fillStyle = 'rgba(' + TEAL + ',0.85)'; ctx.shadowColor = 'rgba(' + TEAL + ',0.6)'; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
    });
    ctx.beginPath(); ctx.arc(hb.x, hb.y, 5, 0, 6.2832);
    ctx.fillStyle = 'rgba(' + TEAL + ',0.95)'; ctx.shadowColor = 'rgba(' + TEAL + ',0.7)'; ctx.shadowBlur = 16; ctx.fill(); ctx.shadowBlur = 0;

    var span = W * 0.96 - hb.x, steps = 60;
    ctx.beginPath();
    for (var i = 0; i <= steps; i++) {
      var x = hb.x + span * i / steps, p = (x - hb.x) / span;
      var y = forecastY(p, time), w = x < sx ? 0 : (x - sx) / (W * 0.96 - sx) * H * 0.10;
      i === 0 ? ctx.moveTo(x, y - w) : ctx.lineTo(x, y - w);
    }
    for (var j = steps; j >= 0; j--) {
      var x2 = hb.x + span * j / steps, p2 = (x2 - hb.x) / span;
      var y2 = forecastY(p2, time), w2 = x2 < sx ? 0 : (x2 - sx) / (W * 0.96 - sx) * H * 0.10;
      ctx.lineTo(x2, y2 + w2);
    }
    ctx.closePath(); ctx.fillStyle = 'rgba(' + TEAL + ',0.10)'; ctx.fill();

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

    var splY = forecastY((sx - hb.x) / span, time), endX = W * 0.97;
    (small ? [-0.12, 0.10] : [-0.16, 0.04, 0.16]).forEach(function (sl, idx) {
      var ey = Math.max(H * 0.16, Math.min(H * 0.84, splY + (endX - sx) * sl));
      ctx.setLineDash([4, 6]); ctx.beginPath();
      ctx.moveTo(sx, splY);
      ctx.bezierCurveTo(sx + (endX - sx) * 0.4, splY, sx + (endX - sx) * 0.6, ey, endX, ey);
      ctx.strokeStyle = 'rgba(' + (idx === 1 ? TEAL : idx === 0 ? CORAL : INK) + ',0.30)'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(endX, ey, 3, 0, 6.2832);
      ctx.fillStyle = 'rgba(' + (idx === 1 ? TEAL : idx === 0 ? CORAL : INK) + ',0.7)'; ctx.fill();
    });
    ctx.beginPath(); ctx.arc(sx, splY, 4, 0, 6.2832);
    ctx.fillStyle = 'rgba(' + INK + ',0.85)'; ctx.shadowColor = 'rgba(' + TEAL + ',0.6)'; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
    if (!small) {
      ctx.font = '600 10px ' + mono();
      ctx.fillStyle = 'rgba(' + INK + ',0.4)'; ctx.textAlign = 'center';
      ctx.fillText('NOW', sx, splY - 14);
    }
  }

  /* ── orbit ───────────────────────────────────────────────── */
  function buildOrbit() {
    state.rings = [
      { r: Math.min(W, H) * 0.18, n: small ? 4 : 5, speed: 0.00035, ph: 0 },
      { r: Math.min(W, H) * 0.30, n: small ? 5 : 7, speed: -0.00028, ph: 1.2 },
      { r: Math.min(W, H) * 0.42, n: small ? 3 : 4, speed: 0.00022, ph: 2.4 }
    ];
    state.cx = W * 0.5; state.cy = H * 0.52;
  }

  function frameOrbit(time) {
    ctx.clearRect(0, 0, W, H);
    state.rings.forEach(function (ring, ri) {
      ctx.beginPath(); ctx.arc(state.cx, state.cy, ring.r, 0, 6.2832);
      ctx.strokeStyle = 'rgba(' + TEAL + ',' + (0.08 + ri * 0.03) + ')'; ctx.lineWidth = 1; ctx.stroke();
      for (var i = 0; i < ring.n; i++) {
        var ang = ring.ph + (i / ring.n) * 6.2832 + time * ring.speed;
        var x = state.cx + Math.cos(ang) * ring.r;
        var y = state.cy + Math.sin(ang) * ring.r * 0.55;
        var pulse = reduced ? 1 : 1 + 0.2 * Math.sin(time * 0.003 + i);
        ctx.beginPath(); ctx.arc(x, y, (ri === 0 ? 2.8 : 2.2) * pulse, 0, 6.2832);
        ctx.fillStyle = 'rgba(' + (i % 4 === 0 ? CORAL : TEAL) + ',' + (0.55 + ri * 0.12) + ')'; ctx.fill();
      }
    });
    var hubPulse = reduced ? 1 : 1 + 0.15 * Math.sin(time * 0.002);
    ctx.beginPath(); ctx.arc(state.cx, state.cy, 6 * hubPulse, 0, 6.2832);
    ctx.fillStyle = 'rgba(' + TEAL + ',0.9)'; ctx.shadowColor = 'rgba(' + TEAL + ',0.5)'; ctx.shadowBlur = 18; ctx.fill(); ctx.shadowBlur = 0;
  }

  /* ── streams (signal flow) ───────────────────────────────── */
  function buildStreams() {
    var n = small ? 5 : 8;
    state.streams = [];
    for (var i = 0; i < n; i++) {
      var y0 = H * (0.15 + (0.7 * i) / (n - 1));
      state.streams.push({
        y0: y0, y1: H * 0.52 + (Math.random() - 0.5) * H * 0.08,
        y2: H * 0.48 + (Math.random() - 0.5) * H * 0.12,
        y3: H * 0.50 + (Math.random() - 0.5) * H * 0.06,
        t: Math.random(), spd: 0.0008 + Math.random() * 0.001,
        col: i % 5 === 0 ? CORAL : TEAL
      });
    }
  }

  function streamPt(s, t) {
    var x = W * (-0.05 + t * 1.1);
    var u = 1 - t;
    var y = u * u * u * s.y0 + 3 * u * u * t * s.y1 + 3 * u * t * t * s.y2 + t * t * t * s.y3;
    return { x: x, y: y };
  }

  function tickStreams() {
    state.streams.forEach(function (s) { s.t += s.spd; if (s.t > 1) s.t = 0; });
  }

  function frameStreams(time) {
    ctx.clearRect(0, 0, W, H);
    state.streams.forEach(function (s) {
      ctx.beginPath();
      for (var i = 0; i <= 40; i++) {
        var p = streamPt(s, i / 40);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = 'rgba(' + s.col + ',0.14)'; ctx.lineWidth = 1; ctx.stroke();

      var head = streamPt(s, s.t);
      ctx.beginPath(); ctx.arc(head.x, head.y, 2.2, 0, 6.2832);
      ctx.fillStyle = 'rgba(' + s.col + ',0.75)'; ctx.fill();

      var tail = streamPt(s, Math.max(0, s.t - 0.06));
      ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(head.x, head.y);
      ctx.strokeStyle = 'rgba(' + s.col + ',0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    });
    ctx.beginPath(); ctx.arc(W * 0.72, H * 0.50, 5, 0, 6.2832);
    ctx.fillStyle = 'rgba(' + TEAL + ',0.85)'; ctx.shadowColor = 'rgba(' + TEAL + ',0.5)'; ctx.shadowBlur = 14; ctx.fill(); ctx.shadowBlur = 0;
  }

  /* ── waves (forecast bands) ──────────────────────────────── */
  function buildWaves() {
    state.waves = [
      { amp: 0.045, freq: 2.2, speed: 0.00045, y: 0.42, col: TEAL, alpha: 0.22, w: 2 },
      { amp: 0.06, freq: 1.6, speed: -0.00035, y: 0.52, col: TEAL, alpha: 0.35, w: 2.4 },
      { amp: 0.035, freq: 3.1, speed: 0.00055, y: 0.62, col: CORAL, alpha: 0.18, w: 1.6 }
    ];
  }

  function waveY(wv, x, time) {
    var p = x / W;
    return H * (wv.y + Math.sin(p * Math.PI * 2 * wv.freq + time * wv.speed) * wv.amp);
  }

  function frameWaves(time) {
    ctx.clearRect(0, 0, W, H);
    state.waves.forEach(function (wv) {
      ctx.beginPath();
      for (var x = 0; x <= W; x += 4) {
        x === 0 ? ctx.moveTo(x, waveY(wv, x, time)) : ctx.lineTo(x, waveY(wv, x, time));
      }
      ctx.strokeStyle = 'rgba(' + wv.col + ',' + wv.alpha + ')';
      ctx.lineWidth = wv.w; ctx.lineCap = 'round'; ctx.stroke();
    });
    var mid = W * 0.58;
    ctx.setLineDash([4, 6]); ctx.beginPath();
    ctx.moveTo(mid, H * 0.2); ctx.lineTo(mid, H * 0.8);
    ctx.strokeStyle = 'rgba(' + INK + ',0.12)'; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
    if (!small) {
      ctx.font = '600 10px ' + mono();
      ctx.fillStyle = 'rgba(' + INK + ',0.35)'; ctx.textAlign = 'center';
      ctx.fillText('FORECAST →', mid, H * 0.17);
    }
  }

  /* ── grid (planning lattice pulse) ───────────────────────── */
  function buildGrid() {
    state.grid = [];
    var cols = small ? 14 : 22, rows = small ? 10 : 14;
    var gx = W / (cols - 1), gy = H / (rows - 1);
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        state.grid.push({
          x: c * gx, y: r * gy,
          ph: Math.hypot(c - cols / 2, r - rows / 2) * 0.55 + Math.random() * 0.4
        });
      }
    }
  }

  function frameGrid(time) {
    ctx.clearRect(0, 0, W, H);
    var cx = W * 0.5, cy = H * 0.52;
    state.grid.forEach(function (pt) {
      var pulse = reduced ? 0.25 : 0.25 + 0.35 * Math.sin(time * 0.0025 + pt.ph);
      var dist = Math.hypot(pt.x - cx, pt.y - cy);
      var fade = Math.max(0, 1 - dist / (Math.min(W, H) * 0.55));
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 1.2 + pulse * 1.4, 0, 6.2832);
      ctx.fillStyle = 'rgba(' + TEAL + ',' + (pulse * fade * 0.55) + ')'; ctx.fill();
    });
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 6.2832);
    ctx.fillStyle = 'rgba(' + TEAL + ',0.8)'; ctx.shadowColor = 'rgba(' + TEAL + ',0.45)'; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
  }

  var TICK = {
    canvas: tickCanvas,
    streams: tickStreams
  };
  var FRAME = {
    canvas: frameCanvas,
    orbit: frameOrbit,
    streams: frameStreams,
    waves: frameWaves,
    grid: frameGrid
  };

  function draw(time) {
    var m = mode();
    if (!m || !FRAME[m]) return;
    if (!reduced && TICK[m]) TICK[m](time);
    FRAME[m](time || 0);
  }

  var raf, running = false, visible = true;

  function loop(time) {
    if (!running) return;
    draw(time);
    raf = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (reduced || running || !visible || !mode()) return;
    running = true;
    raf = requestAnimationFrame(loop);
  }

  function stopLoop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  function refresh() {
    resize();
    if (!mode()) {
      stopLoop();
      ctx.clearRect(0, 0, W, H);
      return;
    }
    if (reduced) draw(1200);
    else startLoop();
  }

  resize();
  if (mode()) {
    if (reduced) draw(1200);
    else startLoop();
  }

  window.haidiHeroSetActive = function (anim) {
    if (anim && anim !== 'none') {
      document.documentElement.setAttribute('data-hero-animation', anim);
    }
    refresh();
  };

  window.addEventListener('haidi:hero-variant', refresh);

  var pending = false;
  function onResize() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () {
      pending = false;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      refresh();
    });
  }
  window.addEventListener('resize', onResize);
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(onResize).observe(canvas);
  }
  document.addEventListener('visibilitychange', function () {
    visible = !document.hidden;
    if (visible) startLoop();
    else stopLoop();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0] && entries[0].isIntersecting && !document.hidden;
      if (visible) startLoop();
      else stopLoop();
    }, { threshold: 0.05 }).observe(canvas);
  }
})();
