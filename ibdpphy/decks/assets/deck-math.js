// MathJax setup for the IB DP Physics decks, loaded before MathJax itself.
// Math is written as LaTeX between \( and \) in the slides and notes, as in
// PanPhy Markdown. Output is SVG with no shared font cache, so a slide's
// thumbnail copy and a note moved into the note pane stay complete.
window.MathJax = {
  tex: { inlineMath: [['\\(', '\\)']], displayMath: [['\\[', '\\]']] },
  svg: { fontCache: 'none' },
  options: { enableMenu: false }
};

// WebKit (Safari, and every browser on iPad and iPhone) sizes a table's columns while its cells still
// hold the LaTeX source, which cannot wrap, and keeps those widths once MathJax has typeset it. Taking
// each table with math out of the layout and back makes it measure the typeset math.
function relayoutMathTables() {
  document.querySelectorAll('table').forEach(table => {
    if (!table.querySelector('mjx-container')) return;
    const display = table.style.display;
    table.style.display = 'none';
    void table.offsetWidth;
    table.style.display = display;
  });
}

// A bullet dot (or step number) sits on its item's first line. When that line holds a fraction, or the item is an
// equation bullet (.frac) whose equation wraps below a lead-in, the dot moves level with the
// fraction bar, which is the height of the "=". Measured once MathJax has typeset the slides
// (before the thumbnails copy them) and again once the fonts have loaded.
(() => {
  function align() {
    document.querySelectorAll('.points > li, ol.steps > li').forEach(li => {
      const fracs = [...li.querySelectorAll('mjx-container [data-mml-node="mfrac"]')];
      const box = li.getBoundingClientRect();
      const scale = li.offsetHeight ? box.height / li.offsetHeight : 0;
      if (!fracs.length || !scale) return;
      const size = parseFloat(getComputedStyle(li).fontSize) || 40;
      const top = el => (el.getBoundingClientRect().top - box.top) / scale;
      const tallest = list => list.reduce((a, b) => (b.getBoundingClientRect().height > a.getBoundingClientRect().height ? b : a));
      const firstLine = fracs.filter(f => top(f) < size * 0.5);
      const frac = firstLine.length ? tallest(firstLine) : li.classList.contains('frac') ? tallest(fracs) : null;
      if (!frac) { li.classList.remove('dot-math'); return; }
      const bar = frac.querySelector(':scope > rect') || frac;
      const r = bar.getBoundingClientRect();
      li.style.setProperty('--dot-y', `${((r.top + r.height / 2 - box.top) / scale).toFixed(1)}px`);
      li.classList.add('dot-math');
    });
  }
  const mj = window.MathJax;
  mj.startup = {
    ...mj.startup,
    pageReady: () => window.MathJax.startup.defaultPageReady().then(() => {
      relayoutMathTables();
      align();
      document.fonts?.ready.then(() => align());
    })
  };
})();
