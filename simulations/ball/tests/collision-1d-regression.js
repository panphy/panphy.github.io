#!/usr/bin/env node

/**
 * Deterministic 1D collision regression checks for simulations/ball/app.js.
 * Run: node simulations/ball/tests/collision-1d-regression.js
 */

const SPHERE_RADIUS = 0.18;
const MIN_SPHERE_MASS = 0.2;
const MAX_SPHERE_MASS = 5.0;
const MIN_SPHERE_RESTITUTION = 0.0;
const MAX_SPHERE_RESTITUTION = 1.0;
const DEFAULT_SPHERE_MASS = 1.0;
const DEFAULT_SPHERE_RESTITUTION = 1.0;
const PHYSICS_SUBSTEPS = 3;
const COLLISION_SOLVER_POSITION_ITERATIONS = 3;
const COLLISION_SEPARATION_EPSILON = SPHERE_RADIUS * 0.004;

const DIAMETER = SPHERE_RADIUS * 2;
const DEFAULT_DT = 1 / 60;
const EPS = 1e-6;

function clampSphereMass(value) {
    return Math.max(MIN_SPHERE_MASS, Math.min(MAX_SPHERE_MASS, value));
}

function clampSphereRestitution(value) {
    return Math.max(MIN_SPHERE_RESTITUTION, Math.min(MAX_SPHERE_RESTITUTION, value));
}

function makeSphere(
    x,
    vx,
    {
        pinned = false,
        mass = DEFAULT_SPHERE_MASS,
        restitution = DEFAULT_SPHERE_RESTITUTION
    } = {}
) {
    return {
        position: { x },
        velocity: { x: vx },
        pinned,
        mass: clampSphereMass(mass),
        restitution: clampSphereRestitution(restitution)
    };
}

function resolveSphereCollisions1D(spheres, applyVelocity = true) {
    const diameterSq = DIAMETER * DIAMETER;
    const velocityContactDistance = DIAMETER + COLLISION_SEPARATION_EPSILON;
    const velocityContactDistanceSq = velocityContactDistance * velocityContactDistance;

    for (let i = 0; i < spheres.length; i++) {
        for (let j = i + 1; j < spheres.length; j++) {
            const a = spheres[i];
            const b = spheres[j];

            const dx = b.position.x - a.position.x;
            const distSq = dx * dx;
            const contactLimitSq = applyVelocity ? velocityContactDistanceSq : diameterSq;
            if (distSq > contactLimitSq) {
                continue;
            }

            const nx = dx >= 0 ? 1 : -1;
            const dist = Math.abs(dx);
            const penetration = DIAMETER - dist;
            if (penetration <= 0 && !applyVelocity) {
                continue;
            }

            const invMassA = a.pinned ? 0 : (1 / clampSphereMass(a.mass));
            const invMassB = b.pinned ? 0 : (1 / clampSphereMass(b.mass));
            const invMassSum = invMassA + invMassB;
            if (invMassSum <= 0) {
                continue;
            }

            if (penetration > 0) {
                const correction = (penetration + COLLISION_SEPARATION_EPSILON) / invMassSum;
                a.position.x -= nx * correction * invMassA;
                b.position.x += nx * correction * invMassB;
            }

            if (!applyVelocity) {
                continue;
            }

            const relVelN = (b.velocity.x - a.velocity.x) * nx;
            if (relVelN >= 0) {
                continue;
            }

            const pairRestitution = Math.min(
                clampSphereRestitution(a.restitution),
                clampSphereRestitution(b.restitution)
            );
            const impulse = (-(1 + pairRestitution) * relVelN) / invMassSum;
            a.velocity.x -= impulse * nx * invMassA;
            b.velocity.x += impulse * nx * invMassB;
        }
    }
}

function updatePhysics1D(spheres, dt, airDrag = 0) {
    const subDt = dt / PHYSICS_SUBSTEPS;
    for (let substep = 0; substep < PHYSICS_SUBSTEPS; substep++) {
        for (const sphere of spheres) {
            if (sphere.pinned) {
                continue;
            }
            sphere.position.x += sphere.velocity.x * subDt;
            const linearDrag = Math.exp(-airDrag * subDt);
            sphere.velocity.x *= linearDrag;
        }

        for (let iter = 0; iter < COLLISION_SOLVER_POSITION_ITERATIONS; iter++) {
            resolveSphereCollisions1D(spheres, false);
        }
        resolveSphereCollisions1D(spheres, true);
    }
}

function assertNear(actual, expected, tolerance, message) {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`${message}. Expected ${expected}, got ${actual}`);
    }
}

function assertNoOverlap(spheres, tolerance = 1e-4) {
    for (let i = 0; i < spheres.length; i++) {
        for (let j = i + 1; j < spheres.length; j++) {
            const dist = Math.abs(spheres[j].position.x - spheres[i].position.x);
            if (dist < DIAMETER - tolerance) {
                throw new Error(
                    `Spheres ${i} and ${j} overlap by ${(DIAMETER - dist).toFixed(6)}`
                );
            }
        }
    }
}

function runFrames(spheres, frameCount, dt = DEFAULT_DT) {
    for (let frame = 0; frame < frameCount; frame++) {
        updatePhysics1D(spheres, dt, 0);
        assertNoOverlap(spheres);
    }
}

function expected1DCollision(m1, m2, u1, u2, restitution) {
    const denom = m1 + m2;
    return {
        v1: ((m1 - (restitution * m2)) * u1 + ((1 + restitution) * m2 * u2)) / denom,
        v2: ((m2 - (restitution * m1)) * u2 + ((1 + restitution) * m1 * u1)) / denom
    };
}

const tests = [
    {
        name: 'near-contact approaching pair still gets elastic impulse',
        run() {
            const startDist = DIAMETER + (0.5 * COLLISION_SEPARATION_EPSILON);
            const spheres = [
                makeSphere(0, 1),
                makeSphere(startDist, 0)
            ];

            resolveSphereCollisions1D(spheres, true);

            assertNear(spheres[0].velocity.x, 0, EPS, 'Left sphere should stop');
            assertNear(spheres[1].velocity.x, 1, EPS, 'Right sphere should receive velocity');
        }
    },
    {
        name: 'head-on equal-mass collision swaps velocity',
        run() {
            const spheres = [
                makeSphere(-0.5, 1),
                makeSphere(0.5, -1)
            ];

            runFrames(spheres, 40);

            assertNear(spheres[0].velocity.x, -1, 1e-9, 'Left sphere velocity mismatch');
            assertNear(spheres[1].velocity.x, 1, 1e-9, 'Right sphere velocity mismatch');
        }
    },
    {
        name: 'unequal masses follow elastic 1D collision equations',
        run() {
            const startDist = DIAMETER + (0.5 * COLLISION_SEPARATION_EPSILON);
            const spheres = [
                makeSphere(0, 1, { mass: 1.0, restitution: 1.0 }),
                makeSphere(startDist, 0, { mass: 2.0, restitution: 1.0 })
            ];

            resolveSphereCollisions1D(spheres, true);
            const expected = expected1DCollision(1.0, 2.0, 1, 0, 1);

            assertNear(spheres[0].velocity.x, expected.v1, 1e-9, 'Sphere 1 velocity mismatch');
            assertNear(spheres[1].velocity.x, expected.v2, 1e-9, 'Sphere 2 velocity mismatch');
        }
    },
    {
        name: 'pair restitution uses lower sphere restitution value',
        run() {
            const startDist = DIAMETER + (0.5 * COLLISION_SEPARATION_EPSILON);
            const spheres = [
                makeSphere(0, 1, { mass: 1.0, restitution: 0.2 }),
                makeSphere(startDist, 0, { mass: 1.0, restitution: 0.8 })
            ];

            resolveSphereCollisions1D(spheres, true);
            const expected = expected1DCollision(1.0, 1.0, 1, 0, 0.2);

            assertNear(spheres[0].velocity.x, expected.v1, 1e-9, 'Sphere 1 velocity mismatch');
            assertNear(spheres[1].velocity.x, expected.v2, 1e-9, 'Sphere 2 velocity mismatch');
        }
    },
    {
        name: 'three-ball chain transfers momentum to the last sphere',
        run() {
            const spheres = [
                makeSphere(-0.74, 1),
                makeSphere(-0.34, 0),
                makeSphere(0.06, 0)
            ];

            runFrames(spheres, 140);

            assertNear(spheres[0].velocity.x, 0, 1e-8, 'First sphere should stop');
            assertNear(spheres[1].velocity.x, 0, 1e-8, 'Middle sphere should stop');
            assertNear(spheres[2].velocity.x, 1, 1e-8, 'Last sphere should carry momentum');
        }
    }
];

function main() {
    let passed = 0;
    for (const test of tests) {
        const before = test.run;
        if (typeof before !== 'function') {
            throw new Error(`Invalid test definition: ${test.name}`);
        }
        test.run();
        passed += 1;
        console.log(`PASS: ${test.name}`);
    }
    console.log(`All ${passed} collision regression tests passed.`);
}

try {
    main();
} catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exit(1);
}
