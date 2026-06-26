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
  // below it, so its natural resting position is the very top of the page (0) —
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

  panelIndex = currentPanelIndex();
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
    duration: 0.7,
    ease: 'power2.inOut',
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

function bindObserver(onLand?: () => void) {
  observer?.kill();
  if (snapPoints.length < 2) return;

  observer = Observer.create({
    target: window,
    type: 'wheel,touch',
    tolerance: 10,
    wheelSpeed: 1,
    preventDefault: true,
    onUp: () => {
      if (!animating) goToPanel(panelIndex - 1, onLand);
    },
    onDown: () => {
      if (!animating) goToPanel(panelIndex + 1, onLand);
    },
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
