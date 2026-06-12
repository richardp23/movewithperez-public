/** Mobile nav drawer — animated open/close, escape to close, close on navigate */

const PANEL_TRANSITION_MS = 400;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function setOpen(
  toggle: HTMLButtonElement,
  panel: HTMLElement,
  open: boolean
): void {
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');

  if (prefersReducedMotion()) {
    panel.hidden = !open;
    panel.classList.toggle('is-open', open);
    return;
  }

  if (open) {
    panel.hidden = false;
    panel.classList.remove('is-closing');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => panel.classList.add('is-open'));
    });
    return;
  }

  panel.classList.remove('is-open');
  panel.classList.add('is-closing');

  const finishClose = () => {
    if (toggle.getAttribute('aria-expanded') === 'true') return;
    panel.hidden = true;
    panel.classList.remove('is-closing');
  };

  const onEnd = (e: TransitionEvent) => {
    if (e.target !== panel) return;
    panel.removeEventListener('transitionend', onEnd);
    finishClose();
  };

  panel.addEventListener('transitionend', onEnd);
  window.setTimeout(finishClose, PANEL_TRANSITION_MS + 40);
}

function initMobileNav(root: HTMLElement): void {
  if (root.dataset.mobileNavInitialized === 'true') return;

  const toggle = root.querySelector<HTMLButtonElement>('[data-mobile-nav-toggle]');
  const panel = root.querySelector<HTMLElement>('[data-mobile-nav-panel]');
  if (!toggle || !panel) return;

  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    setOpen(toggle, panel, !isOpen);
  });

  for (const link of panel.querySelectorAll('a')) {
    link.addEventListener('click', () => setOpen(toggle, panel, false));
  }

  root.dataset.mobileNavInitialized = 'true';
}

let escapeBound = false;
let resizeBound = false;

function closeAllMobileNavs(): void {
  for (const toggle of document.querySelectorAll<HTMLButtonElement>(
    '[data-mobile-nav-toggle][aria-expanded="true"]'
  )) {
    const panel = toggle
      .closest('[data-mobile-nav]')
      ?.querySelector<HTMLElement>('[data-mobile-nav-panel]');
    if (panel) setOpen(toggle, panel, false);
  }
}

function bindResizeOnce(): void {
  if (resizeBound) return;
  resizeBound = true;
  window.matchMedia('(min-width: 640px)').addEventListener('change', (e) => {
    if (e.matches) closeAllMobileNavs();
  });
}

function bindEscapeOnce(): void {
  if (escapeBound) return;
  escapeBound = true;
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const toggle = document.querySelector<HTMLButtonElement>(
      '[data-mobile-nav-toggle][aria-expanded="true"]'
    );
    if (!toggle) return;
    const panel = toggle
      .closest('[data-mobile-nav]')
      ?.querySelector<HTMLElement>('[data-mobile-nav-panel]');
    if (!panel) return;
    setOpen(toggle, panel, false);
    toggle.focus();
  });
}

export function initMobileNavs(): void {
  bindEscapeOnce();
  bindResizeOnce();
  document.querySelectorAll<HTMLElement>('[data-mobile-nav]').forEach(initMobileNav);
}
