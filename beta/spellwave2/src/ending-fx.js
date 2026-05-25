// ending-fx.js — Canvas-based visual effects for the Spellwave victory ending.
// Renders: deep-space nebula, particle system (embers, sparkles, bursts), explosion rings.
export function createEndingFX(canvas) {
  if (!canvas) return { setPhase() {}, reset() {}, destroy() {} };

  const ctx = canvas.getContext('2d');
  // If the context is unavailable (too many contexts open, etc.), bail gracefully
  if (!ctx) return { setPhase() {}, reset() {}, destroy() {} };

  let raf = null;
  let lastStamp = null;
  let age = 0;
  let phase = 'idle';

  // ── Sizing ─────────────────────────────────────────────────────────────────
  let W = 0, H = 0;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    if (w === 0 || h === 0) return; // Parent still hidden — skip
    W = w;
    H = h;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  let _resizeObs = null;
  if (typeof ResizeObserver !== 'undefined') {
    _resizeObs = new ResizeObserver(() => { resize(); });
    _resizeObs.observe(canvas);
  }
  // Defer the first resize to the next animation frame so the browser has
  // computed the layout (offsetWidth returns 0 if parent was just un-hidden)
  raf = requestAnimationFrame(() => {
    resize();
    raf = requestAnimationFrame(render);
  });

  // ── Background starfield (pre-generated, static positions) ────────────────
  const STAR_COUNT = 180;
  const bgStars = Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.1 + 0.25,
    phase: Math.random() * Math.PI * 2,
    speed: Math.random() * 1.2 + 0.5,
  }));

  // ── Particle pool ─────────────────────────────────────────────────────────
  const MAX_P = 320;
  // Each slot: { alive, type, x, y, vx, vy, size, alpha, h, s, l, decay }
  const pool = Array.from({ length: MAX_P }, () => ({
    alive: false, type: '', x: 0, y: 0, vx: 0, vy: 0,
    size: 0, alpha: 0, h: 0, s: 0, l: 0, decay: 0,
  }));

  function getFree() {
    for (let i = 0; i < MAX_P; i++) if (!pool[i].alive) return pool[i];
    // Evict the oldest burst particle, else first slot
    const burst = pool.find(p => p.type === 'burst');
    return burst || pool[0];
  }

  // ── Spawn helpers ─────────────────────────────────────────────────────────
  function spawnEmber() {
    const p = getFree();
    const side = Math.random();
    p.alive = true; p.type = 'ember';
    p.x = (Math.random() * 0.72 + 0.14) * W;
    p.y = H * (0.82 + side * 0.22);
    p.vx = (Math.random() - 0.5) * 0.55;
    p.vy = -(Math.random() * 1.8 + 0.8);
    p.size = Math.random() * 2.2 + 0.6;
    p.alpha = Math.random() * 0.5 + 0.3;
    p.h = 36 + Math.random() * 22;
    p.s = 80 + Math.random() * 18;
    p.l = 65 + Math.random() * 20;
    p.decay = 0.0028 + Math.random() * 0.002;
  }

  function spawnSparkle(cx, cy) {
    const p = getFree();
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 5.5 + 1.5;
    p.alive = true; p.type = 'sparkle';
    p.x = cx; p.y = cy;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed - 1.2;
    p.size = Math.random() * 2.8 + 1.2;
    p.alpha = 0.9 + Math.random() * 0.1;
    // Alternate gold/blue
    if (Math.random() < 0.55) { p.h = 44 + Math.random() * 16; p.s = 92; p.l = 78; }
    else { p.h = 205 + Math.random() * 35; p.s = 80; p.l = 84; }
    p.decay = 0.022 + Math.random() * 0.018;
  }

  function spawnBurst(cx, cy) {
    const count = Math.min(140, MAX_P - pool.filter(p => p.alive).length + 60);
    for (let i = 0; i < count; i++) {
      const p = getFree();
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 11 + 2.5;
      p.alive = true; p.type = 'burst';
      p.x = cx; p.y = cy;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.size = Math.random() * 2.6 + 0.8;
      p.alpha = Math.random() * 0.55 + 0.35;
      if (Math.random() < 0.6) { p.h = 44 + Math.random() * 18; p.s = 85; p.l = 78; }
      else { p.h = 200 + Math.random() * 55; p.s = 72; p.l = 86; }
      p.decay = 0.03 + Math.random() * 0.025;
    }
  }

  function spawnMote() {
    const p = getFree();
    p.alive = true; p.type = 'mote';
    p.x = Math.random() * W;
    p.y = Math.random() * H;
    p.vx = (Math.random() - 0.5) * 0.12;
    p.vy = -(Math.random() * 0.22 + 0.04);
    p.size = Math.random() * 2.5 + 1;
    p.alpha = Math.random() * 0.22 + 0.06;
    p.h = 225 + Math.random() * 70;
    p.s = 62 + Math.random() * 28;
    p.l = 68 + Math.random() * 20;
    p.decay = 0.0006 + Math.random() * 0.0008;
  }

  // ── Explosion rings ───────────────────────────────────────────────────────
  const rings = [];
  function spawnRings(cx, cy) {
    const maxR = Math.hypot(W, H) * 0.65;
    rings.push({ x: cx, y: cy, r: 2, maxR: maxR * 0.9, alpha: 0.72, speed: 5.2, color: [255, 253, 240] });
    rings.push({ x: cx, y: cy, r: 2, maxR: maxR * 0.62, alpha: 0.50, speed: 3.6, color: [160, 200, 255] });
    rings.push({ x: cx, y: cy, r: 2, maxR: maxR * 0.38, alpha: 0.38, speed: 2.2, color: [255, 225, 138] });
  }

  function updateRings(dt) {
    for (let i = rings.length - 1; i >= 0; i--) {
      const ring = rings[i];
      ring.r += ring.speed * dt * 220;
      ring.alpha = Math.max(0, ring.alpha - dt * 0.55);
      const progress = ring.r / ring.maxR;
      const fade = ring.alpha * (1 - progress * progress);
      if (fade <= 0 || ring.r > ring.maxR) { rings.splice(i, 1); continue; }
      const [r, g, b] = ring.color;
      ctx.save();
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${r},${g},${b},${fade.toFixed(3)})`;
      ctx.lineWidth = Math.max(1, 2.5 * (1 - progress));
      ctx.stroke();
      ctx.restore();
    }
  }

  // ── Nebula ────────────────────────────────────────────────────────────────
  let nebulaAlpha = 0;
  const NEBULA_LAYERS = [
    // [baseX, baseY, radiusFrac, oscX, oscY, freqX, freqY, phaseShift, r, g, b, maxA]
    [0.25, 0.38, 0.65, 0.055, 0.042, 0.07, 0.055, 0.0, 24, 42, 148, 0.42],
    [0.72, 0.34, 0.52, 0.048, 0.050, 0.062, 0.072, 1.2, 72, 26, 148, 0.32],
    [0.48, 0.64, 0.44, 0.040, 0.038, 0.090, 0.065, 2.4, 10, 96, 128, 0.26],
    [0.18, 0.28, 0.40, 0.044, 0.050, 0.055, 0.060, 0.7, 55, 14, 108, 0.28],
    [0.80, 0.58, 0.36, 0.038, 0.042, 0.066, 0.078, 1.9, 22, 72, 168, 0.24],
    [0.50, 0.40, 0.30, 0.028, 0.022, 0.040, 0.048, 3.1, 200, 148, 50, 0.09],
  ];

  function drawNebula() {
    if (nebulaAlpha <= 0) return;
    const t = age;
    const dim = Math.min(W, H);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const [bx, by, bRad, ox, oy, fx, fy, ps, r, g, b, mA] of NEBULA_LAYERS) {
      const cx = (bx + Math.sin(t * fx + ps) * ox) * W;
      const cy = (by + Math.cos(t * fy + ps) * oy) * H;
      const rad = bRad * dim;
      const a = mA * nebulaAlpha;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      grad.addColorStop(0, `rgba(${r},${g},${b},${a.toFixed(3)})`);
      grad.addColorStop(0.45, `rgba(${r},${g},${b},${(a * 0.5).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();

    // Aurora bands (horizontal sweeps)
    if (nebulaAlpha > 0.2 && (phase === 'crawl' || phase === 'nebula' || phase === 'titlefly')) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const bands = [[0.22, 0.19, 0.9, 80, 195, 255], [0.46, 0.31, 1.3, 60, 160, 200], [0.68, 0.23, 0.7, 100, 100, 220]];
      for (const [yBase, amp, freq, r, g, b] of bands) {
        const yC = (yBase + Math.sin(t * freq) * amp) * H;
        const aF = ((Math.sin(t * freq * 1.4) + 1) * 0.5) * 0.028 * nebulaAlpha;
        if (aF < 0.002) continue;
        const grad = ctx.createLinearGradient(0, yC - 38, 0, yC + 38);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.5, `rgba(${r},${g},${b},${aF.toFixed(4)})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, yC - 38, W, 76);
      }
      ctx.restore();
    }
  }

  // ── Stars ─────────────────────────────────────────────────────────────────
  function drawStars() {
    const t = age;
    ctx.save();
    for (const s of bgStars) {
      const twinkle = 0.55 + 0.45 * Math.sin(t * s.speed + s.phase);
      const alpha = twinkle * (nebulaAlpha > 0.01 ? 0.7 : 0.45);
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(235,240,255,${alpha.toFixed(3)})`;
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Particle update & draw ─────────────────────────────────────────────────
  function updateAndDrawParticles(dt) {
    ctx.save();
    for (const p of pool) {
      if (!p.alive) continue;
      // Physics
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      if (p.type === 'burst') { p.vx *= 0.94; p.vy *= 0.94; }
      if (p.type === 'ember' || p.type === 'mote') { p.vx += (Math.random() - 0.5) * 0.004; }
      if (p.type === 'sparkle') { p.vy += 0.04; } // slight gravity
      p.alpha -= p.decay * dt * 60;
      if (p.alpha <= 0 || p.y < -20 || p.y > H + 30 || p.x < -20 || p.x > W + 20) {
        p.alive = false;
        continue;
      }
      // Draw
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.h},${p.s}%,${p.l}%,${p.alpha.toFixed(3)})`;
      ctx.fill();
      // Glow for sparkles and embers
      if (p.type === 'sparkle' || (p.type === 'ember' && p.size > 1.4)) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.h},${p.s}%,${p.l}%,${(p.alpha * 0.18).toFixed(3)})`;
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ── Phase-based spawning ──────────────────────────────────────────────────
  let _emberAccum = 0;
  let _moteAccum = 0;
  function doSpawning(dt) {
    const liveCount = pool.filter(p => p.alive).length;
    if (phase === 'nebula' || phase === 'titlefly' || phase === 'crawl' || phase === 'stats') {
      _emberAccum += dt;
      const emberRate = phase === 'stats' ? 0.55 : 0.28;
      if (_emberAccum > emberRate && liveCount < MAX_P - 30) {
        spawnEmber();
        _emberAccum = 0;
      }
      _moteAccum += dt;
      if (_moteAccum > 2.8 && liveCount < MAX_P - 20) {
        spawnMote();
        _moteAccum = 0;
      }
    }
  }

  // ── Main render loop ──────────────────────────────────────────────────────
  function render(stamp) {
    raf = requestAnimationFrame(render);
    const dt = lastStamp ? Math.min((stamp - lastStamp) / 1000, 0.05) : 0;
    lastStamp = stamp;
    if (phase === 'idle') return;
    // Re-sync dimensions if canvas was hidden when created (offsetWidth returns 0 when parent is display:none)
    if (W === 0 || H === 0) { resize(); return; }

    age += dt;

    // Nebula fade-in
    if (phase === 'nebula' || phase === 'titlefly' || phase === 'crawl' || phase === 'stats') {
      nebulaAlpha = Math.min(1, nebulaAlpha + dt * 0.14);
    }

    ctx.clearRect(0, 0, W, H);
    drawNebula();
    drawStars();
    updateRings(dt);
    updateAndDrawParticles(dt);
    doSpawning(dt);
  }

  // ── Public API ────────────────────────────────────────────────────────────
  function setPhase(name) {
    if (W === 0 || H === 0) resize(); // Ensure dimensions are set before spawning
    phase = name;
    if (name === 'detonation') {
      spawnBurst(W * 0.5, H * 0.5);
      spawnRings(W * 0.5, H * 0.5);
    } else if (name === 'titlefly') {
      for (let i = 0; i < 55; i++) spawnSparkle(W * 0.5, H * 0.40);
    } else if (name === 'stats') {
      for (let i = 0; i < 24; i++) spawnSparkle(W * 0.5, H * 0.48);
    }
  }

  function reset() {
    phase = 'idle';
    age = 0;
    lastStamp = null;
    nebulaAlpha = 0;
    _emberAccum = 0;
    _moteAccum = 0;
    rings.length = 0;
    for (const p of pool) p.alive = false;
  }

  function destroy() {
    if (_resizeObs) _resizeObs.disconnect();
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  return { setPhase, reset, destroy };
}
