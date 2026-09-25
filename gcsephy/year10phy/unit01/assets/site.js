(function () {
  "use strict";

  const lessons = window.LESSONS || [];
  const sub = window.Diagrams.sub;
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const lessonIndex = pathParts.lastIndexOf("lesson");
  const slug = lessonIndex >= 0 ? pathParts[lessonIndex + 1] : "";
  const lesson = lessons.find((item) => item.slug === slug);
  const LAB_PDF = "../../Y10 Electricity Virtual Labs.pdf";
  const PHET = "https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_all.html";
  const BRAND = '<span>Electric Circuits</span>';
  const PANPHY_FOOTER = `
        <div class="panphy-footer-row">
          <a class="panphy-home-link" href="/" aria-label="Visit the PanPhy Labs landing page"><img src="/assets/favicon.png" width="30" height="30" alt=""></a>
          <p>&copy; 2026 PanPhy Labs</p>
          <p class="panphy-footer-links"><a href="mailto:panphylabs@icloud.com">Contact Me</a><span class="footer-sep">·</span><a href="https://buymeacoffee.com/panphy" target="_blank" rel="noopener noreferrer">Support My Projects</a></p>
        </div>`;

  if (!lesson) {
    document.title = "Mission not found | Electric Circuits";
    document.body.innerHTML = '<main class="loading-message"><div><p>That mission could not be found.</p><p><a class="button primary" href="../../">Return to all missions</a></p></div></main>';
    return;
  }

  const index = lessons.findIndex((item) => item.slug === lesson.slug);
  const previous = index > 0 ? lessons[index - 1] : null;
  const next = index < lessons.length - 1 ? lessons[index + 1] : null;
  const description = document.querySelector('meta[name="description"]');
  document.title = `${lesson.shortTitle} | Electric Circuits`;
  if (description) description.content = lesson.intro;

  const revision = lesson.revision;
  const skills = lesson.unlocks.map((skill) => `<span>✓ ${sub(skill)}</span>`).join("");
  const labHref = lesson.lab ? `${LAB_PDF}#page=${lesson.lab.page}` : "";

  const equationBlock = (eq) => eq ? `
    <div class="equation-block">
      <span class="eq">${sub(eq.eq)}</span>
      <span class="eq-words">${sub(eq.words)}</span>
      <span class="eq-units">${eq.units}</span>
      ${eq.flag ? `<span class="eq-flag">${eq.flag}</span>` : ""}
    </div>` : "";

  const revisionCards = revision.sections.map((section, sectionIndex) => {
    const paragraphs = section.paragraphs.map((paragraph) => `<p>${sub(paragraph)}</p>`).join("");
    const points = section.points?.length
      ? `<ul>${section.points.map((point) => `<li>${sub(point)}</li>`).join("")}</ul>`
      : "";
    const formula = section.formula
      ? `<div class="revision-formula"><span>Worked example</span><strong>${sub(section.formula)}</strong></div>`
      : "";
    const remember = section.remember
      ? `<p class="remember-note"><strong>Remember:</strong> ${sub(section.remember)}</p>`
      : "";
    const ht = section.ht ? '<span class="ht-flag">HT</span>' : "";

    return `
      <article class="revision-card">
        <div class="revision-card-heading"><span>${String(sectionIndex + 1).padStart(2, "0")}</span><h3>${sub(section.title)}${ht}</h3></div>
        <div class="revision-copy">${paragraphs}${equationBlock(section.equation)}${section.figure || ""}${points}${formula}${remember}</div>
      </article>`;
  }).join("");

  const mistakes = revision.mistakes?.length ? `
    <section class="mistakes-panel" aria-labelledby="mistakes-title">
      <p class="eyebrow dark">Marks lost every year</p>
      <h3 id="mistakes-title">Common mistakes</h3>
      ${revision.mistakes.map(([wrong, right]) => `<div class="mistake-row"><p class="wrong">${sub(wrong)}</p><p class="right">${sub(right)}</p></div>`).join("")}
    </section>` : "";

  const further = revision.goFurther ? `
    <section class="further-panel" aria-labelledby="further-title">
      <p class="further-kicker">${revision.goFurther.kicker}</p>
      <h3 id="further-title">${revision.goFurther.title}</h3>
      <div class="revision-copy">${sub(revision.goFurther.html)}</div>
    </section>` : "";

  const vocabulary = revision.vocabulary.map(([term, definition]) => `
    <div class="vocabulary-item"><dt>${term}</dt><dd>${sub(definition)}</dd></div>`).join("");

  const questions = lesson.questions.map((question, questionIndex) => {
    const isExam = question.type === "AQA-style";
    const rows = question.marks && question.marks >= 5 ? 8 : isExam ? 6 : 4;
    const tagClass = isExam ? "exam-tag" : question.type === "Go further" ? "further-tag" : "practice-tag";
    const marks = question.marks ? `<span class="marks">[${question.marks} mark${question.marks === 1 ? "" : "s"}]</span>` : "";
    const tier = question.tier ? `<span class="tier-tag">${question.tier === "HT" ? "Higher tier" : question.tier}</span>` : "";
    const placeholder = isExam
      ? "Show each step and use precise scientific language…"
      : "Write your thinking here…";
    const stimulus = question.stimulus ? `<div class="question-stimulus">${question.stimulus}</div>` : "";
    const options = question.options
      ? `<ol class="mcq-options">${question.options.map((option, i) => `<li><b>${"ABCD"[i]}</b>${sub(option)}</li>`).join("")}</ol>`
      : "";

    return `
      <article class="question-card">
        <div class="question-meta">
          <span class="${tagClass}">${question.type}</span>${tier}${marks}
          <span class="question-count">Q${questionIndex + 1}</span>
        </div>
        ${stimulus}${question.figure || ""}
        <h3>${sub(question.prompt)}</h3>${options}
        <label class="working-area" for="response-${lesson.slug}-${questionIndex}">
          <span class="working-label"><strong>Your working and answer</strong><small>Type here before opening the hint or answer.</small></span>
          <textarea id="response-${lesson.slug}-${questionIndex}" name="response-${lesson.slug}-${questionIndex}" rows="${rows}" placeholder="${placeholder}"></textarea>
        </label>
        <div class="reveal-row">
          <details class="reveal hint-reveal"><summary><span>Hint</span><b>+</b></summary><div><p>${sub(question.hint)}</p></div></details>
          <details class="reveal answer-reveal"><summary><span>Answer</span><b>✓</b></summary><div><p>${sub(question.answer)}</p></div></details>
        </div>
      </article>`;
  }).join("");

  const previousLink = previous
    ? `<a href="../${previous.slug}/"><span>← Previous mission</span><strong>${previous.shortTitle}</strong></a>`
    : '<a href="../../"><span>← Unit home</span><strong>Follow the charge</strong></a>';
  const nextLink = next
    ? `<a class="next-link" href="../${next.slug}/"><span>Next mission →</span><strong>${next.shortTitle}</strong></a>`
    : '<a class="next-link" href="../../exam-zone/"><span>Unit complete →</span><strong>Enter the Exam Zone</strong></a>';

  const phetTool = `<a href="${PHET}" target="_blank" rel="noopener"><span>Sim</span><strong>PhET circuit lab</strong></a>`;
  const fourthTool = lesson.lab
    ? `<a href="${labHref}" target="_blank" rel="noopener"><span>PDF</span><strong>${lesson.lab.label} · pp. ${lesson.lab.range}</strong></a>`
    : lesson.phet ? phetTool : "";
  const labLink = [
    lesson.lab ? `<a class="workbook-link" href="${labHref}" target="_blank" rel="noopener">Virtual labs pp. ${lesson.lab.range} <span>↗</span></a>` : "",
    lesson.phet ? `<a class="workbook-link" href="${PHET}" target="_blank" rel="noopener">Try it in PhET <span>↗</span></a>` : ""
  ].join("");

  document.body.innerHTML = `
    <main class="lesson-page ${lesson.colour}">
      <nav class="topbar lesson-nav" aria-label="Lesson navigation">
        <a class="brand" href="../../">${BRAND}</a>
        <a class="nav-pill" href="../../#missions">All missions</a>
      </nav>
      <header class="lesson-hero">
        <div class="lesson-heading">
          <p class="eyebrow"><span>Mission ${lesson.number}</span> · Year 10 physics</p>
          <h1>${lesson.title}</h1><p>${lesson.intro}</p>
          <span class="spec-chip">${lesson.spec}</span>
        </div>
        <div class="lesson-dossier">
          <span class="dossier-icon">${lesson.icon}</span><p>Mission brief</p><strong>${lesson.mission}</strong>
          <div class="dossier-rule">${sub(lesson.keyRule)}</div>
        </div>
      </header>
      <section class="unlock-strip" aria-label="Skills unlocked"><strong>Skills unlocked</strong>${skills}</section>
      <nav class="lesson-tools${fourthTool ? "" : " three-tools"}" aria-label="Use this mission">
        <a href="#revision"><span>01</span><strong>Revision notes</strong></a>
        <a href="#practice"><span>02</span><strong>Practice questions</strong></a>
        <a href="../../exam-zone/"><span>03</span><strong>Exam Zone</strong></a>
        ${fourthTool}
      </nav>
      <section class="revision-section" id="revision">
        <div class="revision-intro">
          <p class="eyebrow dark">Key ideas</p>
          <h2>Learn it.<br>Use it.</h2>
          <p>${revision.summary}</p>
          ${labLink}
          <div class="revision-route" aria-label="Three ways to use these notes">
            <p><strong>In the lesson</strong><br>Read the matching card before each lab task.</p>
            <p><strong>Revising</strong><br>Cover a card and explain its heading from memory.</p>
            <p><strong>Before a test</strong><br>Write every equation from memory, with units.</p>
          </div>
        </div>
        <div class="revision-content">
          <div class="revision-grid">${revisionCards}</div>
          ${mistakes}
          ${further}
          <section class="vocabulary-panel" aria-labelledby="vocabulary-title">
            <div><p class="eyebrow dark">Words that earn marks</p><h3 id="vocabulary-title">Key vocabulary</h3></div>
            <dl>${vocabulary}</dl>
          </section>
        </div>
      </section>
      <section class="question-section" id="practice">
        <div class="question-intro">
          <p class="eyebrow dark">After the notes</p><h2>Think first.<br>Reveal second.</h2>
          <p>Write your answer before opening anything. For calculations, write the equation, substitute, then give the answer with a unit.</p>
          <div class="answer-code">
            <span>1</span><p><strong>Attempt</strong><br>Use what you remember.</p>
            <span>2</span><p><strong>Hint</strong><br>Open only if stuck.</p>
            <span>3</span><p><strong>Check</strong><br>Improve your answer.</p>
          </div>
        </div>
        <div class="question-list">${questions}<p class="exam-note">These are original AQA GCSE-style practice questions, not official AQA assessment material.</p></div>
      </section>
      <section class="checkpoint">
        <div class="checkpoint-stamp">CHECK<br>POINT</div>
        <div><p class="eyebrow">Mission complete?</p><h2>Can you explain the key rule without looking?</h2><p>${sub(lesson.keyRule)}</p></div>
      </section>
      <nav class="lesson-pagination" aria-label="Previous and next lessons">${previousLink}${nextLink}</nav>
      <footer class="site-footer">
        <div class="unit-footer-row">
          <div class="brand">${BRAND}</div>
          <p>Follow the charge. Track the energy.</p><a href="../../#missions">All missions ↑</a>
        </div>${PANPHY_FOOTER}
      </footer>
    </main>`;
})();
