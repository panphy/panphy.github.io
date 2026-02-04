/**
 * Copy-to-clipboard module for the Markdown Editor
 * Handles copying equations, tables, and code blocks
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

  const fillColor = '#000000';
  const applyFill = (el) => {
    const currentFill = el.getAttribute('fill');
    if (!currentFill || currentFill === 'currentColor') {
      el.setAttribute('fill', fillColor);
    }
  };

  const applyStroke = (el) => {
    const currentStroke = el.getAttribute('stroke');
    if (!currentStroke || currentStroke === 'currentColor') {
      el.setAttribute('stroke', fillColor);
    }
  };

  svgClone.querySelectorAll('path, use, text, tspan, ellipse, circle, polygon, polyline').forEach(applyFill);
  svgClone.querySelectorAll('line, polyline, polygon, path').forEach(applyStroke);

  svgClone.querySelectorAll('rect').forEach(rect => {
    const rectFill = rect.getAttribute('fill');
    if (!rectFill || rectFill === 'currentColor') {
      rect.setAttribute('fill', 'none');
    }
    const rectStroke = rect.getAttribute('stroke');
    if (!rectStroke || rectStroke === 'currentColor') {
      rect.setAttribute('stroke', fillColor);
    }
  });

  svgClone.setAttribute('color', fillColor);

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
 * Uses PNG format for Safari (which doesn't support SVG in clipboard).
 * Uses SVG+PNG for other browsers for best quality.
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
    const useSafariCompatMode = isSafari();

    const clipboardPayload = {};

    // Only include SVG for non-Safari browsers
    if (!useSafariCompatMode) {
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
      clipboardPayload['image/svg+xml'] = svgBlob;
    }

    // Always try to include PNG (works on all browsers)
    const pngBlob = await rasterizeSvgToPng(svgString, widthPx, heightPx);
    if (pngBlob) {
      clipboardPayload['image/png'] = pngBlob;
    }

    // Ensure we have at least one format to copy
    if (Object.keys(clipboardPayload).length === 0) {
      console.warn('No valid clipboard formats available');
      return false;
    }

    await navigator.clipboard.write([new ClipboardItem(clipboardPayload)]);
    return true;
  } catch (err) {
    console.error('Failed to copy equation:', err);
    return false;
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

  // Add inline styles for better Word compatibility
  tableClone.style.borderCollapse = 'collapse';
  tableClone.style.fontFamily = 'Arial, sans-serif';
  tableClone.style.fontSize = '12pt';

  tableClone.querySelectorAll('th, td').forEach(cell => {
    cell.style.border = '1px solid black';
    cell.style.padding = '8px';
  });

  const htmlString = tableClone.outerHTML;

  try {
    // Copy as HTML for better Word compatibility
    const blob = new Blob([htmlString], { type: 'text/html' });
    const clipboardItem = new ClipboardItem({
      'text/html': blob,
      'text/plain': new Blob([table.innerText], { type: 'text/plain' })
    });
    await navigator.clipboard.write([clipboardItem]);
    return true;
  } catch (err) {
    // Fallback to text copy
    try {
      await navigator.clipboard.writeText(htmlString);
      return true;
    } catch (fallbackErr) {
      console.error('Failed to copy table:', fallbackErr);
      return false;
    }
  }
}

/**
 * Copy a code block as HTML with syntax highlighting and background to clipboard.
 * Uses a table structure to preserve background colors in rich text editors like
 * Word, Pages, Notes, etc. (tables preserve cell backgrounds better than divs).
 * @param {HTMLPreElement} preElement - The pre element containing the code
 * @returns {Promise<boolean>} Success status
 */
export async function copyCodeBlockToClipboard(preElement) {
  const codeElement = preElement.querySelector('code');
  const plainText = codeElement ? codeElement.textContent : preElement.textContent;

  const isTransparentColor = (color) => {
    if (!color) return true;
    const normalized = color.trim().toLowerCase().replace(/\s+/g, '');
    return normalized === 'transparent' || normalized === 'rgba(0,0,0,0)';
  };

  // Get computed styles for the code block (use code element when it defines theme colors)
  const preStyle = getComputedStyle(preElement);
  const codeStyle = codeElement ? getComputedStyle(codeElement) : null;

  const codeBg = codeStyle?.backgroundColor;
  const preBg = preStyle.backgroundColor;
  const bgColor = !isTransparentColor(codeBg) ? codeBg : (!isTransparentColor(preBg) ? preBg : '#f1f3f5');

  const codeTextColor = codeStyle?.color;
  const preTextColor = preStyle.color;
  const textColor = !isTransparentColor(codeTextColor) ? codeTextColor : (preTextColor || '#000000');

  const codePadding = codeStyle?.padding || '12px';
  const borderRadius = preStyle.borderRadius || '6px';
  const fontFamily = codeStyle?.fontFamily || preStyle.fontFamily || "'JetBrains Mono', 'Consolas', 'Monaco', 'Courier New', monospace";
  const fontSize = codeStyle?.fontSize || preStyle.fontSize || '10pt';
  const lineHeight = codeStyle?.lineHeight || preStyle.lineHeight || '1.5';

  // Build the code content with inlined syntax highlighting
  const codeClone = codeElement ? codeElement.cloneNode(true) : preElement.cloneNode(true);

  // Inline the syntax highlighting colors from hljs spans
  const originalHighlights = (codeElement || preElement).querySelectorAll('[class*="hljs"]');
  const clonedHighlights = codeClone.querySelectorAll('[class*="hljs"]');
  clonedHighlights.forEach((el, index) => {
    const original = originalHighlights[index];
    if (!original) return;
    const elStyle = getComputedStyle(original);
    if (elStyle.color) {
      el.style.color = elStyle.color;
    }
    if (elStyle.fontWeight && elStyle.fontWeight !== 'normal' && elStyle.fontWeight !== '400') {
      el.style.fontWeight = elStyle.fontWeight;
    }
    if (elStyle.fontStyle && elStyle.fontStyle !== 'normal') {
      el.style.fontStyle = elStyle.fontStyle;
    }
  });

  // Build an HTML snapshot for SVG rendering
  const snapshotWrapper = document.createElement('div');
  snapshotWrapper.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  snapshotWrapper.style.backgroundColor = bgColor;
  snapshotWrapper.style.color = textColor;
  snapshotWrapper.style.fontFamily = fontFamily;
  snapshotWrapper.style.fontSize = fontSize;
  snapshotWrapper.style.lineHeight = lineHeight;
  snapshotWrapper.style.padding = codePadding;
  snapshotWrapper.style.borderRadius = borderRadius;
  snapshotWrapper.style.display = 'inline-block';
  snapshotWrapper.style.whiteSpace = 'pre';
  snapshotWrapper.style.boxSizing = 'border-box';

  const snapshotPre = document.createElement('pre');
  snapshotPre.style.margin = '0';
  snapshotPre.style.padding = '0';
  snapshotPre.style.backgroundColor = 'transparent';
  snapshotPre.style.color = 'inherit';
  snapshotPre.style.fontFamily = 'inherit';
  snapshotPre.style.fontSize = 'inherit';
  snapshotPre.style.lineHeight = 'inherit';
  snapshotPre.style.whiteSpace = 'pre';
  snapshotPre.style.wordWrap = 'break-word';
  snapshotPre.style.border = 'none';
  snapshotPre.innerHTML = codeClone.innerHTML;
  snapshotWrapper.appendChild(snapshotPre);

  const snapshotRect = preElement.getBoundingClientRect();
  const widthPx = Math.max(Math.ceil(snapshotRect.width), preElement.scrollWidth, 20);
  const heightPx = Math.max(Math.ceil(snapshotRect.height), preElement.scrollHeight, 20);

  // Create a table structure - tables preserve background colors in most rich text editors
  const table = document.createElement('table');
  table.style.borderCollapse = 'collapse';
  table.style.border = 'none';
  table.style.margin = '0';
  table.style.padding = '0';
  table.style.width = 'auto';
  table.setAttribute('cellspacing', '0');
  table.setAttribute('cellpadding', '0');

  const tr = document.createElement('tr');
  const td = document.createElement('td');

  // Apply background to the table cell - this is what gets preserved
  td.style.backgroundColor = bgColor;
  td.style.color = textColor;
  td.style.fontFamily = fontFamily;
  td.style.fontSize = fontSize;
  td.style.lineHeight = lineHeight;
  td.style.padding = codePadding;
  td.style.borderRadius = borderRadius;
  td.style.whiteSpace = 'pre';
  td.style.border = 'none';
  td.style.verticalAlign = 'top';

  // Create a pre element inside the cell for proper code formatting
  const pre = document.createElement('pre');
  pre.style.margin = '0';
  pre.style.padding = '0';
  pre.style.backgroundColor = 'transparent';
  pre.style.color = 'inherit';
  pre.style.fontFamily = 'inherit';
  pre.style.fontSize = 'inherit';
  pre.style.lineHeight = 'inherit';
  pre.style.whiteSpace = 'pre-wrap';
  pre.style.wordWrap = 'break-word';
  pre.style.border = 'none';

  // Transfer the highlighted content
  pre.innerHTML = codeClone.innerHTML;

  td.appendChild(pre);
  tr.appendChild(td);
  table.appendChild(tr);

  const htmlString = table.outerHTML;

  try {
    if (typeof ClipboardItem === 'undefined') {
      throw new Error('ClipboardItem not supported');
    }

    // Copy as HTML for syntax highlighting + plain text fallback
    const htmlBlob = new Blob([htmlString], { type: 'text/html' });
    const textBlob = new Blob([plainText], { type: 'text/plain' });
    const clipboardPayload = {
      'text/html': htmlBlob,
      'text/plain': textBlob
    };

    const clipboardItem = new ClipboardItem(clipboardPayload);
    await navigator.clipboard.write([clipboardItem]);
    return true;
  } catch (err) {
    // Fallback to plain text copy
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(plainText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = plainText;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      return true;
    } catch (fallbackErr) {
      console.error('Failed to copy code:', fallbackErr);
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

  // Check if clicked on a code block
  const preElement = event.target.closest('pre');
  if (preElement && !window.getSelection().toString()) {
    event.preventDefault();
    copyCodeBlockToClipboard(preElement).then(success => {
      if (success) {
        showCopyFeedback(preElement);
      } else {
        showCopyFailedFeedback(preElement);
      }
    });
    return true;
  }

  return false;
}
