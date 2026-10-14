// A low-poly Eco House, cut away at the front corner so the layers show: brick, cavity-wall
// insulation and the inner wall; loft insulation under the roof; double glazing; an insulated
// floor; a draught-proofed door. The flat drawing stays for print, reduced motion and offline.
import { model3d } from '../assets/model3d.js';

model3d('house3d', ({ THREE, scene, label }) => {
  const mat = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });
  const M = {
    brick: mat(0xb5523b), inner: mat(0xeee6d6), wool: mat(0xffd45a), floor: mat(0x8a8f98), carpet: mat(0x6f9ccf),
    roof: mat(0x4b5563), glass: mat(0x9fd8f0, { transparent: true, opacity: 0.45 }), frame: mat(0xffffff), door: mat(0x7a4a2a), ground: mat(0x9cc36a),
  };
  const box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); scene.add(b); return b; };
  const H = 2.4, W = 4, D = 3;
  // Ground and an insulated floor: slab, insulation, carpet.
  box(7, 0.1, 6, M.ground, 0, -0.35, 0);
  box(W, 0.2, D, M.floor, 0, -0.2, 0);
  box(W - 0.4, 0.08, D - 0.4, M.wool, 0, -0.06, 0);
  box(W - 0.4, 0.03, D - 0.4, M.carpet, 0, 0, 0);
  // A wall of three layers, as boxes along x (dir 'x') or z (dir 'z'), from a to b.
  function wall(dir, at, a, b) {
    const len = b - a, mid = (a + b) / 2, layers = [[0.14, M.brick, 0.07], [0.12, M.wool, 0.2], [0.1, M.inner, 0.31]];
    layers.forEach(([th, m, off]) => {
      const sign = at > 0 ? -1 : 1, p = at + sign * off;
      if (dir === 'x') box(len, H, th, m, mid, H / 2, p); else box(th, H, len, m, p, H / 2, mid);
    });
  }
  wall('x', -D / 2, -W / 2, W / 2);       // back wall, whole
  wall('z', -W / 2, -D / 2, D / 2);       // left wall, whole
  wall('x', D / 2, -W / 2, 0);            // front wall, cut at x = 0
  wall('z', W / 2, -D / 2, 0);            // right wall, cut at z = 0
  // Double glazing on the left wall: a white frame holding two panes with a gap between them.
  box(0.16, 1.06, 1.16, M.frame, -W / 2 - 0.08, 1.35, 0.3);
  box(0.02, 0.9, 1.0, M.glass, -W / 2 - 0.17, 1.35, 0.3);
  box(0.02, 0.9, 1.0, M.glass, -W / 2 - 0.27, 1.35, 0.3);
  // A door in the front wall, with a draught strip along its foot.
  box(0.8, 1.9, 0.42, M.door, -1.2, 0.95, D / 2 - 0.21);
  box(0.8, 0.06, 0.46, M.wool, -1.2, 0.03, D / 2 - 0.21);
  // Ceiling and a thick layer of loft insulation over the back half, under one roof slope.
  box(W, 0.08, D, M.inner, 0, H + 0.04, 0);
  box(W - 0.3, 0.3, D / 2, M.wool, 0, H + 0.23, -D / 4);
  const slope = box(W + 0.3, 0.1, Math.hypot(D / 2, 1.3) + 0.2, M.roof, 0, H + 0.65, -D / 4 - 0.05);
  slope.rotation.x = Math.atan2(1.3, D / 2);
  // Gable on the left wall.
  const gable = new THREE.Shape([new THREE.Vector2(-D / 2, 0), new THREE.Vector2(D / 2, 0), new THREE.Vector2(0, 1.3)]);
  const g = new THREE.Mesh(new THREE.ShapeGeometry(gable), M.brick);
  g.rotation.y = Math.PI / 2; g.position.set(-W / 2 + 0.01, H, 0); g.material.side = THREE.DoubleSide; scene.add(g);

  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(4, 7, 5); scene.add(sun);

  label('loft insulation', [0.4, H + 0.6, -0.6]);
  label('cavity wall insulation', [1.6, 1.3, 0.05]);
  label('double glazing', [-2.6, 2.05, 0.3]);
  label('floor insulation', [0.6, -0.55, 1.2]);
  label('draught strip', [-1.2, -0.45, 1.9]);

  return {
    look: [0, 1.1, 0], view: { turn: 0.75, lift: 0.42, far: 12 }, sway: 0.25,
    alt: 'A house cut away at one corner, showing loft insulation, cavity wall insulation, double glazing, floor insulation and a draught strip under the door',
    paint: () => {}, still: 1,
  };
});
