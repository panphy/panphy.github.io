// PanPhyCircuits: time graph of meter readings.
// Every value plotted here is a sample recorded by the solver at a committed
// time step; nothing is interpolated or smoothed.
(function (root) {
  const PPC = root.PPC = root.PPC || {};
  const { units, registry } = PPC;

  // Distinct, color-blind-aware trace colors (dashes also differ per unit).
  const COLORS = ['#2563EB', '#E8590C', '#0F9D58', '#AE3EC9', '#C2255C', '#0B7285', '#7048E8', '#5C940D'];

  function createGraph(app, canvas, legendEl) {
    let lastDraw = 0;

    function series() {
      const out = [];
      let i = 0;
      for (const c of app.doc.components) {
        const def = registry.get(c.type);
        if (!def.meter || !c.props.plot) continue;
        out.push({ key: c.id + ':' + def.meter.quantity, label: c.label, unit: def.meter.unit, color: COLORS[i++ % COLORS.length], comp: c });
      }
      return out;
    }

    function niceStep(range, target) {
      const raw = range / target;
      const mag = Math.pow(10, Math.floor(Math.log10(raw)));
      const n = raw / mag;
      return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
    }

    function draw(force) {
      const now = performance.now();
      if (!force && now - lastDraw < 66) return;
      lastDraw = now;
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.clientWidth, H = canvas.clientHeight;
      if (!W || !H) return;
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
      const g = canvas.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cs = getComputedStyle(canvas);
      const ink = cs.getPropertyValue('--ink').trim() || '#111';
      const ink3 = cs.getPropertyValue('--ink-3').trim() || '#888';
      const line = cs.getPropertyValue('--line').trim() || '#ddd';
      g.clearRect(0, 0, W, H);
      const list = series();
      const tr = app.sim.traces;
      legendEl.innerHTML = '';
      if (!list.length) {
        g.fillStyle = ink3; g.font = '13px Figtree, sans-serif'; g.textAlign = 'center';
        const hasMeter = app.doc.components.some((c) => registry.get(c.type).meter);
        g.fillText(hasMeter ? 'Select an ammeter or voltmeter and switch on “Plot on graph”.' : 'Add an ammeter or voltmeter: its readings are plotted here.', W / 2, H / 2);
        return;
      }
      const win = app.graphWindow;
      const tEnd = tr.t.length ? tr.t[tr.t.length - 1] : 0;
      const t0 = win === 'all' ? (tr.t.length ? tr.t[0] : 0) : Math.max(0, tEnd - Number(win));
      const t1 = Math.max(tEnd, t0 + (win === 'all' ? 1 : Number(win)));
      const unitsUsed = [...new Set(list.map((s) => s.unit))];
      const axes = {};
      for (const u of unitsUsed) {
        let lo = Infinity, hi = -Infinity;
        for (const s of list.filter((x) => x.unit === u)) {
          const arr = tr.series[s.key] || [];
          for (let i = 0; i < arr.length; i++) {
            if (tr.t[i] < t0) continue;
            const v = arr[i];
            if (Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
          }
        }
        if (!Number.isFinite(lo)) { lo = 0; hi = 1; }
        lo = Math.min(lo, 0); hi = Math.max(hi, 0);
        if (hi - lo < 1e-12) hi = lo + (u === 'A' ? 1e-3 : 1);
        const pad = (hi - lo) * 0.08;
        axes[u] = { lo: lo - (lo < 0 ? pad : 0), hi: hi + pad };
      }
      const left = 56, right = unitsUsed.length > 1 ? 56 : 14, top = 10, bottom = 26;
      const pw = W - left - right, ph = H - top - bottom;
      const X = (t) => left + ((t - t0) / (t1 - t0)) * pw;
      // Grid and time axis.
      g.strokeStyle = line; g.lineWidth = 1; g.fillStyle = ink3; g.font = '11px "IBM Plex Mono", monospace';
      const ts = niceStep(t1 - t0, 6);
      g.textAlign = 'center'; g.textBaseline = 'top';
      for (let t = Math.ceil(t0 / ts) * ts; t <= t1 + 1e-12; t += ts) {
        const x = X(t);
        g.beginPath(); g.moveTo(x, top); g.lineTo(x, top + ph); g.stroke();
        g.fillText(units.fmtSI(t, 's', 3, { trim: true }), x, top + ph + 6);
      }
      unitsUsed.forEach((u, idx) => {
        const ax = axes[u];
        const Y = (v) => top + ph - ((v - ax.lo) / (ax.hi - ax.lo)) * ph;
        ax.Y = Y;
        const vs = niceStep(ax.hi - ax.lo, 4);
        g.textAlign = idx === 0 ? 'right' : 'left'; g.textBaseline = 'middle';
        for (let v = Math.ceil(ax.lo / vs) * vs; v <= ax.hi + 1e-15; v += vs) {
          const y = Y(v);
          if (idx === 0) { g.strokeStyle = Math.abs(v) < vs * 1e-6 ? ink3 : line; g.beginPath(); g.moveTo(left, y); g.lineTo(left + pw, y); g.stroke(); }
          g.fillStyle = ink3;
          g.fillText(units.fmtSI(Math.abs(v) < vs * 1e-6 ? 0 : v, u, 3, { trim: true }), idx === 0 ? left - 6 : left + pw + 6, y);
        }
      });
      g.strokeStyle = ink3; g.strokeRect(left, top, pw, ph);
      // Traces.
      g.save();
      g.beginPath(); g.rect(left, top, pw, ph); g.clip();
      for (const s of list) {
        const arr = tr.series[s.key] || [];
        const Y = axes[s.unit].Y;
        g.strokeStyle = s.color; g.lineWidth = 2;
        g.setLineDash(s.unit === 'A' && unitsUsed.length > 1 ? [6, 3] : []);
        g.beginPath();
        let pen = false;
        for (let i = 0; i < arr.length; i++) {
          const t = tr.t[i];
          if (t < t0) continue;
          const v = arr[i];
          if (!Number.isFinite(v)) { pen = false; continue; }
          const x = X(t), y = Y(v);
          if (pen) g.lineTo(x, y); else g.moveTo(x, y);
          pen = true;
        }
        g.stroke();
      }
      g.restore();
      g.setLineDash([]);
      // Legend with latest values.
      for (const s of list) {
        const arr = tr.series[s.key] || [];
        const last = arr.length ? arr[arr.length - 1] : NaN;
        const item = document.createElement('span');
        item.className = 'legend-item';
        const sw = document.createElement('span');
        sw.className = 'legend-swatch' + (s.unit === 'A' && unitsUsed.length > 1 ? ' is-dashed' : '');
        sw.style.setProperty('--c', s.color);
        const tx = document.createElement('span');
        tx.textContent = `${s.label} (${s.unit === 'A' ? 'current' : s.unit === 'Ω' ? 'resistance' : 'p.d.'})`;
        const val = document.createElement('span');
        val.className = 'legend-value';
        val.textContent = Number.isFinite(last) ? units.fmtSI(last, s.unit, 3) : '—';
        item.append(sw, tx, val);
        legendEl.append(item);
      }
    }

    return { draw };
  }

  PPC.graph = { createGraph };
})(typeof globalThis === 'object' ? globalThis : this);
