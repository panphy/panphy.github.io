// MathJax setup for the IB DP Physics decks, loaded before MathJax itself.
// Maths is written as LaTeX between \( and \) in the slides and notes, as in
// PanPhy Markdown. Output is SVG with no shared font cache, so a slide's
// thumbnail copy and a note moved into the note pane stay complete.
window.MathJax = {
  tex: { inlineMath: [['\\(', '\\)']], displayMath: [['\\[', '\\]']] },
  // MathJax matches the x-height of the text around it; Manrope's is tall, so ease the maths back a little.
  svg: { fontCache: 'none', scale: 0.92 },
  options: { enableMenu: false }
};
