import savedDefaults from "../growth-words-defaults.js?v=2";

export const defaultHeadline =
  "Put your money to work for the life you want, with plans made for every way you want to grow.";

const avatarAssets = ["avatar-teal", "avatar-pink", "avatar-purple", "avatar-orange"];
const artworkPools = {
  plan: [
    "plan-dollar", "plan-stocks", "plan-real-estate", "plan-wealth",
    "plan-dividend", "plan-naira", "plan-house", "plan-travel",
    "plan-kids", "plan-school", "plan-dollar-fund", "plan-naira-fund",
  ],
  coin: ["coin", "plan-dollar", "plan-naira", "plan-dollar-fund", "plan-naira-fund"],
  general: [
    "coin", "goal", "coaches", "vault", "exchange", "target",
    "bank", "bell", "megaphone", "bank-two", "discount", "heart-teal", "heart-pink",
  ],
};
const peopleWords = /^(?:you|your|yours|yourself|people|together|community|communities|friends?|family|families|teams?|groups?|members?|partners?|we|us|our|everyone|anyone|someone|others?|humans?)$/i;
const coinWords = /^(?:money|monies|cash(?:flow)?|grow(?:s|ing|th|n)?|coins?|currenc(?:y|ies)|dollars?|naira|earn(?:s|ed|ing|ings)?|income|profits?|wages?|salar(?:y|ies)|pay(?:s|ing|ments?)?|paid)$/i;
const planWords = /^(?:invest\w*|plans?|fund\w*|stocks?|dividend\w*|portfolios?|wealth|returns?|equity|savings|compound\w*|assets?)$/i;
const themeQuery = matchMedia("(prefers-color-scheme: dark)");
const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
const assetBase = new URL("../../assets/growth-words/", import.meta.url);
const hintVisibility = .6;
const hintAssetLimit = 5;
const hintLife = 460;
const hintStagger = 60;

function wordKind(key) {
  if (peopleWords.test(key)) return "people";
  if (coinWords.test(key)) return "coin";
  return planWords.test(key) ? "plan" : "general";
}

function artworkPool(word) {
  return artworkPools[word.dataset.kind] ?? artworkPools.general;
}

function artworkUrl(name) {
  const version = name === "bank" || name.startsWith("plan-") ? "?v=3" : "";
  return new URL(`${name}.png${version}`, assetBase).href;
}

const controlSchema = {
  Headline: { type: "text", default: defaultHeadline },
  "Hover phrases": {
    type: "text",
    default: "your money\nwith plans\nwant to grow",
    placeholder: "One phrase per line. Use * for every word.",
  },
  Appearance: {
    Theme: { type: "select", options: [
      { value: "auto", label: "System" },
      { value: "light", label: "Light" },
      { value: "dark", label: "Dark" },
    ], default: "light" },
    "Headline size (%)": [100, 70, 135, 1],
    "Letter spacing (em)": [-0.01, -0.08, 0.06, 0.005],
    "Artwork size (em)": [1, 0.7, 1.65, 0.01],
    "Artwork spread (em)": [0.03, -0.4, 0.6, 0.01],
  },
  Interaction: {
    "Nearby assets": [3, 1, 5, 1],
    "Hover radius (em)": [0.75, 0.35, 1.25, 0.01],
    "Avatar chance (%)": [30, 0, 100, 1],
    "Exit hold (ms)": [20, 0, 400, 5],
  },
  Motion: {
    "Reveal delay (ms)": [620, 0, 3000, 10],
    "Pointer smoothing (ms)": [38, 0, 120, 1],
    "Spacing settle (ms)": [265, 80, 600, 5],
    "Artwork fade (ms)": [130, 50, 450, 5],
    "Entry (ms)": [200, 80, 900, 10],
    "Exit (ms)": [150, 80, 900, 10],
    "Stagger (ms)": [10, 0, 150, 1],
    "Rise (em)": [0.10, 0, 0.9, 0.01],
    "Flip (deg)": [50, 0, 85, 1],
    "Tilt (deg)": [11, 0, 35, 1],
    Easing: { type: "select", options: [
      { value: "cubic-bezier(.18, .86, .28, 1.25)", label: "Soft overshoot" },
      { value: "cubic-bezier(.22, .85, .25, 1)", label: "Smooth ease-out" },
      { value: "ease-in-out", label: "Ease in-out" },
    ], default: "ease-in-out" },
  },
  "Save to code": { type: "action", label: "Save to code" },
};

function configuredControls(schema, saved = {}) {
  return Object.fromEntries(Object.entries(schema).map(([key, control]) => {
    const value = saved?.[key];
    if (Array.isArray(control)) {
      const [, min, max] = control;
      return [key, Number.isFinite(value) && value >= min && value <= max
        ? [value, ...control.slice(1)] : control];
    }
    if (!control.type) return [key, configuredControls(control, value)];
    const valid = control.type === "text" ? typeof value === "string"
      : control.options?.some((option) => option.value === value);
    return [key, valid ? { ...control, default: value } : control];
  }));
}

function migrateSeamProfile(values) {
  if (!values?.Interaction || !Object.hasOwn(values.Interaction, "Assets at a seam")) return values;
  const migrated = {
    ...values,
    Appearance: { ...values.Appearance },
    Interaction: { ...values.Interaction, "Nearby assets": values.Interaction["Assets at a seam"] },
    Motion: { ...values.Motion },
  };
  // Keep custom tuning and migrate the untouched defaults of the old effect.
  for (const [group, previous] of Object.entries({
    Appearance: { "Artwork size (em)": 1.22, "Artwork spread (em)": .10 },
    Interaction: { "Exit hold (ms)": 55 },
    Motion: { "Entry (ms)": 320, "Exit (ms)": 240, "Stagger (ms)": 55, "Rise (em)": .32 },
  })) {
    for (const [key, value] of Object.entries(previous)) {
      if (migrated[group][key] === value) delete migrated[group][key];
    }
  }
  return migrated;
}

export function configureGrowthWordControls(browserDefaults) {
  return configuredControls(configuredControls(controlSchema, migrateSeamProfile(savedDefaults)), migrateSeamProfile(browserDefaults));
}

export const growthWordControls = configureGrowthWordControls();

const glyphSegmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter() : null;
const getGlyphs = (word) => glyphSegmenter
  ? Array.from(glyphSegmenter.segment(word), ({ segment }) => segment)
  : Array.from(word);
const normalizeWord = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

function makeLetter(glyph) {
  const letter = document.createElement("span");
  letter.className = "growth-letter";
  const visual = document.createElement("span");
  visual.className = "growth-letter__visual";
  const text = document.createElement("span");
  text.className = "growth-letter__glyph";
  text.textContent = glyph;
  visual.append(text);
  letter.append(visual);
  if (/[\p{L}\p{N}]/u.test(glyph)) letter.dataset.swappable = "";
  return letter;
}

export function initializeGrowthWords(title) {
  const stage = title.closest(".growth-plans__stage");
  const measure = title.querySelector(".staggered-text__measure");
  const layer = document.createElement("span");
  layer.className = "growth-words";
  layer.setAttribute("aria-hidden", "true");
  title.append(layer);
  title.classList.add("growth-plans__title--interactive");
  title.tabIndex = 0;
  const instructions = document.createElement("span");
  instructions.className = "growth-words-instructions";
  instructions.id = "growth-words-instructions";
  instructions.textContent = "Use the arrow keys to reveal illustrations. Press Escape to restore the headline.";
  stage.append(instructions);
  title.setAttribute("aria-describedby", instructions.id);

  let words = [];
  let letters = [];
  let active = [];
  let shifted = [];
  let current;
  const avatarChoices = new Map();
  let geometry;
  let pointerFrame;
  let pointerTarget;
  let pointerPosition;
  let pointerTime;
  let copy;
  let phrases;
  let settings;
  let leaveTimer;
  let hintTimer;
  let hintReadyAt;
  let hintUsed = false;
  let hintRunning = false;
  let hintVisible = false;
  const hintCues = new Set();
  let keyboardIndex = -1;
  const kerning = document.createElement("canvas").getContext("2d");
  const warmedAssets = new Map();
  let nearHeading = false;
  let lastFont;

  function prepareKerning(force = false) {
    if (!kerning) return;
    const style = getComputedStyle(title);
    const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    if (!force && lastFont === font) return;
    lastFont = font;
    kerning.font = font;
    kerning.fontKerning = "normal";
    for (const word of words) {
      let previous = "";
      for (const letter of word.children) {
        const glyph = letter.firstElementChild.textContent;
        const pair = kerning.measureText(previous + glyph).width
          - kerning.measureText(previous).width - kerning.measureText(glyph).width;
        letter.style.marginInlineStart = Math.abs(pair) > .01 ? `${pair.toFixed(3)}px` : "";
        previous = glyph;
      }
    }
  }

  function warmArtwork() {
    if (!nearHeading || motionQuery.matches) return;
    const enabled = words.filter((word) => word.hasAttribute("data-hover-word"));
    const sources = new Set();
    for (const word of enabled) {
      for (const name of artworkPool(word)) sources.add(name);
      if (word.dataset.kind === "people") {
        for (const name of avatarAssets) sources.add(name);
      }
    }
    for (const name of sources) {
      if (warmedAssets.has(name)) continue;
      const image = new Image();
      image.src = artworkUrl(name);
      warmedAssets.set(name, image);
      image.decode().catch(() => warmedAssets.delete(name));
    }
  }

  function clear() {
    window.clearTimeout(leaveTimer);
    leaveTimer = undefined;
    for (const cue of hintCues) window.clearTimeout(cue);
    hintCues.clear();
    hintRunning = false;
    for (const letter of active) letter.classList.remove("is-artwork");
    for (const letter of shifted) letter.style.removeProperty("--letter-shift");
    active = [];
    shifted = [];
    current = undefined;
    avatarChoices.clear();
  }

  function canPlayHint() {
    return hintVisible && !document.hidden && !motionQuery.matches
      && title.dataset.animationState === "done";
  }

  function syncHint() {
    window.clearTimeout(hintTimer);
    hintTimer = undefined;
    if (!canPlayHint()) {
      hintReadyAt = undefined;
      if (hintRunning) clear();
      return;
    }
    if (hintUsed || !layer.querySelector("[data-hover-word] [data-swappable]")) return;
    hintReadyAt ??= performance.now();
    const delay = settings.Motion["Reveal delay (ms)"];
    hintTimer = window.setTimeout(playHint, Math.max(0, delay - (performance.now() - hintReadyAt)));
  }

  function cueHint(delay, callback) {
    const timer = window.setTimeout(() => {
      hintCues.delete(timer);
      callback();
    }, delay);
    hintCues.add(timer);
  }

  function playHint() {
    hintTimer = undefined;
    if (hintUsed || !canPlayHint()) return;
    const { bounds, em, targets } = measureLetters();
    let available = targets.filter((letter) => {
      const { centerY } = bounds.get(letter);
      return centerY >= 0 && centerY <= window.innerHeight;
    });
    const selected = [];
    while (available.length && selected.length < hintAssetLimit) {
      const letter = available[Math.floor(Math.random() * available.length)];
      const origin = bounds.get(letter);
      selected.push(letter);
      available = available.filter((candidate) => {
        const box = bounds.get(candidate);
        return candidate !== letter && (box.line !== origin.line || Math.abs(box.centerX - origin.centerX) >= em);
      });
    }
    if (!selected.length) return;
    clear();
    hintUsed = hintRunning = true;
    const motion = settings.Motion;
    const lifetime = Math.max(hintLife, motion["Entry (ms)"] + 160, motion["Artwork fade (ms)"] + 160);
    selected.forEach((letter, index) => {
      const delay = index * hintStagger;
      cueHint(delay, () => applyHintSelection([...active, letter]));
      cueHint(delay + lifetime, () => applyHintSelection(active.filter((item) => item !== letter)));
    });
  }

  function applyHintSelection(selection) {
    if (!selection.length) {
      clear();
      return;
    }
    geometry ??= measureLetters();
    applySelection(selection.map((letter) => ({ letter, distance: 1 })), 1);
  }

  function takeOverHint() {
    if (hintUsed && !hintRunning) return;
    if (hintRunning) clear();
    hintUsed = true;
    window.clearTimeout(hintTimer);
    hintTimer = undefined;
  }

  function render(text) {
    copy = text;
    clear();
    keyboardIndex = -1;
    title.setAttribute("aria-label", text.replace(/\s+/g, " "));
    measure.textContent = text;
    layer.replaceChildren();
    words = [];
    text.split(/\r?\n/).forEach((line, lineIndex) => {
      if (lineIndex) layer.append(document.createElement("br"));
      const tokens = line.match(/\S+/g) ?? [];
      tokens.forEach((token, index) => {
        if (index) layer.append(" ");
        const word = document.createElement("span");
        word.className = "growth-word";
        word.dataset.index = words.length;
        const key = normalizeWord(token);
        word.dataset.key = key;
        word.dataset.kind = wordKind(key);
        word.append(...getGlyphs(token).map(makeLetter));
        layer.append(word);
        words.push(word);
      });
    });
    letters = [...layer.querySelectorAll(".growth-letter")];
    geometry = undefined;
  }

  function enablePhrases(value) {
    phrases = value;
    clear();
    keyboardIndex = -1;
    const tokens = value.split(/[\r\n,]+/).map((entry) => entry.trim()).filter(Boolean);
    const enabled = new Set();
    if (!tokens.includes("*")) {
      const keys = words.map((word) => word.dataset.key);
      for (const entry of tokens) {
        const query = entry.split(/\s+/).map(normalizeWord).filter(Boolean);
        if (!query.length) continue;
        for (let start = 0; start <= keys.length - query.length; start++) {
          if (query.every((key, offset) => keys[start + offset] === key)) {
            for (let offset = 0; offset < query.length; offset++) enabled.add(start + offset);
          }
        }
      }
    }
    let interactive = false;
    words.forEach((word, index) => {
      const matches = tokens.includes("*") || enabled.has(index);
      word.toggleAttribute("data-hover-word", matches);
      interactive ||= matches && Boolean(word.querySelector("[data-swappable]"));
    });
    syncMotionPreference(interactive);
    warmArtwork();
  }

  function artwork(letter, name, order) {
    const visual = letter.firstElementChild;
    let art = visual.querySelector("img");
    if (!art) {
      art = document.createElement("img");
      art.className = "growth-letter__art";
      art.alt = "";
      art.draggable = false;
      art.addEventListener("load", () => letter.classList.add("has-artwork"));
      art.addEventListener("error", () => letter.classList.remove("has-artwork"));
      visual.append(art);
    }
    const src = artworkUrl(name);
    letter.dataset.artwork = name;
    art.classList.toggle("growth-letter__art--avatar", avatarAssets.includes(name));
    if (art.src !== src) {
      letter.classList.remove("has-artwork");
      art.src = src;
      if (art.complete && art.naturalWidth > 0) letter.classList.add("has-artwork");
    }
    letter.style.setProperty("--letter-order", order);
    letter.style.setProperty("--letter-lean", order % 2 ? 1 : -1);
    letter.classList.add("is-artwork");
  }

  function measureLetters() {
    const lines = [];
    const bounds = new Map();
    for (const letter of letters) {
      const box = letter.getBoundingClientRect();
      let line = lines.at(-1);
      if (!line || Math.abs(line.top - box.top) > 2) {
        line = { top: box.top, letters: [] };
        lines.push(line);
      }
      line.letters.push(letter);
      bounds.set(letter, {
        left: box.left, width: box.width,
        centerX: box.left + box.width / 2, centerY: box.top + box.height / 2, line,
      });
    }
    const stageBox = stage.getBoundingClientRect();
    geometry = {
      bounds, stageLeft: stageBox.left + 6, stageRight: stageBox.right - 6,
      top: title.getBoundingClientRect().top,
      targets: letters.filter((letter) => letter.hasAttribute("data-swappable") && letter.parentElement.hasAttribute("data-hover-word")),
      em: parseFloat(getComputedStyle(title).fontSize),
    };
    return geometry;
  }

  function spreadArtwork(line, bounds, selected) {
    const { Appearance: look } = settings;
    const artworkWidth = geometry.em * look["Artwork size (em)"];
    const gap = selected.length > 1 ? geometry.em * look["Artwork spread (em)"] : 0;
    const left = bounds.get(line.letters[0]).left;
    const last = bounds.get(line.letters.at(-1));
    const right = last.left + last.width;
    // Keep the original hit areas fixed. The visible line opens around the
    // artwork, while every untouched word moves as a single rigid unit.
    const leftRoom = Math.max(0, left - geometry.stageLeft);
    const rightRoom = Math.max(0, geometry.stageRight - right);
    const pitch = Math.max(artworkWidth * .55, artworkWidth * .96 + gap);
    const expansion = (letter, scale) => Math.max(0, pitch * scale - bounds.get(letter).width);
    const expansionAt = (scale) => selected.reduce((sum, letter) => sum + expansion(letter, scale), 0);
    let scale = 1;
    if (expansionAt(scale) > leftRoom + rightRoom) {
      let floor = 0;
      for (let step = 0; step < 8; step++) {
        const middle = (floor + scale) / 2;
        if (expansionAt(middle) <= leftRoom + rightRoom) floor = middle;
        else scale = middle;
      }
      scale = floor;
    }
    const total = expansionAt(scale);
    const start = -Math.min(leftRoom, Math.max(total - rightRoom, total / 2));
    const deltas = new Map(selected.map((letter) => {
      letter.style.setProperty("--letter-art-size", `${artworkWidth * scale}px`);
      return [letter, expansion(letter, scale)];
    }));
    const nextShifted = [];
    let advance = start;
    for (const letter of line.letters) {
      const expansion = deltas.get(letter) ?? 0;
      const shift = advance + expansion / 2;
      if (Math.abs(shift) > .01) {
        letter.style.setProperty("--letter-shift", `${shift}px`);
        nextShifted.push(letter);
      }
      advance += expansion;
    }
    return nextShifted;
  }

  function refreshArtworkSpacing(bounds) {
    const byLine = new Map();
    for (const letter of active) {
      const { line } = bounds.get(letter);
      if (!byLine.has(line)) byLine.set(line, []);
      byLine.get(line).push(letter);
    }
    const nextShifted = [...byLine].flatMap(([line, selected]) => spreadArtwork(line, bounds, selected));
    for (const letter of shifted) {
      if (!nextShifted.includes(letter)) letter.style.removeProperty("--letter-shift");
    }
    shifted = nextShifted;
  }

  function applySelection(candidates, reach) {
    if (!candidates.length) {
      if (current && !leaveTimer) leave();
      return;
    }
    window.clearTimeout(leaveTimer);
    leaveTimer = undefined;
    const next = candidates.map(({ letter }) => letter);
    const changed = active.length !== next.length || next.some((letter) => !active.includes(letter));
    candidates.forEach(({ letter, distance }) => {
      const closeness = Math.max(0, 1 - distance / reach);
      letter.style.setProperty("--letter-lens-scale", (1 + .12 * closeness).toFixed(3));
    });
    if (!changed) return;
    for (const previous of active) {
      if (!next.includes(previous)) previous.classList.remove("is-artwork");
    }
    const nextWords = new Set(next.map((letter) => letter.parentElement));
    for (const word of avatarChoices.keys()) {
      if (!nextWords.has(word)) avatarChoices.delete(word);
    }
    for (const word of nextWords) {
      if (word.dataset.kind !== "people" || avatarChoices.has(word)) continue;
      const candidates = next.filter((letter) => letter.parentElement === word);
      const show = Math.random() * 100 < settings.Interaction["Avatar chance (%)"];
      const choice = show ? {
        letter: candidates[Math.floor(Math.random() * candidates.length)],
        name: avatarAssets[Math.floor(Math.random() * avatarAssets.length)],
      } : null;
      avatarChoices.set(word, choice);
    }
    const taken = new Set(next.filter((letter) => active.includes(letter)).map((letter) => letter.dataset.artwork));
    next.filter((letter) => !active.includes(letter)).forEach((letter, index) => {
      const avatar = avatarChoices.get(letter.parentElement);
      const name = avatar?.letter === letter && !taken.has(avatar.name)
        ? avatar.name : assetFor(letter, taken);
      artwork(letter, name, index);
      taken.add(name);
    });
    active = next;
    refreshArtworkSpacing(geometry.bounds);
  }

  function assetFor(letter, taken) {
    const word = letter.parentElement;
    const pool = artworkPool(word);
    const index = Array.prototype.indexOf.call(word.children, letter);
    const start = (Number(word.dataset.index) * 3 + index) % pool.length;
    for (let offset = 0; offset < pool.length; offset++) {
      const name = pool[(start + offset) % pool.length];
      if (!taken.has(name)) return name;
    }
    return pool[start];
  }

  function activate(point) {
    if (motionQuery.matches || title.dataset.animationState !== "done") return;
    const measured = geometry ?? measureLetters();
    const rect = title.getBoundingClientRect();
    const reach = settings.Interaction["Hover radius (em)"] * measured.em;
    const yOffset = rect.top - measured.top;
    const field = reach * 1.2;
    if (point.x < rect.left - field || point.x > rect.right + field
        || point.y < rect.top - field || point.y > rect.bottom + field) {
      if (!hintRunning) applySelection([], reach);
      return;
    }
    const candidates = [];
    for (const letter of measured.targets) {
      const box = measured.bounds.get(letter);
      const held = !hintRunning && active.includes(letter);
      const distance = Math.hypot(point.x - box.centerX, point.y - box.centerY - yOffset);
      if (distance <= reach * (held ? 1.2 : 1)) {
        candidates.push({ letter, distance, score: distance - (held ? reach * .1 : 0) });
      }
    }
    if (candidates.length) takeOverHint();
    else if (hintRunning) return;
    current = point;
    candidates.sort((a, b) => a.score - b.score);
    applySelection(candidates.slice(0, settings.Interaction["Nearby assets"]), reach);
  }

  function activateLetter(letter) {
    if (!letter) return;
    stopPointer();
    const box = letter.getBoundingClientRect();
    activate({ x: box.left + box.width / 2, y: box.top + box.height / 2, letter });
  }

  function leave() {
    window.clearTimeout(leaveTimer);
    leaveTimer = window.setTimeout(clear, settings.Interaction["Exit hold (ms)"]);
  }

  function stopPointer() {
    cancelAnimationFrame(pointerFrame);
    pointerFrame = pointerTarget = pointerPosition = pointerTime = undefined;
  }

  function schedulePointer() {
    if (pointerFrame === undefined) pointerFrame = requestAnimationFrame(updatePointer);
  }

  function updatePointer(time) {
    pointerFrame = undefined;
    const target = pointerTarget;
    const smoothing = settings.Motion["Pointer smoothing (ms)"];
    const em = geometry?.em ?? parseFloat(getComputedStyle(title).fontSize);
    const dx = target.x - (pointerPosition?.x ?? target.x);
    const dy = target.y - (pointerPosition?.y ?? target.y);
    const distance = Math.hypot(dx, dy);
    if (!smoothing || distance <= .5 || distance > em * 1.25 || Math.abs(dy) > em * .65) {
      pointerPosition = target;
    } else {
      const elapsed = Math.max(1, time - (pointerTime ?? time - 1000 / 60));
      // Limit lag so a fast move can still switch to the newly hovered glyph.
      const follow = Math.max(1 - Math.exp(-elapsed / smoothing), 1 - em * .24 / distance);
      pointerPosition = { x: pointerPosition.x + dx * follow, y: pointerPosition.y + dy * follow };
    }
    pointerTime = time;
    activate(pointerPosition);
    if (pointerPosition !== target) schedulePointer();
  }

  stage.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch" || motionQuery.matches) return;
    pointerTarget = { x: event.clientX, y: event.clientY };
    schedulePointer();
  });
  stage.addEventListener("pointerleave", () => {
    stopPointer();
    if (!hintRunning) leave();
  });
  window.addEventListener("scroll", () => {
    if (pointerTarget && current && !current.letter) schedulePointer();
  }, { passive: true });
  layer.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch") return;
    const letter = event.target.closest("[data-swappable]");
    if (!letter?.parentElement.hasAttribute("data-hover-word")) return;
    stopPointer();
    if (letter === current?.letter) clear();
    else activateLetter(letter);
  });
  document.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch" && !title.contains(event.target)) clear();
  });
  title.addEventListener("focusout", () => {
    stopPointer();
    clear();
  });
  title.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      takeOverHint();
      stopPointer();
      clear();
      return;
    }
    if (!["ArrowRight", "ArrowLeft", "Enter", " "].includes(event.key) || motionQuery.matches) return;
    event.preventDefault();
    const direction = event.key === "ArrowLeft" ? -1 : 1;
    for (let tries = 0; tries < words.length; tries += 1) {
      keyboardIndex = (keyboardIndex + direction + words.length) % words.length;
      if (!words[keyboardIndex].hasAttribute("data-hover-word")) continue;
      const candidates = words[keyboardIndex].querySelectorAll("[data-swappable]");
      if (candidates.length) {
        activateLetter(candidates[Math.floor(candidates.length / 2)]);
        break;
      }
    }
  });

  function applyTheme() {
    const theme = settings.Appearance.Theme;
    const appliedTheme = theme === "auto" ? themeQuery.matches ? "dark" : "light" : theme;
    stage.dataset.wordTheme = appliedTheme;
    if (current && active.length) {
      if (current.letter) activateLetter(current.letter);
      else activate(current);
      if (active.length) refreshArtworkSpacing(geometry.bounds);
    }
  }

  function update(values) {
    settings = values;
    const nextCopy = String(values.Headline ?? "").trim() || defaultHeadline;
    const copyChanged = nextCopy !== copy;
    if (copyChanged) {
      if (copy !== undefined) title.dataset.animationState = "done";
      render(nextCopy);
    }
    const nextPhrases = String(values["Hover phrases"] ?? "");
    if (copyChanged || nextPhrases !== phrases) enablePhrases(nextPhrases);
    const { Appearance: look, Motion: motion } = values;
    const properties = {
      "--words-type-scale": look["Headline size (%)"] / 100,
      "--words-tracking": `${look["Letter spacing (em)"]}em`,
      "--words-art-size": `${look["Artwork size (em)"]}em`,
      "--words-spacing": `${motion["Spacing settle (ms)"]}ms`,
      "--words-fade": `${motion["Artwork fade (ms)"]}ms`,
      "--words-in": `${motion["Entry (ms)"]}ms`,
      "--words-out": `${motion["Exit (ms)"]}ms`,
      "--words-stagger": `${motion["Stagger (ms)"]}ms`,
      "--words-rise": `${motion["Rise (em)"]}em`,
      "--words-flip": `${motion["Flip (deg)"]}deg`,
      "--words-tilt": `${motion["Tilt (deg)"]}deg`,
      "--words-easing": motion.Easing,
    };
    for (const [property, value] of Object.entries(properties)) title.style.setProperty(property, value);
    prepareKerning(copyChanged);
    geometry = undefined;
    applyTheme();
    syncHint();
  }

  themeQuery.addEventListener("change", applyTheme);
  function syncMotionPreference(interactive = Boolean(layer.querySelector("[data-hover-word] [data-swappable]"))) {
    clear();
    if (motionQuery.matches || !interactive) {
      stopPointer();
      title.removeAttribute("tabindex");
      title.removeAttribute("aria-describedby");
    } else {
      title.tabIndex = 0;
      title.setAttribute("aria-describedby", instructions.id);
    }
  }
  motionQuery.addEventListener("change", () => {
    syncMotionPreference();
    warmArtwork();
    syncHint();
  });
  function invalidateGeometry() {
    stopPointer();
    geometry = undefined;
    clear();
    prepareKerning();
  }
  const resize = new ResizeObserver(invalidateGeometry);
  resize.observe(title);
  window.addEventListener("resize", invalidateGeometry, { passive: true });
  const warmObserver = new IntersectionObserver(([entry]) => {
    nearHeading = entry.isIntersecting;
    warmArtwork();
  }, { rootMargin: "450px" });
  warmObserver.observe(title);
  new IntersectionObserver(([entry]) => {
    hintVisible = entry.intersectionRatio >= hintVisibility;
    syncHint();
  }, { threshold: hintVisibility }).observe(title);
  new MutationObserver(syncHint).observe(title, {
    attributes: true,
    attributeFilter: ["data-animation-state"],
  });
  document.addEventListener("visibilitychange", syncHint);
  document.fonts.ready.then(() => {
    geometry = undefined;
    prepareKerning(true);
  });
  update(Object.fromEntries(Object.entries(growthWordControls).map(([name, config]) => [
    name,
    config.type ? config.default : Object.fromEntries(Object.entries(config).map(([key, value]) => [
      key, Array.isArray(value) ? value[0] : value.default,
    ])),
  ])));
  return update;
}
