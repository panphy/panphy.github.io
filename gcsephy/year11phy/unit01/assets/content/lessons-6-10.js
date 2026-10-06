/* Lessons 6–10: nuclear equations, properties and uses of radiation, half-life,
   half-life calculations, contamination and irradiation. */
(function () {
  "use strict";

  const { A, N, ALPHA, BETA, GAMMA, NEUTRON, GAP, EQ, deckFig } = window.WB;
  const SIM_DECAY = ["Nuclear Decay simulation", "panphy.app/simulations/nuclear_decay.html"];
  const ARROW = "→";
  // Big equations inside questions, with a gap to fill in.
  const eqQ = (parts) => EQ(parts);

  window.WB.lessons.push(
    // ============================================================ 6
    {
      n: 6, accent: "positive", title: "Nuclear equations",
      spec: "AQA Physics 4.4.2.2; Combined Science 6.4.2.2",
      mapLine: "Symbols for each radiation, balancing mass and atomic numbers",
      big: "Radium-226 decays and becomes radon, a completely different element. How can we predict exactly which nucleus it turns into?",
      goals: ["use the symbols for alpha, beta, gamma and neutron radiation", "balance a nuclear equation using mass numbers and atomic numbers", "work out the new nucleus after alpha or beta decay", "explain the effect of each decay on the mass and charge of the nucleus"],
      keywords: ["nuclear equation", "parent nucleus", "daughter nucleus", "mass number", "atomic number", "balance"],
      deck: { slides: "24–27", text: "Alpha, beta and gamma equations, and the ‘What changes?’ table.", sim: SIM_DECAY },
      doNow: [
        ["What is an alpha particle made of?", "2 protons and 2 neutrons (a helium nucleus)."],
        ["What happens in the nucleus in beta decay?", "A neutron turns into a proton, and a fast electron is emitted."],
        ["What is the unit of activity?", "Becquerel (Bq)."],
      ],
      learnTitle: "Balancing nuclear equations",
      learn: [
        { t: "sub", h: "Symbols for nuclear radiation" },
        { t: "compare", head: ["Emitted", "Symbol", "Mass number", "Atomic number"], rows: [["Alpha particle", ALPHA, "decreases by 4", "decreases by 2"], ["Beta particle", BETA, "no change", "increases by 1"], ["Gamma ray", GAMMA, "no change", "no change"], ["Neutron", NEUTRON, "decreases by 1", "no change"]] },
        { t: "p", h: "An electron has almost no mass, so its top number is 0. Its charge is −1, so its bottom number is −1. When a neutron (charge 0) turns into a proton (charge +1), the beta particle carries away the −1: the charges still balance." },
        { t: "key", h: "In every nuclear equation, the <strong>top numbers add up to the same total</strong> on both sides, and so do the <strong>bottom numbers</strong>. If the atomic number changes, a <strong>new element</strong> forms." },
        { t: "sub", h: "The three equations from the slides" },
        { t: "html", h: EQ([N(241, 95, "Am"), ARROW, N(237, 93, "Np"), "+", ALPHA], "Alpha. Top: 241 = 237 + 4; bottom: 95 = 93 + 2") },
        { t: "html", h: EQ([N(14, 6, "C"), ARROW, N(14, 7, "N"), "+", BETA], "Beta. Top: 14 = 14 + 0; bottom: 6 = 7 + (−1)") },
        { t: "html", h: EQ([N("99m", 43, "Tc"), ARROW, N(99, 43, "Tc"), "+", GAMMA], "Gamma. The ‘m’ means the nucleus has extra energy; A and Z do not change") },
        { t: "worked", q: `Radium-226, ${N(226, 88, "Ra")}, emits an alpha particle and becomes radon (Rn). Write the equation.`, steps: [["Top", "226 − 4 = 222"], ["Bottom", "88 − 2 = 86"], ["New nucleus", N(222, 86, "Rn")], ["Equation", `${N(226, 88, "Ra")} → ${N(222, 86, "Rn")} + ${ALPHA}`]],
          yt: { q: `Uranium-238, ${N(238, 92, "U")}, emits an alpha particle and becomes thorium (Th). Write the equation.`, steps: [["Top", "238 − 4 = 234"], ["Bottom", "92 − 2 = 90"], ["New nucleus", N(234, 90, "Th")], ["Equation", `${N(238, 92, "U")} → ${N(234, 90, "Th")} + ${ALPHA}`]] } },
        { t: "worked", q: `Strontium-90, ${N(90, 38, "Sr")}, emits a beta particle and becomes yttrium (Y). Write the equation.`, steps: [["Top", "90 − 0 = 90"], ["Bottom", "38 + 1 = 39"], ["New nucleus", N(90, 39, "Y")], ["Equation", `${N(90, 38, "Sr")} → ${N(90, 39, "Y")} + ${BETA}`]],
          yt: { q: `Iodine-131, ${N(131, 53, "I")}, emits a beta particle and becomes xenon (Xe). Write the equation.`, steps: [["Top", "131"], ["Bottom", "53 + 1 = 54"], ["New nucleus", N(131, 54, "Xe")], ["Equation", `${N(131, 53, "I")} → ${N(131, 54, "Xe")} + ${BETA}`]] } },
      ],
      try: [
        { t: "q", type: "Supported", p: "Fill in the missing particle. Check that the top and bottom numbers balance.", after: [
          { t: "html", h: eqQ([N(210, 84, "Po"), ARROW, N(206, 82, "Pb"), "+", GAP(ALPHA)]) },
          { t: "html", h: eqQ([N(60, 27, "Co"), ARROW, N(60, 28, "Ni"), "+", GAP(BETA)]) },
        ] },
        { t: "q", type: "On your own", p: "Fill in the missing nucleus. The element symbols are given.", after: [
          { t: "html", h: eqQ([N(222, 86, "Rn"), ARROW, GAP(N(218, 84, "Po")), "+", ALPHA]) + '<p class="starter" style="text-align:center">Po = polonium</p>' },
          { t: "html", h: eqQ([N(137, 55, "Cs"), ARROW, GAP(N(137, 56, "Ba")), "+", BETA]) + '<p class="starter" style="text-align:center">Ba = barium</p>' },
          { t: "html", h: eqQ([N(5, 2, "He"), ARROW, GAP(N(4, 2, "He")), "+", NEUTRON]) + '<p class="starter" style="text-align:center">a helium-5 nucleus emits a neutron</p>' },
        ] },
        { t: "q", p: "Name the type of decay in each equation.", table: { head: ["Equation", "Type of decay"], rows: [[`${N(40, 19, "K")} → ${N(40, 20, "Ca")} + ${BETA}`, null], [`${N(238, 92, "U")} → ${N(234, 90, "Th")} + ${ALPHA}`, null], [`${N("99m", 43, "Tc")} → ${N(99, 43, "Tc")} + ${GAMMA}`, null]], ans: [[null, "beta"], [null, "alpha"], [null, "gamma"]] } },
        { t: "q", p: "Complete the table to show the effect of each decay on the nucleus.", table: { head: ["Radiation emitted", "Effect on the mass of the nucleus", "Effect on the charge of the nucleus"], rows: [["alpha", null, null], ["beta", null, null], ["gamma", null, null]], ans: [[null, "decreases (mass number − 4)", "decreases (by 2)"], [null, "no change", "increases (by 1)"], [null, "no change", "no change"]] } },
        { t: "q", say: ["Leo", "In beta decay the nucleus loses an electron, so the mass number goes down by 1."], p: "Explain what is wrong with Leo's statement.", lines: 3, a: "An electron has almost no mass (0 on top), so the mass number does not change. A neutron turns into a proton, so the atomic number goes up by 1." },
        { t: "q", type: "Challenge", p: `Uranium-238, ${N(238, 92, "U")}, decays by alpha emission. The new nucleus then decays by beta emission, and the next one by beta emission again. Find the final nucleus. What do you notice?`, lines: 3, a: `${N(238, 92, "U")} → ${N(234, 90, "Th")} → ${N(234, 91, "Pa")} → ${N(234, 92, "U")}. The final nucleus is uranium-234: an isotope of the uranium we started with (same 92 protons, 4 fewer neutrons).` },
      ],
      exam: [
        { tip: "Both numbers earn a mark. Check: top 212 = ? + 4, bottom 83 = ? + 2.", p: `Bismuth-212, ${N(212, 83, "Bi")}, decays by alpha emission to form thallium (Tl). Complete the nuclear equation.`, marks: 2, after: [{ t: "html", h: EQ([N(212, 83, "Bi"), ARROW, `<span class="gap" style="min-width:24mm">${A(N(208, 81, "Tl"))}</span>`, "+", ALPHA]) }], a: "Mass number 208 (1); atomic number 81 (1)." },
        { p: "Technetium-99m emits gamma radiation. Explain why the element does not change.", marks: 2, lines: 2, a: "Gamma radiation is electromagnetic radiation with no mass and no charge (1), so the number of protons / atomic number does not change (1)." },
      ],
      summary: ["Symbols: alpha " + ALPHA + ", beta " + BETA + ", gamma " + GAMMA + ", neutron " + NEUTRON + ".", "Top numbers balance; bottom numbers balance.", "Alpha: mass number − 4, atomic number − 2.", "Beta: mass number unchanged, atomic number + 1.", "Gamma: no change to either number."],
      recall: [["What is the symbol for a beta particle?", BETA], ["What happens to the atomic number in alpha decay?", "It decreases by 2."], ["Which decay does not change the mass number or atomic number?", "Gamma emission."], [`Complete: ${N(226, 88, "Ra")} → ? + ${ALPHA}`, N(222, 86, "Rn")]],
      cando: ["write the symbols for alpha, beta, gamma and neutron radiation", "balance a nuclear equation", "find the new nucleus after alpha or beta decay", "explain the effect of each decay on mass and charge"],
    },

    // ============================================================ 7
    {
      n: 7, accent: "object", title: "Properties and uses of radiation",
      spec: "AQA Physics 4.4.2.1; Combined Science 6.4.2.1",
      mapLine: "Ionising power, range and penetration; choosing the right source",
      big: "A smoke alarm uses alpha radiation, a paper mill uses beta and a hospital uses gamma. Why not use the same radiation for all three?",
      goals: ["compare the ionising power, range in air and penetration of alpha, beta and gamma", "explain why more ionising radiation is less penetrating", "identify radiation from absorber data", "choose a suitable source for a use and justify the choice"],
      keywords: ["ionising", "ion", "penetration", "range", "absorbed", "smoke alarm", "thickness gauge", "tracer"],
      deck: { slides: "28–30", text: "Comparing alpha, beta and gamma, penetration, and choosing a source.", sim: SIM_DECAY },
      doNow: [
        [`Complete: ${N(210, 84, "Po")} → ${N(206, 82, "Pb")} + ?`, `${ALPHA} (an alpha particle)`],
        ["What happens to the atomic number in beta decay?", "It increases by 1."],
        ["What is gamma radiation?", "Electromagnetic radiation from the nucleus."],
      ],
      learnTitle: "Ionising and penetrating",
      learn: [
        { t: "sub", h: "Nuclear radiation is ionising" },
        { t: "p", h: "As nuclear radiation passes through a material, it knocks electrons off atoms, turning them into <strong>ions</strong> (Lesson 2). Each ionisation takes some of the radiation's energy. Alpha particles are large with a +2 charge, so they collide with many atoms and ionise strongly: they lose their energy fast and do not travel far." },
        { t: "compare", head: ["", "Alpha (α)", "Beta (β)", "Gamma (γ)"], rows: [["What is it?", "helium nucleus", "fast electron", "EM wave"], ["Charge", "+2", "−1", "0"], ["Ionising", "strongly", "moderately", "weakly"], ["Range in air", "a few cm", "up to a few metres", "very far"], ["Stopped by", "a sheet of paper, or skin", "a few mm of aluminium", "reduced by thick lead or concrete"]] },
        { t: "fig", h: deckFig("penetration", "", "", 50) },
        { t: "key", h: "<strong>More ionising → less penetrating.</strong> Alpha loses its energy fastest, so it is stopped most easily. Gamma ionises weakly, so it travels furthest." },
        { t: "sub", h: "Choosing the right source" },
        { t: "figs", cols: 3, items: [deckFig("use-smoke", "<b>Alpha: smoke alarm</b><br>Alpha ionises the air, so a small current flows. Smoke absorbs the alpha particles, the current falls and the alarm sounds.", "", 34), deckFig("use-gauge", "<b>Beta: thickness gauge</b><br>Paper absorbs some beta. If the paper gets thicker, the count rate falls, and the rollers adjust.", "", 34), deckFig("use-tracer", "<b>Gamma: medical tracer</b><br>Gamma passes out of the body to a detector and is only weakly ionising.", "", 34)] },
        { t: "p", h: "To choose a source, think about <strong>penetration</strong> (must it pass through something, or be stopped?), <strong>ionising power</strong>, and <strong>half-life</strong>: how long it keeps giving out radiation (Lesson 8)." },
        { t: "sub", h: "Identifying radiation from absorbers" },
        { t: "p", h: "A detector measures the count rate from a source as different absorbers are placed in between. The background count rate is 30 counts per minute." },
        { t: "worked", q: "Which radiation does this source emit?", table: { head: ["Absorber", "Count rate / counts per minute"], rows: [["none", "900"], ["paper", "460"], ["5 mm aluminium", "455"], ["2 cm lead", "90"]] }, steps: [["Paper", "900 → 460: a big fall, so alpha is present"], ["Aluminium", "460 → 455: no real change, so no beta"], ["Lead", "455 → 90: falls, but still above background (30), so gamma"], ["Answer", "alpha and gamma"]],
          yt: { q: "Which radiation does this source emit?", table: { head: ["Absorber", "Count rate / counts per minute"], rows: [["none", "520"], ["paper", "515"], ["5 mm aluminium", "32"], ["2 cm lead", "31"]] }, steps: [["Paper", "no real change: no alpha"], ["Aluminium", "falls to background: beta"], ["Lead", "no change: no gamma"], ["Answer", "beta only"]] } },
      ],
      try: [
        { t: "q", type: "Supported", p: "Complete the table.", table: { head: ["", "Alpha", "Beta", "Gamma"], rows: [["Ionising power", null, "moderate", null], ["Stopped by", null, null, "(reduced by) thick lead"], ["Range in air", "a few cm", null, null]], ans: [[null, "strong", null, "weak"], [null, "paper / skin", "a few mm of aluminium", null], [null, null, "up to a few m", "very far"]] } },
        { t: "q", p: "Which radiation is the most strongly ionising? Tick <strong>one</strong> box.", mcq: { cols: 3, o: ["alpha", "beta", "gamma"], c: 0 } },
        { t: "q", p: "Draw a line from each use to the radiation it needs.", match: { left: [["smoke alarm", "B"], ["paper thickness gauge", "C"], ["medical tracer", "A"]], right: ["gamma", "alpha", "beta"] } },
        { t: "q", p: "Explain why a beta source is used to monitor the thickness of paper, and not alpha or gamma.", lines: 4, a: "Alpha would be stopped completely by the paper, so the count rate would not change with thickness. Gamma would pass straight through almost unaffected. Beta is partly absorbed, so the count rate changes when the thickness changes." },
        { t: "q", type: "On your own", p: "The background count rate is 20 counts per minute. Which radiation does this source emit? Explain using the data.", table: { head: ["Absorber", "none", "paper", "5 mm aluminium", "2 cm lead"], rows: [["Count rate / counts per minute", "640", "380", "25", "21"]] }, lines: 3, a: "Paper: 640 → 380, so alpha is present. Aluminium: 380 → 25, about background, so beta is present. Lead: no further change, so no gamma. The source emits alpha and beta." },
        { t: "q", say: ["Mia", "Gamma goes through everything, and nothing can stop it."], p: "Correct Mia's statement.", lines: 2, a: "Gamma is very penetrating, but thick lead or concrete absorbs most of it: it is reduced, even if not stopped completely." },
        { t: "q", type: "Challenge", p: "Smoke alarms use americium-241, which has a half-life of 432 years. Suggest why a long half-life is useful here.", lines: 2, a: "The source keeps giving out alpha radiation at an almost steady rate for many years, so the alarm works for its whole lifetime without replacing the source." },
      ],
      exam: [
        { tip: "Link each property to the reason: ionising → loses energy quickly → short range.", p: "Explain why alpha radiation is more strongly ionising but less penetrating than gamma radiation.", marks: 3, lines: 3, a: "Alpha particles are large with a +2 charge, so they collide with / ionise many atoms (1). Each ionisation transfers energy, so alpha loses its energy quickly (1) and is stopped by a short distance (paper or a few cm of air). Gamma has no charge, ionises weakly, so it loses energy slowly and travels much further (1)." },
        { p: "A factory uses a beta source and a detector to control the thickness of aluminium foil. Explain how the count rate shows that the foil has become too thick.", marks: 3, lines: 3, a: "Thicker foil absorbs more beta radiation (1), so fewer beta particles reach the detector (1) and the count rate falls below its normal value (1)." },
      ],
      summary: ["Nuclear radiation ionises atoms by knocking off electrons.", "Alpha: strongly ionising, a few cm in air, stopped by paper.", "Beta: moderately ionising, a few m in air, stopped by a few mm of aluminium.", "Gamma: weakly ionising, very far in air, reduced by thick lead or concrete.", "More ionising → less penetrating. Choose a source by penetration, ionising power and half-life."],
      recall: [["What does ionising mean?", "Knocking electrons off atoms, making ions."], ["What stops beta radiation?", "A few mm of aluminium."], ["Which radiation is used in a smoke alarm?", "Alpha."], ["Why is gamma used as a medical tracer?", "It passes out of the body to a detector and is only weakly ionising."]],
      cando: ["compare the properties of alpha, beta and gamma", "explain the link between ionising and penetration", "identify radiation from absorber data", "choose and justify a source for a use"],
    },

    // ============================================================ 8
    {
      n: 8, accent: "electron", title: "Half-life and random decay",
      spec: "AQA Physics 4.4.2.3; Combined Science 6.4.2.3",
      mapLine: "Random but predictable, defining half-life, reading a decay curve",
      big: "You cannot predict when one nucleus will decay. So how can we say that half of a sample of iodine-131 will be left after 8 days?",
      goals: ["explain why decay is random but a large sample is predictable", "define half-life in two ways", "find the half-life from a decay curve", "plot a decay curve from data"],
      keywords: ["half-life", "random", "decay curve", "sample", "count rate", "activity"],
      deck: { slides: "31–33", text: "Half-life, using half-life and random decay.", sim: SIM_DECAY },
      doNow: [
        ["Which radiation is stopped by paper?", "Alpha."],
        ["What does a count rate measure?", "The number of decays a detector records each second."],
        ["What is the unit of activity?", "Becquerel (Bq)."],
      ],
      learnTitle: "Random, but predictable",
      learn: [
        { t: "sub", h: "Random, but predictable" },
        { t: "fig", h: deckFig("random", "", "", 44) },
        { t: "p", h: "Every unstable nucleus of an isotope has the <strong>same chance</strong> of decaying in a given time. You cannot say which one will decay next, or when. But in a <strong>large sample</strong>, the number that decay in a given time is very predictable. In a small sample, the numbers vary more." },
        { t: "model", title: "Think of coins", h: "Throw 100 coins and remove every head. About half are left. Throw the rest and remove the heads again: about a quarter are left. You cannot predict any one coin, but you can predict the group.", breaks: "coins only ‘decay’ when you throw them, but nuclei decay at any moment; and real samples have billions of nuclei." },
        { t: "sub", h: "Half-life" },
        { t: "split", cls: "wide-fig", left: [{ t: "fig", h: deckFig("half-life", "", "", 52) }], right: [
          { t: "p", h: "The <strong>half-life</strong> of a radioactive isotope is:" },
          { t: "html", h: "<ul><li>the time it takes for the <strong>number of unstable nuclei</strong> in a sample to <strong>halve</strong>, or</li><li>the time it takes for the <strong>count rate</strong> (or activity) from a sample to fall to <strong>half</strong> its initial level.</li></ul>" },
          { t: "p", h: "Each halving takes the same time. Iodine-131 has a half-life of about 8 days." },
        ] },
        { t: "sub", h: "Finding the half-life from a graph" },
        { t: "split", cls: "top", left: [
          { t: "html", h: "<ol class='steps'><li>Read the <strong>starting value</strong>: here 800 Bq.</li><li><strong>Halve it</strong>: 400 Bq.</li></ol>" },
        ], right: [
          { t: "html", h: "<ol class='steps' start='3' style='counter-reset:s 2'><li>Read <strong>across</strong> from 400 Bq to the curve, then <strong>down</strong> to the time axis: 6 hours.</li><li><strong>Check</strong> with a second halving: 400 → 200 Bq also takes 6 hours.</li></ol>" },
        ] },
        { t: "graph", w: 140, h: 90, x: [2, 1], y: [100, 1], xLabel: "time / hours", yLabel: "activity / Bq", givenFit: (t) => 800 * Math.pow(2, -t / 6), givenRange: [0, 28], showRead: [[6, 400], [12, 200]] },
        { t: "key", h: "Half-life = <strong>6 hours</strong>. Every halving takes the same time: 800 → 400 → 200 Bq at 6 and 12 hours." },
      ],
      try: [
        { t: "q", p: "The graph shows how the count rate from a sample changes. Use it to find:", graph: { w: 140, h: 90, x: [10, 1], y: [60, 1], xLabel: "time / minutes", yLabel: "count rate / counts per minute", givenFit: (t) => 480 * Math.pow(2, -t / 20), givenRange: [0, 140], read: [[20, 240], [40, 120], [60, 60]] }, after: [
          { t: "html", h: `<div class="frame" style="grid-template-columns:44mm minmax(0,1fr)"><span>(a) half-life</span><span>${A("480 → 240 at 20 minutes: half-life = 20 min")}</span><span>(b) count rate at 40 min</span><span>${A("120 counts per minute")}</span><span>(c) time to reach 60</span><span>${A("60 minutes (3 half-lives)")}</span></div>` },
        ] },
        { t: "q", p: "The half-life of a sample is 5 days. Which statement is correct? Tick <strong>one</strong> box.", mcq: { cols: 1, o: ["All the nuclei will have decayed after 10 days.", "About half of the unstable nuclei will decay in the next 5 days.", "Each nucleus lasts exactly 5 days before it decays.", "After 5 days the sample is no longer radioactive."], c: 1 } },
        { t: "q", type: "Supported", p: "A sample has 1600 unstable nuclei. Its half-life is 3 hours. Complete the table.", table: { head: ["Time / hours", "0", "3", "6", "9", "12"], rows: [["Unstable nuclei left", "1600", null, null, null, null]], ans: [[null, null, "800", "400", "200", "100"]] } },
        { t: "q", say: ["Leo", "After two half-lives, all of the sample has decayed."], p: "Explain what is wrong with Leo's statement.", lines: 2, a: "After one half-life half is left; after two half-lives, a quarter (half of a half) is left, not zero." },
        { t: "q", p: "A student has a sample of only 100 nuclei. After one half-life, 44 are left, not 50. Explain why.", lines: 2, a: "Decay is random. In a small sample the number that decay varies a lot around the expected half; a larger sample would be closer to 50%." },
      ],
      lab: { title: "Virtual lab: modelling half-life", aside: "Nuclear Decay simulation, tab 04 (Half-life). No computer? Use 100 coins: each throw is one half-life; remove the heads.", blocks: [
        { t: "lab", blocks: [
          { t: "html", h: "<ul><li>" + ["Open tab <strong>04 Half-life</strong>. Choose <strong>Iodine-131</strong> and <strong>400 nuclei</strong>.", "Before each step, write the number you expect. Then press <strong>Run one half-life</strong> and record the number left.", "Repeat until 5 half-lives have passed."].join("</li><li>") + "</li></ul>" },
          { t: "q", p: "Record your results.", table: { head: ["Half-lives", "0", "1", "2", "3", "4", "5"], rows: [["Expected number left", "400", null, null, null, null, null], ["Number left (your run)", "400", null, null, null, null, null]], ans: [[null, null, "200", "100", "50", "25", "12.5"], [null, null, "e.g. 206", "e.g. 97", "e.g. 51", "e.g. 27", "e.g. 13"]] } },
          { t: "q", p: "Plot your results. Draw a smooth curve of best fit.", graph: { w: 130, h: 80, x: [0.5, 2], y: [50, 1], xLabel: "number of half-lives", yLabel: "nuclei left", points: [[0, 400], [1, 206], [2, 97], [3, 51], [4, 27], [5, 13]], fit: (n) => 400 * Math.pow(2, -n), fitRange: [0, 6] } },
          { t: "q", p: "Now run the simulation again with <strong>100 nuclei</strong>. How is the graph different? Explain why.", lines: 2, a: "It is more ragged: the numbers left are further from exact halves. With fewer nuclei, the random nature of decay has a bigger effect." },
        ] },
      ] },
      exam: [
        { tip: "One definition is enough for 1 mark, but it must say ‘half’ and what is halving.", p: "Define the half-life of a radioactive isotope.", marks: 1, lines: 1, a: "The time taken for the number of unstable nuclei in a sample (or the count rate) to halve." },
        { p: "Explain why the activity of a radioactive source decreases over time.", marks: 2, lines: 2, a: "As nuclei decay, there are fewer unstable nuclei left (1), so there are fewer decays each second (1)." },
      ],
      summary: ["Decay is random: we cannot predict which nucleus decays, or when.", "A large sample is predictable; small samples vary more.", "Half-life: the time for the number of unstable nuclei, or the count rate, to halve.", "From a graph: start value → halve it → across to the curve → down to the time."],
      recall: [["Define half-life.", "The time for the number of unstable nuclei (or the count rate) to halve."], ["What fraction is left after 2 half-lives?", "A quarter (1/4)."], ["Why are small samples less predictable?", "Decay is random, so the numbers vary more around the expected value."], ["What is the half-life of iodine-131?", "About 8 days."]],
      cando: ["explain why decay is random but predictable", "define half-life in two ways", "find a half-life from a decay curve", "plot a decay curve from data"],
    },

    // ============================================================ 9
    {
      n: 9, accent: "alpha", title: "Half-life calculations",
      spec: "AQA Physics 4.4.2.3; Combined Science 6.4.2.3; Higher tier: net decline",
      mapLine: "Counting half-lives, finding a half-life from data, net decline as a ratio (HT)",
      big: "A hospital uses iodine-131, with a half-life of 8 days. How long before less than 1% of it is left, and why does that matter?",
      goals: ["count half-lives to find how much is left", "find a half-life from data", "find how long it takes to fall to a given value", "(Higher) work out the net decline as a ratio"],
      keywords: ["half-life", "number of half-lives", "initial activity", "fraction remaining", "net decline", "ratio"],
      deck: { slides: "32", text: "Using half-life: from a graph, counting halvings, and as a ratio." },
      doNow: [
        ["Define half-life.", "The time for the number of unstable nuclei (or the count rate) to halve."],
        ["A count rate falls from 400 to 200 in 8 days. What is the half-life?", "8 days."],
        ["Why is radioactive decay described as random?", "You cannot predict which nucleus will decay, or when."],
      ],
      learnTitle: "Counting the halvings",
      learn: [
        { t: "sub", h: "Three steps" },
        { t: "html", h: "<ol class='steps'><li>Work out the <strong>number of half-lives</strong>: time ÷ half-life. Use the same units for both.</li><li><strong>Halve</strong> the starting value that many times.</li><li>Give the answer <strong>with a unit</strong>.</li></ol>" },
        { t: "worked", q: "A source has an activity of 640 Bq. Its half-life is 2 hours. Calculate its activity after 8 hours.", steps: [["Half-lives", "8 ÷ 2 = 4"], ["Halve", "640 → 320 → 160 → 80 → 40"], ["Answer", "40 Bq"]],
          yt: { q: "A source has an activity of 3200 Bq. Its half-life is 5 days. Calculate its activity after 15 days.", steps: [["Half-lives", "15 ÷ 5 = 3"], ["Halve", "3200 → 1600 → 800 → 400"], ["Answer", "400 Bq"]] } },
        { t: "sub", h: "Finding the half-life from data" },
        { t: "worked", q: "The activity of a sample falls from 2400 Bq to 300 Bq in 36 minutes. Calculate the half-life.", steps: [["Halvings", "2400 → 1200 → 600 → 300: 3 halvings"], ["Half-life", "36 ÷ 3"], ["Answer", "12 minutes"]],
          yt: { q: "A count rate falls from 960 to 60 counts per minute in 20 hours. Calculate the half-life.", steps: [["Halvings", "960 → 480 → 240 → 120 → 60: 4"], ["Half-life", "20 ÷ 4"], ["Answer", "5 hours"]] } },
        { t: "sub", h: "Net decline as a ratio (Higher tier)" },
        { t: "split", cls: "top", left: [
          { t: "p", h: "After <em>n</em> half-lives, the fraction left is (½)<sup><em>n</em></sup>. The <strong>net decline</strong> is how much the activity has fallen. As a ratio of the initial activity, it is 1 − (½)<sup><em>n</em></sup>." },
          { t: "p", h: "Example: 200 Bq falls to 50 Bq in 2 half-lives. Net decline = 200 − 50 = 150 Bq. As a ratio of the initial activity: 150 : 200 = <strong>3 : 4</strong>, or ¾." },
        ], right: [{ t: "compare", head: ["Half-lives", "Fraction left", "Net decline"], rows: [["1", "½", "½"], ["2", "¼", "¾"], ["3", "⅛", "⅞"], ["4", "1/16", "15/16"]] }] },
      ],
      try: [
        { t: "q", type: "Supported", p: "A source has an activity of 1200 Bq and a half-life of 6 hours. Calculate its activity after 24 hours.", frame: [["Half-lives"], ["Halve"], ["Answer", "unit:"]], frameA: ["24 ÷ 6 = 4", "1200 → 600 → 300 → 150 → 75", "75 Bq"] },
        { t: "q", type: "On your own", p: "How long does it take for the activity of a source to fall from 1000 Bq to 125 Bq, if its half-life is 6 hours?", lines: 2, a: "1000 → 500 → 250 → 125 is 3 half-lives; 3 × 6 = 18 hours." },
        { t: "q", p: "Use the data to find the half-life. (Hint: find when the count rate is half of 800.)", table: { head: ["Time / min", "0", "10", "20", "30", "40"], rows: [["Count rate / counts per minute", "800", "566", "400", "283", "200"]] }, lines: 2, a: "800 halves to 400 at 20 minutes (and 400 → 200 from 20 to 40 min), so the half-life is 20 minutes." },
        { t: "q", say: ["Mia", "The half-life is 10 minutes, so the activity will be zero after 20 minutes."], p: "Explain why Mia is wrong. What fraction is really left after 20 minutes?", lines: 2, a: "Each half-life only halves the activity; it never jumps to zero. 20 minutes is 2 half-lives, so a quarter (¼) is left." },
        { t: "q", type: "Higher tier", p: "A source has an initial activity of 1200 Bq. Calculate its activity after 3 half-lives, and the net decline as a ratio of the initial activity.", lines: 3, a: "1200 → 600 → 300 → 150 Bq. Net decline = 1200 − 150 = 1050 Bq; 1050 : 1200 = 7 : 8 (⅞)." },
        { t: "q", type: "Challenge", p: "Iodine-131 has a half-life of 8 days. (a) What fraction is left after 32 days? (b) How many whole half-lives until less than 1% is left? How many days is that?", lines: 3, a: "(a) 32 ÷ 8 = 4 half-lives: 1/16 (6.25%) is left. (b) (½)<sup>6</sup> = 1.6%, (½)<sup>7</sup> = 0.78%, so 7 half-lives = 56 days." },
      ],
      exam: [
        { tip: "Show the halvings, not just the answer. Units: keep kBq as kBq.", p: "Cobalt-60 has a half-life of 5.3 years. A source has an activity of 400 kBq. Calculate its activity after 15.9 years.", marks: 2, lines: 2, a: "15.9 ÷ 5.3 = 3 half-lives (1); 400 → 200 → 100 → 50 kBq (1)." },
        { type: "Higher tier", p: "Calculate the net decline in the activity of the cobalt-60 source after 15.9 years, as a ratio of its initial activity.", marks: 2, lines: 2, a: "Net decline = 400 − 50 = 350 kBq (1); 350 : 400 = 7 : 8 (or ⅞) (1)." },
        { p: "The graph shows the count rate from a sample. Determine the half-life. Show on the graph how you found it.", marks: 2, graph: { w: 140, h: 90, x: [1, 1], y: [30, 1], xLabel: "time / days", yLabel: "count rate / counts per second", givenFit: (t) => 240 * Math.pow(2, -t / 3), givenRange: [0, 14], read: [[3, 120], [6, 60]] }, lines: 1, a: "240 → 120 at 3 days, lines drawn on the graph (1); half-life = 3 days (1)." },
      ],
      summary: ["Number of half-lives = time ÷ half-life (same units).", "Halve the starting value once for each half-life.", "Half-life from data: count the halvings, then divide the time by that number.", "After n half-lives, (½)<sup>n</sup> is left.", "HT: net decline = initial − final; as a ratio of the initial, 1 − (½)<sup>n</sup>."],
      recall: [["What fraction is left after 3 half-lives?", "⅛"], ["800 Bq falls to 100 Bq. How many half-lives?", "3"], ["Half-life 4 h. How long for 640 Bq to fall to 80 Bq?", "3 half-lives = 12 hours."], ["HT: net decline after 2 half-lives, as a ratio?", "¾ (3 : 4)"]],
      cando: ["calculate how much is left after a number of half-lives", "find a half-life from data or a graph", "find how long a source takes to fall to a value", "(HT) express the net decline as a ratio"],
    },

    // ============================================================ 10
    {
      n: 10, accent: "photon", title: "Contamination and irradiation",
      spec: "AQA Physics 4.4.2.4; Combined Science 6.4.2.4",
      mapLine: "Two ways to be exposed, hazards inside and outside the body, staying safe, peer review",
      big: "Supermarkets can sell food treated with gamma rays to kill bacteria. Does eating it make you radioactive?",
      goals: ["explain the difference between irradiation and contamination", "compare the hazards of alpha, beta and gamma inside and outside the body", "describe precautions for working with radioactive sources", "explain why studies of radiation effects are published and peer reviewed"],
      keywords: ["irradiation", "contamination", "hazard", "precaution", "dosimeter", "peer review"],
      deck: { slides: "34–36", text: "Contamination and irradiation, the quick check and the key words." },
      doNow: [
        ["A source has a half-life of 3 hours. What fraction is left after 9 hours?", "⅛ (3 half-lives)."],
        ["Which radiation is the most penetrating?", "Gamma."],
        ["What stops beta radiation?", "A few mm of aluminium."],
      ],
      learnTitle: "Two different things",
      learn: [
        { t: "sub", h: "Irradiation and contamination" },
        { t: "fig", h: deckFig("exposure", "", "", 48) },
        { t: "compare", head: ["", "Irradiation", "Contamination"], rows: [["What is it?", "exposing an object to nuclear radiation from outside", "unwanted radioactive atoms <strong>on or in</strong> an object"], ["Does the object become radioactive?", "<strong>no</strong>", "it contains radioactive atoms, so it gives out radiation"], ["When does the exposure stop?", "when the source is removed or shielded", "only when the radioactive atoms are removed (or have decayed)"], ["Example", "gamma rays used to sterilise food or medical equipment", "breathing in radon gas; radioactive dust on skin"]] },
        { t: "key", h: "An irradiated object does <strong>not</strong> become radioactive. A contaminated object keeps giving out radiation until the radioactive atoms are removed." },
        { t: "sub", h: "How big is the hazard?" },
        { t: "p", h: "Ionising radiation can damage cells and the DNA inside them: cells may die or start to divide out of control (cancer). The hazard depends on where the source is and which radiation it gives out." },
        { t: "compare", head: ["Radiation", "Source outside the body", "Source inside the body"], rows: [["Alpha", "low hazard: stopped by the outer layer of skin", "<strong>most hazardous</strong>: strongly ionising, all its energy goes into nearby cells"], ["Beta", "can pass through skin to tissues below", "hazardous: moderately ionising"], ["Gamma", "<strong>most hazardous</strong> outside: reaches organs inside", "least hazardous inside: much of it passes out of the body"]] },
        { t: "sub", h: "Staying safe" },
        { t: "safety", title: "Precautions with radioactive sources", items: ["Handle sources with <strong>tongs</strong> or wear <strong>gloves</strong>: keeps the source away from the skin and stops contamination.", "Keep your <strong>distance</strong> and point sources away from people.", "Keep <strong>exposure time</strong> as short as possible.", "Store sources in <strong>lead-lined boxes</strong>, which absorb the radiation.", "Workers wear a <strong>dosimeter badge</strong> to measure how much radiation they receive."] },
        { t: "sub", h: "Science you can trust" },
        { t: "p", h: "In the 1920s, workers painting watch dials with glowing radium paint licked their brushes to make a fine point. Many became seriously ill. Published studies of their health helped show how dangerous radioactive contamination is, and safety rules changed. It is important that findings about the effects of radiation on people are <strong>published</strong> and shared, so other scientists can check them by <strong>peer review</strong>." },
      ],
      try: [
        { t: "q", p: "Is each example <strong>irradiation</strong> or <strong>contamination</strong>? Circle one for each.", options: { cols: 4, items: [
          { label: "A", text: "Surgical instruments are sterilised with gamma rays.", choice: ["irradiation", "contamination"], c: 0 },
          { label: "B", text: "A person breathes in radon gas.", choice: ["irradiation", "contamination"], c: 1 },
          { label: "C", text: "Radioactive dust sticks to a worker's gloves.", choice: ["irradiation", "contamination"], c: 1 },
          { label: "D", text: "Strawberries are treated with gamma rays to keep them fresh.", choice: ["irradiation", "contamination"], c: 0 },
        ] } },
        { t: "q", say: ["Leo", "Food treated with gamma rays becomes radioactive, so it is dangerous to eat."], p: "Explain why Leo is wrong.", lines: 2, a: "This is irradiation: the food is exposed to radiation but no radioactive atoms are added, so it does not become radioactive and is safe to eat." },
        { t: "q", type: "Supported", p: "Explain how each precaution reduces the risk.", table: { head: ["Precaution", "How it reduces the risk"], rows: [["Using tongs", null], ["Storing the source in a lead-lined box", null], ["Keeping exposure time short", null], ["Wearing a dosimeter badge", null]], ans: [[null, "keeps the source away from the hands; less radiation reaches them and no contamination"], [null, "lead absorbs the radiation"], [null, "less radiation is received in total"], [null, "measures the dose received, so it can be kept below safe limits"]] } },
        { t: "q", p: "Explain why an alpha source is the least hazardous outside the body but the most hazardous inside it.", lines: 4, a: "Outside: alpha is stopped by the outer layer of skin (or a few cm of air), so it cannot reach living cells. Inside: nothing shields the cells, and alpha is strongly ionising, so it transfers all its energy to nearby cells and causes a lot of damage." },
        { t: "q", p: "Why is it important that studies of the effects of radiation on people are published? Tick <strong>one</strong> box.", mcq: { cols: 1, o: ["So that other scientists can check the findings (peer review).", "So that the scientists become famous.", "So that the results can never be changed.", "So that radiation becomes safe."], c: 0 } },
        { t: "q", type: "Challenge", p: "Radon-222 is a gas given off by some rocks, and it emits alpha particles. Explain why radon in homes is a health risk, even though alpha cannot pass through skin.", lines: 3, a: "Radon gas is breathed in, so it contaminates the lungs: the source is inside the body. The alpha particles are strongly ionising and damage lung cells directly, which can cause cancer." },
      ],
      exam: [
        { tip: "Define both words, and make the difference clear: outside source vs radioactive atoms on or in the object.", p: "Explain the difference between irradiation and contamination.", marks: 2, lines: 2, a: "Irradiation: an object is exposed to radiation from a source outside it and does not become radioactive (1). Contamination: radioactive atoms get onto or into an object, so it keeps emitting radiation (1)." },
        { p: "A technician uses a sealed gamma source. Describe two precautions the technician should take, and explain how each one reduces the risk.", marks: 4, lines: 4, a: "Any two, each with a reason: use tongs / keep a distance (1) so less radiation reaches the body (1); keep exposure time short (1) so the total dose is lower (1); store in a lead-lined box (1) because lead absorbs gamma (1); wear a dosimeter (1) to monitor the dose (1)." },
      ],
      summary: ["Irradiation: exposed to radiation; does not become radioactive.", "Contamination: radioactive atoms on or in an object; it keeps emitting until they are removed.", "Outside the body, gamma (and beta) are most hazardous; inside, alpha is most hazardous.", "Precautions: tongs, distance, short time, lead shielding, dosimeter.", "Findings about radiation's effects are published and peer reviewed."],
      recall: [["Does irradiated food become radioactive?", "No."], ["What is contamination?", "Unwanted radioactive atoms on or in an object."], ["Which radiation is most hazardous inside the body?", "Alpha."], ["Why are results about radiation's effects published?", "So other scientists can check them (peer review)."]],
      cando: ["explain the difference between irradiation and contamination", "compare the hazards inside and outside the body", "describe precautions and how each reduces the risk", "explain why findings are published and peer reviewed"],
    }
  );
})();
