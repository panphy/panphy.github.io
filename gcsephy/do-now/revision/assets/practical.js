/* Draws the method sheet for ?practical=<number, e.g. M3> from ../methods.csv: one card per step, with its diagram. */
(function () {
  "use strict";

  const { parseCsv, practicalsFrom } = window.DoNowRevision;
  const sheet = document.getElementById("sheet");
  const wanted = new URLSearchParams(location.search).get("practical") || "";
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  // A sheet asks for all its diagrams at once and now and then one request fails, so try again before giving up.
  const fetchSvg = (url, attempts = 3) => fetch(url)
    .then((response) => { if (!response.ok) throw new Error(response.status); return response.text(); })
    .catch((error) => { if (attempts > 1) return fetchSvg(url, attempts - 1); throw error; });

  function render(practical) {
    const loading = [];
    document.title = `Required practical - ${practical.title}`;
    const top = element("header", "top");
    const heading = element("div");
    heading.append(element("p", "brand", "Do Now \u00b7 Required practical"), element("h1", "", practical.title));
    const meta = element("p", "meta");
    meta.append(element("b", "", practical.unit), document.createElement("br"),
      `${practical.paper} \u00b7 ${practical.separate ? "Separate Physics only" : "Combined and Separate"}`, document.createElement("br"),
      `${practical.steps.length} steps`);
    top.append(heading, meta);

    const task = element("p", "how", practical.task);
    const steps = element("ol", practical.steps.length <= 4 ? "steps few" : "steps");
    practical.steps.forEach((step, index) => {
      const item = element("li", "step");
      const label = element("div", "step-head");
      label.append(element("span", "step-num", index + 1), element("p", "step-text", step));
      const diagram = element("div", "diagram");
      item.append(label, diagram);
      steps.append(item);
      // Inline SVG, so the page is complete (and prints in full) once the last diagram has arrived.
      loading.push(fetchSvg(practical.images[index])
        .then((svg) => { diagram.innerHTML = svg; })
        .catch(() => { diagram.textContent = `Diagram for step ${index + 1} is missing.`; }));
    });
    sheet.append(top, task, steps);
    if (practical.note) sheet.append(element("p", "how note", `Note: ${practical.note}`));
    return Promise.all(loading);
  }

  fetch("../methods.csv", { cache: "no-cache" })
    .then((response) => { if (!response.ok) throw new Error(response.status); return response.text(); })
    .then((text) => {
      const practical = practicalsFrom(parseCsv(text)).find((item) => item.number === wanted);
      if (practical) return render(practical);
      sheet.append(element("p", "missing", wanted ? `No practical numbered \u201c${wanted}\u201d.` : "Add ?practical=M1 (a practical number) to the address."));
    })
    .catch(() => sheet.append(element("p", "missing", "The practical methods could not be loaded.")));
})();
