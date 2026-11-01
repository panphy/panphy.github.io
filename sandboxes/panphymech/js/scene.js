// PanPhyMech: the scene document. Objects and connectors in SI units, geometry,
// rigid groups for editing, and file import with validation.
// World coordinates are in meters with y up; the floor's top surface is y = 0.
(function (root) {
  const PPM = root.PPM = root.PPM || {};

  const FORMAT = 'panphy-mech';
  // 2: connector ends may name another connector they are joined to.
  const VERSION = 2;

  // Flat fills with a darker outline. Colors only tell objects apart; they never encode data.
  const COLORS = {
    blue: { fill: '#5B8DEF', stroke: '#2F5FC4' },
    coral: { fill: '#F27160', stroke: '#C4432F' },
    amber: { fill: '#F4B740', stroke: '#B9850F' },
    green: { fill: '#3DBB8A', stroke: '#1F8A61' },
    violet: { fill: '#9374EE', stroke: '#6748C7' },
    teal: { fill: '#33B6C9', stroke: '#1B8798' },
    pink: { fill: '#EC75AE', stroke: '#BF4683' },
    slate: { fill: '#8C96AA', stroke: '#5D667A' }
  };
  const COLOR_CYCLE = ['blue', 'coral', 'amber', 'green', 'violet', 'teal', 'pink'];

  const BODY_KINDS = {
    ball: { label: 'Ball', size: { r: 0.25 }, mass: 1 },
    box: { label: 'Box', size: { w: 0.5, h: 0.5 }, mass: 2 },
    plank: { label: 'Plank', size: { w: 2, h: 0.12 }, mass: 2 },
    wedge: { label: 'Ramp', size: { w: 3, h: 1.5 }, mass: 10, fixed: true },
    polygon: { label: 'Polygon', size: { r: 0.3, sides: 6 }, mass: 1.5 },
    wall: { label: 'Wall', kind: 'box', size: { w: 0.3, h: 2 }, mass: 10, fixed: true },
    // Made by merging or cutting objects; never placed from the parts list.
    custom: { label: 'Shape', size: {}, mass: 1 }
  };

  const LINK_KINDS = {
    spring: { label: 'Spring', points: 2 },
    rod: { label: 'Rod', points: 2 },
    rope: { label: 'Rope', points: 2 },
    hinge: { label: 'Hinge', points: 1 },
    motor: { label: 'Motor', points: 1, kind: 'hinge' },
    weld: { label: 'Glue', points: 1 },
    // A fixed wheel with one rope over it: three placement points (wheel, end a, end b).
    pulley: { label: 'Pulley', points: 3 }
  };

  // Limits used by the inspector and by file import.
  const LIMITS = {
    r: [0.02, 5], w: [0.02, 20], h: [0.02, 20], sides: [3, 8],
    mass: [0.001, 10000], friction: [0, 2], restitution: [0, 1], drag: [0, 50], linearDrag: [0, 1000],
    k: [0.1, 100000], rest: [0, 50], damping: [0, 1000], length: [0.01, 50],
    speed: [-100, 100], torque: [0, 100000], wheel: [0.02, 1],
    gravity: [0, 100], viscosity: [0, 1], coord: [-1000, 1000], velocity: [-500, 500], omega: [-200, 200]
  };

  const PULLEY_RADIUS = 0.15; // m: a new pulley's wheel

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const num = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

  function createScene() {
    return {
      format: FORMAT,
      version: VERSION,
      world: { gravity: 9.81, dragModel: 'none', linearDragSource: 'coefficient', linearDrag: 1, drag: 0.1, viscosity: 0, floor: true, floorFriction: 0.5, gpeZero: 0, accuracy: 'standard' },
      bodies: [],
      links: [],
      nextId: 1,
      camera: { cx: 0, cy: 2, scale: 80 }
    };
  }

  function newId(scene, prefix) {
    const id = prefix + scene.nextId;
    scene.nextId += 1;
    return id;
  }

  function nextName(scene, label) {
    const taken = new Set(scene.bodies.map((b) => b.name).concat(scene.links.map((l) => l.name)));
    for (let n = 1; ; n++) {
      const name = `${label} ${n}`;
      if (!taken.has(name)) return name;
    }
  }

  function makeBody(scene, type, x, y) {
    const def = BODY_KINDS[type] || BODY_KINDS.box;
    const kind = def.kind || type;
    const fixed = !!def.fixed;
    const dynamicCount = scene.bodies.filter((b) => !b.fixed).length;
    const body = {
      id: newId(scene, 'b'),
      kind,
      name: nextName(scene, def.label),
      x, y, angle: 0,
      ...JSON.parse(JSON.stringify(def.size)),
      mass: def.mass,
      friction: 0.4,
      restitution: kind === 'ball' ? 0.6 : 0.2,
      drag: 0.1, dragModel: 'world', linearDragSource: 'coefficient', linearDrag: 1, viscosity: 0,
      fixed,
      lockRotation: false,
      flip: false,
      color: fixed ? 'slate' : COLOR_CYCLE[dynamicCount % COLOR_CYCLE.length],
      vx: 0, vy: 0, omega: 0
    };
    return body;
  }

  function makeLink(scene, type, a, la, b, lb) {
    const def = LINK_KINDS[type] || LINK_KINDS.spring;
    const kind = def.kind || type;
    const link = { id: newId(scene, 'l'), kind, name: nextName(scene, def.label), a, la, b, lb };
    if (kind === 'spring') Object.assign(link, { k: 50, rest: 1, damping: 0 });
    if (kind === 'rod' || kind === 'rope') Object.assign(link, { length: 1, solid: false, mass: kind === 'rope' ? 0.1 : 0.5 });
    // The wheel's center (px, py) and radius r, fixed to the background; length is the whole rope.
    if (kind === 'pulley') Object.assign(link, { px: 0, py: 0, r: PULLEY_RADIUS, length: 1 });
    // A motor turns clockwise (dir −1) or counterclockwise (dir +1); speed carries the same sign.
    if (kind === 'hinge') Object.assign(link, { motor: type === 'motor', speed: type === 'motor' ? -3 : 0, dir: -1, torque: type === 'motor' ? 50 : 0 });
    return link;
  }

  // A solid rod weighs 0.5 kg; a solid rope 0.1 kg per meter.
  function defaultSolidMass(l) {
    return l.kind === 'rope' ? Math.max(0.01, Math.round(l.length * 10) / 100) : 0.5;
  }

  // ---------- Geometry (local coordinates about the centroid) ----------

  function vertices(b) {
    // A custom shape's outer outlines (holes aside), for boxes, fitting and placing.
    if (b.kind === 'custom') return b.paths.flatMap((poly) => poly[0].map(([x, y]) => ({ x, y })));
    if (b.kind === 'box' || b.kind === 'plank') {
      const w = b.w / 2;
      const h = b.h / 2;
      return [{ x: -w, y: -h }, { x: w, y: -h }, { x: w, y: h }, { x: -w, y: h }];
    }
    if (b.kind === 'wedge') {
      // A right triangle with its vertical side on the left (on the right when flipped).
      const s = b.flip ? -1 : 1;
      const pts = [{ x: -s * b.w / 2, y: -b.h / 2 }, { x: s * b.w / 2, y: -b.h / 2 }, { x: -s * b.w / 2, y: b.h / 2 }];
      const cx = (pts[0].x + pts[1].x + pts[2].x) / 3;
      const cy = (pts[0].y + pts[1].y + pts[2].y) / 3;
      const out = pts.map((p) => ({ x: p.x - cx, y: p.y - cy }));
      return s > 0 ? out : out.reverse();
    }
    if (b.kind === 'polygon') {
      const n = Math.round(clamp(b.sides, 3, 8));
      const out = [];
      // A flat bottom edge, so a polygon can rest on the floor when placed.
      const start = -Math.PI / 2 - Math.PI / n;
      for (let i = 0; i < n; i++) {
        const a = start + (2 * Math.PI * i) / n;
        out.push({ x: b.r * Math.cos(a), y: b.r * Math.sin(a) });
      }
      return out;
    }
    return null;
  }

  function area(b) {
    if (b.kind === 'ball') return Math.PI * b.r * b.r;
    if (b.kind === 'custom') return PPM.shapes.decompose(b.paths).area;
    const v = vertices(b);
    let s = 0;
    for (let i = 0; i < v.length; i++) {
      const p = v[i];
      const q = v[(i + 1) % v.length];
      s += p.x * q.y - q.x * p.y;
    }
    return Math.abs(s) / 2;
  }

  // Half-extents of the shape's bounding box in local axes, for handles and fitting.
  function extent(b) {
    if (b.kind === 'ball') return { x: b.r, y: b.r };
    const v = vertices(b);
    let x = 0;
    let y = 0;
    v.forEach((p) => { x = Math.max(x, Math.abs(p.x)); y = Math.max(y, Math.abs(p.y)); });
    return { x, y };
  }

  function toWorld(pose, p) {
    const c = Math.cos(pose.angle);
    const s = Math.sin(pose.angle);
    return { x: pose.x + c * p.x - s * p.y, y: pose.y + s * p.x + c * p.y };
  }

  function toLocal(pose, p) {
    const c = Math.cos(pose.angle);
    const s = Math.sin(pose.angle);
    const dx = p.x - pose.x;
    const dy = p.y - pose.y;
    return { x: c * dx + s * dy, y: -s * dx + c * dy };
  }

  function containsPoint(b, p, pad = 0) {
    const q = toLocal(b, p);
    if (b.kind === 'ball') return Math.hypot(q.x, q.y) <= b.r + pad;
    if (b.kind === 'custom') return PPM.shapes.inside(b.paths, q.x, q.y) || (pad > 0 && PPM.shapes.distanceToEdges(b.paths, q.x, q.y) <= pad);
    const v = vertices(b);
    // Convex polygon, counterclockwise: inside every edge (with a little padding).
    for (let i = 0; i < v.length; i++) {
      const a = v[i];
      const c = v[(i + 1) % v.length];
      const ex = c.x - a.x;
      const ey = c.y - a.y;
      const len = Math.hypot(ex, ey) || 1;
      if ((ex * (q.y - a.y) - ey * (q.x - a.x)) / len < -pad) return false;
    }
    return true;
  }

  const DRAG_MODELS = { none: 'None', linear: 'Linear', quadratic: 'Quadratic' };

  // The longest time step the simulation may take. Stiff springs and solid rods and ropes
  // shorten it further; finer steps are more accurate but cost more computing time.
  const ACCURACY = {
    standard: { label: 'Standard', step: 1 / 240, text: '1/240 s' },
    fine: { label: 'Fine', step: 1 / 480, text: '1/480 s' },
    veryFine: { label: 'Very fine', step: 1 / 1000, text: '1/1000 s' }
  };
  function worldAccuracy(scene) {
    return Object.hasOwn(ACCURACY, scene.world.accuracy) ? scene.world.accuracy : 'standard';
  }
  function accuracyNote(scene) {
    const a = worldAccuracy(scene);
    if (a === 'standard') return '';
    return `World accuracy is ${ACCURACY[a].label} (steps of ${ACCURACY[a].text} or less), so large scenes may run slower than real time.`;
  }
  function worldDragModel(scene) {
    return Object.hasOwn(DRAG_MODELS, scene.world.dragModel) ? scene.world.dragModel : scene.world.viscosity > 0 ? 'linear' : 'none';
  }
  function objectDragModel(b) {
    return b.dragModel === 'world' || Object.hasOwn(DRAG_MODELS, b.dragModel) ? b.dragModel : b.drag > 0 ? 'quadratic' : 'world';
  }
  function effectiveDragModel(scene, b) {
    return b && objectDragModel(b) !== 'world' ? objectDragModel(b) : worldDragModel(scene);
  }
  function dragCoefficients(scene, b, radius) {
    const model = effectiveDragModel(scene, b);
    const params = b && objectDragModel(b) !== 'world' ? b : scene.world;
    let linear = 0, quadratic = 0;
    if (model === 'linear') {
      const source = params.linearDragSource || (params.viscosity > 0 ? 'stokes' : 'coefficient');
      if (source === 'stokes') {
        if (radius === undefined) radius = b ? b.kind === 'ball' ? b.r : Math.sqrt(area(b) / Math.PI) : 0;
        linear = 6 * Math.PI * radius * clamp(num(params.viscosity, 0), ...LIMITS.viscosity);
      } else linear = clamp(num(params.linearDrag, 1), ...LIMITS.linearDrag);
    } else if (model === 'quadratic') quadratic = clamp(num(params.drag, 0), ...LIMITS.drag);
    return { model, linear, quadratic };
  }
  function dragOverrideNote(scene, b) {
    if (b.fixed || objectDragModel(b) === 'world') return '';
    return `${b.name} doesn’t follow the World drag settings.`;
  }

  function copyFragment(scene, selection, extra = [], poseOf = (b) => b) {
    if (!selection) return null;
    const ids = new Set(selection.type === 'body' ? [selection.id, ...extra] : []);
    const bodies = scene.bodies.filter((b) => ids.has(b.id)).map((b) => ({ ...b, ...poseOf(b) }));
    // Objects copy the connectors among them, and a joined pair when both parts qualify.
    const endOk = (l, end) => !l[end] || ids.has(l[end]) || (!bodyById(scene, l[end]) && !!linkById(scene, l[end]));
    let links = scene.links.filter((l) => selection.type === 'link' ? l.id === selection.id
      : (l.a || l.b) && endOk(l, 'a') && endOk(l, 'b'));
    if (selection.type !== 'link') {
      for (;;) {
        const kept = new Set(links.map((l) => l.id));
        const next = links.filter((l) => ['a', 'b'].every((end) => !l[end] || ids.has(l[end]) || kept.has(l[end])));
        // A pair copies only if at least one outer end is on a copied object.
        const real = next.filter((l) => l.a && ids.has(l.a) || l.b && ids.has(l.b) || ['a', 'b'].some((end) => {
          const t = kept.has(l[end]) && linkById(scene, l[end]);
          return t && (ids.has(t.a) || ids.has(t.b));
        }));
        if (real.length === links.length) break;
        links = real;
      }
    }
    const anchors = {};
    links.forEach((l) => { anchors[l.id] = { a: endPoint(scene, l.a, l.la, poseOf), b: endPoint(scene, l.b, l.lb, poseOf) }; });
    return JSON.parse(JSON.stringify({ bodies, links, anchors }));
  }

  function pasteFragment(scene, fragment, offset = 0.3) {
    const f = JSON.parse(JSON.stringify(fragment));
    const ids = new Map();
    const bodies = [], links = [];
    for (const b of f.bodies) {
      const id = newId(scene, 'b'); ids.set(b.id, id); b.id = id;
      b.name = nextName(scene, b.name.replace(/\s+\d+$/, ''));
      b.x += offset; b.y += offset;
      scene.bodies.push(b); bodies.push(id);
    }
    // Pasted pairs stay joined to each other; a join to anything else becomes a background end.
    const linkIds = new Map(f.links.map((l) => [l.id, newId(scene, 'l')]));
    for (const l of f.links) {
      const anchors = f.anchors[l.id];
      for (const end of ['a', 'b']) {
        if (ids.has(l[end])) l[end] = ids.get(l[end]);
        else if (linkIds.has(l[end])) { l[end] = linkIds.get(l[end]); if (f.bodies.length) l['l' + end] = { x: anchors[end].x + offset, y: anchors[end].y + offset }; }
        else if (l[end] && bodyById(scene, l[end])) continue; // Connector-only copy retains attachments.
        else { l[end] = null; const shift = f.bodies.length ? offset : 0; l['l' + end] = { x: anchors[end].x + shift, y: anchors[end].y + shift }; }
      }
      if (!l.a && !l.b) continue;
      // A pulley's wheel moves with the pasted objects.
      if (l.kind === 'pulley' && f.bodies.length) { l.px += offset; l.py += offset; }
      l.id = linkIds.get(l.id);
      l.name = nextName(scene, l.name.replace(/\s+\d+$/, ''));
      scene.links.push(l); links.push(l.id);
    }
    return { bodies, links };
  }

  // Convex pieces keep contact snapping accurate for rotated and cut shapes too.
  function contactParts(b) {
    if (b.kind === 'ball') return [{ center: { x: b.x, y: b.y }, radius: b.r }];
    const pieces = b.kind === 'custom'
      ? PPM.shapes.decompose(b.paths).pieces.map((ring) => ring.map(([x, y]) => ({ x, y })))
      : [vertices(b)];
    return pieces.map((ring) => ({ points: ring.map((p) => toWorld(b, p)) }));
  }

  // Largest signed separating distance and its direction, from b toward a.
  function contactSeparation(a, b) {
    const axes = [];
    for (const part of [a, b]) if (part.points) part.points.forEach((p, i) => {
      const q = part.points[(i + 1) % part.points.length];
      axes.push({ x: p.y - q.y, y: q.x - p.x });
    });
    if (a.center && b.center) axes.push({ x: a.center.x - b.center.x, y: a.center.y - b.center.y });
    for (const [circle, poly] of [[a, b], [b, a]]) if (circle.center && poly.points) {
      poly.points.forEach((p) => axes.push({ x: circle.center.x - p.x, y: circle.center.y - p.y }));
    }
    function project(part, n) {
      if (part.center) {
        const c = part.center.x * n.x + part.center.y * n.y;
        return [c - part.radius, c + part.radius];
      }
      const values = part.points.map((p) => p.x * n.x + p.y * n.y);
      return [Math.min(...values), Math.max(...values)];
    }
    let best = { distance: -Infinity, x: 1, y: 0 };
    if (!axes.some((n) => Math.hypot(n.x, n.y) > 1e-12)) axes.push({ x: 1, y: 0 });
    for (const axis of axes) {
      const len = Math.hypot(axis.x, axis.y);
      if (len < 1e-12) continue;
      const n = { x: axis.x / len, y: axis.y / len };
      const pa = project(a, n), pb = project(b, n);
      const forward = pa[0] - pb[1], backward = pb[0] - pa[1];
      const distance = Math.max(forward, backward);
      if (distance > best.distance) best = { distance, x: n.x * (forward >= backward ? 1 : -1), y: n.y * (forward >= backward ? 1 : -1) };
    }
    return best;
  }

  function bodyBottom(b) {
    return b.kind === 'ball' ? b.y - b.r : Math.min(...vertices(b).map((p) => toWorld(b, p).y));
  }

  // Return a small rigid translation to the nearest contact. Never snap through
  // another object, into a cut shape's solid material, or away from the pointer.
  function contactSnap(scene, ids, tolerance) {
    const moving = scene.bodies.filter((b) => ids.has(b.id));
    const fixed = scene.bodies.filter((b) => !ids.has(b.id));
    const candidates = [];
    const parts = new Map([...moving, ...fixed].map((b) => [b.id, contactParts(b)]));
    const add = (x, y, body, target = null) => {
      if (Math.hypot(x, y) <= tolerance) candidates.push({ x, y, body, target });
    };
    for (const a of moving) {
      if (scene.world.floor) add(0, -bodyBottom(a), a.id);
      for (const b of fixed) for (const pa of parts.get(a.id)) for (const pb of parts.get(b.id)) {
        const sep = contactSeparation(pa, pb);
        if (sep.distance > tolerance) continue;
        add(-sep.distance * sep.x, -sep.distance * sep.y, a.id, b.id);
        // Vertex-to-edge vectors also close diagonal corner gaps exactly.
        if (pa.points && pb.points) for (const [from, to, sign] of [[pa, pb, 1], [pb, pa, -1]]) {
          for (const p of from.points) to.points.forEach((v, i) => {
            const q = to.points[(i + 1) % to.points.length];
            const dx = q.x - v.x, dy = q.y - v.y;
            const t = clamp(((p.x - v.x) * dx + (p.y - v.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
            add(sign * (v.x + t * dx - p.x), sign * (v.y + t * dy - p.y), a.id, b.id);
          });
        }
      }
    }
    // An existing contact (e.g. the floor) must not mask a nearby side contact.
    candidates.sort((a, b) => {
      const da = Math.hypot(a.x, a.y), db = Math.hypot(b.x, b.y);
      return (da < 1e-9 ? Infinity : da) - (db < 1e-9 ? Infinity : db);
    });
    for (const d of candidates) {
      if (Math.hypot(d.x, d.y) > tolerance) continue;
      const shifted = moving.map((b) => ({ ...b, x: b.x + d.x, y: b.y + d.y }));
      const source = shifted.find((a) => a.id === d.body);
      const touches = d.target ? parts.get(d.target).some((pb) => contactParts(source).some((pa) => Math.abs(contactSeparation(pa, pb).distance) < 1e-8))
        : Math.abs(bodyBottom(source)) < 1e-8;
      if (!touches) continue;
      const valid = shifted.every((a) => (!scene.world.floor || bodyBottom(a) >= -1e-8)
        && fixed.every((b) => contactParts(a).every((pa) => parts.get(b.id).every((pb) => contactSeparation(pa, pb).distance >= -1e-8))));
      if (valid) return d;
    }
    return null;
  }

  // Bring a moving object's center onto the nearest edge of another object (any outline,
  // including a cut shape's holes) when it is within tolerance. Returns the translation.
  function centerSnap(scene, ids, tolerance) {
    let best = null;
    const others = scene.bodies.filter((b) => !ids.has(b.id));
    scene.bodies.forEach((a) => {
      if (!ids.has(a.id)) return;
      others.forEach((b) => {
        const q = closestSurface(b, a);
        const d = { x: q.x - a.x, y: q.y - a.y };
        const len = Math.hypot(d.x, d.y);
        if (len <= tolerance && (!best || len < Math.hypot(best.x, best.y))) best = d;
      });
    });
    return best;
  }

  function closestSurface(b, p) {
    if (b.kind === 'ball') {
      const dx = p.x - b.x, dy = p.y - b.y, len = Math.hypot(dx, dy) || 1;
      return { x: b.x + b.r * dx / len, y: b.y + b.r * dy / len };
    }
    const rings = b.kind === 'custom' ? b.paths.flat().map((ring) => ring.map(([x, y]) => ({ x, y }))) : [vertices(b)];
    let best = null, distance = Infinity;
    for (const ring of rings) ring.forEach((v, i) => {
      const a = toWorld(b, v), c = toWorld(b, ring[(i + 1) % ring.length]);
      const dx = c.x - a.x, dy = c.y - a.y;
      const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
      const q = { x: a.x + t * dx, y: a.y + t * dy };
      const dist = Math.hypot(q.x - p.x, q.y - p.y);
      if (dist < distance) { best = q; distance = dist; }
    });
    return best;
  }

  function bodyById(scene, id) {
    return scene.bodies.find((b) => b.id === id) || null;
  }

  function linkById(scene, id) {
    return scene.links.find((l) => l.id === id) || null;
  }

  // A link end in world coordinates: a body's local anchor, a fixed world point, or the join
  // with another connector (the end then holds that connector's id).
  function endPoint(scene, bodyId, local, poseOf) {
    if (!bodyId) return { x: local.x, y: local.y };
    const b = bodyById(scene, bodyId);
    if (b) return toWorld(poseOf ? poseOf(b) : b, local);
    const partner = linkById(scene, bodyId);
    const pair = partner && joinPair(scene, partner);
    if (pair) return pairGeometry(scene, pair, poseOf).node;
    return { x: local.x, y: local.y };
  }
  // An outer end of a joined pair: never itself a join.
  function plainEnd(scene, bodyId, local, poseOf) {
    const b = bodyId && bodyById(scene, bodyId);
    return b ? toWorld(poseOf ? poseOf(b) : b, local) : { x: local.x, y: local.y };
  }

  // ---------- Joined connectors ----------
  //
  // A spring end may join one end of another connector (a spring, an ideal rope or rod, or a
  // pulley's rope) that is fixed to the background. The two joined ends hold each other's id
  // (spring.b = rope id, rope.a = spring id). The join is a massless point, so both parts carry
  // one pull along one line and the pair acts as one connector; where the join sits follows
  // from the two outer ends. A joined end's la or lb keeps the join's last setup position.
  const JOIN_KINDS = ['spring', 'rope', 'rod', 'pulley'];
  const farEnd = (end) => (end === 'a' ? 'b' : 'a');

  // The end of l that is joined to another connector, or null.
  function joinedEnd(scene, l) {
    for (const end of ['a', 'b']) if (l[end] && !bodyById(scene, l[end]) && linkById(scene, l[end])) return end;
    return null;
  }

  // The pair l belongs to, spring first: { spring, se, other, oe } (se and oe are the joined
  // ends). Two springs keep scene order, so the pair reads the same from either one.
  function joinPair(scene, l) {
    const end = joinedEnd(scene, l);
    if (!end) return null;
    const p = linkById(scene, l[end]);
    const pend = p.a === l.id ? 'a' : p.b === l.id ? 'b' : null;
    if (!pend) return null;
    const lFirst = l.kind === 'spring' && (p.kind !== 'spring' || scene.links.indexOf(l) <= scene.links.indexOf(p));
    return lFirst ? { spring: l, se: end, other: p, oe: pend } : { spring: p, se: pend, other: l, oe: end };
  }

  // A pair's shape now. X is the whole pair's stretch beyond its natural length (rest lengths
  // plus rope, rod or pulley rope length); a rope or pulley pair is slack while X ≤ 0 and its
  // spring then rests at its natural length. pullS and pullO are unit directions of the pull on
  // the spring's outer end ps and the other's outer end po, and the pair lengthens at the rate
  // −(pullS·vs + pullO·vo). tension is the static pull (no damping). For a pulley the rope path
  // runs from po over the wheel straight on to ps, with the join on that last straight part;
  // the join stops at the wheel if the rope is too short to keep it off. A running simulation
  // passes its pulley's winding and turn.
  function pairGeometry(scene, pair, poseOf, wind, prevTurn) {
    const { spring: s, se, other: o, oe } = pair;
    const sf = farEnd(se), of = farEnd(oe);
    const ps = plainEnd(scene, s[sf], s['l' + sf], poseOf);
    const po = plainEnd(scene, o[of], o['l' + of], poseOf);
    if (o.kind === 'pulley') {
      if (!Number.isFinite(wind) && poseOf && poseOf.pulley) {
        const st = poseOf.pulley(o.id);
        if (st) { wind = st.wind; prevTurn = st.turn; }
      }
      const pa = oe === 'a' ? ps : po, pb = oe === 'a' ? po : ps;
      const c = { x: o.px, y: o.py };
      const g = pulleyGeometry(c, o.r, pa, pb, Number.isFinite(wind) ? wind : pulleyWinding(c, pa, pb), prevTurn);
      const X = g.total - o.length - s.rest;
      const seg = oe === 'a' ? g.segA : g.segB;
      const uN = oe === 'a' ? g.ua : g.ub; // from the wheel out to the spring's end
      const uO = oe === 'a' ? g.ub : g.ua;
      const springLen = Math.min(X > 0 ? s.rest + X : s.rest, seg);
      return {
        ps, po, X, taut: X > 0, springLen, node: { x: ps.x - uN.x * springLen, y: ps.y - uN.y * springLen },
        pullS: { x: -uN.x, y: -uN.y }, pullO: { x: -uO.x, y: -uO.y }, k: s.k, tension: X > 0 ? s.k * X : 0,
        extS: Math.max(0, X), g, wind: g.wind, turn: g.turn, onWheel: X > 0 && s.rest + X > seg
      };
    }
    const dx = po.x - ps.x, dy = po.y - ps.y;
    const d = Math.hypot(dx, dy);
    const u = d > 1e-9 ? { x: dx / d, y: dy / d } : { x: 1, y: 0 };
    const at = (len) => ({ x: ps.x + u.x * len, y: ps.y + u.y * len });
    const base = { ps, po, d, pullS: u, pullO: { x: -u.x, y: -u.y } };
    if (o.kind === 'spring') {
      // Springs in series: k = k₁k₂/(k₁ + k₂); each stretches in inverse proportion to its k.
      const X = d - s.rest - o.rest;
      const K = s.k + o.k;
      const extS = (X * o.k) / K;
      const k = (s.k * o.k) / K;
      return { ...base, X, taut: true, springLen: s.rest + extS, node: at(s.rest + extS), k, tension: k * X, extS, extO: X - extS };
    }
    const X = d - s.rest - o.length;
    if (o.kind === 'rod') return { ...base, X, taut: true, springLen: d - o.length, node: at(d - o.length), k: s.k, tension: s.k * X, extS: X };
    const springLen = X > 0 ? d - o.length : s.rest;
    return { ...base, X, taut: X > 0, springLen, node: at(springLen), k: s.k, tension: X > 0 ? s.k * X : 0, extS: Math.max(0, X) };
  }

  // Why end `end` of l cannot join end `tend` of connector t, or '' when it can. farValue is
  // what l's other end will hold (a body id or null; it defaults to l's current one).
  function joinProblem(scene, l, end, t, tend, farValue = l[farEnd(end)]) {
    if (!t || t.id === l.id) return 'Join two different connectors.';
    if (!JOIN_KINDS.includes(l.kind) || !JOIN_KINDS.includes(t.kind) || (l.kind !== 'spring' && t.kind !== 'spring')) {
      return 'Only a spring can join another connector: a spring, an ideal rope or rod, or a pulley’s rope.';
    }
    if (l.solid || t.solid) return 'Solid rods and ropes can’t be joined; switch Solid off first.';
    if (t[tend]) return 'Join to a connector end that is fixed to the background.';
    if (joinedEnd(scene, t)) return `${t.name} is already joined to another connector.`;
    if (farValue && !bodyById(scene, farValue)) return 'A connector can be joined at one end only.';
    if (!farValue && !t[farEnd(tend)]) return 'Attach at least one end of the pair to an object.';
    if (farValue && farValue === t[farEnd(tend)]) return 'The pair would join an object to itself.';
    return '';
  }

  // Join end `end` of l to end `tend` of t (checked with joinProblem first).
  function joinLinks(scene, l, end, t, tend) {
    const node = endPoint(scene, t[tend], t['l' + tend]);
    l[end] = t.id; l['l' + end] = { ...node };
    t[tend] = l.id; t['l' + tend] = { ...node };
    const pair = joinPair(scene, l);
    // Two springs cannot share damping exactly through a massless join, so they have none.
    if (pair && pair.other.kind === 'spring') { pair.spring.damping = 0; pair.other.damping = 0; }
  }

  // Make a pair rest as drawn: the connector just placed or attached (l) takes up the slack,
  // a spring through its natural length, anything else through its length.
  function fitJoin(scene, l) {
    const pair = joinPair(scene, l);
    if (!pair) return;
    const g = pairGeometry(scene, pair, null);
    if (l.kind === 'spring') {
      // X already counts this spring's natural length; for two springs only l takes it up.
      l.rest = clamp(Math.round((l.rest + g.X) * 100) / 100, Math.max(0.05, LIMITS.rest[0]), LIMITS.rest[1]);
    } else {
      l.length = clamp(l.length + g.X, ...LIMITS.length);
    }
  }

  // A joined end's partner end is set to the background where the join is now.
  function unjoin(scene, l, end, poseOf) {
    const t = linkById(scene, l[end]);
    const node = endPoint(scene, l[end], l['l' + end], poseOf);
    l[end] = null; l['l' + end] = { ...node };
    if (t) ['a', 'b'].forEach((e) => { if (t[e] === l.id) { t[e] = null; t['l' + e] = { ...node }; } });
  }

  // The shortest pulley rope that still reaches the wheel from both sides (with a joined
  // spring: that keeps the join off the wheel).
  function minPulleyLength(scene, l, poseOf) {
    const pair = joinPair(scene, l);
    if (!pair) return linkLength(scene, l);
    const g = pairGeometry(scene, pair, poseOf);
    return g.g.total - (pair.oe === 'a' ? g.g.segA : g.g.segB);
  }

  // Connectors left consistent after any edit: a join whose partner is gone or no longer
  // points back becomes a background end where the join was; connectors whose objects are
  // gone, or with no end on an object, are removed (bodyIds: the objects that remain).
  // Joined ends then store the join's position.
  function tidyLinks(scene) {
    const bodyIds = new Set(scene.bodies.map((b) => b.id));
    for (let pass = 0; pass < 4; pass++) {
      const before = scene.links.length;
      scene.links.forEach((l) => ['a', 'b'].forEach((end) => {
        const id = l[end];
        if (!id || bodyIds.has(id)) return;
        const t = linkById(scene, id);
        const back = t && (t.a === l.id || t.b === l.id);
        if (!back || joinProblemAfter(scene, l, end, t)) { l[end] = null; }
      }));
      scene.links = scene.links.filter((l) => ['a', 'b'].every((end) => !l[end] || bodyIds.has(l[end]) || linkById(scene, l[end]))
        && (l.a || l.b));
      if (scene.links.length === before) break;
    }
    syncJoinPoints(scene);
  }
  // A join that already exists stays valid while its kinds, solidity and outer ends allow it.
  function joinProblemAfter(scene, l, end, t) {
    const tend = t.a === l.id ? 'a' : 'b';
    if (!JOIN_KINDS.includes(l.kind) || !JOIN_KINDS.includes(t.kind) || (l.kind !== 'spring' && t.kind !== 'spring')) return true;
    if (l.solid || t.solid) return true;
    const lf = l[farEnd(end)], tf = t[farEnd(tend)];
    if ((lf && !bodyById(scene, lf)) || (tf && !bodyById(scene, tf))) return true; // chains
    if (!lf && !tf) return true;
    return false;
  }
  function syncJoinPoints(scene) {
    scene.links.forEach((l) => ['a', 'b'].forEach((end) => {
      if (l[end] && !bodyById(scene, l[end]) && linkById(scene, l[end])) l['l' + end] = endPoint(scene, l[end], l['l' + end]);
    }));
  }

  // Bodies joined by hinges or glue move together while editing, so joints stay put.
  function rigidGroup(scene, id) {
    const out = new Set([id]);
    const queue = [id];
    while (queue.length) {
      const cur = queue.pop();
      scene.links.forEach((l) => {
        if (l.kind !== 'hinge' && l.kind !== 'weld') return;
        if (!l.a || !l.b) return;
        const other = l.a === cur ? l.b : l.b === cur ? l.a : null;
        if (other && !out.has(other)) { out.add(other); queue.push(other); }
      });
    }
    return out;
  }

  // Move or rotate a set of bodies rigidly, carrying the world anchors of their joints
  // and refitting rods and ropes to the new distance.
  function transformBodies(scene, ids, fn) {
    scene.bodies.forEach((b) => {
      if (!ids.has(b.id)) return;
      const p = fn({ x: b.x, y: b.y }, b.angle);
      b.x = p.x; b.y = p.y; b.angle = p.angle;
    });
    scene.links.forEach((l) => {
      if ((l.kind === 'hinge' || l.kind === 'weld') && !l.b && ids.has(l.a)) {
        // The world anchor follows the body it pins.
        const p = fn({ x: l.lb.x, y: l.lb.y }, 0);
        l.lb = { x: p.x, y: p.y };
      }
    });
    refitLengths(scene, ids);
  }

  // Mirror a set of bodies left to right about the vertical line x = cx: positions,
  // angles, shapes, attachment points, starting velocities and motor directions.
  // Connectors to bodies outside the set keep their outside end.
  function mirrorBodies(scene, ids, cx) {
    scene.bodies.forEach((b) => {
      if (!ids.has(b.id)) return;
      b.x = 2 * cx - b.x;
      b.angle = -b.angle;
      b.vx = -b.vx;
      b.omega = -b.omega;
      if (b.kind === 'wedge') b.flip = !b.flip;
      // Reversing each ring keeps its winding after the x flip.
      if (b.kind === 'custom') b.paths = b.paths.map((poly) => poly.map((ring) => ring.map(([x, y]) => [-x, y]).reverse()));
    });
    scene.links.forEach((l) => {
      const inA = ids.has(l.a);
      const inB = ids.has(l.b);
      if (!inA && !inB) return;
      if (inA) l.la = { x: -l.la.x, y: l.la.y };
      if (inB) l.lb = { x: -l.lb.x, y: l.lb.y };
      if (l.kind === 'hinge' || l.kind === 'weld') {
        // A joint pinned to the background moves with the body it pins.
        if (!l.b) l.lb = { x: 2 * cx - l.lb.x, y: l.lb.y };
        if (l.kind === 'hinge') { l.dir = -l.dir; l.speed = -l.speed || 0; }
      }
    });
    refitLengths(scene, ids);
  }

  function linkLength(scene, l) {
    if (l.kind === 'pulley') return pulleyPath(scene, l).total;
    const p = endPoint(scene, l.a, l.la);
    const q = endPoint(scene, l.b, l.lb);
    return Math.hypot(q.x - p.x, q.y - p.y);
  }

  // A rod, rope or pulley refits to stay taut. Joined to a spring, it takes up the slack with
  // the spring at its natural length.
  function refitLink(scene, l) {
    if (l.kind !== 'rod' && l.kind !== 'rope' && l.kind !== 'pulley') return;
    const pair = joinPair(scene, l);
    if (pair && pair.other === l) l.length = clamp(l.length + pairGeometry(scene, pair, null).X, ...LIMITS.length);
    else if (!pair) l.length = Math.max(LIMITS.length[0], linkLength(scene, l));
  }

  function refitLengths(scene, ids) {
    scene.links.forEach((l) => {
      if (l.kind !== 'rod' && l.kind !== 'rope' && l.kind !== 'pulley') return;
      const pair = joinPair(scene, l);
      // A joined connector refits when either outer end of its pair moves.
      const ends = pair ? [pair.spring[farEnd(pair.se)], pair.other[farEnd(pair.oe)]] : [l.a, l.b];
      if (ids && !ends.some((id) => ids.has(id))) return;
      refitLink(scene, l);
    });
  }

  // Removing connectors leaves each joined partner a background end where the join was; a
  // partner left with no end on an object goes too.
  function dropLinks(scene, gone, poseOf) {
    const points = new Map();
    scene.links.forEach((l) => ['a', 'b'].forEach((end) => {
      if (!gone.has(l.id) && gone.has(l[end])) points.set(l.id + end, endPoint(scene, l[end], l['l' + end], poseOf));
    }));
    scene.links = scene.links.filter((l) => !gone.has(l.id));
    scene.links.forEach((l) => ['a', 'b'].forEach((end) => {
      const p = points.get(l.id + end);
      if (p) { l[end] = null; l['l' + end] = { x: p.x, y: p.y }; }
    }));
    scene.links = scene.links.filter((l) => l.a || l.b);
  }

  function removeBody(scene, id, poseOf) {
    const gone = new Set(scene.links.filter((l) => l.a === id || l.b === id).map((l) => l.id));
    dropLinks(scene, gone, poseOf);
    scene.bodies = scene.bodies.filter((b) => b.id !== id);
  }

  function removeLink(scene, id, poseOf) {
    dropLinks(scene, new Set([id]), poseOf);
  }

  function bounds(scene) {
    let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
    const add = (x, y) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); };
    scene.bodies.forEach((b) => {
      if (b.kind === 'ball') { add(b.x - b.r, b.y - b.r); add(b.x + b.r, b.y + b.r); return; }
      vertices(b).forEach((p) => { const q = toWorld(b, p); add(q.x, q.y); });
    });
    scene.links.forEach((l) => {
      if (!l.a) add(l.la.x, l.la.y);
      if (!l.b) add(l.lb.x, l.lb.y);
      if (l.kind === 'pulley') { add(l.px - l.r, l.py - l.r); add(l.px + l.r, l.py + l.r); }
    });
    if (!Number.isFinite(minX)) return null;
    return { minX, minY, maxX, maxY };
  }

  // The box to frame when fitting the view. Objects far from the rest (thrown away by a
  // strong spring, say) are left out and named, so one runaway object cannot shrink the
  // whole scene to dots. poseOf gives an object's current pose.
  function fitBox(scene, poseOf = (b) => b) {
    const items = [];
    scene.bodies.forEach((b) => {
      const p = poseOf(b);
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) { items.push({ name: b.name, bad: true }); return; }
      const live = { ...b, x: p.x, y: p.y, angle: p.angle };
      const pts = b.kind === 'ball'
        ? [{ x: p.x - b.r, y: p.y - b.r }, { x: p.x + b.r, y: p.y + b.r }]
        : vertices(b).map((v) => toWorld(live, v));
      items.push({ name: b.name, x: p.x, y: p.y, pts });
    });
    scene.links.forEach((l) => {
      if (!l.a) items.push({ name: l.name, x: l.la.x, y: l.la.y, pts: [l.la] });
      if (!l.b) items.push({ name: l.name, x: l.lb.x, y: l.lb.y, pts: [l.lb] });
      if (l.kind === 'pulley') items.push({ name: l.name, x: l.px, y: l.py, pts: [{ x: l.px - l.r, y: l.py - l.r }, { x: l.px + l.r, y: l.py + l.r }] });
    });
    const good = items.filter((i) => !i.bad);
    const far = items.filter((i) => i.bad);
    if (!good.length) return { box: null, far: far.map((i) => ({ name: i.name })) };
    const median = (arr) => { const s = arr.slice().sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
    const mx = median(good.map((i) => i.x));
    const my = median(good.map((i) => i.y));
    const dist = good.map((i) => Math.hypot(i.x - mx, i.y - my));
    const limit = Math.max(25, 4 * median(dist));
    let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
    good.forEach((i, k) => {
      if (dist[k] > limit) { far.push({ name: i.name, x: i.x, y: i.y }); return; }
      i.pts.forEach((q) => { minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x); minY = Math.min(minY, q.y); maxY = Math.max(maxY, q.y); });
    });
    // Show the floor when the scene sits on it or close above it.
    if (scene.world.floor && minY < Math.max(3, 0.6 * (maxY - minY))) minY = Math.min(minY, 0);
    return { box: { minX, minY, maxX, maxY }, far };
  }

  // ---------- Pulleys ----------
  //
  // An ideal fixed pulley: a wheel of radius r centered at c, and one rope from end a, onto the
  // wheel at its tangent point ta, round the wheel to tb, and off to end b. The rope's length is
  // the whole of it: |a − ta| + arc + |tb − b|. The rope wraps round the far side of the wheel
  // from the narrower gap between its ends, so two hanging ends go over the top.
  // wind = 1: from a to b the rope runs clockwise round the wheel; −1: counterclockwise.
  const PULLEY_CLEARANCE = 0.02; // m: an end must be at least this far outside the wheel

  function pulleyWinding(c, pa, pb) {
    const cross = (pa.x - c.x) * (pb.y - c.y) - (pa.y - c.y) * (pb.x - c.x);
    return cross >= 0 ? 1 : -1;
  }

  // Tangent points, straight parts, the wrap and the total length. ua and ub are unit vectors
  // from each tangent point out to its end: the rope pulls each end along −u, and the total
  // length changes at the rate ua·va + ub·vb (the arc's change cancels the tangent points' slide).
  // A running simulation passes the previous step's turn (the wrap angle, followed continuously
  // through whole turns), so an end swung over the top of the wheel never makes the wrap jump by
  // a full turn. When the turn falls to zero or below, the rope has come off the wheel: it runs
  // straight from end to end, which matches the wrapped rope exactly at the moment it leaves.
  function pulleyGeometry(c, r, pa, pb, wind, prevTurn) {
    const side = (p, sign) => {
      const dx = p.x - c.x, dy = p.y - c.y;
      const d = Math.hypot(dx, dy);
      const phi = Math.atan2(dy, dx);
      if (d <= r) {
        // An end inside the wheel: no tangent; the rope meets the rim straight out from the center.
        const u = d > 1e-12 ? { x: dx / d, y: dy / d } : { x: 0, y: -1 };
        return { angle: phi, t: { x: c.x + r * u.x, y: c.y + r * u.y }, len: 0, u, inside: true };
      }
      const angle = phi - sign * Math.acos(r / d);
      const t = { x: c.x + r * Math.cos(angle), y: c.y + r * Math.sin(angle) };
      const len = Math.sqrt(d * d - r * r);
      return { angle, t, len, u: { x: (p.x - t.x) / len, y: (p.y - t.y) / len }, inside: false };
    };
    const A = side(pa, wind);
    const B = side(pb, -wind);
    const TAU = 2 * Math.PI;
    let turn = (((wind * (A.angle - B.angle)) % TAU) + TAU) % TAU;
    if (Number.isFinite(prevTurn)) turn += TAU * Math.round((prevTurn - turn) / TAU);
    if (turn <= 0 && !A.inside && !B.inside) {
      const dx = pb.x - pa.x, dy = pb.y - pa.y;
      const L = Math.hypot(dx, dy) || 1e-12;
      const k = clamp(((c.x - pa.x) * dx + (c.y - pa.y) * dy) / (L * L), 0, 1);
      const t = { x: pa.x + k * dx, y: pa.y + k * dy };
      return {
        ta: t, tb: t, angleA: A.angle, angleB: A.angle, segA: k * L, segB: (1 - k) * L,
        ua: { x: -dx / L, y: -dy / L }, ub: { x: dx / L, y: dy / L },
        wrap: 0, turn, arc: 0, total: L, wind, inside: false, offWheel: true
      };
    }
    const wrap = Math.max(0, turn);
    return {
      ta: A.t, tb: B.t, angleA: A.angle, angleB: B.angle, segA: A.len, segB: B.len, ua: A.u, ub: B.u,
      wrap, turn, arc: r * wrap, total: A.len + B.len + r * wrap, wind, inside: A.inside || B.inside, offWheel: false
    };
  }

  // The current path of a pulley's rope. wind defaults to the one the geometry chooses;
  // a running simulation passes its own wind and turn.
  function pulleyPath(scene, l, poseOf, wind, prevTurn) {
    const pa = endPoint(scene, l.a, l.la, poseOf);
    const pb = endPoint(scene, l.b, l.lb, poseOf);
    const c = { x: l.px, y: l.py };
    return { pa, pb, c, ...pulleyGeometry(c, l.r, pa, pb, wind || pulleyWinding(c, pa, pb), prevTurn) };
  }

  // Why a pulley's geometry cannot work, or '' when it can.
  function pulleyProblem(scene, l, poseOf) {
    // A joined end is checked where its spring's far end is: the rope runs straight on to it.
    const pair = joinPair(scene, l);
    const ps = pair && pairGeometry(scene, pair, poseOf).ps;
    const pa = pair && pair.oe === 'a' ? ps : endPoint(scene, l.a, l.la, poseOf);
    const pb = pair && pair.oe === 'b' ? ps : endPoint(scene, l.b, l.lb, poseOf);
    const near = (p) => Math.hypot(p.x - l.px, p.y - l.py) < l.r + PULLEY_CLEARANCE;
    if (near(pa) || near(pb)) return 'Each end of the rope must be outside the pulley wheel.';
    const overlaps = scene.bodies.some((b) => !b.fixed && overlapsCircle(b, poseOf, { x: l.px, y: l.py }, l.r));
    if (overlaps) return 'The pulley wheel would overlap a movable object.';
    return '';
  }
  function overlapsCircle(b, poseOf, c, r) {
    const pose = poseOf ? poseOf(b) : b;
    const live = { ...b, x: pose.x, y: pose.y, angle: pose.angle };
    if (containsPoint(live, c)) return true;
    const q = closestSurface(live, c);
    return Math.hypot(q.x - c.x, q.y - c.y) < r - 1e-6;
  }

  // ---------- Files ----------

  function serialize(scene) {
    return JSON.stringify(scene);
  }

  // A custom outline from a file: polygons of rings of [x, y], with a sane number of points.
  function parsePaths(src) {
    if (!Array.isArray(src) || !src.length || src.length > 50) return null;
    let count = 0;
    const out = [];
    for (const poly of src) {
      if (!Array.isArray(poly) || !poly.length) return null;
      const rings = [];
      for (const ring of poly) {
        if (!Array.isArray(ring) || ring.length < 3) return null;
        const pts = [];
        for (const p of ring) {
          if (!Array.isArray(p) || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || Math.abs(p[0]) > 100 || Math.abs(p[1]) > 100) return null;
          pts.push([p[0], p[1]]);
        }
        count += pts.length;
        rings.push(pts);
      }
      out.push(rings);
    }
    if (count > 5000) return null;
    return PPM.shapes && PPM.shapes.decompose(out).pieces.length ? out : null;
  }

  // Reads a saved scene. Unknown objects are skipped; every number is checked and clamped.
  function parse(text) {
    const data = typeof text === 'string' ? JSON.parse(text) : text;
    if (!data || data.format !== FORMAT || !Array.isArray(data.bodies)) throw new Error('This is not a PanPhyMech scene.');
    const scene = createScene();
    const w = data.world || {};
    scene.world.gravity = clamp(num(w.gravity, 9.81), ...LIMITS.gravity);
    scene.world.floor = w.floor !== false;
    scene.world.floorFriction = clamp(num(w.floorFriction, 0.5), ...LIMITS.friction);
    scene.world.viscosity = clamp(num(w.viscosity, 0), ...LIMITS.viscosity);
    scene.world.dragModel = worldDragModel({ world: w });
    scene.world.linearDragSource = w.linearDragSource === 'stokes' || (!w.linearDragSource && w.viscosity > 0) ? 'stokes' : 'coefficient';
    scene.world.linearDrag = clamp(num(w.linearDrag, 1), ...LIMITS.linearDrag);
    scene.world.drag = clamp(num(w.drag, 0.1), ...LIMITS.drag);
    scene.world.gpeZero = clamp(num(w.gpeZero, 0), ...LIMITS.coord);
    scene.world.accuracy = worldAccuracy({ world: w });
    const ids = new Set();
    let skipped = 0;
    let maxNum = 0;
    const track = (id) => { const n = parseInt(String(id).slice(1), 10); if (n > maxNum) maxNum = n; };
    data.bodies.forEach((src) => {
      if (!src || typeof src.id !== 'string' || ids.has(src.id) || !['ball', 'box', 'plank', 'wedge', 'polygon', 'custom'].includes(src.kind)) { skipped++; return; }
      const paths = src.kind === 'custom' ? parsePaths(src.paths) : null;
      if (src.kind === 'custom' && !paths) { skipped++; return; }
      const b = {
        id: src.id, kind: src.kind, name: String(src.name || 'Object').slice(0, 40),
        x: clamp(num(src.x, 0), ...LIMITS.coord), y: clamp(num(src.y, 0), ...LIMITS.coord), angle: num(src.angle, 0),
        mass: clamp(num(src.mass, 1), ...LIMITS.mass), friction: clamp(num(src.friction, 0.4), ...LIMITS.friction),
        restitution: clamp(num(src.restitution, 0.2), ...LIMITS.restitution), drag: clamp(num(src.drag, 0), ...LIMITS.drag),
        dragModel: objectDragModel(src),
        linearDragSource: src.linearDragSource === 'stokes' ? 'stokes' : 'coefficient',
        linearDrag: clamp(num(src.linearDrag, 1), ...LIMITS.linearDrag), viscosity: clamp(num(src.viscosity, 0), ...LIMITS.viscosity),
        fixed: !!src.fixed, lockRotation: !!src.lockRotation, flip: !!src.flip,
        color: COLORS[src.color] ? src.color : 'blue',
        vx: clamp(num(src.vx, 0), ...LIMITS.velocity), vy: clamp(num(src.vy, 0), ...LIMITS.velocity), omega: clamp(num(src.omega, 0), ...LIMITS.omega)
      };
      if (b.kind === 'ball') b.r = clamp(num(src.r, 0.25), ...LIMITS.r);
      else if (b.kind === 'polygon') { b.r = clamp(num(src.r, 0.3), ...LIMITS.r); b.sides = Math.round(clamp(num(src.sides, 6), ...LIMITS.sides)); }
      else if (b.kind === 'custom') b.paths = paths;
      else { b.w = clamp(num(src.w, 0.5), ...LIMITS.w); b.h = clamp(num(src.h, 0.5), ...LIMITS.h); }
      ids.add(b.id); track(b.id);
      scene.bodies.push(b);
    });
    const point = (p) => ({ x: clamp(num(p && p.x, 0), ...LIMITS.coord), y: clamp(num(p && p.y, 0), ...LIMITS.coord) });
    const linkIds = new Set();
    // An end may also name another connector it is joined to; tidyLinks checks those below.
    const fileLinkIds = new Set((Array.isArray(data.links) ? data.links : []).map((src) => src && typeof src.id === 'string' && !ids.has(src.id) ? src.id : null).filter(Boolean));
    (Array.isArray(data.links) ? data.links : []).forEach((src) => {
      if (!src || typeof src.id !== 'string' || linkIds.has(src.id) || ids.has(src.id) || !['spring', 'rod', 'rope', 'hinge', 'weld', 'pulley'].includes(src.kind)) { skipped++; return; }
      const endRef = (v) => (typeof v === 'string' && (ids.has(v) || (fileLinkIds.has(v) && v !== src.id)) ? v : null);
      const a = endRef(src.a);
      const b = endRef(src.b);
      if ((src.a && !a) || (src.b && !b) || (!a && !b)) { skipped++; return; }
      const l = { id: src.id, kind: src.kind, name: String(src.name || 'Link').slice(0, 40), a, la: point(src.la), b, lb: point(src.lb) };
      if (l.kind === 'spring') { l.k = clamp(num(src.k, 50), ...LIMITS.k); l.rest = clamp(num(src.rest, 1), ...LIMITS.rest); l.damping = clamp(num(src.damping, 0), ...LIMITS.damping); }
      if (l.kind === 'rod' || l.kind === 'rope') {
        l.length = clamp(num(src.length, 1), ...LIMITS.length);
        l.solid = !!src.solid;
        l.mass = clamp(num(src.mass, defaultSolidMass(l)), ...LIMITS.mass);
      }
      if (l.kind === 'pulley') {
        l.px = clamp(num(src.px, 0), ...LIMITS.coord); l.py = clamp(num(src.py, 0), ...LIMITS.coord);
        l.r = clamp(num(src.r, PULLEY_RADIUS), ...LIMITS.wheel);
        l.length = clamp(num(src.length, 1), ...LIMITS.length);
      }
      if (l.kind === 'hinge') {
        l.motor = !!src.motor; l.speed = clamp(num(src.speed, 0), ...LIMITS.speed); l.torque = clamp(num(src.torque, 50), ...LIMITS.torque);
        l.dir = src.dir === 1 || src.dir === -1 ? src.dir : l.speed > 0 ? 1 : -1;
        l.speed = l.dir * Math.abs(l.speed);
      }
      linkIds.add(l.id); track(l.id);
      scene.links.push(l);
    });
    const count = scene.links.length;
    tidyLinks(scene);
    skipped += count - scene.links.length;
    if (data.camera && Number.isFinite(data.camera.scale)) {
      scene.camera = { cx: num(data.camera.cx, 0), cy: num(data.camera.cy, 2), scale: clamp(data.camera.scale, 0.01, 2000) };
    }
    scene.nextId = Math.max(num(data.nextId, 1), maxNum + 1);
    return { scene, skipped };
  }

  PPM.scene = {
    DRAG_MODELS, worldDragModel, objectDragModel, effectiveDragModel, dragCoefficients, dragOverrideNote,
    ACCURACY, worldAccuracy, accuracyNote,
    FORMAT, VERSION, COLORS, COLOR_CYCLE, BODY_KINDS, LINK_KINDS, LIMITS,
    createScene, makeBody, makeLink, newId, nextName,
    vertices, area, extent, toWorld, toLocal, containsPoint, contactSnap, centerSnap, closestSurface, copyFragment, pasteFragment,
    pulleyWinding, pulleyGeometry, pulleyPath, pulleyProblem, PULLEY_CLEARANCE, PULLEY_RADIUS,
    bodyById, linkById, endPoint, rigidGroup,
    JOIN_KINDS, joinedEnd, joinPair, pairGeometry, joinProblem, joinLinks, fitJoin, unjoin, minPulleyLength, tidyLinks, refitLink, transformBodies, mirrorBodies, linkLength, refitLengths,
    removeBody, removeLink, bounds, fitBox, serialize, defaultSolidMass, parse, clamp
  };
})(typeof window !== 'undefined' ? window : globalThis);
