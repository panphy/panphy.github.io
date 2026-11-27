// Renders one worksheet (worksheet.html?sheet=<slug>) from sheets/<slug>.js: the questions, then the
// answers on the last page. Pages are fixed A4 sheets broken where the sheet file says 'break'; a page
// whose content does not fit is outlined in red and listed in <body data-overflow>, which build.mjs
// refuses to print. <body data-question-pages> counts the pages before the answers.
(function () {
  const slug = new URLSearchParams(location.search).get('sheet');
  const COPYRIGHT = '© PanPhy Labs. All rights reserved.';

  // Text shorthand: \frac{a}{b}, **bold**, *italic*, ^{sup}, _{sub}, {{A|Z|X}} nuclides, ~ for a
  // non-breaking space. HTML passes through.
  function fmt(s) {
    return String(s ?? '')
      .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '<span class="frac"><span>$1</span><span>$2</span></span>')
      .replace(/\{\{([^|}]*)\|([^|}]*)\|([^}]*)\}\}/g, '<span class="nuc"><span>$1</span><span>$2</span></span>$3')
      .replace(/\^\{([^}]*)\}/g, (_, t) => `<sup>${t.replace(/-/g, '−')}</sup>`)
      .replace(/_\{([^}]*)\}/g, '<sub>$1</sub>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\*([^*]+)\*/g, '<i>$1</i>')
      .replace(/~/g, '&nbsp;');
  }
  const paras = (t) => (Array.isArray(t) ? t : [t]).map((p) => `<p>${fmt(p)}</p>`).join('');
  const letter = (i) => String.fromCharCode(65 + i);

  function figure(spec) {
    if (spec.svg) return `<div class="figure">${spec.svg}</div>`;
    const draw = window.TestFigures[spec.figure];
    if (!draw) throw new Error(`Unknown figure "${spec.figure}"`);
    return `<div class="figure">${draw(spec)}</div>`;
  }

  function table(t) {
    const head = t.head ? `<tr>${t.head.map((h) => `<th>${fmt(h)}</th>`).join('')}</tr>` : '';
    const rows = t.rows.map((r) => `<tr>${r.map((c) => `<td>${fmt(c)}</td>`).join('')}</tr>`).join('');
    return `<table class="data-table">${head}${rows}</table>`;
  }

  const isMcq = (q) => Array.isArray(q.options);
  const parts = (q) => (q.body || []).filter((b) => b && b.part !== undefined);
  const qMarks = (q) => (isMcq(q) ? q.marks || 1 : parts(q).reduce((s, p) => s + p.marks, 0));
  const questions = (s) => s.items.filter((i) => i !== 'break');
  const sMarks = (s) => questions(s).reduce((t, q) => t + qMarks(q), 0);

  function build(T) {
    const root = document.getElementById('paper');
    const total = T.sections.reduce((t, s) => t + sMarks(s), 0);
    // The running footer, as on the GCSE workbooks: "Momentum and Collisions, Year 12: Classwork, © PanPhy Labs. …"
    const footer = `${fmt(T.footer || `${T.title}, ${T.header}`)}, ${COPYRIGHT}`;
    const pages = [];
    let body = null;
    let cont = null; // { letter, qnum } waiting to be announced at the top of a new page
    let inAnswers = false;

    function newPage() {
      const page = document.createElement('section');
      page.className = inAnswers ? 'page compact-scheme' : 'page';
      page.innerHTML = `<header class="run-head"><span>${fmt(T.header)}</span><span>${inAnswers ? 'Answers' : fmt(T.kind || 'Worksheet')}</span></header>` +
        `<div class="page-body"></div><footer class="run-foot"><span>${footer}</span><span class="page-no"></span></footer>`;
      root.appendChild(page);
      pages.push(page);
      body = page.querySelector('.page-body');
    }
    function put(html, isHeading) {
      if (cont && !isHeading) {
        const c = cont;
        cont = null;
        put(`<div class="section-head"><h2>Section ${c.letter}<span class="bar">|</span>Continued</h2></div>`, true);
        if (c.qnum) put(`<div class="cont-label">Question ${c.qnum} continued</div>`, true);
      }
      body.insertAdjacentHTML('beforeend', html);
    }
    function sectionHead(s, i, marks) {
      put(`<div class="section-head"><h2>Section ${letter(i)}<span class="bar">|</span>${fmt(s.title)}</h2><span class="marks">[${marks} mark${marks === 1 ? '' : 's'}]</span></div>`, true);
    }

    // Questions
    document.title = T.file;
    newPage();
    put(`<h1 class="cover-title">${fmt(T.title)}</h1>` +
      `<div class="cover-facts"><span>${T.minutes ? `${T.minutes} minutes` : ''}</span><span>Maximum mark&nbsp;&nbsp;[${total}]</span></div>` +
      `<div class="cover-fields"><span class="name">Name</span><span class="fill name-fill"></span><span>Class</span><span class="fill class-fill"></span></div>` +
      `<div class="instructions">${paras(T.instructions)}</div>`, true);
    let qnum = 0;
    T.sections.forEach((s, si) => {
      if (s.newPage && si > 0) { newPage(); cont = null; }
      sectionHead(s, si, sMarks(s));
      for (const item of s.items) {
        if (item === 'break') { newPage(); cont = { letter: letter(si) }; continue; }
        qnum++;
        if (isMcq(item)) {
          let opts;
          if (item.optionHead) {
            const head = `<tr><th></th>${item.optionHead.map((h) => `<th>${fmt(h)}</th>`).join('')}</tr>`;
            const rows = item.options.map((o, i) => `<tr><td><b>${letter(i)}.</b></td>${o.map((c) => `<td>${fmt(c)}</td>`).join('')}</tr>`).join('');
            opts = `<table class="opt-table">${head}${rows}</table>`;
          } else {
            opts = `<ul class="options${item.columns === 2 ? ' cols2' : ''}">${item.options.map((o, i) => `<li><b>${letter(i)}.</b><span>${fmt(o)}</span></li>`).join('')}</ul>`;
          }
          put(`<div class="q"><span class="q-num">${qnum}.</span><div class="q-text">${paras(item.text)}${opts}</div></div>`);
          continue;
        }
        put(`<div class="q" style="margin-bottom:1mm"><span class="q-num">${qnum}.</span><div class="q-text">${paras(item.text)}</div></div>`);
        let pi = 0;
        for (const b of item.body || []) {
          if (b === 'break') { newPage(); cont = { letter: letter(si), qnum }; continue; }
          if (b.p !== undefined) put(`<div class="q-cont">${paras(b.p)}</div>`);
          else if (b.figure || b.svg) put(`<div class="q-cont">${figure(b)}</div>`);
          else if (b.eq !== undefined) put(`<div class="q-cont"><div class="eq">${fmt(b.eq)}</div></div>`);
          else if (b.table) put(`<div class="q-cont">${table(b.table)}</div>`);
          else if (b.part !== undefined) {
            const lab = String.fromCharCode(97 + pi++);
            let html = `<div class="q-cont"><div class="part"><span class="part-label">(${lab})</span><div class="part-text">${paras(b.part)}</div><span class="part-marks">[${b.marks}]</span></div>`;
            if (b.lines) html += `<div class="answer-lines">${'<div></div>'.repeat(b.lines)}</div>`;
            if (b.box) html += `<div class="answer-box" style="height:${b.box.height || 100}mm">${b.box.dot ? '<span class="dot"></span>' : ''}</div>`;
            html += '</div>';
            put(html);
          }
        }
        put('<div style="height:5mm"></div>');
      }
    });
    body.classList.add('has-end');
    put(`<div class="end-label">${fmt(T.endLabel || 'End of worksheet')}</div>`, true);
    const questionPages = pages.length;

    // Answers, on a page of their own
    inAnswers = true;
    newPage();
    cont = null;
    const notes = T.schemeNotes ?? '(1) marks one marking point. Accept equivalent methods and sensible rounding. ecf = error carried forward.';
    put(`<h1 class="cover-title">Answers</h1><div class="cover-sub">${fmt(T.title)}<span class="bar" style="padding:0 0.6em">|</span>${total} marks</div>` +
      `<div class="ms-intro"><p>${fmt(notes)}</p></div>`, true);
    qnum = 0;
    T.sections.forEach((s, si) => {
      sectionHead(s, si, sMarks(s));
      let html = '<div class="ms-table">';
      questions(s).forEach((q, qi) => {
        qnum++;
        if (q.schemeBreak) { put(html + '</div>'); newPage(); cont = { letter: letter(si) }; html = '<div class="ms-table">'; qi = 0; }
        if (isMcq(q)) {
          html += `<div class="ms-row mcq"><span class="ms-label">${qnum}</span><span class="ms-key">${q.answer}</span><div class="ms-points">${paras(q.scheme || '')}</div></div>`;
          return;
        }
        if (qi > 0) html += '<div class="ms-gap"></div>';
        parts(q).forEach((p, pi) => {
          const lab = parts(q).length > 1 ? `${qnum}(${String.fromCharCode(97 + pi)})` : `${qnum}`;
          html += `<div class="ms-row part"><span class="ms-label">${lab}</span><div class="ms-points">${paras(p.scheme || '')}</div><span class="part-marks">[${p.marks}]</span></div>`;
          if (p.schemeFigure) html += `<div class="ms-row figure-row">${figure(p.schemeFigure)}</div>`;
        });
      });
      put(html + '</div>');
    });

    pages.forEach((p, i) => { p.querySelector('.page-no').textContent = `${i + 1}`; });
    const over = [];
    pages.forEach((p, i) => {
      const b = p.querySelector('.page-body');
      if (b.scrollHeight > b.clientHeight + 1) {
        p.classList.add('overflow');
        p.dataset.over = `${Math.round((b.scrollHeight - b.clientHeight) * 25.4 / 96)} mm`;
        over.push(i + 1);
      }
    });
    document.body.dataset.pages = pages.length;
    document.body.dataset.questionPages = questionPages;
    document.body.dataset.overflow = over.join(',');
    document.body.dataset.title = document.title;
    document.body.dataset.ready = '1';
    if (over.length) console.error(`Overflowing page(s): ${over.join(', ')}`);
  }

  function fail(msg) {
    document.getElementById('paper').innerHTML = `<p style="padding:2em;color:#b00">${msg}</p>`;
    document.body.dataset.error = msg;
    document.body.dataset.ready = '1';
  }

  // Sheet files call Worksheet({...}).
  window.Worksheet = (data) => {
    try { build(data); } catch (e) { fail(e.message); throw e; }
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (!slug) return fail('Add ?sheet=&lt;name&gt; to the address, naming a file in sheets/.');
    const s = document.createElement('script');
    s.src = `sheets/${encodeURIComponent(slug)}.js`;
    s.onerror = () => fail(`sheets/${slug}.js was not found.`);
    document.head.appendChild(s);
  });
})();
