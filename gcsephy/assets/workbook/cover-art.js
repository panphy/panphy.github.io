/* Cover emblems for the GCSE unit workbooks: one bold drawing per topic, in white and the cover's year
   colour, printed on the navy band at the foot of the cover. window.CoverArt.<topic>() returns an SVG;
   each unit's assets/book.js picks one. No labels: the title says what the unit is. */
(function () {
  "use strict";

  const W = "#fff";
  const Y = "var(--year)";
  const NAVY = "#0a1326";
  const svg = (label, body) => `<svg class="cover-svg" viewBox="0 0 340 150" role="img" aria-label="${label}" fill="none" stroke="${W}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const head = (x1, y1, x2, y2, size, colour = W) => {
    const a = Math.atan2(y2 - y1, x2 - x1);
    const p = (da) => `${(x2 - size * Math.cos(a + da)).toFixed(1)} ${(y2 - size * Math.sin(a + da)).toFixed(1)}`;
    return `<path d="M${p(0.5)} L${x2} ${y2} L${p(-0.5)}" stroke="${colour}" stroke-width="5"/>`;
  };

  // Work Like a Physicist: results with error bars, a line of best fit, and the one result that does not fit.
  function graph() {
    const fit = (x) => 128 - 0.36 * (x - 70);
    const pts = [[96, 3], [136, -5], [176, 4], [256, -4], [296, 3]].map(([x, d]) => [x, fit(x) + d]);
    const odd = [216, 112];
    const bar = ([x, y]) => `<path d="M${x} ${y - 12}V${y + 12}M${x - 5} ${y - 12}H${x + 5}M${x - 5} ${y + 12}H${x + 5}" stroke-width="2.6"/>`;
    const dot = ([x, y]) => `<circle cx="${x}" cy="${y}" r="6.5" fill="${W}" stroke="none"/>`;
    return svg("A graph of results with error bars, a line of best fit and one anomalous result circled",
      `<path d="M70 140 H322 M70 140 V10" stroke-width="5"/>` + head(70, 140, 326, 140, 11) + head(70, 140, 70, 6, 11) +
      `<path d="M78 ${fit(78)} L318 ${fit(318)}" stroke="${Y}" stroke-width="6"/>` +
      pts.map(bar).join("") + pts.map(dot).join("") +
      dot(odd) + `<circle cx="${odd[0]}" cy="${odd[1]}" r="17" stroke="${Y}" stroke-width="3.4" stroke-dasharray="6 5"/>`);
  }

  // Energy: a ball released at the top of a track; the dashed ball is where it moves fastest.
  function energy() {
    const track = "M-10 34 C 80 34, 110 136, 170 136 S 260 34, 350 34";
    return svg("A ball on a curved track: high up at the start, and moving fastest at the bottom",
      `<path d="${track}" stroke-width="6"/>` +
      `<circle cx="40" cy="18" r="14" fill="${Y}" stroke="none"/>` +
      `<circle cx="170" cy="119" r="14" stroke="${Y}" stroke-width="3.4" stroke-dasharray="5 4"/>` +
      `<path d="M126 119 H146 M118 108 H140 M118 130 H140" stroke="${Y}" stroke-width="3.4"/>` +
      `<path d="M196 119 H232" stroke-width="5"/>` + head(196, 119, 236, 119, 11));
  }

  // Electric circuits: a cell, a closed switch and a lit lamp. Conventional current leaves the long (+) plate,
  // so it flows down the left side and up the right.
  function circuit() {
    const loop = "M50 25 H150 M164 25 H215 M245 25 H300 V125 H50 V25";
    const rays = [-60, -30, 0, 30, 60].map((a) => {
      const r = (a * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
      return `<path d="M${(170 + 27 * s).toFixed(1)} ${(125 - 27 * c).toFixed(1)} L${(170 + 40 * s).toFixed(1)} ${(125 - 40 * c).toFixed(1)}" stroke="${Y}" stroke-width="4"/>`;
    }).join("");
    return svg("A circuit with a cell, a closed switch and a lit lamp",
      `<path d="${loop}" stroke-width="5"/>` +
      `<path d="M150 9 V41" stroke-width="5"/><path d="M164 15 V35" stroke-width="9"/>` +
      `<path d="M219 25 H241" stroke-width="5"/><circle cx="215" cy="25" r="5" fill="${NAVY}" stroke-width="4"/><circle cx="245" cy="25" r="5" fill="${NAVY}" stroke-width="4"/>` +
      rays + `<circle cx="170" cy="125" r="17" fill="${Y}" stroke-width="5"/><path d="M158 113 L182 137 M182 113 L158 137" stroke="${NAVY}" stroke-width="4"/>` +
      `<path d="M300 54 L292 66 M300 54 L308 66" stroke="${Y}" stroke-width="5"/><path d="M50 96 L42 84 M50 96 L58 84" stroke="${Y}" stroke-width="5"/>`);
  }

  // Particle model: particles in a solid, a liquid and a gas, from left to right.
  function particles() {
    const p = (x, y, fill = W) => `<circle cx="${x}" cy="${y}" r="9.2" fill="${fill}" stroke="none"/>`;
    let solid = "";
    for (let r = 0; r < 5; r += 1) for (let c = 0; c < 4; c += 1) solid += p(28 + c * 20, 53 + r * 20);
    const liquid = [[136, 133], [156, 133], [176, 132], [196, 133], [146, 115.5], [166, 115], [186, 115.5], [138, 98], [158, 97], [178, 98], [198, 99], [148, 80], [169, 80]]
      .map(([x, y]) => p(x, y, Y)).join("");
    const gas = [[244, 30, -1, 1], [300, 26, 1, 1], [270, 70, 1, -1], [318, 92, -1, -1], [252, 120, 1, -0.2], [300, 132, 1, 0]]
      .map(([x, y, dx, dy]) => {
        const n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n;
        return `<path d="M${(x - ux * 14).toFixed(1)} ${(y - uy * 14).toFixed(1)} L${(x - ux * 30).toFixed(1)} ${(y - uy * 30).toFixed(1)}" stroke-width="3" opacity=".6"/>` + p(x, y);
      }).join("");
    return svg("Particles in a solid, a liquid and a gas", `<path d="M8 145 H332" stroke-width="3" opacity=".45"/>` + solid + liquid + gas);
  }

  // Atoms and nuclear radiation: a carbon-12 atom, 6 protons, 6 neutrons and 6 electrons.
  function atom() {
    const cx = 170, cy = 75;
    const nucleons = [[-12, -15.6, 1], [0, -15.6, 0], [12, -15.6, 1], [-18, -5.2, 0], [-6, -5.2, 1], [6, -5.2, 0], [18, -5.2, 1],
      [-12, 5.2, 0], [0, 5.2, 1], [12, 5.2, 0], [-6, 15.6, 1], [6, 15.6, 0]];
    const nucleus = nucleons.map(([x, y, p]) => `<circle cx="${cx + x}" cy="${cy + 2 + y}" r="6" fill="${p ? Y : W}" stroke="${NAVY}" stroke-width="1.6"/>`).join("");
    const orbits = [0, 60, -60].map((a) => `<g transform="rotate(${a} ${cx} ${cy})"><ellipse cx="${cx}" cy="${cy}" rx="84" ry="25" stroke-width="4"/>` +
      `<circle cx="${cx + 84}" cy="${cy}" r="6.5" fill="${Y}" stroke="none"/><circle cx="${cx - 84}" cy="${cy}" r="6.5" fill="${Y}" stroke="none"/></g>`).join("");
    return svg("A carbon atom: a nucleus of 6 protons and 6 neutrons, and 6 electrons", orbits + nucleus);
  }

  window.CoverArt = { graph, energy, circuit, particles, atom };
})();
