// Asteroid Storm: survive as long as you can in a field of asteroids. No shooting: every
// threat is dodged. The field is 360 x 240 pixels, scaled up with nearest-neighbour sampling.
import {
  W, H, PAL, NEBULA_H, ROCK_DIAMETERS, ROCK_FRAMES, ROCK_PALETTES, SHIP_W, SHIP_H, CAPSULES,
  buildShip, buildRockSet, buildNebula, buildStars, buildPlanet, buildPageTile, buildCapsule, drawText, textWidth, makeRng,
} from './art.js';
import { createAudio } from './audio.js';
import { createLeaderboard, formatTime } from './leaderboard.js';

/* -----------------------------------------------------------
 * Difficulty. The asteroid curve carries over the previous
 * version's exactly (its 600 x 400 field scaled by 0.6, at
 * 60 fps), so a strong human still lasts roughly 30 to 60 s.
 * Rocks there flew in random directions and half left the
 * screen at once; here every rock heads inwards and half as
 * many spawn, which is the same field. Stage hazards add a
 * little pressure and the capsules give a little back.
 * ----------------------------------------------------------- */
const SHIP_RADIUS = 9;
const MIN_SPEED = 72; // px/s at the start
const MAX_SPEED = 252;
const MIN_SPEED_GROWTH = 2.057; // px/s gained per second survived
const MAX_SPEED_GROWTH = 4.114;
const SPAWN_RATE = 0.6; // rocks per second at the start
const SPAWN_GROWTH = 0.36; // extra rocks per second, per second survived
const SPAWN_MARGIN = 24;
const REMOVE_MARGIN = 60;
const MAX_SPIN = 1.5; // rad/s
const HITBOX = 0.95; // share of a rock's nominal radius that collides
// The world always advances in fixed 1/120 s steps, whatever the display's frame rate, so
// speeds, collisions and the clock are the same on every device. A slow frame runs several
// steps; only a stall longer than MAX_CATCH_UP slows the game rather than jumping it.
const STEP = 1 / 120;
const MAX_CATCH_UP = 0.25; // s of game time run in one display frame at most
const KEY_SPEED = 300; // px/s for keyboard movement, close to a quick drag
const NEAR_MISS_GAP = 6;
const STAGE_SECONDS = 15;
const INTRO_SECONDS = 2.8;

const COMET_WARNING = 0.9; // s of warning before a comet enters
const COMET_SPEED = 300;
const COMET_RADIUS = 3;
const SPLIT_MIN_DIAMETER = 31;
const WELL_CORE = 6;
const WELL_REACH = 110;
const WELL_PULL = 62; // px/s drift towards the well at its core
const WELL_SPEED = 16;

const CAPSULE_FIRST = 7;
const CAPSULE_GAP = [10, 14];
const SLOW_SECONDS = 4;
const SLOW_SCALE = 0.5;
const MINI_SECONDS = 7;
const MINI_SCALE = 0.55;
const SHIELD_GRACE = 1.2;

const BEST_KEY = 'dodgeBestV2';

// Each stage: its name, the rock palettes it uses, and how often each hazard appears
// (comets and wells: seconds between them; splitters: share of big rocks that split).
const STAGES = [
  { name: 'DUST BELT', palettes: [0, 1], nebula: 0, comet: 0, split: 0, well: 0 },
  { name: 'IRON BELT', palettes: [2, 1], nebula: 1, comet: 4.5, split: 0, well: 0 },
  { name: 'ICE FIELD', palettes: [3], nebula: 2, comet: 4, split: 0.3, well: 0 },
  { name: 'MAGMA RIFT', palettes: [4, 2], nebula: 3, comet: 3.6, split: 0.35, well: 13 },
  { name: 'DEEP STORM', palettes: [0, 1, 2, 3, 4], nebula: 4, comet: 3, split: 0.4, well: 10 },
];

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = W;
canvas.height = H;
ctx.imageSmoothingEnabled = false;

const pauseButton = document.getElementById('pauseButton');
const soundButton = document.getElementById('soundButton');
const modal = document.getElementById('initialsModal');
const modalForm = document.getElementById('initialsForm');
const modalScore = document.getElementById('modalScore');
const initialsInput = document.getElementById('initialsInput');
const initialsError = document.getElementById('initialsError');
const submitButton = document.getElementById('submitInitials');
const skipButton = document.getElementById('skipInitials');

const audio = createAudio();
const board = createLeaderboard({
  list: document.getElementById('scoreList'),
  status: document.getElementById('boardStatus'),
});

document.body.style.backgroundImage = `url('${buildPageTile()}')`;

/* -----------------------------------------------------------
 * Art, built in code. Later stages' rocks and nebulae are
 * drawn in idle moments so loading stays quick.
 * ----------------------------------------------------------- */
const ship = buildShip();
const starLayers = buildStars();
const capsuleSprites = Object.fromEntries(Object.keys(CAPSULES).map((k) => [k, buildCapsule(k)]));
const rockSets = [];
const nebulae = [];
const rng = Math.random;

function rockSet(i) {
  if (!rockSets[i]) rockSets[i] = buildRockSet(i);
  return rockSets[i];
}
function nebulaFor(i) {
  if (!nebulae[i]) nebulae[i] = buildNebula(i);
  return nebulae[i];
}
rockSet(0);
rockSet(1);
nebulaFor(0);

const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 60));
const pendingArt = [
  () => rockSet(2), () => nebulaFor(1), () => rockSet(3), () => nebulaFor(2),
  () => rockSet(4), () => nebulaFor(3), () => nebulaFor(4),
];
(function buildLater() {
  const job = pendingArt.shift();
  if (!job) return;
  idle(() => { job(); buildLater(); });
}());

/* -----------------------------------------------------------
 * State
 * ----------------------------------------------------------- */
const freshShip = () => ({ x: W / 2, y: H * 0.62, tilt: 0, moveX: 0, alive: true, shield: false, grace: 0 });

const state = {
  mode: 'title', // title | intro | playing | paused | over
  pausedFrom: 'playing',
  time: 0,
  stage: 0,
  rocks: [],
  wells: [],
  warnings: [],
  capsules: [],
  particles: [],
  popups: [],
  spawnBudget: 0,
  cometTimer: 0,
  wellTimer: 0,
  capsuleTimer: CAPSULE_FIRST,
  slow: 0,
  mini: 0,
  ship: freshShip(),
  shake: 0,
  flash: 0,
  warp: 0,
  introT: 0,
  banner: null,
  nebula: 0,
  nebulaFrom: 0,
  nebulaFade: 1,
  nearMisses: 0,
  pickups: 0,
  best: 0,
  newBest: false,
  overAt: 0,
  scroll: 0,
  planet: null,
  planetSeed: 1,
  clock: 0,
};

try { state.best = Number(localStorage.getItem(BEST_KEY)) || 0; } catch {}

const keys = new Set();
const drag = { id: null, startX: 0, startY: 0, shipX: 0, shipY: 0 };

const stageAt = (t) => Math.min(STAGES.length - 1, Math.floor(t / STAGE_SECONDS));
const pick = (list) => list[Math.floor(rng() * list.length)];

/* -----------------------------------------------------------
 * Spawning
 * ----------------------------------------------------------- */
// A point just outside a random edge, and a heading anywhere in the half-plane facing in.
function edgeEntry(margin) {
  const edge = Math.floor(rng() * 4);
  const spread = rng() * Math.PI;
  if (edge === 0) return { x: rng() * W, y: -margin, angle: spread };
  if (edge === 1) return { x: rng() * W, y: H + margin, angle: -spread };
  if (edge === 2) return { x: -margin, y: rng() * H, angle: spread - Math.PI / 2 };
  return { x: W + margin, y: rng() * H, angle: spread + Math.PI / 2 };
}

function rockSprite(paletteIndex, sizeIndex) {
  const set = rockSets[paletteIndex] || rockSets[0];
  return pick(set[sizeIndex]);
}

function spawnRock(t, { attract = false } = {}) {
  const stage = STAGES[attract ? 0 : stageAt(t)];
  const palette = pick(stage.palettes);
  const sizeIndex = Math.floor(rng() * ROCK_DIAMETERS.length);
  const sprite = rockSprite(palette, sizeIndex);
  const minSpeed = attract ? 20 : MIN_SPEED + MIN_SPEED_GROWTH * t;
  const maxSpeed = attract ? 55 : MAX_SPEED + MAX_SPEED_GROWTH * t;
  const speed = minSpeed + rng() * (maxSpeed - minSpeed);
  const { x, y, angle } = edgeEntry(Math.max(SPAWN_MARGIN, sprite.radius + 2));
  const splits = !attract && ROCK_DIAMETERS[sizeIndex] >= SPLIT_MIN_DIAMETER && rng() < stage.split;
  state.rocks.push({
    kind: splits ? 'splitter' : 'rock',
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle: rng() * Math.PI * 2,
    spin: (rng() - 0.5) * 2 * MAX_SPIN,
    sprite,
    palette,
    radius: sprite.radius,
    splitIn: splits ? 0.7 + rng() * 0.7 : 0,
    seen: false,
    near: false,
    nearDone: false,
  });
}

// Comets are telegraphed: a marker blinks where one will enter, aimed at where the ship was.
function warnComet(t) {
  const s = state.ship;
  const { x, y } = edgeEntry(4);
  const ex = Math.max(6, Math.min(W - 6, x));
  const ey = Math.max(6, Math.min(H - 6, y));
  const d = Math.hypot(s.x - x, s.y - y) || 1;
  const speed = COMET_SPEED + MAX_SPEED_GROWTH * t;
  state.warnings.push({ x, y, ex, ey, vx: ((s.x - x) / d) * speed, vy: ((s.y - y) / d) * speed, timer: COMET_WARNING });
  audio.sfx('warn');
}

function launchComet(w) {
  state.rocks.push({
    kind: 'comet', x: w.x, y: w.y, vx: w.vx, vy: w.vy, angle: 0, spin: 0,
    radius: COMET_RADIUS / HITBOX, near: false, nearDone: false, seen: true,
  });
}

function spawnWell() {
  const fromLeft = rng() < 0.5;
  const y = 40 + rng() * (H - 80);
  state.wells.push({
    x: fromLeft ? -30 : W + 30, y,
    vx: (fromLeft ? 1 : -1) * WELL_SPEED, vy: (rng() - 0.5) * 8,
    spin: 0,
  });
  audio.sfx('warn');
}

function spawnCapsule() {
  const kinds = Object.keys(CAPSULES).filter((k) => !(k === 'shield' && state.ship.shield));
  const kind = pick(kinds);
  const fromLeft = rng() < 0.5;
  state.capsules.push({
    kind, x: fromLeft ? -14 : W + 14, y: 30 + rng() * (H - 60), baseY: 0,
    vx: (fromLeft ? 1 : -1) * (30 + rng() * 12), bob: rng() * Math.PI * 2,
  });
  state.capsules[state.capsules.length - 1].baseY = state.capsules[state.capsules.length - 1].y;
}

/* -----------------------------------------------------------
 * Updating the world
 * ----------------------------------------------------------- */
function hitRadius() {
  return SHIP_RADIUS * (state.mini > 0 ? MINI_SCALE : 1);
}

function wellPull(x, y, strength) {
  let px = 0;
  let py = 0;
  for (const w of state.wells) {
    const dx = w.x - x;
    const dy = w.y - y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > WELL_REACH) continue;
    const f = strength * (1 - d / WELL_REACH) ** 1.5;
    px += (dx / d) * f;
    py += (dy / d) * f;
  }
  return [px, py];
}

function updateRocks(dt, { collide }) {
  const s = state.ship;
  const reachShip = hitRadius();
  const spawned = [];
  for (let i = state.rocks.length - 1; i >= 0; i -= 1) {
    const r = state.rocks[i];
    if (state.wells.length && r.kind !== 'comet') {
      const [ax, ay] = wellPull(r.x, r.y, 260);
      r.vx += ax * dt;
      r.vy += ay * dt;
    }
    r.x += r.vx * dt;
    r.y += r.vy * dt;
    r.angle += r.spin * dt;
    if (r.kind === 'comet' && rng() < dt * 90) {
      addParticle({ x: r.x, y: r.y, vx: -r.vx * 0.05 + (rng() - 0.5) * 20, vy: -r.vy * 0.05 + (rng() - 0.5) * 20, life: 0.35, max: 0.35, color: pick([PAL.glassHi, PAL.glass, PAL.white]), size: 1 });
    }
    if (!r.seen && r.x > 0 && r.x < W && r.y > 0 && r.y < H) r.seen = true;
    if (r.kind === 'splitter' && r.seen) {
      r.splitIn -= dt;
      if (r.splitIn <= 0) {
        state.rocks.splice(i, 1);
        split(r, spawned);
        continue;
      }
    }
    let swallowed = false;
    for (const w of state.wells) {
      if (r.kind !== 'comet' && Math.hypot(w.x - r.x, w.y - r.y) < WELL_CORE + 2) swallowed = true;
    }
    if (swallowed) {
      state.rocks.splice(i, 1);
      burst(r.x, r.y, 6, [PAL.violet, PAL.rose], 30);
      continue;
    }
    if (collide && s.alive) {
      const d = Math.hypot(r.x - s.x, r.y - s.y);
      const reach = reachShip + r.radius * HITBOX;
      if (d < reach && s.grace <= 0) {
        if (s.shield) {
          shieldBreak(r);
          state.rocks.splice(i, 1);
          continue;
        }
        crash(r);
      } else if (d < reach + NEAR_MISS_GAP) {
        r.near = true;
      } else if (r.near && !r.nearDone && d > reach + NEAR_MISS_GAP * 2) {
        r.nearDone = true;
        nearMiss(r);
      }
    }
    if (r.x < -REMOVE_MARGIN - r.radius || r.x > W + REMOVE_MARGIN + r.radius
      || r.y < -REMOVE_MARGIN - r.radius || r.y > H + REMOVE_MARGIN + r.radius) {
      state.rocks.splice(i, 1);
    }
  }
  state.rocks.push(...spawned);
}

function split(r, out) {
  const pieces = 3;
  const base = rng() * Math.PI * 2;
  for (let k = 0; k < pieces; k += 1) {
    const sizeIndex = 1 + Math.floor(rng() * 3);
    const sprite = rockSprite(r.palette, sizeIndex);
    const a = base + (k / pieces) * Math.PI * 2;
    const kick = 55 + rng() * 25;
    out.push({
      kind: 'rock', x: r.x + Math.cos(a) * 4, y: r.y + Math.sin(a) * 4,
      vx: r.vx * 0.7 + Math.cos(a) * kick, vy: r.vy * 0.7 + Math.sin(a) * kick,
      angle: rng() * Math.PI * 2, spin: (rng() - 0.5) * 2 * MAX_SPIN * 1.5,
      sprite, palette: r.palette, radius: sprite.radius, seen: true, near: false, nearDone: false,
    });
  }
  const colors = ROCK_PALETTES[r.palette].slice(2);
  burst(r.x, r.y, 26, colors, 90);
  audio.sfx('split');
}

function updateWells(dt, collide) {
  const s = state.ship;
  for (let i = state.wells.length - 1; i >= 0; i -= 1) {
    const w = state.wells[i];
    w.x += w.vx * dt;
    w.y += w.vy * dt;
    w.spin += dt * 3;
    if (rng() < dt * 30) {
      const a = rng() * Math.PI * 2;
      const d = 24 + rng() * 20;
      addParticle({ x: w.x + Math.cos(a) * d, y: w.y + Math.sin(a) * d, vx: -Math.cos(a) * 30 - Math.sin(a) * 25, vy: -Math.sin(a) * 30 + Math.cos(a) * 25, life: 0.7, max: 0.7, color: pick([PAL.violet, PAL.rose, '#5b3fb0']), size: 1 });
    }
    if (collide && s.alive && s.grace <= 0 && Math.hypot(w.x - s.x, w.y - s.y) < WELL_CORE + hitRadius() * 0.6) {
      if (s.shield) {
        // A shield is spent getting thrown clear of the core.
        s.shield = false;
        s.grace = SHIELD_GRACE;
        const d = Math.hypot(s.x - w.x, s.y - w.y) || 1;
        moveShipBy(((s.x - w.x) / d) * 30, ((s.y - w.y) / d) * 30);
        popup('SHIELD LOST', s.x, s.y - 14, PAL.glass);
        audio.sfx('shield');
      } else {
        crash({ vx: 0, vy: 0 });
      }
    }
    if (w.x < -60 || w.x > W + 60) state.wells.splice(i, 1);
  }
  if (collide && s.alive && state.wells.length) {
    const [px, py] = wellPull(s.x, s.y, WELL_PULL);
    moveShipBy(px * dt, py * dt);
  }
}

function updateWarnings(dt) {
  for (let i = state.warnings.length - 1; i >= 0; i -= 1) {
    const w = state.warnings[i];
    w.timer -= dt;
    if (w.timer <= 0) {
      state.warnings.splice(i, 1);
      launchComet(w);
      audio.sfx('comet');
    }
  }
}

function updateCapsules(dt, collect) {
  const s = state.ship;
  for (let i = state.capsules.length - 1; i >= 0; i -= 1) {
    const c = state.capsules[i];
    c.x += c.vx * dt;
    c.bob += dt * 3;
    c.y = c.baseY + Math.sin(c.bob) * 8;
    if (collect && s.alive && Math.hypot(c.x - s.x, c.y - s.y) < SHIP_RADIUS + 10) {
      state.capsules.splice(i, 1);
      applyCapsule(c.kind);
      continue;
    }
    if (c.x < -30 || c.x > W + 30) state.capsules.splice(i, 1);
  }
}

function applyCapsule(kind) {
  const s = state.ship;
  state.pickups += 1;
  const label = { shield: 'SHIELD', slow: 'SLOW TIME', mini: 'MINI SHIP' }[kind];
  if (kind === 'shield') s.shield = true;
  if (kind === 'slow') state.slow = SLOW_SECONDS;
  if (kind === 'mini') state.mini = MINI_SECONDS;
  popup(label, s.x, s.y - 16, CAPSULES[kind].light);
  burst(s.x, s.y, 14, [CAPSULES[kind].light, CAPSULES[kind].body, PAL.white], 60);
  audio.sfx('power');
}

/* -----------------------------------------------------------
 * Particles and pop-ups
 * ----------------------------------------------------------- */
function addParticle(p) {
  if (state.particles.length < 700) state.particles.push(p);
}

function burst(x, y, count, colors, speed) {
  for (let i = 0; i < count; i += 1) {
    const a = rng() * Math.PI * 2;
    const v = speed * (0.3 + rng() * 0.7);
    addParticle({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.25 + rng() * 0.4, max: 0.65, color: pick(colors), size: rng() < 0.25 ? 2 : 1, drag: 3 });
  }
}

function popup(text, x, y, color) {
  const half = textWidth(text) / 2 + 2;
  state.popups.push({ text, x: Math.max(half, Math.min(W - half, x)), y: Math.max(4, y), life: 0.9, color });
}

function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.life -= dt;
    if (p.life <= 0) { state.particles.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.drag) {
      p.vx *= Math.max(0, 1 - p.drag * dt);
      p.vy *= Math.max(0, 1 - p.drag * dt);
    }
  }
  for (let i = state.popups.length - 1; i >= 0; i -= 1) {
    const p = state.popups[i];
    p.life -= dt;
    p.y -= dt * 14;
    if (p.life <= 0) state.popups.splice(i, 1);
  }
}

function exhaust(dt, strength = 1) {
  const s = state.ship;
  if (!s.alive || rng() > dt * 40 * strength) return;
  const scale = state.mini > 0 ? MINI_SCALE : 1;
  addParticle({
    x: s.x + (rng() - 0.5) * 3 * scale,
    y: s.y + (SHIP_H / 2 - 1) * scale,
    vx: (rng() - 0.5) * 12,
    vy: (50 + rng() * 40) * strength,
    life: 0.18 + rng() * 0.15,
    max: 0.3,
    color: pick([PAL.gold, PAL.amber, PAL.hull]),
    size: strength > 1.5 && rng() < 0.4 ? 2 : 1,
  });
}

function nearMiss(rock) {
  state.nearMisses += 1;
  const s = state.ship;
  burst((rock.x + s.x) / 2, (rock.y + s.y) / 2, 6, [PAL.glassHi], 40);
  popup('CLOSE!', s.x, s.y - 16, PAL.glassHi);
  audio.sfx('near');
}

function shieldBreak(rock) {
  const s = state.ship;
  s.shield = false;
  s.grace = SHIELD_GRACE;
  state.shake = 0.2;
  burst(rock.x, rock.y, 24, [PAL.glassHi, PAL.glass, PAL.white], 110);
  popup('SHIELD LOST', s.x, s.y - 16, PAL.glass);
  audio.sfx('shield');
}

function crash(rock) {
  const s = state.ship;
  s.alive = false;
  state.shake = 0.5;
  state.flash = 0.25;
  state.slow = 0;
  const scale = state.mini > 0 ? MINI_SCALE : 1;
  const left = s.x - (SHIP_W / 2) * scale;
  const top = s.y - (SHIP_H / 2) * scale;
  for (const px of ship.pixels) {
    const x = left + px.x * scale;
    const y = top + px.y * scale;
    const dx = x - s.x;
    const dy = y - s.y;
    const d = Math.hypot(dx, dy) || 1;
    const speed = 30 + rng() * 90;
    addParticle({
      x, y, vx: (dx / d) * speed + rock.vx * 0.2, vy: (dy / d) * speed + rock.vy * 0.2,
      life: 0.6 + rng() * 0.9, max: 1.5, color: px.color, size: 1, drag: 1.5,
    });
  }
  burst(s.x, s.y, 70, [PAL.white, PAL.gold, PAL.amber, PAL.hull, PAL.rose], 140);
  state.mini = 0;
  audio.stopMusic();
  audio.sfx('crash');
  audio.sfx('over');
  endRun();
}

/* -----------------------------------------------------------
 * Run lifecycle
 * ----------------------------------------------------------- */
function resetWorld() {
  state.time = 0;
  state.stage = 0;
  state.rocks = [];
  state.wells = [];
  state.warnings = [];
  state.capsules = [];
  state.particles = [];
  state.popups = [];
  state.spawnBudget = 0;
  state.cometTimer = 0;
  state.wellTimer = 0;
  state.capsuleTimer = CAPSULE_FIRST;
  state.slow = 0;
  state.mini = 0;
  state.ship = freshShip();
  state.nearMisses = 0;
  state.pickups = 0;
  state.newBest = false;
  state.shake = 0;
  state.flash = 0;
  state.banner = null;
  setNebula(0);
  drag.id = null;
}

// The launch sequence: letterbox, warp, the ship flies in, READY, GO.
function startIntro() {
  closeModal();
  // Rocks left from the title screen are swept away by the warp rather than vanishing.
  const leftover = state.rocks.filter((r) => r.kind === 'rock');
  resetWorld();
  state.rocks = leftover;
  state.mode = 'intro';
  state.introT = 0;
  state.ship.y = H + 30;
  audio.unlock();
  audio.setIntensity(1);
  audio.sfx('warp');
  updateButtons();
}

function startPlay() {
  state.mode = 'playing';
  state.rocks = [];
  state.particles = state.particles.filter((p) => !p.streak);
  state.ship.y = H * 0.62;
  state.warp = Math.min(state.warp, 0.4);
  state.banner = null;
  audio.sfx('go');
  if (!audio.isMuted()) audio.startMusic();
  updateButtons();
}

function endRun() {
  state.mode = 'over';
  state.overAt = state.clock;
  // The run counts in whole hundredths, so the screen, the best and the board agree.
  state.time = Math.floor(state.time * 100) / 100;
  const score = board.sanitize(state.time);
  if (score !== null && score > state.best) {
    state.best = score;
    state.newBest = true;
    try { localStorage.setItem(BEST_KEY, String(score)); } catch {}
  }
  updateButtons();
  if (score !== null && board.qualifies(score)) {
    setTimeout(() => { if (state.mode === 'over') openModal(score); }, 1400);
  }
}

function pause() {
  if (state.mode !== 'playing' && state.mode !== 'intro') return;
  state.pausedFrom = state.mode;
  state.mode = 'paused';
  drag.id = null;
  keys.clear();
  audio.stopMusic();
  updateButtons();
}

function resume() {
  if (state.mode !== 'paused') return;
  state.mode = state.pausedFrom;
  lastFrame = 0;
  if (state.mode === 'playing' && !audio.isMuted()) audio.startMusic();
  updateButtons();
}

function canRestart() {
  return state.mode === 'over' && state.clock - state.overAt > 1 && !modal.open;
}

// The one action behind a tap, Enter or Space.
function primaryAction() {
  if (state.mode === 'title') startIntro();
  else if (state.mode === 'intro') { if (state.introT > 0.3) startPlay(); }
  else if (state.mode === 'paused') resume();
  else if (canRestart()) startIntro();
}

function setNebula(i) {
  if (i === state.nebula) return;
  state.nebulaFrom = state.nebula;
  state.nebula = i;
  state.nebulaFade = 0;
}

/* -----------------------------------------------------------
 * Main update
 * ----------------------------------------------------------- */
function update(dt) {
  state.clock += dt;
  state.shake = Math.max(0, state.shake - dt);
  state.flash = Math.max(0, state.flash - dt);
  state.nebulaFade = Math.min(1, state.nebulaFade + dt / 1.5);
  if (state.banner) {
    state.banner.t += dt;
    if (state.banner.t > 2.4) state.banner = null;
  }

  if (state.mode === 'paused') return;

  // Slow time slows everything except the ship, the clock included.
  if (state.slow > 0) state.slow = Math.max(0, state.slow - dt);
  const world = dt * (state.slow > 0 ? SLOW_SCALE : 1);
  if (state.mini > 0) state.mini = Math.max(0, state.mini - world);
  state.ship.grace = Math.max(0, state.ship.grace - dt);

  if (state.mode === 'intro') updateIntro(dt);
  else state.warp = Math.max(0, state.warp - dt * 0.8);

  const pace = (state.mode === 'playing' ? 1 + state.time / 40 : 1) * (1 + state.warp * 9);
  state.scroll = (state.scroll + world * 10 * pace) % NEBULA_H;
  for (const layer of starLayers) {
    for (const star of layer.stars) {
      star.y += layer.speed * pace * world;
      if (star.y >= H) { star.y -= H; star.x = Math.floor(rng() * W); }
    }
  }
  updatePlanet(world * pace);

  if (state.mode === 'playing') {
    state.time += world;
    const stage = stageAt(state.time);
    if (stage !== state.stage) enterStage(stage);
    const def = STAGES[state.stage];
    moveShipWithKeys(dt);
    state.spawnBudget += (SPAWN_RATE + SPAWN_GROWTH * state.time) * world;
    while (state.spawnBudget >= 1) {
      state.spawnBudget -= 1;
      spawnRock(state.time);
    }
    if (def.comet) {
      state.cometTimer -= world;
      if (state.cometTimer <= 0) {
        warnComet(state.time);
        state.cometTimer = def.comet * (0.7 + rng() * 0.6);
      }
    }
    if (def.well) {
      state.wellTimer -= world;
      if (state.wellTimer <= 0) {
        spawnWell();
        state.wellTimer = def.well * (0.8 + rng() * 0.4);
      }
    }
    state.capsuleTimer -= world;
    if (state.capsuleTimer <= 0) {
      spawnCapsule();
      state.capsuleTimer = CAPSULE_GAP[0] + rng() * (CAPSULE_GAP[1] - CAPSULE_GAP[0]);
    }
    exhaust(dt);
    updateWarnings(world);
    updateWells(world, true);
    updateRocks(world, { collide: true });
    updateCapsules(world, true);
  } else {
    // Title and game-over screens keep a slow, harmless drift of rocks.
    if (state.mode === 'title') {
      state.spawnBudget += 1.6 * dt;
      while (state.spawnBudget >= 1) { state.spawnBudget -= 1; spawnRock(0, { attract: true }); }
    }
    if (state.mode === 'intro') {
      for (const r of state.rocks) r.vy += 700 * dt;
    }
    updateWells(world, false);
    updateRocks(world, { collide: false });
    updateCapsules(world, false);
  }
  state.ship.tilt += (state.ship.moveX - state.ship.tilt) * Math.min(1, dt * 12);
  state.ship.moveX = 0;
  updateParticles(world);
}

const easeOutBack = (p) => 1 + 2.2 * (p - 1) ** 3 + 1.2 * (p - 1) ** 2;

function updateIntro(dt) {
  state.introT += dt;
  const t = state.introT;
  // Warp builds quickly, holds while the ship arrives, then winds down for GO.
  state.warp = t < 0.4 ? t / 0.4 : t < 1.6 ? 1 : Math.max(0.15, 1 - (t - 1.6) / 1.1);
  const p = Math.max(0, Math.min(1, (t - 0.35) / 1.15));
  state.ship.y = H + 30 + (H * 0.62 - H - 30) * easeOutBack(p);
  state.ship.x = W / 2 + Math.sin(t * 2.4) * 6 * (1 - p);
  exhaust(dt, 2.5 - p);
  if (t > 0.35 && t < 1.5 && rng() < dt * 60) {
    // Speed lines rushing past the ship.
    addParticle({ x: rng() * W, y: -4, vx: 0, vy: 520, life: 0.5, max: 0.5, color: pick(['#6f6aa8', '#a4b6ff', PAL.white]), size: 1, streak: true });
  }
  if (t >= INTRO_SECONDS) startPlay();
}

function enterStage(stage) {
  state.stage = stage;
  state.banner = { title: `STAGE ${stage + 1}`, name: STAGES[stage].name, t: 0 };
  state.warp = Math.max(state.warp, 0.6);
  setNebula(STAGES[stage].nebula);
  audio.setIntensity(stage + 1);
  audio.sfx('stage');
}

function moveShipWithKeys(dt) {
  let dx = 0;
  let dy = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) dx -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) dx += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) dy -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) dy += 1;
  if (!dx && !dy) return;
  const len = Math.hypot(dx, dy);
  const slow = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 0.5 : 1;
  moveShipTo(state.ship.x + (dx / len) * KEY_SPEED * slow * dt, state.ship.y + (dy / len) * KEY_SPEED * slow * dt);
}

function moveShipTo(x, y) {
  const s = state.ship;
  const nx = Math.max(SHIP_RADIUS, Math.min(W - SHIP_RADIUS, x));
  const ny = Math.max(SHIP_RADIUS, Math.min(H - SHIP_RADIUS, y));
  s.moveX = Math.max(-1, Math.min(1, (nx - s.x) * 0.5));
  s.x = nx;
  s.y = ny;
}

// Moves the ship without the player, keeping a drag in progress anchored correctly.
function moveShipBy(dx, dy) {
  const s = state.ship;
  const ox = s.x;
  const oy = s.y;
  s.x = Math.max(SHIP_RADIUS, Math.min(W - SHIP_RADIUS, s.x + dx));
  s.y = Math.max(SHIP_RADIUS, Math.min(H - SHIP_RADIUS, s.y + dy));
  drag.shipX += s.x - ox;
  drag.shipY += s.y - oy;
}

function updatePlanet(dt) {
  if (!state.planet) {
    const seedRng = makeRng(state.planetSeed);
    const sprite = buildPlanet(state.planetSeed * 7919);
    state.planet = { sprite, x: Math.floor(seedRng() * (W - sprite.width)), y: -sprite.height - seedRng() * 260 };
    state.planetSeed += 1;
  }
  state.planet.y += dt * 4;
  if (state.planet.y > H + 4) state.planet = null;
}

/* -----------------------------------------------------------
 * Drawing
 * ----------------------------------------------------------- */
function drawBackground() {
  const y = Math.floor(state.scroll);
  const paint = (img) => {
    ctx.drawImage(img, 0, y - NEBULA_H);
    ctx.drawImage(img, 0, y);
  };
  const to = nebulae[state.nebula] || nebulae[0];
  if (state.nebulaFade < 1 && nebulae[state.nebulaFrom]) {
    paint(nebulae[state.nebulaFrom]);
    ctx.globalAlpha = state.nebulaFade;
    paint(to);
    ctx.globalAlpha = 1;
  } else {
    paint(to);
  }
  if (state.planet) ctx.drawImage(state.planet.sprite, state.planet.x, Math.floor(state.planet.y));
  const streak = Math.round(state.warp * 14);
  starLayers.forEach((layer, li) => {
    for (const star of layer.stars) {
      const sy = Math.floor(star.y);
      ctx.fillStyle = star.color;
      if (streak > 0) {
        ctx.fillRect(star.x, sy - streak * (li + 1) / 2, 1, 1 + streak * (li + 1) / 2);
      } else if (li === 2) {
        ctx.fillRect(star.x, sy, 1, 1);
        if (Math.sin(state.clock * 3 + star.twinkle) > 0.6) {
          ctx.fillRect(star.x - 1, sy, 3, 1);
          ctx.fillRect(star.x, sy - 1, 1, 3);
        }
      } else {
        ctx.fillRect(star.x, sy, 1, 1);
      }
    }
  });
}

function drawWells() {
  for (const w of state.wells) {
    const cx = Math.round(w.x);
    const cy = Math.round(w.y);
    // Three rotating rings of dots spiralling in, around a black core with a bright rim.
    const rings = [[26, 10, '#3b2a7a'], [18, 8, PAL.violet], [11, 6, PAL.rose]];
    rings.forEach(([radius, count, color], ri) => {
      ctx.fillStyle = color;
      for (let k = 0; k < count; k += 1) {
        const a = w.spin * (1 + ri * 0.6) + (k / count) * Math.PI * 2;
        ctx.fillRect(Math.round(cx + Math.cos(a) * radius), Math.round(cy + Math.sin(a) * radius * 0.8), ri === 2 ? 2 : 1, 1);
      }
    });
    // Black core with a glowing rim, drawn as a pixel disc.
    for (let y = -WELL_CORE - 1; y <= WELL_CORE + 1; y += 1) {
      for (let x = -WELL_CORE - 1; x <= WELL_CORE + 1; x += 1) {
        const d = Math.hypot(x, y);
        if (d > WELL_CORE + 1.2) continue;
        ctx.fillStyle = d > WELL_CORE - 0.2 ? PAL.rose : d > WELL_CORE - 1.4 ? '#5b1f4f' : '#000000';
        ctx.fillRect(cx + x, cy + y, 1, 1);
      }
    }
  }
}

function drawWarnings() {
  for (const w of state.warnings) {
    if (Math.floor(w.timer * 10) % 2) continue;
    const x = Math.round(w.ex);
    const y = Math.round(w.ey);
    ctx.fillStyle = PAL.rose;
    ctx.fillRect(x - 4, y - 4, 9, 9);
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(x - 3, y - 3, 7, 7);
    drawText(ctx, '!', x - 2, y - 3, { color: PAL.gold, shadow: null });
  }
}

function drawRocks() {
  for (const r of state.rocks) {
    if (r.kind === 'comet') {
      const x = Math.round(r.x);
      const y = Math.round(r.y);
      const d = Math.hypot(r.vx, r.vy) || 1;
      const tx = -r.vx / d;
      const ty = -r.vy / d;
      for (let k = 12; k >= 1; k -= 1) {
        ctx.fillStyle = k > 8 ? '#2a6f8a' : k > 4 ? PAL.glass : PAL.glassHi;
        ctx.fillRect(Math.round(x + tx * k * 1.6), Math.round(y + ty * k * 1.6), k < 6 ? 2 : 1, k < 6 ? 2 : 1);
      }
      ctx.fillStyle = PAL.glassHi;
      ctx.fillRect(x - 2, y - 1, 5, 3);
      ctx.fillRect(x - 1, y - 2, 3, 5);
      ctx.fillStyle = PAL.white;
      ctx.fillRect(x - 1, y - 1, 3, 3);
      continue;
    }
    const turn = ((r.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const frame = r.sprite.frames[Math.floor((turn / (Math.PI * 2)) * ROCK_FRAMES) % ROCK_FRAMES];
    const fx = Math.round(r.x - frame.width / 2);
    const fy = Math.round(r.y - frame.height / 2);
    ctx.drawImage(frame, fx, fy);
    if (r.kind === 'splitter') {
      // Splitters carry a glowing crack, which flickers faster just before they burst.
      const fast = r.seen && r.splitIn < 0.45;
      const on = Math.floor(state.clock * (fast ? 16 : 4)) % 2 === 0;
      const cx = Math.round(r.x);
      const cy = Math.round(r.y);
      ctx.fillStyle = on ? PAL.gold : PAL.amber;
      const a = r.angle;
      for (let k = -6; k <= 6; k += 1) {
        const wob = (k % 2) * 1.5;
        ctx.fillRect(Math.round(cx + Math.cos(a) * k * 1.2 - Math.sin(a) * wob), Math.round(cy + Math.sin(a) * k * 1.2 + Math.cos(a) * wob), 1, 1);
      }
      if (fast && on) {
        ctx.fillStyle = PAL.white;
        ctx.fillRect(cx - 1, cy - 1, 2, 2);
      }
    }
  }
}

function drawCapsules() {
  for (const c of state.capsules) {
    const art = capsuleSprites[c.kind];
    const x = Math.round(c.x - art.sprite.width / 2);
    const y = Math.round(c.y - art.sprite.height / 2);
    // The halo breathes in and out; each capsule keeps its own phase.
    const breath = 0.5 + 0.5 * Math.sin(state.clock * 5 + c.bob * 2);
    ctx.globalAlpha = 0.25 + 0.75 * breath;
    ctx.drawImage(art.glow, Math.round(c.x - art.glow.width / 2), Math.round(c.y - art.glow.height / 2));
    ctx.globalAlpha = 1;
    // A short white beacon flash about once a second.
    const beacon = (state.clock + c.bob) % 1.1 < 0.08;
    ctx.drawImage(beacon ? art.flash : art.sprite, x, y);
    // A sparkle circling the pill.
    const a = state.clock * 4 + c.bob;
    const sx = Math.round(c.x + Math.cos(a) * 13);
    const sy = Math.round(c.y + Math.sin(a) * 9);
    ctx.fillStyle = PAL.white;
    ctx.fillRect(sx, sy, 1, 1);
    if (breath > 0.6) {
      ctx.fillRect(sx - 1, sy, 3, 1);
      ctx.fillRect(sx, sy - 1, 1, 3);
    }
  }
}

function drawShip() {
  const s = state.ship;
  if (!s.alive) return;
  if (s.grace > 0 && Math.floor(state.clock * 20) % 2) return;
  const scale = state.mini > 0 ? MINI_SCALE : 1;
  const w = Math.round(SHIP_W * scale);
  const h = Math.round(SHIP_H * scale);
  const x = Math.round(s.x - w / 2);
  const y = Math.round(s.y - h / 2);
  // Banking squeezes the sprite a pixel or two towards the turn.
  const squeeze = Math.round(Math.abs(s.tilt) * 3 * scale);
  ctx.drawImage(ship.canvas, x + (s.tilt > 0 ? squeeze : 0), y, w - squeeze, h);
  const boost = state.mode === 'intro' ? 6 : 0;
  const flame = Math.round((2 + (Math.floor(state.clock * 20) % 3) + boost) * scale);
  const cx = Math.round(s.x);
  const base = y + h - 1;
  ctx.fillStyle = PAL.hull;
  if (boost) ctx.fillRect(cx - 2, base, 5, Math.round(flame * 0.7));
  ctx.fillStyle = PAL.amber;
  ctx.fillRect(cx - 1, base, 3, flame);
  ctx.fillStyle = PAL.gold;
  ctx.fillRect(cx, base, 1, flame + 1);
  ctx.fillStyle = PAL.white;
  ctx.fillRect(cx, base, 1, 1);
  if (s.shield) {
    const r = Math.round(14 * scale) + 1;
    for (let k = 0; k < 20; k += 1) {
      if ((k + Math.floor(state.clock * 8)) % 5 === 0) continue;
      const a = (k / 20) * Math.PI * 2 + state.clock;
      ctx.fillStyle = k % 2 ? PAL.glass : PAL.glassHi;
      ctx.fillRect(Math.round(s.x + Math.cos(a) * r), Math.round(s.y + Math.sin(a) * r), 1, 1);
    }
  }
}

function drawParticles() {
  for (const p of state.particles) {
    if (p.life < p.max * 0.25 && Math.floor(p.life * 30) % 2) continue;
    ctx.fillStyle = p.color;
    if (p.streak) ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 10);
    else ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
  }
}

function drawPopups() {
  for (const p of state.popups) {
    if (p.life < 0.25 && Math.floor(p.life * 20) % 2) continue;
    drawText(ctx, p.text, p.x, Math.round(p.y), { align: 'center', color: p.color });
  }
}

function blink(rate = 2) {
  return Math.floor(state.clock * rate * 2) % 2 === 0;
}

function panel(x, y, w, h) {
  ctx.fillStyle = 'rgba(9, 8, 24, 0.84)';
  ctx.fillRect(x + 1, y, w - 2, h);
  ctx.fillRect(x, y + 1, w, h - 2);
  ctx.fillStyle = PAL.navy;
  ctx.fillRect(x + 1, y, w - 2, 1);
  ctx.fillRect(x + 1, y + h - 1, w - 2, 1);
  ctx.fillRect(x, y + 1, 1, h - 2);
  ctx.fillRect(x + w - 1, y + 1, 1, h - 2);
}

function timerBar(label, left, y, fraction, color) {
  drawText(ctx, label, left, y, { color });
  const x = left + textWidth(label) + 4;
  ctx.fillStyle = PAL.navy;
  ctx.fillRect(x, y + 2, 32, 3);
  ctx.fillStyle = color;
  ctx.fillRect(x, y + 2, Math.round(32 * fraction), 3);
}

function drawHud() {
  drawText(ctx, formatTime(state.time).replace(' ', ''), 8, 7, { scale: 2, color: state.slow > 0 ? CAPSULES.slow.light : PAL.white });
  drawText(ctx, `STAGE ${state.stage + 1}`, W - 8, 7, { align: 'right', color: PAL.gold });
  if (state.best > 0) drawText(ctx, `BEST ${state.best.toFixed(2)}`, W - 8, 17, { align: 'right', color: PAL.steel });
  let row = 26;
  if (state.ship.shield) { drawText(ctx, 'SHIELD', 8, row, { color: CAPSULES.shield.light }); row += 10; }
  if (state.slow > 0) { timerBar('SLOW', 8, row, state.slow / SLOW_SECONDS, CAPSULES.slow.light); row += 10; }
  if (state.mini > 0) timerBar('MINI', 8, row, state.mini / MINI_SECONDS, CAPSULES.mini.light);
}

function drawBanner(b) {
  const slide = Math.min(1, b.t / 0.35);
  const out = b.t > 1.9 ? (b.t - 1.9) / 0.5 : 0;
  const offset = Math.round((1 - slide) * -W + out * W);
  const typed = b.name.slice(0, Math.max(0, Math.floor((b.t - 0.3) * 22)));
  ctx.fillStyle = 'rgba(9, 8, 24, 0.7)';
  ctx.fillRect(0, 84 + 0, W, 1);
  ctx.fillRect(0, 128, W, 1);
  drawText(ctx, b.title, W / 2 + offset, 90, { scale: 2, align: 'center', color: PAL.gold, shadow: PAL.hullDark });
  drawText(ctx, typed, W / 2 - offset, 112, { align: 'center', color: PAL.pale });
}

function drawLetterbox(amount) {
  const h = Math.round(26 * amount);
  if (!h) return;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, h);
  ctx.fillRect(0, H - h, W, h);
}

function drawIntroText() {
  const t = state.introT;
  if (t > 0.9 && t < 2.1) {
    const local = t - 0.9;
    const slide = Math.min(1, local / 0.3);
    drawText(ctx, 'STAGE 1', Math.round(W / 2 - (1 - slide) * 200), 74, { scale: 3, align: 'center', color: PAL.gold, shadow: PAL.hullDark });
    const typed = STAGES[0].name.slice(0, Math.max(0, Math.floor((local - 0.25) * 24)));
    drawText(ctx, typed, W / 2, 104, { scale: 2, align: 'center', color: PAL.pale });
  }
  if (t >= 2.1 && t < 2.55 && blink(4)) drawText(ctx, 'READY', W / 2, 92, { scale: 3, align: 'center', color: PAL.white });
  if (t >= 2.55) drawText(ctx, 'GO!', W / 2, 88, { scale: 4, align: 'center', color: PAL.mint, shadow: PAL.ink });
}

// Title letters drop in one by one when the page opens.
function drawTitleWord(word, y, scale, color, shadow, delay) {
  const width = textWidth(word, scale);
  let x = W / 2 - Math.floor(width / 2);
  [...word].forEach((ch, i) => {
    const t = state.clock - delay - i * 0.07;
    const p = Math.max(0, Math.min(1, t / 0.35));
    if (p > 0) {
      const drop = Math.round((1 - easeOutBack(p)) * -60);
      drawText(ctx, ch, x, y + drop, { scale, color, shadow });
    }
    x += 6 * scale;
  });
}

function drawTitle() {
  if (state.clock > 0.2) panel(W / 2 - 128, 44, 256, 124);
  drawTitleWord('ASTEROID', 56, 4, PAL.gold, PAL.hullDark, 0.3);
  drawTitleWord('STORM', 92, 4, PAL.hull, PAL.ink, 0.85);
  if (state.clock > 1.5) {
    drawText(ctx, 'DRAG OR USE ARROW KEYS', W / 2, 132, { align: 'center', color: PAL.pale });
    if (blink(1.5)) drawText(ctx, 'TAP OR PRESS ENTER', W / 2, 148, { align: 'center', color: PAL.mint });
  }
  if (state.best > 0) drawText(ctx, `BEST ${formatTime(state.best)}`, W / 2, 182, { align: 'center', color: PAL.steel });
}

// The pause screen hides the field, so a pause can't be used to plan a route.
function drawPaused() {
  ctx.fillStyle = PAL.space;
  ctx.fillRect(0, 0, W, H);
  if (state.pausedFrom === 'playing') drawText(ctx, formatTime(state.time), W / 2, H / 2 - 56, { scale: 2, align: 'center', color: PAL.steel });
  panel(W / 2 - 80, H / 2 - 30, 160, 56);
  drawText(ctx, 'PAUSED', W / 2, H / 2 - 20, { scale: 3, align: 'center', color: PAL.gold });
  if (blink(1)) drawText(ctx, 'TAP TO RESUME', W / 2, H / 2 + 12, { align: 'center', color: PAL.pale });
}

function drawGameOver() {
  const since = state.clock - state.overAt;
  if (since < 0.6) return;
  panel(W / 2 - 112, 44, 224, 150);
  drawText(ctx, 'GAME OVER', W / 2, 54, { scale: 3, align: 'center', color: PAL.hull });
  drawText(ctx, 'SURVIVED', W / 2, 84, { align: 'center', color: PAL.steel });
  drawText(ctx, formatTime(state.time), W / 2, 96, { scale: 3, align: 'center', color: PAL.white });
  if (state.newBest) {
    if (blink(3)) drawText(ctx, 'NEW PERSONAL BEST!', W / 2, 124, { align: 'center', color: PAL.gold });
  } else {
    drawText(ctx, `BEST ${formatTime(state.best)}`, W / 2, 124, { align: 'center', color: PAL.steel });
  }
  drawText(ctx, `REACHED ${STAGES[state.stage].name}`, W / 2, 138, { align: 'center', color: PAL.pale });
  drawText(ctx, `CLOSE CALLS ${state.nearMisses}`, W / 2, 150, { align: 'center', color: PAL.glass });
  if (canRestart() && blink(1.5)) drawText(ctx, 'TAP TO FLY AGAIN', W / 2, 174, { align: 'center', color: PAL.mint });
}

function draw() {
  ctx.save();
  if (state.shake > 0) {
    const m = Math.ceil(state.shake * 8);
    ctx.translate(Math.round((rng() - 0.5) * m), Math.round((rng() - 0.5) * m));
  }
  ctx.fillStyle = PAL.space;
  ctx.fillRect(-8, -8, W + 16, H + 16);
  drawBackground();
  if (state.slow > 0) {
    ctx.fillStyle = 'rgba(40, 160, 110, 0.12)';
    ctx.fillRect(-8, -8, W + 16, H + 16);
  }
  drawWells();
  drawCapsules();
  drawRocks();
  drawParticles();
  if (state.mode !== 'title') drawShip();
  drawWarnings();
  drawPopups();
  ctx.restore();

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255, 240, 220, ${(state.flash / 0.25) * 0.55})`;
    ctx.fillRect(0, 0, W, H);
  }
  const mode = state.mode === 'paused' ? state.pausedFrom : state.mode;
  if (state.mode === 'title') drawTitle();
  else if (mode === 'intro') {
    const t = state.introT;
    drawLetterbox(t < 0.3 ? t / 0.3 : t > 2.4 ? Math.max(0, 1 - (t - 2.4) / 0.4) : 1);
    drawIntroText();
  } else {
    drawHud();
    if (state.banner) drawBanner(state.banner);
  }
  if (state.mode === 'paused') drawPaused();
  if (state.mode === 'over') drawGameOver();
}

let lastFrame = 0;
let pending = 0;
function frame(now) {
  pending += lastFrame ? Math.min((now - lastFrame) / 1000, MAX_CATCH_UP) : 0;
  lastFrame = now;
  while (pending >= STEP) {
    update(STEP);
    pending -= STEP;
  }
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* -----------------------------------------------------------
 * Input
 * ----------------------------------------------------------- */
// Field pixels per screen pixel. On a short window the canvas box is wider than 3:2 and
// the picture is fitted by height, so measure the picture, not the box.
function fieldScale() {
  const rect = canvas.getBoundingClientRect();
  const shown = Math.min(rect.width, rect.height * (W / H));
  return shown ? W / shown : 1;
}

function beginDrag(e) {
  drag.id = e.pointerId;
  drag.startX = e.clientX;
  drag.startY = e.clientY;
  drag.shipX = state.ship.x;
  drag.shipY = state.ship.y;
  try { canvas.setPointerCapture(e.pointerId); } catch {}
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  canvas.focus({ preventScroll: true });
  if (state.mode !== 'playing') primaryAction();
  if (state.mode === 'playing') beginDrag(e);
}, { passive: false });

canvas.addEventListener('pointermove', (e) => {
  if (state.mode !== 'playing' || !state.ship.alive) return;
  // A finger held through the intro takes control as soon as play starts.
  if (drag.id === null && e.buttons) beginDrag(e);
  if (drag.id !== e.pointerId) return;
  e.preventDefault();
  const k = fieldScale();
  moveShipTo(drag.shipX + (e.clientX - drag.startX) * k, drag.shipY + (e.clientY - drag.startY) * k);
}, { passive: false });

const endDrag = (e) => { if (drag.id === e.pointerId) drag.id = null; };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

const MOVE_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'ShiftLeft', 'ShiftRight']);

document.addEventListener('keydown', (e) => {
  if (modal.open || e.target instanceof HTMLInputElement) return;
  if (MOVE_KEYS.has(e.code)) {
    keys.add(e.code);
    if (e.code.startsWith('Arrow') && (state.mode === 'playing' || state.mode === 'intro')) e.preventDefault();
    return;
  }
  if (e.code === 'Enter' || e.code === 'Space') {
    if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement) return;
    e.preventDefault();
    primaryAction();
  } else if (e.code === 'KeyP' || e.code === 'Escape') {
    if (state.mode === 'paused') resume();
    else pause();
  } else if (e.code === 'KeyM') {
    toggleSound();
  }
});

document.addEventListener('keyup', (e) => keys.delete(e.code));
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('blur', pause);

/* -----------------------------------------------------------
 * Buttons
 * ----------------------------------------------------------- */
function updateButtons() {
  const paused = state.mode === 'paused';
  pauseButton.disabled = !paused && state.mode !== 'playing' && state.mode !== 'intro';
  pauseButton.querySelector('.label').textContent = paused ? 'Resume' : 'Pause';
  pauseButton.setAttribute('aria-pressed', String(paused));
  pauseButton.classList.toggle('is-on', paused);
  const muted = audio.isMuted();
  soundButton.querySelector('.label').textContent = muted ? 'Sound off' : 'Sound on';
  soundButton.setAttribute('aria-pressed', String(!muted));
  soundButton.classList.toggle('is-off', muted);
}

function toggleSound() {
  audio.unlock();
  audio.setMuted(!audio.isMuted());
  if (audio.isMuted()) audio.stopMusic();
  else if (state.mode === 'playing') audio.startMusic();
  updateButtons();
}

pauseButton.addEventListener('click', () => {
  if (state.mode === 'paused') resume();
  else pause();
});
soundButton.addEventListener('click', toggleSound);
updateButtons();

/* -----------------------------------------------------------
 * Initials dialog
 * ----------------------------------------------------------- */
let pendingScore = null;
let submitting = false;

function openModal(score) {
  pendingScore = score;
  modalScore.textContent = formatTime(score);
  initialsInput.value = '';
  initialsError.textContent = '';
  submitButton.disabled = false;
  submitButton.textContent = 'Submit';
  keys.clear();
  if (typeof modal.showModal === 'function') modal.showModal();
  else modal.setAttribute('open', '');
  setTimeout(() => initialsInput.focus(), 50);
}

function closeModal() {
  if (modal.open) modal.close();
  pendingScore = null;
  submitting = false;
}

initialsInput.addEventListener('input', () => {
  initialsInput.value = initialsInput.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3);
  initialsError.textContent = '';
});

modalForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (submitting || pendingScore === null) return;
  const initials = initialsInput.value.trim().toUpperCase();
  if (!/^[A-Z0-9]{3}$/.test(initials)) {
    initialsError.textContent = 'Enter exactly 3 letters or digits.';
    initialsInput.focus();
    return;
  }
  submitting = true;
  submitButton.disabled = true;
  submitButton.textContent = 'Sending…';
  try {
    await board.submit(initials, pendingScore);
    audio.sfx('blip');
    closeModal();
    canvas.focus({ preventScroll: true });
  } catch (error) {
    console.warn(error);
    initialsError.textContent = 'Could not send the score. Try again.';
    submitting = false;
    submitButton.disabled = false;
    submitButton.textContent = 'Submit';
  }
});

skipButton.addEventListener('click', () => {
  closeModal();
  canvas.focus({ preventScroll: true });
});

modal.addEventListener('cancel', () => { pendingScore = null; submitting = false; });
