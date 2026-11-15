// Workbook settings for the shared renderer (/gcsephy/assets/workbook/workbook.js).
window.WORKBOOK = {
  file: "Y09 - Unit 01 - Work Like a Physicist",
  name: "Work Like a Physicist",
  year: 9,
  coverTitle: "Work like<br><em>a physicist</em>",
  coverArt: () => window.CoverArt.graph(),
  quote: (W) => (W.REVIEW
    ? ["“It doesn’t matter how beautiful your theory is … If it doesn’t agree with experiment, it’s wrong.”", "Richard Feynman, physicist"]
    : ["“The first principle is that you must not fool yourself, and you are the easiest person to fool.”", "Richard Feynman, physicist"]),
  lede: "Collecting, processing and presenting data: how to produce evidence that other people can trust.",
  // Lessons 7-8 are one entry (n: 7, last: 8).
  parts: [[1, 2], [3, 4, 5], [6, 7]],
  firstDoNow: "What do you already think?",
  // Each lesson opens with a real case: what happened, and the lesson it teaches.
  side: (l) => `<div class="online story"><div><h3>The case${l.story.year ? ` (${l.story.year})` : ""}</h3><p><strong>${l.story.title}.</strong> ${l.story.text}</p>${l.story.punch ? `<p class="punch">${l.story.punch}</p>` : ""}</div></div>`,
  // The Physicist's toolkit: every rule, calculation and checklist from the unit.
  toolkit: (W) => `<section class="new-page toolkit-page"><div class="eyebrow">Reference</div><h2 class="page-title">The Physicist’s toolkit</h2>
      <div class="tk-grid">${W.U.toolkit.cards.map((c) => `<div class="tk${c.cls ? " " + c.cls : ""}"><h4>${c.title}</h4>${c.h}</div>`).join("")}</div>
      <div class="rule-card"><div class="rule-head">The rule that decides your graph</div><div class="rule-body">Continuous independent variable → <strong>line graph</strong>. Categoric independent variable → <strong>bar chart</strong>.</div><div class="rule-foot">It depends on what you <em>changed</em>, not on what you measured.</div></div>
    </section>`,
  trackerFoot: () => `<div class="key warn"><strong>One habit worth building.</strong> When something in your results looks wrong, the useful question is never “can I ignore that?” It is “why did that happen?”</div>
      <div class="sentence"><div class="k">The whole unit in one sentence</div><div class="v">Measure it more than once, be honest about the doubt, show the pattern clearly, and let the evidence decide.</div></div>`,
};
