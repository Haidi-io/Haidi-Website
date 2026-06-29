import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

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

  // The home scroll-snap / journey bridge (pulls in the Observer plugin) is only
  // needed on the home page — load it as a separate chunk on demand.
  if (document.querySelector('[data-home-scroll]')) {
    import('./home-product-bridge').then(({ initHomeProductBridge }) => initHomeProductBridge());
  }
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

    const isTagline =
      (document.documentElement.getAttribute('data-hero-content') || 'workspace') === 'tagline';
    const headline = isTagline ? variant.querySelector<HTMLElement>('.hero-text h1') : null;

    // The tagline headline types itself out (typewriter); fold every other
    // hero-text child into the usual blur/slide stagger.
    const targets = Array.from(variant.querySelectorAll<HTMLElement>('.hero-text > *')).filter(
      (el) => el !== headline,
    );
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

    if (headline) typeHeadline(headline);
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

// Original headline markup, captured before the first type so a variant switch
// back to tagline can restore and retype from a clean state. Keyed by element so
// it survives re-runs without leaking globals.
const headlineSource = new WeakMap<HTMLElement, string>();
const headlineTimers = new WeakMap<HTMLElement, number>();

type TypeChar = { ch: string; accent: boolean };

// Types the tagline headline out character-by-character (antigravity-style),
// preserving the trailing teal ".accent" word and trailing a blinking caret.
function typeHeadline(h1: HTMLElement) {
  // Cancel any in-flight type from a prior activation and restore clean markup.
  const pending = headlineTimers.get(h1);
  if (pending) window.clearTimeout(pending);
  if (!headlineSource.has(h1)) headlineSource.set(h1, h1.innerHTML);
  else h1.innerHTML = headlineSource.get(h1) as string;

  // Flatten child nodes into an ordered char list, tagging which chars belong to
  // the .accent span so we can recolour them while typing.
  const chars: TypeChar[] = [];
  h1.childNodes.forEach((node) => {
    const accent =
      node.nodeType === 1 && (node as HTMLElement).classList.contains('accent');
    const text = node.textContent || '';
    for (const ch of text) chars.push({ ch, accent });
  });

  const fullText = chars.map((c) => c.ch).join('');
  h1.setAttribute('aria-label', fullText);

  // Reserve the fully-wrapped height so the hero doesn't jump as lines fill in.
  h1.style.minHeight = `${h1.offsetHeight}px`;

  // Rebuild as: plain span + accent span + caret. Untyped segments stay empty,
  // so the caret naturally trails the last typed glyph.
  h1.textContent = '';
  const plain = document.createElement('span');
  const accentSpan = document.createElement('span');
  accentSpan.className = 'accent';
  const caret = document.createElement('span');
  caret.className = 'hero-caret';
  caret.setAttribute('aria-hidden', 'true');
  h1.append(plain, accentSpan, caret);

  let i = 0;
  function step() {
    if (i >= chars.length) {
      headlineTimers.delete(h1);
      return;
    }
    const { ch, accent } = chars[i];
    (accent ? accentSpan : plain).textContent += ch;
    i += 1;
    // A touch of jitter, with a longer beat after spaces/punctuation.
    const base = /[\s.,]/.test(ch) ? 90 : 34;
    const timer = window.setTimeout(step, base + Math.random() * 26);
    headlineTimers.set(h1, timer);
  }
  step();
}

function initScrollReveals() {
  gsap.utils.toArray<HTMLElement>('.reveal').forEach((el) => {
    if (el.closest('[data-home-scroll]')) return;
    const staggerParent = el.closest(STAGGER_PARENTS);
    if (staggerParent && staggerParent !== el) return;

    el.classList.remove('in');
    const delay = parseFloat(el.dataset.delay || '0') * 0.05;

    gsap.fromTo(
      el,
      { opacity: 0, y: 32 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        delay,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 90%',
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
            duration: 0.5,
            stagger: 0.07,
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
        duration: 0.6,
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
  document.querySelectorAll('.cta-banner__glow, .final-glow').forEach((glow) => {
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
