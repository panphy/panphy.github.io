/* Line drawings for the Year 9 Energy unit, shared by the workbook (workbook.js) and the
   teaching deck (gcsephy/decks/energy-stores-and-transfers). Each function returns an SVG
   string styled by figures.css. Forces are drawn from the point where they act. */
(function () {
  "use strict";

  const svg = (w, h, label, inner, cls) =>
    `<svg class="ef${cls ? " " + cls : ""}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">${inner}</svg>`;
  const t = (x, y, s, o = {}) =>
    `<text x="${x}" y="${y}" text-anchor="${o.a || "middle"}"${o.c ? ` class="${o.c}"` : ""}${o.r ? ` transform="rotate(${o.r} ${x} ${y})"` : ""}>${s}</text>`;
  // An arrow from (x1, y1) to (x2, y2) with a filled head; cls colours the line.
  function arrow(x1, y1, x2, y2, cls = "", head = 9) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    const bx = x2 - head * Math.cos(a), by = y2 - head * Math.sin(a);
    const px = (head * 0.5) * Math.sin(a), py = (head * 0.5) * Math.cos(a);
    const fill = cls.includes("s-hot") ? "hot" : cls.includes("s-cool") ? "cool" : "solid";
    return `<path class="ink ${cls}" d="M${x1} ${y1}L${bx.toFixed(1)} ${by.toFixed(1)}"/>` +
      `<path class="${fill}" d="M${x2} ${y2}L${(bx + px).toFixed(1)} ${(by - py).toFixed(1)}L${(bx - px).toFixed(1)} ${(by + py).toFixed(1)}Z"/>`;
  }
  // A double-headed dimension line, used for heights and lengths.
  function dim(x1, y1, x2, y2, label, side = 1) {
    const out = arrow((x1 + x2) / 2, (y1 + y2) / 2, x1, y1, "thin", 7) + arrow((x1 + x2) / 2, (y1 + y2) / 2, x2, y2, "thin", 7);
    const vertical = Math.abs(x2 - x1) < Math.abs(y2 - y1);
    const lx = vertical ? x1 + side * 8 : (x1 + x2) / 2, ly = vertical ? (y1 + y2) / 2 + 4 : y1 - 7;
    return out + t(lx, ly, label, { a: vertical ? (side > 0 ? "start" : "end") : "middle" });
  }

  // ---------- people and things ----------
  function person(x, y, s = 1) { // stands with feet at (x, y)
    return `<g transform="translate(${x} ${y}) scale(${s})" class="ink"><circle cx="0" cy="-62" r="8" class="ink paper"/>` +
      '<path class="ink" d="M0 -54V-24M0 -46L-12 -32M0 -46L12 -32M0 -24L-9 0M0 -24L9 0"/></g>';
  }
  // A cyclist on a bike, wheels touching y = 0 at x = 0 and 46, drawn along a slope (degrees).
  function bike(x, y, angle = 0, brake = false) {
    const g = `<circle class="ink paper" cx="0" cy="-14" r="14"/><circle class="ink paper" cx="46" cy="-14" r="14"/>` +
      '<path class="ink" d="M0 -14L20 -16L15 -40L0 -14M15 -40L40 -40L20 -16M40 -40L46 -14M40 -40L37 -48"/>' +
      '<circle class="ink paper" cx="31" cy="-74" r="7"/><path class="ink" d="M15 -42L27 -66L37 -48M15 -42L25 -30L20 -16"/>' +
      (brake ? '<path class="ink s-hot" d="M52 -30l6 -4M54 -20l8 0M52 -10l6 4"/>' : "");
    return `<g transform="translate(${x} ${y}) rotate(${angle})">${g}</g>`;
  }

  // ---------- Lesson 1: the energy story strip ----------
  function storyPanel(n, title, inner) {
    return `<figure class="ef-panel">${svg(170, 120, title, `<rect class="ink thin soft" x="1" y="1" width="168" height="118" rx="6"/>${t(14, 20, n, { a: "start", c: "lg" })}${inner}`)}<figcaption>${title}</figcaption></figure>`;
  }
  // Both hills rise/fall 50 units over 150; keep each bike's contact line on its hill.
  const HILL_ANGLE = Math.atan2(50, 150) * 180 / Math.PI;
  const storyStrip = () => [
    storyPanel("A", "Eating breakfast", '<path class="ink paper" d="M45 70h80a40 30 0 0 1 -80 0Z"/><path class="ink thin" d="M60 60c-4 -8 4 -12 0 -20M85 60c-4 -8 4 -12 0 -20M110 60c-4 -8 4 -12 0 -20"/><path class="ink" d="M30 104H140"/>'),
    storyPanel("B", "Cycling up the hill", '<path class="ink soft" d="M10 112L160 62V118H10Z"/>' + bike(62, 112 - (62 - 10) / 3, -HILL_ANGLE)),
    storyPanel("C", "Freewheeling down", '<path class="ink soft" d="M10 62L160 112V118H10Z"/>' + bike(68, 62 + (68 - 10) / 3, HILL_ANGLE) + '<path class="ink thin" d="M30 40h20M24 52h20"/>'),
    storyPanel("D", "Braking at the bottom", '<path class="ink soft" d="M10 104H160V118H10Z"/>' + bike(60, 104, 0, true)),
  ].join("");

  // ---------- Lesson 3: heights ----------
  // The book goes straight up through h, then across onto the shelf: only the vertical part counts.
  const shelf = () => svg(300, 190, "A 2.0 kg book lifted straight up from the floor through 1.5 m, then slid onto a shelf",
    '<path class="ink" d="M10 160H290"/><rect class="ink soft" x="150" y="40" width="130" height="8"/><path class="ink" d="M280 30V160"/>' +
    '<rect class="ink sun-t" x="190" y="18" width="40" height="22" rx="2"/><rect class="ink sun-t" x="40" y="138" width="40" height="22" rx="2"/>' +
    '<path class="ink thin dash" d="M60 132V29H182"/>' + arrow(60, 60, 60, 36, "", 7) + arrow(150, 29, 184, 29, "", 7) +
    dim(120, 160, 120, 40, "1.5 m", -1) + t(60, 180, "2.0 kg book"));

  const hike = () => svg(340, 190, "A hiker climbs from a car park 120 m above sea level to a summit 420 m above sea level",
    '<path class="ink cool-t" d="M5 178H335V186H5Z"/>' + t(300, 174, "sea level", { c: "sm muted" }) +
    '<path class="ink leaf-t" d="M5 178L50 140L90 132L180 26L250 178Z"/>' +
    '<path class="ink thin dash" d="M70 132H300M180 26H300"/><circle class="solid" cx="70" cy="132" r="3"/><circle class="solid" cx="180" cy="26" r="3"/>' +
    t(150, 160, "car park: 120 m", { c: "sm" }) + t(176, 18, "summit: 420 m", { a: "end", c: "sm" }) +
    dim(290, 132, 290, 26, "h", 1));

  // ---------- Lesson 4: springs ----------
  // A coil spring from (x, y1) to (x, y2).
  function coil(x, y1, y2, turns = 10, w = 12) {
    const step = (y2 - y1 - 12) / turns;
    let d = `M${x} ${y1}V${y1 + 6}`;
    for (let i = 0; i < turns; i += 1) d += `L${x + w} ${y1 + 6 + step * (i + 0.25)}L${x - w} ${y1 + 6 + step * (i + 0.75)}`;
    return `<path class="ink" d="${d}L${x} ${y2 - 6}V${y2}"/>`;
  }
  // Clamp stand, spring, hanger with n slotted masses, pointer and vertical metre rule.
  function springRig(n = 3) {
    const top = 40, len = 70 + n * 14, bottom = top + len;
    let masses = "";
    for (let i = 0; i < n; i += 1) masses += `<rect class="ink soft" x="96" y="${bottom + 16 + i * 9}" width="48" height="8" rx="1.5"/>`;
    let ticks = "";
    for (let i = 0; i <= 20; i += 1) ticks += `<path class="ink thin" d="M200 ${30 + i * 10}h${i % 5 ? 6 : 12}"/>`;
    return svg(300, 300, `Spring hanging from a clamp with ${n} slotted masses on a hanger, a pointer and a vertical metre rule`,
      '<rect class="ink mid" x="20" y="280" width="140" height="12" rx="2"/><path class="ink bold" d="M40 280V18"/>' +
      '<rect class="ink sun-t" x="32" y="26" width="16" height="16"/><path class="ink bold" d="M48 34H128"/>' +
      `<path class="ink" d="M120 34v6"/>${coil(120, top, bottom)}<path class="ink" d="M120 ${bottom}v8M106 ${bottom + 8}h28M120 ${bottom + 8}v${8 + n * 9 + 4}"/>${masses}` +
      `<path class="ink s-hot" d="M128 ${bottom + 3}H198"/>` +
      `<rect class="ink sun-t" x="196" y="24" width="22" height="212"/>${ticks}` +
      t(222, 20, "metre rule", { a: "start", c: "sm" }) + t(150, bottom - 3, "pointer", { a: "start", c: "sm t-hot" }) +
      t(120, bottom + 36 + n * 9, `${n} × 100 g`, { c: "sm" }) + t(54, 22, "clamp", { a: "start", c: "sm" }));
  }
  // Two forces stretch a spring: the clamp pulls up at the top, the load pulls down at the bottom.
  const twoForces = () => svg(220, 230, "Two forces on a stretched spring: the clamp pulls up at the top and the load pulls down at the bottom",
    '<path class="ink bold" d="M60 30H160"/>' + coil(110, 30, 170) +
    arrow(110, 30, 110, 4, "s-cool") + t(118, 14, "pull of the clamp", { a: "start", c: "sm t-cool" }) +
    arrow(110, 170, 110, 220, "s-hot") + t(118, 206, "pull of the load", { a: "start", c: "sm t-hot" }));
  // The same spring before and after a force acts: original length and extension marked.
  const extension = () => svg(330, 250, "A spring before and after stretching, with original length, stretched length and extension marked",
    '<path class="ink bold" d="M30 20H270"/>' + coil(90, 20, 110, 8) + coil(200, 20, 180, 8) +
    '<rect class="ink soft" x="186" y="180" width="28" height="18"/>' +
    '<path class="ink thin dash" d="M100 110H240"/>' +
    dim(56, 20, 56, 110, "", -1) + t(48, 62, "original", { a: "end" }) + t(48, 77, "length", { a: "end" }) + dim(250, 110, 250, 180, "extension", 1) +
    t(90, 236, "no load", { c: "sm" }) + t(200, 236, "with a load", { c: "sm" }));

  // ---------- Lesson 6: pendulum ----------
  function pendulum(labels = true) {
    const px = 160, py = 20, L = 170, a = 0.62;
    const ax = px - L * Math.sin(a), ay = py + L * Math.cos(a), bx = px, by = py + L, cx = px + L * Math.sin(a);
    return svg(320, 220, "A pendulum released from rest at A swings through its lowest point B to C on the other side",
      `<path class="ink bold" d="M110 ${py}H210"/><path class="ink thin dash" d="M${px} ${py}L${ax.toFixed(1)} ${ay.toFixed(1)}M${px} ${py}L${cx.toFixed(1)} ${ay.toFixed(1)}"/>` +
      `<path class="ink" d="M${px} ${py}V${by}"/><path class="ink thin dash" d="M${(ax - 30).toFixed(1)} ${ay.toFixed(1)}H${(cx + 30).toFixed(1)}M${(ax - 30).toFixed(1)} ${by}H${(cx + 30).toFixed(1)}"/>` +
      `<circle class="ink sun-t" cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="11"/><circle class="ink sun" cx="${bx}" cy="${by}" r="11"/><circle class="ink sun-t" cx="${cx.toFixed(1)}" cy="${ay.toFixed(1)}" r="11"/>` +
      (labels ? t(ax - 18, ay - 10, "A", { c: "lg" }) + t(bx + 20, by + 24, "B", { c: "lg" }) + t(cx + 18, ay - 10, "C", { c: "lg" }) : "") +
      dim(ax - 22, ay, ax - 22, by, "h", -1));
  }

  // An energy bar chart: one bar per store on a scale. values (or null) are drawn in the answer edition.
  function barChart({ stores = ["G.P.E.", "Kinetic", "Thermal"], max = 20, step = 5, unit = "J", values = null, title = "" }) {
    const W = 230, H = 150, L = 38, T = 22, bw = (W - L - 10) / stores.length;
    let out = "";
    for (let v = 0; v <= max; v += step) {
      const y = T + H - (v / max) * H;
      out += `<path class="grid" d="M${L} ${y}H${W}"/>` + t(L - 5, y + 4, v, { a: "end", c: "sm" });
    }
    out += `<path class="ink" d="M${L} ${T - 4}V${T + H}H${W}"/>` + t(8, T + H / 2, `energy / ${unit}`, { c: "sm", r: -90 });
    stores.forEach((s, i) => {
      const x = L + 6 + i * bw;
      out += t(x + (bw - 12) / 2, T + H + 15, s, { c: "sm" });
      if (values && values[i]) out += `<rect class="ink hot-t s-hot" x="${x}" y="${T + H - (values[i] / max) * H}" width="${bw - 12}" height="${(values[i] / max) * H}"/>`;
    });
    if (title) out += t(L + (W - L) / 2, 12, title, { c: "sm" });
    return svg(W + 6, H + T + 22, `Energy bar chart${title ? `: ${title}` : ""}`, out, "bars");
  }

  // ---------- Lesson 7: stairs ----------
  const stairs = () => {
    let d = "M20 200", x = 20, y = 200;
    for (let i = 0; i < 8; i += 1) { y -= 18; d += `V${y}`; x += 26; d += `H${x}`; }
    return svg(320, 220, "A student walks up a flight of stairs; the vertical height of the flight is marked h",
      `<path class="ink soft" d="${d}V200Z"/><path class="ink" d="M10 200H300"/>` + person(46, 182, 0.9) + person(238, 56, 0.9) +
      '<path class="ink thin dash" d="M228 56H288"/>' + dim(280, 200, 280, 56, "h", -1) + t(150, 216, "height of one step × number of steps", { c: "sm muted" }));
  };

  // ---------- Lesson 8: cooling cups and the eco house ----------
  function cups(names = ["none", "newspaper", "bubble wrap", "cotton wool"]) {
    const n = names.length, gap = 84;
    return svg(gap * n + 20, 170, "Identical cups of hot water, each wrapped in a different material, each with a thermometer",
      names.map((name, i) => {
        const x = 20 + i * gap + gap / 2 - 10;
        const wrap = i === 0 ? "" : `<path class="ink thin leaf-t" d="M${x - 30} 52L${x - 24} 136H${x + 24}L${x + 30} 52Z" style="stroke-dasharray:3 3"/>`;
        return wrap + `<path class="ink paper" d="M${x - 22} 56L${x - 17} 132H${x + 17}L${x + 22} 56Z"/><path class="ink cool-t" d="M${x - 20} 74L${x - 16} 130H${x + 16}L${x + 20} 74Z" style="stroke:none"/>` +
          `<rect class="ink mid" x="${x - 25}" y="48" width="50" height="8" rx="2"/><path class="ink" d="M${x + 6} 20V118"/><circle class="hot" cx="${x + 6}" cy="120" r="4"/>` + t(x, 156, name, { c: "sm" });
      }).join(""));
  }
  // House in cross-section with numbered places to annotate. Flat colors, and nothing that
  // gives away the answers: the cavity is empty, the window has one pane, the loft is bare.
  function house(marks = true) {
    const sky = "#d6eaf6", room = "#ffdfb8", brick = "#b4523a", cavity = "#33241f";
    const r = (x, y, w, h, fill, rx) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"${rx ? ` rx="${rx}"` : ""} fill="${fill}"/>`;
    const joists = [86, 114, 142, 170, 198, 226, 254].map((x) => r(x - 2, 96, 5, 6, "#8a6239")).join("");
    const wall = (x) => r(x, 110, 10, 122, brick) + r(x + 10, 110, 6, 122, cavity) + r(x + 16, 110, 10, 122, brick);
    const lead = (x1, y1, x2, y2) => `<path class="ink thin" d="M${x1} ${y1}L${x2} ${y2}"/><circle class="ink thin paper" cx="${x2}" cy="${y2}" r="3"/>`;
    const badge = (x, y, n) => `<circle class="ink paper" cx="${x}" cy="${y}" r="10"/>${t(x, y + 4.5, n, { c: "sm" })}`;
    return svg(340, 262, "Cross-section of a house: a loft under the roof, brick walls with an empty cavity, a window, a floor and a door",
      r(0, 0, 340, 236, sky, 8) +
      '<g fill="#fff"><ellipse cx="50" cy="42" rx="24" ry="9"/><ellipse cx="62" cy="35" rx="13" ry="9"/><ellipse cx="292" cy="58" rx="22" ry="8"/><ellipse cx="282" cy="51" rx="12" ry="8"/></g>' +
      r(0, 232, 340, 30, "#7a5a40", 4) + r(0, 230, 340, 9, "#74a84a") +
      '<path d="M55 110L170 32L285 110Z" fill="#f7e8c9"/>' + joists +
      r(82, 110, 176, 108, room) + r(56, 102, 228, 8, "#b08a5e") + wall(56) + wall(258) +
      r(56, 134, 26, 46, "#eaf6fd") + r(67, 134, 4, 46, "#3f9bd1") + r(52, 178, 34, 4, "#f4f1ea") +
      r(258, 146, 26, 72, "#6f4522") + '<circle cx="255" cy="192" r="3" fill="#e0b13c"/><circle cx="287" cy="192" r="3" fill="#e0b13c"/>' +
      '<path d="M170 110V128" stroke="#6b5a48" stroke-width="1.6"/><path d="M158 140L164 128H176L182 140Z" fill="#ffc83d"/>' +
      r(122, 184, 96, 24, "#c9673f", 6) + r(114, 194, 16, 24, "#c9673f", 5) + r(210, 194, 16, 24, "#c9673f", 5) + r(130, 200, 80, 12, "#dd8259", 3) +
      r(82, 218, 176, 14, "#9c7448") +
      '<path d="M34 110L170 18L306 110L285 110L170 32L55 110Z" fill="#46536a"/>' +
      (marks ? lead(33, 157, 69, 157) + lead(33, 207, 69, 207) + lead(306, 172, 271, 172) + lead(170, 240, 170, 225) +
        badge(170, 74, "1") + badge(23, 207, "2") + badge(23, 157, "3") + badge(170, 250, "4") + badge(316, 172, "5") : ""));
  }

  // ---------- Lesson 9: bounce and Sankey ----------
  // The ball falls and bounces on the same vertical line: down arrow on the left of it, up arrow on the right.
  const bounce = () => svg(260, 230, "A ball dropped from height h1 falls straight down and bounces straight back up to a smaller height h2, measured against a vertical ruler",
    '<path class="ink" d="M10 214H250"/><rect class="ink sun-t" x="120" y="14" width="20" height="200"/>' +
    Array.from({ length: 21 }, (_, i) => `<path class="ink thin" d="M120 ${14 + i * 10}h${i % 5 ? 5 : 10}"/>`).join("") +
    '<circle class="ink thin dash" cx="90" cy="30" r="12" style="fill:none"/><circle class="ink hot-t" cx="90" cy="84" r="12"/>' +
    arrow(76, 50, 76, 196, "dash") + arrow(104, 196, 104, 104, "dash") +
    '<path class="ink thin dash" d="M40 42H120M40 96H120"/>' +
    dim(30, 42, 30, 214, "h₁", 1) + dim(200, 96, 200, 214, "h₂", -1));

  /* Sankey diagram. input, useful, wasted in the same unit; s = pixels per unit.
     Useful energy goes straight on; wasted energy bends down. Both arrows end in the same head:
     small barbs (barb) either side and a short point (head). */
  let sankeyId = 0;
  function sankey({ blend = true, input, useful, wasted, s = 1.6, unit = "J", inLabel = "input", useLabel = "useful", wasteLabel = "wasted" }) {
    const x0 = 100, xs = 190, xe = 330, y0 = 30, H = input * s, U = useful * s, Wd = wasted * s, r = 18;
    const head = 16, barb = 6, yc = y0 + H + r, R = r + Wd, yEnd = yc + 40, xMid = xs + (r + R) / 2;
    const useTip = `V${y0 - barb}L${xe + head} ${y0 + U / 2}L${xe} ${y0 + U + barb}V${y0 + U}`;
    const wasteTip = `H${xs + R + barb}L${xMid} ${yEnd + head}L${xs + r - barb} ${yEnd}H${xs + r}`;
    const use = `<path class="ink cool-t s-cool" d="M${xs} ${y0}H${xe}${useTip}H${xs}Z"/>`;
    const waste = `<path class="ink hot-t s-hot" d="M${xs} ${y0 + U}A${R} ${R} 0 0 1 ${xs + R} ${yc}V${yEnd}${wasteTip}V${yc}A${r} ${r} 0 0 0 ${xs} ${y0 + H}Z"/>`;
    const inp = `<rect class="ink soft" x="${x0}" y="${y0}" width="${xs - x0}" height="${H}"/>`;
    let arrows = inp + use + waste;
    if (blend) {
      const id = `sankey-blend-${++sankeyId}`;
      const gradient = (name, colour) => `<linearGradient id="${id}-${name}" gradientUnits="userSpaceOnUse" x1="${x0}" x2="${xs + 80}"><stop stop-color="var(--year-colour, #f6cea8)"/><stop offset="1" stop-color="${colour}"/></linearGradient>`;
      const usefulPath = `M${x0} ${y0}H${xe}${useTip}H${x0}Z`;
      const wastePath = `M${x0} ${y0 + U}H${xs}A${R} ${R} 0 0 1 ${xs + R} ${yc}V${yEnd}${wasteTip}V${yc}A${r} ${r} 0 0 0 ${xs} ${y0 + H}H${x0}Z`;
      const outline = `M${x0} ${y0}H${xe}${useTip}H${xs}A${R} ${R} 0 0 1 ${xs + R} ${yc}V${yEnd}${wasteTip}V${yc}A${r} ${r} 0 0 0 ${xs} ${y0 + H}H${x0}Z`;
      arrows = `<defs>${gradient('useful', 'var(--cyan, #3fd0e8)')}${gradient('waste', 'var(--hot, #ff8a4c)')}</defs><path fill="url(#${id}-useful)" d="${usefulPath}"/><path fill="url(#${id}-waste)" d="${wastePath}"/><path class="ink" fill="none" d="${outline}"/>`;
    }
    return svg(560, yEnd + head + 34, `Sankey diagram: ${input} ${unit} in, ${useful} ${unit} useful, ${wasted} ${unit} wasted`,
      arrows +
      t(x0 - 8, y0 + H / 2 - 2, inLabel, { a: "end", c: "lg" }) + t(x0 - 8, y0 + H / 2 + 18, `${input} ${unit}`, { a: "end", c: "lg" }) +
      t(xe + head + 8, y0 + U / 2 - 3, `${useful} ${unit}`, { a: "start", c: "lg" }) + t(xe + head + 8, y0 + U / 2 + 16, useLabel, { a: "start", c: "lg" }) +
      t(xs + R + 14, yEnd - 12, `${wasted} ${unit}`, { a: "start", c: "lg" }) + t(xs + R + 14, yEnd + 8, wasteLabel, { a: "start", c: "lg" }));
  }

  // ---------- cover ----------
  const coverArt = () => svg(600, 200, "A skateboard ramp: energy moves from the gravitational potential store to the kinetic store and back",
    '<path d="M20 30C120 30 180 180 300 180S480 30 580 30" fill="none" stroke="#fff" stroke-width="5"/>' +
    '<path d="M20 30C120 30 180 180 300 180S480 30 580 30V196H20Z" fill="rgba(255,255,255,.08)"/>' +
    '<circle cx="40" cy="22" r="10" fill="#ffd23f"/><circle cx="300" cy="170" r="10" fill="#3fd0e8"/><circle cx="560" cy="22" r="10" fill="#ffd23f"/>' +
    '<g font-family="Arial Black, Arial" font-weight="900" font-size="15" fill="#fff"><text x="62" y="20">G.P.E.</text><text x="300" y="124" text-anchor="middle">KINETIC</text><text x="538" y="20" text-anchor="end">G.P.E.</text></g>' +
    // The motion arrow sits just above the ball, clear of the track, with the label lifted above it.
    `<g aria-label="The ball is moving to the right">${arrow(280, 145, 326, 145, "", 10)}</g>`);

  window.EnergyFigures = { svg, t, arrow, dim, person, bike, storyStrip, shelf, hike, coil, springRig, twoForces, extension, pendulum, barChart, stairs, cups, house, bounce, sankey, coverArt };
})();
