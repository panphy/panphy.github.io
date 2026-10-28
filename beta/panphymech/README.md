# PanPhyMech (beta)

A 2D mechanics sandbox prototype. Entry: `beta/panphymech.html` (listed on `beta/index.html`). Network-only beta page — no root service-worker registration.

## What this prototype does

- Circuits-style shell: **Parts** library, world stage, **Inspector**
- Rigid bodies via [Matter.js](https://brm.io/matter-js/) (CDN): circle, box, ramp, wall
- **Fluid** regions with:
  - buoyancy from submerged area and fluid density \(\rho\)
  - Stokes drag \(\mathbf{F} = -6\pi\eta r \mathbf{v}\) (classroom sphere law; boxes use an equal-area radius)
- Examples: float/sink, Stokes terminal speed, ramp into a pool
- Pause / resume, clear, delete selection

Units are SI-like with \(1\,\mathrm{m} = 60\,\mathrm{px}\) and \(g = 9.81\,\mathrm{m\,s^{-2}}\). Default fluid viscosity is glycerin-like so Stokes terminal speeds are easy to see.

## Local checks

```sh
node --test beta/panphymech/tests/*.test.cjs
```

Serve the repo root (`python3 -m http.server 8000`) and open `/beta/panphymech.html`.

## Future improvements (not in this beta)

Kept here so the roadmap stays visible while the prototype stays small:

- Springs, hinges/pins, ropes, ideal and non-ideal pulleys
- Hollow / solid mass-distribution presets
- In-app graph and CSV / PanPhyPlot export (same pattern as PanPhyCircuits)
- Pairwise **Coulomb** forces and a **Millikan**-style preset using a uniform \(E\)-field region plus Stokes fluid (buoyancy + \(6\pi\eta r v\)) — intentionally deferred
- Scene file save/open, undo/redo, touch polish

## Editing

| Path | Role |
| --- | --- |
| `js/fluid.js` | Buoyancy and Stokes math (no Matter dependency; unit-tested) |
| `js/world.js` | Matter world, spawn helpers, fluid force hook, overlay draw |
| `js/registry.js` | Library part definitions |
| `js/examples.js` | Starter scenes |
| `js/ui.js`, `js/app.js` | Panels and interaction |
| `css/app.css` | Layout |
