# CLAUDE.md — PanPhy Labs

PanPhy Labs is a static GitHub Pages PWA for physics tools, simulations, classroom utilities, and games. See `README.md` for the project map and local setup.

## Working rules

- Use American English spelling when building new things or making changes anywhere in this repository, including documentation, unless the user explicitly requests otherwise. Everything under `gcsephy/` uses British English spelling. Spellwave (`fun/spellwave.html` and `fun/spellwave/`) uses British English in its UI and accepts both British and American spellings as answers.
- Edit HTML, CSS, and vanilla JavaScript directly; the served site must need no framework, bundler, or build step. Local development dependencies stay ignored and optional.
- Keep each app independently accessible through an HTML entry point. Split supporting CSS/JS when useful and use stable, unhashed filenames. Follow existing CDN or local-library patterns without adding a build pipeline.
- Keep `AGENTS.md` and `CLAUDE.md` tracked and equivalent; update both when project rules change.
- Preserve unrelated user changes and existing functionality. UI changes and file removals should serve the requested task; ask before destructive changes outside that scope.
- Keep tool state (such as `.agents/` and `.claude/`) local and ignored. Put scratch files outside the repository where practical, and clean up temporary files you created.
- `main` is production and auto-deploys to GitHub Pages. Use `codex/` or `claude/` feature branches and pull requests for merges to `main`.
- Default request for finalizing changes: "Verify the changes, commit and push, create a PR, merge once checks pass, then clean up." When the user asks for "commit, push, merge and cleanup", follow this workflow, including the PR. Review the final diff once, reuse verification already completed for unchanged files, and run only outstanding checks relevant to the change. Push, create the PR, wait for its checks to pass, and merge without another review or test cycle unless files change, checks fail, or a concrete concern remains. After a successful merge, return to an up-to-date `main` and remove only the task's feature branch and temporary worktrees, preserving unrelated work. Do not wait for the Pages deployment or repeat browser checks after merging unless requested or needed to investigate a deployment problem.

## Page placement and publishing

| Location | Purpose | Catalog and offline policy |
| --- | --- | --- |
| `tools/`, `simulations/`, `for_teachers/` | General published apps | Listed on the homepage and in `sitemap.xml`; offline by default |
| `fun/` | Games and playful demos | May be listed publicly; always network-only |
| `beta/` | New and trial apps | Maintain `beta/index.html`; no service-worker registration or caching |
| `misc/` | Unlisted pages and resources | Maintain links and short descriptions in `misc/index.html`; no registration or caching |
| `gcsephy/` | Public school-specific GCSE curriculum resources (`year9phy/`, `year10phy/`) and the Do Now starters and flashcards in `do-now/` | Direct-link access, outside the root catalog; maintain `gcsephy/index.html`; network-only in root `sw.js`; pages load `/gcsephy/sw-register.js`, whose `/gcsephy/`-scoped worker revalidates every request and stores nothing |
| `ibdpphy/` | Public IB Diploma Programme Physics resources: a course summary, an annotated data booklet, and teaching decks by syllabus topic in `decks/` | As `gcsephy/`: direct-link access, outside the root catalog; maintain `ibdpphy/index.html`; network-only in root `sw.js`; pages load `/ibdpphy/sw-register.js`, the same freshness worker scoped to `/ibdpphy/` |

Keep beta/misc inventories current when adding, moving, renaming, or removing entries. Supporting app files do not need separate entries.

Promote an app out of `beta/` only when the user requests or approves that promotion; never promote one on your own initiative, even when it seems ready.

For a new or promoted general published app:

1. Place it in the appropriate directory and update its previous inventory if moved.
2. Link it from `index.html` and add it to `sitemap.xml`.
3. Every app newly added to the main landing page, whether promoted from `beta/` or `misc/` or created from scratch, must support light/dark themes and keep its theme in sync with the landing page and all other published apps through the shared theme controls described below.
4. For offline support, include `<script src="/assets/sw-register.js" defer></script>`, add the page and required assets to `ASSETS_TO_CACHE`, and add its homepage requirements to `OFFLINE_CARD_REQUIREMENTS` in `index.html`.
5. For registered apps, name the page `<section>/<app>.html` with supporting files in `<section>/<app>/`, so that `getAssetGroup` in `sw.js` and `getAppGroup` in `assets/sw-register.js` give them one app name; otherwise add a matching rule to both.
6. Bump `BUILD_ID` after cached-file changes, as below.

Network-only apps omit registration and offline requirements. Public support/reference pages may use the service worker without a homepage listing.

`gcsephy/` and `ibdpphy/` are exempt from beta placement, general app styling, and homepage promotion. Do not add them to root `index.html`, `ASSETS_TO_CACHE` or `OFFLINE_CARD_REQUIREMENTS` unless requested. Their absence from the catalog does not make them private. In `ibdpphy/` decks, mark content that is additional higher level with the `hl` slide class so that it is never mistaken for standard level.

In `ibdpphy/` decks, typeset all mathematics with MathJax as LaTeX between `\(` and `\)`: variables and Greek letters, subscripts and superscripts, fractions, arithmetic, scientific notation and nuclide symbols (`\({}^{235}\mathrm{U}\)`), in slides, revision notes and the HTML labels of 3D models. Never use Unicode superscripts or subscripts for mathematics. Write division as a fraction (`\frac`, or `\dfrac` in displayed working), never with ÷, `\div` or an inline slash such as `S/4`. Units in running text (such as m s⁻¹), word equations, chemical formulas (such as CO₂) and the text labels inside SVG figures may stay plain text. The `gcsephy/decks/` teaching decks follow the same rule, except that they may use ÷ (`\div`), and also typeset the math in diagram labels: each deck lists them in `window.DeckSvgTex`, which `gcsephy/decks/assets/deck-math.js` typesets in the deck only, because the drawings are shared with workbooks that print plain labels. Mark deck slides examined only in GCSE Physics (8463), not Combined Science: Trilogy, with the `triple` slide class (or `triple-tag` for one item); the flag sits at the bottom edge, because the top holds the year badge. The Year 9 Energy unit (`gcsephy/year9phy/unit02/`) also typesets its equations with MathJax; other `gcsephy/` pages do not load it and may use ÷.

## Service worker

- Files in `sw.js` → `ASSETS_TO_CACHE` are cache-first. After changing any of them, update `BUILD_ID` as the final code change using a UTC timestamp: `YYYY-MM-DDTHH:MM:SSZ`.
- Cache URLs must match exactly, including CDN versions, paths, and query strings. Include required local modules and media for offline apps.
- `/beta`, `/misc`, `/fun`, `/gcsephy`, `/ibdpphy`, and Supabase API calls remain network-only. Other resources can also be runtime-cached; do not assume an uncached resource is available offline.
- `gcsephy/sw.js` is a separate freshness worker, not an offline cache: it uses `cache: 'no-cache'` fetches, no Cache Storage and no `BUILD_ID`. New `gcsephy/` pages include `<script src="/gcsephy/sw-register.js" defer></script>`, which also compares the open page's own HTML, scripts, stylesheets and images with the server (content hash, since GitHub Pages ETags change on every deploy) and offers a Reload banner when they change; it never reloads by itself. A page that loads data with `fetch` lists those files in `data-watch` on the script tag (as Do Now does for its CSVs) so that edits to them offer the reload too. `ibdpphy/sw.js` and `/ibdpphy/sw-register.js` are copies of the pair for the `/ibdpphy/` scope; keep the two pairs in step.
- Update prompts are app-specific: at install the worker hashes each app's precached same-origin files, plus the shared `/assets/` files and `manifest.json`, into a per-app version, and a page prompts only when its own app's version differs. Keep `getAssetGroup` (`sw.js`) and `getAppGroup` (`assets/sw-register.js`) aligned; an app missing from the version map falls back to `BUILD_ID` and prompts on every build.
- Preserve user-approved activation for normal updates. Keep precache repair limited to missing entries and rate-limited by the landing page.

## Code and interface conventions

- Use camelCase for variables/functions, UPPER_SNAKE_CASE for constants, and a shared state object where useful.
- General published apps use the Spectrum house style in `/assets/design.css`. Load `/assets/fonts/fonts.css`, then `/assets/design.css`, before the app's own CSS, and map the app's existing variables onto its tokens rather than rewriting every rule. Spellwave (`fun/spellwave.html`) keeps its own game design.
  - Fonts: Figtree for body text, Unbounded for page and app titles only (it needs smaller sizes than a serif display face), IBM Plex Mono for numbers and readouts.
  - The `--spectrum` gradient is decoration only and never encodes data. Leave colors that carry meaning (series, waves, sources, charges, particle types) and 3D scene colors unchanged, unless they clash in dark mode.
  - Apps use solid panels and never blur over live content; glass blur is for the homepage only.
  - An app gets a plain title in the display face with one thin spectrum line under its app bar or banner. Spectrum-colored title text is for the homepage only.
  - Never clip decorations with `overflow: hidden` on cards inside scrolling or flex columns, which can collapse them.
  - Use the PanPhyPlot toolbar-and-pane app shell for dense workspaces, or a floating banner for other layouts. Reuse shared controls in `assets/` where appropriate; adapt dimensions to the app.
- Use `/assets/theme.js` for the shared `panphy-theme` preference and `data-theme` on `<html>`; do not introduce app-specific theme storage keys. That preference is shared by the landing page and every app published on it, and by nothing else: pages in `gcsephy/` and `ibdpphy/` load the same script with `data-theme-scope="gcsephy"` or `data-theme-scope="ibdpphy"`, which gives each section its own preference (`panphy-theme-gcsephy`, `panphy-theme-ibdpphy`), independent of the main site and of each other. Load it synchronously in the head after `theme-color` metadata and before styles to apply the theme and browser theme metadata before first paint. Use `PanPhyTheme.toggle()` or `PanPhyThemeToggle.mount(button)` for controls, and listen for `panphy:theme-change` to refresh charts, scenes and other theme-dependent content, including changes from other open tabs.
- Keep `apple-mobile-web-app-status-bar-style` at `default` in every theme; use `theme-color` for the bar color. iOS/iPadOS 26+ home-screen apps still blur the top of the screen, so published pages link `/assets/standalone-top.css`, which reserves a flat strip in that mode. Offset anything pinned to the top edge (sticky headers, fixed buttons, fullscreen panes) by `var(--standalone-top)`.
- Make layouts responsive and controls keyboard- and touch-accessible; aim for 48px touch targets. Use `viewport-fit: cover` where needed.
- Teaching decks in `gcsephy/` and `ibdpphy/` are landscape only. A portrait phone shows the whole 16:9 slide, scaled,; a landscape phone hides the banner and fills the screen with the slide, with slim navigation and Note controls in the side margins. Do not build, adjust or check portrait or phone-specific slide layouts: design and verify new slides at 16:9 only. The Note panel stays readable on any screen.
- Published apps typeset math with `/assets/math.js`, loaded in the head: write LaTeX between `\(` and `\)` (`\dfrac` for fractions, `{}^{A}_{Z}\mathrm{X}` for nuclides) and show it with `PanPhyMath.setMath`, `setMathHtml` or `mathHtml`, or mark static HTML with `data-math-static`. Typeset readout labels, never their values; numbers, units, `<option>` text and canvas or 3D labels stay plain. Each page also lists `/assets/math.js` and the pinned MathJax URL in its offline requirements.
- Physical quantities need precise entry or stepping. Pair sliders with numeric readouts or entry fields.
- Every new page, app, deck or printed resource, in any section, shows "© 2026 PanPhy Labs. All rights reserved." (`&copy;` in HTML), because visitors often open a page directly rather than from a catalog. Put it in the footer, keeping any existing links. Full-viewport apps put it inside an existing panel, start screen or dialog, so that no layout gains height. Decks put it on the title slide with the `slide-copyright` class, and printed workbooks and sheets put it in the running page footer.
- Beta, `gcsephy/` and `ibdpphy/` pages are exempt from the general visual style.
- For flex-based Three.js canvases, use `renderer.setSize(w, h, false)` with CSS `height: 0; flex: 1; min-height: 0` to avoid sizing feedback loops.

## Documentation

- Review only READMEs affected by the changed files or behavior, including parent overviews when maps, commands, counts, links or page numbers change; update those that are stale. Do not reread unrelated READMEs during finalization. Keep READMEs concise: state what a folder is, how to build or edit it, and what is not obvious; leave out history and anything the code already shows.

## Verification

- Verification is incremental: reuse successful checks for unchanged files. Rerun only checks invalidated by later edits, failures or a concrete unresolved concern; finalization alone does not require another test or browser pass. Run relevant app tests locally; leave unrelated app suites to PR checks.
- Serve locally with `python3 -m http.server 8000` and open `http://localhost:8000`. Use an uncached origin or clean browser context to avoid stale service-worker content.
- Verify affected browser flows and responsive layouts for UI changes; check offline behavior and update prompts when changing caching.
- For PanPhyPlot data handling or fitting changes, run `node --test tools/panphyplot/tests/*.test.cjs misc/panphyplotog/tests/regression.test.cjs` and check affected browser flows.
- For documentation-only changes, check accuracy, links, and consistency; no app test run or cache-version bump is needed unless cached content also changes.
- Every pull request runs `.github/workflows/checks.yml`: the PanPhyPlot, PanPhyPlotOG, Motion Tracker and Spellwave tests, and `.github/scripts/check.mjs`, which checks that cached files exist, homepage offline requirements are cached, `BUILD_ID` was updated when a cached file changed, catalog and sitemap links resolve, the exam statistics data is consistent, `AGENTS.md` matches `CLAUDE.md`, and every script parses. For code, content, caching or workflow changes, run the repository checker once locally with `node .github/scripts/check.mjs --base origin/main` before pushing. For documentation-only changes, check the diff, relevant links and `AGENTS.md`/`CLAUDE.md` consistency locally and let CI run the repository checker. Merge only when PR checks are green; wait for their result without repeatedly fetching logs or rerunning successful checks.
