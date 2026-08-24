# PanPhy Labs

PanPhy Labs is a collection of browser-based physics tools, simulations, and mini games designed for learning by doing.

This project started from a practical classroom problem: on school-managed devices, students and teachers often don't have the admin rights to install software. PanPhy Labs takes a different approach — keep everything simple, interactive, and available in the browser so anyone can get started immediately. The site also caches each app for offline use after your first visit, so learning can continue even without an internet connection.

## Why PanPhy Labs exists

- **Accessible by default**: works in a browser without installing desktop software.
- **Interactive over passive**: tools are made for exploration, not just reading.
- **Education-focused**: apps are intentionally practical for classwork, revision, and demonstrations.
- **Offline-friendly**: most experiences continue to work without a constant connection.

> Note: All games and a few other features rely on external services and require internet access. Tools and simulations work offline after your first visit.

## What you can find here

- **Physics tools** for analysis and productivity (e.g., plotting, digitizing, trackers, editors)
- **Simulations** for key concepts
- **Teacher utilities**
- **Small games / interactive demos** for engagement and quick practice
- **School-specific curriculum resources** under `year9phy/`

The landing page is the best place to browse the general-audience PanPhy Labs apps:
- `index.html`

### Year 9 Physics curriculum resources

`year9phy/` is a public, open-source collection designed for the Year 9 Physics curriculum at the author's school. Because the material is school-specific and may not be relevant to general visitors, it is intentionally not listed on the main PanPhy Labs landing page.

The resources remain available by direct link, and teachers and students are welcome to use them if they find them useful. The current unit is:

- **Work Like a Physicist** — [open the companion site](https://panphy.github.io/year9phy/unit01/) or [browse the source files](year9phy/unit01/); includes a lesson companion, revision material, test preparation, and downloadable resources

## Tech stack (simple on purpose)

PanPhy Labs is intentionally lightweight:

- **HTML5, CSS3, Vanilla JavaScript**
- **No framework, no bundler, no build step**
- **Service Worker** for offline support and caching
- **GitHub Pages** deployment
- **Supabase** for selected online features (e.g., leaderboard)

## For contributors

Contributions are welcome - especially fixes, usability improvements, and new educational tools.

### Project principles

When contributing, try to preserve the project philosophy:

1. **Keep it simple**: prefer small, readable, dependency-light solutions.
2. **Keep it usable in classrooms**: mobile-friendly, touch-friendly, low-friction UI.
3. **Keep it resilient**: avoid unnecessary network dependencies.
4. **Keep pages self-contained**: each published HTML entry should work as an independent app/page.

### Important implementation notes

- This is a static site. Edit files directly in-repo.
- If you modify files that are pre-cached by the service worker, you must bump `BUILD_ID` in `sw.js` so users receive updates.
- New work-in-progress pages should normally go under `/beta` unless they are explicitly being published. `beta/index.html` lists all beta pages for testing convenience; keep it in sync when adding, renaming, or removing beta pages.

---

## Contact

- Email: `panphylabs@icloud.com`
- Support: https://buymeacoffee.com/panphy
