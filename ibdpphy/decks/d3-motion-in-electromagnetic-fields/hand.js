// A left hand in three dimensions for Fleming's left-hand rule: thumb F (force), index finger B
// (field), middle finger I (current). It replaces the flat picture in every [data-hand] figure
// once Three.js has loaded; the flat picture stays as the still copy for thumbnails and print,
// and is all there is if the library cannot be fetched.
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
const PARTS = [
  { key: 'F', word: 'force', finger: 'Thumb', colour: '--brand-primary', from: [0.12, 1.46, 0.05], to: [0.12, 2.6, 0.05], side: 'right' },
  { key: 'B', word: 'field', finger: 'Index finger', colour: '--brand-accent-strong', from: [0, 0.4, -1.78], to: [0, 0.4, -3.3], side: 'right' },
  { key: 'I', word: 'current', finger: 'Middle finger', colour: '--brand-accent', from: [1.16, 0.13, -0.62], to: [2.4, 0.13, -0.62], side: 'right' }
];
// The left hand as chains of joints, each drawn as rounded rods; its palm faces +x, the thumb
// points up (+y), the index finger away from the viewer (−z) and the middle finger across (+x).
// The first joint of each finger is at the wrist, so the first rod of each is a bone of the palm.
const WRIST = [0.02, -0.08, 0.72];
const FINGERS = [
  { r: [0.2, 0.15, 0.125], joints: [[0.1, 0.06, 0.52], [0.16, 0.5, 0.2], [0.14, 0.98, 0.1], [0.12, 1.4, 0.05]] },                            // thumb: up
  { r: [0.19, 0.125, 0.115, 0.1], joints: [[0, 0.2, 0.6], [0, 0.4, -0.42], [0, 0.4, -0.92], [0, 0.4, -1.34], [0, 0.4, -1.7]] },              // index: forwards
  { r: [0.19, 0.125, 0.115, 0.1], joints: [[0, 0.06, 0.6], [0, 0.13, -0.5], [0.5, 0.13, -0.58], [0.84, 0.13, -0.6], [1.08, 0.13, -0.62]] },  // middle: across the palm
  { r: [0.18, 0.118, 0.108, 0.095], joints: [[0, -0.1, 0.6], [0, -0.13, -0.44], [0.4, -0.13, -0.6], [0.5, -0.13, -0.28], [0.3, -0.13, -0.1]] }, // ring: curled in
  { r: [0.17, 0.108, 0.098, 0.088], joints: [[0, -0.26, 0.56], [0, -0.38, -0.3], [0.36, -0.38, -0.46], [0.46, -0.38, -0.18], [0.28, -0.38, -0.02]] } // little: curled in
];

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
  camera.position.set(2.5, 3.3, 7.4);
  camera.lookAt(1.15, 0.8, -0.5);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f96, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 1.7);
  sun.position.set(3, 5, 4);
  scene.add(sun);

  const hand = new THREE.Group();
  scene.add(hand);
  const skin = new THREE.MeshStandardMaterial({ color: 0xe2c2a2, roughness: 0.75 });
  const up = new THREE.Vector3(0, 1, 0);
  // A rounded rod from a to b.
  const limb = (a, b, r, material) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), span = end.clone().sub(start);
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, span.length(), 6, 16), material);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(up, span.clone().normalize());
    return mesh;
  };
  hand.add(limb(WRIST, [0.02, -0.1, 1.5], 0.3, skin));
  FINGERS.forEach(({ r, joints }) => joints.slice(1).forEach((joint, i) => {
    hand.add(limb(joints[i], joint, r[i], skin));
    // A slightly fatter ball at each knuckle.
    const knuckle = new THREE.Mesh(new THREE.SphereGeometry(r[i] * 1.06, 16, 12), skin);
    knuckle.position.set(...joint);
    if (i < joints.length - 2) hand.add(knuckle);
  }));
  // The web of the palm, between the bones.
  const web = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.62, 0.9), skin);
  web.position.set(0, 0.02, 0.08);
  hand.add(web);
  hand.position.set(0, 0, 0.3);

  const labels = PARTS.map(part => {
    const material = new THREE.MeshStandardMaterial({ roughness: 0.5 });
    const from = new THREE.Vector3(...part.from), to = new THREE.Vector3(...part.to), dir = to.clone().sub(from).normalize();
    const shaft = limb(part.from, to.clone().sub(dir.clone().multiplyScalar(0.3)).toArray(), 0.055, material);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 20), material);
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
