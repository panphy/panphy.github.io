/* An original, generated pipe-organ score. It runs on its own clock and never reacts to the game,
   so it cannot signal when the ball will drop. */
const CHORD_S = 8;
const PULSE_S = 0.5;
const LEVEL = 0.32;
const LOOKAHEAD_S = 1.4;

// MIDI notes in D minor: bass plus four organ voices.
const CHORDS = [
  { bass: 38, notes: [50, 57, 62, 65] },
  { bass: 34, notes: [50, 58, 62, 65] },
  { bass: 31, notes: [50, 55, 62, 70] },
  { bass: 33, notes: [49, 57, 64, 69] },
  { bass: 38, notes: [53, 57, 62, 69] },
  { bass: 36, notes: [52, 55, 60, 67] },
  { bass: 34, notes: [53, 58, 62, 65] },
  { bass: 33, notes: [52, 57, 61, 64] },
];
const PULSE = [0, 3, 1, 2, 3, 1, 2, 0, 1, 3, 2, 3, 0, 2, 1, 3];
// One sustained high note per chord: [MIDI note, start beat within the chord, beats].
const MELODY = [
  [81, 2, 12], [82, 0, 8], [79, 2, 10], [76, 0, 14],
  [77, 4, 10], [79, 0, 8], [82, 2, 10], [81, 0, 15],
];

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

function impulse(ctx, seconds) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  }
  return buffer;
}

export function createMusic() {
  let ctx = null;
  let master = null;
  let voices = null;
  let organ = null;
  let flute = null;
  let timer = null;
  let nextTime = 0;
  let step = 0;

  function setup(audioContext) {
    ctx = audioContext;
    master = ctx.createGain();
    master.gain.value = 0;
    voices = ctx.createBiquadFilter();
    voices.type = 'lowpass';
    voices.frequency.value = 1500;
    voices.Q.value = .3;
    const reverb = ctx.createConvolver();
    reverb.buffer = impulse(ctx, 4.2);
    const dry = ctx.createGain();
    const wet = ctx.createGain();
    dry.gain.value = .62;
    wet.gain.value = .55;
    voices.connect(dry).connect(master);
    voices.connect(reverb).connect(wet).connect(master);
    master.connect(ctx.destination);
    const wave = (partials) => {
      const real = new Float32Array(partials.length + 1);
      const imag = Float32Array.from([0, ...partials]);
      return ctx.createPeriodicWave(real, imag);
    };
    organ = wave([1, .62, .24, .3, .08, .13, .03, .07]);
    flute = wave([1, .14, .05]);
  }

  function note(freq, start, duration, gain, shape, attack, release) {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.setPeriodicWave(shape);
    osc.frequency.value = freq;
    const end = start + duration;
    amp.gain.setValueAtTime(.0001, start);
    amp.gain.linearRampToValueAtTime(gain, start + attack);
    amp.gain.setValueAtTime(gain, Math.max(start + attack, end - release));
    amp.gain.linearRampToValueAtTime(.0001, end);
    osc.connect(amp).connect(voices);
    osc.start(start);
    osc.stop(end + .02);
  }

  function playChord(index, time) {
    const chord = CHORDS[index % CHORDS.length];
    const cycle = Math.floor(index / CHORDS.length);
    const arc = .55 + .45 * Math.sin((index / 40) * Math.PI * 2 - Math.PI / 2);
    voices.frequency.setTargetAtTime(900 + arc * 1500, time, 2.5);

    note(hz(chord.bass), time, CHORD_S + 1.5, .24, organ, 1.6, 2);
    chord.notes.forEach((midi) => note(hz(midi), time, CHORD_S + 1.5, .075 + arc * .035, organ, 2.2, 2.4));

    if (index >= 4) {
      const level = Math.min(1, (index - 3) / 6) * (.045 + arc * .035);
      PULSE.forEach((voice, i) => {
        note(hz(chord.notes[voice] + 12), time + i * PULSE_S, PULSE_S * 1.5, level, organ, .035, .3);
      });
    }
    if (cycle >= 1) {
      const [midi, beat, beats] = MELODY[index % MELODY.length];
      note(hz(midi), time + beat * PULSE_S, beats * PULSE_S, .05 + arc * .035, flute, .9, 1.4);
    }
  }

  function schedule() {
    if (ctx.state !== 'running') return;
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + .08;
    while (nextTime < ctx.currentTime + LOOKAHEAD_S) {
      playChord(step, nextTime);
      step += 1;
      nextTime += CHORD_S;
    }
  }

  return {
    start(audioContext) {
      if (!ctx) setup(audioContext);
      if (timer) return;
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(LEVEL, now + 3);
      schedule();
      timer = setInterval(schedule, 400);
    },
    stop() {
      if (!ctx || !timer) return;
      clearInterval(timer);
      timer = null;
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + .5);
    },
  };
}
