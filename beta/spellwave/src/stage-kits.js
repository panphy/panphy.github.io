// stage-kits.js — the scenery of each chapter. stages.js lays out the route, the
// stops and the ground; a kit shapes the land beside the route, colours it, supplies
// the cover monsters hide behind and dresses the stage with props and a landmark.
//
// Nothing here adds a light: glows are emissive materials, so the light count never
// changes between stages. A kit's own materials are made per stage and disposed with it.
import * as THREE from 'three';
import { roundSides, polyDetail, roughen } from './detail.js?v=beta33';

const flat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true, ...extra });
const lit = (color, intensity = 1.6, extra = {}) => flat(color, { emissive: color, emissiveIntensity: intensity, roughness: 0.5, ...extra });

function part(geometry, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
const box = (material, w, h, d, x, y, z) => part(new THREE.BoxGeometry(w, h, d), material, x, y, z);
// Round things get more sides than the sketch asks for; three- and four-sided shapes
// (spires, obelisks, tubs) are deliberate and stay as written.
const rounder = (sides) => roundSides(sides);
const cyl = (material, top, bottom, h, sides, x, y, z) => part(new THREE.CylinderGeometry(top, bottom, h, rounder(sides)), material, x, y, z);
const cone = (material, r, h, sides, x, y, z) => part(new THREE.ConeGeometry(r, h, rounder(sides)), material, x, y, z);
const ico = (material, r, x, y, z) => part(roughen(new THREE.IcosahedronGeometry(r, polyDetail(0)), 0.1, Math.round(r * 97 + x * 13 + z * 7)), material, x, y, z);
// A rounder lump, for the few big shapes seen close up (ico is for scattered clutter).
const ball = (material, r, x, y, z) => part(new THREE.IcosahedronGeometry(r, polyDetail(1)), material, x, y, z);
const octa = (material, r, x, y, z) => part(new THREE.OctahedronGeometry(r, 0), material, x, y, z);
const dodeca = (material, r, x, y, z) => part(new THREE.DodecahedronGeometry(r, 0), material, x, y, z);

function groupOf(...children) {
  const group = new THREE.Group();
  group.add(...children);
  return group;
}

function tilt(mesh, random, amount = 3) {
  mesh.rotation.set(random() * amount, random() * amount, random() * amount);
  return mesh;
}

const sideOf = (random) => (random() < 0.5 ? -1 : 1);

// ── Props shared by several kits ───────────────────────────────────────────

// A few leaning shards. `materials` may be one material or a list to mix.
function createCrystals(materials, random, size = 1, count = 4) {
  const list = Array.isArray(materials) ? materials : [materials];
  const group = new THREE.Group();
  for (let index = 0; index < count; index += 1) {
    const height = (index === 0 ? 1.5 : 0.6 + random() * 0.8) * size;
    const shard = octa(list[Math.floor(random() * list.length)], 0.3 * size, 0, 0, 0);
    shard.scale.set(1, height / (0.3 * size), 1);
    const reach = index === 0 ? 0 : (0.35 + random() * 0.35) * size;
    const angle = random() * Math.PI * 2;
    shard.position.set(Math.cos(angle) * reach, height * 0.75, Math.sin(angle) * reach);
    shard.rotation.set((random() - 0.5) * 0.7, random() * 3, (random() - 0.5) * 0.7);
    group.add(shard);
  }
  return group;
}

function createRockPile(material, random, size = 1) {
  const group = new THREE.Group();
  const specs = [[0, 0.75, 0, 1.15], [0.95, 0.45, 0.3, 0.75], [-0.85, 0.4, -0.2, 0.7], [0.1, 1.5, -0.1, 0.6]];
  for (const [x, y, z, r] of specs) {
    const rock = tilt(dodeca(material, r * size, x * size, y * size, z * size), random);
    rock.scale.y = 0.85;
    group.add(rock);
  }
  return group;
}

function createTorch(mats, height = 2.2) {
  const post = cyl(mats.timber, 0.07, 0.1, height, 5, 0, height / 2, 0);
  const cup = cyl(mats.iron || mats.timber, 0.18, 0.1, 0.18, 6, 0, height + 0.05, 0);
  const flame = octa(mats.flame, 0.2, 0, height + 0.38, 0);
  flame.scale.set(1, 1.7, 1);
  return groupOf(post, cup, flame);
}

function createCrateStack(mats, random) {
  const group = new THREE.Group();
  const spots = [[-0.55, 0.5, 0], [0.6, 0.5, 0.15], [0, 1.5, 0.05]];
  for (const [x, y, z] of spots) {
    const crate = box(mats.plank, 1.0, 1.0, 1.0, x, y, z);
    crate.rotation.y = (random() - 0.5) * 0.5;
    group.add(crate);
    const band = box(mats.timber, 1.04, 0.14, 1.04, x, y, z);
    band.rotation.y = crate.rotation.y;
    group.add(band);
  }
  return group;
}

function createLogPile(mats, random) {
  const group = new THREE.Group();
  const rows = [[-0.7, 0.35], [0, 0.35], [0.7, 0.35], [-0.35, 0.95], [0.35, 0.95], [0, 1.55]];
  for (const [x, y] of rows) {
    const log = cyl(mats.timber, 0.34, 0.34, 2.6 + random() * 0.4, 6, x, y, 0);
    log.rotation.x = Math.PI / 2;
    group.add(log);
    const end = cyl(mats.plank, 0.26, 0.26, 2.7 + random() * 0.3, 6, x, y, 0);
    end.rotation.x = Math.PI / 2;
    group.add(end);
  }
  group.rotation.y = Math.PI / 2;
  return groupOf(group);
}

// A triangular prism with its ridge along x: a pitched roof.
function createGableGeometry(length, span, rise) {
  const x = length / 2;
  const z = span / 2;
  const corners = {
    lf: [-x, 0, z], rf: [x, 0, z], lb: [-x, 0, -z], rb: [x, 0, -z], lt: [-x, rise, 0], rt: [x, rise, 0],
  };
  const faces = [
    ['lf', 'rf', 'rt'], ['lf', 'rt', 'lt'], // front slope
    ['rb', 'lb', 'lt'], ['rb', 'lt', 'rt'], // back slope
    ['lb', 'lf', 'lt'], ['rf', 'rb', 'rt'], // gable ends
    ['lb', 'rb', 'rf'], ['lb', 'rf', 'lf'], // underside
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(faces.flat().flatMap((key) => corners[key]), 3));
  geometry.computeVertexNormals();
  return geometry;
}

// A small building with a door on its +z side; `doorOffset` is where a monster steps out.
// Stone footing, timber corner posts, a pitched roof with eaves, shuttered windows and a chimney.
function createHut(mats, random, { width = 3.6, depth = 3.0, height = 2.4, roofMaterial, chimney = true }) {
  const group = new THREE.Group();
  const trim = mats.timber;
  const footing = mats.stone || mats.timber;
  group.add(box(footing, width + 0.24, 0.4, depth + 0.24, 0, 0.2, 0));
  group.add(box(mats.wall, width, height, depth, 0, height / 2 + 0.2, 0));
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) group.add(box(trim, 0.2, height, 0.2, x * (width / 2), height / 2 + 0.2, z * (depth / 2)));
  }
  group.add(box(trim, width + 0.2, 0.18, depth + 0.2, 0, height + 0.2, 0));

  const rise = depth * 0.62;
  const roofY = height + 0.28;
  group.add(part(createGableGeometry(width + 0.9, depth + 1.0, rise + 0.2), roofMaterial, 0, roofY, 0));
  // The gable walls fill the triangle under the roof, set just inside its ends.
  group.add(part(createGableGeometry(width, depth, rise - 0.12), mats.wall, 0, roofY, 0));
  group.add(box(trim, width + 1.0, 0.16, 0.22, 0, roofY + rise + 0.16, 0));

  const doorX = -width * 0.18;
  const front = depth / 2;
  // The door stands on the footing, and each layer sits clear of the one behind it:
  // faces that share a plane flicker.
  group.add(box(trim, 1.16, 1.78, 0.12, doorX, 1.29, front + 0.02));
  group.add(box(mats.door, 0.9, 1.62, 0.12, doorX, 1.21, front + 0.07));
  group.add(box(trim, 0.08, 0.2, 0.06, doorX + 0.3, 1.2, front + 0.15));
  group.add(box(footing, 1.5, 0.28, 0.7, doorX, 0.14, front + 0.4));
  const window = (x, y, z, rotation) => {
    const frame = groupOf(
      box(trim, 0.92, 0.82, 0.08, 0, 0, 0),
      box(mats.pane || mats.door, 0.7, 0.6, 0.1, 0, 0, 0.02),
      box(trim, 0.06, 0.6, 0.12, 0, 0, 0.03),
      box(trim, 0.7, 0.06, 0.12, 0, 0, 0.03),
      box(roofMaterial, 0.22, 0.74, 0.07, -0.6, 0, 0.02),
      box(roofMaterial, 0.22, 0.74, 0.07, 0.6, 0, 0.02),
      box(trim, 1.0, 0.08, 0.2, 0, -0.44, 0.06),
    );
    frame.position.set(x, y, z);
    frame.rotation.y = rotation;
    group.add(frame);
  };
  window(width * 0.24, height * 0.62 + 0.2, front + 0.03, 0);
  window(width / 2 + 0.03, height * 0.62 + 0.2, 0, Math.PI / 2);
  window(-width / 2 - 0.03, height * 0.62 + 0.2, 0, -Math.PI / 2);
  if (chimney) {
    const x = width * 0.28;
    group.add(box(footing, 0.6, rise + 0.9, 0.6, x, roofY + (rise + 0.9) / 2 - 0.1, -depth * 0.2));
    group.add(box(trim, 0.74, 0.14, 0.74, x, roofY + rise + 0.82, -depth * 0.2));
  }
  group.userData.doorOffset = new THREE.Vector3(doorX, 0, depth / 2 + 0.9);
  return group;
}

// A plank deck lying along z, for a path crossing a gap.
function createBridge(mats, span, width = 6.2, { rope = false } = {}) {
  const group = new THREE.Group();
  const planks = Math.round(span / 0.72);
  for (let index = 0; index < planks; index += 1) {
    const z = -span / 2 + (index + 0.5) * (span / planks);
    const plank = box(mats.plank, width, 0.14, span / planks - 0.08, 0, -0.03 + (index % 2) * 0.02, z);
    plank.rotation.y = ((index * 7) % 5 - 2) * 0.006;
    group.add(plank);
  }
  for (const x of [-width / 2 + 0.5, width / 2 - 0.5]) group.add(box(mats.timber, 0.3, 0.34, span + 0.6, x, -0.28, 0));
  const posts = Math.max(2, Math.round(span / 2.4) + 1);
  for (const side of [-1, 1]) {
    const x = side * (width / 2 - 0.12);
    for (let index = 0; index < posts; index += 1) {
      const z = -span / 2 + (index / (posts - 1)) * span;
      group.add(box(mats.timber, 0.2, 1.3, 0.2, x, 0.6, z));
    }
    const railMaterial = rope ? mats.rope : mats.timber;
    for (const y of rope ? [1.15] : [0.62, 1.12]) group.add(box(railMaterial, rope ? 0.07 : 0.1, rope ? 0.07 : 0.1, span, x, y, 0));
  }
  return group;
}

// A ribbon of flat water (or light) following a crossing's centre line.
function createRibbon(crossing, material, halfWidth, y, reach = 95, step = 5) {
  const positions = [];
  const left = new THREE.Vector3();
  const right = new THREE.Vector3();
  const nextLeft = new THREE.Vector3();
  const nextRight = new THREE.Vector3();
  for (let s = -reach; s < reach; s += step) {
    crossing.point(s, -halfWidth, left);
    crossing.point(s, halfWidth, right);
    crossing.point(s + step, -halfWidth, nextLeft);
    crossing.point(s + step, halfWidth, nextRight);
    for (const p of [left, right, nextLeft, right, nextRight, nextLeft]) positions.push(p.x, y, p.z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  // Whichever way the ribbon winds, it must face up.
  if (geometry.attributes.normal.getY(0) < 0) {
    const array = geometry.attributes.position.array;
    for (let index = 0; index < array.length; index += 9) {
      for (let axis = 0; axis < 3; axis += 1) {
        const swap = array[index + 3 + axis];
        array[index + 3 + axis] = array[index + 6 + axis];
        array[index + 6 + axis] = swap;
      }
    }
    geometry.computeVertexNormals();
  }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

// Sleepers and rails for a mine cart, laid along the route between two arc lengths.
function layTrack(ctx, mats, fromArc, toArc) {
  for (let arc = fromArc; arc < toArc; arc += 1.15) {
    const pose = ctx.poseAtArc(arc);
    if (ctx.crossing && Math.abs(arc - ctx.crossing.arc) < ctx.crossing.halfWidth + 3) continue;
    const p = ctx.at(pose, 0, 0);
    ctx.set(box(mats.timber, 2.1, 0.09, 0.32, 0, 0, 0), p.x, -0.02, p.z, pose.yaw);
    for (const x of [-0.72, 0.72]) {
      const q = ctx.at(pose, x, 0);
      ctx.set(box(mats.iron, 0.1, 0.12, 1.2, 0, 0, 0), q.x, 0.07, q.z, pose.yaw);
    }
  }
}

function createMineCart(mats, random) {
  const group = new THREE.Group();
  const tub = part(new THREE.CylinderGeometry(1.25, 0.95, 1.3, 4, 1), mats.iron, 0, 1.15, 0);
  tub.rotation.y = Math.PI / 4;
  tub.scale.set(1, 1, 1.35);
  group.add(tub);
  for (const x of [-0.75, 0.75]) {
    for (const z of [-0.8, 0.8]) {
      const wheel = cyl(mats.timber, 0.36, 0.36, 0.16, 8, x, 0.36, z);
      wheel.rotation.z = Math.PI / 2;
      group.add(wheel);
    }
  }
  // Heaped with ore, tall enough to hide behind.
  for (let index = 0; index < 4; index += 1) {
    group.add(tilt(dodeca(index % 2 ? mats.crystal : mats.rock, 0.5 + random() * 0.2, (random() - 0.5) * 0.9, 1.9 + random() * 0.35, (random() - 0.5) * 1.2), random));
  }
  return group;
}

// ── Spring meadow and village edge ─────────────────────────────────────────

function meadowKit() {
  const createFence = (mats, length) => {
    const group = new THREE.Group();
    const posts = Math.max(2, Math.round(length / 1.6) + 1);
    for (let index = 0; index < posts; index += 1) {
      group.add(box(mats.fence, 0.16, 1.0, 0.16, -length / 2 + (index / (posts - 1)) * length, 0.5, 0));
    }
    for (const y of [0.42, 0.78]) group.add(box(mats.fence, length, 0.1, 0.08, 0, y, 0));
    return group;
  };
  const createHaystack = (mats) => groupOf(
    cyl(mats.hay, 1.15, 1.35, 1.3, 7, 0, 0.65, 0),
    cone(mats.hayDark, 1.2, 1.0, 7, 0, 1.78, 0),
  );
  const createCottage = (mats, random) => {
    return createHut(mats, random, {
      width: 3.6 + random() * 1.2,
      depth: 3.0 + random() * 0.8,
      roofMaterial: random() < 0.5 ? mats.roof : mats.roofDark,
    });
  };
  const createBush = (mats, random) => {
    const group = new THREE.Group();
    const lumps = 2 + Math.floor(random() * 2);
    for (let index = 0; index < lumps; index += 1) {
      group.add(tilt(ico(mats.bush, 0.55 + random() * 0.35, (index - (lumps - 1) / 2) * 0.7, 0.42, (random() - 0.5) * 0.4), random));
    }
    return group;
  };
  const createFlowers = (mats, random) => {
    const group = new THREE.Group();
    const petals = [mats.petalA, mats.petalB, mats.petalC];
    const count = 5 + Math.floor(random() * 5);
    for (let index = 0; index < count; index += 1) {
      group.add(octa(petals[Math.floor(random() * 3)], 0.12, (random() - 0.5) * 1.6, 0.28 + random() * 0.2, (random() - 0.5) * 1.6));
    }
    return group;
  };
  const createWindmill = (mats) => {
    const group = groupOf(
      cyl(mats.wall, 1.3, 2.2, 8, 8, 0, 4, 0),
      cone(mats.roof, 1.8, 2.2, 8, 0, 9.1, 0),
      box(mats.door, 1.0, 1.8, 0.2, 0, 0.9, 2.05),
    );
    const hub = new THREE.Group();
    hub.position.set(0, 7.6, 1.75);
    for (let index = 0; index < 4; index += 1) {
      const arm = groupOf(box(mats.timber, 0.18, 5.2, 0.12, 0, 2.6, 0), box(mats.sail, 1.1, 3.8, 0.05, 0.62, 3.1, 0.04));
      arm.rotation.z = (index / 4) * Math.PI * 2;
      hub.add(arm);
    }
    group.add(hub);
    group.userData.hub = hub;
    return group;
  };

  return {
    materials: () => ({
      hay: flat(0xd9b45a), hayDark: flat(0xb98d3c), wall: flat(0xd8bf94), timber: flat(0x6b4a2c),
      roof: flat(0xa5482c), roofDark: flat(0x7e3522), door: flat(0x4a3220), stone: flat(0xb9ae98),
      fence: flat(0x8a6a44), bush: flat(0x4f7d3a), petalA: flat(0xf2c6d6), petalB: flat(0xf6e7a8),
      petalC: flat(0xc9d8f4), sail: flat(0xf3ead6), pane: flat(0x6f8fa6),
    }),
    treeArea: 30,
    hills({ away, base, noise }) {
      const rise = THREE.MathUtils.smoothstep(away, 0, 16);
      const hills = 2.5 + noise(0.045, 3) * 11 + noise(0.12, 7) * 2.5;
      return base + rise * hills * Math.min(1, 0.4 + away / 40);
    },
    tree({ open, random }) {
      if (open < 1.5) return null;
      // Trees thin out past the first ridge, where the hills hide most of them anyway.
      const density = open < 22 ? Math.min(0.85, 0.3 + open / 16) : Math.max(0.08, 0.85 - (open - 22) / 20);
      if (random() > density) return null;
      return { kind: random() < 0.35 ? 'pine' : 'round', scale: 1.1 + random() * 0.9 };
    },
    covers: [
      { kind: 'tree', build: (ctx) => ({ object: ctx.tree('round', 1.7 + ctx.random() * 0.4), radius: 1.6 }) },
      { kind: 'haystack', build: (ctx) => ({ object: createHaystack(ctx.mats), radius: 1.6 }) },
      { kind: 'cottage', wide: true, build: (ctx) => ({ object: createCottage(ctx.mats, ctx.random), radius: 3.2, face: true }) },
      { kind: 'bush', build: (ctx) => ({ object: createBush(ctx.mats, ctx.random), radius: 1.2 }) },
      { kind: 'rock', build: (ctx) => ({ object: ctx.rock(2.4), radius: 1.6 }) },
    ],
    decorate(ctx) {
      const { random, mats } = ctx;
      // Fences along the path, outside the arenas.
      for (let arc = 6; arc < ctx.length - 40; arc += 4.2) {
        if (random() < 0.35) continue;
        const pose = ctx.poseAtArc(arc);
        for (const side of [-1, 1]) {
          if (random() < 0.4) continue;
          const p = ctx.at(pose, side * 6.6, 0);
          if (ctx.arenaDistance(p.x, p.z) < 1.5 || !ctx.isFree(p.x, p.z, 1.2)) continue;
          ctx.place(createFence(mats, 3.6), p.x, p.z, 1.0, pose.yaw);
        }
      }
      // The village: cottages beside the path between stops, and a windmill over the boss arena.
      const boss = ctx.bossStop;
      const millPoint = ctx.at(boss.pose, 22 * sideOf(random), -40);
      const windmill = createWindmill(mats);
      windmill.position.set(millPoint.x, ctx.heightAt(millPoint.x, millPoint.z) - 0.1, millPoint.z);
      windmill.rotation.y = boss.pose.yaw + Math.atan2(-millPoint.x + boss.pose.x, 1);
      ctx.live(windmill);
      ctx.occupy(millPoint.x, millPoint.z, 4);
      ctx.animate((seconds) => { windmill.userData.hub.rotation.z = seconds * 0.45; });

      for (let arc = 20; arc < ctx.length - 60; arc += 18 + random() * 14) {
        const pose = ctx.poseAtArc(arc);
        const side = sideOf(random);
        const p = ctx.at(pose, side * (14 + random() * 6), (random() - 0.5) * 6);
        if (ctx.arenaDistance(p.x, p.z) < 3 || !ctx.isFree(p.x, p.z, 3.5)) continue;
        ctx.place(createCottage(mats, random), p.x, p.z, 3.5, pose.yaw + (side < 0 ? -Math.PI / 2 : Math.PI / 2));
      }
    },
    scatter(ctx) {
      const { random, mats } = ctx;
      for (let index = 0; index < ctx.length / 2.2; index += 1) {
        const pose = ctx.poseAtArc(random() * ctx.length);
        const p = ctx.at(pose, sideOf(random) * (3.6 + random() * 8), 0);
        if (!ctx.isFree(p.x, p.z, 0.8)) continue;
        // Bushes stay out of the arenas, where they would hide monsters coming up from the ground.
        const isBush = random() >= 0.7;
        if (isBush && ctx.arenaDistance(p.x, p.z) < 1) continue;
        ctx.set(isBush ? createBush(mats, random) : createFlowers(mats, random), p.x, ctx.heightAt(p.x, p.z) - 0.05, p.z);
      }
    },
  };
}

// ── Summer forest and river ────────────────────────────────────────────────

function forestKit() {
  const RIVER = 3.6;
  const createFern = (mats, random) => {
    const group = new THREE.Group();
    const fronds = 4 + Math.floor(random() * 3);
    for (let index = 0; index < fronds; index += 1) {
      const frond = cone(mats.fern, 0.16, 1.0, 4, 0, 0.38, 0);
      const angle = (index / fronds) * Math.PI * 2 + random();
      frond.position.set(Math.cos(angle) * 0.3, 0.36, Math.sin(angle) * 0.3);
      frond.rotation.set(Math.sin(angle) * 0.9, 0, -Math.cos(angle) * 0.9);
      group.add(frond);
    }
    return group;
  };
  const createMushrooms = (mats, random) => {
    const group = new THREE.Group();
    const count = 2 + Math.floor(random() * 3);
    for (let index = 0; index < count; index += 1) {
      const size = 0.5 + random() * 0.7;
      const x = (random() - 0.5) * 1.3;
      const z = (random() - 0.5) * 1.3;
      group.add(cyl(mats.stem, 0.09 * size, 0.12 * size, 0.5 * size, 5, x, 0.25 * size, z));
      group.add(cone(mats.cap, 0.36 * size, 0.3 * size, 6, x, 0.62 * size, z));
    }
    return group;
  };
  const createBush = (mats, random, size = 1) => {
    const group = new THREE.Group();
    for (let index = 0; index < 3; index += 1) {
      group.add(tilt(ico(mats.bush, (0.6 + random() * 0.4) * size, (index - 1) * 0.75 * size, 0.5 * size, (random() - 0.5) * 0.5), random));
    }
    return group;
  };
  const createFallenLog = (mats, random) => {
    const log = cyl(mats.timber, 0.38, 0.45, 3.4 + random() * 1.4, 6, 0, 0.36, 0);
    log.rotation.z = Math.PI / 2;
    return groupOf(log, tilt(ico(mats.moss, 0.42, 0.5, 0.62, 0), random));
  };
  const createStump = (mats) => groupOf(cyl(mats.timber, 0.42, 0.55, 0.6, 6, 0, 0.3, 0), cyl(mats.plank, 0.36, 0.36, 0.05, 6, 0, 0.62, 0));
  const createMossyBoulder = (ctx) => groupOf(ctx.rock(2.6), tilt(ico(ctx.mats.moss, 0.7, 0.2, 1.15, 0.1), ctx.random));
  // The mill's wheel turns about z; the house stands behind it, on the bank.
  const createMill = (mats) => {
    const house = groupOf(
      box(mats.stone, 5.0, 1.4, 4.2, 0, 0.5, 0),
      box(mats.wall, 4.6, 3.2, 3.8, 0, 2.8, 0),
      box(mats.door, 1.0, 1.7, 0.12, 1.2, 2.05, 1.94),
      box(mats.timber, 0.8, 0.7, 0.12, -1.0, 3.1, 1.94),
    );
    house.add(
      part(createGableGeometry(5.6, 5.0, 2.6), mats.roof, 0, 4.4, 0),
      part(createGableGeometry(4.6, 3.8, 2.0), mats.wall, 0, 4.4, 0),
      box(mats.timber, 5.7, 0.16, 0.22, 0, 7.04, 0),
      box(mats.pane, 0.6, 0.5, 0.14, -1.0, 3.1, 1.95),
    );
    const wheel = new THREE.Group();
    const rimGeometry = new THREE.TorusGeometry(2.3, 0.14, 5, 24);
    for (const z of [-0.45, 0.45]) wheel.add(part(rimGeometry, mats.timber, 0, 0, z));
    for (let index = 0; index < 12; index += 1) {
      const angle = (index / 12) * Math.PI * 2;
      const paddle = box(mats.plank, 0.12, 0.7, 1.0, Math.cos(angle) * 2.3, Math.sin(angle) * 2.3, 0);
      paddle.rotation.z = angle;
      wheel.add(paddle);
      if (index % 3 === 0) {
        const spoke = box(mats.timber, 4.5, 0.14, 0.14, 0, 0, 0);
        spoke.rotation.z = angle;
        wheel.add(spoke);
      }
    }
    const axle = cyl(mats.timber, 0.2, 0.2, 2.4, 6, 0, 0, 0);
    axle.rotation.x = Math.PI / 2;
    wheel.add(axle);
    return { house, wheel };
  };

  return {
    materials: () => ({
      timber: flat(0x5a3d24), plank: flat(0x9a7448), wall: flat(0x7d5a36), roof: flat(0x4d5a34), door: flat(0x33231a),
      stone: flat(0x8a8d86), bush: flat(0x2c6a3c), fern: flat(0x3c8a4a), moss: flat(0x5c9440),
      cap: flat(0xd9483a), stem: flat(0xeadfc8), rope: flat(0xb89a64), pane: lit(0xffc66a, 1.3),
      water: flat(0x3a8fc0, { roughness: 0.25, metalness: 0.15, emissive: 0x16466e, emissiveIntensity: 0.55 }),
      firefly: lit(0xe9ff8a, 2.6),
    }),
    treeArea: 31,
    ground: { bed: { h: 0.11, s: 0.28, l: 0.3 } },
    faceKind: ({ y }) => (y < -0.45 ? 'bed' : null),
    crossing: {
      halfWidth: RIVER,
      meander: 7,
      carve: (height, d) => Math.min(height, -1.7 + Math.max(0, Math.abs(d) - RIVER) * 0.75),
    },
    hills({ away, base, noise }) {
      const rise = THREE.MathUtils.smoothstep(away, 0, 18);
      const hills = 1.2 + noise(0.04, 3) * 6.5 + noise(0.13, 7) * 2;
      return base + rise * hills * Math.min(1, 0.4 + away / 40);
    },
    tree({ open, height, random }) {
      if (open < 1.2 || height < -0.2) return null;
      const density = open < 28 ? 0.92 : Math.max(0.1, 0.92 - (open - 28) / 18);
      if (random() > density) return null;
      // Tall trunks close by, so the wood feels deep.
      return { kind: random() < 0.42 ? 'pine' : 'round', scale: (open < 10 ? 1.9 : 1.4) + random() * 1.2 };
    },
    covers: [
      { kind: 'tree', build: (ctx) => ({ object: ctx.tree('round', 2.3 + ctx.random() * 0.5), radius: 1.7 }) },
      { kind: 'pine', build: (ctx) => ({ object: ctx.tree('pine', 2.5 + ctx.random() * 0.5), radius: 1.7 }) },
      { kind: 'logs', build: (ctx) => ({ object: createLogPile(ctx.mats, ctx.random), radius: 1.8, face: true }) },
      { kind: 'bush', build: (ctx) => ({ object: createBush(ctx.mats, ctx.random, 1.5), radius: 1.5 }) },
      { kind: 'rock', build: (ctx) => ({ object: createMossyBoulder(ctx), radius: 1.7 }) },
      {
        kind: 'hut', wide: true,
        build: (ctx) => ({ object: createHut(ctx.mats, ctx.random, { width: 3.4, depth: 3.0, roofMaterial: ctx.mats.roof }), radius: 3.1, face: true }),
      },
    ],
    decorate(ctx) {
      const { random, mats, crossing } = ctx;
      if (crossing) {
        const water = createRibbon(crossing, mats.water, RIVER + 2.4, -0.62);
        ctx.live(water);
        ctx.animate((seconds) => { water.position.y = Math.sin(seconds * 0.9) * 0.04; });
        const centre = crossing.point(0, 0);
        ctx.set(createBridge(mats, RIVER * 2 + 5.2), centre.x, 0, centre.z, crossing.yaw);

        // The watermill stands on the near bank, its wheel in the stream.
        const side = sideOf(random);
        const { house, wheel } = createMill(mats);
        const housePoint = crossing.point(side * 12.5, RIVER + 4.6);
        ctx.place(house, housePoint.x, housePoint.z, 4, crossing.yaw + Math.PI);
        const wheelPoint = crossing.point(side * 12.5, RIVER - 0.4);
        const wheelMount = groupOf(wheel);
        wheelMount.position.set(wheelPoint.x, 1.5, wheelPoint.z);
        wheelMount.rotation.y = crossing.yaw;
        ctx.live(wheelMount);
        ctx.animate((seconds) => { wheel.rotation.z = -seconds * 0.5 * side; });
        // Stepping stones and reeds along the banks.
        for (let s = -34; s <= 34; s += 3.2) {
          if (Math.abs(s) < 5) continue;
          const bank = sideOf(random);
          const p = crossing.point(s + random() * 2, bank * (RIVER + 0.6 + random() * 1.6));
          if (!ctx.isFree(p.x, p.z, 0.8)) continue;
          const stone = ctx.rock(0.9 + random() * 0.9);
          ctx.set(stone, p.x, ctx.heightAt(p.x, p.z) + 0.1, p.z, random() * 3);
        }
      }

      // An ancient tree towers over the boss arena.
      const boss = ctx.bossStop;
      const side = sideOf(random);
      const giant = ctx.at(boss.pose, side * 21, -46);
      const trunk = groupOf(
        cyl(ctx.shared.trunk, 1.5, 2.6, 13, 7, 0, 6.5, 0),
        cyl(ctx.shared.trunk, 0.5, 0.9, 6, 5, 2.4, 11.5, 0),
        cyl(ctx.shared.trunk, 0.5, 0.9, 6, 5, -2.2, 12, 0.6),
      );
      trunk.children[1].rotation.z = -0.8;
      trunk.children[2].rotation.z = 0.75;
      const crowns = [[0, 16.5, 0, 5.2], [4.6, 14.5, 0.5, 3.6], [-4.4, 15, 1, 3.8], [0.6, 14, -3.6, 3.4], [-0.5, 19.5, 0.4, 3.2]];
      crowns.forEach(([x, y, z, r], index) => trunk.add(tilt(ball(ctx.shared.leaves[index % 2], r, x, y, z), random)));
      ctx.place(trunk, giant.x, giant.z, 4);

      // Fallen logs and stumps beside the path.
      for (let arc = 14; arc < ctx.length - 50; arc += 9 + random() * 8) {
        const pose = ctx.poseAtArc(arc);
        const p = ctx.at(pose, sideOf(random) * (9.5 + random() * 5), 0);
        if (ctx.arenaDistance(p.x, p.z) < 1 || !ctx.isFree(p.x, p.z, 2) || ctx.heightAt(p.x, p.z) < -0.2) continue;
        ctx.place(random() < 0.6 ? createFallenLog(mats, random) : createStump(mats), p.x, p.z, 1.8);
      }
    },
    scatter(ctx) {
      const { random, mats } = ctx;
      for (let index = 0; index < ctx.length / 1.6; index += 1) {
        const pose = ctx.poseAtArc(random() * ctx.length);
        const p = ctx.at(pose, sideOf(random) * (3.8 + random() * 10), 0);
        if (!ctx.isFree(p.x, p.z, 0.8) || ctx.heightAt(p.x, p.z) < -0.2) continue;
        const pick = random();
        const tall = pick > 0.75;
        if (tall && ctx.arenaDistance(p.x, p.z) < 1) continue;
        const decor = tall ? createBush(mats, random) : pick > 0.4 ? createFern(mats, random) : createMushrooms(mats, random);
        ctx.set(decor, p.x, ctx.heightAt(p.x, p.z) - 0.05, p.z, random() * 6);
      }
      // Fireflies hang over the verges; the whole swarm drifts as one.
      const swarm = new THREE.Group();
      for (let index = 0; index < 70; index += 1) {
        const pose = ctx.poseAtArc(random() * ctx.length);
        const p = ctx.at(pose, sideOf(random) * (3 + random() * 9), 0);
        swarm.add(octa(mats.firefly, 0.06, p.x, 0.7 + random() * 2.6, p.z));
      }
      const fireflies = ctx.merge(swarm, false);
      ctx.live(fireflies);
      ctx.animate((seconds) => {
        fireflies.position.set(Math.sin(seconds * 0.45) * 0.35, Math.sin(seconds * 0.8) * 0.22, Math.cos(seconds * 0.38) * 0.35);
        mats.firefly.emissiveIntensity = 2.2 + Math.sin(seconds * 2.6) * 0.9;
      });
    },
  };
}

// ── Autumn mountain pass, then the crystal mine ────────────────────────────

function mountainKit() {
  const CHASM = 3.4;
  const createCairn = (mats, random) => {
    const group = new THREE.Group();
    let y = 0;
    for (let index = 0; index < 5; index += 1) {
      const r = 1.0 - index * 0.16;
      const stone = tilt(dodeca(mats.rock, r, (random() - 0.5) * 0.2, y + r * 0.55, (random() - 0.5) * 0.2), random, 0.6);
      stone.scale.y = 0.6;
      group.add(stone);
      y += r * 0.72;
    }
    return group;
  };
  const createTimberStack = (mats, random) => {
    const group = new THREE.Group();
    for (let layer = 0; layer < 4; layer += 1) {
      for (let index = 0; index < 3; index += 1) {
        const beam = box(mats.plank, 0.4, 0.4, 3.0, 0, 0.22 + layer * 0.42, (index - 1) * 0.5);
        if (layer % 2 === 0) beam.rotation.y = Math.PI / 2;
        else beam.position.set((index - 1) * 0.5, 0.22 + layer * 0.42, 0);
        beam.rotation.y += (random() - 0.5) * 0.08;
        group.add(beam);
      }
    }
    return group;
  };
  const createStalagmite = (mats, random) => {
    const group = new THREE.Group();
    const count = 1 + Math.floor(random() * 3);
    for (let index = 0; index < count; index += 1) {
      const h = 1.2 + random() * 2.4;
      group.add(cone(mats.caveRock, 0.3 + h * 0.14, h, 5, (random() - 0.5) * 1.2, h / 2, (random() - 0.5) * 1.2));
    }
    return group;
  };
  // Posts either side of the tunnel and a beam across the roof.
  const createSupport = (mats, halfSpan, height) => groupOf(
    box(mats.timber, 0.5, height, 0.5, -halfSpan, height / 2, 0),
    box(mats.timber, 0.5, height, 0.5, halfSpan, height / 2, 0),
    box(mats.timber, halfSpan * 2 + 1.4, 0.55, 0.6, 0, height, 0),
    box(mats.plank, 0.3, 0.3, 2.4, -halfSpan + 0.9, height - 0.9, 0),
    box(mats.plank, 0.3, 0.3, 2.4, halfSpan - 0.9, height - 0.9, 0),
  );
  const createPortal = (mats, random) => {
    const group = new THREE.Group();
    // A cliff face closes the valley, with the mine's mouth cut through it: the route walks in.
    const slabs = [[-13, 7, 0, 9], [13, 7.5, 0, 9.5], [-6.5, 14, -1, 7], [6.5, 15, -1, 7.5], [0, 17, -2, 7], [-20, 5, 2, 7], [20, 5.5, 2, 7.5]];
    for (const [x, y, z, r] of slabs) {
      const slab = tilt(dodeca(mats.rock, r, x, y, z - 6), random, 0.8);
      group.add(slab);
    }
    group.add(createSupport(mats, 4.6, 8.8));
    for (const side of [-1, 1]) {
      const torch = createTorch(mats, 3.2);
      torch.position.set(side * 6.6, 0, 1.2);
      group.add(torch);
      const crystals = createCrystals([mats.crystal, mats.crystalB], random, 1.4, 5);
      crystals.position.set(side * 9.5, 0, 2.5);
      group.add(crystals);
    }
    return group;
  };
  const createGeode = (mats, random) => {
    const group = new THREE.Group();
    for (let index = 0; index < 9; index += 1) {
      const angle = (index / 9) * Math.PI - Math.PI / 2;
      const cluster = createCrystals([mats.crystal, mats.crystalB, mats.crystalC], random, 2.6 + random() * 2.2, 4);
      cluster.position.set(Math.sin(angle) * (9 + random() * 5), 0, -Math.cos(angle) * 5 + random() * 2);
      group.add(cluster);
    }
    const heart = octa(mats.crystalC, 2.6, 0, 7.5, -4);
    heart.scale.set(1, 2.6, 1);
    group.add(heart);
    return { group, heart };
  };

  return {
    materials: () => ({
      rock: flat(0x8b7d70), caveRock: flat(0x5a4a44), timber: flat(0x5c3d22), plank: flat(0x8f6a3e),
      rope: flat(0xb89a64), iron: flat(0x4b4f58, { roughness: 0.6, metalness: 0.5 }), wall: flat(0x7a5a38),
      roof: flat(0x5a3a26), door: flat(0x2e2018), stone: flat(0x6a5a52), pane: lit(0xffb45a, 1.3),
      flame: lit(0xffa040, 2.8), crystal: lit(0x58e6d4, 1.7), crystalB: lit(0xb48cff, 1.6), crystalC: lit(0xffc44d, 1.9),
    }),
    treeArea: 34,
    ground: {
      rock: { h: 0.07, s: 0.14, l: 0.42, vary: 0.12 },
      cave: { h: 0.06, s: 0.18, l: 0.27, vary: 0.1 },
    },
    // The route starts in the open pass and walks into the mine: everything the stage
    // calls `late` lies beyond the mine's mouth.
    late: true,
    // The leg into the mine is long enough for a cart ride.
    ride: true,
    faceKind: ({ y, onPath, late }) => (late ? (onPath && y > -1 ? null : 'cave') : (y > 1.4 || y < -1 ? 'rock' : null)),
    skip: ({ y, late }) => late && y > 15,
    // The mine's roof: a rough rock ceiling over the late part of the stage.
    roof: { kind: 'cave', lateOnly: true, height: ({ noise }) => 10 + noise(0.09, 11) * 3.2 - Math.max(0, noise(0.33, 17) - 0.72) * 9 },
    crossing: {
      halfWidth: CHASM,
      meander: 3,
      carve: (height, d) => Math.min(height, -26 + Math.max(0, Math.abs(d) - CHASM) * 11),
    },
    hills({ away, base, noise, late }) {
      if (late) {
        const rise = THREE.MathUtils.smoothstep(away, 0, 4.5);
        return base + rise * (16 + noise(0.2, 5) * 3);
      }
      const rise = THREE.MathUtils.smoothstep(away, 0, 9);
      const peaks = 6 + noise(0.05, 3) * 26 + Math.abs(noise(0.14, 7) - 0.5) * 9;
      return base + rise * peaks * Math.min(1, 0.45 + away / 26);
    },
    tree({ open, height, random, late }) {
      if (late || open < 1.6 || height > 8 || height < -0.5) return null;
      if (random() > 0.3) return null;
      return { kind: random() < 0.55 ? 'pine' : 'round', scale: 1.1 + random() * 0.9 };
    },
    covers: [
      { kind: 'boulder', build: (ctx) => ({ object: createRockPile(ctx.mats.rock, ctx.random, 1.25), radius: 1.9 }) },
      { kind: 'cart', build: (ctx) => ({ object: createMineCart(ctx.mats, ctx.random), radius: 1.7, face: true }) },
      { kind: 'crates', build: (ctx) => ({ object: createCrateStack(ctx.mats, ctx.random), radius: 1.5 }) },
      { kind: 'crystal', where: 'late', build: (ctx) => ({ object: createCrystals([ctx.mats.crystal, ctx.mats.crystalB], ctx.random, 2.3, 6), radius: 1.6 }) },
      { kind: 'pine', where: 'early', build: (ctx) => ({ object: ctx.tree('pine', 2.4 + ctx.random() * 0.4), radius: 1.6 }) },
      { kind: 'timber', where: 'late', build: (ctx) => ({ object: createTimberStack(ctx.mats, ctx.random), radius: 1.9 }) },
      { kind: 'cairn', where: 'early', build: (ctx) => ({ object: createCairn(ctx.mats, ctx.random), radius: 1.4 }) },
      {
        kind: 'shed', wide: true,
        build: (ctx) => ({ object: createHut(ctx.mats, ctx.random, { width: 3.2, depth: 2.8, height: 2.3, roofMaterial: ctx.mats.roof }), radius: 3, face: true }),
      },
    ],
    decorate(ctx) {
      const { random, mats, crossing } = ctx;
      const boss = ctx.bossStop;
      if (crossing) {
        const centre = crossing.point(0, 0);
        ctx.set(createBridge(mats, CHASM * 2 + 4.4, 6.2, { rope: true }), centre.x, 0, centre.z, crossing.yaw);
        for (const [s, d] of [[-4.6, CHASM + 2.6], [4.6, CHASM + 2.6], [-4.6, -CHASM - 2.6], [4.6, -CHASM - 2.6]]) {
          const p = crossing.point(s, d);
          ctx.place(createTorch(mats, 2.6), p.x, p.z, 0.4);
        }
      }

      const mouth = ctx.lateArc;
      // The mine's mouth stands across the valley, and a cart track runs from the pass
      // through it to the cavern where the boss waits.
      const mouthPose = ctx.poseAtArc(mouth);
      ctx.set(createPortal(mats, random), mouthPose.x, -0.1, mouthPose.z, mouthPose.yaw);
      for (const x of [-22, -13, -6.6, 6.6, 13, 22]) {
        const p = ctx.at(mouthPose, x, -3);
        ctx.occupy(p.x, p.z, 4.5);
      }
      layTrack(ctx, mats, Math.max(4, mouth - 30), boss.arc - 6);

      // Outside: boulders and scree along the foot of the cliffs.
      for (let index = 0; index < ctx.length / 2.6; index += 1) {
        const arc = random() * mouth;
        const pose = ctx.poseAtArc(arc);
        const p = ctx.at(pose, sideOf(random) * (9.5 + random() * 9), 0);
        if (ctx.isLate(p.x, p.z) || ctx.arenaDistance(p.x, p.z) < 0.5 || !ctx.isFree(p.x, p.z, 1.4)) continue;
        if (ctx.heightAt(p.x, p.z) < -0.5) continue;
        ctx.place(createRockPile(mats.rock, random, 0.6 + random() * 0.9), p.x, p.z, 1.3);
      }

      // Inside: timber sets hold the roof up along the tunnel; torches burn on their posts.
      for (let arc = mouth + 9; arc < boss.arc + 4; arc += 11) {
        const pose = ctx.poseAtArc(arc);
        if (crossing && Math.abs(arc - crossing.arc) < crossing.halfWidth + 5) continue;
        const left = ctx.at(pose, -9.4, 0);
        const right = ctx.at(pose, 9.4, 0);
        if (!ctx.isFree(left.x, left.z, 0.8) || !ctx.isFree(right.x, right.z, 0.8)) continue;
        const centre = ctx.at(pose, 0, 0);
        ctx.set(createSupport(mats, 9.4, 8.6), centre.x, -0.1, centre.z, pose.yaw);
        ctx.occupy(left.x, left.z, 0.8);
        ctx.occupy(right.x, right.z, 0.8);
        for (const x of [-8.7, 8.7]) {
          const p = ctx.at(pose, x, 0.6);
          ctx.set(createTorch(mats, 3.0), p.x, 0, p.z);
        }
      }
      // Crystals crowd the walls, and a great geode fills the cavern behind the boss.
      for (let index = 0; index < ctx.length / 3.2; index += 1) {
        const pose = ctx.poseAtArc(mouth + 4 + random() * (ctx.length - mouth - 4));
        const p = ctx.at(pose, sideOf(random) * (10 + random() * 6), 0);
        const open = ctx.openness(p.x, p.z);
        if (!ctx.isLate(p.x, p.z) || open > 2.5 || !ctx.isFree(p.x, p.z, 1.2)) continue;
        const decor = random() < 0.6
          ? createCrystals([mats.crystal, mats.crystalB, mats.crystalC], random, 0.9 + random() * 1.3, 4)
          : createStalagmite(mats, random);
        ctx.place(decor, p.x, p.z, 1.1);
      }
      const { group: geode, heart } = createGeode(mats, random);
      const heartMount = groupOf(heart);
      const geodePoint = ctx.at(boss.pose, 0, -52);
      ctx.set(geode, geodePoint.x, -0.1, geodePoint.z, boss.pose.yaw);
      const heartPoint = ctx.at(boss.pose, 0, -56);
      heartMount.position.set(heartPoint.x, 0, heartPoint.z);
      heart.position.set(0, 7.5, 0);
      ctx.live(heartMount);
      ctx.animate((seconds) => {
        heart.rotation.y = seconds * 0.35;
        heart.position.y = 7.5 + Math.sin(seconds * 0.9) * 0.5;
      });
      ctx.animate((seconds) => {
        mats.flame.emissiveIntensity = 2.6 + Math.sin(seconds * 9.1) * 0.5 + Math.sin(seconds * 15.7) * 0.3;
        mats.crystalC.emissiveIntensity = 1.9 + Math.sin(seconds * 1.7) * 0.5;
      });
    },
    scatter(ctx) {
      const { random, mats } = ctx;
      for (let index = 0; index < ctx.length / 3; index += 1) {
        const pose = ctx.poseAtArc(random() * ctx.length);
        const p = ctx.at(pose, sideOf(random) * (4 + random() * 8), 0);
        if (!ctx.isFree(p.x, p.z, 0.7) || ctx.heightAt(p.x, p.z) < -0.5) continue;
        const pebble = tilt(dodeca(mats.rock, 0.16 + random() * 0.22, 0, 0, 0), random);
        ctx.set(pebble, p.x, ctx.heightAt(p.x, p.z) + 0.05, p.z);
      }
    },
  };
}

// ── Winter: the frozen lake and the storm tower ────────────────────────────

function winterKit() {
  const createIceSpires = (mats, random, size = 1) => {
    const group = new THREE.Group();
    const count = 3 + Math.floor(random() * 3);
    for (let index = 0; index < count; index += 1) {
      const h = (index === 0 ? 3.0 : 1.2 + random() * 1.5) * size;
      const spire = cone(mats.ice, (0.45 + random() * 0.25) * size, h, 5, 0, h / 2, 0);
      const reach = index === 0 ? 0 : 0.7 * size;
      const angle = random() * Math.PI * 2;
      spire.position.set(Math.cos(angle) * reach, h / 2 - 0.1, Math.sin(angle) * reach);
      spire.rotation.set((random() - 0.5) * 0.5, random() * 3, (random() - 0.5) * 0.5);
      group.add(spire);
    }
    return group;
  };
  const createSnowman = (mats) => {
    const group = groupOf(
      ball(mats.snow, 1.05, 0, 0.85, 0),
      ball(mats.snow, 0.75, 0, 2.05, 0),
      ball(mats.snow, 0.5, 0, 2.95, 0),
      cone(mats.carrot, 0.09, 0.5, 5, 0, 2.95, 0.6),
      box(mats.coal, 0.1, 0.1, 0.1, -0.18, 3.1, 0.42),
      box(mats.coal, 0.1, 0.1, 0.1, 0.18, 3.1, 0.42),
      cyl(mats.scarf, 0.5, 0.56, 0.2, 7, 0, 2.52, 0),
      cyl(mats.coal, 0.34, 0.34, 0.42, 7, 0, 3.55, 0),
      cyl(mats.coal, 0.52, 0.52, 0.06, 7, 0, 3.36, 0),
    );
    group.children[3].rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) {
      const arm = cyl(mats.timber, 0.04, 0.05, 1.3, 4, side * 1.05, 2.3, 0);
      arm.rotation.z = side * -1.1;
      group.add(arm);
    }
    return group;
  };
  const createSnowRock = (ctx) => {
    const rock = createRockPile(ctx.mats.stone, ctx.random, 1.15);
    const cap = ball(ctx.mats.snow, 0.95, 0, 1.75, 0);
    cap.scale.set(1.25, 0.42, 1.25);
    rock.add(cap);
    return rock;
  };
  const createIgloo = (mats) => {
    const group = new THREE.Group();
    const dome = part(new THREE.SphereGeometry(2.3, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mats.snow);
    const tunnel = cyl(mats.snow, 1.0, 1.0, 1.7, 6, 0, 0.55, 2.5);
    tunnel.rotation.x = Math.PI / 2;
    group.add(dome, tunnel, box(mats.coal, 1.1, 1.2, 0.1, 0, 0.6, 3.36));
    group.userData.doorOffset = new THREE.Vector3(0, 0, 4.2);
    return group;
  };
  // A fishing boat caught in the ice, heeled over.
  const createBoat = (mats) => {
    const hull = part(new THREE.CylinderGeometry(1.2, 0.7, 4.6, 5, 1), mats.timber, 0, 0.75, 0);
    hull.rotation.z = Math.PI / 2;
    hull.scale.set(1, 1, 0.8);
    const group = groupOf(
      hull,
      box(mats.plank, 4.0, 0.14, 1.5, 0, 1.3, 0),
      cyl(mats.timber, 0.09, 0.12, 4.4, 5, 0.3, 3.3, 0),
      box(mats.plank, 2.2, 0.1, 0.1, 0.3, 4.6, 0),
      box(mats.sail, 1.9, 2.0, 0.06, 0.3, 3.5, 0.1),
    );
    group.rotation.z = 0.16;
    return groupOf(group);
  };
  const createDrift = (mats, random) => {
    const drift = ico(mats.snow, 0.9 + random() * 0.8, 0, 0, 0);
    drift.scale.set(1.5, 0.32, 1.1);
    return groupOf(drift);
  };
  const createMarker = (mats) => groupOf(
    cyl(mats.timber, 0.06, 0.09, 2.3, 5, 0, 1.15, 0),
    box(mats.timber, 0.5, 0.07, 0.07, 0.2, 2.2, 0),
    octa(mats.lantern, 0.16, 0.4, 1.95, 0),
  );
  const createFishingHut = (mats, random) => {
    const hut = createHut(mats, random, { width: 2.4, depth: 2.2, height: 2.0, roofMaterial: mats.snow, chimney: false });
    hut.add(cyl(mats.coal, 0.6, 0.6, 0.04, 8, 0, 0.02, 2.6));
    return hut;
  };
  // The tower: dark stone rings to a spire, lit windows, and a storm turning about its crown.
  const createTower = (mats, random) => {
    const tower = new THREE.Group();
    const tiers = [[4.2, 5.0, 8, 4], [3.5, 4.0, 9, 12.5], [2.9, 3.3, 8, 21]];
    for (const [top, bottom, h, y] of tiers) {
      tower.add(cyl(mats.tower, top, bottom, h, 8, 0, y, 0));
      tower.add(cyl(mats.towerTrim, bottom + 0.5, bottom + 0.5, 0.6, 8, 0, y - h / 2 + 0.3, 0));
    }
    tower.add(cyl(mats.towerTrim, 4.0, 3.2, 1.2, 8, 0, 25.6, 0));
    tower.add(cone(mats.towerRoof, 3.6, 7, 8, 0, 29.7, 0));
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2 + 0.2;
      tower.add(box(mats.towerTrim, 0.8, 1.0, 0.8, Math.cos(angle) * 3.6, 26.6, Math.sin(angle) * 3.6));
    }
    for (const [y, r] of [[6, 4.55], [13, 3.72], [18, 3.5], [22, 3.05]]) {
      for (let index = 0; index < 4; index += 1) {
        const angle = (index / 4) * Math.PI * 2 + y;
        const pane = box(mats.window, 0.7, 1.5, 0.2, Math.cos(angle) * r, y, Math.sin(angle) * r);
        pane.rotation.y = -angle + Math.PI / 2;
        tower.add(pane);
      }
    }
    tower.add(box(mats.coal, 1.8, 3.0, 0.3, 0, 1.5, 4.95));
    // Snow lies on the ledges.
    for (const [y, r] of [[8.3, 4.6], [17.2, 3.9]]) {
      const ledge = cyl(mats.snow, r, r + 0.2, 0.3, 8, 0, y, 0);
      tower.add(ledge);
    }
    const storm = new THREE.Group();
    storm.position.y = 34;
    for (let index = 0; index < 9; index += 1) {
      const angle = (index / 9) * Math.PI * 2;
      const radius = 7 + random() * 4;
      const cloud = ball(mats.cloud, 2.6 + random() * 1.8, Math.cos(angle) * radius, (random() - 0.5) * 2.4, Math.sin(angle) * radius);
      cloud.scale.set(1.5, 0.5, 1.1);
      cloud.rotation.y = -angle;
      cloud.castShadow = false;
      storm.add(cloud);
    }
    const rod = groupOf(cyl(mats.towerTrim, 0.08, 0.14, 4.4, 5, 0, 35, 0));
    const spark = octa(mats.storm, 0.8, 0, 38, 0);
    spark.scale.set(1, 1.8, 1);
    for (let index = 0; index < 3; index += 1) {
      const bolt = box(mats.storm, 0.16, 3.2, 0.16, 0, 0, 0);
      bolt.position.set(Math.cos(index * 2.1) * 4.5, -1.5, Math.sin(index * 2.1) * 4.5);
      bolt.rotation.set(0.5, index, 0.4);
      bolt.castShadow = false;
      storm.add(bolt);
    }
    return { tower, storm, rod, spark };
  };

  return {
    materials: () => ({
      ice: flat(0xa8dcf0, { roughness: 0.3, emissive: 0x2a6f92, emissiveIntensity: 0.45 }), snow: flat(0xf2f6fc),
      stone: flat(0x7d8794), timber: flat(0x5a4636), plank: flat(0x8a7458), wall: flat(0x8c6a4a), roof: flat(0x6a4030),
      door: flat(0x33261e), pane: lit(0xffc66a, 1.4), coal: flat(0x1c1d22), carrot: flat(0xf08a2c), scarf: flat(0xc8323c), sail: flat(0xd9d2c0),
      lantern: lit(0xffc45a, 2.4), tower: flat(0x3a4152), towerTrim: flat(0x2a2f3c), towerRoof: flat(0x30486e),
      window: lit(0xffb84a, 2.2), storm: lit(0x9fd8ff, 3.0), cloud: flat(0x2e3444),
    }),
    treeArea: 30,
    ground: { ice: { h: 0.545, s: 0.42, l: 0.74, vary: 0.07 } },
    // Drifted snow breaks up the ice.
    faceKind: ({ y, onPath, seed }) => (!onPath && y < 0.14 && seed < 0.8 ? 'ice' : null),
    hills({ away, base, noise, bump }) {
      // The lake spreads well beyond the route before the shore begins.
      const shore = away - (7 + noise(0.035, 9) * 20);
      if (shore <= 0) return base - bump * 0.7;
      const rise = THREE.MathUtils.smoothstep(shore, 0, 15);
      return base + rise * (1.5 + noise(0.045, 3) * 10 + noise(0.12, 7) * 2) * Math.min(1, 0.4 + shore / 36);
    },
    tree({ open, height, random }) {
      if (open < 2 || height < 0.35) return null;
      if (random() > 0.6) return null;
      return { kind: random() < 0.78 ? 'pine' : 'round', scale: 1.3 + random() * 1.1 };
    },
    covers: [
      { kind: 'ice', build: (ctx) => ({ object: createIceSpires(ctx.mats, ctx.random, 1.1), radius: 1.6 }) },
      { kind: 'snowman', build: (ctx) => ({ object: createSnowman(ctx.mats), radius: 1.4, face: true }) },
      { kind: 'rock', build: (ctx) => ({ object: createSnowRock(ctx), radius: 1.8 }) },
      { kind: 'pine', build: (ctx) => ({ object: ctx.tree('pine', 2.4 + ctx.random() * 0.5), radius: 1.6 }) },
      { kind: 'igloo', wide: true, build: (ctx) => ({ object: createIgloo(ctx.mats), radius: 3.2, face: true }) },
      { kind: 'boat', wide: true, build: (ctx) => ({ object: createBoat(ctx.mats), radius: 2.6 }) },
    ],
    decorate(ctx) {
      const { random, mats } = ctx;
      const boss = ctx.bossStop;
      // The lake leads to the storm tower, and the boss guards its door.
      const { tower, storm, rod, spark } = createTower(mats, random);
      const point = ctx.at(boss.pose, 0, -80);
      const yaw = boss.pose.yaw;
      const scale = 1.25;
      const base = ctx.heightAt(point.x, point.z) - 0.3;
      tower.add(rod);
      tower.scale.setScalar(scale);
      ctx.set(tower, point.x, base, point.z, yaw);
      ctx.occupy(point.x, point.z, 7 * scale);
      const live = groupOf(storm, spark);
      live.position.set(point.x, base, point.z);
      live.scale.setScalar(scale);
      ctx.live(live);
      ctx.animate((seconds) => {
        storm.rotation.y = seconds * 0.22;
        spark.rotation.y = seconds * 1.4;
        const flicker = Math.sin(seconds * 23) * Math.sin(seconds * 3.1) > 0.55 ? 2.4 : 0;
        mats.storm.emissiveIntensity = 2.4 + flicker + Math.sin(seconds * 2.2) * 0.5;
      });

      // Lantern poles mark the safe line across the ice.
      for (let arc = 4; arc < ctx.length - 20; arc += 7.5) {
        const pose = ctx.poseAtArc(arc);
        for (const side of [-1, 1]) {
          const p = ctx.at(pose, side * 6.6, 0);
          if (random() < 0.3 || !ctx.isFree(p.x, p.z, 0.6)) continue;
          ctx.place(createMarker(mats), p.x, p.z, 0.5, pose.yaw + (side < 0 ? Math.PI : 0));
        }
      }
      // Fishing huts and a boat or two out on the lake.
      for (let arc = 24; arc < ctx.length - 50; arc += 22 + random() * 16) {
        const pose = ctx.poseAtArc(arc);
        const side = sideOf(random);
        const p = ctx.at(pose, side * (15 + random() * 7), (random() - 0.5) * 6);
        if (ctx.arenaDistance(p.x, p.z) < 2 || !ctx.isFree(p.x, p.z, 3)) continue;
        if (random() < 0.6) ctx.place(createFishingHut(mats, random), p.x, p.z, 3, pose.yaw + (side < 0 ? -Math.PI / 2 : Math.PI / 2));
        else ctx.place(createBoat(mats), p.x, p.z, 3);
      }
      // Ice thrown up in ridges further out.
      for (let index = 0; index < ctx.length / 4; index += 1) {
        const pose = ctx.poseAtArc(random() * ctx.length);
        const p = ctx.at(pose, sideOf(random) * (12 + random() * 16), 0);
        if (ctx.arenaDistance(p.x, p.z) < 1 || !ctx.isFree(p.x, p.z, 1.4)) continue;
        ctx.place(createIceSpires(mats, random, 0.7 + random() * 0.9), p.x, p.z, 1.3);
      }
      ctx.animate((seconds) => { mats.lantern.emissiveIntensity = 2.2 + Math.sin(seconds * 3.3) * 0.4; });
    },
    scatter(ctx) {
      const { random, mats } = ctx;
      for (let index = 0; index < ctx.length / 2.4; index += 1) {
        const pose = ctx.poseAtArc(random() * ctx.length);
        const p = ctx.at(pose, sideOf(random) * (3.8 + random() * 9), 0);
        if (!ctx.isFree(p.x, p.z, 0.8)) continue;
        ctx.set(createDrift(mats, random), p.x, ctx.heightAt(p.x, p.z) - 0.02, p.z, random() * 6);
      }
    },
  };
}

// ── The night sky: floating islands ────────────────────────────────────────

function skyKit() {
  const GAP = 5.5;
  const createPillar = (mats, random, height = 3.4 + random() * 1.6) => {
    const group = groupOf(
      box(mats.stone, 2.2, 0.5, 2.2, 0, 0.25, 0),
      cyl(mats.stone, 0.8, 0.9, height, 7, 0, 0.5 + height / 2, 0),
    );
    const top = tilt(dodeca(mats.stone, 0.95, 0.1, height + 0.7, 0), random, 0.5);
    top.scale.y = 0.6;
    group.add(top, box(mats.rune, 0.3, 0.9, 0.1, 0, 1.8, 0.86));
    return group;
  };
  const createObelisk = (mats) => {
    const body = part(new THREE.CylinderGeometry(0.5, 1.0, 4.6, 4, 1), mats.stoneDark, 0, 2.3, 0);
    body.rotation.y = Math.PI / 4;
    const tip = cone(mats.rune, 0.72, 1.1, 4, 0, 5.15, 0);
    tip.rotation.y = Math.PI / 4;
    const group = groupOf(body, tip);
    for (let index = 0; index < 3; index += 1) group.add(box(mats.rune, 0.36, 0.36, 0.1, 0, 1.2 + index * 1.0, 0.62 - index * 0.11));
    return group;
  };
  // A broken wall with a doorway; a monster steps out through it.
  const createRuin = (mats, random) => {
    const group = groupOf(
      box(mats.stone, 1.6, 3.6, 1.0, -1.6, 1.8, 0),
      box(mats.stone, 1.6, 2.6 + random(), 1.0, 1.6, 1.4, 0),
      box(mats.stone, 4.8, 0.7, 1.1, 0, 3.9, 0),
      box(mats.stoneDark, 1.5, 3.4, 0.5, 0, 1.7, -0.3),
      tilt(dodeca(mats.stone, 0.7, 2.9, 0.4, 0.6), random),
      box(mats.rune, 0.5, 0.5, 0.1, 0, 3.9, 0.58),
    );
    group.userData.doorOffset = new THREE.Vector3(0, 0, 1.6);
    return group;
  };
  const createIslet = (ctx, radius) => {
    const { mats, random } = ctx;
    const group = groupOf(
      cyl(mats.turf, radius, radius * 0.86, 0.5, 7, 0, -0.25, 0),
      cone(mats.stoneDark, radius * 0.88, radius * 1.9, 7, 0, -0.5 - radius * 0.95, 0),
    );
    group.children[1].rotation.x = Math.PI;
    const pick = random();
    if (pick < 0.4) {
      const tree = ctx.tree('round', 0.9 + radius * 0.25);
      tree.position.x = (random() - 0.5) * radius * 0.6;
      group.add(tree);
    } else if (pick < 0.75) {
      group.add(createCrystals([mats.crystal, mats.rune], random, 0.6 + radius * 0.25, 4));
    } else {
      group.add(createPillar(mats, random, 1.8 + random() * 1.4));
    }
    return group;
  };
  const createLantern = (mats) => groupOf(
    cyl(mats.stone, 0.12, 0.2, 1.7, 5, 0, 0.85, 0),
    octa(mats.star, 0.26, 0, 2.15, 0),
  );
  const createRing = (mats, radius, tube) => {
    const group = new THREE.Group();
    group.add(part(new THREE.TorusGeometry(radius, tube, 6, 32), mats.ring));
    for (let index = 0; index < 9; index += 1) {
      const angle = (index / 9) * Math.PI * 2;
      const rune = box(mats.rune, tube * 0.9, tube * 1.6, tube * 2.3, Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      rune.rotation.z = angle;
      group.add(rune);
    }
    return group;
  };

  return {
    materials: () => ({
      stone: flat(0x6a5aa8), stoneDark: flat(0x3a2f6a), turf: flat(0x4a3c8c),
      ring: flat(0x8f7fe0, { emissive: 0x5a3fd0, emissiveIntensity: 0.9 }),
      rune: lit(0xe040fb, 2.0), crystal: lit(0x58e6ff, 1.8), star: lit(0xffe08a, 2.6),
      light: lit(0xb9f0ff, 1.5, { roughness: 0.3 }),
    }),
    treeArea: 22,
    ground: { cliff: { h: 0.72, s: 0.34, l: 0.2, vary: 0.08 } },
    faceKind: ({ y }) => (y < -0.7 ? 'cliff' : null),
    skipBelow: -11,
    crossing: {
      halfWidth: GAP,
      meander: 0,
      carve: (height, d) => (Math.abs(d) < GAP ? -60 : Math.min(height, -60 + (Math.abs(d) - GAP) * 60)),
    },
    hills({ away, base, noise }) {
      // Each island ends in a ragged cliff a little way beyond the open ground.
      const edge = away - (2.6 + noise(0.16, 5) * 4.4);
      if (edge <= 0) return base + THREE.MathUtils.smoothstep(away, 0.5, 5) * noise(0.3, 9) * 1.1;
      return base - Math.min(60, edge * 6);
    },
    tree({ open, height, random }) {
      if (open < 1.5 || height < -0.3) return null;
      if (random() > 0.4) return null;
      return { kind: 'round', scale: 1.0 + random() * 0.8 };
    },
    covers: [
      { kind: 'pillar', build: (ctx) => ({ object: createPillar(ctx.mats, ctx.random), radius: 1.5, face: true }) },
      { kind: 'crystal', build: (ctx) => ({ object: createCrystals([ctx.mats.crystal, ctx.mats.rune], ctx.random, 2.2, 6), radius: 1.6 }) },
      { kind: 'obelisk', build: (ctx) => ({ object: createObelisk(ctx.mats), radius: 1.3, face: true }) },
      { kind: 'rock', build: (ctx) => ({ object: createRockPile(ctx.mats.stone, ctx.random, 1.2), radius: 1.8 }) },
      { kind: 'tree', build: (ctx) => ({ object: ctx.tree('round', 1.8 + ctx.random() * 0.4), radius: 1.6 }) },
      { kind: 'ruin', wide: true, build: (ctx) => ({ object: createRuin(ctx.mats, ctx.random), radius: 3, face: true }) },
    ],
    decorate(ctx) {
      const { random, mats, crossing } = ctx;
      const boss = ctx.bossStop;
      if (crossing) {
        // A bridge of light joins the islands across the gap.
        const span = GAP * 2 + 3;
        const slabs = new THREE.Group();
        const count = 9;
        for (let index = 0; index < count; index += 1) {
          const z = -span / 2 + (index + 0.5) * (span / count);
          slabs.add(box(mats.light, 5.6, 0.12, span / count - 0.35, 0, -0.04, z));
        }
        const centre = crossing.point(0, 0);
        slabs.position.set(centre.x, 0, centre.z);
        slabs.rotation.y = crossing.yaw;
        ctx.live(slabs);
        ctx.animate((seconds) => {
          slabs.children.forEach((slab, index) => { slab.position.y = -0.04 + Math.sin(seconds * 1.6 + index * 0.7) * 0.05; });
        });
        for (const [s, d] of [[-3.6, GAP + 1.6], [3.6, GAP + 1.6], [-3.6, -GAP - 1.6], [3.6, -GAP - 1.6]]) {
          const p = crossing.point(s, d);
          ctx.place(createObelisk(mats), p.x, p.z, 0.9, crossing.yaw);
        }
      }

      // A star gate hangs beyond the boss, and standing stones circle the arena.
      const gate = createRing(mats, 13, 1.1);
      const inner = createRing(mats, 8.6, 0.5);
      const gatePoint = ctx.at(boss.pose, 0, -72);
      const mount = groupOf(gate, inner);
      mount.position.set(gatePoint.x, 15, gatePoint.z);
      mount.rotation.y = boss.pose.yaw;
      ctx.live(mount);
      ctx.animate((seconds) => {
        gate.rotation.z = seconds * 0.12;
        inner.rotation.z = -seconds * 0.3;
        inner.rotation.x = Math.sin(seconds * 0.4) * 0.5;
        mats.rune.emissiveIntensity = 2.0 + Math.sin(seconds * 2.1) * 0.6;
      });
      {
        const crown = new THREE.Group();
        const centre = ctx.at(boss.pose, 0, -16);
        crown.position.set(centre.x, 0, centre.z);
        const stones = [];
        for (let index = 0; index < 8; index += 1) {
          const stone = createObelisk(mats);
          stone.scale.setScalar(1.5);
          crown.add(stone);
          stones.push(stone);
        }
        ctx.live(crown);
        ctx.animate((seconds) => {
          stones.forEach((stone, index) => {
            const angle = (index / stones.length) * Math.PI * 2 + seconds * 0.08;
            stone.position.set(Math.cos(angle) * 27, 5 + Math.sin(seconds * 0.6 + index) * 1.4, Math.sin(angle) * 27);
            stone.rotation.y = -angle;
          });
        });
      }

      // Star lanterns along the path.
      for (let arc = 5; arc < ctx.length - 30; arc += 8.5) {
        const pose = ctx.poseAtArc(arc);
        if (crossing && Math.abs(arc - crossing.arc) < crossing.halfWidth + 2) continue;
        for (const side of [-1, 1]) {
          const p = ctx.at(pose, side * 6.4, 0);
          if (random() < 0.3 || !ctx.isFree(p.x, p.z, 0.6)) continue;
          ctx.place(createLantern(mats), p.x, p.z, 0.5);
        }
      }
      // Islets drift all around, above and below the path.
      for (let index = 0; index < ctx.length / 3.4; index += 1) {
        const pose = ctx.poseAtArc(random() * ctx.length);
        const reach = 20 + random() * 44;
        const p = ctx.at(pose, sideOf(random) * reach, (random() - 0.5) * 12);
        if (ctx.openness(p.x, p.z) < 9 || !ctx.isFree(p.x, p.z, 4)) continue;
        const radius = 1.6 + random() * 3.4;
        ctx.set(createIslet(ctx, radius), p.x, -9 + random() * 22 + reach * 0.08, p.z, random() * 6);
        ctx.occupy(p.x, p.z, radius + 1.5);
      }
      ctx.animate((seconds) => {
        mats.star.emissiveIntensity = 2.4 + Math.sin(seconds * 2.7) * 0.5;
        mats.light.emissiveIntensity = 1.4 + Math.sin(seconds * 1.9) * 0.3;
      });
    },
    scatter(ctx) {
      const { random, mats } = ctx;
      for (let index = 0; index < ctx.length / 4; index += 1) {
        const pose = ctx.poseAtArc(random() * ctx.length);
        const p = ctx.at(pose, sideOf(random) * (7.5 + random() * 6), 0);
        if (!ctx.isFree(p.x, p.z, 0.9) || ctx.heightAt(p.x, p.z) < -0.4 || ctx.arenaDistance(p.x, p.z) < 0.5) continue;
        ctx.set(createCrystals([mats.crystal, mats.rune], random, 0.4 + random() * 0.5, 3), p.x, ctx.heightAt(p.x, p.z) - 0.05, p.z);
      }
    },
  };
}

const KIT_BUILDERS = { meadow: meadowKit, forest: forestKit, mountain: mountainKit, winter: winterKit, sky: skyKit };

export const STAGE_KIT_NAMES = Object.keys(KIT_BUILDERS);

export function createStageKit(name) {
  return (KIT_BUILDERS[name] || meadowKit)();
}
