/* Prep sheets for Atoms and Nuclear Radiation: one per two lessons, 10 marks each.
   Do Now questions are from the Do Now bank (gcsephy/do-now/questions.csv, by Number); the rest checks the key ideas
   of the two lessons. Rendered by /gcsephy/assets/prep/prep.js, which documents the fields. */
(function () {
  "use strict";
  const G = window.PrepGraph, T = window.PrepTable;
  // Nuclide notation: mass number stacked over atomic number, before the symbol.
  const N = (a, z, s) => `<span class="nuc"><span class="az"><span>${a}</span><span>${z}</span></span>${s}</span>`;
  // Activity of a source with a 2-hour half-life, starting at 800 Bq (Prep 4).
  const decay = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((t) => [t, 800 * Math.pow(0.5, t / 2)]);

  window.PREP = {
    year: 11,
    unit: "Atoms and Nuclear Radiation",
    file: "Atoms and Nuclear Radiation - Year 11",
    preps: [
      /* 1 */
      { lessons: "1–2", title: "Inside the atom", subtitle: "Protons, neutrons and electrons; atomic and mass numbers; isotopes and ions",
        doNow: [
          [90, "Define electric current.", "The rate of flow of electrical charge."],
          [643, "Name the two quantities that kinetic energy depends on.", "Mass and speed"],
          [132, "State the frequency and potential difference of the UK mains electricity supply.", "50 Hz and about 230 V"],
        ],
        questions: [
          { stem: "Complete the table. Choose from: &nbsp;<b>+1</b> &nbsp; <b>0</b> &nbsp; <b>−1</b> &nbsp; <b>1</b> &nbsp; <b>very small</b>",
            fig: T(["Particle", "Relative charge", "Relative mass"], [["Proton", "+1", "1"], ["Neutron", "[[0|14]]", "1"], ["Electron", "[[−1|14]]", "[[very small|40]]"]]),
            q: "Fill in the three gaps in the table.", m: 2, lines: 0, a: "<span class=\"alt\">All three ✓✓; two ✓</span>" },
          { stem: `An atom of sodium is ${N(23, 11, "Na")}`,
            q: "Number of protons: [[11|12]] &nbsp; neutrons: [[12|12]] &nbsp; electrons: [[11|12]]", m: 2, lines: 0, a: "<span class=\"alt\">All three ✓✓; two ✓</span>" },
          { q: "Define isotopes.", m: 1, lines: 1, a: "Atoms of the same element with different numbers of neutrons ✓" },
          { q: `Which nucleus is an isotope of ${N(12, 6, "C")}? {{${N(14, 7, "N")}|${N(14, 6, "C")}*|${N(12, 5, "B")}}}`, m: 1, lines: 0 },
          { q: "When an atom loses an outer electron, it becomes a {{positive*|negative}} ion.", m: 1, lines: 0 },
        ] },

      /* 2 */
      { lessons: "3–4", title: "From plum pudding to the nucleus", subtitle: "The plum pudding model; alpha scattering; the nuclear model; energy levels",
        doNow: [
          [224, "Describe the structure of an atom.", "A positive nucleus of protons and neutrons, surrounded by negative electrons."],
          [242, "Define isotopes.", "Atoms of the same element with different numbers of neutrons."],
          [716, "State how to calculate the number of neutrons in an atom.", "Number of neutrons = mass number − atomic number"],
        ],
        questions: [
          { q: "Describe the plum pudding model of the atom.", m: 1, lines: 1, a: "A ball of positive charge with negative electrons embedded in it ✓" },
          { stem: "In the alpha scattering experiment, alpha particles were fired at thin gold foil.",
            parts: [
              { q: "Most alpha particles passed straight through. What does this show?", m: 1, lines: 1, a: "Most of the atom is empty space ✓" },
              { q: "A very few bounced back. Explain what this shows about the nucleus.", m: 2, lines: 2,
                a: "The mass is concentrated in a tiny nucleus ✓<br>which is positively charged, so it repels the positive alpha particles ✓" },
            ] },
          { q: "In the Bohr model, electrons orbit the nucleus at {{any distance|specific distances*}}", m: 1, lines: 0 },
          { q: "An electron moves to a higher energy level when the atom {{absorbs*|emits}} electromagnetic radiation.", m: 1, lines: 0 },
          { q: "The evidence for the neutron came from {{Niels Bohr|James Chadwick*|Ernest Rutherford}}", m: 1, lines: 0 },
        ] },

      /* 3 */
      { lessons: "5–6", title: "Radioactive decay and nuclear equations", subtitle: "Unstable nuclei; activity and count-rate; alpha, beta and gamma; balancing equations",
        doNow: [
          [246, "Name the model of the atom with electrons embedded in a positively charged sphere.", "The plum pudding model"],
          [235, "State how an electron can move to a higher energy level.", "By absorbing electromagnetic radiation."],
          [717, "State the type of ion formed when an atom loses one or more electrons.", "A positive ion"],
        ],
        questions: [
          { q: "The activity of a source is measured in {{becquerels (Bq)*|counts|joules (J)}}", m: 1, lines: 0 },
          { q: "A detector is placed near a radioactive source. Explain why it records only some of the radiation the source emits.", m: 1, lines: 1, a: "Radiation leaves the source in all directions, so most of it misses the detector ✓" },
          { q: "An alpha particle is {{two protons and two neutrons*|a high-speed electron|electromagnetic radiation}}", m: 1, lines: 0 },
          { stem: "Complete the nuclear equations. Mass numbers and atomic numbers must balance.",
            parts: [
              { q: `Alpha decay: <span class="nuc-eq">${N(238, 92, "U")} → ${N("[[234|10]]", "[[90|10]]", "Th")} + ${N(4, 2, "He")}</span>`, m: 2, lines: 0, a: "<span class=\"alt\">234 ✓ 90 ✓</span>" },
              { q: `Beta decay: <span class="nuc-eq">${N(14, 6, "C")} → ${N("[[14|10]]", "[[7|10]]", "N")} + ${N(0, "−1", "e")}</span>`, m: 2, lines: 0, a: "<span class=\"alt\">14 ✓ 7 ✓</span>" },
            ] },
        ] },

      /* 4 */
      { lessons: "7–8", title: "Using radiation and half-life", subtitle: "Ionising power, range and penetration; choosing a source; half-life from a graph",
        doNow: [
          [262, "State the standard unit of activity.", "Becquerel (Bq)"],
          [280, "Describe how the mass number and atomic number change when an alpha particle is emitted.", "Mass number decreases by 4. Atomic number decreases by 2."],
          [268, "State what a beta particle is.", "A high-speed electron from the nucleus"],
        ],
        questions: [
          { q: "The most ionising radiation is {{alpha*|beta|gamma}}", m: 1, lines: 0 },
          { stem: "A factory uses a radioactive source and a detector to check the thickness of paper.",
            q: "Draw a ring around the radiation it should use: {{alpha|beta*|gamma}} Explain your choice.", m: 2, lines: 2,
            a: "Alpha would all be absorbed and gamma would all pass through ✓<br>beta is partly absorbed, so the count-rate changes when the thickness changes ✓" },
          { stem: "The graph shows how the activity of a source changes with time.",
            side: G({ xmax: 8, ymax: 800, xstep: 1, ystep: 100, h: 64, xlabel: "Time / hours", ylabel: "Activity / Bq", given: decay, guides: [[2, 400], [4, 200]], alt: "Activity falling from 800 Bq, halving every 2 hours" }),
            cols: "1fr 1fr",
            parts: [
              { q: "Use the graph to find the half-life. Show on the graph how you did it.", m: 2, lines: 1, a: "Read from 800 to 400 Bq (half) ✓ half-life = 2 hours ✓" },
              { q: "Define half-life.", m: 1, lines: 2, a: "The time for the number of unstable nuclei (or the activity) to halve ✓" },
              { q: "Radioactive decay is random. Explain what this means.", m: 1, lines: 2, a: "You cannot predict which nucleus will decay next, or when ✓" },
            ] },
        ] },

      /* 5 */
      { lessons: "9–10", title: "Half-life sums and staying safe", subtitle: "Counting half-lives; net decline as a ratio; contamination and irradiation",
        doNow: [
          [271, "List alpha, beta and gamma radiation from most to least ionising.", "Alpha, beta, gamma"],
          [637, "Define half-life in terms of the number of nuclei.", "The time taken for the number of nuclei of the isotope in a sample to halve."],
          [727, "State the two quantities that must balance in a nuclear equation.", "The total mass number and the total atomic number"],
        ],
        questions: [
          { stem: "A sample has an activity of 640 Bq. Its half-life is 3 days.",
            parts: [
              { q: "Calculate its activity after 9 days.", m: 2, lines: 2, a: "9 ÷ 3 = 3 half-lives ✓<br>640 → 320 → 160 → 80 Bq ✓" },
              { q: "Calculate the net decline after 9 days, as a ratio of the initial activity.", m: 1, lines: 1, a: "640 − 80 = 560 Bq; 560 : 640 = 7 : 8 ✓" },
            ] },
          { q: "What is radioactive contamination?", m: 1, lines: 1, a: "The unwanted presence of radioactive atoms on or in other materials ✓" },
          { q: "Give two precautions that protect people against irradiation.", m: 1, lines: 1, a: "Any two: shielding, keeping a distance from the source, limiting the exposure time ✓" },
          { q: "Explain why an alpha source is more dangerous inside the body than outside it.", m: 2, lines: 2,
            a: "Outside, alpha is stopped by the skin (or air) ✓<br>inside, it is strongly ionising and is absorbed by nearby cells ✓" },
        ] },
    ],
  };
})();
