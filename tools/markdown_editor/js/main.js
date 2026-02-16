/**
 * Main module for the Markdown Editor
 * Initializes the application and sets up event handlers
 */

import {
  state,
  saveDraft,
  clearDraft,
  restoreDraft,
  saveSyncScrollPreference,
  debounce,
  isOpenWarningSuppressed,
  saveOpenWarningSuppressed,
  isSampleWarningSuppressed,
  saveSampleWarningSuppressed,
  saveSnapshot,
  loadSnapshots,
  markContentExported,
  isDirty
} from './state.js';

import {
  preprocessMarkdown,
  restoreEscapedDollarPlaceholders,
  getCleanRenderedOutputHTML
} from './rendering.js';

import {
  handleCopyClick,
  handleCopyHover,
  handleCopyHoverOut,
  dismissTableCopyActions
} from './copy.js';

import {
  initUI,
  initializeTheme,
  toggleTheme,
  initializeSyncScrollToggle,
  initializeFontSize,
  applyFontSize,
  updateOfflineFontState,
  updateThemeToggleButton,
  getCurrentFontSize,
  showFilenameModal,
  showImageModal,
  showConfirmationModal,
  showHistoryModal,
  updateDirtyIndicator
} from './ui.js';

// DOM element references
const markdownInput = document.getElementById('markdownInput');
const inputPane = document.getElementById('inputPane');
const outputPane = document.getElementById('outputPane');
const renderedOutput = document.getElementById('renderedOutput');
const clearButton = document.getElementById('clearButton');
const mathMenu = document.getElementById('mathMenu');
const mathButton = document.getElementById('mathButton');
const mathPanel = document.getElementById('mathPanel');
const imageButton = document.getElementById('imageButton');
const loadSampleButton = document.getElementById('loadSampleButton');
const exportHTMLButton = document.getElementById('exportHTMLButton');
const presentButton = document.getElementById('presentButton');
const printButton = document.getElementById('printButton');
const saveMDButton = document.getElementById('saveMDButton');
const loadFileButton = document.getElementById('loadFileButton');
const themeToggleButton = document.getElementById('themeToggleButton');
const syncScrollToggle = document.getElementById('syncScrollToggle');
const fontMenu = document.getElementById('fontMenu');
const fontButton = document.getElementById('fontButton');
const fontPanel = document.getElementById('fontPanel');
const highlightStyle = document.getElementById('highlightStyle');
const historyButton = document.getElementById('historyButton');
const dirtyIndicator = document.getElementById('dirtyIndicator');
const presentExitButton = document.getElementById('presentExitButton');
const presentThemeToggle = document.getElementById('presentThemeToggle');
const presentLaserToggle = document.getElementById('presentLaserToggle');
const presentZoomSelect = document.getElementById('presentZoomSelect');
const laserPointer = document.getElementById('laserPointer');
const laserCanvas = document.getElementById('laserCanvas');
const laserContext = laserCanvas ? laserCanvas.getContext('2d') : null;

// Sync scroll guard flags
let isSyncingInputScroll = false;
let isSyncingOutputScroll = false;
let pendingSyncSource = null;
let syncScrollRafId = 0;
let renderCycleId = 0;
let syncAnchorMap = null;
let syncAnchorMapRenderCycle = 0;
let syncAnchorMirror = null;
let syncAnchorRebuildTimeoutId = 0;

const SYNC_SCROLL_EPSILON = 1;
const SYNC_ANCHOR_REBUILD_DELAY_MS = 120;
const MAX_SYNC_ANCHORS = 400;

function clearPendingSyncAnchorRebuild() {
  if (!syncAnchorRebuildTimeoutId) return;
  window.clearTimeout(syncAnchorRebuildTimeoutId);
  syncAnchorRebuildTimeoutId = 0;
}

function clearSyncAnchorMap() {
  syncAnchorMap = null;
  syncAnchorMapRenderCycle = 0;
}

function ensureSyncAnchorMirror() {
  if (syncAnchorMirror) return syncAnchorMirror;
  const mirror = document.createElement('div');
  mirror.setAttribute('aria-hidden', 'true');
  mirror.style.position = 'absolute';
  mirror.style.left = '-99999px';
  mirror.style.top = '0';
  mirror.style.visibility = 'hidden';
  mirror.style.pointerEvents = 'none';
  mirror.style.zIndex = '-1';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.overflowWrap = 'break-word';
  mirror.style.wordBreak = 'break-word';
  mirror.style.contain = 'layout style paint';
  document.body.appendChild(mirror);
  syncAnchorMirror = mirror;
  return mirror;
}

function getRenderedOutputAnchorOffsets() {
  return Array.from(renderedOutput.children)
    .map(element => element.offsetTop)
    .filter(Number.isFinite);
}

function getSourceAnchorOffsets(content) {
  if (!markedLib || typeof markedLib.lexer !== 'function') {
    return [];
  }

  try {
    const tokens = markedLib.lexer(content || '', {
      gfm: true,
      breaks: true,
      headerIds: true,
      tables: true
    });

    const offsets = [];
    let cursor = 0;

    tokens.forEach(token => {
      const raw = typeof token.raw === 'string' ? token.raw : '';
      if (!raw) return;
      if (token.type !== 'space') {
        offsets.push(cursor);
      }
      cursor += raw.length;
    });

    return offsets;
  } catch (error) {
    console.warn('Failed to build sync-scroll source anchors.', error);
    return [];
  }
}

function selectDistributedIndices(totalCount, selectedCount) {
  if (totalCount <= 0 || selectedCount <= 0) {
    return [];
  }
  if (selectedCount === 1) {
    return [0];
  }

  const indices = [];
  for (let i = 0; i < selectedCount; i += 1) {
    const ratio = i / (selectedCount - 1);
    indices.push(Math.round(ratio * (totalCount - 1)));
  }
  return indices;
}

function measureInputAnchorOffsets(content, sourceOffsets) {
  if (!sourceOffsets.length) return [];

  const inputWidth = markdownInput.clientWidth;
  if (inputWidth <= 0) return [];

  const mirror = ensureSyncAnchorMirror();
  const computedStyle = window.getComputedStyle(markdownInput);

  mirror.style.width = `${inputWidth}px`;
  mirror.style.padding = computedStyle.padding;
  mirror.style.border = computedStyle.border;
  mirror.style.boxSizing = computedStyle.boxSizing;
  mirror.style.fontFamily = computedStyle.fontFamily;
  mirror.style.fontSize = computedStyle.fontSize;
  mirror.style.fontStyle = computedStyle.fontStyle;
  mirror.style.fontWeight = computedStyle.fontWeight;
  mirror.style.fontVariant = computedStyle.fontVariant;
  mirror.style.lineHeight = computedStyle.lineHeight;
  mirror.style.letterSpacing = computedStyle.letterSpacing;
  mirror.style.textTransform = computedStyle.textTransform;
  mirror.style.textIndent = computedStyle.textIndent;
  mirror.style.textAlign = computedStyle.textAlign;
  mirror.style.direction = computedStyle.direction;
  mirror.style.tabSize = computedStyle.tabSize;
  mirror.style.webkitTextSizeAdjust = computedStyle.webkitTextSizeAdjust;

  mirror.textContent = '';

  const markerElements = [];
  const fragment = document.createDocumentFragment();
  let previousOffset = 0;
  const maxOffset = content.length;

  sourceOffsets.forEach((offset, index) => {
    const clampedOffset = Math.max(previousOffset, Math.min(maxOffset, offset));
    if (clampedOffset > previousOffset) {
      fragment.appendChild(document.createTextNode(content.slice(previousOffset, clampedOffset)));
    }

    const marker = document.createElement('span');
    marker.dataset.syncAnchor = String(index);
    marker.textContent = '\u200b';
    fragment.appendChild(marker);
    markerElements.push(marker);
    previousOffset = clampedOffset;
  });

  if (previousOffset < maxOffset) {
    fragment.appendChild(document.createTextNode(content.slice(previousOffset)));
  }
  if (content.endsWith('\n')) {
    fragment.appendChild(document.createTextNode('\u200b'));
  }

  mirror.appendChild(fragment);

  const baseTop = markerElements.length > 0 ? markerElements[0].offsetTop : 0;
  return markerElements.map(marker => marker.offsetTop - baseTop);
}

function normalizeSyncAnchorPairs(anchorPairs) {
  const normalized = [];
  let lastInputY = 0;
  let lastOutputY = 0;

  anchorPairs.forEach((pair, index) => {
    if (!pair || !Number.isFinite(pair.inputY) || !Number.isFinite(pair.outputY)) {
      return;
    }

    const inputY = index === 0 ? Math.max(0, pair.inputY) : Math.max(lastInputY, pair.inputY);
    const outputY = index === 0 ? Math.max(0, pair.outputY) : Math.max(lastOutputY, pair.outputY);

    if (normalized.length > 0) {
      const previous = normalized[normalized.length - 1];
      if (
        Math.abs(previous.inputY - inputY) <= SYNC_SCROLL_EPSILON
        && Math.abs(previous.outputY - outputY) <= SYNC_SCROLL_EPSILON
      ) {
        return;
      }
    }

    normalized.push({ inputY, outputY });
    lastInputY = inputY;
    lastOutputY = outputY;
  });

  return normalized;
}

function buildSyncAnchorMap(content, cycleId = renderCycleId) {
  if (!state.isSyncScrollEnabled) {
    clearSyncAnchorMap();
    return;
  }
  if (cycleId !== renderCycleId) return;

  const sourceAnchorOffsets = getSourceAnchorOffsets(content);
  const outputAnchorOffsets = getRenderedOutputAnchorOffsets();

  if (!sourceAnchorOffsets.length || !outputAnchorOffsets.length) {
    clearSyncAnchorMap();
    return;
  }

  const pairCount = Math.min(sourceAnchorOffsets.length, outputAnchorOffsets.length, MAX_SYNC_ANCHORS);
  const sourceIndices = selectDistributedIndices(sourceAnchorOffsets.length, pairCount);
  const outputIndices = selectDistributedIndices(outputAnchorOffsets.length, pairCount);

  const sampledSourceOffsets = sourceIndices.map(index => sourceAnchorOffsets[index]);
  const sampledInputOffsets = measureInputAnchorOffsets(content, sampledSourceOffsets);
  if (sampledInputOffsets.length !== sampledSourceOffsets.length) {
    clearSyncAnchorMap();
    return;
  }
  const sampledOutputOffsets = outputIndices.map(index => outputAnchorOffsets[index]);

  const maxInputScrollTop = Math.max(0, markdownInput.scrollHeight - markdownInput.clientHeight);
  const maxOutputScrollTop = Math.max(0, renderedOutput.scrollHeight - renderedOutput.clientHeight);

  const rawPairs = [{ inputY: 0, outputY: 0 }];
  for (let i = 0; i < sampledInputOffsets.length; i += 1) {
    const inputY = Math.max(0, Math.min(maxInputScrollTop, sampledInputOffsets[i]));
    const outputY = Math.max(0, Math.min(maxOutputScrollTop, sampledOutputOffsets[i]));
    rawPairs.push({ inputY, outputY });
  }
  rawPairs.push({ inputY: maxInputScrollTop, outputY: maxOutputScrollTop });

  const normalizedPairs = normalizeSyncAnchorPairs(rawPairs);
  if (normalizedPairs.length < 2) {
    clearSyncAnchorMap();
    return;
  }

  syncAnchorMap = normalizedPairs;
  syncAnchorMapRenderCycle = cycleId;
}

function scheduleSyncAnchorMapRebuild(content, cycleId = renderCycleId) {
  if (!state.isSyncScrollEnabled) {
    clearPendingSyncAnchorRebuild();
    clearSyncAnchorMap();
    return;
  }

  clearPendingSyncAnchorRebuild();
  syncAnchorRebuildTimeoutId = window.setTimeout(() => {
    syncAnchorRebuildTimeoutId = 0;
    buildSyncAnchorMap(content, cycleId);
  }, SYNC_ANCHOR_REBUILD_DELAY_MS);
}

function interpolateSyncTarget(anchorPairs, sourceScrollTop, sourceKey, targetKey) {
  if (!anchorPairs || anchorPairs.length < 2) return null;

  const firstPair = anchorPairs[0];
  const lastPair = anchorPairs[anchorPairs.length - 1];
  const clampedSource = Math.min(
    Math.max(sourceScrollTop, firstPair[sourceKey]),
    lastPair[sourceKey]
  );

  let low = 0;
  let high = anchorPairs.length - 1;

  while (low + 1 < high) {
    const mid = Math.floor((low + high) / 2);
    if (anchorPairs[mid][sourceKey] <= clampedSource) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const start = anchorPairs[low];
  const end = anchorPairs[high];
  const sourceSpan = end[sourceKey] - start[sourceKey];
  if (sourceSpan <= SYNC_SCROLL_EPSILON) {
    return end[targetKey];
  }

  const ratio = (clampedSource - start[sourceKey]) / sourceSpan;
  return start[targetKey] + (end[targetKey] - start[targetKey]) * ratio;
}

function syncScrollByAnchorMap(sourceElement, targetElement, sourcePane) {
  if (
    !syncAnchorMap
    || syncAnchorMapRenderCycle !== renderCycleId
    || syncAnchorMap.length < 2
  ) {
    return false;
  }

  const sourceKey = sourcePane === 'input' ? 'inputY' : 'outputY';
  const targetKey = sourcePane === 'input' ? 'outputY' : 'inputY';
  const interpolatedTarget = interpolateSyncTarget(
    syncAnchorMap,
    sourceElement.scrollTop,
    sourceKey,
    targetKey
  );

  if (!Number.isFinite(interpolatedTarget)) return false;

  const targetScrollableHeight = Math.max(0, targetElement.scrollHeight - targetElement.clientHeight);
  const clampedTarget = Math.max(0, Math.min(targetScrollableHeight, interpolatedTarget));

  if (Math.abs(targetElement.scrollTop - clampedTarget) > SYNC_SCROLL_EPSILON) {
    targetElement.scrollTop = clampedTarget;
  }
  return true;
}

function syncScrollByRatio(sourceElement, targetElement) {
  const sourceScrollableHeight = sourceElement.scrollHeight - sourceElement.clientHeight;
  const targetScrollableHeight = targetElement.scrollHeight - targetElement.clientHeight;

  if (sourceScrollableHeight <= 0 || targetScrollableHeight <= 0) {
    if (Math.abs(targetElement.scrollTop) > SYNC_SCROLL_EPSILON) {
      targetElement.scrollTop = 0;
    }
    return;
  }

  const sourceRatio = Math.min(1, Math.max(0, sourceElement.scrollTop / sourceScrollableHeight));
  const nextTargetScrollTop = sourceRatio * targetScrollableHeight;

  if (Math.abs(targetElement.scrollTop - nextTargetScrollTop) > SYNC_SCROLL_EPSILON) {
    targetElement.scrollTop = nextTargetScrollTop;
  }
}

function syncScroll(sourceElement, targetElement, sourcePane) {
  if (syncScrollByAnchorMap(sourceElement, targetElement, sourcePane)) {
    return;
  }
  syncScrollByRatio(sourceElement, targetElement);
}

function scheduleSyncScroll(source) {
  if (!state.isSyncScrollEnabled) return;

  pendingSyncSource = source;
  if (syncScrollRafId) return;

  syncScrollRafId = requestAnimationFrame(() => {
    const sourceToSync = pendingSyncSource;
    pendingSyncSource = null;
    syncScrollRafId = 0;

    if (sourceToSync === 'input') {
      if (isSyncingInputScroll) return;
      isSyncingOutputScroll = true;
      syncScroll(markdownInput, renderedOutput, 'input');
      requestAnimationFrame(() => {
        isSyncingOutputScroll = false;
      });
      return;
    }

    if (isSyncingOutputScroll) return;
    isSyncingInputScroll = true;
    syncScroll(renderedOutput, markdownInput, 'output');
    requestAnimationFrame(() => {
      isSyncingInputScroll = false;
    });
  });
}

function syncInputToOutput() {
  scheduleSyncScroll('input');
}

function syncOutputToInput() {
  scheduleSyncScroll('output');
}

// Initialize UI module with DOM references
initUI({
  themeToggleButton,
  highlightStyle
});

// Configure marked once at initialization (not per-render)
const markedLib = window.marked;
const escapeHtml = (value) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

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
    breaks: true,
    headerIds: true,
    tables: true,
    langPrefix: 'hljs language-',
    highlight: function (code, lang) {
      if (typeof hljs === 'undefined') {
        return escapeHtml(code);
      }
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      // Avoid expensive auto-detection for unknown languages.
      return escapeHtml(code);
    }
  });
  markedLib.use({ renderer: customRenderer });
} else {
  console.error('Marked.js failed to load. Preview rendering is unavailable.');
}

let untouchedSampleContent = null;

function isUntouchedSampleContent(content = markdownInput.value) {
  return untouchedSampleContent !== null && content === untouchedSampleContent;
}

function clearUntouchedSampleContentFlagIfEdited(content = markdownInput.value) {
  if (untouchedSampleContent !== null && content !== untouchedSampleContent) {
    untouchedSampleContent = null;
  }
}

function saveSnapshotIfNeeded(content) {
  if (isUntouchedSampleContent(content)) return;
  saveSnapshot(content);
}

function renderAndPersistDraft() {
  const content = markdownInput.value;
  clearUntouchedSampleContentFlagIfEdited(content);
  renderContent();
  if (!isUntouchedSampleContent(content)) {
    saveDraft(content);
  }
  updateDirtyIndicator(dirtyIndicator, isDirty(content));
}

function persistDraftAndDirtyState() {
  const content = markdownInput.value;
  clearUntouchedSampleContentFlagIfEdited(content);
  if (!isUntouchedSampleContent(content)) {
    saveDraft(content);
  }
  updateDirtyIndicator(dirtyIndicator, isDirty(content));
}

/**
 * Fetch and load the sample Markdown document
 */
async function loadSampleDocument() {
  if (markdownInput.value.trim() !== '') {
    const confirmed = await showConfirmationModal(
      'This will open a sample document and replace your current content. Any unsaved changes will be lost.',
      { isSuppressed: isSampleWarningSuppressed, saveSuppressed: saveSampleWarningSuppressed }
    );
    if (!confirmed) return;
  }
  saveSnapshotIfNeeded(markdownInput.value);
  fetch('/tools/markdown_editor/sample_doc.md')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.text();
    })
    .then(data => {
      markdownInput.value = data;
      untouchedSampleContent = data;
      markContentExported(data);
      renderContent();
      clearDraft();
      updateDirtyIndicator(dirtyIndicator, false);
    })
    .catch(error => {
      console.error('Error loading sample document:', error);
      alert('Failed to load the sample document.');
    });
}


const mathTemplatePaths = {
  basic: '/tools/markdown_editor/templates/math-basic.md',
  calculus: '/tools/markdown_editor/templates/math-calculus.md',
  matrices: '/tools/markdown_editor/templates/math-matrices.md',
  table: '/tools/markdown_editor/templates/math-table.md'
};

function openMathPanel() {
  if (!mathPanel || !mathButton) return;
  mathPanel.hidden = false;
  mathButton.setAttribute('aria-expanded', 'true');
}

function closeMathPanel() {
  if (!mathPanel || !mathButton) return;
  mathPanel.hidden = true;
  mathButton.setAttribute('aria-expanded', 'false');
}

function toggleMathPanel() {
  if (!mathPanel) return;
  if (mathPanel.hidden) {
    closeFontPanel();
    openMathPanel();
    return;
  }
  closeMathPanel();
}

// ---- Font panel ----
function openFontPanel() {
  if (!fontPanel || !fontButton) return;
  fontPanel.hidden = false;
  fontButton.setAttribute('aria-expanded', 'true');
}

function closeFontPanel() {
  if (!fontPanel || !fontButton) return;
  fontPanel.hidden = true;
  fontButton.setAttribute('aria-expanded', 'false');
}

function toggleFontPanel() {
  if (!fontPanel) return;
  if (fontPanel.hidden) {
    closeMathPanel();
    openFontPanel();
    return;
  }
  closeFontPanel();
}

function updateFontPanelActiveState(activeSize) {
  if (!fontPanel) return;
  fontPanel.querySelectorAll('.font-option-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.size === activeSize);
  });
}

// ---------------------------------------------------------------------- //
// File System Access API detection (used by save / open)                   //
// ---------------------------------------------------------------------- //
const CAN_OPEN_WITH_FSA = typeof window.showOpenFilePicker === 'function';
const CAN_SAVE_WITH_FSA = typeof window.showSaveFilePicker === 'function';

function insertTextAtCursor(textToInsert, { insertAtCursorOnBlankLine = false } = {}) {
  const inputValue = markdownInput.value;
  const caretPosition = Number.isInteger(markdownInput.selectionStart)
    ? markdownInput.selectionStart
    : inputValue.length;
  const normalizedText = String(textToInsert || '').replace(/^\n+/, '');

  if (!normalizedText) return;

  const lineEndIndex = inputValue.indexOf('\n', caretPosition);
  const currentLineEndIndex = lineEndIndex === -1 ? inputValue.length : lineEndIndex;
  let insertionPoint = currentLineEndIndex;
  let insertionText = `\n${normalizedText}`;

  if (insertAtCursorOnBlankLine) {
    const previousNewlineIndex = inputValue.lastIndexOf('\n', Math.max(0, caretPosition - 1));
    const lineStartIndex = previousNewlineIndex + 1;
    const currentLineText = inputValue.slice(lineStartIndex, currentLineEndIndex);
    if (currentLineText.trim() === '') {
      insertionPoint = caretPosition;
      insertionText = normalizedText;
    }
  }

  markdownInput.value = `${inputValue.slice(0, insertionPoint)}${insertionText}${inputValue.slice(insertionPoint)}`;

  const cursorPosition = insertionPoint + insertionText.length;
  markdownInput.focus();
  markdownInput.selectionStart = cursorPosition;
  markdownInput.selectionEnd = cursorPosition;

  renderAndPersistDraft();
}

function insertMathTemplate(templateKey) {
  const selectedTemplate = templateKey || 'basic';
  const templatePath = mathTemplatePaths[selectedTemplate] || mathTemplatePaths.basic;

  fetch(templatePath)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.text();
    })
    .then(data => {
      insertTextAtCursor(data, { insertAtCursorOnBlankLine: true });
      closeMathPanel();
    })
    .catch(error => {
      console.error('Error loading math template:', error);
      alert('Failed to load the selected math template.');
    });
}

function getImageAlignmentStyle(align) {
  if (align === 'left') return 'text-align: left;';
  if (align === 'right') return 'text-align: right;';
  return 'text-align: center;';
}

function buildImageHtmlTag({ url, align, width }) {
  const safeUrl = escapeHtml(url);
  const normalizedWidth = Number.isFinite(width)
    ? Math.min(100, Math.max(5, width))
    : 60;

  const paragraphStyle = getImageAlignmentStyle(align);
  const imageStyle = `width: ${normalizedWidth}%; height: auto;`;
  return `<p style="${paragraphStyle}"><img src="${safeUrl}" alt="" style="${imageStyle}" /></p>`;
}

async function insertImageFromModal() {
  const imageData = await showImageModal();
  if (!imageData) return;
  const imageTag = buildImageHtmlTag(imageData);
  insertTextAtCursor(imageTag, { insertAtCursorOnBlankLine: true });
}

/**
 * Render the markdown content to the output pane
 */
function renderContent() {
  const currentRenderCycle = ++renderCycleId;
  const inputText = markdownInput.value;
  if (!markedLib || typeof DOMPurify === 'undefined') {
    clearSyncAnchorMap();
    renderedOutput.innerHTML = `
      <p>Preview unavailable: required libraries failed to load.</p>
    `;
    return;
  }

  const preprocessedText = preprocessMarkdown(inputText);
  const parsedMarkdown = markedLib.parse(preprocessedText);
  const sanitizedContent = DOMPurify.sanitize(parsedMarkdown);
  dismissTableCopyActions();
  renderedOutput.innerHTML = sanitizedContent;

  const syncPreviewScrollToInput = () => {
    if (!state.isSyncScrollEnabled) return;
    syncInputToOutput();
  };

  const finalizeRender = () => {
    if (currentRenderCycle !== renderCycleId) return;
    restoreEscapedDollarPlaceholders(renderedOutput);
    scheduleSyncAnchorMapRebuild(inputText, currentRenderCycle);
    syncPreviewScrollToInput();
  };

  if (window.MathJax && typeof MathJax.typesetPromise === 'function') {
    MathJax.typesetPromise([renderedOutput])
      .catch(console.error)
      .finally(finalizeRender);
  } else {
    finalizeRender();
  }
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
  dismissTableCopyActions();

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
let laserRenderRafId = 0;

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
  if (laserEnabled) {
    laserRenderRafId = requestAnimationFrame(renderLaserTail);
  } else {
    laserRenderRafId = 0;
  }
}

function startLaserRendering() {
  if (!laserCanvas || !laserContext) return;
  if (laserRenderRafId) return;
  laserRenderRafId = requestAnimationFrame(renderLaserTail);
}

function stopLaserRendering() {
  if (laserRenderRafId) {
    cancelAnimationFrame(laserRenderRafId);
    laserRenderRafId = 0;
  }
  if (laserCanvas && laserContext) {
    laserContext.clearRect(0, 0, laserCanvas.width, laserCanvas.height);
  }
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
    startLaserRendering();
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
  stopLaserRendering();
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
  const content = markdownInput.value;

  if (CAN_SAVE_WITH_FSA) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'document.md',
        types: [{
          description: 'Markdown',
          accept: { 'text/markdown': ['.md'] }
        }]
      });

      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();

      // Store the parent directory as working folder for image insertion
      // (only possible if the handle exposes the parent via resolve)
      // Not available from showSaveFilePicker, so we skip this.

      markContentExported(content);
      updateDirtyIndicator(dirtyIndicator, false);
      return;
    } catch (err) {
      if (err.name === 'AbortError') return; // user cancelled
      console.error('Save with File System Access API failed; using download fallback.', err);
    }
  }

  const fileName = await showFilenameModal('document.md', 'Save Markdown');
  if (!fileName) return;

  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);

  markContentExported(content);
  updateDirtyIndicator(dirtyIndicator, false);
}

/**
 * Load a markdown file from the user's computer
 */
async function loadMarkdownFile() {
  if (markdownInput.value.trim() !== '') {
    const confirmed = await showConfirmationModal(
      'Opening a file will replace your current content. Any unsaved changes will be lost.',
      { isSuppressed: isOpenWarningSuppressed, saveSuppressed: saveOpenWarningSuppressed }
    );
    if (!confirmed) return;
  }

  if (CAN_OPEN_WITH_FSA) {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'Markdown',
          accept: { 'text/markdown': ['.md'] }
        }]
      });
      const file = await fileHandle.getFile();
      saveSnapshotIfNeeded(markdownInput.value);
      markdownInput.value = await file.text();
      untouchedSampleContent = null;
      markContentExported(markdownInput.value);
      renderContent();
      saveDraft(markdownInput.value);
      updateDirtyIndicator(dirtyIndicator, false);
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Open with File System Access API failed; using file-input fallback.', err);
    }
  }

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.md,text/markdown';
  input.onchange = e => {
    const file = e.target.files[0];
    if (file) {
      saveSnapshotIfNeeded(markdownInput.value);
      const reader = new FileReader();
      reader.onload = event => {
        markdownInput.value = event.target.result;
        untouchedSampleContent = null;
        markContentExported(markdownInput.value);
        renderContent();
        saveDraft(markdownInput.value);
        updateDirtyIndicator(dirtyIndicator, false);
      };
      reader.readAsText(file);
    }
  };
  input.click();
}

// ---------------------------------------------------------------------- //
// Sync Scroll                                                              //
// ---------------------------------------------------------------------- //
// Setup event listeners
let queuedInputRenderRafId = 0;

const debouncedPersistDraft = debounce(() => {
  persistDraftAndDirtyState();
}, 200);
const debouncedSyncAnchorMapRebuild = debounce(() => {
  scheduleSyncAnchorMapRebuild(markdownInput.value, renderCycleId);
}, SYNC_ANCHOR_REBUILD_DELAY_MS);

markdownInput.addEventListener('input', () => {
  if (!queuedInputRenderRafId) {
    queuedInputRenderRafId = requestAnimationFrame(() => {
      queuedInputRenderRafId = 0;
      const content = markdownInput.value;
      clearUntouchedSampleContentFlagIfEdited(content);
      renderContent();
    });
  }
  debouncedPersistDraft();
});
markdownInput.addEventListener('scroll', syncInputToOutput, { passive: true });
renderedOutput.addEventListener('scroll', syncOutputToInput, { passive: true });

renderedOutput.addEventListener('mouseover', event => {
  if (!isInFullscreen()) {
    handleCopyHover(event);
  }
});

renderedOutput.addEventListener('mouseout', event => {
  if (!isInFullscreen()) {
    handleCopyHoverOut(event);
  }
});

renderedOutput.addEventListener('click', event => {
  // Disable click-to-copy while presenting
  if (!isInFullscreen()) {
    handleCopyClick(event);
  } else {
    dismissTableCopyActions();
  }
});

printButton.addEventListener('click', printToPDF);
exportHTMLButton.addEventListener('click', exportHTML);
presentButton.addEventListener('click', togglePresentMode);
saveMDButton.addEventListener('click', saveMarkdown);
loadFileButton.addEventListener('click', loadMarkdownFile);
loadSampleButton.addEventListener('click', loadSampleDocument);

if (mathButton) {
  mathButton.addEventListener('click', event => {
    event.stopPropagation();
    toggleMathPanel();
  });
}

if (mathPanel) {
  mathPanel.addEventListener('click', event => {
    const btn = event.target.closest('.math-template-btn');
    if (btn) {
      insertMathTemplate(btn.dataset.template);
    }
  });
}

// Font panel toggle
if (fontButton) {
  fontButton.addEventListener('click', event => {
    event.stopPropagation();
    toggleFontPanel();
  });
}

if (fontPanel) {
  fontPanel.addEventListener('click', event => {
    const btn = event.target.closest('.font-option-btn');
    if (btn) {
      applyFontSize(btn.dataset.size);
      updateFontPanelActiveState(btn.dataset.size);
      debouncedSyncAnchorMapRebuild();
      closeFontPanel();
    }
  });
}

if (imageButton) {
  imageButton.addEventListener('click', async event => {
    event.stopPropagation();
    closeMathPanel();
    closeFontPanel();
    await insertImageFromModal();
  });
}

// Close panels when clicking outside
document.addEventListener('click', event => {
  if (mathMenu && mathPanel && !mathPanel.hidden && !mathMenu.contains(event.target)) {
    closeMathPanel();
  }
  if (fontMenu && fontPanel && !fontPanel.hidden && !fontMenu.contains(event.target)) {
    closeFontPanel();
  }
});

clearButton.addEventListener('click', async () => {
  if (markdownInput.value.trim() === '') {
    return;
  }
  const confirmed = await showConfirmationModal(
    'This will clear all your current content. Any unsaved changes will be lost.'
  );
  if (!confirmed) return;
  saveSnapshotIfNeeded(markdownInput.value);
  markdownInput.value = '';
  untouchedSampleContent = null;
  markContentExported('');
  clearDraft();
  renderContent();
  updateDirtyIndicator(dirtyIndicator, false);
});

// History button — open snapshot browser
if (historyButton) {
  historyButton.addEventListener('click', async () => {
    const snapshots = loadSnapshots();
    const restored = await showHistoryModal(snapshots);
    if (restored !== null) {
      markdownInput.value = restored;
      renderAndPersistDraft();
    }
  });
}

themeToggleButton.addEventListener('click', () => {
  toggleTheme();
  updateMobileThemeToggle();
});

syncScrollToggle.addEventListener('change', event => {
  const enabled = event.target.checked;
  saveSyncScrollPreference(enabled);
  if (enabled) {
    clearPendingSyncAnchorRebuild();
    buildSyncAnchorMap(markdownInput.value, renderCycleId);
    syncInputToOutput();
  } else {
    clearPendingSyncAnchorRebuild();
    clearSyncAnchorMap();
  }
});

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
window.addEventListener('resize', debouncedSyncAnchorMapRebuild);


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
  dismissTableCopyActions();
  updatePresentButtonLabel();
  updatePresentThemeIcon();
  if (!isInFullscreen()) disableLaser();
});
document.addEventListener('webkitfullscreenchange', () => {
  dismissTableCopyActions();
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
  debouncedSyncAnchorMapRebuild();
});

// Initialize the application
updateOfflineFontState();
initializeTheme();
initializeSyncScrollToggle(syncScrollToggle);
initializeFontSize(fontPanel, updateFontPanelActiveState);
updatePresentButtonLabel();
updatePresentThemeIcon();
initMobileLayout();
if (laserCanvas && laserContext) {
  resizeLaserCanvas();
  window.addEventListener('resize', resizeLaserCanvas);
}

// Restore draft and render
const savedDraft = restoreDraft();
if (savedDraft !== null) {
  markdownInput.value = savedDraft;
}
renderContent();

// Dirty-state indicator on load (never exported yet, so show if non-empty)
updateDirtyIndicator(dirtyIndicator, isDirty(markdownInput.value));

// ---------------------------------------------------------------------- //
// Auto-save snapshots every 5 minutes                                     //
// ---------------------------------------------------------------------- //
const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => {
  saveSnapshotIfNeeded(markdownInput.value);
}, SNAPSHOT_INTERVAL_MS);

// Also snapshot right before leaving the page
window.addEventListener('beforeunload', (e) => {
  saveSnapshotIfNeeded(markdownInput.value);

  // Warn if there are unsaved changes
  if (isDirty(markdownInput.value)) {
    e.preventDefault();
    e.returnValue = '';
  }
});
