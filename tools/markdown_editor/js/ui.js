/**
 * UI module for the Markdown Editor
 * Handles theme toggling, font size, and other UI interactions
 */

import {
  loadThemePreference,
  saveThemePreference,
  loadSyncScrollPreference,
  loadFontSizePreference,
  saveFontSizePreference
} from './state.js';

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
 * Initialize sync scroll toggle based on saved preference.
 * @param {HTMLInputElement} syncScrollToggle - The sync scroll toggle checkbox
 */
export function initializeSyncScrollToggle(syncScrollToggle) {
  const enabled = loadSyncScrollPreference();
  syncScrollToggle.checked = enabled;
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
