/* Lists every topic in ../questions.csv, grouped by unit, with a link to its PDF. */
(function () {
  "use strict";

  const { parseCsv, topicsFrom } = window.DoNowRevision;
  const list = document.getElementById("topics");
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  let topics = [];
  let combinedOnly = false;

  function render() {
    list.textContent = "";
    const shown = topics.filter((topic) => !(combinedOnly && topic.separate));
    for (const unit of [...new Set(shown.map((topic) => topic.unit))]) {
      const inUnit = shown.filter((topic) => topic.unit === unit);
      const heading = element("h2", "", unit);
      heading.append(element("span", "", `${inUnit[0].paper} · ${inUnit.length} topics`));
      const cards = element("div", "cards");
      for (const topic of inUnit) {
        const href = `pdf/${encodeURIComponent(topic.file)}`;
        const card = element("div", "card");
        const title = element("strong");
        const titleLink = element("a", "", topic.title);
        titleLink.href = href;
        title.append(titleLink);
        const detail = element("span", "", `${topic.questions.length} questions`);
        if (topic.separate) detail.append(" · ", element("b", "badge", "Separate Physics only"));
        const links = element("small");
        const pdf = element("a", "", "Questions and answers PDF");
        pdf.href = href;
        links.append(pdf);
        card.append(title, detail, links);
        cards.append(card);
      }
      list.append(heading, cards);
    }
  }

  document.querySelectorAll("[data-course]").forEach((button) => button.addEventListener("click", () => {
    combinedOnly = button.dataset.course === "combined";
    document.querySelectorAll("[data-course]").forEach((other) => other.setAttribute("aria-pressed", String(other === button)));
    render();
  }));

  fetch("../questions.csv", { cache: "no-cache" })
    .then((response) => { if (!response.ok) throw new Error(response.status); return response.text(); })
    .then((text) => { topics = topicsFrom(parseCsv(text)); render(); })
    .catch(() => { list.textContent = "The topic list could not be loaded. Check your connection and reload the page."; });
})();
