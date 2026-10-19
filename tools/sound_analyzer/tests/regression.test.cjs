const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Run the page's actual analysis script without requesting a real microphone.
function loadAnalyzer() {
  const html = fs.readFileSync(path.join(__dirname, '../../sound_analyzer.html'), 'utf8');
  const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1]).find((source) => source.includes('const SQUARE_GRID_SPACING'));
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, {
      textContent: '', disabled: false, style: {}, value: '', classList: { toggle() {} },
      getContext: () => ({}), addEventListener() {}, removeAttribute() {},
      getBoundingClientRect: () => ({ width: 900, height: 300 })
    });
    return elements.get(id);
  };
  const context = vm.createContext({
    document: { getElementById: element, addEventListener() {} },
    window: { addEventListener() {} },
    navigator: {}, localStorage: { getItem: () => null },
    ResizeObserver: class { observe() {} },
    requestAnimationFrame() {}, console, setTimeout, clearTimeout
  });
  vm.runInContext(script, context);
  return { run: (code) => vm.runInContext(code, context), element };
}

test('marker timing spans sample intervals, including a zoomed waveform', () => {
  const app = loadAnalyzer();
  app.run('timeDomainData = new Float32Array(2048); sampleRate = 48000; waveCanvasSize.width = 900;');
  app.run('updateTimeDeltaDisplay(0, 900)');
  assert.equal(app.element('time-delta-value').textContent, '42.65 ms');
  app.run('waveTimeScale = 4; updateTimeDeltaDisplay(225, 675)');
  assert.equal(app.element('time-delta-value').textContent, '5.32 ms');
});

test('grid legend and markers use the same time span', () => {
  const app = loadAnalyzer();
  app.run('timeDomainData = new Float32Array(2048); sampleRate = 48000; waveTimeScale = 2; waveCanvasSize = { width: 900, height: 300 };');
  app.run('updateGridLegend(1); updateTimeDeltaDisplay(0, 45);');
  assert.equal(app.element('gridTimeDiv').textContent, '1.07 ms');
  assert.equal(app.element('time-delta-value').textContent, '1.07 ms');
});

test('Space leaves focused controls and held-key repeats alone', () => {
  const app = loadAnalyzer();
  app.run('var toggleCount = 0; toggleRunPause = () => { toggleCount++; };');
  for (const tag of ['input', 'button', 'select', 'summary', 'a', 'textarea', '[contenteditable]']) {
    app.run(`handleGlobalSpaceShortcut({ code: 'Space', repeat: false, target: { closest: (selector) => selector.includes('${tag}') }, preventDefault: () => { throw new Error('Native key handling blocked'); } })`);
  }
  app.run("handleGlobalSpaceShortcut({ code: 'Space', repeat: true })");
  assert.equal(app.run('toggleCount'), 0);
  app.run("handleGlobalSpaceShortcut({ code: 'Space', target: { closest: () => null }, preventDefault() {} })");
  assert.equal(app.run('toggleCount'), 1);
});

test('start, pause and resume preserve snapshots and microphone stream', async () => {
  const app = loadAnalyzer();
  app.run(`
    var requestCount = 0;
    var track = { readyState: 'live', addEventListener() {}, stop() { this.readyState = 'ended'; } };
    navigator.mediaDevices = {
      getUserMedia: async () => { requestCount++; return { getAudioTracks: () => [track], getTracks: () => [track] }; }
    };
    window.AudioContext = class {
      constructor() { this.state = 'running'; this.sampleRate = 48000; }
      addEventListener() {} removeEventListener() {}
      createAnalyser() { return { fftSize: 2048, frequencyBinCount: 1024 }; }
      createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
      async suspend() { this.state = 'suspended'; }
      async resume() { this.state = 'running'; }
      async close() { this.state = 'closed'; }
    };
  `);
  await app.run('startSpectrum()');
  assert.equal(app.run('isRunning'), true);
  assert.match(app.element('toggleBtn').innerHTML, /<svg.*aria-hidden="true"/);
  assert.match(app.element('toggleBtn').innerHTML, /<span>Pause<\/span>/);
  assert.equal(app.element('exportSpectrumBtn').disabled, true);
  app.run('dataArray[10] = 200; timeDomainData[0] = 0.5; pauseSpectrum();');
  assert.equal(app.element('exportSpectrumBtn').disabled, false);
  assert.equal(app.run('lastFreqFrame[10]'), 200);
  assert.equal(app.run('lastWaveFrame[0]'), 0.5);
  await app.run('toggleRunPause()');
  assert.equal(app.run('isRunning'), true);
  assert.equal(app.run('requestCount'), 1);
  await app.run('resetAudioSession()');
  assert.equal(app.run('track.readyState'), 'ended');
  assert.equal(app.run('lastWaveFrame'), null);
});
