import { createButton } from "../components/button.js";

const plans = [
  {
    name: "Dollar Mutual Fund",
    title: "Dollar Mutual Fund: Steady dollar growth",
    description: "Grow your dollars in a managed fund that holds Eurobonds and dollar money market instruments. Units are priced daily.",
    risk: "🌲 Low risk",
  },
  {
    name: "Money Market Fund",
    title: "Money Market Fund: Put your Naira to work",
    description: "Earn on your Naira from short-term, lower-risk money market instruments, with daily pricing and an independent custodian.",
    risk: "🌲 Low risk",
  },
  {
    name: "Naira Equity Portfolio",
    title: "Naira Equity Portfolio: Long-term growth",
    description: "Invest in a professionally managed selection of stocks from companies listed on the Nigerian Exchange, built to beat the NGX 30 over the long run.",
    risk: "🔥 High risk",
    playIcon: "reader-google-play-equity.svg",
  },
];

const placeholder = "Looking for safe, consistent growth? Our fixed-income plan is ideal for low-risk investors seeking predictable annual p.a.";

function createArrowButton({ label, icon = "arrow-right.svg", href = "https://app.risevest.com/" }) {
  const button = createButton({ label, href });
  const arrow = document.createElement("img");
  arrow.src = `./assets/plans/${icon}`;
  arrow.alt = "";
  arrow.width = 24;
  arrow.height = 24;
  button.append(arrow);
  return button;
}

function createStoreButton() {
  const link = document.createElement("a");
  link.className = "plan-reader__stores";
  link.href = "https://risevest.com/download";
  link.setAttribute("aria-label", "Download the Rise app");
  link.innerHTML = `
    <span class="plan-reader__store-icon"><img src="./assets/plans/reader-apple.svg" alt=""></span>
    <span class="plan-reader__store-divider"><img src="./assets/plans/reader-divider.svg" alt=""></span>
    <span class="plan-reader__store-icon"><img src="./assets/plans/reader-google-play.svg" alt="" data-play-icon></span>
  `;
  return link;
}

function createClassicReader(stack) {
  const reader = document.createElement("section");
  reader.className = "plan-reader plan-reader--classic";
  reader.id = "investment-plans";
  reader.setAttribute("aria-labelledby", "plan-reader-title");
  const scene = document.createElement("div");
  scene.className = "plan-reader__scene";
  const left = document.createElement("div");
  left.className = "plan-reader__intro";
  left.innerHTML = '<h2 id="plan-reader-title">Plans built around how you want to grow</h2>';
  left.append(createArrowButton({ label: "Start investing" }));

  const list = document.createElement("ol");
  list.className = "plan-reader__list";
  plans.forEach((plan, index) => {
    const item = document.createElement("li");
    item.className = "plan-reader__item";
    item.innerHTML = `<h3><button type="button" data-plan-index="${index}" aria-current="${index === 0 ? "true" : "false"}"><span class="plan-reader__icon"><img src="./assets/plans/dollar-fund.png" alt="" width="28" height="28"></span><span>${plan.name}</span></button></h3>`;
    const body = document.createElement("div");
    body.className = "plan-reader__body";
    body.id = `plan-description-${index}`;
    const paragraph = document.createElement("p");
    paragraph.textContent = placeholder;
    body.append(paragraph);
    item.querySelector("button").setAttribute("aria-controls", body.id);
    item.append(body);
    list.append(item);
  });
  scene.append(stack, left, list);
  reader.append(scene);
  return reader;
}

function createAmperosReader(stack) {
  const reader = document.createElement("section");
  reader.className = "plan-reader plan-reader--amperos";
  reader.id = "investment-plans";
  reader.setAttribute("aria-label", "Investment plans");
  const scene = document.createElement("div");
  scene.className = "plan-reader__scene";

  const rail = document.createElement("div");
  rail.className = "plan-reader__intro plan-reader__rail";
  const titles = document.createElement("ol");
  titles.className = "plan-reader__title-list";
  plans.forEach((plan, index) => {
    const item = document.createElement("li");
    item.className = "plan-reader__item plan-reader__title-item";
    const heading = document.createElement("h2");
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.planIndex = index;
    button.dataset.planName = plan.name;
    button.dataset.planTitle = plan.title;
    button.dataset.playIcon = plan.playIcon ?? "reader-google-play.svg";
    button.setAttribute("aria-controls", `plan-description-${index}`);
    button.setAttribute("aria-current", String(index === 0));
    button.textContent = index === 0 ? plan.title : plan.name;
    heading.append(button);
    item.append(heading);
    titles.append(item);
  });
  const actions = document.createElement("div");
  actions.className = "plan-reader__actions";
  actions.append(createArrowButton({ label: "Invest now", icon: "reader-arrow.svg" }), createStoreButton());
  rail.append(titles, actions);

  const details = document.createElement("ol");
  details.className = "plan-reader__list plan-reader__details";
  plans.forEach((plan, index) => {
    const item = document.createElement("li");
    item.className = "plan-reader__detail";
    item.id = `plan-description-${index}`;
    item.setAttribute("aria-hidden", String(index !== 0));
    item.innerHTML = `
      <p>${plan.description}</p>
      <div class="plan-reader__meta">
        <span class="plan-reader__risk">${plan.risk}</span>
        <span class="plan-reader__returns">YTD Returns: <span>10% p.a</span></span>
      </div>
    `;
    details.append(item);
  });

  scene.append(stack, rail, details);
  reader.append(scene);
  return reader;
}

export function createPlanReader(stack) {
  const variant = new URLSearchParams(window.location.search).get("plan-reader");
  return variant === "classic" ? createClassicReader(stack) : createAmperosReader(stack);
}
