/* Shared by the revision index page, the printable sheet and build-pdfs.sh
   (which loads this file with Node to list the topics and file names). */
(function (root) {
  "use strict";

  const PAPER_ONE_UNITS = ["Energy", "Electricity", "Particle model of matter", "Atomic structure"];
  const SKILLS_UNITS = ["Working scientifically"];

  // RFC 4180 parser, as in ../do_now.js: quoted fields may hold commas, doubled quotes and newlines.
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

  function paperLabel(unit) {
    if (SKILLS_UNITS.includes(unit)) return "Both papers";
    return PAPER_ONE_UNITS.includes(unit) ? "Paper 1" : "Paper 2";
  }

  // The PDF for a topic. Only letters, digits, spaces, commas, brackets and hyphens are kept.
  function fileName(title) {
    const safe = title.replace(/–/g, "-").replace(/[^A-Za-z0-9 ,()-]/g, "").replace(/\s+/g, " ").trim();
    return `AO1 revision - ${safe}.pdf`;
  }

  // Topics in bank order, with the skills unit first (as on the Do Now page).
  function topicsFrom(questions) {
    const byName = new Map();
    for (const question of questions) {
      if (!question.Question || !question.Topic) continue;
      if (!byName.has(question.Topic)) {
        const title = question.Topic.replace(/^\(S\)\s*/, "");
        byName.set(question.Topic, {
          title, unit: question.Unit, separate: question.Course === "Separate",
          paper: paperLabel(question.Unit), file: fileName(title), questions: [],
        });
      }
      byName.get(question.Topic).questions.push(question);
    }
    return [...byName.values()].sort((a, b) => SKILLS_UNITS.includes(b.unit) - SKILLS_UNITS.includes(a.unit));
  }

  // Required practicals from ../methods.csv. Step n of practical M3 is drawn in practicals/M3-n.svg.
  function practicalFileName(title) {
    return fileName(title).replace("AO1 revision", "Required practical");
  }

  function practicalsFrom(methods) {
    return methods.filter((method) => method.Number && method.Practical).map((method) => ({
      number: method.Number, title: method.Practical, unit: method.Unit, separate: method.Course === "Separate",
      paper: paperLabel(method.Unit), task: method.Task, note: method.Note, file: practicalFileName(method.Practical),
      steps: method.Steps.split("\n").map((step) => step.trim()).filter(Boolean),
    })).map((practical) => ({ ...practical, images: practical.steps.map((step, index) => `practicals/${practical.number}-${index + 1}.svg`) }));
  }

  root.DoNowRevision = { parseCsv, topicsFrom, fileName, paperLabel, practicalsFrom, practicalFileName };
})(typeof globalThis !== "undefined" ? globalThis : this);
