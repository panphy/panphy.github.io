// Meshes built in code: the rocket, its exhaust, the launch site and the stars.
// Scene axes: x east, y up, z south, in meters.
import * as THREE from 'three';
import { engineRing } from './rocket.js';

const paint = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.42, metalness: 0.05 });
const dark = new THREE.MeshStandardMaterial({ color: 0x17191d, roughness: 0.6, metalness: 0.2 });
const metal = new THREE.MeshStandardMaterial({ color: 0x565b63, roughness: 0.32, metalness: 0.9 });
const accent = new THREE.MeshStandardMaterial({ color: 0xff5a1f, roughness: 0.5, metalness: 0.05 });
const foil = new THREE.MeshStandardMaterial({ color: 0xc9a23f, roughness: 0.35, metalness: 0.85 });

function shadowed(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function tube(radiusTop, radiusBottom, height, material, y) {
  const mesh = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 40, 1, false), material));
  mesh.position.y = y + height / 2;
  return mesh;
}

function bellMesh(radius, length) {
  // A nozzle profile from the throat (top) down to the exit.
  const points = [];
  for (let i = 0; i <= 10; i += 1) {
    const s = i / 10;
    points.push(new THREE.Vector2(radius * (0.32 + 0.68 * Math.sqrt(s)), length * (1 - s)));
  }
  const mesh = shadowed(new THREE.Mesh(new THREE.LatheGeometry(points, 24), metal));
  mesh.material.side = THREE.DoubleSide;
  return mesh;
}

// Where each engine of a stage sits, as offsets from the axis.
function nozzleLayout(count, stageRadius, bellRadius) {
  const { center, ring } = engineRing(count);
  const spots = [];
  if (center) spots.push([0, 0]);
  const reach = Math.max(0, stageRadius - bellRadius * 1.05);
  for (let i = 0; i < ring; i += 1) {
    const angle = i / ring * Math.PI * 2 + Math.PI / 4;
    spots.push([Math.cos(angle) * reach, Math.sin(angle) * reach]);
  }
  return spots;
}

// Builds the rocket from analyze(design). Stage groups are separate so they can fall away.
export function buildRocket(info) {
  const root = new THREE.Group();
  const stages = [];
  let y = 0;
  info.stages.forEach((stage, i) => {
    const group = new THREE.Group();
    const radius = stage.diameter / 2;
    // Bells are scaled down when a cluster would not fit under the stage.
    const { ring } = engineRing(stage.count);
    const fit = ring > 1 ? radius * Math.sin(Math.PI / ring) / (1 + Math.sin(Math.PI / ring)) : radius * (stage.count > 1 ? 0.5 : 0.82);
    const bellRadius = Math.min(stage.engine.bell / 2, fit * (stage.count > 6 ? 0.82 : 1));
    const bellLength = bellRadius * (stage.engine.vacuum ? 2.6 : 1.9);
    const skirt = bellLength * 0.45;
    const spots = nozzleLayout(stage.count, radius, bellRadius);
    const nozzles = spots.map(([x, z]) => {
      const bell = bellMesh(bellRadius, bellLength);
      bell.position.set(x, y, z);
      group.add(bell);
      return { x, z, y, radius: bellRadius };
    });
    // Thrust structure, tank, and trim.
    group.add(tube(radius, radius * 0.96, skirt + 0.02, dark, y + bellLength - skirt));
    const tankBase = y + bellLength;
    group.add(tube(radius, radius, stage.length, paint, tankBase));
    const band = Math.min(0.5, stage.length * 0.06);
    group.add(tube(radius * 1.004, radius * 1.004, band, dark, tankBase + stage.length - band * 2.2));
    group.add(tube(radius * 1.006, radius * 1.006, band * 0.5, accent, tankBase + stage.length * 0.52));
    const duct = shadowed(new THREE.Mesh(new THREE.BoxGeometry(radius * 0.12, stage.length * 0.9, radius * 0.1), dark));
    duct.position.set(0, tankBase + stage.length * 0.47, radius * 1.01);
    group.add(duct);
    if (i === 0) {
      // Fins on the first stage.
      for (let k = 0; k < 4; k += 1) {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0); shape.lineTo(radius * 0.75, -radius * 0.35); shape.lineTo(radius * 0.75, radius * 0.5); shape.lineTo(0, radius * 2.1);
        const fin = shadowed(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: radius * 0.07, bevelEnabled: false }), dark));
        fin.geometry.translate(radius, 0, -radius * 0.035);
        fin.rotation.y = k * Math.PI / 2 + Math.PI / 4;
        fin.position.y = tankBase;
        group.add(fin);
      }
    }
    let top = tankBase + stage.length;
    const above = info.stages[i + 1];
    if (above) {
      // The interstage hides the next stage's engines and drops with this stage.
      const aboveRadius = above.diameter / 2;
      const { ring: aboveRing } = engineRing(above.count);
      const aboveFit = aboveRing > 1 ? aboveRadius * Math.sin(Math.PI / aboveRing) / (1 + Math.sin(Math.PI / aboveRing)) : aboveRadius * (above.count > 1 ? 0.5 : 0.82);
      const aboveBell = Math.min(above.engine.bell / 2, aboveFit * (above.count > 6 ? 0.82 : 1));
      const height = aboveBell * (above.engine.vacuum ? 2.6 : 1.9);
      group.add(tube(aboveRadius, radius, height, dark, top));
      group.add(tube(aboveRadius * 1.01, aboveRadius * 1.01, Math.min(0.12, height * 0.2), accent, top + height * 0.86));
    }
    root.add(group);
    stages.push({ group, base: y, top, nozzles, radius });
    y = top;
  });

  // Payload fairing.
  const payload = info.payload;
  const last = info.stages[info.stages.length - 1];
  const stageRadius = last ? last.diameter / 2 : payload.diameter / 2;
  const fairingRadius = Math.max(payload.diameter / 2 * 1.08, stageRadius * 0.7);
  const fairing = new THREE.Group();
  const flare = Math.abs(fairingRadius - stageRadius) * 1.6 + 0.15;
  const noseLength = fairingRadius * 2.6;
  const profile = [new THREE.Vector2(stageRadius, 0), new THREE.Vector2(fairingRadius, flare), new THREE.Vector2(fairingRadius, flare + payload.length)];
  for (let i = 1; i <= 14; i += 1) {
    const s = i / 14;
    profile.push(new THREE.Vector2(Math.max(0.001, fairingRadius * Math.sqrt(1 - s * s) ** 1.25), flare + payload.length + noseLength * s));
  }
  const shell = shadowed(new THREE.Mesh(new THREE.LatheGeometry(profile, 40), paint));
  shell.position.y = y;
  fairing.add(shell);
  fairing.add(tube(stageRadius * 1.006, stageRadius * 1.006, 0.12, foil, y - 0.06));
  fairing.add(tube(fairingRadius * 1.004, fairingRadius * 1.004, Math.min(0.4, payload.length * 0.1), accent, y + flare + payload.length * 0.8));
  root.add(fairing);
  const height = y + flare + payload.length + noseLength;
  return { root, stages, fairing, height, payloadBase: y };
}

// Exhaust: two shells per engine, shaped and shaded by the engine's throttle and the air pressure.
const plumeGeometry = new THREE.CylinderGeometry(1, 1, 1, 24, 28, true).translate(0, -0.5, 0);
const plumeVertex = /* glsl */`
  uniform float uPower, uVac, uLayer, uTime;
  varying float vS;
  varying float vEdge;
  void main() {
    float s = clamp(-position.y, 0.0, 1.0);
    vS = s;
    float wobble = 1.0 + 0.04 * sin(s * 23.0 - uTime * 41.0) * s;
    float length = mix(34.0, 26.0, uVac) * (0.3 + 0.7 * uPower) * mix(1.0, 0.5, uLayer);
    float slim = 1.0 + 1.6 * s - 2.3 * s * s;
    float wide = 1.0 + 16.0 * pow(s, 0.75);
    float radius = mix(slim, wide, uVac) * mix(1.0, 0.55, uLayer) * wobble;
    vec3 p = vec3(position.x * radius, -s * length, position.z * radius);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec3 n = normalize(normalMatrix * vec3(position.x, 0.25, position.z));
    vEdge = abs(dot(n, normalize(-mv.xyz)));
    gl_Position = projectionMatrix * mv;
  }
`;
const plumeFragment = /* glsl */`
  uniform float uPower, uVac, uLayer, uTime;
  varying float vS;
  varying float vEdge;
  void main() {
    float body = pow(max(vEdge, 0.0), mix(1.4, 2.4, uVac));
    float along = clamp(vS, 0.0, 1.0);
    float fade = pow(1.0 - along, mix(1.5, 2.6, uVac)) * smoothstep(0.0, 0.03, along + 0.02);
    float flicker = 0.85 + 0.15 * sin(vS * 60.0 - uTime * 75.0) * sin(uTime * 31.0 + vS * 9.0);
    // Shock diamonds show in thick air.
    float diamonds = 1.0 + (1.0 - uVac) * uLayer * 1.4 * pow(abs(sin(vS * 34.0)), 6.0) * (1.0 - vS);
    vec3 hot = mix(vec3(1.0, 0.93, 0.78), vec3(0.82, 0.9, 1.0), uVac);
    vec3 cool = mix(vec3(1.0, 0.42, 0.08), vec3(0.35, 0.5, 1.0), uVac);
    vec3 color = mix(cool, hot, uLayer) * mix(1.0, 0.55, smoothstep(0.0, 0.8, vS) * (1.0 - uLayer));
    float strength = mix(mix(3.2, 0.45, uVac), mix(9.0, 1.5, uVac), uLayer);
    gl_FragColor = vec4(color * body * fade * flicker * diamonds * strength * uPower, 1.0);
  }
`;

export function buildPlumes(rocket) {
  const sets = rocket.stages.map((stage) => {
    const group = new THREE.Group();
    const materials = [0, 1].map((layer) => new THREE.ShaderMaterial({
      uniforms: { uPower: { value: 0 }, uVac: { value: 0 }, uLayer: { value: layer }, uTime: { value: 0 } },
      vertexShader: plumeVertex, fragmentShader: plumeFragment,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, transparent: true
    }));
    for (const nozzle of stage.nozzles) {
      for (const material of materials) {
        const mesh = new THREE.Mesh(plumeGeometry, material);
        mesh.position.set(nozzle.x, nozzle.y + 0.02, nozzle.z);
        mesh.scale.setScalar(nozzle.radius);
        mesh.frustumCulled = false;
        group.add(mesh);
      }
    }
    group.visible = false;
    stage.group.add(group);
    return { group, materials };
  });
  return sets;
}

// A launch site: slab, tower, masts and a few buildings. The origin is where the rocket stands.
export function buildPad(rocketHeight) {
  const pad = new THREE.Group();
  const concrete = new THREE.MeshStandardMaterial({ color: 0x8d8b85, roughness: 0.95 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x7c3a2a, roughness: 0.7, metalness: 0.4 });
  const white = new THREE.MeshStandardMaterial({ color: 0xdcdcd6, roughness: 0.7 });

  // Ground apron fading into the terrain.
  const apronGeometry = new THREE.CircleGeometry(900, 64, 0, Math.PI * 2);
  const apron = new THREE.Mesh(apronGeometry, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec2 vP; uniform vec3 uTint; void main(){ float r = length(vP) / 900.0; gl_FragColor = vec4(uTint, (1.0 - smoothstep(0.2, 1.0, r)) * 0.8); }',
    uniforms: { uTint: { value: new THREE.Color(0x6a6250) } }
  }));
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = -0.03;
  pad.add(apron);

  const slab = new THREE.Mesh(new THREE.CylinderGeometry(34, 36, 1.2, 48), concrete);
  slab.position.y = -0.61;
  slab.receiveShadow = true;
  pad.add(slab);
  const road = new THREE.Mesh(new THREE.BoxGeometry(14, 0.3, 520), concrete);
  road.position.set(-6, -0.14, 290);
  road.receiveShadow = true;
  pad.add(road);
  const mount = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6.5, 0.5, 32), dark));
  mount.position.y = -0.24;
  pad.add(mount);

  // Service tower: four legs with cross-braces.
  const towerHeight = Math.max(30, rocketHeight * 1.12);
  const tower = new THREE.Group();
  const leg = new THREE.BoxGeometry(0.5, towerHeight, 0.5);
  for (const [x, z] of [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]]) {
    const mesh = shadowed(new THREE.Mesh(leg, steel));
    mesh.position.set(x, towerHeight / 2, z);
    tower.add(mesh);
  }
  const levels = Math.round(towerHeight / 6);
  for (let i = 1; i <= levels; i += 1) {
    const deck = shadowed(new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.25, 5.6), steel));
    deck.position.y = i * towerHeight / levels;
    tower.add(deck);
    for (const side of [0, 1, 2, 3]) {
      const brace = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.2, Math.hypot(5, towerHeight / levels), 0.2), steel));
      brace.position.set(side < 2 ? (side ? 2.5 : -2.5) : 0, (i - 0.5) * towerHeight / levels, side < 2 ? 0 : (side === 2 ? 2.5 : -2.5));
      brace.rotation[side < 2 ? 'x' : 'z'] = Math.atan2(5, towerHeight / levels) * (i % 2 ? 1 : -1);
      tower.add(brace);
    }
  }
  const arm = shadowed(new THREE.Mesh(new THREE.BoxGeometry(9, 0.6, 1.4), steel));
  arm.position.set(6, towerHeight * 0.82, 0);
  tower.add(arm);
  tower.position.set(-13, 0, 0);
  pad.add(tower);

  // Lightning masts.
  for (const angle of [2.2, 3.6, 5.0]) {
    const mast = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.28, towerHeight * 1.45, 8), steel));
    mast.position.set(Math.cos(angle) * 46, towerHeight * 0.725, Math.sin(angle) * 46);
    pad.add(mast);
  }
  // Tank farm and buildings.
  for (const [x, z, r] of [[-70, -40, 7], [-88, -36, 5.5], [-74, -60, 5.5]]) {
    const sphere = shadowed(new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), white));
    sphere.position.set(x, r * 0.9, z);
    pad.add(sphere);
  }
  for (const [x, z, w, h, d] of [[-120, 120, 40, 14, 26], [-60, 170, 26, 9, 18], [70, 230, 60, 30, 40], [130, 150, 20, 7, 20]]) {
    const building = shadowed(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), white));
    building.position.set(x, h / 2, z);
    pad.add(building);
  }
  return pad;
}

// Stars at fixed inertial directions, drawn behind everything.
export function buildStars(count) {
  const positions = new Float32Array(count * 3);
  const data = new Float32Array(count * 4);
  let seed = 12345;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const axis = new THREE.Vector3(0.45, 0.2, 0.87).normalize();
  const tangent = new THREE.Vector3(1, 0, 0).cross(axis).normalize();
  const bitangent = axis.clone().cross(tangent);
  const direction = new THREE.Vector3();
  for (let i = 0; i < count; i += 1) {
    if (random() < 0.45) {
      // A band of faint stars for the Milky Way.
      const along = random() * Math.PI * 2;
      const off = (random() + random() + random() - 1.5) * 0.22;
      direction.copy(tangent).multiplyScalar(Math.cos(along)).addScaledVector(bitangent, Math.sin(along)).addScaledVector(axis, off).normalize();
    } else {
      const z = random() * 2 - 1, a = random() * Math.PI * 2, s = Math.sqrt(1 - z * z);
      direction.set(s * Math.cos(a), s * Math.sin(a), z);
    }
    positions.set([direction.x, direction.y, direction.z], i * 3);
    const brightness = 0.06 + 0.94 * random() ** 9;
    const warmth = random();
    data.set([brightness, 1 - 0.35 * warmth * warmth, 0.75 + 0.25 * (1 - Math.abs(warmth - 0.5) * 2), 0.6 + 0.4 * warmth], i * 4);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aStar', new THREE.BufferAttribute(data, 4));
  const material = new THREE.ShaderMaterial({
    uniforms: { uFrame: { value: new THREE.Matrix3() }, uScale: { value: 1 }, uGain: { value: 1 } },
    vertexShader: /* glsl */`
      attribute vec4 aStar;
      uniform mat3 uFrame;
      uniform float uScale;
      varying vec4 vStar;
      void main() {
        vStar = aStar;
        vec4 clip = projectionMatrix * vec4(mat3(viewMatrix) * (uFrame * position), 1.0);
        gl_Position = clip.xyww;
        gl_PointSize = uScale * (1.3 + 2.6 * aStar.x);
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uGain;
      varying vec4 vStar;
      void main() {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        float core = exp(-r * r * 5.0);
        gl_FragColor = vec4(vStar.yzw * core * (0.25 + 3.2 * vStar.x) * uGain, 1.0);
      }
    `,
    blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true
  });
  const stars = new THREE.Points(geometry, material);
  stars.frustumCulled = false;
  stars.renderOrder = -20;
  return stars;
}
