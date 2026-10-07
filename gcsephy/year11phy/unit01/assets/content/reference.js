/* Toolkit, unit review, separate-Physics extension pages and glossary; builds window.UNIT. */
(function () {
  "use strict";

  const { N, ALPHA, BETA, GAMMA, NEUTRON, EQ, dfig, deckFig, fission } = window.WB;
  const table = (head, rows) => `<table class="compare"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i ? `<td>${c}</td>` : `<th>${c}</th>`)).join("")}</tr>`).join("")}</tbody></table>`;

  // ---------- toolkit: facts and methods to learn, shown up to each booklet's lesson ----------
  const toolkit = [
    { lesson: 1, title: "The three particles", h: table(["Particle", "Charge", "Mass", "Where"], [["Proton", "+1", "1", "nucleus"], ["Neutron", "0", "1", "nucleus"], ["Electron", "−1", "very small", "energy levels"]]) },
    { lesson: 1, title: "Reading the symbol", h: `<p style="font-size:14pt;margin:0 0 1.5mm">${N("A", "Z", "X")} e.g. ${N(23, 11, "Na")}</p><ul><li>Z, atomic number = protons</li><li>A, mass number = protons + neutrons</li><li>neutrons = A − Z; in an atom, electrons = Z</li><li>Atom radius ≈ 1 × 10<sup>−10</sup> m; nucleus radius &lt; 1/10 000 of that</li></ul>` },
    { lesson: 2, title: "Isotopes and ions", h: "<ul><li><strong>Isotopes</strong>: same number of protons, different numbers of neutrons.</li><li><strong>Positive ion</strong>: an atom that has lost one or more outer electrons. The nucleus is unchanged.</li></ul>" },
    { lesson: 3, title: "Alpha scattering", h: table(["Observation", "Conclusion"], [["most straight through", "mostly empty space"], ["some deflected", "positive centre"], ["a very few bounced back", "mass in a tiny centre"]]) },
    { lesson: 4, title: "Models and energy levels", h: "<ul><li>1897 electron → 1904 plum pudding → 1911 nuclear → 1913 Bohr → 1932 neutron (Chadwick)</li><li><strong>Absorb</strong> EM radiation → higher level, further out.</li><li><strong>Emit</strong> EM radiation → lower level, closer in.</li></ul>" },
    { lesson: 5, title: "Nuclear radiation", h: "<ul><li>Unstable nuclei decay at <strong>random</strong> to become more stable.</li><li><strong>Activity</strong>: decays per second, in becquerel (Bq). <strong>Count rate</strong>: decays recorded per second by a detector.</li><li>α: 2p + 2n; β: fast electron, a neutron → proton; γ: EM radiation; n: a neutron</li></ul>" },
    { lesson: 6, wide: true, title: "Nuclear equations", h: `<div class="split top" style="margin:0"><div>${table(["Emitted", "Symbol", "Mass no.", "Atomic no."], [["alpha", ALPHA, "− 4", "− 2"], ["beta", BETA, "no change", "+ 1"], ["gamma", GAMMA, "no change", "no change"], ["neutron", NEUTRON, "− 1", "no change"]])}</div><div><p>Top numbers balance; bottom numbers balance.</p>${EQ([N(226, 88, "Ra"), "→", N(222, 86, "Rn"), "+", ALPHA])}${EQ([N(14, 6, "C"), "→", N(14, 7, "N"), "+", BETA])}</div></div>` },
    { lesson: 7, wide: true, title: "Properties of radiation", h: table(["", "Alpha", "Beta", "Gamma"], [["Ionising", "strongly", "moderately", "weakly"], ["Range in air", "a few cm", "about 1 m", "very far"], ["Stopped by", "paper, skin", "a few mm of aluminium", "reduced by thick lead or concrete"], ["Typical use", "smoke alarm", "thickness gauge", "medical tracer"]]) + "<p style='margin:1.5mm 0 0'>More ionising → less penetrating.</p>" },
    { lesson: 8, title: "Half-life from a graph", h: "<ol><li>Read the start value.</li><li>Halve it.</li><li>Across to the curve, down to the time axis.</li><li>Check with a second halving.</li></ol>" },
    { lesson: 9, title: "Half-life calculations", h: "<ul><li>Number of half-lives = time ÷ half-life.</li><li>After <em>n</em> half-lives, (½)<sup><em>n</em></sup> is left: ½, ¼, ⅛, 1/16…</li><li><strong>HT</strong> net decline = initial − final; as a ratio of the initial, 1 − (½)<sup><em>n</em></sup>: ½, ¾, ⅞…</li></ul>" },
    { lesson: 10, title: "Contamination and irradiation", h: "<ul><li><strong>Irradiation</strong>: exposed to radiation; does not become radioactive.</li><li><strong>Contamination</strong>: radioactive atoms on or in an object.</li><li>Outside the body γ is most hazardous; inside, α is.</li><li>Tongs, distance, short time, lead, dosimeter.</li></ul>" },
  ];

  // ---------- unit review ----------
  const review = [
    { t: "q", p: "Complete the table.", marks: 3, table: { head: ["Particle", "Relative charge", "Relative mass", "Where in the atom?"], rows: [["proton", null, "1", null], ["neutron", "0", null, null], ["electron", null, "very small", null]], ans: [[null, "+1", null, "nucleus"], [null, null, "1", "nucleus"], [null, "−1", null, "energy levels around the nucleus"]] } },
    { t: "q", p: `An atom of cobalt is ${N(59, 27, "Co")}. (a) Give the numbers of protons, neutrons and electrons. (b) The atom loses two electrons. How many electrons does the ion have, and what is its charge?`, marks: 3, lines: 3, a: "(a) 27 protons, 32 neutrons, 27 electrons (1). (b) 25 electrons (1); charge +2 (1)." },
    { t: "q", p: `Explain why ${N(35, 17, "Cl")} and ${N(37, 17, "Cl")} are isotopes of the same element.`, marks: 2, lines: 2, a: "Both have 17 protons, so they are the same element (1), but they have different numbers of neutrons, 18 and 20 (1)." },
    { t: "q", p: "Describe how the results of the alpha particle scattering experiment led to the nuclear model replacing the plum pudding model.", marks: 6, lines: 8, a: "Level 3 (5–6): a clear account linking each result to a conclusion and explaining why the plum pudding model failed. Points: plum pudding: positive charge and mass spread out, so alpha particles expected to pass straight through with tiny deflections; most went straight through → mostly empty space; some deflected through large angles → positive centre repels positive alpha particles; a very few bounced back → mass and charge concentrated in a tiny centre; plum pudding could not explain large deflections/bounce-backs; so it was replaced by the nuclear model with a tiny, dense, positive nucleus and electrons outside." },
    { t: "q", p: "Describe what happens to an electron in an atom when the atom emits electromagnetic radiation.", marks: 2, lines: 2, a: "The electron moves to a lower energy level (1), closer to the nucleus (1)." },
    { t: "q", p: "Complete the two nuclear equations.", marks: 4, after: [
      { t: "html", h: EQ([N(238, 92, "U"), "→", `<span class="gap" style="min-width:24mm"><span class="ans">${N(234, 90, "Th")}</span></span>`, "+", ALPHA]) },
      { t: "html", h: EQ([N(131, 53, "I"), "→", `<span class="gap" style="min-width:24mm"><span class="ans">${N(131, 54, "Xe")}</span></span>`, "+", `<span class="gap"><span class="ans">${BETA}</span></span>`]) },
    ], a: "234 and 90 (1), Th (1); 131 and 54 (1); beta particle " + BETA + " (1)." },
    { t: "q", p: "A student measures the count rate from a source with different absorbers. The background count rate is 25 counts per minute. Which types of radiation does the source emit? Explain your answer.", marks: 3, table: { head: ["Absorber", "none", "paper", "5 mm aluminium", "2 cm lead"], rows: [["Count rate / counts per minute", "410", "405", "150", "60"]] }, lines: 3, a: "No alpha: paper makes almost no difference (1). Beta: aluminium reduces the count a lot (1). Gamma: some gets through the aluminium and the lead, and the count is still above background (1)." },
    { t: "q", p: "A doctor needs a radioactive tracer that is injected into a patient and detected outside the body. Which isotope should be used? Give two reasons.", marks: 3, table: { head: ["Isotope", "Radiation emitted", "Half-life"], rows: [["A", "alpha", "6 hours"], ["B", "gamma", "6 hours"], ["C", "gamma", "30 years"], ["D", "beta", "8 days"]] }, lines: 3, a: "B (1). Gamma passes out of the body to the detector and is only weakly ionising (1). A short half-life means it does not stay radioactive in the body for long, but lasts long enough for the scan (1)." },
    { t: "q", p: "The table shows the count rate from a sample. Determine the half-life.", marks: 2, table: { head: ["Time / hours", "0", "1", "2", "3", "4", "5", "6"], rows: [["Count rate / counts per second", "640", "453", "320", "226", "160", "113", "80"]] }, lines: 2, a: "640 halves to 320 at 2 hours (320 → 160 also takes 2 h) (1); half-life = 2 hours (1)." },
    { t: "q", type: "Higher tier", p: "A source has an initial activity of 800 Bq. Calculate its activity after 4 half-lives, and the net decline as a ratio of the initial activity.", marks: 2, lines: 2, a: "800 → 400 → 200 → 100 → 50 Bq (1); net decline 750 : 800 = 15 : 16 (1)." },
    { t: "q", p: "Explain why a sample of 50 unstable nuclei rarely has exactly 25 left after one half-life.", marks: 2, lines: 2, a: "Radioactive decay is random (1); in a small sample the number that decay varies around half (1)." },
    { t: "q", p: "Compare the hazards of irradiation and contamination by an alpha source.", marks: 4, lines: 4, a: "Irradiation by alpha from outside is low risk: alpha is stopped by the skin or a few cm of air (1), and the person does not become radioactive (1). Contamination puts the alpha source on or inside the body (1), where its strongly ionising alpha particles damage nearby cells, and it keeps emitting until removed (1)." },
    { t: "q", p: "Explain why scientists' model of the atom has changed over time. Use one example.", marks: 3, lines: 3, a: "Models change when new evidence does not fit the old model (1). Example: alpha particles bouncing back could not be explained by the plum pudding model (1), so it was replaced by the nuclear model (1). (Or Bohr's energy levels / Chadwick's neutron.)" },
    { t: "q", p: "Explain why beta radiation is used to monitor the thickness of paper.", marks: 3, lines: 3, a: "Alpha would be stopped completely by the paper; gamma would pass through almost unaffected (1). Beta is partly absorbed (1), so the count rate changes when the thickness changes (1)." },
  ];

  // ---------- separate Physics extension pages ----------
  const extension = [
    {
      eyebrow: "Separate Physics only (AQA 4.4.3)", title: "Background radiation and medical uses",
      intro: "Only for students taking GCSE Physics (separate science). Combined Science students can skip these pages.",
      learn: [
        { t: "sub", h: "Background radiation" },
        { t: "p", h: "<strong>Background radiation</strong> is around us all the time. It comes from <strong>natural sources</strong>, such as rocks (for example granite, which gives off radon gas) and cosmic rays from space, and from <strong>man-made sources</strong>, such as fallout from nuclear weapons testing and nuclear accidents. The level depends on where you live and on your job." },
        { t: "p", h: "The radiation dose a person receives is measured in <strong>sieverts (Sv)</strong>: 1000 millisieverts (mSv) = 1 Sv. When you measure a source, subtract the background count rate to get the corrected count rate." },
        { t: "sub", h: "Different half-lives, different hazards" },
        { t: "p", h: "An isotope with a <strong>short half-life</strong> has a high activity at first but soon becomes safe. One with a <strong>long half-life</strong> stays radioactive for a very long time, so waste containing it must be stored safely for thousands of years." },
        { t: "sub", h: "Nuclear radiation in medicine" },
        { t: "compare", head: ["Use", "How it works", "Radiation and half-life"], rows: [["Exploring (tracer)", "a gamma emitter is injected or swallowed; a detector outside the body shows where it goes", "gamma, short half-life (e.g. technetium-99m, 6 hours)"], ["Treating cancer (radiotherapy)", "beams of gamma rays from outside the body, or a source placed inside a tumour, kill cancer cells", "gamma (or beta from an implant); beams are aimed to spare healthy cells"]] },
        { t: "key", h: "Doctors weigh the <strong>risk</strong> (damage to healthy cells) against the <strong>benefit</strong> (finding or treating an illness)." },
      ],
      questions: [
        { t: "q", p: "Name one natural and one man-made source of background radiation.", marks: 2, lines: 2, a: "Natural: rocks / radon gas / cosmic rays (1). Man-made: fallout from nuclear weapons testing / nuclear accidents (1)." },
        { t: "q", p: "A detector records 185 counts per minute from a source. The background count rate is 25 counts per minute. Calculate the corrected count rate.", marks: 1, lines: 1, a: "185 − 25 = 160 counts per minute." },
        { t: "q", p: "Explain why a tracer injected into a patient should have a short half-life and emit gamma radiation.", marks: 4, lines: 4, a: "Gamma passes out of the body to be detected (1) and is only weakly ionising, so it causes little damage (1). A short half-life means the activity falls quickly, so the patient's dose is small (1), but it lasts long enough to complete the scan (1)." },
      ],
    },
    {
      eyebrow: "Separate Physics only (AQA 4.4.4)", title: "Nuclear fission and fusion",
      intro: "Only for students taking GCSE Physics (separate science). These ideas build on nuclear equations (Lesson 6).",
      learn: [
        { t: "sub", h: "Nuclear fission" },
        { t: "fig", h: dfig(fission(), "One possible fission of uranium-235. Top numbers: 235 + 1 = 141 + 92 + 3. Bottom numbers: 92 = 56 + 36.", "", 50) },
        { t: "p", h: "<strong>Fission</strong> is the splitting of a large, unstable nucleus, such as uranium-235 or plutonium-239. Spontaneous fission is rare: usually the nucleus must first <strong>absorb a neutron</strong>. It then splits into <strong>two smaller nuclei</strong> of roughly equal size, and gives out <strong>two or three neutrons</strong> and gamma rays. <strong>Energy</strong> is released: all the products move away with kinetic energy." },
        { t: "p", h: "The neutrons can go on to cause more fissions: a <strong>chain reaction</strong>. In a nuclear reactor it is <strong>controlled</strong> so energy is released steadily; in a nuclear weapon it is uncontrolled, causing an explosion." },
        { t: "sub", h: "Nuclear fusion" },
        { t: "p", h: "<strong>Fusion</strong> is the joining of two light nuclei, such as isotopes of hydrogen, to form a heavier nucleus. Some of the mass is converted into energy, which is given out as radiation. Fusion releases the energy of the Sun and other stars." },
      ],
      questions: [
        { t: "q", p: "Draw a diagram to show how one fission can start a chain reaction. Label the neutrons and the new nuclei.", marks: 3, box: 46, a: "A neutron hits a U-235 nucleus (1); it splits into two smaller nuclei and 2 or 3 neutrons (1); each of those neutrons hits another U-235 nucleus, which also splits (1)." },
        { t: "q", p: "Compare nuclear fission with nuclear fusion.", marks: 4, lines: 4, a: "Fission splits a large nucleus; fusion joins two light nuclei (1). Fission usually needs a neutron to be absorbed first; fusion joins nuclei such as hydrogen isotopes (1). Both release energy (1). Fission is used in nuclear power stations; fusion powers the stars (1)." },
      ],
    },
  ];

  // ---------- glossary: [word, meaning, lesson] ----------
  const glossary = [
    ["Absorb", "Take in energy. An electron that absorbs EM radiation moves to a higher energy level.", 4],
    ["Activity", "The rate at which a source of unstable nuclei decays. Unit: becquerel (Bq).", 5],
    ["Alpha particle (α)", "Two protons and two neutrons: a helium nucleus. Strongly ionising; stopped by paper.", 5],
    ["Alpha scattering", "The experiment in which alpha particles fired at thin gold foil showed that atoms have a tiny, positive nucleus.", 3],
    ["Atom", "The smallest part of an element. It has a tiny nucleus with electrons around it and no overall charge.", 1],
    ["Atomic number", "The number of protons in the nucleus. It decides the element.", 1],
    ["Becquerel (Bq)", "Unit of activity: 1 Bq = 1 decay per second.", 5],
    ["Beta particle (β)", "A high-speed electron ejected from the nucleus when a neutron turns into a proton.", 5],
    ["Bohr model", "Electrons orbit the nucleus at specific distances, called energy levels (1913).", 4],
    ["Contamination", "Unwanted radioactive atoms on or in an object.", 10],
    ["Count rate", "The number of decays recorded each second by a detector.", 5],
    ["Daughter nucleus", "The new nucleus formed when a nucleus decays.", 6],
    ["Dosimeter", "A badge that measures how much radiation a worker receives.", 10],
    ["Electron", "A tiny particle with a relative charge of −1, found in energy levels around the nucleus.", 1],
    ["Emit", "Give out. An electron that moves to a lower energy level emits EM radiation.", 4],
    ["Energy level", "A specific distance from the nucleus at which electrons are found.", 4],
    ["Evidence", "Observations and measurements used to test a model.", 3],
    ["Gamma ray (γ)", "Electromagnetic radiation emitted from a nucleus. Weakly ionising; very penetrating.", 5],
    ["Half-life", "The time for the number of unstable nuclei in a sample, or the count rate, to halve.", 8],
    ["Ion", "An atom that has lost (or gained) electrons, so it has an overall charge.", 2],
    ["Ionising", "Able to knock electrons off atoms, turning them into ions.", 7],
    ["Irradiation", "Exposing an object to nuclear radiation. The object does not become radioactive.", 10],
    ["Isotopes", "Atoms of the same element with different numbers of neutrons.", 2],
    ["Mass number", "The total number of protons and neutrons in the nucleus.", 1],
    ["Model", "A simplified explanation of something we cannot see directly; changed when new evidence does not fit.", 3],
    ["Net decline", "(HT) How much the activity has fallen; often given as a ratio of the initial activity.", 9],
    ["Neutron", "A particle in the nucleus with no charge and a relative mass of 1.", 1],
    ["Nuclear equation", "An equation showing a decay, in which the mass numbers and atomic numbers balance.", 6],
    ["Nuclear model", "A tiny, dense, positive nucleus with electrons outside it (Rutherford, 1911).", 3],
    ["Nucleus", "The tiny centre of an atom, containing protons and neutrons and almost all the mass.", 1],
    ["Peer review", "Checking of published findings by other scientists.", 4],
    ["Penetration", "How far radiation can travel through materials before it is absorbed.", 7],
    ["Plum pudding model", "A ball of positive charge with negative electrons embedded in it (1904).", 3],
    ["Proton", "A particle in the nucleus with a relative charge of +1 and a relative mass of 1.", 1],
    ["Radioactive decay", "An unstable nucleus giving out radiation to become more stable. It is random.", 5],
    ["Random", "Impossible to predict for one nucleus: which one decays next, or when.", 8],
    ["Unstable nucleus", "A nucleus that will decay and give out radiation.", 5],
  ];

  window.UNIT = { lessons: window.WB.lessons, toolkit, review, extension, glossary };
})();
