/* Renders one-page Prep (homework) sheets from window.PREP (a unit's prep/content.js).
   prep.html?n=2 shows Prep 2, prep.html?n=2&answers its answer edition; with no n, every prep.
   window.PREP = { year, unit, file, preps: [{ lessons, title, subtitle, doNow, questions }] }
     doNow:     [[bank number, question, answer, lines = 1], …]   up to three Do Now bank questions, 1 mark each
     questions: [{ stem, fig, side, cols, q, m, a, lines, parts: [{ q, m, a, lines }] }, …]
       q + m    a question line with its marks; a is the answer, printed over the writing lines
       lines    writing lines below (0 when the answer goes in a blank or ring box)
       side     html (a figure) drawn beside the parts, in grid columns cols (default "1fr 1fr")
   Inline in any text:
     [[answer]], [[answer|30]]            a blank (30 mm wide); the answer edition fills it
     [[answer|first / second / third]]    a blank with its options printed straight after it
     {{one|two*|three}}                   AQA-style ring box; * marks the answer
     [x] / [ ]                            a tick box, ticked in the answer edition when [x] */
(function () {
  "use strict";
  const U = window.PREP;
  const params = new URLSearchParams(location.search);
  const answers = params.has("answers");
  const only = Number(params.get("n")) || 0;
  document.documentElement.dataset.year = U.year;
  if (answers) document.body.classList.add("answers");

  function marks(text) {
    return String(text == null ? "" : text)
      .replace(/\[\[(.+?)(?:\|([^\]]+))?\]\]/g, (_, a, extra) => {
        const width = extra && /^\d+$/.test(extra) ? extra : null;
        const opts = extra && !width ? `<span class="opts">(${extra})</span>` : "";
        return `<span class="blank" style="--w:${width || 24}mm"><span class="ans">${a}</span></span>${opts}`;
      })
      .replace(/\{\{(.+?)\}\}/g, (_, list) => `<span class="ring-box">${list.split("|").map((o) => {
        const right = o.endsWith("*");
        return `<span class="${right ? "correct" : ""}">${right ? o.slice(0, -1) : o}</span>`;
      }).join("")}</span>`)
      .replace(/\[(x| )\]/g, (_, on) => `<span class="check${on === "x" ? " on" : ""}"></span>`);
  }

  const mk = (m) => (m ? `<span class="mk">[${m}]</span>` : "");
  const lines = (n, a) => (n ? `<div class="lines">${"<i></i>".repeat(n)}${a ? `<div class="ans-over">${marks(a)}</div>` : ""}</div>` : "");
  // A question line, its marks and its writing lines; with no lines, a short answer sits after the line.
  const ask = (o) => `<div class="line-q"><span>${marks(o.q)}${!o.lines && o.a ? ` <span class="ans">${marks(o.a)}</span>` : ""}</span>${mk(o.m)}</div>${lines(o.lines, o.a)}`;

  function question(o, n) {
    let body = (o.stem ? `<p class="stem">${marks(o.stem)}</p>` : "") + (o.fig ? `<div class="fig">${marks(o.fig)}</div>` : "");
    if (o.q) body += ask(o);
    if (o.parts) {
      const parts = o.parts.map((p, i) => `<div class="part"><span class="l">${"abcdef"[i]}</span><div>${ask(p)}</div></div>`).join("");
      body += o.side ? `<div class="split" style="--cols:${o.cols || "1fr 1fr"}"><div>${parts}</div><div>${marks(o.side)}</div></div>` : parts;
    }
    return `<div class="q"><span class="n">${n}</span><div class="q-body">${body}</div></div>`;
  }

  const total = (p) => p.doNow.length + p.questions.reduce((s, q) => s + (q.m || 0) + (q.parts || []).reduce((t, x) => t + (x.m || 0), 0), 0);

  function page(p, i) {
    const n = i + 1, out = total(p);
    const label = `Prep ${n} · Lesson${p.lessons.includes("–") ? "s" : ""} ${p.lessons}`;
    if (out !== 10) console.warn(`Prep ${n} is out of ${out}, not 10`);
    const doNow = p.doNow.map(([id, q, a, l], k) => question({ q: `${q}<span class="bank">DN ${id}</span>`, m: 1, a, lines: l == null ? 1 : l }, k + 1)).join("");
    const rest = p.questions.map((q, k) => question(q, p.doNow.length + k + 1)).join("");
    return `<section class="page">
      <div class="run-head"><span>Year ${U.year} · ${U.unit}</span><span>${label}${answers ? " · Answers" : ""}</span></div>
      <div class="top"><div><span class="badge">${label}</span><h1 class="title">${p.title}</h1><p class="subtitle">${p.subtitle}</p></div>
        <div class="score"><span>Score</span><b><i></i>/ ${out}</b></div></div>
      <div class="title-rule"></div>
      <div class="fields"><div>Name <i></i></div><div>Class <i></i></div><div>Due <i></i></div></div>
      <div class="donow"><div class="sec"><h2>Do Now</h2><span class="tag">Remember</span><span class="aside">From earlier lessons · 1 mark each</span></div>${doNow}</div>
      <div class="sec"><h2>Key ideas</h2><span class="tag">Lesson${p.lessons.includes("–") ? "s" : ""} ${p.lessons}</span><span class="aside">Show your working</span></div>
      ${rest}
      <div class="run-foot"><span><b>${U.unit}</b> · Year ${U.year} Prep ${n}</span><span>${answers ? "Answer edition" : "Hand in on the due date"}</span></div>
    </section>`;
  }

  const book = document.createElement("main");
  const nav = U.preps.map((p, i) => `<a href="?n=${i + 1}${answers ? "&answers" : ""}">Prep ${i + 1}</a>`).join("");
  const flip = only ? `?n=${only}${answers ? "" : "&answers"}` : `?${answers ? "" : "answers"}`;
  book.innerHTML = `<div class="screen-bar"><a href="?${answers ? "answers" : ""}">All</a>${nav} · <a href="${flip}">${answers ? "Student edition" : "Answer edition"}</a> · Print with Chrome, A4, headers and footers off</div>` +
    U.preps.map((p, i) => (!only || only === i + 1 ? page(p, i) : "")).join("");
  document.title = only ? `${U.file} Prep ${only}${answers ? " (Answers)" : ""}` : `${U.file} Preps`;
  document.body.appendChild(book);

  // Typeset any maths, flag overflowing pages, then tell the PDF build the page is ready.
  // Spare space at the foot of a page is shared out as taller writing lines (up to 12 px each).
  const ready = () => {
    book.querySelectorAll(".page").forEach((pg) => {
      const last = [...pg.children].filter((c) => !c.matches(".run-head, .run-foot")).pop();
      const spare = () => pg.querySelector(".run-foot").getBoundingClientRect().top - 12 - last.getBoundingClientRect().bottom;
      const rules = pg.querySelectorAll(".lines i");
      const add = Math.min(12, Math.floor(spare() / Math.max(rules.length, 1)));
      if (add > 0) {
        const h = rules[0].getBoundingClientRect().height + add;
        rules.forEach((r) => { r.style.height = `${h}px`; });
        pg.querySelectorAll(".ans-over").forEach((a) => { a.style.lineHeight = `${h}px`; a.style.top = `${h / 2 - 8}px`; });
      }
      if (spare() < -8) pg.classList.add("overflow");
    });
    document.body.dataset.ready = "1";
  };
  const mj = window.MathJax;
  if (mj && mj.startup && mj.startup.promise) mj.startup.promise.then(() => mj.typesetPromise([book])).then(ready, ready);
  else (document.fonts ? document.fonts.ready : Promise.resolve()).then(ready);
})();
