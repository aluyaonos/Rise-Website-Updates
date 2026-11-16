const pages = [
  ["/", "About"],
  ["/plans/", "Plans"],
  ["/why-rise/", "Why Rise"],
  ["/privacy-policy/", "Privacy Policy"],
];

const currentPath = location.pathname.replace(/(?:index\.html)?\/?$/, "/");
const stylesheet = document.createElement("link");
stylesheet.rel = "stylesheet";
stylesheet.href = new URL("./page-switcher.css", import.meta.url);
document.head.append(stylesheet);

const switcher = document.createElement("details");
switcher.className = "rise-page-switcher";
const trigger = document.createElement("summary");
trigger.textContent = "Pages";
const links = document.createElement("nav");
links.setAttribute("aria-label", "Preview pages");

for (const [href, label] of pages) {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = label;
  if (href === currentPath) link.setAttribute("aria-current", "page");
  links.append(link);
}

switcher.append(trigger, links);
document.body.prepend(switcher);

document.addEventListener("click", event => {
  if (switcher.open && !switcher.contains(event.target)) switcher.open = false;
});

document.addEventListener("keydown", event => {
  if (event.key !== "Escape" || !switcher.open) return;
  const focusInSwitcher = switcher.contains(document.activeElement);
  switcher.open = false;
  if (focusInSwitcher) {
    event.preventDefault();
    trigger.focus();
  }
});
