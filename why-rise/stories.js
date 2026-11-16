const hero = document.querySelector(".stories");
const deck = hero.querySelector(".stories-deck");
const cards = [...document.querySelectorAll(".story-card")];
const videos = cards.map(card => card.querySelector("video"));
const toggle = document.querySelector(".stories-toggle");
const status = document.querySelector(".stories-status");
const background = document.querySelector(".stories-live-frame");
const previousFrame = document.querySelector(".stories-previous-frame");
const context = background.getContext("2d", { alpha: false });
const previousContext = previousFrame.getContext("2d", { alpha: false });
const backgroundCrop = .87; // Keep the source’s baked-in subtitles in the card.
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let active = 0;
let backgroundEnabled = false;
let firstVariantBackground = false;
let tunedBackground = false;
let previewRequested = false;
let pendingFrame;
let revision = 0;
let backgroundCard;
let backgroundFade;
let lastPointerX;
let lastPointerY;

function syncControls() {
  hero.toggleAttribute("data-background-playing", backgroundEnabled);
  toggle.setAttribute("aria-label", backgroundEnabled ? "Pause background video" : "Play background video");
}

function paintBackground(video) {
  const height = Math.floor(video.videoHeight * backgroundCrop);
  if (backgroundCard !== active) {
    backgroundFade?.cancel();
    if (backgroundCard !== undefined && hero.hasAttribute("data-video-visible") && !reducedMotion.matches) {
      previousFrame.width = background.width;
      previousFrame.height = background.height;
      previousContext.drawImage(background, 0, 0);
      const duration = parseFloat(getComputedStyle(hero).getPropertyValue("--fade-duration"));
      backgroundFade = background.animate({ opacity: [0, 1] }, { duration, easing: "ease-in-out" });
    }
    backgroundCard = active;
  }
  if (background.width !== video.videoWidth || background.height !== height) {
    background.width = video.videoWidth;
    background.height = height;
  }
  context.drawImage(video, 0, 0, background.width, height, 0, 0, background.width, height);
  hero.setAttribute("data-video-visible", "");
}

function paintFrame(_, { mediaTime } = {}) {
  pendingFrame = undefined;
  const video = videos[active];
  if (video.paused) return;
  cards[active].setAttribute("data-live", "");
  const progress = (mediaTime ?? video.currentTime) / video.duration;
  cards[active].style.setProperty("--story-progress", progress);
  if (backgroundEnabled) paintBackground(video);
  pendingFrame = video.requestVideoFrameCallback(paintFrame);
}

function stopFrames(video) {
  revision++;
  if (pendingFrame !== undefined) video.cancelVideoFrameCallback(pendingFrame);
  pendingFrame = undefined;
  video.pause();
}

async function playActive() {
  previewRequested = true;
  const video = videos[active];
  if (document.hidden || !video.paused) return;
  const token = ++revision;
  if (!video.src) video.src = video.dataset.src;
  status.textContent = "";
  try {
    await video.play();
    if (token !== revision) return;
    pendingFrame = video.requestVideoFrameCallback(paintFrame);
  } catch {
    if (token !== revision) return;
    setBackground(false);
    status.textContent = "This preview couldn’t play. Try again.";
  }
}

function setBackground(enabled) {
  backgroundEnabled = enabled;
  if (!enabled) hero.removeAttribute("data-video-visible");
  syncControls();
  if (enabled) playActive();
}

function selectCard(index) {
  if (index !== active) {
    stopFrames(videos[active]);
    cards[active].removeAttribute("data-live");
    cards[active].setAttribute("aria-pressed", "false");
    active = index;
    cards[active].setAttribute("aria-pressed", "true");
  }
  playActive();
}

deck.addEventListener("pointermove", event => {
  if (event.pointerType !== "mouse") return;
  // Card edges move during the animation. Only physical pointer movement retargets the deck.
  if (event.clientX === lastPointerX && event.clientY === lastPointerY) return;
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
  const index = cards.indexOf(event.target.closest(".story-card"));
  if (index !== -1 && (index !== active || !previewRequested)) selectCard(index);
});

cards.forEach((card, index) => {
  card.addEventListener("click", event => {
    if (event.detail === 0 || !matchMedia("(hover: hover) and (pointer: fine)").matches || event.pointerType === "touch") {
      selectCard(index);
    }
  });
});
toggle.addEventListener("click", () => {
  firstVariantBackground = !backgroundEnabled;
  setBackground(firstVariantBackground);
});

export function applyStoryLayout(variant, alignment, inactiveBlur, videoBackground) {
  const variantChanged = hero.dataset.variant !== variant;
  const backgroundChanged = tunedBackground !== videoBackground;
  hero.dataset.variant = variant;
  hero.style.setProperty("--card-alignment", alignment);
  hero.toggleAttribute("data-inactive-blur", inactiveBlur);
  tunedBackground = videoBackground;

  if (variantChanged || (variant === "2" && backgroundChanged)) {
    setBackground(variant === "2" ? videoBackground : firstVariantBackground);
  }
}

function resumePreview() {
  if (previewRequested) playActive();
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopFrames(videos[active]);
  else resumePreview();
});
window.addEventListener("pagehide", () => stopFrames(videos[active]));
window.addEventListener("pageshow", resumePreview);
