/* Circuit and graph drawing helpers. Every diagram is plain inline SVG built from
   standard AQA circuit symbols, so no external images are needed. */
(function () {
  "use strict";

  const ANGLES = { h: 0, "h-": 180, v: 90, "v-": 270 };

  // Turn plain-text subscripts (R_total, V_p, I_s) into HTML subscripts.
  function sub(text) {
    if (typeof text !== "string") return text;
    return text.replace(/R_total/g, "R<sub>total</sub>").replace(/\b([VI])_([ps])\b/g, "$1<sub>$2</sub>");
  }

  function arrowHead(tipX, tipY, dirX, dirY, length, width, cls) {
    const mag = Math.hypot(dirX, dirY);
    const ux = dirX / mag;
    const uy = dirY / mag;
    const bx = tipX - ux * length;
    const by = tipY - uy * length;
    const px = -uy * width;
    const py = ux * width;
    return `<path class="${cls || "fill"}" d="M${tipX.toFixed(2)} ${tipY.toFixed(2)} L${(bx + px).toFixed(2)} ${(by + py).toFixed(2)} L${(bx - px).toFixed(2)} ${(by - py).toFixed(2)} Z"/>`;
  }

  function arrowLine(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const mag = Math.hypot(dx, dy);
    const ex = x2 - (dx / mag) * 5;
    const ey = y2 - (dy / mag) * 5;
    return `<line x1="${x1}" y1="${y1}" x2="${ex.toFixed(2)}" y2="${ey.toFixed(2)}" stroke-width="2"/>${arrowHead(x2, y2, dx, dy, 7, 3.5)}`;
  }

  const diagonal = '<line x1="-18" y1="14" x2="12" y2="-9"/>';

  // half: half-length of the wire gap; size: clearance used when placing labels.
  const SYMBOLS = {
    resistor: { half: 20, size: 9, body: '<rect x="-20" y="-8" width="40" height="16"/>' },
    fuse: { half: 20, size: 8, body: '<rect x="-20" y="-7" width="40" height="14"/><line x1="-20" y1="0" x2="20" y2="0"/>' },
    variable: {
      half: 20, size: 15,
      body: `<rect x="-20" y="-8" width="40" height="16"/>${diagonal}${arrowHead(18, -13.5, 30, -22.5, 8, 4)}`,
    },
    thermistor: { half: 20, size: 15, body: '<rect x="-20" y="-8" width="40" height="16"/><path d="M-27 15 H-18 L18 -15"/>' },
    ldr: {
      half: 22, size: 24,
      body: `<circle r="22"/><rect x="-15" y="-6" width="30" height="12"/>${arrowLine(-36, -34, -22, -20)}${arrowLine(-24, -42, -10, -28)}`,
    },
    lamp: { half: 12, size: 13, body: '<circle r="12"/><line x1="-8.5" y1="-8.5" x2="8.5" y2="8.5"/><line x1="-8.5" y1="8.5" x2="8.5" y2="-8.5"/>' },
    ammeter: { half: 12, size: 13, body: '<circle r="12"/>', letter: "A" },
    voltmeter: { half: 12, size: 13, body: '<circle r="12"/>', letter: "V" },
    motor: { half: 12, size: 13, body: '<circle r="12"/>', letter: "M" },
    cell: { half: 6, size: 16, body: '<line x1="-4" y1="-15" x2="-4" y2="15"/><line class="thick" x1="4" y1="-8" x2="4" y2="8"/>' },
    battery: {
      half: 18, size: 16,
      body: '<line x1="-16" y1="-15" x2="-16" y2="15"/><line class="thick" x1="-9" y1="-8" x2="-9" y2="8"/><line class="dash" x1="-4" y1="0" x2="3" y2="0"/><line x1="9" y1="-15" x2="9" y2="15"/><line class="thick" x1="16" y1="-8" x2="16" y2="8"/>',
    },
    diode: { half: 12, size: 11, body: '<line x1="-12" y1="0" x2="12" y2="0"/><path class="fill" d="M-9 -9 L-9 9 L7 0 Z"/><line x1="8" y1="-9" x2="8" y2="9"/>' },
    led: {
      half: 12, size: 22,
      body: `<line x1="-12" y1="0" x2="12" y2="0"/><path class="fill" d="M-9 -9 L-9 9 L7 0 Z"/><line x1="8" y1="-9" x2="8" y2="9"/>${arrowLine(-2, -12, 7, -23)}${arrowLine(5, -12, 14, -23)}`,
    },
    switchOpen: { half: 16, size: 13, body: '<circle class="dot" cx="-14" cy="0" r="2.6"/><circle class="dot" cx="14" cy="0" r="2.6"/><line x1="-14" y1="0" x2="12" y2="-13"/>' },
    switchClosed: { half: 16, size: 8, body: '<circle class="dot" cx="-14" cy="0" r="2.6"/><circle class="dot" cx="14" cy="0" r="2.6"/><line x1="-14" y1="0" x2="14" y2="0"/>' },
    ac: { half: 12, size: 13, body: '<circle r="12"/><path d="M-7 0 C-5 -8, -1 -8, 0 0 S5 8, 7 0"/>' },
  };

  function drawPart(part) {
    const [type, x, y, dir = "h", label, labelPos] = part;
    const symbol = SYMBOLS[type];
    if (!symbol) return "";
    const angle = ANGLES[dir] ?? 0;
    const vertical = dir === "v" || dir === "v-";
    let svg = `<g transform="translate(${x} ${y}) rotate(${angle})"><rect class="mask" x="${-symbol.half - 1}" y="-4" width="${2 * symbol.half + 2}" height="8"/><g class="body">${symbol.body}</g></g>`;
    if (symbol.letter) svg += `<text class="meter-letter" x="${x}" y="${y + 5}" text-anchor="middle">${symbol.letter}</text>`;
    if (label) {
      const gap = symbol.size + 7;
      let pos = labelPos || (vertical ? "r" : "t");
      let lx = x;
      let ly = y;
      let anchor = "middle";
      if (Array.isArray(pos)) {
        lx = x + pos[0];
        ly = y + pos[1];
        anchor = pos[2] || "middle";
      } else if (pos === "t") ly = y - gap;
      else if (pos === "b") ly = y + gap + 10;
      else if (pos === "r") { lx = x + gap; ly = y + 5; anchor = "start"; }
      else if (pos === "l") { lx = x - gap; ly = y + 5; anchor = "end"; }
      svg += `<text x="${lx}" y="${ly}" text-anchor="${anchor}">${label}</text>`;
    }
    return svg;
  }

  function figure(svg, caption, label) {
    const cap = caption ? `<figcaption>${sub(caption)}</figcaption>` : "";
    return `<figure class="circuit-figure">${svg.replace("<svg ", `<svg role="img" aria-label="${(label || caption || "Diagram").replace(/<[^>]+>/g, "").replace(/"/g, "&quot;")}" `)}${cap}</figure>`;
  }

  /**
   * spec: { w, h, wires: [path d...], parts: [[type, x, y, dir, label, labelPos]],
   *         dots: [[x, y]], notes: [[x, y, text, anchor, cls]],
   *         flows: [[x, y, dir, cls]], caption, label }
   */
  function circuit(spec) {
    const wires = (spec.wires || []).map((d) => `<path d="${d}"/>`).join("");
    const parts = (spec.parts || []).map(drawPart).join("");
    const dots = (spec.dots || []).map(([x, y]) => `<circle class="dot" cx="${x}" cy="${y}" r="3.6"/>`).join("");
    const flows = (spec.flows || []).map(([x, y, dir, cls]) => {
      const a = ANGLES[dir] ?? 0;
      return `<g transform="translate(${x} ${y}) rotate(${a})"><path class="${cls || "flow"}" d="M7 0 L-5 -6 L-5 6 Z"/></g>`;
    }).join("");
    const notes = (spec.notes || []).map(([x, y, text, anchor = "middle", cls = "note"]) => `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${text}</text>`).join("");
    const svg = `<svg class="cd" viewBox="0 0 ${spec.w} ${spec.h}" xmlns="http://www.w3.org/2000/svg">${wires}${parts}${dots}${flows}${notes}${spec.extra || ""}</svg>`;
    return figure(svg, spec.caption, spec.label);
  }

  function threeCoreCable() {
    const svg = `<svg class="cable-cutaway" viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cable-sheath" gradientUnits="userSpaceOnUse" x1="0" y1="96" x2="0" y2="222">
          <stop offset="0" stop-color="#777f87"/><stop offset=".14" stop-color="#4d5762"/>
          <stop offset=".5" stop-color="#273440"/><stop offset=".85" stop-color="#17232e"/>
          <stop offset="1" stop-color="#0d1721"/>
        </linearGradient>
        <linearGradient id="cable-filler" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#68747b"/><stop offset=".55" stop-color="#b0b6b3"/><stop offset="1" stop-color="#e1ded0"/>
        </linearGradient>
        <pattern id="cable-earth" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
          <rect width="18" height="18" fill="#258044"/><rect width="9" height="18" fill="#f7d83b"/>
        </pattern>
      </defs>
      <!-- The sheath continues beyond the drawing, so this reads as a length of cable. -->
      <path d="M-30 131 C55 127 119 130 179 100 C192 94 205 94 218 98 L235 182 C219 185 201 188 184 191 C116 220 44 222 -30 218Z" fill="url(#cable-sheath)" stroke="#111e29" stroke-width="3"/>
      <path d="M-20 138 C66 134 120 135 180 108 C192 103 203 101 213 102" fill="none" stroke="#a7b0b7" stroke-width="4" opacity=".5" stroke-linecap="round"/>
      <path d="M-20 210 C68 216 129 205 181 184" fill="none" stroke="#07111c" stroke-width="5" opacity=".45"/>
      <!-- The pale cut face shows that the three cores sit inside one outer sheath. -->
      <ellipse cx="216" cy="140" rx="29" ry="43" transform="rotate(-12 216 140)" fill="#15212b" stroke="#83909a" stroke-width="5"/>
      <ellipse cx="216" cy="140" rx="21" ry="36" transform="rotate(-12 216 140)" fill="url(#cable-filler)"/>
      <g fill="none" stroke="#17222d" stroke-width="27" stroke-linecap="round" stroke-linejoin="round">
        <path d="M216 109 C255 103 267 72 296 54 C323 37 350 44 367 60 C384 77 401 72 418 61"/>
        <path d="M221 141 C254 133 270 143 298 153 C325 163 349 148 376 136 C394 128 411 130 431 141"/>
        <path d="M213 172 C247 178 266 201 295 220 C317 235 339 236 360 224 C380 213 404 229 418 249"/>
      </g>
      <g fill="none" stroke-width="21" stroke-linecap="round" stroke-linejoin="round">
        <path d="M216 109 C255 103 267 72 296 54 C323 37 350 44 367 60 C384 77 401 72 418 61" stroke="#95582f"/>
        <path d="M221 141 C254 133 270 143 298 153 C325 163 349 148 376 136 C394 128 411 130 431 141" stroke="#2876be"/>
        <path d="M213 172 C247 178 266 201 295 220 C317 235 339 236 360 224 C380 213 404 229 418 249" stroke="url(#cable-earth)"/>
      </g>
      <g fill="none" stroke-width="4" stroke-linecap="round" opacity=".38">
        <path d="M218 101 C255 96 268 65 296 47 C323 31 351 36 373 54 C388 67 400 65 414 56" stroke="#f2c59e"/>
        <path d="M223 134 C256 127 274 136 300 145 C326 154 351 141 375 130 C394 121 414 124 433 135" stroke="#b2dfff"/>
        <path d="M215 165 C250 172 269 194 299 213 C319 228 340 227 357 216 C382 205 407 224 424 242" stroke="#fff5b3"/>
      </g>
    </svg>`;
    const caption = `<span class="cable-key"><span><i class="cable-key-live"></i><strong>Live</strong> · brown</span><span><i class="cable-key-neutral"></i><strong>Neutral</strong> · blue</span><span><i class="cable-key-earth"></i><strong>Earth</strong> · green &amp; yellow</span></span><span class="cable-caption">The outer sheath holds all three insulated wires together.</span>`;
    return figure(svg, caption, "Cutaway of a three-core cable: a dark outer sheath surrounds brown live, blue neutral, and green and yellow earth wires, which fan out from the open end");
  }

  function symbolGrid(items) {
    const tiles = items.map(([type, name]) => {
      const svg = `<svg class="cd" viewBox="-52 -46 104 70" aria-hidden="true"><path d="M-48 0 H48"/>${drawPart([type, 0, 0, "h"])}</svg>`;
      return `<figure class="symbol-tile">${svg}<figcaption>${name}</figcaption></figure>`;
    }).join("");
    return `<div class="symbol-grid" role="list">${tiles}</div>`;
  }

  /**
   * Graph with either numbered, gridded axes or a sketch with arrowed axes.
   * spec: { w, h, x: [min, max, step], y: [min, max, step], xLabel, yLabel, sketch,
   *         series: [{ fn, from, to, points, line, cls }], caption }
   */
  function graph(spec) {
    const w = spec.w || 360;
    const h = spec.h || 250;
    const sketch = !!spec.sketch;
    const m = sketch ? { l: 22, r: 22, t: 22, b: 22 } : { l: 54, r: 18, t: 16, b: 46 };
    const [xmin, xmax, xstep] = spec.x;
    const [ymin, ymax, ystep] = spec.y;
    const X = (v) => m.l + ((v - xmin) / (xmax - xmin)) * (w - m.l - m.r);
    const Y = (v) => h - m.b - ((v - ymin) / (ymax - ymin)) * (h - m.t - m.b);
    const fmt = (v) => String(Math.round(v * 1000) / 1000);
    let out = "";

    if (!sketch) {
      for (let v = xmin; v <= xmax + 1e-9; v += xstep) {
        out += `<line class="grid" x1="${X(v)}" y1="${Y(ymin)}" x2="${X(v)}" y2="${Y(ymax)}"/>`;
        out += `<text class="tick" x="${X(v)}" y="${h - m.b + 16}" text-anchor="middle">${fmt(v)}</text>`;
      }
      for (let v = ymin; v <= ymax + 1e-9; v += ystep) {
        out += `<line class="grid" x1="${X(xmin)}" y1="${Y(v)}" x2="${X(xmax)}" y2="${Y(v)}"/>`;
        out += `<text class="tick" x="${m.l - 7}" y="${Y(v) + 4}" text-anchor="end">${fmt(v)}</text>`;
      }
    }

    const x0 = xmin <= 0 && xmax >= 0 ? X(0) : X(xmin);
    const y0 = ymin <= 0 && ymax >= 0 ? Y(0) : Y(ymin);
    out += `<line class="axis" x1="${X(xmin)}" y1="${y0}" x2="${X(xmax)}" y2="${y0}"/>`;
    out += `<line class="axis" x1="${x0}" y1="${Y(ymin)}" x2="${x0}" y2="${Y(ymax)}"/>`;

    if (sketch) {
      out += arrowHead(X(xmax) + 6, y0, 1, 0, 9, 4.5);
      out += arrowHead(x0, Y(ymax) - 6, 0, -1, 9, 4.5);
      out += `<text class="axis-label" x="${X(xmax)}" y="${y0 + 18}" text-anchor="end">${spec.xLabel || ""}</text>`;
      out += `<text class="axis-label" x="${x0 + 9}" y="${Y(ymax) + 4}" text-anchor="start">${spec.yLabel || ""}</text>`;
    } else {
      out += `<text class="axis-label" x="${(X(xmin) + X(xmax)) / 2}" y="${h - 8}" text-anchor="middle">${spec.xLabel || ""}</text>`;
      out += `<text class="axis-label" transform="translate(13 ${(Y(ymin) + Y(ymax)) / 2}) rotate(-90)" text-anchor="middle">${spec.yLabel || ""}</text>`;
    }

    (spec.series || []).forEach((s) => {
      const cls = s.cls || "curve";
      if (s.fn) {
        const from = s.from ?? xmin;
        const to = s.to ?? xmax;
        const n = s.samples || 120;
        const pts = [];
        for (let i = 0; i <= n; i += 1) {
          const xv = from + ((to - from) * i) / n;
          const yv = s.fn(xv);
          if (Number.isFinite(yv)) pts.push(`${X(xv).toFixed(2)},${Y(yv).toFixed(2)}`);
        }
        out += `<polyline class="${cls}" points="${pts.join(" ")}"/>`;
      }
      if (s.points) {
        if (s.line) out += `<polyline class="${cls}" points="${s.points.map(([a, b]) => `${X(a)},${Y(b)}`).join(" ")}"/>`;
        out += s.points.map(([a, b]) => `<circle class="pt" cx="${X(a)}" cy="${Y(b)}" r="4.5"/>`).join("");
      }
    });
    (spec.notes || []).forEach(([xv, yv, text, anchor = "start", cls = "note"]) => {
      out += `<text class="${cls}" x="${X(xv)}" y="${Y(yv)}" text-anchor="${anchor}">${text}</text>`;
    });

    const svg = `<svg class="cd" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${out}</svg>`;
    return figure(svg, spec.caption, spec.label);
  }

  // Ready-made I–V sketches used in several places.
  const IV = {
    resistor: (x) => 0.8 * x,
    lamp: (x) => 0.82 * Math.tanh(1.7 * x),
    diode: (x) => (x <= 0.32 ? 0 : Math.min(0.95, 0.9 * ((x - 0.32) / 0.42) ** 2)),
  };

  function ivSketch(kind, caption) {
    const to = kind === "diode" ? 0.32 + 0.42 * Math.sqrt(0.95 / 0.9) : 1;
    return graph({
      sketch: true, w: 300, h: 230, x: [-1, 1], y: [-1, 1],
      xLabel: "p.d. / V", yLabel: "current / A",
      series: kind === "diode"
        ? [{ fn: IV.diode, from: -1, to }]
        : [{ fn: IV[kind], from: -1, to: 1 }],
      caption,
    });
  }

  window.Diagrams = { circuit, threeCoreCable, symbolGrid, graph, ivSketch, IV, sub };
})();
