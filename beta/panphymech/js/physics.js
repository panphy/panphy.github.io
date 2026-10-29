// PanPhyMech: the live simulation. Builds a Planck.js (Box2D) world from the scene,
// adds Hooke's-law springs and quadratic air resistance as explicit forces, and
// reports positions, velocities, forces and energies in SI units.
(function (root) {
  const PPM = root.PPM = root.PPM || {};
  const S = PPM.scene;

  const BASE_STEP = 1 / 240; // seconds of simulated time per step, before stiff springs shorten it
  const MIN_STEP = 1 / 5000;
  const VELOCITY_ITERATIONS = 12;
  const POSITION_ITERATIONS = 5;

  function createSim(scene) {
    const pl = root.planck;
    // Collisions slower than this are treated as perfectly inelastic, so resting contacts stay quiet.
    pl.Settings.velocityThreshold = 0.25;
    const world = new pl.World({ gravity: pl.Vec2(0, -scene.world.gravity), allowSleep: false });
    const ground = world.createBody();
    let floorFixture = null;
    if (scene.world.floor) {
      // A thick floor rather than an edge, so fast objects cannot slip through it.
      floorFixture = ground.createFixture(new pl.Box(2000, 10, pl.Vec2(0, -10), 0), { friction: scene.world.floorFriction, restitution: 0 });
    }

    const bodies = new Map(); // scene id → planck body
    const joints = new Map(); // link id → planck joint

    function fixtureFor(pb, b) {
      const density = b.mass / Math.max(S.area(b), 1e-9);
      const opts = { density, friction: b.friction, restitution: b.restitution };
      if (b.kind === 'ball') return pb.createFixture(new pl.Circle(b.r), opts);
      // A custom shape is one rigid body made of its convex pieces.
      if (b.kind === 'custom') {
        PPM.shapes.decompose(b.paths).pieces.forEach((piece) => pb.createFixture(new pl.Polygon(piece.map(([x, y]) => pl.Vec2(x, y))), opts));
        return pb.getFixtureList();
      }
      return pb.createFixture(new pl.Polygon(S.vertices(b).map((p) => pl.Vec2(p.x, p.y))), opts);
    }

    scene.bodies.forEach((b) => {
      const pb = world.createBody({
        type: b.fixed ? 'static' : 'dynamic',
        position: pl.Vec2(b.x, b.y),
        angle: b.angle,
        fixedRotation: !!b.lockRotation,
        bullet: !b.fixed && b.kind === 'ball',
        linearVelocity: b.fixed ? pl.Vec2(0, 0) : pl.Vec2(b.vx, b.vy),
        angularVelocity: b.fixed || b.lockRotation ? 0 : b.omega
      });
      fixtureFor(pb, b);
      pb.setUserData(b.id);
      bodies.set(b.id, pb);
    });

    const bodyFor = (id) => (id ? bodies.get(id) : ground);
    const isStatic = (pb) => !pb || pb === ground || pb.isStatic();

    // Solid rods and ropes: real bodies with mass that other objects collide with.
    const solids = new Map(); // link id → { segs, seg, endJoint }
    let solidGroup = 0;
    function pathPoints(pa, pb, L, n) {
      // n + 1 points along the connector: straight when taut, else a sagging parabola.
      const d = Math.hypot(pb.x - pa.x, pb.y - pa.y);
      const sag = d >= L * 0.999 ? 0 : Math.min(L / 2, Math.sqrt((3 * Math.max(d, 1e-6) * (L - d)) / 8) * (d < 0.2 * L ? 2 : 1));
      const dir = d >= L * 0.999 && d > 1e-9 ? { x: (pb.x - pa.x) / d, y: (pb.y - pa.y) / d } : null;
      if (dir) return Array.from({ length: n + 1 }, (_, i) => ({ x: pa.x + dir.x * (L * i) / n, y: pa.y + dir.y * (L * i) / n }));
      const curve = (t) => ({ x: pa.x + (pb.x - pa.x) * t, y: pa.y + (pb.y - pa.y) * t - 4 * sag * t * (1 - t) });
      const M = 400;
      const pts = [curve(0)];
      const acc = [0];
      for (let i = 1; i <= M; i++) { const q = curve(i / M); acc.push(acc[i - 1] + Math.hypot(q.x - pts[i - 1].x, q.y - pts[i - 1].y)); pts.push(q); }
      const total = acc[M];
      return Array.from({ length: n + 1 }, (_, i) => {
        const target = (total * i) / n;
        let k = 1;
        while (k < M && acc[k] < target) k++;
        const f = (target - acc[k - 1]) / (acc[k] - acc[k - 1] || 1);
        return { x: pts[k - 1].x + (pts[k].x - pts[k - 1].x) * f, y: pts[k - 1].y + (pts[k].y - pts[k - 1].y) * f };
      });
    }
    function buildSolid(l, A, B) {
      const pa = anchorWorld(l.a, l.la);
      const pb = anchorWorld(l.b, l.lb);
      const rope = l.kind === 'rope';
      const n = rope ? Math.max(3, Math.min(80, Math.round(l.length / 0.12))) : 1;
      const seg = l.length / n;
      const th = rope ? 0.03 : 0.06;
      const mass = l.mass > 0 ? l.mass : S.defaultSolidMass(l);
      const pts = rope ? pathPoints(pa, pb, l.length, n) : (() => {
        const d = Math.hypot(pb.x - pa.x, pb.y - pa.y) || 1;
        return [pa, { x: pa.x + ((pb.x - pa.x) / d) * l.length, y: pa.y + ((pb.y - pa.y) / d) * l.length }];
      })();
      solidGroup -= 1;
      const segs = [];
      for (let i = 0; i < n; i++) {
        const p = pts[i];
        const q = pts[i + 1];
        const body = world.createBody({ type: 'dynamic', position: pl.Vec2((p.x + q.x) / 2, (p.y + q.y) / 2), angle: Math.atan2(q.y - p.y, q.x - p.x) });
        body.createFixture(new pl.Box(seg / 2, th / 2), { density: mass / n / (seg * th), friction: 0.4, restitution: 0.1, filterGroupIndex: solidGroup });
        segs.push(body);
      }
      const hinge = (X, Y, local) => world.createJoint(new pl.RevoluteJoint({ localAnchorA: pl.Vec2(local.ax, local.ay), localAnchorB: pl.Vec2(local.bx, local.by) }, X, Y));
      const endJoint = hinge(A, segs[0], { ax: l.la.x, ay: l.la.y, bx: -seg / 2, by: 0 });
      const endJoints = [endJoint]; // every joint pulling on end a, to read the tension there
      for (let i = 0; i < n - 1; i++) hinge(segs[i], segs[i + 1], { ax: seg / 2, ay: 0, bx: -seg / 2, by: 0 });
      hinge(segs[n - 1], B, { ax: seg / 2, ay: 0, bx: l.lb.x, by: l.lb.y });
      // A chain of light links stretches under a heavy load. Each joint is therefore also kept
      // no farther from either end than the rope's length between them (and the ends within
      // the whole length), which holds the rope to its length without making it stiff.
      if (rope) {
        const limit = (X, ax, ay, Y, bx, by, max) => world.createJoint(new pl.RopeJoint({ localAnchorA: pl.Vec2(ax, ay), localAnchorB: pl.Vec2(bx, by), maxLength: max }, X, Y));
        endJoints.push(limit(A, l.la.x, l.la.y, B, l.lb.x, l.lb.y, l.length));
        for (let i = 1; i < n; i++) {
          endJoints.push(limit(A, l.la.x, l.la.y, segs[i], -seg / 2, 0, i * seg));
          limit(B, l.lb.x, l.lb.y, segs[i - 1], seg / 2, 0, (n - i) * seg);
        }
      }
      solids.set(l.id, { segs, seg, endJoint, endJoints });
    }

    scene.links.forEach((l) => {
      const A = bodyFor(l.a);
      const B = bodyFor(l.b);
      if (!A || !B) return;
      // A solid rod or rope matters even between two fixed things: objects land on it.
      if ((l.kind === 'rod' || l.kind === 'rope') && l.solid) { buildSolid(l, A, B); return; }
      if (isStatic(A) && isStatic(B)) return;
      let joint = null;
      // A link end on the world stores a world point, which is also the ground's local point.
      if (l.kind === 'rod') {
        joint = new pl.DistanceJoint({ localAnchorA: pl.Vec2(l.la.x, l.la.y), localAnchorB: pl.Vec2(l.lb.x, l.lb.y), length: l.length, frequencyHz: 0, dampingRatio: 0 }, A, B);
      } else if (l.kind === 'rope') {
        joint = new pl.RopeJoint({ localAnchorA: pl.Vec2(l.la.x, l.la.y), localAnchorB: pl.Vec2(l.lb.x, l.lb.y), maxLength: l.length }, A, B);
      } else if (l.kind === 'hinge' || l.kind === 'weld') {
        // The joint point is where link end a sits; bodyA is the base (b), bodyB the part on top (a),
        // so a positive motor speed turns part a counterclockwise relative to its base.
        const p = S.endPoint(scene, l.a, l.la);
        if (l.kind === 'hinge') {
          joint = new pl.RevoluteJoint({ enableMotor: !!l.motor, motorSpeed: l.speed || 0, maxMotorTorque: l.torque || 0 }, B, A, pl.Vec2(p.x, p.y));
        } else {
          joint = new pl.WeldJoint({ frequencyHz: 0, dampingRatio: 0 }, B, A, pl.Vec2(p.x, p.y));
        }
      }
      if (joint) joints.set(l.id, world.createJoint(joint));
    });

    const sim = {
      world, ground, bodies, joints, scene,
      t: 0,
      acc: 0,
      h: BASE_STEP,
      lastH: BASE_STEP,
      grabJoint: null,
      floorFixture
    };

    // The step is short enough to keep the stiffest spring accurate: ω·h ≤ 0.05.
    function chooseStep() {
      // Solid connectors are chains of joints, which hold together better with finer steps.
      let h = solids.size ? BASE_STEP / 2 : BASE_STEP;
      scene.links.forEach((l) => {
        if (l.kind !== 'spring') return;
        const inv = invMass(l.a) + invMass(l.b);
        if (inv <= 0) return;
        const omega = Math.sqrt(l.k * inv);
        h = Math.min(h, 0.05 / omega);
        if (l.damping > 0) h = Math.min(h, 0.5 / (l.damping * inv));
      });
      sim.h = Math.max(MIN_STEP, h);
    }
    function invMass(id) {
      if (!id) return 0;
      const pb = bodies.get(id);
      return pb && !pb.isStatic() && pb.getMass() > 0 ? 1 / pb.getMass() : 0;
    }
    sim.chooseStep = chooseStep;
    chooseStep();

    function anchorWorld(id, local) {
      const pb = bodyFor(id);
      if (!pb || pb === ground) return pl.Vec2(local.x, local.y);
      return pb.getWorldPoint(pl.Vec2(local.x, local.y));
    }
    function pointVelocity(id, p) {
      const pb = bodyFor(id);
      if (!pb || pb === ground) return pl.Vec2(0, 0);
      return pb.getLinearVelocityFromWorldPoint(p);
    }

    function springState(l) {
      const pa = anchorWorld(l.a, l.la);
      const pb = anchorWorld(l.b, l.lb);
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const L = Math.hypot(dx, dy);
      const ux = L > 1e-9 ? dx / L : 0;
      const uy = L > 1e-9 ? dy / L : 1;
      const va = pointVelocity(l.a, pa);
      const vb = pointVelocity(l.b, pb);
      const rate = (vb.x - va.x) * ux + (vb.y - va.y) * uy;
      const ext = L - l.rest;
      return { pa, pb, L, ux, uy, rate, ext, tension: l.k * ext + l.damping * rate };
    }

    function applyForces() {
      scene.links.forEach((l) => {
        if (l.kind !== 'spring') return;
        const s = springState(l);
        const fx = s.tension * s.ux;
        const fy = s.tension * s.uy;
        const A = bodyFor(l.a);
        const B = bodyFor(l.b);
        if (A && A !== ground && !A.isStatic()) A.applyForce(pl.Vec2(fx, fy), s.pa, true);
        if (B && B !== ground && !B.isStatic()) B.applyForce(pl.Vec2(-fx, -fy), s.pb, true);
      });
      scene.bodies.forEach((b) => {
        if (b.fixed || !(b.drag > 0)) return;
        const pb = bodies.get(b.id);
        if (!pb) return;
        const v = pb.getLinearVelocity();
        const speed = Math.hypot(v.x, v.y);
        if (speed < 1e-9) return;
        // F = k v², opposite to the velocity, limited so one step can never reverse the motion.
        let f = b.drag * speed * speed;
        const limit = (0.9 * pb.getMass() * speed) / sim.h;
        if (f > limit) f = limit;
        pb.applyForceToCenter(pl.Vec2((-f * v.x) / speed, (-f * v.y) / speed), true);
      });
    }

    sim.step = function step() {
      const h = sim.h;
      applyForces();
      // Chains of rope links need more solver passes to stay together under load.
      world.step(h, solids.size ? 24 : VELOCITY_ITERATIONS, solids.size ? 8 : POSITION_ITERATIONS);
      sim.lastH = h;
      sim.t += h;
    };

    // Advance by dt seconds of simulated time in whole steps; returns false if it ran out of budget.
    sim.advance = function advance(dt, onStep, maxSteps = 2000) {
      sim.acc += dt;
      let n = 0;
      while (sim.acc >= sim.h * 0.999 && n < maxSteps) {
        sim.step();
        sim.acc -= sim.lastH;
        n++;
        if (onStep) onStep(sim);
      }
      if (n >= maxSteps) { sim.acc = 0; return false; }
      return true;
    };

    // ---------- Readings ----------

    sim.pose = function pose(id) {
      const pb = bodies.get(id);
      if (!pb) return null;
      const p = pb.getPosition();
      return { x: p.x, y: p.y, angle: pb.getAngle() };
    };

    sim.readBody = function readBody(id) {
      const pb = bodies.get(id);
      const b = S.bodyById(scene, id);
      if (!pb || !b) return null;
      const c = pb.getWorldCenter();
      const g = scene.world.gravity;
      const h = c.y - (scene.world.gpeZero || 0); // height above the zero of gravitational energy
      if (pb.isStatic()) {
        return { x: c.x, y: c.y, angle: pb.getAngle(), vx: 0, vy: 0, speed: 0, omega: 0, KE: 0, KEt: 0, KEr: 0, GPE: b.mass * g * h, px: 0, py: 0, fixed: true };
      }
      const v = pb.getLinearVelocity();
      const w = pb.getAngularVelocity();
      const m = pb.getMass();
      const lc = pb.getLocalCenter();
      const I = pb.getInertia() - m * (lc.x * lc.x + lc.y * lc.y);
      const KEt = 0.5 * m * (v.x * v.x + v.y * v.y);
      const KEr = 0.5 * I * w * w;
      return {
        x: c.x, y: c.y, angle: pb.getAngle(), vx: v.x, vy: v.y, speed: Math.hypot(v.x, v.y), omega: w,
        KE: KEt + KEr, KEt, KEr, GPE: m * g * h, px: m * v.x, py: m * v.y, fixed: false
      };
    };

    sim.readLink = function readLink(id) {
      const l = S.linkById(scene, id);
      if (!l) return null;
      if (l.kind === 'spring') {
        const s = springState(l);
        return { length: s.L, extension: s.ext, tension: s.tension, EPE: 0.5 * l.k * s.ext * s.ext, pa: s.pa, pb: s.pb };
      }
      const solid = solids.get(id);
      const j = solid ? solid.endJoint : joints.get(id);
      const pa = anchorWorld(l.a, l.la);
      const pb = anchorWorld(l.b, l.lb);
      const out = { length: Math.hypot(pb.x - pa.x, pb.y - pa.y), pa, pb, force: 0 };
      // Joint forces exist only once the solver has run.
      if (j && sim.t > 0) {
        try {
          // A solid connector's tension is the pull of all its joints at end a.
          let fx = 0; let fy = 0;
          (solid ? solid.endJoints : [j]).forEach((jj) => { const f = jj.getReactionForce(1 / sim.lastH); fx += f.x; fy += f.y; });
          out.force = Math.hypot(fx, fy);
          if (l.kind === 'hinge') {
            out.torque = l.motor ? j.getMotorTorque(1 / sim.lastH) : 0;
            out.rate = j.getJointSpeed();
          }
        } catch (e) {
          out.force = 0;
        }
      } else if (l.kind === 'hinge') {
        out.torque = 0;
        out.rate = 0;
      }
      return out;
    };

    // Energies of the moving parts. Fixed objects never move, so they add nothing that changes.
    // Kinetic and gravitational energy of solid rods and ropes (their own bodies).
    sim.connectorEnergy = function connectorEnergy() {
      let KE = 0; let GPE = 0;
      const g = scene.world.gravity;
      solids.forEach(({ segs }) => segs.forEach((pb) => {
        const v = pb.getLinearVelocity();
        const w = pb.getAngularVelocity();
        const m = pb.getMass();
        const lc = pb.getLocalCenter();
        KE += 0.5 * m * (v.x * v.x + v.y * v.y) + 0.5 * (pb.getInertia() - m * (lc.x * lc.x + lc.y * lc.y)) * w * w;
        GPE += m * g * (pb.getWorldCenter().y - (scene.world.gpeZero || 0));
      }));
      return { KE, GPE };
    };

    // Points along a solid rod or rope as simulated: its joints, end to end.
    sim.solidPoints = function solidPoints(id) {
      const s = solids.get(id);
      if (!s) return null;
      const pts = s.segs.map((pb) => pb.getWorldPoint(pl.Vec2(-s.seg / 2, 0)));
      pts.push(s.segs[s.segs.length - 1].getWorldPoint(pl.Vec2(s.seg / 2, 0)));
      return pts.map((p) => ({ x: p.x, y: p.y }));
    };

    sim.totals = function totals() {
      const extra = sim.connectorEnergy();
      let KE = extra.KE; let GPE = extra.GPE; let EPE = 0;
      scene.bodies.forEach((b) => {
        if (b.fixed) return;
        const r = sim.readBody(b.id);
        if (r) { KE += r.KE; GPE += r.GPE; }
      });
      scene.links.forEach((l) => {
        if (l.kind !== 'spring') return;
        const r = sim.readLink(l.id);
        if (r) EPE += r.EPE;
      });
      return { KE, GPE, EPE, E: KE + GPE + EPE };
    };

    // Elastic energy stored in the springs attached to one object.
    sim.attachedEPE = function attachedEPE(id) {
      let EPE = 0;
      scene.links.forEach((l) => {
        if (l.kind === 'spring' && (l.a === id || l.b === id)) EPE += sim.readLink(l.id).EPE;
      });
      return EPE;
    };

    // The current state of every object, to become the new starting setup.
    sim.capture = function capture() {
      const out = {};
      bodies.forEach((pb, id) => {
        const p = pb.getPosition();
        const v = pb.getLinearVelocity();
        out[id] = { x: p.x, y: p.y, angle: pb.getAngle(), vx: v.x, vy: v.y, omega: pb.getAngularVelocity() };
      });
      return out;
    };

    // ---------- Live edits that keep the run going ----------

    sim.setGravity = function setGravity(g) {
      world.setGravity(pl.Vec2(0, -g));
    };

    sim.setFloorFriction = function setFloorFriction(mu) {
      if (floorFixture) floorFixture.setFriction(mu);
      refreshContacts();
    };

    sim.updateBody = function updateBody(b) {
      const pb = bodies.get(b.id);
      if (!pb) return;
      for (let f = pb.getFixtureList(); f; f = f.getNext()) {
        f.setFriction(b.friction);
        f.setRestitution(b.restitution);
        if (!b.fixed) f.setDensity(b.mass / Math.max(S.area(b), 1e-9));
      }
      if (!b.fixed) pb.resetMassData();
      refreshContacts();
      chooseStep();
    };

    sim.updateLink = function updateLink(l) {
      const j = joints.get(l.id);
      if (j && l.kind === 'hinge') {
        j.enableMotor(!!l.motor);
        j.setMotorSpeed(l.speed || 0);
        j.setMaxMotorTorque(l.torque || 0);
        j.getBodyA().setAwake(true);
        j.getBodyB().setAwake(true);
      }
      if (j && l.kind === 'rod') j.setLength(l.length);
      if (j && l.kind === 'rope') j.setMaxLength(l.length);
      chooseStep();
    };

    // Apply every parameter that can change during a run (masses, surfaces, springs, motors, g).
    sim.syncParams = function syncParams() {
      sim.setGravity(scene.world.gravity);
      sim.setFloorFriction(scene.world.floorFriction);
      scene.bodies.forEach((b) => sim.updateBody(b));
      scene.links.forEach((l) => sim.updateLink(l));
    };

    // Contacts keep the friction and restitution they started with; reset them after an edit.
    function refreshContacts() {
      for (let c = world.getContactList(); c; c = c.getNext()) {
        c.resetFriction();
        c.resetRestitution();
      }
    }

    // ---------- Grabbing a moving object with the pointer ----------

    sim.grab = function grab(id, point) {
      sim.release();
      const pb = bodies.get(id);
      if (!pb || pb.isStatic()) return false;
      const m = Math.max(pb.getMass(), 0.01);
      const joint = new pl.MouseJoint({ maxForce: 60 * m * Math.max(scene.world.gravity, 9.81), frequencyHz: 4, dampingRatio: 0.8 }, ground, pb, pl.Vec2(point.x, point.y));
      sim.grabJoint = world.createJoint(joint);
      pb.setAwake(true);
      return true;
    };
    sim.moveGrab = function moveGrab(point) {
      if (sim.grabJoint) sim.grabJoint.setTarget(pl.Vec2(point.x, point.y));
    };
    sim.grabTarget = function grabTarget() {
      if (!sim.grabJoint) return null;
      return { target: sim.grabJoint.getTarget(), anchor: sim.grabJoint.getAnchorB() };
    };
    sim.release = function release() {
      if (sim.grabJoint) {
        world.destroyJoint(sim.grabJoint);
        sim.grabJoint = null;
      }
    };

    return sim;
  }

  PPM.physics = { createSim, BASE_STEP };
})(typeof window !== 'undefined' ? window : globalThis);
