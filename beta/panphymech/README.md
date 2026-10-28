# PanPhyMech (beta)

Dry tabletop mechanics sandbox. Entry: `beta/panphymech.html` (listed on `beta/index.html`). Network-only beta page — no root service-worker registration.

## What this beta does

- **Tabletop stage** with Three.js lighting and shadows; physics stays **2D** (Matter.js)
- **Hold / throw**: press a body to pick it up, release to drop with a bit of your throw
- **Parts tray**: Sphere, Block, Plank; **Pin** (world hinge); **Spring** (two-click connect)
- **Inspector** (right-click / long-press): density, friction, bounce, fixed
- Examples: Drop & bounce, Stack, Spring mass, Pendulum, Empty table

Lengths use \(1\,\mathrm{m} = 80\,\mathrm{px}\). Gravity is \(9.81\,\mathrm{m/s^2}\) mapped through Matter’s default Verlet scale.

## Local checks

```sh
node --test beta/panphymech/tests/*.test.cjs
```

Serve the repo root (`python3 -m http.server 8000`) and open `/beta/panphymech.html`.

## Future improvements (not in this beta)

Kept here so the roadmap stays visible while the prototype stays small:

- Strings / ropes, ideal and non-ideal pulleys
- Fluid tank with buoyancy and Stokes drag \(\mathbf{F} = -6\pi\eta r \mathbf{v}\)
- Hollow / solid mass-distribution presets
- In-app graph and CSV / PanPhyPlot export (same pattern as PanPhyCircuits)
- Pairwise **Coulomb** forces and a **Millikan**-style preset (uniform \(E\)-field + Stokes fluid) — intentionally deferred
- Scene file save/open, undo/redo, touch polish

## Editing

| Path | Role |
| --- | --- |
| `js/scene.js` | Three.js tabletop, materials, sync from Matter |
| `js/physics.js` | Matter world, grab, pin, spring |
| `js/units.js` | Scale helpers (unit-tested) |
| `js/registry.js` | Tray part definitions |
| `js/examples.js` | Starter scenes |
| `js/ui.js`, `js/app.js` | Tray, inspector, interaction |
| `css/app.css` | Shell |
