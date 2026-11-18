// Deck text size check. Opens teaching decks in headless Chrome at 1600 × 900, shows every slide
// with all its steps revealed, and finds text students read that is under 28px on the slide: the
// rule for a 75" screen read from the back of a 10 m lab (see the decks' readable.css).
// Sizes are measured as rendered, so scaled figures and SVG labels count at the size they appear.
// Left out: the slide furniture readable.css keeps small (eyebrows, the footer, the year badge,
// course flags, AQA spec references, credits, the "not assessed" label, the copyright line),
// marks of one or two characters (nucleon glyphs, tick numbers, symbols), and MathJax, whose glyphs
// are not text nodes. Add `data-small-ok` to an element (or an ancestor) for a deliberate exception.
//
// Small text that predates the check is listed in deck-text-baseline.json, keyed by element and
// text (not slide number, so splitting slides keeps it), and only text beyond it fails. After
// enlarging text, shrink the baseline with --update-baseline.
//   node .github/scripts/deck-text.mjs [deck ...]          e.g. ibdpphy/decks/a1-kinematics/index.html
//   node .github/scripts/deck-text.mjs --update-baseline [deck ...]
// With no decks it checks every deck in gcsephy/decks/ and ibdpphy/decks/.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, withBrowser } from './headless.mjs';

const VIEWPORT = { width: 1600, height: 900 };
const SETTLE_MS = 2500;
const MIN_PX = 28;
const BASELINE = join(ROOT, '.github/scripts/deck-text-baseline.json');

const allDecks = () => execFileSync('git', ['ls-files', 'gcsephy/decks/*/index.html', 'ibdpphy/decks/*/index.html'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n').filter(Boolean);

// Runs inside each deck. Returns [{ slide, size, text, where }] for text under the minimum.
function measureDeck({ minPx }) {
  const SKIP = [
    '.eyebrow', '.slide-foot', '.slide-copyright', '.year-badge', '.triple-flag', '.triple-tag', '.hl-tag', '.spec', '.spec-ref',
    '.credit', '.credits', '.not-examined', 'button', 'mjx-assistive-mml', '[aria-hidden="true"]', '[data-small-ok]',
    'script', 'style', 'noscript', 'title', 'desc'
  ].join(',');
  const style = document.createElement('style');
  style.textContent = '.slide, .step { visibility: visible !important; opacity: 1 !important; transition: none !important; }';
  document.head.append(style);
  const slides = [...document.querySelectorAll('.deck .slide, .slides .slide, main .slide')].filter((slide, i, all) => !slide.closest('.thumb-slide') && all.indexOf(slide) === i);
  // Inactive slides are aria-hidden and inert; only what is inside a slide decides what is skipped.
  slides.forEach((slide) => {
    slide.removeAttribute('aria-hidden');
    slide.removeAttribute('inert');
    slide.querySelectorAll('.step').forEach((step) => step.classList.add('shown'));
  });
  const describe = (el) => {
    const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    return `${el.tagName.toLowerCase()}${cls}`;
  };
  const shown = (el) => {
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const css = getComputedStyle(node);
      if (css.display === 'none' || css.visibility === 'hidden' || Number(css.opacity) === 0) return false;
      if (node.classList.contains('slide')) return true;
    }
    return true;
  };
  const found = [];
  slides.forEach((slide, index) => {
    const slideScale = slide.getBoundingClientRect().width / slide.offsetWidth || 1;
    const seen = new Set();
    const walker = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.textContent.replace(/\s+/g, ' ').trim();
      if (text.length < 3 || !/[\p{L}\p{N}]/u.test(text)) continue;
      // Superscripts and subscripts (m s⁻¹, Eₖ) count at the size of the text they belong to.
      let el = node.parentElement;
      while (el && /^(SUP|SUB)$/.test(el.tagName) && el.parentElement) el = el.parentElement;
      if (!el || el.closest(SKIP) || seen.has(el) || !shown(el)) continue;
      seen.add(el);
      const range = document.createRange();
      range.selectNodeContents(node);
      const box = range.getBoundingClientRect();
      if (box.width < 1 || box.height < 1) continue;
      let size;
      const fontSize = parseFloat(getComputedStyle(el).fontSize);
      if (el instanceof SVGElement) {
        const svg = el.ownerSVGElement || el;
        const ctm = (el.getScreenCTM && el.getScreenCTM()) || svg.getScreenCTM();
        size = fontSize * Math.hypot(ctm.a, ctm.b) / slideScale;
      } else {
        const scale = el.offsetWidth ? el.getBoundingClientRect().width / el.offsetWidth : slideScale;
        size = fontSize * scale / slideScale;
      }
      if (size < minPx - 0.5) found.push({ slide: index + 1, size: Math.round(size * 10) / 10, text: text.slice(0, 48), where: describe(el) });
    }
  });
  return { slides: slides.length, found };
}

const keyOf = (item) => `<${item.where}> ${item.text}`;
const tally = (items) => items.reduce((counts, item) => ({ ...counts, [keyOf(item)]: (counts[keyOf(item)] || 0) + 1 }), {});

async function main() {
  const args = process.argv.slice(2);
  const update = args.includes('--update-baseline');
  const named = args.filter((arg) => !arg.startsWith('--'));
  const decks = named.length ? named : allDecks();
  const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {};
  let known = 0;
  const failed = await withBrowser(async ({ send, open, evaluate }) => {
    await send('Emulation.setDeviceMetricsOverride', { ...VIEWPORT, deviceScaleFactor: 1, mobile: false });
    let failures = 0;
    for (const deck of decks) {
      let result;
      try {
        const problems = await open(deck, SETTLE_MS);
        if (problems.length) throw new Error(problems[0]);
        result = await evaluate(measureDeck, { minPx: MIN_PX });
        if (!result.slides) throw new Error('no slides found');
      } catch (error) {
        failures += 1;
        console.log(`✖ ${deck}\n    could not be checked: ${error.message.split('\n')[0]}`);
        continue;
      }
      if (update) {
        if (result.found.length) baseline[deck] = tally(result.found); else delete baseline[deck];
        console.log(`• ${deck}: ${result.found.length} small text item(s) recorded`);
        continue;
      }
      // Each baseline entry allows that many copies of the same element and text.
      const allowed = { ...(baseline[deck] || {}) };
      const fresh = result.found.filter((item) => {
        if (allowed[keyOf(item)] > 0) { allowed[keyOf(item)] -= 1; known += 1; return false; }
        return true;
      });
      if (fresh.length) {
        failures += 1;
        console.log(`✖ ${deck}: ${fresh.length} new item(s) under ${MIN_PX}px`);
        for (const item of fresh) console.log(`    slide ${item.slide}: ${item.size}px <${item.where}> "${item.text}"`);
      } else {
        console.log(`✔ ${deck} (${result.slides} slides)`);
      }
    }
    return failures;
  });
  if (update) {
    const sorted = Object.fromEntries(Object.keys(baseline).sort().map((deck) => [deck, Object.fromEntries(Object.entries(baseline[deck]).sort())]));
    writeFileSync(BASELINE, JSON.stringify(sorted, null, 1) + '\n');
    console.log(`\nWrote ${BASELINE.slice(ROOT.length + 1)}.`);
    process.exit(failed ? 2 : 0);
  }
  const note = known ? ` (${known} older item(s) are in the baseline)` : '';
  console.log(failed ? `\n${failed} of ${decks.length} decks have new text under ${MIN_PX}px${note}.` : `\nAll ${decks.length} decks passed${note}.`);
  process.exit(failed ? 1 : 0);
}

main();
