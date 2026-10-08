/* =========================================================
   Character slider — recreación del "as-slider" sin Elementor/Swiper
   ========================================================= */
window.CharacterSlider = (function () {
  const characters = [
    { img: "assets/img/char-1.webp", kicker: "Your",   title: "Character", name: "Kael Sorrin", role: "Pathfinder",
      desc: "Cartógrafo de mundos perdidos. Lee las tormentas magnéticas como otros leen mapas." },
    { img: "assets/img/char-2.webp", kicker: "Lone",   title: "Explorer",  name: "Taren Voss",  role: "Wanderer",
      desc: "Cruzó los acantilados de Nimbus sin nave ni mapa. Nadie sabe qué busca." },
    { img: "assets/img/char-3.webp", kicker: "Last",   title: "Guardian",  name: "Rhys Calder", role: "Sentinel",
      desc: "Último custodio del Portal Violeta. Su promesa pesa más que su armadura." },
    { img: "assets/img/char-4.webp", kicker: "Silent", title: "Hunter",    name: "Idris Moro",  role: "Tracker",
      desc: "Rastrea criaturas de plasma por los valles de niebla sin dejar huella." },
    { img: "assets/img/char-5.webp", kicker: "Wild",   title: "Rebel",     name: "Zane Okoro",  role: "Insurgent",
      desc: "Lidera la resistencia de las colonias rosadas contra el Consejo Orbital." },
  ];

  const n = characters.length;
  let root, cards, backgrounds, widgets, dots;
  let current = 0;
  let previous = 0;
  let autoplay = null;
  let paused = false;
  const AUTOPLAY_MS = 5000;

  function build(el) {
    root = el;

    // dots
    const bar = root.querySelector(".as-bar");
    bar.innerHTML = characters
      .map((c, i) => `<button class="dot" role="tab" aria-label="${c.name}"><span class="dot-number">${i + 1}</span></button>`)
      .join("");
    dots = [...bar.children];

    // backgrounds
    const bgWrap = root.querySelector(".as-slider-background");
    bgWrap.innerHTML = characters.map((c) => `<img decoding="async" src="${c.img}" alt="" />`).join("");
    backgrounds = [...bgWrap.children];

    // changing text widgets
    widgets = [...root.querySelectorAll(".as-changing-widget")];
    widgets.forEach((w) => {
      const key = w.dataset.key;
      w.innerHTML = characters.map((c) => `<div class="as-text"><p>${c[key]}</p></div>`).join("");
    });

    // cards
    const track = root.querySelector(".as-track");
    track.innerHTML = characters
      .map((c) => `
        <article class="as-card">
          <img src="${c.img}" alt="${c.name}" loading="lazy" />
          <cite><strong>${c.name}</strong><span>${c.role}</span></cite>
        </article>`)
      .join("");
    cards = [...track.children];
  }

  function measure() {
    widgets.forEach((w) => {
      const t = w.querySelectorAll(".as-text")[current];
      w.style.setProperty("--h", t.offsetHeight + "px");
    });
  }

  // slot: 0 = activo, 1..n-2 a la derecha, -1 = sale por la izquierda
  function slotOf(i) {
    const s = (i - current + n) % n;
    return s === n - 1 ? -1 : s;
  }

  function layoutCards(initial) {
    cards.forEach((card, i) => {
      const slot = slotOf(i);
      const prevSlot = card._slot;
      const jump = prevSlot !== undefined && Math.abs(slot - prevSlot) > 1;

      if (initial || jump) {
        card.classList.add("no-anim");
        card.style.setProperty("--slot", slot);
        card.offsetWidth; // reflow
        card.classList.remove("no-anim");
      } else {
        card.style.setProperty("--slot", slot);
      }
      card._slot = slot;
      card.classList.toggle("is-active", slot === 0);
      card.classList.toggle("is-out", slot === -1);
      card.style.zIndex = n - Math.abs(slot);
    });
  }

  function goTo(index, forcedForward) {
    index = (index + n) % n;
    if (index === current) return;

    previous = current;
    current = index;

    let forward = forcedForward;
    if (forward === undefined) {
      const diff = (current - previous + n) % n;
      forward = diff <= n / 2;
    }

    widgets.forEach((w) => {
      const texts = w.querySelectorAll(".as-text");
      w.style.setProperty("--h", texts[current].offsetHeight + "px");
      texts.forEach((t) => t.classList.remove("prev", "next", "currentUp", "currentDown"));
      if (forward) {
        texts[previous].classList.add("prev");
        texts[current].classList.add("currentUp");
      } else {
        texts[previous].classList.add("next");
        texts[current].classList.add("currentDown");
      }
    });

    backgrounds.forEach((b) => b.classList.remove("prev", "currentBackward", "currentForward"));
    backgrounds[previous].classList.add("prev");
    // reinicia la animación css
    void backgrounds[current].offsetWidth;
    backgrounds[current].classList.add(forward ? "currentForward" : "currentBackward");

    dots.forEach((d, i) => {
      d.classList.toggle("active", i === current);
      d.setAttribute("aria-selected", i === current);
    });

    layoutCards(false);
    restartAutoplay();
  }

  const next = () => goTo(current + 1, true);
  const prev = () => goTo(current - 1, false);

  function restartAutoplay() {
    clearInterval(autoplay);
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    autoplay = setInterval(next, AUTOPLAY_MS);
  }

  function bindEvents() {
    root.querySelector(".as-slider-left").addEventListener("click", prev);
    root.querySelector(".as-slider-right").addEventListener("click", next);
    dots.forEach((d, i) => d.addEventListener("click", () => goTo(i)));
    cards.forEach((c, i) => c.addEventListener("click", () => goTo(i)));

    root.addEventListener("mouseenter", () => { paused = true; clearInterval(autoplay); });
    root.addEventListener("mouseleave", () => { paused = false; restartAutoplay(); });

    // swipe horizontal en las tarjetas
    const area = root.querySelector(".as-side-slider");
    let startX = null, startY = null;
    area.addEventListener("pointerdown", (e) => { startX = e.clientX; startY = e.clientY; });
    area.addEventListener("pointerup", (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? next : prev)();
      startX = null;
    });

    window.addEventListener("resize", measure);
  }

  function init(el) {
    build(el);

    widgets.forEach((w) => w.querySelectorAll(".as-text")[0].classList.add("currentUp"));
    backgrounds[0].classList.add("currentForward");
    dots[0].classList.add("active");
    layoutCards(true);
    bindEvents();

    // medir cuando las fuentes estén listas
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(measure);
    measure();
  }

  // se llama cuando la sección entra/sale de pantalla
  function setVisible(visible) {
    if (visible) {
      measure();
      setTimeout(() => root.classList.add("loaded"), 300);
      paused = false;
      restartAutoplay();
    } else {
      paused = true;
      clearInterval(autoplay);
    }
  }

  function handleKey(key) {
    if (key === "ArrowRight") { next(); return true; }
    if (key === "ArrowLeft") { prev(); return true; }
    return false;
  }

  return { init, setVisible, handleKey };
})();
