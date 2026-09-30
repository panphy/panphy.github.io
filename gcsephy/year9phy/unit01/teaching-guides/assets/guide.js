// Renders one Markdown lesson plan from ../source/ into #guide.
// Usage: guide.html?lesson=3   (1 to 7; lesson 7 is the combined Lessons 7-8 plan)
// Handles the Markdown these plans use: # ## ### headings, paragraphs, - and 1. lists,
// > quotes (two trailing spaces = line break) and | tables with :---: alignment.
(function () {
  'use strict';

  const FILES = [
    'lesson_1_reliability_of_data.md',
    'lesson_2_variables_data_types_graph_choice.md',
    'lesson_3_shock_absorber_bar_chart.md',
    'lesson_4_ramp_line_graph.md',
    'lesson_5_best_fit_lines_outliers.md',
    'lesson_6_paper_helicopter_independent_challenge.md',
    'lesson_7_8_student_research_project.md'
  ];

  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|\W)_(.+?)_(?=\W|$)/g, '$1<i>$2</i>');
  const cells = (row) => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

  function render(md) {
    const lines = md.replace(/\r/g, '').split('\n');
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }

      let m = /^(#{1,3})\s+(.*)$/.exec(line);
      if (m) { out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); i++; continue; }

      if (/^\|/.test(line)) {
        const rows = [];
        while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
        const head = cells(rows[0]);
        const align = cells(rows[1]).map((c) => (/^:-+:$/.test(c) ? 'c' : /-:$/.test(c) ? 'r' : ''));
        const td = (tag, c, k) => `<${tag}${align[k] ? ` class="${align[k]}"` : ''}>${inline(c)}</${tag}>`;
        out.push('<table><thead><tr>' + head.map((c, k) => td('th', c, k)).join('') + '</tr></thead><tbody>' +
          rows.slice(2).map((r) => '<tr>' + head.map((_, k) => td('td', cells(r)[k] || '', k)).join('') + '</tr>').join('') +
          '</tbody></table>');
        continue;
      }

      if (/^>/.test(line)) {
        const paras = [[]];
        while (i < lines.length && /^>/.test(lines[i])) {
          const raw = lines[i++];
          const text = raw.replace(/^>\s?/, '');
          if (!text.trim()) { paras.push([]); continue; }
          paras[paras.length - 1].push(inline(text.replace(/\s+$/, '')) + (/ {2,}$/.test(raw) ? '<br>' : ' '));
        }
        out.push('<blockquote>' + paras.filter((p) => p.length).map((p) => `<p>${p.join('').replace(/(<br>| )$/, '')}</p>`).join('') + '</blockquote>');
        continue;
      }

      if (/^(- |\d+\.\s)/.test(line)) {
        const ordered = /^\d+\./.test(line);
        const items = [];
        while (i < lines.length && /^(- |\d+\.\s)/.test(lines[i]) && /^\d+\./.test(lines[i]) === ordered) {
          items.push(inline(lines[i++].replace(/^(- |\d+\.\s)/, '')));
        }
        const tag = ordered ? 'ol' : 'ul';
        out.push(`<${tag}>` + items.map((t) => `<li>${t}</li>`).join('') + `</${tag}>`);
        continue;
      }

      const para = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|\||>|- |\d+\.\s)/.test(lines[i])) para.push(lines[i++].trim());
      const text = para.join(' ');
      out.push(`<p${/:$/.test(text) ? ' class="lead-in"' : ''}>${inline(text)}</p>`);
    }
    return out.join('\n');
  }

  const n = parseInt(new URLSearchParams(location.search).get('lesson'), 10);
  const host = document.getElementById('guide');
  if (!(n >= 1 && n <= FILES.length)) { host.textContent = 'Add ?lesson=1 to ?lesson=7 to the address.'; return; }

  fetch('source/' + FILES[n - 1])
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then((md) => {
      host.innerHTML = render(md);
      const h1 = host.querySelector('h1');
      if (h1) document.title = h1.textContent;
      document.documentElement.dataset.ready = '1';
    })
    .catch((e) => { host.textContent = 'Could not load the lesson plan (' + e.message + ').'; });
})();
