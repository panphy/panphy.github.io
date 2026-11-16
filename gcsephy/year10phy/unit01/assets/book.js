// Workbook settings for the shared renderer (/gcsephy/assets/workbook/workbook.js).
(function () {
  const D = window.Diagrams;
  // A standard symbol on a short wire, reusing the site's drawing helper.
  const symbolSvg = (type) => D.circuit({ w: 104, h: 70, wires: ["M4 45 H100"], extra: `<g transform="translate(52 45)">${D.keySymbol(type)}</g>` })
    .replace(/<figure[^>]*>/, "").replace("</figure>", "");

  window.WORKBOOK = {
    file: "Y10 - Unit 01 - Electric Circuits",
    name: "Electric Circuits",
    year: 10,
    coverTitle: "Electric<br><em>Circuits</em>",
    coverArt: () => window.CoverArt.circuit(),
    lede: "Charge, energy and resistance: from your first circuit to confident exam answers.",
    parts: [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]],
    firstDoNow: "What do you already think?",
    // Only equations of the form A = B × C have a triangle. P = I² R gives I², so a square root follows.
    triangles: {
      "Q = I t": ["Q", "I", "t"], "E = Q V": ["E", "Q", "V"], "V = I R": ["V", "I", "R"],
      "P = V I": ["P", "V", "I"], "E = P t": ["E", "P", "t"], "P = I² R": ["P", "I²", "R"],
    },
    toolkit: (W) => W.equationToolkit({
      note: `Example: to find I from Q = I t, cover I. Q is above t, so I = Q ÷ t.${W.LAST >= 11 ? " For P = I² R, the triangle gives I²: take the square root to find I." : ""}`,
      convert: "minutes → seconds, kW → W, mA → A",
      after: `<table class="units-table"><thead><tr><th>Convert</th><th>How</th><th>Example</th></tr></thead><tbody>
        <tr><td>minutes → seconds</td><td>× 60</td><td>3.0 min = 180 s</td></tr>
        <tr><td>hours → seconds</td><td>× 3600</td><td>2.0 h = 7200 s</td></tr>
        <tr><td>milliamps (mA) → amps (A)</td><td>÷ 1000</td><td>250 mA = 0.25 A</td></tr>
        <tr><td>kilowatts (kW) → watts (W); kilohms (kΩ) → ohms (Ω)</td><td>× 1000</td><td>2.2 kW = 2200 W</td></tr>
        <tr><td>kilovolts (kV) → volts (V)</td><td>× 1000</td><td>400 kV = 400 000 V</td></tr></tbody></table>`,
    }),
    extension: [{ eyebrow: "Triple Science only (AQA 4.2.5)", title: "Static electricity", learn: window.UNIT.staticExt.learn, questions: window.UNIT.staticExt.questions }],
    // The Unit review opens with every equation to recall in symbols, with its units.
    reviewStart: (W) => {
      const eqs = W.U.equations.filter((e) => !e.ht);
      return W.keep(W.secHead("doNow", "Equation recall challenge") +
        W.question({ p: "Write each equation in symbols. Then give the unit of every quantity in it.", table: { head: ["Equation in words", "In symbols", "Units"], rows: eqs.map((e) => [e.words, null, null]), ans: eqs.map((e) => [null, e.eq, e.units]) } }));
    },
    block: (b) => {
      if (b.t !== "symbank") return null;
      const tiles = b.items.map(([type, name, job, later]) => `<figure class="${later ? "later" : ""}">${symbolSvg(type)}<figcaption>${name}${job ? `<small>${job}</small>` : ""}</figcaption></figure>`).join("");
      return `<div class="sym-bank" style="--n:${b.items.length}">${tiles}</div>${b.legend ? `<p class="sym-legend">${b.legend}</p>` : ""}`;
    },
    // Symbol quiz: name each symbol, or draw the symbol for each name (drawn in the answer edition).
    question: (b, W) => (b.symq ? `<div class="symbol-quiz" style="--cols:${b.symq.cols || 6}">${b.symq.items.map(([type, name, mode]) => mode === "draw"
      ? `<div><div class="draw">${W.answers ? symbolSvg(type) : ""}</div><div class="name">${name}</div></div>`
      : `<div>${symbolSvg(type)}<div class="name">${W.ans(name)}</div></div>`).join("")}</div>` : ""),
  };
})();
