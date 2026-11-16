export function createMoreWaysSection() {
  const section = document.createElement("section");
  section.className = "more-ways";
  section.setAttribute("aria-labelledby", "more-ways-title");
  section.dataset.nodeId = "63519:138410";

  const title = document.createElement("h2");
  title.id = "more-ways-title";
  title.className = "more-ways__title";
  title.dataset.nodeId = "63519:138460";
  title.dataset.staggeredText = "";
  title.setAttribute("aria-label", "There’s more.. More ways to grow.");

  const measure = document.createElement("span");
  measure.className = "staggered-text__measure more-ways__measure";
  measure.textContent = "There’s more..\nMore ways to grow.";
  title.append(measure);

  section.append(title);
  return section;
}
