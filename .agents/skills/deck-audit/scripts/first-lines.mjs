#!/usr/bin/env node
// Lists the first line of working of every worked example in the given decks (default: all), so a
// reader can spot one that starts from a rearranged equation. IB decks: the first span of each
// .work block that is not an .ask or .say line. GCSE decks: the row labels and first row of each
// .worked block; a block whose rows go Rearrange before any Equation row is marked with "!".
//   node .agents/skills/deck-audit/scripts/first-lines.mjs [deck/index.html ...]
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
const named = process.argv.slice(2);
const decks = named.length ? named : execFileSync('git', ['ls-files', 'gcsephy/decks/*/index.html', 'ibdpphy/decks/*/index.html'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
const short = (text) => text.replace(/\s+/g, ' ').trim().slice(0, 160);

for (const deck of decks) {
  const sections = readFileSync(resolve(ROOT, deck), 'utf8').split('<section ').slice(1);
  sections.forEach((section, i) => {
    const title = (section.match(/data-title="([^"]*)"/) || [])[1] || '';
    const where = `${deck.split('/')[2]} s${i + 1} [${title}]`;
    for (const work of section.matchAll(/<div class="work[^"]*"[^>]*>([\s\S]*?)(?=<div class="work|<\/section>|$)/g)) {
      const lines = [...work[1].matchAll(/^\s*<span(?: class="([^"]*)")?>(.*)<\/span>\s*$/gm)];
      const first = lines.find(([, cls = '']) => !/\b(ask|say)\b/.test(cls));
      if (first) console.log(`${where}  ${short(first[2])}`);
    }
    for (const worked of section.matchAll(/<div class="worked[^"]*">([\s\S]*?)<\/dl>/g)) {
      const rows = [...worked[1].matchAll(/<dt>(.*?)<\/dt><dd[^>]*>([\s\S]*?)<\/dd>/g)].map(([, label, body]) => [label, body]);
      if (!rows.length) continue;
      const labels = rows.map(([label]) => label);
      const rearrangeFirst = labels.indexOf('Rearrange') > -1 && (labels.indexOf('Equation') === -1 || labels.indexOf('Equation') > labels.indexOf('Rearrange'));
      console.log(`${rearrangeFirst ? '!' : ' '} ${where}  ${labels.join('/')} | ${short(rows[0][1])}`);
    }
  });
}
