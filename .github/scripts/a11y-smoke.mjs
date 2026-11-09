// Accessibility and layout smoke check. Opens every page in sitemap.xml at phone size in headless
// Chrome, with touch emulated, and fails if a page:
//   - throws an uncaught error while loading,
//   - scrolls sideways,
//   - has no <h1>,
//   - shows a button, link or form control with no accessible name, or
//   - shows an image with no alt attribute.
// It needs only Node 22+ and Chrome: no packages. It serves the repository itself.
//   node .github/scripts/a11y-smoke.mjs [path ...]     e.g. simulations/collision.html
// Set CHROME to the browser binary if it is not in a usual place.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const VIEWPORT = { width: 375, height: 812 };
const SETTLE_MS = 1500;
const LOAD_TIMEOUT_MS = 20000;

// Errors that say more about the test browser than about the page: headless Chrome has no camera
// or microphone and may have no graphics card.
const IGNORED_ERRORS = [/webgl/i, /NotAllowedError/, /NotFoundError/, /getUserMedia/i, /Permission denied/i, /AudioContext/i];

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.wasm': 'application/wasm', '.csv': 'text/csv; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml'
};

function sitemapPages() {
  const xml = readFileSync(join(ROOT, 'sitemap.xml'), 'utf8');
  return [...xml.matchAll(/<loc>https:\/\/panphy\.app\/([^<]*)<\/loc>/g)].map((m) => m[1] || 'index.html');
}

function startServer() {
  const server = createServer((req, res) => {
    let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = normalize(join(ROOT, path));
    if (file !== ROOT && !file.startsWith(ROOT + sep)) { res.writeHead(403).end(); return; }
    if (!existsSync(file) || !statSync(file).isFile()) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(readFileSync(file));
  });
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done(server)));
}

function findChrome() {
  const candidates = [
    process.env.CHROME,
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser', '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  ];
  return candidates.find((path) => path && existsSync(path));
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

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
  const chromePath = findChrome();
  if (!chromePath) {
    console.error('Chrome was not found. Set CHROME to the browser binary.');
    process.exit(2);
  }
  const pages = process.argv.slice(2).length ? process.argv.slice(2) : sitemapPages();
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  const profile = mkdtempSync(join(tmpdir(), 'panphy-a11y-'));
  const debugPort = 9300 + Math.floor(Math.random() * 500);
  const chrome = spawn(chromePath, [
    '--headless=new', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
    '--enable-unsafe-swiftshader', '--use-angle=swiftshader',
    ...(process.env.CI ? ['--no-sandbox', '--disable-dev-shm-usage'] : []),
    'about:blank'
  ], { stdio: 'ignore' });

  let socket;
  let nextId = 1;
  const pending = new Map();
  let errors = [];
  const send = (method, params = {}) => {
    const id = nextId++;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((done, fail) => pending.set(id, { done, fail, method }));
  };
  const cleanUp = () => {
    try { socket?.close(); } catch { /* already closed */ }
    chrome.kill();
    server.close();
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome may still hold it */ }
  };

  try {
    for (let attempt = 0; !socket; attempt++) {
      try {
        const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
        const target = targets.find((t) => t.type === 'page');
        if (target) {
          socket = new WebSocket(target.webSocketDebuggerUrl);
          await new Promise((done, fail) => { socket.onopen = done; socket.onerror = fail; });
        }
      } catch { /* not up yet */ }
      if (!socket) {
        if (attempt > 75) throw new Error('Chrome did not start');
        await sleep(200);
      }
    }
    socket.onmessage = (message) => {
      const data = JSON.parse(message.data);
      if (data.id && pending.has(data.id)) {
        const { done, fail, method } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) fail(new Error(`${method}: ${data.error.message}`)); else done(data.result);
      } else if (data.method === 'Runtime.exceptionThrown') {
        const details = data.params.exceptionDetails;
        errors.push((details.exception && details.exception.description) || details.text || 'Uncaught error');
      }
    };

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Network.enable');
    // Always test the files on disk, never a service worker's cached copy.
    await send('Network.setBypassServiceWorker', { bypass: true });
    await send('Emulation.setDeviceMetricsOverride', { ...VIEWPORT, deviceScaleFactor: 2, mobile: true });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

    let failed = 0;
    for (const path of pages) {
      errors = [];
      const problems = [];
      try {
        await send('Page.navigate', { url: `${base}/${path}` });
        const started = Date.now();
        for (;;) {
          const state = await send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true });
          if (state.result.value === 'complete') break;
          if (Date.now() - started > LOAD_TIMEOUT_MS) { problems.push('did not finish loading'); break; }
          await sleep(150);
        }
        await sleep(SETTLE_MS);
        const result = await send('Runtime.evaluate', { expression: `(${auditPage.toString()})()`, returnByValue: true });
        if (result.exceptionDetails) problems.push(`the audit could not run: ${result.exceptionDetails.text}`);
        else problems.push(...result.result.value);
      } catch (error) {
        problems.push(`could not be checked: ${error.message}`);
      }
      const uncaught = errors.filter((text) => !IGNORED_ERRORS.some((pattern) => pattern.test(text)));
      for (const text of uncaught) problems.push(`uncaught error: ${text.split('\n')[0]}`);
      if (problems.length) {
        failed += 1;
        console.log(`✖ ${path}`);
        for (const problem of problems) console.log(`    ${problem}`);
      } else {
        console.log(`✔ ${path}`);
      }
    }
    console.log(failed ? `\n${failed} of ${pages.length} pages have problems.` : `\nAll ${pages.length} pages passed.`);
    cleanUp();
    process.exit(failed ? 1 : 0);
  } catch (error) {
    console.error(error.message);
    cleanUp();
    process.exit(2);
  }
}

main();
