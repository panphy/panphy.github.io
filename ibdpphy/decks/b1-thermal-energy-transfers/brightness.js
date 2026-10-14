// The inverse square law in three dimensions: light leaving a small source passes through a
// square of area A at distance d and then spreads over a square of area 4A at distance 2d. A
// low-poly model replaces the flat picture in every [data-brightness] figure once Three.js has
// loaded, and a still of it replaces the flat picture in the slide's thumbnail; the flat picture
// stays for print and reduced motion, and is all there is if the library cannot be fetched.
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const D = 2.2, HALF = 0.55;            // distance d, and half the side of the near square
const PACKETS = 46, SPEED = 1.1;       // bits of light flying out, and their speed
const REACH = 2 * D + 0.9;             // how far a packet travels before it starts again

const cssColour = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';

function build(THREE, fig, index) {
  const flat = fig.querySelector('svg');
  const holder = document.createElement('div');
  holder.className = 'mover model3d';
  holder.style.cssText = 'position:absolute;inset:0;';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', flat?.getAttribute('aria-label') || 'The inverse square law');
  holder.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  const look = new THREE.Vector3(D * 1.05, 0, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8078, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(-2, 5, 6);
  scene.add(sun);

  // The source: a small faceted ball.
  const sourceMaterial = new THREE.MeshStandardMaterial({ roughness: 0.5, flatShading: true, emissiveIntensity: 0.55 });
  const source = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), sourceMaterial);
  scene.add(source);

  // The near square (one tile) and the far square (four tiles), both facing the source.
  const tileMaterials = [0, 1].map(() => new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true, transparent: true, opacity: 0.72, side: THREE.DoubleSide }));
  const tile = (x, y, z, side, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.03, side, side), material);
    mesh.position.set(x, y, z);
    scene.add(mesh);
  };
  tile(D, 0, 0, 2 * HALF - 0.02, tileMaterials[0]);
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([a, b], k) => tile(2 * D, a * HALF, b * HALF, 2 * HALF - 0.04, tileMaterials[(k === 0 || k === 3) ? 0 : 1]));

  // The four edges of the beam, from the source past the corners of both squares.
  const edgeMaterial = new THREE.LineDashedMaterial({ dashSize: 0.12, gapSize: 0.08, transparent: true, opacity: 0.9 });
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([a, b]) => {
    const edge = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(2 * D, 2 * a * HALF, 2 * b * HALF)]), edgeMaterial);
    edge.computeLineDistances();
    scene.add(edge);
  });

  // Bits of light flying outwards inside the beam: each keeps its direction, so the same number
  // crosses the near square and the far one, but at 2d they are spread over four times the area.
  const packetMaterial = new THREE.MeshBasicMaterial({ transparent: true });
  const rand = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const packets = Array.from({ length: PACKETS }, () => {
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045, 0), packetMaterial);
    scene.add(mesh);
    const dir = new THREE.Vector3(1, (rand() * 2 - 1) * HALF / D * 0.94, (rand() * 2 - 1) * HALF / D * 0.94);
    return { mesh, dir, start: rand() * REACH };
  });

  // Labels in the deck's fonts, placed at points of the model each frame.
  const label = (html, anchor, dx = 0, dy = 0) => {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;transform:translate(-50%,-50%);white-space:nowrap;text-align:center;font:500 26px/1.3 var(--font-body);color:var(--text-main);';
    el.innerHTML = html;
    holder.appendChild(el);
    return { el, anchor: new THREE.Vector3(...anchor), dx, dy };
  };
  const labels = [
    label('source,<br>luminosity <i>L</i>', [0, -0.55, 0]),
    label('<b>area <i>A</i></b><br>at distance <i>d</i>', [D, HALF + 0.55, 0]),
    label('<b>area 4<i>A</i></b><br>at distance 2<i>d</i>', [2 * D, 2 * HALF + 0.55, 0])
  ];
  const caption = document.createElement('div');
  caption.style.cssText = 'position:absolute;left:0;right:0;bottom:6px;text-align:center;font:500 26px/1.3 var(--font-body);color:var(--text-main);';
  caption.innerHTML = 'Four times the area at 2<i>d</i>: <b>a quarter</b> of the brightness';
  holder.appendChild(caption);

  const paint = () => {
    const sand = cssColour('--sand'), accent = cssColour('--brand-accent'), primary = new THREE.Color(cssColour('--brand-primary'));
    sourceMaterial.color.set(sand);
    sourceMaterial.emissive.set(accent);
    packetMaterial.color.set(accent);
    tileMaterials[0].color.copy(primary);
    tileMaterials[1].color.copy(primary).lerp(new THREE.Color(0xffffff), 0.35);
    edgeMaterial.color.set(cssColour('--text-secondary'));
  };
  paint();

  if (flat) flat.classList.add('still');
  fig.appendChild(holder);

  const slide = fig.closest('.slide'), point = new THREE.Vector3();
  let width = 0, height = 0;
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
    camera.position.set(look.x + 7.4 * Math.sin(angle), 2.1, 7.4 * Math.cos(angle));
    camera.lookAt(look);
    packets.forEach(({ mesh, dir, start }) => {
      const r = (start + SPEED * t) % REACH;
      mesh.position.copy(dir).multiplyScalar(r);
      mesh.visible = r > 0.22 && r < 2 * D + 0.02;
    });
    renderer.render(scene, camera);
    labels.forEach(({ el, anchor, dx, dy }) => {
      point.copy(anchor).project(camera);
      el.style.left = `${((point.x + 1) / 2 * w + dx).toFixed(1)}px`;
      el.style.top = `${((1 - point.y) / 2 * h + dy).toFixed(1)}px`;
    });
    return true;
  }
  function frame(time) {
    requestAnimationFrame(frame);
    if (!slide.classList.contains('active') || document.hidden) return;
    // A slow sway, so that the squares read as squares in depth.
    draw(time / 1000, -0.42 + 0.16 * Math.sin(time / 2600));
  }
  requestAnimationFrame(frame);

  // The slide's thumbnail is a copy made before the model was built: give it a still of the model.
  const copy = document.querySelectorAll('#thumbs [data-brightness]')[index];
  function snapshot() {
    if (!copy || !draw(1.3, -0.42)) return;
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
