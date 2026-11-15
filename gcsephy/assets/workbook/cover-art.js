/* Cover drawings for the GCSE unit workbooks: navy line art with white fills, drawn straight onto the
   cover's year colour. window.CoverArt.<topic>() returns an SVG; each unit's assets/book.js picks one. */
(function () {
  "use strict";

  const INK = "#0a1326";
  const svg = (w, h, label, body) => `<svg class="cover-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}" fill="none" stroke="${INK}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const text = (x, y, s, size = 9, anchor = "middle", extra = "") => `<text x="${x}" y="${y}" font-family="Arial Black, Archivo Black, Arial, sans-serif" font-weight="900" font-size="${size}" letter-spacing=".04em" fill="${INK}" stroke="none" text-anchor="${anchor}"${extra}>${s}</text>`;
  const arrow = (x1, y1, x2, y2, w = 3) => {
    const a = Math.atan2(y2 - y1, x2 - x1), h = 3 + w * 1.6;
    const p = (da) => `${(x2 - h * Math.cos(a + da)).toFixed(1)} ${(y2 - h * Math.sin(a + da)).toFixed(1)}`;
    return `<path d="M${x1} ${y1} L${x2} ${y2}" stroke-width="${w}"/><path d="M${p(0.45)} L${x2} ${y2} L${p(-0.45)}" stroke-width="${w}"/>`;
  };
  const grid = (x0, y0, x1, y1, step) => {
    let d = "";
    for (let x = x0; x <= x1; x += step) d += `M${x} ${y0}V${y1}`;
    for (let y = y0; y <= y1; y += step) d += `M${x0} ${y}H${x1}`;
    return `<path d="${d}" stroke="#fff" stroke-opacity=".55" stroke-width="1"/>`;
  };

  // Work Like a Physicist: results with error bars, a line of best fit and one anomalous result circled.
  function graph() {
    const fit = (x) => 138 - 0.361 * (x - 40);
    const xs = [70, 110, 150, 190, 230, 270, 302];
    const scatter = [3, -4, 2, null, -3, 4, -2];
    const pts = xs.map((x, i) => [x, scatter[i] === null ? 120 : fit(x) + scatter[i]]);
    const cross = ([x, y]) => `<path d="M${x - 4.5} ${y - 4.5}L${x + 4.5} ${y + 4.5}M${x - 4.5} ${y + 4.5}L${x + 4.5} ${y - 4.5}" stroke-width="3"/>`;
    const bar = ([x, y]) => `<path d="M${x} ${y - 9}V${y + 9}M${x - 4} ${y - 9}H${x + 4}M${x - 4} ${y + 9}H${x + 4}" stroke-width="1.6"/>`;
    return svg(340, 172, "A line graph: results with error bars, a line of best fit and one anomalous result circled",
      grid(40, 10, 320, 150, 20) +
      `<path d="M48 ${fit(48)}L322 ${fit(322)}" stroke="#fff" stroke-width="6"/>` +
      `<path d="M48 ${fit(48)}L322 ${fit(322)}" stroke-width="2" stroke-dasharray="7 5"/>` +
      pts.map(bar).join("") + pts.map(cross).join("") +
      `<circle cx="190" cy="120" r="15" stroke-width="2.4" stroke-dasharray="4 3.5"/>` +
      text(212, 131, "ANOMALOUS", 8.5, "start") +
      arrow(40, 150, 330, 150) + arrow(40, 150, 40, 4) +
      text(320, 166, "INDEPENDENT VARIABLE", 8.5, "end") +
      text(30, 150, "DEPENDENT VARIABLE", 8.5, "start", ' transform="rotate(-90 30 150)"'));
  }

  // Energy: a ball rolls down a track; gravitational potential energy at the top becomes kinetic energy at the bottom.
  function energy() {
    const track = "M14 34 C 92 34, 112 150, 170 150 S 248 34, 326 34";
    const bars = (x, y, gpe, ke) => `<rect x="${x}" y="${y}" width="58" height="56" fill="#fff" stroke-width="2.4"/>` +
      `<rect x="${x + 9}" y="${y + 46 - 38 * gpe}" width="16" height="${38 * gpe}" fill="${INK}" stroke="none"/>` +
      `<rect x="${x + 33}" y="${y + 46 - 38 * ke}" width="16" height="${38 * ke}" fill="${INK}" stroke="none"/>` +
      `<path d="M${x + 5} ${y + 46}H${x + 53}" stroke-width="2"/>` +
      text(x + 17, y + 70, "GPE", 8.5) + text(x + 41, y + 70, "KE", 8.5);
    const ball = (x, y) => `<circle cx="${x}" cy="${y}" r="10" fill="#fff" stroke-width="3"/>`;
    return svg(340, 176, "A ball rolling down a curved track, with bar charts of gravitational potential and kinetic energy at the top and the bottom",
      `<path d="${track}" stroke="#fff" stroke-width="12"/><path d="${track}" stroke-width="4"/>` +
      ball(26, 23) + ball(170, 139) +
      arrow(158, 117, 196, 117, 3) +
      bars(20, 84, 1, 0) + bars(141, 18, 0, 1));
  }

  // Particle model: particles in a solid, a liquid and a gas (touching in a solid and a liquid).
  function particles() {
    const p = (x, y) => `<circle cx="${x}" cy="${y}" r="8" fill="#fff" stroke-width="2.4"/>`;
    const box = (x) => `<rect x="${x}" y="14" width="92" height="92" fill="#fff" fill-opacity=".35" stroke-width="3.2"/>`;
    let solid = "";
    for (let r = 0; r < 4; r += 1) for (let c = 0; c < 4; c += 1) solid += p(32 + c * 18.4, 32 + r * 18.4);
    const liquid = [[134, 96], [152.4, 96], [170.8, 96], [189.2, 96], [207.6, 96],
      [143.2, 80], [161.6, 80], [180, 80], [198.4, 80],
      [137, 63.5], [155.6, 63.8], [175, 63.6], [194, 64]].map(([x, y]) => p(x, y)).join("");
    // Gas particles far apart, each moving off in its own direction.
    const gasPts = [[256, 38, 1, -0.4], [300, 30, 1, 1], [276, 68, -1, 1], [302, 92, -1, 0], [316, 64, 0, 1]];
    const gas = gasPts.map(([x, y, dx, dy]) => {
      const n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n;
      return arrow(+(x + ux * 11).toFixed(1), +(y + uy * 11).toFixed(1), +(x + ux * 24).toFixed(1), +(y + uy * 24).toFixed(1), 2) + p(x, y);
    }).join("");
    return svg(340, 130, "Particles in a solid, a liquid and a gas",
      box(14) + box(124) + box(234) + solid + liquid + gas +
      arrow(108, 60, 120, 60, 2.6) + arrow(218, 60, 230, 60, 2.6) +
      text(60, 126, "SOLID", 10) + text(170, 126, "LIQUID", 10) + text(280, 126, "GAS", 10));
  }

  /* Electric circuits: a cell, a closed switch, an ammeter, a resistor and a lamp in series, a voltmeter
     across the lamp, and conventional current leaving the cell's positive (long) plate. */
  function circuit() {
    const wires = "M30 30 H84 M96 30 H155 M185 30 H236 M264 30 H310 V140 H244 M216 140 H118 M82 140 H30 V30 M200 140 V178 H218 M242 178 H260 V140";
    const meter = (x, y, r, letter) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke-width="3.2"/>` + text(x, y + r * 0.42, letter, r * 1.05);
    return svg(340, 194, "A series circuit with a cell, a switch, an ammeter, a resistor and a lamp, and a voltmeter across the lamp",
      `<path d="${wires}" stroke="#fff" stroke-width="9"/><path d="${wires}" stroke-width="3.2"/>` +
      // cell: long (positive) plate, then short (negative) plate
      `<path d="M84 14 V46" stroke-width="3.2"/><path d="M96 22 V38" stroke-width="6"/>` + text(84, 9, "+", 10) +
      // closed switch
      `<path d="M155 30 L185 30" stroke-width="3.2"/><circle cx="155" cy="30" r="3.6" fill="#fff" stroke-width="2.4"/><circle cx="185" cy="30" r="3.6" fill="#fff" stroke-width="2.4"/>` +
      meter(250, 30, 14, "A") +
      `<rect x="82" y="131" width="36" height="18" fill="#fff" stroke-width="3.2"/>` +
      // lamp
      `<circle cx="230" cy="140" r="14" fill="#fff" stroke-width="3.2"/><path d="M220 130 L240 150 M240 130 L220 150" stroke-width="3"/>` +
      meter(230, 178, 12, "V") +
      `<circle cx="200" cy="140" r="3.8" fill="${INK}" stroke="none"/><circle cx="260" cy="140" r="3.8" fill="${INK}" stroke="none"/>` +
      arrow(30, 62, 30, 104, 3) + text(18, 89, "I", 13));
  }

  /* Atoms and radiation: a carbon-12 atom (6 protons, 6 neutrons, 6 electrons) and how far alpha, beta
     and gamma radiation get through paper, aluminium and lead. */
  function atom() {
    // Twelve touching nucleons in a round cluster (rows of 3, 4, 3 and 2): 6 protons (white), 6 neutrons (navy).
    const nucleons = [[-12, -15.6, 1], [0, -15.6, 0], [12, -15.6, 1], [-18, -5.2, 0], [-6, -5.2, 1], [6, -5.2, 0], [18, -5.2, 1],
      [-12, 5.2, 0], [0, 5.2, 1], [12, 5.2, 0], [-6, 15.6, 1], [6, 15.6, 0]];
    const nucleus = nucleons.map(([x, y, p]) => `<circle cx="${84 + x}" cy="${88 + y}" r="5.8" fill="${p ? "#fff" : INK}" stroke-width="1.8"/>`).join("");
    const orbits = [0, 60, -60].map((a) => `<g transform="rotate(${a} 84 86)"><ellipse cx="84" cy="86" rx="76" ry="25" stroke-width="2.4"/>` +
      `<circle cx="160" cy="86" r="4.6" fill="${INK}" stroke="none"/><circle cx="8" cy="86" r="4.6" fill="${INK}" stroke="none"/></g>`).join("");
    const sheet = (x, w, fill, label, below) => `<rect x="${x}" y="24" width="${w}" height="122" fill="${fill}" stroke-width="2.4"/>` + text(x + w / 2, below ? 164 : 15, label, 7.5);
    let wave = "M190 126";
    for (let x = 190; x < 330; x += 8) wave += " q2 -6 4 0 t4 0";
    return svg(340, 172, "A carbon atom, and alpha, beta and gamma radiation reaching sheets of paper, aluminium and lead",
      orbits + nucleus +
      sheet(222, 4, "#fff", "PAPER") + sheet(266, 9, "#fff", "ALUMINIUM", true) + sheet(308, 18, INK, "LEAD") +
      arrow(190, 50, 219, 50, 3) + arrow(190, 88, 263, 88, 3) +
      `<path d="${wave}" stroke-width="2.4"/>` + arrow(326, 126, 336, 126, 2.4) +
      text(180, 54, "α", 13) + text(180, 92, "β", 13) + text(180, 130, "γ", 13));
  }

  window.CoverArt = { graph, energy, circuit, particles, atom };
})();
