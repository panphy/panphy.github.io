const MASTER_VOLUME = 0.95;
const MUSIC_GAIN = 0.82;
const MUSIC_TIMER_INTERVAL = 80;
const MUSIC_SCHEDULE_AHEAD = 0.34;
const MUSIC_TRANSITION_DURATION = 1.2;
const MUSIC_SEASONS = [
  {
    name: 'spring',
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
    bass: [
      130.81, null, null, null, 146.83, null, null, null,
      174.61, null, null, null, 196.0, null, 174.61, null,
    ],
  },
  {
    name: 'summer',
    baseStep: 0.168,
    melodyType: 'square',
    bassType: 'square',
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
    bass: [
      146.83, null, 146.83, null, 110.0, null, 110.0, null,
      130.81, null, 130.81, null, 98.0, null, 110.0, null,
    ],
  },
  {
    name: 'autumn',
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
    bass: [
      110.0, null, null, null, 98.0, null, 98.0, null,
      87.31, null, null, null, 98.0, null, 110.0, null,
    ],
  },
  {
    name: 'winter',
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
    bass: [
      82.41, null, null, null, 98.0, null, null, null,
      73.42, null, null, null, 87.31, null, 98.0, null,
    ],
  },
];
const FINAL_WAVE_MUSIC = {
  name: 'final-wave',
  isBoss: true,
  baseStep: 0.096,
  minStep: 0.068,
  intensityBoost: 10,
  melodyType: 'sawtooth',
  bassType: 'sawtooth',
  accentType: 'square',
  melodyGain: 0.036,
  bassGain: 0.052,
  hatGain: 0.018,
  drumGain: 0.032,
  drumFilter: 180,
  melody: [
    // Ominous descending chromatic figure — urgent, cosmic
    349.23, 329.63, 311.13, null, 293.66, null, 261.63, null,
    261.63, null, 293.66, 311.13, 329.63, 349.23, 369.99, null,
    349.23, null, 329.63, null, 311.13, null, 293.66, 261.63,
    220.0, null, 233.08, 261.63, 293.66, 311.13, 261.63, 220.0,
  ],
  bass: [
    55.0, null, 55.0, null, 65.41, null, 58.27, null,
    49.0, null, 49.0, null, 58.27, null, 65.41, null,
  ],
};

const BOSS_MUSIC = {
  name: 'boss',
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
  pathLanes,
}) {
  let audioEnabled = initialEnabled;
  let audioContext = null;
  let masterGain = null;
  let musicGain = null;
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
      musicGain.connect(masterGain);
      masterGain.connect(audioContext.destination);
    }

    return audioContext;
  }

  function resumeAudio() {
    const context = ensureAudio();
    if (context && context.state === 'suspended') {
      context.resume().catch(() => {});
    }
    return context;
  }

  function playTone(frequency, duration, options = {}) {
    const context = resumeAudio();
    if (!context || !masterGain) return;

    const start = context.currentTime + (options.delay || 0);
    scheduleTone(frequency, duration, start, options, masterGain);
  }

  function scheduleTone(frequency, duration, start, options = {}, destination = masterGain) {
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
    gainNode.connect(destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.04);
  }

  function playNoise(duration, options = {}) {
    const context = resumeAudio();
    if (!context || !masterGain) return;

    const start = context.currentTime + (options.delay || 0);
    scheduleNoise(duration, start, options, masterGain);
  }

  function scheduleNoise(duration, start, options = {}, destination = masterGain) {
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

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(destination);
    source.start(start);
    source.stop(start + duration + 0.02);
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

    while (nextMusicTime < audioContext.currentTime + MUSIC_SCHEDULE_AHEAD) {
      const transitionProgress = getMusicTransitionProgress(nextMusicTime);
      const baseStep = previousMusicProfile
        ? lerp(previousMusicProfile.baseStep, activeMusicProfile.baseStep, transitionProgress)
        : activeMusicProfile.baseStep;
      const intensity = getMusicIntensity(wave, activeMusicProfile);
      const stepDuration = Math.max(activeMusicProfile.minStep || 0.112, baseStep - intensity * 0.0065);
      if (previousMusicProfile && transitionProgress < 1) {
        scheduleMusicStep(musicStep, nextMusicTime, stepDuration, previousMusicProfile, intensity, 1 - transitionProgress);
      }
      scheduleMusicStep(musicStep, nextMusicTime, stepDuration, activeMusicProfile, intensity, previousMusicProfile ? transitionProgress : 1);
      nextMusicTime += stepDuration;
      musicStep = (musicStep + 1) % activeMusicProfile.melody.length;
    }
  }

  function getMusicProfile(wave) {
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
    if (profile.name === 'game-over') return 0;
    if (profile.name === 'wave-clear') return Math.min(Math.max(0, wave - 1) * 0.35, 4);
    return Math.min(Math.max(0, wave - 1) + (profile.intensityBoost || 0), 14);
  }

  function isMusicActiveMode() {
    const mode = getMode();
    return mode === 'running' || mode === 'wave_cleared' || mode === 'gameover';
  }

  function scheduleMusicStep(step, start, stepDuration, profile, intensity, profileGain = 1) {
    if (profileGain <= 0.02) return;

    const melody = profile.melody[step % profile.melody.length];
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
      if (densePulse) {
        scheduleTone(bass * 2, stepDuration * 0.52, start + stepDuration * 0.5, {
          gain: (0.009 + intensity * 0.0007) * profileGain,
          type: profile.accentType,
          attack: 0.004,
        }, musicGain);
      }
    }

    if (melody && (step % 2 === 0 || intensity >= 2 || profile.name === 'summer' || isBoss)) {
      scheduleTone(melody, stepDuration * 0.82, start + stepDuration * 0.08, {
        gain: (profile.melodyGain + intensity * 0.0008) * profileGain,
        type: profile.melodyType,
        attack: 0.003,
      }, musicGain);
      if (step % 8 === 6 || latePulse) {
        scheduleTone(melody * (profile.name === 'winter' ? 2 : isBoss ? 1.414 : 1.5), stepDuration * 0.5, start + stepDuration * 0.18, {
          gain: (0.009 + intensity * 0.0005) * profileGain,
          type: profile.accentType,
          attack: 0.003,
        }, musicGain);
      }
    }

    if (step % 4 === 2 || latePulse) {
      scheduleNoise(stepDuration * 0.35, start + stepDuration * 0.16, {
        gain: (profile.hatGain + intensity * 0.00065) * profileGain,
        filterType: 'highpass',
        filterFrequency: profile.name === 'winter' ? 3200 : isBoss ? 1800 : 2400,
        q: 0.6,
      }, musicGain);
    }

    if (step % 16 === 8 || (intensity >= 6 && step % 16 === 0) || (isBoss && step % 8 === 4)) {
      scheduleNoise(stepDuration * 0.55, start, {
        gain: (profile.drumGain + intensity * 0.0009) * profileGain,
        filterType: 'bandpass',
        filterFrequency: profile.drumFilter,
        q: 0.9,
      }, musicGain);
    }

    if (isBoss && step % 16 === 0) {
      scheduleTone(41.2, stepDuration * 3, start, {
        gain: (0.02 + intensity * 0.0007) * profileGain,
        type: 'sawtooth',
        attack: 0.02,
      }, musicGain);
    }
  }

  function lerp(start, end, t) {
    return start + (end - start) * t;
  }

  function playToggleSound() {
    playTone(640, 0.07, { gain: 0.045, type: 'triangle' });
  }

  function playStartSound() {
    playTone(196, 0.16, { gain: 0.045, type: 'triangle' });
    playTone(294, 0.14, { gain: 0.04, delay: 0.05, type: 'triangle' });
    playTone(392, 0.18, { gain: 0.036, delay: 0.1, type: 'sine' });
  }

  function playPauseSound() {
    playTone(330, 0.08, { gain: 0.032, type: 'triangle', endFrequency: 220 });
  }

  function playTypeSound() {
    const pitch = 520 + Math.min(getTypedLength(), 12) * 18;
    playTone(pitch, 0.045, { gain: 0.026, type: 'square' });
  }

  function playBackspaceSound() {
    playTone(260, 0.05, { gain: 0.02, type: 'triangle', endFrequency: 190 });
  }

  function playMistakeSound() {
    playTone(150, 0.13, { gain: 0.05, type: 'sawtooth', endFrequency: 82 });
    playNoise(0.08, { gain: 0.025, filterFrequency: 180, filterType: 'lowpass' });
  }

  function playRevealSound(enemy) {
    const laneIndex = Math.max(0, pathLanes.findIndex((lane) => lane === enemy.lane));
    const pitch = enemy.isBoss ? 180 : 460 + laneIndex * 18;
    playTone(pitch, 0.09, { gain: enemy.isBoss ? 0.06 : 0.03, type: enemy.isBoss ? 'sawtooth' : 'triangle' });
    if (enemy.isBoss) playTone(90, 0.2, { gain: 0.036, delay: 0.02, type: 'sine' });
  }

  function playDefeatSound(enemy) {
    const base = enemy.isBoss ? 180 : 720;
    playTone(base, 0.09, { gain: 0.055, type: 'square', endFrequency: enemy.isBoss ? 320 : 420 });
    playTone(base * 1.5, 0.12, { gain: 0.03, delay: 0.035, type: 'triangle', endFrequency: base * 0.75 });
    playNoise(enemy.isBoss ? 0.24 : 0.13, {
      gain: enemy.isBoss ? 0.08 : 0.045,
      filterFrequency: enemy.isBoss ? 360 : 1200,
      filterType: enemy.isBoss ? 'lowpass' : 'bandpass',
    });
  }

  function playHealSound(healed) {
    playTone(660, 0.1, { gain: 0.042, type: 'triangle', endFrequency: 880 });
    if (healed > 0) {
      playTone(990, 0.16, { gain: 0.032, delay: 0.04, type: 'sine' });
    }
    playNoise(0.1, { gain: 0.022, delay: 0.02, filterFrequency: 1800, filterType: 'bandpass' });
  }

  function playMedicPassSound() {
    playTone(420, 0.08, { gain: 0.026, type: 'triangle', endFrequency: 280 });
  }

  function playDamageSound(enemy) {
    const bossHit = !!enemy?.isBoss;
    playTone(bossHit ? 62 : 78, bossHit ? 0.28 : 0.22, { gain: bossHit ? 0.086 : 0.07, type: 'sawtooth', endFrequency: bossHit ? 36 : 45 });
    playNoise(bossHit ? 0.24 : 0.18, { gain: bossHit ? 0.074 : 0.06, filterFrequency: bossHit ? 135 : 170, filterType: 'lowpass' });
  }

  function playBossThrowSound() {
    playTone(176, 0.11, { gain: 0.045, type: 'sawtooth', endFrequency: 132 });
    playTone(352, 0.07, { gain: 0.022, delay: 0.03, type: 'square', endFrequency: 260 });
  }

  function playBossImpactSound() {
    playTone(92, 0.16, { gain: 0.058, type: 'sawtooth', endFrequency: 52 });
    playNoise(0.12, { gain: 0.045, filterFrequency: 260, filterType: 'lowpass' });
  }

  function playBossWarningSound() {
    playTone(146.83, 0.18, { gain: 0.072, type: 'sawtooth', endFrequency: 110 });
    playTone(73.42, 0.48, { gain: 0.052, delay: 0.06, type: 'sawtooth', endFrequency: 55 });
    playTone(220, 0.12, { gain: 0.04, delay: 0.2, type: 'square', endFrequency: 155.56 });
    playNoise(0.42, { gain: 0.038, delay: 0.04, filterFrequency: 340, filterType: 'bandpass', q: 1.4 });
  }

  function playWaveClearSound() {
    playTone(262, 0.22, { gain: 0.04, type: 'triangle' });
    playTone(330, 0.24, { gain: 0.035, delay: 0.04, type: 'triangle' });
    playTone(392, 0.3, { gain: 0.035, delay: 0.08, type: 'triangle' });
    playTone(523, 0.22, { gain: 0.026, delay: 0.16, type: 'sine' });
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
    playTone(120, 0.04, { gain: 0.035, type: 'sawtooth', endFrequency: 110 });
    playTone(130, 0.04, { gain: 0.035, delay: 0.035, type: 'sawtooth', endFrequency: 120 });
    playTone(140, 0.05, { gain: 0.035, delay: 0.07, type: 'sawtooth', endFrequency: 130 });
    playTone(440, 0.12, { gain: 0.024, delay: 0.12, type: 'sine' });
    playTone(660, 0.14, { gain: 0.024, delay: 0.18, type: 'sine' });
    playTone(880, 0.16, { gain: 0.020, delay: 0.24, type: 'sine' });
  }

  function playShockwaveSound() {
    playTone(120, 0.45, { gain: 0.065, type: 'sawtooth', endFrequency: 60 });
    playTone(60, 0.60, { gain: 0.080, delay: 0.05, type: 'sine', endFrequency: 30 });
    playNoise(0.60, { gain: 0.075, filterFrequency: 450, filterType: 'lowpass' });
  }

  return {
    toggleEnabled,
    updateAudioButton,
    resumeAudio,
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
    playHealSound,
    playMedicPassSound,
    playDamageSound,
    playBossThrowSound,
    playBossImpactSound,
    playBossWarningSound,
    playWaveClearSound,
    playGameOverSound,
    playGodModeOnSound,
    playGodModeOffSound,
    playChestClackSound,
    playChestOpenSound,
    playShockwaveSound,
  };
}

