// Retakes the PanPhyCircuits manual screenshots in headless Chrome, driving the real app over the
// DevTools protocol. Needs Chrome, cwebp and a local server at the repository root:
//   python3 -m http.server 8000
//   node sandboxes/panphycircuits/manual/capture.mjs
// Set CHROME to the browser binary and BASE to another server if needed.
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const OUT = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || 'http://localhost:8000';
const W = 1680, H = 980, PORT = 9333;
const TMP = mkdtempSync(join(tmpdir(), 'ppcir-capture-'));
const PROFILE = join(TMP, 'profile');

const chrome = spawn(process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
  '--hide-scrollbars', `--window-size=${W},${H}`, '--no-first-run', '--no-default-browser-check', 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, nextId = 1;
const pending = new Map();
function send(method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject, method }));
}
async function evaluate(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error('JS error: ' + JSON.stringify(r.exceptionDetails).slice(0, 800));
  return r.result.value;
}

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) {
        ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
        ws.onmessage = (m) => {
          const msg = JSON.parse(m.data);
          if (msg.id && pending.has(msg.id)) {
            const p = pending.get(msg.id); pending.delete(msg.id);
            if (msg.error) p.reject(new Error(p.method + ': ' + msg.error.message)); else p.resolve(msg.result);
          }
        };
        return;
      }
    } catch (e) { /* not up yet */ }
    await sleep(200);
  }
  throw new Error('Chrome did not start');
}

const frames = (n = 3) => evaluate(`new Promise((r) => { let i = 0; const f = () => (++i >= ${n} ? r(true) : requestAnimationFrame(f)); requestAnimationFrame(f); })`);

async function open() {
  await send('Page.navigate', { url: BASE + '/sandboxes/panphycircuits.html' });
  for (let i = 0; i < 100; i++) {
    await sleep(200);
    const ok = await evaluate(`!!(window.PPC && PPC.app && PPC.app.doc && document.readyState === 'complete')`).catch(() => false);
    if (ok) break;
    if (i === 99) throw new Error('app did not load');
  }
  await evaluate('document.fonts.ready.then(() => true)');
  await evaluate(`PanPhyTheme.set('light'); true`);
  await frames(4);
}

async function settle() {
  await evaluate(`(() => { const t = document.getElementById('toast'); if (t) t.hidden = true; return true; })()`);
  await frames(4);
  await sleep(250);
  await evaluate(`(() => { const t = document.getElementById('toast'); if (t) t.hidden = true; return true; })()`);
  await frames(2);
}

async function capture(name) {
  for (const theme of ['light', 'dark']) {
    await evaluate(`PanPhyTheme.set('${theme}'); true`);
    await settle();
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    const png = join(TMP, `${name}-${theme}.png`);
    writeFileSync(png, Buffer.from(data, 'base64'));
    execFileSync('cwebp', ['-quiet', '-q', '90', png, '-o', join(OUT, `${name}-${theme}.webp`)]);
    console.log('captured', name, theme);
  }
  await evaluate(`PanPhyTheme.set('light'); true`);
  await frames(2);
}

// The walkthrough uses Examples → Ammeter and voltmeter connections throughout.
async function walkthrough() {
  await open();
  await evaluate(`(async () => {
    const a = PPC.app;
    if (!a.examples.length) await a.loadExamples();
    a.setView('realistic');
    await a.loadExample(a.examples.findIndex((e) => e.title === 'Ammeter and voltmeter connections'));
    a.setSelection([], [], false);
    return true;
  })()`);
  await sleep(500);
  await capture('realistic');
  await evaluate(`(() => {
    const a = PPC.app;
    a.doc.components.find((c) => c.label === 'S1').props.closed = true;
    a.commit('Close switch');
    return true;
  })()`);
  await sleep(1500);
  await capture('operate');
  await evaluate(`(() => { const a = PPC.app; a.setSelection([a.doc.components.find((c) => c.label === 'V1').id], []); return true; })()`);
  await capture('meters');
  await evaluate(`(() => { const a = PPC.app; a.setSelection([], [], false); a.setView('schematic'); return true; })()`);
  await sleep(500);
  await capture('diagram');
  await evaluate(`document.getElementById('btn-file').click(); true`);
  await capture('file');
}

try {
  await connect();
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `try { localStorage.clear(); localStorage.setItem('panphy-theme', 'light'); } catch (e) {}` });
  await walkthrough();
} finally {
  try { ws && ws.close(); } catch (e) {}
  chrome.kill();
  await sleep(500);
  rmSync(TMP, { recursive: true, force: true });
}
