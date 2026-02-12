/**
 * Copy-to-clipboard module for the Markdown Editor
 * Handles copying equations and tables
 */

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

/**
 * Prepare equation SVG for copying
 * @param {SVGElement} svg - The original SVG element
 * @returns {{svgString: string, widthPx: number, heightPx: number}|null} Prepared SVG data or null
 */
function prepareEquationSvg(svg) {
  // Clone the SVG to avoid modifying the original
  const svgClone = svg.cloneNode(true);

  // MathJax uses a global defs cache - we need to inline all referenced glyphs
  // For complex equations (integrals, matrices, boxed, etc.), definitions can
  // reference other definitions, so we need to recursively resolve all references.
  const getReferencedIds = (element) => {
    const ids = new Set();
    const useElements = element.querySelectorAll('use');
    useElements.forEach(use => {
      const href = use.getAttribute('href') || use.getAttribute('xlink:href');
      if (href && href.startsWith('#')) {
        ids.add(href.substring(1));
      }
    });
    return ids;
  };

  let defsClone = svgClone.querySelector('defs');
  if (!defsClone) {
    defsClone = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svgClone.insertBefore(defsClone, svgClone.firstChild);
  }

  const processedIds = new Set();
  const pendingIds = getReferencedIds(svgClone);

  while (pendingIds.size > 0) {
    const id = pendingIds.values().next().value;
    pendingIds.delete(id);

    if (processedIds.has(id)) continue;
    processedIds.add(id);

    if (defsClone.querySelector(`#${CSS.escape(id)}`)) continue;

    const original = document.getElementById(id);
    if (original) {
      const clonedDef = original.cloneNode(true);
      defsClone.appendChild(clonedDef);

      const nestedIds = getReferencedIds(clonedDef);
      nestedIds.forEach(nestedId => {
        if (!processedIds.has(nestedId)) {
          pendingIds.add(nestedId);
        }
      });
    }
  }

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
    const scale = 2;
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

      await navigator.clipboard.write([new ClipboardItem(clipboardPayload)]);
      return true;
    }
  } catch (err) {
    console.error('Failed to copy equation:', err);
    return false;
  }
}

/**
 * Build a map from mjx-container elements to their original LaTeX source.
 * Uses MathJax v3 internal API to retrieve the original TeX strings.
 * @param {Element[]} containers - Array of mjx-container elements
 * @returns {Map<Element, string>} Map from container element to LaTeX with delimiters
 */
function buildTexSourceMap(containers) {
  const map = new Map();
  const lookup = new Set(containers);
  if (window.MathJax?.startup?.document?.math) {
    for (const item of MathJax.startup.document.math) {
      if (lookup.has(item.typesetRoot)) {
        const delim = item.display ? '$$' : '$';
        map.set(item.typesetRoot, delim + item.math + delim);
      }
    }
  }
  return map;
}

/**
 * Copy a table to clipboard with LaTeX source preserved.
 * - HTML format: table with LaTeX source text replacing rendered equations
 * - Plain text format: tab-separated values with LaTeX source
 * @param {HTMLTableElement} table - The table element to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyTableToClipboard(table) {
  // Extract LaTeX source from MathJax containers before cloning
  const originalContainers = Array.from(table.querySelectorAll('mjx-container'));
  const texMap = buildTexSourceMap(originalContainers);

  const tableClone = table.cloneNode(true);

  // Replace MathJax containers in clone with original LaTeX source text
  const clonedContainers = Array.from(tableClone.querySelectorAll('mjx-container'));
  clonedContainers.forEach((container, i) => {
    const original = originalContainers[i];
    const tex = texMap.get(original) || container.textContent || '';
    container.replaceWith(document.createTextNode(tex));
  });

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

  // Build TSV for spreadsheet pasting (LaTeX source in cells)
  const rows = tableClone.querySelectorAll('tr');
  const tsv = Array.from(rows).map(row => {
    const cells = row.querySelectorAll('th, td');
    return Array.from(cells).map(cell => cell.textContent.trim()).join('\t');
  }).join('\n');

  const htmlString = tableClone.outerHTML;

  try {
    const blob = new Blob([htmlString], { type: 'text/html' });
    const clipboardItem = new ClipboardItem({
      'text/html': blob,
      'text/plain': new Blob([tsv], { type: 'text/plain' })
    });
    await navigator.clipboard.write([clipboardItem]);
    return true;
  } catch (err) {
    // Fallback to text copy
    try {
      await navigator.clipboard.writeText(tsv);
      return true;
    } catch (fallbackErr) {
      console.error('Failed to copy table:', fallbackErr);
      return false;
    }
  }
}

/**
 * Show copy feedback animation on an element.
 * @param {Element} element - The element to show feedback on
 */
export function showCopyFeedback(element) {
  element.classList.add('copied');
  setTimeout(() => {
    element.classList.remove('copied');
  }, 1500);
}

/**
 * Show copy failed feedback animation on an element.
 * @param {Element} element - The element to show feedback on
 */
export function showCopyFailedFeedback(element) {
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
  // Check if clicked on a MathJax container
  const mjxContainer = event.target.closest('mjx-container');
  if (mjxContainer) {
    event.preventDefault();
    event.stopPropagation();
    copyEquationToClipboard(mjxContainer).then(success => {
      if (success) {
        showCopyFeedback(mjxContainer);
      } else {
        showCopyFailedFeedback(mjxContainer);
      }
    });
    return true;
  }

  // Check if clicked on a table (but not inside a cell for text selection)
  const table = event.target.closest('table');
  if (table && !window.getSelection().toString()) {
    event.preventDefault();
    copyTableToClipboard(table).then(success => {
      if (success) {
        showCopyFeedback(table);
      } else {
        showCopyFailedFeedback(table);
      }
    });
    return true;
  }

  return false;
}
