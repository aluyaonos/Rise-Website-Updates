const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const numberFormat = new Intl.NumberFormat('en-US');
const countDuration = 1000;
const lineDuration = 914;
const lineStagger = 59;

function countUp(value) {
 const final = value.textContent;
 const total = Number.parseInt(final.replaceAll(',', ''), 10);
 const suffix = final.endsWith('+') ? '+' : '';
 const original = document.createElement('span');
 original.className = 'mission-count-original';
 original.textContent = final;
 const display = document.createElement('span');
 display.setAttribute('aria-hidden', 'true');
 value.classList.add('mission-counting');
 value.replaceChildren(original, display);

 const start = performance.now();
 function step(now) {
  const progress = Math.min((now - start) / countDuration, 1);
  if (progress === 1 || reducedMotion.matches) {
   value.textContent = final;
   value.classList.remove('mission-counting');
   return;
  }
  display.textContent = numberFormat.format(Math.round(total * (1 - (1 - progress) ** 2))) + suffix;
  requestAnimationFrame(step);
 }
 step(start);
}

export function revealLines(element, entranceDelay = 0) {
 const range = document.createRange();
 const text = element.firstChild;
 const original = text.data;
 const breaks = [0];
 let lineTop;
 for (const character of original.matchAll(/\S/gu)) {
  range.setStart(text, character.index);
  range.setEnd(text, character.index + character[0].length);
  const top = range.getBoundingClientRect().top;
  if (lineTop !== undefined && Math.abs(top - lineTop) > 1) breaks.push(character.index);
  lineTop = top;
 }

 const lines = breaks.map((start, index) => {
  const line = document.createElement('span');
  line.className = 'mission-reveal-line';
  line.textContent = original.slice(start, breaks[index + 1]);
  return line;
 });
 element.replaceChildren(...lines);
 const animations = lines.map((line, index) => line.animate([
  {opacity: 0, transform: 'translateY(.5em)'},
  {opacity: 1, transform: 'translateY(0)'},
 ], {
  duration: lineDuration,
  delay: entranceDelay + index * lineStagger,
  easing: 'cubic-bezier(.241,.969,.635,.997)',
  fill: 'backwards',
 }));
 Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
  element.textContent = original;
 });
}

const title = document.querySelector('#mission-title');
const titleObserver = new IntersectionObserver(entries => {
 if (!entries.some(entry => entry.isIntersecting)) return;
 titleObserver.disconnect();
 title.classList.remove('mission-reveal-pending');
 if (!reducedMotion.matches) revealLines(title, Math.max(0, Number(window.missionMotion?.titleDelay) || 0));
}, {threshold: .15, rootMargin: `0px 0px -${Math.round(window.innerHeight * .1)}px 0px`});

const statsObserver = new IntersectionObserver(entries => {
 for (const {target, isIntersecting} of entries) {
  if (!isIntersecting) continue;
  statsObserver.unobserve(target);
  target.classList.remove('mission-reveal-pending');
  if (reducedMotion.matches) continue;
  countUp(target.querySelector('.mission-value'));
  target.querySelector('.mission-caption').animate([
   {opacity: 0, filter: 'blur(4px)', transform: 'translateY(6px)'},
   {opacity: 1, filter: 'blur(0px)', transform: 'translateY(0)'},
  ], {duration: 420, easing: 'ease-in-out'});
 }
}, {rootMargin: `0px 0px -${Math.round(window.innerHeight * .15)}px 0px`});

if (!reducedMotion.matches) {
 title.classList.add('mission-reveal-pending');
 document.fonts.ready.then(() => titleObserver.observe(title));
 for (const stat of document.querySelectorAll('.mission-stat')) {
  stat.classList.add('mission-reveal-pending');
  statsObserver.observe(stat);
 }
 reducedMotion.addEventListener('change', ({matches}) => {
  if (!matches) return;
  for (const target of document.querySelectorAll('#mission-title, .mission-caption')) {
   for (const animation of target.getAnimations({subtree: true})) animation.finish();
  }
 });
}
