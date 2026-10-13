// A left hand in three dimensions for Fleming's left-hand rule: thumb F (force), index finger B
// (field), middle finger I (current). It replaces the flat picture in every [data-hand] figure
// once Three.js has loaded; the flat picture stays as the still copy for thumbnails and print,
// and is all there is if the library cannot be fetched.
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
const PARTS = [
  { key: 'F', word: 'force', finger: 'Thumb', colour: '--brand-primary', from: [0.15, 1.5, 0.06], to: [0.15, 2.6, 0.06], side: 'right' },
  { key: 'B', word: 'field', finger: 'Index finger', colour: '--brand-accent-strong', from: [0, 0.39, -1.78], to: [0, 0.39, -3.3], side: 'right' },
  { key: 'I', word: 'current', finger: 'Middle finger', colour: '--brand-accent', from: [1.2, 0.13, -0.66], to: [2.4, 0.13, -0.66], side: 'right' }
];
// The left hand as a smooth model: each part is a skin lofted along a curve through a chain of
// joints. Its palm faces +x; the thumb points up (+y), the index finger away from the viewer (−z)
// and the middle finger across the palm (+x), while the ring and little fingers curl in.
// Each joint is [x, y, z, half-thickness, half-width]; fingers use one radius for both.
const FINGERS = [
  [[0.1, 0.16, 0.5, 0.2], [0.19, 0.54, 0.22, 0.17], [0.17, 1.0, 0.12, 0.13], [0.15, 1.42, 0.06, 0.095]],                              // thumb: up
  [[0, 0.37, -0.2, 0.15], [0, 0.39, -0.56, 0.135], [0, 0.39, -1.06, 0.115], [0, 0.39, -1.42, 0.1], [0, 0.39, -1.7, 0.08]],             // index: forwards
  [[0, 0.12, -0.2, 0.15], [0, 0.13, -0.6, 0.14], [0.52, 0.13, -0.66, 0.118], [0.86, 0.13, -0.66, 0.104], [1.12, 0.13, -0.66, 0.084]],  // middle: across
  [[0, -0.12, -0.2, 0.145], [0, -0.13, -0.56, 0.132], [0.44, -0.13, -0.64, 0.112], [0.5, -0.13, -0.3, 0.1], [0.28, -0.13, -0.14, 0.082]], // ring: curled
  [[0, -0.35, -0.14, 0.13], [0, -0.37, -0.46, 0.115], [0.37, -0.37, -0.52, 0.098], [0.44, -0.37, -0.24, 0.088], [0.26, -0.37, -0.1, 0.072]] // little: curled
];
const PALM = [[0.02, -0.03, 0.78, 0.2, 0.37], [0, 0, 0.42, 0.2, 0.47], [0, 0.01, -0.12, 0.175, 0.55], [0, 0.01, -0.56, 0.14, 0.53]];
const ARM = [[0.02, -0.05, 1.5, 0.25, 0.4], [0.02, -0.04, 1.15, 0.22, 0.37], [0.02, -0.03, 0.78, 0.2, 0.37]];

const cssColour = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';

function build(THREE, fig) {
  const flat = fig.querySelector('svg');
  const holder = document.createElement('div');
  holder.className = 'mover hand3d';
  holder.style.cssText = 'position:absolute;inset:0;';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', flat?.getAttribute('aria-label') || 'A left hand showing Fleming’s left-hand rule');
  holder.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(2.4, 3.1, 6.9);
  camera.lookAt(1.15, 0.8, -0.5);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa08c7c, 1.35));
  const sun = new THREE.DirectionalLight(0xffffff, 1.9);
  sun.position.set(3, 5, 4);
  scene.add(sun);

  const hand = new THREE.Group();
  scene.add(hand);
  // data-hand picks the look: "smooth" (default), "facet" (fewer, flat faces) or "toon" (flat
  // bands of tone with a dark outline, like the drawn figures in the decks).
  const look = fig.dataset.hand || 'smooth', facet = look === 'facet', toon = look === 'toon';
  const bands = new THREE.DataTexture(new Uint8Array([150, 215, 255]), 3, 1, THREE.RedFormat);
  bands.minFilter = bands.magFilter = THREE.NearestFilter;
  bands.needsUpdate = true;
  const skin = toon ? new THREE.MeshToonMaterial({ color: 0xecc7a6, gradientMap: bands })
    : new THREE.MeshStandardMaterial({ color: 0xe0b594, roughness: facet ? 0.85 : 0.62, flatShading: facet, side: THREE.DoubleSide });
  const ink = new THREE.MeshBasicMaterial({ color: 0x3a2a22, side: THREE.BackSide });
  const up = new THREE.Vector3(0, 1, 0);
  // A smooth skin lofted through the joints: the centre line is a curve through them, the
  // thickness is interpolated between them with a slight swelling at each knuckle, and the far
  // end is closed with a rounded cap. With `flat` the cross-section keeps the palm's own
  // directions (thickness along x, width along y) and is squarer, like a palm.
  const tube = (joints, { flat = false, sides = facet ? (flat ? 10 : 8) : 28, steps = facet ? 3 : 10, tip = 1, knuckle = facet ? 0.03 : 0.07 } = {}) => {
    const curve = new THREE.CatmullRomCurve3(joints.map(j => new THREE.Vector3(j[0], j[1], j[2])), false, 'centripetal');
    const spans = joints.length - 1, count = spans * steps, rings = [];
    let normal = null;
    for (let i = 0; i <= count; i++) {
      const u = i / count, at = Math.min(spans - 1, Math.floor(u * spans)), t = u * spans - at, a = joints[at], b = joints[at + 1];
      const centre = curve.getPoint(u), tangent = curve.getTangent(u).normalize();
      const swell = 1 + (flat ? 0 : knuckle * Math.cos(t * Math.PI * 2) * (at === 0 && t < 0.5 ? 0 : 1));
      const thick = (a[3] + (b[3] - a[3]) * t) * swell, wide = ((a[4] ?? a[3]) + ((b[4] ?? b[3]) - (a[4] ?? a[3])) * t) * swell;
      if (flat) normal = new THREE.Vector3(1, 0, 0);
      else if (!normal) normal = new THREE.Vector3().crossVectors(Math.abs(tangent.y) < 0.9 ? up : new THREE.Vector3(1, 0, 0), tangent).normalize();
      else normal = normal.clone().sub(tangent.clone().multiplyScalar(normal.dot(tangent))).normalize();
      const across = flat ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3().crossVectors(tangent, normal);
      rings.push({ centre, tangent, normal: normal.clone(), across, thick, wide });
    }
    // The cap: rings that shrink along a quarter circle beyond the last joint.
    const last = rings[rings.length - 1];
    const caps = facet ? 2 : 6;
    for (let k = 1; k <= caps; k++) {
      const a = k / caps * Math.PI / 2 * 0.98;
      rings.push({ ...last, centre: last.centre.clone().addScaledVector(last.tangent, Math.sin(a) * last.thick * tip), thick: last.thick * Math.cos(a), wide: last.wide * Math.cos(a) });
    }
    const power = flat ? 0.72 : 1, positions = [], index = [];
    const shape = v => Math.sign(v) * Math.abs(v) ** power;
    rings.forEach(ring => { for (let k = 0; k < sides; k++) { const a = k / sides * Math.PI * 2, p = ring.centre.clone().addScaledVector(ring.normal, shape(Math.cos(a)) * ring.thick).addScaledVector(ring.across, shape(Math.sin(a)) * ring.wide); positions.push(p.x, p.y, p.z); } });
    for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < sides; k++) { const n = (k + 1) % sides, p = i * sides, q = p + sides; index.push(p + k, p + n, q + k, p + n, q + n, q + k); }
    // Close the near end with a slightly domed disc.
    const back = rings[0].centre.clone().addScaledVector(rings[0].tangent, -rings[0].thick * 0.25), hub = positions.length / 3;
    positions.push(back.x, back.y, back.z);
    for (let k = 0; k < sides; k++) index.push(hub, (k + 1) % sides, k);
    // Make every face look outwards, whichever way round the rings were built.
    if (new THREE.Vector3().crossVectors(rings[0].normal, rings[0].across).dot(rings[0].tangent) < 0) for (let i = 0; i < index.length; i += 3) [index[i + 1], index[i + 2]] = [index[i + 2], index[i + 1]];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(index);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, skin);
    if (toon) {
      // The outline: the same shape, a little fatter, seen only from inside.
      const hull = geometry.clone(), at = hull.attributes.position, out = hull.attributes.normal;
      for (let i = 0; i < at.count; i++) at.setXYZ(i, at.getX(i) + out.getX(i) * 0.022, at.getY(i) + out.getY(i) * 0.022, at.getZ(i) + out.getZ(i) * 0.022);
      mesh.add(new THREE.Mesh(hull, ink));
    }
    return mesh;
  };
  hand.add(tube(ARM, { flat: true, tip: 0.5 }), tube(PALM, { flat: true, tip: 0.8 }));
  // Fingers keep most of their thickness to the tip.
  FINGERS.forEach(joints => hand.add(tube(joints.map((j, i) => [j[0], j[1], j[2], j[3] * (i === joints.length - 1 ? 1.3 : i ? 1.15 : 1.05)]))));
  hand.position.set(0, 0, 0.3);
  // A straight rod from a to b, for the arrows.
  const limb = (a, b, r, material) => {
    const start = new THREE.Vector3(...a), finish = new THREE.Vector3(...b), span = finish.clone().sub(start);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, span.length(), 24), material);
    mesh.position.copy(start).add(finish).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(up, span.clone().normalize());
    return mesh;
  };

  const labels = PARTS.map(part => {
    const material = new THREE.MeshStandardMaterial({ roughness: 0.5 });
    const from = new THREE.Vector3(...part.from), to = new THREE.Vector3(...part.to), dir = to.clone().sub(from).normalize();
    const shaft = limb(part.from, to.clone().sub(dir.clone().multiplyScalar(0.3)).toArray(), 0.055, material);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.42, 28), material);
    head.position.copy(to).sub(dir.clone().multiplyScalar(0.21));
    head.quaternion.setFromUnitVectors(up, dir);
    hand.add(shaft, head);
    const label = document.createElement('div');
    label.style.cssText = `position:absolute;display:flex;align-items:center;gap:12px;white-space:nowrap;transform:translate(${part.side === 'left' ? '-100%' : '0'},-50%);`;
    label.innerHTML = `<b style="font:400 68px/1 var(--font-display);color:var(${part.colour === '--brand-accent-strong' ? '--text-main' : part.colour})">${part.key}</b><span style="font:700 30px/1.2 var(--font-body);color:var(--text-main)">${part.finger}<br><span style="font-weight:500;font-size:26px;color:var(--text-secondary)">${part.word}</span></span>`;
    holder.appendChild(label);
    return { part, material, tip: to.clone().add(dir.clone().multiplyScalar(0.12)), label };
  });

  const paint = () => labels.forEach(({ part, material }) => material.color.set(cssColour(part.colour)));
  paint();
  document.addEventListener('panphy:theme-change', paint);

  if (flat) flat.classList.add('still');
  fig.appendChild(holder);

  const slide = fig.closest('.slide'), still = window.matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0, height = 0;
  const point = new THREE.Vector3();
  function frame(time) {
    requestAnimationFrame(frame);
    if (!slide.classList.contains('active') || document.hidden) return;
    const w = holder.clientWidth, h = holder.clientHeight;
    if (!w || !h) return;
    if (w !== width || h !== height) {
      width = w; height = h;
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    // A slow sway, so that the three directions read as being at right angles in depth.
    hand.rotation.y = still.matches ? -0.6 : -0.6 + 0.32 * Math.sin(time / 1700);
    hand.updateMatrixWorld();
    renderer.render(scene, camera);
    labels.forEach(({ tip, label, part }) => {
      point.copy(tip).applyMatrix4(hand.matrixWorld).project(camera);
      label.style.left = `${((point.x + 1) / 2 * w + (part.side === 'left' ? -14 : 14)).toFixed(1)}px`;
      label.style.top = `${((1 - point.y) / 2 * h).toFixed(1)}px`;
    });
  }
  requestAnimationFrame(frame);
}

// The deck draws its figures when it starts, after the maths is typeset: wait for the flat picture.
const drawn = fig => new Promise(resolve => { const check = () => (fig.querySelector('svg') ? resolve() : setTimeout(check, 120)); check(); });
const figures = [...document.querySelectorAll('#deck [data-hand]')];
if (figures.length) {
  import(THREE_URL).then(THREE => figures.forEach(fig => drawn(fig).then(() => {
    try { build(THREE, fig); } catch (error) { console.warn('The 3D hand could not be drawn; the flat picture stays.', error); }
  }))).catch(() => {});
}
