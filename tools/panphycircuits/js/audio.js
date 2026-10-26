// Locally synthesized original and public-domain soundtracks. The circuit controls loudness,
// not pitch or tempo: these loops are an easter egg, not waveform sonification.
(function (root) {
  const PPC = root.PPC = root.PPC || {};

  function createLoop(context, style) {
    const classical = style === 'ode', arcade = style === 'arcade';
    const rate = context.sampleRate, beat = 60 / (classical ? 112 : 120), beats = 32;
    const buffer = context.createBuffer(2, Math.round(rate * beats * beat), rate);
    const channels = [buffer.getChannelData(0), buffer.getChannelData(1)];
    const size = channels[0].length;
    // Beethoven's public-domain melody; this accompaniment and performance are
    // synthesized here, with no borrowed recording or modern arrangement.
    // Melody reference: https://www.mutopiaproject.org/piece-info.cgi?id=528
    const ode = [
      [76, 1], [76, 1], [77, 1], [79, 1], [79, 1], [77, 1], [76, 1], [74, 1],
      [72, 1], [72, 1], [74, 1], [76, 1], [76, 1.5], [74, 0.5], [74, 2],
      [76, 1], [76, 1], [77, 1], [79, 1], [79, 1], [77, 1], [76, 1], [74, 1],
      [72, 1], [72, 1], [74, 1], [76, 1], [74, 1.5], [72, 0.5], [72, 2]
    ];
    const tune = arcade
      ? [72, 76, 79, 84, 83, 79, 76, 79, 81, 84, 88, 84, 79, 76, 74, 71,
        72, 79, 76, 84, 86, 84, 79, 76, 77, 81, 84, 81, 79, 77, 74, 79]
      : [76, 79, 0, 81, 79, 76, 74, 72, 74, 76, 79, 0, 76, 74, 72, 74,
        76, 79, 84, 83, 81, 79, 76, 79, 77, 81, 79, 76, 74, 71, 72, 0];
    const melody = classical ? ode : tune.map((pitch) => [pitch, 1]);
    // Major-key progression, warm seventh chords, and a resolving dominant.
    const chords = classical
      ? [[48, 52, 55], [43, 47, 50], [48, 52, 55], [43, 47, 50],
        [48, 52, 55], [43, 47, 50], [43, 47, 50], [48, 52, 55]]
      : [[48, 52, 55, 59], [43, 47, 50, 55], [45, 48, 52, 55], [41, 45, 48, 52],
        [48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 53]];

    function mix(index, value, pan) {
      index %= size;
      channels[0][index] += value * Math.sqrt((1 - pan) / 2);
      channels[1][index] += value * Math.sqrt((1 + pan) / 2);
    }
    function note(midi, start, length, level, instrument, pan = 0) {
      const hz = 440 * 2 ** ((midi - 69) / 12);
      const startIndex = Math.round(start * beat * rate);
      const seconds = length * beat, release = instrument === 'pad' ? 0.18 : 0.08;
      const count = Math.round((seconds + release) * rate);
      for (let j = 0; j < count; j++) {
        const t = j / rate, phase = 2 * Math.PI * hz * t;
        const attack = Math.min(1, t / (instrument === 'pad' ? 0.045 : 0.006));
        const tail = Math.max(0, Math.min(1, (seconds + release - t) / release));
        let wave, decay;
        if (instrument === 'bass') {
          wave = Math.sin(phase) + 0.22 * Math.sin(2 * phase);
          decay = Math.exp(-t * 2.5);
        } else if (instrument === 'bell') {
          wave = Math.sin(phase) + 0.35 * Math.sin(2 * phase) * Math.exp(-t * 6) +
            0.14 * Math.sin(4 * phase) * Math.exp(-t * 9);
          decay = Math.exp(-t * 2.6);
        } else {
          wave = Math.sin(phase) + 0.24 * Math.sin(2 * phase) + 0.1 * Math.sin(3 * phase);
          decay = Math.exp(-t * (instrument === 'pad' ? 0.7 : 4));
        }
        mix(startIndex + j, level * attack * tail * decay * wave, pan);
      }
    }
    function drum(start, kind) {
      const kick = kind === 'kick', snare = kind === 'snare';
      const length = kick ? 0.22 : snare ? 0.13 : 0.045;
      const startIndex = Math.round(start * beat * rate);
      let seed = 1 + Math.round(start * 1000);
      for (let j = 0; j < length * rate; j++) {
        const t = j / rate;
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const noise = seed / 2147483648 - 1;
        const value = kick
          ? 0.26 * Math.sin(2 * Math.PI * (52 * t + 4 * (1 - Math.exp(-35 * t)))) * Math.exp(-22 * t)
          : snare ? 0.09 * (noise * 0.75 + Math.sin(2 * Math.PI * 175 * t) * 0.25) * Math.exp(-35 * t)
            : 0.035 * noise * Math.exp(-90 * t);
        mix(startIndex + j, value * Math.min(1, t / 0.002), kick ? 0 : snare ? -0.12 : 0.35);
      }
    }

    let position = 0;
    for (const [pitch, length] of melody) {
      if (pitch) note(pitch, position, length * 0.88, 0.23, classical || arcade ? 'bell' : 'keys', -0.08);
      position += length;
    }
    for (let bar = 0; bar < 8; bar++) {
      const chord = chords[bar], start = bar * 4;
      for (let n = 0; n < chord.length; n++) {
        note(chord[n] + 12, start, 3.6, 0.055, 'pad', n % 2 ? -0.6 : 0.6);
      }
      for (let b = 0; b < 4; b++) {
        // Root/fifth bass, light offbeat piano, and a sparkling eighth-note arp.
        note(chord[0] + (b % 2 ? 7 : 0), start + b, 0.68, 0.23, 'bass');
        for (const pitch of chord.slice(1)) note(pitch + 12, start + b + 0.5, 0.28, 0.055, 'keys', -0.45);
        for (let half = 0; half < 2; half++) {
          const n = (b * 2 + half) % chord.length;
          note(chord[n] + 24, start + b + half * 0.5, 0.22, classical ? 0.035 : 0.055, 'bell', 0.5);
          drum(start + b + half * 0.5, 'hat');
        }
        if (b % 2 === 0) drum(start + b, 'kick');
        else drum(start + b, 'snare');
      }
    }
    // Circular stereo reflections let the final notes ring into the next loop,
    // rather than cutting their tails at the buffer boundary.
    const dry = channels.map((channel) => channel.slice());
    for (const [delay, level] of [[0.75, 0.16], [1.5, 0.08]]) {
      const offset = Math.round(delay * beat * rate);
      for (let channel = 0; channel < 2; channel++) {
        for (let i = 0; i < size; i++) channels[channel][(i + offset) % size] += dry[1 - channel][i] * level;
      }
    }
    let peak = 0;
    for (const channel of channels) for (const value of channel) peak = Math.max(peak, Math.abs(value));
    // Consistent headroom across arrangements; current remains the volume knob.
    if (peak > 0) for (const channel of channels) for (let i = 0; i < size; i++) channel[i] *= 0.72 / peak;
    return buffer;
  }

  function createAudio(app, host = root) {
    let context, compiled;
    const buffers = new Map(), voices = new Map(), signals = new Map();
    function stop() {
      for (const voice of voices.values()) { voice.source.stop(); voice.source.disconnect(); voice.gain.disconnect(); }
      voices.clear();
      signals.clear();
    }
    function allowed() { return !host.document.hidden && app.sim.running; }
    function unlock() {
      if (!allowed() || !app.doc.components.some((c) => c.type === 'speaker' && c.props.music !== 'off')) return;
      const AudioContext = host.AudioContext || host.webkitAudioContext;
      if (!AudioContext) return;
      try {
        if (!context) context = new AudioContext();
        if (context.state === 'suspended') context.resume().catch(() => {});
      } catch (e) { /* Audio is optional when unsupported or blocked. */ }
    }
    // Run after the app's gesture handlers, so Play can first start the clock.
    host.document.addEventListener('click', unlock);
    host.document.addEventListener('keydown', unlock);
    host.document.addEventListener('visibilitychange', () => { if (host.document.hidden) stop(); });
    host.addEventListener('pagehide', stop);

    function sample(result) {
      if (compiled !== app.sim.compiled) { stop(); compiled = app.sim.compiled; }
      if (!allowed() || !Number.isFinite(compiled.acMin)) return;
      // Every solver step contributes, avoiding frame-rate aliases. A smoothed
      // variance removes steady DC, including DC in a separate circuit with AC.
      const alpha = -Math.expm1(-app.sim.dt * compiled.acMin * 4);
      for (const c of app.doc.components) {
        if (c.type !== 'speaker' || c.props.music === 'off') continue;
        const i = PPC.solver.reader(result, c).i('a');
        if (!Number.isFinite(i)) { signals.delete(c.id); continue; }
        let s = signals.get(c.id);
        if (!s) { s = { mean: i, variance: 0, peak: 0, sampled: false, current: 0 }; signals.set(c.id, s); }
        const delta = i - s.mean;
        s.mean += alpha * delta;
        s.variance = (1 - alpha) * (s.variance + alpha * delta * delta);
        s.peak = Math.max(s.peak, Math.abs(i));
        s.sampled = true;
      }
    }

    function update() {
      if (!allowed() || compiled !== app.sim.compiled) { stop(); return; }
      const active = new Set();
      const speakers = app.doc.components.filter((c) => c.type === 'speaker' && c.props.music !== 'off');
      for (const c of speakers) {
        const s = signals.get(c.id);
        // Exact open circuits silence immediately, without a lingering envelope.
        if (s && s.sampled) {
          s.current = s.peak > 1e-9 ? Math.sqrt(Math.max(0, s.variance)) : 0;
          s.peak = 0; s.sampled = false;
        }
        const current = s ? s.current : 0;
        if (!(current > 1e-5) || !context || context.state !== 'running') continue;
        active.add(c.id);
        const style = ['arcade', 'ode'].includes(c.props.music) ? c.props.music : 'groove';
        let voice = voices.get(c.id);
        if (voice && voice.style !== style) { voice.source.stop(); voice.source.disconnect(); voice.gain.disconnect(); voices.delete(c.id); voice = null; }
        if (!voice) {
          if (!buffers.has(style)) buffers.set(style, createLoop(context, style));
          const source = context.createBufferSource(), gain = context.createGain();
          source.buffer = buffers.get(style); source.loop = true;
          gain.gain.value = 0;
          source.connect(gain); gain.connect(context.destination); source.start();
          voice = { source, gain, style }; voices.set(c.id, voice);
        }
        // 0.25 A gives half the maximum gain. Bound the sum for many speakers.
        const volume = 0.65 * current / (current + 0.25) / Math.max(1, speakers.length);
        voice.gain.gain.setTargetAtTime(volume, context.currentTime, 0.06);
      }
      for (const [id, voice] of voices) {
        if (active.has(id)) continue;
        voice.source.stop(); voice.source.disconnect(); voice.gain.disconnect(); voices.delete(id);
      }
    }
    return { sample, update, stop };
  }

  PPC.audio = { createAudio, createLoop };
  if (typeof module === 'object' && module.exports) module.exports = PPC.audio;
})(typeof globalThis === 'object' ? globalThis : this);
