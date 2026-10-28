import * as THREE from 'three';
import { radialTexture } from '/assets/three-textures.js';
import { DEPTH, SCALE, px2m } from './units.js';
import { parts } from './registry.js';

const BODY_DEPTH = DEPTH;

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setClearColor(0x15202c, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x15202c, 8, 18);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 40);
  // Slight off-axis view so blocks read as solid tabletop pieces.
  camera.position.set(0.55, 1.35, 5.6);
  camera.lookAt(0.1, 1.1, 0);

  const hemi = new THREE.HemisphereLight(0xc8d6e8, 0x3a2a1c, 0.85);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xfff2dd, 1.55);
  key.position.set(3.2, 6.5, 4.2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 20;
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -2;
  key.shadow.bias = -0.0002;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x8eb6ff, 0.35);
  fill.position.set(-4, 2.5, 2);
  scene.add(fill);

  const lab = new THREE.Group();
  scene.add(lab);

  // Back wall
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x2a3648,
    roughness: 0.92,
    metalness: 0.05
  });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), wallMat);
  wall.position.set(0, 2.2, -0.55);
  lab.add(wall);

  // Soft glow disc behind the work area
  const glowTex = radialTexture(THREE, 128, [[0, 0.55], [0.55, 0.18], [1, 0]], [120, 160, 200]);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 5),
    new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false })
  );
  glow.position.set(0, 1.8, -0.52);
  lab.add(glow);

  // Bench surface (tabletop strip)
  const wood = new THREE.MeshStandardMaterial({
    color: 0x6b4a2e,
    roughness: 0.78,
    metalness: 0.08
  });
  const bench = new THREE.Mesh(new THREE.BoxGeometry(10, 0.18, 1.1), wood);
  bench.position.set(0, -0.09, 0);
  bench.receiveShadow = true;
  bench.castShadow = true;
  lab.add(bench);

  const lip = new THREE.Mesh(new THREE.BoxGeometry(10.1, 0.06, 0.12), new THREE.MeshStandardMaterial({
    color: 0x4a3422,
    roughness: 0.7,
    metalness: 0.1
  }));
  lip.position.set(0, 0.03, 0.5);
  lip.castShadow = true;
  lip.receiveShadow = true;
  lab.add(lip);

  // Floor under the bench
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 8),
    new THREE.MeshStandardMaterial({ color: 0x1a222c, roughness: 1, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.18, 2);
  floor.receiveShadow = true;
  lab.add(floor);

  const meshes = new Map(); // bodyId -> { group, kind }
  const springLines = new Map(); // constraint id -> Line
  const pinMarkers = new Map();
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();
  let size = { w: 800, h: 500 };
  let floorTopPx = 500;

  function resize() {
    const w = Math.max(320, canvas.clientWidth || 800);
    const h = Math.max(240, canvas.clientHeight || 500);
    size = { w, h };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function setFloorTop(px) {
    floorTopPx = px;
  }

  function matterToThree(mx, my) {
    // Matter: origin top-left, +y down, pixels. Floor top → Three y = 0.
    const x = px2m(mx - size.w / 2);
    const y = px2m(floorTopPx - my);
    return { x, y, z: 0 };
  }

  function threeToMatter(x, y) {
    const mx = x * SCALE + size.w / 2;
    const my = floorTopPx - y * SCALE;
    return { x: mx, y: my };
  }

  function clientToWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);
    if (!raycaster.ray.intersectPlane(plane, hit)) {
      // Fallback: project onto a vertical plane through the bench.
      return null;
    }
    return threeToMatter(hit.x, hit.y);
  }

  function makeMaterial(kind, fixed) {
    const base = parts[kind]?.color ?? 0x8899aa;
    return new THREE.MeshStandardMaterial({
      color: fixed ? 0x6b7280 : base,
      roughness: kind === 'sphere' ? 0.35 : 0.55,
      metalness: kind === 'sphere' ? 0.25 : 0.08
    });
  }

  function addBodyMesh(body, meta) {
    const group = new THREE.Group();
    group.userData.bodyId = body.id;
    const mat = makeMaterial(meta.kind, meta.props.fixed);
    let mesh;
    if (meta.kind === 'sphere') {
      const r = meta.props.r;
      mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), mat);
    } else {
      const w = meta.props.w;
      const h = meta.props.h;
      mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, BODY_DEPTH), mat);
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // Selection ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.08, 0.012, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xe8a84a })
    );
    ring.visible = false;
    ring.rotation.x = Math.PI / 2;
    ring.name = 'selectRing';
    group.add(ring);

    scene.add(group);
    meshes.set(body.id, { group, kind: meta.kind, mesh, ring, mat });
    syncBody(body, meta);
  }

  function removeBodyMesh(bodyId) {
    const entry = meshes.get(bodyId);
    if (!entry) return;
    scene.remove(entry.group);
    entry.mesh.geometry.dispose();
    entry.mat.dispose();
    meshes.delete(bodyId);
  }

  function syncBody(body, meta) {
    const entry = meshes.get(body.id);
    if (!entry) return;
    const p = matterToThree(body.position.x, body.position.y);
    entry.group.position.set(p.x, p.y, 0);
    // Matter angle is clockwise from +x with +y down; Three is CCW with +y up → negate.
    entry.group.rotation.z = -body.angle;
    if (meta?.selected) {
      entry.ring.visible = true;
      const s = meta.kind === 'sphere' ? (meta.props.r + 0.06) : Math.max(meta.props.w, meta.props.h) * 0.55;
      entry.ring.scale.setScalar(s / 0.08);
    } else {
      entry.ring.visible = false;
    }
  }

  function setSelected(bodyId) {
    for (const [id, entry] of meshes) {
      entry.ring.visible = id === bodyId;
    }
  }

  function ensureSpringLine(id) {
    let line = springLines.get(id);
    if (line) return line;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(6);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({ color: 0x9ad0ff, transparent: true, opacity: 0.9 });
    line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    scene.add(line);
    springLines.set(id, line);
    return line;
  }

  function syncSpring(id, ax, ay, bx, by) {
    const line = ensureSpringLine(id);
    const a = matterToThree(ax, ay);
    const b = matterToThree(bx, by);
    const pos = line.geometry.attributes.position.array;
    pos[0] = a.x; pos[1] = a.y; pos[2] = 0.02;
    pos[3] = b.x; pos[4] = b.y; pos[5] = 0.02;
    line.geometry.attributes.position.needsUpdate = true;
  }

  function removeSpring(id) {
    const line = springLines.get(id);
    if (!line) return;
    scene.remove(line);
    line.geometry.dispose();
    line.material.dispose();
    springLines.delete(id);
  }

  function ensurePinMarker(id) {
    let mesh = pinMarkers.get(id);
    if (mesh) return mesh;
    mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xe8e0d0, metalness: 0.6, roughness: 0.3 })
    );
    mesh.castShadow = true;
    scene.add(mesh);
    pinMarkers.set(id, mesh);
    return mesh;
  }

  function syncPin(id, mx, my) {
    const mesh = ensurePinMarker(id);
    const p = matterToThree(mx, my);
    mesh.position.set(p.x, p.y, BODY_DEPTH * 0.55);
  }

  function removePin(id) {
    const mesh = pinMarkers.get(id);
    if (!mesh) return;
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
    pinMarkers.delete(id);
  }

  function clearAll() {
    for (const id of [...meshes.keys()]) removeBodyMesh(id);
    for (const id of [...springLines.keys()]) removeSpring(id);
    for (const id of [...pinMarkers.keys()]) removePin(id);
  }

  function render() {
    renderer.render(scene, camera);
  }

  return {
    resize,
    setFloorTop,
    clientToWorld,
    matterToThree,
    threeToMatter,
    addBodyMesh,
    removeBodyMesh,
    syncBody,
    setSelected,
    syncSpring,
    removeSpring,
    syncPin,
    removePin,
    clearAll,
    render,
    get size() { return size; },
    get floorTopPx() { return floorTopPx; }
  };
}
