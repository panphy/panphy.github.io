window.EXAM_QUESTIONS = [
  {
    section: "Round 1 · Data and uncertainty",
    skill: "Calculation",
    marks: 4,
    stimulus: `
      <table class="data-table">
        <caption>Time for ten oscillations of a pendulum</caption>
        <thead><tr><th>Trial</th><th>Time / s</th></tr></thead>
        <tbody><tr><td>1</td><td>8.72</td></tr><tr><td>2</td><td>8.64</td></tr><tr><td>3</td><td>8.68</td></tr></tbody>
      </table>`,
    prompt: "Calculate the mean time and estimate its uncertainty using half the range. Write the final result in the form mean ± uncertainty.",
    hint: "Find the total and divide by three. Then subtract the minimum from the maximum and halve the result.",
    answer: "<strong>Mean:</strong> (8.72 + 8.64 + 8.68) ÷ 3 = 8.68 s (2 marks).<br><strong>Uncertainty:</strong> (8.72 − 8.64) ÷ 2 = 0.04 s (1 mark).<br><strong>Reported result:</strong> 8.68 ± 0.04 s (1 mark).",
  },
  {
    section: "Round 1 · Data and uncertainty",
    skill: "Errors",
    marks: 3,
    prompt: "A newton meter reads 0.3 N when nothing is attached. A student then obtains three identical force readings. Identify the type of error, explain why repeats do not remove it, and give one suitable improvement.",
    hint: "The instrument has the same offset before every measurement. Think about what should be checked before readings begin.",
    answer: "It is a systematic error (1 mark). Every reading is shifted by the same amount, so repeating and averaging retain the offset (1 mark). Zero or calibrate the newton meter before use, or correct each reading for the measured zero offset (1 mark).",
  },
  {
    section: "Round 1 · Data and uncertainty",
    skill: "Variables",
    marks: 4,
    prompt: "A student investigates how the length of a metal wire affects its extension when a load is attached. State the independent variable, the dependent variable, one control variable and the most suitable graph.",
    hint: "Identify what is changed, what is measured and one other factor that could affect extension. Then classify the variable being changed.",
    answer: "Independent variable: wire length (1 mark). Dependent variable: extension of the wire (1 mark). A valid control is the load, wire material, wire diameter or starting temperature (1 mark). Use a line graph because wire length is continuous (1 mark).",
  },
  {
    section: "Round 1 · Data and uncertainty",
    skill: "Graph choice",
    marks: 4,
    prompt: "A student wraps identical ice cubes in foil, cotton, paper and bubble wrap, then repeats the measurements and calculates a mean melting time. State the most suitable graph and what should be shown on each axis. Explain your graph choice.",
    hint: "The wrapping materials are names rather than values on a continuous scale.",
    answer: "Use a bar chart (1 mark) because wrapping material is a categoric independent variable (1 mark). Put wrapping material on the x-axis (1 mark) and mean melting time, with a suitable time unit, on the y-axis (1 mark).",
  },
  {
    section: "Round 2 · Patterns and evidence",
    skill: "Means and outliers",
    marks: 4,
    stimulus: `
      <table class="data-table">
        <caption>Maximum bounce height on different materials</caption>
        <thead><tr><th>Material</th><th>Trial 1 / cm</th><th>Trial 2 / cm</th><th>Trial 3 / cm</th></tr></thead>
        <tbody><tr><td>Foam</td><td>9</td><td>11</td><td>10</td></tr><tr><td>Felt</td><td>18</td><td>17</td><td>19</td></tr><tr><td>Cardboard</td><td>26</td><td>44</td><td>25</td></tr></tbody>
      </table>`,
    prompt: "Calculate the mean bounce height for the foam. Identify the likely outlier in the full table and state what the student should do before deciding whether to exclude it.",
    hint: "Calculate using only the foam row. Then look for one reading that disagrees strongly with its repeats.",
    answer: "Foam total = 9 + 11 + 10 = 30 cm (1 mark), so mean = 30 ÷ 3 = 10 cm (1 mark). The likely outlier is 44 cm for cardboard (1 mark). Check the recording and method, then repeat that reading before deciding; exclude it only if there is evidence of a problem (1 mark).",
  },
  {
    section: "Round 2 · Patterns and evidence",
    skill: "Conclusion",
    marks: 3,
    stimulus: `
      <table class="data-table">
        <caption>Paper parachute results</caption>
        <thead><tr><th>Canopy area / cm²</th><th>Mean fall time / s</th></tr></thead>
        <tbody><tr><td>100</td><td>1.2</td></tr><tr><td>200</td><td>1.8</td></tr><tr><td>300</td><td>2.4</td></tr><tr><td>400</td><td>3.0</td></tr></tbody>
      </table>`,
    prompt: "Write a conclusion for this investigation. Use quantitative evidence from the table.",
    hint: "State the direction of the relationship, then compare two results with units.",
    answer: "As canopy area increases, mean fall time increases (1 mark). For example, increasing area from 100 cm² to 400 cm² increased mean fall time from 1.2 s to 3.0 s (2 marks for a correct quantitative comparison with units).",
  },
  {
    section: "Round 2 · Patterns and evidence",
    skill: "Best fit",
    marks: 5,
    stimulus: `
      <table class="data-table">
        <caption>Pendulum results</caption>
        <thead><tr><th>Pendulum length / cm</th><th>Time period / s</th></tr></thead>
        <tbody><tr><td>20</td><td>0.9</td></tr><tr><td>40</td><td>1.3</td></tr><tr><td>60</td><td>2.7</td></tr><tr><td>80</td><td>1.8</td></tr><tr><td>100</td><td>2.1</td></tr></tbody>
      </table>`,
    prompt: "State what should be plotted on each graph axis, identify the likely outlier, and describe how the student should draw a suitable line of best fit.",
    hint: "The independent variable belongs on x. Look for the point that breaks the overall pattern. A best-fit line is not dot-to-dot.",
    answer: "x-axis: pendulum length / cm (1 mark). y-axis: time period / s (1 mark). The likely outlier is (60 cm, 2.7 s) (1 mark). Draw one smooth curve or straight trend appropriate to the other points, with points reasonably balanced around it (1 mark), rather than joining points dot-to-dot or forcing the line through the outlier (1 mark).",
  },
  {
    section: "Round 2 · Patterns and evidence",
    skill: "Graph choice",
    marks: 4,
    prompt: "Investigation A changes a load from 50 g to 250 g and measures spring extension. Investigation B compares the friction force produced by four shoe-sole materials. State the best graph for each investigation and justify both choices.",
    hint: "Classify each independent variable: measured numerical values or named groups.",
    answer: "Investigation A needs a line graph (1 mark) because load is continuous (1 mark). Investigation B needs a bar chart (1 mark) because shoe-sole material is categoric (1 mark).",
  },
  {
    section: "Round 3 · Planning and evaluation",
    skill: "Method",
    marks: 6,
    prompt: "Plan an investigation to determine how the release height of a trolley on a fixed ramp affects the time it takes to travel a marked 1.0 m section after leaving the ramp. Your method should produce valid, reliable and safe results.",
    hint: "Include a range of heights, a fixed distance, a fair release, controls, repeats, processing and a relevant safety step.",
    answer: "Indicative marking points: use at least five measured release heights over a sensible range; mark a fixed 1.0 m timing section after the ramp; release the trolley without pushing, ideally with a gate; time the section using light gates or a consistent stopwatch method; keep the trolley, fixed ramp, surface and timing distance controlled; repeat at least three times at each height and calculate a mean; keep the run area clear and stop the trolley safely. Award up to 6 marks for a coherent, repeatable method.",
  },
  {
    section: "Round 3 · Planning and evaluation",
    skill: "Evaluation",
    marks: 4,
    prompt: "A student launches a paper aeroplane by hand and measures its flight distance. The evaluation says only, ‘There was human error.’ Explain the specific problem, its likely effect, a matching improvement and one way to improve reliability.",
    hint: "Would every hand launch give exactly the same speed and angle? Replace the variable action with something repeatable.",
    answer: "Hand launches vary in force, speed and angle (1 mark), causing random variation in flight distance and making comparisons less fair (1 mark). Use a mechanical or elastic launcher set to the same extension and angle each time (1 mark). Repeat each condition at least three times and calculate a mean (1 mark).",
  },
  {
    section: "Round 3 · Planning and evaluation",
    skill: "Precision",
    marks: 4,
    stimulus: `
      <table class="data-table">
        <caption>Two groups measuring the same length</caption>
        <thead><tr><th>Group</th><th>Trial 1 / cm</th><th>Trial 2 / cm</th><th>Trial 3 / cm</th></tr></thead>
        <tbody><tr><td>A</td><td>48.2</td><td>48.4</td><td>48.3</td></tr><tr><td>B</td><td>47.8</td><td>48.8</td><td>48.3</td></tr></tbody>
      </table>`,
    prompt: "Calculate the half-range uncertainty for each group and decide which group produced the more precise measurements.",
    hint: "For each row, subtract the minimum from the maximum and divide by two. Smaller spread means greater precision.",
    answer: "Group A: (48.4 − 48.2) ÷ 2 = ±0.1 cm (1 mark). Group B: (48.8 − 47.8) ÷ 2 = ±0.5 cm (1 mark). Group A is more precise (1 mark) because its uncertainty/spread is smaller (1 mark).",
  },
  {
    section: "Round 3 · Planning and evaluation",
    skill: "Evidence and reliability",
    marks: 5,
    stimulus: `
      <table class="data-table">
        <caption>Temperature rise in a model solar oven</caption>
        <thead><tr><th>Inside surface</th><th>Temperature rise / °C</th></tr></thead>
        <tbody><tr><td>Black card</td><td>24</td></tr><tr><td>White card</td><td>9</td></tr><tr><td>Foil</td><td>14</td></tr></tbody>
      </table>`,
    prompt: "The student concludes that black card is the best surface for the solar oven. Evaluate this conclusion and describe how the evidence could be made more reliable.",
    hint: "Use the values to judge the claim, then notice how many readings were collected for each surface.",
    answer: "The conclusion is supported because black card produced the greatest temperature rise, 24 °C (1 mark), compared with 14 °C for foil and 9 °C for white card (1 mark). However, only one reading appears to have been collected for each surface, so random variation cannot be judged (1 mark). Repeat each surface at least three times under the same conditions (1 mark) and compare calculated mean temperature rises (1 mark).",
  },
];
