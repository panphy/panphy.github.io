# New design trials (sandbox)

The sandbox for the **Spectrum** design system. It now holds only the homepage in the new design; the rollout to every homepage app is tracked in [`ROLLOUT.md`](ROLLOUT.md).

- **Shared design:** `/assets/design.css`, with Figtree and Unbounded in `/assets/fonts/` (Phase 0).
- **Pilots:** PanPhyPlot and the Ripple Tank are live in the new design (Phase 1). The homepage cards here open the live apps.

## Files

| File | Promotes to | Notes |
| --- | --- | --- |
| `index.html` | `/index.html` | Homepage in the new design. Keeps its own copy of the offline asset lists; keep them in step with the live `index.html`. |

## Design rules

The house style is described in `CLAUDE.md` (Code and interface conventions). The `ds-` component classes in `/assets/design.css` are not used yet, and the next app to adopt the design should try them.

- **Colors:** blue `--accent` for interaction and red-orange `--brand` for PanPhy itself.
- **Homepage:** the only place with spectrum-colored title text and glass blur.

## Sandbox rules

- **Beta rules:** no service-worker registration or caching, `noindex`, one entry in `beta/index.html`.
- **Links:** every card and link opens the live site.

## Homepage promotion (Phase 5)

1. Move `index.html` into place and check that its links point at live paths.
2. Restore `sw-register.js`, and remove `noindex` and the trial title.
3. Carry over live homepage changes made since the sandbox copy.
4. Update the affected READMEs, then delete this folder and its `beta/index.html` entry.
