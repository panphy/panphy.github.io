// Typeset math for published apps. Load it in the head with <script src="/assets/math.js"></script>.
// It sets up and loads MathJax (the cached, pinned full SVG build) and gives apps window.PanPhyMath:
//   setMath(element, text)     shows text whose math is LaTeX between \( and \)
//   setMathHtml(element, html) the same for trusted HTML (stage notes built from templates)
//   mathHtml(text, fallback)   the same text as HTML, or the plain fallback before MathJax is ready
//   mathMarkup(html, fallback) the same for trusted HTML, with an HTML fallback
//   nuclideTex(nuclide)        LaTeX for a nuclide {A, Z, symbol}, such as {}^{235}_{92}\mathrm{U}
//   onMathReady(callback)      runs once MathJax is ready, to rebuild readouts with math
// Elements marked data-math-static are typeset from their own text.
// Each piece of math becomes an SVG once and the markup is reused, so readouts rebuilt many times
// a second never run MathJax again. Values and units stay plain text. Text waiting for MathJax stays
// hidden (.math-pending); if MathJax fails or is slow, its LaTeX source shows instead.
(() => {
  const MATHJAX_URL = 'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-svg-full.js';
  const MATH = /\\\((.+?)\\\)/g;
  const root = document.documentElement;
  const svgCache = new Map();
  const waiting = new Map(); // element → text shown once MathJax is ready
  const readyCallbacks = [];

  const mathReady = () => root.dataset.math === 'ready';
  const escapeHtml = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const style = document.createElement('style');
  style.textContent = 'mjx-container[jax="SVG"]{line-height:0}'
    + '.math-pending{visibility:hidden}[data-math="failed"] .math-pending{visibility:visible}';
  document.head.appendChild(style);

  function svg(tex) {
    let html = svgCache.get(tex);
    if (!html) {
      // MathJax adds its stylesheet (which hides the screen-reader copy) only when it scans a page.
      if (!svgCache.size) document.head.appendChild(window.MathJax.svgStylesheet());
      html = window.MathJax.tex2svg(tex, { display: false }).outerHTML;
      svgCache.set(tex, html);
    }
    return html;
  }

  function mathHtml(text, fallback = text) {
    if (!mathReady()) return escapeHtml(fallback);
    let html = '';
    let last = 0;
    for (const match of text.matchAll(MATH)) {
      html += escapeHtml(text.slice(last, match.index)) + svg(match[1]);
      last = match.index + match[0].length;
    }
    return html + escapeHtml(text.slice(last));
  }

  // Trusted HTML with \(…\) math.
  const markup = html => html.replace(MATH, (piece, tex) => svg(tex));
  const mathMarkup = (html, fallback = html) => (mathReady() ? markup(html) : fallback);

  // A metastable mass number such as 99m keeps its letter upright; γ is the Greek letter.
  const nuclideTex = ({ A, Z, symbol }) => {
    const mass = String(A).replace(/([a-z]+)$/, '\\mathrm{$1}');
    const element = symbol === 'γ' ? '\\gamma' : `\\mathrm{${symbol}}`;
    return `{}^{${mass}}_{${Z}}${element}`;
  };

  function show(element, content, html) {
    if (!element) return;
    const hasMath = content.includes('\\(');
    if (!hasMath || mathReady()) {
      waiting.delete(element);
      element.classList.remove('math-pending');
      if (html) element.innerHTML = hasMath ? markup(content) : content;
      else if (hasMath) element.innerHTML = mathHtml(content);
      else element.textContent = content;
    } else {
      waiting.set(element, [content, html]);
      element.classList.add('math-pending');
      if (html) element.innerHTML = content;
      else element.textContent = content;
    }
  }
  const setMath = (element, text) => show(element, text, false);
  const setMathHtml = (element, html) => show(element, html, true);

  // Always runs after the calling script has finished, so an app can register it before its setup.
  function onMathReady(callback) {
    if (mathReady()) queueMicrotask(callback);
    else readyCallbacks.push(callback);
  }

  function ready() {
    root.dataset.math = 'ready';
    [...waiting].forEach(([element, [content, html]]) => show(element, content, html));
    readyCallbacks.splice(0).forEach(callback => callback());
  }

  window.MathJax = {
    tex: { inlineMath: [['\\(', '\\)']] },
    svg: { fontCache: 'none' },
    options: { enableMenu: false },
    startup: {
      typeset: false,
      ready() {
        window.MathJax.startup.defaultReady();
        window.MathJax.startup.promise.then(ready);
      }
    }
  };
  const script = document.createElement('script');
  script.src = MATHJAX_URL;
  script.async = true;
  script.onerror = () => { root.dataset.math = 'failed'; };
  document.head.appendChild(script);
  setTimeout(() => { if (!mathReady()) root.dataset.math = 'failed'; }, 4000);

  const typesetStatic = () => {
    document.querySelectorAll('[data-math-static]').forEach(element => setMath(element, element.textContent));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', typesetStatic);
  else typesetStatic();

  window.PanPhyMath = { setMath, setMathHtml, mathHtml, mathMarkup, nuclideTex, onMathReady, ready: mathReady };
})();
