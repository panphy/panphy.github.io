// A low-poly Eco House seen as a doll's house: the front wall and the front roof slope are taken away so the inside and the
// cut edges show. Every wall is three layers (brick, cavity-wall insulation, inner block); a thick
// layer of loft insulation lies on the ceiling under a pitched roof; the side window is double
// glazed; the floor is slab, insulation and carpet; the back door has a draught strip. The flat
// drawing stays for print, reduced motion and offline.
import { model3d } from '../assets/model3d.js';

model3d('house3d', ({ THREE, scene, label }) => {
  const mat = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });
  const M = {
    brick: mat(0xa9472f), wool: mat(0xf2c94c), inner: mat(0xe8e1d2), slab: mat(0x7c828c), carpet: mat(0x5d86b8),
    roof: mat(0x3d4552), ceiling: mat(0xf4f1ea), ground: mat(0x8fb86a), frame: mat(0xffffff), door: mat(0x7a4a2a),
    glass: mat(0xa9dcf2, { transparent: true, opacity: 0.4, depthWrite: false }), strip: mat(0x2a2f38),
  };
  const box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); scene.add(b); return b; };

  const W = 4.4, D = 3.4, H = 2.5, T = [0.14, 0.12, 0.1];   // outer size, ceiling height, layer thicknesses
  const TOP = H + 0.4;   // the walls rise above the ceiling, so the roof clears the loft insulation
  const TT = T[0] + T[1] + T[2];
  const LAYERS = [M.brick, M.wool, M.inner];

  // One wall: three layers stacked inwards from its outer face. along = 'x' (front/back wall) or
  // 'z' (side wall); out = the outer face's coordinate; [a0, a1] its extent along the wall; [y0, y1] its height.
  function wall(along, out, a0, a1, y0, y1) {
    const inward = out > 0 ? -1 : 1;
    let off = 0;
    T.forEach((th, i) => {
      const c = out + inward * (off + th / 2), len = a1 - a0, mid = (a0 + a1) / 2, h = y1 - y0, y = (y0 + y1) / 2;
      if (along === 'x') box(len, h, th, LAYERS[i], mid, y, c); else box(th, h, len, LAYERS[i], c, y, mid);
      off += th;
    });
  }

  // Ground, then the floor: concrete slab, insulation, carpet.
  box(7.4, 0.08, 6, M.ground, 0, -0.42, 0.6);
  box(W, 0.22, D, M.slab, 0, -0.27, 0);
  box(W - 2 * TT, 0.1, D - TT, M.wool, 0, -0.11, TT / 2);
  box(W - 2 * TT, 0.04, D - TT, M.carpet, 0, -0.04, TT / 2);

  // Back wall with a door opening (x from -1.5 to -0.6, up to 2.0 m), where the open front shows it.
  wall('x', -D / 2, -W / 2, -1.5, 0, TOP);
  wall('x', -D / 2, -0.6, W / 2, 0, TOP);
  wall('x', -D / 2, -1.5, -0.6, 2.0, TOP);
  box(0.9, 1.96, 0.08, M.door, -1.05, 0.98, -D / 2 + TT - 0.05);
  box(0.9, 0.08, 0.14, M.strip, -1.05, 0.04, -D / 2 + TT + 0.02);

  // Right wall with a window opening (z from -0.6 to 0.6, height 0.9 to 1.9 m), double glazed.
  wall('z', W / 2, -D / 2 + TT, -0.6, 0, TOP);
  wall('z', W / 2, 0.6, D / 2, 0, TOP);
  wall('z', W / 2, -0.6, 0.6, 0, 0.9);
  wall('z', W / 2, -0.6, 0.6, 1.9, TOP);
  box(TT, 0.06, 1.2, M.frame, W / 2 - TT / 2, 1.4, 0);
  box(0.02, 1.0, 1.2, M.glass, W / 2 - 0.08, 1.4, 0);
  box(0.02, 1.0, 1.2, M.glass, W / 2 - TT + 0.08, 1.4, 0);

  // Side walls start inside the back wall, so no two layers overlap (overlaps flicker).
  // Left wall, whole. The front wall is left out: that is the cut-away.
  wall('z', -W / 2, -D / 2 + TT, D / 2, 0, TOP);

  // Ceiling, then a thick layer of loft insulation on top of it.
  // Ceiling and loft insulation fill the inside of the walls exactly: nothing pokes into a wall.
  const inW = W - 2 * TT, inD = D - TT, inZ = TT / 2;
  box(inW, 0.06, inD, M.ceiling, 0, H + 0.03, inZ);
  box(inW, 0.3, inD, M.wool, 0, H + 0.21, inZ);

  // Pitched roof: two slopes meeting at a ridge along x, with gable ends filled in brick.
  const rise = 1.3, half = D / 2 + 0.25, slope = Math.atan2(rise, half), len = Math.hypot(rise, half) + 0.1;
  // Only the back slope is kept: with the front wall, the front slope is cut away too, so the loft shows.
  const back = box(W + 0.5, 0.1, len, M.roof, 0, TOP + rise / 2 + 0.05, -half / 2);
  back.rotation.x = -slope;
  const gable = new THREE.Shape([new THREE.Vector2(-D / 2, 0), new THREE.Vector2(D / 2, 0), new THREE.Vector2(0, rise * (D / 2) / half)]);
  [-1, 1].forEach(side => {
    const g = new THREE.Mesh(new THREE.ExtrudeGeometry(gable, { depth: T[0], bevelEnabled: false }), M.brick);
    g.rotation.y = Math.PI / 2;
    g.position.set(side > 0 ? W / 2 - T[0] : -W / 2, TOP, 0);
    scene.add(g);
  });

  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(-3, 8, 6); scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5); fill.position.set(5, 3, 4); scene.add(fill);

  label('loft insulation', [0.2, H + 0.75, 0.6]);
  label('cavity wall insulation', [-W / 2 - 0.4, 1.3, D / 2]);
  label('double glazing', [W / 2 - 0.5, 2.15, 0]);
  label('floor insulation', [0.6, -0.7, D / 2 + 0.2]);
  label('draught strip', [-1.05, 0.2, -D / 2 + 0.45]);

  return {
    look: [0, 1.4, 0], view: { turn: -0.32, lift: 0.42, far: 12 }, sway: 0.15,
    alt: 'A cut-away house with its front wall removed: three-layer cavity walls, thick loft insulation on the ceiling under a pitched roof, a double-glazed side window, an insulated floor and a back door with a draught strip',
    paint: () => {}, still: 1,
  };
});
