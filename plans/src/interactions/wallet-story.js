const openingRange = 0.55;
const exitTravel = 0.75;
const exitScale = 1 / 24;
const videoEndAtExit = 0.72;
const frameDuration = 1 / 24;
const clamp = (value) => Math.max(0, Math.min(1, value));

export function initializeWalletStory() {
  const story = document.querySelector(".wallet-story");
  const stage = story.querySelector(".wallet-story__stage");
  const video = story.querySelector("video");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let active = false;
  let videoRequest;
  let objectUrl;

  function render() {
    frame = 0;
    if (!active || reducedMotion.matches) return;
    const { top, height } = stage.getBoundingClientRect();
    // Same opening and exit curves as the About page's team story.
    const entry = clamp(1 - top / (height * openingRange));
    const closed = 1 - (entry + entry ** 2 * (1 - entry));
    const exit = clamp(-top / height);
    const easedExit = exit * (1 - (1 - exit) ** 2);
    story.style.setProperty("--wallet-closed", closed);
    story.style.setProperty("--wallet-offset", `${easedExit * height * exitTravel}px`);
    story.style.setProperty("--wallet-scale", 1 + easedExit * exitScale);

    if (video.readyState < 1 || !Number.isFinite(video.duration) || video.seeking) return;
    // Reach the final frame while the video is still visible behind the incoming section.
    const progress = clamp((openingRange - top / height) / (openingRange + videoEndAtExit));
    const lastFrame = Math.max(0, video.duration - frameDuration);
    const time = Math.min(lastFrame, Math.round(progress * lastFrame / frameDuration) * frameDuration);
    if (Math.abs(video.currentTime - time) >= frameDuration / 2) video.currentTime = time;
  }

  function scheduleRender() {
    if (!frame && active) frame = requestAnimationFrame(render);
  }

  function syncMotionPreference() {
    if (reducedMotion.matches) {
      videoRequest?.abort();
      if (objectUrl) {
        video.removeAttribute("src");
        video.load();
        URL.revokeObjectURL(objectUrl);
        objectUrl = undefined;
      }
    } else if (active && !objectUrl && !videoRequest) {
      // A local Blob can seek even when the preview server ignores Range requests.
      const request = new AbortController();
      videoRequest = request;
      fetch(video.dataset.src, { signal: request.signal })
        .then((response) => {
          if (!response.ok) throw new Error("Wallet video unavailable");
          return response.blob();
        })
        .then((blob) => {
          if (request.signal.aborted) return;
          objectUrl = URL.createObjectURL(blob);
          video.src = objectUrl;
        })
        .catch(() => { /* Keep the poster visible if the video cannot load. */ })
        .finally(() => {
          if (videoRequest === request) videoRequest = undefined;
          if (request.signal.aborted && !reducedMotion.matches) syncMotionPreference();
        });
    }
    scheduleRender();
  }

  const observer = new IntersectionObserver(([entry]) => {
    active = entry.isIntersecting;
    syncMotionPreference();
  }, { rootMargin: "100% 0px" });
  observer.observe(stage);
  window.addEventListener("scroll", scheduleRender, { passive: true });
  window.addEventListener("resize", scheduleRender);
  window.addEventListener("pageshow", scheduleRender);
  video.addEventListener("loadedmetadata", scheduleRender);
  video.addEventListener("seeked", scheduleRender);
  reducedMotion.addEventListener("change", syncMotionPreference);
  window.addEventListener("pagehide", (event) => {
    if (event.persisted) return;
    observer.disconnect();
    cancelAnimationFrame(frame);
    videoRequest?.abort();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  });
}
