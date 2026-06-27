# Circuit Builder Plan

## Goal

Build a browser-based electricity lab for PanPhy Labs where students can assemble simple DC circuits and see voltage, current, resistance, power, and energy relationships update live.

Status: Beta feature set implemented in `/beta/circuit_builder.html`; promotion is still gated by classroom usefulness.

## MVP

- [x] Create `/beta/circuit_builder.html`.
- [x] Add the page to `beta/index.html`.
- [x] Use plain HTML, CSS, and JavaScript only.
- [x] Keep it network-free and do not register a service worker while in `/beta`.
- [x] Build a simple workspace with a component tray and interactive SVG circuit canvas.
- [x] Define circuit symbols as inline SVG `<symbol>` elements and place them with `<use>`.
- [x] Use SVG `<line>` or `<path>` elements for wires.
- [x] Wrap placed symbols in SVG `<g>` elements for selection, movement, and rotation.
- [x] Keep the circuit graph model in JavaScript; treat SVG as the view only.
- [x] Support these components first:
  - [x] Cell / battery with adjustable voltage.
  - [x] Resistor with adjustable resistance.
  - [x] Lamp as a resistor with brightness based on power.
  - [x] Switch open / closed.
  - [x] Wire segments.
  - [x] Ammeter.
  - [x] Voltmeter.
- [x] Support series and parallel DC circuits.
- [x] Calculate equivalent resistance, branch currents, voltage drops, total power, and component power.
- [x] Show impossible or incomplete circuits clearly:
  - [x] Open circuit.
  - [x] Short circuit.
  - [x] Floating branch.
  - [x] Meter connected incorrectly.
- [x] Add reset and a few presets:
  - [x] Series resistors.
  - [x] Parallel resistors.
  - [x] Lamp with switch.
  - [x] Voltmeter across a component.
  - [x] Ammeter in series.

## Interaction

- [x] Prefer click-to-place and click-to-connect before drag-and-drop.
- [x] Use a snap grid so circuit diagrams stay tidy.
- [x] Let users select a component and edit values in a side panel.
- [x] Show current direction with subtle animated arrows.
- [x] Show voltage/current readouts next to components and meters.
- [x] Style SVG states with CSS classes: selected, open switch, live current, fault, dim lamp, bright lamp.
- [x] Add keyboard basics: Escape to cancel, Delete to remove selected item.
- [x] Make touch targets large enough for classroom tablets.

## Physics Rules

- [x] Treat wires and ammeters as zero resistance for MVP.
- [x] Treat voltmeters as very high resistance for MVP.
- [x] Use ideal DC sources only.
- [x] Use Ohm's law and Kirchhoff rules.
- [x] Start with one battery per circuit.
- [x] Leave AC, capacitors, diodes, filament lamp curves, and internal resistance for later.

## Checks

- [x] Add one small self-check function with known circuit cases:
  - [x] 10 V across 5 ohm gives 2 A.
  - [x] 10 ohm + 10 ohm in series gives 20 ohm.
  - [x] 10 ohm || 10 ohm gives 5 ohm.
- [x] Test in a local static server with absolute paths.
- [x] Test desktop and mobile widths.
- [x] Check keyboard and touch operation.

## Promotion

- [ ] Promote only after the beta version is useful in class.
- [ ] Move to `/simulations/circuit_builder.html` or `/tools/circuit_builder.html`; likely `/simulations`.
- [ ] Add `/assets/sw-register.js`.
- [ ] Add the route and local assets to `ASSETS_TO_CACHE`.
- [ ] Add it to `OFFLINE_CARD_REQUIREMENTS` in `index.html`.
- [ ] Link it from `index.html`.
- [ ] Add it to `sitemap.xml`.
- [ ] Bump `BUILD_ID` in `sw.js` as the final step.

## Later

- [x] Save/load circuits as JSON.
- [x] Export diagram as PNG.
- [x] Add worksheet mode with hidden answers.
- [x] Add internal resistance.
- [x] Add non-ohmic lamp behavior.
- [x] Add capacitors and transient charging curves.
- [x] Add AC and oscilloscope view.
