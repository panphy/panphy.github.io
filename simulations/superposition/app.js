// Wave Superposition (beta): two waves, two pulses, and reflection at a fixed or free end.
// One string canvas and one transport serve all three modes; each mode shows only its own controls.
(() => {
  const P = window.SuperpositionPhysics;
  const L = P.STRING_LENGTH;
  const Y_RANGES = [4, 6, 8, 12]; // cm shown above and below the rest position
  const FRAME_STEP = 0.04; // s per step button press
  const RATES = [0.1, 0.25, 0.5, 1, 2];
  const MODES = ['pulses', 'reflection', 'waves'];

  const DEFAULTS = {
    waves: { amplitude1: 3, frequency1: 1, speed1: 1, direction1: 1, amplitude2: 3, frequency2: 1, speed2: 1, direction2: -1, zoom: 1, probe: 2 },
    pulses: { height1: 3, width1: 0.8, height2: 2, width2: 0.6, speed: 0.5, shape: 'hump', probe: 2 },
    reflection: { source: 'pulse', height: 3, width: 0.8, shape: 'hump', amplitude: 2, frequency: 0.6, speed: 1, end: 'fixed', probe: 3 }
  };
  const DEFAULT_SHOW = { c1: true, c2: true, sum: true, probe: true, nodes: true };

  const LEGEND_NAMES = {
    waves: ['Wave 1', 'Wave 2', 'Sum'],
    pulses: ['Pulse 1', 'Pulse 2', 'String'],
    reflection: ['Incident', 'Reflected', 'String']
  };

  const PRESETS = [
    { label: 'Same side', values: { height1: 3, width1: 0.8, height2: 2, width2: 0.6 } },
    { label: 'Opposite', values: { height1: 3, width1: 0.8, height2: -2, width2: 0.6 } },
    { label: 'Cancel out', values: { height1: 3, width1: 0.8, height2: -3, width2: 0.8 } }
  ];

  const SHAPES = [
    { value: 'hump', label: 'Hump', icon: 'M2 14 C6 14 7 3 10 3 C13 3 14 14 18 14' },
    { value: 'fin', label: 'Fin', icon: 'M2 14 L14 3 L18 14' },
    { value: 'square', label: 'Square', icon: 'M2 14 H5 V4 H15 V14 H18' }
  ];

  const clone = (o) => JSON.parse(JSON.stringify(o));

  const state = {
    mode: 'pulses',
    t: 0,
    playing: true,
    rate: 1,
    show: { ...DEFAULT_SHOW },
    settings: clone(DEFAULTS),
    scrubbing: false
  };

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const canvas = $('stringCanvas');
  const ctx = canvas.getContext('2d');
  const tabs = Array.from(document.querySelectorAll('.mode-tab'));
  const legend = $('legend');
  const controls = $('controls');
  const playBtn = $('playBtn');
  const restartBtn = $('restartBtn');
  const stepBackBtn = $('stepBackBtn');
  const stepFwdBtn = $('stepFwdBtn');
  const scrubber = $('scrubber');
  const timeValue = $('timeValue');
  const rateGroup = $('rateGroup');
  const resetBtn = $('resetBtn');
  const readout = $('probeReadout');

  const ICONS = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>',
    replay: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11.94 6.3A7 7 0 1 1 5.04 14.52" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M6.54 6.3L11.94 2.5V10.1Z" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/></svg>'
  };

  // ---------- Mode helpers ----------
  const current = () => state.settings[state.mode];

  function hasTimeline() {
    return state.mode === 'pulses' || (state.mode === 'reflection' && current().source === 'pulse');
  }

  function duration() {
    if (state.mode === 'pulses') return P.twoPulsesDuration(current());
    if (state.mode === 'reflection' && current().source === 'pulse') return P.reflectionDuration(current());
    return Infinity;
  }

  // The vertical scale fits the largest displacement the current settings can give.
  function yRange() {
    const s = current();
    let peak;
    if (state.mode === 'waves') peak = s.amplitude1 + s.amplitude2;
    else if (state.mode === 'pulses') peak = Math.abs(s.height1) + Math.abs(s.height2);
    else peak = 2 * (s.source === 'pulse' ? Math.abs(s.height) : s.amplitude);
    return Y_RANGES.find((r) => r >= peak * 1.15) || Y_RANGES[Y_RANGES.length - 1];
  }

  function viewSpan() {
    return state.mode === 'waves' ? L / current().zoom : L;
  }

  // Component displacements at x (m), time t: [first, second].
  function components(x, t) {
    const s = current();
    if (state.mode === 'waves') {
      return [
        P.sineWave(x, t, { amplitude: s.amplitude1, frequency: s.frequency1, speed: s.speed1, direction: s.direction1 }),
        P.sineWave(x, t, { amplitude: s.amplitude2, frequency: s.frequency2, speed: s.speed2, direction: s.direction2 })
      ];
    }
    if (state.mode === 'pulses') return P.twoPulses(x, t, s);
    return P.reflection(x, t, s);
  }

  // ---------- Theme colors ----------
  let colors = {};
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const get = (name) => cs.getPropertyValue(name).trim();
    colors = {
      c1: get('--wave1-color'), c2: get('--wave2-color'), sum: get('--super-color'),
      ink: get('--ink'), ink2: get('--ink-2'), ink3: get('--ink-3'),
      line: get('--line'), lineStrong: get('--line-strong'), surface: get('--surface'),
      font: get('--font-mono') || 'monospace'
    };
  }

  // ---------- Canvas sizing ----------
  let cssW = 0;
  let cssH = 0;
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    cssW = Math.max(1, Math.round(rect.width));
    cssH = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function plotRect() {
    const left = 38;
    const right = state.mode === 'reflection' ? 30 : 12;
    const top = 14;
    const bottom = 24;
    return { x: left, y: top, w: Math.max(10, cssW - left - right), h: Math.max(10, cssH - top - bottom) };
  }

  // ---------- Drawing ----------
  function draw() {
    if (!cssW) return;
    const t = state.t;
    const s = current();
    const r = plotRect();
    const span = viewSpan();
    const xPx = (x) => r.x + (x / span) * r.w;
    const range = yRange();
    const yPx = (y) => r.y + r.h / 2 - (y / range) * (r.h / 2);
    const xMax = Math.min(span, state.mode === 'reflection' ? L : span);

    ctx.clearRect(0, 0, cssW, cssH);
    drawGrid(r, span, range, xPx, yPx);

    // Sample each curve once per CSS pixel.
    const n = Math.max(2, Math.round(((xMax / span) * r.w)));
    const xs = new Float64Array(n + 1);
    const y1 = new Float64Array(n + 1);
    const y2 = new Float64Array(n + 1);
    for (let i = 0; i <= n; i++) {
      const x = (i / n) * xMax;
      const [a, b] = components(x, t);
      xs[i] = x; y1[i] = a; y2[i] = b;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y - 2, r.w + 2, r.h + 4);
    ctx.clip();

    const pulseLike = hasTimeline();
    if (state.show.c1) drawComponent(xs, y1, colors.c1, pulseLike, xPx, yPx);
    if (state.show.c2) drawComponent(xs, y2, colors.c2, pulseLike, xPx, yPx);

    if (state.mode === 'reflection' && s.source === 'wave' && state.show.nodes) drawStandingWaveGuide(r, xPx, yPx);

    if (state.show.sum) {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const px = xPx(xs[i]);
        const py = yPx(y1[i] + y2[i]);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = colors.sum;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    if (pulseLike) drawDirectionArrows(xPx, yPx);
    ctx.restore();

    if (state.mode === 'reflection') drawEnd(r, xPx, yPx, y1[n] + y2[n]);
    if (state.show.probe) drawProbe(r, xPx, yPx);
  }

  function drawGrid(r, span, range, xPx, yPx) {
    ctx.lineWidth = 1;
    ctx.font = `500 10px ${colors.font}`;
    ctx.fillStyle = colors.ink3;

    // Horizontal grid lines, every 1 cm on small scales and 2 cm on large ones.
    const gridStep = range <= 6 ? 1 : 2;
    const labelStep = gridStep * 2;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let y = -range; y <= range; y += gridStep) {
      if (y === 0) continue;
      const py = Math.round(yPx(y)) + 0.5;
      ctx.strokeStyle = colors.line;
      ctx.beginPath(); ctx.moveTo(r.x, py); ctx.lineTo(r.x + r.w, py); ctx.stroke();
      if (y % labelStep === 0 && Math.abs(y) < range) ctx.fillText(formatNumber(y, 0), r.x - 7, py);
    }
    ctx.fillText('cm', r.x - 7, r.y + 2);

    // Vertical lines; the spacing follows the visible length.
    const tick = span <= 2.01 ? 0.25 : span <= 5.01 ? 0.5 : 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i * tick <= span + 1e-9; i++) {
      const x = i * tick;
      const px = Math.round(xPx(x)) + 0.5;
      ctx.strokeStyle = colors.line;
      ctx.beginPath(); ctx.moveTo(px, r.y); ctx.lineTo(px, r.y + r.h); ctx.stroke();
      const whole = Math.abs(x - Math.round(x)) < 1e-9;
      const last = (i + 1) * tick > span + 1e-9;
      if (whole || tick >= 0.5) {
        const label = whole ? `${Math.round(x)}` : x.toFixed(tick < 0.5 ? 2 : 1);
        ctx.textAlign = last ? 'right' : 'center';
        ctx.fillText(last ? `${label} m` : label, last ? px + 4 : px, r.y + r.h + 7);
      }
    }

    // Rest position of the string.
    const mid = Math.round(yPx(0)) + 0.5;
    ctx.strokeStyle = colors.lineStrong;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(r.x, mid); ctx.lineTo(r.x + r.w, mid); ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawComponent(xs, ys, color, withFill, xPx, yPx) {
    const n = xs.length - 1;
    if (withFill) {
      ctx.beginPath();
      ctx.moveTo(xPx(xs[0]), yPx(0));
      for (let i = 0; i <= n; i++) ctx.lineTo(xPx(xs[i]), yPx(ys[i]));
      ctx.lineTo(xPx(xs[n]), yPx(0));
      ctx.closePath();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const px = xPx(xs[i]);
      const py = yPx(ys[i]);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Arrows over each pulse show which way it travels.
  function drawDirectionArrows(xPx, yPx) {
    const s = current();
    const t = state.t;
    const list = [];
    if (state.mode === 'pulses') {
      const { x1, x2 } = P.pulseStarts(s);
      list.push({ show: state.show.c1, x: x1 + s.speed * t, h: s.height1, dir: 1, color: colors.c1 });
      list.push({ show: state.show.c2, x: x2 - s.speed * t, h: s.height2, dir: -1, color: colors.c2 });
    } else {
      const xi = P.reflectionPulseStart(s) + s.speed * t;
      const sign = s.end === 'fixed' ? -1 : 1;
      list.push({ show: state.show.c1, x: xi, h: s.height, dir: 1, color: colors.c1 });
      list.push({ show: state.show.c2, x: 2 * L - xi, h: sign * s.height, dir: -1, color: colors.c2 });
    }
    for (const a of list) {
      if (!a.show || a.x < 0.05 || a.x > L - 0.05 || a.h === 0) continue;
      const above = a.h >= 0;
      const py = yPx(a.h + (above ? 1.6 : -1.6));
      const cx = xPx(a.x);
      const half = 11;
      ctx.strokeStyle = a.color;
      ctx.fillStyle = a.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - half * a.dir, py);
      ctx.lineTo(cx + (half - 4) * a.dir, py);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + (half + 2) * a.dir, py);
      ctx.lineTo(cx + (half - 5) * a.dir, py - 5);
      ctx.lineTo(cx + (half - 5) * a.dir, py + 5);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Envelope, nodes (N) and antinodes (A) where the reflected wave has arrived.
  function drawStandingWaveGuide(r, xPx, yPx) {
    const s = current();
    const reached = 2 * L - s.speed * state.t; // reflected wave fills x ≥ reached
    if (reached >= L) return;
    const from = Math.max(0, reached);
    const k = (2 * Math.PI * s.frequency) / s.speed;
    const env = (x) => 2 * s.amplitude * Math.abs(s.end === 'fixed' ? Math.sin(k * (L - x)) : Math.cos(k * (L - x)));

    ctx.strokeStyle = colors.ink3;
    ctx.lineWidth = 1.25;
    ctx.setLineDash([2, 4]);
    for (const sign of [1, -1]) {
      ctx.beginPath();
      const steps = Math.max(2, Math.round(((L - from) / L) * r.w));
      for (let i = 0; i <= steps; i++) {
        const x = from + (i / steps) * (L - from);
        const px = xPx(x);
        const py = yPx(sign * env(x));
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.font = `600 10px ${colors.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const yLabel = yPx(-2 * s.amplitude) + 6;
    for (const p of P.standingWavePoints(s)) {
      if (p.x < from + 0.02) continue;
      const px = xPx(p.x);
      if (p.type === 'node') {
        ctx.fillStyle = colors.ink;
        ctx.beginPath(); ctx.arc(px, yPx(0), 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillText('N', Math.min(px, r.x + r.w - 6), yLabel);
      } else {
        ctx.fillStyle = colors.ink2;
        ctx.fillText('A', px, yLabel);
      }
    }
  }

  // Fixed end: a clamp in a wall. Free end: a ring that slides on a smooth rod.
  function drawEnd(r, xPx, yPx, yEnd) {
    const px = xPx(L);
    if (current().end === 'fixed') {
      const w = 14;
      ctx.fillStyle = colors.lineStrong;
      ctx.fillRect(px, r.y, w, r.h);
      ctx.save();
      ctx.beginPath(); ctx.rect(px, r.y, w, r.h); ctx.clip();
      ctx.strokeStyle = colors.ink3;
      ctx.lineWidth = 1;
      for (let y = r.y - w; y < r.y + r.h + w; y += 7) {
        ctx.beginPath(); ctx.moveTo(px, y + w); ctx.lineTo(px + w, y); ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = colors.ink;
      ctx.beginPath(); ctx.arc(px, yPx(0), 4, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = colors.ink3;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(px + 1, r.y + 2); ctx.lineTo(px + 1, r.y + r.h - 2); ctx.stroke();
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(px + 1, yPx(yEnd), 6, 8, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }

  function drawProbe(r, xPx, yPx) {
    const s = current();
    const x = s.probe;
    if (x > viewSpan()) return;
    const [a, b] = components(x, state.t);
    const px = Math.round(xPx(x)) + 0.5;

    ctx.strokeStyle = colors.ink2;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(px, r.y); ctx.lineTo(px, r.y + r.h); ctx.stroke();
    ctx.setLineDash([]);

    // Handle on the axis: drag it, or anywhere on the string.
    ctx.fillStyle = colors.ink;
    ctx.beginPath();
    ctx.moveTo(px, r.y + r.h - 9);
    ctx.lineTo(px - 6, r.y + r.h + 1);
    ctx.lineTo(px + 6, r.y + r.h + 1);
    ctx.closePath();
    ctx.fill();

    const dot = (y, color, radius) => {
      ctx.beginPath();
      ctx.arc(px, yPx(y), radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = colors.surface;
      ctx.stroke();
    };
    if (state.show.c1) dot(a, colors.c1, 4);
    if (state.show.c2) dot(b, colors.c2, 4);
    if (state.show.sum) dot(a + b, colors.sum, 6);
  }

  // ---------- Readouts ----------
  const MINUS = '−';
  function formatNumber(v, digits) {
    const text = Math.abs(v).toFixed(digits);
    if (Number(text) === 0) return (0).toFixed(digits);
    return (v < 0 ? MINUS : '') + text;
  }
  const signed = (v) => (Number(Math.abs(v).toFixed(1)) === 0 ? '0.0' : (v < 0 ? MINUS : '+') + Math.abs(v).toFixed(1));

  function updateReadout() {
    // Keep the row's space when the probe is off, so the canvas never changes size.
    readout.classList.toggle('is-off', !state.show.probe);
    readout.setAttribute('aria-hidden', String(!state.show.probe));
    if (!state.show.probe) return;
    const s = current();
    // Round each part first, so the sum shown always adds up (2.1 + 1.9 = 4.0).
    const [a, b] = components(s.probe, state.t).map((v) => Math.round(v * 10) / 10);
    const names = LEGEND_NAMES[state.mode];
    $('probeX').textContent = s.probe.toFixed(2);
    $('probeName1').textContent = names[0];
    $('probeName2').textContent = names[1];
    $('probeNameSum').textContent = names[2];
    $('probeY1').textContent = signed(a);
    $('probeY2').textContent = signed(b);
    $('probeSum').textContent = signed(a + b);
  }

  function updateTransport() {
    const finite = hasTimeline();
    const end = duration();
    scrubber.hidden = !finite;
    if (finite) {
      scrubber.max = end.toFixed(2);
      scrubber.value = state.t.toFixed(2);
      scrubber.style.setProperty('--pct', `${Math.min(100, (state.t / end) * 100)}%`);
    }
    timeValue.textContent = state.t.toFixed(2);
    const atEnd = finite && state.t >= end - 1e-6;
    const icon = state.playing ? 'pause' : atEnd ? 'replay' : 'play';
    if (playBtn.dataset.icon !== icon) {
      playBtn.dataset.icon = icon;
      playBtn.innerHTML = ICONS[icon];
      const label = icon === 'pause' ? 'Pause' : icon === 'replay' ? 'Replay' : 'Play';
      playBtn.setAttribute('aria-label', label);
      playBtn.title = `${label} (Space)`;
    }
  }

  function refresh() {
    draw();
    updateReadout();
    updateTransport();
  }

  // ---------- Time ----------
  let lastFrame = null;
  function tick(now) {
    if (state.playing && !state.scrubbing) {
      if (lastFrame !== null) {
        const dt = Math.min(0.1, (now - lastFrame) / 1000) * state.rate;
        state.t += dt;
        const end = duration();
        if (state.t >= end) {
          state.t = end;
          state.playing = false;
        }
      }
      lastFrame = now;
      refresh();
    } else {
      lastFrame = null;
    }
    requestAnimationFrame(tick);
  }

  function setTime(t) {
    state.t = Math.max(0, Math.min(duration(), t));
    refresh();
  }

  function togglePlay() {
    if (!state.playing && hasTimeline() && state.t >= duration() - 1e-6) state.t = 0;
    state.playing = !state.playing;
    refresh();
  }

  function restart() {
    state.t = 0;
    state.playing = true;
    refresh();
  }

  function step(direction) {
    state.playing = false;
    setTime(state.t + direction * FRAME_STEP);
  }

  // ---------- Building controls ----------
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function decimals(step) {
    const text = String(step);
    return text.includes('.') ? text.split('.')[1].length : 0;
  }

  // Segmented choice: buttons with aria-pressed.
  function segmented(options, value, onChange, label, extraClass = '') {
    const group = el('div', `seg ${extraClass}`.trim());
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', label);
    for (const opt of options) {
      const btn = el('button', 'seg-btn');
      btn.type = 'button';
      btn.dataset.value = String(opt.value);
      btn.setAttribute('aria-pressed', String(opt.value === value));
      if (opt.title) btn.title = opt.title;
      if (opt.aria) btn.setAttribute('aria-label', opt.aria);
      if (opt.icon) {
        btn.innerHTML = `<svg viewBox="0 0 20 17" aria-hidden="true"><path d="${opt.icon}"/></svg>`;
        if (opt.label) btn.append(el('span', '', opt.label));
      } else {
        btn.textContent = opt.label;
      }
      btn.addEventListener('click', () => {
        group.querySelectorAll('.seg-btn').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        onChange(opt.value);
      });
      group.append(btn);
    }
    return group;
  }

  // A precise number control: typed value, slider, and − / + buttons that repeat when held.
  function numberField(spec) {
    const s = current();
    const digits = decimals(spec.step);
    const id = `f-${state.mode}-${spec.key}`;
    const wrap = el('div', 'field');

    const head = el('div', 'field-head');
    const label = el('label', 'field-label', spec.label);
    label.htmlFor = id;
    const valueBox = el('span', 'field-value');
    const input = el('input', 'field-input');
    input.type = 'number';
    input.id = id;
    input.min = spec.min; input.max = spec.max; input.step = spec.step;
    input.inputMode = 'decimal';
    input.setAttribute('aria-label', `${spec.group ? spec.group + ' ' : ''}${spec.label} in ${spec.unitName || spec.unit}`);
    valueBox.append(input, el('span', 'field-unit', spec.unit));
    head.append(label);
    if (spec.direction) {
      const dirKey = spec.direction;
      head.append(segmented(
        [
          { value: -1, label: '←', aria: `${spec.group} moves left`, title: 'Move left' },
          { value: 1, label: '→', aria: `${spec.group} moves right`, title: 'Move right' }
        ],
        s[dirKey],
        (v) => { current()[dirKey] = v; refresh(); },
        `${spec.group} direction`,
        'seg-mini'
      ));
    }
    head.append(valueBox);

    const row = el('div', 'field-row');
    const minus = el('button', 'step-btn', MINUS);
    const plus = el('button', 'step-btn', '+');
    minus.type = plus.type = 'button';
    minus.setAttribute('aria-label', `Decrease ${spec.label.toLowerCase()}`);
    plus.setAttribute('aria-label', `Increase ${spec.label.toLowerCase()}`);
    minus.tabIndex = plus.tabIndex = -1; // the slider and the typed value already take keys
    const range = el('input', 'range');
    range.type = 'range';
    range.min = spec.min; range.max = spec.max; range.step = spec.step;
    range.setAttribute('aria-label', `${spec.group ? spec.group + ' ' : ''}${spec.label}`);
    row.append(minus, range, plus);
    wrap.append(head, row);

    const show = (v) => {
      input.value = v.toFixed(digits);
      range.value = String(v);
      range.style.setProperty('--pct', `${((v - spec.min) / (spec.max - spec.min)) * 100}%`);
      minus.disabled = v <= spec.min + 1e-9;
      plus.disabled = v >= spec.max - 1e-9;
    };
    const set = (raw) => {
      let v = Number(raw);
      if (!Number.isFinite(v)) { show(current()[spec.key]); return; }
      v = Math.round(v / spec.step) * spec.step;
      v = Math.min(spec.max, Math.max(spec.min, Number(v.toFixed(digits))));
      current()[spec.key] = v;
      show(v);
      if (spec.key === 'zoom') current().probe = Math.min(current().probe, viewSpan());
      if (hasTimeline()) state.t = Math.min(state.t, duration());
      refresh();
    };
    show(s[spec.key]);

    range.addEventListener('input', () => set(range.value));
    input.addEventListener('change', () => set(input.value.replace(MINUS, '-')));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });

    for (const [btn, dir] of [[minus, -1], [plus, 1]]) {
      let timer = null;
      const stop = () => { clearTimeout(timer); clearInterval(timer); timer = null; };
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        set(current()[spec.key] + dir * spec.step);
        timer = setTimeout(() => {
          timer = setInterval(() => set(current()[spec.key] + dir * spec.step), 70);
        }, 380);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, stop));
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set(current()[spec.key] + dir * spec.step); }
      });
    }
    return wrap;
  }

  function card(title, colorVar, ...children) {
    const c = el('section', 'card');
    const h = el('h2', 'card-title');
    if (colorVar) {
      const dot = el('span', 'card-dot');
      dot.style.background = `var(${colorVar})`;
      h.append(dot);
    }
    h.append(title);
    c.append(h, ...children);
    return c;
  }

  function choiceRow(label, group) {
    const row = el('div', 'choice-row');
    row.append(el('span', 'field-label', label), group);
    return row;
  }

  function note(text) {
    return el('p', 'card-note', text);
  }

  function buildControls() {
    controls.replaceChildren();
    const s = current();
    const amp = (key, group) => ({ key, group, label: 'Amplitude', unit: 'cm', min: 0.5, max: 5, step: 0.5 });
    const height = (key, group) => ({ key, group, label: 'Height', unit: 'cm', min: -5, max: 5, step: 0.5 });
    const width = (key, group) => ({ key, group, label: 'Width', unit: 'm', unitName: 'meters', min: 0.2, max: 1.6, step: 0.1 });
    const speed = (key, group, extra = {}) => ({ key, group, label: 'Wave speed', unit: 'm/s', unitName: 'meters per second', min: 0.2, max: 2, step: 0.1, ...extra });

    if (state.mode === 'waves') {
      for (const n of [1, 2]) {
        const g = `Wave ${n}`;
        controls.append(card(g, `--wave${n === 1 ? 1 : 2}-color`,
          numberField(amp(`amplitude${n}`, g)),
          numberField({ key: `frequency${n}`, group: g, label: 'Frequency', unit: 'Hz', unitName: 'hertz', min: 0.1, max: 5, step: 0.1 }),
          numberField(speed(`speed${n}`, g, { min: 0.5, max: 5, direction: `direction${n}` }))
        ));
      }
      controls.append(card('View', null,
        numberField({ key: 'zoom', label: 'Horizontal scale', unit: '×', unitName: 'times', min: 0.5, max: 4, step: 0.1 }),
        note('Two waves on the same string add point by point. Equal waves moving in opposite directions make a standing wave.')
      ));
    } else if (state.mode === 'pulses') {
      for (const n of [1, 2]) {
        const g = `Pulse ${n}`;
        controls.append(card(g, `--wave${n}-color`,
          numberField(height(`height${n}`, g)),
          numberField(width(`width${n}`, g))
        ));
      }
      controls.append(card('String', null,
        numberField(speed('speed', 'String')),
        choiceRow('Shape', segmented(SHAPES, s.shape, (v) => { current().shape = v; refresh(); }, 'Pulse shape', 'seg-icons')),
        choiceRow('Try', presetButtons())
      ));
    } else {
      const sourceChoice = segmented(
        [{ value: 'pulse', label: 'Pulse' }, { value: 'wave', label: 'Continuous wave' }],
        s.source,
        (v) => { current().source = v; state.t = 0; state.playing = true; buildControls(); buildLegend(); refresh(); },
        'Source'
      );
      const sourceCard = s.source === 'pulse'
        ? card('Source', '--wave1-color', choiceRow('Send', sourceChoice),
          numberField(height('height', 'Pulse')),
          numberField(width('width', 'Pulse')),
          choiceRow('Shape', segmented(SHAPES, s.shape, (v) => { current().shape = v; refresh(); }, 'Pulse shape', 'seg-icons')))
        : card('Source', '--wave1-color', choiceRow('Send', sourceChoice),
          numberField(amp('amplitude', 'Wave')),
          numberField({ key: 'frequency', group: 'Wave', label: 'Frequency', unit: 'Hz', unitName: 'hertz', min: 0.2, max: 2, step: 0.1 }));
      controls.append(sourceCard);
      controls.append(card('String', null,
        numberField(speed('speed', 'String')),
        choiceRow('Right end', segmented(
          [
            { value: 'fixed', label: 'Fixed', icon: 'M13 2 V15 M13 4 L17 0 M13 8 L17 4 M13 12 L17 8 M13 16 L17 12 M2 8.5 H13' },
            { value: 'free', label: 'Free', icon: 'M15 1 V16 M2 8.5 H12 M15 8.5 m-3 0 a3 3.6 0 1 0 6 0 a3 3.6 0 1 0 -6 0' }
          ],
          s.end,
          (v) => { current().end = v; refresh(); },
          'Right end',
          'seg-icons'
        )),
        note(s.source === 'pulse'
          ? 'A fixed end turns the pulse upside down. A free end sends it back the right way up. The left end absorbs waves, so you see one reflection.'
          : 'The reflected wave meets the incoming wave and a standing wave builds up from the end. A fixed end is always a node; a free end is an antinode.')
      ));
    }
  }

  function presetButtons() {
    const group = el('div', 'preset-row');
    for (const p of PRESETS) {
      const btn = el('button', 'preset-btn', p.label);
      btn.type = 'button';
      btn.addEventListener('click', () => {
        Object.assign(current(), p.values);
        buildControls();
        restart();
      });
      group.append(btn);
    }
    return group;
  }

  // Legend chips double as show / hide toggles.
  function buildLegend() {
    legend.replaceChildren();
    const names = LEGEND_NAMES[state.mode];
    const items = [
      { key: 'c1', name: names[0], swatch: 'dash', color: '--wave1-color' },
      { key: 'c2', name: names[1], swatch: 'dash', color: '--wave2-color' },
      { key: 'sum', name: names[2], swatch: 'solid', color: '--super-color' },
      { key: 'probe', name: 'Probe', swatch: 'probe', color: '--ink-2' }
    ];
    if (state.mode === 'reflection' && current().source === 'wave') {
      items.push({ key: 'nodes', name: 'Nodes', swatch: 'nodes', color: '--ink' });
    }
    for (const item of items) {
      const btn = el('button', 'legend-chip');
      btn.type = 'button';
      btn.setAttribute('aria-pressed', String(state.show[item.key]));
      btn.title = `Show or hide ${item.name.toLowerCase()}`;
      btn.style.setProperty('--swatch', `var(${item.color})`);
      const sw = {
        dash: '<path d="M1 6 H23" stroke-dasharray="5 3.5"/>',
        solid: '<path d="M1 6 H23" stroke-width="3"/>',
        probe: '<path d="M12 0 V12" stroke-dasharray="2.5 2"/><circle cx="12" cy="6" r="3" fill="currentColor" stroke="none"/>',
        nodes: '<path d="M1 6 C5 0 7 0 12 6 C17 12 19 12 23 6" stroke-dasharray="2 2.5"/><circle cx="12" cy="6" r="2.4" fill="currentColor" stroke="none"/>'
      }[item.swatch];
      btn.innerHTML = `<svg class="legend-swatch" viewBox="0 0 24 12" aria-hidden="true">${sw}</svg>`;
      btn.append(el('span', '', item.name));
      btn.addEventListener('click', () => {
        state.show[item.key] = !state.show[item.key];
        btn.setAttribute('aria-pressed', String(state.show[item.key]));
        refresh();
      });
      legend.append(btn);
    }
  }

  // ---------- Modes ----------
  function setMode(mode, { fromHash = false } = {}) {
    if (!MODES.includes(mode)) mode = 'pulses';
    state.mode = mode;
    tabs.forEach((tab) => {
      const on = tab.dataset.mode === mode;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
    });
    document.body.dataset.mode = mode;
    if (!fromHash) history.replaceState(null, '', `#${mode}`);
    buildLegend();
    buildControls();
    resizeCanvas();
    restart();
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => { if (tab.dataset.mode !== state.mode) setMode(tab.dataset.mode); });
    tab.addEventListener('keydown', (e) => {
      const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!delta) return;
      e.preventDefault();
      const next = tabs[(i + delta + tabs.length) % tabs.length];
      next.focus();
      setMode(next.dataset.mode);
    });
  });

  window.addEventListener('hashchange', () => {
    const mode = location.hash.slice(1);
    if (MODES.includes(mode) && mode !== state.mode) setMode(mode, { fromHash: true });
  });

  // ---------- Transport ----------
  playBtn.addEventListener('click', togglePlay);
  restartBtn.addEventListener('click', restart);
  stepBackBtn.addEventListener('click', () => step(-1));
  stepFwdBtn.addEventListener('click', () => step(1));

  scrubber.addEventListener('input', () => {
    state.scrubbing = true;
    state.playing = false;
    setTime(Number(scrubber.value));
  });
  scrubber.addEventListener('change', () => { state.scrubbing = false; });

  rateGroup.append(segmented(
    RATES.map((r) => ({ value: r, label: `${r}×`, aria: `Play at ${r} times speed` })),
    state.rate,
    (v) => { state.rate = v; },
    'Playback speed',
    'seg-mini'
  ));

  // Reset: this mode's controls, time, playback, view and probe as on arrival.
  resetBtn.addEventListener('click', () => {
    state.settings[state.mode] = clone(DEFAULTS[state.mode]);
    state.show = { ...DEFAULT_SHOW };
    state.rate = 1;
    rateGroup.querySelectorAll('.seg-btn').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.value) === 1)));
    buildLegend();
    buildControls();
    resizeCanvas();
    restart();
  });

  // ---------- Probe dragging ----------
  function probeFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const r = plotRect();
    const x = ((e.clientX - rect.left - r.x) / r.w) * viewSpan();
    const max = state.mode === 'reflection' ? L : viewSpan();
    current().probe = Math.round(Math.min(max, Math.max(0, x)) * 100) / 100;
    refresh();
  }

  let dragging = false;
  canvas.addEventListener('pointerdown', (e) => {
    if (!state.show.probe) return;
    if (e.pointerType === 'touch') {
      const rect = canvas.getBoundingClientRect();
      const r = plotRect();
      const probePx = r.x + (current().probe / viewSpan()) * r.w;
      if (Math.abs(e.clientX - rect.left - probePx) > 28) return;
      e.preventDefault();
    }
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    probeFromEvent(e);
  });
  canvas.addEventListener('pointermove', (e) => { if (dragging) probeFromEvent(e); });
  ['pointerup', 'pointercancel'].forEach((ev) => canvas.addEventListener(ev, () => { dragging = false; }));

  canvas.addEventListener('keydown', (e) => {
    if (!state.show.probe || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault();
    const stepSize = e.shiftKey ? 0.25 : 0.05;
    const max = state.mode === 'reflection' ? L : viewSpan();
    const s = current();
    s.probe = Math.round(Math.min(max, Math.max(0, s.probe + (e.key === 'ArrowRight' ? stepSize : -stepSize))) * 100) / 100;
    refresh();
  });

  // ---------- Keyboard ----------
  // A mouse or touch click leaves no focus on the button, so Space then plays or pauses
  // instead of pressing the button again. Keyboard presses keep focus.
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn && e.detail > 0) btn.blur();
  });
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || e.repeat) return;
    const target = e.target;
    const isSlider = target.matches && target.matches('input[type="range"]');
    if (!isSlider && target.closest && target.closest('input, textarea, select, button')) return;
    e.preventDefault();
    togglePlay();
  });

  // ---------- Start ----------
  window.PanPhyThemeToggle.mount(document.getElementById('theme-button'));
  readColors();
  window.addEventListener('panphy:theme-change', () => { readColors(); refresh(); });

  if (window.ResizeObserver) new ResizeObserver(resizeCanvas).observe(canvas);
  window.addEventListener('resize', resizeCanvas);

  const startMode = location.hash.slice(1);
  setMode(MODES.includes(startMode) ? startMode : 'pulses', { fromHash: true });
  requestAnimationFrame(tick);
})();
