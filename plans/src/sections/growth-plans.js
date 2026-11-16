import { createPlanReader } from "./plan-reader.js?v=67";

const headline =
  "Put your money to work, with plans made for every way you want to grow.";

function createHeadline() {
  const title = document.createElement("h2");
  title.id = "growth-plans-title";
  title.className = "growth-plans__title";
  title.dataset.staggeredText = "";
  title.setAttribute("aria-label", headline);

  const measure = document.createElement("span");
  measure.className = "staggered-text__measure";
  measure.textContent = headline;
  title.append(measure);

  return title;
}

function createCardStack() {
  const stack = document.createElement("div");
  stack.className = "growth-card-stack";
  stack.dataset.scrollCard = "";
  stack.setAttribute("aria-hidden", "true");
  stack.innerHTML = `
    <div class="growth-card growth-card--peach"></div>
    <div class="growth-card growth-card--purple"></div>
    <div class="growth-card growth-card--blue"></div>
  `;
  return stack;
}

export function createGrowthPlansSection() {
  const section = document.createElement("section");
  section.id = "growth-plans";
  section.className = "growth-plans";
  section.setAttribute("aria-labelledby", "growth-plans-title");

  const stage = document.createElement("div");
  stage.className = "growth-plans__stage";
  stage.append(createHeadline());

  section.append(stage, createPlanReader(createCardStack()));

  // Keep the previous proportional spacing adjustment, then bring the reader up 80px.
  const updateSpacing = () => {
    const title = stage.querySelector("h2");
    const viewportProbe = document.createElement("div");
    viewportProbe.style.cssText = "position:absolute;height:100svh;visibility:hidden;pointer-events:none";
    stage.append(viewportProbe);
    const originalHeight = Math.max(820, viewportProbe.offsetHeight);
    viewportProbe.remove();
    const cardPeek = window.matchMedia("(max-width: 760px)").matches ? 200 : 169;
    const titleBottom = title.offsetTop + title.offsetHeight;
    const originalGap = Math.max(0, originalHeight - cardPeek - titleBottom);
    stage.style.height = `${originalHeight - originalGap * 0.44 - 160}px`;
  };
  const spacingObserver = new ResizeObserver(updateSpacing);
  spacingObserver.observe(stage.querySelector("h2"));
  window.addEventListener("resize", updateSpacing, { passive: true });
  return section;
}
