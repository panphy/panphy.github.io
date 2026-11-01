// PanPhyMech: the live simulation. Builds a Planck.js (Box2D) world from the scene,
// adds Hooke's-law springs and one effective drag model per object, and
// reports positions, velocities, forces and energies in SI units.
(function (root) {
  const PPM = root.PPM = root.PPM || {};
  const S = PPM.scene;

  const BASE_STEP = 1 / 240; // the Standard accuracy step, before stiff springs shorten it
  const MIN_STEP = 1 / 5000;
  const VELOCITY_ITERATIONS = 12;
  const POSITION_ITERATIONS = 5;

  function createSim(scene) {
    const pl = root.planck;
    // Collisions slower than this are treated as perfectly inelastic. The restitution
    // correction below keeps resting contacts quiet, so this only stops creeping contacts chattering.
    pl.Settings.velocityThreshold = 0.01;
    // Box2D collides polygons with a skin of polygonRadius round them. Contacts rest
    // anywhere from where the skins meet to linearSlop into each other, and are only pushed
    // apart beyond that. Insetting each side by the skin less a quarter of the slop centers
    // that band on the drawn outlines: objects rest flush as drawn, and an object placed
    // touching another stays put instead of jumping.
    const INSET = pl.Settings.polygonRadius - pl.Settings.linearSlop / 4;
    // Move every side of a ring of points by d into the material: into the ring for an
    // outline, out of it for a hole. Null if that would fold or collapse any side.
    function insetRing(pts, d, materialInside = true) {
      const n = pts.length;
      if (n < 3) return null;
      let area2 = 0;
      for (let i = 0; i < n; i++) { const a = pts[i], c = pts[(i + 1) % n]; area2 += a.x * c.y - c.x * a.y; }
      if (Math.abs(area2) < 1e-12) return null;
      // Counterclockwise rings have their inside to the left of each side.
      const sign = (area2 > 0 ? 1 : -1) * (materialInside ? 1 : -1);
      const lines = pts.map((a, i) => {
        const c = pts[(i + 1) % n];
        const len = Math.hypot(c.x - a.x, c.y - a.y);
        if (len < 1e-12) return null;
        const nx = (-(c.y - a.y) / len) * sign, ny = ((c.x - a.x) / len) * sign;
        return { p: { x: a.x + nx * d, y: a.y + ny * d }, dx: c.x - a.x, dy: c.y - a.y };
      });
      if (lines.some((l) => !l)) return null;
      const out = [];
      for (let i = 0; i < n; i++) {
        const L1 = lines[(i + n - 1) % n], L2 = lines[i];
        const den = L1.dx * L2.dy - L1.dy * L2.dx;
        // A straight run through a vertex: the vertex just moves with both sides.
        if (Math.abs(den) < 1e-12 * Math.hypot(L1.dx, L1.dy) * Math.hypot(L2.dx, L2.dy)) { out.push({ ...L2.p }); continue; }
        const t = ((L2.p.x - L1.p.x) * L2.dy - (L2.p.y - L1.p.y) * L2.dx) / den;
        out.push({ x: L1.p.x + L1.dx * t, y: L1.p.y + L1.dy * t });
      }
      // Each side must keep its direction and a length Box2D can tell apart.
      for (let i = 0; i < n; i++) {
        const a = out[i], c = out[(i + 1) % n];
        const ex = c.x - a.x, ey = c.y - a.y;
        if (ex * lines[i].dx + ey * lines[i].dy <= 0 || Math.hypot(ex, ey) < pl.Settings.linearSlop) return null;
      }
      return out;
    }

    const world = new pl.World({ gravity: pl.Vec2(0, -scene.world.gravity), allowSleep: false });
    // Box2D adds this step's gravity to the velocities before it applies restitution, so a
    // bounce reflects an approach speed that is too large by g·h and every bounce gains height.
    // Scale each contact's restitution so it reflects the approach speed before that gravity.
    // Resting contacts, which approach only through gravity, then get no bounce at all.
    world.on('pre-solve', (contact) => {
      contact.resetRestitution();
      const e = contact.getRestitution();
      if (!(e > 0)) return;
      const A = contact.getFixtureA().getBody();
      const B = contact.getFixtureB().getBody();
      const wm = contact.getWorldManifold(null);
      const count = contact.getManifold().pointCount;
      if (!wm || !count) return;
      const n = wm.normal;
      let vn = 0;
      for (let i = 0; i < count; i++) {
        const p = wm.points[i];
        const va = A.getLinearVelocityFromWorldPoint(p);
        const vb = B.getLinearVelocityFromWorldPoint(p);
        vn += ((vb.x - va.x) * n.x + (vb.y - va.y) * n.y) / count;
      }
      if (vn >= 0) { contact.setRestitution(0); return; }
      const g = world.getGravity();
      const ga = A.isDynamic() ? A.getGravityScale() : 0;
      const gb = B.isDynamic() ? B.getGravityScale() : 0;
      const vnAfter = vn + sim.h * ((gb - ga) * (g.x * n.x + g.y * n.y));
      if (vnAfter >= 0) return;
      contact.setRestitution(Math.min(1, e * vn / vnAfter));
    });
    const ground = world.createBody();
    let floorFixture = null;
    if (scene.world.floor) {
      // A thick floor rather than an edge, so fast objects cannot slip through it.
      // The floor has a body of its own. Connectors fixed to the background join objects to
      // the ground body, and Box2D stops joined bodies colliding, so a floor on the ground
      // body would let anything hung from the background (or grabbed) fall through it.
      // Its top sits inset below y = 0 like every object, so objects rest on the drawn floor.
      floorFixture = world.createBody().createFixture(new pl.Box(2000, 10, pl.Vec2(0, -10 - INSET), 0), { friction: scene.world.floorFriction, restitution: 0 });
    }

    const bodies = new Map(); // scene id → planck body
    const joints = new Map(); // link id → planck joint

    // An object's convex pieces as drawn, in body coordinates.
    function polygonPieces(b) {
      if (b.kind === 'custom') return PPM.shapes.decompose(b.paths).pieces.map((piece) => piece.map(([x, y]) => ({ x, y })));
      return [S.vertices(b)];
    }

    // The convex pieces it collides with: its outline inset by INSET (less for very thin
    // shapes), then split. Insetting the whole outline before splitting a merged or cut
    // shape keeps its surface smooth across the seams between pieces.
    function collisionPieces(b) {
      for (const d of [INSET, INSET * 0.75, INSET / 2, INSET / 4]) {
        if (b.kind !== 'custom') {
          const ring = insetRing(S.vertices(b), d);
          if (ring) return [ring];
          continue;
        }
        const rings = b.paths.map((poly) => poly.map((ring, k) => insetRing(ring.map(([x, y]) => ({ x, y })), d, k === 0)));
        if (rings.some((poly) => poly.some((ring) => !ring))) continue;
        try {
          const pieces = PPM.shapes.decompose(rings.map((poly) => poly.map((ring) => ring.map((p) => [p.x, p.y])))).pieces;
          if (pieces.length && pieces.every((piece) => piece.length >= 3)) return pieces.map((piece) => piece.map(([x, y]) => ({ x, y })));
        } catch (err) { /* try a smaller inset */ }
      }
      return polygonPieces(b);
    }

    // A Planck polygon for one convex piece, or null for a sliver Planck cannot build:
    // it welds corners closer than linearSlop / 2 and swaps a piece left with fewer
    // than three for a 2 m box. Cut outlines can leave such slivers along an edge.
    function planckPolygon(piece) {
      let area = 0;
      piece.forEach((p, i) => { const q = piece[(i + 1) % piece.length]; area += (p.x * q.y - q.x * p.y) / 2; });
      const shape = new pl.Polygon(piece.map((p) => pl.Vec2(p.x, p.y)));
      const md = { mass: 0, center: pl.Vec2(0, 0), I: 0 };
      shape.computeMass(md, 1);
      return Math.abs(md.mass - Math.abs(area)) <= 0.01 * Math.abs(area) + 1e-9 ? shape : null;
    }

    function fixtureFor(pb, b) {
      const density = b.mass / Math.max(S.area(b), 1e-9);
      const opts = { density, friction: b.friction, restitution: b.restitution };
      if (b.kind === 'ball') return pb.createFixture(new pl.Circle(b.r), opts);
      // A custom shape is one rigid body made of its convex pieces. They collide slightly
      // inset, so that with Box2D's skin the object rests exactly on its drawn outline.
      collisionPieces(b).map(planckPolygon).filter(Boolean).forEach((shape) => pb.createFixture(shape, opts));
      setTrueMass(pb, b);
      return pb.getFixtureList();
    }

    // Mass, center and rotational inertia of the shape as drawn, not of the inset pieces.
    function setTrueMass(pb, b) {
      if (b.fixed || b.kind === 'ball') return;
      const pieces = polygonPieces(b).map(planckPolygon).filter(Boolean);
      const density = b.mass / Math.max(S.area(b), 1e-9);
      let mass = 0, cx = 0, cy = 0, I = 0;
      pieces.forEach((shape) => {
        const md = { mass: 0, center: pl.Vec2(0, 0), I: 0 };
        shape.computeMass(md, density);
        mass += md.mass; cx += md.mass * md.center.x; cy += md.mass * md.center.y; I += md.I;
      });
      if (!(mass > 0)) return;
      pb.setMassData({ mass, center: pl.Vec2(cx / mass, cy / mass), I });
    }

    // Planck integrates linear damping implicitly: v /= 1 + h*c/m. This
    // implements linear drag without reversing velocity at high damping/low mass.
    function setViscousDamping(pb, radius, b = null, share = 1) {
      const c = S.dragCoefficients(scene, b, radius).linear / share;
      pb.setLinearDamping(pb.isStatic() ? 0 : c / pb.getMass());
    }
    const dragRadius = (b) => b.kind === 'ball' ? b.r : Math.sqrt(S.area(b) / Math.PI);

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
      setViscousDamping(pb, dragRadius(b), b);
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
        // Share one connector's total drag across its segments, so changing the
        // rope discretization does not change the total resistance.
        setViscousDamping(body, Math.sqrt(l.length * th / Math.PI), null, n);
        segs.push(body);
      }
      const hinge = (X, Y, local) => world.createJoint(new pl.RevoluteJoint({ localAnchorA: pl.Vec2(local.ax, local.ay), localAnchorB: pl.Vec2(local.bx, local.by) }, X, Y));
      const endJoint = hinge(A, segs[0], { ax: l.la.x, ay: l.la.y, bx: -seg / 2, by: 0 });
      const endJoints = [endJoint]; // every joint pulling on end a, to read the tension there
      for (let i = 0; i < n - 1; i++) hinge(segs[i], segs[i + 1], { ax: seg / 2, ay: 0, bx: -seg / 2, by: 0 });
      // Every joint pulling on end b, with the sign that gives the force on b.
      const endJointsB = [{ j: hinge(segs[n - 1], B, { ax: seg / 2, ay: 0, bx: l.lb.x, by: l.lb.y }), sign: 1 }];
      // A chain of light links stretches under a heavy load. Each joint is therefore also kept
      // no farther from either end than the rope's length between them (and the ends within
      // the whole length), which holds the rope to its length without making it stiff.
      if (rope) {
        const limit = (X, ax, ay, Y, bx, by, max, collide = false) => world.createJoint(new pl.RopeJoint({ localAnchorA: pl.Vec2(ax, ay), localAnchorB: pl.Vec2(bx, by), maxLength: max, collideConnected: collide }, X, Y));
        // The end objects still collide with each other, as they would on a real rope.
        const ends = limit(A, l.la.x, l.la.y, B, l.lb.x, l.lb.y, l.length, true);
        endJoints.push(ends);
        endJointsB.push({ j: ends, sign: 1 });
        for (let i = 1; i < n; i++) {
          endJoints.push(limit(A, l.la.x, l.la.y, segs[i], -seg / 2, 0, i * seg));
          endJointsB.push({ j: limit(B, l.lb.x, l.lb.y, segs[i - 1], seg / 2, 0, (n - i) * seg), sign: -1 });
        }
      }
      solids.set(l.id, { segs, seg, endJoint, endJoints, endJointsB });
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
      // Objects joined by a rod or rope still collide; only hinges and glue let parts overlap.
      if (l.kind === 'rod') {
        joint = new pl.DistanceJoint({ localAnchorA: pl.Vec2(l.la.x, l.la.y), localAnchorB: pl.Vec2(l.lb.x, l.lb.y), length: l.length, frequencyHz: 0, dampingRatio: 0, collideConnected: true }, A, B);
      } else if (l.kind === 'rope') {
        joint = new pl.RopeJoint({ localAnchorA: pl.Vec2(l.la.x, l.la.y), localAnchorB: pl.Vec2(l.lb.x, l.lb.y), maxLength: l.length, collideConnected: true }, A, B);
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

    // The World accuracy sets the longest step; it is then short enough to keep the stiffest
    // spring accurate: ω·h ≤ 0.05.
    function chooseStep() {
      const base = S.ACCURACY[S.worldAccuracy(scene)].step;
      // Solid connectors are chains of joints, which hold together better with finer steps.
      let h = solids.size ? base / 2 : base;
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
        if (b.fixed) return;
        applyQuadraticDrag(bodies.get(b.id), S.dragCoefficients(scene, b).quadratic);
      });
      scene.links.forEach((l) => {
        const solid = solids.get(l.id);
        if (!solid) return;
        const k = S.dragCoefficients(scene, null).quadratic / solid.segs.length;
        solid.segs.forEach((pb) => applyQuadraticDrag(pb, k));
      });
    }

    function applyQuadraticDrag(pb, k) {
      if (!pb || !(k > 0)) return;
      const v = pb.getLinearVelocity();
      const speed = Math.hypot(v.x, v.y);
      if (speed < 1e-9) return;
      const f = Math.min(k * speed * speed, 0.9 * pb.getMass() * speed / sim.h);
      pb.applyForceToCenter(pl.Vec2(-f * v.x / speed, -f * v.y / speed), true);
      quadDrag.set(pb, { x: -f * v.x / speed, y: -f * v.y / speed });
    }

    // ---------- Forces on each object, for force arrows ----------

    // Contact forces of the latest step: normal reaction and friction on body B of each contact
    // (body A feels the opposite), at the middle of its contact points.
    const contactForces = new Map();
    const quadDrag = new Map(); // planck body → quadratic drag force of the latest step
    world.on('post-solve', (contact, impulse) => {
      const count = contact.getManifold().pointCount;
      const wm = contact.getWorldManifold(null);
      if (!count || !wm || !(sim.lastStep > 0)) return;
      let px = 0, py = 0, jn = 0, jt = 0;
      for (let i = 0; i < count; i++) {
        px += wm.points[i].x / count; py += wm.points[i].y / count;
        jn += impulse.normalImpulses[i]; jt += impulse.tangentImpulses[i];
      }
      const n = wm.normal; const inv = 1 / sim.lastStep;
      contactForces.set(contact, {
        A: contact.getFixtureA().getBody(), B: contact.getFixtureB().getBody(), x: px, y: py,
        nx: n.x * jn * inv, ny: n.y * jn * inv, tx: n.y * jt * inv, ty: -n.x * jt * inv
      });
    });

    // Ideal rods and ropes. Each step moves their ends along straight lines, so a swinging end
    // drifts outward and the joint pulls it back. Its velocity, still square to the old rod,
    // then points slightly outward from the new one, and the next step would delete that part:
    // a pendulum would lose about a fifth of its energy in 20 s at Standard accuracy. Turning
    // that outward part back into speed along the swing removes this numerical loss.
    const lineJoints = [];
    scene.links.forEach((l) => {
      const j = joints.get(l.id);
      if (j && (l.kind === 'rod' || l.kind === 'rope')) lineJoints.push({ j, rope: l.kind === 'rope' });
    });
    function invMassOf(pb) { return pb.isDynamic() && pb.getMass() > 0 ? 1 / pb.getMass() : 0; }
    function invInertiaOf(pb) {
      if (!pb.isDynamic() || pb.isFixedRotation()) return 0;
      const m = pb.getMass(); const lc = pb.getLocalCenter();
      const I = pb.getInertia() - m * (lc.x * lc.x + lc.y * lc.y);
      return I > 0 ? 1 / I : 0;
    }
    function keepLineSpeeds() {
      lineJoints.forEach(({ j, rope }) => {
        const A = j.getBodyA(); const B = j.getBodyB();
        const pa = j.getAnchorA(); const pb = j.getAnchorB();
        const dx = pb.x - pa.x; const dy = pb.y - pa.y;
        const L = Math.hypot(dx, dy);
        if (L < 1e-6) return;
        if (rope && L < j.getMaxLength() - 2 * pl.Settings.linearSlop) return; // slack
        const ux = dx / L; const uy = dy / L; const tx = -uy; const ty = ux;
        const va = A.getLinearVelocityFromWorldPoint(pa); const vb = B.getLinearVelocityFromWorldPoint(pb);
        const rvx = vb.x - va.x; const rvy = vb.y - va.y;
        const vr = rvx * ux + rvy * uy; const vt = rvx * tx + rvy * ty;
        if (rope && vr <= 0) return; // moving inward, so the rope goes slack and takes nothing
        if (Math.abs(vt) < 1e-9 || Math.abs(vr) > 0.5 * Math.abs(vt)) return; // not a swing
        const ca = A.getWorldCenter(); const cb = B.getWorldCenter();
        const ra = (pa.x - ca.x) * ty - (pa.y - ca.y) * tx; const rb = (pb.x - cb.x) * ty - (pb.y - cb.y) * tx;
        const k = invMassOf(A) + invMassOf(B) + invInertiaOf(A) * ra * ra + invInertiaOf(B) * rb * rb;
        if (!(k > 0)) return;
        const P = (Math.sign(vt) * Math.hypot(vt, vr) - vt) / k;
        if (B.isDynamic()) B.applyLinearImpulse(pl.Vec2(P * tx, P * ty), pb, true);
        if (A.isDynamic()) A.applyLinearImpulse(pl.Vec2(-P * tx, -P * ty), pa, true);
      });
    }

    sim.step = function step() {
      const h = sim.h;
      quadDrag.clear();
      contactForces.clear();
      sim.lastStep = h;
      applyForces();
      // Chains of rope links need more solver passes to stay together under load.
      world.step(h, solids.size ? 24 : VELOCITY_ITERATIONS, solids.size ? 8 : POSITION_ITERATIONS);
      keepLineSpeeds();
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

    // The forces on one moving object in the latest step, each where it acts (world point, N):
    // weight W at the center of mass, normal reaction N and friction F_f at each contact,
    // spring force F_s, tension T and joint reaction R at attachments, and drag D.
    sim.forcesOn = function forcesOn(id) {
      const pb = bodies.get(id);
      if (!pb || pb.isStatic()) return [];
      // Before time starts no contact or joint has been solved yet, so read the forces from a
      // copy of the world advanced by one step: the forces acting at the start.
      if (!(sim.t > 0)) {
        if (!sim.probe) { sim.probe = createSim(scene); sim.probe.step(); }
        return sim.probe.forcesOn(id);
      }
      const out = [];
      const add = (label, p, fx, fy) => out.push({ label, x: p.x, y: p.y, fx, fy });
      const c = pb.getWorldCenter();
      const g = world.getGravity();
      add('W', c, pb.getMass() * g.x, pb.getMass() * g.y);
      contactForces.forEach((f) => {
        const sign = f.B === pb ? 1 : f.A === pb ? -1 : 0;
        if (!sign) return;
        add('N', f, sign * f.nx, sign * f.ny);
        add('F_f', f, sign * f.tx, sign * f.ty);
      });
      const inv = 1 / sim.lastH;
      // A rod, rope or spring often joins an object at its center, but its pull acts where it
      // meets the object's surface: the first point of the object on the way in from the
      // connector's other end (or, for a solid one, its next joint).
      const surfacePoint = (anchor, from) => {
        const input = { p1: pl.Vec2(from.x, from.y), p2: pl.Vec2(anchor.x, anchor.y), maxFraction: 1 };
        let best = 1;
        for (let f = pb.getFixtureList(); f; f = f.getNext()) {
          const output = {};
          for (let i = 0; i < f.getShape().getChildCount(); i++) {
            if (f.rayCast(output, input, i) && output.fraction < best) best = output.fraction;
          }
        }
        return { x: from.x + (anchor.x - from.x) * best, y: from.y + (anchor.y - from.y) * best };
      };
      scene.links.forEach((l) => {
        const atA = bodyFor(l.a) === pb; const atB = bodyFor(l.b) === pb;
        if (!atA && !atB) return;
        const pa = anchorWorld(l.a, l.la); const pbw = anchorWorld(l.b, l.lb);
        // Along a solid rod or rope, aim from its first joint outside this object.
        const solidPts = solids.has(l.id) ? sim.solidPoints(l.id) : null;
        const reach = (() => { const e = S.extent(S.bodyById(scene, id)); return Math.hypot(e.x, e.y); })();
        const firstOutside = (pts, from) => pts.find((q) => Math.hypot(q.x - from.x, q.y - from.y) > reach) || pts[pts.length - 1];
        const towardA = solidPts ? firstOutside([...solidPts].reverse(), pbw) : pa;
        const towardB = solidPts ? firstOutside(solidPts, pa) : pbw;
        if (l.kind === 'spring') {
          const st = springState(l);
          if (atA) add('F_s', surfacePoint(pa, towardB), st.tension * st.ux, st.tension * st.uy);
          if (atB) add('F_s', surfacePoint(pbw, towardA), -st.tension * st.ux, -st.tension * st.uy);
          return;
        }
        const label = l.kind === 'rod' || l.kind === 'rope' ? 'T' : 'R';
        const solid = solids.get(l.id);
        const sum = (list) => list.reduce((acc, { j, sign }) => { const f = j.getReactionForce(inv); acc.x += sign * f.x; acc.y += sign * f.y; return acc; }, { x: 0, y: 0 });
        let fa, fb;
        if (solid) {
          fa = sum(solid.endJoints.map((j) => ({ j, sign: -1 })));
          fb = sum(solid.endJointsB);
        } else {
          const j = joints.get(l.id);
          if (!j) return;
          // Planck reports the force on the joint's body B. Hinges and glue join b (body A) to a (body B).
          const f = j.getReactionForce(inv);
          const onLinkB = l.kind === 'rod' || l.kind === 'rope';
          fb = onLinkB ? { x: f.x, y: f.y } : { x: -f.x, y: -f.y };
          fa = { x: -fb.x, y: -fb.y };
        }
        // A hinge or glue joint acts at one point, where end a sits.
        if (label === 'R') {
          if (atA) add(label, pa, fa.x, fa.y);
          if (atB) add(label, pa, fb.x, fb.y);
          return;
        }
        if (atA) add(label, surfacePoint(pa, towardB), fa.x, fa.y);
        if (atB) add(label, surfacePoint(pbw, towardA), fb.x, fb.y);
      });
      const v = pb.getLinearVelocity();
      const dq = quadDrag.get(pb);
      const lin = pb.getLinearDamping() * pb.getMass();
      const dx = (dq ? dq.x : 0) - lin * v.x; const dy = (dq ? dq.y : 0) - lin * v.y;
      if (dx || dy) add('D', c, dx, dy);
      return out;
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
      sim.probe = null; // the starting forces change too
      world.setGravity(pl.Vec2(0, -g));
    };

    sim.setFloorFriction = function setFloorFriction(mu) {
      sim.probe = null; // the starting forces change too
      if (floorFixture) floorFixture.setFriction(mu);
      refreshContacts();
    };

    sim.updateBody = function updateBody(b) {
      sim.probe = null; // the starting forces change too
      const pb = bodies.get(b.id);
      if (!pb) return;
      for (let f = pb.getFixtureList(); f; f = f.getNext()) {
        f.setFriction(b.friction);
        f.setRestitution(b.restitution);
        if (!b.fixed) f.setDensity(b.mass / Math.max(S.area(b), 1e-9));
      }
      if (!b.fixed) { pb.resetMassData(); setTrueMass(pb, b); }
      setViscousDamping(pb, dragRadius(b), b);
      refreshContacts();
      chooseStep();
    };

    sim.updateLink = function updateLink(l) {
      sim.probe = null; // the starting forces change too
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
      const solid = solids.get(l.id);
      if (solid) {
        const thickness = l.kind === 'rope' ? 0.03 : 0.06;
        const radius = Math.sqrt(l.length * thickness / Math.PI);
        solid.segs.forEach((pb) => setViscousDamping(pb, radius, null, solid.segs.length));
      }
      chooseStep();
    };

    // Apply every parameter that can change during a run (masses, surfaces, springs, motors, g).
    sim.syncParams = function syncParams() {
      sim.setGravity(scene.world.gravity);
      sim.setFloorFriction(scene.world.floorFriction);
      scene.bodies.forEach((b) => sim.updateBody(b));
      scene.links.forEach((l) => sim.updateLink(l));
      chooseStep();
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
