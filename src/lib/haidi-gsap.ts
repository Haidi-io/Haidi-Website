import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initHomeProductBridge } from './home-product-bridge';

const STAGGER_PARENTS =
  '.value, .stories, .flow, .ind-grid, .previews, .next-steps, .team-grid, .tools-grid, .principles';

export function initHaidiGsap() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  window.__HAIDI_GSAP_READY__ = true;

  initHero();
  initScrollReveals();
  initStaggerGroups();
  resetConnectedWorkflow();
  initParallax();
  initAccentLines();
  initLaunchGlow();
  initHomeProductBridge();
}

function visibleHeroVariant() {
  const key = document.documentElement.getAttribute('data-hero-content') || 'workspace';
  return document.querySelector(`.hero-v--${key}`);
}

function initHero() {
  const root = document.querySelector('[data-hero-root]');
  if (!root) return;

  function animateHero() {
    const variant = visibleHeroVariant();
    if (!variant) return;

    const targets = variant.querySelectorAll('.hero-text > *, .hero-editorial > *');
    gsap.fromTo(
      targets,
      { opacity: 0, y: 30, filter: 'blur(8px)' },
      {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 0.9,
        stagger: 0.09,
        ease: 'power3.out',
        clearProps: 'filter',
      },
    );
  }

  animateHero();
  window.addEventListener('haidi:hero-variant', animateHero);

  const scroll = document.querySelector('.hero-scroll');
  if (scroll) {
    gsap.to(scroll, { y: 10, duration: 1.8, repeat: -1, yoyo: true, ease: 'sine.inOut' });
  }

  const canvasHost = document.querySelector('.hero-canvas-host');
  if (canvasHost) {
    gsap.fromTo(canvasHost, { opacity: 0 }, { opacity: 1, duration: 1.4, ease: 'power1.out' });
  }
}

function initScrollReveals() {
  gsap.utils.toArray<HTMLElement>('.reveal').forEach((el) => {
    if (el.closest('[data-home-scroll]')) return;
    const staggerParent = el.closest(STAGGER_PARENTS);
    if (staggerParent && staggerParent !== el) return;

    el.classList.remove('in');
    const delay = parseFloat(el.dataset.delay || '0') * 0.09;

    gsap.fromTo(
      el,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.95,
        delay,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          once: true,
        },
      },
    );
  });
}

function initStaggerGroups() {
  const groups: { parent: string; child: string }[] = [
    { parent: '.value', child: '.value-col' },
    { parent: '.stories', child: '.story' },
    { parent: '.flow', child: '.flow-step' },
    { parent: '.ind-grid', child: '.ind' },
    { parent: '.previews', child: '.preview' },
    { parent: '.next-steps', child: '.ns' },
    { parent: '.team-grid', child: '.tcard' },
    { parent: '.tools-grid', child: '[data-frag]' },
    { parent: '.principles', child: '.principle' },
  ];

  groups.forEach(({ parent, child }) => {
    document.querySelectorAll(parent).forEach((container) => {
      if (container.closest('[data-home-scroll]')) return;
      const items = gsap.utils.toArray<HTMLElement>(container.querySelectorAll(child));
      if (!items.length) return;

      container.classList.remove('reveal', 'in');
      gsap.set(container, { opacity: 1, y: 0 });

      items.forEach((item) => item.classList.remove('reveal', 'in'));
      gsap.set(items, { opacity: 0, y: 32 });

      ScrollTrigger.create({
        trigger: container,
        start: 'top 84%',
        once: true,
        onEnter: () => {
          gsap.to(items, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.11,
            ease: 'power2.out',
          });
        },
      });
    });
  });
}

function resetConnectedWorkflow() {
  document.querySelectorAll('.cw-flow').forEach((flow) => {
    flow.classList.remove('reveal', 'in');
    gsap.set(flow, { opacity: 1, y: 0, clearProps: 'opacity,transform' });
    flow.querySelectorAll('.cw-node').forEach((node) => {
      gsap.set(node, { opacity: 1, y: 0, clearProps: 'opacity,transform' });
    });
  });
}

function initParallax() {
  gsap.utils.toArray<HTMLElement>('.section-head').forEach((head) => {
    if (head.closest('[data-home-scroll]')) return;
    gsap.fromTo(
      head,
      { y: 30 },
      {
        y: -16,
        ease: 'none',
        scrollTrigger: {
          trigger: head,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.55,
        },
      },
    );
  });

  gsap.utils.toArray<HTMLElement>('.frame, .glow-wrap').forEach((frame) => {
    if (frame.closest('.product-journey__mock') || frame.closest('[data-home-scroll]')) return;
    gsap.fromTo(
      frame,
      { y: 40 },
      {
        y: -20,
        ease: 'none',
        scrollTrigger: {
          trigger: frame,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.8,
        },
      },
    );
  });
}

function initAccentLines() {
  gsap.utils.toArray<HTMLElement>('.sec-rule').forEach((rule) => {
    if (rule.closest('[data-home-scroll]')) return;
    gsap.set(rule, { transformOrigin: 'left center' });
    gsap.fromTo(
      rule,
      { scaleX: 0.55, opacity: 0.45 },
      {
        scaleX: 1,
        opacity: 1,
        duration: 1.1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: rule,
          start: 'top 92%',
          once: true,
        },
      },
    );
  });
}

function initLaunchGlow() {
  document.querySelectorAll('.launch-glow, .final-glow').forEach((glow) => {
    gsap.fromTo(
      glow,
      { opacity: 0.4, scale: 0.92 },
      {
        opacity: 1,
        scale: 1,
        duration: 2.4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        scrollTrigger: {
          trigger: glow,
          start: 'top bottom',
          toggleActions: 'play pause resume pause',
        },
      },
    );
  });
}

declare global {
  interface Window {
    __HAIDI_GSAP__?: boolean;
    __HAIDI_GSAP_READY__?: boolean;
  }
}
