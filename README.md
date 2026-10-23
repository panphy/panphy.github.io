# PanPhy Labs

[Open PanPhy Labs](https://panphy.app/)

Browser-based physics tools, simulations, classroom utilities and games. Students and teachers on school-managed devices often cannot install software, so everything runs in the browser.

## Explore

- **Tools:** [PanPhyMD](tools/panphymd.html) for Markdown editing with linked or embedded local images (up to 5 MB each, with image data collapsed in the editor), [PanPhyPlot](tools/panphyplot.html) for column-based data processing, graph plotting and curve fitting, best on tablets and computers (small screens can continue after a warning), [Motion Tracker](tools/motion_tracker.html) for manual or automatic video tracking of position and velocity, with Manual, Auto and Edit modes, individual mark deletion, undo/redo and a filming-rate reminder for slow motion, [Sound Analyzer](tools/sound_analyzer.html) for microphone spectra, waveform timing and CSV snapshots, and [Tone Generator](tools/tone_generator.html) for mixing two sine waves with phase control and left/right panning for each wave. Both audio tools use the shared workbench style and theme controls.
- **Simulations:** [Virtual Ripple Tank](simulations/ripple_tank.html), [Wave Superposition](simulations/superposition.html), [Standing Wave](simulations/standing_wave.html), [Collision Lab](simulations/collision.html), [States of Matter](simulations/states.html), [Atomic Models](simulations/atomic_models.html), [Nuclear Decay](simulations/nuclear_decay.html), [Fission and Fusion](simulations/fission_fusion.html), [Electric Motors](simulations/electric_motors.html), [Charges in Fields](simulations/charges_in_fields.html), [Life Cycle of a Star](simulations/star_life_cycle.html), and [Lorentz Transform](simulations/lorentz.html).
- **Teacher utilities:** [Exam Timer](for_teachers/timer.html) and [Camera Visualizer](for_teachers/visualizer.html).
- **Games and demos:** [Spellwave](fun/spellwave.html) and [ASCII Camera](fun/ascii_cam.html).

## Curriculum hubs

Two hubs hold the author's course resources: teaching decks, workbooks, revision material and lesson starters. They are public but sit outside the homepage catalogue, reached by direct link. Teachers and students are welcome to use them in lessons and study; see [Licence](#licence) for reuse.

- **[GCSE Physics](https://panphy.app/gcsephy/):** course summaries of AQA Physics 8463 and the physics in Combined Science: Trilogy 8464, AO1 starters and revision resources, then teaching decks and workbook hubs for Years 9 to 11. Each unit folder, `gcsephy/course-summary/` and `gcsephy/do-now/` has its own README; [teaching deck styles and controls](gcsephy/decks/README.md) are documented separately.
- **[IB DP Physics](https://panphy.app/ibdpphy/):** the IB Diploma Programme Physics course (first assessment 2025). See the [folder overview](ibdpphy/README.md).

## Offline use

Most published tools and simulations work offline once cached: visit online first and check the homepage's **Offline Ready** indicator. Updates appear through an update prompt, shown only in apps whose own or shared files changed. Shared fonts in `assets/fonts/` are precached (about 297 KB).

Pages under `fun/`, `beta/`, `misc/`, `gcsephy/` and `ibdpphy/` need internet access, as do Supabase features such as leaderboards. `gcsephy/` registers its own small worker (`gcsephy/sw.js`), which stores nothing and only revalidates requests so edits appear on the next load; a page that is already open offers a Reload banner when its files or its question bank change. `ibdpphy/` has a copy of the same worker for its own scope.

## Repository map

| Path | Contents |
| --- | --- |
| `index.html` | General app catalogue with topic filters (cards use `data-topic`) and offline readiness indicators |
| `sw.js`, `manifest.json` | Caching, updates, and PWA configuration |
| `assets/` | The shared Spectrum design system (`design.css`), shared controls, icons, locally hosted fonts, and service-worker registration |
| `tools/`, `simulations/`, `for_teachers/` | Published educational apps |
| `fun/` | Network-only games and demos; Spellwave's text-logic tests run with `node --test fun/spellwave/tests/*.test.mjs` |
| `beta/` | Trial apps, listed in `beta/index.html` |
| `misc/` | Unlisted resources, including the phone-compatible introductory [PanPhyPlotOG](misc/panphyplotog.html), inventoried in `misc/index.html` |
| `gcsephy/` | GCSE Physics curriculum resources, course summaries and the Do Now starters, inventoried in `gcsephy/index.html` |
| `ibdpphy/` | IB DP Physics teaching decks, inventoried in `ibdpphy/index.html` |
| `.github/` | Repository automation: `workflows/checks.yml` runs `scripts/check.mjs` and the app tests (including Sound Analyzer timing and keyboard regressions) on every pull request; `workflows/supabase-keepalive.yml` pings Supabase twice a week |

## Licence

Copyright © 2026 PanPhy Labs. All rights reserved. The source is public to read but is not open source: copying, adapting or republishing the code or content needs written permission. Third-party libraries, fonts and credited images keep their own licences. See [`LICENSE`](LICENSE).

## Contact

- [Email PanPhy Labs](mailto:panphylabs@icloud.com)
- [Support the project](https://buymeacoffee.com/panphy)
