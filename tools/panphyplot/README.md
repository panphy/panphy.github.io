# PanPhyPlot

PanPhyPlot is a column-based graphing and fitting workspace for tablets and computers at `tools/panphyplot.html`, available offline through the root service worker. Phones link to `misc/panphyplotog.html` (PanPhyPlotOG).

Saved trial work continues under `panphyplot-neo-state-v1`, with no migration or deletion. Pane widths and tour-seen preferences also keep their original storage keys. All tabs share the workspace: a tab pauses saving when another tab saves, and offers to reload or keep its own version. The one-time original-data offer reads `panphyplot-state-v2`, appends nonempty datasets as new sheets, and records acceptance or decline atomically with the workspace. Draft cell text, names, units, titles, and absolute/percentage uncertainties are preserved; disabled uncertainty columns import as Ignore. Saved fits stay in PanPhyPlotOG. Neither app writes the other's storage key.

Each tab is a sheet of columns. A column's role is X, Y, ±ΔX or ±ΔY (absolute or %), or Ignore. Pairing follows Origin: a Y column plots against the nearest X column to its left, a ΔY column belongs to the nearest Y to its left and a ΔX column to the nearest X. Axis titles are built from names and units as `name / unit`.

A formula column (such as `T^2` or `mean(B, C, D)`) is recalculated from its sheet whenever the data changes. Formulas refer to columns by letter, or by name when the name is a valid, unique identifier, and letters are rewritten when columns move or are deleted. A row with a blank or invalid input stays blank. Mean of Repeats adds such a column, plus an optional ±Δ column of half the spread between the largest and smallest readings. A formula column can also have a ±Δ column that carries the uncertainties through: Δf = √Σ(∂f/∂x · Δx)², using each input's own ±Δ column (by the pairing rule), with the derivatives taken numerically and shown symbolically in the formula dialog.

Weight by uncertainties weights every fit type by 1/σ², with σ² = ΔY² + (f′(x)·ΔX)², re-weighted as the fit settles. Every fit reports its parameters as value ± uncertainty from the covariance matrix: with weights, σ is taken as a standard uncertainty; without, the uncertainty comes from the scatter. χ²/ν is shown when every point has a ±ΔY or ±ΔX. In formulas, `mean`, `median`, `min`, `max` and `halfspread` leave out blank readings among their inputs, and renaming a column rewrites the formulas that use its name.

CSV import shows a preview in which every column's role is chosen; the suggested roles come only from clear headings. CSV export writes `name / unit` headings, which import reads back.

- `js/model.js`: the column model and formula engine, pure and testable in node.
- `js/stats.js`: weighted straight lines, parameter uncertainties and χ², also pure.
- `js/legacy-import.js`: pure conversion of original datasets into sheets.
- `js/state.js`: saved state, and the globals the fitting code reads. Fits are keyed `<sheet id>:<Y column id>`. How far each fit line extends beyond its data is saved in `extents`; the fit functions that redraw it are kept for the session only.
- `js/fitting.js`: a copy of `misc/panphyplotog/js/curve-fitting.js`. It renames `activeSet` to `activeFitKey`, records the data each fit used, and passes every fit through `finalizeParametricFit`, which refines it, weights it by the effective variance σ² = ΔY² + (f′(x)·ΔX)² when asked, and gives each parameter its ± from the Jacobian. Its Power fit is the general y = A(x − x₀)ᵇ + c, found as in the original by a copy of `PanPhyFitCore.solveShiftedPowerLaw`, retained unchanged to preserve the established fitting results, and its Exponential reports y = A eᵇˣ + c. Bring fixes to the original across by hand.
- `js/plot.js`, `js/ui.js`, `js/dialogs.js`, `js/main.js`: graph, table, the formula, mean and CSV dialogs, and start-up.
- `js/copy.js`: View Table (copy for a spreadsheet, as an image, Markdown or LaTeX) and copying the fitted equation as an image or LaTeX. Its clipboard and SVG-to-PNG helpers are copied from `misc/panphyplotog/js/ui.js`.
- `js/tour.js`: the guided tour at `?tour=columns`, on practice data with saving switched off. Its card and spotlight engine is copied from `misc/panphyplotog/js/tour.js` and uses `tools/panphyplot/css/tour.css`.
- `js/panes.js`: the draggable dividers between panes (from 1000px), on the PanPhyMD model. They snap onto their starting positions within 16px, and widths are kept per layout under `panphyplot-neo-panes` in this browser. Column widths are saved with each column.
- `manual.html`: the manual for this version.

Each app owns separate copies of `fit-core.js`, `fit-worker.js`, math.js, `math_ref.html` and `tour.css`; keep necessary solver fixes in step manually. The page and support resources in this folder are precached. The internal `neo-` CSS/DOM prefixes remain to avoid changing layout selectors. Everything else is styled by `css/panphyplot.css`: an app shell with a toolbar, data, graph and inspector panes, and a status bar. Its layout has three panes from 1280px, data beside a scrolling graph-and-cards column from 1000px (the tour's `TOUR_NARROW_WIDTH`), and one column below that.

Run the tests with `node --test tools/panphyplot/tests/*.test.cjs misc/panphyplotog/tests/regression.test.cjs`.
