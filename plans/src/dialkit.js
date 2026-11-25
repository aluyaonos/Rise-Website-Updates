import { configureGrowthWordControls } from "./interactions/growth-words.js?v=7";
import { applyGrowthWords } from "./main.js?v=81";

const DIALKIT_ID = "rise-plans-variant";
const SCROLL_KEY = "rise-plans-variant-scroll";
const TIMING_DEFAULTS_KEY = "rise-plans-timing-defaults-v4";
const HEADLINE_SAVE_KEY = "rise-plans-headline-saved-settings";
const localPreview = ["127.0.0.1", "localhost"].includes(location.hostname);
const timingDefaults = {
  "Active title duration (ms)": 280,
  "Active title easing": "ease-in-out",
  "Copy blur-fade duration (ms)": 310,
  "Copy blur-fade easing": "cubic-bezier(0.45, 0, 0.55, 1)",
};

async function loadDialKit() {
  try {
    return await import("/vendor/dialkit/index.js");
  } catch {
    return import("https://cdn.jsdelivr.net/npm/dialkit@2.1.0/dist/vanilla/index.js");
  }
}

function currentVariant() {
  return new URLSearchParams(window.location.search).get("plan-reader") === "classic"
    ? "classic"
    : "amperos";
}

function saveReaderPosition() {
  const reader = document.querySelector(".plan-reader");
  if (!reader) return;
  const top = reader.getBoundingClientRect().top + window.scrollY;
  const relative = (window.scrollY - top) / Math.max(1, reader.offsetHeight);
  sessionStorage.setItem(SCROLL_KEY, String(relative));
}

async function restoreReaderPosition() {
  const stored = sessionStorage.getItem(SCROLL_KEY);
  if (stored === null) return;
  sessionStorage.removeItem(SCROLL_KEY);
  await document.fonts.ready;
  requestAnimationFrame(() => {
    const reader = document.querySelector(".plan-reader");
    if (!reader) return;
    const top = reader.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top + Number(stored) * reader.offsetHeight);
  });
}

const { createDialKit, createDialRoot } = await loadDialKit();
const root = createDialRoot({
  position: "bottom-right",
  theme: "dark",
  versions: "menu",
  defaultOpen: false,
});

function readSavedHeadline() {
  if (localPreview) return undefined;
  try {
    return JSON.parse(localStorage.getItem(HEADLINE_SAVE_KEY) ?? "null") ?? undefined;
  } catch {
    return undefined;
  }
}

const saveStatus = document.createElement("div");
saveStatus.className = "growth-words-save-status";
saveStatus.setAttribute("role", "status");
document.body.append(saveStatus);
let saveStatusTimer;
let savingHeadline = false;

function announceSave(message) {
  saveStatus.textContent = message;
  clearTimeout(saveStatusTimer);
  saveStatusTimer = setTimeout(() => { saveStatus.textContent = ""; }, 5000);
}

const wordKit = createDialKit("Headline illustrations", configureGrowthWordControls(readSavedHeadline()), {
  id: "rise-plans-headline-illustrations-v2",
  onAction: (path) => {
    if (path === "Save to code") saveHeadline();
  },
});
wordKit.subscribe(applyGrowthWords);

async function saveHeadline() {
  if (savingHeadline) return;
  savingHeadline = true;
  const { Headline, "Hover phrases": phrases, Appearance, Interaction, Motion } = wordKit.getValues();
  const values = { Headline, "Hover phrases": phrases, Appearance, Interaction, Motion };
  try {
    if (localPreview) {
      const response = await fetch("/__preview/growth-word-defaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (response.ok) {
        announceSave("Saved to the project’s headline defaults.");
        return;
      }
      if (response.status !== 404 && response.status !== 501) throw new Error("Save failed");
    }
    // The hosted site is static. Export the same source module used by local saves.
    const code = `// Headline defaults saved from DialKit.\nexport default ${JSON.stringify(values, null, 2)};\n`;
    const objectURL = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
    const download = document.createElement("a");
    download.href = objectURL;
    download.download = "growth-words-defaults.js";
    document.body.append(download);
    download.click();
    download.remove();
    setTimeout(() => URL.revokeObjectURL(objectURL), 1000);
    try {
      localStorage.setItem(HEADLINE_SAVE_KEY, JSON.stringify(values));
    } catch {
      // The exported module still contains the settings if storage is unavailable.
    }
    announceSave("Downloaded growth-words-defaults.js.");
  } catch {
    announceSave("Couldn’t save the headline defaults. Try again.");
  } finally {
    savingHeadline = false;
  }
}

const kit = createDialKit(
  "Plans section",
  {
    "Reader layout": {
      _collapsed: true,
      Variant: {
        type: "select",
        options: [
          { value: "amperos", label: "Amperos / Figma" },
          { value: "classic", label: "Classic / Wealthsimple" },
        ],
        default: currentVariant(),
      },
    },
    "Amperos timing": {
      _collapsed: true,
      "Active title duration (ms)": [timingDefaults["Active title duration (ms)"], 0, 600, 10],
      "Active title easing": {
        type: "select",
        options: [
          { value: "ease-in", label: "Ease in" },
          { value: "ease-in-out", label: "Ease in-out" },
          { value: "ease-out", label: "Ease out" },
          { value: "linear", label: "Linear" },
        ],
        default: timingDefaults["Active title easing"],
      },
      "Copy blur-fade duration (ms)": [timingDefaults["Copy blur-fade duration (ms)"], 0, 800, 10],
      "Copy blur-fade easing": {
        type: "select",
        options: [
          { value: "cubic-bezier(0.45, 0, 0.55, 1)", label: "Smooth ease-in-out" },
          { value: "cubic-bezier(0.65, 0, 0.35, 1)", label: "Deeper ease-in-out" },
          { value: "ease-in-out", label: "Standard ease-in-out" },
          { value: "linear", label: "Linear" },
        ],
        default: timingDefaults["Copy blur-fade easing"],
      },
    },
  },
  {
    id: DIALKIT_ID,
    persist: true,
    defaultCollapsed: true,
  },
);

// Apply the approved values to the current preset once, including in existing previews.
try {
  if (!localStorage.getItem(TIMING_DEFAULTS_KEY)) {
    kit.setValues({ "Amperos timing": timingDefaults });
    localStorage.setItem(TIMING_DEFAULTS_KEY, "1");
  }
} catch {
  // The configured defaults still apply when browser storage is unavailable.
}

const mountedVariant = currentVariant();
const reader = document.querySelector(".plan-reader--amperos");
kit.subscribe(({ "Reader layout": layout, "Amperos timing": timing }) => {
  const Variant = layout.Variant;
  if (Variant === mountedVariant) {
    if (reader) {
      reader.style.setProperty("--plan-title-duration", `${timing["Active title duration (ms)"]}ms`);
      reader.style.setProperty("--plan-title-easing", timing["Active title easing"]);
      reader.style.setProperty("--plan-copy-duration", `${timing["Copy blur-fade duration (ms)"]}ms`);
      reader.style.setProperty("--plan-copy-easing", timing["Copy blur-fade easing"]);
    }
    return;
  }
  saveReaderPosition();
  const url = new URL(window.location.href);
  url.searchParams.set("plan-reader", Variant);
  history.replaceState(null, "", url);
  window.location.reload();
});

restoreReaderPosition();

window.addEventListener("pagehide", (event) => {
  if (event.persisted) return;
  kit.destroy();
  wordKit.destroy();
  root.destroy();
}, { once: true });

window.risePlansDialKit = { kit, root, wordKit };
