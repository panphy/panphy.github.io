// Sine tones follow the AC supplies in the speaker’s electrical network.
(function (root) {
  const PPC = root.PPC = root.PPC || {};

  function createAudio(app, host = root) {
    let context, compiled;
    const voices = new Map(), signals = new Map();
    let speakers = [], frequencies = new Map();
    function stopVoice(voice) {
      for (const oscillator of voice.oscillators) { oscillator.stop(); oscillator.disconnect(); }
      voice.gain.disconnect();
    }
    function stop() {
      for (const voice of voices.values()) stopVoice(voice);
      voices.clear();
      signals.clear();
    }
    function allowed() { return !host.document.hidden && app.sim.running; }
    function unlock() {
      if (!allowed() || !app.doc.components.some((c) => c.type === 'speaker' && c.props.sound !== false)) return;
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

    function prepare() {
      stop(); compiled = app.sim.compiled;
      speakers = app.doc.components.filter((c) => c.type === 'speaker');
      frequencies = new Map();
      if (!compiled) return;
      for (const c of app.doc.components) {
        if (c.type !== 'acsupply' || !(c.props.peak > 0)) continue;
        const network = compiled.networkOf[compiled.netOf.get(c.id + ':p')];
        if (!frequencies.has(network)) frequencies.set(network, new Set());
        frequencies.get(network).add(c.props.freq);
      }
    }

    function sample(result) {
      if (compiled !== app.sim.compiled) prepare();
      if (!allowed() || !Number.isFinite(compiled.acMin)) return;
      // Every solver step contributes, avoiding frame-rate aliases. A smoothed
      // variance removes steady DC, including DC in a separate circuit with AC.
      for (const c of speakers) {
        if (c.props.sound === false) continue;
        const network = compiled.networkOf[compiled.netOf.get(c.id + ':a')];
        const tones = [...(frequencies.get(network) || [])];
        if (!tones.length) continue;
        const alpha = -Math.expm1(-app.sim.dt * Math.min(...tones) * 4);
        const i = PPC.solver.reader(result, c).i('a');
        if (!Number.isFinite(i)) { signals.delete(c.id); continue; }
        let s = signals.get(c.id);
        if (!s) { s = { mean: i, variance: 0, peak: 0, sampled: false, current: 0, tones }; signals.set(c.id, s); }
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
      const enabled = app.doc.components.filter((c) => c.type === 'speaker' && c.props.sound !== false);
      for (const c of enabled) {
        const s = signals.get(c.id);
        // Exact open circuits silence immediately, without a lingering envelope.
        if (s && s.sampled) {
          s.current = s.peak > 1e-9 ? Math.sqrt(Math.max(0, s.variance)) : 0;
          s.peak = 0; s.sampled = false;
        }
        const current = s ? s.current : 0;
        if (!(current > 1e-5) || !context || context.state !== 'running') continue;
        active.add(c.id);
        // Keep sub-audible inputs silent; never transpose them into a tone.
        const tones = s.tones.filter((frequency) => frequency >= 20 && frequency <= 20000);
        if (!tones.length) { active.delete(c.id); continue; }
        let voice = voices.get(c.id);
        if (!voice) {
          const gain = context.createGain();
          gain.gain.value = 0;
          gain.connect(context.destination);
          const oscillators = tones.map((frequency) => {
            const oscillator = context.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.value = frequency;
            oscillator.connect(gain); oscillator.start();
            return oscillator;
          });
          voice = { oscillators, gain }; voices.set(c.id, voice);
        }
        // 0.25 A gives half the maximum gain. Bound the sum for many speakers.
        const volume = 0.65 * current / (current + 0.25) / Math.max(1, enabled.length) / tones.length;
        voice.gain.gain.setTargetAtTime(volume, context.currentTime, 0.06);
      }
      for (const [id, voice] of voices) {
        if (active.has(id)) continue;
        stopVoice(voice); voices.delete(id);
      }
    }
    return { sample, update, stop };
  }

  PPC.audio = { createAudio };
  if (typeof module === 'object' && module.exports) module.exports = PPC.audio;
})(typeof globalThis === 'object' ? globalThis : this);
