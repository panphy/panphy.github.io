/* Lessons 1–5: inside the atom, isotopes and ions, the nuclear model, Bohr and energy
   levels, radioactive decay. */
(function () {
  "use strict";

  const { N, ALPHA, BETA, GAMMA, NEUTRON, dfig, deckFig, atom, levelsMini, alphaPaths, nucleus } = window.WB;
  const SIM_ATOMS = ["Atomic Models simulation", "panphy.app/simulations/atomic_models.html"];
  const SIM_DECAY = ["Nuclear Decay simulation", "panphy.app/simulations/nuclear_decay.html"];

  window.WB.lessons.push(
    // ============================================================ 1
    {
      n: 1, accent: "proton", title: "Inside the atom",
      spec: "AQA Physics 4.4.1.1–4.4.1.2; Combined Science 6.4.1.1–6.4.1.2",
      mapLine: "Protons, neutrons and electrons, the size of an atom, atomic and mass numbers",
      big: "Everything around you is made of atoms, yet an atom is almost entirely empty space. So what is actually in there?",
      goals: ["describe the charge, mass and position of protons, neutrons and electrons", "state the size of an atom and of its nucleus", "explain why an atom has no overall charge", "use atomic and mass numbers to find the numbers of each particle"],
      keywords: ["atom", "nucleus", "proton", "neutron", "electron", "atomic number", "mass number"],
      deck: { slides: "3–6", text: "Three particles, the size of an atom, and reading the symbol." },
      doNow: [
        ["What is everything around you made of?", "Atoms (tiny particles)."],
        ["Name the three particles found in atoms.", "Protons, neutrons and electrons."],
        ["What is an element?", "A substance made of only one type of atom."],
      ],
      learnTitle: "What is inside an atom?",
      learn: [
        { t: "sub", h: "Three particles" },
        { t: "split", cls: "wide-fig", left: [{ t: "fig", h: deckFig("bohr", "A carbon atom: 6 protons and 6 neutrons in the nucleus, 6 electrons around it.", "fig-mid") }], right: [
          { t: "p", h: "At the centre of every atom is a tiny <strong>nucleus</strong>. It contains <strong>protons</strong>, which are positive, and <strong>neutrons</strong>, which have no charge. So the nucleus is positive." },
          { t: "p", h: "Negative <strong>electrons</strong> are arranged at different distances from the nucleus, called <strong>energy levels</strong>." },
        ] },
        { t: "compare", head: ["Particle", "Relative charge", "Relative mass", "Where it is"], rows: [["Proton", "+1", "1", "in the nucleus"], ["Neutron", "0", "1", "in the nucleus"], ["Electron", "−1", "very small", "in energy levels around the nucleus"]] },
        { t: "key", h: "An atom has <strong>no overall charge</strong>: it has the <strong>same number of electrons as protons</strong>, so the positive and negative charges cancel. Neutrons have no charge, so they do not count." },
        { t: "sub", h: "Mostly empty space" },
        { t: "split", cls: "wide-fig", left: [{ t: "fig", h: deckFig("scale", "Not to scale: a real nucleus is far too small to draw.", "framed", 50) }], right: [
          { t: "p", h: "An atom has a radius of about <strong>1 × 10<sup>−10</sup> m</strong> (0.000 000 000 1 m)." },
          { t: "p", h: "The radius of the nucleus is <strong>less than 1/10 000</strong> of the radius of the atom. Yet <strong>almost all the mass</strong> of the atom is in the nucleus, because protons and neutrons are far heavier than electrons." },
        ] },
        { t: "model", title: "Think of a football stadium", h: "If an atom were as big as a football stadium, the nucleus would be about the size of a pea on the centre spot. The electrons would be somewhere in the stands. Everything in between is empty space.", breaks: "a pea is light, but the nucleus holds almost all the mass; and electrons are not little balls sitting in seats." },
        { t: "worked", q: "An atom has a radius of 1 × 10<sup>−10</sup> m. Its nucleus is 1/10 000 of this. Calculate the radius of the nucleus.", steps: [["Know", "atom radius = 1 × 10<sup>−10</sup> m"], ["Method", "divide by 10 000 = 1 × 10<sup>4</sup>"], ["Working", "1 × 10<sup>−10</sup> ÷ 1 × 10<sup>4</sup>"], ["Answer", "1 × 10<sup>−14</sup> m"]],
          yt: { q: "An atom has a radius of 3 × 10<sup>−10</sup> m. Its nucleus is 1/10 000 of this. Calculate the radius of the nucleus.", steps: [["Know", "atom radius = 3 × 10<sup>−10</sup> m"], ["Method", "divide by 1 × 10<sup>4</sup>"], ["Working", "3 × 10<sup>−10</sup> ÷ 1 × 10<sup>4</sup>"], ["Answer", "3 × 10<sup>−14</sup> m"]] } },
        { t: "sub", h: "Reading the symbol" },
        { t: "split", cls: "wide-fig", left: [{ t: "fig", h: deckFig("notation", "", "", 44) }], right: [
          { t: "html", h: "<ul><li>The <strong>atomic number</strong> (bottom) is the number of <strong>protons</strong>. It decides which element the atom is.</li><li>The <strong>mass number</strong> (top) is the number of <strong>protons + neutrons</strong>.</li><li>Number of neutrons = mass number − atomic number.</li><li>In an atom, number of electrons = number of protons.</li></ul>" },
        ] },
        { t: "worked", q: `How many protons, neutrons and electrons are in an atom of ${N(23, 11, "Na")}?`, steps: [["Protons", "atomic number = 11"], ["Neutrons", "23 − 11 = 12"], ["Electrons", "same as protons = 11"], ["Answer", "11 p, 12 n, 11 e"]],
          yt: { q: `How many protons, neutrons and electrons are in an atom of ${N(27, 13, "Al")}?`, steps: [["Protons", "13"], ["Neutrons", "27 − 13 = 14"], ["Electrons", "13"], ["Answer", "13 p, 14 n, 13 e"]] } },
      ],
      try: [
        { t: "q", p: "Complete the sentences using the word bank.", fill: "At the centre of an atom is a tiny [[nucleus]]. It contains [[protons]] and [[neutrons]]. [[Electrons|30]] are arranged in energy levels around it. A proton has a relative charge of [[+1|14]] and an electron has a relative charge of [[−1|14]]. Almost all of the [[mass]] of the atom is in the nucleus.", bank: ["nucleus", "protons", "neutrons", "Electrons", "mass", "+1", "−1", "0", "charge"] },
        { t: "q", p: "The diagram shows a lithium atom. Name the parts labelled A, B and C. Then say which particles are inside part A.", fig: `<div class="split" style="grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr)"><div>${dfig(atom({ p: 3, n: 4, shells: [2, 1], labels: [["A", 44, 44, 158, 158], ["B", 330, 40, 228, 66], ["C", 40, 320, 74, 244]] }), "", "", 58)}</div><div class="fill" style="line-height:2.4">A <span class="blank" style="--w:50mm"><span class="ans">nucleus</span></span><br>B <span class="blank" style="--w:50mm"><span class="ans">electron</span></span><br>C <span class="blank" style="--w:50mm"><span class="ans">energy level</span></span><br>Inside A: <span class="blank" style="--w:40mm"><span class="ans">3 protons, 4 neutrons</span></span></div></div>` },
        { t: "q", type: "Supported", p: "Complete the table.", table: { head: ["Symbol", "Protons", "Neutrons", "Electrons"], rows: [[N(4, 2, "He"), null, null, null], [N(7, 3, "Li"), null, null, null], [N(16, 8, "O"), null, null, null], [N(56, 26, "Fe"), null, null, null], [N(238, 92, "U"), null, null, null]], ans: [[null, "2", "2", "2"], [null, "3", "4", "3"], [null, "8", "8", "8"], [null, "26", "30", "26"], [null, "92", "146", "92"]] } },
        { t: "q", type: "On your own", p: "An atom has 17 protons and 18 neutrons. Write its symbol in the form <sup>A</sup><sub>Z</sub>X. The element with 17 protons is chlorine, Cl.", lines: 1, a: N(35, 17, "Cl") + " (mass number 17 + 18 = 35)" },
        { t: "q", p: "Which part of an atom contains almost all of its mass? Tick <strong>one</strong> box.", mcq: { cols: 4, o: ["the electrons", "the nucleus", "the energy levels", "the empty space"], c: 1 } },
        { t: "q", say: ["Leo", "An atom is neutral because it has the same number of protons and neutrons."], p: "Explain what is wrong with Leo's statement, and correct it.", lines: 3, a: "Neutrons have no charge, so they do not balance anything. An atom is neutral because it has the same number of electrons (−) as protons (+), so the charges cancel." },
        { t: "q", type: "Challenge", p: "The radius of an atom is about 10 000 times the radius of its nucleus. If you drew the nucleus as a dot 1 mm across, how wide would you have to draw the atom? Give your answer in metres, and say whether it would fit on this page.", lines: 2, a: "10 000 × 1 mm = 10 000 mm = 10 m. It would not fit on the page: this is why atom diagrams are never to scale." },
      ],
      exam: [
        { tip: "A ‘describe’ question about structure needs where each particle is, not just its name.", p: "Describe the structure of an atom.", marks: 4, lines: 4, a: "A tiny nucleus at the centre (1), containing protons and neutrons (1). Electrons are at different distances from the nucleus / in energy levels around it (1). Most of the atom is empty space: the nucleus radius is less than 1/10 000 of the atom's (1)." },
        { p: `An atom of potassium is ${N(39, 19, "K")}. (a) Give the number of neutrons. (b) Explain why the atom has no overall charge.`, marks: 3, lines: 3, a: "(a) 39 − 19 = 20 (1). (b) It has 19 protons and 19 electrons (1); their charges are equal and opposite, so they cancel (1)." },
      ],
      summary: ["The nucleus contains protons (+1) and neutrons (0). Electrons (−1) are in energy levels around it.", "Atom radius ≈ 1 × 10<sup>−10</sup> m; nucleus radius less than 1/10 000 of this.", "Almost all the mass is in the nucleus.", "Atomic number = protons. Mass number = protons + neutrons.", "In an atom, electrons = protons, so there is no overall charge."],
      recall: [["What is the relative charge of a neutron?", "0"], ["What is the radius of an atom, roughly?", "1 × 10<sup>−10</sup> m"], ["What does the mass number tell you?", "The number of protons + neutrons."], ["How many neutrons are in " + N(31, 15, "P") + "?", "31 − 15 = 16"]],
      cando: ["describe the charge, mass and position of each particle", "state the size of an atom and of its nucleus", "explain why an atom is neutral", "work out protons, neutrons and electrons from nuclear notation"],
    },

    // ============================================================ 2
    {
      n: 2, accent: "electron", title: "Isotopes and ions",
      spec: "AQA Physics 4.4.1.2; Combined Science 6.4.1.2",
      mapLine: "Same element, different neutrons; atoms that lose outer electrons",
      big: "Carbon-12 and carbon-14 are both carbon, but only carbon-14 is radioactive. What is different about them?",
      goals: ["explain what isotopes are", "compare isotopes using nuclear notation", "describe how an atom becomes a positive ion", "say what changes, and what does not, when an ion forms"],
      keywords: ["isotope", "ion", "positive ion", "outer electron", "stable", "unstable"],
      deck: { slides: "7–8", text: "Isotopes of carbon; a lithium atom becoming an ion." },
      doNow: [
        ["What is the relative charge of a neutron?", "0"],
        [`How many neutrons are in ${N(31, 15, "P")}?`, "31 − 15 = 16"],
        ["Why does an atom have no overall charge?", "It has the same number of electrons as protons."],
      ],
      learnTitle: "Same element, different atoms",
      learn: [
        { t: "sub", h: "Isotopes" },
        { t: "fig", h: deckFig("isotopes", "", "", 46) },
        { t: "p", h: "<strong>Isotopes</strong> are atoms of the <strong>same element</strong> with <strong>different numbers of neutrons</strong>. They have the same number of protons, so the same atomic number, but different mass numbers. We name an isotope by its mass number: carbon-12, carbon-13, carbon-14." },
        { t: "compare", head: ["Isotope", "Symbol", "Protons", "Neutrons", "Stable?"], rows: [["carbon-12", N(12, 6, "C"), "6", "6", "stable"], ["carbon-13", N(13, 6, "C"), "6", "7", "stable"], ["carbon-14", N(14, 6, "C"), "6", "8", "unstable: radioactive"]] },
        { t: "key", h: "Isotopes: <strong>same protons, different neutrons</strong>. Some isotopes have an <strong>unstable</strong> nucleus: it gives out radiation. You will meet this in Lesson 5." },
        { t: "sub", h: "Hydrogen's three isotopes" },
        { t: "figs", cols: 3, items: [dfig(nucleus(1, 0, 18, "1 p, 0 n"), "hydrogen-1", "", 26), dfig(nucleus(1, 1, 18, "1 p, 1 n"), "hydrogen-2 (deuterium)", "", 26), dfig(nucleus(1, 2, 18, "1 p, 2 n"), "hydrogen-3 (tritium): unstable", "", 26)] },
        { t: "sub", h: "Ions" },
        { t: "fig", h: deckFig("ion", "", "", 50) },
        { t: "split", cls: "top", left: [
          { t: "p", h: "The outer electrons are furthest from the nucleus and are easiest to remove. If an atom <strong>loses one or more outer electrons</strong>, it has more protons than electrons, so it becomes a <strong>positive ion</strong>." },
        ], right: [
          { t: "p", h: "The nucleus does not change, so it is still the same element. (In chemistry you also meet negative ions, which form when atoms gain electrons.)" },
        ] },
        { t: "worked", q: `A magnesium atom, ${N(24, 12, "Mg")}, loses 2 electrons. Find the numbers of protons, neutrons and electrons, and the charge on the ion.`, steps: [["Protons", "12 (unchanged)"], ["Neutrons", "24 − 12 = 12 (unchanged)"], ["Electrons", "12 − 2 = 10"], ["Charge", "+12 − 10 = +2, so Mg<sup>2+</sup>"]],
          yt: { q: `An aluminium atom, ${N(27, 13, "Al")}, loses 3 electrons. Find the numbers of each particle and the charge.`, steps: [["Protons", "13"], ["Neutrons", "14"], ["Electrons", "13 − 3 = 10"], ["Charge", "+3, so Al<sup>3+</sup>"]] } },
      ],
      try: [
        { t: "q", p: "Are these two atoms isotopes of the same element? Circle <strong>Yes</strong> or <strong>No</strong> for each pair.", options: { cols: 4, items: [
          { label: "A", text: `<div style="font-size:15pt;margin:2mm 0">${N(12, 6, "C")} ${N(14, 6, "C")}</div>`, choice: ["Yes", "No"], c: 0 },
          { label: "B", text: `<div style="font-size:15pt;margin:2mm 0">${N(14, 6, "C")} ${N(14, 7, "N")}</div>`, choice: ["Yes", "No"], c: 1 },
          { label: "C", text: `<div style="font-size:15pt;margin:2mm 0">${N(35, 17, "Cl")} ${N(37, 17, "Cl")}</div>`, choice: ["Yes", "No"], c: 0 },
          { label: "D", text: `<div style="font-size:15pt;margin:2mm 0">${N(40, 18, "Ar")} ${N(40, 20, "Ca")}</div>`, choice: ["Yes", "No"], c: 1 },
        ] }, starter: "Explain your answer for pair B.", lines: 1, a: "Different numbers of protons (6 and 7), so they are different elements, even though the mass numbers are the same." },
        { t: "q", type: "Supported", p: "Chlorine has two common isotopes. Complete the table.", table: { head: ["Isotope", "Symbol", "Protons", "Neutrons", "Electrons"], rows: [["chlorine-35", N(35, 17, "Cl"), null, null, null], ["chlorine-37", N(37, 17, "Cl"), null, null, null]], ans: [[null, null, "17", "18", "17"], [null, null, "17", "20", "17"]] } },
        { t: "q", p: "The diagrams show three nuclei. Which two are isotopes of the same element? Explain how you know.", options: { cols: 3, items: [
          { label: "P", fig: nucleus(3, 3, 16, "3 p, 3 n") }, { label: "Q", fig: nucleus(4, 3, 16, "4 p, 3 n") }, { label: "R", fig: nucleus(3, 4, 16, "3 p, 4 n") },
        ] }, lines: 2, a: "P and R: both have 3 protons (the same element, lithium) but different numbers of neutrons (3 and 4)." },
        { t: "q", p: "Complete the sentences.", fill: "When an atom loses an outer electron it becomes a [[positive]] ion. The number of [[protons]] does not change, so it is still the same [[element]]. The ion has more [[protons]] than [[electrons]].", bank: ["positive", "negative", "protons", "neutrons", "electrons", "element"] },
        { t: "q", type: "On your own", p: "Complete the table. Write <em>atom</em> or <em>ion</em>, and the overall charge.", table: { head: ["Protons", "Neutrons", "Electrons", "Atom or ion?", "Overall charge"], rows: [["11", "12", "11", null, null], ["11", "12", "10", null, null], ["20", "20", "18", null, null], ["8", "8", "8", null, null]], ans: [[null, null, null, "atom", "0"], [null, null, null, "ion", "+1"], [null, null, null, "ion", "+2"], [null, null, null, "atom", "0"]] } },
        { t: "q", say: ["Ava", "A lithium atom becomes a Li<sup>+</sup> ion by losing a proton, so its charge goes up by one."], p: "Explain what is wrong with Ava's statement.", lines: 3, a: "The atom loses an electron, not a proton; the nucleus does not change. Losing a negative electron leaves one more proton than electrons, so the charge is +1. If it lost a proton it would become a different element (helium)." },
        { t: "q", type: "Challenge", p: `Uranium-235, ${N(235, 92, "U")}, and uranium-238, ${N(238, 92, "U")}, are both found in uranium ore. Explain why they are isotopes. Give one way their atoms are the same and one way they are different.`, lines: 3, a: "Same number of protons (92), so the same element, but different numbers of neutrons (143 and 146). Same: 92 protons / 92 electrons / same chemistry. Different: number of neutrons / mass number / how stable the nucleus is." },
      ],
      exam: [
        { tip: "‘Similarities and differences’ needs both: give at least one of each, with numbers.", p: `Carbon has two isotopes, ${N(12, 6, "C")} and ${N(14, 6, "C")}. Describe the similarities and differences between the nuclei of these two isotopes.`, marks: 3, lines: 3, a: "Both have 6 protons (1). Carbon-12 has 6 neutrons and carbon-14 has 8 neutrons (1). So they have different mass numbers / carbon-14 is unstable (1)." },
        { p: "Explain how a sodium atom can become a sodium ion, Na<sup>+</sup>.", marks: 2, lines: 2, a: "It loses one outer electron (1). It now has 11 protons and 10 electrons, so the overall charge is +1 (1)." },
      ],
      summary: ["Isotopes: same number of protons, different numbers of neutrons.", "Isotopes of an element have the same atomic number but different mass numbers.", "Some isotopes are unstable (radioactive), e.g. carbon-14.", "An atom that loses outer electrons becomes a positive ion.", "Forming an ion does not change the nucleus, so the element stays the same."],
      recall: [["What is the same in two isotopes of an element?", "The number of protons (atomic number)."], ["What is different in two isotopes of an element?", "The number of neutrons (mass number)."], ["How does an atom become a positive ion?", "It loses one or more outer electrons."], ["An atom with 12 protons loses 2 electrons. What is its charge?", "+2"]],
      cando: ["explain what isotopes are", "use nuclear notation to compare isotopes", "describe how a positive ion forms", "work out the charge on an ion"],
    },

    // ============================================================ 3
    {
      n: 3, accent: "alpha", title: "From plum pudding to the nucleus",
      spec: "AQA Physics 4.4.1.3; Combined Science 6.4.1.3",
      mapLine: "The plum pudding model, alpha scattering and the nuclear model",
      big: "Nobody has ever seen inside an atom. So how did scientists find out that almost all of its mass is squeezed into a tiny nucleus?",
      goals: ["describe the plum pudding model and why it was proposed", "describe the alpha particle scattering experiment", "explain how each result led to the nuclear model", "compare the plum pudding and nuclear models"],
      keywords: ["model", "plum pudding model", "alpha particle", "alpha scattering", "deflected", "nuclear model", "evidence"],
      deck: { slides: "9–17", text: "Timeline of models, the plum pudding model, alpha scattering and the nuclear model.", sim: SIM_ATOMS },
      doNow: [
        ["What particles are in the nucleus?", "Protons and neutrons."],
        ["What is the overall charge of a nucleus? Why?", "Positive: protons are positive and neutrons have no charge."],
        ["The radius of a nucleus is less than what fraction of the atom's radius?", "1/10 000"],
      ],
      learnTitle: "How the model changed",
      learn: [
        { t: "sub", h: "A model that kept changing" },
        { t: "figs", cols: 4, items: [deckFig("mini-solid", "<b>Before 1897</b><br>Tiny solid spheres that cannot be divided", "", 30), deckFig("mini-plum", "<b>1904</b><br>Plum pudding: after the electron was discovered", "", 30), deckFig("mini-nuclear", "<b>1911</b><br>Nuclear model: from alpha scattering", "", 30), deckFig("mini-bohr", "<b>1913</b><br>Bohr model: electrons in energy levels", "", 30)] },
        { t: "p", h: "Scientists use <strong>models</strong> to explain things too small to see. When new <strong>evidence</strong> does not fit a model, the model is changed or replaced." },
        { t: "sub", h: "The plum pudding model (1904)" },
        { t: "split", cls: "narrow-fig", left: [
          { t: "p", h: "In 1897 J. J. Thomson discovered the <strong>electron</strong>, a tiny negative particle that comes from inside atoms. So atoms <em>can</em> be divided into smaller parts." },
          { t: "p", h: "This led to the <strong>plum pudding model</strong>: the atom is a <strong>ball of positive charge</strong> with <strong>negative electrons embedded in it</strong>. The positive charge and the mass are spread through the whole atom. There is <strong>no nucleus</strong>." },
        ], right: [{ t: "fig", h: deckFig("plum", "", "", 44) }] },
        { t: "sub", h: "The alpha scattering experiment (1909)" },
        { t: "fig", h: deckFig("scatter", "Geiger and Marsden, working with Rutherford, fired alpha particles at a very thin gold foil and counted them at every angle.", "", 56) },
        { t: "p", h: "<strong>Alpha particles</strong> are small, fast and positively charged. The plum pudding model predicted that they would all pass <strong>straight through</strong> the foil, with at most tiny deflections, because the positive charge was spread out too thinly to push them far off course." },
        { t: "sub", h: "What they saw, and what it means" },
        { t: "compare", head: ["Observation", "Conclusion"], rows: [["Most alpha particles went <strong>straight through</strong>.", "The atom is mostly <strong>empty space</strong>."], ["Some were <strong>deflected</strong> through large angles.", "The centre of the atom is <strong>positively charged</strong>: it repels the positive alpha particles."], ["A very few <strong>bounced back</strong>.", "The <strong>mass</strong> and charge are concentrated in a <strong>tiny centre</strong>: the nucleus."]] },
        { t: "fig", h: deckFig("scatter-zoom", "Close-up of one gold nucleus: not to scale.", "", 52) },
        { t: "sub", h: "The nuclear model (Rutherford, 1911)" },
        { t: "split", cls: "narrow-fig", left: [
          { t: "compare", head: ["", "Plum pudding", "Nuclear model"], rows: [["Positive charge", "spread through the atom", "in a tiny nucleus"], ["Mass", "spread through the atom", "concentrated in the nucleus"], ["Empty space?", "no", "mostly empty space"], ["Electrons", "embedded in the positive ball", "outside the nucleus"]] },
        ], right: [{ t: "fig", h: deckFig("rutherford", "", "", 46) }] },
        { t: "key", h: "The plum pudding model could not explain alpha particles bouncing back. The new evidence did not fit, so the model was <strong>replaced</strong> by the nuclear model." },
      ],
      try: [
        { t: "q", p: "Put the models of the atom in the order they were proposed. Write 1 (first) to 4 (latest) in the boxes.", order: [["3", "A tiny, positive nucleus with electrons outside it"], ["1", "Tiny solid spheres that cannot be divided"], ["4", "Electrons orbit the nucleus at fixed distances (energy levels)"], ["2", "A ball of positive charge with electrons embedded in it"]] },
        { t: "q", p: "Draw a line from each observation to the conclusion it led to. (The answer edition shows the matching letter.)", match: { left: [["Most alpha particles passed straight through.", "B"], ["Some alpha particles were deflected.", "C"], ["A very few alpha particles bounced back.", "A"]], right: ["The mass is concentrated in a tiny centre.", "Most of the atom is empty space.", "The centre of the atom has a positive charge."] } },
        { t: "q", p: "Three alpha particles, A, B and C, move towards a gold nucleus. Continue the path of each one.", fig: dfig(alphaPaths(), "", "", 44), starter: "A passes far from the nucleus, B passes close to it and C is heading straight for it.", a: "A carries straight on. B is repelled and deflected away from the nucleus. C slows, stops and bounces back the way it came." },
        { t: "q", p: "Explain why the plum pudding model cannot explain alpha particles bouncing back.", lines: 3, a: "In the plum pudding model the positive charge and mass are spread out through the atom. That is not concentrated enough to repel a fast, positive alpha particle strongly enough to turn it back. Bouncing back needs a tiny, dense, positive centre." },
        { t: "q", say: ["Mia", "Most alpha particles went straight through, so the experiment proved the plum pudding model was right."], p: "Is Mia right? Explain your answer.", lines: 3, a: "No. The plum pudding model also predicts that most go straight through, so that result does not decide between the models. The large deflections and the bounce-backs did not fit the plum pudding model, so it was replaced." },
        { t: "q", type: "Challenge", p: "The gold foil was only a few hundred atoms thick. Suggest why a very thin foil was needed.", lines: 2, a: "Alpha particles are easily stopped, so they need thin foil to pass through at all. Each one then meets only a few nuclei, so each large deflection comes from one close approach to a single nucleus." },
      ],
      exam: [
        { tip: "In a ‘compare’ question, say what each model says about the same feature: charge, mass, empty space, electrons.", p: "Describe the differences between the plum pudding model and the nuclear model of the atom.", marks: 4, lines: 4, a: "Any four: plum pudding has the positive charge spread out; nuclear model has it in a tiny nucleus (1). Mass spread out vs concentrated in the nucleus (1). Plum pudding has no empty space; the nuclear atom is mostly empty space (1). Electrons embedded in the positive charge vs electrons outside the nucleus (1)." },
        { p: "In the alpha scattering experiment, most alpha particles passed straight through the gold foil, but a very small number were deflected by more than 90°. Explain what each result showed about the structure of the atom.", marks: 4, lines: 4, a: "Most passing straight through shows the atom is mostly empty space (2). A very small number deflected by more than 90° shows there is a tiny centre (1) where the positive charge and mass are concentrated, which repels alpha particles (1)." },
      ],
      summary: ["Models change when new evidence does not fit them.", "Plum pudding (1904): a ball of positive charge with electrons embedded; no nucleus.", "Alpha scattering: most straight through (empty space), some deflected (positive centre), a very few bounced back (mass in a tiny centre).", "Nuclear model (1911): tiny, dense, positive nucleus with electrons outside.", "The nuclear model replaced the plum pudding model."],
      recall: [["What discovery led to the plum pudding model?", "The electron (atoms can be divided)."], ["What were alpha particles fired at?", "Very thin gold foil."], ["What did bounce-backs show?", "The mass (and positive charge) is concentrated in a tiny centre, the nucleus."], ["Where is the positive charge in the nuclear model?", "In a tiny nucleus at the centre."]],
      cando: ["describe the plum pudding model", "describe the alpha scattering experiment", "link each result to a conclusion about the atom", "compare the plum pudding and nuclear models"],
    },

    // ============================================================ 4
    {
      n: 4, accent: "photon", title: "Energy levels and the nucleus",
      spec: "AQA Physics 4.4.1.1–4.4.1.3; Combined Science 6.4.1.1–6.4.1.3",
      mapLine: "The Bohr model, absorbing and emitting EM radiation, protons and neutrons, why models change",
      big: "Neon signs glow red and sodium street lamps glow orange. Each element gives out its own colours of light. What are its electrons doing?",
      goals: ["describe Bohr's model of electrons in energy levels", "explain how electrons change level when they absorb or emit electromagnetic radiation", "describe how protons and then neutrons were discovered", "explain why scientific models change"],
      keywords: ["Bohr model", "energy level", "absorb", "emit", "electromagnetic radiation", "proton", "neutron", "peer review"],
      deck: { slides: "18–25", text: "The Bohr model, energy levels, protons then neutrons, and why models change.", sim: SIM_ATOMS },
      doNow: [
        ["Which experiment showed that atoms have a tiny nucleus?", "The alpha scattering experiment."],
        ["What is the charge on an alpha particle?", "Positive (+2)."],
        ["In the nuclear model, where are the electrons?", "Outside the nucleus."],
      ],
      learnTitle: "Filling in the details",
      learn: [
        { t: "sub", h: "Bohr's model (1913)" },
        { t: "split", cls: "narrow-fig", left: [
          { t: "p", h: "Niels Bohr adapted the nuclear model. He suggested that electrons orbit the nucleus <strong>at specific distances</strong>. Each allowed distance is an <strong>energy level</strong>." },
          { t: "p", h: "Bohr's theoretical calculations <strong>agreed with experimental observations</strong> of the light given out by atoms. That agreement is why other scientists accepted his model." },
          { t: "p", h: "A carbon atom has 2 electrons in the first energy level (n = 1) and 4 in the second (n = 2)." },
        ], right: [{ t: "fig", h: deckFig("bohr", "", "", 50) }] },
        { t: "sub", h: "Electrons can change energy level" },
        { t: "fig", h: deckFig("levels", "", "", 56) },
        { t: "compare", head: ["The electron…", "Moves…", "Energy level"], rows: [["<strong>absorbs</strong> electromagnetic (EM) radiation", "<strong>further from</strong> the nucleus", "higher"], ["<strong>emits</strong> electromagnetic (EM) radiation", "<strong>closer to</strong> the nucleus", "lower"]] },
        { t: "model", title: "Think of a ladder", h: "An electron can stand on a rung, but not between rungs. To climb up it must take in exactly the right amount of energy; when it drops down, it gives that energy out as EM radiation. This is why each element gives out its own colours of light.", breaks: "the energy levels are not evenly spaced like rungs, and electrons are not little balls standing on them." },
        { t: "sub", h: "Filling in the nucleus" },
        { t: "split", cls: "wide-fig", left: [{ t: "fig", h: deckFig("bohr-then-now", "Bohr pictured one positive nucleus. Today we draw its protons and neutrons.", "", 44) }], right: [
          { t: "p", h: "Later experiments (about 1920) showed that the positive charge of a nucleus is made of smaller particles, each with the same positive charge: <strong>protons</strong>." },
          { t: "p", h: "In 1932 <strong>James Chadwick</strong> gave the experimental evidence for the <strong>neutron</strong>, about 20 years after scientists had accepted that atoms have a nucleus." },
        ] },
        { t: "sub", h: "Why models change" },
        { t: "split", cls: "narrow-fig", left: [
          { t: "html", h: "<ol class='steps'><li>A model must <strong>explain the evidence</strong> we already have.</li><li>It makes <strong>predictions</strong> that experiments can test.</li><li>If new evidence does not fit, the model is <strong>changed or replaced</strong>.</li><li>Results are <strong>published</strong> so other scientists can check them (<strong>peer review</strong>) before a model is accepted.</li></ol>" },
        ], right: [{ t: "fig", h: deckFig("cycle", "", "", 44) }] },
      ],
      try: [
        { t: "q", p: "In each diagram an electron moves between energy levels. Does the atom <strong>absorb</strong> or <strong>emit</strong> EM radiation? Circle one for each.", options: { cols: 4, items: [
          { label: "A", fig: levelsMini(1, 2), choice: ["absorbs", "emits"], c: 0 }, { label: "B", fig: levelsMini(3, 1), choice: ["absorbs", "emits"], c: 1 },
          { label: "C", fig: levelsMini(2, 1), choice: ["absorbs", "emits"], c: 1 }, { label: "D", fig: levelsMini(1, 3), choice: ["absorbs", "emits"], c: 0 },
        ] } },
        { t: "q", p: "Complete the sentences.", fill: "When an electron absorbs electromagnetic radiation, it moves to a [[higher]] energy level, [[further from|30]] the nucleus. When an electron moves to a lower energy level, it [[emits]] electromagnetic radiation.", bank: ["higher", "lower", "further from", "closer to", "absorbs", "emits"] },
        { t: "q", p: "A lithium atom has 3 electrons: 2 in the first energy level and 1 in the second. Draw the electrons on the diagram.", fig: dfig(atom({ p: 3, n: 4, shells: [2, 1], electrons: "answer", size: 300, ringR: [70, 125] }), "", "", 40) },
        { t: "q", type: "Supported", p: "Complete the timeline.", table: { head: ["Year", "Scientist(s)", "Discovery or model"], rows: [["1897", "J. J. Thomson", null], ["1909–1911", null, "Alpha scattering; the nuclear model"], ["1913", "Niels Bohr", null], ["1932", null, "Evidence for the neutron"]], ans: [[null, null, "The electron (then the plum pudding model, 1904)"], [null, "Rutherford, Geiger and Marsden", null], [null, null, "Electrons in energy levels"], [null, "James Chadwick", null]] } },
        { t: "q", say: ["Leo", "Scientists keep changing the model of the atom because they get bored of the old one."], p: "Explain why scientists really change models.", lines: 3, a: "When new evidence (e.g. from an experiment) does not fit the old model, the model has to be changed or replaced so it explains all the evidence. The new model is checked by other scientists (peer review) before it is accepted." },
        { t: "q", type: "Challenge", p: "Protons were identified around 1920, but the neutron was not found until 1932. Suggest why the neutron was harder to find.", lines: 2, a: "A neutron has no charge, so it is not deflected by electric or magnetic fields and does not ionise atoms directly, so it does not show up easily in detectors." },
      ],
      exam: [
        { tip: "Use the key words: absorb/emit, higher/lower energy level, further from/closer to the nucleus.", p: "Describe how the arrangement of the electrons in an atom may change when the atom absorbs electromagnetic radiation.", marks: 2, lines: 2, a: "An electron moves to a higher energy level (1), further from the nucleus (1)." },
        { p: "Explain why Bohr's model of the atom was accepted by other scientists.", marks: 2, lines: 2, a: "His theoretical calculations agreed with experimental observations (1); it could be tested and checked by other scientists / explained evidence the nuclear model could not (1)." },
        { p: "Give the name of the scientist who provided the evidence for neutrons.", marks: 1, lines: 1, a: "James Chadwick." },
      ],
      summary: ["Bohr (1913): electrons orbit at specific distances, called energy levels. His calculations agreed with experiments.", "Absorb EM radiation → electron moves to a higher level, further from the nucleus.", "Emit EM radiation → electron moves to a lower level, closer to the nucleus.", "Protons were identified later (about 1920); James Chadwick gave evidence for neutrons (1932).", "New evidence changes models; results are published and peer reviewed."],
      recall: [["What did Bohr add to the nuclear model?", "Electrons orbit at specific distances (energy levels)."], ["What happens when an electron emits EM radiation?", "It moves to a lower energy level, closer to the nucleus."], ["Who gave the evidence for the neutron?", "James Chadwick (1932)."], ["Why are scientific results published?", "So other scientists can check them (peer review)."]],
      cando: ["describe Bohr's model of the atom", "explain what happens when electrons absorb or emit EM radiation", "describe the discovery of protons and neutrons", "explain why models of the atom have changed"],
    },

    // ============================================================ 5
    {
      n: 5, accent: "teal", title: "Radioactive decay",
      spec: "AQA Physics 4.4.2.1; Combined Science 6.4.2.1",
      mapLine: "Unstable nuclei, activity and count rate, alpha, beta, gamma and neutron radiation",
      big: "A smoke alarm contains a radioactive source. Nothing switches it on, yet it gives out radiation for hundreds of years. Why?",
      goals: ["explain why some nuclei give out radiation", "describe radioactive decay as random", "define activity and count rate", "describe what alpha, beta, gamma and neutron radiation are, and how each changes the nucleus"],
      keywords: ["unstable nucleus", "radioactive decay", "random", "activity", "becquerel (Bq)", "count rate", "Geiger–Müller tube", "alpha", "beta", "gamma"],
      deck: { slides: "26–30", text: "Radioactive decay, activity and count rate, then alpha, beta and gamma.", sim: SIM_DECAY },
      doNow: [
        ["What is an isotope?", "An atom of the same element with a different number of neutrons."],
        ["What happens when an electron emits EM radiation?", "It moves to a lower energy level, closer to the nucleus."],
        [`How many protons and neutrons are in ${N(14, 6, "C")}?`, "6 protons, 8 neutrons."],
      ],
      learnTitle: "When a nucleus is unstable",
      learn: [
        { t: "sub", h: "Unstable nuclei" },
        { t: "fig", h: deckFig("decay-intro", "", "", 50) },
        { t: "p", h: "Some isotopes have an <strong>unstable nucleus</strong>. It gives out <strong>radiation</strong> as it changes to become <strong>more stable</strong>. This is <strong>radioactive decay</strong>." },
        { t: "p", h: "Decay is <strong>random</strong>: you cannot predict which nucleus will decay next, or when. Nothing we do changes it: heating, cooling or chemical reactions have no effect." },
        { t: "compare", head: ["Quantity", "Meaning", "Unit"], rows: [["<strong>Activity</strong>", "the rate at which a source of unstable nuclei decays: the number of decays each second", "becquerel (Bq); 1 Bq = 1 decay per second"], ["<strong>Count rate</strong>", "the number of decays recorded each second by a detector, such as a Geiger–Müller tube", "counts per second (or per minute)"]] },
        { t: "model", title: "Think of popcorn", h: "In a hot pan, you cannot tell which kernel will pop next, or when. But with lots of kernels, you can predict roughly how many will pop each minute.", breaks: "heating makes popcorn pop faster, but nothing we do changes the rate of radioactive decay." },
        { t: "sub", h: "Four kinds of nuclear radiation" },
        { t: "compare", head: ["Radiation", "What it is", "Symbol", "Charge", "What happens in the nucleus"], rows: [["Alpha (α)", "2 protons + 2 neutrons: a helium nucleus", ALPHA, "+2", "loses 2 protons and 2 neutrons"], ["Beta (β)", "a high-speed electron ejected from the nucleus", BETA, "−1", "a neutron turns into a proton"], ["Gamma (γ)", "electromagnetic radiation from the nucleus", GAMMA, "0", "loses energy only"], ["Neutron (n)", "a neutron", NEUTRON, "0", "loses one neutron"]] },
        { t: "sub", h: "Alpha decay" },
        { t: "fig", h: deckFig("alpha", "", "", 46) },
        { t: "sub", h: "Beta decay" },
        { t: "fig", h: deckFig("beta", "", "", 56) },
        { t: "p", h: "In beta decay, a <strong>neutron changes into a proton</strong>, and a fast electron is made and shoots out of the nucleus. The beta particle comes from the <strong>nucleus</strong>, not from the energy levels." },
        { t: "sub", h: "Gamma emission" },
        { t: "fig", h: deckFig("gamma", "", "", 46) },
        { t: "p", h: "Gamma rays are <strong>electromagnetic waves</strong>. The nucleus gives out extra energy, but its protons and neutrons do not change. Gamma often follows alpha or beta decay." },
      ],
      try: [
        { t: "q", p: "Draw a line from each type of radiation to what it is.", match: { left: [["alpha (α)", "C"], ["beta (β)", "B"], ["gamma (γ)", "D"], ["neutron (n)", "A"]], right: ["a neutron", "a high-speed electron from the nucleus", "two protons and two neutrons", "electromagnetic radiation"] } },
        { t: "q", p: "Which statement about radioactive decay is correct? Tick <strong>one</strong> box.", mcq: { cols: 1, o: ["Heating a source makes it decay faster.", "You can predict when a particular nucleus will decay.", "Unstable nuclei decay at random to become more stable.", "A nucleus decays when a detector is placed near it."], c: 2 } },
        { t: "q", p: "Complete the sentences.", fill: "The [[activity]] of a source is the number of decays each second. It is measured in [[becquerels|28]] (Bq). The number of decays a Geiger–Müller tube records each second is the [[count rate|28]].", bank: ["activity", "count rate", "becquerels", "half-life", "seconds"] },
        { t: "q", type: "Supported", p: "Which radiation causes each change in the nucleus?", table: { head: ["Change in the nucleus", "Radiation"], rows: [["loses 2 protons and 2 neutrons", null], ["a neutron turns into a proton", null], ["loses energy, but no particles change", null], ["loses one neutron", null]], ans: [[null, "alpha"], [null, "beta"], [null, "gamma"], [null, "neutron"]] } },
        { t: "q", say: ["Ava", "Beta particles are electrons knocked out of the energy levels, so beta decay just turns the atom into an ion."], p: "Explain what is wrong with Ava's statement.", lines: 3, a: "A beta particle comes from the nucleus: a neutron turns into a proton and a fast electron is emitted. The nucleus gains a proton, so the atom becomes a different element; it is not just an ion." },
        { t: "q", type: "Challenge", p: "A Geiger–Müller tube records 1800 counts in 1 minute. (a) Calculate the count rate in counts per second. (b) Suggest why the activity of the source is greater than this count rate.", lines: 3, a: "(a) 1800 ÷ 60 = 30 counts per second. (b) Radiation goes out in all directions, so only some of it enters the tube; some is absorbed by the air or the tube wall before it is detected." },
      ],
      lab: { title: "Virtual lab: watch a nucleus decay", aside: "Nuclear Decay simulation, tabs 01 to 03", blocks: [
        { t: "lab", blocks: [
          { t: "p", h: "Open the <strong>Nuclear Decay</strong> simulation. For each tab, press <strong>Decay this nucleus</strong> and read the equation it shows." },
          { t: "q", p: "Record what happens.", table: { head: ["Tab", "Parent nucleus", "What leaves the nucleus?", "Change in mass number", "Change in atomic number", "New nucleus"], rows: [["01 α", "americium-241", null, null, null, null], ["02 β", "carbon-14", null, null, null, null], ["03 γ", "technetium-99m", null, null, null, null]], ans: [[null, null, "alpha particle (He nucleus)", "−4", "−2", "neptunium-237"], [null, null, "beta particle (electron)", "0", "+1", "nitrogen-14"], [null, null, "gamma ray", "0", "0", "technetium-99"]] } },
          { t: "q", p: "Which decays make a new element? Explain using your table.", lines: 2, a: "Alpha and beta: the atomic number (number of protons) changes. Gamma does not change the atomic number, so the element stays the same." },
        ] },
      ] },
      exam: [
        { tip: "Two marks: say what the nucleus gives out <em>and</em> why.", p: "Describe what is meant by radioactive decay.", marks: 2, lines: 2, a: "An unstable nucleus gives out radiation (1) as it changes to become more stable (1). (Accept: it is random.)" },
        { p: "Compare an alpha particle with a beta particle.", marks: 3, lines: 3, a: "Alpha is 2 protons and 2 neutrons (a helium nucleus); beta is a high-speed electron (1). Alpha has a charge of +2; beta −1 (1). Alpha is much more massive / beta is made when a neutron turns into a proton (1)." },
      ],
      summary: ["Unstable nuclei give out radiation to become more stable: radioactive decay.", "Decay is random: we cannot predict which nucleus decays, or when.", "Activity: decays per second, in becquerel (Bq). Count rate: decays recorded per second by a detector.", "Alpha: 2p + 2n (helium nucleus). Beta: fast electron; a neutron becomes a proton. Gamma: EM radiation. Neutron: a neutron."],
      recall: [["Why do some nuclei give out radiation?", "They are unstable; they decay to become more stable."], ["What is the unit of activity?", "Becquerel (Bq)."], ["What is an alpha particle?", "2 protons and 2 neutrons (a helium nucleus)."], ["What happens in the nucleus in beta decay?", "A neutron turns into a proton (and a fast electron is emitted)."]],
      cando: ["explain why unstable nuclei decay", "describe decay as random", "define activity and count rate", "describe alpha, beta, gamma and neutron radiation"],
    }
  );
})();
