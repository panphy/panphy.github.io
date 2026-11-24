import * as THREE from 'three';
import { radialTexture } from '/assets/three-textures.js';
import { createRig } from './rig.js';
import { createMusic } from './music.js';
import { createSfx } from './sfx.js';

/* Measurement rules
   - The delay before release is a truncated exponential, so the chance of release stays nearly
     constant while waiting and the moment cannot be predicted.
   - Release is drawn in one requestAnimationFrame callback. The next callback's timestamp marks
     the vsync at which that frame reached the display, and is the onset time.
   - The response time is the input event's own timeStamp, on the same clock.
   - Under MIN_RT is a false start, over MAX_RT a lapse, and a stalled frame or hidden page voids
     the attempt. A ball that smashes still yields a valid time if the player responds.
   - No sound effect plays between release and the response, and the background music runs on its
     own clock, so only the visual cue is timed.
   The ball falls in real time at the world's g: d = g t^2 / 2 over DROP_M. */
const MIN_RT = 100;
const MAX_RT = 1000;
const FORE_MIN = 1200;
const FORE_MEAN = 1500;
const FORE_MAX = 6000;
const MAX_FRAME_GAP = 50;
const MAX_STALLS = 8;
const BETWEEN_MS = 1900;
const RESULTS_LOCK_MS = 700;
const DROP_M = 0.5;
const RIG_H = 3.2;
const UNITS_PER_M = RIG_H / DROP_M;
const RIG_TOP = 1.62;
const BALL_R = 0.17;
const BEST_KEY = 'panphy-worldfall-best';
const MUTE_KEY = 'panphy-worldfall-muted';

const USGS = 'USGS Astrogeology';
const WORLDS = [
  { id: 'moon', name: 'Moon', g: 1.62, tilt: 6.7, atm: null,
    fact: 'With no air, a hammer and a feather fall together, as Apollo 15 showed.',
    source: 'Map: NASA Lunar Reconnaissance Orbiter (CGI Moon Kit).' },
  { id: 'mercury', name: 'Mercury', g: 3.70, tilt: 0.03, atm: null, pole: [.8, [.2, .2, .22]],
    fact: 'Its huge iron core gives this small planet almost the same g as much larger Mars.',
    source: `Map: NASA MESSENGER color mosaic via ${USGS}. Colors are processed, and gaps in the mosaic are blended.` },
  { id: 'mars', name: 'Mars', g: 3.71, tilt: 25.2, atm: [.85, .5, .32],
    fact: 'You would weigh about 38% of your Earth weight. The dark regions are basaltic rock and sand.',
    source: `Map: NASA Viking color mosaic via ${USGS}.` },
  { id: 'venus', name: 'Venus', g: 8.87, tilt: 177.4, atm: [1, .78, .42],
    fact: 'Thick clouds hide the ground, so this surface was mapped by radar. Venus also spins backward.',
    source: `Radar view: NASA Magellan via ${USGS}. Color is synthetic.` },
  { id: 'earth', name: 'Earth', g: 9.81, tilt: 23.4, atm: [.4, .65, 1],
    fact: 'g is not quite constant: about 9.78 m/s² at the equator and 9.83 m/s² at the poles.',
    source: 'Map: NASA Blue Marble Next Generation, July, cloud-free.' },
  { id: 'saturn', name: 'Saturn', g: 10.44, tilt: 26.7, atm: [.9, .8, .58], giant: true, rings: true,
    fact: 'Saturn is less dense than water, yet its g near the cloud tops is close to Earth’s.',
    source: `Map: NASA Cassini via ${USGS}. Rings drawn to measured radii.` },
  { id: 'jupiter', name: 'Jupiter', g: 24.79, tilt: 3.1, atm: [.9, .75, .55], giant: true,
    fact: 'The strongest g of any planet. The Great Red Spot is a storm wider than Earth.',
    source: 'Map: NASA Cassini (PIA07782).' },
];
// The menu and results screens show a random world.
const randomWorldIndex = () => Math.floor(Math.random() * WORLDS.length);

const $ = (id) => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ms = (value) => `${Math.round(value)} ms`;
const fallMs = (g) => Math.sqrt(2 * DROP_M / g) * 1000;
const fallenCm = (g, t) => Math.min(DROP_M, .5 * g * (t / 1000) ** 2) * 100;

function store(action, key, value) {
  try {
    if (action === 'get') return localStorage.getItem(key);
    if (action === 'set') localStorage.setItem(key, value);
    if (action === 'remove') localStorage.removeItem(key);
  } catch { /* Storage can be unavailable; the game still works. */ }
  return null;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function foreperiod() {
  const span = FORE_MAX - FORE_MIN;
  return FORE_MIN - FORE_MEAN * Math.log(1 - Math.random() * (1 - Math.exp(-span / FORE_MEAN)));
}

const game = {
  state: 'menu', index: 0, results: [], falseStarts: 0, goAt: 0, goFrame: 0, onset: null, nextAt: 0,
  resultsAt: 0, lastFrame: 0, stalls: 0, smashed: false, advance: false, token: 0,
  muted: store('get', MUTE_KEY) === '1', best: Number(store('get', BEST_KEY)) || null,
};
const world = () => WORLDS[game.index];

/* ---------- Sound: effects only ever follow the response ---------- */
let audio = null;
const music = createMusic();
const sfx = createSfx();
function unlockAudio() {
  if (game.muted) return;
  if (!audio) {
    audio = new (window.AudioContext || window.webkitAudioContext)();
    sfx.attach(audio);
  }
  if (audio.state === 'suspended') audio.resume().then(() => { if (!game.muted) music.start(audio); });
  else music.start(audio);
}
const playSfx = (name, value) => { if (!game.muted && audio) sfx[name](value); };

/* ---------- Scene ---------- */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: $('scene'), antialias: true, powerPreference: 'high-performance' });
} catch {
  $('menu').querySelector('p').textContent = 'This game needs WebGL, which is unavailable here.';
  $('startBtn').disabled = true;
  throw new Error('WebGL unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03040a);
const camera = new THREE.PerspectiveCamera(40, 1, .1, 140);
const SUN = new THREE.Vector3(-.72, .46, .52).normalize();
scene.add(new THREE.AmbientLight(0x8fa0c8, .55));
const sunLight = new THREE.DirectionalLight(0xffffff, 2.4);
sunLight.position.copy(SUN).multiplyScalar(10);
scene.add(sunLight);

const glowTex = radialTexture(THREE, 128, [[0, 1], [.5, .55], [.72, .16], [1, 0]]);
const dotTex = radialTexture(THREE, 32, [[0, 1], [.5, .8], [1, 0]]);
const additive = { blending: THREE.AdditiveBlending, depthWrite: false, transparent: true };

function pointCloud(count, fill, size) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) fill(i, positions, colors);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ size, map: dotTex, vertexColors: true, ...additive }));
}

scene.add(pointCloud(1600, (i, p, c) => {
  const r = 45 + Math.random() * 45;
  const a = Math.random() * Math.PI * 2;
  const z = Math.random() * 2 - 1;
  const s = Math.sqrt(1 - z * z);
  p.set([r * s * Math.cos(a), r * s * Math.sin(a), r * z - 20], i * 3);
  const b = .3 + Math.random() ** 3 * .7;
  c.set([b, b * .95, b], i * 3);
}, .3));

/* Planet */
const planet = new THREE.Group();
scene.add(planet);
const spinner = new THREE.Group();
planet.add(spinner);

const planetMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uMap: { value: null }, uSun: { value: SUN }, uAtm: { value: new THREE.Vector3() },
    uPoleStart: { value: 2 }, uPole: { value: new THREE.Vector3() }, uFade: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv; varying vec3 vNormal; varying vec3 vView;
    void main() {
      vUv = uv;
      vNormal = normalize(mat3(modelMatrix) * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vView = normalize(cameraPosition - worldPos.xyz);
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }`,
  fragmentShader: `
    uniform sampler2D uMap; uniform vec3 uSun; uniform vec3 uAtm; uniform float uPoleStart; uniform vec3 uPole; uniform float uFade;
    varying vec2 vUv; varying vec3 vNormal; varying vec3 vView;
    float noData(vec2 uv) {
      float level = dot(texture2D(uMap, uv, -1.0).rgb, vec3(.333));
      return max(step(.9, level), step(level, .006));
    }
    void main() {
      vec3 albedo = texture2D(uMap, vUv).rgb;
      if (uPoleStart < 1.0) {
        // Only true no-data pixels (near pure white or black) and their JPEG fringe are filled.
        float gap = noData(vUv);
        vec2 step = vec2(3.0 / 2048.0, 3.0 / 1024.0);
        for (int i = 0; i < 8; i++) {
          float a = float(i) * .7854;
          gap = max(gap, noData(vUv + step * vec2(cos(a), sin(a))));
        }
        albedo = mix(albedo, uPole, gap);
      }
      float polar = (.5 - vUv.y) * 2.0;
      albedo = mix(albedo, uPole, smoothstep(uPoleStart, uPoleStart + .07, polar));
      vec3 n = normalize(vNormal);
      float sun = dot(n, uSun);
      float day = smoothstep(-.06, .3, sun);
      vec3 color = albedo * (.012 + day * (.45 + .75 * max(sun, 0.0)));
      float rim = pow(1.0 - max(dot(n, normalize(vView)), 0.0), 3.2);
      color += uAtm * rim * smoothstep(-.25, .35, sun) * .62;
      gl_FragColor = vec4(color * uFade, 1.0);
      #include <colorspace_fragment>
    }`,
});
const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), planetMaterial);
spinner.add(globe);

const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, opacity: 0, ...additive }));
halo.scale.setScalar(2.62);
halo.renderOrder = -1;
planet.add(halo);

/* Saturn's rings, in units of Saturn's equatorial radius (C, B, Cassini Division, A). */
const ringMaterial = new THREE.ShaderMaterial({
  uniforms: { uSun: { value: SUN }, uCenter: { value: new THREE.Vector3() }, uRadius: { value: 1 }, uFade: { value: 0 } },
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  vertexShader: `
    varying float vR; varying vec3 vWorld;
    void main() {
      vR = length(position.xy);
      vec4 w = modelMatrix * vec4(position, 1.0);
      vWorld = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: `
    uniform vec3 uSun; uniform vec3 uCenter; uniform float uRadius; uniform float uFade;
    varying float vR; varying vec3 vWorld;
    float band(float r, float a, float b) { return smoothstep(a - .006, a + .006, r) * (1.0 - smoothstep(b - .006, b + .006, r)); }
    void main() {
      float fine = .78 + .22 * sin(vR * 190.0) * sin(vR * 67.0 + 1.3);
      float alpha = band(vR, 1.239, 1.527) * .2 + band(vR, 1.527, 1.951) * .92 * fine + band(vR, 1.951, 2.027) * .05 + band(vR, 2.027, 2.269) * .62 * fine;
      vec3 p = vWorld - uCenter;
      float along = dot(p, uSun);
      float shadow = along < 0.0 ? smoothstep(uRadius * .97, uRadius * 1.03, length(p - along * uSun)) : 1.0;
      vec3 color = vec3(.86, .77, .62) * (.05 + .95 * shadow);
      gl_FragColor = vec4(color * uFade, alpha * uFade);
      #include <colorspace_fragment>
    }`,
});
const rings = new THREE.Mesh(new THREE.RingGeometry(1.22, 2.29, 160, 1), ringMaterial);
rings.rotation.x = -Math.PI / 2;
spinner.add(rings);

/* Experiment rig */
const apparatus = createRig({ renderer, scene, height: RIG_H, top: RIG_TOP, ballRadius: BALL_R });
const { group: rig, ball, floorY: FLOOR_Y, clampY: CLAMP_Y } = apparatus;

const SHARDS = 170;
const shardVel = new Float32Array(SHARDS * 3);
const shards = pointCloud(SHARDS, () => {}, .075);
shards.visible = false;
shards.material.opacity = 0;
rig.add(shards);
// Highest point of the apparatus (the post tip), in rig coordinates, so layout() can keep it clear of the HUD.
const RIG_TIP_Y = new THREE.Box3().setFromObject(rig).max.y;
const HUD_GAP_PX = 14;

const fx = { shard: 0, shake: 0, fade: 0, ring: 0 };
const textures = new Map();
const loader = new THREE.TextureLoader();

function loadWorldTexture(item) {
  if (!textures.has(item.id)) {
    textures.set(item.id, loader.loadAsync(`worldfall/maps/${item.id}.webp`).then((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      return texture;
    }));
  }
  return textures.get(item.id);
}

async function applyWorld(index) {
  const token = ++game.token;
  const item = WORLDS[index];
  const texture = await loadWorldTexture(item);
  if (token !== game.token) return false;
  renderer.initTexture(texture);
  planetMaterial.uniforms.uMap.value = texture;
  // Keep only the current and next maps on the GPU so phones do not run out of memory.
  const keep = new Set([item.id, WORLDS[index + 1]?.id]);
  textures.forEach((pending, id) => {
    if (keep.has(id)) return;
    textures.delete(id);
    pending.then((old) => old.dispose());
  });
  planetMaterial.uniforms.uAtm.value.set(...(item.atm || [0, 0, 0]));
  planetMaterial.uniforms.uPoleStart.value = item.pole ? item.pole[0] : 2;
  if (item.pole) planetMaterial.uniforms.uPole.value.set(...item.pole[1]);
  halo.material.opacity = item.atm ? .3 : 0;
  if (item.atm) halo.material.color.setRGB(...item.atm, THREE.SRGBColorSpace);
  planet.rotation.set(0, 0, THREE.MathUtils.degToRad(-item.tilt));
  spinner.rotation.y = Math.random() * Math.PI * 2;
  rings.visible = Boolean(item.rings);
  fx.fade = 0;
  layout();
  return true;
}

function layout() {
  const w = innerWidth;
  const h = innerHeight;
  const aspect = w / h;
  const wide = aspect > 1.2;
  renderer.setSize(w, h, false);
  camera.aspect = aspect;
  camera.position.set(0, 0, Math.max(7.2, 3 / aspect));
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  rig.position.x = wide ? -Math.min(3, 2.55 * aspect - 1.6) : 0;
  // Lower the stand until its tip sits a little below the world name and g readout.
  const pxPerUnit = h / (2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  const hudBottom = $('hudLeft').getBoundingClientRect().bottom;
  rig.position.y = Math.min(0, (h / 2 - hudBottom - HUD_GAP_PX) / pxPerUnit - RIG_TIP_Y);
  const item = WORLDS[game.index];
  const radius = item?.rings ? (wide ? 3.1 : 1.45) : (wide ? 5 : 4.1);
  planet.scale.setScalar(radius);
  if (item?.rings) planet.position.set(wide ? 1.2 : .25, wide ? 0 : -1.5, -7);
  else planet.position.set(wide ? .6 : 1.3, wide ? -.5 : -2.5, -7);
  planet.updateMatrixWorld(true);
  ringMaterial.uniforms.uCenter.value.copy(planet.position);
  ringMaterial.uniforms.uRadius.value = radius;
}
addEventListener('resize', layout);
document.fonts?.ready.then(layout);

function resetRig() {
  ball.visible = true;
  ball.position.set(0, CLAMP_Y, 0);
  apparatus.reset();
  shards.visible = false;
  fx.shard = 0;
  game.smashed = false;
}

function releaseClamp() {
  apparatus.release();
}

function setBall(t) {
  const d = Math.min(DROP_M, .5 * world().g * (t / 1000) ** 2);
  ball.position.y = CLAMP_Y - d * UNITS_PER_M;
}

function burstShards() {
  game.smashed = true;
  ball.visible = false;
  const position = shards.geometry.attributes.position;
  const colors = shards.geometry.attributes.color;
  for (let i = 0; i < SHARDS; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const speed = .6 + Math.random() * 2.6;
    position.setXYZ(i, Math.random() * .1 - .05, FLOOR_Y + .04, Math.random() * .1 - .05);
    shardVel.set([Math.cos(a) * speed, .6 + Math.random() * 3.2, Math.sin(a) * speed * .6], i * 3);
    const b = .65 + Math.random() * .35;
    colors.setXYZ(i, b, b * (.28 + Math.random() * .3), b * .16);
  }
  position.needsUpdate = true;
  colors.needsUpdate = true;
  shards.visible = true;
  shards.material.opacity = 1;
  fx.shard = 1;
  fx.shake = reducedMotion ? 0 : .07;
}

function updateScene(dt) {
  if (!reducedMotion) spinner.rotation.y += dt * .035;
  fx.fade = Math.min(1, fx.fade + dt * 2.4);
  planetMaterial.uniforms.uFade.value = fx.fade;
  ringMaterial.uniforms.uFade.value = fx.fade;

  if (fx.shard > 0) {
    fx.shard = Math.max(0, fx.shard - dt * .7);
    const p = shards.geometry.attributes.position.array;
    const gravity = world().g * UNITS_PER_M * .22;
    for (let i = 0; i < SHARDS; i += 1) {
      const j = i * 3;
      shardVel[j + 1] -= gravity * dt;
      p[j] += shardVel[j] * dt;
      p[j + 1] += shardVel[j + 1] * dt;
      p[j + 2] += shardVel[j + 2] * dt;
      if (p[j + 1] < FLOOR_Y + .01) {
        p[j + 1] = FLOOR_Y + .01;
        shardVel[j + 1] *= -.32;
        shardVel[j] *= .6;
      }
    }
    shards.geometry.attributes.position.needsUpdate = true;
    shards.material.opacity = Math.min(1, fx.shard * 2);
    shards.visible = fx.shard > 0;
  }

  apparatus.sync();

  if (fx.shake > .001) {
    camera.position.x = (Math.random() - .5) * fx.shake;
    camera.position.y = (Math.random() - .5) * fx.shake;
    fx.shake *= Math.exp(-dt * 11);
  } else {
    camera.position.x = 0;
    camera.position.y = 0;
  }
}

/* ---------- Game flow ---------- */
const pips = WORLDS.map(() => $('pips').appendChild(document.createElement('li')));

function setState(state) {
  game.state = state;
  document.body.dataset.state = state;
  rig.visible = state !== 'menu' && state !== 'results';
}

function showReadout(value, label = '', bad = false) {
  $('readoutValue').textContent = value;
  $('readoutValue').classList.toggle('bad', bad);
  $('readoutLabel').textContent = label;
}

function drawPips() {
  pips.forEach((pip, i) => {
    const result = game.results[i];
    pip.className = result ? (result.caught ? 'caught' : 'smashed') : (i === game.index ? 'current' : '');
  });
}

function drawBest() {
  $('menuBest').hidden = !game.best;
  if (game.best) $('menuBestValue').textContent = ms(game.best);
}

function drawTag() {
  const item = world();
  $('worldTag').innerHTML = `<b>${item.name}</b> <i>g</i> = <span>${item.g.toFixed(2)}&nbsp;m/s²</span>`;
}

async function showIntro() {
  resetRig();
  const item = world();
  $('readyBtn').disabled = true;
  $('introName').textContent = item.name;
  $('introG').textContent = `${item.g.toFixed(2)} m/s²`;
  $('introFall').textContent = ms(fallMs(item.g));
  $('introFact').textContent = item.fact;
  $('introSource').textContent = item.source;
  drawTag();
  drawPips();
  setState('intro');
  const applied = await applyWorld(game.index);
  if (applied && game.state === 'intro') {
    $('readyBtn').disabled = false;
    if (WORLDS[game.index + 1]) loadWorldTexture(WORLDS[game.index + 1]);
  }
}

function beginRun() {
  unlockAudio();
  document.activeElement?.blur?.();
  game.index = 0;
  game.results = [];
  game.falseStarts = 0;
  showIntro();
}

function beginAttempt() {
  if ($('readyBtn').disabled && game.state === 'intro') return;
  unlockAudio();
  document.activeElement?.blur?.();
  resetRig();
  game.onset = null;
  game.stalls = 0;
  game.goAt = performance.now() + foreperiod();
  showReadout('', '');
  setState('wait');
}

function retryAfter(value, label) {
  resetAfterVoid();
  showReadout(value, label, true);
  game.advance = false;
  game.nextAt = performance.now() + BETWEEN_MS;
  setState('between');
}

function resetAfterVoid() {
  fx.shard = 0;
  shards.visible = false;
}

function falseStart() {
  game.falseStarts += 1;
  playSfx('falseStart');
  fx.shake = reducedMotion ? 0 : .05;
  retryAfter('Too soon', 'Wait for the release');
}

function recordResult(rt) {
  const item = world();
  const limit = fallMs(item.g);
  const caught = rt < limit;
  game.results[game.index] = { rt, caught, cm: fallenCm(item.g, rt) };
  if (caught) {
    if (game.smashed) {
      game.smashed = false;
      fx.shard = 0;
      shards.visible = false;
      ball.visible = true;
    }
    setBall(rt);
    apparatus.mark();
    playSfx('catch', rt);
    showReadout(ms(rt), `Caught after ${fallenCm(item.g, rt).toFixed(1)} cm`);
  } else {
    if (!game.smashed) burstShards();
    playSfx('smash', item.g);
    showReadout(ms(rt), `Smashed. You needed under ${Math.round(limit)} ms`, true);
  }
  drawPips();
  game.advance = true;
  game.nextAt = performance.now() + BETWEEN_MS;
  setState('between');
}

function finishRun() {
  const times = game.results.map((result) => result.rt);
  const result = median(times);
  const caught = game.results.filter((item) => item.caught).length;
  const isBest = !game.best || result < game.best;
  if (isBest) {
    game.best = result;
    store('set', BEST_KEY, String(result));
  }
  drawBest();
  $('resultTitle').textContent = isBest ? 'New best' : `${caught} of ${WORLDS.length} caught`;
  $('median').textContent = ms(result);
  $('resultRows').replaceChildren(...WORLDS.map((item, i) => {
    const row = document.createElement('tr');
    const entry = game.results[i];
    if (!entry.caught) row.className = 'smashed';
    [item.name, item.g.toFixed(2), Math.round(entry.rt), entry.caught ? entry.cm.toFixed(1) : 'Smashed'].forEach((text) => {
      const cell = document.createElement('td');
      cell.textContent = text;
      row.appendChild(cell);
    });
    return row;
  }));
  $('resultExtra').textContent = `${caught} of ${WORLDS.length} caught. False starts: ${game.falseStarts}. Best: ${ms(game.best)}`;
  game.resultsAt = performance.now();
  game.index = randomWorldIndex();
  applyWorld(game.index);
  resetRig();
  setState('results');
}

function quit() {
  game.index = randomWorldIndex();
  game.results = [];
  resetRig();
  drawPips();
  showReadout('');
  setState('menu');
  applyWorld(game.index);
}

function pauseAttempt() {
  if (game.state !== 'wait' && game.state !== 'go') return;
  resetRig();
  showReadout('Paused', 'Tap to continue', true);
  setState('paused');
}

function respond(event) {
  if (game.state === 'paused') {
    beginAttempt();
  } else if (game.state === 'wait') {
    falseStart();
  } else if (game.state === 'go') {
    const t = event.timeStamp;
    if (game.onset === null) {
      if (t - game.goFrame > MAX_FRAME_GAP) retryAfter('Screen stutter', 'Same world again');
      else falseStart();
      return;
    }
    const rt = t - game.onset;
    if (rt < MIN_RT) falseStart();
    else if (rt > MAX_RT) retryAfter('Too slow', 'Same world again');
    else recordResult(rt);
  }
}

function frame(ts) {
  requestAnimationFrame(frame);
  const gap = ts - game.lastFrame;
  game.lastFrame = ts;

  if (game.state === 'wait' && ts >= game.goAt) {
    if (gap > MAX_FRAME_GAP) {
      game.stalls += 1;
      game.goAt = ts + 300;
      if (game.stalls >= MAX_STALLS) {
        showReadout('Screen too slow', 'Close other apps, then tap', true);
        setState('paused');
      }
    } else {
      releaseClamp();
      game.goFrame = ts;
      game.onset = null;
      setState('go');
    }
  } else if (game.state === 'go') {
    if (game.onset === null) {
      if (gap > MAX_FRAME_GAP) retryAfter('Screen stutter', 'Same world again');
      else game.onset = ts;
    } else {
      const elapsed = ts - game.onset;
      if (elapsed > MAX_RT) {
        retryAfter('Too slow', 'Same world again');
      } else {
        if (!game.smashed) setBall(elapsed);
        if (!game.smashed && elapsed >= fallMs(world().g)) burstShards();
      }
    }
  } else if (game.state === 'between' && ts >= game.nextAt) {
    if (!game.advance) {
      beginAttempt();
    } else if (game.index >= WORLDS.length - 1) {
      finishRun();
    } else {
      game.index += 1;
      showIntro();
    }
  }

  updateScene(Math.min(gap / 1000, .05) || 0);
  renderer.render(scene, camera);
}

// Worldfall is always a night scene, so the browser bar stays dark in either site theme.
const keepDarkBar = () => document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#05060f');
keepDarkBar();
window.addEventListener('panphy:theme-change', keepDarkBar);

/* ---------- Input ---------- */
document.addEventListener('pointerdown', (event) => {
  if (!event.isPrimary || event.button !== 0 || event.target.closest('button, a, .panel')) return;
  respond(event);
});

// Space only ever catches. Enter (or a click) starts, readies and resumes.
const isTimedState = () => game.state === 'wait' || game.state === 'go';
const blocksSpace = (event) => isTimedState() || Boolean(event.target.closest?.('.primaryBtn'));

document.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    const onControl = event.target.closest?.('button, a');
    if (blocksSpace(event) || !onControl) event.preventDefault();
    if (isTimedState() && !event.repeat) respond(event);
    return;
  }
  if (event.code !== 'Enter' || event.repeat || event.target.closest?.('button, a')) return;
  if (game.state === 'menu') beginRun();
  else if (game.state === 'intro' || game.state === 'paused') beginAttempt();
  else if (game.state === 'results' && performance.now() - game.resultsAt > RESULTS_LOCK_MS) beginRun();
  else return;
  event.preventDefault();
});

// Browsers activate a focused button when Space is released, so block that too.
document.addEventListener('keyup', (event) => {
  if (event.code === 'Space' && blocksSpace(event)) event.preventDefault();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pauseAttempt();
    audio?.suspend();
  } else if (audio && !game.muted) {
    audio.resume();
  }
});
addEventListener('blur', pauseAttempt);

$('startBtn').addEventListener('click', beginRun);
$('readyBtn').addEventListener('click', beginAttempt);
$('againBtn').addEventListener('click', () => {
  if (performance.now() - game.resultsAt > RESULTS_LOCK_MS) beginRun();
});
$('quitBtn').addEventListener('click', quit);
$('clearBtn').addEventListener('click', () => {
  game.best = null;
  store('remove', BEST_KEY);
  drawBest();
});

function drawSound() {
  $('soundBtn').setAttribute('aria-pressed', String(game.muted));
  $('soundBtn').setAttribute('aria-label', game.muted ? 'Unmute sound' : 'Mute sound');
}
$('soundBtn').addEventListener('click', () => {
  game.muted = !game.muted;
  store('set', MUTE_KEY, game.muted ? '1' : '0');
  drawSound();
  if (game.muted) music.stop();
  unlockAudio();
});

game.index = randomWorldIndex();
setState('menu');
drawSound();
drawBest();
drawPips();
resetRig();
layout();
applyWorld(game.index);
requestAnimationFrame(frame);
