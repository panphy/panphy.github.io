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
      textContent: '', disabled: false, style: {}, value: '', classList: { toggle() {} }, children: [],
      getContext: () => ({}), addEventListener() {}, removeAttribute() {},
      setAttribute(name, value) { this[name] = value; },
      getBoundingClientRect: () => ({ width: 900, height: 300 })
    });
    return elements.get(id);
  };
  const context = vm.createContext({
    document: { getElementById: element, addEventListener() {} },
    window: { addEventListener() {} },
    navigator: {}, localStorage: { getItem: () => null },
    ResizeObserver: class { observe() {} },
    requestAnimationFrame() {}, console, setTimeout, clearTimeout,
    alert(message) { throw new Error(message); }
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

function mockAudio(app) {
  app.run(`
    var requestCount = 0;
    var suspendCount = 0;
    var resumeCount = 0;
    var contexts = [];
    var makeStream = () => {
      const track = { readyState: 'live', addEventListener() {}, stop() { this.readyState = 'ended'; } };
      return { getAudioTracks: () => [track], getTracks: () => [track] };
    };
    navigator.mediaDevices = {
      getUserMedia: async () => { requestCount++; return makeStream(); }
    };
    window.AudioContext = class {
      constructor() { this.state = 'running'; this.sampleRate = 48000; contexts.push(this); }
      addEventListener() {} removeEventListener() {}
      createAnalyser() { return { context: this, fftSize: 2048, frequencyBinCount: 1024 }; }
      createMediaStreamSource(stream) {
        return { context: this, stream, connections: [], connect(node) {
          if (node.context !== this.context) throw new Error('Nodes belong to different contexts');
          this.connections.push(node);
        }, disconnect() { this.connections = []; } };
      }
      async suspend() { suspendCount++; this.state = 'suspended'; }
      async resume() { resumeCount++; this.state = 'running'; }
      async close() { this.state = 'closed'; }
    };
  `);
}

test('start, pause and resume preserve snapshots and live microphone processing', async () => {
  const app = loadAnalyzer();
  mockAudio(app);
  await app.run('startSpectrum()');
  assert.equal(app.run('isRunning'), true);
  assert.match(app.element('toggleBtn').innerHTML, /<svg.*aria-hidden="true"/);
  assert.match(app.element('toggleBtn').innerHTML, /<span>Pause<\/span>/);
  assert.equal(app.element('exportSpectrumBtn').disabled, true);
  app.run('dataArray[10] = 200; timeDomainData[0] = 0.5; pauseSpectrum();');
  assert.equal(app.element('exportSpectrumBtn').disabled, false);
  assert.equal(app.run('lastFreqFrame[10]'), 200);
  assert.equal(app.run('lastWaveFrame[0]'), 0.5);
  assert.equal(app.run('audioContext.state'), 'running');
  assert.equal(app.run('suspendCount'), 0);
  await app.run('toggleRunPause()');
  assert.equal(app.run('isRunning'), true);
  assert.equal(app.run('requestCount'), 1);
  assert.equal(app.run('source.connections.includes(analyzer) && source.connections.includes(peakAnalyzer)'), true);
  await app.run('resetAudioSession()');
  assert.equal(app.run('contexts[0].state'), 'closed');
  assert.equal(app.run('lastWaveFrame'), null);
});

for (const state of ['interrupted', 'closed']) {
  test(`resume rebuilds the audio graph after a context is ${state}`, async () => {
    const app = loadAnalyzer();
    mockAudio(app);
    await app.run('startSpectrum()');
    app.run(`pauseSpectrum(); var oldSource = source; audioContext.state = '${state}';`);
    await app.run('toggleRunPause()');
    assert.equal(app.run('isRunning'), true);
    assert.equal(app.run('contexts.length'), 2);
    assert.equal(app.run('analyzer !== null && peakAnalyzer !== null && source !== null'), true);
    assert.equal(app.run('source.context === audioContext'), true);
    assert.equal(app.run('source.connections.includes(analyzer) && source.connections.includes(peakAnalyzer)'), true);
    assert.equal(app.run('requestCount'), 1);
    assert.equal(app.run('oldSource.connections.length'), 0);
    assert.equal(app.run('contexts[0].state'), 'closed');
  });
}

test('resume replaces an ended microphone track', async () => {
  const app = loadAnalyzer();
  mockAudio(app);
  await app.run('startSpectrum()');
  app.run("pauseSpectrum(); microphoneStream.getAudioTracks()[0].readyState = 'ended';");
  await app.run('toggleRunPause()');
  assert.equal(app.run('isRunning'), true);
  assert.equal(app.run('requestCount'), 2);
  assert.equal(app.run('source.stream.getAudioTracks()[0].readyState'), 'live');
});

test('resume unlocks audio in the tap handler and ignores repeated taps while starting', async () => {
  const app = loadAnalyzer();
  mockAudio(app);
  await app.run('startSpectrum()');
  app.run(`
    pauseSpectrum(); audioContext.state = 'suspended';
    var finishResume;
    audioContext.resume = () => {
      resumeCount++;
      return new Promise(resolve => { finishResume = () => { audioContext.state = 'running'; resolve(); }; });
    };
  `);
  const starting = app.run('toggleRunPause()');
  assert.equal(app.run('resumeCount'), 1);
  assert.equal(app.run('isStarting'), true);
  await app.run('toggleRunPause()');
  assert.equal(app.run('resumeCount'), 1);
  app.run('finishResume()');
  await starting;
  assert.equal(app.run('isRunning'), true);
  assert.equal(app.run('isStarting'), false);
  assert.equal(app.element('toggleBtn').disabled, false);
});

test('a cold start resumes audio before waiting for microphone permission', async () => {
  const app = loadAnalyzer();
  mockAudio(app);
  app.run(`
    var BaseAudioContext = window.AudioContext;
    window.AudioContext = class extends BaseAudioContext {
      constructor() { super(); this.state = 'suspended'; }
    };
    navigator.mediaDevices.getUserMedia = async () => {
      if (resumeCount !== 1) throw new Error('User activation was lost before audio resumed');
      requestCount++;
      return makeStream();
    };
  `);
  const starting = app.run('toggleRunPause()');
  assert.equal(app.run('resumeCount'), 1);
  await starting;
  assert.equal(app.run('isRunning'), true);
  assert.equal(app.run('requestCount'), 1);
});

test('a blocked resume stays stopped and can be retried', async () => {
  const app = loadAnalyzer();
  mockAudio(app);
  await app.run('startSpectrum()');
  app.run(`
    pauseSpectrum(); audioContext.state = 'suspended';
    var realResume = audioContext.resume;
    audioContext.resume = () => new Promise(() => {});
    setTimeout = callback => { callback(); return 0; };
  `);
  await app.run('toggleRunPause()');
  assert.equal(app.run('isRunning'), false);
  assert.equal(app.run('isStarting'), false);
  assert.equal(app.element('toggleBtn').disabled, false);
  assert.equal(app.element('exportSpectrumBtn').disabled, false);
  app.run('audioContext.resume = realResume');
  await app.run('toggleRunPause()');
  assert.equal(app.run('isRunning'), true);
  assert.equal(app.run('requestCount'), 1);
});

test('an interruption during microphone permission does not report running', async () => {
  const app = loadAnalyzer();
  mockAudio(app);
  app.run(`
    navigator.mediaDevices.getUserMedia = async () => {
      audioContext.state = 'interrupted';
      return makeStream();
    };
  `);
  await app.run('toggleRunPause()');
  assert.equal(app.run('isRunning'), false);
  assert.equal(app.run('isStarting'), false);
  assert.equal(app.element('toggleBtn').disabled, false);
  await app.run('toggleRunPause()');
  assert.equal(app.run('isRunning'), true);
  assert.equal(app.run('source.context === audioContext'), true);
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

test('multiples of the peak stop at the count and at the highest frequency shown', () => {
  const app = loadAnalyzer();
  assert.deepEqual(JSON.parse(app.run('JSON.stringify(harmonicMultiples(440, 24000, 5))')),
    [1, 2, 3, 4, 5].map((n) => ({ n, frequency: 440 * n })));
  assert.deepEqual(JSON.parse(app.run('JSON.stringify(harmonicMultiples(9000, 24000, 5))')),
    [{ n: 1, frequency: 9000 }, { n: 2, frequency: 18000 }]);
  assert.equal(app.run('harmonicMultiples(0, 24000).length'), 0);
});

test('spectrum range fits the sound and ticks fall on round frequencies', () => {
  const app = loadAnalyzer();
  const binWidth = 48000 / 2048;
  // A note at about 300 Hz with harmonics up to about 900 Hz, over a quiet floor.
  app.run('var levels = new Uint8Array(1024).fill(10); levels[13] = 170; levels[26] = 120; levels[38] = 90;');
  const end = app.run(`autoSpectrumEndFrequency(levels, ${binWidth}, 24000)`);
  assert.equal(end, 1200);
  assert.equal(app.run(`autoSpectrumEndFrequency(new Uint8Array(1024), ${binWidth}, 24000)`), null);
  assert.equal(app.run(`autoSpectrumEndFrequency(levels.map((v, i) => i === 2 ? 200 : 0), ${binWidth}, 24000)`), 500);
  assert.deepEqual([...app.run('frequencyTicks(0, 1200, 5)')], [0, 250, 500, 750, 1000]);
  assert.equal(app.run('formatFrequencyTick(2500)'), '2.5 kHz');
  assert.equal(app.run('formatFrequencyTick(250)'), '250 Hz');
});

test('auto range widens at once and narrows only after a delay', () => {
  const app = loadAnalyzer();
  app.run('sampleRate = 48000; dataArray = new Uint8Array(1024);');
  app.run('dataArray[100] = 200; updateAutoRange(0);');
  assert.equal(app.run('autoRangeEndFrequency'), 3000);
  app.run('dataArray[100] = 0; dataArray[13] = 200; updateAutoRange(100); updateAutoRange(1000);');
  assert.equal(app.run('autoRangeEndFrequency'), 3000);
  app.run('updateAutoRange(1700);');
  assert.equal(app.run('autoRangeEndFrequency'), 500);
});

test('Full range shows every bin and turning it off returns to the fitted range', () => {
  const app = loadAnalyzer();
  app.run('sampleRate = 48000; analyzer = { frequencyBinCount: 1024 }; autoRangeEndFrequency = 1200;');
  assert.equal(app.run('getFrequencyZoomRange().endIndex'), 52);
  app.run('setFullRange(true)');
  assert.equal(app.run('getFrequencyZoomRange().endIndex'), 1023);
  assert.equal(app.element('fullRangeBtn')['aria-pressed'], 'true');
  app.run('setFrequencyZoom(5, 30)');
  assert.equal(app.run('getFrequencyZoomRange().endIndex'), 30);
  app.run('resetFrequencyZoom(); setFullRange(false)');
  assert.equal(app.run('getFrequencyZoomRange().endIndex'), 52);
});
