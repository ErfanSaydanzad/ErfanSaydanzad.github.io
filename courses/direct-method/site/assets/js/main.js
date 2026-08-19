(() => {
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

  // Animated GIFs, given a pause control (WCAG 2.2.2 Pause, Stop, Hide).
  //
  // A GIF starts itself, loops forever and cannot be stopped: there is no API
  // for it and no controls. The way to stop one is to take a picture of it --
  // draw the frame currently on screen into a canvas and show that instead --
  // and the way to start it again is to put the image back.
  function addAnimationToggle(image) {
    // The control cannot go inside a link -- a button nested in an anchor is
    // invalid markup and traps the keyboard -- so where the image sits in one
    // it goes after the link instead.
    const figure = image.closest("figure");
    const link = image.closest("a");
    const host = figure && !link ? figure : null;
    const container = host || (link ? link.parentElement : image.parentElement);
    // Guard on the image, not the container: cards share one grid, and a
    // container-level check would fit a control to the first card only.
    if (!container || image.dataset.animationToggle) return;
    image.dataset.animationToggle = "true";

    const still = document.createElement("canvas");
    still.className = "animation-still";
    still.hidden = true;
    const source = image.currentSrc || image.src;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "animation-toggle";

    let playing = true;

    function freeze() {
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      if (!width || !height) return false;
      still.width = width;
      still.height = height;
      try {
        still.getContext("2d").drawImage(image, 0, 0, width, height);
      } catch (error) {
        return false;
      }
      return true;
    }

    function setPlaying(next) {
      if (next) {
        image.src = source;
        image.hidden = false;
        still.hidden = true;
      } else if (freeze()) {
        still.hidden = false;
        image.hidden = true;
      } else {
        return;
      }
      playing = next;
      button.textContent = next ? "Pause animation" : "Play animation";
      button.setAttribute("aria-pressed", String(!next));
    }

    button.addEventListener("click", () => setPlaying(!playing));
    image.after(still);
    (host || link || image).after(button);
    setPlaying(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  document.querySelectorAll("img.animated-gif").forEach((image) => {
    if (image.complete) addAnimationToggle(image);
    else image.addEventListener("load", () => addAnimationToggle(image), { once: true });
  });

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
