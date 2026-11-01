# PanPhyMech manual screenshots

Five light/dark WebP pairs illustrate the pendulum walkthrough in `../manual.html`, and five more (`build-1` to `build-5`) the Tip: build complex objects section, which builds the Motor car body with Merge and Subtract. The local CSS and script follow the PanPhyCircuits manual: Spectrum surfaces, Contents, expandable reference topics and theme-aware screenshot zoom with focus restoration.

Retake all of them whenever the app’s interface changes (a new part, panel or control) with `capture.mjs`, which drives the real app in headless Chrome at 1680 × 980 and writes the WebP files here (quality 90). It needs Chrome and `cwebp`; serve the repository root first, then run it from there:

```
python3 -m http.server 8000
node sandboxes/panphymech/manual/capture.mjs
```

Pass `pendulum`, `build` or `drive` to retake one group, `BASE=http://localhost:PORT` for another server and `CHROME=…` for another browser. The script uses a throwaway profile, steps time in 1/60 s steps (6.53 s for the pendulum, 3.30 s for the car) and captures each light/dark pair from the same state, without notifications or the pointer over the scene. The pendulum pairs show the initial workspace, a paused run, the selected bob’s Inspector, a selected graph interval and the File menu. The build pairs rebuild the Motor car body from the manual’s own coordinates with the real Merge and Subtract, framed at x −5.6 to −2.4 m, y 0 to 1.5 m; the last pair uses the example’s own view. Check every image against its caption and alt text, and update the HTML if the dimensions change.

Verify step links, Contents, direct links to closed topics, keyboard closing and focus return, Actual size zoom and both themes at desktop and phone widths. The manual and its screenshots are cached with PanPhyMech. Keep `sw.js` and the app’s `OFFLINE_CARD_REQUIREMENTS` in `index.html` in sync when adding or renaming files, then bump `BUILD_ID`.
