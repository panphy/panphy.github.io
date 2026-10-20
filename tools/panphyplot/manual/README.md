# Manual screenshots

Nine light/dark PNG pairs illustrate the six-step walkthrough and expandable reference in `../manual.html`. `manual.css` styles the guide; `manual.js` manages Contents, direct links into closed reference topics, theme-aware image zoom and focus restoration. Capture the real app using **Try sample data** on an empty sheet in an isolated browser session. Do not capture personal datasets or temporary notifications.

Follow the manual's six-step pendulum example: add the mean and half-spread uncertainty for T1–T3, calculate `T^2` with propagated uncertainty, hide T, and fit T² against L with a weighted straight line. Capture the workspace, Mean, Formula, calculated columns, Fit, Result, graph with residuals, View Table and Clear. Keep both themes at the same state and dimensions. Use the app's pane controls to frame the table and fit cards clearly; capture dialogs and cards closely enough to read.

Keep filenames stable. When replacing a pair, update the image dimensions and captions in the manual if needed. Images are listed in both `sw.js` and the PanPhyPlot `OFFLINE_CARD_REQUIREMENTS` in `index.html`; update those lists when adding or removing a pair, and bump `BUILD_ID` after any image change.

When editing the guide, keep each action followed by its expected outcome and screenshot. Preserve existing topic anchors. Verify Next/Previous links, Contents, direct reference links, keyboard closing and focus return, screenshot zoom at Actual size, and both themes at desktop and phone widths.
