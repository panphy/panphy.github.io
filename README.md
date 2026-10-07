# PanPhy Labs

[Open PanPhy Labs](https://panphy.app/)

Browser-based physics tools, simulations, classroom utilities and games. Students and teachers on school-managed devices often cannot install software, so everything runs in the browser.

## Explore

- **Tools:** [PanPhyMD](tools/panphymd.html) for Markdown editing, [PanPhyPlot](tools/panphyplot.html) for graph plotting and curve fitting, [Motion Tracker](tools/motion_tracker.html), [Sound Analyzer](tools/sound_analyzer.html), and [Tone Generator](tools/tone_generator.html).
- **Simulations:** [Virtual Ripple Tank](simulations/ripple_tank.html), [Wave Superposition](simulations/superposition.html), [Standing Wave](simulations/standing_wave.html), [Collision Lab](simulations/collision.html), [States of Matter](simulations/states.html), [Atomic Models](simulations/atomic_models.html), [Nuclear Decay](simulations/nuclear_decay.html), [Fission and Fusion](simulations/fission_fusion.html), and [Lorentz Transform](simulations/lorentz.html).
- **Teacher utilities:** [Exam Timer](for_teachers/timer.html) and [Camera Visualizer](for_teachers/visualizer.html).
- **Games and demos:** [Spellwave](fun/spellwave.html) and [ASCII Camera](fun/ascii_cam.html).
- **In beta:** 3D simulations of [Electric Motors](beta/electric_motors.html) (motor effect, DC and synchronous AC), [Charges in Fields](beta/charges_in_fields.html) and the [Life Cycle of a Star](beta/star_life_cycle.html), awaiting review.

## GCSE Physics

The [GCSE Physics hub](https://panphy.app/gcsephy/) collects the author's school curriculum resources for AQA GCSE Physics, available by direct link:

- **Year 9 · [Work Like a Physicist](https://panphy.app/gcsephy/year9phy/unit01/):** a student companion site, revision guides, Exam Zone, 40-page workbook, lesson plans, and a [50-slide HTML teaching deck](https://panphy.app/gcsephy/decks/work-like-a-physicist/). See the [unit overview](gcsephy/year9phy/unit01/README.md) for materials and editable sources.
- **Year 10 · [Electric Circuits](https://panphy.app/gcsephy/year10phy/unit01/):** revision notes, practice questions, an Exam Zone, required-practical resources, a twelve-lesson workbook with answer editions and a teacher guide, and an [HTML teaching deck](https://panphy.app/gcsephy/decks/electric-circuits/). See the [unit overview](gcsephy/year10phy/unit01/README.md).
- **Year 11 · [Atoms and Nuclear Radiation](https://panphy.app/gcsephy/year11phy/unit01/):** a ten-lesson workbook with answer editions and a unit review, alongside an [HTML teaching deck](https://panphy.app/gcsephy/decks/atoms-and-radiation/). See the [workbook overview](gcsephy/year11phy/unit01/README.md).
- **[Do Now starters](https://panphy.app/gcsephy/do-now/):** AO1 lesson starters by topic, with worksheets, flashcards, and [printable revision sheets and required-practical method sheets](https://panphy.app/gcsephy/do-now/revision/). See the [Do Now overview](gcsephy/do-now/README.md) for the question bank and how to edit it.

These public, open-source resources are intentionally outside the general homepage catalogue, but teachers and students are welcome to use and adapt them.

## Offline use

Most published tools and simulations work offline once cached: visit online first and check the homepage's **Offline Ready** indicator. Updates appear through an update prompt. Shared fonts in `assets/fonts/` are precached (about 336 KB).

Pages under `fun/`, `beta/`, `misc/` and `gcsephy/` need internet access, as do Supabase features such as leaderboards. `gcsephy/` registers its own small worker (`gcsephy/sw.js`), which stores nothing and only revalidates requests so edits appear on the next load; a page that is already open offers a Reload banner when its files or its question bank change.

## Repository map

| Path | Contents |
| --- | --- |
| `index.html` | General app catalogue with topic filters (cards use `data-topic`) and offline readiness indicators |
| `sw.js`, `manifest.json` | Caching, updates, and PWA configuration |
| `assets/` | Shared controls, icons, locally hosted fonts, and service-worker registration |
| `tools/`, `simulations/`, `for_teachers/` | Published educational apps |
| `fun/` | Network-only games and demos; Spellwave's text-logic tests run with `node --test fun/spellwave/tests/` |
| `beta/` | Trial apps, listed in `beta/index.html`; `beta/do_now/` only forwards old links to `gcsephy/do-now/` |
| `misc/` | Unlisted resources, inventoried in `misc/index.html` |
| `gcsephy/` | GCSE Physics curriculum resources and the Do Now starters, inventoried in `gcsephy/index.html` |
| `.github/workflows/` | Repository automation |

## Contact

- [Email PanPhy Labs](mailto:panphylabs@icloud.com)
- [Support the project](https://buymeacoffee.com/panphy)
