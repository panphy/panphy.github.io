// MathJax setup for the GCSE decks, loaded before MathJax itself.
// Maths in slides and notes is LaTeX between \( and \). Output is SVG with no shared font cache,
// so a slide's thumbnail copy and a note moved into the note pane stay complete.
//
// Diagram labels are SVG <text>, which MathJax cannot typeset in place, and the drawing code is
// shared with workbooks that print plain labels. So each deck lists its maths labels in
// window.DeckSvgTex: the plain label (or "figure|label" for one figure only) maps to the same
// label with its maths between \( and \). DeckMath.labels() swaps each listed label for words in
// the label's own font and MathJax maths, keeping its position, anchor, size and colour.
// Without MathJax (offline) the plain labels stay.
window.MathJax = {
  tex: { inlineMath: [['\\(', '\\)']], displayMath: [['\\[', '\\]']] },
  svg: { fontCache: 'none' },
  // Diagrams are handled by DeckMath.labels(), never by the page scan.
  options: { enableMenu: false, skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'annotation', 'annotation-xml', 'svg'] }
};

window.DeckMath = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const MATH = /\\\(([\s\S]+?)\\\)/g;
  const ctx = document.createElement('canvas').getContext('2d');
  const done = new WeakMap(); // original <text> → its typeset copy

  const ready = () => typeof window.MathJax?.tex2svg === 'function';
  const lookup = text => {
    const map = window.DeckSvgTex || {};
    const own = text.textContent.trim();
    const fig = text.closest('[data-fig]')?.dataset.fig;
    return map[`${fig}|${own}`] ?? map[own] ?? null;
  };

  // Colour comes from the hidden original, so it follows the deck's CSS and the theme.
  function paint(text, math) {
    const cs = getComputedStyle(text);
    math.style.fill = cs.fill;
    const halo = cs.stroke !== 'none' && cs.paintOrder.startsWith('stroke');
    math.style.stroke = halo ? cs.stroke : 'none';
    math.style.strokeWidth = halo ? cs.strokeWidth : '0';
    math.style.paintOrder = halo ? 'stroke' : '';
    math.style.strokeLinejoin = 'round';
  }

  function build(text, label) {
    const cs = getComputedStyle(text);
    const size = parseFloat(cs.fontSize) || 16;
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const cls = text.getAttribute('class') || '';
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', `svg-math ${cls}`.trim());
    g.setAttribute('aria-hidden', 'true');
    let x = 0, last = 0;
    const words = s => {
      if (!s) return;
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('class', cls);
      t.setAttribute('x', x.toFixed(2));
      t.setAttribute('y', 0);
      t.setAttribute('text-anchor', 'start');
      t.style.dominantBaseline = 'alphabetic';
      t.textContent = s.replace(/ /g, ' ');
      g.appendChild(t);
      x += ctx.measureText(s).width;
    };
    label.replace(MATH, (whole, tex, at) => {
      words(label.slice(last, at));
      last = at + whole.length;
      const out = window.MathJax.tex2svg(tex, { display: false }).querySelector('svg');
      const [, vy, vw, vh] = out.getAttribute('viewBox').split(/[\s,]+/).map(Number);
      // MathJax's glyphs run smaller than the bold sans labels beside them.
      const k = size * 1.06 / 1000;
      out.removeAttribute('style');
      out.setAttribute('x', x.toFixed(2));
      out.setAttribute('y', (vy * k).toFixed(2));
      out.setAttribute('width', (vw * k).toFixed(2));
      out.setAttribute('height', (vh * k).toFixed(2));
      out.setAttribute('overflow', 'visible');
      // Inline sizes win over deck rules such as ".fig svg { width: 100% }".
      Object.assign(out.style, { position: 'static', display: 'inline', width: `${(vw * k).toFixed(2)}px`, height: `${(vh * k).toFixed(2)}px`, maxWidth: 'none', maxHeight: 'none', overflow: 'visible' });
      out.querySelectorAll('[fill="currentColor"]').forEach(n => n.setAttribute('fill', 'inherit'));
      out.querySelectorAll('[stroke="currentColor"]').forEach(n => n.setAttribute('stroke', 'inherit'));
      out.classList.add('svg-math-tex');
      paint(text, out);
      g.appendChild(out);
      x += vw * k;
      return whole;
    });
    words(label.slice(last));

    const anchor = cs.textAnchor;
    const shift = anchor === 'middle' ? -x / 2 : anchor === 'end' ? -x : 0;
    const base = cs.dominantBaseline;
    const drop = base === 'middle' || base === 'central' ? 0.35 * size : base === 'hanging' ? 0.8 * size : 0;
    const num = name => parseFloat(text.getAttribute(name)) || 0;
    const tx = num('x') + num('dx') + shift, ty = num('y') + num('dy') + drop;
    g.setAttribute('transform', `${text.getAttribute('transform') || ''} translate(${tx.toFixed(2)} ${ty.toFixed(2)})`.trim());
    return g;
  }

  // Typeset every listed label under root (the deck or one figure). Safe to call again:
  // unchanged labels are skipped.
  function labels(root = document) {
    if (!ready()) return;
    // HTML captions in a figure are drawn after the page was typeset. Widgets typeset their own readouts.
    const figs = root.matches?.('[data-fig]') ? [root] : [...root.querySelectorAll('[data-fig]')];
    const html = figs.filter(el => /\\\(/.test(el.textContent));
    if (html.length) window.MathJax.typeset(html);
    root.querySelectorAll('svg text').forEach(text => {
      if (text.closest('.svg-math, mjx-container')) return;
      const copy = done.get(text) || (text.nextElementSibling?.matches('.svg-math') ? text.nextElementSibling : null);
      // A label that a figure rewrites (or empties) is looked up again.
      if (text.dataset.texSource !== undefined && text.dataset.texSource !== text.textContent) delete text.dataset.texLabel;
      const label = text.dataset.texLabel ?? lookup(text);
      if (!label) {
        if (copy) { copy.remove(); done.delete(text); text.style.display = ''; delete text.dataset.texSource; }
        return;
      }
      if (copy && text.dataset.texLabel === label && text.dataset.texSource === text.textContent) return;
      copy?.remove();
      text.dataset.texLabel = label;
      text.dataset.texSource = text.textContent;
      const g = build(text, label);
      text.after(g);
      text.style.display = 'none';
      done.set(text, g);
    });
  }

  function repaint() {
    document.querySelectorAll('.svg-math').forEach(g => {
      const text = g.previousElementSibling;
      if (text?.matches('text')) g.querySelectorAll('.svg-math-tex').forEach(m => paint(text, m));
    });
  }

  // Redo labels when a figure redraws, only in that figure, and re-measure the words once the
  // fonts have loaded. Our own inserted copies are ignored.
  function watch(root) {
    if (!root || !ready()) return;
    const ours = n => n.nodeType === 1 && n.matches('.svg-math');
    const pending = new Set();
    new MutationObserver(records => {
      records.forEach(r => {
        const nodes = [...r.addedNodes, ...r.removedNodes];
        if (nodes.length && nodes.every(ours)) return;
        const el = r.target.nodeType === 1 ? r.target : r.target.parentElement;
        if (!el || el.closest('.svg-math')) return;
        pending.add(el.closest('[data-fig], [data-widget]') || el.closest('svg') || el);
      });
      if (pending.size) queueMicrotask(() => {
        const figs = [...pending];
        pending.clear();
        figs.forEach(fig => { if (fig.isConnected) labels(fig); });
      });
    }).observe(root, { childList: true, subtree: true, characterData: true });
    document.fonts?.ready.then(() => {
      root.querySelectorAll('svg text[data-tex-label]').forEach(text => { delete text.dataset.texSource; });
      labels(root);
    });
  }

  // Any theme change, from the button or another tab, rewrites data-theme on <html>.
  // Repaint again once any colour transition has finished.
  new MutationObserver(() => { requestAnimationFrame(repaint); setTimeout(repaint, 500); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  return { labels, watch, repaint };
})();
