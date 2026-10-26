const test = require('node:test');
const assert = require('node:assert/strict');
require('../js/units.js');
require('../js/registry.js');
const circuit = require('../js/circuit.js');
const solver = require('../js/solver.js');
const { createAudio, createLoop } = require('../js/audio.js');

function fixture({ dc = false, peak = 4, R = 8, silent = false } = {}) {
  const doc = circuit.createDoc();
  const supply = circuit.addComponent(doc, dc ? 'dcsupply' : 'acsupply', { props: { peak, emf: peak, freq: 10 } });
  const speaker = circuit.addComponent(doc, 'speaker', { props: { R, music: silent ? 'off' : 'groove' } });
  circuit.addWire(doc, { c: supply.id, t: 'p' }, { c: speaker.id, t: 'a' });
  circuit.addWire(doc, { c: supply.id, t: 'n' }, { c: speaker.id, t: 'b' });
  // Unrelated AC must never make a DC speaker sing.
  if (dc) circuit.addComponent(doc, 'acsupply', { props: { freq: 10 } });
  const sim = solver.createSim(); sim.setDoc(doc); sim.setRunning(true);
  const events = {}, sources = [], gains = [];
  const host = {
    document: { hidden: false, addEventListener(name, fn) { events[name] = fn; } },
    addEventListener(name, fn) { events[name] = fn; },
    AudioContext: class {
      constructor() { this.state = 'running'; this.sampleRate = 8000; this.currentTime = 0; }
      createBuffer(ch, n) { return { getChannelData: () => new Float32Array(n) }; }
      createBufferSource() { const node = { connect() {}, disconnect() {}, start() { node.started = true; }, stop() { node.stopped = true; } }; sources.push(node); return node; }
      createGain() { const node = { connect() {}, disconnect() {}, gain: { value: 0, setTargetAtTime(value) { node.volume = value; } } }; gains.push(node); return node; }
    }
  };
  const app = { doc, sim }, audio = createAudio(app, host);
  events.click();
  function run() { sim.advance(0.1, Infinity, () => 0, audio.sample); audio.update(); }
  return { app, audio, doc, speaker, supply, host, sources, gains, events, run };
}

test('AC music grows with current, and resistance reduces its volume', () => {
  const quiet = fixture({ peak: 1 }), loud = fixture({ peak: 4 }), resisted = fixture({ peak: 4, R: 32 });
  for (const f of [quiet, loud, resisted]) { f.run(); f.run(); assert.equal(f.sources.length, 1); assert.ok(f.sources[0].loop); }
  assert.ok(loud.gains[0].volume > quiet.gains[0].volume);
  assert.ok(Math.abs(resisted.gains[0].volume - quiet.gains[0].volume) < 1e-8);
  // Rendering faster than solver time steps must not interrupt playback.
  loud.audio.update(); assert.equal(loud.sources[0].stopped, undefined);
});

test('steady DC, zero current and muted speakers stay silent even with AC elsewhere', () => {
  for (const options of [{ dc: true }, { peak: 0 }, { silent: true }]) {
    const f = fixture(options); for (let n = 0; n < 4; n++) f.run();
    assert.equal(f.sources.length, 0);
  }
});

test('pause, hiding, removal, opening the circuit and Off stop playback', () => {
  for (const change of [
    (f) => f.app.sim.setRunning(false),
    (f) => { f.host.document.hidden = true; f.events.visibilitychange(); },
    (f) => { f.doc.components = f.doc.components.filter((c) => c !== f.speaker); },
    (f) => { f.doc.wires = []; f.app.sim.setDoc(f.doc); },
    (f) => { f.speaker.props.music = 'off'; },
    (f) => { f.app.sim.reset(); },
    (f) => { f.events.pagehide(); }
  ]) {
    const f = fixture(); f.run(); assert.equal(f.sources.length, 1);
    change(f); f.audio.update(); assert.equal(f.sources[0].stopped, true);
  }
});

test('audio can be unavailable without affecting simulation; music selection survives export', () => {
  const f = fixture(); delete f.host.AudioContext;
  const audio = createAudio(f.app, f.host);
  assert.doesNotThrow(() => { f.events.click(); audio.sample(f.app.sim.step()); audio.update(); });
  f.speaker.props.music = 'ode';
  const loaded = circuit.importDoc(JSON.stringify(circuit.exportDoc(f.doc))).doc;
  assert.equal(loaded.components.find((c) => c.type === 'speaker').props.music, 'ode');
});

test('all arrangements are stereo, finite, below clipping, and join without a jump', () => {
  for (const rate of [44100, 48000]) for (const style of ['groove', 'arcade', 'ode']) {
    let channels;
    createLoop({ sampleRate: rate, createBuffer(count, n) {
      assert.equal(count, 2);
      channels = Array.from({ length: count }, () => new Float32Array(n));
      return { getChannelData: (ch) => channels[ch] };
    } }, style);
    let peak = 0, stereoDifference = 0, energy = 0;
    for (const channel of channels) {
      for (const value of channel) {
        assert.ok(Number.isFinite(value)); peak = Math.max(peak, Math.abs(value)); energy += value * value;
      }
      assert.ok(Math.abs(channel[0] - channel[channel.length - 1]) < 0.025, `${style} loop join`);
    }
    for (let i = 0; i < channels[0].length; i++) stereoDifference += Math.abs(channels[0][i] - channels[1][i]);
    const rms = Math.sqrt(energy / (channels[0].length * 2));
    assert.ok(peak > 0.7 && peak < 0.73);
    assert.ok(rms > 0.08 && rms < 0.3, `${style} RMS ${rms}`);
    assert.ok(stereoDifference / channels[0].length > 0.005);
  }
});

test('switching to classical music replaces the source and retains current-driven volume', () => {
  const f = fixture(); f.run();
  const volume = f.gains[0].volume;
  f.speaker.props.music = 'ode'; f.audio.update();
  assert.equal(f.sources[0].stopped, true);
  assert.equal(f.sources.length, 2);
  assert.notEqual(f.sources[0].buffer, f.sources[1].buffer);
  assert.equal(f.sources[1].loop, true);
  assert.equal(f.gains[1].volume, volume);
});
