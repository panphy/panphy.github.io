// The page's title artwork: "ASTEROID STORM" in the game's pixel font with arcade-marquee
// shading, the player's ship flying in from the left in 3D, and two asteroids on the right.
// Drawn in code like the rest of the game's art, and gently animated. The 3D ship is the game's
// own sprite turned into voxels: each pixel becomes a column of cubes (a rounded fuselage, thin
// wings, a raised canopy), drawn into a small pixel buffer with a depth test and shaded per face.
import { PAL, SHIP_W, SHIP_H, drawText, textWidth } from './art.js?v=20261127-rotate';

const TITLE = 'ASTEROID STORM';
const SCALE = 2; // the 5 x 7 font at twice size: 10 x 14 px letters
const TW = 284; // artwork size in pixels, before the page scales it up
const TH = 40;

// Rows of the lettering from top to bottom: white-hot, gold, orange, red.
function rowColor(row, height) {
  const f = row / height;
  if (f < 0.22) return '#fff1c2';
  if (f < 0.55) return PAL.gold;
  if (f < 0.82) return PAL.amber;
  return PAL.hull;
}

// The lettering, shaded by row, outlined in ink, with a deep red drop shadow.
function buildLettering() {
  const w = textWidth(TITLE, SCALE) + 6;
  const h = 7 * SCALE + 6;
  const plain = document.createElement('canvas');
  plain.width = w;
  plain.height = h;
  const pctx = plain.getContext('2d');
  drawText(pctx, TITLE, 2, 2, { scale: SCALE, color: '#ffffff', shadow: null });
  const src = pctx.getImageData(0, 0, w, h).data;
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 0;

  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');
  // Drop shadow two pixels down and right, then the outline, then the shaded letters.
  ctx.fillStyle = PAL.hullDark;
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) if (on(x - 2, y - 2) || on(x - 1, y - 2) || on(x - 2, y - 1)) ctx.fillRect(x, y, 1, 1);
  ctx.fillStyle = PAL.ink;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (on(x, y)) continue;
      if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) ctx.fillRect(x, y, 1, 1);
    }
  }
  for (let y = 0; y < h; y += 1) {
    ctx.fillStyle = rowColor(y - 2, 7 * SCALE);
    for (let x = 0; x < w; x += 1) if (on(x, y)) ctx.fillRect(x, y, 1, 1);
  }
  return out;
}

// The voxel model: [forward, side, up, color, normal] for every cube, from the sprite's pixels.
function buildVoxels(ship) {
  const cx = (SHIP_W - 1) / 2;
  const cy = (SHIP_H - 1) / 2;
  const at = new Set(ship.pixels.map((p) => `${p.x},${p.y}`));
  const solid = new Set();
  const cubes = [];
  for (const p of ship.pixels) {
    let color = p.color;
    const f = cy - p.y; // the nose is at the top of the sprite
    const side = p.x - cx;
    const a = Math.abs(side);
    const fuselage = a <= 2;
    if (color === PAL.ink) {
      // The outline is redrawn around the 3D silhouette; inner ink lines stay as panel lines.
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !at.has(`${p.x + dx},${p.y + dy}`))) continue;
      if (!fuselage) color = PANEL;
    }
    // Thickness: a rounded fuselage with a raised canopy, and thin flat wings.
    let lo = 0;
    let hi = 0;
    if (color === PAL.glass || color === PAL.glassHi) { lo = -1; hi = 2; } else if (fuselage) { lo = -1; hi = a > 1 ? 0 : 1; }
    for (let z = lo; z <= hi; z += 1) {
      cubes.push([f, side, z, color]);
      solid.add(`${f},${side},${z}`);
    }
  }
  // Each cube is shaded by the face it shows most: tops keep the sprite's own colors, so the
  // ship reads as the one in the game, and the shading never flickers as it banks.
  const has = (f, side, z) => solid.has(`${f},${side},${z}`);
  return cubes.map(([f, side, z, color]) => {
    let shade = 0.5;
    if (!has(f, side, z + 1)) shade = 1;
    else if (!has(f, side + 1, z)) shade = 0.62;
    else if (!has(f, side - 1, z)) shade = 0.82;
    else if (!has(f + 1, side, z)) shade = 0.9;
    else if (!has(f - 1, side, z)) shade = 0.7;
    const rgb = [1, 3, 5].map((i) => Math.round(parseInt(color.slice(i, i + 2), 16) * shade));
    return { f, side, z, rgb };
  });
}

const SHIP_BOX = 52; // px square the 3D ship is drawn into
const VOXEL = 1.6; // px per cube
const YAW = -0.38; // nose turned a little towards the viewer
const ELEVATION = 1.05; // the camera looks well down on the ship, so the swept wings show
const ROLL = 0.2; // how far the ship banks each way
const PANEL = '#5a1f22'; // the sprite's ink lines on the wings, as dark panel seams

// Model (forward, side, up) to screen (x right, y down, d towards the viewer), with a roll.
function project(f, side, z, roll) {
  const s1 = side * Math.cos(roll) - z * Math.sin(roll);
  const z1 = side * Math.sin(roll) + z * Math.cos(roll);
  const x = f * Math.cos(YAW) - s1 * Math.sin(YAW);
  const depth = f * Math.sin(YAW) + s1 * Math.cos(YAW);
  return [x, -z1 * Math.cos(ELEVATION) + depth * Math.sin(ELEVATION), -depth * Math.cos(ELEVATION) + z1 * Math.sin(ELEVATION)];
}

// Reused on every frame of the spinning ship rather than allocated anew.
let shipImg = null;
const zbuf = new Float32Array(SHIP_BOX * SHIP_BOX);

function renderShip(target, cubes, roll) {
  const ctx = target.getContext('2d');
  if (!shipImg) shipImg = ctx.createImageData(SHIP_BOX, SHIP_BOX);
  else shipImg.data.fill(0);
  const img = shipImg;
  zbuf.fill(-Infinity);
  const o = SHIP_BOX / 2;
  for (const c of cubes) {
    const color = c.rgb;
    // Eight sample points per cube, so a turned grid leaves no gaps.
    for (const df of [-0.25, 0.25]) for (const ds of [-0.25, 0.25]) for (const dz of [-0.25, 0.25]) {
      const [x, y, d] = project(c.f + df, c.side + ds, c.z + dz, roll);
      const px = Math.round(o + x * VOXEL);
      const py = Math.round(o + y * VOXEL);
      if (px < 0 || py < 0 || px >= SHIP_BOX || py >= SHIP_BOX) continue;
      const i = py * SHIP_BOX + px;
      if (d <= zbuf[i]) continue;
      zbuf[i] = d;
      img.data.set([color[0], color[1], color[2], 255], i * 4);
    }
  }
  // Ink outline around the silhouette, as on every sprite in the game.
  const filled = (x, y) => x >= 0 && y >= 0 && x < SHIP_BOX && y < SHIP_BOX && img.data[(y * SHIP_BOX + x) * 4 + 3] === 255;
  const ink = [1, 3, 5].map((i) => parseInt(PAL.ink.slice(i, i + 2), 16));
  const edge = [];
  for (let y = 0; y < SHIP_BOX; y += 1) {
    for (let x = 0; x < SHIP_BOX; x += 1) {
      if (!filled(x, y) && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))) edge.push((y * SHIP_BOX + x) * 4);
    }
  }
  for (const i of edge) img.data.set([ink[0], ink[1], ink[2], 254], i);
  ctx.putImageData(img, 0, 0); // replaces every pixel, so no clear is needed
}

export function mountTitle(canvas, { ship, rocks }) {
  canvas.width = TW;
  canvas.height = TH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const lettering = buildLettering();
  const cubes = buildVoxels(ship);
  const shipCanvas = document.createElement('canvas');
  shipCanvas.width = SHIP_BOX;
  shipCanvas.height = SHIP_BOX;
  const big = rocks[4][1];
  const small = rocks[1][0];
  const stars = [[50, 4], [128, 3], [186, 35], [244, 4], [6, 33], [104, 36], [222, 33]];
  const shipLeft = 6; // where the ship's box sits
  const textX = shipLeft + SHIP_BOX + 2;
  const textY = Math.round((TH - lettering.height) / 2) + 1;

  function draw(t) {
    ctx.clearRect(0, 0, TW, TH);
    // Twinkling stars.
    stars.forEach(([x, y], i) => {
      const on = Math.sin(t * 2.2 + i * 1.7) > 0.2;
      ctx.fillStyle = on ? PAL.white : PAL.slate;
      ctx.fillRect(x, y, 1, 1);
      if (on && i % 2 === 0) { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
    });
    // The ship banks and bobs; the flame and speed streaks stay on its tail.
    const roll = Math.sin(t * 1.3) * ROLL;
    const bob = Math.round(Math.sin(t * 1.7) * 1.5);
    const top = Math.round((TH - SHIP_BOX) / 2) + bob;
    renderShip(shipCanvas, cubes, roll);
    const [tx, ty] = project(-(SHIP_H - 1) / 2 + 1, 0, -0.5, roll);
    const tailX = Math.round(shipLeft + SHIP_BOX / 2 + tx * VOXEL);
    const tailY = Math.round(top + SHIP_BOX / 2 + ty * VOXEL);
    // The ship's axis on screen, so the streaks and flame point the way it flies.
    const [nx, ny] = project(1, 0, 0, roll);
    const [ox, oy] = project(0, 0, 0, roll);
    const axis = Math.hypot(nx - ox, ny - oy);
    const ux = (nx - ox) / axis;
    const uy = (ny - oy) / axis;
    const dot = (x, y, color) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };
    // A pixel line from a point a distance `from` behind the tail, `len` long towards the nose,
    // shifted `side` px across the axis; half-pixel steps leave no gaps on a slant.
    const line = (side, from, len, color) => {
      for (let d = 0; d <= len; d += 0.5) dot(tailX - ux * (from - d) - uy * side, tailY - uy * (from - d) + ux * side, color);
    };
    [[-8, 9], [7, 11], [-3, 5]].forEach(([side, len], i) => {
      line(side, 18 - ((Math.floor(t * 40) + i * 7) % 6), len, i === 2 ? PAL.steel : PAL.slate);
    });
    // The flame: red outside, then orange, then a gold core, each layer shorter.
    const flame = 8 + (Math.floor(t * 12) % 3) * 2;
    for (let side = -2; side <= 2; side += 0.5) line(side, flame - 1, flame - 1 - Math.abs(side), PAL.hull);
    for (let side = -1; side <= 1; side += 0.5) line(side, flame - 3, flame - 3, PAL.amber);
    line(0, flame - 5, flame - 5, PAL.gold);
    ctx.drawImage(shipCanvas, shipLeft, top);
    ctx.drawImage(lettering, textX, textY);
    // Two asteroids tumbling slowly on the right.
    const frameAt = (set, speed) => set.frames[Math.floor(t * speed) % set.frames.length];
    const a = frameAt(big, 3);
    ctx.drawImage(a, TW - a.width + 2, Math.round((TH - a.height) / 2));
    const b = frameAt(small, 5);
    ctx.drawImage(b, TW - 44, 2);
  }

  const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still) { draw(0); return; }
  let last = 0;
  (function loop(now) {
    // About 12 frames a second is plenty for a pixel-art marquee.
    if (now - last > 80) { draw(now / 1000); last = now; }
    requestAnimationFrame(loop);
  }(0));
}
