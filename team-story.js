const story = document.querySelector('.team-story');
const stage = story.querySelector('.team-story-stage');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const nativeTimeline = CSS.supports('animation-timeline', '--team-story-exit') &&
 CSS.supports('timeline-scope', '--team-story-exit');
const openingRange = .55;
const copyRevealProgress = .65;
const mediaExitCompensation = .75;
const copyExitCompensation = 5 / 12;
const exitScaleGain = 1 / 24;
const clamp = value => Math.max(0, Math.min(1, value));
let fontsReady = false;
let frame = 0;

function render() {
 frame = 0;
 if (motion.matches) return;
 const {top, height} = stage.getBoundingClientRect();
 const progress = clamp(1 - top / (height * openingRange));
 if (!nativeTimeline) {
  // Match the CSS curves on browsers without scroll-driven animations.
  const openingEased = progress + progress ** 2 * (1 - progress);
  story.style.setProperty('--story-closed', 1 - openingEased);
  const exitProgress = clamp(-top / height);
  // Ease in the compensation so the image keeps its entry velocity at the seam.
  const exitEased = exitProgress * (1 - (1 - exitProgress) ** 2);
  const exitDistance = exitEased * height;
  story.style.setProperty('--story-media-offset', `${exitDistance * mediaExitCompensation}px`);
  story.style.setProperty('--story-copy-offset', `${exitDistance * copyExitCompensation}px`);
  story.style.setProperty('--story-exit-scale', 1 + exitEased * exitScaleGain);
 }
 story.classList.toggle('is-copy-visible', progress >= copyRevealProgress && fontsReady);
}

function scheduleRender() {
 if (!frame) frame = requestAnimationFrame(render);
}

story.classList.add('is-scroll-driven');
window.addEventListener('scroll', scheduleRender, {passive: true});
window.addEventListener('resize', scheduleRender);
window.addEventListener('pageshow', scheduleRender);
motion.addEventListener('change', scheduleRender);
document.fonts.ready.then(() => {
 fontsReady = true;
 scheduleRender();
});
render();
