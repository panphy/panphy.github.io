# To do: PanPhyPlot (neo-beta)

Phase 1 is `beta/panphyplot-neo.html` (see `beta/panphyplot-neo/README.md`). The current `tools/panphyplot.html` stays live and unchanged.

Agreed decisions: tabs are sheets, one experiment each. Axis titles use `name / unit`. The beta is for tablet and desktop only, and phones get a link to the current version. Tour and Manual are left out until Phase 4. Ask the user before removing the old Data Processing popup or Clone x from the current version.

## Phase 2: formulas and repeats
- [ ] Formula columns such as `T^2` and `4*pi^2*L/T^2`, with no leading `=`. They refer to column letters (A, B…) or valid names, update live, catch circular references, and show their cells read-only and shaded.
- [ ] A "Mean of repeats" helper over the selected Y columns, with an optional uncertainty of half the spread between the largest and smallest readings. Never call that spread "the range"; check `gcsephy/do-now/` for the established wording.
- [ ] CSV import with a preview in which the student sets each column's role, and no guessing of uncertainty columns.
- [ ] CSV export of every column, including formula results.

## Phase 3: uncertainties (undergraduate)
- [ ] Carry ΔX and ΔY through formula columns, using first-order derivatives from math.js and showing the working (for example, %Δ(T²) = 2 × %ΔT).
- [ ] Weighted fits using ΔY: χ²/ν and uncertainties on the fitted parameters. This needs changes to `fit-core.js`, which is shared with `tools/`, so copy it into the beta first or change both versions together.

## Phase 4: polish
- [ ] View Table, copying the fitted equation as an image, and a new Tour and Manual.

## Smaller items found in Phase 1
- [ ] Every cell selects its whole value when focused, so moving left or right through filled cells takes two arrow presses.
- [ ] The Power fit's shifted form converged badly on pendulum data ("iteration limit reached"). The engine behaves the same in the current version, so look into it there too.
- [ ] Bring any later fixes to `tools/panphyplot/js/curve-fitting.js` across to `beta/panphyplot-neo/js/neo-fitting.js` by hand.
