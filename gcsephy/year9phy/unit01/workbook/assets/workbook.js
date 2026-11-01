/* Renders the Work Like a Physicist student workbook from window.UNIT (assets/content.js).
   Adapted from the Year 9 Energy workbook so the two units look alike.
   workbook.html?part=1 (2, 3) prints one part of the booklet, with its own cover, key words,
   tracker, quick answers and toolkit; the PDFs are printed in parts. Add &answers for the answer
   edition, with the same page numbers. workbook.html?review prints the Unit review (add &answers).
   With no part, the whole booklet is shown. Print with Chrome: A4, default margins, no headers or footers. */
(function () {
  "use strict";

  const U = window.UNIT;
  const F = window.WLPFigures;
  const params = new URLSearchParams(location.search);
  const answers = params.has("answers");
  const REVIEW = params.has("review");
  const pad = (n) => String(n).padStart(2, "0");
  // The booklet is printed in three parts: Lessons 1-2, 3-5 and 6-8 (Lessons 7-8 are one entry, n = 7).
  const PARTS = [[1, 2], [3, 5], [6, 7]];
  const partNo = REVIEW ? 0 : Number(params.get("part")) || 0;
  const [firstL, lastL] = PARTS[partNo - 1] || [1, U.lessons[U.lessons.length - 1].n];
  const inPart = (n) => n >= firstL && n <= lastL;
  const LESSONS = U.lessons.filter((l) => inPart(l.n));
  const lessonName = (l) => l.name || `Lesson ${l.n}`;
  const span = (ls) => { const a = ls[0], b = ls[ls.length - 1]; return `${a.n}–${b.last || b.n}`; };
  if (answers) document.body.classList.add("answers");

  const footer = `Work Like a Physicist, Year 9 ${REVIEW ? "Unit review" : "workbook"}${partNo ? ` Part ${partNo}` : ""}${answers ? " (ANSWERS)" : ""}`;
  const pageStyle = document.createElement("style");
  pageStyle.textContent = `@page { @bottom-left { content: "${footer}, © 2026 PanPhy Labs. All rights reserved."; } } @page cover { @bottom-left { content: none; } }`;
  document.head.appendChild(pageStyle);
  document.title = `Work Like a Physicist - Year 9 ${REVIEW ? "Unit Review" : "Workbook"}${partNo ? ` - Part ${partNo}` : ""}${answers ? " (Answers)" : ""}`;

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
      .replace(/\[\[(.*?)(?:\|([^\]]+))?\]\]/g, (_, a, extra) => {
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
  const secHead = (key, title, aside, kind) => {
    const [cls, name, k] = SEC[key];
    return `<div class="sec ${cls}">${icon(key)}<div><span class="kind">${kind || k}</span><h3>${title || name}</h3></div>${aside ? `<div class="aside">${aside}</div>` : ""}</div>`;
  };

  /* Graph paper drawn in millimetres: 2 mm minor and 1 cm major squares.
     spec: { w, h, xLabel, yLabel, x: [valuePerCm, labelEvery], y: [...], points, fit, curve, bars, rings, yTicks, xTicks, blank }
     points, fit (straight, [[x1,y1],[x2,y2]]), curve (a list of points) and bars ([[label, value]], one per 2 cm)
     appear only in the answer edition. yTicks/xTicks false leave that scale for the student; blank: true leaves
     the axes, labels and scales for the student (the answer edition still shows them). */
  function graphPaper(spec) {
    const W = spec.w || 150, H = spec.h || 90, L = 12, T = 6;
    const show = (flag) => answers || (!spec.blank && flag !== false);
    const X = (v) => L + (v / spec.x[0]) * 10;
    const Y = (v) => T + H - (v / spec.y[0]) * 10;
    let out = "";
    for (let i = 0; i <= W; i += 2) out += `<line class="${i % 10 ? "minor" : "major"}" x1="${L + i}" y1="${T}" x2="${L + i}" y2="${T + H}"/>`;
    for (let j = 0; j <= H; j += 2) out += `<line class="${j % 10 ? "minor" : "major"}" x1="${L}" y1="${T + j}" x2="${L + W}" y2="${T + j}"/>`;
    if (!spec.blank || answers) out += `<line class="axis" x1="${L}" y1="${T + H}" x2="${L + W}" y2="${T + H}"/><line class="axis" x1="${L}" y1="${T}" x2="${L}" y2="${T + H}"/>`;
    const fmt = (v) => String(Math.round(v * 1000) / 1000);
    if (!spec.bars && show(spec.xTicks)) for (let cm = spec.x[1] || 1; cm <= W / 10; cm += spec.x[1] || 1) out += `<text class="tick" x="${L + cm * 10}" y="${T + H + 3.8}" text-anchor="middle">${fmt(cm * spec.x[0])}</text>`;
    if (show(spec.yTicks)) for (let cm = spec.y[1] || 1; cm <= H / 10; cm += spec.y[1] || 1) out += `<text class="tick" x="${L - 1.2}" y="${T + H - cm * 10 + 1}" text-anchor="end">${fmt(cm * spec.y[0])}</text>`;
    if (show(spec.yTicks)) out += `<text class="tick" x="${L - 1.2}" y="${T + H + 3.8}" text-anchor="end">0</text>`;
    if (show()) {
      out += `<text class="axis-label" x="${L + W}" y="${T + H + 8}" text-anchor="end">${spec.xLabel || ""}</text>`;
      out += `<text class="axis-label" x="${L + 1.5}" y="${T - 1.8}" text-anchor="start">${spec.yLabel || ""}</text>`;
    }
    if (answers && spec.bars) {
      out += spec.bars.map(([label, v], i) => {
        const x = L + 6 + i * (spec.barStep || 26), y = Y(v);
        return `<rect class="bar" x="${x}" y="${y}" width="${spec.barW || 14}" height="${T + H - y}"/><text class="tick" x="${x + (spec.barW || 14) / 2}" y="${T + H + 3.8}" text-anchor="middle">${label}</text>`;
      }).join("");
    }
    if (answers && spec.points) {
      out += spec.points.map(([a, b]) => { const x = X(a), y = Y(b); return `<path class="mark" d="M${x - 1.2} ${y - 1.2}L${x + 1.2} ${y + 1.2}M${x - 1.2} ${y + 1.2}L${x + 1.2} ${y - 1.2}"/>`; }).join("");
      if (spec.fit) out += `<line class="fit" x1="${X(spec.fit[0][0])}" y1="${Y(spec.fit[0][1])}" x2="${X(spec.fit[1][0])}" y2="${Y(spec.fit[1][1])}"/>`;
      if (spec.curve) out += `<polyline class="fit" points="${spec.curve.map(([a, b]) => `${X(a).toFixed(2)},${Y(b).toFixed(2)}`).join(" ")}"/>`;
      if (spec.rings) out += spec.rings.map(([a, b]) => `<circle class="fit" cx="${X(a)}" cy="${Y(b)}" r="3"/>`).join("");
      if (spec.guide) { const [gx, gy] = spec.guide; out += `<path class="fit fit-2" d="M${X(gx)} ${T + H}V${Y(gy)}H${L}"/>`; }
    }
    // Plotted for everyone (given points the student works with).
    if (spec.given) out += spec.given.map(([a, b]) => { const x = X(a), y = Y(b); return `<path class="given-mark" d="M${x - 1.2} ${y - 1.2}L${x + 1.2} ${y + 1.2}M${x - 1.2} ${y + 1.2}L${x + 1.2} ${y - 1.2}"/>`; }).join("");
    return `<svg class="graph-paper" viewBox="0 0 ${W + L + 4} ${H + T + 10}" style="width:${W + L + 4}mm;height:${H + T + 10}mm" role="img" aria-label="Graph paper">${out}</svg>`;
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
    if (typeof b === "string") return `<p>${marks(b)}</p>`;
    switch (b.t) {
      case "p": return `<p>${marks(b.h)}</p>`;
      case "html": return b.h;
      case "sub": return `<h4 class="sub">${b.h}</h4>`;
      case "key": return `<div class="key">${marks(b.h)}</div>`;
      case "warn": return `<div class="key warn">${marks(b.h)}</div>`;
      case "tip": return `<div class="tip">${b.h}</div>`;
      case "say": return `<div class="say" data-who="${b.who}">${b.h}</div>`;
      case "model":
        return `<div class="model"><h4>${b.title || "Think of it like this"}</h4>${b.fig ? `<div class="split narrow-fig"><div><p>${b.h}</p></div><div class="fig-small">${b.fig}</div></div>` : `<p>${b.h}</p>`}${b.breaks ? `<p class="breaks">${b.breaks}</p>` : ""}</div>`;
      case "rule": return `<div class="rule-card"><div class="rule-head">${b.head || "Rule"}</div><div class="rule-body">${b.h}</div>${b.foot ? `<div class="rule-foot">${b.foot}</div>` : ""}</div>`;
      case "split":
        return `<div class="split ${b.cls || ""}"><div>${renderBlocks(b.left)}</div><div>${renderBlocks(b.right)}</div></div>`;
      case "fig": return `<div class="fig ${b.cls || ""}">${b.h}${b.cap ? `<p class="cap">${b.cap}</p>` : ""}</div>`;
      case "figs": return `<div class="figs c${b.cols || b.items.length} ${b.cls || ""}">${b.items.map((h) => `<div class="fig">${h}</div>`).join("")}</div>`;
      case "compare": return compareTable(b);
      case "worked": return worked(b);
      case "steps": return `<ol class="steps">${b.items.map((s) => `<li>${marks(s)}</li>`).join("")}</ol>`;
      case "list": return `<ul class="bullets">${b.items.map((s) => `<li>${s}</li>`).join("")}</ul>`;
      case "safety": return `<div class="safety"><h4>Stay safe</h4><ul>${b.items.map((s) => `<li>${s}</li>`).join("")}</ul></div>`;
      case "vars": return `<table class="vars${b.cls ? " " + b.cls : ""}">${b.rows.map(([k, given, a]) => `<tr><th>${k}</th><td>${given ? marks(given) : ans(a)}</td></tr>`).join("")}</table>`;
      case "checks": return checks(b);
      case "graph": return graphPaper(b);
      case "table": return dataTable(b);
      case "q": return question(b);
      case "part": return question(Object.assign({}, b, { part: true })); // an unnumbered part of a question
      case "lab": return `<div class="lab-card">${b.title ? `<h4 class="sub">${b.title}</h4>` : ""}${renderBlocks(b.blocks)}</div>`;
      case "home": return `<div class="home-card"><h4>${b.title || "Take it home"}</h4>${renderBlocks(b.blocks)}</div>`;
      default: return "";
    }
  }

  // Tick-box checklist: items, with one tick column per heading in `head`.
  function checks(b) {
    const head = b.head || ["✓"];
    const ticked = b.a || [];
    return `<table class="checks${b.cls ? " " + b.cls : ""}"><thead><tr><th>${b.title || "Check"}</th>${head.map((h) => `<th class="tick-col">${h}</th>`).join("")}</tr></thead><tbody>${b.items.map((it, i) => `<tr><td>${it}</td>${head.map((_, j) => `<td class="tick-col"><span class="tickbox${ticked[i] === j ? " on" : ""}"></span></td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }

  function compareTable(b) {
    const head = b.head ? `<thead><tr>${b.head.map((h) => `<th>${h}</th>`).join("")}</tr></thead>` : "";
    const body = b.rows.map((r) => `<tr>${r.map((c, i) => {
      if (i === 0 && !b.plainFirst) return `<th>${marks(c)}</th>`;
      if (c && typeof c === "object") return `<td class="blank-cell">${c.opts ? `<span class="cell-opts">${c.opts}</span>` : ""}${ans(c.a)}</td>`;
      return `<td>${marks(c)}</td>`;
    }).join("")}</tr>`).join("");
    return `<table class="compare${b.cls ? " " + b.cls : ""}">${head}<tbody>${body}</tbody></table>`;
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
    if (b.bank) body += `<div class="bank"><span class="bank-head">${b.bankHead || "Choose answers from the box. Each word may be used once, more than once or not at all."}</span><div>${b.bank.map((w) => `<span>${w}</span>`).join("")}</div></div>`;
    if (b.fill) body += (Array.isArray(b.fill) ? b.fill : [b.fill]).map((f) => `<p class="fill">${marks(f)}</p>`).join("");
    if (b.ring) {
      body += `<div class="ring-row">${b.ring.map((r) => `<div><span class="ring-lead">${marks(r[0])}</span><span class="ring-box">${r[1].map((o, i) => `<span class="${i === r[2] ? "correct" : ""}">${o}</span>`).join("")}</span>${r[3] ? `<span class="ring-tail">${marks(r[3])}</span>` : ""}</div>`).join("")}</div>`;
    }
    if (b.match) {
      body += `<div class="match"><div>${b.match.left.map((l) => `<span>${l}</span>`).join("")}</div><div class="match-gap">${answers ? b.match.a.map(([i, j]) => `<svg viewBox="0 0 100 ${b.match.left.length * 10}" preserveAspectRatio="none"><line x1="0" y1="${i * 10 + 5}" x2="100" y2="${j * 10 + 5}"/></svg>`).join("") : ""}</div><div>${b.match.right.map((r) => `<span>${r}</span>`).join("")}</div></div>`;
    }
    if (b.order) body += `<ol class="order">${b.order.map(([a, text]) => `<li data-a="${a}">${text}</li>`).join("")}</ol>`;
    if (b.table) body += dataTable(b.table);
    if (b.graph) body += graphPaper(b.graph);
    if (b.starter) body += `<p class="starter">${b.starter}</p>`;
    if (b.frame) {
      const fa = b.frameA || [];
      body += `<div class="frame">${b.frame.map(([k, unit], i) => `<span>${k}</span><span>${ans(fa[i])}${unit ? `<span class="unit">${unit}</span>` : ""}</span>`).join("")}</div>`;
    }
    if (b.after) body += renderBlocks(b.after);
    if (b.lines) body += lines(b.lines, b.a);
    else if (b.box) body += box(b.box, b.a, b.grid);
    else if (b.a && !b.frame) body += ansNote(b.a);
    if (b.part) return `<div class="question part"><div class="prompt">${mk}${marks(b.p || "")}</div>${body}</div>`;
    return `<div class="question"><span class="qn">${qNum}</span><div class="prompt">${mk}${type}${marks(b.p || "")}</div>${body}</div>`;
  }

  // Cells: a string is printed; null is a blank for the student (answer from tb.ans); {opts, a} prints its choices.
  function dataTable(tb) {
    const head = `<tr>${tb.head.map((h) => `<th>${h}</th>`).join("")}</tr>`;
    const body = tb.rows.map((row, r) => `<tr>${row.map((c, i) => {
      if (c === null) return `<td>${tb.ans && tb.ans[r] ? ans(tb.ans[r][i]) : ""}</td>`;
      if (typeof c === "object") return `<td class="blank-cell">${c.opts ? `<span class="cell-opts">${c.opts}</span>` : ""}${ans(c.a)}</td>`;
      return `<td class="given">${marks(c)}</td>`;
    }).join("")}</tr>`).join("");
    const cols = tb.widths ? `<colgroup>${tb.widths.map((w) => `<col style="width:${w}">`).join("")}</colgroup>` : "";
    return `<table class="data${tb.cls ? " " + tb.cls : ""}"${tb.rh ? ` style="--rh:${tb.rh}mm"` : ""}>${cols}${head}${body}</table>`;
  }

  // ---------- lessons ----------
  function lesson(l) {
    qNum = 0;
    const story = `<div class="online story"><div><h3>The case${l.story.year ? ` (${l.story.year})` : ""}</h3><p><strong>${l.story.title}.</strong> ${l.story.text}</p>${l.story.punch ? `<p class="punch">${l.story.punch}</p>` : ""}</div></div>`;
    const opener = `<header class="opener"><div class="num"><small>${l.last ? "Lessons" : "Lesson"}</small>${pad(l.n)}${l.last ? `<span class="num-to">–${pad(l.last)}</span>` : ""}</div>
      <div><h2>${l.title}</h2><div class="spec">${l.spec}</div></div><div class="big-q">${l.big}</div></header>
      <div class="opener-foot"><div class="goals"><h3>By the end you can</h3><ul>${l.goals.map((g) => `<li>${g}</li>`).join("")}</ul>
      <div class="keywords">${l.keywords.map((k) => `<span>${k}</span>`).join("")}</div></div>${story}</div>`;

    const doNow = keep(`${secHead("doNow", l.n === 1 ? "What do you already think?" : "Do now", l.n === 1 ? "No wrong answers: this is your starting point." : "From earlier lessons. No notes!")}
      <div class="do-now-box">${l.doNow.map(([q, a], i) => `<div><b>${i + 1}</b>${marks(q)}${lines(2, a)}</div>`).join("")}</div>`);

    const parts = {
      doNow,
      learn: section("learn", l.learnTitle, l.learnAside, l.learn),
      try: l.try ? section("try", l.tryTitle, l.tryAside, l.try) : "",
      lab: l.lab ? section("lab", l.lab.title, l.lab.aside, l.lab.blocks) : "",
      lab2: l.lab2 ? section("lab", l.lab2.title, l.lab2.aside, l.lab2.blocks) : "",
      exam: l.exam ? `<div class="exam-card">${l.exam.map((e, i) => keep((i === 0 ? secHead("exam", "Exam corner", "Write in full sentences. Show every step of a calculation.") : "") + (e.tip ? `<div class="tip">${e.tip}</div>` : "") + question(e))).join("")}</div>` : "",
      home: l.home ? keep(renderBlock({ t: "home", title: l.home.title, blocks: l.home.blocks })) : "",
      revise: keep(secHead("revise", "Revise it", "Use this box after the lesson and before tests.") +
        `<div class="revise-card"><div><h4>Summary</h4><ul>${l.summary.map((s) => `<li>${s}</li>`).join("")}</ul>
        <div class="recall"><h4>Cover the page and answer</h4>${l.recall.map(([q], i) => `<p><b>${i + 1}</b>${q}</p>`).join("")}</div></div>
        <div><h4>I can…</h4><ul class="cando">${l.cando.map((c) => `<li><span>${c}</span><span class="rag"><i></i><i></i><i></i></span></li>`).join("")}</ul></div></div>`),
    };
    // l.flow lists the sections in order: a name from `parts`, or { sec, title, aside, blocks } for an
    // extra Practical or Try it section (the long practical lessons have several).
    const flow = l.flow || ["doNow", "learn", "try", "lab", "lab2", "exam", "home", "revise"];
    return `<section class="lesson" style="--accent:var(--${l.accent});--accent-t:var(--${l.accent}-t)">${opener}${flow.map((k) => (typeof k === "string" ? parts[k] : section(k.sec, k.title, k.aside, k.blocks))).join("")}</section>`;
  }

  // ---------- front and back matter ----------
  function cover() {
    const pr = LESSONS.filter((l) => l.practical).length;
    const middle = REVIEW
      ? `<div class="cover-part"><b>Unit review</b><span>After Lessons 7–8</span></div>
      <p class="lede">Mixed exam-style questions from the whole unit, a fix-it log and the Physicist’s toolkit.</p>`
      : partNo
        ? `<div class="cover-part"><b>Part ${partNo} of ${PARTS.length}</b><span>${LESSONS.some((l) => l.last) || LESSONS.length > 1 ? "Lessons" : "Lesson"} ${span(LESSONS)}: ${LESSONS.map((l) => l.title).join("; ")}</span></div>
      <div class="cover-stats"><div><b>${LESSONS.reduce((s, l) => s + (l.last ? l.last - l.n + 1 : 1), 0)}</b>lessons</div><div><b>${pr}</b>practical${pr === 1 ? "" : "s"}</div><div><b>${U.glossary.filter(([, , n]) => inPart(n)).length}</b>key words</div></div>`
        : `<p class="lede">Collecting, processing and presenting data: eight lessons on how to produce evidence that other people can trust.</p>`;
    return `<section class="cover"><div class="eyebrow">Year 9 Physics, AQA GCSE, Unit 1${REVIEW ? ", Unit review" : partNo ? `, Part ${partNo}` : ""}</div>
      <h1>Work like<br><em>a physicist</em></h1>
      ${middle}
      <blockquote class="cover-quote">${REVIEW ? "“It doesn’t matter how beautiful your theory is … If it doesn’t agree with experiment, it’s wrong.”" : "“The first principle is that you must not fool yourself, and you are the easiest person to fool.”"}<span>Richard Feynman, physicist</span></blockquote>
      ${answers ? '<div class="edition">Answer edition for teachers and self-marking</div>' : ""}
      <div class="cover-foot">
        <div class="cover-circuit">${F.coverArt()}</div>
        <div class="cover-fields"><div>Name<span></span></div><div>Class<span></span></div><div>Teacher<span></span></div><div>${REVIEW ? "Score / 40" : "Lab partner"}<span></span></div></div>
      </div></section>`;
  }

  function howTo() {
    const items = [
      ["doNow", "Do now", "Quick questions from earlier lessons. Remembering again is what makes it stick."],
      ["learn", "Learn it", "The explanation, diagrams and worked examples. Read this again when you revise."],
      ["try", "Try it", "Practice that builds up: first with support, then on your own."],
      ["lab", "Practical", "Plan, record your measurements and work out results from them."],
      ["exam", "Exam corner", "AQA-style questions with a tip on how the marks are given."],
      ["revise", "Revise it", "Summary, cover-and-answer questions and an “I can” check to colour in."],
    ];
    const rows = LESSONS.map((l) => `<tr><td>${pad(l.n)}${l.last ? `–${pad(l.last)}` : ""}</td><td><strong>${l.title}</strong><br><span class="map-line">${l.mapLine}</span></td><td>${l.practicalName || "–"}</td></tr>`).join("");
    return `<section class="new-page" style="break-before:auto">
      <div class="eyebrow">Start here</div><h2 class="page-title">How this booklet works</h2>
      <p class="page-intro">Anyone can have an opinion about how the world works. A physicist has to do something harder: produce <strong>evidence</strong> that convinces people who were not there. This unit teaches you how. Keep the booklet: it is your classwork book <em>and</em> your revision guide.</p>
      <div class="legend">${items.map(([k, name, text]) => `<div>${icon(k)}<div><b>${name}</b><p>${text}</p></div></div>`).join("")}</div>
      <div class="key">${marks(`<strong>Two kinds of question to know.</strong> When a sentence has a gap, the choices are printed straight after it, like this: The thing you change is the [[independent|independent / dependent / control]] variable. When you see a box of choices, <strong>draw a ring around</strong> the correct one, as AQA exam papers ask. The thing you measure is the {{independent|dependent*|control}} variable.`)}</div>
      <h4 class="sub">The route through ${partNo ? "this part" : "the unit"}</h4>
      <table class="route"><thead><tr><th>#</th><th>Lesson</th><th>Practical</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="page-intro" style="margin-top:3mm">${partNo ? `This booklet is Part ${partNo} of ${PARTS.length}: Lessons ${span(LESSONS)}. ` : ""}The <strong>Physicist’s toolkit</strong> on the last page has every rule, calculation and checklist you need.</p>
    </section>`;
  }

  function glossary() {
    return `<section class="new-page"><div class="eyebrow">Reference</div><h2 class="page-title">Key words</h2>
      <p class="page-intro">Learn the meaning and the spelling. In exams, precise words earn marks: say “random error”, never “human error”.</p>
      <div class="glossary">${U.glossary.filter(([, , n]) => n <= lastL).map(([k, v, n]) => `<p><strong>${k}</strong> <span class="g-lesson">L${n === 7 ? "7–8" : n}</span>: ${v}</p>`).join("")}</div>
      ${keep(`<h4 class="sub">Phrases that pick up marks</h4>
      <table class="compare phrases"><thead><tr><th>Instead of writing…</th><th>Write…</th></tr></thead><tbody>${U.phrases.filter(([, , n]) => n <= lastL).map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("")}</tbody></table>`)}</section>`;
  }

  function tracker() {
    const rows = LESSONS.map((l) => `<tr class="lesson-row"><td colspan="2">${pad(l.n)}${l.last ? `–${pad(l.last)}` : ""}: ${l.title}</td></tr>` +
      l.cando.map((c) => `<tr><td>${c}</td><td class="rag-cell"><span class="rag"><i></i><i></i><i></i></span></td></tr>`).join("")).join("");
    return `<section class="new-page"><div class="eyebrow">Finish</div><h2 class="page-title">Progress tracker</h2>
      <p class="page-intro">Colour one circle for each statement: <strong>red</strong> = not yet, <strong>amber</strong> = getting there, <strong>green</strong> = I can do this without help. Revisit your reds first.</p>
      <table class="tracker"><thead><tr><th>I can…</th><th>R / A / G</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="key warn"><strong>One habit worth building.</strong> When something in your results looks wrong, the useful question is never “can I ignore that?” It is “why did that happen?”</div>
      <div class="sentence"><div class="k">The whole unit in one sentence</div><div class="v">Measure it more than once, be honest about the doubt, show the pattern clearly, and let the evidence decide.</div></div></section>`;
  }

  function quickAnswers() {
    const list = (arr) => `<ol>${arr.map(([, a]) => `<li>${a}</li>`).join("")}</ol>`;
    return `<section class="new-page"><div class="eyebrow">Check yourself</div><h2 class="page-title">Quick answers</h2>
      <p class="page-intro">Answers to the “Do now” and “Cover the page” questions, so you can check yourself when revising. Answers to the longer questions are in your teacher's answer edition.</p>
      <div class="quick-answers">${LESSONS.map((l) => `<div><b>${lessonName(l)}: ${l.title}</b>
        <h4>Do now</h4>${list(l.doNow)}<h4>Cover the page</h4>${list(l.recall)}</div>`).join("")}</div></section>`;
  }

  // Unit review: mixed exam practice from assets/review.js, then a fix-it log.
  function review() {
    qNum = 0;
    const total = U.review.reduce((s, q) => s + (q.marks || 0) + (q.after || []).reduce((t, b) => t + (b.marks || 0), 0), 0);
    return `<section class="lesson" style="--accent:var(--violet);--accent-t:var(--violet-t)">
      <div class="eyebrow">After Lessons 7–8, at home or in class</div><h2 class="page-title">Unit review</h2>
      <p class="page-intro">Mixed questions from the whole unit, like a real exam. Try each question without looking back. The Physicist’s toolkit is on the last page: use it only after you have tried every question. Then mark your answers with your teacher and fill in the “fix it” log.</p>
      ${secHead("exam", "Mixed exam practice", `${total} marks, about 45 minutes`)}
      ${U.review.map((q) => keep((q.tip ? `<div class="tip">${q.tip}</div>` : "") + question(q))).join("")}
      ${keep(`${secHead("revise", "Fix-it log", "Turn every lost mark into a target.")}
      <table class="fix-log"><thead><tr><th style="width:14mm">Q</th><th>What went wrong?</th><th>The correct physics (or method) is…</th><th style="width:26mm">Lesson to revisit</th></tr></thead>
      <tbody>${"<tr><td></td><td></td><td></td><td></td></tr>".repeat(6)}</tbody></table>
      <p class="score-line">My score: <span class="blank" style="--w:16mm"></span> / ${total}. Two things I will practise before the test: <span class="blank" style="--w:70mm"></span></p>`)}</section>`;
  }

  // The Physicist's toolkit: every rule, calculation and checklist, on one page.
  function toolkit() {
    const T = U.toolkit;
    const card = (c) => `<div class="tk${c.cls ? " " + c.cls : ""}"><h4>${c.title}</h4>${c.h}</div>`;
    return `<section class="new-page toolkit-page"><div class="eyebrow">Reference</div><h2 class="page-title">The Physicist’s toolkit</h2>
      <p class="page-intro">Everything you need for the whole unit, on one page. Fold the corner: you will come back to it.</p>
      <div class="tk-grid">${T.cards.map(card).join("")}</div>
      <div class="rule-card"><div class="rule-head">The rule that decides your graph</div><div class="rule-body">Continuous independent variable → <strong>line graph</strong>. Categoric independent variable → <strong>bar chart</strong>.</div><div class="rule-foot">It depends on what you <em>changed</em>, not on what you measured.</div></div>
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

  // Tell the PDF build that the page is ready once the fonts have loaded.
  const ready = () => { document.body.dataset.ready = "1"; };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ready, ready); else ready();
})();
