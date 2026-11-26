// stages.js — the route the camera travels in each wave, like a rail shooter.
//
// A stage is built in its own "stage space". It holds a winding path through a
// valley, a stop for every ambush and a boss arena at the end. The game never moves
// its camera: it places the stage under a rig so that the current point on the
// route sits at the game's origin, facing −z. At a stop the game's frame and the
// stop's own frame are the same, so hiding spots are written in stop coordinates
// (x across, z ahead is negative) and the game spawns monsters there directly.
//
// What the place looks like comes from a kit (stage-kits.js): the shape and colour
// of the land beside the route, the cover, the props and the landmark.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { isDetailed } from './detail.js?v=5';
import { createLowPolyTree, createLowPolyRock } from './lowpoly.js?v=5';
import { createStageKit } from './stage-kits.js?v=5';

// The flat, clear ground each stop needs, in its own frame. Bosses walk in from far away.
const ARENA = { halfWidth: 13, minZ: -30, maxZ: 16 };
const BOSS_ARENA = { halfWidth: 16, minZ: -64, maxZ: 16 };
const PATH_HALF_WIDTH = 2.8;
const CORRIDOR_HALF_WIDTH = 9;
// Ground facet size: finer at full detail (detail.js).
const CELL_COARSE = 2.5;
const CELL_FINE = 1.6;
const cellSize = () => (isDetailed() ? CELL_FINE : CELL_COARSE);
// A leg with a crossing (a river, a chasm, a gap between islands) is this much longer,
// which leaves room for it between one stop's arena and the next.
const CROSSING_EXTRA = 18;
// The leg into a kit's late part is this much longer where the kit asks for a ride
// (the mine cart), so the ride has somewhere to go.
const RIDE_EXTRA = 90;
const GROUND_Y = -0.1;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function valueNoise(x, z, seed) {
  const hash = (ix, iz) => {
    const v = Math.sin(ix * 127.1 + iz * 311.7 + seed * 74.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz);
  const b = hash(ix + 1, iz);
  const c = hash(ix, iz + 1);
  const d = hash(ix + 1, iz + 1);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}

// Stop frame → stage space. Forward (z = −1 in the frame) is (−sin yaw, 0, −cos yaw).
function frameToStage(pose, x, z, target = new THREE.Vector3()) {
  const c = Math.cos(pose.yaw);
  const s = Math.sin(pose.yaw);
  return target.set(pose.x + x * c + z * s, 0, pose.z - x * s + z * c);
}

function stageToFrame(pose, px, pz) {
  const dx = px - pose.x;
  const dz = pz - pose.z;
  const c = Math.cos(pose.yaw);
  const s = Math.sin(pose.yaw);
  return { x: dx * c - dz * s, z: dx * s + dz * c };
}

function yawOfTangent(tangent) {
  return Math.atan2(-tangent.x, -tangent.z);
}

// ── Terrain ────────────────────────────────────────────────────────────────

// A sheet of triangles over `bounds`. `faceKind` may name one of `extras` (fixed
// colours a kit adds to the palette's path, grass and patch); `skip` leaves a face
// out; `flip` turns the sheet to face down, for a roof.
function createStageTerrain({ bounds, heightAt, isPath, seed, cell = cellSize(), faceKind = null, extras = null, skip = null, flip = false }) {
  const columns = Math.ceil((bounds.maxX - bounds.minX) / cell);
  const rows = Math.ceil((bounds.maxZ - bounds.minZ) / cell);
  const hash = (a, b, c) => {
    const v = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + seed * 13.3) * 43758.5453;
    return v - Math.floor(v);
  };
  // Heights are worked out once per grid point.
  const stride = columns + 1;
  const grid = new Float32Array(stride * (rows + 1) * 3);
  for (let iz = 0; iz <= rows; iz += 1) {
    for (let ix = 0; ix <= columns; ix += 1) {
      let x = bounds.minX + ix * cell;
      let z = bounds.minZ + iz * cell;
      const edge = ix === 0 || iz === 0 || ix === columns || iz === rows;
      if (!edge) {
        x += (hash(ix, iz, 1) - 0.5) * cell * 0.4;
        z += (hash(ix, iz, 2) - 0.5) * cell * 0.4;
      }
      const at = (iz * stride + ix) * 3;
      grid[at] = x;
      grid[at + 1] = heightAt(x, z);
      grid[at + 2] = z;
    }
  }

  const positions = [];
  const faces = [];
  for (let iz = 0; iz < rows; iz += 1) {
    for (let ix = 0; ix < columns; ix += 1) {
      const corners = [iz * stride + ix, iz * stride + ix + 1, (iz + 1) * stride + ix + 1, (iz + 1) * stride + ix];
      // Winding keeps the faces pointing up (counter-clockwise seen from above, +z toward the viewer).
      const split = (ix + iz) % 2 === 0 ? [[0, 3, 1], [1, 3, 2]] : [[0, 2, 1], [0, 3, 2]];
      for (const triangle of split) {
        const [a, b, c] = flip ? [triangle[0], triangle[2], triangle[1]] : triangle;
        const pa = corners[a] * 3;
        const pb = corners[b] * 3;
        const pc = corners[c] * 3;
        const cx = (grid[pa] + grid[pb] + grid[pc]) / 3;
        const cy = (grid[pa + 1] + grid[pb + 1] + grid[pc + 1]) / 3;
        const cz = (grid[pa + 2] + grid[pb + 2] + grid[pc + 2]) / 3;
        if (skip && skip(cx, cy, cz)) continue;
        for (const p of [pa, pb, pc]) positions.push(grid[p], grid[p + 1], grid[p + 2]);
        const onRoad = isPath(cx, cz);
        const faceSeed = hash(ix, iz, a + b * 3 + 5);
        faces.push({ onRoad, height: cy, patchNoise: valueNoise(cx * 0.19, cz * 0.19, seed + 5), seed: faceSeed, kind: faceKind ? faceKind({ x: cx, y: cy, z: cz, onPath: onRoad, seed: faceSeed }) : null });
      }
    }
  }

  const colors = new Float32Array(positions.length);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = !flip;

  let blendFrom = null;
  let blendTo = null;
  const color = new THREE.Color();
  const fill = (target, { path, grass, patch, tone = 1 }) => {
    faces.forEach((face, index) => {
      const extra = face.kind && extras ? extras[face.kind] : null;
      if (extra) color.setHSL(extra.h, extra.s, extra.l + (face.seed - 0.5) * (extra.vary ?? 0.06));
      else if (face.onRoad) color.setHSL(path.h, path.s, path.l + (face.seed - 0.5) * 0.04);
      else if (face.patchNoise > 0.65) color.setHSL(patch.h, patch.s, patch.l);
      else color.setHSL(grass.h, grass.s, grass.l + (face.seed - 0.5) * 0.055 - Math.min(0.08, Math.max(0, face.height) * 0.006));
      color.multiplyScalar(tone);
      for (let corner = 0; corner < 3; corner += 1) color.toArray(target, index * 9 + corner * 3);
    });
  };

  return {
    mesh,
    recolor(spec) {
      fill(colors, spec);
      geometry.attributes.color.needsUpdate = true;
    },
    startBlend(spec) {
      blendFrom = colors.slice();
      blendTo = new Float32Array(colors.length);
      fill(blendTo, spec);
    },
    blend(amount) {
      if (!blendFrom) return;
      for (let index = 0; index < colors.length; index += 1) {
        colors[index] = blendFrom[index] + (blendTo[index] - blendFrom[index]) * amount;
      }
      geometry.attributes.color.needsUpdate = true;
    },
  };
}

// Static props are merged into one mesh per material, so a stage costs a handful of draw calls.
function mergeStatic(root, castShadow = true) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  const inverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const matrix = new THREE.Matrix4();
  root.traverse((child) => {
    if (!child.isMesh) return;
    matrix.multiplyMatrices(inverse, child.matrixWorld);
    let geometry = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
    for (const name of Object.keys(geometry.attributes)) {
      if (name !== 'position' && name !== 'normal') geometry.deleteAttribute(name);
    }
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    geometry.applyMatrix4(matrix);
    const list = buckets.get(child.material) || [];
    list.push(geometry);
    buckets.set(child.material, list);
  });
  const merged = new THREE.Group();
  for (const [material, geometries] of buckets) {
    const mesh = new THREE.Mesh(mergeGeometries(geometries, false), material);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    merged.add(mesh);
    for (const geometry of geometries) geometry.dispose();
  }
  return merged;
}

function disposeTree(root, keepMaterials) {
  root.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material && !keepMaterials.has(child.material)) {
      (Array.isArray(child.material) ? child.material : [child.material]).forEach((material) => material.dispose());
    }
  });
}

// ── Stage ──────────────────────────────────────────────────────────────────

// burstCount ambush stops, then the boss arena. `materials` are the scene's shared
// tree and rock materials, so the palette recolours the stage's trees as well. `kit`
// chooses the scenery (chapters.js).
export function createStage({ seed = 1, burstCount = 4, materials, kit: kitName = 'meadow' }) {
  const random = mulberry32(seed * 9973 + 17);
  const kit = createStageKit(kitName);
  const mats = kit.materials();
  const keepMaterials = new Set([materials.trunk, ...materials.leaves, materials.rock]);
  const group = new THREE.Group();

  // Route: a short first leg so the first ambush comes quickly, then legs that bend
  // alternately left and right, then a long straight run for the boss.
  const points = [new THREE.Vector3(0, 0, 24), new THREE.Vector3(0, 0, 0)];
  let heading = 0;
  let side = random() < 0.5 ? -1 : 1;
  const legLengths = [16];
  for (let index = 1; index < burstCount; index += 1) legLengths.push(30 + random() * 8);
  legLengths.push(36);
  // A kit with a late part (the mine) changes over on the leg into stop `lateStop`;
  // the crossing goes on some other leg.
  const lateStop = kit.late ? Math.max(1, Math.floor(burstCount / 2)) : -1;
  // It keeps off the leg into the boss arena where it can: the bridge fight there
  // would come after the wave's last ambush.
  let crossingLegs = [];
  for (let leg = 1; leg < legLengths.length; leg += 1) if (leg !== lateStop) crossingLegs.push(leg);
  if (crossingLegs.length > 1) crossingLegs = crossingLegs.filter(leg => leg < legLengths.length - 1);
  const crossingLeg = kit.crossing && crossingLegs.length > 0 ? crossingLegs[Math.floor(random() * crossingLegs.length)] : -1;
  if (crossingLeg > 0) legLengths[crossingLeg] += CROSSING_EXTRA;
  if (lateStop > 0 && kit.ride) legLengths[lateStop] += RIDE_EXTRA;
  for (let leg = 0; leg < legLengths.length; leg += 1) {
    const bend = leg === legLengths.length - 1 ? side * 0.25 : side * (0.35 + random() * 0.35);
    heading += bend;
    side = -side;
    const last = points[points.length - 1];
    const length = legLengths[leg];
    // A midpoint makes each leg a gentle curve rather than a kink.
    const midHeading = heading - bend * 0.5;
    const mid = last.clone().add(new THREE.Vector3(-Math.sin(midHeading), 0, -Math.cos(midHeading)).multiplyScalar(length * 0.5));
    const end = mid.clone().add(new THREE.Vector3(-Math.sin(heading), 0, -Math.cos(heading)).multiplyScalar(length * 0.5));
    points.push(mid, end);
  }
  const bossHeading = heading;
  const bossForward = new THREE.Vector3(-Math.sin(bossHeading), 0, -Math.cos(bossHeading)).multiplyScalar(30);
  for (let index = 0; index < 3; index += 1) points.push(points[points.length - 1].clone().add(bossForward));
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const length = curve.getLength();
  const samples = curve.getSpacedPoints(Math.ceil(length / 2));

  // The arc length of each stop: every other point after the start is a stop.
  const lengths = curve.getLengths(points.length * 40);
  const arcOfPoint = (pointIndex) => {
    // getLengths is uniform in the curve's parameter; the points sit at t = i / (n − 1).
    const t = pointIndex / (points.length - 1);
    return lengths[Math.round(t * (lengths.length - 1))];
  };
  const poseAtArc = (arc, turn = 0) => {
    const u = THREE.MathUtils.clamp(arc / length, 0, 1);
    const point = curve.getPointAt(u);
    const tangent = curve.getTangentAt(u);
    return { x: point.x, z: point.z, yaw: yawOfTangent(tangent) + turn, arc };
  };

  const stops = [];
  for (let leg = 0; leg < legLengths.length; leg += 1) {
    const isBoss = leg === legLengths.length - 1;
    const arc = arcOfPoint(1 + (leg + 1) * 2);
    const turn = isBoss ? 0 : (random() < 0.5 ? -1 : 1) * (0.12 + random() * 0.28);
    stops.push({ arc, turn, isBoss, pose: poseAtArc(arc, turn), spots: [] });
  }
  const startArc = arcOfPoint(1);
  const startPose = poseAtArc(startArc);

  const arenaOf = (stop) => (stop.isBoss ? BOSS_ARENA : ARENA);
  // How far a stage point lies outside every arena (0 inside one).
  const arenaDistance = (px, pz) => {
    let best = Infinity;
    for (const stop of [{ pose: startPose, isBoss: false }, ...stops]) {
      const local = stageToFrame(stop.pose, px, pz);
      const arena = arenaOf(stop);
      const dx = Math.max(0, Math.abs(local.x) - arena.halfWidth);
      const dz = Math.max(0, arena.minZ - local.z, local.z - arena.maxZ);
      best = Math.min(best, Math.hypot(dx, dz));
    }
    return best;
  };
  // Distance to the route, and (in nearestArc) how far along it the nearest point is.
  let nearestArc = 0;
  const routeDistance = (px, pz) => {
    let best = Infinity;
    let bestIndex = 0;
    for (let index = 0; index < samples.length; index += 1) {
      const sample = samples[index];
      const d = (sample.x - px) ** 2 + (sample.z - pz) ** 2;
      if (d < best) {
        best = d;
        bestIndex = index;
      }
    }
    nearestArc = (bestIndex / (samples.length - 1)) * length;
    return Math.sqrt(best);
  };
  // Where the late part begins: past the ambush before it, at the next stop's doorstep.
  const lateArc = lateStop > 0 ? stops[lateStop - 1].arc + 23 : Infinity;
  const isLate = (px, pz) => {
    routeDistance(px, pz);
    return nearestArc > lateArc;
  };
  const openness = (px, pz) => Math.min(routeDistance(px, pz) - CORRIDOR_HALF_WIDTH, arenaDistance(px, pz));

  // The crossing sits in the gap between the arenas of its leg's two stops. Its own
  // frame has the path along z and the river (or chasm, or gap) along x.
  let crossing = null;
  if (crossingLeg > 0) {
    const arc = (stops[crossingLeg - 1].arc - ARENA.minZ + stops[crossingLeg].arc - ARENA.maxZ) / 2;
    const pose = poseAtArc(arc);
    const { halfWidth, meander = 0 } = kit.crossing;
    const phase = random() * Math.PI * 2;
    // The line wanders away from the path, and stays straight where the bridge is.
    const drift = (s) => Math.sin(s * 0.055 + phase) * meander * THREE.MathUtils.smoothstep(Math.abs(s), 8, 30);
    crossing = {
      arc,
      pose,
      yaw: pose.yaw,
      halfWidth,
      // Stage point at `s` along the line and `d` across it (positive d is the near bank).
      point: (s, d, target = new THREE.Vector3()) => frameToStage(pose, s, d + drift(s), target),
      // Signed distance across the line of a stage point.
      across: (px, pz) => {
        const local = stageToFrame(pose, px, pz);
        return local.z - drift(local.x);
      },
    };
  }

  const heightAt = (px, pz) => {
    const away = openness(px, pz);
    const late = nearestArc > lateArc;
    const bump = (valueNoise(px * 0.21, pz * 0.21, seed) - 0.5) * 0.12;
    const base = GROUND_Y + bump;
    let height = base;
    if (away > 0) {
      height = kit.hills({ away, base, bump, late, x: px, z: pz, noise: (frequency, salt) => valueNoise(px * frequency, pz * frequency, seed + salt) });
    }
    if (crossing) {
      // The cut fades out where it would run into an arena.
      const mask = THREE.MathUtils.smoothstep(arenaDistance(px, pz), 0, 3);
      if (mask > 0) height += (kit.crossing.carve(height, crossing.across(px, pz)) - height) * mask;
    }
    return height;
  };

  const bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  const grow = (x, z) => {
    bounds.minX = Math.min(bounds.minX, x); bounds.maxX = Math.max(bounds.maxX, x);
    bounds.minZ = Math.min(bounds.minZ, z); bounds.maxZ = Math.max(bounds.maxZ, z);
  };
  for (const sample of samples) grow(sample.x, sample.z);
  for (const stop of stops) {
    const arena = arenaOf(stop);
    for (const [x, z] of [[-arena.halfWidth, arena.minZ], [arena.halfWidth, arena.minZ], [-arena.halfWidth, arena.maxZ], [arena.halfWidth, arena.maxZ]]) {
      const p = frameToStage(stop.pose, x, z);
      grow(p.x, p.z);
    }
  }
  const margin = 44;
  bounds.minX -= margin; bounds.maxX += margin; bounds.minZ -= margin; bounds.maxZ += margin;

  const isPath = (x, z) => routeDistance(x, z) < PATH_HALF_WIDTH;
  const ground = createStageTerrain({
    bounds,
    heightAt,
    isPath,
    seed,
    faceKind: kit.faceKind ? (face) => kit.faceKind({ ...face, late: isLate(face.x, face.z) }) : null,
    extras: kit.ground || null,
    skip: kit.skipBelow != null || kit.skip
      ? (x, y, z) => (kit.skipBelow != null && y < kit.skipBelow) || (kit.skip ? kit.skip({ x, y, z, late: isLate(x, z) }) : false)
      : null,
  });
  group.add(ground.mesh);
  const sheets = [ground];
  if (kit.roof) {
    const roofHeight = (px, pz) => kit.roof.height({ x: px, z: pz, noise: (frequency, salt) => valueNoise(px * frequency, pz * frequency, seed + salt) });
    const roof = createStageTerrain({
      bounds,
      heightAt: roofHeight,
      isPath: () => false,
      seed: seed + 1,
      cell: cellSize() * 1.6,
      faceKind: () => kit.roof.kind,
      extras: kit.ground,
      // Leave out the roof where it would lie inside the rock, or over open sky.
      skip: (x, y, z) => heightAt(x, z) > y + 2 || (kit.roof.lateOnly && !isLate(x, z)),
      flip: true,
    });
    group.add(roof.mesh);
    sheets.push(roof);
  }
  // The game recolours and blends the ground as one thing.
  const terrain = {
    recolor: (spec) => sheets.forEach((sheet) => sheet.recolor(spec)),
    startBlend: (spec) => sheets.forEach((sheet) => sheet.startBlend(spec)),
    blend: (amount) => sheets.forEach((sheet) => sheet.blend(amount)),
  };

  const staticRoot = new THREE.Group();
  const animated = [];
  const occupied = [];
  const isFree = (x, z, radius) => occupied.every((o) => (o.x - x) ** 2 + (o.z - z) ** 2 > (o.r + radius) ** 2);
  const occupy = (x, z, radius) => occupied.push({ x, z, r: radius });
  const place = (object, x, z, radius, rotation = random() * Math.PI * 2) => {
    object.position.set(x, heightAt(x, z) - 0.05, z);
    object.rotation.y = rotation;
    staticRoot.add(object);
    occupy(x, z, radius);
    return object;
  };
  const tree = (kind, scale) => {
    const built = createLowPolyTree({ kind, trunkMaterial: materials.trunk, leafMaterials: materials.leaves, seed: Math.floor(random() * 1e6) });
    built.scale.setScalar(scale);
    return built;
  };
  const ctx = {
    random, mats, shared: materials,
    stops, bossStop: stops[stops.length - 1], length, crossing, lateArc,
    poseAtArc, heightAt, routeDistance, openness, arenaDistance, isFree, isLate, occupy, place, tree,
    at: frameToStage,
    rock: (scale) => {
      const rock = createLowPolyRock(materials.rock, Math.floor(random() * 1000));
      rock.scale.multiplyScalar(scale);
      return rock;
    },
    // A static prop at a given height, with no claim on the ground around it.
    set: (object, x, y, z, rotation = 0) => {
      object.position.set(x, y, z);
      object.rotation.y = rotation;
      staticRoot.add(object);
      return object;
    },
    // Something that moves stays out of the merged meshes.
    live: (object) => group.add(object),
    animate: (step) => animated.push(step),
    merge: (root, castShadow = true) => {
      const merged = mergeStatic(root, castShadow);
      disposeTree(root, new Set([...keepMaterials, ...Object.values(mats)]));
      return merged;
    },
  };

  // Hiding spots for each ambush stop, with the cover that hides them.
  for (const stop of stops) {
    if (stop.isBoss) continue;
    // A cover marked `where` belongs to one part of the stage only.
    const part = stop.arc > lateArc ? 'late' : 'early';
    const covers = kit.covers.filter((cover) => !cover.where || cover.where === part);
    const narrowCovers = covers.filter((cover) => !cover.wide);
    const sides = random() < 0.5 ? [-1, 1] : [1, -1];
    // Close enough that a monster stepping out is already in the player's face.
    const slots = [
      { x: sides[0] * (7.4 + random() * 1.4), z: -3 - random() * 4 },
      { x: sides[1] * (7.4 + random() * 1.4), z: -6 - random() * 4 },
      { x: sides[0] * (3 + random() * 2), z: -14 - random() * 3 },
    ];
    for (const slot of slots) {
      let cover = covers[Math.floor(random() * covers.length)];
      if (Math.abs(slot.x) < 6 && cover.wide) cover = narrowCovers[Math.floor(random() * narrowCovers.length)];
      const p = frameToStage(stop.pose, slot.x, slot.z);
      // A prop with a front faces the camera's stand point, so a monster can step out toward it.
      const faceYaw = stop.pose.yaw + Math.atan2(-slot.x, 10 - slot.z);
      const built = cover.build(ctx);
      place(built.object, p.x, p.z, built.radius, built.face ? faceYaw : undefined);
      let exit = null;
      if (built.object.userData.doorOffset) {
        const door = built.object.userData.doorOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), faceYaw - stop.pose.yaw);
        exit = { x: slot.x + door.x, z: slot.z + door.z };
      }
      // Monsters wait just behind the cover (further from the camera), out of sight.
      const away = new THREE.Vector2(slot.x, slot.z - 10).normalize();
      stop.spots.push({
        kind: 'cover', prop: cover.kind,
        hideX: exit ? exit.x : slot.x + away.x * 1.3,
        hideZ: exit ? exit.z - 0.6 : slot.z + away.y * 1.3,
        x: exit ? exit.x : slot.x, z: exit ? exit.z : slot.z + 1.4,
      });
    }
    for (let index = 0; index < 2; index += 1) {
      stop.spots.push({ kind: 'ground', x: (random() - 0.5) * 8, z: -3 - random() * 5 });
    }
    stop.spots.push({ kind: 'sky', x: (random() - 0.5) * 6, z: -4 - random() * 4 });
  }

  kit.decorate(ctx);

  // Trees on the slopes, as thick as the kit asks.
  const area = (bounds.maxX - bounds.minX) * (bounds.maxZ - bounds.minZ);
  const treeTries = Math.round(area / kit.treeArea);
  for (let index = 0; index < treeTries; index += 1) {
    const x = bounds.minX + random() * (bounds.maxX - bounds.minX);
    const z = bounds.minZ + random() * (bounds.maxZ - bounds.minZ);
    const open = openness(x, z);
    if (open < 1) continue;
    const choice = kit.tree({ open, height: heightAt(x, z), random, late: nearestArc > lateArc });
    if (!choice || !isFree(x, z, 1.2)) continue;
    place(tree(choice.kind, choice.scale), x, z, 1.2);
  }
  kit.scatter(ctx);

  const merged = mergeStatic(staticRoot);
  group.add(merged);
  disposeTree(staticRoot, new Set([...keepMaterials, ...Object.values(mats)]));

  let triangles = 0;
  group.traverse((child) => {
    if (child.isMesh) triangles += (child.geometry.index ? child.geometry.index.count : child.geometry.attributes.position.count) / 3;
  });

  return {
    group,
    terrain,
    stops,
    startArc,
    length,
    crossing,
    // Where the stage's late part begins (Infinity if it has none).
    lateArc,
    triangles: Math.round(triangles),
    poseAtArc,
    // The pose while travelling from one stop (or the start) to the next, t from 0 to 1.
    travelPose(fromStop, toStop, t) {
      const fromArc = fromStop ? fromStop.arc : startArc;
      const fromTurn = fromStop ? fromStop.turn : 0;
      const eased = t * t * (3 - 2 * t);
      const pose = poseAtArc(fromArc + (toStop.arc - fromArc) * eased);
      pose.yaw += fromTurn + (toStop.turn - fromTurn) * eased;
      return pose;
    },
    update(seconds) {
      for (const step of animated) step(seconds);
    },
    dispose() {
      group.removeFromParent();
      disposeTree(group, keepMaterials);
    },
  };
}
