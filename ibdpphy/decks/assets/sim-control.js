// Controls for the interactive figures of the IB DP Physics decks: a row with a label, a − button,
// a slider, a + button and the value. The buttons move by exact steps and repeat while held, so a
// physical quantity can be set precisely. Arrow keys and swipes on a control never turn the slide.
//
// control({ label, name, min, max, step, value, format, onChange }) returns the row element;
// `label` may hold math between \( and \), `name` is the plain name for screen readers, `format`
// turns a value into the text shown, and `row.set(value)` moves the control from code.
export function control({ label, name, min, max, step, value, format = String, onChange }) {
  const row = document.createElement('div');
  row.className = 'sim-row';
  row.innerHTML = `<span class="sim-label">${label}</span>`
    + `<button type="button" class="sim-step" data-dir="-1" aria-label="Decrease ${name}">−</button>`
    + `<input type="range" min="${min}" max="${max}" step="${step}" aria-label="${name}">`
    + `<button type="button" class="sim-step" data-dir="1" aria-label="Increase ${name}">+</button>`
    + '<output class="sim-value"></output>';
  const input = row.querySelector('input'), out = row.querySelector('output');
  const decimals = (String(step).split('.')[1] || '').length;
  let current = null, ready = false;
  const set = next => {
    next = Math.min(max, Math.max(min, Math.round(next / step) * step));
    next = Number(next.toFixed(decimals));
    if (next === current) return;
    current = next;
    input.value = next;
    out.textContent = format(next);
    input.setAttribute('aria-valuetext', format(next));
    row.querySelectorAll('.sim-step').forEach(button => { button.disabled = button.dataset.dir < 0 ? next <= min : next >= max; });
    if (ready) onChange?.(next);
  };
  input.addEventListener('input', () => set(Number(input.value)));

  // A press steps once; holding repeats, slowly at first.
  let timer = 0;
  const stop = () => { clearTimeout(timer); timer = 0; };
  row.querySelectorAll('.sim-step').forEach(button => {
    const dir = Number(button.dataset.dir);
    const repeat = delay => { timer = setTimeout(() => { set(current + dir * step); if (!button.disabled) repeat(Math.max(40, delay * 0.8)); else stop(); }, delay); };
    button.addEventListener('pointerdown', event => {
      if (event.button) return;
      button.setPointerCapture(event.pointerId);
      set(current + dir * step);
      stop();
      repeat(420);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => button.addEventListener(type, stop));
    // Enter and Space arrive as a click with no pointer.
    button.addEventListener('click', event => { if (event.detail === 0) set(current + dir * step); });
  });
  ['keydown', 'keyup', 'touchstart', 'touchmove', 'touchend', 'pointerdown', 'click', 'wheel'].forEach(type => row.addEventListener(type, event => event.stopPropagation()));
  row.set = set;
  set(value);
  ready = true;
  return row;
}

// A row of animation buttons: Play/Pause and Reset. onToggle(playing) runs on each press of the
// first button and onReset() on the second; `row.set(playing)` updates the first button from code
// (when a run ends, say). Keys and swipes on the buttons never turn the slide.
export function playback({ onToggle, onReset }) {
  const row = document.createElement('div');
  row.className = 'sim-buttons';
  row.innerHTML = '<button type="button" class="sim-button" data-k="play"></button><button type="button" class="sim-button" data-k="reset"><span aria-hidden="true">↺</span> Reset</button>';
  const play = row.querySelector('[data-k="play"]');
  let playing = false;
  const set = on => {
    playing = on;
    play.innerHTML = on ? '<span aria-hidden="true">❚❚</span> Pause' : '<span aria-hidden="true">▶</span> Play';
  };
  play.addEventListener('click', () => { set(!playing); onToggle?.(playing); });
  row.querySelector('[data-k="reset"]').addEventListener('click', () => { set(false); onReset?.(); });
  ['keydown', 'keyup', 'touchstart', 'touchmove', 'touchend', 'pointerdown', 'click', 'wheel'].forEach(type => row.addEventListener(type, event => event.stopPropagation()));
  row.set = set;
  set(false);
  return row;
}

// Typesets the math in an element once MathJax is ready; the slide's own math is done by then.
export const typeset = el => Promise.resolve(window.MathJax?.startup?.promise).then(() => window.MathJax?.typesetPromise?.([el])).catch(() => {});

// Waits until the deck has drawn the flat picture of a figure.
export const drawn = fig => new Promise(resolve => { const check = () => (fig.querySelector('svg') ? resolve() : setTimeout(check, 120)); check(); });
