// Typeset maths for the notes and readout labels. Text marks maths with \( and \). MathJax, loaded
// by the page, turns each piece into an SVG once and the markup is reused, so readouts rebuilt
// several times a second never run MathJax again. Values and units stay plain text.

const MATH = /\\\((.+?)\\\)/g;
const root = document.documentElement;
const svgCache = new Map();
const waiting = new Map(); // element → text shown once MathJax is ready
const readyCallbacks = [];

const escapeHtml = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const mathReady = () => root.dataset.math === 'ready';

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

// HTML for text with \(…\) maths. Before MathJax is ready, `fallback` (plain text) is used instead.
export function mathHtml(text, fallback = text) {
  if (!mathReady()) return escapeHtml(fallback);
  let html = '';
  let last = 0;
  for (const match of text.matchAll(MATH)) {
    html += escapeHtml(text.slice(last, match.index)) + svg(match[1]);
    last = match.index + match[0].length;
  }
  return html + escapeHtml(text.slice(last));
}

// Shows text in an element. Text with maths stays hidden until MathJax has typeset it, unless
// MathJax fails or is slow to arrive, when the LaTeX source shows instead.
export function setMath(element, text) {
  if (!text.includes('\\(')) {
    waiting.delete(element);
    element.classList.remove('math-pending');
    element.textContent = text;
    return;
  }
  if (mathReady()) {
    waiting.delete(element);
    element.classList.remove('math-pending');
    element.innerHTML = mathHtml(text);
  } else {
    waiting.set(element, text);
    element.classList.add('math-pending');
    element.textContent = text;
  }
}

// Runs once MathJax is ready (straight away if it already is): readouts rebuild with maths.
export function onMathReady(callback) {
  if (mathReady()) callback();
  else readyCallbacks.push(callback);
}

// Maths written into the page itself.
document.querySelectorAll('[data-math-static]').forEach(element => setMath(element, element.textContent));

if (!mathReady()) {
  document.addEventListener('panphy:math-ready', () => {
    [...waiting].forEach(([element, text]) => setMath(element, text));
    readyCallbacks.splice(0).forEach(callback => callback());
  }, { once: true });
  setTimeout(() => { if (!mathReady()) root.dataset.math = 'failed'; }, 4000);
}
