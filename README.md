# PanPhy Labs

PanPhy Labs is a collection of browser-based physics tools, simulations, and mini games designed for learning by doing.

This project started from a practical classroom problem: many school devices are locked down, and installing software is difficult. PanPhy Labs takes a different approach—keep everything simple, interactive, and available in the browser so students and teachers can get started immediately. The site is also built to be offline-friendly after first load, so learning can continue even with unreliable internet.

## Why PanPhy Labs exists

- **Accessible by default**: works in a browser without installing desktop software.
- **Interactive over passive**: tools are made for exploration, not just reading.
- **Education-focused**: apps are intentionally practical for classwork, revision, and demonstrations.
- **Offline-friendly**: most experiences continue to work without a constant connection.

> Note: A few features rely on external services and need internet access (for example, the Asteroid Storm leaderboard and the EAL Companion app).

## What you can find here

- **Physics tools** for analysis and productivity (e.g., plotting, digitizing, trackers, editors)
- **Simulations** for key concepts
- **Teacher utilities**
- **Small games / interactive demos** for engagement and quick practice

The landing page is the best place to browse everything currently published:
- `index.html`

## Tech stack (simple on purpose)

PanPhy Labs is intentionally lightweight:

- **HTML5, CSS3, Vanilla JavaScript**
- **No framework, no bundler, no build step**
- **Service Worker** for offline support and caching
- **GitHub Pages** deployment
- **Supabase** for selected online features (e.g., leaderboard)

## For contributors

Contributions are welcome—especially fixes, usability improvements, and new educational tools.

### Project principles

When contributing, try to preserve the project philosophy:

1. **Keep it simple**: prefer small, readable, dependency-light solutions.
2. **Keep it usable in classrooms**: mobile-friendly, touch-friendly, low-friction UI.
3. **Keep it resilient**: avoid unnecessary network dependencies.
4. **Keep pages self-contained**: each published HTML entry should work as an independent app/page.

### Important implementation notes

- This is a static site. Edit files directly in-repo.
- If you modify files that are pre-cached by the service worker, you must bump `BUILD_ID` in `sw.js` so users receive updates.
- New work-in-progress pages should normally go under `/beta` unless they are explicitly being published.

### Run locally

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## Contact

- Email: `panphylabs@icloud.com`
- Support: https://buymeacoffee.com/panphy
