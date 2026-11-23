// Asteroid Storm pixel art. Everything is drawn in code: the ship sprite, the procedural
// asteroids, the bitmap font, the nebula, the stars and the planets. No image files.

export const W = 360;
export const H = 240;

export const PAL = {
  space: '#090818',
  ink: '#0d0b1a',
  white: '#f2f0e6',
  pale: '#c9d3e6',
  steel: '#8a97b4',
  slate: '#525d80',
  navy: '#2b2f52',
  hull: '#e2553b',
  hullDark: '#9c2f2a',
  gold: '#ffd166',
  amber: '#ffad4a',
  glass: '#4fd8ec',
  glassHi: '#c8fbff',
  mint: '#5fe3a1',
  rose: '#ff5f7e',
  violet: '#8f6bff',
};

/* -----------------------------------------------------------
 * Seeded random numbers, so every load draws the same art.
 * ----------------------------------------------------------- */
export function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x, y) => BAYER4[(y & 3) * 4 + (x & 3)];

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/* -----------------------------------------------------------
 * Ship: each row gives the left half up to and including the
 * centre column; the right half is the mirror image.
 * ----------------------------------------------------------- */
const SHIP_HALF = [
  '...........k',
  '..........kw',
  '..........kp',
  '.........kwp',
  '.........kpC',
  '.........kcC',
  '........kpcC',
  '........kpcc',
  '........kpcc',
  '........kppp',
  '........kwpp',
  '.......kkwps',
  '......khkpss',
  '.....khhkpss',
  '....khhhkpsd',
  '...khhhhkwsd',
  '..khhhhhhkps',
  '.kghhhhhhkps',
  'kgghhHHHHkps',
  'kgkHHkkkkkps',
  'kkk.....kaks',
  '........kaak',
  '.........kkk',
];

const SHIP_COLORS = {
  k: PAL.ink, w: PAL.white, p: PAL.pale, s: PAL.steel, d: PAL.slate,
  h: PAL.hull, H: PAL.hullDark, g: PAL.gold, a: PAL.amber, c: PAL.glass, C: PAL.glassHi,
};

export const SHIP_W = SHIP_HALF[0].length * 2 - 1;
export const SHIP_H = SHIP_HALF.length;

export function buildShip() {
  const canvas = makeCanvas(SHIP_W, SHIP_H);
  const ctx = canvas.getContext('2d');
  const pixels = [];
  SHIP_HALF.forEach((half, y) => {
    const row = half + half.slice(0, -1).split('').reverse().join('');
    [...row].forEach((ch, x) => {
      const color = SHIP_COLORS[ch];
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
      pixels.push({ x, y, color });
    });
  });
  return { canvas, pixels };
}

/* -----------------------------------------------------------
 * Asteroids: a lumpy disc lit from the upper left, with craters,
 * dithered between four shades and outlined. Each rock is drawn
 * at FRAMES rotation angles so it spins without blurring.
 * ----------------------------------------------------------- */
export const ROCK_FRAMES = 24;

export const ROCK_PALETTES = [
  ['#2a2238', '#4a3d52', '#76636e', '#a8928a', '#d6c3a8'], // dusty rose
  ['#1f2433', '#3b4459', '#5f6d82', '#8f9fb0', '#c4d1d9'], // grey basalt
  ['#2b1d1a', '#55332a', '#86513a', '#b97c4c', '#e8b27a'], // rusty iron
  ['#14203a', '#27466b', '#4f86a8', '#8fc8de', '#e4f8ff'], // ice
  ['#1a0b0e', '#3d1616', '#6e2a1f', '#d9542b', '#ffc061'], // magma
];

const LIGHT = (() => {
  const v = [-0.55, -0.65, 0.52];
  const n = Math.hypot(...v);
  return v.map((c) => c / n);
})();

function rockShape(rng, radius) {
  const lobes = [];
  for (let k = 2; k <= 6; k += 1) {
    lobes.push({ k, amp: (0.05 + rng() * 0.07) / (k * 0.45), phase: rng() * Math.PI * 2 });
  }
  const craters = [];
  const count = Math.max(1, Math.round(radius / 5 + rng() * 2));
  for (let i = 0; i < count; i += 1) {
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng()) * radius * 0.6;
    craters.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, r: radius * (0.16 + rng() * 0.2) + 0.6 });
  }
  return { lobes, craters };
}

function edgeRadius(shape, radius, phi) {
  let f = 1;
  for (const l of shape.lobes) f += l.amp * Math.sin(l.k * phi + l.phase);
  return radius * f;
}

function drawRockFrame(radius, shape, palette, angle) {
  const size = Math.ceil(radius * 2.5) + 4;
  const half = size / 2;
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  const shades = palette.map(hexToRgb);
  const inside = new Uint8Array(size * size);
  const level = new Float32Array(size * size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const wx = x + 0.5 - half;
      const wy = y + 0.5 - half;
      const lx = wx * cos - wy * sin;
      const ly = wx * sin + wy * cos;
      const r = Math.hypot(lx, ly);
      const edge = edgeRadius(shape, radius, Math.atan2(ly, lx));
      if (r >= edge) continue;
      inside[y * size + x] = 1;
      const q = Math.min(r / edge, 0.999);
      const nz = Math.sqrt(1 - q * q);
      const nx = (wx / edge) * 0.9;
      const ny = (wy / edge) * 0.9;
      let b = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
      for (const c of shape.craters) {
        const dx = lx - c.x;
        const dy = ly - c.y;
        const d = Math.hypot(dx, dy);
        if (d < c.r) {
          // Rotate the crater offset back into screen space to light its walls.
          const sx = dx * cos + dy * sin;
          const sy = -dx * sin + dy * cos;
          const toward = -(sx * LIGHT[0] + sy * LIGHT[1]) / c.r;
          b = b - 0.28 - 0.3 * toward;
        } else if (d < c.r + 1.1) {
          b += 0.12;
        }
      }
      level[y * size + x] = b;
    }
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = y * size + x;
      if (!inside[i]) continue;
      const isEdge = x === 0 || y === 0 || x === size - 1 || y === size - 1
        || !inside[i - 1] || !inside[i + 1] || !inside[i - size] || !inside[i + size];
      let shade;
      if (isEdge) {
        shade = 0;
      } else {
        const t = Math.max(0, Math.min(0.999, (level[i] + 0.15) / 1.05));
        const scaled = t * 4;
        shade = 1 + Math.min(3, Math.floor(scaled) + (scaled % 1 > bayer(x, y) ? 1 : 0));
      }
      const [r, g, bl] = shades[Math.min(shade, 4)];
      img.data[i * 4] = r;
      img.data[i * 4 + 1] = g;
      img.data[i * 4 + 2] = bl;
      img.data[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// Diameters (in field pixels) the game picks from, spread evenly as the old game's rocks were.
export const ROCK_DIAMETERS = [10, 13, 16, 19, 22, 25, 28, 31, 34, 37];

// One set of rocks in one palette: for each diameter, two shapes, each drawn at every angle.
export function buildRockSet(paletteIndex) {
  const rng = makeRng(2026 + paletteIndex * 101);
  const palette = ROCK_PALETTES[paletteIndex];
  return ROCK_DIAMETERS.map((diameter) => {
    const radius = diameter / 2;
    return [0, 1].map(() => {
      const shape = rockShape(rng, radius);
      const frames = [];
      for (let f = 0; f < ROCK_FRAMES; f += 1) {
        frames.push(drawRockFrame(radius, shape, palette, (f / ROCK_FRAMES) * Math.PI * 2));
      }
      return { radius, frames };
    });
  });
}

/* -----------------------------------------------------------
 * Capsules: the pick-ups. A rounded pill with a letter.
 * ----------------------------------------------------------- */
export const CAPSULES = {
  shield: { letter: 'S', body: '#2aa7c9', light: '#9ff0ff', dark: '#11506a' },
  slow: { letter: 'T', body: '#3fbf7f', light: '#b6f5cf', dark: '#16573a' },
  mini: { letter: 'M', body: '#c46be0', light: '#f2c4ff', dark: '#5a2470' },
  wave: { letter: 'W', body: '#e8902a', light: '#ffe0a0', dark: '#7a4210' },
  radar: { letter: 'R', body: '#3a7be0', light: '#b8d4ff', dark: '#1b3a75' },
  boost: { letter: 'B', body: '#e0483e', light: '#ffb3a8', dark: '#6e1a16' },
};

const CAPSULE_ROWS = [
  '....kkkkkkkkkkk....',
  '..kkLLLLLLLLLLLkk..',
  '.kLLWWWLLLLLLLLLLk.',
  '.kLWBBBBBBBBBBBBBk.',
  'kLLBBBBBBBBBBBBBBDk',
  'kLBBBBBBBBBBBBBBBDk',
  'kLBBBBBBBBBBBBBBBDk',
  'kLBBBBBBBBBBBBBBBDk',
  'kBBBBBBBBBBBBBBBDDk',
  '.kBBBBBBBBBBBBBBDk.',
  '.kDBBBBBBBBBBBDDDk.',
  '..kkDDDDDDDDDDDkk..',
  '....kkkkkkkkkkk....',
];
const GLOW_PAD = 9;

// A capsule is three canvases: the pill, a dithered halo around it in its light color,
// and a white silhouette for the beacon flash.
export function buildCapsule(kind) {
  const c = CAPSULES[kind];
  const w = CAPSULE_ROWS[0].length;
  const h = CAPSULE_ROWS.length;
  const map = { k: PAL.ink, L: c.light, B: c.body, D: c.dark, W: PAL.white };

  const sprite = makeCanvas(w, h);
  const sctx = sprite.getContext('2d');
  const flash = makeCanvas(w, h);
  const fctx = flash.getContext('2d');
  fctx.fillStyle = PAL.white;
  CAPSULE_ROWS.forEach((row, y) => [...row].forEach((ch, x) => {
    if (!map[ch]) return;
    sctx.fillStyle = map[ch];
    sctx.fillRect(x, y, 1, 1);
    fctx.fillRect(x, y, 1, 1);
  }));
  drawText(sctx, c.letter, 7, 3, { color: PAL.white, shadow: c.dark });

  const gw = w + GLOW_PAD * 2;
  const gh = h + GLOW_PAD * 2;
  const glow = makeCanvas(gw, gh);
  const gctx = glow.getContext('2d');
  const [r, g, b] = hexToRgb(c.light);
  const img = gctx.createImageData(gw, gh);
  for (let y = 0; y < gh; y += 1) {
    for (let x = 0; x < gw; x += 1) {
      // Distance from the pill's rounded-rectangle outline, so the halo hugs its shape.
      const dx = Math.max(0, Math.abs(x + 0.5 - gw / 2) - (w / 2 - h / 2));
      const dy = Math.abs(y + 0.5 - gh / 2);
      const d = Math.hypot(dx, dy) - h / 2;
      const strength = 1 - d / (GLOW_PAD + 1);
      if (d < 0 || strength <= 0) continue;
      // Dithered fall-off: dense next to the pill, scattered at the edge.
      if (strength * strength < bayer(x, y)) continue;
      const i = (y * gw + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = Math.round(255 * (0.35 + 0.65 * strength));
    }
  }
  gctx.putImageData(img, 0, 0);
  return { sprite, glow, flash };
}

/* -----------------------------------------------------------
 * Bitmap font, 5 x 7.
 * ----------------------------------------------------------- */
const GLYPHS = {
  A: '01110 10001 10001 11111 10001 10001 10001',
  B: '11110 10001 10001 11110 10001 10001 11110',
  C: '01110 10001 10000 10000 10000 10001 01110',
  D: '11110 10001 10001 10001 10001 10001 11110',
  E: '11111 10000 10000 11110 10000 10000 11111',
  F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01111',
  H: '10001 10001 10001 11111 10001 10001 10001',
  I: '01110 00100 00100 00100 00100 00100 01110',
  J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 10100 11000 10100 10010 10001',
  L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001',
  N: '10001 10001 11001 10101 10011 10001 10001',
  O: '01110 10001 10001 10001 10001 10001 01110',
  P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10010 01101',
  R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110',
  T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110',
  V: '10001 10001 10001 10001 10001 01010 00100',
  W: '10001 10001 10001 10101 10101 10101 01010',
  X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100',
  Z: '11111 00001 00010 00100 01000 10000 11111',
  0: '01110 10001 10011 10101 11001 10001 01110',
  1: '00100 01100 00100 00100 00100 00100 01110',
  2: '01110 10001 00001 00010 00100 01000 11111',
  3: '11111 00010 00100 00010 00001 10001 01110',
  4: '00010 00110 01010 10010 11111 00010 00010',
  5: '11111 10000 11110 00001 00001 10001 01110',
  6: '00110 01000 10000 11110 10001 10001 01110',
  7: '11111 00001 00010 00100 01000 01000 01000',
  8: '01110 10001 10001 01110 10001 10001 01110',
  9: '01110 10001 10001 01111 00001 00010 01100',
  '.': '00000 00000 00000 00000 00000 01100 01100',
  ':': '00000 01100 01100 00000 01100 01100 00000',
  '!': '00100 00100 00100 00100 00100 00000 00100',
  '?': '01110 10001 00001 00010 00100 00000 00100',
  '-': '00000 00000 00000 11111 00000 00000 00000',
  '/': '00001 00001 00010 00100 01000 10000 10000',
  '+': '00000 00100 00100 11111 00100 00100 00000',
  "'": '00100 00100 01000 00000 00000 00000 00000',
  '>': '01000 00100 00010 00001 00010 00100 01000',
  '<': '00010 00100 01000 10000 01000 00100 00010',
  ' ': '00000 00000 00000 00000 00000 00000 00000',
  s: '00000 00000 01111 10000 01110 00001 11110', // lowercase, for the unit of time
};
const GLYPH_ROWS = Object.fromEntries(Object.entries(GLYPHS).map(([k, v]) => [k, v.split(' ')]));

const textCache = new Map();

export function textWidth(text, scale = 1) {
  return text.length ? (text.length * 6 - 1) * scale : 0;
}

// Renders text once to a small canvas (with a drop shadow) and reuses it.
function textSprite(text, color, scale, shadow) {
  const key = `${text}|${color}|${scale}|${shadow}`;
  let sprite = textCache.get(key);
  if (sprite) return sprite;
  if (textCache.size > 300) textCache.clear();
  const w = textWidth(text, scale) + scale;
  const h = 8 * scale;
  sprite = makeCanvas(Math.max(1, w), h);
  const ctx = sprite.getContext('2d');
  const paint = (fill, ox, oy) => {
    ctx.fillStyle = fill;
    [...text].forEach((ch, i) => {
      const rows = GLYPH_ROWS[ch] || GLYPH_ROWS[ch.toUpperCase()] || GLYPH_ROWS['?'];
      rows.forEach((row, y) => {
        for (let x = 0; x < 5; x += 1) {
          if (row[x] === '1') ctx.fillRect((i * 6 + x) * scale + ox, y * scale + oy, scale, scale);
        }
      });
    });
  };
  if (shadow) paint(shadow, scale, scale);
  paint(color, 0, 0);
  textCache.set(key, sprite);
  return sprite;
}

export function drawText(ctx, text, x, y, { color = PAL.white, scale = 1, align = 'left', shadow = PAL.ink } = {}) {
  const sprite = textSprite(String(text), color, scale, shadow);
  let left = x;
  if (align === 'center') left = x - Math.floor(textWidth(String(text), scale) / 2);
  else if (align === 'right') left = x - textWidth(String(text), scale);
  ctx.drawImage(sprite, Math.round(left), Math.round(y));
}

/* -----------------------------------------------------------
 * Background: a dithered nebula tile that wraps vertically,
 * three star layers and the odd passing planet.
 * ----------------------------------------------------------- */
export const NEBULA_H = 480;

function periodicNoise(rng, cellsX, cellsY) {
  const grid = Array.from({ length: cellsX * cellsY }, () => rng());
  const at = (i, j) => grid[((j % cellsY) + cellsY) % cellsY * cellsX + ((i % cellsX) + cellsX) % cellsX];
  const smooth = (t) => t * t * (3 - 2 * t);
  return (u, v) => {
    const x = u * cellsX;
    const y = v * cellsY;
    const i = Math.floor(x);
    const j = Math.floor(y);
    const fx = smooth(x - i);
    const fy = smooth(y - j);
    const top = at(i, j) + (at(i + 1, j) - at(i, j)) * fx;
    const bottom = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * fx;
    return top + (bottom - top) * fy;
  };
}

const NEBULA_RAMPS = [
  [['#141233', '#1f1747', '#2e1f5e', '#46277a'], ['#0e1a33', '#0f2a45', '#143d56', '#1d566a']],
  [['#1c1020', '#2c1626', '#41202c', '#5e2e30'], ['#121a26', '#1c2734', '#263646', '#34485a']],
  [['#0d1a30', '#12284a', '#1a3c66', '#285a88'], ['#0c2030', '#0f3040', '#164656', '#226470']],
  [['#1e0c1c', '#33102a', '#4f1636', '#701f3c'], ['#201010', '#3a1a12', '#552614', '#7a3818']],
  [['#16113a', '#24195a', '#38237a', '#552e9e'], ['#0b2032', '#0d3248', '#11495e', '#1a6676']],
];

export function buildNebula(stage = 0) {
  const rng = makeRng(77 + stage * 13);
  const octaves = [[3, 4, 0.55], [6, 8, 0.3], [12, 16, 0.15]].map(([cx, cy, w]) => ({ n: periodicNoise(rng, cx, cy), w }));
  const tint = periodicNoise(rng, 3, 4);
  const canvas = makeCanvas(W, NEBULA_H);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, NEBULA_H);
  const base = hexToRgb(PAL.space);
  const [purple, teal] = NEBULA_RAMPS[stage % NEBULA_RAMPS.length].map((ramp) => ramp.map(hexToRgb));
  for (let y = 0; y < NEBULA_H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const u = x / W;
      const v = y / NEBULA_H;
      let n = 0;
      for (const o of octaves) n += o.n(u, v) * o.w;
      // Fade to empty space towards the sides so the nebula reads as a band.
      const band = 1 - Math.abs(u - 0.5) * 0.9;
      const value = (n - 0.42) * 2.6 * band;
      const ramp = tint(u, v) > 0.5 ? purple : teal;
      const scaled = Math.max(0, Math.min(3.999, value * 4));
      const step = Math.floor(scaled) + (scaled % 1 > bayer(x, y) ? 1 : 0);
      const rgb = value <= 0 || step === 0 ? base : ramp[Math.min(step, 4) - 1];
      const i = (y * W + x) * 4;
      img.data[i] = rgb[0];
      img.data[i + 1] = rgb[1];
      img.data[i + 2] = rgb[2];
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export function buildStars() {
  const rng = makeRng(4242);
  const layers = [
    { count: 70, speed: 6, colors: ['#3b3f6b', '#4b4a7a'], size: 1 },
    { count: 40, speed: 14, colors: ['#7f86b8', '#a78fd6', '#86b8c9'], size: 1 },
    { count: 16, speed: 30, colors: [PAL.white, '#ffe9a8', '#bfefff'], size: 2 },
  ];
  return layers.map((layer) => ({
    speed: layer.speed,
    size: layer.size,
    stars: Array.from({ length: layer.count }, () => ({
      x: Math.floor(rng() * W),
      y: rng() * H,
      color: layer.colors[Math.floor(rng() * layer.colors.length)],
      twinkle: rng() * Math.PI * 2,
    })),
  }));
}

const PLANET_PALETTES = [
  ['#1c1433', '#3a2463', '#6b3d8f', '#a466b8', '#e0a6d6'],
  ['#0f1f2a', '#1d4250', '#2f7473', '#5fae94', '#b6e3b0'],
  ['#24140f', '#4f2a1b', '#8a4a26', '#c97f3c', '#f2c37a'],
];

export function buildPlanet(seed) {
  const rng = makeRng(seed);
  const radius = 14 + Math.floor(rng() * 16);
  const ringed = rng() < 0.45;
  const palette = PLANET_PALETTES[Math.floor(rng() * PLANET_PALETTES.length)].map(hexToRgb);
  const bandFreq = 0.35 + rng() * 0.5;
  const bandPhase = rng() * 10;
  const tilt = (rng() - 0.5) * 0.5;
  const pad = ringed ? Math.ceil(radius * 0.9) : 2;
  const size = radius * 2 + pad * 2;
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const c = size / 2;
  const put = (x, y, rgb) => {
    const i = (y * size + x) * 4;
    img.data[i] = rgb[0];
    img.data[i + 1] = rgb[1];
    img.data[i + 2] = rgb[2];
    img.data[i + 3] = 255;
  };
  const ringAt = (x, y) => {
    const dx = x + 0.5 - c;
    const dy = y + 0.5 - c;
    const rx = dx * Math.cos(tilt) + dy * Math.sin(tilt);
    const ry = (-dx * Math.sin(tilt) + dy * Math.cos(tilt)) * 3.2;
    const d = Math.hypot(rx, ry) / radius;
    return { hit: d > 1.25 && d < 1.75 && Math.abs(d - 1.5) < 0.25, front: ry > 0, d };
  };
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (x + 0.5 - c) / radius;
      const dy = (y + 0.5 - c) / radius;
      const q = dx * dx + dy * dy;
      const ring = ringed ? ringAt(x, y) : { hit: false };
      if (q < 1 && !(ring.hit && ring.front)) {
        const nz = Math.sqrt(1 - q);
        const light = dx * LIGHT[0] + dy * LIGHT[1] + nz * LIGHT[2];
        const band = Math.sin((dy * radius + dx * radius * tilt) * bandFreq + bandPhase) * 0.12;
        const t = Math.max(0, Math.min(0.999, light * 0.9 + 0.12 + band));
        const scaled = t * 4;
        const shade = Math.min(4, Math.floor(scaled) + (scaled % 1 > bayer(x, y) ? 1 : 0));
        put(x, y, palette[shade]);
      } else if (ring.hit) {
        const shade = ring.d < 1.42 ? 3 : ring.d < 1.58 ? 2 : 1;
        put(x, y, palette[shade]);
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// A small tile of stars for the page behind the game.
export function buildPageTile() {
  const rng = makeRng(99);
  const canvas = makeCanvas(96, 96);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#07061a';
  ctx.fillRect(0, 0, 96, 96);
  const colors = ['#24224a', '#2f2c5e', '#4a4685', '#6f6aa8'];
  for (let i = 0; i < 22; i += 1) {
    ctx.fillStyle = colors[Math.floor(rng() * colors.length)];
    ctx.fillRect(Math.floor(rng() * 96), Math.floor(rng() * 96), 1, 1);
  }
  ctx.fillStyle = '#8f8bd0';
  ctx.fillRect(40, 60, 1, 1);
  ctx.fillRect(39, 60, 1, 1); ctx.fillRect(41, 60, 1, 1); ctx.fillRect(40, 59, 1, 1); ctx.fillRect(40, 61, 1, 1);
  return canvas.toDataURL('image/png');
}
