// Copied from ibdpphy/decks/assets/model3d.js, with labels in the gcsephy deck fonts.
// Three-dimensional models that sit over a deck's flat figures. model3d('name', make) finds every
// [data-name] figure on the live deck, loads Three.js and puts a low-poly model over the flat
// picture, which stays for print and reduced motion and is all there is if the library cannot be
// fetched. The model can be dragged to turn it and scrolled or pinched to zoom; a double-click or
// double-tap goes back to the starting view. A still of it replaces the flat picture in the
// slide's thumbnail, and again when the theme changes.
//
// make({ THREE, scene, css, label, caption }) builds the scene and returns:
//   look   [x, y, z]  the point the camera looks at
//   view   { turn, lift, far }  the starting camera: angle about the vertical, angle above the
//          horizontal (radians) and distance
//   sway   how far the camera swings to and fro until someone turns the model (radians)
//   alt    the canvas's description for screen readers
//   paint  () => void  sets the colours from the theme
//   tick   (t) => void  moves the model to time t in seconds (optional)
//   still  the time drawn for the thumbnail (optional)
// css('--name') reads a colour from the theme; label(html, [x, y, z]) places a label at a point of
// the model; caption(html) adds a line of text along the bottom. Labels and captions may hold maths
// between \( and \), typeset by MathJax like the rest of the slide.
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';

function mount(THREE, fig, index, attr, make) {
  const flat = fig.querySelector('svg');
  const holder = document.createElement('div');
  holder.className = 'mover model3d';
  holder.style.cssText = 'position:absolute;inset:0;overflow:hidden;';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab;';
  canvas.setAttribute('role', 'img');
  holder.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  const labels = [];
  const label = (html, anchor) => {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;transform:translate(-50%,-50%);white-space:nowrap;text-align:center;pointer-events:none;font:700 22px/1.3 Arial, Helvetica, sans-serif;color:var(--ink);padding:2px 8px;border-radius:4px;background:rgba(255,253,247,.88);';
    el.innerHTML = html;
    holder.appendChild(el);
    labels.push({ el, anchor: new THREE.Vector3(...anchor) });
    return el;
  };
  const caption = html => {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:0;right:0;bottom:6px;text-align:center;pointer-events:none;font:700 22px/1.35 Arial, Helvetica, sans-serif;color:var(--ink);';
    el.innerHTML = html;
    holder.appendChild(el);
    return el;
  };

  const model = make({ THREE, scene, css, label, caption });
  canvas.setAttribute('aria-label', model.alt || flat?.getAttribute('aria-label') || '');
  const look = new THREE.Vector3(...model.look), start = { ...model.view }, sway = model.sway ?? 0.1;
  let { lift, far } = start, turn = null;
  model.paint();

  if (flat) flat.classList.add('still');
  fig.appendChild(holder);

  const slide = fig.closest('.slide'), point = new THREE.Vector3();
  let width = 0, height = 0;
  // Draws the model at time t (seconds) with the camera turned by `angle`. False if the figure has no size yet.
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
    camera.position.set(look.x + far * Math.cos(lift) * Math.sin(angle), look.y + far * Math.sin(lift), look.z + far * Math.cos(lift) * Math.cos(angle));
    camera.lookAt(look);
    model.tick?.(t);
    renderer.render(scene, camera);
    labels.forEach(({ el, anchor }) => {
      point.copy(anchor).project(camera);
      el.style.left = `${((point.x + 1) / 2 * w).toFixed(1)}px`;
      el.style.top = `${((1 - point.y) / 2 * h).toFixed(1)}px`;
      el.style.visibility = point.z < 1 ? 'visible' : 'hidden';
    });
    return true;
  }
  const swayed = time => start.turn + sway * Math.sin(time / 2600);
  function frame(time) {
    requestAnimationFrame(frame);
    if (!slide.classList.contains('active') || document.hidden) return;
    // A slow sway, so that the model reads in depth, until someone turns it.
    draw(time / 1000, turn ?? swayed(time));
  }
  requestAnimationFrame(frame);

  // Dragging and zooming. The canvas keeps its touches, so a drag never changes the slide.
  const pointers = new Map();
  let pinch = 0;
  const spread = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  const zoom = k => { far = Math.min(start.far * 2, Math.max(start.far * 0.5, far * k)); };
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
      turn = (turn ?? swayed(performance.now())) - (event.clientX - last.x) * 0.008;
      lift = Math.min(1.4, Math.max(-1.0, lift + (event.clientY - last.y) * 0.006));
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) { const now = spread(); if (pinch) zoom(pinch / now); pinch = now; }
  });
  const release = event => { pointers.delete(event.pointerId); pinch = 0; if (!pointers.size) canvas.style.cursor = 'grab'; };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('wheel', event => { event.preventDefault(); zoom(Math.exp(event.deltaY * 0.0012)); }, { passive: false });
  canvas.addEventListener('dblclick', () => { turn = null; ({ lift, far } = start); });
  ['touchstart', 'touchend', 'click'].forEach(type => canvas.addEventListener(type, event => event.stopPropagation()));
  // Tell the viewer they can turn it: a hint in the panel heading, shown only on screen.
  const head = fig.closest('.panel')?.querySelector('.panel-head');
  if (head && !head.querySelector('.drag-hint')) head.insertAdjacentHTML('beforeend', '<span class="pill reveal-hint drag-hint">DRAG · ZOOM</span>');

  // The slide's thumbnail is a copy made before the model was built: give it a still of the model,
  // from the starting view.
  const copy = document.querySelectorAll(`#thumbs [data-${attr}]`)[index];
  function snapshot() {
    const keep = { lift, far };
    ({ lift, far } = start);
    const ok = copy && draw(model.still ?? 1, start.turn);
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
  // Typeset any maths in the labels and caption, then take the thumbnail still.
  Promise.resolve(window.MathJax?.typesetPromise?.([holder])).catch(() => {}).then(snapshot);
  document.addEventListener('panphy:theme-change', () => { model.paint(); snapshot(); });
}

// The deck draws its figures when it starts, after the maths is typeset: wait for the flat picture.
// With reduced motion the flat picture is all there is.
const drawn = fig => new Promise(resolve => { const check = () => (fig.querySelector('svg') ? resolve() : setTimeout(check, 120)); check(); });

export function model3d(attr, make) {
  const figures = [...document.querySelectorAll(`#deck [data-${attr}]`)];
  if (!figures.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  import(THREE_URL).then(THREE => figures.forEach((fig, index) => drawn(fig).then(() => {
    try { mount(THREE, fig, index, attr, make); } catch (error) { console.warn('The 3D model could not be drawn; the flat picture stays.', error); }
  }))).catch(() => {});
}
