/* Renderer for the Year 9 workbook. Reads WORKBOOK from content.js and draws one
   A4 sheet per entry in WORKBOOK.pages. See ../README.md for the block types. */
(function () {
  "use strict";
  const W = window.WORKBOOK;

  /* [[]] or [[24]] in any text becomes a blank to write on (width in mm). */
  const fmt = (s) => String(s ?? "").replace(/\[\[(\d*)\]\]/g, (m, w) => `<span class="blank"${w ? ` style="--w:${w}mm"` : ""}></span>`).replace(/→/g, '<span class="ar">→</span>');
  const el = (cls, html, tag = "div") => `<${tag} class="${cls}">${html}</${tag}>`;
  const lines = (n) => (n ? `<div class="lines">${"<i></i>".repeat(n)}</div>` : "");

  function cellHtml(c) {
    if (c && typeof c === "object") return { html: fmt(c.html ?? ""), cls: c.cls || "", span: c.span };
    return { html: fmt(c), cls: "", span: 0 };
  }

  /* Each block type returns an HTML string. */
  const B = {
    case: (b) => `<div class="case"><div class="eyebrow">The case</div><h3>${b.title}</h3>${b.paras.map((p) => `<p>${p}</p>`).join("")}<p class="punch">${b.punch}</p></div>`,
    mission: (b) => `<div class="mission"><div class="eyebrow">${b.title || "Your mission"}</div><ul>${b.items.map((i) => `<li>${i}</li>`).join("")}</ul></div>`,
    task: (b) => `<div class="task"><span class="n">${b.n}</span><h2>${b.title}</h2>${b.tag ? `<span class="tag">${b.tag}</span>` : ""}</div>`,
    p: (b) => `<p${b.cls ? ` class="${b.cls}"` : ""}${b.mb != null ? ` style="margin-bottom:${b.mb}mm"` : ""}>${fmt(b.html)}</p>`,
    q: (b) => `<p class="q"><span class="ql">${b.l}</span>${fmt(b.html)}</p>${lines(b.lines)}`,
    lines: (b) => lines(b.n),
    spacer: (b) => `<div style="height:${b.mm}mm"></div>`,
    h3: (b) => el("h3", fmt(b.html)),
    h4: (b) => el("", fmt(b.html), "h4"),
    eq: (b) => el("eq", fmt(b.html)),
    note: (b) => el("note", fmt(b.html), "p"),

    /* head: column headings; rows: arrays of cells (string, or {html, cls, span}); '' = blank cell to write in. */
    table: (b) => {
      const cols = b.widths ? `<colgroup>${b.widths.map((w) => `<col style="width:${w}">`).join("")}</colgroup>` : "";
      const al = b.align || [];
      const head = b.head ? `<thead><tr>${b.head.map((h, i) => `<th class="${al[i] || ""}">${fmt(h)}</th>`).join("")}</tr></thead>` : "";
      const rows = b.rows.map((r) => `<tr>${r.map((c, i) => {
        const x = cellHtml(c);
        const cls = [al[i] || "", x.cls].filter(Boolean).join(" ");
        return `<td${cls ? ` class="${cls}"` : ""}${x.span ? ` colspan="${x.span}"` : ""}>${x.html}</td>`;
      }).join("")}</tr>`).join("");
      return `<table class="tbl ${b.cls || ""}"${b.rh ? ` style="--rh:${b.rh}mm"` : ""}>${cols}${head}<tbody>${rows}</tbody></table>${b.note ? el("note", fmt(b.note), "p") : ""}`;
    },
    /* Labelled blank rows: navy label column, empty answer column. */
    kv: (b) => `<table class="tbl kv ${b.cls || ""}"${b.rh ? ` style="--rh:${b.rh}mm"` : ""}><colgroup><col style="width:${b.labelW || "34%"}"><col></colgroup><tbody>${b.rows.map((r) => `<tr><td class="k">${fmt(r)}</td><td></td></tr>`).join("")}</tbody></table>`,
    steps: (b) => `<table class="tbl steps"><tbody>${b.items.map((s, i) => `<tr><td>${i + 1}</td><td>${fmt(s)}</td></tr>`).join("")}</tbody></table>`,

    /* Tick-box table. cols 1 = one column of checks; 2 = two side by side.
       head: [criteria heading, ...tick headings]; tickHeads default a tick mark. */
    checks: (b) => {
      const box = '<div class="box-cell"></div>';
      const th = (t) => `<th class="c">${t}</th>`;
      const tick = '<span class="tick">✓</span>';
      if (b.twin) {
        const [l, r] = b.twin;
        const n = Math.max(l.length, r.length);
        const rows = Array.from({ length: n }, (_, i) => `<tr><td>${fmt(l[i] || "")}</td><td class="c">${l[i] ? box : ""}</td><td>${fmt(r[i] || "")}</td><td class="c">${r[i] ? box : ""}</td></tr>`).join("");
        const tw = b.twinW || ["auto", "14.5mm", "auto", "14.5mm"];
        return `<table class="tbl checks twin"><colgroup>${tw.map((w) => `<col style="width:${w}">`).join("")}</colgroup><thead><tr><th>${b.head || "Check"}</th>${th(tick)}<th>${b.head || "Check"}</th>${th(tick)}</tr></thead><tbody>${rows}</tbody></table>`;
      }
      const heads = b.ticks || [tick];
      const w = b.tickW || "16mm";
      const thead = b.head == null ? "" : `<thead><tr><th>${b.head}</th>${heads.map(th).join("")}</tr></thead>`;
      return `<table class="tbl checks ${b.cls || ""}"><colgroup><col>${heads.map((_, i) => `<col style="width:${[].concat(w)[i] || [].concat(w)[0]}">`).join("")}</colgroup>${thead}<tbody>${b.items.map((i) => `<tr><td>${fmt(i)}</td>${heads.map(() => `<td class="c">${box}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    },

    /* kind: 'blue' (default) or 'orange'. */
    box: (b) => `<div class="box ${b.kind || ""}${b.cls ? " " + b.cls : ""}"${b.mb != null ? ` style="margin-bottom:${b.mb}mm"` : ""}>${b.eyebrow ? `<span class="eyebrow">${b.eyebrow}</span>` : ""}${(b.paras || []).map((p) => `<p>${fmt(p)}</p>`).join("")}${b.list ? `<ol>${b.list.map((x) => `<li>${x}</li>`).join("")}</ol>` : ""}</div>`,
    duo: (b) => `<div class="duo">${B.box(b.left)}${B.box(b.right)}</div>`,
    key: (b) => `<div class="key${b.cls ? " " + b.cls : ""}"${b.style ? ` style="${b.style}"` : ""}>${b.label ? `<p class="label">${b.label}</p>` : ""}${b.big.map((x) => `<p class="big">${fmt(x)}</p>`).join("")}${b.small ? `<p class="small">${b.small}</p>` : ""}</div>`,
    /* Two columns of blocks: {cols:'1fr 1fr', left:[…], right:[…]}. */
    split: (b) => `<div class="split${b.cls ? " " + b.cls : ""}" style="--cols:${b.cols || "1fr 1fr"};--gap:${b.gap || 6}mm"><div>${render(b.left)}</div><div>${render(b.right)}</div></div>`,
    /* A blank box to draw or write in, height in mm. */
    draw: (b) => `<div class="draw" style="--h:${b.h}mm"></div>${b.foot ? el("draw-foot", b.foot) : ""}`,
    /* Sentence starters: each has html (with [[w]] blanks) and optional extra lines. */
    starters: (b) => `<div class="starters">${b.items.map((s) => `<div class="s">${fmt(s.html || s)}${s.lines ? lines(s.lines) : ""}</div>`).join("")}</div>`,
    checkpoint: (b) => `<div class="checkpoint"><div class="eyebrow">${b.title}</div>${b.items.map((i) => (typeof i === "string" ? `<div class="item">${fmt(i)}</div>` : `<div class="item">${fmt(i.html)}${lines(i.lines)}</div>`)).join("")}</div>`,
    home: (b) => `<div class="home"><span class="eyebrow">${b.title || "Take it home"}</span>${(b.paras || []).map((p) => `<p>${fmt(p)}</p>`).join("")}${(b.qs || []).map((q) => `<p class="qs"><b>${q[0]}</b> ${fmt(q[1])}</p>${lines(q[2])}`).join("")}${lines(b.lines)}</div>`,
    /* Labelled rules to write on, side by side: {labels:[...]}. */
    fields: (b) => `<div class="fields">${b.labels.map((l) => `<div><span>${l}</span><i></i></div>`).join("")}</div>`,
    html: (b) => b.html,
  };

  function render(blocks) {
    return (blocks || []).map((b) => (typeof b === "string" ? b : B[b.type](b))).join("");
  }

  function lead(l) {
    return `${l.badge ? `<div class="badge">${l.badge}</div>` : ""}<h1 class="title">${l.title}</h1>${l.subtitle ? `<p class="subtitle">${l.subtitle}</p>` : ""}<div class="title-rule"></div>`;
  }

  function page(p, i) {
    const n = i + 1;
    if (p.cover) return coverPage(p.cover);
    const run = p.run || [];
    return `<section class="page${p.lead ? " lead" : ""}" data-page="${n}"><div class="run-head"><span>${run[0] || ""}</span><span>${run[1] || ""}</span></div>${p.lead ? lead(p.lead) : ""}${render(p.blocks)}<div class="run-foot"><span>${W.footer}</span><b>${n}</b></div></section>`;
  }

  function coverPage(c) {
    return `<section class="page cover" data-page="1"><div class="cover-in"><div class="eyebrow">${c.eyebrow}</div><h1 class="head-font">${c.title}</h1><p class="lede">${c.lede}</p><div class="bar"></div><p class="quote">“${c.quote}”</p><p class="quote-by">${c.by}</p></div><div class="cover-fields">${c.fields.map((f) => `<div>${f}<span></span></div>`).join("")}</div><div class="cover-note">${c.note}</div></section>`;
  }

  function build() {
    const bar = `<div class="screen-bar"><span>${W.title}: ${W.pages.length} pages. Print from Chrome as A4, margins none, background graphics on.</span></div>`;
    document.body.innerHTML = bar + `<main class="book">${W.pages.map(page).join("")}</main>`;
    document.title = W.title;
  }

  /* Mark any sheet whose content runs past the footer, so the build can fail loudly. */
  function checkFit() {
    const bad = [];
    document.querySelectorAll(".page:not(.cover)").forEach((pg) => {
      const foot = pg.querySelector(".run-foot").getBoundingClientRect().top;
      let bottom = 0;
      pg.querySelectorAll(":scope > *:not(.run-head):not(.run-foot)").forEach((c) => { bottom = Math.max(bottom, c.getBoundingClientRect().bottom); });
      const limit = foot - 4; /* keep a clear band above the footer */
      if (bottom > limit) { pg.classList.add("overflow"); bad.push(`${pg.dataset.page} (+${((bottom - limit) * 25.4 / 96).toFixed(1)}mm)`); }
    });
    document.documentElement.dataset.overflow = bad.join(", ");
    if (bad.length) console.warn("Pages with overflowing content:", bad.join(", "));
  }

  build();
  const done = () => { checkFit(); document.documentElement.dataset.ready = "1"; };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(done);
})();
