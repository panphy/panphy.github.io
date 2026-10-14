# GCSE deck design sample

An 11-slide design review, using the calm IB/Year 11 layout with light orange for Year 9, lime for Year 10 and light yellow for Year 11. Open `index.html` through a local server or the beta index. It has no service-worker registration or offline cache.

Edit `index.html` for content and `sample.css` for the year palettes and layouts. The sample is a separate presentation. Source links on each teaching slide identify the material being reworked.

The sample reuses the existing GCSE figure scripts, the Year 9 kinetic-energy interaction, and IB deck styles and maths setup. `sample-figures.js` combines the figure renderers. `viewer.js` is adapted from the IB viewer with a separate thumbnail preference. The theme shares the GCSE section preference. Sample-specific diagram rules keep circuit-symbol strokes independent of the shared illustration styles. Pastels identify years; essential diagram outlines and labels use stronger contrast in both themes.

Use arrow keys or the navigation buttons for step reveals and slide changes. Thumbnails jump to a slide, F presents, and T toggles thumbnails. Portrait phones show each slide as a readable scrolling page; fullscreen presentation keeps the 16:9 layout. Maths uses the existing MathJax CDN pattern.
