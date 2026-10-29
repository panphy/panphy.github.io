# PanPhyMech

A 2D mechanics sandbox in the style of Algodoo, in beta. Entry point: `beta/panphymech.html`, listed in `beta/index.html`. Plain HTML, CSS and classic scripts on the global `PPM` namespace; no build step. It loads no service worker and is network-only while in `beta/`.

Objects (ball, box, plank, polygon, ramp, wall) and connectors (spring, rod, rope, hinge, motor, glue) go on a canvas in SI units. Play runs the physics; the graph shows position, velocity or energy of one object, a spring or the whole system, with CSV and PanPhyPlot export.

## Structure

| File | Role |
| --- | --- |
| `js/vendor/planck.min.js` | [Planck.js](https://github.com/piqnt/planck.js) 1.5.0 (MIT, `planck-LICENSE.txt`), a JavaScript port of Box2D |
| `js/scene.js` | The document: objects and connectors, geometry, rigid groups for editing, file validation |
| `js/physics.js` | Builds a Planck world from the scene; springs and air resistance as explicit forces; readings and energies |
| `js/examples.js` | Example experiments, each built in code |
| `js/render.js` | Canvas drawing: grid, floor, objects, connectors, trails, vectors, handles |
| `js/editor.js` | Pointer interaction: placing, connecting, moving, rotating, resizing, re-attaching connectors, the delete cross, right-click and touch-and-hold settings, grabbing, panning, zooming |
| `js/graph.js` | The sample recorder, the time graph, CSV and PanPhyPlot export |
| `js/ui.js`, `js/app.js` | Panels, inspector and quick settings; state, run loop, undo, autosave, fitting the view, files and shortcuts |

Run the physics checks with `node --test beta/panphymech/tests/*.test.cjs`. They compare free fall, projectile range, spring and pendulum periods, an elastic collision, a block on a ramp and terminal velocity with textbook results, and run every example.

## Physics model

- The scene is the setup at t = 0. Play builds a world from it; Reset rebuilds it. Editing the setup after time has run (moving, resizing, adding or deleting anything) first makes the current state the new start, with one undo step back to the old one. Parameters (mass, friction, restitution, drag, spring and motor settings, gravity) apply immediately without restarting.
- Steps are 1/240 s, shortened so the stiffest spring has ω·h ≤ 0.05. Springs follow Hooke's law with optional linear damping; air resistance is F = kv². Both are applied as forces before each step, so their energy bookkeeping is exact up to the integrator.
- Box2D keeps a 1 cm skin round polygons, so resting contacts settle about 15 mm apart (5 mm for a ball on a polygon). Objects placed on the floor and those in the examples sit at this gap (`S.REST_GAP`) so they do not pop up when time starts.
- Planck mixes friction as √(μ₁μ₂) and restitution as the larger of the pair. Collisions slower than 0.25 m/s are inelastic so resting contacts stay quiet. Sleeping is off, so slow motion is never frozen.
- Joints: rod = rigid distance joint, rope = rope joint (maximum length), hinge and motor = revolute joint (link end `a` turns relative to `b`; positive speed is counterclockwise; the inspector sets a direction, stored in `dir`, and a speed size, and `speed` keeps the signed value), glue = weld joint. A connector end with no object is fixed to the background at a world point.
- Gravitational energy is m g (y − y₀), with y₀ set in the World card (0 by default). Energies cover moving objects only.
- The recorder samples every moving object and spring each 0.01 s of simulated time, halving its rate after 24 000 samples, so the graph can switch objects after a run.

## Storage

The scene autosaves to `panphy-mech-scene-v1` and display choices to `panphy-mech-prefs-v1` in browser storage. Files are `.ppmech` JSON with `format: "panphy-mech"`.

## Promoting it

The page already follows the published-app conventions (shared theme, Spectrum design, fonts, math labels, copyright), so promotion is mostly moving files:

1. Move `beta/panphymech.html` to `simulations/panphymech.html` and this folder to `simulations/panphymech/`; relative paths stay valid. Remove the entry from `beta/index.html` and update the test path in `.github/workflows/checks.yml`.
2. Remove `<meta name="robots" content="noindex">`; add the canonical link and the discovery metadata used by other apps; add the page to `index.html` and `sitemap.xml`.
3. Add `<script src="/assets/sw-register.js" defer></script>`, add the page, its CSS and JS files (including the vendored Planck) to `ASSETS_TO_CACHE` in `sw.js`, add its offline requirements (with `/assets/math.js` and the pinned MathJax URL) to `OFFLINE_CARD_REQUIREMENTS` in `index.html`, and bump `BUILD_ID`.
