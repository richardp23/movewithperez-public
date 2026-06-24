/** Accessible horizontal carousel — state + scroll-by-one-slide for reliable arrow moves */

function getSlides(track: HTMLElement): HTMLElement[] {
  return [...track.querySelectorAll<HTMLElement>('[data-carousel-slide]')];
}

function wrapIndex(index: number, length: number): number {
  if (length === 0) return 0;
  return ((index % length) + length) % length;
}

const SCROLL_EDGE = 8;

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

function slideStep(slides: HTMLElement[]): number {
  if (slides.length < 2) return slides[0]?.offsetWidth ?? 0;
  return slides[1].offsetLeft - slides[0].offsetLeft;
}

function maxScrollLeft(viewport: HTMLElement): number {
  return Math.max(0, viewport.scrollWidth - viewport.clientWidth);
}

function isAtStart(viewport: HTMLElement): boolean {
  return viewport.scrollLeft <= SCROLL_EDGE;
}

function isAtEnd(viewport: HTMLElement): boolean {
  const max = maxScrollLeft(viewport);
  return max <= 0 || viewport.scrollLeft >= max - SCROLL_EDGE;
}

/** Reconcile state after user swipe — edges first, then nearest slide center */
function indexFromScroll(viewport: HTMLElement, slides: HTMLElement[]): number {
  if (!slides.length) return 0;
  if (isAtStart(viewport)) return 0;
  if (isAtEnd(viewport)) return slides.length - 1;

  const center = viewport.scrollLeft + viewport.clientWidth / 2;
  let best = 0;
  let bestDist = Infinity;
  slides.forEach((slide, i) => {
    const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
    const dist = Math.abs(slideCenter - center);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });
  return best;
}

function updateInert(viewport: HTMLElement, track: HTMLElement): void {
  const slides = getSlides(track);
  const viewLeft = viewport.scrollLeft;
  const viewRight = viewLeft + viewport.clientWidth;

  for (const slide of slides) {
    const slideLeft = slide.offsetLeft;
    const slideRight = slideLeft + slide.offsetWidth;
    const visible = slideRight > viewLeft + 4 && slideLeft < viewRight - 4;
    if (visible) {
      slide.removeAttribute('inert');
      slide.removeAttribute('aria-hidden');
    } else {
      slide.setAttribute('inert', '');
      slide.setAttribute('aria-hidden', 'true');
    }
  }
}

function scrollToIndex(
  viewport: HTMLElement,
  slides: HTMLElement[],
  index: number
): void {
  viewport.scrollTo({
    left: slides[index].offsetLeft,
    behavior: scrollBehavior(),
  });
}

function initCarousel(root: HTMLElement): void {
  if (root.dataset.carouselInitialized === 'true') return;

  const viewport = root.querySelector<HTMLElement>('[data-carousel-viewport]');
  const track = root.querySelector<HTMLElement>('[data-carousel-track]');
  const prev = root.querySelector<HTMLButtonElement>('[data-carousel-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-carousel-next]');
  if (!viewport || !track || !prev || !next) return;

  let activeIndex = 0;

  const onScrollSettled = () => {
    const slides = getSlides(track);
    if (slides.length) {
      activeIndex = indexFromScroll(viewport, slides);
    }
    updateInert(viewport, track);
  };

  const scrollByDir = (dir: -1 | 1) => {
    const slides = getSlides(track);
    if (!slides.length) return;

    const step = slideStep(slides);
    const max = maxScrollLeft(viewport);
    const behavior = scrollBehavior();

    if (dir === 1 && isAtEnd(viewport)) {
      activeIndex = 0;
      viewport.scrollTo({ left: 0, behavior });
    } else if (dir === -1 && isAtStart(viewport)) {
      activeIndex = slides.length - 1;
      viewport.scrollTo({ left: max, behavior });
    } else {
      activeIndex = wrapIndex(activeIndex + dir, slides.length);
      viewport.scrollBy({ left: dir * step, behavior });
    }

    updateInert(viewport, track);
  };

  prev.addEventListener('click', () => scrollByDir(-1));
  next.addEventListener('click', () => scrollByDir(1));

  viewport.addEventListener(
    'scroll',
    () => window.requestAnimationFrame(() => updateInert(viewport, track)),
    { passive: true }
  );

  const supportsScrollEnd = 'onscrollend' in document.createElement('div');
  if (supportsScrollEnd) {
    viewport.addEventListener('scrollend', onScrollSettled, { passive: true });
  } else {
    let syncTimer: ReturnType<typeof setTimeout>;
    viewport.addEventListener(
      'scroll',
      () => {
        clearTimeout(syncTimer);
        syncTimer = setTimeout(onScrollSettled, 120);
      },
      { passive: true }
    );
  }

  viewport.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollByDir(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollByDir(1);
    }
  });

  const resizeObserver = new ResizeObserver(() => {
    const slides = getSlides(track);
    if (!slides.length) return;
    scrollToIndex(viewport, slides, activeIndex);
  });
  resizeObserver.observe(viewport);

  updateInert(viewport, track);
  root.dataset.carouselInitialized = 'true';
}

export function initCarousels(): void {
  document.querySelectorAll<HTMLElement>('[data-carousel]').forEach(initCarousel);
}
