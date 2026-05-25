/**
 * Shared utilities for the Markdown Editor
 */

/**
 * Heuristic to detect if $...$ content looks like a currency amount rather
 * than a LaTeX math expression.
 *
 * Single-letter SI unit symbols (N, A, W, m, s, …) must NOT be matched.
 * Only patterns that unmistakably indicate a currency context return true.
 *
 * @param {string} value - The content between $ delimiters (not including $).
 * @returns {boolean}
 */
export function isCurrencyLike(value) {
  const trimmed = value.trim();
  if (!/^\d/.test(trimmed)) {
    return false;
  }

  // Three-letter ISO currency codes (USD, EUR, GBP, …)
  const currencyAbbreviation = /\b(?:aud|brl|cad|chf|cny|dkk|eur|gbp|hkd|inr|jpy|krw|mxn|nok|sek|sgd|usd|zar)\b/i;
  if (currencyAbbreviation.test(trimmed)) {
    return true;
  }

  // Digit followed by whitespace then a currency-context word.
  // Uses a whitelist so single-letter SI unit symbols (N, A, W, m, s, …)
  // are not caught — those are physics quantities, not prices.
  const currencyContextWords = /^\d+(?:[.,]\d+)?\s+(?:per|a|an|each|month|months|day|days|year|years|week|weeks|hour|hours|unit|units|piece|pieces)\b/i;
  if (currencyContextWords.test(trimmed)) {
    return true;
  }

  // Digit followed by / or - then a letter (e.g. $5/month, $5-month)
  return /^\d+(?:[.,]\d+)?\s*[\/-]\s*[A-Za-z]/.test(trimmed);
}
