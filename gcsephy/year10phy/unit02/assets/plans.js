/* Renders the teacher guide from window.UNIT (reference.js) and window.PLANS (plans-data.js).
   teacher-guide.html shows every plan; ?lesson=N shows one. */
(function () {
  "use strict";

  const U = window.UNIT;
  const P = window.PLANS;
  const only = Number(new URLSearchParams(location.search).get("lesson")) || 0;

  const style = document.createElement("style");
  style.textContent = '@page { @bottom-left { content: "Particle Model of Matter, Year 10 teacher guide, © 2026 PanPhy Labs. All rights reserved."; } }';
  document.head.appendChild(style);
  document.title = only ? `Lesson ${only} plan | Particle Model of Matter` : "Particle Model of Matter - Year 10 Teacher Guide";

  const list = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;

  function overview() {
    const rows = U.lessons.map((l) => `<tr><td>${l.n}</td><td><strong>${l.title}</strong><br><span style="color:#56606e">${l.mapLine}</span></td><td>${P[l.n].week}</td><td>${l.slides}</td></tr>`).join("");
    return `<section>
      <div class="eyebrow">Year 10 Physics, AQA GCSE Physics (8463) and Combined Science: Trilogy (8464)</div>
      <h1 class="page-title">Particle Model of Matter: Teacher guide</h1>
      <p class="page-intro">Eight 50-minute lessons over four weeks, for AQA Physics 4.3 (with 4.1.1.3) and Combined Science 6.3 (with 6.1.1.3). Each lesson has its own booklet in the student workbook and its own section of the teaching deck.</p>
      <h4 class="sub">How the resources fit together</h4>
      <table class="compare"><thead><tr><th>Resource</th><th>Used for</th></tr></thead><tbody>
        <tr><th>Teaching deck</th><td>52 slides with revision notes (press N). Slides 3–46 are for every class. Slides 47–52, after the Key words slide, are flagged <strong>Triple Science only</strong>: pressure and volume (\\(p\\,V = \\text{constant}\\)) and doing work on a gas.</td></tr>
        <tr><th>Student workbook</th><td>One booklet per lesson (12 pt text, wide writing lines), each with the toolkit so far, its key words and quick answers. Every lesson: Do now, explanations, the slide examples to fill in with “Your turn”, graded practice, practical records, exam questions and a revision box.</td></tr>
        <tr><th>Answer edition</th><td>The same pages and page numbers as each booklet, with answers in blue. For marking, or for students to mark their own work.</td></tr>
        <tr><th>Unit review</th><td>${U.review.reduce((s, q) => s + (q.marks || 0), 0)} marks of mixed exam practice, a fix-it log, the toolkit, all the key words and a progress tracker. Its last pages are the Triple Science only extension, matching deck slides 47–52.</td></tr>
        <tr><th>Preps</th><td>Four one-page homework sheets, each out of 10, set after Lessons 2, 4, 6 and 8: three Do Now bank questions on earlier learning, then questions on the two latest lessons.</td></tr>
      </tbody></table>
      <h4 class="sub">Design principles</h4>
      ${list([
        "<strong>One model, used again and again.</strong> Lesson 1 sets up the particle diagrams; every later lesson explains its new idea (pressure, density, internal energy, latent heat) with the same particles.",
        "<strong>Follow along, your turn, faded practice.</strong> Every worked example on a slide is printed blank at the same point in the workbook, tagged with its slide number, so students fill it in while you model it; a parallel ‘Your turn’ with new numbers sits beside it, and the answers are only in the answer edition. Each checkpoint slide (Quick check) has its own box in the workbook, at the end of Lessons 2, 4, 6 and 8. Calculations then go from a full frame (Equation, Substitute, Answer) to no frame to a challenge. The equation is always written in symbols before any number is substituted.",
        "<strong>Every blank shows its options.</strong> Gap-fill sentences print the choices after the gap, and ring boxes follow the AQA format.",
        "<strong>Both required practicals have their own lesson</strong>, with the workbook as the lab sheet. The specific heat capacity practical measures energy with an ammeter, voltmeter and stopwatch (\\(E = V\\,I\\,t\\)), which revisits Electric Circuits; the joulemeter is shown as the alternative, because exam questions use either.",
        "<strong>Retrieval every lesson.</strong> “Do now” questions revisit earlier lessons and Electric Circuits; “Revise it” gives cover-and-answer questions with quick answers at the back.",
        "<strong>Equations are still taught for understanding.</strong> AQA provides the full Physics Equations Sheet in every paper, which includes \\(\\rho = m \\div V\\), \\(\\Delta E = m\\,c\\,\\Delta\\theta\\), \\(E = m\\,L\\) and \\(p\\,V = \\text{constant}\\). Students still need the meaning of each symbol, the units and the rearrangements.",
        "<strong>Higher-tier content is not marked.</strong> Both courses are taught at Higher. Only Physics-only content is flagged, as “Triple only”.",
      ])}
      <h4 class="sub">Sequence</h4>
      <table class="route"><thead><tr><th>#</th><th>Lesson</th><th>Week</th><th>Slides</th></tr></thead><tbody>${rows}</tbody></table>
      <p style="margin-top:2mm">The Scheme of Work places P3.1–P3.3 in weeks 1–2 and P3.4–P3.5 in weeks 3–4. With both required practicals given a full lesson, internal energy (P3.3) is the first lesson of week 3. Triple Science classes need one extra lesson for slides 47–52 and the extension pages of the Unit review.</p>
    </section>`;
  }

  function plan(l) {
    const p = P[l.n];
    const timing = p.timing.map(([a, b, phase, what]) => `<tr><td>${a}–${b}</td><td><strong>${phase}</strong></td><td>${what}</td></tr>`).join("");
    const mis = p.misconceptions.map(([m, fix]) => `<tr><td>${m}</td><td>${fix}</td></tr>`).join("");
    return `<section class="lesson" style="--accent:var(--${l.accent});--accent-t:var(--${l.accent}-t)">
      <header class="opener"><div class="num"><small>Lesson</small>${String(l.n).padStart(2, "0")}</div>
      <div><h2>${l.title}</h2><div class="spec">${l.spec}; 50 minutes; deck slides ${l.slides}</div></div><div class="big-q">${l.big}</div></header>
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

  const ready = () => { document.body.dataset.ready = "1"; };
  const mj = window.MathJax;
  if (mj && mj.startup && mj.startup.promise) mj.startup.promise.then(() => mj.typesetPromise([book])).then(ready, ready);
  else ready();
})();
