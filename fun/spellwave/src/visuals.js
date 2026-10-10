// visuals.js — Spellwave's look: post-processing with automatic quality tiers,
// the gradient sky, stars, drifting motes, and the pooled spell effects
// (sparks, rings, glow flashes, light pulses).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Anything brighter than 1.0 in the linear frame blooms, so glowing things are
// drawn with colours multiplied by one of these gains and nothing else glows.
export const GLOW_GAIN = 2.6;
export const MOON_GLOW_GAIN = 1.2;

export const QUALITY_LEVELS = ['basic', 'medium', 'high'];

const EXPOSURE = 1.12;
const MAX_PIXEL_RATIO = { basic: 1.5, medium: 1.5, high: 2 };
const SLOW_FRAME_SECONDS = 1 / 42;
const QUALITY_SAMPLE_FRAMES = 90;
const QUALITY_WARMUP_FRAMES = 60;

const TONEMAPPED_OUTPUT = `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

// Box with a baked vertical gradient: the underside is darker than the top, which
// reads as soft ambient shading. Needs a material with vertexColors enabled.
export function shadedBoxGeometry(width, height, depth, bottomShade = 0.74) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  for (let index = 0; index < positions.count; index += 1) {
    const t = positions.getY(index) / height + 0.5;
    const shade = bottomShade + (1 - bottomShade) * t;
    colors[index * 3] = shade;
    colors[index * 3 + 1] = shade;
    colors[index * 3 + 2] = shade;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function createGlowTexture() {
  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.18, 'rgba(255,255,255,0.72)');
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.2)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function createSky(scene) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uHorizon: { value: new THREE.Color(0x07120f) },
      uMid: { value: new THREE.Color(0x07120f) },
      uTop: { value: new THREE.Color(0x07120f) },
      uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
      uMoonColor: { value: new THREE.Color(0xfff1b8) },
      uMoonGlow: { value: 0 },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uHorizon;
      uniform vec3 uMid;
      uniform vec3 uTop;
      uniform vec3 uMoonDir;
      uniform vec3 uMoonColor;
      uniform float uMoonGlow;
      varying vec3 vDir;
      void main() {
        vec3 dir = normalize(vDir);
        float h = clamp(dir.y, 0.0, 1.0);
        vec3 color = mix(uHorizon, uMid, smoothstep(0.0, 0.16, h));
        color = mix(color, uTop, smoothstep(0.1, 0.62, h));
        float toMoon = max(dot(dir, uMoonDir), 0.0);
        color += uMoonColor * uMoonGlow * (pow(toMoon, 220.0) * 0.28 + pow(toMoon, 14.0) * 0.07);
        gl_FragColor = vec4(color, 1.0);
        ${TONEMAPPED_OUTPUT}
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), material);
  dome.frustumCulled = false;
  dome.renderOrder = -1000;
  scene.add(dome);

  function sync(camera, horizon, mid, top, moon) {
    dome.position.copy(camera.position);
    material.uniforms.uHorizon.value.copy(horizon);
    material.uniforms.uMid.value.copy(mid);
    material.uniforms.uTop.value.copy(top);
    if (moon && moon.visible) {
      material.uniforms.uMoonDir.value.copy(moon.position).sub(camera.position).normalize();
      material.uniforms.uMoonColor.value.copy(moon.material.color);
      material.uniforms.uMoonGlow.value = moon.material.opacity;
    } else {
      material.uniforms.uMoonGlow.value = 0;
    }
  }

  return { sync };
}

function createStars(scene, count = 420) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 2);
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = (Math.random() - 0.5) * 130;
    positions[index * 3 + 1] = Math.random() * 44 + 6;
    positions[index * 3 + 2] = -Math.random() * 70 - 28;
    seeds[index * 2] = Math.random();
    seeds[index * 2 + 1] = Math.pow(Math.random(), 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 2));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0.72 },
      uSize: { value: 1 },
      uPixelRatio: { value: 1 },
    },
    vertexShader: `
      attribute vec2 seed;
      uniform float uTime;
      uniform float uSize;
      uniform float uPixelRatio;
      varying float vTwinkle;
      void main() {
        vTwinkle = 0.62 + 0.38 * sin(uTime * (0.8 + seed.x * 2.4) + seed.x * 40.0);
        gl_PointSize = (1.6 + seed.y * 3.4) * uSize * uPixelRatio;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying float vTwinkle;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float alpha = smoothstep(1.0, 0.0, d);
        gl_FragColor = vec4(vec3(1.0, 0.98, 0.9) * 1.5 * vTwinkle, alpha * alpha * uOpacity);
        ${TONEMAPPED_OUTPUT}
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = -999;
  scene.add(points);

  return {
    points,
    get opacity() { return material.uniforms.uOpacity.value; },
    set opacity(value) { material.uniforms.uOpacity.value = value; },
    set size(value) { material.uniforms.uSize.value = value; },
    update(seconds, pixelRatio) {
      material.uniforms.uTime.value = seconds;
      material.uniforms.uPixelRatio.value = pixelRatio;
      points.rotation.y = Math.sin(seconds * 0.004) * 0.2;
    },
  };
}

// World-space additive points shared by the ambient motes and the spark bursts.
function createGlowPoints(scene, max, glowTexture) {
  const positions = new Float32Array(max * 3);
  const colors = new Float32Array(max * 3);
  const sizes = new Float32Array(max);
  const alphas = new Float32Array(max);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: glowTexture },
      uScale: { value: 600 },
    },
    vertexShader: `
      attribute float size;
      attribute float alpha;
      uniform float uScale;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = color;
        vAlpha = alpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * uScale / max(0.1, -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float glow = texture2D(uMap, gl_PointCoord).a;
        gl_FragColor = vec4(vColor * ${GLOW_GAIN.toFixed(1)}, glow * vAlpha);
        ${TONEMAPPED_OUTPUT}
      }
    `,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 4;
  scene.add(points);
  return { points, positions, colors, sizes, alphas, geometry, material };
}

function createMotes(scene, glowTexture, count = 110) {
  const glow = createGlowPoints(scene, count, glowTexture);
  const seeds = new Float32Array(count * 4);
  for (let index = 0; index < count; index += 1) {
    seeds[index * 4] = (Math.random() - 0.5) * 30;
    seeds[index * 4 + 1] = 0.4 + Math.random() * 6.5;
    seeds[index * 4 + 2] = -44 + Math.random() * 52;
    seeds[index * 4 + 3] = Math.random() * Math.PI * 2;
    glow.sizes[index] = 0.08 + Math.random() * 0.12;
  }
  glow.geometry.attributes.size.needsUpdate = true;
  const tint = new THREE.Color();

  function update(seconds, color) {
    tint.copy(color).lerp(WHITE, 0.35);
    for (let index = 0; index < count; index += 1) {
      const phase = seeds[index * 4 + 3];
      const i3 = index * 3;
      glow.positions[i3] = seeds[index * 4] + Math.sin(seconds * 0.21 + phase) * 1.4;
      glow.positions[i3 + 1] = seeds[index * 4 + 1] + Math.sin(seconds * 0.33 + phase * 1.7) * 0.6;
      glow.positions[i3 + 2] = seeds[index * 4 + 2] + Math.cos(seconds * 0.17 + phase) * 1.2;
      glow.colors[i3] = tint.r;
      glow.colors[i3 + 1] = tint.g;
      glow.colors[i3 + 2] = tint.b;
      glow.alphas[index] = 0.08 + 0.26 * (0.5 + 0.5 * Math.sin(seconds * 1.3 + phase * 3.1));
    }
    glow.geometry.attributes.position.needsUpdate = true;
    glow.geometry.attributes.color.needsUpdate = true;
    glow.geometry.attributes.alpha.needsUpdate = true;
  }

  return { points: glow.points, material: glow.material, update };
}

const WHITE = new THREE.Color(0xffffff);

function createSpellEffects(scene, glowTexture) {
  const MAX_SPARKS = 900;
  const sparks = createGlowPoints(scene, MAX_SPARKS, glowTexture);
  const velocities = new Float32Array(MAX_SPARKS * 3);
  const lives = new Float32Array(MAX_SPARKS);
  const maxLives = new Float32Array(MAX_SPARKS);
  const baseSizes = new Float32Array(MAX_SPARKS);
  const gravities = new Float32Array(MAX_SPARKS);
  const drags = new Float32Array(MAX_SPARKS);
  let sparkCursor = 0;
  let liveSparks = 0;
  let sparkScale = 1;
  const scratchColor = new THREE.Color();

  const flashes = [];
  for (let index = 0; index < 16; index += 1) {
    const material = new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    sprite.renderOrder = 5;
    scene.add(sprite);
    flashes.push({ sprite, life: 0, maxLife: 1, size: 1 });
  }
  let flashCursor = 0;

  const ringGeometry = new THREE.RingGeometry(0.86, 1, 48);
  const rings = [];
  for (let index = 0; index < 12; index += 1) {
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    const mesh = new THREE.Mesh(ringGeometry, material);
    mesh.visible = false;
    mesh.renderOrder = 3;
    scene.add(mesh);
    rings.push({ mesh, life: 0, maxLife: 1, from: 0.2, to: 3, opacity: 1 });
  }
  let ringCursor = 0;

  // A fixed pool so the number of lights, and with it every compiled shader, stays constant.
  const pulses = [];
  for (let index = 0; index < 2; index += 1) {
    const light = new THREE.PointLight(0xffffff, 0, 16, 1.8);
    scene.add(light);
    pulses.push({ light, life: 0, maxLife: 1, intensity: 0 });
  }
  let pulseCursor = 0;

  function burst(position, options = {}) {
    const {
      color = 0xffffff,
      color2 = null,
      count = 14,
      speed = 4,
      life = 0.55,
      size = 0.3,
      gravity = 6,
      drag = 1.6,
      spread = 0.15,
      up = 1.2,
      direction = null,
      directionSpread = 0.5,
    } = options;
    const amount = Math.max(1, Math.round(count * sparkScale));
    for (let index = 0; index < amount; index += 1) {
      const slot = sparkCursor;
      sparkCursor = (sparkCursor + 1) % MAX_SPARKS;
      const i3 = slot * 3;
      sparks.positions[i3] = position.x + (Math.random() - 0.5) * spread;
      sparks.positions[i3 + 1] = position.y + (Math.random() - 0.5) * spread;
      sparks.positions[i3 + 2] = position.z + (Math.random() - 0.5) * spread;
      let vx = Math.random() * 2 - 1;
      let vy = Math.random() * 2 - 1;
      let vz = Math.random() * 2 - 1;
      const length = Math.hypot(vx, vy, vz) || 1;
      const magnitude = speed * (0.35 + Math.random() * 0.65);
      vx = (vx / length) * magnitude;
      vy = (vy / length) * magnitude;
      vz = (vz / length) * magnitude;
      if (direction) {
        vx = direction.x * magnitude + vx * directionSpread;
        vy = direction.y * magnitude + vy * directionSpread;
        vz = direction.z * magnitude + vz * directionSpread;
      }
      velocities[i3] = vx;
      velocities[i3 + 1] = vy + up;
      velocities[i3 + 2] = vz;
      scratchColor.set(color2 !== null && Math.random() < 0.4 ? color2 : color);
      sparks.colors[i3] = scratchColor.r;
      sparks.colors[i3 + 1] = scratchColor.g;
      sparks.colors[i3 + 2] = scratchColor.b;
      const sparkLife = life * (0.55 + Math.random() * 0.45);
      lives[slot] = sparkLife;
      maxLives[slot] = sparkLife;
      baseSizes[slot] = size * (0.6 + Math.random() * 0.4);
      gravities[slot] = gravity;
      drags[slot] = drag;
    }
    liveSparks = MAX_SPARKS;
  }

  function flash(position, color, size = 2, life = 0.22) {
    const entry = flashes[flashCursor];
    flashCursor = (flashCursor + 1) % flashes.length;
    entry.sprite.position.copy(position);
    entry.sprite.material.color.set(color).multiplyScalar(GLOW_GAIN);
    entry.sprite.visible = true;
    entry.life = life;
    entry.maxLife = life;
    entry.size = size;
  }

  // flat = lying on the ground; otherwise the ring faces the camera.
  function ring(position, color, { from = 0.3, to = 3, life = 0.4, opacity = 0.85, flat = true } = {}) {
    const entry = rings[ringCursor];
    ringCursor = (ringCursor + 1) % rings.length;
    entry.mesh.position.copy(position);
    entry.mesh.material.color.set(color).multiplyScalar(GLOW_GAIN);
    entry.mesh.visible = true;
    entry.life = life;
    entry.maxLife = life;
    entry.from = from;
    entry.to = to;
    entry.opacity = opacity;
    entry.flat = flat;
    if (flat) entry.mesh.rotation.set(-Math.PI / 2, 0, 0);
  }

  function lightPulse(position, color, intensity = 18, life = 0.28) {
    const entry = pulses[pulseCursor];
    pulseCursor = (pulseCursor + 1) % pulses.length;
    entry.light.position.copy(position);
    entry.light.color.set(color);
    entry.life = life;
    entry.maxLife = life;
    entry.intensity = intensity;
  }

  function update(delta, camera) {
    if (liveSparks > 0) {
      let stillAlive = 0;
      for (let slot = 0; slot < MAX_SPARKS; slot += 1) {
        if (lives[slot] <= 0) continue;
        lives[slot] -= delta;
        const i3 = slot * 3;
        if (lives[slot] <= 0) {
          sparks.alphas[slot] = 0;
          sparks.sizes[slot] = 0;
          continue;
        }
        stillAlive += 1;
        const damping = Math.max(0, 1 - drags[slot] * delta);
        velocities[i3] *= damping;
        velocities[i3 + 1] = velocities[i3 + 1] * damping - gravities[slot] * delta;
        velocities[i3 + 2] *= damping;
        sparks.positions[i3] += velocities[i3] * delta;
        sparks.positions[i3 + 1] += velocities[i3 + 1] * delta;
        sparks.positions[i3 + 2] += velocities[i3 + 2] * delta;
        const amount = lives[slot] / maxLives[slot];
        sparks.alphas[slot] = Math.min(1, amount * 1.6);
        sparks.sizes[slot] = baseSizes[slot] * (0.35 + amount * 0.65);
      }
      liveSparks = stillAlive;
      sparks.geometry.attributes.position.needsUpdate = true;
      sparks.geometry.attributes.color.needsUpdate = true;
      sparks.geometry.attributes.size.needsUpdate = true;
      sparks.geometry.attributes.alpha.needsUpdate = true;
    }

    for (const entry of flashes) {
      if (entry.life <= 0) continue;
      entry.life -= delta;
      if (entry.life <= 0) {
        entry.sprite.visible = false;
        continue;
      }
      const amount = entry.life / entry.maxLife;
      const scale = entry.size * (0.55 + (1 - amount) * 0.75);
      entry.sprite.scale.set(scale, scale, 1);
      entry.sprite.material.opacity = amount;
    }

    for (const entry of rings) {
      if (entry.life <= 0) continue;
      entry.life -= delta;
      if (entry.life <= 0) {
        entry.mesh.visible = false;
        continue;
      }
      const amount = entry.life / entry.maxLife;
      const eased = 1 - amount * amount;
      entry.mesh.scale.setScalar(entry.from + (entry.to - entry.from) * eased);
      entry.mesh.material.opacity = amount * entry.opacity;
      if (!entry.flat) entry.mesh.quaternion.copy(camera.quaternion);
    }

    for (const entry of pulses) {
      if (entry.life <= 0) continue;
      entry.life -= delta;
      entry.light.intensity = entry.life <= 0 ? 0 : entry.intensity * (entry.life / entry.maxLife);
    }
  }

  function clear() {
    lives.fill(0);
    sparks.alphas.fill(0);
    sparks.sizes.fill(0);
    sparks.geometry.attributes.alpha.needsUpdate = true;
    sparks.geometry.attributes.size.needsUpdate = true;
    liveSparks = 0;
    for (const entry of flashes) { entry.life = 0; entry.sprite.visible = false; }
    for (const entry of rings) { entry.life = 0; entry.mesh.visible = false; }
    for (const entry of pulses) { entry.life = 0; entry.light.intensity = 0; }
  }

  return {
    burst, flash, ring, lightPulse, update, clear,
    material: sparks.material,
    setSparkScale(value) { sparkScale = value; },
  };
}

export function createVisuals({ renderer, scene, camera, available }) {
  const glowTexture = createGlowTexture();
  const sky = createSky(scene);
  const stars = createStars(scene);
  const motes = createMotes(scene, glowTexture);
  const effects = createSpellEffects(scene, glowTexture);

  let composer = null;
  let aoPass = null;
  let maxSamples = 0;
  let quality = 'high';
  let autoQuality = 'high';
  let saver = false;
  let width = window.innerWidth;
  let height = window.innerHeight;
  let sampleFrames = 0;
  let sampleSeconds = 0;
  let warmupFrames = QUALITY_WARMUP_FRAMES;

  if (available) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = EXPOSURE;
    // A soft neutral environment so metal (chest trim, wand bands) has something to reflect.
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.3;
    pmrem.dispose();
    loadComposer();
  }

  // The add-ons load after the first frame; until then, and if the CDN fails,
  // the scene renders directly with the renderer's own tone mapping.
  async function loadComposer() {
    try {
      const [post, n8ao] = await Promise.all([import('postprocessing'), import('n8ao')]);
      const built = new post.EffectComposer(renderer, {
        frameBufferType: THREE.HalfFloatType,
        multisampling: 0,
      });
      maxSamples = renderer.capabilities.maxSamples || 0;
      built.addPass(new post.RenderPass(scene, camera));

      aoPass = new n8ao.N8AOPostPass(scene, camera, width, height);
      aoPass.configuration.aoRadius = 1.1;
      aoPass.configuration.distanceFalloff = 1.2;
      aoPass.configuration.intensity = 2.4;
      aoPass.configuration.halfRes = true;
      aoPass.configuration.depthAwareUpsampling = true;
      aoPass.configuration.color = new THREE.Color(0x0a0f1e);
      aoPass.setQualityMode('Low');
      built.addPass(aoPass);

      const bloom = new post.BloomEffect({
        mipmapBlur: true,
        luminanceThreshold: 1.0,
        luminanceSmoothing: 0.18,
        intensity: 1.15,
        radius: 0.72,
      });
      const vignette = new post.VignetteEffect({ offset: 0.32, darkness: 0.52 });
      const grade = new post.HueSaturationEffect({ saturation: 0.1 });
      const toneMapping = new post.ToneMappingEffect({ mode: post.ToneMappingMode.ACES_FILMIC });
      built.addPass(new post.EffectPass(camera, bloom, toneMapping, grade, vignette));

      composer = built;
      applyQuality();
    } catch (error) {
      console.warn('Spellwave post-processing is unavailable; using the basic renderer.', error);
      composer = null;
    }
  }

  function usesComposer() {
    return Boolean(composer) && quality !== 'basic';
  }

  function applyQuality() {
    if (!available) return;
    quality = saver ? 'basic' : autoQuality;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO[quality]));
    // The composer tone-maps in its last pass, so the renderer must not do it as well.
    renderer.toneMapping = usesComposer() ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    if (aoPass) aoPass.enabled = quality === 'high';
    if (composer) composer.multisampling = Math.min(quality === 'high' ? 4 : 2, maxSamples);
    motes.points.visible = !saver;
    effects.setSparkScale(saver ? 0.5 : quality === 'medium' ? 0.8 : 1);
    setSize(width, height);
  }

  function setSize(nextWidth, nextHeight) {
    width = nextWidth;
    height = nextHeight;
    if (!available) return;
    renderer.setSize(width, height, false);
    if (composer) composer.setSize(width, height, false);
    const scale = (height * renderer.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    motes.material.uniforms.uScale.value = scale;
    effects.material.uniforms.uScale.value = scale;
  }

  // Steps down one tier when a run of frames is slow; it never steps back up,
  // so the picture cannot flicker between tiers.
  function trackFrame(delta) {
    if (!available || saver || quality === 'basic' || delta <= 0 || delta > 0.1) return;
    if (warmupFrames > 0) {
      warmupFrames -= 1;
      return;
    }
    sampleFrames += 1;
    sampleSeconds += delta;
    if (sampleFrames < QUALITY_SAMPLE_FRAMES) return;
    const average = sampleSeconds / sampleFrames;
    sampleFrames = 0;
    sampleSeconds = 0;
    if (average > SLOW_FRAME_SECONDS) {
      autoQuality = QUALITY_LEVELS[Math.max(0, QUALITY_LEVELS.indexOf(autoQuality) - 1)];
      warmupFrames = QUALITY_WARMUP_FRAMES;
      applyQuality();
    }
  }

  function render(delta, { measure = false } = {}) {
    if (!available) return;
    if (measure) trackFrame(delta);
    if (usesComposer()) composer.render(delta);
    else renderer.render(scene, camera);
  }

  return {
    sky,
    stars,
    motes,
    effects,
    render,
    setSize,
    setBatterySaver(active) {
      saver = active;
      applyQuality();
    },
    getQuality: () => quality,
    setAutoQuality(level) {
      if (!QUALITY_LEVELS.includes(level)) return;
      autoQuality = level;
      applyQuality();
    },
  };
}
