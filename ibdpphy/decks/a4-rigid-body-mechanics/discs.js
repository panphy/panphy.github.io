// Two discs on one axis for the coupled-bodies example: the lower disc spins, the upper one is
// dropped onto it, and friction brings them to one shared angular velocity. A low-poly model with
// thickness replaces the flat picture in every [data-discs] figure once Three.js has loaded, and a
// still of it replaces the flat picture in the slide's thumbnail; the flat picture stays for print
// and reduced motion, and is all there is if the library cannot be fetched.
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

// The worked example: I₁ = 0.20 kg m² at 12 rad/s, then I₁ + I₂ = 0.30 kg m² at 8.0 rad/s.
// On screen the speeds are scaled down by the same factor, so their ratio is still 3 : 2.
const OMEGA_1 = 12, OMEGA = 8, SHOWN = 0.2;
// After the press: the fall and the slip, in seconds.
const DROP = 0.55, SLIP = 0.6;
const LOWER = { radius: 1.3, thick: 0.24, colour: '--brand-accent-strong' };
const UPPER = { radius: 0.9, thick: 0.24, colour: '--brand-accent', held: 1.25 };
const SIDES = 12;

const cssColour = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';

// The state of the two discs at time t, when the upper disc was let go at `drop` (null: not yet).
// The lower disc always spins. During the slip, friction changes ω by equal and opposite angular
// impulses: ΔL of one is −ΔL of the other.
function at(t, drop) {
  const w1 = OMEGA_1 * SHOWN, w = OMEGA * SHOWN, rest = LOWER.thick / 2 + UPPER.thick / 2;
  if (drop === null || t < drop + DROP) {
    const d = drop === null ? 0 : Math.max(0, t - drop) / DROP;
    return { lower: w1 * t, upper: 0, height: rest + UPPER.held * (1 - d * d), phase: 'before' };
  }
  const start = drop + DROP, s = Math.min(t - start, SLIP), k = Math.max(0, t - start - SLIP);
  return {
    lower: w1 * (start + s) + (w - w1) * s * s / (2 * SLIP) + w * k,
    upper: w * s * s / (2 * SLIP) + w * k,
    height: rest,
    phase: k > 0 ? 'after' : 'slip'
  };
}

function build(THREE, fig, index) {
  const flat = fig.querySelector('svg');
  const holder = document.createElement('div');
  holder.className = 'mover discs3d';
  holder.style.cssText = 'position:absolute;inset:0;';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'A disc spinning about a vertical axis, shown dashed, with a smaller disc at rest above it on the same axis. The smaller disc drops onto the spinning one; friction speeds it up and slows the lower disc until they turn together, more slowly than the lower disc turned alone');
  holder.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 2.7, 6.3);
  camera.lookAt(0, 0.5, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8078, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 1.7);
  sun.position.set(-3, 6, 4);
  scene.add(sun);

  // A low-poly disc made of SIDES wedges in two alternating tones, so that its turning shows
  // without any mark on it.
  const disc = ({ radius, thick }) => {
    const group = new THREE.Group(), materials = [0, 1].map(() => new THREE.MeshStandardMaterial({ roughness: 0.7, flatShading: true }));
    for (let k = 0; k < SIDES; k++) group.add(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, thick, 2, 1, false, k / SIDES * Math.PI * 2, Math.PI * 2 / SIDES), materials[k % 2]));
    return { group, materials };
  };
  const lower = disc(LOWER), upper = disc(UPPER);
  scene.add(lower.group, upper.group);

  // The axis: a dashed line drawn over everything, so the discs never hide it.
  const axisMaterial = new THREE.LineDashedMaterial({ dashSize: 0.13, gapSize: 0.09, depthTest: false, transparent: true });
  const axis = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -0.95, 0), new THREE.Vector3(0, 2.25, 0)]), axisMaterial);
  axis.computeLineDistances();
  axis.renderOrder = 10;
  scene.add(axis);

  // One line of text above the model saying what is happening, in the deck's fonts.
  const caption = document.createElement('div');
  caption.style.cssText = 'position:absolute;left:0;right:0;top:4px;text-align:center;font:600 28px/1.3 var(--font-body);color:var(--text-main);';
  holder.appendChild(caption);
  const words = {
    before: 'Lower disc alone at <i>ω</i>₁ = 12 rad s⁻¹; upper disc at rest',
    slip: 'Dropped on: friction slows one disc and speeds up the other',
    after: 'Turning together at <i>ω</i> = 8.0 rad s⁻¹'
  };

  const paint = () => {
    [[lower, LOWER], [upper, UPPER]].forEach(([d, spec]) => {
      const base = new THREE.Color(cssColour(spec.colour));
      d.materials[0].color.copy(base);
      d.materials[1].color.copy(base).lerp(new THREE.Color(0xffffff), 0.42);
    });
    axisMaterial.color.set(cssColour('--text-main'));
  };
  paint();

  if (flat) flat.classList.add('still');
  fig.appendChild(holder);

  const slide = fig.closest('.slide');
  let width = 0, height = 0, shown = '';
  // Draws the discs at time t. False if the figure has no size yet.
  function draw(t, drop) {
    const w = holder.clientWidth, h = holder.clientHeight;
    if (!w || !h) return false;
    if (w !== width || h !== height) {
      width = w; height = h;
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    const state = at(t, drop);
    lower.group.rotation.y = state.lower;
    upper.group.rotation.y = state.upper;
    upper.group.position.y = state.height;
    renderer.render(scene, camera);
    if (state.phase !== shown) { shown = state.phase; caption.innerHTML = words[shown]; }
    return true;
  }
  // The lower disc spins from when the slide opens. The figure's play step is the press that drops
  // the upper disc; hiding it again (going back) lifts the disc again. If the slide opens with the
  // step already shown, the discs are already turning together.
  let start = null, drop = null, wasActive = false;
  function frame(time) {
    requestAnimationFrame(frame);
    const active = slide.classList.contains('active') && !document.hidden;
    const pressed = !!fig.querySelector('.step.play.shown');
    if (active && !wasActive) { start = time; drop = pressed ? -10 : null; }
    wasActive = active;
    if (!active) return;
    const t = (time - start) / 1000;
    if (pressed && drop === null) drop = t;
    if (!pressed) drop = null;
    draw(t, drop);
  }
  requestAnimationFrame(frame);

  // The slide's thumbnail is a copy made before the model was built: give it a still of the discs
  // turning together, in place of the flat picture.
  const copy = document.querySelectorAll('#thumbs [data-discs]')[index];
  function snapshot() {
    if (!copy || !draw(2.3, 0)) return;
    const shot = holder.cloneNode(true), image = new Image();
    image.src = canvas.toDataURL();
    image.alt = '';
    image.style.cssText = canvas.style.cssText;
    shot.querySelector('canvas').replaceWith(image);
    copy.querySelector('.discs3d')?.remove();
    copy.querySelectorAll('svg').forEach(svg => { svg.style.display = 'none'; });
    copy.appendChild(shot);
  }
  snapshot();
  document.addEventListener('panphy:theme-change', () => { paint(); snapshot(); });
}

// The deck draws its figures when it starts, after the maths is typeset: wait for the flat picture.
// With reduced motion the flat picture is all there is.
const drawn = fig => new Promise(resolve => { const check = () => (fig.querySelector('svg') ? resolve() : setTimeout(check, 120)); check(); });
const figures = [...document.querySelectorAll('#deck [data-discs]')];
if (figures.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  import(THREE_URL).then(THREE => figures.forEach((fig, index) => drawn(fig).then(() => {
    try { build(THREE, fig, index); } catch (error) { console.warn('The 3D discs could not be drawn; the flat picture stays.', error); }
  }))).catch(() => {});
}
