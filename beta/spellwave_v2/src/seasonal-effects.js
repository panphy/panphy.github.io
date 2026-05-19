import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';

export function createSeasonalEffects({
  scene,
  world,
  lightningFlash,
  getMode,
  treeMinZ,
  treeMaxZ,
  treeSpan,
  pathMarkerMinZ,
  pathMarkerMaxZ,
  pathMarkerSpan,
  pathMarkerWrapZ,
}) {
  const springFlowers = [];
  const autumnFallenLeaves = [];
  const lightningBolts = [];

  let currentSeasonName = 'spring';
  let snowField = null;
  let snowPositions = null;
  let snowSpeeds = null;
  let rainField = null;
  let rainPositions = null;
  let rainSpeeds = null;
  let lightningLight = null;
  let lightningGlow = null;
  let summerStorm = {
    active: false,
    nextRain: 7,
    rainTime: 0,
    lightningTime: 0,
    flashTime: 0,
  };

  function create() {
    createSpringFlowers();
    createAutumnFallenLeaves();
    createSnowField();
    createRainField();
    createLightning();
  }

  function update(seconds, delta, scrollDelta) {
    updateSeasonalScenery(seconds, scrollDelta);
    updateWeather(seconds, delta);
  }

  function setSeason(seasonName) {
    currentSeasonName = seasonName;

    const isSpring = seasonName === 'spring';
    const isAutumn = seasonName === 'autumn';
    const isWinter = seasonName === 'winter';
    const isSummer = seasonName === 'summer';

    for (const flower of springFlowers) flower.group.visible = isSpring;
    for (const leaf of autumnFallenLeaves) leaf.mesh.visible = isAutumn;
    if (snowField) snowField.visible = isWinter;

    if (!isSummer) {
      summerStorm.active = false;
      summerStorm.rainTime = 0;
      summerStorm.flashTime = 0;
      summerStorm.nextRain = 7 + Math.random() * 8;
      if (rainField) rainField.visible = false;
      hideLightningBolts();
      if (lightningFlash) lightningFlash.style.opacity = '0';
      if (lightningLight) lightningLight.intensity = 0;
      if (lightningGlow) lightningGlow.intensity = 0;
      return;
    }

    summerStorm.active = false;
    summerStorm.rainTime = Number.POSITIVE_INFINITY;
    summerStorm.flashTime = 0;
    summerStorm.lightningTime = 0.6 + Math.random() * 1.2;
    summerStorm.nextRain = 0;
    if (rainField) rainField.visible = true;
  }

  function updateSeasonalScenery(seconds, scrollDelta) {
    for (const flower of springFlowers) {
      flower.group.position.z += scrollDelta * flower.speed;
      if (flower.group.position.z > treeMaxZ) {
        flower.group.position.z -= treeSpan;
      }
      flower.group.position.x = flower.baseX + Math.sin(seconds * 0.7 + flower.phase) * 0.05;
      flower.group.rotation.z = Math.sin(seconds * 1.2 + flower.phase) * 0.035;
    }

    for (const leaf of autumnFallenLeaves) {
      leaf.mesh.position.z += scrollDelta * leaf.speed;
      if (leaf.mesh.position.z > pathMarkerWrapZ) {
        leaf.mesh.position.z -= pathMarkerSpan;
        leaf.mesh.position.x = leaf.side * (4.95 + Math.random() * 2.2);
        leaf.baseX = leaf.mesh.position.x;
      }
      leaf.mesh.position.x = leaf.baseX + Math.sin(seconds * 0.9 + leaf.phase) * 0.08;
      leaf.mesh.rotation.y += scrollDelta * 0.08;
    }
  }

  function updateWeather(seconds, delta) {
    updateSnow(seconds, delta);
    updateSummerStorm(delta);
    updateRain(delta);
    updateLightning(delta);
  }

  function updateSnow(seconds, delta) {
    if (!snowField || !snowField.visible) return;
    const runningFactor = getMode() === 'running' ? 1 : 0.42;
    for (let index = 0; index < snowSpeeds.length; index += 1) {
      const offset = index * 3;
      snowPositions[offset] += Math.sin(seconds * 0.85 + index * 0.37) * delta * 0.42;
      snowPositions[offset + 1] -= snowSpeeds[index] * delta * runningFactor;
      snowPositions[offset + 2] += delta * runningFactor * 1.15;
      if (snowPositions[offset + 1] < -0.25 || snowPositions[offset + 2] > 14) {
        resetSnowflake(index);
      }
    }
    snowField.geometry.attributes.position.needsUpdate = true;
  }

  function updateSummerStorm(delta) {
    if (currentSeasonName !== 'summer') {
      summerStorm.active = false;
      summerStorm.flashTime = 0;
      if (rainField) rainField.visible = false;
      hideLightningBolts();
      if (lightningFlash) lightningFlash.style.opacity = '0';
      return;
    }

    const timerDelta = delta * (getMode() === 'running' ? 1 : 0.38);
    summerStorm.active = true;
    summerStorm.rainTime = Number.POSITIVE_INFINITY;
    if (rainField) rainField.visible = true;
    summerStorm.lightningTime -= timerDelta;
    if (summerStorm.lightningTime <= 0) {
      triggerLightning();
      summerStorm.lightningTime = 0.85 + Math.random() * 1.75;
    }
  }

  function updateRain(delta) {
    if (!rainField || !rainField.visible) return;
    for (let index = 0; index < rainSpeeds.length; index += 1) {
      const offset = index * 6;
      const speed = rainSpeeds[index] * delta;
      const x = rainPositions[offset] - speed * 0.2;
      const y = rainPositions[offset + 1] - speed;
      const z = rainPositions[offset + 2] + speed * 0.65;
      rainPositions[offset] = x;
      rainPositions[offset + 1] = y;
      rainPositions[offset + 2] = z;
      rainPositions[offset + 3] = x - 0.22;
      rainPositions[offset + 4] = y + 1.15;
      rainPositions[offset + 5] = z - 0.42;
      if (y < -0.4 || z > 14) resetRaindrop(index);
    }
    rainField.geometry.attributes.position.needsUpdate = true;
  }

  function triggerLightning() {
    summerStorm.flashTime = 0.2 + Math.random() * 0.08;
    const visibleCount = 1 + Math.floor(Math.random() * 2);
    for (let index = 0; index < lightningBolts.length; index += 1) {
      const bolt = lightningBolts[index];
      if (index >= visibleCount) {
        bolt.visible = false;
        continue;
      }
      rebuildLightningBolt(bolt, index);
      bolt.visible = true;
      bolt.material.opacity = index === 0 ? 0.92 : 0.46;
    }
  }

  function rebuildLightningBolt(bolt, index) {
    const points = [];
    const baseX = (Math.random() - 0.5) * 16 + index * 1.6;
    const baseZ = -44 + Math.random() * 12;
    const segments = 7 + Math.floor(Math.random() * 3);
    for (let segment = 0; segment <= segments; segment += 1) {
      const t = segment / segments;
      const fork = segment > 1 ? (Math.random() - 0.5) * (1.2 + t * 2.2) : 0;
      points.push(new THREE.Vector3(
        baseX + fork + Math.sin(t * Math.PI * 2) * 0.7,
        THREE.MathUtils.lerp(21, 6.2 + Math.random() * 1.8, t),
        baseZ + t * 8 + (Math.random() - 0.5) * 1.6
      ));
    }
    bolt.geometry.dispose();
    bolt.geometry = new THREE.BufferGeometry().setFromPoints(points);
  }

  function updateLightning(delta) {
    if (!lightningLight || !lightningGlow) return;
    if (summerStorm.flashTime > 0) {
      summerStorm.flashTime = Math.max(0, summerStorm.flashTime - delta);
      const intensity = summerStorm.flashTime / 0.22;
      lightningLight.intensity = 18 * intensity;
      lightningGlow.intensity = 3.2 * intensity;
      if (lightningFlash) lightningFlash.style.opacity = String(Math.min(0.8, intensity * 0.7));
      for (const bolt of lightningBolts) {
        if (bolt.visible) bolt.material.opacity = Math.max(0, bolt.material.opacity - delta * 3.4);
      }
      return;
    }

    lightningLight.intensity = 0;
    lightningGlow.intensity = 0;
    if (lightningFlash) lightningFlash.style.opacity = '0';
    hideLightningBolts();
  }

  function hideLightningBolts() {
    for (const bolt of lightningBolts) {
      bolt.visible = false;
      bolt.material.opacity = 0;
    }
  }

  function getWeatherState() {
    return {
      seasonName: currentSeasonName,
      raining: Boolean(rainField && rainField.visible),
      snowing: Boolean(snowField && snowField.visible),
    };
  }

  function createSpringFlowers() {
    const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x2e7d48, roughness: 0.82 });
    const centerMaterial = new THREE.MeshStandardMaterial({ color: 0xffd86f, roughness: 0.55, emissive: 0x6b3a00, emissiveIntensity: 0.18 });
    const petalMaterials = [
      new THREE.MeshStandardMaterial({ color: 0xff8fbd, roughness: 0.72 }),
      new THREE.MeshStandardMaterial({ color: 0xf9c7dc, roughness: 0.72 }),
      new THREE.MeshStandardMaterial({ color: 0xd9f99d, roughness: 0.75 }),
      new THREE.MeshStandardMaterial({ color: 0xbde7ff, roughness: 0.7 }),
    ];

    for (let patchIndex = 0; patchIndex < 42; patchIndex += 1) {
      const side = patchIndex % 2 === 0 ? -1 : 1;
      const group = new THREE.Group();
      const x = side * (4.65 + Math.random() * 1.9);
      const z = treeMinZ + 4 + Math.random() * (treeSpan - 8);
      group.position.set(x, 0, z);
      group.rotation.y = (Math.random() - 0.5) * 0.45;

      const blossoms = 2 + Math.floor(Math.random() * 3);
      for (let blossomIndex = 0; blossomIndex < blossoms; blossomIndex += 1) {
        const petalMaterial = petalMaterials[(patchIndex + blossomIndex) % petalMaterials.length];
        const localX = (Math.random() - 0.5) * 0.86;
        const localZ = (Math.random() - 0.5) * 0.68;
        const height = 0.28 + Math.random() * 0.2;
        group.add(blockMesh(0.07, height, 0.07, stemMaterial, localX, height * 0.5, localZ));
        group.add(blockMesh(0.34, 0.12, 0.13, petalMaterial, localX, height + 0.035, localZ));
        const crossPetal = blockMesh(0.13, 0.12, 0.34, petalMaterial, localX, height + 0.035, localZ);
        group.add(crossPetal);
        group.add(blockMesh(0.11, 0.11, 0.11, centerMaterial, localX, height + 0.075, localZ));
      }

      group.visible = false;
      world.add(group);
      springFlowers.push({
        group,
        baseX: x,
        speed: 0.8 + Math.random() * 0.38,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function createAutumnFallenLeaves() {
    const leafMaterials = [
      new THREE.MeshStandardMaterial({ color: 0xb33b12, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: 0xd76818, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: 0xe1a32c, roughness: 0.86 }),
      new THREE.MeshStandardMaterial({ color: 0x7d2d18, roughness: 0.94 }),
    ];

    for (let index = 0; index < 92; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const material = leafMaterials[index % leafMaterials.length];
      const mesh = blockMesh(0.24 + Math.random() * 0.18, 0.025, 0.1 + Math.random() * 0.14, material, 0, 0.045, 0);
      mesh.position.x = side * (4.95 + Math.random() * 2.2);
      mesh.position.z = pathMarkerMinZ + Math.random() * (pathMarkerMaxZ - pathMarkerMinZ);
      mesh.rotation.y = Math.random() * Math.PI;
      mesh.rotation.z = (Math.random() - 0.5) * 0.16;
      mesh.visible = false;
      world.add(mesh);
      autumnFallenLeaves.push({
        mesh,
        side,
        baseX: mesh.position.x,
        speed: 0.9 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function createSnowField() {
    const count = 420;
    snowPositions = new Float32Array(count * 3);
    snowSpeeds = new Float32Array(count);
    for (let index = 0; index < count; index += 1) {
      resetSnowflake(index, Math.random() * 22);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xe8f7ff,
      size: 0.13,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });
    snowField = new THREE.Points(geometry, material);
    snowField.visible = false;
    scene.add(snowField);
  }

  function resetSnowflake(index, y = 18 + Math.random() * 8) {
    const offset = index * 3;
    snowPositions[offset] = (Math.random() - 0.5) * 30;
    snowPositions[offset + 1] = y;
    snowPositions[offset + 2] = -58 + Math.random() * 72;
    snowSpeeds[index] = 1.1 + Math.random() * 1.9;
  }

  function createRainField() {
    const count = 170;
    rainPositions = new Float32Array(count * 6);
    rainSpeeds = new Float32Array(count);
    for (let index = 0; index < count; index += 1) {
      resetRaindrop(index, 3 + Math.random() * 20);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const material = new THREE.LineBasicMaterial({
      color: 0xb9dfff,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
    });
    rainField = new THREE.LineSegments(geometry, material);
    rainField.visible = false;
    scene.add(rainField);
  }

  function resetRaindrop(index, y = 14 + Math.random() * 11) {
    const offset = index * 6;
    const x = (Math.random() - 0.5) * 34;
    const z = -58 + Math.random() * 70;
    rainPositions[offset] = x;
    rainPositions[offset + 1] = y;
    rainPositions[offset + 2] = z;
    rainPositions[offset + 3] = x - 0.22;
    rainPositions[offset + 4] = y + 1.15;
    rainPositions[offset + 5] = z - 0.42;
    rainSpeeds[index] = 15 + Math.random() * 8;
  }

  function createLightning() {
    lightningLight = new THREE.PointLight(0xd9f1ff, 0, 70, 1.5);
    lightningLight.position.set(0, 18, -34);
    scene.add(lightningLight);

    lightningGlow = new THREE.DirectionalLight(0xe8f5ff, 0);
    lightningGlow.position.set(-6, 18, -16);
    scene.add(lightningGlow);

    for (let index = 0; index < 3; index += 1) {
      const material = new THREE.LineBasicMaterial({
        color: index === 0 ? 0xffffff : 0x9fd6ff,
        transparent: true,
        opacity: 0,
      });
      const line = new THREE.Line(new THREE.BufferGeometry(), material);
      line.visible = false;
      scene.add(line);
      lightningBolts.push(line);
    }
  }

  function blockMesh(width, height, depth, material, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  return {
    create,
    update,
    setSeason,
    getWeatherState,
  };
}
