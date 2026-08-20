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
      <section class="question-section">
        <div class="question-intro">
          <p class="eyebrow dark">Challenge set</p><h2>Think first.<br>Reveal second.</h2>
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
