/**
 * Main module for the Markdown Editor
 * Initializes the application and sets up event handlers
 */

import {
  state,
  saveDraft,
  clearDraft,
  restoreDraft,
  saveHighlightSyncPreference,
  debounce
} from './state.js';

import {
  preprocessMarkdown,
  buildLineBlocks,
  wrapRenderedBlocks,
  getCleanRenderedOutputHTML,
  getLineNumberFromOffset,
  getOffsetsForLineRange
} from './rendering.js';

import { handleCopyClick } from './copy.js';

import {
  initUI,
  initializeTheme,
  toggleTheme,
  initializeHighlightSyncToggle,
  initializeFontSize,
  applyFontSize,
  updateOfflineFontState,
  getMatchingBlockForLine,
  updateThemeToggleButton,
  getCurrentFontSize,
  showFilenameModal
} from './ui.js';

// DOM element references
const markdownInput = document.getElementById('markdownInput');
const inputPane = document.getElementById('inputPane');
const outputPane = document.getElementById('outputPane');
const renderedOutput = document.getElementById('renderedOutput');
const clearButton = document.getElementById('clearButton');
const loadSampleButton = document.getElementById('loadSampleButton');
const exportHTMLButton = document.getElementById('exportHTMLButton');
const presentButton = document.getElementById('presentButton');
const printButton = document.getElementById('printButton');
const saveMDButton = document.getElementById('saveMDButton');
const loadFileButton = document.getElementById('loadFileButton');
const themeToggleButton = document.getElementById('themeToggleButton');
const highlightSyncToggle = document.getElementById('highlightSyncToggle');
const fontSizeSelect = document.getElementById('fontSizeSelect');
const highlightStyle = document.getElementById('highlightStyle');
const presentExitButton = document.getElementById('presentExitButton');
const presentThemeToggle = document.getElementById('presentThemeToggle');
const presentLaserToggle = document.getElementById('presentLaserToggle');
const presentZoomSelect = document.getElementById('presentZoomSelect');
const laserPointer = document.getElementById('laserPointer');
const laserCanvas = document.getElementById('laserCanvas');
const laserContext = laserCanvas ? laserCanvas.getContext('2d') : null;

// Initialize UI module with DOM references
initUI({
  themeToggleButton,
  highlightStyle
});

// Configure marked once at initialization (not per-render)
const markedLib = window.marked;
const customRenderer = {
  listitem(text, task) {
    if (task) {
      // In marked v4, 'text' already includes the <input> checkbox HTML.
      // Split checkbox from label so we can wrap the label in <span>
      // for the flex layout (.task-list-item uses flex: input + span).
      const match = text.match(/^(<input[^>]*>)\s*([\s\S]*)$/);
      if (match) {
        return `<li class="task-list-item">${match[1]} <span>${match[2]}</span></li>\n`;
      }
      return `<li class="task-list-item">${text}</li>\n`;
    }
    return `<li>${text}</li>\n`;
  }
};

if (markedLib) {
  markedLib.setOptions({
    gfm: true,
    headerIds: true,
    tables: true,
    langPrefix: 'hljs language-',
    highlight: function (code, lang) {
      if (typeof hljs === 'undefined') {
        return code;
      }
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    }
  });
  markedLib.use({ renderer: customRenderer });
} else {
  console.error('Marked.js failed to load. Preview rendering is unavailable.');
}

/**
 * Fetch and load the sample Markdown document
 */
function loadSampleDocument() {
  fetch('/tools/markdown_editor/sample_doc.md')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.text();
    })
    .then(data => {
      markdownInput.value = data;
      renderContent();
      saveDraft(markdownInput.value);
    })
    .catch(error => {
      console.error('Error loading sample document:', error);
      alert('Failed to load the sample document.');
    });
}

/**
 * Render the markdown content to the output pane
 */
function renderContent() {
  const inputText = markdownInput.value;
  if (!markedLib || typeof DOMPurify === 'undefined') {
    renderedOutput.innerHTML = `
      <div class="md-block">
        <p>Preview unavailable: required libraries failed to load.</p>
      </div>
    `;
    return;
  }

  const preprocessedText = preprocessMarkdown(inputText);

  const parsedMarkdown = markedLib.parse(preprocessedText);
  const sanitizedContent = DOMPurify.sanitize(parsedMarkdown);
  if (state.isHighlightSyncEnabled) {
    const lineBlocks = buildLineBlocks(preprocessedText);
    renderedOutput.innerHTML = wrapRenderedBlocks(sanitizedContent, lineBlocks);
  } else {
    renderedOutput.innerHTML = sanitizedContent;
  }

  if (window.MathJax && typeof MathJax.typesetPromise === 'function') {
    MathJax.typesetPromise([renderedOutput]).catch(console.error);
  }
  if (state.isHighlightSyncEnabled) {
    updateHighlightedBlockFromCaret();
  }
}

/**
 * Update the highlighted block based on caret position
 * @param {Object} options - Options object
 * @param {boolean} options.forceScroll - Whether to force scroll into view
 */
function updateHighlightedBlockFromCaret({ forceScroll = false } = {}) {
  const current = renderedOutput.querySelector('.highlighted-block');
  if (!state.isHighlightSyncEnabled) {
    if (current) {
      current.classList.remove('highlighted-block');
    }
    return;
  }

  const lineNumber = getLineNumberFromOffset(markdownInput.value, markdownInput.selectionStart || 0);
  const matchingBlock = getMatchingBlockForLine(renderedOutput, lineNumber);

  if (current && current !== matchingBlock) {
    current.classList.remove('highlighted-block');
  }

  if (!matchingBlock) {
    return;
  }

  matchingBlock.classList.add('highlighted-block');
  matchingBlock.scrollIntoView({ block: 'center', behavior: forceScroll ? 'smooth' : 'auto' });
}

/**
 * Sync caret position from output click
 * @param {MouseEvent} event - The click event
 */
function syncCaretFromOutputClick(event) {
  const targetBlock = event.target.closest('[data-src-start][data-src-end]');
  if (!targetBlock) return;

  const startLine = Number(targetBlock.dataset.srcStart);
  const endLine = Number(targetBlock.dataset.srcEnd);
  if (Number.isNaN(startLine) || Number.isNaN(endLine)) return;

  const text = markdownInput.value;
  const offsets = getOffsetsForLineRange(text, startLine, endLine);
  markdownInput.focus();
  markdownInput.setSelectionRange(offsets.startOffset, offsets.endOffset);

  const lineHeight = parseFloat(getComputedStyle(markdownInput).lineHeight) || 16;
  markdownInput.scrollTop = Math.max(0, (startLine - 1) * lineHeight);
  updateHighlightedBlockFromCaret({ forceScroll: true });
}

/**
 * Check if currently in fullscreen (native or pseudo)
 */
function isInFullscreen() {
  return Boolean(document.fullscreenElement || document.webkitFullscreenElement)
    || outputPane.classList.contains('pseudo-fullscreen');
}

/**
 * Check if native fullscreen API is available
 */
function hasFullscreenSupport() {
  return typeof outputPane.requestFullscreen === 'function'
    || typeof outputPane.webkitRequestFullscreen === 'function';
}

/**
 * Toggle fullscreen presentation mode for rendered output pane.
 * Uses native Fullscreen API with webkit prefix fallback, and falls back
 * to a CSS-based pseudo-fullscreen for environments (e.g. older iPadOS)
 * where the API is unavailable.
 */
async function togglePresentMode() {
  const fullscreen = isInFullscreen();

  if (!fullscreen) {
    if (hasFullscreenSupport()) {
      try {
        if (typeof outputPane.requestFullscreen === 'function') {
          await outputPane.requestFullscreen();
        } else {
          await outputPane.webkitRequestFullscreen();
        }
      } catch (error) {
        console.error('Failed to enter fullscreen presentation mode:', error);
        outputPane.classList.add('pseudo-fullscreen');
        document.body.style.overflow = 'hidden';
        updatePresentButtonLabel();
        updatePresentThemeIcon();
      }
    } else {
      // Pseudo-fullscreen fallback (iPad / older Safari)
      outputPane.classList.add('pseudo-fullscreen');
      document.body.style.overflow = 'hidden';
      updatePresentButtonLabel();
      updatePresentThemeIcon();
    }
  } else {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
      } catch (error) {
        console.error('Failed to exit fullscreen presentation mode:', error);
        return;
      }
    } else {
      // Exit pseudo-fullscreen
      outputPane.classList.remove('pseudo-fullscreen');
      document.body.style.overflow = '';
      disableLaser();
      updatePresentButtonLabel();
      updatePresentThemeIcon();
    }
  }
}

function applyPresentZoom(value) {
  const zoomValue = Number(value);
  if (!zoomValue || Number.isNaN(zoomValue) || zoomValue <= 0) {
    return;
  }
  outputPane.style.setProperty('--present-zoom', (zoomValue / 100).toString());
}

function initializePresentZoom() {
  if (!presentZoomSelect) return;
  applyPresentZoom(presentZoomSelect.value);
}

// ---- Laser pointer ----
let laserEnabled = false;
const laserTail = [];
const LASER_POINTER_SIZE = 12;
const LASER_TAIL_MAX = 180;

function resizeLaserCanvas() {
  if (!laserCanvas || !laserContext) return;
  const dpr = window.devicePixelRatio || 1;
  const width = Math.ceil(window.innerWidth * dpr);
  const height = Math.ceil(window.innerHeight * dpr);
  laserCanvas.width = width;
  laserCanvas.height = height;
  laserCanvas.style.width = `${window.innerWidth}px`;
  laserCanvas.style.height = `${window.innerHeight}px`;
  laserContext.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function getLaserRgb() {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--laser-color')
    .trim();
  const hex = raw || '#22c55e';
  const normalized = hex.replace('#', '');
  const value = parseInt(normalized.length === 3
    ? normalized.split('').map(c => c + c).join('')
    : normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function addTailPoint(x, y) {
  laserTail.push({ x, y, life: 1 });
  if (laserTail.length > LASER_TAIL_MAX) laserTail.shift();
}

function renderLaserTail() {
  if (!laserCanvas || !laserContext) return;
  const w = laserCanvas.width;
  const h = laserCanvas.height;
  laserContext.clearRect(0, 0, w, h);
  if (laserEnabled && laserTail.length > 0) {
    const { r, g, b } = getLaserRgb();
    for (let i = 0; i < laserTail.length; i++) {
      const point = laserTail[i];
      point.life *= 0.94;
      if (point.life < 0.02) continue;
      const alpha = point.life;
      const radius = LASER_POINTER_SIZE * (0.65 + 0.55 * alpha);
      const glow = radius * 2.2 * 0.7;
      const gradient = laserContext.createRadialGradient(point.x, point.y, 0, point.x, point.y, glow);
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.3 * alpha})`);
      gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${0.1 * alpha})`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      laserContext.fillStyle = gradient;
      laserContext.beginPath();
      laserContext.arc(point.x, point.y, glow, 0, Math.PI * 2);
      laserContext.fill();

      laserContext.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.9 * alpha})`;
      laserContext.beginPath();
      laserContext.arc(point.x, point.y, radius, 0, Math.PI * 2);
      laserContext.fill();

      laserContext.fillStyle = `rgba(255, 255, 255, ${0.5 * alpha})`;
      laserContext.beginPath();
      laserContext.arc(point.x, point.y, radius * 0.4, 0, Math.PI * 2);
      laserContext.fill();
    }
  }
  for (let j = laserTail.length - 1; j >= 0; j--) {
    if (laserTail[j].life < 0.02) laserTail.splice(j, 1);
  }
  requestAnimationFrame(renderLaserTail);
}

function onLaserMove(e) {
  laserPointer.style.left = e.clientX + 'px';
  laserPointer.style.top = e.clientY + 'px';
  addTailPoint(e.clientX, e.clientY);
}

function onLaserTouch(e) {
  if (e.target.closest('.present-controls')) {
    return;
  }
  e.preventDefault();
  const touch = e.touches[0];
  laserPointer.style.left = touch.clientX + 'px';
  laserPointer.style.top = touch.clientY + 'px';
  addTailPoint(touch.clientX, touch.clientY);
}

function enableLaser() {
  laserEnabled = true;
  laserPointer.style.display = 'block';
  if (laserCanvas) {
    laserCanvas.style.display = 'block';
    resizeLaserCanvas();
  }
  presentLaserToggle.classList.add('laser-active');
  document.documentElement.classList.add('laser-cursor-hidden');
  document.body.classList.add('laser-cursor-hidden');
  outputPane.classList.add('laser-cursor-hidden');
  document.addEventListener('mousemove', onLaserMove);
  document.addEventListener('touchstart', onLaserTouch, { passive: false });
  document.addEventListener('touchmove', onLaserTouch, { passive: false });
}

function disableLaser() {
  laserEnabled = false;
  laserPointer.style.display = 'none';
  if (laserCanvas) {
    laserCanvas.style.display = 'none';
  }
  laserTail.length = 0;
  presentLaserToggle.classList.remove('laser-active');
  document.documentElement.classList.remove('laser-cursor-hidden');
  document.body.classList.remove('laser-cursor-hidden');
  outputPane.classList.remove('laser-cursor-hidden');
  document.removeEventListener('mousemove', onLaserMove);
  document.removeEventListener('touchstart', onLaserTouch);
  document.removeEventListener('touchmove', onLaserTouch);
}

function toggleLaser() {
  if (laserEnabled) {
    disableLaser();
  } else {
    enableLaser();
  }
}

/**
 * Print the document to PDF.
 *
 * Must be synchronous so that window.print() runs inside the original
 * user-gesture context (Safari/iOS block it otherwise).  The @media print
 * CSS already forces light-mode colours, and the beforeprint / afterprint
 * handlers swap the highlight.js stylesheet, so we only need to call
 * window.print() here.
 */
function printToPDF() {
  window.print();
}

/**
 * Export the document as HTML
 */
async function exportHTML() {
  const fileName = await showFilenameModal('document.html', 'Export as HTML');
  if (!fileName) return;

  const sanitizedHTML = getCleanRenderedOutputHTML(renderedOutput);
  const currentFontSize = getCurrentFontSize();
  const doc = document.implementation.createHTMLDocument('Exported Document');
  const head = doc.head;
  const body = doc.body;

  const meta = document.createElement('meta');
  meta.setAttribute('charset', 'UTF-8');
  head.appendChild(meta);

  const title = document.createElement('title');
  title.textContent = 'Exported Document';
  head.appendChild(title);

  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

    :root {
      --background-color: #ffffff;
      --text-color: #000000;
      --pane-background: #ffffff;
      --pane-heading-background: #333333;
      --pane-heading-color: #ffffff;
      --button-background: #f0f0f0;
      --button-color: #000000;
      --border-color: #ccc;
      --code-background: #f0f0f0;
      --table-border-color: black;
      --table-header-background: #f4f4f4;
    }

    [data-theme="dark"] {
      --background-color: #1e1e1e;
      --text-color: #e0e0e0;
      --pane-background: #1e1e1e;
      --pane-heading-background: #2d2c2c;
      --pane-heading-color: #ffffff;
      --button-background: #474646;
      --button-color: #ffffff;
      --border-color: #555555;
      --code-background: #2f2f2f;
      --table-border-color: #555555;
      --table-header-background: #333333;
      --code-text-color: #f8f8f2;
    }

    body {
      font-family: 'Inter', sans-serif;
      line-height: 1.5;
      font-size: ${currentFontSize};
      margin: 20px;
      background-color: var(--background-color);
      color: var(--text-color);
    }

    body, div, p, h1, h2, h3, h4, h5, h6, pre, code, table, th, td, blockquote {
      background-color: var(--background-color);
      color: var(--text-color);
    }

    a {
      color: #ff5f1f;
      text-decoration: none;
    }

    a:hover {
      color: #ff5f1f;
      text-decoration: underline;
    }

    a:visited {
      color: #ff5f1f;
    }

    table {
      max-width: 100%;
      margin: 20px auto;
      border-collapse: collapse;
      border: 1px solid var(--table-border-color);
    }

    th, td {
      border: 1px solid var(--table-border-color);
      padding: 8px;
    }

    th[align="left"], td[align="left"] {
      text-align: left;
    }

    th[align="center"], td[align="center"] {
      text-align: center;
    }

    th[align="right"], td[align="right"] {
      text-align: right;
    }

    th, td {
      text-align: left;
    }

    code {
      background-color: var(--code-background);
      padding: 0.1em 0.2em;
      border-radius: 3px;
      font-size: 0.95em;
      line-height: 1;
      font-family: 'JetBrains Mono', monospace;
      vertical-align: baseline;
      color: inherit;
    }

    pre {
      background-color: var(--code-background);
      padding: 0;
      border-radius: 5px;
      overflow-x: auto;
      font-size: 1.05em;
      line-height: 1.5;
      margin: 2px 0;
    }

    pre code {
      background: none;
      padding: 0;
      border-radius: 0;
      font-family: inherit;
      line-height: 1.5;
      font-size: inherit;
      color: inherit;
    }

    .hljs {
      line-height: 1.5;
      font-size: 1.05em;
      background-color: inherit;
      color: inherit;
    }

    [data-theme="dark"] .hljs {
      color: #f8f8f2 !important;
    }

    [data-theme="dark"] .hljs-comment,
    [data-theme="dark"] .hljs-quote {
      color: #8d9a70 !important;
    }

    [data-theme="dark"] .hljs-keyword,
    [data-theme="dark"] .hljs-selector-tag,
    [data-theme="dark"] .hljs-subst {
      color: #66d9ef !important;
    }

    [data-theme="dark"] .hljs-string,
    [data-theme="dark"] .hljs-doctag {
      color: #e6db74 !important;
    }

    [data-theme="dark"] .hljs-number,
    [data-theme="dark"] .hljs-regexp,
    [data-theme="dark"] .hljs-tag .hljs-attr {
      color: #ae81ff !important;
    }

    [data-theme="dark"] .hljs-title,
    [data-theme="dark"] .hljs-section {
      color: #a6e22e !important;
    }

    [data-theme="dark"] .hljs-type,
    [data-theme="dark"] .hljs-built_in {
      color: #fd971f !important;
    }

    [data-theme="dark"] .hljs-symbol,
    [data-theme="dark"] .hljs-bullet {
      color: #f92672 !important;
    }

    [data-theme="dark"] .hljs-link {
      color: #e6db74 !important;
    }

    img {
      max-width: 100%;
      height: auto;
    }
  `;
  head.appendChild(style);

  const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
  const highlightLink = document.createElement('link');
  highlightLink.rel = 'stylesheet';
  if (isDarkMode) {
    highlightLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/monokai.min.css';
  } else {
    highlightLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/default.min.css';
  }
  head.appendChild(highlightLink);

  const highlightScript = document.createElement('script');
  highlightScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js';
  head.appendChild(highlightScript);

  const highlightInit = document.createElement('script');
  highlightInit.textContent = `
    window.addEventListener('DOMContentLoaded', () => {
      hljs.highlightAll();
    });
  `;
  head.appendChild(highlightInit);

  const mathjaxConfigScript = document.createElement('script');
  mathjaxConfigScript.textContent = `
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$']],
        displayMath: [['$$', '$$']],
        processEscapes: true,
        packages: ['base', 'ams', 'array'],
      },
      svg: {
        fontCache: 'local',
      }
    };
  `;
  head.appendChild(mathjaxConfigScript);

  const mathjaxScript = document.createElement('script');
  mathjaxScript.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
  head.appendChild(mathjaxScript);

  body.innerHTML = sanitizedHTML;

  if (isDarkMode) {
    doc.documentElement.setAttribute('data-theme', 'dark');
  }

  const exportedHTML = `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
  const blob = new Blob([exportedHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/**
 * Save the markdown content to a file
 */
async function saveMarkdown() {
  const fileName = await showFilenameModal('document.md', 'Save Markdown');
  if (!fileName) return;

  const blob = new Blob([markdownInput.value], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/**
 * Load a markdown file from the user's computer
 */
function loadMarkdownFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.md,text/markdown';
  input.onchange = e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = event => {
        markdownInput.value = event.target.result;
        renderContent();
        saveDraft(markdownInput.value);
      };
      reader.readAsText(file);
    }
  };
  input.click();
}

// Setup event listeners
const handleCaretChange = () => updateHighlightedBlockFromCaret();

const debouncedRenderAndSave = debounce(() => {
  renderContent();
  saveDraft(markdownInput.value);
}, 200);

markdownInput.addEventListener('input', debouncedRenderAndSave);
markdownInput.addEventListener('keyup', handleCaretChange);
markdownInput.addEventListener('click', handleCaretChange);
markdownInput.addEventListener('select', handleCaretChange);

renderedOutput.addEventListener('click', event => {
  // Disable click-to-copy while presenting
  const handled = isInFullscreen() ? false : handleCopyClick(event);
  // Then handle caret sync (only if not clicking on copyable elements)
  if (!handled && !event.target.closest('mjx-container') && !event.target.closest('table') && !event.target.closest('pre')) {
    syncCaretFromOutputClick(event);
  }
});

printButton.addEventListener('click', printToPDF);
exportHTMLButton.addEventListener('click', exportHTML);
presentButton.addEventListener('click', togglePresentMode);
saveMDButton.addEventListener('click', saveMarkdown);
loadFileButton.addEventListener('click', loadMarkdownFile);
loadSampleButton.addEventListener('click', loadSampleDocument);

clearButton.addEventListener('click', () => {
  markdownInput.value = '';
  clearDraft();
  renderContent();
});

themeToggleButton.addEventListener('click', () => {
  toggleTheme();
  updateMobileThemeToggle();
});

highlightSyncToggle.addEventListener('change', event => {
  saveHighlightSyncPreference(event.target.checked);
  renderContent();
  if (event.target.checked) {
    updateHighlightedBlockFromCaret({ forceScroll: true });
  } else {
    updateHighlightedBlockFromCaret();
  }
});

if (fontSizeSelect) {
  fontSizeSelect.addEventListener('change', event => {
    applyFontSize(event.target.value);
  });
}

// Print event handlers
window.addEventListener('beforeprint', () => {
  highlightStyle.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/default.min.css';
});

window.addEventListener('afterprint', () => {
  if (document.documentElement.getAttribute('data-theme') === 'dark') {
    highlightStyle.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/monokai.min.css';
  } else {
    highlightStyle.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/default.min.css';
  }
});

// Network status handlers
window.addEventListener('online', updateOfflineFontState);
window.addEventListener('offline', updateOfflineFontState);


function updatePresentButtonLabel() {
  if (!presentButton) return;

  const isOutputFullscreen = isInFullscreen();
  presentButton.textContent = isOutputFullscreen ? 'Exit Present' : 'Present';
  presentButton.setAttribute('title', isOutputFullscreen
    ? 'Exit fullscreen presentation mode'
    : 'Show rendered output in fullscreen');
}

function updatePresentThemeIcon() {
  if (!presentThemeToggle) return;
  if (document.documentElement.getAttribute('data-theme') === 'dark') {
    presentThemeToggle.textContent = '\u{1F319}';
    presentThemeToggle.setAttribute('title', 'Switch to Light Mode');
  } else {
    presentThemeToggle.textContent = '\u{2600}\u{FE0F}';
    presentThemeToggle.setAttribute('title', 'Switch to Dark Mode');
  }
}

document.addEventListener('fullscreenchange', () => {
  updatePresentButtonLabel();
  updatePresentThemeIcon();
  if (!isInFullscreen()) disableLaser();
});
document.addEventListener('webkitfullscreenchange', () => {
  updatePresentButtonLabel();
  updatePresentThemeIcon();
  if (!isInFullscreen()) disableLaser();
});

presentExitButton.addEventListener('click', togglePresentMode);
presentLaserToggle.addEventListener('click', toggleLaser);
presentThemeToggle.addEventListener('click', () => {
  toggleTheme();
  updatePresentThemeIcon();
  updateMobileThemeToggle();
});
if (presentZoomSelect) {
  presentZoomSelect.addEventListener('change', event => {
    applyPresentZoom(event.target.value);
  });
  initializePresentZoom();
}
// ---------------------------------------------------------------------- //
// Mobile tab bar — switch between Edit / Preview on narrow screens        //
// ---------------------------------------------------------------------- //
const mobileTabBar = document.getElementById('mobileTabBar');
const mobileTabs = mobileTabBar ? mobileTabBar.querySelectorAll('.mobile-tab') : [];
const mobileThemeToggle = document.getElementById('mobileThemeToggle');

function updateMobileThemeToggle() {
  if (!mobileThemeToggle) return;
  mobileThemeToggle.textContent = document.documentElement.getAttribute('data-theme') === 'dark'
    ? '\u{1F319}'   // Moon
    : '\u{2600}\u{FE0F}'; // Sun
}

function switchMobilePane(targetPane) {
  mobileTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.pane === targetPane);
  });

  if (targetPane === 'input') {
    inputPane.classList.remove('mobile-hidden');
    outputPane.classList.add('mobile-hidden');
  } else {
    inputPane.classList.add('mobile-hidden');
    outputPane.classList.remove('mobile-hidden');
    renderContent();
  }
}

mobileTabs.forEach(tab => {
  tab.addEventListener('click', () => switchMobilePane(tab.dataset.pane));
});

if (mobileThemeToggle) {
  mobileThemeToggle.addEventListener('click', () => {
    toggleTheme();
    updateMobileThemeToggle();
  });
}

function initMobileLayout() {
  const isMobile = window.matchMedia('(max-width: 900px)').matches;
  if (isMobile) {
    outputPane.classList.add('mobile-hidden');
    inputPane.classList.remove('mobile-hidden');
  } else {
    inputPane.classList.remove('mobile-hidden');
    outputPane.classList.remove('mobile-hidden');
  }
  updateMobileThemeToggle();
}

const mobileQuery = window.matchMedia('(max-width: 900px)');
mobileQuery.addEventListener('change', () => {
  if (!mobileQuery.matches) {
    inputPane.classList.remove('mobile-hidden');
    outputPane.classList.remove('mobile-hidden');
  } else {
    // Restore to whichever tab is active
    const activeTab = mobileTabBar
      ? mobileTabBar.querySelector('.mobile-tab.active')
      : null;
    switchMobilePane(activeTab ? activeTab.dataset.pane : 'input');
  }
});

// Initialize the application
updateOfflineFontState();
initializeTheme();
initializeHighlightSyncToggle(highlightSyncToggle);
initializeFontSize(fontSizeSelect);
updatePresentButtonLabel();
updatePresentThemeIcon();
initMobileLayout();
if (laserCanvas && laserContext) {
  resizeLaserCanvas();
  window.addEventListener('resize', resizeLaserCanvas);
  requestAnimationFrame(renderLaserTail);
}

// Restore draft and render
const savedDraft = restoreDraft();
if (savedDraft !== null) {
  markdownInput.value = savedDraft;
}
renderContent();
