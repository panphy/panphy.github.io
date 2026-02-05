/**
 * State management module for the Markdown Editor
 * Handles localStorage persistence and application state
 */

// Storage keys
export const STORAGE_KEYS = {
  DRAFT: 'markdownEditorDraft',
  SCROLL_SYNC: 'markdownScrollSync',
  HIGHLIGHT_SYNC: 'markdownHighlightSync',
  FONT_SIZE: 'markdownFontSize',
  THEME: 'theme'
};

// Application state
export const state = {
  isLinkScrollEnabled: false,
  isHighlightSyncEnabled: false
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
 * Save scroll sync preference
 * @param {boolean} enabled - Whether scroll sync is enabled
 */
export function saveScrollSyncPreference(enabled) {
  localStorage.setItem(STORAGE_KEYS.SCROLL_SYNC, enabled);
  state.isLinkScrollEnabled = enabled;
}

/**
 * Load scroll sync preference from localStorage
 * @returns {boolean} The saved preference
 */
export function loadScrollSyncPreference() {
  const saved = localStorage.getItem(STORAGE_KEYS.SCROLL_SYNC);
  if (saved === null) {
    state.isLinkScrollEnabled = false;
  } else {
    state.isLinkScrollEnabled = saved === 'true';
  }
  return state.isLinkScrollEnabled;
}

/**
 * Save highlight sync preference
 * @param {boolean} enabled - Whether highlight sync is enabled
 */
export function saveHighlightSyncPreference(enabled) {
  localStorage.setItem(STORAGE_KEYS.HIGHLIGHT_SYNC, enabled);
  state.isHighlightSyncEnabled = enabled;
}

/**
 * Load highlight sync preference from localStorage
 * @returns {boolean} The saved preference
 */
export function loadHighlightSyncPreference() {
  const saved = localStorage.getItem(STORAGE_KEYS.HIGHLIGHT_SYNC);
  if (saved === null) {
    state.isHighlightSyncEnabled = false;
  } else {
    state.isHighlightSyncEnabled = saved === 'true';
  }
  return state.isHighlightSyncEnabled;
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
