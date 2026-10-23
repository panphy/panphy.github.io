# New design trials (sandbox)

A sandbox for the **Spectrum** design system: one shared file of fonts, colors and components, tried on the homepage and two pilot apps before any rollout. Nothing here changes the live site.

Open `/beta/new_design_trials/` and follow the PanPhyPlot and Ripple Tank cards.

## Layout

The folder mirrors the site root, so each file sits at the path it will take on promotion.

| Sandbox file | Promotes to | Notes |
| --- | --- | --- |
| `assets/design.css` | `/assets/design.css` | Shared tokens and `ds-` components. Font URLs are relative, so it moves together with `fonts/`. |
| `assets/fonts/*` | `/assets/fonts/` | Figtree and Unbounded (latin, latin-ext), with their OFL licenses. IBM Plex Mono is already in `/assets/fonts/`. |
| `index.html` | `/index.html` | Homepage in the new design. |
| `tools/panphyplot.html` | `/tools/panphyplot.html` | Loads the live scripts and the live `panphyplot.css`, followed by the files below. |
| `tools/panphyplot/css/theme.css` | `/tools/panphyplot/css/theme.css` | Replaces the live file and holds only PanPhyPlot-specific names. |
| `tools/panphyplot/css/design-overrides.css` | fold into `/tools/panphyplot/css/panphyplot.css` (the `.tour-title` rule into `tour.css`) | Component changes: app bar line, Unbounded headings, pill buttons, tour title. |
| `simulations/ripple_tank.html` | `/simulations/ripple_tank.html` | Full copy, because the app keeps its CSS and scripts in one page. |

Baseline: the pilot pages were copied from `main` at `4911e187`. If a live page changes before promotion, carry the change over or copy it again.

## Design rules

The pages so far read only the tokens; the `ds-` component classes in `design.css` are not used yet, and the next app to adopt the design should try them.

- **Fonts:** Figtree for reading, Unbounded only for page and app titles, IBM Plex Mono for numbers and readouts.
- **Colors:** blue `--accent` for interaction and red-orange `--brand` for PanPhy itself.
- **Spectrum:** `--spectrum` is decoration only (a thin line, one title). Never use it to encode data.
- **Panels:** apps use solid panels. Glass blur is kept for the homepage only, where nothing live moves behind it.
- **Theme:** light and dark follow the shared `panphy-theme` preference, through `/assets/theme.js`, as everywhere else.

## Sandbox rules

- **Beta rules:** no service-worker registration or caching, `noindex`, one entry in `beta/index.html`.
- **Saved data:** the trial PanPhyPlot shares saved projects with the live app, because both run on the same site.
- **Links:** the sandbox points its home links, the PanPhyPlot tour link and the two pilot cards at the sandbox. Everything else opens the live site.

## Promotion checklist

1. Move `assets/design.css` and `assets/fonts/*` to `/assets/`.
2. Load `/assets/design.css` after `/assets/fonts/fonts.css` and before app CSS in every page that adopts it, including `tools/panphyplot/manual.html` (it shares `theme.css`).
3. PanPhyPlot:
   - Replace `theme.css` and fold in `design-overrides.css`.
   - Remove the sandbox `<link>` lines and the `· Design Trial` title.
   - Restore `sw-register.js`.
4. Ripple Tank and the homepage:
   - Move the files into place.
   - Point the `/beta/new_design_trials/…` links back to the live paths.
   - Restore `sw-register.js` and remove `noindex` and the trial titles.
5. PanPhyPlot's graph fonts are set in `tools/panphyplot/js/plot.js` (Manrope, IBM Plex Mono). Read `--font-body` there, or change Manrope to Figtree.
6. Add the new fonts and `design.css` to `ASSETS_TO_CACHE`, add them to the homepage offline requirements, and bump `BUILD_ID`.
7. Update the design rules in `CLAUDE.md` and `AGENTS.md`, and the affected READMEs.
8. Delete this folder and its `beta/index.html` entry.
