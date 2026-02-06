/**
 * UI module for the Markdown Editor
 * Handles theme toggling, scroll sync, font size, and other UI interactions
 */

import {
  state,
  loadThemePreference,
  saveThemePreference,
  loadScrollSyncPreference,
  saveScrollSyncPreference,
  loadHighlightSyncPreference,
  saveHighlightSyncPreference,
  loadFontSizePreference,
  saveFontSizePreference
} from './state.00667ec4.js';

// DOM element references (set during initialization)
let themeToggleButton = null;
let highlightStyle = null;

/**
 * Initialize UI module with DOM references
 * @param {Object} elements - Object containing DOM element references
 */
export function initUI(elements) {
  themeToggleButton = elements.themeToggleButton;
  highlightStyle = elements.highlightStyle;
}

/**
 * Update the theme toggle button's icon and attributes.
 */
export function updateThemeToggleButton() {
  if (!themeToggleButton) return;

  if (document.documentElement.getAttribute('data-theme') === 'dark') {
    themeToggleButton.textContent = '\u{1F319}'; // Moon emoji
    themeToggleButton.setAttribute('aria-label', 'Switch to Light Mode');
    themeToggleButton.setAttribute('title', 'Switch to Light Mode');
  } else {
    themeToggleButton.textContent = '\u{2600}\u{FE0F}'; // Sun emoji
    themeToggleButton.setAttribute('aria-label', 'Switch to Dark Mode');
    themeToggleButton.setAttribute('title', 'Switch to Dark Mode');
  }
}

/**
 * Initialize the theme based on saved preference.
 */
export function initializeTheme() {
  const savedTheme = loadThemePreference();
  if (savedTheme === 'markdown-dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (highlightStyle) {
      highlightStyle.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/monokai.min.css';
    }
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    if (highlightStyle) {
      highlightStyle.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/default.min.css';
    }
  }
  updateThemeToggleButton();
}

/**
 * Toggle between dark and light themes and save the preference.
 */
export function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);

  if (next === 'dark') {
    if (themeToggleButton) {
      themeToggleButton.textContent = '\u{1F319}'; // Moon emoji
      themeToggleButton.setAttribute('aria-label', 'Switch to Light Mode');
      themeToggleButton.setAttribute('title', 'Switch to Light Mode');
    }
    if (highlightStyle) {
      highlightStyle.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/monokai.min.css';
    }
    saveThemePreference('markdown-dark');
  } else {
    if (themeToggleButton) {
      themeToggleButton.textContent = '\u{2600}\u{FE0F}'; // Sun emoji
      themeToggleButton.setAttribute('aria-label', 'Switch to Dark Mode');
      themeToggleButton.setAttribute('title', 'Switch to Dark Mode');
    }
    if (highlightStyle) {
      highlightStyle.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/default.min.css';
    }
    saveThemePreference('markdown-light');
  }
}

/**
 * Initialize scroll sync toggle based on saved preference.
 * @param {HTMLInputElement} scrollSyncToggle - The scroll sync toggle checkbox
 */
export function initializeScrollSyncToggle(scrollSyncToggle) {
  const enabled = loadScrollSyncPreference();
  scrollSyncToggle.checked = enabled;
}

/**
 * Initialize highlight sync toggle based on saved preference.
 * @param {HTMLInputElement} highlightSyncToggle - The highlight sync toggle checkbox
 */
export function initializeHighlightSyncToggle(highlightSyncToggle) {
  const enabled = loadHighlightSyncPreference();
  highlightSyncToggle.checked = enabled;
}

/**
 * Get current font size from CSS custom property
 * @returns {string} The current font size value
 */
export function getCurrentFontSize() {
  const currentValue = getComputedStyle(document.documentElement)
    .getPropertyValue('--base-font-size')
    .trim();
  return currentValue || '16px';
}

/**
 * Map screen font size to a print-appropriate font size.
 * Screen sizes are designed for a half-width pane; print fills the full page,
 * so we scale down to produce a typical document appearance.
 */
const PRINT_FONT_SIZE_MAP = {
  '14px': '10pt',
  '16px': '11pt',
  '18px': '12pt',
  '20px': '13pt'
};

/**
 * Apply font size and save preference
 * @param {string} value - The font size value (e.g., '16px')
 */
export function applyFontSize(value) {
  document.documentElement.style.setProperty('--base-font-size', value);
  const printSize = PRINT_FONT_SIZE_MAP[value] || '11pt';
  document.documentElement.style.setProperty('--print-font-size', printSize);
  saveFontSizePreference(value);
}

/**
 * Initialize font size from saved preference
 * @param {HTMLSelectElement} fontSizeSelect - The font size select element
 */
export function initializeFontSize(fontSizeSelect) {
  const savedFontSize = loadFontSizePreference();
  const initialFontSize = savedFontSize || getCurrentFontSize();
  applyFontSize(initialFontSize);
  if (fontSizeSelect) {
    fontSizeSelect.value = initialFontSize;
  }
}

/**
 * Update offline font state based on network status
 */
export function updateOfflineFontState() {
  document.documentElement.classList.toggle('offline-font', !navigator.onLine);
}

/**
 * Clamp a value between min and max
 * @param {number} value - The value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} The clamped value
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Animation frame for scroll interpolation loop
 */
let scrollAnimFrame = null;

/**
 * Apply scroll position with smooth interpolation.
 * Runs a continuous animation loop so the scroll position fully converges
 * to the target, even when few scroll events are firing.
 * @param {Element} target - The target element
 * @param {number} desiredTop - The desired scroll position
 * @param {Function} [onStep] - Optional callback invoked on each animation step
 */
function applyScrollTop(target, desiredTop, onStep) {
  const maxTop = Math.max(0, target.scrollHeight - target.clientHeight);
  const clampedTop = clamp(desiredTop, 0, maxTop);

  if (scrollAnimFrame) {
    cancelAnimationFrame(scrollAnimFrame);
    scrollAnimFrame = null;
  }

  const step = () => {
    const distance = clampedTop - target.scrollTop;
    if (Math.abs(distance) < 0.5) {
      target.scrollTop = clampedTop;
      scrollAnimFrame = null;
      return;
    }
    target.scrollTop = target.scrollTop + distance * 0.35;
    if (onStep) onStep();
    scrollAnimFrame = requestAnimationFrame(step);
  };

  step();
}

// Scroll linking state
let isLinkingScroll = false;
let linkScrollFrame = null;
let programmaticScrollTarget = null;
let programmaticScrollTimer = null;

/**
 * Sync scroll position between source and target elements.
 * Tracks the programmatically-scrolled target so that the scroll event
 * it fires back does not trigger a reverse sync (feedback loop / jitter).
 * @param {Element} source - The source element being scrolled
 * @param {Element} target - The target element to sync
 */
export function syncLinkedScroll(source, target) {
  if (!state.isLinkScrollEnabled || isLinkingScroll) return;
  // Suppress scroll events fired by our own programmatic scroll
  if (source === programmaticScrollTarget) return;
  isLinkingScroll = true;
  if (linkScrollFrame) {
    cancelAnimationFrame(linkScrollFrame);
  }
  linkScrollFrame = requestAnimationFrame(() => {
    const sourceMax = Math.max(0, source.scrollHeight - source.clientHeight);
    const targetMax = Math.max(0, target.scrollHeight - target.clientHeight);
    const ratio = sourceMax > 0 ? source.scrollTop / sourceMax : 0;
    programmaticScrollTarget = target;
    const refreshSuppression = () => {
      clearTimeout(programmaticScrollTimer);
      programmaticScrollTimer = setTimeout(() => { programmaticScrollTarget = null; }, 150);
    };
    refreshSuppression();
    applyScrollTop(target, targetMax * ratio, refreshSuppression);
    isLinkingScroll = false;
  });
}

/**
 * Get the matching block element for a given line number
 * @param {HTMLElement} renderedOutput - The rendered output element
 * @param {number} lineNumber - The source line number
 * @returns {Element|null} The matching block element or null
 */
export function getMatchingBlockForLine(renderedOutput, lineNumber) {
  const blocks = Array.from(renderedOutput.querySelectorAll('[data-src-start][data-src-end]'));
  const matchingBlocks = blocks.filter(block => {
    const start = Number(block.dataset.srcStart);
    const end = Number(block.dataset.srcEnd);
    return lineNumber >= start && lineNumber <= end;
  });
  return matchingBlocks.reduce((best, block) => {
    if (!best) {
      return block;
    }
    const bestSpan = Number(best.dataset.srcEnd) - Number(best.dataset.srcStart);
    const currentSpan = Number(block.dataset.srcEnd) - Number(block.dataset.srcStart);
    return currentSpan < bestSpan ? block : best;
  }, null);
}

/**
 * Show the filename modal for export
 * @param {string} defaultFilename - The default filename to show
 * @param {string} title - The modal title
 * @returns {Promise<string|null>} The entered filename or null if cancelled
 */
export function showFilenameModal(defaultFilename, title = 'Enter file name') {
  return new Promise((resolve) => {
    // Create modal elements
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const content = document.createElement('div');
    content.className = 'modal-content';

    const titleEl = document.createElement('h3');
    titleEl.className = 'modal-title';
    titleEl.textContent = title;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'modal-input';
    input.value = defaultFilename;
    input.placeholder = defaultFilename;

    const buttons = document.createElement('div');
    buttons.className = 'modal-buttons';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-secondary';
    cancelBtn.textContent = 'Cancel';

    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn-primary';
    exportBtn.textContent = 'Export';

    buttons.appendChild(cancelBtn);
    buttons.appendChild(exportBtn);

    content.appendChild(titleEl);
    content.appendChild(input);
    content.appendChild(buttons);
    overlay.appendChild(content);

    document.body.appendChild(overlay);

    // Show modal with animation
    requestAnimationFrame(() => {
      overlay.classList.add('visible');
      input.focus();
      input.select();
    });

    const closeModal = (result) => {
      overlay.classList.remove('visible');
      setTimeout(() => {
        document.body.removeChild(overlay);
      }, 200);
      resolve(result);
    };

    const expectedExt = defaultFilename.includes('.')
      ? defaultFilename.substring(defaultFilename.lastIndexOf('.'))
      : '';

    const resolveFilename = (raw) => {
      let name = raw.trim();
      if (!name) return null;
      if (expectedExt && !name.toLowerCase().endsWith(expectedExt.toLowerCase())) {
        const lastSegment = name.split('.').pop() || '';
        const isLikelyExtension = /^[a-z]{1,4}$/i.test(lastSegment);
        if (!isLikelyExtension) {
          name += expectedExt;
        }
      }
      return name;
    };

    cancelBtn.addEventListener('click', () => closeModal(null));
    exportBtn.addEventListener('click', () => {
      closeModal(resolveFilename(input.value));
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        closeModal(resolveFilename(input.value));
      } else if (e.key === 'Escape') {
        closeModal(null);
      }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(null);
      }
    });
  });
}
