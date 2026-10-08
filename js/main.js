/* =========================================================
   Storytelling fullpage — navegación por secciones con GSAP
   ========================================================= */
document.addEventListener("DOMContentLoaded", function () {
  gsap.registerPlugin(Observer);

  const sections = gsap.utils.toArray(".section");
  const words = sections.map((s) => s.dataset.word);
  const dynamicWord = document.getElementById("dynamic-word");
  const counter = document.getElementById("counter");
  const line = document.querySelector(".tagline .line");
  const hud = document.querySelector(".hud");
  const navbar = document.querySelector(".navbar");
  const navLinks = document.querySelectorAll(".navbar .links a[data-goto]");
  const sliderIndex = sections.findIndex((s) => s.classList.contains("section--slider"));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const DURATION = reduceMotion ? 0.6 : 1.25;
  let current = 0;
  let animating = false;

  CharacterSlider.init(document.querySelector(".as-slider"));

  /* ---------- helpers ---------- */
  const q = (section, sel) => section.querySelector(sel);

  function lineWidth(index) {
    const max = Math.min(300, window.innerWidth * 0.5);
    return ((index + 1) / sections.length) * max;
  }

  function updateHud(index) {
    gsap.to(dynamicWord, {
      opacity: 0, y: -10, duration: 0.25, ease: "power2.in",
      onComplete() {
        dynamicWord.textContent = words[index];
        gsap.fromTo(dynamicWord, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" });
      },
    });
    gsap.to(line, { width: lineWidth(index), duration: 1.5, ease: "power2.out" });
    counter.textContent = String(index + 1).padStart(2, "0");
    hud.classList.toggle("is-hidden", index === sliderIndex);

    navLinks.forEach((a) => a.classList.toggle("is-current", Number(a.dataset.goto) === index && !a.classList.contains("btn-contact")));
  }

  /* ---------- transición entre secciones ---------- */
  function goToSection(index) {
    index = gsap.utils.clamp(0, sections.length - 1, index);
    if (index === current || animating) return;
    animating = true;

    const dir = index > current ? 1 : -1;
    const from = sections[current];
    const to = sections[index];

    if (current === sliderIndex) CharacterSlider.setVisible(false);

    gsap.set(to, { zIndex: 3, visibility: "visible", yPercent: 0 });
    gsap.set(from, { zIndex: 2 });
    to.classList.add("is-active");

    const tl = gsap.timeline({
      defaults: { duration: DURATION, ease: "power3.inOut" },
      onComplete() {
        from.classList.remove("is-active");
        gsap.set(from, { clearProps: "all" });
        gsap.set(from.querySelectorAll(".layer, h1"), { clearProps: "transform,opacity,filter" });
        gsap.set(to, { clearProps: "zIndex,visibility" });
        // pequeño bloqueo extra para la inercia del trackpad
        setTimeout(() => (animating = false), 250);
        if (index === sliderIndex) CharacterSlider.setVisible(true);
      },
    });

    if (reduceMotion) {
      tl.fromTo(to, { opacity: 0 }, { opacity: 1 });
    } else {
      // la sección nueva entra, la anterior se va más lento (parallax) y se oscurece
      tl.fromTo(to, { yPercent: 100 * dir }, { yPercent: 0 }, 0)
        .to(from, { yPercent: -30 * dir, filter: "brightness(0.35)" }, 0);

      const bg = q(to, ".bg");
      const fg = q(to, ".fg");
      const planet = q(to, ".planet");
      const title = q(to, "h1");
      const fromTitle = q(from, "h1");

      if (bg) tl.fromTo(bg, { yPercent: -60 * dir }, { yPercent: 0 }, 0);
      if (planet) tl.fromTo(planet, { yPercent: 35, scale: 0.85 }, { yPercent: 0, scale: 1, duration: DURATION + 0.4, ease: "power3.out" }, 0.2);
      if (fg) tl.fromTo(fg, { yPercent: 35 * dir }, { yPercent: 0, duration: DURATION + 0.2, ease: "power3.out" }, 0.1);

      // textos (igual que el onLeave original de fullPage)
      if (fromTitle) tl.to(fromTitle, { opacity: 0, y: -100, duration: 1.2, ease: "power2.out" }, 0);
      if (title) tl.fromTo(title, { y: 100, opacity: 0 }, { y: 0, opacity: 1, duration: 1.5, ease: "power2.out" }, 0.5);

      const cta = q(to, ".cta");
      if (cta) tl.fromTo(cta, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: "power2.out" }, 0.8);
    }

    current = index;
    updateHud(index);
  }

  const next = () => goToSection(current + 1);
  const prev = () => goToSection(current - 1);

  /* ---------- entrada inicial ---------- */
  function intro() {
    const s = sections[0];
    gsap.set(line, { width: lineWidth(0) });
    updateHud(0);
    if (reduceMotion) return;
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .from(q(s, ".bg"), { scale: 1.15, duration: 2.2 }, 0)
      .from(q(s, ".planet"), { yPercent: 40, scale: 0.8, opacity: 0, duration: 2 }, 0.2)
      .from(q(s, "h1"), { y: 120, opacity: 0, duration: 1.6 }, 0.5)
      .from(q(s, ".fg"), { yPercent: 40, duration: 1.8 }, 0.1)
      .from([navbar, ".tagline", ".scroll-text"], { opacity: 0, y: -12, duration: 1, stagger: 0.1 }, 1);
  }
  intro();

  /* ---------- input: rueda, touch, teclado ---------- */
  Observer.create({
    target: window,
    type: "wheel,touch",
    wheelSpeed: -1,
    tolerance: 12,
    preventDefault: true,
    onDown: () => !document.body.classList.contains("menu-open") && prev(),
    onUp: () => !document.body.classList.contains("menu-open") && next(),
  });

  window.addEventListener("keydown", (e) => {
    if (current === sliderIndex && CharacterSlider.handleKey(e.key)) return;
    switch (e.key) {
      case "ArrowDown": case "PageDown": case " ": e.preventDefault(); next(); break;
      case "ArrowUp": case "PageUp": e.preventDefault(); prev(); break;
      case "Home": goToSection(0); break;
      case "End": goToSection(sections.length - 1); break;
      case "Escape": document.body.classList.remove("menu-open"); break;
    }
  });

  /* ---------- links del navbar ---------- */
  document.querySelectorAll("[data-goto]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      document.body.classList.remove("menu-open");
      toggle.setAttribute("aria-expanded", "false");
      goToSection(Number(link.dataset.goto));
    });
  });

  const toggle = document.querySelector(".menu-toggle");
  toggle.addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  /* ---------- parallax con el ratón ---------- */
  if (!reduceMotion && window.matchMedia("(pointer: fine)").matches) {
    const movers = gsap.utils.toArray(".depth").map((el) => ({
      depth: Number(el.dataset.depth) || 10,
      x: gsap.quickTo(el, "x", { duration: 1.2, ease: "power3.out" }),
      y: gsap.quickTo(el, "y", { duration: 1.2, ease: "power3.out" }),
    }));
    window.addEventListener("mousemove", (e) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      movers.forEach((m) => { m.x(-nx * m.depth); m.y(-ny * m.depth * 0.6); });
    });
  }

  window.addEventListener("resize", () => gsap.set(line, { width: lineWidth(current) }));
});
