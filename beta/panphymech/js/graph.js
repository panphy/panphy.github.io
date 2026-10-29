// PanPhyMech: data recording and the time graph. Every moving object and spring is
// sampled at a fixed interval of simulated time, so the graph can switch between
// objects and quantities after a run. Exports go to CSV or to PanPhyPlot.
(function (root) {
  const PPM = root.PPM = root.PPM || {};
  const S = PPM.scene;
  const R = root.PanPhyGraphRange;

  const BASE_INTERVAL = 0.01; // s
  const MAX_SAMPLES = 24000; // then every other sample is dropped and the interval doubles
  const PLOT_ROWS = 2500; // rows sent to PanPhyPlot

  // ---------- Recorder ----------

  function createRecorder() {
    const rec = { t: [], cols: new Map(), interval: BASE_INTERVAL, next: 0, keys: [] };

    rec.reset = function reset(scene, sim) {
      rec.t = [];
      rec.cols = new Map();
      rec.interval = BASE_INTERVAL;
      rec.next = 0;
      rec.keys = [];
      scene.bodies.forEach((b) => {
        if (b.fixed) return;
        ['x', 'y', 'vx', 'vy', 'KE', 'GPE', 'EPE'].forEach((q) => rec.keys.push(`${b.id}:${q}`));
      });
      scene.links.forEach((l) => {
        if (l.kind === 'spring') ['ext', 'F', 'EPE'].forEach((q) => rec.keys.push(`${l.id}:${q}`));
      });
      ['KE', 'GPE', 'EPE'].forEach((q) => rec.keys.push(`sys:${q}`));
      rec.keys.forEach((k) => rec.cols.set(k, []));
      if (sim) rec.sample(sim, true);
    };

    rec.sample = function sample(sim, force) {
      if (!force && sim.t + 1e-9 < rec.next) return;
      const scene = sim.scene;
      const put = (k, v) => { const c = rec.cols.get(k); if (c) c.push(v); };
      rec.t.push(sim.t);
      // Solid rods and ropes carry energy of their own.
      const extra = sim.connectorEnergy ? sim.connectorEnergy() : { KE: 0, GPE: 0 };
      let KE = extra.KE; let GPE = extra.GPE; let EPE = 0;
      const springEPE = new Map();
      scene.links.forEach((l) => {
        if (l.kind !== 'spring') return;
        const r = sim.readLink(l.id);
        put(`${l.id}:ext`, r.extension); put(`${l.id}:F`, r.tension); put(`${l.id}:EPE`, r.EPE);
        springEPE.set(l.id, r.EPE);
        EPE += r.EPE;
      });
      scene.bodies.forEach((b) => {
        if (b.fixed) return;
        const r = sim.readBody(b.id);
        if (!r) return;
        let attached = 0;
        scene.links.forEach((l) => { if (l.kind === 'spring' && (l.a === b.id || l.b === b.id)) attached += springEPE.get(l.id) || 0; });
        put(`${b.id}:x`, r.x); put(`${b.id}:y`, r.y); put(`${b.id}:vx`, r.vx); put(`${b.id}:vy`, r.vy);
        put(`${b.id}:KE`, r.KE); put(`${b.id}:GPE`, r.GPE); put(`${b.id}:EPE`, attached);
        KE += r.KE; GPE += r.GPE;
      });
      put('sys:KE', KE); put('sys:GPE', GPE); put('sys:EPE', EPE);
      rec.next = rec.t.length === 1 ? rec.interval : rec.next + rec.interval;
      if (rec.t.length > MAX_SAMPLES) decimate();
    };

    function decimate() {
      const keep = (arr) => arr.filter((v, i) => i % 2 === 0);
      rec.t = keep(rec.t);
      rec.cols.forEach((arr, k) => rec.cols.set(k, keep(arr)));
      rec.interval *= 2;
      rec.next = rec.t[rec.t.length - 1] + rec.interval;
    }

    return rec;
  }

  // ---------- What can be graphed ----------

  const SERIES_COLORS = {
    x: '#2F6FE0', y: '#E8590C', vx: '#2F6FE0', vy: '#E8590C',
    KE: '#E8590C', GPE: '#2F6FE0', EPE: '#2F9E44', E: '#7A8294', ext: '#7048E8', F: '#C2255C'
  };
  const SERIES_COLORS_DARK = {
    x: '#6AA3FF', y: '#FF9A55', vx: '#6AA3FF', vy: '#FF9A55',
    KE: '#FF9A55', GPE: '#6AA3FF', EPE: '#5BD68A', E: '#C3C9D6', ext: '#A98BFF', F: '#FF7AA8'
  };

  const GROUP_LABELS = { position: 'Position', velocity: 'Velocity', energy: 'Energy', extension: 'Extension', force: 'Force' };

  // The quantities for a tracked object, spring or the whole system, by group.
  function groupsFor(scene, track) {
    const s = (key, q, label, tex, unit, extra = {}) => ({ key, q, label, tex, unit, ...extra });
    if (track.type === 'body') {
      const b = S.bodyById(scene, track.id);
      if (!b || b.fixed) return {};
      const id = b.id;
      const hasSpring = scene.links.some((l) => l.kind === 'spring' && (l.a === id || l.b === id));
      const energy = [
        s(`${id}:KE`, 'KE', 'KE', '\\(E_\\mathrm{k}\\)', 'J'),
        s(`${id}:GPE`, 'GPE', 'GPE', '\\(E_\\mathrm{p}\\)', 'J')
      ];
      if (hasSpring) energy.push(s(`${id}:EPE`, 'EPE', 'EPE', '\\(E_\\mathrm{e}\\)', 'J'));
      energy.push(s('', 'E', 'Total', '\\(E_\\mathrm{total}\\)', 'J', { sum: energy.map((x) => x.key) }));
      return {
        position: [s(`${id}:x`, 'x', 'x', '\\(x\\)', 'm'), s(`${id}:y`, 'y', 'y', '\\(y\\)', 'm')],
        velocity: [s(`${id}:vx`, 'vx', 'vx', '\\(v_x\\)', 'm/s'), s(`${id}:vy`, 'vy', 'vy', '\\(v_y\\)', 'm/s')],
        energy
      };
    }
    if (track.type === 'link') {
      const l = S.linkById(scene, track.id);
      if (!l || l.kind !== 'spring') return {};
      return {
        extension: [s(`${l.id}:ext`, 'ext', 'Extension', '\\(\\Delta L\\)', 'm')],
        force: [s(`${l.id}:F`, 'F', 'Tension', '\\(F\\)', 'N')],
        energy: [s(`${l.id}:EPE`, 'EPE', 'EPE', '\\(E_\\mathrm{e}\\)', 'J')]
      };
    }
    const hasSpring = scene.links.some((l) => l.kind === 'spring');
    const energy = [s('sys:KE', 'KE', 'KE', '\\(E_\\mathrm{k}\\)', 'J'), s('sys:GPE', 'GPE', 'GPE', '\\(E_\\mathrm{p}\\)', 'J')];
    if (hasSpring) energy.push(s('sys:EPE', 'EPE', 'EPE', '\\(E_\\mathrm{e}\\)', 'J'));
    energy.push(s('', 'E', 'Total', '\\(E_\\mathrm{total}\\)', 'J', { sum: energy.map((x) => x.key) }));
    return { energy };
  }

  function values(rec, series) {
    if (series.sum) {
      const cols = series.sum.map((k) => rec.cols.get(k)).filter(Boolean);
      if (!cols.length) return null;
      return rec.t.map((_, i) => cols.reduce((acc, c) => acc + (c[i] ?? 0), 0));
    }
    return rec.cols.get(series.key) || null;
  }

  function trackName(scene, track) {
    if (track.type === 'body') { const b = S.bodyById(scene, track.id); return b ? b.name : ''; }
    if (track.type === 'link') { const l = S.linkById(scene, track.id); return l ? l.name : ''; }
    return 'Whole system';
  }

  function formatCell(v) {
    if (v === null || v === undefined || !Number.isFinite(v)) return '';
    return String(Number(v.toPrecision(6)));
  }

  function columnsFor(app) {
    const groups = groupsFor(app.scene, app.track);
    const list = [];
    const seen = new Set();
    Object.keys(groups).forEach((g) => groups[g].forEach((s) => {
      const id = s.key || s.sum.join('+');
      if (seen.has(id)) return;
      seen.add(id);
      list.push({ ...s, group: g });
    }));
    return list;
  }

  function sampleIndices(app) { return R.indices(app.recorder.t, app.graphRange); }

  function toCSV(app) {
    const rec = app.recorder;
    const list = columnsFor(app);
    const cols = list.map((s) => values(rec, s));
    const escape = (value) => '"' + String(value).replaceAll('"', '""') + '"';
    const header = ['t (s)', ...list.map((s) => `${s.label} (${s.unit})`)];
    const lines = [header.map(escape).join(',')];
    sampleIndices(app).forEach((i) => lines.push([formatCell(rec.t[i]), ...cols.map((c) => formatCell(c ? c[i] : null))].map(escape).join(',')));
    return lines.join('\n') + '\n';
  }

  // PanPhyPlot reads the data from the link's hash. Series outside the group on show start hidden.
  function panPhyPlotUrl(app) {
    const rec = app.recorder;
    const list = columnsFor(app);
    const visible = sampleIndices(app);
    const stride = Math.max(1, Math.ceil(visible.length / PLOT_ROWS));
    const idx = visible.filter((_, i) => i % stride === 0);
    const last = visible[visible.length - 1];
    if (last !== undefined && idx[idx.length - 1] !== last) idx.push(last);
    const name = trackName(app.scene, app.track).replace(/[^A-Za-z0-9 .=_-]/g, '').trim();
    const payload = {
      name: ('PanPhyMech ' + name).slice(0, 40),
      columns: [{ name: 't', unit: 's', role: 'X', cells: idx.map((i) => formatCell(rec.t[i])) }].concat(list.map((s) => {
        const v = values(rec, s);
        return { name: s.label, unit: s.unit, role: 'Y', hidden: s.group !== app.graphGroup, cells: idx.map((i) => formatCell(v ? v[i] : null)) };
      }))
    };
    return '/tools/panphyplot.html#import=' + encodeURIComponent(JSON.stringify(payload));
  }

  function downloadText(filename, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------- Graph drawing ----------

  function niceStep(range, target) {
    const raw = range / target;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / mag;
    return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
  }

  function fmtTick(v, step) {
    const digits = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
    return Math.abs(v) < step * 1e-6 ? '0' : v.toFixed(Math.min(digits, 6)).replace('-', '−');
  }

  function createGraph(app, canvas) {
    const ctx = canvas.getContext('2d');
    const g = { hidden: new Set(), hoverX: null };
    const selection = R.mount(canvas, {
      getTimes: () => app.recorder.t,
      getSource: () => app.recorder.cols,
      getRange: () => app.graphRange,
      setRange: (range) => { app.graphRange = range; g.hoverX = null; g.hoverIndex = null; },
      redraw: () => app.requestGraph()
    });
    g.fullGraph = selection.reset;

    g.series = function series() {
      const groups = groupsFor(app.scene, app.track);
      return groups[app.graphGroup] || [];
    };

    g.draw = function draw() {
      selection.sync();
      selection.setPlot(null);
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const W = Math.max(1, rect.width);
      const H = Math.max(1, rect.height);
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cs = getComputedStyle(document.documentElement);
      const col = (n) => cs.getPropertyValue(n).trim();
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      const palette = dark ? SERIES_COLORS_DARK : SERIES_COLORS;
      ctx.fillStyle = col('--surface');
      ctx.fillRect(0, 0, W, H);
      const rec = app.recorder;
      const list = g.series().filter((s) => !g.hidden.has(s.q));
      const pad = { l: 58, r: 14, t: 10, b: 26 };
      const pw = W - pad.l - pad.r;
      const ph = H - pad.t - pad.b;
      if (pw < 40 || ph < 30) return;
      const n = rec.t.length;
      const tEnd = n ? rec.t[n - 1] : 0;
      const { t0: tMin, t1: tMax } = selection.viewBounds(rec.t, app.graphRange);
      const visible = R.indices(rec.t, { start: tMin, end: tMax });
      const i0 = visible.length ? visible[0] : 0;
      const i1 = visible.length ? visible[visible.length - 1] + 1 : 0;
      selection.setPlot({ left: pad.l, top: pad.t, width: pw, height: ph, t0: tMin, t1: tMax });
      const data = list.map((s) => ({ s, v: values(rec, s) }));
      let yMin = Infinity; let yMax = -Infinity;
      data.forEach(({ v }) => { if (!v) return; for (let i = i0; i < i1; i++) { const y = v[i]; if (Number.isFinite(y)) { if (y < yMin) yMin = y; if (y > yMax) yMax = y; } } });
      if (!Number.isFinite(yMin)) { yMin = 0; yMax = 1; }
      if (app.graphGroup === 'energy') { yMin = Math.min(0, yMin); yMax = Math.max(0, yMax); }
      if (yMax - yMin < 1e-9) { const m = Math.abs(yMax) || 1; yMin -= m * 0.5; yMax += m * 0.5; }
      const span = yMax - yMin;
      yMin -= span * 0.06; yMax += span * 0.06;
      const X = (t) => pad.l + ((t - tMin) / (tMax - tMin)) * pw;
      const Y = (y) => pad.t + (1 - (y - yMin) / (yMax - yMin)) * ph;

      // Grid and ticks
      ctx.font = '500 10.5px "IBM Plex Mono", ui-monospace, monospace';
      ctx.lineWidth = 1;
      ctx.strokeStyle = col('--line');
      ctx.fillStyle = col('--ink-3');
      const ys = niceStep(yMax - yMin, Math.max(2, Math.floor(ph / 34)));
      ctx.textAlign = 'right';
      for (let y = Math.ceil(yMin / ys) * ys; y <= yMax; y += ys) {
        const py = Math.round(Y(y)) + 0.5;
        ctx.beginPath(); ctx.moveTo(pad.l, py); ctx.lineTo(W - pad.r, py); ctx.stroke();
        ctx.fillText(fmtTick(y, ys), pad.l - 6, py + 3.5);
      }
      const xs = niceStep(tMax - tMin, Math.max(2, Math.floor(pw / 80)));
      ctx.textAlign = 'center';
      for (let t = Math.ceil(tMin / xs) * xs; t <= tMax + 1e-9; t += xs) {
        const px = Math.round(X(t)) + 0.5;
        ctx.beginPath(); ctx.moveTo(px, pad.t); ctx.lineTo(px, H - pad.b); ctx.stroke();
        ctx.fillText(fmtTick(t, xs), px, H - pad.b + 14);
      }
      ctx.textAlign = 'right';
      ctx.fillText('t / s', W - pad.r, H - 3);
      // Zero line
      if (yMin < 0 && yMax > 0) {
        ctx.strokeStyle = col('--ink-3');
        ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(0)) + 0.5); ctx.lineTo(W - pad.r, Math.round(Y(0)) + 0.5); ctx.stroke();
      }
      const unit = list[0] ? list[0].unit : '';
      ctx.save();
      ctx.translate(13, pad.t + ph / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = col('--ink-3');
      ctx.fillText(unit ? `${GROUP_LABELS[app.graphGroup] || ''} / ${unit}` : '', 0, 0);
      ctx.restore();

      // Series
      ctx.save();
      ctx.beginPath();
      ctx.rect(pad.l, pad.t - 2, pw, ph + 4);
      ctx.clip();
      const stride = Math.max(1, Math.floor((i1 - i0) / (pw * 2)));
      data.forEach(({ s, v }) => {
        if (!v || i1 - i0 < 1) return;
        ctx.strokeStyle = palette[s.q] || col('--ink');
        ctx.lineWidth = s.q === 'E' ? 1.6 : 2;
        ctx.setLineDash(s.q === 'E' ? [6, 4] : []);
        ctx.beginPath();
        for (let i = i0; i < i1; i += stride) {
          const px = X(rec.t[i]); const py = Y(v[i]);
          if (i === i0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.lineTo(X(rec.t[i1 - 1]), Y(v[i1 - 1]));
        ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.restore();

      // Hover readout
      g.hoverIndex = null;
      if (g.hoverX !== null && i1 > i0) {
        const t = tMin + ((g.hoverX - pad.l) / pw) * (tMax - tMin);
        if (t >= tMin && t <= Math.min(tMax, tEnd)) {
          let lo = i0; let hi = i1 - 1;
          while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (rec.t[mid] < t) lo = mid; else hi = mid; }
          const i = Math.abs(rec.t[lo] - t) < Math.abs(rec.t[hi] - t) ? lo : hi;
          g.hoverIndex = i;
          const px = Math.round(X(rec.t[i])) + 0.5;
          ctx.strokeStyle = col('--ink-2');
          ctx.setLineDash([3, 3]);
          ctx.beginPath(); ctx.moveTo(px, pad.t); ctx.lineTo(px, H - pad.b); ctx.stroke();
          ctx.setLineDash([]);
          data.forEach(({ s, v }) => {
            if (!v) return;
            ctx.fillStyle = palette[s.q] || col('--ink');
            ctx.beginPath(); ctx.arc(px, Y(v[i]), 3.5, 0, Math.PI * 2); ctx.fill();
          });
        }
      }
      selection.draw(ctx, col('--accent'));
      if (!n || n < 2) {
        ctx.fillStyle = col('--ink-3');
        ctx.textAlign = 'center';
        ctx.font = '500 12px Figtree, system-ui, sans-serif';
        ctx.fillText(list.length ? 'Press Play to record data.' : 'Select a moving object or a spring, or graph the whole system.', pad.l + pw / 2, pad.t + ph / 2);
      }
    };

    // Value of each series at the hovered time, or the latest sample.
    g.legendValues = function legendValues() {
      const rec = app.recorder;
      const n = rec.t.length;
      if (!n) return { t: null, values: {} };
      const visible = sampleIndices(app);
      const i = g.hoverIndex !== null && g.hoverIndex !== undefined ? g.hoverIndex : visible[visible.length - 1];
      if (i === undefined) return { t: null, values: {} };
      const out = {};
      g.series().forEach((s) => { const v = values(rec, s); out[s.q] = v ? v[i] : null; });
      return { t: rec.t[i], values: out };
    };

    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      g.hoverX = e.clientX - rect.left;
      app.requestGraph();
    });
    canvas.addEventListener('pointerleave', () => { g.hoverX = null; app.requestGraph(); });

    g.palette = () => (document.documentElement.getAttribute('data-theme') === 'dark' ? SERIES_COLORS_DARK : SERIES_COLORS);
    return g;
  }

  PPM.graph = { createRecorder, createGraph, groupsFor, values, sampleIndices, toCSV, panPhyPlotUrl, downloadText, trackName, GROUP_LABELS, formatCell };
})(typeof window !== 'undefined' ? window : globalThis);
