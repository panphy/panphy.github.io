# PanPhyPlot (neo-beta)

A trial version of PanPhyPlot built around Origin-style columns, for tablet and desktop. The page is `beta/panphyplot-neo.html`; it has no service-worker registration or offline cache, and a screen narrower than 600px (or a short touch screen, such as a phone on its side) gets a link to the current PanPhyPlot instead. The current version in `tools/` is unchanged and keeps its own saved work; this one saves under `panphyplot-neo-state-v1`.

Each tab is a sheet of columns. A column's role is X, Y, ±ΔX or ±ΔY (absolute or %), or Ignore. Pairing follows Origin: a Y column plots against the nearest X column to its left, a ΔY column belongs to the nearest Y to its left and a ΔX column to the nearest X. Axis titles are built from names and units as `name / unit`.

- `js/neo-model.js`: the column model, pure and testable in node.
- `js/neo-state.js`: saved state, and the globals the fitting code reads. Fits are keyed `<sheet id>:<Y column id>`.
- `js/neo-fitting.js`: a copy of `tools/panphyplot/js/curve-fitting.js`. It renames `activeSet` to `activeFitKey`, records the data each fit used, and changes the point check in `fitAdvancedCurve`. Bring fixes to the original across by hand.
- `js/neo-plot.js`, `js/neo-ui.js`, `js/neo-main.js`: graph, table and start-up.

The page loads `fit-core.js`, `fit-worker.js`, math.js, `math_ref.html` and `panphyplot.css` from `tools/panphyplot/`, so changes there also affect this version.

Run the model tests with `node --test beta/panphyplot-neo/tests/model.test.cjs`.
