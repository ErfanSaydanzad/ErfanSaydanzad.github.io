(() => {
  // Animations play once (the GIFs carry no loop block) and stop on their last
  // frame: a loop pulls the eye from the text. Each one starts over when the
  // reader scrolls it into view, and a Replay button plays it again.
  document.querySelectorAll("figure.animation video.animation-video").forEach((video) => {
    const play = () => { video.currentTime = 0; video.play().catch(() => {}); };
    const button = document.createElement("button");
    button.type = "button";
    button.className = "animation-replay";
    button.textContent = "\u21BB Replay";
    button.setAttribute("aria-label", "Replay the animation");
    button.addEventListener("click", play);
    video.insertAdjacentElement("afterend", button);
    video.addEventListener("click", () => (video.paused ? video.play().catch(() => {}) : video.pause()));
    if ("IntersectionObserver" in window) {
      const seen = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { play(); seen.disconnect(); }
      }, { threshold: 0.6 });
      seen.observe(video);
    }
  });

  document.querySelectorAll("figure.animation img").forEach((img) => {
    const src = img.getAttribute("src") || "";
    if (!/\.gif($|\?)/i.test(src)) return;
    const base = src.split("?")[0];
    let plays = 0;
    const restart = () => { plays += 1; img.src = `${base}?play=${plays}`; };
    const button = document.createElement("button");
    button.type = "button";
    button.className = "animation-replay";
    button.textContent = "↻ Replay";
    button.setAttribute("aria-label", "Replay the animation");
    button.addEventListener("click", restart);
    img.insertAdjacentElement("afterend", button);
    if ("IntersectionObserver" in window) {
      const seen = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { restart(); seen.disconnect(); }
      }, { threshold: 0.6 });
      seen.observe(img);
    }
  });

  const links = [...document.querySelectorAll(".chapter-toc a")];
  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (links.length && sections.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        links.forEach((link) => {
          link.classList.toggle("is-active", link.getAttribute("href") === `#${visible.target.id}`);
        });
      },
      { rootMargin: "-18% 0px -70% 0px", threshold: [0.1, 0.25, 0.5] }
    );
    sections.forEach((section) => observer.observe(section));
  }

  const loadedAssets = new Map();

  function loadScript(src) {
    if (loadedAssets.has(src)) return loadedAssets.get(src);
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.defer = true;
      script.onload = () => resolve(script);
      script.onerror = () => reject(new Error(`Could not load script: ${src}`));
      document.head.appendChild(script);
    });
    loadedAssets.set(src, promise);
    return promise;
  }

  function loadStylesheet(href) {
    if (loadedAssets.has(href)) return loadedAssets.get(href);
    const promise = new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onload = () => resolve(link);
      link.onerror = () => reject(new Error(`Could not load stylesheet: ${href}`));
      document.head.appendChild(link);
    });
    loadedAssets.set(href, promise);
    return promise;
  }

  function showError(mount, error) {
    mount.innerHTML = "";
    const message = document.createElement("p");
    message.style.color = "#b42318";
    message.textContent = error instanceof Error ? error.message : String(error);
    mount.appendChild(message);
  }

  window.LectureNotes = {
    registerInteractiveFigure(id, initializer) {
      const mount = document.getElementById(id);
      if (!mount || typeof initializer !== "function") return;
      try {
        const result = initializer(mount, window.LectureNotes);
        if (result && typeof result.catch === "function") {
          result.catch((error) => showError(mount, error));
        }
      } catch (error) {
        showError(mount, error);
      }
    },
    loadScript,
    loadStylesheet,
    ready(callback) {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", callback, { once: true });
      } else {
        callback();
      }
    },
  };
})();
