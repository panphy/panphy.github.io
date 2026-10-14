// The inverse square law in three dimensions: the power of a source spreads over the whole of
// every sphere around it, of area 4πr². A low-poly model replaces the flat picture in every
// [data-brightness] figure once Three.js has loaded, and a still of it replaces the flat picture
// in the slide's thumbnail; the flat picture stays for print and reduced motion, and is all there
// is if the library cannot be fetched. Drag to turn the model; scroll or pinch to zoom; double-click
// or double-tap to go back to the starting view.
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const D = 1.5;                  // the radius d of the inner sphere; the outer one is 2d
const CONE = 0.3;               // half the angle of the patch each sphere shows lit, in radians
const WAVE = 3.2;               // seconds for a wavefront to travel from the source to beyond 2d

const cssColour = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';

function build(THREE, fig, index) {
  const flat = fig.querySelector('svg');
  const holder = document.createElement('div');
  holder.className = 'mover model3d';
  holder.style.cssText = 'position:absolute;inset:0;overflow:hidden;';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'A small source at the centre of two spheres, of radius d and 2d. Its power spreads over the whole of each sphere. The same cone from the source lights a patch of area A on the inner sphere and a patch of area 4A, four times as large and a quarter as bright, on the outer sphere');
  holder.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
  const look = new THREE.Vector3(0.7, -0.1, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8078, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(-3, 6, 5);
  scene.add(sun);

  // The source: a small faceted ball.
  const sourceMaterial = new THREE.MeshStandardMaterial({ roughness: 0.5, flatShading: true, emissiveIntensity: 0.6 });
  scene.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 1), sourceMaterial));

  // The two spheres: low-poly, see-through, with their facet edges drawn faintly. Each is the
  // surface the source's whole power crosses.
  const shellMaterials = [], edgeMaterials = [];
  const shell = r => {
    const geometry = new THREE.SphereGeometry(r, 18, 12);
    const material = new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide });
    const edges = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.2, depthWrite: false });
    scene.add(new THREE.Mesh(geometry, material), new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 1), edges));
    shellMaterials.push(material);
    edgeMaterials.push(edges);
  };
  shell(D);
  shell(2 * D);

  // The lit patches: the part of each sphere inside one cone from the source, facing +x. On the
  // inner sphere it is one patch of area A; on the outer sphere the same cone covers four patches
  // of that size, each a quarter as bright.
  const patchMaterials = [];
  const patch = (r, phi0, phiLength, theta0, thetaLength, glow) => {
    const material = new THREE.MeshStandardMaterial({ roughness: 0.6, flatShading: true, side: THREE.DoubleSide, emissiveIntensity: glow });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(r * 1.004, 6, 6, phi0, phiLength, theta0, thetaLength), material));
    patchMaterials.push({ material, glow });
  };
  // Three.js puts φ = π on the +x axis and θ = π/2 on the equator.
  patch(D, Math.PI - CONE, 2 * CONE, Math.PI / 2 - CONE, 2 * CONE, 1);
  [[0, 0], [0, 1], [1, 0], [1, 1]].forEach(([a, b]) => patch(2 * D, Math.PI - CONE + a * CONE + 0.006, CONE - 0.012, Math.PI / 2 - CONE + b * CONE + 0.006, CONE - 0.012, 0.25));

  // The four edges of the cone, from the source out to the outer sphere.
  const coneMaterial = new THREE.LineDashedMaterial({ dashSize: 0.1, gapSize: 0.07 });
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([a, b]) => {
    const dir = new THREE.Vector3(1, Math.tan(a * CONE), Math.tan(b * CONE)).normalize();
    const edge = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), dir.multiplyScalar(2 * D)]), coneMaterial);
    edge.computeLineDistances();
    scene.add(edge);
  });

  // A wavefront: a sphere that grows from the source and fades as it spreads out, drawn as a
  // tinted skin with its facet lines over it.
  const waveMaterial = new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, depthWrite: false });
  const waveSkin = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const waveGeometry = new THREE.SphereGeometry(1, 18, 12);
  const wave = new THREE.Group();
  wave.add(new THREE.Mesh(waveGeometry, waveSkin), new THREE.Mesh(waveGeometry, waveMaterial));
  scene.add(wave);

  // Labels in the deck's fonts, placed at points of the model each frame.
  const label = (html, anchor) => {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;transform:translate(-50%,-50%);white-space:nowrap;text-align:center;font:500 24px/1.3 var(--font-body);color:var(--text-main);';
    el.innerHTML = html;
    holder.appendChild(el);
    return { el, anchor: new THREE.Vector3(...anchor) };
  };
  const labels = [
    label('source,<br>luminosity <i>L</i>', [-0.1, 0.5, 0]),
    label('<b>area <i>A</i></b><br>radius <i>d</i>', [D * 0.92, -D * Math.tan(CONE) - 0.62, 0]),
    label('<b>area 4<i>A</i></b><br>radius 2<i>d</i>', [2 * D, 2 * D * Math.tan(CONE) + 0.42, 0])
  ];
  const caption = document.createElement('div');
  caption.style.cssText = 'position:absolute;left:0;right:0;bottom:6px;text-align:center;font:500 24px/1.35 var(--font-body);color:var(--text-main);';
  caption.innerHTML = 'The power <i>L</i> spreads over the whole sphere, 4π<i>r</i>²<br>At 2<i>d</i>: four times the area, <b>a quarter</b> of the brightness';
  holder.appendChild(caption);

  const paint = () => {
    const sand = cssColour('--sand'), accent = new THREE.Color(cssColour('--brand-accent')), primary = cssColour('--brand-primary'), ink = cssColour('--text-secondary');
    sourceMaterial.color.set(sand);
    sourceMaterial.emissive.copy(accent);
    shellMaterials.forEach(m => m.color.set(primary));
    edgeMaterials.forEach(m => m.color.set(ink));
    patchMaterials.forEach(({ material }) => { material.color.set(sand); material.emissive.copy(accent); });
    coneMaterial.color.set(ink);
    // A deeper apricot, so that the wavefront shows against a light background as well as a dark one.
    waveMaterial.color.copy(accent).lerp(new THREE.Color(cssColour('--text-main')), 0.3);
    waveSkin.color.copy(accent);
  };
  paint();

  if (flat) flat.classList.add('still');
  fig.appendChild(holder);

  const slide = fig.closest('.slide'), point = new THREE.Vector3();
  let width = 0, height = 0;
  // The camera sits on a sphere round `look`: turned by `angle` about the vertical, raised by `lift`,
  // at distance `far`. Dragging and zooming change these.
  const START = { lift: 0.32, far: 11.6 };
  let lift = START.lift, far = START.far, turn = null;
  // Draws the model at time t (seconds), with the camera swung by `angle`. False if the figure has no size yet.
  function draw(t, angle) {
    const w = holder.clientWidth, h = holder.clientHeight;
    if (!w || !h) return false;
    if (w !== width || h !== height) {
      width = w; height = h;
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    camera.position.set(look.x + far * Math.cos(lift) * Math.sin(angle), look.y + far * Math.sin(lift), far * Math.cos(lift) * Math.cos(angle));
    camera.lookAt(look);
    // The wavefront's brightness falls as 1/r², like the light it carries.
    const r = 0.2 + (2 * D + 0.4) * ((t % WAVE) / WAVE), fade = Math.min(1, (D / r) ** 2);
    wave.scale.setScalar(r);
    waveMaterial.opacity = 0.75 * fade;
    waveSkin.opacity = 0.28 * fade;
    renderer.render(scene, camera);
    labels.forEach(({ el, anchor }) => {
      point.copy(anchor).project(camera);
      el.style.left = `${((point.x + 1) / 2 * w).toFixed(1)}px`;
      el.style.top = `${((1 - point.y) / 2 * h).toFixed(1)}px`;
    });
    return true;
  }
  function frame(time) {
    requestAnimationFrame(frame);
    if (!slide.classList.contains('active') || document.hidden) return;
    // A slow sway, so that the spheres and patches read in depth, until someone turns the model.
    draw(time / 1000, turn ?? 0.7 + 0.1 * Math.sin(time / 2600));
  }
  requestAnimationFrame(frame);

  // Dragging and zooming. The canvas keeps its touches, so a drag never changes the slide.
  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'grab';
  const pointers = new Map();
  let pinch = 0;
  const spread = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  const zoom = k => { far = Math.min(22, Math.max(6, far * k)); };
  canvas.addEventListener('pointerdown', event => {
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) pinch = spread();
    canvas.style.cursor = 'grabbing';
    event.stopPropagation();
  });
  canvas.addEventListener('pointermove', event => {
    const last = pointers.get(event.pointerId);
    if (!last) return;
    if (pointers.size === 1) {
      const sway = 0.7 + 0.1 * Math.sin(performance.now() / 2600);
      turn = (turn ?? sway) - (event.clientX - last.x) * 0.008;
      lift = Math.min(1.35, Math.max(-0.6, lift + (event.clientY - last.y) * 0.006));
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) { const now = spread(); if (pinch) zoom(pinch / now); pinch = now; }
  });
  const release = event => { pointers.delete(event.pointerId); pinch = 0; if (!pointers.size) canvas.style.cursor = 'grab'; };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('wheel', event => { event.preventDefault(); zoom(Math.exp(event.deltaY * 0.0012)); }, { passive: false });
  canvas.addEventListener('dblclick', () => { turn = null; lift = START.lift; far = START.far; });
  ['touchstart', 'touchend', 'click', 'keydown'].forEach(type => canvas.addEventListener(type, event => event.stopPropagation()));
  // The labels must not catch the pointer.
  holder.querySelectorAll('div').forEach(el => { el.style.pointerEvents = 'none'; });
  // Tell the viewer they can turn it: a hint in the panel heading, shown only on screen.
  const head = fig.closest('.panel')?.querySelector('.panel-head');
  if (head && !head.querySelector('.drag-hint')) head.insertAdjacentHTML('beforeend', '<span class="pill reveal-hint drag-hint">DRAG · ZOOM</span>');

  // The slide's thumbnail is a copy made before the model was built: give it a still of the model.
  const copy = document.querySelectorAll('#thumbs [data-brightness]')[index];
  function snapshot() {
    const keep = { lift, far };
    lift = START.lift; far = START.far;
    const ok = copy && draw(WAVE * 0.3, 0.7);
    ({ lift, far } = keep);
    if (!ok) return;
    const shot = holder.cloneNode(true), image = new Image();
    image.src = canvas.toDataURL();
    image.alt = '';
    image.style.cssText = canvas.style.cssText;
    shot.querySelector('canvas').replaceWith(image);
    copy.querySelector('.model3d')?.remove();
    copy.querySelectorAll('svg').forEach(svg => { svg.style.display = 'none'; });
    copy.appendChild(shot);
  }
  snapshot();
  document.addEventListener('panphy:theme-change', () => { paint(); snapshot(); });
}

// The deck draws its figures when it starts, after the maths is typeset: wait for the flat picture.
// With reduced motion the flat picture is all there is.
const drawn = fig => new Promise(resolve => { const check = () => (fig.querySelector('svg') ? resolve() : setTimeout(check, 120)); check(); });
const figures = [...document.querySelectorAll('#deck [data-brightness]')];
if (figures.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  import(THREE_URL).then(THREE => figures.forEach((fig, index) => drawn(fig).then(() => {
    try { build(THREE, fig, index); } catch (error) { console.warn('The 3D model could not be drawn; the flat picture stays.', error); }
  }))).catch(() => {});
}
