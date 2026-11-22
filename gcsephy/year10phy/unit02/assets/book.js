// Workbook settings for the shared renderer (/gcsephy/assets/workbook/workbook.js).
window.WORKBOOK = {
  file: "Y10 - Unit 02 - Particle Model of Matter",
  name: "Particle Model of Matter",
  year: 10,
  coverTitle: "Particle<br>Model <em>of<br>Matter</em>",
  coverArt: () => window.CoverArt.particles(),
  lede: "What everything is made of, why ice floats, why a kettle takes so long, and where the energy goes when water boils.",
  // Lessons 1-3 and 5-7 print in three parts; each required practical (Lessons 4 and 8) is a booklet of its own.
  parts: [[1, 2], [3, 5], [6, 7]],
  booklets: [["lesson=4", "RP 4"], ["lesson=8", "RP 8"]],
  // No panel beside the goals: the lesson plans list the kit and deck slides.
  side: () => "",
  toolkit: (W) => W.equationToolkit({
    note: "Example: to find \\(V\\) from \\(\\rho = \\dfrac{m}{V}\\), cover \\(V\\). \\(m\\) is above \\(\\rho\\), so \\(V = \\dfrac{m}{\\rho}\\).",
    convert: `g → kg, cm³ → m³, kJ → J${W.LAST >= 8 ? ", min → s" : ""}`,
  }),
};
