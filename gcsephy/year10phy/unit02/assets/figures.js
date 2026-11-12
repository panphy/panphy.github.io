/* Line drawings for the Year 10 Particle Model of Matter workbook, Preps and teaching deck
   (window.ParticleFigures). Each function returns an SVG string styled by figures.css.
   Labels are plain text; the deck typesets the maths ones through window.DeckSvgTex. */
(function () {
  "use strict";

  const f = (n) => Math.round(n * 10) / 10;
  const svg = (w, h, body, label, cls) => `<svg class="pf${cls ? " " + cls : ""}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  const t = (x, y, s, cls, anchor) => `<text x="${f(x)}" y="${f(y)}" class="${cls || ""}" text-anchor="${anchor || "middle"}">${s}</text>`;
  const rng = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // A line with a filled head at (x2, y2). The shaft stops inside the head so the two join.
  const arrow = (x1, y1, x2, y2, cls, size) => {
    const a = Math.atan2(y2 - y1, x2 - x1), s = size || 7;
    return `<path class="ink ${cls || ""}" d="M${f(x1)} ${f(y1)} L${f(x2 - s * 0.8 * Math.cos(a))} ${f(y2 - s * 0.8 * Math.sin(a))}"/>` +
      `<path class="head ${cls || ""}" d="M0 0 L${-s * 1.5} ${-s * 0.72} L${-s * 1.5} ${s * 0.72} Z" transform="translate(${f(x2)} ${f(y2)}) rotate(${f(a * 180 / Math.PI)})"/>`;
  };
  const dot = (x, y, r, cls) => `<circle class="p ${cls || ""}" cx="${f(x)}" cy="${f(y)}" r="${r}"/>`;

  // ---------- particle arrangements (positions inside a box w × h, origin top left) ----------
  // A solid: neat rows and columns, touching, in a block that keeps its own shape (it does not
  // spread to the walls of the box).
  function solidPos(w, h, r, rows, cols) {
    const out = [], n = cols || Math.floor(w / (2 * r)) - 2;
    const left = (w - n * 2 * r) / 2;
    for (let j = 0; j < rows; j += 1) for (let i = 0; i < n; i += 1) out.push([left + r + i * 2 * r, h - r - j * 2 * r]);
    return out;
  }
  // A liquid: touching but in no pattern, spread across the bottom of its container. Each particle
  // is dropped straight down at a random place and stops where it first touches (the lowest of a
  // few tries, so the pile is dense but never falls into rows).
  function liquidPos(w, h, r, n, seed) {
    const rand = rng(seed || 7), ps = [];
    for (let i = 0; i < n; i += 1) {
      let best = null;
      for (let k = 0; k < 4; k += 1) {
        const x = r + rand() * (w - 2 * r);
        let y = h - r;
        ps.forEach(([a, b]) => { const dx = Math.abs(a - x); if (dx < 2 * r) y = Math.min(y, b - Math.sqrt(4 * r * r - dx * dx)); });
        if (!best || y > best[1]) best = [x, y];
      }
      ps.push(best);
    }
    return ps;
  }
  function gasPos(w, h, r, n, seed, gap) {
    const rand = rng(seed || 11), ps = [];
    let guard = 0;
    while (ps.length < n && guard < 2000) {
      guard += 1;
      const x = r * 2 + rand() * (w - 4 * r), y = r * 2 + rand() * (h - 4 * r);
      if (ps.every(([a, b]) => Math.hypot(a - x, b - y) > (gap || 5.5) * r)) ps.push([x, y, rand() * Math.PI * 2]);
    }
    return ps;
  }

  // One box of particles. kind: solid, liquid, gas. opts: { n, tails, seed, cls }
  function particleBox(kind, x, y, w, h, r, opts) {
    const o = opts || {};
    let ps, extra = "";
    if (kind === "solid") ps = solidPos(w, h, r, o.rows || 5);
    else if (kind === "liquid") ps = liquidPos(w, h, r, o.n || solidPos(w, h, r, o.rows || 5).length, o.seed);
    else {
      ps = gasPos(w, h, r, o.n || 7, o.seed);
      if (o.tails !== false) extra = ps.map(([a, b, d]) => { const L = o.fast ? 20 : 12; return arrow(x + a + (r + 1) * Math.cos(d), y + b + (r + 1) * Math.sin(d), x + a + (r + L) * Math.cos(d), y + b + (r + L) * Math.sin(d), "thin move", 4); }).join("");
    }
    return `<rect class="ink paper" x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/>${extra}${ps.map(([a, b]) => dot(x + a, y + b, r, o.cls || kind)).join("")}`;
  }

  // Solid, liquid and gas side by side. opts.labels false leaves the names off (for a question).
  function states(opts) {
    const o = opts || {}, names = o.names || ["Solid", "Liquid", "Gas"];
    const kinds = ["solid", "liquid", "gas"];
    const body = kinds.map((k, i) => particleBox(k, 12 + i * 122, 10, 108, 108, 6) + (o.labels === false ? t(66 + i * 122, 137, "ABC"[i], "lg") : t(66 + i * 122, 137, names[i], "lg"))).join("");
    return svg(378, 146, body, o.labels === false ? "Three particle diagrams labelled A, B and C" : "Particle diagrams of a solid, a liquid and a gas");
  }
  const oneState = (kind) => svg(132, 132, particleBox(kind, 12, 12, 108, 108, 6), `Particle diagram of a ${kind}`);

  // Changes of state: the three states at the corners of a triangle, joined by named arrows.
  // opts.blank swaps the names for lettered answer boxes (the names show in the answer edition).
  function changes(opts) {
    const o = opts || {};
    const name = (x, y, s, letter) => (o.blank
      ? `<rect class="blank-box" x="${x - 40}" y="${y - 13}" width="80" height="18"/>${t(x - 34, y, letter, "b", "start")}${t(x + 4, y, s.replace(" or evaporating", ""), "ans")}`
      : s.split(" or ").map((part, i, all) => t(x, y - (all.length - 1 - i) * 14, part + (i < all.length - 1 ? " or" : ""), "b")).join(""));
    let b = particleBox("gas", 181, 8, 78, 78, 5, { n: 5, seed: 3, tails: false }) + particleBox("solid", 20, 196, 78, 78, 5, { rows: 4 }) + particleBox("liquid", 342, 196, 78, 78, 5, { seed: 5 });
    b += t(220, 104, "Gas", "lg") + t(59, 292, "Solid", "lg") + t(381, 292, "Liquid", "lg");
    // bottom side: solid and liquid
    b += arrow(104, 222, 336, 222, "s-hot") + name(220, 214, "melting", "A") + arrow(336, 250, 104, 250, "s-cool") + name(220, 268, "freezing", "B");
    // right side: liquid and gas
    b += arrow(344, 185, 270, 90, "s-hot") + name(356, 122, "boiling or evaporating", "C") + arrow(257, 100, 331, 195, "s-cool") + name(258, 168, "condensing", "D");
    // left side: solid straight to gas
    b += arrow(76, 190, 176, 92, "s-hot") + name(80, 134, "sublimating", "E");
    return svg(440, 300, b, "Solid, liquid and gas at the corners of a triangle, joined by arrows for the changes of state");
  }

  // A cuboid with its three dimensions written beside it.
  function cuboid(l, w, h, opts) {
    const o = opts || {};
    const b = `<path class="ink ${o.cls || "soft"}" d="M40 60 H170 V130 H40 Z"/><path class="ink ${o.cls || "soft"}" d="M40 60 L72 34 H202 L170 60 Z"/><path class="ink mid" d="M170 60 L202 34 V104 L170 130 Z"/>` +
      t(105, 148, l, "b") + t(204, 126, w, "b", "start") + t(214, 72, h, "b", "start") + (o.name ? t(105, 100, o.name, "lg") : "");
    return svg(270, 156, b, `A cuboid ${l} long, ${w} wide and ${h} high`);
  }

  // Measuring cylinder: liquid level as a fraction, an optional object and a reading.
  function cylinder(x, level, opts) {
    const o = opts || {}, top = 30, bot = 150, w = 46, y = bot - level * (bot - top);
    let b = `<path class="water" d="M${x} ${f(y)} H${x + w} V${bot} H${x} Z"/>`;
    if (o.stone) b += `<path class="ink stone" d="M${x + 11} ${bot - 4} l5 -14 l12 -5 l9 9 l-2 11 Z"/><path class="ink thin" d="M${x + 24} ${bot - 23} V${top - 14}"/>`;
    b += `<path class="ink" d="M${x} ${top - 8} V${bot} H${x + w} V${top - 8}"/><path class="ink" d="M${x - 9} ${bot} H${x + w + 9}"/>`;
    for (let i = 0; i <= 10; i += 1) { const yy = bot - (i / 10) * (bot - top); b += `<path class="ink thin" d="M${x} ${f(yy)} h${i % 5 ? 6 : 11}"/>`; }
    if (o.reading) b += `<path class="ink thin dash" d="M${x + w} ${f(y)} H${x + w + 16}"/>` + t(x + w + 19, y + 4, o.reading, "b", "start");
    if (o.label) b += t(x + w / 2, bot + 18, o.label, "sm");
    return b;
  }
  const displacement = (opts) => {
    const o = opts || {};
    return svg(330, 176, cylinder(34, 0.5, { reading: o.v1 || "50 cm³", label: "before" }) + arrow(150, 90, 180, 90, "", 6) + cylinder(196, 0.68, { reading: o.v2 || "68 cm³", stone: true, label: "after" }),
      "A measuring cylinder before and after a stone is lowered into the water: the level rises");
  };
  // Displacement (eureka) can with a measuring cylinder catching the water.
  function eurekaCan() {
    const b = `<path class="water" d="M32 62 H128 V140 H32 Z"/><path class="ink" d="M32 40 V140 H128 V62 M128 54 V40"/><path class="ink" d="M128 54 L160 66 M128 62 L156 73"/>` +
      `<path class="ink stone" d="M62 132 l8 -22 l20 -8 l14 14 l-4 18 Z"/><path class="ink thin" d="M82 100 V22"/>` +
      `<path class="drop" d="M159 78 q4 8 0 11 q-4 -3 0 -11 Z"/><path class="drop" d="M160 98 q4 8 0 11 q-4 -3 0 -11 Z"/>` +
      `<path class="water" d="M140 132 H180 V160 H140 Z"/><path class="ink" d="M140 86 V160 H180 V86"/><path class="ink" d="M132 160 H188"/>` +
      [0, 1, 2, 3, 4, 5].map((i) => `<path class="ink thin" d="M140 ${150 - i * 11} h${i % 2 ? 6 : 10}"/>`).join("") +
      t(80, 14, "thread", "sm") + t(24, 176, "displacement can, filled to the spout", "sm", "start") + t(196, 126, "measuring", "sm", "start") + t(196, 139, "cylinder", "sm", "start");
    return svg(270, 184, b, "A stone lowered into a displacement can; the water pushed out is caught in a measuring cylinder");
  }
  // Top-pan balance with something on it.
  const balance = (x, y, reading) => `<path class="ink mid" d="M${x} ${y} h92 l8 26 h-108 Z"/><path class="ink paper" d="M${x + 6} ${y - 7} h80 v7 h-80 Z"/><rect class="ink paper" x="${x + 22}" y="${y + 7}" width="48" height="14" rx="2"/>${t(x + 46, y + 18.5, reading, "read")}`;
  function liquidDensity() {
    const cyl = (x, level, r) => { const top = 26, bot = 118, w = 34, yy = bot - level * (bot - top); return (level ? `<path class="water" d="M${x} ${f(yy)} H${x + w} V${bot} H${x} Z"/>` : "") + `<path class="ink" d="M${x} ${top - 6} V${bot} H${x + w} V${top - 6}"/>` + [1, 2, 3, 4, 5, 6, 7].map((i) => `<path class="ink thin" d="M${x} ${bot - i * 11.5} h${i % 2 ? 5 : 9}"/>`).join("") + (r ? t(x + w + 6, yy + 4, r, "b", "start") : ""); };
    const b = cyl(46, 0) + balance(17, 125, "62.0 g") + t(63, 170, "empty cylinder", "sm") + cyl(206, 0.62, "50 cm³") + balance(177, 125, "112.0 g") + t(223, 170, "cylinder + liquid", "sm");
    return svg(320, 178, b, "A measuring cylinder on a balance, first empty and then holding 50 cubic centimetres of liquid");
  }

  // Temperature–time graph. kind "heat" (ice to steam) or "cool" (a liquid cooling and freezing).
  // opts: { letters, labels, values, w, h }
  function curve(kind, opts) {
    const o = Object.assign({ labels: true }, opts), L = 52, T = 14, W = o.w || 330, H = o.h || 170, B = T + H;
    const pts = kind === "cool"
      ? [[0, 0.92], [0.24, 0.5], [0.62, 0.5], [1, 0.14]]
      : [[0, 0.06], [0.12, 0.26], [0.34, 0.26], [0.56, 0.74], [0.86, 0.74], [1, 0.94]];
    const X = (u) => L + u * W, Y = (v) => B - v * H;
    let b = `<path class="axis" d="M${L} ${T - 6} V${B} H${L + W + 8}"/>` + t(L + W / 2, B + (o.values ? 34 : 22), kind === "cool" ? "Time" : "Time (heated at a steady rate)", "b") +
      `<text class="b" text-anchor="middle" transform="translate(${o.values ? 12 : 22} ${T + H / 2}) rotate(-90)">Temperature${o.values ? " / °C" : ""}</text>`;
    if (o.values) o.values.forEach(([v, s]) => { b += `<path class="ink thin dash" d="M${L} ${f(Y(v))} H${L + W}"/>` + t(L - 6, Y(v) + 4, s, "sm", "end"); });
    b += `<path class="curve" d="${pts.map(([u, v], i) => `${i ? "L" : "M"}${f(X(u))} ${f(Y(v))}`).join(" ")}"/>`;
    const mid = (i) => [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
    if (o.letters) pts.slice(0, -1).forEach((_, i) => { const [u, v] = mid(i); const flat = pts[i][1] === pts[i + 1][1]; b += t(X(u) + (flat ? 0 : 13), Y(v) + (flat ? -8 : 15), "ABCDE"[i], "lg"); });
    else if (o.labels) {
      const names = kind === "cool" ? [["liquid cooling", 12, -4, "start"], ["freezing", 0, -9], ["solid cooling", 12, -2, "start"]]
        : [["solid", 10, 6, "start"], ["melting", 0, -9], ["liquid", 12, 8, "start"], ["boiling", 0, -9], ["gas", 8, 12, "start"]];
      names.forEach(([s, dx, dy, a], i) => { const [u, v] = mid(i); b += t(X(u) + dx, Y(v) + dy, s, "b", a); });
    }
    return svg(L + W + 14, B + (o.values ? 42 : 30), b, kind === "cool" ? "Cooling curve: the temperature falls, stays constant while the liquid freezes, then falls again" : "Heating curve: sloping sections where the temperature rises and two flat sections where the state changes");
  }

  // A gas in a sealed box: particles with motion tails, and purple arrows inside the box for the
  // push of the gas on every wall (longer arrows for the hotter gas, which pushes harder).
  function gasBox(opts) {
    const o = opts || {}, W = 150, H = 120, y0 = 14;
    const one = (x, label, fast) => {
      const L = fast ? 22 : 12, r = 6, inset = 26;
      const ps = gasPos(W - 2 * inset, H - 2 * inset, r, 7, fast ? 21 : 9, 4);
      let b = `<rect class="ink paper" x="${x}" y="${y0}" width="${W}" height="${H}" rx="3"/>`;
      b += ps.map(([a, c, d]) => { const px = x + inset + a, py = y0 + inset + c, tail = fast ? 17 : 9; return arrow(px + (r + 1) * Math.cos(d), py + (r + 1) * Math.sin(d), px + (r + tail) * Math.cos(d), py + (r + tail) * Math.sin(d), "thin move", 4) + dot(px, py, r, "gas"); }).join("");
      [0.3, 0.7].forEach((u) => {
        b += arrow(x + L + 3, y0 + u * H, x + 2, y0 + u * H, "s-force", 5) + arrow(x + W - L - 3, y0 + u * H, x + W - 2, y0 + u * H, "s-force", 5) +
          arrow(x + u * W, y0 + L + 3, x + u * W, y0 + 2, "s-force", 5) + arrow(x + u * W, y0 + H - L - 3, x + u * W, y0 + H - 2, "s-force", 5);
      });
      return b + t(x + W / 2, y0 + H + 18, label, "b");
    };
    const key = (x) => arrow(x, y0 + H + 36, x + 18, y0 + H + 36, "s-force", 5) + t(x + 24, y0 + H + 40, "push of the gas on the wall", "sm", "start");
    const b = o.pair ? one(14, "cooler gas", false) + one(196, "hotter gas, same box", true) + key(104) : one(14, o.label || "gas in a sealed box", false) + key(10);
    return svg(o.pair ? 360 : 178, y0 + H + 48, b, o.pair ? "Two sealed boxes of gas: in the hotter one the particles move faster and push harder on every wall" : "Gas particles moving in random directions inside a sealed box; arrows inside the box show the gas pushing outwards on every wall");
  }

  // Required practical: an insulated metal block with an immersion heater and a thermometer.
  // meter "vi": supply, ammeter in series and voltmeter across the heater; otherwise a joulemeter.
  function shc(opts) {
    const o = opts || {}, vi = o.meter === "vi";
    let b = `<rect class="ink insul" x="150" y="80" width="120" height="104" rx="6"/><rect class="ink metal" x="162" y="92" width="96" height="84"/>` +
      `<rect class="ink heater" x="180" y="56" width="14" height="96" rx="3"/>` +
      `<rect class="ink paper" x="229" y="30" width="6" height="124" rx="3"/><path class="merc" d="M232 150 V84"/><circle class="ink bulb" cx="232" cy="152" r="4"/>` +
      t(210, 200, "metal block (1 kg) in insulation", "sm") + t(242, 42, "thermometer", "sm", "start") + t(174, 72, "heater", "sm", "end");
    if (vi) {
      b += `<path class="ink" d="M183 56 V44 H122 M98 44 H48 V120 M191 56 V14 H24 V120"/>` +
        `<circle class="ink paper" cx="110" cy="44" r="12"/>${t(110, 48.5, "A", "b")}` +
        `<path class="ink thin" d="M150 14 V19 M150 39 V44"/><circle class="ink paper" cx="150" cy="29" r="10"/>${t(150, 33.5, "V", "b")}` +
        `<rect class="ink mid" x="10" y="120" width="52" height="34" rx="4"/>${t(36, 141, "12 V", "b")}${t(36, 168, "power supply", "sm")}`;
    } else {
      b += `<path class="ink" d="M183 56 V44 H62 V96 M191 56 V30 H36 V96"/>` +
        `<rect class="ink mid" x="12" y="96" width="74" height="50" rx="4"/><rect class="ink paper" x="22" y="103" width="54" height="16" rx="2"/>${t(49, 115.5, "0 J", "read")}${t(49, 137, "joulemeter", "sm")}` +
        `<path class="ink" d="M36 146 V158 M62 146 V158"/>` + t(49, 172, "to the 12 V supply", "sm");
    }
    return svg(320, 208, b, vi ? "An insulated metal block with an immersion heater and a thermometer; an ammeter in series with the heater and a voltmeter across it" : "An insulated metal block with an immersion heater and a thermometer; a joulemeter measures the energy supplied");
  }

  // Latent heat of fusion: heater in a funnel of ice, with a control funnel beside it.
  function iceFunnels() {
    const funnel = (x, heater) => `<path class="ink ice" d="M${x} 50 H${x + 90} L${x + 53} 108 V126 H${x + 37} V108 Z"/>` +
      [[18, 62], [40, 60], [62, 63], [30, 78], [54, 80], [42, 96]].map(([a, c]) => `<rect class="ink thin paper" x="${x + a}" y="${c}" width="13" height="11" rx="2"/>`).join("") +
      (heater ? `<rect class="ink heater" x="${x + 39}" y="26" width="12" height="62" rx="3"/><path class="ink thin" d="M${x + 42} 26 V10 M${x + 48} 26 V10"/>` : "") +
      `<path class="drop" d="M${x + 45} 132 q4 8 0 11 q-4 -3 0 -11 Z"/><path class="water" d="M${x + 23} ${heater ? 158 : 172} H${x + 67} V180 H${x + 23} Z"/><path class="ink" d="M${x + 23} 146 V180 H${x + 67} V146"/>` +
      balance(x - 1, 184, heater ? "42.0 g" : "6.0 g") + t(x + 45, 228, heater ? "heater on" : "control: no heater", "sm");
    return svg(290, 236, funnel(26, true) + funnel(168, false) + t(74, 8, "to the joulemeter", "sm"),
      "Two funnels of crushed ice over beakers on balances: one has an immersion heater, the other is a control");
  }

  // Triple only: a gas syringe at three volumes, and the pressure–volume graph.
  function syringes() {
    const one = (y, v, p, big) => {
      const x0 = 40, len = big;
      return `<rect class="ink paper" x="${x0}" y="${y}" width="230" height="34" rx="3"/>` + gasPos(len - 6, 30, 3.4, 9, 31 + big, 2.6).map(([a, c]) => dot(x0 + 3 + a, y + 2 + c, 3.4, "gas")).join("") +
        `<rect class="ink mid" x="${x0 + len}" y="${y + 2}" width="10" height="30"/><path class="ink bold" d="M${x0 + len + 10} ${y + 17} H${x0 + 250}"/><path class="ink bold" d="M${x0 + 250} ${y + 6} V${y + 28}"/>` +
        t(304, y + 14, v, "b", "start") + t(304, y + 30, p, "b", "start");
    };
    return svg(420, 150, one(8, "V = 60 cm³", "p = 100 kPa", 180) + one(56, "V = 30 cm³", "p = 200 kPa", 90) + one(104, "V = 20 cm³", "p = 300 kPa", 60),
      "The same gas in a syringe at three volumes: as the volume gets smaller, the pressure gets bigger");
  }
  function pvGraph() {
    const L = 46, T = 12, W = 220, H = 140, B = T + H, k = 6000;
    const X = (v) => L + (v / 70) * W, Y = (p) => B - (p / 350) * H;
    let d = "", b = `<path class="axis" d="M${L} ${T - 6} V${B} H${L + W + 8}"/>`;
    for (let v = 17.5; v <= 68; v += 2.5) d += `${d ? "L" : "M"}${f(X(v))} ${f(Y(k / v))} `;
    b += `<path class="curve" d="${d}"/>` + [[20, 300], [30, 200], [60, 100]].map(([v, p]) => `<circle class="pt" cx="${f(X(v))}" cy="${f(Y(p))}" r="4"/>`).join("") +
      [20, 40, 60].map((v) => t(X(v), B + 14, v, "sm")).join("") + [100, 200, 300].map((p) => t(L - 6, Y(p) + 4, p, "sm", "end")).join("") +
      t(L + W / 2, B + 30, "Volume / cm³", "b") + `<text class="b" text-anchor="middle" transform="translate(12 ${T + H / 2}) rotate(-90)">Pressure / kPa</text>`;
    return svg(L + W + 14, B + 38, b, "Graph of pressure against volume for a gas at constant temperature: a curve that falls as the volume increases");
  }
  // Triple only: a bicycle pump with a blocked outlet.
  function pump() {
    const b = `<rect class="ink paper" x="60" y="52" width="210" height="46" rx="4"/>` + gasPos(96, 40, 4, 10, 17).map(([a, c]) => dot(64 + a, 55 + c, 4, "gas")).join("") +
      `<rect class="ink mid" x="164" y="55" width="12" height="40"/><path class="ink bold" d="M176 75 H330"/><path class="ink bold" d="M330 56 V94"/>` +
      `<path class="ink solid" d="M52 68 h8 v14 h-8 Z"/>` + arrow(318, 30, 262, 30, "s-force", 7) + t(290, 20, "force", "b") + t(110, 44, "trapped air", "sm") + t(48, 112, "outlet blocked", "sm", "start") + t(250, 118, "work is done on the gas", "b");
    return svg(350, 128, b, "A bicycle pump with its outlet blocked: a force pushes the piston in and squashes the trapped air");
  }

  // Cover: a heating curve with a solid, a liquid and a gas box beside the section each belongs to.
  function coverArt() {
    const box = (kind, x, y, n) => `<g transform="translate(${x} ${y})">${particleBox(kind, 0, 0, 62, 62, 4.2, { rows: 4, n, seed: 5, tails: false })}</g>`;
    const b = `<path class="axis" d="M30 6 V210 H470"/><path class="curve" d="M30 196 L84 150 L190 150 L282 70 L400 70 L462 26"/>` +
      box("solid", 46, 66) + box("liquid", 262, 104) + box("gas", 396, 96, 6);
    return svg(480, 216, b, "A heating curve with particle diagrams of a solid, a liquid and a gas", "on-dark");
  }

  window.ParticleFigures = { states, oneState, changes, cuboid, displacement, eurekaCan, liquidDensity, curve, gasBox, shc, iceFunnels, syringes, pvGraph, pump, coverArt, particleBox, positions: { solidPos, liquidPos, gasPos } };
})();
