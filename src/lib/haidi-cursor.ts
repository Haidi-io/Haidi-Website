import gsap from 'gsap';

export const CURSOR_MODES = ['none', 'dot', 'dot-ring', 'crosshair', 'snap', 'trace', 'bracket'] as const;
export type CursorMode = (typeof CURSOR_MODES)[number];

const STORAGE_KEY = 'haidi-cursor';
const DEFAULT_MODE: CursorMode = 'dot-ring';
const INTERACTIVE =
  'a, button, .btn, [role="button"], input, select, textarea, .product-journey__step, .link-arrow, .ss-card';
const CHROME = '#haidi-cursor-root, #haidi-cursor-root *';
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
#haidi-cursor-root{position:fixed;inset:0;pointer-events:none;z-index:2147483647;overflow:hidden;contain:strict}
.hc{position:fixed;top:0;left:0;pointer-events:none;will-change:transform;transform:translate3d(0,0,0)}
.hc-core{
  width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:50%;
  background:var(--hc-teal-bright);
  box-shadow:
    0 0 0 1px rgba(255,255,255,.5),
    0 0 12px color-mix(in srgb,var(--hc-teal-bright) 45%,transparent)
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
.hc-canvas{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;contain:strict}
.hc-ring--snap{
  margin:0;left:0;top:0;width:38px;height:38px;
  transition:border-color .3s,background .3s,box-shadow .35s
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
  const TRAIL_MS = 680;
  const MAX_PTS = 48;
  const MIN_DIST = 4;
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

  const HEAD_W = 6.5; // head thickness; tail tapers to a thin point

  const loop = (now: number) => {
    raf = 0;
    while (trail.length && now - trail[0].t > TRAIL_MS) trail.shift();

    const idle = now - lastMove > IDLE_MS && trail.length < 2;
    if (idle) return;

    ctx.clearRect(0, 0, vw, vh);
    const n = trail.length;
    if (n > 0) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = stroke;
      // Tapered tail: each segment grows from a thin, faint tail tip to a
      // thick, bright head, so it reads as a comet streak rather than a ribbon.
      for (let i = 0; i < n - 1; i++) {
        const p = (i + 1) / n; // 0 → tail tip, 1 → head
        const e = p * Math.sqrt(p); // gentle ease so the long tail stays visible
        ctx.globalAlpha = 0.04 + e * 0.78;
        ctx.lineWidth = 0.5 + e * HEAD_W;
        ctx.beginPath();
        ctx.moveTo(trail[i].x, trail[i].y);
        ctx.lineTo(trail[i + 1].x, trail[i + 1].y);
        ctx.stroke();
      }
      // Bright head segment connecting the last sample to the live cursor.
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = HEAD_W;
      ctx.beginPath();
      ctx.moveTo(trail[n - 1].x, trail[n - 1].y);
      ctx.lineTo(mx, my);
      ctx.stroke();
      // Glowing coma at the head.
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = stroke;
      ctx.shadowColor = stroke;
      ctx.shadowBlur = 13;
      ctx.beginPath();
      ctx.arc(mx, my, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
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

/** Minimal precise dot — the most restrained option */
function createDot() {
  const root = createRoot();
  const core = document.createElement('i');
  core.className = 'hc hc-core';
  root.append(core);

  const move = moveLayer(core, true);
  let lastKind: HoverKind = 'default';
  let lastDown = false;

  const ptr = createPointerLoop(({ x, y, kind, down }) => {
    move.x(x);
    move.y(y);
    if (kind !== lastKind || down !== lastDown) {
      lastKind = kind;
      lastDown = down;
      const scale = down ? 0.7 : kind === 'primary' ? 1.9 : kind !== 'default' ? 1.55 : 1;
      gsap.to(core, { scale, duration: 0.3, ease: 'power3.out' });
    }
  });

  return { destroy: () => { ptr.destroy(); root.remove(); } };
}

/** Magnetic ring — wraps the hovered interactive element, rests as a small ring */
function createSnap() {
  const root = createRoot();
  const ring = document.createElement('i');
  ring.className = 'hc hc-ring hc-ring--snap';
  const core = document.createElement('i');
  core.className = 'hc hc-core';
  root.append(ring, core);

  const coreMove = moveLayer(core, true);
  const DOT = 38; // resting ring diameter
  const PAD = 8; // padding around a wrapped element
  const cur = { x: innerWidth / 2, y: innerHeight / 2, w: DOT, h: DOT, r: DOT / 2 };
  const tgt = { ...cur };
  let hoverEl: Element | null = null;
  let lastKind: HoverKind = 'default';
  let raf = 0;
  let lastMove = performance.now();

  const computeTarget = () => {
    if (!hoverEl) return;
    const b = hoverEl.getBoundingClientRect();
    const radius = parseFloat(getComputedStyle(hoverEl).borderTopLeftRadius) || 8;
    tgt.x = b.left + b.width / 2;
    tgt.y = b.top + b.height / 2;
    tgt.w = b.width + PAD * 2;
    tgt.h = b.height + PAD * 2;
    tgt.r = Math.min(radius + PAD, Math.min(tgt.w, tgt.h) / 2);
  };

  const loop = (now: number) => {
    raf = 0;
    computeTarget();
    const k = 0.2;
    cur.x += (tgt.x - cur.x) * k;
    cur.y += (tgt.y - cur.y) * k;
    cur.w += (tgt.w - cur.w) * k;
    cur.h += (tgt.h - cur.h) * k;
    cur.r += (tgt.r - cur.r) * k;
    ring.style.width = `${cur.w}px`;
    ring.style.height = `${cur.h}px`;
    ring.style.borderRadius = `${cur.r}px`;
    ring.style.transform = `translate(-50%,-50%) translate3d(${cur.x}px,${cur.y}px,0)`;

    const settled =
      Math.abs(tgt.x - cur.x) < 0.5 &&
      Math.abs(tgt.y - cur.y) < 0.5 &&
      Math.abs(tgt.w - cur.w) < 0.5 &&
      Math.abs(tgt.h - cur.h) < 0.5;
    if (!settled || hoverEl || now - lastMove < 200) raf = requestAnimationFrame(loop);
  };
  const wake = () => {
    if (!raf) raf = requestAnimationFrame(loop);
  };

  const ptr = createPointerLoop(({ x, y, kind, el, down }) => {
    coreMove.x(x);
    coreMove.y(y);
    lastMove = performance.now();
    const interactive = kind !== 'default';
    hoverEl = interactive ? el : null;
    if (!interactive) {
      tgt.x = x;
      tgt.y = y;
      tgt.w = DOT;
      tgt.h = DOT;
      tgt.r = DOT / 2;
    }
    if (kind !== lastKind) {
      lastKind = kind;
      setHoverRing(ring, kind);
    }
    if (down) clickPulse(ring, 0.94);
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

function factory(mode: CursorMode) {
  switch (mode) {
    case 'dot':
      return createDot();
    case 'dot-ring':
      return createDotRing();
    case 'crosshair':
      return createCrosshair();
    case 'snap':
      return createSnap();
    case 'trace':
      return createTrace();
    case 'bracket':
      return createBracket();
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
    HAIDI_CURSOR_MODES?: readonly CursorMode[];
  }
}

if (typeof window !== 'undefined') {
  window.haidiApplyCursor = (mode) => applyCursor(mode);
  window.haidiResolveCursor = resolveCursorMode;
  window.HAIDI_CURSOR_MODES = CURSOR_MODES;
}
