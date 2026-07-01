import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Observer } from 'gsap/Observer';

export const JOURNEY_STEPS = ['drivers', 'experiments', 'review', 'scenario'] as const;

let snapPoints: number[] = [];
let panelEls: HTMLElement[] = [];
let journeyStepScroll: Record<string, number> = {};
let observer: Observer | null = null;
let ready = false;
let panelIndex = 0;
let animating = false;
let scrollTween: gsap.core.Tween | null = null;
// One snap per gesture: locked while a gesture is in flight (including its
// momentum tail), re-armed only when input actually stops. This stops a late
// inertia / rubber-band bounce from firing a snap in the opposite direction.
let locked = false;
let unlockTimer = 0;

function readScrollY() {
  return window.scrollY || document.documentElement.scrollTop || 0;
}

function setScrollY(y: number) {
  window.scrollTo(0, y);
}

function anchorY(el: Element) {
  return readScrollY() + el.getBoundingClientRect().top;
}

export function revealVisibleSections() {
  const panel = panelEls[panelIndex];
  if (!panel) return;

  panel.querySelectorAll('.reveal').forEach((el) => {
    el.classList.add('in');
    gsap.set(el, { opacity: 1, y: 0, clearProps: 'transform,opacity,filter' });
  });

  panel.querySelectorAll('.sec-rule').forEach((el) => {
    gsap.set(el, { opacity: 1, scaleX: 1, clearProps: 'transform,opacity' });
  });
}

export function rebuildHomeSnapPoints() {
  panelEls = gsap.utils.toArray<HTMLElement>('[data-home-scroll] [data-scroll-panel]');
  journeyStepScroll = {};
  snapPoints = panelEls.map((el) => anchorY(el));

  // The hero panel is shortened by the sticky header's height and sits directly
  // below it, so its natural resting position is the very top of the page (0) –
  // not its offset top. Without this, scrolling back up stops ~70px short and
  // tucks the hero's top under the header.
  if (snapPoints.length) snapPoints[0] = 0;

  panelEls.forEach((el, i) => {
    const step = el.dataset.journeyStep;
    if (step) journeyStepScroll[step] = snapPoints[i];
  });

  // The footer sits outside the snap container, so the panel-to-panel Observer
  // would otherwise dead-end on the last panel and never reveal it. Add a final
  // snap target at the document bottom (currentPanel() returns null here, which
  // all consumers already tolerate).
  if (document.querySelector('.site-footer')) {
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    if (maxScroll > snapPoints[snapPoints.length - 1] + 1) snapPoints.push(maxScroll);
  }

  // Don't resync the index mid-snap – a refresh (e.g. resize) firing during the
  // tween would otherwise reset panelIndex to the panel being left and desync the
  // next scroll. When at rest, derive it from the actual scroll position.
  if (!animating) panelIndex = currentPanelIndex();
}

export function currentPanelIndex() {
  const scroll = readScrollY();
  let idx = 0;
  let min = Infinity;
  snapPoints.forEach((p, i) => {
    const d = Math.abs(p - scroll);
    if (d < min) {
      min = d;
      idx = i;
    }
  });
  return idx;
}

export function currentPanel() {
  return panelEls[panelIndex] ?? null;
}

function goToPanel(index: number, onLand?: () => void) {
  const clamped = Math.max(0, Math.min(snapPoints.length - 1, index));
  if (clamped === panelIndex) return;

  panelIndex = clamped;
  scrollTween?.kill(); // allow journey-step clicks to retarget mid-animation
  animating = true;

  const proxy = { y: readScrollY() };
  scrollTween = gsap.to(proxy, {
    y: snapPoints[clamped],
    duration: 0.42,
    ease: 'power3.out',
    onUpdate: () => setScrollY(proxy.y),
    onComplete: () => {
      animating = false;
      scrollTween = null;
    },
  });

  revealVisibleSections();
  window.dispatchEvent(new CustomEvent('haidi:panel-snap', { detail: { index: clamped } }));
  onLand?.();
}

export function scrollToJourneyStep(stepId: string, onLand?: () => void) {
  const y = journeyStepScroll[stepId];
  const idx = snapPoints.indexOf(y);
  if (idx >= 0) goToPanel(idx, onLand);
}

export function scrollToPanelIndex(index: number, onLand?: () => void) {
  goToPanel(index, onLand);
}

function unlock() {
  locked = false;
  clearTimeout(unlockTimer);
}

function bindObserver(onLand?: () => void) {
  observer?.kill();
  if (snapPoints.length < 2) return;

  // One snap per gesture. `dir` is +1 to advance, -1 to go back.
  function step(dir: number) {
    if (animating || locked) return;
    // Refresh positions and read the current panel from the LIVE layout. A stale
    // read (panels can shift after fonts/mocks/resize/dynamic-vh) is what made a
    // scroll occasionally snap the wrong way.
    rebuildHomeSnapPoints();
    const from = currentPanelIndex();
    const to = Math.max(0, Math.min(snapPoints.length - 1, from + dir));
    if (to === from) return; // at an edge – no-op, and don't lock so input stays live
    locked = true;
    clearTimeout(unlockTimer);
    // Safety re-arm in case onStop never fires (e.g. very gentle input).
    unlockTimer = window.setTimeout(unlock, 900);
    goToPanel(to, onLand);
  }

  //   onUp   = scrolling up   → go back to the previous panel
  //   onDown = scrolling down → advance to the next panel
  observer = Observer.create({
    target: window,
    type: 'wheel,touch',
    tolerance: 10,
    wheelSpeed: 1,
    preventDefault: true,
    onUp: () => step(-1),
    onDown: () => step(1),
    onStop: unlock,
    onStopDelay: 0.15,
  });
}

export function initHomeSectionSnap(onLand?: () => void) {
  if (!document.querySelector('[data-home-scroll]')) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  gsap.registerPlugin(ScrollTrigger, Observer);
  document.documentElement.style.scrollBehavior = 'auto';
  document.body.style.scrollBehavior = 'auto';

  function setup() {
    rebuildHomeSnapPoints();
    bindObserver(onLand);
    ready = true;
    // Reveal whatever panel we land on at load – goToPanel only reveals on
    // scroll, so without this the first panel's .reveal content stays hidden
    // (invisible on pages whose first panel isn't the self-animating hero).
    revealVisibleSections();
  }

  if (!ready) {
    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      setup();
    });
  }

  ScrollTrigger.addEventListener('refresh', () => {
    if (!ready) return;
    rebuildHomeSnapPoints();
  });
}

export function getPanelIndex() {
  return panelIndex;
}
