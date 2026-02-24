/**
 * UI module for the Markdown Editor
 * Handles theme toggling, font size, and other UI interactions
 */

import {
  loadThemePreference,
  saveThemePreference,
  loadSyncScrollPreference,
  loadFontSizePreference,
  saveFontSizePreference,
  isClearWarningSuppressed,
  saveClearWarningSuppressed,
  isClearHistoryWarningSuppressed,
  saveClearHistoryWarningSuppressed,
  clearSnapshots
} from './state.js';

// DOM element references (set during initialization)
let themeToggleButton = null;
let highlightStyle = null;

function updateAppChromeTheme(theme) {
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  const appleStatusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  const isDarkTheme = theme === 'dark';

  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', isDarkTheme ? '#0f1014' : '#f8f9fa');
  }

  if (appleStatusBarMeta) {
    appleStatusBarMeta.setAttribute('content', isDarkTheme ? 'black-translucent' : 'default');
  }
}

/**
 * Initialize UI module with DOM references
 * @param {Object} elements - Object containing DOM element references
 */
export function initUI(elements) {
  themeToggleButton = elements.themeToggleButton;
  highlightStyle = elements.highlightStyle;
}

function isTopMostModalOverlay(overlay) {
  if (!overlay || !overlay.isConnected) return false;
  const overlays = document.querySelectorAll('.modal-overlay');
  return overlays.length > 0 && overlays[overlays.length - 1] === overlay;
}

function isTouchInteractionMode() {
  if (typeof window === 'undefined') return false;
  const hasCoarsePointer = typeof window.matchMedia === 'function'
    && window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const hasTouchPoints = typeof navigator !== 'undefined'
    && Number.isFinite(navigator.maxTouchPoints)
    && navigator.maxTouchPoints > 0;
  return hasCoarsePointer || hasTouchPoints;
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
  updateAppChromeTheme(document.documentElement.getAttribute('data-theme'));

  window.addEventListener('pageshow', () => {
    updateAppChromeTheme(document.documentElement.getAttribute('data-theme'));
  });
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
    updateAppChromeTheme('dark');
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
    updateAppChromeTheme('light');
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
 * @param {HTMLElement|null} fontPanel - The font panel element with .font-option-btn children
 * @param {Function} [updateActiveState] - Callback to highlight the active button
 */
export function initializeFontSize(fontPanel, updateActiveState) {
  const savedFontSize = loadFontSizePreference();
  const initialFontSize = savedFontSize || getCurrentFontSize();
  applyFontSize(initialFontSize);
  if (updateActiveState) {
    updateActiveState(initialFontSize);
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
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    let closed = false;

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

    const onKeyDown = (event) => {
      if (!isTopMostModalOverlay(overlay)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeModal(null);
      }
    };

    const closeModal = (result) => {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKeyDown);
      overlay.classList.remove('visible');
      setTimeout(() => {
        if (overlay.parentNode) {
          document.body.removeChild(overlay);
        }
        if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
          previouslyFocused.focus();
        }
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
        e.preventDefault();
        closeModal(resolveFilename(input.value));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeModal(null);
      }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(null);
      }
    });

    document.addEventListener('keydown', onKeyDown);
  });
}

function normalizeDropboxImageUrl(parsedUrl) {
  const hostname = parsedUrl.hostname.toLowerCase();
  const isDropboxHost = hostname === 'dropbox.com' || hostname.endsWith('.dropbox.com');
  if (!isDropboxHost) return parsedUrl;

  const path = parsedUrl.pathname;
  const isLikelyFileShare = path.startsWith('/s/') || path.startsWith('/scl/fi/');
  if (!isLikelyFileShare) return parsedUrl;

  const normalized = new URL(parsedUrl.href);
  normalized.hostname = 'dl.dropboxusercontent.com';
  normalized.searchParams.delete('dl');
  normalized.searchParams.delete('raw');
  return normalized;
}

function getGoogleDrivePathFileId(pathname) {
  const filePathPatterns = [
    /^\/file\/d\/([^/]+)/,
    /^\/uc\/id\/([^/]+)/,
    /^\/thumbnail\/id\/([^/]+)/
  ];

  for (const pattern of filePathPatterns) {
    const match = pathname.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

function extractGoogleDriveFileId(parsedUrl) {
  return getGoogleDrivePathFileId(parsedUrl.pathname) || parsedUrl.searchParams.get('id');
}

function normalizeGoogleDriveImageUrl(parsedUrl) {
  const hostname = parsedUrl.hostname.toLowerCase();
  const isGoogleDriveHost = hostname === 'drive.google.com' || hostname === 'docs.google.com';
  if (!isGoogleDriveHost) return parsedUrl;

  const fileId = extractGoogleDriveFileId(parsedUrl);
  if (!fileId) return parsedUrl;

  return new URL(`https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}`);
}

function normalizeImageUrl(parsedUrl) {
  const afterDropbox = normalizeDropboxImageUrl(parsedUrl);
  return normalizeGoogleDriveImageUrl(afterDropbox);
}

/**
 * Normalize known cloud storage share links into direct image URLs.
 * @param {string} rawUrl
 * @returns {string}
 */
export function normalizeCloudImageUrl(rawUrl) {
  const trimmed = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  if (!trimmed) return rawUrl;

  let parsedUrl;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    return rawUrl;
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return rawUrl;
  }

  return normalizeImageUrl(parsedUrl).href;
}

function normalizeAndValidateImageUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return { error: 'Please enter an image URL.' };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    return { error: 'Enter a valid URL that starts with http:// or https://.' };
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return { error: 'Only http:// and https:// image URLs are allowed.' };
  }

  return { value: normalizeCloudImageUrl(parsedUrl.href) };
}

/**
 * Show the image insertion modal.
 * @returns {Promise<{url: string, align: string, width: number}|null>}
 */
export function showImageModal() {
  return new Promise((resolve) => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    let closed = false;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const content = document.createElement('div');
    content.className = 'modal-content image-modal';

    const titleRow = document.createElement('div');
    titleRow.className = 'image-modal-header';

    const titleEl = document.createElement('h3');
    titleEl.className = 'modal-title';
    titleEl.textContent = 'Insert Image';

    const helpBtn = document.createElement('button');
    helpBtn.type = 'button';
    helpBtn.className = 'image-modal-help';
    helpBtn.setAttribute('aria-label', 'Cloud link help');
    helpBtn.textContent = '?';

    const tooltip = document.createElement('span');
    tooltip.className = 'image-modal-tooltip';
    tooltip.textContent =
      'You can paste Google Drive or Dropbox share links — they\u2019ll be converted to direct image URLs automatically.';

    helpBtn.appendChild(tooltip);
    titleRow.appendChild(titleEl);
    titleRow.appendChild(helpBtn);

    const urlLabel = document.createElement('label');
    urlLabel.className = 'modal-field-label';
    urlLabel.setAttribute('for', 'imageUrlInput');
    urlLabel.textContent = 'Image URL';

    const urlInput = document.createElement('input');
    urlInput.id = 'imageUrlInput';
    urlInput.type = 'url';
    urlInput.className = 'modal-input';
    urlInput.placeholder = 'https://example.com/image.png';
    urlInput.autocomplete = 'off';
    urlInput.spellcheck = false;

    const alignLabel = document.createElement('span');
    alignLabel.className = 'modal-field-label';
    alignLabel.textContent = 'Alignment';

    const alignGroup = document.createElement('div');
    alignGroup.className = 'image-align-group';
    alignGroup.setAttribute('role', 'radiogroup');
    alignGroup.setAttribute('aria-label', 'Image alignment');

    const alignOptions = [
      { value: 'left', label: 'Left' },
      { value: 'center', label: 'Center' },
      { value: 'right', label: 'Right' }
    ];

    alignOptions.forEach((option) => {
      const optionLabel = document.createElement('label');
      optionLabel.className = 'image-align-option';

      const optionInput = document.createElement('input');
      optionInput.type = 'radio';
      optionInput.name = 'imageAlign';
      optionInput.value = option.value;
      optionInput.checked = option.value === 'center';

      const optionText = document.createElement('span');
      optionText.textContent = option.label;

      optionLabel.appendChild(optionInput);
      optionLabel.appendChild(optionText);
      alignGroup.appendChild(optionLabel);
    });

    const widthHeader = document.createElement('div');
    widthHeader.className = 'modal-slider-header';

    const widthLabel = document.createElement('label');
    widthLabel.className = 'modal-field-label';
    widthLabel.setAttribute('for', 'imageWidthInput');
    widthLabel.textContent = 'Width';

    const widthValue = document.createElement('span');
    widthValue.className = 'modal-slider-value';
    widthValue.textContent = '60%';

    widthHeader.appendChild(widthLabel);
    widthHeader.appendChild(widthValue);

    const widthInput = document.createElement('input');
    widthInput.id = 'imageWidthInput';
    widthInput.type = 'range';
    widthInput.className = 'modal-slider';
    widthInput.min = '5';
    widthInput.max = '100';
    widthInput.step = '1';
    widthInput.value = '60';

    const errorEl = document.createElement('p');
    errorEl.className = 'modal-error';
    errorEl.hidden = true;
    errorEl.setAttribute('role', 'alert');
    errorEl.setAttribute('aria-live', 'polite');

    const buttons = document.createElement('div');
    buttons.className = 'modal-buttons';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-secondary';
    cancelBtn.textContent = 'Cancel';

    const insertBtn = document.createElement('button');
    insertBtn.className = 'btn-primary';
    insertBtn.textContent = 'Insert';

    buttons.appendChild(cancelBtn);
    buttons.appendChild(insertBtn);

    content.appendChild(titleRow);
    content.appendChild(urlLabel);
    content.appendChild(urlInput);
    content.appendChild(alignLabel);
    content.appendChild(alignGroup);
    content.appendChild(widthHeader);
    content.appendChild(widthInput);
    content.appendChild(errorEl);
    content.appendChild(buttons);
    overlay.appendChild(content);

    document.body.appendChild(overlay);

    const setError = (message) => {
      if (!message) {
        errorEl.textContent = '';
        errorEl.hidden = true;
        return;
      }
      errorEl.textContent = message;
      errorEl.hidden = false;
    };

    const closeModal = (result) => {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKeyDown);
      overlay.classList.remove('visible');
      setTimeout(() => {
        if (overlay.parentNode) {
          document.body.removeChild(overlay);
        }
        if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
          previouslyFocused.focus();
        }
      }, 200);
      resolve(result);
    };

    const submitModal = () => {
      const urlValidation = normalizeAndValidateImageUrl(urlInput.value);
      if (!urlValidation.value) {
        setError(urlValidation.error);
        urlInput.focus();
        return;
      }

      const alignInput = alignGroup.querySelector('input[name="imageAlign"]:checked');
      const selectedAlign = alignInput ? alignInput.value : 'center';
      const selectedWidth = Number.parseInt(widthInput.value, 10);
      const normalizedWidth = Number.isFinite(selectedWidth)
        ? Math.min(100, Math.max(5, selectedWidth))
        : 60;

      setError('');
      closeModal({
        url: urlValidation.value,
        align: selectedAlign,
        width: normalizedWidth
      });
    };

    const onKeyDown = (event) => {
      if (!isTopMostModalOverlay(overlay)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeModal(null);
        return;
      }
      if (event.key === 'Enter' && event.target !== cancelBtn) {
        event.preventDefault();
        submitModal();
      }
    };

    urlInput.addEventListener('input', () => {
      setError('');
    });

    widthInput.addEventListener('input', () => {
      widthValue.textContent = `${widthInput.value}%`;
    });

    cancelBtn.addEventListener('click', () => closeModal(null));
    insertBtn.addEventListener('click', submitModal);

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        closeModal(null);
      }
    });

    document.addEventListener('keydown', onKeyDown);

    requestAnimationFrame(() => {
      overlay.classList.add('visible');
      urlInput.focus();
    });
  });
}

/**
 * Show a confirmation modal warning the user about losing unsaved work.
 * If the user has previously checked "Don't show this warning again",
 * the modal is skipped and the promise resolves to true immediately.
 *
 * @param {string} message - The warning message to display
 * @param {Object} [options] - Optional suppression callbacks
 * @param {Function} [options.isSuppressed] - Returns true if the warning is suppressed
 * @param {Function} [options.saveSuppressed] - Saves the suppression preference
 * @param {boolean} [options.allowSuppress] - Whether users can suppress this warning
 * @returns {Promise<boolean>} True if the user confirmed, false if cancelled
 */
export function showConfirmationModal(
  message,
  {
    isSuppressed = isClearWarningSuppressed,
    saveSuppressed = saveClearWarningSuppressed,
    allowSuppress = true
  } = {}
) {
  if (allowSuppress && isSuppressed()) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    let closed = false;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const content = document.createElement('div');
    content.className = 'modal-content';

    const titleEl = document.createElement('h3');
    titleEl.className = 'modal-title';
    titleEl.textContent = 'Are you sure?';

    const messageEl = document.createElement('p');
    messageEl.className = 'modal-message';
    messageEl.textContent = message;

    let checkbox = null;
    let checkboxLabel = null;
    if (allowSuppress) {
      checkboxLabel = document.createElement('label');
      checkboxLabel.className = 'modal-checkbox-label';

      checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'modal-checkbox';

      const checkboxText = document.createTextNode(" Don\u2019t show this warning again");
      checkboxLabel.appendChild(checkbox);
      checkboxLabel.appendChild(checkboxText);
    }

    const buttons = document.createElement('div');
    buttons.className = 'modal-buttons';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-secondary';
    cancelBtn.textContent = 'Cancel';

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn-primary';
    confirmBtn.textContent = 'Continue';

    buttons.appendChild(cancelBtn);
    buttons.appendChild(confirmBtn);

    content.appendChild(titleEl);
    content.appendChild(messageEl);
    if (checkboxLabel) {
      content.appendChild(checkboxLabel);
    }
    content.appendChild(buttons);
    overlay.appendChild(content);

    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.classList.add('visible');
      confirmBtn.focus();
    });

    const onKeyDown = (event) => {
      if (!isTopMostModalOverlay(overlay)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeModal(false);
      }
    };

    const closeModal = (confirmed) => {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKeyDown);
      if (allowSuppress && confirmed && checkbox && checkbox.checked) {
        saveSuppressed(true);
      }
      overlay.classList.remove('visible');
      setTimeout(() => {
        if (overlay.parentNode) {
          document.body.removeChild(overlay);
        }
        if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
          previouslyFocused.focus();
        }
      }, 200);
      resolve(confirmed);
    };

    cancelBtn.addEventListener('click', () => closeModal(false));
    confirmBtn.addEventListener('click', () => closeModal(true));

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(false);
      }
    });

    document.addEventListener('keydown', onKeyDown);
  });
}

// ------------------------------------------------------------------ //
// Dirty-state indicator                                                //
// ------------------------------------------------------------------ //

/**
 * Show or hide the unsaved-changes dot indicator.
 * @param {HTMLElement|null} indicator - The dot element
 * @param {boolean} dirty
 */
export function updateDirtyIndicator(indicator, dirty) {
  if (!indicator) return;
  indicator.classList.toggle('visible', dirty);
  indicator.title = dirty ? 'Unsaved changes' : '';
}

// ------------------------------------------------------------------ //
// History / Snapshot modal                                             //
// ------------------------------------------------------------------ //

/**
 * Format a timestamp into a human-readable string.
 * @param {number} ts - Unix millisecond timestamp
 * @returns {string}
 */
function formatTimestamp(ts) {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  if (isToday) return `Today ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` ${time}`;
}

const HISTORY_PREVIEW_CHAR_LIMIT = 2000;

/**
 * Show a modal listing snapshot history. Returns the chosen snapshot's
 * content, or null if the user cancelled.
 * @param {Array} snapshots - Array of { timestamp, content }
 * @returns {Promise<string|null>}
 */
export function showHistoryModal(snapshots) {
  return new Promise((resolve) => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    let closed = false;
    const requireExplicitRestore = isTouchInteractionMode();
    let selectedSnapshotContent = null;
    let selectedHistoryItem = null;
    let restoreBtn = null;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const content = document.createElement('div');
    content.className = 'modal-content history-modal';
    if (snapshots.length === 1) {
      content.classList.add('history-modal-single');
    }
    if (snapshots.length >= 3) {
      content.classList.add('history-modal-multi');
    }
    if (requireExplicitRestore) {
      content.classList.add('history-modal-touch');
    }

    const titleRow = document.createElement('div');
    titleRow.className = 'history-title-row';
    const titleEl = document.createElement('h3');
    titleEl.className = 'modal-title';
    titleEl.textContent = 'Version History';
    titleRow.appendChild(titleEl);

    if (snapshots.length > 0) {
      const clearBtn = document.createElement('button');
      clearBtn.className = 'btn-secondary history-clear-btn';
      clearBtn.textContent = 'Clear All';
      clearBtn.addEventListener('click', async () => {
        const confirmed = await showConfirmationModal(
          'This will permanently delete all saved snapshots from version history. This action cannot be undone.',
          {
            isSuppressed: isClearHistoryWarningSuppressed,
            saveSuppressed: saveClearHistoryWarningSuppressed
          }
        );
        if (!confirmed) return;
        clearSnapshots();
        listContainer.innerHTML = '<p class="history-empty">History cleared.</p>';
        if (selectedHistoryItem) {
          selectedHistoryItem.classList.remove('history-item-selected');
          selectedHistoryItem = null;
        }
        selectedSnapshotContent = null;
        if (restoreBtn) {
          restoreBtn.disabled = true;
        }
        clearBtn.remove();
      });
      titleRow.appendChild(clearBtn);
    }
    content.appendChild(titleRow);

    if (requireExplicitRestore && snapshots.length > 0) {
      const touchHint = document.createElement('p');
      touchHint.className = 'history-touch-hint';
      touchHint.textContent = 'Tap a snapshot to select it, then tap Restore Selected.';
      content.appendChild(touchHint);
    }

    const listContainer = document.createElement('div');
    listContainer.className = 'history-list';
    let lastTouchY = null;

    const getTargetElement = (event) => {
      if (event.target instanceof Element) return event.target;
      if (event.target && event.target.parentElement instanceof Element) {
        return event.target.parentElement;
      }
      return null;
    };

    const scrollHistoryListBy = (deltaY) => {
      if (!Number.isFinite(deltaY) || deltaY === 0) return;
      const maxListScrollTop = Math.max(0, listContainer.scrollHeight - listContainer.clientHeight);
      if (maxListScrollTop <= 0) return;
      const nextScrollTop = Math.max(0, Math.min(maxListScrollTop, listContainer.scrollTop + deltaY));
      listContainer.scrollTop = nextScrollTop;
    };

    overlay.addEventListener('wheel', (event) => {
      if (!isTopMostModalOverlay(overlay)) return;
      if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;

      const targetElement = getTargetElement(event);
      if (targetElement && targetElement.closest('.history-item-preview')) return;

      event.preventDefault();
      scrollHistoryListBy(event.deltaY);
    }, { passive: false });

    overlay.addEventListener('touchstart', (event) => {
      if (!isTopMostModalOverlay(overlay) || event.touches.length !== 1) {
        lastTouchY = null;
        return;
      }
      lastTouchY = event.touches[0].clientY;
    }, { passive: true });

    overlay.addEventListener('touchmove', (event) => {
      if (!isTopMostModalOverlay(overlay) || event.touches.length !== 1) {
        lastTouchY = null;
        return;
      }

      const currentTouchY = event.touches[0].clientY;
      if (!Number.isFinite(lastTouchY)) {
        lastTouchY = currentTouchY;
        return;
      }

      const targetElement = getTargetElement(event);
      if (targetElement && targetElement.closest('.history-item-preview')) {
        lastTouchY = currentTouchY;
        return;
      }

      const deltaY = lastTouchY - currentTouchY;
      lastTouchY = currentTouchY;

      event.preventDefault();
      scrollHistoryListBy(deltaY);
    }, { passive: false });

    overlay.addEventListener('touchend', () => {
      lastTouchY = null;
    });

    overlay.addEventListener('touchcancel', () => {
      lastTouchY = null;
    });

    const selectHistoryItem = (item, snapshotContent) => {
      if (selectedHistoryItem && selectedHistoryItem !== item) {
        selectedHistoryItem.classList.remove('history-item-selected');
        selectedHistoryItem.setAttribute('aria-pressed', 'false');
      }
      selectedHistoryItem = item;
      selectedSnapshotContent = snapshotContent;
      item.classList.add('history-item-selected');
      item.setAttribute('aria-pressed', 'true');
      if (restoreBtn) {
        restoreBtn.disabled = false;
      }
    };

    if (snapshots.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'history-empty';
      empty.textContent = 'No snapshots yet. Snapshots are saved every 5 minutes and before destructive actions.';
      listContainer.appendChild(empty);
    } else {
      // Show newest first
      for (let i = snapshots.length - 1; i >= 0; i--) {
        const snap = snapshots[i];
        const item = document.createElement('div');
        item.className = 'history-item';
        item.tabIndex = 0;
        item.setAttribute('role', 'button');

        const meta = document.createElement('div');
        meta.className = 'history-item-meta';

        const timeEl = document.createElement('span');
        timeEl.className = 'history-item-time';
        timeEl.textContent = formatTimestamp(snap.timestamp);

        const sizeEl = document.createElement('span');
        sizeEl.className = 'history-item-size';
        const chars = snap.content.length;
        sizeEl.textContent = chars < 1000 ? `${chars} chars` : `${(chars / 1000).toFixed(1)}k chars`;

        meta.appendChild(timeEl);
        meta.appendChild(sizeEl);

        const preview = document.createElement('div');
        preview.className = 'history-item-preview';
        const previewText = snap.content.length > HISTORY_PREVIEW_CHAR_LIMIT
          ? `${snap.content.slice(0, HISTORY_PREVIEW_CHAR_LIMIT)}\n...`
          : snap.content;
        preview.textContent = previewText;
        preview.addEventListener('wheel', (event) => {
          const deltaY = event.deltaY;
          if (deltaY === 0) return;

          const maxPreviewScrollTop = preview.scrollHeight - preview.clientHeight;
          if (maxPreviewScrollTop <= 0) {
            event.preventDefault();
            listContainer.scrollTop += deltaY;
            return;
          }

          const isScrollingDown = deltaY > 0;
          const isAtTop = preview.scrollTop <= 0;
          const isAtBottom = preview.scrollTop >= maxPreviewScrollTop - 1;

          if ((isScrollingDown && isAtBottom) || (!isScrollingDown && isAtTop)) {
            event.preventDefault();
            listContainer.scrollTop += deltaY;
          }
        }, { passive: false });
        if (requireExplicitRestore) {
          item.setAttribute('aria-label', `Select snapshot from ${formatTimestamp(snap.timestamp)}`);
          item.setAttribute('aria-pressed', 'false');
          item.addEventListener('click', () => {
            selectHistoryItem(item, snap.content);
          });
          item.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              selectHistoryItem(item, snap.content);
            }
          });
        } else {
          item.setAttribute('aria-label', `Restore snapshot from ${formatTimestamp(snap.timestamp)}`);
          item.addEventListener('click', () => closeModal(snap.content));
          item.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              closeModal(snap.content);
            }
          });
        }

        item.appendChild(meta);
        item.appendChild(preview);
        listContainer.appendChild(item);
      }
    }
    content.appendChild(listContainer);

    const buttons = document.createElement('div');
    buttons.className = 'modal-buttons';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-secondary';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => closeModal(null));
    buttons.appendChild(closeBtn);
    if (requireExplicitRestore && snapshots.length > 0) {
      restoreBtn = document.createElement('button');
      restoreBtn.type = 'button';
      restoreBtn.className = 'btn-primary history-restore-btn';
      restoreBtn.textContent = 'Restore Selected';
      restoreBtn.disabled = true;
      restoreBtn.addEventListener('click', () => {
        if (selectedSnapshotContent === null) return;
        closeModal(selectedSnapshotContent);
      });
      buttons.appendChild(restoreBtn);
    }
    content.appendChild(buttons);

    overlay.appendChild(content);
    document.body.classList.add('history-modal-open');
    document.body.appendChild(overlay);

    const closeModal = (result) => {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKeyDown);
      overlay.classList.remove('visible');
      document.body.classList.remove('history-modal-open');
      setTimeout(() => {
        if (overlay.parentNode) {
          document.body.removeChild(overlay);
        }
        if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
          previouslyFocused.focus();
        }
      }, 200);
      resolve(result);
    };

    const onKeyDown = (e) => {
      if (!isTopMostModalOverlay(overlay)) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeModal(null);
      }
    };
    document.addEventListener('keydown', onKeyDown);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(null);
    });

    requestAnimationFrame(() => {
      overlay.classList.add('visible');
      closeBtn.focus();
    });
  });
}
