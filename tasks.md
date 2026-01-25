# Follow-up Tasks

## Bugs / Reliability
- [ ] Add local fallbacks for CDN libraries (Chart.js, Plotly, MathJax, Marked, DOMPurify, Highlight.js) so first-time offline use works even if the service worker fails to cache them.
- [ ] Add a touchstart handler in the graph digitizer to trigger point capture immediately on touch devices (currently relies on touchend/touchmove only).

## UX / Product Improvements
- [ ] Decide how to handle the external EAL Companion app for offline use (e.g., build a local fallback, add an offline-only notice, or mark it clearly as online-only).
- [ ] Add an offline status indicator/banner in each app so users know when cached mode is active.
