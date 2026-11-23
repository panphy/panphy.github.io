// The page's title artwork: "ASTEROID STORM" in the game's pixel font with arcade-marquee
// shading, the player's ship flying in from the left and two asteroids on the right.
// Drawn in code like the rest of the game's art, and gently animated.
import { PAL, SHIP_W, SHIP_H, drawText, textWidth } from './art.js?v=20261123-pills';

const TITLE = 'ASTEROID STORM';
const SCALE = 2; // the 5 x 7 font at twice size: 10 x 14 px letters
const TW = 262; // artwork size in pixels, before the page scales it up
const TH = 30;

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

// The ship sprite turned to point right: (x, y) -> (H - 1 - y, x).
function buildShipRight(ship) {
  const c = document.createElement('canvas');
  c.width = SHIP_H;
  c.height = SHIP_W;
  const ctx = c.getContext('2d');
  for (const p of ship.pixels) {
    ctx.fillStyle = p.color;
    ctx.fillRect(SHIP_H - 1 - p.y, p.x, 1, 1);
  }
  return c;
}

export function mountTitle(canvas, { ship, rocks }) {
  canvas.width = TW;
  canvas.height = TH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const lettering = buildLettering();
  const shipArt = buildShipRight(ship);
  const big = rocks[4][1];
  const small = rocks[1][0];
  const stars = [[44, 4], [120, 2], [178, 27], [236, 3], [6, 24], [96, 28], [212, 25]];
  const shipX = 22;
  const shipY = Math.round((TH - SHIP_W) / 2);
  const textX = shipX + SHIP_H + 4;
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
    // Speed streaks and the engine flame trailing behind the ship.
    const cy = shipY + Math.floor(SHIP_W / 2);
    const flicker = Math.floor(t * 12) % 3;
    [[cy - 7, 10], [cy + 7, 12], [cy - 3, 6]].forEach(([y, len], i) => {
      const x0 = 2 + ((Math.floor(t * 40) + i * 7) % 6);
      ctx.fillStyle = i === 2 ? PAL.steel : PAL.slate;
      ctx.fillRect(x0, y, len, 1);
    });
    const flame = 6 + flicker * 2;
    ctx.fillStyle = PAL.hull;
    ctx.fillRect(shipX - flame + 2, cy - 2, flame, 5);
    ctx.fillStyle = PAL.amber;
    ctx.fillRect(shipX - flame + 4, cy - 1, flame - 2, 3);
    ctx.fillStyle = PAL.gold;
    ctx.fillRect(shipX - flame + 6, cy, flame - 4, 1);
    ctx.drawImage(shipArt, shipX, shipY);
    ctx.drawImage(lettering, textX, textY);
    // Two asteroids tumbling slowly on the right.
    const frameAt = (set, speed) => set.frames[Math.floor(t * speed) % set.frames.length];
    const a = frameAt(big, 3);
    ctx.drawImage(a, TW - a.width + 2, Math.round((TH - a.height) / 2));
    const b = frameAt(small, 5);
    ctx.drawImage(b, TW - 44, 0);
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
