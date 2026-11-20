// Planar orbital mechanics for Launchpad. Pure functions, SI units, no DOM.
// The plane is Earth's equatorial plane, seen from the north: x and y are
// inertial, Earth turns counterclockwise and "east" is the direction of spin.

export const MU = 3.986004418e14;      // Earth's GM, m^3 s^-2
export const R_EARTH = 6371000;        // m
export const OMEGA = 7.2921159e-5;     // Earth's spin, rad/s
export const G0 = 9.80665;             // standard gravity, m/s^2
export const ATMO_TOP = 140000;        // no drag above this altitude, m
export const SPACE_EDGE = 100000;      // Kármán line, m
export const SOUND_SPEED = 300;        // m/s, a fixed value is enough for the drag rise

// Piecewise exponential fit to the US Standard Atmosphere 1976 (Vallado's table):
// [base altitude km, density at base kg/m^3, scale height km].
const ATMOSPHERE = [
  [0, 1.225, 7.249], [25, 3.899e-2, 6.349], [30, 1.774e-2, 6.682], [40, 3.972e-3, 7.554],
  [50, 1.057e-3, 8.382], [60, 3.206e-4, 7.714], [70, 8.770e-5, 6.549], [80, 1.905e-5, 5.799],
  [90, 3.396e-6, 5.382], [100, 5.297e-7, 5.877], [110, 9.661e-8, 7.263], [120, 2.438e-8, 9.473],
  [130, 8.484e-9, 12.636]
];

export function airDensity(altitude) {
  if (altitude >= ATMO_TOP) return 0;
  const km = Math.max(0, altitude) / 1000;
  let row = ATMOSPHERE[0];
  for (let i = ATMOSPHERE.length - 1; i >= 0; i -= 1) {
    if (km >= ATMOSPHERE[i][0]) { row = ATMOSPHERE[i]; break; }
  }
  return row[1] * Math.exp(-(km - row[0]) / row[2]);
}

// Pressure as a fraction of sea level, for engine performance.
export function pressureRatio(altitude) {
  if (altitude >= ATMO_TOP) return 0;
  return Math.exp(-Math.max(0, altitude) / 7100);
}

// Drag coefficient with a transonic rise.
export function dragCoefficient(mach) {
  return 0.28 + 0.3 * Math.exp(-(((mach - 1.1) / 0.4) ** 2));
}

export function altitudeOf(x, y) {
  return Math.hypot(x, y) - R_EARTH;
}

// Velocity of the air (and ground) at a point, which turns with the Earth.
export function airVelocity(x, y) {
  return [-OMEGA * y, OMEGA * x];
}

// Acceleration of a body at (x, y) with velocity (vx, vy).
// thrust is a force vector in newtons; area is the frontal area in m^2.
export function acceleration(x, y, vx, vy, mass, thrustX, thrustY, area) {
  const r = Math.hypot(x, y);
  const g = -MU / (r * r * r);
  let ax = g * x + thrustX / mass;
  let ay = g * y + thrustY / mass;
  const rho = airDensity(r - R_EARTH);
  if (rho > 0 && area > 0) {
    const rvx = vx + OMEGA * y;
    const rvy = vy - OMEGA * x;
    const speed = Math.hypot(rvx, rvy);
    const k = -0.5 * rho * speed * dragCoefficient(speed / SOUND_SPEED) * area / mass;
    ax += k * rvx;
    ay += k * rvy;
  }
  return [ax, ay];
}

// One RK4 step. s = {x, y, vx, vy, mass}; thrust and mass flow are held over the step.
export function rk4Step(s, dt, thrustX, thrustY, massFlow, area) {
  const half = dt / 2;
  const m1 = s.mass;
  const m2 = Math.max(1, s.mass - massFlow * half);
  const m3 = Math.max(1, s.mass - massFlow * dt);
  const a1 = acceleration(s.x, s.y, s.vx, s.vy, m1, thrustX, thrustY, area);
  const x2 = s.x + s.vx * half, y2 = s.y + s.vy * half;
  const vx2 = s.vx + a1[0] * half, vy2 = s.vy + a1[1] * half;
  const a2 = acceleration(x2, y2, vx2, vy2, m2, thrustX, thrustY, area);
  const x3 = s.x + vx2 * half, y3 = s.y + vy2 * half;
  const vx3 = s.vx + a2[0] * half, vy3 = s.vy + a2[1] * half;
  const a3 = acceleration(x3, y3, vx3, vy3, m2, thrustX, thrustY, area);
  const x4 = s.x + vx3 * dt, y4 = s.y + vy3 * dt;
  const vx4 = s.vx + a3[0] * dt, vy4 = s.vy + a3[1] * dt;
  const a4 = acceleration(x4, y4, vx4, vy4, m3, thrustX, thrustY, area);
  s.x += dt / 6 * (s.vx + 2 * vx2 + 2 * vx3 + vx4);
  s.y += dt / 6 * (s.vy + 2 * vy2 + 2 * vy3 + vy4);
  s.vx += dt / 6 * (a1[0] + 2 * a2[0] + 2 * a3[0] + a4[0]);
  s.vy += dt / 6 * (a1[1] + 2 * a2[1] + 2 * a3[1] + a4[1]);
  s.mass = m3;
  return s;
}

function stumpff(psi) {
  if (psi > 1e-6) {
    const sq = Math.sqrt(psi);
    return [(1 - Math.cos(sq)) / psi, (sq - Math.sin(sq)) / (sq * psi)];
  }
  if (psi < -1e-6) {
    const sq = Math.sqrt(-psi);
    return [(1 - Math.cosh(sq)) / psi, (Math.sinh(sq) - sq) / (sq * -psi)];
  }
  return [0.5 - psi / 24, 1 / 6 - psi / 120];
}

// Exact two-body motion over dt (universal variables), for coasting on rails.
// Returns a new {x, y, vx, vy}; works for ellipses and hyperbolas alike.
export function keplerStep(s, dt, mu = MU) {
  const r0 = Math.hypot(s.x, s.y);
  const v2 = s.vx * s.vx + s.vy * s.vy;
  const rdotv = s.x * s.vx + s.y * s.vy;
  const alpha = 2 / r0 - v2 / mu;                 // 1 / semi-major axis
  const sqrtMu = Math.sqrt(mu);
  if (alpha > 1e-12) {
    const period = 2 * Math.PI / (sqrtMu * alpha ** 1.5);
    dt %= period;
  }
  if (dt === 0) return { x: s.x, y: s.y, vx: s.vx, vy: s.vy };
  let chi;
  if (alpha > 1e-12) chi = sqrtMu * dt * alpha;
  else if (alpha < -1e-12) {
    const a = 1 / alpha;
    chi = Math.sign(dt) * Math.sqrt(-a) * Math.log((-2 * mu * alpha * dt) /
      (rdotv + Math.sign(dt) * Math.sqrt(-mu * a) * (1 - r0 * alpha)));
  } else chi = sqrtMu * dt / r0;
  let c2 = 0.5, c3 = 1 / 6, r = r0, psi = 0;
  for (let i = 0; i < 60; i += 1) {
    psi = chi * chi * alpha;
    [c2, c3] = stumpff(psi);
    r = chi * chi * c2 + rdotv / sqrtMu * chi * (1 - psi * c3) + r0 * (1 - psi * c2);
    const delta = (sqrtMu * dt - chi ** 3 * c3 - rdotv / sqrtMu * chi * chi * c2 - r0 * chi * (1 - psi * c3)) / r;
    chi += delta;
    if (Math.abs(delta) < 1e-9 * Math.max(1, Math.abs(chi))) break;
  }
  psi = chi * chi * alpha;
  [c2, c3] = stumpff(psi);
  r = chi * chi * c2 + rdotv / sqrtMu * chi * (1 - psi * c3) + r0 * (1 - psi * c2);
  const f = 1 - chi * chi / r0 * c2;
  const g = dt - chi ** 3 / sqrtMu * c3;
  const fdot = sqrtMu / (r * r0) * chi * (psi * c3 - 1);
  const gdot = 1 - chi * chi / r * c2;
  return {
    x: f * s.x + g * s.vx,
    y: f * s.y + g * s.vy,
    vx: fdot * s.x + gdot * s.vx,
    vy: fdot * s.y + gdot * s.vy
  };
}

// Osculating orbit of a state: sizes are radii from Earth's center, times in seconds.
export function orbitOf(s, mu = MU) {
  const r = Math.hypot(s.x, s.y);
  const v2 = s.vx * s.vx + s.vy * s.vy;
  const h = s.x * s.vy - s.y * s.vx;
  const rdotv = s.x * s.vx + s.y * s.vy;
  const energy = v2 / 2 - mu / r;
  const ex = ((v2 - mu / r) * s.x - rdotv * s.vx) / mu;
  const ey = ((v2 - mu / r) * s.y - rdotv * s.vy) / mu;
  const e = Math.hypot(ex, ey);
  const p = h * h / mu;
  const bound = energy < 0 && e < 1;
  const a = -mu / (2 * energy);
  const periapsis = p / (1 + e);
  const apoapsis = bound ? p / (1 - e) : Infinity;
  const dir = h >= 0 ? 1 : -1;
  // With a near-circular orbit the periapsis direction is ill-defined; start it at the craft.
  const argPe = e > 1e-9 ? Math.atan2(ey, ex) : Math.atan2(s.y, s.x);
  const nu = e > 1e-9 ? Math.atan2(dir * (ex * s.y - ey * s.x), ex * s.x + ey * s.y) : 0;
  const orbit = { a, e, p, h, dir, energy, periapsis, apoapsis, argPe, nu, bound, period: Infinity, toAp: Infinity, toPe: Infinity };
  if (bound) {
    const n = Math.sqrt(mu / (a * a * a));
    const E = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2));
    const M = E - e * Math.sin(E);
    const wrap = (angle) => ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    orbit.period = 2 * Math.PI / n;
    orbit.toPe = wrap(-M) / n;
    orbit.toAp = wrap(Math.PI - M) / n;
  } else if (e > 1) {
    const n = Math.sqrt(mu / (-a) ** 3);
    const F = 2 * Math.atanh(Math.sqrt((e - 1) / (e + 1)) * Math.tan(nu / 2));
    const M = e * Math.sinh(F) - F;
    orbit.toPe = M < 0 ? -M / n : Infinity;
  }
  return orbit;
}

// Radius of the orbit at true anomaly nu.
export function orbitRadius(orbit, nu) {
  return orbit.p / (1 + orbit.e * Math.cos(nu));
}

// Speed of a circular orbit at radius r.
export function circularSpeed(r, mu = MU) {
  return Math.sqrt(mu / r);
}

// Tsiolkovsky's rocket equation.
export function deltaV(isp, wetMass, dryMass) {
  return isp * G0 * Math.log(wetMass / dryMass);
}
