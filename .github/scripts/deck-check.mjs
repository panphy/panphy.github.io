// Teaching deck check: text size and contrast in one run. Opens each deck in headless Chrome at
// 1600 × 900 with every step shown: playing for text size, then still in the light and dark themes.
//
// Text size: text students read must be at least 28px on the slide, the rule for a 75" screen read
// from the back of a 10 m lab (see the decks' readable.css). Sizes are measured as rendered, so scaled
// figures and SVG labels count at the size they appear. Left out: the slide furniture readable.css
// keeps small (eyebrows, the footer, the year badge, course flags, AQA spec references, credits, the
// "not assessed" label, the copyright line), marks of one or two characters, and MathJax, whose glyphs
// are not text nodes. Add `data-small-ok` to an element (or an ancestor) for a deliberate exception.
//
// Contrast, in both themes (WCAG, as rendered): normal text at least 4.5:1; large text (24px bold or
// 32px regular, on the slide) at least 3:1; figure lines, arrows and arrowheads at least 3:1. The
// background is the stack of painted elements under each item, composited with their opacity. Items
// over a photo, gradient, canvas or 3D model are counted as unmeasured and never fail. Left out: the
// slide footer, copyright, credits, buttons, graph grids and dividers, thin lines under 1.5px, and
// anything marked `data-decor`.
//
// Problems that predate a check are in deck-text-baseline.json and deck-contrast-baseline.json, keyed
// by element and text or colors (not slide number), and only problems beyond them fail.
//   node .github/scripts/deck-check.mjs [deck ...]      e.g. ibdpphy/decks/a1-kinematics/index.html
//   node .github/scripts/deck-check.mjs --update-baseline [deck ...]
//   node .github/scripts/deck-check.mjs --report=FILE [deck ...]   also writes every contrast failure, worst first
// With no decks it checks every deck in gcsephy/decks/ and ibdpphy/decks/.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, checkPages } from './headless.mjs';

const VIEWPORT = { width: 1600, height: 900 };
const SETTLE_MS = 2500;
const THEMES = ['light', 'dark'];
const MIN_PX = 28;
const LIMITS = { text: 4.5, large: 3, graphic: 3 };
const TEXT_BASELINE = join(ROOT, '.github/scripts/deck-text-baseline.json');
const CONTRAST_BASELINE = join(ROOT, '.github/scripts/deck-contrast-baseline.json');

const allDecks = () => execFileSync('git', ['ls-files', 'gcsephy/decks/*/index.html', 'ibdpphy/decks/*/index.html'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n').filter(Boolean);

// Runs inside each deck. Returns { slides, found: [text under the minimum] }.
function measureText({ minPx }) {
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
  style.remove();
  return { slides: slides.length, found };
}

// Runs inside each deck. Returns { slides, measured, unmeasured, found: [failing items] }.
function measureContrast({ limits }) {
  const SKIP = 'svg .grid,svg .divider,svg .sx-divider,.slide-foot,.slide-copyright,.credit,.credits,button,mjx-assistive-mml,[data-decor],script,style,noscript,title,desc,defs,marker,clipPath,mask,pattern,symbol';
  const style = document.createElement('style');
  style.textContent = `.slide { display: none !important; }
    .slide.contrast-now { display: flex !important; visibility: visible !important; opacity: 1 !important; transform: none; }
    .slide.contrast-now .step { visibility: visible !important; opacity: 1 !important; }
    * { transition: none !important; animation: none !important; pointer-events: auto !important; }`;
  document.head.append(style);
  const slides = [...document.querySelectorAll('.deck .slide, .slides .slide, main .slide')].filter((slide, i, all) => !slide.closest('.thumb-slide') && all.indexOf(slide) === i);

  const parse = (value) => {
    if (!value || value === 'none' || value.startsWith('url')) return null;
    const numbers = (value.match(/-?[\d.]+(?:e-?\d+)?%?/gi) || []).map((n) => n.endsWith('%') ? parseFloat(n) / 100 : parseFloat(n));
    if (value.startsWith('rgb')) return { r: numbers[0], g: numbers[1], b: numbers[2], a: numbers[3] ?? 1 };
    if (value.startsWith('color(srgb')) return { r: numbers[0] * 255, g: numbers[1] * 255, b: numbers[2] * 255, a: numbers[3] ?? 1 };
    return null;
  };
  const over = (top, under) => ({
    r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1
  });
  const luminance = ({ r, g, b }) => {
    const [x, y, z] = [r, g, b].map((v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * x + 0.7152 * y + 0.0722 * z;
  };
  const ratio = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (hi + 0.05) / (lo + 0.05); };
  const hex = ({ r, g, b }) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  const describe = (el) => {
    const raw = typeof el.className === 'string' ? el.className : el.className?.baseVal || '';
    const cls = raw.trim() ? '.' + raw.trim().split(/\s+/).filter((c) => c !== 'step' && c !== 'shown').slice(0, 2).join('.') : '';
    return `${el.tagName.toLowerCase()}${cls === '.' ? '' : cls}`;
  };
  const opacityOf = (el, slide) => {
    let value = 1;
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      value *= Number(getComputedStyle(node).opacity);
      if (node === slide) break;
    }
    return value;
  };
  const shown = (el, slide) => {
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const css = getComputedStyle(node);
      if (css.display === 'none' || css.visibility === 'hidden' || Number(css.opacity) === 0) return false;
      if (node === slide) return true;
    }
    return true;
  };
  const localPoint = (el, x, y) => {
    const ctm = el.getScreenCTM();
    if (!ctm) return null;
    const svg = el.ownerSVGElement;
    const point = svg.createSVGPoint();
    point.x = x; point.y = y;
    return point.matrixTransform(ctm.inverse());
  };

  // What one element in the stack paints at (x, y): a color, null for nothing, 'unknown' if unjudgeable.
  const layerAt = (el, x, y, slide) => {
    if (el.closest('mjx-container')) return null;
    const tag = el.tagName.toLowerCase();
    if (['img', 'canvas', 'video', 'image'].includes(tag)) return 'unknown';
    const css = getComputedStyle(el);
    if (el instanceof SVGElement && tag !== 'svg') {
      if (!(el instanceof SVGGeometryElement)) return null;
      const point = localPoint(el, x, y);
      if (!point || !el.isPointInFill(point)) return null; // a line crossing behind is not a background
      if (css.fill.startsWith('url')) return 'unknown';
      const fill = parse(css.fill);
      return fill ? { ...fill, a: fill.a * Number(css.fillOpacity) * opacityOf(el, slide) } : null;
    }
    // The slides' faint dot pattern is a small repeating tile over a solid color: judge on the color.
    const tile = parseFloat(css.backgroundSize);
    const dotted = /^radial-gradient/.test(css.backgroundImage) && tile > 0 && tile <= 64 && !css.backgroundSize.includes('%');
    if (css.backgroundImage !== 'none' && !dotted) return 'unknown';
    const color = parse(css.backgroundColor);
    return color && color.a > 0 ? { ...color, a: color.a * opacityOf(el, slide) } : null;
  };

  // The composited background under `el` at (x, y); `self` counts the element's own background.
  const backgroundAt = (el, x, y, slide, self) => {
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return null;
    const stack = document.elementsFromPoint(x, y);
    // If the point misses the item (a gap in a dashed line, a tspan), what is under it is what
    // contains it or comes before it in the document, so a particle passing on top never counts.
    const at = stack.indexOf(el);
    const below = at >= 0 ? stack.slice(self ? at : at + 1)
      : stack.filter((node) => node.contains(el) || (node.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING));
    const layers = [];
    for (const node of below) {
      const layer = layerAt(node, x, y, slide);
      if (layer === 'unknown') return null;
      if (!layer) continue;
      layers.push(layer);
      if (layer.a >= 0.999) break;
    }
    return layers.reverse().reduce((under, top) => over(top, under), { r: 255, g: 255, b: 255, a: 1 });
  };

  let measured = 0;
  let unmeasured = 0;
  const found = [];
  const judge = (slideNumber, kind, el, text, paint, points, slide, self, size) => {
    if (!paint || paint.a <= 0.02) { unmeasured += 1; return; }
    let worst = null;
    for (const [x, y] of points) {
      const bg = backgroundAt(el, x, y, slide, self);
      if (!bg) { unmeasured += 1; return; }
      const fg = over(paint, bg);
      const value = ratio(fg, bg);
      if (!worst || value < worst.value) worst = { value, fg, bg };
    }
    if (!worst) return;
    measured += 1;
    if (worst.value < limits[kind]) {
      found.push({
        slide: slideNumber, kind, ratio: Math.round(worst.value * 100) / 100, need: limits[kind],
        fg: hex(worst.fg), bg: hex(worst.bg), where: describe(el), text: text.slice(0, 48), size
      });
    }
  };

  slides.forEach((slide) => { slide.removeAttribute('aria-hidden'); slide.removeAttribute('inert'); });
  slides.forEach((slide, index) => {
    slide.classList.add('active', 'contrast-now');
    slide.querySelectorAll('.step').forEach((step) => step.classList.add('shown'));
    const slideScale = slide.getBoundingClientRect().width / slide.offsetWidth || 1;

    const seen = new Set();
    const walker = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.textContent.replace(/\s+/g, ' ').trim();
      if (!/[\p{L}\p{N}]/u.test(text)) continue;
      let el = node.parentElement;
      while (el && /^(SUP|SUB)$/.test(el.tagName) && el.parentElement) el = el.parentElement;
      if (!el || el.closest('mjx-container') || el.closest(SKIP) || seen.has(el) || !shown(el, slide)) continue;
      seen.add(el);
      const range = document.createRange();
      range.selectNodeContents(node);
      const rect = range.getClientRects()[0];
      if (!rect || rect.width < 1 || rect.height < 1) continue;
      const css = getComputedStyle(el);
      const isSvg = el instanceof SVGElement;
      const fontSize = parseFloat(css.fontSize);
      const scale = isSvg ? Math.hypot(el.getScreenCTM()?.a ?? 1, el.getScreenCTM()?.b ?? 0) : (el.offsetWidth ? el.getBoundingClientRect().width / el.offsetWidth : slideScale);
      const size = Math.round(fontSize * scale / slideScale * 10) / 10;
      const large = size >= 32 || (size >= 24 && parseInt(css.fontWeight, 10) >= 700);
      const color = parse(isSvg ? css.fill : css.color);
      const paint = color && { ...color, a: color.a * (isSvg ? Number(css.fillOpacity) : 1) * opacityOf(el, slide) };
      const y = rect.top + rect.height / 2;
      const points = [0.25, 0.5, 0.75].map((f) => [rect.left + rect.width * f, y]);
      // A halo drawn behind an SVG label is the label's real background.
      const halo = isSvg && css.paintOrder.startsWith('stroke') && parseFloat(css.strokeWidth) * scale >= 2 ? parse(css.stroke) : null;
      if (halo && halo.a >= 0.999 && paint) {
        const value = ratio(over(paint, halo), halo);
        measured += 1;
        const kind = large ? 'large' : 'text';
        if (value < limits[kind]) found.push({ slide: index + 1, kind, ratio: Math.round(value * 100) / 100, need: limits[kind], fg: hex(over(paint, halo)), bg: hex(halo), where: describe(el), text: text.slice(0, 48), size });
        continue;
      }
      judge(index + 1, large ? 'large' : 'text', el, text, paint, points, slide, true, size);
    }

    // MathJax glyphs are paths: each equation counts as one text item in its computed color.
    slide.querySelectorAll('mjx-container').forEach((math) => {
      if (math.closest(SKIP) || !shown(math, slide)) return;
      const rect = math.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const css = getComputedStyle(math);
      const size = Math.round(parseFloat(css.fontSize) * 10) / 10;
      const large = size >= 32 || (size >= 24 && parseInt(css.fontWeight, 10) >= 700);
      const color = parse(css.color);
      const label = (math.querySelector('mjx-assistive-mml')?.textContent || math.getAttribute('aria-label') || 'math').replace(/\s+/g, ' ').trim();
      const paint = color && { ...color, a: color.a * opacityOf(math, slide) };
      const y = rect.top + rect.height / 2;
      judge(index + 1, large ? 'large' : 'text', math, label, paint, [[rect.left + rect.width / 2, y]], slide, true, size);
    });

    // Figure lines and arrows, sampled at the middle of the stroke; arrowheads as small filled shapes.
    slide.querySelectorAll('svg line, svg path, svg polyline, svg polygon').forEach((shape) => {
      if (shape.closest('mjx-container') || shape.closest(SKIP) || !shown(shape, slide)) return;
      const css = getComputedStyle(shape);
      const ctm = shape.getScreenCTM();
      if (!ctm) return;
      const scale = Math.hypot(ctm.a, ctm.b);
      const stroke = parse(css.stroke);
      const strokeWidth = parseFloat(css.strokeWidth) * scale / slideScale;
      if (css.stroke !== 'none' && strokeWidth >= 1.5) {
        if (!stroke) { unmeasured += 1; return; }
        const length = shape.getTotalLength();
        if (length * scale < 8) return;
        const mid = shape.getPointAtLength(length / 2);
        const x = ctm.a * mid.x + ctm.c * mid.y + ctm.e;
        const y = ctm.b * mid.x + ctm.d * mid.y + ctm.f;
        const paint = { ...stroke, a: stroke.a * Number(css.strokeOpacity) * opacityOf(shape, slide) };
        judge(index + 1, 'graphic', shape, '', paint, [[x, y]], slide, false, null);
        return;
      }
      if (shape.tagName.toLowerCase() === 'polygon' && css.fill !== 'none') {
        const box = shape.getBoundingClientRect();
        if (box.width < 3 || box.height < 3 || Math.max(box.width, box.height) / slideScale > 48) return;
        const x = box.left + box.width / 2;
        const y = box.top + box.height / 2;
        const point = localPoint(shape, x, y);
        if (!point || !shape.isPointInFill(point)) return;
        const fill = parse(css.fill);
        if (!fill) { unmeasured += 1; return; }
        const paint = { ...fill, a: fill.a * Number(css.fillOpacity) * opacityOf(shape, slide) };
        judge(index + 1, 'graphic', shape, 'arrowhead', paint, [[x, y]], slide, false, null);
      }
    });
    slide.classList.remove('active', 'contrast-now');
  });
  return { slides: slides.length, measured, unmeasured, found };
}

const textKey = (item) => `<${item.where}> ${item.text}`;
const contrastKey = (item) => `${item.theme} <${item.where}> ${item.text} | ${item.fg}${item.kind === 'graphic' ? '' : ` on ${item.bg}`}`;
const tally = (items, keyOf) => items.reduce((counts, item) => { counts[keyOf(item)] = (counts[keyOf(item)] || 0) + 1; return counts; }, {});
const readBaseline = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {});
const writeBaseline = (file, baseline) => {
  const sorted = Object.fromEntries(Object.keys(baseline).sort().map((deck) => [deck, Object.fromEntries(Object.entries(baseline[deck]).sort())]));
  writeFileSync(file, JSON.stringify(sorted, null, 1) + '\n');
  console.log(`Wrote ${file.slice(ROOT.length + 1)}.`);
};
// Each baseline entry allows that many copies of the same item. Returns the items beyond it.
const beyond = (items, entries, keyOf) => {
  const allowed = { ...(entries || {}) };
  return items.filter((item) => {
    const key = keyOf(item);
    if (allowed[key] > 0) { allowed[key] -= 1; return false; }
    return true;
  });
};

async function main() {
  const args = process.argv.slice(2);
  const update = args.includes('--update-baseline');
  const reportFile = args.find((arg) => arg.startsWith('--report='))?.slice('--report='.length);
  const named = args.filter((arg) => !arg.startsWith('--'));
  const decks = named.length ? named : allDecks();
  const textBaseline = readBaseline(TEXT_BASELINE);
  const contrastBaseline = readBaseline(CONTRAST_BASELINE);
  const everything = [];
  let known = 0;
  let failed = 0;
  let measuredTotal = 0;
  let unmeasuredTotal = 0;
  await checkPages(decks, {
    setup: ({ send }) => send('Emulation.setDeviceMetricsOverride', { ...VIEWPORT, deviceScaleFactor: 1, mobile: false }),
    check: async ({ send, open, evaluate }, deck) => {
      try {
        const scope = deck.startsWith('ibdpphy/') ? 'ibdpphy' : 'gcsephy';
        const load = async (theme, motion) => {
          await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: motion }] });
          const { identifier } = await send('Page.addScriptToEvaluateOnNewDocument', {
            source: `try { localStorage.setItem('panphy-theme-${scope}', '${theme}'); } catch {}`
          });
          const problems = await open(deck, SETTLE_MS);
          await send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
          if (problems.length) throw new Error(problems[0]);
          const actual = await evaluate(() => document.documentElement.dataset.theme);
          if (actual !== theme) throw new Error(`asked for the ${theme} theme, got ${actual}`);
        };
        const contrast = [];
        let slides = 0;
        let measured = 0;
        let unmeasured = 0;
        // Animated figures show different labels with reduced motion, so each check keeps its own mode:
        // text as students see it playing, contrast on the still figures.
        await load('light', 'no-preference');
        const { found: text } = await evaluate(measureText, { minPx: MIN_PX });
        for (const theme of THEMES) {
          await load(theme, 'reduce');
          const result = await evaluate(measureContrast, { limits: LIMITS });
          if (!result.slides) throw new Error('no slides found');
          slides = result.slides;
          measured += result.measured;
          unmeasured += result.unmeasured;
          contrast.push(...result.found.map((item) => ({ ...item, theme })));
        }
        return { result: { slides, measured, unmeasured, text, contrast } };
      } catch (error) {
        return { error: error.message.split('\n')[0] };
      }
    },
    report: (deck, { result, error }) => {
      if (error) {
        failed += 1;
        console.log(`✖ ${deck}\n    could not be checked: ${error}`);
        return;
      }
      measuredTotal += result.measured;
      unmeasuredTotal += result.unmeasured;
      everything.push(...result.contrast.map((item) => ({ deck, ...item })));
      if (update) {
        if (result.text.length) textBaseline[deck] = tally(result.text, textKey); else delete textBaseline[deck];
        if (result.contrast.length) contrastBaseline[deck] = tally(result.contrast, contrastKey); else delete contrastBaseline[deck];
        console.log(`• ${deck}: ${result.text.length} small text and ${result.contrast.length} contrast item(s) recorded`);
        return;
      }
      const freshText = beyond(result.text, textBaseline[deck], textKey);
      const freshContrast = beyond(result.contrast, contrastBaseline[deck], contrastKey);
      known += result.text.length - freshText.length + result.contrast.length - freshContrast.length;
      if (!freshText.length && !freshContrast.length) {
        console.log(`✔ ${deck} (${result.slides} slides)`);
        return;
      }
      failed += 1;
      console.log(`✖ ${deck}: ${freshText.length} new item(s) under ${MIN_PX}px, ${freshContrast.length} new contrast failure(s)`);
      for (const item of freshText) console.log(`    slide ${item.slide}: ${item.size}px <${item.where}> "${item.text}"`);
      for (const item of freshContrast) console.log(`    slide ${item.slide} (${item.theme}): ${item.ratio}:1, needs ${item.need}:1, ${item.fg} on ${item.bg} <${item.where}> "${item.text}"`);
    }
  });
  if (reportFile) {
    writeFileSync(reportFile, JSON.stringify([...everything].sort((a, b) => a.ratio - b.ratio), null, 1) + '\n');
    console.log(`\nWrote ${everything.length} failure(s) to ${reportFile}.`);
  }
  console.log(`\nMeasured ${measuredTotal} items for contrast; ${unmeasuredTotal} over photos, gradients or canvases were not judged.`);
  if (update) {
    writeBaseline(TEXT_BASELINE, textBaseline);
    writeBaseline(CONTRAST_BASELINE, contrastBaseline);
    process.exit(failed ? 2 : 0);
  }
  const note = known ? ` (${known} older item(s) are in the baselines)` : '';
  console.log(failed ? `${failed} of ${decks.length} decks have new text size or contrast problems${note}.` : `All ${decks.length} decks passed${note}.`);
  process.exit(failed ? 1 : 0);
}

main();
