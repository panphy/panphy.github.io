/* Content for the Electric Circuits Year 10 workbook (assets/workbook.js) and teacher
   guide (assets/plans.js). All questions are original. Block types are documented in
   workbook.js; `a` holds the answer shown only in the answer edition. */
(function () {
  "use strict";

  const D = window.Diagrams;

  // ---------- shared figures ----------
  const pictorialTorch = `<figure class="circuit-figure pic"><svg viewBox="0 0 320 185" role="img" aria-label="Picture of a real circuit: a battery, a switch and a bulb joined by wires">
    <g fill="none" stroke="#0a1326" stroke-width="4" stroke-linecap="round">
      <path d="M136 132 C160 132 170 150 200 150" stroke="#d9480f"/>
      <path d="M252 150 C290 150 292 110 262 92" stroke="#d9480f"/>
      <path d="M232 92 C200 70 60 60 40 100 C30 125 40 132 52 132" stroke="#1479a8"/>
    </g>
    <rect x="52" y="112" width="84" height="40" rx="8" fill="#ffd23f" stroke="#0a1326" stroke-width="3"/>
    <rect x="136" y="124" width="8" height="16" rx="2" fill="#b9c1ca" stroke="#0a1326" stroke-width="2.5"/>
    <rect x="52" y="112" width="26" height="40" rx="8" fill="#0a1326"/>
    <text x="112" y="138" font-family="Arial" font-weight="900" font-size="18" fill="#0a1326" text-anchor="middle">+</text>
    <text x="66" y="138" font-family="Arial" font-weight="900" font-size="18" fill="#fff" text-anchor="middle">−</text>
    <text x="94" y="172" font-family="Arial" font-weight="700" font-size="12" fill="#0a1326" text-anchor="middle">battery</text>
    <rect x="196" y="146" width="60" height="12" rx="3" fill="#b9c1ca" stroke="#0a1326" stroke-width="2.5"/>
    <circle cx="204" cy="150" r="4" fill="#0a1326"/><circle cx="248" cy="150" r="4" fill="#0a1326"/>
    <path d="M204 150 L246 136" stroke="#0a1326" stroke-width="4" stroke-linecap="round"/>
    <text x="226" y="176" font-family="Arial" font-weight="700" font-size="12" fill="#0a1326" text-anchor="middle">switch (closed)</text>
    <circle cx="247" cy="46" r="28" fill="#fff5cc" stroke="#0a1326" stroke-width="3"/>
    <path d="M238 70 V56 L243 44 L247 54 L251 44 L256 56 V70" fill="none" stroke="#d9480f" stroke-width="2.5"/>
    <rect x="232" y="70" width="30" height="24" rx="3" fill="#b9c1ca" stroke="#0a1326" stroke-width="3"/>
    <g stroke="#ffb400" stroke-width="3" stroke-linecap="round"><path d="M286 30l12-6M290 50h13M284 70l11 6M208 30l-12-6"/></g>
    <text x="300" y="104" font-family="Arial" font-weight="700" font-size="12" fill="#0a1326" text-anchor="end">bulb</text>
  </svg><figcaption>A real circuit: battery, switch and bulb joined into one complete loop.</figcaption></figure>`;

  const torchDiagram = D.circuit({
    w: 360, h: 190,
    wires: ["M40 40 H320 V150 H40 Z"],
    parts: [["battery", 110, 150, "h", "battery", "b"], ["switchClosed", 230, 150, "h", "switch", "b"], ["lamp", 180, 40, "h", "lamp"]],
    caption: "The same circuit as a circuit diagram.",
  });

  // A piece of metal wire: three rows of fixed positive ions, all inside the wire,
  // with free electrons in the gaps between them. With `zigzag`, one electron's path
  // changes direction each time it touches an ion (a collision).
  function metal(zigzag) {
    const R = 10;
    const ion = (r, c) => [26 + c * 40 + (r % 2) * 20, 30 + r * 36];
    let ions = "";
    for (let r = 0; r < 3; r += 1) for (let c = 0; c < 7; c += 1) {
      const [x, y] = ion(r, c);
      ions += `<circle cx="${x}" cy="${y}" r="${R}" fill="#ffe4d4" stroke="#b44a12" stroke-width="1.6"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-family="Arial" font-weight="900" font-size="14" fill="#b44a12">+</text>`;
    }
    const dot = ([x, y]) => `<circle cx="${x}" cy="${y}" r="4.5" fill="#1479a8"/>`;
    let extra;
    if (zigzag) {
      // Each corner is the top or bottom edge of an ion: [row, column, side].
      const hits = [[0, 0, 1], [1, 0, -1], [0, 1, 1], [2, 1, -1], [1, 1, 1], [2, 2, -1], [1, 2, 1], [2, 3, -1], [0, 3, 1], [1, 3, -1], [0, 4, 1], [1, 4, -1], [0, 5, 1], [2, 5, -1], [1, 5, 1], [2, 6, -1], [1, 6, 1]];
      const pts = [[8, 48], ...hits.map(([r, c, s]) => { const [x, y] = ion(r, c); return [x, y + s * (R + 1)]; }), [302, 84]];
      extra = `<polyline points="${pts.map((p) => p.join(",")).join(" ")}" fill="none" stroke="#1479a8" stroke-width="2" stroke-dasharray="4 3" stroke-linejoin="round"/>` +
        [[46, 90], [166, 42], [226, 78]].map(dot).join("") + dot([294, 83]);
    } else {
      extra = [[46, 42], [106, 54], [86, 90], [146, 78], [166, 42], [206, 90], [226, 78], [266, 54]].map(dot).join("") +
        '<path d="M20 140 H290" stroke="#1479a8" stroke-width="2.5"/><path d="M292 140 l-10 -5.5 v11 Z" fill="#1479a8"/><text x="155" y="157" text-anchor="middle" font-family="Arial" font-weight="700" font-size="12" fill="#1479a8">free electrons drift this way</text>';
    }
    return `<figure class="circuit-figure pic"><svg viewBox="0 0 310 ${zigzag ? 128 : 162}" role="img" aria-label="${zigzag ? "A free electron zigzags through the wire, changing direction each time it hits a fixed positive ion" : "Three rows of fixed positive ions inside a metal wire, with free electrons in the gaps between them"}">
      <rect x="4" y="10" width="302" height="112" rx="6" fill="#f5f6f2" stroke="#0a1326" stroke-width="2"/>${ions}${extra}</svg>
      <figcaption>${zigzag ? "A free electron collides with the ions as it moves through the wire: this is resistance." : "Inside a metal wire: fixed positive ions (orange) and free electrons (blue)."}</figcaption></figure>`;
  }

  const threeAmmeters = D.circuit({
    w: 360, h: 200, wires: ["M40 40 H320 V150 H40 Z"],
    parts: [["cell", 180, 40, "h", "6 V"], ["ammeter", 40, 95, "v", "0.60 A", "r"], ["ammeter", 320, 95, "v", "0.60 A", "l"], ["ammeter", 110, 150, "h", "0.60 A", "b"], ["resistor", 230, 150, "h", "10 Ω", "b"]],
    caption: "Three ammeters in one loop give the same reading.",
  });

  const conventional = D.circuit({
    w: 360, h: 200, wires: ["M40 40 H320 V150 H40 Z"],
    parts: [["cell", 180, 40, "h"], ["resistor", 180, 150, "h", "resistor", "b"]],
    flows: [[100, 40, "h-"], [40, 95, "v"], [110, 150, "h"], [320, 105, "v", "electron"], [260, 40, "h", "electron"], [250, 150, "h-", "electron"]],
    notes: [[170, 20, "+"], [192, 20, "−"], [58, 80, "conventional", "start", "hot"], [58, 96, "current: + → −", "start", "hot"], [302, 80, "electrons:", "end", "cool"], [302, 96, "− → +", "end", "cool"]],
    caption: "Orange: conventional current (+ to −). Blue: electron flow (− to +). Same current, opposite arrows.",
  });

  const smallLoop = (parts, extra = {}) => D.circuit(Object.assign({ w: 200, h: 130, wires: ["M30 30 H170 V100 H30 Z"], parts }, extra));

  const meterCircuit = D.circuit({
    w: 360, h: 220, wires: ["M40 40 H320 V140 H40 Z", "M150 140 V195 H230 V140"],
    parts: [["cell", 180, 40, "h"], ["ammeter", 40, 90, "v", "ammeter", "r"], ["lamp", 190, 140, "h"], ["voltmeter", 190, 195, "h", "voltmeter", "b"]],
    dots: [[150, 140], [230, 140]],
    caption: "Ammeter in series (in the loop). Voltmeter in parallel (across the lamp).",
  });

  const seriesNumbers = D.circuit({
    w: 380, h: 250, wires: ["M40 40 H340 V150 H40 Z", "M105 150 V205 H175 V150", "M215 150 V205 H285 V150"],
    parts: [["battery", 190, 40, "h", "6.0 V"], ["ammeter", 40, 95, "v", "0.20 A", "r"], ["ammeter", 340, 95, "v", "0.20 A", "l"], ["resistor", 140, 150, "h", "10 Ω"], ["resistor", 250, 150, "h", "20 Ω"], ["voltmeter", 140, 205, "h", "2.0 V", "b"], ["voltmeter", 250, 205, "h", "4.0 V", "b"]],
    dots: [[105, 150], [175, 150], [215, 150], [285, 150]],
    caption: "Series: the same current everywhere; 2.0 V + 4.0 V = 6.0 V.",
  });

  const parallelNumbers = D.circuit({
    w: 380, h: 275, wires: ["M40 40 H340 V150 H40 Z", "M110 150 V215 H270 V150"],
    parts: [["battery", 190, 40, "h", "6.0 V"], ["ammeter", 40, 95, "v", "0.50 A", "r"], ["resistor", 160, 150, "h", "30 Ω"], ["ammeter", 225, 150, "h", "0.20 A"], ["resistor", 160, 215, "h", "20 Ω", "b"], ["ammeter", 225, 215, "h", "0.30 A", "b"]],
    dots: [[110, 150], [270, 150]],
    notes: [[190, 268, "each branch has 6.0 V across it", "middle", "note"]],
    caption: "Parallel: 0.20 A + 0.30 A = 0.50 A from the battery.",
  });

  const seriesLamps = D.circuit({ w: 300, h: 170, wires: ["M40 40 H260 V130 H40 Z"], parts: [["cell", 150, 40, "h"], ["lamp", 110, 130, "h"], ["lamp", 190, 130, "h"]], caption: "Series: one loop." });
  const parallelLamps = D.circuit({ w: 300, h: 190, wires: ["M40 40 H260 V120 H40 Z", "M90 120 V165 H210 V120"], parts: [["cell", 150, 40, "h"], ["lamp", 150, 120, "h"], ["lamp", 150, 165, "h"]], dots: [[90, 120], [210, 120]], caption: "Parallel: two branches." });

  // Resistance-wire practical. The test wire (copper) is taped along a metre ruler. The
  // circuit joins it at the fixed clip (0 cm) and the sliding clip, so only the length L
  // between the clips is in the circuit; the voltmeter is connected across that length.
  const wireCircuit = D.circuit({
    w: 420, h: 262,
    wires: ["M40 40 H380 V150 H300 V168", "M40 40 V150 H110 V168", "M110 150 V110 H300 V150"],
    parts: [["battery", 150, 40, "h", "power supply (about 2 V)"], ["switchOpen", 290, 40, "h", "switch"], ["ammeter", 40, 95, "v"], ["voltmeter", 205, 110, "h"]],
    dots: [[110, 150], [300, 150]],
    notes: [[205, 222, "length L"], [110, 246, "fixed clip (0 cm)"], [300, 246, "sliding clip"], [362, 176, "test", "start"], [362, 190, "wire", "start"]],
    extra: '<rect class="ruler" x="84" y="176" width="272" height="16"/>' +
      Array.from({ length: 13 }, (_, i) => `<line class="ruler-tick" x1="${110 + i * 19}" y1="176" x2="${110 + i * 19}" y2="${i % 5 === 0 ? 186 : 182}"/>`).join("") +
      '<line x1="88" y1="172" x2="352" y2="172" stroke="#b44a12" stroke-width="3.5"/>' +
      '<path class="fill" d="M104 165 H116 L110 172 Z"/><path class="fill" d="M294 165 H306 L300 172 Z"/>' +
      '<line class="dim" x1="110" y1="196" x2="110" y2="212"/><line class="dim" x1="300" y1="196" x2="300" y2="212"/>' +
      '<line class="dim" x1="112" y1="205" x2="298" y2="205"/><path class="fill" d="M110 205 L118 201 L118 209 Z"/><path class="fill" d="M300 205 L292 201 L292 209 Z"/>',
    caption: "The test wire is taped along a metre ruler. Only the length L between the clips is in the circuit, and the voltmeter is connected across it.",
  });

  const rpSeries = D.circuit({
    w: 380, h: 250, wires: ["M40 40 H340 V160 H40 Z", "M95 160 V215 H285 V160"],
    parts: [["battery", 130, 40, "h", "power supply"], ["switchOpen", 260, 40, "h", "switch"], ["ammeter", 40, 100, "v"], ["resistor", 145, 160, "h", "R₁"], ["resistor", 235, 160, "h", "R₂"], ["voltmeter", 190, 215, "h"]],
    dots: [[95, 160], [285, 160]], caption: "Series: the voltmeter goes across both resistors.",
  });
  const rpParallel = D.circuit({
    w: 380, h: 290, wires: ["M40 40 H340 V150 H40 Z", "M120 150 V205 H260 V150", "M85 150 V255 H295 V150"],
    parts: [["battery", 130, 40, "h", "power supply"], ["switchOpen", 260, 40, "h", "switch"], ["ammeter", 40, 95, "v"], ["resistor", 190, 150, "h", "R₁"], ["resistor", 190, 205, "h", "R₂", "b"], ["voltmeter", 190, 255, "h"]],
    dots: [[120, 150], [260, 150], [85, 150], [295, 150]], caption: "Parallel: the voltmeter goes across the pair.",
  });
  const ivCircuit = D.circuit({
    w: 380, h: 250, wires: ["M40 40 H340 V160 H40 Z", "M140 160 V215 H240 V160"],
    parts: [["battery", 120, 40, "h", "power supply"], ["variable", 250, 40, "h", "variable resistor"], ["ammeter", 40, 100, "v"], ["resistor", 190, 160, "h", "test component"], ["voltmeter", 190, 215, "h"]],
    dots: [[140, 160], [240, 160]], caption: "Resistor first, then swap in the filament lamp.",
  });
  const diodeCircuit = D.circuit({
    w: 380, h: 250, wires: ["M40 40 H340 V160 H40 Z", "M195 160 V215 H285 V160"],
    parts: [["battery", 120, 40, "h", "power supply"], ["variable", 250, 40, "h", "variable resistor"], ["ammeter", 40, 100, "v"], ["resistor", 115, 160, "h", "protective resistor"], ["diode", 240, 160, "h", "diode"], ["voltmeter", 240, 215, "h"]],
    dots: [[195, 160], [285, 160]], caption: "Diode: add a protective resistor; voltmeter across the diode only.",
  });

  // Lamp curve that passes exactly through (2.0 V, 0.20 A) and (6.0 V, 0.30 A).
  const lampFn = (v) => Math.sign(v) * 0.3155 * (1 - Math.exp(-Math.abs(v) / 1.99));
  const sketch = (fn, xl, yl, caption, extra = {}) => D.graph(Object.assign({ sketch: true, w: 300, h: 200, x: [0, 1, 1], y: [0, 1, 1], xLabel: xl, yLabel: yl, series: [{ fn, from: 0, to: 1 }], caption }, extra));
  const fallCurve = (x) => 0.85 * Math.exp(-2.6 * x) + 0.08;

  // ---------- lessons ----------
  const lessons = [
    // ============================================================ 1
    {
      n: 1, accent: "spark", title: "Complete circuits and symbols",
      spec: "AQA Combined 6.2.1.1 · Physics 4.2.1.1",
      mapLine: "What a circuit needs, circuit symbols and drawing rules, measuring current",
      big: "Your torch won't switch on. The bulb is fine and the batteries are new. What could be wrong?",
      goals: ["explain why a lamp only lights in a complete loop", "recognise and draw standard circuit symbols", "turn a real circuit into a neat circuit diagram", "connect an ammeter in series to measure current"],
      keywords: ["circuit", "component", "cell", "battery", "switch", "circuit diagram", "series", "ammeter"],
      online: { label: "Mission 1 · Build & measure", path: "lesson/build-and-measure/", text: "Notes on circuits, symbols and drawing rules, with 5 practice questions and worked answers." },
      doNow: [
        ["Name two things that run on a battery and two that plug into the wall.", "e.g. torch, phone; kettle, TV."],
        ["When a lamp is on, what do you think is moving in the wires?", "Tiny charged particles (electrons): you learn this today."],
        ["Why does a torch need a switch?", "To break or complete the circuit, turning it off and on."],
      ],
      learnTitle: "Circuits from scratch",
      learn: [
        { t: "sub", h: "What does a circuit need?" },
        { t: "split", cls: "wide-fig", left: [{ t: "fig", h: pictorialTorch }], right: [
          { t: "p", h: "A <strong>circuit</strong> is a complete loop that electric charge can flow around. To light a lamp you need:" },
          { t: "html", h: "<ol><li>a <strong>source of energy</strong>: a cell or battery pushes the charge around;</li><li>a <strong>complete loop</strong> of wire with no gaps;</li><li><strong>components</strong>: things that do a job, such as a lamp.</li></ol>" },
        ] },
        { t: "model", title: "Think of it like a bike chain", h: "The chain is already full of links, just as wires are already full of charge. When you push the pedals (the cell), the <em>whole</em> chain moves at once, and the back wheel (the lamp) turns immediately. Break the chain anywhere and everything stops.", breaks: "you can see a chain move quickly, but the charges in a wire drift very slowly." },
        { t: "key", h: "<strong>No complete loop, no current.</strong> A gap anywhere (an open switch, a loose wire, a broken bulb) stops the flow of charge <em>everywhere</em> in the loop." },
        { t: "sub", h: "From a picture to a circuit diagram" },
        { t: "split", cls: "narrow-fig", left: [{ t: "p", h: "Drawing real objects takes a long time, and everyone draws them differently. Scientists and electricians everywhere use the same <strong>circuit symbols</strong>, so anyone can read a <strong>circuit diagram</strong>. This diagram shows exactly the same circuit as the picture above." }, { t: "p", h: "Learn the first row of symbols now. The dashed ones come later in the unit: you do not need them yet." }], right: [{ t: "fig", h: torchDiagram, cls: "fig-small" }] },
        { t: "symbank", legend: "Solid boxes: learn today. Dashed boxes: the lesson where you meet them is shown.", items: [
          ["cell", "Cell", "long line is +"], ["battery", "Battery", "two or more cells"], ["switchOpen", "Switch (open)", "gap: no current"], ["switchClosed", "Switch (closed)", "loop complete"], ["lamp", "Lamp", "gives out light"], ["resistor", "Resistor", "limits the current"], ["ammeter", "Ammeter", "measures current"],
          ["voltmeter", "Voltmeter", "Lesson 3", true], ["variable", "Variable resistor", "Lesson 4", true], ["diode", "Diode", "Lesson 8", true], ["led", "LED", "Lesson 8", true], ["thermistor", "Thermistor", "Lesson 10", true], ["ldr", "LDR", "Lesson 10", true], ["fuse", "Fuse", "Lesson 12", true],
        ] },
        { t: "sub", h: "Rules for drawing circuit diagrams" },
        { t: "split", left: [{ t: "html", h: "<ol class='steps'><li>Use a <strong>pencil and a ruler</strong>.</li><li>Draw wires as <strong>straight lines</strong> with <strong>right-angle corners</strong>.</li><li>Leave <strong>no gaps</strong>: every wire joins something at both ends.</li><li>Put each symbol <strong>in</strong> the wire, so the wire goes into it on both sides.</li><li>Write values such as 6 V or 10 Ω next to the symbol.</li></ol>" }], right: [{ t: "fig", cls: "fig-small", h: D.circuit({ w: 360, h: 180, wires: ["M40 40 H320 V140 H40 Z"], parts: [["battery", 130, 40, "h", "6 V"], ["switchClosed", 240, 40, "h"], ["lamp", 130, 140, "h"], ["resistor", 230, 140, "h", "10 Ω", "b"]], caption: "A neat diagram: ruler, right angles, no gaps." }) }] },
        { t: "sub", h: "Measuring the current" },
        { t: "split", cls: "narrow-fig", left: [{ t: "p", h: "The flow of charge is called the <strong>current</strong>. We measure it in <strong>amperes (A)</strong>, or ‘amps’, with an <strong>ammeter</strong>. The ammeter goes <em>in</em> the loop so that the charge flows through it. This is called connecting it <strong>in series</strong>." }, { t: "key", h: "A circuit with just one loop is a <strong>series circuit</strong>. Everything in that loop is ‘in series’." }], right: [{ t: "fig", cls: "fig-small", h: D.circuit({ w: 300, h: 170, wires: ["M40 40 H260 V130 H40 Z"], parts: [["cell", 150, 40, "h"], ["lamp", 110, 130, "h"], ["ammeter", 200, 130, "h", "0.20 A", "b"]], caption: "The ammeter is in series with the lamp." }) }] },
      ],
      try: [
        { t: "q", p: "Name each symbol.", symq: { items: [["battery", "battery"], ["switchClosed", "closed switch"], ["resistor", "resistor"], ["cell", "cell"], ["ammeter", "ammeter"], ["lamp", "lamp"]] } },
        { t: "q", p: "Draw the symbol for each component. Use a ruler for the straight lines.", symq: { items: [["switchOpen", "Open switch", "draw"], ["lamp", "Lamp", "draw"], ["cell", "Cell", "draw"], ["ammeter", "Ammeter", "draw"], ["resistor", "Resistor", "draw"], ["battery", "Battery", "draw"]] } },
        { t: "q", p: "Will the lamp light? Circle <strong>Yes</strong> or <strong>No</strong> for each circuit.", options: { cols: 4, items: [
          { label: "A", fig: smallLoop([["cell", 70, 30, "h"], ["switchClosed", 130, 30, "h"], ["lamp", 100, 100, "h"]]), choice: ["Yes", "No"], c: 0 },
          { label: "B", fig: smallLoop([["cell", 70, 30, "h"], ["switchOpen", 130, 30, "h"], ["lamp", 100, 100, "h"]]), choice: ["Yes", "No"], c: 1 },
          { label: "C", fig: D.circuit({ w: 200, h: 130, wires: ["M30 30 H170 V100 H115", "M85 100 H30 V30"], parts: [["cell", 70, 30, "h"], ["lamp", 130, 30, "h"]] }), choice: ["Yes", "No"], c: 1 },
          { label: "D", fig: smallLoop([["battery", 70, 30, "h"], ["switchClosed", 135, 30, "h"], ["lamp", 70, 100, "h"], ["ammeter", 130, 100, "h"]]), choice: ["Yes", "No"], c: 0 },
        ] }, starter: "Explain your answer for circuit C.", lines: 1, a: "C has a gap in the bottom wire, so the loop is not complete and no charge can flow." },
        { t: "q", p: "Jo drew this circuit diagram. Find <strong>three</strong> mistakes.", figCls: "fig-small", fig: D.circuit({ w: 360, h: 200, wires: ["M40 40 H150", "M178 40 H320 V150 L210 180 H40 V40"], parts: [["cell", 95, 40, "h"], ["resistor", 110, 180, "h"]], extra: '<g transform="translate(345 95)"><circle r="12" fill="#fff"/><line x1="-8.5" y1="-8.5" x2="8.5" y2="8.5"/><line x1="-8.5" y1="8.5" x2="8.5" y2="-8.5"/></g>' }), lines: 3, a: "1. There is a gap in the top wire. 2. One wire is slanted: wires should be straight with right-angle corners. 3. The lamp is not connected into the wire (the wire does not go into it)." },
        { t: "q", p: "Draw a circuit diagram for a <strong>battery</strong>, a <strong>closed switch</strong>, a <strong>lamp</strong> and an <strong>ammeter</strong>, all in one loop.", box: 48, grid: true, a: D.circuit({ w: 360, h: 160, wires: ["M40 40 H320 V130 H40 Z"], parts: [["battery", 120, 40, "h"], ["switchClosed", 240, 40, "h"], ["lamp", 130, 130, "h"], ["ammeter", 240, 130, "h"]] }) },
        { t: "q", p: "<strong>Torch detective.</strong> Look back at the big question. Suggest <strong>two</strong> faults that could stop the torch working, and how you could test for each one.", lines: 3, a: "e.g. a loose or broken wire/connection, leaving a gap: check or replace each connection. The switch does not close properly: replace it with a working switch. The batteries are in the wrong way round: turn them round." },
      ],
      exam: [
        { tip: "Examiners look for correct symbols, a complete loop with no gaps, and the ammeter in series.", p: "Draw a circuit diagram to show a battery, a resistor and a lamp connected in series, with an ammeter to measure the current.", marks: 3, box: 44, grid: true, a: "Correct symbols for battery, resistor and lamp (1); all in one complete loop with no gaps (1); ammeter in series in the same loop (1)." },
        { p: "State what is meant by a <em>series</em> circuit.", marks: 1, lines: 1, a: "The components are connected one after another in a single loop." },
      ],
      summary: ["A circuit needs a source (cell or battery) and a <strong>complete loop</strong>.", "A gap anywhere stops the current everywhere.", "Circuit diagrams use standard symbols, drawn with a ruler: straight wires, right-angle corners, no gaps.", "An ammeter measures current and goes <strong>in series</strong>."],
      recall: [["What two things does a circuit need for a current to flow?", "A source (cell or battery) and a complete loop."], ["What is the difference between a cell and a battery?", "A battery is two or more cells joined together."], ["What does an open switch do?", "Makes a gap, so no current flows."], ["How is an ammeter connected?", "In series (in the loop)."]],
      cando: ["explain why a circuit must be a complete loop", "recognise and draw the symbols for a cell, battery, switch, lamp, resistor and ammeter", "draw a neat circuit diagram using the rules", "connect an ammeter in series"],
    },

    // ============================================================ 2
    {
      n: 2, accent: "cyan", title: "Current and charge",
      spec: "AQA Combined 6.2.1.2 · Physics 4.2.1.2 · Virtual Lab 1",
      mapLine: "Current as a rate of flow of charge, Q = I t, current is not used up",
      big: "Flick a switch and the lamp lights instantly, yet each electron drifts through the wire slower than a snail. How can both be true?",
      goals: ["describe current as the rate of flow of charge", "use Q = I t, with time in seconds", "explain why the current is the same everywhere in a single loop"],
      keywords: ["charge (C)", "current (A)", "coulomb", "ampere", "electron", "conventional current"],
      online: { label: "Mission 2 · Charge on the move", path: "lesson/charge-and-current/", text: "Revision notes and 5 practice questions with worked answers." },
      doNow: [
        ["Draw the symbols for a cell and a lamp.", "Cell: a long line and a shorter line (the long line is +). Lamp: circle with a cross."],
        ["How must an ammeter be connected?", "In series (in the loop)."],
        ["Give two reasons why a lamp in a circuit might not light.", "Open switch; gap or loose wire; broken bulb; no cell."],
      ],
      learnTitle: "What is flowing?",
      learn: [
        { t: "split", cls: "wide-fig", left: [{ t: "fig", h: metal(false) }], right: [
          { t: "p", h: "Metals contain <strong>free electrons</strong>: tiny particles with a negative charge that can move between the atoms. The wires are full of them <em>before</em> you switch on." },
          { t: "p", h: "The cell pushes on all of them at once, so the whole loop starts moving together, just like the bike chain. The lamp lights straight away, even though each electron only drifts along at less than a millimetre per second." },
        ] },
        { t: "p", h: "Charge is measured in <strong>coulombs (C)</strong>. One electron has a tiny charge: it takes about 6 × 10<sup>18</sup> (six billion billion) electrons to make 1 C." },
        { t: "sub", h: "Current is a rate" },
        { t: "p", h: "<strong>Current</strong> is the <strong>rate of flow of charge</strong>: how many coulombs pass a point <em>each second</em>." },
        { t: "model", title: "Think of a ticket barrier", h: "Count the people going through a station barrier each second. The current is like the number of people <em>per second</em>, not the number of people in the station.", breaks: "people can stop or change direction on their own; in a single loop all the charges move together." },
        { t: "key", h: "<strong>1 ampere = 1 coulomb per second.</strong> A current of 0.5 A means 0.5 C of charge passes a point every second." },
        { t: "eq", eq: "Q = I t", words: "charge flow = current × time", units: "Q in coulombs (C) · I in amperes (A) · t in seconds (s)", re: "Rearranged: I = Q ÷ t and t = Q ÷ I" },
        { t: "worked", q: "A current of 0.40 A flows for 3.0 minutes. Calculate the charge that flows.", steps: [["Know", "I = 0.40 A, t = 3.0 × 60 = 180 s"], ["Equation", "Q = I t"], ["Substitute", "Q = 0.40 × 180"], ["Answer", "Q = 72 C"]],
          yt: { q: "A current of 0.50 A flows for 4.0 minutes. Calculate the charge that flows.", steps: [["Know", "I = 0.50 A, t = 240 s"], ["Equation", "Q = I t"], ["Substitute", "Q = 0.50 × 240"], ["Answer", "Q = 120 C"]] } },
        { t: "sub", h: "Current is not used up" },
        { t: "split", left: [{ t: "fig", cls: "fig-small", h: threeAmmeters }], right: [{ t: "p", h: "In a single loop, the current is <strong>the same at every point</strong>. Charge is not destroyed in a component: it carries on round the circuit. What the component takes is <strong>energy</strong> (Lesson 3)." }, { t: "key", h: "Charge goes round. Energy is transferred." }] },
        { t: "sub", h: "Which way does current flow?" },
        { t: "split", left: [{ t: "p", h: "Outside the cell, electrons flow from the <strong>negative (−)</strong> terminal to the <strong>positive (+)</strong> terminal." }, { t: "p", h: "But circuit diagrams show <strong>conventional current</strong>, from + to −. This was agreed before electrons were discovered. Both describe the same current, and exam diagrams use conventional current." }], right: [{ t: "fig", cls: "fig-small", h: conventional }] },
      ],
      try: [
        { t: "q", p: "Complete the sentences using the word bank.", fill: "Current is the rate of flow of [[charge]]. It is measured in [[amperes (A)|30]] using an [[ammeter]] connected in [[series]]. Charge is measured in [[coulombs (C)|30]]. A current of 2 A means [[2|14]] coulombs pass a point every [[second]].", bank: ["charge", "series", "ammeter", "second", "amperes (A)", "coulombs (C)", "2", "parallel", "volts"] },
        { t: "q", p: "A current of 0.60 A flows in a circuit. Which statement is correct? Tick <strong>one</strong> box.", mcq: { o: ["There is 0.60 C of charge in the circuit.", "0.60 C of charge passes any point each second.", "The lamp uses up 0.60 C each second.", "The current is 0.60 A only near the cell."], c: 1 } },
        { t: "q", type: "Supported", p: "A current of 2.0 A flows for 30 s. Calculate the charge that flows.", frame: [["Equation"], ["Substitute"], ["Answer", "unit:"]], frameA: ["Q = I t", "Q = 2.0 × 30", "60 C"] },
        { t: "q", type: "Supported", p: "A current of 0.30 A flows for 5.0 minutes. Calculate the charge. <em>Convert the time first!</em>", frame: [["Convert"], ["Equation"], ["Substitute"], ["Answer", "unit:"]], frameA: ["t = 5.0 × 60 = 300 s", "Q = I t", "Q = 0.30 × 300", "90 C"] },
        { t: "q", type: "On your own", p: "36 C of charge passes through a lamp in 12 s. Calculate the current.", lines: 2, a: "I = Q ÷ t = 36 ÷ 12 = 3.0 A" },
        { t: "q", type: "Challenge", p: "A phone charger supplies 0.80 A. How long does it take for 240 C to flow? Give your answer in seconds and in minutes.", lines: 2, a: "t = Q ÷ I = 240 ÷ 0.80 = 300 s = 5.0 minutes" },
        { t: "q", say: ["Mia", "The lamp uses up some current, so ammeter A₂ after the lamp will read less than A₁."], fig: D.circuit({ w: 360, h: 170, wires: ["M40 40 H320 V130 H40 Z"], parts: [["cell", 180, 40, "h"], ["ammeter", 90, 130, "h", "A₁ = 0.30 A", "b"], ["lamp", 180, 130, "h"], ["ammeter", 270, 130, "h", "A₂ = ?", "b"]] }), figCls: "fig-small", p: "Predict the reading on A₂. Explain why Mia is wrong.", lines: 3, a: "A₂ = 0.30 A. It is a single loop, so the current is the same everywhere. Charge is not used up: the lamp transfers energy, not charge." },
      ],
      lab: { title: "Virtual Lab 1: Is current used up?", aside: "PhET Circuit Construction Kit: DC → Lab. Full steps: Virtual Labs worksheet pp. 3–6.", blocks: [
        { t: "lab", blocks: [
          { t: "p", h: "Build one loop with a <strong>6 V battery</strong> and a <strong>10 Ω resistor</strong>. Use the non-contact ammeter to measure the current at three places." },
          { t: "q", p: "Record your readings.", table: { head: ["Position", "Current / A", "Current with 20 Ω / A"], rows: [["Before the resistor", null, null], ["After the resistor", null, null], ["Next to the battery", null, null]], ans: [[null, "0.60", "0.30"], [null, "0.60", "0.30"], [null, "0.60", "0.30"]] } },
          { t: "q", p: "What do your readings show? Use numbers in your answer.", lines: 2, a: "All three readings are the same (0.60 A), so current is not used up. With 20 Ω the current halves (0.30 A) but is still the same everywhere." },
        ] },
      ] },
      exam: [
        { tip: "Convert minutes to seconds before you substitute. The unit (C) is part of the answer.", p: "A motor draws a current of 0.60 A for 5.0 minutes. Calculate the charge that flows through the motor.", marks: 3, frame: [["Equation"], ["Substitute"], ["Answer", "unit:"]], frameA: ["Q = I t, with t = 5.0 × 60 = 300 s", "Q = 0.60 × 300", "180 C"], a: "" },
        { p: "A student says the current leaving the motor is smaller than the current entering it. Explain why the student is wrong.", marks: 2, lines: 2, a: "The motor is in a single loop, so the current is the same everywhere (1). Charge is not used up; the motor transfers energy (1)." },
      ],
      summary: ["Current is the <strong>rate of flow of charge</strong>. In metal wires the charges are free electrons.", "Charge: coulombs (C). Current: amperes (A). 1 A = 1 C per second.", "<strong>Q = I t</strong>, with t in seconds.", "In a single loop, current is the same everywhere: charge is not used up.", "Conventional current: + to −. Electrons: − to +."],
      recall: [["What is current?", "The rate of flow of charge."], ["What is the unit of charge?", "Coulomb (C)."], ["Write the equation linking charge, current and time.", "Q = I t"], ["0.2 A flows into a lamp. What current flows out?", "0.2 A"]],
      cando: ["describe current as the rate of flow of charge", "calculate charge, current or time using Q = I t", "convert minutes to seconds before calculating", "explain why current is not used up in a loop"],
    },

    // ============================================================ 3
    {
      n: 3, accent: "copper", title: "Potential difference",
      spec: "AQA Combined 6.2.1.3, 6.2.4.2 · Physics 4.2.1.3, 4.2.4.2 · Virtual Lab 2",
      mapLine: "p.d. as energy per coulomb, voltmeters, E = Q V, p.d.s add in series",
      big: "An AA battery says 1.5 V. A car battery says 12 V. What is that number actually telling you?",
      goals: ["explain p.d. as the energy transferred per coulomb", "connect a voltmeter in parallel across a component", "use E = Q V", "explain why the p.d.s in a loop add up to the supply p.d."],
      keywords: ["potential difference (p.d.)", "volt (V)", "voltmeter", "parallel", "energy", "joule (J)"],
      online: { label: "Mission 3 · Energy per coulomb", path: "lesson/potential-difference/", text: "Revision notes and 5 practice questions with worked answers." },
      doNow: [
        ["What is current?", "The rate of flow of charge."],
        ["0.50 A flows for 20 s. How much charge flows?", "Q = 0.50 × 20 = 10 C"],
        ["Does a lamp use up current? Explain.", "No. The current is the same all round the loop; the lamp transfers energy."],
      ],
      learnTitle: "Energy carried by charge",
      learn: [
        { t: "p", h: "The cell does not make charge: the charge was already in the wires. The cell gives <strong>energy</strong> to the charge. When the charge passes through a component such as a lamp, energy is transferred to it, so the lamp lights up and gets hot." },
        { t: "model", title: "Think of delivery vans", h: "Each coulomb of charge is a delivery van on a circular route. The battery loads each van with energy. At the lamp the van drops its energy off, then drives on, empty, back to the battery to reload. The vans (charge) are never used up; only the parcels (energy) are delivered.", breaks: "real charges do not carry parcels, and energy reaches the lamp as soon as the switch closes, not after a slow journey." },
        { t: "sub", h: "What a volt means" },
        { t: "p", h: "<strong>Potential difference (p.d.)</strong> is the <strong>energy transferred per coulomb</strong> of charge between two points. It is measured in <strong>volts (V)</strong>. People often call it ‘voltage’." },
        { t: "key", h: "<strong>1 volt = 1 joule per coulomb.</strong> A p.d. of 6 V across a lamp means 6 J of energy is transferred to the lamp by every 1 C of charge that passes through it." },
        { t: "eq", eq: "E = Q V", words: "energy transferred = charge × potential difference", units: "E in joules (J) · Q in coulombs (C) · V in volts (V)", re: "Rearranged: V = E ÷ Q and Q = E ÷ V" },
        { t: "worked", q: "6.0 C of charge passes through a lamp with 12 V across it. Calculate the energy transferred.", steps: [["Know", "Q = 6.0 C, V = 12 V"], ["Equation", "E = Q V"], ["Substitute", "E = 6.0 × 12"], ["Answer", "E = 72 J"]],
          yt: { q: "A heater transfers 360 J while 30 C passes through it. Calculate the p.d. across it.", steps: [["Know", "E = 360 J, Q = 30 C"], ["Equation", "V = E ÷ Q"], ["Substitute", "V = 360 ÷ 30"], ["Answer", "V = 12 V"]] } },
        { t: "sub", h: "Measuring p.d.: the voltmeter" },
        { t: "split", cls: "narrow-fig", left: [{ t: "p", h: "A p.d. is always <em>between two points</em>, so a <strong>voltmeter</strong> is connected <strong>across</strong> a component, with one lead on each side. This is connecting it <strong>in parallel</strong>." }, { t: "p", h: "Say ‘the p.d. <strong>across</strong> the lamp’ and ‘the current <strong>through</strong> the lamp’." }], right: [{ t: "fig", cls: "fig-small", h: meterCircuit }] },
        { t: "compare", head: ["", "Current", "Potential difference"], rows: [["What it is", "rate of flow of charge (coulombs per second)", "energy transferred per coulomb (joules per coulomb)"], ["Unit", "ampere, A", "volt, V"], ["Measured with", "ammeter, in series", "voltmeter, in parallel"], ["Say", "current <em>through</em>", "p.d. <em>across</em>"]] },
        { t: "sub", h: "Energy in = energy out" },
        { t: "split", left: [{ t: "p", h: "In a single loop, the p.d.s across the components <strong>add up to the p.d. of the supply</strong>." }, { t: "p", h: "Here each coulomb gets 6 J from the battery and hands over all 6 J on the way round: 2 J in the 10 Ω resistor and 4 J in the 20 Ω resistor. Energy is conserved." }], right: [{ t: "fig", cls: "fig-small", h: seriesNumbers }] },
      ],
      try: [
        { t: "q", p: "Which circuit measures the p.d. across the lamp correctly? Circle ✓ or ✗ for each.", options: { cols: 3, items: [
          { label: "A", fig: D.circuit({ w: 240, h: 170, wires: ["M30 30 H210 V100 H30 Z", "M90 100 V145 H150 V100"], parts: [["cell", 120, 30, "h"], ["lamp", 120, 100, "h"], ["voltmeter", 120, 145, "h"]], dots: [[90, 100], [150, 100]] }), choice: ["✓", "✗"], c: 0 },
          { label: "B", fig: D.circuit({ w: 240, h: 170, wires: ["M30 30 H210 V100 H30 Z"], parts: [["cell", 120, 30, "h"], ["lamp", 90, 100, "h"], ["voltmeter", 160, 100, "h"]] }), choice: ["✓", "✗"], c: 1 },
          { label: "C", fig: D.circuit({ w: 240, h: 170, wires: ["M30 30 H210 V100 H30 Z", "M140 100 V145 H200 V100"], parts: [["cell", 120, 30, "h"], ["lamp", 80, 100, "h"], ["ammeter", 170, 100, "h"], ["voltmeter", 170, 145, "h"]], dots: [[140, 100], [200, 100]] }), choice: ["✓", "✗"], c: 1 },
        ] }, a: "A only. In B the voltmeter is in series; in C it is across the ammeter, not the lamp." },
        { t: "q", p: "Complete the sentences.", fill: "A p.d. of 9 V across a resistor means [[9|14]] J of energy is transferred to the resistor for every [[coulomb|24]] of charge. A voltmeter is connected [[across]] a component, in [[parallel]].", bank: ["9", "coulomb", "second", "across", "parallel", "series"] },
        { t: "q", type: "Supported", p: "25 C of charge passes through a resistor with 4.0 V across it. Calculate the energy transferred.", frame: [["Equation"], ["Substitute"], ["Answer", "unit:"]], frameA: ["E = Q V", "E = 25 × 4.0", "100 J"] },
        { t: "q", type: "On your own", p: "A kettle element transfers 23 000 J of energy when 100 C of charge flows through it. Calculate the p.d. across the element.", lines: 2, a: "V = E ÷ Q = 23 000 ÷ 100 = 230 V" },
        { t: "q", fig: D.circuit({ w: 360, h: 210, wires: ["M40 40 H320 V130 H40 Z", "M75 130 V180 H145 V130", "M215 130 V180 H285 V130"], parts: [["battery", 180, 40, "h", "12 V"], ["lamp", 110, 130, "h"], ["lamp", 250, 130, "h"], ["voltmeter", 110, 180, "h", "V₁ = 7.5 V", "b"], ["voltmeter", 250, 180, "h", "V₂ = ?", "b"]], dots: [[75, 130], [145, 130], [215, 130], [285, 130]] }), figCls: "fig-small", p: "(a) What does voltmeter V₂ read? (b) How much energy does each coulomb transfer in the second lamp?", lines: 2, a: "(a) 12 − 7.5 = 4.5 V. (b) 4.5 J per coulomb." },
        { t: "q", say: ["Leo", "A 9 V battery pushes the charges faster than a 1.5 V battery. That's what volts measure."], p: "Explain what is wrong with Leo's idea.", lines: 3, a: "Volts measure energy transferred per coulomb, not speed. A 9 V battery gives each coulomb 9 J of energy; a 1.5 V battery gives each coulomb only 1.5 J." },
      ],
      lab: { title: "Virtual Lab 2: What does a volt mean?", aside: "Full steps: Virtual Labs worksheet pp. 7–11.", blocks: [
        { t: "lab", blocks: [
          { t: "p", h: "Use one <strong>10 Ω</strong> resistor. At each battery setting, measure the p.d. across the resistor. Then calculate the energy transferred when 2 C passes." },
          { t: "q", p: "Record and calculate.", table: { head: ["Battery setting / V", "p.d. across resistor / V", "Energy for 2 C / J"], rows: [["3", null, null], ["6", null, null], ["9", null, null]], ans: [[null, "3.0", "6.0"], [null, "6.0", "12"], [null, "9.0", "18"]] } },
          { t: "q", p: "Add a second 10 Ω resistor in series (6 V battery). Measure the p.d. across each resistor. What do you notice?", lines: 2, a: "About 3.0 V across each; 3.0 V + 3.0 V = 6.0 V, the battery p.d. The energy from the battery is shared between the resistors." },
        ] },
      ] },
      exam: [
        { tip: "Explaining a p.d. needs two ideas: energy (joules) and per coulomb of charge.", p: "A 9.0 V battery moves 20 C of charge around a circuit. Calculate the energy transferred by the battery.", marks: 2, frame: [["Equation"], ["Substitute"], ["Answer", "unit:"]], frameA: ["E = Q V", "E = 20 × 9.0", "180 J"] },
        { p: "A voltmeter connected across a resistor reads 3.0 V. Explain what this reading means.", marks: 2, lines: 2, a: "3.0 J of energy is transferred (1) to the resistor for every coulomb of charge passing through it (1)." },
      ],
      summary: ["p.d. is the <strong>energy transferred per coulomb</strong>: 1 V = 1 J/C.", "A voltmeter goes <strong>across</strong> a component (in parallel).", "<strong>E = Q V</strong>", "Charge is not used up; energy is transferred.", "In a series loop, the component p.d.s add up to the supply p.d."],
      recall: [["What is potential difference?", "Energy transferred per coulomb of charge."], ["How is a voltmeter connected?", "In parallel, across the component."], ["Write the equation linking energy, charge and p.d.", "E = Q V"], ["A 6 V battery; one of two series lamps has 2 V across it. What does the other have?", "4 V"]],
      cando: ["explain p.d. as energy transferred per coulomb", "connect a voltmeter in parallel", "use E = Q V and its rearrangements", "use ‘p.d.s add up’ in a series loop"],
    },

    // ============================================================ 4
    {
      n: 4, accent: "violet", title: "Resistance and V = I R",
      spec: "AQA Combined 6.2.1.3–6.2.1.4 · Physics 4.2.1.3–4.2.1.4 · Virtual Lab 3",
      mapLine: "Resistance, V = I R, ohmic conductors, why heating raises resistance",
      big: "A dimmer switch makes a lamp glow less brightly. What is it actually changing?",
      goals: ["describe resistance and its unit, the ohm (Ω)", "use V = I R, including mA and kΩ", "recognise an ohmic conductor from data or a graph", "explain why heating a metal increases its resistance"],
      keywords: ["resistance", "ohm (Ω)", "ohmic conductor", "directly proportional", "variable resistor"],
      online: { label: "Mission 4 · Resistance & V = IR", path: "lesson/resistance/", text: "Revision notes and 5 practice questions with worked answers." },
      doNow: [
        ["What does ‘6 V across a lamp’ mean?", "6 J of energy is transferred per coulomb."],
        ["Which meter measures p.d., and how is it connected?", "Voltmeter, in parallel (across)."],
        ["Two lamps are in series with a 6 V battery. One has 2 V across it. What is across the other?", "4 V"],
      ],
      learnTitle: "Controlling the current",
      learn: [
        { t: "p", h: "<strong>Resistance</strong> is how much a component <strong>opposes the current</strong>. For the same p.d., a bigger resistance means a smaller current. Resistance is measured in <strong>ohms (Ω)</strong>. A <strong>resistor</strong> has a chosen resistance, such as 10 Ω, to control the current. A <strong>variable resistor</strong> (the dimmer) lets you change it." },
        { t: "figs", cols: 2, cls: "fig-small", items: [
          D.circuit({ w: 300, h: 170, wires: ["M40 40 H260 V130 H40 Z"], parts: [["battery", 150, 40, "h", "6 V"], ["resistor", 110, 130, "h", "10 Ω", "b"], ["ammeter", 200, 130, "h", "0.60 A", "b"]], caption: "Smaller resistance, bigger current." }),
          D.circuit({ w: 300, h: 170, wires: ["M40 40 H260 V130 H40 Z"], parts: [["battery", 150, 40, "h", "6 V"], ["resistor", 110, 130, "h", "20 Ω", "b"], ["ammeter", 200, 130, "h", "0.30 A", "b"]], caption: "Double the resistance, half the current." }),
        ] },
        { t: "eq", eq: "V = I R", words: "potential difference = current × resistance", units: "V in volts (V) · I in amperes (A) · R in ohms (Ω)", re: "Rearranged: I = V ÷ R and R = V ÷ I" },
        { t: "worked", q: "A resistor has 6.0 V across it and a current of 0.30 A through it. Calculate its resistance.", steps: [["Know", "V = 6.0 V, I = 0.30 A"], ["Equation", "R = V ÷ I"], ["Substitute", "R = 6.0 ÷ 0.30"], ["Answer", "R = 20 Ω"]],
          yt: { q: "A lamp has 12 V across it and 0.40 A through it. Calculate its resistance.", steps: [["Know", "V = 12 V, I = 0.40 A"], ["Equation", "R = V ÷ I"], ["Substitute", "R = 12 ÷ 0.40"], ["Answer", "R = 30 Ω"]] } },
        { t: "worked", q: "A 150 Ω resistor has 3.0 V across it. Calculate the current in milliamps (mA).", steps: [["Equation", "I = V ÷ R"], ["Substitute", "I = 3.0 ÷ 150"], ["Answer", "I = 0.020 A"], ["Convert", "0.020 × 1000 = 20 mA"]],
          yt: { q: "A 500 Ω resistor has 2.0 V across it. Calculate the current in mA.", steps: [["Equation", "I = V ÷ R"], ["Substitute", "I = 2.0 ÷ 500"], ["Answer", "I = 0.0040 A"], ["Convert", "4.0 mA"]] } },
        { t: "sub", h: "Ohm's law: ohmic conductors" },
        { t: "split", left: [{ t: "p", h: "For a <strong>fixed resistor at constant temperature</strong>, the current is <strong>directly proportional</strong> to the p.d.: double the p.d. and the current doubles. The resistance stays the same." }, { t: "p", h: "A component like this is an <strong>ohmic conductor</strong>. A graph of current against p.d. is a <strong>straight line through the origin</strong>." }], right: [{ t: "fig", cls: "fig-small", h: D.graph({ w: 320, h: 220, x: [0, 6, 1], y: [0, 0.3, 0.05], xLabel: "p.d. / V", yLabel: "current / A", series: [{ fn: (v) => v / 20, points: [[2, 0.1], [4, 0.2], [6, 0.3]] }], caption: "A 20 Ω resistor: straight line through the origin." }) }] },
        { t: "sub", h: "Why is there resistance?" },
        { t: "split", cls: "wide-fig", left: [{ t: "fig", h: metal(true) }], right: [{ t: "p", h: "Free electrons keep <strong>colliding with the ions</strong> in the metal. This opposes the flow of charge: resistance." }, { t: "p", h: "When the metal gets <strong>hotter</strong>, the ions vibrate more, so there are more collisions and the <strong>resistance increases</strong>. That is why Ohm's law needs ‘at constant temperature’." }] },
      ],
      try: [
        { t: "q", p: "Two circuits have the same 6 V battery. Circuit A has a 10 Ω resistor; circuit B has a 30 Ω resistor. Tick <strong>one</strong> box.", mcq: { o: ["Circuit A has the bigger current.", "Circuit B has the bigger current.", "Both have the same current.", "You cannot tell."], c: 0 } },
        { t: "q", type: "Supported", p: "Calculate the resistance of a component with 12 V across it and 0.60 A through it.", frame: [["Equation"], ["Substitute"], ["Answer", "unit:"]], frameA: ["R = V ÷ I", "R = 12 ÷ 0.60", "20 Ω"] },
        { t: "q", type: "Supported", p: "A current of 0.20 A flows through a 15 Ω resistor. Calculate the p.d. across it.", frame: [["Equation"], ["Substitute"], ["Answer", "unit:"]], frameA: ["V = I R", "V = 0.20 × 15", "3.0 V"] },
        { t: "q", type: "On your own", p: "A 220 Ω resistor has 5.5 V across it. Calculate the current in mA.", lines: 2, a: "I = V ÷ R = 5.5 ÷ 220 = 0.025 A = 25 mA" },
        { t: "q", p: "A student measures a component. Complete the table, plot the points and draw a line of best fit.", table: { head: ["p.d. / V", "current / A", "V ÷ I / Ω"], rows: [["1.0", "0.05", null], ["2.0", "0.10", null], ["3.0", "0.15", null], ["4.0", "0.20", null]], ans: [[null, null, "20"], [null, null, "20"], [null, null, "20"], [null, null, "20"]] },
          graph: { w: 60, h: 50, x: [1, 1], y: [0.05, 1], xLabel: "p.d. / V", yLabel: "current / A", points: [[1, 0.05], [2, 0.1], [3, 0.15], [4, 0.2]], fit: [[0, 0], [5, 0.25]] },
          after: [{ t: "p", h: "Is the component an ohmic conductor? Use the table and the graph." }], lines: 2, a: "Yes: V ÷ I is constant (20 Ω) and the graph is a straight line through the origin, so current is directly proportional to p.d." },
        { t: "q", p: "Explain why a resistor only has a constant resistance if its temperature stays the same.", lines: 3, starter: "If the resistor gets hotter, the ions …", a: "If it heats up, the ions vibrate more, so the electrons collide with them more often and the resistance increases. So R is only constant at constant temperature." },
      ],
      lab: { title: "Virtual Lab 3: Discover the resistance rule", aside: "Full steps: Virtual Labs worksheet pp. 12–16.", blocks: [
        { t: "lab", blocks: [
          { t: "p", h: "Set the resistor to <strong>10 Ω</strong>. Change only the battery setting. Measure the p.d. across the resistor and the current." },
          { t: "q", p: "Record and calculate.", table: { head: ["Battery setting / V", "p.d. / V", "current / A", "V ÷ I / Ω"], rows: [["2", null, null, null], ["4", null, null, null], ["6", null, null, null], ["8", null, null, null], ["10", null, null, null], ["12", null, null, null]], ans: [[null, "2.0", "0.20", "10"], [null, "4.0", "0.40", "10"], [null, "6.0", "0.60", "10"], [null, "8.0", "0.80", "10"], [null, "10", "1.0", "10"], [null, "12", "1.2", "10"]] } },
          { t: "q", p: "What happens to the current when the p.d. doubles? What stays constant?", lines: 2, a: "The current doubles (current ∝ p.d.). V ÷ I stays constant at 10 Ω, the resistance." },
        ] },
      ] },
      exam: [
        { tip: "In part (b) use your answer to (a). Quick check: 3 × the p.d. should give 3 × the current if R is constant.", p: "A fixed resistor has a p.d. of 2.0 V across it and a current of 0.10 A through it. Calculate its resistance.", marks: 2, frame: [["Equation"], ["Substitute"], ["Answer", "unit:"]], frameA: ["R = V ÷ I", "R = 2.0 ÷ 0.10", "20 Ω"] },
        { p: "The p.d. is increased to 6.0 V. The temperature stays constant. Calculate the new current.", marks: 2, lines: 2, a: "I = V ÷ R (1) = 6.0 ÷ 20 = 0.30 A (1)" },
      ],
      summary: ["Resistance opposes the current. Unit: <strong>ohm (Ω)</strong>.", "<strong>V = I R</strong>. Convert mA → A (÷ 1000) and kΩ → Ω (× 1000).", "Ohmic conductor: I ∝ V at constant temperature; the graph is a straight line through the origin.", "Hotter metal → ions vibrate more → more collisions → higher resistance."],
      recall: [["What is the unit of resistance?", "Ohm (Ω)"], ["Write the equation linking p.d., current and resistance.", "V = I R"], ["What does an ohmic conductor's I–V graph look like?", "A straight line through the origin."], ["What happens to a metal's resistance as it heats up?", "It increases."]],
      cando: ["describe resistance and state its unit", "use V = I R and its rearrangements", "convert mA and kΩ", "decide from data or a graph whether a component is ohmic", "explain why heating increases resistance"],
    },

    // ============================================================ 5
    {
      n: 5, accent: "leaf", rp: "Required practical", title: "Resistance of a wire",
      spec: "AQA Combined RP 15 · Physics RP 3 · Part A",
      mapLine: "Required practical: how the length of a wire affects its resistance",
      big: "If you double the length of a wire, what happens to its resistance?",
      goals: ["set up a circuit to find resistance from V and I", "identify and control the variables", "record, process and graph results", "write a conclusion using evidence"],
      keywords: ["independent variable", "dependent variable", "control variable", "anomaly", "line of best fit"],
      online: { label: "Required practical · Resistance", path: "practical/resistance/", text: "Method, example results and a printable worksheet (Part A)." },
      order: ["doNow", "learn", "lab", "try", "exam", "revise"],
      doNow: [
        ["Calculate R for 1.2 V and 0.40 A.", "R = 1.2 ÷ 0.40 = 3.0 Ω"],
        ["Why does heating change a wire's resistance?", "Ions vibrate more, so more collisions: R increases."],
        ["Draw the symbols for an ammeter and a voltmeter.", "Circles containing A and V."],
      ],
      learnTitle: "Plan the practical",
      learn: [
        { t: "fig", cls: "fig-mid", h: wireCircuit },
        { t: "p", h: "One crocodile clip stays at 0 cm; you slide the other to change the length. The ammeter measures the current <em>through</em> the wire; the voltmeter measures the p.d. <em>across</em> the length between the clips. Then <strong>R = V ÷ I</strong>." },
        { t: "q", p: "Complete the variables table.", after: [{ t: "vars", rows: [["Independent variable (what you change)", "", "Length of wire between the clips"], ["Dependent variable (what you find)", "", "Resistance (calculated from V ÷ I)"], ["Control variables (keep the same)", "", "Material of the wire; diameter (thickness) of the wire; temperature"]] }] },
        { t: "sub", h: "Method" },
        { t: "steps", items: ["Set up the circuit. Fix one clip at 0 cm.", "Put the sliding clip at 10 cm. Switch on.", "Quickly read the ammeter and voltmeter. Switch off.", "Move the clip to 20 cm and repeat, up to 100 cm.", "Calculate R = V ÷ I for each length.", "Repeat any reading that does not fit the pattern."] },
        { t: "safety", items: ["The thin wire can get hot enough to burn. Do not touch it while the current is on.", "Switch off between readings. This also stops the wire heating up, which would change its resistance.", "Keep the p.d. low."] },
      ],
      lab: { title: "Results", aside: "Answer edition: example results. Yours will differ.", blocks: [
        { t: "lab", blocks: [
          { t: "q", p: "Record your readings and calculate the resistance.", table: { head: ["Length / cm", "p.d. / V", "current / A", "R = V ÷ I / Ω"], rows: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((l) => [String(l), null, null, null]), ans: [[null, "0.20", "0.40", "0.50"], [null, "0.40", "0.40", "1.0"], [null, "0.60", "0.40", "1.5"], [null, "0.80", "0.40", "2.0"], [null, "1.00", "0.40", "2.5"], [null, "1.44", "0.40", "3.6 (anomaly)"], [null, "1.40", "0.40", "3.5"], [null, "1.60", "0.40", "4.0"], [null, "1.80", "0.40", "4.5"], [null, "2.00", "0.40", "5.0"]] } },
          { t: "q", p: "Plot resistance (up the side) against length (along the bottom). Draw a line of best fit.", graph: { w: 110, h: 60, x: [10, 1], y: [1, 1], xLabel: "length / cm", yLabel: "resistance / Ω", points: [[10, 0.5], [20, 1], [30, 1.5], [40, 2], [50, 2.5], [60, 3.6], [70, 3.5], [80, 4], [90, 4.5], [100, 5]], fit: [[0, 0], [105, 5.25]] } },
        ] },
      ] },
      tryTitle: "Analyse and evaluate",
      try: [
        { t: "q", p: "Describe the pattern shown by your graph.", starter: "As the length increases, the resistance …", lines: 2, a: "increases. The line is straight and passes through the origin, so resistance is directly proportional to length." },
        { t: "q", p: "Use your graph to find the resistance of 75 cm of the wire.", lines: 1, a: "About 3.75 Ω (from the example line)." },
        { t: "q", p: "Circle any anomalous result in your table. Suggest one possible cause.", lines: 2, a: "e.g. 60 cm in the example. Causes: the wire heated up; a poor clip contact; the length or a meter was misread." },
        { t: "q", p: "Why is the circuit switched off between readings? Tick <strong>one</strong> box.", mcq: { o: ["to save the battery", "to stop the wire heating up and changing its resistance", "to reset the ammeter", "to make the voltmeter more accurate"], c: 1, cols: 2 } },
        { t: "q", p: "A student's line of best fit crosses the resistance axis a little above zero. Suggest why.", lines: 2, a: "The fixed clip was not exactly at 0 cm, or there is extra resistance in the clips and connections: a systematic error." },
      ],
      exam: [
        { tip: "A 6-mark method covers: the circuit, what you change and how, what you measure, how you calculate R, how you keep it fair and safe, and what you do with the results.", p: "Describe how you would investigate how the resistance of a wire depends on its length.", marks: 6, lines: 9, a: "Any six: ammeter in series with the wire and voltmeter across the measured length (circuit); change the length by moving a clip along a metre ruler; record V and I for each length; calculate R = V ÷ I; keep material and diameter the same; keep p.d. low and switch off between readings so the temperature stays constant; repeat readings and plot R against length." },
      ],
      summary: ["Resistance of a wire: <strong>R = V ÷ I</strong>, ammeter in series, voltmeter across the wire.", "Change the length. Keep material, diameter and temperature the same.", "Resistance is <strong>directly proportional</strong> to length.", "Switch off between readings so the wire does not heat up."],
      recall: [["What are the independent and dependent variables?", "Length; resistance."], ["Why keep the current small?", "To stop the wire heating (R would increase)."], ["How does resistance change with length?", "Directly proportional."], ["Name two control variables.", "Material; diameter (thickness)."]],
      cando: ["draw and set up the circuit to find a resistance", "name the independent, dependent and control variables", "plot a graph and draw a line of best fit", "spot an anomaly and suggest a cause"],
    },

    // ============================================================ 6
    {
      n: 6, accent: "spark", title: "Series and parallel circuits",
      spec: "AQA Combined 6.2.2 · Physics 4.2.2",
      mapLine: "Current, p.d. and resistance rules for series and parallel circuits",
      big: "When one bulb in your kitchen blows, why don't all the other lights in the house go out?",
      goals: ["tell series and parallel circuits apart", "use the rules for current and p.d. in each", "calculate total resistance in series", "explain why adding a parallel branch lowers the total resistance"],
      keywords: ["series", "parallel", "branch", "junction", "total resistance"],
      online: { label: "Mission 5 · Series & parallel", path: "lesson/series-and-parallel/", text: "Revision notes, 6 practice questions and a go-further box." },
      doNow: [
        ["0.50 A flows through a 12 Ω resistor. Calculate the p.d.", "V = 0.50 × 12 = 6.0 V"],
        ["How does the resistance of a wire depend on its length?", "Directly proportional."],
        ["What is the unit of p.d., and what does it mean?", "Volt; joules per coulomb."],
      ],
      learnTitle: "Two ways to connect",
      learn: [
        { t: "figs", cols: 2, cls: "fig-small", items: [seriesLamps, parallelLamps] },
        { t: "p", h: "In <strong>series</strong> there is one loop. In <strong>parallel</strong> the current splits at a <strong>junction</strong> into separate <strong>branches</strong>, and each branch makes its own loop through the cell." },
        { t: "compare", head: ["", "Series (one loop)", "Parallel (branches)"], rows: [["Current", "the <strong>same</strong> everywhere", "<strong>splits</strong> at a junction; branch currents <strong>add up</strong> to the supply current"], ["p.d.", "<strong>shared</strong>: component p.d.s add up to the supply p.d.", "the <strong>same</strong> across each branch as across the supply"], ["Resistance", "<strong>adds</strong>: R<sub>total</sub> = R₁ + R₂", "total is <strong>less</strong> than the smallest branch resistance"], ["One lamp breaks", "all the lamps go out", "the other branches keep working"]] },
        { t: "figs", cols: 2, cls: "fig-mid", items: [seriesNumbers, parallelNumbers] },
        { t: "eq", eq: "R<sub>total</sub> = R₁ + R₂", words: "total resistance of components in series", units: "all resistances in ohms (Ω)", re: "Adding a resistor in series always increases the total resistance." },
        { t: "worked", q: "A 5.0 Ω and a 7.0 Ω resistor are in series with a 6.0 V battery. Find the total resistance, the current and the p.d. across each resistor.", steps: [["Total R", "5.0 + 7.0 = 12 Ω"], ["Current", "I = V ÷ R = 6.0 ÷ 12 = 0.50 A"], ["p.d. 5 Ω", "V = I R = 0.50 × 5.0 = 2.5 V"], ["p.d. 7 Ω", "V = 0.50 × 7.0 = 3.5 V"], ["Check", "2.5 V + 3.5 V = 6.0 V ✓"]],
          yt: { q: "A 3.0 Ω and a 9.0 Ω resistor are in series with a 12 V battery. Find the same four things.", steps: [["Total R", "12 Ω"], ["Current", "I = 12 ÷ 12 = 1.0 A"], ["p.d. 3 Ω", "1.0 × 3.0 = 3.0 V"], ["p.d. 9 Ω", "1.0 × 9.0 = 9.0 V"], ["Check", "3.0 + 9.0 = 12 V ✓"]] } },
        { t: "model", title: "Why does a parallel branch lower the resistance?", h: "Think of supermarket checkouts. Opening a second checkout does not slow down the first one: it gives shoppers <em>another route</em>, so more people get through each minute. A parallel branch is another route for charge. The supply current goes up at the same p.d., so the total resistance (V ÷ I) goes down.", breaks: "shoppers choose a queue; charge divides according to each branch's resistance." },
      ],
      try: [
        { t: "q", p: "Is each circuit series or parallel? Circle one.", options: { cols: 4, items: [
          { label: "A", fig: D.circuit({ w: 200, h: 130, wires: ["M30 30 H170 V100 H30 Z"], parts: [["cell", 100, 30, "h"], ["lamp", 60, 100, "h"], ["lamp", 140, 100, "h"]] }), choice: ["Series", "Parallel"], c: 0 },
          { label: "B", fig: D.circuit({ w: 200, h: 150, wires: ["M30 30 H170 V90 H30 Z", "M60 90 V130 H140 V90"], parts: [["cell", 100, 30, "h"], ["resistor", 100, 90, "h"], ["resistor", 100, 130, "h"]], dots: [[60, 90], [140, 90]] }), choice: ["Series", "Parallel"], c: 1 },
          { label: "C", fig: D.circuit({ w: 200, h: 130, wires: ["M30 30 H170 V100 H30 Z"], parts: [["battery", 100, 30, "h"], ["resistor", 70, 100, "h"], ["ammeter", 140, 100, "h"], ["lamp", 170, 65, "v"]] }), choice: ["Series", "Parallel"], c: 0 },
          { label: "D", fig: D.circuit({ w: 200, h: 150, wires: ["M30 30 H170 V130 H30 Z", "M100 30 V130"], parts: [["cell", 30, 80, "v"], ["lamp", 100, 80, "v"], ["lamp", 170, 80, "v"]], dots: [[100, 30], [100, 130]] }), choice: ["Series", "Parallel"], c: 1 },
        ] } },
        { t: "q", fig: D.circuit({ w: 380, h: 220, wires: ["M40 40 H340 V140 H40 Z", "M105 140 V190 H175 V140", "M215 140 V190 H285 V140"], parts: [["battery", 190, 40, "h", "9.0 V"], ["ammeter", 40, 90, "v", "A₁ = 0.40 A", "r"], ["ammeter", 340, 90, "v", "A₂ = ?", "l"], ["lamp", 140, 140, "h"], ["lamp", 250, 140, "h"], ["voltmeter", 140, 190, "h", "V₁ = 4.0 V", "b"], ["voltmeter", 250, 190, "h", "V₂ = ?", "b"]], dots: [[105, 140], [175, 140], [215, 140], [285, 140]] }), figCls: "fig-small", p: "Series circuit: write down the readings on A₂ and V₂. Give a reason for each.", lines: 2, a: "A₂ = 0.40 A (same current everywhere in series). V₂ = 9.0 − 4.0 = 5.0 V (p.d.s add up to the supply p.d.)." },
        { t: "q", fig: D.circuit({ w: 380, h: 250, wires: ["M40 40 H340 V140 H40 Z", "M110 140 V200 H270 V140"], parts: [["battery", 190, 40, "h", "6.0 V"], ["ammeter", 40, 90, "v", "A = ?", "r"], ["lamp", 160, 140, "h"], ["ammeter", 225, 140, "h", "0.25 A"], ["lamp", 160, 200, "h"], ["ammeter", 225, 200, "h", "0.15 A", "b"]], dots: [[110, 140], [270, 140]] }), figCls: "fig-small", p: "Parallel circuit: what does ammeter A read? What is the p.d. across each lamp?", lines: 2, a: "A = 0.25 + 0.15 = 0.40 A. Each lamp has 6.0 V across it (the same as the supply)." },
        { t: "q", type: "Supported", p: "A 10 Ω and a 20 Ω resistor are in series with a 6.0 V battery. Calculate the total resistance and the current.", frame: [["Total R"], ["Equation"], ["Substitute"], ["Answer", "unit:"]], frameA: ["10 + 20 = 30 Ω", "I = V ÷ R", "I = 6.0 ÷ 30", "0.20 A"] },
        { t: "q", p: "A 6.0 Ω and a 12 Ω resistor are connected in <strong>parallel</strong>. Which could be their total resistance?", mcq: { o: ["18 Ω", "9.0 Ω", "6.0 Ω", "4.0 Ω"], c: 3, cols: 4 }, a: "Less than the smallest resistor (6.0 Ω), so 4.0 Ω." },
        { t: "q", p: "Answer the big question. Give <strong>two</strong> reasons why the lights in a house are wired in parallel.", lines: 3, a: "If one lamp breaks, the others stay on (each branch is its own loop). Each lamp gets the full supply p.d. Each light can be switched on and off on its own." },
      ],
      exam: [
        { tip: "Show the equation for each step. You can still get later marks with an earlier wrong answer if your method is right.", p: "A 4.0 Ω resistor and an 8.0 Ω resistor are connected in series to a 12 V battery. (a) Calculate the total resistance. (b) Calculate the current. (c) Calculate the p.d. across the 8.0 Ω resistor.", marks: 5, lines: 5, a: "(a) 4.0 + 8.0 = 12 Ω (1). (b) I = V ÷ R (1) = 12 ÷ 12 = 1.0 A (1). (c) V = I R = 1.0 × 8.0 (1) = 8.0 V (1)." },
      ],
      summary: ["Series: <strong>same current</strong>; p.d.s <strong>add up</strong>; R<sub>total</sub> = R₁ + R₂.", "Parallel: <strong>same p.d.</strong> across each branch; branch currents <strong>add up</strong>.", "Adding a branch in parallel <strong>lowers</strong> the total resistance: there is another path, so more current flows.", "Houses are wired in parallel."],
      recall: [["In series, what is the same everywhere?", "The current."], ["In parallel, what is the same for each branch?", "The p.d."], ["Total resistance of 3 Ω and 5 Ω in series?", "8 Ω"], ["Branch currents 0.2 A and 0.3 A. Supply current?", "0.5 A"]],
      cando: ["tell series and parallel circuits apart", "use the current and p.d. rules in series and parallel", "calculate total resistance, current and p.d.s in a series circuit", "explain why parallel branches reduce the total resistance"],
    },

    // ============================================================ 7
    {
      n: 7, accent: "copper", rp: "Required practical", title: "Resistors in series and parallel",
      spec: "AQA Combined RP 15 · Physics RP 3 · Part B",
      mapLine: "Required practical: measure total resistance of two resistors in series and in parallel",
      big: "Two identical resistors, three ways to connect them. Which arrangement lets the most current flow?",
      goals: ["measure the total resistance of resistors in series and in parallel", "compare results with R_total = R₁ + R₂", "explain the results using paths and current", "evaluate the measurements"],
      keywords: ["total resistance", "prediction", "uncertainty", "resolution", "evaluate"],
      online: { label: "Required practical · Resistance (Part B)", path: "practical/resistance/", text: "Method, example results and a printable worksheet (Part B)." },
      order: ["doNow", "learn", "lab", "try", "exam", "revise"],
      doNow: [
        ["Total resistance of 10 Ω and 15 Ω in series?", "25 Ω"],
        ["In parallel, what is the same for each branch?", "The p.d."],
        ["The supply current is 0.9 A. One branch carries 0.4 A. What does the other carry?", "0.5 A"],
      ],
      learnTitle: "Plan the practical",
      learn: [
        { t: "figs", cols: 2, cls: "fig-mid", items: [rpSeries, rpParallel] },
        { t: "p", h: "Measure the p.d. <strong>across the whole combination</strong> and the current <strong>from the supply</strong>. Then the total resistance is <strong>R = V ÷ I</strong>." },
        { t: "steps", items: ["Connect R₁ on its own. Measure V and I. Repeat for R₂ on its own.", "Connect R₁ and R₂ in series. Measure V across both, and I.", "Connect R₁ and R₂ in parallel. Measure V across the pair, and the supply current.", "Calculate R = V ÷ I for each arrangement."] },
        { t: "safety", items: ["Resistors can get hot. Switch off between readings.", "Keep the p.d. low, and check the circuit before switching on."] },
        { t: "q", p: "<strong>Predict</strong> before you measure. Rank R₁ alone, series and parallel from the <em>largest</em> to the <em>smallest</em> total resistance.", lines: 1, a: "series > one resistor > parallel" },
      ],
      lab: { title: "Results", aside: "Answer edition: example results with two 10 Ω resistors at 3.0 V.", blocks: [
        { t: "lab", blocks: [
          { t: "q", p: "Record your readings.", table: { head: ["Arrangement", "p.d. / V", "current / A", "R = V ÷ I / Ω"], rows: [["R₁ on its own", null, null, null], ["R₂ on its own", null, null, null], ["R₁ and R₂ in series", null, null, null], ["R₁ and R₂ in parallel", null, null, null]], ans: [[null, "3.0", "0.30", "10"], [null, "3.0", "0.30", "10"], [null, "3.0", "0.15", "20"], [null, "3.0", "0.60", "5.0"]] } },
        ] },
      ] },
      tryTitle: "Analyse and evaluate",
      try: [
        { t: "q", p: "Compare your series result with R₁ + R₂. Do they agree?", lines: 2, a: "Series ≈ 20 Ω and R₁ + R₂ = 10 + 10 = 20 Ω, so they agree (within measurement error)." },
        { t: "q", p: "Explain why the total resistance in parallel is <em>less</em> than either resistor on its own.", starter: "Adding a second branch gives the charge …", lines: 3, a: "… another path. At the same p.d. the supply current increases (0.60 A instead of 0.30 A). R = V ÷ I, so the total resistance is smaller." },
        { t: "q", p: "Suggest one source of error in the measurements and one way to reduce it.", lines: 2, a: "e.g. resistance of the leads and connections, or the resolution of the meters, or the resistors warming up. Use tight, short connections, meters with better resolution, and switch off between readings." },
        { t: "q", type: "Extra practice", p: "Resistors of 5.0 Ω, 10 Ω and 15 Ω are connected in series with a 6.0 V supply. Calculate the current.", frame: [["Total R"], ["Equation"], ["Substitute"], ["Answer", "unit:"]], frameA: ["5.0 + 10 + 15 = 30 Ω", "I = V ÷ R", "I = 6.0 ÷ 30", "0.20 A"] },
      ],
      exam: [
        { tip: "‘Explain’ needs a chain: another path → more current at the same p.d. → lower total resistance.", p: "Two identical resistors each have a resistance of 12 Ω. (a) Calculate their total resistance in series. (b) A student measures 6.0 Ω when they are connected in parallel. Explain why this is less than 12 Ω. (c) State one variable the student should keep the same for a fair comparison.", marks: 5, lines: 6, a: "(a) 12 + 12 = 24 Ω (1). (b) Parallel gives another path for the charge (1), so at the same p.d. the total current is larger (1), and R = V ÷ I is smaller (1). (c) The supply p.d., the same resistors, or the temperature (1)." },
      ],
      summary: ["Find total resistance from the <strong>supply current</strong> and the <strong>p.d. across the combination</strong>: R = V ÷ I.", "Series: the total is the sum (R₁ + R₂): bigger than either.", "Parallel: the total is smaller than either resistor.", "Evaluate by naming a specific source of error and a specific improvement."],
      recall: [["How do you find the total resistance of a combination in the lab?", "R = V ÷ I, with V across the combination and I from the supply."], ["Two 10 Ω resistors in series?", "20 Ω"], ["Is two 10 Ω in parallel more or less than 10 Ω?", "Less (it is 5 Ω)."], ["Give one source of error in this practical.", "Resistance of leads; meter resolution; heating."]],
      cando: ["set up series and parallel combinations with the meters in the right places", "calculate total resistance from V and I", "explain why series adds and parallel lowers resistance", "suggest a specific improvement to a practical"],
    },

    // ============================================================ 8
    {
      n: 8, accent: "violet", title: "I–V graphs",
      spec: "AQA Combined 6.2.1.4 · Physics 4.2.1.4",
      mapLine: "I–V graphs of a fixed resistor, filament lamp and diode",
      big: "Every component has a ‘fingerprint’: the shape of its I–V graph. Could you identify a component from its graph alone?",
      goals: ["read an I–V graph, including negative values", "sketch and recognise the graphs for a fixed resistor, a filament lamp and a diode", "calculate the resistance at a point with R = V ÷ I", "explain the shape of each graph"],
      keywords: ["I–V characteristic", "filament lamp", "diode", "LED", "forward", "reverse"],
      online: { label: "Mission 6 · I–V characteristics", path: "lesson/iv-characteristics/", text: "Revision notes with graphs and 5 practice questions." },
      doNow: [
        ["What is an ohmic conductor?", "Current ∝ p.d. at constant temperature (constant resistance)."],
        ["Why does a metal's resistance increase when it gets hot?", "Ions vibrate more, so more collisions."],
        ["Calculate R for 4.0 V and 0.20 A.", "20 Ω"],
      ],
      learnTitle: "Reading component fingerprints",
      learn: [
        { t: "split", left: [{ t: "p", h: "On an <strong>I–V graph</strong>, current (I) goes up the side and p.d. (V) goes along the bottom." }, { t: "p", h: "Negative values mean the component is connected <strong>the other way round</strong>, so the current flows the other way." }, { t: "key", h: "To find the resistance at any point, read V and I and use <strong>R = V ÷ I</strong>. Do not use the gradient." }], right: [{ t: "fig", cls: "fig-small", h: D.graph({ sketch: true, w: 300, h: 220, x: [-1, 1, 1], y: [-1, 1, 1], xLabel: "p.d. / V", yLabel: "current / A", series: [{ fn: (x) => 0.8 * x, from: -1, to: 1 }], notes: [[0.08, 0.74, "forward:"], [0.08, 0.59, "+ V, + I"], [-0.5, -0.74, "reversed:"], [-0.5, -0.89, "− V, − I"]] }) }] },
        { t: "figs", cols: 3, items: [
          D.ivSketch("resistor", "<strong>Fixed resistor</strong>: straight line through the origin. Constant resistance (at constant temperature)."),
          D.ivSketch("lamp", "<strong>Filament lamp</strong>: gets less steep. Resistance increases as the filament heats up."),
          D.ivSketch("diode", "<strong>Diode</strong>: current flows in one direction only. Very high resistance in reverse."),
        ] },
        { t: "sub", h: "Why does the lamp graph bend?" },
        { t: "p", h: "As the p.d. increases, the current increases. The current <strong>heats the filament</strong>. Hotter metal ions vibrate more, so electrons collide with them more often and the <strong>resistance increases</strong>. Each extra volt adds less current than the one before, so the graph gets less steep. It has the same shape for negative p.d. because the filament heats up whichever way the current flows." },
        { t: "sub", h: "Diodes and LEDs" },
        { t: "split", cls: "narrow-fig", left: [{ t: "p", h: "A <strong>diode</strong> lets current flow in one direction only: the way its triangle points. In the other direction its resistance is very high, so there is almost no current. Diodes protect circuits, for example if a battery is put in the wrong way round." }, { t: "p", h: "An <strong>LED</strong> (light-emitting diode) is a diode that gives out light when a current flows through it." }], right: [{ t: "symbank", items: [["diode", "Diode"], ["led", "LED"], ["lamp", "Filament lamp"]] }] },
      ],
      try: [
        { t: "q", p: "Name the component that gives each graph.", options: { cols: 3, items: [
          { label: "Graph A", fig: D.ivSketch("lamp") }, { label: "Graph B", fig: D.ivSketch("diode") }, { label: "Graph C", fig: D.ivSketch("resistor") },
        ] }, lines: 1, a: "A: filament lamp. B: diode. C: fixed resistor." },
        { t: "q", p: "This is the I–V graph for a filament lamp. (a) Read the current at 2.0 V and at 6.0 V. (b) Calculate the resistance at each p.d. (c) Explain why they are different.", fig: D.graph({ w: 340, h: 230, x: [0, 6, 1], y: [0, 0.35, 0.05], xLabel: "p.d. / V", yLabel: "current / A", series: [{ fn: lampFn, from: 0, to: 6 }] }), figCls: "fig-mid", lines: 4, a: "(a) 0.20 A and 0.30 A. (b) R = 2.0 ÷ 0.20 = 10 Ω; R = 6.0 ÷ 0.30 = 20 Ω. (c) The larger current heats the filament more, so its resistance increases." },
        { t: "q", p: "Number these statements 1–6 to explain the shape of a filament lamp's graph.", order: [["4", "The electrons collide with the ions more often"], ["2", "The filament gets hotter"], ["6", "So the I–V graph gets less steep"], ["1", "The p.d. and the current increase"], ["3", "The metal ions vibrate more"], ["5", "The resistance of the filament increases"]] },
        { t: "q", p: "A component carries 0.10 A at 2.0 V and 0.15 A at 4.0 V. Is it an ohmic conductor? Show your working.", lines: 3, a: "R = 2.0 ÷ 0.10 = 20 Ω; R = 4.0 ÷ 0.15 = 27 Ω. The resistance changes, so it is not ohmic." },
        { t: "q", p: "What happens to the current through a diode when it is connected the other way round? Suggest one use for this.", lines: 2, a: "There is (almost) no current: the diode has a very high resistance in reverse. Use: protecting a circuit from a battery put in backwards, or making sure current flows only one way." },
      ],
      exam: [
        { tip: "A sketch needs labelled axes and the right shape in both directions. The explanation needs cause → effect: current → heating → resistance.", p: "Sketch the I–V graph of a filament lamp for positive and negative p.d. Then explain its shape.", marks: 4, box: 45, grid: true, a: D.ivSketch("lamp") + "<br>Curve through the origin (1) that gets less steep at higher p.d. (1), with the same shape for negative p.d. (1). The current heats the filament, so its resistance increases (1)." },
      ],
      summary: ["I–V graph: current up the side, p.d. along the bottom. Negative = connected the other way.", "Fixed resistor: straight line through the origin (constant R).", "Filament lamp: gets less steep; the filament heats up, so R increases.", "Diode: current in one direction only; very high resistance in reverse. An LED is a diode that gives out light.", "Resistance at a point: R = V ÷ I."],
      recall: [["Sketch the I–V graph for a fixed resistor.", "Straight line through the origin."], ["Why does a filament lamp's resistance increase?", "It gets hotter, so the ions vibrate more and there are more collisions."], ["What does a diode do?", "Lets current flow in one direction only."], ["How do you find R at a point on an I–V graph?", "Read V and I; R = V ÷ I."]],
      cando: ["read values from an I–V graph, including negative values", "sketch the I–V graphs for a fixed resistor, lamp and diode", "calculate resistance at a point", "explain why the lamp graph curves"],
    },

    // ============================================================ 9
    {
      n: 9, accent: "leaf", rp: "Required practical", title: "Investigating I–V characteristics",
      spec: "AQA Combined RP 16 · Physics RP 4",
      mapLine: "Required practical: measure the I–V characteristics of a resistor, lamp and diode",
      big: "Can you produce the fingerprint graphs of a resistor, a lamp and a diode yourself?",
      goals: ["set up a circuit to vary the p.d. and measure the current", "take readings in both directions, safely", "plot an I–V graph with positive and negative values", "describe how the method changes for a diode"],
      keywords: ["variable resistor", "protective resistor", "reverse", "range", "interval"],
      online: { label: "Required practical · I–V characteristics", path: "practical/iv-characteristics/", text: "Method, example results, graphs and a printable worksheet." },
      order: ["doNow", "learn", "lab", "try", "exam", "revise"],
      doNow: [
        ["Sketch the I–V graph shape for a diode.", "Zero current for negative p.d.; almost none until a small positive p.d., then rises steeply."],
        ["Why does a lamp's resistance increase as the current increases?", "The filament heats up, so more collisions."],
        ["How is a voltmeter connected to a component?", "Across it, in parallel."],
      ],
      learnTitle: "Plan the practical",
      learn: [
        { t: "figs", cols: 2, cls: "fig-mid", items: [ivCircuit, diodeCircuit] },
        { t: "p", h: "The <strong>variable resistor</strong> changes the p.d. across the test component. To get negative values, <strong>swap the connections</strong> to the power supply so the current flows the other way, and record those readings as negative." },
        { t: "steps", items: ["Set up the circuit with the fixed resistor as the test component.", "Use the variable resistor to set a range of p.d.s, for example from 0 to 6 V. Record V and I each time.", "Reverse the connections to the power supply. Repeat, recording V and I as negative values.", "Repeat for the filament lamp.", "Repeat for the diode with its protective resistor, taking small steps of p.d. from 0 to about 1 V."] },
        { t: "safety", items: ["The lamp gets hot. Do not touch it while it is on or just after.", "Do not go above the lamp's rated p.d. (for example 6 V).", "Always use the protective resistor with the diode, so the current stays small."] },
      ],
      lab: { title: "Results", aside: "Answer edition: example results. Your values will differ.", blocks: [
        { t: "lab", blocks: [
          { t: "q", p: "Aim for these p.d.s. Record the actual p.d. if it is slightly different.", table: { head: ["p.d. / V", "Resistor: current / A", "Lamp: current / A"], rows: ["−6.0", "−4.0", "−2.0", "−1.0", "0", "1.0", "2.0", "4.0", "6.0"].map((v) => [v, null, null]), ans: [[null, "−0.30", "−0.30"], [null, "−0.20", "−0.27"], [null, "−0.10", "−0.20"], [null, "−0.05", "−0.12"], [null, "0", "0"], [null, "0.05", "0.12"], [null, "0.10", "0.20"], [null, "0.20", "0.27"], [null, "0.30", "0.30"]] } },
          { t: "q", p: "Plot both components on the same axes. Use a different symbol for each, and add a key.", graph: { w: 120, h: 80, origin: "centre", x: [1, 1], y: [0.1, 1], xLabel: "p.d. / V", yLabel: "current / A", points: [[-6, -0.3], [-4, -0.27], [-2, -0.2], [-1, -0.12], [1, 0.12], [2, 0.2], [4, 0.27], [6, 0.3]], fit: lampFn, fitRange: [-6, 6], points2: [[-6, -0.3], [-4, -0.2], [-2, -0.1], [-1, -0.05], [1, 0.05], [2, 0.1], [4, 0.2], [6, 0.3]], fit2: [[-6, -0.3], [6, 0.3]] }, a: "Crosses and curve: filament lamp. Circles and dashed straight line: fixed resistor." },
          { t: "q", p: "Diode (with protective resistor).", table: { head: ["p.d. / V", "−1.0", "0", "0.2", "0.4", "0.5", "0.6", "0.65", "0.7"], rows: [["current / mA", null, null, null, null, null, null, null, null]], ans: [[null, "0", "0", "0", "0", "0.5", "3.0", "8.0", "20"]] }, after: [{ t: "p", h: "Sketch the shape of the diode graph from your readings." }], box: 30, grid: true, a: D.ivSketch("diode") },
        ] },
      ] },
      tryTitle: "Analyse and evaluate",
      try: [
        { t: "q", p: "Describe the shape of your fixed-resistor graph. What does it show?", lines: 2, a: "A straight line through the origin, the same in both directions. Current ∝ p.d., so the resistance is constant." },
        { t: "q", p: "Use your lamp results to calculate its resistance at 1.0 V and at 6.0 V. Explain the difference.", lines: 3, a: "(Example) 1.0 ÷ 0.12 = 8.3 Ω; 6.0 ÷ 0.30 = 20 Ω. At a higher current the filament is hotter, so its resistance is higher." },
        { t: "q", p: "Why is a protective resistor used with the diode? Tick <strong>one</strong> box.", mcq: { o: ["to make the diode light up", "to limit the current so the diode is not damaged", "to measure the p.d.", "to reverse the current"], c: 1 } },
        { t: "q", p: "Why were the diode readings taken in smaller steps of p.d.?", lines: 2, a: "The current changes very quickly over a small range of p.d. (about 0.5–0.7 V), so small steps are needed to show the shape." },
        { t: "q", p: "A student plots the reversed readings as positive numbers. What will be wrong with the graph?", lines: 2, a: "All the points would be in the top-right quadrant. Reversed readings should be negative V and negative I, in the bottom-left quadrant." },
      ],
      exam: [
        { tip: "Name the equipment and say what it is for. Cover both directions, safety, and the changes for a diode.", p: "Describe a method to obtain the I–V characteristic of a filament lamp for positive and negative p.d. State two ways the method would change for a diode.", marks: 6, lines: 9, a: "Any six: ammeter in series and voltmeter across the lamp; vary the p.d. with a variable resistor or variable supply; record pairs of V and I readings over a range; reverse the supply connections to get negative values; stay below the lamp's rated p.d.; plot I against V. Diode: add a protective resistor in series; use smaller p.d. steps / a milliammeter." },
      ],
      summary: ["Vary the p.d. with a <strong>variable resistor</strong>; ammeter in series, voltmeter across the component.", "Reverse the supply connections for negative readings, and record them as negative.", "Diode: protective resistor, a milliammeter and small steps of p.d.", "Plot I (up) against V (along), with the origin in the middle."],
      recall: [["How do you change the p.d. across the component?", "Adjust the variable resistor (or variable supply)."], ["How do you get negative readings?", "Swap the connections to the supply."], ["Why is a protective resistor used with a diode?", "To limit the current and stop damage."], ["Where do reversed readings go on the graph?", "In the bottom-left quadrant (negative V and I)."]],
      cando: ["set up the I–V circuit and explain each part", "take and record readings in both directions", "plot an I–V graph with the origin in the middle", "describe the extra steps for a diode"],
    },

    // ============================================================ 10
    {
      n: 10, accent: "cyan", title: "Thermistors, LDRs and sensors",
      spec: "AQA Combined 6.2.1.4, 6.2.2 · Physics 4.2.1.4, 4.2.2",
      mapLine: "How thermistors and LDRs respond to temperature and light, and sensor circuits",
      big: "How does a streetlight know it's getting dark, and how does a fire alarm know the room is hot?",
      goals: ["describe how a thermistor's resistance changes with temperature", "describe how an LDR's resistance changes with light intensity", "predict the current in a sensor circuit", "choose the right sensor for a job"],
      keywords: ["thermistor", "LDR", "light intensity", "sensor"],
      online: { label: "Mission 6 · Thermistor and LDR", path: "lesson/iv-characteristics/", text: "Read the ‘Thermistor’ and ‘Light-dependent resistor’ sections and their questions." },
      doNow: [
        ["Which component's I–V graph gets less steep?", "Filament lamp."],
        ["At a fixed p.d., what happens to the current if the resistance doubles?", "It halves."],
        ["Draw the symbol for a diode.", "A triangle pointing at a bar, on a line."],
      ],
      learnTitle: "Components that sense",
      learn: [
        { t: "split", cls: "narrow-fig", left: [{ t: "p", h: "Some resistors change their resistance when their surroundings change. That makes them useful as <strong>sensors</strong>." }, { t: "p", h: "A <strong>thermistor</strong> responds to <strong>temperature</strong>. A <strong>light-dependent resistor (LDR)</strong> responds to <strong>light intensity</strong> (how bright it is)." }], right: [{ t: "symbank", items: [["thermistor", "Thermistor"], ["ldr", "LDR"]] }] },
        { t: "figs", cols: 2, cls: "fig-small", items: [
          sketch(fallCurve, "temperature", "resistance", "<strong>Thermistor</strong>: as the temperature increases, its resistance decreases."),
          sketch(fallCurve, "light intensity", "resistance", "<strong>LDR</strong>: as the light gets brighter, its resistance decreases."),
        ] },
        { t: "key", h: "Both follow <strong>more → less</strong>: more heat or more light means less resistance." },
        { t: "compare", head: ["", "Thermistor", "LDR"], rows: [["Responds to", "temperature", "light intensity"], ["When that increases…", "resistance decreases", "resistance decreases"], ["Used in", "thermostats, fire alarms, car engine sensors", "night lights, streetlights, security lights"]] },
        { t: "sub", h: "Sensors in circuits" },
        { t: "split", cls: "narrow-fig", left: [{ t: "p", h: "In a series circuit with a fixed supply p.d., the current depends on the <strong>total resistance</strong>. When light shines on the LDR, its resistance falls, so the total resistance falls and the <strong>current rises</strong> (I = V ÷ R)." }, { t: "p", h: "A change in current (or in the p.d. across the fixed resistor) can be used to switch something on, such as a lamp or an alarm." }], right: [{ t: "fig", cls: "fig-small", h: D.circuit({ w: 300, h: 170, wires: ["M40 40 H260 V130 H40 Z"], parts: [["battery", 150, 40, "h", "6.0 V"], ["ldr", 90, 130, "h"], ["resistor", 170, 130, "h", "", "b"], ["ammeter", 260, 85, "v"]], caption: "An LDR in series with a fixed resistor." }) }] },
        { t: "worked", q: "A 6.0 V supply is connected to an LDR and a resistor in series. In bright light the total resistance is 600 Ω. Calculate the current.", steps: [["Equation", "I = V ÷ R"], ["Substitute", "I = 6.0 ÷ 600"], ["Answer", "I = 0.010 A (10 mA)"]],
          yt: { q: "In the dark, the total resistance rises to 1500 Ω. Calculate the new current.", steps: [["Equation", "I = V ÷ R"], ["Substitute", "I = 6.0 ÷ 1500"], ["Answer", "I = 0.0040 A (4.0 mA)"]] } },
      ],
      try: [
        { t: "q", p: "Complete the sentences.", fill: "When the temperature of a thermistor increases, its resistance [[decreases]]. When the light on an LDR gets brighter, its resistance [[decreases]]. So in the dark, an LDR has a [[high|18]] resistance.", bank: ["increases", "decreases", "high", "low"] },
        { t: "q", p: "Choose a thermistor or an LDR for each job, and give a reason.", table: { head: ["Job", "Sensor", "Why"], rows: [["Fire alarm", null, null], ["Automatic garden light", null, null], ["Greenhouse heater that switches on when it is cold", null, null], ["Camera that measures how bright a scene is", null, null]], ans: [[null, "thermistor", "detects a rise in temperature"], [null, "LDR", "detects when it gets dark"], [null, "thermistor", "detects a fall in temperature"], [null, "LDR", "detects light intensity"]] } },
        { t: "q", p: "A thermistor is in series with an ammeter and a 12 V supply. The thermistor is put into hot water. Describe and explain what happens to the ammeter reading.", lines: 3, a: "The reading increases. The thermistor gets hotter, so its resistance decreases, the total resistance decreases, and I = V ÷ R increases." },
        { t: "q", type: "Supported", p: "A 12 V sensor circuit has a total resistance of 300 Ω. Calculate the current.", frame: [["Equation"], ["Substitute"], ["Answer", "unit:"]], frameA: ["I = V ÷ R", "I = 12 ÷ 300", "0.040 A"] },
        { t: "q", p: "Which change would <strong>increase</strong> the current through a thermistor in a series circuit?", mcq: { o: ["cooling the thermistor", "heating the thermistor", "covering it with a black cloth", "adding another resistor in series"], c: 1 } },
      ],
      exam: [
        { tip: "For ‘explain’, link each step: light → LDR resistance → total resistance → current.", p: "A 6.0 V supply is connected to an LDR and a fixed resistor in series. In dim light the total resistance is 1500 Ω. (a) Calculate the current. (b) Explain what happens to the current when the light becomes brighter.", marks: 4, lines: 5, a: "(a) I = V ÷ R (1) = 6.0 ÷ 1500 = 0.0040 A (1). (b) The LDR's resistance decreases (1), so the total resistance decreases and the current increases (1)." },
      ],
      summary: ["Thermistor: temperature up → resistance <strong>down</strong>.", "LDR: light intensity up → resistance <strong>down</strong>.", "In a series circuit at a fixed p.d.: lower total resistance → bigger current.", "Thermistors sense temperature (thermostats, fire alarms); LDRs sense light (streetlights, night lights)."],
      recall: [["What happens to a thermistor's resistance as it warms up?", "It decreases."], ["What happens to an LDR's resistance in the dark?", "It increases (it is high)."], ["Which sensor would you use in a streetlight?", "An LDR."], ["Total R falls in a series circuit. What happens to the current?", "It increases."]],
      cando: ["describe how a thermistor responds to temperature", "describe how an LDR responds to light", "explain how the current in a sensor circuit changes", "choose and justify a sensor for a job"],
    },

    // ============================================================ 11
    {
      n: 11, accent: "spark", title: "Power and energy transfer",
      spec: "AQA Combined 6.2.4.1–6.2.4.2 · Physics 4.2.4.1–4.2.4.2",
      mapLine: "Power, E = P t, P = V I, P = I² R, energy transfers in appliances",
      big: "Which transfers more energy: a 3 kW kettle boiling for 3 minutes, or a 10 W LED lamp left on for 5 hours?",
      goals: ["describe power as the energy transferred per second", "use E = P t, P = V I and P = I² R with the right units", "describe the energy transfers in everyday appliances", "choose the right equation for a question"],
      keywords: ["power", "watt (W)", "kilowatt (kW)", "energy transferred", "power rating"],
      online: { label: "Mission 7 · Power & the National Grid", path: "lesson/power-and-national-grid/", text: "Read the power and energy sections, then try questions 1–4." },
      doNow: [
        ["5.0 C passes through a 12 V lamp. How much energy is transferred?", "E = Q V = 60 J"],
        ["2.0 A flows for 1 minute. How much charge flows?", "Q = 2.0 × 60 = 120 C"],
        ["What is the resistance of a heater with 230 V across it and 5.0 A through it?", "R = 230 ÷ 5.0 = 46 Ω"],
      ],
      learnTitle: "How fast is energy transferred?",
      learn: [
        { t: "p", h: "<strong>Power</strong> is the <strong>energy transferred per second</strong>. It is measured in <strong>watts (W)</strong>: 1 W = 1 J per second. A 2000 W (2 kW) kettle transfers 2000 J of energy every second." },
        { t: "compare", head: ["Appliance", "Typical power", "Energy transferred each second"], rows: [["LED lamp", "10 W", "10 J"], ["Laptop", "60 W", "60 J"], ["Hairdryer", "1.2 kW = 1200 W", "1200 J"], ["Kettle", "2.2 kW = 2200 W", "2200 J"], ["Electric shower", "9 kW = 9000 W", "9000 J"]] },
        { t: "p", h: "Every appliance transfers energy electrically from the mains to other energy stores: a kettle to the <strong>thermal store</strong> of the water; a hairdryer's fan to <strong>kinetic</strong> energy and its heater to thermal; a phone charger to the <strong>chemical store</strong> of the battery." },
        { t: "eq", eq: "E = P t", words: "energy transferred = power × time", units: "E in joules (J) · P in watts (W) · t in seconds (s)", re: "Convert kW → W (× 1000) and minutes or hours → seconds first." },
        { t: "worked", q: "A 2.0 kW kettle is on for 3.0 minutes. Calculate the energy transferred.", steps: [["Know", "P = 2000 W, t = 180 s"], ["Equation", "E = P t"], ["Substitute", "E = 2000 × 180"], ["Answer", "E = 360 000 J"]],
          yt: { q: "A 1.2 kW hairdryer is used for 10 minutes. Calculate the energy transferred.", steps: [["Know", "P = 1200 W, t = 600 s"], ["Equation", "E = P t"], ["Substitute", "E = 1200 × 600"], ["Answer", "E = 720 000 J"]] } },
        { t: "eq", eq: "P = V I", words: "power = p.d. × current", units: "P in watts (W) · V in volts (V) · I in amperes (A)" },
        { t: "eq", eq: "P = I² R", words: "power = current² × resistance", units: "P in watts (W) · I in amperes (A) · R in ohms (Ω)" },
        { t: "worked", q: "A heater on the 230 V mains draws a current of 4.0 A. Calculate its power.", steps: [["Equation", "P = V I"], ["Substitute", "P = 230 × 4.0"], ["Answer", "P = 920 W"]],
          yt: { q: "A current of 3.0 A flows through a 20 Ω resistor. Calculate the power.", steps: [["Equation", "P = I² R"], ["Substitute", "P = 3.0² × 20 = 9.0 × 20"], ["Answer", "P = 180 W"]] } },
        { t: "key", h: "In P = I² R, <strong>square the current first</strong>. Doubling the current makes the heating <strong>four times</strong> bigger: that is why cables carrying big currents get hot." },
        { t: "compare", head: ["If you know…", "use"], rows: [["p.d. and current", "P = V I"], ["current and resistance", "P = I² R"], ["power and time", "E = P t"], ["charge and p.d.", "E = Q V"], ["current and time", "Q = I t"]] },
      ],
      try: [
        { t: "q", p: "Answer the big question. Show both calculations.", lines: 4, a: "Kettle: E = 3000 × 180 = 540 000 J. LED: t = 5 × 3600 = 18 000 s, E = 10 × 18 000 = 180 000 J. The kettle transfers 3 times as much energy." },
        { t: "q", type: "Supported", p: "A 12 V car headlamp draws a current of 5.0 A. Calculate its power.", frame: [["Equation"], ["Substitute"], ["Answer", "unit:"]], frameA: ["P = V I", "P = 12 × 5.0", "60 W"] },
        { t: "q", type: "Supported", p: "A 9.0 kW electric shower runs for 8.0 minutes. Calculate the energy transferred in joules.", frame: [["Convert"], ["Equation"], ["Substitute"], ["Answer", "unit:"]], frameA: ["P = 9000 W, t = 480 s", "E = P t", "E = 9000 × 480", "4 320 000 J"] },
        { t: "q", type: "On your own", p: "A current of 2.0 A flows through a 10 Ω resistor. Then the current is increased to 4.0 A. Calculate the power each time. What happens to the power when the current doubles?", lines: 3, a: "P = 2.0² × 10 = 40 W; P = 4.0² × 10 = 160 W. The power is 4 times bigger." },
        { t: "q", type: "On your own", p: "A device transfers 240 J of energy when 40 C of charge flows through it. Calculate the p.d. across it.", lines: 2, a: "V = E ÷ Q = 240 ÷ 40 = 6.0 V" },
        { t: "q", type: "Challenge", p: "A lamp is rated 60 W, 230 V. Calculate the current through it and its resistance.", lines: 3, a: "I = P ÷ V = 60 ÷ 230 = 0.26 A. R = V ÷ I = 230 ÷ 0.26 ≈ 880 Ω." },
      ],
      exam: [
        { tip: "Write the power in watts before you substitute: 2.2 kW = 2200 W. Give answers to a sensible number of significant figures.", p: "A 2.2 kW kettle runs on the 230 V mains. (a) Calculate the current through the kettle. (b) Calculate the energy transferred in 150 s. (c) A heater draws twice this current through the same resistance. How does its heating power compare?", marks: 6, lines: 7, a: "(a) P = 2200 W (1); I = P ÷ V = 2200 ÷ 230 (1) = 9.6 A (1). (b) E = P t = 2200 × 150 (1) = 330 000 J (1). (c) P = I² R, so it is 4 times the power (1)." },
      ],
      summary: ["Power is energy transferred per second. 1 W = 1 J/s.", "<strong>E = P t</strong> (P in W, t in s).", "<strong>P = V I</strong> and <strong>P = I² R</strong>.", "Doubling the current through a resistor makes the heating 4 times bigger.", "Appliances transfer energy electrically to thermal, kinetic or chemical stores."],
      recall: [["What is power?", "Energy transferred per second."], ["Convert 3.5 kW into watts.", "3500 W"], ["Write two equations for electrical power.", "P = V I and P = I² R"], ["Write the equation linking energy, power and time.", "E = P t"]],
      cando: ["describe power as energy transferred per second", "use E = P t with unit conversions", "use P = V I and P = I² R", "choose the right equation from the data given"],
    },

    // ============================================================ 12
    {
      n: 12, accent: "copper", title: "Mains, safety and the National Grid",
      spec: "AQA Combined 6.2.3, 6.2.4.3 · Physics 4.2.3, 4.2.4.3",
      mapLine: "ac and dc, 230 V 50 Hz mains, three-core cable, earthing, the National Grid",
      big: "Pylon cables carry up to 400 000 V. Why so high, and why do we only get 230 V at the plug?",
      goals: ["describe the difference between ac and dc", "state the UK mains values: 230 V, 50 Hz", "explain how the earth wire and fuse protect you", "explain why the National Grid uses very high p.d.s"],
      keywords: ["alternating (ac)", "direct (dc)", "live", "neutral", "earth", "fuse", "National Grid", "transformer"],
      online: { label: "Missions 7 and 8", path: "lesson/mains-electricity/", text: "Mission 8: Mains & safety, then the National Grid sections of Mission 7." },
      doNow: [
        ["A 230 V appliance draws 10 A. Calculate its power.", "P = V I = 2300 W"],
        ["The current in a cable is halved. What happens to the heating (P = I² R)?", "It falls to a quarter."],
        ["What is the unit of power?", "Watt (W)."],
      ],
      learnTitle: "From power station to plug",
      learn: [
        { t: "sub", h: "Direct and alternating p.d." },
        { t: "figs", cols: 2, cls: "fig-small", items: [
          D.graph({ sketch: true, w: 300, h: 190, x: [0, 1, 1], y: [-1, 1, 1], xLabel: "time", yLabel: "p.d.", series: [{ fn: () => 0.6, from: 0, to: 1 }], caption: "<strong>dc</strong> from a cell or battery: the p.d. stays in one direction, so the current flows one way." }),
          D.graph({ sketch: true, w: 300, h: 190, x: [0, 1, 1], y: [-1, 1, 1], xLabel: "time", xLabelAbove: true, yLabel: "p.d.", series: [{ fn: (x) => 0.75 * Math.sin(4 * Math.PI * x), from: 0, to: 1 }], caption: "<strong>ac</strong> from the mains: the p.d. keeps reversing, so the current keeps changing direction." }),
        ] },
        { t: "key", h: "<strong>UK mains:</strong> alternating current (ac), about <strong>230 V</strong>, frequency <strong>50 Hz</strong> (50 complete cycles every second)." },
        { t: "sub", h: "Inside a plug cable" },
        { t: "split", cls: "narrow-fig", left: [{ t: "compare", head: ["Wire", "Colour", "Job"], rows: [["Live", "brown", "carries the alternating p.d. from the supply (about 230 V)"], ["Neutral", "blue", "completes the circuit; at or close to 0 V"], ["Earth", "green and yellow", "safety wire at 0 V; only carries a current if there is a fault"]] }], right: [{ t: "fig", h: D.threeCoreCable() }] },
        { t: "sub", h: "Why the live wire is dangerous" },
        { t: "p", h: "Your body is at 0 V (the same as the earth). The live wire is at about 230 V. If you touch it, there is a p.d. across your body, so a current flows through you to earth: an <strong>electric shock</strong>, which can kill. This can happen even when the appliance is switched off, because the live wire is still connected to the supply." },
        { t: "sub", h: "How the earth wire and fuse protect you" },
        { t: "steps", items: ["A fault makes the live wire touch the metal case.", "The earth wire connects the case to earth through a very low resistance.", "A very large current flows from the live wire, through the case and earth wire, to earth.", "The large current melts the fuse (or trips the circuit breaker).", "The live wire is disconnected, so the case is safe to touch."] },
        { t: "sub", h: "The National Grid" },
        { t: "split", left: [{ t: "p", h: "The <strong>National Grid</strong> is a nationwide system of cables and transformers linking power stations to homes and businesses." }, { t: "p", h: "<strong>Step-up transformers</strong> raise the p.d. to as much as 400 kV. For the same power (<strong>P = V I</strong>), a higher p.d. means a <strong>smaller current</strong>. A smaller current means much less heating in the cables (<strong>P = I² R</strong>), so less energy is wasted: the grid is <strong>efficient</strong>." }, { t: "p", h: "<strong>Step-down transformers</strong> then lower the p.d. to 230 V, which is safer for homes." }], right: [{ t: "fig", h: D.nationalGrid() }] },
        { t: "eq", eq: "V<sub>p</sub> I<sub>p</sub> = V<sub>s</sub> I<sub>s</sub>", words: "Higher tier only: for an ideal transformer, power in = power out", units: "p = primary (input) coil · s = secondary (output) coil" },
      ],
      try: [
        { t: "q", p: "Which graph shows ac and which shows dc? Circle one for each.", options: { cols: 2, items: [
          { label: "Graph A", fig: D.graph({ sketch: true, w: 260, h: 150, x: [0, 1, 1], y: [-1, 1, 1], xLabel: "time", xLabelAbove: true, yLabel: "p.d.", series: [{ fn: (x) => 0.7 * Math.sin(6 * Math.PI * x), from: 0, to: 1 }] }), choice: ["ac", "dc"], c: 0 },
          { label: "Graph B", fig: D.graph({ sketch: true, w: 260, h: 150, x: [0, 1, 1], y: [-1, 1, 1], xLabel: "time", yLabel: "p.d.", series: [{ fn: () => 0.45, from: 0, to: 1 }] }), choice: ["ac", "dc"], c: 1 },
        ] } },
        { t: "q", p: "Complete the sentences.", fill: "UK mains electricity is [[alternating]] with a p.d. of about [[230|16]] V and a frequency of [[50|14]] Hz. The [[live]] wire is brown, the [[neutral]] wire is blue and the [[earth]] wire is green and yellow.", bank: ["alternating", "direct", "230", "50", "live", "neutral", "earth"] },
        { t: "q", p: "Number the events 1–5 to show how an earthed metal case protects you.", order: [["3", "A large current flows through the earth wire"], ["1", "The live wire touches the metal case"], ["5", "The case is no longer live, so it is safe to touch"], ["2", "The case is connected to earth by a low-resistance wire"], ["4", "The fuse melts and breaks the circuit"]] },
        { t: "q", say: ["Ava", "Touching the live wire is only dangerous when the appliance is switched on."], p: "Explain why Ava is wrong.", lines: 3, a: "The live wire is still connected to the supply at about 230 V when the switch is off. Your body is at 0 V, so there is a p.d. across you and a current flows through you to earth: a shock." },
        { t: "q", p: "A power station sends 1 000 000 W through the grid. Use P = V I to find the current at 10 000 V and at 100 000 V. Then explain why the higher p.d. is better.", lines: 4, a: "I = P ÷ V = 1 000 000 ÷ 10 000 = 100 A; 1 000 000 ÷ 100 000 = 10 A. The current is 10 times smaller, so the heating in the cables (I² R) is 100 times smaller: much less energy is wasted." },
        { t: "q", type: "Higher tier", p: "An ideal transformer has 20 kV across the primary coil and 500 A in it. The p.d. across the secondary coil is 200 kV. Calculate the current in the secondary coil.", lines: 3, a: "V<sub>p</sub> I<sub>p</sub> = V<sub>s</sub> I<sub>s</sub>: I<sub>s</sub> = (20 000 × 500) ÷ 200 000 = 50 A" },
      ],
      exam: [
        { tip: "Safety answers are sequences. Use cause → effect words: ‘so’, ‘which means’, ‘therefore’.", p: "A toaster has a metal case connected to the earth wire. A fault makes the live wire touch the case. Explain how the earth wire and the fuse protect someone who then touches the toaster.", marks: 5, lines: 6, a: "The earth wire gives a low-resistance path from the case to earth (1). A very large current flows through the live and earth wires (1). This melts the fuse (1), which disconnects the live wire (1), so the case is not at a high p.d. and no current flows through the person (1)." },
        { p: "Explain why the National Grid transmits electricity at a very high p.d., and why the p.d. is reduced before it reaches homes.", marks: 4, lines: 5, a: "A step-up transformer increases the p.d. (1); for the same power, the current is smaller (1); a smaller current means less heating/energy loss in the cables, so it is more efficient (1); a step-down transformer reduces the p.d. to 230 V so it is safer in homes (1)." },
      ],
      summary: ["dc flows one way; ac keeps changing direction.", "UK mains: ac, 230 V, 50 Hz.", "Live (brown) ~230 V; neutral (blue) ~0 V; earth (green and yellow) safety wire.", "Earth wire + fuse: fault → big current → fuse melts → live disconnected.", "Grid: step up to high p.d. → small current → less heating (I² R) → efficient; step down to 230 V for safety."],
      recall: [["State the p.d. and frequency of UK mains.", "230 V, 50 Hz."], ["What colour is the live wire?", "Brown."], ["When does the earth wire carry a current?", "Only when there is a fault."], ["Why is a high p.d. used in the National Grid?", "Smaller current, so less heating and energy loss in the cables."]],
      cando: ["describe the difference between ac and dc", "state the UK mains p.d. and frequency", "name the three wires and their colours and jobs", "explain how the earth wire and fuse protect a user", "explain why the grid uses step-up and step-down transformers"],
    },
  ];

  // ---------- reference data ----------
  const equations = [
    { eq: "Q = I t", words: "charge flow = current × time", units: "C, A, s", re: "I = Q ÷ t · t = Q ÷ I", lesson: 2 },
    { eq: "E = Q V", words: "energy transferred = charge × p.d.", units: "J, C, V", re: "V = E ÷ Q · Q = E ÷ V", lesson: 3 },
    { eq: "V = I R", words: "p.d. = current × resistance", units: "V, A, Ω", re: "I = V ÷ R · R = V ÷ I", lesson: 4 },
    { eq: "R<sub>total</sub> = R₁ + R₂", words: "total resistance in series", units: "Ω", re: "(series only)", lesson: 6 },
    { eq: "P = V I", words: "power = p.d. × current", units: "W, V, A", re: "V = P ÷ I · I = P ÷ V", lesson: 11 },
    { eq: "P = I² R", words: "power = current² × resistance", units: "W, A, Ω", re: "R = P ÷ I² · I = √(P ÷ R)", lesson: 11 },
    { eq: "E = P t", words: "energy transferred = power × time", units: "J, W, s", re: "P = E ÷ t · t = E ÷ P", lesson: 11 },
    { eq: "V<sub>p</sub> I<sub>p</sub> = V<sub>s</sub> I<sub>s</sub>", words: "transformer: power in = power out (Higher tier)", units: "V, A", re: "I<sub>s</sub> = V<sub>p</sub> I<sub>p</sub> ÷ V<sub>s</sub>", lesson: 12, ht: true },
  ];

  const review = [
    { t: "q", p: "A current of 0.80 A flows through a lamp for 2.5 minutes. Calculate the charge that flows.", marks: 3, lines: 3, a: "t = 2.5 × 60 = 150 s (1); Q = I t = 0.80 × 150 (1) = 120 C (1)" },
    { t: "q", p: "A component transfers 48 J of energy when 8.0 C of charge passes through it. (a) Calculate the p.d. across it. (b) State what this p.d. means.", marks: 3, lines: 3, a: "(a) V = E ÷ Q = 48 ÷ 8.0 (1) = 6.0 V (1). (b) 6.0 J is transferred per coulomb of charge (1)." },
    { t: "q", fig: D.circuit({ w: 340, h: 160, wires: ["M40 40 H300 V120 H40 Z"], parts: [["battery", 170, 40, "h", "12 V"], ["resistor", 110, 120, "h", "6.0 Ω", "b"], ["resistor", 230, 120, "h", "6.0 Ω", "b"]] }), figCls: "fig-small", p: "Calculate the total resistance, the current, and the p.d. across one resistor.", marks: 4, lines: 4, a: "R = 6.0 + 6.0 = 12 Ω (1); I = V ÷ R = 12 ÷ 12 (1) = 1.0 A (1); p.d. = 1.0 × 6.0 = 6.0 V (1)" },
    { t: "q", fig: D.circuit({ w: 340, h: 210, wires: ["M40 40 H300 V120 H40 Z", "M100 120 V175 H240 V120"], parts: [["battery", 170, 40, "h", "9.0 V"], ["ammeter", 40, 80, "v", "A", "r"], ["lamp", 150, 120, "h", "0.30 A"], ["lamp", 150, 175, "h", "0.45 A", "b"]], dots: [[100, 120], [240, 120]] }), figCls: "fig-small", p: "The lamps are in parallel. State the p.d. across each lamp and the reading on ammeter A. Give reasons.", marks: 3, lines: 3, a: "9.0 V across each lamp: in parallel each branch has the supply p.d. (1). A = 0.30 + 0.45 = 0.75 A (1), because branch currents add up to the supply current (1)." },
    { t: "q", p: "In the wire-length practical, one point on the graph of resistance against length is well above the line. (a) Suggest two possible causes. (b) What should the student do?", marks: 4, lines: 4, a: "(a) Any two: the wire heated up; poor contact at a clip; the length or a meter was misread (2). (b) Repeat that reading (1) and leave it out of the line of best fit if it is still anomalous (1)." },
    { t: "q", p: "Sketch the I–V graph of a diode. Explain how it differs from the graph of a fixed resistor.", marks: 4, box: 36, grid: true, a: D.ivSketch("diode") + "<br>Almost zero current for negative p.d. (1), then a steep rise above a small positive p.d. (1). A fixed resistor is a straight line through the origin in both directions (1): the diode only conducts one way / its resistance is very high in reverse (1)." },
    { t: "q", p: "A thermistor is connected in series with an ammeter and a battery. Explain how the ammeter reading changes as the thermistor cools down.", marks: 3, lines: 3, a: "As it cools, the thermistor's resistance increases (1), so the total resistance increases (1) and the current decreases (1)." },
    { t: "q", p: "A kettle has a metal case connected to the earth wire. Explain why the earth wire is needed, including the role of the fuse.", marks: 5, lines: 5, a: "If the live wire touches the case (1), the earth wire gives a low-resistance path to earth (1); a very large current flows (1), which melts the fuse (1) and disconnects the live wire, so the case is safe to touch (1)." },
    { t: "q", p: "A 1.5 kW heater runs on the 230 V mains for 4.0 minutes. Calculate (a) the energy transferred and (b) the current.", marks: 5, lines: 5, a: "(a) P = 1500 W, t = 240 s (1); E = P t = 1500 × 240 (1) = 360 000 J (1). (b) I = P ÷ V = 1500 ÷ 230 (1) = 6.5 A (1)." },
    { t: "q", p: "Use the equations P = V I and P = I² R to explain why the National Grid transmits electricity at a very high p.d.", marks: 4, lines: 4, a: "For a fixed power, P = V I, so a higher p.d. means a smaller current (2). P = I² R, so a smaller current means much less heating in the cables and less energy wasted (2)." },
    { t: "q", type: "Higher tier", p: "An ideal step-up transformer has 25 kV and 400 A in the primary coil. The secondary p.d. is 400 kV. Calculate the secondary current.", marks: 3, lines: 3, a: "V<sub>p</sub> I<sub>p</sub> = V<sub>s</sub> I<sub>s</sub> (1); I<sub>s</sub> = 25 000 × 400 ÷ 400 000 (1) = 25 A (1)" },
  ];

  const fieldAnswer = `<svg viewBox="0 0 200 140" style="width:62mm;display:block;margin:0 auto">${Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6, c = Math.cos(a), s = Math.sin(a); return `<line x1="${100 + 18 * c}" y1="${70 + 18 * s}" x2="${100 + 62 * c}" y2="${70 + 62 * s}" stroke="#1558b0" stroke-width="2"/><path d="M${100 + 62 * c} ${70 + 62 * s} l${(-8 * c - 4 * s).toFixed(1)} ${(-8 * s + 4 * c).toFixed(1)} M${100 + 62 * c} ${70 + 62 * s} l${(-8 * c + 4 * s).toFixed(1)} ${(-8 * s - 4 * c).toFixed(1)}" stroke="#1558b0" stroke-width="2"/>`; }).join("")}<circle cx="100" cy="70" r="16" fill="#fff" stroke="#0a1326" stroke-width="2.5"/><text x="100" y="77" text-anchor="middle" font-family="Arial" font-weight="900" font-size="20">+</text></svg>Radial lines pointing outwards; closer together (stronger) near the sphere.`;

  const staticExt = {
    learn: [
      { t: "split", left: [
        { t: "p", h: "When two insulating materials are rubbed together, <strong>electrons</strong> are transferred from one to the other. The one that <strong>gains electrons</strong> becomes <strong>negatively</strong> charged; the one that <strong>loses electrons</strong> is left <strong>positively</strong> charged. Only electrons move, never positive charge." },
        { t: "p", h: "<strong>Like charges repel; unlike charges attract.</strong> These are non-contact forces: they act without the objects touching." },
      ], right: [
        { t: "p", h: "A charged object creates an <strong>electric field</strong> around it. Another charged object in the field feels a force. The field is <strong>strongest close to the object</strong> and gets weaker further away." },
        { t: "p", h: "If enough charge builds up, the p.d. between the object and the earthed conductor nearby becomes large enough for charge to jump across the air: a <strong>spark</strong>." },
      ] },
    ],
    questions: [
      { t: "q", p: "A plastic rod becomes negatively charged when it is rubbed with a cloth. Which way did the electrons move? What charge is left on the cloth?", marks: 2, lines: 2, a: "Electrons moved from the cloth to the rod (1). The cloth is left positively charged (1)." },
      { t: "q", p: "Draw the electric field around an isolated, positively charged sphere. Add arrows, and show where the field is strongest.", marks: 3, box: 44, a: fieldAnswer },
      { t: "q", p: "A small negatively charged sphere is moved towards a large positively charged sphere. Explain what happens to the force on the small sphere, without the spheres touching.", marks: 4, lines: 4, a: "The small sphere is in the electric field of the large sphere (1). Unlike charges attract, so the force is attractive (1), and it is a non-contact force (1). The field is stronger closer to the sphere, so the force increases as they get closer (1)." },
    ],
  };

  const glossary = [
    ["Alternating current (ac)", "Current that keeps changing direction. UK mains is ac at 50 Hz.", 12],
    ["Ammeter", "Measures current. Connected in series.", 1],
    ["Ampere (A)", "Unit of current. 1 A = 1 C per second.", 2],
    ["Anomaly", "A result that does not fit the pattern of the others.", 5],
    ["Battery", "Two or more cells joined together.", 1],
    ["Charge (Q)", "Carried by particles such as electrons. Unit: coulomb (C).", 2],
    ["Circuit breaker", "A safety switch that cuts off the current if it gets too large.", 12],
    ["Conventional current", "The agreed direction of current: from + to −.", 2],
    ["Current (I)", "The rate of flow of charge.", 1],
    ["Diode", "Lets current flow in one direction only.", 8],
    ["Direct current (dc)", "Current that flows in one direction only, e.g. from a cell.", 12],
    ["Directly proportional", "If one quantity doubles, the other doubles. The graph is a straight line through the origin.", 4],
    ["Earth wire", "Green and yellow safety wire; carries a current only if there is a fault.", 12],
    ["Electron", "A tiny negatively charged particle. Free electrons carry the current in metals.", 2],
    ["Filament lamp", "A lamp with a thin metal filament; its resistance increases as it heats up.", 8],
    ["Fuse", "A thin wire that melts and breaks the circuit if the current is too large.", 12],
    ["I–V characteristic", "A graph of current against p.d. for a component.", 8],
    ["LDR", "Light-dependent resistor: resistance decreases as light intensity increases.", 10],
    ["LED", "Light-emitting diode: a diode that gives out light.", 8],
    ["Live wire", "Brown wire at about 230 V; dangerous to touch.", 12],
    ["National Grid", "The system of cables and transformers linking power stations to consumers.", 12],
    ["Neutral wire", "Blue wire that completes the circuit; at or close to 0 V.", 12],
    ["Ohm (Ω)", "Unit of resistance.", 4],
    ["Ohmic conductor", "Current is directly proportional to p.d. at constant temperature.", 4],
    ["Parallel", "Components on separate branches. A voltmeter is connected in parallel.", 3],
    ["Potential difference (V)", "Energy transferred per unit charge between two points. Unit: volt (V).", 3],
    ["Power (P)", "Energy transferred per second. Unit: watt (W).", 11],
    ["Resistance (R)", "How much a component opposes the current. Unit: ohm (Ω).", 4],
    ["Series", "Components connected one after another in a single loop.", 1],
    ["Thermistor", "Resistance decreases as temperature increases.", 10],
    ["Transformer", "Changes the size of an alternating p.d. (step-up or step-down).", 12],
    ["Volt (V)", "Unit of p.d. 1 V = 1 J per C.", 3],
    ["Voltmeter", "Measures p.d. Connected in parallel, across a component.", 3],
  ];

  window.UNIT = { lessons, equations, review, staticExt, glossary };
})();
