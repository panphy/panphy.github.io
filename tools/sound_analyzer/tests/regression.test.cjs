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

// The Blackman-windowed spectrum of a steady tone, in decibels, as an AnalyserNode reports it.
function toneSpectrumDb(frequency, sampleRate, size) {
  const re = new Float64Array(size / 2);
  const out = new Float32Array(size / 2);
  const center = Math.round(frequency / (sampleRate / size));
  for (let k = Math.max(1, center - 6); k <= Math.min(size / 2 - 1, center + 6); k++) {
    let real = 0, imag = 0;
    for (let n = 0; n < size; n++) {
      const window = 0.42 - 0.5 * Math.cos(2 * Math.PI * n / size) + 0.08 * Math.cos(4 * Math.PI * n / size);
      const sample = window * Math.sin(2 * Math.PI * frequency * n / sampleRate);
      const angle = 2 * Math.PI * k * n / size;
      real += sample * Math.cos(angle);
      imag -= sample * Math.sin(angle);
    }
    re[k] = Math.hypot(real, imag) / size;
  }
  for (let k = 0; k < out.length; k++) out[k] = re[k] > 0 ? 20 * Math.log10(re[k]) : -160;
  return out;
}

test('peak frequency is placed between bins, to within 1 Hz', () => {
  const app = loadAnalyzer();
  for (const frequency of [256, 261.6, 440, 445, 1000.7]) {
    for (const rate of [44100, 48000]) {
      app.run(`var spectrum = new Float32Array(${JSON.stringify([...toneSpectrumDb(frequency, rate, 16384)])});`);
      const found = app.run(`findPeakFrequency(spectrum, ${rate}, 16384, 20)`);
      assert.ok(Math.abs(found - frequency) < 1, `${frequency} Hz at ${rate} Hz read as ${found}`);
    }
  }
});

test('peak frequency ignores the lowest bins and reports silence as no peak', () => {
  const app = loadAnalyzer();
  app.run('var spectrum = new Float32Array(8192).fill(-120); spectrum[0] = -5; spectrum[1] = -6; spectrum[150] = -30; spectrum[149] = -40; spectrum[151] = -40;');
  const found = app.run('findPeakFrequency(spectrum, 48000, 16384, 20)');
  assert.ok(Math.abs(found - 150 * 48000 / 16384) < 0.01);
  app.run('var silent = new Float32Array(8192).fill(-Infinity);');
  assert.equal(app.run('findPeakFrequency(silent, 48000, 16384, 20)'), null);
});
