// SVG figures for worksheets (a copy of the local topic tests' figures.js). Every figure is drawn in millimetres (1 SVG unit = 1 mm on paper).
// Labels accept the same shorthand as paper text: *italic*, ^{superscript}, _{subscript}.
(function () {
  const INK = '#1b1b1b';
  const FONT = 'font-family="Arial, Helvetica, sans-serif"';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Label text with tspans for italics, superscripts and subscripts.
  function label(s, size) {
    const sm = (size * 0.72).toFixed(2);
    let out = esc(s)
      .replace(/\^\{([^}]*)\}/g, (_, t) => `<tspan dy="${(-size * 0.38).toFixed(2)}" font-size="${sm}">${t.replace(/-/g, '−')}</tspan><tspan dy="${(size * 0.38).toFixed(2)}"></tspan>`)
      .replace(/_\{([^}]*)\}/g, (_, t) => `<tspan dy="${(size * 0.22).toFixed(2)}" font-size="${sm}">${t}</tspan><tspan dy="${(-size * 0.22).toFixed(2)}"></tspan>`)
      .replace(/\*([^*]+)\*/g, '<tspan font-style="italic">$1</tspan>')
      .replace(/~/g, '\u00a0');
    return out;
  }

  function text(x, y, s, o = {}) {
    const size = o.size || 3.3;
    const anchor = o.anchor || 'start';
    const fill = o.fill || INK;
    const extra = o.attrs || '';
    return `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${fill}" ${FONT} ${extra}>${label(s, size)}</text>`;
  }

  // Open chevron arrowhead at (x, y) pointing along angle a (radians, SVG coordinates).
  function head(x, y, a, len = 2.4, spread = 0.42) {
    const p = (s) => `${(x - len * Math.cos(a + s)).toFixed(2)},${(y - len * Math.sin(a + s)).toFixed(2)}`;
    return `<polyline points="${p(spread)} ${x.toFixed(2)},${y.toFixed(2)} ${p(-spread)}" fill="none" stroke="${INK}" stroke-width="0.3"/>`;
  }

  function arrow(x1, y1, x2, y2, w = 0.3) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${INK}" stroke-width="${w}"/>` + head(x2, y2, a);
  }

  function svg(w, h, body, displayWidth) {
    const dw = displayWidth || w;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${dw}mm" height="${(h * dw / w).toFixed(2)}mm">${body}</svg>`;
  }

  // Graph with grid, optional uncertainty bars and a straight line.
  // x, y: { min, max, major, minor (subdivisions per major), label, decimals }
  // points: [[x, y, dy?, dx?], ...]; line: [[x1, y1], [x2, y2]]; path: [[x, y], ...] (a polyline); size: [plot width, plot height] in mm.
  function graph(o) {
    const [pw, ph] = o.size || [128, 84];
    const L = 20, T = 4, B = 15, R = 4;
    const W = L + pw + R, H = T + ph + B;
    const X = (v) => L + (v - o.x.min) / (o.x.max - o.x.min) * pw;
    const Y = (v) => T + ph - (v - o.y.min) / (o.y.max - o.y.min) * ph;
    let g = '';
    const lines = (ax, horiz) => {
      const step = ax.major / (ax.minor || 1);
      const n = Math.round((ax.max - ax.min) / step);
      for (let i = 0; i <= n; i++) {
        const v = ax.min + i * step;
        const major = i % (ax.minor || 1) === 0;
        const c = major ? '#b4bac1' : '#e2e5e9';
        const sw = major ? 0.22 : 0.15;
        if (horiz) g += `<line x1="${L}" x2="${L + pw}" y1="${Y(v)}" y2="${Y(v)}" stroke="${c}" stroke-width="${sw}"/>`;
        else g += `<line y1="${T}" y2="${T + ph}" x1="${X(v)}" x2="${X(v)}" stroke="${c}" stroke-width="${sw}"/>`;
      }
    };
    lines(o.x, false);
    lines(o.y, true);
    g += `<rect x="${L}" y="${T}" width="${pw}" height="${ph}" fill="none" stroke="#9aa1a8" stroke-width="0.2"/>`;
    g += `<line x1="${L}" y1="${T + ph}" x2="${L + pw}" y2="${T + ph}" stroke="${INK}" stroke-width="0.3"/>`;
    g += `<line x1="${L}" y1="${T}" x2="${L}" y2="${T + ph}" stroke="${INK}" stroke-width="0.3"/>`;
    const ticks = (ax, horizAxis) => {
      const d = ax.decimals ?? 1;
      for (let v = ax.min; v <= ax.max + 1e-9; v += ax.major) {
        const s = v.toFixed(d);
        if (horizAxis) {
          g += `<line x1="${X(v)}" x2="${X(v)}" y1="${T + ph}" y2="${T + ph + 1.2}" stroke="${INK}" stroke-width="0.25"/>`;
          g += text(X(v), T + ph + 5, s, { anchor: 'middle' });
        } else {
          g += `<line x1="${L - 1.2}" x2="${L}" y1="${Y(v)}" y2="${Y(v)}" stroke="${INK}" stroke-width="0.25"/>`;
          g += text(L - 2.2, Y(v) + 1.15, s, { anchor: 'end' });
        }
      }
    };
    ticks(o.x, true);
    ticks(o.y, false);
    g += text(L + pw / 2, T + ph + 12, o.x.label, { anchor: 'middle', size: 3.4 });
    g += text(0, 0, o.y.label, { anchor: 'middle', size: 3.4, attrs: `transform="translate(${L - 13.5} ${T + ph / 2}) rotate(-90)"` });
    if (o.line) {
      const [[x1, y1], [x2, y2]] = o.line;
      g += `<line x1="${X(x1)}" y1="${Y(y1)}" x2="${X(x2)}" y2="${Y(y2)}" stroke="${INK}" stroke-width="0.3"/>`;
    }
    if (o.path) {
      g += `<polyline points="${o.path.map(([x, y]) => `${X(x).toFixed(2)},${Y(y).toFixed(2)}`).join(' ')}" fill="none" stroke="${INK}" stroke-width="0.4" stroke-linejoin="round"/>`;
    }
    for (const [x, y, dy, dx] of o.points || []) {
      const cap = 1.4;
      if (dy) {
        g += `<line x1="${X(x)}" x2="${X(x)}" y1="${Y(y - dy)}" y2="${Y(y + dy)}" stroke="${INK}" stroke-width="0.25"/>`;
        g += `<line x1="${X(x) - cap}" x2="${X(x) + cap}" y1="${Y(y + dy)}" y2="${Y(y + dy)}" stroke="${INK}" stroke-width="0.25"/>`;
        g += `<line x1="${X(x) - cap}" x2="${X(x) + cap}" y1="${Y(y - dy)}" y2="${Y(y - dy)}" stroke="${INK}" stroke-width="0.25"/>`;
      }
      if (dx) {
        g += `<line y1="${Y(y)}" y2="${Y(y)}" x1="${X(x - dx)}" x2="${X(x + dx)}" stroke="${INK}" stroke-width="0.25"/>`;
        g += `<line y1="${Y(y) - cap}" y2="${Y(y) + cap}" x1="${X(x + dx)}" x2="${X(x + dx)}" stroke="${INK}" stroke-width="0.25"/>`;
        g += `<line y1="${Y(y) - cap}" y2="${Y(y) + cap}" x1="${X(x - dx)}" x2="${X(x - dx)}" stroke="${INK}" stroke-width="0.25"/>`;
      }
      g += `<circle cx="${X(x)}" cy="${Y(y)}" r="0.85" fill="${INK}"/>`;
    }
    return svg(W, H, g);
  }

  // Ball launched horizontally from a platform: height and range dimensions.
  function horizontalLaunch(o) {
    // angle (degrees above the horizontal) launches the ball upward from the edge; the path keeps that start angle.
    const a = (o.angle || 0) * Math.PI / 180, t = Math.tan(a);
    const x0 = 34, x1 = 98, D = x1 - x0, drop = 34;
    const k = (drop + D * t) / (D * D);
    const lift = a ? Math.max(t * t / (4 * k), 14 * Math.sin(a) + 5) : 0;
    const top = 8 + lift, floor = top + drop;
    const W = 166, H = 56 + lift;
    let g = '';
    g += `<line x1="${x0 - 18}" y1="${top}" x2="${x0}" y2="${top}" stroke="${INK}" stroke-width="0.35"/>`;
    g += `<line x1="${x0}" y1="${top}" x2="${x0}" y2="${floor}" stroke="${INK}" stroke-width="0.4"/>`;
    g += `<line x1="${x0 - 18}" y1="${floor}" x2="${x1 + 9}" y2="${floor}" stroke="${INK}" stroke-width="0.4"/>`;
    let d = `M${x0},${top}`;
    for (let i = 1; i <= 40; i++) {
      const dx = D * i / 40;
      d += ` L${(x0 + dx).toFixed(2)},${(top - dx * t + k * dx * dx).toFixed(2)}`;
    }
    g += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="0.25" stroke-dasharray="1 0.9"/>`;
    if (a) {
      const ex = x0 + 15 * Math.cos(a), ey = top - 15 * Math.sin(a);
      g += arrow(x0, top, ex, ey, 0.35);
      const r = 9;
      g += `<line x1="${x0}" y1="${top}" x2="${x0 + 23}" y2="${top}" stroke="#888" stroke-width="0.2" stroke-dasharray="0.8 0.8"/>`;
      g += `<path d="M${x0 + r},${top} A${r},${r} 0 0 0 ${(x0 + r * Math.cos(a)).toFixed(2)},${(top - r * Math.sin(a)).toFixed(2)}" fill="none" stroke="${INK}" stroke-width="0.25"/>`;
      // Inside the angle, centered where the gap between the horizontal and the rising path is widest.
      const lx = Math.max(r + 5, Math.min(t / (2 * k), 22));
      g += text(x0 + lx, top - 1, o.label || `${o.angle.toFixed(1)}°`, { size: 2.8, anchor: 'middle' });
      if (o.speed) g += text(ex + 1.5, ey - 1, o.speed);
    } else {
      g += arrow(x0 + 1.5, top - 0.6, x0 + 14, top - 0.6, 0.3);
      if (o.speed) g += text(x0 + 8, top - 3, o.speed, { anchor: 'middle' });
    }
    g += `<circle cx="${x0}" cy="${top}" r="0.8" fill="${INK}"/><circle cx="${x1}" cy="${floor}" r="0.8" fill="${INK}"/>`;
    g += `<line x1="${x0 - 3}" y1="${top}" x2="${x0 - 3}" y2="${floor}" stroke="#aaa" stroke-width="0.2"/>`;
    g += text(x0 - 6.5, (top + floor) / 2 + 1.2, o.height, { anchor: 'end' });
    const dy = floor + 4.5;
    if (o.range) {
    g += `<line x1="${x0}" y1="${dy}" x2="${x1}" y2="${dy}" stroke="#aaa" stroke-width="0.2"/>`;
    g += `<line x1="${x0}" y1="${dy - 1}" x2="${x0}" y2="${dy + 1}" stroke="#aaa" stroke-width="0.2"/><line x1="${x1}" y1="${dy - 1}" x2="${x1}" y2="${dy + 1}" stroke="#aaa" stroke-width="0.2"/>`;
    g += text((x0 + x1) / 2, dy + 5.2, o.range, { anchor: 'middle' });
    }
    if (o.note !== false) g += text(W, o.range ? dy + 5.2 : floor + 4, o.note || 'Diagram not to scale', { anchor: 'end', size: 2.7, fill: '#444' });
    return svg(W, H, g);
  }

  // Block on a ramp that falls to the right, with the angle marked at the foot.
  function incline(o) {
    const W = 166, H = 50;
    const a = (o.angle || 25) * Math.PI / 180;
    const bx = 110, by = 44, len = Math.min(98, 41 / Math.sin(a));
    const tx = bx - len * Math.cos(a), ty = by - len * Math.sin(a);
    let g = '';
    g += `<line x1="${bx - 74}" y1="${by}" x2="${bx + 9}" y2="${by}" stroke="${INK}" stroke-width="0.35"/>`;
    g += `<line x1="${tx}" y1="${ty}" x2="${bx}" y2="${by}" stroke="${INK}" stroke-width="0.4"/>`;
    const at = (f) => [tx + f * (bx - tx), ty + f * (by - ty)];
    const [cx, cy] = at(o.blockAt ?? 0.32);
    const deg = o.angle || 25;
    g += `<g transform="translate(${cx.toFixed(2)} ${cy.toFixed(2)}) rotate(${deg})"><rect x="-6.5" y="-9" width="13" height="9" fill="#e7eaee" stroke="${INK}" stroke-width="0.3"/></g>`;
    if (o.motion !== false) {
      // The arrow starts a fixed distance past the block, so it never crosses it on short (steep) ramps.
      const s0 = (o.blockAt ?? 0.32) + 13 / len;
      const [ax, ay] = at(s0), [bx2, by2] = at(s0 + 13 / len);
      const nx = Math.sin(a) * -3.5, ny = Math.cos(a) * -3.5;
      g += arrow(ax + nx, ay + ny, bx2 + nx, by2 + ny);
    }
    const r = 9;
    g += `<path d="M${bx - r},${by} A${r},${r} 0 0 1 ${(bx - r * Math.cos(a)).toFixed(2)},${(by - r * Math.sin(a)).toFixed(2)}" fill="none" stroke="${INK}" stroke-width="0.25"/>`;
    // Clear of the arc, and far enough along the ground that the slope is above the label on shallow ramps.
    g += text(bx - Math.max(r + 1.5, 4.8 / Math.tan(a)), by - 1.6, o.label || `${deg.toFixed(1)}°`, { anchor: 'end' });
    return svg(W, H, g);
  }

  // Free-body diagram: arrows from a dot. forces: [{ dir (degrees, anticlockwise from right), len (mm), label }]
  function fbd(o) {
    const forces = o.forces || [];
    const maxLen = Math.max(...forces.map((f) => f.len || 15));
    const W = 166, H = 2 * maxLen + 12;
    const cx = W / 2, cy = H / 2;
    let g = '';
    for (const f of forces) {
      const a = -(f.dir * Math.PI / 180);
      const l = f.len || 15;
      const ex = cx + l * Math.cos(a), ey = cy + l * Math.sin(a);
      g += arrow(cx, cy, ex, ey);
      const c = Math.cos(a);
      const anchor = Math.abs(c) < 0.25 ? 'start' : c > 0 ? 'start' : 'end';
      const lx = ex + (Math.abs(c) < 0.25 ? 1.5 : 2.2 * Math.sign(c));
      const ly = ey + (Math.sin(a) > 0.5 ? 3 : Math.sin(a) < -0.5 ? 0.5 : 1.1);
      g += text(lx, ly, f.label, { anchor, size: 3.1 });
    }
    g += `<circle cx="${cx}" cy="${cy}" r="0.9" fill="${INK}"/>`;
    return svg(W, H, g);
  }

  // Energy level diagram drawn to scale. levels: [[left label, value, right label], ...] (values in any unit).
  // arrows: [[from value, to value], ...] draws transitions; height is the drawing height in mm.
  function energyLevels(o) {
    const W = 166, h = o.height || 60, T = 4, B = 4;
    const vals = o.levels.map((l) => l[1]);
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const order = [...vals].sort((a, b) => b - a);
    // even: equal gaps in order of energy, for levels too crowded to draw to scale
    const Y = o.even ? (v) => T + order.indexOf(v) / (order.length - 1) * h : (v) => T + (hi - v) / (hi - lo) * h;
    const x1 = 48, x2 = 118;
    let g = '';
    for (const [left, v, right] of o.levels) {
      g += `<line x1="${x1}" x2="${x2}" y1="${Y(v)}" y2="${Y(v)}" stroke="${INK}" stroke-width="0.35"/>`;
      if (left) g += text(x1 - 3, Y(v) + 1.15, left, { anchor: 'end' });
      if (right) g += text(x2 + 3, Y(v) + 1.15, right);
    }
    (o.arrows || []).forEach(([a, b], i) => {
      const x = x1 + 18 + i * 10;
      g += arrow(x, Y(a), x, Y(b));
    });
    if (o.note) g += text(W, T + h + B, o.note === true ? 'Diagram not to scale' : o.note, { anchor: 'end', size: 2.7, fill: '#444' });
    return svg(W, T + h + B, g);
  }

  // Projectile launched from level ground at an angle above the horizontal; the path is drawn for that angle.
  function angledLaunch(o) {
    const deg = o.angle || 40, a = deg * Math.PI / 180;
    const x0 = 34, range = 92;
    const peak = range * Math.tan(a) / 4;
    const y0 = Math.max(peak, 17 * Math.sin(a) + 4) + 5; // room for the path and the speed label
    const W = 166, H = y0 + 7;
    let g = `<line x1="${x0 - 14}" y1="${y0}" x2="${x0 + range + 14}" y2="${y0}" stroke="${INK}" stroke-width="0.4"/>`;
    let d = `M${x0},${y0}`;
    for (let i = 1; i <= 40; i++) {
      const f = i / 40;
      d += ` L${(x0 + f * range).toFixed(2)},${(y0 - 4 * peak * f * (1 - f)).toFixed(2)}`;
    }
    g += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="0.25" stroke-dasharray="1 0.9"/>`;
    const L = 17, ex = x0 + L * Math.cos(a), ey = y0 - L * Math.sin(a);
    g += arrow(x0, y0, ex, ey, 0.35);
    g += `<circle cx="${x0}" cy="${y0}" r="0.8" fill="${INK}"/><circle cx="${x0 + range}" cy="${y0}" r="0.8" fill="${INK}"/>`;
    const r = 8;
    g += `<path d="M${x0 + r},${y0} A${r},${r} 0 0 0 ${(x0 + r * Math.cos(a)).toFixed(2)},${(y0 - r * Math.sin(a)).toFixed(2)}" fill="none" stroke="${INK}" stroke-width="0.25"/>`;
    g += text(x0 + (r + 2) * Math.cos(a / 2), y0 - (r + 2) * Math.sin(a / 2) + 1.2, o.label || `${deg.toFixed(1)}°`);
    if (o.speed) g += text(ex - 2, ey - 1.5, o.speed, { anchor: 'end' });
    if (o.note !== false) g += text(W, y0 + 5, o.note || 'Diagram not to scale', { anchor: 'end', size: 2.7, fill: '#444' });
    return svg(W, H, g);
  }

  window.TestFigures = { graph, horizontalLaunch, angledLaunch, incline, fbd, energyLevels, label, text, arrow, svg };
})();
