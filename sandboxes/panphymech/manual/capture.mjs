// Retakes the PanPhyMech manual screenshots in headless Chrome, driving the real app over the
// DevTools protocol. Needs Chrome, cwebp and a local server at the repository root:
//   python3 -m http.server 8000
//   node sandboxes/panphymech/manual/capture.mjs [pendulum|build|drive]
// Set CHROME to the browser binary and BASE to another server if needed.
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const OUT = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || 'http://localhost:8000';
const W = 1680, H = 980, PORT = 9333;
const TMP = mkdtempSync(join(tmpdir(), 'ppmech-capture-'));
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
  await send('Page.navigate', { url: BASE + '/sandboxes/panphymech.html' });
  for (let i = 0; i < 100; i++) {
    await sleep(200);
    const ok = await evaluate(`!!(window.PPM && PPM.app && PPM.app.examples && document.readyState === 'complete' && document.documentElement.dataset.math === 'ready')`).catch(() => false);
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

// Run the scene for n steps of 1/60 s and leave it paused.
const runSteps = (n) => evaluate(`(() => { const a = PPM.app; a.togglePlay(); a.togglePlay(); for (let i = 0; i < ${n}; i++) a.stepOnce(); return a.sim.t; })()`);

async function pendulum() {
  await open();
  await evaluate(`(async () => { const a = PPM.app; a.setGraphOpen(true); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); await a.openExample(a.examples.findIndex((e) => e.title === 'Simple pendulum')); a.select(null); return true; })()`);
  await capture('workspace');
  console.log('t =', await runSteps(392));
  await capture('run');
  await evaluate(`(() => { const a = PPM.app; const bob = a.scene.bodies.find((b) => b.name === 'Bob'); a.select({ type: 'body', id: bob.id }); return true; })()`);
  await capture('inspect');
  // Select a time interval, then hover near its end to read a sample.
  await evaluate(`(() => { const a = PPM.app; a.graphRange = { start: 1.35, end: 4.7 }; a.requestGraph(); return true; })()`);
  await frames(3);
  const rect = await evaluate(`(() => { const r = document.getElementById('graph-canvas').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()`);
  const hx = rect.x + 58 + (4.66 - 1.35) / (4.7 - 1.35) * (rect.w - 72);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: hx, y: rect.y + rect.h * 0.5 });
  await capture('graph');
  await evaluate(`document.getElementById('btn-file').click(); true`);
  await capture('file');
}

async function build() {
  await open();
  await evaluate(`(async () => {
    const a = PPM.app, S = PPM.scene;
    await a.openExample(a.examples.findIndex((e) => e.title === 'Motor car'));
    a.edit(() => {
      const sc = a.scene;
      sc.bodies = sc.bodies.filter((b) => b.name === 'Slope');
      sc.links = [];
      const add = (type, x, y, props) => { const b = Object.assign(S.makeBody(sc, type, x, y), props); sc.bodies.push(b); return b; };
      add('box', -4, 0.56, { name: 'Lower body', w: 2.1, h: 0.38, mass: 2, color: 'violet' });
      add('ball', -5.05, 0.56, { name: 'Ball 1', r: 0.19, mass: 0.3, color: 'pink' });
      add('ball', -2.95, 0.56, { name: 'Ball 2', r: 0.19, mass: 0.3, color: 'pink' });
      add('box', -4.15, 0.95, { name: 'Cabin', w: 0.9, h: 0.4, mass: 0.6, color: 'blue' });
      add('wedge', -3.7 + 0.5 / 3, 0.75 + 0.4 / 3, { name: 'Ramp 1', w: 0.5, h: 0.4, mass: 0.4, fixed: false, color: 'teal' });
      add('wedge', -4.6 - 0.35 / 3, 0.75 + 0.4 / 3, { name: 'Ramp 2', w: 0.35, h: 0.4, mass: 0.4, fixed: false, flip: true, color: 'teal' });
      a.selection = null;
    });
    a.fit({ minX: -5.6, maxX: -2.4, minY: 0, maxY: 1.5 });
    a.select({ type: 'body', id: a.scene.bodies.find((b) => b.name === 'Cabin').id });
    return true;
  })()`);
  await capture('build-1');
  await evaluate(`(() => {
    const a = PPM.app; const id = (n) => a.scene.bodies.find((b) => b.name === n).id;
    a.setMultiMode(true);
    a.select({ type: 'body', id: id('Lower body') });
    ['Ball 1', 'Ball 2', 'Cabin', 'Ramp 1', 'Ramp 2'].forEach((n) => a.toggleInSelection(id(n)));
    return a.selectedBodies().length;
  })()`);
  await capture('build-2');
  await evaluate(`(() => {
    const a = PPM.app, S = PPM.scene;
    a.mergeSelection();
    a.setMultiMode(false);
    a.edit(() => {
      const sc = a.scene;
      const body = S.bodyById(sc, a.selection.id);
      body.name = 'Car body'; body.mass = 4;
      const wheel = (x, name) => { const b = Object.assign(S.makeBody(sc, 'ball', x, 0.3), { name, r: 0.3, mass: 0.5, friction: 1, restitution: 0.1, color: 'slate' }); sc.bodies.push(b); return b; };
      const back = wheel(-4.7, 'Back wheel');
      const front = wheel(-3.3, 'Front wheel');
      const local = (w) => ({ x: w.x - body.x, y: w.y - body.y });
      const motor = Object.assign(S.makeLink(sc, 'motor', back.id, { x: 0, y: 0 }, body.id, local(back)), { name: 'Motor 1', speed: -8, dir: -1, torque: 20 });
      sc.links.push(motor);
      const hinge = Object.assign(S.makeLink(sc, 'hinge', front.id, { x: 0, y: 0 }, body.id, local(front)), { name: 'Hinge 1' });
      sc.links.push(hinge);
      a.selection = { type: 'link', id: motor.id };
    });
    a.select({ type: 'link', id: a.scene.links.find((l) => l.name === 'Motor 1').id });
    return true;
  })()`);
  await capture('build-3');
  await evaluate(`(() => {
    const a = PPM.app, S = PPM.scene;
    let cutter;
    a.edit(() => {
      cutter = Object.assign(S.makeBody(a.scene, 'ball', -4.7, 0.3), { name: 'Arch cutter', r: 0.36, color: 'coral' });
      a.scene.bodies.push(cutter);
    });
    a.setMultiMode(true);
    a.select({ type: 'body', id: a.scene.bodies.find((b) => b.name === 'Car body').id });
    a.toggleInSelection(cutter.id);
    return a.selectedBodies().length;
  })()`);
  await capture('build-4');
}

async function drive() {
  await open();
  await evaluate(`(async () => { const a = PPM.app; await a.openExample(a.examples.findIndex((e) => e.title === 'Motor car')); a.select(null); return true; })()`);
  console.log('t =', await runSteps(198));
  await capture('build-5');
}

try {
  await connect();
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `try { localStorage.removeItem('panphy-mech-scene-v1'); localStorage.removeItem('panphy-mech-prefs-v1'); localStorage.setItem('panphy-theme', 'light'); } catch (e) {}` });
  const only = process.argv[2];
  if (!only || only === 'pendulum') await pendulum();
  if (!only || only === 'build') await build();
  if (!only || only === 'drive') await drive();
} finally {
  try { ws && ws.close(); } catch (e) {}
  chrome.kill();
  await sleep(500);
  rmSync(TMP, { recursive: true, force: true });
}
