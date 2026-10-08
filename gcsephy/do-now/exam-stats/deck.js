/* Exam statistics deck. Every slide is drawn from the CSV files in this folder,
   so adding a year's papers to marks.csv (and facts.csv) updates the deck:

     marks.csv      one row per question part: marks, recall (AO1) marks, sections
     sections.csv   specification section -> unit and topic
     facts.csv      facts asked in more than one series, with the series
     practicals.csv required practical number -> name

   Once the slides exist, the shared deck script takes over the navigation. */
(async () => {
  "use strict";

  const deck = document.getElementById("deck");
  const MONTHS = { "06": "June", "11": "Nov" };
  const UNIT_ORDER = ["Energy", "Electricity", "Particle model of matter", "Atomic structure", "Forces", "Waves", "Magnetism and electromagnetism", "Space physics"];
  // One topic-by-topic slide for each group of units: [slide title, heading, units].
  const GROUPS = [
    ["Energy and electricity", "Energy and <em>electricity.</em>", ["Energy", "Electricity"]],
    ["Particles and atoms", "Particles and <em>atoms.</em>", ["Particle model of matter", "Atomic structure"]],
    ["Forces", "<em>Forces.</em>", ["Forces"]],
    ["Waves, magnetism and space", "Waves, magnetism, <em>space.</em>", ["Waves", "Magnetism and electromagnetism", "Space physics"]],
  ];
  const ACCENTS = ["a-hi", "a-hot", "a-cyan", "a-violet"];

  // RFC 4180 parser: quoted fields may hold commas, doubled quotes and newlines.
  function parseCsv(text) {
    const rows = [];
    let row = [], field = "", quoted = false;
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
        } else field += c;
      } else if (c === '"') quoted = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else field += c;
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    const header = rows.shift().map((h) => h.trim());
    return rows.map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] || "").trim()])));
  }

  async function load(name) {
    const response = await fetch(name, { cache: "no-cache" });
    if (!response.ok) throw new Error(`${name}: ${response.status}`);
    return parseCsv(await response.text());
  }

  function el(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.append(...[].concat(content));
    return node;
  }

  const sum = (items, value) => items.reduce((total, item) => total + value(item), 0);
  const list = (cell) => (cell ? cell.split(";").map((item) => item.trim()).filter(Boolean) : []);
  const seriesName = (series) => `${MONTHS[series.slice(5)] || ""} ${series.slice(0, 4)}`.trim();
  const whole = (value) => String(Math.round(value));
  const rate = (value) => value.toFixed(1);

  function slide(accent, title, eyebrow, heading, tag) {
    const section = el("section", `slide ${accent}`);
    section.dataset.title = title;
    if (eyebrow) section.append(el("p", "eyebrow", eyebrow));
    if (heading) {
      const h2 = el("h2");
      h2.innerHTML = heading;
      section.append(h2);
    }
    const foot = el("div", "slide-foot", [el("span", "tag", tag || title), document.createElement("span")]);
    foot.lastChild.setAttribute("data-page", "");
    section.foot = foot;
    return section;
  }
  const finish = (section) => { section.append(section.foot); deck.append(section); };

  function build(marks, sections, facts, practicals) {
    const series = [...new Set(marks.map((part) => part.Series))].sort();
    const papers = new Set(marks.map((part) => `${part.Series} ${part.Paper}`));
    const isPhysics = (part) => part.Paper.startsWith("8463");
    for (const part of marks) {
      part.marks = Number(part.Marks) || 0;
      part.recall = Number(part.Recall) || 0;
    }

    // Marks available in each series: Separate-only topics can appear only in the Physics papers.
    const available = { Combined: {}, Separate: {} };
    for (const name of series) {
      const sat = marks.filter((part) => part.Series === name);
      available.Combined[name] = sum(sat, (part) => part.marks);
      available.Separate[name] = sum(sat.filter(isPhysics), (part) => part.marks);
    }

    // A section belongs to the topic with the longest matching reference.
    function topicOf(reference) {
      let best = null;
      for (const section of sections) {
        if ((reference === section.Section || reference.startsWith(`${section.Section}.`)) && (!best || section.Section.length > best.Section.length)) best = section;
      }
      return best;
    }
    const topics = new Map();
    for (const section of sections) {
      if (!topics.has(section.Topic)) {
        topics.set(section.Topic, { name: section.Topic, unit: section.Unit, separate: section.Course === "Separate", recall: {}, all: {} });
      }
    }
    for (const part of marks) {
      const references = list(part.Sections);
      for (const reference of references) {
        const match = topicOf(reference);
        if (!match) continue;
        const topic = topics.get(match.Topic);
        // A part that covers several sections shares its marks equally between them.
        topic.recall[part.Series] = (topic.recall[part.Series] || 0) + part.recall / references.length;
        topic.all[part.Series] = (topic.all[part.Series] || 0) + part.marks / references.length;
      }
    }
    for (const topic of topics.values()) {
      const pool = available[topic.separate ? "Separate" : "Combined"];
      const offered = sum(series, (name) => pool[name]);
      topic.recallMarks = sum(series, (name) => topic.recall[name] || 0);
      topic.rate = offered ? topic.recallMarks / offered * 100 : 0;
      topic.seriesAsked = series.filter((name) => (topic.recall[name] || 0) >= 0.5).length;
    }
    const ranked = [...topics.values()].sort((a, b) => b.rate - a.rate);
    const topRate = ranked.length ? ranked[0].rate : 1;

    const totalMarks = sum(marks, (part) => part.marks);
    const recallMarks = sum(marks, (part) => part.recall);
    const equationMarks = sum(marks.filter((part) => part.Equation === "1"), (part) => part.marks);
    const span = `${seriesName(series[0])} to ${seriesName(series[series.length - 1])}`;
    const topicName = (topic) => {
      const name = el("span", "name", topic.name);
      if (topic.separate) name.append(el("span", "sep", "S"));
      return name;
    };
    const separateNote = () => {
      const note = el("p", "note");
      note.append(el("span", "sep", "S"), " Separate Physics only: measured against the Physics papers alone.");
      note.firstChild.style.marginLeft = "0";
      return note;
    };

    deck.textContent = "";

    // 1 Title
    {
      const section = slide("dark a-hi", "Exam statistics", "", "", "Do Now · exam statistics");
      const eyebrow = el("p", "eyebrow");
      eyebrow.append(el("span", "on", "Do Now"), " · exam statistics");
      const heading = el("h1");
      heading.innerHTML = "What the<br>papers <em>ask.</em>";
      const left = el("div", "", [eyebrow, heading,
        el("p", "lead", `Where the recall marks were in AQA GCSE Physics and Combined Science: Trilogy Higher papers, ${span}.`)]);
      const figure = (value, label, big) => el("div", `figure${big ? " big" : ""}`, [el("b", "", value), el("span", "", label)]);
      const right = el("div", "figures", [
        figure(`${Math.round(recallMarks / totalMarks * 100)}%`, "of all marks are for recall", true),
        figure(String(papers.size), "papers counted"),
        figure(totalMarks.toLocaleString("en-GB"), "marks counted"),
      ]);
      section.append(el("div", "hero", [left, right]));
      finish(section);
    }

    // 2 How the marks were counted
    {
      const section = slide("a-hi", "How we counted", "The method", "Counted from the <em>mark schemes.</em>");
      const points = el("ul", "points small");
      const point = (html) => { const item = el("li"); item.innerHTML = html; points.append(item); };
      point(`<b>${papers.size} Higher papers</b> in ${series.length} exam series: Physics (8463) and Combined Science: Trilogy (8464), Papers 1 and 2.`);
      point("AQA's mark schemes label every question part with its <b>assessment objective</b> and its <b>specification section</b>. We used those labels, not our own judgement.");
      point("<b>Recall marks</b> are the marks labelled AO1: stating, naming, defining and describing what you have learnt.");
      point(`We left out the ${Math.round(equationMarks)} marks for writing down an equation, because <b>the equations sheet is provided</b> in the exam.`);
      point("A part that covers several sections shares its marks equally between them.");
      section.append(el("div", "stack", [points, el("div", "remember", "Six series is a small sample, and AQA covers the specification over several years. A quiet topic is not a safe topic to skip.")]));
      finish(section);
    }

    // 3 Recall share in each series
    {
      const section = slide("a-hi", "Recall each year", "Every series", "About a third, <em>every year.</em>");
      const key = el("div", "key", [
        el("span", "", [el("i"), "Recall"]),
        el("span", "", [el("i", "third"), "Writing down an equation"]),
        el("span", "", [el("i", "rest"), "Calculating, applying and analysing"]),
      ]);
      const bars = el("div", "bars");
      bars.style.setProperty("--label", "210px");
      for (const name of series) {
        const sat = marks.filter((part) => part.Series === name);
        const total = sum(sat, (part) => part.marks);
        const recall = sum(sat, (part) => part.recall) / total * 100;
        const equation = sum(sat.filter((part) => part.Equation === "1"), (part) => part.marks) / total * 100;
        const stacked = el("div", "stacked", [el("i", "", `${Math.round(recall)}%`), el("i", "third", ""), el("i", "rest", `${Math.round(100 - recall - equation)}%`)]);
        stacked.children[0].style.width = `${recall}%`;
        stacked.children[1].style.width = `${equation}%`;
        stacked.children[2].style.flex = "1";
        bars.append(el("div", "bar-row", [el("span", "name", seriesName(name)), stacked]));
      }
      section.append(key, bars, el("p", "note", "Share of all the marks in the four Higher papers of each series. Recall questions are the ones Do Now practises."));
      finish(section);
    }

    // 4 Units, in the Physics and the Trilogy papers
    {
      const section = slide("a-hi", "Recall by unit", "By unit", "Where the recall <em>marks are.</em>");
      const key = el("div", "key", [el("span", "", [el("i"), "Physics papers"]), el("span", "", [el("i", "second"), "Trilogy papers"])]);
      const unitRate = (unit, physics) => {
        const sat = marks.filter((part) => isPhysics(part) === physics);
        let recall = 0;
        for (const part of sat) {
          const references = list(part.Sections);
          for (const reference of references) {
            const match = topicOf(reference);
            if (match && match.Unit === unit) recall += part.recall / references.length;
          }
        }
        return recall / sum(sat, (part) => part.marks) * 100;
      };
      const rows = UNIT_ORDER.map((unit) => ({ unit, physics: unitRate(unit, true), trilogy: unitRate(unit, false) }));
      const most = Math.max(...rows.map((row) => Math.max(row.physics, row.trilogy)));
      const bars = el("div", "bars pair");
      bars.style.setProperty("--label", "470px");
      for (const row of rows) {
        const track = (value, second) => {
          const bar = el("i", second ? "second" : "");
          bar.style.width = `${value / most * 82}%`;
          return el("div", "track", [bar, el("b", "", value ? rate(value) : "not examined")]);
        };
        bars.append(el("div", "bar-row", [el("span", "name", row.unit), el("div", "", [track(row.physics, false), track(row.trilogy, true)])]));
      }
      section.append(key, bars, el("p", "note", "Recall marks in every 100 marks of the papers. Space physics is examined in the Physics papers only."));
      finish(section);
    }

    // 5 and 6 The topics with the most and the fewest recall marks
    const rankSlide = (accent, title, eyebrow, heading, chosen, note) => {
      const section = slide(accent, title, eyebrow, heading);
      const bars = el("div", "bars");
      for (const topic of chosen) {
        const bar = el("i");
        bar.style.width = `${topic.rate / topRate * 86}%`;
        const name = topicName(topic);
        bars.append(el("div", "bar-row", [name, el("div", "track", [bar, el("b", "", rate(topic.rate))])]));
      }
      section.append(bars, el("div", "", [el("p", "note", note), separateNote()]));
      finish(section);
    };
    rankSlide("a-hi", "Most recall marks", "Top twelve topics", "Most recall <em>marks.</em>", ranked.slice(0, 12),
      "Recall marks in every 100 marks of the papers the topic can appear in.");
    rankSlide("a-hot", "Fewest recall marks", "Bottom twelve topics", "Fewest recall <em>marks.</em>", ranked.slice(-12),
      "Bars use the same scale as the top twelve. Several of these topics are examined mainly through calculations.");

    // 7 to 10 Each topic, series by series
    const peak = Math.max(1, ...[...topics.values()].flatMap((topic) => series.map((name) => topic.recall[name] || 0)));
    GROUPS.forEach(([title, heading, units], at) => {
      const section = slide(ACCENTS[at % ACCENTS.length], title, "Topic by topic", heading);
      const grid = el("div", "grid");
      grid.style.setProperty("--series", series.length);
      const head = el("div", "grid-row head", [el("span", "name", "Recall marks in each series")]);
      for (const name of series) head.append(el("span", "", seriesName(name)));
      head.append(el("span", "", "In every 100 marks"));
      grid.append(head);
      for (const unit of units) {
        if (units.length > 1) grid.append(el("div", "grid-row unit", [el("span", "name", unit)]));
        for (const topic of [...topics.values()].filter((item) => item.unit === unit)) {
          const row = el("div", "grid-row", [topicName(topic)]);
          for (const name of series) {
            const value = topic.recall[name] || 0;
            const cell = el("span", value >= 0.5 ? "cell" : "cell none", whole(value));
            if (value >= 0.5) cell.style.background = `color-mix(in srgb, var(--accent) ${Math.round(18 + 82 * Math.min(1, value / peak))}%, var(--card))`;
            row.append(cell);
          }
          const bar = el("i");
          bar.style.width = `${topic.rate / topRate * 70}%`;
          row.append(el("div", "track", [bar, el("b", "", rate(topic.rate))]));
          grid.append(row);
        }
      }
      grid.style.setProperty("--cell", grid.children.length > 15 ? "28px" : "34px");
      section.append(grid, separateNote());
      finish(section);
    });

    // Facts asked in more than one series
    const known = facts.map((fact) => ({ ...fact, asked: list(fact.Series).filter((name) => series.includes(name)) }))
      .filter((fact) => fact.asked.length > 1)
      .sort((a, b) => b.asked.length - a.asked.length);
    const perSlide = Math.ceil(known.length / Math.max(1, Math.ceil(known.length / 16)));
    for (let from = 0; from < known.length; from += perSlide) {
      const first = from === 0;
      const section = slide(first ? "a-hi" : "a-hot", first ? "Asked again and again" : "Asked more than once",
        "The same facts come back", first ? "Asked again <em>and again.</em>" : "Asked more <em>than once.</em>");
      const grid = el("div", "grid");
      grid.style.setProperty("--series", series.length);
      grid.style.setProperty("--label", "680px");
      const head = el("div", "grid-row head", [el("span", "name", "A recall question on…")]);
      for (const name of series) head.append(el("span", "", seriesName(name)));
      head.append(el("span", "", "Series"));
      grid.append(head);
      for (const fact of known.slice(from, from + perSlide)) {
        const name = el("span", "name", fact.Fact);
        if (fact.Course === "Separate") name.append(el("span", "sep", "S"));
        const row = el("div", "grid-row", [name]);
        for (const item of series) row.append(el("span", fact.asked.includes(item) ? "dot on" : "dot"));
        row.append(el("span", "total", `${fact.asked.length} of ${series.length}`));
        grid.append(row);
      }
      section.append(grid, el("p", "note", "Chosen by reading the recall questions in every paper. The wording changes; the fact does not."));
      finish(section);
    }

    // Required practicals
    {
      const names = new Map(practicals.map((practical) => [practical.Number, practical.Practical]));
      const order = [...new Set(practicals.map((practical) => practical.Practical))];
      const tagged = new Map(order.map((name) => [name, {}]));
      for (const part of marks) {
        for (const number of list(part.Practicals)) {
          const record = tagged.get(names.get(number));
          if (record) record[part.Series] = (record[part.Series] || 0) + part.marks;
        }
      }
      const most = Math.max(1, ...[...tagged.values()].flatMap((record) => Object.values(record)));
      const methods = marks.filter((part) => part.Levels === "1" && list(part.Practicals).length).length;
      const section = slide("a-cyan", "Required practicals", "Required practicals", "Practicals earn <em>marks too.</em>");
      const grid = el("div", "grid");
      grid.style.setProperty("--series", series.length);
      const head = el("div", "grid-row head", [el("span", "name", "Marks on each practical")]);
      for (const name of series) head.append(el("span", "", seriesName(name)));
      head.append(el("span", "", "Total"));
      grid.append(head);
      for (const [name, record] of tagged) {
        const row = el("div", "grid-row", [el("span", "name", name)]);
        for (const item of series) {
          const value = record[item] || 0;
          const cell = el("span", value ? "cell" : "cell none", whole(value));
          if (value) cell.style.background = `color-mix(in srgb, var(--accent) ${Math.round(18 + 82 * value / most)}%, var(--card))`;
          row.append(cell);
        }
        row.append(el("span", "total", `${whole(sum(series, (item) => record[item] || 0))} marks`));
        grid.append(row);
      }
      section.append(grid, el("p", "note", `All marks, not only recall, on questions AQA labelled with a required practical, across the Physics and Trilogy papers. ${methods} of them were extended "describe a method" questions, worth 4 to 6 marks each. Some practical questions carry no label, so these are minimum figures.`));
      finish(section);
    }

    // What to do with it
    {
      const section = slide("a-hi", "How to use this", "So what?", "Use it to <em>prioritise.</em>");
      const card = (accent, title, items) => {
        const points = el("ul", "points");
        for (const item of items) points.append(el("li", "", item));
        return el("div", `card ${accent}`, [el("h3", "", title), points]);
      };
      const cards = el("div", "row two fill", [
        card("a-hi", "Students", [
          "Learn the Target 7 questions first: they follow these figures.",
          "Know the repeated facts word for word.",
          "Then widen to the whole bank. Every topic can come up.",
        ]),
        card("a-hot", "Teachers", [
          "Give starter time to the topics with the most recall marks.",
          "Bring the repeated facts back often.",
          "Rehearse the practical methods: they are asked as long answers.",
        ]),
      ]);
      cards.querySelectorAll("h3").forEach((heading) => { heading.style.marginBottom = "18px"; });
      const links = el("div", "unlocks");
      const link = (href, text) => { const a = el("a", "", text); a.href = href; return a; };
      links.append(link("../", "Open Do Now"), link("../revision/", "Revision sheets"));
      links.style.marginTop = "0";
      section.append(el("div", "stack", [cards, links]));
      finish(section);
    }
  }

  try {
    deck.append(el("p", "status", "Loading the figures…"));
    const [marks, sections, facts, practicals] = await Promise.all(["marks.csv", "sections.csv", "facts.csv", "practicals.csv"].map(load));
    build(marks, sections, facts, practicals);
  } catch (error) {
    deck.textContent = "";
    const section = el("section", "slide a-hi", [el("p", "status", "The figures could not be loaded. Check your connection and reload.")]);
    section.dataset.title = "Exam statistics";
    deck.append(section);
  }

  // The shared script reads the slides as soon as it runs, so it is added last.
  const script = document.createElement("script");
  script.src = "/gcsephy/decks/assets/companion-deck.js";
  document.body.append(script);
})();
