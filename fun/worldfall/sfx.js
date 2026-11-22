/* Physically styled sound effects, synthesized so the game needs no audio files.
   Every effect plays only after the player's response, so sound never cues a reaction. */
function roomImpulse(ctx) {
  const length = Math.floor(ctx.sampleRate * .55);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 5;
  }
  return buffer;
}

export function createSfx() {
  let ctx = null;
  let bus = null;
  let noiseBuffer = null;

  function attach(audioContext) {
    ctx = audioContext;
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    bus = ctx.createDynamicsCompressor();
    bus.threshold.value = -14;
    bus.ratio.value = 5;
    bus.attack.value = .001;
    bus.release.value = .12;
    const room = ctx.createConvolver();
    room.buffer = roomImpulse(ctx);
    const wet = ctx.createGain();
    wet.gain.value = .16;
    const output = ctx.createGain();
    output.gain.value = .66;
    output.connect(ctx.destination);
    bus.connect(output);
    bus.connect(room).connect(wet).connect(output);
  }

  function burst({ at = 0, duration, type = 'bandpass', freq, q = 1, gain, sweepTo = null }) {
    const start = ctx.currentTime + at;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();
    source.buffer = noiseBuffer;
    filter.type = type;
    filter.frequency.setValueAtTime(freq, start);
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, start + duration);
    filter.Q.value = q;
    amp.gain.setValueAtTime(gain, start);
    amp.gain.exponentialRampToValueAtTime(.0008, start + duration);
    source.connect(filter).connect(amp).connect(bus);
    source.start(start, Math.random() * .7, duration + .02);
  }

  function ring({ at = 0, freq, duration, gain, dropTo = null }) {
    const start = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.frequency.setValueAtTime(freq, start);
    if (dropTo) osc.frequency.exponentialRampToValueAtTime(dropTo, start + duration);
    amp.gain.setValueAtTime(.0001, start);
    amp.gain.linearRampToValueAtTime(gain, start + .0015);
    amp.gain.exponentialRampToValueAtTime(.0008, start + duration);
    osc.connect(amp).connect(bus);
    osc.start(start);
    osc.stop(start + duration + .02);
  }

  return {
    attach,
    // A padded hand closing on the ball: a deep thump, a leather slap and a brief settle.
    catch(rt) {
      const bright = Math.max(0, Math.min(1, (360 - rt) / 180));
      ring({ freq: 118, duration: .17, gain: .62, dropTo: 46 });
      ring({ freq: 236, duration: .06, gain: .18, dropTo: 120 });
      burst({ duration: .045, type: 'lowpass', freq: 1300 + bright * 1500, q: .7, gain: .7, sweepTo: 320 });
      burst({ at: .006, duration: .03, freq: 2100 + bright * 900, q: 1.1, gain: .15 + bright * .12 });
      burst({ at: .07, duration: .05, type: 'lowpass', freq: 520, gain: .13 });
    },
    // A ceramic ball breaking, then shards bouncing and settling sooner under stronger gravity.
    smash(g) {
      ring({ freq: 142, duration: .2, gain: .68, dropTo: 40 });
      burst({ duration: .07, type: 'lowpass', freq: 2400, gain: .75, sweepTo: 420 });
      burst({ duration: .035, type: 'highpass', freq: 3400, gain: .62 });
      for (let i = 0; i < 7; i += 1) {
        burst({ at: .004 + Math.random() * .045, duration: .025 + Math.random() * .05, freq: 1700 + Math.random() * 4400, q: 3.5, gain: .2 });
      }
      const pace = Math.sqrt(9.81 / g);
      for (let i = 0; i < 24; i += 1) {
        const settle = (i / 24) ** 1.7;
        const at = .07 + settle * .92 * pace + Math.random() * .025;
        const level = .13 * (1 - settle * .84);
        const base = 2500 + Math.random() * 5200;
        ring({ at, freq: base, duration: .035 + Math.random() * .07, gain: level });
        ring({ at, freq: base * (1.47 + Math.random() * .34), duration: .028 + Math.random() * .035, gain: level * .55 });
        if (i % 3 === 0) burst({ at, duration: .014, type: 'highpass', freq: 4200, gain: level * .9 });
      }
    },
    // A dull knock for a false start.
    falseStart() {
      ring({ freq: 104, duration: .13, gain: .42, dropTo: 62 });
      burst({ duration: .05, type: 'lowpass', freq: 520, q: .8, gain: .38 });
    },
  };
}
