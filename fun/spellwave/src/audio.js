const MASTER_VOLUME = 0.75;
const MUSIC_GAIN = 0.82;
const MUSIC_TIMER_INTERVAL = 80;
const MUSIC_SCHEDULE_AHEAD = 0.34;
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

export function createSpellwaveAudio({
  audioButton,
  initialEnabled,
  saveAudioSetting,
  getMode,
  getWaveSet,
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

  function updateAudioButton() {
    audioButton.classList.toggle('is-muted', !audioEnabled);
    audioButton.classList.toggle('is-audio-on', audioEnabled);
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
    if (!context || !musicGain || getMode() !== 'running') return;

    if (reset || nextMusicTime < context.currentTime) {
      musicStep = 0;
      nextMusicTime = context.currentTime + 0.08;
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
    if (!audioEnabled || getMode() !== 'running' || !audioContext || !musicGain) {
      stopMusicLoop(0.04);
      return;
    }

    const wave = getWaveSet();
    const season = getMusicSeason(wave);
    const intensity = getMusicIntensity(wave);
    const stepDuration = Math.max(0.112, season.baseStep - intensity * 0.0065);
    while (nextMusicTime < audioContext.currentTime + MUSIC_SCHEDULE_AHEAD) {
      scheduleMusicStep(musicStep, nextMusicTime, stepDuration, season, intensity);
      nextMusicTime += stepDuration;
      musicStep = (musicStep + 1) % season.melody.length;
    }
  }

  function getMusicSeason(wave) {
    return MUSIC_SEASONS[Math.max(0, wave - 1) % MUSIC_SEASONS.length];
  }

  function getMusicIntensity(wave) {
    return Math.min(Math.max(0, wave - 1), 12);
  }

  function scheduleMusicStep(step, start, stepDuration, season, intensity) {
    const melody = season.melody[step % season.melody.length];
    const bass = season.bass[step % season.bass.length];
    const accent = step % 8 === 0;
    const densePulse = intensity >= 4 && step % 4 === 0;
    const latePulse = intensity >= 8 && step % 2 === 1;

    if (bass) {
      scheduleTone(bass, stepDuration * 1.6, start, {
        gain: (accent ? season.bassGain * 1.25 : season.bassGain) + intensity * 0.0011,
        type: season.bassType,
        attack: 0.004,
      }, musicGain);
      if (densePulse) {
        scheduleTone(bass * 2, stepDuration * 0.52, start + stepDuration * 0.5, {
          gain: 0.009 + intensity * 0.0007,
          type: season.accentType,
          attack: 0.004,
        }, musicGain);
      }
    }

    if (melody && (step % 2 === 0 || intensity >= 2 || season.name === 'summer')) {
      scheduleTone(melody, stepDuration * 0.82, start + stepDuration * 0.08, {
        gain: season.melodyGain + intensity * 0.0008,
        type: season.melodyType,
        attack: 0.003,
      }, musicGain);
      if (step % 8 === 6 || latePulse) {
        scheduleTone(melody * (season.name === 'winter' ? 2 : 1.5), stepDuration * 0.5, start + stepDuration * 0.18, {
          gain: 0.009 + intensity * 0.0005,
          type: season.accentType,
          attack: 0.003,
        }, musicGain);
      }
    }

    if (step % 4 === 2 || latePulse) {
      scheduleNoise(stepDuration * 0.35, start + stepDuration * 0.16, {
        gain: season.hatGain + intensity * 0.00065,
        filterType: 'highpass',
        filterFrequency: season.name === 'winter' ? 3200 : 2400,
        q: 0.6,
      }, musicGain);
    }

    if (step % 16 === 8 || (intensity >= 6 && step % 16 === 0)) {
      scheduleNoise(stepDuration * 0.55, start, {
        gain: season.drumGain + intensity * 0.0009,
        filterType: 'bandpass',
        filterFrequency: season.drumFilter,
        q: 0.9,
      }, musicGain);
    }
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
    playTone(110, 0.38, { gain: 0.055, type: 'sawtooth', endFrequency: 82 });
    playTone(55, 0.42, { gain: 0.035, delay: 0.08, type: 'sine' });
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
  };
}
