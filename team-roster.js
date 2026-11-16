const roster = document.querySelector('.team-roster');
const list = roster.querySelector('.team-roster-list');
const rows = roster.querySelectorAll('[data-portrait]');
const inlinePortraits = matchMedia('(max-width: 767px)');
const portraits = new Map(
 [...roster.querySelectorAll('.team-roster-preview img')].map(image => [
  image.getAttribute('src').split('/').pop().replace('.jpg', ''), image,
 ]),
);

let shownPortrait;
let mousePosition = null;

function showPortrait(name) {
 if (shownPortrait === name) return;
 shownPortrait = name;
 for (const [key, image] of portraits) {
  image.classList.toggle('is-visible', key === name);
 }
}

let openRow;

function setExpanded(row, expanded) {
 row.setAttribute('aria-expanded', String(expanded));
 row.nextElementSibling.hidden = !expanded;
}

for (const row of rows) {
 const name = row.dataset.portrait;
 const panel = document.createElement('div');
 panel.id = `team-portrait-${name}`;
 panel.className = 'team-roster-inline';
 panel.hidden = true;
 panel.append(portraits.get(name).cloneNode());
 row.after(panel);

 row.addEventListener('focus', () => {
  if (row.matches(':focus-visible')) mousePosition = null;
  if (!inlinePortraits.matches) showPortrait(name);
 });
 row.addEventListener('click', () => {
  if (!inlinePortraits.matches) {
   showPortrait(name);
   return;
  }
  const alreadyOpen = openRow === row;
  if (openRow) setExpanded(openRow, false);
  openRow = alreadyOpen ? undefined : row;
  if (openRow) setExpanded(openRow, true);
 });
}

function syncRowControls() {
 if (openRow) setExpanded(openRow, false);
 openRow = undefined;
 for (const row of rows) {
  if (inlinePortraits.matches) {
   row.setAttribute('aria-controls', row.nextElementSibling.id);
   row.setAttribute('aria-expanded', 'false');
  } else {
   row.removeAttribute('aria-controls');
   row.removeAttribute('aria-expanded');
  }
 }
}

inlinePortraits.addEventListener('change', syncRowControls);
syncRowControls();

const portraitTrack = roster.querySelector('.team-roster-preview-track');
const portrait = portraitTrack.firstElementChild;
const pinnedLayout = matchMedia('(min-width: 768px) and (min-height: 480px)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const pinBlendDistance = 88;
let portraitFrame = 0;

function previewRowAt(target) {
 const row = target?.closest('.team-roster-list button');
 if (row && list.contains(row)) showPortrait(row.dataset.portrait);
}

function rememberMouse(event) {
 mousePosition = [event.clientX, event.clientY];
}

window.addEventListener('pointermove', event => {
 if (event.pointerType !== 'mouse' || inlinePortraits.matches) return;
 rememberMouse(event);
 if (list.contains(event.target)) previewRowAt(event.target);
}, { passive: true });
window.addEventListener('wheel', event => {
 if (!inlinePortraits.matches) rememberMouse(event);
}, { passive: true });
document.documentElement.addEventListener('pointerleave', event => {
 if (event.pointerType === 'mouse') mousePosition = null;
});
window.addEventListener('blur', () => { mousePosition = null; });

function roundCorner(a, b, distance) {
 if (distance <= 0) return 0;
 const overlap = Math.max(0, distance - Math.abs(a - b));
 return overlap * overlap / (4 * distance);
}

function updatePortraitPin() {
 portraitFrame = 0;
 // Scrolling can move a different row under the cursor without a pointer event.
 if (mousePosition && !inlinePortraits.matches) {
  previewRowAt(document.elementFromPoint(...mousePosition));
 }
 if (!pinnedLayout.matches) {
  portrait.style.removeProperty('translate');
  return;
 }

 const track = portraitTrack.getBoundingClientRect();
 const portraitRect = portrait.getBoundingClientRect();
 const height = portraitRect.height;
 const anchor = document.documentElement.clientHeight - height - parseFloat(getComputedStyle(portrait).bottom);
 const release = track.bottom - height;
 const distance = reducedMotion.matches ? 0 : Math.min(pinBlendDistance, (release - track.top) / 2);

 // Round the change in scroll velocity at both ends of the native sticky phase.
 const stickyTop = Math.max(track.top, Math.min(anchor, release));
 const softRelease = Math.min(anchor, release) - roundCorner(anchor, release, distance);
 const softTop = Math.max(track.top, softRelease) + roundCorner(track.top, softRelease, distance);
 const offset = softTop - stickyTop;

 portrait.style.translate = offset ? `0 ${offset}px` : '';
}

function schedulePortraitPin() {
 if (!portraitFrame) portraitFrame = requestAnimationFrame(updatePortraitPin);
}

window.addEventListener('scroll', schedulePortraitPin, { passive: true });
window.addEventListener('resize', schedulePortraitPin);
window.addEventListener('pageshow', schedulePortraitPin);
pinnedLayout.addEventListener('change', schedulePortraitPin);
reducedMotion.addEventListener('change', schedulePortraitPin);
const portraitObserver = new ResizeObserver(schedulePortraitPin);
portraitObserver.observe(portraitTrack);
schedulePortraitPin();
