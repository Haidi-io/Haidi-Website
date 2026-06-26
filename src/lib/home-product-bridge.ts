import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  JOURNEY_STEPS,
  currentPanel,
  initHomeSectionSnap,
  scrollToJourneyStep,
} from './home-section-snap';

export function initHomeProductBridge() {
  if (!document.querySelector('[data-home-scroll]')) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  gsap.registerPlugin(ScrollTrigger);

  const canvasHost = document.querySelector('.hero-canvas-host') as HTMLElement | null;
  const hero = document.querySelector('.hero');
  const stepEls = gsap.utils.toArray<HTMLElement>('.product-journey__step');
  const panels = gsap.utils.toArray<HTMLElement>('.product-journey__mock-panel');
  const previews = gsap.utils.toArray<HTMLElement>('.preview[data-journey-id]');

  let activeStep = JOURNEY_STEPS[0];

  function setStep(id: string | null, force = false) {
    if (!force && id === activeStep) return;
    if (id) activeStep = id;

    stepEls.forEach((el) => el.classList.toggle('is-active', id != null && el.dataset.journeyStep === id));
    panels.forEach((el) => el.classList.toggle('is-active', id != null && el.dataset.journeyPanel === id));
    previews.forEach((el) => el.classList.toggle('is-journey-linked', id != null && el.dataset.journeyId === id));

    if (id) {
      document.documentElement.setAttribute('data-journey-active', 'true');
      window.dispatchEvent(new CustomEvent('haidi:journey-step', { detail: { step: id } }));
    } else {
      document.documentElement.removeAttribute('data-journey-active');
    }
  }

  function syncFromPanel() {
    const panel = currentPanel();
    const step = panel?.dataset.journeyStep ?? null;
    if (step) setStep(step, true);
    else setStep(null, true);
  }

  stepEls.forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.journeyStep;
      if (!id) return;
      scrollToJourneyStep(id, syncFromPanel);
    });
  });

  if (hero && canvasHost) {
    ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end: 'bottom top',
      scrub: 0.5,
      onUpdate: (self) => {
        gsap.set(canvasHost, { opacity: 1 - self.progress * 0.88 });
      },
    });
  }

  initHomeSectionSnap(syncFromPanel);
  syncFromPanel();
}

declare global {
  interface Window {
    initHomeProductBridge?: () => void;
  }
}

window.initHomeProductBridge = initHomeProductBridge;
