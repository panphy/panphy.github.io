/* Renders the Electric Circuits student workbook from window.UNIT (assets/content.js).
   workbook.html is the student booklet; workbook.html?answers is the answer edition.
   workbook.html?labs is the virtual labs booklet (assets/labs-content.js), which has
   one edition with its answer key at the back.
   Print either one to PDF from Chrome (A4, default margins, no headers/footers). */
(function () {
  "use strict";

  const U = window.UNIT;
  const D = window.Diagrams;
  const params = new URLSearchParams(location.search);
  const answers = params.has("answers");
  // ?lesson=1..12 prints one lesson booklet; ?review prints the unit review booklet;
  // ?labs prints the virtual labs booklet; none of these prints the whole unit.
  const ONE = U.lessons.find((l) => l.n === Number(params.get("lesson"))) || null;
  const REVIEW = !ONE && params.has("review");
  const LABS = !ONE && !REVIEW && params.has("labs") && U.labs ? U.labs : null;
  const WHOLE = !ONE && !REVIEW && !LABS;
  const LESSONS = ONE ? [ONE] : REVIEW ? [] : U.lessons;
  const LAST = ONE ? ONE.n : U.lessons[U.lessons.length - 1].n;
  const pad = (n) => String(n).padStart(2, "0");
  const SITE = "https://panphy.app/gcsephy/year10phy/unit01/";
  if (answers && !LABS) document.body.classList.add("answers");

  const which = ONE ? `Lesson ${ONE.n}` : REVIEW ? "Unit review" : "";
  const footer = LABS ? "Electric Circuits, Year 10 virtual labs" : `Electric Circuits, Year 10 workbook${which ? `: ${which}` : ""}${answers ? " (ANSWERS)" : ""}`;
  const pageStyle = document.createElement("style");
  pageStyle.textContent = `@page { @bottom-left { content: "${footer}"; } } @page cover { @bottom-left { content: none; } }`;
  document.head.appendChild(pageStyle);
  document.title = LABS ? "Electric Circuits - Year 10 Virtual Labs" : `Electric Circuits - Year 10 Workbook${ONE ? ` Lesson ${pad(ONE.n)} - ${ONE.title}` : REVIEW ? " - Unit review" : ""}${answers ? " (Answers)" : ""}`;

  // ---------- small helpers ----------
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  // The labs booklet never shows answers in place: they are listed in its answer key.
  const ans = (html) => (html && !LABS ? `<span class="ans">${html}</span>` : "");
  const ansNote = (html) => (html ? `<div class="ans-note">${html}</div>` : "");
  const lines = (n, a) => `<div class="lines" style="--n:${n}">${ans(a)}</div>`;
  const box = (h, a, grid) => `<div class="box${grid ? " grid-bg" : ""}" style="--h:${h}mm">${ans(a)}</div>`;

  const ICONS = {
    doNow: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
    learn: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z"/>',
    try: '<path d="M4 20l4-1L19 8l-3-3L5 16l-1 4ZM14 7l3 3"/>',
    lab: '<path d="M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4A1.5 1.5 0 0 0 19 19l-5-10V3M7.5 15h9"/>',
    exam: '<path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.3 6.8 19.1l1-5.8L3.5 9.2l5.9-.8Z"/>',
    revise: '<path d="M20 11a8 8 0 0 0-14.3-4.9M4 5v4h4M4 13a8 8 0 0 0 14.3 4.9M20 19v-4h-4"/>',
  };
  const icon = (key, sm) => `<span class="ico${sm ? " sm" : ""}"><svg viewBox="0 0 24 24">${ICONS[key]}</svg></span>`;
  const SEC = {
    doNow: ["do-now", "Do now", "Retrieve"],
    learn: ["learn", "Learn it", "Explain"],
    try: ["try", "Try it", "Practise"],
    lab: ["lab", "Lab", "Investigate"],
    exam: ["exam", "Exam corner", "AQA-style"],
    revise: ["revise", "Revise it", "Review later"],
  };
  const secHead = (key, title, aside) => {
    const [cls, name, kind] = SEC[key];
    return `<div class="sec ${cls}">${icon(key)}<div><span class="kind">${kind}</span><h3>${title || name}</h3></div>${aside ? `<div class="aside">${aside}</div>` : ""}</div>`;
  };

  // Standard symbol on a short wire, reusing the site's drawing helper.
  const symbolSvg = (type) => D.circuit({ w: 104, h: 70, wires: ["M4 45 H100"], extra: `<g transform="translate(52 45)">${D.keySymbol(type)}</g>` })
    .replace(/<figure[^>]*>/, "").replace("</figure>", "");

  /* Graph paper drawn in millimetres: 2 mm minor and 1 cm major squares.
     spec: { w, h, origin: "corner" | "centre", xLabel, yLabel, x: [perCm, labelEvery], y: [...],
             points, fit: [[x1,y1],[x2,y2]] or fn }  (points/fit only appear in the answer edition)
     yTicks: false leaves the y scale for the student to choose; the answer edition still numbers it. */
  function graphPaper(spec) {
    const W = spec.w || 150, H = spec.h || 90, L = 12, T = 6;
    const ox = spec.origin === "centre" ? W / 2 : 0;
    const oy = spec.origin === "centre" ? H / 2 : H;
    const X = (v) => L + ox + (v / spec.x[0]) * 10;
    const Y = (v) => T + oy - (v / spec.y[0]) * 10;
    let out = "";
    for (let i = 0; i <= W; i += 2) out += `<line class="${i % 10 ? "minor" : "major"}" x1="${L + i}" y1="${T}" x2="${L + i}" y2="${T + H}"/>`;
    for (let j = 0; j <= H; j += 2) out += `<line class="${j % 10 ? "minor" : "major"}" x1="${L}" y1="${T + j}" x2="${L + W}" y2="${T + j}"/>`;
    out += `<line class="axis" x1="${L}" y1="${T + oy}" x2="${L + W}" y2="${T + oy}"/><line class="axis" x1="${L + ox}" y1="${T}" x2="${L + ox}" y2="${T + H}"/>`;
    if (spec.ticks !== false) {
      const fmt = (v) => String(Math.round(v * 1000) / 1000);
      for (let cm = -Math.floor(ox / 10); cm <= (W - ox) / 10; cm += spec.x[1] || 1) {
        if (cm === 0) continue;
        out += `<text class="tick" x="${L + ox + cm * 10}" y="${T + oy + 3.8}" text-anchor="middle">${fmt(cm * spec.x[0])}</text>`;
      }
      for (let cm = -Math.floor((H - oy) / 10); cm <= oy / 10; cm += spec.y[1] || 1) {
        if (cm === 0 || (spec.yTicks === false && !answers)) continue;
        out += `<text class="tick" x="${L + ox - 1.2}" y="${T + oy - cm * 10 + 1}" text-anchor="end">${fmt(cm * spec.y[0])}</text>`;
      }
      out += `<text class="tick" x="${L + ox - 1.2}" y="${T + oy + 3.8}" text-anchor="end">0</text>`;
    }
    out += `<text class="axis-label" x="${L + W}" y="${T + oy + (spec.origin === "centre" ? -1.6 : 8)}" text-anchor="end">${spec.xLabel}</text>`;
    out += `<text class="axis-label" x="${L + ox + 1.5}" y="${T - 1.8}" text-anchor="${spec.origin === "centre" ? "start" : "middle"}">${spec.yLabel}</text>`;
    if (answers && spec.points) {
      out += spec.points.map(([a, b]) => { const x = X(a), y = Y(b); return `<path class="mark" d="M${x - 1.2} ${y - 1.2}L${x + 1.2} ${y + 1.2}M${x - 1.2} ${y + 1.2}L${x + 1.2} ${y - 1.2}"/>`; }).join("");
      if (spec.points2) out += spec.points2.map(([a, b]) => `<circle class="mark" cx="${X(a)}" cy="${Y(b)}" r="1.1"/>`).join("");
      if (spec.fit2) out += `<line class="fit fit-2" x1="${X(spec.fit2[0][0])}" y1="${Y(spec.fit2[0][1])}" x2="${X(spec.fit2[1][0])}" y2="${Y(spec.fit2[1][1])}"/>`;
      if (typeof spec.fit === "function") {
        const [a, b] = spec.fitRange;
        const pts = Array.from({ length: 81 }, (_, i) => a + ((b - a) * i) / 80).map((v) => `${X(v).toFixed(2)},${Y(spec.fit(v)).toFixed(2)}`);
        out += `<polyline class="fit" points="${pts.join(" ")}"/>`;
      } else if (spec.fit) {
        out += `<line class="fit" x1="${X(spec.fit[0][0])}" y1="${Y(spec.fit[0][1])}" x2="${X(spec.fit[1][0])}" y2="${Y(spec.fit[1][1])}"/>`;
      }
    }
    return `<svg class="graph-paper" viewBox="0 0 ${W + L + 4} ${H + T + 10}" style="width:${W + L + 4}mm;height:${H + T + 10}mm" role="img" aria-label="Graph paper">${out}</svg>`;
  }
  window.graphPaper = graphPaper;

  // ---------- equation triangles ----------
  // Only equations of the form A = B × C have a triangle. P = I² R gives I², so a square root follows.
  const TRIANGLES = {
    "Q = I t": ["Q", "I", "t"], "E = Q V": ["E", "Q", "V"], "V = I R": ["V", "I", "R"],
    "P = V I": ["P", "V", "I"], "E = P t": ["E", "P", "t"], "P = I² R": ["P", "I²", "R"],
  };
  function triangleSvg([top, left, right], size) {
    const font = (t) => (t.length > 1 ? 17 : 21);
    return `<svg class="tri-svg" viewBox="0 0 120 104" style="width:${size}" role="img" aria-label="Equation triangle: ${top} at the top, ${left} and ${right} at the bottom">
      <path d="M60 5 L6 99 H114 Z" fill="var(--spark-t)" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>
      <path d="M33 56 H87 M60 56 V99" stroke="var(--ink)" stroke-width="2.4"/>
      <g font-family="Arial Black, Arial, sans-serif" font-weight="900" fill="var(--ink)" text-anchor="middle">
        <text x="60" y="${45}" font-size="${font(top)}">${top}</text>
        <text x="${35}" y="${88}" font-size="${font(left)}">${left}</text>
        <text x="${85}" y="${88}" font-size="${font(right)}">${right}</text>
      </g></svg>`;
  }
  function triangleForms([a, b, c]) {
    if (b === "I²") return [`${a} = I² × ${c}`, `${c} = ${a} ÷ I²`, `I² = ${a} ÷ ${c}, so I = √(${a} ÷ ${c})`];
    return [`${a} = ${b} × ${c}`, `${b} = ${a} ÷ ${c}`, `${c} = ${a} ÷ ${b}`];
  }
  const plainEq = (eq) => eq.replace(/<[^>]+>/g, "");
  function triangleSection(equations) {
    const list = equations.filter((e) => TRIANGLES[plainEq(e.eq)]);
    if (!list.length) return "";
    const cards = list.map((e) => {
      const t = TRIANGLES[plainEq(e.eq)];
      return `<div class="tri-card">${triangleSvg(t, "25mm")}<div><div class="tri-name">${e.eq}</div><ul>${triangleForms(t).map((f) => `<li>${f}</li>`).join("")}</ul></div></div>`;
    }).join("");
    return keep(`<h4 class="sub">Equation triangles: help with rearranging</h4>
      <div class="tri-how"><div class="tri-steps"><p><b>1</b> Cover the quantity you want to find.</p><p><b>2</b> The two left <strong>side by side</strong>? <strong>Multiply</strong> them.</p><p><b>3</b> One <strong>above</strong> the other? <strong>Divide</strong> the top by the bottom.</p></div>
      <p class="tri-note">Example: to find I from Q = I t, cover I. Q is above t, so I = Q ÷ t. Triangles only help with rearranging: you still need to learn each equation.${list.some((e) => plainEq(e.eq) === "P = I² R") ? " For P = I² R, the triangle gives I²; take the square root to find I." : ""}</p></div>`) +
      `<div class="tri-grid">${cards}</div>`;
  }

  // ---------- blocks ----------
  let qNum = 0;
  // A sub-heading is kept on the same page as the block that follows it.
  function renderBlocks(blocks) {
    const out = [];
    const list = blocks || [];
    for (let i = 0; i < list.length; i += 1) {
      const b = list[i];
      if (b && b.t === "sub" && list[i + 1]) { out.push(keep(renderBlock(b) + renderBlock(list[i + 1]))); i += 1; }
      else out.push(renderBlock(b));
    }
    return out.join("");
  }
  const keep = (html) => `<div class="keep">${html}</div>`;
  // Section heading plus its first block, so a heading never ends a page.
  function section(key, title, aside, blocks) {
    const list = blocks || [];
    if (!list.length) return "";
    return keep(secHead(key, title, aside) + renderBlocks(list.slice(0, 1))) + renderBlocks(list.slice(1));
  }

  function renderBlock(b) {
    if (typeof b === "string") return `<p>${b}</p>`;
    switch (b.t) {
      case "p": return `<p>${b.h}</p>`;
      case "html": return b.h;
      case "sub": return `<h4 class="sub">${b.h}</h4>`;
      case "key": return `<div class="key">${b.h}</div>`;
      case "tip": return `<div class="tip">${b.h}</div>`;
      case "say": return `<div class="say" data-who="${b.who}">${b.h}</div>`;
      case "model":
        return `<div class="model"><h4>${b.title || "Think of it like this"}</h4>${b.fig ? `<div class="split narrow-fig"><div><p>${b.h}</p></div><div class="fig-small">${b.fig}</div></div>` : `<p>${b.h}</p>`}${b.breaks ? `<p class="breaks">${b.breaks}</p>` : ""}</div>`;
      case "eq": {
        const tri = TRIANGLES[plainEq(b.eq)];
        return `<div class="eq-card${tri ? " has-tri" : ""}"><div class="eq">${b.eq}</div><div class="words">${b.words}</div><div class="units">${b.units}</div>${b.re ? `<div class="re">${b.re}</div>` : ""}${tri ? `<div class="tri-mini">${triangleSvg(tri, "21mm")}</div>` : ""}</div>`;
      }
      case "split":
        return `<div class="split ${b.cls || ""}"><div>${renderBlocks(b.left)}</div><div>${renderBlocks(b.right)}</div></div>`;
      case "fig": return `<div class="${b.cls || ""}">${b.h}</div>`;
      case "figs": return `<div class="figs c${b.cols || b.items.length} ${b.cls || ""}">${b.items.map((h) => `<div>${h}</div>`).join("")}</div>`;
      case "symbank": return symbolBank(b);
      case "compare": return compareTable(b);
      case "worked": return worked(b);
      case "steps": return `<ol class="steps">${b.items.map((s) => `<li>${s}</li>`).join("")}</ol>`;
      case "safety": return `<div class="safety"><h4>Stay safe</h4><ul>${b.items.map((s) => `<li>${s}</li>`).join("")}</ul></div>`;
      case "vars": return `<table class="vars">${b.rows.map(([k, given, a]) => `<tr><th>${k}</th><td>${given || ans(a)}</td></tr>`).join("")}</table>`;
      case "graph": return graphPaper(b);
      case "q": return question(b);
      case "lab": return `<div class="lab-card">${b.title ? `<h4 class="sub">${b.title}</h4>` : ""}${renderBlocks(b.blocks)}</div>`;
      default: return "";
    }
  }

  function symbolBank(b) {
    const tiles = b.items.map(([type, name, job, later]) => `<figure class="${later ? "later" : ""}">${symbolSvg(type)}<figcaption>${name}${job ? `<small>${job}</small>` : ""}</figcaption></figure>`).join("");
    return `<div class="sym-bank">${tiles}</div>${b.legend ? `<p class="sym-legend">${b.legend}</p>` : ""}`;
  }

  function compareTable(b) {
    const head = `<thead><tr>${b.head.map((h) => `<th>${h}</th>`).join("")}</tr></thead>`;
    const body = b.rows.map((r) => `<tr>${r.map((c, i) => {
      if (i === 0) return `<th>${c}</th>`;
      if (c && typeof c === "object") return `<td class="blank">${ans(c.a)}</td>`;
      return `<td>${c}</td>`;
    }).join("")}</tr>`).join("");
    return `<table class="compare">${head}<tbody>${body}</tbody></table>`;
  }

  function worked(b) {
    const steps = (arr, blank) => arr.map(([k, v], i) => `<div class="step${i === arr.length - 1 ? " final" : ""}"><span>${k}</span><span>${blank ? ans(v) : v}</span></div>`).join("");
    return `<div class="worked"><div><h4>Worked example</h4><div class="q">${b.q}</div>${steps(b.steps)}</div>` +
      `<div class="yt"><h4>Your turn</h4><div class="q">${b.yt.q}</div>${steps(b.yt.steps, true)}</div></div>`;
  }

  function question(b) {
    qNum += 1;
    const type = b.type ? `<span class="type">${b.type}</span>` : "";
    const marks = b.marks ? `<span class="marks">[${b.marks} mark${b.marks > 1 ? "s" : ""}]</span>` : "";
    let body = "";
    if (b.say) body += `<div class="say" data-who="${b.say[0]}">${b.say[1]}</div>`;
    if (b.fig) body += `<div class="${b.figCls || "fig-mid"}">${b.fig}</div>`;
    if (b.mcq) {
      body += `<ul class="mcq" style="--cols:${b.mcq.cols || 2}">${b.mcq.o.map((o, i) => `<li class="${i === b.mcq.c ? "correct" : ""}">${o}</li>`).join("")}</ul>`;
    }
    if (b.fill) {
      body += `<p class="fill">${b.fill.replace(/\[\[(.+?)(?:\|(\d+))?\]\]/g, (_, a, w) => `<span class="blank" style="--w:${w || 26}mm">${ans(a)}</span>`)}</p>`;
      if (b.bank) body += `<div class="bank">${b.bank.map((w) => `<span>${w}</span>`).join("")}</div>`;
    }
    if (b.order) {
      body += `<ol class="order">${b.order.map(([a, text]) => `<li data-a="${a}">${text}</li>`).join("")}</ol>`;
    }
    if (b.symq) {
      body += `<div class="symbol-quiz" style="--cols:${b.symq.cols || 6}">${b.symq.items.map(([type, name, mode]) => mode === "draw"
        ? `<div><div class="draw">${answers ? symbolSvg(type) : ""}</div><div class="name">${name}</div></div>`
        : `<div>${symbolSvg(type)}<div class="name">${ans(name)}</div></div>`).join("")}</div>`;
    }
    if (b.options) {
      body += `<div class="options-row" style="--cols:${b.options.cols || b.options.items.length}">${b.options.items.map((o) => `<div><b>${o.label}</b>${o.fig}${o.choice ? `<div class="circle-choice">${o.choice.map((c, i) => `<span class="${i === o.c ? "correct" : ""}">${c}</span>`).join("")}</div>` : ""}</div>`).join("")}</div>`;
    }
    if (b.table) body += dataTable(b.table);
    if (b.graph) body += graphPaper(b.graph);
    if (b.starter) body += `<p class="starter">${b.starter}</p>`;
    if (b.frame) {
      const rows = b.frame === true ? [["Equation", ""], ["Substitute", ""], ["Answer", ""]] : b.frame;
      const fa = b.frameA || [];
      body += `<div class="frame">${rows.map(([k, unit], i) => `<span>${k}</span><span>${ans(fa[i])}${unit ? `<span class="unit">${unit}</span>` : ""}</span>`).join("")}</div>`;
    }
    if (b.after) body += renderBlocks(b.after);
    if (b.lines) body += lines(b.lines, b.a);
    else if (b.box) body += box(b.box, b.a, b.grid);
    else if (b.a && !b.frame) body += ansNote(b.a);
    return `<div class="question"><span class="qn">${qNum}</span><div class="prompt">${marks}${type}${b.p || ""}</div>${body}</div>`;
  }

  function dataTable(t) {
    const head = `<tr>${t.head.map((h) => `<th>${h}</th>`).join("")}</tr>`;
    const body = t.rows.map((row, r) => `<tr>${row.map((c, i) => c === null
      ? `<td>${t.ans && t.ans[r] ? ans(t.ans[r][i]) : ""}</td>`
      : `<td class="given">${c}</td>`).join("")}</tr>`).join("");
    return `<table class="data">${head}${body}</table>`;
  }

  // ---------- lessons ----------
  function lesson(l) {
    qNum = 0;
    const url = SITE + l.online.path;
    const opener = `<header class="opener"><div class="num"><small>Lesson</small>${pad(l.n)}</div>
      <div><h2>${l.title}</h2><div class="spec">${l.spec}</div></div><div class="big-q">${l.big}</div></header>
      <div class="opener-foot"><div class="goals"><h3>By the end you can</h3><ul>${l.goals.map((g) => `<li>${D.sub(g)}</li>`).join("")}</ul>
      <div class="keywords">${l.keywords.map((k) => `<span>${k}</span>`).join("")}</div></div>
      <div class="online"><div><h3>Online companion</h3><p><strong>${l.online.label}</strong></p><p>${l.online.text}</p><p class="url">${url.replace("https://", "").replace(/\//g, "/<wbr>")}</p></div></div></div>`;

    const doNow = keep(`${secHead("doNow", l.n === 1 ? "What do you already think?" : "Do now", l.n === 1 ? "No wrong answers: this is your starting point." : "From earlier lessons. No notes!")}
      <div class="do-now-box">${l.doNow.map(([q, a], i) => `<div><b>${i + 1}</b>${q}${lines(2, a)}</div>`).join("")}</div>`);

    const parts = {
      doNow,
      learn: section("learn", l.learnTitle, l.learnAside, l.learn),
      try: l.try ? section("try", l.tryTitle, l.tryAside, l.try) : "",
      lab: l.lab ? section("lab", l.lab.title, l.lab.aside, l.lab.blocks) : "",
      exam: keep(secHead("exam", "Exam corner", "Write in full sentences. Show every step of a calculation.") +
        `<div class="exam-card">${l.exam.map((e) => (e.tip ? `<div class="tip">${e.tip}</div>` : "") + question(e)).join("")}</div>`),
      revise: keep(secHead("revise", "Revise it", "Use this box after the lesson and before tests.") +
        `<div class="revise-card"><div><h4>Summary</h4><ul>${l.summary.map((s) => `<li>${s}</li>`).join("")}</ul>
        <div class="recall"><h4>Cover the page and answer</h4>${l.recall.map(([q], i) => `<p><b>${i + 1}</b>${q}</p>`).join("")}</div></div>
        <div><h4>I can…</h4><ul class="cando">${l.cando.map((c) => `<li><span>${c}</span><span class="rag"><i></i><i></i><i></i></span></li>`).join("")}</ul></div></div>`),
    };
    const order = l.order || ["doNow", "learn", "try", "lab", "exam", "revise"];
    return `<section class="lesson" style="--accent:var(--${l.accent});--accent-t:var(--${l.accent}-t)">${opener}${order.map((k) => parts[k]).join("")}</section>`;
  }

  // ---------- front and back matter ----------
  function cover() {
    // A working circuit: the voltmeter is across the lamp, the ammeter is in series, and
    // the diode points the way conventional current flows (+ terminal on the left).
    const art = D.circuit({
      w: 700, h: 215,
      wires: ["M30 70 H670 V185 H30 Z", "M455 70 V22 H585 V70", "M300 185 V140 H460 V185"],
      parts: [["battery", 120, 70, "h"], ["switchClosed", 240, 70, "h"], ["ammeter", 360, 70, "h"], ["lamp", 520, 70, "h"], ["voltmeter", 520, 22, "h"],
        ["diode", 160, 185, "h"], ["ldr", 380, 140, "h"], ["thermistor", 380, 185, "h"], ["resistor", 570, 185, "h"]],
      dots: [[455, 70], [585, 70], [300, 185], [460, 185]],
    }).replace(/<figure[^>]*>/, "").replace("</figure>", "");
    let middle;
    if (LABS) {
      middle = `<div class="cover-part"><b>Virtual labs</b>Predict. Test. Explain.</div>
      <p class="lede">Three investigations of charge, energy and resistance, using the PhET Circuit Construction Kit. Work in pairs and swap roles on each new page.</p>
      <h2 class="cover-sub">The three labs</h2><ul class="cover-lessons">${LABS.labs.map((l) => `<li>Lab ${l.n}: ${l.title}</li>`).join("")}</ul>`;
    } else if (ONE) {
      middle = `<div class="cover-part"><b>Lesson ${pad(ONE.n)}</b>${ONE.title}${ONE.rp ? `<span>${ONE.rp}</span>` : ""}</div>
      <p class="lede">${ONE.big}</p>
      <h2 class="cover-sub">In this lesson you will</h2><ul class="cover-lessons">${ONE.goals.map((g) => `<li>${D.sub(g)}</li>`).join("")}</ul>`;
    } else if (REVIEW) {
      middle = `<div class="cover-part"><b>Unit review</b>After Lesson 12</div>
      <p class="lede">Mixed exam practice from the whole unit, a fix-it log, and a static electricity page for GCSE Physics students.</p>`;
    } else {
      middle = `<p class="lede">Charge, energy and resistance: twelve lessons, from your first circuit to confident exam answers. Learn with it in class and revise from it at home.</p>
      <div class="cover-stats"><div><b>12</b>lessons</div><div><b>3</b>required practicals</div><div><b>3</b>virtual labs</div><div><b>1</b>companion website</div></div>`;
    }
    return `<section class="cover"><div class="eyebrow">Year 10 Physics, AQA GCSE, ${LABS ? "Virtual labs" : ONE ? `Lesson ${ONE.n} of ${U.lessons.length}` : REVIEW ? "Unit review" : "Unit booklet"}</div>
      <h1>Electric<br><em>Circuits</em></h1>
      ${middle}
      ${answers ? '<div class="edition">Answer edition for teachers and self-marking</div>' : ""}
      <div class="cover-foot">
        <div class="cover-circuit" style="--ink:#fff;--diagram-bg:#0a1326">${art.replace('class="cd"', 'class="cd" style="stroke:#fff"')}</div>
        <div class="cover-fields"><div>Name<span></span></div><div>${LABS ? "Partner" : "Class"}<span></span></div><div>${LABS ? "Class" : "Teacher"}<span></span></div><div>${LABS ? "Teacher" : "Target grade"}<span></span></div></div>
      </div></section>`;
  }

  function howTo() {
    const items = [
      ["doNow", "Do now", "Quick questions from earlier lessons. Remembering again is what makes it stick."],
      ["learn", "Learn it", "The explanation, diagrams and worked examples. Read this again when you revise."],
      ["try", "Try it", "Practice that builds up: first with support, then on your own."],
      ["lab", "Lab", "Record measurements from a virtual lab or a required practical."],
      ["exam", "Exam corner", "An AQA-style question with a tip on how the marks are given."],
      ["revise", "Revise it", "Summary, cover-and-answer questions and an “I can” check to colour in."],
    ];
    const rows = U.lessons.map((l) => `<tr><td>${pad(l.n)}</td><td><strong>${l.title}</strong>${l.rp ? `<span class="tag">${l.rp}</span>` : ""}<br><span class="map-line">${l.mapLine}</span></td><td>${l.online.label}</td></tr>`).join("");
    return `<section class="new-page" style="break-before:auto">
      <div class="eyebrow">Start here</div><h2 class="page-title">How this booklet works</h2>
      <p class="page-intro">${ONE && ONE.n > 1 ? `This is the booklet for <strong>Lesson ${ONE.n}</strong> of the Electric Circuits unit. It builds on the lessons before it; the “Do now” questions and the quick answers at the back help you check what you remember.` : "This booklet assumes you have <strong>never studied electricity before</strong>. Every lesson starts from the ideas you already have and builds one step at a time."} Keep it: it is your classwork book <em>and</em> your revision guide.</p>
      <div class="legend">${items.map(([k, name, text]) => `<div>${icon(k)}<div><b>${name}</b><p>${text}</p></div></div>`).join("")}</div>
      <div class="key"><strong>Revising at home?</strong> (1) Read the Learn it pages. (2) Cover them and answer the “Cover the page” questions in Revise it. (3) Check with the quick answers at the back. (4) Do the matching mission on the companion website, which has more questions with answers.</div>
      <h4 class="sub">The route through the unit${ONE ? ` (this lesson is highlighted)` : ""}</h4>
      ${ONE ? `<ol class="route-grid">${U.lessons.map((l) => `<li class="${l.n === ONE.n ? "this" : ""}"><b>${pad(l.n)}</b><span>${l.title}${l.rp ? '<span class="tag">RP</span>' : ""}${l.n === ONE.n ? `<span class="map-line">${l.mapLine} (${l.online.label})</span>` : ""}</span></li>`).join("")}</ol>`
        : `<table class="route"><thead><tr><th>#</th><th>Lesson</th><th>Companion website</th></tr></thead><tbody>${rows}</tbody></table>`}
      <p style="margin-top:3mm;font-size:9pt;color:#56606e">Companion website: <strong>panphy.app/gcsephy/year10phy/unit01</strong>: missions, interactive equation triangles, required-practical pages and the Exam Zone.</p>
    </section>`;
  }

  function toolkit() {
    const met = U.equations.filter((e) => e.lesson <= LAST);
    const tools = met.map((e) => `<div class="tool"><div class="eq">${e.eq}</div><span class="lesson-tag">Lesson ${e.lesson}</span><div class="words">${e.words}</div><div class="units">${e.units}</div><div class="recall-cover">Rearranged: ${e.re}</div></div>`).join("");
    return `<section class="new-page"><div class="eyebrow">Reference</div><h2 class="page-title">Equation toolkit</h2>
      <p class="page-intro">${ONE && LAST < 12 ? "The equations you have met so far. " : ""}You will meet these one at a time. Learn each equation <strong>in words</strong> as well as symbols: your exams may or may not give you an equation sheet, and knowing them by heart makes every question faster.</p>
      <div class="toolkit">${tools}</div>
      <h4 class="sub">Four steps for every calculation</h4>
      <div class="method-steps"><div><b>1</b>Write down what you know, with units. Convert units first (minutes → seconds, kW → W, mA → A).</div><div><b>2</b>Write the equation you will use, in symbols.</div><div><b>3</b>Substitute the numbers, then rearrange if needed.</div><div><b>4</b>Give the answer with a unit. Ask: is it sensible?</div></div>
      <table class="units-table"><thead><tr><th>Convert</th><th>How</th><th>Example</th></tr></thead><tbody>
      <tr><td>minutes → seconds</td><td>× 60</td><td>3.0 min = 180 s</td></tr>
      <tr><td>hours → seconds</td><td>× 3600</td><td>2.0 h = 7200 s</td></tr>
      <tr><td>milliamps (mA) → amps (A)</td><td>÷ 1000</td><td>250 mA = 0.25 A</td></tr>
      <tr><td>kilowatts (kW) → watts (W); kilohms (kΩ) → ohms (Ω)</td><td>× 1000</td><td>2.2 kW = 2200 W</td></tr>
      <tr><td>kilovolts (kV) → volts (V)</td><td>× 1000</td><td>400 kV = 400 000 V</td></tr></tbody></table>
      ${triangleSection(met)}
      <p style="font-size:9pt;color:#56606e">Interactive version: <strong>panphy.app/gcsephy/year10phy/unit01/equation-triangles</strong>.</p></section>`;
  }

  function review() {
    qNum = 0;
    return `<section class="lesson" style="--accent:var(--violet);--accent-t:var(--violet-t)">
      <div class="eyebrow">After Lesson 12, at home or in class</div><h2 class="page-title">Unit review</h2>
      <p class="page-intro">Mixed questions from the whole unit, like a real exam. Try each question without looking back. Then mark it with your teacher's answers and fill in the “fix it” log.</p>
      ${secHead("doNow", "Equation recall challenge", "Cover the toolkit page first.")}
      ${question({ p: "Write each equation in symbols. Then give the unit of every quantity in it.", table: { head: ["Equation in words", "In symbols", "Units"], rows: U.equations.filter((e) => !e.ht).map((e) => [e.words, null, null]), ans: U.equations.filter((e) => !e.ht).map((e) => [null, e.eq, e.units]) } })}
      ${secHead("exam", "Mixed exam practice", `${U.review.reduce((s, q) => s + (q.marks || 0), 0)} marks, about 50 minutes`)}
      ${U.review.map((q) => question(q)).join("")}
      ${keep(`${secHead("revise", "Fix-it log", "Turn every lost mark into a target.")}
      <table class="fix-log"><thead><tr><th style="width:14mm">Q</th><th>What went wrong?</th><th>The correct physics (or method) is…</th><th style="width:26mm">Lesson to revisit</th></tr></thead>
      <tbody>${"<tr><td></td><td></td><td></td><td></td></tr>".repeat(6)}</tbody></table>`)}</section>`;
  }

  function staticExtension() {
    const S = U.staticExt;
    qNum = 0;
    return `<section class="lesson" style="--accent:var(--cyan);--accent-t:var(--cyan-t)">
      <div class="eyebrow">Separate Physics only (AQA 4.2.5)</div><h2 class="page-title">Extension: static electricity</h2>
      <p class="page-intro">Only for students taking GCSE Physics (separate science). Combined Science students can skip this page.</p>
      ${renderBlocks(S.learn)}${S.questions.map((q) => question(q)).join("")}</section>`;
  }

  function glossary() {
    const words = U.glossary.filter(([, , n]) => (ONE ? n === ONE.n : n <= LAST));
    if (!words.length) return "";
    return `<section class="${ONE ? "tracker-flow" : "new-page"}"><div class="eyebrow">Reference</div><h2 class="page-title">Key words${ONE ? " from this lesson" : ""}</h2>
      <p class="page-intro">Learn the meaning and spelling. In exams, precise words earn marks: say “p.d. across” and “current through”.</p>
      <div class="glossary${ONE ? " one" : ""}">${words.map(([k, v]) => `<p><strong>${k}</strong>: ${v}</p>`).join("")}</div></section>`;
  }

  function tracker() {
    const rows = U.lessons.map((l) => `<tr class="lesson-row"><td colspan="2">${pad(l.n)}: ${l.title}</td></tr>` +
      l.cando.map((c) => `<tr><td>${c}</td><td class="rag-cell"><span class="rag"><i></i><i></i><i></i></span></td></tr>`).join("")).join("");
    return `<section class="new-page"><div class="eyebrow">Finish</div><h2 class="page-title">Progress tracker</h2>
      <p class="page-intro">Colour one circle for each statement: <strong>red</strong> = not yet, <strong>amber</strong> = getting there, <strong>green</strong> = I can do this without help. Revisit your reds first.</p>
      <table class="tracker"><thead><tr><th>I can…</th><th>R / A / G</th></tr></thead><tbody>${rows}</tbody></table></section>`;
  }

  function quickAnswers() {
    const list = (arr) => `<ol>${arr.map(([, a]) => `<li>${a}</li>`).join("")}</ol>`;
    return `<section class="${ONE ? "tracker-flow" : "new-page"}"><div class="eyebrow">Check yourself</div><h2 class="page-title">Quick answers</h2>
      <p class="page-intro">Answers to the “Do now” and “Cover the page” questions, so you can check yourself when revising. Answers to the longer questions are in your teacher's answer edition.</p>
      <div class="quick-answers${ONE ? " one" : ""}">${LESSONS.map((l) => `<div>${ONE ? "" : `<b>Lesson ${l.n}: ${l.title}</b>`}
        <h4>Do now</h4>${list(l.doNow)}<h4>Cover the page</h4>${list(l.recall)}</div>`).join("")}</div></section>`;
  }

  // ---------- virtual labs booklet ----------
  const labSec = (s) => `<div class="sec ${SEC[s.icon][0]}">${icon(s.icon)}<div><span class="kind">${s.kind}</span><h3>${s.title}</h3></div>${s.aside ? `<div class="aside">${s.aside}</div>` : ""}</div>`;
  const labQuestions = (l) => l.sections.flatMap((s) => s.blocks).filter((b) => b.t === "q");

  // A sub-heading stays with everything up to and including its first question.
  function labGroups(blocks) {
    const out = [];
    for (let i = 0; i < blocks.length; i += 1) {
      if (blocks[i].t !== "sub") { out.push(renderBlock(blocks[i])); continue; }
      let html = "";
      for (; i < blocks.length; i += 1) { html += renderBlock(blocks[i]); if (blocks[i].t === "q") break; }
      out.push(keep(html));
    }
    return out;
  }

  function labSetup() {
    const S = LABS.setup;
    return `<section class="new-page" style="break-before:auto"><div class="eyebrow">Start here</div><h2 class="page-title">Set up and meters</h2>
      <p class="page-intro">${S.intro}</p>${renderBlocks(S.blocks)}</section>`;
  }

  function lab(l) {
    qNum = 0;
    const opener = `<header class="opener"><div class="num"><small>Lab</small>${pad(l.n)}</div>
      <div><h2>${l.title}</h2><div class="spec">${l.spec}</div></div><div class="big-q">${l.big}</div></header>`;
    const sections = l.sections.map((s) => {
      const groups = labGroups(s.blocks);
      const html = keep(labSec(s) + groups[0]) + groups.slice(1).join("");
      return s.page ? `<div class="lab-page">${html}</div>` : html;
    }).join("");
    return `<section class="lesson labs" style="--accent:var(--${l.accent});--accent-t:var(--${l.accent}-t)">${opener}${sections}</section>`;
  }

  function labKey() {
    const fillKey = (b) => Array.from(b.fill.matchAll(/\[\[(.+?)(?:\|\d+)?\]\]/g), (m) => m[1]).join("; ") + ".";
    return `<section class="new-page"><div class="eyebrow">Check yourself</div><h2 class="page-title">Answers</h2>
      <p class="page-intro">Finish each lab first. Then compare your measurements, calculations and explanations with these answers. Meter readings are approximate: small differences are fine if you used your own readings consistently and gave the correct units.</p>
      ${LABS.labs.map((l) => `<div class="lab-key" style="--accent:var(--${l.accent})"><h4 class="sub">Lab ${l.n}: ${l.title}</h4>
        <ol>${labQuestions(l).map((b) => `<li>${b.key || fillKey(b)}</li>`).join("")}</ol></div>`).join("")}</section>`;
  }

  const book = document.createElement("main");
  book.className = "book";
  const link = (key, ans) => `?${[key, ans ? "answers" : ""].filter(Boolean).join("&")}`;
  const here = ONE ? `lesson=${ONE.n}` : REVIEW ? "review" : LABS ? "labs" : "";
  const nav = [["", "all"], ...U.lessons.map((l) => [`lesson=${l.n}`, String(l.n)]), ["review", "review"], ...(U.labs ? [["labs", "labs"]] : [])]
    .map(([key, name]) => (key === here ? `<b>${name}</b>` : `<a href="${link(key, answers)}">${name}</a>`)).join(" ");
  const bar = `<div class="screen-bar">Print preview. Booklet: ${nav}. ${LABS ? "Answers are at the back" : `<a href="${link(here, !answers)}">${answers ? "Student edition" : "Answer edition"}</a>`}. Print with Chrome, A4, headers and footers off</div>`;
  const body = LABS ? cover() + labSetup() + LABS.labs.map(lab).join("") + labKey()
    : ONE ? cover() + howTo() + lesson(ONE) + (U.equations.some((e) => e.lesson <= LAST) ? toolkit() : "") + glossary() + quickAnswers()
    : REVIEW ? cover() + toolkit() + review() + staticExtension() + glossary() + tracker()
    : cover() + howTo() + toolkit() + LESSONS.map(lesson).join("") + review() + staticExtension() + glossary() + tracker() + quickAnswers();
  book.innerHTML = bar + body;
  document.body.appendChild(book);
  document.body.dataset.ready = "1";
})();
