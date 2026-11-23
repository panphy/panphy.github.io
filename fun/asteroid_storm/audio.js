// Asteroid Storm sound: an original chiptune track for each stage, and effects, all
// synthesized with Web Audio. Nothing is loaded from files.

const LOOKAHEAD = 0.15;
const MUTE_KEY = 'dodgeMuted';
const MUSIC_LEVEL = 0.55;
const SWITCH_FADE = 0.45; // s the old track fades down before the new one starts on a downbeat
const SWITCH_RISE = 0.9; // s the new track takes to fade back up

const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

// Bass lines: [step in the bar, semitones above the root, length in steps].
const eighths = (ints) => ints.map((iv, i) => [i * 2, iv, 2]);
const sixteenths = (ints) => ints.map((iv, i) => [i, iv, 1]);

// One track per stage. Each bar has a bass root and a triad for arpeggios; the lead is
// [step, midi note, length in steps] per bar. Drums list the steps they hit in each bar.
const SONGS = [
  { // Stage 1, Dust Belt: A minor, the original theme.
    bpm: 148, lead: 'pulse50', leadGain: 0.09, bassWave: 'triangle', bassGain: 0.32,
    bass: eighths([0, 0, 12, 0, 0, 12, 0, 7]),
    kick: [0, 8], snare: [4, 12], hat: 0, arp: 0,
    bars: [
      [45, [57, 60, 64]], [41, [57, 60, 65]], [48, [55, 60, 64]], [43, [55, 59, 62]],
      [45, [57, 60, 64]], [41, [57, 60, 65]], [43, [55, 59, 62]], [40, [56, 59, 64]],
    ],
    melody: [
      [[0, 69, 3], [3, 72, 2], [5, 76, 3], [8, 74, 2], [10, 72, 2], [12, 71, 2], [14, 69, 2]],
      [[0, 65, 2], [2, 69, 2], [4, 72, 4], [8, 69, 2], [10, 72, 2], [12, 77, 4]],
      [[0, 76, 3], [3, 74, 1], [4, 72, 2], [6, 67, 2], [8, 72, 2], [10, 76, 2], [12, 79, 4]],
      [[0, 77, 2], [2, 76, 2], [4, 74, 4], [8, 71, 2], [10, 74, 2], [12, 67, 4]],
      [[0, 69, 2], [2, 76, 2], [4, 81, 4], [8, 79, 2], [10, 76, 2], [12, 72, 4]],
      [[0, 77, 2], [2, 76, 2], [4, 72, 2], [6, 69, 2], [8, 72, 4], [12, 74, 4]],
      [[0, 74, 2], [2, 71, 2], [4, 67, 2], [6, 71, 2], [8, 74, 2], [10, 79, 2], [12, 77, 4]],
      [[0, 76, 4], [4, 68, 2], [6, 71, 2], [8, 76, 4], [12, 74, 2], [14, 71, 2]],
    ],
  },
  { // Stage 2, Iron Belt: D minor, driving and punchy.
    bpm: 156, lead: 'pulse25', leadGain: 0.085, bassWave: 'triangle', bassGain: 0.34,
    bass: eighths([0, 0, 12, 0, 0, 7, 12, 7]),
    kick: [0, 8, 10], snare: [4, 12], hat: 2, arp: 0,
    bars: [
      [38, [62, 65, 69]], [34, [58, 62, 65]], [36, [60, 64, 67]], [33, [57, 60, 64]],
      [38, [62, 65, 69]], [34, [58, 62, 65]], [31, [55, 58, 62]], [33, [57, 61, 64]],
    ],
    melody: [
      [[0, 74, 2], [2, 74, 1], [3, 77, 2], [6, 76, 2], [8, 74, 4], [12, 69, 2], [14, 72, 2]],
      [[0, 70, 3], [3, 74, 3], [6, 77, 2], [8, 76, 2], [10, 74, 2], [12, 72, 4]],
      [[0, 72, 2], [2, 76, 2], [4, 79, 4], [8, 77, 2], [10, 76, 2], [12, 74, 2], [14, 72, 2]],
      [[0, 69, 4], [4, 72, 2], [6, 76, 2], [8, 81, 6], [14, 79, 2]],
      [[0, 77, 2], [2, 76, 1], [3, 74, 3], [6, 72, 2], [8, 74, 4], [12, 77, 4]],
      [[0, 82, 2], [2, 81, 2], [4, 77, 4], [8, 74, 2], [10, 77, 2], [12, 74, 4]],
      [[0, 79, 2], [2, 77, 2], [4, 74, 2], [6, 70, 2], [8, 74, 4], [12, 79, 4]],
      [[0, 76, 4], [4, 73, 2], [6, 76, 2], [8, 81, 4], [12, 79, 2], [14, 76, 2]],
    ],
  },
  { // Stage 3, Ice Field: E minor, airy, an echoing lead over glittering arpeggios.
    bpm: 132, lead: 'triangle', leadGain: 0.16, echo: true, bassWave: 'triangle', bassGain: 0.3,
    bass: [[0, 0, 7], [8, 0, 4], [12, 7, 4]],
    kick: [0, 10], snare: [], hat: 4, arp: 1, arpUp: 12, arpGain: 0.035,
    bars: [
      [40, [64, 67, 71]], [36, [64, 67, 72]], [43, [62, 67, 71]], [38, [62, 66, 69]],
      [40, [64, 67, 71]], [36, [64, 67, 72]], [45, [64, 69, 72]], [47, [63, 66, 71]],
    ],
    melody: [
      [[0, 76, 6], [6, 79, 2], [8, 83, 6], [14, 81, 2]],
      [[0, 79, 4], [4, 76, 4], [8, 72, 8]],
      [[0, 74, 4], [4, 79, 4], [8, 83, 4], [12, 86, 4]],
      [[0, 81, 8], [8, 78, 4], [12, 74, 4]],
      [[0, 76, 4], [4, 83, 4], [8, 88, 4], [12, 86, 4]],
      [[0, 84, 6], [6, 83, 2], [8, 79, 8]],
      [[0, 81, 4], [4, 76, 4], [8, 72, 4], [12, 76, 4]],
      [[0, 78, 8], [8, 75, 4], [12, 71, 4]],
    ],
  },
  { // Stage 4, Magma Rift: C minor, heavy, a chugging bass, galloping kick and tom fills.
    bpm: 164, lead: 'pulse50', leadGain: 0.085, bassWave: 'square', bassGain: 0.11,
    bass: sixteenths([0, 0, 0, 12, 0, 0, 7, 0, 0, 0, 0, 12, 0, 10, 7, 0]),
    kick: [0, 3, 8, 11], snare: [4, 12], hat: 2, arp: 0, fill: true,
    bars: [
      [36, [60, 63, 67]], [32, [60, 63, 68]], [34, [58, 62, 65]], [31, [59, 62, 67]],
      [36, [60, 63, 67]], [32, [60, 63, 68]], [29, [60, 65, 68]], [31, [59, 62, 67]],
    ],
    melody: [
      [[0, 72, 3], [3, 75, 3], [6, 79, 2], [8, 78, 2], [10, 79, 6]],
      [[0, 80, 3], [3, 79, 3], [6, 75, 2], [8, 72, 4], [12, 75, 4]],
      [[0, 77, 3], [3, 74, 3], [6, 70, 2], [8, 74, 2], [10, 77, 2], [12, 82, 4]],
      [[0, 79, 8], [8, 83, 4], [12, 86, 4]],
      [[0, 84, 3], [3, 79, 3], [6, 75, 2], [8, 72, 2], [10, 75, 2], [12, 79, 4]],
      [[0, 80, 2], [2, 79, 2], [4, 77, 2], [6, 75, 2], [8, 72, 8]],
      [[0, 77, 3], [3, 80, 3], [6, 84, 2], [8, 83, 2], [10, 80, 2], [12, 77, 4]],
      [[0, 79, 4], [4, 74, 4], [8, 71, 4], [12, 67, 4]],
    ],
  },
  { // Stage 5, Deep Storm: F sharp minor, frantic, four on the floor and racing hats.
    bpm: 176, lead: 'pulse25', leadGain: 0.08, bassWave: 'triangle', bassGain: 0.3,
    bass: sixteenths([0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 7, 12]),
    kick: [0, 4, 8, 10, 12], snare: [4, 12], hat: 1, arp: 1, arpUp: 0, arpGain: 0.04,
    bars: [
      [42, [66, 69, 73]], [38, [62, 66, 69]], [40, [64, 68, 71]], [37, [61, 65, 68]],
      [42, [66, 69, 73]], [38, [62, 66, 69]], [35, [62, 66, 71]], [37, [61, 65, 68]],
    ],
    melody: [
      [[0, 78, 2], [2, 81, 2], [4, 85, 4], [8, 83, 2], [10, 81, 2], [12, 78, 4]],
      [[0, 81, 2], [2, 78, 2], [4, 74, 4], [8, 78, 2], [10, 81, 2], [12, 86, 4]],
      [[0, 83, 2], [2, 80, 2], [4, 76, 4], [8, 80, 2], [10, 83, 2], [12, 88, 4]],
      [[0, 85, 6], [6, 84, 2], [8, 80, 4], [12, 77, 4]],
      [[0, 90, 2], [2, 88, 2], [4, 85, 4], [8, 81, 2], [10, 85, 2], [12, 78, 4]],
      [[0, 86, 4], [4, 81, 4], [8, 78, 4], [12, 74, 4]],
      [[0, 83, 2], [2, 86, 2], [4, 90, 4], [8, 88, 2], [10, 86, 2], [12, 83, 4]],
      [[0, 85, 4], [4, 89, 4], [8, 92, 4], [12, 85, 4]],
    ],
  },
];
const stepOf = (song) => 60 / song.bpm / 4;

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicBus = null;
  let sfxBus = null;
  let noise = null;
  let pulse = null;
  let pulse25 = null;
  let thin = null;
  let echoIn = null;
  let muted = false;
  let playing = false;
  let song = 0; // the track playing, by stage
  let wanted = 0; // the track the current stage calls for
  let switchIn = -1; // steps until the scheduled switch to `wanted`, or -1
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
    pulse25 = pulseWave(0.25);
    thin = pulseWave(0.125);

    // An echo for the Ice Field lead: a feedback delay into the music bus.
    echoIn = ctx.createGain();
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.34;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.38;
    const wet = ctx.createGain();
    wet.gain.value = 0.45;
    echoIn.connect(delay);
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(musicBus);
    return true;
  }

  function pulseWave(duty) {
    const n = 32;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let k = 1; k < n; k += 1) imag[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    return ctx.createPeriodicWave(real, imag);
  }

  function tone({ freq, start, length, wave = 'square', gain = 0.2, bus = musicBus, slideTo = null, attack = 0.004, release = 0.06, send = null }) {
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
    if (send) env.connect(send);
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
    const sg = SONGS[song];
    const STEP = stepOf(sg);
    const barIndex = Math.floor(s / 16) % sg.bars.length;
    const [root, chord] = sg.bars[barIndex];
    const inBar = s % 16;

    for (const [at, iv, len] of sg.bass) {
      if (at === inBar) tone({ freq: mtof(root + iv), start: t, length: STEP * len * 0.9, wave: sg.bassWave, gain: sg.bassGain });
    }
    if (sg.kick.includes(inBar)) kick(t);
    if (sg.snare.includes(inBar)) {
      hiss({ start: t, length: 0.14, gain: 0.22, type: 'bandpass', freq: 1800 });
      tone({ freq: 220, slideTo: 120, start: t, length: 0.08, wave: 'triangle', gain: 0.18 });
    }
    if (sg.hat && inBar % sg.hat === (sg.hat > 1 ? 1 : 0)) hiss({ start: t, length: 0.04, gain: sg.hat === 1 ? 0.06 : 0.08 });
    if (sg.arp && inBar % sg.arp === 0) {
      const note = chord[inBar % 3] + sg.arpUp + 12 * (inBar % 6 < 3 ? 1 : 0);
      tone({ freq: mtof(note), start: t, length: STEP * 0.9, wave: thin, gain: sg.arpGain });
    }
    // Tom fill across the last beat of the loop.
    if (sg.fill && barIndex === sg.bars.length - 1 && inBar >= 12) {
      tone({ freq: [196, 165, 131, 110][inBar - 12], slideTo: 60, start: t, length: 0.12, wave: 'triangle', gain: 0.32 });
    }
    const wave = sg.lead === 'pulse25' ? pulse25 : sg.lead === 'triangle' ? 'triangle' : pulse;
    for (const [at, midi, len] of sg.melody[barIndex]) {
      if (at === inBar) {
        tone({ freq: mtof(midi), start: t, length: STEP * len * 0.95, wave, gain: sg.leadGain, release: 0.05, send: sg.echo ? echoIn : null });
      }
    }
  }

  function tick() {
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      if (switchIn === 0) {
        // The new track starts on this downbeat, from its first bar.
        song = wanted;
        step = 0;
        switchIn = -1;
      }
      scheduleStep(step, nextTime);
      nextTime += stepOf(SONGS[song]);
      step = (step + 1) % (SONGS[song].bars.length * 16);
      if (switchIn > 0) switchIn -= 1;
    }
  }

  // Changes track for a new stage on the next downbeat at least SWITCH_FADE away: the old
  // track fades down while a soft whoosh rises, then the new one fades back up.
  function setStage(index) {
    wanted = Math.max(0, Math.min(SONGS.length - 1, index));
    if (!playing || !ctx) { song = wanted; switchIn = -1; return; }
    if (wanted === song) { switchIn = -1; return; }
    const STEP = stepOf(SONGS[song]);
    let steps = (16 - (step % 16)) % 16;
    if (nextTime + steps * STEP - ctx.currentTime < SWITCH_FADE + 0.05) steps += 16;
    switchIn = steps;
    const at = nextTime + steps * STEP;
    const g = musicBus.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(g.value, ctx.currentTime);
    g.setValueAtTime(MUSIC_LEVEL, at - SWITCH_FADE);
    g.linearRampToValueAtTime(MUSIC_LEVEL * 0.35, at);
    g.linearRampToValueAtTime(MUSIC_LEVEL, at + SWITCH_RISE);
    // The whoosh swells in as the old track fades, peaking on the downbeat.
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(400, at - SWITCH_FADE);
    filter.frequency.exponentialRampToValueAtTime(6000, at);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at - SWITCH_FADE);
    env.gain.exponentialRampToValueAtTime(0.16, at);
    env.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
    src.connect(filter).connect(env).connect(sfxBus);
    src.start(at - SWITCH_FADE);
    src.stop(at + 0.35);
  }

  function startMusic() {
    if (!ensure() || playing) return;
    playing = true;
    song = wanted;
    switchIn = -1;
    step = 0;
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setValueAtTime(MUSIC_LEVEL, ctx.currentTime);
    nextTime = ctx.currentTime + 0.05;
    tick();
    timer = setInterval(tick, 25);
  }

  function stopMusic() {
    playing = false;
    switchIn = -1;
    song = wanted;
    if (timer) clearInterval(timer);
    timer = null;
  }

  function sfx(name, level = 1) {
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
      case 'flarewarn':
        tone({ freq: 330, slideTo: 1320, start: t, length: 0.9, wave: thin, gain: 0.07, bus, release: 0.1 });
        break;
      case 'flare':
        hiss({ start: t, length: 0.55, gain: 0.45, type: 'bandpass', freq: 2500, sweepTo: 600, bus });
        tone({ freq: 70, slideTo: 40, start: t, length: 0.5, wave: 'sawtooth', gain: 0.2, bus });
        break;
      case 'radar':
        // Two sonar pings, the second fainter.
        [0, 0.32].forEach((d, i) => tone({ freq: 1568, slideTo: 1480, start: t + d, length: 0.35, wave: 'sine', gain: i ? 0.08 : 0.16, bus, release: 0.3 }));
        break;
      case 'boost':
        hiss({ start: t, length: 0.6, gain: 0.3, type: 'bandpass', freq: 300, sweepTo: 3500, bus });
        tone({ freq: 110, slideTo: 330, start: t, length: 0.45, wave: pulse, gain: 0.12, bus });
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
        // A blip that climbs with the streak.
        tone({ freq: mtof(76 + 2 * Math.min(level - 1, 8)), start: t, length: 0.07, wave: pulse, gain: 0.08, bus });
        break;
      case 'trophy':
        [72, 76, 79, 84, 88].forEach((m, i) => tone({ freq: mtof(m), start: t + i * 0.07, length: i === 4 ? 0.5 : 0.12, wave: pulse, gain: 0.11, bus }));
        [91, 96].forEach((m, i) => tone({ freq: mtof(m), start: t + 0.4 + i * 0.12, length: 0.3, wave: 'triangle', gain: 0.07, bus }));
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
    setStage,
  };
}
