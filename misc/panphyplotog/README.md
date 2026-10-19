# PanPhyPlotOG

The network-only, phone-compatible introduction at `/misc/panphyplotog.html`: one x-y dataset, plain names and titles, absolute/percentage uncertainty bars, and linear, quadratic, cubic, exponential and shifted-power fits. Uncertainty and Best Fit start open. CSV import/export, report-table and equation copying, graph PNG export and two practice-tour chapters remain available. More involved work belongs in `/tools/panphyplot.html`.

`js/state.js` saves only the introductory dataset under `panphyplotog-intro-state-v1`. On first use it can copy the previously active dataset from `panphyplot-state-v2` or `panphyplot-state-v1`, preserving draft cells, headings, uncertainty settings, title and basic fit. Those original saves are read-only: other datasets and old fit results remain preserved. The full app's original-data importer can import the datasets, but not their fits. The full app uses its own storage and loads no OG scripts.

Edit the HTML, CSS and vanilla JavaScript directly. `display.js` formats the app's own basic-fit output and leaves user labels as plain text. `curve-fitting.js` exposes only basic fits; `fit-core.js` is an independent copy of the full app's numerical core, kept identical for solver parity. `ui.js` owns table input, uncertainties, CSV and plain table/image copying. `tour.js` runs practice without reading or writing saved measurements.

Run `node --test misc/panphyplotog/tests/regression.test.cjs tools/panphyplot/tests/*.test.cjs` and the repository checks. Verify both apps when changing shared numerical conventions; neither app shares runtime solver, clipboard or tour files with the other.
