/* Page motion: nav indicator, scroll timeline, chart draw-in, cursor spotlight, glider logo, reading progress. */
(function () {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(pointer: fine)").matches;

  /* ---------- glider logo: steps through its four phases on hover ---------- */
  const PH = [[[1,0],[2,1],[0,2],[1,2],[2,2]], [[0,1],[2,1],[1,2],[2,2],[1,3]], [[2,1],[0,2],[2,2],[1,3],[2,3]], [[1,1],[2,2],[3,2],[1,3],[2,3]]];
  document.querySelectorAll(".glider").forEach((svg) => {
    const cells = [...svg.querySelectorAll("rect")];
    let k = 0, timer = 0;
    const show = (p) => PH[p].forEach(([x, y], i) => { cells[i].setAttribute("x", x * 6); cells[i].setAttribute("y", (y - (p ? 1 : 0)) * 6 + (p ? 0 : 0)); });
    const tick = () => { k = (k + 1) % 4; show(k); };
    const host = svg.closest("a") || svg;
    host.addEventListener("pointerenter", () => { if (reduce.matches || timer) return; tick(); timer = setInterval(tick, 170); });
    host.addEventListener("pointerleave", () => { clearInterval(timer); timer = 0; k = 0; show(0); });
  });

  /* ---------- nav indicator + experience timeline follow the scroll ---------- */
  const ind = document.getElementById("navInd");
  const navLinks = [...document.querySelectorAll(".nav a[data-sec]")];
  const secs = navLinks.map((a) => document.getElementById(a.dataset.sec));
  const xp = document.querySelector(".xp"), fill = document.querySelector(".rail-fill"), roles = xp ? [...xp.querySelectorAll(".xp-row")] : [];
  const prog = document.getElementById("readProg"), article = document.querySelector(".article-body");
  let active, queued = false;
  function moveInd(a) {
    if (!ind || a === active) return; active = a;
    navLinks.forEach((l) => l.classList.toggle("on", l === a));
    if (!a) { ind.style.opacity = 0; return; }
    const pr = a.parentElement.getBoundingClientRect(), r = a.getBoundingClientRect();
    ind.style.opacity = 1; ind.style.transform = `translateX(${r.left - pr.left}px) scaleX(${r.width})`;
  }
  function onScroll() {
    queued = false;
    const line = innerHeight * 0.55;
    if (xp && fill) {
      const r = xp.getBoundingClientRect(), top = r.top + 14, h = r.height - 40;
      fill.style.transform = `scaleY(${Math.min(Math.max((line - top) / h, 0), 1).toFixed(4)})`;
      roles.forEach((el) => el.classList.toggle("reached", el.getBoundingClientRect().top + 20 < line));
    }
    let cur = null;
    secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * 0.4) cur = navLinks[i]; });
    moveInd(cur);
    if (prog && article) {
      const r = article.getBoundingClientRect();
      prog.style.transform = `scaleX(${Math.min(Math.max(-r.top / Math.max(1, r.height - innerHeight), 0), 1).toFixed(4)})`;
    }
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(onScroll); } };
  addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", () => { active = undefined; queue(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { active = undefined; queue(); });
  onScroll();

  /* ---------- figures draw themselves in when they scroll into view ---------- */
  const hosts = [...document.querySelectorAll(".chart, .reveal, .scene-box")];
  if (!reduce.matches && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { requestAnimationFrame(() => requestAnimationFrame(() => e.target.classList.remove("armed"))); io.unobserve(e.target); }
    }), { rootMargin: "0px 0px -8% 0px", threshold: 0.15 });
    hosts.forEach((h) => { if (h.getBoundingClientRect().top > innerHeight * 0.92) { h.classList.add("armed"); io.observe(h); } });
  }

  /* ---------- cursor spotlight on project rows ---------- */
  if (fine) document.querySelectorAll(".plate").forEach((el) => el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", e.clientX - r.left + "px"); el.style.setProperty("--my", e.clientY - r.top + "px");
  }));

  /* ---------- copy email with a swap animation ---------- */
  const cb = document.getElementById("copyEmail");
  if (cb) cb.addEventListener("click", async () => {
    const done = (msg) => { cb.dataset.state = msg; setTimeout(() => (cb.dataset.state = ""), 1600); };
    try { await navigator.clipboard.writeText(cb.dataset.email); done("copied"); }
    catch (e) { const r = document.createRange(); r.selectNodeContents(document.getElementById("emailText")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); done("selected"); }
  });
})();
