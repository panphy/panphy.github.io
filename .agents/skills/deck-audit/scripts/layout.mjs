#!/usr/bin/env node
// Layout check for teaching decks, with every step shown at 1600 × 900: lists typeset math that sticks
// out of its box (a work panel, worked example, card, panel or the slide) and slides whose content comes
// within MIN_GAP px of the footer or runs into it. Revision notes are skipped. Run it after edits that
// make lines longer or add lines, and compare with main if an item looks old.
//   node .agents/skills/deck-audit/scripts/layout.mjs [deck/index.html ...]   (default: every deck)
// Needs Chrome, like the repository's page checks (.github/scripts/headless.mjs).
import { execFileSync } from 'node:child_process';
import { ROOT, checkPages } from '../../../../.github/scripts/headless.mjs';

const MIN_GAP = 12;
const named = process.argv.slice(2);
const decks = named.length ? named : execFileSync('git', ['ls-files', 'gcsephy/decks/*/index.html', 'ibdpphy/decks/*/index.html'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);

function measure({ minGap }) {
  const style = document.createElement('style');
  style.textContent = '.slide, .step { visibility: visible !important; opacity: 1 !important; transition: none !important; }';
  document.head.append(style);
  const slides = [...document.querySelectorAll('.deck .slide, .slides .slide, main .slide')].filter((slide, i, all) => !slide.closest('.thumb-slide') && all.indexOf(slide) === i);
  slides.forEach((slide) => slide.querySelectorAll('.step').forEach((step) => step.classList.add('shown')));
  // Slide furniture that sits at the edges by design, as in deck-check.mjs, and the notes.
  const FURNITURE = '.slide-foot, .slide-copyright, .year-badge, .triple-flag, .triple-tag, .hl-tag, .not-examined, .credit, .credits, aside, .revision-note, .thumb-slide';
  const found = [];
  slides.forEach((slide, i) => {
    const box = slide.getBoundingClientRect();
    if (!box.width) return;
    const scale = slide.offsetWidth / box.width;
    const name = `s${i + 1} [${slide.dataset.title || ''}]`;
    slide.querySelectorAll('mjx-container').forEach((math) => {
      if (math.closest('aside, .revision-note')) return;
      const holder = math.closest('.work, .worked, .card, .panel, .q, .idea, .equation, .stack, .slide');
      const over = Math.round((math.getBoundingClientRect().right - holder.getBoundingClientRect().right) * scale);
      if (over > 1) found.push(`${name} math sticks out of .${holder.className.split(' ')[0]} by ${over}px: ${(math.querySelector('mjx-assistive-mml')?.textContent || '').slice(0, 60)}`);
    });
    const foot = slide.querySelector('.slide-foot');
    if (!foot) return;
    const footTop = foot.getBoundingClientRect().top;
    let lowest = 0;
    for (const el of slide.querySelectorAll('*')) {
      if (el.closest(FURNITURE) || el.children.length) continue;
      const rect = el.getBoundingClientRect();
      if (rect.height && rect.width && getComputedStyle(el).visibility !== 'hidden' && !el.closest('[hidden]')) lowest = Math.max(lowest, rect.bottom);
    }
    const gap = Math.round((footTop - lowest) * scale);
    if (lowest && gap < minGap) found.push(`${name} content ${gap < 0 ? `runs ${-gap}px into` : `is ${gap}px from`} the footer`);
  });
  return { slides: slides.length, found };
}

let problems = 0;
await checkPages(decks, {
  setup: ({ send }) => send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false }),
  check: async ({ open, evaluate }, deck) => {
    try {
      const errors = await open(deck, 2500);
      if (errors.length) return { error: errors[0] };
      return { result: await evaluate(measure, { minGap: MIN_GAP }) };
    } catch (error) {
      return { error: error.message.split('\n')[0] };
    }
  },
  report: (deck, { result, error }) => {
    if (error) { problems += 1; console.log(`✖ ${deck}: could not be checked: ${error}`); return; }
    problems += result.found.length;
    console.log(`${result.found.length ? '✖' : '✔'} ${deck} (${result.slides} slides)`);
    for (const line of result.found) console.log(`    ${line}`);
  }
});
process.exit(problems ? 1 : 0);
