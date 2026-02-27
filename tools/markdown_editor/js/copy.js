/**
 * Copy-to-clipboard module for the Markdown Editor
 * Handles copying equations and tables
 */

import { isTouchInteractionMode } from './ui.js';

const EQUATION_PNG_BASE_SCALE = 4;
const EQUATION_PNG_MAX_CANVAS_SIDE = 8192;
const EQUATION_PNG_MAX_PIXELS = 16_777_216; // 16 MP safety cap
const TABLE_IMAGE_PADDING_PX = 8;
const TABLE_COPY_ACTION_OFFSET_PX = 8;
const TABLE_COPY_ACTION_HIDE_DELAY_MS = 120;
const LIGHT_COPY_TEXT_COLOR = '#000000';
const LIGHT_COPY_BG_COLOR = '#ffffff';
const LIGHT_COPY_HEADER_BG_COLOR = '#f4f6f8';

let tableCopyActionsMenu = null;
let activeMathTable = null;
let tableCopyActionsHideTimeoutId = 0;
let touchCopyActionsMenu = null;
let activeTouchCopyTarget = null;
let activeTouchCopyTargetType = null;
let touchCopyTableButton = null;
let touchCopyImageButton = null;
let touchCopyWarning = null;
const tableMathDetectionCache = new WeakMap();

function getEquationRasterScale(widthPx, heightPx) {
  const safeWidth = Math.max(1, widthPx);
  const safeHeight = Math.max(1, heightPx);
  const dpr = Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio : 1;
  const requestedScale = Math.max(EQUATION_PNG_BASE_SCALE, Math.ceil(dpr * 2));

  const maxScaleBySide = Math.min(
    EQUATION_PNG_MAX_CANVAS_SIDE / safeWidth,
    EQUATION_PNG_MAX_CANVAS_SIDE / safeHeight
  );
  const maxScaleByPixels = Math.sqrt(EQUATION_PNG_MAX_PIXELS / (safeWidth * safeHeight));

  return Math.max(1, Math.min(requestedScale, maxScaleBySide, maxScaleByPixels));
}

function hasMathDelimiters(text) {
  if (!text || !text.includes('$')) return false;

  const isCurrencyLike = value => {
    const trimmed = value.trim();
    if (!/^\d/.test(trimmed)) {
      return false;
    }

    const currencyAbbreviation = /\b(?:aud|brl|cad|chf|cny|dkk|eur|gbp|hkd|inr|jpy|krw|mxn|nok|sek|sgd|usd|zar)\b/i;

    if (currencyAbbreviation.test(trimmed)) {
      return true;
    }

    if (/^\d+(?:[.,]\d+)?\s+[A-Za-z]/.test(trimmed)) {
      return true;
    }

    return /^\d+(?:[.,]\d+)?\s*[\/-]\s*[A-Za-z]/.test(trimmed);
  };

  const isEscaped = (value, index) => {
    let slashCount = 0;
    for (let i = index - 1; i >= 0 && value[i] === '\\'; i -= 1) {
      slashCount += 1;
    }
    return slashCount % 2 === 1;
  };

  let i = 0;
  while (i < text.length) {
    if (text[i] !== '$' || isEscaped(text, i)) {
      i += 1;
      continue;
    }

    const isDisplay = text[i + 1] === '$' && !isEscaped(text, i + 1);
    const delimiter = isDisplay ? '$$' : '$';
    const start = i + delimiter.length;
    let searchIndex = start;
    let closingIndex = -1;

    while (searchIndex < text.length) {
      if (text.startsWith(delimiter, searchIndex) && !isEscaped(text, searchIndex)) {
        closingIndex = searchIndex;
        break;
      }
      searchIndex += 1;
    }

    if (closingIndex === -1) {
      i += delimiter.length;
      continue;
    }

    const content = text.slice(start, closingIndex).trim();
    if (!isDisplay && isCurrencyLike(content)) {
      i = closingIndex + delimiter.length;
      continue;
    }
    if (content.length > 0) {
      return true;
    }

    i = closingIndex + delimiter.length;
  }

  return false;
}

function tableContainsMath(table) {
  if (!table) return false;
  if (tableMathDetectionCache.has(table)) {
    return tableMathDetectionCache.get(table);
  }

  const hasMath = table.querySelector('mjx-container')
    ? true
    : hasMathDelimiters(table.textContent || '');
  tableMathDetectionCache.set(table, hasMath);
  return hasMath;
}

function markTableMathHint(table) {
  const hasMath = tableContainsMath(table);
  table.classList.toggle('math-copy-table', hasMath);
  return hasMath;
}

function clearPendingTableCopyActionsHide() {
  if (!tableCopyActionsHideTimeoutId) return;
  window.clearTimeout(tableCopyActionsHideTimeoutId);
  tableCopyActionsHideTimeoutId = 0;
}

/**
 * Parse SVG viewBox attribute
 * @param {SVGElement} svg - The SVG element
 * @returns {{x: number, y: number, width: number, height: number}|null} The parsed viewBox or null
 */
function parseViewBox(svg) {
  const attr = svg.getAttribute('viewBox');
  if (attr) {
    const parts = attr.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite)) {
      return {
        x: parts[0],
        y: parts[1],
        width: parts[2],
        height: parts[3]
      };
    }
  }

  if (svg.viewBox && svg.viewBox.baseVal) {
    const vb = svg.viewBox.baseVal;
    if ([vb.x, vb.y, vb.width, vb.height].every(Number.isFinite)) {
      return {
        x: vb.x,
        y: vb.y,
        width: vb.width,
        height: vb.height
      };
    }
  }

  return null;
}

function collectReferencedSvgIds(element) {
  const ids = new Set();
  element.querySelectorAll('use').forEach(use => {
    const href = use.getAttribute('href') || use.getAttribute('xlink:href');
    if (href && href.startsWith('#')) {
      ids.add(href.slice(1));
    }
  });
  return ids;
}

function hasElementWithId(root, id) {
  if (!root || !id) return false;
  if (window.CSS && typeof CSS.escape === 'function') {
    return Boolean(root.querySelector(`#${CSS.escape(id)}`));
  }
  const escaped = id.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return Boolean(root.querySelector(`[id="${escaped}"]`));
}

function inlineReferencedSvgDefs(svgRoot, lookupRoot = document) {
  let defsRoot = svgRoot.querySelector('defs');
  if (!defsRoot) {
    defsRoot = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svgRoot.insertBefore(defsRoot, svgRoot.firstChild);
  }

  const processedIds = new Set();
  const pendingIds = collectReferencedSvgIds(svgRoot);

  while (pendingIds.size > 0) {
    const id = pendingIds.values().next().value;
    pendingIds.delete(id);

    if (processedIds.has(id)) continue;
    processedIds.add(id);

    if (hasElementWithId(defsRoot, id)) continue;

    const original = lookupRoot.getElementById(id);
    if (!original) continue;

    const clonedDef = original.cloneNode(true);
    defsRoot.appendChild(clonedDef);

    const nestedIds = collectReferencedSvgIds(clonedDef);
    nestedIds.forEach(nestedId => {
      if (!processedIds.has(nestedId)) {
        pendingIds.add(nestedId);
      }
    });
  }
}

/**
 * Prepare equation SVG for copying
 * @param {SVGElement} svg - The original SVG element
 * @returns {{svgString: string, widthPx: number, heightPx: number}|null} Prepared SVG data or null
 */
function prepareEquationSvg(svg) {
  // Clone the SVG to avoid modifying the original
  const svgClone = svg.cloneNode(true);

  // MathJax uses global defs; inline referenced glyphs for standalone copy.
  inlineReferencedSvgDefs(svgClone);

  const paddingPx = 8;
  const rect = svg.getBoundingClientRect();
  const hasRectSize = rect.width > 0 && rect.height > 0;

  const viewBox = parseViewBox(svg);
  let viewBoxX = 0;
  let viewBoxY = 0;
  let viewBoxWidth = rect.width || 0;
  let viewBoxHeight = rect.height || 0;

  if (viewBox) {
    ({ x: viewBoxX, y: viewBoxY, width: viewBoxWidth, height: viewBoxHeight } = viewBox);
  } else {
    try {
      const bbox = svg.getBBox();
      if (Number.isFinite(bbox.width) && Number.isFinite(bbox.height)) {
        viewBoxX = bbox.x;
        viewBoxY = bbox.y;
        viewBoxWidth = bbox.width;
        viewBoxHeight = bbox.height;
      }
    } catch (err) {
      console.warn('getBBox failed for SVG:', err);
    }
  }

  if (!viewBoxWidth || !viewBoxHeight) {
    console.warn('Unable to determine equation bounds.');
    return null;
  }

  const scaleX = hasRectSize ? viewBoxWidth / rect.width : 1;
  const scaleY = hasRectSize ? viewBoxHeight / rect.height : 1;
  const paddingX = paddingPx * scaleX;
  const paddingY = paddingPx * scaleY;

  const outputViewBox = {
    x: viewBoxX - paddingX,
    y: viewBoxY - paddingY,
    width: viewBoxWidth + paddingX * 2,
    height: viewBoxHeight + paddingY * 2
  };

  const widthPx = Math.max((hasRectSize ? rect.width : viewBoxWidth) + paddingPx * 2, 20);
  const heightPx = Math.max((hasRectSize ? rect.height : viewBoxHeight) + paddingPx * 2, 20);

  svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  svgClone.setAttribute('width', `${widthPx}px`);
  svgClone.setAttribute('height', `${heightPx}px`);
  svgClone.setAttribute(
    'viewBox',
    `${outputViewBox.x} ${outputViewBox.y} ${outputViewBox.width} ${outputViewBox.height}`
  );
  svgClone.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  svgClone.style.backgroundColor = 'transparent';
  svgClone.removeAttribute('style');

  const fallbackColor = '#000000';
  const normalizePaintValue = (paint) => {
    if (!paint) return null;
    const normalized = paint.toLowerCase().replace(/\s+/g, '');
    if (normalized === 'none' || normalized === 'transparent' || normalized === 'rgba(0,0,0,0)') {
      return 'none';
    }
    if (normalized === 'currentcolor') {
      return fallbackColor;
    }
    return paint;
  };

  const originalPaintElements = Array.from(
    svg.querySelectorAll('path, use, text, tspan, ellipse, circle, polygon, polyline, line, rect')
  ).filter(el => !el.closest('defs'));
  const clonedPaintElements = Array.from(
    svgClone.querySelectorAll('path, use, text, tspan, ellipse, circle, polygon, polyline, line, rect')
  ).filter(el => !el.closest('defs'));

  // Always use black for non-none paint values so copies are light-theme
  clonedPaintElements.forEach((cloneEl, index) => {
    const originalEl = originalPaintElements[index];
    if (!originalEl) return;

    const computed = getComputedStyle(originalEl);
    const fill = normalizePaintValue(computed.fill);
    const stroke = normalizePaintValue(computed.stroke);

    if (fill && fill !== 'none') {
      cloneEl.setAttribute('fill', fallbackColor);
    } else if (fill === 'none') {
      cloneEl.setAttribute('fill', 'none');
    }

    if (stroke && stroke !== 'none') {
      cloneEl.setAttribute('stroke', fallbackColor);
      const strokeWidth = computed.strokeWidth;
      if (strokeWidth && strokeWidth !== '0px') {
        cloneEl.setAttribute('stroke-width', strokeWidth);
      }
    }
  });

  svgClone.setAttribute('color', fallbackColor);

  const svgString = new XMLSerializer().serializeToString(svgClone);

  return {
    svgString,
    widthPx,
    heightPx
  };
}

/**
 * Rasterize SVG to PNG blob
 * @param {string} svgString - The SVG string
 * @param {number} widthPx - Width in pixels
 * @param {number} heightPx - Height in pixels
 * @returns {Promise<Blob|null>} PNG blob or null
 */
async function rasterizeSvgToPng(svgString, widthPx, heightPx) {
  try {
    const scale = getEquationRasterScale(widthPx, heightPx);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = Math.ceil(widthPx * scale);
    canvas.height = Math.ceil(heightPx * scale);

    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
    const svgObjectUrl = URL.createObjectURL(svgBlob);

    const pngBlob = await new Promise(resolve => {
      img.onload = () => {
        URL.revokeObjectURL(svgObjectUrl);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => resolve(blob), 'image/png');
      };

      img.onerror = err => {
        URL.revokeObjectURL(svgObjectUrl);
        console.warn('SVG rasterization failed:', err);
        resolve(null);
      };

      img.src = svgObjectUrl;
    });

    return pngBlob || null;
  } catch (err) {
    console.warn('Failed to rasterize SVG:', err);
    return null;
  }
}

function styleTableCloneForCopy(tableClone, tableWidth) {
  const forceLightSvgPaint = (svg) => {
    const normalizePaint = (value) => {
      if (!value) return null;
      const normalized = value.trim().toLowerCase();
      if (
        normalized === 'none'
        || normalized === 'transparent'
        || normalized === 'rgba(0,0,0,0)'
        || normalized.startsWith('url(')
      ) {
        return 'none';
      }
      return LIGHT_COPY_TEXT_COLOR;
    };

    svg.querySelectorAll('path, use, text, tspan, ellipse, circle, polygon, polyline, line, rect')
      .forEach(element => {
        const fillAttr = normalizePaint(element.getAttribute('fill'));
        if (fillAttr && fillAttr !== 'none') {
          element.setAttribute('fill', LIGHT_COPY_TEXT_COLOR);
        }

        const strokeAttr = normalizePaint(element.getAttribute('stroke'));
        if (strokeAttr && strokeAttr !== 'none') {
          element.setAttribute('stroke', LIGHT_COPY_TEXT_COLOR);
        }

        if (element.style.fill && normalizePaint(element.style.fill) !== 'none') {
          element.style.fill = LIGHT_COPY_TEXT_COLOR;
        }
        if (element.style.stroke && normalizePaint(element.style.stroke) !== 'none') {
          element.style.stroke = LIGHT_COPY_TEXT_COLOR;
        }
      });

    svg.setAttribute('color', LIGHT_COPY_TEXT_COLOR);
    svg.style.color = LIGHT_COPY_TEXT_COLOR;
  };

  tableClone.classList.remove('copied', 'copy-failed', 'table-copy-actions-open', 'math-copy-table');
  tableClone.style.borderCollapse = 'collapse';
  tableClone.style.fontFamily = 'Arial, sans-serif';
  tableClone.style.fontSize = '12pt';
  tableClone.style.color = LIGHT_COPY_TEXT_COLOR;
  tableClone.style.background = LIGHT_COPY_BG_COLOR;
  tableClone.style.width = `${tableWidth}px`;
  tableClone.style.margin = '0';
  tableClone.style.boxShadow = 'none';

  tableClone.querySelectorAll('th').forEach(cell => {
    cell.style.border = '1px solid black';
    cell.style.padding = '8px';
    cell.style.color = LIGHT_COPY_TEXT_COLOR;
    cell.style.background = LIGHT_COPY_HEADER_BG_COLOR;
  });

  tableClone.querySelectorAll('td').forEach(cell => {
    cell.style.border = '1px solid black';
    cell.style.padding = '8px';
    cell.style.color = LIGHT_COPY_TEXT_COLOR;
    cell.style.background = LIGHT_COPY_BG_COLOR;
  });

  tableClone.querySelectorAll('th *, td *').forEach(node => {
    if (!(node instanceof HTMLElement)) return;
    node.style.color = LIGHT_COPY_TEXT_COLOR;
  });

  // Force code blocks and inline code to light-theme styling in copied images.
  tableClone.querySelectorAll('pre').forEach(pre => {
    pre.style.background = '#f6f8fa';
    pre.style.color = LIGHT_COPY_TEXT_COLOR;
    pre.style.border = '1px solid #d0d7de';
    pre.style.boxShadow = 'none';
  });

  tableClone.querySelectorAll('code').forEach(code => {
    const isBlockCode = Boolean(code.closest('pre'));
    code.style.color = LIGHT_COPY_TEXT_COLOR;
    code.style.background = isBlockCode ? 'transparent' : '#f1f3f5';
    if (!isBlockCode) {
      code.style.padding = '0.1em 0.3em';
      code.style.borderRadius = '4px';
    }
  });

  tableClone.querySelectorAll('.hljs, .hljs *').forEach(node => {
    if (!(node instanceof HTMLElement)) return;
    node.style.background = 'transparent';
    node.style.color = LIGHT_COPY_TEXT_COLOR;
  });

  tableClone.querySelectorAll('mjx-container').forEach(container => {
    container.style.color = LIGHT_COPY_TEXT_COLOR;
    container.style.background = 'transparent';
  });

  tableClone.querySelectorAll('svg').forEach(svg => {
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    forceLightSvgPaint(svg);
    inlineReferencedSvgDefs(svg);
  });
}

function getHtml2Canvas() {
  if (typeof window !== 'undefined' && typeof window.html2canvas === 'function') {
    return window.html2canvas;
  }
  return null;
}

async function rasterizeTableWithHtml2Canvas(table) {
  const html2canvas = getHtml2Canvas();
  if (!html2canvas) {
    return null;
  }

  const rect = table.getBoundingClientRect();
  const tableWidth = Math.max(
    1,
    Math.ceil(rect.width || table.scrollWidth || table.offsetWidth || 1)
  );

  const sandbox = document.createElement('div');
  sandbox.style.position = 'fixed';
  sandbox.style.left = '-99999px';
  sandbox.style.top = '0';
  sandbox.style.padding = `${TABLE_IMAGE_PADDING_PX}px`;
  sandbox.style.background = LIGHT_COPY_BG_COLOR;
  sandbox.style.color = LIGHT_COPY_TEXT_COLOR;
  sandbox.style.pointerEvents = 'none';
  sandbox.style.zIndex = '-1';
  sandbox.style.overflow = 'hidden';
  sandbox.style.boxShadow = 'none';
  sandbox.setAttribute('data-theme', 'light');

  const tableClone = table.cloneNode(true);
  styleTableCloneForCopy(tableClone, tableWidth);
  sandbox.appendChild(tableClone);
  document.body.appendChild(sandbox);

  try {
    const sandboxRect = sandbox.getBoundingClientRect();
    const widthPx = Math.max(1, Math.ceil(sandboxRect.width || tableWidth + TABLE_IMAGE_PADDING_PX * 2));
    const heightPx = Math.max(1, Math.ceil(sandboxRect.height || tableClone.offsetHeight + TABLE_IMAGE_PADDING_PX * 2));
    const scale = getEquationRasterScale(widthPx, heightPx);

    const canvas = await html2canvas(sandbox, {
      backgroundColor: '#ffffff',
      scale,
      useCORS: true,
      logging: false
    });

    return await new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob || null), 'image/png');
    });
  } catch (err) {
    console.warn('html2canvas table rasterization failed:', err);
    return null;
  } finally {
    if (sandbox.parentNode) {
      sandbox.parentNode.removeChild(sandbox);
    }
  }
}

function prepareTableSvgForImage(table) {
  const rect = table.getBoundingClientRect();
  const tableWidth = Math.max(
    1,
    Math.ceil(rect.width || table.scrollWidth || table.offsetWidth || 1)
  );
  const tableHeight = Math.max(
    1,
    Math.ceil(rect.height || table.scrollHeight || table.offsetHeight || 1)
  );

  const tableClone = table.cloneNode(true);
  styleTableCloneForCopy(tableClone, tableWidth);

  const wrapper = document.createElement('div');
  wrapper.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  wrapper.style.display = 'inline-block';
  wrapper.style.padding = `${TABLE_IMAGE_PADDING_PX}px`;
  wrapper.style.background = '#ffffff';
  wrapper.style.boxSizing = 'border-box';
  wrapper.appendChild(tableClone);

  const widthPx = tableWidth + TABLE_IMAGE_PADDING_PX * 2;
  const heightPx = tableHeight + TABLE_IMAGE_PADDING_PX * 2;
  const wrapperString = new XMLSerializer().serializeToString(wrapper);
  const svgString = `
<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}">
  <foreignObject x="0" y="0" width="${widthPx}" height="${heightPx}">
    ${wrapperString}
  </foreignObject>
</svg>`.trim();

  return {
    svgString,
    widthPx,
    heightPx
  };
}

async function rasterizeTableToPng(table) {
  const html2CanvasBlob = await rasterizeTableWithHtml2Canvas(table);
  if (html2CanvasBlob) {
    return html2CanvasBlob;
  }

  const preparedTable = prepareTableSvgForImage(table);
  return rasterizeSvgToPng(preparedTable.svgString, preparedTable.widthPx, preparedTable.heightPx);
}

function isTableCopyActionsVisible() {
  return Boolean(tableCopyActionsMenu && !tableCopyActionsMenu.hidden);
}

function positionCopyActionsMenu(menu, targetElement) {
  if (!menu || !targetElement) return;
  const rect = targetElement.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const menuRect = menu.getBoundingClientRect();
  const viewportPadding = 8;

  let left = rect.left + (rect.width / 2) - (menuRect.width / 2);
  left = Math.min(
    Math.max(left, viewportPadding),
    window.innerWidth - menuRect.width - viewportPadding
  );

  let top = rect.top - menuRect.height - TABLE_COPY_ACTION_OFFSET_PX;
  if (top < viewportPadding) {
    top = rect.bottom + TABLE_COPY_ACTION_OFFSET_PX;
  }

  menu.style.left = `${Math.round(left + window.scrollX)}px`;
  menu.style.top = `${Math.round(top + window.scrollY)}px`;
}

function positionTableCopyActionsMenu(table) {
  positionCopyActionsMenu(tableCopyActionsMenu, table);
}

async function runTableCopyAction(action) {
  if (!activeMathTable) return;
  const targetTable = activeMathTable;
  dismissTableCopyActions();

  let success = false;
  if (action === 'image') {
    success = await copyTableAsImageToClipboard(targetTable);
  } else {
    success = await copyTableToClipboard(targetTable);
  }

  if (success) {
    showCopyFeedback(targetTable);
  } else {
    showCopyFailedFeedback(targetTable);
  }
}

function scheduleTableCopyActionsHide() {
  clearPendingTableCopyActionsHide();
  tableCopyActionsHideTimeoutId = window.setTimeout(() => {
    dismissTableCopyActions();
  }, TABLE_COPY_ACTION_HIDE_DELAY_MS);
}

function ensureTableCopyActionsMenu() {
  if (tableCopyActionsMenu) {
    return tableCopyActionsMenu;
  }

  tableCopyActionsMenu = document.createElement('div');
  tableCopyActionsMenu.className = 'table-copy-actions';
  tableCopyActionsMenu.hidden = true;
  tableCopyActionsMenu.setAttribute('role', 'group');
  tableCopyActionsMenu.setAttribute('aria-label', 'Math table copy actions');

  const buttons = document.createElement('div');
  buttons.className = 'table-copy-actions-buttons';

  const copyTableButton = document.createElement('button');
  copyTableButton.type = 'button';
  copyTableButton.className = 'table-copy-action-btn table-copy-action-btn-table';
  copyTableButton.textContent = 'Copy table';

  const copyImageButton = document.createElement('button');
  copyImageButton.type = 'button';
  copyImageButton.className = 'table-copy-action-btn table-copy-action-btn-image';
  copyImageButton.textContent = 'Copy image';

  buttons.appendChild(copyTableButton);
  buttons.appendChild(copyImageButton);

  const warning = document.createElement('p');
  warning.className = 'table-copy-actions-warning';
  warning.textContent = 'Math symbols may not paste correctly';

  const setWarningVisible = (visible) => {
    warning.classList.toggle('visible', visible);
  };

  tableCopyActionsMenu.appendChild(buttons);
  tableCopyActionsMenu.appendChild(warning);
  document.body.appendChild(tableCopyActionsMenu);

  copyTableButton.addEventListener('click', async event => {
    event.preventDefault();
    event.stopPropagation();
    setWarningVisible(false);
    await runTableCopyAction('table');
  });

  copyImageButton.addEventListener('click', async event => {
    event.preventDefault();
    event.stopPropagation();
    setWarningVisible(false);
    await runTableCopyAction('image');
  });

  copyTableButton.addEventListener('mouseenter', () => setWarningVisible(true));
  copyTableButton.addEventListener('mouseleave', () => setWarningVisible(false));
  copyTableButton.addEventListener('focus', () => setWarningVisible(true));
  copyTableButton.addEventListener('blur', () => setWarningVisible(false));

  tableCopyActionsMenu.addEventListener('mouseenter', () => {
    clearPendingTableCopyActionsHide();
  });

  tableCopyActionsMenu.addEventListener('mouseleave', () => {
    setWarningVisible(false);
    scheduleTableCopyActionsHide();
  });

  document.addEventListener('pointerdown', event => {
    if (!isTableCopyActionsVisible()) return;
    if (tableCopyActionsMenu.contains(event.target)) return;
    if (activeMathTable && activeMathTable.contains(event.target)) return;
    setWarningVisible(false);
    dismissTableCopyActions();
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && isTableCopyActionsVisible()) {
      setWarningVisible(false);
      dismissTableCopyActions();
    }
  });

  window.addEventListener('resize', () => {
    if (!isTableCopyActionsVisible()) return;
    if (!activeMathTable) return;
    positionTableCopyActionsMenu(activeMathTable);
  });

  window.addEventListener('scroll', () => {
    if (isTableCopyActionsVisible()) {
      dismissTableCopyActions();
    }
  }, true);

  return tableCopyActionsMenu;
}

function showTableCopyActions(table) {
  const menu = ensureTableCopyActionsMenu();
  clearPendingTableCopyActionsHide();

  if (activeMathTable === table && isTableCopyActionsVisible()) {
    positionTableCopyActionsMenu(table);
    return;
  }

  if (activeMathTable && activeMathTable !== table) {
    activeMathTable.classList.remove('table-copy-actions-open');
  }

  activeMathTable = table;
  activeMathTable.classList.add('table-copy-actions-open');

  menu.hidden = false;
  menu.classList.add('visible');
  positionTableCopyActionsMenu(table);
}

function dismissDesktopTableCopyActions() {
  clearPendingTableCopyActionsHide();

  if (activeMathTable) {
    activeMathTable.classList.remove('table-copy-actions-open');
    activeMathTable = null;
  }

  if (tableCopyActionsMenu) {
    const warning = tableCopyActionsMenu.querySelector('.table-copy-actions-warning');
    if (warning) {
      warning.classList.remove('visible');
    }
    tableCopyActionsMenu.classList.remove('visible');
    tableCopyActionsMenu.hidden = true;
  }
}

export function dismissTableCopyActions() {
  dismissTouchCopyActions();
  dismissDesktopTableCopyActions();
}

function isTouchCopyActionsVisible() {
  return Boolean(touchCopyActionsMenu && !touchCopyActionsMenu.hidden);
}

function configureTouchCopyActionsMenu(targetType, hasMath) {
  if (!touchCopyActionsMenu || !touchCopyTableButton || !touchCopyImageButton || !touchCopyWarning) return;

  const canCopyTable = targetType === 'table';
  const canCopyImage = targetType === 'equation' || (targetType === 'table' && hasMath);
  const showWarning = targetType === 'table' && hasMath && canCopyTable;

  touchCopyTableButton.hidden = !canCopyTable;
  touchCopyImageButton.hidden = !canCopyImage;
  touchCopyWarning.hidden = !showWarning;
  touchCopyWarning.classList.toggle('visible', showWarning);
}

function positionTouchCopyActionsMenu(targetElement) {
  positionCopyActionsMenu(touchCopyActionsMenu, targetElement);
}

function dismissTouchCopyActions() {
  if (activeTouchCopyTarget) {
    activeTouchCopyTarget.classList.remove('touch-copy-target-active');
    activeTouchCopyTarget = null;
  }
  activeTouchCopyTargetType = null;

  if (!touchCopyActionsMenu) return;
  if (touchCopyWarning) {
    touchCopyWarning.classList.remove('visible');
    touchCopyWarning.hidden = true;
  }
  touchCopyActionsMenu.classList.remove('visible');
  touchCopyActionsMenu.hidden = true;
}

async function runTouchCopyAction(action) {
  if (!activeTouchCopyTarget || !activeTouchCopyTargetType) return;

  const target = activeTouchCopyTarget;
  const targetType = activeTouchCopyTargetType;
  dismissTouchCopyActions();

  let success = false;
  if (targetType === 'equation') {
    success = await copyEquationToClipboard(target);
  } else if (action === 'image') {
    success = await copyTableAsImageToClipboard(target);
  } else {
    success = await copyTableToClipboard(target);
  }

  if (success) {
    showCopyFeedback(target);
  } else {
    showCopyFailedFeedback(target);
  }
}

function ensureTouchCopyActionsMenu() {
  if (touchCopyActionsMenu) {
    return touchCopyActionsMenu;
  }

  touchCopyActionsMenu = document.createElement('div');
  touchCopyActionsMenu.className = 'table-copy-actions touch-copy-actions';
  touchCopyActionsMenu.hidden = true;
  touchCopyActionsMenu.setAttribute('role', 'group');
  touchCopyActionsMenu.setAttribute('aria-label', 'Copy actions');

  const buttons = document.createElement('div');
  buttons.className = 'table-copy-actions-buttons';

  touchCopyTableButton = document.createElement('button');
  touchCopyTableButton.type = 'button';
  touchCopyTableButton.className = 'table-copy-action-btn table-copy-action-btn-table';
  touchCopyTableButton.textContent = 'Copy table';

  touchCopyImageButton = document.createElement('button');
  touchCopyImageButton.type = 'button';
  touchCopyImageButton.className = 'table-copy-action-btn table-copy-action-btn-image';
  touchCopyImageButton.textContent = 'Copy image';

  buttons.appendChild(touchCopyTableButton);
  buttons.appendChild(touchCopyImageButton);

  touchCopyWarning = document.createElement('p');
  touchCopyWarning.className = 'table-copy-actions-warning';
  touchCopyWarning.textContent = 'Math symbols may not paste correctly';
  touchCopyWarning.hidden = true;

  touchCopyActionsMenu.appendChild(buttons);
  touchCopyActionsMenu.appendChild(touchCopyWarning);
  document.body.appendChild(touchCopyActionsMenu);

  touchCopyTableButton.addEventListener('click', async event => {
    event.preventDefault();
    event.stopPropagation();
    await runTouchCopyAction('table');
  });

  touchCopyImageButton.addEventListener('click', async event => {
    event.preventDefault();
    event.stopPropagation();
    await runTouchCopyAction('image');
  });

  document.addEventListener('pointerdown', event => {
    if (!isTouchCopyActionsVisible()) return;
    if (touchCopyActionsMenu && touchCopyActionsMenu.contains(event.target)) return;
    if (activeTouchCopyTarget && activeTouchCopyTarget.contains(event.target)) return;
    dismissTouchCopyActions();
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && isTouchCopyActionsVisible()) {
      dismissTouchCopyActions();
    }
  });

  window.addEventListener('resize', () => {
    if (!isTouchCopyActionsVisible()) return;
    if (!activeTouchCopyTarget) return;
    positionTouchCopyActionsMenu(activeTouchCopyTarget);
  });

  window.addEventListener('scroll', () => {
    if (isTouchCopyActionsVisible()) {
      dismissTouchCopyActions();
    }
  }, true);

  return touchCopyActionsMenu;
}

function showTouchCopyActions(targetElement, { targetType, hasMath = false } = {}) {
  if (!targetElement || !targetType) return;
  const menu = ensureTouchCopyActionsMenu();

  if (isTouchCopyActionsVisible()
      && activeTouchCopyTarget === targetElement
      && activeTouchCopyTargetType === targetType) {
    dismissTouchCopyActions();
    return;
  }

  if (activeTouchCopyTarget && activeTouchCopyTarget !== targetElement) {
    activeTouchCopyTarget.classList.remove('touch-copy-target-active');
  }

  activeTouchCopyTarget = targetElement;
  activeTouchCopyTargetType = targetType;
  activeTouchCopyTarget.classList.add('touch-copy-target-active');
  menu.setAttribute('aria-label', targetType === 'equation' ? 'Equation copy actions' : 'Table copy actions');
  configureTouchCopyActionsMenu(targetType, hasMath);

  menu.hidden = false;
  menu.classList.add('visible');
  positionTouchCopyActionsMenu(targetElement);
}

export function handleCopyHover(event) {
  if (isTouchInteractionMode()) return false;
  if (window.getSelection().toString()) return false;
  const table = event.target.closest('table');
  if (!table) return false;

  const hasMath = markTableMathHint(table);
  if (!hasMath) return false;

  showTableCopyActions(table);
  return true;
}

export function handleCopyHoverOut(event) {
  if (isTouchInteractionMode()) return false;
  if (!activeMathTable) return false;

  const exitedTable = event.target.closest('table');
  if (!exitedTable || exitedTable !== activeMathTable) return false;

  const nextTarget = event.relatedTarget;
  if (nextTarget && (activeMathTable.contains(nextTarget)
      || (tableCopyActionsMenu && tableCopyActionsMenu.contains(nextTarget)))) {
    return false;
  }

  scheduleTableCopyActionsHide();
  return true;
}

/**
 * Detect if running on Safari browser.
 * Safari has limited clipboard MIME type support (no image/svg+xml).
 * @returns {boolean} True if Safari
 */
function isSafari() {
  const ua = navigator.userAgent;
  // Safari has 'Safari' in UA but Chrome also has it, so exclude Chrome/Chromium
  return /Safari/.test(ua) && !/Chrome|Chromium|CriOS|Edg/.test(ua);
}

function canWriteClipboardItems() {
  return typeof ClipboardItem !== 'undefined'
    && Boolean(navigator.clipboard)
    && typeof navigator.clipboard.write === 'function';
}

function canWriteClipboardText() {
  return Boolean(navigator.clipboard)
    && typeof navigator.clipboard.writeText === 'function';
}

async function writePlainTextToClipboard(text) {
  const value = String(text ?? '');
  if (!value) return false;

  if (canWriteClipboardText()) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall through to legacy copy fallback.
    }
  }

  if (typeof document.execCommand !== 'function') {
    return false;
  }

  const textArea = document.createElement('textarea');
  textArea.value = value;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.left = '-99999px';
  textArea.style.top = '0';
  document.body.appendChild(textArea);
  textArea.select();
  textArea.selectionStart = 0;
  textArea.selectionEnd = textArea.value.length;

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }

  if (textArea.parentNode) {
    textArea.parentNode.removeChild(textArea);
  }
  return copied;
}

/**
 * Copy an equation (MathJax SVG) to clipboard as an image.
 *
 * Safari/iOS has strict clipboard requirements:
 * 1. Only supports image/png (not image/svg+xml)
 * 2. ClipboardItem must be created synchronously within user gesture
 * 3. Blob values can be Promises that resolve later
 *
 * @param {Element} mjxContainer - The MathJax container element
 * @returns {Promise<boolean>} Success status
 */
export async function copyEquationToClipboard(mjxContainer) {
  const svg = mjxContainer.querySelector('svg');
  if (!svg) return false;

  const preparedSvg = prepareEquationSvg(svg);
  if (!preparedSvg) return false;

  const { svgString, widthPx, heightPx } = preparedSvg;
  const plainTextFallback = (mjxContainer.textContent || '').trim();

  if (!canWriteClipboardItems()) {
    return writePlainTextToClipboard(plainTextFallback);
  }

  try {
    // Safari only supports text/plain, text/html, and image/png in ClipboardItem
    // Including image/svg+xml causes the entire clipboard write to fail on Safari
    // Additionally, Safari requires ClipboardItem to be created synchronously
    // within the user gesture, with blob values provided as Promises
    const useSafariCompatMode = isSafari();

    if (useSafariCompatMode) {
      // Safari: Create ClipboardItem synchronously with Promise-based blob
      // This maintains the user gesture context required by Safari
      const pngPromise = rasterizeSvgToPng(svgString, widthPx, heightPx).then(blob => {
        if (!blob) throw new Error('PNG rasterization failed');
        return blob;
      });

      const clipboardItem = new ClipboardItem({
        'image/png': pngPromise
      });

      await navigator.clipboard.write([clipboardItem]);
      return true;
    } else {
      // Non-Safari: Use direct blobs with both SVG and PNG formats
      const clipboardPayload = {};

      const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
      clipboardPayload['image/svg+xml'] = svgBlob;

      const pngBlob = await rasterizeSvgToPng(svgString, widthPx, heightPx);
      if (pngBlob) {
        clipboardPayload['image/png'] = pngBlob;
      }

      try {
        await navigator.clipboard.write([new ClipboardItem(clipboardPayload)]);
      } catch (writeError) {
        // Some browsers reject SVG in clipboard payloads; retry with PNG only.
        if (pngBlob) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
        } else {
          throw writeError;
        }
      }
      return true;
    }
  } catch (err) {
    console.error('Failed to copy equation as an image:', err);
    return writePlainTextToClipboard(plainTextFallback);
  }
}

/**
 * Copy a table to clipboard as an image.
 * @param {HTMLTableElement} table - The table element to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyTableAsImageToClipboard(table) {
  if (!canWriteClipboardItems()) {
    return copyTableToClipboard(table);
  }

  try {
    const useSafariCompatMode = isSafari();

    if (useSafariCompatMode) {
      const pngPromise = rasterizeTableToPng(table).then(blob => {
        if (!blob) throw new Error('Table PNG rasterization failed');
        return blob;
      });
      const clipboardItem = new ClipboardItem({
        'image/png': pngPromise
      });
      await navigator.clipboard.write([clipboardItem]);
      return true;
    }

    const pngBlob = await rasterizeTableToPng(table);
    if (!pngBlob) {
      return false;
    }

    const clipboardItem = new ClipboardItem({
      'image/png': pngBlob
    });
    await navigator.clipboard.write([clipboardItem]);
    return true;
  } catch (err) {
    console.error('Failed to copy table as image:', err);
    return copyTableToClipboard(table);
  }
}

/**
 * Copy a table as HTML to clipboard.
 * HTML format works well with MS Word.
 * @param {HTMLTableElement} table - The table element to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyTableToClipboard(table) {
  const tableClone = table.cloneNode(true);
  const plainText = table.innerText || table.textContent || '';

  // Add inline styles for better Word compatibility (always light theme)
  tableClone.style.borderCollapse = 'collapse';
  tableClone.style.fontFamily = 'Arial, sans-serif';
  tableClone.style.fontSize = '12pt';
  tableClone.style.color = '#000000';

  tableClone.querySelectorAll('th, td').forEach(cell => {
    cell.style.border = '1px solid black';
    cell.style.padding = '8px';
    cell.style.color = '#000000';
  });

  const htmlString = tableClone.outerHTML;

  if (canWriteClipboardItems()) {
    try {
      // Copy as HTML for better Word compatibility
      const blob = new Blob([htmlString], { type: 'text/html' });
      const clipboardItem = new ClipboardItem({
        'text/html': blob,
        'text/plain': new Blob([plainText], { type: 'text/plain' })
      });
      await navigator.clipboard.write([clipboardItem]);
      return true;
    } catch (err) {
      console.warn('HTML table copy failed; falling back to plain text.', err);
    }
  }

  return writePlainTextToClipboard(plainText);
}

/**
 * Show copy feedback animation on an element.
 * @param {Element} element - The element to show feedback on
 */
function showCopyFeedback(element) {
  element.classList.add('copied');
  setTimeout(() => {
    element.classList.remove('copied');
  }, 1500);
}

/**
 * Show copy failed feedback animation on an element.
 * @param {Element} element - The element to show feedback on
 */
function showCopyFailedFeedback(element) {
  element.classList.add('copy-failed');
  setTimeout(() => {
    element.classList.remove('copy-failed');
  }, 2000);
}

/**
 * Handle clicks on the rendered output for copy-to-clipboard functionality.
 * @param {MouseEvent} event - The click event
 */
export function handleCopyClick(event) {
  if (activeMathTable && (!event.target.closest('table') || !activeMathTable.contains(event.target))) {
    dismissDesktopTableCopyActions();
  }

  const touchMode = isTouchInteractionMode();

  // Check if clicked on a table (but not inside a cell for text selection)
  const table = event.target.closest('table');
  if (table && !window.getSelection().toString()) {
    event.preventDefault();

    const hasMath = markTableMathHint(table);
    if (touchMode) {
      dismissDesktopTableCopyActions();
      showTouchCopyActions(table, { targetType: 'table', hasMath });
      return true;
    }

    if (hasMath) {
      showTableCopyActions(table);
      return true;
    }

    dismissTableCopyActions();
    copyTableToClipboard(table).then(success => {
      if (success) {
        showCopyFeedback(table);
      } else {
        showCopyFailedFeedback(table);
      }
    });
    return true;
  }

  // Check if clicked on a MathJax container
  const mjxContainer = event.target.closest('mjx-container');
  if (mjxContainer) {
    event.preventDefault();
    event.stopPropagation();
    if (touchMode) {
      dismissDesktopTableCopyActions();
      showTouchCopyActions(mjxContainer, { targetType: 'equation' });
      return true;
    }

    copyEquationToClipboard(mjxContainer).then(success => {
      if (success) {
        showCopyFeedback(mjxContainer);
      } else {
        showCopyFailedFeedback(mjxContainer);
      }
    });
    return true;
  }

  return false;
}
