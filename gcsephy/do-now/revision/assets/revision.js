/* Lists every topic in ../questions.csv, grouped by unit, and every required practical in ../methods.csv,
   each with a link to its PDF. Units fold; every visit starts folded. */
(function () {
  "use strict";

  const { parseCsv, topicsFrom, practicalsFrom } = window.DoNowRevision;
  const list = document.getElementById("topics");
  const foldAll = document.getElementById("fold-all");
  const CHEVRON = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>';
  const PRACTICALS = "Required practicals";
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  let topics = [];
  let practicals = [];
  let combinedOnly = false;
  const open = new Set();   // names of the units that are unfolded; kept across redraws
  let sections = [];        // names of the units on screen

  function card(title, href, detail, pdfLabel, separate) {
    const box = element("div", "card");
    const strong = element("strong");
    const link = element("a", "", title);
    link.href = href;
    strong.append(link);
    const info = element("span", "", detail);
    if (separate) info.append(" · ", element("b", "badge", "Separate Physics only"));
    const links = element("small");
    const pdf = element("a", "", pdfLabel);
    pdf.href = href;
    links.append(pdf);
    box.append(strong, info, links);
    return box;
  }

  function section(name, meta, cards) {
    const details = element("details", "unit");
    details.open = open.has(name);
    const summary = element("summary");
    summary.insertAdjacentHTML("beforeend", CHEVRON);
    const heading = element("h2", "", name);
    heading.append(element("span", "", meta));
    summary.append(heading);
    const grid = element("div", "cards");
    grid.append(...cards);
    details.append(summary, grid);
    details.addEventListener("toggle", () => {
      if (details.open) open.add(name); else open.delete(name);
      updateFoldAll();
    });
    list.append(details);
    sections.push(name);
  }

  function updateFoldAll() {
    foldAll.textContent = sections.length && sections.every((name) => open.has(name)) ? "Collapse all" : "Expand all";
  }

  function render() {
    list.textContent = "";
    sections = [];
    const shown = topics.filter((topic) => !(combinedOnly && topic.separate));
    for (const unit of [...new Set(shown.map((topic) => topic.unit))]) {
      const inUnit = shown.filter((topic) => topic.unit === unit);
      section(unit, `${inUnit[0].paper} · ${inUnit.length} topics`, inUnit.map((topic) => card(
        topic.title, `pdf/${encodeURIComponent(topic.file)}`, `${topic.questions.length} questions`, "Questions and answers PDF", topic.separate)));
    }
    const methods = practicals.filter((practical) => !(combinedOnly && practical.separate));
    if (methods.length) {
      section(PRACTICALS, `Method and diagrams · ${methods.length} practicals`, methods.map((practical) => card(
        practical.title, `pdf/${encodeURIComponent(practical.file)}`, `${practical.unit} · ${practical.steps.length} steps`, "Method and diagrams PDF", practical.separate)));
    }
    updateFoldAll();
  }

  document.querySelectorAll("[data-course]").forEach((button) => button.addEventListener("click", () => {
    combinedOnly = button.dataset.course === "combined";
    document.querySelectorAll("[data-course]").forEach((other) => other.setAttribute("aria-pressed", String(other === button)));
    render();
  }));

  foldAll.addEventListener("click", () => {
    const expand = foldAll.textContent === "Expand all";
    for (const name of sections) { if (expand) open.add(name); else open.delete(name); }
    list.querySelectorAll("details").forEach((details) => { details.open = expand; });
    updateFoldAll();
  });

  const load = (url) => fetch(url, { cache: "no-cache" }).then((response) => { if (!response.ok) throw new Error(response.status); return response.text(); });
  Promise.all([load("../questions.csv"), load("../methods.csv")])
    .then(([questions, methods]) => { topics = topicsFrom(parseCsv(questions)); practicals = practicalsFrom(parseCsv(methods)); render(); })
    .catch(() => { list.textContent = "The topic list could not be loaded. Check your connection and reload the page."; });
})();
