// Rendering. The scene is centered on the craft with axes x east, y up, z south
// (meters), so nothing near the camera ever has large coordinates.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { Earth } from './earth.js';
import { buildRocket, buildPlumes, buildPad, buildStars } from './models.js';
import { R_EARTH, OMEGA, airDensity, pressureRatio, orbitRadius } from './physics.js';

const SITE_LONGITUDE = -51.4 * Math.PI / 180;     // on the equator, on the coast of Brazil
const SUN_HOUR_ANGLE = 50 * Math.PI / 180;        // the sun is this far east of the site at liftoff: mid-morning
const SUN_DECLINATION = -16 * Math.PI / 180;
const SUN_INERTIAL = new THREE.Vector3(
  Math.cos(SUN_DECLINATION) * Math.cos(SUN_HOUR_ANGLE),
  Math.cos(SUN_DECLINATION) * Math.sin(SUN_HOUR_ANGLE),
  Math.sin(SUN_DECLINATION)
);
const MAX_SMOKE = 1400;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export function loadTextures(quality, onProgress) {
  const loader = new THREE.TextureLoader();
  const files = quality === 'high'
    ? { day: 'earth_day_8k.webp', night: 'earth_night_4k.webp', clouds: 'earth_clouds_4k.webp' }
    : { day: 'earth_day_4k.webp', night: 'earth_night_2k.webp', clouds: 'earth_clouds_2k.webp' };
  let loaded = 0;
  const load = (name) => loader.loadAsync(new URL(`./textures/${files[name]}`, import.meta.url).href).then((texture) => {
    texture.colorSpace = name === 'clouds' ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    loaded += 1;
    onProgress?.(loaded / 3);
    return texture;
  });
  return Promise.all([load('day'), load('night'), load('clouds')]).then(([day, night, clouds]) => ({ day, night, clouds }));
}

export class Scene {
  constructor(canvas, textures, quality) {
    this.canvas = canvas;
    this.quality = quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.maxPixelRatio = quality === 'high' ? 2 : 1.25;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 1, 1e7);

    this.stars = buildStars(quality === 'high' ? 9000 : 5000);
    this.earth = new Earth(textures, quality);
    // The sky is drawn first, in its own pass, and everything else goes over it.
    this.sky = new THREE.Scene();
    this.sky.add(this.stars, this.earth.mesh);

    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.05;
    this.scene.add(this.sun, this.sun.target);
    this.skyLight = new THREE.HemisphereLight(0x88aaff, 0x554433, 0.6);
    this.scene.add(this.skyLight);
    this.engineLight = new THREE.PointLight(0xffa050, 0, 0, 1.6);
    this.scene.add(this.engineLight);

    this.rocketPivot = new THREE.Group();
    this.scene.add(this.rocketPivot);
    this.padPivot = new THREE.Group();
    this.scene.add(this.padPivot);
    this.debrisPivot = new THREE.Group();
    this.scene.add(this.debrisPivot);
    this.debris = new Map();
    this.buildSmoke();
    this.buildGlow();
    this.buildMap();

    this.composer = new EffectComposer(this.renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: quality === 'high' ? 4 : 0 }));
    this.composer.addPass(new RenderPass(this.sky, this.camera));
    const main = new RenderPass(this.scene, this.camera);
    main.clear = false;
    main.clearDepth = true;
    this.composer.addPass(main);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.5, 1.4);
    this.composer.addPass(this.bloom);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.composer.addPass(new OutputPass());

    // Camera rig.
    this.view = { yaw: 0.5, elevation: 0.12, distance: 120, mapYaw: -Math.PI / 2, mapTilt: 0.03, mapDistance: 9e7, blend: 0, target: 0 };
    this.focus = 0;
    this.autoRotate = 0;
    this.shake = 0;
    this.time = 0;
    this.markers = [];
    this.frame = new THREE.Matrix3();
    this.sunLocal = new THREE.Vector3();
    this.shift = 0;
    this.bindPointer();
    this.resize();
  }

  // --- construction -------------------------------------------------------

  buildSmoke() {
    const geometry = new THREE.BufferGeometry();
    this.smokePositions = new Float32Array(MAX_SMOKE * 3);
    this.smokeData = new Float32Array(MAX_SMOKE * 4);       // age 0..1, size, seed, heat
    geometry.setAttribute('position', new THREE.BufferAttribute(this.smokePositions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aData', new THREE.BufferAttribute(this.smokeData, 4).setUsage(THREE.DynamicDrawUsage));
    this.smokeMaterial = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 1 }, uLit: { value: new THREE.Color(1, 1, 1) }, uShade: { value: new THREE.Color(0.3, 0.3, 0.35) } },
      vertexShader: /* glsl */`
        attribute vec4 aData;
        uniform float uScale;
        varying vec4 vData;
        void main() {
          vData = aData;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aData.x >= 1.0 ? 0.0 : min(uScale * aData.y / max(-mv.z, 0.1), 1400.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform vec3 uLit, uShade;
        varying vec4 vData;
        void main() {
          vec2 p = gl_PointCoord * 2.0 - 1.0;
          float r = length(p);
          if (r > 1.0) discard;
          float puff = max(1.0 - r * r, 0.0);
          puff *= puff;
          float life = clamp(vData.x, 0.0, 1.0);
          vec3 color = mix(uShade, uLit, 0.45 + 0.55 * (0.5 - p.y * 0.5));
          color = mix(color, vec3(3.4, 1.4, 0.35), min(vData.w, 1.0) * (1.0 - smoothstep(0.0, vData.w > 1.5 ? 0.55 : 0.12, life)));
          float alpha = puff * smoothstep(0.0, 0.012, life) * pow(1.0 - life, 1.6) * 0.75;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true, depthWrite: false
    });
    this.smoke = new THREE.Points(geometry, this.smokeMaterial);
    this.smoke.frustumCulled = false;
    this.smoke.renderOrder = 5;
    this.scene.add(this.smoke);
    this.smokeParticles = [];
    for (let i = 0; i < MAX_SMOKE; i += 1) {
      this.smokeParticles.push({ life: 0, age: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, size: 1, grow: 1 });
      this.smokeData[i * 4] = 1;
    }
    this.smokeCursor = 0;
    this.smokeDebt = 0;
  }

  // Glow of air heating on the nose at high speed.
  buildGlow() {
    const geometry = new THREE.SphereGeometry(1, 24, 16);
    this.glowMaterial = new THREE.ShaderMaterial({
      uniforms: { uHeat: { value: 0 }, uTime: { value: 0 } },
      vertexShader: /* glsl */`
        varying vec3 vN; varying vec3 vV; varying vec3 vP;
        void main() {
          vP = position;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */`
        uniform float uHeat, uTime;
        varying vec3 vN; varying vec3 vV; varying vec3 vP;
        void main() {
          float rim = pow(abs(dot(vN, vV)), 1.6);
          float front = smoothstep(-0.9, 0.9, vP.y);
          float streak = 0.75 + 0.25 * sin(vP.y * 9.0 + uTime * 50.0 + atan(vP.x, vP.z) * 6.0);
          vec3 color = mix(vec3(1.0, 0.25, 0.05), vec3(1.0, 0.85, 0.6), front * uHeat);
          gl_FragColor = vec4(color * rim * mix(0.15, 1.0, front) * streak * uHeat * 5.0, 1.0);
        }
      `,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide
    });
    this.glow = new THREE.Mesh(geometry, this.glowMaterial);
    this.glow.visible = false;
    this.scene.add(this.glow);
  }

  buildMap() {
    this.mapGroup = new THREE.Group();              // inertial axes, centered on Earth
    this.scene.add(this.mapGroup);
    this.occluder = new THREE.Mesh(new THREE.SphereGeometry(R_EARTH, 96, 48), new THREE.MeshBasicMaterial({ colorWrite: false }));
    this.occluder.renderOrder = -5;
    this.mapGroup.add(this.occluder);
    const line = (color, width, dashed) => {
      const material = new LineMaterial({ color, linewidth: width, transparent: true, dashed, dashSize: 3e5, gapSize: 2.2e5, depthWrite: false });
      material.color.multiplyScalar(dashed ? 1.1 : 2.2);
      const object = new Line2(new LineGeometry(), material);
      object.frustumCulled = false;
      object.renderOrder = 8;
      this.mapGroup.add(object);
      return object;
    };
    this.orbitLine = line(0x39c8ff, 2.6, false);
    this.targetLine = line(0xffc24a, 1.6, true);
    this.targetRadius = 0;
    this.mapGroup.visible = false;
  }

  setTargetOrbit(radius) {
    this.targetRadius = radius || 0;
    if (!radius) return;
    const points = [];
    for (let i = 0; i <= 256; i += 1) {
      const a = i / 256 * Math.PI * 2;
      points.push(radius * Math.cos(a), radius * Math.sin(a), 0);
    }
    this.targetLine.geometry.dispose();
    this.targetLine.geometry = new LineGeometry();
    this.targetLine.geometry.setPositions(points);
    this.targetLine.computeLineDistances();
  }

  // Replace the rocket (and the pad's tower, sized to it).
  setRocket(info) {
    this.clearDebris();
    if (this.rocket) this.rocketPivot.remove(this.rocket.root);
    if (this.pad) this.padPivot.remove(this.pad);
    this.rocket = null;
    if (!info) { this.pad = null; return; }
    this.rocket = buildRocket(info);
    this.plumes = buildPlumes(this.rocket);
    this.rocketPivot.add(this.rocket.root);
    this.pad = buildPad(this.rocket.height);
    this.padPivot.add(this.pad);
    this.shownStage = 0;
    this.focus = this.rocket.height / 2;
    for (let i = 0; i < MAX_SMOKE; i += 1) { this.smokeParticles[i].life = 0; this.smokeData[i * 4] = 1; }
  }

  frameRocket() {
    if (!this.rocket) return;
    this.view.distance = clamp(this.rocket.height * 2.6, 25, 400);
    this.view.elevation = 0.1;
  }

  clearDebris() {
    for (const piece of this.debris.values()) this.debrisPivot.remove(piece.holder);
    this.debris.clear();
  }

  // --- input ---------------------------------------------------------------

  bindPointer() {
    const pointers = new Map();
    let pinch = 0;
    const canvas = this.canvas;
    canvas.addEventListener('pointerdown', (event) => {
      canvas.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, [event.clientX, event.clientY]);
      this.autoRotate = 0;
    });
    canvas.addEventListener('pointermove', (event) => {
      const last = pointers.get(event.pointerId);
      if (!last) return;
      const dx = event.clientX - last[0], dy = event.clientY - last[1];
      pointers.set(event.pointerId, [event.clientX, event.clientY]);
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const spread = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinch) this.zoom(pinch / spread);
        pinch = spread;
        return;
      }
      if (this.view.target > 0.5) {
        this.view.mapYaw -= dx * 0.006;
        this.view.mapTilt = clamp(this.view.mapTilt - dy * 0.005, 0.03, 1.45);
      } else {
        this.view.yaw -= dx * 0.006;
        this.view.elevation = clamp(this.view.elevation + dy * 0.005, -1.45, 1.5);
      }
    });
    const release = (event) => { pointers.delete(event.pointerId); pinch = 0; };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      this.zoom(Math.exp(clamp(event.deltaY, -120, 120) * 0.0016));
    }, { passive: false });
  }

  zoom(factor) {
    if (this.view.target > 0.5) this.view.mapDistance = clamp(this.view.mapDistance * factor, 3.5e7, 1.5e9);
    else this.view.distance = clamp(this.view.distance * factor, this.rocket ? Math.max(8, this.rocket.height * 0.5) : 20, 60000);
  }

  // Slide the picture sideways (pixels) so a side panel does not cover the rocket.
  setShift(pixels) {
    if (pixels === this.shift) return;
    this.shift = pixels;
    this.resize();
  }

  setMap(on) { this.view.target = on ? 1 : 0; }
  get mapOpen() { return this.view.target > 0.5; }

  resize() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, this.maxPixelRatio);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
    this.composer.setPixelRatio(ratio);
    this.composer.setSize(width, height);
    this.camera.aspect = width / height;
    if (this.shift) this.camera.setViewOffset(width, height, -this.shift, 0, width, height);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    this.width = width;
    this.height = height;
    this.pixels = height * ratio;
    for (const object of [this.orbitLine, this.targetLine]) object.material.resolution.set(width, height);
  }

  // --- per frame -----------------------------------------------------------

  // state: { t, x, y, vx, vy, heading, stage, power, heat, debris, orbit, events, showRocket }
  render(state, dt, simDt) {
    this.time += dt;
    const r = Math.hypot(state.x, state.y);
    const altitude = r - R_EARTH;
    const phi = Math.atan2(state.y, state.x);
    const cos = Math.cos(phi), sin = Math.sin(phi);
    // Rows are the craft's east, up and south directions in inertial coordinates.
    this.frame.set(-sin, cos, 0, cos, sin, 0, 0, 0, -1);
    const sun = this.sunLocal.copy(SUN_INERTIAL).applyMatrix3(this.frame);
    const tilt = state.heading - phi;
    const density = airDensity(altitude);

    // Rocket.
    const rocket = this.rocket;
    const visible = Boolean(rocket) && state.showRocket !== false;
    this.rocketPivot.visible = visible;
    let axisX = 0, axisY = 1;
    if (rocket) {
      this.rocketPivot.rotation.z = -tilt;
      axisX = Math.sin(tilt); axisY = Math.cos(tilt);
      this.syncStages(state);
      const base = rocket.stages[Math.min(state.stage, rocket.stages.length - 1)]?.base ?? rocket.payloadBase;
      rocket.root.position.y = -base;
      const mid = (rocket.height - base) / 2;
      this.focus += (mid - this.focus) * Math.min(1, dt * 3);
      this.updatePlumes(state, altitude);
    }

    // Launch site, carried round by the Earth.
    if (this.pad) {
      const siteAngle = OMEGA * state.t;
      const dx = R_EARTH * Math.cos(siteAngle) - state.x, dy = R_EARTH * Math.sin(siteAngle) - state.y;
      const east = -sin * dx + cos * dy, up = cos * dx + sin * dy;
      const near = Math.hypot(east, up) < 150000 && state.showRocket !== false;
      this.padPivot.visible = near;
      if (near) {
        this.padPivot.position.set(east, up, 0);
        this.padPivot.rotation.z = -(siteAngle - phi);
      }
    }
    this.updateDebris(state, cos, sin, phi);
    this.updateSmoke(state, dt, simDt, altitude, density, axisX, axisY, visible);

    // Camera.
    const view = this.view;
    view.blend += clamp(view.target - view.blend, -dt * 1.3, dt * 1.3);
    if (this.autoRotate) view.yaw += this.autoRotate * dt;
    const camera = this.camera;
    const pivot = FLIGHT_PIVOT.set(axisX * this.focus, axisY * this.focus, 0);
    const ce = Math.cos(view.elevation);
    FLIGHT_POS.set(ce * Math.sin(view.yaw), Math.sin(view.elevation), ce * Math.cos(view.yaw)).multiplyScalar(view.distance).add(pivot);
    if (altitude + FLIGHT_POS.y < 2.5) FLIGHT_POS.y = 2.5 - altitude;
    HELPER.up.set(0, 1, 0);
    HELPER.position.copy(FLIGHT_POS);
    HELPER.lookAt(pivot);
    FLIGHT_QUAT.copy(HELPER.quaternion);
    if (view.blend > 0) {
      const center = MAP_CENTER.set(0, -r, 0);
      const st = Math.sin(view.mapTilt);
      MAP_POS.set(st * Math.cos(view.mapYaw), st * Math.sin(view.mapYaw), Math.cos(view.mapTilt)).multiplyScalar(view.mapDistance).applyMatrix3(this.frame).add(center);
      HELPER.up.set(0, 0, 1).applyMatrix3(this.frame);
      HELPER.position.copy(MAP_POS);
      HELPER.lookAt(center);
      const eased = smooth(0, 1, view.blend);
      const k = 9;
      const w = view.blend >= 1 ? 1 : (Math.exp(k * eased) - 1) / (Math.exp(k) - 1);
      camera.position.lerpVectors(FLIGHT_POS, MAP_POS, w);
      camera.quaternion.slerpQuaternions(FLIGHT_QUAT, HELPER.quaternion, eased);
    } else {
      camera.position.copy(FLIGHT_POS);
      camera.quaternion.copy(FLIGHT_QUAT);
    }
    if (this.shake > 0.001) {
      camera.position.x += (Math.random() - 0.5) * this.shake;
      camera.position.y += (Math.random() - 0.5) * this.shake;
      camera.position.z += (Math.random() - 0.5) * this.shake;
    }
    // The map uses a long lens, so a low orbit is not hidden behind the Earth's curve.
    camera.fov = 50 - 36 * smooth(0, 1, view.blend);
    const reach = camera.position.length();
    camera.near = Math.max(0.3, reach * 0.02);
    camera.far = camera.near * 4e6;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    // Light: sunlight reddened and dimmed by the air it crosses, and blocked by the Earth.
    const sunHeight = clamp(sun.y, -1, 1);
    const dip = Math.acos(R_EARTH / Math.max(r, R_EARTH + 1));
    const lit = smooth(-dip - 0.02, -dip + 0.06, Math.asin(sunHeight));
    const column = density / 1.225 * 8 / (Math.max(sunHeight, 0) + 0.06 + 0.4 * Math.max(0, -sunHeight));
    const sunColor = SUN_COLOR.setRGB(Math.exp(-5.8e-3 * column), Math.exp(-13.5e-3 * column), Math.exp(-33.1e-3 * column));
    this.sun.color.copy(sunColor);
    this.sun.intensity = 3.4 * lit;
    this.sun.position.copy(sun).multiplyScalar(400);
    const span = clamp(rocket ? rocket.height * 2.6 : 60, 60, 320);
    const shadow = this.sun.shadow.camera;
    if (shadow.right !== span) {
      shadow.left = -span; shadow.right = span; shadow.top = span; shadow.bottom = -span;
      shadow.near = 10; shadow.far = 900;
      shadow.updateProjectionMatrix();
    }
    const air = clamp(density / 1.225 * 4, 0, 1);
    const daylight = smooth(-0.1, 0.25, sunHeight);
    this.skyLight.color.setRGB(0.35 * air + 0.07, 0.5 * air + 0.08, 0.85 * air + 0.12);
    this.skyLight.groundColor.setRGB(0.3, 0.32, 0.36).multiplyScalar(0.25 + 0.75 * daylight * (1 - 0.4 * air));
    this.skyLight.intensity = 0.45 + 0.7 * daylight;
    this.engineLight.intensity = (state.power || 0) > 0 && visible ? 600 * state.power * (1 + 0.15 * Math.sin(this.time * 47)) : 0;
    this.engineLight.position.set(-axisX * 4, -axisY * 4, 0);
    this.smokeMaterial.uniforms.uLit.value.copy(sunColor).multiplyScalar(0.25 + 1.3 * lit);
    this.smokeMaterial.uniforms.uShade.value.setRGB(0.22, 0.25, 0.32).multiplyScalar(0.15 + 0.85 * daylight);
    this.smokeMaterial.uniforms.uScale.value = this.pixels / (2 * Math.tan(camera.fov * Math.PI / 360));

    // Exposure opens up in the Earth's shadow.
    const exposure = 0.95 + 1.6 * (1 - lit) * (1 - (state.power || 0) * 0.3);
    this.renderer.toneMappingExposure += (exposure - this.renderer.toneMappingExposure) * Math.min(1, dt * 1.5);
    this.shake *= Math.exp(-dt * 6);

    // Heating glow.
    const heat = clamp((state.heat || 0) * 1.6 - 0.25, 0, 1);
    this.glow.visible = heat > 0.01 && visible;
    if (this.glow.visible && rocket) {
      const length = rocket.height - (rocket.stages[state.stage]?.base ?? 0);
      this.glow.position.set(axisX * length * 0.62, axisY * length * 0.62, 0);
      this.glow.rotation.z = -tilt;
      this.glow.scale.set(rocket.stages[0].radius * 3.2, length * 0.75, rocket.stages[0].radius * 3.2);
      this.glowMaterial.uniforms.uHeat.value = heat;
      this.glowMaterial.uniforms.uTime.value = this.time;
    }

    // Sky.
    const lon0 = phi - OMEGA * state.t + SITE_LONGITUDE;
    const pixelAngle = camera.fov * Math.PI / 180 / this.pixels;
    this.earth.update(camera, altitude, sun, lon0, state.t * 6e-6 + this.time * 2e-5, pixelAngle);
    this.stars.material.uniforms.uFrame.value.copy(this.frame);
    this.stars.material.uniforms.uScale.value = this.pixels / 900;
    this.stars.material.uniforms.uGain.value = 0.6 + 0.5 * (1 - lit);

    this.updateMap(state, r);
    this.composer.render(dt);
  }

  syncStages(state) {
    const rocket = this.rocket;
    while (this.shownStage < state.stage && this.shownStage < rocket.stages.length) {
      const dropped = rocket.stages[this.shownStage];
      rocket.root.remove(dropped.group);
      this.plumes[this.shownStage].group.visible = false;
      const holder = new THREE.Group();
      dropped.group.position.y = -dropped.base;
      holder.add(dropped.group);
      this.debrisPivot.add(holder);
      this.debris.set(this.shownStage, { holder });
      this.shownStage += 1;
    }
  }

  updatePlumes(state, altitude) {
    const power = state.power || 0;
    const vac = 1 - Math.sqrt(pressureRatio(altitude));
    this.plumes.forEach((set, i) => {
      const on = i === state.stage && power > 0.001;
      set.group.visible = on;
      if (!on) return;
      for (const material of set.materials) {
        material.uniforms.uPower.value = power;
        material.uniforms.uVac.value = vac;
        material.uniforms.uTime.value = this.time;
      }
    });
  }

  updateDebris(state, cos, sin, phi) {
    const live = new Set();
    for (const piece of state.debris || []) {
      const entry = this.debris.get(piece.stage);
      if (!entry) continue;
      live.add(piece.stage);
      const dx = piece.x - state.x, dy = piece.y - state.y;
      entry.holder.position.set(-sin * dx + cos * dy, cos * dx + sin * dy, 0);
      entry.holder.rotation.z = -(piece.heading - phi);
    }
    for (const [stage, entry] of this.debris) {
      if (!live.has(stage)) { this.debrisPivot.remove(entry.holder); this.debris.delete(stage); }
    }
  }

  // Exhaust smoke hangs in the air where it was made, so it trails behind the climbing rocket.
  updateSmoke(state, dt, simDt, altitude, density, axisX, axisY, visible) {
    const step = Math.min(simDt, 0.25);
    const rvx = state.vx + OMEGA * state.y, rvy = state.vy - OMEGA * state.x;
    const phi = Math.atan2(state.y, state.x);
    const cos = Math.cos(phi), sin = Math.sin(phi);
    const craftEast = -sin * rvx + cos * rvy, craftUp = cos * rvx + sin * rvy;
    this.craftEast = craftEast; this.craftUp = craftUp;
    const thick = clamp(density / 0.02, 0, 1);
    const power = visible ? (state.power || 0) : 0;
    const rocket = this.rocket;
    if (power > 0 && thick > 0.01 && rocket && simDt < 0.3) {
      const stage = rocket.stages[state.stage];
      const radius = stage ? stage.radius : 1;
      this.smokeDebt += dt * (this.quality === 'high' ? 170 : 90) * power * thick;
      const speed = 25 + 40 * Math.random();
      while (this.smokeDebt >= 1) {
        this.smokeDebt -= 1;
        const particle = this.smokeParticles[this.smokeCursor];
        const index = this.smokeCursor;
        this.smokeCursor = (this.smokeCursor + 1) % MAX_SMOKE;
        const back = radius * (8 + Math.random() * 26);
        particle.x = -axisX * back + (Math.random() - 0.5) * radius;
        particle.y = -axisY * back + (Math.random() - 0.5) * radius;
        particle.z = (Math.random() - 0.5) * radius;
        particle.vx = craftEast - axisX * speed + (Math.random() - 0.5) * 14;
        particle.vy = craftUp - axisY * speed + (Math.random() - 0.5) * 14;
        particle.vz = (Math.random() - 0.5) * 14;
        particle.age = 0;
        particle.life = 5 + Math.random() * 6;
        particle.size = radius * (2.4 + Math.random() * 1.6);
        particle.grow = radius * (2.5 + Math.random() * 3) * (1 + (1 - thick) * 3);
        this.smokeData[index * 4 + 2] = Math.random();
        this.smokeData[index * 4 + 3] = 1;
      }
    }
    const ground = -altitude;
    for (let i = 0; i < MAX_SMOKE; i += 1) {
      const particle = this.smokeParticles[i];
      if (particle.age >= 1) continue;
      particle.age += step / particle.life;
      if (particle.age >= 1 || simDt > 2) { particle.age = 1; this.smokeData[i * 4] = 1; continue; }
      // The air slows the smoke; the craft moves on.
      const slow = Math.exp(-step * 2.2);
      particle.vx *= slow; particle.vy = particle.vy * slow + 1.5 * step; particle.vz *= slow;
      particle.x += (particle.vx - craftEast) * step;
      particle.y += (particle.vy - craftUp) * step;
      particle.z += particle.vz * step;
      if (particle.y < ground + 1) {
        // Blast spreads sideways along the ground.
        particle.y = ground + 1 + Math.random() * 2;
        const spread = Math.hypot(particle.vx, particle.vz) + Math.abs(particle.vy) * 0.8;
        const angle = Math.atan2(particle.z + (Math.random() - 0.5), particle.x + (Math.random() - 0.5));
        particle.vx = Math.cos(angle) * spread; particle.vz = Math.sin(angle) * spread; particle.vy = 2;
      }
      this.smokePositions.set([particle.x, particle.y, particle.z], i * 3);
      this.smokeData[i * 4] = particle.age;
      this.smokeData[i * 4 + 1] = particle.size + particle.grow * particle.age * particle.life * 0.6;
    }
    this.smoke.geometry.attributes.position.needsUpdate = true;
    this.smoke.geometry.attributes.aData.needsUpdate = true;
  }

  updateMap(state, r) {
    const view = this.view;
    const shown = view.blend > 0.15;
    this.mapGroup.visible = shown;
    this.markers.length = 0;
    if (!shown) return;
    // The group carries inertial axes into the scene: its matrix is the craft frame.
    const f = this.frame.elements;
    MAP_MATRIX.set(f[0], f[3], f[6], 0, f[1], f[4], f[7], -r, f[2], f[5], f[8], 0, 0, 0, 0, 1);
    this.mapGroup.matrixAutoUpdate = false;
    this.mapGroup.matrix.copy(MAP_MATRIX);
    this.mapGroup.matrixWorldNeedsUpdate = true;
    const fade = smooth(0.3, 0.9, view.blend);
    this.orbitLine.material.opacity = fade;
    this.targetLine.material.opacity = fade * 0.8;
    this.targetLine.visible = this.targetRadius > 0;
    this.occluder.visible = view.blend > 0.6;

    const orbit = state.orbit;
    const points = [];
    if (orbit && orbit.p > 0) {
      const limit = orbit.e < 1 ? Math.PI : Math.acos(clamp(-1 / orbit.e, -1, 1)) * 0.97;
      for (let i = 0; i <= 360; i += 1) {
        const nu = -limit + 2 * limit * i / 360;
        const radius = orbitRadius(orbit, nu);
        if (radius <= 0 || radius > 5e8) continue;
        const angle = orbit.argPe + orbit.dir * nu;
        points.push(radius * Math.cos(angle), radius * Math.sin(angle), 0);
      }
    }
    this.orbitLine.visible = points.length >= 6;
    if (this.orbitLine.visible) {
      this.orbitLine.geometry.dispose();
      this.orbitLine.geometry = new LineGeometry();
      this.orbitLine.geometry.setPositions(points);
    }

    const mark = (id, x, y, label) => {
      POINT.set(x, y, 0).applyMatrix4(MAP_MATRIX);
      // Hidden when the Earth is in the way.
      const toPoint = RAY.copy(POINT).sub(this.camera.position);
      const distance = toPoint.length();
      toPoint.divideScalar(distance);
      const oc = OC.copy(this.camera.position).sub(MAP_CENTER.set(0, -r, 0));
      const b = oc.dot(toPoint), c = oc.lengthSq() - R_EARTH * R_EARTH * 0.99;
      const disc = b * b - c;
      const hidden = disc > 0 && -b - Math.sqrt(disc) > 0 && -b - Math.sqrt(disc) < distance;
      POINT.project(this.camera);
      if (hidden || POINT.z > 1) return;
      this.markers.push({ id, label, x: (POINT.x + 1) / 2 * this.width, y: (1 - POINT.y) / 2 * this.height, alpha: fade });
    };
    if (state.showRocket !== false) mark('craft', state.x, state.y);
    if (orbit && orbit.p > 0) {
      const cosPe = Math.cos(orbit.argPe), sinPe = Math.sin(orbit.argPe);
      if (orbit.periapsis > R_EARTH) mark('pe', orbit.periapsis * cosPe, orbit.periapsis * sinPe, 'Pe');
      if (orbit.bound && orbit.apoapsis > R_EARTH) mark('ap', -orbit.apoapsis * cosPe, -orbit.apoapsis * sinPe, 'Ap');
    }
    const siteAngle = OMEGA * state.t;
    mark('site', R_EARTH * Math.cos(siteAngle), R_EARTH * Math.sin(siteAngle));
  }

  // A burst of fire and smoke where the rocket was.
  explode() {
    const size = this.rocket ? this.rocket.stages[0]?.radius || 1 : 1;
    for (let n = 0; n < 260; n += 1) {
      const index = this.smokeCursor;
      const particle = this.smokeParticles[index];
      this.smokeCursor = (this.smokeCursor + 1) % MAX_SMOKE;
      const z = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - z * z);
      const speed = 15 + Math.random() * 110;
      particle.x = s * Math.cos(a) * size * 2; particle.y = this.focus + z * size * 4; particle.z = s * Math.sin(a) * size * 2;
      particle.vx = s * Math.cos(a) * speed;
      particle.vy = z * speed;
      particle.vz = s * Math.sin(a) * speed;
      particle.age = 0;
      particle.life = 2.5 + Math.random() * 4;
      particle.size = size * (3 + Math.random() * 4);
      particle.grow = size * (4 + Math.random() * 6);
      this.smokeData[index * 4 + 2] = Math.random();
      this.smokeData[index * 4 + 3] = 2;
    }
  }

  kick(amount) { this.shake = Math.max(this.shake, amount); }
}

const HELPER = new THREE.PerspectiveCamera();
const FLIGHT_PIVOT = new THREE.Vector3();
const FLIGHT_POS = new THREE.Vector3();
const FLIGHT_QUAT = new THREE.Quaternion();
const MAP_POS = new THREE.Vector3();
const MAP_CENTER = new THREE.Vector3();
const MAP_MATRIX = new THREE.Matrix4();
const SUN_COLOR = new THREE.Color();
const POINT = new THREE.Vector3();
const RAY = new THREE.Vector3();
const OC = new THREE.Vector3();
