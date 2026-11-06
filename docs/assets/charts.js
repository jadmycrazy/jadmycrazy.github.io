/* Small SVG chart kit shared by the project pages. Colors come from CSS tokens. */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs || {}) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function txt(parent, x, y, s, attrs) { const t = el("text", Object.assign({ x, y }, attrs || {}), parent); t.textContent = s; return t; }
  function niceTicks(lo, hi, n) {
    const span = hi - lo, step0 = span / Math.max(1, n);
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) || mag * 10;
    const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }
  function tipEl(host) {
    let t = host.querySelector(".tip");
    if (!t) { t = document.createElement("div"); t.className = "tip"; t.hidden = true; host.appendChild(t); }
    return t;
  }
  function tipRows(t, title, rows) {
    t.replaceChildren();
    if (title) { const h = document.createElement("div"); h.textContent = title; h.style.opacity = "0.75"; t.appendChild(h); }
    rows.forEach((r) => {
      const d = document.createElement("div"); d.className = "row";
      if (r.color) { const i = document.createElement("i"); i.style.background = r.color; d.appendChild(i); }
      const b = document.createElement("b"); b.textContent = r.value; d.appendChild(b);
      if (r.name) { const s = document.createElement("span"); s.textContent = " " + r.name; s.style.opacity = "0.8"; d.appendChild(s); }
      t.appendChild(d);
    });
  }
  function placeTip(t, host, px, py) {
    t.hidden = false;
    const w = host.clientWidth, tw = t.offsetWidth;
    const x = Math.min(Math.max(px, tw / 2 + 4), w - tw / 2 - 4);
    t.style.left = x + "px"; t.style.top = py + "px";
  }

  /* Line chart. opts: series[{name, color, pts:[[x,y]], dash}], x:{min,max,ticks,fmt,label}, y:{min,max,log,ticks,fmt,label},
     bands:[{y0,y1,fill,label}], vlines, height, direct (bool), tipX(fmt) */
  function line(host, opts) {
    host.replaceChildren();
    const W = Math.max(320, host.clientWidth || 640), H = opts.height || 300;
    const m = Object.assign({ t: 14, r: opts.direct ? 96 : 16, b: 40, l: 54 }, opts.margin || {});
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": opts.aria || "chart" }, host);
    const X = opts.x, Y = opts.y;
    const ylo = Y.log ? Math.log10(Y.min) : Y.min, yhi = Y.log ? Math.log10(Y.max) : Y.max;
    const sx = (v) => m.l + ((v - X.min) / (X.max - X.min)) * (W - m.l - m.r);
    const sy = (v) => { let u = Y.log ? Math.log10(Math.max(v, Y.min)) : v; u = Math.min(Math.max(u, ylo), yhi); return H - m.b - ((u - ylo) / (yhi - ylo)) * (H - m.t - m.b); };
    (opts.bands || []).forEach((b) => {
      const r = el("rect", { x: m.l, width: W - m.l - m.r, y: sy(b.y1), height: Math.max(0, sy(b.y0) - sy(b.y1)), fill: b.fill }, svg);
      if (b.label) txt(svg, m.l + 8, sy(b.y1) + 14, b.label, { "font-size": 10.5, fill: css("--ink-2") });
    });
    const yt = Y.ticks || niceTicks(Y.min, Y.max, 5);
    yt.forEach((v) => {
      el("line", { x1: m.l, x2: W - m.r, y1: sy(v), y2: sy(v), class: "gridline" }, svg);
      txt(svg, m.l - 8, sy(v) + 4, (Y.fmt || String)(v), { "text-anchor": "end" });
    });
    const xt = X.ticks || niceTicks(X.min, X.max, 6);
    el("line", { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, stroke: css("--ink-3") }, svg);
    xt.forEach((v) => { el("line", { x1: sx(v), x2: sx(v), y1: H - m.b, y2: H - m.b + 4, stroke: css("--ink-3") }, svg); txt(svg, sx(v), H - m.b + 17, (X.fmt || String)(v), { "text-anchor": "middle" }); });
    if (X.label) txt(svg, (m.l + W - m.r) / 2, H - 4, X.label, { "text-anchor": "middle", fill: css("--ink-2") });
    if (Y.label) txt(svg, 12, m.t + 2, Y.label, { fill: css("--ink-2"), "dominant-baseline": "hanging", transform: `rotate(-90 12 ${m.t + 2})`, "text-anchor": "end" });
    (opts.vlines || []).forEach((v) => { el("line", { x1: sx(v.x), x2: sx(v.x), y1: m.t, y2: H - m.b, stroke: v.color || css("--ink-3"), "stroke-dasharray": "3 3" }, svg); if (v.label) txt(svg, sx(v.x) + 5, m.t + 10, v.label, { "font-size": 10.5 }); });
    const lab = [];
    opts.series.forEach((s) => {
      if (!s.pts.length) return;
      const d = s.pts.map((p, i) => (i ? "L" : "M") + sx(p[0]).toFixed(1) + " " + sy(p[1]).toFixed(1)).join("");
      el("path", { d, fill: "none", stroke: s.color, "stroke-width": s.width || 2, "stroke-linejoin": "round", "stroke-linecap": "round", "stroke-dasharray": s.dash || "" }, svg);
      (s.dots || []).forEach((p) => el("circle", { cx: sx(p[0]), cy: sy(p[1]), r: 5, fill: s.color, stroke: css("--paper"), "stroke-width": 2 }, svg));
      if (opts.direct && s.name) { const p = s.pts[s.pts.length - 1]; lab.push({ y: sy(p[1]), x: sx(p[0]), s }); }
    });
    lab.sort((a, b) => a.y - b.y);
    for (let i = 1; i < lab.length; i++) if (lab[i].y - lab[i - 1].y < 14) lab[i].y = lab[i - 1].y + 14;
    lab.forEach((l) => txt(svg, l.x + 8, l.y + 4, l.s.name, { class: "direct" }));
    // hover
    const cross = el("line", { y1: m.t, y2: H - m.b, stroke: css("--ink-3"), "stroke-width": 1, visibility: "hidden" }, svg);
    const dots = opts.series.map((s) => el("circle", { r: 4.5, fill: s.color, stroke: css("--paper"), "stroke-width": 2, visibility: "hidden" }, svg));
    const hit = el("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: "transparent", tabindex: 0 }, svg);
    const tip = tipEl(host);
    function show(xv) {
      const rows = [];
      opts.series.forEach((s, k) => {
        if (s.noTip || !s.pts.length) { dots[k].setAttribute("visibility", "hidden"); return; }
        let best = s.pts[0]; for (const p of s.pts) if (Math.abs(p[0] - xv) < Math.abs(best[0] - xv)) best = p;
        dots[k].setAttribute("cx", sx(best[0])); dots[k].setAttribute("cy", sy(best[1])); dots[k].setAttribute("visibility", "visible");
        rows.push({ color: s.color, value: (s.fmt || Y.fmt || String)(best[1]), name: s.name || "" });
      });
      cross.setAttribute("x1", sx(xv)); cross.setAttribute("x2", sx(xv)); cross.setAttribute("visibility", "visible");
      tipRows(tip, (opts.tipX || X.fmt || String)(xv), rows);
      const scale = host.clientWidth / W; placeTip(tip, host, sx(xv) * scale, m.t * scale + 4);
    }
    function hide() { tip.hidden = true; cross.setAttribute("visibility", "hidden"); dots.forEach((d) => d.setAttribute("visibility", "hidden")); }
    hit.addEventListener("pointermove", (e) => { const r = svg.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; show(X.min + ((px - m.l) / (W - m.l - m.r)) * (X.max - X.min)); });
    hit.addEventListener("pointerleave", hide); hit.addEventListener("blur", hide);
    hit.addEventListener("focus", () => show((X.min + X.max) / 2));
    return { svg, sx, sy };
  }

  /* Cell grid. opts: rows, cols, rowLabels, colLabels(fn index->label|null), cell(r,c)->{fill, tip:[title, rows]}, height, xLabel, yLabel, mark(r,c) */
  function grid(host, opts) {
    host.replaceChildren();
    const W = Math.max(320, host.clientWidth || 640), H = opts.height || 260;
    const m = Object.assign({ t: 8, r: 8, b: 40, l: 64 }, opts.margin || {});
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": opts.aria || "grid" }, host);
    const cw = (W - m.l - m.r) / opts.cols, ch = (H - m.t - m.b) / opts.rows, gap = opts.gap ?? (cw > 6 ? 1 : 0.5);
    const tip = tipEl(host);
    for (let r = 0; r < opts.rows; r++) {
      txt(svg, m.l - 8, m.t + r * ch + ch / 2 + 4, opts.rowLabels[r], { "text-anchor": "end" });
      for (let c = 0; c < opts.cols; c++) {
        const info = opts.cell(r, c);
        const rect = el("rect", { x: m.l + c * cw + gap / 2, y: m.t + r * ch + gap / 2, width: Math.max(0.5, cw - gap), height: Math.max(0.5, ch - gap), fill: info.fill, rx: Math.min(2, cw / 4) }, svg);
        if (info.mark) el("circle", { cx: m.l + c * cw + cw / 2, cy: m.t + r * ch + ch / 2, r: Math.min(cw, ch) / 2.6 + 2, fill: "none", stroke: css("--ink"), "stroke-width": 2 }, svg);
        rect.addEventListener("pointermove", () => { tipRows(tip, info.tip[0], info.tip[1]); const s = host.clientWidth / W; placeTip(tip, host, (m.l + c * cw + cw / 2) * s, (m.t + r * ch) * s); rect.setAttribute("stroke", css("--ink")); });
        rect.addEventListener("pointerleave", () => { tip.hidden = true; rect.removeAttribute("stroke"); });
      }
    }
    for (let c = 0; c < opts.cols; c++) { const l = opts.colLabels(c); if (l != null) txt(svg, m.l + c * cw + cw / 2, H - m.b + 16, l, { "text-anchor": "middle" }); }
    if (opts.xLabel) txt(svg, (m.l + W - m.r) / 2, H - 4, opts.xLabel, { "text-anchor": "middle", fill: css("--ink-2") });
    if (opts.yLabel) txt(svg, 10, m.t, opts.yLabel, { fill: css("--ink-2"), "dominant-baseline": "hanging", transform: `rotate(-90 10 ${m.t})`, "text-anchor": "end" });
    return svg;
  }

  /* Horizontal bars. opts: items[{label, value, color, note}], max, fmt */
  function hbars(host, opts) {
    host.replaceChildren();
    const W = Math.max(320, host.clientWidth || 640), rowH = 34, H = opts.items.length * rowH + 30;
    const m = { l: opts.left || 120, r: 64, t: 4 };
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": opts.aria || "bars" }, host);
    const sx = (v) => m.l + (v / opts.max) * (W - m.l - m.r);
    const tip = tipEl(host);
    (opts.ticks || []).forEach((v) => { el("line", { x1: sx(v), x2: sx(v), y1: m.t, y2: H - 24, class: "gridline" }, svg); txt(svg, sx(v), H - 8, opts.fmt(v), { "text-anchor": "middle" }); });
    opts.items.forEach((it, i) => {
      const y = m.t + i * rowH + 6;
      txt(svg, m.l - 10, y + 15, it.label, { "text-anchor": "end", fill: css("--ink-2"), "font-size": 12 });
      const w = Math.max(2, sx(it.value) - m.l);
      const r = el("rect", { x: m.l, y, width: w, height: 20, rx: 3, fill: it.color }, svg);
      txt(svg, m.l + w + 8, y + 15, opts.fmt(it.value), { fill: css("--ink"), "font-weight": 650, "font-size": 12 });
      const hit = el("rect", { x: 0, y: y - 6, width: W, height: rowH, fill: "transparent" }, svg);
      hit.addEventListener("pointermove", () => { tipRows(tip, it.label, [{ color: it.color, value: opts.fmt(it.value), name: it.note || "" }]); const s = host.clientWidth / W; placeTip(tip, host, (m.l + w / 2) * s, y * s); });
      hit.addEventListener("pointerleave", () => (tip.hidden = true));
    });
    return svg;
  }

  function onResize(fn) { let w = 0; const ro = new ResizeObserver((e) => { const nw = Math.round(e[0].contentRect.width); if (nw !== w) { w = nw; fn(); } }); return ro; }
  function rerenderOnTheme(fn) {
    const mq = matchMedia("(prefers-color-scheme: dark)"); mq.addEventListener("change", fn);
    new MutationObserver(fn).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }
  window.Charts = { line, grid, hbars, css, el, txt, niceTicks, tipEl, tipRows, placeTip, onResize, rerenderOnTheme };
})();
