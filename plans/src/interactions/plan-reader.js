import { drawPlanStack, getPlanStackProgress } from "./plan-stack.js";

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;
const INTRO_REVEAL_THRESHOLD = 0.2;
const SCROLL_SCRUB_MS = 250;
const READER_ITEM_BASE_GAP = 48;
const READER_ITEM_ACTIVE_EXTRA_GAP = 170;
const READER_ENTRY_START = -0.18;
const READER_FIRST_READ = 0.14;
const READER_LAST_READ = 0.88;
const READER_ENTRY_SPACER = 170;
const READER_ITEM_TRAVEL = 64;
const READER_TOP_OFFSET = -40;
const READER_BODY_FADE_START = 0.4;
const READER_BODY_FADE_END = 0.52;

// A single scroll coordinate drives both the deck and its reading states.
export function initializePlanReader() {
  const reader = document.querySelector('.plan-reader');
  const scene = reader.querySelector('.plan-reader__scene');
  const left = reader.querySelector('.plan-reader__intro');
  const list = reader.querySelector('.plan-reader__list');
  const items = [...reader.querySelectorAll('.plan-reader__item')];
  const details = [...reader.querySelectorAll('.plan-reader__detail')];
  const playIcon = reader.querySelector('[data-play-icon]');
  const isAmperos = reader.classList.contains('plan-reader--amperos');
  const cards = ['blue', 'purple', 'peach'].map(color => reader.querySelector(`.growth-card--${color}`));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 1000px)');
  let frame = 0;
  let lastTime = 0;
  let current = null;
  let cardCurrent = null;
  let activeIndex = -1;
  let geometry;

  function measure() {
    const vh = window.innerHeight;
    const rect = reader.getBoundingClientRect();
    const stack = reader.querySelector('.growth-card-stack');
    geometry = {
      top: rect.top + window.scrollY,
      vh,
      pinTop: Math.max(isAmperos ? 24 : 32, (vh - scene.offsetHeight) / 2),
      width: stack.offsetWidth,
      runway: Math.max(1, reader.offsetHeight - scene.offsetHeight),
      listEndY: isAmperos ? 0 : left.offsetTop + READER_TOP_OFFSET - list.offsetTop,
    };
    current = null;
    cardCurrent = null;
    schedule();
  }

  function draw(time) {
    frame = 0;
    if (reduced.matches || compact.matches) return;
    const { top, pinTop, vh, width, runway } = geometry;
    const raw = (window.scrollY - top + pinTop) / runway;
    const target = clamp(raw, READER_ENTRY_START, 1);
    const dt = Math.min(64, time - (lastTime || time));
    lastTime = time;
    current = current === null ? target : lerp(current, target, 1 - Math.exp(-dt / SCROLL_SCRUB_MS));
    if (Math.abs(current - target) < 0.0001) current = target;
    // Animation starts before pinning; Lassie uses separate animation/pin ranges.
    const cardTarget = getPlanStackProgress(top - window.scrollY, vh);
    cardCurrent = cardCurrent === null ? cardTarget : lerp(cardCurrent, cardTarget, 1 - Math.exp(-dt / SCROLL_SCRUB_MS));
    if (Math.abs(cardCurrent - cardTarget) < 0.0001) cardCurrent = cardTarget;
    // A separate -1 → 0 entry lets the first title rise before its body appears.
    const progress = current <= READER_FIRST_READ
      ? -1 + clamp((current - READER_ENTRY_START) / (READER_FIRST_READ - READER_ENTRY_START))
      : clamp((current - READER_FIRST_READ) / (READER_LAST_READ - READER_FIRST_READ)) * 2;
    const entrance = clamp((window.scrollY - top + vh * 0.68) / (vh * 0.68 - pinTop));
    const introVisible = entrance >= INTRO_REVEAL_THRESHOLD;
    left.dataset.visible = String(introVisible);
    left.inert = !introVisible;
    if (!isAmperos) list.style.opacity = entrance;
    list.inert = entrance < 0.05;
    const smoothstep = value => value * value * (3 - 2 * value);
    if (isAmperos) {
      const settledProgress = clamp(progress, 0, items.length - 1);
      const nextActiveIndex = Math.round(settledProgress);
      list.dataset.visible = String(introVisible);
      if (nextActiveIndex !== activeIndex) {
        const direction = activeIndex < 0 ? 1 : Math.sign(nextActiveIndex - activeIndex);
        activeIndex = nextActiveIndex;
        list.style.setProperty('--detail-exit-offset', `${-direction * 6}px`);
        playIcon.src = `./assets/plans/${items[activeIndex].querySelector('button').dataset.playIcon}`;
        const positions = { '-2': -130, '-1': 95, '0': 241, '1': 518, '2': 795 };
        items.forEach((item, index) => {
          const relation = clamp(index - activeIndex, -2, 2);
          item.style.transform = `translateY(${positions[relation]}px)`;
          item.style.opacity = relation === 0 ? '1' : '0.18';
          const button = item.querySelector('[data-plan-index]');
          if (button) {
            button.setAttribute('aria-current', String(index === activeIndex));
            button.textContent = index === activeIndex ? button.dataset.planTitle : button.dataset.planName;
          }
        });
        details.forEach((detail, index) => {
          detail.setAttribute('aria-hidden', String(index !== activeIndex));
        });
      }
    } else {
      // Derive the entire reading track backward from its upper limit, including the intro's top offset.
      const remainingItems = items.length - 1 - progress;
      const listTrackY = geometry.listEndY + remainingItems * READER_ITEM_TRAVEL
        + READER_ENTRY_SPACER * clamp(-progress);
      list.style.transform = `translateY(${listTrackY}px)`;
      items.forEach((item, index) => {
        const distance = Math.abs(progress - index);
        const opacity = distance <= 1 ? lerp(1, 0.5, distance) : lerp(0.5, 0.3, clamp(distance - 1));
        item.querySelector('h3').style.opacity = opacity;
        const visibility = clamp(1 - distance);
        item.style.marginBottom = `${READER_ITEM_BASE_GAP + READER_ITEM_ACTIVE_EXTRA_GAP * visibility}px`;
        const button = item.querySelector('button');
        button.setAttribute('aria-current', String(index === Math.round(progress)));
        const body = item.querySelector('.plan-reader__body');
        if (body) {
          const fade = smoothstep(clamp((distance - READER_BODY_FADE_START)
            / (READER_BODY_FADE_END - READER_BODY_FADE_START)));
          const paragraph = body.firstElementChild;
          paragraph.style.opacity = 1 - fade;
          paragraph.style.filter = `blur(${fade * 4.75}px)`;
          paragraph.style.transform = `translateY(${fade * 6}px)`;
          body.style.height = `${paragraph.offsetHeight * visibility}px`;
          body.style.marginTop = `${12 * visibility}px`;
          body.setAttribute('aria-hidden', String(index !== Math.round(progress)));
          button.setAttribute('aria-expanded', String(index === Math.round(progress)));
        }
      });
    }
    drawPlanStack(cards, cardCurrent, vh, width * 420 / 464);
    if (current !== target || cardCurrent !== cardTarget) frame = requestAnimationFrame(draw);
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(draw);
  }
  function reset() {
    [left, list, ...cards, ...items, ...details, ...items.flatMap(item => [...item.querySelectorAll('h3, .plan-reader__body, .plan-reader__body p')])].forEach(el => el.removeAttribute('style'));
    left.dataset.visible = String(compact.matches || reduced.matches);
    items.forEach(item => {
      item.querySelector('button').setAttribute('aria-current', 'false');
      const body = item.querySelector('.plan-reader__body');
      if (body) { body.removeAttribute('aria-hidden'); item.querySelector('button').setAttribute('aria-expanded', 'true'); }
    });
    left.inert = false;
    list.inert = false;
    details.forEach(detail => detail.removeAttribute('aria-hidden'));
    activeIndex = -1;
    measure();
  }
  const onClick = event => {
    const button = event.target.closest('[data-plan-index]');
    if (!button || compact.matches || reduced.matches) return;
    const p = READER_FIRST_READ + Number(button.dataset.planIndex)
      / (items.length - 1) * (READER_LAST_READ - READER_FIRST_READ);
    window.scrollTo({ top: geometry.top - geometry.pinTop + geometry.runway * p, behavior: 'smooth' });
  };
  reader.addEventListener('click', onClick);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  reduced.addEventListener('change', reset);
  compact.addEventListener('change', reset);
  const observer = new ResizeObserver(measure);
  observer.observe(document.querySelector('.growth-plans__stage'));
  document.fonts.ready.then(measure);
  reset();
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', measure);
    reduced.removeEventListener('change', reset);
    compact.removeEventListener('change', reset);
    reader.removeEventListener('click', onClick);
  };
}
