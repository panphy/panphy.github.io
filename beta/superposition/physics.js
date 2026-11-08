// Wave superposition on a string, worked out exactly from formulas.
// Every displacement is a pure function of position x (m) and time t (s), so the
// time scrubber and frame steps can jump anywhere without drift.
// Displacements are in cm. The string runs from x = 0 to x = STRING_LENGTH.
(function (root) {
  const STRING_LENGTH = 4;

  // Pulse shapes over u in [-1, 1], where u = +1 is the leading edge.
  // "fin" is lopsided on purpose, so students can see pulses pass through each
  // other and see a reflection reverse the pulse front to back.
  function shapeValue(shape, u) {
    if (u <= -1 || u >= 1) return 0;
    if (shape === 'fin') return u < 0.5 ? (u + 1) / 1.5 : (1 - u) / 0.5;
    if (shape === 'square') {
      const edge = 0.92;
      return Math.abs(u) <= edge ? 1 : (1 - Math.abs(u)) / (1 - edge);
    }
    return 0.5 * (1 + Math.cos(Math.PI * u)); // hump
  }

  // A pulse of full base width `width` (m) and peak `height` (cm) centered at
  // `center`, moving in direction `dir` (+1 right, -1 left).
  function pulseAt(x, center, width, height, dir, shape) {
    return height * shapeValue(shape, (dir * (x - center)) / (width / 2));
  }

  // ---------- Two waves: endless sine waves ----------

  function sineWave(x, t, wave) {
    const omega = 2 * Math.PI * wave.frequency;
    const k = omega / wave.speed;
    return wave.amplitude * Math.sin(k * x - wave.direction * omega * t);
  }

  // ---------- Two pulses: one from each end, on one string ----------

  function pulseStarts(p) {
    return { x1: p.width1 / 2 + 0.3, x2: STRING_LENGTH - p.width2 / 2 - 0.3 };
  }

  function twoPulses(x, t, p) {
    const { x1, x2 } = pulseStarts(p);
    return [
      pulseAt(x, x1 + p.speed * t, p.width1, p.height1, 1, p.shape),
      pulseAt(x, x2 - p.speed * t, p.width2, p.height2, -1, p.shape)
    ];
  }

  // Time for both pulses to leave the string.
  function twoPulsesDuration(p) {
    const { x1, x2 } = pulseStarts(p);
    return Math.max(STRING_LENGTH + p.width1 / 2 - x1, x2 + p.width2 / 2) / p.speed;
  }

  // ---------- Reflection at the right-hand end ----------
  // The reflected wave is the incident wave continued past the end and folded
  // back: inverted at a fixed end (so y = 0 there), upright at a free end (so
  // the string is flat there). The left end absorbs, so there is one reflection.

  function reflectionPulseStart(r) {
    return r.width / 2 + 0.3;
  }

  function incidentWave(x, t, r) {
    if (r.source === 'pulse') {
      return pulseAt(x, reflectionPulseStart(r) + r.speed * t, r.width, r.height, 1, r.shape);
    }
    // A continuous wave switched on at the left end at t = 0: nothing ahead of its front.
    if (x > r.speed * t) return 0;
    return r.amplitude * Math.sin(2 * Math.PI * r.frequency * (t - x / r.speed));
  }

  function reflection(x, t, r) {
    const sign = r.end === 'fixed' ? -1 : 1;
    return [incidentWave(x, t, r), sign * incidentWave(2 * STRING_LENGTH - x, t, r)];
  }

  // Time for a reflected pulse to leave the string (continuous waves run on).
  function reflectionDuration(r) {
    return (2 * STRING_LENGTH + r.width / 2 - reflectionPulseStart(r)) / r.speed;
  }

  // Nodes and antinodes of the standing wave, counted back from the end.
  function standingWavePoints(r) {
    const quarter = r.speed / r.frequency / 4;
    const points = [];
    for (let i = 0; STRING_LENGTH - i * quarter >= -1e-9; i++) {
      const isNode = r.end === 'fixed' ? i % 2 === 0 : i % 2 === 1;
      points.push({ x: STRING_LENGTH - i * quarter, type: isNode ? 'node' : 'antinode' });
    }
    return points;
  }

  const api = {
    STRING_LENGTH,
    shapeValue,
    pulseAt,
    sineWave,
    pulseStarts,
    twoPulses,
    twoPulsesDuration,
    reflectionPulseStart,
    incidentWave,
    reflection,
    reflectionDuration,
    standingWavePoints
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SuperpositionPhysics = api;
})(typeof window !== 'undefined' ? window : globalThis);
