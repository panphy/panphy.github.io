# PanPhyCircuits

A circuit builder and simulator for GCSE and IB Physics. Entry point: `tools/panphycircuits.html`, listed under Tools on the homepage. Plain HTML, CSS and classic scripts; no build step. It works offline: every file here is in `ASSETS_TO_CACHE` in `sw.js` and in the page's offline requirements in `index.html`, so add new files to both and bump `BUILD_ID`.

## Structure

| File | Role |
| --- | --- |
| `js/units.js` | SI formatting and parsing (`4.7k`, `100 µF`) |
| `js/registry.js` | Component types: terminals, properties, electrical models, readings, help text |
| `js/circuit.js` | The document: components, wires between named terminals, nets, import validation |
| `js/solver.js` | MNA solver (Newton–Raphson, ideal-source loop analysis, BDF2 transients, logic settling) and the fixed-step simulation engine |
| `js/art-common.js`, `art-realistic.js`, `art-schematic.js` | Original SVG artwork per type, with terminal coordinates for each view |
| `js/layout.js` | Per-view geometry: transforms, wire routing, junction splitting, layout generation and syncing, Tidy up |
| `js/render.js`, `editor.js`, `ui.js`, `graph.js`, `app.js` | Workspace rendering, interaction, panels, graph, state/history/autosave |
| `js/examples.js` | Example circuits, each with a realistic layout and a circuit diagram |

Adding a component: define it in `registry.js` (terminals, props, `compile` into solver primitives, `readings`), then add an entry with `bounds`, `terms` and `draw` in both artwork files. Terminal ids must match in all three; `tests/model.test.cjs` checks this.

## Key design points

- One shared electrical circuit; each view stores its own positions, rotations and wire bends. Connectivity is explicit (wire ends name a component terminal), never inferred from geometry.
- Networks are solved separately, each with its own reference node, so a p.d. between unconnected circuits is undefined. Loops of zero-resistance elements are found before solving: a non-zero EMF is reported as a short circuit or conflict; a zero EMF leaves the currents around the loop undefined (shown as “?”).
- The solver finds the steady state after every change, so readings are live without the clock. Time matters only for capacitors, AC supplies, the oscilloscope and a graph with plotted meters (`app.needsTime`). Then the time bar at the bottom right of the canvas shows play/pause and reset; otherwise it reads Live (Space explains why). Time always starts paused, after loading an example, a file or the autosave. Play advances time in fixed steps (automatic step ≈ RC/100, AC period/100); Pause freezes time but edits still update readings; Reset returns to t = 0 and pauses. Switching views never touches the simulation. Saved files and autosave hold the circuit, not the live state.
- When an autosaved circuit exists, a start dialog offers to continue it or start with a clean canvas (undoable). The empty-canvas start card also offers a clean canvas, which just dismisses it.
- Display choices (labels, values, current animation, wire colors and logic symbols) are saved immediately in browser storage (`panphy-circuits-display-v1`), separately from the circuit autosave. They carry across reloads, clean canvases, examples and opened files, overriding the file's display settings once a preference is saved. Simulation speed and time step stay with the circuit.
- The layout follows the suite shell of PanPhyPlot, PanPhyMD and PanPhyTrack: an app bar with a spectrum line, three panes on graph paper (Components, Circuit, and the inspector as a column of PanPhyPlot-style cards), and one status bar with the copyright. The view toggle sits in the Circuit pane's heading and the tools in its toolbar row. The run state and simulation time sit in a chip at the bottom right of the canvas; Display (labels, values, current animation, wire colors, logic symbols) and Clear sit together at the right end of the toolbar. Below 900 px Components and the inspector slide in over the circuit.
- Files are saved as `.ppcir` (the same JSON document; `format` stays `"panphy-circuits"`). Open also accepts `.json` files from earlier versions. iPhone and iPad get an unfiltered file picker because they grey out unknown extensions.
- File → Export to PanPhyMD opens a new tab with the current view embedded as an SVG data URI. The handoff uses the URL fragment, like PanPhyTrack → PanPhyPlot, and appends the image to any saved PanPhyMD draft. The image keeps the current theme and readings and needs no external image file.
- Tidy up (`layout.tidy`) works on the current view only and never changes a connection. It always fits the circuit into view afterward, even if the layout is already tidy. Circuits built from two-terminal parts in series and parallel (`layout.seriesParallel`) get the textbook layout (`layoutSeriesParallel`): each circuit a rectangle with its source centered on top and the rest along the bottom with equal gaps (in a series loop of three or more, the end parts stand on the sides; on the bench only parts with a lead at each end do, and meters are never turned on the bench, nor the oscilloscope in either view), parallel branches stacked between rails with meters below, separate circuits side by side, and wires given bends at the drawing's corners. Anything else (three-terminal parts, bridges, loose ends) uses a local search over moves, turns, mirrors and swaps scored by `layout.tidyCost`, then spreads small circuits to a minimum size, lines up and spaces runs (`distributeRuns`) and separates overlaps. A tidy that would leave more overlaps, crossings or wires over parts keeps the original layout.
- Opening the graph switches on “Plot on graph” for the selected meters, or for every meter when none is selected and none is plotted yet.
- Text that changes while the app runs (run state, time, graph legend values, problems count) and the view toggle (two equal halves) sits in fixed-width boxes so nothing shifts; keep it that way when adding live readouts.
- A fuse blows in `blowFuses` (app.js) after any solve that puts more than its rating through it; it stays blown (saved with the circuit, not undone) until “Blown” is switched off. The motor's rotor and the loudspeaker's cone animate with CSS, so they show while time is paused; the loudspeaker sounds only while time runs with an AC source.
- Junction dots in the circuit diagram are drawn where lines actually branch (three or more line directions meeting, counting part leads), not from wire counts. A selected ammeter, voltmeter or oscilloscope shows its display large in the inspector, above its readings: the meter's own bench artwork (so it looks like the part) or the scope screen. Pin keeps a display at the top of the inspector while other parts are selected, in a separately scrollable area capped at 45% of the inspector height so readings and controls remain accessible (`app.pinned`, not saved; `ui.renderLive`). The thermistor's and LDR's bench badges are sliders: drag across them to set temperature or illumination (an `upright` slider actuator that stays horizontal however the part is turned).
- DC and AC supplies have a draggable voltage slider on the bench front panel (0–30 V in 0.5 V steps). Their inspector keeps precise numeric entry alongside voltage sliders and a logarithmic AC frequency slider.
- Each oscilloscope display has an Auto scale toggle for the vertical axis only. Each channel fits the visible sample window using 1–2–5 volts/div steps with headroom; the inspector, pinned displays and both workspace views share the calculation. Time/div stays unchanged, and turning auto scale off restores the saved manual volts/div settings.
- Model notes for each component are shown in its inspector.

## Tests

```sh
node --test tools/panphycircuits/tests/*.test.cjs
```

`solver.test.cjs` compares the solver with hand calculations (series/parallel, bridge, switches, polarity, shorts, conflicting sources, RC against the exponential, diode, LED, lamp, transistors, every gate truth table, latch, AC r.m.s.). `model.test.cjs` covers terminal mapping, rotation, junction splitting, view sync, examples and import safety. `scope-scale.test.cjs` covers automatic scope scaling, manual restoration and saved settings. All run on every pull request (`.github/workflows/checks.yml`).

## Requirement checklist

Done: both views fully editable and synchronized; Tidy up and Clear circuit; core components (including fuse, motor and loudspeaker) and the extensions (capacitors, NPN/PNP, seven gates, logic I/O and rails, oscilloscope, AC supply, two-way switch); wiring with bends, junctions, reconnecting ends and crossing hops; undo/redo; meters and inspector readings; graph; 11 examples; autosave with a continue-or-clean start dialog, .ppcir import/export, SVG/PNG export; light/dark themes; keyboard shortcuts; tablet layout.

Not done / limitations: no thermal lag in lamps, no reverse breakdown, no transistor Early effect or capacitance, no gate propagation delay; logic modules share one hidden 5 V supply; phone-width layout works but is cramped.
