# PanPhy Labs

[Open PanPhy Labs](https://panphy.github.io/)

Browser-based physics tools, simulations, classroom utilities, and games for learning by doing. The project grew out of a classroom constraint: students and teachers on school-managed devices often cannot install software. These apps run directly in the browser.

## Explore

- **Tools:** graph plotting and curve fitting, Markdown editing, motion tracking, sound analysis, and tone generation.
- **Simulations:** waves, states of matter, atomic models, relativity, and collisions.
- **Teacher utilities:** a classroom timer and camera visualizer.
- **Games and demos:** spelling practice and an ASCII camera.
- **Year 9 Physics:** school-specific teaching and revision resources, available by direct link.

### Year 9 Physics

[Work Like a Physicist](https://panphy.github.io/year9phy/unit01/) includes a student companion site, revision guides, test preparation, a workbook, lesson plans, and a teaching deck. See the [unit overview](year9phy/unit01/README.md) for materials and editable sources.

These public, open-source resources follow the author's school curriculum. They are intentionally outside the general homepage catalogue, but teachers and students are welcome to use and adapt them.

## Offline use

Most published tools and simulations support offline use once their required files have been cached. Visit online first and check the homepage's **Offline Ready** indicator before relying on an app offline. Normal updates appear through an update prompt.

All pages under `fun/`, `beta/`, and `misc/` require internet access. Supabase features, such as leaderboards, also stay online-only. The Year 9 companion supports offline caching despite not appearing on the homepage.

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
| `year9phy/` | Public school-specific curriculum resources |
| `.github/workflows/` | Repository automation |

## Contributing

Fixes, usability improvements, and new educational tools are welcome. Keep changes lightweight, independently usable, and accessible on classroom devices.

- New pages normally start in `beta/`; keep the beta and misc inventories current. Year 9 curriculum work stays in `year9phy/`.
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
