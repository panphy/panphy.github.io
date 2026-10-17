# To do: PanPhyPlot (neo-beta)

All four planned phases (columns, fits, formula columns, Mean of Repeats, CSV import/export, propagated uncertainties, weighted fits, View Table, equation copying, the Tour and the Manual) are in `beta/panphyplot-neo.html` (see `beta/panphyplot-neo/README.md`). The current `tools/panphyplot.html` stays live and unchanged.

Agreed decisions: tabs are sheets, one experiment each. Axis titles use `name / unit`. The beta is for tablet and desktop only, and phones get a link to the current version. Ask the user before removing the old Data Processing popup or Clone x from the current version.

## Follow-ups
- [ ] Every cell selects its whole value when focused, so moving left or right through filled cells takes two arrow presses.
- [ ] The Power fit's shifted form converged badly on pendulum data ("iteration limit reached"). The engine behaves the same in the current version, so look into it there too.
- [ ] Mean of Repeats leaves a row blank when one reading is missing; consider averaging the readings that are present.
- [ ] Renaming a column breaks formulas that use its name (they show an error); consider rewriting them as letters are.
- [ ] Weighting and ± values cover Linear and Custom fits only; Polynomial, Exponential, Power, Sinusoidal and Gaussian are unweighted (students can use Custom for any of these). Weighting by ΔX as well (effective variance) is not done.
- [ ] Bring any later fixes to `tools/panphyplot/js/curve-fitting.js` across to `beta/panphyplot-neo/js/neo-fitting.js` by hand.
