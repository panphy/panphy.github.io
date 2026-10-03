/* Do Now starters: pick topics and a number of questions, then show them on
   the board. Questions are read from questions.csv in this folder. */
(function () {
  "use strict";

  const BANK_URL = "questions.csv";
  const METHODS_URL = "methods.csv";
  const LETTERS = "ABCDEFGHIJ";
  const IMAGE_DIR = "images/";
  const STORAGE_KEY = "panphy-do-now";
  const MAX_COUNT = 20;
  const PAPER_ONE_UNITS = ["Energy", "Electricity", "Particle model of matter", "Atomic structure"];
  const CHEVRON_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  const SWAP_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.3-4.5L4 8.5M4 4v4.5h4.5M4 13a8 8 0 0 0 14.3 4.5l1.7-2M20 20v-4.5h-4.5"/></svg>';

  const $ = (id) => document.getElementById(id);
  const els = {
    setup: $("setup"), board: $("board"), units: $("units"), search: $("search"), count: $("count"),
    summary: $("summary"), show: $("show"), list: $("questions"), area: $("board-area"),
    showAll: $("show-all"), lightbox: $("lightbox"), date: $("board-date"),
    sheetView: $("sheet-view"), sheet: $("sheet"), sheetFromSetup: $("sheet-from-setup"),
    methods: $("methods"),
    picker: $("picker"), pickSearch: $("pick-search"), randomOptions: $("random-options"), manualOptions: $("manual-options"),
  };

  const state = {
    bank: [],
    topics: [],          // [{ name, unit, questions }] in bank order
    selected: new Set(), // topic names
    course: "all",       // "all" | "combined"
    count: 5,
    mode: "random",      // "random" | "manual"
    picks: [],           // question Numbers ticked by the teacher, in the order ticked
    methods: [],         // "order the method" tasks from methods.csv
    methodPicks: [],     // their Numbers, in the order ticked
    collapsed: new Set(), // unit names whose topic lists are folded away
    scale: 1,
    sheetKind: "worksheet", // which page the worksheet preview shows: "worksheet" | "key"
    shown: [],           // questions on the board
  };

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

  function loadPrefs() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (Array.isArray(saved.topics)) state.selected = new Set(saved.topics);
      if (saved.course === "combined") state.course = "combined";
      if (Number.isFinite(saved.count)) state.count = clampCount(saved.count);
      if (saved.mode === "manual") state.mode = "manual";
      if (Array.isArray(saved.picks)) state.picks = saved.picks.map(String);
      if (Array.isArray(saved.methodPicks)) state.methodPicks = saved.methodPicks.map(String);
      if (Array.isArray(saved.collapsed)) state.collapsed = new Set(saved.collapsed);
      if (Number.isFinite(saved.scale)) state.scale = Math.min(1.6, Math.max(0.6, saved.scale));
    } catch (error) { /* storage unavailable: start fresh */ }
  }

  function savePrefs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        topics: [...state.selected], course: state.course, count: state.count, scale: state.scale,
        mode: state.mode, picks: state.picks, methodPicks: state.methodPicks, collapsed: [...state.collapsed],
      }));
    } catch (error) { /* ignore */ }
  }

  function clampCount(value) {
    return Math.min(MAX_COUNT, Math.max(1, Math.round(Number(value) || 1)));
  }

  function allowed(question) {
    if (state.course === "combined" && question.Course === "Separate") return false;
    return true;
  }

  function buildTopics() {
    const byName = new Map();
    for (const question of state.bank) {
      if (!byName.has(question.Topic)) byName.set(question.Topic, { name: question.Topic, unit: question.Unit, questions: [] });
      byName.get(question.Topic).questions.push(question);
    }
    state.topics = [...byName.values()];
    const names = new Set(byName.keys());
    state.selected = new Set([...state.selected].filter((name) => names.has(name)));
  }

  function renderTopics() {
    const query = els.search.value.trim().toLowerCase();
    const terms = query.split(/\s+/).filter(Boolean);
    els.units.textContent = "";
    const units = [...new Set(state.topics.map((topic) => topic.unit))];
    let shownTopics = 0;

    for (const unit of units) {
      const topics = state.topics.filter((topic) => {
        if (topic.unit !== unit) return false;
        if (!topic.questions.some(allowed)) return false;
        const haystack = `${topic.name} ${unit}`.toLowerCase();
        return terms.every((term) => haystack.includes(term));
      });
      if (!topics.length) continue;
      shownTopics += topics.length;

      const section = document.createElement("section");
      section.className = "unit";
      const head = document.createElement("div");
      head.className = "unit-head";
      // A search always shows its matches, whatever is folded away.
      const open = terms.length > 0 || !state.collapsed.has(unit);
      const title = document.createElement("h3");
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "unit-toggle";
      toggle.setAttribute("aria-expanded", String(open));
      toggle.innerHTML = CHEVRON_ICON;
      toggle.append(unit);
      toggle.addEventListener("click", () => {
        state.collapsed.has(unit) ? state.collapsed.delete(unit) : state.collapsed.add(unit);
        refresh();
      });
      title.append(toggle);
      const paper = document.createElement("span");
      paper.className = "unit-paper";
      const chosen = topics.filter((topic) => state.selected.has(topic.name)).length;
      paper.textContent = `${PAPER_ONE_UNITS.includes(unit) ? "Paper 1" : "Paper 2"} · ${chosen ? `${chosen} of ${topics.length} selected` : `${topics.length} topics`}`;
      paper.dataset.unit = unit;
      if (chosen) paper.classList.add("has-selection");
      const all = document.createElement("button");
      all.type = "button";
      all.className = "unit-all";
      const everySelected = topics.every((topic) => state.selected.has(topic.name));
      all.textContent = everySelected ? "Clear unit" : "Select unit";
      all.addEventListener("click", () => {
        for (const topic of topics) everySelected ? state.selected.delete(topic.name) : state.selected.add(topic.name);
        refresh();
      });
      head.append(title, paper, all);

      const grid = document.createElement("div");
      grid.className = "topics";
      grid.hidden = !open;
      for (const topic of topics) {
        const label = document.createElement("label");
        label.className = "topic";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = state.selected.has(topic.name);
        input.dataset.topic = topic.name;
        input.addEventListener("change", () => {
          input.checked ? state.selected.add(topic.name) : state.selected.delete(topic.name);
          const picked = topics.filter((item) => state.selected.has(item.name)).length;
          paper.textContent = paper.textContent.replace(/· .*$/, `· ${picked ? `${picked} of ${topics.length} selected` : `${topics.length} topics`}`);
          paper.classList.toggle("has-selection", picked > 0);
          refresh(false);
        });
        const body = document.createElement("span");
        const name = document.createElement("span");
        name.className = "topic-name";
        name.textContent = topic.name.replace(/^\(S\)\s*/, "");
        body.append(name);
        // A topic is wholly Combined or wholly Separate Physics only.
        if (topic.questions[0].Course === "Separate") {
          const badge = document.createElement("span");
          badge.className = "badge-s";
          badge.textContent = "S";
          badge.title = "Separate Physics only";
          body.append(badge);
        }
        const count = document.createElement("span");
        count.className = "topic-count";
        count.textContent = topic.questions.filter(allowed).length;
        body.append(count);
        label.append(input, body);
        grid.append(label);
      }
      section.append(head, grid);
      els.units.append(section);
    }

    if (!shownTopics) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "No topics match that search.";
      els.units.append(empty);
    }
  }

  function pool() {
    return state.topics.filter((topic) => state.selected.has(topic.name)).flatMap((topic) => topic.questions.filter(allowed));
  }

  // Questions that share wording and diagram count as one (units are asked in several topics).
  function questionKey(question) {
    return `${question.Question}|${question.Image}`;
  }

  // Two questions on one diagram can give each other away (one names the
  // component the other asks for), so a diagram appears once per board.
  function clashes(question, taken) {
    return taken.keys.has(questionKey(question)) || (question.Image !== "" && taken.images.has(question.Image));
  }

  function takenBy(questions) {
    return { keys: new Set(questions.map(questionKey)), images: new Set(questions.map((question) => question.Image).filter(Boolean)) };
  }

  // How many of these questions could share one board.
  function uniqueCount(questions) {
    const taken = takenBy([]);
    let count = 0;
    for (const question of questions) {
      if (clashes(question, taken)) continue;
      taken.keys.add(questionKey(question));
      if (question.Image) taken.images.add(question.Image);
      count++;
    }
    return count;
  }

  // The ticked questions that are still in the chosen topics and course, in tick order.
  function pickedQuestions() {
    const available = new Map(pool().map((question) => [question.Number, question]));
    return state.picks.filter((number) => available.has(number)).map((number) => available.get(number));
  }

  // The ticked method tasks that the chosen course allows, in tick order.
  function pickedMethods() {
    const available = new Map(state.methods.filter(allowed).map((method) => [method.Number, method]));
    return state.methodPicks.filter((number) => available.has(number)).map((number) => available.get(number));
  }

  function renderMethods() {
    els.methods.textContent = "";
    for (const method of state.methods.filter(allowed)) {
      const label = document.createElement("label");
      label.className = "topic";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = state.methodPicks.includes(method.Number);
      input.addEventListener("change", () => {
        if (input.checked) state.methodPicks.push(method.Number);
        else state.methodPicks = state.methodPicks.filter((number) => number !== method.Number);
        refresh(false);
      });
      const body = document.createElement("span");
      const name = document.createElement("span");
      name.className = "topic-name";
      name.textContent = method.Practical;
      body.append(name);
      if (method.Course === "Separate") {
        const badge = document.createElement("span");
        badge.className = "badge-s";
        badge.textContent = "S";
        badge.title = "Separate Physics only";
        body.append(badge);
      }
      const count = document.createElement("span");
      count.className = "topic-count";
      count.textContent = `${method.Steps.split("\n").length} steps`;
      body.append(count);
      label.append(input, body);
      els.methods.append(label);
    }
  }

  // Turn a method into a board item: its steps jumbled and lettered, and the
  // answer given as the letters in the correct order.
  function methodItem(method) {
    const steps = method.Steps.split("\n").map((step) => step.trim()).filter(Boolean);
    let order;
    do order = shuffle(steps.map((step, index) => index));
    // Jumble thoroughly: at most one step may stay in its correct place.
    while (steps.length > 2 && order.filter((value, index) => value === index).length > 1);
    const correct = steps.map((step, index) => LETTERS[order.indexOf(index)]).join(", ");
    return {
      Number: method.Number, Topic: method.Practical, Course: method.Course, Image: "",
      Question: `${method.Task} Put the steps in the correct order.`,
      Answer: `Correct order: ${correct}${method.Note ? `\n${method.Note}` : ""}`,
      steps: order.map((stepIndex, position) => ({ letter: LETTERS[position], text: steps[stepIndex] })),
    };
  }

  function renderPicker() {
    if (state.mode !== "manual") return;
    const terms = els.pickSearch.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const scroll = els.picker.scrollTop;
    const boardOrder = pickedQuestions().map((question) => question.Number);
    els.picker.textContent = "";
    let shown = 0;
    for (const topic of state.topics) {
      if (!state.selected.has(topic.name)) continue;
      const questions = topic.questions.filter((question) => allowed(question)
        && terms.every((term) => question.Question.toLowerCase().includes(term)));
      if (!questions.length) continue;
      const heading = document.createElement("h3");
      heading.textContent = topic.name.replace(/^\(S\)\s*/, "");
      els.picker.append(heading);
      for (const question of questions) {
        shown++;
        const order = boardOrder.indexOf(question.Number);
        const row = document.createElement("label");
        row.className = order >= 0 ? "pick checked" : "pick";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = order >= 0;
        input.addEventListener("change", () => {
          if (input.checked) state.picks.push(question.Number);
          else state.picks = state.picks.filter((number) => number !== question.Number);
          refresh(false);
        });
        const text = document.createElement("span");
        text.className = "pick-text";
        text.textContent = question.Question;
        row.append(input);
        if (order >= 0) {
          const badge = document.createElement("span");
          badge.className = "pick-order";
          badge.textContent = order + 1;
          badge.title = "Position on the board";
          row.append(badge);
        }
        row.append(text);
        const tags = [question.Image && "diagram"];
        for (const label of tags.filter(Boolean)) {
          const tag = document.createElement("span");
          tag.className = "pick-tag";
          tag.textContent = label;
          row.append(tag);
        }
        els.picker.append(row);
      }
    }
    if (!shown) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = state.selected.size ? "No questions match that filter." : "Choose at least one topic above to see its questions.";
      els.picker.append(empty);
    }
    els.picker.scrollTop = scroll;
  }

  function renderSummary() {
    const methodCount = pickedMethods().length;
    const bold = (value) => { const b = document.createElement("b"); b.textContent = value; return b; };
    const addMethods = (alone) => {
      if (methodCount) els.summary.append(alone ? "" : " · ", bold(methodCount), ` method task${methodCount === 1 ? "" : "s"}`);
    };
    if (state.mode === "manual") {
      const picked = pickedQuestions().length;
      els.show.disabled = els.sheetFromSetup.disabled = picked + methodCount === 0;
      els.summary.textContent = "";
      if (!picked) {
        if (methodCount) addMethods(true);
        else els.summary.textContent = state.selected.size ? "Tick the questions you want to show." : "Choose at least one topic.";
        return;
      }
      els.summary.append(bold(picked), ` question${picked === 1 ? "" : "s"} picked`);
      addMethods(false);
      return;
    }
    const questions = pool();
    const topicCount = state.topics.filter((topic) => state.selected.has(topic.name) && topic.questions.some(allowed)).length;
    const available = uniqueCount(questions);
    els.show.disabled = els.sheetFromSetup.disabled = available + methodCount === 0;
    els.summary.textContent = "";
    if (!available) {
      if (methodCount) addMethods(true);
      else els.summary.textContent = "Choose at least one topic.";
      return;
    }
    const showing = Math.min(state.count, available);
    els.summary.append(bold(topicCount), ` topic${topicCount === 1 ? "" : "s"} · `, bold(available), " questions to draw from · showing ", bold(showing));
    addMethods(false);
  }

  function renderControls() {
    const unitCount = new Set(state.topics.map((topic) => topic.unit)).size;
    $("fold-all").textContent = unitCount && state.collapsed.size >= unitCount ? "Expand all" : "Collapse all";
    els.count.value = state.count;
    document.querySelectorAll("[data-count]").forEach((button) => button.setAttribute("aria-pressed", String(Number(button.dataset.count) === state.count)));
    document.querySelectorAll("[data-course]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.course === state.course)));
    document.querySelectorAll("[data-mode]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.mode === state.mode)));
    els.randomOptions.hidden = state.mode !== "random";
    els.manualOptions.hidden = state.mode !== "manual";
  }

  function refresh(redrawTopics = true) {
    if (redrawTopics) { renderTopics(); renderMethods(); }
    renderControls();
    renderPicker();
    renderSummary();
    savePrefs();
  }

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // Draw questions one topic at a time so every selected topic gets a fair share.
  function drawQuestions(count) {
    const groups = shuffle(state.topics.filter((topic) => state.selected.has(topic.name)))
      .map((topic) => shuffle(topic.questions.filter(allowed)))
      .filter((group) => group.length);
    const picked = [];
    const taken = takenBy([]);
    while (picked.length < count && groups.some((group) => group.length)) {
      for (const group of groups) {
        if (picked.length >= count) break;
        while (group.length) {
          const question = group.pop();
          if (clashes(question, taken)) continue;
          taken.keys.add(questionKey(question));
          if (question.Image) taken.images.add(question.Image);
          picked.push(question);
          break;
        }
      }
    }
    return picked;
  }

  function buildCard(question, index) {
    const item = document.createElement("li");
    item.className = question.steps ? "q method" : "q";

    const number = document.createElement("div");
    number.className = "q-num";
    number.textContent = index + 1;

    const body = document.createElement("div");
    const text = document.createElement("p");
    text.className = "q-text";
    text.textContent = question.Question;
    body.append(text);

    if (question.Image) {
      const figure = document.createElement("figure");
      figure.className = "q-figure";
      const zoom = document.createElement("button");
      zoom.type = "button";
      zoom.setAttribute("aria-label", "Enlarge diagram");
      const image = document.createElement("img");
      image.src = IMAGE_DIR + question.Image;
      image.alt = "Diagram for this question";
      image.addEventListener("load", () => {
        if (image.naturalHeight) image.style.setProperty("--ratio", (image.naturalWidth / image.naturalHeight).toFixed(3));
        fitBoard();
      });
      zoom.append(image);
      zoom.addEventListener("click", () => openLightbox(image.src));
      figure.append(zoom);
      body.append(figure);
    }

    if (question.steps) {
      const list = document.createElement("ol");
      list.className = "q-steps";
      for (const step of question.steps) {
        const row = document.createElement("li");
        const letter = document.createElement("b");
        letter.textContent = step.letter;
        row.append(letter, document.createTextNode(step.text));
        list.append(row);
      }
      body.append(list);
    }

    const answer = document.createElement("div");
    answer.className = "q-answer";
    answer.textContent = question.Answer;
    answer.hidden = true;
    body.append(answer);

    const actions = document.createElement("div");
    actions.className = "q-actions";
    const reveal = document.createElement("button");
    reveal.type = "button";
    reveal.className = "ans-btn";
    reveal.textContent = "Answer";
    reveal.setAttribute("aria-pressed", "false");
    reveal.setAttribute("aria-label", `Show answer to question ${index + 1}`);
    reveal.addEventListener("click", () => {
      setAnswer(item, answer.hidden);
      syncShowAll();
      if (!answer.hidden) answer.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    const swap = document.createElement("button");
    swap.type = "button";
    swap.className = "swap-btn";
    swap.innerHTML = SWAP_ICON;
    swap.title = "Swap for a different question";
    swap.setAttribute("aria-label", `Swap question ${index + 1} for a different one`);
    swap.addEventListener("click", () => swapQuestion(index));
    actions.append(reveal, swap);

    item.append(number, body, actions);
    return item;
  }

  function setAnswer(item, visible) {
    item.querySelector(".q-answer").hidden = !visible;
    const button = item.querySelector(".ans-btn");
    button.setAttribute("aria-pressed", String(visible));
    button.textContent = visible ? "Hide" : "Answer";
  }

  function syncShowAll() {
    const answers = [...els.list.querySelectorAll(".q-answer")];
    const allVisible = answers.length > 0 && answers.every((answer) => !answer.hidden);
    els.showAll.setAttribute("aria-pressed", String(allVisible));
    els.showAll.textContent = allVisible ? "Hide ALL answers" : "Show ALL answers";
  }

  function renderBoard() {
    els.list.textContent = "";
    state.shown.forEach((question, index) => els.list.append(buildCard(question, index)));
    syncShowAll();
    fitBoard();
  }

  function swapQuestion(index) {
    if (state.shown[index].steps) return;
    const taken = takenBy(state.shown.filter((question, i) => i !== index));
    taken.keys.add(questionKey(state.shown[index]));
    const candidates = pool().filter((question) => !clashes(question, taken));
    if (!candidates.length) return;
    const sameTopic = candidates.filter((question) => question.Topic === state.shown[index].Topic);
    const source = sameTopic.length ? sameTopic : candidates;
    state.shown[index] = source[Math.floor(Math.random() * source.length)];
    els.list.replaceChild(buildCard(state.shown[index], index), els.list.children[index]);
    syncShowAll();
    fitBoard();
  }

  // Choose the largest text size (and one or two columns) at which every
  // question fits on screen; below the minimum readable size the board scrolls.
  // Answers are left out of the measurement so the text never shrinks when
  // one is revealed: the board scrolls instead.
  function fitBoard() {
    if (els.board.hidden || !state.shown.length) return;
    const list = els.list;
    const style = getComputedStyle(els.area);
    const available = els.area.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const viewport = window.innerHeight;
    const min = Math.max(22, Math.min(viewport * 0.045, window.innerWidth * 0.05));
    const max = Math.max(min, viewport * 0.085);
    const layouts = window.innerWidth >= 900 && state.shown.length > 1 ? [1, 2] : [1];
    // Whole half-pixels only, so the size applied is exactly a size that was measured.
    const snap = (size) => Math.floor(size * 2) / 2;
    const fits = (size) => {
      list.style.setProperty("--q", `${snap(size)}px`);
      return list.offsetHeight <= available;
    };
    let best = null;
    list.classList.add("measuring");
    for (const columns of layouts) {
      list.style.columnCount = columns;
      if (!fits(min)) continue;
      let low = min, high = max;
      if (fits(max)) low = max;
      else for (let i = 0; i < 8; i++) {
        const mid = (low + high) / 2;
        if (fits(mid)) low = mid; else high = mid;
      }
      if (!best || low > best.size * 1.06) best = { size: low, columns };
    }
    if (!best) best = { size: min, columns: layouts.length > 1 && state.shown.length > 3 ? 2 : 1 };
    list.classList.remove("measuring");
    list.style.columnCount = best.columns;
    list.style.setProperty("--q", `${snap(snap(best.size) * state.scale)}px`);
  }

  function showBoard() {
    const manual = state.mode === "manual";
    const questions = [...(manual ? pickedQuestions() : drawQuestions(state.count)), ...pickedMethods().map(methodItem)];
    if (!questions.length) return;
    els.board.classList.toggle("manual", manual);
    state.shown = questions;
    els.date.textContent = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    els.setup.hidden = true;
    els.board.hidden = false;
    els.area.scrollTop = 0;
    renderBoard();
  }

  function hideBoard() {
    if (document.fullscreenElement) document.exitFullscreen();
    els.board.hidden = true;
    els.setup.hidden = false;
  }

  function toggleFullscreen() {
    const root = document.documentElement;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      const request = root.requestFullscreen || root.webkitRequestFullscreen;
      if (request) request.call(root);
    }
  }

  // The worksheet is an A4 page built from the questions on the board. The
  // browser's print dialog saves it as a PDF, so no PDF library is needed.
  function renderSheet() {
    const withAnswers = state.sheetKind === "key";
    els.sheet.classList.toggle("key", withAnswers);
    document.querySelectorAll("[data-sheet]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.sheet === state.sheetKind)));
    const element = (tag, className, text) => {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };
    els.sheet.textContent = "";

    const head = element("header", "sheet-head");
    const topics = [...new Set(state.shown.map((question) => question.Topic.replace(/^\(S\)\s*/, "")))];
    head.append(element("h1", "", withAnswers ? "Do Now: answer key" : "Do Now"),
      element("p", "", `GCSE Physics \u00b7 ${topics.length > 3 ? `${topics.slice(0, 3).join(", ")} and more` : topics.join(", ")}`));

    const info = element("div", "sheet-info");
    for (const label of ["Name", "Class", "Date"]) info.append(element("span", "", label), element("i"));

    const table = element("table", "sheet-table");
    const columns = element("colgroup");
    columns.append(element("col"), element("col"));
    const headRow = element("tr");
    headRow.append(element("th", "", "Question"), element("th", "", "Answer"));
    const thead = element("thead");
    thead.append(headRow);
    const body = element("tbody");
    state.shown.forEach((question, index) => {
      const row = element("tr");
      const questionCell = element("td");
      const wrap = element("div", "sheet-q");
      const text = element("div", "", question.Question);
      if (question.Image) {
        const image = element("img");
        image.src = IMAGE_DIR + question.Image;
        image.alt = "Diagram for this question";
        text.append(image);
      }
      if (question.steps) {
        const list = element("ol", "sheet-steps");
        for (const step of question.steps) {
          const item = element("li");
          item.append(element("b", "", step.letter), document.createTextNode(step.text));
          list.append(item);
        }
        text.append(list);
      }
      wrap.append(element("b", "", index + 1), text);
      questionCell.append(wrap);
      row.append(questionCell, element("td", "sheet-a", withAnswers ? question.Answer : ""));
      body.append(row);
    });
    table.append(columns, thead, body);
    els.sheet.append(head, ...(withAnswers ? [] : [info]), table);
  }

  function openSheet() {
    if (!state.shown.length) return;
    state.sheetKind = "worksheet";
    renderSheet();
    els.sheetView.hidden = false;
    $("sheet-print").focus();
  }

  // Print one page of the worksheet preview and resolve when its dialog closes.
  // (print() blocks in some browsers and returns at once in others.)
  async function printKind(kind, day) {
    state.sheetKind = kind;
    renderSheet();
    await Promise.all([...els.sheet.querySelectorAll("img")].map((image) => image.decode().catch(() => {})));
    // The PDF takes its file name from the page title.
    document.title = `Do Now ${kind === "key" ? "answer key" : "worksheet"} ${day}`;
    await new Promise((resolve) => {
      window.addEventListener("afterprint", resolve, { once: true });
      window.print();
    });
  }

  // One click saves two PDFs: the worksheet, then its answer key.
  async function printSheet() {
    const title = document.title;
    const shownKind = state.sheetKind;
    const day = new Date().toISOString().slice(0, 10);
    await printKind("worksheet", day);
    await printKind("key", day);
    document.title = title;
    state.sheetKind = shownKind;
    renderSheet();
  }

  function openLightbox(src) {
    els.lightbox.querySelector("img").src = src;
    els.lightbox.hidden = false;
    els.lightbox.querySelector("button").focus();
  }

  function setScale(factor) {
    state.scale = Math.min(1.6, Math.max(0.6, state.scale * factor));
    savePrefs();
    fitBoard();
  }

  function bindEvents() {
    els.search.addEventListener("input", () => renderTopics());
    $("clear").addEventListener("click", () => { state.selected.clear(); refresh(); });
    $("fold-all").addEventListener("click", () => {
      const units = [...new Set(state.topics.map((topic) => topic.unit))];
      state.collapsed = state.collapsed.size >= units.length ? new Set() : new Set(units);
      refresh();
    });
    $("select-shown").addEventListener("click", () => {
      els.units.querySelectorAll("input[data-topic]").forEach((input) => state.selected.add(input.dataset.topic));
      refresh();
    });
    document.querySelectorAll("[data-course]").forEach((button) => button.addEventListener("click", () => {
      state.course = button.dataset.course;
      refresh();
    }));
    document.querySelectorAll("[data-count]").forEach((button) => button.addEventListener("click", () => {
      state.count = clampCount(button.dataset.count);
      refresh(false);
    }));
    $("count-down").addEventListener("click", () => { state.count = clampCount(state.count - 1); refresh(false); });
    $("count-up").addEventListener("click", () => { state.count = clampCount(state.count + 1); refresh(false); });
    els.count.addEventListener("change", () => { state.count = clampCount(els.count.value); refresh(false); });
    els.show.addEventListener("click", showBoard);
    els.sheetFromSetup.addEventListener("click", () => { showBoard(); openSheet(); });
    $("sheet-open").addEventListener("click", openSheet);
    $("sheet-close").addEventListener("click", () => { els.sheetView.hidden = true; });
    $("sheet-print").addEventListener("click", printSheet);
    document.querySelectorAll("[data-sheet]").forEach((button) => button.addEventListener("click", () => {
      state.sheetKind = button.dataset.sheet;
      renderSheet();
    }));
    document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      refresh();
    }));
    els.pickSearch.addEventListener("input", renderPicker);
    $("clear-picks").addEventListener("click", () => { state.picks = []; refresh(false); });

    els.showAll.addEventListener("click", () => {
      const visible = els.showAll.getAttribute("aria-pressed") !== "true";
      els.list.querySelectorAll(".q").forEach((item) => setAnswer(item, visible));
      syncShowAll();
    });
    $("reshuffle").addEventListener("click", showBoard);
    $("smaller").addEventListener("click", () => setScale(1 / 1.1));
    $("larger").addEventListener("click", () => setScale(1.1));
    $("fullscreen").addEventListener("click", toggleFullscreen);
    $("back").addEventListener("click", hideBoard);
    els.lightbox.addEventListener("click", () => { els.lightbox.hidden = true; });

    window.addEventListener("resize", fitBoard);
    const onFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      const button = $("fullscreen");
      button.setAttribute("aria-pressed", String(active));
      button.setAttribute("aria-label", active ? "Exit fullscreen" : "Fullscreen");
      fitBoard();
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    document.addEventListener("keydown", (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (!els.sheetView.hidden) {
        if (event.key === "Escape") els.sheetView.hidden = true;
        return;
      }
      if (!els.lightbox.hidden) {
        if (event.key === "Escape") els.lightbox.hidden = true;
        return;
      }
      if (els.board.hidden) {
        if (event.key === "Enter" && document.activeElement === els.search && !els.show.disabled) showBoard();
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "a") els.showAll.click();
      else if (key === "n" && state.mode === "random") showBoard();
      else if (key === "f") toggleFullscreen();
      else if (key === "w") openSheet();
      else if (key === "escape" && !document.fullscreenElement) hideBoard();
      else if (/^[0-9]$/.test(key)) {
        const item = els.list.children[key === "0" ? 9 : Number(key) - 1];
        if (item) item.querySelector(".ans-btn").click();
      }
    });
  }

  async function start() {
    loadPrefs();
    bindEvents();
    renderControls();
    try {
      const response = await fetch(BANK_URL, { cache: "no-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      state.bank = parseCsv(await response.text()).filter((question) => question.Question && question.Topic);
      // The method tasks are an extra: the page still works if they fail to load.
      state.methods = await fetch(METHODS_URL, { cache: "no-cache" })
        .then((reply) => (reply.ok ? reply.text() : ""))
        .then((text) => (text ? parseCsv(text).filter((method) => method.Task && method.Steps) : []))
        .catch(() => []);
      buildTopics();
      refresh();
    } catch (error) {
      els.units.textContent = "";
      const message = document.createElement("p");
      message.className = "empty";
      message.textContent = "The question bank could not be loaded. Check your connection and reload the page.";
      els.units.append(message);
    }
  }

  start();
})();
