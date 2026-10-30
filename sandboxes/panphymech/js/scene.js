// PanPhyMech: the scene document. Objects and connectors in SI units, geometry,
// rigid groups for editing, and file import with validation.
// World coordinates are in meters with y up; the floor's top surface is y = 0.
(function (root) {
  const PPM = root.PPM = root.PPM || {};

  const FORMAT = 'panphy-mech';
  const VERSION = 1;

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
    weld: { label: 'Glue', points: 1 }
  };

  // Limits used by the inspector and by file import.
  const LIMITS = {
    r: [0.02, 5], w: [0.02, 20], h: [0.02, 20], sides: [3, 8],
    mass: [0.001, 10000], friction: [0, 2], restitution: [0, 1], drag: [0, 50], linearDrag: [0, 1000],
    k: [0.1, 100000], rest: [0, 50], damping: [0, 1000], length: [0.01, 50],
    speed: [-100, 100], torque: [0, 100000],
    gravity: [0, 100], viscosity: [0, 1], coord: [-1000, 1000], velocity: [-500, 500], omega: [-200, 200]
  };

  // Box2D keeps a thin skin round polygons, so resting contacts settle this far apart.
  // Placing objects at this gap stops them popping out of a surface on the first step.
  const REST_GAP = { polygon: 0.015, ball: 0.005 };
  const restGap = (b) => (b.kind === 'ball' ? REST_GAP.ball : REST_GAP.polygon);

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const num = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

  function createScene() {
    return {
      format: FORMAT,
      version: VERSION,
      world: { gravity: 9.81, dragModel: 'none', linearDragSource: 'coefficient', linearDrag: 1, drag: 0.1, viscosity: 0, floor: true, floorFriction: 0.5, gpeZero: 0 },
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
    const links = scene.links.filter((l) => selection.type === 'link' ? l.id === selection.id
      : (l.a || l.b) && (!l.a || ids.has(l.a)) && (!l.b || ids.has(l.b)));
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
    for (const l of f.links) {
      const anchors = f.anchors[l.id];
      for (const end of ['a', 'b']) {
        if (ids.has(l[end])) l[end] = ids.get(l[end]);
        else if (l[end] && bodyById(scene, l[end])) continue; // Connector-only copy retains attachments.
        else { l[end] = null; const shift = f.bodies.length ? offset : 0; l['l' + end] = { x: anchors[end].x + shift, y: anchors[end].y + shift }; }
      }
      if (!l.a && !l.b) continue;
      l.id = newId(scene, 'l');
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
      if (scene.world.floor) add(0, restGap(a) - bodyBottom(a), a.id);
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
        : Math.abs(bodyBottom(source) - restGap(source)) < 1e-8;
      if (!touches) continue;
      const valid = shifted.every((a) => (!scene.world.floor || bodyBottom(a) >= restGap(a) - 1e-8)
        && fixed.every((b) => contactParts(a).every((pa) => parts.get(b.id).every((pb) => contactSeparation(pa, pb).distance >= -1e-8))));
      if (valid) return d;
    }
    return null;
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

  // A link end in world coordinates (a body's local anchor, or a fixed world point).
  function endPoint(scene, bodyId, local, poseOf) {
    if (!bodyId) return { x: local.x, y: local.y };
    const b = bodyById(scene, bodyId);
    if (!b) return { x: local.x, y: local.y };
    return toWorld(poseOf ? poseOf(b) : b, local);
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

  function linkLength(scene, l) {
    const p = endPoint(scene, l.a, l.la);
    const q = endPoint(scene, l.b, l.lb);
    return Math.hypot(q.x - p.x, q.y - p.y);
  }

  function refitLengths(scene, ids) {
    scene.links.forEach((l) => {
      if (l.kind !== 'rod' && l.kind !== 'rope') return;
      if (ids && !ids.has(l.a) && !ids.has(l.b)) return;
      l.length = Math.max(LIMITS.length[0], linkLength(scene, l));
    });
  }

  function removeBody(scene, id) {
    scene.bodies = scene.bodies.filter((b) => b.id !== id);
    scene.links = scene.links.filter((l) => l.a !== id && l.b !== id);
  }

  function removeLink(scene, id) {
    scene.links = scene.links.filter((l) => l.id !== id);
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
    (Array.isArray(data.links) ? data.links : []).forEach((src) => {
      if (!src || typeof src.id !== 'string' || linkIds.has(src.id) || ids.has(src.id) || !['spring', 'rod', 'rope', 'hinge', 'weld'].includes(src.kind)) { skipped++; return; }
      const a = src.a && ids.has(src.a) ? src.a : null;
      const b = src.b && ids.has(src.b) ? src.b : null;
      if ((src.a && !a) || (src.b && !b) || (!a && !b)) { skipped++; return; }
      const l = { id: src.id, kind: src.kind, name: String(src.name || 'Link').slice(0, 40), a, la: point(src.la), b, lb: point(src.lb) };
      if (l.kind === 'spring') { l.k = clamp(num(src.k, 50), ...LIMITS.k); l.rest = clamp(num(src.rest, 1), ...LIMITS.rest); l.damping = clamp(num(src.damping, 0), ...LIMITS.damping); }
      if (l.kind === 'rod' || l.kind === 'rope') {
        l.length = clamp(num(src.length, 1), ...LIMITS.length);
        l.solid = !!src.solid;
        l.mass = clamp(num(src.mass, defaultSolidMass(l)), ...LIMITS.mass);
      }
      if (l.kind === 'hinge') {
        l.motor = !!src.motor; l.speed = clamp(num(src.speed, 0), ...LIMITS.speed); l.torque = clamp(num(src.torque, 50), ...LIMITS.torque);
        l.dir = src.dir === 1 || src.dir === -1 ? src.dir : l.speed > 0 ? 1 : -1;
        l.speed = l.dir * Math.abs(l.speed);
      }
      linkIds.add(l.id); track(l.id);
      scene.links.push(l);
    });
    if (data.camera && Number.isFinite(data.camera.scale)) {
      scene.camera = { cx: num(data.camera.cx, 0), cy: num(data.camera.cy, 2), scale: clamp(data.camera.scale, 0.01, 2000) };
    }
    scene.nextId = Math.max(num(data.nextId, 1), maxNum + 1);
    return { scene, skipped };
  }

  PPM.scene = {
    DRAG_MODELS, worldDragModel, objectDragModel, effectiveDragModel, dragCoefficients, dragOverrideNote,
    FORMAT, VERSION, COLORS, COLOR_CYCLE, BODY_KINDS, LINK_KINDS, LIMITS,
    createScene, makeBody, makeLink, newId, nextName,
    vertices, area, extent, toWorld, toLocal, containsPoint, contactSnap, closestSurface, copyFragment, pasteFragment,
    bodyById, linkById, endPoint, rigidGroup, transformBodies, linkLength, refitLengths,
    removeBody, removeLink, bounds, fitBox, serialize, defaultSolidMass, parse, clamp, REST_GAP, restGap
  };
})(typeof window !== 'undefined' ? window : globalThis);
