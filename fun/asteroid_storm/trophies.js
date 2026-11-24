// Trophies: one-off badges for milestones, kept on this device (localStorage). Each has pixel
// art drawn in code, the milestone that earns it and a short space-physics fact.
import { PAL, CAPSULES } from './art.js?v=20261124-fullscreen';

const STORE_KEY = 'dodgeTrophiesV1'; // { id: ISO date earned }
const SEEN_KEY = 'dodgeTrophiesSeenV1'; // ids the player has looked at since earning
const CAPSULE_KEY = 'dodgeCapsulesSeenV1'; // capsule kinds ever collected, for Full Set

// Emblem colors. Letters in the 12 x 12 maps below.
const INK = {
  w: PAL.white, p: PAL.pale, s: PAL.steel, d: PAL.slate, y: PAL.gold, o: PAL.amber, r: PAL.hull,
  R: PAL.hullDark, c: PAL.glass, C: PAL.glassHi, v: PAL.violet, V: '#c7b4ff', m: PAL.mint, M: '#c9f7de',
  x: '#000000', i: '#9fdcf5', I: '#e4f8ff', q: PAL.rose,
  S: CAPSULES.shield.body, T: CAPSULES.slow.body, N: CAPSULES.mini.body, O: CAPSULES.wave.body,
  A: CAPSULES.radar.body, B: CAPSULES.auto.body,
};

// Plate rims, by group.
const RIM = {
  time: ['#ffd166', '#9c6b14'],
  stage: ['#8fc8de', '#27466b'],
  close: ['#4fd8ec', '#1d566a'],
  hazard: ['#ff5f7e', '#7a2238'],
  capsule: ['#5fe3a1', '#16573a'],
  skill: ['#e9e6f5', '#525d80'],
};

export const TROPHIES = [
  {
    id: 'liftoff', group: 'time', name: 'Lift-Off', goal: 'Survive 30 s.',
    fact: 'A spacecraft needs about 7.8 km/s to stay in low Earth orbit.',
    art: [
      '.....ww.....',
      '....wccw....',
      '....wCcw....',
      '...wwwwww...',
      '...wppppw...',
      '...wpssps...',
      '..rwppppwr..',
      '..rrwppwrr..',
      '..rR.oo.Rr..',
      '.....yo.....',
      '.....oy.....',
      '......o.....',
    ],
  },
  {
    id: 'orbit', group: 'time', name: 'Full Orbit', goal: 'Survive 60 s.',
    fact: 'The International Space Station circles Earth about every 90 minutes.',
    art: [
      '..........w.',
      '....mmmm....',
      '...mMmmTm...',
      '..mMmmmmTm..',
      'yymmmmmmTTyy',
      'y.yyyyyyyy.y',
      '.yymmmmTTyy.',
      '..mmmmmTTm..',
      '...mmmTTm...',
      '....mmmm....',
      '............',
      '............',
    ],
  },
  {
    id: 'escape', group: 'time', name: 'Escape Velocity', goal: 'Survive 90 s.',
    fact: "Escape velocity from Earth's surface is about 11.2 km/s.",
    art: [
      '..........ww',
      '........wwCw',
      '.......wpcCw',
      '..s...wppcw.',
      '.....wpppw..',
      '..rr.wppw...',
      '..rrwppw.s..',
      '...rppwrr...',
      '..yoww.rr...',
      '.yo.r.......',
      'yo..r...s...',
      'o...........',
    ],
  },
  {
    id: 'deep', group: 'time', name: 'Deep Space', goal: 'Survive 120 s.',
    fact: 'Voyager 1, launched in 1977, is now more than 24 billion km from Earth.',
    art: [
      '.....y......',
      '.....y......',
      '..o..y..o...',
      '...o.y.o....',
      '....yyy.....',
      'yyyyywyyyyy.',
      '....yyy.....',
      '...o.y.o....',
      '..o..y..o...',
      '.....y....w.',
      '.....y......',
      '.w..........',
    ],
  },
  {
    id: 'ice', group: 'stage', name: 'Ice Field', goal: 'Reach Stage 3.',
    fact: 'A comet’s tails point away from the Sun, pushed by sunlight and the solar wind.',
    art: [
      '.....ii.....',
      '..i..ii..i..',
      '...i.ii.i...',
      '....iIIi....',
      '.iiiIwwIiii.',
      '.iiiIwwIiii.',
      '....iIIi....',
      '...i.ii.i...',
      '..i..ii..i..',
      '.....ii.....',
      '............',
      '............',
    ],
  },
  {
    id: 'magma', group: 'stage', name: 'Magma Rift', goal: 'Reach Stage 4.',
    fact: "Jupiter's moon Io is the most volcanically active body in the Solar System.",
    art: [
      '...r..o..y..',
      '....o.yo....',
      '.....yyr....',
      '.....oo.....',
      '....doody...',
      '...ddoodd...',
      '..dddordds..',
      '..ddrodsss..',
      '.dddorrddss.',
      '.ddddrossds.',
      'dddddddddsss',
      '............',
    ],
  },
  {
    id: 'storm', group: 'stage', name: 'Deep Storm', goal: 'Reach Stage 5.',
    fact: "All the asteroids in the main belt together have only about 3% of the Moon's mass.",
    art: [
      '.......yyyy.',
      '......yyyy..',
      '.....yyyy...',
      '....yyyy....',
      '...yyyyyyy..',
      '......yyy...',
      '.....yyy....',
      '....yy......',
      '...yy.......',
      '..yw........',
      '..w.........',
      '............',
    ],
  },
  {
    id: 'daredevil', group: 'close', name: 'Daredevil', goal: 'Get 10 close calls in one run.',
    fact: 'Real asteroids are far apart: in the main belt they are typically about a million km from each other.',
    art: [
      '.ss......ss.',
      'sdds....sdds',
      'sdds....sdds',
      '.ss..ww..ss.',
      '....wccw....',
      '....wppw....',
      '...rwppwr...',
      '...rr..rr...',
      '.....oo.....',
      '......o.....',
      '..C.....C...',
      '............',
    ],
  },
  {
    id: 'untouchable', group: 'close', name: 'Untouchable', goal: 'Chain 5 close calls in a streak.',
    fact: 'The International Space Station sometimes fires its thrusters to dodge space debris.',
    art: [
      '...c.cc.c...',
      '.c........c.',
      'c....ww....c',
      '....wccw....',
      'c...wppw...c',
      '...rwppwr...',
      'c..rr..rr..c',
      '.....oo.....',
      '.c........c.',
      '...c.cc.c...',
      '............',
      '............',
    ],
  },
  {
    id: 'flare', group: 'hazard', name: 'Flare Dancer', goal: 'Let a solar flare blaze right past you.',
    fact: "Solar flares erupt along twisted magnetic loops in the Sun's atmosphere.",
    art: [
      '..oooooooo..',
      '.oyyyyyyyyo.',
      'oyrr....rryo',
      'oyr......ryo',
      'or........ro',
      'or...ww...ro',
      'o...wccw...o',
      '....wppw....',
      '...rwppwr...',
      '...rr..rr...',
      '.....oo.....',
      '............',
    ],
  },
  {
    id: 'horizon', group: 'hazard', name: 'Event Horizon', goal: 'Escape from deep inside a black hole’s pull.',
    fact: "Inside a black hole's event horizon, not even light can escape.",
    art: [
      '...v....v...',
      '..v.vvvv..v.',
      '.v.v....v...',
      '...v.qq.v.v.',
      '.v.q.xx.q.v.',
      'v.qxxxxxxq.v',
      'v.qxxxxxxq..',
      '.v.qxxxxq.v.',
      '...v.qq.v...',
      '.v..vvvv.v..',
      '...v....v...',
      '............',
    ],
  },
  {
    id: 'comet', group: 'hazard', name: 'Comet Chaser', goal: 'Have a close call with a comet.',
    fact: "A comet's tail can stretch for millions of kilometers.",
    art: [
      '...........c',
      '.........cc.',
      '.......ccC..',
      '.....cCC....',
      '...cCCw.....',
      '..cCwww.....',
      '.cCwwww.....',
      '.Cwwwww.....',
      '.wwwwC......',
      '..wwC.......',
      '............',
      '............',
    ],
  },
  {
    id: 'fullset', group: 'capsule', name: 'Full Set', goal: 'Collect all six capsule types.',
    fact: 'Uncrewed cargo capsules carry food, water and experiments up to the International Space Station.',
    art: [
      '.SSS....TTT.',
      'SwSSS..TwTTT',
      '.SSS....TTT.',
      '............',
      '.NNN....OOO.',
      'NwNNN..OwOOO',
      '.NNN....OOO.',
      '............',
      '.AAA....BBB.',
      'AwAAA..BwBBB',
      '.AAA....BBB.',
      '............',
    ],
  },
  {
    id: 'shockwave', group: 'capsule', name: 'Sonic Boom', goal: 'Throw 6 rocks with one shockwave.',
    fact: 'A shock wave forms when something moves faster than the speed of sound in its medium.',
    art: [
      '...oooooo...',
      '.oo......oo.',
      'o...yyyy...o',
      'o..y....y..o',
      'o.y..ww..y.o',
      'o.y.wwww.y.o',
      'o.y.wwww.y.o',
      'o.y..ww..y.o',
      'o..y....y..o',
      'o...yyyy...o',
      '.oo......oo.',
      '...oooooo...',
    ],
  },
  {
    id: 'shield', group: 'capsule', name: 'Saved!', goal: 'Let a shield take a hit for you.',
    fact: "Earth's magnetic field deflects most of the charged particles in the solar wind.",
    art: [
      '.cccccccccc.',
      'cCCCCCCCCCCc',
      'cCwwCCCCCCCc',
      'cCwCCCCCCCCc',
      'cCCCCCCCCCCc',
      '.cCCCCCCCCc.',
      '.cCCCCCCCCc.',
      '..cCCCCCCc..',
      '...cCCCCc...',
      '....cCCc....',
      '.....cc.....',
      '............',
    ],
  },
  {
    id: 'purist', group: 'skill', name: 'Purist', goal: 'Survive 45 s without collecting a capsule.',
    fact: 'With no air in space, a spacecraft coasts without slowing down: Newton’s first law at work.',
    art: [
      '...rrrrrr...',
      '..r......r..',
      '.r.......rr.',
      'r.......r..r',
      'r..SSSSr...r',
      'r.SwSSrSS..r',
      'r.SSSrSSS..r',
      'r..SrSSS...r',
      'r..r.......r',
      '.rr.......r.',
      '..r......r..',
      '...rrrrrr...',
    ],
  },
];

const BY_ID = Object.fromEntries(TROPHIES.map((t) => [t.id, t]));

/* -----------------------------------------------------------
 * Pixel art: a 20 x 20 octagonal plate with a two-tone rim in
 * the group's colors and the 12 x 12 emblem in the middle.
 * ----------------------------------------------------------- */
const PLATE = 20;
function plateCanvas(rim, fill, emblem, inkFor) {
  const c = document.createElement('canvas');
  c.width = PLATE;
  c.height = PLATE;
  const g = c.getContext('2d');
  const inside = (x, y, inset) => {
    const a = x - inset;
    const b = y - inset;
    const n = PLATE - inset * 2;
    if (a < 0 || b < 0 || a >= n || b >= n) return false;
    const cut = 4 - inset * 0.5; // cut corners
    return a + b >= cut && (n - 1 - a) + b >= cut && a + (n - 1 - b) >= cut && (n - 1 - a) + (n - 1 - b) >= cut;
  };
  for (let y = 0; y < PLATE; y += 1) {
    for (let x = 0; x < PLATE; x += 1) {
      if (!inside(x, y, 0)) continue;
      // Outer rim light on the upper left, dark on the lower right; then the plate.
      if (!inside(x, y, 1)) g.fillStyle = x + y < PLATE ? rim[0] : rim[1];
      else if (!inside(x, y, 2)) g.fillStyle = PAL.ink;
      else g.fillStyle = fill;
      g.fillRect(x, y, 1, 1);
    }
  }
  emblem.forEach((row, y) => [...row].forEach((ch, x) => {
    const color = inkFor(ch);
    if (!color) return;
    g.fillStyle = color;
    g.fillRect(x + 4, y + 4, 1, 1);
  }));
  return c;
}

const art = {};
export function trophyArt(id) {
  if (art[id]) return art[id];
  const t = BY_ID[id];
  const earned = plateCanvas(RIM[t.group], '#1b1d3a', t.art, (ch) => INK[ch]);
  // Locked: a dim silhouette of the emblem on a grey plate.
  const locked = plateCanvas(['#3a3f60', '#22253f'], '#15162c', t.art, (ch) => (INK[ch] ? '#2c3050' : null));
  art[id] = { earned, locked };
  return art[id];
}

/* -----------------------------------------------------------
 * Storage and the trophy case.
 * ----------------------------------------------------------- */
function load(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value ?? fallback;
  } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function createTrophies({ grid, count, detail }) {
  const earned = load(STORE_KEY, {});
  const seen = new Set(load(SEEN_KEY, []));
  const capsules = new Set(load(CAPSULE_KEY, []));
  let selected = null;

  const dateText = (iso) => {
    try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return ''; }
  };

  function showDetail(id) {
    selected = id;
    const t = BY_ID[id];
    const has = Boolean(earned[id]);
    detail.replaceChildren();
    const name = document.createElement('p');
    name.className = 'trophy-name';
    name.textContent = has ? t.name : `${t.name} (locked)`;
    const goal = document.createElement('p');
    goal.className = 'trophy-goal';
    goal.textContent = has ? `${t.goal} Earned ${dateText(earned[id])}.` : t.goal;
    detail.append(name, goal);
    if (has) {
      const fact = document.createElement('p');
      fact.className = 'trophy-fact';
      fact.textContent = t.fact;
      detail.append(fact);
    }
    if (has && !seen.has(id)) {
      seen.add(id);
      save(SEEN_KEY, [...seen]);
      grid.querySelector(`[data-id="${id}"]`)?.classList.remove('is-new');
    }
    for (const b of grid.querySelectorAll('.trophy')) b.setAttribute('aria-pressed', String(b.dataset.id === id));
  }

  function render() {
    grid.replaceChildren();
    for (const t of TROPHIES) {
      const has = Boolean(earned[t.id]);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'trophy';
      button.dataset.id = t.id;
      button.setAttribute('aria-pressed', String(selected === t.id));
      button.setAttribute('aria-label', has ? `${t.name}, earned` : `${t.name}, locked`);
      if (!has) button.classList.add('is-locked');
      if (has && !seen.has(t.id)) button.classList.add('is-new');
      const img = document.createElement('img');
      img.src = (has ? trophyArt(t.id).earned : trophyArt(t.id).locked).toDataURL();
      img.alt = '';
      img.width = PLATE;
      img.height = PLATE;
      button.append(img);
      button.addEventListener('click', () => showDetail(t.id));
      grid.append(button);
    }
    // Count only current trophies: a retired one (such as Collector) stays stored but not shown.
    count.textContent = `${TROPHIES.filter((t) => earned[t.id]).length} / ${TROPHIES.length}`;
    if (selected) showDetail(selected);
  }

  // Returns true if the trophy is new.
  function award(id) {
    if (earned[id] || !BY_ID[id]) return false;
    earned[id] = new Date().toISOString();
    save(STORE_KEY, earned);
    render();
    return true;
  }

  function noteCapsule(kind) {
    capsules.add(kind);
    save(CAPSULE_KEY, [...capsules]);
    return Object.keys(CAPSULES).every((k) => capsules.has(k)); // retired kinds don't count
  }

  // Forgets every trophy, and which capsule types have been collected.
  function clear() {
    for (const id of Object.keys(earned)) delete earned[id];
    seen.clear();
    capsules.clear();
    try { [STORE_KEY, SEEN_KEY, CAPSULE_KEY].forEach((k) => localStorage.removeItem(k)); } catch {}
    selected = null;
    detail.replaceChildren();
    render();
  }

  render();
  return { award, clear, has: (id) => Boolean(earned[id]), noteCapsule, get: (id) => BY_ID[id] };
}
