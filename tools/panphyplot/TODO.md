# PanPhyPlot — Bug-Fix TODO for AI Agents

This document tracks outstanding bugs in `tools/panphyplot/` and gives step-by-step
instructions for an AI coding agent (or human) to implement the fixes. Each task
is self-contained: file paths, line anchors, diagnosis, the exact code change, and
verification steps are included.

---

## How to use this file

1. **Read this entire header before touching any task.** Conventions and repo-wide
   rules below apply to every fix.
2. Pick one task at a time, in the order listed (tasks are ordered by
   severity/dependency; Task 1 unblocks Tasks 12 and 13).
3. For each task, follow the checklist under "Implementation steps" and
   "Verification" exactly. Do not bundle multiple tasks into one commit unless
   the "Depends on" field says otherwise.
4. After each task is committed, update this file by changing the task's
   `Status: TODO` line to `Status: DONE (<short commit sha>)` and, if needed,
   adding a short note under "Follow-up".

## Repo conventions that apply to every task

- **No build system.** Edit HTML/CSS/JS directly. Do not add webpack/npm/etc.
- **Vanilla JS only.** Do not introduce new runtime dependencies unless the task
  explicitly calls for one.
- **Service worker cache.** If you change any file listed in `ASSETS_TO_CACHE`
  inside `sw.js`, you **must** bump the `BUILD_ID` timestamp at the top of
  `sw.js` as the final step of your change set. All `tools/panphyplot/js/*.js`
  files and `tools/panphyplot.html` are in that list, so every task in this
  document requires a `BUILD_ID` bump unless the task explicitly says it does
  not touch a cached file. Use the current UTC timestamp in the
  `YYYY-MM-DDTHH:MM:SSZ` format.
- **No absolute filesystem paths** in commit messages, PR descriptions, or code
  comments. Use repo-relative paths (e.g. `tools/panphyplot/js/fit-core.js`).
- **Do not add comments** that explain *what* the code does — names already do
  that. Only add a comment for a non-obvious *why*. Avoid referencing the task
  id or this TODO file from inside the code.
- **Do not introduce backward-compatibility shims.** If you change a function
  signature, update all call sites in the same change set.
- **Run a local server before declaring done** — open `tools/panphyplot.html`
  via `python3 -m http.server 8000` and exercise the affected UI path.

## Files you will touch (reference)

```
tools/panphyplot.html                       # Entry point — no change expected unless task says so
tools/panphyplot/js/state.js                # Global mutable state
tools/panphyplot/js/main.js                 # Bootstrap
tools/panphyplot/js/plotting.js             # Plotly rendering
tools/panphyplot/js/fit-core.js             # Shared LM + helpers (loaded in page AND worker)
tools/panphyplot/js/curve-fitting.js        # Fit orchestration, main-thread fallbacks
tools/panphyplot/js/fit-worker.js           # Web Worker for fits
tools/panphyplot/js/data-processing.js      # CSV parse/export
tools/panphyplot/js/latex-rendering.js      # Label formatting + MathJax typeset helper
tools/panphyplot/js/ui.js                   # DOM/UI interactions
tools/panphyplot/css/panphyplot.css         # Styles (not expected to change here)
sw.js                                       # Service worker — bump BUILD_ID after any cached change
```

## Shared test setup

Before verifying any task, start the local server once and keep it running:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000/tools/panphyplot.html
```

Reload with DevTools open and **disable cache** in the Network tab, otherwise
the service worker will serve stale bundles.

---

# Tasks

## Task 1 — LM `bestCost` / `bestParams` never seeded with initial iterate

- **Status:** TODO
- **Severity:** High
- **Files:** `tools/panphyplot/js/fit-core.js`
- **Depends on:** none
- **Blocks:** Task 12, Task 13 (both become moot / improve automatically once this lands)
- **Touches cached file?** Yes — bump `BUILD_ID` in `sw.js`.

### Diagnosis

`levenbergMarquardt` in `tools/panphyplot/js/fit-core.js` (lines 73–196) tracks
`bestParams` / `bestCost` but only updates them inside the "step accepted"
branch at line 181:

```js
if (nextCost < cost) {
    params = nextParams;
    if (nextCost < bestCost) {      // <-- only updated here
        bestCost = nextCost;
        bestParams = params.slice();
    }
    // ...
}
```

`bestCost` starts at `Infinity` and the cost of the **initial** iterate (computed
at line 140) is never compared against it. If LM exits before any step is
accepted — either via the early-tolerance return at line 142, or the
`lambda > 1e20` branch at line 190, or by running out of iterations — it can
return `{ params: bestParams, cost: Infinity }` with `bestParams` still equal to
the original `initialParams` array (unchanged from line 83).

Multi-start callers (`exponentialFit_cAbx`, `performPowerFit`,
`solveCustomFitMainThread`, `solveSinusoidalFitMainThread`, sinusoidal worker,
Gaussian worker) filter results by `Number.isFinite(result.cost)` and then
ask `cost < bestCost`. An `Infinity` cost fails the finite filter, so even a
perfectly fine initial guess is discarded, and `bestParams` can end up `null`
downstream — producing a spurious "could not converge" alert.

There is also an inconsistency at the early-exit branch at line 142: it returns
`{ params, cost }` (the current iterate) while the other two exits return
`{ params: bestParams, cost: bestCost }`. After this fix they should all return
the tracked best.

### Implementation steps

1. Open `tools/panphyplot/js/fit-core.js`.
2. After the line that computes `const cost = costFromResiduals(residuals);`
   (around line 140), seed the trackers with the current iterate:

   ```js
   const residuals = safeResiduals(params);
   const cost = costFromResiduals(residuals);
   if (cost < bestCost) {
       bestCost = cost;
       bestParams = params.slice();
   }
   if (Math.abs(prevCost - cost) < tolerance) {
       return { params: bestParams, cost: bestCost };
   }
   ```

   Note that the early-exit `return { params, cost }` (line 142) is replaced by
   `return { params: bestParams, cost: bestCost }` in the snippet above.

3. Leave the other two exit statements (after the `lambda > 1e20` bailout and
   at the bottom of the function) as-is — they already return `bestParams`.
4. Save.
5. Bump `BUILD_ID` in `sw.js` to the current UTC time.

### Verification

- Load PanPhyPlot. Paste this dataset into Dataset 1 (x,y per line):
  ```
  0,1
  1,2.72
  2,7.39
  3,20.09
  4,54.60
  ```
  Run Fit → Exponential. Confirm it still converges (was working before; this
  should not regress it).
- Open the browser devtools console. Replace `levenbergMarquardt` temporarily
  with a call that will never improve (e.g. a residual function that returns
  `NaN` for the trial step but finite for the initial step) OR just set
  `maxIterations: 0` in one of the callers and confirm the returned `bestCost`
  is now the initial iterate's cost rather than `Infinity`. Revert any
  temporary change.
- All existing fits (Linear, Polynomial, Exponential, Power, Sinusoidal,
  Gaussian, Custom) must still succeed with no regressions.

### Follow-up

Once this is green, re-read Task 12 and Task 13 — they may become no-ops and
can be closed with a note instead of a code change.

---

## Task 2 — `lastPlotState` cache is shared between `#plot` and `#popup-plot`

- **Status:** TODO
- **Severity:** High
- **Files:** `tools/panphyplot/js/plotting.js`, `tools/panphyplot/js/state.js`
- **Depends on:** none
- **Touches cached file?** Yes — bump `BUILD_ID` in `sw.js`.

### Diagnosis

`plotting.js` exposes two render entry points:

- `plotGraph()` renders into the DOM element `#plot` (the main workspace plot).
  Lines 416–425 check `isPlotStateEqual(data, layout)` and short-circuit if the
  new state matches the cached one, then write the new state into
  `lastPlotState`.
- `plotAllDatasets()` renders into `#popup-plot` (the "Combined plot" modal).
  Lines 581–589 do the same with **the same module-level `lastPlotState`**
  (declared in `tools/panphyplot/js/state.js` lines 15–18).

Because both targets share one cache slot, a hit on `lastPlotState` in
`plotAllDatasets` can match data/layout that were last written by `plotGraph`
(and vice versa). The short-circuit then skips
`Plotly.newPlot('popup-plot', ...)` at line 586 and the popup stays empty — or,
in the inverse scenario, the main plot silently stops updating after the popup
opens.

This is visible in the real world when the combined-plot inputs are left blank
and only one dataset exists — the popup's traces/layout can coincide with the
main plot's and the popup opens empty on first click.

### Implementation steps

1. Open `tools/panphyplot/js/state.js`. Replace the `lastPlotState`
   declaration (lines 15–18):

   ```js
   let lastPlotState = {
       data: null,
       layout: null
   };
   ```

   with a per-target cache keyed by DOM element id:

   ```js
   let lastPlotState = {
       plot: { data: null, layout: null },
       'popup-plot': { data: null, layout: null }
   };
   ```

2. Open `tools/panphyplot/js/plotting.js`. Update `isPlotStateEqual` (lines
   89–97) to accept a target-id argument and look up the correct slot:

   ```js
   function isPlotStateEqual(targetId, newData, newLayout) {
       const slot = lastPlotState[targetId];
       if (!slot) return false;
       return JSON.stringify(slot.data) === JSON.stringify(newData)
           && JSON.stringify(slot.layout) === JSON.stringify(newLayout);
   }
   ```

3. In `plotGraph` (around line 416), change the guard and the cache write:

   ```js
   if (isPlotStateEqual('plot', data, layout)) {
       return;
   }
   Plotly.react('plot', data, layout, createDownloadImageConfig('data_plot'));
   lastPlotState.plot.data = data;
   lastPlotState.plot.layout = layout;
   ```

4. In `plotAllDatasets` (around line 581), make the equivalent change:

   ```js
   if (isPlotStateEqual('popup-plot', traces, layout)) {
       showPopup();
       return;
   }
   Plotly.newPlot('popup-plot', traces, layout, createDownloadImageConfig('combined_plot'));
   lastPlotState['popup-plot'].data = traces;
   lastPlotState['popup-plot'].layout = layout;
   showPopup();
   ```

   While you are here, also delete the `safeTypeset(document.getElementById('popup-plot'));`
   call on line 592 — it is a no-op (see Task 11 below; rolling it into this
   task avoids a second touch of the file).

5. Grep the rest of the module for any other read/write of `lastPlotState.data`
   or `lastPlotState.layout` and update them to the new shape. As of writing,
   only the two sites listed above use it.
6. Save. Bump `BUILD_ID` in `sw.js`.

### Verification

- Load PanPhyPlot with existing saved state. Open the combined plot modal; it
  must render correctly on first click.
- Edit a data cell, re-open the modal — the modal must reflect the new data.
- Close the modal, then open it again with no changes — it must still show
  the chart, not go blank.
- Switch theme (light/dark) while the modal is open; combined plot must
  re-render with the new theme.
- Main plot must still react to edits while the modal is closed.

### Follow-up

- Close Task 11 with a note that the dead `safeTypeset` line was removed as
  part of this change set.

---

## Task 3 — Web Worker can't load Math.js when offline on some browsers

- **Status:** TODO
- **Severity:** High
- **Files:** `tools/panphyplot/js/fit-worker.js`, `sw.js`, possibly
  `tools/panphyplot.html`
- **Depends on:** none
- **Touches cached file?** Yes — bump `BUILD_ID` in `sw.js`.

### Diagnosis

`tools/panphyplot/js/fit-worker.js` lazily loads Math.js from a CDN (constant
`MATH_JS_CDN_URL` at line 5, called via `importScripts(MATH_JS_CDN_URL)` inside
`ensureMathLibrary` around line 313) so the Custom Fit path inside the worker
can parse and compile user formulas.

The same CDN URL is already in `ASSETS_TO_CACHE` in `sw.js` (line 44), so the
page-level `<script>` tag in `tools/panphyplot.html` is cached. However,
`importScripts` inside a dedicated worker does not uniformly route through the
registered service worker across all browsers — historically Safari has been
inconsistent, and cross-origin imports in workers may bypass SW interception
depending on the runtime. The consequence is that **custom fits may fail
silently offline** in environments where the worker bypasses the SW,
even though the rest of the app works offline.

The `runWorkerFitWithFallback` path in `tools/panphyplot/js/curve-fitting.js`
(line 154) currently swallows the failure with `console.warn` and drops to the
main thread — which works, but on large datasets this freezes the UI and the
user never finds out why.

The robust fix is to self-host Math.js under `tools/panphyplot/js/vendor/` so
the worker imports a same-origin file that the SW definitely caches.

### Implementation steps

1. Download Math.js 11.5.0 minified from the canonical CDN URL:
   `https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.5.0/math.min.js`.
   Save it locally at `tools/panphyplot/js/vendor/math.min.js`. Create the
   `vendor/` directory if it does not exist.
2. Verify SHA-256 of the downloaded file matches the CDN copy (compare two
   independent fetches; they must be byte-identical). This guards against a
   corrupted download.
3. Decide on one of the two approaches below:

   **Approach A (preferred) — self-host for both page and worker.**
   - Update `tools/panphyplot.html` to load the local copy instead of the CDN.
     Replace:
     ```html
     <script src="https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.5.0/math.min.js" defer></script>
     ```
     with:
     ```html
     <script src="/tools/panphyplot/js/vendor/math.min.js" defer></script>
     ```
   - Update `tools/panphyplot/js/fit-worker.js`:
     ```js
     const MATH_JS_URL = '/tools/panphyplot/js/vendor/math.min.js';
     ```
     and change the `importScripts` site to use it.
   - In `sw.js`, remove the CDN entry
     `'https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.5.0/math.min.js'` from
     `ASSETS_TO_CACHE` and add `'/tools/panphyplot/js/vendor/math.min.js'` in
     its place.

   **Approach B (minimal) — self-host for worker only.**
   - Leave `tools/panphyplot.html` on the CDN.
   - In `tools/panphyplot/js/fit-worker.js`, change `MATH_JS_CDN_URL` to point
     to the local vendor copy.
   - In `sw.js`, add `'/tools/panphyplot/js/vendor/math.min.js'` to
     `ASSETS_TO_CACHE` **alongside** the existing CDN entry.

   Prefer Approach A unless the user objects. It is simpler to reason about
   and removes the cross-origin import from the worker entirely.

4. Bump `BUILD_ID` in `sw.js`.

### Verification

- Serve locally, load the page once online, then turn off network
  (DevTools → Network → Offline).
- Reload the page. It must load fully offline.
- Create Dataset 1 with some data. Switch to **Custom** fit mode. Enter a
  non-trivial formula (e.g. `A*exp(b*x) + c`) and press Fit. The fit must
  complete without errors and without falling back to the main thread.
  (Confirm the worker path was taken by checking there is no
  "Falling back to main-thread" warning in the console.)

### Follow-up

If you pick Approach A, make sure **every** caller that referenced the old
`math` global still works — `curve-fitting.js` uses `math.parse` in several
places and expects it on `window`.

---

## Task 4 — `Math.min(...arr)` / `Math.max(...arr)` stack overflow on large arrays

- **Status:** TODO
- **Severity:** Medium
- **Files:** `tools/panphyplot/js/fit-core.js`, `tools/panphyplot/js/curve-fitting.js`
- **Depends on:** none
- **Touches cached file?** Yes — bump `BUILD_ID` in `sw.js`.

### Diagnosis

JavaScript engines impose a per-call argument limit; `Math.min(...xs)` and
`Math.max(...xs)` throw `RangeError: Maximum call stack size exceeded` (or
silently return `NaN` depending on engine) around ~100k–125k elements. A
teacher pasting a large CSV into PanPhyPlot can hit this — exponential / power /
Gaussian / sinusoidal fits use the spread form on every iteration.

### Call sites to fix

Grep the repo for `Math\.min\(\.\.\.` and `Math\.max\(\.\.\.` under
`tools/panphyplot/js/`. As of this writing, the sites are:

- `tools/panphyplot/js/fit-core.js:200–201` (`buildFitDomainFromData`)
- `tools/panphyplot/js/curve-fitting.js` — around lines 906–907, 976, 1081–1082,
  1148–1149, 1166–1169, 1438–1439, 1503, 1591–1594, 1616, 1621, 1651–1652.
- Also check `tools/panphyplot/js/plotting.js` and `ui.js` for any stragglers.

Re-grep at the time of implementation; line numbers drift.

### Implementation steps

1. In `tools/panphyplot/js/fit-core.js`, add a helper inside the IIFE:

   ```js
   function minMaxFinite(values) {
       let min = Infinity;
       let max = -Infinity;
       for (let i = 0; i < values.length; i++) {
           const v = values[i];
           if (!Number.isFinite(v)) continue;
           if (v < min) min = v;
           if (v > max) max = v;
       }
       return { min, max };
   }
   ```

2. Export it from `PanPhyFitCore` (in the `Object.freeze({...})` block at the
   bottom of the file).
3. Replace the `Math.min(...xValues)` / `Math.max(...xValues)` pair in
   `buildFitDomainFromData` with a single `minMaxFinite(xValues)` call.
4. In `tools/panphyplot/js/curve-fitting.js`, expose the helper the same way it
   exposes `levenbergMarquardt`:

   ```js
   const minMaxFinite = typeof fitCore.minMaxFinite === 'function'
       ? fitCore.minMaxFinite
       : missingFitCoreFunction('minMaxFinite');
   ```

   Then replace every `Math.min(...someArray)` + `Math.max(...someArray)` pair
   with a single `const { min, max } = minMaxFinite(someArray);` followed by
   `min` / `max` references. Single-call sites (e.g. `Math.max(...y)` without
   a corresponding min) can still use `minMaxFinite` and ignore the other side.
5. Audit the worker: in `tools/panphyplot/js/fit-worker.js` there are no direct
   spread calls today (buildFitDomainFromData runs inside fit-core which the
   worker imports), but add a grep-check as insurance.
6. Save. Bump `BUILD_ID` in `sw.js`.

### Verification

- Paste a 50k-row dataset and run each fit type (Linear, Polynomial-2 to
  Polynomial-5, Exponential, Power, Sinusoidal, Gaussian, a simple Custom fit).
  All must complete without `RangeError`.
- Small-dataset fits (5–10 points) must still produce the same results as
  before (within floating-point noise).

---

## Task 5 — `formatLabelForLatex` escapes spaces inside `\text{}` groups

- **Status:** TODO
- **Severity:** Medium
- **Files:** `tools/panphyplot/js/latex-rendering.js`
- **Depends on:** none
- **Touches cached file?** Yes — bump `BUILD_ID` in `sw.js`.

### Diagnosis

`formatLabelForLatex` in `tools/panphyplot/js/latex-rendering.js` (lines 54–56):

```js
function formatLabelForLatex(label) {
    return label ? label.replace(/ /g, '\\space ') : '';
}
```

The replacement runs globally, so spaces inside `\text{angle of refraction}`
become `\text{angle\space of\space refraction}`. MathJax renders the `\space`
control sequences as thin mathematical gaps rather than real word spacing, so
the typeset label looks broken.

The auto-title builder at line 42 makes this worse:
`${yColumn} \text{vs} ${xColumn}` → after space-escaping becomes
`${yColumn}\space \text{vs}\space ${xColumn}`, and any multi-word y/x column
name inside a `\text{}` group gets mangled.

### Implementation steps

1. Replace `formatLabelForLatex` with a depth-aware walker that only escapes
   top-level spaces (outside `{...}` groups). Example implementation:

   ```js
   function formatLabelForLatex(label) {
       if (!label) return '';
       let out = '';
       let depth = 0;
       for (let i = 0; i < label.length; i++) {
           const ch = label[i];
           if (ch === '{') {
               depth++;
               out += ch;
           } else if (ch === '}') {
               if (depth > 0) depth--;
               out += ch;
           } else if (ch === ' ' && depth === 0) {
               out += '\\space ';
           } else {
               out += ch;
           }
       }
       return out;
   }
   ```

2. Fix the auto-title at line 42 so the `\text{vs}` run is surrounded by
   spaces even at depth 0. Change:

   ```js
   const autoTitle = latexMode ? `${yColumn} \\text{vs} ${xColumn}` : `${yColumn} vs ${xColumn}`;
   ```

   to:

   ```js
   const autoTitle = latexMode
       ? `${yColumn}\\space \\text{ vs }\\space ${xColumn}`
       : `${yColumn} vs ${xColumn}`;
   ```

   (The spaces inside `\text{ vs }` render as real word spacing; the
   surrounding `\space` separates the `\text` group from neighbouring
   identifiers.)

3. Save. Bump `BUILD_ID` in `sw.js`.

### Verification

- Turn on LaTeX mode.
- Set X column to `time` and Y column to `distance`. Title should read
  `distance vs time` with correct spacing.
- Set X column to `\text{position (m)}`. Spaces inside the `\text{}` group
  must remain real spaces in the rendered label, not thin gaps.
- Save state, reload, confirm persistence path is unchanged.

---

## Task 6 — Worker failures silently fall back to main thread

- **Status:** TODO
- **Severity:** Medium
- **Files:** `tools/panphyplot/js/curve-fitting.js`, possibly
  `tools/panphyplot/js/ui.js`
- **Depends on:** Task 3 (optional — if Task 3 eliminates the most common
  failure mode this becomes lower priority, but it's still worth implementing)
- **Touches cached file?** Yes — bump `BUILD_ID` in `sw.js`.

### Diagnosis

`runWorkerFitWithFallback` in `tools/panphyplot/js/curve-fitting.js`
(lines 154–161) catches any worker error and drops to the main-thread solver
with only a `console.warn`. Teachers and students do not open consoles, and a
permanently broken worker (CSP, CDN outage for custom fits, SW bug on older
Safari) manifests as unexplained UI freezes during every large-dataset fit.

### Implementation steps

1. Add a session-scoped flag at the top of the IIFE in `curve-fitting.js`:

   ```js
   let fitWorkerDisabled = false;
   ```

2. In `runWorkerFitWithFallback`, check the flag before attempting the worker,
   and set it on first failure. Surface a one-time toast so the user knows
   performance will be reduced:

   ```js
   async function runWorkerFitWithFallback(task, payload, fallbackSolver) {
       if (fitWorkerDisabled) return fallbackSolver();
       try {
           return await runFitWorkerTask(task, payload);
       } catch (workerError) {
           console.warn(`Falling back to main-thread ${task} fit:`, workerError);
           if (!fitWorkerDisabled) {
               fitWorkerDisabled = true;
               if (typeof showToast === 'function') {
                   showToast('Fit worker unavailable — running on main thread.', 'warning');
               }
           }
           return fallbackSolver();
       }
   }
   ```

   `showToast` is the global toast helper defined at the top of
   `tools/panphyplot/js/ui.js`. It is already loaded before `curve-fitting.js`
   per the script order in `tools/panphyplot.html`, so the call is safe.

3. Save. Bump `BUILD_ID` in `sw.js`.

### Verification

- Temporarily edit `FIT_WORKER_URL` to a non-existent path to force a worker
  error. Run any advanced fit. Confirm the toast appears exactly once per
  session and the fit still produces a result via the fallback. Revert the
  edit.
- Run the fit a second time — the toast must **not** reappear (flag is sticky
  for the session). The fallback path must be used without attempting the
  worker again.
- Reload the page. The flag resets; a fresh failure triggers the toast again.

---

## Task 7 — Plotly deprecated `titlefont` and bare-string `title`

- **Status:** TODO
- **Severity:** Low
- **Files:** `tools/panphyplot/js/plotting.js`
- **Depends on:** Task 2 (recommended — both edit the same file; batch if
  convenient)
- **Touches cached file?** Yes — bump `BUILD_ID` in `sw.js`.

### Diagnosis

Plotly.js 2.29.1 accepts the `titlefont` shorthand and `title: "..."` bare
strings for backward compatibility, but both are deprecated in favour of the
nested form:

- `xaxis: { title: { text: '...', font: { color: '...' } } }`
- `title: { text: '...', font: { size: 16 } }`

`tools/panphyplot/js/plotting.js` is inconsistent:

- `plotGraph`'s main-plot layout at line 385 uses a bare string
  `title: titleText`.
- `plotGraph` also uses `yaxis.titlefont` at line 376.
- Theme-apply blocks at lines 395–397 / 401–403 / 561–563 / 567–569 copy
  `titlefont` from the theme settings dictionary.

This will break silently on any future Plotly upgrade. Also, styling applied
via the nested object (e.g. dark-theme title font color) does not propagate to
the bare-string title.

### Implementation steps

1. Convert the `title:` entries to `{ text, font }` shape everywhere in
   `plotting.js`. Example for the main-plot layout around line 385:

   ```js
   title: { text: titleText, font: { size: 16 } },
   ```

2. Rename `titlefont` → `title.font` in all theme and axis layout blocks.
   For each axis layout object like:

   ```js
   yaxis: {
       title: { text: ..., standoff: 25 },
       titlefont: { size: 14 },
       ...
   }
   ```

   merge the font into the title object:

   ```js
   yaxis: {
       title: { text: ..., font: { size: 14 }, standoff: 25 },
       ...
   }
   ```

3. Update the theme-settings data in `getPlotThemeSettings()` if it embeds
   `titlefont` — replace with `title: { font: {...} }`. Apply the same
   transform to every theme merge in `plotGraph` and `plotAllDatasets`.
4. Grep the file for remaining `titlefont` occurrences — there must be none
   after the refactor.
5. Save. Bump `BUILD_ID` in `sw.js`.

### Verification

- Load PanPhyPlot in light and dark themes. Confirm:
  - Main plot title and axis labels render with correct font / color in both
    themes.
  - Combined-plot modal renders likewise.
  - No Plotly deprecation warnings are printed to the console.
- Save a plot as PNG (download button). Exported image must still include
  the title at the expected size.

---

## Task 8 — Polynomial fit is ill-conditioned for high degrees

- **Status:** TODO
- **Severity:** Low
- **Files:** `tools/panphyplot/js/curve-fitting.js`
- **Depends on:** none
- **Touches cached file?** Yes — bump `BUILD_ID` in `sw.js`.

### Diagnosis

`polyfit` in `tools/panphyplot/js/curve-fitting.js` (lines 1281–1293) builds a
Vandermonde `X` directly from raw `x` and calls `math.lusolve(X^T X, X^T y)`.
For degree 4+ on data with a narrow x range (e.g. x in [1000, 1010]) the
`X^T X` matrix is severely ill-conditioned — `lusolve` returns
coefficients like `1e12` that overflow later plotting, and the R² can still
look fine while predictions outside the sample range blow up.

### Implementation steps

1. In `polyfit`, center and scale `x` before building the Vandermonde, then
   store the transform so `polyEval` inverts it:

   ```js
   function polyfit(x, y, degree) {
       const n = x.length;
       const meanX = x.reduce((s, v) => s + v, 0) / n;
       const stdXRaw = Math.sqrt(x.reduce((s, v) => s + (v - meanX) ** 2, 0) / n);
       const stdX = stdXRaw > 0 ? stdXRaw : 1;

       const X = x.map(xi => {
           const u = (xi - meanX) / stdX;
           return Array.from({ length: degree + 1 }, (_, j) => u ** (degree - j));
       });
       const Xt = math.transpose(X);
       const XtX = math.multiply(Xt, X);
       const XtY = math.multiply(Xt, y);
       const scaledCoefficients = math.lusolve(XtX, XtY).flat();

       return { coefficients: scaledCoefficients, meanX, stdX };
   }
   ```

2. Update `polyEval` to accept the transform:

   ```js
   function polyEval(fit, x) {
       const u = (x - fit.meanX) / fit.stdX;
       return fit.coefficients.reduce(
           (sum, coef, i) => sum + coef * u ** (fit.coefficients.length - i - 1),
           0
       );
   }
   ```

3. Update `performPolynomialFit` to consume the new return shape. The
   equation string it builds currently prints `c * x^n` terms directly; with
   the rescaling, it would need to print in terms of `u = (x - meanX)/stdX`.
   Two options:

   - **Simple (preferred):** expand the scaled polynomial back to coefficients
     in raw `x` for display only (numerical evaluation continues to use the
     scaled form). Expansion is
     `P(u) = Σ a_k u^(n-k)` with `u = (x - meanX) / stdX`, which expands via
     repeated binomial. Add a helper `expandToRawX(scaledCoefficients, meanX, stdX)`
     that returns an array of raw-x coefficients of the same length.
   - **Pragmatic:** keep the displayed equation in terms of `u` and annotate
     `u = (x - μ) / σ` with `μ` and `σ` rounded to 3dp. Less friendly for
     students but trivial to implement.

   Pick the simple/expanded form if you can. If the expansion logic becomes
   fiddly, document the `u`-form and move on.

4. Save. Bump `BUILD_ID` in `sw.js`.

### Verification

- Paste a dataset with x ∈ [1000, 1010] and a known cubic relationship. Fit
  Polynomial-3. Confirm coefficients are reasonable (not 1e12) and the plotted
  curve passes through the data.
- Paste a dataset with x ∈ [0, 1] and fit Polynomial-2. Confirm results are
  identical within float noise to the pre-change implementation (center/scale
  with near-zero mean and unit std should be a no-op).
- R² displayed to the user must still be sensible.

### Follow-up

This is a quality-of-life fix, not a correctness bug. If implementation cost
is too high for the simple-form equation, fall back to the pragmatic
"display `u = (x - μ)/σ`" path. Do not leave the equation un-renderable.

---

## Task 9 — `performPowerFit` can feed non-finite initial guesses to LM

- **Status:** TODO
- **Severity:** Low
- **Files:** `tools/panphyplot/js/curve-fitting.js`
- **Depends on:** none (independent of Task 1, but Task 1 already reduces the
  downstream blast radius)
- **Touches cached file?** Yes — bump `BUILD_ID` in `sw.js`.

### Diagnosis

`performPowerFit` (around line 1609) shifts `x0` and `c` by `1e-6` to guarantee
`x - x0 > 0` and `y - c > 0`, then takes `log`. For edge values where the
shift isn't enough (floating-point equality), `Math.log(0)` returns `-Infinity`
and `computeLinearFit` produces NaN slope/intercept. These NaN initial params
go into `levenbergMarquardt`; its internal `safeResiduals` defends the cost
computation, but the outer loop still records the NaN-derived branch as a
candidate.

### Implementation steps

1. After computing `AInitial` / `bInitial` / `shiftedX0` / `shiftedC`, validate
   all four. If any is non-finite, replace the initial params with a safe
   default before calling LM:

   ```js
   const initialParams = [AInitial, bInitial, shiftedX0, shiftedC];
   if (initialParams.some(v => !Number.isFinite(v))) {
       initialParams[0] = 1;
       initialParams[1] = 1;
       initialParams[2] = shiftedX0;
       initialParams[3] = shiftedC;
   }
   ```

2. Save. Bump `BUILD_ID` in `sw.js`.

### Verification

- Fit Power on a dataset where `min(y) === 0` (e.g. `(0,0), (1,1), (2,4), (3,9)`).
  Must not throw, must produce a reasonable fit.
- Existing power-fit datasets must converge to the same parameters as before
  (within float tolerance).

---

## Task 10 — Follow-ups made redundant by Task 1

- **Status:** TODO (verify after Task 1 lands)
- **Severity:** Low
- **Files:** `tools/panphyplot/js/curve-fitting.js`

### Diagnosis

After Task 1 seeds `bestCost`/`bestParams` with the initial iterate, two
previously-flagged issues likely resolve on their own:

- **Task 12 (prior review):** `exponentialFit_cAbx` returning `null` when all
  LM branches return `cost = Infinity`.
- **Task 13 (prior review):** `solveCustomFitMainThread` /
  `solveSinusoidalFitMainThread` dropping useful "no improvement" results.

### Implementation steps

1. Re-run the relevant paths after Task 1 is green:
   - Exponential fit on a dataset where the default candidate starts produce
     no improvement but a sensible initial guess (e.g. pure linear data forced
     through Exponential).
   - Custom fit with a formula that exactly matches the data at the initial
     guess.
2. If these paths now produce a fit instead of alerting "could not converge",
   mark this task DONE with no code change. If they still fail, file a new
   task with a minimal repro case and a diagnosis.

### Verification

No independent verification — this task is a follow-up audit, not a fix.

---

## Task 11 — Dead `safeTypeset` call on popup plot

- **Status:** TODO (close automatically when Task 2 lands)
- **Severity:** Trivial
- **Files:** `tools/panphyplot/js/plotting.js`

### Diagnosis

`plotAllDatasets` at line 592 calls `safeTypeset(document.getElementById('popup-plot'))`.
Plotly renders its own SVG text; MathJax v2 does not typeset Plotly SVG labels
through `MathJax.Hub.Queue`. The call is a no-op.

### Implementation steps

This task is rolled into Task 2's step 4 ("delete the `safeTypeset` call on
line 592"). If Task 2 has already landed and the line is gone, close this
task with a note. If Task 2 is still open, do not touch this in isolation —
it would force two `BUILD_ID` bumps.

### Verification

Grep for `safeTypeset.*popup-plot` in `tools/panphyplot/js/plotting.js`. Result
must be empty after Task 2.

---

# Post-fix checklist

Once all the high- and medium-severity tasks are complete:

- [ ] Every edited file that is listed in `ASSETS_TO_CACHE` (all
  `tools/panphyplot/js/*.js` files and `tools/panphyplot.html`) has caused a
  `BUILD_ID` bump — confirm by reviewing the git log for `sw.js`.
- [ ] Load PanPhyPlot fully offline (Network → Offline) and confirm:
  - Linear, Polynomial-2 to Polynomial-5, Exponential, Power, Sinusoidal,
    Gaussian, and Custom fits all work.
  - Theme toggle persists across reload.
  - Combined-plot modal renders.
  - Data table import/export works.
- [ ] Run through `tools/panphyplot/panphyplot_manual.html` and
  `tools/panphyplot/math_ref.html` — confirm links from main UI still resolve
  (no path changes expected, but verify).
- [ ] Verify mobile layout at ≤640px is unchanged (no task here touches CSS).
