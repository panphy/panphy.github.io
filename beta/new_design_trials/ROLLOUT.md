# Spectrum rollout tracker

This file tracks the move of every app on the homepage to the Spectrum design in `/assets/design.css`. Read it first when picking up the rollout.

## How to work through it

- **One phase at a time.** Ask the owner before starting each phase.
- **One branch and PR per phase.** Follow the finalize workflow in `CLAUDE.md`, and update this file in the same PR.
- **Status:** `todo`, `in progress` or `done`. Add the PR link when a line is done.
- **Adopting the design:** see `CLAUDE.md` (Code and interface conventions) and the pilots described in [`README.md`](README.md):
  - load `/assets/fonts/fonts.css`, then `/assets/design.css`, before the app's CSS;
  - map existing variable names onto the shared tokens;
  - change only the components that need it.
- **Verify each app** before its PR:
  - light and dark mode, at desktop width and at 375px;
  - no horizontal overflow and no console errors;
  - the main interaction actually used;
  - theme sync with another open tab;
  - the update prompt;
  - the app's tests, and `node .github/scripts/check.mjs --base origin/main`.

## Standing cautions

- **Shared files prompt everywhere.** `/assets/design.css` and `/assets/fonts/*` are shared files, so any edit to them changes every offline app's version, and every app prompts to update. Batch edits to them, and expect a prompt in every app whenever one lands.
  - Phase 0 is the first such change, so every registered app prompts once after it deploys.
  - For "the update prompt appears for the changed app only", test with edits to the app's own files.
- **Fonts stay cached.** Keep the Manrope and DM Serif Display fonts in `ASSETS_TO_CACHE` and `OFFLINE_COMMON_ASSETS` until no app uses them, which is Phase 5 at the earliest. The gcsephy and ibdpphy decks load Figtree from `/assets/fonts/` with their own `@font-face` rules.
- **Two homepage lists.** The sandbox homepage (`index.html` here) keeps its own copy of `OFFLINE_COMMON_ASSETS` and `OFFLINE_CARD_REQUIREMENTS`. Keep it in step with the live `index.html` until Phase 5 replaces the homepage with it.
- **No clipping on cards.** Never use `overflow: hidden` to clip decorations on cards inside scrolling or flex columns.
- **Meaningful colors stay.** Leave colors that carry meaning and 3D scene colors alone, unless they clash in dark mode.

## Phase 0: Foundation

Nothing looks different.

| Item | Status | PR | Notes |
| --- | --- | --- | --- |
| Move `design.css` to `/assets/`; Unbounded fonts and OFL to `/assets/fonts/` | done | [#1250](https://github.com/panphy/panphy.github.io/pull/1250) | Figtree was already in `/assets/fonts/` (byte-identical, added for the decks), so the sandbox copies were removed. |
| Cache `design.css`, Figtree and Unbounded; add them to the homepage common offline assets | done | [#1250](https://github.com/panphy/panphy.github.io/pull/1250) | Both the live and the sandbox homepage lists. The OFL `.txt` files are not cached, as before. |
| Spectrum house style in `CLAUDE.md` and `AGENTS.md` | done | [#1250](https://github.com/panphy/panphy.github.io/pull/1250) | Replaces the PanPhyPlot-style rule. It names this file for unmigrated apps, so update that line in Phase 5. |
| Sandbox pages load `/assets/design.css` | done | [#1250](https://github.com/panphy/panphy.github.io/pull/1250) | Homepage, PanPhyPlot and Ripple Tank trials. |

## Phase 1: Pilots

| App | Status | PR | Notes |
| --- | --- | --- | --- |
| PanPhyPlot (`tools/panphyplot.html`, `manual.html`, `math_ref.html`) | todo | | Follow the README promotion checklist. Replace `theme.css`, fold `design-overrides.css` into `panphyplot.css` and `tour.css`. The manual and math reference share `theme.css`, so they need `design.css` too. Make `js/plot.js` read the font tokens instead of hard-coding Manrope and IBM Plex Mono. Carry over live changes made since `4911e187`. Run `node --test tools/panphyplot/tests/*.test.cjs misc/panphyplotog/tests/regression.test.cjs`. |
| Ripple Tank (`simulations/ripple_tank.html`) | todo | | Single-file app; the sandbox page is a full copy. Diff the live page against `4911e187` and carry changes over. Restore `sw-register.js`, the live links and the title; remove `noindex`. |

## Phase 2: Tools

| App | Status | PR | Notes |
| --- | --- | --- | --- |
| PanPhyMD (`tools/panphymd.html`) | todo | | CSS in `tools/panphymd/css/`; has local tests in `tools/panphymd/tests/`. |
| Motion Tracker (`tools/motion_tracker.html`) | todo | | CSS in `tools/motion_tracker/css/`; tests run in CI. |
| Sound Analyzer (`tools/sound_analyzer.html`) | todo | | Has local tests in `tools/sound_analyzer/tests/`. Keep spectrum/plot colors that encode data. |
| Tone Generator (`tools/tone_generator.html`) | todo | | Single-file app. |

## Phase 3a: Wave and mechanics simulations

| App | Status | PR | Notes |
| --- | --- | --- | --- |
| Superposition (`simulations/superposition.html`) | todo | | Single-file app. Wave colors carry meaning. |
| Standing Wave (`simulations/standing_wave.html`) | todo | | Single-file app. |
| Collision Lab (`simulations/collision.html`) | todo | | CSS in `simulations/collision/styles.css`. |
| Lorentz (`simulations/lorentz.html`) | todo | | Has its own update group (`lorentz`) in `sw.js` and `assets/sw-register.js`, covering `lorentz_learn.html` too; restyle both together. |

## Phase 3b: The remaining simulations

These apps share one layout (`app.js`, `content.js`, `style.css` in a folder named after the app), so the first one sets the pattern for the rest. All of them draw Three.js scenes, whose colors stay; size canvases as `CLAUDE.md` describes.

| App | Status | PR | Notes |
| --- | --- | --- | --- |
| States of Matter (`simulations/states.html`) | todo | | Also has `physics.js`. Particle colors carry meaning. |
| Electric Motors (`simulations/electric_motors.html`) | todo | | |
| Charges in Fields (`simulations/charges_in_fields.html`) | todo | | Charge colors carry meaning. |
| Atomic Models (`simulations/atomic_models.html`) | todo | | Particle colors carry meaning. |
| Nuclear Decay (`simulations/nuclear_decay.html`) | todo | | Particle colors carry meaning. |
| Fission and Fusion (`simulations/fission_fusion.html`) | todo | | Particle colors carry meaning. |
| Star Life Cycle (`simulations/star_life_cycle.html`) | todo | | Also has `physics.js`. Star colors carry meaning. |

## Phase 4: For Teachers and Fun

| App | Status | PR | Notes |
| --- | --- | --- | --- |
| Timer (`for_teachers/timer.html`) | todo | | Single-file app. |
| Visualizer (`for_teachers/visualizer.html`) | todo | | Single-file app. |
| Spellwave (`fun/spellwave.html`) | todo | | Network-only: no `sw-register.js` and no caching. Source in `fun/spellwave/src/`; tests run in CI. |
| ASCII Cam (`fun/ascii_cam.html`) | todo | | Network-only: no `sw-register.js` and no caching. |

## Phase 5: Homepage and cleanup

| Item | Status | PR | Notes |
| --- | --- | --- | --- |
| Homepage (`index.html`) | todo | | Replace with the sandbox homepage. Point its links back to live paths, restore `sw-register.js`, remove `noindex` and the trial title. Carry over live homepage changes and offline-list edits made since the sandbox copy. |
| Shared assets | todo | | Check `theme-toggle.css` and `fullscreen-button.css` against the design. Drop Manrope and DM Serif from the caches and `fonts.css` only if no page still uses them. |
| READMEs and project rules | todo | | Update the affected READMEs. Remove the `ROLLOUT.md` pointer from `CLAUDE.md` and `AGENTS.md`. |
| Remove the sandbox | todo | | Delete `beta/new_design_trials/` and its `beta/index.html` entry. Mark every line here done first; the finished tracker stays in git history, or ask the owner whether to keep it elsewhere. |
