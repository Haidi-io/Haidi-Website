// Haidi — three.js (WebGL) hero backgrounds.
//
// Lazily imported by BaseLayout ONLY when a 3D hero mode is active, so the
// three.js chunk never loads for the default 2D 'canvas' mode. Mirrors the
// lifecycle of the 2D engine (assets/haidi-hero.js): reduced-motion renders a
// single static frame, and the loop pauses on tab-hide / when the hero scrolls
// offscreen. Renders to its own transparent <canvas class="hero-canvas-gl">
// layered inside .hero-canvas-host, beneath the hero scrim + content.
import * as THREE from 'three';

export const HERO_3D_MODES = ['globe', 'terrain', 'field3d', 'network3d'] as const;
export type Hero3DMode = (typeof HERO_3D_MODES)[number];

const TEAL = 0x47b9bb;
const CORAL = 0xf08989;
const INK = 0xf4f6fa;
const DPR_CAP = 2;

interface SceneHandle {
  root: THREE.Object3D;
  update: (tMs: number, dt: number) => void;
  dispose: () => void;
}

let host: HTMLElement | null = null;
let canvas: HTMLCanvasElement | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let scene: THREE.Scene | null = null;
let current: SceneHandle | null = null;
let currentMode: Hero3DMode | null = null;
let raf = 0;
let running = false;
let reduced = false;
let intersecting = true;
let visible = true;
let lastT = 0;
let resizePending = false;
let ro: ResizeObserver | null = null;
let io: IntersectionObserver | null = null;

const pointer = { tx: 0, ty: 0, x: 0, y: 0 };

function is3D(a: string | null): a is Hero3DMode {
  return !!a && (HERO_3D_MODES as readonly string[]).includes(a);
}
function readMode(): Hero3DMode | null {
  const a = document.documentElement.getAttribute('data-hero-animation');
  return is3D(a) ? a : null;
}
const isMobile = () => window.innerWidth < 760;

// ── init (idempotent) ─────────────────────────────────────────────
export function initHaidiHero3D(): void {
  if (host) {
    syncFromDom();
    return;
  }
  host = document.querySelector('.hero-canvas-host');
  if (!host) return;
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  ensureCanvas();
  wireEvents();
  syncFromDom();
}

function ensureCanvas(): void {
  if (canvas || !host) return;
  canvas = document.createElement('canvas');
  canvas.className = 'hero-canvas-gl';
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    display: 'none',
    pointerEvents: 'none',
  });
  host.appendChild(canvas); // after .hero-canvas → paints above it, still under the scrim/content
}

function ensureRenderer(): void {
  if (renderer || !canvas || !host) return;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
  } catch {
    renderer = null;
    return; // WebGL unsupported → GL canvas stays hidden
  }
  renderer.setClearAlpha(0); // transparent → dark page bg + .hero::after scrim composite through
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
  const r = host.getBoundingClientRect();
  renderer.setSize(r.width, r.height, false);
  camera = new THREE.PerspectiveCamera(55, r.width / Math.max(1, r.height), 0.1, 100);
  camera.position.set(0, 0, 6);
  scene = new THREE.Scene();
}

// ── DOM sync / 2D↔3D handoff ──────────────────────────────────────
function syncFromDom(): void {
  const next = readMode();
  if (next === currentMode && (next === null || current)) return;
  if (!next) {
    teardownScene();
    hideCanvas();
    return;
  }
  show3D(next);
}

function show3D(mode: Hero3DMode): void {
  ensureRenderer();
  if (!renderer || !scene) return;
  teardownScene();
  current = buildScene(mode);
  scene.add(current.root);
  currentMode = mode;
  showCanvas();
  resize();
  if (reduced) renderOneFrame(1200);
  else startLoop();
}

const showCanvas = () => {
  if (canvas) canvas.style.display = 'block';
};
const hideCanvas = () => {
  if (canvas) canvas.style.display = 'none';
};

// ── scene factory ─────────────────────────────────────────────────
function buildScene(mode: Hero3DMode): SceneHandle {
  switch (mode) {
    case 'globe':
      return makeGlobe();
    case 'terrain':
      return makeTerrain();
    case 'field3d':
      return makeField();
    case 'network3d':
      return makeNetwork();
  }
}

function pointsMaterial(color: number, size: number, opacity: number): THREE.PointsMaterial {
  // NormalBlending (not Additive): the GL canvas is transparent (alpha:true,
  // premultiplied) and composited over the dark page + scrim, where additive
  // blending washes out to near-invisible. Normal blending keeps points solid.
  return new THREE.PointsMaterial({
    color,
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity,
    depthWrite: false,
  });
}

function slerpVec(a: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
  const dot = Math.min(1, Math.max(-1, a.dot(b)));
  const omega = Math.acos(dot);
  if (omega < 1e-4) return a.clone();
  const so = Math.sin(omega);
  return a
    .clone()
    .multiplyScalar(Math.sin((1 - t) * omega) / so)
    .add(b.clone().multiplyScalar(Math.sin(t * omega) / so));
}

// ===== GLOBE: supply-network globe =====
function makeGlobe(): SceneHandle {
  const root = new THREE.Group();
  const R = 2.8;
  const N = isMobile() ? 220 : 480;
  const pos = new Float32Array(N * 3);
  const nodes: THREE.Vector3[] = [];
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const rr = Math.sqrt(Math.max(0, 1 - y * y));
    const phi = i * Math.PI * (3 - Math.sqrt(5));
    const v = new THREE.Vector3(Math.cos(phi) * rr, y, Math.sin(phi) * rr).multiplyScalar(R);
    v.toArray(pos, i * 3);
    nodes.push(v);
  }
  const ptsGeo = new THREE.BufferGeometry();
  ptsGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(ptsGeo, pointsMaterial(INK, 0.06, 0.95));

  const ico = new THREE.IcosahedronGeometry(R, 3);
  const wireGeo = new THREE.WireframeGeometry(ico);
  ico.dispose();
  const wire = new THREE.LineSegments(
    wireGeo,
    new THREE.LineBasicMaterial({ color: TEAL, transparent: true, opacity: 0.34 }),
  );

  const ARCS = isMobile() ? 14 : 26;
  const SEG = 24;
  const arcPos = new Float32Array(ARCS * SEG * 2 * 3);
  let ai = 0;
  for (let a = 0; a < ARCS; a++) {
    const u1 = nodes[(Math.random() * N) | 0].clone().normalize();
    const u2 = nodes[(Math.random() * N) | 0].clone().normalize();
    let prev: THREE.Vector3 | null = null;
    for (let s = 0; s <= SEG; s++) {
      const tt = s / SEG;
      const pt = slerpVec(u1, u2, tt).multiplyScalar(R * (1 + 0.18 * Math.sin(Math.PI * tt)));
      if (prev) {
        prev.toArray(arcPos, ai);
        ai += 3;
        pt.toArray(arcPos, ai);
        ai += 3;
      }
      prev = pt;
    }
  }
  const arcGeo = new THREE.BufferGeometry();
  arcGeo.setAttribute('position', new THREE.BufferAttribute(arcPos, 3));
  const arcs = new THREE.LineSegments(
    arcGeo,
    new THREE.LineBasicMaterial({ color: TEAL, transparent: true, opacity: 0.85 }),
  );

  root.add(wire, pts, arcs);
  root.rotation.x = 0.35;
  return {
    root,
    update: (t) => {
      root.rotation.y = t * 0.00008;
    },
    dispose: () => {
      ptsGeo.dispose();
      (pts.material as THREE.Material).dispose();
      wireGeo.dispose();
      (wire.material as THREE.Material).dispose();
      arcGeo.dispose();
      (arcs.material as THREE.Material).dispose();
    },
  };
}

// ===== TERRAIN: animated point-cloud surface =====
function makeTerrain(): SceneHandle {
  const root = new THREE.Group();
  const COLS = isMobile() ? 60 : 110;
  const ROWS = isMobile() ? 34 : 64;
  const count = COLS * ROWS;
  const pos = new Float32Array(count * 3);
  const base = new Float32Array(count * 2);
  let i = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = (c / (COLS - 1) - 0.5) * 10;
      const y = (r / (ROWS - 1) - 0.5) * 6;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = 0;
      base[i * 2] = x;
      base[i * 2 + 1] = y;
      i++;
    }
  }
  const geo = new THREE.BufferGeometry();
  const attr = new THREE.BufferAttribute(pos, 3);
  attr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', attr);
  const pts = new THREE.Points(geo, pointsMaterial(TEAL, 0.055, 0.8));
  root.add(pts);
  root.rotation.x = -0.9;
  const zAt = (x: number, y: number, t: number) =>
    Math.sin(x * 0.6 + t * 0.0011) * 0.5 + Math.cos(y * 0.7 - t * 0.0009) * 0.4;
  return {
    root,
    update: (t) => {
      for (let k = 0; k < count; k++) pos[k * 3 + 2] = zAt(base[k * 2], base[k * 2 + 1], t);
      attr.needsUpdate = true;
    },
    dispose: () => {
      geo.dispose();
      (pts.material as THREE.Material).dispose();
    },
  };
}

// ===== FIELD3D: depth particle field =====
function makeField(): SceneHandle {
  const root = new THREE.Group();
  const N = isMobile() ? 600 : 1400;
  const pos = new Float32Array(N * 3);
  for (let k = 0; k < N; k++) {
    pos[k * 3] = (Math.random() - 0.5) * 14;
    pos[k * 3 + 1] = (Math.random() - 0.5) * 9;
    pos[k * 3 + 2] = -Math.random() * 18;
  }
  const geo = new THREE.BufferGeometry();
  const attr = new THREE.BufferAttribute(pos, 3);
  attr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', attr);
  const pts = new THREE.Points(geo, pointsMaterial(INK, 0.045, 0.72));
  root.add(pts);
  return {
    root,
    update: (_t, dt) => {
      const v = dt * 0.0015;
      for (let k = 0; k < N; k++) {
        let zz = pos[k * 3 + 2] + v;
        if (zz > 2) {
          zz = -18;
          pos[k * 3] = (Math.random() - 0.5) * 14;
          pos[k * 3 + 1] = (Math.random() - 0.5) * 9;
        }
        pos[k * 3 + 2] = zz;
      }
      attr.needsUpdate = true;
    },
    dispose: () => {
      geo.dispose();
      (pts.material as THREE.Material).dispose();
    },
  };
}

// ===== NETWORK3D: 3D constellation =====
function makeNetwork(): SceneHandle {
  const root = new THREE.Group();
  const N = isMobile() ? 70 : 130;
  const pos = new Float32Array(N * 3);
  const verts: THREE.Vector3[] = [];
  for (let k = 0; k < N; k++) {
    const v = new THREE.Vector3(
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 6,
    );
    v.toArray(pos, k * 3);
    verts.push(v);
  }
  const ptsGeo = new THREE.BufferGeometry();
  ptsGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(ptsGeo, pointsMaterial(INK, 0.08, 0.95));

  const D = 1.6;
  const linePos: number[] = [];
  for (let a = 0; a < N; a++) {
    for (let b = a + 1; b < N; b++) {
      if (verts[a].distanceTo(verts[b]) < D) {
        linePos.push(verts[a].x, verts[a].y, verts[a].z, verts[b].x, verts[b].y, verts[b].z);
      }
    }
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
  const lines = new THREE.LineSegments(
    lineGeo,
    new THREE.LineBasicMaterial({ color: TEAL, transparent: true, opacity: 0.5 }),
  );
  root.add(lines, pts);
  return {
    root,
    update: (t) => {
      root.rotation.y = t * 0.00006;
      root.rotation.x = Math.sin(t * 0.0002) * 0.15;
    },
    dispose: () => {
      ptsGeo.dispose();
      (pts.material as THREE.Material).dispose();
      lineGeo.dispose();
      (lines.material as THREE.Material).dispose();
    },
  };
}

// ── loop / parallax / resize ──────────────────────────────────────
function loop(t: number): void {
  if (!running) return;
  const dt = lastT ? t - lastT : 16;
  lastT = t;
  applyParallax();
  current?.update(t, dt);
  renderer!.render(scene!, camera!);
  raf = requestAnimationFrame(loop);
}

function startLoop(): void {
  if (reduced || running || !visible || !currentMode || !current) return;
  running = true;
  lastT = 0;
  raf = requestAnimationFrame(loop);
}

function stopLoop(): void {
  running = false;
  cancelAnimationFrame(raf);
}

function renderOneFrame(t: number): void {
  if (!renderer || !scene || !camera || !current) return;
  current.update(t, 16);
  renderer.render(scene, camera);
}

function applyParallax(): void {
  if (reduced || !current || !camera) return;
  pointer.x += (pointer.tx - pointer.x) * 0.05;
  pointer.y += (pointer.ty - pointer.y) * 0.05;
  camera.position.x = pointer.x * 0.6;
  camera.position.y = pointer.y * 0.4;
  camera.lookAt(0, 0, 0);
}

function onPointerMove(e: MouseEvent): void {
  pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1);
}

function resize(): void {
  if (!renderer || !host || !camera) return;
  const r = host.getBoundingClientRect();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / Math.max(1, r.height);
  camera.updateProjectionMatrix();
  if (reduced && currentMode) renderOneFrame(1200);
}

function onResize(): void {
  if (resizePending) return;
  resizePending = true;
  requestAnimationFrame(() => {
    resizePending = false;
    resize();
  });
}

function teardownScene(): void {
  stopLoop();
  if (current && scene) {
    scene.remove(current.root);
    current.dispose();
    current = null;
  }
  currentMode = null;
}

function wireEvents(): void {
  window.addEventListener('haidi:hero-variant', syncFromDom);
  document.addEventListener('visibilitychange', () => {
    visible = intersecting && !document.hidden;
    if (visible) startLoop();
    else stopLoop();
  });
  window.addEventListener('resize', onResize);
  if (host) {
    ro = new ResizeObserver(onResize);
    ro.observe(host);
  }
  if (canvas && 'IntersectionObserver' in window) {
    io = new IntersectionObserver(
      (es) => {
        intersecting = !!es[0]?.isIntersecting;
        visible = intersecting && !document.hidden;
        if (visible) startLoop();
        else stopLoop();
      },
      { threshold: 0.05 },
    );
    io.observe(canvas);
  }
  window.addEventListener('mousemove', onPointerMove, { passive: true });
}

// Full teardown — not used on mode switches (those only dispose the scene).
export function destroyHaidiHero3D(): void {
  teardownScene();
  io?.disconnect();
  ro?.disconnect();
  window.removeEventListener('haidi:hero-variant', syncFromDom);
  window.removeEventListener('resize', onResize);
  window.removeEventListener('mousemove', onPointerMove);
  renderer?.dispose();
  renderer?.forceContextLoss?.();
  renderer = null;
  scene = null;
  camera = null;
  canvas?.remove();
  canvas = null;
  host = null;
}
