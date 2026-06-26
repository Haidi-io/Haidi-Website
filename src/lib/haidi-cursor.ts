import gsap from 'gsap';

export const CURSOR_MODES = ['none', 'crosshair', 'dot-ring', 'trace', 'bracket', 'glow', 'particles', 'orbit', 'ripple'] as const;
export type CursorMode = (typeof CURSOR_MODES)[number];

const STORAGE_KEY = 'haidi-cursor';
const DEFAULT_MODE: CursorMode = 'trace';
const INTERACTIVE =
  'a, button, .btn, [role="button"], input, select, textarea, .product-journey__step, .link-arrow, .ss-card';
const CHROME = '#haidi-tweaks-launch, .twk-panel, .twk-panel *, #haidi-cursor-root, #haidi-cursor-root *';
const HIT_INTERVAL_MS = 48;
const HIT_SLOP = 16;

const HIT_SAMPLES: [number, number][] = (() => {
  const r = HIT_SLOP;
  const d = r * 0.707;
  return [
    [0, 0],
    [r, 0],
    [-r, 0],
    [0, r],
    [0, -r],
    [d, d],
    [-d, d],
    [d, -d],
    [-d, -d],
  ];
})();

const KIND_PRIORITY: Record<HoverKind, number> = {
  primary: 4,
  link: 3,
  journey: 3,
  frame: 2,
  default: 0,
};

type HoverKind = 'default' | 'link' | 'primary' | 'frame' | 'journey';

type Theme = {
  teal: string;
  tealBright: string;
  coral: string;
  line: string;
  glow: string;
  text: string;
  textMuted: string;
};

type PointerState = {
  x: number;
  y: number;
  kind: HoverKind;
  el: Element | null;
  down: boolean;
};

type PointerLoop = PointerState & { destroy: () => void };

let active: { destroy: () => void } | null = null;
let currentMode: CursorMode | null = null;
let styleEl: HTMLStyleElement | null = null;
let cachedTheme: Theme | null = null;

function canUseCustomCursor() {
  return window.matchMedia('(hover: hover)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function theme(): Theme {
  if (cachedTheme) return cachedTheme;
  const s = getComputedStyle(document.documentElement);
  const pick = (n: string, f: string) => s.getPropertyValue(n).trim() || f;
  cachedTheme = {
    teal: pick('--teal', '#47B9BB'),
    tealBright: pick('--teal-bright', '#5FD0D2'),
    coral: pick('--coral', '#F08989'),
    line: pick('--line-2', 'rgba(255,255,255,0.13)'),
    glow: pick('--glow', 'rgba(71,185,187,0.16)'),
    text: pick('--text', '#FAFBFD'),
    textMuted: pick('--text-muted', '#97A1AE'),
  };
  return cachedTheme;
}

function invalidateThemeCache() {
  cachedTheme = null;
}

function ensureStyles() {
  const css = `
@media (hover:hover){
  html[data-cursor]:not([data-cursor="none"]) *{cursor:none!important}
  html[data-cursor]:not([data-cursor="none"]) ${CHROME}{cursor:default!important}
}
#haidi-cursor-root{position:fixed;inset:0;pointer-events:none;z-index:2147483644;overflow:hidden;contain:strict}
.hc{position:fixed;top:0;left:0;pointer-events:none;will-change:transform;transform:translate3d(0,0,0)}
.hc-core{
  width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;
  background:var(--hc-teal-bright);
  box-shadow:
    0 0 0 1.5px rgba(255,255,255,.55),
    0 0 20px var(--hc-glow-strong),
    0 0 36px color-mix(in srgb,var(--hc-teal-bright) 55%,transparent)
}
.hc-ring{
  width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;
  border:2px solid var(--hc-ring-border);box-sizing:border-box;
  box-shadow:0 0 16px color-mix(in srgb,var(--hc-teal) 35%,transparent);
  transition:background .35s cubic-bezier(.16,1,.3,1),border-color .35s,border-radius .4s cubic-bezier(.16,1,.3,1),box-shadow .35s
}
.hc-ring.is-hover{
  background:var(--hc-teal-20);
  border-color:var(--hc-teal-bright);
  box-shadow:0 0 24px color-mix(in srgb,var(--hc-teal-bright) 50%,transparent)
}
.hc-ring.is-primary{
  background:var(--hc-teal-28);
  border-color:var(--hc-teal-bright);
  box-shadow:0 0 28px color-mix(in srgb,var(--hc-teal-bright) 55%,transparent)
}
.hc-ring.is-journey{
  border-color:var(--hc-coral);
  background:color-mix(in srgb,var(--hc-coral) 28%,transparent);
  box-shadow:0 0 20px color-mix(in srgb,var(--hc-coral) 45%,transparent)
}
.hc-reticle{position:relative;width:0;height:0;filter:drop-shadow(0 0 6px var(--hc-glow-strong))}
.hc-reticle__arm{
  position:absolute;background:var(--hc-teal-bright);
  border-radius:1px;transform-origin:center;
  box-shadow:0 0 8px color-mix(in srgb,var(--hc-teal-bright) 80%,transparent)
}
.hc-reticle__arm--t{left:-1px;top:-18px;width:2px;height:11px}
.hc-reticle__arm--b{left:-1px;top:7px;width:2px;height:11px}
.hc-reticle__arm--l{left:-18px;top:-1px;width:11px;height:2px}
.hc-reticle__arm--r{left:7px;top:-1px;width:11px;height:2px}
.hc-reticle__ring{
  position:absolute;left:-20px;top:-20px;width:40px;height:40px;border-radius:50%;
  border:2px solid var(--hc-teal-bright);box-sizing:border-box;
  box-shadow:0 0 18px color-mix(in srgb,var(--hc-teal-bright) 45%,transparent)
}
.hc-pill{
  margin-top:12px;padding:6px 12px;border-radius:999px;
  font:600 11px/1 var(--mono,"JetBrains Mono",ui-monospace,monospace);
  letter-spacing:.12em;text-transform:uppercase;color:var(--hc-teal-bright);
  background:color-mix(in srgb,var(--hc-bg-elevated,#1F232E) 90%,transparent);
  border:1.5px solid color-mix(in srgb,var(--hc-teal-bright) 65%,transparent);
  backdrop-filter:blur(12px);white-space:nowrap;
  box-shadow:0 0 20px var(--hc-glow-strong),0 8px 24px rgba(0,0,0,.35)
}
.hc-aura{
  width:160px;height:160px;margin:-80px 0 0 -80px;border-radius:50%;
  background:radial-gradient(circle,color-mix(in srgb,var(--hc-teal-bright) 55%,transparent) 0%,color-mix(in srgb,var(--hc-teal) 25%,transparent) 40%,transparent 72%);
  filter:blur(10px);opacity:.92
}
.hc-aura-core{
  width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;
  background:var(--hc-teal-bright);
  box-shadow:
    0 0 0 2px rgba(255,255,255,.5),
    0 0 28px var(--hc-glow-strong),
    0 0 48px color-mix(in srgb,var(--hc-teal-bright) 60%,transparent)
}
.hc-canvas{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;contain:strict}
.hc-orbit-dot{
  position:fixed;top:0;left:0;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;
  background:var(--hc-teal-bright);
  box-shadow:0 0 10px var(--hc-glow-strong);
  pointer-events:none;will-change:transform
}
`;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'haidi-cursor-styles';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = css;
}

function removeStyles() {
  styleEl?.remove();
  styleEl = null;
}

function applyThemeVars(root: HTMLElement, t: Theme) {
  root.style.setProperty('--hc-teal', t.teal);
  root.style.setProperty('--hc-teal-bright', t.tealBright);
  root.style.setProperty('--hc-coral', t.coral);
  root.style.setProperty('--hc-line', t.line);
  root.style.setProperty('--hc-glow', t.glow);
  root.style.setProperty('--hc-glow-strong', `color-mix(in srgb, ${t.tealBright} 70%, white)`);
  root.style.setProperty('--hc-ring-border', `color-mix(in srgb, ${t.tealBright} 75%, white)`);
  root.style.setProperty('--hc-text', t.text);
  root.style.setProperty('--hc-teal-20', `color-mix(in srgb, ${t.tealBright} 28%, transparent)`);
  root.style.setProperty('--hc-teal-28', `color-mix(in srgb, ${t.tealBright} 38%, transparent)`);
}

function targetAt(x: number, y: number) {
  const root = document.getElementById('haidi-cursor-root');
  const prev = root?.style.pointerEvents ?? '';
  if (root) root.style.pointerEvents = 'none';

  let best: Element | null = null;
  let bestScore = -Infinity;

  for (const [dx, dy] of HIT_SAMPLES) {
    const el = document.elementFromPoint(x + dx, y + dy);
    if (!el || el.closest(CHROME)) continue;
    const kind = classify(el);
    const score = KIND_PRIORITY[kind] * 100 - Math.hypot(dx, dy);
    if (score > bestScore) {
      bestScore = score;
      best = el;
    }
  }

  if (root) root.style.pointerEvents = prev;
  return best;
}

function classify(el: Element | null): HoverKind {
  if (!el) return 'default';
  const step = el.closest('.product-journey__step');
  if (step?.classList.contains('is-active')) return 'journey';
  const hit = el.closest(INTERACTIVE);
  if (hit?.classList.contains('btn-primary')) return 'primary';
  if (hit) return 'link';
  if (el.closest('.frame, .glow-wrap, .preview, .ss-card')) return 'frame';
  return 'default';
}

function actionLabel(el: Element | null, kind: HoverKind) {
  if (kind === 'primary') return 'Launch';
  if (kind === 'frame') return 'Explore';
  if (kind === 'link') {
    const hit = el?.closest('a, button, .btn') as HTMLElement | null;
    const raw = (hit?.getAttribute('aria-label') || hit?.textContent || '').trim();
    if (!raw) return 'Open';
    const word = raw.split(/\s+/)[0];
    return word.length > 12 ? 'Open' : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }
  return '';
}

function createRoot() {
  let root = document.getElementById('haidi-cursor-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'haidi-cursor-root';
    root.setAttribute('aria-hidden', 'true');
    document.body.appendChild(root);
  }
  root.replaceChildren();
  invalidateThemeCache();
  applyThemeVars(root, theme());
  return root;
}

function mountCanvas(root: HTMLElement) {
  const canvas = document.createElement('canvas');
  canvas.className = 'hc-canvas';
  const ctx = canvas.getContext('2d', { alpha: true })!;
  root.append(canvas);
  let vw = innerWidth;
  let vh = innerHeight;

  const resize = () => {
    vw = innerWidth;
    vh = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.25);
    canvas.width = Math.ceil(vw * dpr);
    canvas.height = Math.ceil(vh * dpr);
    canvas.style.width = `${vw}px`;
    canvas.style.height = `${vh}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  return {
    ctx,
    clear: () => ctx.clearRect(0, 0, vw, vh),
    destroy: () => window.removeEventListener('resize', resize),
  };
}

function placeCore(core: HTMLElement, x: number, y: number, scale = 1) {
  core.style.transform = `translate3d(${x}px,${y}px,0) scale(${scale})`;
}

/** Coalesce pointer work to one rAF tick; throttle elementFromPoint. */
function createPointerLoop(onFrame: (s: PointerState) => void): PointerLoop {
  const state: PointerState = {
    x: innerWidth / 2,
    y: innerHeight / 2,
    kind: 'default',
    el: null,
    down: false,
  };

  let pendingX = state.x;
  let pendingY = state.y;
  let raf = 0;
  let lastHit = 0;

  const tick = (now: number) => {
    raf = 0;
    state.x = pendingX;
    state.y = pendingY;
    if (now - lastHit >= HIT_INTERVAL_MS) {
      state.el = targetAt(state.x, state.y);
      state.kind = classify(state.el);
      lastHit = now;
    }
    onFrame(state);
  };

  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };

  const onMove = (e: MouseEvent) => {
    pendingX = e.clientX;
    pendingY = e.clientY;
    schedule();
  };

  const onDown = () => {
    state.down = true;
    state.el = targetAt(pendingX, pendingY);
    state.kind = classify(state.el);
    lastHit = performance.now();
    onFrame(state);
  };

  const onUp = () => {
    state.down = false;
    onFrame(state);
  };

  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('mousedown', onDown);
  window.addEventListener('mouseup', onUp);

  state.el = targetAt(state.x, state.y);
  state.kind = classify(state.el);
  onFrame(state);

  return {
    get x() {
      return state.x;
    },
    get y() {
      return state.y;
    },
    get kind() {
      return state.kind;
    },
    get el() {
      return state.el;
    },
    get down() {
      return state.down;
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
    },
  };
}

function moveLayer(el: HTMLElement, fast = false) {
  const d = fast ? 0.08 : 0.28;
  return {
    x: gsap.quickTo(el, 'x', { duration: d, ease: 'power3.out' }),
    y: gsap.quickTo(el, 'y', { duration: d, ease: 'power3.out' }),
  };
}

function setHoverRing(ring: HTMLElement, kind: HoverKind) {
  ring.classList.toggle('is-hover', kind === 'link' || kind === 'frame');
  ring.classList.toggle('is-primary', kind === 'primary');
  ring.classList.toggle('is-journey', kind === 'journey');
}

function clickPulse(el: Element, scale = 0.88) {
  gsap.fromTo(el, { scale: 1 }, { scale, duration: 0.1, yoyo: true, repeat: 1, ease: 'power2.inOut' });
}

function createDotRing() {
  const root = createRoot();
  const ring = document.createElement('i');
  ring.className = 'hc hc-ring';
  const core = document.createElement('i');
  core.className = 'hc hc-core';
  root.append(ring, core);

  const ringMove = moveLayer(ring);
  const coreMove = moveLayer(core, true);
  let lastKind: HoverKind = 'default';
  let lastDown = false;

  const ptr = createPointerLoop(({ x, y, kind, down }) => {
    coreMove.x(x);
    coreMove.y(y);
    ringMove.x(x);
    ringMove.y(y);

    if (kind !== lastKind) {
      lastKind = kind;
      setHoverRing(ring, kind);
      gsap.to(ring, { scale: kind === 'default' ? 1 : kind === 'primary' ? 1.18 : 1.12, duration: 0.45, ease: 'power3.out' });
    }

    if (down !== lastDown) {
      lastDown = down;
      gsap.to(core, { scale: down ? 0.75 : kind === 'link' ? 0.95 : 1.1, duration: 0.2 });
      if (down) clickPulse(ring, 0.92);
    }
  });

  return { destroy: () => { ptr.destroy(); root.remove(); } };
}

function createCrosshair() {
  const root = createRoot();
  const wrap = document.createElement('div');
  wrap.className = 'hc hc-reticle';
  const ring = document.createElement('i');
  ring.className = 'hc-reticle__ring';
  const arms = (['t', 'b', 'l', 'r'] as const).map((d) => {
    const arm = document.createElement('i');
    arm.className = `hc-reticle__arm hc-reticle__arm--${d}`;
    return arm;
  });
  const core = document.createElement('i');
  core.className = 'hc-core';
  core.style.margin = '-5px 0 0 -5px';
  wrap.append(ring, ...arms, core);
  root.appendChild(wrap);

  const move = moveLayer(wrap, true);
  let lastKind: HoverKind = 'default';
  let lastDown = false;
  const t = theme();

  const onSnap = () => {
    gsap.fromTo(ring, { scale: 1, opacity: 0.9 }, { scale: 1.55, opacity: 0, duration: 0.55, ease: 'power2.out' });
  };
  window.addEventListener('haidi:panel-snap', onSnap);

  const ptr = createPointerLoop(({ x, y, kind, down }) => {
    move.x(x);
    move.y(y);

    if (kind !== lastKind) {
      lastKind = kind;
      const hover = kind !== 'default';
      gsap.to(arms, { scale: hover ? 1.35 : 1, duration: 0.35, ease: 'power3.out', stagger: 0.02 });
      gsap.to(ring, {
        scale: hover ? 1.25 : 1,
        borderColor: kind === 'primary' ? t.teal : '',
        duration: 0.4,
        ease: 'power3.out',
      });
    }

    if (down !== lastDown) {
      lastDown = down;
      gsap.to(core, { scale: down ? 0.6 : 1, duration: 0.15 });
    }
  });

  return {
    destroy: () => {
      ptr.destroy();
      window.removeEventListener('haidi:panel-snap', onSnap);
      root.remove();
    },
  };
}

/** Comet trail — single rAF loop, batched canvas strokes, pauses when idle */
function createTrace() {
  const root = createRoot();
  const canvas = document.createElement('canvas');
  canvas.className = 'hc-canvas';
  const core = document.createElement('i');
  core.className = 'hc hc-core';
  root.append(canvas, core);

  const ctx = canvas.getContext('2d', { alpha: true })!;
  const trail: { x: number; y: number; t: number }[] = [];
  const stroke = theme().tealBright;
  const TRAIL_MS = 340;
  const MAX_PTS = 24;
  const MIN_DIST = 5;
  const IDLE_MS = 450;

  let mx = innerWidth / 2;
  let my = innerHeight / 2;
  let raf = 0;
  let lastMove = performance.now();
  let coreScale = 1;
  let lastDown = false;
  let lastKind: HoverKind = 'default';
  let vw = innerWidth;
  let vh = innerHeight;

  const resize = () => {
    vw = innerWidth;
    vh = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.25);
    canvas.width = Math.ceil(vw * dpr);
    canvas.height = Math.ceil(vh * dpr);
    canvas.style.width = `${vw}px`;
    canvas.style.height = `${vh}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const drawPath = (from: number, alpha: number, width: number) => {
    if (trail.length - from < 1) return;
    ctx.beginPath();
    ctx.moveTo(trail[from].x, trail[from].y);
    for (let i = from + 1; i < trail.length; i++) ctx.lineTo(trail[i].x, trail[i].y);
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.stroke();
  };

  const loop = (now: number) => {
    raf = 0;
    while (trail.length && now - trail[0].t > TRAIL_MS) trail.shift();

    const idle = now - lastMove > IDLE_MS && trail.length < 2;
    if (idle) return;

    ctx.clearRect(0, 0, vw, vh);
    if (trail.length > 1) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = stroke;
      const n = trail.length;
      const third = Math.max(1, Math.floor(n / 3));
      drawPath(0, 0.28, 7);
      drawPath(third, 0.55, 5);
      drawPath(third * 2, 0.88, 3.5);
      ctx.globalAlpha = 1;
    }

    core.style.transform = `translate3d(${mx}px,${my}px,0) scale(${coreScale})`;

    raf = requestAnimationFrame(loop);
  };

  const wake = () => {
    if (!raf) raf = requestAnimationFrame(loop);
  };

  const ptr = createPointerLoop((api) => {
    mx = api.x;
    my = api.y;
    lastMove = performance.now();

    const last = trail[trail.length - 1];
    if (!last || Math.hypot(mx - last.x, my - last.y) > MIN_DIST) {
      trail.push({ x: mx, y: my, t: lastMove });
      if (trail.length > MAX_PTS) trail.shift();
    }

    if (api.down !== lastDown || api.kind !== lastKind) {
      lastDown = api.down;
      lastKind = api.kind;
      coreScale = api.down ? 0.7 : api.kind !== 'default' ? 1.2 : 1;
    }

    wake();
  });

  wake();

  return {
    destroy: () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      ptr.destroy();
      root.remove();
    },
  };
}

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  hue: 'teal' | 'coral';
  on: boolean;
};

/** Teal/coral particle drift — canvas pool */
function createParticles() {
  const root = createRoot();
  const stage = mountCanvas(root);
  const { ctx } = stage;
  const core = document.createElement('i');
  core.className = 'hc hc-core';
  root.append(core);

  const pool: Particle[] = [];
  const MAX = 52;
  const IDLE_MS = 500;
  const colors = () => theme();

  let mx = innerWidth / 2;
  let my = innerHeight / 2;
  let raf = 0;
  let lastMove = performance.now();
  let lastSpawn = 0;
  let coreScale = 1;
  let lastDown = false;
  let lastKind: HoverKind = 'default';

  const alloc = (): Particle => {
    const dead = pool.find((p) => !p.on);
    if (dead) return dead;
    if (pool.length >= MAX) return pool[0];
    const p = { x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, hue: 'teal' as const, on: false };
    pool.push(p);
    return p;
  };

  const spawn = (x: number, y: number, n: number, kind: HoverKind, burst = false) => {
    for (let i = 0; i < n; i++) {
      const p = alloc();
      const a = Math.random() * Math.PI * 2;
      const speed = burst ? 1.2 + Math.random() * 2.4 : 0.4 + Math.random() * 1.4;
      p.x = x + (Math.random() - 0.5) * 6;
      p.y = y + (Math.random() - 0.5) * 6;
      p.vx = Math.cos(a) * speed;
      p.vy = Math.sin(a) * speed - (burst ? 0.6 : 0.2);
      p.life = 0;
      p.max = burst ? 520 + Math.random() * 280 : 360 + Math.random() * 320;
      p.size = burst ? 2.2 + Math.random() * 2.8 : 1.4 + Math.random() * 2.4;
      p.hue = kind === 'primary' || kind === 'journey' ? 'coral' : 'teal';
      p.on = true;
    }
  };

  const loop = (now: number) => {
    raf = 0;
    const t = colors();
    let alive = 0;

    stage.clear();
    for (const p of pool) {
      if (!p.on) continue;
      p.life += 16;
      if (p.life >= p.max) {
        p.on = false;
        continue;
      }
      alive++;
      p.vx *= 0.98;
      p.vy = p.vy * 0.98 + 0.03;
      p.x += p.vx;
      p.y += p.vy;
      const a = 1 - p.life / p.max;
      ctx.globalAlpha = a * 0.9;
      ctx.fillStyle = p.hue === 'coral' ? t.coral : t.tealBright;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    placeCore(core, mx, my, coreScale);

    const idle = now - lastMove > IDLE_MS && alive === 0;
    if (!idle) raf = requestAnimationFrame(loop);
  };

  const wake = () => {
    if (!raf) raf = requestAnimationFrame(loop);
  };

  const ptr = createPointerLoop((api) => {
    mx = api.x;
    my = api.y;
    const now = performance.now();
    lastMove = now;

    if (now - lastSpawn > 28) {
      lastSpawn = now;
      spawn(mx, my, api.down ? 6 : 2, api.kind, api.down);
    }

    if (api.down && !lastDown) spawn(mx, my, 14, api.kind, true);

    if (api.down !== lastDown || api.kind !== lastKind) {
      lastDown = api.down;
      lastKind = api.kind;
      coreScale = api.down ? 0.75 : api.kind !== 'default' ? 1.2 : 1;
    }

    wake();
  });

  wake();

  return {
    destroy: () => {
      if (raf) cancelAnimationFrame(raf);
      stage.destroy();
      ptr.destroy();
      root.remove();
    },
  };
}

/** Satellites orbiting the core */
function createOrbit() {
  const root = createRoot();
  const core = document.createElement('i');
  core.className = 'hc hc-core';
  const dots = Array.from({ length: 4 }, () => {
    const d = document.createElement('i');
    d.className = 'hc-orbit-dot';
    return d;
  });
  root.append(...dots, core);

  let mx = innerWidth / 2;
  let my = innerHeight / 2;
  let angle = 0;
  let raf = 0;
  let radius = 18;
  let coreScale = 1;
  let lastKind: HoverKind = 'default';
  let lastDown = false;

  const loop = () => {
    raf = 0;
    angle += 0.055;
    const hover = lastKind !== 'default';
    radius += ((hover ? 24 : 18) - radius) * 0.12;

    dots.forEach((dot, i) => {
      const a = angle + (i / dots.length) * Math.PI * 2;
      const wobble = Math.sin(angle * 2 + i) * 2;
      const x = mx + Math.cos(a) * (radius + wobble);
      const y = my + Math.sin(a) * (radius + wobble);
      const s = hover ? 1.15 : 1;
      dot.style.transform = `translate3d(${x}px,${y}px,0) scale(${s})`;
      dot.style.opacity = hover ? '1' : '0.82';
    });

    placeCore(core, mx, my, coreScale);
    raf = requestAnimationFrame(loop);
  };

  const wake = () => {
    if (!raf) raf = requestAnimationFrame(loop);
  };

  const ptr = createPointerLoop((api) => {
    mx = api.x;
    my = api.y;
    if (api.kind !== lastKind) lastKind = api.kind;
    if (api.down !== lastDown) {
      lastDown = api.down;
      coreScale = api.down ? 0.75 : api.kind !== 'default' ? 1.2 : 1;
    }
    wake();
  });

  wake();

  return {
    destroy: () => {
      if (raf) cancelAnimationFrame(raf);
      ptr.destroy();
      root.remove();
    },
  };
}

type Ripple = { x: number; y: number; r: number; life: number; max: number; on: boolean };

/** Expanding rings on movement */
function createRipple() {
  const root = createRoot();
  const stage = mountCanvas(root);
  const { ctx } = stage;
  const core = document.createElement('i');
  core.className = 'hc hc-core';
  root.append(core);

  const pool: Ripple[] = [];
  const MAX = 8;
  let mx = innerWidth / 2;
  let my = innerHeight / 2;
  let raf = 0;
  let lastMove = 0;
  let lastSpawn = 0;
  let coreScale = 1;
  let lastKind: HoverKind = 'default';
  let lastDown = false;
  const stroke = () => theme().tealBright;

  const spawn = (x: number, y: number, big = false) => {
    const r = pool.find((p) => !p.on) ?? (pool.length < MAX ? { x: 0, y: 0, r: 0, life: 0, max: 1, on: false } : pool[0]);
    if (!pool.includes(r)) pool.push(r);
    r.x = x;
    r.y = y;
    r.r = big ? 6 : 4;
    r.life = 0;
    r.max = big ? 680 : 520;
    r.on = true;
  };

  const loop = (now: number) => {
    raf = 0;
    let alive = 0;
    stage.clear();
    ctx.lineWidth = 2;
    ctx.strokeStyle = stroke();

    for (const rip of pool) {
      if (!rip.on) continue;
      rip.life += 16;
      if (rip.life >= rip.max) {
        rip.on = false;
        continue;
      }
      alive++;
      const t = rip.life / rip.max;
      rip.r += 1.1 + t * 0.6;
      ctx.globalAlpha = (1 - t) * 0.85;
      ctx.beginPath();
      ctx.arc(rip.x, rip.y, rip.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    placeCore(core, mx, my, coreScale);

    if (alive > 0 || now - lastMove < 400) raf = requestAnimationFrame(loop);
  };

  const wake = () => {
    if (!raf) raf = requestAnimationFrame(loop);
  };

  const ptr = createPointerLoop((api) => {
    mx = api.x;
    my = api.y;
    const now = performance.now();
    lastMove = now;

    if (now - lastSpawn > (api.down ? 60 : 110)) {
      lastSpawn = now;
      spawn(mx, my, api.down);
    }
    if (api.down && !lastDown) spawn(mx, my, true);

    if (api.down !== lastDown || api.kind !== lastKind) {
      lastDown = api.down;
      lastKind = api.kind;
      coreScale = api.down ? 0.7 : api.kind !== 'default' ? 1.2 : 1;
    }

    wake();
  });

  wake();

  return {
    destroy: () => {
      if (raf) cancelAnimationFrame(raf);
      stage.destroy();
      ptr.destroy();
      root.remove();
    },
  };
}

function createBracket() {
  const root = createRoot();
  const stack = document.createElement('div');
  stack.className = 'hc';
  stack.style.display = 'flex';
  stack.style.flexDirection = 'column';
  stack.style.alignItems = 'center';

  const core = document.createElement('i');
  core.className = 'hc-core';
  const pill = document.createElement('span');
  pill.className = 'hc-pill';
  pill.style.opacity = '0';
  pill.style.transform = 'translateY(4px)';
  stack.append(core, pill);
  root.appendChild(stack);

  const move = moveLayer(stack, true);
  let lastLabel = '';
  let lastKind: HoverKind = 'default';
  let lastDown = false;
  let lastShow = false;

  const ptr = createPointerLoop(({ x, y, kind, el, down }) => {
    move.x(x);
    move.y(y);
    const label = actionLabel(el, kind);
    const show = !!label && kind !== 'journey';

    if (label !== lastLabel || kind !== lastKind) {
      lastLabel = label;
      lastKind = kind;
      pill.textContent = label;
      gsap.to(pill, { opacity: show ? 1 : 0, y: show ? 0 : 4, duration: 0.35, ease: 'power3.out' });
    }

    if (down !== lastDown || show !== lastShow) {
      lastDown = down;
      lastShow = show;
      gsap.to(core, { scale: down ? 0.75 : show ? 1.25 : 1.1, duration: 0.25 });
    }
  });

  return { destroy: () => { ptr.destroy(); root.remove(); } };
}

function createGlow() {
  const root = createRoot();
  const aura = document.createElement('i');
  aura.className = 'hc hc-aura';
  const core = document.createElement('i');
  core.className = 'hc hc-aura-core';
  root.append(aura, core);

  const auraMove = moveLayer(aura);
  const coreMove = moveLayer(core, true);
  let lastKind: HoverKind = 'default';
  let lastDown = false;
  let hero = inHero();

  function inHero() {
    return !!document.querySelector('[data-hero-root]') && scrollY < innerHeight * 0.9;
  }

  const applyHeroSize = (h: boolean) => {
    gsap.to(aura, {
      width: h ? 200 : 150,
      height: h ? 200 : 150,
      margin: h ? '-100px 0 0 -100px' : '-75px 0 0 -75px',
      duration: 0.6,
      ease: 'power3.out',
    });
  };

  let scrollRaf = 0;
  const onScroll = () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      const next = inHero();
      if (next !== hero) {
        hero = next;
        applyHeroSize(hero);
      }
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  const ptr = createPointerLoop(({ x, y, kind, down }) => {
    coreMove.x(x);
    coreMove.y(y);
    auraMove.x(x);
    auraMove.y(y);

    if (kind !== lastKind) {
      lastKind = kind;
      gsap.to(aura, {
        opacity: kind !== 'default' ? 1 : hero ? 0.95 : 0.82,
        scale: kind === 'primary' ? 1.25 : kind === 'frame' ? 1.15 : 1,
        duration: 0.5,
        ease: 'power3.out',
      });
    }

    if (down !== lastDown) {
      lastDown = down;
      gsap.to(core, { scale: down ? 0.7 : kind !== 'default' ? 1.35 : 1.15, duration: 0.2 });
      if (down) gsap.fromTo(aura, { opacity: 1 }, { opacity: hero ? 0.95 : 0.82, duration: 0.6, ease: 'power2.out' });
    }
  });

  return {
    destroy: () => {
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      window.removeEventListener('scroll', onScroll);
      ptr.destroy();
      root.remove();
    },
  };
}

function factory(mode: CursorMode) {
  switch (mode) {
    case 'dot-ring':
      return createDotRing();
    case 'crosshair':
      return createCrosshair();
    case 'trace':
      return createTrace();
    case 'bracket':
      return createBracket();
    case 'glow':
      return createGlow();
    case 'particles':
      return createParticles();
    case 'orbit':
      return createOrbit();
    case 'ripple':
      return createRipple();
    default:
      return null;
  }
}

export function resolveCursorMode(): CursorMode {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved && CURSOR_MODES.includes(saved as CursorMode)) return saved as CursorMode;
  } catch {
    /* ignore */
  }
  return DEFAULT_MODE;
}

export function applyCursor(mode: string, opts: { skipStore?: boolean } = {}) {
  const next = CURSOR_MODES.includes(mode as CursorMode) ? (mode as CursorMode) : DEFAULT_MODE;

  if (next === currentMode && (next === 'none' || active)) {
    if (!opts.skipStore) {
      try {
        sessionStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
    }
    return;
  }
  currentMode = next;

  active?.destroy();
  active = null;
  document.getElementById('haidi-cursor-root')?.remove();

  document.documentElement.setAttribute('data-cursor', next);

  if (!opts.skipStore) {
    try {
      sessionStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  if (next === 'none' || !canUseCustomCursor()) {
    removeStyles();
    return;
  }

  ensureStyles();
  active = factory(next);
}

export function initHaidiCursor() {
  applyCursor(resolveCursorMode(), { skipStore: true });
}

declare global {
  interface Window {
    haidiApplyCursor?: (mode: string) => void;
    haidiResolveCursor?: () => CursorMode;
  }
}

if (typeof window !== 'undefined') {
  window.haidiApplyCursor = (mode) => applyCursor(mode);
  window.haidiResolveCursor = resolveCursorMode;
}
