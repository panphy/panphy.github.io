// Step-by-step question sets with saved progress.
// A question is complete once answered correctly; a star needs a first-try answer
// without revealing it.

const STORAGE_KEY = 'nuclear-decay-progress';

export function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === 'object') return saved;
  } catch {
    // Storage can be unavailable or corrupt; start fresh.
  }
  return {};
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Progress still works for this visit without storage.
  }
}

export function setSummary(progress, key, questions) {
  const answers = progress[key] || [];
  const done = questions.filter((_, i) => answers[i]).length;
  const stars = questions.filter((_, i) => answers[i] === 'star').length;
  return { done, stars, total: questions.length, complete: done === questions.length };
}

// Inline SVG icons, drawn in the current text colour.
const ICONS = {
  trophy: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M8 20h8M9.5 18h5"/></svg>'
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export class Quiz {
  constructor(root, { questionSets, progress, title, completeText, completeIcon, onChange }) {
    this.root = root;
    this.questionSets = questionSets;
    this.progress = progress;
    this.title = title;
    this.completeText = completeText;
    this.completeIcon = ICONS[completeIcon] || '';
    this.onChange = onChange;
    this.viewIndex = {};
    this.key = null;

    const head = el('div', 'q-head');
    this.heading = el('h3', '', title);
    this.count = el('span', 'q-count');
    head.append(this.heading, this.count);
    this.text = el('p', 'q-text');
    this.choices = el('div', 'choices');
    this.feedback = el('p', 'feedback');
    this.feedback.setAttribute('role', 'status');
    const actions = el('div', 'q-actions');
    this.revealButton = el('button', 'link-button', 'Show me the answer');
    this.revealButton.type = 'button';
    this.nextButton = el('button', 'next-button', 'Next question →');
    this.nextButton.type = 'button';
    actions.append(this.revealButton, this.nextButton);
    this.dots = el('div', 'q-dots');
    this.dots.setAttribute('aria-hidden', 'true');
    root.replaceChildren(head, this.text, this.choices, this.feedback, actions, this.dots);

    this.revealButton.addEventListener('click', () => this.reveal());
    this.nextButton.addEventListener('click', () => this.next());
  }

  show(key) {
    this.key = key;
    const questions = this.questionSets[key];
    if (this.viewIndex[key] === undefined) {
      this.viewIndex[key] = setSummary(this.progress, key, questions).complete ? questions.length : 0;
    }
    this.render();
  }

  answers() {
    if (!this.progress[this.key]) this.progress[this.key] = [];
    return this.progress[this.key];
  }

  render() {
    const questions = this.questionSets[this.key];
    const index = this.viewIndex[this.key];
    const answers = this.progress[this.key] || [];
    this.attempts = 0;
    this.revealed = false;
    this.feedback.textContent = '';
    this.revealButton.hidden = true;
    this.choices.replaceChildren();
    this.dots.replaceChildren(...questions.map((_, i) => {
      const dot = el('span', answers[i] === 'star' ? 'star' : answers[i] ? 'done' : '');
      dot.textContent = answers[i] === 'star' ? '★' : answers[i] ? '●' : '○';
      if (i === index) dot.classList.add('current');
      return dot;
    }));

    if (index >= questions.length) {
      const { stars, total } = setSummary(this.progress, this.key, questions);
      this.heading.textContent = this.completeText;
      if (this.completeIcon) this.heading.insertAdjacentHTML('afterbegin', `${this.completeIcon} `);
      this.count.textContent = `${'★'.repeat(stars)}${'☆'.repeat(total - stars)}`;
      this.count.setAttribute('aria-label', `${stars} of ${total} answered correctly first time`);
      this.text.textContent = stars === total
        ? 'Every question answered correctly first time. Brilliant work!'
        : `${stars} of ${total} answered correctly first time. Try again for more stars.`;
      this.nextButton.textContent = 'Try the questions again';
      this.nextButton.hidden = false;
      return;
    }

    const question = questions[index];
    this.heading.textContent = this.title;
    this.count.textContent = `Question ${index + 1} of ${questions.length}`;
    this.count.removeAttribute('aria-label');
    this.text.textContent = question.q;
    this.nextButton.hidden = true;
    question.choices.forEach((label, choiceIndex) => {
      const button = el('button', '', label);
      button.type = 'button';
      button.addEventListener('click', () => this.answer(button, choiceIndex));
      this.choices.appendChild(button);
    });
  }

  answer(button, choiceIndex) {
    const questions = this.questionSets[this.key];
    const index = this.viewIndex[this.key];
    const question = questions[index];
    if (choiceIndex !== question.correct) {
      this.attempts += 1;
      button.dataset.result = 'retry';
      button.disabled = true;
      this.feedback.textContent = `Look again: ${question.hint}`;
      this.revealButton.hidden = this.revealed;
      return;
    }
    const answers = this.answers();
    const firstTry = this.attempts === 0 && !this.revealed;
    answers[index] = firstTry || answers[index] === 'star' ? 'star' : 'done';
    button.dataset.result = 'correct';
    for (const choice of this.choices.children) choice.disabled = true;
    this.feedback.textContent = `${firstTry ? '★ Correct first time!' : '✦ Correct!'} ${question.why}`;
    this.revealButton.hidden = true;
    this.nextButton.textContent = index === questions.length - 1 ? 'Finish ✦' : 'Next question →';
    this.nextButton.hidden = false;
    this.dots.children[index].textContent = answers[index] === 'star' ? '★' : '●';
    this.dots.children[index].className = `${answers[index]} current`;
    this.onChange?.(this.key);
    this.nextButton.focus({ preventScroll: true });
  }

  reveal() {
    const question = this.questionSets[this.key][this.viewIndex[this.key]];
    this.revealed = true;
    this.choices.children[question.correct].dataset.result = 'reveal';
    this.feedback.textContent = 'The answer is highlighted. Choose it to continue (no star this time).';
    this.revealButton.hidden = true;
  }

  next() {
    const questions = this.questionSets[this.key];
    const index = this.viewIndex[this.key];
    this.viewIndex[this.key] = index >= questions.length ? 0 : index + 1;
    this.render();
    this.choices.firstElementChild?.focus({ preventScroll: true });
  }

  resetView() {
    this.viewIndex = {};
    if (this.key) this.show(this.key);
  }
}
