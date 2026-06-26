import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Observer } from 'gsap/Observer';

export const JOURNEY_STEPS = ['drivers', 'experiments', 'review', 'scenario'] as const;

const SCROLL_DURATION = 0.42;
const SCROLL_EASE = 'power3.out';

let snapPoints: number[] = [];
let panelEls: HTMLElement[] = [];
let journeyStepScroll: Record<string, number> = {};
let locked = false;
let observer: Observer | null = null;
let snapTween: gsap.core.Tween | null = null;
let ready = false;

function readScrollY() {
  return window.scrollY || document.documentElement.scrollTop || 0;
}

function setScrollY(y: number) {
  window.scrollTo(0, y);
}

function headerOffset() {
  const header = document.querySelector('.site-header');
  return header?.getBoundingClientRect().height ?? 70;
}

function anchorY(el: Element) {
  return readScrollY() + el.getBoundingClientRect().top;
}

export function revealVisibleSections() {
  const top = headerOffset();
  document.querySelectorAll('[data-home-scroll] .reveal').forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.94 && rect.bottom > top) {
      el.classList.add('in');
      gsap.set(el, { opacity: 1, y: 0, clearProps: 'transform,opacity,filter' });
    }
  });
  document.querySelectorAll('[data-home-scroll] .sec-rule').forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.94 && rect.bottom > top) {
      gsap.set(el, { opacity: 1, scaleX: 1, clearProps: 'transform,opacity' });
    }
  });
}

export function rebuildHomeSnapPoints() {
  panelEls = gsap.utils.toArray<HTMLElement>('[data-home-scroll] [data-scroll-panel]');
  journeyStepScroll = {};
  snapPoints = panelEls.map((el) => anchorY(el));

  panelEls.forEach((el, i) => {
    const step = el.dataset.journeyStep;
    if (step) journeyStepScroll[step] = snapPoints[i];
  });
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
  return panelEls[currentPanelIndex()] ?? null;
}

export function scrollToY(y: number, duration = SCROLL_DURATION, onLand?: () => void) {
  snapTween?.kill();
  locked = true;

  const proxy = { y: readScrollY() };
  snapTween = gsap.to(proxy, {
    y,
    duration,
    ease: SCROLL_EASE,
    overwrite: true,
    onUpdate: () => {
      setScrollY(proxy.y);
      ScrollTrigger.update();
    },
    onComplete: () => {
      setScrollY(y);
      locked = false;
      snapTween = null;
      ScrollTrigger.update();
      revealVisibleSections();
      onLand?.();
    },
    onInterrupt: () => {
      locked = false;
      snapTween = null;
      revealVisibleSections();
    },
  });
}

export function scrollToJourneyStep(stepId: string, onLand?: () => void) {
  const y = journeyStepScroll[stepId];
  if (y != null) scrollToY(y, SCROLL_DURATION, onLand);
}

export function scrollToPanelIndex(index: number, onLand?: () => void) {
  const clamped = Math.max(0, Math.min(snapPoints.length - 1, index));
  const y = snapPoints[clamped];
  if (y != null) scrollToY(y, SCROLL_DURATION, onLand);
}

function bindObserver(onLand?: () => void) {
  observer?.kill();
  if (snapPoints.length < 2) return;

  observer = Observer.create({
    target: window,
    type: 'wheel,touch',
    tolerance: 28,
    preventDefault: true,
    onUp: () => {
      if (locked) snapTween?.kill();
      scrollToPanelIndex(currentPanelIndex() - 1, onLand);
    },
    onDown: () => {
      if (locked) snapTween?.kill();
      scrollToPanelIndex(currentPanelIndex() + 1, onLand);
    },
  });
}

export function initHomeSectionSnap(onLand?: () => void) {
  if (!document.querySelector('[data-home-scroll]')) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  gsap.registerPlugin(ScrollTrigger, Observer);
  document.documentElement.style.scrollBehavior = 'auto';

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
    if (!ready || locked) return;
    rebuildHomeSnapPoints();
  });
}
