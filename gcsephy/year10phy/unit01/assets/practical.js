(function () {
  "use strict";

  const practicals = window.PRACTICALS || [];
  const D = window.Diagrams;
  const sub = D.sub;
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const practicalIndex = pathParts.lastIndexOf("practical");
  const slug = practicalIndex >= 0 ? pathParts[practicalIndex + 1] : "";
  const practical = practicals.find((item) => item.slug === slug);
  const BRAND = '<span>Electric Circuits</span>';
  const PANPHY_FOOTER = `
        <div class="panphy-footer-row">
          <a class="panphy-home-link" href="/" aria-label="Visit the PanPhy Labs landing page"><img src="/assets/favicon.png" width="30" height="30" alt=""></a>
          <p>&copy; 2026 PanPhy Labs</p>
          <p class="panphy-footer-links"><a href="mailto:panphylabs@icloud.com">Contact Me</a><span class="footer-sep">·</span><a href="https://buymeacoffee.com/panphy" target="_blank" rel="noopener noreferrer">Support My Projects</a></p>
        </div>`;

  if (!practical) {
    document.title = "Practical not found | Electric Circuits";
    document.body.innerHTML = '<main class="loading-message"><div><p>That practical could not be found.</p><p><a class="button primary" href="../../">Return to all missions</a></p></div></main>';
    return;
  }

  const STORE_KEY = `y10u1-practical-${practical.slug}`;
  const pdfHref = (file) => `../../${encodeURI(file)}`;
  const description = document.querySelector('meta[name="description"]');
  document.title = `Required practical: ${practical.title} | Electric Circuits`;
  if (description) description.content = practical.intro;

  let questionNumber = 0;

  const cardHeading = (number, title) => `<div class="revision-card-heading"><span>${String(number).padStart(2, "0")}</span><h3>${sub(title)}</h3></div>`;

  const tableHead = (block) => {
    const groups = block.groups
      ? `<tr>${block.groups.map(([label, span]) => `<th scope="colgroup" colspan="${span}">${label}</th>`).join("")}</tr>`
      : "";
    return `<thead>${groups}<tr>${block.columns.map((column) => `<th scope="col">${column}</th>`).join("")}</tr></thead>`;
  };

  const inputTable = (block) => {
    const body = block.rows.map((row, r) => `<tr>${row.map((cell, c) => {
      if (cell !== null) return c === 0 ? `<th scope="row">${sub(cell)}</th>` : `<td>${sub(cell)}</td>`;
      const rowName = row[0] !== null ? row[0] : `row ${r + 1}`;
      const group = block.groups ? `${block.groups[c < block.groups[0][1] ? 0 : 1][0]} ` : "";
      const label = `${block.title}: ${group}${block.columns[c]}, ${rowName}`.replace(/<[^>]+>/g, "");
      return `<td class="input-cell"><input type="text" inputmode="decimal" autocomplete="off" data-save="${block.id}-r${r}-c${c}" aria-label="${label}"></td>`;
    }).join("")}</tr>`).join("");
    return `<table class="data-table practical-table">${tableHead(block)}<tbody>${body}</tbody></table>`;
  };

  const answerTable = (block) => {
    const body = block.rows.map((row, r) => `<tr>${row.map((cell, c) => {
      const value = cell !== null ? cell : block.answers[r][c] ?? "";
      return c === 0 && cell !== null ? `<th scope="row">${sub(value)}</th>` : `<td>${sub(value)}</td>`;
    }).join("")}</tr>`).join("");
    return `<table class="data-table practical-table">${tableHead(block)}<tbody>${body}</tbody></table>`;
  };

  const renderQuestion = (block) => {
    questionNumber += 1;
    const isExam = block.kind === "AQA-style";
    const rows = block.marks >= 5 ? 10 : Math.max(3, block.lines + 1);
    const marks = block.marks ? `<span class="marks">[${block.marks} mark${block.marks === 1 ? "" : "s"}]</span>` : "";
    const id = `${practical.slug}-${block.id}`;
    return `
      <article class="question-card">
        <div class="question-meta">
          <span class="${isExam ? "exam-tag" : "practice-tag"}">${isExam ? "AQA-style" : "Analyse"}</span>${marks}
          <span class="question-count">Q${questionNumber}</span>
        </div>
        <h3>${sub(block.prompt)}</h3>
        <label class="working-area" for="${id}">
          <span class="working-label"><strong>Your answer</strong><small>Saved on this device as you type.</small></span>
          <textarea id="${id}" data-save="${block.id}" rows="${rows}" placeholder="${isExam ? "Write the method as numbered steps…" : "Use your results in your answer…"}"></textarea>
        </label>
        <div class="reveal-row">
          <details class="reveal hint-reveal"><summary><span>Hint</span><b>+</b></summary><div><p>${sub(block.hint)}</p></div></details>
          <details class="reveal answer-reveal"><summary><span>Answer</span><b>✓</b></summary><div>${/^</.test(block.answer) ? sub(block.answer) : `<p>${sub(block.answer)}</p>`}</div></details>
        </div>
      </article>`;
  };

  const renderBlock = (block, number) => {
    switch (block.type) {
      case "variables":
        return `
          <article class="revision-card practical-card">${cardHeading(number, block.title)}
            <div class="table-scroll"><table class="data-table variables-table"><thead><tr><th scope="col">Variable</th><th scope="col">What it is</th><th scope="col">How</th></tr></thead>
            <tbody>${block.rows.map(([kind, what, how]) => `<tr><th scope="row">${kind}</th><td>${sub(what)}</td><td>${sub(how)}</td></tr>`).join("")}</tbody></table></div>
          </article>`;
      case "steps":
        return `
          <article class="revision-card practical-card">${cardHeading(number, block.title)}
            <ol class="practical-steps">${block.items.map((item) => `<li>${sub(item)}</li>`).join("")}</ol>
          </article>`;
      case "figures":
        return `<div class="practical-figures${block.items.length > 1 ? " two" : ""}">${block.items.join("")}</div>`;
      case "note":
        return `<p class="remember-note practical-note">${sub(block.html)}</p>`;
      case "table":
        return `
          <article class="revision-card practical-card">${cardHeading(number, `${block.title}${block.title === "Results" ? "" : ": results"}`)}
            ${block.text ? `<p class="practical-text">${sub(block.text)}</p>` : ""}
            <div class="table-scroll">${inputTable(block)}</div>
            <details class="reveal answer-reveal example-reveal"><summary><span>Example results</span><b>✓</b></summary><div><p>Typical results from this practical. Yours will be different; use your own readings in your answers.</p><div class="table-scroll">${answerTable(block)}</div></div></details>
          </article>`;
      case "graph": {
        const ex = block.example;
        const figure = D.graph({
          w: 380, h: 270, x: ex.x, y: ex.y, xLabel: block.xLabel, yLabel: block.yLabel,
          series: [{ fn: ex.fn, from: ex.from, to: ex.to }, { points: ex.points }],
          caption: ex.caption,
        });
        return `
          <article class="revision-card practical-card">${cardHeading(number, block.title)}
            <p class="practical-text">${sub(block.text)}</p>
            <p class="practical-text muted">Draw it on graph paper or on the grid in the worksheet PDF. Put <strong>${block.yLabel}</strong> on the vertical axis and <strong>${block.xLabel}</strong> on the horizontal axis.</p>
            <details class="reveal answer-reveal example-reveal"><summary><span>Example graph</span><b>✓</b></summary><div>${figure}</div></details>
          </article>`;
      }
      case "question":
        return renderQuestion(block);
      default:
        return "";
    }
  };

  const renderPart = (part, partIndex) => {
    let number = 0;
    const blocks = part.blocks.map((block) => {
      if (["variables", "steps", "table", "graph"].includes(block.type)) number += 1;
      return renderBlock(block, number);
    }).join("");
    return `
      <section class="practical-section${partIndex % 2 ? " alt" : ""}" id="${part.id}">
        <div class="revision-intro">
          <p class="eyebrow dark">${part.label}</p>
          <h2>${sub(part.title)}</h2>
          <p>${sub(part.summary)}</p>
        </div>
        <div class="practical-content">${blocks}</div>
      </section>`;
  };

  const equation = practical.equation;
  const tools = [
    '<a href="#before"><span>01</span><strong>Before you start</strong></a>',
    ...practical.parts.map((part, i) => `<a href="#${part.id}"><span>${String(i + 2).padStart(2, "0")}</span><strong>${part.label}${part.id === "exam" ? "" : `: ${sub(part.title)}`}</strong></a>`),
    `<a href="${pdfHref(practical.pdf)}" target="_blank" rel="noopener"><span>PDF</span><strong>Worksheet</strong></a>`,
  ].join("");
  const missionLinks = practical.missions.map(([missionSlug, label]) => `<a class="workbook-link" href="../../lesson/${missionSlug}/">${label} <span>→</span></a>`).join("");
  const pagination = practical.missions.map(([missionSlug, label], i) => i === 0
    ? `<a href="../../lesson/${missionSlug}/"><span>← Back to the notes</span><strong>${label.split(" · ")[1]}</strong></a>`
    : `<a class="next-link" href="../../lesson/${missionSlug}/"><span>Related notes →</span><strong>${label.split(" · ")[1]}</strong></a>`).join("")
    + (practical.missions.length === 1 ? '<a class="next-link" href="../../exam-zone/"><span>Ready to test yourself? →</span><strong>Enter the Exam Zone</strong></a>' : "");

  document.body.innerHTML = `
    <main class="lesson-page practical-page ${practical.colour}">
      <nav class="topbar lesson-nav" aria-label="Practical navigation">
        <a class="brand" href="../../">${BRAND}</a>
        <a class="nav-pill" href="../../#missions">All missions</a>
      </nav>
      <header class="lesson-hero">
        <div class="lesson-heading">
          <p class="eyebrow"><span>Required practical</span> · ${practical.rp}</p>
          <h1>${practical.heroTitle || practical.title}</h1><p>${practical.intro}</p>
          <span class="spec-chip">${practical.spec}</span>
        </div>
        <div class="lesson-dossier">
          <span class="dossier-icon">${practical.icon}</span><p>Practical brief</p><strong>Measure. Record. Explain.</strong>
          <div class="dossier-rule">${sub(practical.keyRule)}</div>
        </div>
      </header>
      <section class="unlock-strip practical-downloads" aria-label="Download the worksheet">
        <strong>Worksheet PDF</strong>
        <a href="${pdfHref(practical.pdf)}" target="_blank" rel="noopener">Student worksheet <span aria-hidden="true">↓</span></a>
        <a href="${pdfHref(practical.answersPdf)}" target="_blank" rel="noopener">Answers <span aria-hidden="true">↓</span></a>
      </section>
      <nav class="lesson-tools practical-tools" aria-label="Sections of this practical">${tools}</nav>
      <section class="practical-section" id="before">
        <div class="revision-intro">
          <p class="eyebrow dark">Before you start</p>
          <h2>Know the aim.<br>Stay safe.</h2>
          <p>Read the whole method before you build anything. Fill in the tables and questions on this page or in the printed worksheet.</p>
          ${missionLinks}
        </div>
        <div class="practical-content">
          <article class="revision-card practical-card">${cardHeading(1, "Aim")}
            <p class="practical-text">${sub(practical.aim)}</p>
            <div class="equation-block"><span class="eq">${equation.eq}</span><span class="eq-words">${equation.words}</span><span class="eq-units">${equation.units}</span></div>
          </article>
          <div class="practical-pair">
            <article class="revision-card practical-card">${cardHeading(2, "Apparatus")}
              <ul class="practical-list">${practical.apparatus.map((item) => `<li>${sub(item)}</li>`).join("")}</ul>
            </article>
            <article class="revision-card practical-card safety-card">${cardHeading(3, "Safety")}
              <ul class="practical-list">${practical.safety.map((item) => `<li>${sub(item)}</li>`).join("")}</ul>
            </article>
          </div>
        </div>
      </section>
      ${practical.parts.map(renderPart).join("")}
      <section class="practical-save" aria-label="Saved answers">
        <p><strong>Your answers stay on this device.</strong> They are saved in this browser as you type and are not sent anywhere. Download the PDF to hand in a paper copy.</p>
        <button type="button" class="clear-answers">Clear my answers</button>
      </section>
      <nav class="lesson-pagination" aria-label="Related missions">${pagination}</nav>
      <footer class="site-footer">
        <div class="unit-footer-row">
          <div class="brand">${BRAND}</div>
          <p>Follow the charge. Track the energy.</p><a href="#before">Back to top ↑</a>
        </div>${PANPHY_FOOTER}
      </footer>
    </main>`;

  // Save typed readings and answers in this browser only.
  const fields = Array.from(document.querySelectorAll("[data-save]"));
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || "{}") || {}; } catch (e) { saved = {}; }
  fields.forEach((field) => {
    if (typeof saved[field.dataset.save] === "string") field.value = saved[field.dataset.save];
    field.addEventListener("input", () => {
      if (field.value) saved[field.dataset.save] = field.value;
      else delete saved[field.dataset.save];
      try { localStorage.setItem(STORE_KEY, JSON.stringify(saved)); } catch (e) { /* storage unavailable */ }
    });
  });

  document.querySelector(".clear-answers").addEventListener("click", () => {
    if (!window.confirm("Clear all your readings and answers for this practical? This cannot be undone.")) return;
    saved = {};
    fields.forEach((field) => { field.value = ""; });
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* storage unavailable */ }
  });

  // The page is built after load, so jump to #part-a / #part-b once it exists.
  if (window.location.hash) {
    const target = document.getElementById(window.location.hash.slice(1));
    if (target) requestAnimationFrame(() => target.scrollIntoView({ behavior: "instant", block: "start" }));
  }
})();
