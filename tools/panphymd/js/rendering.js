/**
 * Rendering module for the Markdown Editor
 * Handles math tokenization and Markdown source preparation.
 *
 * Math is tokenized by a marked extension instead of being pre-escaped, so
 * Markdown syntax inside $...$ / $$...$$ (emphasis markers, links, HTML-like
 * text) is never interpreted. Each math span is emitted as an element with a
 * `math-inline` / `math-display` class containing \(...\) / \[...\]
 * delimiters, and MathJax is configured to typeset only those elements, so
 * literal dollar signs elsewhere in the document can never pair up as math.
 *
 * Quick manual checks:
 * - Inline TeX: $\frac{1}{2}$ renders; $a*b$ and $c*d$ render without emphasis.
 * - Currency: "Costs $5 and $10", "$5/day", "$5 per day" stay as plain text.
 * - Literal dollar: \$ stays as a plain dollar sign.
 * - Code: `$x$` and fenced code blocks are never touched.
 * - Tables: | $|x|$ | keeps the absolute-value bars inside the cell.
 * - Display math whose lines start with "+ " or "- " stays one equation.
 */

import { isCurrencyLike } from './utils.js';

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const BLANK_LINE_AHEAD = /^\n[ \t]*(?:\n|$)/;

/**
 * Try to match a math span at the start of `src`.
 * @param {string} src - Source text that starts with '$'.
 * @returns {{raw: string, tex: string, display: boolean}|null}
 */
export function matchMath(src) {
  if (!src || src[0] !== '$') return null;

  const display = src[1] === '$';
  const delimiter = display ? '$$' : '$';
  let i = delimiter.length;

  while (i < src.length) {
    const char = src[i];
    if (char === '\\') {
      i += 2;
      continue;
    }
    if (char === '\n' && BLANK_LINE_AHEAD.test(src.slice(i))) return null;
    if (!display && char === '`') return null;
    if (src.startsWith(delimiter, i)) break;
    i += 1;
  }

  if (i >= src.length) return null;

  const content = src.slice(delimiter.length, i);
  if (!content.trim()) return null;

  const end = i + delimiter.length;
  if (!display) {
    // Pandoc rule: a closing $ directly followed by a digit is not math
    // ("costs $5 and $10").
    if (/\d/.test(src[end] || '')) return null;
    if (isCurrencyLike(content)) return null;
    // "$5 and $" — starts with a number and the closing $ follows a space.
    if (/^\s*\d/.test(content) && /\s$/.test(content)) return null;
  }

  return { raw: src.slice(0, end), tex: content.trim(), display };
}

function isEscapedAt(text, index) {
  let backslashCount = 0;
  for (let i = index - 1; i >= 0 && text[i] === '\\'; i -= 1) {
    backslashCount += 1;
  }
  return backslashCount % 2 === 1;
}

function findUnescapedDollar(text, fromIndex = 0) {
  let index = text.indexOf('$', fromIndex);
  while (index !== -1 && isEscapedAt(text, index)) {
    index = text.indexOf('$', index + 1);
  }
  return index;
}

function renderMathHtml(tex, display, { block = false, escape = true } = {}) {
  const body = escape ? escapeHtml(tex) : tex;
  if (block) {
    return `<p class="math-display">\\[${body}\\]</p>\n`;
  }
  return display
    ? `<span class="math-display">\\[${body}\\]</span>`
    : `<span class="math-inline">\\(${body}\\)</span>`;
}

/**
 * Wrap math spans found in a run of HTML text (outside tags).
 * TeX is left unescaped because it is already HTML source.
 */
function wrapMathInHtmlText(text) {
  let output = '';
  let cursor = 0;

  while (cursor < text.length) {
    const dollarIndex = findUnescapedDollar(text, cursor);
    if (dollarIndex === -1) break;

    const match = matchMath(text.slice(dollarIndex));
    if (!match) {
      const skip = text[dollarIndex + 1] === '$' ? 2 : 1;
      output += text.slice(cursor, dollarIndex + skip);
      cursor = dollarIndex + skip;
      continue;
    }

    output += text.slice(cursor, dollarIndex);
    output += renderMathHtml(match.tex, match.display, { escape: false });
    cursor = dollarIndex + match.raw.length;
  }

  output += text.slice(cursor);
  return output.replace(/\\\$/g, '$');
}

const RAW_TEXT_TAGS = new Set(['code', 'pre', 'script', 'style', 'textarea', 'kbd', 'samp']);

/**
 * Wrap math spans inside a raw HTML chunk, skipping tags and code-like
 * elements, so math written inside raw HTML blocks still renders.
 * @param {string} html
 * @returns {string}
 */
export function wrapMathInHtml(html) {
  if (!html || !html.includes('$')) return html;

  const parts = html.split(/(<[^>]*>)/);
  let rawTextDepth = 0;

  return parts.map(part => {
    if (part.startsWith('<')) {
      const tagMatch = /^<\s*(\/)?\s*([a-zA-Z][\w-]*)/.exec(part);
      if (tagMatch && RAW_TEXT_TAGS.has(tagMatch[2].toLowerCase()) && !part.endsWith('/>')) {
        rawTextDepth = Math.max(0, rawTextDepth + (tagMatch[1] ? -1 : 1));
      }
      return part;
    }
    return rawTextDepth > 0 ? part : wrapMathInHtmlText(part);
  }).join('');
}

/**
 * Create the marked extension set that tokenizes math.
 * @returns {Object} Options object for marked.use()
 */
export function createMathExtension() {
  const blockMath = {
    name: 'blockMath',
    level: 'block',
    start(src) {
      const match = /(^|\n) {0,3}\$\$/.exec(src);
      return match ? match.index + match[1].length : undefined;
    },
    tokenizer(src) {
      const indent = /^ {0,3}(?=\$\$)/.exec(src);
      if (!indent) return undefined;
      const match = matchMath(src.slice(indent[0].length));
      if (!match || !match.display) return undefined;
      const consumed = indent[0].length + match.raw.length;
      const lineRest = /^[ \t]*(?:\n+|$)/.exec(src.slice(consumed));
      if (!lineRest) return undefined;
      return {
        type: 'blockMath',
        raw: src.slice(0, consumed + lineRest[0].length),
        tex: match.tex
      };
    },
    renderer(token) {
      return renderMathHtml(token.tex, true, { block: true });
    }
  };

  const inlineMath = {
    name: 'inlineMath',
    level: 'inline',
    start(src) {
      const index = findUnescapedDollar(src);
      return index === -1 ? undefined : index;
    },
    tokenizer(src) {
      const match = matchMath(src);
      if (!match) return undefined;
      return {
        type: 'inlineMath',
        raw: match.raw,
        tex: match.tex,
        display: match.display
      };
    },
    renderer(token) {
      return renderMathHtml(token.tex, token.display);
    }
  };

  return {
    extensions: [blockMath, inlineMath],
    renderer: {
      html(html) {
        return wrapMathInHtml(html);
      }
    }
  };
}

const FENCE_PATTERN = /^ {0,3}(`{3,}|~{3,})/;
const TABLE_DELIMITER_ROW = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;

function protectPipesInMath(tex) {
  // In GFM tables every unescaped | splits a cell, and marked turns \| into
  // | before inline parsing. Map TeX's \| (double bar) to \Vert first, then
  // escape the remaining bars so they survive cell splitting.
  return tex
    .replace(/\\\|/g, '\\Vert{}')
    .replace(/\|/g, (match, offset, str) => (isEscapedAt(str, offset) ? match : '\\|'));
}

function protectTableRowMath(line) {
  if (!line.includes('$') || !line.includes('|')) return line;

  let output = '';
  let cursor = 0;

  while (cursor < line.length) {
    const char = line[cursor];

    if (char === '`') {
      let runEnd = cursor;
      while (line[runEnd] === '`') runEnd += 1;
      const fence = line.slice(cursor, runEnd);
      const closeIndex = line.indexOf(fence, runEnd);
      const spanEnd = closeIndex === -1 ? runEnd : closeIndex + fence.length;
      output += line.slice(cursor, spanEnd);
      cursor = spanEnd;
      continue;
    }

    if (char === '$' && !isEscapedAt(line, cursor)) {
      const match = matchMath(line.slice(cursor));
      if (match) {
        const delimiter = match.display ? '$$' : '$';
        const inner = match.raw.slice(delimiter.length, -delimiter.length);
        output += delimiter + protectPipesInMath(inner) + delimiter;
        cursor += match.raw.length;
        continue;
      }
    }

    output += char;
    cursor += 1;
  }

  return output;
}

/**
 * Prepare Markdown source for marked: escape | inside math within GFM table
 * rows so absolute values and conditional bars do not split cells.
 * @param {string} input
 * @returns {string}
 */
export function prepareMarkdownSource(input) {
  if (!input || !input.includes('$') || !input.includes('|')) return input || '';

  const lines = input.split('\n');
  let fenceChar = null;
  let fenceLength = 0;
  let inTable = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const fenceMatch = FENCE_PATTERN.exec(line);

    if (fenceChar) {
      if (fenceMatch && fenceMatch[1][0] === fenceChar && fenceMatch[1].length >= fenceLength
        && !line.slice(fenceMatch[0].length).trim()) {
        fenceChar = null;
        fenceLength = 0;
      }
      continue;
    }

    if (fenceMatch) {
      fenceChar = fenceMatch[1][0];
      fenceLength = fenceMatch[1].length;
      inTable = false;
      continue;
    }

    if (!line.trim()) {
      inTable = false;
      continue;
    }

    if (!inTable && line.includes('|') && TABLE_DELIMITER_ROW.test(line)
      && i > 0 && lines[i - 1].includes('|') && lines[i - 1].trim()) {
      inTable = true;
      lines[i - 1] = protectTableRowMath(lines[i - 1]);
      continue;
    }

    if (inTable) {
      lines[i] = protectTableRowMath(line);
    }
  }

  return lines.join('\n');
}
