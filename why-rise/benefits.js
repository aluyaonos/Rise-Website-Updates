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
const handoffStart = .38;
const handoffEnd = .62;
const firstRead = .14;
const lastRead = .88;
const entryStart = -.18;
const scrubMs = 250;
let frame = 0;
let current;
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

function drawDeck(progress, vh, height) {
  // Both exits cross the centre of the incoming card at the title handoff.
  const handoff = step => clamp((progress - step - handoffStart) / (handoffEnd - handoffStart));
  const exitDistance = t => height * ease(t) + (vh - height) * ease(clamp(2 * t - 1));
  const firstHandoff = handoff(0);
  const secondHandoff = handoff(1);
  const purpleRise = ease(firstHandoff);
  const peachRise = ease(secondHandoff);
  const tealExit = exitDistance(firstHandoff);
  const purpleExit = exitDistance(secondHandoff);
  const spread = ease(clamp(progress / handoffStart));
  const purpleScale = mix(.87, 1, purpleRise);
  const peachScale = progress < 1 + handoffStart
    ? purpleScale * mix(.7364 / .87, .87, ease(clamp(purpleRise / .35)))
    : mix(.87, 1, peachRise);
  const purpleReveal = mix(mix(17, 47, spread), 0, purpleRise) / 491;
  const tealBottomToPurpleMiddle = height * (purpleScale / 2 - purpleReveal) - tealExit;
  const restore = ease(clamp(1 - tealBottomToPurpleMiddle / (height * .34)));
  const peachReveal = mix(mix(16, 38, spread) * (1 + .2 * spread * (1 - restore)), 17, purpleRise)
    / 491 * (1 - peachRise);
  const scales = [1, purpleScale, peachScale];
  const offsets = [
    -tealExit,
    (purpleReveal + (1 - purpleScale) / 2) * height - purpleExit,
    (purpleReveal + peachReveal + (1 - peachScale) / 2) * height,
  ];
  cards.forEach((card, index) => {
    card.style.setProperty("--y", `${offsets[index]}px`);
    card.style.setProperty("--scale", scales[index]);
  });
}

function drawRail(progress, cardHeight, sizes, vh, pinTop) {
  const active = Math.max(0, Math.round(progress));
  const entry = clamp(progress + 1);
  const anchors = [125, 146, 93].map(value => value / 491 * cardHeight);
  const lower = Math.max(0, Math.min(1, Math.floor(progress)));
  const anchor = mix(anchors[lower], anchors[lower + 1], clamp(progress - lower));
  const entryOffset = Math.max(0, vh - pinTop - anchor) * (1 - entry) ** 4;
  const targetTop = anchor + entryOffset;
  const expandedIndex = Math.abs(progress - active) < .5 ? active : -1;
  const nextAccessibilityState = `${active}:${expandedIndex}`;
  let y = 0;
  const positions = items.map(({ row, button, body, copy }, index) => {
    const distance = Math.abs(progress - index);
    const expanded = clamp(1 - distance);
    const fade = ease(clamp((distance - .38) / .12));
    // Preserve space for the longer Figma copy through the visible part of the fade.
    const bodyHeight = sizes[index].copy * Math.max(expanded, 1 - fade);
    const bodyGap = 20 * expanded;
    const gap = 32 + 96 * expanded;
    const emphasis = progress < 0 && index === 0 ? 1 : expanded;
    const position = y;
    y += sizes[index].heading + bodyHeight + bodyGap + gap;
    row.style.setProperty("--item-gap", `${gap}px`);
    row.style.setProperty("--heading-color", `color-mix(in srgb, black ${emphasis * 100}%, #d0d5dd)`);
    body.style.setProperty("--body-height", `${bodyHeight}px`);
    body.style.setProperty("--body-gap", `${bodyGap}px`);
    copy.style.setProperty("--body-opacity", 1 - fade);
    copy.style.setProperty("--body-blur", `${4.75 * fade}px`);
    copy.style.setProperty("--body-y", `${6 * fade}px`);
    if (accessibilityState !== nextAccessibilityState) {
      button.setAttribute("aria-current", String(index === active));
      button.setAttribute("aria-expanded", String(index === expandedIndex));
      body.setAttribute("aria-hidden", String(index !== expandedIndex));
    }
    return position;
  });
  accessibilityState = nextAccessibilityState;
  const railTravel = mix(positions[lower], positions[lower + 1], clamp(progress - lower));
  rail.style.setProperty("--rail-y", `${targetTop - railTravel}px`);
}

function draw(time) {
  frame = 0;
  if (!section.hasAttribute("data-motion")) return;
  const vh = innerHeight;
  const runway = track.offsetHeight - scene.offsetHeight;
  const pinTop = parseFloat(getComputedStyle(scene).top);
  const target = Math.max(entryStart, Math.min(1, (pinTop - track.getBoundingClientRect().top) / runway));
  const dt = Math.min(64, time - (lastTime || time));
  lastTime = time;
  current = current === undefined ? target : mix(current, target, 1 - Math.exp(-dt / scrubMs));
  if (Math.abs(current - target) < .0001) current = target;
  const progress = current <= firstRead
    ? -1 + clamp((current - entryStart) / (firstRead - entryStart))
    : 2 * clamp((current - firstRead) / (lastRead - firstRead));
  const height = deck.offsetHeight;
  const sizes = items.map(({ button, copy }) => ({ heading: button.offsetHeight, copy: copy.offsetHeight }));
  drawDeck(progress, vh, height);
  drawRail(progress, height, sizes, vh, pinTop);
  if (current !== target) schedule();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(draw);
}

function measure() {
  const motion = !compact.matches && !reduced.matches;
  section.toggleAttribute("data-motion", motion);
  current = undefined;
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
    items.forEach(({ row, button, body }) => {
      row.removeAttribute("style");
      button.removeAttribute("aria-current");
      button.removeAttribute("aria-expanded");
      body.removeAttribute("aria-hidden");
      body.removeAttribute("style");
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
