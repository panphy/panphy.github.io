/* Graph paper for the Prep sheets (after the Year 9 Lesson 5 worksheet's helper).
   PrepGraph(o) returns a boxed SVG graph with printed axes:
     xmax, ymax, xstep, ystep, xlabel, ylabel, h (height in viewBox units, width 100), sub (minor lines per step), alt
     pts      plotted crosses              given      a smooth curve printed on the sheet (points it passes through)
     xmin/ymin lowest axis values (default 0)
   Drawn only in the answer edition:
     line     [[x1, y1], [x2, y2]]         curve      points for a smooth model curve
     ansPts   crosses the student plots
     rings    [[x, y], …] circled points   guides     [[x, y], …] dashed read-off lines to each axis */
(function () {
  "use strict";

  function smoothPath(p) {
    let d = `M${p[0][0].toFixed(2)},${p[0][1].toFixed(2)}`;
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
      d += `C${(b[0] + (c[0] - a[0]) / 6).toFixed(2)},${(b[1] + (c[1] - a[1]) / 6).toFixed(2)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(2)},${(c[1] - (e[1] - b[1]) / 6).toFixed(2)} ${c[0].toFixed(2)},${c[1].toFixed(2)}`;
    }
    return d;
  }

  window.PrepGraph = function (o) {
    const W = 100, H = o.h || 70, x0 = o.xmin || 0, y0 = o.ymin || 0;
    const ml = 14, mb = 12, mt = 3, mr = 4, pw = W - ml - mr, ph = H - mt - mb;
    const X = (x) => ml + ((x - x0) / (o.xmax - x0)) * pw, Y = (y) => mt + ph - ((y - y0) / (o.ymax - y0)) * ph;
    const sub = o.sub || 5, num = (v) => +v.toFixed(6);
    let g = "";
    for (let v = x0, i = 0; v <= o.xmax + 1e-9; v += o.xstep / sub, i++) g += `<line x1="${X(v)}" y1="${mt}" x2="${X(v)}" y2="${mt + ph}" class="${i % sub ? "min" : "maj"}"/>`;
    for (let v = y0, i = 0; v <= o.ymax + 1e-9; v += o.ystep / sub, i++) g += `<line x1="${ml}" y1="${Y(v)}" x2="${ml + pw}" y2="${Y(v)}" class="${i % sub ? "min" : "maj"}"/>`;
    g += `<path d="M${ml},${mt}V${mt + ph}H${ml + pw}" class="axis"/>`;
    for (let v = x0; v <= o.xmax + 1e-9; v += o.xstep) g += `<text x="${X(v)}" y="${mt + ph + 4.4}" text-anchor="middle">${num(v)}</text>`;
    for (let v = y0; v <= o.ymax + 1e-9; v += o.ystep) g += `<text x="${ml - 1.5}" y="${Y(v) + 1.1}" text-anchor="end">${num(v)}</text>`;
    g += `<text x="${ml + pw / 2}" y="${H - 1.3}" text-anchor="middle" class="ttl">${o.xlabel}</text>`;
    g += `<text transform="translate(3.4 ${mt + ph / 2}) rotate(-90)" text-anchor="middle" class="ttl">${o.ylabel}</text>`;
    const map = (a) => a.map((p) => [X(p[0]), Y(p[1])]);
    if (o.given) g += `<path d="${smoothPath(map(o.given))}" class="crv"/>`;
    if (o.curve) g += `<path d="${smoothPath(map(o.curve))}" class="ans"/>`;
    if (o.line) g += `<line x1="${X(o.line[0][0])}" y1="${Y(o.line[0][1])}" x2="${X(o.line[1][0])}" y2="${Y(o.line[1][1])}" class="ans"/>`;
    (o.guides || []).forEach(([x, y]) => { g += `<path d="M${X(x)},${Y(y0)}V${Y(y)}H${X(x0)}" class="guide"/>`; });
    (o.pts || []).forEach(([x, y]) => { g += `<path d="M${X(x) - 1.3},${Y(y) - 1.3}l2.6,2.6m0,-2.6l-2.6,2.6" class="pt"/>`; });
    (o.ansPts || []).forEach(([x, y]) => { g += `<path d="M${X(x) - 1.3},${Y(y) - 1.3}l2.6,2.6m0,-2.6l-2.6,2.6" class="ans"/>`; });
    (o.rings || []).forEach(([x, y]) => { g += `<circle cx="${X(x)}" cy="${Y(y)}" r="3.2" class="ring"/>`; });
    return `<div class="pg-graph"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.alt || "Graph"}">${g}</svg></div>`;
  };

  /* PrepTable(head, rows): a small data table; cells may hold [[answer]] blanks. */
  window.PrepTable = (head, rows) => `<table class="tbl"><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</table>`;
})();
