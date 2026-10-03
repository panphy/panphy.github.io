/* Draws the revision sheet for ?topic=<topic title> from ../questions.csv. */
(function () {
  "use strict";

  const { parseCsv, topicsFrom } = window.DoNowRevision;
  const sheet = document.getElementById("sheet");
  const wanted = new URLSearchParams(location.search).get("topic") || "";
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function render(topic) {
    document.title = `AO1 revision - ${topic.title}`;
    const top = element("header", "top");
    const heading = element("div");
    heading.append(element("p", "brand", "Do Now · AO1 revision"), element("h1", "", topic.title));
    const meta = element("p", "meta");
    meta.append(element("b", "", topic.unit), document.createElement("br"),
      `${topic.paper} · ${topic.separate ? "Separate Physics only" : "Combined and Separate"}`, document.createElement("br"),
      `${topic.questions.length} questions`);
    top.append(heading, meta);

    const how = element("p", "how", "Cover the answers. Answer each question out loud or on paper, then check. Tick the ones you know.");

    const table = element("table");
    const columns = element("colgroup");
    for (const name of ["n", "q", "a", "t"]) columns.append(element("col", name));
    const head = element("thead");
    const headRow = element("tr");
    for (const label of ["", "Question", "Answer", "✓"]) headRow.append(element("th", "", label));
    head.append(headRow);
    const body = element("tbody");
    topic.questions.forEach((question, index) => {
      const row = element("tr");
      const questionCell = element("td", "q", question.Question);
      if (question.Image) {
        const image = element("img");
        image.src = `../images/${question.Image}`;
        image.alt = "Diagram for this question";
        questionCell.append(image);
      }
      row.append(element("td", "n", index + 1), questionCell, element("td", "a", question.Answer), element("td", "t"));
      body.append(row);
    });
    table.append(columns, head, body);
    sheet.append(top, how, table);
  }

  fetch("../questions.csv", { cache: "no-cache" })
    .then((response) => { if (!response.ok) throw new Error(response.status); return response.text(); })
    .then((text) => {
      const topic = topicsFrom(parseCsv(text)).find((item) => item.title === wanted);
      if (topic) render(topic);
      else sheet.append(element("p", "missing", wanted ? `No topic called “${wanted}”.` : "Add ?topic=<topic name> to the address."));
    })
    .catch(() => sheet.append(element("p", "missing", "The question bank could not be loaded.")));
})();
