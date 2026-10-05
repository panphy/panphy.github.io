/* Content for the Electric Circuits virtual labs booklet (workbook.html?labs), rendered
   by assets/workbook.js with the workbook's block types. Each lab is a list of sections;
   `page: true` starts a section on a new page so the site's deep links stay on a page
   boundary. A question's `key` is its entry in the answer key at the back; a `fill`
   question without one lists its blanks. */
(function () {
  "use strict";

  const D = window.Diagrams;
  const PHET = "https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_all.html";

  const loop = D.circuit({
    w: 380, h: 190, wires: ["M40 45 H340 V140 H40 Z"],
    parts: [["battery", 190, 45, "h", "6 V battery"], ["resistor", 190, 140, "h", "10 Ω resistor", "b"]],
    dots: [[100, 140], [280, 140]],
    notes: [[100, 128, "Point A"], [280, 128, "Point B"], [165, 78, "+"], [215, 78, "−"]],
    caption: "One unbroken loop.",
  });

  const setup = {
    intro: "<strong>Predict. Test. Explain.</strong> Work in pairs. Swap roles on each new page.",
    blocks: [
      { t: "key", h: `Open <a href="${PHET}"><strong>PhET Circuit Construction Kit: DC</strong></a> and choose <strong>Lab</strong>. On paper: search “PhET Circuit Construction Kit DC”, then choose Lab.` },
      { t: "split", cls: "wide-fig", left: [
        { t: "steps", items: [
          "Select <strong>Lab</strong>. Turn on <strong>Values</strong> and <strong>Show Current</strong>. Start with <strong>Electrons</strong>.",
          "Build the loop shown. Join the wire ends together.",
          "Tap the battery: set <strong>6 V</strong>. Tap the resistor: set <strong>10 Ω</strong>.",
          "In Advanced Options, set Wire Resistivity and Battery Resistance to their <strong>minimum</strong> settings.",
        ] },
      ], right: [{ t: "fig", h: loop }] },
      { t: "sub", h: "Measure current" },
      { t: "p", h: "Drag out the <strong>Non-Contact Ammeter</strong>. Place its probe on a wire. You do not need to break the circuit. A normal wired ammeter goes <strong>in series</strong>." },
      { t: "sub", h: "Measure potential difference" },
      { t: "p", h: "Drag out a <strong>voltmeter</strong>. Put one probe at each end of the component. Swap the probes if the reading is negative." },
      { t: "sub", h: "Keep these ideas separate" },
      { t: "compare", head: ["Quantity", "Meaning", "Unit"], rows: [
        ["Charge Q", "An amount of electric charge", "coulomb (C)"],
        ["Current I", "Charge passing a point each second", "ampere (A)"],
        ["Potential difference V", "Energy transferred per coulomb between two points", "volt (V)"],
        ["Energy E", "Energy transferred electrically", "joule (J)"],
        ["Resistance R", "Ratio of p.d. to current for a component", "ohm (Ω)"],
      ] },
      { t: "key", h: "The moving dots show flow. One dot is <strong>not</strong> one coulomb. Use the meters. Do not count dots or time their journey." },
    ],
  };

  const labs = [
    {
      n: 1, accent: "cyan", title: "Is current used up?",
      spec: "Current and charge; Q = I t; workbook Lesson 2; website Mission 2",
      big: "A resistor gets warm when there is a current in it. Does that mean it uses up some of the current?",
      sections: [
        { icon: "learn", kind: "Predict", title: "Predict before you measure", blocks: [
          { t: "q", say: ["Mia", "The resistor uses up some current. There will be less at B than at A."], p: "Mia makes a claim about the circuit. Do you agree? Explain before measuring.", lines: 2, key: "A prediction, so any reasoned answer. The measurements show Mia is wrong: see question 3." },
        ] },
        { icon: "lab", kind: "Investigate", title: "Test the claim", blocks: [
          { t: "p", h: "Keep the battery at 6 V and the resistor at 10 Ω. Measure at A, at B and on a third wire near the battery. Move only the ammeter probe." },
          { t: "q", p: "Record the current at each position.", table: { head: ["Position", "Current I / A"], rows: [["A", null], ["B", null], ["Third position", null]] }, key: "About 0.60 A at A, at B and at the third position." },
          { t: "q", p: "What do your readings show about current in this single loop? Use numbers in your answer.", lines: 2, key: "The current is the same at every position in the loop, about 0.60 A. It is not used up, so Mia is wrong." },
          { t: "sub", h: "Break and restore the circuit" },
          { t: "p", h: "Open a connection: select a joint and use its cut control (or Delete). Then reconnect it." },
          { t: "q", p: "What happens to the current when the loop is broken?", lines: 2, key: "The current falls to 0 A. Reconnecting the loop restores it to about 0.60 A." },
          { t: "sub", h: "Explain the flow" },
          { t: "p", h: "Switch between <strong>Electrons</strong> and <strong>Conventional</strong>. Look at the wires outside the battery." },
          { t: "q", p: "Complete the sentences.", fill: "Electrons move from the [[negative]] terminal towards the [[positive]] terminal. Conventional current points from [[positive]] towards [[negative]]. Does switching the display change the size of the measured current? [[No]]", key: "Electrons: negative to positive. Conventional current: positive to negative. No, the measured current stays the same." },
          { t: "sub", h: "Explain it to a younger pupil" },
          { t: "q", p: "Rewrite Mia's claim using the words <strong>charge</strong> and <strong>energy</strong>.", starter: "The charge continues around the circuit. In the resistor, energy …", lines: 3, key: "The charge continues around the loop. In the resistor, energy is transferred to the surroundings. The resistor does not use up charge or current." },
        ] },
        { icon: "learn", kind: "Explain", title: "How much charge passes?", aside: "Continue with the same circuit. A current reading describes a rate.", blocks: [
          { t: "p", h: "Current is the charge passing a point each second. For a steady current:" },
          { t: "eq", eq: "Q = I t", words: "charge = current × time", units: "Q in coulombs (C), I in amperes (A), t in seconds (s)", re: "Rearranged: I = Q ÷ t &nbsp; and &nbsp; t = Q ÷ I. One ampere means one coulomb per second." },
          { t: "sub", h: "From a meter reading to an amount" },
          { t: "key", h: "<strong>Example:</strong> if I = 0.60 A, then 0.60 C passes a point each second. In 5.0 s, Q = I × t = 0.60 × 5.0 = 3.0 C." },
          { t: "p", h: "Measure I with a 10 Ω resistor at each battery setting. Calculate the charge passing one point in 10 s and in 20 s. The times are given intervals: no stopwatch is needed." },
          { t: "q", p: "Record the current and calculate the charge.", table: { head: ["Battery setting / V", "Current / A", "Q in 10 s / C", "Q in 20 s / C"], rows: [["3", null, null, null], ["6", null, null, null], ["9", null, null, null]] }, key: "3 V: 0.30 A, 3.0 C, 6.0 C. 6 V: 0.60 A, 6.0 C, 12 C. 9 V: 0.90 A, 9.0 C, 18 C. A higher battery setting gives a larger current." },
          { t: "q", p: "Show one charge calculation, including the unit.", frame: true, key: "For example, 0.60 A for 20 s: Q = I × t = 0.60 × 20 = 12 C." },
          { t: "sub", h: "Think about the rate" },
          { t: "q", p: "Complete the sentences.", fill: "At the same current, doubling the time [[doubles|34]] the charge transferred. For the same time, doubling the current [[doubles|34]] the charge transferred.", key: "Doubles; doubles." },
          { t: "q", p: "If you wait for twice as long, does the current itself have to double? Explain.", lines: 2, key: "No. Current is the charge passing each second. Waiting longer lets more charge pass, but the current stays the same." },
        ] },
        { icon: "exam", kind: "Check", title: "Check your understanding", blocks: [
          { t: "q", p: "A charge of 12 C passes a point in 20 s. Calculate the current.", frame: true, key: "I = Q ÷ t = 12 ÷ 20 = 0.60 A." },
          { t: "q", p: "At 0.30 A, how long does it take for 9.0 C to pass a point?", frame: true, key: "t = Q ÷ I = 9.0 ÷ 0.30 = 30 s." },
          { t: "q", say: ["Sam", "0.60 A means there is 0.60 C in the whole circuit."], p: "Sam makes a claim about the reading. Correct it.", lines: 2, key: "0.60 A means 0.60 C of charge passes a point each second. It is a rate, not the amount of charge in the circuit." },
        ] },
      ],
    },
    {
      n: 2, accent: "copper", title: "What does a volt mean?",
      spec: "Energy per coulomb; E = Q V; workbook Lesson 3; website Missions 3 and 5",
      big: "The current is the same all the way round a loop. So what changes when you turn up the battery?",
      sections: [
        { icon: "learn", kind: "Explain", title: "Energy per coulomb", blocks: [
          { t: "p", h: "Potential difference tells us how much energy is transferred <strong>per coulomb</strong>. A p.d. of 6 V across a resistor means 6 J is transferred electrically to the resistor for every 1 C passing through it." },
          { t: "eq", eq: "E = Q V", words: "energy transferred = charge × potential difference", units: "E in joules (J), Q in coulombs (C), V in volts (V)", re: "Rearranged: V = E ÷ Q &nbsp; and &nbsp; Q = E ÷ V. One volt means one joule per coulomb." },
        ] },
        { icon: "lab", kind: "Investigate", title: "Predict and measure", blocks: [
          { t: "q", p: "Predict: for the same 2 C of charge, will more energy be transferred at 3 V or at 9 V? Why?", lines: 2, key: "At 9 V. Each coulomb transfers more energy (9 J instead of 3 J), so the same 2 C transfers more." },
          { t: "p", h: "Use one 10 Ω resistor. At each battery setting, measure the p.d. across the battery, then across the resistor. Touch the two voltmeter probes to opposite ends of the component. Swap the probes if the reading is negative." },
          { t: "q", p: "Record the readings and calculate the energy transferred by 2 C.", table: { head: ["Battery setting / V", "Battery p.d. / V", "Resistor p.d. / V", "E for 2 C / J"], rows: [["3", null, null, null], ["6", null, null, null], ["9", null, null, null]] }, key: "3 V: about 3 V, about 3 V, 6 J. 6 V: about 6 V, about 6 V, 12 J. 9 V: about 9 V, about 9 V, 18 J. With one resistor, its p.d. is about equal to the battery p.d." },
          { t: "key", h: "Energy is calculated here, not measured by PhET. Use E = V × Q and your <strong>measured</strong> resistor p.d. Small differences from the battery setting are possible." },
          { t: "sub", h: "Explain potential difference" },
          { t: "q", p: "Show the calculation for the 6 V setting.", frame: true, key: "E = V × Q = 6 × 2 = 12 J." },
          { t: "q", p: "Complete the sentences.", fill: "At 9 V, each coulomb transfers [[9|18]] J in a resistor with 9 V across it. At 3 V, each coulomb transfers [[3|18]] J. The amount of charge in this comparison is the same; the [[energy transferred|50]] per coulomb changes.", key: "9; 3; energy transferred." },
          { t: "q", p: "A resistor transfers 24 J when 4 C passes through it. Calculate its p.d.", frame: true, key: "V = E ÷ Q = 24 ÷ 4 = 6 V." },
          { t: "sub", h: "A p.d. needs two points" },
          { t: "q", p: "At 6 V, place both probes on the same piece of wire, then on opposite ends of the resistor.", fill: "Readings: same wire [[about 0|24]] V; resistor [[about 6|24]] V.", key: "Same wire: about 0 V. Across the resistor: about 6 V." },
          { t: "q", p: "Why is “the voltage <em>at</em> the resistor” less precise than “the voltage <em>across</em> it”?", lines: 2, key: "A p.d. is a difference between two points, so the voltmeter needs a probe at each end of the component. “At” names one point; “across” names both ends." },
        ] },
        { page: true, icon: "lab", kind: "Investigate", title: "Follow the energy", aside: "Continue Lab 2. Charge is conserved while energy is transferred.", blocks: [
          { t: "sub", h: "Share the energy between two resistors" },
          { t: "p", h: "Set the battery to 6 V. Add a second 10 Ω resistor in series, so there is still only one loop. Label the resistors R<sub>1</sub> and R<sub>2</sub>." },
          { t: "q", p: "Predict the p.d. across each resistor, and give a reason.", fill: "My prediction: R<sub>1</sub> [[3|22]] V; R<sub>2</sub> [[3|22]] V.", lines: 2, key: "About 3 V across each. The resistors are equal, so they share the battery's 6 V equally." },
          { t: "q", p: "Measure the battery p.d. and the p.d. across each resistor.", table: { head: ["Battery p.d. / V", "R<sub>1</sub> p.d. / V", "R<sub>2</sub> p.d. / V"], rows: [[null, null, null]] }, key: "Battery about 6 V; R<sub>1</sub> about 3 V; R<sub>2</sub> about 3 V. The two resistor p.d.s add up to the battery p.d." },
          { t: "q", p: "Measure the current on either side of R<sub>1</sub>.", fill: "Current before R<sub>1</sub> [[0.30|24]] A; current after R<sub>1</sub> [[0.30|24]] A.", key: "About 0.30 A before and after: the current is the same on both sides." },
          { t: "sub", h: "Account for the energy" },
          { t: "p", h: "Use your voltage readings. Ignore the tiny energy transfer in the wires." },
          { t: "q", p: "Complete the energy account for 2 C of charge.", table: { head: ["Where energy is transferred", "Calculation E = V × Q", "Energy / J"], rows: [["Supplied by the battery", null, null], ["Transferred to R<sub>1</sub>", null, null], ["Transferred to R<sub>2</sub>", null, null]] }, key: "Battery: 6 × 2 = 12 J. R<sub>1</sub>: 3 × 2 = 6 J. R<sub>2</sub>: 3 × 2 = 6 J." },
          { t: "q", p: "Complete the sentences.", fill: "The battery supplies about [[12|18]] J; the two resistors together receive about [[12|18]] J. This supports conservation of [[energy|40]].", key: "12; 12; energy." },
          { t: "q", p: "Why can the current be the same before and after a resistor even though energy is transferred there?", lines: 3, key: "Charge is conserved: the charge leaving the resistor each second equals the charge entering it. The moving charge transfers energy in the resistor; the charge itself is not used up." },
          { t: "sub", h: "Compare two circuits" },
          { t: "p", h: "Return to one resistor. Measure the current and the resistor p.d. in each circuit below. Use the measured p.d. to find the energy transferred per coulomb." },
          { t: "q", p: "Record your readings.", table: { head: ["Circuit settings", "Current / A", "Measured p.d. / V", "Energy per C / J"], rows: [["A: 6 V battery, 10 Ω", null, null, null], ["B: 12 V battery, 20 Ω", null, null, null]] }, key: "A: about 0.60 A, about 6 V, about 6 J per coulomb. B: about 0.60 A, about 12 V, about 12 J per coulomb." },
          { t: "q", p: "Compare the charge passing per second and the energy transferred per coulomb in A and B. Explain why current and p.d. describe different things.", lines: 3, key: "The current is the same (about 0.60 A), so the same charge passes each second. B transfers about 12 J per coulomb, twice as much as A. Current is charge per second; p.d. is energy per coulomb." },
        ] },
      ],
    },
    {
      n: 3, accent: "leaf", title: "Discover the resistance rule",
      spec: "Current, potential difference and resistance; V = I R; workbook Lesson 4; website Mission 4",
      big: "If you know the p.d. across a resistor, can you predict the current before you measure it?",
      sections: [
        { icon: "lab", kind: "Investigate", title: "Predict and collect evidence", blocks: [
          { t: "q", p: "Set R = 10 Ω.", fill: "Predict: if the p.d. doubles, the current will [[double|40]].", key: "Double." },
          { t: "p", h: "Change only the battery setting. Keep the resistor and wires the same. Measure the p.d. across the resistor and the current through the loop at each setting." },
          { t: "q", p: "Record your readings and calculate V ÷ I.", table: { head: ["Battery setting / V", "Resistor p.d. / V", "Current / A", "Calculate V ÷ I / Ω"], rows: [2, 4, 6, 8, 10, 12].map((v) => [String(v), null, null, null]) }, key: "2 V: 0.20 A. 4 V: 0.40 A. 6 V: 0.60 A. 8 V: 0.80 A. 10 V: 1.00 A. 12 V: 1.20 A. The resistor p.d. is about equal to the battery setting, and V ÷ I is 10 Ω every time." },
          { t: "q", p: "Complete the sentences.", fill: "The ratio V ÷ I is approximately [[10|18]] Ω. What component setting does it match? [[the resistance of the resistor|72]]", key: "10 Ω. It matches the resistance set on the resistor." },
        ] },
        { icon: "try", kind: "Analyse", title: "Plot your results", blocks: [
          { t: "q", p: "Plot p.d. on the horizontal axis and current on the vertical axis. Draw a straight line of best fit if your points support it.", graph: { w: 120, h: 60, x: [1, 2], y: [0.2, 1], xLabel: "p.d. / V", yLabel: "current / A" }, key: "The points lie on a straight line from the origin to (12 V, 1.2 A)." },
          { t: "q", p: "Describe the line and whether it passes close to the origin. What does it show about I and V when the resistance stays constant?", lines: 3, key: "A straight line through (or close to) the origin. Current is directly proportional to p.d. when the resistance stays constant: doubling one doubles the other." },
          { t: "eq", eq: "V = I R", words: "potential difference = current × resistance", units: "V in volts (V), I in amperes (A), R in ohms (Ω)", re: "For a fixed resistor at constant temperature." },
        ] },
        { icon: "lab", kind: "Investigate", title: "Design a circuit to order", aside: "Continue Lab 3. Use evidence to choose settings before you test them.", blocks: [
          { t: "sub", h: "Change the resistance" },
          { t: "q", p: "Keep the battery at 6 V. Predict before measuring.", fill: "If the resistance doubles, the current will [[halve|40]].", key: "Halve." },
          { t: "q", p: "Now test these three resistances.", table: { head: ["Resistance R / Ω", "Resistor p.d. / V", "Current / A"], rows: [["5", null, null], ["10", null, null], ["20", null, null]] }, key: "5 Ω: about 6 V, 1.20 A. 10 Ω: about 6 V, 0.60 A. 20 Ω: about 6 V, 0.30 A." },
          { t: "q", p: "What pattern do you find? Keep the p.d. approximately constant in your explanation.", lines: 2, key: "At the same p.d., a larger resistance gives a smaller current. Doubling the resistance halves the current." },
          { t: "key", h: "<strong>Rearrange the rule:</strong> I = V ÷ R and R = V ÷ I. Example: at 6 V with 20 Ω, I = 6 ÷ 20 = 0.30 A." },
          { t: "sub", h: "The design challenge" },
          { t: "p", h: "Design a single-resistor circuit that transfers <strong>18 J</strong> to the resistor while <strong>3.0 C</strong> passes through it in <strong>5.0 s</strong>. Work out the settings before building." },
          { t: "q", p: "Work out each quantity.", table: { head: ["Find", "Equation and working", "Answer with unit"], rows: [["Current I", null, null], ["Resistor p.d. V", null, null], ["Resistance R", null, null]] }, key: "I = Q ÷ t = 3.0 ÷ 5.0 = 0.60 A. V = E ÷ Q = 18 ÷ 3.0 = 6.0 V. R = V ÷ I = 6.0 ÷ 0.60 = 10 Ω. Build it with a 6 V battery and a 10 Ω resistor." },
          { t: "q", p: "Build your design. Choose a battery setting close to your required resistor p.d.", fill: "Measured current [[0.60|22]] A; measured resistor p.d. [[6.0|22]] V. Use those readings to check: Q in 5.0 s = [[3.0|22]] C; E = [[18|22]] J.", key: "About 0.60 A and about 6 V. Q = I × t = 0.60 × 5.0 = 3.0 C. E = V × Q = 6.0 × 3.0 = 18 J." },
          { t: "q", p: "Did your circuit meet the target approximately? Explain any small difference.", lines: 2, key: "Yes. Small differences come from rounding, or from wire and battery resistance that is not exactly zero." },
        ] },
        { icon: "exam", kind: "Check", title: "Exit ticket", blocks: [
          { t: "q", p: "What does a current of 0.40 A mean?", lines: 2, key: "0.40 C of charge passes a point each second." },
          { t: "q", p: "What does a p.d. of 8 V across a resistor mean?", lines: 2, key: "8 J of energy is transferred for each coulomb that passes through the resistor." },
          { t: "q", p: "A 15 Ω resistor has 0.20 A through it. Calculate the p.d. across it.", frame: true, key: "V = I R = 0.20 × 15 = 3.0 V." },
          { t: "q", p: "Which is transferred to the surroundings at a resistor: charge or energy?", lines: 1, key: "Energy." },
        ] },
      ],
    },
  ];

  window.UNIT.labs = { setup, labs };
})();
