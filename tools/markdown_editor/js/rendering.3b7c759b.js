/**
 * Rendering module for the Markdown Editor
 * Handles markdown preprocessing, parsing, and rendering
 */

/**
 * Preprocess the input Markdown by preserving valid TeX inside math blocks.
 *
 * Quick manual checks:
 * - Inline TeX: $\\frac{1}{2}$ should render correctly.
 * - Escaped backslashes: $\\\\$ should remain as a literal double backslash.
 * - Currency: $5/day should stay as plain text.
 * - Currency punctuation: $5-month and $5 per day should stay as plain text.
 * - Literal dollar: \\$ should stay as plain text.
 *
 * @param {string} input - The raw Markdown input.
 * @returns {string} - The processed Markdown with TeX preserved.
 */
export function preprocessMarkdown(input) {
  const isEscaped = index => {
    let backslashCount = 0;
    for (let i = index - 1; i >= 0 && input[i] === '\\'; i -= 1) {
      backslashCount += 1;
    }
    return backslashCount % 2 === 1;
  };

  const isCurrencyLike = content => {
    const trimmed = content.trim();
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

  let output = '';
  let i = 0;
  let inFencedCodeBlock = false;
  let fencedDelimiter = null;
  let inInlineCodeSpan = false;
  let inlineCodeDelimiterLength = 0;

  while (i < input.length) {
    const char = input[i];

    const lineStart = i === 0 || input[i - 1] === '\n';

    // Check for fenced code block (CommonMark allows up to 3 spaces of indentation)
    if (lineStart && !inInlineCodeSpan) {
      let fenceIndent = 0;
      while (fenceIndent < 3 && i + fenceIndent < input.length && input[i + fenceIndent] === ' ') {
        fenceIndent += 1;
      }
      const fencePos = i + fenceIndent;
      if (input.startsWith('```', fencePos) || input.startsWith('~~~', fencePos)) {
        const delimiter = input.startsWith('```', fencePos) ? '```' : '~~~';
        if (!inFencedCodeBlock) {
          inFencedCodeBlock = true;
          fencedDelimiter = delimiter;
        } else if (fencedDelimiter === delimiter) {
          inFencedCodeBlock = false;
          fencedDelimiter = null;
        }
        const totalLength = fenceIndent + delimiter.length;
        output += input.slice(i, i + totalLength);
        i += totalLength;
        continue;
      }
    }

    // Handle multi-backtick inline code spans (`, ``, ```, etc.)
    if (!inFencedCodeBlock && char === '`' && !isEscaped(i)) {
      let backtickCount = 0;
      let j = i;
      while (j < input.length && input[j] === '`') {
        backtickCount += 1;
        j += 1;
      }
      if (!inInlineCodeSpan) {
        inInlineCodeSpan = true;
        inlineCodeDelimiterLength = backtickCount;
        output += input.slice(i, j);
        i = j;
        continue;
      } else if (backtickCount === inlineCodeDelimiterLength) {
        inInlineCodeSpan = false;
        inlineCodeDelimiterLength = 0;
        output += input.slice(i, j);
        i = j;
        continue;
      } else {
        // Non-matching backticks inside code span — treat as literal
        output += input.slice(i, j);
        i = j;
        continue;
      }
    }

    if (inFencedCodeBlock || inInlineCodeSpan) {
      output += char;
      i += 1;
      continue;
    }

    if (char === '$' && !isEscaped(i)) {
      const isDisplay = input[i + 1] === '$' && !isEscaped(i + 1);
      const delimiter = isDisplay ? '$$' : '$';
      const start = i;
      let searchIndex = i + delimiter.length;
      let closingIndex = -1;

      while (searchIndex < input.length) {
        if (input.startsWith(delimiter, searchIndex) && !isEscaped(searchIndex)) {
          closingIndex = searchIndex;
          break;
        }
        searchIndex += 1;
      }

      if (closingIndex === -1) {
        output += delimiter;
        i += delimiter.length;
        continue;
      }

      const content = input.slice(i + delimiter.length, closingIndex);

      if (!isDisplay && isCurrencyLike(content)) {
        output += '$';
        i = start + 1;
        continue;
      }

      const escapedContent = content.replace(/\\/g, '\\\\');
      // Preserve TeX backslashes only for math blocks outside code spans/blocks.
      output += delimiter + escapedContent + delimiter;
      i = closingIndex + delimiter.length;
      continue;
    }

    output += char;
    i += 1;
  }

  return output;
}

/**
 * Build line-to-block mapping from markdown text
 * @param {string} text - The markdown text
 * @returns {Array} Array of block objects with line info
 */
export function buildLineBlocks(text) {
  const tokens = marked.lexer(text);

  const countNewlines = value => (value.match(/\n/g) || []).length;
  const normalizeMatchText = value => value.replace(/\s+/g, ' ').trim();

  const getBlockTag = token => {
    switch (token.type) {
      case 'heading':
        return `h${token.depth}`;
      case 'paragraph':
        return 'p';
      case 'list':
        return token.ordered ? 'ol' : 'ul';
      case 'blockquote':
        return 'blockquote';
      case 'code':
        return 'pre';
      case 'table':
        return 'table';
      case 'hr':
        return 'hr';
      default:
        return null;
    }
  };

  const getChildTokens = token => {
    if (token.type === 'list') {
      return token.items.flatMap(item => item.tokens || []);
    }
    if (token.type === 'blockquote') {
      return token.tokens || [];
    }
    return [];
  };

  const getTokenMatchText = token => {
    if (!token.raw || token.type === 'hr') {
      return '';
    }

    try {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = marked.parse(token.raw);
      return normalizeMatchText(wrapper.textContent || '');
    } catch (error) {
      return normalizeMatchText(token.text || token.raw);
    }
  };

  const collectBlocksFromTokens = (tokenList, sourceText, baseLine) => {
    const blocks = [];
    let cursor = 0;

    tokenList.forEach(token => {
      if (!token.raw) {
        return;
      }

      const matchIndex = sourceText.indexOf(token.raw, cursor);
      if (matchIndex === -1) {
        return;
      }

      const startLine = baseLine + countNewlines(sourceText.slice(0, matchIndex));
      const endLine = startLine + countNewlines(token.raw);
      const tag = getBlockTag(token);

      if (tag) {
        blocks.push({
          start: startLine,
          end: endLine,
          tag,
          matchText: getTokenMatchText(token)
        });
      }

      const childTokens = getChildTokens(token);
      if (childTokens.length) {
        blocks.push(...collectBlocksFromTokens(childTokens, token.raw, startLine));
      }

      cursor = matchIndex + token.raw.length;
    });

    return blocks;
  };

  return collectBlocksFromTokens(tokens, text, 1);
}

/**
 * Wrap rendered HTML blocks with source line info
 * @param {string} html - The rendered HTML
 * @param {Array} lineBlocks - The line blocks from buildLineBlocks
 * @returns {string} HTML with wrapped blocks
 */
export function wrapRenderedBlocks(html, lineBlocks) {
  const container = document.createElement('div');
  container.innerHTML = html;
  const blockElements = Array.from(
    container.querySelectorAll('h1,h2,h3,h4,h5,h6,p,ul,ol,blockquote,pre,table,hr')
  );
  const normalizeMatchText = value => value.replace(/\s+/g, ' ').trim();
  let elementIndex = 0;

  lineBlocks.forEach(block => {
    let matchIndex = -1;
    const expectedText = normalizeMatchText(block.matchText || '');

    for (let i = elementIndex; i < blockElements.length; i += 1) {
      const element = blockElements[i];
      if (element.tagName.toLowerCase() !== block.tag) {
        continue;
      }
      if (!expectedText) {
        matchIndex = i;
        break;
      }

      const elementText = normalizeMatchText(element.textContent || '');
      if (elementText && (elementText.includes(expectedText) || expectedText.includes(elementText))) {
        matchIndex = i;
        break;
      }
    }

    if (matchIndex === -1 && block.tag) {
      for (let i = elementIndex; i < blockElements.length; i += 1) {
        if (blockElements[i].tagName.toLowerCase() === block.tag) {
          matchIndex = i;
          break;
        }
      }
    }

    if (matchIndex === -1) {
      return;
    }

    const element = blockElements[matchIndex];
    const wrapper = document.createElement('div');
    wrapper.classList.add('md-block');
    wrapper.dataset.srcStart = String(block.start);
    wrapper.dataset.srcEnd = String(block.end);
    element.replaceWith(wrapper);
    wrapper.appendChild(element);
    elementIndex = matchIndex + 1;
  });
  return container.innerHTML;
}

/**
 * Get clean HTML from rendered output (removes editor-specific attributes)
 * @param {HTMLElement} renderedOutput - The rendered output element
 * @returns {string} Clean HTML string
 */
export function getCleanRenderedOutputHTML(renderedOutput) {
  const clonedOutput = renderedOutput.cloneNode(true);
  clonedOutput.querySelectorAll('[data-src-start]').forEach(element => {
    element.removeAttribute('data-src-start');
  });
  clonedOutput.querySelectorAll('[data-src-end]').forEach(element => {
    element.removeAttribute('data-src-end');
  });
  clonedOutput.querySelectorAll('.highlighted-block').forEach(element => {
    element.classList.remove('highlighted-block');
  });
  clonedOutput.querySelectorAll('.md-block').forEach(wrapper => {
    const parent = wrapper.parentNode;
    while (wrapper.firstChild) {
      parent.insertBefore(wrapper.firstChild, wrapper);
    }
    parent.removeChild(wrapper);
  });
  return clonedOutput.innerHTML;
}

/**
 * Get the line number from a character offset in text
 * @param {string} text - The text
 * @param {number} offset - The character offset
 * @returns {number} The line number (1-indexed)
 */
export function getLineNumberFromOffset(text, offset) {
  if (offset <= 0) {
    return 1;
  }
  return text.slice(0, offset).split('\n').length;
}

/**
 * Get character offsets for a line range
 * @param {string} text - The text
 * @param {number} startLine - Start line (1-indexed)
 * @param {number} endLine - End line (1-indexed)
 * @returns {{startOffset: number, endOffset: number}} The offsets
 */
export function getOffsetsForLineRange(text, startLine, endLine) {
  const lines = text.split('\n');
  let startOffset = 0;
  let endOffset = text.length;

  for (let i = 0; i < lines.length; i += 1) {
    if (i + 1 < startLine) {
      startOffset += lines[i].length + 1;
    }
  }

  let cursor = 0;
  for (let i = 0; i < lines.length; i += 1) {
    if (i + 1 <= endLine) {
      cursor += lines[i].length;
      if (i + 1 < lines.length) {
        cursor += 1;
      }
    }
  }
  endOffset = cursor;

  return { startOffset, endOffset };
}

/**
 * Run preprocessMarkdown tests
 */
export function runPreprocessMarkdownTests() {
  const cases = [
    { input: '$5/day', expected: '$5/day', label: 'currency slash' },
    { input: '$5-month', expected: '$5-month', label: 'currency hyphen' },
    { input: '$5 per day', expected: '$5 per day', label: 'currency spaced' },
    { input: '$\\frac{1}{2}$', expected: '$\\\\frac{1}{2}$', label: 'inline fraction' },
    {
      input: '$\\begin{matrix}a&b\\\\c&d\\end{matrix}$',
      expected: '$\\\\begin{matrix}a&b\\\\\\\\c&d\\\\end{matrix}$',
      label: 'matrix commands'
    }
  ];

  cases.forEach(({ input, expected, label }) => {
    const actual = preprocessMarkdown(input);
    console.assert(
      actual === expected,
      `preprocessMarkdown test failed (${label}): expected "${expected}", got "${actual}"`
    );
  });
}
