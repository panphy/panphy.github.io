# CLAUDE.md — PanPhy Labs

PanPhy Labs is a static GitHub Pages PWA for physics tools, simulations, classroom utilities, and games. See `README.md` for the project map and local setup.

## Where the rules live

This file holds the rules for every task. Section rules and occasional procedures live elsewhere, so read the one that matches the task before starting it.

| For | Read |
| --- | --- |
| Anything under `gcsephy/` | `gcsephy/AGENTS.md` |
| Anything under `ibdpphy/` | `ibdpphy/AGENTS.md` |
| Adding or promoting a general published app | skill `publish-app` |
| Changing a cached file, `sw.js` or `assets/sw-register.js` | skill `service-worker` |
| Changing a workbook, sheet or other printed resource's source | skill `workbook-pdfs` |
| A Spellwave gameplay change | skill `spellwave-reset` |
| Checking or sweeping teaching decks | skill `deck-audit` |

Claude Code loads a folder's `CLAUDE.md` (the same text as its `AGENTS.md`) by itself when it works there; other agents read the folder's `AGENTS.md` first. Skills are in `.agents/skills/<name>/SKILL.md`; `.claude/skills` links to the same folder.

## Working rules

- Use American English everywhere, including documentation, unless the user asks otherwise. Exceptions: everything under `gcsephy/` uses British English, and Spellwave (`fun/spellwave.html`, `fun/spellwave/`) uses British English in its UI and accepts British and American spellings as answers.
- Edit HTML, CSS and vanilla JavaScript directly: the served site needs no framework, bundler or build step. Local development dependencies stay ignored and optional. Follow the existing CDN or local-library patterns.
- Keep each app reachable through its own HTML entry point. Split CSS/JS when useful, with stable, unhashed filenames.
- Each `AGENTS.md` (the root, `gcsephy/` and `ibdpphy/`) has a `CLAUDE.md` beside it, identical apart from the title; update both when a rule changes, and keep the table above in step with the folder files and skills.
- Preserve unrelated user changes and existing functionality. UI changes and file removals must serve the requested task; ask before destructive changes outside it.
- Keep tool state in `.agents/` and `.claude/` local and ignored, except the shared skills (`.agents/skills/` and the `.claude/skills` link). Put scratch files outside the repository where practical, and delete temporary files you created.
- `main` is production: `.github/workflows/deploy.yml` publishes every push to GitHub Pages (source "GitHub Actions"), uploading the repository without dot files and trying a failed deployment up to three times in all. Work on `codex/` or `claude/` branches and merge through pull requests.
- Finalizing means: verify, commit and push, open a PR, merge once its checks pass, then clean up. "Commit, push, merge and cleanup" means the same, PR included. Review the final diff once and run only the checks the change still needs. Merge without another review or test cycle unless files change, checks fail or a concrete concern remains. Afterwards, return to an up-to-date `main` and delete only the task's local branch and temporary worktrees; GitHub deletes the remote branch. Do not wait for the Pages deployment or repeat browser checks unless asked or investigating a deployment problem.

## Page placement

| Location | Purpose | Catalog and offline policy |
| --- | --- | --- |
| `tools/`, `sandboxes/`, `simulations/`, `for_teachers/` | General published apps | Listed on the homepage and in `sitemap.xml`; offline by default |
| `fun/` | Games and playful demos | May be listed publicly; always network-only |
| `beta/` | New and trial apps | Listed in `beta/index.html`; no service-worker registration or caching |
| `misc/` | Unlisted pages and resources | Listed with short descriptions in `misc/index.html`; no registration or caching |
| `gcsephy/` | Public GCSE resources for one school | Direct links only, outside the root catalog; see `gcsephy/AGENTS.md` |
| `ibdpphy/` | Public IB Diploma Programme Physics resources | As `gcsephy/`; see `ibdpphy/AGENTS.md` |

- Keep the beta and misc inventories current when entries are added, moved, renamed or removed; supporting files need no entries.
- Promote an app out of `beta/` only when the user asks or approves, never on your own initiative.
- When you change a page listed in `sitemap.xml`, set its `<lastmod>` to the date of the change.

## Caching

- Files in `ASSETS_TO_CACHE` (`sw.js`) are cache-first: after changing any of them, update `BUILD_ID` as the last code change, to a UTC timestamp `YYYY-MM-DDTHH:MM:SSZ`. The skill `service-worker` has the rest.
- `/beta`, `/misc`, `/fun`, `/gcsephy`, `/ibdpphy` and Supabase API calls are network-only. Never assume an uncached resource works offline.

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
- Theme: `/assets/theme.js` stores the `panphy-theme` preference and sets `data-theme` on `<html>`; never add app-specific theme keys (`gcsephy/` and `ibdpphy/` have their own scope, described in their files). Load it synchronously in the head, after the `theme-color` metadata and before styles, so the theme applies before first paint. Build controls with `PanPhyTheme.toggle()` or `/assets/theme-toggle.js` (`PanPhyThemeToggle.mount(button)`), and refresh charts, scenes and other theme-dependent content on `panphy:theme-change`, which also fires for changes in other tabs.
- Keep `apple-mobile-web-app-status-bar-style` at `default` and color the bar with `theme-color`. iOS/iPadOS 26+ home-screen apps blur the top of the screen, so published pages link `/assets/standalone-top.css`, which reserves a flat strip; offset anything pinned to the top (sticky headers, fixed buttons, fullscreen panes) by `var(--standalone-top)`.
- Published apps typeset math with `/assets/math.js`, loaded in the head: LaTeX between `\(` and `\)` (`\dfrac` for fractions, `{}^{A}_{Z}\mathrm{X}` for nuclides), shown with `PanPhyMath.setMath`, `setMathHtml` or `mathHtml`, or `data-math-static` on static HTML. Typeset readout labels, never their values; numbers, units, `<option>` text and canvas or 3D labels stay plain. List `/assets/math.js` and the pinned MathJax URL in the page's offline requirements.
- Every new page, app, deck or printed resource shows "© PanPhy Labs. All rights reserved." (`&copy;` in HTML), with no year so it never needs updating, because visitors often arrive directly. Put it in the footer, keeping existing links; full-viewport apps put it in an existing panel, start screen or dialog so no layout gains height; decks put it on the title slide (`slide-copyright`); printed workbooks and sheets put it in the running footer.
- Save new photos and illustrations as WebP at full resolution (`cwebp -q 82` for illustrations, `-q 85` for photos, `-metadata icc`), and keep the original if WebP is not clearly smaller. Keep PNG for icons, favicons, manifest icons and `og:image`, and use SVG or code for diagrams.
- Generate procedural WebGL glows, dots, shadows and masks with `/assets/three-textures.js` (`radialTexture`, `rgbaTexture`), never a 2D canvas: Safari's fingerprinting protection can speckle canvas-to-WebGL uploads. Reserve `CanvasTexture` for text labels and dynamic displays, and keep 2D radial-gradient drawings in modules that upload no canvas textures. Cache the helper and list it in each consuming app's offline requirements.
- For flex-based Three.js canvases, use `renderer.setSize(w, h, false)` with CSS `height: 0; flex: 1; min-height: 0` to avoid sizing feedback loops.

## Documentation

- Review only the READMEs that the change affects, including parent overviews when maps, commands, counts, links or page numbers change, and fix what is stale; skip unrelated READMEs. Keep READMEs short: what the folder is, how to build or edit it, and what is not obvious; no history, nothing the code already shows.

## Verification

- Verification is incremental: reuse passing checks for unchanged files, and rerun only what later edits, failures or a concrete concern invalidate. Finalizing alone needs no new test or browser pass. Run the affected app tests locally; leave unrelated suites to PR checks.
- Serve locally with `python3 -m http.server 8000` (`http://localhost:8000`), in an uncached origin or clean browser context so no stale service worker interferes. For UI changes, check the affected browser flows and responsive layouts.
- Before pushing code, content, caching or workflow changes, run `node .github/scripts/check.mjs --base origin/main` once; it also enforces much of the page wiring described here, and its header lists what. End a line with a `check-ok` comment to exempt a deliberate exception. After changing a page's layout or controls, run `node .github/scripts/a11y-smoke.mjs [page ...]` (needs Chrome, no packages). For PanPhyPlot data handling or fitting, run `node --test tools/panphyplot/tests/*.test.cjs misc/panphyplotog/tests/regression.test.cjs`. Documentation-only changes need only a check of accuracy and links.
- Every pull request runs `.github/workflows/checks.yml`: `check.mjs`, `a11y-smoke.mjs`, `deck-check.mjs` and the app tests that `affected.mjs` picks (`node .github/scripts/affected.mjs --base origin/main` shows the choice). Each script's header says what it checks. Merge only when PR checks are green; wait for the result without repeatedly fetching logs or rerunning passing checks.
