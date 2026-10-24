// The output limiter adds about 2 dB of make-up gain, so the master sits a little lower than it used to.
const MASTER_VOLUME = 0.78;
const MUSIC_GAIN = 0.82;
const MUSIC_TIMER_INTERVAL = 80;
const MUSIC_SCHEDULE_AHEAD = 0.34;
const MUSIC_TRANSITION_DURATION = 1.2;
// Song form: each season theme plays its melody twice, then its B section, then the melody again.
const MUSIC_SECTION_STEPS = 32;
const MUSIC_FORM = ['a', 'a', 'b', 'a'];
const MUSIC_STEP_WRAP = 256;
const MUSIC_REVERB_SEND = 0.2;
const SFX_REVERB_SEND = 0.24;
const ECHO_TIME = 0.29;
const ECHO_FEEDBACK = 0.3;
const ECHO_SEND = 0.26;
const MUSIC_FILTER_OPEN = 18000;
const MUSIC_FILTER_LOW_LIFE = 3400;
const MUSIC_FILTER_FROZEN = 420;
const FROZEN_TEMPO_STRETCH = 1.4;
const LANE_PAN_WIDTH = 0.7;
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
const MUSIC_SEASONS = [
  {
    name: 'spring',
    voice: 'marimba',
    baseStep: 0.185,
    melodyType: 'triangle',
    bassType: 'sine',
    accentType: 'sine',
    melodyGain: 0.022,
    bassGain: 0.024,
    hatGain: 0.006,
    drumGain: 0.011,
    drumFilter: 680,
    melody: [
      523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, null,
      587.33, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33, null,
      659.25, 783.99, 987.77, 880.0, 783.99, 659.25, 587.33, 523.25,
      493.88, null, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25,
    ],
    melodyB: [
      783.99, 659.25, 523.25, 659.25, 880.0, 698.46, 587.33, 698.46,
      1046.5, 880.0, 698.46, 880.0, 987.77, 783.99, 587.33, null,
      659.25, 783.99, 1046.5, 783.99, 698.46, 880.0, 1174.66, 880.0,
      880.0, 1046.5, 880.0, 698.46, 783.99, null, 587.33, null,
    ],
    bass: [
      130.81, null, null, null, 146.83, null, null, null,
      174.61, null, null, null, 196.0, null, 174.61, null,
    ],
  },
  {
    name: 'summer',
    voice: 'pluck',
    baseStep: 0.168,
    melodyType: 'square',
    bassType: 'triangle',
    accentType: 'triangle',
    melodyGain: 0.026,
    bassGain: 0.03,
    hatGain: 0.011,
    drumGain: 0.018,
    drumFilter: 520,
    melody: [
      587.33, 739.99, 880.0, 739.99, 987.77, 880.0, 739.99, 659.25,
      587.33, null, 659.25, 739.99, 880.0, 987.77, 880.0, 739.99,
      659.25, 783.99, 987.77, 1174.66, 987.77, 880.0, 783.99, 659.25,
      739.99, null, 880.0, 987.77, 1174.66, 987.77, 880.0, 739.99,
    ],
    melodyB: [
      739.99, 880.0, 1174.66, 880.0, 880.0, 659.25, 880.0, 659.25,
      659.25, 783.99, 1046.5, 783.99, 587.33, 783.99, 987.77, 880.0,
      1174.66, 880.0, 739.99, 880.0, 880.0, 987.77, 880.0, 659.25,
      783.99, 1046.5, 1318.51, 1046.5, 987.77, 1174.66, 987.77, 880.0,
    ],
    bass: [
      146.83, null, 146.83, null, 110.0, null, 110.0, null,
      130.81, null, 130.81, null, 98.0, null, 110.0, null,
    ],
  },
  {
    name: 'autumn',
    voice: 'marimba',
    baseStep: 0.178,
    melodyType: 'sawtooth',
    bassType: 'triangle',
    accentType: 'triangle',
    melodyGain: 0.02,
    bassGain: 0.032,
    hatGain: 0.008,
    drumGain: 0.02,
    drumFilter: 420,
    melody: [
      440.0, 523.25, 659.25, 587.33, 523.25, 493.88, 440.0, null,
      392.0, 493.88, 587.33, 659.25, 587.33, 523.25, 493.88, null,
      349.23, 440.0, 523.25, 659.25, 587.33, 523.25, 440.0, 392.0,
      329.63, null, 392.0, 493.88, 587.33, 523.25, 493.88, 392.0,
    ],
    melodyB: [
      659.25, 523.25, 440.0, 523.25, 587.33, 493.88, 392.0, 493.88,
      523.25, 440.0, 349.23, 440.0, 493.88, 587.33, 659.25, null,
      440.0, 523.25, 659.25, 880.0, 783.99, 587.33, 493.88, 587.33,
      698.46, 523.25, 440.0, 523.25, 587.33, 493.88, 440.0, null,
    ],
    bass: [
      110.0, null, null, null, 98.0, null, 98.0, null,
      87.31, null, null, null, 98.0, null, 110.0, null,
    ],
  },
  {
    name: 'winter',
    voice: 'musicbox',
    baseStep: 0.192,
    melodyType: 'sine',
    bassType: 'sine',
    accentType: 'triangle',
    melodyGain: 0.018,
    bassGain: 0.022,
    hatGain: 0.007,
    drumGain: 0.009,
    drumFilter: 1100,
    melody: [
      659.25, null, 783.99, null, 987.77, 880.0, null, 783.99,
      587.33, null, 739.99, null, 880.0, 783.99, null, 739.99,
      523.25, null, 659.25, null, 783.99, 739.99, null, 659.25,
      493.88, null, 587.33, null, 739.99, 659.25, null, 587.33,
    ],
    melodyB: [
      987.77, null, 783.99, null, 659.25, 783.99, null, 987.77,
      880.0, null, 739.99, null, 587.33, 739.99, null, 880.0,
      783.99, null, 659.25, null, 523.25, 659.25, null, 783.99,
      739.99, null, 587.33, null, 493.88, 587.33, null, 659.25,
    ],
    bass: [
      82.41, null, null, null, 98.0, null, null, null,
      73.42, null, null, null, 87.31, null, 98.0, null,
    ],
  },
];
const FINAL_WAVE_MUSIC = {
  name: 'final-wave',
  isBoss: true,
  baseStep: 0.156,
  minStep: 0.112,
  intensityBoost: 5,
  melodyType: 'triangle',
  bassType: 'sine',
  accentType: 'sine',
  melodyGain: 0.034,
  bassGain: 0.030,
  hatGain: 0.006,
  drumGain: 0.018,
  drumFilter: 150,
  melody: [
    587.33, null, 698.46, 880.00, null, 783.99, 698.46, null,
    659.25, null, 880.00, 1046.50, null, 987.77, 880.00, null,
    783.99, null, 987.77, 1174.66, null, 1046.50, 987.77, null,
    880.00, 783.99, 698.46, null, 659.25, 698.46, 783.99, null,
    587.33, null, 698.46, 880.00, null, 783.99, 698.46, null,
    659.25, null, 880.00, 1046.50, null, 1174.66, 1318.51, null,
    1396.91, 1318.51, 1174.66, 1046.50, 987.77, 880.00, 783.99, null,
    698.46, null, 587.33, null, 440.00, 523.25, 587.33, null,
  ],
  bass: [
    73.42, null, null, null, 73.42, null, null, null,
    58.27, null, null, null, 58.27, null, null, null,
    87.31, null, null, null, 87.31, null, null, null,
    65.41, null, null, null, 65.41, null, null, null,
  ],
  padChords: [
    [73.42, 146.83, 220.00, 293.66, 349.23],
    [58.27, 116.54, 174.61, 293.66, 349.23],
    [87.31, 174.61, 261.63, 349.23, 440.00],
    [65.41, 130.81, 196.00, 261.63, 392.00],
  ],
  arpeggio: [
    587.33, 880.00, 1174.66, 1396.91,
    1046.50, 880.00, 698.46, 523.25,
    659.25, 987.77, 1318.51, 1567.98,
    1174.66, 987.77, 783.99, 659.25,
  ],
};
// Under the results card: a slow, quiet reprise of the victory score's theme in D major.
const ENDING_MUSIC = {
  name: 'ending',
  baseStep: 1 / 3,
  minStep: 1 / 3,
  melodyType: 'sine',
  bassType: 'sine',
  accentType: 'triangle',
  melodyGain: 0.016,
  bassGain: 0.018,
  hatGain: 0.002,
  drumGain: 0.004,
  drumFilter: 1200,
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

const BOSS_MUSIC = {
  name: 'boss',
  voice: 'edged',
  isBoss: true,
  baseStep: 0.145,
  minStep: 0.096,
  intensityBoost: 5,
  melodyType: 'sawtooth',
  bassType: 'square',
  accentType: 'sawtooth',
  melodyGain: 0.028,
  bassGain: 0.04,
  hatGain: 0.014,
  drumGain: 0.026,
  drumFilter: 260,
  melody: [
    220.0, 261.63, 311.13, 293.66, 261.63, 233.08, 220.0, null,
    196.0, 233.08, 277.18, 311.13, 293.66, 261.63, 233.08, null,
    174.61, 220.0, 261.63, 311.13, 349.23, 311.13, 261.63, 220.0,
    164.81, null, 196.0, 233.08, 261.63, 311.13, 293.66, 220.0,
  ],
  bass: [
    55.0, null, 55.0, null, 65.41, null, 58.27, null,
    49.0, null, 49.0, null, 58.27, null, 65.41, null,
  ],
};
const WAVE_CLEAR_MUSIC = {
  name: 'wave-clear',
  voice: 'musicbox',
  baseStep: 0.176,
  minStep: 0.118,
  melodyType: 'triangle',
  bassType: 'sine',
  accentType: 'sine',
  melodyGain: 0.024,
  bassGain: 0.021,
  hatGain: 0.005,
  drumGain: 0.008,
  drumFilter: 920,
  melody: [
    523.25, 659.25, 783.99, 1046.5, 987.77, 783.99, 659.25, null,
    587.33, 739.99, 880.0, 1174.66, 1046.5, 880.0, 739.99, null,
    659.25, 783.99, 987.77, 1318.51, 1174.66, 987.77, 880.0, 783.99,
    698.46, null, 783.99, 987.77, 1046.5, 987.77, 783.99, 659.25,
  ],
  bass: [
    130.81, null, null, null, 164.81, null, null, null,
    146.83, null, null, null, 196.0, null, 174.61, null,
  ],
};
const GAME_OVER_MUSIC = {
  name: 'game-over',
  voice: 'pluck',
  baseStep: 0.34,
  minStep: 0.24,
  melodyType: 'sine',
  bassType: 'triangle',
  accentType: 'sine',
  melodyGain: 0.018,
  bassGain: 0.026,
  hatGain: 0.001,
  drumGain: 0.003,
  drumFilter: 360,
  melody: [
    392.0, null, 349.23, null, 329.63, null, 293.66, null,
    261.63, null, 246.94, null, 220.0, null, 196.0, null,
    261.63, null, 293.66, null, 246.94, null, 220.0, null,
    196.0, null, 174.61, null, 164.81, null, 196.0, null,
  ],
  bass: [
    65.41, null, null, null, 61.74, null, null, null,
    55.0, null, null, null, 49.0, null, null, null,
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
  let sfxBus = null;
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

  // music: musicGain -> musicFilter -> musicDuck -> master; melody notes also feed an echo.
  // effects: sfxBus -> master. Both buses send to one shared reverb, and a limiter
  // sits on the output so stacked sounds cannot clip.
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

  function playTone(frequency, duration, options = {}) {
    const context = resumeAudio();
    if (!context || !masterGain) return;

    const start = context.currentTime + (options.delay || 0);
    scheduleTone(frequency, duration, start, options, sfxBus);
  }

  function scheduleTone(frequency, duration, start, options = {}, destination = sfxBus) {
    const context = audioContext;
    if (!context || !destination) return;

    const attack = Math.min(options.attack ?? 0.008, duration * 0.4);
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.type = options.type || 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    if (options.endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, options.endFrequency), start + duration);
    }
    if (options.detune) oscillator.detune.setValueAtTime(options.detune, start);

    gainNode.gain.setValueAtTime(0.0001, start);
    gainNode.gain.exponentialRampToValueAtTime(options.gain || 0.05, start + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gainNode);
    gainNode.connect(panned(destination, options.pan));
    oscillator.start(start);
    oscillator.stop(start + duration + 0.04);

    // A second, slightly detuned voice thickens the note.
    if (options.chorus) {
      scheduleTone(frequency, duration, start, {
        ...options,
        chorus: 0,
        gain: (options.gain || 0.05) * 0.5,
        detune: (options.detune || 0) + options.chorus,
        pan: -(options.pan || 0),
      }, destination);
    }
  }

  function playNoise(duration, options = {}) {
    const context = resumeAudio();
    if (!context || !masterGain) return;

    const start = context.currentTime + (options.delay || 0);
    scheduleNoise(duration, start, options, sfxBus);
  }

  function scheduleNoise(duration, start, options = {}, destination = sfxBus) {
    const context = audioContext;
    if (!context || !destination) return;

    const buffer = context.createBuffer(1, Math.max(1, Math.floor(context.sampleRate * duration)), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gainNode = context.createGain();
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(options.playbackRate || 1, start);
    filter.type = options.filterType || 'bandpass';
    filter.frequency.setValueAtTime(options.filterFrequency || 900, start);
    filter.Q.setValueAtTime(options.q || 0.8, start);
    gainNode.gain.setValueAtTime(options.gain || 0.04, start);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    if (options.endFilterFrequency) {
      filter.frequency.exponentialRampToValueAtTime(options.endFilterFrequency, start + duration);
    }
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(panned(destination, options.pan));
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  function scheduleKick(start, gain) {
    scheduleTone(150, 0.16, start, { gain, type: 'sine', endFrequency: 44, attack: 0.002 }, musicGain);
    scheduleNoise(0.02, start, { gain: gain * 0.35, filterType: 'lowpass', filterFrequency: 1800 }, musicGain);
  }

  function scheduleSnare(start, gain, tone = 1800) {
    scheduleNoise(0.13, start, { gain, filterType: 'bandpass', filterFrequency: tone, q: 0.7 }, musicGain);
    scheduleTone(196, 0.07, start, { gain: gain * 0.55, type: 'triangle', endFrequency: 130, attack: 0.002 }, musicGain);
  }

  function scheduleThump(start, gain) {
    scheduleTone(108, 0.2, start, { gain, type: 'sine', endFrequency: 52, attack: 0.004 }, musicGain);
  }

  function scheduleWoodblock(start, gain, pan = 0, pitch = 1) {
    scheduleTone(880 * pitch, 0.07, start, { gain, type: 'sine', attack: 0.001, pan }, musicGain);
    scheduleTone(1320 * pitch, 0.045, start, { gain: gain * 0.5, type: 'sine', attack: 0.001, pan }, musicGain);
  }

  // The melody instruments. Each is a few sine partials with a struck or plucked envelope;
  // `ring` is how long a note sounds, independent of how fast the tune is stepping.
  function scheduleVoice(profile, frequency, start, stepDuration, gain, pan) {
    const voice = profile.voice || 'lead';
    if (voice === 'marimba' || voice === 'edged') {
      scheduleTone(frequency, 0.5, start, { gain: gain * 1.3, type: 'sine', attack: 0.002, pan }, melodyBus);
      scheduleTone(frequency * 4, 0.1, start, { gain: gain * 0.36, type: 'sine', attack: 0.001, pan }, melodyBus);
      scheduleTone(frequency * 2, 0.22, start, { gain: gain * 0.2, type: 'triangle', attack: 0.002, pan }, melodyBus);
      if (voice === 'edged') {
        scheduleTone(frequency, stepDuration * 0.8, start, { gain: gain * 0.3, type: 'sawtooth', attack: 0.004, chorus: 7, pan: -pan }, melodyBus);
      }
    } else if (voice === 'musicbox') {
      scheduleTone(frequency, 0.9, start, { gain: gain * 1.2, type: 'sine', attack: 0.002, pan }, melodyBus);
      scheduleTone(frequency * 3, 0.3, start, { gain: gain * 0.2, type: 'sine', attack: 0.001, pan: -pan }, melodyBus);
      scheduleTone(frequency * 5.4, 0.08, start, { gain: gain * 0.1, type: 'sine', attack: 0.001, pan }, melodyBus);
    } else if (voice === 'pluck') {
      scheduleTone(frequency, 0.42, start, { gain: gain * 1.25, type: 'triangle', attack: 0.003, pan }, melodyBus);
      scheduleTone(frequency, 0.6, start, { gain: gain * 0.7, type: 'sine', attack: 0.004, pan: -pan }, melodyBus);
      scheduleTone(frequency * 2, 0.12, start, { gain: gain * 0.22, type: 'sine', attack: 0.001, pan }, melodyBus);
    } else {
      scheduleTone(frequency, stepDuration * 0.82, start, { gain, type: profile.melodyType, attack: 0.003, chorus: 7, pan }, melodyBus);
    }
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

    const wave = getWaveSet();
    const profile = getMusicProfile(wave);
    updateMusicProfile(profile);
    const frozen = getMode() === 'running' && getIsTimeFrozen();
    const lowLife = isLowLife();
    updateMusicTone(frozen, lowLife);

    while (nextMusicTime < audioContext.currentTime + MUSIC_SCHEDULE_AHEAD) {
      const transitionProgress = getMusicTransitionProgress(nextMusicTime);
      const baseStep = previousMusicProfile
        ? lerp(previousMusicProfile.baseStep, activeMusicProfile.baseStep, transitionProgress)
        : activeMusicProfile.baseStep;
      const intensity = getMusicIntensity(wave, activeMusicProfile);
      const stepDuration = Math.max(activeMusicProfile.minStep || 0.112, baseStep - intensity * 0.0065)
        * (frozen ? FROZEN_TEMPO_STRETCH : 1);
      if (previousMusicProfile && transitionProgress < 1) {
        scheduleMusicStep(musicStep, nextMusicTime, stepDuration, previousMusicProfile, intensity, 1 - transitionProgress);
      }
      scheduleMusicStep(musicStep, nextMusicTime, stepDuration, activeMusicProfile, intensity, previousMusicProfile ? transitionProgress : 1);
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

  function isLowLife() {
    return getMode() === 'running' && getHealth() <= lowHealth;
  }

  function scheduleHeartbeat(step, start, stepDuration) {
    if (step % 8 !== 0) return;
    scheduleTone(58, 0.2, start, { gain: 0.07, type: 'sine', endFrequency: 40, attack: 0.004 }, musicDuck);
    scheduleTone(52, 0.24, start + stepDuration * 1.3, { gain: 0.05, type: 'sine', endFrequency: 36, attack: 0.004 }, musicDuck);
  }

  function getMusicProfile(wave) {
    if (getMode() === 'ending') return ENDING_MUSIC;
    if (getMode() === 'gameover') return GAME_OVER_MUSIC;
    if (getMode() === 'wave_cleared') return WAVE_CLEAR_MUSIC;
    if (getWavePhase() === 'boss') return getIsFinalWave() ? FINAL_WAVE_MUSIC : BOSS_MUSIC;
    return getMusicSeason(wave);
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

  function getMusicSeason(wave) {
    return MUSIC_SEASONS[Math.max(0, wave - 1) % MUSIC_SEASONS.length];
  }

  function getMusicIntensity(wave, profile) {
    if (profile.name === 'ending') return 0;
    if (profile.name === 'game-over') return 0;
    if (profile.name === 'wave-clear') return Math.min(Math.max(0, wave - 1) * 0.35, 4);
    return Math.min(Math.max(0, wave - 1) + (profile.intensityBoost || 0), 14);
  }

  function isMusicActiveMode() {
    // The victory score replaces the music loop until its last note is scheduled.
    if (victoryScoreActive) return false;
    const mode = getMode();
    return mode === 'running' || mode === 'wave_cleared' || mode === 'gameover' || mode === 'ending';
  }

  function scheduleMusicStep(step, start, stepDuration, profile, intensity, profileGain = 1) {
    if (profileGain <= 0.02) return;
    if (profile.name === 'final-wave') {
      scheduleFinalWaveStep(step, start, stepDuration, profile, intensity, profileGain);
      return;
    }
    if (profile.name === 'ending') {
      scheduleEndingStep(step, start, stepDuration, profile, profileGain);
      return;
    }

    const section = MUSIC_FORM[Math.floor(step / MUSIC_SECTION_STEPS) % MUSIC_FORM.length];
    const isLastSection = Math.floor(step / MUSIC_SECTION_STEPS) % MUSIC_FORM.length === MUSIC_FORM.length - 1;
    const line = section === 'b' && profile.melodyB ? profile.melodyB : profile.melody;
    const melody = line[step % line.length];
    const bass = profile.bass[step % profile.bass.length];
    const accent = step % 8 === 0;
    const isBoss = profile.isBoss || false;
    const densePulse = (intensity >= 4 || isBoss) && step % 4 === 0;
    const latePulse = (intensity >= 8 || isBoss) && step % 2 === 1;

    if (bass) {
      scheduleTone(bass, stepDuration * 1.6, start, {
        gain: ((accent ? profile.bassGain * 1.25 : profile.bassGain) + intensity * 0.0011) * profileGain,
        type: profile.bassType,
        attack: 0.004,
      }, musicGain);
      // A soft held fifth above the bass fills the space the old buzzy leads used to.
      if (!isBoss) {
        scheduleTone(bass * 3, stepDuration * 4.2, start, {
          gain: profile.bassGain * 0.22 * profileGain,
          type: 'sine',
          attack: 0.12,
          pan: 0.2,
        }, musicGain);
      }
      if (densePulse) {
        scheduleTone(bass * 2, stepDuration * 0.52, start + stepDuration * 0.5, {
          gain: (0.009 + intensity * 0.0007) * profileGain,
          type: profile.accentType,
          attack: 0.004,
        }, musicGain);
      }
    }

    if (melody && (step % 2 === 0 || intensity >= 2 || profile.name === 'summer' || isBoss)) {
      scheduleVoice(profile, melody, start + stepDuration * 0.08, stepDuration,
        (profile.melodyGain + intensity * 0.0008) * profileGain, -0.18);
      if (step % 8 === 6 || latePulse) {
        scheduleTone(melody * (profile.name === 'winter' ? 2 : isBoss ? 1.414 : 1.5), stepDuration * 0.5, start + stepDuration * 0.18, {
          gain: (0.009 + intensity * 0.0005) * profileGain,
          type: profile.accentType,
          attack: 0.003,
          pan: 0.3,
        }, musicGain);
      }
      // The last pass of the tune is doubled an octave up, so the return of the melody lifts.
      if (isLastSection && profile.melodyB && step % 2 === 0) {
        scheduleTone(melody * 2, stepDuration * 0.6, start + stepDuration * 0.08, {
          gain: profile.melodyGain * 0.3 * profileGain,
          type: 'triangle',
          attack: 0.004,
          pan: 0.22,
        }, melodyBus);
      }
    }

    if (step % 4 === 2 || latePulse) {
      scheduleNoise(stepDuration * 0.35, start + stepDuration * 0.16, {
        gain: (profile.hatGain + intensity * 0.00065) * profileGain,
        filterType: 'highpass',
        filterFrequency: profile.name === 'winter' ? 3200 : isBoss ? 1800 : 2400,
        q: 0.6,
        pan: step % 8 === 2 ? -0.35 : 0.35,
      }, musicGain);
    }

    const drumGain = (profile.drumGain + intensity * 0.0009) * profileGain;
    // Boss music keeps a real kick and snare; everything else uses a soft thump and a woodblock.
    if (step % 8 === 0 || ((intensity >= 6 || isBoss) && step % 16 === 10)) {
      if (isBoss) scheduleKick(start, drumGain * 2.1);
      else scheduleThump(start, drumGain * 1.9);
    }
    if (step % 8 === 4) {
      if (isBoss) scheduleSnare(start, drumGain * 1.15, profile.drumFilter * 2 + 900);
      else scheduleWoodblock(start, drumGain * 1.5, 0.25);
    }
    // A short roll leads into every fourth bar's turnaround.
    if (step % 64 >= 60 && profile.name !== 'game-over') {
      const rise = step % 4;
      if (isBoss) {
        scheduleSnare(start, drumGain * (0.55 + rise * 0.2), profile.drumFilter * 2 + 1300);
        scheduleSnare(start + stepDuration * 0.5, drumGain * (0.45 + rise * 0.2), profile.drumFilter * 2 + 1300);
      } else {
        scheduleWoodblock(start, drumGain * (0.8 + rise * 0.25), -0.25, 1 + rise * 0.12);
        scheduleWoodblock(start + stepDuration * 0.5, drumGain * (0.6 + rise * 0.25), 0.25, 1.06 + rise * 0.12);
      }
    }

    if (isBoss && step % 16 === 0) {
      scheduleTone(41.2, stepDuration * 3, start, {
        gain: (0.02 + intensity * 0.0007) * profileGain,
        type: 'sawtooth',
        attack: 0.02,
      }, musicGain);
    }
  }

  function scheduleFinalWaveStep(step, start, stepDuration, profile, intensity, profileGain = 1) {
    const chordIndex = Math.floor(step / 16) % profile.padChords.length;
    const chord = profile.padChords[chordIndex];
    const bass = profile.bass[step % profile.bass.length];
    const melody = profile.melody[step % profile.melody.length];
    const arp = profile.arpeggio[step % profile.arpeggio.length];
    const pulseGain = profileGain * (0.9 + Math.min(intensity, 10) * 0.025);

    if (step % 16 === 0) {
      chord.forEach((frequency, index) => {
        const duration = stepDuration * 18;
        const gain = (index < 2 ? 0.012 : 0.0075) * profileGain;
        scheduleTone(frequency, duration, start, {
          gain,
          type: index < 2 ? 'sine' : 'triangle',
          attack: 0.18,
          detune: index % 2 === 0 ? -5 : 6,
        }, musicGain);
        if (index >= 2) {
          scheduleTone(frequency * 1.005, duration, start + 0.018, {
            gain: gain * 0.62,
            type: 'sine',
            attack: 0.24,
            detune: index % 2 === 0 ? 7 : -8,
          }, musicGain);
        }
      });
    }

    if (bass) {
      scheduleTone(bass * 0.5, stepDuration * 4.4, start, {
        gain: profile.bassGain * 0.72 * pulseGain,
        type: 'sine',
        attack: 0.035,
      }, musicGain);
      scheduleTone(bass, stepDuration * 2.6, start, {
        gain: profile.bassGain * 0.52 * pulseGain,
        type: 'sawtooth',
        attack: 0.024,
        detune: -7,
      }, musicGain);
      scheduleTone(bass * 1.5, stepDuration * 1.4, start + stepDuration * 0.38, {
        gain: profile.bassGain * 0.18 * profileGain,
        type: 'triangle',
        attack: 0.02,
      }, musicGain);
    }

    if (step % 4 === 0) {
      scheduleNoise(stepDuration * 1.5, start + stepDuration * 0.02, {
        gain: (profile.drumGain + intensity * 0.00055) * profileGain,
        filterType: 'lowpass',
        filterFrequency: profile.drumFilter,
        q: 0.75,
      }, musicGain);
    }

    if (step % 8 === 6) {
      scheduleNoise(stepDuration * 0.75, start + stepDuration * 0.18, {
        gain: 0.0065 * profileGain,
        filterType: 'highpass',
        filterFrequency: 5200,
        q: 0.4,
      }, musicGain);
    }

    if (arp) {
      const shimmerGain = (0.010 + intensity * 0.00035) * profileGain;
      scheduleTone(arp, stepDuration * 1.1, start + stepDuration * 0.06, {
        gain: shimmerGain,
        type: 'sine',
        attack: 0.018,
      }, musicGain);
      scheduleTone(arp * 2, stepDuration * 0.72, start + stepDuration * 0.22, {
        gain: shimmerGain * 0.46,
        type: 'triangle',
        attack: 0.012,
        detune: 5,
      }, musicGain);
      if (step % 2 === 0) {
        scheduleTone(arp * 1.5, stepDuration * 0.8, start + stepDuration * 0.58, {
          gain: shimmerGain * 0.32,
          type: 'sine',
          attack: 0.02,
          detune: -9,
        }, musicGain);
      }
    }

    if (melody) {
      scheduleTone(melody, stepDuration * 1.8, start + stepDuration * 0.12, {
        gain: (profile.melodyGain + intensity * 0.00042) * profileGain,
        type: 'triangle',
        attack: 0.045,
      }, musicGain);
      scheduleTone(melody * 0.5, stepDuration * 2.4, start + stepDuration * 0.12, {
        gain: 0.010 * profileGain,
        type: 'sine',
        attack: 0.09,
      }, musicGain);
      if (step % 8 === 2 || step % 16 === 12) {
        scheduleTone(melody * 1.5, stepDuration * 1.25, start + stepDuration * 0.32, {
          gain: 0.0105 * profileGain,
          type: 'sine',
          attack: 0.03,
        }, musicGain);
      }
    }

    if (step % 32 === 24) {
      scheduleTone(55, stepDuration * 8, start, {
        gain: 0.018 * profileGain,
        type: 'sawtooth',
        attack: 0.22,
        endFrequency: 73.42,
      }, musicGain);
      scheduleNoise(stepDuration * 7.5, start, {
        gain: 0.010 * profileGain,
        filterType: 'highpass',
        filterFrequency: 1800,
        q: 0.35,
      }, musicGain);
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
  // One family, built from a few handmade-sounding pieces: wooden knocks, mallet
  // notes, small bells, paper rustles and soft drums. Options carry delay and pan.

  // A struck piece of wood: a short pitched thud with a click on the front.
  function knock(frequency, gain, options = {}) {
    const pitch = varyPitch(frequency, options.spread ?? 24);
    playTone(pitch, options.length ?? 0.07, { ...options, gain: varyGain(gain), type: 'sine', attack: 0.001, endFrequency: pitch * 0.82 });
    playTone(pitch * 2.4, 0.03, { ...options, gain: gain * 0.35, type: 'sine', attack: 0.001 });
  }

  // A marimba-like bar.
  function mallet(frequency, duration, gain, options = {}) {
    playTone(frequency, duration, { ...options, gain, type: 'sine', attack: 0.002 });
    playTone(frequency * 4, duration * 0.2, { ...options, gain: gain * 0.26, type: 'sine', attack: 0.001 });
    playTone(frequency * 2, duration * 0.4, { ...options, gain: gain * 0.14, type: 'triangle', attack: 0.002 });
  }

  // A small bell: the out-of-tune upper partials are what make it ring like metal.
  function bell(frequency, duration, gain, options = {}) {
    playTone(frequency, duration, { ...options, gain, type: 'sine', attack: 0.002 });
    playTone(frequency * 2.76, duration * 0.55, { ...options, gain: gain * 0.3, type: 'sine', attack: 0.001 });
    playTone(frequency * 5.4, duration * 0.25, { ...options, gain: gain * 0.14, type: 'sine', attack: 0.001 });
  }

  // Paper or cloth moving: a short band of filtered noise, optionally sweeping.
  function rustle(duration, gain, options = {}) {
    playNoise(duration, {
      filterType: 'bandpass', filterFrequency: 2600, q: 0.9, ...options, gain,
    });
  }

  // A soft-headed drum: a falling low tone with a dull thud of air.
  function drum(frequency, duration, gain, options = {}) {
    playTone(frequency, duration, { ...options, gain, type: 'sine', endFrequency: frequency * 0.45, attack: 0.003 });
    playNoise(Math.min(0.12, duration), { ...options, gain: gain * 0.45, filterType: 'lowpass', filterFrequency: 320 });
  }

  // Loose pieces of wood falling: a scatter of knocks over a short time.
  function clatter(count, span, gain, options = {}) {
    for (let index = 0; index < count; index += 1) {
      knock(260 + Math.random() * 700, gain * (0.55 + Math.random() * 0.45), {
        ...options,
        delay: (options.delay || 0) + Math.random() * span,
        pan: options.pan ?? Math.random() * 1.2 - 0.6,
        spread: 0,
      });
    }
  }

  function laneOf(targetX) {
    const widest = Math.max(...pathLanes.map(Math.abs)) || 1;
    return Math.max(-1, Math.min(1, targetX / widest)) * LANE_PAN_WIDTH;
  }

  // Menu and typing

  function playToggleSound() {
    knock(700, 0.05);
    bell(1400, 0.18, 0.016, { delay: 0.01 });
  }

  function playStartSound() {
    mallet(392, 0.32, 0.05);
    mallet(587.33, 0.32, 0.045, { delay: 0.08 });
    mallet(783.99, 0.5, 0.045, { delay: 0.16 });
    rustle(0.12, 0.014, { delay: 0.16, filterFrequency: 5200 });
  }

  function playPauseSound() {
    knock(520, 0.045);
    knock(390, 0.04, { delay: 0.09 });
  }

  // A wooden tick that climbs as the word fills in.
  function playTypeSound() {
    const pitch = (520 + Math.min(getTypedLength(), 12) * 18) * 1.5;
    knock(pitch, 0.04, { length: 0.055, spread: 10 });
  }

  function playBackspaceSound() {
    knock(300, 0.035, { length: 0.06 });
    rustle(0.05, 0.01, { filterFrequency: 1800 });
  }

  // Two dull, hollow thumps.
  function playMistakeSound() {
    knock(190, 0.07, { length: 0.11 });
    knock(150, 0.06, { length: 0.12, delay: 0.085 });
  }

  // Monsters

  function playRevealSound(enemy) {
    const pan = lanePan(enemy);
    if (enemy.isBoss) {
      drum(92, 0.5, 0.085, { pan });
      bell(138, 1.1, 0.04, { delay: 0.03, pan });
      return;
    }
    const laneIndex = Math.max(0, pathLanes.findIndex((lane) => lane === enemy.lane));
    bell(690 + laneIndex * 27, 0.24, 0.03, { pan });
  }

  // A soft pop, a struck note and a flutter of paper.
  function playDefeatSound(enemy) {
    if (enemy.isBoss) {
      playBossExplosionSound(enemy);
      return;
    }
    const pan = lanePan(enemy);
    const base = varyPitch(560, 80);
    playTone(base, 0.08, { gain: varyGain(0.065), type: 'sine', endFrequency: base * 1.9, attack: 0.002, pan });
    mallet(base * 1.5, 0.24, 0.036, { delay: 0.03, pan });
    knock(210, 0.05, { length: 0.1, pan });
    rustle(0.11, 0.02, { delay: 0.02, filterFrequency: varyPitch(2200, 300), pan });
  }

  // A big drum, a long low rumble, then the pieces clattering down and one low bell.
  function playBossExplosionSound(enemy) {
    const pan = lanePan(enemy) * 0.6;
    duckMusic(0.35, 1.0);
    drum(96, 1.3, 0.15, { pan });
    drum(64, 0.9, 0.1, { delay: 0.09 });
    playNoise(1.3, { gain: 0.085, filterType: 'lowpass', filterFrequency: 900, endFilterFrequency: 90, pan });
    rustle(0.4, 0.035, { filterFrequency: 3400, endFilterFrequency: 900, pan });
    clatter(9, 0.9, 0.05, { delay: 0.16 });
    bell(196, 1.6, 0.035, { delay: 0.3 });
    bell(293.66, 1.2, 0.02, { delay: 0.42 });
  }

  // The spell: a quick swish of air and a falling plucked note.
  function playBeamSound(targetX = 0) {
    const pan = laneOf(targetX);
    const pitch = varyPitch(1320, 70);
    rustle(0.13, 0.03, { filterFrequency: 900, endFilterFrequency: 4200, q: 1.4, pan });
    playTone(pitch, 0.12, { gain: varyGain(0.04), type: 'sine', endFrequency: pitch * 0.4, attack: 0.002, pan });
  }

  function playHealSound(healed) {
    mallet(523.25, 0.3, 0.04);
    mallet(659.25, 0.3, 0.036, { delay: 0.07 });
    if (healed > 0) {
      mallet(783.99, 0.4, 0.036, { delay: 0.14 });
      bell(1567.98, 0.5, 0.016, { delay: 0.2 });
    }
  }

  function playMedicPassSound() {
    knock(420, 0.03, { length: 0.08 });
    knock(315, 0.026, { length: 0.09, delay: 0.09 });
  }

  // A hit on the wall: a deep drum and a rattle of loose wood.
  function playDamageSound(enemy) {
    const bossHit = !!enemy?.isBoss;
    duckMusic(0.55, 0.3);
    drum(bossHit ? 70 : 88, bossHit ? 0.5 : 0.36, bossHit ? 0.11 : 0.085);
    clatter(bossHit ? 6 : 3, 0.22, 0.045, { delay: 0.03 });
  }

  function playBossThrowSound() {
    rustle(0.22, 0.04, { filterFrequency: 320, endFilterFrequency: 1100, q: 1.2 });
    knock(180, 0.05, { length: 0.1 });
  }

  function playBossImpactSound() {
    drum(104, 0.26, 0.065);
    clatter(2, 0.1, 0.04, { delay: 0.02 });
  }

  // Three war-drum beats, closing in, over a low bell.
  function playBossWarningSound() {
    duckMusic(0.45, 0.7);
    drum(82, 0.4, 0.085);
    drum(82, 0.4, 0.085, { delay: 0.26 });
    drum(70, 0.7, 0.1, { delay: 0.46 });
    bell(110, 1.4, 0.04, { delay: 0.46 });
  }

  // Potions

  // A run of small bells climbing, with a crackle of paper.
  function playChainPrimeSound() {
    [880, 1108.73, 1318.51, 1760].forEach((frequency, index) => {
      bell(frequency, 0.3, 0.026, { delay: index * 0.06, pan: index % 2 === 0 ? -0.3 : 0.3 });
    });
    rustle(0.3, 0.02, { filterFrequency: 1800, endFilterFrequency: 6000, q: 1.6 });
  }

  // One jump of chain lightning: a sharp crack of wood, a quick rattle and a low thump.
  function playChainZapSound(targetX = 0) {
    const pan = laneOf(targetX);
    playNoise(0.035, { gain: 0.085, filterType: 'highpass', filterFrequency: 2800, pan });
    knock(1300, 0.06, { length: 0.05, pan });
    for (let index = 0; index < 5; index += 1) {
      knock(900 + Math.random() * 1400, 0.03, { length: 0.03, delay: 0.03 + Math.random() * 0.16, pan, spread: 0 });
    }
    drum(84, 0.24, 0.06);
  }

  // Bells stepping down and slowing, as if the world winds down.
  function playTimeFreezeSound() {
    [1567.98, 1174.66, 880, 587.33, 392].forEach((frequency, index) => {
      bell(frequency, 0.7, 0.03, { delay: index * index * 0.028, pan: index % 2 === 0 ? -0.35 : 0.35 });
    });
    drum(72, 0.7, 0.07, { delay: 0.42 });
    rustle(0.6, 0.02, { filterFrequency: 5000, endFilterFrequency: 500, q: 1.2 });
  }

  function playTimeResumeSound() {
    [392, 587.33, 880].forEach((frequency, index) => bell(frequency, 0.35, 0.026, { delay: index * 0.05 }));
    rustle(0.25, 0.016, { filterFrequency: 600, endFilterFrequency: 4800, q: 1.2 });
  }

  // A great drum and three waves of air rolling outward.
  function playShockwaveSound() {
    duckMusic(0.4, 0.7);
    drum(88, 0.9, 0.14);
    drum(52, 1.1, 0.1, { delay: 0.04 });
    playNoise(0.7, { gain: 0.06, filterType: 'lowpass', filterFrequency: 500 });
    [0, 0.15, 0.3].forEach((delay) => {
      rustle(0.5, 0.036, { delay, filterFrequency: 300, endFilterFrequency: 3000, q: 1.1 });
    });
  }

  function playShieldActivateSound() {
    [293.66, 440, 587.33].forEach((frequency, index) => bell(frequency, 0.8, 0.034, { delay: index * 0.09 }));
    playTone(146.83, 0.8, { gain: 0.04, type: 'sine', attack: 0.2 });
  }

  // A gong, with the thud of whatever struck it.
  function playShieldBlockSound() {
    bell(220, 1.2, 0.07);
    bell(330, 0.8, 0.03, { delay: 0.01 });
    drum(110, 0.3, 0.08);
    knock(900, 0.04, { length: 0.04 });
  }

  // Chests

  function playChestClackSound() {
    knock(400, 0.045, { length: 0.07 });
    knock(290, 0.04, { length: 0.09, delay: 0.035 });
    drum(140, 0.12, 0.04);
  }

  // A creak of the lid, then a glint of coins.
  function playChestOpenSound() {
    [180, 205, 235].forEach((frequency, index) => knock(frequency, 0.04, { length: 0.05, delay: index * 0.04, spread: 0 }));
    [1318.51, 1760, 2093].forEach((frequency, index) => bell(frequency, 0.3, 0.018, { delay: 0.14 + index * 0.06 }));
  }

  // Wave results

  function playWaveClearSound() {
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      mallet(frequency, index === 3 ? 0.7 : 0.4, 0.042, { delay: index * 0.08 });
    });
    bell(2093, 0.6, 0.014, { delay: 0.34 });
    rustle(0.14, 0.014, { delay: 0.3, filterFrequency: 5200 });
  }

  // ── Victory score ──────────────────────────────────────────────────────
  // A 40-second cue scored to the victory cinematic (ending-cinematic.js), on the
  // same 90 bpm bar grid: the night in D minor, words chiming into the wands, the
  // wave of light in D major on bar 4, the sunrise theme, one bell per letter of
  // the name on bars 10–11, and the full chord as the name completes on bar 12.
  // It runs on its own bus so Skip and Replay can fade it out.

  function scoreTone(frequency, start, duration, gain, options = {}) {
    scheduleTone(frequency, duration, start, { type: 'sine', attack: 0.004, ...options, gain }, scoreBus);
  }

  function scoreMallet(frequency, start, duration, gain, pan = 0) {
    scoreTone(frequency, start, duration, gain, { attack: 0.002, pan });
    scoreTone(frequency * 4, start, duration * 0.2, gain * 0.26, { attack: 0.001, pan });
    scoreTone(frequency * 2, start, duration * 0.4, gain * 0.14, { type: 'triangle', attack: 0.002, pan });
  }

  function scoreBell(frequency, start, duration, gain, pan = 0) {
    scoreTone(frequency, start, duration, gain, { attack: 0.002, pan });
    scoreTone(frequency * 2.76, start, duration * 0.55, gain * 0.3, { attack: 0.001, pan });
    scoreTone(frequency * 5.4, start, duration * 0.25, gain * 0.14, { attack: 0.001, pan });
  }

  function scoreMusicBox(frequency, start, gain, pan = 0) {
    scoreTone(frequency, start, 1.1, gain * 1.2, { attack: 0.002, pan });
    scoreTone(frequency * 3, start, 0.35, gain * 0.2, { attack: 0.001, pan: -pan });
    scoreTone(frequency * 5.4, start, 0.1, gain * 0.1, { attack: 0.001, pan });
  }

  // A held chord: soft sine and triangle voices with a slow swell and release.
  function scorePad(frequencies, start, duration, gain, { attack = 0.6, release = 1.2, cutoff = 1800 } = {}) {
    const context = audioContext;
    if (!context || !scoreBus) return;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    filter.Q.value = 0.3;
    const envelope = context.createGain();
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
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    source.buffer = buffer;
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
    source.start(start);
    source.stop(start + duration + 0.02);
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

  function scoreWoodblock(start, gain, pan = 0) {
    scoreTone(880, start, 0.07, gain, { attack: 0.001, pan });
    scoreTone(1320, start, 0.045, gain * 0.5, { attack: 0.001, pan });
  }

  function scoreShaker(start, gain) {
    scheduleNoise(0.05, start, { gain, filterType: 'highpass', filterFrequency: 7000, q: 0.4 }, scoreBus);
  }

  // A firework over the name: a soft thump, a crackle of sparks and a bell.
  function scoreFirework(start, pan) {
    scoreDrum(98, start, 0.6, 0.08);
    for (let index = 0; index < 7; index += 1) {
      scoreTone(1800 + Math.random() * 2600, start + 0.12 + Math.random() * 0.55, 0.04, 0.011, {
        attack: 0.001, pan: Math.max(-1, Math.min(1, pan + Math.random() * 0.5 - 0.25)),
      });
    }
    scoreBell(noteFrequency('A6'), start + 0.05, 1.3, 0.012, pan);
  }

  function buildVictoryScore(arrivals) {
    const N = noteFrequency;
    const B = SCORE_BEAT;
    const BAR = 4 * B;
    const E = B / 2;
    const events = [];
    const at = (time, play) => events.push({ time, play });
    const chord = (names) => names.map(N);

    // Bars 0–1: the silent night. A low drone, frozen bells, D minor then B flat.
    at(0, (T) => scorePad(chord(['D2', 'A2']), T, 10.9, 0.03, { attack: 3, release: 1.0, cutoff: 900 }));
    at(0, (T) => scorePad(chord(['D3', 'F3', 'A3']), T, BAR + 0.3, 0.011, { attack: 1.4, release: 1, cutoff: 1400 }));
    at(BAR, (T) => scorePad(chord(['A#2', 'D3', 'F3']), T, BAR + 0.3, 0.011, { attack: 1.2, release: 1, cutoff: 1400 }));
    at(0, (T) => scoreSwell(T, 5.2, 0.005, 3000, 4600));
    [[0.667, 'A5'], [1.667, 'F5'], [2.333, 'D6'], [3.333, 'C6'], [4.0, 'A5'], [4.667, 'E5']].forEach(([time, name], index) => {
      at(time, (T) => scoreBell(N(name), T, 2.4, 0.018, index % 2 === 0 ? -0.4 : 0.4));
    });

    // Bars 2–3: the words gather. A music-box arpeggio climbs to the dominant,
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
      at(time, (T) => scoreMusicBox(notes[step % notes.length], T, 0.006 + 0.012 * progress, Math.sin(step * 0.7) * 0.5));
    }
    const arrivalNotes = ['E5', 'F#5', 'G5', 'A5', 'B5', 'C#6', 'D6', 'E6', 'F#6', 'G6', 'A6', 'B6'];
    arrivals.slice(0, arrivalNotes.length).forEach((time, index) => {
      at(time, (T) => scoreBell(N(arrivalNotes[index]), T, 1.4, 0.026 - index * 0.0008, index % 2 === 0 ? -0.35 : 0.35));
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
      ['D6', 'F#6', 'A6', 'D7'].forEach((name, index) => scoreBell(N(name), T + index * 0.035, 2.2, 0.026, (index - 1.5) * 0.3));
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
        at(start + 1.5 * B, (T) => scoreWoodblock(T, 0.01, -0.3));
        at(start + 3.5 * B, (T) => scoreWoodblock(T, 0.01, 0.3));
      }
      if (bar >= 6) {
        for (let slot = 0; slot < 8; slot += 1) {
          at(start + slot * E, (T) => scoreShaker(T, slot % 2 === 1 ? 0.004 : 0.0025));
          const tone = N(harmony.high[slot % 3]) * 2;
          at(start + slot * E, (T) => scoreMusicBox(tone, T, 0.005, slot % 2 === 0 ? -0.45 : 0.45));
        }
        at(start, (T) => scorePad(chord(harmony.high), T, BAR + 0.5, 0.006, { attack: 1.0, release: 0.8, cutoff: 3000 }));
      }
      themeMelody[bar].forEach(([slot, note, ring]) => {
        at(start + slot * E, (T) => {
          scoreMallet(N(note), T, ring, 0.042, 0.1);
          if (bar >= 8) scoreMusicBox(N(note) * 2, T, 0.01, -0.2);
        });
      });
    });

    // Bars 10–11: the name assembles, one bell per letter, over a rising roll.
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
        scoreBell(N(name), T, 1.6, 0.03, (index - 3.5) / 6);
        scoreMallet(N(name), T, 0.5, 0.018, (index - 3.5) / 6);
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
      scoreBell(N('D6'), T, 2.6, 0.03, -0.2);
      scoreBell(N('A6'), T, 2.6, 0.022, 0.2);
      scoreBell(N('F#6'), T + 0.05, 2.2, 0.02, 0);
    });
    const finaleMelody = {
      12: [[0, 'F#5', 0.6], [2, 'A5', 0.6], [4, 'D6', 2.2]],
      13: [[0, 'E6', 0.6], [2, 'D6', 0.5], [3, 'C#6', 0.4], [4, 'B5', 0.9], [6, 'A5', 0.8]],
    };
    [12, 13].forEach((bar) => {
      const start = bar * BAR;
      finaleMelody[bar].forEach(([slot, note, ring]) => {
        at(start + slot * E, (T) => {
          scoreMallet(N(note), T, ring, 0.05, 0.1);
          scoreMusicBox(N(note) * 2, T, 0.012, -0.2);
        });
      });
      at(start, (T) => scoreKick(T, 0.05));
      at(start + 2 * B, (T) => scoreKick(T, 0.05));
      at(start + 1.5 * B, (T) => scoreWoodblock(T, 0.01, -0.3));
      at(start + 3.5 * B, (T) => scoreWoodblock(T, 0.01, 0.3));
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
      scoreMallet(N('D6'), T, 3, 0.05, 0);
      scoreBell(N('D6'), T, 3.5, 0.022, 0);
      [['F#6', 0.5], ['A6', 1.0], ['D7', 1.6], ['A6', 2.4], ['F#6', 3.3], ['D6', 4.4]].forEach(([name, delay], index) => {
        scoreMusicBox(N(name), T + delay, 0.011 - index * 0.0012, index % 2 === 0 ? -0.4 : 0.4);
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
      bell(noteFrequency(name), 1.6, 0.028, { delay: 0.05 + index * 0.11, pan: (index - 1.5) * 0.25 });
    });
    drum(noteFrequency('D2'), 0.9, 0.1);
  }

  function playGameOverSound() {
    [392, 349.23, 293.66, 196].forEach((frequency, index) => {
      mallet(frequency, index === 3 ? 0.9 : 0.4, 0.04, { delay: index * 0.16 });
    });
    drum(70, 0.8, 0.06, { delay: 0.5 });
  }

  function playGodModeOnSound() {
    [523.25, 659.25, 783.99, 1046.5, 1567.98].forEach((frequency, index) => {
      bell(frequency, 0.3, 0.026, { delay: index * 0.045, pan: index % 2 === 0 ? -0.3 : 0.3 });
    });
  }

  function playGodModeOffSound() {
    [1567.98, 1046.5, 783.99, 659.25, 523.25].forEach((frequency, index) => {
      bell(frequency, 0.3, 0.026, { delay: index * 0.045, pan: index % 2 === 0 ? 0.3 : -0.3 });
    });
    knock(260, 0.04, { length: 0.1, delay: 0.24 });
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
