const mediaRoot = "./assets/wallet/";
const cloudinary = "https://res.cloudinary.com/dsjxfieim/video/upload/";
const risers = [
  ["Sanni", "v1699238923/RiseSanni2_blq2zz.mp4", "sanni.jpg"],
  ["Layo", "v1699239069/RiseLayo2_zwrhzy.mp4", "layo.jpg"],
  ["Henry", "v1698851653/RiseHenry_d0akwz.mp4", "henry.jpg"],
];

// Summaries of the reviews featured on Risevest's homepage.
const reviews = [
  [
    ["Uwem Ekpo", "Uses Rise to build dollar assets and recommends it to beginners.", "uwem.png"],
    ["Adeneye Bolwatife", "Recommends Rise to people who are new to investing in dollars."],
    ["Naomi Saleh", "Values the customer service and the chance to learn from the Rise community."],
    ["Doris", "Looks forward to seeing the interest come in.", "doris.png"],
  ],
  [
    ["Emily Olatujoye", "Enjoys getting notified when her vault interest is paid.", "emily.png"],
    ["Kehinde", "Likes having several ways to invest and found customer support responsive."],
    ["Toby", "Found getting started with US real estate straightforward.", "toby.png"],
  ],
];

export function createWalletStory() {
  const section = document.createElement("section");
  section.className = "wallet-story";
  section.setAttribute("aria-label", "Rise wallet");
  section.innerHTML = `
    <div class="wallet-story__stage" aria-hidden="true">
      <div class="wallet-story__media">
        <video muted playsinline preload="auto" poster="${mediaRoot}coins-poster.jpg"
          data-src="${mediaRoot}coins-scroll.mp4"></video>
      </div>
    </div>
  `;
  return section;
}

export function createCustomerStories() {
  const section = document.createElement("div");
  section.className = "customer-stories";
  section.innerHTML = `
    <section class="risers" aria-labelledby="risers-title">
      <h2 id="risers-title">Meet Some <em>Risers</em></h2>
      <div class="risers__grid">
        ${risers.map(([name, source, thumbnail]) => `
          <button class="risers__card" type="button" data-video="${source}" data-riser="${name}"
            aria-label="Watch ${name}’s story" aria-haspopup="dialog">
            <img src="${mediaRoot}${thumbnail}" alt="" loading="lazy" width="720" height="480">
            <span class="risers__name">${name}</span>
            <span class="risers__play" aria-hidden="true"><i class="ri-play-fill"></i></span>
          </button>
        `).join("")}
      </div>
    </section>
    <section class="customer-reviews" aria-labelledby="customer-reviews-title">
      <img class="customer-reviews__art" src="${mediaRoot}testimonials.webp" alt="" loading="lazy" width="100" height="71">
      <h2 id="customer-reviews-title">What Our Customers Say About Us</h2>
      ${reviews.map((row, index) => `
        <ul class="customer-reviews__row" tabindex="0" aria-label="Customer reviews, row ${index + 1}">
          ${row.map(([name, summary, avatar]) => `
            <li><p>${summary}</p><strong>
              ${avatar ? `<img src="${mediaRoot}${avatar}" alt="" loading="lazy" width="22" height="22">` : ""}
              ${name}
            </strong></li>
          `).join("")}
        </ul>
      `).join("")}
    </section>
    <dialog class="risers__dialog" aria-labelledby="riser-video-title">
      <div class="risers__dialog-bar">
        <h2 id="riser-video-title"></h2>
        <form method="dialog"><button type="submit" aria-label="Close video">×</button></form>
      </div>
      <video controls playsinline preload="none"></video>
    </dialog>
  `;

  const dialog = section.querySelector("dialog");
  const player = dialog.querySelector("video");
  const title = dialog.querySelector("h2");
  section.querySelectorAll(".risers__card").forEach((button) => {
    button.addEventListener("click", () => {
      title.textContent = `${button.dataset.riser}’s story`;
      player.src = cloudinary + button.dataset.video;
      dialog.showModal();
      player.play().catch(() => {});
    });
  });
  dialog.addEventListener("close", () => {
    player.pause();
    player.removeAttribute("src");
    player.load();
  });
  return section;
}
