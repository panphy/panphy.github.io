# PanPhyPlot (neo-beta)

A trial version of PanPhyPlot built around Origin-style columns, for tablet and desktop. The page is `beta/panphyplot-neo.html`; it has no service-worker registration or offline cache, and a screen narrower than 600px (or a short touch screen, such as a phone on its side) gets a link to the current PanPhyPlot instead. The current version in `tools/` is unchanged and keeps its own saved work; this one saves under `panphyplot-neo-state-v1`. All tabs share that workspace, so when another tab saves it (`storage` event), a tab stops autosaving and offers to reload or keep its own version.

Each tab is a sheet of columns. A column's role is X, Y, ±ΔX or ±ΔY (absolute or %), or Ignore. Pairing follows Origin: a Y column plots against the nearest X column to its left, a ΔY column belongs to the nearest Y to its left and a ΔX column to the nearest X. Axis titles are built from names and units as `name / unit`.

A formula column (such as `T^2` or `mean(B, C, D)`) is recalculated from its sheet whenever the data changes. Formulas refer to columns by letter, or by name when the name is a valid, unique identifier, and letters are rewritten when columns move or are deleted. A row with a blank or invalid input stays blank. Mean of Repeats adds such a column, plus an optional ±Δ column of half the spread between the largest and smallest readings. A formula column can also have a ±Δ column that carries the uncertainties through: Δf = √Σ(∂f/∂x · Δx)², using each input's own ±Δ column (by the pairing rule), with the derivatives taken numerically and shown symbolically in the formula dialog.

Weight by uncertainties weights every fit type by 1/σ², with σ² = ΔY² + (f′(x)·ΔX)², re-weighted as the fit settles. Every fit reports its parameters as value ± uncertainty from the covariance matrix: with weights, σ is taken as a standard uncertainty; without, the uncertainty comes from the scatter. χ²/ν is shown when every point has a ±ΔY or ±ΔX. In formulas, `mean`, `median`, `min`, `max` and `halfspread` leave out blank readings among their inputs, and renaming a column rewrites the formulas that use its name.

CSV import shows a preview in which every column's role is chosen; the suggested roles come only from clear headings. CSV export writes `name / unit` headings, which import reads back.

- `js/neo-model.js`: the column model and formula engine, pure and testable in node.
- `js/neo-stats.js`: weighted straight lines, parameter uncertainties and χ², also pure.
- `js/neo-state.js`: saved state, and the globals the fitting code reads. Fits are keyed `<sheet id>:<Y column id>`.
- `js/neo-fitting.js`: a copy of `tools/panphyplot/js/curve-fitting.js`. It renames `activeSet` to `activeFitKey`, records the data each fit used, and passes every fit through `finalizeParametricFit`, which refines it, weights it by the effective variance σ² = ΔY² + (f′(x)·ΔX)² when asked, and gives each parameter its ± from the Jacobian. Its Power fit is the general y = A(x − x₀)ᵇ + c, found as in the original by a copy of `PanPhyFitCore.solveShiftedPowerLaw`, kept in the beta because `fit-core.js` is cache-first and could be an older version, and its Exponential reports y = A eᵇˣ + c. Bring fixes to the original across by hand.
- `js/neo-plot.js`, `js/neo-ui.js`, `js/neo-dialogs.js`, `js/neo-main.js`: graph, table, the formula, mean and CSV dialogs, and start-up.
- `js/neo-copy.js`: View Table (copy for a spreadsheet, as an image, Markdown or LaTeX) and copying the fitted equation as an image or LaTeX. Its clipboard and SVG-to-PNG helpers are copied from `tools/panphyplot/js/ui.js`.
- `js/neo-tour.js`: the guided tour at `?tour=columns`, on practice data with saving switched off. Its card and spotlight engine is copied from `tools/panphyplot/js/tour.js` and uses `tools/panphyplot/css/tour.css`.
- `js/neo-panes.js`: the draggable dividers between panes (from 1000px), on the PanPhyMD model. They snap onto their starting positions within 16px, and widths are kept per layout under `panphyplot-neo-panes` in this browser. Column widths are saved with each column.
- `manual.html`: the manual for this version.

The page loads `fit-core.js`, `fit-worker.js`, math.js, `math_ref.html` and `tour.css` from `tools/panphyplot/`, so changes there also affect this version. Everything else is styled by `css/neo.css`: an app shell with a toolbar, data, graph and inspector panes, and a status bar. Its layout has three panes from 1280px, data beside a scrolling graph-and-cards column from 1000px (the tour's `TOUR_NARROW_WIDTH`), and one column below that.

Run the tests with `node --test beta/panphyplot-neo/tests/`.
