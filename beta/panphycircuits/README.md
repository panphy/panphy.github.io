# PanPhyCircuits (beta)

A circuit builder and simulator for GCSE and IB Physics. Entry point: `beta/panphycircuits.html`. Plain HTML, CSS and classic scripts; no build step. As a beta page it has no service worker and is not in the homepage catalog.

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
- The simulation always starts paused, after loading an example, a file or the autosave. Run advances time in fixed steps (automatic step ≈ RC/100, AC period/100); Pause freezes time but edits still update readings; Reset returns to t = 0 and pauses. Switching views never touches the simulation. Saved files and autosave hold the circuit, not the live state.
- When an autosaved circuit exists, a start dialog offers to continue it or start with a clean canvas (undoable).
- Files are saved as `.ppcir` (the same JSON document; `format` stays `"panphy-circuits"`). Open also accepts `.json` files from earlier versions. iPhone and iPad get an unfiltered file picker because they grey out unknown extensions.
- Tidy up (`layout.tidy`) works on the current view only: it snaps parts to the grid, lines up parts whose connected terminals nearly line up (within 30 units, when the leads suit a straight or U-shaped link), separates overlaps and clears all wire bends so wires are rerouted. Connections never change.
- Opening the graph switches on “Plot on graph” for the selected meters, or for every meter when none is selected and none is plotted yet.
- Text that changes while the app runs (run state, time, graph legend values, problems count) sits in fixed-width boxes so nothing shifts; keep it that way when adding live readouts.
- Model notes for each component are shown in its inspector.

## Tests

```sh
node --test beta/panphycircuits/tests/*.test.cjs
```

`solver.test.cjs` compares the solver with hand calculations (series/parallel, bridge, switches, polarity, shorts, conflicting sources, RC against the exponential, diode, LED, lamp, transistors, every gate truth table, latch, AC r.m.s.). `model.test.cjs` covers terminal mapping, rotation, junction splitting, view sync, examples and import safety. These are not yet in `.github/workflows/checks.yml`.

## Requirement checklist

Done: both views fully editable and synchronized; Tidy up and Clear circuit; core components and the extensions (capacitors, NPN/PNP, seven gates, logic I/O and rails, oscilloscope, AC supply, two-way switch); wiring with bends, junctions, reconnecting ends and crossing hops; undo/redo; meters and inspector readings; graph; 11 examples; autosave with a continue-or-clean start dialog, .ppcir import/export, SVG/PNG export; light/dark themes; keyboard shortcuts; tablet layout.

Not done / limitations: no thermal lag in lamps, no reverse breakdown, no transistor Early effect or capacitance, no gate propagation delay; logic modules share one hidden 5 V supply; phone-width layout works but is cramped.
