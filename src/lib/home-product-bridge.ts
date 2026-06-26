import gsap from 'gsap';
import {
  currentPanel,
  getPanelIndex,
  initHomeSectionSnap,
  scrollToJourneyStep,
} from './home-section-snap';

export function initHomeProductBridge() {
  if (!document.querySelector('[data-home-scroll]')) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  const canvasHost = document.querySelector('.hero-canvas-host') as HTMLElement | null;
  const stepEls = gsap.utils.toArray<HTMLElement>('.product-journey__step');
  const panels = gsap.utils.toArray<HTMLElement>('.product-journey__mock-panel');
  const previews = gsap.utils.toArray<HTMLElement>('.preview[data-journey-id]');

  let activeStep: string | null = null;

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
    setStep(step, true);

    if (canvasHost) {
      gsap.set(canvasHost, { opacity: getPanelIndex() === 0 ? 1 : Math.max(0.12, 1 - getPanelIndex() * 0.22) });
    }
  }

  stepEls.forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.journeyStep;
      if (!id) return;
      scrollToJourneyStep(id, syncFromPanel);
    });
  });

  initHomeSectionSnap(syncFromPanel);
  syncFromPanel();
}

declare global {
  interface Window {
    initHomeProductBridge?: () => void;
  }
}

window.initHomeProductBridge = initHomeProductBridge;
