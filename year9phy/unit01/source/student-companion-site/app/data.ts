export type Question = {
  type: "Practice" | "AQA-style";
  marks?: number;
  prompt: string;
  hint: string;
  answer: string;
};

export type Lesson = {
  slug: string;
  number: string;
  shortTitle: string;
  title: string;
  mission: string;
  intro: string;
  colour: string;
  icon: string;
  unlocks: string[];
  keyRule: string;
  questions: Question[];
};

export const lessons: Lesson[] = [
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

export function getLesson(slug: string) {
  return lessons.find((lesson) => lesson.slug === slug);
}
