/* Shared data and the SVG graph-paper helper for the Lesson 5 worksheet and its answers.
   graph(o) returns a boxed graph with printed axes and plotted points; pass line, curve or marks
   (used only by the answers) to add a model best-fit line, curve or circles. */
(function () {
  "use strict";

  const DATA = {
    spring: [[100, 2.3], [200, 3.8], [300, 6.3], [400, 7.8], [500, 10.4], [600, 11.7], [700, 14.3], [800, 15.8]],
    cooling: [[0, 90], [2, 75], [4, 58], [6, 53], [8, 42], [10, 41], [12, 34], [14, 33]],
    trend: [[1, 2.3], [2, 3.4], [3, 6.1], [4, 7.2], [5, 10.3], [6, 11.2], [7, 14.1], [8, 14.9]],
    ramp: [[4, 16], [8, 29], [12, 47], [16, 60], [20, 52], [24, 92], [28, 105], [32, 123]],
    water: [[20, 72], [40, 88], [60, 111], [80, 129], [100, 152], [120, 168]],
  };

  /* Least-squares line y = m x + c through pts. */
  function fit(pts) {
    const n = pts.length;
    const sx = pts.reduce((s, p) => s + p[0], 0), sy = pts.reduce((s, p) => s + p[1], 0);
    const sxx = pts.reduce((s, p) => s + p[0] * p[0], 0), sxy = pts.reduce((s, p) => s + p[0] * p[1], 0);
    const m = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    return { m, c: (sy - m * sx) / n };
  }

  /* Cubic-Bezier path through points (Catmull-Rom), in graph coordinates already mapped to pixels. */
  function smoothPath(p) {
    let d = `M${p[0][0].toFixed(2)},${p[0][1].toFixed(2)}`;
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
      d += `C${(b[0] + (c[0] - a[0]) / 6).toFixed(2)},${(b[1] + (c[1] - a[1]) / 6).toFixed(2)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(2)},${(c[1] - (e[1] - b[1]) / 6).toFixed(2)} ${c[0].toFixed(2)},${c[1].toFixed(2)}`;
    }
    return d;
  }

  function graph(o) {
    const W = 100, H = o.h || 84, mini = !!o.mini;
    const ml = mini ? 3 : 15, mb = mini ? 3 : 13, mt = 3, mr = mini ? 3 : 4;
    const pw = W - ml - mr, ph = H - mt - mb;
    const X = (x) => ml + (x / o.xmax) * pw, Y = (y) => mt + ph - (y / o.ymax) * ph;
    const sub = o.sub || 5;
    let g = "";
    /* vertical grid lines then horizontal */
    for (let v = 0, i = 0; v <= o.xmax + 1e-9; v += o.xstep / sub, i++) g += `<line x1="${X(v)}" y1="${mt}" x2="${X(v)}" y2="${mt + ph}" class="${i % sub === 0 ? "maj" : "min"}"/>`;
    for (let v = 0, i = 0; v <= o.ymax + 1e-9; v += o.ystep / sub, i++) g += `<line x1="${ml}" y1="${Y(v)}" x2="${ml + pw}" y2="${Y(v)}" class="${i % sub === 0 ? "maj" : "min"}"/>`;
    g += `<path d="M${ml},${mt}V${mt + ph}H${ml + pw}" class="axis"/>`;
    if (!mini) {
      for (let v = 0; v <= o.xmax + 1e-9; v += o.xstep) g += `<text x="${X(v)}" y="${mt + ph + 4.6}" text-anchor="middle">${+v.toFixed(6)}</text>`;
      for (let v = 0; v <= o.ymax + 1e-9; v += o.ystep) g += `<text x="${ml - 1.6}" y="${Y(v) + 1.1}" text-anchor="end">${+v.toFixed(6)}</text>`;
      g += `<text x="${ml + pw / 2}" y="${H - 1.4}" text-anchor="middle" class="ttl">${o.xlabel}</text>`;
      g += `<text transform="translate(3.6 ${mt + ph / 2}) rotate(-90)" text-anchor="middle" class="ttl">${o.ylabel}</text>`;
    }
    const mapped = (a) => a.map((p) => [X(p[0]), Y(p[1])]);
    if (o.dots) g += `<polyline points="${mapped(o.dots).map((p) => p.join(",")).join(" ")}" class="ans thin"/>`;
    if (o.wobble) g += `<path d="${smoothPath(mapped(o.wobble))}" class="ans thick"/>`;
    if (o.curve) g += `<path d="${smoothPath(mapped(o.curve))}" class="ans"/>`;
    if (o.line) g += `<line x1="${X(o.line[0][0])}" y1="${Y(o.line[0][1])}" x2="${X(o.line[1][0])}" y2="${Y(o.line[1][1])}" class="ans"/>`;
    const s = mini ? 1.5 : 1.35;
    (o.pts || []).forEach((p) => { g += `<path d="M${X(p[0]) - s},${Y(p[1]) - s}l${2 * s},${2 * s}m0,${-2 * s}l${-2 * s},${2 * s}" class="pt"/>`; });
    (o.marks || []).forEach((m) => {
      if (m.circle) g += `<circle cx="${X(m.circle[0])}" cy="${Y(m.circle[1])}" r="3.4" class="ring"/>`;
      if (m.dot) g += `<circle cx="${X(m.dot[0])}" cy="${Y(m.dot[1])}" r="1.1" class="ans-dot"/>`;
      if (m.text) g += `<text x="${X(m.text[0])}" y="${Y(m.text[1])}" class="note-t">${m.text[2]}</text>`;
    });
    return `<div class="ws-graph"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.alt || "Graph paper with plotted points"}">${g}</svg></div>`;
  }

  window.WSG = { DATA, fit, graph };
})();
