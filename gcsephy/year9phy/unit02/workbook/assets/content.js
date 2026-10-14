/* Assembles the Year 9 Energy: Stores and Transfers workbook (assets/workbook.js) from the lesson
   files (lessons-a.js, lessons-b.js, lessons-c.js) and adds the equation toolkit and key words.
   Maths is LaTeX between \( and \). A triangle's labels are plain text: "E_p" draws a subscript. */
(function () {
  "use strict";

  const R = String.raw;

  const equations = [
    { lesson: 2, eq: R`\(E_k = \tfrac{1}{2}\,m\,v^2\)`, words: "kinetic energy = 0.5 × mass × (speed)²", units: "J, kg, m/s", re: "Use it to calculate the energy. Only the speed is squared." },
    { lesson: 2, eq: R`\(s = v\,t\)`, words: "distance travelled = speed × time", units: "m, m/s, s", re: R`\(v = \dfrac{s}{t}\) and \(t = \dfrac{s}{v}\)`, tri: { top: "s", bottom: ["v", "t"] } },
    { lesson: 3, eq: R`\(E_p = m\,g\,h\)`, words: "gravitational potential energy = mass × gravitational field strength × height", units: "J, kg, N/kg, m", re: R`\(h = \dfrac{E_p}{m\,g}\) and \(m = \dfrac{E_p}{g\,h}\)`, tri: { top: "E_p", bottom: ["m", "g", "h"] } },
    { lesson: 4, eq: R`\(F = k\,e\)`, words: "force = spring constant × extension", units: "N, N/m, m", re: R`\(k = \dfrac{F}{e}\) and \(e = \dfrac{F}{k}\)`, tri: { top: "F", bottom: ["k", "e"] } },
    { lesson: 5, eq: R`\(E_e = \tfrac{1}{2}\,k\,e^2\)`, words: "elastic potential energy = 0.5 × spring constant × (extension)²", units: "J, N/m, m", re: "Use it to calculate the energy. Only the extension is squared." },
    { lesson: 7, eq: R`\(P = \dfrac{E}{t}\)`, words: "power = energy transferred ÷ time", units: "W, J, s", re: R`\(E = P\,t\) and \(t = \dfrac{E}{P}\)`, tri: { top: "E", bottom: ["P", "t"] } },
    { lesson: 9, eq: R`\(\text{eff.} = \dfrac{\text{useful output}}{\text{total input}}\)`, words: "efficiency = useful output ÷ total input, using energy (J) or power (W)", units: "no unit: a decimal up to 1, or × 100 for a percentage", re: R`useful = eff. × total; \(\text{total} = \dfrac{\text{useful}}{\text{eff.}}\)`, tri: { top: "useful", bottom: ["eff.", "total"] } },
  ];

  const glossary = [
    ["Energy store", "Where energy is held: kinetic, gravitational potential, elastic potential, thermal, chemical, magnetic, electrostatic or nuclear", 1],
    ["Joule (J)", "The unit of energy", 1],
    ["System", "The object or group of objects that we choose to study", 1],
    ["Closed system", "A system that no energy enters or leaves; its total energy stays the same", 1],
    ["Kinetic store", "Energy an object has because it is moving", 2],
    ["Gravitational potential store", "Energy an object has because it is raised in a gravitational field", 3],
    ["Gravitational field strength (g)", "The force of gravity on each kilogram: 9.8 N/kg on Earth", 3],
    ["Extension", "Stretched length minus original length", 4],
    ["Spring constant (k)", "The force needed for each metre of extension, in N/m; a stiffer spring has a bigger k", 4],
    ["Elastic deformation", "The object goes back to its original shape when the force is removed", 4],
    ["Inelastic deformation", "The object stays stretched or bent when the force is removed", 4],
    ["Limit of proportionality", "The point beyond which extension is no longer directly proportional to force", 4],
    ["Elastic potential store", "Energy an object has because it is stretched or squashed", 5],
    ["Conservation of energy", "Energy can be transferred usefully, stored or dissipated, but cannot be created or destroyed", 6],
    ["Dissipated", "Spread out to the surroundings, usually to the thermal store, where it is no longer useful", 6],
    ["Power", "The rate of energy transfer: energy transferred per second", 7],
    ["Watt (W)", "The unit of power: 1 W = 1 J/s", 7],
    ["Lubrication", "Oil or grease between moving parts, to reduce friction", 8],
    ["Thermal conductivity", "How fast a material transfers energy by conduction; higher means faster", 8],
    ["Thermal insulator", "A material with a low thermal conductivity", 8],
    ["Efficiency", "Useful output ÷ total input; a decimal up to 1 or a percentage up to 100%", 9],
    ["Sankey diagram", "A diagram in which the width of each arrow shows the amount of energy", 9],
  ];

  window.UNIT = { lessons: window.UNIT_LESSONS.sort((a, b) => a.n - b.n), equations, glossary };
})();
