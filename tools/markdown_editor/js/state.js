/**
 * State management module for the Markdown Editor
 * Handles localStorage persistence and application state
 */

// Storage keys
export const STORAGE_KEYS = {
  DRAFT: 'markdownEditorDraft',
  SNAPSHOTS: 'markdownEditorSnapshots',
  SYNC_SCROLL: 'markdownSyncScroll',
  FONT_SIZE: 'markdownFontSize',
  THEME: 'theme',
  SUPPRESS_CLEAR_WARNING: 'markdownSuppressClearWarning',
  SUPPRESS_OPEN_WARNING: 'markdownSuppressOpenWarning',
  SUPPRESS_SAMPLE_WARNING: 'markdownSuppressSampleWarning'
};

// Snapshot configuration
const MAX_SNAPSHOTS = 20;
const MAX_SNAPSHOTS_BYTES = 2 * 1024 * 1024; // ~2 MB budget

// Application state
export const state = {
  isSyncScrollEnabled: false,
  lastExportedContent: null
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

// ------------------------------------------------------------------ //
// Snapshot history                                                      //
// ------------------------------------------------------------------ //

/**
 * Load all snapshots from localStorage.
 * Each snapshot is { timestamp: number, content: string }.
 * @returns {Array} Array of snapshot objects, oldest first
 */
export function loadSnapshots() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SNAPSHOTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Persist the given snapshots array, pruning to stay within limits.
 * @param {Array} snapshots
 */
function persistSnapshots(snapshots) {
  // Cap count
  while (snapshots.length > MAX_SNAPSHOTS) {
    snapshots.shift();
  }
  // Cap total size — drop oldest until under budget
  let json = JSON.stringify(snapshots);
  while (json.length > MAX_SNAPSHOTS_BYTES && snapshots.length > 1) {
    snapshots.shift();
    json = JSON.stringify(snapshots);
  }
  localStorage.setItem(STORAGE_KEYS.SNAPSHOTS, json);
}

/**
 * Save a snapshot of the current content.
 * Skips saving if the content is identical to the most recent snapshot.
 * @param {string} content - The markdown content to snapshot
 */
export function saveSnapshot(content) {
  if (!content || content.trim() === '') return;
  const snapshots = loadSnapshots();
  // Skip duplicate of the most recent snapshot
  if (snapshots.length > 0 && snapshots[snapshots.length - 1].content === content) {
    return;
  }
  snapshots.push({ timestamp: Date.now(), content });
  persistSnapshots(snapshots);
}

/**
 * Delete all saved snapshots.
 */
export function clearSnapshots() {
  localStorage.removeItem(STORAGE_KEYS.SNAPSHOTS);
}

// ------------------------------------------------------------------ //
// Dirty-state tracking                                                 //
// ------------------------------------------------------------------ //

/**
 * Mark the current content as "exported" (clean).
 * Call this after the user saves/exports a .md file.
 * @param {string} content
 */
export function markContentExported(content) {
  state.lastExportedContent = content;
}

/**
 * Check whether the editor content differs from the last export.
 * @param {string} currentContent
 * @returns {boolean} true if there are unsaved changes
 */
export function isDirty(currentContent) {
  if (state.lastExportedContent === null) {
    // Never exported this session — treat non-empty content as dirty
    return currentContent.trim() !== '';
  }
  return currentContent !== state.lastExportedContent;
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

/**
 * Check whether the open-file warning is suppressed
 * @returns {boolean} True if the user chose to suppress the warning
 */
export function isOpenWarningSuppressed() {
  return localStorage.getItem(STORAGE_KEYS.SUPPRESS_OPEN_WARNING) === 'true';
}

/**
 * Save the open-file warning suppression preference
 * @param {boolean} suppressed - Whether to suppress the warning
 */
export function saveOpenWarningSuppressed(suppressed) {
  localStorage.setItem(STORAGE_KEYS.SUPPRESS_OPEN_WARNING, String(suppressed));
}

/**
 * Check whether the sample-document warning is suppressed
 * @returns {boolean} True if the user chose to suppress the warning
 */
export function isSampleWarningSuppressed() {
  return localStorage.getItem(STORAGE_KEYS.SUPPRESS_SAMPLE_WARNING) === 'true';
}

/**
 * Save the sample-document warning suppression preference
 * @param {boolean} suppressed - Whether to suppress the warning
 */
export function saveSampleWarningSuppressed(suppressed) {
  localStorage.setItem(STORAGE_KEYS.SUPPRESS_SAMPLE_WARNING, String(suppressed));
}
