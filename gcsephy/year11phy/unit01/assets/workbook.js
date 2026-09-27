/* Renders the Atoms and Nuclear Radiation student workbook from window.UNIT (assets/content.js).
   workbook.html?lesson=N prints one lesson booklet; ?review prints the unit review booklet;
   add &answers for the answer edition. Print to PDF from Chrome (A4, default margins,
   no headers or footers). Diagrams come from the teaching deck (window.DeckFigures). */
(function () {
  "use strict";

  const U = window.UNIT;
  const F = window.DeckFigures;
  const params = new URLSearchParams(location.search);
  const answers = params.has("answers");
  const ONE = U.lessons.find((l) => l.n === Number(params.get("lesson"))) || null;
  const REVIEW = !ONE && params.has("review");
  const LESSONS = ONE ? [ONE] : REVIEW ? [] : U.lessons;
  const LAST = ONE ? ONE.n : U.lessons[U.lessons.length - 1].n;
  const pad = (n) => String(n).padStart(2, "0");
  const DECK = "panphy.app/gcsephy/decks/atoms-and-radiation";
  if (answers) document.body.classList.add("answers");

  const which = ONE ? `Lesson ${ONE.n}` : REVIEW ? "Unit review" : "";
  const footer = `Atoms & Nuclear Radiation, Year 11 workbook${which ? `: ${which}` : ""}${answers ? " (ANSWERS)" : ""}`;
  const pageStyle = document.createElement("style");
  pageStyle.textContent = `@page { @bottom-left { content: "${footer}"; } } @page cover { @bottom-left { content: none; } }`;
  document.head.appendChild(pageStyle);
  document.title = `Atoms and Nuclear Radiation - Year 11 Workbook${ONE ? ` Lesson ${pad(ONE.n)} - ${ONE.title}` : REVIEW ? " - Unit review" : ""}${answers ? " (Answers)" : ""}`;

  // ---------- small helpers ----------
  const ans = (html) => (html ? `<span class="ans">${html}</span>` : "");
  const ansNote = (html) => (html ? `<div class="ans-note">${html}</div>` : "");
  const lines = (n, a) => `<div class="lines" style="--n:${n}">${ans(a)}</div>`;
  const box = (h, a, grid) => `<div class="box${grid ? " grid-bg" : ""}" style="--h:${h}mm">${ans(a)}</div>`;
  const titleDot = (t) => `${t}<span class="dot">.</span>`;

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

  /* Graph paper drawn in millimetres: 2 mm minor and 1 cm major squares.
     spec: { w, h, xLabel, yLabel, x: [perCm, labelEvery], y: [...],
             given, givenFit, givenRange (printed in both editions),
             points, fit, fitRange, read (answer edition only; read: [[x, y], ...] draws dashed read-off lines) } */
  function graphPaper(spec) {
    const W = spec.w || 150, H = spec.h || 90, L = 12, T = 6;
    const X = (v) => L + (v / spec.x[0]) * 10;
    const Y = (v) => T + H - (v / spec.y[0]) * 10;
    const curve = (fn, [a, b], cls) => `<polyline class="${cls}" points="${Array.from({ length: 121 }, (_, i) => a + ((b - a) * i) / 120).map((v) => `${X(v).toFixed(2)},${Y(fn(v)).toFixed(2)}`).join(" ")}"/>`;
    const cross = ([a, b], cls) => { const x = X(a), y = Y(b); return `<path class="${cls}" d="M${x - 1.2} ${y - 1.2}L${x + 1.2} ${y + 1.2}M${x - 1.2} ${y + 1.2}L${x + 1.2} ${y - 1.2}"/>`; };
    let out = "";
    for (let i = 0; i <= W; i += 2) out += `<line class="${i % 10 ? "minor" : "major"}" x1="${L + i}" y1="${T}" x2="${L + i}" y2="${T + H}"/>`;
    for (let j = 0; j <= H; j += 2) out += `<line class="${j % 10 ? "minor" : "major"}" x1="${L}" y1="${T + j}" x2="${L + W}" y2="${T + j}"/>`;
    out += `<line class="axis" x1="${L}" y1="${T + H}" x2="${L + W}" y2="${T + H}"/><line class="axis" x1="${L}" y1="${T}" x2="${L}" y2="${T + H}"/>`;
    const fmt = (v) => String(Math.round(v * 1000) / 1000);
    for (let cm = spec.x[1] || 1; cm <= W / 10; cm += spec.x[1] || 1) out += `<text class="tick" x="${L + cm * 10}" y="${T + H + 3.8}" text-anchor="middle">${fmt(cm * spec.x[0])}</text>`;
    for (let cm = spec.y[1] || 1; cm <= H / 10; cm += spec.y[1] || 1) out += `<text class="tick" x="${L - 1.2}" y="${T + H - cm * 10 + 1}" text-anchor="end">${fmt(cm * spec.y[0])}</text>`;
    out += `<text class="tick" x="${L - 1.2}" y="${T + H + 3.8}" text-anchor="end">0</text>`;
    out += `<text class="axis-label" x="${L + W}" y="${T + H + 8}" text-anchor="end">${spec.xLabel}</text>`;
    out += `<text class="axis-label" x="${L + 1.5}" y="${T - 1.8}" text-anchor="start">${spec.yLabel}</text>`;
    if (spec.given) out += spec.given.map((p) => cross(p, "given-mark")).join("");
    if (spec.givenFit) out += curve(spec.givenFit, spec.givenRange, "given-fit");
    if (spec.showRead) out += spec.showRead.map(([a, b]) => `<path class="read given-read" d="M${L} ${Y(b)} H${X(a)} V${T + H}"/>`).join("");
    if (answers) {
      if (spec.points) out += spec.points.map((p) => cross(p, "mark")).join("");
      if (spec.fit) out += curve(spec.fit, spec.fitRange, "fit");
      if (spec.read) out += spec.read.map(([a, b]) => `<path class="read" d="M${L} ${Y(b)} H${X(a)} V${T + H}"/>`).join("");
    }
    return `<svg class="graph-paper" viewBox="0 0 ${W + L + 4} ${H + T + 10}" style="width:${W + L + 4}mm;height:${H + T + 10}mm" role="img" aria-label="Graph paper">${out}</svg>`;
  }

  // ---------- blocks ----------
  let qNum = 0;
  const keep = (html) => `<div class="keep">${html}</div>`;
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
        return `<div class="model"><h4>${b.title || "Think of it like this"}</h4>${b.fig ? `<div class="split narrow-fig"><div><p>${b.h}</p></div><div>${b.fig}</div></div>` : `<p>${b.h}</p>`}${b.breaks ? `<p class="breaks">${b.breaks}</p>` : ""}</div>`;
      case "split":
        return `<div class="split ${b.cls || ""}"><div>${renderBlocks(b.left)}</div><div>${renderBlocks(b.right)}</div></div>`;
      case "fig": return b.h;
      case "figs": return `<div class="figs c${b.cols || b.items.length} ${b.cls || ""}">${b.items.map((h) => `<div>${h}</div>`).join("")}</div>`;
      case "compare": return compareTable(b);
      case "worked": return worked(b);
      case "steps": return `<ol class="steps">${b.items.map((s) => `<li>${s}</li>`).join("")}</ol>`;
      case "safety": return `<div class="safety"><h4>${b.title || "Stay safe"}</h4><ul>${b.items.map((s) => `<li>${s}</li>`).join("")}</ul></div>`;
      case "graph": return graphPaper(b);
      case "q": return question(b);
      case "lab": return `<div class="lab-card">${b.title ? `<h4 class="sub">${b.title}</h4>` : ""}${renderBlocks(b.blocks)}</div>`;
      default: return "";
    }
  }

  function compareTable(b) {
    const head = b.head ? `<thead><tr>${b.head.map((h) => `<th>${h}</th>`).join("")}</tr></thead>` : "";
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
    const type = b.type ? `<span class="type${/higher/i.test(b.type) ? " ht" : ""}">${b.type}</span>` : "";
    const marks = b.marks ? `<span class="marks">[${b.marks} mark${b.marks > 1 ? "s" : ""}]</span>` : "";
    let body = "";
    if (b.say) body += `<div class="say" data-who="${b.say[0]}">${b.say[1]}</div>`;
    if (b.fig) body += b.fig;
    if (b.mcq) body += `<ul class="mcq" style="--cols:${b.mcq.cols || 2}">${b.mcq.o.map((o, i) => `<li class="${[].concat(b.mcq.c).includes(i) ? "correct" : ""}">${o}</li>`).join("")}</ul>`;
    if (b.fill) {
      body += `<p class="fill">${b.fill.replace(/\[\[(.+?)(?:\|(\d+))?\]\]/g, (_, a, w) => `<span class="blank" style="--w:${w || 26}mm">${ans(a)}</span>`)}</p>`;
      if (b.bank) body += `<div class="bank">${b.bank.map((w) => `<span>${w}</span>`).join("")}</div>`;
    }
    if (b.order) body += `<ol class="order">${b.order.map(([a, text]) => `<li data-a="${a}">${text}</li>`).join("")}</ol>`;
    if (b.match) {
      // Left items numbered, right items lettered; the middle column shows the answer letter.
      const L = b.match.left, R = b.match.right;
      const rows = Math.max(L.length, R.length);
      let grid = "";
      for (let i = 0; i < rows; i += 1) {
        grid += L[i] ? `<div><b style="margin-right:2mm">${i + 1}</b>${L[i][0]}</div>` : "<div style='border:0'></div>";
        grid += `<div class="dot-l"><span class="join">${L[i] ? `→ ${L[i][1]}` : ""}</span></div>`;
        grid += R[i] ? `<div><b style="margin-right:2mm">${String.fromCharCode(65 + i)}</b>${R[i]}</div>` : "<div style='border:0'></div>";
      }
      body += `<div class="match">${grid}</div>`;
    }
    if (b.options) {
      body += `<div class="options-row" style="--cols:${b.options.cols || b.options.items.length}">${b.options.items.map((o) => `<div><b>${o.label}</b>${o.fig ? `<div class="dfig">${o.fig}</div>` : ""}${o.text ? `<div>${o.text}</div>` : ""}${o.choice ? `<div class="circle-choice">${o.choice.map((c, i) => `<span class="${i === o.c ? "correct" : ""}">${c}</span>`).join("")}</div>` : ""}</div>`).join("")}</div>`;
    }
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
    const opener = `<header class="opener"><div class="num"><small>Lesson</small>${pad(l.n)}</div>
      <div><h2>${titleDot(l.title)}</h2><div class="spec">${l.spec}</div></div><div class="big-q">${l.big}</div></header>
      <div class="opener-foot"><div class="goals"><h3>By the end you can</h3><ul>${l.goals.map((g) => `<li>${g}</li>`).join("")}</ul>
      <div class="keywords">${l.keywords.map((k) => `<span>${k}</span>`).join("")}</div></div>
      <div class="online"><div><h3>Slides and simulations</h3><p><strong>Teaching deck, slide${/[–-]/.test(l.deck.slides) ? "s" : ""} ${l.deck.slides}</strong></p><p>${l.deck.text}</p><p class="url">${DECK}/#${l.deck.slides.split(/[–-]/)[0]}</p>${l.deck.sim ? `<p style="margin-top:1.5mm"><strong>${l.deck.sim[0]}</strong></p><p class="url">${l.deck.sim[1]}</p>` : ""}</div></div></div>`;

    const doNow = keep(`${secHead("doNow", l.n === 1 ? "What do you already know?" : "Do now", l.n === 1 ? "From Key Stage 3 and chemistry. Have a go." : "From earlier lessons. No notes!")}
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
    let middle;
    if (ONE) {
      middle = `<div class="cover-part"><b>Lesson ${pad(ONE.n)}</b>${ONE.title}</div>
      <p class="lede">${ONE.big}</p>
      <h2 class="cover-sub">In this lesson you will</h2><ul class="cover-lessons">${ONE.goals.map((g) => `<li>${g}</li>`).join("")}</ul>`;
    } else if (REVIEW) {
      middle = `<div class="cover-part"><b>Unit review</b>After Lesson ${U.lessons.length}</div>
      <p class="lede">Mixed exam practice from the whole unit, a fix-it log, and extension pages for GCSE Physics (separate science) students.</p>`;
    } else {
      middle = `<p class="lede">What is inside an atom, how do we know, and what do unstable nuclei do? ${U.lessons.length} lessons: learn with it in class and revise from it at home.</p>
      <div class="cover-stats"><div><b>${U.lessons.length}</b>lessons</div><div><b>3</b>big questions</div><div><b>2</b>simulations</div></div>`;
    }
    return `<section class="cover"><div class="eyebrow">Year 11 Physics, AQA GCSE, ${ONE ? `Lesson ${ONE.n} of ${U.lessons.length}` : REVIEW ? "Unit review" : "Unit booklet"}</div>
      <h1>Atoms &amp; Nuclear<br>Radiation<span class="dot">.</span></h1>
      ${middle}
      ${answers ? '<div class="edition">Answer edition for teachers and self-marking</div>' : ""}
      <div class="cover-foot">
        <div class="cover-art dfig">${F.figure("hero")}</div>
        <div class="cover-fields"><div>Name<span></span></div><div>Class<span></span></div><div>Teacher<span></span></div><div>Target grade<span></span></div></div>
      </div></section>`;
  }

  function howTo() {
    const items = [
      ["doNow", "Do now", "Quick questions from earlier lessons. Remembering again is what makes it stick."],
      ["learn", "Learn it", "Explanations, diagrams and worked examples. Read this again when you revise."],
      ["try", "Try it", "Practice that builds up: first with support, then on your own, then a challenge."],
      ["lab", "Lab", "Record what you find in a simulation or a model experiment."],
      ["exam", "Exam corner", "AQA-style questions with a tip on how the marks are given."],
      ["revise", "Revise it", "Summary, cover-and-answer questions and an “I can” check to colour in."],
    ];
    const rows = U.lessons.map((l) => `<tr><td>${pad(l.n)}</td><td><strong>${l.title}</strong><br><span class="map-line">${l.mapLine}</span></td><td>${l.deck.slides}</td></tr>`).join("");
    return `<section class="new-page" style="break-before:auto">
      <div class="eyebrow">Start here</div><h2 class="page-title">${titleDot("How this booklet works")}</h2>
      <p class="page-intro">${ONE && ONE.n > 1 ? `This is the booklet for <strong>Lesson ${ONE.n}</strong> of the Atoms and Nuclear Radiation unit. It builds on the lessons before it; the “Do now” questions and the quick answers at the back help you check what you remember.` : "This unit starts from the atoms you met in Key Stage 3 and in chemistry, then asks how we know what is inside them and what happens when a nucleus is unstable."} Keep it: it is your classwork book <em>and</em> your revision guide.</p>
      <div class="legend">${items.map(([k, name, text]) => `<div>${icon(k)}<div><b>${name}</b><p>${text}</p></div></div>`).join("")}</div>
      <div class="key"><strong>Revising at home?</strong> (1) Read the Learn it pages. (2) Cover them and answer the “Cover the page” questions in Revise it. (3) Check with the quick answers at the back. (4) Go through the matching slides in the teaching deck, and try the simulations.</div>
      <h4 class="sub">The route through the unit${ONE ? " (this lesson is highlighted)" : ""}</h4>
      ${ONE ? `<ol class="route-grid">${U.lessons.map((l) => `<li class="${l.n === ONE.n ? "this" : ""}"><b>${pad(l.n)}</b><span>${l.title}${l.n === ONE.n ? `<span class="map-line">${l.mapLine} (slides ${l.deck.slides})</span>` : ""}</span></li>`).join("")}</ol>`
        : `<table class="route"><thead><tr><th>#</th><th>Lesson</th><th>Slides</th></tr></thead><tbody>${rows}</tbody></table>`}
      <p style="margin-top:3mm;font-size:8.8pt;color:#5F5954">Teaching deck: <strong>${DECK}</strong>. Simulations: <strong>panphy.app/simulations/atomic_models.html</strong> and <strong>panphy.app/simulations/nuclear_decay.html</strong></p>
    </section>`;
  }

  function toolkit() {
    const met = U.toolkit.filter((t) => t.lesson <= LAST);
    const tools = met.map((t) => `<div class="tool${t.wide ? " wide" : ""}"><span class="lesson-tag">Lesson ${t.lesson}</span><h4>${t.title}</h4>${t.h}</div>`).join("");
    return `<section class="new-page"><div class="eyebrow">Reference</div><h2 class="page-title">${titleDot("Toolkit")}</h2>
      <p class="page-intro">${ONE && LAST < U.lessons.length ? "The facts and methods you have met so far. " : ""}Learn these: exam questions expect you to recall them without a data sheet.</p>
      <div class="toolkit">${tools}</div></section>`;
  }

  function review() {
    qNum = 0;
    return `<section class="lesson" style="--accent:var(--photon);--accent-t:var(--photon-t)">
      <div class="eyebrow">After Lesson ${U.lessons.length}, at home or in class</div><h2 class="page-title">${titleDot("Unit review")}</h2>
      <p class="page-intro">Mixed questions from the whole unit, like a real exam. Try each question without looking back. Then mark it with your teacher's answers and fill in the “fix it” log.</p>
      ${secHead("exam", "Mixed exam practice", `${U.review.reduce((s, q) => s + (q.marks || 0), 0)} marks, about 50 minutes`)}
      ${U.review.map((q) => question(q)).join("")}
      ${keep(`${secHead("revise", "Fix-it log", "Turn every lost mark into a target.")}
      <table class="fix-log"><thead><tr><th style="width:14mm">Q</th><th>What went wrong?</th><th>The correct physics (or method) is…</th><th style="width:26mm">Lesson to revisit</th></tr></thead>
      <tbody>${"<tr><td></td><td></td><td></td><td></td></tr>".repeat(6)}</tbody></table>`)}</section>`;
  }

  function extension(x) {
    qNum = 0;
    return `<section class="lesson" style="--accent:var(--teal);--accent-t:var(--teal-t)">
      <div class="eyebrow">${x.eyebrow}</div><h2 class="page-title">${titleDot(x.title)}</h2>
      <p class="page-intro">${x.intro}</p>
      ${renderBlocks(x.learn)}${keep(secHead("try", "Check it", "Answers are in the answer edition.") + question(x.questions[0]))}${x.questions.slice(1).map((q) => question(q)).join("")}</section>`;
  }

  function glossary() {
    const words = U.glossary.filter(([, , n]) => (ONE ? n === ONE.n : n <= LAST));
    if (!words.length) return "";
    return `<section class="${ONE ? "tracker-flow" : "new-page"}"><div class="eyebrow">Reference</div><h2 class="page-title">${titleDot(`Key words${ONE ? " from this lesson" : ""}`)}</h2>
      <p class="page-intro">Learn the meaning and spelling. In exams, precise words earn marks: say “nucleus”, not “middle”, and “unstable nucleus”, not “unstable atom”.</p>
      <div class="glossary${ONE ? " one" : ""}">${words.map(([k, v]) => `<p><strong>${k}</strong>: ${v}</p>`).join("")}</div></section>`;
  }

  function tracker() {
    const rows = U.lessons.map((l) => `<tr class="lesson-row"><td colspan="2">${pad(l.n)}: ${l.title}</td></tr>` +
      l.cando.map((c) => `<tr><td>${c}</td><td class="rag-cell"><span class="rag"><i></i><i></i><i></i></span></td></tr>`).join("")).join("");
    return `<section class="new-page"><div class="eyebrow">Finish</div><h2 class="page-title">${titleDot("Progress tracker")}</h2>
      <p class="page-intro">Colour one circle for each statement: <strong>red</strong> = not yet, <strong>amber</strong> = getting there, <strong>green</strong> = I can do this without help. Revisit your reds first.</p>
      <table class="tracker"><thead><tr><th>I can…</th><th>R / A / G</th></tr></thead><tbody>${rows}</tbody></table></section>`;
  }

  function quickAnswers() {
    const list = (arr) => `<ol>${arr.map(([, a]) => `<li>${a}</li>`).join("")}</ol>`;
    return `<section class="${ONE ? "tracker-flow" : "new-page"}"><div class="eyebrow">Check yourself</div><h2 class="page-title">${titleDot("Quick answers")}</h2>
      <p class="page-intro">Answers to the “Do now” and “Cover the page” questions, so you can check yourself when revising. Answers to the longer questions are in the answer edition.</p>
      <div class="quick-answers${ONE ? " one" : ""}">${LESSONS.map((l) => `<div>${ONE ? "" : `<b class="lesson-name">Lesson ${l.n}: ${l.title}</b>`}
        <h4>Do now</h4>${list(l.doNow)}<h4>Cover the page</h4>${list(l.recall)}</div>`).join("")}</div></section>`;
  }

  document.body.insertAdjacentHTML("afterbegin", F.defs());
  const book = document.createElement("main");
  book.className = "book";
  const link = (key, ans) => `?${[key, ans ? "answers" : ""].filter(Boolean).join("&")}`;
  const here = ONE ? `lesson=${ONE.n}` : REVIEW ? "review" : "";
  const nav = [["", "all"], ...U.lessons.map((l) => [`lesson=${l.n}`, String(l.n)]), ["review", "review"]]
    .map(([key, name]) => (key === here ? `<b>${name}</b>` : `<a href="${link(key, answers)}">${name}</a>`)).join(" ");
  const bar = `<div class="screen-bar">Print preview. Booklet: ${nav}. <a href="${link(here, !answers)}">${answers ? "Student edition" : "Answer edition"}</a>. Print with Chrome, A4, headers and footers off</div>`;
  const body = ONE ? cover() + howTo() + lesson(ONE) + toolkit() + glossary() + quickAnswers()
    : REVIEW ? cover() + toolkit() + review() + U.extension.map(extension).join("") + glossary() + tracker()
    : cover() + howTo() + toolkit() + LESSONS.map(lesson).join("") + review() + U.extension.map(extension).join("") + glossary() + tracker() + quickAnswers();
  book.innerHTML = bar + body;
  document.body.appendChild(book);
  document.body.dataset.ready = "1";
})();
