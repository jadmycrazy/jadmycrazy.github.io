/* Background: Conway's Game of Life (B3/S23) on a bounded board.
   The field drifts with scroll, the cursor stirs cells to life, a click drops an R-pentomino,
   and a methuselah is seeded every few seconds so the board never settles. */
(function () {
  const cv = document.getElementById("life");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const main = document.querySelector("main");
  const MODE = (main && main.dataset.life) || "article";
  const HOME = MODE === "home";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(pointer: fine)").matches;
  const stat = document.getElementById("lifeStat");
  const statText = stat && stat.querySelector(".txt");

  // ---------- patterns (row strings, "#" = alive) ----------
  const P = {
    glider: [".#.", "..#", "###"],
    lwss: [".#..#", "#....", "#...#", "####."],
    rpent: [".##", "##.", ".#."],
    acorn: [".#.....", "...#...", "##..###"],
    diehard: ["......#.", "##......", ".#...###"],
    gun: [
      "........................#...........",
      "......................#.#...........",
      "............##......##............##",
      "...........#...#....##............##",
      "##........#.....#...##..............",
      "##........#...#.##....#.#...........",
      "..........#.....#.......#...........",
      "...........#...#....................",
      "............##......................",
    ],
  };
  const METH = ["rpent", "acorn", "diehard"];

  let CELL = 14, cols = 0, rows = 0, W = 0, H = 0, dpr = 1;
  let A, B, vis, age; // state, scratch, visual 0..1, generations alive
  let gen = 0, running = true, lastStep = 0, nextEvent = 0, stepMs = HOME ? 110 : 160;
  let sy = scrollY, target = scrollY;
  const mouse = { x: -1e4, y: -1e4, on: false, last: 0 };
  const pings = [];
  let colInk = "17,24,22", colNew = "15,107,87", inkMax = 0.12, newMax = 0.55;
  let rnd = mulberry(20261106);

  function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const g = (v, d) => (cs.getPropertyValue(v).trim() || d);
    colInk = g("--life-ink", colInk); colNew = g("--life-new", colNew);
    const narrow = innerWidth < 760 ? 0.6 : 1;
    inkMax = parseFloat(g("--life-ink-a", "0.12")) * (HOME ? 1 : 0.6) * narrow;
    newMax = parseFloat(g("--life-new-a", "0.5")) * (HOME ? 1 : 0.6) * narrow;
  }

  const idx = (c, r) => r * cols + c;
  function set(c, r, v) { if (c >= 0 && r >= 0 && c < cols && r < rows) { A[idx(c, r)] = v; if (v && !age[idx(c, r)]) age[idx(c, r)] = 0; } }
  function stamp(name, c0, r0, rot) {
    let pat = P[name].map((s) => s.split("").map((ch) => ch === "#"));
    for (let k = 0; k < (rot || 0); k++) pat = pat[0].map((_, i) => pat.map((row) => row[i]).reverse());
    pat.forEach((row, r) => row.forEach((on, c) => { if (on) set(c0 + c, r0 + r, 1); }));
  }
  function soup(cx, cy, rad, dens) {
    for (let r = cy - rad; r <= cy + rad; r++) for (let c = cx - rad; c <= cx + rad; c++) {
      const d = Math.hypot(c - cx, r - cy) / rad;
      if (d < 1 && rnd() < dens * (1 - d * d)) set(c, r, 1);
    }
  }

  function build() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    CELL = W < 600 ? 11 : 14;
    cols = Math.ceil(W / CELL) + 1; rows = Math.ceil((H * 1.6) / CELL);
    const n = cols * rows;
    A = new Uint8Array(n); B = new Uint8Array(n); vis = new Float32Array(n); age = new Uint16Array(n);
    gen = 0; rnd = mulberry(20261106);
    const right = W > 900 ? 0.52 : 0;
    if (HOME) {
      if (cols > 80) stamp("gun", Math.floor(cols * (right ? 0.6 : 0.1)), 4);
      for (let k = 0; k < (W > 900 ? 5 : 3); k++) {
        const cx = Math.floor(cols * (right + (1 - right) * (0.15 + 0.7 * rnd())));
        const cy = Math.floor(rows * (0.2 + 0.6 * rnd()));
        soup(cx, cy, 6 + Math.floor(rnd() * 5), 0.55);
      }
      for (let k = 0; k < 4; k++) stamp("glider", Math.floor(cols * (right + rnd() * (1 - right) * 0.9)), Math.floor(rows * rnd()), Math.floor(rnd() * 4));
    } else {
      for (let k = 0; k < 6; k++) stamp(rnd() < 0.6 ? "glider" : "lwss", Math.floor(cols * rnd()), Math.floor(rows * rnd()), Math.floor(rnd() * 4));
      soup(Math.floor(cols * 0.85), Math.floor(rows * 0.3), 5, 0.5);
    }
    for (let i = 0; i < n; i++) vis[i] = A[i] ? 1 : 0;
    if (reduce.matches) { for (let k = 0; k < 40; k++) step(); for (let i = 0; i < n; i++) vis[i] = A[i]; }
    nextEvent = performance.now() + 3000;
  }

  function step() {
    for (let r = 0; r < rows; r++) {
      const r0 = r > 0 ? (r - 1) * cols : -1, r1 = r * cols, r2 = r < rows - 1 ? (r + 1) * cols : -1;
      for (let c = 0; c < cols; c++) {
        let n = 0;
        const cl = c > 0, cr = c < cols - 1;
        if (r0 >= 0) { n += A[r0 + c]; if (cl) n += A[r0 + c - 1]; if (cr) n += A[r0 + c + 1]; }
        if (cl) n += A[r1 + c - 1]; if (cr) n += A[r1 + c + 1];
        if (r2 >= 0) { n += A[r2 + c]; if (cl) n += A[r2 + c - 1]; if (cr) n += A[r2 + c + 1]; }
        const i = r1 + c, alive = A[i];
        const nx = n === 3 || (alive && n === 2) ? 1 : 0;
        B[i] = nx; age[i] = nx ? (alive ? Math.min(age[i] + 1, 999) : 0) : 0;
      }
    }
    const t = A; A = B; B = t; gen++;
  }

  function population() { let p = 0; for (let i = 0; i < A.length; i++) p += A[i]; return p; }

  function event(now) {
    const right = W > 900 ? 0.5 : 0;
    const c = Math.floor(cols * (right + (1 - right) * (0.1 + 0.8 * rnd())));
    const r = Math.floor(rows * (0.15 + 0.7 * rnd()));
    stamp(METH[Math.floor(rnd() * METH.length)], c, r, Math.floor(rnd() * 4));
    pings.push({ c: c + 1, r: r + 1, t0: now });
    if (population() < cols * rows * 0.01) soup(c + 8, r + 4, 7, 0.5);
  }

  const off = () => (sy * (HOME ? 0.22 : 0.12)) % (rows * CELL);
  function toCell(x, y) {
    let yy = y + off(); yy = ((yy % (rows * CELL)) + rows * CELL) % (rows * CELL);
    return [Math.floor(x / CELL), Math.floor(yy / CELL)];
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    const fieldA = HOME ? 1 - 0.55 * Math.min(sy / (H * 1.2), 1) : 1;
    const o = off(), total = rows * CELL, s = CELL - 2;
    const buckets = 6, ink = Array.from({ length: buckets }, () => []), nw = Array.from({ length: buckets }, () => []);
    const r0 = Math.floor(o / CELL), vr = Math.ceil(H / CELL) + 1;
    for (let k = 0; k < vr; k++) {
      const r = (r0 + k) % rows, y = r * CELL - o + (r < r0 ? total : 0);
      if (y > H) break;
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c, v = vis[i];
        if (v < 0.03) continue;
        const b = Math.min(buckets - 1, Math.floor(v * buckets));
        (A[i] && age[i] < 2 ? nw : ink)[b].push(c * CELL + 1, y + 1);
      }
    }
    const paint = (list, rgb, max) => list.forEach((pts, b) => {
      if (!pts.length) return;
      ctx.fillStyle = `rgba(${rgb},${(((b + 1) / buckets) * max * fieldA).toFixed(3)})`;
      ctx.beginPath(); for (let j = 0; j < pts.length; j += 2) ctx.rect(pts[j], pts[j + 1], s, s); ctx.fill();
    });
    paint(ink, colInk, inkMax); paint(nw, colNew, newMax);
    // cursor reveals the board
    if (mouse.on && fine) {
      const R = 150, g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, R);
      g.addColorStop(0, `rgba(${colInk},${(inkMax * 0.9).toFixed(3)})`); g.addColorStop(1, `rgba(${colInk},0)`);
      ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.beginPath();
      const x0 = Math.floor((mouse.x - R) / CELL) * CELL, oy = ((-o % CELL) + CELL) % CELL;
      for (let x = x0; x <= mouse.x + R; x += CELL) { ctx.moveTo(x + 0.5, mouse.y - R); ctx.lineTo(x + 0.5, mouse.y + R); }
      for (let y = Math.floor((mouse.y - R - oy) / CELL) * CELL + oy; y <= mouse.y + R; y += CELL) { ctx.moveTo(mouse.x - R, y + 0.5); ctx.lineTo(mouse.x + R, y + 0.5); }
      ctx.stroke();
    }
    // pings where a methuselah was seeded
    for (let k = pings.length - 1; k >= 0; k--) {
      const p = pings[k], t = (now - p.t0) / 1400;
      if (t > 1) { pings.splice(k, 1); continue; }
      let y = p.r * CELL - o; if (y < -CELL) y += total;
      ctx.strokeStyle = `rgba(${colNew},${(0.45 * (1 - t) * fieldA).toFixed(3)})`; ctx.lineWidth = 1.5;
      const rad = 6 + 60 * (1 - Math.pow(1 - t, 3));
      ctx.strokeRect(p.c * CELL - rad, y - rad, rad * 2, rad * 2);
    }
  }

  let lastT = performance.now(), raf = 0, lastStat = 0;
  function frame(now) {
    raf = 0;
    const dt = Math.min(now - lastT, 64); lastT = now;
    sy += (target - sy) * Math.min(1, 0.09 * (dt / 16.7));
    if (running && !reduce.matches) {
      if (now - lastStep > stepMs) { step(); lastStep = now; }
      if (now > nextEvent) { event(now); nextEvent = now + (HOME ? 5200 : 9000) + rnd() * 3000; }
      const kIn = 1 - Math.pow(1 - 0.35, dt / 16.7), kOut = 1 - Math.pow(1 - 0.13, dt / 16.7);
      for (let i = 0; i < A.length; i++) { const t = A[i]; vis[i] += (t - vis[i]) * (t > vis[i] ? kIn : kOut); }
    }
    draw(now);
    if (statText && now - lastStat > 250) { lastStat = now; statText.textContent = `B3/S23 · gen ${gen.toLocaleString()} · ${population().toLocaleString()} alive`; }
    if (!document.hidden && (running || mouse.on || Math.abs(target - sy) > 0.5) && !reduce.matches) loop();
  }
  const loop = () => { if (!raf) raf = requestAnimationFrame(frame); };

  build(); readColors(); draw(performance.now()); loop();
  addEventListener("resize", () => { build(); readColors(); loop(); });
  addEventListener("scroll", () => { target = scrollY; if (reduce.matches) { sy = target; draw(performance.now()); } else loop(); }, { passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { lastT = performance.now(); loop(); } });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { readColors(); loop(); });
  new MutationObserver(() => { readColors(); loop(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  reduce.addEventListener("change", () => { build(); draw(performance.now()); loop(); });

  if (fine) {
    addEventListener("pointermove", (e) => {
      mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true;
      const now = performance.now();
      if (running && !reduce.matches && now - mouse.last > 45) {
        mouse.last = now;
        const [c, r] = toCell(e.clientX, e.clientY);
        for (let k = 0; k < 3; k++) set(c + Math.round((rnd() - 0.5) * 3), r + Math.round((rnd() - 0.5) * 3), 1);
      }
      loop();
    }, { passive: true });
    document.addEventListener("pointerleave", () => { mouse.on = false; loop(); });
  }
  addEventListener("click", (e) => {
    if (reduce.matches || !running) return;
    if (e.target.closest("a,button,input,label,select,summary,p,h1,h2,h3,li,figure,table,.chart,code,.eq,.plate,.xp-row,.findings")) return;
    if (String(getSelection())) return;
    const [c, r] = toCell(e.clientX, e.clientY);
    stamp("rpent", c - 1, r - 1, Math.floor(rnd() * 4));
    pings.push({ c, r, t0: performance.now() }); loop();
  });
  if (stat) {
    const btn = stat.querySelector("button");
    const sync = () => { btn.textContent = running && !reduce.matches ? "Pause" : "Play"; btn.setAttribute("aria-pressed", String(!running)); };
    btn.addEventListener("click", () => { if (reduce.matches) return; running = !running; sync(); loop(); });
    if (reduce.matches) { btn.disabled = true; btn.title = "Paused because your system asks for reduced motion"; }
    sync();
  }
})();
