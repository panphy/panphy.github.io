// Shared time-range selection for recorded canvas graphs. Original samples stay intact.
(function (root) {
  function bounds(times, range) {
    const first = times[0] || 0;
    const last = times.length ? times[times.length - 1] : first;
    if (range && Number.isFinite(range.start) && Number.isFinite(range.end)) {
      const t0 = Math.max(first, range.start), t1 = Math.min(last, range.end);
      if (t1 > t0) return { t0, t1 };
    }
    return { t0: first, t1: Math.max(last, first + 1) };
  }

  function indices(times, range) {
    const { t0, t1 } = bounds(times, range);
    const out = [];
    for (let i = 0; i < times.length; i++) if (times[i] >= t0 - 1e-12 && times[i] <= t1 + 1e-12) out.push(i);
    return out;
  }

  function isFull(times, range) {
    if (times.length < 2) return true;
    const { t0, t1 } = bounds(times, range);
    return t0 <= times[0] + 1e-12 && t1 >= times[times.length - 1] - 1e-12;
  }

  function nearest(times, t) {
    let lo = 0, hi = times.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (times[mid] < t) lo = mid; else hi = mid; }
    return Math.abs(times[lo] - t) <= Math.abs(times[hi] - t) ? lo : hi;
  }

  function select(times, start, end) {
    if (times.length < 2) return null;
    const a = nearest(times, Math.min(start, end)), b = nearest(times, Math.max(start, end));
    return b > a ? { start: times[a], end: times[b] } : null;
  }

  function nearestSample(times, range, time) {
    const visible = indices(times, range);
    if (!visible.length) return -1;
    return Math.max(visible[0], Math.min(visible[visible.length - 1], nearest(times, time)));
  }

  // Solid readout beside the hovered sample; use columns when the graph is short.
  function drawReadout(ctx, { x, top, width, height, lines, background, ink, border }) {
    if (!lines.length) return;
    ctx.save(); ctx.font = '500 11px "IBM Plex Mono", monospace';
    const maxRows = Math.max(1, Math.floor((height - 28) / 16));
    const columns = Math.ceil(lines.length / maxRows), rows = Math.ceil(lines.length / columns);
    const textWidth = Math.max(...lines.map((line) => ctx.measureText(line).width));
    const boxWidth = Math.min(width - 12, (textWidth + 20) * columns), boxHeight = rows * 16 + 16;
    const left = Math.max(6, x + 12 + boxWidth > width - 6 ? x - boxWidth - 12 : x + 12);
    const y = Math.max(6, Math.min(top + 8, height - boxHeight - 6));
    ctx.fillStyle = background; ctx.fillRect(left, y, boxWidth, boxHeight);
    ctx.strokeStyle = border; ctx.lineWidth = 1; ctx.strokeRect(left, y, boxWidth, boxHeight);
    ctx.fillStyle = ink; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    lines.forEach((line, i) => ctx.fillText(line, left + 10 + Math.floor(i / rows) * boxWidth / columns, y + 16 + (i % rows) * 16, boxWidth / columns - 20));
    ctx.restore();
  }

  function mount(canvas, options) {
    let plot = null, drag = null, source = options.getSource();
    const clamp = (x, p) => Math.max(p.left, Math.min(p.left + p.width, x));
    const xOf = (e) => e.clientX - canvas.getBoundingClientRect().left;
    const timeAt = (x, p) => p.t0 + (clamp(x, p) - p.left) / p.width * (p.t1 - p.t0);
    const updateButton = () => { if (options.fullButton) options.fullButton.disabled = isFull(options.getTimes(), options.getRange()); };
    const setRange = (range) => { options.setRange(range); updateButton(); };
    const reset = () => { drag = null; setRange(null); options.redraw(); };
    function sync() {
      if (source !== options.getSource()) { source = options.getSource(); drag = null; setRange(null); }
      updateButton();
    }
    updateButton();
    canvas.addEventListener('pointerdown', (e) => {
      sync();
      if (drag) { drag = null; options.redraw(); return; } // A second finger cancels selection.
      if (e.isPrimary === false || e.button !== 0 || !plot || options.getTimes().length < 2) return;
      const rect = canvas.getBoundingClientRect(), x = xOf(e), y = e.clientY - rect.top;
      if (x < plot.left || x > plot.left + plot.width || y < plot.top || y > plot.top + plot.height) return;
      e.preventDefault(); canvas.focus({ preventScroll: true });
      drag = { id: e.pointerId, start: x, end: x, plot: { ...plot }, source };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      drag.end = clamp(xOf(e), drag.plot); options.redraw();
    });
    canvas.addEventListener('pointerup', (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const d = drag; drag = null;
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
      const end = clamp(xOf(e), d.plot);
      if (d.source === options.getSource() && Math.abs(end - d.start) >= 6) {
        const range = select(options.getTimes(), timeAt(d.start, d.plot), timeAt(end, d.plot));
        if (range) setRange(range);
      }
      options.redraw();
    });
    const cancel = () => { if (drag) { drag = null; options.redraw(); } };
    canvas.addEventListener('pointercancel', cancel);
    canvas.addEventListener('lostpointercapture', cancel);
    canvas.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Home') { e.preventDefault(); reset(); return; }
      if (!plot || !['+', '=', '-', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      e.preventDefault();
      const { t0, t1 } = bounds(options.getTimes(), options.getRange());
      const span = t1 - t0, mid = (t0 + t1) / 2;
      let start, end;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const times = options.getTimes();
        if (times.length < 2) return;
        const direction = e.key === 'ArrowLeft' ? -1 : 1;
        const current = nearest(times, t0);
        let next = nearest(times, t0 + direction * span * 0.1);
        if (next === current) next = Math.max(0, Math.min(times.length - 1, current + direction));
        start = Math.max(times[0], Math.min(times[times.length - 1] - span, times[next])); end = start + span;
      } else { const half = span * (e.key === '-' ? 1 : 0.25); start = mid - half; end = mid + half; }
      const range = select(options.getTimes(), start, end);
      if (range) { setRange(range); options.redraw(); }
    });
    return {
      sync, reset,
      isSelecting: () => !!drag,
      viewBounds(times, range) { return drag ? { t0: drag.plot.t0, t1: drag.plot.t1 } : bounds(times, range); },
      setPlot(value) { plot = value; },
      draw(ctx, color) {
        if (!drag || Math.abs(drag.end - drag.start) < 2) return;
        const left = Math.min(drag.start, drag.end), width = Math.abs(drag.end - drag.start);
        ctx.save(); ctx.fillStyle = color; ctx.globalAlpha = 0.18;
        ctx.fillRect(left, drag.plot.top, width, drag.plot.height);
        ctx.globalAlpha = 1; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
        ctx.strokeRect(left, drag.plot.top, width, drag.plot.height); ctx.restore();
      }
    };
  }
  const api = { bounds, indices, isFull, select, nearestSample, drawReadout, mount };
  root.PanPhyGraphRange = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
