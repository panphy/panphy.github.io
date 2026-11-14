# CLAUDE.md — PanPhy Labs

PanPhy Labs is a static GitHub Pages PWA for physics tools, simulations, classroom utilities, and games. See `README.md` for the project map and local setup.

## Working rules

- Use American English everywhere, including documentation, unless the user asks otherwise. Exceptions: everything under `gcsephy/` uses British English, and Spellwave (`fun/spellwave.html`, `fun/spellwave/`) uses British English in its UI and accepts British and American spellings as answers.
- Edit HTML, CSS and vanilla JavaScript directly: the served site needs no framework, bundler or build step. Local development dependencies stay ignored and optional. Follow the existing CDN or local-library patterns.
- Keep each app reachable through its own HTML entry point. Split CSS/JS when useful, with stable, unhashed filenames.
- Keep `AGENTS.md` and `CLAUDE.md` tracked and identical apart from their titles; update both when a rule changes.
- After any Spellwave gameplay change (speed, timing, damage, rock frequency, scoring, waves, the question bank or boss options), reset its leaderboard once the change is live, following `fun/spellwave/README.md`, so old scores never compete with new rules.
- Preserve unrelated user changes and existing functionality. UI changes and file removals must serve the requested task; ask before destructive changes outside it.
- Keep tool state (`.agents/`, `.claude/`) local and ignored. Put scratch files outside the repository where practical, and delete temporary files you created.
- `main` is production: `.github/workflows/deploy.yml` publishes every push to GitHub Pages (source "GitHub Actions"), uploading the repository without dot files and retrying a failed deployment up to three times. Work on `codex/` or `claude/` branches and merge through pull requests.
- Finalizing means: verify, commit and push, open a PR, merge once its checks pass, then clean up. "Commit, push, merge and cleanup" means the same, PR included. Review the final diff once and run only the checks the change still needs. Merge without another review or test cycle unless files change, checks fail or a concrete concern remains. Afterwards, return to an up-to-date `main` and delete only the task's local branch and temporary worktrees; GitHub deletes the remote branch. Do not wait for the Pages deployment or repeat browser checks unless asked or investigating a deployment problem.

## Page placement and publishing

| Location | Purpose | Catalog and offline policy |
| --- | --- | --- |
| `tools/`, `sandboxes/`, `simulations/`, `for_teachers/` | General published apps | Listed on the homepage and in `sitemap.xml`; offline by default |
| `fun/` | Games and playful demos | May be listed publicly; always network-only |
| `beta/` | New and trial apps | Listed in `beta/index.html`; no service-worker registration or caching |
| `misc/` | Unlisted pages and resources | Listed with short descriptions in `misc/index.html`; no registration or caching |
| `gcsephy/` | Public GCSE resources for one school: year units (`year9phy/` to `year11phy/`), teaching decks (`decks/`), course summaries and the Do Now starters and flashcards (`do-now/`) | Direct links only, outside the root catalog; maintain `gcsephy/index.html`; network-only in root `sw.js`; pages load `/gcsephy/sw-register.js` (see Service worker) |
| `ibdpphy/` | Public IB Diploma Programme Physics resources: a course summary, an annotated data booklet and teaching decks by syllabus topic (`decks/`) | As `gcsephy/`, with `ibdpphy/index.html` and `/ibdpphy/sw-register.js` |

- Keep the beta and misc inventories current when entries are added, moved, renamed or removed; supporting files need no entries.
- Promote an app out of `beta/` only when the user asks or approves, never on your own initiative.
- New `gcsephy/` and `ibdpphy/` pages do not start in `beta/`, and stay out of root `index.html`, `ASSETS_TO_CACHE` and `OFFLINE_CARD_REQUIREMENTS` unless requested. Being outside the catalog does not make them private.

For a new or promoted general published app:

1. Place it in the right directory and update the inventory it left.
2. Link it from `index.html` and add it to `sitemap.xml`. Give it a `<title>` naming what it is in search terms (such as "Electric Motor Simulation: DC and AC Motors in 3D — PanPhy Labs"), a meta description and a `<link rel="canonical">` to its `https://panphy.app/` address.
3. Support light and dark themes through the shared theme controls (see Code and interface conventions).
4. For offline use, include `<script src="/assets/sw-register.js" defer></script>`, add the page and its assets to `ASSETS_TO_CACHE`, and add its requirements to `OFFLINE_CARD_REQUIREMENTS` in `index.html`.
5. Name the page `<section>/<app>.html` with supporting files in `<section>/<app>/`, so that `getAssetGroup` (`sw.js`) and `getAppGroup` (`assets/sw-register.js`) give them one app name; otherwise add a matching rule to both.
6. Bump `BUILD_ID` (see Service worker).

Network-only apps skip steps 4 to 6. Public support or reference pages may use the service worker without a homepage listing. When you change a page listed in `sitemap.xml`, set its `<lastmod>` to the date of the change.

## Service worker

- Files in `ASSETS_TO_CACHE` (`sw.js`) are cache-first. After changing any of them, update `BUILD_ID` as the last code change, to a UTC timestamp `YYYY-MM-DDTHH:MM:SSZ`.
- Cache URLs must match exactly, including CDN versions, paths and query strings. Include the local modules and media an offline app needs.
- `STABLE_ASSETS` (Collision Lab's MediaPipe engine and hand model, about 30 MB) stay in `ASSETS_TO_CACHE` but live in a cache kept across builds, so a new `BUILD_ID` does not download them again. Change `STABLE_CACHE_VERSION` when any of them changes; the repository checker enforces this.
- `/beta`, `/misc`, `/fun`, `/gcsephy`, `/ibdpphy` and Supabase API calls are network-only. Other resources may be runtime-cached; never assume an uncached resource works offline.
- Update prompts are per app: at install the worker hashes each app's precached same-origin files, plus shared `/assets/` files and `manifest.json`, into an app version, and a page prompts only when its app's version changes. Keep `getAssetGroup` and `getAppGroup` aligned; an app missing from the version map falls back to `BUILD_ID` and prompts on every build.
- A worker installed while a deployment is still propagating can precache old files under the new `BUILD_ID`. To recover, `sw-register.js` sends `VERIFY_APP` after each update check, and `verifyAppFiles` (`sw.js`) compares the open app's and the shared precached files with the server (at most hourly, never within 15 minutes of install), replaces any that differ and lets the page show the normal prompt. Its requests carry a fresh query string, because Cloudflare keeps scripts and stylesheets (not pages) at its edge for up to four hours. Pages are hashed with `contentHash`, which blanks the email codes Cloudflare rewrites on every request; hash any page content the same way, or identical pages never match.
- Keep normal updates user-approved. The landing page's `REPAIR_PRECACHE` only restores missing entries and is rate-limited by the landing page; replacing changed files is `VERIFY_APP`'s job.
- `gcsephy/sw.js` is a freshness worker, not an offline cache: `cache: 'no-cache'` fetches, no Cache Storage, no `BUILD_ID`. Every `gcsephy/` page includes `<script src="/gcsephy/sw-register.js" defer></script>`, which also compares the open page's HTML, scripts, stylesheets and images with the server by content hash (GitHub Pages ETags change on every deploy) and offers a Reload banner, never reloading by itself. A page that `fetch`es data lists those files in `data-watch` on the script tag (as Do Now does for its CSVs). `ibdpphy/sw.js` and `/ibdpphy/sw-register.js` are copies scoped to `/ibdpphy/`; keep the two pairs in step.

## Code and interface conventions

- camelCase for variables and functions, UPPER_SNAKE_CASE for constants, and a shared state object where useful.
- General published apps use the Spectrum house style in `/assets/design.css`; beta, `gcsephy/`, `ibdpphy/` and Spellwave keep their own. Load `/assets/fonts/fonts.css`, then `/assets/design.css`, before the app's CSS, and map the app's variables onto its tokens rather than rewriting every rule.
  - Fonts: Figtree for body text, Unbounded for page and app titles only (it needs smaller sizes than a serif display face), IBM Plex Mono for numbers and readouts.
  - The `--spectrum` gradient is decoration and never encodes data. Keep colors that carry meaning (series, waves, sources, charges, particle types) and 3D scene colors unless they clash in dark mode.
  - Apps use solid panels and never blur over live content; glass blur and spectrum-colored title text are for the homepage only.
  - An app gets a plain title in the display face with one thin spectrum line under its app bar or banner.
  - Never clip decorations with `overflow: hidden` on cards inside scrolling or flex columns, which can collapse them.
  - Use the PanPhyPlot toolbar-and-pane shell for dense workspaces and a floating banner otherwise. Reuse shared controls in `assets/`, adapting their dimensions.
- Avoid unnecessary secondary labels and descriptions; let the layout do the explaining. The same goes for notes and hints: leave out any that restate a control or describe what trying it shows. When one is really needed, put it in a tooltip on the control or heading it explains, not as text on the page. Error and status messages, readouts and a dialog's question are not notes.
- Physical quantities need precise entry or stepping: pair sliders with numeric readouts or entry fields.
- Symbols and units are case sensitive (kg, not KG; mm, not MM; m in technetium-99m). Never let `text-transform` change them: in an uppercase label or header, typeset symbols with MathJax and wrap plain-text units in a `nocase` span.
- Make layouts responsive and controls keyboard- and touch-accessible, with 48px touch targets as the aim. Use `viewport-fit: cover` where needed.
- Theme: `/assets/theme.js` stores the `panphy-theme` preference and sets `data-theme` on `<html>`; never add app-specific theme keys. The preference is shared by the landing page and the apps published on it only: `gcsephy/` and `ibdpphy/` pages load the script with `data-theme-scope="gcsephy"` or `"ibdpphy"`, giving each section its own key. Load it synchronously in the head, after the `theme-color` metadata and before styles, so the theme applies before first paint. Build controls with `PanPhyTheme.toggle()` or `/assets/theme-toggle.js` (`PanPhyThemeToggle.mount(button)`), and refresh charts, scenes and other theme-dependent content on `panphy:theme-change`, which also fires for changes in other tabs.
- Keep `apple-mobile-web-app-status-bar-style` at `default` and color the bar with `theme-color`. iOS/iPadOS 26+ home-screen apps blur the top of the screen, so published pages link `/assets/standalone-top.css`, which reserves a flat strip; offset anything pinned to the top (sticky headers, fixed buttons, fullscreen panes) by `var(--standalone-top)`.
- Published apps typeset math with `/assets/math.js`, loaded in the head: LaTeX between `\(` and `\)` (`\dfrac` for fractions, `{}^{A}_{Z}\mathrm{X}` for nuclides), shown with `PanPhyMath.setMath`, `setMathHtml` or `mathHtml`, or `data-math-static` on static HTML. Typeset readout labels, never their values; numbers, units, `<option>` text and canvas or 3D labels stay plain. List `/assets/math.js` and the pinned MathJax URL in the page's offline requirements.
- Every new page, app, deck or printed resource shows "© 2026 PanPhy Labs. All rights reserved." (`&copy;` in HTML), because visitors often arrive directly. Put it in the footer, keeping existing links; full-viewport apps put it in an existing panel, start screen or dialog so no layout gains height; decks put it on the title slide (`slide-copyright`); printed workbooks and sheets put it in the running footer.
- Generate procedural WebGL glows, dots, shadows and masks with `/assets/three-textures.js` (`radialTexture`, `rgbaTexture`), never a 2D canvas: Safari's fingerprinting protection can speckle canvas-to-WebGL uploads. Reserve `CanvasTexture` for text labels and dynamic displays, and keep 2D radial-gradient drawings in modules that upload no canvas textures; the repository checker rejects simulation and shared-asset modules that combine `CanvasTexture` and `createRadialGradient`. Cache the helper and list it in each consuming app's offline requirements.
- For flex-based Three.js canvases, use `renderer.setSize(w, h, false)` with CSS `height: 0; flex: 1; min-height: 0` to avoid sizing feedback loops.

## Teaching decks and course pages (`gcsephy/`, `ibdpphy/`)

- Decks are landscape only. A portrait phone shows the whole 16:9 slide, scaled; a landscape phone hides the banner and fills the screen, with slim navigation and Note controls in the side margins. Design and verify slides at 16:9 only; never build or check portrait or phone layouts. The Note panel stays readable on any screen.
- Teaching decks in `gcsephy/` and `ibdpphy/` must be readable on a 75" screen from the back of a 10 m lab: each deck loads its section's `decks/assets/readable.css`, which keeps anything students read at 28px or more on the 1600 × 900 slide and body text at 34–40px. Never shrink text to fit; shorten it (symbols, fragments) or split the slide, leaving decent space between elements and above the footer, then update the slide numbers that workbooks, lesson plans, READMEs and hub cards cite.
- In `ibdpphy/` decks, typeset all mathematics as LaTeX between `\(` and `\)`: variables, Greek letters, subscripts and superscripts, fractions, arithmetic, scientific notation and nuclides (`\({}^{235}\mathrm{U}\)`), in slides, revision notes and the HTML labels of 3D models. Never use Unicode superscripts or subscripts for math. Write division as a fraction (`\frac`, or `\dfrac` in displayed working), never ÷, `\div` or an inline slash such as `S/4`. Units in running text (m s⁻¹), word equations, chemical formulas (CO₂) and text labels inside SVG figures may stay plain.
- `gcsephy/decks/` follow the same rule but may use ÷ (`\div`), and also typeset the math in diagram labels, listed per deck in `window.DeckSvgTex` and typeset by `gcsephy/decks/assets/deck-math.js` in the deck only (workbooks share the drawings and print plain labels). The Year 9 Energy unit (`gcsephy/year9phy/unit02/`) and the course summaries (`gcsephy/course-summary/`) also use MathJax; other `gcsephy/` pages do not and may use ÷.
- Mark additional higher level content in `ibdpphy/` decks with the `hl` slide class. Mark GCSE slides examined only in Physics (8463), not Combined Science: Trilogy, with the `triple` slide class (`triple-tag` for one item); the flag sits at the bottom edge, because the top holds the year badge.
- The label above a slide heading (`eyebrow`) names the slide's role or place (course, lesson or part, HL, slide type, practical stage, story, demo prompt, exam-year flag) or a name, date, case or condition the heading leaves out. It never restates the heading; physics that appears only in the label moves into the heading or body. An unlabeled heading keeps the labeled height (`.slide > h2:first-child`). Show "PRESS → TO REVEAL EACH ANSWER" on a deck's first checkpoint only.

## Documentation

- Review only the READMEs that the change affects, including parent overviews when maps, commands, counts, links or page numbers change, and fix what is stale; skip unrelated READMEs. Keep READMEs short: what the folder is, how to build or edit it, and what is not obvious; no history, nothing the code already shows.

## Verification

- Verification is incremental: reuse passing checks for unchanged files, and rerun only what later edits, failures or a concrete concern invalidate. Finalizing alone needs no new test or browser pass. Run the affected app tests locally; leave unrelated suites to PR checks.
- Serve locally with `python3 -m http.server 8000` (`http://localhost:8000`), in an uncached origin or clean browser context so no stale service worker interferes.
- For UI changes, check the affected browser flows and responsive layouts; for caching changes, check offline behavior and update prompts.
- For PanPhyPlot data handling or fitting, run `node --test tools/panphyplot/tests/*.test.cjs misc/panphyplotog/tests/regression.test.cjs`.
- Before pushing code, content, caching or workflow changes, run `node .github/scripts/check.mjs --base origin/main` once. After changing a page's layout or controls, run `node .github/scripts/a11y-smoke.mjs [page ...]` (needs Chrome, no packages). Documentation-only changes need only a check of accuracy, links and `AGENTS.md`/`CLAUDE.md` consistency, and no cache bump unless cached content changes.
- Every pull request runs `.github/workflows/checks.yml`:
  - `check.mjs` checks that cached files exist, homepage offline requirements are cached, `BUILD_ID` (and `STABLE_CACHE_VERSION`) changed with their files, catalog and sitemap links resolve, the exam statistics data is consistent, `AGENTS.md` matches `CLAUDE.md`, and every script parses.
  - `a11y-smoke.mjs` opens `sitemap.xml` pages at phone size in headless Chrome and fails on an uncaught error, sideways scrolling, a missing `<h1>`, an unnamed control or an image without `alt`.
  - `affected.mjs` limits app tests (`<app>/tests/*.test.*`) and pages to what the change can affect: a changed app's own, those of apps it exports to or imports from (`#import=` links), and suites whose tests read a changed file outside their app (such as `sw.js` or `index.html`). Changes to `assets/`, `.github/`, `manifest.json` or files outside any app run everything, as do manual runs and the Monday run. `node .github/scripts/affected.mjs --base origin/main` shows the choice.
- Merge only when PR checks are green; wait for the result without repeatedly fetching logs or rerunning passing checks.
