// Collision Lab physics that needs no scene: wall bounces and the impulse between two balls.
// Velocities are any objects with x and y, so THREE vectors and plain objects both work.

// The first time in [0, dt] at which p + v·t + ½a·t² reaches the wall w while moving into it
// (side +1 for an upper wall, −1 for a lower one), or null if it does not get there.
function timeToWall(p, v, a, dt, w, side) {
    const c = p - w;
    let roots;
    if (Math.abs(a) < 1e-12) {
        roots = Math.abs(v) < 1e-12 ? [] : [-c / v];
    } else {
        const disc = v * v - 2 * a * c;
        if (disc < 0) return null;
        const s = Math.sqrt(disc);
        roots = [(-v - s) / a, (-v + s) / a].sort((x, y) => x - y);
    }
    for (const t of roots) {
        if (t >= -1e-12 && t <= dt && side * (v + a * t) >= 0) return Math.max(0, t);
    }
    return null;
}

// Moves one coordinate through a step of dt with constant acceleration a between walls at lo and
// hi, which reverse the velocity into them and scale it by e. Free flight is exact and each bounce
// happens at the moment of contact, so e = 1 keeps the energy at any step size. A ball that would
// strike the same wall again within the step (resting, or bouncing too little to see) stays on it.
export function advanceAxis(p, v, a, dt, lo, hi, e) {
    // A ball already past a wall (moved by the overlap solver or a resize) is put back on it.
    if (p > hi) {
        p = hi;
        if (v > 0) v = -v * e;
    } else if (p < lo) {
        p = lo;
        if (v < 0) v = -v * e;
    }
    const tHi = timeToWall(p, v, a, dt, hi, 1);
    const tLo = timeToWall(p, v, a, dt, lo, -1);
    if (tHi === null && tLo === null) {
        return { p: p + v * dt + 0.5 * a * dt * dt, v: v + a * dt };
    }
    const hitHi = tLo === null || (tHi !== null && tHi <= tLo);
    const t = hitHi ? tHi : tLo;
    const w = hitHi ? hi : lo;
    const side = hitHi ? 1 : -1;
    const out = -(v + a * t) * e;
    const r = dt - t;
    const pNext = w + out * r + 0.5 * a * r * r;
    if (side * out >= 0 || side * (pNext - w) > 0) return { p: w, v: 0 };
    return { p: pNext, v: out + a * r };
}

// Speed at which b moves away from a along the unit normal (nx, ny); negative while they approach.
export function normalSpeed(va, vb, nx, ny) {
    return (vb.x - va.x) * nx + (vb.y - va.y) * ny;
}

// Applies the impulse J = −(1 + e)·vₙ / (1/m_a + 1/m_b) along the normal from a to b, so the
// balls separate at e times the speed they closed at and momentum is unchanged. Pairs already
// separating are left alone. An inverse mass of 0 makes that ball immovable. Returns J.
export function applyPairImpulse(va, vb, nx, ny, invMassA, invMassB, e) {
    const vn = normalSpeed(va, vb, nx, ny);
    const invMassSum = invMassA + invMassB;
    if (vn >= 0 || invMassSum <= 0) return 0;
    const impulse = (-(1 + e) * vn) / invMassSum;
    va.x -= impulse * nx * invMassA;
    va.y -= impulse * ny * invMassA;
    vb.x += impulse * nx * invMassB;
    vb.y += impulse * ny * invMassB;
    return impulse;
}
