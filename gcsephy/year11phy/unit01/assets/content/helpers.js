/* Shared helpers and diagrams for the Atoms and Nuclear Radiation workbook content.
   Diagrams reuse the teaching deck's figures and drawing parts (window.DeckFigures), so the
   booklets look like the slides. The lesson files push into WB.lessons; reference.js builds
   window.UNIT. Block types are documented in ../workbook.js; `a` holds an answer that only
   the answer edition shows. All questions are original. */
(function () {
  "use strict";

  const F = window.DeckFigures;
  const P = F.parts;
  const A = (h) => `<span class="ans">${h}</span>`;

  // Nuclide notation: mass number over atomic number, left of the symbol.
  const N = (a, z, sym, cls = "") => `<span class="nuc ${cls}"><span class="nums"><span>${a}</span><span>${z}</span></span>${sym}</span>`;
  const ALPHA = N(4, 2, "He", "alpha");
  const BETA = N(0, "−1", "e", "electron");
  const GAMMA = '<span class="nuc gamma">γ</span>';
  const NEUTRON = N(1, 0, "n", "neutron");

  // A nuclear equation. "→" and "+" become operators; GAP(answer) is a box to fill in.
  const GAP = (answer) => `<span class="gap">${A(answer)}</span>`;
  const EQ = (parts, check) => `<div class="nuc-eq">${parts.map((p) => (p === "→" || p === "+" ? `<span class="op">${p}</span>` : p)).join("")}${check ? `<span class="check">${check}</span>` : ""}</div>`;

  const dfig = (svg, caption, cls = "", mh) => `<figure class="dfig ${cls}"${mh ? ` style="--mh:${mh}mm"` : ""}>${svg}${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`;
  const deckFig = (name, caption, cls, mh) => dfig(F.figure(name), caption, cls, mh);

  /* A Bohr-style atom: nucleus of p protons and n neutrons, electrons shared evenly on
     rings (shells, e.g. [2, 1]). electrons: "show" | "answer" (answer edition only) | "none".
     labels: [[letter, x, y, targetX, targetY]] draws leader lines to lettered circles. */
  function atom({ p, n, shells, r = 13, electrons = "show", labels = [], size = 360, ringR = [70, 125, 170] }) {
    const c = size / 2;
    let s = shells.map((_, i) => P.ring(c, c, ringR[i])).join("");
    s += P.cluster(c, c, p, n, r);
    let e = "";
    shells.forEach((count, i) => {
      for (let k = 0; k < count; k += 1) {
        const a = -Math.PI / 2 + (k * 2 * Math.PI) / count + i * 0.5;
        e += P.ball(c + ringR[i] * Math.cos(a), c + ringR[i] * Math.sin(a), 12, "electron");
      }
    });
    if (electrons === "show") s += e;
    if (electrons === "answer") s += `<g class="ans-only">${e}</g>`;
    labels.forEach(([letter, x, y, tx, ty]) => {
      s += `<line class="leader" x1="${x}" y1="${y}" x2="${tx}" y2="${ty}"/><circle class="blank-box" cx="${x}" cy="${y}" r="15"/>` + P.text(x, y + 7, letter, "lbl strong");
    });
    return P.svg(`0 0 ${size} ${size}`, s, `Atom with ${p} protons and ${n} neutrons`);
  }

  // Energy levels n = 1, 2, 3 around a hydrogen nucleus; an electron moves from one level to another.
  function levelsMini(from, to) {
    const c = 110, R = [38, 66, 94], a = -0.8;
    let s = R.map((r) => P.ring(c, c, r)).join("") + P.ball(c, c, 11, "proton");
    const pt = (lvl) => [c + R[lvl - 1] * Math.cos(a), c + R[lvl - 1] * Math.sin(a)];
    const [fx, fy] = pt(from), [tx, ty] = pt(to);
    const k = to > from ? 1 : -1;
    s += `<circle cx="${fx}" cy="${fy}" r="10" class="ghost"/>` + P.ball(tx, ty, 10, "electron");
    s += P.arrow(fx + 12 * k * Math.cos(a), fy + 12 * k * Math.sin(a), tx - 14 * k * Math.cos(a), ty - 14 * k * Math.sin(a), "brand-accent", 3);
    s += P.text(c - 38, c + 34, "1", "lbl mono small") + P.text(c - 66, c + 50, "2", "lbl mono small") + P.text(c - 94, c + 66, "3", "lbl mono small");
    return P.svg("0 0 220 220", s, `An electron moves from energy level ${from} to energy level ${to}`);
  }

  // Three alpha particles heading for a gold nucleus; students draw where each goes next.
  function alphaPaths() {
    const nx = 300, ny = 160;
    let s = P.ball(nx, ny, 20, "positive") + P.text(nx, ny + 52, "gold nucleus", "lbl small");
    [[40, "A"], [120, "B"], [160, "C"]].forEach(([y, label]) => {
      s += P.text(14, y + 7, label, "lbl strong", "start") + P.ball(46, y, 9, "alpha") + `<line x1="58" y1="${y}" x2="140" y2="${y}" class="alpha-path" style="opacity:1" marker-end="url(#m-alpha)"/>`;
    });
    s += '<path class="ans-path" d="M150 40 H560"/>';
    s += '<path class="ans-path" d="M150 120 C230 120 262 112 290 94 L440 66" marker-end="url(#m-electron)"/>';
    s += '<path class="ans-path" d="M150 160 H262 Q274 160 262 155 L150 146"/>';
    return P.svg("0 0 580 230", s, "Three alpha particles A, B and C moving towards a gold nucleus");
  }

  // Uranium-235 absorbs a neutron and splits into barium-141, krypton-92 and three neutrons.
  function fission() {
    let s = P.ball(34, 150, 11, "neutron") + P.arrow(50, 150, 120, 150, "neutron", 2.5);
    s += P.cluster(190, 150, 92, 143, 5.5) + P.text(190, 232, "uranium-235", "lbl strong");
    s += P.arrow(262, 132, 330, 96, "text-secondary", 2.5) + P.arrow(262, 168, 330, 204, "text-secondary", 2.5);
    s += P.cluster(390, 80, 56, 85, 5.5) + P.text(390, 150, "barium-141", "lbl strong");
    s += P.cluster(390, 222, 36, 56, 5.5) + P.text(390, 284, "krypton-92", "lbl strong");
    [[520, 110], [540, 150], [520, 190]].forEach(([x, y]) => { s += P.arrow(462, 150 + (y - 150) * 0.4, x - 14, y, "neutron", 2.5) + P.ball(x, y, 11, "neutron"); });
    s += P.wave(470, 40, 600, 30, { cycles: 4, amp: 7 }) + P.text(620, 34, "γ", "lbl greek", "start", 'style="fill:var(--photon)"');
    s += P.text(560, 250, "energy released", "lbl", "middle");
    return P.svg("0 0 660 300", s, "Fission: uranium-235 absorbs a neutron and splits into two smaller nuclei, three neutrons and gamma radiation");
  }

  // Single nuclei drawn with the deck's packing, for spotting isotopes.
  const nucleus = (p, n, r = 16, label) => P.svg("0 0 200 170", P.cluster(100, 78, p, n, r) + (label ? P.text(100, 158, label, "lbl mono") : ""), `Nucleus with ${p} protons and ${n} neutrons`);

  window.WB = { F, P, A, N, ALPHA, BETA, GAMMA, NEUTRON, GAP, EQ, dfig, deckFig, atom, levelsMini, alphaPaths, fission, nucleus, lessons: [] };
})();
