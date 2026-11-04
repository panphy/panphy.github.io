# PanPhyCircuits manual screenshots

Five light/dark WebP pairs (captured as PNG, saved at quality 90) illustrate the walkthrough in `../manual.html`. `manual.css` uses the shared Spectrum tokens from `/assets/design.css`; `manual.js` manages Contents, theme-aware screenshot zoom and focus restoration. They show **Examples → Ammeter and voltmeter connections** in the realistic view, with the switch closed, with the voltmeter selected, in the circuit-diagram view and with the File menu open.

Retake all of them whenever the app’s interface changes with `capture.mjs`, which drives the real app in headless Chrome at 1680 × 980 with a throwaway profile and writes the WebP files here. It needs Chrome and `cwebp`; serve the repository root first, then run it from there:

```
python3 -m http.server 8000
node sandboxes/panphycircuits/manual/capture.mjs
```

Set `BASE=http://localhost:PORT` for another server and `CHROME=…` for another browser.

Filenames stay stable. When replacing a pair, update dimensions and captions in the manual if needed. List images in `sw.js` and the PanPhyCircuits `OFFLINE_CARD_REQUIREMENTS` in `index.html`, then bump `BUILD_ID`.
