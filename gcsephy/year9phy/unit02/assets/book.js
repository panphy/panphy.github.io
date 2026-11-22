// Workbook settings for the shared renderer (/gcsephy/assets/workbook/workbook.js).
window.WORKBOOK = {
  file: "Y09 - Unit 02 - Energy",
  name: "Energy: Stores and Transfers",
  year: 9,
  coverTitle: "Energy<br><em>Stores and<br>Transfers</em>",
  coverArt: () => window.CoverArt.energy(),
  lede: "Where energy is stored, how it moves, how fast it moves and how much of it is useful.",
  parts: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
  firstDoNow: "What do you already think?",
  toolkit: (W) => W.equationToolkit({
    note: `Example: to find \\(h\\) from \\(E_p = m\\,g\\,h\\), cover \\(h\\). \\(E_p\\) is above \\(m\\) and \\(g\\), so \\(h = \\dfrac{E_p}{m\\,g}\\). ${W.LAST >= 5 ? "Kinetic and elastic potential energy have no triangle: in this unit you only use them" : "Kinetic energy has no triangle: in this unit you only use it"} to calculate the energy.`,
    convert: `g → kg, cm → m, kJ → J${W.LAST >= 7 ? ", min → s" : ""}${W.LAST >= 9 ? ", % → decimal" : ""}`,
  }),
};
