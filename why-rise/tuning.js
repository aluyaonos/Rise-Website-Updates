import { createDialKit, createDialRoot } from "../vendor/dialkit/index.js";
import { applyStoryLayout } from "./stories.js";

const panelId = "rise-why-rise-hero-v1";
const resizeControl = "Resize duration (ms)";
const resizeDuration = 1000;

// Update the original base default in browsers that have already opened the page.
try {
  const key = `dialkit:${panelId}`;
  const migrationKey = `${key}:hover-timing-updated`;
  if (!localStorage.getItem(migrationKey)) {
    const saved = JSON.parse(localStorage.getItem(key));
    const path = `Motion.${resizeControl}`;
    if (saved?.version === 1) {
      if (saved.baseValues?.[path] === 460) saved.baseValues[path] = resizeDuration;
      if (!saved.activePresetId && saved.values?.[path] === 460) saved.values[path] = resizeDuration;
      localStorage.setItem(key, JSON.stringify(saved));
    }
    localStorage.setItem(migrationKey, "1");
  }
} catch {
  // DialKit can still use its in-memory defaults when storage is unavailable.
}

createDialRoot({ position: "bottom-right", theme: "dark", versions: "menu", defaultOpen: false });

const alignments = [
  { value: "flex-start", label: "Top" },
  { value: "center", label: "Center" },
  { value: "flex-end", label: "Bottom" },
];

const kit = createDialKit("Why Rise hero", {
  Variant: {
    type: "select",
    options: [{ value: "1", label: "Variant 1" }, { value: "2", label: "Variant 2" }],
    default: "1",
  },
  "Variant 1": {
    "Card alignment": { type: "select", options: alignments, default: "flex-start" },
    "Playback blur": true,
  },
  "Variant 2": {
    "Card alignment": { type: "select", options: alignments, default: "center" },
    "Hover blur": false,
    "Video background": false,
  },
  Layout: {
    "Active card share (%)": [41.95, 35, 60, .01],
    "Active card height (px)": [288, 220, 440, 1],
    "Inactive card height (px)": [200, 120, 260, 1],
    "Card gap (px)": [16, 0, 48, 1],
    "Card radius (px)": [16, 0, 40, 1],
    "Cards top offset (px)": [208, 114, 340, 1],
    "Bottom spacing (px)": [104, 40, 180, 1],
  },
  Motion: {
    [resizeControl]: [resizeDuration, 100, 1000, 10],
    "Fade duration (ms)": [320, 100, 1000, 10],
    "Caption blur (px)": [3, 0, 16, .5],
    "Background shade (%)": [42, 0, 75, 1],
  },
}, { id: panelId, persist: true });

const hero = document.querySelector(".stories");
const props = [
  ["Layout", "Active card share (%)", "--active-share", value => value / 100],
  ["Layout", "Active card height (px)", "--active-height", value => `${value}px`],
  ["Layout", "Inactive card height (px)", "--inactive-height", value => `${value}px`],
  ["Layout", "Card gap (px)", "--card-gap", value => `${value}px`],
  ["Layout", "Card radius (px)", "--card-radius", value => `${value}px`],
  ["Layout", "Cards top offset (px)", "--tuned-deck-top", value => `${value}px`],
  ["Layout", "Bottom spacing (px)", "--tuned-footer-bottom", value => `${value}px`],
  ["Motion", resizeControl, "--resize-duration", value => `${value}ms`],
  ["Motion", "Fade duration (ms)", "--fade-duration", value => `${value}ms`],
  ["Motion", "Caption blur (px)", "--caption-blur", value => `${value}px`],
  ["Motion", "Background shade (%)", "--video-shade", value => value / 100],
];

function update() {
  const values = kit.getValues();
  const variant = values.Variant;
  const settings = values[`Variant ${variant}`];
  applyStoryLayout(
    variant,
    settings["Card alignment"],
    variant === "2" ? settings["Hover blur"] : settings["Playback blur"],
    values["Variant 2"]["Video background"],
  );
  for (const [group, label, variable, format] of props) {
    hero.style.setProperty(variable, format(values[group][label]));
  }
}

kit.subscribe(update);
update();
