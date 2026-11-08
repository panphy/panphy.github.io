// Ripple tank wave formulas shared by the readouts and overlays.
// Lengths in cm, speeds in cm/s, angles in degrees unless named ...Rad.
// The tank shader evaluates the same formulas on the GPU.
(function (root) {
  const TANK_SIZE = 16;
  const DEG = Math.PI / 180;

  const wavelength = (speed, frequency) => speed / frequency;

  // ---------- Refraction of a straight wave at a straight boundary ----------
  // The wave starts in region 1 moving in +x. The boundary normal makes angle
  // `incidence` with +x, so that is the angle of incidence. The transmitted wave
  // keeps the wave's phase along the boundary, which gives Snell's law.
  function refraction(speed1, speed2, incidence) {
    const s1 = Math.sin(incidence * DEG);
    const ratio = (speed2 / speed1) * s1;
    const critical = speed2 > speed1 ? Math.asin(speed1 / speed2) / DEG : null;
    if (ratio >= 1) return { total: true, critical, refracted: null };
    return { total: false, critical, refracted: Math.asin(ratio) / DEG };
  }

  // Travel time from a straight source at x = sourceX to point (x, y), mirroring
  // the shader. Region 2 lies where x*nx + y*ny > offset. Returns the time and
  // the amplitude factor (below 1 only for the evanescent wave past a total
  // internal reflection). `reflected` gives the totally reflected wave instead.
  function planeWaveTime(x, y, m, reflected = false) {
    const a = m.incidence * DEG;
    const nx = Math.cos(a);
    const ny = Math.sin(a);
    const side = x * nx + y * ny - m.offset;
    const tA = (x - m.sourceX) / m.speed1;
    const sn = nx / m.speed1; // slowness along the normal
    const tx = 1 / m.speed1 - sn * nx; // slowness along the boundary (vector)
    const ty = -sn * ny;
    const along = x * tx + y * ty;
    const base = -m.sourceX / m.speed1;
    const sn2sq = 1 / (m.speed2 * m.speed2) - (tx * tx + ty * ty);
    const omega = 2 * Math.PI * m.frequency;

    if (reflected) {
      if (sn2sq >= 0 || side > 0) return null;
      // Mirror image of the incident wave in the boundary.
      return { time: base + along - sn * (side + m.offset) + 2 * sn * m.offset, amplitude: 1 };
    }
    if (side <= 0) return { time: tA, amplitude: 1 };
    if (sn2sq >= 0) {
      const sn2 = Math.sqrt(sn2sq);
      return { time: base + along + sn2 * side + sn * m.offset, amplitude: 1 };
    }
    // Total internal reflection: the wave dies away within a short distance.
    return { time: base + along + sn * m.offset, amplitude: Math.exp(-omega * Math.sqrt(-sn2sq) * side) };
  }

  // ---------- Interference of two point sources ----------
  // Path difference r1 − r2 at which the two waves arrive in step (antinodal)
  // or opposite (nodal), allowing for source 2 leading by `phase` degrees.
  function interferenceOrders(separation, lambda, phase, kind) {
    const shift = phase / 360;
    const offset = kind === 'nodal' ? 0.5 : 0;
    const orders = [];
    const maxM = Math.ceil(separation / lambda) + 2;
    for (let m = -maxM; m <= maxM; m++) {
      const d = (m + offset + shift) * lambda;
      if (Math.abs(d) < separation - 1e-6) orders.push(d);
    }
    return orders;
  }

  // Points on the hyperbola r1 − r2 = d, with S1 at (−a, 0) and S2 at (a, 0),
  // clipped to the tank.
  function hyperbola(separation, d, half = TANK_SIZE / 2, steps = 120) {
    const a = separation / 2;
    const A = d / 2;
    const B2 = a * a - A * A;
    if (B2 <= 0) return [];
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const y = -half + (2 * half * i) / steps;
      const x = Math.abs(A) < 1e-9 ? 0 : Math.sign(A) * Math.abs(A) * Math.sqrt(1 + (y * y) / B2);
      if (Math.abs(x) <= half) points.push([x, y]);
    }
    return points;
  }

  // Path difference at a point, in cm and in wavelengths, and what it means.
  function pathDifference(px, py, separation, lambda, phase) {
    const a = separation / 2;
    const r1 = Math.hypot(px + a, py);
    const r2 = Math.hypot(px - a, py);
    const diff = r1 - r2;
    const cycles = diff / lambda - phase / 360; // whole numbers: in step
    const frac = cycles - Math.round(cycles);
    let kind = 'between';
    if (Math.abs(frac) <= 0.1) kind = 'antinodal';
    else if (Math.abs(Math.abs(frac) - 0.5) <= 0.1) kind = 'nodal';
    return { r1, r2, diff, inWavelengths: diff / lambda, kind };
  }

  const api = { TANK_SIZE, wavelength, refraction, planeWaveTime, interferenceOrders, hyperbola, pathDifference };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RipplePhysics = api;
})(typeof window !== 'undefined' ? window : globalThis);
