import { drawPlanStack, getPlanStackPoses, getPlanStackProgress } from "../plans/src/interactions/plan-stack.js";

const section = document.querySelector(".rise-benefits");
const title = section.querySelector("h2");
const track = section.querySelector(".rise-benefits-track");
const scene = section.querySelector(".rise-benefits-scene");
const deck = section.querySelector(".rise-benefits-deck");
const rail = section.querySelector(".rise-benefits-rail");
const cards = ["teal", "purple", "peach"].map(color => deck.querySelector(`.rise-benefits-card--${color}`));
const items = [...rail.children].map(row => ({
  row,
  button: row.querySelector("button"),
  body: row.querySelector(".rise-benefits-body"),
  copy: row.querySelector(".rise-benefits-copy"),
}));
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const compact = matchMedia("(max-width: 1000px), (max-height: 680px)");
const clamp = value => Math.max(0, Math.min(value, 1));
const mix = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);
const firstRead = .19;
const lastRead = .88;
const entryStart = -.18;
const scrubMs = 250;
const headingGap = 38;
export const activeContentGapControl = [88, headingGap, 160, 1];
export const initialTitleGapControl = [64, headingGap, 160, 1];
let activeHeadingGap = activeContentGapControl[0];
let initialTitleGap = initialTitleGapControl[0];
const copyGap = 20;
const fadeStart = .32;
const fadeEnd = .40;
const entryCardVisibility = .7;
const entrySpaceStart = .18;
const entrySpaceEnd = .88;
const entryCopyStart = .82;
const entryCopyEnd = .97;
const firstSpaceHandoffInset = .10;
const spaceHandoffInset = .24;
let frame = 0;
let current;
let cardCurrent;
let lastTime = 0;
let accessibilityState;

// The single-line heading uses the same stacked entrance as the About page.
if (!reduced.matches) {
  title.classList.add("reveal-pending");
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    title.classList.remove("reveal-pending");
    if (reduced.matches) return;
    const animation = title.animate([
      { opacity: 0, transform: "translateY(.5em)" },
      { opacity: 1, transform: "translateY(0)" },
    ], { duration: 914, easing: "cubic-bezier(.241,.969,.635,.997)" });
    reduced.addEventListener("change", () => animation.cancel(), { once: true });
  }, { threshold: .15, rootMargin: "0px 0px -10% 0px" });
  observer.observe(title);
  reduced.addEventListener("change", () => title.classList.remove("reveal-pending"), { once: true });
}

function drawRail(progress, cardHeight, sizes, vh, pinTop, sceneTop) {
  const openGapBonus = activeHeadingGap - headingGap;
  const active = Math.max(0, Math.round(progress));
  const entry = clamp(progress + 1);
  const anchor = 125 / 491 * cardHeight;
  const lastIndex = items.length - 1;
  // Keep reserves non-increasing before the final heading so an opening
  // description never adds more space than the preceding one gives up.
  const reserves = sizes.map(({ copy }, index) => index < lastIndex
    ? Math.max(...sizes.slice(index, lastIndex).map(size => size.copy))
    : copy);
  const collapsedSpan = sizes.slice(0, lastIndex)
    .reduce((span, size) => span + size.heading + headingGap, 0);
  const travelPerStep = (collapsedSpan + 32 / 491 * cardHeight) / lastIndex;
  // Place the first title at the requested point on the card during entry.
  const front = getPlanStackPoses(0, vh, cardHeight)[0];
  const cardTop = front.y + (1 - front.scale) * cardHeight / 2;
  const entryDistance = cardTop + cardHeight * front.scale * entryCardVisibility - anchor;
  // Match the rail's speed at the end of the entrance to its reading speed.
  const entryEndSpeed = travelPerStep * lastIndex * (firstRead - entryStart) / (lastRead - firstRead);
  const entryOffset = entryDistance * (1 - ease(entry)) + entryEndSpeed * entry ** 2 * (1 - entry);
  const viewportTravel = Math.max(1, vh - pinTop - anchor);
  const unpinnedTravel = Math.max(0, sceneTop - pinTop);
  const entryTravel = 1 - (unpinnedTravel + entryOffset) / viewportTravel;
  const firstSlotGrowth = reserves[0] + copyGap + activeHeadingGap - initialTitleGap;
  // Long copy or a large tuned gap needs more runway to keep every heading rising.
  const spaceStart = Math.min(entrySpaceStart, entrySpaceEnd - 1.5 * firstSlotGrowth / viewportTravel);
  const entrySpace = ease(clamp((entryTravel - spaceStart) / (entrySpaceEnd - spaceStart)));
  // Start trading space while the first description is still readable.
  const inset = progress < 1 ? firstSpaceHandoffInset : spaceHandoffInset;
  const visibility = items.map((_, index) => {
    const distance = Math.abs(progress - index);
    const emphasis = clamp(1 - Math.abs(Math.max(0, progress) - index));
    const enteringFirst = index === 0 && progress < 0;
    const expanded = enteringFirst
      ? entrySpace
      : ease(clamp((emphasis - inset) / (1 - 2 * inset)));
    const timeFade = enteringFirst
      ? 1 - ease(clamp((entryTravel - entryCopyStart) / (entryCopyEnd - entryCopyStart)))
      : ease(clamp((distance - fadeStart) / (fadeEnd - fadeStart)));
    const gap = enteringFirst
      ? mix(initialTitleGap, activeHeadingGap, entrySpace)
      : headingGap + openGapBonus * expanded;
    const spaceBelowCopy = gap + reserves[index] * expanded - sizes[index].copy;
    const roomFade = index === lastIndex ? 0 : 1 - ease(clamp((spaceBelowCopy - 10) / 20));
    return { emphasis, expanded, gap, fade: Math.max(timeFade, roomFade) };
  });
  const expandedIndex = visibility[active].fade < 1 ? active : -1;
  const nextAccessibilityState = `${active}:${expandedIndex}`;
  items.forEach(({ row, button, body, copy }, index) => {
    const { emphasis, expanded, gap, fade } = visibility[index];
    row.style.setProperty("--item-gap", `${gap}px`);
    row.style.setProperty("--heading-color", `color-mix(in srgb, black ${emphasis * 100}%, #d0d5dd)`);
    body.style.setProperty("--body-height", `${reserves[index] * expanded}px`);
    body.style.setProperty("--body-gap", `${copyGap * expanded}px`);
    copy.style.setProperty("--body-opacity", 1 - fade);
    copy.style.setProperty("--body-blur", `${4.75 * fade}px`);
    copy.style.setProperty("--body-y", `${6 * fade}px`);
    if (accessibilityState !== nextAccessibilityState) {
      button.setAttribute("aria-current", String(index === active));
      button.setAttribute("aria-expanded", String(index === expandedIndex));
      body.setAttribute("aria-hidden", String(index !== expandedIndex));
    }
  });
  accessibilityState = nextAccessibilityState;
  rail.style.setProperty("--rail-y", `${anchor + entryOffset - Math.max(0, progress) * travelPerStep}px`);
}

function draw(time) {
  frame = 0;
  if (!section.hasAttribute("data-motion")) return;
  const vh = innerHeight;
  const runway = track.offsetHeight - scene.offsetHeight;
  const pinTop = parseFloat(getComputedStyle(scene).top);
  const trackTop = track.getBoundingClientRect().top;
  const target = Math.max(entryStart, Math.min(1, (pinTop - trackTop) / runway));
  const cardTarget = getPlanStackProgress(trackTop, vh);
  const dt = Math.min(64, time - (lastTime || time));
  lastTime = time;
  const catchUp = 1 - Math.exp(-dt / scrubMs);
  current = current === undefined ? target : mix(current, target, catchUp);
  if (Math.abs(current - target) < .0001) current = target;
  cardCurrent = cardCurrent === undefined ? cardTarget : mix(cardCurrent, cardTarget, catchUp);
  if (Math.abs(cardCurrent - cardTarget) < .0001) cardCurrent = cardTarget;
  const progress = current <= firstRead
    ? -1 + clamp((current - entryStart) / (firstRead - entryStart))
    : 2 * clamp((current - firstRead) / (lastRead - firstRead));
  const height = deck.offsetHeight;
  const sizes = items.map(({ button, copy }) => ({ heading: button.offsetHeight, copy: copy.offsetHeight }));
  drawPlanStack(cards, cardCurrent, vh, height);
  drawRail(progress, height, sizes, vh, pinTop, scene.getBoundingClientRect().top);
  if (current !== target || cardCurrent !== cardTarget) schedule();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(draw);
}

export function setBenefitGaps(active, initial) {
  activeHeadingGap = active;
  initialTitleGap = initial;
  schedule();
}

function measure() {
  const motion = !compact.matches && !reduced.matches;
  section.toggleAttribute("data-motion", motion);
  current = undefined;
  cardCurrent = undefined;
  lastTime = 0;
  accessibilityState = undefined;
  if (motion) {
    const height = Math.ceil(deck.getBoundingClientRect().height + 34);
    const pinTop = Math.max(32, (innerHeight - height) / 2);
    section.style.setProperty("--scene-height", `${height}px`);
    section.style.setProperty("--pin-top", `${pinTop}px`);
    section.style.setProperty("--section-bottom", `${Math.max(120, innerHeight - pinTop - height)}px`);
  } else {
    section.style.removeProperty("--section-bottom");
    cards.forEach(card => card.removeAttribute("style"));
    items.forEach(({ row, button, body, copy }) => {
      row.removeAttribute("style");
      button.removeAttribute("aria-current");
      button.removeAttribute("aria-expanded");
      body.removeAttribute("aria-hidden");
      body.removeAttribute("style");
      copy.removeAttribute("style");
    });
  }
  items.forEach(({ button }) => { button.disabled = !motion; });
  schedule();
}

items.forEach(({ button }, index) => button.addEventListener("click", () => {
  const pinTop = parseFloat(getComputedStyle(scene).top);
  const runway = track.offsetHeight - scene.offsetHeight;
  const target = mix(firstRead, lastRead, index / (items.length - 1));
  scrollTo({ top: scrollY + track.getBoundingClientRect().top - pinTop + runway * target, behavior: "smooth" });
}));
addEventListener("scroll", schedule, { passive: true });
addEventListener("resize", measure);
reduced.addEventListener("change", measure);
compact.addEventListener("change", measure);
document.fonts.ready.then(measure);
measure();
