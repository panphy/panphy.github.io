(function () {
  "use strict";

  const lessons = window.LESSONS || [];
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const lessonIndex = pathParts.lastIndexOf("lesson");
  const slug = lessonIndex >= 0 ? pathParts[lessonIndex + 1] : "";
  const lesson = lessons.find((item) => item.slug === slug);

  if (!lesson) {
    document.title = "Mission not found | Work Like a Physicist";
    document.body.innerHTML = '<main class="loading-message"><div><p>That mission could not be found.</p><p><a class="button primary" href="../../">Return to all missions</a></p></div></main>';
    return;
  }

  const index = lessons.findIndex((item) => item.slug === lesson.slug);
  const previous = index > 0 ? lessons[index - 1] : null;
  const next = index < lessons.length - 1 ? lessons[index + 1] : null;
  const description = document.querySelector('meta[name="description"]');
  document.title = `${lesson.shortTitle} | Work Like a Physicist`;
  if (description) description.content = lesson.intro;

  const skills = lesson.unlocks.map((skill) => `<span>✓ ${skill}</span>`).join("");
  const revision = lesson.revision;
  const workbookHref = `../../Work Like a Physicist - Year 9 Student Workbook.pdf#page=${revision.pageStart}`;
  const revisionCards = revision.sections.map((section, sectionIndex) => {
    const paragraphs = section.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("");
    const points = section.points?.length
      ? `<ul>${section.points.map((point) => `<li>${point}</li>`).join("")}</ul>`
      : "";
    const formula = section.formula
      ? `<div class="revision-formula"><span>Worked pattern</span><strong>${section.formula}</strong></div>`
      : "";
    const remember = section.remember
      ? `<p class="remember-note"><strong>Remember:</strong> ${section.remember}</p>`
      : "";

    return `
      <article class="revision-card">
        <div class="revision-card-heading"><span>${String(sectionIndex + 1).padStart(2, "0")}</span><h3>${section.title}</h3></div>
        <div class="revision-copy">${paragraphs}${points}${formula}${remember}</div>
      </article>`;
  }).join("");
  const vocabulary = revision.vocabulary.map(([term, definition]) => `
    <div class="vocabulary-item"><dt>${term}</dt><dd>${definition}</dd></div>`).join("");
  const questions = lesson.questions.map((question, questionIndex) => {
    const rows = question.marks && question.marks >= 5 ? 8 : question.type === "AQA-style" ? 6 : 4;
    const tagClass = question.type === "AQA-style" ? "exam-tag" : "practice-tag";
    const marks = question.marks ? `<span class="marks">[${question.marks} marks]</span>` : "";
    const placeholder = question.type === "AQA-style"
      ? "Show each step and use precise scientific language…"
      : "Write your thinking here…";

    return `
      <article class="question-card">
        <div class="question-meta">
          <span class="${tagClass}">${question.type}</span>${marks}
          <span class="question-count">Q${questionIndex + 1}</span>
        </div>
        <h3>${question.prompt}</h3>
        <label class="working-area" for="response-${lesson.slug}-${questionIndex}">
          <span class="working-label"><strong>Your working and answer</strong><small>Type here before opening the hint or answer.</small></span>
          <textarea id="response-${lesson.slug}-${questionIndex}" name="response-${lesson.slug}-${questionIndex}" rows="${rows}" placeholder="${placeholder}"></textarea>
        </label>
        <div class="reveal-row">
          <details class="reveal hint-reveal"><summary><span>Hint</span><b>+</b></summary><div><p>${question.hint}</p></div></details>
          <details class="reveal answer-reveal"><summary><span>Answer</span><b>✓</b></summary><div><p>${question.answer}</p></div></details>
        </div>
      </article>`;
  }).join("");

  const previousLink = previous
    ? `<a href="../${previous.slug}/"><span>← Previous mission</span><strong>${previous.shortTitle}</strong></a>`
    : '<a href="../../"><span>← Unit home</span><strong>Evidence, not guesses</strong></a>';
  const nextLink = next
    ? `<a class="next-link" href="../${next.slug}/"><span>Next mission →</span><strong>${next.shortTitle}</strong></a>`
    : '<a class="next-link" href="../../"><span>Unit complete →</span><strong>Return to mission control</strong></a>';

  document.body.innerHTML = `
    <main class="lesson-page ${lesson.colour}">
      <nav class="topbar lesson-nav" aria-label="Lesson navigation">
        <a class="brand" href="../../"><span class="brand-mark">WLP</span><span>Work Like a Physicist</span></a>
        <a class="nav-pill" href="../../#missions">All missions</a>
      </nav>
      <header class="lesson-hero">
        <div class="lesson-heading">
          <p class="eyebrow"><span>Mission ${lesson.number}</span> · Skills lab</p>
          <h1>${lesson.title}</h1><p>${lesson.intro}</p>
        </div>
        <div class="lesson-dossier">
          <span class="dossier-icon">${lesson.icon}</span><p>Mission brief</p><strong>${lesson.mission}</strong>
          <div class="dossier-rule">${lesson.keyRule}</div>
        </div>
      </header>
      <section class="unlock-strip" aria-label="Skills unlocked"><strong>Skills unlocked</strong>${skills}</section>
      <nav class="lesson-tools" aria-label="Use this mission">
        <a href="#revision"><span>01</span><strong>Revision notes</strong></a>
        <a href="#practice"><span>02</span><strong>Practice questions</strong></a>
        <a href="../../exam-zone/"><span>03</span><strong>Exam Zone</strong></a>
        <a href="${workbookHref}" target="_blank" rel="noopener"><span>PDF</span><strong>Workbook pp. ${revision.pageRange}</strong></a>
      </nav>
      <section class="revision-section" id="revision">
        <div class="revision-intro">
          <p class="eyebrow dark">Workbook-matched revision</p>
          <h2>Learn it.<br>Use it.</h2>
          <p>${revision.summary}</p>
          <a class="workbook-link" href="${workbookHref}" target="_blank" rel="noopener">Open workbook pages ${revision.pageRange} <span>↗</span></a>
          <div class="revision-route" aria-label="Three ways to use these notes">
            <p><strong>Lesson companion</strong><br>Read the matching card as you complete each workbook task.</p>
            <p><strong>Revision hub</strong><br>Cover the notes and explain each heading from memory.</p>
            <p><strong>Test preparation</strong><br>Use the exact scientific language in your practice answers.</p>
          </div>
        </div>
        <div class="revision-content">
          <div class="revision-grid">${revisionCards}</div>
          <section class="vocabulary-panel" aria-labelledby="vocabulary-title">
            <div><p class="eyebrow dark">Words that earn marks</p><h3 id="vocabulary-title">Key vocabulary</h3></div>
            <dl>${vocabulary}</dl>
          </section>
        </div>
      </section>
      <section class="question-section" id="practice">
        <div class="question-intro">
          <p class="eyebrow dark">After the notes</p><h2>Think first.<br>Reveal second.</h2>
          <p>Say or write your answer before opening anything. Hints give you a nudge; answers show the science and the marks.</p>
          <div class="answer-code">
            <span>1</span><p><strong>Attempt</strong><br>Use what you remember.</p>
            <span>2</span><p><strong>Hint</strong><br>Open only if stuck.</p>
            <span>3</span><p><strong>Check</strong><br>Improve your answer.</p>
          </div>
        </div>
        <div class="question-list">${questions}<p class="exam-note">These are original AQA GCSE–styled practice questions, not official AQA assessment material.</p></div>
      </section>
      <section class="checkpoint">
        <div class="checkpoint-stamp">CHECK<br>POINT</div>
        <div><p class="eyebrow">Mission complete?</p><h2>Can you explain the key rule without looking?</h2><p>${lesson.keyRule}</p></div>
      </section>
      <nav class="lesson-pagination" aria-label="Previous and next lessons">${previousLink}${nextLink}</nav>
      <footer>
        <div class="brand"><span class="brand-mark">WLP</span><span>Work Like a Physicist</span></div>
        <p>Attempt. Hint. Check. Improve.</p><a href="../../#missions">All missions ↑</a>
      </footer>
    </main>`;
})();
