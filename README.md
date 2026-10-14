# PanPhy Labs

[Open PanPhy Labs](https://panphy.app/)

Browser-based physics tools, simulations, classroom utilities and games. Students and teachers on school-managed devices often cannot install software, so everything runs in the browser.

## Explore

- **Tools:** [PanPhyMD](tools/panphymd.html) for Markdown editing, [PanPhyPlot](tools/panphyplot.html) for graph plotting and curve fitting, [Motion Tracker](tools/motion_tracker.html), [Sound Analyzer](tools/sound_analyzer.html), and [Tone Generator](tools/tone_generator.html).
- **Simulations:** [Virtual Ripple Tank](simulations/ripple_tank.html), [Wave Superposition](simulations/superposition.html), [Standing Wave](simulations/standing_wave.html), [Collision Lab](simulations/collision.html), [States of Matter](simulations/states.html), [Atomic Models](simulations/atomic_models.html), [Nuclear Decay](simulations/nuclear_decay.html), [Fission and Fusion](simulations/fission_fusion.html), [Electric Motors](simulations/electric_motors.html), [Charges in Fields](simulations/charges_in_fields.html), [Life Cycle of a Star](simulations/star_life_cycle.html), and [Lorentz Transform](simulations/lorentz.html).
- **Teacher utilities:** [Exam Timer](for_teachers/timer.html) and [Camera Visualizer](for_teachers/visualizer.html).
- **Games and demos:** [Spellwave](fun/spellwave.html) and [ASCII Camera](fun/ascii_cam.html).

## Curriculum hubs

Two hubs hold the author's course resources: teaching decks, workbooks, revision material and lesson starters. They are public and open source but sit outside the homepage catalogue, reached by direct link. Teachers and students are welcome to use and adapt them.

- **[GCSE Physics](https://panphy.app/gcsephy/):** AO1 starters and revision resources, followed by teaching decks and workbook hubs for Years 9 to 11. Each unit folder and `gcsephy/do-now/` has its own README; [teaching deck styles and controls](gcsephy/decks/README.md) are documented separately.
- **[IB DP Physics](https://panphy.app/ibdpphy/):** the IB Diploma Programme Physics course (first assessment 2025). See the [folder overview](ibdpphy/README.md).

## Offline use

Most published tools and simulations work offline once cached: visit online first and check the homepage's **Offline Ready** indicator. Updates appear through an update prompt, shown only in apps whose own or shared files changed. Shared fonts in `assets/fonts/` are precached (about 336 KB).

Pages under `fun/`, `beta/`, `misc/`, `gcsephy/` and `ibdpphy/` need internet access, as do Supabase features such as leaderboards. `gcsephy/` registers its own small worker (`gcsephy/sw.js`), which stores nothing and only revalidates requests so edits appear on the next load; a page that is already open offers a Reload banner when its files or its question bank change. `ibdpphy/` has a copy of the same worker for its own scope.

## Repository map

| Path | Contents |
| --- | --- |
| `index.html` | General app catalogue with topic filters (cards use `data-topic`) and offline readiness indicators |
| `sw.js`, `manifest.json` | Caching, updates, and PWA configuration |
| `assets/` | Shared controls, icons, locally hosted fonts, and service-worker registration |
| `tools/`, `simulations/`, `for_teachers/` | Published educational apps |
| `fun/` | Network-only games and demos; Spellwave's text-logic tests run with `node --test fun/spellwave/tests/*.test.mjs` |
| `beta/` | Trial apps, listed in `beta/index.html` |
| `misc/` | Unlisted resources, inventoried in `misc/index.html` |
| `gcsephy/` | GCSE Physics curriculum resources and the Do Now starters, inventoried in `gcsephy/index.html` |
| `ibdpphy/` | IB DP Physics teaching decks, inventoried in `ibdpphy/index.html` |
| `.github/` | Repository automation: `workflows/checks.yml` runs `scripts/check.mjs` and the app tests on every pull request; `workflows/supabase-keepalive.yml` pings Supabase twice a week |

## Contact

- [Email PanPhy Labs](mailto:panphylabs@icloud.com)
- [Support the project](https://buymeacoffee.com/panphy)
