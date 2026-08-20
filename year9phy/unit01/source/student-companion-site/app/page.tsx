import { lessons } from "./data";

export default function Home() {
  return (
    <main>
      <nav className="topbar" aria-label="Main navigation">
        <a className="brand" href="/" aria-label="Work Like a Physicist home">
          <span className="brand-mark">WLP</span>
          <span>Work Like a Physicist</span>
        </a>
        <a className="nav-pill" href="#missions">Explore missions ↓</a>
      </nav>

      <section className="hero">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy">
          <p className="eyebrow"><span>Year 9 physics</span> · 8-lesson field mission</p>
          <h1>Evidence.<br /><em>Not guesses.</em></h1>
          <p className="hero-intro">
            Anyone can have an opinion about how the world works. A physicist produces
            evidence that other people can trust—even when the data gets messy.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#missions">Choose a mission <span>↘</span></a>
            <div className="hero-stat"><strong>28</strong><span>practice & exam questions</span></div>
          </div>
        </div>

        <div className="evidence-machine" aria-label="A visual summary of the scientific process">
          <div className="machine-note note-one">repeat × 3</div>
          <div className="machine-note note-two">plot the mean</div>
          <div className="plot-card">
            <div className="plot-label">THE PATTERN</div>
            <div className="chart" aria-hidden="true">
              <span className="point p1" /><span className="point p2" />
              <span className="point p3" /><span className="point p4" />
              <span className="point p5" /><span className="point outlier" />
              <span className="trend" />
            </div>
            <p>Find the signal.<br />Challenge the odd point.</p>
          </div>
          <div className="stamp">TRUST<br />THE<br />DATA?</div>
        </div>
      </section>

      <section className="manifesto">
        <div><span className="big-number">01</span><p><strong>Measure</strong><br />Take readings you can defend.</p></div>
        <div><span className="big-number">02</span><p><strong>Question</strong><br />Find the errors hiding in the data.</p></div>
        <div><span className="big-number">03</span><p><strong>Reveal</strong><br />Use a graph to make the pattern visible.</p></div>
        <div><span className="big-number">04</span><p><strong>Defend</strong><br />Build a conclusion from evidence.</p></div>
      </section>

      <section className="missions" id="missions">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">Your field notebook, online</p>
            <h2>Choose your mission</h2>
          </div>
          <p>Start with your current lesson, revisit a tricky skill or work through the full investigation journey.</p>
        </div>

        <div className="mission-grid">
          {lessons.map((lesson, index) => (
            <a className={`mission-card ${lesson.colour}`} href={`/lesson/${lesson.slug}`} key={lesson.slug}>
              <div className="mission-card-top">
                <span className="lesson-number">{lesson.number}</span>
                <span className="lesson-icon" aria-hidden="true">{lesson.icon}</span>
              </div>
              <p className="mission-label">Mission {index + 1}</p>
              <h3>{lesson.shortTitle}</h3>
              <p>{lesson.mission}</p>
              <div className="card-footer">
                <span>{lesson.questions.length} challenges</span>
                <span className="arrow">→</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="exam-zone">
        <div className="exam-badge">EXAM<br />ZONE</div>
        <div>
          <p className="eyebrow">Practise like it counts</p>
          <h2>Build the answer.<br />Earn the marks.</h2>
        </div>
        <p>
          Every mission includes original AQA GCSE–styled questions. Use the hint only when you
          need it, write your answer first, then reveal the marking points.
        </p>
        <a className="button light" href={`/lesson/${lessons[0].slug}`}>Start practising <span>→</span></a>
      </section>

      <footer>
        <div className="brand"><span className="brand-mark">WLP</span><span>Work Like a Physicist</span></div>
        <p>Measure carefully. Think critically. Follow the evidence.</p>
        <a href="#top">Back to top ↑</a>
      </footer>
    </main>
  );
}
