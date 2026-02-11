/**
 * State management module for the Markdown Editor
 * Handles localStorage persistence and application state
 */

// Storage keys
export const STORAGE_KEYS = {
  DRAFT: 'markdownEditorDraft',
  SYNC_SCROLL: 'markdownSyncScroll',
  FONT_SIZE: 'markdownFontSize',
  THEME: 'theme',
  SUPPRESS_CLEAR_WARNING: 'markdownSuppressClearWarning'
};

// Application state
export const state = {
  isSyncScrollEnabled: false
};

/**
 * Save the current markdown draft to localStorage
 * @param {string} content - The markdown content to save
 */
export function saveDraft(content) {
  localStorage.setItem(STORAGE_KEYS.DRAFT, content);
}

/**
 * Clear the saved draft from localStorage
 */
export function clearDraft() {
  localStorage.removeItem(STORAGE_KEYS.DRAFT);
}

/**
 * Restore the draft from localStorage
 * @returns {string|null} The saved draft or null if none exists
 */
export function restoreDraft() {
  return localStorage.getItem(STORAGE_KEYS.DRAFT);
}

/**
 * Save sync scroll preference
 * @param {boolean} enabled - Whether sync scroll is enabled
 */
export function saveSyncScrollPreference(enabled) {
  localStorage.setItem(STORAGE_KEYS.SYNC_SCROLL, enabled);
  state.isSyncScrollEnabled = enabled;
}

/**
 * Load sync scroll preference from localStorage
 * @returns {boolean} The saved preference
 */
export function loadSyncScrollPreference() {
  const saved = localStorage.getItem(STORAGE_KEYS.SYNC_SCROLL);
  if (saved === null) {
    state.isSyncScrollEnabled = false;
  } else {
    state.isSyncScrollEnabled = saved === 'true';
  }
  return state.isSyncScrollEnabled;
}

/**
 * Save font size preference
 * @param {string} size - The font size value (e.g., '16px')
 */
export function saveFontSizePreference(size) {
  localStorage.setItem(STORAGE_KEYS.FONT_SIZE, size);
}

/**
 * Load font size preference from localStorage
 * @returns {string|null} The saved font size or null
 */
export function loadFontSizePreference() {
  return localStorage.getItem(STORAGE_KEYS.FONT_SIZE);
}

/**
 * Save theme preference
 * @param {string} theme - The theme value ('markdown-dark' or 'markdown-light')
 */
export function saveThemePreference(theme) {
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
}

/**
 * Load theme preference from localStorage
 * @returns {string|null} The saved theme or null
 */
export function loadThemePreference() {
  return localStorage.getItem(STORAGE_KEYS.THEME);
}

/**
 * Debounce utility function
 * @param {Function} fn - The function to debounce
 * @param {number} delay - The delay in milliseconds
 * @returns {Function} The debounced function
 */
export function debounce(fn, delay) {
  let timerId;
  return (...args) => {
    window.clearTimeout(timerId);
    timerId = window.setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

/**
 * Throttle utility function
 * @param {Function} fn - The function to throttle
 * @param {number} limit - The minimum interval in milliseconds
 * @returns {Function} The throttled function
 */
export function throttle(fn, limit) {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      fn.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Check whether the clear/overwrite warning is suppressed
 * @returns {boolean} True if the user chose to suppress the warning
 */
export function isClearWarningSuppressed() {
  return localStorage.getItem(STORAGE_KEYS.SUPPRESS_CLEAR_WARNING) === 'true';
}

/**
 * Save the clear/overwrite warning suppression preference
 * @param {boolean} suppressed - Whether to suppress the warning
 */
export function saveClearWarningSuppressed(suppressed) {
  localStorage.setItem(STORAGE_KEYS.SUPPRESS_CLEAR_WARNING, String(suppressed));
}
