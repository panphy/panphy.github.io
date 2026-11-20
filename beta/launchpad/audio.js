// Sound made in code: engine roar, rushing air and a few cues. No audio files.
export class Sound {
  constructor() {
    this.enabled = true;
    this.context = null;
  }

  // Browsers only allow sound after a tap or key press, so this is called from one.
  start() {
    if (this.context || !this.enabled) { this.context?.resume(); return; }
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    const context = new Context();
    this.context = context;
    this.master = context.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(context.destination);

    // Two seconds of brown noise, looped.
    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i += 1) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
    const source = (rate) => {
      const node = context.createBufferSource();
      node.buffer = buffer;
      node.loop = true;
      node.playbackRate.value = rate;
      node.start();
      return node;
    };
    this.engineFilter = context.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineGain = context.createGain();
    this.engineGain.gain.value = 0;
    source(1).connect(this.engineFilter).connect(this.engineGain).connect(this.master);

    this.crackleFilter = context.createBiquadFilter();
    this.crackleFilter.type = 'bandpass';
    this.crackleFilter.frequency.value = 1800;
    this.crackleGain = context.createGain();
    this.crackleGain.gain.value = 0;
    source(2.7).connect(this.crackleFilter).connect(this.crackleGain).connect(this.master);

    this.windFilter = context.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.Q.value = 0.6;
    this.windGain = context.createGain();
    this.windGain.gain.value = 0;
    source(1.9).connect(this.windFilter).connect(this.windGain).connect(this.master);
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.context.currentTime, 0.05);
  }

  // power 0..1; air 0..1 (1 at sea level); wind 0..1 from dynamic pressure; heard from farther away, quieter.
  update(power, air, wind, distance) {
    if (!this.context) return;
    const now = this.context.currentTime;
    const near = 1 / (1 + distance / 400);
    // In thin air only the hull carries the sound: quieter and duller.
    const carried = 0.25 + 0.75 * air;
    this.engineGain.gain.setTargetAtTime(power * (0.2 + 0.8 * near) * carried * 0.85, now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(90 + 900 * air * (0.4 + 0.6 * power), now, 0.1);
    this.crackleGain.gain.setTargetAtTime(power * air * near * 0.22, now, 0.08);
    this.windGain.gain.setTargetAtTime(Math.min(1, wind) * 0.5, now, 0.2);
    this.windFilter.frequency.setTargetAtTime(300 + 1400 * Math.min(1, wind), now, 0.2);
  }

  tone(frequency, duration, type = 'sine', volume = 0.2, delay = 0) {
    if (!this.context || !this.enabled) return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
    return oscillator;
  }

  thump() {
    const oscillator = this.tone(110, 0.5, 'sine', 0.6);
    oscillator?.frequency.exponentialRampToValueAtTime(35, this.context.currentTime + 0.4);
    this.tone(900, 0.06, 'square', 0.08);
  }

  success() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.16, i * 0.11)); }
  failure() {
    const oscillator = this.tone(60, 1.6, 'sawtooth', 0.5);
    oscillator?.frequency.exponentialRampToValueAtTime(25, this.context.currentTime + 1.4);
  }
  click() { this.tone(1200, 0.04, 'square', 0.04); }
}
