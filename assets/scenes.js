/* Project scenes: small looping illustrations that act out how each model works.
   Each is driven by the project's own model or data, draws itself in the first time it
   scrolls into view, and only animates while it is on screen. */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  function el(tag, a, parent) { const e = document.createElementNS(NS, tag); for (const k in a || {}) e.setAttribute(k, a[k]); if (parent) parent.appendChild(e); return e; }
  function label(svg, x, y, anchor, text, extra) {
    const t = el("text", Object.assign({ x, y, "text-anchor": anchor, "font-size": 6.2, "font-family": MONO, fill: "currentColor", class: "fade" }, extra || {}), svg);
    t.textContent = text; return t;
  }
  const delay = (node, ms) => { node.style.setProperty("--d", ms + "ms"); return node; };
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

  /* ===================================================================================
     1. Virus: one virion at a time reaches a patch of target cells. Each virion is cleared
        or infects a cell; an infected cell waits out the eclipse, then releases a burst.
        Per-virion odds are tuned so a lineage takes hold 14.6% of the time, as in the model.
     =================================================================================== */
  function virus(svg) {
    const accent = css("--accent"), paper = css("--paper"), ink3 = css("--ink-3");
    const BURST = 6, TARGET = 0.146;
    // solve for the per-virion infection chance that gives TARGET with a geometric burst of mean BURST
    const est = (s) => { let q = 0; for (let i = 0; i < 4000; i++) q = 1 - s + s / (1 + BURST * (1 - q)); return 1 - q; };
    let lo = 0, hi = 1; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; est(m) < TARGET ? (lo = m) : (hi = m); }
    const S_INF = (lo + hi) / 2;
    const r = rng(11);
    const spots = [[78, 26], [100, 18], [124, 28], [146, 20], [70, 50], [94, 44], [118, 52], [142, 46], [84, 72], [108, 76], [132, 70], [150, 86], [96, 92], [122, 92]];
    // entry zone
    const entry = el("path", { d: "M14 30 Q4 50 14 70", fill: "none", stroke: "currentColor", "stroke-opacity": 0.25, "stroke-width": 1, "stroke-dasharray": "2 2", class: "fade" }, svg);
    label(svg, 6, 86, "start", "exposure", { "fill-opacity": 0.55 });
    label(svg, 6, 93, "start", "site", { "fill-opacity": 0.55 });
    const cells = spots.map(([x, y], i) => {
      const g = el("g", { class: "pop" }, svg); delay(g, 150 + i * 35);
      const c = el("circle", { cx: x, cy: y, r: 5.4, fill: paper, stroke: "currentColor", "stroke-opacity": 0.45, "stroke-width": 0.9 }, g);
      const n = el("circle", { cx: x + 1, cy: y - 0.6, r: 1.6, fill: "currentColor", "fill-opacity": 0.18 }, g);
      return { x, y, g, c, n, state: "free", t: 0, left: 0 };
    });
    const layer = el("g", {}, svg);
    const t1 = label(svg, 6, 9, "start", "exposure 1"), t2 = label(svg, 6, 17, "start", "took hold 0 of 0");
    const flash = label(svg, 156, 9, "end", "", { "font-size": 7, "font-weight": 600, stroke: paper, "stroke-width": 2.4, "paint-order": "stroke" });
    let virions = [], exposure = 0, held = 0, phase = "idle", phaseT = 0, last = 0;
    function setCell(cell, state, now) {
      cell.state = state; cell.t = now;
      const c = cell.c;
      if (state === "free") { c.setAttribute("fill", paper); c.setAttribute("stroke", "currentColor"); c.setAttribute("stroke-dasharray", ""); c.setAttribute("stroke-opacity", 0.45); c.setAttribute("r", 5.4); c.setAttribute("fill-opacity", 1); }
      if (state === "eclipse") { c.setAttribute("stroke", accent); c.setAttribute("stroke-opacity", 1); c.setAttribute("stroke-dasharray", "1.6 1.2"); c.setAttribute("fill", accent); c.setAttribute("fill-opacity", 0.12); }
      if (state === "prod") { c.setAttribute("stroke-dasharray", ""); c.setAttribute("fill", accent); c.setAttribute("fill-opacity", 0.85); }
      if (state === "dead") { c.setAttribute("fill", ink3); c.setAttribute("fill-opacity", 0.25); c.setAttribute("stroke", ink3); c.setAttribute("stroke-opacity", 0.3); c.setAttribute("r", 4.2); }
    }
    function spawn(x, y, now) {
      const free = cells.filter((c) => c.state === "free");
      const target = free.length ? free[Math.floor(r() * free.length)] : null;
      const infect = target && r() < S_INF;
      const tx = target ? target.x : x + 30, ty = target ? target.y : y;
      const trail = el("line", { x1: x, y1: y, x2: x, y2: y, stroke: "currentColor", "stroke-opacity": 0.22, "stroke-width": 0.8, "stroke-linecap": "round" }, layer);
      const dot = el("circle", { cx: x, cy: y, r: 1.7, fill: "currentColor" }, layer);
      virions.push({ x0: x, y0: y, tx, ty, target, infect, t0: now, dur: 1100 + r() * 700, stop: infect ? 1 : 0.35 + r() * 0.45, dot, trail, dead: false });
    }
    function clearMark(x, y) {
      const g = el("g", {}, layer);
      el("path", { d: `M${x - 2} ${y - 2} L${x + 2} ${y + 2} M${x + 2} ${y - 2} L${x - 2} ${y + 2}`, stroke: "currentColor", "stroke-width": 0.8, "stroke-opacity": 0.55 }, g);
      g.animate ? g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 650, easing: "ease-in", fill: "forwards" }).onfinish = () => g.remove() : setTimeout(() => g.remove(), 650);
    }
    function ring(x, y) {
      const c = el("circle", { cx: x, cy: y, r: 5, fill: "none", stroke: accent, "stroke-width": 0.8 }, layer);
      if (c.animate) c.animate([{ r: 5, opacity: 0.9 }, { r: 12, opacity: 0 }], { duration: 700, easing: "ease-out", fill: "forwards" }).onfinish = () => c.remove(); else c.remove();
    }
    function newExposure(now) {
      exposure++; cells.forEach((c) => setCell(c, "free", now)); layer.replaceChildren(); virions = [];
      t1.textContent = "exposure " + exposure; flash.textContent = "";
      spawn(8, 34 + r() * 32, now); phase = "run";
    }
    function step(now) {
      const dt = last ? Math.min(now - last, 60) : 16; last = now;
      if (phase === "idle") { if (!phaseT) phaseT = now + 700; if (now > phaseT) newExposure(now); return; }
      if (phase === "hold") { if (now > phaseT) { phaseT = 0; phase = "idle"; } return; }
      for (const v of virions) {
        if (v.dead) continue;
        const u = clamp((now - v.t0) / v.dur, 0, 1), x = lerp(v.x0, v.tx, u), y = lerp(v.y0, v.ty, u);
        v.dot.setAttribute("cx", x.toFixed(1)); v.dot.setAttribute("cy", y.toFixed(1));
        const tu = Math.max(0, u - 0.18); v.trail.setAttribute("x1", lerp(v.x0, v.tx, tu).toFixed(1)); v.trail.setAttribute("y1", lerp(v.y0, v.ty, tu).toFixed(1)); v.trail.setAttribute("x2", x.toFixed(1)); v.trail.setAttribute("y2", y.toFixed(1));
        if (!v.infect && u >= v.stop) { v.dead = true; v.dot.remove(); v.trail.remove(); clearMark(x, y); }
        if (v.infect && u >= 1) {
          v.dead = true; v.dot.remove(); v.trail.remove();
          if (v.target.state === "free") { setCell(v.target, "eclipse", now); ring(v.target.x, v.target.y); }
        }
      }
      virions = virions.filter((v) => !v.dead);
      for (const c of cells) {
        if (c.state === "eclipse" && now - c.t > 900) {
          setCell(c, "prod", now);
          let k = 0; const p = BURST / (1 + BURST); while (r() < p && k < 14) k++; c.left = k; c.next = now + 120;
          if (!k) setCell(c, "dead", now);
        } else if (c.state === "prod" && now > c.next) {
          if (c.left > 0) { spawn(c.x, c.y, now); c.left--; c.next = now + 230; }
          if (c.left <= 0) setCell(c, "dead", now);
        }
      }
      const infected = cells.filter((c) => c.state !== "free").length;
      const active = virions.length + cells.filter((c) => c.state === "eclipse" || c.state === "prod").length;
      if (infected >= 5) {
        held++; phase = "hold"; phaseT = now + 2300;
        flash.textContent = "took hold"; flash.setAttribute("fill", accent);
        t2.textContent = `took hold ${held} of ${exposure}`;
      } else if (!active) {
        phase = "hold"; phaseT = now + 900;
        flash.textContent = "died out"; flash.setAttribute("fill", "currentColor");
        t2.textContent = `took hold ${held} of ${exposure}`;
      }
    }
    function still() {
      // a frozen mid-infection frame for reduced motion
      [0, 5, 6, 9].forEach((i, k) => setCell(cells[i], k < 2 ? "dead" : k < 3 ? "prod" : "eclipse", 0));
      t1.textContent = "exposure 7"; t2.textContent = "took hold 1 of 7";
    }
    return { step, still };
  }

  /* ===================================================================================
     2. Antibiotic: the dosing curve plays over a week while the bacteria and immune cells
        below follow the real model. Two regimens alternate: one clears, one breeds resistance.
     =================================================================================== */
  function antibiotic(svg, D) {
    const P = D.P, s1 = css("--s1"), s2 = css("--s2"), accent = css("--accent"), wash = css("--accent-wash");
    function simulate(dose, tau) {
      const T = P.days * 24, dt = 0.02, n = Math.round(T / dt), ke = Math.LN2 / P.thalf;
      let S = P.S0, R = P.R0, C = 0, next = 0; const tr = [];
      const E = (c, e) => { const ch = Math.pow(c, P.hill); return (P.Emax * ch) / (Math.pow(e, P.hill) + ch); };
      const f = (S, R, C) => { const N = S + R, lg = 1 - N / P.Bmax, im = P.kimm / (1 + N / P.Kimm), gS = P.kg * lg, gR = P.kg * (1 - P.cost) * lg, mu = P.mu * Math.max(gS, 0) * S;
        return [gS * S - E(C, P.ec50S) * S - im * S - mu, gR * R - E(C, P.ec50R) * R - im * R + mu, im]; };
      for (let i = 0; i <= n; i++) {
        const t = i * dt;
        if (t + 1e-9 >= next && next < T) { C += dose / P.V; next += tau; }
        const k1 = f(S, R, C), cm = C * Math.exp(-ke * dt / 2), c1 = C * Math.exp(-ke * dt);
        const k2 = f(S + dt / 2 * k1[0], R + dt / 2 * k1[1], cm), k3 = f(S + dt / 2 * k2[0], R + dt / 2 * k2[1], cm), k4 = f(S + dt * k3[0], R + dt * k3[1], c1);
        if (i % 10 === 0) tr.push({ t: t / 24, C: Math.max(C, 0.05), S, R, im: k1[2] });
        S += dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); R += dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]); C = c1;
        if (S < 1) S = 0; if (R < 1 && S === 0) R = 0; S = Math.max(S, 0); R = Math.max(R, 0);
      }
      return tr;
    }
    const regimens = [
      { dose: 120, tau: 24, name: "120 mg every 24 h", out: "cleared", tr: null },
      { dose: 40, tau: 24, name: "40 mg every 24 h", out: "resistant took over", tr: null },
    ];
    regimens.forEach((g) => (g.tr = simulate(g.dose, g.tau)));
    const MIC_S = P.ec50S * Math.sqrt(P.kg / (P.Emax - P.kg)), MIC_R = P.ec50R * Math.sqrt((P.kg * (1 - P.cost)) / (P.Emax - P.kg * (1 - P.cost)));
    const X0 = 22, X1 = 156, Y0 = 22, Y1 = 46;
    const xs = (d) => X0 + (d / 7) * (X1 - X0), ys = (c) => Y1 - ((Math.log10(c) + 1) / 3) * (Y1 - Y0);
    el("rect", { x: X0, y: ys(MIC_R), width: X1 - X0, height: ys(MIC_S) - ys(MIC_R), fill: wash, class: "fade" }, svg);
    label(svg, X1, ys(MIC_R) - 1.6, "end", "selection window", { "font-size": 5, "fill-opacity": 0.6 });
    el("line", { x1: X0, x2: X1, y1: Y1, y2: Y1, stroke: "currentColor", "stroke-opacity": 0.3, "stroke-width": 0.6, class: "fade" }, svg);
    label(svg, X0 - 2, Y0 + 3, "end", "drug", { "font-size": 5, "fill-opacity": 0.6 });
    const curve = el("path", { d: "", fill: "none", stroke: "currentColor", "stroke-width": 1, "stroke-opacity": 0.85, pathLength: 1, class: "draw" }, svg);
    const head = el("line", { y1: Y0 - 2, y2: Y1, stroke: accent, "stroke-width": 0.8 }, svg);
    const headDot = el("circle", { r: 1.8, fill: accent }, svg);
    // dish
    el("ellipse", { cx: 89, cy: 76, rx: 67, ry: 20, fill: "none", stroke: "currentColor", "stroke-opacity": 0.22, "stroke-width": 0.8, class: "fade" }, svg);
    const r = rng(5), slots = [];
    for (let tries = 0; slots.length < 60 && tries < 20000; tries++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()); const x = 89 + Math.cos(a) * d * 62, y = 76 + Math.sin(a) * d * 16.5; if (!slots.some((s) => Math.hypot(s[0] - x, s[1] - y) < 4.2)) slots.push([x, y]); }
    const bugs = slots.map(([x, y], i) => delay(el("rect", { x: x - 1.9, y: y - 1.1, width: 3.8, height: 2.2, rx: 1.1, fill: s1, opacity: 0, transform: `rotate(${Math.round(r() * 180)} ${x.toFixed(1)} ${y.toFixed(1)})`, class: "bug" }, svg), i * 8));
    const immune = [[40, 70], [120, 84], [100, 64]].map(([x, y]) => ({ x, y, vx: 0, vy: 0, c: el("circle", { cx: x, cy: y, r: 3.6, fill: "none", stroke: accent, "stroke-width": 0.9, "stroke-opacity": 0.5, class: "pop" }, svg) }));
    const tName = label(svg, 6, 9, "start", ""), tDay = label(svg, 156, 9, "end", "day 0.0");
    const tOut = label(svg, 89, 77, "middle", "", { "font-size": 7, "font-weight": 600, stroke: css("--paper"), "stroke-width": 2.6, "paint-order": "stroke" });
    let which = 0, start = 0, last = 0, hold = 0;
    function show(g, k) {
      const tr = g.tr, pt = tr[Math.min(k, tr.length - 1)];
      const nS = pt.S >= 1 ? Math.round(30 * clamp(Math.log10(pt.S) / 9, 0.04, 1)) : 0, nR = pt.R >= 1 ? Math.round(30 * clamp(Math.log10(pt.R) / 9, 0, 1)) : 0;
      bugs.forEach((b, i) => {
        if (i < nS) { b.setAttribute("fill", s1); b.setAttribute("opacity", 0.9); }
        else if (i >= 60 - nR) { b.setAttribute("fill", s2); b.setAttribute("opacity", 0.95); }
        else b.setAttribute("opacity", 0);
      });
      const x = xs(pt.t), y = ys(clamp(pt.C, 0.1, 100));
      head.setAttribute("x1", x); head.setAttribute("x2", x); headDot.setAttribute("cx", x); headDot.setAttribute("cy", y);
      tDay.textContent = "day " + pt.t.toFixed(1);
      const act = clamp(pt.im / P.kimm, 0, 1);
      immune.forEach((m) => { m.c.setAttribute("stroke-opacity", (0.25 + 0.75 * act).toFixed(2)); m.c.setAttribute("stroke-width", (0.7 + 0.9 * act).toFixed(2)); });
      return { nS, nR, act };
    }
    function load(g) {
      tName.textContent = g.name; tOut.textContent = "";
      curve.setAttribute("d", g.tr.map((p, i) => (i ? "L" : "M") + xs(p.t).toFixed(1) + " " + ys(clamp(p.C, 0.1, 100)).toFixed(1)).join(""));
    }
    load(regimens[0]); show(regimens[0], 0);
    function step(now) {
      const dt = last ? Math.min(now - last, 60) : 16; last = now;
      const g = regimens[which];
      if (!start) start = now;
      if (hold) { if (now > hold) { hold = 0; which = 1 - which; load(regimens[which]); start = now; } return; }
      const u = clamp((now - start) / 8000, 0, 1), k = Math.floor(Math.pow(u, 2.2) * (g.tr.length - 1));
      const st = show(g, k);
      // immune cells drift and chase when the infection is small enough for them to win
      immune.forEach((m, i) => {
        const tgt = bugs.find((b) => +b.getAttribute("opacity") > 0);
        let ax = (r() - 0.5) * 0.02, ay = (r() - 0.5) * 0.02;
        if (tgt && st.act > 0.5) { const bx = +tgt.getAttribute("x"), by = +tgt.getAttribute("y"); ax += (bx - m.x) * 0.0006 * st.act; ay += (by - m.y) * 0.0006 * st.act; }
        m.vx = (m.vx + ax * dt) * 0.92; m.vy = (m.vy + ay * dt) * 0.92;
        m.x = clamp(m.x + m.vx, 30, 148); m.y = clamp(m.y + m.vy, 62, 90);
        m.c.setAttribute("cx", m.x.toFixed(1)); m.c.setAttribute("cy", m.y.toFixed(1));
      });
      if (k >= g.tr.length - 1) { tOut.textContent = g.out; tOut.setAttribute("fill", which ? s2 : accent); hold = now + 2000; }
    }
    function still() { load(regimens[1]); show(regimens[1], regimens[1].tr.length - 1); tOut.textContent = regimens[1].out; tOut.setAttribute("fill", s2); }
    return { step, still };
  }

  /* ===================================================================================
     3. Radiotherapy: a gantry circles the patient and fires one beam per fraction.
        Bars track tumor and healthy-tissue BED; both schedules reach the same healthy
        limit, but six large fractions give the tumor more dose. Numbers from the optimizer.
     =================================================================================== */
  function radio(svg, D) {
    const accent = css("--accent"), s1 = css("--s1"), paper = css("--paper");
    const pro = D.sites.find((s) => s.site === "Prostate"), lim = D.ref_bed_n;
    const at = (n) => pro.curve[n - 1];
    const plans = [
      { n: 35, d: at(35).d, bed: at(35).bed, name: "35 fractions", pulse: 120 },
      { n: pro.best.n, d: pro.best.d, bed: pro.best.bed, name: pro.best.n + " fractions", pulse: 700 },
    ];
    const CX = 58, CY = 62;
    el("ellipse", { cx: CX, cy: CY, rx: 33, ry: 25, fill: "currentColor", "fill-opacity": 0.035, stroke: "currentColor", "stroke-opacity": 0.35, "stroke-width": 0.9, class: "fade" }, svg);
    const oar = el("ellipse", { cx: CX, cy: CY + 14, rx: 8, ry: 4.5, fill: s1, "fill-opacity": 0.12, stroke: s1, "stroke-opacity": 0.6, "stroke-width": 0.8, class: "pop" }, svg);
    label(svg, CX + 10, CY + 22, "start", "healthy", { "font-size": 5, "fill-opacity": 0.6 });
    const tumor = el("circle", { cx: CX, cy: CY - 2, r: 9, fill: accent, "fill-opacity": 0.08, stroke: accent, "stroke-width": 1, class: "pop" }, svg);
    label(svg, CX - 11, CY - 12, "end", "tumor", { "font-size": 5, "fill-opacity": 0.6 });
    const r = rng(3), cellsT = [];
    for (let tries = 0; cellsT.length < 14 && tries < 4000; tries++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 6.4; const x = CX + Math.cos(a) * d, y = CY - 2 + Math.sin(a) * d; if (!cellsT.some((c) => Math.hypot(c[0] - x, c[1] - y) < 2.5)) cellsT.push([x, y]); }
    const tdots = cellsT.map(([x, y], i) => delay(el("circle", { cx: x, cy: y, r: 1.1, fill: accent, class: "pop" }, svg), 250 + i * 25));
    const orbit = 38;
    el("circle", { cx: CX, cy: CY - 2, r: orbit, fill: "none", stroke: "currentColor", "stroke-opacity": 0.12, "stroke-dasharray": "1.5 2.5", "stroke-width": 0.7, class: "fade" }, svg);
    const beams = el("g", {}, svg);
    const beam = el("path", { d: "", fill: accent, "fill-opacity": 0 }, beams);
    const gantry = el("rect", { width: 9, height: 4, rx: 1, fill: "currentColor" }, svg);
    // bars
    const BX = [118, 140], BY0 = 88, BH = 66, MAX = 320;
    const bh = (v) => (v / MAX) * BH;
    const bars = BX.map((x, i) => {
      el("rect", { x, y: BY0 - BH, width: 12, height: BH, rx: 1.5, fill: "currentColor", "fill-opacity": 0.05, class: "fade" }, svg);
      const b = el("rect", { x, y: BY0, width: 12, height: 0, rx: 1.5, fill: i ? s1 : accent }, svg);
      label(svg, x + 6, BY0 + 7, "middle", i ? "healthy" : "tumor", { "font-size": 5 });
      return b;
    });
    el("line", { x1: BX[1] - 3, x2: BX[1] + 15, y1: BY0 - bh(lim), y2: BY0 - bh(lim), stroke: "currentColor", "stroke-width": 0.9, "stroke-dasharray": "2 1.5", class: "fade" }, svg);
    label(svg, BX[1] + 15, BY0 - bh(lim) - 2.5, "end", "limit", { "font-size": 5 });
    const valT = label(svg, BX[0] + 6, BY0 - 2, "middle", "", { "font-size": 4.6, fill: paper });
    label(svg, 129, 15, "middle", "BED, Gy", { "font-size": 5, "fill-opacity": 0.6 });
    const tName = label(svg, 6, 9, "start", ""), tFx = label(svg, 6, 17, "start", "");
    let which = 0, start = 0, ang = -0.5, last = 0, hold = 0, fired = 0, flashT = 0;
    function setPlan(p) { tName.textContent = `${p.name} × ${p.d.toFixed(2)} Gy`; fired = 0; tFx.textContent = `fraction 0/${p.n}`; bars.forEach((b) => { b.setAttribute("y", BY0); b.setAttribute("height", 0); }); tdots.forEach((d) => d.setAttribute("opacity", 1)); valT.textContent = ""; }
    function render(p, frac) {
      const tb = p.bed * frac, hb = lim * frac;
      bars[0].setAttribute("y", BY0 - bh(tb)); bars[0].setAttribute("height", bh(tb));
      bars[1].setAttribute("y", BY0 - bh(hb)); bars[1].setAttribute("height", bh(hb));
      valT.setAttribute("y", BY0 - bh(tb) + 6); valT.textContent = tb > 40 ? Math.round(tb) : "";
      const alive = Math.round(14 * Math.exp(-tb / 75));
      tdots.forEach((d, i) => d.setAttribute("opacity", i < alive ? 1 : 0.12));
    }
    setPlan(plans[0]);
    function placeGantry() {
      const gx = CX + Math.cos(ang) * orbit, gy = CY - 2 + Math.sin(ang) * orbit;
      gantry.setAttribute("x", gx - 4.5); gantry.setAttribute("y", gy - 2);
      gantry.setAttribute("transform", `rotate(${(ang * 180) / Math.PI + 90} ${gx.toFixed(1)} ${gy.toFixed(1)})`);
      return [gx, gy];
    }
    placeGantry();
    function step(now) {
      const dt = last ? Math.min(now - last, 60) : 16; last = now;
      ang += dt * 0.0011;
      const [gx, gy] = placeGantry();
      const p = plans[which];
      if (!start) start = now + 400;
      if (hold) { if (now > hold) { hold = 0; which = 1 - which; setPlan(plans[which]); start = now + 500; } beam.setAttribute("fill-opacity", 0); return; }
      const k = Math.floor((now - start) / p.pulse);
      if (k >= 0 && k < p.n && k + 1 > fired) {
        fired = k + 1; flashT = now; tFx.textContent = `fraction ${fired}/${p.n}`; render(p, fired / p.n);
        tumor.animate && tumor.animate([{ fillOpacity: 0.45 }, { fillOpacity: 0.08 }], { duration: Math.min(500, p.pulse), easing: "ease-out" });
      }
      // beam: a wedge from the gantry onto the tumor, width set by the dose per fraction
      const age = (now - flashT) / Math.min(450, p.pulse * 0.9), on = fired && age < 1;
      if (on) {
        const w = 1.2 + p.d * 0.55, dx = CX - gx, dy = CY - 2 - gy, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
        beam.setAttribute("d", `M${gx + nx} ${gy + ny} L${CX + nx * w} ${CY - 2 + ny * w} L${CX - nx * w} ${CY - 2 - ny * w} L${gx - nx} ${gy - ny}Z`);
        beam.setAttribute("fill-opacity", (0.4 * (1 - age)).toFixed(2));
      } else beam.setAttribute("fill-opacity", 0);
      if (fired >= p.n && now - flashT > 600) hold = now + 2200;
    }
    function still() { setPlan(plans[1]); render(plans[1], 1); tFx.textContent = `fraction ${plans[1].n}/${plans[1].n}`; }
    return { step, still };
  }

  /* ---------- mounting and the shared loop ---------- */
  const builders = { virus, antibiotic, radio };
  const live = new Set();
  let raf = 0;
  const tick = (now) => { raf = 0; live.forEach((s) => s.step(now)); if (live.size && !document.hidden) raf = requestAnimationFrame(tick); };
  const kick = () => { if (!raf && live.size) raf = requestAnimationFrame(tick); };
  document.addEventListener("visibilitychange", () => { if (!document.hidden) kick(); });
  window.Scenes = {
    mount(box, kind, data) {
      if (!box || !builders[kind]) return;
      box.classList.add("scene");
      const svg = el("svg", { viewBox: "0 0 160 100", role: "img", "aria-label": box.dataset.aria || "Animated illustration" });
      box.replaceChildren(svg);
      const s = builders[kind](svg, data);
      if (reduce.matches || !("IntersectionObserver" in window)) { s.still && s.still(); return; }
      let started = 0;
      const io = new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting) {
          if (!started) started = performance.now();
          const wait = Math.max(0, 900 - (performance.now() - started));
          setTimeout(() => { live.add(s); kick(); }, box.classList.contains("armed") ? wait + 300 : 200);
        } else live.delete(s);
      }), { threshold: 0.2 });
      io.observe(box);
    },
  };
})();
