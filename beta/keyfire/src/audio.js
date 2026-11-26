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
// The ending score: 144 bpm, the same bar grid as ending-cinematic.js.
const SCORE_BEAT = 60 / 144;
// The wave tracks pass through GROOVE_TRIM and MUSIC_GAIN; this puts the score, which
// uses the same note levels, at the same loudness.
const SCORE_GAIN = 0.55;
const SCORE_REVERB_SEND = 0.14;
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
// Under the summary: the ending score's chords in A major, slowed to a quiet half-time loop.
const ENDING_MUSIC = {
  name: 'ending',
  baseStep: stepSeconds(96),
  barSteps: 16,
  barsPerChord: 2,
  echoSteps: 3,
  root: 33,
  chords: [[0, [0, 4, 7]], [-1, [-1, 2, 7]], [-3, [-3, 0, 4]], [5, [0, 5, 9]]],
};
// The loop's plucked figure and its bell tune: [step in the two-bar phrase, chord tone].
const ENDING_PLUCKS = [0, 2, 1, 2, 3, 2, 1, 2];
const ENDING_BELLS = [[0, 4], [6, 3], [12, 5], [20, 4], [26, 2]];

export function createKeyFireAudio({
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
  let typeShotSide = 1;
  let noiseBuffer = null;
  let musicTimer = null;
  let musicStep = 0;
  let nextMusicTime = 0;
  let activeMusicProfile = null;
  let previousMusicProfile = null;
  let musicTransitionStart = 0;
  let reverbNode = null;
  let scoreBus = null;
  let scorePump = null;
  let scoreMelody = null;
  let lastScoreLead = 0;
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

  // Under the summary: a soft kick, a pad, an offbeat bass, an echoing pluck and a few bells.
  function scheduleEndingStep(step, start, stepDuration, profile, profileGain = 1) {
    const gain = profileGain * GROOVE_TRIM;
    const { beatStep, bar, tones, bassNote } = trackFrame(step, profile);

    if (beatStep % 8 === 0) scheduleKick(start, 0.085 * gain, PUMP_DEPTH, KICK_SOFT);
    if (beatStep % 4 === 2) scheduleHat(start, 0.012 * gain, 0.05);
    if (beatStep === 0) {
      schedulePad(tones.map((tone) => midiFrequency(profile.root + 24 + tone)), start, stepDuration * 16.5, 0.012 * gain);
    }
    if (beatStep === 0 || beatStep === 6 || beatStep === 10) {
      scheduleBass(midiFrequency(bassNote + 12), start, stepDuration * (beatStep === 0 ? 5 : 3), 0.05 * gain, 700, 'sawtooth', false);
    }
    if (beatStep % 2 === 0) {
      const index = ENDING_PLUCKS[(beatStep / 2) % ENDING_PLUCKS.length];
      schedulePluck(chordToneFrequency(profile, tones, index, 3), start, 0.014 * gain, beatStep % 4 === 0 ? -0.3 : 0.3);
    }
    const note = ENDING_BELLS.find((entry) => entry[0] === step % 32);
    if (note && bar % 4 >= 2) scheduleBell(chordToneFrequency(profile, tones, note[1], 3), start, 1.4, 0.012 * gain, bar % 2 ? 0.3 : -0.3);
  }

  function lerp(start, end, t) {
    return start + (end - start) * t;
  }

  // ── Sound effects ──────────────────────────────────────────────────────
  // One electronic family for the plasma cannon and what it hits: pitch-swept
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

  // One blip of a storyteller's speech, as their words appear letter by letter.
  function playTalkSound(voice = 0) {
    const pitch = 360 + voice * 70 + Math.random() * 30;
    playTone(pitch, 0.045, { type: 'square', attack: 0.002, gain: 0.02, endFrequency: pitch * 0.92, cutoff: 2200 });
  }

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
    // Shots alternate a little left and right, like barrels firing in turn.
    typeShotSide = -typeShotSide;
    const pan = typeShotSide * 0.18;
    const pitch = varyPitch(1900 + amount * 1300, 25);
    // The body of the shot: a driven thump with a snarling saw falling through it.
    playTone(varyPitch(165 + amount * 30, 12), 0.14, { gain: 0.13, type: 'sine', endFrequency: 46, attack: 0.001, drive: true });
    playTone(varyPitch(120 + amount * 20, 8), 0.11, { gain: 0.09, type: 'sine', endFrequency: 52, attack: 0.001 });
    playTone(varyPitch(820 + amount * 260, 30), 0.09, { gain: 0.075, type: 'sawtooth', endFrequency: 150, attack: 0.001, cutoff: 3200, endCutoff: 500, q: 2, pan });
    // The crack on top: a bright noise snap, a falling laser chirp and a metallic ring.
    playNoise(0.05, { gain: varyGain(0.085), filterFrequency: 4200 + amount * 3200, q: 1.4, pan });
    playTone(pitch, 0.07, { gain: 0.05, type: 'square', endFrequency: pitch * 0.28, attack: 0.001, cutoff: 6400, pan });
    playTone(varyPitch(2900 + amount * 900, 40), 0.09, { gain: 0.02, type: 'triangle', attack: 0.001, delay: 0.012, pan: -pan });
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
    // Charge: two whines racing upward.
    zap(varyPitch(420, 60), 3600, delay, 0.04, { pan, type: 'sawtooth', attack: delay * 0.4, hold: 0.9, cutoff: 6500 });
    zap(varyPitch(630, 60), 5400, delay, 0.02, { pan: -pan, attack: delay * 0.5, hold: 0.9, cutoff: 7000 });
    // Blast: a deep double boom, a roaring saw falling through it and a long bright tail.
    thud(104, 0.5, 0.19, { pan, delay });
    thud(58, 0.6, 0.12, { delay: delay + 0.03 });
    playTone(84, 0.4, { gain: 0.11, type: 'sine', endFrequency: 40, attack: 0.002, delay, pan });
    zap(420, 40, 0.38, 0.085, { pan, delay, type: 'sawtooth', cutoff: 2400, endCutoff: 220, q: 3, drive: true });
    zap(300, 55, 0.3, 0.07, { pan, delay, type: 'sawtooth', cutoff: 1800, endCutoff: 260 });
    zap(1800, 240, 0.22, 0.06, { pan, delay, type: 'square', cutoff: 5200 });
    burst(0.55, 0.075, { pan, delay, filterType: 'highpass', filterFrequency: 4600, q: 0.6 });
    burst(0.16, 0.05, { pan, delay, filterFrequency: 1400, q: 0.9, drive: true });
    // Crackle as the beam dies away.
    for (let index = 0; index < 6; index += 1) {
      const pitch = 2400 + Math.random() * 3200;
      zap(pitch, pitch * 0.45, 0.022, 0.022, { pan: pan + (Math.random() - 0.5) * 0.5, delay: delay + 0.05 + Math.random() * 0.42 });
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

  // Power-ups

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

  // ── Ending score ───────────────────────────────────────────────────────
  // A 42-second cue scored to the ending cinematic (ending-cinematic.js), on the same
  // 144 bpm bar grid, in the night sky's key. A minor: the Dreadnought breaks on bar 1,
  // the groove builds as the words chime into the cannon (bars 2–5), the barrels wind
  // up on the dominant (bar 6) and the beam fires on bar 7. The myth bursts two beats
  // later and the piece turns to A major: the theme runs over the five lands, two bars
  // each (bars 8–17), opens out for the dawn (bars 18–21), lands on the game's name
  // (bar 22) and rings out from bar 24.
  // It has its own buses, so Skip and Replay can fade it out: scorePump for bass and
  // pads, which every kick dips, and scoreMelody for arpeggio, lead and bells, which
  // also feeds an echo.

  function scoreKick(start, gain, shape = KICK_PUNCH, pumpDepth = PUMP_DEPTH) {
    const context = audioContext;
    const oscillator = context.createOscillator();
    const envelope = createEnvelope(context);
    oscillator.frequency.setValueAtTime(shape.from, start);
    oscillator.frequency.exponentialRampToValueAtTime(shape.to, start + shape.drop);
    envelope.gain.setValueAtTime(gain, start);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + shape.length);
    oscillator.connect(envelope);
    envelope.connect(scoreBus);
    oscillator.start(start);
    oscillator.stop(start + shape.length + 0.03);
    scorePump.gain.setTargetAtTime(pumpDepth, start, 0.005);
    scorePump.gain.setTargetAtTime(1, start + 0.035, 0.07);
  }

  function scoreSnare(start, gain) {
    scheduleNoise(0.15, start, { gain, filterFrequency: 1800, q: 0.6 }, scoreBus);
    scheduleTone(210, 0.08, start, { gain: gain * 0.4, type: 'triangle', endFrequency: 140, attack: 0.001 }, scoreBus);
  }

  // A clap is a few hits a hundredth of a second apart.
  function scoreClap(start, gain) {
    for (let index = 0; index < 3; index += 1) {
      scheduleNoise(index === 2 ? 0.15 : 0.02, start + index * 0.011, { gain, filterFrequency: 1800, q: 0.6 }, scoreBus);
    }
  }

  function scoreHat(start, gain, length = 0.04) {
    scheduleNoise(length, start, { gain, filterType: 'highpass', filterFrequency: 7500, q: 0.5 }, scoreBus);
  }

  function scoreCrash(start, duration, gain) {
    scheduleNoise(duration, start, { gain, filterType: 'highpass', filterFrequency: 5200, q: 0.3 }, scoreBus);
  }

  // Rising air: filtered noise that grows louder and brighter, then stops dead.
  function scoreSweep(start, duration, gain, fromFrequency, toFrequency) {
    scheduleNoise(duration, start, { gain, swell: true, filterFrequency: fromFrequency, endFilterFrequency: toFrequency, q: 1.2 }, scoreBus);
  }

  // A heavy hit: a falling sine over a puff of low noise.
  function scoreBoom(start, gain, length = 1.2) {
    scheduleTone(95, length, start, { gain, endFrequency: 28, attack: 0.002 }, scoreBus);
    scheduleNoise(Math.min(1.6, length * 1.2), start, { gain: gain * 0.4, filterType: 'lowpass', filterFrequency: 600, q: 0.4 }, scoreBus);
  }

  function scoreBass(frequency, start, duration, gain, cutoff) {
    scheduleTone(frequency, duration, start, {
      gain, type: 'sawtooth', attack: 0.004, hold: 0.55, cutoff, endCutoff: BASS_FILTER_FLOOR, q: 5, chorus: 11,
    }, scorePump);
  }

  // A held chord of detuned saws; its filter can open or close as it rings.
  function scorePad(frequencies, start, duration, gain, { cutoff = 1100, endCutoff = cutoff, attack = duration * 0.25 } = {}) {
    const context = audioContext;
    const filter = context.createBiquadFilter();
    const envelope = createEnvelope(context);
    filter.type = 'lowpass';
    filter.Q.value = 0.5;
    filter.frequency.setValueAtTime(cutoff, start);
    filter.frequency.exponentialRampToValueAtTime(endCutoff, start + duration);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(gain, start + attack);
    envelope.gain.setValueAtTime(gain, start + Math.max(attack, duration * 0.7));
    envelope.gain.linearRampToValueAtTime(0.0001, start + duration);
    filter.connect(envelope);
    envelope.connect(scorePump);
    frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = 'sawtooth';
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index % 2 === 0 ? -7 : 8;
      oscillator.connect(filter);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.05);
    });
  }

  function scoreArp(frequency, start, duration, gain, pan, cutoff = 2600) {
    scheduleTone(frequency, duration, start, { gain, type: 'sawtooth', attack: 0.003, hold: 0.3, cutoff, q: 3, pan }, scoreMelody);
  }

  // The theme's voice, as in the night sky: two detuned saws that slide into each note.
  function scoreLead(frequency, start, duration, gain) {
    const context = audioContext;
    const filter = context.createBiquadFilter();
    const envelope = createEnvelope(context);
    filter.type = 'lowpass';
    filter.frequency.value = 3000;
    filter.Q.value = 1.2;
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.02);
    envelope.gain.setValueAtTime(gain, start + duration * 0.7);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    filter.connect(envelope);
    envelope.connect(scoreMelody);
    [-10, 10].forEach((detune) => {
      const oscillator = context.createOscillator();
      oscillator.type = 'sawtooth';
      oscillator.detune.value = detune;
      oscillator.frequency.setValueAtTime(lastScoreLead || frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(frequency, start + 0.06);
      oscillator.connect(filter);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.04);
    });
    lastScoreLead = frequency;
  }

  // An FM bell, as on the frozen lake: glassy, for the words and the name.
  function scoreBell(frequency, start, duration, gain, pan = 0) {
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
    envelope.connect(panned(scoreMelody, pan));
    [carrier, modulator].forEach((oscillator) => {
      oscillator.start(start);
      oscillator.stop(start + duration + 0.04);
    });
  }

  function buildVictoryScore(arrivals) {
    const N = noteFrequency;
    const B = SCORE_BEAT;
    const S = B / 4;
    const BAR = 4 * B;
    const events = [];
    const at = (time, play) => events.push({ time, play });
    const chord = (names) => names.map(N);
    // One bar of the groove's drums: a kick on every beat, backbeat, and hats between.
    const drums = (start, { claps = true, hats = true, level = 1 } = {}) => {
      for (let step = 0; step < 16; step += 1) {
        const time = start + step * S;
        if (step % 4 === 0) at(time, (T) => scoreKick(T, 0.15 * level));
        if (claps && step % 8 === 4) at(time, (T) => { scoreSnare(T, 0.09 * level); scoreClap(T, 0.06 * level); });
        if (hats) at(time, (T) => (step % 4 === 2 ? scoreHat(T, 0.03 * level, 0.15) : scoreHat(T, 0.014 * level, 0.03)));
      }
    };
    // Eighth-note saw bass, jumping an octave before beats 3 and 1.
    const bassLine = (start, root, gain, cutoff) => {
      for (let eighth = 0; eighth < 8; eighth += 1) {
        const frequency = N(root) * (eighth % 4 === 3 ? 2 : 1);
        at(start + eighth * 2 * S, (T) => scoreBass(frequency, T, 2 * S * 0.92, gain, cutoff * (eighth % 2 ? 1.25 : 1)));
      }
    };
    // Sixteenth-note arpeggio up and down the chord over two octaves.
    const ARP_SHAPE = [0, 2, 4, 2, 1, 3, 5, 3];
    const arpeggio = (start, tones, gain, cutoff) => {
      for (let step = 0; step < 16; step += 1) {
        const index = ARP_SHAPE[step % ARP_SHAPE.length];
        const frequency = N(tones[index % tones.length]) * 2 * (index >= tones.length ? 2 : 1);
        at(start + step * S, (T) => scoreArp(frequency, T, S * 0.8, gain * (step % 3 === 0 ? 1.25 : 1), step % 2 === 0 ? -0.35 : 0.35, cutoff));
      }
    };
    // [sixteenth, note, length in sixteenths]
    const melody = (start, notes, gain = 0.024) => {
      notes.forEach(([step, name, length]) => at(start + step * S, (T) => scoreLead(N(name), T, length * S * 0.95, gain)));
    };
    const roll = (start, steps, fromGain, toGain) => {
      for (let step = 0; step < steps; step += 1) at(start + step * S, (T) => scoreSnare(T, fromGain + (toGain - fromGain) * (step / steps)));
    };

    // Bars 0–1: the Dreadnought reels under four blasts, breaks on bar 1, and its myth rises.
    at(0, (T) => {
      scorePad(chord(['A1', 'E2', 'A2']), T, 2 * BAR + 0.2, 0.02, { cutoff: 420, endCutoff: 900, attack: 0.4 });
      scheduleTone(N('A4'), BAR, T, { gain: 0.03, type: 'sawtooth', endFrequency: N('A2'), cutoff: 1800, endCutoff: 300, chorus: 9, hold: 0.6 }, scoreMelody);
    });
    for (let blast = 0; blast < 4; blast += 1) {
      at((blast + 0.5) * B, (T) => {
        scoreBoom(T, 0.09, 0.4);
        scheduleNoise(0.2, T, { gain: 0.03, filterFrequency: 2200, endFilterFrequency: 500, q: 0.8, pan: blast % 2 ? 0.4 : -0.4 }, scoreBus);
      });
    }
    at(BAR, (T) => {
      scoreBoom(T, 0.22, 1.3);
      scoreCrash(T, 2.2, 0.035);
      [0, 1, 2, 3, 4].forEach((index) => scheduleTone(620 * Math.pow(1.31, index), 0.5, T + index * 0.05, {
        gain: 0.012, type: 'square', attack: 0.001, cutoff: 3200, pan: index % 2 ? 0.5 : -0.5,
      }, scoreMelody));
      // The myth rising: a slow glide up an octave, in bare fifths.
      scheduleTone(N('A2'), BAR, T, { gain: 0.022, type: 'sawtooth', endFrequency: N('A3'), cutoff: 900, endCutoff: 2400, chorus: 12, hold: 0.9 }, scoreMelody);
      scheduleTone(N('E3'), BAR, T, { gain: 0.016, type: 'sawtooth', endFrequency: N('E4'), cutoff: 900, endCutoff: 2400, chorus: 12, hold: 0.9 }, scoreMelody);
    });
    at(BAR + 2 * B, (T) => scoreSweep(T, 2 * B, 0.02, 500, 5000));

    // Bars 2–5: the charge. The groove comes in piece by piece under the word chimes.
    const chargeChords = [
      { root: 'A1', pad: ['A2', 'E3', 'A3', 'C4'], tones: ['A3', 'C4', 'E4'] },
      { root: 'A1', pad: ['A2', 'E3', 'A3', 'C4'], tones: ['A3', 'C4', 'E4'] },
      { root: 'F1', pad: ['F2', 'C3', 'F3', 'A3'], tones: ['A3', 'C4', 'F4'] },
      { root: 'G1', pad: ['G2', 'D3', 'G3', 'B3'], tones: ['G3', 'B3', 'D4'] },
    ];
    chargeChords.forEach((harmony, offset) => {
      const start = (2 + offset) * BAR;
      const rise = offset / 3;
      at(start, (T) => scorePad(chord(harmony.pad), T, BAR + 0.15, 0.011, { cutoff: 700 + 700 * rise }));
      bassLine(start, harmony.root, 0.06 + 0.015 * rise, 520 + 700 * rise);
      if (offset < 2) {
        at(start, (T) => scoreKick(T, 0.15));
        at(start + 2 * B, (T) => scoreKick(T, 0.15));
        for (let eighth = 0; eighth < 8; eighth += 1) {
          if (offset === 1 || eighth % 2 === 1) at(start + eighth * 2 * S, (T) => scoreHat(T, eighth % 2 ? 0.026 : 0.012, eighth % 2 ? 0.1 : 0.03));
        }
      } else {
        drums(start, { level: 1 });
        arpeggio(start, harmony.tones, 0.016 + 0.006 * (offset - 2), 1800 + 500 * (offset - 2));
      }
    });
    const arrivalNotes = ['A4', 'C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6'];
    arrivals.slice(0, arrivalNotes.length).forEach((time, index) => {
      at(time, (T) => {
        scoreBell(N(arrivalNotes[index]), T, 0.9, 0.03, index % 2 === 0 ? -0.35 : 0.35);
        scheduleTone(N(arrivalNotes[index]) / 2, 0.12, T, { gain: 0.014, type: 'square', attack: 0.002, cutoff: 2400 }, scoreMelody);
      });
    });

    // Bar 6: the barrels wind up on the dominant: a snare roll, a rising whine and air.
    at(6 * BAR, (T) => {
      scorePad(chord(['E2', 'B2', 'E3', 'G#3', 'B3']), T, BAR, 0.012, { cutoff: 700, endCutoff: 3600, attack: 0.1 });
      scheduleTone(N('E3'), BAR, T, { gain: 0.022, type: 'sawtooth', endFrequency: N('E5'), cutoff: 1400, endCutoff: 4200, chorus: 14, hold: 0.95 }, scoreMelody);
      scoreSweep(T, BAR - 0.02, 0.045, 400, 9000);
    });
    for (let step = 0; step < 16; step += 1) {
      at(6 * BAR + step * S, (T) => scoreBass(N('E1'), T, S * 0.9, 0.05 + step * 0.002, 500 + step * 110));
      if (step % 4 === 0 || step >= 14) at(6 * BAR + step * S, (T) => scoreKick(T, 0.15));
    }
    roll(6 * BAR, 16, 0.012, 0.085);

    // Bar 7: the beam, held for two beats, then the myth bursts and the light floods out.
    at(7 * BAR, (T) => {
      scoreBoom(T, 0.24, 0.8);
      scheduleTone(2600, 0.45, T, { gain: 0.045, type: 'square', endFrequency: 180, attack: 0.001, cutoff: 5200, endCutoff: 900 }, scoreMelody);
      scorePad(chord(['A1', 'A2', 'E3', 'A3', 'E4']), T, 2 * B, 0.02, { cutoff: 900, endCutoff: 5200, attack: 0.02 });
      scheduleNoise(2 * B, T, { gain: 0.03, filterFrequency: 1200, endFilterFrequency: 3400, q: 0.7, swell: true }, scoreBus);
      scheduleTone(N('A5'), 2 * B, T, { gain: 0.012, type: 'sawtooth', endFrequency: N('A6'), cutoff: 6000, hold: 0.95, chorus: 17 }, scoreMelody);
    });
    at(7 * BAR + 2 * B, (T) => {
      scoreBoom(T, 0.26, 1.6);
      scoreCrash(T, 2.6, 0.045);
      for (let index = 0; index < 10; index += 1) {
        scoreBell(1400 + Math.random() * 3200, T + 0.03 + Math.random() * 0.55, 0.5, 0.011, Math.random() * 1.6 - 0.8);
      }
      // The flood of light: air and a major chord swelling into the downbeat.
      scoreSweep(T, 2 * B - 0.02, 0.05, 800, 11000);
      scorePad(chord(['A3', 'C#4', 'E4', 'A4']), T, 2 * B, 0.014, { cutoff: 800, endCutoff: 6000, attack: 2 * B * 0.9 });
    });

    // Bars 8–17: A major. The theme, one two-bar phrase for each land, over the full groove.
    const lands = [
      { roots: ['A1', 'A1'], pad: ['A2', 'E3', 'A3', 'C#4', 'E4'], tones: ['A3', 'C#4', 'E4'],
        tune: [[0, 'E5', 4], [4, 'A5', 4], [8, 'C#6', 6], [14, 'B5', 2], [16, 'A5', 6], [22, 'E5', 2], [24, 'A5', 8]] },
      { roots: ['G#1', 'G#1'], pad: ['G#2', 'E3', 'G#3', 'B3', 'E4'], tones: ['G#3', 'B3', 'E4'],
        tune: [[0, 'B5', 4], [4, 'G#5', 4], [8, 'E5', 6], [14, 'G#5', 2], [16, 'B5', 8], [24, 'E6', 8]] },
      { roots: ['F#1', 'F#1'], pad: ['F#2', 'C#3', 'F#3', 'A3', 'C#4'], tones: ['F#3', 'A3', 'C#4'],
        tune: [[0, 'C#6', 4], [4, 'A5', 4], [8, 'F#5', 6], [14, 'A5', 2], [16, 'C#6', 6], [22, 'B5', 2], [24, 'A5', 8]] },
      { roots: ['D2', 'D2'], pad: ['D2', 'A2', 'D3', 'F#3', 'A3'], tones: ['F#3', 'A3', 'D4'],
        tune: [[0, 'D6', 4], [4, 'A5', 4], [8, 'F#5', 6], [14, 'A5', 2], [16, 'D6', 6], [22, 'E6', 2], [24, 'F#6', 8]] },
      { roots: ['B1', 'E2'], pad: null, tones: null,
        tune: [[0, 'F#6', 4], [4, 'D6', 4], [8, 'B5', 6], [14, 'D6', 2], [16, 'E6', 4], [20, 'G#5', 4], [24, 'B5', 4], [28, 'E6', 4]] },
    ];
    const SKY_BARS = [
      { pad: ['B2', 'F#3', 'B3', 'D4'], tones: ['F#3', 'B3', 'D4'] },
      { pad: ['E2', 'B2', 'E3', 'G#3', 'B3'], tones: ['G#3', 'B3', 'E4'] },
    ];
    lands.forEach((land, index) => {
      const start = (8 + index * 2) * BAR;
      at(start, (T) => scoreCrash(T, index === 0 ? 3 : 1.4, index === 0 ? 0.04 : 0.018));
      for (let half = 0; half < 2; half += 1) {
        const barStart = start + half * BAR;
        const harmony = land.pad ? land : SKY_BARS[half];
        const lastBar = index === lands.length - 1 && half === 1;
        at(barStart, (T) => scorePad(chord(harmony.pad), T, BAR + 0.15, 0.011, { cutoff: 1500 }));
        bassLine(barStart, land.roots[half], 0.075, 1200);
        arpeggio(barStart, harmony.tones, 0.022, 2600);
        drums(barStart);
        if (lastBar) {
          roll(barStart + 2 * B, 8, 0.02, 0.08);
          at(barStart, (T) => scoreSweep(T, BAR - 0.02, 0.04, 500, 9000));
        }
      }
      melody(start, land.tune);
      // The wave of light crosses a land 1.05 s into its shot: air, then a bell.
      at(start + 1.05 - 0.5, (T) => scoreSweep(T, 0.5, 0.022, 3000, 9000));
      at(start + 1.05, (T) => {
        scoreBell(N(land.tones ? land.tones[2] : 'D4') * 4, T, 1.1, 0.02, 0.2);
        scoreCrash(T, 0.7, 0.012);
      });
    });

    // Bars 18–21: dawn. Half-time drums and a broad tune over A, D, F sharp minor and E.
    const dawn = [
      { root: 'A1', pad: ['A2', 'E3', 'A3', 'C#4', 'E4', 'A4'], tones: ['A3', 'C#4', 'E4'], tune: [[0, 'C#6', 8], [8, 'E6', 8]] },
      { root: 'D2', pad: ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'], tones: ['F#3', 'A3', 'D4'], tune: [[0, 'F#6', 6], [6, 'E6', 2], [8, 'D6', 8]] },
      { root: 'F#1', pad: ['F#2', 'C#3', 'F#3', 'A3', 'C#4'], tones: ['F#3', 'A3', 'C#4'], tune: [[0, 'C#6', 8], [8, 'A5', 4], [12, 'C#6', 4]] },
      { root: 'E2', pad: ['E2', 'B2', 'E3', 'G#3', 'B3', 'E4'], tones: ['G#3', 'B3', 'E4'], tune: [[0, 'B5', 6], [6, 'C#6', 2], [8, 'E6', 4], [12, 'G#6', 4]] },
    ];
    at(18 * BAR, (T) => {
      scoreBoom(T, 0.16, 1.4);
      scoreCrash(T, 4, 0.045);
    });
    dawn.forEach((harmony, offset) => {
      const start = (18 + offset) * BAR;
      at(start, (T) => scorePad(chord(harmony.pad), T, BAR + 0.2, 0.012, { cutoff: 2000 }));
      at(start, (T) => scoreBass(N(harmony.root), T, 2 * B * 0.95, 0.075, 1000));
      at(start + 2 * B, (T) => scoreBass(N(harmony.root), T, B * 0.95, 0.07, 1000));
      at(start + 3 * B, (T) => scoreBass(N(harmony.root) * 2, T, B * 0.95, 0.065, 1300));
      at(start, (T) => scoreKick(T, 0.16, KICK_HEAVY));
      at(start + 2 * B, (T) => { scoreSnare(T, 0.1); scoreClap(T, 0.065); });
      at(start + 3.5 * B, (T) => scoreKick(T, 0.12));
      for (let eighth = 0; eighth < 8; eighth += 1) at(start + eighth * 2 * S, (T) => scoreHat(T, eighth % 2 ? 0.026 : 0.012, eighth % 2 ? 0.12 : 0.03));
      arpeggio(start, harmony.tones, 0.017, 3200);
      melody(start, harmony.tune, 0.027);
    });
    roll(21 * BAR + 2 * B, 8, 0.02, 0.085);
    at(21 * BAR, (T) => scoreSweep(T, BAR - 0.02, 0.045, 500, 10000));

    // Bars 22–23: the name. Everything lands on A, with bells running up over it.
    at(22 * BAR, (T) => {
      scoreBoom(T, 0.24, 1.6);
      scoreCrash(T, 4.5, 0.05);
      ['A5', 'C#6', 'E6', 'A6', 'C#7'].forEach((name, index) => scoreBell(N(name), T + index * S, 1.6, 0.024, (index - 2) * 0.3));
    });
    const title = [
      { root: 'A1', pad: ['A2', 'E3', 'A3', 'C#4', 'E4', 'A4'], tones: ['A3', 'C#4', 'E4'], tune: [[0, 'A6', 10], [12, 'E6', 4]] },
      { root: 'A1', pad: ['A2', 'D3', 'F#3', 'A3', 'D4', 'F#4'], tones: ['F#3', 'A3', 'D4'], tune: [[0, 'F#6', 4], [4, 'E6', 4], [8, 'D6', 4], [12, 'E6', 4]] },
    ];
    title.forEach((harmony, offset) => {
      const start = (22 + offset) * BAR;
      at(start, (T) => scorePad(chord(harmony.pad), T, BAR + 0.2, 0.013, { cutoff: 2600 }));
      bassLine(start, harmony.root, 0.075, 1300);
      arpeggio(start, harmony.tones, 0.022, 3400);
      drums(start);
      melody(start, harmony.tune, 0.027);
    });
    roll(23 * BAR + 3 * B, 4, 0.03, 0.08);

    // Bar 24: home. The last chord rings on under the summary.
    at(24 * BAR, (T) => {
      scoreKick(T, 0.16, KICK_HEAVY);
      scoreBoom(T, 0.16, 1.8);
      scoreCrash(T, 3.5, 0.04);
      scorePad(chord(['A1', 'A2', 'E3', 'A3', 'C#4', 'E4', 'A4']), T, 4.6, 0.013, { cutoff: 2800, endCutoff: 700, attack: 0.03 });
      scoreBass(N('A1'), T, 2.6, 0.07, 900);
      scoreLead(N('A6'), T, 1.6, 0.024);
      [['A5', 0], ['E6', 2], ['A6', 4], ['C#7', 6], ['E7', 8]].forEach(([name, step], index) => {
        scoreBell(N(name), T + step * S, 2.4, 0.022 - index * 0.002, (index - 2) * 0.3);
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
    scorePump = context.createGain();
    scorePump.connect(scoreBus);
    scoreMelody = context.createGain();
    scoreMelody.connect(scoreBus);
    // An echo three sixteenths long, as on the wave tracks.
    const echo = context.createDelay(1);
    const echoSend = context.createGain();
    const echoFeedback = context.createGain();
    const echoTone = context.createBiquadFilter();
    echo.delayTime.value = SCORE_BEAT * 0.75;
    echoSend.gain.value = ECHO_SEND;
    echoFeedback.gain.value = ECHO_FEEDBACK;
    echoTone.type = 'lowpass';
    echoTone.frequency.value = 2400;
    scoreMelody.connect(echoSend);
    echoSend.connect(echo);
    echo.connect(echoTone);
    echoTone.connect(echoFeedback);
    echoFeedback.connect(echo);
    echoTone.connect(scoreBus);

    lastScoreLead = 0;
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
    scorePump = null;
    scoreMelody = null;
  }

  function getAudioTime() {
    return audioContext ? audioContext.currentTime : null;
  }

  // The score's last bar in brief, for when the cinematic is skipped: a hit and A major.
  function playVictoryFinaleSound() {
    const context = resumeAudio();
    if (!context || !masterGain) return;
    stab(['A2', 'E3', 'A3', 'C#4', 'E4', 'A4'].map(noteFrequency), 2.6, 0.085, { cutoff: 3600, endCutoff: 500 });
    ['A5', 'C#6', 'E6', 'A6'].forEach((name, index) => {
      chime(noteFrequency(name), 1.6, 0.024, { delay: index * SCORE_BEAT / 4, pan: (index - 1.5) * 0.3 });
    });
    thud(noteFrequency('A2'), 0.9, 0.09);
    burst(1.4, 0.016, { filterType: 'highpass', filterFrequency: 5200 });
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
    playTalkSound,
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
