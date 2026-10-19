/* Lessons 6 and 7-8 of the Work Like a Physicist workbook (assets/workbook.js): Part 3.
   Lessons 7-8 are one entry (n: 7, last: 8). Same marks as lessons-a.js. Sample helicopter
   results are the deck's: wing length 4 to 8 cm, mean fall time 1.10 to 1.88 s. */
(function () {
  "use strict";

  const F = window.WLPFigures;
  const HELI = [["4", "1.08", "1.13", "1.09", "1.10"], ["5", "1.30", "1.35", "1.31", "1.32"], ["6", "1.52", "1.47", "1.51", "1.50"], ["7", "1.70", "1.74", "1.69", "1.71"], ["8", "1.86", "1.91", "1.87", "1.88"]];
  const sampleTable = `<table class="data sample"><tr><th>Wing length / cm</th><th>Fall time 1 / s</th><th>Fall time 2 / s</th><th>Fall time 3 / s</th><th>Mean fall time / s</th></tr>${HELI.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</table>`;
  const CC = "{{continuous|categoric}}";

  const lessons = [
    // ============================================================ 6
    {
      n: 6, accent: "cyan", title: "Solo flight", practical: true, practicalName: "Paper helicopter, on your own",
      spec: "AQA Working scientifically WS 2.2, 2.7, 3.1 · Physics and Combined Science",
      mapLine: "The whole process on your own: plan, table, graph, prediction, evaluation",
      big: "Can you run a whole investigation with nobody telling you what to do next?",
      goals: ["identify all three types of variable on your own", "design your own results table with units", "collect three trials for each of five values and calculate means", "plot a graph with a best-fit line and read a prediction from it", "write a conclusion and an evaluation using your own numbers"],
      keywords: ["plan", "prediction", "range", "evaluation", "improvement"],
      story: { year: 2021, title: "A helicopter on Mars", text: "In April 2021 the small helicopter Ingenuity flew on Mars, where the air is about 1% as dense as Earth's. The engineers could not just try it and see. They pumped air out of a chamber until it was as thin as on Mars, then changed one thing about the rotors at a time, measured the lift and plotted the results.", punch: "This one is on you. Booklet, ruler, brain." },
      doNow: [
        ["An anomalous result with no cause found should be [[kept, circled and reported|deleted / kept, circled and reported]].", "kept, circled and reported (and left out of the best-fit line)"],
        ["A best-fit line should have the points [[balanced above and below it|all on it / balanced above and below it]].", "balanced above and below it"],
        ["Write a conclusion for: 5 cm ramp → 20 cm; 25 cm ramp → 80 cm.", "As the ramp height increased, the distance increased, from 20 cm at 5 cm to 80 cm at 25 cm."],
      ],
      learnTitle: "Before you start",
      learn: [
        { t: "split", cls: "narrow-fig", left: [
          { t: "p", h: "Your question: <strong>How does wing length affect the fall time of a paper helicopter?</strong> If your teacher agrees, you could change the number of paperclips or the drop height instead." },
          { t: "compare", head: ["Plan", "Think about"], rows: [
            ["Range", "From 4 cm to 8 cm: five lengths. Very short wings barely spin; very long wings flop."],
            ["Prediction", "Longer wings push against more air, so air resistance is larger and the helicopter falls more slowly. A reason turns a guess into a prediction."],
            ["Timing", "The same person times every drop. Drop from as high as you safely can: a longer fall makes your reaction time a smaller part of each time."],
          ] },
        ], right: [{ t: "fig", h: F.helicopter() }] },
        { t: "sub", h: "Read between the points" },
        { t: "split", left: [
          { t: "p", h: "A best-fit line lets you predict a value you did not test. Read <strong>up</strong> from the x-axis to the line, then <strong>across</strong> to the y-axis, and leave your ruled lines on the graph." },
          { t: "p", h: "A prediction is most trustworthy <strong>inside the range</strong> you tested: 6.5 cm sits between results at 6 cm and 7 cm. For 12 cm you would have to assume the pattern carries on. It may not: very long wings bend and stop spinning." },
        ], right: [{ t: "fig", h: F.readGraph() }] },
        { t: "sub", h: "Evaluate: problem → effect → fix" },
        { t: "compare", head: ["Problem", "Effect", "Fix"], rows: [
          ["Reaction time starting and stopping the stopwatch", "fall times are scattered (random error); short falls are hit hardest", "film the drop and time it from the video, or drop from higher"],
          ["A draught from a door or window", "some drops drift and take longer", "close windows and doors; drop away from them"],
        ] },
        { t: "key", h: "<strong>Put a number on the problem.</strong> A reaction time is about 0.2 s. On the shortest fall, 1.10 s, that is nearly a fifth of the measurement; on the longest, 1.88 s, about a tenth. So make the error smaller (video) or the measurement bigger (a higher drop). “Be more careful” is not an improvement: name the equipment and the problem it solves." },
      ],
      lab: { title: "Plan before you cut anything", aside: "Assessed. Work on your own.", blocks: [
        { t: "lab", blocks: [
          { t: "vars", cls: "tall", rows: [
            ["My research question", "", "How does wing length affect the fall time of a paper helicopter?"],
            ["Independent variable (and unit)", "", "wing length / cm"],
            ["Dependent variable (and unit)", "", "fall time / s"],
            ["Three control variables", "", "same paper; same number of paperclips; same drop height (also: same person timing, same release)"],
            ["The independent variable is", CC.replace("continuous", "continuous*")],
            ["My graph will be a", "{{line graph*|bar chart}} because"],
            ["The five values I will test", "", "4, 5, 6, 7 and 8 cm"],
          ] },
          { t: "safety", items: ["Never climb on chairs, stools or benches to gain height. Use a height you can reach standing on the floor, the same every time.", "Take care with scissors.", "Keep the landing zone clear."] },
        ] },
      ] },
      lab2: { title: "Design your table, then fly and record", aside: "Assessed. Nothing is printed for you on purpose.", blocks: [
        { t: "lab", blocks: [
          { t: "p", h: "Draw your own results table. A good table has a column for the independent variable, three trial columns, a mean column, and units in every heading." },
          { t: "q", p: "My results table:", box: 72, a: sampleTable },
          { t: "key", h: "<strong>If a drop goes wrong</strong> (it hits a desk, a draught catches it, someone knocks your arm), note it and take that trial again. A discarded trial with a written reason is honest. A quietly deleted one is not." },
          { t: "q", p: "Any trials you repeated, and why:", lines: 2, a: "e.g. 6 cm, trial 2: the helicopter hit the bench, so I noted it and dropped it again." },
        ] },
      ] },
      tryTitle: "Graph, conclude, predict",
      tryAside: "Assessed.",
      try: [
        { t: "q", p: "Graph your results: title, axes, units, scale, accurate crosses, best-fit line, anomalous results noted.", graph: { w: 110, h: 100, blank: true, x: [1, 1], y: [0.2, 1], xLabel: "Wing length / cm", yLabel: "Mean fall time / s", points: [[4, 1.10], [5, 1.32], [6, 1.50], [7, 1.71], [8, 1.88]], fit: [[3.4, 0.996], [8.6, 2.016]], guide: [6.5, 1.6] } },
        { t: "q", p: "Your conclusion.", after: [
          { t: "vars", cls: "tall", rows: [
            ["As the wing length increased, the fall time…", "{{increased*|decreased|stayed the same}}"],
            ["Evidence: two values from my results, with units", "", "at 4 cm, 1.10 s; at 8 cm, 1.88 s (sample)"],
            ["Possible anomalous result (or “none”)", "", "none: all points lie close to the line (sample)"],
          ] },
        ] },
        { t: "q", p: "Make a prediction from your best-fit line for a wing length you did <strong>not</strong> test, inside your range. Show your reading on the graph.", after: [
          { t: "vars", rows: [["Wing length I did not test", "", "6.5 cm (sample)"], ["Fall time read from my line", "", "about 1.6 s"]] },
        ] },
        { t: "q", p: "Mark yourself. Be strict: this is the list your teacher will use.", after: [
          { t: "checks", title: "Success criteria", head: ["Not yet", "Done"], items: ["Independent, dependent and control variables all identified", "Table designed by me, with units in every heading", "Three trials for every value of the independent variable", "Means calculated correctly", "Correct graph type, with a reason given", "Axes labelled, units shown, sensible scale", "Best-fit line rather than dot-to-dot", "Anomalous results identified, or their absence stated", "Conclusion quotes evidence from my own results"] },
        ] },
      ],
      exam: [
        { tip: "Compare the size of the error with the size of the measurement.", p: "A student times paper helicopters falling. Human reaction time is about 0.2 s. Explain why reaction time matters more for a short fall than for a long one.", marks: 2, lines: 2, a: "The reaction time is about the same for every fall (1), so it is a bigger fraction of a short fall time (1)." },
        { p: "The student tested wing lengths from 4 cm to 8 cm. Which prediction from the best-fit line is most trustworthy? Tick <strong>one</strong> box.", marks: 1, mcq: { o: ["the fall time for 2 cm wings", "the fall time for 6.5 cm wings", "the fall time for 12 cm wings"], c: 1, cols: 3 } },
        { p: "Suggest <strong>one</strong> improvement to the way the fall time is measured, and say how it helps.", marks: 2, lines: 2, a: "Film the fall and time it from the video / use a greater drop height (1); this removes the reaction time / makes the reaction time a smaller fraction of the time (1)." },
      ],
      home: { title: "Take it home: evaluation practice", blocks: [
        { t: "p", h: "Write about your investigation. You will need all four in the project that starts next lesson." },
        { t: "vars", cls: "tall", rows: [["One strength of my method", "", "three trials at every wing length, with the same timer"], ["One weakness", "", "timing by hand: reaction time is a big part of a short fall"], ["One possible random error", "", "reaction time starting and stopping the stopwatch"], ["One improvement I would actually make", "", "film the drops and time them from the video"]] },
      ] },
      summary: ["Plan first: three types of variable, the range of values, and a reason for your prediction.", "Your table: independent variable first, three trials and a mean, units in every heading.", "Predictions from a best-fit line are most trustworthy inside the range tested.", "Evaluate as problem → effect → fix. Name the equipment, never just “be more careful”."],
      recall: [["Name three control variables for the helicopter.", "Drop height, type of paper, number of paperclips."], ["Heading for the mean column?", "Mean fall time / s"], ["A drop hits a chair. What now?", "Note the reason, then repeat that drop."], ["Where is a prediction most trustworthy?", "Inside the range of the data."]],
      cando: ["plan an investigation on my own", "design my own results table", "read a prediction from a best-fit line", "evaluate a method as problem, effect and fix"],
    },

    // ============================================================ 7-8
    {
      n: 7, last: 8, name: "Lessons 7–8", accent: "copper", title: "Your investigation", practical: true, practicalName: "Your own, from a shared set of equipment",
      spec: "AQA Working scientifically WS 1.6, 2.1, 2.7, 3.8 · Physics and Combined Science",
      mapLine: "Design, run, graph and defend your own investigation, in a pair or a three",
      big: "Can you produce a result that nobody, including you, can break?",
      goals: ["write a testable question in the form “How does X affect Y?”", "plan a safe, fair investigation and get it approved", "collect repeated measurements and calculate means", "choose and draw the right graph for your own data", "write a conclusion backed by evidence and an honest evaluation"],
      keywords: ["testable question", "method", "fair test", "evaluation", "peer review"],
      story: { year: 2015, title: "Trying to prove themselves wrong", text: "Two LIGO detectors about 3000 km apart picked up the same signal: two black holes colliding a billion light years away. A passing lorry could shake one detector, but not both in the same way at almost the same moment. Even so, the team spent five months attacking their own result before announcing it.", punch: "Your job: produce a result you cannot break." },
      doNow: [
        ["Give the heading for a column of fall times measured in seconds, trial 1.", "Fall time 1 / s (or Trial 1 / s)"],
        ["“Human error” earns no marks. Improve: “There was human error with the stopwatch.”", "e.g. Reaction time starting and stopping the stopwatch varied, so the times were scattered (random error)."],
        ["A prediction from a best-fit line is most trustworthy [[inside|inside / outside]] the range of the data.", "inside"],
      ],
      learnTitle: "The rules",
      learn: [
        { t: "fig", h: F.cycle() },
        { t: "split", left: [
          { t: "list", items: ["Work in a pair or a three.", "Ask one question: “How does X affect Y?”", "Change <strong>one</strong> independent variable.", "Measure <strong>one</strong> dependent variable.", "Keep at least three control variables the same."] },
        ], right: [
          { t: "list", items: ["Test four or five values or categories.", "Take three trials of each, and calculate a mean.", "Choose the correct graph type.", "Write a conclusion <strong>and</strong> an evaluation.", "<strong>No teacher signature, no equipment.</strong>"] },
        ] },
        { t: "p", h: "<strong>The reasons behind the numbers.</strong> One independent variable, so there is only one possible cause. Three or more controls, because several things could change the result. Four or five values, because fewer cannot show the shape of a pattern. Three trials, so you can spot a reading that is badly out. And the sign-off: a flaw in the plan is free to fix on paper; found afterwards, the results cannot be used." },
        { t: "sub", h: "Questions that work" },
        { t: "compare", plainFirst: true, head: ["Research question", "Independent variable", "Graph"], rows: [
          ["How does ramp height affect the distance travelled by a trolley?", "ramp height", "line"],
          ["How does wing length affect the fall time of a paper helicopter?", "wing length", "line"],
          ["How does surface type affect the distance travelled by a toy car?", "surface type", "bar"],
          ["How does material affect the bounce height of a ball?", "material", "bar"],
          ["How does the number of elastic bands affect launch distance?", "number of bands", "line"],
        ] },
        { t: "model", title: "A conclusion and evaluation that would score well", h: "“As wing length increased, mean fall time increased: at 4 cm it was 1.10 s and at 8 cm it was 1.88 s. A weakness was timing by hand: reaction time varied, so the times were scattered. I would film the drops and time them from the video.” <strong>How confident?</strong> Compare the change you found with the scatter in your readings: a rise of 0.78 s, with trials agreeing to within 0.05 s, is convincing." },
      ],
      tryTitle: "Choose a question that will work",
      try: [
        { t: "q", p: "These questions would waste your two lessons. Draw a ring around what is wrong with each one.", ring: [
          ["“What is the best paper helicopter?”", ["too vague", "too many dependent variables", "hard to control"], 0],
          ["“How does height affect it?”", ["dependent variable unclear", "hard to control", "too many dependent variables"], 0],
          ["“How does surface affect speed and distance and time?”", ["too vague", "too many dependent variables", "hard to control"], 1],
          ["“How does throwing force affect distance?”", ["dependent variable unclear", "too many dependent variables", "hard to control"], 2],
        ] },
        { t: "q", p: "Repair one of them. Write it in the form “How does X affect Y?”", lines: 1, a: "e.g. “How does ramp height affect the distance travelled by a toy car?” (you can set a ramp height exactly; you cannot throw with the same force twice)." },
      ],
      lab: { title: "Plan (Lesson 7)", aside: "Stop at the teacher checkpoint.", blocks: [
        { t: "lab", title: "Planning grid", blocks: [
          { t: "vars", cls: "tall", rows: [["Our research question", ""], ["Group members", ""], ["Independent variable (and unit)", ""], ["Dependent variable (and unit)", ""], ["The independent variable is", CC], ["Graph we will use, and why", "{{line graph|bar chart}} because"], ["At least three control variables", ""], ["Values or categories we will test (4–5)", ""], ["Equipment we need", ""], ["Safety risks, and how we will reduce them", ""]] },
        ] },
        { t: "lab", title: "Write your method", blocks: [
          { t: "q", p: "Numbered steps that someone from another class could follow without asking you a single question. Include how many trials you will take and how you will keep the control variables the same.", lines: 10, a: "Look for: set-up; how the independent variable is changed; how the dependent variable is measured; three trials for each value; how each control is kept the same; safety steps." },
        ] },
        { t: "lab", title: "Teacher checkpoint", blocks: [
          { t: "warn", h: "<strong>Stop here.</strong> Do not collect any data until your teacher has signed this box. In a real lab, no experiment runs without approval." },
          { t: "checks", title: "Checked by your teacher", head: ["✓"], items: ["Question is clear and testable", "Independent variable is clear", "Dependent variable is measurable", "Control variables are realistic", "Method is safe", "Equipment is available", "Repeats are included", "Graph choice is sensible"] },
          { t: "vars", rows: [["Approved by", ""], ["Date", ""]] },
        ] },
      ] },
      lab2: { title: "Collect (Lesson 7)", aside: "Record results the moment you take them.", blocks: [
        { t: "lab", title: "Results table", blocks: [
          { t: "p", h: "Write your own headings in the top row, with units. If your independent variable is categoric, the first heading is the category name: “Surface type”, “Material”." },
          { t: "table", head: ["", "", "", "", ""], rh: 11, rows: [[null, null, null, null, null], [null, null, null, null, null], [null, null, null, null, null], [null, null, null, null, null], [null, null, null, null, null], [null, null, null, null, null]] },
          { t: "q", p: "Show one mean calculation in full.", lines: 1, a: "e.g. (12.2 + 12.4 + 11.8) ÷ 3 = 36.4 ÷ 3 = 12.1" },
        ] },
        { t: "lab", title: "Lab notes", blocks: [
          { t: "p", h: "Write down anything a reader would want to know, as it happens: equipment that misbehaved, a trial you repeated, a control variable that slipped, a surprise. You will not remember it next lesson, and your evaluation comes from here." },
          { t: "q", p: "Our lab notes:", lines: 7 },
        ] },
        { t: "lab", title: "End of Lesson 7", blocks: [
          { t: "vars", rows: [["Our independent variable is", CC], ["One control variable we really did keep the same", ""], ["One result we may need to check next lesson", ""]] },
        ] },
      ] },
      flow: ["doNow", "learn", "try", "lab", "lab2",
        { sec: "lab", title: "Graph (Lesson 8)", aside: "Decide before you draw.", blocks: [
          { t: "lab", blocks: [
            { t: "vars", rows: [["Our independent variable is", CC], ["So our graph is a", "{{line graph|bar chart}}"], ["On the x-axis", ""], ["On the y-axis", ""], ["Largest mean, and the value of each big square on the y-axis", ""]] },
          ] },
          { t: "lab", title: "Draw your graph", blocks: [
            { t: "graph", w: 150, h: 110, blank: true, x: [1, 1], y: [1, 1] },
            { t: "p", h: "Crosses and a best-fit line for a line graph. Equal bars with gaps for a bar chart. Title, labels and units either way." },
          ] },
        ] },
        { sec: "try", title: "Conclude and evaluate (Lesson 8)", aside: "Assessed. This is where the marks hide.", blocks: [
          { t: "q", p: "Interrogate your own results.", after: [
            { t: "vars", cls: "tall", rows: [["The pattern: the dependent variable…", "{{increases|decreases|stays about the same}}"], ["The pattern is", "{{strong and clear|weak and scattered}} because"], ["Possible anomalous results (or “none”)", ""], ["The one number a doubter would find hardest to argue with", ""]] },
          ] },
          { t: "q", p: "Conclusion. Use the frame that matches your graph.", after: [
            { t: "vars", cls: "tall", rows: [["Line graph: As … increased, …", ""], ["Bar chart: The highest (or lowest) … was …", ""], ["I know this because (two values with units)", ""], ["This suggests that…", ""]] },
          ] },
          { t: "q", p: "Evaluation. Name the actual thing, never just “human error”.", after: [
            { t: "vars", cls: "tall", rows: [["One strength of our method", ""], ["One weakness of our method", ""], ["One possible random error", ""], ["One possible systematic error", ""], ["An improvement that fixes a weakness", ""]] },
          ] },
          { t: "q", p: "How confident are you in your conclusion, and what would make you more confident?", lines: 2, a: "Tie it to the evidence: how big the change is compared with the scatter of the repeats; ways to improve: more repeats, more values, better resolution, another group repeating it." },
        ] },
        { sec: "try", title: "Peer review (Lesson 8)", aside: "Their job is to find the weakness you missed.", blocks: [
          { t: "checks", title: "Feature", head: ["✓"], items: ["Question uses “How does X affect Y?”", "All three types of variable named", "Results table has units in the headings", "Three trials, means calculated", "Right graph for the independent variable", "Labels, units, scale, accurate crosses or bars", "Best fit line drawn; anomalous results dealt with", "Conclusion quotes numbers", "Evaluation names an improvement"] },
          { t: "vars", rows: [["Reviewed by", ""], ["The strongest part of this investigation", ""], ["The question I would ask this group", ""]] },
          { t: "q", type: "Challenge", p: "Compare your results with another group who investigated something similar. Do you agree? If not, what could explain the difference?", lines: 2, a: "Compare numbers; explain differences by equipment, a control variable, resolution or a systematic error." },
          { t: "q", type: "Challenge", p: "Is your relationship a straight line or a curve? Is it directly proportional? {{yes|no}} How can you tell?", lines: 2, a: "Directly proportional only if the best-fit line is straight and passes through the origin." },
        ] },
        "exam", "home", "revise"],
      exam: [
        { tip: "Think about what you can and cannot see with only a few points.", p: "A group investigates how the mass of a ball affects how far it rolls. They test only two masses. Explain why this is not enough.", marks: 2, lines: 2, a: "Two points can always be joined by a straight line (1), so they cannot show whether the pattern is straight or curved / test four or five masses (1)." },
        { p: "Two groups in different schools do the same investigation with their own equipment and get similar results. Complete the sentence.", marks: 1, fill: "The results are {{repeatable|reproducible*|anomalous}}" },
        { p: "Suggest why a teacher checks the plan before any equipment is used.", marks: 1, lines: 1, a: "A flaw is easy to fix on paper, before time is spent collecting results that cannot be used / to check that the method is safe (1)." },
      ],
      home: { title: "Take it home: individual reflection", blocks: [
        { t: "p", h: "Answer on your own, not as a group: your teacher wants your view." },
        { t: "vars", cls: "tall", rows: [["What did your group investigate, and what did your graph show?", ""], ["What did you personally contribute?", ""], ["The hardest part of the unit, and what you would tell next year's Year 9", ""], ["The first objection a stranger would raise to your conclusion", "", "e.g. “Three trials is not many” or “How do you know the timer was accurate?”"]] },
      ] },
      summary: ["A testable question: “How does X affect Y?”, with one independent and one dependent variable.", "Plan, then teacher sign-off, before any equipment.", "Four or five values, three trials each, a mean; record as you go.", "Conclude with numbers; evaluate with a strength, a weakness, named errors and a matching fix."],
      recall: [["What form should a research question take?", "How does X affect Y?"], ["Why test four or five values?", "Fewer cannot show the shape of a pattern."], ["Repeatable or reproducible: another school gets the same results?", "Reproducible."], ["What must happen before you collect data?", "The teacher signs off the plan."]],
      cando: ["write a testable research question", "plan a fair, safe investigation", "collect, record and process my own data", "draw the right graph and defend my conclusion"],
    },
  ];

  window.UNIT_LESSONS = (window.UNIT_LESSONS || []).concat(lessons);
})();
