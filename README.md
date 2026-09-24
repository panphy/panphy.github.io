# PanPhy Labs

[Open PanPhy Labs](https://panphy.github.io/)

Browser-based physics tools, simulations, classroom utilities, and games for learning by doing. The project grew out of a classroom constraint: students and teachers on school-managed devices often cannot install software. These apps run directly in the browser.

## Explore

- **Tools:** graph plotting and curve fitting, Markdown editing, motion tracking, sound analysis, and tone generation.
- **Simulations:** waves, states of matter, atomic models, relativity, and collisions.
- **Teacher utilities:** a classroom timer and camera visualizer.
- **Games and demos:** spelling practice and an ASCII camera.
- **GCSE Physics:** school-specific unit companions and revision flashcards, available by direct link.

### GCSE Physics

The [GCSE Physics hub](https://panphy.github.io/gcsephy/) collects the author's school curriculum resources:

- **Year 9 · [Work Like a Physicist](https://panphy.github.io/gcsephy/year9phy/unit01/):** a student companion site, revision guides, test preparation, a workbook, lesson plans, and a teaching deck. See the [unit overview](gcsephy/year9phy/unit01/README.md) for materials and editable sources.
- **Year 10 · [Electric Circuits](https://panphy.github.io/gcsephy/year10phy/unit01/):** revision notes, practice questions, and an Exam Zone for AQA GCSE electricity. See the [unit overview](gcsephy/year10phy/unit01/README.md).
- **Flashcards:** physics retrieval practice for Combined and Separate Science.

These public, open-source resources are intentionally outside the general homepage catalogue, but teachers and students are welcome to use and adapt them.

## Offline use

Most published tools and simulations support offline use once their required files have been cached. Visit online first and check the homepage's **Offline Ready** indicator before relying on an app offline. Normal updates appear through an update prompt.

All pages under `fun/`, `beta/`, `misc/`, and `gcsephy/` require internet access. Supabase features, such as leaderboards, also stay online-only.

## Run locally

The served site uses HTML, CSS, and vanilla JavaScript, with no framework, bundler, or build step. GitHub Pages serves the files directly; a service worker handles offline caching, and selected online features use Supabase.

From the repository root, run:

```bash
python3 -m http.server 8000
```

Open [localhost:8000](http://localhost:8000). A static server is needed to test absolute paths and service workers. Use a fresh browser context or an uncached local origin when checking changes so old cached files do not mask them. No npm installation is required to serve the site.

## Repository map

| Path | Contents |
| --- | --- |
| `index.html` | General app catalogue and offline readiness indicators |
| `sw.js`, `manifest.json` | Caching, updates, and PWA configuration |
| `assets/` | Shared controls, icons, and service-worker registration |
| `tools/`, `simulations/`, `for_teachers/` | Published educational apps |
| `fun/` | Network-only games and demos |
| `beta/` | Work in progress, listed in `beta/index.html` |
| `misc/` | Unlisted resources, inventoried in `misc/index.html` |
| `gcsephy/` | GCSE Physics curriculum resources and flashcards, inventoried in `gcsephy/index.html` |
| `.github/workflows/` | Repository automation |

## Contributing

Fixes, usability improvements, and new educational tools are welcome. Keep changes lightweight, independently usable, and accessible on classroom devices.

- New pages normally start in `beta/`; keep the beta, misc and GCSE Physics inventories current. School curriculum work goes in `gcsephy/`.
- When changing a precached file, bump `BUILD_ID` in `sw.js`. Published offline apps need their required assets in `ASSETS_TO_CACHE` and their homepage checks in `OFFLINE_CARD_REQUIREMENTS`.
- Check affected browser flows, including mobile layouts and offline behavior where relevant. PanPhyPlot data or fitting changes also require its dependency-free regression checks (Node.js):

  ```bash
  node --test tools/panphyplot/tests/regression.test.cjs
  ```

- Use a `codex/` or `claude/` feature branch and a pull request; `main` auto-deploys to production.
- [AGENTS.md](AGENTS.md) and [CLAUDE.md](CLAUDE.md) contain equivalent assistant guidance and the publishing checklist. Keep them aligned when changing project rules.

## Contact

- [Email PanPhy Labs](mailto:panphylabs@icloud.com)
- [Support the project](https://buymeacoffee.com/panphy)
