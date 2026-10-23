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
- **Phone titles.** Unbounded is wide, so check app titles at 375px and add a phone font-size rule after the Spectrum rules if they wrap more than before.
- **Checking update prompts.** A test origin's old cache can be refreshed with new files, which hides changes in the browser's version maps. Compare the per-app versions of `main` and the branch from the files instead, using the hashing in `computeAppVersions` (`sw.js`).
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
| PanPhyPlot (`tools/panphyplot.html`, `manual.html`, `math_ref.html`) | done | [#1251](https://github.com/panphy/panphy.github.io/pull/1251) | `theme.css` keeps only app tokens; the sandbox overrides are at the end of `panphyplot.css`, the tour title in `tour.css`. The manual and math reference load `design.css`, with Unbounded headings resized and a spectrum line under the top bar. `plot.js` reads `--font-body` and `--font-mono`. No live changes since `4911e187`. The manual screenshots still show the old design; recapture them as `tools/panphyplot/manual/README.md` describes. |
| Ripple Tank (`simulations/ripple_tank.html`) | done | [#1251](https://github.com/panphy/panphy.github.io/pull/1251) | Promoted the sandbox copy (no live changes since `4911e187`). Added a phone rule: Unbounded title 0.9rem and menu heading 1.2rem at 640px and below. |

## Phase 2: Tools

| App | Status | PR | Notes |
| --- | --- | --- | --- |
| PanPhyMD (`tools/panphymd.html`) | done | [#1252](https://github.com/panphy/panphy.github.io/pull/1252) | Tokens mapped as in PanPhyPlot; app bar and Present buttons are solid (no blur); `.offline-font` now falls back to Figtree, not Manrope; print colours updated. The document's own "Default" preview and export font stays Manrope: it is content, not UI, so changing it is the owner's call. |
| Motion Tracker (`tools/motion_tracker.html`) | done | [#1252](https://github.com/panphy/panphy.github.io/pull/1252) | Tokens mapped as in PanPhyPlot; solid app bar. Chart.js and the video-overlay labels read `--font-body`. Series colours unchanged. |
| Sound Analyzer (`tools/sound_analyzer.html`) | done | [#1252](https://github.com/panphy/panphy.github.io/pull/1252) | Inline tokens mapped onto the shared ones; wave, marker and channel line colours unchanged. Frequency-axis labels now in IBM Plex Mono. |
| Tone Generator (`tools/tone_generator.html`) | done | [#1252](https://github.com/panphy/panphy.github.io/pull/1252) | Inline tokens mapped onto the shared ones; channel and combined line colours unchanged. Still fits a 1280×720 window without scrolling. |

## Phase 3a: Wave and mechanics simulations

| App | Status | PR | Notes |
| --- | --- | --- | --- |
| Superposition (`simulations/superposition.html`) | done | PR_LINK | Same banner layout as the Ripple Tank: tokens mapped, solid banner, plain Unbounded title, spectrum line. Wave colours unchanged. |
| Standing Wave (`simulations/standing_wave.html`) | done | PR_LINK | As Superposition. String and gold node colours unchanged. |
| Collision Lab (`simulations/collision.html`) | done | PR_LINK | Tokens mapped as in PanPhyMD. App bar, toolbar dock and data panel are solid over the live view; the ball-selection scrim keeps its light blur, like modal backdrops. The red-orange walls outline keeps its meaning. A 9px horizontal overflow at 375px is pre-existing on `main`. |
| Lorentz (`simulations/lorentz.html`, `lorentz_learn.html`) | done | PR_LINK | Both pages share the `lorentz` update group. Diagram colours unchanged; canvas labels now use `--font-body` and ticks `--font-mono` (was Arial), redrawn once fonts load. Learn page: sticky banner made solid, headings resized, plain h1, and a phone rule so the title no longer pushes the buttons off screen. |

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
| Shared assets | todo | | Check `theme-toggle.css` and `fullscreen-button.css` against the design. The update banner from `assets/sw-register.js` still uses the old orange button. `assets/theme.js` still sets `theme-color` to the old cream and dark values (`#F8F6F1`, `#111110`) at runtime; switch them to the Spectrum `--bg` values (`#F5F6FA`, `#07080C`) once every app is migrated, since it is a shared file. Drop Manrope and DM Serif from the caches and `fonts.css` only if no page still uses them. |
| READMEs and project rules | todo | | Update the affected READMEs. Remove the `ROLLOUT.md` pointer from `CLAUDE.md` and `AGENTS.md`. |
| Remove the sandbox | todo | | Delete `beta/new_design_trials/` and its `beta/index.html` entry. Mark every line here done first; the finished tracker stays in git history, or ask the owner whether to keep it elsewhere. |
