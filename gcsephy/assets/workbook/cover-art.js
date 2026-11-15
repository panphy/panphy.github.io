/* Cover drawings for the GCSE unit workbooks: soft line art with gentle colour fills, printed on a pale
   card on the cover's year colour. window.CoverArt.<topic>() returns an SVG; each unit's assets/book.js
   picks one. */
(function () {
  "use strict";

  const INK = "#2c3a55";
  const C = { coral: "#f2957a", sky: "#8ccbe9", mint: "#8fd6b8", lemon: "#f8d96b", pale: "#e3e9f1", slate: "#7d889c" };
  const svg = (w, h, label, body) => `<svg class="cover-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const text = (x, y, s, size = 8.5, anchor = "middle", extra = "", colour = INK) => `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${size}" letter-spacing=".08em" fill="${colour}" stroke="none" text-anchor="${anchor}"${extra}>${s}</text>`;
  const arrow = (x1, y1, x2, y2, colour = INK, w = 2) => {
    const a = Math.atan2(y2 - y1, x2 - x1), h = 5 + w * 1.5;
    const p = (da) => `${(x2 - h * Math.cos(a + da)).toFixed(1)} ${(y2 - h * Math.sin(a + da)).toFixed(1)}`;
    return `<path d="M${x1} ${y1} L${x2} ${y2} M${p(0.45)} L${x2} ${y2} L${p(-0.45)}" stroke="${colour}" stroke-width="${w}"/>`;
  };
  const RED = "#c4573a", GREEN = "#2f9a74", PURPLE = "#7a5fd6";

  // Work Like a Physicist: results with error bars, a line of best fit and one anomalous result circled.
  function graph() {
    const fit = (x) => 138 - 0.361 * (x - 40);
    const xs = [70, 110, 150, 190, 230, 270, 302];
    const scatter = [3, -4, 2, null, -3, 4, -2];
    const pts = xs.map((x, i) => [x, scatter[i] === null ? 120 : fit(x) + scatter[i]]);
    let grid = "";
    for (let x = 60; x <= 320; x += 20) grid += `M${x} 10V150`;
    for (let y = 10; y < 150; y += 20) grid += `M40 ${y}H320`;
    const bar = ([x, y]) => `<path d="M${x} ${y - 9}V${y + 9}M${x - 3.5} ${y - 9}H${x + 3.5}M${x - 3.5} ${y + 9}H${x + 3.5}" stroke-width="1.4"/>`;
    const dot = ([x, y]) => `<circle cx="${x}" cy="${y}" r="4.6" fill="${C.sky}" stroke-width="1.6"/>`;
    return svg(340, 172, "A line graph: results with error bars, a line of best fit and one anomalous result circled",
      `<path d="${grid}" stroke="${C.pale}" stroke-width="1"/>` +
      `<path d="M48 ${fit(48)}L322 ${fit(322)}" stroke="${C.mint}" stroke-width="4"/>` +
      pts.map(bar).join("") + pts.map(dot).join("") +
      `<circle cx="190" cy="120" r="14" stroke="${C.coral}" stroke-width="2.2" stroke-dasharray="4 3.5"/>` +
      text(211, 132, "ANOMALOUS", 8, "start", "", RED) +
      arrow(40, 150, 330, 150) + arrow(40, 150, 40, 4) +
      text(320, 166, "INDEPENDENT VARIABLE", 8, "end") +
      text(30, 150, "DEPENDENT VARIABLE", 8, "start", ' transform="rotate(-90 30 150)"'));
  }

  // Energy: a ball rolls down a track; gravitational potential energy at the top becomes kinetic energy at the bottom.
  function energy() {
    const track = "M14 34 C 92 34, 112 150, 170 150 S 248 34, 326 34";
    const bars = (x, y, gpe, ke) => `<rect x="${x}" y="${y}" width="60" height="58" rx="6" fill="#fff" stroke-width="1.4"/>` +
      (gpe ? `<rect x="${x + 10}" y="${y + 48 - 36 * gpe}" width="15" height="${36 * gpe}" rx="2" fill="${C.sky}" stroke="none"/>` : "") +
      (ke ? `<rect x="${x + 35}" y="${y + 48 - 36 * ke}" width="15" height="${36 * ke}" rx="2" fill="${C.coral}" stroke="none"/>` : "") +
      `<path d="M${x + 6} ${y + 48}H${x + 54}" stroke-width="1.4"/>` +
      text(x + 17, y + 72, "GPE", 8) + text(x + 43, y + 72, "KE", 8);
    const ball = (x, y) => `<circle cx="${x}" cy="${y}" r="10" fill="${C.lemon}" stroke-width="1.8"/>`;
    return svg(340, 176, "A ball rolling down a curved track, with bar charts of gravitational potential and kinetic energy at the top and the bottom",
      `<path d="${track}" stroke-width="3"/>` +
      ball(26, 23) + ball(170, 139) +
      arrow(158, 118, 194, 118, RED, 2.4) +
      bars(22, 84, 1, 0) + bars(141, 14, 0, 1));
  }

  // Electric circuits: a cell, a closed switch, an ammeter, a resistor and a lit lamp in series, a voltmeter
  // across the lamp, and conventional current leaving the cell's positive (long) plate.
  function circuit() {
    const wires = "M30 30 H84 M96 30 H155 M185 30 H236 M264 30 H310 V140 H244 M216 140 H118 M82 140 H30 V30 M200 140 V178 H218 M242 178 H260 V140";
    const meter = (x, y, r, letter) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke-width="2"/>` + text(x, y + r * 0.38, letter, r * 0.95);
    const rays = [-60, -30, 0, 30, 60].map((a) => {
      const r = (a * Math.PI) / 180, s = Math.sin(r), c = Math.cos(r);
      return `<path d="M${(230 + 20 * s).toFixed(1)} ${(140 - 20 * c).toFixed(1)} L${(230 + 29 * s).toFixed(1)} ${(140 - 29 * c).toFixed(1)}" stroke="#e0a91c" stroke-width="2.2"/>`;
    }).join("");
    return svg(340, 194, "A series circuit with a cell, a switch, an ammeter, a resistor and a lit lamp, and a voltmeter across the lamp",
      `<path d="${wires}" stroke-width="2.4"/>` +
      `<path d="M84 16 V44" stroke-width="2.4"/><path d="M96 23 V37" stroke-width="5"/>` + text(84, 11, "+", 10) +
      `<path d="M155 30 L185 30" stroke-width="2.4"/><circle cx="155" cy="30" r="3.4" fill="#fff" stroke-width="1.8"/><circle cx="185" cy="30" r="3.4" fill="#fff" stroke-width="1.8"/>` +
      meter(250, 30, 14, "A") +
      `<rect x="82" y="132" width="36" height="16" rx="3" fill="${C.mint}" stroke-width="2"/>` +
      rays + `<circle cx="230" cy="140" r="14" fill="${C.lemon}" stroke-width="2"/><path d="M220 130 L240 150 M240 130 L220 150" stroke-width="2"/>` +
      meter(230, 178, 12, "V") +
      `<circle cx="200" cy="140" r="3.2" fill="${INK}" stroke="none"/><circle cx="260" cy="140" r="3.2" fill="${INK}" stroke="none"/>` +
      arrow(30, 64, 30, 104, RED, 2.4) + text(19, 89, "I", 12, "middle", "", RED));
  }

  // Particle model: particles in a solid, a liquid and a gas.
  function particles() {
    const p = (x, y, fill) => `<circle cx="${x}" cy="${y}" r="8" fill="${fill}" stroke-width="1.6"/>`;
    const box = (x) => `<rect x="${x}" y="14" width="92" height="92" rx="8" fill="#fff" stroke-width="1.6"/>`;
    let solid = "";
    for (let r = 0; r < 4; r += 1) for (let c = 0; c < 4; c += 1) solid += p(32 + c * 18.4, 32 + r * 18.4, C.sky);
    const liquid = [[134, 96], [152.4, 96], [170.8, 96], [189.2, 96], [207.6, 96],
      [143.2, 80], [161.6, 80], [180, 80], [198.4, 80],
      [137, 63.5], [155.6, 63.8], [175, 63.6], [194, 64]].map(([x, y]) => p(x, y, C.mint)).join("");
    const gasPts = [[256, 38, 1, -0.4], [300, 30, 1, 1], [276, 68, -1, 1], [302, 92, -1, 0], [316, 64, 0, 1]];
    const gas = gasPts.map(([x, y, dx, dy]) => {
      const n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n;
      return arrow(+(x + ux * 11).toFixed(1), +(y + uy * 11).toFixed(1), +(x + ux * 23).toFixed(1), +(y + uy * 23).toFixed(1), INK, 1.4) + p(x, y, C.coral);
    }).join("");
    return svg(340, 130, "Particles in a solid, a liquid and a gas",
      box(14) + box(124) + box(234) + solid + liquid + gas +
      arrow(108, 60, 120, 60, INK, 1.8) + arrow(218, 60, 230, 60, INK, 1.8) +
      text(60, 125, "SOLID", 9) + text(170, 125, "LIQUID", 9) + text(280, 125, "GAS", 9));
  }

  /* Atoms and radiation: a carbon-12 atom (6 protons, 6 neutrons, 6 electrons) and how far alpha, beta
     and gamma radiation get through paper, aluminium and lead. */
  function atom() {
    // Twelve touching nucleons in a round cluster (rows of 3, 4, 3 and 2): 6 protons (coral), 6 neutrons (sky).
    const nucleons = [[-12, -15.6, 1], [0, -15.6, 0], [12, -15.6, 1], [-18, -5.2, 0], [-6, -5.2, 1], [6, -5.2, 0], [18, -5.2, 1],
      [-12, 5.2, 0], [0, 5.2, 1], [12, 5.2, 0], [-6, 15.6, 1], [6, 15.6, 0]];
    const nucleus = nucleons.map(([x, y, p]) => `<circle cx="${84 + x}" cy="${88 + y}" r="5.8" fill="${p ? C.coral : C.sky}" stroke-width="1.3"/>`).join("");
    const orbits = [0, 60, -60].map((a) => `<g transform="rotate(${a} 84 86)"><ellipse cx="84" cy="86" rx="76" ry="25" stroke-width="1.6"/>` +
      `<circle cx="160" cy="86" r="4" fill="${INK}" stroke="none"/><circle cx="8" cy="86" r="4" fill="${INK}" stroke="none"/></g>`).join("");
    const sheet = (x, w, fill, label, below) => `<rect x="${x}" y="24" width="${w}" height="122" rx="2" fill="${fill}" stroke-width="1.6"/>` + text(x + w / 2, below ? 164 : 15, label, 7.5);
    let wave = "M190 126";
    for (let x = 190; x < 330; x += 8) wave += " q2 -6 4 0 t4 0";
    return svg(340, 172, "A carbon atom, and alpha, beta and gamma radiation reaching sheets of paper, aluminium and lead",
      orbits + nucleus +
      sheet(222, 4, "#fff", "PAPER") + sheet(266, 9, C.pale, "ALUMINIUM", true) + sheet(308, 18, C.slate, "LEAD") +
      arrow(190, 50, 219, 50, RED, 2.4) + arrow(190, 88, 263, 88, GREEN, 2.4) +
      `<path d="${wave}" stroke="${PURPLE}" stroke-width="2"/>` + arrow(326, 126, 336, 126, PURPLE, 2) +
      text(180, 54, "α", 12, "middle", "", RED) + text(180, 92, "β", 12, "middle", "", GREEN) + text(180, 130, "γ", 12, "middle", "", PURPLE));
  }

  window.CoverArt = { graph, energy, circuit, particles, atom };
})();
