// Collision Lab physics against textbook results: node --test simulations/collision/tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceAxis, applyPairImpulse } from '../physics.js';

const G = 9.8;

// Drops a ball onto a floor at y = 0 in steps of dt and returns its first few peak heights.
function bounceHeights(e, dt, count = 4, h0 = 1) {
    let p = h0;
    let v = 0;
    const peaks = [];
    for (let t = 0; t < 60 && peaks.length < count; t += dt) {
        const before = v;
        ({ p, v } = advanceAxis(p, v, -G, dt, 0, 100, e));
        if (before > 0 && v <= 0) {
            // The apex lies inside this step; recover it exactly from the step's start.
            peaks.push(p + (v * v) / (2 * G));
        }
    }
    return peaks;
}

test('bounce heights follow e^2n at any step size', () => {
    for (const dt of [1 / 90, 1 / 180, 1 / 360]) {
        for (const e of [1, 0.8, 0.5]) {
            const peaks = bounceHeights(e, dt);
            assert.equal(peaks.length, 4, `e = ${e}: four bounces`);
            peaks.forEach((h, i) => {
                const expected = e ** (2 * (i + 1));
                assert.ok(Math.abs(h - expected) < 1e-9, `dt = ${dt.toFixed(4)}, e = ${e}, bounce ${i + 1}: ${h} vs ${expected}`);
            });
        }
    }
});

test('an elastic ball keeps its height for a long run', () => {
    const peaks = bounceHeights(1, 1 / 180, 40);
    assert.equal(peaks.length, 40);
    assert.ok(Math.abs(peaks.at(-1) - 1) < 1e-9, `40th bounce reaches ${peaks.at(-1)}`);
});

test('a ball resting on the floor stays at rest', () => {
    for (const e of [0, 0.6, 1]) {
        let p = 0;
        let v = 0;
        for (let i = 0; i < 1000; i++) ({ p, v } = advanceAxis(p, v, -G, 1 / 180, 0, 10, e));
        assert.equal(p, 0);
        assert.equal(v, 0);
    }
});

test('a wall bounce without gravity returns e times the speed from the point of contact', () => {
    // 2 m/s toward a wall 0.01 m away over a 0.02 s step: contact after 0.005 s, then 0.015 s back.
    const { p, v } = advanceAxis(0.99, 2, 0, 0.02, -1, 1, 0.5);
    assert.ok(Math.abs(v + 1) < 1e-12, `v = ${v}`);
    assert.ok(Math.abs(p - (1 - 0.015)) < 1e-12, `p = ${p}`);
});

test('a ball pushed past a wall is put back on it', () => {
    const into = advanceAxis(1.05, 2, 0, 0, -1, 1, 0.5);
    assert.deepEqual(into, { p: 1, v: -1 });
    const away = advanceAxis(1.05, -2, 0, 0, -1, 1, 0.5);
    assert.deepEqual(away, { p: 1, v: -2 });
});

// Head-on collision along x: v1' = [(m1 − e m2) u1 + (1 + e) m2 u2] / (m1 + m2), and likewise for v2'.
test('1D collisions match the closed-form result', () => {
    const cases = [[1, 1, 1, 0], [4, 1, 1, 0], [1, 2, 2, -1], [3, 0.5, -0.4, 1.5]];
    for (const [m1, m2, u1, u2] of cases) {
        for (const e of [0, 0.3, 0.75, 1]) {
            const a = { x: u1, y: 0 };
            const b = { x: u2, y: 0 };
            applyPairImpulse(a, b, 1, 0, 1 / m1, 1 / m2, e);
            const v1 = ((m1 - e * m2) * u1 + (1 + e) * m2 * u2) / (m1 + m2);
            const v2 = ((m2 - e * m1) * u2 + (1 + e) * m1 * u1) / (m1 + m2);
            const label = `m = ${m1}, ${m2}; u = ${u1}, ${u2}; e = ${e}`;
            if (u1 <= u2) {
                assert.deepEqual([a.x, b.x], [u1, u2], `${label}: separating pair untouched`);
                continue;
            }
            assert.ok(Math.abs(a.x - v1) < 1e-12 && Math.abs(b.x - v2) < 1e-12, `${label}: ${a.x}, ${b.x} vs ${v1}, ${v2}`);
            assert.ok(Math.abs(m1 * a.x + m2 * b.x - (m1 * u1 + m2 * u2)) < 1e-12, `${label}: momentum`);
            assert.ok(Math.abs((b.x - a.x) - e * (u1 - u2)) < 1e-12, `${label}: separation speed`);
        }
    }
});

test('oblique collisions conserve momentum, keep the tangential velocity and, at e = 1, the kinetic energy', () => {
    const m1 = 1.5;
    const m2 = 0.8;
    const n = { x: Math.cos(0.6), y: Math.sin(0.6) };
    for (const e of [0, 0.5, 1]) {
        const a = { x: 2, y: 0.3 };
        const b = { x: -0.5, y: 0.1 };
        const before = { a: { ...a }, b: { ...b } };
        applyPairImpulse(a, b, n.x, n.y, 1 / m1, 1 / m2, e);
        for (const k of ['x', 'y']) {
            assert.ok(Math.abs(m1 * a[k] + m2 * b[k] - (m1 * before.a[k] + m2 * before.b[k])) < 1e-12, `e = ${e}: momentum ${k}`);
        }
        const tangent = (v) => -v.x * n.y + v.y * n.x;
        assert.ok(Math.abs(tangent(a) - tangent(before.a)) < 1e-12 && Math.abs(tangent(b) - tangent(before.b)) < 1e-12, `e = ${e}: tangential`);
        const ke = (u, w) => 0.5 * m1 * (u.x ** 2 + u.y ** 2) + 0.5 * m2 * (w.x ** 2 + w.y ** 2);
        if (e === 1) assert.ok(Math.abs(ke(a, b) - ke(before.a, before.b)) < 1e-12, 'kinetic energy');
        else assert.ok(ke(a, b) < ke(before.a, before.b), `e = ${e}: kinetic energy lost`);
    }
});

test('a ball with zero inverse mass acts as a fixed wall', () => {
    const a = { x: 0, y: 0 };
    const b = { x: -3, y: 0 };
    applyPairImpulse(a, b, 1, 0, 0, 1, 0.6);
    assert.deepEqual(a, { x: 0, y: 0 });
    assert.ok(Math.abs(b.x - 1.8) < 1e-12, `b.x = ${b.x}`);
});
