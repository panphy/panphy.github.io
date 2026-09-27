/* Renders the teacher guide from window.UNIT (content.js) and window.PLANS
   (plans-data.js). teacher-guide.html shows every plan; ?lesson=N shows one. */
(function () {
  "use strict";

  const U = window.UNIT;
  const P = window.PLANS;
  const only = Number(new URLSearchParams(location.search).get("lesson")) || 0;
  const SITE = "panphy.app/gcsephy/year10phy/unit01/";

  const style = document.createElement("style");
  style.textContent = '@page { @bottom-left { content: "Electric Circuits, Year 10 teacher guide"; } }';
  document.head.appendChild(style);
  document.title = only ? `Lesson ${only} plan | Electric Circuits` : "Electric Circuits - Year 10 Teacher Guide";

  const list = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;

  function overview() {
    const rows = U.lessons.map((l) => `<tr><td>${l.n}</td><td><strong>${l.title}</strong>${l.rp ? `<span class="tag">${l.rp}</span>` : ""}<br><span style="color:#56606e">${l.mapLine}</span></td><td>${l.online.label}</td></tr>`).join("");
    return `<section>
      <div class="eyebrow">Year 10 Physics, AQA GCSE Combined Science: Trilogy (Higher) and Physics</div>
      <h1 class="page-title">Electric Circuits: Teacher guide</h1>
      <p class="page-intro">Twelve 50-minute lessons, written for students with <strong>no prior knowledge of electricity</strong>. Each lesson has a matching section in the student workbook and a mission on the companion website.</p>
      <h4 class="sub">How the three resources fit together</h4>
      <table class="compare"><thead><tr><th>Resource</th><th>Used for</th></tr></thead><tbody>
        <tr><th>Student workbook</th><td>One booklet per lesson (12 pt text, wide writing lines), each with its toolkit, key words and quick answers, plus a Unit review booklet with the static electricity page (Physics only) and progress tracker. Every lesson: explanations, worked examples, graded practice, lab records, an exam question and a revision box. It is the students' classwork book and their revision guide.</td></tr>
        <tr><th>Answer edition</th><td>Same pages and page numbers as each booklet, with answers in blue. For marking, and for release to students for self-marking if you choose.</td></tr>
        <tr><th>Companion website</th><td>${SITE}: homework and revision. Missions carry more questions with hints and worked answers; the Exam Zone is for the end of the unit.</td></tr>
        <tr><th>Virtual labs, RP sheets</th><td>Lessons 2–4 use the Virtual Labs worksheet (PhET) for the full investigation; the workbook holds a short record. Lab 3 plots current against p.d., as AQA does. Lessons 5, 7 and 9 have full required-practical pages on the website.</td></tr>
      </tbody></table>
      <h4 class="sub">Design principles</h4>
      ${list([
        "<strong>Concrete before abstract.</strong> Lesson 1 builds real circuits and teaches symbols and drawing rules before any quantity is measured. The voltmeter appears only when students know what p.d. is (Lesson 3).",
        "<strong>One new idea at a time.</strong> Current, p.d. and resistance get a lesson each, each with a model (bike chain, delivery vans, collisions) and its limitation. Common misconceptions appear as student claims (Mia, Leo, Ava) to correct.",
        "<strong>Worked example → your turn → faded practice.</strong> Calculation questions go from a full frame (Equation, Substitute, Answer) to no frame to a challenge.",
        "<strong>Retrieval every lesson.</strong> ‘Do now’ questions revisit earlier lessons; ‘Revise it’ gives cover-and-answer questions with quick answers at the back.",
        "<strong>Equations are learned.</strong> This cohort sits GCSE in 2028; AQA has confirmed equation sheets only up to 2027, so the booklet teaches recall.",
      ])}
      <h4 class="sub">Sequence</h4>
      <table class="route"><thead><tr><th>#</th><th>Lesson</th><th>Companion website</th></tr></thead><tbody>${rows}</tbody></table>
    </section>`;
  }

  function plan(l) {
    const p = P[l.n];
    const timing = p.timing.map(([a, b, phase, what]) => `<tr><td>${a}–${b}</td><td><strong>${phase}</strong></td><td>${what}</td></tr>`).join("");
    const mis = p.misconceptions.map(([m, fix]) => `<tr><td>${m}</td><td>${fix}</td></tr>`).join("");
    return `<section class="lesson" style="--accent:var(--${l.accent});--accent-t:var(--${l.accent}-t)">
      <header class="opener"><div class="num"><small>Lesson</small>${String(l.n).padStart(2, "0")}</div>
      <div><h2>${l.title}</h2><div class="spec">${l.spec}; 50 minutes</div></div><div class="big-q">${l.big}</div></header>
      <div class="opener-foot"><div class="goals"><h3>Students will be able to</h3>${list(l.goals)}</div>
      <div class="online"><div><h3>Why this lesson, here</h3><p>${p.why}</p></div></div></div>
      <h4 class="sub">Preparation and equipment</h4><p>${p.prep}</p>
      <h4 class="sub">Lesson sequence</h4>
      <table class="compare plan-time"><thead><tr><th>Min</th><th>Phase</th><th>Teacher moves (workbook question numbers in the lesson)</th></tr></thead><tbody>${timing}</tbody></table>
      <div class="key"><strong>Hinge check.</strong> ${p.hinge}</div>
      <h4 class="sub">Misconceptions to expect</h4>
      <table class="compare"><thead><tr><th>Students may think…</th><th>Address it by…</th></tr></thead><tbody>${mis}</tbody></table>
      <div class="split" style="align-items:start"><div><h4 class="sub">Support</h4><p>${p.support}</p></div><div><h4 class="sub">Stretch</h4><p>${p.stretch}</p></div></div>
      <div class="homework"><strong>Homework:</strong> ${p.homework}</div>
    </section>`;
  }

  const book = document.createElement("main");
  book.className = "book guide";
  const lessons = only ? U.lessons.filter((l) => l.n === only) : U.lessons;
  book.innerHTML = (only ? "" : overview()) + lessons.map(plan).join("");
  document.body.appendChild(book);
})();
