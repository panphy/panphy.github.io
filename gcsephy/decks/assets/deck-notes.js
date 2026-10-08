// Revision notes for students, shown in a collapsible pane beneath the slide.
// A slide's note is written inside its <section> as
// <aside class="revision-note" hidden>…</aside>; slides without one show a
// placeholder. The pane starts collapsed on every load and, once opened,
// stays open from slide to slide. Each deck engine calls collect() before it
// builds thumbnails and show() whenever the slide changes.
(() => {
  const notes = new Map();
  const pane = document.createElement('aside');
  const toggle = document.createElement('button');
  const body = document.createElement('div');
  const empty = document.createElement('p');

  function setOpen(open) {
    document.body.classList.toggle('notes-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    body.hidden = !open;
  }

  function build() {
    pane.className = 'notes';
    pane.setAttribute('aria-label', 'Revision note');
    toggle.type = 'button';
    toggle.className = 'notes-toggle';
    toggle.title = 'Show or hide the revision note (N)';
    toggle.setAttribute('aria-controls', 'notes-body');
    toggle.innerHTML = '<svg class="notes-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 3.5h9l4 4V20a.5.5 0 0 1-.5.5h-12A.5.5 0 0 1 6 20z"/><path d="M9.5 12h6M9.5 16h4"/></svg><span class="notes-label">Revision note</span><span class="notes-none">None for this slide</span><svg class="notes-chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 15l6-6 6 6"/></svg>';
    body.id = 'notes-body';
    body.className = 'notes-body';
    body.tabIndex = 0;
    empty.className = 'notes-empty';
    empty.textContent = 'No revision note for this slide.';
    pane.append(toggle, body);
    const controls = document.querySelector('.controls');
    controls.parentNode.insertBefore(pane, controls);
    setOpen(false);
    toggle.addEventListener('click', () => setOpen(body.hidden));
    // With focus in the note these keys scroll it; left and right still change slide.
    body.addEventListener('keydown', event => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) event.stopPropagation();
    });
    document.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if ((event.key === 'n' || event.key === 'N') && !document.body.classList.contains('is-fullscreen')) setOpen(body.hidden);
    });
  }

  // Notes leave the slides, so they are not laid out at slide size or copied into thumbnails.
  function collect(slides) {
    slides.forEach(slide => {
      const note = slide.querySelector('.revision-note');
      if (!note) return;
      note.remove();
      note.hidden = false;
      notes.set(slide, note);
    });
    build();
  }

  function show(slide) {
    const note = notes.get(slide);
    pane.classList.toggle('is-empty', !note);
    body.replaceChildren(note || empty);
    body.scrollTop = 0;
  }

  window.DeckNotes = { collect, show };
})();
