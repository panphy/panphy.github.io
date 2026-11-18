// Accessibility and layout smoke check. Opens every page in sitemap.xml at phone size in headless
// Chrome, with touch emulated, and fails if a page:
//   - throws an uncaught error while loading,
//   - scrolls sideways,
//   - has no <h1>,
//   - shows a button, link or form control with no accessible name, or
//   - shows an image with no alt attribute.
// It needs only Node 22+ and Chrome: no packages. It serves the repository itself (headless.mjs).
//   node .github/scripts/a11y-smoke.mjs [path ...]     e.g. simulations/collision.html
// Set CHROME to the browser binary if it is not in a usual place.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, withBrowser } from './headless.mjs';

const VIEWPORT = { width: 375, height: 812 };
const SETTLE_MS = 1500;

// Errors that say more about the test browser than about the page: headless Chrome has no camera
// or microphone and may have no graphics card.
const IGNORED_ERRORS = [/webgl/i, /NotAllowedError/, /NotFoundError/, /getUserMedia/i, /Permission denied/i, /AudioContext/i];

function sitemapPages() {
  const xml = readFileSync(join(ROOT, 'sitemap.xml'), 'utf8');
  return [...xml.matchAll(/<loc>https:\/\/panphy\.app\/([^<]*)<\/loc>/g)].map((m) => m[1] || 'index.html');
}

// The audit that runs inside each page. Returns a list of problems, each a short sentence.
function auditPage() {
  const problems = [];
  const doc = document;
  const visible = (el) => {
    const box = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return box.width > 1 && box.height > 1 && style.visibility !== 'hidden' && style.display !== 'none' && !el.closest('[hidden], [aria-hidden="true"], [inert]');
  };
  const describe = (el) => {
    const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    return `<${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls}>`;
  };
  const textOf = (id) => (doc.getElementById(id)?.textContent || '').trim();
  const nameOf = (el) => {
    const labelledBy = (el.getAttribute('aria-labelledby') || '').split(/\s+/).map(textOf).join(' ').trim();
    if (labelledBy) return labelledBy;
    for (const attr of ['aria-label', 'title', 'alt', 'placeholder']) {
      const value = (el.getAttribute(attr) || '').trim();
      if (value) return value;
    }
    if (el.labels && [...el.labels].some((label) => label.textContent.trim())) return 'labelled';
    if (el.closest('label') && el.closest('label').textContent.trim()) return 'labelled';
    const text = (el.textContent || '').trim();
    if (text) return text;
    if (el.tagName === 'INPUT' && ['submit', 'button', 'reset'].includes(el.type) && el.value) return el.value;
    const inner = el.querySelector('img[alt]:not([alt=""]), svg[aria-label], svg title, [aria-label]');
    if (inner) return (inner.getAttribute('alt') || inner.getAttribute('aria-label') || inner.textContent || '').trim();
    return '';
  };

  const page = doc.scrollingElement;
  const overflow = page.scrollWidth - page.clientWidth;
  if (overflow > 1) problems.push(`scrolls sideways by ${overflow} px at ${innerWidth} px wide`);

  if (!doc.querySelector('h1')) problems.push('has no <h1>');

  const controls = [...doc.querySelectorAll('button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="tab"], [role="switch"], [role="slider"]')];
  const unnamed = controls.filter((el) => visible(el) && !nameOf(el));
  if (unnamed.length) problems.push(`${unnamed.length} control(s) with no accessible name: ${unnamed.slice(0, 5).map(describe).join(', ')}`);

  const noAlt = [...doc.images].filter((img) => visible(img) && !img.hasAttribute('alt'));
  if (noAlt.length) problems.push(`${noAlt.length} image(s) with no alt attribute: ${noAlt.slice(0, 5).map(describe).join(', ')}`);

  if (!doc.documentElement.lang) problems.push('has no lang attribute on <html>');
  if (!doc.title.trim()) problems.push('has no <title>');
  return problems;
}

async function main() {
  const pages = process.argv.slice(2).length ? process.argv.slice(2) : sitemapPages();
  const failed = await withBrowser(async ({ send, open, evaluate, errors }) => {
    await send('Emulation.setDeviceMetricsOverride', { ...VIEWPORT, deviceScaleFactor: 2, mobile: true });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    let failures = 0;
    for (const path of pages) {
      const problems = [];
      try {
        problems.push(...await open(path, SETTLE_MS));
        problems.push(...await evaluate(auditPage));
      } catch (error) {
        problems.push(`could not be checked: ${error.message}`);
      }
      const uncaught = errors().filter((text) => !IGNORED_ERRORS.some((pattern) => pattern.test(text)));
      for (const text of uncaught) problems.push(`uncaught error: ${text.split('\n')[0]}`);
      if (problems.length) {
        failures += 1;
        console.log(`✖ ${path}`);
        for (const problem of problems) console.log(`    ${problem}`);
      } else {
        console.log(`✔ ${path}`);
      }
    }
    return failures;
  });
  console.log(failed ? `\n${failed} of ${pages.length} pages have problems.` : `\nAll ${pages.length} pages passed.`);
  process.exit(failed ? 1 : 0);
}

main();
