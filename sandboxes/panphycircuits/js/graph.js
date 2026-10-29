// PanPhyCircuits: time graph of meter and oscilloscope readings.
// Every value plotted here is a sample recorded by the solver at a committed
// time step; nothing is interpolated or smoothed.
(function (root) {
  const PPC = root.PPC = root.PPC || {};
  const { units, registry } = PPC;
  const R = root.PanPhyGraphRange;

  // Distinct, color-blind-aware trace colors (dashes also differ per unit).
  const COLORS = ['#2563EB', '#E8590C', '#0F9D58', '#AE3EC9', '#C2255C', '#0B7285', '#7048E8', '#5C940D'];

  function quantityLabel(unit, channel) {
    if (channel === 'ch1') return 'CH1';
    if (channel === 'ch2') return 'CH2';
    if (unit === 'A') return 'current';
    if (unit === 'Ω') return 'resistance';
    return 'p.d.';
  }

  // Ammeter, voltmeter, ohmmeter (meter) and oscilloscope channels with Plot on.
  function plottedSeries(app) {
    const out = [];
    let i = 0;
    for (const c of app.doc.components) {
      if (!c.props.plot) continue;
      const def = registry.get(c.type);
      if (def.meter) {
        out.push({
          key: c.id + ':' + def.meter.quantity,
          label: c.label,
          unit: def.meter.unit,
          color: COLORS[i++ % COLORS.length],
          comp: c,
          kind: 'meter'
        });
      }
      if (def.channels) {
        for (const ch of def.channels) {
          out.push({
            key: c.id + ':' + ch.key,
            label: `${c.label} ${ch.label}`,
            unit: ch.unit,
            color: COLORS[i++ % COLORS.length],
            comp: c,
            kind: 'channel',
            channel: ch.key
          });
        }
      }
    }
    return out;
  }

  function timeBounds(app, tr) {
    return R.bounds(tr.t, app.graphRange);
  }

  function sampleRows(app, list) {
    const tr = app.sim.traces;
    const { t0, t1 } = timeBounds(app, tr);
    const rows = [];
    for (let i = 0; i < tr.t.length; i++) {
      const t = tr.t[i];
      if (t < t0 || t > t1 + 1e-15) continue;
      const values = {};
      for (const s of list) {
        const arr = tr.series[s.key] || [];
        const v = arr[i];
        values[s.key] = Number.isFinite(v) ? v : null;
      }
      rows.push({ t, values });
    }
    return { t0, t1, rows };
  }

  function hasExportData(app) {
    const list = plottedSeries(app);
    if (!list.length) return false;
    return sampleRows(app, list).rows.some((row) => list.some((s) => row.values[s.key] !== null));
  }

  function formatCell(value) {
    if (value === null || value === undefined) return '';
    if (!Number.isFinite(value)) return '';
    return String(Number(value.toPrecision(6)));
  }

  function toCSV(app) {
    const list = plottedSeries(app);
    const { rows } = sampleRows(app, list);
    const header = ['t (s)', ...list.map((s) => `${s.label} (${s.unit})`)];
    const escape = (value) => '"' + String(value).replaceAll('"', '""') + '"';
    const lines = [header.map(escape).join(',')];
    for (const row of rows) {
      lines.push([formatCell(row.t), ...list.map((s) => formatCell(row.values[s.key]))].map(escape).join(','));
    }
    return lines.join('\n') + '\n';
  }

  function panPhyPlotPayload(app) {
    const list = plottedSeries(app);
    const { rows } = sampleRows(app, list);
    const columns = [
      { name: 't', unit: 's', role: 'X', cells: rows.map((row) => formatCell(row.t)) }
    ];
    for (const s of list) {
      columns.push({
        name: s.label,
        unit: s.unit,
        role: 'Y',
        cells: rows.map((row) => formatCell(row.values[s.key]))
      });
    }
    return { name: 'PanPhyCircuits', columns };
  }

  function panPhyPlotUrl(app) {
    return '/tools/panphyplot.html#import=' + encodeURIComponent(JSON.stringify(panPhyPlotPayload(app)));
  }

  function downloadText(filename, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function createGraph(app, canvas, legendEl, exportsEl) {
    let lastDraw = 0;
    let hoverX = null;
    const selection = R.mount(canvas, {
      fullButton: document.getElementById('graph-full'),
      getTimes: () => app.sim.traces.t,
      getSource: () => app.sim.traces,
      getRange: () => app.graphRange,
      setRange: (range) => { app.graphRange = range; },
      redraw: () => draw(true)
    });
    canvas.addEventListener('pointermove', (e) => {
      hoverX = e.clientX - canvas.getBoundingClientRect().left;
      draw(true);
    });
    canvas.addEventListener('pointerleave', () => { hoverX = null; draw(true); });

    function niceStep(range, target) {
      const raw = range / target;
      const mag = Math.pow(10, Math.floor(Math.log10(raw)));
      const n = raw / mag;
      return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
    }

    function syncExports() {
      if (!exportsEl) return;
      const show = app.paused && !document.getElementById('graph-panel').hidden;
      exportsEl.hidden = !show;
      if (!show) return;
      const ready = hasExportData(app);
      for (const btn of exportsEl.querySelectorAll('button')) btn.disabled = !ready;
    }

    function draw(force) {
      selection.sync();
      const now = performance.now();
      if (!force && now - lastDraw < 66) return;
      lastDraw = now;
      selection.setPlot(null);
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
      const list = plottedSeries(app);
      const tr = app.sim.traces;
      legendEl.innerHTML = '';
      syncExports();
      if (!list.length) {
        g.fillStyle = ink3; g.font = '13px Figtree, sans-serif'; g.textAlign = 'center';
        const hasPlottable = app.doc.components.some((c) => {
          const def = registry.get(c.type);
          return def.meter || def.channels;
        });
        g.fillText(hasPlottable
          ? 'Select a meter or oscilloscope and switch on “Plot on graph”.'
          : 'Add an ammeter, voltmeter, ohmmeter or oscilloscope: its readings are plotted here.',
        W / 2, H / 2);
        return;
      }
      const { t0, t1 } = selection.viewBounds(tr.t, app.graphRange);
      const unitsUsed = [...new Set(list.map((s) => s.unit))];
      const axes = {};
      for (const u of unitsUsed) {
        let lo = Infinity, hi = -Infinity;
        for (const s of list.filter((x) => x.unit === u)) {
          const arr = tr.series[s.key] || [];
          for (let i = 0; i < arr.length; i++) {
            if (tr.t[i] < t0 || tr.t[i] > t1) continue;
            const v = arr[i];
            if (Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
          }
        }
        if (!Number.isFinite(lo)) { lo = 0; hi = 1; }
        lo = Math.min(lo, 0); hi = Math.max(hi, 0);
        if (hi - lo < 1e-12) hi = lo + (u === 'A' ? 1e-3 : u === 'Ω' ? 1 : 1);
        const pad = (hi - lo) * 0.08;
        axes[u] = { lo: lo - (lo < 0 ? pad : 0), hi: hi + pad };
      }
      const left = 56, right = unitsUsed.length > 1 ? 56 : 14, top = 10, bottom = 26;
      const pw = W - left - right, ph = H - top - bottom;
      if (pw <= 0 || ph <= 0) return;
      selection.setPlot({ left, top, width: pw, height: ph, t0, t1 });
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
          if (t < t0 || t > t1) continue;
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
      let hoverIndex = -1;
      if (hoverX !== null && hoverX >= left && hoverX <= left + pw && !selection.isSelecting()) {
        const time = t0 + (hoverX - left) / pw * (t1 - t0);
        if (time <= tr.t[tr.t.length - 1]) hoverIndex = R.nearestSample(tr.t, app.graphRange, time);
      }
      if (hoverIndex >= 0) {
        const x = X(tr.t[hoverIndex]);
        g.strokeStyle = ink3; g.lineWidth = 1; g.setLineDash([3, 3]);
        g.beginPath(); g.moveTo(x, top); g.lineTo(x, top + ph); g.stroke(); g.setLineDash([]);
        for (const s of list) {
          const value = (tr.series[s.key] || [])[hoverIndex];
          if (!Number.isFinite(value)) continue;
          g.fillStyle = s.color; g.beginPath(); g.arc(x, axes[s.unit].Y(value), 3.5, 0, Math.PI * 2); g.fill();
        }
        R.drawReadout(g, {
          x, top, width: W, height: H,
          lines: [`t = ${units.fmtSI(tr.t[hoverIndex], 's', 4)}`, ...list.map((s) => {
            const value = (tr.series[s.key] || [])[hoverIndex];
            return `${s.label} = ${Number.isFinite(value) ? units.fmtSI(value, s.unit, 4) : value === Infinity ? 'OL' : '—'}`;
          })],
          background: cs.getPropertyValue('--surface').trim() || '#fff', ink, border: line
        });
      }
      selection.draw(g, cs.getPropertyValue('--accent').trim() || COLORS[0]);
      // Legend follows the hovered sample, or the last sample in the displayed range.
      const visibleIndices = R.indices(tr.t, app.graphRange);
      const lastIndex = hoverIndex >= 0 ? hoverIndex : visibleIndices[visibleIndices.length - 1];
      for (const s of list) {
        const arr = tr.series[s.key] || [];
        const last = lastIndex === undefined ? NaN : arr[lastIndex];
        const item = document.createElement('span');
        item.className = 'legend-item';
        const sw = document.createElement('span');
        sw.className = 'legend-swatch' + (s.unit === 'A' && unitsUsed.length > 1 ? ' is-dashed' : '');
        sw.style.setProperty('--c', s.color);
        const tx = document.createElement('span');
        tx.textContent = `${s.label} (${quantityLabel(s.unit, s.channel)})`;
        const val = document.createElement('span');
        val.className = 'legend-value';
        val.textContent = Number.isFinite(last) ? units.fmtSI(last, s.unit, 3) : (last === Infinity ? 'OL' : '—');
        item.append(sw, tx, val);
        legendEl.append(item);
      }
    }

    function exportCSV() {
      if (!hasExportData(app)) return false;
      downloadText('panphycircuits_graph.csv', toCSV(app), 'text/csv;charset=utf-8;');
      return true;
    }

    function exportPanPhyPlot() {
      if (!hasExportData(app)) return false;
      const tab = window.open(panPhyPlotUrl(app), '_blank');
      return tab !== null;
    }

    return { draw, syncExports, fullGraph: selection.reset, exportCSV, exportPanPhyPlot, plottedSeries: () => plottedSeries(app), hasExportData: () => hasExportData(app) };
  }

  const api = { createGraph, plottedSeries, sampleRows, toCSV, panPhyPlotPayload, panPhyPlotUrl, hasExportData, quantityLabel };
  PPC.graph = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
