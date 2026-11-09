const { test } = require('node:test');
const assert = require('node:assert/strict');
const P = require('../physics.js');

const close = (actual, expected, tolerance, label) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} is not within ${tolerance} of ${expected}`);
const L = P.STRING_LENGTH;
const pulse = { source: 'pulse', width: 0.8, height: 3, speed: 1, shape: 'fin' };
const wave = { source: 'wave', amplitude: 2, frequency: 1.5, speed: 2 };

test('pulse shapes are zero outside their width and reach their full height', () => {
  for (const shape of ['hump', 'fin', 'square']) {
    assert.equal(P.shapeValue(shape, -1), 0);
    assert.equal(P.shapeValue(shape, 1), 0);
    let peak = 0;
    for (let u = -1; u <= 1; u += 0.001) peak = Math.max(peak, P.shapeValue(shape, u));
    close(peak, 1, 1e-3, `${shape} peak`);
  }
});

test('a sine wave has the wavelength v / f and moves in its own direction', () => {
  const right = { amplitude: 2, frequency: 2, speed: 3, direction: 1 };
  const wavelength = right.speed / right.frequency;
  for (const x of [0.1, 0.9, 2.3]) {
    close(P.sineWave(x + wavelength, 0.4, right), P.sineWave(x, 0.4, right), 1e-9, 'repeats after one wavelength');
    close(P.sineWave(x + right.speed * 0.25, 0.65, right), P.sineWave(x, 0.4, right), 1e-9, 'moves right at the wave speed');
    const left = { ...right, direction: -1 };
    close(P.sineWave(x - left.speed * 0.25, 0.65, left), P.sineWave(x, 0.4, left), 1e-9, 'moves left at the wave speed');
  }
});

test('two pulses pass through each other unchanged', () => {
  const p = { width1: 0.8, height1: 3, width2: 0.6, height2: -2, speed: 1, shape: 'fin' };
  const { x1, x2 } = P.pulseStarts(p);
  const later = 1.7;
  for (let offset = -0.5; offset <= 0.5; offset += 0.05) {
    const [first] = P.twoPulses(x1 + offset, 0, p);
    const [firstLater] = P.twoPulses(x1 + offset + p.speed * later, later, p);
    close(firstLater, first, 1e-9, 'pulse 1 keeps its shape');
    const [, second] = P.twoPulses(x2 + offset, 0, p);
    const [, secondLater] = P.twoPulses(x2 + offset - p.speed * later, later, p);
    close(secondLater, second, 1e-9, 'pulse 2 keeps its shape');
  }
  const [a, b] = P.twoPulses(L, P.twoPulsesDuration(p) + 0.01, p);
  close(a, 0, 0, 'pulse 1 has left');
  close(b, 0, 0, 'pulse 2 has left');
});

test('a fixed end never moves', () => {
  for (const source of [pulse, wave]) {
    for (let t = 0; t <= 8; t += 0.037) {
      const [incident, reflected] = P.reflection(L, t, { ...source, end: 'fixed' });
      close(incident + reflected, 0, 1e-12, `fixed end at t = ${t.toFixed(2)}`);
    }
  }
});

test('a free end stays flat and reaches twice the incident displacement', () => {
  const dx = 1e-5;
  for (const source of [pulse, wave]) {
    for (let t = 2.5; t <= 8; t += 0.11) {
      const r = { ...source, end: 'free' };
      const total = (x) => P.reflection(x, t, r).reduce((sum, y) => sum + y, 0);
      // A fin pulse has corners, so judge the slope away from them with a loose bound.
      close((total(L) - total(L - dx)) / dx, 0, 0.05, `slope at the free end at t = ${t.toFixed(2)}`);
      close(total(L), 2 * P.incidentWave(L, t, r), 1e-12, 'doubling at the free end');
    }
  }
});

test('a reflected pulse comes back reversed front to back, inverted only at a fixed end', () => {
  const start = P.reflectionPulseStart(pulse);
  const tReturn = (2 * L - 2 * start) / pulse.speed; // back at its starting place, moving left
  for (let offset = -0.39; offset <= 0.39; offset += 0.03) {
    const outgoing = P.pulseAt(start + offset, start, pulse.width, pulse.height, 1, pulse.shape);
    const [, fixed] = P.reflection(start - offset, tReturn, { ...pulse, end: 'fixed' });
    const [, free] = P.reflection(start - offset, tReturn, { ...pulse, end: 'free' });
    close(fixed, -outgoing, 1e-9, 'fixed end inverts');
    close(free, outgoing, 1e-9, 'free end does not invert');
  }
  const [incident, reflected] = P.reflection(0.5, P.reflectionDuration(pulse) + 0.01, { ...pulse, end: 'fixed' });
  close(incident, 0, 0, 'incident pulse has left');
  close(reflected, 0, 0, 'reflected pulse has left');
});

test('nodes and antinodes alternate a quarter wavelength apart, counted from the end', () => {
  for (const end of ['fixed', 'free']) {
    const r = { ...wave, end };
    const points = P.standingWavePoints(r);
    const quarter = wave.speed / wave.frequency / 4;
    assert.equal(points[0].x, L);
    assert.equal(points[0].type, end === 'fixed' ? 'node' : 'antinode');
    points.forEach((point, i) => {
      close(point.x, L - i * quarter, 1e-9, 'spacing');
      if (i) assert.notEqual(point.type, points[i - 1].type);
      // Once the reflected wave has filled the string, check the envelope there.
      let largest = 0;
      for (let t = 10; t < 10 + 1 / wave.frequency; t += 0.002) {
        const [incident, reflected] = P.reflection(point.x, t, r);
        largest = Math.max(largest, Math.abs(incident + reflected));
      }
      close(largest, point.type === 'node' ? 0 : 2 * wave.amplitude, 1e-3, `${point.type} at x = ${point.x.toFixed(3)}`);
    });
  }
});
