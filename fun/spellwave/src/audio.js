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
const ENDING_MUSIC = {
  name: 'ending',
  baseStep: 0.24,
  minStep: 0.19,
  melodyType: 'sine',
  bassType: 'sine',
  accentType: 'triangle',
  melodyGain: 0.018,
  bassGain: 0.020,
  hatGain: 0.002,
  drumGain: 0.004,
  drumFilter: 1200,
  melody: [
    587.33, null, null, 698.46, null, 880.00, null, null,
    783.99, null, 698.46, null, 587.33, null, null, null,
    659.25, null, null, 783.99, null, 987.77, null, null,
    880.00, null, 783.99, null, 698.46, null, 587.33, null,
  ],
  bass: [
    73.42, null, null, null, null, null, null, null,
    87.31, null, null, null, null, null, null, null,
    65.41, null, null, null, null, null, null, null,
    58.27, null, null, null, null, null, null, null,
  ],
  padChords: [
    [73.42, 146.83, 220.00, 293.66],
    [87.31, 174.61, 261.63, 349.23],
    [65.41, 130.81, 196.00, 293.66],
    [58.27, 116.54, 174.61, 261.63],
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

  // A small struck-bar sound: a sine with two quieter overtones.
  function playChime(frequency, duration, gain, options = {}) {
    playTone(frequency, duration, { ...options, gain: gain * 0.8, type: 'sine', attack: 0.002 });
    playTone(frequency * 2, duration * 0.5, { ...options, gain: gain * 0.3, type: 'sine', attack: 0.001 });
    playTone(frequency * 4, duration * 0.2, { ...options, gain: gain * 0.14, type: 'sine', attack: 0.001 });
  }

  function playToggleSound() {
    playChime(660, 0.16, 0.05);
  }

  function playStartSound() {
    playChime(392, 0.3, 0.05);
    playChime(587.33, 0.3, 0.045, { delay: 0.07 });
    playChime(783.99, 0.45, 0.04, { delay: 0.14 });
  }

  function playPauseSound() {
    playChime(330, 0.16, 0.04);
    playChime(247, 0.2, 0.034, { delay: 0.07 });
  }

  function playTypeSound() {
    const pitch = 520 + Math.min(getTypedLength(), 12) * 18;
    // A wooden tick that climbs as the word fills in.
    const tick = varyPitch(pitch * 1.5, 10);
    playTone(tick, 0.06, { gain: varyGain(0.038), type: 'sine', attack: 0.001 });
    playTone(tick * 1.5, 0.035, { gain: 0.02, type: 'sine', attack: 0.001 });
  }

  function playBackspaceSound() {
    playTone(300, 0.07, { gain: 0.04, type: 'sine', endFrequency: 190, attack: 0.001 });
  }

  function playMistakeSound() {
    // A dull, muted knock.
    playTone(varyPitch(190), 0.14, { gain: 0.07, type: 'sine', endFrequency: 110, attack: 0.002 });
    playTone(varyPitch(285), 0.06, { gain: 0.03, type: 'triangle', endFrequency: 180, attack: 0.001 });
    playNoise(0.07, { gain: 0.02, filterFrequency: 260, filterType: 'lowpass' });
  }

  function playRevealSound(enemy) {
    const laneIndex = Math.max(0, pathLanes.findIndex((lane) => lane === enemy.lane));
    const pitch = enemy.isBoss ? 180 : 460 + laneIndex * 18;
    const pan = lanePan(enemy);
    if (enemy.isBoss) {
      playTone(pitch, 0.09, { gain: 0.06, type: 'sawtooth', pan });
      playTone(90, 0.2, { gain: 0.036, delay: 0.02, type: 'sine', pan });
    } else {
      playChime(pitch * 1.5, 0.2, 0.04, { pan });
    }
  }

  function playDefeatSound(enemy) {
    if (enemy.isBoss) {
      playBossExplosionSound(enemy);
      return;
    }
    const pan = lanePan(enemy);
    // A soft pop: a quick upward blip, a struck note and a puff of air.
    const base = varyPitch(560, 80);
    playTone(base, 0.08, { gain: varyGain(0.075), type: 'sine', endFrequency: base * 1.9, attack: 0.002, pan });
    playChime(base * 1.5, 0.22, 0.04, { delay: 0.03, pan });
    playTone(170, 0.12, { gain: 0.06, type: 'sine', endFrequency: 70, attack: 0.002, pan });
    playNoise(0.1, { gain: varyGain(0.03), filterFrequency: varyPitch(900, 200), filterType: 'lowpass', pan });
  }

  // A long layered blast: low boom, falling growl, a wash of noise, then crackling debris.
  function playBossExplosionSound(enemy) {
    const pan = lanePan(enemy) * 0.6;
    duckMusic(0.35, 0.9);
    playTone(180, 0.09, { gain: 0.06, type: 'square', endFrequency: 320, pan });
    playTone(96, 1.2, { gain: 0.12, type: 'sine', endFrequency: 28, attack: 0.004 });
    playTone(140, 0.75, { gain: 0.07, type: 'sawtooth', endFrequency: 38, attack: 0.004, pan });
    playNoise(1.1, { gain: 0.1, filterType: 'lowpass', filterFrequency: 1400, endFilterFrequency: 120, pan });
    playNoise(0.3, { gain: 0.05, filterType: 'highpass', filterFrequency: 3200, pan });
    for (let index = 0; index < 6; index += 1) {
      playNoise(0.07, {
        gain: 0.035,
        delay: 0.18 + Math.random() * 0.75,
        filterType: 'bandpass',
        filterFrequency: 700 + Math.random() * 2600,
        q: 2.2,
        pan: Math.random() * 1.4 - 0.7,
      });
    }
    playTone(1318.51, 0.9, { gain: 0.014, delay: 0.25, type: 'sine', endFrequency: 880, attack: 0.05 });
  }

  // The spell itself: a quick falling zap from the wand toward the target.
  function playBeamSound(targetX = 0) {
    const widest = Math.max(...pathLanes.map(Math.abs)) || 1;
    const pan = Math.max(-1, Math.min(1, targetX / widest)) * LANE_PAN_WIDTH;
    const pitch = varyPitch(1480, 70);
    playTone(pitch, 0.12, { gain: varyGain(0.05), type: 'sine', endFrequency: pitch * 0.36, attack: 0.002, pan });
    playTone(pitch * 1.5, 0.08, { gain: 0.02, type: 'triangle', endFrequency: pitch * 0.6, attack: 0.002, pan });
    playNoise(0.09, { gain: 0.014, filterType: 'highpass', filterFrequency: 4200, pan });
  }

  function playChainPrimeSound() {
    playTone(330, 0.3, { gain: 0.04, type: 'sawtooth', endFrequency: 990, attack: 0.02 });
    playTone(660, 0.28, { gain: 0.026, delay: 0.04, type: 'square', endFrequency: 1980, attack: 0.02 });
    for (let index = 0; index < 4; index += 1) {
      playNoise(0.03, { gain: 0.03, delay: 0.05 + index * 0.06, filterType: 'bandpass', filterFrequency: 3600, q: 3 });
    }
  }

  // One jump of chain lightning: a sharp crack with a ragged electric tail.
  function playChainZapSound(targetX = 0) {
    const widest = Math.max(...pathLanes.map(Math.abs)) || 1;
    const pan = Math.max(-1, Math.min(1, targetX / widest)) * LANE_PAN_WIDTH;
    playNoise(0.05, { gain: 0.085, filterType: 'highpass', filterFrequency: 2600, pan });
    playTone(varyPitch(1900, 120), 0.16, { gain: 0.04, type: 'sawtooth', endFrequency: 180, attack: 0.001, pan });
    for (let index = 0; index < 5; index += 1) {
      playNoise(0.025, {
        gain: 0.05,
        delay: 0.03 + Math.random() * 0.2,
        filterType: 'bandpass',
        filterFrequency: 2200 + Math.random() * 3800,
        q: 4,
        pan,
      });
    }
    playTone(70, 0.22, { gain: 0.06, type: 'sine', endFrequency: 38, attack: 0.003 });
  }

  function playTimeFreezeSound() {
    playTone(2093, 0.7, { gain: 0.03, type: 'sine', endFrequency: 196, attack: 0.01 });
    playTone(1046.5, 0.8, { gain: 0.03, delay: 0.03, type: 'triangle', endFrequency: 98, attack: 0.01 });
    playTone(80, 0.5, { gain: 0.07, delay: 0.25, type: 'sine', endFrequency: 40, attack: 0.02 });
    playNoise(0.7, { gain: 0.04, filterType: 'bandpass', filterFrequency: 5200, endFilterFrequency: 500, q: 1.2 });
    [2637, 3136, 3951].forEach((frequency, index) => {
      playTone(frequency, 0.5, { gain: 0.012, delay: 0.3 + index * 0.09, type: 'sine', pan: index - 1 });
    });
  }

  function playTimeResumeSound() {
    playTone(196, 0.3, { gain: 0.035, type: 'triangle', endFrequency: 1046.5, attack: 0.01 });
    playNoise(0.28, { gain: 0.025, filterType: 'bandpass', filterFrequency: 600, endFilterFrequency: 4800, q: 1.2 });
  }

  function playHealSound(healed) {
    playTone(660, 0.1, { gain: 0.042, type: 'triangle', endFrequency: 880 });
    if (healed > 0) {
      playTone(990, 0.16, { gain: 0.032, delay: 0.04, type: 'sine' });
    }
    playNoise(0.1, { gain: 0.022, delay: 0.02, filterFrequency: 1800, filterType: 'bandpass' });
  }

  function playMedicPassSound() {
    playTone(varyPitch(420), 0.08, { gain: 0.026, type: 'triangle', endFrequency: 280 });
  }

  function playDamageSound(enemy) {
    const bossHit = !!enemy?.isBoss;
    duckMusic(0.55, 0.3);
    playTone(varyPitch(bossHit ? 62 : 78), bossHit ? 0.28 : 0.22, { gain: bossHit ? 0.086 : 0.07, type: 'sawtooth', endFrequency: bossHit ? 36 : 45 });
    playNoise(bossHit ? 0.24 : 0.18, { gain: bossHit ? 0.074 : 0.06, filterFrequency: bossHit ? 135 : 170, filterType: 'lowpass' });
  }

  function playBossThrowSound() {
    playTone(varyPitch(176), 0.11, { gain: 0.045, type: 'sawtooth', endFrequency: 132 });
    playTone(varyPitch(352), 0.07, { gain: 0.022, delay: 0.03, type: 'square', endFrequency: 260 });
  }

  function playBossImpactSound() {
    playTone(varyPitch(92), 0.16, { gain: varyGain(0.058), type: 'sawtooth', endFrequency: 52 });
    playNoise(0.12, { gain: 0.045, filterFrequency: 260, filterType: 'lowpass' });
  }

  function playBossWarningSound() {
    duckMusic(0.45, 0.6);
    playTone(146.83, 0.18, { gain: 0.072, type: 'sawtooth', endFrequency: 110 });
    playTone(73.42, 0.48, { gain: 0.052, delay: 0.06, type: 'sawtooth', endFrequency: 55 });
    playTone(220, 0.12, { gain: 0.04, delay: 0.2, type: 'square', endFrequency: 155.56 });
    playNoise(0.42, { gain: 0.038, delay: 0.04, filterFrequency: 340, filterType: 'bandpass', q: 1.4 });
  }

  function playWaveClearSound() {
    playChime(523.25, 0.4, 0.05);
    playChime(659.25, 0.4, 0.045, { delay: 0.07 });
    playChime(783.99, 0.45, 0.045, { delay: 0.14 });
    playChime(1046.5, 0.7, 0.04, { delay: 0.24 });
  }

  function playVictoryFinaleSound() {
    const context = resumeAudio();
    if (!context || !masterGain) return;
    const now = context.currentTime;

    // D-major triumph: foundation → build → swell → soaring peak → bell tail
    const chords = [
      // Foundation — low, warm, gentle arrival
      { delay: 0.0,  notes: [73.42, 110.0, 146.83, 220.0], dur: 4.0, gainBase: 0.028, type: 'sine' },
      // Build — rising harmony
      { delay: 1.4,  notes: [146.83, 185.0, 220.0, 293.66], dur: 3.8, gainBase: 0.024, type: 'sine' },
      { delay: 2.8,  notes: [196.0, 293.66, 369.99, 440.0], dur: 3.5, gainBase: 0.022, type: 'sine' },
      // Swell — full mid-range
      { delay: 4.4,  notes: [220.0, 293.66, 440.0, 587.33, 659.25], dur: 4.4, gainBase: 0.020, type: 'sine' },
      // Soaring peak — upper harmonics, triumphant
      { delay: 6.2,  notes: [293.66, 440.0, 587.33, 739.99, 880.0], dur: 5.0, gainBase: 0.018, type: 'sine' },
      // Resolution — warm landing
      { delay: 9.0,  notes: [146.83, 220.0, 293.66, 440.0, 587.33], dur: 5.5, gainBase: 0.022, type: 'sine' },
    ];

    chords.forEach(({ delay, notes, dur, gainBase, type }) => {
      notes.forEach((freq, i) => {
        const isLow = i < 2;
        scheduleTone(freq, dur, now + delay, {
          gain: gainBase * (isLow ? 1.0 : 0.72),
          type: isLow ? type : 'triangle',
          attack: 0.22 + delay * 0.012,
          detune: i % 2 === 0 ? -5 : 6,
        }, masterGain);
      });
    });

    // Shimmer breath — filtered noise across the whole sequence
    scheduleNoise(5.2, now + 0.3,  { gain: 0.016, filterType: 'highpass', filterFrequency: 2800, q: 0.4 }, masterGain);
    scheduleNoise(4.0, now + 6.5,  { gain: 0.013, filterType: 'highpass', filterFrequency: 3200, q: 0.4 }, masterGain);

    // Bell tail — crystalline high tones that slowly appear after the peak
    const bells = [
      [1174.66, 2.2, 8.2,  0.018],
      [1318.51, 2.6, 9.0,  0.015],
      [1760.0,  2.8, 9.8,  0.012],
      [1174.66, 3.2, 11.0, 0.014],
      [2093.0,  2.4, 12.2, 0.009],
      [1318.51, 3.0, 13.5, 0.010],
      [880.0,   3.8, 14.8, 0.014],
    ];
    bells.forEach(([freq, dur, delay, gain]) => {
      scheduleTone(freq, dur, now + delay, { gain, type: 'sine', attack: 0.06, detune: 3 }, masterGain);
    });
  }

  function playGameOverSound() {
    playTone(196, 0.18, { gain: 0.055, type: 'sawtooth', endFrequency: 130 });
    playTone(130, 0.26, { gain: 0.052, delay: 0.12, type: 'sawtooth', endFrequency: 70 });
    playNoise(0.22, { gain: 0.045, delay: 0.04, filterFrequency: 220, filterType: 'lowpass' });
  }

  function playGodModeOnSound() {
    playTone(523.25, 0.08, { gain: 0.032, type: 'square' });
    playTone(659.25, 0.08, { gain: 0.03, delay: 0.045, type: 'triangle' });
    playTone(783.99, 0.09, { gain: 0.032, delay: 0.09, type: 'square' });
    playTone(1046.5, 0.11, { gain: 0.034, delay: 0.135, type: 'triangle' });
    playTone(1567.98, 0.28, { gain: 0.026, delay: 0.19, type: 'sine', endFrequency: 2093.0 });
    playTone(2349.32, 0.12, { gain: 0.015, delay: 0.24, type: 'sine' });
    playTone(1174.66, 0.16, { gain: 0.018, delay: 0.26, type: 'triangle', detune: 9 });
    playNoise(0.24, { gain: 0.022, delay: 0.11, filterFrequency: 3600, filterType: 'highpass', q: 0.55 });
  }

  function playGodModeOffSound() {
    playTone(2349.32, 0.08, { gain: 0.015, type: 'sine' });
    playTone(1567.98, 0.12, { gain: 0.026, delay: 0.045, type: 'sine', endFrequency: 1174.66 });
    playTone(1046.5, 0.09, { gain: 0.034, delay: 0.105, type: 'triangle' });
    playTone(783.99, 0.09, { gain: 0.032, delay: 0.15, type: 'square' });
    playTone(659.25, 0.08, { gain: 0.03, delay: 0.195, type: 'triangle' });
    playTone(523.25, 0.18, { gain: 0.032, delay: 0.24, type: 'square', endFrequency: 261.63 });
    playNoise(0.24, { gain: 0.018, delay: 0.08, filterFrequency: 1400, filterType: 'lowpass', q: 0.55 });
  }

  function playChestClackSound() {
    playTone(180, 0.12, { gain: 0.05, type: 'triangle', endFrequency: 90 });
    playNoise(0.06, { gain: 0.045, filterFrequency: 450, filterType: 'bandpass', q: 4.0 });
  }

  function playChestOpenSound() {
    playTone(120, 0.04, { gain: 0.05, type: 'triangle', endFrequency: 110 });
    playTone(130, 0.04, { gain: 0.05, delay: 0.035, type: 'triangle', endFrequency: 120 });
    playTone(140, 0.05, { gain: 0.05, delay: 0.07, type: 'triangle', endFrequency: 130 });
    playTone(440, 0.12, { gain: 0.024, delay: 0.12, type: 'sine' });
    playTone(660, 0.14, { gain: 0.024, delay: 0.18, type: 'sine' });
    playTone(880, 0.16, { gain: 0.020, delay: 0.24, type: 'sine' });
  }

  function playShockwaveSound() {
    duckMusic(0.4, 0.7);
    playTone(120, 0.45, { gain: 0.065, type: 'sawtooth', endFrequency: 60 });
    playTone(60, 0.60, { gain: 0.080, delay: 0.05, type: 'sine', endFrequency: 30 });
    playTone(44, 1.0, { gain: 0.09, delay: 0.02, type: 'sine', endFrequency: 24, attack: 0.01 });
    playNoise(0.60, { gain: 0.075, filterFrequency: 450, filterType: 'lowpass' });
    // The three wavefronts sweep outward one after another.
    [0, 0.15, 0.3].forEach((delay) => {
      playNoise(0.5, { gain: 0.04, delay, filterType: 'bandpass', filterFrequency: 300, endFilterFrequency: 3200, q: 1.1 });
    });
  }

  function playShieldActivateSound() {
    playTone(220, 0.4, { gain: 0.05, type: 'sawtooth', endFrequency: 440 });
    playTone(330, 0.45, { gain: 0.05, delay: 0.05, type: 'sine', endFrequency: 660 });
    playTone(440, 0.5, { gain: 0.05, delay: 0.1, type: 'sine', endFrequency: 880 });
  }

  function playShieldBlockSound() {
    playTone(880, 0.15, { gain: 0.08, type: 'sine', endFrequency: 1760 });
    playTone(440, 0.20, { gain: 0.08, type: 'triangle', endFrequency: 880 });
    playNoise(0.25, { gain: 0.06, filterFrequency: 3000, filterType: 'bandpass', q: 1.5 });
    // Deep bass deflection
    playTone(100, 0.35, { gain: 0.07, delay: 0.02, type: 'sine', endFrequency: 40 });
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
