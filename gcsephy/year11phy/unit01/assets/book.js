// Workbook settings for the shared renderer (/gcsephy/assets/workbook/workbook.js).
// Figures are the teaching deck's drawings (/gcsephy/decks/atoms-and-radiation/figures.js).
window.WORKBOOK = {
  file: "Y11 - Unit 01 - Atoms and Nuclear Radiation",
  name: "Atoms and Nuclear Radiation",
  year: 11,
  coverTitle: "Atoms &amp; Nuclear<br><em>Radiation</em>",
  coverArt: () => window.CoverArt.atom(),
  lede: "What is inside an atom, how do we know, and what do unstable nuclei do?",
  parts: [[1, 2], [3, 4], [5, 6, 7], [8, 9, 10]],
  // No panel beside the goals.
  side: () => "",
  // The figures share gradients and markers, defined once at the top of the page.
  beforeRender: () => document.body.insertAdjacentHTML("afterbegin", window.DeckFigures.defs()),
  // The facts and methods met so far, one card each (UNIT.toolkit).
  toolkit: (W) => {
    const met = W.U.toolkit.filter((t) => t.lesson <= W.LAST);
    if (!met.length) return "";
    return `<section class="new-page toolkit-page"><div class="eyebrow">Reference</div><h2 class="page-title">Toolkit</h2>
      <div class="facts">${met.map((t) => `<div class="fact${t.wide ? " wide" : ""}"><h4>${t.title}</h4>${t.h}</div>`).join("")}</div></section>`;
  },
};
