/**
 * Main module for the Markdown Editor
 * Initializes the application and sets up event handlers
 */

import {
  state,
  saveDraft,
  clearDraft,
  restoreDraft,
  saveScrollSyncPreference,
  saveHighlightSyncPreference,
  debounce
} from './state.js';

import {
  preprocessMarkdown,
  buildLineBlocks,
  wrapRenderedBlocks,
  getCleanRenderedOutputHTML,
  getLineNumberFromOffset,
  getOffsetsForLineRange,
  runPreprocessMarkdownTests
} from './rendering.js';

import { handleCopyClick } from './copy.js';

import {
  initUI,
  initializeTheme,
  toggleTheme,
  initializeScrollSyncToggle,
  initializeHighlightSyncToggle,
  initializeFontSize,
  applyFontSize,
  updateOfflineFontState,
  syncLinkedScroll,
  getMatchingBlockForLine,
  updateThemeToggleButton,
  getCurrentFontSize,
  showFilenameModal
} from './ui.js';

// DOM element references
const markdownInput = document.getElementById('markdownInput');
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
const scrollSyncToggle = document.getElementById('scrollSyncToggle');
const highlightSyncToggle = document.getElementById('highlightSyncToggle');
const fontSizeSelect = document.getElementById('fontSizeSelect');
const highlightStyle = document.getElementById('highlightStyle');

// Initialize UI module with DOM references
initUI({
  themeToggleButton,
  highlightStyle
});

/**
 * Fetch and load the sample Markdown document
 */
function loadSampleDocument() {
  fetch('markdown_editor/sample_doc.md')
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
  const preprocessedText = preprocessMarkdown(inputText);

  const renderer = {
    listitem(token) {
      let checkbox = '';
      if (token.task) {
        checkbox = `<input type="checkbox" disabled${token.checked ? ' checked' : ''}> `;
      }
      const isSingleParagraph =
        token.tokens.length === 1 && token.tokens[0].type === 'paragraph' && Array.isArray(token.tokens[0].tokens);
      const body = isSingleParagraph
        ? this.parser.parseInline(token.tokens[0].tokens)
        : this.parser.parse(token.tokens);
      const taskClass = token.task ? ' class="task-list-item"' : '';
      return `<li${taskClass}>${checkbox}${body}</li>`;
    }
  };

  marked.setOptions({
    gfm: true,
    headerIds: true,
    tables: true,
    langPrefix: 'hljs language-',
    highlight: function (code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    }
  });
  marked.use({ renderer });

  const lineBlocks = buildLineBlocks(preprocessedText);
  const parsedMarkdown = marked.parse(preprocessedText);
  const sanitizedContent = DOMPurify.sanitize(parsedMarkdown);
  renderedOutput.innerHTML = wrapRenderedBlocks(sanitizedContent, lineBlocks);

  hljs.highlightAll();
  MathJax.typesetPromise([renderedOutput]).catch(console.error);
  updateHighlightedBlockFromCaret();
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
  const shouldScroll = forceScroll || !state.isLinkScrollEnabled;
  if (shouldScroll) {
    matchingBlock.scrollIntoView({ block: 'center', behavior: forceScroll ? 'smooth' : 'auto' });
  }
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
 * Link output scroll to input scroll
 */
function linkOutputToInputScroll() {
  syncLinkedScroll(markdownInput, renderedOutput);
}

/**
 * Link input scroll to output scroll
 */
function linkInputToOutputScroll() {
  syncLinkedScroll(renderedOutput, markdownInput);
}


/**
 * Toggle fullscreen presentation mode for rendered output pane
 */
async function togglePresentMode() {
  const isFullscreen = Boolean(document.fullscreenElement);

  if (!isFullscreen) {
    try {
      await outputPane.requestFullscreen();
    } catch (error) {
      console.error('Failed to enter fullscreen presentation mode:', error);
      return;
    }
  } else if (document.fullscreenElement === outputPane) {
    try {
      await document.exitFullscreen();
    } catch (error) {
      console.error('Failed to exit fullscreen presentation mode:', error);
      return;
    }
  }
}

/**
 * Print the document to PDF
 */
async function printToPDF() {
  const body = document.body;
  const hadDarkMode = body.classList.contains('dark-mode');
  if (hadDarkMode) {
    body.classList.remove('dark-mode');
  }
  highlightStyle.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/default.min.css';
  await MathJax.typesetPromise([renderedOutput]);
  hljs.highlightAll();
  window.print();
  if (hadDarkMode) {
    body.classList.add('dark-mode');
    highlightStyle.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/monokai.min.css';
    updateThemeToggleButton();
  }
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

    body.dark-mode {
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

    body.dark-mode .hljs {
      color: #f8f8f2 !important;
    }

    body.dark-mode .hljs-comment,
    body.dark-mode .hljs-quote {
      color: #8d9a70 !important;
    }

    body.dark-mode .hljs-keyword,
    body.dark-mode .hljs-selector-tag,
    body.dark-mode .hljs-subst {
      color: #66d9ef !important;
    }

    body.dark-mode .hljs-string,
    body.dark-mode .hljs-doctag {
      color: #e6db74 !important;
    }

    body.dark-mode .hljs-number,
    body.dark-mode .hljs-regexp,
    body.dark-mode .hljs-tag .hljs-attr {
      color: #ae81ff !important;
    }

    body.dark-mode .hljs-title,
    body.dark-mode .hljs-section {
      color: #a6e22e !important;
    }

    body.dark-mode .hljs-type,
    body.dark-mode .hljs-built_in {
      color: #fd971f !important;
    }

    body.dark-mode .hljs-symbol,
    body.dark-mode .hljs-bullet {
      color: #f92672 !important;
    }

    body.dark-mode .hljs-link {
      color: #e6db74 !important;
    }

    img {
      max-width: 100%;
      height: auto;
    }
  `;
  head.appendChild(style);

  const isDarkMode = document.body.classList.contains('dark-mode');
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
    body.classList.add('dark-mode');
  }

  const exportedHTML = `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
  const blob = new Blob([exportedHTML], { type: 'text/html' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
}

/**
 * Save the markdown content to a file
 */
async function saveMarkdown() {
  const fileName = await showFilenameModal('document.md', 'Save Markdown');
  if (!fileName) return;

  const blob = new Blob([markdownInput.value], { type: 'text/markdown' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
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

// Run tests
runPreprocessMarkdownTests();

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
markdownInput.addEventListener('scroll', linkOutputToInputScroll);

renderedOutput.addEventListener('click', event => {
  // Handle copy clicks first (equations, tables, code blocks)
  const handled = handleCopyClick(event);
  // Then handle caret sync (only if not clicking on copyable elements)
  if (!handled && !event.target.closest('mjx-container') && !event.target.closest('table') && !event.target.closest('pre')) {
    syncCaretFromOutputClick(event);
  }
});

renderedOutput.addEventListener('scroll', linkInputToOutputScroll);
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

themeToggleButton.addEventListener('click', toggleTheme);

scrollSyncToggle.addEventListener('change', event => {
  saveScrollSyncPreference(event.target.checked);
  if (event.target.checked) {
    updateHighlightedBlockFromCaret({ forceScroll: true });
  }
});

highlightSyncToggle.addEventListener('change', event => {
  saveHighlightSyncPreference(event.target.checked);
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
  if (document.body.classList.contains('dark-mode')) {
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

  const isOutputFullscreen = document.fullscreenElement === outputPane;
  presentButton.textContent = isOutputFullscreen ? 'Exit Present' : 'Present';
  presentButton.setAttribute('title', isOutputFullscreen
    ? 'Exit fullscreen presentation mode'
    : 'Show rendered output in fullscreen');
}

document.addEventListener('fullscreenchange', updatePresentButtonLabel);
// Initialize the application
updateOfflineFontState();
initializeTheme();
initializeScrollSyncToggle(scrollSyncToggle);
initializeHighlightSyncToggle(highlightSyncToggle);
initializeFontSize(fontSizeSelect);
updatePresentButtonLabel();

// Restore draft and render
const savedDraft = restoreDraft();
if (savedDraft !== null) {
  markdownInput.value = savedDraft;
}
renderContent();
