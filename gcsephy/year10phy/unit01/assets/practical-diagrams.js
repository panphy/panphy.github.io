/* Teaching diagrams for the required practicals: bench layouts, graph skills and
   particle pictures. Each returns a <figure> (via Diagrams.circuit) so it renders
   the same on the practical pages and in the printed worksheets. Colours and text
   sizes are set inline so both stylesheets draw them identically. */
(function () {
  "use strict";

  const D = window.Diagrams;
  const INK = "#111827";
  const RED = "#c2410c";
  const BLUE = "#1d64b0";
  const COPPER = "#b87333";

  const t = (x, y, text, opts = {}) => {
    const { size = 12, weight = 700, anchor = "middle", fill = INK } = opts;
    return `<text x="${x}" y="${y}" text-anchor="${anchor}" style="font:${weight} ${size}px Arial, Helvetica, sans-serif;fill:${fill}">${text}</text>`;
  };
  // Multi-line label: lines are stacked 13 px apart from (x, y).
  const tl = (x, y, lines, opts = {}) => lines.map((line, i) => t(x, y + i * (opts.gap || 13), line, opts)).join("");
  const lead = (d, colour) => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="3" stroke-linecap="round"/>`;
  const terminal = (x, y, colour) => `<circle cx="${x}" cy="${y}" r="6" fill="${colour}" stroke="${INK}" stroke-width="1.5"/>`;
  const pointer = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#6b7280" stroke-width="1.3" stroke-dasharray="3 3"/>`;
  const arrow = (x1, y1, x2, y2, colour = INK) => {
    const a = Math.atan2(y2 - y1, x2 - x1);
    const h = (s) => `${(x2 - 9 * Math.cos(a + s)).toFixed(1)} ${(y2 - 9 * Math.sin(a + s)).toFixed(1)}`;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colour}" stroke-width="2.2"/><path d="M${x2} ${y2} L${h(0.45)} L${h(-0.45)} Z" fill="${colour}" stroke="none"/>`;
  };
  const meterBox = (x, y, letter, name, below) => `
    <rect x="${x}" y="${y}" width="84" height="58" rx="7" fill="#f4f1e8" stroke="${INK}" stroke-width="2"/>
    <path d="M${x + 16} ${y + 38} A26 26 0 0 1 ${x + 68} ${y + 38}" fill="#fff" stroke="${INK}" stroke-width="1.5"/>
    <line x1="${x + 42}" y1="${y + 38}" x2="${x + 55}" y2="${y + 21}" stroke="${RED}" stroke-width="2"/>
    ${t(x + 42, y + 53, letter, { size: 12, weight: 900 })}
    ${t(x + 42, below ? y + 76 : y - 8, name)}`;
  const clip = (x, y) => `<path d="M${x - 7} ${y - 18} L${x + 7} ${y - 18} L${x + 4} ${y} L${x - 4} ${y} Z" fill="#4b5563" stroke="${INK}" stroke-width="1.5"/><line x1="${x - 5}" y1="${y - 10}" x2="${x + 5}" y2="${y - 10}" stroke="#d1d5db" stroke-width="1.2"/>`;
  const art = (spec) => D.circuit({ w: spec.w, h: spec.h, extra: spec.svg, caption: spec.caption, label: spec.label });

  // Part A bench layout: what the wire practical looks like on the desk.
  function wireBench() {
    const x0 = 100; // 0 cm on the ruler
    const px = 3.3; // pixels per cm
    const slide = x0 + 50 * px;
    let ruler = `<rect x="80" y="132" width="370" height="26" fill="#f3e2b3" stroke="${INK}" stroke-width="1.5"/>`;
    for (let cm = 0; cm <= 100; cm += 10) {
      const x = x0 + cm * px;
      ruler += `<line x1="${x}" y1="132" x2="${x}" y2="${cm % 50 ? 140 : 145}" stroke="${INK}" stroke-width="1.2"/>`;
      if (cm % 50 === 0) ruler += t(x + (cm === 100 ? -3 : 3), 155, cm === 0 ? "0 cm" : String(cm), { size: 9, weight: 600, anchor: cm === 100 ? "end" : "start" });
    }
    const svg = `
      <rect x="20" y="28" width="118" height="72" rx="7" fill="#e3e8ee" stroke="${INK}" stroke-width="2"/>
      <circle cx="79" cy="55" r="13" fill="#fff" stroke="${INK}" stroke-width="1.5"/><line x1="79" y1="55" x2="86" y2="45" stroke="${INK}" stroke-width="2"/>
      ${t(79, 18, "power supply (about 2 V)")}
      ${terminal(45, 86, RED)}${terminal(113, 86, "#1f2937")}
      ${t(45, 76, "+", { size: 12, weight: 900 })}${t(113, 76, "−", { size: 12, weight: 900 })}
      ${meterBox(230, 26, "A", "ammeter")}
      ${terminal(248, 84, RED)}${terminal(296, 84, "#1f2937")}
      ${ruler}
      <line x1="92" y1="136" x2="444" y2="136" stroke="${COPPER}" stroke-width="2.4"/>
      ${lead(`M45 92 C45 116 ${x0} 102 ${x0} 118`, RED)}
      ${lead("M113 92 Q180 104 248 90", "#1f2937")}
      ${lead(`M296 90 C320 112 ${slide} 100 ${slide} 118`, "#1f2937")}
      ${clip(x0, 136)}${clip(slide, 136)}
      ${meterBox(230, 206, "V", "voltmeter", true)}
      ${terminal(252, 206, RED)}${terminal(292, 206, "#1f2937")}
      ${lead(`M${x0 - 6} 124 C40 150 60 222 252 206`, BLUE)}
      ${lead(`M${slide + 6} 124 C360 150 356 214 292 206`, BLUE)}
      ${arrow(slide - 2, 176, x0 + 2, 176)}${arrow(x0 + 2, 176, slide - 2, 176)}
      ${t((x0 + slide) / 2, 192, "length L", { size: 11 })}
      ${pointer(390, 136, 410, 108)}${tl(410, 90, ["wire taped", "along the ruler"], { size: 11, anchor: "start" })}
      ${t(x0 + 10, 122, "fixed clip", { size: 11, anchor: "start" })}${t(slide - 10, 122, "sliding clip", { size: 11, anchor: "end" })}`;
    return art({
      w: 480, h: 290, svg,
      caption: "On the bench: the ammeter is in series; the voltmeter leads clip on at the same points as the crocodile clips. Include a switch in the circuit.",
      label: "Bench layout: power supply, ammeter and wire on a metre ruler in series through a fixed and a sliding crocodile clip; voltmeter connected across the two clips",
    });
  }

  // Annotated graph: the six things that earn graph marks.
  function graphSkills() {
    const L = 70, R = 320, T = 34, B = 244;
    let grid = "";
    for (let x = L; x <= R; x += 25) grid += `<line x1="${x}" y1="${T}" x2="${x}" y2="${B}" stroke="#e5e7eb" stroke-width="1"/>`;
    for (let y = B; y >= T; y -= 21) grid += `<line x1="${L}" y1="${y}" x2="${R}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`;
    const X = (v) => L + v * 2.5; // 0–100 cm
    const Y = (v) => B - v * 35; // 0–6 Ω
    const pts = [[10, 0.67], [20, 1.22], [30, 1.78], [40, 2.32], [50, 3.4], [60, 3.44], [70, 3.95], [80, 4.51], [90, 5.06]];
    const cross = ([a, b]) => `<path d="M${X(a) - 4} ${Y(b) - 4} L${X(a) + 4} ${Y(b) + 4} M${X(a) - 4} ${Y(b) + 4} L${X(a) + 4} ${Y(b) - 4}" stroke="${INK}" stroke-width="2"/>`;
    let ticks = "";
    for (let v = 0; v <= 100; v += 20) ticks += t(X(v), B + 15, String(v), { size: 10, weight: 600 });
    for (let v = 0; v <= 6; v += 1) ticks += t(L - 8, Y(v) + 4, String(v), { size: 10, weight: 600, anchor: "end" });
    const note = (n, x, y, lines) => `<circle cx="${x}" cy="${y}" r="9" fill="${BLUE}"/>${t(x, y + 4, String(n), { size: 10, weight: 900, fill: "#fff" })}${tl(x + 14, y + 4, lines, { size: 11, weight: 600, anchor: "start" })}`;
    const tag = (n, x, y) => `<circle cx="${x}" cy="${y}" r="8" fill="${BLUE}"/>${t(x, y + 4, String(n), { size: 10, weight: 900, fill: "#fff" })}`;
    const svg = `
      ${grid}
      <line x1="${L}" y1="${B}" x2="${R}" y2="${B}" stroke="${INK}" stroke-width="2.2"/><line x1="${L}" y1="${B}" x2="${L}" y2="${T}" stroke="${INK}" stroke-width="2.2"/>
      ${ticks}
      ${t(L, T - 12, "resistance / Ω", { size: 11, anchor: "start" })}${t((L + R) / 2, B + 32, "length / cm", { size: 11 })}
      <line x1="${X(0)}" y1="${Y(0.12)}" x2="${X(100)}" y2="${Y(5.62)}" stroke="${RED}" stroke-width="2.4"/>
      ${pts.map(cross).join("")}
      <circle cx="${X(50)}" cy="${Y(3.4)}" r="11" fill="none" stroke="${BLUE}" stroke-width="2"/>
      ${tag(1, L - 38, T - 16)}${tag(2, L - 44, Y(3) - 12)}${tag(3, X(30) - 16, Y(1.78) - 10)}${tag(4, X(50) - 22, Y(3.4) - 12)}${tag(5, X(90) + 12, Y(5.06) + 22)}${tag(6, R - 44, T + 6)}
      ${note(1, 350, 40, ["Label both axes with", "quantity / unit"])}
      ${note(2, 350, 82, ["Even scales: equal", "steps, easy numbers"])}
      ${note(3, 350, 124, ["Plot small, neat", "crosses (×)"])}
      ${note(4, 350, 166, ["Circle an anomaly;", "leave it out of the line"])}
      ${note(5, 350, 208, ["One thin line of best fit,", "drawn with a ruler"])}
      ${note(6, 350, 250, ["Points should use at", "least half the grid"])}`;
    return art({
      w: 520, h: 290, svg,
      caption: "A good graph: the numbered checks are how graph marks are awarded.",
      label: "Annotated example graph of resistance against length, showing labelled axes, even scales, crosses, a circled anomaly, a ruled line of best fit and a well-used grid",
    });
  }

  // Part B: why a parallel branch lowers the total resistance.
  function currentPaths() {
    return D.circuit({
      w: 520, h: 275,
      wires: ["M30 40 H230 V160 H30 Z", "M290 40 H490 V160 H290 Z", "M340 160 V205 H440 V160"],
      parts: [["battery", 130, 40, "h"], ["resistor", 95, 160, "h", "R₁", "b"], ["resistor", 165, 160, "h", "R₂", "b"], ["battery", 390, 40, "h"], ["resistor", 390, 160, "h", "R₁", [0, -14]], ["resistor", 390, 205, "h", "R₂", "b"]],
      dots: [[340, 160], [440, 160]],
      flows: [[60, 40, "h-", "flow"], [30, 100, "v", "flow"], [130, 160, "h", "flow"], [230, 100, "v-", "flow"], [320, 40, "h-", "flow"], [290, 100, "v", "flow"], [357, 160, "h", "flow"], [357, 205, "h", "flow"], [490, 100, "v-", "flow"]],
      extra: tl(130, 208, ["Series: one path.", "The charge goes through R₁ and then R₂."], { size: 11, weight: 600 }) +
        tl(390, 252, ["Parallel: two paths. More current flows", "for the same p.d., so the total R is smaller."], { size: 11, weight: 600 }),
      caption: "Arrows show the conventional current. Adding a branch in parallel adds another path.",
      label: "Series circuit with a single current path through two resistors beside a parallel circuit where the current splits into two branches",
    });
  }

  // I–V: reversing the supply gives the negative readings.
  function reverseSupply() {
    const panel = (x, swapped) => {
      const plus = [x + 40, 70];
      const minus = [x + 100, 70];
      const toA = [x + 190, 38];
      const toC = [x + 190, 118];
      // Forward: the − lead goes to the ammeter. Reversed: the leads cross over.
      const a = swapped ? plus : minus;
      const c = swapped ? minus : plus;
      const colour = (term) => (term === plus ? RED : "#1f2937");
      return `
        <rect x="${x + 10}" y="36" width="120" height="56" rx="7" fill="#e3e8ee" stroke="${INK}" stroke-width="2"/>
        ${terminal(plus[0], plus[1], RED)}${terminal(minus[0], minus[1], "#1f2937")}
        ${t(plus[0], 58, "+", { size: 12, weight: 900 })}${t(minus[0], 58, "−", { size: 12, weight: 900 })}
        ${lead(`M${a[0]} ${a[1] + 6} C${a[0]} 130 ${x + 160} ${toA[1]} ${toA[0]} ${toA[1]}`, colour(a))}
        ${lead(`M${c[0]} ${c[1] + 6} C${c[0]} 140 ${x + 160} ${toC[1]} ${toC[0]} ${toC[1]}`, colour(c))}
        ${t(toA[0] + 4, toA[1] + 4, "to ammeter", { size: 10, weight: 600, anchor: "start" })}
        ${t(toC[0] + 4, toC[1] + 4, "to component", { size: 10, weight: 600, anchor: "start" })}`;
    };
    const svg = `${panel(0, false)}${t(70, 20, "Forward: record + values", { size: 11 })}
      <g transform="translate(0 150)">${panel(0, true)}${t(70, 20, "Reversed: swap the two leads", { size: 11 })}</g>`;
    return art({
      w: 300, h: 290, svg,
      caption: "Swap the two leads at the power supply. The meters now show negative readings: write the minus sign.",
      label: "Power supply with its two leads connected one way for forward readings, then swapped over for reversed readings",
    });
  }

  // I–V: matching the real diode to its symbol.
  function diodeWay() {
    const svg = `
      ${t(30, 22, "real diode", { size: 11, anchor: "start" })}
      <line x1="30" y1="50" x2="100" y2="50" stroke="#9ca3af" stroke-width="3"/><line x1="200" y1="50" x2="270" y2="50" stroke="#9ca3af" stroke-width="3"/>
      <rect x="100" y="34" width="100" height="32" rx="6" fill="#1f2937" stroke="${INK}" stroke-width="1.5"/>
      <rect x="176" y="34" width="12" height="32" fill="#d1d5db"/>
      ${pointer(182, 70, 182, 118)}${t(206, 94, "band", { size: 10, weight: 600, anchor: "start" })}
      ${t(30, 118, "symbol", { size: 11, anchor: "start" })}
      <line x1="30" y1="140" x2="270" y2="140" stroke="${INK}" stroke-width="2.5"/>
      <path d="M160 124 L160 156 L180 140 Z" fill="${INK}"/><line x1="182" y1="124" x2="182" y2="156" stroke="${INK}" stroke-width="2.5"/>
      ${arrow(60, 186, 240, 186, RED)}
      ${tl(150, 206, ["It conducts when the current flows", "towards the band (the bar)."], { size: 11, weight: 600 })}`;
    return art({
      w: 300, h: 240, svg,
      caption: "The band on the diode matches the bar in its symbol. Forward: current flows towards the band.",
      label: "A real diode with a band at one end drawn above its circuit symbol, showing the band matches the bar and current flows towards it",
    });
  }

  // I–V: why a hot filament has more resistance.
  function filament() {
    const panel = (x0, hot) => {
      let s = `<rect x="${x0}" y="30" width="220" height="130" rx="8" fill="${hot ? "#fff1e6" : "#eef6fb"}" stroke="${INK}" stroke-width="1.5"/>`;
      for (let r = 0; r < 3; r += 1) {
        for (let c = 0; c < 5; c += 1) {
          const cx = x0 + 32 + c * 39;
          const cy = 60 + r * 36;
          if (hot) s += `<path d="M${cx - 15} ${cy - 3} q3 -5 6 0 M${cx + 9} ${cy + 3} q3 5 6 0" fill="none" stroke="${RED}" stroke-width="1.4"/>`;
          s += `<circle cx="${cx}" cy="${cy}" r="9" fill="${hot ? "#f59e0b" : "#fcd34d"}" stroke="${INK}" stroke-width="1.3"/>${t(cx, cy + 4, "+", { size: 10, weight: 900 })}`;
        }
      }
      const path = hot
        ? `M${x0 + 8} 78 L${x0 + 44} 92 L${x0 + 62} 70 L${x0 + 92} 96 L${x0 + 118} 72 L${x0 + 148} 94 L${x0 + 170} 74 L${x0 + 212} 84`
        : `M${x0 + 8} 78 L${x0 + 88} 80 L${x0 + 104} 94 L${x0 + 212} 96`;
      s += `<path d="${path}" fill="none" stroke="${BLUE}" stroke-width="2.2" stroke-dasharray="5 3"/>`;
      s += `<circle cx="${x0 + 8}" cy="78" r="4.5" fill="${BLUE}"/>`;
      s += t(x0 + 110, 20, hot ? "Hot filament (high p.d.)" : "Cool filament (low p.d.)", { size: 11 });
      s += t(x0 + 110, 180, hot ? "ions vibrate more: more collisions" : "fewer collisions", { size: 11, weight: 600, fill: hot ? RED : BLUE });
      return s;
    };
    return art({
      w: 480, h: 195, svg: panel(10, false) + panel(250, true),
      caption: "Electrons (blue path) collide with the metal ions (+). A hotter filament has vibrating ions, so there are more collisions and a higher resistance.",
      label: "Two particle diagrams: in a cool filament the electron passes the ions with few collisions; in a hot filament the ions vibrate and the electron collides more often",
    });
  }

  window.PracticalDiagrams = { wireBench, graphSkills, currentPaths, reverseSupply, diodeWay, filament };
})();
