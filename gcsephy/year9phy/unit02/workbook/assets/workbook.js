/* Renders the Energy: Stores and Transfers student workbook from window.UNIT (assets/content.js).
   workbook.html is the student booklet; workbook.html?answers is the answer edition, with the
   same page numbers. workbook.html?part=1 (2, 3) prints one part of the booklet, with its own cover,
   key words, tracker, quick answers and toolkit; the PDFs are printed in parts. workbook.html?review prints the Unit review booklet (add &answers). Maths is LaTeX between \( and \), typeset by MathJax before printing.
   Print with Chrome: A4, default margins, no headers or footers. */
(function () {
  "use strict";

  const U = window.UNIT;
  const F = window.EnergyFigures;
  const params = new URLSearchParams(location.search);
  const answers = params.has("answers");
  const REVIEW = params.has("review");
  const pad = (n) => String(n).padStart(2, "0");
  // The booklet is printed in three parts of three lessons each.
  const PARTS = [[1, 3], [4, 6], [7, 9]];
  const partNo = REVIEW ? 0 : Number(params.get("part")) || 0;
  const [firstL, lastL] = PARTS[partNo - 1] || [1, U.lessons.length];
  const inPart = (n) => n >= firstL && n <= lastL;
  const LESSONS = U.lessons.filter((l) => inPart(l.n));
  const EQUATIONS = U.equations.filter((e) => e.lesson <= lastL);
  // Practicals are the measured labs; "Activity" and "Your own" labs are not counted.
  const isPractical = (l) => l.lab && !/^(Activity|Your own)/.test(l.lab.title);
  if (answers) document.body.classList.add("answers");

  const footer = `Energy: Stores and Transfers, Year 9 ${REVIEW ? "Unit review" : "workbook"}${partNo ? ` Part ${partNo}` : ""}${answers ? " (ANSWERS)" : ""}`;
  const pageStyle = document.createElement("style");
  pageStyle.textContent = `@page { @bottom-left { content: "${footer}, © 2026 PanPhy Labs. All rights reserved."; } } @page cover { @bottom-left { content: none; } }`;
  document.head.appendChild(pageStyle);
  document.title = `Energy - Stores and Transfers - Year 9 ${REVIEW ? "Unit Review" : "Workbook"}${partNo ? ` - Part ${partNo}` : ""}${answers ? " (Answers)" : ""}`;

  // ---------- small helpers ----------
  const ans = (html) => (html ? `<span class="ans">${html}</span>` : "");
  const ansNote = (html) => (html ? `<div class="ans-note">${html}</div>` : "");
  const lines = (n, a) => `<div class="lines" style="--n:${n}">${ans(a)}</div>`;
  const box = (h, a, grid) => `<div class="box${grid ? " grid-bg" : ""}" style="--h:${h}mm">${ans(a)}</div>`;
  const keep = (html) => `<div class="keep">${html}</div>`;

  /* Inline marks used in sentences:
       [[answer]] or [[answer|30]]          a blank to write on (30 mm wide)
       [[answer|first / second / third]]    a blank with its options printed straight after it
       {{one|two*|three}}                   AQA-style ring box: draw a ring around one (* marks the answer) */
  function marks(text) {
    return String(text)
      .replace(/\[\[(.+?)(?:\|([^\]]+))?\]\]/g, (_, a, extra) => {
        const width = extra && /^\d+$/.test(extra) ? extra : null;
        const opts = extra && !width ? `<span class="opts">(${extra})</span>` : "";
        return `<span class="blank" style="--w:${width || 26}mm">${ans(a)}</span>${opts}`;
      })
      .replace(/\{\{(.+?)\}\}/g, (_, list) => `<span class="ring-box">${list.split("|").map((o) => {
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
    revise: '<path d="M20 11a8 8 0 0 0-14.3-4.9M4 5v4h4M4 13a8 8 0 0 0 14.3 4.9M20 19v-4h-4"/>',
  };
  const icon = (key) => `<span class="ico"><svg viewBox="0 0 24 24">${ICONS[key]}</svg></span>`;
  const SEC = {
    doNow: ["do-now", "Do now", "Remember"],
    learn: ["learn", "Learn it", "Explain"],
    try: ["try", "Try it", "Practise"],
    lab: ["lab", "Practical", "Investigate"],
    exam: ["exam", "Exam corner", "AQA-style"],
    revise: ["revise", "Revise it", "Review later"],
  };
  const secHead = (key, title, aside) => {
    const [cls, name, kind] = SEC[key];
    return `<div class="sec ${cls}">${icon(key)}<div><span class="kind">${kind}</span><h3>${title || name}</h3></div>${aside ? `<div class="aside">${aside}</div>` : ""}</div>`;
  };

  /* Graph paper drawn in millimetres: 2 mm minor and 1 cm major squares.
     spec: { w, h, xLabel, yLabel, x: [valuePerCm, labelEvery], y: [...], points, fit: [[x1,y1],[x2,y2]], yTicks, xTicks }
     points and fit appear only in the answer edition. yTicks/xTicks false leave that scale for the student. */
  function graphPaper(spec) {
    const W = spec.w || 150, H = spec.h || 90, L = 12, T = 6;
    const X = (v) => L + (v / spec.x[0]) * 10;
    const Y = (v) => T + H - (v / spec.y[0]) * 10;
    let out = "";
    for (let i = 0; i <= W; i += 2) out += `<line class="${i % 10 ? "minor" : "major"}" x1="${L + i}" y1="${T}" x2="${L + i}" y2="${T + H}"/>`;
    for (let j = 0; j <= H; j += 2) out += `<line class="${j % 10 ? "minor" : "major"}" x1="${L}" y1="${T + j}" x2="${L + W}" y2="${T + j}"/>`;
    out += `<line class="axis" x1="${L}" y1="${T + H}" x2="${L + W}" y2="${T + H}"/><line class="axis" x1="${L}" y1="${T}" x2="${L}" y2="${T + H}"/>`;
    const fmt = (v) => String(Math.round(v * 1000) / 1000);
    for (let cm = spec.x[1] || 1; cm <= W / 10; cm += spec.x[1] || 1) {
      if (spec.xTicks === false && !answers) break;
      out += `<text class="tick" x="${L + cm * 10}" y="${T + H + 3.8}" text-anchor="middle">${fmt(cm * spec.x[0])}</text>`;
    }
    for (let cm = spec.y[1] || 1; cm <= H / 10; cm += spec.y[1] || 1) {
      if (spec.yTicks === false && !answers) break;
      out += `<text class="tick" x="${L - 1.2}" y="${T + H - cm * 10 + 1}" text-anchor="end">${fmt(cm * spec.y[0])}</text>`;
    }
    out += `<text class="tick" x="${L - 1.2}" y="${T + H + 3.8}" text-anchor="end">0</text>`;
    out += `<text class="axis-label" x="${L + W}" y="${T + H + 8}" text-anchor="end">${spec.xLabel}</text>`;
    out += `<text class="axis-label" x="${L + 1.5}" y="${T - 1.8}" text-anchor="start">${spec.yLabel}</text>`;
    if (answers && spec.points) {
      out += spec.points.map(([a, b]) => { const x = X(a), y = Y(b); return `<path class="mark" d="M${x - 1.2} ${y - 1.2}L${x + 1.2} ${y + 1.2}M${x - 1.2} ${y + 1.2}L${x + 1.2} ${y - 1.2}"/>`; }).join("");
      if (spec.fit) out += `<line class="fit" x1="${X(spec.fit[0][0])}" y1="${Y(spec.fit[0][1])}" x2="${X(spec.fit[1][0])}" y2="${Y(spec.fit[1][1])}"/>`;
    }
    return `<svg class="graph-paper" viewBox="0 0 ${W + L + 4} ${H + T + 10}" style="width:${W + L + 4}mm;height:${H + T + 10}mm" role="img" aria-label="Graph paper">${out}</svg>`;
  }

  // ---------- formula triangles ----------
  // Labels are plain text for SVG: "E_p" draws E with a subscript p.
  const svgLabel = (s) => s.replace(/_(\w+)/, '<tspan baseline-shift="sub" font-size="70%">$1</tspan>');
  function triangleSvg({ top, bottom }, size) {
    const font = (s) => { const n = s.replace(/_\w+/, "").length; return n > 4 ? 11 : n > 1 ? 15 : 21; };
    const three = bottom.length === 3;
    const cells = three ? [[30, 88], [60, 88], [90, 88]] : [[35, 88], [85, 88]];
    const dividers = three ? "M33 56 H87 M46 56 V99 M74 56 V99" : "M33 56 H87 M60 56 V99";
    return `<svg class="tri-svg" viewBox="0 0 120 104" style="width:${size}" role="img" aria-label="Formula triangle: ${top.replace("_", "")} at the top, ${bottom.join(" and ").replace(/_/g, "")} at the bottom">
      <path d="M60 5 L6 99 H114 Z" fill="var(--spark-t)" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>
      <path d="${dividers}" stroke="var(--ink)" stroke-width="2.4"/>
      <g font-family="Arial Black, Arial, sans-serif" font-weight="900" fill="var(--ink)" text-anchor="middle">
        <text x="60" y="${/_/.test(top) ? 37 : top.length > 4 ? 50 : 45}" font-size="${/_/.test(top) ? 16 : font(top)}">${svgLabel(top)}</text>
        ${bottom.map((b, i) => `<text x="${cells[i][0]}" y="${cells[i][1]}" font-size="${three ? Math.min(font(b), 17) : font(b)}">${svgLabel(b)}</text>`).join("")}
      </g></svg>`;
  }

  // ---------- blocks ----------
  let qNum = 0;
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
  function section(key, title, aside, blocks) {
    const list = blocks || [];
    if (!list.length) return "";
    return keep(secHead(key, title, aside) + renderBlocks(list.slice(0, 1))) + renderBlocks(list.slice(1));
  }

  function renderBlock(b) {
    if (typeof b === "string") return `<p>${b}</p>`;
    switch (b.t) {
      case "p": return `<p>${marks(b.h)}</p>`;
      case "html": return b.h;
      case "sub": return `<h4 class="sub">${b.h}</h4>`;
      case "key": return `<div class="key">${b.h}</div>`;
      case "tip": return `<div class="tip">${b.h}</div>`;
      case "say": return `<div class="say" data-who="${b.who}">${b.h}</div>`;
      case "model":
        return `<div class="model"><h4>${b.title || "Think of it like this"}</h4>${b.fig ? `<div class="split narrow-fig"><div><p>${b.h}</p></div><div class="fig-small">${b.fig}</div></div>` : `<p>${b.h}</p>`}${b.breaks ? `<p class="breaks">${b.breaks}</p>` : ""}</div>`;
      case "eq":
        return `<div class="eq-card${b.tri ? " has-tri" : ""}${b.stack ? " stack" : ""}"><div class="eq">${b.eq}</div><div class="words">${b.words}</div><div class="units">${b.units}</div>${b.re ? `<div class="re">${b.re}</div>` : ""}${b.tri ? `<div class="tri-mini">${triangleSvg(b.tri, "21mm")}</div>` : ""}</div>`;
      case "split":
        return `<div class="split ${b.cls || ""}"><div>${renderBlocks(b.left)}</div><div>${renderBlocks(b.right)}</div></div>`;
      case "fig": return `<div class="fig ${b.cls || ""}">${b.h}${b.cap ? `<p class="cap">${b.cap}</p>` : ""}</div>`;
      case "figs": return `<div class="figs c${b.cols || b.items.length} ${b.cls || ""}">${b.items.map((h) => `<div class="fig">${h}</div>`).join("")}</div>`;
      case "compare": return compareTable(b);
      case "worked": return worked(b);
      case "steps": return `<ol class="steps">${b.items.map((s) => `<li>${s}</li>`).join("")}</ol>`;
      case "list": return `<ul class="bullets">${b.items.map((s) => `<li>${s}</li>`).join("")}</ul>`;
      case "safety": return `<div class="safety"><h4>Stay safe</h4><ul>${b.items.map((s) => `<li>${s}</li>`).join("")}</ul></div>`;
      case "vars": return `<table class="vars">${b.rows.map(([k, given, a]) => `<tr><th>${k}</th><td>${given || ans(a)}</td></tr>`).join("")}</table>`;
      case "graph": return graphPaper(b);
      case "q": return question(b);
      case "part": return question(Object.assign({}, b, { part: true })); // an unnumbered part of a question
      case "lab": return `<div class="lab-card">${b.title ? `<h4 class="sub">${b.title}</h4>` : ""}${renderBlocks(b.blocks)}</div>`;
      default: return "";
    }
  }

  function compareTable(b) {
    const head = b.head ? `<thead><tr>${b.head.map((h) => `<th>${h}</th>`).join("")}</tr></thead>` : "";
    const body = b.rows.map((r) => `<tr>${r.map((c, i) => {
      if (i === 0 && !b.plainFirst) return `<th>${marks(c)}</th>`;
      if (c && typeof c === "object") return `<td class="blank-cell">${c.opts ? `<span class="cell-opts">${c.opts}</span>` : ""}${ans(c.a)}</td>`;
      return `<td>${marks(c)}</td>`;
    }).join("")}</tr>`).join("");
    return `<table class="compare">${head}<tbody>${body}</tbody></table>`;
  }

  function worked(b) {
    const steps = (arr, blank) => arr.map(([k, v], i) => `<div class="step${i === arr.length - 1 ? " final" : ""}"><span>${k}</span><span>${blank ? ans(v) : v}</span></div>`).join("");
    return `<div class="worked"><div><h4>Worked example</h4><div class="q">${b.q}</div>${steps(b.steps)}</div>` +
      `<div class="yt"><h4>Your turn</h4><div class="q">${b.yt.q}</div>${steps(b.yt.steps, true)}</div></div>`;
  }

  function question(b) {
    if (!b.part) qNum += 1;
    const type = b.type ? `<span class="type">${b.type}</span>` : "";
    const mk = b.marks ? `<span class="marks">[${b.marks} mark${b.marks > 1 ? "s" : ""}]</span>` : "";
    let body = "";
    if (b.say) body += `<div class="say" data-who="${b.say[0]}">${b.say[1]}</div>`;
    if (b.fig) body += `<div class="fig ${b.figCls || "fig-mid"}">${b.fig}</div>`;
    if (b.mcq) {
      body += `<ul class="mcq" style="--cols:${b.mcq.cols || 2}">${b.mcq.o.map((o, i) => `<li class="${i === b.mcq.c ? "correct" : ""}">${o}</li>`).join("")}</ul>`;
    }
    if (b.bank) body += `<div class="bank"><span class="bank-head">Choose answers from the box.</span><div>${b.bank.map((w) => `<span>${w}</span>`).join("")}</div></div>`;
    if (b.fill) body += (Array.isArray(b.fill) ? b.fill : [b.fill]).map((f) => `<p class="fill">${marks(f)}</p>`).join("");
    if (b.ring) {
      body += `<div class="ring-row">${b.ring.map((r) => `<div><span class="ring-lead">${marks(r[0])}</span><span class="ring-box">${r[1].map((o, i) => `<span class="${i === r[2] ? "correct" : ""}">${o}</span>`).join("")}</span></div>`).join("")}</div>`;
    }
    if (b.match) {
      body += `<div class="match"><div>${b.match.left.map((l) => `<span>${l}</span>`).join("")}</div><div class="match-gap">${answers ? b.match.a.map(([i, j]) => `<svg viewBox="0 0 100 ${b.match.left.length * 10}" preserveAspectRatio="none"><line x1="0" y1="${i * 10 + 5}" x2="100" y2="${j * 10 + 5}"/></svg>`).join("") : ""}</div><div>${b.match.right.map((r) => `<span>${r}</span>`).join("")}</div></div>`;
    }
    if (b.order) body += `<ol class="order">${b.order.map(([a, text]) => `<li data-a="${a}">${text}</li>`).join("")}</ol>`;
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
    if (b.part) return `<div class="question part"><div class="prompt">${mk}${marks(b.p || "")}</div>${body}</div>`;
    return `<div class="question"><span class="qn">${qNum}</span><div class="prompt">${mk}${type}${marks(b.p || "")}</div>${body}</div>`;
  }

  function dataTable(tb) {
    const head = `<tr>${tb.head.map((h) => `<th>${h}</th>`).join("")}</tr>`;
    const body = tb.rows.map((row, r) => `<tr>${row.map((c, i) => c === null
      ? `<td>${tb.ans && tb.ans[r] ? ans(tb.ans[r][i]) : ""}</td>`
      : `<td class="given">${c}</td>`).join("")}</tr>`).join("");
    return `<table class="data${tb.cls ? " " + tb.cls : ""}">${head}${body}</table>`;
  }

  // ---------- lessons ----------
  function lesson(l) {
    qNum = 0;
    const side = l.story
      ? `<div class="online story"><div><h3>${l.story.title}</h3><p>${l.story.text}</p></div></div>`
      : `<div class="online kit"><div><h3>You will need</h3><p>${l.kit}</p></div></div>`;
    const opener = `<header class="opener"><div class="num"><small>Lesson</small>${pad(l.n)}</div>
      <div><h2>${l.title}</h2><div class="spec">${l.spec}</div></div><div class="big-q">${l.big}</div></header>
      <div class="opener-foot"><div class="goals"><h3>By the end you can</h3><ul>${l.goals.map((g) => `<li>${g}</li>`).join("")}</ul>
      <div class="keywords">${l.keywords.map((k) => `<span>${k}</span>`).join("")}</div></div>${side}</div>`;

    const doNow = keep(`${secHead("doNow", l.n === 1 ? "What do you already think?" : "Do now", l.n === 1 ? "No wrong answers: this is your starting point." : "From earlier lessons. No notes!")}
      <div class="do-now-box">${l.doNow.map(([q, a], i) => `<div><b>${i + 1}</b>${marks(q)}${lines(2, a)}</div>`).join("")}</div>`);

    const parts = {
      doNow,
      learn: section("learn", l.learnTitle, l.learnAside, l.learn),
      try: l.try ? section("try", l.tryTitle, l.tryAside, l.try) : "",
      lab: l.lab ? section("lab", l.lab.title, l.lab.aside, l.lab.blocks) : "",
      // The card may break between questions; its heading stays with the first one.
      exam: `<div class="exam-card">${l.exam.map((e, i) => {
        const q = keep((i === 0 ? secHead("exam", "Exam corner", "Write in full sentences. Show every step of a calculation.") : "") + (e.tip ? `<div class="tip">${e.tip}</div>` : "") + question(e));
        return q;
      }).join("")}</div>`,
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
    const middle = REVIEW
      ? `<div class="cover-part"><b>Unit review</b><span>After Lesson ${U.lessons.length}</span></div>
      <p class="lede">Mixed exam-style questions from the whole unit, a fix-it log and the equation toolkit.</p>`
      : partNo
        ? `<div class="cover-part"><b>Part ${partNo} of ${PARTS.length}</b><span>Lessons ${firstL}–${lastL}: ${LESSONS.map((l) => l.title.replace(/^The /, "the ")).join(", ").replace(/^t/, "T")}</span></div>
      <div class="cover-stats"><div><b>${LESSONS.length}</b>lessons</div><div><b>${LESSONS.filter(isPractical).length}</b>practical${LESSONS.filter(isPractical).length === 1 ? "" : "s"}</div><div><b>${U.equations.filter((e) => inPart(e.lesson)).length}</b>new equations</div></div>`
        : `<p class="lede">Where energy is stored, how it moves, how fast it moves and how much of it is useful: nine lessons, from your first energy store to confident exam answers.</p>
      <div class="cover-stats"><div><b>9</b>lessons</div><div><b>6</b>practicals</div><div><b>8</b>equations</div></div>`;
    return `<section class="cover"><div class="eyebrow">Year 9 Physics, AQA GCSE, Unit 2${REVIEW ? ", Unit review" : partNo ? `, Part ${partNo}` : ""}</div>
      <h1>Energy<br><em>Stores and<br>Transfers</em></h1>
      ${middle}
      ${answers ? '<div class="edition">Answer edition for teachers and self-marking</div>' : ""}
      <div class="cover-foot">
        <div class="cover-circuit">${F.coverArt()}</div>
        <div class="cover-fields"><div>Name<span></span></div><div>Class<span></span></div><div>Teacher<span></span></div><div>Target grade<span></span></div></div>
      </div></section>`;
  }

  function howTo() {
    const items = [
      ["doNow", "Do now", "Quick questions from earlier lessons. Remembering again is what makes it stick."],
      ["learn", "Learn it", "The explanation, diagrams and worked examples. Read this again when you revise."],
      ["try", "Try it", "Practice that builds up: first with support, then on your own."],
      ["lab", "Practical", "Record your measurements and work out results from them."],
      ["exam", "Exam corner", "AQA-style questions with a tip on how the marks are given."],
      ["revise", "Revise it", "Summary, cover-and-answer questions and an “I can” check to colour in."],
    ];
    // A part lists only its own lessons, so the page fits on one sheet.
    const rows = LESSONS.map((l) => `<tr><td>${pad(l.n)}</td><td><strong>${l.title}</strong><br><span class="map-line">${l.mapLine}</span></td><td>${l.week}</td></tr>`).join("");
    return `<section class="new-page" style="break-before:auto">
      <div class="eyebrow">Start here</div><h2 class="page-title">How this booklet works</h2>
      <p class="page-intro">Energy is never made and never destroyed: it only moves from one store to another. This booklet shows you how to follow it, and how to calculate it. Keep the booklet: it is your classwork book <em>and</em> your revision guide.</p>
      <div class="legend">${items.map(([k, name, text]) => `<div>${icon(k)}<div><b>${name}</b><p>${text}</p></div></div>`).join("")}</div>
      <div class="key">${marks(`<strong>Two kinds of question to know.</strong> When a sentence has a gap, the choices are printed straight after it, like this: Energy is measured in [[joules|joules / newtons / watts]]. When you see a box of choices, <strong>draw a ring around</strong> the correct one, as AQA exam papers ask. The unit of energy is {{the watt|the joule*|the newton}}.`)}</div>
      <h4 class="sub">The route through ${partNo ? "this part" : "the unit"}</h4>
      <table class="route"><thead><tr><th>#</th><th>Lesson</th><th>Week</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="page-intro" style="margin-top:3mm">${partNo ? `This booklet is Part ${partNo} of ${PARTS.length}: Lessons ${firstL}–${lastL}. ` : ""}The <strong>equation toolkit</strong> on the last page has every equation ${partNo && lastL < U.lessons.length ? "you have met so far" : "in the unit"}, with formula triangles to help you rearrange.</p>
    </section>`;
  }

  function glossary() {
    return `<section class="new-page"><div class="eyebrow">Reference</div><h2 class="page-title">Key words</h2>
      <p class="page-intro">Learn the meaning and the spelling. In exams, precise words earn marks: say “transferred to the thermal store of the surroundings”, never “lost”.</p>
      <div class="glossary">${U.glossary.filter(([, , n]) => inPart(n)).map(([k, v, n]) => `<p><strong>${k}</strong> <span class="g-lesson">L${n}</span>: ${v}</p>`).join("")}</div></section>`;
  }

  function tracker() {
    const rows = LESSONS.map((l) => `<tr class="lesson-row"><td colspan="2">${pad(l.n)}: ${l.title}</td></tr>` +
      l.cando.map((c) => `<tr><td>${c}</td><td class="rag-cell"><span class="rag"><i></i><i></i><i></i></span></td></tr>`).join("")).join("");
    return `<section class="new-page"><div class="eyebrow">Finish</div><h2 class="page-title">Progress tracker</h2>
      <p class="page-intro">Colour one circle for each statement: <strong>red</strong> = not yet, <strong>amber</strong> = getting there, <strong>green</strong> = I can do this without help. Revisit your reds first.</p>
      <table class="tracker"><thead><tr><th>I can…</th><th>R / A / G</th></tr></thead><tbody>${rows}</tbody></table></section>`;
  }

  function quickAnswers() {
    const list = (arr) => `<ol>${arr.map(([, a]) => `<li>${a}</li>`).join("")}</ol>`;
    return `<section class="new-page"><div class="eyebrow">Check yourself</div><h2 class="page-title">Quick answers</h2>
      <p class="page-intro">Answers to the “Do now” and “Cover the page” questions, so you can check yourself when revising. Answers to the longer questions are in your teacher's answer edition.</p>
      <div class="quick-answers">${LESSONS.map((l) => `<div><b>Lesson ${l.n}: ${l.title}</b>
        <h4>Do now</h4>${list(l.doNow)}<h4>Cover the page</h4>${list(l.recall)}</div>`).join("")}</div></section>`;
  }

  // Unit review: mixed exam practice from assets/review.js, then a fix-it log.
  function review() {
    qNum = 0;
    const total = U.review.reduce((s, q) => s + (q.marks || 0), 0);
    return `<section class="lesson" style="--accent:var(--violet);--accent-t:var(--violet-t)">
      <div class="eyebrow">After Lesson ${U.lessons.length}, at home or in class</div><h2 class="page-title">Unit review</h2>
      <p class="page-intro">Mixed questions from the whole unit, like a real exam. Try each question without looking back. The equation toolkit is on the last page. Then mark your answers with your teacher and fill in the “fix it” log.</p>
      ${secHead("exam", "Mixed exam practice", `${total} marks, about 45 minutes`)}
      ${U.review.map((q) => keep((q.tip ? `<div class="tip">${q.tip}</div>` : "") + question(q))).join("")}
      ${keep(`${secHead("revise", "Fix-it log", "Turn every lost mark into a target.")}
      <table class="fix-log"><thead><tr><th style="width:14mm">Q</th><th>What went wrong?</th><th>The correct physics (or method) is…</th><th style="width:26mm">Lesson to revisit</th></tr></thead>
      <tbody>${"<tr><td></td><td></td><td></td><td></td></tr>".repeat(6)}</tbody></table>`)}</section>`;
  }

  function toolkit() {
    const tools = EQUATIONS.map((e) => `<div class="tool${e.tri ? " has-tri" : ""}"><div class="eq">${e.eq}</div><span class="lesson-tag">Lesson ${e.lesson}</span><div class="words">${e.words}</div><div class="units">${e.units}</div><div class="recall-cover">${e.re}</div>${e.tri ? `<div class="tool-tri">${triangleSvg(e.tri, "24mm")}</div>` : ""}</div>`).join("");
    return `<section class="new-page toolkit-page"><div class="eyebrow">Reference</div><h2 class="page-title">Equation toolkit</h2>
      <p class="page-intro">Every equation ${partNo && lastL < U.lessons.length ? `from Lessons 1–${lastL}` : "in the unit"}. AQA prints all of them on the equation sheet in the exam, but you still need to know what each symbol means, its unit, and how to use it. Use \\(g = 9.8\\ \\text{N/kg}\\).</p>
      <div class="tri-how"><div class="tri-steps"><p><b>1</b> Cover the quantity you want to find.</p><p><b>2</b> What is left side by side? <strong>Multiply</strong>.</p><p><b>3</b> One above the other? <strong>Divide</strong> the top by the bottom.</p></div>
      <p class="tri-note">Example: to find \\(h\\) from \\(E_p = m\\,g\\,h\\), cover \\(h\\). \\(E_p\\) is above \\(m\\) and \\(g\\), so \\(h = \\dfrac{E_p}{m\\,g}\\). ${lastL >= 5 ? "Kinetic and elastic potential energy have no triangle: in this unit you only use them" : "Kinetic energy has no triangle: in this unit you only use it"} to calculate the energy.</p></div>
      <div class="toolkit">${tools}</div>
      <div class="method-steps"><div><b>1</b>Write what you know. Convert first: g → kg, cm → m, kJ → J${lastL >= 7 ? ", min → s" : ""}${lastL >= 9 ? ", % → decimal" : ""}.</div><div><b>2</b>Write the equation in symbols.</div><div><b>3</b>Rearrange if you need to, then substitute the numbers.</div><div><b>4</b>Give the answer with a unit. Ask: is it sensible?</div></div>
    </section>`;
  }

  const book = document.createElement("main");
  book.className = "book";
  const here = REVIEW ? "review" : partNo ? `part=${partNo}` : "";
  const link = (q, a) => `?${[q, a ? "answers" : ""].filter(Boolean).join("&")}`;
  const bar = `<div class="screen-bar">Print preview. <a href="${link(REVIEW ? "" : "review", answers)}">${REVIEW ? "Workbook" : "Unit review"}</a>. <a href="${link(here, !answers)}">${answers ? "Student edition" : "Answer edition"}</a>. ${PARTS.map((_, i) => ` <a href="${link(`part=${i + 1}`, answers)}">Part ${i + 1}</a>.`).join("")} Print with Chrome, A4, headers and footers off</div>`;
  book.innerHTML = bar + (REVIEW
    ? cover() + review() + toolkit()
    : cover() + howTo() + LESSONS.map(lesson).join("") + glossary() + tracker() + quickAnswers() + toolkit());
  document.body.appendChild(book);

  // Typeset the maths, then tell the PDF build the page is ready. Offline, the LaTeX source stays.
  const ready = () => { document.body.dataset.ready = "1"; };
  const mj = window.MathJax;
  if (mj && mj.startup && mj.startup.promise) mj.startup.promise.then(() => mj.typesetPromise([book])).then(ready, ready);
  else ready();
})();
