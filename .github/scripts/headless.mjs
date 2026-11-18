// Headless Chrome for the page checks (a11y-smoke.mjs, deck-text.mjs): serves the repository on a
// local port and drives one Chrome tab over the DevTools protocol. Needs Node 22+ and Chrome only.
// Set CHROME to the browser binary if it is not in a usual place.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const LOAD_TIMEOUT_MS = 20000;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.wasm': 'application/wasm', '.csv': 'text/csv; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml'
};

export const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

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

// Runs `task` with a browser: { send, open(path) → load problems, evaluate(fn) → value, errors() }.
// Exits 2 when Chrome is missing or fails; otherwise returns what `task` returns.
export async function withBrowser(task) {
  const chromePath = findChrome();
  if (!chromePath) {
    console.error('Chrome was not found. Set CHROME to the browser binary.');
    process.exit(2);
  }
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  const profile = mkdtempSync(join(tmpdir(), 'panphy-check-'));
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

    const open = async (path, settleMs) => {
      errors = [];
      await send('Page.navigate', { url: `${base}/${path}` });
      const started = Date.now();
      for (;;) {
        const state = await send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true });
        if (state.result.value === 'complete') break;
        if (Date.now() - started > LOAD_TIMEOUT_MS) return ['did not finish loading'];
        await sleep(150);
      }
      await sleep(settleMs);
      return [];
    };
    const evaluate = async (fn, arg) => {
      const result = await send('Runtime.evaluate', {
        expression: `(${fn.toString()})(${JSON.stringify(arg ?? null)})`, returnByValue: true, awaitPromise: true
      });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    const outcome = await task({ send, open, evaluate, errors: () => errors });
    cleanUp();
    return outcome;
  } catch (error) {
    console.error(error.message);
    cleanUp();
    process.exit(2);
  }
}
