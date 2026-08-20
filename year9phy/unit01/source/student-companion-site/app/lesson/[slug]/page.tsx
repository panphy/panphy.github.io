import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLesson, lessons } from "../../data";

export function generateStaticParams() {
  return lessons.map((lesson) => ({ slug: lesson.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const lesson = getLesson(slug);
  return lesson
    ? { title: `${lesson.shortTitle} | Work Like a Physicist`, description: lesson.intro }
    : {};
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) notFound();

  const index = lessons.findIndex((item) => item.slug === lesson.slug);
  const previous = index > 0 ? lessons[index - 1] : undefined;
  const next = index < lessons.length - 1 ? lessons[index + 1] : undefined;

  return (
    <main className={`lesson-page ${lesson.colour}`}>
      <nav className="topbar lesson-nav" aria-label="Lesson navigation">
        <a className="brand" href="/">
          <span className="brand-mark">WLP</span><span>Work Like a Physicist</span>
        </a>
        <a className="nav-pill" href="/#missions">All missions</a>
      </nav>

      <header className="lesson-hero">
        <div className="lesson-heading">
          <p className="eyebrow"><span>Mission {lesson.number}</span> · Skills lab</p>
          <h1>{lesson.title}</h1>
          <p>{lesson.intro}</p>
        </div>
        <div className="lesson-dossier">
          <span className="dossier-icon">{lesson.icon}</span>
          <p>Mission brief</p>
          <strong>{lesson.mission}</strong>
          <div className="dossier-rule">{lesson.keyRule}</div>
        </div>
      </header>

      <section className="unlock-strip" aria-label="Skills unlocked">
        <strong>Skills unlocked</strong>
        {lesson.unlocks.map((skill) => <span key={skill}>✓ {skill}</span>)}
      </section>

      <section className="question-section">
        <div className="question-intro">
          <p className="eyebrow dark">Challenge set</p>
          <h2>Think first.<br />Reveal second.</h2>
          <p>Say or write your answer before opening anything. Hints give you a nudge; answers show the science and the marks.</p>
          <div className="answer-code">
            <span>1</span><p><strong>Attempt</strong><br />Use what you remember.</p>
            <span>2</span><p><strong>Hint</strong><br />Open only if stuck.</p>
            <span>3</span><p><strong>Check</strong><br />Improve your answer.</p>
          </div>
        </div>

        <div className="question-list">
          {lesson.questions.map((question, questionIndex) => (
            <article className="question-card" key={questionIndex}>
              <div className="question-meta">
                <span className={question.type === "AQA-style" ? "exam-tag" : "practice-tag"}>{question.type}</span>
                {question.marks && <span className="marks">[{question.marks} marks]</span>}
                <span className="question-count">Q{questionIndex + 1}</span>
              </div>
              <h3>{question.prompt}</h3>
              <label className="working-area" htmlFor={`response-${lesson.slug}-${questionIndex}`}>
                <span className="working-label">
                  <strong>Your working and answer</strong>
                  <small>Type here before opening the hint or answer.</small>
                </span>
                <textarea
                  id={`response-${lesson.slug}-${questionIndex}`}
                  name={`response-${lesson.slug}-${questionIndex}`}
                  rows={question.marks && question.marks >= 5 ? 8 : question.type === "AQA-style" ? 6 : 4}
                  placeholder={question.type === "AQA-style" ? "Show each step and use precise scientific language…" : "Write your thinking here…"}
                />
              </label>
              <div className="reveal-row">
                <details className="reveal hint-reveal">
                  <summary><span>Hint</span><b>+</b></summary>
                  <div><p>{question.hint}</p></div>
                </details>
                <details className="reveal answer-reveal">
                  <summary><span>Answer</span><b>✓</b></summary>
                  <div><p>{question.answer}</p></div>
                </details>
              </div>
            </article>
          ))}
          <p className="exam-note">These are original AQA GCSE–styled practice questions, not official AQA assessment material.</p>
        </div>
      </section>

      <section className="checkpoint">
        <div className="checkpoint-stamp">CHECK<br />POINT</div>
        <div><p className="eyebrow">Mission complete?</p><h2>Can you explain the key rule without looking?</h2><p>{lesson.keyRule}</p></div>
      </section>

      <nav className="lesson-pagination" aria-label="Previous and next lessons">
        {previous ? <a href={`/lesson/${previous.slug}`}><span>← Previous mission</span><strong>{previous.shortTitle}</strong></a> : <a href="/"><span>← Unit home</span><strong>Evidence, not guesses</strong></a>}
        {next ? <a className="next-link" href={`/lesson/${next.slug}`}><span>Next mission →</span><strong>{next.shortTitle}</strong></a> : <a className="next-link" href="/"><span>Unit complete →</span><strong>Return to mission control</strong></a>}
      </nav>

      <footer>
        <div className="brand"><span className="brand-mark">WLP</span><span>Work Like a Physicist</span></div>
        <p>Attempt. Hint. Check. Improve.</p>
        <a href="/#missions">All missions ↑</a>
      </footer>
    </main>
  );
}
