const contents = document.querySelector(".policy-contents");
const rail = contents.querySelector(".policy-ticks");
const links = [...contents.querySelectorAll("a")];
const sections = links.map((link) => document.getElementById(link.hash.slice(1)));
const tickPitch = 7.5;
const tickCount = 61;
const scrollIdleDelay = 160;
const ticks = Array.from({ length: tickCount }, () => document.createElement("span"));
rail.append(...ticks);
const compactLayout = matchMedia("(max-width: 700px)");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const barWidths = [24, 18, 14, 10, 8];
const barColors = ["--black-to-white", "--grey-500-600", "--grey-400-700",
  "--grey-400-700", "--grey-300-800"];
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

let current = 0;
let preview = null;
let pointerTick = null;
let readingTick = 1;
let waveTick;
let waveLift = 0;
let scrolling = false;
let settleTimer;
let readFrame;
let waveFrame;
let lastFrame;
let paintedStart = 0;
let paintedEnd = -1;

function revealCurrentLink() {
  if (!compactLayout.matches) return;
  const link = links[current].getBoundingClientRect();
  const viewport = contents.getBoundingClientRect();
  const gutter = parseFloat(getComputedStyle(contents).paddingInlineStart);
  // Move only the contents strip; scrollIntoView could also move the article.
  if (link.left < viewport.left + gutter) {
    contents.scrollLeft += link.left - viewport.left - gutter;
  } else if (link.right > viewport.right - gutter) {
    contents.scrollLeft += link.right - viewport.right + gutter;
  }
}

function titleTick(index) {
  const title = links[index];
  return clamp((title.offsetTop + title.offsetHeight / 2 - 1) / tickPitch - .5, 0, tickCount - 1);
}

function renderTitles() {
  const highlighted = preview ?? current;
  links.forEach((link, index) => {
    link.toggleAttribute("data-highlighted", index === highlighted);
    if (index === current) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}

function paintWave(time) {
  waveFrame = undefined;
  const target = pointerTick ?? (preview === null ? readingTick : titleTick(preview));
  const liftTarget = scrolling || preview !== null ? 1 : 0;
  const dt = lastFrame === undefined ? 16 : Math.min(40, time - lastFrame);
  const follow = 1 - Math.exp(-dt / 48);
  const liftFollow = 1 - Math.exp(-dt / 86);
  const immediate = reducedMotion.matches || compactLayout.matches;
  waveTick ??= target;
  waveTick += (target - waveTick) * (immediate ? 1 : follow);
  waveLift += (liftTarget - waveLift) * (immediate ? 1 : liftFollow);
  if (Math.abs(target - waveTick) < .015) waveTick = target;
  if (Math.abs(liftTarget - waveLift) < .005) waveLift = liftTarget;
  const ease = waveLift * waveLift * (3 - 2 * waveLift);
  const peak = Math.round(waveTick);

  if (!compactLayout.matches) {
    const start = Math.max(0, Math.floor(waveTick) - 3);
    const end = Math.min(tickCount - 1, Math.ceil(waveTick) + 3);
    for (let index = paintedStart; index <= paintedEnd; index++) {
      if (index >= start && index <= end) continue;
      ticks[index].removeAttribute("style");
    }
    for (let index = start; index <= end; index++) {
      const distance = Math.min(4, Math.abs(index - waveTick));
      const near = Math.floor(distance);
      const far = Math.min(near + 1, 4);
      const blend = distance - near;
      const width = barWidths[near] + (barWidths[far] - barWidths[near]) * blend;
      const color = index === peak ? "var(--black-to-white)" :
        `color-mix(in srgb, var(${barColors[Math.max(1, near)]}), var(${barColors[far]}) ${blend * 100}%)`;
      ticks[index].style.setProperty("--tick-scale", ((8 + (width - 8) * ease) / 24).toFixed(4));
      ticks[index].style.setProperty("--tick-color", color);
    }
    paintedStart = start;
    paintedEnd = end;
  }

  lastFrame = undefined;
  if (waveTick !== target || waveLift !== liftTarget) {
    lastFrame = time;
    scheduleWave();
  }
}

function scheduleWave() {
  waveFrame ??= requestAnimationFrame(paintWave);
}

function previewTitle(index, tick = null) {
  if (preview === index && pointerTick === tick) return;
  preview = index;
  pointerTick = tick;
  renderTitles();
  scheduleWave();
}

function readPosition() {
  readFrame = undefined;
  const readingLine = parseFloat(getComputedStyle(sections[0]).scrollMarginTop) + 2;
  const tops = sections.map(section => section.getBoundingClientRect().top);
  let next = 0;
  for (const [index, top] of tops.entries()) {
    if (top > readingLine) break;
    next = index;
  }
  const nextTop = tops[next + 1];
  const distanceToEnd = document.documentElement.scrollHeight - innerHeight - scrollY;
  const span = (nextTop ?? (readingLine + distanceToEnd)) - tops[next];
  const progress = clamp((readingLine - tops[next]) / Math.max(1, span), 0, 1);
  const start = titleTick(next);
  const end = nextTop === undefined ? tickCount - 1 : titleTick(next + 1);
  readingTick = start + (end - start) * progress;
  const articleBottom = sections.at(-1).getBoundingClientRect().bottom;
  const contentsBottom = contents.getBoundingClientRect().bottom;
  if (!compactLayout.matches && articleBottom <= contentsBottom + 1) {
    next = sections.length - 1;
    readingTick = tickCount - 1;
  }
  if (next !== current) {
    current = next;
    revealCurrentLink();
    renderTitles();
  }
  scheduleWave();
}

function scheduleRead() {
  readFrame ??= requestAnimationFrame(readPosition);
}

window.addEventListener("scroll", () => {
  scrolling = true;
  scheduleRead();
  clearTimeout(settleTimer);
  settleTimer = setTimeout(() => {
    scrolling = false;
    scheduleWave();
  }, scrollIdleDelay);
}, { passive: true });

window.addEventListener("resize", () => {
  scheduleRead();
  revealCurrentLink();
});
window.addEventListener("pageshow", scheduleRead);
document.fonts.ready.then(() => {
  scheduleRead();
  revealCurrentLink();
});

contents.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const link = event.target.closest("a");
  if (link) {
    previewTitle(links.indexOf(link));
    return;
  }
  if (compactLayout.matches) {
    previewTitle(null);
    return;
  }
  const top = rail.getBoundingClientRect().top;
  const offset = event.clientY - top;
  const tick = clamp((offset - 1) / tickPitch - .5, 0, tickCount - 1);
  const index = links.reduce((best, _, candidate) =>
    Math.abs(titleTick(candidate) - tick) < Math.abs(titleTick(best) - tick) ? candidate : best, 0);
  previewTitle(index, tick);
});

contents.addEventListener("pointerleave", () => previewTitle(null));

contents.dataset.ready = "";
renderTitles();
readPosition();
