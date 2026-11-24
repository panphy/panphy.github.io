// The pilot portrait under the leaderboard: a 32 x 32 cartoon face drawn in code and shown at
// 64 x 64. An expression is a set of numbers (eye openness, brow heights, mouth openness...);
// they ease toward each new target, and the drawing picks a pixel shape for each value, so a
// change of face steps through in-between shapes instead of snapping.
//
// main.js calls react() for one-off events and frame() every display frame with what is going on
// (danger, nearest threat, active capsules, black holes, flares).

const C = {
  space: '#090818', ink: '#0d0b1a', white: '#f2f0e6', pale: '#c9d3e6', steel: '#8a97b4',
  slate: '#525d80', navy: '#2b2f52', hull: '#e2553b', hullDark: '#9c2f2a', gold: '#ffd166',
  amber: '#ffad4a', glass: '#4fd8ec', glassHi: '#c8fbff', mint: '#5fe3a1', rose: '#ff5f7e',
  violet: '#8f6bff', skin: '#f2b48c', skinShade: '#c97f62', hair: '#5a3a2a', hairHi: '#7a5238',
  mouth: '#6b1f2a',
};

const BASE = {
  yaw: 0, bob: 0, shake: 0, gazeX: 0, gazeY: 0,
  eyeOpen: 1, happy: 0, squint: 0, dead: 0, browIn: 0, browOut: 0,
  mouthOpen: 0, smile: 0.45, smirk: 0, teeth: 0, wobble: 0, blush: 0, sweat: 0, shades: 0,
  scale: 1, trail: 0, stretch: 0, holeDir: 1, holeRim: 0,
  flare: 0, flareDir: -1, shieldRim: 0, red: 0, sparkle: 0, ring: 0, ringA: 0, desat: 0,
  alert: 0, alertDir: 1, gold: 0,
};

// Expression and effect targets; anything left out stays as the resting face has it.
const FACES = {
  tense: { browIn: -0.9, browOut: 0.4, smile: -0.1, wobble: 1 },
  nearMiss: { eyeOpen: 1.4, browIn: -1, browOut: -1, mouthOpen: 0.3, smile: 0, teeth: 0, wobble: 0 },
  capsule: { happy: 1, mouthOpen: 0.3, teeth: 1, smile: 1, blush: 1, browIn: -1, browOut: -1, sparkle: 1, wobble: 0 },
  shield: { eyeOpen: 0.5, browOut: -1, browIn: 0, smirk: 1, wobble: 0 },
  mini: { eyeOpen: 1.4, browIn: -1, browOut: -1, mouthOpen: 0.3, smile: 0, wobble: 0 },
  shockwave: { squint: 1, browIn: 1, browOut: -1, mouthOpen: 0.8, teeth: 1, smile: 0.1, wobble: 0 },
  hit: { eyeOpen: 0, browIn: -1, browOut: 0.5, mouthOpen: 0.75, teeth: 0, smile: -0.5, red: 0.9, wobble: 0 },
};
// Lasting states, applied in this order; later ones win.
const STATES = [
  ['god', { gold: 1, smirk: 1, wobble: 0, sweat: 0 }],
  ['shield', { shieldRim: 1, smile: 0.35 }],
  ['radar', {}],
  ['slow', { eyeOpen: 0.5, smile: 0.45, browIn: 0, browOut: 0, desat: 1, wobble: 0 }],
  ['auto', { shades: 1, smirk: 1, wobble: 0 }],
  ['mini', { scale: 0.5, trail: 1 }],
  ['comet', { eyeOpen: 1.4, browIn: -1, browOut: -1, mouthOpen: 0.3, smile: 0, teeth: 0, wobble: 0, alert: 1 }],
  ['flareWarn', { squint: 0.6, browIn: 0.8, smile: -0.3, flare: 0.3, wobble: 0 }],
  ['flare', { squint: 1, browIn: 1, browOut: -1, mouthOpen: 0.3, teeth: 1, smile: -0.3, sweat: 1, flare: 1, wobble: 0 }],
  ['hole', { eyeOpen: 1.4, browIn: -1, browOut: 0, mouthOpen: 0.75, teeth: 0, smile: -0.5, stretch: 1, holeRim: 1, wobble: 0 }],
  ['dead', { dead: 1, sweat: 0, mouthOpen: 0.75, teeth: 0, smile: -0.5, browIn: -1, red: 0.6, wobble: 0, shades: 0 }],
];
const EVENTS = {
  nearMiss: { dur: 0.9, prio: 2 }, capsule: { dur: 1.3, prio: 3 }, shield: { dur: 1.1, prio: 3 },
  mini: { dur: 0.9, prio: 3 }, shockwave: { dur: 0.9, prio: 4 }, hit: { dur: 0.6, prio: 9 },
};
// How fast each number eases (per second); the rest use 9.
const RATE = { eyeOpen: 22, gazeX: 14, gazeY: 14, yaw: 4, scale: 6, trail: 6, shades: 4, shieldRim: 5,
  desat: 4, holeRim: 5, stretch: 5, flare: 7, red: 6, sparkle: 4, alert: 12, gold: 5 };
const HIT_TO_DEAD = 0.6; // s of pain face before the game-over face
const STARS = [[5, 6], [58, 9], [8, 52], [55, 50], [50, 3], [3, 30], [61, 34], [30, 2], [40, 60]];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function mixHex(a, b, k) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * clamp(k, 0, 1))).join(',')})`;
}

// The helmet shell never changes, so it is drawn once.
function helmetLayer() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 32;
  const g = cv.getContext('2d');
  const inside = (x, y) => ((x + 0.5 - 16) / 12.6) ** 2 + ((y + 0.5 - 15) / 13.6) ** 2 <= 1;
  for (let y = 0; y < 32; y += 1) {
    for (let x = 0; x < 32; x += 1) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      const s = ((x - 16) / 12.6) * 0.6 + ((y - 15) / 13.6) * 0.6;
      g.fillStyle = edge ? C.ink : s < 0.12 ? C.pale : s < 0.5 ? C.steel : C.slate;
      g.fillRect(x, y, 1, 1);
    }
  }
  g.fillStyle = C.white;
  [[8, 6], [9, 5], [10, 4], [11, 4], [7, 7]].forEach(([x, y]) => g.fillRect(x, y, 1, 1));
  return cv;
}

function drawFace(g, helmet, P, t) {
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const px = (x, y, c) => R(x, y, 1, 1, c);
  const fs = clamp(Math.round(P.yaw * 5), -1, 1); // head turn: features shift a pixel
  const look = clamp(Math.round(P.gazeX * 1.4), -1, 1);
  g.clearRect(0, 0, 32, 32);

  // Suit collar, helmet, stripe, ear pods with blinking lights.
  R(5, 26, 22, 6, C.ink); R(6, 27, 20, 5, C.hull); R(6, 27, 20, 1, C.hullDark); R(20, 29, 2, 2, C.gold);
  g.drawImage(helmet, 0, 0);
  for (let y = 2; y < 8; y += 1) { R(14 + fs, y, 3, 1, C.hull); px(17 + fs, y, C.hullDark); }
  if (P.dead > 0.5) [[20, 3], [21, 4], [21, 5], [22, 6], [23, 6], [24, 7]].forEach(([x, y]) => px(x, y, C.ink));
  const led = Math.sin(t * 3.2) > -0.2 ? C.gold : C.hullDark;
  R(2, 13, 3, 7, C.ink); R(3, 14, 1, 5, C.steel); px(3, 16, led);
  R(27, 13, 3, 7, C.ink); R(28, 14, 1, 5, C.slate); px(28, 16, led);

  // Face window: navy rim, skin, hair fringe, nose shading.
  const cut = (x, y, w, h, c) => { R(x + 2, y, w - 4, h, c); R(x, y + 2, w, h - 4, c); R(x + 1, y + 1, w - 2, h - 2, c); };
  cut(7, 8, 18, 18, C.navy);
  cut(8, 9, 16, 16, C.skin);
  R(fs > 0 ? 8 : 23, 11, 1, 12, C.skinShade); R(10, 24, 12, 1, C.skinShade);
  R(9, 9, 14, 2, C.hair); R(8, 10, 16, 1, C.hair);
  [9, 12, 16, 20, 22].forEach((x) => px(clamp(x + fs, 8, 23), 11, C.hair));
  [11, 15, 19].forEach((x) => px(x + fs, 9, C.hairHi));
  px(16 + fs, 18, C.skinShade); px(16 + fs, 19, C.skinShade);

  // Eyes: left at x 10-13, right at x 18-21 (plus the head turn).
  // God mode turns the eyes gold, with amber pupils and a white glint.
  const god = P.gold > 0.5;
  const white = god ? C.gold : C.white;
  const pupil = god ? C.hullDark : C.ink;
  const eye = (ex, side) => {
    if (P.dead > 0.5) { [[0, 14], [3, 14], [1, 15], [2, 15], [0, 16], [3, 16]].forEach(([dx, y]) => px(ex + dx, y, C.ink)); return; }
    if (P.happy > 0.5) { px(ex, 16, C.ink); R(ex + 1, 15, 2, 1, C.ink); px(ex + 3, 16, C.ink); return; }
    if (P.squint > 0.5) { R(ex, 15, 4, 1, C.ink); px(side < 0 ? ex : ex + 3, 14, C.ink); px(side < 0 ? ex + 3 : ex, 16, C.ink); return; }
    const o = P.eyeOpen;
    if (o < 0.2) { R(ex, 15, 4, 1, C.ink); px(ex, 16, C.ink); px(ex + 3, 16, C.ink); return; }
    if (o < 0.62) { R(ex, 14, 4, 1, C.ink); R(ex, 15, 4, 2, white); R(ex + 1 + look, 15, 2, 2, pupil); }
    else if (o < 1.15) { R(ex, 14, 4, 3, white); R(ex + 1 + look, 15, 2, 2, pupil); }
    else { R(ex, 13, 4, 4, white); R(ex + 1 + look, P.gazeY > 0.3 ? 15 : 14, 2, 2, pupil); }
    if (god && o >= 0.2) px(ex + 1 + look, 15, C.white);
  };
  eye(10 + fs, -1); eye(18 + fs, 1);

  // Brows: the inner and outer halves move separately (positive is down).
  const iy = 12 + clamp(Math.round(P.browIn * 1.3), -1, 1);
  const oy = 12 + clamp(Math.round(P.browOut * 1.3), -1, 1);
  R(10 + fs, oy, 2, 1, C.ink); R(12 + fs, iy, 2, 1, C.ink);
  R(18 + fs, iy, 2, 1, C.ink); R(20 + fs, oy, 2, 1, C.ink);

  // Sunglasses flip down from the helmet.
  if (P.shades > 0.05) {
    const gy = 13 - Math.round((1 - clamp(P.shades, 0, 1)) * 7);
    R(9 + fs, gy, 14, 4, C.ink); R(10 + fs, gy + 1, 5, 2, C.navy); R(17 + fs, gy + 1, 5, 2, C.navy);
    px(11 + fs, gy + 1, C.glassHi); px(12 + fs, gy + 1, C.glass); px(18 + fs, gy + 1, C.glassHi); px(19 + fs, gy + 1, C.glass);
  }

  // Mouth: its shape follows openness, smile and teeth.
  const m = fs + (P.smirk > 0.5 ? 1 : 0);
  const o = P.mouthOpen;
  if (o < 0.14) {
    if (P.wobble > 0.5) { [13, 15, 17].forEach((x) => px(x + m, 22, C.ink)); [14, 16, 18].forEach((x) => px(x + m, 21, C.ink)); }
    else if (P.smirk > 0.5) { R(14 + m, 21, 4, 1, C.ink); px(18 + m, 20, C.ink); px(19 + m, 19, C.ink); }
    else if (P.smile > 0.3) { px(13 + m, 20, C.ink); R(14 + m, 21, 4, 1, C.ink); px(18 + m, 20, C.ink); }
    else if (P.smile < -0.3) { px(13 + m, 22, C.ink); R(14 + m, 21, 4, 1, C.ink); px(18 + m, 22, C.ink); }
    else R(14 + m, 21, 4, 1, C.ink);
  } else if (o < 0.5) {
    if (P.teeth > 0.5 && P.smile > 0.4) { px(11 + m, 19, C.ink); px(20 + m, 19, C.ink); R(12 + m, 20, 8, 3, C.ink); R(13 + m, 20, 6, 1, C.white); R(13 + m, 21, 6, 1, C.mouth); }
    else if (P.teeth > 0.5) { R(12 + m, 20, 8, 3, C.ink); R(13 + m, 21, 6, 1, C.white); px(15 + m, 21, C.ink); px(17 + m, 21, C.ink); }
    else { R(14 + m, 20, 4, 3, C.ink); R(15 + m, 21, 2, 1, C.mouth); }
  } else if (P.teeth > 0.5) {
    R(12 + m, 19, 8, 5, C.ink); R(13 + m, 20, 6, 3, C.mouth); R(13 + m, 20, 6, 1, C.white); R(14 + m, 22, 4, 1, C.hull);
  } else {
    R(13 + m, 19, 6, 5, C.ink); R(14 + m, 20, 4, 3, C.mouth); R(15 + m, 22, 2, 1, C.hull);
  }

  if (P.blush > 0.5) { R(9 + fs, 18, 2, 1, C.rose); R(21 + fs, 18, 2, 1, C.rose); }
  // Sweat drops slide down the temples.
  if (P.sweat > 0.5) {
    const k = Math.floor(((t * 1.4) % 1) * 4);
    px(22, 11 + k, C.glassHi); R(21, 12 + k, 2, 2, C.glass);
    const p2 = (t * 1.4 + 0.5) % 1;
    if (p2 < 0.6) { const k2 = Math.floor(p2 * 4); px(9, 16 + k2, C.glassHi); px(9, 17 + k2, C.glass); }
  }
  // Glare on the side facing a flare.
  if (P.flare > 0.05) {
    g.globalAlpha = 0.3 * clamp(P.flare, 0, 1);
    if (P.flareDir < 0) R(8, 11, 7, 14, C.gold); else R(17, 11, 7, 14, C.gold);
    g.globalAlpha = 1;
  }
}

function render(c, off, helmet, P, t) {
  const g = off.getContext('2d');
  drawFace(g, helmet, P, t);
  c.imageSmoothingEnabled = false;
  const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  R(0, 0, 64, 64, P.desat > 0.02 ? mixHex(C.space, '#0e1636', P.desat) : C.space);
  if (P.red > 0.02) { c.globalAlpha = clamp(P.red, 0, 1); R(0, 0, 64, 64, '#3a0d16'); c.globalAlpha = 1; }
  STARS.forEach(([x, y], k) => {
    const yy = Math.floor((y + t * (P.desat > 0.5 ? 0.6 : 2.5) * (1 + (k % 3) * 0.4)) % 64);
    R(x, yy, 1, 1, Math.sin(t * 2 + k) > 0.6 ? C.pale : C.slate);
  });

  // Behind the pilot: shockwave rings and the flare's flames.
  if (P.ringA > 0.02) {
    c.strokeStyle = C.gold; c.lineWidth = 2; c.setLineDash([4, 3]);
    for (const lag of [0, 0.25]) {
      const p = P.ring - lag;
      if (p <= 0 || p >= 1) continue;
      c.globalAlpha = P.ringA * (1 - p);
      c.beginPath(); c.arc(32, 32, 14 + p * 22, 0, Math.PI * 2); c.stroke();
    }
    c.setLineDash([]); c.globalAlpha = 1;
  }
  if (P.flare > 0.02) {
    for (let y = 0; y < 64; y += 2) {
      const w = Math.round(P.flare * (5 + 3 * Math.sin(y * 0.55 + t * 12)));
      if (w <= 0) continue;
      R(P.flareDir < 0 ? 0 : 64 - w, y, w, 2, C.hull);
      const w2 = Math.max(0, w - 3);
      R(P.flareDir < 0 ? 0 : 64 - w2, y, w2, 2, C.amber);
      if (w > 4) R(P.flareDir < 0 ? 0 : 63, y, 1, 2, C.gold);
    }
  }

  // The pilot: shrinks for Mini (with afterimages), stretches toward a black hole.
  const size = 64 * P.scale;
  const fx = 32 - size / 2 + Math.round(P.shake);
  const fy = 64 - size + Math.round(P.bob);
  if (P.gold > 0.05) {
    // God mode: a flickering golden power aura behind the pilot.
    const cx = 32 + Math.round(P.shake);
    const cy = fy + 30 * P.scale;
    c.globalAlpha = 0.85 * clamp(P.gold, 0, 1);
    for (let k = 0; k < 28; k += 1) {
      const a = (k / 28) * Math.PI * 2;
      const len = (3 + 3 * Math.max(0, Math.sin(t * 9 + k * 2.3)) + (Math.sin(a) < 0 ? 2 : 0)) * P.scale;
      for (let r = 27 * P.scale; r < 27 * P.scale + len; r += 1) {
        R(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r - (r - 27 * P.scale) * 0.6), 2, 2, r - 27 * P.scale < len / 2 ? C.gold : C.amber);
      }
    }
    c.globalAlpha = 1;
  }
  if (P.stretch > 0.02) {
    for (let row = 0; row < 32; row += 1) {
      const pull = Math.max(0, 1 - Math.abs(row * 2 - 34) / 40) * P.stretch;
      const w = 64 + pull * 10;
      const x = P.holeDir > 0 ? -2 + pull * 8 : 66 - w - pull * 8;
      c.drawImage(off, 0, row, 32, 1, Math.round(x), row * 2 + Math.round(fy), Math.round(w), 2);
    }
  } else {
    if (P.trail > 0.05) {
      c.globalAlpha = 0.18 * P.trail; c.drawImage(off, Math.round(fx - 12 * P.trail), Math.round(fy), size, size);
      c.globalAlpha = 0.35 * P.trail; c.drawImage(off, Math.round(fx - 6 * P.trail), Math.round(fy), size, size);
      c.globalAlpha = 1;
    }
    c.drawImage(off, Math.round(fx), Math.round(fy), Math.round(size), Math.round(size));
  }

  // In front: black hole, shield bubble, sparkles, the slow-time hourglass, the autopilot chip.
  if (P.holeRim > 0.02) {
    const hx = P.holeDir > 0 ? 66 : -2;
    const r = 9 * P.holeRim;
    for (let k = 6; k > 0; k -= 1) {
      c.globalAlpha = 0.14 * P.holeRim; c.fillStyle = C.violet;
      c.beginPath(); c.arc(hx, 34, r + k * 2, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1; c.strokeStyle = C.violet; c.lineWidth = 2;
    c.beginPath(); c.arc(hx, 34, r + 1, t * 4, t * 4 + 4.4); c.stroke();
    c.fillStyle = '#000'; c.beginPath(); c.arc(hx, 34, r, 0, Math.PI * 2); c.fill();
  }
  if (P.shieldRim > 0.02) {
    const cx = 32;
    const cy = 64 - size / 2 - 1 + Math.round(P.bob);
    const r = 30 * P.scale;
    c.globalAlpha = 0.12 * P.shieldRim; c.fillStyle = C.glass;
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
    c.globalAlpha = clamp(P.shieldRim, 0, 1); c.strokeStyle = C.glass; c.lineWidth = 2;
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
    R(Math.round(cx - 20 * P.scale), Math.round(cy - 21 * P.scale), 2, 2, C.glassHi);
    R(Math.round(cx - 23 * P.scale), Math.round(cy - 17 * P.scale), 2, 2, C.glassHi);
    c.globalAlpha = 1;
  }
  if (P.alert > 0.3 && Math.sin(t * 18) > -0.3) {
    // A comet is coming: a blinking "!" on its side.
    const x = P.alertDir < 0 ? 4 : 57;
    R(x, 20, 3, 9, C.ink); R(x, 31, 3, 3, C.ink);
    R(x, 20, 2, 8, C.rose); R(x, 31, 2, 2, C.rose);
  }
  if (P.sparkle > 0.05) {
    [[6, 10, 0], [55, 14, 2.1], [52, 40, 4.2]].forEach(([x, y, ph]) => {
      const len = Math.round(P.sparkle * (0.55 + 0.45 * Math.sin(t * 9 + ph)) * 2.5);
      if (len < 1) return;
      R(x, y - len, 1, len * 2 + 1, C.gold); R(x - len, y, len * 2 + 1, 1, C.gold); R(x, y, 1, 1, C.white);
    });
  }
  if (P.desat > 0.05) {
    c.globalAlpha = clamp(P.desat, 0, 1);
    const hx = 52;
    const hy = 4;
    const k = Math.floor(((t * 0.5) % 1) * 2);
    R(hx, hy, 8, 1, C.gold); R(hx, hy + 11, 8, 1, C.gold);
    R(hx + 1, hy + 1 + k, 6, 2 - k, C.glass); R(hx + 2, hy + 3, 4, 2, C.glass); R(hx + 3, hy + 5, 2, 2, C.glass);
    R(hx + 2, hy + 7, 4, 2, C.navy); R(hx + 1, hy + 9, 6, 2, C.glass);
    R(hx + 3, hy + 7 + (Math.floor(t * 6) % 2), 2, 1, C.glassHi);
    c.globalAlpha = 1;
  }
  if (P.shades > 0.05) {
    const x = 51 + Math.round((1 - clamp(P.shades, 0, 1)) * 14);
    R(x, 3, 11, 11, C.mint); R(x + 1, 4, 9, 9, C.ink);
    R(x + 4, 5, 3, 1, C.mint); R(x + 3, 6, 1, 6, C.mint); R(x + 7, 6, 1, 6, C.mint); R(x + 4, 9, 3, 1, C.mint);
  }
}

export function createPilot(canvas) {
  const ctx = canvas.getContext('2d');
  const off = document.createElement('canvas');
  off.width = off.height = 32;
  const helmet = helmetLayer();
  let P;
  let t;
  let danger;
  let states;
  let event;
  let nextBlink;
  let blinkEnd;
  let nextGlance;
  let glance;
  let ringStart;
  let hitAt;
  let deadAt;

  function reset() {
    P = { ...BASE };
    t = 0; danger = 0; states = {}; event = null;
    nextBlink = 1.5; blinkEnd = 0; nextGlance = 1; glance = 0;
    ringStart = -9; hitAt = -9; deadAt = Infinity;
  }
  reset();

  // One-off reactions: nearMiss ({ dir }), capsule, shield, mini, shockwave, hit.
  function react(name, opts = {}) {
    const ev = EVENTS[name];
    if (event && event.until > t && event.prio > ev.prio) return;
    event = { name, until: t + ev.dur, prio: ev.prio, ...opts };
    if (name === 'shockwave') ringStart = t;
    if (name === 'hit') { hitAt = t; deadAt = t + HIT_TO_DEAD; }
  }

  // view: { danger, threat (-1..1, where the nearest rock is), shield, radar, slow, auto, mini,
  // god, comet, flareWarn, flare, hole (each 0 when off, or the side it is on: -1 left, 1 right) }
  function frame(dt, view) {
    t += dt;
    danger += (view.danger - danger) * (1 - Math.exp(-dt * 2));
    states = { ...view, dead: t >= deadAt };
    const T = { ...BASE };
    for (const k in FACES.tense) T[k] = BASE[k] + (FACES.tense[k] - BASE[k]) * danger;
    T.sweat = danger > 0.55 ? 1 : 0;

    // Idle life: glances, gaze and head turned toward the nearest threat.
    if (t > nextGlance) { glance = (Math.random() - 0.5) * 1.2; nextGlance = t + 1.2 + Math.random() * 2.5; }
    T.gazeX = clamp(view.threat * 1.1 + glance * (1 - danger * 0.6), -1, 1);
    T.gazeY = Math.sin(t * 0.9) * 0.3;
    T.yaw = view.threat * 0.2 + Math.sin(t * 0.55) * 0.05;

    for (const [name, over] of STATES) if (states[name]) Object.assign(T, over);
    if (states.radar && !states.dead) T.gazeX = Math.sin(t * 2.5); // scanning
    if (states.flareWarn) { T.flareDir = Math.sign(view.flareWarn); T.gazeX = T.flareDir; T.yaw = -T.flareDir * 0.12; }
    if (states.flare) { T.flareDir = Math.sign(view.flare); T.yaw = -T.flareDir * 0.22; }
    if (states.comet) { T.alertDir = Math.sign(view.comet); T.gazeX = T.alertDir; T.yaw = T.alertDir * 0.15; }
    if (states.hole) { T.holeDir = Math.sign(view.hole); T.gazeX = T.holeDir; T.yaw = T.holeDir * 0.25; }

    const ev = event && event.until > t ? event : null;
    if (ev && !states.dead) {
      Object.assign(T, FACES[ev.name]);
      if (ev.dir) { T.gazeX = ev.dir; T.yaw = ev.dir * 0.15; }
    }
    // Blinks, and panting when it gets dangerous.
    if (t > nextBlink) { blinkEnd = t + 0.13; nextBlink = t + 2 + Math.random() * 3.5; }
    if (t < blinkEnd && T.eyeOpen > 0.3 && T.shades < 0.5 && !states.dead) T.eyeOpen = 0;
    if (!ev && !states.dead && T.mouthOpen < 0.1) T.mouthOpen += danger * 0.18 * (1 + Math.sin(t * 7)) / 2;

    const k0 = 1 - Math.exp(-dt * 9);
    for (const k in T) {
      const rate = RATE[k] ? 1 - Math.exp(-dt * RATE[k]) : k0;
      P[k] += (T[k] - P[k]) * rate;
    }
    P.bob = Math.sin(t * (2 + danger * 2.5)) * (0.45 + danger * 0.3);
    const rp = (t - ringStart) / 0.9;
    P.ring = clamp(rp, 0, 1.2);
    P.ringA = rp >= 0 && rp < 1.2 ? 1 : 0;
    const hs = t - hitAt;
    P.shake = hs >= 0 && hs < 0.5 ? Math.sin(hs * 70) * 1.6 * (1 - hs / 0.5) : 0;
  }

  function draw() { render(ctx, off, helmet, P, t); }

  return { react, frame, draw, reset };
}
