/* Exam statistics deck. Every slide is drawn from the CSV files in this folder,
   so adding a year's papers to marks.csv (and facts.csv) updates the deck:

     marks.csv      one row per question part: marks, recall (AO1) marks, sections
     corrections.csv parts whose section is corrected, or that AQA discounted
     sections.csv   specification section -> unit and topic
     facts.csv      one row for each time a repeated fact was asked
     practicals.csv required practical number -> name

   Once the slides exist, the shared deck script takes over the navigation. */
(async () => {
  "use strict";

  const deck = document.getElementById("deck");
  const MONTHS = { "06": "June", "11": "Nov" };
  const UNIT_ORDER = ["Energy", "Electricity", "Particle model of matter", "Atomic structure", "Forces", "Waves", "Magnetism and electromagnetism", "Space physics"];
  // One topic-by-topic slide for each group of units: [units, slide title, heading]. A course
  // without Space physics uses the second title and heading.
  const GROUPS = [
    [["Energy", "Electricity"], "Energy and electricity", "Energy and <em>electricity.</em>"],
    [["Particle model of matter", "Atomic structure"], "Particles and atoms", "Particles and <em>atoms.</em>"],
    [["Forces"], "Forces", "<em>Forces.</em>"],
    [["Waves", "Magnetism and electromagnetism", "Space physics"], "Waves, magnetism and space", "Waves, magnetism, <em>space.</em>", "Waves and magnetism", "Waves and <em>magnetism.</em>"],
  ];
  // The deck shows one course at a time: ?course=physics or ?course=trilogy.
  const COURSES = {
    physics: { code: "8463", name: "Physics", full: "GCSE Physics (8463)", papers: "Physics (8463) Higher papers", other: "trilogy" },
    trilogy: { code: "8464", name: "Trilogy", full: "Combined Science: Trilogy (8464)", papers: "Trilogy (8464) Physics Higher papers", other: "physics" },
  };
  const COURSE_KEY = "do-now-exam-stats-course";

  function chosenCourse() {
    const asked = new URLSearchParams(location.search).get("course");
    let saved = null;
    try { saved = localStorage.getItem(COURSE_KEY); } catch (error) { /* storage unavailable */ }
    const key = COURSES[asked] ? asked : COURSES[saved] ? saved : "physics";
    try { localStorage.setItem(COURSE_KEY, key); } catch (error) { /* ignore */ }
    document.querySelectorAll("[data-course]").forEach((link) => {
      if (link.dataset.course === key) link.setAttribute("aria-current", "true"); else link.removeAttribute("aria-current");
    });
    return key;
  }
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

  function build(allMarks, sections, facts, practicals, corrections, courseKey) {
    const course = COURSES[courseKey];
    const other = COURSES[course.other];
    const isTrilogy = courseKey === "trilogy";
    const corrected = new Map(corrections.map((row) => [`${row.Series} ${row.Paper} ${row.Part}`, row]));
    for (const part of allMarks) {
      part.marks = Number(part.Marks) || 0;
      part.recall = Number(part.Recall) || 0;
      // marks.csv keeps what the mark scheme prints; corrections.csv says where that is not used as it stands.
      const correction = corrected.get(`${part.Series} ${part.Paper} ${part.Part}`);
      if (correction && correction.Sections) part.Sections = correction.Sections;
      part.discounted = Boolean(correction && correction.Status === "Discounted");
    }
    const series = [...new Set(allMarks.map((part) => part.Series))].sort();
    // Everything except the repeated facts is counted from this course's own papers.
    const marks = allMarks.filter((part) => part.Paper.startsWith(course.code));
    const papers = new Set(marks.map((part) => `${part.Series} ${part.Paper}`));
    const totalMarks = sum(marks, (part) => part.marks);
    const recallMarks = sum(marks, (part) => part.recall);
    const equationMarks = sum(marks.filter((part) => part.Equation === "1"), (part) => part.marks);
    const span = `${seriesName(series[0])} to ${seriesName(series[series.length - 1])}`;

    // A section belongs to the topic with the longest matching reference.
    function topicOf(reference) {
      let best = null;
      for (const section of sections) {
        if ((reference === section.Section || reference.startsWith(`${section.Section}.`)) && (!best || section.Section.length > best.Section.length)) best = section;
      }
      return best;
    }
    // Separate Physics topics are not examined in the Trilogy papers, so that view leaves them out.
    const topics = new Map();
    for (const section of sections) {
      const separate = section.Course === "Separate";
      if ((isTrilogy && separate) || topics.has(section.Topic)) continue;
      topics.set(section.Topic, { name: section.Topic, unit: section.Unit, separate, recall: {}, recallMarks: 0 });
    }
    const units = UNIT_ORDER.filter((unit) => [...topics.values()].some((topic) => topic.unit === unit));
    for (const part of marks) {
      const references = list(part.Sections);
      for (const reference of references) {
        const match = topicOf(reference);
        const topic = match && topics.get(match.Topic);
        if (!topic) continue;
        // A part that covers several sections shares its marks equally between them.
        topic.recall[part.Series] = (topic.recall[part.Series] || 0) + part.recall / references.length;
        topic.recallMarks += part.recall / references.length;
      }
    }
    // A topic's rate is its recall marks in every 100 marks of the course's papers.
    for (const topic of topics.values()) topic.rate = totalMarks ? topic.recallMarks / totalMarks * 100 : 0;
    const ranked = [...topics.values()].sort((a, b) => b.rate - a.rate);
    const topRate = Math.max(0.1, ranked.length ? ranked[0].rate : 0);

    const topicName = (topic) => {
      const name = el("span", "name", topic.name);
      if (topic.separate) name.append(el("span", "sep", "S"));
      return name;
    };
    const perHundred = `Recall marks in every 100 marks of the ${course.papers}.`;
    const separateNote = () => {
      const note = el("p", "note");
      note.append(el("span", "sep", "S"), " Separate Physics only: not examined in the Trilogy papers.");
      note.firstChild.style.marginLeft = "0";
      return note;
    };
    const notes = (text) => el("div", "", isTrilogy ? [el("p", "note", text)] : [el("p", "note", text), separateNote()]);
    const courseLink = (key, text) => { const a = el("a", "", text); a.href = `?course=${key}`; return a; };

    document.title = `Exam statistics: ${course.name} · Do Now`;
    document.body.dataset.deckTitle = `Exam statistics: ${course.name}`;
    deck.textContent = "";

    // Title
    {
      const section = slide("dark a-hi", "Exam statistics", "", "", `Exam statistics · ${course.name}`);
      const eyebrow = el("p", "eyebrow");
      eyebrow.append(el("span", "on", "Do Now"), ` · exam statistics · ${course.name}`);
      const heading = el("h1");
      heading.innerHTML = "What the<br>papers <em>ask.</em>";
      const switcher = el("div", "unlocks", [courseLink(course.other, `See the ${other.name} version`)]);
      const left = el("div", "", [eyebrow, heading,
        el("p", "lead", `Where the recall marks were in AQA ${course.full} Higher papers, ${span}.`), switcher]);
      const figure = (value, label, big) => el("div", `figure${big ? " big" : ""}`, [el("b", "", value), el("span", "", label)]);
      const right = el("div", "figures", [
        figure(`${Math.round(recallMarks / totalMarks * 100)}%`, "of all marks are for recall (AO1)", true),
        figure(String(papers.size), "papers counted"),
        figure(totalMarks.toLocaleString("en-GB"), "marks counted"),
      ]);
      section.append(el("div", "hero", [left, right]));
      finish(section);
    }

    // How the marks were counted
    {
      const section = slide("a-hi", "How we counted", "The method", "Counted from the <em>mark schemes.</em>");
      const points = el("ul", "points small tight");
      const point = (html) => { const item = el("li"); item.innerHTML = html; points.append(item); };
      point(`<b>${papers.size} Higher papers</b> in ${series.length} exam series: ${course.full}, ${isTrilogy ? "Physics Papers" : "Papers"} 1 and 2. ${other.name} has its own version of this deck.`);
      point("AQA's mark schemes label the marks with an <b>assessment objective</b> and a <b>specification section</b>. We used those labels, and corrected one that was plainly wrong.");
      point("<b>Recall marks</b> are the marks labelled AO1: knowledge and understanding of ideas and practical methods. That includes describing a method, so it is more than one-line facts.");
      point(`We left out the ${Math.round(equationMarks)} marks for writing down or choosing an equation, because <b>the full equations sheet is now provided</b>. It was not in 2020 and 2021.`);
      point("Marks are split by AQA's mark-by-mark labels. For long answers marked in levels, and for parts covering several sections, the split is an estimate.");
      section.append(el("div", "stack", [points, el("div", "remember", "Higher tier only. Six series is a small sample, and AQA covers the specification over several years: a quiet topic is not a safe topic to skip.")]));
      finish(section);
    }

    // Recall share in each series
    {
      const share = Math.round(recallMarks / totalMarks * 100);
      const section = slide("a-hi", "Recall each year", "Every series", share >= 30 && share <= 37 ? "About a third, <em>every year.</em>" : `About ${share}%, <em>every year.</em>`);
      const key = el("div", "key", [
        el("span", "", [el("i"), "Recall"]),
        el("span", "", [el("i", "third"), "Writing down or choosing an equation"]),
        el("span", "", [el("i", "rest"), "Calculating, applying and analysing"]),
      ]);
      const bars = el("div", "bars");
      bars.style.setProperty("--label", "210px");
      for (const name of series) {
        const sat = marks.filter((part) => part.Series === name);
        const total = sum(sat, (part) => part.marks);
        if (!total) continue;
        const recall = sum(sat, (part) => part.recall) / total * 100;
        const equation = sum(sat.filter((part) => part.Equation === "1"), (part) => part.marks) / total * 100;
        const stacked = el("div", "stacked", [el("i", "", `${Math.round(recall)}%`), el("i", "third", ""), el("i", "rest", `${Math.round(100 - recall - equation)}%`)]);
        stacked.children[0].style.width = `${recall}%`;
        stacked.children[1].style.width = `${equation}%`;
        stacked.children[2].style.flex = "1";
        bars.append(el("div", "bar-row", [el("span", "name", seriesName(name)), stacked]));
      }
      const discounted = marks.filter((part) => part.discounted);
      const footnote = discounted.length
        ? ` Counted as printed: AQA discounted one question (${sum(discounted, (part) => part.marks)} marks, ${seriesName(discounted[0].Series)}) and gave every student its marks.`
        : "";
      section.append(key, bars, el("p", "note", `Share of all the marks in the two ${course.name} Higher papers of each series.${footnote}`));
      finish(section);
    }

    // Units
    {
      const section = slide("a-hi", "Recall by unit", "By unit", "Where the recall <em>marks are.</em>");
      const rows = units.map((unit) => ({ unit, rate: sum([...topics.values()].filter((topic) => topic.unit === unit), (topic) => topic.rate) }));
      const most = Math.max(0.1, ...rows.map((row) => row.rate));
      const bars = el("div", "bars");
      bars.style.setProperty("--label", "470px");
      for (const row of rows) {
        const bar = el("i");
        bar.style.width = `${row.rate / most * 86}%`;
        bars.append(el("div", "bar-row", [el("span", "name", row.unit), el("div", "track", [bar, el("b", "", rate(row.rate))])]));
      }
      section.append(bars, el("p", "note", `${perHundred}${isTrilogy ? " Space physics is not part of Trilogy." : ""}`));
      finish(section);
    }

    // The topics with the most and the fewest recall marks
    const rankSlide = (accent, title, eyebrow, heading, chosen, note) => {
      const section = slide(accent, title, eyebrow, heading);
      const bars = el("div", "bars");
      for (const topic of chosen) {
        const bar = el("i");
        bar.style.width = `${topic.rate / topRate * 86}%`;
        bars.append(el("div", "bar-row", [topicName(topic), el("div", "track", [bar, el("b", "", rate(topic.rate))])]));
      }
      section.append(bars, notes(note));
      finish(section);
    };
    rankSlide("a-hi", "Most recall marks", `${course.name} · top twelve topics`, "Most recall <em>marks.</em>", ranked.slice(0, 12), perHundred);
    rankSlide("a-hot", "Fewest recall marks", `${course.name} · bottom twelve topics`, "Fewest recall <em>marks.</em>", ranked.slice(-12),
      "Same scale as the top twelve. Several of these topics are examined mainly through calculations.");

    // Each topic, series by series
    const peak = Math.max(1, ...[...topics.values()].flatMap((topic) => series.map((name) => topic.recall[name] || 0)));
    GROUPS.forEach(([groupUnits, fullTitle, fullHeading, shortTitle, shortHeading], at) => {
      const shown = groupUnits.filter((unit) => units.includes(unit));
      if (!shown.length) return;
      const trimmed = shown.length < groupUnits.length && shortTitle;
      const section = slide(ACCENTS[at % ACCENTS.length], trimmed ? shortTitle : fullTitle, `${course.name} · topic by topic`, trimmed ? shortHeading : fullHeading);
      const grid = el("div", "grid");
      grid.style.setProperty("--series", series.length);
      const head = el("div", "grid-row head", [el("span", "name", "Recall marks in each series")]);
      for (const name of series) head.append(el("span", "", seriesName(name)));
      head.append(el("span", "", "In every 100 marks"));
      grid.append(head);
      for (const unit of shown) {
        if (shown.length > 1) grid.append(el("div", "grid-row unit", [el("span", "name", unit)]));
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
      section.append(grid, notes(`Cells: recall marks in the two ${course.name} papers of that series.`));
      finish(section);
    });

    // Facts asked in more than one series. These use both courses' papers, because the shared
    // content is the same; a ring shows a series where only the other course's paper asked it.
    const discountedParts = new Set(allMarks.filter((part) => part.discounted).map((part) => `${part.Series} ${part.Paper} ${part.Part}`));
    const discountedFacts = facts.filter((row) => discountedParts.has(`${row.Series} ${row.Paper} ${row.Part}`))
      .map((row) => `The ${seriesName(row.Series)} question on "${row.Fact.toLowerCase()}" was in a question AQA discounted.`);
    const byFact = new Map();
    for (const row of facts) {
      if (!series.includes(row.Series) || (isTrilogy && row.Course === "Separate")) continue;
      if (!byFact.has(row.Fact)) byFact.set(row.Fact, { Fact: row.Fact, Course: row.Course, here: new Set(), anywhere: new Set() });
      const fact = byFact.get(row.Fact);
      fact.anywhere.add(row.Series);
      if (row.Paper.startsWith(course.code)) fact.here.add(row.Series);
    }
    const known = [...byFact.values()]
      .filter((fact) => fact.anywhere.size > 1)
      .sort((a, b) => b.anywhere.size - a.anywhere.size || b.here.size - a.here.size);
    const perSlide = Math.ceil(known.length / Math.max(1, Math.ceil(known.length / 16)));
    for (let from = 0; from < known.length; from += perSlide) {
      const first = from === 0;
      const section = slide(first ? "a-hi" : "a-hot", first ? "Asked again and again" : "Asked more than once",
        "The same facts come back", first ? "Asked again <em>and again.</em>" : "Asked more <em>than once.</em>");
      const key = el("div", "key", [
        el("span", "", [el("i", "round"), `Asked in a ${course.name} paper`]),
        el("span", "", [el("i", "round ring"), `Asked only in a ${other.name} paper`]),
      ]);
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
        for (const item of series) row.append(el("span", fact.here.has(item) ? "dot on" : fact.anywhere.has(item) ? "dot ring" : "dot"));
        row.append(el("span", "total", `${fact.anywhere.size} of ${series.length}`));
        grid.append(row);
      }
      section.append(key, grid, el("p", "note", ["Chosen by reading the recall questions in every paper. Both courses share this content, so a fact asked in either is worth knowing.", ...(first ? discountedFacts : [])].join(" ")));
      finish(section);
    }

    // Required practicals
    {
      const mine = practicals.filter((practical) => practical.Qualification === course.code);
      const names = new Map(mine.map((practical) => [practical.Number, practical.Practical]));
      const tagged = new Map(mine.map((practical) => [practical.Practical, {}]));
      for (const part of marks) {
        for (const number of list(part.Practicals)) {
          const record = tagged.get(names.get(number));
          if (record) record[part.Series] = (record[part.Series] || 0) + part.marks;
        }
      }
      const most = Math.max(1, ...[...tagged.values()].flatMap((record) => Object.values(record)));
      const methods = marks.filter((part) => part.Levels === "1" && list(part.Practicals).length).length;
      const section = slide("a-cyan", "Required practicals", `${course.name} · required practicals`, "Practicals earn <em>marks too.</em>");
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
      section.append(grid, el("p", "note", `All marks, not only recall, on questions AQA labelled with a required practical in the ${course.name} papers. ${methods} of them were extended "describe a method" questions, worth 4 to 6 marks each. Some practical questions carry no label, so these are minimum figures.`));
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
      links.append(link("../", "Open Do Now"), link("../revision/", "Revision sheets"), courseLink(course.other, `${other.name} version`));
      links.style.marginTop = "0";
      section.append(el("div", "stack", [cards, links]));
      finish(section);
    }
  }

  try {
    deck.append(el("p", "status", "Loading the figures…"));
    const [marks, sections, facts, practicals, corrections] = await Promise.all(["marks.csv", "sections.csv", "facts.csv", "practicals.csv", "corrections.csv"].map(load));
    build(marks, sections, facts, practicals, corrections, chosenCourse());
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
