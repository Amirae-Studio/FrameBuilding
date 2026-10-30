(function () {
  const A = window.SidonArt;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- Art injection ---------- */
  $("#heroCity").innerHTML = A.city();
  // drones live inside the city SVG (viewBox units) so they scale and stay over the same buildings
  const citySvg = $("#heroCity > svg");
  citySvg.insertAdjacentHTML("beforeend", [[775, 300, 0], [640, 395, -3], [385, 485, -2], [430, 650, -4], [1120, 720, -1]]
    .map(([x, y, d]) => `<g class="drone" style="animation-delay:${d}s">${A.droneSVG.replace("<svg ", `<svg x="${x - 28}" y="${y - 14}" width="56" height="28" `)}</g>`).join(""));
  $$("[data-art]").forEach(el => { el.innerHTML = A[el.dataset.art](); });

  /* ---------- Header theme follows the section beneath it ---------- */
  const nav = $("#nav");
  const sections = $$("[data-theme]");
  function syncNav() {
    const probe = nav.offsetHeight / 2;
    // sections later in the DOM paint above the sticky hero, so test from the end
    let hit = null;
    for (let i = sections.length - 1; i >= 0; i--) {
      const r = sections[i].getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) { hit = sections[i]; break; }
    }
    if (!hit) return;
    const bg = hit.dataset.bg === "transparent" ? "transparent" : getComputedStyle(hit).backgroundColor;
    nav.style.backgroundColor = bg;
    nav.classList.toggle("is-light", hit.dataset.theme === "light");
  }
  window.addEventListener("scroll", () => requestAnimationFrame(syncNav), { passive: true });
  window.addEventListener("resize", syncNav);
  syncNav();

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.15 });
  $$(".reveal").forEach((el, i) => {
    el.style.transitionDelay = (el.closest(".hero") ? i * 0.12 : 0) + "s";
    io.observe(el);
  });

  /* ---------- Mission slides ---------- */
  const slides = $$("#missionSlides .slide"), dots = $$("#missionDots button");
  let mIdx = 0, mTimer;
  function showSlide(i) {
    mIdx = (i + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle("is-active", k === mIdx));
    dots.forEach((d, k) => d.classList.toggle("is-active", k === mIdx));
  }
  function mAuto() { clearInterval(mTimer); mTimer = setInterval(() => showSlide(mIdx + 1), 5000); }
  dots.forEach((d, i) => d.addEventListener("click", () => { showSlide(i); mAuto(); }));
  mAuto();

  /* ---------- Approach carousel ---------- */
  const track = $("#howTrack"), bar = $("#howBar");
  let busy = false, step = 0, hTimer;
  function howNext() {
    if (busy) return;
    busy = true;
    const cards = $$(".how-card", track);
    const shift = cards[0].offsetWidth + parseFloat(getComputedStyle(track).columnGap || 23);
    cards[0].classList.remove("is-active");
    cards[1].classList.add("is-active");
    track.style.transition = "transform .8s cubic-bezier(.6,.1,.2,1)";
    track.style.transform = `translateX(${-shift}px)`;
    step = (step + 1) % 3;
    bar.style.left = (step * 33.33) + "%";
    setTimeout(() => {
      track.style.transition = "none";
      track.appendChild(cards[0]);
      track.style.transform = "translateX(0)";
      void track.offsetWidth;
      busy = false;
    }, 820);
  }
  function hAuto() { clearInterval(hTimer); hTimer = setInterval(howNext, 4200); }
  track.addEventListener("click", e => {
    const card = e.target.closest(".how-card");
    if (card && !card.classList.contains("is-active")) { e.preventDefault(); howNext(); hAuto(); }
  });
  hAuto();

  /* ---------- Magazine drag-scroll + progress ---------- */
  const mv = $("#magViewport"), magBar = $("#magBar");
  function magProgress() {
    const max = mv.scrollWidth - mv.clientWidth;
    const ratio = mv.clientWidth / mv.scrollWidth;
    const track = magBar.parentElement.clientWidth;
    const w = Math.max(.18, Math.min(1, ratio)) * track;
    magBar.style.width = w + "px";
    magBar.style.left = (max > 0 ? (mv.scrollLeft / max) * (track - w) : 0) + "px";
  }
  let drag = null;
  mv.addEventListener("pointerdown", e => { drag = { x: e.clientX, s: mv.scrollLeft, moved: false }; mv.classList.add("dragging"); });
  window.addEventListener("pointermove", e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 3) drag.moved = true;
    mv.scrollLeft = drag.s - dx;
  });
  window.addEventListener("pointerup", () => { drag = null; mv.classList.remove("dragging"); });
  mv.addEventListener("click", e => { if (drag && drag.moved) e.preventDefault(); }, true);
  mv.addEventListener("scroll", magProgress, { passive: true });
  window.addEventListener("resize", magProgress);
  magProgress();

})();
