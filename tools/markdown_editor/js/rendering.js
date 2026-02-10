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
  const escapedDollarPlaceholder = '__PANPHY_ESCAPED_DOLLAR__';
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

    if (char === '\\' && input[i + 1] === '$' && !isEscaped(i)) {
      // Use a literal HTML entity so MathJax will not treat this as a delimiter.
      output += '&#36;';
      i += 2;
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
 * Restore escaped dollar placeholders after markdown parsing.
 * Uses HTML entity so MathJax does not interpret it as a math delimiter.
 *
 * @param {string} html - Parsed HTML string.
 * @returns {string} HTML with escaped dollar placeholders restored.
 */
export function restoreEscapedDollarPlaceholders(html) {
  return html.replaceAll('__PANPHY_ESCAPED_DOLLAR__', '&#36;');
}

/**
 * Get clean HTML from rendered output
 * @param {HTMLElement} renderedOutput - The rendered output element
 * @returns {string} Clean HTML string
 */
export function getCleanRenderedOutputHTML(renderedOutput) {
  return renderedOutput.innerHTML;
}

/**
 * Run preprocessMarkdown tests
 */
export function runPreprocessMarkdownTests() {
  const cases = [
    { input: '$5/day', expected: '$5/day', label: 'currency slash' },
    { input: '$5-month', expected: '$5-month', label: 'currency hyphen' },
    { input: '$5 per day', expected: '$5 per day', label: 'currency spaced' },
    {
      input: '\\$10, \\$20',
      expected: '&#36;10, &#36;20',
      label: 'escaped dollar literals'
    },
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
