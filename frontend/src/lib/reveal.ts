const REVEAL_SELECTOR = '[data-reveal]';
const READY_CLASS = 'reveal-ready';
const VISIBLE_CLASS = 'is-visible';
const STAGGER_STEP_ATTR = 'data-reveal-stagger';
const STAGGER_START_ATTR = 'data-reveal-stagger-start';
const STAGGER_ITEM_SELECTOR = '[data-reveal-item]';

function shouldReduceMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function markAllVisible(elements: Element[]): void {
  for (const element of elements) {
    element.classList.add(VISIBLE_CLASS);
  }
}

function applyStagger(target: HTMLElement): void {
  if (!target.hasAttribute(STAGGER_STEP_ATTR)) return;

  const stepRaw = Number(target.getAttribute(STAGGER_STEP_ATTR));
  const startRaw = Number(target.getAttribute(STAGGER_START_ATTR));
  const step = Number.isFinite(stepRaw) && stepRaw >= 0 ? stepRaw : 140;
  const start = Number.isFinite(startRaw) && startRaw >= 0 ? startRaw : 0;

  const items = [...target.querySelectorAll<HTMLElement>(STAGGER_ITEM_SELECTOR)];
  items.forEach((item, index) => {
    item.style.setProperty('--reveal-delay', `${start + index * step}ms`);
  });
}

export function initReveal(immediate = false): void {
  const elements = [...document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)];
  if (!elements.length) return;

  document.documentElement.classList.add(READY_CLASS);

  if (immediate || shouldReduceMotion()) {
    elements.forEach((element) => applyStagger(element));
    markAllVisible(elements);
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const target = entry.target as HTMLElement;
        applyStagger(target);
        target.classList.add(VISIBLE_CLASS);
        obs.unobserve(entry.target);
      }
    },
    {
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.12,
    }
  );

  for (const element of elements) {
    if (element.classList.contains(VISIBLE_CLASS)) continue;
    observer.observe(element);
  }
}
