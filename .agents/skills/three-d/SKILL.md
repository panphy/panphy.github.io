---
name: three-d
description: Conventions for Three.js and WebGL scenes in PanPhy Labs apps and teaching decks (procedural glows, dots, shadows and masks, canvas textures, and sizing a canvas in a flex layout). Use when writing or changing a 3D simulation, a WebGL figure or a deck's 3D model.
---

# Three.js and WebGL

- Generate procedural WebGL glows, dots, shadows and masks with `/assets/three-textures.js` (`radialTexture`, `rgbaTexture`), never a 2D canvas: Safari's fingerprinting protection can speckle canvas-to-WebGL uploads.
- Reserve `CanvasTexture` for text labels and dynamic displays, and keep 2D radial-gradient drawings in modules that upload no canvas textures. `check.mjs` rejects simulation and shared-asset modules that combine `CanvasTexture` and `createRadialGradient`.
- Cache `/assets/three-textures.js` and list it in each consuming app's offline requirements (skill `service-worker`).
- For flex-based Three.js canvases, use `renderer.setSize(w, h, false)` with CSS `height: 0; flex: 1; min-height: 0` to avoid sizing feedback loops.
- Keep 3D scene colors unless they clash in dark mode, and refresh scenes on `panphy:theme-change` (root `AGENTS.md`, Theme).
- In `ibdpphy/` decks, typeset the math in a 3D model's HTML labels as LaTeX, like the rest of the slide (`ibdpphy/AGENTS.md`).
