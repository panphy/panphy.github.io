// Headless Chrome for the page checks (a11y-smoke.mjs, deck-text.mjs): serves the repository on a
// local port and drives Chrome tabs over the DevTools protocol, a few pages at once if asked.
// Needs Node 22+ and Chrome only. Set CHROME to the browser binary if it is not in a usual place,
// and PAGE_CHECK_TABS to override the number of tabs a check asks for.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const LOAD_TIMEOUT_MS = 45000; // catches hangs; pages sharing the CPU can load slowly

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

const LAUNCH_ATTEMPTS = 3;
const LAUNCH_TIMEOUT_MS = 20000;

// Starts Chrome on a free debugging port (it writes the port to DevToolsActivePort in its profile)
// and connects to its tab. Resolves { chrome, profile, port, socket }, or rejects with the reason and the
// end of Chrome's own error output, having killed it and removed its profile.
async function launchChrome(chromePath) {
  const profile = mkdtempSync(join(tmpdir(), 'panphy-check-'));
  const chrome = spawn(chromePath, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
    '--enable-unsafe-swiftshader', '--use-angle=swiftshader',
    ...(process.env.CI ? ['--no-sandbox', '--disable-dev-shm-usage'] : []),
    'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  chrome.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-4000); });
  let exited = null;
  chrome.on('exit', (code, signal) => { exited = signal ? `signal ${signal}` : `code ${code}`; });
  chrome.on('error', (error) => { exited = error.message; });

  const started = Date.now();
  let socket = null;
  let port = 0;
  let reason = 'no response';
  while (!socket) {
    if (exited) { reason = `Chrome exited (${exited})`; break; }
    if (Date.now() - started > LAUNCH_TIMEOUT_MS) { reason = `no response in ${LAUNCH_TIMEOUT_MS / 1000} s`; break; }
    try {
      const portFile = join(profile, 'DevToolsActivePort');
      if (existsSync(portFile)) {
        port = Number(readFileSync(portFile, 'utf8').split('\n')[0]);
        const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
        const target = targets.find((t) => t.type === 'page');
        if (target) {
          const candidate = new WebSocket(target.webSocketDebuggerUrl);
          await new Promise((done, fail) => { candidate.onopen = done; candidate.onerror = fail; });
          socket = candidate;
        }
      }
    } catch { /* not up yet */ }
    if (!socket) await sleep(200);
  }
  if (socket) return { chrome, profile, port, socket };
  chrome.kill('SIGKILL');
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome may still hold it */ }
  const tail = stderr.trim().split('\n').slice(-15).join('\n');
  throw new Error(tail ? `${reason}. Chrome said:\n${tail}` : reason);
}

// Opens another tab and connects to it.
async function openTab(port) {
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((done, fail) => { socket.onopen = done; socket.onerror = fail; });
  return socket;
}

// One tab: { send, open(path) → load problems, evaluate(fn) → value, errors() }, each with its own
// connection, so uncaught errors and settings belong to the page that tab is showing.
async function makeTab(socket, base) {
  let nextId = 1;
  const pending = new Map();
  let errors = [];
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
  const send = (method, params = {}) => {
    const id = nextId++;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((done, fail) => pending.set(id, { done, fail, method }));
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  // Always test the files on disk, never a service worker's cached copy.
  await send('Network.setBypassServiceWorker', { bypass: true });
  // Every tab renders and runs animation frames as if it were the one in front.
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });

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
  return { send, open, evaluate, errors: () => errors, close: () => { try { socket.close(); } catch { /* already closed */ } } };
}

// Checks `items` in `tabs` tabs at once. SwiftShader renders on the CPU and pages settle for a
// fixed time, so pages that keep animating (decks) need one tab; a few suit lighter pages. `setup(tab)` runs once per tab (viewport and the like);
// `check(tab, item)` returns that item's result; `report(item, result)` is called in the items'
// order, whichever finishes first. Exits 2 when Chrome is missing or fails.
export async function checkPages(items, { tabs: wanted = 1, setup = async () => {}, check, report }) {
  const chromePath = findChrome();
  if (!chromePath) {
    console.error('Chrome was not found. Set CHROME to the browser binary.');
    process.exit(2);
  }
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;

  // Chrome occasionally fails to come up on a busy CI runner; a fresh launch usually works.
  let launched = null;
  for (let attempt = 1; attempt <= LAUNCH_ATTEMPTS && !launched; attempt++) {
    try {
      launched = await launchChrome(chromePath);
    } catch (error) {
      console.error(`Chrome launch ${attempt} of ${LAUNCH_ATTEMPTS} failed: ${error.message}`);
    }
  }
  if (!launched) {
    console.error('Chrome did not start');
    server.close();
    process.exit(2);
  }
  const { chrome, profile, port, socket } = launched;
  const tabs = [];
  const cleanUp = () => {
    for (const tab of tabs) tab.close();
    try { socket.close(); } catch { /* already closed */ }
    chrome.kill();
    server.close();
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome may still hold it */ }
  };

  try {
    const count = Math.min(Math.max(1, Number(process.env.PAGE_CHECK_TABS) || wanted), items.length) || 1;
    tabs.push(await makeTab(socket, base));
    while (tabs.length < count) tabs.push(await makeTab(await openTab(port), base));
    for (const tab of tabs) await setup(tab);

    const results = new Array(items.length);
    let next = 0;
    let reported = 0;
    const flush = () => {
      while (reported < items.length && reported in results) {
        report(items[reported], results[reported]);
        reported += 1;
      }
    };
    await Promise.all(tabs.map(async (tab) => {
      while (next < items.length) {
        const index = next++;
        results[index] = await check(tab, items[index]);
        flush();
      }
    }));
    cleanUp();
  } catch (error) {
    console.error(error.message);
    cleanUp();
    process.exit(2);
  }
}
