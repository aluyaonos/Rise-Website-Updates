const group = document.querySelector('.country-flags');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const motion = window.missionMotion ??= {titleDelay: 180};
motion.flagPadding ??= 8;
motion.flagSpringStiffness ??= 300;
motion.flagSpringDamping ??= 20;

for (const [index, flag] of [...group.children].entries()) {
 flag.style.setProperty('--flag-index', index);
}

let current = 0;
let target = 0;
let velocity = 0;
let frame = 0;
let previousTime = 0;
let hovered = false;

function paint(value) {
 group.style.setProperty('--flag-spread', `${value}px`);
}

function tick(time) {
 const elapsed = previousTime ? Math.min((time - previousTime) / 1000, 1 / 30) : 1 / 60;
 previousTime = time;
 const stiffness = Math.max(1, Number(motion.flagSpringStiffness) || 300);
 const damping = Math.max(1, Number(motion.flagSpringDamping) || 20);
 const acceleration = stiffness * (target - current) - damping * velocity;
 velocity += acceleration * elapsed;
 current += velocity * elapsed;
 paint(current);
 if (Math.abs(target - current) < .01 && Math.abs(velocity) < .01) {
  current = target;
  velocity = 0;
  previousTime = 0;
  paint(current);
  frame = 0;
  return;
 }
 frame = requestAnimationFrame(tick);
}

function animateTo(value) {
 target = value;
 if (reducedMotion.matches) {
  cancelAnimationFrame(frame);
  frame = 0;
  current = target;
  velocity = 0;
  previousTime = 0;
  paint(current);
  return;
 }
 if (!frame) frame = requestAnimationFrame(tick);
}

function enter(event) {
 if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
 hovered = true;
 animateTo(Math.max(0, Number(motion.flagPadding) || 0));
}

function leave() {
 hovered = false;
 animateTo(0);
}

function updateSettings() {
 if (hovered) animateTo(Math.max(0, Number(motion.flagPadding) || 0));
}

group.addEventListener('pointerenter', enter);
group.addEventListener('pointerleave', leave);
window.addEventListener('mission-motion-change', updateSettings);
reducedMotion.addEventListener('change', updateSettings);
window.addEventListener('pagehide', () => {
 cancelAnimationFrame(frame);
 group.removeEventListener('pointerenter', enter);
 group.removeEventListener('pointerleave', leave);
 window.removeEventListener('mission-motion-change', updateSettings);
 reducedMotion.removeEventListener('change', updateSettings);
}, {once: true});
