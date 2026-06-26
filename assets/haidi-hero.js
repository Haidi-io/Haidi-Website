/* Haidi — hero canvas animations (brand palette, reduced-motion safe). */
(function () {
  var canvas = document.querySelector('.hero-canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var TEAL = '71,185,187', CORAL = '240,137,137', INK = '244,246,250';
  var TAU = Math.PI * 2;
  var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  var small = false;
  var state = {};
  var ptr = { tx: 0, ty: 0, x: 0, y: 0 }, PARALLAX = 14;

  function mode() {
    var a = document.documentElement.getAttribute('data-hero-animation');
    if (!a || a === 'none') return null;
    return a;
  }

  // Active 2D mode: a mode this engine actually draws. 3D modes (handled by the
  // bundled three.js module) have no FRAME entry, so the 2D engine clears + stops.
  function active() { var m = mode(); return m && FRAME[m] ? m : null; }

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
    else if (m === 'streams') buildStreams();
    else if (m === 'waves') buildWaves();
    else if (m === 'network') buildNetwork();
    else if (m === 'flow') buildFlow();
    else if (m === 'supply') buildSupply();
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

  /* ── network (connected data nodes) ──────────────────────── */
  function buildNetwork() {
    var n = small ? 16 : 30;
    state.nodes = [];
    for (var i = 0; i < n; i++) {
      state.nodes.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28,
        r: 1.4 + Math.random() * 1.5, ph: Math.random() * TAU, hub: i % 9 === 0
      });
    }
  }

  function tickNetwork() {
    state.nodes.forEach(function (p) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x += W; if (p.x > W) p.x -= W;
      if (p.y < 0) p.y += H; if (p.y > H) p.y -= H;
    });
  }

  function frameNetwork(time) {
    var nodes = state.nodes, D = small ? 120 : 165;
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        var dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > D) continue;
        var a = (1 - dist / D), coral = nodes[i].hub || nodes[j].hub;
        ctx.strokeStyle = 'rgba(' + (coral ? CORAL : TEAL) + ',' + (a * 0.2) + ')';
        ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
      }
    }
    nodes.forEach(function (p) {
      var pulse = reduced ? 1 : 1 + 0.35 * Math.sin(time * 0.002 + p.ph);
      if (p.hub) {
        ctx.beginPath(); ctx.arc(p.x, p.y, (p.r + 1.4) * pulse, 0, TAU);
        ctx.fillStyle = 'rgba(' + CORAL + ',0.85)';
        ctx.shadowColor = 'rgba(' + CORAL + ',0.5)'; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * pulse, 0, TAU);
        ctx.fillStyle = 'rgba(' + INK + ',0.5)'; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * pulse + 3.5, 0, TAU);
        ctx.strokeStyle = 'rgba(' + TEAL + ',0.18)'; ctx.stroke();
      }
    });
  }

  /* ── flow (signal flow field) ────────────────────────────── */
  function flowField(x, y, time) {
    return (Math.sin(x * 0.004 + time * 0.0003) +
            Math.cos(y * 0.005 - time * 0.0004) +
            Math.sin((x + y) * 0.0028 + time * 0.0002)) * 1.5;
  }
  function buildFlow() {
    var n = small ? 70 : 130, sp = small ? 0.7 : 0.9;
    state.parts = [];
    for (var i = 0; i < n; i++) {
      var p = { x: Math.random() * W, y: Math.random() * H, trail: [], life: 40 + Math.random() * 140, col: i % 7 === 0 ? CORAL : TEAL };
      // Seed a static streak so the reduced-motion still frame (no tick) isn't blank.
      if (reduced) {
        var x = p.x, y = p.y;
        for (var k = 0; k < 11; k++) {
          var a = flowField(x, y, 1200);
          x += Math.cos(a) * sp * 2; y += Math.sin(a) * sp * 2;
          p.trail.push({ x: x, y: y });
        }
      }
      state.parts.push(p);
    }
  }
  function tickFlow(time) {
    var sp = small ? 0.7 : 0.9;
    state.parts.forEach(function (p) {
      var a = flowField(p.x, p.y, time);
      p.x += Math.cos(a) * sp; p.y += Math.sin(a) * sp; p.life--;
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 12) p.trail.shift();
      if (p.life <= 0 || p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) {
        p.x = Math.random() * W; p.y = Math.random() * H; p.trail = []; p.life = 40 + Math.random() * 140;
      }
    });
  }
  function frameFlow() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = 'round';
    state.parts.forEach(function (p) {
      var tr = p.trail;
      if (tr.length < 2) {
        if (tr.length === 1) { ctx.beginPath(); ctx.arc(tr[0].x, tr[0].y, 1.3, 0, TAU); ctx.fillStyle = 'rgba(' + p.col + ',0.6)'; ctx.fill(); }
        return;
      }
      for (var i = 1; i < tr.length; i++) {
        var a = (i / tr.length) * 0.5;
        ctx.strokeStyle = 'rgba(' + p.col + ',' + a + ')'; ctx.lineWidth = 1.2 * (i / tr.length) + 0.3;
        ctx.beginPath(); ctx.moveTo(tr[i - 1].x, tr[i - 1].y); ctx.lineTo(tr[i].x, tr[i].y); ctx.stroke();
      }
      var h = tr[tr.length - 1];
      ctx.beginPath(); ctx.arc(h.x, h.y, 1.5, 0, TAU); ctx.fillStyle = 'rgba(' + p.col + ',0.8)'; ctx.fill();
    });
  }

  /* ── supply (end-to-end chain: sources → hubs → demand) ──── */
  function buildSupply() {
    var colX = [W * 0.16, W * 0.5, W * 0.84];
    function col(cx, count, type) {
      var arr = [];
      for (var i = 0; i < count; i++) {
        arr.push({ x: cx, y: H * (0.22 + 0.56 * (count === 1 ? 0.5 : i / (count - 1))), type: type, ph: Math.random() * TAU });
      }
      return arr;
    }
    state.sources = col(colX[0], small ? 3 : 5, 'src');
    state.hubs = col(colX[1], small ? 2 : 3, 'hub');
    state.demand = col(colX[2], small ? 3 : 5, 'dem');
    state.routes = [];
    var ri = 0;
    function mkRoute(a, b, coral) {
      var ships = [], k = 1 + (Math.random() < 0.4 ? 1 : 0);
      for (var j = 0; j < k; j++) ships.push({ t: Math.random(), spd: 0.0016 + Math.random() * 0.0018 });
      return { a: a, b: b, coral: coral, ships: ships };
    }
    state.sources.forEach(function (a, i) { state.routes.push(mkRoute(a, state.hubs[i % state.hubs.length], ri++ % 7 === 3)); });
    state.demand.forEach(function (b, i) { state.routes.push(mkRoute(state.hubs[i % state.hubs.length], b, ri++ % 7 === 3)); });
  }
  function tickSupply() {
    state.routes.forEach(function (r) {
      r.ships.forEach(function (s) { s.t += s.spd; if (s.t > 1) s.t = 0; });
    });
  }
  function frameSupply(time) {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    state.routes.forEach(function (r) {
      curve(r.a.x, r.a.y, r.b.x, r.b.y);
      ctx.strokeStyle = 'rgba(' + (r.coral ? CORAL : TEAL) + ',' + (r.coral ? 0.28 : 0.18) + ')'; ctx.stroke();
    });
    state.routes.forEach(function (r) {
      r.ships.forEach(function (sh) {
        var p = bezPt(r.a.x, r.a.y, r.b.x, r.b.y, sh.t), col = r.coral ? CORAL : TEAL;
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.9, 0, TAU);
        ctx.fillStyle = 'rgba(' + col + ',' + (0.5 + 0.4 * Math.sin(sh.t * Math.PI)) + ')'; ctx.fill();
      });
    });
    function drawNode(p) {
      var pulse = reduced ? 1 : 1 + 0.3 * Math.sin(time * 0.0022 + p.ph);
      if (p.type === 'hub') {
        var r = 5.5 * pulse;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(p.x - r, p.y - r, r * 2, r * 2, 2); else ctx.rect(p.x - r, p.y - r, r * 2, r * 2);
        ctx.fillStyle = 'rgba(' + TEAL + ',0.9)'; ctx.shadowColor = 'rgba(' + TEAL + ',0.6)'; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, 3.2 * pulse, 0, TAU);
        ctx.fillStyle = 'rgba(' + (p.type === 'dem' ? INK : TEAL) + ',0.8)'; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, 3.2 * pulse + 3.5, 0, TAU);
        ctx.strokeStyle = 'rgba(' + TEAL + ',0.2)'; ctx.stroke();
      }
    }
    state.sources.forEach(drawNode); state.hubs.forEach(drawNode); state.demand.forEach(drawNode);
    if (!small) {
      ctx.font = '600 9px ' + mono();
      ctx.fillStyle = 'rgba(' + INK + ',0.35)'; ctx.textAlign = 'center';
      ctx.fillText('SOURCES', state.sources[0].x, H * 0.12);
      ctx.fillText('HUBS', state.hubs[0].x, H * 0.12);
      ctx.fillText('DEMAND', state.demand[0].x, H * 0.12);
    }
  }

  var TICK = {
    canvas: tickCanvas,
    streams: tickStreams,
    network: tickNetwork,
    flow: tickFlow,
    supply: tickSupply
  };
  var FRAME = {
    canvas: frameCanvas,
    streams: frameStreams,
    waves: frameWaves,
    network: frameNetwork,
    flow: frameFlow,
    supply: frameSupply
  };

  function draw(time) {
    var m = mode();
    if (!m || !FRAME[m]) return;
    if (!reduced && TICK[m]) TICK[m](time);
    ctx.save();
    ctx.translate(ptr.x * PARALLAX, ptr.y * PARALLAX);
    FRAME[m](time || 0);
    ctx.restore();
  }

  var raf, running = false, visible = true;

  function loop(time) {
    if (!running) return;
    // Pointer parallax (lerp toward target); only runs while the loop runs, so
    // reduced-motion (single static draw) gets no parallax.
    ptr.x += (ptr.tx - ptr.x) * 0.06;
    ptr.y += (ptr.ty - ptr.y) * 0.06;
    draw(time);
    raf = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (reduced || running || !visible || !active()) return;
    running = true;
    raf = requestAnimationFrame(loop);
  }

  function stopLoop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  function refresh() {
    resize();
    if (!active()) {
      stopLoop();
      ctx.clearRect(0, 0, W, H);
      return;
    }
    if (reduced) draw(1200);
    else startLoop();
  }

  resize();
  if (active()) {
    if (reduced) draw(1200);
    else startLoop();
  }

  if (!reduced) {
    window.addEventListener('mousemove', function (e) {
      ptr.tx = (e.clientX / window.innerWidth) * 2 - 1;
      ptr.ty = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
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
