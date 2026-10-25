# PanPhyTrack

Manual and automatic video analysis at `tools/motion_tracker.html`. The existing URL, asset paths, and saved pane/theme preference keys stay unchanged to preserve bookmarks, offline grouping, and user settings. CSV downloads default to `panphytrack_data.csv`; transfers to PanPhyPlot create a sheet named PanPhyTrack. Auto is the default on startup and when loading or clearing a video; Manual and Edit remain available. Serve the repository with `python3 -m http.server 8000`; no build step is needed. The HTML owns the interface markup, `css/motion_tracker.css` owns the layout, and `js/main.js` starts native ES modules.

- `state.js`: shared mutable analysis and interaction state. Marks retain video playback times so changing the filming rate recalculates analysis times.
- `dom.js`: DOM elements and canvas contexts.
- `analysis.js`: calibrated positions, analysis times, and raw and smoothed velocities. No DOM dependencies.
- `tracking-core.js`: image matching, template updates, and position prediction. Independent of app state and the browser.
- `tracking.js`: asynchronous tracking runs, decoded-frame seeking, cancellation tokens, and mark insertion. A whole run uses one undo snapshot.
- `video.js`: imports and sample loading, playback, frame stepping, frame-rate detection, and filming-rate controls. Preserve callback cancellation and the saved first-frame image when changing video timing.
- `points.js`: manual marking, selection, table editing, tracking modes, and undo/redo.
- `overlay.js`: canvas rendering, calibration, and origin selection.
- `plot.js` and `theme.js`: Chart.js plots and shared-theme updates.
- `copy.js` and `export.js`: graph image copying, CSV downloads, and transfer to PanPhyPlot through the URL hash.
- `ui.js` and `panes.js`: dialogs, menus, reset, keyboard shortcuts, status controls, and the pane divider.

Modules use explicit imports and the shared state object. Event listeners are installed by initialization functions called from `main.js`; imports do not start playback or tracking. UI modules call each other during user actions, so keep cross-module calls out of module-level initialization. Keep mathematical calculations in `analysis.js` and image algorithms in `tracking-core.js`.

Run `node --test tools/motion_tracker/tests/regression.test.cjs`. Numerical tracking tests import the actual module; browser-dependent regression tests load complete modules with mocked dependencies. Use a clean browser context for video, calibration, tracking, history, export, and theme checks.

The entry page, all JavaScript modules, stylesheet, sample video, and Chart.js dependency are precached by the root service worker. When adding a module, update both `sw.js` and the PanPhyTrack requirements in `index.html`, then bump `BUILD_ID` after cached changes.
