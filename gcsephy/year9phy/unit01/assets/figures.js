/* Line drawings for the Work Like a Physicist workbook (workbook.js), in the style of the Year 9
   Energy workbook and styled by figures.css. Data match the teaching deck
   (gcsephy/decks/work-like-a-physicist). Full-width drawings are about 600 units wide and
   half-width ones about 340, so their 13-unit labels print at a readable size. */
(function () {
  "use strict";

  const r1 = (n) => Math.round(n * 10) / 10;
  const svg = (w, h, label, inner) =>
    `<svg class="ef" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">${inner}</svg>`;
  const t = (x, y, s, o = {}) =>
    `<text x="${r1(x)}" y="${r1(y)}" text-anchor="${o.a || "middle"}"${o.c ? ` class="${o.c}"` : ""}${o.r ? ` transform="rotate(${o.r} ${r1(x)} ${r1(y)})"` : ""}>${s}</text>`;
  const line = (x1, y1, x2, y2, cls = "ink") => `<path class="${cls}" d="M${r1(x1)} ${r1(y1)}L${r1(x2)} ${r1(y2)}"/>`;
  const cross = (x, y, s = 5, cls = "ink") => `<path class="${cls}" d="M${r1(x - s)} ${r1(y - s)}L${r1(x + s)} ${r1(y + s)}M${r1(x - s)} ${r1(y + s)}L${r1(x + s)} ${r1(y - s)}"/>`;
  const tickMark = (x, y) => `<path class="ink bold s-leaf" d="M${x - 8} ${y}l6 6 11-13"/>`;
  const noMark = (x, y) => `<path class="ink bold s-hot" d="M${x - 7} ${y - 7}l14 14M${x + 7} ${y - 7}l-14 14"/>`;
  function arrow(x1, y1, x2, y2, cls = "", head = 9) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    const bx = x2 - head * Math.cos(a), by = y2 - head * Math.sin(a);
    const px = (head * 0.5) * Math.sin(a), py = (head * 0.5) * Math.cos(a);
    return `<path class="ink ${cls}" d="M${r1(x1)} ${r1(y1)}L${r1(bx)} ${r1(by)}"/>` +
      `<path class="solid" d="M${r1(x2)} ${r1(y2)}L${r1(bx + px)} ${r1(by - py)}L${r1(bx - px)} ${r1(by + py)}Z"/>`;
  }
  function dim(x1, y1, x2, y2, label, side = 1) { // a double-headed dimension line
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const vertical = Math.abs(x2 - x1) < Math.abs(y2 - y1);
    return arrow(mx, my, x1, y1, "thin", 7) + arrow(mx, my, x2, y2, "thin", 7) +
      t(vertical ? x1 + side * 8 : mx, vertical ? my + 4 : y1 - 7, label, { a: vertical ? (side > 0 ? "start" : "end") : "middle" });
  }

  // Axes with a light grid. xr/yr: [min, max, gridStep]; every: label every n grid lines.
  function axes({ x0, y0, w, h, xr, yr, xLabel, yLabel, xEvery = 1, yEvery = 1, fmtX = String, fmtY = String, grid = true, ticks = true }) {
    const X = (v) => x0 + (v - xr[0]) / (xr[1] - xr[0]) * w;
    const Y = (v) => y0 + h - (v - yr[0]) / (yr[1] - yr[0]) * h;
    let s = "";
    const nx = Math.round((xr[1] - xr[0]) / xr[2]), ny = Math.round((yr[1] - yr[0]) / yr[2]);
    if (grid) {
      for (let i = 1; i <= nx; i += 1) s += line(X(xr[0] + i * xr[2]), y0, X(xr[0] + i * xr[2]), y0 + h, "grid");
      for (let j = 1; j <= ny; j += 1) s += line(x0, Y(yr[0] + j * yr[2]), x0 + w, Y(yr[0] + j * yr[2]), "grid");
    }
    s += line(x0, y0 + h, x0 + w, y0 + h) + line(x0, y0, x0, y0 + h);
    if (ticks) {
      for (let i = 0; i <= nx; i += xEvery) s += t(X(xr[0] + i * xr[2]), y0 + h + 16, fmtX(+(xr[0] + i * xr[2]).toFixed(3)), { c: "sm" });
      for (let j = 0; j <= ny; j += yEvery) s += t(x0 - 6, Y(yr[0] + j * yr[2]) + 4, fmtY(+(yr[0] + j * yr[2]).toFixed(3)), { c: "sm", a: "end" });
    }
    s += t(x0 + w / 2, y0 + h + 34, xLabel) + t(x0 - 38, y0 + h / 2, yLabel, { r: -90 });
    return { s, X, Y };
  }

  // Ramp data from the deck: mean distance against ramp height, with the anomalous 96 cm at 20 cm.
  const RAMP = [[5, 20], [10, 37], [15, 52], [20, 66], [25, 80]];
  const RAMP_CURVE = [[2, 9], [5, 20], [10, 37], [15, 52], [20, 66], [25, 80], [27, 85]];
  const smooth = (pts, X, Y) => `M${pts.map(([a, b]) => `${r1(X(a))} ${r1(Y(b))}`).join("L")}`;

  const FIG = {
    // White on the navy cover: a scatter of crosses, a best-fit line and one ringed odd point.
    coverArt() {
      const pts = [[40, 168], [110, 140], [180, 120], [250, 92], [320, 30], [390, 52], [460, 30]];
      let s = line(20, 190, 580, 190, "ink bold") + line(20, 190, 20, 10, "ink bold");
      s += `<path class="ink bold" style="stroke:var(--ef-sun)" d="M30 176 L560 8"/>`;
      s += pts.map(([x, y]) => cross(x, y, 8, "ink bold")).join("");
      s += `<circle cx="320" cy="30" r="20" class="ink bold" style="stroke:var(--ef-hot)"/>`;
      s += t(300, 22, "why did that happen?", { a: "end", c: "lg" }).replace("<text", '<text style="fill:var(--ef-hot)"');
      return svg(600, 200, "A graph of crosses with a best-fit line, and one point ringed as a possible anomalous result", s);
    },

    // Precision and accuracy on four targets.
    targets() {
      const sets = [
        [[-4, -3], [4, 4], [6, -3], [-3, 6]],
        [[25, -27], [32, -22], [27, -18], [33, -29]],
        [[-30, -20], [28, -26], [-20, 32], [26, 22]],
        [[-46, 4], [-8, 36], [-34, 42], [-14, -2]],
      ];
      const names = [["Precise and", "accurate"], ["Precise, but", "not accurate"], ["Accurate on average,", "not precise"], ["Neither precise", "nor accurate"]];
      let s = "";
      sets.forEach((hits, i) => {
        const cx = 80 + i * 160, cy = 72;
        s += `<circle cx="${cx}" cy="${cy}" r="58" class="ink paper"/><circle cx="${cx}" cy="${cy}" r="39" class="ink thin soft"/><circle cx="${cx}" cy="${cy}" r="20" class="ink thin sun-t"/><circle cx="${cx}" cy="${cy}" r="3" class="solid"/>`;
        s += hits.map(([dx, dy]) => `<circle cx="${cx + dx}" cy="${cy + dy}" r="5.5" class="cool"/>`).join("");
        s += t(cx, 152, names[i][0]) + t(cx, 168, names[i][1]);
      });
      s += t(320, 196, "Centre = the true value. Blue dots = repeat readings.", { c: "sm muted" });
      return svg(640, 204, "Four targets: precise and accurate; precise but not accurate; accurate on average but not precise; neither", s);
    },

    // Random error spreads readings both ways; systematic error shifts them all one way.
    errors() {
      let s = "";
      const panel = (x0, title, xs, lines2) => {
        let o = `<rect x="${x0}" y="4" width="300" height="160" rx="6" class="ink thin paper"/>` + t(x0 + 150, 26, title, { c: "lg" });
        o += line(x0 + 20, 92, x0 + 280, 92) + line(x0 + 150, 44, x0 + 150, 108, "ink thin dash") + t(x0 + 150, 40, "true value", { c: "sm" });
        o += xs.map((x) => cross(x0 + x, 78, 6, "ink s-cool")).join("");
        o += lines2.map((l, i) => t(x0 + 150, 128 + i * 16, l, { c: "sm" })).join("");
        return o;
      };
      s += panel(4, "Random error", [92, 118, 141, 163, 184, 214], ["readings spread out both ways", "fix: repeat and take a mean"]);
      s += panel(332, "Systematic error", [196, 207, 214, 221, 231], ["every reading shifted the same way", "fix: find the cause; repeats do not help"]);
      s += arrow(332 + 152, 62, 332 + 196, 62, "thin s-hot", 7);
      return svg(636, 168, "Random error scatters readings on both sides of the true value; systematic error moves them all to one side", s);
    },

    // Uncertainty from three readings: half of largest minus smallest.
    uncertainty() {
      const X = (v) => 40 + (v - 1.18) / 0.09 * 520;
      let s = line(X(1.18), 100, X(1.27), 100);
      for (let i = 0; i <= 9; i += 1) { const v = 1.18 + i / 100; s += line(X(v), 95, X(v), 105, "ink thin") + t(X(v), 122, v.toFixed(2), { c: "sm" }); }
      s += t(X(1.27) + 2, 140, "time / s", { c: "sm", a: "end" });
      [1.20, 1.21, 1.25].forEach((v) => { s += cross(X(v), 84, 6, "ink s-cool"); });
      s += t(X(1.20), 70, "1.20", { c: "sm" }) + t(X(1.21) + 4, 70, "1.21", { c: "sm" }) + t(X(1.25), 70, "1.25", { c: "sm" });
      s += dim(X(1.20), 38, X(1.25), 38, "largest − smallest = 1.25 − 1.20 = 0.05 s");
      s += `<path class="ink s-hot" d="M${X(1.22)} 76V100"/><path class="hot" d="M${X(1.22)} 100l-6 -10h12z"/>` + t(X(1.22), 146, "mean 1.22 s", { c: "lg" });
      s += arrow(X(1.22), 160, X(1.19), 160, "thin", 7) + arrow(X(1.22), 160, X(1.25), 160, "thin", 7);
      s += t(X(1.22), 180, "± 0.03 s: from 1.19 s to 1.25 s", { c: "sm" });
      return svg(600, 186, "Three readings 1.20, 1.21 and 1.25 s on a scale; largest minus smallest is 0.05 s; mean 1.22 s plus or minus 0.03 s", s);
    },

    // Two rulers measuring the same pencil: resolution 1 cm and 1 mm.
    rulers() {
      const X = (cm) => 22 + cm * 50;
      const ruler = (y, mm) => {
        let o = `<rect x="${X(0) - 8}" y="${y}" width="${6 * 50 + 16}" height="34" class="ink sun-t"/>`;
        for (let i = 0; i <= (mm ? 60 : 6); i += 1) {
          const cm = mm ? i / 10 : i, major = !mm || i % 10 === 0, half = mm && i % 5 === 0;
          o += line(X(cm), y, X(cm), y + (major ? 14 : half ? 10 : 6), "ink thin");
          if (major) o += t(X(cm), y + 28, mm ? i / 10 : i, { c: "sm" });
        }
        return o;
      };
      const pencil = (y) => `<path class="ink paper" d="M${X(0)} ${y}h${4.7 * 50 - 14}l14 6l-14 6H${X(0)}z"/>`;
      let s = t(4, 16, "A: marked every 1 cm", { a: "start" }) + pencil(24) + ruler(38, false) + t(4, 92, "Reading: about 5 cm", { a: "start", c: "sm" });
      s += t(4, 118, "B: marked every 1 mm", { a: "start" }) + pencil(126) + ruler(140, true) + t(4, 194, "Reading: 4.7 cm", { a: "start", c: "sm" });
      s += t(338, 92, "resolution 1 cm", { a: "end", c: "sm muted" }) + t(338, 194, "resolution 1 mm", { a: "end", c: "sm muted" });
      return svg(340, 200, "The same pencil measured with a ruler marked in centimetres (about 5 cm) and one marked in millimetres (4.7 cm)", s);
    },

    // Change one thing, measure one thing, keep the rest the same.
    variables() {
      const card = (x, y, w, h, head, body, cls) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" class="ink ${cls}"/>` + t(x + w / 2, y + 22, head, { c: "lg" }) + body.map((b, i) => t(x + w / 2, y + 42 + i * 16, b, { c: i ? "sm" : "" })).join("");
      let s = card(4, 6, 190, 82, "CHANGE", ["independent variable", "e.g. ramp height"], "sun-t");
      s += arrow(196, 47, 246, 47) + `<rect x="248" y="20" width="104" height="54" rx="6" class="ink soft"/>` + t(300, 44, "the") + t(300, 60, "experiment");
      s += arrow(354, 47, 404, 47) + card(406, 6, 190, 82, "MEASURE", ["dependent variable", "e.g. distance travelled"], "cool-t");
      s += card(4, 108, 592, 70, "KEEP THE SAME", ["control variables", "e.g. same trolley, same start line, same floor, released with no push"], "leaf-t");
      s += `<path class="ink" d="M40 128v-7a9 9 0 0 1 18 0v7"/><rect x="34" y="128" width="30" height="22" rx="3" class="ink paper"/>`;
      return svg(600, 182, "Change the independent variable, measure the dependent variable, keep the control variables the same", s);
    },

    // Continuous data has values in between; categoric data does not.
    dataTypes() {
      let s = `<rect x="4" y="4" width="300" height="138" rx="6" class="ink thin paper"/>` + t(154, 26, "Continuous", { c: "lg" });
      const X = (v) => 30 + v * 12.5;
      s += line(X(0), 80, X(20), 80);
      for (let v = 0; v <= 20; v += 1) s += line(X(v), 80, X(v), v % 5 ? 74 : 70, "ink thin");
      [0, 5, 10, 15, 20].forEach((v) => { s += t(X(v), 98, v, { c: "sm" }); });
      s += t(X(20) + 4, 116, "length / cm", { c: "sm", a: "end" });
      s += arrow(X(7.3), 46, X(7.3), 70, "s-cool", 7) + t(X(7.3), 42, "7.3 means something", { c: "sm" });
      s += t(154, 134, "any value on a scale → line graph", { c: "sm" });
      s += `<rect x="320" y="4" width="300" height="138" rx="6" class="ink thin paper"/>` + t(470, 26, "Categoric", { c: "lg" });
      ["sponge", "cardboard", "cloth"].forEach((m, i) => { s += `<rect x="${336 + i * 94}" y="56" width="82" height="34" rx="5" class="ink sun-t"/>` + t(377 + i * 94, 78, m, { c: "sm" }); });
      s += t(470, 116, "nothing halfway between sponge and cardboard", { c: "sm" }) + t(470, 134, "names or groups → bar chart", { c: "sm" });
      return svg(624, 146, "Continuous data takes any value on a scale; categoric data is names or groups with nothing in between", s);
    },

    // Bar chart for categoric, line graph for continuous.
    graphChoice() {
      let s = `<rect x="4" y="4" width="290" height="196" rx="6" class="ink thin paper"/>` + t(149, 26, "Categoric → bar chart", { c: "lg" });
      s += line(40, 164, 270, 164) + line(40, 44, 40, 164);
      [[70, 60], [118, 96], [166, 40], [214, 78]].forEach(([x, h], i) => { s += `<rect x="${x - 16}" y="${164 - h}" width="32" height="${h}" class="ink sun-t"/>` + t(x, 182, "ABCD"[i], { c: "sm" }); });
      s += t(149, 197, "separate bars with gaps", { c: "sm muted" });
      s += `<rect x="310" y="4" width="290" height="196" rx="6" class="ink thin paper"/>` + t(455, 26, "Continuous → line graph", { c: "lg" });
      s += line(346, 164, 576, 164) + line(346, 44, 346, 164);
      [[370, 146], [410, 128], [450, 104], [490, 94], [530, 70], [560, 58]].forEach(([x, y]) => { s += cross(x, y, 5); });
      s += line(356, 152, 572, 54, "ink s-cool");
      s += t(455, 197, "crosses and a best-fit line", { c: "sm muted" });
      return svg(604, 204, "A bar chart for a categoric independent variable and a line graph for a continuous one", s);
    },

    // The drop test set-up.
    dropTest() {
      const Y = (cm) => 280 - cm * 4.2;
      let s = line(10, 280, 330, 280, "ink bold") + `<rect x="150" y="270" width="110" height="10" class="ink hot-t"/>` + t(205, 298, "material under test", { c: "sm" });
      s += `<rect x="20" y="266" width="60" height="14" class="ink mid"/>` + line(36, 266, 36, 30, "ink bold") + `<path class="ink" d="M36 60H120"/><rect x="118" y="54" width="18" height="12" class="ink mid"/>`;
      s += `<rect x="140" y="${Y(60)}" width="22" height="${Y(0) - Y(60)}" class="ink sun-t"/>`;
      for (let cm = 0; cm <= 60; cm += 5) s += line(140, Y(cm), cm % 10 ? 148 : 152, Y(cm), "ink thin") + (cm % 10 ? "" : t(158, Y(cm) + 3, cm, { c: "sm", a: "start" }).replace('class="sm"', 'class="sm" style="font-size:8px"'));
      s += `<circle cx="205" cy="${Y(50) - 9}" r="9" class="ink cool-t"/>` + t(222, Y(50) - 5, "released from 50 cm, no push", { a: "start", c: "sm" });
      s += `<circle cx="205" cy="${Y(13) - 9}" r="9" class="ink dash paper"/>` + line(205, Y(50) + 4, 205, 262, "ink thin dash");
      s += line(214, Y(13), 300, Y(13), "ink thin dash") + `<path class="ink" d="M302 ${Y(13) - 8}q14 8 0 16"/><circle cx="306" cy="${Y(13)}" r="2.5" class="solid"/>`;
      s += t(330, Y(13) - 22, "eye level with the", { a: "end", c: "sm" }) + t(330, Y(13) - 8 - 0, "top of the bounce", { a: "end", c: "sm" });
      s += dim(118, Y(13), 118, Y(0), "bounce", -1);
      s += t(150, 22, "ruler vertical, 0 cm at the surface", { c: "sm" });
      return svg(340, 306, "Drop test: a ball released from 50 cm beside a vertical ruler onto the material; the bounce height is read at eye level", s);
    },

    // Sample bar chart from the deck's drop test results.
    barChart() {
      const data = [["sponge", 13], ["cardboard", 30], ["cloth", 23], ["rubber mat", 38], ["bubble", 17]];
      const { s: ax, Y } = axes({ x0: 52, y0: 26, w: 280, h: 180, xr: [0, 5, 1], yr: [0, 40, 5], yEvery: 2, xLabel: "Material", yLabel: "Mean bounce height / cm", ticks: false });
      let s = ax.replace(/<path class="grid" d="M[\d.]+ [\d.]+L[\d.]+ 26"\/>/g, "");
      for (let v = 0; v <= 40; v += 10) s += t(46, Y(v) + 4, v, { c: "sm", a: "end" });
      data.forEach(([m, v], i) => { const x = 62 + i * 56; s += `<rect x="${x}" y="${r1(Y(v))}" width="36" height="${r1(Y(0) - Y(v))}" class="ink ${i === 0 ? "leaf-t" : "sun-t"}"/>` + t(x + 18, 222, m, { c: "sm" }); });
      s += t(192, 14, "Mean bounce height for each material", { c: "sm" });
      return svg(340, 262, "Bar chart of mean bounce height: sponge 13, cardboard 30, cloth 23, rubber mat 38, bubble wrap 17 cm", s);
    },

    // The ramp set-up.
    ramp() {
      let s = line(6, 140, 594, 140, "ink bold");
      s += `<path class="ink soft" d="M30 140 L30 60 L200 140 Z"/>`;
      s += `<g transform="translate(46 70) rotate(25.2)"><rect x="0" y="-16" width="40" height="16" rx="3" class="ink sun-t"/><circle cx="9" cy="2" r="5" class="ink paper"/><circle cx="31" cy="2" r="5" class="ink paper"/></g>`;
      s += line(40, 56, 60, 66, "ink s-hot bold") + t(64, 52, "same start line", { a: "start", c: "sm" });
      s += dim(18, 60, 18, 140, "h", -1);
      s += `<g transform="translate(470 124)"><rect x="0" y="0" width="40" height="16" rx="3" class="ink sun-t"/><circle cx="9" cy="18" r="5" class="ink paper"/><circle cx="31" cy="18" r="5" class="ink paper"/></g>`;
      s += dim(200, 160, 470, 160, "");
      s += t(335, 180, "distance travelled d: from the bottom of the ramp to where the trolley stops", { c: "sm" });
      s += t(110, 30, "ramp height h", { c: "sm" });
      return svg(600, 186, "Ramp practical: ramp height h, a fixed start line, and distance d from the bottom of the ramp to where the trolley stops", s);
    },

    // A good scale and the classic bad one.
    scales() {
      let s = t(4, 18, "A good scale: equal steps of 10", { a: "start" });
      s += line(20, 46, 580, 46);
      for (let i = 0; i <= 8; i += 1) s += line(20 + i * 70, 40, 20 + i * 70, 52, "ink thin") + t(20 + i * 70, 68, i * 10, { c: "sm" });
      s += tickMark(560, 18);
      s += t(4, 98, "Not a scale: the results written along the axis", { a: "start" });
      s += line(20, 126, 580, 126);
      [20, 37, 52, 66, 80].forEach((v, i) => { s += line(20 + i * 140, 120, 20 + i * 140, 132, "ink thin") + t(20 + i * 140, 148, v, { c: "sm" }); });
      s += noMark(560, 96);
      return svg(600, 156, "A scale in equal steps of 10 compared with an axis labelled 20, 37, 52, 66, 80, which is not a scale", s);
    },

    // Dot-to-dot against best-fit lines.
    fitTypes() {
      const pts = [[20, 112], [52, 90], [84, 86], [116, 58], [148, 52], [180, 26]];
      const curvePts = [[20, 120], [52, 84], [84, 64], [116, 50], [148, 44], [180, 41]];
      const panel = (x0, title, body, mark) => `<g transform="translate(${x0} 0)"><rect x="2" y="2" width="200" height="170" rx="6" class="ink thin paper"/>` + line(14, 140, 192, 140) + line(14, 14, 14, 140) + body + t(102, 162, title, { c: "sm" }) + mark + "</g>";
      const xs = (p) => p.map(([x, y]) => cross(x, y, 4.5)).join("");
      let s = panel(0, "dot-to-dot: never", xs(pts) + `<path class="ink thin" d="M${pts.map(([x, y]) => `${x} ${y}`).join("L")}"/>`, noMark(182, 22));
      s += panel(212, "best-fit straight line", xs(pts) + line(16, 120, 188, 22, "ink s-cool"), tickMark(182, 22));
      s += panel(424, "best-fit curve", xs([[20, 118], [52, 86], [84, 66], [116, 49], [148, 46], [180, 40]]) + `<path class="ink s-cool" fill="none" d="M18 126 C 60 70, 110 46, 190 40"/>`, tickMark(182, 22));
      return svg(628, 176, "Three graphs: points joined dot-to-dot (wrong), a straight best-fit line, and a curved best-fit line", s);
    },

    // The anomalous ramp result.
    anomaly(withLine = true) {
      const { s: ax, X, Y } = axes({ x0: 56, y0: 14, w: 270, h: 200, xr: [0, 30, 5], yr: [0, 100, 10], yEvery: 2, xLabel: "Ramp height / cm", yLabel: "Mean distance / cm" });
      let s = ax;
      const pts = [[5, 20], [10, 37], [15, 52], [20, 96], [25, 80]];
      if (withLine) s += `<path class="ink s-cool" fill="none" d="${smooth(RAMP_CURVE, X, Y)}"/>`;
      s += pts.map(([a, b]) => cross(X(a), Y(b), 5)).join("");
      if (withLine) {
        s += `<circle cx="${X(20)}" cy="${Y(96)}" r="11" class="ink s-hot"/>` + t(X(20) - 14, Y(96) + 4, "96", { a: "end", c: "sm t-hot" });
        s += `<path class="ink thin dash" d="M${X(20)} ${Y(0)}V${Y(66)}H${X(0)}"/>` + t(X(0) + 4, Y(66) - 6, "the line gives about 66 cm", { a: "start", c: "sm" });
      }
      return svg(340, 270, "Mean distance against ramp height: 20, 37, 52, 96, 80 cm; the 96 cm point at 20 cm is far above the best-fit curve, which gives about 66 cm", s);
    },

    // Helicopter graph: reading a value between the points.
    readGraph() {
      const { s: ax, X, Y } = axes({ x0: 56, y0: 14, w: 270, h: 200, xr: [3, 9, 0.5], yr: [1, 2, 0.1], xEvery: 2, yEvery: 2, fmtY: (v) => v.toFixed(1), xLabel: "Wing length / cm", yLabel: "Mean fall time / s" });
      const pts = [[4, 1.10], [5, 1.32], [6, 1.50], [7, 1.71], [8, 1.88]];
      let s = ax + line(X(3.4), Y(0.196 * 3.4 + 0.33), X(8.6), Y(0.196 * 8.6 + 0.33), "ink s-cool");
      s += `<path class="ink thin dash s-hot" d="M${X(6.5)} ${Y(1)}V${Y(1.604)}H${X(3)}"/>`;
      s += pts.map(([a, b]) => cross(X(a), Y(b), 5)).join("");
      s += t(X(6.5) + 6, Y(1) - 8, "6.5 cm", { a: "start", c: "sm t-hot" }) + t(X(3) + 6, Y(1.604) - 6, "about 1.6 s", { a: "start", c: "sm t-hot" });
      return svg(340, 270, "Mean fall time against wing length from 4 cm (1.10 s) to 8 cm (1.88 s) with a straight best-fit line; reading up from 6.5 cm and across gives about 1.6 s", s);
    },

    // A paper helicopter template.
    helicopter() {
      let s = `<path class="ink paper" d="M110 20H210V250H110Z"/>`;
      s += line(160, 20, 160, 120, "ink dash s-hot") + t(166, 70, "cut", { a: "start", c: "sm t-hot" });
      s += line(110, 120, 210, 120, "ink thin dash") + line(110, 160, 130, 160, "ink thin dash") + line(190, 160, 210, 160, "ink thin dash");
      s += line(130, 160, 130, 250, "ink thin dash") + line(190, 160, 190, 250, "ink thin dash");
      s += t(80, 124, "fold", { a: "end", c: "sm" }) + line(84, 120, 108, 120, "ink thin");
      s += t(135, 46, "A", { c: "lg" }) + t(185, 46, "B", { c: "lg" });
      s += dim(226, 20, 226, 120, "wing length L");
      s += t(160, 200, "body", { c: "sm" });
      s += `<path class="ink bold s-cool" d="M150 252v-22a6 6 0 0 1 12 0v26a4 4 0 0 1-8 0v-18"/>` + t(176, 262, "paperclip", { a: "start", c: "sm" });
      s += t(10, 288, "Fold wing A forward and wing B back. Fold the body sides in.", { a: "start", c: "sm" });
      return svg(340, 296, "Paper helicopter template: cut down the middle of the top to make wings A and B of length L, fold them opposite ways, add a paperclip to the body", s);
    },

    // The steps of an investigation.
    cycle() {
      const steps = [["1", "Question", "How does X", "affect Y?"], ["2", "Plan", "variables,", "method, risks"], ["✓", "Sign-off", "teacher", "approves"], ["3", "Collect", "3 trials,", "a mean"], ["4", "Graph", "line or bar", "chart"], ["5", "Conclude", "and", "evaluate"], ["6", "Peer", "review", ""]];
      let s = "";
      steps.forEach(([n, a, b, c], i) => {
        const x = 4 + i * 89;
        s += `<rect x="${x}" y="8" width="76" height="96" rx="6" class="ink ${n === "✓" ? "hot-t" : "sun-t"}"/>` + t(x + 38, 32, n, { c: "lg" }) + t(x + 38, 56, a) + t(x + 38, 76, b, { c: "sm" }) + t(x + 38, 92, c, { c: "sm" });
        if (i < steps.length - 1) s += arrow(x + 77, 56, x + 88, 56, "thin", 6);
      });
      return svg(630, 112, "Investigation steps: question, plan, teacher sign-off, collect, graph, conclude and evaluate, peer review", s);
    },

    // The student's faulty graph for the spring data (Lesson 5).
    faultyGraph() {
      let g = "";
      for (let i = 0; i <= 8; i += 1) g += `<line x1="${12 + i * 8.75}" y1="4" x2="${12 + i * 8.75}" y2="44"/>`;
      for (let j = 0; j <= 10; j += 1) g += `<line x1="12" y1="${4 + j * 4}" x2="82" y2="${4 + j * 4}"/>`;
      const xs = [15.5, 19, 22.5, 26, 29.5], ys = [42.32, 40.8, 39.04, 37.68, 35.92];
      return `<svg class="faulty-graph" viewBox="0 0 86 50" role="img" aria-label="The student's graph: unlabelled axes running to 2000 and 50, with five points joined dot-to-dot in the bottom-left corner"><g stroke="#c9d3e0" stroke-width="0.2">${g}</g><g stroke="#1f2937" stroke-width="0.4"><line x1="12" y1="4" x2="12" y2="44"/><line x1="12" y1="44" x2="82" y2="44"/></g><g font-size="3" font-family="Arial, sans-serif" fill="#1f2937">${[0, 500, 1000, 1500, 2000].map((v, i) => `<text x="${12 + i * 17.5}" y="48.2" text-anchor="middle">${v}</text>`).join("")}${[0, 10, 20, 30, 40, 50].map((v, i) => `<text x="10.5" y="${45.2 - i * 8}" text-anchor="end">${v}</text>`).join("")}</g><polyline points="${xs.map((x, i) => `${x},${ys[i]}`).join(" ")}" fill="none" stroke="#1f2937" stroke-width="0.4"/><g fill="#1f2937">${xs.map((x, i) => `<circle cx="${x}" cy="${ys[i]}" r="0.7"/>`).join("")}</g></svg>`;
    },
  };

  FIG.RAMP = RAMP;
  window.WLPFigures = FIG;
})();
