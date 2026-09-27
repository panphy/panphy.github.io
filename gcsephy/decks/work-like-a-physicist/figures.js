// SVG diagrams for the Work Like a Physicist deck, drawn in the style of the
// Year 9 companion site (gcsephy/year9phy/unit01): navy ink, lime points,
// coral outliers, cyan trend lines and bold Arial labels. Each
// <div data-fig="name"> is filled from FIGURES; colours come from deck CSS.
(() => {
  const f = n => Math.round(n * 10) / 10;
  const svg = (w, h, body, label) => `<svg class="wf" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">${body}</svg>`;
  const t = (x, y, s, cls = '', anchor = 'middle', extra = '') => `<text x="${f(x)}" y="${f(y)}" class="${cls}" text-anchor="${anchor}" ${extra}>${s}</text>`;
  const line = (x1, y1, x2, y2, cls = 'ink') => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" class="${cls}"/>`;
  const rect = (x, y, w, h, cls = 'box', rx = 0) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${rx}" class="${cls}"/>`;
  const dot = (x, y, r = 10, cls = 'pt') => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" class="${cls}"/>`;
  const cross = (x, y, s = 8, cls = 'cross') => `<path class="${cls}" d="M${f(x - s)} ${f(y - s)}L${f(x + s)} ${f(y + s)}M${f(x - s)} ${f(y + s)}L${f(x + s)} ${f(y - s)}"/>`;
  const tick = (x, y, cls = 'yes') => `<path class="${cls}-mark" d="M${x - 11} ${y}l8 8 15-17"/>`;
  const cross2 = (x, y) => `<path class="no-mark" d="M${x - 9} ${y - 9}l18 18M${x + 9} ${y - 9}l-18 18"/>`;

  function arrow(x1, y1, x2, y2, cls = 'arrow', head = 13) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    const bx = x2 - head * Math.cos(a), by = y2 - head * Math.sin(a);
    const p = (s) => `${f(bx + head * 0.55 * Math.cos(a + s))} ${f(by + head * 0.55 * Math.sin(a + s))}`;
    return `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(bx)}" y2="${f(by)}" class="${cls}"/><path class="head ${cls.replace('arrow', '').trim()}" d="M${f(x2)} ${f(y2)}L${p(Math.PI / 2)}L${p(-Math.PI / 2)}Z"/>`;
  }

  // Gridded axes. Returns the drawing plus value → pixel converters.
  function axes({ x0, y0, w, h, xr, yr, xLabel, yLabel, xEvery = 1, yEvery = 1, fmtX = String, fmtY = String, grid = true, showX = true }) {
    const [xmin, xmax, xs] = xr, [ymin, ymax, ys] = yr;
    const X = v => x0 + (v - xmin) / (xmax - xmin) * w;
    const Y = v => y0 + h - (v - ymin) / (ymax - ymin) * h;
    let s = '';
    let i = 0;
    for (let v = xmin; v <= xmax + 1e-9; v += xs, i++) {
      if (grid && showX) s += line(X(v), y0, X(v), y0 + h, 'grid');
      if (showX && i % xEvery === 0) s += t(X(v), y0 + h + 28, fmtX(Math.round(v * 100) / 100), 'tick-t');
    }
    i = 0;
    for (let v = ymin; v <= ymax + 1e-9; v += ys, i++) {
      if (grid) s += line(x0, Y(v), x0 + w, Y(v), 'grid');
      if (i % yEvery === 0) s += t(x0 - 12, Y(v) + 6, fmtY(Math.round(v * 100) / 100), 'tick-t', 'end');
    }
    s += `<path class="axis" d="M${x0} ${y0 - 6}V${y0 + h}H${x0 + w + 6}"/>`;
    if (xLabel) s += t(x0 + w / 2, y0 + h + 62, xLabel, 'axis-t');
    if (yLabel) s += t(0, 0, yLabel, 'axis-t', 'middle', `transform="translate(${x0 - 70} ${y0 + h / 2}) rotate(-90)"`);
    return { s, X, Y };
  }

  const FIGURES = {
    // Four targets: precision and accuracy are different ideas.
    targets: () => {
      const hits = [
        [[-6, -4], [5, 6], [3, -9], [-8, 7], [9, 1]],
        [[40, -44], [52, -36], [46, -52], [36, -34], [55, -48]],
        [[-52, -18], [48, 30], [8, -60], [-20, 56], [30, -34]],
        [[-58, 30], [-18, 62], [-60, -8], [-30, 12], [-4, 40]]
      ];
      const labels = [['yes', 'yes'], ['yes', 'no'], ['no', 'yes'], ['no', 'no']];
      let s = '';
      [125, 375, 625, 875].forEach((cx, i) => {
        const cy = 150;
        [120, 90, 60, 30].forEach((r, k) => { s += `<circle cx="${cx}" cy="${cy}" r="${r}" class="${k === 3 ? 'f-accent' : k % 2 ? 'f-paper' : 'f-card'} ring"/>`; });
        s += hits[i].map(([dx, dy]) => dot(cx + dx, cy + dy, 10, 'hit')).join('');
        const [p, a] = labels[i];
        s += t(cx - 12, 316, 'PRECISE', 'lab', 'end') + (p === 'yes' ? tick(cx + 18, 309) : cross2(cx + 18, 309));
        s += t(cx - 12, 356, 'ACCURATE', 'lab', 'end') + (a === 'yes' ? tick(cx + 18, 349) : cross2(cx + 18, 349));
      });
      return svg(1000, 380, s, 'Four targets: precise and accurate; precise but not accurate; accurate on average but not precise; neither precise nor accurate');
    },

    // Three data sets on one time axis.
    dataSets: () => {
      const X = v => 170 + (v - 0.85) / 0.65 * 690;
      const sets = [['A', [1.20, 1.22, 1.21]], ['B', [1.05, 1.47, 1.12]], ['C', [0.91, 0.92, 0.91]]];
      let s = line(X(1.21), 34, X(1.21), 300, 'trend dash');
      s += t(X(1.21), 24, 'TRUE VALUE ≈ 1.21 s', 'lab small cyan-t');
      sets.forEach(([name, vals], i) => {
        const y = 80 + i * 82;
        const setClass = `set-${name.toLowerCase()}`;
        s += t(40, y + 8, `SET ${name}`, `lab ${setClass}-t`, 'start');
        s += line(170, y, 860, y, 'grid');
        vals.forEach((v, k) => { s += dot(X(v), y + (vals.indexOf(v) !== k ? 14 : 0), 12, `pt ${setClass}`); });
      });
      s += `<path class="axis" d="M170 300H866"/>`;
      for (let v = 0.9; v <= 1.5001; v += 0.1) s += line(X(v), 300, X(v), 311, 'ink') + t(X(v), 338, v.toFixed(1), 'tick-t');
      s += t(515, 376, 'Time / s', 'axis-t');
      return svg(900, 390, s, 'Dot plot of three sets of repeated times: set A close together near 1.21 s, set B spread from 1.05 to 1.47 s, set C close together near 0.91 s');
    },

    // Mean ± half the range on a number line.
    uncertainty: () => {
      const X = v => 80 + (v - 1.18) / 0.09 * 760;
      const mean = 1.2233;
      let s = `<rect x="${f(X(mean - 0.025))}" y="100" width="${f(X(mean + 0.025) - X(mean - 0.025))}" height="120" class="band"/>`;
      s += `<path class="bracket" d="M${f(X(1.2))} 84V64H${f(X(1.25))}V84"/>` + t((X(1.2) + X(1.25)) / 2, 50, 'RANGE = 1.25 − 1.20 = 0.05 s', 'lab');
      [1.20, 1.22, 1.25].forEach(v => { s += cross(X(v), 160, 12); });
      s += line(X(mean), 108, X(mean), 212, 'mean-line');
      s += arrow(X(mean), 236, X(mean - 0.025), 236, 'arrow cyan') + arrow(X(mean), 236, X(mean + 0.025), 236, 'arrow cyan');
      s += t(X(mean + 0.025) + 14, 243, '± 0.025 s', 'lab small', 'start');
      s += `<path class="axis" d="M70 280H850"/>`;
      for (let v = 1.18; v <= 1.2701; v += 0.01) s += line(X(v), 280, X(v), 292, 'ink') + t(X(v), 320, v.toFixed(2), 'tick-t');
      s += t(460, 362, 'Time / s', 'axis-t');
      return svg(900, 376, s, 'Three readings, 1.20, 1.22 and 1.25 seconds, on a number line; range 0.05 s; mean 1.22 s with an uncertainty band of plus or minus 0.025 s');
    },

    // Random error: spread both ways around the true value.
    random: () => {
      const pts = [[-104, 118], [-62, 150], [-20, 104], [28, 164], [70, 124], [112, 146]];
      let s = line(240, 40, 240, 212, 'trend dash') + t(240, 28, 'TRUE VALUE', 'lab small cyan-t');
      s += pts.map(([dx, y]) => dot(240 + dx, y, 12)).join('');
      s += `<path class="axis" d="M30 212H450"/>`;
      s += arrow(155, 242, 65, 242, 'arrow hot') + arrow(325, 242, 415, 242, 'arrow hot');
      s += t(240, 272, 'BOTH WAYS', 'lab small');
      return svg(480, 280, s, 'Random error: readings scattered on both sides of the true value');
    },

    // Systematic error: every reading shifted the same way.
    systematic: () => {
      const pts = [[-16, 116], [2, 150], [16, 108], [-6, 134], [22, 160], [8, 126]];
      let s = line(160, 40, 160, 212, 'trend dash') + t(160, 28, 'TRUE VALUE', 'lab small cyan-t');
      s += pts.map(([dx, y]) => dot(330 + dx, y, 12)).join('');
      s += `<path class="axis" d="M30 212H450"/>`;
      s += arrow(170, 242, 320, 242, 'arrow hot') + t(245, 272, 'SAME SHIFT EVERY TIME', 'lab small');
      return svg(480, 280, s, 'Systematic error: readings grouped together but all shifted the same way from the true value');
    },

    // Two rulers measuring one pencil.
    rulers: () => {
      const X = cm => 90 + cm * 100;
      let s = `<path class="pencil" d="M${X(0)} 56H${X(6.6)}L${X(7.3)} 78L${X(6.6)} 100H${X(0)}Z"/><path class="ink" d="M${X(6.6)} 56V100"/><path class="lead" d="M${X(7.05)} 70L${X(7.3)} 78L${X(7.05)} 86Z"/>`;
      s += rect(X(0) - 20, 128, 860, 58, 'ruler');
      for (let c = 0; c <= 8; c++) s += line(X(c), 128, X(c), 156, 'ink') + t(X(c), 178, c, 'tick-t');
      s += rect(X(0) - 20, 250, 860, 58, 'ruler');
      for (let m = 0; m <= 80; m++) s += line(X(m / 10), 250, X(m / 10), 250 + (m % 10 ? (m % 5 ? 11 : 17) : 28), 'ink thin');
      for (let c = 0; c <= 8; c++) s += t(X(c), 300, c, 'tick-t');
      s += t(70, 222, 'RULER WITH 1 cm MARKS  →  about 7 cm', 'lab', 'start');
      s += t(70, 344, 'RULER WITH 1 mm MARKS  →  7.3 cm', 'lab', 'start');
      s += line(X(7.3), 40, X(7.3), 318, 'trend dash');
      return svg(980, 360, s, 'The same pencil against a ruler marked in centimetres, reading about 7 cm, and a ruler marked in millimetres, reading 7.3 cm');
    },

    // Independent, dependent and control variables.
    variables: () => {
      const lock = (x, y) => `<path class="ink" d="M${x - 9} ${y}v-8a9 9 0 0 1 18 0v8"/>${rect(x - 14, y, 28, 22, 'f-alt box', 3)}`;
      let s = rect(30, 30, 330, 170, 'f-accent box pop') + t(195, 74, 'INDEPENDENT', 'lab') + t(195, 124, 'I CHANGE', 'big') + t(195, 172, 'pendulum length / cm', 'body-t');
      s += rect(600, 30, 330, 170, 'f-cyan box pop') + t(765, 74, 'DEPENDENT', 'lab') + t(765, 124, 'I MEASURE', 'big') + t(765, 172, 'time period / s', 'body-t');
      s += arrow(378, 115, 582, 115, 'arrow thick') + t(480, 98, 'affects?', 'body-t');
      s += t(480, 262, 'CONTROL  ·  I KEEP THE SAME', 'lab');
      ['release angle', 'bob mass', 'timing method'].forEach((name, i) => {
        const x = 70 + i * 290;
        s += rect(x, 290, 250, 76, 'f-card box');
        s += lock(x + 40, 324) + t(x + 72, 338, name, 'body-t', 'start');
      });
      return svg(960, 390, s, 'Independent variable, pendulum length, affects the dependent variable, time period; control variables release angle, bob mass and timing method are kept the same');
    },

    // Continuous and categoric data.
    dataTypes: () => {
      const X = v => 70 + v * 82;
      let s = t(40, 36, 'CONTINUOUS  ·  ANY VALUE ON A SCALE', 'lab', 'start');
      s += `<path class="axis" d="M${X(0)} 110H${X(10) + 10}"/>`;
      for (let v = 0; v <= 10; v++) s += line(X(v), 110, X(v), 124, 'ink') + t(X(v), 150, v, 'tick-t');
      for (let v = 0; v < 10; v += 0.5) if (v % 1) s += line(X(v), 110, X(v), 118, 'ink thin');
      s += t(X(10) + 30, 150, 'cm', 'tick-t', 'start');
      [[3.2, '3.2 cm'], [4.75, '4.75 cm'], [7.9, '7.9 cm']].forEach(([v, lab]) => { s += dot(X(v), 110, 11) + t(X(v), 88, lab, 'body-t small'); });
      s += t(40, 222, 'CATEGORIC  ·  NAMED GROUPS', 'lab', 'start');
      ['sponge', 'cloth', 'rubber mat', 'cardboard'].forEach((name, i) => {
        const x = 40 + i * 225;
        s += rect(x, 246, 195, 70, 'f-card box') + t(x + 97, 290, name, 'body-t');
      });
      s += t(480, 362, 'No value between “cloth” and “rubber mat”', 'body-t muted-t');
      return svg(960, 380, s, 'Continuous data on a number line can take values such as 3.2, 4.75 and 7.9 centimetres; categoric data are named groups such as sponge, cloth, rubber mat and cardboard');
    },

    // The independent variable chooses the graph.
    graphChoice: () => {
      let s = rect(300, 14, 360, 70, 'f-card box pop') + t(480, 58, 'INDEPENDENT VARIABLE?', 'lab');
      s += arrow(380, 90, 250, 150, 'arrow thick') + arrow(580, 90, 710, 150, 'arrow thick');
      s += t(245, 186, 'CONTINUOUS', 'big small-big') + t(715, 186, 'CATEGORIC', 'big small-big');
      // Mini line graph
      s += `<path class="axis" d="M90 216V430H420"/>`;
      [[130, 400], [190, 360], [250, 330], [310, 286], [370, 250]].forEach(([x, y]) => { s += cross(x, y, 9); });
      s += line(105, 414, 400, 234, 'trend');
      s += t(255, 470, 'LINE GRAPH', 'lab');
      // Mini bar chart
      s += `<path class="axis" d="M540 216V430H870"/>`;
      [[565, 300], [640, 250], [715, 350], [790, 280]].forEach(([x, y]) => { s += rect(x, y, 52, 430 - y, 'f-accent box'); });
      s += t(705, 470, 'BAR CHART  ·  GAPS', 'lab');
      return svg(960, 490, s, 'Decision: a continuous independent variable needs a line graph; a categoric independent variable needs a bar chart with gaps between the bars');
    },

    // Shock absorber drop test.
    dropTest: () => {
      const Y = cm => 520 - cm * 4.4;
      let s = line(20, 560, 640, 560, 'floor');
      s += rect(40, 540, 170, 20, 'f-muted box') + rect(88, 70, 14, 470, 'f-muted box');
      s += rect(95, 108, 170, 12, 'f-muted box') + rect(250, 98, 26, 32, 'f-muted box');
      s += rect(262, 60, 44, 460, 'ruler');
      for (let c = 0; c <= 100; c += 5) s += line(262, Y(c), 262 + (c % 10 ? 12 : 22), Y(c), 'ink thin');
      for (let c = 0; c <= 100; c += 10) s += t(316, Y(c) + 6, c, 'tick-t', 'start');
      s += `<rect x="330" y="520" width="240" height="40" class="f-alt box"/>`;
      for (let i = 0; i < 12; i++) s += dot(346 + i * 19, 533 + (i % 2) * 13, 3, 'foam');
      s += t(450, 598, 'material under test', 'body-t');
      s += dot(430, Y(50) - 22, 22, 'ball') + t(470, Y(50) - 30, 'release from 50 cm', 'body-t', 'start') + t(470, Y(50) - 2, 'no push', 'body-t muted-t', 'start');
      s += arrow(430, Y(50) + 8, 430, 508, 'arrow dash-arrow');
      s += `<circle cx="490" cy="${f(Y(24) - 22)}" r="22" class="ghost"/>`;
      s += arrow(490, 508, 490, Y(24) + 6, 'arrow hot');
      s += line(310, Y(24), 470, Y(24), 'trend dash');
      s += t(530, Y(24) - 50, 'bounce height', 'lab', 'start') + t(530, Y(24) - 22, 'read at the ball', 'body-t muted-t', 'start') + t(530, Y(24) + 4, 'bottom, eye level', 'body-t muted-t', 'start');
      s += t(60, 40, 'metre ruler: 0 at the material surface', 'body-t', 'start');
      return svg(660, 620, s, 'Drop test: a ball released from 50 cm beside a clamped metre ruler onto a material; the bounce height is read at eye level');
    },

    // Bar chart of mean bounce heights.
    barChart: () => {
      const data = [['sponge', 13], ['cardboard', 30], ['cloth', 23], ['rubber mat', 38], ['bubble wrap', 17]];
      const { s: grid, Y } = axes({ x0: 130, y0: 60, w: 740, h: 380, xr: [0, 5, 5], yr: [0, 40, 5], yEvery: 2, showX: false, xLabel: 'Material', yLabel: 'Mean bounce height / cm' });
      let s = grid;
      data.forEach(([name, v], i) => {
        const x = 130 + 30 + i * 148;
        s += rect(x, Y(v), 100, Y(0) - Y(v), i === 0 ? 'f-accent box' : 'f-card box');
        s += t(x + 50, Y(v) - 12, v, 'lab small');
        s += t(x + 50, 470, name, 'body-t small');
      });
      s += t(500, 30, 'Mean bounce height for each material', 'lab');
      return svg(900, 540, s, 'Bar chart of mean bounce height: sponge 13 cm, cardboard 30 cm, cloth 23 cm, rubber mat 38 cm, bubble wrap 17 cm; bars equal width with gaps');
    },

    // Trolley and ramp.
    ramp: () => {
      const A = [40, 226], B = [440, 420];
      const ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
      const at = (u, lift = 0) => [A[0] + (B[0] - A[0]) * u + Math.sin(ang) * lift, A[1] + (B[1] - A[1]) * u - Math.cos(ang) * lift];
      let s = line(10, 420, 890, 420, 'floor');
      [0, 1, 2].forEach(i => { s += rect(40, 356 - i * 64, 110, 64, 'f-alt box'); });
      s += `<path class="board" d="M${A[0]} ${A[1]}L${B[0]} ${B[1]}L${B[0] - 26} ${B[1]}L${A[0]} ${A[1] + 12}Z"/>`;
      const [tx, ty] = at(0.24);
      s += `<g transform="translate(${f(tx)} ${f(ty)}) rotate(${f(ang * 180 / Math.PI)})"><rect x="-42" y="-40" width="86" height="30" class="f-accent box" rx="4"/>${dot(-24, -8, 9, 'wheel')}${dot(26, -8, 9, 'wheel')}</g>`;
      const [s1x, s1y] = at(0.1), [s2x, s2y] = at(0.1, 34);
      s += line(s1x, s1y, s2x, s2y, 'tape') + t(s2x - 8, s2y - 14, 'start line', 'body-t small', 'end');
      s += t(230, 236, 'release · no push', 'body-t', 'start');
      s += `<g transform="translate(720 420)"><rect x="-42" y="-40" width="86" height="30" class="ghost-box" rx="4"/><circle cx="-24" cy="-8" r="9" class="ghost"/><circle cx="26" cy="-8" r="9" class="ghost"/></g>`;
      s += rect(440, 424, 400, 14, 'f-alt box');
      for (let i = 0; i <= 40; i++) s += line(440 + i * 10, 424, 440 + i * 10, i % 5 ? 430 : 434, 'ink thin');
      s += arrow(580, 466, 440, 466, 'arrow') + arrow(620, 466, 762, 466, 'arrow') + t(600, 474, 'd', 'big small-big');
      s += arrow(16, 310, 16, 230, 'arrow') + arrow(16, 336, 16, 418, 'arrow') + t(16, 334, 'h', 'big small-big');
      s += t(600, 506, 'distance travelled after the ramp', 'body-t');
      return svg(900, 520, s, 'A trolley released from a start line on a ramp of height h, propped on blocks, travels a distance d along the floor, measured with a tape');
    },

    // A scale that wastes the grid versus one that fills it.
    scale: () => {
      const pts = [[5, 20], [10, 37], [15, 52], [20, 66], [25, 80]];
      const panel = (x0, ymax, step, good) => {
        const { s, X, Y } = axes({ x0, y0: 40, w: 330, h: 300, xr: [0, 30, 5], yr: [0, ymax, step], xEvery: 2, yEvery: 2, grid: true });
        return s + pts.map(([a, b]) => cross(X(a), Y(b), 7)).join('') +
          (good ? tick(x0 + 118, 420, 'yes') : cross2(x0 + 108, 414)) +
          t(x0 + 140, 424, good ? '10 per square · fills the grid' : '20 per square · points squashed', 'lab small', 'start');
      };
      return svg(960, 440, panel(90, 200, 20, false) + panel(570, 90, 10, true), 'The same five points plotted on a y-axis going up in 20s, squashed into the bottom of the grid, and on a y-axis going up in 10s, filling the grid');
    },

    // Plotted means for the ramp, crosses only.
    lineGraph: () => {
      const { s, X, Y } = axes({ x0: 130, y0: 60, w: 720, h: 400, xr: [0, 30, 2.5], yr: [0, 90, 5], xEvery: 2, yEvery: 2, xLabel: 'Ramp height / cm', yLabel: 'Mean distance / cm' });
      const pts = [[5, 20], [10, 37], [15, 52], [20, 66], [25, 80]];
      return svg(900, 560, s + pts.map(([a, b]) => cross(X(a), Y(b), 9)).join('') + t(490, 32, 'Mean distance travelled against ramp height', 'lab'), 'Line graph axes with five plotted crosses: ramp height 5, 10, 15, 20 and 25 cm against mean distance 20, 37, 52, 66 and 80 cm');
    },

    // Dot-to-dot, straight best fit and curved best fit.
    fitTypes: () => {
      const straight = [[1, 1.3], [2, 1.7], [3, 3.2], [4, 3.6], [5, 5.1], [6, 5.5]];
      const curved = [[1, 2.2], [2, 3.6], [3, 4.4], [4, 5.3], [5, 5.5], [6, 5.9]];
      const panel = (x0, pts, kind) => {
        const { s, X, Y } = axes({ x0, y0: 30, w: 240, h: 240, xr: [0, 7, 1], yr: [0, 7, 1], grid: true, fmtX: () => '', fmtY: () => '' });
        let out = s;
        if (kind === 'dot') out += `<polyline class="zigzag" points="${pts.map(([a, b]) => `${f(X(a))},${f(Y(b))}`).join(' ')}"/>`;
        if (kind === 'line') out += line(X(0.3), Y(0.4), X(6.6), Y(6.1), 'trend');
        if (kind === 'curve') {
          let d = '';
          for (let v = 0.3; v <= 6.6; v += 0.1) d += `${d ? 'L' : 'M'}${f(X(v))} ${f(Y(6.6 * (1 - Math.exp(-0.42 * v)) + 0.1))}`;
          out += `<path class="trend" d="${d}"/>`;
        }
        return out + pts.map(([a, b]) => cross(X(a), Y(b), 7)).join('');
      };
      let s = panel(50, straight, 'dot') + panel(370, straight, 'line') + panel(690, curved, 'curve');
      s += cross2(80, 318) + t(100, 326, 'DOT-TO-DOT', 'lab', 'start');
      s += tick(400, 318) + t(420, 326, 'STRAIGHT BEST FIT', 'lab', 'start');
      s += tick(720, 318) + t(740, 326, 'CURVED BEST FIT', 'lab', 'start');
      return svg(960, 350, s, 'Three graphs of the same kind of data: a zig-zag dot-to-dot line is wrong; a straight best-fit line and a smooth curved best-fit line are right');
    },

    // Ramp data with one point that does not fit.
    outlier: () => {
      const { s, X, Y } = axes({ x0: 130, y0: 40, w: 700, h: 400, xr: [0, 30, 2.5], yr: [0, 100, 5], xEvery: 2, yEvery: 2, xLabel: 'Ramp height / cm', yLabel: 'Mean distance / cm' });
      const pts = [[5, 20], [10, 37], [15, 52], [20, 96], [25, 80]];
      let out = s + line(X(1), Y(8.5), X(28), Y(89.5), 'trend');
      out += pts.map(([a, b]) => cross(X(a), Y(b), 9)).join('');
      out += `<circle cx="${f(X(20))}" cy="${f(Y(96))}" r="26" class="out-ring"/>`;
      out += t(X(20) - 40, Y(96) - 4, 'outlier?', 'lab hot-t', 'end');
      return svg(880, 540, out, 'Ramp data with a best-fit line through four points; the point at 20 cm, 96 cm lies far above the line and is circled as a possible outlier');
    },

    // The six things that earn graph marks.
    graphMarks: () => {
      const { s, X, Y } = axes({ x0: 130, y0: 70, w: 700, h: 380, xr: [0, 30, 2.5], yr: [0, 100, 5], xEvery: 2, yEvery: 2, xLabel: 'Ramp height / cm', yLabel: 'Mean distance / cm' });
      const pts = [[5, 20], [10, 37], [15, 52], [20, 96], [25, 80]];
      const tag = (n, x, y) => `<circle cx="${x}" cy="${y}" r="17" class="tag"/>${t(x, y + 7, n, 'lab small')}`;
      let out = s + line(X(1), Y(8.5), X(28), Y(89.5), 'trend');
      out += pts.map(([a, b]) => cross(X(a), Y(b), 9)).join('');
      out += `<circle cx="${f(X(20))}" cy="${f(Y(96))}" r="26" class="out-ring"/>`;
      out += t(480, 38, 'Mean distance travelled against ramp height', 'lab');
      out += tag(1, 110, 32) + tag(2, 352, 505) + tag(3, X(30) + 36, Y(0) + 22) + tag(4, X(15) - 34, Y(52) - 30) + tag(5, X(27) + 22, Y(95) + 12) + tag(6, X(20) + 44, Y(96) - 14);
      return svg(880, 600, out, 'Annotated line graph: 1 title, 2 axis labels with units, 3 even scale, 4 small crosses, 5 one best-fit line, 6 outlier circled');
    },

    // Paper helicopter: template and flight.
    helicopter: () => {
      let s = t(160, 30, 'TEMPLATE', 'lab');
      s += `<path class="paper" d="M60 50H260V250H212V280H188V470H132V280H108V250H60Z"/>`;
      s += line(160, 50, 160, 250, 'cut') + line(60, 250, 108, 250, 'cut') + line(212, 250, 260, 250, 'cut');
      s += line(60, 250, 160, 250, 'fold') + line(160, 250, 260, 250, 'fold');
      s += arrow(38, 150, 38, 54, 'arrow') + arrow(38, 150, 38, 246, 'arrow') + t(28, 156, 'L', 'big small-big', 'end');
      s += `<rect x="146" y="430" width="28" height="56" rx="12" class="clip"/>`;
      s += t(186, 520, 'paperclip', 'body-t small', 'start');
      s += t(290, 110, 'cut', 'body-t small cut-t', 'start') + t(290, 250, 'fold wings', 'body-t small', 'start') + t(290, 276, 'opposite ways', 'body-t small', 'start');
      // Folded paper model in perspective: broad, shaded blades and a visible folded body.
      s += t(660, 30, 'FOLDED MODEL', 'lab');
      s += `<ellipse cx="650" cy="520" rx="100" ry="16" class="heli-shadow"/>`;
      s += `<path class="heli-wing-back" d="M642 142L735 58L800 92L690 177Z"/>`;
      s += `<path class="heli-wing-fold" d="M735 58L800 92L792 109L690 177Z"/>`;
      s += `<path class="heli-wing-front" d="M651 143L539 80L488 111L612 190Z"/>`;
      s += `<path class="heli-wing-fold" d="M539 80L488 111L502 129L612 190Z"/>`;
      s += `<path class="heli-body-side" d="M665 160L681 172V343L665 355Z"/>`;
      s += `<path class="heli-body-front" d="M619 169L665 160V355L619 343Z"/>`;
      s += `<path class="heli-body-fold" d="M619 169L642 160L681 172L665 186Z"/>`;
      s += `<path class="heli-clip" d="M634 330V387Q634 405 651 405Q668 405 668 387V345Q668 334 659 334Q650 334 650 345V386"/>`;
      s += `<path class="arrow" d="M570 58Q650 19 733 45"/><path class="head" d="M747 52L728 35L732 57Z"/>`;
      s += `<circle cx="494" cy="419" r="39" class="f-card box"/><rect x="484" y="369" width="20" height="13" class="f-muted box"/>`;
      s += t(494, 427, '1.50 s', 'lab small') + t(494, 480, 'time the fall', 'body-t small');
      s += t(650, 439, 'paperclip adds weight', 'body-t small');
      s += line(820, 184, 820, 510, 'trend dash') + line(455, 530, 880, 530, 'floor');
      s += t(805, 482, 'same drop height', 'body-t small', 'end');
      return svg(900, 560, s, 'Paper helicopter template with wing length L and cut and fold lines; a three-dimensional folded paper model with two broad blades, weighted body and paperclip, falling from a fixed height');
    },

    // Wing length against fall time, with a reading between points.
    heliGraph: () => {
      const { s, X, Y } = axes({ x0: 130, y0: 50, w: 700, h: 400, xr: [3, 9, 0.5], yr: [1, 2, 0.05], xEvery: 2, yEvery: 4, fmtY: v => v.toFixed(1), xLabel: 'Wing length / cm', yLabel: 'Mean fall time / s' });
      const pts = [[4, 1.10], [5, 1.32], [6, 1.50], [7, 1.71], [8, 1.88]];
      let out = s + line(X(3.4), Y(0.196 * 3.4 + 0.33), X(8.6), Y(0.196 * 8.6 + 0.33), 'trend');
      out += `<path class="guide" d="M${f(X(6.5))} ${f(Y(1))}V${f(Y(1.604))}H${f(X(3))}"/>`;
      out += pts.map(([a, b]) => cross(X(a), Y(b), 9)).join('');
      out += dot(X(6.5), Y(1.604), 9, 'pt') + t(X(6.5) + 16, Y(1.604) + 34, '6.5 cm → about 1.6 s', 'lab small', 'start');
      return svg(880, 540, out, 'Wing length against mean fall time: points from 4 cm, 1.10 s to 8 cm, 1.88 s with a straight best-fit line; reading at 6.5 cm gives about 1.6 s');
    }
  };

  function render() {
    document.querySelectorAll('[data-fig]').forEach(el => {
      const make = FIGURES[el.dataset.fig];
      if (make) el.innerHTML = make(el);
    });
  }

  window.DeckFigures = { render };
})();
