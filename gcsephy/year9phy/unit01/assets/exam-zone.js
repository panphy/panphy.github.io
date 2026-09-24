(function () {
  "use strict";

  const questions = window.EXAM_QUESTIONS || [];
  const totalMarks = questions.reduce((sum, question) => sum + question.marks, 0);

  if (!questions.length) {
    document.body.innerHTML = '<main class="loading-message"><div><p>Exam Zone could not be loaded.</p><p><a class="button primary" href="../">Return to mission control</a></p></div></main>';
    return;
  }

  let currentSection = "";
  const questionCards = questions.map((question, index) => {
    const sectionHeading = question.section !== currentSection
      ? `<div class="question-divider"><span>${question.section}</span></div>`
      : "";
    currentSection = question.section;
    const rows = Math.min(7, Math.max(4, question.marks + 1));
    const stimulus = question.stimulus ? `<div class="question-stimulus">${question.stimulus}</div>` : "";

    return `${sectionHeading}
      <article class="question-card exam-question-card">
        <div class="question-meta">
          <span class="exam-tag">AQA-style</span>
          <span class="skill-tag">${question.skill}</span>
          <span class="marks">[${question.marks} marks]</span>
          <span class="question-count">Q${index + 1}</span>
        </div>
        ${stimulus}
        <h3>${question.prompt}</h3>
        <label class="working-area" for="exam-response-${index}">
          <span class="working-label"><strong>Your working and answer</strong><small>Attempt every part before revealing help.</small></span>
          <textarea id="exam-response-${index}" name="exam-response-${index}" rows="${rows}" placeholder="Show your working and use precise scientific language…"></textarea>
        </label>
        <div class="reveal-row">
          <details class="reveal hint-reveal"><summary><span>Hint</span><b>+</b></summary><div><p>${question.hint}</p></div></details>
          <details class="reveal answer-reveal"><summary><span>Marking points</span><b>✓</b></summary><div><p>${question.answer}</p></div></details>
        </div>
      </article>`;
  }).join("");

  document.body.innerHTML = `
    <main class="lesson-page coral exam-page">
      <nav class="topbar lesson-nav" aria-label="Exam Zone navigation">
        <a class="brand" href="../"><span class="brand-mark">WLP</span><span>Work Like a Physicist</span></a>
        <a class="nav-pill" href="../#missions">All missions</a>
      </nav>
      <header class="lesson-hero exam-hero">
        <div class="lesson-heading">
          <p class="eyebrow"><span>Independent revision</span> · Fresh challenge set</p>
          <h1>Exam Zone</h1>
          <p>Different questions. Different data. The same scientific habits you will need when the context changes.</p>
        </div>
        <div class="lesson-dossier">
          <span class="dossier-icon">${questions.length}</span>
          <p>Revision brief</p>
          <strong>${totalMarks} marks to earn</strong>
          <div class="dossier-rule">None of these questions appears in a mission. Attempt first, use a hint only if needed, then improve with the marking points.</div>
        </div>
      </header>
      <section class="unlock-strip" aria-label="Exam Zone summary">
        <strong>Exam Zone</strong><span>✓ ${questions.length} fresh questions</span><span>✓ ${totalMarks} marks</span><span>✓ calculations to six-mark methods</span>
      </section>
      <section class="question-section exam-question-section">
        <div class="question-intro">
          <p class="eyebrow dark">Your revision bank</p>
          <h2>Attempt.<br>Check.<br>Improve.</h2>
          <p>These questions practise the same core skills in unfamiliar situations. That transfer is what makes revision useful.</p>
          <div class="answer-code">
            <span>1</span><p><strong>Attempt</strong><br>Answer every part unaided.</p>
            <span>2</span><p><strong>Hint</strong><br>Use one nudge if stuck.</p>
            <span>3</span><p><strong>Mark</strong><br>Check each marking point.</p>
            <span>4</span><p><strong>Improve</strong><br>Edit your answer in another colour.</p>
          </div>
        </div>
        <div class="question-list">${questionCards}<p class="exam-note">These are original AQA GCSE-style revision questions, not official AQA assessment material.</p></div>
      </section>
      <section class="checkpoint">
        <div class="checkpoint-stamp">FINAL<br>CHECK</div>
        <div><p class="eyebrow">Revision complete?</p><h2>Can you apply the skill when the context changes?</h2><p>Return to any answer where you missed a marking point, then explain the correction aloud without looking.</p></div>
      </section>
      <nav class="lesson-pagination" aria-label="Continue revising">
        <a href="../#missions"><span>← Choose a mission</span><strong>Review one skill</strong></a>
        <a class="next-link" href="../#resources"><span>Use your workbook →</span><strong>Record your progress</strong></a>
      </nav>
      <footer class="site-footer">
        <div class="unit-footer-row">
          <div class="brand"><span class="brand-mark">WLP</span><span>Work Like a Physicist</span></div>
          <p>Attempt. Hint. Mark. Improve.</p><a href="#top">Back to top ↑</a>
        </div>
        <div class="panphy-footer-row">
          <a class="panphy-home-link" href="/" aria-label="Visit the PanPhy Labs landing page"><img src="/assets/favicon.png" width="30" height="30" alt=""></a>
          <p>&copy; 2026 PanPhy Labs</p>
          <p class="panphy-footer-links"><a href="mailto:panphylabs@icloud.com">Contact Me</a><span class="footer-sep">·</span><a href="https://buymeacoffee.com/panphy" target="_blank" rel="noopener noreferrer">Support My Projects</a></p>
        </div>
      </footer>
    </main>`;
  document.body.id = "top";
})();
