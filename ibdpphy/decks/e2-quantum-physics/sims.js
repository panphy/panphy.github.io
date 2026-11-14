// Interactive figures for the E.2 deck, drawn over the flat pictures of ../assets/figures.js, which
// stay for print. Controls come from ../assets/sim-control.js.
//   data-photocell  slide 13  ultraviolet on zinc in a photocell: the wavelength, intensity and the
//                             p.d. of the collector (negative slows the electrons, positive speeds
//                             them up) can be set, and the microammeter reads the current
//   data-compton    slide 30  a photon scattered by an electron at rest through an angle θ that can be
//                             set: the scattered photon has a longer wavelength and the electron recoils
import { control, typeset, drawn } from '../assets/sim-control.js';

const NS = 'http://www.w3.org/2000/svg';
const HC = 1239.84;          // hc in eV nm
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let P = null;                // the drawing helpers of figures.js
window.DeckFigures.add(parts => { P = parts; return {}; });

// Puts a live drawing and its controls over a flat figure. Returns the parts to fill.
function mount(fig, viewBox, label, rows) {
  const holder = document.createElement('div');
  holder.className = 'mover sim-live';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', label);
  const box = document.createElement('div');
  box.className = 'sim-rows';
  rows.forEach(row => box.appendChild(row));
  holder.append(svg, box);
  fig.querySelector('svg')?.classList.add('still');
  fig.appendChild(holder);
  typeset(box);
  return svg;
}

// Calls step(dt) on every frame while the slide is shown.
function run(fig, step) {
  const slide = fig.closest('.slide');
  let last = 0;
  const frame = time => {
    requestAnimationFrame(frame);
    if (!slide.classList.contains('active') || document.hidden) { last = 0; return; }
    const dt = last ? Math.min(0.05, (time - last) / 1000) : 0;
    last = time;
    step(dt, time / 1000);
  };
  requestAnimationFrame(frame);
}

// ---- Slide 13: the photocell ----
function photocell(fig) {
  const PHI = 4.30, I_FULL = 2.0;               // zinc's work function (eV); current at full intensity with every electron collected (μA)
  const X0 = 246, X1 = 632, L = X1 - X0;        // the faces of the metal and the collector
  const C = 560;                                // speed in px/s of a 1 eV electron
  const state = { lambda: 250, intensity: 50, V: 0 };   // V: the collector's potential relative to the metal
  const eMax = () => HC / state.lambda - PHI;
  const signed = v => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)} V`;

  const rows = [
    control({ label: 'Wavelength', name: 'wavelength', min: 200, max: 320, step: 1, value: state.lambda, format: v => `${v} nm`, onChange: v => { state.lambda = v; update(); } }),
    control({ label: 'Intensity', name: 'intensity', min: 0, max: 100, step: 5, value: state.intensity, format: v => `${v}%`, onChange: v => { state.intensity = v; update(); } }),
    control({ label: 'Collector p.d.', name: 'potential difference of the collector', min: -2.5, max: 2.5, step: 0.01, value: state.V, format: signed, onChange: v => { state.V = v; update(); } })
  ];
  const svg = mount(fig, '0 -44 800 394', 'Photocell: ultraviolet light falls on a zinc plate in a vacuum tube and releases electrons, which cross towards a collector whose potential a variable supply sets. A microammeter reads the current', rows);
  fig.style.setProperty('--sim-label-w', '200px');

  let s = `<rect x="150" y="20" width="540" height="170" rx="85" class="inset"/>`;
  s += `<rect x="230" y="50" width="16" height="110" rx="4" style="fill:var(--aluminum)"/>` + `<rect x="632" y="50" width="16" height="110" rx="4" style="fill:var(--lead)"/>`;
  s += P.text(222, 236, 'zinc', 'lbl small', 'end') + P.text(222, 268, 'Φ = 4.30 eV', 'lbl mono small', 'end') + P.text(656, 236, 'collector', 'lbl small', 'start');
  s += `<path d="M238,160 V290 H330 M400,290 H455 M615,290 H640 V160" class="cable"/>`;
  // The supply's cells, + on the left (the metal) as drawn; mirrored when the collector is positive.
  s += `<g data-cells><line x1="330" y1="266" x2="330" y2="314" class="tick" style="stroke-width:5"/><line x1="346" y1="276" x2="346" y2="304" class="tick"/><line x1="384" y1="266" x2="384" y2="314" class="tick" style="stroke-width:5"/><line x1="400" y1="276" x2="400" y2="304" class="tick"/><line x1="350" y1="290" x2="380" y2="290" class="guide"/></g>`;
  s += `<g data-signs>${P.text(318, 256, '+', 'lbl strong')}${P.text(412, 256, '−', 'lbl strong')}</g><text data-out="V" x="365" y="346" class="lbl mono small" text-anchor="middle"></text>`;
  s += `<rect x="455" y="262" width="160" height="56" rx="12" class="node"/><text data-out="I" x="535" y="300" class="lbl mono strong" text-anchor="middle"></text>`;
  s += `<g data-light></g><text data-out="hf" x="40" y="-20" class="lbl mono small" text-anchor="start" style="fill:var(--photon)"></text>`;
  s += `<text data-out="none" x="439" y="112" class="lbl italic small" text-anchor="middle">no electrons emitted</text><g data-electrons></g>`;
  svg.innerHTML = s;
  const out = key => svg.querySelector(`[data-out="${key}"]`);
  const light = svg.querySelector('[data-light]'), layer = svg.querySelector('[data-electrons]');

  function update() {
    const E = eMax(), hf = HC / state.lambda;
    out('hf').textContent = `ultraviolet, hf = ${hf.toFixed(2)} eV`;
    out('V').textContent = `${Math.abs(state.V).toFixed(2)} V`;
    const forward = state.V > 0, signs = svg.querySelectorAll('[data-signs] text');
    svg.querySelector('[data-cells]').setAttribute('transform', forward ? 'matrix(-1 0 0 1 730 0)' : '');
    signs[0].textContent = forward ? '−' : '+';
    signs[1].textContent = forward ? '+' : '−';
    svg.querySelector('[data-signs]').style.display = state.V ? '' : 'none';
    // A positive collector collects every electron; a negative one turns back those with less than eV.
    const reach = forward ? 1 : Math.max(0, 1 + state.V / E);
    const I = E > 0 ? I_FULL * state.intensity / 100 * reach : 0;
    out('I').textContent = `${I.toFixed(2)} μA`;
    out('none').style.display = E > 0 || !state.intensity ? 'none' : '';
    // Shorter wavelength, closer waves; more intensity, more of them.
    const beams = state.intensity ? 1 + Math.round(state.intensity / 50) : 0, cycles = Math.round(1500 / state.lambda);
    // Parallel beams, spread evenly down the face of the plate.
    const DX = 128, DY = 79;
    light.innerHTML = Array.from({ length: beams }, (_, k) => {
      const y = 108 + (k - (beams - 1) / 2) * 40;
      return P.wave(224 - DX, y - DY, 224, y, { cycles, amp: 8 });
    }).join('');
  }
  update();
  if (reduce) return;

  // Each electron leaves with a kinetic energy between 0 and E max. A negative collector slows it, so
  // one with exactly e|V| just reaches it; a positive collector speeds every electron across.
  const electrons = [];
  let due = 0;
  run(fig, dt => {
    const E = eMax(), a = -C * C * state.V / (2 * L);
    if (E > 0 && state.intensity) {
      due += dt * 30 * state.intensity / 100;
      while (due >= 1 && electrons.length < 160) {
        due -= 1;
        const el = document.createElementNS(NS, 'circle');
        el.setAttribute('r', '8');
        el.setAttribute('fill', 'url(#g-electron)');
        layer.appendChild(el);
        electrons.push({ el, x: 0, y: 58 + Math.random() * 94, v: C * Math.sqrt(E * Math.random()), age: 0 });
      }
    } else due = 0;
    for (let i = electrons.length - 1; i >= 0; i--) {
      const e = electrons[i];
      e.v -= a * dt; e.x += e.v * dt; e.age += dt;
      if (e.x < 0 || e.x > L || e.age > 8) { e.el.remove(); electrons.splice(i, 1); continue; }
      e.el.setAttribute('cx', (X0 + 9 + e.x * (L - 18) / L).toFixed(1));
      e.el.setAttribute('cy', e.y.toFixed(1));
    }
  });
}

// ---- Slide 30: Compton scattering ----
function compton(fig) {
  const LI = 71.0, SHIFT = 2.43;            // incoming wavelength and h / mc, in pm
  const EX = 400, EY = 235;                 // the electron, at rest
  const LAM = 44, STRETCH = 26, CYCLES = 3;  // drawn wavelength: λi, then the extra per unit of 1 − cos θ (not to scale)
  const T_IN = 1.6, T_OUT = 2.2, T_HOLD = 0.9, CYCLE = T_IN + T_OUT + T_HOLD;
  let theta = 60;

  const rows = [control({ label: 'Angle \\(\\theta\\)', name: 'scattering angle', min: 0, max: 180, step: 1, value: theta, format: v => `${v}°`, onChange: v => { theta = v; update(); } })];
  const svg = mount(fig, '0 50 900 400', 'Compton scattering: a photon hits an electron at rest; the photon leaves at the chosen angle theta with a longer wavelength and the electron recoils', rows);
  fig.style.setProperty('--sim-label-w', '150px');
  fig.style.setProperty('--sim-value-w', '110px');

  const sub = (t, s) => `${t}<tspan dy="7" font-size="70%">${s}</tspan><tspan dy="-7"> </tspan>`;
  let s = `<line x1="60" y1="${EY}" x2="840" y2="${EY}" class="guide"/>`;
  s += `<line data-k="photon-path" class="guide" style="stroke:var(--photon);opacity:.55"/><line data-k="electron-path" class="guide" style="stroke:var(--electron);opacity:.55"/>`;
  s += `<path data-k="arc" class="guide accent"/><text data-k="theta" class="lbl greek" text-anchor="middle">θ</text>`;
  s += P.text(200, EY - 48, 'incoming photon', 'lbl strong');
  s += `<text data-k="out-label" class="lbl strong">scattered photon</text><text data-k="e-label" class="lbl strong">recoiling electron</text>`;
  s += `<text x="40" y="364" class="lbl mono" text-anchor="start">${sub('λ', 'i')}= ${LI.toFixed(1)} pm</text>`;
  s += `<text data-k="lf" x="40" y="400" class="lbl mono" text-anchor="start"></text><text data-k="dl" x="40" y="436" class="lbl mono strong" text-anchor="start"></text>`;
  s += `<circle data-k="flash" cx="${EX}" cy="${EY}" r="0" fill="url(#g-glow)"/><g data-k="in"></g><g data-k="out"></g>`;
  s += `<g data-k="electron">${P.ball(0, 0, 20, 'electron')}</g>`;
  svg.innerHTML = s;
  const k = name => svg.querySelector(`[data-k="${name}"]`);
  const set = (el, attrs) => Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, typeof value === 'number' ? value.toFixed(1) : value));

  // Directions, with y up the screen: the photon above the axis, the electron below it.
  let lf = LI, phi = 0, pe = 0;
  function update() {
    const t = theta * Math.PI / 180, c = Math.cos(t), sn = Math.sin(t);
    lf = LI + SHIFT * (1 - c);
    // Momentum conserved: the electron takes p_i − p_f (in units of h, wavelengths in pm).
    const px = 1 / LI - c / lf, py = sn / lf;
    pe = Math.hypot(px, py) * LI;           // as a multiple of the incoming photon's momentum
    phi = pe > 1e-6 ? Math.atan2(py, px) : Math.PI / 2;
    set(k('photon-path'), { x1: EX, y1: EY, x2: EX + 250 * c, y2: EY - 250 * sn, 'stroke-dasharray': '8 9' });
    set(k('electron-path'), { x1: EX, y1: EY, x2: EX + 320 * Math.cos(phi), y2: EY + 320 * Math.sin(phi), 'stroke-dasharray': '8 9' });
    k('electron-path').style.display = pe > 0.02 ? '' : 'none';
    const r = 90;
    k('arc').setAttribute('d', theta ? `M${EX + r},${EY} A${r},${r} 0 0 0 ${(EX + r * c).toFixed(1)},${(EY - r * sn).toFixed(1)}` : '');
    const half = t / 2;
    set(k('theta'), { x: EX + (r + 30) * Math.cos(half), y: EY - (r + 30) * Math.sin(half) + 14 });
    k('theta').style.display = theta >= 14 ? '' : 'none';
    const lx = EX + 205 * c, ly = Math.max(88, EY - 205 * sn - 18);
    set(k('out-label'), { x: lx, y: ly, 'text-anchor': c > 0.35 ? 'start' : c < -0.35 ? 'end' : 'middle' });
    k('lf').innerHTML = `${sub('λ', 'f')}= ${lf.toFixed(1)} pm`;
    k('dl').innerHTML = `${sub('λ', 'f')}− ${sub('λ', 'i')}= ${(lf - LI).toFixed(2)} pm`;
    if (reduce) draw(T_IN + T_OUT, true);
  }

  // A packet of CYCLES waves centered at distance d from the electron along the direction (c, s).
  const packet = (d, c, sn, lam) => {
    const half = CYCLES * lam / 2;
    return P.wave(EX + (d - half) * c, EY - (d - half) * sn, EX + (d + half) * c, EY - (d + half) * sn, { cycles: CYCLES, amp: 13 });
  };
  // Both photons travel at the same speed (c); the struck electron moves off in a straight line at a
  // steady speed, slower than light and in proportion to its momentum, until it leaves the picture.
  const C_PX = 160, E_PX = 70;           // px/s: photon, and electron per unit of momentum (p_e / p_i)
  function draw(time, still = false) {
    const t = theta * Math.PI / 180, lamF = LAM + STRETCH * (1 - Math.cos(t));
    const dIn = CYCLES * LAM / 2 + 22 + C_PX * Math.max(0, T_IN - time);
    const after = Math.max(0, time - T_IN);
    const d = still ? CYCLES * LAM / 2 + 40 : dIn, half = CYCLES * LAM / 2;
    k('in').innerHTML = time < T_IN || still ? P.wave(EX - d - half, EY, EX - d + half, EY, { cycles: CYCLES, amp: 13 }) : '';
    k('out').innerHTML = time >= T_IN ? packet(CYCLES * lamF / 2 + 30 + C_PX * after, Math.cos(t), Math.sin(t), lamF) : '';
    const de = E_PX * pe * after;
    set(k('electron'), { transform: `translate(${(EX + de * Math.cos(phi)).toFixed(1)} ${(EY + de * Math.sin(phi)).toFixed(1)})` });
    set(k('e-label'), { x: EX + 150 * Math.cos(phi) + 34, y: Math.min(440, EY + 150 * Math.sin(phi) + 10), 'text-anchor': 'start' });
    k('e-label').style.display = time >= T_IN && pe > 0.02 ? '' : 'none';
    const flash = time >= T_IN && after < 0.5 ? after / 0.5 : 1;
    set(k('flash'), { r: flash < 1 ? 30 + 70 * flash : 0, opacity: 1 - flash });
  }
  update();
  draw(T_IN + T_OUT, true);
  if (reduce) return;
  let clock = 0;
  run(fig, dt => { clock = (clock + dt) % CYCLE; draw(clock); });
}

const live = { photocell, compton };
Object.entries(live).forEach(([name, make]) => {
  document.querySelectorAll(`#deck [data-${name}]`).forEach(fig => drawn(fig).then(() => {
    try { make(fig); } catch (error) { console.warn('The interactive figure could not be drawn; the flat picture stays.', error); }
  }));
});
