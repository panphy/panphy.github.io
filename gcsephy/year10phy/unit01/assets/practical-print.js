/* Printable A4 worksheet for a required practical, built from assets/practicals.js.
   practical/worksheet.html?rp=<slug> is the student worksheet; add &answers for the
   answer version. Save either one as PDF from Chrome (A4, default margins). */
(function () {
  "use strict";

  const practicals = window.PRACTICALS || [];
  const sub = window.Diagrams.sub;
  const params = new URLSearchParams(window.location.search);
  const practical = practicals.find((item) => item.slug === params.get("rp"));
  const answers = params.has("answers");
  const SITE = "panphy.app/gcsephy/year10phy/unit01/practical";

  if (!practical) {
    document.title = "Practical worksheets | Electric Circuits";
    document.body.innerHTML = `<main class="sheet-index"><h1>Required practical worksheets</h1><ul>${practicals.map((item) => `
      <li><strong>${item.title}</strong> · <a href="?rp=${item.slug}">Worksheet</a> · <a href="?rp=${item.slug}&amp;answers">Answers</a></li>`).join("")}</ul></main>`;
    return;
  }

  const docTitle = `Required practical: ${practical.title}${answers ? " (answers)" : ""}`;
  document.title = docTitle;
  const footer = `Required practical • ${practical.title}${answers ? " • Answers" : ""}  •  `;
  const pageStyle = document.createElement("style");
  pageStyle.textContent = `@page { @bottom-right { content: "${footer}" counter(page); } }`;
  document.head.appendChild(pageStyle);

  const ans = (html) => `<span class="ans">${html}</span>`;
  const h2 = (number, title) => `<h2><span class="num">${number}</span>${sub(title)}</h2>`;
  let questionNumber = 0;

  const tableHtml = (block) => {
    const groups = block.groups
      ? `<tr>${block.groups.map(([label, span]) => `<th colspan="${span}">${label}</th>`).join("")}</tr>`
      : "";
    const head = `<thead>${groups}<tr>${block.columns.map((column) => `<th>${column}</th>`).join("")}</tr></thead>`;
    const body = block.rows.map((row, r) => `<tr>${row.map((cell, c) => {
      if (cell !== null) return `<td>${sub(cell)}</td>`;
      const value = answers ? block.answers[r][c] : null;
      return `<td>${value ? ans(value) : ""}</td>`;
    }).join("")}</tr>`).join("");
    return `<table class="grid-table${block.groups ? " grouped" : ""}">${head}<tbody>${body}</tbody></table>`;
  };

  // Graph paper in millimetres: 2 mm minor squares, 1 cm major squares.
  const graphSvg = (block) => {
    const W = 160, H = block.print.height || 120, L = 12, T = 7;
    const ox = block.origin === "corner" ? 0 : W / 2;
    const oy = block.origin === "corner" ? H : block.origin === "low" ? H - 10 : H / 2;
    const { xPerCm, yPerCm } = block.print;
    const X = (v) => L + ox + (v / xPerCm) * 10;
    const Y = (v) => T + oy - (v / yPerCm) * 10;
    const inside = (x, y) => x >= L - 0.01 && x <= L + W + 0.01 && y >= T - 0.01 && y <= T + H + 0.01;
    let out = "";
    for (let i = 0; i <= W; i += 2) out += `<line class="${i % 10 ? "minor" : "major"}" x1="${L + i}" y1="${T}" x2="${L + i}" y2="${T + H}"/>`;
    for (let j = 0; j <= H; j += 2) out += `<line class="${j % 10 ? "minor" : "major"}" x1="${L}" y1="${T + j}" x2="${L + W}" y2="${T + j}"/>`;
    out += `<line class="axis" x1="${L}" y1="${T + oy}" x2="${L + W}" y2="${T + oy}"/><line class="axis" x1="${L + ox}" y1="${T}" x2="${L + ox}" y2="${T + H}"/>`;
    out += `<text class="axis-label" x="${L + ox + (ox ? 1.5 : 0)}" y="${T - 2}" text-anchor="start">${block.yLabel}</text>`;
    out += block.origin === "corner"
      ? `<text class="axis-label" x="${L + W / 2}" y="${T + H + 11}" text-anchor="middle">${block.xLabel}</text><text class="tick" x="${L - 1.5}" y="${T + H + 4}" text-anchor="end">0</text>`
      : `<text class="axis-label" x="${L + W}" y="${T + H + 6}" text-anchor="end">${block.xLabel}</text>`;

    if (answers) {
      const fmt = (v) => String(Math.round(v * 1000) / 1000).replace("-", "−");
      // Scale labels every 2 cm, counted out from the origin.
      for (let i = ox % 20; i <= W; i += 20) {
        if (i === ox) continue;
        out += `<text class="tick ans-fill" x="${L + i}" y="${T + oy + 4}" text-anchor="middle">${fmt(((i - ox) / 10) * xPerCm)}</text>`;
      }
      for (let j = oy % 20; j <= H; j += 20) {
        if (j === oy) continue;
        out += `<text class="tick ans-fill" x="${L + ox - 1.2}" y="${T + j + 1.2}" text-anchor="end">${fmt(((oy - j) / 10) * yPerCm)}</text>`;
      }
      const ex = block.example;
      const from = ex.from ?? ex.x[0];
      const to = ex.to ?? ex.x[1];
      const pts = [];
      for (let k = 0; k <= 200; k += 1) {
        const v = from + ((to - from) * k) / 200;
        const x = X(v);
        const y = Y(ex.fn(v));
        if (inside(x, y)) pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
      }
      out += `<polyline class="fit" points="${pts.join(" ")}"/>`;
      out += ex.points.map(([a, b]) => {
        const x = X(a);
        const y = Y(b);
        return `<path class="mark" d="M${x - 1.2} ${y - 1.2} L${x + 1.2} ${y + 1.2} M${x - 1.2} ${y + 1.2} L${x + 1.2} ${y - 1.2}"/>`;
      }).join("");
    }
    return `<svg class="graph-paper" viewBox="0 0 ${L + W + 6} ${T + H + 14}" width="${L + W + 6}mm" height="${T + H + 14}mm" role="img" aria-label="Graph grid: ${block.yLabel} against ${block.xLabel}" xmlns="http://www.w3.org/2000/svg">${out}</svg>`;
  };

  const renderQuestion = (block) => {
    questionNumber += 1;
    const marks = block.marks ? ` <span class="marks">[${block.marks} mark${block.marks === 1 ? "" : "s"}]</span>` : "";
    const kind = block.kind ? `<span class="kind">${block.kind}</span> ` : "";
    const answerHtml = answers ? `<div class="ans-text">${/^</.test(block.answer) ? sub(block.answer) : `<p>${sub(block.answer)}</p>`}</div>` : "";
    return `
      <div class="question">
        <p class="prompt">${kind}<b>Q${questionNumber}</b> ${sub(block.prompt)}${marks}</p>
        <div class="space" style="min-height:${block.lines * 8}mm">${answerHtml}</div>
      </div>`;
  };

  const renderBlock = (block, number) => {
    switch (block.type) {
      case "variables":
        return `<section class="block">${h2(number, block.title)}
          <table class="grid-table vars"><thead><tr><th>Variable</th><th>What it is</th><th>How</th></tr></thead>
          <tbody>${block.rows.map(([kind, what, how]) => `<tr><td><b>${kind}</b></td><td>${sub(what)}</td><td>${sub(how)}</td></tr>`).join("")}</tbody></table></section>`;
      case "steps":
        return `<section class="block">${h2(number, block.title)}<ol class="steps">${block.items.map((item) => `<li>${sub(item)}</li>`).join("")}</ol></section>`;
      case "figures":
        return `<div class="figures${block.items.length > 1 ? " two" : ""}">${block.items.join("")}</div>`;
      case "note":
        return `<p class="note">${sub(block.html)}</p>`;
      case "table":
        return `<section class="block">${h2(number, block.title === "Results" ? "Results" : `Results: ${block.title.toLowerCase()}`)}${block.text ? `<p>${sub(block.text)}</p>` : ""}${tableHtml(block)}</section>`;
      case "graph":
        return `<section class="block">${h2(number, block.title)}<p>${sub(block.text)}</p>${graphSvg(block)}</section>`;
      case "question":
        return renderQuestion(block);
      default:
        return "";
    }
  };

  const pages = [];
  const cover = `
    <h1 class="cover-title">Required practical: ${practical.title}${answers ? ' <span class="ans-flag">Answers</span>' : ""}</h1>
    <p class="subtitle">Year 10 GCSE Physics • AQA ${practical.rp}</p>
    <p class="field">Name <span></span></p>
    <p class="field">Class <span></span> Date <span class="short"></span></p>
    <p class="motto">Plan. Measure. Explain.<br>Work in pairs. Read the whole method before you build anything.</p>
    <p class="online">Online version with hints: ${SITE}/${practical.slug}/</p>
    <section class="block">${h2(1, "Aim")}<p>${sub(practical.aim)}</p>
      <p class="equation"><b>${practical.equation.eq}</b><br>${practical.equation.units}</p></section>
    <section class="block">${h2(2, "Apparatus")}<ul class="apparatus">${practical.apparatus.map((item) => `<li>${sub(item)}</li>`).join("")}</ul></section>
    <section class="block">${h2(3, "Safety")}<ul>${practical.safety.map((item) => `<li>${sub(item)}</li>`).join("")}</ul></section>`;
  pages.push(cover);

  practical.parts.forEach((part) => {
    const heading = `<h1><span class="part-label">${part.label}</span>${sub(part.title)}</h1>`;
    let page = `${heading}<p class="subtitle">${part.label} • ${practical.title} • ${sub(part.summary)}</p>`;
    let number = 0;
    part.blocks.forEach((block) => {
      if (block.type === "page") {
        pages.push(page);
        page = heading;
        return;
      }
      if (["variables", "steps", "table", "graph"].includes(block.type)) number += 1;
      page += renderBlock(block, number);
    });
    pages.push(page);
  });

  document.body.innerHTML = `<main class="${answers ? "answers" : ""}">${pages.map((page) => `<article class="sheet">${page}</article>`).join("")}</main>`;
})();
