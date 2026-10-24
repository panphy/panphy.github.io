// MathJax setup for the IB DP Physics decks, loaded before MathJax itself.
// Math is written as LaTeX between \( and \) in the slides and notes, as in
// PanPhy Markdown. Output is SVG with no shared font cache, so a slide's
// thumbnail copy and a note moved into the note pane stay complete.
window.MathJax = {
  tex: { inlineMath: [['\\(', '\\)']], displayMath: [['\\[', '\\]']] },
  svg: { fontCache: 'none' },
  options: { enableMenu: false }
};
