# GCSE course summaries

Two one-page summaries of the AQA specifications, linked from the GCSE hub (`gcsephy/index.html`):

| Page | Content |
|---|---|
| `physics-8463/` | GCSE Physics 8463: the two papers, the eight topics (spec section 4) with Higher tier (`HT`) and physics-only content tagged, the equations and required practicals 1–10 |
| `combined-8464/` | Combined Science: Trilogy 8464, physics only: the six papers (physics in full, biology and chemistry in one row), how the 17-point double grade is awarded, the seven physics topics (spec section 6) and required practicals 14–21 |
| `summary.css` | Shared layout in the Do Now style. The palette is set by the body class: `c-8463` (indigo, sky, coral) or `c-8464` (plum, mint, periwinkle) |

Both are plain HTML, light theme only like the Do Now pages. Equations are LaTeX between `\(` and `\)` (`\dfrac` for division, `\tfrac{1}{2}` for a half, `\text{}` for word equations, as in the decks), typeset by MathJax from the CDN; the equation chips stay hidden until MathJax has finished, or for four seconds if it does not load. The content is paraphrased from specification version 1.1 (2019); the specification is the authority. Every equation listed is on the Physics Equations Sheet, which AQA now provides in every physics paper, except R_total = R₁ + R₂ is not on it (see [the Year 10 README](../year10phy/unit01/README.md#equation-sheet)). If AQA publishes a new version of either specification, re-check the exam tables, the topic codes and the `HT` and physics-only tags.
