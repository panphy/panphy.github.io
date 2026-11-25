// The output limiter adds about 2 dB of make-up gain, so the master sits a little lower than it used to.
const MASTER_VOLUME = 0.78;
const MUSIC_GAIN = 0.82;
// Trims the driving score against the effects; the quiet ending reprise is left alone.
const GROOVE_TRIM = 0.67;
const MUSIC_TIMER_INTERVAL = 80;
const MUSIC_SCHEDULE_AHEAD = 0.34;
const MUSIC_TRANSITION_DURATION = 1.2;
// Bars are 16 steps, or 12 in the river's compound time. MUSIC_STEP_WRAP divides by
// both bar lengths and by the 16-bar arrangement every track is laid out on.
const MUSIC_BAR_STEPS = 16;
const MUSIC_SECTION_STEPS = 32;
const MUSIC_ARRANGEMENT_BARS = 16;
const MUSIC_STEP_WRAP = 768;
// Kick and bass smear in a long reverb, so the music sends less than the effects do.
const MUSIC_REVERB_SEND = 0.1;
const SFX_REVERB_SEND = 0.22;
// The echo follows the tempo (each profile's `echoSteps`); slow profiles use this fixed time.
const ECHO_TIME = 0.34;
const ECHO_FEEDBACK = 0.32;
const ECHO_SEND = 0.28;
const MUSIC_FILTER_OPEN = 18000;
const MUSIC_FILTER_LOW_LIFE = 3400;
const MUSIC_FILTER_FROZEN = 420;
const FROZEN_TEMPO_STRETCH = 1.4;
const BASS_FILTER_FLOOR = 190;
const PUMP_DEPTH = 0.42;
const BOSS_TEMPO = 0.95;
const LANE_PAN_WIDTH = 0.7;
const NOISE_BUFFER_SECONDS = 2;
// How long the cannon whines before its blast; a kill's burst waits the same time.
const BEAM_CHARGE_TIME = 0.07;
// The victory score: 90 bpm, the same bar grid as ending-cinematic.js.
const SCORE_BEAT = 60 / 90;
const SCORE_GAIN = 0.95;
const SCORE_REVERB_SEND = 0.28;
const SCORE_SCHEDULE_AHEAD = 0.5;
const NOTE_OFFSETS = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };

// 'F#5' → 739.99 Hz (A4 = 440 Hz).
function noteFrequency(name) {
  const match = /^([A-G])(#|b)?(\d)$/.exec(name);
  const semitones = NOTE_OFFSETS[match[1]] + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0) + (Number(match[3]) - 4) * 12;
  return 440 * Math.pow(2, semitones / 12);
}

// MIDI note number → Hz (69 = A4).
function midiFrequency(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

// Seconds per sixteenth note at a tempo.
function stepSeconds(bpm) {
  return 60 / bpm / 4;
}

// Kick drums: pitch fall (Hz), how fast it falls and how long the drum rings (s).
const KICK_PUNCH = { from: 175, to: 47, drop: 0.075, length: 0.24 };
const KICK_TIGHT = { from: 165, to: 62, drop: 0.05, length: 0.15 };
const KICK_HEAVY = { from: 150, to: 43, drop: 0.11, length: 0.42 };
const KICK_SOFT = { from: 110, to: 42, drop: 0.09, length: 0.3 };

// Each wave has its own track. The patterns below are one bar of steps unless noted.
// Bass rhythms: 0 rests, 1 plays the chord's bass note, 2 the octave above.
// Arpeggios and melodies name chord tones by index, wrapping into higher octaves,
// so they fit whatever the bar's harmony is; melody entries are [step, tone, length].
const MEADOW_ARP = [0, 1, 2, 3, 4, 5, 4, 3, 2, 3, 4, 5, 6, 5, 4, 2];
const MEADOW_LEAD = [[0, 3, 6], [6, 4, 2], [8, 5, 8], [16, 4, 6], [22, 3, 2], [24, 2, 8]];
const MEADOW_BOSS_BASS = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1];
const RIVER_BASS = [1, 0, 1, 2, 0, 1, 1, 0, 1, 2, 1, 2];
const RIVER_BOSS_BASS = [1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 2, 2];
const RIVER_ARP = [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1];
const RIVER_LEAD = [[0, 4, 5], [6, 3, 3], [9, 5, 3], [12, 6, 6], [18, 5, 3], [21, 4, 3]];
const MINE_CLANKS = [3, 6, 11, 14];
const MINE_PLUCKS = [[2, 3], [5, 5], [9, 4], [18, 6], [23, 4], [28, 3], [29, 5]];
const MINE_RUN = [3, 4, 5, 4, 6, 5, 4, 3];
const MINE_BOSS_BASS = [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 2, 1];
const LAKE_BELLS = [[0, 5], [6, 4], [12, 6], [16, 3], [22, 5], [26, 4], [28, 7]];
const LAKE_GLASS = [5, null, 3, null, 4, null, null, null, 6, null, 3, null, 4, null, null, null];
const NIGHT_ARP = [0, 2, 4, 6, 7, 6, 4, 2, 1, 3, 5, 7, 8, 7, 5, 3];
const NIGHT_BASS = [0, 1, 1, 1, 0, 1, 1, 2, 0, 1, 1, 1, 0, 1, 2, 1];
const NIGHT_LEAD = [
  [0, 3, 6], [6, 4, 2], [8, 5, 8], [16, 6, 6], [22, 5, 2], [24, 4, 8],
  [32, 5, 6], [38, 6, 2], [40, 7, 8], [48, 6, 4], [52, 5, 4], [56, 4, 8],
];
const BOSS_STABS = [0, 6, 12];
const INTERLUDE_ARP = [0, null, 2, 3, null, 2, 4, null, 0, null, 2, 3, null, 5, 4, 2];
const LEAD_FALLING = [[0, 5, 4], [4, 4, 4], [8, 3, 6], [16, 4, 4], [20, 3, 4], [24, 2, 6]];

// One profile per wave. `chords` is a loop of [bass offset, chord tones] in semitones
// from the root (a MIDI note), each held for `barsPerChord` bars.
const WAVE_MUSIC = [
  {
    // Spring meadow: D dorian at 124, a bright square arpeggio over a light kick.
    name: 'meadow',
    track: 'meadow',
    baseStep: stepSeconds(124),
    barSteps: 16,
    barsPerChord: 1,
    echoSteps: 3,
    root: 38,
    chords: [
      [0, [0, 3, 7]], [3, [-2, 3, 7]], [-2, [-2, 2, 5]], [5, [0, 5, 9]],
      [0, [0, 3, 7]], [3, [-2, 3, 7]], [-5, [-2, 2, 7]], [5, [0, 5, 9]],
    ],
  },
  {
    // River wood: E minor in rolling triplets, four beats of three at 104.
    name: 'river',
    track: 'river',
    baseStep: 60 / 104 / 3,
    barSteps: 12,
    barsPerChord: 1,
    echoSteps: 2,
    root: 40,
    chords: [
      [0, [0, 3, 7]], [0, [0, 3, 7]], [-4, [0, 3, 8]], [-2, [2, 5, 10]],
      [0, [0, 3, 7]], [3, [-2, 3, 7]], [5, [0, 5, 8]], [-5, [-1, 2, 7]],
    ],
  },
  {
    // Mountain pass and crystal mine: C phrygian, half-time, slow harmony.
    name: 'mine',
    track: 'mine',
    baseStep: stepSeconds(126),
    barSteps: 16,
    barsPerChord: 2,
    echoSteps: 3,
    root: 36,
    chords: [[0, [0, 3, 7]], [1, [1, 5, 8]], [0, [0, 3, 7]], [-2, [-2, 1, 5]]],
  },
  {
    // Frozen lake: F sharp minor at 108, sparse, with long pads and FM bells.
    name: 'lake',
    track: 'lake',
    baseStep: stepSeconds(108),
    barSteps: 16,
    barsPerChord: 2,
    echoSteps: 3,
    root: 42,
    chords: [[0, [0, 3, 7]], [-4, [0, 3, 8]], [3, [-2, 3, 7]], [-5, [-2, 2, 7]]],
  },
  {
    // Night sky: A minor at 146, the fastest, with a gliding lead.
    name: 'night',
    track: 'night',
    baseStep: stepSeconds(146),
    barSteps: 16,
    barsPerChord: 1,
    echoSteps: 3,
    root: 33,
    chords: [
      [0, [0, 3, 7]], [0, [0, 3, 7]], [-4, [0, 3, 8]], [-2, [-2, 2, 5]],
      [0, [0, 3, 7]], [3, [-2, 3, 7]], [5, [0, 5, 8]], [7, [-1, 2, 7]],
    ],
  },
];
// Each wave's boss is its own track pushed harder: faster, with the boss layers on.
const BOSS_MUSIC = WAVE_MUSIC.map((profile) => ({
  ...profile,
  name: `${profile.name}-boss`,
  boss: true,
  baseStep: profile.baseStep * BOSS_TEMPO,
}));
// Between waves: a light groove in a brighter key.
const WAVE_CLEAR_MUSIC = {
  name: 'wave-clear',
  track: 'interlude',
  baseStep: stepSeconds(112),
  barSteps: 16,
  barsPerChord: 1,
  echoSteps: 3,
  root: 41,
  chords: [[0, [0, 4, 7]], [-5, [-1, 2, 7]], [-3, [-3, 0, 4]], [-7, [0, 5, 9]]],
};
// Game over: a slow drone and a falling line in D minor.
const GAME_OVER_MUSIC = {
  name: 'game-over',
  baseStep: 0.34,
  root: 38,
  chords: [[0, [0, 3, 7]], [-4, [-4, 0, 3]], [-7, [0, 5, 8]], [-5, [-1, 2, 7]]],
};
// Under the results card: a slow, quiet reprise of the victory score's theme in D major.
const ENDING_MUSIC = {
  name: 'ending',
  baseStep: 1 / 3,
  melodyGain: 0.016,
  bassGain: 0.018,
  melody: [
    440.00, null, 587.33, 659.25, 739.99, null, null, null,
    null, null, null, null, 659.25, null, 587.33, null,
    659.25, null, 554.37, null, 587.33, 659.25, null, null,
    440.00, null, null, null, null, null, null, null,
    493.88, null, 587.33, 659.25, 739.99, null, 880.00, null,
    null, null, null, null, 739.99, null, 659.25, null,
    783.99, null, 739.99, null, 659.25, null, 587.33, null,
    null, null, null, null, null, null, null, null,
  ],
  bass: [
    146.83, null, null, null, null, null, null, null,
    146.83, null, null, null, null, null, null, null,
    110.00, null, null, null, null, null, null, null,
    110.00, null, null, null, null, null, null, null,
    123.47, null, null, null, null, null, null, null,
    123.47, null, null, null, null, null, null, null,
    98.00, null, null, null, null, null, null, null,
    98.00, null, null, null, null, null, null, null,
  ],
  padChords: [
    [73.42, 146.83, 220.00, 369.99],
    [55.00, 110.00, 164.81, 277.18],
    [61.74, 123.47, 185.00, 293.66],
    [49.00, 98.00, 146.83, 246.94],
  ],
};

export function createSpellwaveAudio({
  audioButton,
  initialEnabled,
  saveAudioSetting,
  getMode,
  getWavePhase = () => 'normal',
  getWaveSet,
  getIsFinalWave = () => false,
  getTypedLength,
  getHealth = () => Infinity,
  getIsTimeFrozen = () => false,
  lowHealth = 0,
  pathLanes,
}) {
  let audioEnabled = initialEnabled;
  let audioContext = null;
  let masterGain = null;
  let musicGain = null;
  let musicFilter = null;
  let musicDuck = null;
  let melodyBus = null;
  let echoDelay = null;
  let echoTime = ECHO_TIME;
  let pumpGain = null;
  let padFilter = null;
  let arpFilter = null;
  let arpPan = null;
  let leadFilter = null;
  let snareBus = null;
  let hatBus = null;
  let metalBus = null;
  let lastLeadFrequency = 0;
  let sfxBus = null;
  let driveBus = null;
  let noiseBuffer = null;
  let musicTimer = null;
  let musicStep = 0;
  let nextMusicTime = 0;
  let activeMusicProfile = null;
  let previousMusicProfile = null;
  let musicTransitionStart = 0;
  let reverbNode = null;
  let scoreBus = null;
  let scoreTimer = null;
  let scoreEvents = [];
  let scoreIndex = 0;
  let scoreStart = 0;
  let victoryScoreActive = false;

  function updateAudioButton() {
    audioButton.classList.toggle('is-muted', !audioEnabled);
    audioButton.setAttribute('aria-label', audioEnabled ? 'Mute sound' : 'Unmute sound');
    audioButton.title = audioEnabled ? 'Mute sound' : 'Unmute sound';
    if (masterGain && audioContext) {
      masterGain.gain.cancelScheduledValues(audioContext.currentTime);
      masterGain.gain.setTargetAtTime(audioEnabled ? MASTER_VOLUME : 0.0001, audioContext.currentTime, 0.018);
    }
    if (!audioEnabled) stopMusicLoop(0.03);
  }

  function toggleEnabled() {
    audioEnabled = !audioEnabled;
    saveAudioSetting(audioEnabled);
    updateAudioButton();
    return audioEnabled;
  }

  function ensureAudio() {
    if (!audioEnabled) return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!audioContext) {
      audioContext = new AudioContextClass();
      masterGain = audioContext.createGain();
      musicGain = audioContext.createGain();
      masterGain.gain.setValueAtTime(MASTER_VOLUME, audioContext.currentTime);
      musicGain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      buildSignalChain(audioContext);
    }

    return audioContext;
  }

  // music: musicGain -> musicFilter -> musicDuck -> master. Most instruments share a few
  // standing buses, so a note costs an oscillator and a gain rather than its own filter:
  // bass and pads pass through pumpGain, which every kick dips (the sidechain pump);
  // arpeggio and lead feed melodyBus, which also sends to a tempo-synced echo.
  // effects: sfxBus -> master, with driveBus as a distorted way in for the heavy hits.
  // Both sides send to one shared reverb, and a limiter sits on the output so stacked
  // sounds cannot clip.
  function buildSignalChain(context) {
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.22;
    masterGain.connect(limiter);
    limiter.connect(context.destination);

    musicFilter = context.createBiquadFilter();
    musicFilter.type = 'lowpass';
    musicFilter.frequency.value = MUSIC_FILTER_OPEN;
    musicFilter.Q.value = 0.4;
    musicDuck = context.createGain();
    musicGain.connect(musicFilter);
    musicFilter.connect(musicDuck);
    musicDuck.connect(masterGain);

    sfxBus = context.createGain();
    sfxBus.connect(masterGain);

    // Soft clipping: quiet input passes almost clean, loud input gains grit.
    const driveShaper = context.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let index = 0; index < curve.length; index += 1) {
      curve[index] = Math.tanh((index / (curve.length - 1)) * 2 - 1);
    }
    driveShaper.curve = curve;
    const driveOut = context.createGain();
    driveBus = context.createGain();
    driveBus.gain.value = 7;
    driveOut.gain.value = 0.19;
    driveBus.connect(driveShaper);
    driveShaper.connect(driveOut);
    driveOut.connect(sfxBus);

    const reverb = context.createConvolver();
    reverbNode = reverb;
    reverb.buffer = createReverbImpulse(context, 1.7);
    const musicSend = context.createGain();
    const sfxSend = context.createGain();
    musicSend.gain.value = MUSIC_REVERB_SEND;
    sfxSend.gain.value = SFX_REVERB_SEND;
    musicDuck.connect(musicSend);
    sfxBus.connect(sfxSend);
    musicSend.connect(reverb);
    sfxSend.connect(reverb);
    reverb.connect(masterGain);

    melodyBus = context.createGain();
    const echo = context.createDelay(1);
    const echoFeedback = context.createGain();
    const echoTone = context.createBiquadFilter();
    const echoSend = context.createGain();
    echoDelay = echo;
    echo.delayTime.value = ECHO_TIME;
    echoFeedback.gain.value = ECHO_FEEDBACK;
    echoTone.type = 'lowpass';
    echoTone.frequency.value = 2400;
    echoSend.gain.value = ECHO_SEND;
    melodyBus.connect(musicGain);
    melodyBus.connect(echoSend);
    echoSend.connect(echo);
    echo.connect(echoTone);
    echoTone.connect(echoFeedback);
    echoFeedback.connect(echo);
    echoTone.connect(musicGain);

    pumpGain = context.createGain();
    pumpGain.connect(musicGain);
    padFilter = createBusFilter(context, 'lowpass', 1100, 0.5, pumpGain);
    leadFilter = createBusFilter(context, 'lowpass', 2600, 1.2, melodyBus);
    snareBus = createBusFilter(context, 'bandpass', 1800, 0.6, musicGain);
    hatBus = createBusFilter(context, 'highpass', 7500, 0.5, musicGain);
    metalBus = createBusFilter(context, 'bandpass', 2400, 3, melodyBus);
    arpFilter = createBusFilter(context, 'lowpass', 1600, 4, melodyBus);
    if (context.createStereoPanner) {
      arpPan = context.createStereoPanner();
      arpFilter.disconnect();
      arpFilter.connect(arpPan);
      arpPan.connect(melodyBus);
    }
  }

  function createBusFilter(context, type, frequency, q, destination) {
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    filter.connect(destination);
    return filter;
  }

  function createReverbImpulse(context, seconds) {
    const length = Math.floor(context.sampleRate * seconds);
    const impulse = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let index = 0; index < length; index += 1) {
        data[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / length, 2.6);
      }
    }
    return impulse;
  }

  // One shared stretch of white noise: every hat, snare and burst plays a slice of it,
  // so no sound has to fill a buffer of its own.
  function getNoiseBuffer(context) {
    if (!noiseBuffer) {
      noiseBuffer = context.createBuffer(1, Math.floor(context.sampleRate * NOISE_BUFFER_SECONDS), context.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  function createNoiseSource(context, start, duration, playbackRate = 1) {
    const source = context.createBufferSource();
    source.buffer = getNoiseBuffer(context);
    source.loop = true;
    source.playbackRate.setValueAtTime(playbackRate, start);
    source.start(start, Math.random() * (NOISE_BUFFER_SECONDS - 0.1));
    source.stop(start + duration + 0.02);
    return source;
  }

  // A gain for a scheduled voice. It starts silent: a source can begin a sample before
  // its envelope's first event, and at the default gain of 1 that sample is a loud click.
  function createEnvelope(context) {
    const envelope = context.createGain();
    envelope.gain.value = 0;
    return envelope;
  }

  // Routes a voice through a stereo panner when one is asked for and supported.
  function panned(destination, pan) {
    if (!pan || !audioContext.createStereoPanner) return destination;
    const panner = audioContext.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    panner.connect(destination);
    return panner;
  }

  function lanePan(enemy) {
    const lane = enemy && Number.isFinite(enemy.lane) ? enemy.lane : 0;
    const widest = Math.max(...pathLanes.map(Math.abs)) || 1;
    return (lane / widest) * LANE_PAN_WIDTH;
  }

  // Small random pitch and level changes so repeated sounds are not identical.
  function varyPitch(frequency, cents = 28) {
    return frequency * Math.pow(2, ((Math.random() * 2 - 1) * cents) / 1200);
  }

  function varyGain(gain, amount = 0.12) {
    return gain * (1 + (Math.random() * 2 - 1) * amount);
  }

  function duckMusic(depth = 0.4, hold = 0.5) {
    if (!musicDuck || !audioContext) return;
    const now = audioContext.currentTime;
    musicDuck.gain.cancelScheduledValues(now);
    musicDuck.gain.setTargetAtTime(depth, now, 0.03);
    musicDuck.gain.setTargetAtTime(1, now + hold, 0.25);
  }

  function resumeAudio() {
    const context = ensureAudio();
    if (context && context.state === 'suspended') {
      context.resume().catch(() => {});
    }
    return context;
  }

  // Hidden tabs must not keep playing the idle/menu music.
  function suspendAudio() {
    if (audioContext && audioContext.state === 'running') {
      audioContext.suspend().catch(() => {});
    }
  }

  function wakeAudio() {
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
  }

  // Effects play now (plus options.delay); `drive: true` sends them through the distortion.
  function playTone(frequency, duration, options = {}) {
    const context = resumeAudio();
    if (!context || !masterGain) return;

    const start = context.currentTime + (options.delay || 0);
    scheduleTone(frequency, duration, start, options, options.drive ? driveBus : sfxBus);
  }

  // One synth voice: oscillator -> optional low-pass -> envelope -> optional pan.
  // `endFrequency` sweeps the pitch, `cutoff`/`endCutoff` sweep the filter, and
  // `hold` (0..1) keeps the level up for that share of the note before it decays.
  function scheduleTone(frequency, duration, start, options = {}, destination = sfxBus) {
    const context = audioContext;
    if (!context || !destination) return;

    const attack = Math.min(options.attack ?? 0.008, duration * 0.4);
    const peak = options.gain || 0.05;
    const oscillator = context.createOscillator();
    const gainNode = createEnvelope(context);
    oscillator.type = options.type || 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    if (options.endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, options.endFrequency), start + duration);
    }
    if (options.detune) oscillator.detune.setValueAtTime(options.detune, start);

    gainNode.gain.setValueAtTime(0.0001, start);
    gainNode.gain.exponentialRampToValueAtTime(peak, start + attack);
    if (options.hold) gainNode.gain.setValueAtTime(peak, start + attack + (duration - attack) * Math.min(options.hold, 0.95));
    gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    if (options.cutoff) {
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.setValueAtTime(options.q || 1, start);
      filter.frequency.setValueAtTime(options.cutoff, start);
      if (options.endCutoff) filter.frequency.exponentialRampToValueAtTime(options.endCutoff, start + duration);
      oscillator.connect(filter);
      filter.connect(gainNode);
    } else {
      oscillator.connect(gainNode);
    }
    gainNode.connect(panned(destination, options.pan));
    oscillator.start(start);
    oscillator.stop(start + duration + 0.04);

    // A second, slightly detuned voice thickens the note.
    if (options.chorus) {
      scheduleTone(frequency, duration, start, {
        ...options,
        chorus: 0,
        gain: peak * 0.5,
        detune: (options.detune || 0) + options.chorus,
        pan: -(options.pan || 0),
      }, destination);
    }
  }

  function playNoise(duration, options = {}) {
    const context = resumeAudio();
    if (!context || !masterGain) return;

    const start = context.currentTime + (options.delay || 0);
    scheduleNoise(duration, start, options, options.drive ? driveBus : sfxBus);
  }

  // Filtered noise that decays from its start, or with `swell` grows and then stops dead.
  function scheduleNoise(duration, start, options = {}, destination = sfxBus) {
    const context = audioContext;
    if (!context || !destination) return;

    const source = createNoiseSource(context, start, duration, options.playbackRate || 1);
    const filter = context.createBiquadFilter();
    const gainNode = createEnvelope(context);
    const peak = options.gain || 0.04;
    filter.type = options.filterType || 'bandpass';
    filter.frequency.setValueAtTime(options.filterFrequency || 900, start);
    filter.Q.setValueAtTime(options.q || 0.8, start);
    if (options.endFilterFrequency) {
      filter.frequency.exponentialRampToValueAtTime(options.endFilterFrequency, start + duration);
    }
    if (options.swell) {
      gainNode.gain.setValueAtTime(0.0001, start);
      gainNode.gain.exponentialRampToValueAtTime(peak, start + duration * 0.94);
      gainNode.gain.linearRampToValueAtTime(0.0001, start + duration);
    } else {
      gainNode.gain.setValueAtTime(peak, start);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    }

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(panned(destination, options.pan));
  }

  // ── Music instruments ──────────────────────────────────────────────────

  // The kick also dips pumpGain, so bass and pads breathe around it.
  function scheduleKick(start, gain, pumpDepth = PUMP_DEPTH, shape = KICK_PUNCH) {
    const context = audioContext;
    const oscillator = context.createOscillator();
    const gainNode = createEnvelope(context);
    oscillator.frequency.setValueAtTime(shape.from, start);
    oscillator.frequency.exponentialRampToValueAtTime(shape.to, start + shape.drop);
    gainNode.gain.setValueAtTime(gain, start);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, start + shape.length);
    oscillator.connect(gainNode);
    gainNode.connect(musicGain);
    oscillator.start(start);
    oscillator.stop(start + shape.length + 0.03);
    pumpGain.gain.setTargetAtTime(pumpDepth, start, 0.005);
    pumpGain.gain.setTargetAtTime(1, start + 0.035, 0.07);
  }

  // A slice of noise into one of the drum buses, whose filter gives it its colour.
  function scheduleDrumNoise(bus, start, duration, gain, flams = 0) {
    const context = audioContext;
    const source = createNoiseSource(context, start, duration);
    const gainNode = createEnvelope(context);
    let time = start;
    // A clap is a few hits a hundredth of a second apart.
    for (let index = 0; index < flams; index += 1) {
      gainNode.gain.setValueAtTime(gain, time);
      gainNode.gain.exponentialRampToValueAtTime(gain * 0.2, time + 0.01);
      time += 0.011;
    }
    gainNode.gain.setValueAtTime(gain, time);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(gainNode);
    gainNode.connect(bus);
  }

  function scheduleSnare(start, gain) {
    scheduleDrumNoise(snareBus, start, 0.15, gain);
    scheduleTone(210, 0.08, start, { gain: gain * 0.4, type: 'triangle', endFrequency: 140, attack: 0.001 }, musicGain);
  }

  function scheduleClap(start, gain) {
    scheduleDrumNoise(snareBus, start, 0.17, gain, 2);
  }

  function scheduleHat(start, gain, length = 0.04) {
    scheduleDrumNoise(hatBus, start, length, gain);
  }

  // Each bass note has its own closing filter, so the cutoff never jumps back up
  // on a resonant filter that is still ringing from the note before.
  function scheduleBass(frequency, start, duration, gain, cutoff, type, thick) {
    scheduleTone(frequency, duration, start, {
      gain,
      type,
      attack: 0.004,
      hold: 0.55,
      cutoff,
      endCutoff: BASS_FILTER_FLOOR,
      q: 5,
      chorus: thick ? 11 : 0,
    }, pumpGain);
  }

  // A held chord: detuned saws through the shared pad filter, with a slow swell and release.
  function schedulePad(frequencies, start, duration, gain) {
    const context = audioContext;
    const envelope = createEnvelope(context);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(gain, start + duration * 0.25);
    envelope.gain.setValueAtTime(gain, start + duration * 0.7);
    envelope.gain.linearRampToValueAtTime(0.0001, start + duration);
    envelope.connect(padFilter);
    frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = 'sawtooth';
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index % 2 === 0 ? -7 : 8;
      oscillator.connect(envelope);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.05);
    });
  }

  // An anvil: two squares a tritone-and-a-bit apart, rung through the metal bus's
  // narrow filter and on into the echo.
  function scheduleClank(start, gain, pitch, pan) {
    scheduleTone(pitch, 0.12, start, { gain, type: 'square', attack: 0.001, pan }, metalBus);
    scheduleTone(pitch * 1.483, 0.09, start, { gain: gain * 0.7, type: 'square', attack: 0.001, pan }, metalBus);
  }

  // A saw whose resonant filter snaps shut: the echoing pluck.
  function schedulePluck(frequency, start, gain, pan) {
    scheduleTone(frequency, 0.3, start, { gain, type: 'sawtooth', attack: 0.002, cutoff: 3600, endCutoff: 300, q: 8, pan }, melodyBus);
  }

  // An FM bell: a sine whose pitch is shaken by a second sine at a non-whole ratio.
  // The shake dies away faster than the note, which is what makes it glassy.
  function scheduleBell(frequency, start, duration, gain, pan = 0) {
    const context = audioContext;
    const carrier = context.createOscillator();
    const modulator = context.createOscillator();
    const depth = createEnvelope(context);
    const envelope = createEnvelope(context);
    carrier.frequency.value = frequency;
    modulator.frequency.value = frequency * 3.5;
    depth.gain.setValueAtTime(frequency * 1.6, start);
    depth.gain.exponentialRampToValueAtTime(frequency * 0.05, start + duration * 0.6);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    modulator.connect(depth);
    depth.connect(carrier.frequency);
    carrier.connect(envelope);
    envelope.connect(panned(melodyBus, pan));
    [carrier, modulator].forEach((oscillator) => {
      oscillator.start(start);
      oscillator.stop(start + duration + 0.04);
    });
  }

  // Blizzard wind: a band of noise that rises, brightens and falls away.
  function scheduleWind(start, duration, gain) {
    const context = audioContext;
    const source = createNoiseSource(context, start, duration);
    const filter = context.createBiquadFilter();
    const envelope = createEnvelope(context);
    filter.type = 'bandpass';
    filter.Q.value = 1.6;
    filter.frequency.setValueAtTime(450, start);
    filter.frequency.exponentialRampToValueAtTime(1500, start + duration * 0.5);
    filter.frequency.exponentialRampToValueAtTime(600, start + duration);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(gain, start + duration * 0.5);
    envelope.gain.linearRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(musicGain);
  }

  // The night sky's lead: two detuned saws that slide into each note from the last one.
  function scheduleGlideLead(frequency, start, duration, gain) {
    const context = audioContext;
    const envelope = createEnvelope(context);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.02);
    envelope.gain.setValueAtTime(gain, start + duration * 0.7);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    envelope.connect(leadFilter);
    [-10, 10].forEach((detune) => {
      const oscillator = context.createOscillator();
      oscillator.type = 'sawtooth';
      oscillator.detune.value = detune;
      oscillator.frequency.setValueAtTime(lastLeadFrequency || frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(frequency, start + 0.07);
      oscillator.connect(envelope);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.04);
    });
    lastLeadFrequency = frequency;
  }

  function chordToneFrequency(profile, tones, index, octave) {
    return midiFrequency(profile.root + octave * 12 + tones[index % tones.length] + 12 * Math.floor(index / tones.length));
  }

  function startMusicLoop(reset) {
    const context = resumeAudio();
    if (!context || !musicGain || !isMusicActiveMode()) return;

    if (reset || nextMusicTime < context.currentTime) {
      musicStep = 0;
      nextMusicTime = context.currentTime + 0.08;
      if (reset) {
        activeMusicProfile = null;
        previousMusicProfile = null;
      }
    }

    musicGain.gain.cancelScheduledValues(context.currentTime);
    musicGain.gain.setTargetAtTime(MUSIC_GAIN, context.currentTime, 0.12);

    if (!musicTimer) {
      musicTimer = window.setInterval(scheduleMusic, MUSIC_TIMER_INTERVAL);
    }
    scheduleMusic();
  }

  function stopMusicLoop(fade = 0.1) {
    if (musicTimer) {
      window.clearInterval(musicTimer);
      musicTimer = null;
    }
    if (musicGain && audioContext) {
      musicGain.gain.cancelScheduledValues(audioContext.currentTime);
      musicGain.gain.setTargetAtTime(0.0001, audioContext.currentTime, fade);
    }
  }

  function scheduleMusic() {
    if (!audioEnabled || !isMusicActiveMode() || !audioContext || !musicGain) {
      stopMusicLoop(0.04);
      return;
    }

    updateMusicProfile(getMusicProfile(getWaveSet()));
    const frozen = getMode() === 'running' && getIsTimeFrozen();
    const lowLife = isLowLife();
    updateMusicTone(frozen, lowLife);
    updateEchoTime();

    while (nextMusicTime < audioContext.currentTime + MUSIC_SCHEDULE_AHEAD) {
      const transitionProgress = getMusicTransitionProgress(nextMusicTime);
      const baseStep = previousMusicProfile
        ? lerp(previousMusicProfile.baseStep, activeMusicProfile.baseStep, transitionProgress)
        : activeMusicProfile.baseStep;
      const stepDuration = baseStep * (frozen ? FROZEN_TEMPO_STRETCH : 1);
      if (previousMusicProfile && transitionProgress < 1) {
        scheduleMusicStep(musicStep, nextMusicTime, stepDuration, previousMusicProfile, 1 - transitionProgress);
      }
      scheduleMusicStep(musicStep, nextMusicTime, stepDuration, activeMusicProfile, previousMusicProfile ? transitionProgress : 1);
      if (lowLife) scheduleHeartbeat(musicStep, nextMusicTime, stepDuration);
      nextMusicTime += stepDuration;
      musicStep = (musicStep + 1) % MUSIC_STEP_WRAP;
    }
  }

  // The music turns muffled while time is frozen and a little darker at low life.
  function updateMusicTone(frozen, lowLife) {
    const target = frozen ? MUSIC_FILTER_FROZEN : lowLife ? MUSIC_FILTER_LOW_LIFE : MUSIC_FILTER_OPEN;
    musicFilter.frequency.setTargetAtTime(target, audioContext.currentTime, frozen ? 0.12 : 0.3);
  }

  // Keeps the echo on the current track's beat. It glides, and only when the profile
  // changes, because moving a delay line bends the pitch of what is in it.
  function updateEchoTime() {
    const { baseStep, echoSteps } = activeMusicProfile;
    const target = echoSteps ? baseStep * echoSteps : ECHO_TIME;
    if (Math.abs(target - echoTime) < 0.001) return;
    echoTime = target;
    echoDelay.delayTime.setTargetAtTime(target, audioContext.currentTime, 0.2);
  }

  function isLowLife() {
    return getMode() === 'running' && getHealth() <= lowHealth;
  }

  // Low life: a two-beat heartbeat under the music and a thin warning blip above it.
  // Both skip the music filter, which low life has already closed a little.
  function scheduleHeartbeat(step, start, stepDuration) {
    if (step % 8 === 0) {
      scheduleTone(64, 0.2, start, { gain: 0.085, type: 'sine', endFrequency: 40, attack: 0.004 }, musicDuck);
      scheduleTone(56, 0.24, start + stepDuration * 1.5, { gain: 0.06, type: 'sine', endFrequency: 36, attack: 0.004 }, musicDuck);
    } else if (step % 8 === 4) {
      scheduleTone(1864.66, 0.07, start, { gain: 0.012, type: 'square', attack: 0.002, cutoff: 4200 }, musicDuck);
    }
  }

  function getMusicProfile(wave) {
    if (getMode() === 'ending') return ENDING_MUSIC;
    if (getMode() === 'gameover') return GAME_OVER_MUSIC;
    if (getMode() === 'wave_cleared') return WAVE_CLEAR_MUSIC;
    const index = getIsFinalWave()
      ? WAVE_MUSIC.length - 1
      : Math.max(0, (Number.isFinite(wave) ? wave : 1) - 1) % WAVE_MUSIC.length;
    return (getWavePhase() === 'boss' ? BOSS_MUSIC : WAVE_MUSIC)[index];
  }

  function updateMusicProfile(profile) {
    if (!activeMusicProfile) {
      activeMusicProfile = profile;
      previousMusicProfile = null;
      return;
    }
    if (activeMusicProfile.name === profile.name) return;
    previousMusicProfile = activeMusicProfile;
    activeMusicProfile = profile;
    musicTransitionStart = audioContext.currentTime;
  }

  function getMusicTransitionProgress(start) {
    if (!previousMusicProfile) return 1;
    const progress = Math.min(Math.max((start - musicTransitionStart) / MUSIC_TRANSITION_DURATION, 0), 1);
    if (progress >= 1 && audioContext && start >= audioContext.currentTime) previousMusicProfile = null;
    return progress;
  }

  function isMusicActiveMode() {
    // The victory score replaces the music loop until its last note is scheduled.
    if (victoryScoreActive) return false;
    const mode = getMode();
    return mode === 'running' || mode === 'wave_cleared' || mode === 'gameover' || mode === 'ending';
  }

  function scheduleMusicStep(step, start, stepDuration, profile, profileGain = 1) {
    if (profileGain <= 0.02) return;
    if (profile.name === 'ending') scheduleEndingStep(step, start, stepDuration, profile, profileGain);
    else if (profile.name === 'game-over') scheduleGameOverStep(step, start, stepDuration, profile, profileGain * GROOVE_TRIM);
    else trackSteps[profile.track](step, start, stepDuration, profile, profileGain * GROOVE_TRIM);
  }

  // Where a step falls in its track: its place in the bar, the bar's place in the
  // 16-bar arrangement, and the harmony.
  function trackFrame(step, profile) {
    const bar = Math.floor(step / profile.barSteps);
    const [bassOffset, tones] = profile.chords[Math.floor(bar / profile.barsPerChord) % profile.chords.length];
    return {
      beatStep: step % profile.barSteps,
      bar,
      phraseBar: bar % MUSIC_ARRANGEMENT_BARS,
      tones,
      bassNote: profile.root + bassOffset,
    };
  }

  // The arpeggio's shared filter opens and closes over `periodSteps`.
  function sweepArpFilter(step, start, cutoff, periodSteps, depth = 0.8) {
    const sweep = Math.sin(((step % periodSteps) / periodSteps) * Math.PI * 2 - Math.PI / 2);
    arpFilter.frequency.setTargetAtTime(cutoff * Math.pow(2, sweep * depth), start, 0.04);
  }

  function scheduleArp(frequency, start, duration, gain, type, pan) {
    if (arpPan) arpPan.pan.setValueAtTime(pan, start);
    scheduleTone(frequency, duration, start, { gain, type, attack: 0.003, hold: 0.3 }, arpFilter);
  }

  // Boss stabs: a bare fifth in saws.
  function scheduleStab(bassNote, start, duration, gain) {
    [12, 19, 24].forEach((interval, index) => {
      scheduleTone(midiFrequency(bassNote + interval), duration, start, {
        gain,
        type: 'sawtooth',
        attack: 0.004,
        hold: 0.4,
        detune: index === 1 ? 6 : -6,
      }, leadFilter);
    });
  }

  // Wave 1, spring meadow: the lightest track. A bright square arpeggio runs all the
  // time over a tight kick, the bass is only an offbeat octave bounce, and a whistling
  // lead joins for the second half. Its boss adds a low saw bass, a snare and stabs.
  function scheduleMeadowStep(step, start, stepDuration, profile, gain) {
    const { beatStep, bar, phraseBar, tones, bassNote } = trackFrame(step, profile);
    const boss = !!profile.boss;
    const full = boss || phraseBar >= 4;

    if (beatStep % 4 === 0) scheduleKick(start, (boss ? 0.15 : 0.13) * gain, PUMP_DEPTH, boss ? KICK_PUNCH : KICK_TIGHT);
    if (full && beatStep % 8 === 4) {
      if (boss) scheduleSnare(start, 0.1 * gain);
      else scheduleClap(start, 0.09 * gain);
    }
    if (beatStep % 4 === 2) scheduleHat(start, 0.028 * gain, 0.12);
    else if (boss || beatStep % 2 === 1) scheduleHat(start, 0.011 * gain, 0.025);
    if (boss && bar % 4 === 3 && beatStep >= 12) scheduleSnare(start, (0.05 + (beatStep - 12) * 0.015) * gain);

    if (full && beatStep % 4 === 2) {
      scheduleBass(midiFrequency(bassNote + (beatStep % 8 === 6 ? 24 : 12)), start, stepDuration * 1.4, 0.05 * gain, 1500, 'sawtooth', false);
    }
    if (boss && MEADOW_BOSS_BASS[beatStep]) {
      scheduleBass(midiFrequency(bassNote), start, stepDuration * 0.92, 0.07 * gain, 1000, 'sawtooth', true);
    }
    if (boss && BOSS_STABS.includes(beatStep)) scheduleStab(bassNote, start, stepDuration * 1.5, 0.016 * gain);

    sweepArpFilter(step, start, boss ? 3400 : 2600, 64);
    const frequency = chordToneFrequency(profile, tones, MEADOW_ARP[beatStep], 2);
    scheduleArp(frequency, start, stepDuration * 0.75, (step % 3 === 0 ? 0.04 : 0.032) * gain, 'square', beatStep % 2 === 0 ? -0.35 : 0.35);
    if (phraseBar >= 12) {
      scheduleTone(frequency * 2, stepDuration * 0.6, start, { gain: 0.012 * gain, type: 'triangle', attack: 0.003 }, arpFilter);
    }

    if (boss || phraseBar >= 8) {
      const note = MEADOW_LEAD.find((entry) => entry[0] === step % 32);
      if (note) {
        scheduleTone(chordToneFrequency(profile, tones, note[1], 2), stepDuration * note[2] * 0.95, start, {
          gain: 0.034 * gain,
          type: 'triangle',
          attack: 0.03,
          hold: 0.6,
          chorus: 5,
        }, leadFilter);
      }
    }
  }

  // Wave 2, river wood: compound time, twelve triplet steps to the bar. The kick and
  // snare gallop, a hollow square bass and a triangle harp roll in threes, toms fill
  // every fourth bar, and a resonant square lead sings in the second half.
  function scheduleRiverStep(step, start, stepDuration, profile, gain) {
    const { beatStep, bar, phraseBar, tones, bassNote } = trackFrame(step, profile);
    const boss = !!profile.boss;
    const triplet = beatStep % 3;

    if (beatStep % 6 === 0 || (boss && triplet === 0) || (beatStep === 11 && bar % 2 === 1)) {
      scheduleKick(start, (boss ? 0.15 : 0.13) * gain);
    }
    if (beatStep === 3 || beatStep === 9) scheduleSnare(start, (boss ? 0.11 : 0.095) * gain);
    scheduleHat(start, (triplet === 0 ? 0.024 : triplet === 2 ? 0.016 : 0.009) * gain, 0.035);
    if (bar % 4 === 3 && beatStep >= 9) {
      const tom = [196, 147, 110][beatStep - 9];
      scheduleTone(tom, 0.22, start, { gain: 0.09 * gain, type: 'sine', endFrequency: tom * 0.6, attack: 0.002 }, musicGain);
    }

    const bassStep = (boss ? RIVER_BOSS_BASS : RIVER_BASS)[beatStep];
    if (bassStep) {
      scheduleBass(midiFrequency(bassNote + (bassStep === 2 ? 12 : 0)), start, stepDuration * 0.95, 0.052 * gain, boss ? 1300 : 800, 'square', boss);
    }
    if (boss && beatStep === 0) {
      schedulePad(tones.map((tone) => midiFrequency(profile.root + 12 + tone)), start, stepDuration * 12.5, 0.011 * gain);
    }
    if (boss && beatStep % 6 === 0) scheduleStab(bassNote, start, stepDuration * 1.6, 0.016 * gain);

    if (boss || phraseBar >= 2) {
      sweepArpFilter(step, start, 3000, 48, 0.4);
      scheduleArp(
        chordToneFrequency(profile, tones, RIVER_ARP[beatStep], 2),
        start,
        stepDuration * 1.6,
        (triplet === 0 ? 0.05 : 0.036) * gain,
        'triangle',
        Math.sin((beatStep / 12) * Math.PI * 2) * 0.5,
      );
    }
    if (boss || phraseBar >= 8) {
      const note = RIVER_LEAD.find((entry) => entry[0] === step % 24);
      if (note) {
        scheduleTone(chordToneFrequency(profile, tones, note[1], 2), stepDuration * note[2] * 0.95, start, {
          gain: 0.022 * gain,
          type: 'square',
          attack: 0.02,
          hold: 0.7,
          cutoff: 1800,
          q: 6,
        }, melodyBus);
      }
    }
  }

  // Wave 3, the pass and the mine: half-time and heavy. One long kick and one big
  // snare to the bar, anvil clanks between them, a low saw drone under slow chords,
  // and filter plucks that ring down the echo. Its boss chugs the bass in sixteenths.
  function scheduleMineStep(step, start, stepDuration, profile, gain) {
    const { beatStep, bar, phraseBar, tones, bassNote } = trackFrame(step, profile);
    const boss = !!profile.boss;

    if (beatStep === 0 || beatStep === 10 || (beatStep === 7 && bar % 2 === 1) || (boss && (beatStep === 6 || beatStep === 14))) {
      scheduleKick(start, 0.15 * gain, PUMP_DEPTH * 0.8, KICK_HEAVY);
    }
    if (beatStep === 8) {
      scheduleSnare(start, 0.13 * gain);
      scheduleDrumNoise(snareBus, start, 0.32, 0.05 * gain);
      scheduleTone(130, 0.22, start, { gain: 0.07 * gain, type: 'sine', endFrequency: 70, attack: 0.002 }, musicGain);
    } else if (boss && beatStep % 8 === 4) {
      scheduleSnare(start, 0.05 * gain);
    }
    const clank = MINE_CLANKS.indexOf(beatStep);
    if (clank >= 0) scheduleClank(start, 0.05 * gain, clank % 2 === 0 ? 830 : 620, clank % 2 === 0 ? -0.5 : 0.5);
    else if (boss && beatStep % 2 === 1) scheduleHat(start, 0.012 * gain, 0.025);
    // A hiss of steam into every second bar line.
    if (bar % 2 === 1 && beatStep === 12) {
      scheduleNoise(stepDuration * 4, start, { gain: 0.018 * gain, swell: true, filterType: 'highpass', filterFrequency: 3000, q: 0.5 }, musicGain);
    }

    if (beatStep === 0 && bar % 2 === 0) {
      scheduleTone(midiFrequency(bassNote), stepDuration * 32, start, {
        gain: 0.03 * gain,
        type: 'sawtooth',
        attack: 0.6,
        hold: 0.8,
        cutoff: 180,
        endCutoff: 800,
        q: 8,
        chorus: 14,
      }, pumpGain);
    }
    if (boss) {
      const bassStep = MINE_BOSS_BASS[beatStep];
      if (bassStep) scheduleBass(midiFrequency(bassNote + (bassStep === 2 ? 12 : 0)), start, stepDuration * 0.92, 0.07 * gain, 1100, 'sawtooth', true);
      if (beatStep === 0 || beatStep === 3) scheduleStab(bassNote, start, stepDuration * 2, 0.017 * gain);
    } else if (beatStep === 0 || beatStep === 10 || beatStep === 14) {
      scheduleBass(midiFrequency(bassNote + (beatStep === 14 ? 12 : 0)), start, stepDuration * (beatStep === 0 ? 3 : 1.8), 0.055 * gain, 520, 'square', false);
    }

    const pluck = MINE_PLUCKS.find((entry) => entry[0] === step % 32);
    if (pluck) schedulePluck(chordToneFrequency(profile, tones, pluck[1], 2), start, 0.06 * gain, step % 2 === 0 ? -0.3 : 0.3);
    if ((boss || phraseBar >= 8) && beatStep % 2 === 0) {
      schedulePluck(chordToneFrequency(profile, tones, MINE_RUN[beatStep / 2], 2), start, 0.03 * gain, 0);
    }
  }

  // Wave 4, frozen lake: slow and sparse. Two soft kicks and one clap to the bar,
  // long sub notes, wide pads held for two bars, wind, FM bells picking out a slow
  // melody and glassy sine notes above. Its boss fills in the kick, hats and bass.
  function scheduleLakeStep(step, start, stepDuration, profile, gain) {
    const { beatStep, bar, phraseBar, tones, bassNote } = trackFrame(step, profile);
    const boss = !!profile.boss;

    if (beatStep % (boss ? 4 : 8) === 0) scheduleKick(start, (boss ? 0.14 : 0.12) * gain, PUMP_DEPTH, KICK_SOFT);
    if (beatStep === 12 || (boss && beatStep === 4)) scheduleClap(start, 0.06 * gain);
    if (beatStep % 4 === 2) scheduleHat(start, 0.014 * gain, 0.03);
    else if (boss) scheduleHat(start, 0.008 * gain, 0.02);
    if (beatStep === 4) scheduleBell(3520, start, 0.08, 0.012 * gain, 0.6);

    if (beatStep === 0) scheduleBass(midiFrequency(bassNote), start, stepDuration * 7, 0.07 * gain, 600, 'triangle', false);
    if (boss && beatStep % 2 === 0 && beatStep > 0) {
      scheduleBass(midiFrequency(bassNote + (beatStep % 8 === 6 ? 12 : 0)), start, stepDuration * 1.6, 0.06 * gain, 800, 'sawtooth', false);
    }

    if (beatStep === 0 && bar % 2 === 0) {
      const chord = tones.map((tone) => midiFrequency(profile.root + 12 + tone));
      schedulePad([...chord, midiFrequency(profile.root + 24 + tones[1])], start, stepDuration * 33, 0.021 * gain);
      // Two high sines far left and right widen the pad.
      [[tones[0], -0.7], [tones[2], 0.7]].forEach(([tone, pan]) => {
        scheduleTone(midiFrequency(profile.root + 36 + tone), stepDuration * 30, start, { gain: 0.012 * gain, type: 'sine', attack: 1.5, hold: 0.5, pan }, musicGain);
      });
      if (boss || bar % 4 === 2) scheduleWind(start, stepDuration * 32, 0.02 * gain);
    }

    const bell = LAKE_BELLS.find((entry) => entry[0] === step % 32);
    if (bell) scheduleBell(chordToneFrequency(profile, tones, bell[1], 2), start, 1.6, 0.058 * gain, step % 3 === 0 ? -0.4 : 0.4);
    if (boss) {
      const answer = LAKE_BELLS.find((entry) => entry[0] === (step + 30) % 32);
      if (answer) scheduleBell(chordToneFrequency(profile, tones, answer[1], 3), start, 1.0, 0.026 * gain, 0);
    }
    if (boss || phraseBar >= 4) {
      const glass = LAKE_GLASS[beatStep - (beatStep % 2)];
      if (glass !== null && (boss || beatStep % 2 === 0)) {
        scheduleTone(chordToneFrequency(profile, tones, glass, beatStep % 2 === 0 ? 3 : 2), stepDuration * 2.5, start, {
          gain: (beatStep % 2 === 0 ? 0.028 : 0.016) * gain,
          type: 'sine',
          attack: 0.004,
          pan: beatStep % 4 === 0 ? -0.5 : 0.5,
        }, melodyBus);
      }
    }
  }

  // Wave 5, night sky: the fastest. Four on the floor with a layered clap and snare,
  // a rolling offbeat saw bass, a two-octave doubled-saw arpeggio whose filter sweeps
  // over eight bars, a gliding lead and high pings. Its boss fills every bass step,
  // adds stabs and snare rolls, and never drops the lead.
  function scheduleNightStep(step, start, stepDuration, profile, gain) {
    const { beatStep, bar, phraseBar, tones, bassNote } = trackFrame(step, profile);
    const boss = !!profile.boss;
    const turnaround = bar % 4 === 3;

    if (beatStep % 4 === 0 || (turnaround && beatStep >= 14) || (boss && beatStep === 11 && bar % 2 === 1)) {
      scheduleKick(start, (boss ? 0.17 : 0.15) * gain, boss ? PUMP_DEPTH * 0.7 : PUMP_DEPTH);
    }
    if (beatStep % 8 === 4) {
      scheduleSnare(start, 0.09 * gain);
      scheduleClap(start, 0.06 * gain);
    }
    if (boss && turnaround && beatStep >= 8) scheduleSnare(start, (0.03 + (beatStep - 8) * 0.01) * gain);
    if (beatStep % 4 === 2) {
      scheduleHat(start, 0.03 * gain, 0.15);
    } else {
      scheduleHat(start, 0.014 * gain, 0.03);
      if (boss && beatStep % 4 === 3) scheduleHat(start + stepDuration * 0.5, 0.011 * gain, 0.025);
    }
    if (bar % 8 === 0 && beatStep === 0) scheduleHat(start, 0.04 * gain, 0.9);
    if (turnaround && beatStep === 8) {
      scheduleNoise(stepDuration * 8, start, { gain: 0.022 * gain, swell: true, filterFrequency: 700, endFilterFrequency: 6000, q: 1.2 }, musicGain);
    }

    const bassStep = NIGHT_BASS[beatStep] || (boss ? 1 : 0);
    if (bassStep) {
      scheduleBass(
        midiFrequency(bassNote + (bassStep === 2 ? 12 : 0)),
        start,
        stepDuration * 0.92,
        (boss ? 0.085 : 0.075) * gain,
        (boss ? 1700 : 1100) * (beatStep % 4 === 2 ? 1.25 : 1),
        'sawtooth',
        boss,
      );
    }
    if (beatStep === 0) {
      schedulePad(tones.map((tone) => midiFrequency(profile.root + 24 + tone)), start, stepDuration * 16.5, 0.011 * gain);
    }
    if (boss && BOSS_STABS.includes(beatStep)) scheduleStab(bassNote + 12, start, stepDuration * 1.4, 0.016 * gain);

    if (boss || phraseBar >= 2) {
      sweepArpFilter(step, start, boss ? 3000 : 2400, 128);
      const frequency = chordToneFrequency(profile, tones, NIGHT_ARP[beatStep], 2);
      const arpGain = (step % 3 === 0 ? 0.03 : 0.023) * gain;
      scheduleArp(frequency, start, stepDuration * 0.8, arpGain, 'sawtooth', beatStep % 2 === 0 ? -0.35 : 0.35);
      scheduleTone(frequency * (boss && beatStep % 2 === 0 ? 2 : 1), stepDuration * 0.8, start, {
        gain: arpGain * 0.6,
        type: 'sawtooth',
        attack: 0.003,
        hold: 0.3,
        detune: 14,
      }, arpFilter);
    }
    if (boss || phraseBar >= 4) {
      const note = NIGHT_LEAD.find((entry) => entry[0] === step % 64);
      if (note) scheduleGlideLead(chordToneFrequency(profile, tones, note[1], 2), start, stepDuration * note[2] * 0.95, 0.024 * gain);
    }
    if (bar % 2 === 1 && (beatStep === 3 || beatStep === 11)) {
      scheduleTone(chordToneFrequency(profile, tones, beatStep === 3 ? 8 : 7, 3), 0.5, start, {
        gain: 0.01 * gain,
        type: 'sine',
        attack: 0.003,
        pan: beatStep === 3 ? -0.7 : 0.7,
      }, melodyBus);
    }
  }

  // Between waves: half a drum kit, an offbeat bass, a gapped arpeggio and a pad.
  function scheduleInterludeStep(step, start, stepDuration, profile, gain) {
    const { beatStep, tones, bassNote } = trackFrame(step, profile);

    if (beatStep % 8 === 0) scheduleKick(start, 0.12 * gain, PUMP_DEPTH, KICK_TIGHT);
    if (beatStep % 8 === 4) scheduleClap(start, 0.07 * gain);
    if (beatStep % 4 === 2) {
      scheduleHat(start, 0.022 * gain, 0.05);
      scheduleBass(midiFrequency(bassNote + 12), start, stepDuration * 1.4, 0.055 * gain, 900, 'sawtooth', false);
    }
    if (beatStep === 0) {
      schedulePad(tones.map((tone) => midiFrequency(profile.root + 12 + tone)), start, stepDuration * 16.5, 0.012 * gain);
    }
    sweepArpFilter(step, start, 1500, 64);
    const tone = INTERLUDE_ARP[beatStep];
    if (tone !== null) {
      scheduleArp(chordToneFrequency(profile, tones, tone, 2), start, stepDuration * 0.75, 0.026 * gain, 'square', beatStep % 2 === 0 ? -0.35 : 0.35);
    }
  }

  const trackSteps = {
    meadow: scheduleMeadowStep,
    river: scheduleRiverStep,
    mine: scheduleMineStep,
    lake: scheduleLakeStep,
    night: scheduleNightStep,
    interlude: scheduleInterludeStep,
  };

  function scheduleGameOverStep(step, start, stepDuration, profile, profileGain) {
    const beatStep = step % MUSIC_BAR_STEPS;
    const [bassOffset, tones] = profile.chords[Math.floor(step / MUSIC_BAR_STEPS) % profile.chords.length];

    if (beatStep === 0) {
      schedulePad(tones.map((tone) => midiFrequency(profile.root + 12 + tone)), start, stepDuration * 16.5, 0.014 * profileGain);
      scheduleTone(midiFrequency(profile.root + bassOffset), stepDuration * 15, start, {
        gain: 0.05 * profileGain,
        type: 'sawtooth',
        attack: 0.3,
        hold: 0.5,
        cutoff: 320,
        endCutoff: 140,
      }, musicGain);
    }
    if (beatStep % 8 === 0) {
      scheduleTone(70, 0.5, start, { gain: 0.07 * profileGain, type: 'sine', endFrequency: 36, attack: 0.004 }, musicGain);
    }
    const note = LEAD_FALLING.find((entry) => entry[0] === step % MUSIC_SECTION_STEPS);
    if (note) {
      scheduleTone(chordToneFrequency(profile, tones, note[1], 2), stepDuration * note[2], start, {
        gain: 0.022 * profileGain,
        type: 'triangle',
        attack: 0.03,
        hold: 0.4,
        chorus: 8,
      }, leadFilter);
    }
  }

  function scheduleEndingStep(step, start, stepDuration, profile, profileGain = 1) {
    const chordIndex = Math.floor(step / 16) % profile.padChords.length;
    const chord = profile.padChords[chordIndex];
    const melody = profile.melody[step % profile.melody.length];
    const bass = profile.bass[step % profile.bass.length];

    if (step % 16 === 0) {
      chord.forEach((frequency, index) => {
        scheduleTone(frequency, stepDuration * 18, start, {
          gain: (index < 2 ? 0.020 : 0.013) * profileGain,
          type: index < 2 ? 'sine' : 'triangle',
          attack: 0.22,
          detune: index % 2 === 0 ? -4 : 5,
        }, musicGain);
      });
      scheduleNoise(stepDuration * 12, start + stepDuration * 0.4, {
        gain: 0.006 * profileGain,
        filterType: 'highpass',
        filterFrequency: 2400,
        q: 0.35,
      }, musicGain);
    }

    if (bass) {
      scheduleTone(bass * 0.5, stepDuration * 8, start, {
        gain: profile.bassGain * profileGain,
        type: 'sine',
        attack: 0.18,
      }, musicGain);
    }

    if (melody) {
      scheduleTone(melody, stepDuration * 4.2, start + stepDuration * 0.12, {
        gain: profile.melodyGain * profileGain,
        type: 'sine',
        attack: 0.09,
      }, musicGain);
      scheduleTone(melody * 2, stepDuration * 2.5, start + stepDuration * 0.35, {
        gain: 0.006 * profileGain,
        type: 'triangle',
        attack: 0.12,
        detune: 6,
      }, musicGain);
    }
  }

  function lerp(start, end, t) {
    return start + (end - start) * t;
  }

  // ── Sound effects ──────────────────────────────────────────────────────
  // One electronic family for the arcane cannon and what it hits: pitch-swept
  // pulses, filtered noise bursts, driven low hits and clean synth chimes.
  // Options carry delay and pan.

  // A pitch sweep: the body of every laser, blip and alarm.
  function zap(from, to, duration, gain, options = {}) {
    playTone(from, duration, { type: 'square', attack: 0.002, ...options, gain, endFrequency: to });
  }

  // A burst of filtered noise, optionally sweeping.
  function burst(duration, gain, options = {}) {
    playNoise(duration, { filterType: 'bandpass', filterFrequency: 2400, q: 0.9, ...options, gain });
  }

  // A heavy low hit: a falling sine and a puff of low noise, both through the drive.
  function thud(frequency, duration, gain, options = {}) {
    playTone(frequency, duration, { ...options, gain, type: 'sine', endFrequency: frequency * 0.4, attack: 0.002, drive: true });
    playNoise(Math.min(0.14, duration), { ...options, gain: gain * 0.5, filterType: 'lowpass', filterFrequency: 420, drive: true });
  }

  // A clean synth chime: a chorused triangle with a soft octave above.
  function chime(frequency, duration, gain, options = {}) {
    playTone(frequency, duration, { ...options, gain, type: 'triangle', attack: 0.003, chorus: 6 });
    playTone(frequency * 2, duration * 0.5, { ...options, gain: gain * 0.25, type: 'sine', attack: 0.002 });
  }

  // A saw chord whose filter closes as it rings.
  function stab(frequencies, duration, gain, options = {}) {
    frequencies.forEach((frequency, index) => {
      playTone(frequency, duration, {
        type: 'sawtooth', attack: 0.004, hold: 0.35, cutoff: 3200, endCutoff: 500, q: 2,
        ...options,
        gain: gain / Math.sqrt(frequencies.length),
        detune: index % 2 === 0 ? -7 : 7,
      });
    });
  }

  // A low synth growl: two detuned saws through a resonant filter that swells open
  // and flutters, then through the drive.
  function growl(frequency, duration, gain, options = {}) {
    const context = resumeAudio();
    if (!context || !masterGain) return;
    const start = context.currentTime + (options.delay || 0);
    const filter = context.createBiquadFilter();
    const envelope = createEnvelope(context);
    const flutter = context.createOscillator();
    const flutterDepth = context.createGain();
    filter.type = 'lowpass';
    filter.Q.value = 6;
    filter.frequency.setValueAtTime(110, start);
    filter.frequency.exponentialRampToValueAtTime(options.cutoff || 900, start + duration * 0.65);
    filter.frequency.exponentialRampToValueAtTime(160, start + duration);
    flutter.frequency.setValueAtTime(18, start);
    flutter.frequency.linearRampToValueAtTime(34, start + duration);
    flutterDepth.gain.value = 90;
    flutter.connect(flutterDepth);
    flutterDepth.connect(filter.frequency);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + duration * 0.55);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    filter.connect(envelope);
    envelope.connect(panned(driveBus, options.pan));
    [-9, 9].forEach((detune) => {
      const oscillator = context.createOscillator();
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(frequency, start);
      if (options.endFrequency) oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, start + duration);
      oscillator.detune.value = detune;
      oscillator.connect(filter);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.04);
    });
    flutter.start(start);
    flutter.stop(start + duration + 0.04);
  }

  function laneOf(targetX) {
    const widest = Math.max(...pathLanes.map(Math.abs)) || 1;
    return Math.max(-1, Math.min(1, targetX / widest)) * LANE_PAN_WIDTH;
  }

  // Menu and typing

  function playToggleSound() {
    zap(1100, 1500, 0.04, 0.03, { cutoff: 3600 });
    zap(1650, 2200, 0.05, 0.022, { delay: 0.045, cutoff: 4200 });
  }

  // Powering up: a rising sweep into a D minor stab.
  function playStartSound() {
    zap(110, 440, 0.28, 0.045, { type: 'sawtooth', cutoff: 500, endCutoff: 3000, q: 3 });
    burst(0.26, 0.02, { swell: true, filterFrequency: 900, endFilterFrequency: 6000 });
    stab([293.66, 440, 587.33], 0.55, 0.07, { delay: 0.26 });
    thud(73.42, 0.4, 0.07, { delay: 0.26 });
  }

  function playPauseSound() {
    zap(660, 620, 0.07, 0.035, { cutoff: 2400 });
    zap(440, 400, 0.09, 0.035, { delay: 0.09, cutoff: 2000 });
  }

  // Each letter is a plasma shot: a driven low thump under a crackle of bright noise
  // and a quick falling zap. The top layers brighten as the word fills in. It fires on
  // every key, so it stays short and the bright parts stay quiet.
  function playTypeSound(progress = Math.min(getTypedLength(), 12) / 12) {
    const amount = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
    const pitch = varyPitch(1700 + amount * 1100, 20);
    playTone(varyPitch(140 + amount * 22, 12), 0.12, { gain: 0.085, type: 'sine', endFrequency: 50, attack: 0.002, drive: true });
    playNoise(0.045, { gain: varyGain(0.03), filterFrequency: 3600 + amount * 3000, q: 1.2 });
    playTone(pitch, 0.06, { gain: 0.018, type: 'square', endFrequency: pitch * 0.3, attack: 0.001, cutoff: 5200 });
  }

  // A monster bursting out of hiding: a hit, a rush of noise and a falling stinger.
  function playAmbushSound(kind = 'cover', pan = 0) {
    if (kind === 'sky') {
      burst(0.26, 0.035, { pan, filterType: 'highpass', filterFrequency: 5000, endFilterFrequency: 700 });
      zap(1400, 280, 0.24, 0.035, { pan, type: 'sawtooth', cutoff: 3200, endCutoff: 700 });
      thud(100, 0.32, 0.085, { pan, delay: 0.18 });
      return;
    }
    const ground = kind === 'ground';
    thud(ground ? 62 : 110, 0.3, 0.09, { pan });
    burst(0.22, 0.035, { pan, filterFrequency: ground ? 300 : 700, endFilterFrequency: ground ? 1200 : 2800 });
    zap(ground ? 147 : 294, ground ? 55 : 104, 0.22, 0.04, { pan, type: 'sawtooth', cutoff: ground ? 900 : 1800, q: 3 });
  }

  // A monster at striking distance winding up: two charging sweeps, the second higher.
  function playWindupSound(pan = 0) {
    zap(294, 587, 0.12, 0.032, { pan, type: 'sawtooth', cutoff: 2600, hold: 0.5 });
    zap(392, 784, 0.16, 0.036, { pan, type: 'sawtooth', cutoff: 3000, hold: 0.5, delay: 0.12 });
  }

  function playBackspaceSound() {
    zap(280, 170, 0.06, 0.04, { type: 'triangle', cutoff: 1200 });
  }

  // Two dull digital blips, the second lower.
  function playMistakeSound() {
    zap(165, 150, 0.1, 0.055, { cutoff: 800, hold: 0.4 });
    zap(131, 110, 0.13, 0.055, { cutoff: 700, hold: 0.4, delay: 0.085 });
  }

  // Monsters

  // For bosses this is the arm cue: rocks unlock after their first-shot delay.
  function playRevealSound(enemy) {
    const pan = lanePan(enemy);
    if (enemy?.isBoss) {
      thud(70, 0.6, 0.09, { pan });
      growl(55, 1.1, 0.09, { pan, cutoff: 1000, endFrequency: 73.42 });
      growl(82.41, 0.9, 0.05, { pan: -pan, cutoff: 700, delay: 0.12 });
      burst(0.9, 0.03, { pan, swell: true, filterType: 'lowpass', filterFrequency: 200, endFilterFrequency: 1400 });
      return;
    }
    const laneIndex = Math.max(0, pathLanes.findIndex((lane) => lane === enemy?.lane));
    const pitch = 520 + laneIndex * 27;
    zap(pitch, pitch * 1.5, 0.14, 0.03, { pan, cutoff: 2800, hold: 0.4 });
  }

  // The monster bursting: mid-range noise and a falling sweep. It leaves the low end
  // to the cannon blast that fires with it, and lands with that blast's boom.
  function playDefeatSound(enemy) {
    if (enemy?.isBoss) {
      playBossExplosionSound(enemy);
      return;
    }
    const pan = lanePan(enemy);
    const base = varyPitch(700, 80);
    const delay = BEAM_CHARGE_TIME;
    burst(0.2, varyGain(0.05), { pan, delay, filterFrequency: varyPitch(1800, 300), endFilterFrequency: 450 });
    zap(base, base / 6, 0.18, varyGain(0.04), { pan, delay, type: 'sawtooth', cutoff: 2600, endCutoff: 400, q: 2 });
    playTone(220, 0.1, { gain: 0.035, type: 'sine', endFrequency: 90, attack: 0.002, pan, delay });
    zap(base * 2.5, base * 4, 0.07, 0.014, { pan, type: 'sine', delay: delay + 0.03 });
  }

  // A driven low hit, a long falling sweep and roar of noise, then sparks scattering
  // and one low minor chord.
  function playBossExplosionSound(enemy) {
    const pan = lanePan(enemy) * 0.6;
    duckMusic(0.35, 1.0);
    thud(92, 1.3, 0.15, { pan });
    thud(55, 0.9, 0.1, { delay: 0.09 });
    playNoise(1.4, { gain: 0.09, filterType: 'lowpass', filterFrequency: 1400, endFilterFrequency: 80, pan, drive: true });
    zap(660, 30, 1.1, 0.07, { pan, type: 'sawtooth', cutoff: 2600, endCutoff: 200, q: 3 });
    burst(0.4, 0.035, { filterFrequency: 3400, endFilterFrequency: 900, pan });
    for (let index = 0; index < 7; index += 1) {
      const pitch = 500 + Math.random() * 1500;
      zap(pitch, pitch * 0.3, 0.09, 0.03, {
        type: 'sawtooth',
        delay: 0.16 + Math.random() * 0.9,
        pan: Math.random() * 1.2 - 0.6,
        cutoff: 3000,
      });
    }
    stab([73.42, 110, 146.83, 174.61], 1.6, 0.07, { delay: 0.3, cutoff: 1400, endCutoff: 200 });
  }

  // The kill shot: a short rising whine as the cannon charges, then a driven boom
  // with a bright electric tail.
  function playBeamSound(targetX = 0) {
    const pan = laneOf(targetX);
    const delay = BEAM_CHARGE_TIME;
    zap(varyPitch(500, 60), 3200, delay, 0.03, { pan, type: 'sawtooth', attack: delay * 0.4, hold: 0.9, cutoff: 6000 });
    thud(96, 0.42, 0.13, { pan, delay });
    zap(330, 45, 0.3, 0.06, { pan, delay, type: 'sawtooth', cutoff: 1800, endCutoff: 250, q: 3, drive: true });
    burst(0.4, 0.03, { pan, delay, filterType: 'highpass', filterFrequency: 5200, q: 0.6 });
    for (let index = 0; index < 3; index += 1) {
      const pitch = 2500 + Math.random() * 2500;
      zap(pitch, pitch * 0.5, 0.02, 0.02, { pan, delay: delay + 0.06 + Math.random() * 0.3 });
    }
  }

  function playHealSound(healed) {
    chime(523.25, 0.3, 0.036);
    chime(659.25, 0.3, 0.034, { delay: 0.07 });
    if (healed > 0) {
      chime(783.99, 0.4, 0.034, { delay: 0.14 });
      chime(1567.98, 0.5, 0.014, { delay: 0.2 });
      zap(523.25, 1046.5, 0.3, 0.012, { type: 'sine', attack: 0.08 });
    }
  }

  function playMedicPassSound() {
    zap(420, 380, 0.08, 0.03, { type: 'triangle', cutoff: 1600 });
    zap(315, 270, 0.1, 0.028, { type: 'triangle', cutoff: 1400, delay: 0.09 });
  }

  // A hit on the wall: a heavy driven thud with a crunch of noise over it.
  function playDamageSound(enemy) {
    const bossHit = !!enemy?.isBoss;
    duckMusic(0.55, 0.3);
    thud(bossHit ? 55 : 72, bossHit ? 0.5 : 0.36, bossHit ? 0.13 : 0.1);
    playNoise(bossHit ? 0.34 : 0.24, { gain: 0.075, filterFrequency: 1100, endFilterFrequency: 180, q: 0.7, drive: true });
    zap(bossHit ? 98 : 123, 40, bossHit ? 0.4 : 0.28, 0.06, { type: 'sawtooth', cutoff: 900, endCutoff: 200, drive: true });
  }

  function playBossThrowSound(enemy) {
    const pan = lanePan(enemy) * 0.6;
    burst(0.22, 0.04, { pan, filterFrequency: 320, endFilterFrequency: 1500, q: 1.2 });
    zap(90, 240, 0.2, 0.04, { pan, type: 'sawtooth', cutoff: 1000, hold: 0.4 });
  }

  function playBossImpactSound() {
    thud(104, 0.26, 0.07);
    playNoise(0.05, { gain: 0.04, filterType: 'highpass', filterFrequency: 2000 });
    zap(300, 80, 0.1, 0.03, { cutoff: 1800 });
  }

  // An alarm: three rising sweeps over a growl.
  function playBossWarningSound() {
    duckMusic(0.45, 0.7);
    thud(82, 0.4, 0.085);
    [0, 0.26, 0.52].forEach((delay, index) => {
      const from = 330 * Math.pow(2, index / 12);
      zap(from, from * 2, 0.22, 0.042, { type: 'sawtooth', delay, cutoff: 2800, hold: 0.6, chorus: 9 });
    });
    growl(55, 1.2, 0.07, { cutoff: 800 });
  }

  // Potions

  // Charging up: a quick run of pulses climbing over a rising sweep.
  function playChainPrimeSound() {
    [880, 1108.73, 1318.51, 1760].forEach((frequency, index) => {
      zap(frequency, frequency * 1.06, 0.09, 0.026, { delay: index * 0.06, pan: index % 2 === 0 ? -0.3 : 0.3, cutoff: 4200 });
    });
    zap(220, 880, 0.3, 0.02, { type: 'sawtooth', cutoff: 800, endCutoff: 4000, q: 3 });
    burst(0.3, 0.02, { swell: true, filterFrequency: 1800, endFilterFrequency: 6000, q: 1.6 });
  }

  // One jump of chain lightning: a sharp crack, a falling zap, crackles and a low thump.
  function playChainZapSound(targetX = 0) {
    const pan = laneOf(targetX);
    playNoise(0.035, { gain: 0.085, filterType: 'highpass', filterFrequency: 2800, pan });
    zap(2600, 400, 0.07, 0.05, { pan, cutoff: 5000 });
    for (let index = 0; index < 4; index += 1) {
      const pitch = 900 + Math.random() * 1400;
      zap(pitch, pitch * (0.5 + Math.random()), 0.025, 0.028, { pan, delay: 0.03 + Math.random() * 0.16 });
    }
    thud(84, 0.24, 0.06);
  }

  // The world winding down: a long falling sweep with chimes stepping down and slowing.
  function playTimeFreezeSound() {
    zap(1567.98, 98, 0.9, 0.05, { type: 'sawtooth', cutoff: 4000, endCutoff: 200, q: 2 });
    [1567.98, 1174.66, 880, 587.33, 392].forEach((frequency, index) => {
      chime(frequency, 0.7, 0.022, { delay: index * index * 0.028, pan: index % 2 === 0 ? -0.35 : 0.35 });
    });
    thud(72, 0.7, 0.07, { delay: 0.42 });
    burst(0.6, 0.02, { filterFrequency: 5000, endFilterFrequency: 500, q: 1.2 });
  }

  function playTimeResumeSound() {
    zap(98, 784, 0.3, 0.04, { type: 'sawtooth', cutoff: 300, endCutoff: 3200, q: 2 });
    [392, 587.33, 880].forEach((frequency, index) => chime(frequency, 0.35, 0.022, { delay: index * 0.05 }));
    burst(0.25, 0.016, { filterFrequency: 600, endFilterFrequency: 4800, q: 1.2 });
  }

  // A driven blast and three waves of noise rolling outward.
  function playShockwaveSound() {
    duckMusic(0.4, 0.7);
    thud(88, 0.9, 0.14);
    thud(52, 1.1, 0.1, { delay: 0.04 });
    playNoise(0.7, { gain: 0.06, filterType: 'lowpass', filterFrequency: 500 });
    zap(440, 40, 0.6, 0.05, { type: 'sawtooth', cutoff: 2000, endCutoff: 200, drive: true });
    [0, 0.15, 0.3].forEach((delay) => {
      burst(0.5, 0.036, { delay, filterFrequency: 300, endFilterFrequency: 3000, q: 1.1 });
    });
  }

  // A force field switching on: a rising sweep under three stacked chimes.
  function playShieldActivateSound() {
    zap(147, 587, 0.4, 0.03, { type: 'sawtooth', cutoff: 400, endCutoff: 2600, q: 4 });
    [293.66, 440, 587.33].forEach((frequency, index) => chime(frequency, 0.8, 0.03, { delay: index * 0.09 }));
    playTone(146.83, 0.8, { gain: 0.04, type: 'sine', attack: 0.2 });
  }

  // The field taking a hit: a hard resonant clang over a thud.
  function playShieldBlockSound() {
    stab([220, 330, 446], 0.9, 0.08, { type: 'square', cutoff: 2600, endCutoff: 600, q: 6 });
    thud(110, 0.3, 0.08);
    playNoise(0.03, { gain: 0.05, filterType: 'highpass', filterFrequency: 3000 });
  }

  // Chests

  function playChestClackSound() {
    zap(300, 200, 0.05, 0.045, { cutoff: 1400 });
    zap(220, 150, 0.07, 0.04, { cutoff: 1200, delay: 0.035 });
    playTone(140, 0.12, { gain: 0.045, type: 'sine', endFrequency: 60, attack: 0.002 });
  }

  // The lock releasing, then a glint.
  function playChestOpenSound() {
    zap(180, 360, 0.14, 0.04, { type: 'sawtooth', cutoff: 1400, hold: 0.4 });
    [1318.51, 1760, 2093].forEach((frequency, index) => chime(frequency, 0.3, 0.016, { delay: 0.14 + index * 0.06 }));
  }

  // Wave results

  // Three synth stabs climbing to a held major chord: B flat, C, D.
  function playWaveClearSound() {
    stab([233.08, 293.66, 349.23], 0.3, 0.07);
    stab([261.63, 329.63, 392], 0.3, 0.07, { delay: 0.17 });
    stab([293.66, 369.99, 440, 587.33], 1.1, 0.085, { delay: 0.34, cutoff: 4200, endCutoff: 700 });
    thud(73.42, 0.5, 0.07, { delay: 0.34 });
    burst(0.7, 0.02, { delay: 0.34, filterType: 'highpass', filterFrequency: 5000 });
  }

  // ── Victory score ──────────────────────────────────────────────────────
  // A 40-second cue scored to the victory cinematic (ending-cinematic.js), on the
  // same 90 bpm bar grid: the night in D minor, words chiming into the wands, the
  // wave of light in D major on bar 4, the sunrise theme, one chime per letter of
  // the name on bars 10–11, and the full chord as the name completes on bar 12.
  // It runs on its own bus so Skip and Replay can fade it out.

  function scoreTone(frequency, start, duration, gain, options = {}) {
    scheduleTone(frequency, duration, start, { type: 'sine', attack: 0.004, ...options, gain }, scoreBus);
  }

  // The theme's voice: a sine body under a saw whose filter closes as the note rings.
  function scoreLead(frequency, start, duration, gain, pan = 0) {
    scoreTone(frequency, start, duration, gain * 0.85, { attack: 0.003, pan });
    scoreTone(frequency, start, duration * 0.8, gain * 0.5, { type: 'sawtooth', attack: 0.004, cutoff: 3000, endCutoff: 700, pan });
  }

  // A clean synth chime with harmonic overtones.
  function scoreChime(frequency, start, duration, gain, pan = 0) {
    scoreTone(frequency, start, duration, gain, { type: 'triangle', attack: 0.002, pan });
    scoreTone(frequency * 2, start, duration * 0.55, gain * 0.3, { attack: 0.001, pan });
    scoreTone(frequency * 3, start, duration * 0.25, gain * 0.1, { attack: 0.001, pan });
  }

  // The arpeggio voice: a short filtered pulse with a sine tail.
  function scorePluck(frequency, start, gain, pan = 0) {
    scoreTone(frequency, start, 1.1, gain, { attack: 0.002, pan });
    scoreTone(frequency, start, 0.3, gain * 0.5, { type: 'square', attack: 0.002, cutoff: 3600, endCutoff: 900, pan: -pan });
  }

  // A held chord: soft sine and triangle voices with a slow swell and release.
  function scorePad(frequencies, start, duration, gain, { attack = 0.6, release = 1.2, cutoff = 1800 } = {}) {
    const context = audioContext;
    if (!context || !scoreBus) return;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    filter.Q.value = 0.3;
    const envelope = createEnvelope(context);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(gain, start + attack);
    envelope.gain.setValueAtTime(gain, start + Math.max(attack, duration - release));
    envelope.gain.linearRampToValueAtTime(0.0001, start + duration);
    filter.connect(envelope);
    envelope.connect(scoreBus);
    frequencies.forEach((frequency, index) => {
      for (const [type, detune, level] of [['sine', -5, 1], ['triangle', 6, 0.45]]) {
        const oscillator = context.createOscillator();
        const voice = context.createGain();
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        oscillator.detune.value = detune + (index % 2 === 0 ? -3 : 3);
        voice.gain.value = level;
        oscillator.connect(voice);
        voice.connect(filter);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.05);
      }
    });
  }

  function scoreDrum(frequency, start, duration, gain) {
    scoreTone(frequency, start, duration, gain, { endFrequency: frequency * 0.45, attack: 0.003 });
    scheduleNoise(Math.min(0.12, duration), start, { gain: gain * 0.45, filterType: 'lowpass', filterFrequency: 320 }, scoreBus);
  }

  function scoreBoom(start, gain) {
    scheduleNoise(1.6, start, { gain, filterType: 'lowpass', filterFrequency: 700, q: 0.4 }, scoreBus);
  }

  function scoreCymbal(start, duration, gain) {
    scheduleNoise(duration, start, { gain, filterType: 'highpass', filterFrequency: 5200, q: 0.3 }, scoreBus);
  }

  // Rising air: filtered noise that grows louder and brighter, then stops dead.
  function scoreSwell(start, duration, gain, fromFrequency, toFrequency) {
    const context = audioContext;
    if (!context || !scoreBus) return;
    const source = createNoiseSource(context, start, duration);
    const filter = context.createBiquadFilter();
    const envelope = createEnvelope(context);
    filter.type = 'bandpass';
    filter.Q.value = 0.9;
    filter.frequency.setValueAtTime(fromFrequency, start);
    filter.frequency.exponentialRampToValueAtTime(toFrequency, start + duration);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + duration - 0.03);
    envelope.gain.linearRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(scoreBus);
  }

  function scoreBass(frequency, start, duration, gain) {
    scoreTone(frequency, start, duration, gain, { attack: 0.01 });
    scoreTone(frequency * 2, start, duration * 0.5, gain * 0.3, { type: 'triangle', attack: 0.006 });
  }

  function scoreKick(start, gain) {
    scoreTone(108, start, 0.22, gain, { endFrequency: 50, attack: 0.003 });
  }

  function scoreSnare(start, gain) {
    scheduleNoise(0.09, start, { gain, filterType: 'bandpass', filterFrequency: 1900, q: 0.7 }, scoreBus);
  }

  // An electronic rim tick on the offbeats.
  function scoreTick(start, gain, pan = 0) {
    scoreTone(1760, start, 0.03, gain * 0.6, { type: 'square', attack: 0.001, cutoff: 4000, pan });
    scheduleNoise(0.04, start, { gain: gain * 1.6, filterType: 'highpass', filterFrequency: 5000, q: 0.5, pan }, scoreBus);
  }

  function scoreShaker(start, gain) {
    scheduleNoise(0.05, start, { gain, filterType: 'highpass', filterFrequency: 7000, q: 0.4 }, scoreBus);
  }

  // A firework over the name: a soft thump, a crackle of sparks and a chime.
  function scoreFirework(start, pan) {
    scoreDrum(98, start, 0.6, 0.08);
    for (let index = 0; index < 7; index += 1) {
      scoreTone(1800 + Math.random() * 2600, start + 0.12 + Math.random() * 0.55, 0.04, 0.011, {
        attack: 0.001, pan: Math.max(-1, Math.min(1, pan + Math.random() * 0.5 - 0.25)),
      });
    }
    scoreChime(noteFrequency('A6'), start + 0.05, 1.3, 0.012, pan);
  }

  function buildVictoryScore(arrivals) {
    const N = noteFrequency;
    const B = SCORE_BEAT;
    const BAR = 4 * B;
    const E = B / 2;
    const events = [];
    const at = (time, play) => events.push({ time, play });
    const chord = (names) => names.map(N);

    // Bars 0–1: the silent night. A low drone, frozen chimes, D minor then B flat.
    at(0, (T) => scorePad(chord(['D2', 'A2']), T, 10.9, 0.03, { attack: 3, release: 1.0, cutoff: 900 }));
    at(0, (T) => scorePad(chord(['D3', 'F3', 'A3']), T, BAR + 0.3, 0.011, { attack: 1.4, release: 1, cutoff: 1400 }));
    at(BAR, (T) => scorePad(chord(['A#2', 'D3', 'F3']), T, BAR + 0.3, 0.011, { attack: 1.2, release: 1, cutoff: 1400 }));
    at(0, (T) => scoreSwell(T, 5.2, 0.005, 3000, 4600));
    [[0.667, 'A5'], [1.667, 'F5'], [2.333, 'D6'], [3.333, 'C6'], [4.0, 'A5'], [4.667, 'E5']].forEach(([time, name], index) => {
      at(time, (T) => scoreChime(N(name), T, 2.4, 0.018, index % 2 === 0 ? -0.4 : 0.4));
    });

    // Bars 2–3: the words gather. A plucked arpeggio climbs to the dominant,
    // each word chimes as it lands, and the air rises into the release.
    at(2 * BAR, (T) => scorePad(chord(['G2', 'A#2', 'D3', 'G3']), T, BAR + 0.3, 0.011, { attack: 0.9, release: 0.6, cutoff: 1600 }));
    at(3 * BAR, (T) => scorePad(chord(['A2', 'C#3', 'E3', 'A3']), T, BAR - 0.05, 0.013, { attack: 0.8, release: 0.25, cutoff: 2000 }));
    const minorArp = chord(['G4', 'A#4', 'D5', 'G5', 'A#5', 'D6', 'A#5', 'G5', 'D5', 'A#4']);
    const dominantArp = chord(['A4', 'C#5', 'E5', 'A5', 'C#6', 'E6', 'C#6', 'A5', 'E5', 'C#5']);
    for (let step = 0; ; step += 1) {
      const time = 2 * BAR + step * (B / 4);
      if (time >= 4 * BAR - 0.16) break;
      const progress = (time - 2 * BAR) / (2 * BAR);
      const notes = time < 3 * BAR ? minorArp : dominantArp;
      at(time, (T) => scorePluck(notes[step % notes.length], T, 0.006 + 0.012 * progress, Math.sin(step * 0.7) * 0.5));
    }
    const arrivalNotes = ['E5', 'F#5', 'G5', 'A5', 'B5', 'C#6', 'D6', 'E6', 'F#6', 'G6', 'A6', 'B6'];
    arrivals.slice(0, arrivalNotes.length).forEach((time, index) => {
      at(time, (T) => scoreChime(N(arrivalNotes[index]), T, 1.4, 0.026 - index * 0.0008, index % 2 === 0 ? -0.35 : 0.35));
    });
    at(7.0, (T) => scoreSwell(T, 4 * BAR - 7.05, 0.028, 350, 7500));
    [[3 * BAR, 0.05], [3 * BAR + B, 0.06], [3 * BAR + 2 * B, 0.07], [3 * BAR + 3 * B, 0.08], [3 * BAR + 3 * B + E, 0.09]].forEach(([time, gain]) => {
      at(time, (T) => scoreDrum(N('D2'), T, 0.35, gain));
    });

    // Bar 4: the wave of light.
    at(4 * BAR, (T) => {
      scoreDrum(N('D1'), T, 2.4, 0.2);
      scoreDrum(N('D2'), T, 1.4, 0.14);
      scoreBoom(T, 0.06);
      scoreCymbal(T, 3.8, 0.045);
      ['D6', 'F#6', 'A6', 'D7'].forEach((name, index) => scoreChime(N(name), T + index * 0.035, 2.2, 0.026, (index - 1.5) * 0.3));
      scorePad(chord(['D2', 'A2', 'D3', 'F#3', 'A3', 'D4']), T, 2.9, 0.012, { attack: 0.04, release: 1.2, cutoff: 3200 });
    });

    // Bars 4–9: the theme, as spring and the sunrise spread.
    const chords = {
      D: { pad: ['D3', 'F#3', 'A3', 'D4'], root: 'D2', fifth: 'A2', high: ['F#4', 'A4', 'D5'] },
      A: { pad: ['A2', 'E3', 'A3', 'C#4'], root: 'A1', fifth: 'E2', high: ['E4', 'A4', 'C#5'] },
      Bm: { pad: ['B2', 'F#3', 'B3', 'D4'], root: 'B1', fifth: 'F#2', high: ['F#4', 'B4', 'D5'] },
      G: { pad: ['G2', 'D3', 'G3', 'B3'], root: 'G1', fifth: 'D2', high: ['G4', 'B4', 'D5'] },
    };
    const themeMelody = {
      4: [[0, 'A4', 0.5], [2, 'D5', 0.4], [3, 'E5', 0.4], [4, 'F#5', 1.3]],
      5: [[0, 'E5', 0.5], [2, 'C#5', 0.4], [3, 'D5', 0.4], [4, 'E5', 0.6], [6, 'A4', 0.8]],
      6: [[0, 'B4', 0.5], [2, 'D5', 0.4], [3, 'E5', 0.4], [4, 'F#5', 0.5], [6, 'A5', 0.8]],
      7: [[0, 'G5', 0.9], [2, 'F#5', 0.5], [4, 'E5', 0.5], [6, 'D5', 0.8]],
      8: [[0, 'F#5', 0.5], [2, 'A5', 0.5], [4, 'D6', 1.8]],
      9: [[0, 'C#6', 0.6], [2, 'B5', 0.5], [4, 'A5', 0.6], [6, 'E5', 0.8]],
    };
    ['D', 'A', 'Bm', 'G', 'D', 'A'].forEach((name, offset) => {
      const bar = 4 + offset;
      const start = bar * BAR;
      const harmony = chords[name];
      at(start, (T) => scorePad(chord(harmony.pad), T, BAR + 0.4, bar === 4 ? 0.008 : 0.01, { attack: bar === 4 ? 0.3 : 0.5, release: 0.6, cutoff: 2200 }));
      at(start, (T) => scoreBass(N(harmony.root), T, 1.3, 0.045));
      at(start + 2 * B, (T) => scoreBass(N(harmony.fifth), T, 1.2, 0.035));
      if (bar >= 5) at(start, (T) => scoreKick(T, 0.05));
      at(start + 2 * B, (T) => scoreKick(T, 0.05));
      if (bar >= 5) {
        at(start + 1.5 * B, (T) => scoreTick(T, 0.01, -0.3));
        at(start + 3.5 * B, (T) => scoreTick(T, 0.01, 0.3));
      }
      if (bar >= 6) {
        for (let slot = 0; slot < 8; slot += 1) {
          at(start + slot * E, (T) => scoreShaker(T, slot % 2 === 1 ? 0.004 : 0.0025));
          const tone = N(harmony.high[slot % 3]) * 2;
          at(start + slot * E, (T) => scorePluck(tone, T, 0.005, slot % 2 === 0 ? -0.45 : 0.45));
        }
        at(start, (T) => scorePad(chord(harmony.high), T, BAR + 0.5, 0.006, { attack: 1.0, release: 0.8, cutoff: 3000 }));
      }
      themeMelody[bar].forEach(([slot, note, ring]) => {
        at(start + slot * E, (T) => {
          scoreLead(N(note), T, ring, 0.042, 0.1);
          if (bar >= 8) scorePluck(N(note) * 2, T, 0.01, -0.2);
        });
      });
    });

    // Bars 10–11: the name assembles, one chime per letter, over a rising roll.
    at(10 * BAR, (T) => scorePad(chord(['G2', 'D3', 'G3', 'B3', 'D4']), T, BAR + 0.3, 0.011, { attack: 0.4, release: 0.4, cutoff: 2400 }));
    at(11 * BAR, (T) => scorePad(chord(['A2', 'E3', 'A3', 'C#4', 'E4']), T, BAR, 0.013, { attack: 0.4, release: 0.15, cutoff: 2800 }));
    at(10 * BAR, (T) => scoreDrum(N('G1'), T, 1.2, 0.12));
    at(11 * BAR, (T) => scoreDrum(N('A1'), T, 1.2, 0.12));
    at(10 * BAR, (T) => scoreBass(N('G1'), T, 1.3, 0.045));
    at(10 * BAR + 2 * B, (T) => scoreBass(N('D2'), T, 1.2, 0.035));
    for (let beat = 0; beat < 4; beat += 1) at(10 * BAR + beat * B, (T) => scoreKick(T, 0.045));
    for (let slot = 0; slot < 8; slot += 1) {
      at(11 * BAR + slot * E, (T) => scoreBass(N('A1'), T, E * 0.9, 0.02 + slot * 0.004));
    }
    ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C#6', 'D6'].forEach((name, index) => {
      at(10 * BAR + index * B, (T) => {
        scoreChime(N(name), T, 1.6, 0.03, (index - 3.5) / 6);
        scoreLead(N(name), T, 0.5, 0.018, (index - 3.5) / 6);
      });
    });
    for (let step = 0; ; step += 1) {
      const time = 11 * BAR + step * (B / 4);
      if (time >= 12 * BAR - 0.05) break;
      const progress = step / 16;
      at(time, (T) => scoreSnare(T, 0.003 + 0.025 * progress));
    }
    at(10 * BAR + 3 * B, (T) => scoreSwell(T, BAR + B - 0.03, 0.03, 500, 9000));

    // Bar 12: the name is complete.
    at(12 * BAR, (T) => {
      scoreDrum(N('D1'), T, 2.8, 0.22);
      scoreDrum(N('D2'), T, 1.4, 0.15);
      scoreBoom(T, 0.06);
      scoreCymbal(T, 5, 0.055);
      scorePad(chord(['D2', 'A2', 'D3', 'F#3', 'A3', 'D4', 'F#4']), T, BAR + 0.3, 0.012, { attack: 0.03, release: 0.6, cutoff: 3600 });
      scoreChime(N('D6'), T, 2.6, 0.03, -0.2);
      scoreChime(N('A6'), T, 2.6, 0.022, 0.2);
      scoreChime(N('F#6'), T + 0.05, 2.2, 0.02, 0);
    });
    const finaleMelody = {
      12: [[0, 'F#5', 0.6], [2, 'A5', 0.6], [4, 'D6', 2.2]],
      13: [[0, 'E6', 0.6], [2, 'D6', 0.5], [3, 'C#6', 0.4], [4, 'B5', 0.9], [6, 'A5', 0.8]],
    };
    [12, 13].forEach((bar) => {
      const start = bar * BAR;
      finaleMelody[bar].forEach(([slot, note, ring]) => {
        at(start + slot * E, (T) => {
          scoreLead(N(note), T, ring, 0.05, 0.1);
          scorePluck(N(note) * 2, T, 0.012, -0.2);
        });
      });
      at(start, (T) => scoreKick(T, 0.05));
      at(start + 2 * B, (T) => scoreKick(T, 0.05));
      at(start + 1.5 * B, (T) => scoreTick(T, 0.01, -0.3));
      at(start + 3.5 * B, (T) => scoreTick(T, 0.01, 0.3));
      for (let slot = 0; slot < 8; slot += 1) at(start + slot * E, (T) => scoreShaker(T, slot % 2 === 1 ? 0.004 : 0.0025));
    });
    at(12 * BAR, (T) => scoreBass(N('D2'), T, 2, 0.05));
    at(12 * BAR + 2 * B, (T) => scoreBass(N('A1'), T, 1.2, 0.04));
    at(13 * BAR, (T) => scorePad(chord(['B2', 'F#3', 'B3', 'D4']), T, 2 * B + 0.3, 0.011, { attack: 0.2, release: 0.4, cutoff: 2400 }));
    at(13 * BAR + 2 * B, (T) => scorePad(chord(['G2', 'D3', 'G3', 'B3']), T, 2 * B + 0.3, 0.011, { attack: 0.2, release: 0.4, cutoff: 2400 }));
    at(13 * BAR, (T) => scoreBass(N('B1'), T, 1.2, 0.045));
    at(13 * BAR + 2 * B, (T) => scoreBass(N('G1'), T, 1.2, 0.045));
    [[12 * BAR + 2 * B, -0.5], [12 * BAR + 4 * B, 0.5], [12 * BAR + 6 * B, 0]].forEach(([time, pan]) => {
      at(time, (T) => scoreFirework(T, pan));
    });

    // Bar 14: home. The last chord rings on under the results card.
    at(14 * BAR, (T) => {
      scorePad(chord(['D2', 'A2', 'D3', 'F#3', 'A3', 'D4', 'A4']), T, 7, 0.012, { attack: 0.3, release: 3.5, cutoff: 2800 });
      scoreBass(N('D2'), T, 5, 0.05);
      scoreDrum(N('D1'), T, 2.5, 0.12);
      scoreCymbal(T, 4, 0.022);
      scoreLead(N('D6'), T, 3, 0.05, 0);
      scoreChime(N('D6'), T, 3.5, 0.022, 0);
      [['F#6', 0.5], ['A6', 1.0], ['D7', 1.6], ['A6', 2.4], ['F#6', 3.3], ['D6', 4.4]].forEach(([name, delay], index) => {
        scorePluck(N(name), T + delay, 0.011 - index * 0.0012, index % 2 === 0 ? -0.4 : 0.4);
      });
    });

    return events.sort((a, b) => a.time - b.time);
  }

  // Starts the score and returns its start on the audio clock, so the picture can follow it.
  function playVictoryScore({ arrivals = [] } = {}) {
    stopVictoryScore(0);
    const context = resumeAudio();
    if (!context || !masterGain) return null;
    stopMusicLoop(0.3);
    scoreBus = context.createGain();
    scoreBus.gain.value = SCORE_GAIN;
    scoreBus.connect(masterGain);
    if (reverbNode) {
      const send = context.createGain();
      send.gain.value = SCORE_REVERB_SEND;
      scoreBus.connect(send);
      send.connect(reverbNode);
    }
    scoreEvents = buildVictoryScore(arrivals);
    scoreIndex = 0;
    scoreStart = context.currentTime + 0.12;
    victoryScoreActive = true;
    scoreTimer = window.setInterval(scheduleScore, MUSIC_TIMER_INTERVAL);
    scheduleScore();
    return scoreStart;
  }

  function scheduleScore() {
    if (!audioContext || !scoreBus) return;
    const horizon = audioContext.currentTime + SCORE_SCHEDULE_AHEAD;
    while (scoreIndex < scoreEvents.length && scoreStart + scoreEvents[scoreIndex].time < horizon) {
      const event = scoreEvents[scoreIndex];
      scoreIndex += 1;
      event.play(scoreStart + event.time);
    }
    if (scoreIndex >= scoreEvents.length) {
      window.clearInterval(scoreTimer);
      scoreTimer = null;
      victoryScoreActive = false;
    }
  }

  function stopVictoryScore(fade = 0.3) {
    if (scoreTimer) window.clearInterval(scoreTimer);
    scoreTimer = null;
    scoreEvents = [];
    scoreIndex = 0;
    victoryScoreActive = false;
    if (scoreBus && audioContext) {
      const bus = scoreBus;
      const now = audioContext.currentTime;
      const length = Math.max(0.02, fade);
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(bus.gain.value, now);
      bus.gain.linearRampToValueAtTime(0.0001, now + length);
      window.setTimeout(() => bus.disconnect(), (length + 0.1) * 1000);
    }
    scoreBus = null;
  }

  function getAudioTime() {
    return audioContext ? audioContext.currentTime : null;
  }

  // A short resolution in the score's key, for when the cinematic is skipped.
  function playVictoryFinaleSound() {
    const context = resumeAudio();
    if (!context || !masterGain) return;
    const start = context.currentTime + 0.05;
    ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'].forEach((name, index) => {
      scheduleTone(noteFrequency(name), 3.6, start, {
        gain: index < 2 ? 0.03 : 0.018, type: index < 2 ? 'sine' : 'triangle', attack: 0.05, detune: index % 2 === 0 ? -4 : 5,
      }, sfxBus);
    });
    ['D5', 'F#5', 'A5', 'D6'].forEach((name, index) => {
      chime(noteFrequency(name), 1.6, 0.026, { delay: 0.05 + index * 0.11, pan: (index - 1.5) * 0.25 });
    });
    thud(noteFrequency('D2'), 0.9, 0.1);
  }

  // Powering down: a falling minor line, then a long sweep into the floor.
  function playGameOverSound() {
    [440, 349.23, 293.66, 220].forEach((frequency, index) => {
      playTone(frequency, index === 3 ? 0.9 : 0.4, {
        gain: 0.04, type: 'sawtooth', attack: 0.004, hold: 0.3, cutoff: 2200, endCutoff: 400, chorus: 9, delay: index * 0.16,
      });
    });
    zap(146.83, 36.71, 1.4, 0.06, { type: 'sawtooth', delay: 0.48, cutoff: 900, endCutoff: 120, q: 3, hold: 0.3 });
    thud(64, 0.8, 0.07, { delay: 0.5 });
  }

  function playGodModeOnSound() {
    [523.25, 659.25, 783.99, 1046.5, 1567.98].forEach((frequency, index) => {
      zap(frequency, frequency, 0.14, 0.024, { delay: index * 0.045, pan: index % 2 === 0 ? -0.3 : 0.3, cutoff: 4200 });
    });
    zap(196, 784, 0.26, 0.022, { type: 'sawtooth', cutoff: 600, endCutoff: 3600, q: 3 });
  }

  function playGodModeOffSound() {
    [1567.98, 1046.5, 783.99, 659.25, 523.25].forEach((frequency, index) => {
      zap(frequency, frequency, 0.14, 0.024, { delay: index * 0.045, pan: index % 2 === 0 ? 0.3 : -0.3, cutoff: 4200 });
    });
    zap(260, 130, 0.12, 0.04, { delay: 0.24, cutoff: 1200 });
  }

  return {
    toggleEnabled,
    updateAudioButton,
    resumeAudio,
    suspendAudio,
    wakeAudio,
    startMusicLoop,
    stopMusicLoop,
    playToggleSound,
    playStartSound,
    playPauseSound,
    playTypeSound,
    playAmbushSound,
    playWindupSound,
    playBackspaceSound,
    playMistakeSound,
    playRevealSound,
    playDefeatSound,
    playBeamSound,
    playChainPrimeSound,
    playChainZapSound,
    playTimeFreezeSound,
    playTimeResumeSound,
    playHealSound,
    playMedicPassSound,
    playDamageSound,
    playBossThrowSound,
    playBossImpactSound,
    playBossWarningSound,
    playWaveClearSound,
    playVictoryFinaleSound,
    playVictoryScore,
    stopVictoryScore,
    getAudioTime,
    playGameOverSound,
    playGodModeOnSound,
    playGodModeOffSound,
    playChestClackSound,
    playChestOpenSound,
    playShockwaveSound,
    playShieldActivateSound,
    playShieldBlockSound,
  };
}
