/* Shared renderer for the GCSE unit workbooks (gcsephy/yearNphy/unitNN/workbook.html).
   Each unit loads its content (window.UNIT) and its settings (window.WORKBOOK, assets/book.js),
   then this file. Queries: ?part=N prints one part booklet (WORKBOOK.parts), ?review the Unit
   review, ?lesson=N one lesson; with none of these, the whole unit is previewed. Add &answers for
   the answer edition, which has the same page numbers. Maths between \( and \) is typeset by
   MathJax when the page loads it. Print with Chrome: A4, default margins, no headers or footers.

   WORKBOOK settings:
     file          name stem of the PDFs and page title ("Y10 - Unit 02 - Particle Model of Matter")
     name, year    footer text ("Particle Model of Matter", 10)
     coverTitle    HTML for the cover heading;  coverArt(W) the cover drawing
     quote         [text, who] printed on the cover (or a function of W)
     lede          one sentence on the cover of the whole-unit preview
     parts         lesson numbers in each part booklet, e.g. [[1, 2], [3, 5], [6, 7]]
     booklets      extra booklets for the preview bar, e.g. [["lesson=4", "RP 4"]]
     firstDoNow    heading of Lesson 1's Do now
     extension     Triple Science pages, if not UNIT.extension
     triangles     formula triangles by equation text, for equations without their own tri
     Hooks, each given W (this renderer's helpers and state): toolkit(W), side(lesson, W),
     reviewStart(W), block(b, W) for extra block types, question(b, W) for extra
     question parts, beforeRender(W). */
(function () {
  "use strict";

  const U = window.UNIT;
  const C = window.WORKBOOK;
  const params = new URLSearchParams(location.search);
  const answers = params.has("answers");
  const PARTS = C.parts;
  const MAX = Math.max(...U.lessons.map((l) => l.last || l.n));
  const partNo = PARTS[Number(params.get("part")) - 1] ? Number(params.get("part")) : 0;
  const ONE = partNo ? null : U.lessons.find((l) => l.n === Number(params.get("lesson"))) || null;
  const SEL = partNo ? U.lessons.filter((l) => PARTS[partNo - 1].includes(l.n)) : ONE ? [ONE] : null;
  const SOLO = !!SEL && SEL.length === 1;
  const REVISION = !SEL && params.has("revision") && U.revision ? U.revision : null;
  const REVIEW = !SEL && !REVISION && params.has("review");
  const LESSONS = SEL || (REVIEW || REVISION ? [] : U.lessons);
  const LAST = SEL ? SEL[SEL.length - 1].last || SEL[SEL.length - 1].n : MAX;
  const inSel = (n) => !!SEL && SEL.some((l) => l.n === n);
  const pad = (n) => String(n).padStart(2, "0");
  const lessonCount = (ls) => ls.reduce((s, l) => s + (l.last ? l.last - l.n + 1 : 1), 0);
  // "1–2", "3 and 5" or "6–8" (Lessons 7-8 can be one entry with last: 8).
  const span = (ls) => {
    const ns = ls.map((l) => l.n);
    const consecutive = ns.every((n, i) => !i || n === (ls[i - 1].last || ns[i - 1]) + 1);
    const end = ls[ls.length - 1].last || ns[ns.length - 1];
    if (ls.length === 1 && !ls[0].last) return String(ns[0]);
    if (consecutive) return `${ns[0]}–${end}`;
    return ns.length === 2 ? `${ns[0]} and ${ns[1]}` : ns.join(", ");
  };
  const lessonsLabel = (ls) => `${lessonCount(ls) > 1 ? "Lessons" : "Lesson"} ${span(ls)}`;
  const lessonName = (l) => (l.last ? `Lessons ${l.n}–${l.last}` : `Lesson ${l.n}`);
  const reviewAfter = lessonName(U.lessons[U.lessons.length - 1]);
  if (answers) document.body.classList.add("answers");

  const which = partNo ? `Part ${partNo}, ${lessonsLabel(SEL)}` : ONE ? lessonName(ONE) : REVIEW ? "Unit review" : REVISION ? "Revision exercises" : "";
  const footer = REVISION ? `${C.name}, Year ${C.year}: Revision exercises` : `${C.name}, Year ${C.year} workbook${which ? `: ${which}` : ""}${answers ? " (ANSWERS)" : ""}`;
  const pageStyle = document.createElement("style");
  pageStyle.textContent = `@page { @bottom-left { content: "${footer}, © PanPhy Labs. All rights reserved."; } } @page cover { @bottom-left { content: none; } }`;
  document.head.appendChild(pageStyle);
  document.title = `${C.file}${partNo ? ` (Part ${partNo})` : ONE ? ` (Lesson ${pad(ONE.n)})` : REVIEW ? " (Unit Review)" : REVISION ? " (Revision Exercises)" : ""}${answers ? " (Ans)" : ""}`;

  // ---------- small helpers ----------
  const ans = (html) => (html ? `<span class="ans">${html}</span>` : "");
  const ansNote = (html) => (html ? `<div class="ans-note">${html}</div>` : "");
  const lines = (n, a) => `<div class="lines" style="--n:${n}">${ans(a)}</div>`;
  const box = (h, a, grid) => `<div class="box${grid ? " grid-bg" : ""}" style="--h:${h}mm">${ans(a)}</div>`;
  // A Do now or Quick check item: every item ends in the same white writing box. A blank in the
  // sentence prints as a short gap with its options; the answer is written in the box.
  const gapped = (q) => String(q).replace(/\[\[(.*?)(?:\|([^\]]+))?\]\]/g, (_, a, extra) =>
    `<span class="gap-dots">…</span>${extra && !/^\d+$/.test(extra) ? ` <span class="opts">(${extra})</span>` : ""}`);
  const boxItem = (q, a, i) => `<div><b>${i + 1}</b>${marks(gapped(q))}${lines(2, a)}</div>`;
  const keep = (html) => `<div class="keep">${html}</div>`;
  const list = (items, cls) => `<ul${cls ? ` class="${cls}"` : ""}>${items.map((s) => `<li>${s}</li>`).join("")}</ul>`;

  /* Inline marks in sentences:
       [[answer]] or [[answer|30]]          a blank to write on (30 mm wide)
       [[answer|first / second / third]]    a blank with its options printed straight after it
       {{one|two*|three}}                   AQA-style ring box: draw a ring around one (* marks the answer) */
  function marks(text) {
    return String(text)
      .replace(/\[\[(.*?)(?:\|([^\]]+))?\]\]/g, (_, a, extra) => {
        const width = extra && /^\d+$/.test(extra) ? extra : null;
        const opts = extra && !width ? `<span class="opts">(${extra})</span>` : "";
        return `<span class="blank" style="--w:${width || 26}mm">${ans(a)}</span>${opts}`;
      })
      .replace(/\{\{(.+?)\}\}/g, (_, items) => `<span class="ring-box">${items.split("|").map((o) => {
        const right = o.endsWith("*");
        return `<span class="${right ? "correct" : ""}">${right ? o.slice(0, -1) : o}</span>`;
      }).join("")}</span>`);
  }

  const ICONS = {
    doNow: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
    learn: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z"/>',
    try: '<path d="M4 20l4-1L19 8l-3-3L5 16l-1 4ZM14 7l3 3"/>',
    lab: '<path d="M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4A1.5 1.5 0 0 0 19 19l-5-10V3M7.5 15h9"/>',
    exam: '<path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.3 6.8 19.1l1-5.8L3.5 9.2l5.9-.8Z"/>',
    check: '<path d="M4 12.5l5 5L20 6.5"/>',
    revise: '<path d="M20 11a8 8 0 0 0-14.3-4.9M4 5v4h4M4 13a8 8 0 0 0 14.3 4.9M20 19v-4h-4"/>',
  };
  const icon = (key) => `<span class="ico"><svg viewBox="0 0 24 24">${ICONS[key]}</svg></span>`;
  const SEC = {
    doNow: ["do-now", "Do now"], learn: ["learn", "Learn it"], try: ["try", "Try it"], lab: ["lab", "Practical"],
    check: ["check", "Quick check"], exam: ["exam", "Exam corner"], revise: ["revise", "Revise it"],
  };
  const secHead = (key, title) => `<div class="sec ${SEC[key][0]}">${icon(key)}<h3>${title || SEC[key][1]}</h3></div>`;

  /* Graph paper drawn in millimetres: 2 mm minor and 1 cm major squares.
     spec: { w, h, origin: "corner" | "centre", xLabel, yLabel, x: [valuePerCm, labelEvery], y: [...],
       yTicks: false leaves that scale for the student;
       blank: true leaves axes, labels and scales for the student (the answer edition shows them);
       printed in both editions: given (points), givenFit (fn) over givenRange, showRead ([[x, y]]);
       answer edition only: points, points2, fit ([[x1,y1],[x2,y2]] or fn over fitRange), fit2, curve
       ([[x, y], ...]), bars ([[label, value]]), rings, guide ([x, y]), read ([[x, y]]) } */
  function graphPaper(spec) {
    const W = spec.w || 150, H = spec.h || 90, L = 18, T = 6;
    const centre = spec.origin === "centre" || spec.origin === "center";
    const ox = centre ? W / 2 : 0, oy = centre ? H / 2 : H;
    const X = (v) => L + ox + (v / spec.x[0]) * 10;
    const Y = (v) => T + oy - (v / spec.y[0]) * 10;
    const show = (flag) => answers || (!spec.blank && flag !== false);
    const fmt = (v) => String(Math.round(v * 1000) / 1000);
    const cross = ([a, b], cls) => { const x = X(a), y = Y(b); return `<path class="${cls}" d="M${x - 1.2} ${y - 1.2}L${x + 1.2} ${y + 1.2}M${x - 1.2} ${y + 1.2}L${x + 1.2} ${y - 1.2}"/>`; };
    const curve = (fn, [a, b], cls) => `<polyline class="${cls}" points="${Array.from({ length: 121 }, (_, i) => a + ((b - a) * i) / 120).map((v) => `${X(v).toFixed(2)},${Y(fn(v)).toFixed(2)}`).join(" ")}"/>`;
    const line = ([[a, b], [c, d]], cls) => `<line class="${cls}" x1="${X(a)}" y1="${Y(b)}" x2="${X(c)}" y2="${Y(d)}"/>`;
    let out = "";
    for (let i = 0; i <= W; i += 2) out += `<line class="${i % 10 ? "minor" : "major"}" x1="${L + i}" y1="${T}" x2="${L + i}" y2="${T + H}"/>`;
    for (let j = 0; j <= H; j += 2) out += `<line class="${j % 10 ? "minor" : "major"}" x1="${L}" y1="${T + j}" x2="${L + W}" y2="${T + j}"/>`;
    if (show()) out += `<line class="axis" x1="${L}" y1="${T + oy}" x2="${L + W}" y2="${T + oy}"/><line class="axis" x1="${L + ox}" y1="${T}" x2="${L + ox}" y2="${T + H}"/>`;
    if (!spec.bars && show()) {
      for (let cm = -Math.floor(ox / 10); cm <= (W - ox) / 10; cm += spec.x[1] || 1) {
        if (cm) out += `<text class="tick" x="${L + ox + cm * 10}" y="${T + oy + 3.8}" text-anchor="middle">${fmt(cm * spec.x[0])}</text>`;
      }
    }
    if (show(spec.yTicks)) {
      for (let cm = -Math.floor((H - oy) / 10); cm <= oy / 10; cm += spec.y[1] || 1) {
        if (cm) out += `<text class="tick" x="${L + ox - 1.2}" y="${T + oy - cm * 10 + 1}" text-anchor="end">${fmt(cm * spec.y[0])}</text>`;
      }
      out += `<text class="tick" x="${L + ox - 1.2}" y="${T + oy + 3.8}" text-anchor="end">0</text>`;
    }
    if (show()) {
      // Axis labels sit at the middle of each axis, outside the grid; the y label reads bottom to top.
      out += `<text class="axis-label" x="${L + W / 2}" y="${T + H + 8}" text-anchor="middle">${spec.xLabel || ""}</text>`;
      out += `<text class="axis-label" x="4.5" y="${T + H / 2}" text-anchor="middle" transform="rotate(-90 4.5 ${T + H / 2})">${spec.yLabel || ""}</text>`;
    }
    if (spec.given) out += spec.given.map((p) => cross(p, "given-mark")).join("");
    if (spec.givenFit) out += curve(spec.givenFit, spec.givenRange, "given-fit");
    if (spec.showRead) out += spec.showRead.map(([a, b]) => `<path class="read given-read" d="M${L + ox} ${Y(b)} H${X(a)} V${T + oy}"/>`).join("");
    if (answers) {
      if (spec.bars) {
        out += spec.bars.map(([label, v], i) => {
          const x = L + 6 + i * (spec.barStep || 26), y = Y(v);
          return `<rect class="bar" x="${x}" y="${y}" width="${spec.barW || 14}" height="${T + H - y}"/><text class="tick" x="${x + (spec.barW || 14) / 2}" y="${T + H + 3.8}" text-anchor="middle">${label}</text>`;
        }).join("");
      }
      if (spec.points) out += spec.points.map((p) => cross(p, "mark")).join("");
      if (spec.points2) out += spec.points2.map(([a, b]) => `<circle class="mark" cx="${X(a)}" cy="${Y(b)}" r="1.1"/>`).join("");
      if (typeof spec.fit === "function") out += curve(spec.fit, spec.fitRange, "fit");
      else if (spec.fit) out += line(spec.fit, "fit");
      if (spec.fit2) out += line(spec.fit2, "fit fit-2");
      if (spec.curve) out += `<polyline class="fit" points="${spec.curve.map(([a, b]) => `${X(a).toFixed(2)},${Y(b).toFixed(2)}`).join(" ")}"/>`;
      if (spec.rings) out += spec.rings.map(([a, b]) => `<circle class="fit" cx="${X(a)}" cy="${Y(b)}" r="3"/>`).join("");
      if (spec.guide) { const [gx, gy] = spec.guide; out += `<path class="fit fit-2" d="M${X(gx)} ${T + H}V${Y(gy)}H${L}"/>`; }
      if (spec.read) out += spec.read.map(([a, b]) => `<path class="read" d="M${L + ox} ${Y(b)} H${X(a)} V${T + oy}"/>`).join("");
    }
    return `<svg class="graph-paper" viewBox="0 0 ${W + L + 4} ${H + T + 10}" style="width:${W + L + 4}mm;height:${H + T + 10}mm" role="img" aria-label="Graph paper">${out}</svg>`;
  }

  // ---------- formula triangles ----------
  // tri: { top, bottom: [two or three labels] } or [top, left, right]. "E_p" draws E with a subscript p.
  // Subscripts after "_"; a squared or cubed label (I², v²) gets a real raised digit at full letter size.
  // A top word longer than six letters (distance) is narrowed to fit inside the apex.
  const svgLabel = (s) => s.replace(/_(\w+)/, '<tspan baseline-shift="sub" font-size="70%">$1</tspan>')
    .replace(/[²³]/g, (c) => `<tspan baseline-shift="super" font-size="62%">${c === "²" ? 2 : 3}</tspan>`);
  function triangleSvg(tri, size) {
    const { top, bottom } = Array.isArray(tri) ? { top: tri[0], bottom: tri.slice(1) } : tri;
    const font = (s) => { const n = s.replace(/_\w+/, "").replace(/[²³]/g, "").length; return n > 4 ? 11 : n > 1 ? 15 : 21; };
    const three = bottom.length === 3;
    const cells = three ? [[30, 88], [60, 88], [90, 88]] : [[35, 88], [85, 88]];
    const dividers = three ? "M33 56 H87 M46 56 V99 M74 56 V99" : "M33 56 H87 M60 56 V99";
    return `<svg class="tri-svg" viewBox="0 0 120 104" style="width:${size}" role="img" aria-label="Formula triangle: ${top.replace("_", "")} at the top, ${bottom.join(" and ").replace(/_/g, "")} at the bottom">
      <path d="M60 5 L6 99 H114 Z" fill="var(--spark-t)" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>
      <path d="${dividers}" stroke="var(--ink)" stroke-width="2.4"/>
      <g font-family="Arial Black, Arial, sans-serif" font-weight="900" fill="var(--ink)" text-anchor="middle">
        <text x="60" y="${/_/.test(top) ? 37 : top.length > 6 ? 51 : top.length > 4 ? 50 : 45}" font-size="${/_/.test(top) ? 16 : top.length > 6 ? 10 : font(top)}"${top.length > 6 && !/_/.test(top) ? ' textLength="44" lengthAdjust="spacingAndGlyphs"' : ""}>${svgLabel(top)}</text>
        ${bottom.map((b, i) => `<text x="${cells[i][0]}" y="${cells[i][1]}" font-size="${three ? Math.min(font(b), 17) : font(b)}">${svgLabel(b)}</text>`).join("")}
      </g></svg>`;
  }
  const plainEq = (eq) => eq.replace(/<[^>]+>/g, "");
  const triFor = (e) => e.tri || (C.triangles && C.triangles[plainEq(e.eq)]) || null;

  // ---------- blocks ----------
  let qNum = 0;
  // A sub-heading stays on the same page as the block after it. A block with newPage: true starts a page.
  function renderBlocks(blocks) {
    const out = [];
    const items = blocks || [];
    for (let i = 0; i < items.length; i += 1) {
      const b = items[i];
      let html;
      if (b && b.t === "sub" && items[i + 1]) {
        const n = leads(items, i + 1) && items[i + 2].t !== "sub" ? 3 : 2; // a one-paragraph lead stays with what it introduces
        html = keep(items.slice(i, i + n).map(renderBlock).join("")); i += n - 1;
      } else html = renderBlock(b);
      out.push(b && b.newPage ? `<div class="new-page">${html}</div>` : html);
    }
    return out.join("");
  }
  // A short lead (a paragraph or list) followed by the block it introduces.
  const LEADS = ["p", "list", "steps"];
  const leads = (items, i) => {
    const b = items[i], next = items[i + 1];
    return !!b && !!next && (typeof b === "string" || LEADS.includes(b.t)) && typeof next === "object" && !next.newPage;
  };
  // A section heading stays with its first block (and any sub-headings before it), so a heading
  // never ends a page; a one-paragraph lead also keeps the block after it.
  function section(key, title, blocks, safety) {
    const items = blocks || [];
    if (!items.length) return "";
    let first = 1;
    while (first < items.length && items[first - 1] && items[first - 1].t === "sub") first += 1;
    if (leads(items, first - 1)) {
      first += 1;
      // A lead followed by a sub-heading keeps that sub-heading and its first block too.
      while (first < items.length && items[first - 1].t === "sub") first += 1;
    }
    const warn = safety ? renderBlock({ t: "safety", items: [].concat(safety) }) : "";
    return keep(secHead(key, title) + warn + renderBlocks(items.slice(0, first))) + renderBlocks(items.slice(first));
  }

  function renderBlock(b) {
    if (typeof b === "string") return `<p>${marks(b)}</p>`;
    switch (b.t) {
      case "p": return `<p>${marks(b.h)}</p>`;
      case "html": return b.h;
      case "sub": return `<h4 class="sub">${b.h}</h4>`;
      case "key": return `<div class="key">${marks(b.h)}</div>`;
      case "warn": return `<div class="key warn">${marks(b.h)}</div>`;
      case "tip": return `<div class="tip">${b.h}</div>`;
      case "model":
        return `<div class="model"><h4>${b.title || "Think of it like this"}</h4><p>${b.h}</p>${b.breaks ? `<p class="breaks">${b.breaks}</p>` : ""}</div>`;
      case "rule": return `<div class="rule-card"><div class="rule-head">${b.head || "Rule"}</div><div class="rule-body">${b.h}</div>${b.foot ? `<div class="rule-foot">${b.foot}</div>` : ""}</div>`;
      case "eq": {
        const tri = triFor(b);
        return `<div class="eq-card${tri ? " has-tri" : ""}${b.stack ? " stack" : ""}"><div class="eq">${b.eq}</div><div class="words">${b.words}</div><div class="units">${b.units}</div>${b.re ? `<div class="re">${b.re}</div>` : ""}${tri ? `<div class="tri-mini">${triangleSvg(tri, "21mm")}</div>` : ""}</div>`;
      }
      case "split": return `<div class="split ${b.cls || ""}"><div>${renderBlocks(b.left)}</div><div>${renderBlocks(b.right)}</div></div>`;
      case "fig": return `<div class="fig ${b.cls || ""}">${b.h}${b.cap ? `<p class="cap">${b.cap}</p>` : ""}</div>`;
      case "figs": return `<div class="figs c${b.cols || b.items.length} ${b.cls || ""}">${b.items.map((h) => `<div class="fig">${h}</div>`).join("")}</div>`;
      case "compare": return compareTable(b);
      case "worked": return worked(b);
      case "follow": return follow(b);
      case "steps": return `<ol class="steps">${b.items.map((s) => `<li>${marks(s)}</li>`).join("")}</ol>`;
      case "list": return list(b.items, "bullets");
      case "safety": return `<div class="safety"><h4>${b.title || "Stay safe"}</h4>${list(b.items)}</div>`;
      case "vars": return `<table class="vars${b.cls ? " " + b.cls : ""}">${b.rows.map(([k, given, a]) => `<tr><th>${k}</th><td>${given ? marks(given) : ans(a)}</td></tr>`).join("")}</table>`;
      case "checks": return checks(b);
      case "graph": return graphPaper(b);
      case "table": return dataTable(b);
      case "q": return question(b);
      case "part": return question(Object.assign({}, b, { part: true })); // an unnumbered part of a question
      case "lab": return `<div class="lab-card">${renderBlocks(b.title ? [{ t: "sub", h: b.title }, ...b.blocks] : b.blocks)}</div>`; // the title keeps its lead
      case "home": return `<div class="home-card"><h4>${b.title || "Take it home"}</h4>${renderBlocks(b.blocks)}</div>`;
      default: {
        const html = C.block && C.block(b, W);
        if (html == null) throw new Error(`Workbook: unknown block type "${b.t}"`);
        return html;
      }
    }
  }

  // Tick-box checklist: items, with one tick column per heading in `head`.
  // cols: 2 sets the items side by side in two columns, read down each column.
  function checks(b) {
    const head = b.head || ["✓"];
    const ticked = b.a || [];
    const cols = b.cols || 1, per = Math.ceil(b.items.length / cols);
    const cell = (i) => (i < b.items.length
      ? `<td>${b.items[i]}</td>${head.map((_, j) => `<td class="tick-col"><span class="tickbox${ticked[i] === j ? " on" : ""}"></span></td>`).join("")}`
      : `<td></td>${head.map(() => `<td class="tick-col"></td>`).join("")}`);
    const th = (c) => `<th>${c ? "" : b.title || "Check"}</th>${head.map((h) => `<th class="tick-col">${h}</th>`).join("")}`;
    const rows = Array.from({ length: per }, (_, r) => `<tr>${Array.from({ length: cols }, (_, c) => cell(c * per + r)).join("")}</tr>`).join("");
    return `<table class="checks${cols > 1 ? " cols" : ""}${b.cls ? " " + b.cls : ""}"><thead><tr>${Array.from({ length: cols }, (_, c) => th(c)).join("")}</tr></thead><tbody>${rows}</tbody></table>`;
  }

  // Cells: a string is printed (the first as a row heading unless plainFirst); {opts, a} is a blank.
  function compareTable(b) {
    const head = b.head ? `<thead><tr>${b.head.map((h) => `<th>${h}</th>`).join("")}</tr></thead>` : "";
    const body = b.rows.map((r) => `<tr>${r.map((c, i) => {
      if (c && typeof c === "object") return `<td class="blank-cell">${c.opts ? `<span class="cell-opts">${c.opts}</span>` : ""}${ans(c.a)}</td>`;
      if (i === 0 && !b.plainFirst) return `<th>${marks(c)}</th>`;
      return `<td>${marks(c)}</td>`;
    }).join("")}</tr>`).join("");
    return `<table class="compare${b.cls ? " " + b.cls : ""}">${head}<tbody>${body}</tbody></table>`;
  }

  const steps = (arr, blank) => arr.map(([k, v], i) => `<div class="step${i === arr.length - 1 ? " final" : ""}"><span>${k}</span><span>${blank ? ans(v) : v}</span></div>`).join("");
  const given = (t) => (t ? dataTable(t) : "");
  function worked(b) {
    return `<div class="worked"><div><h4>Worked example</h4><div class="q">${b.q}</div>${given(b.table)}${steps(b.steps)}</div>` +
      `<div class="yt"><h4>Your turn</h4><div class="q">${b.yt.q}</div>${given(b.yt.table)}${steps(b.yt.steps, true)}</div></div>`;
  }

  /* A worked example from a deck slide, printed blank so that students fill it in while the
     teacher models it; the answer edition fills it in. yt: a parallel question to try alone. */
  function follow(b) {
    const col = (cls, head, x) => `<div class="${cls}"><h4>${head}</h4><div class="q">${x.q}</div>${given(x.table)}${steps(x.steps, true)}</div>`;
    return `<div class="worked follow${b.yt ? "" : " solo"}">${col("with", `With your teacher<span class="slide-tag">Slide ${b.slide}</span>`, b)}${b.yt ? col("yt", "Your turn", b.yt) : ""}</div>`;
  }

  // The deck's Quick check slide, numbered on its own so that lesson question numbers do not move.
  const quickCheck = (qc) => keep(secHead("check", qc.title) +
    `<div class="do-now-box quick-box">${qc.items.map(([q, a], i) => boxItem(q, a, i)).join("")}</div>`);

  function question(b) {
    if (!b.part) qNum += 1;
    const type = b.type ? `<span class="type">${b.type}</span>` : "";
    const mk = b.marks ? `<span class="marks">[${b.marks} mark${b.marks > 1 ? "s" : ""}]</span>` : "";
    let body = "";
    if (b.say) body += `<div class="say" data-who="${b.say[0]}">${b.say[1]}</div>`;
    if (b.fig) body += `<div class="fig ${b.figCls || "fig-mid"}">${b.fig}</div>`;
    if (b.mcq) {
      const right = [].concat(b.mcq.c);
      body += `<ul class="mcq" style="--cols:${b.mcq.cols || 2}">${b.mcq.o.map((o, i) => `<li class="${right.includes(i) ? "correct" : ""}">${o}</li>`).join("")}</ul>`;
    }
    if (b.bank) body += `<div class="bank"><div>${b.bank.map((w) => `<span>${w}</span>`).join("")}</div></div>`;
    if (b.fill) body += [].concat(b.fill).map((f) => `<p class="fill">${marks(f)}</p>`).join("");
    if (b.ring) {
      body += `<div class="ring-row">${b.ring.map((r) => `<div><span class="ring-lead">${marks(r[0])}</span><span class="ring-box">${r[1].map((o, i) => `<span class="${i === r[2] ? "correct" : ""}">${o}</span>`).join("")}</span>${r[3] ? `<span class="ring-tail">${marks(r[3])}</span>` : ""}</div>`).join("")}</div>`;
    }
    if (b.match) body += match(b.match);
    if (b.options) {
      body += `<div class="options-row" style="--cols:${b.options.cols || b.options.items.length}">${b.options.items.map((o) => `<div><b>${o.label}</b>${o.fig ? `<div class="opt-fig">${o.fig}</div>` : ""}${o.text ? `<div>${o.text}</div>` : ""}${o.choice ? `<div class="circle-choice">${o.choice.map((c, i) => `<span class="${i === o.c ? "correct" : ""}">${c}</span>`).join("")}</div>` : ""}</div>`).join("")}</div>`;
    }
    if (b.order) body += `<ol class="order">${b.order.map(([a, text]) => `<li data-a="${a}">${text}</li>`).join("")}</ol>`;
    if (C.question) body += C.question(b, W) || "";
    if (b.table) body += dataTable(b.table);
    if (b.graph) body += graphPaper(b.graph);
    if (b.starter) body += `<p class="starter">${b.starter}</p>`;
    if (b.frame) {
      const rows = b.frame === true ? [["Equation", ""], ["Substitute", ""], ["Answer", ""]] : b.frame;
      const fa = b.frameA || [];
      body += `<div class="frame${rows.some(([k]) => k.split(/\s+/).some((w) => w.length > 10)) ? " wide" : ""}">${rows.map(([k, unit], i) => `<span>${k}</span><span>${ans(fa[i])}${unit ? `<span class="unit">${unit}</span>` : ""}</span>`).join("")}</div>`;
    }
    if (b.after) body += renderBlocks(b.after);
    if (b.lines) body += lines(b.lines, b.a);
    else if (b.box) body += box(b.box, b.a, b.grid);
    else if (b.a && !b.frame) body += ansNote(b.a);
    if (b.part) return `<div class="question part"><div class="prompt">${mk}${marks(b.p || "")}</div>${body}</div>`;
    return `<div class="question"><span class="qn">${qNum}</span><div class="prompt">${mk}${type}${marks(b.p || "")}</div>${body}</div>`;
  }

  /* Two kinds of matching question:
     { left: [text], right: [text], a: [[i, j]] }  join with lines (drawn in the answer edition);
     { left: [[text, answer letter]], right: [text] }  write the letter (shown in the answer edition). */
  function match(m) {
    if (!Array.isArray(m.left[0])) {
      return `<div class="match"><div>${m.left.map((l) => `<span>${l}</span>`).join("")}</div><div class="match-gap">${answers ? m.a.map(([i, j]) => `<svg viewBox="0 0 100 ${m.left.length * 10}" preserveAspectRatio="none"><line x1="0" y1="${i * 10 + 5}" x2="100" y2="${j * 10 + 5}"/></svg>`).join("") : ""}</div><div>${m.right.map((r) => `<span>${r}</span>`).join("")}</div></div>`;
    }
    const rows = Math.max(m.left.length, m.right.length);
    let grid = "";
    for (let i = 0; i < rows; i += 1) {
      const l = m.left[i], r = m.right[i];
      grid += l ? `<div><b>${i + 1}</b>${l[0]}</div>` : '<div class="empty"></div>';
      grid += `<div class="join-cell"><span class="join">${l ? `→ ${l[1]}` : ""}</span></div>`;
      grid += r ? `<div><b>${String.fromCharCode(65 + i)}</b>${r}</div>` : '<div class="empty"></div>';
    }
    return `<div class="match letters">${grid}</div>`;
  }

  // Cells: a string is printed; null is a blank (answer from t.ans); {opts, a} prints its choices.
  function dataTable(t) {
    const head = `<tr>${t.head.map((h) => `<th>${h}</th>`).join("")}</tr>`;
    const body = t.rows.map((row, r) => `<tr>${row.map((c, i) => {
      if (c === null) return `<td>${t.ans && t.ans[r] ? ans(t.ans[r][i]) : ""}</td>`;
      if (typeof c === "object") return `<td class="blank-cell">${c.opts ? `<span class="cell-opts">${c.opts}</span>` : ""}${ans(c.a)}</td>`;
      return `<td class="given">${marks(c)}</td>`;
    }).join("")}</tr>`).join("");
    const cols = t.widths ? `<colgroup>${t.widths.map((w) => `<col style="width:${w}">`).join("")}</colgroup>` : "";
    return `<table class="data${t.cls ? " " + t.cls : ""}"${t.rh ? ` style="--rh:${t.rh}mm"` : ""}>${cols}${head}${body}</table>`;
  }

  // ---------- lessons ----------
  // The panel beside the lesson goals: the unit's side hook, or the lesson's story.
  function side(l) {
    if (C.side) return C.side(l, W);
    if (l.story) return `<div class="online story"><div><h3>${l.story.title}</h3><p>${l.story.text}</p></div></div>`;
    return "";
  }

  function lesson(l) {
    qNum = 0;
    const panel = side(l);
    const opener = `<header class="opener"><div class="num"><small>${l.last ? "Lessons" : "Lesson"}</small>${pad(l.n)}${l.last ? `<span class="num-to">–&thinsp;${pad(l.last)}</span>` : ""}</div>
      <div><h2>${l.title}</h2><div class="spec">${l.spec}</div></div><div class="big-q">${l.big}</div></header>
      <div class="opener-foot${panel ? "" : " solo"}"><div class="goals"><h3>By the end you can</h3>${list(l.goals)}
      <div class="keywords">${l.keywords.map((k) => `<span>${k}</span>`).join("")}</div></div>${panel}</div>`;

    // Each part is built when it is placed, so questions are numbered in the order they are printed.
    const parts = {
      doNow: () => keep(`${secHead("doNow", l.n === 1 ? C.firstDoNow || "What do you already know?" : "Do now")}
        <div class="do-now-box">${l.doNow.map(([q, a], i) => boxItem(q, a, i)).join("")}</div>`),
      learn: () => section("learn", l.learnTitle, l.learn),
      try: () => (l.try ? section("try", l.tryTitle, l.try) : ""),
      lab: () => (l.lab ? section("lab", l.lab.title, l.lab.blocks, l.lab.safety) : ""),
      lab2: () => (l.lab2 ? section("lab", l.lab2.title, l.lab2.blocks, l.lab2.safety) : ""),
      check: () => (l.quick ? [].concat(l.quick).map(quickCheck).join("") : ""),
      // The card may break between questions; its heading stays with the first one.
      exam: () => (l.exam ? `<div class="exam-card">${l.exam.map((e, i) => keep((i ? "" : secHead("exam")) + question(e))).join("")}</div>` : ""),
      home: () => (l.home ? keep(renderBlock({ t: "home", title: l.home.title, blocks: l.home.blocks })) : ""),
      revise: () => keep(secHead("revise") +
        `<div class="revise-card"><div><h4>Summary</h4>${list(l.summary)}
        <div class="recall"><h4>Cover the page and answer</h4>${l.recall.map(([q], i) => `<p><b>${i + 1}</b>${q}</p>`).join("")}</div></div>
        <div><h4>I can…</h4><ul class="cando">${l.cando.map((c) => `<li><span>${c}</span><span class="rag"><i></i><i></i><i></i></span></li>`).join("")}</ul></div></div>`),
    };
    // flow lists the sections in order: a name from `parts`, or { sec, title, blocks, safety } for an
    // extra Practical or Try it section (the long practical lessons have several).
    const flow = l.flow || l.order || ["doNow", "learn", "try", "lab", "lab2", "check", "exam", "home", "revise"];
    // newPage lists the parts that start a new page.
    const place = (k) => {
      const html = typeof k === "string" ? parts[k]() : section(k.sec, k.title, k.blocks, k.safety);
      return html && typeof k === "string" && (l.newPage || []).includes(k) ? `<div class="new-page">${html}</div>` : html;
    };
    return `<section class="lesson" style="--accent:var(--${l.accent});--accent-t:var(--${l.accent}-t)">${opener}${flow.map(place).join("")}</section>`;
  }

  // ---------- front and back matter ----------
  const EXTENSION = C.extension || U.extension || [];

  // On a part's cover, name the lessons inside or just after its range that print as booklets of their own.
  function elsewhere() {
    const own = (C.booklets || []).map(([q]) => +(/^lesson=(\d+)$/.exec(q) || [])[1]).filter(Boolean);
    const ns = SEL.map((l) => l.n);
    const lo = Math.min(...ns), hi = Math.max(...ns) + 1;
    return U.lessons.filter((l) => own.includes(l.n) && l.n > lo && l.n <= hi && !ns.includes(l.n))
      .map((l) => `<p class="cover-note">${lessonName(l)}, ${l.title}, is in its own booklet.</p>`).join("");
  }

  function cover() {
    let middle;
    if (SEL) {
      middle = `<div class="cover-part"><b>${partNo ? `Part ${partNo} of ${PARTS.length}` : lessonName(ONE)}</b><span>${partNo ? lessonsLabel(SEL) : ONE.title}</span></div>
      <h2 class="cover-sub">In this booklet</h2>${list(SEL.map((l) => `${lessonName(l)}: ${l.title}${l.rp ? ` (${l.rp.toLowerCase()})` : ""}`), "cover-lessons")}${partNo ? elsewhere() : ""}`;
    } else if (REVIEW) {
      middle = `<div class="cover-part"><b>Unit review</b><span>After ${reviewAfter}</span></div>
      <h2 class="cover-sub">In this booklet</h2>${list(["Mixed exam practice", ...(EXTENSION.length ? ["Triple Science only pages"] : []), "Toolkit and key words"], "cover-lessons")}`;
    } else {
      middle = `<p class="lede">${C.lede}</p>${list(U.lessons.map((l) => `${lessonName(l)}: ${l.title}`), "cover-lessons")}`;
    }
    const q = typeof C.quote === "function" ? C.quote(W) : C.quote;
    const quote = q ? `<blockquote class="cover-quote">${q[0]}<span>${q[1]}</span></blockquote>` : "";
    const where = partNo ? `Part ${partNo} of ${PARTS.length}` : ONE ? `${lessonName(ONE)} of ${MAX}` : REVIEW ? "Unit review" : "Unit booklet";
    return `<section class="cover" data-year="${C.year}"><div class="eyebrow">Year ${C.year} Physics, AQA GCSE, ${where}</div>
      <h1>${C.coverTitle}</h1>
      ${middle}
      ${quote}
      ${answers ? '<div class="edition">Answer edition</div>' : ""}
      <div class="cover-foot">
        <div class="cover-circuit">${C.coverArt ? C.coverArt(W) : ""}</div>
        <div class="cover-fields" style="--cols:${REVIEW ? 3 : 2}">${["Name", "Class", "Teacher", ...(REVIEW ? ["Score"] : [])].map((f) => `<div>${f}<span></span></div>`).join("")}</div>
      </div></section>`;
  }

  function glossary() {
    const words = U.glossary.filter(([, , n]) => (SEL ? inSel(n) : n <= LAST));
    if (!words.length) return "";
    const phrases = (U.phrases || []).filter(([, , n]) => (SEL ? inSel(n) : n <= LAST));
    return `<section class="${SEL ? "tracker-flow" : "new-page"}"><div class="eyebrow">Reference</div><h2 class="page-title">Key words</h2>
      <div class="glossary${SEL ? " one" : ""}">${words.map(([k, v]) => `<p><strong>${k}</strong>: ${v}</p>`).join("")}</div>
      ${phrases.length ? keep(`<h4 class="sub">Phrases that pick up marks</h4>
      <table class="compare phrases"><thead><tr><th>Instead of writing…</th><th>Write…</th></tr></thead><tbody>${phrases.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("")}</tbody></table>`) : ""}</section>`;
  }

  function quickAnswers() {
    const ol = (arr) => `<ol>${arr.map(([, a]) => `<li>${a}</li>`).join("")}</ol>`;
    return `<section class="${SEL ? "tracker-flow" : "new-page"}"><div class="eyebrow">Check yourself</div><h2 class="page-title">Quick answers</h2>
      <div class="quick-answers${SOLO ? " one" : ""}">${LESSONS.map((l) => `<div>${SOLO ? "" : `<b>${lessonName(l)}: ${l.title}</b>`}
        <h4>Do now</h4>${ol(l.doNow)}<h4>Cover the page</h4>${ol(l.recall)}</div>`).join("")}</div></section>`;
  }

  // Unit review: mixed exam practice. A question with parts may break between them.
  function review() {
    qNum = 0;
    return `<section class="lesson" style="--accent:var(--violet);--accent-t:var(--violet-t)">
      <div class="eyebrow">After ${reviewAfter}</div><h2 class="page-title">Unit review</h2>
      ${C.reviewStart ? C.reviewStart(W) : ""}
      ${U.review.map((q, i) => {
        const html = (i ? "" : secHead("exam", "Mixed exam practice")) + question(q);
        return q.after && i ? html : keep(html); // the heading stays with the first question
      }).join("")}</section>`;
  }

  /* Revision exercises (?revision, UNIT.revision): no cover. Page 1 has the name fields and the
     equations, then the questions; the mark scheme is printed last, on a new page, in the same
     booklet. revision: { eyebrow, title, minutes, upTo (last lesson whose equations are listed),
     questions }. A question's parts (after: [{ t: "part" }]) carry the marks; each top-level
     question or part has ms, its mark scheme entry, and an optional label ("(a)" is read from the prompt). */
  function revision() {
    const R = REVISION;
    const partsOf = (q) => (q.after || []).filter((b) => b.t === "part");
    const markOf = (q) => (q.marks || 0) + partsOf(q).reduce((s, p) => s + (p.marks || 0), 0);
    const total = R.questions.reduce((s, q) => s + markOf(q), 0);
    const eqs = U.equations.filter((e) => e.lesson <= (R.upTo || MAX) && !e.ht && !e.triple);
    const field = (f, cls, val) => `<div class="${cls || ""}">${f}<span>${val || ""}</span></div>`;
    qNum = 0;
    const page = `<section class="lesson revision" style="--accent:var(--leaf);--accent-t:var(--leaf-t)">
      <div class="sheet-fields">${field("Name", "wide")}${field("Class")}${field("Teacher", "half")}${field("Date", "half")}${field("Score", "half", `/ ${total}`)}</div>
      <div class="sheet-head"><div><div class="eyebrow">${R.eyebrow}</div><h2 class="page-title">${R.title}</h2></div>
      <div class="sheet-meta">${R.minutes} minutes<br>${total} marks</div></div>
      ${keep(secHead("learn", "Equations") + compareTable({ head: ["In words", "In symbols", "Units"], plainFirst: true, cls: "sheet-eqs",
        rows: eqs.map((e) => [e.words, `<strong>${e.eq}</strong>`, e.units]) }))}
      ${R.questions.map((q, i) => {
        // A question with parts may break between them; the heading never ends a page (.sec).
        const html = (i ? "" : secHead("exam", "Questions")) + question(q);
        return q.after ? html : keep(html);
      }).join("")}</section>`;
    const label = (p) => p.label || (/^\(([a-z]+)\)/.exec(p.p || "") || [])[0] || "";
    // Two columns of questions, each part with its answer and marks, so the scheme fits on one page.
    const blocks = R.questions.map((q, i) => {
      const ps = partsOf(q);
      const rows = (ps.length ? ps : [q]).map((p) => `<div class="ms-row"><b>${ps.length ? label(p) : ""}</b><div>${p.ms || ""}</div><span class="mk">[${p.marks || 0}]</span></div>`).join("");
      return `<div class="ms-q"><span class="qn">${i + 1}</span>${rows}</div>`;
    }).join("");
    const scheme = `<section class="new-page mark-scheme"><div class="sheet-head"><div><div class="eyebrow">Answers</div><h2 class="page-title">Mark scheme</h2></div>
      <div class="sheet-meta">Total: ${total} marks</div></div><div class="ms-cols">${blocks}</div></section>`;
    return page + scheme;
  }

  // Triple Science only pages, printed in the Unit review after the exam practice.
  function extension(x) {
    qNum = 0;
    return `<section class="lesson" style="--accent:var(--leaf);--accent-t:var(--leaf-t)">
      <div class="eyebrow">${x.eyebrow}</div><h2 class="page-title">${x.title}<span class="triple-tag">Triple only</span></h2>
      ${renderBlocks(x.learn)}${keep(secHead("try", "Check it") + question(x.questions[0]))}${x.questions.slice(1).map((q) => question(q)).join("")}${x.quick ? quickCheck(x.quick) : ""}</section>`;
  }

  /* The equation toolkit page: every equation met so far (UNIT.equations; Triple-only equations only in
     the Unit review), with formula triangles. o.note: the triangle example; o.convert: the unit
     conversions in step 1; o.after: anything printed below the steps. */
  function equationToolkit(o) {
    const eqs = U.equations.filter((e) => (e.triple ? !SEL : e.lesson <= LAST));
    if (!eqs.length) return "";
    const tools = eqs.map((e) => {
      const tri = triFor(e);
      return `<div class="tool${tri ? " has-tri" : ""}"><div class="eq">${e.eq}</div>${e.triple ? `<span class="lesson-tag">Triple only</span>` : ""}<div class="words">${e.words}</div><div class="units">${e.units}</div><div class="recall-cover">${e.re}</div>${tri ? `<div class="tool-tri">${triangleSvg(tri, "24mm")}</div>` : ""}</div>`;
    }).join("");
    const how = eqs.some(triFor) ? `<div class="tri-how"><div class="tri-steps"><p><b>1</b> Cover the quantity you want to find.</p><p><b>2</b> What is left side by side? <strong>Multiply</strong>.</p><p><b>3</b> One above the other? <strong>Divide</strong> the top by the bottom.</p></div>${o.note ? `<p class="tri-note">${o.note}</p>` : ""}</div>` : "";
    return `<section class="new-page toolkit-page"><div class="eyebrow">Reference</div><h2 class="page-title">Equation toolkit</h2>
      ${how}<div class="toolkit">${tools}</div>
      <div class="method-steps"><div><b>1</b>Write what you know. Convert first: ${o.convert}.</div><div><b>2</b>Write the equation in symbols.</div><div><b>3</b>Rearrange if you need to, then substitute the numbers.</div><div><b>4</b>Give the answer with a unit. Ask: is it sensible?</div></div>
      ${o.after || ""}</section>`;
  }

  // The helpers and state the unit hooks (assets/book.js) can use.
  const W = {
    U, C, answers, SEL, SOLO, LESSONS, LAST, MAX, partNo, REVIEW, inSel, pad, ans, lines, box, keep, list, marks,
    icon, secHead, graphPaper, triangleSvg, plainEq, triFor, renderBlocks, renderBlock, question, dataTable,
    compareTable, section, equationToolkit,
    get qNum() { return qNum; }, set qNum(v) { qNum = v; },
  };
  const toolkit = () => (C.toolkit ? C.toolkit(W) : "");

  if (C.beforeRender) C.beforeRender(W);
  const book = document.createElement("main");
  book.className = "book";
  const link = (key, a) => `?${[key, a ? "answers" : ""].filter(Boolean).join("&")}`;
  const here = partNo ? `part=${partNo}` : ONE ? `lesson=${ONE.n}` : REVIEW ? "review" : REVISION ? "revision" : "";
  const nav = [["", "all"], ...PARTS.map((_, i) => [`part=${i + 1}`, `part ${i + 1}`]), ...(C.booklets || []), ["review", "review"], ...(U.revision ? [["revision", "revision"]] : [])]
    .map(([key, name]) => (key === here ? `<b>${name}</b>` : `<a href="${link(key, answers)}">${name}</a>`)).join(" ");
  const bar = `<div class="screen-bar">Print preview. Booklet: ${nav}. <a href="${link(here, !answers)}">${answers ? "Student edition" : "Answer edition"}</a>. Print with Chrome, A4, headers and footers off</div>`;
  const ext = () => EXTENSION.map(extension).join("");
  book.innerHTML = bar + (REVISION ? revision() : SEL ? cover() + LESSONS.map(lesson).join("") + toolkit() + glossary() + quickAnswers()
    : REVIEW ? cover() + review() + ext() + toolkit() + glossary()
    : cover() + LESSONS.map(lesson).join("") + toolkit() + review() + ext() + glossary() + quickAnswers());
  document.body.appendChild(book);

  // Typeset the maths, then tell the PDF build the page is ready. Offline, the LaTeX source stays.
  const ready = () => { document.body.dataset.ready = "1"; };
  const mj = window.MathJax;
  if (mj && mj.startup && mj.startup.promise) mj.startup.promise.then(() => mj.typesetPromise([book])).then(ready, ready);
  else ready();
})();
