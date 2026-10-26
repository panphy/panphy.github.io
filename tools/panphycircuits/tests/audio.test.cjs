const test = require('node:test');
const assert = require('node:assert/strict');
require('../js/units.js');
require('../js/registry.js');
const circuit = require('../js/circuit.js');
const solver = require('../js/solver.js');
const { createAudio } = require('../js/audio.js');

function fixture({ dc = false, peak = 4, R = 8, silent = false, frequency = 440 } = {}) {
  const doc = circuit.createDoc();
  const supply = circuit.addComponent(doc, dc ? 'dcsupply' : 'acsupply', { props: { peak, emf: peak, freq: frequency } });
  const speaker = circuit.addComponent(doc, 'speaker', { props: { R, sound: !silent } });
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
      createOscillator() { const node = { frequency: { value: 0 }, connect() {}, disconnect() {}, start() { node.started = true; }, stop() { node.stopped = true; } }; sources.push(node); return node; }
      createGain() { const node = { connect() {}, disconnect() {}, gain: { value: 0, setTargetAtTime(value) { node.volume = value; } } }; gains.push(node); return node; }
    }
  };
  const app = { doc, sim }, audio = createAudio(app, host);
  events.click();
  function run() { sim.advance(0.1, Infinity, () => 0, audio.sample); audio.update(); }
  return { app, audio, doc, speaker, supply, host, sources, gains, events, run };
}

test('AC tone grows with current, and resistance reduces its volume', () => {
  const quiet = fixture({ peak: 1 }), loud = fixture({ peak: 4 }), resisted = fixture({ peak: 4, R: 32 });
  for (const f of [quiet, loud, resisted]) { f.run(); f.run(); assert.equal(f.sources.length, 1); assert.equal(f.sources[0].type, 'sine'); assert.equal(f.sources[0].frequency.value, 440); }
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
    (f) => { f.speaker.props.sound = false; },
    (f) => { f.app.sim.reset(); },
    (f) => { f.events.pagehide(); }
  ]) {
    const f = fixture(); f.run(); assert.equal(f.sources.length, 1);
    change(f); f.audio.update(); assert.equal(f.sources[0].stopped, true);
  }
});

test('audio can be unavailable without affecting simulation; mute survives export', () => {
  const f = fixture(); delete f.host.AudioContext;
  const audio = createAudio(f.app, f.host);
  assert.doesNotThrow(() => { f.events.click(); audio.sample(f.app.sim.step()); audio.update(); });
  f.speaker.props.sound = false;
  const loaded = circuit.importDoc(JSON.stringify(circuit.exportDoc(f.doc))).doc;
  assert.equal(loaded.components.find((c) => c.type === 'speaker').props.sound, false);
});

test('tone follows supply frequency without transposing low frequencies or simulation speed', () => {
  for (const frequency of [0.1, 1, 19, 20, 100, 440, 1000]) {
    const f = fixture({ frequency }); f.run(); f.run();
    if (frequency < 20) assert.equal(f.sources.length, 0);
    else {
      assert.equal(f.sources[0].frequency.value, frequency);
      f.doc.settings.speed = 0.1; f.run();
      assert.equal(f.sources[0].frequency.value, frequency);
    }
  }
});

test('changing frequency replaces the tone; changing to sub-audible stops it', () => {
  const f = fixture(); f.run();
  f.supply.props.freq = 880; f.app.sim.setDoc(f.doc); f.run();
  assert.equal(f.sources[0].stopped, true);
  assert.equal(f.sources[1].frequency.value, 880);
  f.supply.props.freq = 1; f.app.sim.setDoc(f.doc); f.run();
  assert.equal(f.sources[1].stopped, true);
  assert.equal(f.sources.length, 2);
});

test('separate networks use their own frequencies, not a global AC frequency', () => {
  const f = fixture();
  const supply = circuit.addComponent(f.doc, 'acsupply', { props: { peak: 4, freq: 880 } });
  const speaker = circuit.addComponent(f.doc, 'speaker');
  circuit.addWire(f.doc, { c: supply.id, t: 'p' }, { c: speaker.id, t: 'a' });
  circuit.addWire(f.doc, { c: supply.id, t: 'n' }, { c: speaker.id, t: 'b' });
  f.app.sim.setDoc(f.doc); f.run();
  assert.deepEqual(f.sources.map((s) => s.frequency.value).sort((a, b) => a - b), [440, 880]);
});

test('old music documents open with tones and keep a previously muted speaker muted', () => {
  for (const music of ['groove', 'arcade', 'ode', 'off']) {
    const f = fixture(); delete f.speaker.props.sound; f.speaker.props.music = music;
    const imported = circuit.importDoc(JSON.stringify(circuit.exportDoc(f.doc)));
    assert.equal(imported.warnings.length, 0);
    const props = imported.doc.components.find((c) => c.type === 'speaker').props;
    assert.equal(props.sound, music !== 'off');
    assert.equal('music' in props, false);
  }
});
