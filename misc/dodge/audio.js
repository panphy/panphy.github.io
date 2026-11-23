// Asteroid Storm sound: an original chiptune loop and effects, synthesized with Web Audio.
// The loop adds layers as the level rises. Nothing is loaded from files.

const STEP = 60 / 148 / 4; // a sixteenth note at 148 bpm
const LOOKAHEAD = 0.15;
const MUTE_KEY = 'dodgeMuted';

const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

// Eight bars in A minor: Am F C G | Am F G E. Roots for the bass, triads for the arpeggio.
const BARS = [
  { root: 45, chord: [57, 60, 64] },
  { root: 41, chord: [57, 60, 65] },
  { root: 48, chord: [55, 60, 64] },
  { root: 43, chord: [55, 59, 62] },
  { root: 45, chord: [57, 60, 64] },
  { root: 41, chord: [57, 60, 65] },
  { root: 43, chord: [55, 59, 62] },
  { root: 40, chord: [56, 59, 64] },
];

// Lead melody: [step, midi note, length in steps] per bar.
const LEAD = [
  [[0, 69, 3], [3, 72, 2], [5, 76, 3], [8, 74, 2], [10, 72, 2], [12, 71, 2], [14, 69, 2]],
  [[0, 65, 2], [2, 69, 2], [4, 72, 4], [8, 69, 2], [10, 72, 2], [12, 77, 4]],
  [[0, 76, 3], [3, 74, 1], [4, 72, 2], [6, 67, 2], [8, 72, 2], [10, 76, 2], [12, 79, 4]],
  [[0, 77, 2], [2, 76, 2], [4, 74, 4], [8, 71, 2], [10, 74, 2], [12, 67, 4]],
  [[0, 69, 2], [2, 76, 2], [4, 81, 4], [8, 79, 2], [10, 76, 2], [12, 72, 4]],
  [[0, 77, 2], [2, 76, 2], [4, 72, 2], [6, 69, 2], [8, 72, 4], [12, 74, 4]],
  [[0, 74, 2], [2, 71, 2], [4, 67, 2], [6, 71, 2], [8, 74, 2], [10, 79, 2], [12, 77, 4]],
  [[0, 76, 4], [4, 68, 2], [6, 71, 2], [8, 76, 4], [12, 74, 2], [14, 71, 2]],
];
const BASS_PATTERN = [0, 0, 12, 0, 0, 12, 0, 7];

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicBus = null;
  let sfxBus = null;
  let noise = null;
  let pulse = null;
  let thin = null;
  let muted = false;
  let playing = false;
  let intensity = 1;
  let nextTime = 0;
  let step = 0;
  let timer = null;

  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch {}

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch { return false; }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    master.connect(comp).connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.55;
    musicBus.connect(master);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.9;
    sfxBus.connect(master);

    const length = ctx.sampleRate;
    noise = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;

    pulse = pulseWave(0.5);
    thin = pulseWave(0.125);
    return true;
  }

  function pulseWave(duty) {
    const n = 32;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let k = 1; k < n; k += 1) imag[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    return ctx.createPeriodicWave(real, imag);
  }

  function tone({ freq, start, length, wave = 'square', gain = 0.2, bus = musicBus, slideTo = null, attack = 0.004, release = 0.06 }) {
    const osc = ctx.createOscillator();
    if (wave instanceof PeriodicWave) osc.setPeriodicWave(wave);
    else osc.type = wave;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + length);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(gain, start + attack);
    env.gain.setValueAtTime(gain, start + Math.max(attack, length - release));
    env.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(env).connect(bus);
    osc.start(start);
    osc.stop(start + length + 0.02);
  }

  function hiss({ start, length, gain = 0.2, type = 'highpass', freq = 6000, sweepTo = null, bus = musicBus }) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, start);
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, start + length);
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, start);
    env.gain.exponentialRampToValueAtTime(0.0001, start + length);
    src.connect(filter).connect(env).connect(bus);
    src.start(start, Math.random() * 0.5);
    src.stop(start + length + 0.02);
  }

  function kick(t) {
    tone({ freq: 150, slideTo: 40, start: t, length: 0.16, wave: 'sine', gain: 0.6, release: 0.1 });
  }

  function scheduleStep(s, t) {
    const bar = BARS[Math.floor(s / 16) % BARS.length];
    const inBar = s % 16;
    const melody = LEAD[Math.floor(s / 16) % LEAD.length];

    if (inBar % 2 === 0) {
      tone({ freq: mtof(bar.root + BASS_PATTERN[inBar / 2]), start: t, length: STEP * 1.8, wave: 'triangle', gain: 0.32 });
    }
    if (inBar === 0 || inBar === 8 || (intensity >= 4 && (inBar === 6 || inBar === 14))) kick(t);
    if (intensity >= 2 && (inBar === 4 || inBar === 12)) {
      hiss({ start: t, length: 0.14, gain: 0.22, type: 'bandpass', freq: 1800 });
      tone({ freq: 220, slideTo: 120, start: t, length: 0.08, wave: 'triangle', gain: 0.18 });
    }
    if (intensity >= 3 && inBar % 2 === 1) hiss({ start: t, length: 0.04, gain: 0.08 });
    if (intensity >= 4) {
      const note = bar.chord[inBar % 3] + 12 * (inBar % 6 < 3 ? 1 : 0);
      tone({ freq: mtof(note), start: t, length: STEP * 0.9, wave: thin, gain: 0.05 });
    }
    for (const [at, midi, len] of melody) {
      if (at === inBar) tone({ freq: mtof(midi), start: t, length: STEP * len * 0.95, wave: pulse, gain: 0.09, release: 0.05 });
    }
  }

  function tick() {
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      scheduleStep(step, nextTime);
      nextTime += STEP;
      step = (step + 1) % (BARS.length * 16);
    }
  }

  function startMusic() {
    if (!ensure() || playing) return;
    playing = true;
    step = 0;
    nextTime = ctx.currentTime + 0.05;
    tick();
    timer = setInterval(tick, 25);
  }

  function stopMusic() {
    playing = false;
    if (timer) clearInterval(timer);
    timer = null;
  }

  function sfx(name) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime + 0.01;
    const bus = sfxBus;
    switch (name) {
      case 'start':
        [60, 64, 67, 72].forEach((m, i) => tone({ freq: mtof(m + 12), start: t + i * 0.06, length: 0.09, wave: pulse, gain: 0.14, bus }));
        break;
      case 'stage':
        hiss({ start: t, length: 0.6, gain: 0.18, type: 'bandpass', freq: 600, sweepTo: 5000, bus });
        [72, 76, 79, 84].forEach((m, i) => tone({ freq: mtof(m), start: t + 0.1 + i * 0.07, length: 0.1, wave: pulse, gain: 0.1, bus }));
        break;
      case 'warp':
        hiss({ start: t, length: 1.6, gain: 0.3, type: 'bandpass', freq: 300, sweepTo: 6000, bus });
        tone({ freq: 55, slideTo: 440, start: t, length: 1.6, wave: thin, gain: 0.08, bus, release: 0.4 });
        break;
      case 'go':
        tone({ freq: mtof(81), start: t, length: 0.08, wave: pulse, gain: 0.13, bus });
        tone({ freq: mtof(88), start: t + 0.09, length: 0.22, wave: pulse, gain: 0.13, bus });
        break;
      case 'warn':
        [0, 0.16].forEach((d) => tone({ freq: 988, start: t + d, length: 0.08, wave: 'square', gain: 0.06, bus }));
        break;
      case 'comet':
        hiss({ start: t, length: 0.5, gain: 0.25, type: 'bandpass', freq: 5000, sweepTo: 700, bus });
        break;
      case 'split':
        hiss({ start: t, length: 0.35, gain: 0.35, type: 'lowpass', freq: 2500, sweepTo: 200, bus });
        tone({ freq: 90, slideTo: 45, start: t, length: 0.2, wave: 'triangle', gain: 0.3, bus });
        break;
      case 'power':
        [67, 71, 74, 79, 83].forEach((m, i) => tone({ freq: mtof(m + 5), start: t + i * 0.045, length: 0.07, wave: pulse, gain: 0.11, bus }));
        break;
      case 'wave':
        tone({ freq: 160, slideTo: 38, start: t, length: 0.45, wave: 'sine', gain: 0.6, bus, release: 0.3 });
        hiss({ start: t, length: 0.5, gain: 0.35, type: 'bandpass', freq: 400, sweepTo: 4000, bus });
        [72, 79, 84].forEach((m, i) => tone({ freq: mtof(m), start: t + 0.05 + i * 0.05, length: 0.1, wave: pulse, gain: 0.08, bus }));
        break;
      case 'shield':
        tone({ freq: 1400, slideTo: 200, start: t, length: 0.35, wave: 'square', gain: 0.1, bus });
        hiss({ start: t, length: 0.3, gain: 0.25, type: 'highpass', freq: 3000, bus });
        break;
      case 'near':
        hiss({ start: t, length: 0.12, gain: 0.12, type: 'bandpass', freq: 3000, sweepTo: 900, bus });
        break;
      case 'crash':
        hiss({ start: t, length: 1.1, gain: 0.7, type: 'lowpass', freq: 4000, sweepTo: 120, bus });
        tone({ freq: 110, slideTo: 30, start: t, length: 0.5, wave: 'triangle', gain: 0.5, bus });
        break;
      case 'over':
        [76, 74, 72, 69, 64].forEach((m, i) => tone({ freq: mtof(m), start: t + 0.55 + i * 0.16, length: i === 4 ? 0.5 : 0.14, wave: pulse, gain: 0.12, bus }));
        break;
      case 'blip':
        tone({ freq: mtof(79), start: t, length: 0.05, wave: pulse, gain: 0.1, bus });
        break;
      default:
        break;
    }
  }

  function setMuted(next) {
    muted = Boolean(next);
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch {}
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.5, ctx.currentTime, 0.02);
  }

  return {
    unlock: ensure,
    startMusic,
    stopMusic,
    sfx,
    setMuted,
    isMuted: () => muted,
    setIntensity: (level) => { intensity = level; },
  };
}
