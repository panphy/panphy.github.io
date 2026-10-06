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

  // Superscripts and subscripts. Unicode ones ("m/s²", "R₁") are redrawn as real
  // <sup> and <sub> so they look the same in every font; "_" starts a subscript of
  // letters or digits ("V_p", "R_total"). Superscripts directly followed by subscripts
  // ("⁴₂He") are nuclide notation: drawn stacked, mass number over atomic number, and
  // kept on one line with the symbol.
  const SCRIPTS = /([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+)([₀₁₂₃₄₅₆₇₈₉₊₋]+)([A-Za-z]*)|([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+)|([₀₁₂₃₄₅₆₇₈₉₊₋]+)|_([A-Za-z0-9]+)/g;
  const SUPERSCRIPTS = "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻";
  const SUBSCRIPTS = "₀₁₂₃₄₅₆₇₈₉₊₋";
  const SCRIPT_DIGITS = "0123456789+−";
  const fromScript = (run, alphabet) => Array.from(run, (char) => SCRIPT_DIGITS[alphabet.indexOf(char)]).join("");

  function appendText(node, text) {
    const script = (tag, value) => { const part = document.createElement(tag); part.textContent = value; return part; };
    let done = 0;
    for (const match of text.matchAll(SCRIPTS)) {
      if (match.index > done) node.append(text.slice(done, match.index));
      done = match.index + match[0].length;
      if (match[1]) {
        const numbers = document.createElement("span");
        numbers.className = "nuclide-numbers";
        numbers.append(script("span", fromScript(match[1], SUPERSCRIPTS)), script("span", fromScript(match[2], SUBSCRIPTS)));
        const nuclide = document.createElement("span");
        nuclide.className = "nuclide";
        nuclide.append(numbers, match[3]);
        node.append(nuclide);
      } else if (match[4]) node.append(script("sup", fromScript(match[4], SUPERSCRIPTS)));
      else if (match[5]) node.append(script("sub", fromScript(match[5], SUBSCRIPTS)));
      else node.append(script("sub", match[6]));
    }
    if (done < text.length) node.append(text.slice(done));
  }

  function render(topic) {
    document.title = `AO1 revision - ${topic.title}`;
    const top = element("header", "top");
    const heading = element("div");
    heading.append(element("p", "brand", "Do Now · AO1 revision"), element("h1", "", topic.title));
    const meta = element("p", "meta");
    meta.append(element("b", "", topic.unit), document.createElement("br"),
      `${topic.paper} · ${topic.separate ? "Separate Physics only" : "Combined and Separate"}`, document.createElement("br"),
      `${topic.questions.length} questions`);
    // Priority questions (Target column "7") get a star, so one sheet serves both targets.
    const priority = topic.questions.filter((question) => question.Target === "7").length;
    top.append(heading, meta);

    const how = element("p", "how", "Cover the answers. Answer each question out loud or on paper, then check. Tick the ones you know."
      + (priority ? ` Learn the ${priority} starred (★) questions first.` : ""));

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
      const questionCell = element("td", "q");
      question.Question.split(/\[([^\]]+)\]/).forEach((part, at) => {
        if (at % 2) {
          const mark = element("b", "neg");
          appendText(mark, part);
          questionCell.append(mark);
        } else if (part) appendText(questionCell, part);
      });
      if (question.Image) {
        const image = element("img");
        image.src = `../images/${question.Image}`;
        image.alt = "Diagram for this question";
        questionCell.append(image);
      }
      const answerCell = element("td", "a");
      appendText(answerCell, question.Answer);
      const numberCell = element("td", "n", index + 1);
      if (question.Target === "7") numberCell.append(element("span", "star", "★"));
      row.append(numberCell, questionCell, answerCell, element("td", "t"));
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
