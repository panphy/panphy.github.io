// stages.js — the route the camera travels in each wave, like a rail shooter.
//
// A stage is built in its own "stage space". It holds a winding path through a
// valley, a stop for every ambush and a boss arena at the end. The game never moves
// its camera: it places the stage under a rig so that the current point on the
// route sits at the game's origin, facing −z. At a stop the game's frame and the
// stop's own frame are the same, so hiding spots are written in stop coordinates
// (x across, z ahead is negative) and the game spawns monsters there directly.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createLowPolyTree, createLowPolyRock } from './lowpoly.js';

// The flat, clear ground each stop needs, in its own frame. Bosses walk in from far away.
const ARENA = { halfWidth: 13, minZ: -30, maxZ: 16 };
const BOSS_ARENA = { halfWidth: 16, minZ: -64, maxZ: 16 };
const PATH_HALF_WIDTH = 2.8;
const CORRIDOR_HALF_WIDTH = 9;
const CELL = 2.5;

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
export function frameToStage(pose, x, z, target = new THREE.Vector3()) {
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

function shadowed(mesh, cast = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  return mesh;
}

// ── Props ──────────────────────────────────────────────────────────────────

function createKitMaterials() {
  const flat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true, ...extra });
  return {
    hay: flat(0xd9b45a),
    hayDark: flat(0xb98d3c),
    wall: flat(0xd8bf94),
    timber: flat(0x6b4a2c),
    roof: flat(0xa5482c),
    roofDark: flat(0x7e3522),
    door: flat(0x4a3220),
    stone: flat(0xb9ae98),
    fence: flat(0x8a6a44),
    bush: flat(0x4f7d3a),
    petalA: flat(0xf2c6d6),
    petalB: flat(0xf6e7a8),
    petalC: flat(0xc9d8f4),
    sail: flat(0xf3ead6),
  };
}

function createHaystack(kit) {
  const group = new THREE.Group();
  const body = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.35, 1.3, 7), kit.hay));
  body.position.y = 0.65;
  const top = shadowed(new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.0, 7), kit.hayDark));
  top.position.y = 1.78;
  group.add(body, top);
  return group;
}

function createCottage(kit, random) {
  const group = new THREE.Group();
  const width = 3.6 + random() * 1.2;
  const depth = 3.0 + random() * 0.8;
  const walls = shadowed(new THREE.Mesh(new THREE.BoxGeometry(width, 2.4, depth), kit.wall));
  walls.position.y = 1.2;
  const roofGeometry = new THREE.CylinderGeometry(0.01, depth * 0.78, width + 0.5, 3, 1);
  const roof = shadowed(new THREE.Mesh(roofGeometry, random() < 0.5 ? kit.roof : kit.roofDark));
  roof.rotation.z = Math.PI / 2;
  roof.rotation.y = 0;
  roof.scale.set(1, 1, 0.72);
  roof.position.y = 2.4 + depth * 0.3;
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.5, 0.1), kit.door);
  door.position.set(-width * 0.18, 0.75, depth / 2 + 0.04);
  const windowPane = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.1), kit.timber);
  windowPane.position.set(width * 0.22, 1.45, depth / 2 + 0.04);
  const chimney = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), kit.stone));
  chimney.position.set(width * 0.3, 3.2, -depth * 0.15);
  group.add(walls, roof, door, windowPane, chimney);
  group.userData.doorOffset = new THREE.Vector3(-width * 0.18, 0, depth / 2 + 0.9);
  return group;
}

function createFence(kit, length) {
  const group = new THREE.Group();
  const posts = Math.max(2, Math.round(length / 1.6) + 1);
  for (let index = 0; index < posts; index += 1) {
    const post = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.0, 0.16), kit.fence));
    post.position.set(-length / 2 + (index / (posts - 1)) * length, 0.5, 0);
    group.add(post);
  }
  for (const y of [0.42, 0.78]) {
    const rail = shadowed(new THREE.Mesh(new THREE.BoxGeometry(length, 0.1, 0.08), kit.fence));
    rail.position.y = y;
    group.add(rail);
  }
  return group;
}

function createBush(kit, random) {
  const group = new THREE.Group();
  const lumps = 2 + Math.floor(random() * 2);
  for (let index = 0; index < lumps; index += 1) {
    const lump = shadowed(new THREE.Mesh(new THREE.IcosahedronGeometry(0.55 + random() * 0.35, 0), kit.bush));
    lump.position.set((index - (lumps - 1) / 2) * 0.7, 0.42, (random() - 0.5) * 0.4);
    lump.rotation.set(random() * 3, random() * 3, random() * 3);
    group.add(lump);
  }
  return group;
}

function createFlowers(kit, random) {
  const group = new THREE.Group();
  const petals = [kit.petalA, kit.petalB, kit.petalC];
  const count = 5 + Math.floor(random() * 5);
  for (let index = 0; index < count; index += 1) {
    const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), petals[Math.floor(random() * 3)]);
    head.position.set((random() - 0.5) * 1.6, 0.28 + random() * 0.2, (random() - 0.5) * 1.6);
    group.add(head);
  }
  return group;
}

function createWindmill(kit) {
  const group = new THREE.Group();
  const tower = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(1.3, 2.2, 8, 8), kit.wall));
  tower.position.y = 4;
  const cap = shadowed(new THREE.Mesh(new THREE.ConeGeometry(1.8, 2.2, 8), kit.roof));
  cap.position.y = 9.1;
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.8, 0.2), kit.door);
  door.position.set(0, 0.9, 2.05);
  group.add(tower, cap, door);
  const hub = new THREE.Group();
  hub.position.set(0, 7.6, 1.75);
  for (let index = 0; index < 4; index += 1) {
    const arm = new THREE.Group();
    arm.rotation.z = (index / 4) * Math.PI * 2;
    const spar = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.18, 5.2, 0.12), kit.timber));
    spar.position.y = 2.6;
    const sail = shadowed(new THREE.Mesh(new THREE.BoxGeometry(1.1, 3.8, 0.05), kit.sail));
    sail.position.set(0.62, 3.1, 0.04);
    arm.add(spar, sail);
    hub.add(arm);
  }
  group.add(hub);
  group.userData.hub = hub;
  return group;
}

// ── Terrain ────────────────────────────────────────────────────────────────

function createStageTerrain({ bounds, heightAt, isPath, seed }) {
  const columns = Math.ceil((bounds.maxX - bounds.minX) / CELL);
  const rows = Math.ceil((bounds.maxZ - bounds.minZ) / CELL);
  const hash = (a, b, c) => {
    const v = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + seed * 13.3) * 43758.5453;
    return v - Math.floor(v);
  };
  const vertex = (ix, iz, target) => {
    let x = bounds.minX + ix * CELL;
    let z = bounds.minZ + iz * CELL;
    const edge = ix === 0 || iz === 0 || ix === columns || iz === rows;
    if (!edge) {
      x += (hash(ix, iz, 1) - 0.5) * CELL * 0.4;
      z += (hash(ix, iz, 2) - 0.5) * CELL * 0.4;
    }
    return target.set(x, heightAt(x, z), z);
  };

  const triangles = columns * rows * 2;
  const positions = new Float32Array(triangles * 9);
  const colors = new Float32Array(triangles * 9);
  const faces = [];
  const corners = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  let offset = 0;
  for (let iz = 0; iz < rows; iz += 1) {
    for (let ix = 0; ix < columns; ix += 1) {
      vertex(ix, iz, corners[0]);
      vertex(ix + 1, iz, corners[1]);
      vertex(ix + 1, iz + 1, corners[2]);
      vertex(ix, iz + 1, corners[3]);
      // Winding keeps the faces pointing up (counter-clockwise seen from above, +z toward the viewer).
      const split = (ix + iz) % 2 === 0 ? [[0, 3, 1], [1, 3, 2]] : [[0, 2, 1], [0, 3, 2]];
      for (const [a, b, c] of split) {
        const cx = (corners[a].x + corners[b].x + corners[c].x) / 3;
        const cz = (corners[a].z + corners[b].z + corners[c].z) / 3;
        const cy = (corners[a].y + corners[b].y + corners[c].y) / 3;
        for (const index of [a, b, c]) {
          positions[offset] = corners[index].x;
          positions[offset + 1] = corners[index].y;
          positions[offset + 2] = corners[index].z;
          offset += 3;
        }
        faces.push({ onRoad: isPath(cx, cz), height: cy, seed: hash(ix, iz, a + b * 3 + 5) });
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;

  let blendFrom = null;
  let blendTo = null;
  const color = new THREE.Color();
  const fill = (target, { path, grass, patch, tone = 1 }) => {
    faces.forEach((face, index) => {
      if (face.onRoad) color.setHSL(path.h, path.s, path.l + (face.seed - 0.5) * 0.07);
      else if (face.seed > 0.82) color.setHSL(patch.h, patch.s, patch.l);
      else color.setHSL(grass.h, grass.s, grass.l + (face.seed - 0.5) * 0.09 - Math.min(0.08, face.height * 0.006));
      color.multiplyScalar(tone);
      for (let corner = 0; corner < 3; corner += 1) color.toArray(target, index * 9 + corner * 3);
    });
  };

  return {
    mesh,
    scroll() {},
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
// tree and rock materials, so seasons recolour the stage's trees as well.
export function createStage({ seed = 1, burstCount = 4, materials }) {
  const random = mulberry32(seed * 9973 + 17);
  const kit = createKitMaterials();
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
    return { x: point.x, z: point.z, yaw: yawOfTangent(tangent) + turn };
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
  const routeDistance = (px, pz) => {
    let best = Infinity;
    for (const sample of samples) {
      const d = (sample.x - px) ** 2 + (sample.z - pz) ** 2;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  };
  const openness = (px, pz) => Math.min(routeDistance(px, pz) - CORRIDOR_HALF_WIDTH, arenaDistance(px, pz));
  const heightAt = (px, pz) => {
    const away = openness(px, pz);
    const bump = (valueNoise(px * 0.21, pz * 0.21, seed) - 0.5) * 0.12;
    if (away <= 0) return -0.1 + bump;
    const rise = THREE.MathUtils.smoothstep(away, 0, 16);
    const hills = 2.5 + valueNoise(px * 0.045, pz * 0.045, seed + 3) * 11 + valueNoise(px * 0.12, pz * 0.12, seed + 7) * 2.5;
    return -0.1 + bump + rise * hills * Math.min(1, 0.4 + away / 40);
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

  const terrain = createStageTerrain({
    bounds,
    heightAt,
    isPath: (x, z) => routeDistance(x, z) < PATH_HALF_WIDTH,
    seed,
  });
  group.add(terrain.mesh);

  const staticRoot = new THREE.Group();
  const animated = [];
  const occupied = [];
  const isFree = (x, z, radius) => occupied.every((o) => (o.x - x) ** 2 + (o.z - z) ** 2 > (o.r + radius) ** 2);
  const place = (object, x, z, radius, rotation = random() * Math.PI * 2) => {
    object.position.set(x, heightAt(x, z) - 0.05, z);
    object.rotation.y = rotation;
    staticRoot.add(object);
    occupied.push({ x, z, r: radius });
    return object;
  };
  const tree = (kind, scale) => {
    const { group: built } = createLowPolyTree({ kind, trunkMaterial: materials.trunk, leafMaterials: materials.leaves, seed: Math.floor(random() * 1e6) });
    built.scale.setScalar(scale);
    return built;
  };

  // Hiding spots for each ambush stop, with the cover that hides them.
  const COVER_KINDS = ['tree', 'haystack', 'cottage', 'bush', 'rock'];
  for (const stop of stops) {
    if (stop.isBoss) continue;
    const sides = random() < 0.5 ? [-1, 1] : [1, -1];
    // Close enough that a monster stepping out is already in the player's face.
    const slots = [
      { x: sides[0] * (7.4 + random() * 1.4), z: -3 - random() * 4 },
      { x: sides[1] * (7.4 + random() * 1.4), z: -6 - random() * 4 },
      { x: sides[0] * (3 + random() * 2), z: -14 - random() * 3 },
    ];
    for (const slot of slots) {
      let kind = COVER_KINDS[Math.floor(random() * COVER_KINDS.length)];
      if (Math.abs(slot.x) < 6 && kind === 'cottage') kind = 'haystack';
      const p = frameToStage(stop.pose, slot.x, slot.z);
      // Each prop faces the camera's stand point, so a monster can step out toward it.
      const faceYaw = stop.pose.yaw + Math.atan2(-slot.x, 10 - slot.z);
      let exit = { x: slot.x, z: slot.z + 1.4 };
      if (kind === 'tree') place(tree('round', 1.7 + random() * 0.4), p.x, p.z, 1.6);
      else if (kind === 'haystack') place(createHaystack(kit), p.x, p.z, 1.6);
      else if (kind === 'bush') place(createBush(kit, random), p.x, p.z, 1.2);
      else if (kind === 'rock') {
        const rock = createLowPolyRock(materials.rock, Math.floor(random() * 1000));
        rock.scale.multiplyScalar(2.4);
        place(rock, p.x, p.z, 1.6);
      } else {
        const cottage = createCottage(kit, random);
        place(cottage, p.x, p.z, 3.2, faceYaw);
        const door = cottage.userData.doorOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), faceYaw - stop.pose.yaw);
        exit = { x: slot.x + door.x, z: slot.z + door.z };
      }
      // Monsters wait just behind the cover (further from the camera), out of sight.
      const away = new THREE.Vector2(slot.x, slot.z - 10).normalize();
      stop.spots.push({
        kind: 'cover', prop: kind,
        hideX: kind === 'cottage' ? exit.x : slot.x + away.x * 1.3,
        hideZ: kind === 'cottage' ? exit.z - 0.6 : slot.z + away.y * 1.3,
        x: exit.x, z: exit.z,
      });
    }
    for (let index = 0; index < 2; index += 1) {
      stop.spots.push({ kind: 'ground', x: (random() - 0.5) * 8, z: -3 - random() * 5 });
    }
    stop.spots.push({ kind: 'sky', x: (random() - 0.5) * 6, z: -4 - random() * 4 });
  }

  // Fences along the path, outside the arenas.
  for (let arc = 6; arc < length - 40; arc += 4.2) {
    if (random() < 0.35) continue;
    const pose = poseAtArc(arc);
    for (const sideSign of [-1, 1]) {
      if (random() < 0.4) continue;
      const p = frameToStage(pose, sideSign * 6.6, 0);
      if (arenaDistance(p.x, p.z) < 1.5 || !isFree(p.x, p.z, 1.2)) continue;
      place(createFence(kit, 3.6), p.x, p.z, 1.0, pose.yaw);
    }
  }

  // The village: cottages beside the path between stops, and a windmill over the boss arena.
  const bossStop = stops[stops.length - 1];
  const millPoint = frameToStage(bossStop.pose, 22 * (random() < 0.5 ? -1 : 1), -40);
  const windmill = createWindmill(kit);
  windmill.position.set(millPoint.x, heightAt(millPoint.x, millPoint.z) - 0.1, millPoint.z);
  windmill.rotation.y = bossStop.pose.yaw + Math.atan2(-millPoint.x + bossStop.pose.x, 1);
  group.add(windmill);
  occupied.push({ x: millPoint.x, z: millPoint.z, r: 4 });
  animated.push((seconds) => { windmill.userData.hub.rotation.z = seconds * 0.45; });

  for (let arc = 20; arc < length - 60; arc += 18 + random() * 14) {
    const pose = poseAtArc(arc);
    const sideSign = random() < 0.5 ? -1 : 1;
    const p = frameToStage(pose, sideSign * (14 + random() * 6), (random() - 0.5) * 6);
    if (arenaDistance(p.x, p.z) < 3 || !isFree(p.x, p.z, 3.5)) continue;
    place(createCottage(kit, random), p.x, p.z, 3.5, pose.yaw + (sideSign < 0 ? -Math.PI / 2 : Math.PI / 2));
  }

  // Woods on the slopes, thick enough to close the view; flowers and bushes near the path.
  const area = (bounds.maxX - bounds.minX) * (bounds.maxZ - bounds.minZ);
  // Trees thin out past the first ridge, where the hills hide most of them anyway.
  const treeTries = Math.round(area / 30);
  for (let index = 0; index < treeTries; index += 1) {
    const x = bounds.minX + random() * (bounds.maxX - bounds.minX);
    const z = bounds.minZ + random() * (bounds.maxZ - bounds.minZ);
    const open = openness(x, z);
    if (open < 1.5) continue;
    const density = open < 22 ? Math.min(0.85, 0.3 + open / 16) : Math.max(0.08, 0.85 - (open - 22) / 20);
    if (random() > density) continue;
    if (!isFree(x, z, 1.2)) continue;
    place(tree(random() < 0.35 ? 'pine' : 'round', 1.1 + random() * 0.9), x, z, 1.2);
  }
  for (let index = 0; index < length / 2.2; index += 1) {
    const pose = poseAtArc(random() * length);
    const p = frameToStage(pose, (random() < 0.5 ? -1 : 1) * (3.6 + random() * 8), 0);
    if (!isFree(p.x, p.z, 0.8)) continue;
    // Bushes stay out of the arenas, where they would hide monsters coming up from the ground.
    const isBush = random() >= 0.7;
    if (isBush && arenaDistance(p.x, p.z) < 1) continue;
    const decor = isBush ? createBush(kit, random) : createFlowers(kit, random);
    decor.position.set(p.x, heightAt(p.x, p.z) - 0.05, p.z);
    staticRoot.add(decor);
  }

  group.add(mergeStatic(staticRoot));
  disposeTree(staticRoot, new Set([...keepMaterials, ...Object.values(kit)]));

  return {
    group,
    terrain,
    stops,
    startArc,
    length,
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
