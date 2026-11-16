// Shared visual setup runs before the viewers clone slides into thumbnails.
(() => {
  const root = document.documentElement;
  // Each deck names its year in data-year on <html>.
  const year = Number(root.dataset.year) || 9;
  document.querySelectorAll('#deck > .slide').forEach(slide => {
    const badge = document.createElement('span');
    badge.className = 'year-badge';
    badge.textContent = `Year ${year}`;
    slide.appendChild(badge);
    // GCSE Physics (8463) only, not Combined Science: Trilogy. The top edge holds the year badge.
    if (slide.classList.contains('triple')) {
      const flag = document.createElement('span');
      flag.className = 'triple-flag';
      flag.textContent = 'Triple Science only';
      slide.appendChild(flag);
    }
  });
  // Unicode superscripts and subscripts (m s⁻¹, CO₂) are missing from the deck fonts, so the browser
  // borrows mismatched glyphs. Set them as <sup>/<sub> with ordinary digits and a true minus sign.
  // Text with LaTeX in it is left for MathJax.
  const SCRIPT = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁺': '+', '⁻': '−', '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', '₊': '+', '₋': '−' };
  const deck = document.getElementById('deck');
  if (deck) {
    const walker = document.createTreeWalker(deck, NodeFilter.SHOW_TEXT, {
      acceptNode: node => (/[⁰¹²³⁴-⁹⁺⁻₀-₉₊₋]/.test(node.data) && !/\\[([]/.test(node.data) && !node.parentElement.closest('svg, mjx-container, script, style, code, textarea') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const frag = document.createDocumentFragment();
      let last = 0;
      node.data.replace(/([⁰¹²³⁴-⁹⁺⁻]+)|([₀-₉₊₋]+)/g, (run, sup, sub, at) => {
        frag.append(node.data.slice(last, at));
        const el = document.createElement(sup ? 'sup' : 'sub');
        el.textContent = [...run].map(c => SCRIPT[c]).join('');
        frag.append(el);
        last = at + run.length;
        return run;
      });
      frag.append(node.data.slice(last));
      node.replaceWith(frag);
    });
  }
  document.querySelectorAll('#deck table').forEach(table => {
    // Reveal the content, while keeping the table structure and grid visible.
    table.querySelectorAll('td, th').forEach(cell => {
      if (!cell.matches('.step') && !cell.parentElement.matches('.step')) return;
      const content = document.createElement('span');
      content.className = 'cell-content';
      while (cell.firstChild) content.appendChild(cell.firstChild);
      cell.appendChild(content);
    });
    const wrapper = document.createElement('div');
    wrapper.className = 'table-scroll';
    table.before(wrapper);
    wrapper.appendChild(table);
  });
  const themeButton = document.getElementById('theme-button');
  if (themeButton && !themeButton.querySelector('svg')) window.PanPhyThemeToggle.mount(themeButton);
})();
