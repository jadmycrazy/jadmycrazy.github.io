/* Draws one simulated kidney-exchange pool as a ring of patient-donor pairs. */
window.drawPool = function (host, pool, mode, opts) {
  opts = opts || {};
  const { el, txt, css, tipEl, tipRows, placeTip } = window.Charts;
  host.replaceChildren();
  const S = opts.size || 560, n = pool.pairs.length, R = S / 2 - (opts.mini ? 18 : 40), cx = S / 2, cy = S / 2;
  const svg = el("svg", { viewBox: `0 0 ${S} ${S}`, role: "img", "aria-label": opts.aria || "Kidney exchange pool" }, host);
  const pos = pool.pairs.map((_, i) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; });
  const accent = css("--accent"), faint = css("--rule"), ink = css("--ink"), paper = css("--paper");
  const defs = el("defs", {}, svg);
  const mk = el("marker", { id: "arw" + (opts.mini ? "m" : ""), viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" }, defs);
  el("path", { d: "M0 0 L10 5 L0 10 z", fill: accent }, mk);
  const gEdges = el("g", { opacity: opts.mini ? 0.55 : 0.7 }, svg);
  pool.edges.forEach(([i, j]) => el("line", { x1: pos[i][0], y1: pos[i][1], x2: pos[j][0], y2: pos[j][1], stroke: faint, "stroke-width": 0.7 }, gEdges));
  const cycles = pool[mode] || [];
  const matched = new Set(); cycles.forEach((c) => c.forEach((v) => matched.add(v)));
  const nodeR = opts.mini ? 5 : 11;
  const gC = el("g", {}, svg);
  cycles.forEach((c) => {
    for (let k = 0; k < c.length; k++) {
      const a = pos[c[k]], b = pos[c[(k + 1) % c.length]];
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
      const ux = dx / L, uy = dy / L;
      const bend = c.length === 2 ? 0.18 : 0.08;
      const mx = (a[0] + b[0]) / 2 - uy * L * bend, my = (a[1] + b[1]) / 2 + ux * L * bend;
      const sx = a[0] + ux * (nodeR + 2), sy = a[1] + uy * (nodeR + 2);
      const ex = b[0] - ux * (nodeR + 3), ey = b[1] - uy * (nodeR + 3);
      el("path", { d: `M${sx} ${sy} Q${mx} ${my} ${ex} ${ey}`, fill: "none", stroke: accent, "stroke-width": opts.mini ? 1.6 : 2.2, "marker-end": opts.mini ? "" : `url(#arw)` }, gC);
    }
  });
  const tip = opts.mini ? null : tipEl(host);
  pool.pairs.forEach((p, i) => {
    const m = matched.has(i);
    const c = el("circle", { cx: pos[i][0], cy: pos[i][1], r: nodeR, fill: m ? accent : paper, stroke: m ? accent : css("--ink-3"), "stroke-width": 1.5 }, svg);
    if (!opts.mini) {
      txt(svg, pos[i][0], pos[i][1] + 3.5, p.p, { "text-anchor": "middle", "font-size": p.p.length > 1 ? 8.5 : 10, "font-weight": 650, fill: m ? paper : ink, "pointer-events": "none" });
      const hit = el("circle", { cx: pos[i][0], cy: pos[i][1], r: 16, fill: "transparent" }, svg);
      hit.addEventListener("pointermove", () => {
        tipRows(tip, "Pair " + (i + 1), [{ value: p.p, name: "patient blood type" }, { value: p.d, name: "donor blood type" }, { value: p.pra, name: "sensitization (PRA)" }, { value: m ? "Matched" : "Not matched", name: "" }]);
        const s = host.clientWidth / S; placeTip(tip, host, pos[i][0] * s, (pos[i][1] - 14) * s);
      });
      hit.addEventListener("pointerleave", () => (tip.hidden = true));
    }
  });
  return { matched: matched.size, cycles: cycles.length };
};
