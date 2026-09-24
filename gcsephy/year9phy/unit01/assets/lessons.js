window.LESSONS = [
  {
    slug: "trust-the-data",
    number: "01",
    shortTitle: "Trust the data?",
    title: "Can this data be trusted?",
    mission: "Become a measurement detective",
    intro:
      "Every measurement has doubt hiding inside it. Learn to spot random and systematic errors, calculate uncertainty and explain why precise does not always mean accurate.",
    colour: "lime",
    icon: "±",
    unlocks: ["precision vs accuracy", "half-range uncertainty", "random & systematic error"],
    keyRule: "Uncertainty = (maximum − minimum) ÷ 2",
    revision: {
      pageStart: 4,
      pageRange: "4–8",
      summary:
        "Measurements are evidence only when you can explain their spread, their limits and the errors that may have shifted them.",
      sections: [
        {
          title: "Precision and accuracy answer different questions",
          paragraphs: [
            "Precision describes how close repeated readings are to each other. Accuracy describes how close a measurement is to the true value.",
            "A set can be precise but inaccurate: tightly grouped readings may all be shifted by the same systematic fault.",
          ],
          points: [
            "Precise: repeats form a tight group.",
            "Accurate: the result is close to the accepted or true value.",
            "Repeats help you judge precision; they do not prove accuracy.",
          ],
          remember: "Consistent does not automatically mean correct.",
        },
        {
          title: "Calculate the mean and the uncertainty",
          paragraphs: [
            "Use repeated readings to calculate a mean, then use half the range as an estimate of uncertainty.",
          ],
          points: [
            "Mean = total of the readings ÷ number of readings.",
            "Range = largest reading − smallest reading.",
            "Uncertainty = range ÷ 2.",
            "Write the final result as mean ± uncertainty, with a unit.",
          ],
          formula: "1.20 s, 1.25 s, 1.22 s → mean = 1.22 s; uncertainty = 0.03 s; result = 1.22 ± 0.03 s",
        },
        {
          title: "Random and systematic errors need different fixes",
          paragraphs: [
            "Random error scatters readings unpredictably. More repeats and a mean reduce its effect. Systematic error shifts every reading in the same direction, so repeating the same faulty method does not remove it.",
          ],
          points: [
            "Random example: reaction time varies when using a stopwatch.",
            "Systematic example: a balance reads 0.2 g when empty.",
            "Improve random error with repeats or more objective measurement.",
            "Find systematic error by checking zero, calibration, alignment and method.",
          ],
          remember: "Name the mechanism. ‘Human error’ is too vague to earn marks.",
        },
        {
          title: "Resolution limits what an instrument can show",
          paragraphs: [
            "Resolution is the smallest change an instrument can detect. A stopwatch reading to 0.01 s cannot provide information about a 0.001 s change.",
          ],
          points: [
            "Better resolution gives finer readings.",
            "Better resolution does not remove a systematic fault.",
            "Always state the quantity and unit when describing a measurement.",
          ],
          remember: "In an explanation, link the error to its effect and then to a matching improvement.",
        },
      ],
      vocabulary: [
        ["Precision", "How close repeated measurements are to each other."],
        ["Accuracy", "How close a measurement is to the true value."],
        ["Uncertainty", "An estimate of the doubt attached to a measurement."],
        ["Resolution", "The smallest change an instrument can detect."],
      ],
    },
    questions: [
      {
        type: "Practice",
        prompt:
          "A student records 2.31 s, 2.47 s and 2.38 s. Calculate the mean and the uncertainty.",
        hint: "Add the three values and divide by 3. For uncertainty, find half the range.",
        answer:
          "Mean = (2.31 + 2.47 + 2.38) ÷ 3 = 2.39 s (to 2 d.p.). Range = 2.47 − 2.31 = 0.16 s, so uncertainty = 0.08 s. Report: 2.39 ± 0.08 s.",
      },
      {
        type: "Practice",
        prompt:
          "Three readings are tightly grouped but all are 5 cm above the true value. Are they precise, accurate, both or neither? Explain.",
        hint: "Precise describes how close repeats are to each other. Accurate describes closeness to the true value.",
        answer:
          "They are precise because the repeats are close together, but not accurate because they are all far from the true value. A systematic error could have shifted every reading.",
      },
      {
        type: "AQA-style",
        marks: 4,
        prompt:
          "A stopwatch gives 1.84 s, 1.91 s and 1.87 s. Calculate the mean time and estimate the uncertainty using half the range. Give both answers to 2 decimal places.",
        hint: "Mean = total ÷ number of readings. Uncertainty = (largest − smallest) ÷ 2.",
        answer:
          "Mean = 5.62 ÷ 3 = 1.87 s (2 marks). Uncertainty = (1.91 − 1.84) ÷ 2 = 0.035 s, which rounds to 0.04 s (2 marks). Final result: 1.87 ± 0.04 s.",
      },
      {
        type: "AQA-style",
        marks: 4,
        prompt:
          "A student times a trolley by hand. Explain one source of random error and describe one improvement that would reduce it.",
        hint: "Name the mechanism, not just ‘human error’. Think about starting and stopping the timer.",
        answer:
          "The student’s reaction time varies each time they start or stop the stopwatch, so the measured times vary unpredictably (2 marks). Use light gates connected to an electronic timer so timing starts and stops at fixed positions without reaction-time delay (2 marks).",
      },
    ],
  },
  {
    slug: "variables-and-graphs",
    number: "02",
    shortTitle: "Variables & graphs",
    title: "What are you actually changing?",
    mission: "Decode any investigation",
    intro:
      "Name the thing you change, the thing you measure and what must stay the same. Then let the independent variable choose the graph.",
    colour: "cyan",
    icon: "x→y",
    unlocks: ["independent variables", "continuous vs categoric", "line graph or bar chart"],
    keyRule: "Continuous independent variable → line graph. Categoric independent variable → bar chart.",
    revision: {
      pageStart: 9,
      pageRange: "9–11",
      summary:
        "A fair investigation changes one thing, measures one thing and keeps every other important factor as constant as possible.",
      sections: [
        {
          title: "Identify all three variables",
          paragraphs: [
            "The independent variable is deliberately changed. The dependent variable is measured. Control variables are the other factors kept the same so they cannot provide a rival explanation.",
          ],
          points: [
            "Independent = I change.",
            "Dependent = I measure.",
            "Control = I keep the same.",
            "A good answer names the quantity clearly and includes a unit when appropriate.",
          ],
          remember: "If two important variables change together, you cannot tell which caused the result.",
        },
        {
          title: "Sort the independent variable",
          paragraphs: [
            "Continuous data can take any value on a numerical scale, including values between the ones tested. Categoric data consists of names, types or groups.",
          ],
          points: [
            "Continuous: length, time, temperature and mass.",
            "Categoric: material, colour, brand and surface type.",
            "Ask whether a meaningful value exists between two examples.",
          ],
        },
        {
          title: "Let the independent variable choose the graph",
          paragraphs: [
            "Use a line graph for a continuous independent variable and a bar chart for a categoric independent variable.",
          ],
          points: [
            "Line graph: values go on a scale and a trend between points is meaningful.",
            "Bar chart: categories stay separate, so bars have gaps.",
            "The dependent variable is usually numerical in both cases, so it does not decide the graph.",
          ],
          formula: "Continuous independent variable → line graph | Categoric independent variable → bar chart",
        },
        {
          title: "Turn a vague idea into a fair question",
          paragraphs: [
            "A testable question names one independent variable and one measurable dependent variable. Then the method explains how the important control variables will be kept the same.",
          ],
          points: [
            "Write the question as ‘How does X affect Y?’ or ‘Which X gives the greatest Y?’",
            "Choose a measurable outcome rather than words such as ‘best’ or ‘better’.",
            "When justifying the graph, use the word continuous or categoric.",
          ],
          remember: "Graph choice depends on what you changed, not on what you measured.",
        },
      ],
      vocabulary: [
        ["Independent variable", "The one thing deliberately changed."],
        ["Dependent variable", "The outcome that is measured."],
        ["Control variable", "A factor kept the same for a fair comparison."],
        ["Categoric data", "Data sorted into named groups or types."],
      ],
    },
    questions: [
      {
        type: "Practice",
        prompt:
          "A student investigates how the length of a pendulum affects its time period. Identify the independent variable, dependent variable and one control variable.",
        hint: "What is deliberately changed? What is measured? What else could affect the result?",
        answer:
          "Independent variable: pendulum length. Dependent variable: time period. A valid control variable could be the release angle, the bob mass or the timing method.",
      },
      {
        type: "Practice",
        prompt:
          "Which graph should show how surface type affects the distance travelled by a toy car? Explain your choice.",
        hint: "Look at the type of the independent variable—not the fact that distance is a number.",
        answer:
          "A bar chart, because surface type is categoric. The surface categories go on the x-axis and mean distance travelled goes on the y-axis.",
      },
      {
        type: "AQA-style",
        marks: 3,
        prompt:
          "A student changes water temperature and measures how long a tablet takes to dissolve. State the independent variable, the dependent variable and the most suitable graph.",
        hint: "Temperature can take any value within a range.",
        answer:
          "Independent variable: water temperature (1). Dependent variable: dissolving time (1). Line graph, because temperature is continuous (1).",
      },
      {
        type: "AQA-style",
        marks: 4,
        prompt:
          "Explain why ‘the results are numbers, so use a line graph’ is not a reliable rule for choosing a graph. Use an example in your answer.",
        hint: "The dependent variable is often numerical in both types of investigation.",
        answer:
          "Graph choice depends on the independent variable, not simply whether any result is numerical (2). For example, bounce height is numerical, but if material type is changed then the independent variable is categoric, so a bar chart is needed (2).",
      },
    ],
  },
  {
    slug: "shock-absorber",
    number: "03",
    shortTitle: "The drop test",
    title: "Which material absorbs the shock?",
    mission: "Turn bouncing balls into evidence",
    intro:
      "Drop the same ball onto different materials, repeat each measurement and use a bar chart to reveal the best shock absorber.",
    colour: "coral",
    icon: "↓",
    unlocks: ["three trials and a mean", "results tables", "bar chart quality"],
    keyRule: "The best shock absorber gives the lowest mean bounce height.",
    revision: {
      pageStart: 12,
      pageRange: "12–15",
      summary:
        "The drop test turns a categoric comparison into trustworthy evidence by controlling the drop, repeating each material and plotting the mean.",
      sections: [
        {
          title: "Set up a fair comparison",
          paragraphs: [
            "Material type is the categoric independent variable. Bounce height is the dependent variable. The best shock absorber gives the lowest mean bounce because it returns less energy to the ball.",
          ],
          points: [
            "Change only the material.",
            "Keep the ball, drop height, release method and ruler position the same.",
            "Measure the first bounce at eye level.",
          ],
          remember: "Lowest bounce = best shock absorber.",
        },
        {
          title: "Collect data another scientist could use",
          paragraphs: [
            "Take three trials for every material and record each reading immediately. Calculate one mean bounce height for each category.",
          ],
          points: [
            "Put units in the table headings, not beside every value.",
            "Keep the trial columns separate and add a mean column.",
            "If a reading looks odd, check or repeat it while the equipment is available.",
            "Show at least one full mean calculation.",
          ],
          formula: "Mean bounce height = (trial 1 + trial 2 + trial 3) ÷ 3",
        },
        {
          title: "Build a marker-proof bar chart",
          paragraphs: [
            "Material names belong on the x-axis and mean bounce height belongs on the y-axis. Separate categories with equal gaps.",
          ],
          points: [
            "Write a title that says what is plotted against what.",
            "Label the y-axis with the quantity and cm.",
            "Use a sensible scale that fills most of the space.",
            "Draw equal-width bars whose heights match the means, not trial 1.",
          ],
        },
        {
          title: "Conclude and evaluate from your own evidence",
          paragraphs: [
            "Name the best material and quote its mean bounce height. Then identify errors that really belong to this method and match each one with an improvement.",
          ],
          points: [
            "Random: judging the top of the bounce by eye varies from trial to trial.",
            "Systematic: measuring from the wrong zero would shift every height.",
            "Video playback or a fixed camera can reduce the judgement problem.",
            "More repeats reduce random variation but do not fix a systematic shift.",
          ],
          remember: "A conclusion needs a number; an evaluation needs a specific mechanism.",
        },
      ],
      vocabulary: [
        ["Trial", "One repeat of a measurement."],
        ["Mean", "The total of the trials divided by their number."],
        ["Bar chart", "The graph used for a categoric independent variable."],
        ["Reliability", "How far results can be trusted and repeated."],
      ],
    },
    questions: [
      {
        type: "Practice",
        prompt:
          "A ball bounces 18 cm, 21 cm and 15 cm on sponge. Calculate the mean bounce height.",
        hint: "Add the three bounce heights, then divide by 3.",
        answer: "Mean = (18 + 21 + 15) ÷ 3 = 18 cm.",
      },
      {
        type: "Practice",
        prompt:
          "Material A has a mean bounce height of 12 cm. Material B has a mean of 38 cm. Which is the better shock absorber, and why?",
        hint: "A material that absorbs more energy leaves less energy for the rebound.",
        answer:
          "Material A is the better shock absorber because it produces the lower bounce height, showing that more of the ball’s energy was absorbed.",
      },
      {
        type: "AQA-style",
        marks: 4,
        prompt:
          "Describe how a student should collect reliable bounce-height data for four different materials. Include repeats and control variables.",
        hint: "Give a repeatable method and name at least two things that must stay the same.",
        answer:
          "Drop the same ball from the same measured height onto each material without pushing it (1). Measure the maximum bounce height using the ruler in the same position (1). Repeat at least three times for each material and calculate a mean (1). Keep controls such as ball type, release method, drop height and ruler position the same (1).",
      },
      {
        type: "AQA-style",
        marks: 3,
        prompt:
          "Explain why a bar chart should be used for the shock-absorber results and state one feature the chart must have.",
        hint: "Material names are groups, not values on a continuous scale.",
        answer:
          "Material type is a categoric independent variable, so a bar chart is suitable (2). One valid feature: gaps between equal-width bars, labelled axes, units on mean bounce height, a sensible scale or a clear title (1).",
      },
    ],
  },
  {
    slug: "ramp-line-graph",
    number: "04",
    shortTitle: "Ramp line graph",
    title: "Higher ramp, further travel?",
    mission: "Make a pattern visible",
    intro:
      "Collect continuous data from a trolley and ramp, calculate means, choose sensible scales and plot a line graph that another scientist can read.",
    colour: "violet",
    icon: "↗",
    unlocks: ["continuous data", "axes, units & scales", "accurate plotting"],
    keyRule: "Independent variable on x. Dependent variable on y. Units on both.",
    revision: {
      pageStart: 16,
      pageRange: "16–19",
      summary:
        "A line graph makes a pattern visible when the independent variable is continuous, but only if the table, scale and plotting are accurate.",
      sections: [
        {
          title: "Plan the ramp investigation",
          paragraphs: [
            "Ramp height is the continuous independent variable and distance travelled is the dependent variable. A line graph is suitable because meaningful ramp heights exist between the values tested.",
          ],
          points: [
            "Use five heights across a sensible range, such as 5, 10, 15, 20 and 25 cm.",
            "Keep the trolley, ramp, start point, release method and floor surface the same.",
            "Release without a push and measure from the same two points every time.",
          ],
        },
        {
          title: "Repeat, record and process",
          paragraphs: [
            "Take three distance readings at each ramp height and calculate the mean before drawing the graph.",
          ],
          points: [
            "Record readings immediately rather than from memory.",
            "Use headings such as ‘Ramp height / cm’ and ‘Mean distance / cm’.",
            "Check unusual trials before changing the height.",
            "Find the largest and smallest means before choosing a scale.",
          ],
          formula: "Mean distance = total of the three distances ÷ 3",
        },
        {
          title: "Choose the scale before plotting",
          paragraphs: [
            "A good scale uses most of the graph area and goes up in equal, easy-to-read steps.",
          ],
          points: [
            "Find the largest value and count the available big squares.",
            "Divide, then round up to a simple step such as 1, 2, 5, 10, 20 or 50.",
            "Check that the largest value still fits.",
            "Never change the step size halfway along an axis.",
          ],
          remember: "If the data occupies only one corner, the scale is wasting space and hiding the pattern.",
        },
        {
          title: "Plot a line graph precisely",
          paragraphs: [
            "Put ramp height on the x-axis and mean distance on the y-axis. Plot each point as a small cross so its exact position is visible.",
          ],
          points: [
            "Include a title, labels and units on both axes.",
            "Use the full grid and plot the processed mean values.",
            "Do not draw bars and do not join points dot-to-dot.",
            "Leave the best-fit line until you have considered the overall trend.",
          ],
          remember: "Independent on x; dependent on y; units on both.",
        },
      ],
      vocabulary: [
        ["Continuous data", "Number data that can take any value on a scale."],
        ["Scale", "The value represented by each division on an axis."],
        ["Line graph", "The graph used for a continuous independent variable."],
        ["Control variable", "A factor held constant so the comparison is fair."],
      ],
    },
    questions: [
      {
        type: "Practice",
        prompt:
          "For the ramp investigation, what belongs on each axis? Include units.",
        hint: "The independent variable goes on the x-axis.",
        answer:
          "x-axis: ramp height / cm. y-axis: mean distance travelled / cm.",
      },
      {
        type: "Practice",
        prompt:
          "The distances at a ramp height of 15 cm are 51 cm, 54 cm and 57 cm. Calculate the mean and suggest why repeats are useful.",
        hint: "The mean represents the set better than one reading. Repeats also reveal spread.",
        answer:
          "Mean = (51 + 54 + 57) ÷ 3 = 54 cm. Repeats reduce the effect of random variation when a mean is calculated and help reveal unusual results.",
      },
      {
        type: "AQA-style",
        marks: 4,
        prompt:
          "A student’s ramp heights range from 5 cm to 25 cm. Describe two choices that would produce a good x-axis scale and two other features needed for a high-quality graph.",
        hint: "Think about using most of the graph paper and intervals that are easy to count.",
        answer:
          "The scale should cover the full 5–25 cm range and use simple, equal intervals while using most of the available width (2). Other features include a labelled x-axis with cm, a labelled y-axis with cm, accurate small crosses, a clear title and a suitable best-fit line (any two for 2 marks).",
      },
      {
        type: "AQA-style",
        marks: 3,
        prompt:
          "The trolley sometimes turns sideways after leaving the ramp. Explain how this could affect the results and suggest one practical improvement.",
        hint: "Would every run turn by exactly the same amount?",
        answer:
          "The sideways movement varies between runs, causing random variation in the measured distance (2). Use guide rails or a marked straight run lane, while checking that these do not add significant friction (1).",
      },
    ],
  },
  {
    slug: "best-fit-outliers",
    number: "05",
    shortTitle: "Best fit & outliers",
    title: "The point that does not fit",
    mission: "Find the signal in messy data",
    intro:
      "Experimental points rarely behave perfectly. Draw a best-fit line, challenge suspicious results and write a conclusion that follows the evidence.",
    colour: "yellow",
    icon: "••/",
    unlocks: ["best-fit lines", "outlier decisions", "evidence-led conclusions"],
    keyRule: "Check or repeat an outlier before deciding what to do with it.",
    revision: {
      pageStart: 20,
      pageRange: "20–24",
      summary:
        "Experimental data is rarely perfect. A best-fit line shows the overall pattern, while an honest scientist investigates points that do not fit.",
      sections: [
        {
          title: "A best-fit line shows the trend",
          paragraphs: [
            "Draw one smooth straight or curved line that represents the pattern, with roughly balanced points above and below it. It does not need to touch any measured point.",
          ],
          points: [
            "Use one thin, clear line across the range of the data.",
            "Balance the scatter rather than forcing the line through the first and last points.",
            "Do not zig-zag from point to point.",
            "A best-fit line accepts that measurements include uncertainty and random variation.",
          ],
          remember: "Best fit means overall trend, not every measurement.",
        },
        {
          title: "Treat an outlier as a question",
          paragraphs: [
            "An outlier is a result that does not fit the pattern of the others. It may be a mistake, a method problem or a genuine effect.",
          ],
          points: [
            "Check the recording, calculation and plotting.",
            "Check whether the equipment or method changed.",
            "Repeat the measurement if possible.",
            "Correct a known mistake; otherwise report and annotate the unexplained outlier.",
          ],
          remember: "Never silently delete inconvenient evidence.",
        },
        {
          title: "Write a conclusion that follows the evidence",
          paragraphs: [
            "State the relationship between the independent and dependent variables, then support it with processed data from the table or graph.",
          ],
          points: [
            "Name both variables and the direction of the change.",
            "Quote at least two relevant values with units.",
            "Say whether the pattern is strong, weak, straight or curved when the graph supports that claim.",
            "Mention a possible outlier only with a reason.",
          ],
          formula: "As ramp height increased, mean distance increased from ___ cm at ___ cm to ___ cm at ___ cm.",
        },
        {
          title: "Check the finished graph like a marker",
          paragraphs: [
            "A scientific graph must make the evidence easy for somebody else to read and challenge.",
          ],
          points: [
            "Title, axes, units and sensible scale are present.",
            "Points are accurate small crosses.",
            "The best-fit line is clear and not dot-to-dot.",
            "Outliers are identified and explained, or their absence is stated.",
          ],
          remember: "Peer review should give one specific improvement, not ‘make it neater’.",
        },
      ],
      vocabulary: [
        ["Best-fit line", "One line showing the overall trend of the data."],
        ["Outlier", "A result that does not fit the pattern of the others."],
        ["Trend", "The overall relationship shown by the data."],
        ["Conclusion", "A statement supported by processed evidence."],
      ],
    },
    questions: [
      {
        type: "Practice",
        prompt:
          "Ramp height / cm: 5, 10, 15, 20, 25. Mean distance / cm: 20, 37, 52, 96, 80. Which point is the likely outlier?",
        hint: "Look for the point that breaks the otherwise steady increasing trend.",
        answer:
          "The point (20 cm, 96 cm) is the likely outlier. It is much higher than expected between 52 cm at 15 cm and 80 cm at 25 cm.",
      },
      {
        type: "Practice",
        prompt:
          "Why is joining every experimental point dot-to-dot usually misleading?",
        hint: "Does each measured point represent the exact relationship with no uncertainty?",
        answer:
          "A dot-to-dot line suggests every measured point is exact and that the relationship changes sharply at each reading. A best-fit line shows the overall trend despite random variation.",
      },
      {
        type: "AQA-style",
        marks: 4,
        prompt:
          "A student finds one result far from the best-fit line. Describe what the student should do before excluding it and explain why automatic deletion is poor scientific practice.",
        hint: "Check records, equipment and method; repeat if possible.",
        answer:
          "Check for a recording, plotting or calculation mistake and inspect the equipment and method (2). Repeat the measurement if possible (1). Automatic deletion could hide a real effect or remove valid evidence without a reason, so an unexplained outlier should be reported rather than silently erased (1).",
      },
      {
        type: "AQA-style",
        marks: 3,
        prompt:
          "The best-fit line rises from left to right. Write a conclusion and explain what extra evidence would make it stronger.",
        hint: "State the relationship, then quote or compare actual values.",
        answer:
          "Conclusion: as the independent variable increases, the dependent variable increases—a positive correlation (1). A stronger conclusion quotes processed data or two points from the graph, including units, to show the size of the change (2).",
      },
    ],
  },
  {
    slug: "solo-flight",
    number: "06",
    shortTitle: "Solo flight",
    title: "Paper helicopter challenge",
    mission: "Run the whole investigation yourself",
    intro:
      "Plan, measure, process and present a paper-helicopter investigation with less scaffolding. This is your chance to prove you can use the whole physicist toolkit.",
    colour: "cyan",
    icon: "⌁",
    unlocks: ["independent planning", "table design", "evaluation"],
    keyRule: "Change one variable, measure one variable, control everything else you reasonably can.",
    revision: {
      pageStart: 25,
      pageRange: "25–29",
      summary:
        "The paper-helicopter challenge combines the whole process: plan a fair test, collect repeated data, graph it, conclude and evaluate independently.",
      sections: [
        {
          title: "Plan before touching the equipment",
          paragraphs: [
            "A suitable question is ‘How does wing length affect the fall time of a paper helicopter?’ Wing length is continuous, so the finished data needs a line graph.",
          ],
          points: [
            "Choose at least five wing lengths across a useful range.",
            "Measure fall time as the dependent variable.",
            "Control paper, body shape, paperclip mass, drop height and release method.",
            "Keep the landing area clear and never climb on furniture for extra height.",
          ],
        },
        {
          title: "Design the table and collect honest data",
          paragraphs: [
            "Your table needs one column for wing length, three trial columns and one mean column, with units in every heading.",
          ],
          points: [
            "Use the same person or timing system throughout where possible.",
            "Start timing at release and stop at landing.",
            "If a drop hits an object or catches a draught, record the reason and repeat it.",
            "A discarded trial with a written reason is honest; a quietly deleted one is not.",
          ],
          remember: "Fall times are short, so reaction time is a large source of random error.",
        },
        {
          title: "Graph, conclude and predict",
          paragraphs: [
            "Plot wing length on the x-axis and mean fall time on the y-axis. Add a best-fit line and use it to estimate a value between measured points.",
          ],
          points: [
            "Use the correct title, units, scale and small crosses.",
            "Identify possible outliers or state that there are none.",
            "Describe the relationship and quote two values with units.",
            "A prediction inside the measured range is interpolation and is more trustworthy than extending far beyond it.",
          ],
        },
        {
          title: "Evaluate with a matching improvement",
          paragraphs: [
            "A useful evaluation identifies a specific strength, weakness or error, explains its effect, and proposes an improvement that tackles that exact cause.",
          ],
          points: [
            "Weak: ‘There was human error.’",
            "Better: ‘Reaction time varied when starting and stopping the stopwatch, increasing scatter.’",
            "Matching improvement: use slow-motion video or electronic timing.",
            "Self-assess the variables, table, repeats, means, graph, outliers and evidence-led conclusion.",
          ],
          remember: "Problem → effect on data → realistic improvement.",
        },
      ],
      vocabulary: [
        ["Method", "Numbered instructions another scientist can repeat."],
        ["Interpolation", "Reading a prediction within the measured data range."],
        ["Evaluation", "A judgement of method quality, errors and improvements."],
        ["Safety risk", "A hazard considered together with how its risk is reduced."],
      ],
    },
    questions: [
      {
        type: "Practice",
        prompt:
          "For ‘How does wing length affect fall time?’, identify the independent variable, dependent variable and three control variables.",
        hint: "Think about every feature besides wing length that might alter the fall.",
        answer:
          "Independent: wing length. Dependent: fall time. Controls could include drop height, paper type and size, helicopter body shape, number of paperclips, release method and timing method (any three).",
      },
      {
        type: "Practice",
        prompt:
          "List the headings needed for a complete results table for five wing lengths and three trials.",
        hint: "Units belong in headings, not written repeatedly in every cell.",
        answer:
          "Wing length / cm; fall time trial 1 / s; fall time trial 2 / s; fall time trial 3 / s; mean fall time / s.",
      },
      {
        type: "AQA-style",
        marks: 6,
        prompt:
          "Plan an investigation to determine how wing length affects the fall time of a paper helicopter. Include a range, repeats, controls and safety.",
        hint: "Write a sequence another student could follow. Include how the time is measured and how reliability is improved.",
        answer:
          "Make otherwise identical helicopters with at least five measured wing lengths, for example 4–8 cm (1). Drop each from the same measured height using the same release method (1). Time the fall to the floor (1). Repeat at least three times at each length and calculate a mean (1). Keep paper, helicopter design, paperclip mass and drop height constant (1). Keep the drop zone clear and do not stand on furniture (1).",
      },
      {
        type: "AQA-style",
        marks: 4,
        prompt:
          "A student says, ‘My method was bad because of human error.’ Improve this evaluation by naming one specific problem and a matching improvement.",
        hint: "Choose one point where a person makes a judgement or reacts, then fix that mechanism.",
        answer:
          "Example: reaction time when starting and stopping the stopwatch caused variable fall times (2). Record each drop in slow-motion video and measure from release to landing, or use an electronic timing method, to reduce this timing variation (2).",
      },
    ],
  },
  {
    slug: "research-project",
    number: "07–08",
    shortTitle: "Your investigation",
    title: "How does X affect Y?",
    mission: "Design evidence worth defending",
    intro:
      "Choose a safe, testable question; get your plan approved; collect repeated results; then present and defend your conclusion as a research team.",
    colour: "coral",
    icon: "?",
    unlocks: ["testable questions", "team investigation", "defensible conclusions"],
    keyRule: "A strong question is specific, measurable and written: ‘How does X affect Y?’",
    revision: {
      pageStart: 30,
      pageRange: "30–38",
      summary:
        "A complete investigation produces evidence that survives planning checks, honest data collection, graphing, evaluation and questions from other people.",
      sections: [
        {
          title: "Choose one question you can actually answer",
          paragraphs: [
            "Write a focused question in the form ‘How does X affect Y?’ X must be one independent variable and Y must be one measurable dependent variable.",
          ],
          points: [
            "Test four or five values or categories.",
            "Take at least three trials at each one and calculate a mean.",
            "Avoid vague words such as ‘best’ unless you define the measured outcome.",
            "Avoid questions with several dependent variables or variables you cannot measure consistently.",
          ],
          remember: "One change, one measurement, one answerable question.",
        },
        {
          title: "Pass the planning checkpoint",
          paragraphs: [
            "Before collecting data, identify the variables, range, equipment, graph, safety controls and a numbered method that another group could follow without asking questions.",
          ],
          points: [
            "Name at least three realistic control variables.",
            "Explain exactly how the dependent variable will be measured.",
            "Include repeats and a table with units in the headings.",
            "Check that equipment is available and risks are reduced.",
          ],
        },
        {
          title: "Record, process and graph the evidence",
          paragraphs: [
            "Record results as they are measured and keep lab notes about anything that changed, failed or had to be repeated. Those notes become the evidence for your evaluation.",
          ],
          points: [
            "Calculate a mean for every value or category.",
            "Continuous independent variable → line graph with best fit.",
            "Categoric independent variable → bar chart with gaps.",
            "Use titles, labels, units, a sensible scale and accurate plotting.",
          ],
          formula: "Decide the graph from the independent variable, then plot the mean dependent variable.",
        },
        {
          title: "Defend the conclusion and evaluation",
          paragraphs: [
            "Interrogate the graph before writing: identify the pattern, judge its strength, consider outliers and choose the strongest numerical evidence.",
          ],
          points: [
            "A conclusion states the relationship and quotes processed values with units.",
            "An evaluation names one strength, one weakness, random and systematic errors, and a matching improvement.",
            "State how confident you are and what extra evidence would increase that confidence.",
            "Peer review checks whether another scientist could trust and reproduce the work.",
          ],
          remember: "Good scientists try to find the weakness before somebody else does.",
        },
      ],
      vocabulary: [
        ["Research question", "A focused, measurable question linking X and Y."],
        ["Lab notes", "A record of events that may affect the data."],
        ["Peer review", "Another scientist checks the method, evidence and claims."],
        ["Confidence", "How strongly the available evidence supports a conclusion."],
      ],
    },
    questions: [
      {
        type: "Practice",
        prompt:
          "Improve the question ‘What is the best paper helicopter?’ so that it is testable.",
        hint: "Name one thing to change and one measurable outcome.",
        answer:
          "One suitable version is: ‘How does wing length affect the fall time of a paper helicopter?’ Other specific, measurable X-and-Y questions may also be valid.",
      },
      {
        type: "Practice",
        prompt:
          "A group wants to change surface type and measure both speed and distance. What is the planning problem, and how should they fix it?",
        hint: "A focused fair test has one dependent variable.",
        answer:
          "They have chosen two dependent variables, making the question unfocused. Choose one measurable outcome—either speed or distance—and state the question clearly.",
      },
      {
        type: "AQA-style",
        marks: 5,
        prompt:
          "State five checks a teacher should make before approving a student-designed investigation.",
        hint: "Think question, variables, measurement, repeats, equipment and risk.",
        answer:
          "Any five: the question is clear and testable; independent variable is identified; dependent variable is measurable; realistic control variables are named; method is safe; equipment is available; a suitable range or categories are planned; at least three repeats are included; table headings include units; graph choice matches the independent variable.",
      },
      {
        type: "AQA-style",
        marks: 6,
        prompt:
          "A group concludes, ‘Surface A was best.’ Describe how they should improve the conclusion and write an evaluation that could gain full marks.",
        hint: "A conclusion needs evidence; an evaluation needs a specific weakness and a matching, realistic improvement.",
        answer:
          "They should define what ‘best’ means, state the relationship and quote processed data with units, for example comparing mean results (3). They should identify a specific source of error, explain how it affected measurements, and give a realistic matching improvement such as a fixed release system or video measurement (3).",
      },
    ],
  },
];
