// Asteroid Storm: survive as long as you can in a field of asteroids. No shooting: every
// threat is dodged. The field is 360 x 240 pixels, scaled up with nearest-neighbour sampling.
import {
  W, H, PAL, NEBULA_H, ROCK_DIAMETERS, ROCK_FRAMES, ROCK_PALETTES, SHIP_W, SHIP_H, CAPSULES,
  buildShip, buildRockSet, buildNebula, buildStars, buildPlanet, buildPageTile, buildCapsule, drawText, textWidth, makeRng,
} from './art.js?v=20261124-pilot';
import { createAudio } from './audio.js?v=20261124-pilot';
import { createLeaderboard, formatTime } from './leaderboard.js?v=20261124-pilot';
import { createTrophies, trophyArt } from './trophies.js?v=20261124-pilot';
import { mountTitle } from './title.js?v=20261124-pilot';
import { createJoystick } from './joystick.js?v=20261124-pilot';
import { createPilot } from './pilot.js?v=20261124-pilot';

/* -----------------------------------------------------------
 * Difficulty. The asteroid curve started as the previous
 * version's (its 600 x 400 field scaled by 0.6, at 60 fps).
 * Rocks there flew in random directions and half left the
 * screen at once; here every rock heads inwards and half as
 * many spawn, which is the same field. RAMP slows how fast
 * speed and spawning grow. With the stage hazards it is tuned
 * so a bot that reads the warnings has a median run of about
 * 100 s.
 * ----------------------------------------------------------- */
const SHIP_RADIUS = 9;
const MIN_SPEED = 72; // px/s at the start
const MAX_SPEED = 252;
const RAMP = 0.14; // share of the previous version's growth rates
const MIN_SPEED_GROWTH = 2.057 * RAMP; // px/s gained per second survived
const MAX_SPEED_GROWTH = 4.114 * RAMP;
const SPAWN_RATE = 0.6; // rocks per second at the start
const SPAWN_GROWTH = 0.36 * RAMP; // extra rocks per second, per second survived
const SPAWN_MARGIN = 24;
const REMOVE_MARGIN = 60;
const MAX_SPIN = 1.5; // rad/s
const HITBOX = 0.95; // share of a rock's nominal radius that collides
// The world always advances in fixed 1/120 s steps, whatever the display's frame rate, so
// speeds, collisions and the clock are the same on every device. A slow frame runs several
// steps; only a stall longer than MAX_CATCH_UP slows the game rather than jumping it.
const STEP = 1 / 120;
const MAX_CATCH_UP = 0.25; // s of game time run in one display frame at most
// Every control shares one top speed, so no device has an edge: the keyboard moves at it, and
// a drag (on the field or the touch pad) sets a target the ship flies to at up to this speed.
const SHIP_SPEED = 320; // px/s
const NEAR_MISS_GAP = 6;
const STAGE_SECONDS = 20;
const INTRO_SECONDS = 2.8;

const COMET_WARNING = 0.9; // s of warning before a comet enters
const COMET_SPEED = 300;
const COMET_RADIUS = 3;
const SPLIT_MIN_DIAMETER = 31;
const WELL_CORE = 6;
const WELL_REACH = 130;
const WELL_PULL = 75; // px/s drift towards the well at its core
const WELL_ROCK_PULL = 200; // px/s² pull on rocks at the core
const WELL_SPEED = 16;
// Each black hole gets its own size between these, scaling its core, reach and pull together.
const WELL_SIZE = [0.75, 1.35];
const FIRST_WELL_DELAY = 2.5; // s into the first stage with wells (Stage 2) before one appears

// Solar flares: a loop of plasma arcs out of one edge of the field and back into it, as
// flares erupt along magnetic loops on the Sun. Dashed lines warn of the arc, then it blazes.
const FLARE_HALF_RANGE = [5, 10]; // px, half the arc's width; each flare picks its own
const FLARE_SPREAD = [1.15, 1.7]; // each footpoint's distance from the ship along the edge, as a
// multiple of the ship's height above that edge; above 1 keeps the loop an arch, not a ring
const FLARE_HEIGHT = [30, 160]; // px the ship may be from the edge the loop rises from
const FLARE_WARN = 1.0; // s of warning
const FLARE_FIRE = 0.5; // s the beam burns
const FIRST_FLARE_DELAY = 3; // s into the first stage with flares (Stage 3) before one appears

const CAPSULE_FIRST = 7;
const SHIELD_COOLDOWN = 15; // s between shield capsules at least; the stages set the capsule gaps
const SHIELD_CHANCE = 1 / 7; // once allowed, the chance a capsule is a shield; the other kinds share the rest equally
const SLOW_SECONDS = 5;
const SLOW_SCALE = 0.5;
const MINI_SECONDS = 7; // mini: a much smaller ship that also flies MINI_SPEED times faster
const MINI_SPEED = 1.7;
const RADAR_SECONDS = 7; // radar: dotted lines show where rocks and comets are heading
const RADAR_LOOKAHEAD = 0.9; // s of path shown
const AUTO_SECONDS = 5.5; // autopilot: the ship flies itself and cannot be hit
const AUTO_WARN = 1; // s before the end when the ship starts to blink
const AUTO_GRACE = 1; // s the ship stays safe after the player takes back control
const AUTO_CLEAR = 24; // px of clearance the autopilot counts as safe enough
const GHOST_GAP = 1 / 40; // mini: seconds between afterimages
const GHOST_LIFE = 0.22;
const MINI_SCALE = 0.4;
const SHIELD_GRACE = 1.2;
// Shockwave: a ring bursts out from the ship and throws nearby rocks outwards. Nothing is
// destroyed; the rocks stay in play and still have to be dodged.
const WAVE_REACH = 130; // px
const WAVE_SPEED = 340; // px/s the ring expands
const WAVE_KICK = 170; // px/s added outwards to a rock at the ship, falling to 0 at the edge
const WAVE_MIN_SPEED = 120; // px/s a pushed rock leaves at, at least

const BEST_KEY = 'dodgeBestV2';
const TRAIL_PHASE_SEED = 1819600217;

// Each stage: its name, the rock palettes it uses, and how often each hazard appears
// (comets and wells: seconds between them; splitters: share of big rocks that split).
const STAGES = [
  { name: 'DUST BELT', palettes: [0, 1], nebula: 0, comet: 0, split: 0, well: 0, flare: 0, capsule: [10, 14] },
  { name: 'IRON BELT', palettes: [2, 1], nebula: 1, comet: 4.5, split: 0, well: 15, flare: 0, capsule: [9, 12] },
  { name: 'ICE FIELD', palettes: [3], nebula: 2, comet: 4, split: 0.3, well: 13, flare: 6, capsule: [8, 11] },
  { name: 'MAGMA RIFT', palettes: [4, 2], nebula: 3, comet: 4.2, split: 0.35, well: 11, flare: 6, capsule: [7.5, 10] },
  { name: 'DEEP STORM', palettes: [0, 1, 2, 3, 4], nebula: 4, comet: 3.8, split: 0.4, well: 10, flare: 5.5, capsule: [7, 9] },
];

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
// The game is drawn in 360 x 240 field pixels, but the canvas holds pixelScale device pixels
// per field pixel (about the screen's own resolution). Sprites and text still snap to whole
// field pixels; only the slow background layers use the finer steps, so they glide instead
// of jumping a whole big pixel at a time.
let pixelScale = 1;
function fitCanvas() {
  const rect = canvas.getBoundingClientRect();
  const shown = Math.min(rect.width, rect.height * (W / H)) || W;
  const k = Math.max(1, Math.min(4, Math.round((shown * (window.devicePixelRatio || 1)) / W)));
  if (k !== pixelScale || canvas.width !== W * k) {
    pixelScale = k;
    canvas.width = W * k;
    canvas.height = H * k;
  }
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.imageSmoothingEnabled = false;
}
fitCanvas();
if (window.ResizeObserver) new ResizeObserver(fitCanvas).observe(canvas);
window.addEventListener('resize', fitCanvas);
// Rounds to the finest step the canvas can show.
const fine = (v) => Math.round(v * pixelScale) / pixelScale;

const pauseButton = document.getElementById('pauseButton');
const soundButton = document.getElementById('soundButton');
const fullscreenButton = document.getElementById('fullscreenButton');
const modal = document.getElementById('initialsModal');
const modalForm = document.getElementById('initialsForm');
const modalScore = document.getElementById('modalScore');
const initialsInput = document.getElementById('initialsInput');
const initialsError = document.getElementById('initialsError');
const submitButton = document.getElementById('submitInitials');
const skipButton = document.getElementById('skipInitials');

const audio = createAudio();
const trophies = createTrophies({
  grid: document.getElementById('trophyGrid'),
  count: document.getElementById('trophyCount'),
  detail: document.getElementById('trophyDetail'),
});
// Clears what this game keeps on the device: trophies and the personal best. The online
// leaderboard is untouched.
document.getElementById('clearRecords').addEventListener('click', () => {
  if (!window.confirm('Clear your trophies and personal best on this device? This cannot be undone. The online leaderboard is not affected.')) return;
  trophies.clear();
  state.best = 0;
  try { localStorage.removeItem(BEST_KEY); } catch {}
});

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
// The mini ship's afterimage: the ship's silhouette in the mini pill's color.
const trailGhost = (() => {
  const c = document.createElement('canvas');
  c.width = ship.canvas.width;
  c.height = ship.canvas.height;
  const g = c.getContext('2d');
  g.drawImage(ship.canvas, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = CAPSULES.mini.light;
  g.fillRect(0, 0, c.width, c.height);
  return c;
})();
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
mountTitle(document.getElementById('titleArt'), { ship, rocks: rockSets[0] });
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
const freshShip = () => ({ x: W / 2, y: H * 0.62, tx: null, ty: null, tilt: 0, moveX: 0, alive: true, shield: false, grace: 0 });

const state = {
  mode: 'title', // title | intro | playing | paused | over
  pausedFrom: 'playing',
  time: 0,
  stage: 0,
  rocks: [],
  wells: [],
  warnings: [],
  capsules: [],
  waves: [],
  flares: [],
  flareTimer: FIRST_FLARE_DELAY,
  particles: [],
  popups: [],
  spawnBudget: 0,
  cometTimer: 0,
  wellTimer: FIRST_WELL_DELAY,
  capsuleTimer: CAPSULE_FIRST,
  lastShield: -Infinity,
  lastCapsule: null, // the kind of the last capsule, which the next one never repeats
  slow: 0,
  mini: 0,
  radar: 0,
  auto: 0,
  ghosts: [],
  ghostClock: 0,
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
  streak: 0,
  bestStreak: 0,
  lastNearAt: -10,
  callout: null,
  toasts: [], // trophies waiting to be shown, oldest first
  runTrophies: 0,
  pickups: 0,
  best: 0,
  newBest: false,
  god: false, // god mode: nothing can hit the ship
  godRun: false, // god mode was on at some point this run, so it is unranked
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
  const size = WELL_SIZE[0] + rng() * (WELL_SIZE[1] - WELL_SIZE[0]);
  state.wells.push({
    x: fromLeft ? -40 : W + 40, y,
    vx: (fromLeft ? 1 : -1) * WELL_SPEED, vy: (rng() - 0.5) * 8,
    spin: 0,
    size,
    core: WELL_CORE * size,
    reach: WELL_REACH * size,
  });
  audio.sfx('warn');
}

function spawnCapsule() {
  // Shields are the strongest capsule, so they are held back: none while one is held, and at
  // least SHIELD_COOLDOWN seconds apart. Once allowed, a capsule is a shield with
  // SHIELD_CHANCE; otherwise it is one of the other kinds, each equally likely, but never the
  // same kind as the capsule before it.
  const shieldOk = !state.ship.shield && state.time - state.lastShield >= SHIELD_COOLDOWN;
  const kind = shieldOk && state.lastCapsule !== 'shield' && rng() < SHIELD_CHANCE
    ? 'shield'
    : pick(Object.keys(CAPSULES).filter((k) => k !== 'shield' && k !== state.lastCapsule));
  state.lastCapsule = kind;
  if (kind === 'shield') state.lastShield = state.time;
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
    if (d > w.reach) continue;
    const f = strength * w.size * (1 - d / w.reach) ** 1.5;
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
      const [ax, ay] = wellPull(r.x, r.y, WELL_ROCK_PULL);
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
      if (r.kind !== 'comet' && Math.hypot(w.x - r.x, w.y - r.y) < w.core + 2) swallowed = true;
    }
    if (swallowed) {
      state.rocks.splice(i, 1);
      burst(r.x, r.y, 6, [PAL.violet, PAL.rose], 30);
      if (collide) audio.sfx('swallow', r.radius);
      continue;
    }
    if (collide && s.alive) {
      const d = Math.hypot(r.x - s.x, r.y - s.y);
      const reach = reachShip + r.radius * HITBOX;
      if (d < reach && canBeHit()) {
        if (s.shield) {
          shieldBreak(r);
          state.rocks.splice(i, 1);
          continue;
        }
        crash(r);
      } else if (d < reach + NEAR_MISS_GAP) {
        r.near = true;
        r.minGap = Math.min(r.minGap ?? Infinity, d - reach);
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
    if (collide && s.alive) {
      const dist = Math.hypot(w.x - s.x, w.y - s.y);
      if (dist < w.reach * 0.3) w.deep = true;
      else if (w.deep && dist > w.reach * 0.85) { w.deep = false; awardTrophy('horizon'); }
    }
    if (collide && s.alive && canBeHit() && Math.hypot(w.x - s.x, w.y - s.y) < w.core + hitRadius() * 0.6) {
      if (s.shield) {
        // A shield is spent getting thrown clear of the core.
        s.shield = false;
        s.grace = SHIELD_GRACE;
        const d = Math.hypot(s.x - w.x, s.y - w.y) || 1;
        moveShipBy(((s.x - w.x) / d) * 30, ((s.y - w.y) / d) * 30);
        popup('SHIELD LOST', s.x, s.y - 14, PAL.glass);
        pilot.react('nearMiss', { dir: w.x < s.x ? -1 : 1 });
        audio.sfx('shield');
        awardTrophy('shield');
      } else {
        crash({ vx: 0, vy: 0 });
      }
    }
    if (w.x < -70 || w.x > W + 70) state.wells.splice(i, 1);
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
  if (!state.godRun && trophies.noteCapsule(kind)) awardTrophy('fullset');
  pilot.react({ shield: 'shield', mini: 'mini', wave: 'shockwave' }[kind] || 'capsule');
  const label = { shield: 'SHIELD', slow: 'SLOW TIME', mini: 'MINI SHIP', wave: 'SHOCKWAVE', radar: 'RADAR', auto: 'AUTOPILOT' }[kind];
  if (kind === 'shield') s.shield = true;
  if (kind === 'slow') state.slow = SLOW_SECONDS;
  if (kind === 'mini') state.mini = MINI_SECONDS;
  if (kind === 'radar') state.radar = RADAR_SECONDS;
  if (kind === 'auto') { state.auto = AUTO_SECONDS; s.autoVx = 0; s.autoVy = 0; }
  if (kind === 'wave') {
    state.waves.push({ x: s.x, y: s.y, r: 4, pushed: new Set() });
    state.shake = Math.max(state.shake, 0.15);
    audio.sfx('wave');
  } else {
    audio.sfx(kind === 'radar' || kind === 'mini' || kind === 'auto' ? kind : 'power');
  }
  popup(label, s.x, s.y - 16, CAPSULES[kind].light);
  burst(s.x, s.y, 14, [CAPSULES[kind].light, CAPSULES[kind].body, PAL.white], 60);
}

// The ring grows from where the capsule was taken; each rock it reaches is thrown straight
// away from that point, harder the closer it was.
function updateWaves(dt) {
  for (let i = state.waves.length - 1; i >= 0; i -= 1) {
    const w = state.waves[i];
    w.r += WAVE_SPEED * dt;
    for (const r of state.rocks) {
      if (w.pushed.has(r)) continue;
      const dx = r.x - w.x;
      const dy = r.y - w.y;
      const d = Math.hypot(dx, dy) || 0.01;
      if (d - r.radius > Math.min(w.r, WAVE_REACH)) continue;
      w.pushed.add(r);
      const speed = Math.max(Math.hypot(r.vx, r.vy), WAVE_MIN_SPEED) + WAVE_KICK * Math.max(0, 1 - d / WAVE_REACH);
      r.vx = (dx / d) * speed;
      r.vy = (dy / d) * speed;
      r.near = false;
      burst(r.x, r.y, 5, [CAPSULES.wave.light, PAL.white], 50);
      if (w.pushed.size >= 6) awardTrophy('shockwave');
    }
    if (w.r > WAVE_REACH + 14) state.waves.splice(i, 1);
  }
}

function drawWaves() {
  for (const w of state.waves) {
    const r = Math.min(w.r, WAVE_REACH + 14);
    const fade = Math.max(0, 1 - r / (WAVE_REACH + 14));
    const steps = Math.max(24, Math.round(r * 2.2));
    for (let band = 0; band < 2; band += 1) {
      const rr = r - band * 3;
      if (rr <= 0) continue;
      ctx.fillStyle = band === 0 ? (fade > 0.35 ? PAL.white : CAPSULES.wave.light) : CAPSULES.wave.body;
      for (let k = 0; k < steps; k += 1) {
        // Break the ring up as it fades.
        if (fade < 0.5 && (k * 7 + band) % 3 === 0) continue;
        const a = (k / steps) * Math.PI * 2;
        ctx.fillRect(Math.round(w.x + Math.cos(a) * rr), Math.round(w.y + Math.sin(a) * rr), 1, 1);
      }
    }
  }
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
  const px = Math.max(half, Math.min(W - half, x));
  let py = y;
  // Stack above any pop-up still showing in the same place, rather than on top of it.
  for (let tries = 0; tries < 6; tries += 1) {
    const clash = state.popups.some((o) => Math.abs(o.y - py) < 9 && Math.abs(o.x - px) < half + textWidth(o.text) / 2);
    if (!clash) break;
    py -= 9;
  }
  if (py < 4) py = y;
  state.popups.push({ text, x: px, y: py, life: 0.9, color });
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

// Near-miss callouts: the closer the pass, the bigger the word. Close calls within
// STREAK_WINDOW of each other build a streak, which escalates the callout.
const STREAK_WINDOW = 2; // s
const CALLOUT_WORDS = [
  ['NICE!', 'WHOA!', 'SLICK!', 'SMOOTH!'],
  ['CLOSE SHAVE!', 'YIKES!', 'NEAT DODGE!', 'HAIRLINE!'],
  ['RAZOR!', 'TOO CLOSE!', 'WHISKER!', 'PAINT SCRATCH!'],
];
const STREAK_TITLES = [[8, 'GHOST PILOT'], [5, 'UNTOUCHABLE'], [3, 'DAREDEVIL']];

function nearMiss(rock) {
  if (state.auto > 0) return; // the autopilot's close calls are not the player's
  state.nearMisses += 1;
  const s = state.ship;
  pilot.react('nearMiss', { dir: rock.x < s.x ? -1 : 1 });
  burst((rock.x + s.x) / 2, (rock.y + s.y) / 2, 6, [PAL.glassHi], 40);
  state.streak = state.clock - state.lastNearAt <= STREAK_WINDOW ? state.streak + 1 : 1;
  state.lastNearAt = state.clock;
  state.bestStreak = Math.max(state.bestStreak, state.streak);
  const gap = rock.minGap ?? NEAR_MISS_GAP;
  const tier = gap < 1.5 ? 2 : gap < 3.5 ? 1 : 0;
  const title = state.streak >= 2 ? (STREAK_TITLES.find(([n]) => state.streak >= n) || [0, ''])[1] : '';
  state.callout = {
    text: pick(CALLOUT_WORDS[tier]),
    sub: state.streak >= 2 ? `X${state.streak} ${title}`.trim() : '',
    tier: Math.max(tier, state.streak >= 3 ? 1 : 0),
    t: 0,
  };
  audio.sfx('near', state.streak);
  if (state.nearMisses >= 10) awardTrophy('daredevil');
  if (state.streak >= 5) awardTrophy('untouchable');
  if (rock.kind === 'comet') awardTrophy('comet');
}

// Trophies are never earned in a run that used god mode.
// Skill trophies are not earned while the autopilot is flying.
const PILOT_TROPHIES = new Set(['daredevil', 'untouchable', 'comet', 'flare', 'horizon']);

function awardTrophy(id) {
  if (state.godRun || state.mode !== 'playing') return;
  if (state.auto > 0 && PILOT_TROPHIES.has(id)) return;
  if (!trophies.award(id)) return;
  state.runTrophies += 1;
  state.toasts.push({ id, t: 0 });
}

// A flare's loop rises from one edge, passes through (about) where the ship is when the warning
// starts, and lands back on the same edge, so it always asks for a move. The loop is the part of
// a circle through its two footpoints and that point; the rest of the circle lies off the field.
function warnFlare() {
  const s = state.ship;
  // Distance from the ship to each edge, and how to map edge coordinates (u along, v in) to x, y.
  const edges = [
    { v: H - s.y, u: s.x, map: (u, v) => [u, H - v] },
    { v: s.y, u: s.x, map: (u, v) => [u, v] },
    { v: s.x, u: s.y, map: (u, v) => [v, u] },
    { v: W - s.x, u: s.y, map: (u, v) => [W - v, u] },
  ];
  const fits = edges.filter((e) => e.v >= FLARE_HEIGHT[0] && e.v <= FLARE_HEIGHT[1]);
  const edge = fits.length ? pick(fits) : edges.reduce((a, b) => (Math.abs(a.v - 90) < Math.abs(b.v - 90) ? a : b));
  const us = edge.u + (rng() - 0.5) * 10;
  const vs = Math.max(12, edge.v + (rng() - 0.5) * 10);
  const spread = () => vs * (FLARE_SPREAD[0] + rng() * (FLARE_SPREAD[1] - FLARE_SPREAD[0]));
  const u1 = us - spread();
  const u2 = us + spread();
  const uc = (u1 + u2) / 2;
  const half = (u2 - u1) / 2;
  const vc = ((us - uc) ** 2 + vs ** 2 - half ** 2) / (2 * vs);
  const [cx, cy] = edge.map(uc, vc);
  const width = FLARE_HALF_RANGE[0] + rng() * (FLARE_HALF_RANGE[1] - FLARE_HALF_RANGE[0]);
  const flare = { cx, cy, r: Math.hypot(half, vc), half: width, feet: [edge.map(u1, 0), edge.map(u2, 0)], t: 0, fired: false };
  Object.assign(flare, drawFlareArt(flare));
  state.flares.push(flare);
  audio.sfx('flarewarn');
}

// Distance from a point to the loop's centre line.
function flareGap(f, x, y) {
  return Math.abs(Math.hypot(x - f.cx, y - f.cy) - f.r);
}

// The warning (dashed edges) and the blaze are drawn once per flare, pixel by pixel, so they
// stay as crisp as the rest of the art. The blaze has FLARE_FRAMES frames with ragged, licking
// edges, shown in turn so the loop flickers like flame. Only the warned band can hit the ship;
// the flame tongues reaching past it are for show.
const FLARE_FRAMES = 4;
function drawFlareArt(f) {
  const make = () => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    return { c, g, img: g.createImageData(W, H) };
  };
  const warn = make();
  const frames = Array.from({ length: FLARE_FRAMES }, make);
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [rose, white, gold, amber, hull, ember] = [PAL.rose, PAL.white, PAL.gold, PAL.amber, PAL.hull, PAL.hullDark].map(rgb);
  const put = (img, i, c) => { img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255; };
  // Each frame's flame height along the loop: a few waves with their own phases.
  const waves = frames.map(() => [0.31, 0.83, 1.9].map((k) => ({ k, p: rng() * Math.PI * 2 })));
  const reach = f.half * 1.6;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const dx = x + 0.5 - f.cx;
      const dy = y + 0.5 - f.cy;
      const d = Math.hypot(dx, dy) - f.r;
      const a = Math.abs(d);
      if (a > reach) continue;
      const i = (y * W + x) * 4;
      const along = Math.atan2(dy, dx) * f.r;
      // Dashes every 3 px along the arc, on both edges of the warned band.
      if (Math.abs(a - f.half) < 0.6 && Math.floor(along / 3) % 2 === 0) put(warn.img, i, rose);
      frames.forEach((fr, n) => {
        const w = waves[n];
        const noise = 0.5 + 0.28 * Math.sin(along * w[0].k + w[0].p) + 0.14 * Math.sin(along * w[1].k + w[1].p) + 0.08 * Math.sin(along * w[2].k + w[2].p);
        // Tongues lick further outwards than inwards.
        const half = f.half * (d > 0 ? 0.7 + 0.9 * noise : 0.75 + 0.45 * noise);
        const t = a / half;
        if (t > 1) return;
        // Ragged, flickering tips.
        if (t > 0.8 && ((x * 7 + y * 13 + n * 5) % 4) / 4 > (1 - t) * 5) return;
        put(fr.img, i, t < 0.18 ? white : t < 0.42 ? gold : t < 0.68 ? amber : t < 0.88 ? hull : ember);
      });
    }
  }
  for (const layer of [warn, ...frames]) layer.g.putImageData(layer.img, 0, 0);
  return { warnArt: warn.c, beamFrames: frames.map((fr) => fr.c) };
}

function updateFlares(dt) {
  const s = state.ship;
  for (let i = state.flares.length - 1; i >= 0; i -= 1) {
    const f = state.flares[i];
    f.t += dt;
    if (!f.fired && f.t >= FLARE_WARN) {
      f.fired = true;
      state.shake = Math.max(state.shake, 0.18);
      audio.sfx('flare');
    }
    if (f.fired && s.alive && flareGap(f, s.x, s.y) < f.half + hitRadius() * 0.6 + 10) f.brushed = true;
    if (f.fired && s.alive && canBeHit() && flareGap(f, s.x, s.y) < f.half + hitRadius() * 0.6) {
      if (s.shield) shieldBreak({ x: s.x, y: s.y });
      else crash({ vx: 0, vy: 0 });
    }
    if (f.fired) {
      // Embers thrown off the loop, mostly outwards.
      for (let k = 0; k < 4; k += 1) {
        if (rng() > dt * 60) continue;
        const a = rng() * Math.PI * 2;
        const x = f.cx + Math.cos(a) * f.r;
        const y = f.cy + Math.sin(a) * f.r;
        if (x < 0 || x > W || y < 0 || y > H) continue;
        const v = 25 + rng() * 55;
        const out = rng() < 0.75 ? 1 : -1;
        addParticle({ x, y, vx: Math.cos(a) * v * out + (rng() - 0.5) * 20, vy: Math.sin(a) * v * out + (rng() - 0.5) * 20, life: 0.3 + rng() * 0.4, max: 0.7, color: pick([PAL.white, PAL.gold, PAL.amber, PAL.amber, PAL.hull]), size: rng() < 0.3 ? 2 : 1, drag: 2 });
      }
    }
    if (f.t >= FLARE_WARN + FLARE_FIRE) {
      if (f.brushed && s.alive) awardTrophy('flare');
      state.flares.splice(i, 1);
    }
  }
}

function drawFlareWarnings() {
  for (const f of state.flares) {
    if (f.fired) continue;
    // The dashes blink faster as the blaze gets close.
    const rate = 4 + 12 * (f.t / FLARE_WARN);
    if (Math.floor(f.t * rate) % 2) continue;
    ctx.drawImage(f.warnArt, 0, 0);
    for (const [x, y] of f.feet) {
      const fx = Math.max(3, Math.min(W - 8, x - 2));
      const fy = Math.max(3, Math.min(H - 10, y - 3));
      drawText(ctx, '!', fx, fy, { color: PAL.gold });
    }
  }
}

function drawFlareBeams() {
  for (const f of state.flares) {
    if (!f.fired) continue;
    const left = FLARE_WARN + FLARE_FIRE - f.t;
    ctx.globalAlpha = Math.min(1, left / 0.15);
    ctx.drawImage(f.beamFrames[Math.floor(state.clock * 18) % FLARE_FRAMES], 0, 0);
    ctx.globalAlpha = 1;
  }
}

// The ship can be hit unless it is recovering, on autopilot or in god mode.
function canBeHit() {
  return state.ship.grace <= 0 && state.auto <= 0 && !state.god;
}

function shieldBreak(rock) {
  awardTrophy('shield');
  const s = state.ship;
  s.shield = false;
  s.grace = SHIELD_GRACE;
  state.shake = 0.2;
  burst(rock.x, rock.y, 24, [PAL.glassHi, PAL.glass, PAL.white], 110);
  popup('SHIELD LOST', s.x, s.y - 16, PAL.glass);
  pilot.react('nearMiss', { dir: rock.x < s.x ? -1 : 1 });
  audio.sfx('shield');
}

function crash(rock) {
  const s = state.ship;
  s.alive = false;
  pilot.react('hit');
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
  state.radar = 0;
  state.auto = 0;
  state.ghosts = [];
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
  state.waves = [];
  state.flares = [];
  state.flareTimer = FIRST_FLARE_DELAY;
  state.particles = [];
  state.popups = [];
  state.spawnBudget = 0;
  state.cometTimer = 0;
  state.wellTimer = FIRST_WELL_DELAY;
  state.capsuleTimer = CAPSULE_FIRST;
  state.lastShield = -Infinity;
  state.lastCapsule = null;
  state.slow = 0;
  state.mini = 0;
  state.radar = 0;
  state.auto = 0;
  state.ghosts = [];
  state.ship = freshShip();
  state.nearMisses = 0;
  state.streak = 0;
  state.bestStreak = 0;
  state.lastNearAt = -10;
  state.callout = null;
  state.runTrophies = 0;
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
  pilot.reset();
  state.rocks = leftover;
  state.mode = 'intro';
  state.godRun = state.god;
  state.introT = 0;
  state.ship.y = H + 30;
  audio.unlock();
  audio.setStage(0);
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
  // A run that used god mode is unranked: no personal best and no leaderboard entry.
  const score = state.godRun ? null : board.sanitize(state.time);
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
  state.ship.tx = null;
  state.ship.ty = null;
  joystick.reset();
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
  if (state.callout) {
    state.callout.t += dt;
    if (state.callout.t > CALLOUT_LIFE) state.callout = null;
  }
  if (state.mode !== 'paused' && state.toasts.length) {
    const toast = state.toasts[0];
    if (toast.t === 0) {
      audio.sfx('trophy');
      // A ring of gold sparkles where the badge will settle.
      const [bx, by] = toastBadgeCentre(1);
      for (let k = 0; k < 24; k += 1) {
        const a = (k / 24) * Math.PI * 2;
        addParticle({ x: bx + Math.cos(a) * 6, y: by + Math.sin(a) * 6, vx: Math.cos(a) * 55, vy: Math.sin(a) * 55, life: 0.6, max: 0.6, color: pick([PAL.gold, PAL.white, PAL.amber]), size: 1, drag: 3 });
      }
    }
    toast.t += dt;
    if (toast.t > TOAST_LIFE) state.toasts.shift();
  }

  if (state.mode === 'paused') return;

  // Slow time slows everything except the ship, the clock included.
  if (state.slow > 0) state.slow = Math.max(0, state.slow - dt);
  const world = dt * (state.slow > 0 ? SLOW_SCALE : 1);
  if (state.mini > 0) state.mini = Math.max(0, state.mini - world);
  if (state.radar > 0) state.radar = Math.max(0, state.radar - world);
  if (state.auto > 0) updateAutoTimer(world);
  updateGhosts(dt);
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
    for (const [secs, id] of TIME_TROPHIES) if (state.time >= secs) awardTrophy(id);
    if (state.time >= 45 && state.pickups === 0) awardTrophy('purist');
    const stage = stageAt(state.time);
    if (stage !== state.stage) enterStage(stage);
    const def = STAGES[state.stage];
    if (state.auto > 0) {
      autopilot(dt);
    } else {
      moveShipWithKeys(dt);
      moveShipTowardTarget(dt);
    }
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
    if (def.flare) {
      state.flareTimer -= world;
      if (state.flareTimer <= 0) {
        warnFlare();
        state.flareTimer = def.flare * (0.8 + rng() * 0.4);
      }
    }
    state.capsuleTimer -= world;
    if (state.capsuleTimer <= 0) {
      spawnCapsule();
      const [lo, hi] = def.capsule;
      state.capsuleTimer = lo + rng() * (hi - lo);
    }
    exhaust(dt);
    updateWarnings(world);
    updateWells(world, true);
    updateRocks(world, { collide: true });
    updateCapsules(world, true);
    updateWaves(world);
    updateFlares(world);
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

const TIME_TROPHIES = [[30, 'liftoff'], [60, 'orbit'], [90, 'escape'], [120, 'deep']];
const STAGE_TROPHIES = { 2: 'ice', 3: 'magma', 4: 'storm' };

function enterStage(stage) {
  if (STAGE_TROPHIES[stage]) awardTrophy(STAGE_TROPHIES[stage]);
  state.stage = stage;
  state.banner = { title: `STAGE ${stage + 1}`, name: STAGES[stage].name, t: 0 };
  state.warp = Math.max(state.warp, 0.6);
  setNebula(STAGES[stage].nebula);
  audio.setStage(stage);
  audio.sfx('stage');
}

// The touch pad (narrow touch screens) drags the ship like a finger on the field does, but
// PAD_GAIN times as far, so a short thumb movement on the small pad covers the field.
const PAD_GAIN = 1.8;
const joystick = createJoystick(document.getElementById('joystick'), {
  onPress: () => { if (state.mode !== 'playing') primaryAction(); },
  onDrag: (dx, dy) => {
    if (state.mode !== 'playing' || !state.ship.alive) return;
    const s = state.ship;
    const k = fieldScale() * PAD_GAIN * (state.mini > 0 ? MINI_SPEED : 1);
    setTarget((s.tx ?? s.x) + dx * k, (s.ty ?? s.y) + dy * k);
  },
});

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
  state.ship.tx = null; // the keyboard takes over from any drag
  state.ship.ty = null;
  const speed = shipSpeed() * slow;
  moveShipTo(state.ship.x + (dx / len) * speed * dt, state.ship.y + (dy / len) * speed * dt);
}

// The shared top speed, raised while the ship is mini.
function shipSpeed() {
  return SHIP_SPEED * (state.mini > 0 ? MINI_SPEED : 1);
}

// Autopilot: each step, try standing still and the eight directions, look ahead a third of a
// second, and score each by its clearance from rocks, black holes, comet lanes and flares.
// Past AUTO_CLEAR px of clearance every choice counts as safe and the middle of the field
// wins, so the pilot cruises calmly instead of fleeing every distant rock. The ship cannot be
// hit meanwhile; the turn is smoothed so it flies rather than twitches.
function autopilot(dt) {
  const s = state.ship;
  s.tx = null; // the player's steering is ignored until control comes back
  s.ty = null;
  const speed = shipSpeed();
  const hit = hitRadius();
  let best = null;
  for (let a = -1; a < 8; a += 1) {
    const mx = a < 0 ? 0 : Math.cos((a * Math.PI) / 4);
    const my = a < 0 ? 0 : Math.sin((a * Math.PI) / 4);
    let clear = Infinity;
    for (let k = 1; k <= 7; k += 1) {
      const t = k * 0.05;
      const sx = Math.max(SHIP_RADIUS, Math.min(W - SHIP_RADIUS, s.x + mx * speed * Math.min(t, 0.2)));
      const sy = Math.max(SHIP_RADIUS, Math.min(H - SHIP_RADIUS, s.y + my * speed * Math.min(t, 0.2)));
      for (const r of state.rocks) clear = Math.min(clear, Math.hypot(r.x + r.vx * t - sx, r.y + r.vy * t - sy) - r.radius - hit);
      for (const w of state.wells) clear = Math.min(clear, Math.hypot(w.x - sx, w.y - sy) - w.core - 8);
      for (const wn of state.warnings) {
        const v = Math.hypot(wn.vx, wn.vy) || 1;
        clear = Math.min(clear, Math.abs((sx - wn.x) * wn.vy - (sy - wn.y) * wn.vx) / v - 14);
      }
      for (const f of state.flares) clear = Math.min(clear, flareGap(f, sx, sy) - f.half - hit);
    }
    const value = Math.min(clear, AUTO_CLEAR) - 0.05 * Math.hypot(s.x + mx * 12 - W / 2, s.y + my * 12 - H * 0.6);
    if (!best || value > best.value) best = { value, mx, my };
  }
  const ease = Math.min(1, dt * 10);
  s.autoVx += (best.mx - s.autoVx) * ease;
  s.autoVy += (best.my - s.autoVy) * ease;
  moveShipTo(s.x + s.autoVx * speed * dt, s.y + s.autoVy * speed * dt);
}

// Counts the autopilot down: a warning in its last second, then control comes back with a
// moment of safety. A finger already on the field steers again only once it moves.
function updateAutoTimer(world) {
  const before = state.auto;
  state.auto = Math.max(0, state.auto - world);
  if (before > AUTO_WARN && state.auto <= AUTO_WARN) audio.sfx('autowarn');
  if (state.auto === 0) {
    const s = state.ship;
    s.grace = Math.max(s.grace, AUTO_GRACE);
    s.tx = null;
    s.ty = null;
    audio.sfx('autoend');
  }
}

function setTarget(x, y) {
  const s = state.ship;
  s.tx = Math.max(SHIP_RADIUS, Math.min(W - SHIP_RADIUS, x));
  s.ty = Math.max(SHIP_RADIUS, Math.min(H - SHIP_RADIUS, y));
}

// Flies the ship towards a drag target at up to SHIP_SPEED; short moves land at once.
function moveShipTowardTarget(dt) {
  const s = state.ship;
  if (s.tx === null) return;
  const dx = s.tx - s.x;
  const dy = s.ty - s.y;
  const d = Math.hypot(dx, dy);
  const step = shipSpeed() * dt;
  if (d <= step) moveShipTo(s.tx, s.ty);
  else moveShipTo(s.x + (dx / d) * step, s.y + (dy / d) * step);
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
  if (s.tx !== null) {
    s.tx += s.x - ox;
    s.ty += s.y - oy;
  }
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
  const y = fine(state.scroll);
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
  if (state.planet) ctx.drawImage(state.planet.sprite, state.planet.x, fine(state.planet.y));
  const streak = Math.round(state.warp * 14);
  starLayers.forEach((layer, li) => {
    for (const star of layer.stars) {
      const sy = fine(star.y);
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
    const rings = [[32, 12, '#3b2a7a'], [22, 9, PAL.violet], [13, 7, PAL.rose]];
    rings.forEach(([base, n, color], ri) => {
      const radius = base * w.size;
      const count = Math.round(n * w.size);
      ctx.fillStyle = color;
      for (let k = 0; k < count; k += 1) {
        const a = w.spin * (1 + ri * 0.6) + (k / count) * Math.PI * 2;
        ctx.fillRect(Math.round(cx + Math.cos(a) * radius), Math.round(cy + Math.sin(a) * radius * 0.8), ri === 2 ? 2 : 1, 1);
      }
    });
    // Black core with a glowing rim, drawn as a pixel disc.
    const core = w.core;
    const span = Math.ceil(core) + 1;
    for (let y = -span; y <= span; y += 1) {
      for (let x = -span; x <= span; x += 1) {
        const d = Math.hypot(x, y);
        if (d > core + 1.2) continue;
        ctx.fillStyle = d > core - 0.2 ? PAL.rose : d > core - 1.4 ? '#5b1f4f' : '#000000';
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

// Radar: a dotted line ahead of every rock and comet showing where it will be over the next
// RADAR_LOOKAHEAD seconds (straight-line paths; black holes may still bend them).
function drawRadar() {
  if (state.radar <= 0 || state.mode !== 'playing') return;
  const fading = state.radar < 1 && Math.floor(state.radar * 10) % 2;
  if (fading) return;
  for (const r of state.rocks) {
    ctx.fillStyle = r.kind === 'comet' ? PAL.glassHi : CAPSULES.radar.light;
    for (let k = 1; k <= 6; k += 1) {
      const t = (k / 6) * RADAR_LOOKAHEAD;
      const x = Math.round(r.x + r.vx * t);
      const y = Math.round(r.y + r.vy * t);
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      ctx.fillRect(x, y, 1, 1);
      if (k === 6) { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
    }
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

// While mini, the ship leaves fading afterimages that trail behind it as the field scrolls.
function updateGhosts(dt) {
  const s = state.ship;
  for (const g of state.ghosts) { g.life -= dt; g.y += dt * 40; }
  state.ghosts = state.ghosts.filter((g) => g.life > 0);
  if (state.mini <= 0 || state.mode !== 'playing' || !s.alive) { state.ghostClock = 0; return; }
  state.ghostClock -= dt;
  if (state.ghostClock > 0) return;
  state.ghostClock = GHOST_GAP;
  const last = state.ghosts[state.ghosts.length - 1];
  if (last && Math.hypot(last.x - s.x, last.y - s.y) < 1.5) return;
  state.ghosts.push({ x: s.x, y: s.y, life: GHOST_LIFE });
}

function drawGhosts() {
  if (!state.ghosts.length) return;
  const scale = state.mini > 0 ? MINI_SCALE : 1;
  const w = Math.round(SHIP_W * scale);
  const h = Math.round(SHIP_H * scale);
  ctx.save();
  for (const g of state.ghosts) {
    ctx.globalAlpha = 0.45 * (g.life / GHOST_LIFE);
    ctx.drawImage(trailGhost, Math.round(g.x - w / 2), Math.round(g.y - h / 2), w, h);
  }
  ctx.restore();
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
  const boost = state.mode === 'intro' ? 6 : state.mini > 0 ? 3 : 0;
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
  if (state.auto > 0) drawAutopilot(s, scale);
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

// Autopilot: corner brackets lock onto the ship and a dotted line shows where it is heading.
// Both blink in the last second, before control comes back.
function drawAutopilot(s, scale) {
  if (state.auto <= AUTO_WARN && Math.floor(state.clock * 8) % 2) return;
  const color = CAPSULES.auto.light;
  ctx.fillStyle = color;
  const r = Math.round(14 * scale) + 3 + (Math.floor(state.clock * 6) % 2);
  const arm = 4;
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x = Math.round(s.x) + dx * r;
    const y = Math.round(s.y) + dy * r;
    ctx.fillRect(dx < 0 ? x : x - arm + 1, y, arm, 1);
    ctx.fillRect(x, dy < 0 ? y : y - arm + 1, 1, arm);
  }
  const len = Math.hypot(s.autoVx, s.autoVy);
  if (len < 0.2) return;
  const ux = s.autoVx / len;
  const uy = s.autoVy / len;
  const step = Math.floor(state.clock * 12) % 2;
  for (let k = 0; k < 5; k += 1) {
    const d = r + 4 + k * 6 + step * 3;
    ctx.fillRect(Math.round(s.x + ux * d), Math.round(s.y + uy * d), 2, 2);
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

const CALLOUT_LIFE = 0.75; // s
const TOAST_LIFE = 3; // s a trophy banner stays, including its entrance and exit
const TOAST_IN = 0.55;
const TOAST_OUT = 0.45;

// The callout sits under the timer, out of the ship's way. It pops in large, settles, then
// blinks out; the closest passes and long streaks are bigger and gold.
function drawCallout() {
  const c = state.callout;
  if (!c) return;
  const left = CALLOUT_LIFE - c.t;
  if (left < 0.2 && Math.floor(left * 20) % 2) return;
  const big = c.tier >= 1;
  const scale = c.t < 0.07 ? (big ? 4 : 3) : big ? 3 : 2;
  const color = c.t < 0.1 ? PAL.white : c.tier === 2 ? PAL.gold : c.tier === 1 ? PAL.amber : PAL.glassHi;
  const y = 32 - (scale - 2) * 4;
  drawText(ctx, c.text, W / 2, y, { scale, align: 'center', color, shadow: PAL.ink });
  if (c.sub) drawText(ctx, c.sub, W / 2, y + scale * 8 + 3, { align: 'center', color: PAL.gold });
}

const easeOutBackSoft = (p) => 1 + 1.6 * (p - 1) ** 3 + 0.6 * (p - 1) ** 2;

// The trophy banner sits in the top-right corner, under the stage readout, away from the
// middle of the field. TOAST_W x TOAST_H, sliding in from the right edge.
const TOAST_W = 140;
const TOAST_H = 40;
const TOAST_TOP = 28;
function toastLeft(p) {
  return Math.round(W - 6 - TOAST_W + (1 - p) * (TOAST_W + 12));
}
function toastBadgeCentre(p) {
  return [toastLeft(p) + 20, TOAST_TOP + TOAST_H / 2];
}

// A trophy slides in from the right edge on a panel, its badge swelling into place with a
// breathing glow and circling sparkles, its name typing out; then it slides away.
function drawToast() {
  const toast = state.toasts[0];
  if (!toast || state.mode === 'title' || state.mode === 'paused') return;
  const t = toast.t;
  const pin = Math.min(1, t / TOAST_IN);
  const pout = t > TOAST_LIFE - TOAST_OUT ? (t - (TOAST_LIFE - TOAST_OUT)) / TOAST_OUT : 0;
  const p = easeOutBackSoft(pin) * (1 - pout * pout);
  const x = toastLeft(p);
  const y = TOAST_TOP;
  panel(x, y, TOAST_W, TOAST_H);
  ctx.fillStyle = PAL.gold;
  ctx.fillRect(x + 1, y + 2, 1, TOAST_H - 4);
  const [bx, by] = [x + 20, y + TOAST_H / 2];
  // Glow behind the badge: a dithered disc that breathes.
  const glow = 12 + Math.sin(t * 6) * 2;
  ctx.fillStyle = 'rgba(255, 209, 102, 0.3)';
  for (let gy = -glow; gy <= glow; gy += 1) {
    for (let gx = -glow; gx <= glow; gx += 1) {
      if (Math.hypot(gx, gy) > glow || ((gx + gy) & 1)) continue;
      ctx.fillRect(Math.round(bx + gx), Math.round(by + gy), 1, 1);
    }
  }
  // The badge swells to 1.6 times its size.
  const art = trophyArt(toast.id).earned;
  const grow = Math.min(1, Math.max(0, (t - 0.15) / 0.35));
  const size = Math.max(1, Math.round(32 * easeOutBackSoft(grow)));
  ctx.drawImage(art, Math.round(bx - size / 2), Math.round(by - size / 2), size, size);
  for (let k = 0; k < 3; k += 1) {
    const a = t * 3 + (k * Math.PI * 2) / 3;
    const sx = Math.round(bx + Math.cos(a) * 18);
    const sy = Math.round(by + Math.sin(a) * 18);
    ctx.fillStyle = PAL.white;
    ctx.fillRect(sx, sy, 1, 1);
    if (Math.sin(t * 9 + k) > 0) { ctx.fillRect(sx - 1, sy, 3, 1); ctx.fillRect(sx, sy - 1, 1, 3); }
  }
  const name = trophies.get(toast.id).name.toUpperCase();
  const reveal = Math.max(0, Math.floor((t - 0.35) * 30));
  drawText(ctx, 'TROPHY!', x + 40, y + 9, { color: PAL.gold });
  drawText(ctx, name.slice(0, reveal), x + 40, y + 23, { color: PAL.white });
}

function drawHud() {
  drawText(ctx, formatTime(state.time).replace(' ', ''), 8, 7, { scale: 2, color: state.slow > 0 ? CAPSULES.slow.light : PAL.white });
  drawText(ctx, `STAGE ${state.stage + 1}`, W - 8, 7, { align: 'right', color: PAL.gold });
  if (state.best > 0) drawText(ctx, `BEST ${state.best.toFixed(2)}`, W - 8, 17, { align: 'right', color: PAL.steel });
  let row = 26;
  if (state.ship.shield) { drawText(ctx, 'SHIELD', 8, row, { color: CAPSULES.shield.light }); row += 10; }
  if (state.slow > 0) { timerBar('SLOW', 8, row, state.slow / SLOW_SECONDS, CAPSULES.slow.light); row += 10; }
  if (state.mini > 0) { timerBar('MINI', 8, row, state.mini / MINI_SECONDS, CAPSULES.mini.light); row += 10; }
  if (state.radar > 0) { timerBar('RADAR', 8, row, state.radar / RADAR_SECONDS, CAPSULES.radar.light); row += 10; }
  if (state.auto > 0) timerBar('AUTOPILOT', 8, row, state.auto / AUTO_SECONDS, CAPSULES.auto.light);
  if (state.god) drawText(ctx, 'GOD MODE', W / 2, H - 14, { align: 'center', color: blink(1) ? PAL.gold : PAL.amber });
  else if (state.godRun) drawText(ctx, 'UNRANKED', W / 2, H - 14, { align: 'center', color: PAL.steel });
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
    drawText(ctx, 'POINT, TOUCH OR USE ARROW KEYS', W / 2, 132, { align: 'center', color: PAL.pale });
    if (blink(1.5)) drawText(ctx, 'TAP OR PRESS ENTER', W / 2, 148, { align: 'center', color: PAL.mint });
  }
  if (state.best > 0) drawText(ctx, `BEST ${formatTime(state.best)}`, W / 2, 182, { align: 'center', color: PAL.steel });
  if (state.god) drawText(ctx, 'GOD MODE', W / 2, 196, { align: 'center', color: blink(1) ? PAL.gold : PAL.amber });
}

// The pause screen hides the field (no rocks, comets, wells or capsules), so a pause can't be
// used to plan a route. It shows a standby scene instead: the stage's sky, dimmed, with the
// ship hovering large in the middle.
function drawPaused() {
  ctx.fillStyle = PAL.space;
  ctx.fillRect(0, 0, W, H);
  drawBackground();
  ctx.fillStyle = 'rgba(9, 8, 24, 0.6)';
  ctx.fillRect(0, 0, W, H);

  // Slow twinkles drifting across the dimmed sky.
  const twinkleRng = makeRng(7);
  for (let i = 0; i < 18; i += 1) {
    const x = Math.floor(twinkleRng() * W);
    const y = fine((twinkleRng() * H + state.clock * (4 + twinkleRng() * 6)) % H);
    const on = Math.sin(state.clock * 2 + i) > 0.3;
    ctx.fillStyle = on ? PAL.white : PAL.slate;
    ctx.fillRect(x, y, 1, 1);
    if (on && i % 3 === 0) {
      ctx.fillRect(x - 1, y, 3, 1);
      ctx.fillRect(x, y - 1, 1, 3);
    }
  }

  // The ship, three times size, bobbing gently with a flickering engine.
  const scale = 3;
  const w = SHIP_W * scale;
  const h = SHIP_H * scale;
  const cx = Math.round(W / 2);
  const top = Math.round(34 + Math.sin(state.clock * 1.6) * 3);
  const left = cx - Math.floor(w / 2);
  ctx.drawImage(ship.canvas, left, top, w, h);
  const flame = 3 + (Math.floor(state.clock * 14) % 3);
  const base = top + h - scale;
  ctx.fillStyle = PAL.hull;
  ctx.fillRect(cx - 2 * scale + 1, base, 4 * scale + 1, (flame - 1) * scale);
  ctx.fillStyle = PAL.amber;
  ctx.fillRect(cx - scale + 1, base, 2 * scale + 1, flame * scale);
  ctx.fillStyle = PAL.gold;
  ctx.fillRect(cx - 1, base, 3, (flame + 1) * scale);
  ctx.fillStyle = PAL.white;
  ctx.fillRect(cx - 1, base, 3, scale);

  drawText(ctx, 'PAUSED', W / 2, 140, { scale: 4, align: 'center', color: PAL.gold, shadow: PAL.hullDark });
  if (state.pausedFrom === 'playing') {
    const stage = `STAGE ${state.stage + 1}  ${STAGES[state.stage].name}`;
    drawText(ctx, `${formatTime(state.time)}   ${stage}`, W / 2, 178, { align: 'center', color: PAL.pale });
  }
  if (blink(1)) drawText(ctx, 'TAP TO RESUME', W / 2, 198, { align: 'center', color: PAL.mint });
}

function drawGameOver() {
  const since = state.clock - state.overAt;
  if (since < 0.6) return;
  panel(W / 2 - 112, 44, 224, 150);
  drawText(ctx, 'GAME OVER', W / 2, 54, { scale: 3, align: 'center', color: PAL.hull });
  drawText(ctx, 'SURVIVED', W / 2, 84, { align: 'center', color: PAL.steel });
  drawText(ctx, formatTime(state.time), W / 2, 96, { scale: 3, align: 'center', color: PAL.white });
  if (state.godRun) {
    drawText(ctx, 'GOD MODE: UNRANKED', W / 2, 124, { align: 'center', color: PAL.gold });
  } else if (state.newBest) {
    if (blink(3)) drawText(ctx, 'NEW PERSONAL BEST!', W / 2, 124, { align: 'center', color: PAL.gold });
  } else {
    drawText(ctx, `BEST ${formatTime(state.best)}`, W / 2, 124, { align: 'center', color: PAL.steel });
  }
  drawText(ctx, `REACHED ${STAGES[state.stage].name}`, W / 2, 136, { align: 'center', color: PAL.pale });
  drawText(ctx, `CLOSE CALLS ${state.nearMisses}   BEST STREAK X${state.bestStreak}`, W / 2, 147, { align: 'center', color: PAL.glass });
  if (state.runTrophies) drawText(ctx, `+${state.runTrophies} ${state.runTrophies === 1 ? 'TROPHY' : 'TROPHIES'}`, W / 2, 158, { align: 'center', color: PAL.gold });
  if (canRestart() && blink(1.5)) drawText(ctx, 'TAP TO FLY AGAIN', W / 2, 176, { align: 'center', color: PAL.mint });
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
  drawFlareWarnings();
  drawCapsules();
  drawRadar();
  drawRocks();
  drawFlareBeams();
  drawWaves();
  drawParticles();
  if (state.mode !== 'title') { drawGhosts(); drawShip(); }
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
    drawCallout();
    if (state.banner) drawBanner(state.banner);
  }
  if (state.mode === 'paused') drawPaused();
  if (state.mode === 'over') drawGameOver();
  drawToast();
}

/* -----------------------------------------------------------
 * The pilot portrait under the leaderboard (pilot.js). It is only
 * drawn while the side columns sit beside the game.
 * ----------------------------------------------------------- */
const pilot = createPilot(document.getElementById('pilotFace'));
const wideLayout = window.matchMedia('(min-width: 1000px)');
const phoneSideways = window.matchMedia('(pointer: coarse) and (orientation: landscape) and (max-height: 540px)');
const pilotShown = () => wideLayout.matches && !phoneSideways.matches;
const sideOf = (x) => (x < state.ship.x ? -1 : 1);

// What the pilot can see: how dangerous it is, where the nearest rock is, and what is active.
function pilotView() {
  const s = state.ship;
  const live = state.mode === 'playing' && s.alive;
  let crowd = 0;
  let threat = 0;
  let nearest = 90;
  if (live) {
    for (const r of state.rocks) {
      const gap = Math.hypot(r.x - s.x, r.y - s.y) - r.radius;
      if (gap < 70) crowd += 1 - Math.max(0, gap) / 70;
      if (gap < nearest) { nearest = gap; threat = Math.max(-1, Math.min(1, (r.x - s.x) / 60)); }
    }
  }
  const well = live && state.wells.find((w) => Math.hypot(w.x - s.x, w.y - s.y) < w.reach);
  const warn = live && state.flares.find((f) => !f.fired);
  const fire = live && state.flares.find((f) => f.fired);
  return {
    danger: live ? Math.min(1, state.stage * 0.12 + crowd * 0.3) : 0,
    threat,
    shield: live && s.shield,
    radar: live && state.radar > 0,
    slow: live && state.slow > 0,
    auto: live && state.auto > 0,
    mini: live && state.mini > 0,
    hole: well ? sideOf(well.x) : 0,
    flareWarn: warn ? sideOf(warn.cx) : 0,
    flare: fire ? sideOf(fire.cx) : 0,
  };
}

let lastFrame = 0;
let pending = 0;
function frame(now) {
  const elapsed = lastFrame ? Math.min((now - lastFrame) / 1000, MAX_CATCH_UP) : 0;
  pending += elapsed;
  lastFrame = now;
  while (pending >= STEP) {
    update(STEP);
    pending -= STEP;
  }
  draw();
  if (state.mode !== 'paused' && pilotShown()) {
    pilot.frame(elapsed, pilotView());
    pilot.draw();
  }
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

// Field coordinates of a pointer, allowing for the picture being letterboxed in its box.
function fieldPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const shownW = Math.min(rect.width, rect.height * (W / H));
  const shownH = shownW * (H / W);
  const left = rect.left + (rect.width - shownW) / 2;
  const top = rect.top + (rect.height - shownH) / 2;
  return [((e.clientX - left) / shownW) * W, ((e.clientY - top) / shownH) * H];
}

// Direct control: the ship flies to the pointer (capped at SHIP_SPEED). A mouse steers just by
// moving over the field; a finger steers while touching, with the ship held TOUCH_LEAD above
// the fingertip so the finger never hides it.
const TOUCH_LEAD = 34; // field px
function steerTo(e) {
  const [x, y] = fieldPoint(e);
  setTarget(x, e.pointerType === 'mouse' ? y : y - TOUCH_LEAD);
}

// On the title, pause and game-over screens a finger may be scrolling the page, so a touch
// starts or resumes a run only as a tap: lifted soon, near where it came down.
const TAP_SLOP = 10; // px
const TAP_TIME = 500; // ms
const tap = { id: null, x: 0, y: 0, at: 0 };
function isIdle() { return state.mode === 'title' || state.mode === 'over' || state.mode === 'paused'; }

canvas.addEventListener('pointerdown', (e) => {
  canvas.focus({ preventScroll: true });
  if (e.pointerType !== 'mouse' && isIdle()) {
    Object.assign(tap, { id: e.pointerId, x: e.clientX, y: e.clientY, at: e.timeStamp });
    return;
  }
  e.preventDefault();
  if (state.mode !== 'playing') primaryAction();
  if (state.mode !== 'playing') return;
  if (e.pointerType !== 'mouse') {
    drag.id = e.pointerId;
    try { canvas.setPointerCapture(e.pointerId); } catch {}
  }
  steerTo(e);
}, { passive: false });

canvas.addEventListener('pointermove', (e) => {
  if (state.mode !== 'playing' || !state.ship.alive) return;
  if (e.pointerType === 'mouse') { steerTo(e); return; }
  // A finger held through the intro takes control as soon as play starts.
  if (drag.id === null && e.buttons) drag.id = e.pointerId;
  if (drag.id !== e.pointerId) return;
  e.preventDefault();
  steerTo(e);
}, { passive: false });

const endDrag = (e) => { if (drag.id === e.pointerId) drag.id = null; };
canvas.addEventListener('pointerup', (e) => {
  endDrag(e);
  if (tap.id !== e.pointerId) return;
  tap.id = null;
  const still = Math.hypot(e.clientX - tap.x, e.clientY - tap.y) <= TAP_SLOP;
  if (still && e.timeStamp - tap.at <= TAP_TIME && isIdle()) primaryAction();
});
canvas.addEventListener('pointercancel', (e) => { endDrag(e); if (tap.id === e.pointerId) tap.id = null; });

const MOVE_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'ShiftLeft', 'ShiftRight']);

// FNV-1a, 32 bit.
function fnv1a(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

// The last five letters typed, compared by hash so the code never appears in the source.
let inputTrace = '';
function traceKey(key) {
  if (key.length !== 1 || !/[a-z]/i.test(key)) return;
  inputTrace = (inputTrace + key.toLowerCase()).slice(-5);
  if (inputTrace.length === 5 && fnv1a(inputTrace) === TRAIL_PHASE_SEED) {
    inputTrace = '';
    toggleGodMode();
  }
}

function toggleGodMode() {
  state.god = !state.god;
  if (state.god && ['intro', 'playing', 'paused'].includes(state.mode)) state.godRun = true;
  const s = state.ship;
  const where = state.mode === 'title' ? [W / 2, 206] : [s.x, s.y - 16];
  popup(state.god ? 'GOD MODE ON' : 'GOD MODE OFF', where[0], where[1], PAL.gold);
  audio.sfx(state.god ? 'power' : 'shield');
}

document.addEventListener('keydown', (e) => {
  if (modal.open || e.target instanceof HTMLInputElement) return;
  if (!e.ctrlKey && !e.metaKey && !e.altKey) traceKey(e.key);
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
// 8 x 8 pixel icons for the Pause and Sound buttons, which change with their state.
const ICONS = {
  pause: 'M1 1h2v6H1zM5 1h2v6H5z',
  play: 'M1 1h2v6H1zM3 2h2v4H3zM5 3h2v2H5z',
  sound: 'M0 3h2v2H0zM2 2h1v4H2zM3 1h1v6H3zM5 2h1v1H5zM5 5h1v1H5zM6 3h1v2H6z',
  mute: 'M0 3h2v2H0zM2 2h1v4H2zM3 1h1v6H3zM5 2h1v1H5zM7 2h1v1H7zM6 3h1v2H6zM5 5h1v1H5zM7 5h1v1H7z',
  expand: 'M0 0h3v1H1v2H0zM5 0h3v3H7V1H5zM0 5h1v2h2v1H0zM7 5h1v3H5V7h2z',
  shrink: 'M2 0h1v3H0V2h2zM5 0h1v2h2v1H5zM0 5h3v3H2V6H0zM5 5h3v1H6v2H5z',
};
function setIcon(button, name) {
  button.querySelector('.icon path').setAttribute('d', ICONS[name]);
}

function updateButtons() {
  const paused = state.mode === 'paused';
  setIcon(pauseButton, paused ? 'play' : 'pause');
  setIcon(soundButton, audio.isMuted() ? 'mute' : 'sound');
  pauseButton.disabled = !paused && state.mode !== 'playing' && state.mode !== 'intro';
  pauseButton.querySelector('.label').textContent = paused ? 'Resume' : 'Pause';
  pauseButton.setAttribute('aria-pressed', String(paused));
  pauseButton.classList.toggle('is-on', paused);
  const muted = audio.isMuted();
  soundButton.querySelector('.label').textContent = muted ? 'Sound off' : 'Sound on';
  soundButton.setAttribute('aria-pressed', String(!muted));
  soundButton.classList.toggle('is-off', muted);
  // Between runs a swipe on the field scrolls the page; during a run every touch steers.
  canvas.classList.toggle('is-idle', isIdle());
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

// In full screen on a wide screen, the whole page is laid out at a fixed width and then
// scaled up (or down) as one picture to fill the screen, so the panels, text and game keep
// their proportions. The game runs in field pixels whatever its size on screen, so a bigger
// picture changes nothing about speeds, hitboxes or steering.
const FILL_MIN_WIDTH = 1000; // px: below this the page stacks, and full screen only centers it
const FILL_WIDTH = [1000, 1700]; // px: range of the width the page is laid out at
const FILL_MIN_SCALE = 0.9; // the panels and text never shrink below this when they can help it
const sideLayout = window.matchMedia('(pointer: coarse) and (orientation: landscape) and (max-height: 540px)');
function fitFullscreen() {
  const body = document.body;
  const fill = root.classList.contains('is-fullscreen') && innerWidth >= FILL_MIN_WIDTH && !sideLayout.matches;
  root.classList.toggle('is-fill', fill);
  body.style.width = '';
  body.style.transform = '';
  if (fill) {
    // Try layout widths across the range and keep the one that shows the game biggest
    // without shrinking the panels and text below FILL_MIN_SCALE (or, if every width
    // would, the one that shrinks them least).
    const fitAt = (w) => {
      body.style.width = `${w}px`;
      const h = body.offsetHeight;
      const k = Math.min(innerWidth / w, innerHeight / h);
      return { w, h, k, game: canvas.offsetWidth * k };
    };
    const fits = [];
    for (let w = FILL_WIDTH[0]; w <= FILL_WIDTH[1]; w += 25) fits.push(fitAt(w));
    const readable = fits.filter((f) => f.k >= FILL_MIN_SCALE);
    const best = readable.length
      ? readable.reduce((a, b) => (b.game > a.game ? b : a))
      : fits.reduce((a, b) => (b.k > a.k ? b : a));
    const { w: width, h: height, k: scale } = fitAt(best.w);
    const x = (innerWidth - width * scale) / 2;
    const y = (innerHeight - height * scale) / 2;
    body.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }
  fitCanvas();
}

// Full screen for the whole page (iPhone Safari has no Fullscreen API, so the button stays hidden there).
const root = document.documentElement;
const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
if (document.fullscreenEnabled || document.webkitFullscreenEnabled) {
  fullscreenButton.hidden = false;
  const syncFullscreen = () => {
    const on = Boolean(fullscreenElement());
    root.classList.toggle('is-fullscreen', on);
    fitFullscreen();
    setIcon(fullscreenButton, on ? 'shrink' : 'expand');
    const label = on ? 'Exit full screen' : 'Full screen';
    fullscreenButton.setAttribute('aria-label', label);
    fullscreenButton.title = label;
    fullscreenButton.setAttribute('aria-pressed', String(on));
  };
  fullscreenButton.addEventListener('click', () => {
    if (fullscreenElement()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else {
      const request = root.requestFullscreen || root.webkitRequestFullscreen;
      Promise.resolve(request.call(root)).catch(() => {});
    }
  });
  window.addEventListener('resize', fitFullscreen);
  document.addEventListener('fullscreenchange', syncFullscreen);
  document.addEventListener('webkitfullscreenchange', syncFullscreen);
  syncFullscreen();
}

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
