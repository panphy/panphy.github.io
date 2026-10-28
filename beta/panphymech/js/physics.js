import { get as getPart } from './registry.js';
import { SCALE, G, m2px, springRestPx, bodyMassFromDensity } from './units.js';

const Matter = globalThis.Matter;
if (!Matter) throw new Error('Matter.js must load before PanPhyMech physics');
const { Engine, World, Bodies, Body, Constraint, Query } = Matter;

export function createPhysics(view) {
  const engine = Engine.create({
    gravity: { x: 0, y: 1, scale: 0.001 }
  });
  const world = engine.world;

  const meta = new Map(); // body.id -> meta
  const links = new Map(); // constraint.id -> { kind, constraint, ... }
  let nextLabel = 1;
  let walls = [];
  let running = true;
  let selectedId = null;

  // Grab state
  const grab = {
    active: false,
    body: null,
    offset: { x: 0, y: 0 },
    samples: [],
    stiffness: 0.35
  };

  function labelFor(kind) {
    const prefix = { sphere: 'S', block: 'B', plank: 'P' }[kind] || 'X';
    return prefix + (nextLabel++);
  }

  function rebuildWalls() {
    for (const w of walls) World.remove(world, w);
    const { w, h } = view.size;
    const thick = 40;
    const floor = Bodies.rectangle(w / 2, h - thick / 2, w + 200, thick, {
      isStatic: true,
      friction: 0.7,
      restitution: 0.05,
      label: 'floor'
    });
    const left = Bodies.rectangle(-thick / 2, h / 2, thick, h + 200, {
      isStatic: true, friction: 0.4, label: 'wall'
    });
    const right = Bodies.rectangle(w + thick / 2, h / 2, thick, h + 200, {
      isStatic: true, friction: 0.4, label: 'wall'
    });
    const ceiling = Bodies.rectangle(w / 2, -thick / 2, w + 200, thick, {
      isStatic: true, friction: 0.2, label: 'wall'
    });
    walls = [floor, left, right, ceiling];
    World.add(world, walls);
    // Floor rectangle center at h - thick/2 with height thick → top at h - thick.
    view.setFloorTop(h - thick);
  }

  function densityOptions(kind, props) {
    // Matter density is mass/area in engine units. Set mass explicitly from SI-ish area density.
    const mass = Math.max(0.05, bodyMassFromDensity(kind, props) / 200);
    return {
      density: 0.001,
      mass,
      friction: props.friction ?? 0.3,
      frictionStatic: (props.friction ?? 0.3) * 1.2,
      restitution: props.restitution ?? 0.2,
      isStatic: !!props.fixed
    };
  }

  function register(body, kind, props) {
    const m = {
      kind,
      label: labelFor(kind),
      props: { ...getPart(kind).defaults, ...props },
      selected: false
    };
    meta.set(body.id, m);
    view.addBodyMesh(body, m);
    return { body, meta: m };
  }

  function addSphere(mx, my, overrides = {}) {
    const props = { ...getPart('sphere').defaults, ...overrides };
    const r = m2px(props.r);
    const body = Bodies.circle(mx, my, r, {
      ...densityOptions('sphere', props),
      label: 'sphere'
    });
    World.add(world, body);
    return register(body, 'sphere', props);
  }

  function addBlock(mx, my, overrides = {}) {
    const props = { ...getPart('block').defaults, ...overrides };
    const body = Bodies.rectangle(mx, my, m2px(props.w), m2px(props.h), {
      ...densityOptions('block', props),
      label: 'block',
      chamfer: { radius: 4 }
    });
    World.add(world, body);
    return register(body, 'block', props);
  }

  function addPlank(mx, my, overrides = {}) {
    const props = { ...getPart('plank').defaults, ...overrides };
    const body = Bodies.rectangle(mx, my, m2px(props.w), m2px(props.h), {
      ...densityOptions('plank', props),
      label: 'plank',
      chamfer: { radius: 3 }
    });
    if (overrides.angleDeg != null) Body.setAngle(body, (overrides.angleDeg * Math.PI) / 180);
    World.add(world, body);
    return register(body, 'plank', props);
  }

  function hitTest(mx, my) {
    const hits = Query.point(world.bodies, { x: mx, y: my });
    const body = hits.find((b) => meta.has(b.id));
    if (!body) return null;
    return { type: 'body', body, meta: meta.get(body.id) };
  }

  function setSelection(sel) {
    for (const m of meta.values()) m.selected = false;
    selectedId = null;
    if (sel?.type === 'body') {
      sel.meta.selected = true;
      selectedId = sel.body.id;
      view.setSelected(sel.body.id);
    } else if (sel?.type === 'link') {
      view.setSelected(null);
    } else {
      view.setSelected(null);
    }
  }

  function beginGrab(body, mx, my) {
    if (!body || body.isStatic) return false;
    grab.active = true;
    grab.body = body;
    grab.offset = { x: body.position.x - mx, y: body.position.y - my };
    grab.samples = [{ t: performance.now(), x: mx, y: my }];
    Body.setVelocity(body, { x: 0, y: 0 });
    Body.setAngularVelocity(body, 0);
    body.isSensor = false;
    // Soften while held so stacking doesn't explode
    grab.prevCollision = body.collisionFilter;
    return true;
  }

  function moveGrab(mx, my) {
    if (!grab.active || !grab.body) return;
    const target = { x: mx + grab.offset.x, y: my + grab.offset.y };
    const body = grab.body;
    const dx = target.x - body.position.x;
    const dy = target.y - body.position.y;
    Body.setPosition(body, {
      x: body.position.x + dx * grab.stiffness,
      y: body.position.y + dy * grab.stiffness
    });
    Body.setVelocity(body, { x: dx * 0.25, y: dy * 0.25 });
    Body.setAngularVelocity(body, body.angularVelocity * 0.9);
    const now = performance.now();
    grab.samples.push({ t: now, x: mx, y: my });
    while (grab.samples.length > 8) grab.samples.shift();
  }

  function endGrab() {
    if (!grab.active || !grab.body) {
      grab.active = false;
      grab.body = null;
      return;
    }
    const samples = grab.samples;
    let vx = 0;
    let vy = 0;
    if (samples.length >= 2) {
      const a = samples[0];
      const b = samples[samples.length - 1];
      const dt = Math.max(1, b.t - a.t) / 1000;
      // Throw impulse in Matter px/s, clamped
      vx = ((b.x - a.x) / dt) * 0.35;
      vy = ((b.y - a.y) / dt) * 0.35;
      const max = 25;
      const sp = Math.hypot(vx, vy);
      if (sp > max) {
        vx = (vx / sp) * max;
        vy = (vy / sp) * max;
      }
    }
    Body.setVelocity(grab.body, { x: vx, y: vy });
    grab.active = false;
    grab.body = null;
    grab.samples = [];
  }

  function addPinAt(body, mx, my) {
    if (!body || !meta.has(body.id)) return null;
    // Local point in body space
    const pointA = {
      x: mx - body.position.x,
      y: my - body.position.y
    };
    // Rotate into body local frame
    const cos = Math.cos(-body.angle);
    const sin = Math.sin(-body.angle);
    const local = {
      x: pointA.x * cos - pointA.y * sin,
      y: pointA.x * sin + pointA.y * cos
    };
    const constraint = Constraint.create({
      bodyA: body,
      pointA: local,
      pointB: { x: mx, y: my },
      stiffness: 0.95,
      damping: 0.05,
      length: 0
    });
    World.add(world, constraint);
    const info = { kind: 'pin', constraint, bodyId: body.id };
    links.set(constraint.id, info);
    view.syncPin(constraint.id, mx, my);
    return info;
  }

  function addSpring(bodyA, bodyB, overrides = {}) {
    if (!bodyA || !bodyB || bodyA.id === bodyB.id) return null;
    const defs = getPart('spring').defaults;
    const length = springRestPx(
      bodyA.position.x, bodyA.position.y,
      bodyB.position.x, bodyB.position.y,
      1
    );
    const constraint = Constraint.create({
      bodyA,
      bodyB,
      stiffness: overrides.stiffness ?? defs.stiffness,
      damping: overrides.damping ?? defs.damping,
      length
    });
    World.add(world, constraint);
    const info = {
      kind: 'spring',
      constraint,
      bodyA: bodyA.id,
      bodyB: bodyB.id,
      stiffness: constraint.stiffness,
      damping: constraint.damping
    };
    links.set(constraint.id, info);
    return info;
  }

  function removeLink(id) {
    const info = links.get(id);
    if (!info) return;
    World.remove(world, info.constraint);
    if (info.kind === 'spring') view.removeSpring(id);
    if (info.kind === 'pin') view.removePin(id);
    links.delete(id);
  }

  function removeBody(body) {
    if (!body || !meta.has(body.id)) return;
    // Drop links attached to this body
    for (const [id, info] of [...links]) {
      const c = info.constraint;
      if (c.bodyA === body || c.bodyB === body || info.bodyId === body.id) {
        removeLink(id);
      }
    }
    view.removeBodyMesh(body.id);
    meta.delete(body.id);
    World.remove(world, body);
    if (selectedId === body.id) selectedId = null;
  }

  function removeSelection(sel) {
    if (!sel) return;
    if (sel.type === 'body') removeBody(sel.body);
    if (sel.type === 'link') removeLink(sel.linkId);
  }

  function clearScene() {
    endGrab();
    for (const id of [...links.keys()]) removeLink(id);
    for (const body of [...world.bodies]) {
      if (meta.has(body.id)) {
        view.removeBodyMesh(body.id);
        meta.delete(body.id);
        World.remove(world, body);
      }
    }
    meta.clear();
    selectedId = null;
    nextLabel = 1;
    view.clearAll();
  }

  function updateProps(sel, patch) {
    if (!sel || sel.type !== 'body') return;
    const m = meta.get(sel.body.id);
    if (!m) return;
    Object.assign(m.props, patch);
    const body = sel.body;
    if ('friction' in patch) {
      body.friction = patch.friction;
      body.frictionStatic = patch.friction * 1.2;
    }
    if ('restitution' in patch) body.restitution = patch.restitution;
    if ('density' in patch) {
      const mass = Math.max(0.05, bodyMassFromDensity(m.kind, m.props) / 200);
      Body.setMass(body, mass);
    }
    if ('fixed' in patch) {
      Body.setStatic(body, !!patch.fixed);
      view.removeBodyMesh(body.id);
      view.addBodyMesh(body, m);
    }
  }

  function step(dtMs) {
    if (running) {
      Engine.update(engine, Math.min(32, dtMs || 1000 / 60));
    }
    // Sync meshes
    for (const body of world.bodies) {
      const m = meta.get(body.id);
      if (m) view.syncBody(body, m);
    }
    for (const [id, info] of links) {
      const c = info.constraint;
      if (info.kind === 'spring') {
        const ax = c.bodyA.position.x + (c.pointA?.x || 0) * Math.cos(c.bodyA.angle) - (c.pointA?.y || 0) * Math.sin(c.bodyA.angle);
        const ay = c.bodyA.position.y + (c.pointA?.x || 0) * Math.sin(c.bodyA.angle) + (c.pointA?.y || 0) * Math.cos(c.bodyA.angle);
        const bx = c.bodyB.position.x + (c.pointB?.x || 0) * Math.cos(c.bodyB.angle) - (c.pointB?.y || 0) * Math.sin(c.bodyB.angle);
        const by = c.bodyB.position.y + (c.pointB?.x || 0) * Math.sin(c.bodyB.angle) + (c.pointB?.y || 0) * Math.cos(c.bodyB.angle);
        view.syncSpring(id, ax, ay, bx, by);
      } else if (info.kind === 'pin') {
        const bx = c.pointB.x;
        const by = c.pointB.y;
        view.syncPin(id, bx, by);
      }
    }
    view.render();
  }

  function resize() {
    view.resize();
    rebuildWalls();
  }

  function setRunning(on) {
    running = !!on;
  }

  // Center helpers for examples (meters from floor center)
  function place(mxMeters, myMetersFromFloor) {
    const { w, h } = view.size;
    const thick = 40;
    const floorTop = h - thick;
    return {
      x: w / 2 + m2px(mxMeters),
      y: floorTop - m2px(myMetersFromFloor)
    };
  }

  rebuildWalls();

  return {
    G,
    SCALE,
    meta,
    links,
    get grab() { return grab; },
    addSphere,
    addBlock,
    addPlank,
    addPinAt,
    addSpring,
    hitTest,
    setSelection,
    beginGrab,
    moveGrab,
    endGrab,
    removeSelection,
    removeBody,
    clearScene,
    updateProps,
    step,
    resize,
    setRunning,
    place,
    get running() { return running; },
    get engine() { return engine; }
  };
}
