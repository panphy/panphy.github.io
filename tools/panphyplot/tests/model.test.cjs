// Run with: node --test tools/panphyplot/tests/model.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../js/model.js');

function sheetWith(columns) {
	const state = model.createState();
	const ids = model.createIdSource(state);
	const sheet = state.sheets[0];
	sheet.columns = columns.map(([role, cells, extra = {}]) => model.createColumn(ids.next('c'), { role, cells, ...extra }, cells.length));
	sheet.rowCount = Math.max(...columns.map(([, cells]) => cells.length));
	return sheet;
}

test('column letters run A..Z then AA', () => {
	assert.deepEqual([0, 1, 25, 26, 27, 51, 52].map(model.columnLetter), ['A', 'B', 'Z', 'AA', 'AB', 'AZ', 'BA']);
});

test('strict numbers reject commas, text and infinity', () => {
	assert.equal(model.parseNumber(' 1.5e-3 '), 0.0015);
	assert.equal(model.parseNumber('.5'), 0.5);
	for (const bad of ['1,5', '2 m', '', 'Infinity', '1e999']) assert.ok(Number.isNaN(model.parseNumber(bad)), bad);
});

test('every Y plots against the nearest X to its left', () => {
	const sheet = sheetWith([['X', ['1']], ['Y', ['2']], ['Y', ['3']], ['X', ['4']], ['Y', ['5']]]);
	const series = model.getSeries(sheet);
	assert.equal(series.length, 3);
	assert.equal(series[0].xCol, sheet.columns[0]);
	assert.equal(series[1].xCol, sheet.columns[0]);
	assert.equal(series[2].xCol, sheet.columns[3]);
});

test('a Y with no X to its left has no series points', () => {
	const sheet = sheetWith([['Y', ['1']], ['X', ['2']]]);
	const [series] = model.getSeries(sheet);
	assert.equal(series.xCol, null);
	assert.deepEqual(model.getSeriesPoints(sheet, series), []);
});

test('error columns attach to the nearest X or Y to their left', () => {
	const sheet = sheetWith([
		['X', ['1', '2']], ['Y', ['10', '20']], ['yErr', ['0.5', '1']], ['Y', ['30', '40']], ['xErr', ['0.1', '0.2']], ['yErr', ['10', '10'], { errorType: 'percentage' }]
	]);
	const series = model.getSeries(sheet);
	assert.equal(series[0].yErrCol, sheet.columns[2]);
	assert.equal(series[1].yErrCol, sheet.columns[5]);
	assert.equal(series[0].xErrCol, sheet.columns[4]);
	assert.equal(series[1].xErrCol, sheet.columns[4]);
	const points = model.getSeriesPoints(sheet, series[1]);
	assert.deepEqual(points.map(p => [p.x, p.y, p.xError, p.yError]), [[1, 30, 0.1, 3], [2, 40, 0.2, 4]]);
});

test('repeat readings become separate series against one X', () => {
	const sheet = sheetWith([['X', ['0.2', '0.4']], ['Y', ['0.90', '1.27']], ['Y', ['0.92', '1.25']], ['Y', ['0.89', '1.28']]]);
	assert.equal(model.getSeries(sheet).length, 3);
});

test('rows with a blank or invalid x or y are skipped', () => {
	const sheet = sheetWith([['X', ['1', '', '3', 'abc']], ['Y', ['1', '2', '', '4']]]);
	assert.deepEqual(model.getSeriesPoints(sheet, model.getSeries(sheet)[0]).map(p => p.row), [0]);
});

test('uncertainty cells must be non-negative, percentages positive', () => {
	const abs = model.createColumn('a', { role: 'yErr' });
	const pct = model.createColumn('b', { role: 'yErr', errorType: 'percentage' });
	assert.equal(model.isCellInvalid(abs, '0'), false);
	assert.equal(model.isCellInvalid(abs, '-1'), true);
	assert.equal(model.isCellInvalid(pct, '0'), true);
	assert.equal(model.isCellInvalid(model.createColumn('c', { role: 'Y' }), '-1'), false);
});

test('axis labels use the name / unit convention', () => {
	assert.equal(model.formatAxisLabel('L', 'm'), 'L / m');
	assert.equal(model.formatAxisLabel('L', ''), 'L');
	assert.equal(model.formatAxisLabel('v', 'm s^{-1}', true), 'v\\ /\\ \\mathrm{m\\,s^{-1}}');
});

test('pasting a spreadsheet block adds rows and columns and reads headers', () => {
	const state = model.createState();
	const ids = model.createIdSource(state);
	const sheet = state.sheets[0];
	const grid = model.parsePastedText('L / m\tT1 (s)\tT2 (s)\n0.2\t0.90\t0.92\n0.4\t1.27\t1.25\n');
	const result = model.applyPaste(sheet, 0, 0, grid, () => model.createColumn(ids.next('c'), { role: 'Y' }, 0));
	assert.equal(result.headers, true);
	assert.equal(sheet.columns.length, 3);
	assert.deepEqual(sheet.columns.map(c => [c.name, c.unit]), [['L', 'm'], ['T1', 's'], ['T2', 's']]);
	assert.deepEqual(sheet.columns[2].cells.slice(0, 2), ['0.92', '1.25']);
	assert.equal(sheet.columns[2].cells.length, sheet.rowCount);
});

test('a numeric block pasted lower down is all data', () => {
	const state = model.createState();
	const ids = model.createIdSource(state);
	const sheet = state.sheets[0];
	const result = model.applyPaste(sheet, 9, 1, model.parsePastedText('1,2\n3,4'), () => model.createColumn(ids.next('c'), { role: 'Y' }, 0));
	assert.equal(result.headers, false);
	assert.equal(sheet.rowCount, 11);
	assert.deepEqual([sheet.columns[1].cells[10], sheet.columns[2].cells[10]], ['3', '4']);
});

test('rows and columns insert, move and remove consistently', () => {
	const sheet = sheetWith([['X', ['1', '2']], ['Y', ['3', '4']]]);
	model.insertRow(sheet, 1);
	assert.deepEqual(sheet.columns[0].cells, ['1', '', '2']);
	model.removeRow(sheet, 0);
	assert.deepEqual(sheet.columns[1].cells, ['', '4']);
	model.insertColumn(sheet, 1, model.createColumn('n', { role: 'yErr' }, 0));
	assert.equal(sheet.columns[1].cells.length, sheet.rowCount);
	assert.equal(model.moveColumn(sheet, 'n', 1), true);
	assert.equal(sheet.columns[2].id, 'n');
	assert.equal(model.moveColumn(sheet, 'n', 1), false);
	assert.equal(model.removeColumn(sheet, 'n').id, 'n');
});

test('saved state is repaired rather than rejected', () => {
	assert.equal(model.normalizeState(null).sheets.length, 1);
	const repaired = model.normalizeState({ sheets: [{ id: 's1', columns: [{ id: 'c1', role: 'bogus', cells: ['1', 2] }, { id: 'c1', cells: [] }] }], activeSheet: 9, nextId: 'x' });
	const sheet = repaired.sheets[0];
	assert.equal(repaired.activeSheet, 0);
	assert.equal(sheet.columns[0].role, 'Y');
	assert.notEqual(sheet.columns[0].id, sheet.columns[1].id);
	assert.equal(sheet.columns[1].cells.length, sheet.rowCount);
	assert.equal(sheet.columns[0].cells[1], '2');
	const ids = model.createIdSource(repaired);
	const fresh = ids.next('c');
	assert.ok(!sheet.columns.some(column => column.id === fresh));
});

const math = require('../js/vendor/math.min.js');

function namedSheet(columns) {
	const sheet = sheetWith(columns.map(([role, cells, extra]) => [role, cells, extra]));
	return sheet;
}

test('formula columns use letters or names, keep ten significant figures and leave blank rows blank', () => {
	const sheet = namedSheet([['X', ['0.2', '0.4', ''], { name: 'L' }], ['Y', ['1.55', '1.27', '1'], { name: 'T' }], ['Y', [], { formula: '=T^2' }], ['Y', [], { formula: 'A/B' }]]);
	model.recomputeFormulas(sheet, math);
	assert.deepEqual(sheet.columns[2].cells.slice(0, 3), ['2.4025', '1.6129', '1']);
	assert.deepEqual(sheet.columns[3].cells.slice(0, 3), ['0.1290322581', '0.3149606299', '']);
	assert.equal(sheet.columns[2].formulaError, '');
});

test('formulas can build on other formula columns in any order', () => {
	const sheet = namedSheet([['X', ['2']], ['Y', [], { formula: 'C + 1' }], ['Y', [], { formula: 'A^2' }]]);
	model.recomputeFormulas(sheet, math);
	assert.equal(sheet.columns[1].cells[0], '5');
});

test('unknown names, unsafe syntax and loops are reported, not evaluated', () => {
	const sheet = namedSheet([['X', ['2']], ['Y', [], { formula: 'q*2' }], ['Y', [], { formula: 'D' }], ['Y', [], { formula: 'C' }], ['Y', [], { formula: 'f(x) = x' }], ['Y', [], { formula: 'import(1)' }]]);
	model.recomputeFormulas(sheet, math);
	assert.match(sheet.columns[1].formulaError, /q is not a column/);
	assert.match(sheet.columns[2].formulaError, /depends on itself/);
	assert.match(sheet.columns[3].formulaError, /depends on itself/);
	assert.ok(sheet.columns[4].formulaError);
	assert.match(sheet.columns[5].formulaError, /not an available function/);
	assert.equal(sheet.columns[1].cells[0], '');
});

test('a column letter wins over Euler\'s E, and pi still works', () => {
	const sheet = namedSheet([['X', ['1']], ['Y', ['2']], ['Y', ['3']], ['Y', ['4']], ['Y', ['5']], ['Y', [], { formula: 'E + 0*pi' }]]);
	model.recomputeFormulas(sheet, math);
	assert.equal(sheet.columns[5].cells[0], '5');
});

test('letters in formulas follow columns that move or are deleted', () => {
	const sheet = namedSheet([['X', ['1']], ['Y', ['2']], ['Y', [], { formula: 'B^2' }]]);
	const before = sheet.columns.map(column => column.id);
	model.moveColumn(sheet, sheet.columns[1].id, -1);
	model.remapFormulaLetters(sheet, before, math);
	assert.equal(sheet.columns[2].formula, 'A ^ 2');
	model.recomputeFormulas(sheet, math);
	assert.equal(sheet.columns[2].cells[0], '4');
	const beforeDelete = sheet.columns.map(column => column.id);
	model.removeColumn(sheet, sheet.columns[0].id);
	model.remapFormulaLetters(sheet, beforeDelete, math);
	model.recomputeFormulas(sheet, math);
	assert.match(sheet.columns[1].formulaError, /deleted/);
});

test('mean of repeats and half the spread', () => {
	const sheet = namedSheet([['X', ['0.2']], ['Y', ['0.90'], { name: 'T1' }], ['Y', ['0.92'], { name: 'T2' }], ['Y', ['0.89'], { name: 'T3' }]]);
	const repeats = sheet.columns.slice(1);
	assert.equal(model.getRepeatBaseName(repeats.map(column => column.name)), 'T');
	assert.equal(model.getRepeatBaseName(['a', 'b']), 'mean');
	const formulas = model.buildRepeatFormulas(sheet, repeats);
	assert.equal(formulas.mean, 'mean(B, C, D)');
	model.insertColumn(sheet, 4, model.createColumn('m', { formula: formulas.mean }, 0));
	model.insertColumn(sheet, 5, model.createColumn('h', { role: 'yErr', formula: formulas.halfSpread }, 0));
	model.recomputeFormulas(sheet, math);
	assert.equal(sheet.columns[4].cells[0], '0.9033333333');
	assert.equal(sheet.columns[5].cells[0], '0.015');
});

test('CSV parsing handles quotes, semicolons and a byte-order mark', () => {
	assert.deepEqual(model.parseCsv('﻿"L / m","note, with comma"\r\n0.2,"say ""hi"""\n\n'), [['L / m', 'note, with comma'], ['0.2', 'say "hi"']]);
	assert.deepEqual(model.parseCsv('a;b\n1,5;2'), [['a', 'b'], ['1,5', '2']]);
});

test('CSV export round-trips names, units and every column', () => {
	const sheet = namedSheet([['X', ['0.2', '0.4', ''], { name: 'L', unit: 'm' }], ['Y', ['0.9', '', ''], { name: 'T, mean', unit: 's' }]]);
	const csv = model.buildCsv(sheet);
	assert.equal(csv, 'L / m,"T, mean / s"\r\n0.2,0.9\r\n0.4,\r\n');
	const rows = model.parseCsv(csv);
	const state = model.createState();
	const target = model.importRows(state.sheets[0], rows, { headers: true, roles: rows[0].map(model.guessImportRole) }, model.createIdSource(state));
	assert.deepEqual(target.columns.map(column => [column.name, column.unit, column.role]), [['L', 'm', 'X'], ['T, mean', 's', 'Y']]);
	assert.deepEqual(target.columns[1].cells.slice(0, 2), ['0.9', '']);
});

test('import suggests uncertainty roles only from clear headings', () => {
	const roles = ['t / s', 'x / m', 'Δx / m', 'uncertainty in y (%)', 'T2', 'dT', 'density'].map(model.guessImportRole);
	assert.deepEqual(roles.map(entry => entry.role), ['X', 'Y', 'xErr', 'yErr', 'Y', 'yErr', 'Y']);
	assert.equal(roles[3].errorType, 'percentage');
});

test('an uncertainty heading goes to the column it names', () => {
	const roles = model.guessImportRoles(['t / s', 'x1 / m', 'x2 / m', 'Δx / m', 'Δt / s', 'T uncertainty (%)', 'T / s']);
	assert.deepEqual(roles.map(entry => entry.role), ['X', 'Y', 'Y', 'yErr', 'xErr', 'yErr', 'Y']);
	assert.equal(roles[5].errorType, 'percentage');
});

test('a formula cannot use its own column', () => {
	const sheet = namedSheet([['X', ['1']], ['Y', [], { formula: 'B + 1' }]]);
	model.recomputeFormulas(sheet, math);
	assert.match(sheet.columns[1].formulaError, /its own column/);
});

test('uncertainties propagate through a formula: Δ(T²) = 2TΔT', () => {
	const sheet = namedSheet([
		['X', ['0.5', '1'], { name: 'L' }], ['Y', ['1.5', '2'], { name: 'T' }], ['yErr', ['0.01', '2'], { errorType: 'percentage' }],
		['Y', [], { formula: 'T^2', name: 'T2' }], ['yErr', [], {}]
	]);
	sheet.columns[2].errorType = 'absolute';
	sheet.columns[2].cells = ['0.01', '0.02'];
	sheet.columns[4].propagateFrom = sheet.columns[3].id;
	model.recomputeFormulas(sheet, math);
	assert.deepEqual(sheet.columns[4].cells.slice(0, 2), ['0.03', '0.08']);
	sheet.columns[2].errorType = 'percentage';
	sheet.columns[2].cells = ['1', '1'];
	model.recomputeFormulas(sheet, math);
	assert.deepEqual(sheet.columns[4].cells.slice(0, 2), ['0.045', '0.08']);
});

test('independent uncertainties add in quadrature, and chained formulas carry them on', () => {
	const sheet = namedSheet([
		['X', ['3'], { name: 'x' }], ['xErr', ['0.3']], ['Y', ['4'], { name: 'y' }], ['yErr', ['0.4']],
		['Y', [], { formula: 'x*y', name: 'p' }], ['yErr', []], ['Y', [], { formula: '2*p', name: 'q' }], ['yErr', []]
	]);
	sheet.columns[5].propagateFrom = sheet.columns[4].id;
	sheet.columns[7].propagateFrom = sheet.columns[6].id;
	model.recomputeFormulas(sheet, math);
	// Δp = √((4·0.3)² + (3·0.4)²) = √2.88; Δq = 2Δp
	assert.equal(sheet.columns[5].cells[0], String(Number(Math.sqrt(2.88).toPrecision(6))));
	// Δq builds on the stored (rounded) Δp.
	assert.equal(sheet.columns[7].cells[0], String(Number((2 * Number(sheet.columns[5].cells[0])).toPrecision(6))));
	const working = model.describePropagation(sheet, sheet.columns[4], math);
	assert.deepEqual(working.terms.map(term => term.symbol), ['x', 'y']);
	assert.ok(working.terms.every(term => term.derivative));
});

test('a propagated column whose formula is removed reports it', () => {
	const sheet = namedSheet([['X', ['1']], ['Y', [], { formula: 'A^2' }], ['yErr', []]]);
	sheet.columns[2].propagateFrom = sheet.columns[1].id;
	sheet.columns[1].formula = '';
	model.recomputeFormulas(sheet, math);
	assert.match(sheet.columns[2].formulaError, /no longer has a formula/);
});

test('Fill with one value follows the readings an uncertainty belongs to', () => {
	const sheet = namedSheet([
		['X', ['0.2', '0.4', '0.6', '0.8', '']], ['Y', ['0.9', '', '1.5', '1.8', ''], { name: 'T' }], ['yErr', ['', '', '', '', '']],
		['Y', ['5', '6', '7', '8', '']], ['yErr', []], ['Y', ['', '', '', '', '']]
	]);
	const target = model.getFillTarget(sheet, sheet.columns[2]);
	assert.equal(target.owner, sheet.columns[1]);
	assert.deepEqual(target.rows, [0, 2, 3]);
	assert.deepEqual(model.getFillTarget(sheet, sheet.columns[4]).rows, [0, 1, 2, 3]);
	// A column that is not an uncertainty follows rows with data anywhere else.
	const plain = model.getFillTarget(sheet, sheet.columns[5]);
	assert.equal(plain.owner, null);
	assert.deepEqual(plain.rows, [0, 1, 2, 3]);
});

test('a dragged column lands where it is dropped, and formula letters follow it', () => {
	const sheet = namedSheet([['X', ['1']], ['Y', ['2'], { name: 'a' }], ['Y', ['3'], { name: 'b' }], ['Y', [], { formula: 'B + C' }]]);
	const before = sheet.columns.map(column => column.id);
	assert.equal(model.moveColumnTo(sheet, sheet.columns[1].id, 3), true);
	assert.deepEqual(sheet.columns.map(column => column.name || column.formula), ['', 'b', 'B + C', 'a']);
	model.remapFormulaLetters(sheet, before, math);
	model.recomputeFormulas(sheet, math);
	assert.equal(sheet.columns[2].cells[0], '5');
	assert.equal(model.moveColumnTo(sheet, sheet.columns[0].id, 0), false);
});

test('Clear keeps the columns; Reset returns to a blank x, y sheet', () => {
	const state = model.createState();
	const ids = model.createIdSource(state);
	const sheet = namedSheet([['X', ['1', '2'], { name: 'L', unit: 'm' }], ['Y', ['3', '4'], { name: 'T' }], ['Y', [], { formula: 'B^2', name: 'T2' }]]);
	sheet.name = 'Pendulum';
	sheet.hiddenSeries = [sheet.columns[1].id];
	model.setRowCount(sheet, 14);
	model.clearSheetData(sheet);
	assert.equal(sheet.rowCount, model.DEFAULT_ROWS);
	assert.deepEqual(sheet.columns.map(column => [column.name, column.unit, column.formula]), [['L', 'm', ''], ['T', '', ''], ['T2', '', 'B^2']]);
	assert.ok(sheet.columns.every(column => column.cells.every(model.isBlank)));
	const id = sheet.id;
	model.resetSheet(sheet, ids);
	assert.equal(sheet.id, id);
	assert.equal(sheet.name, 'Pendulum');
	assert.deepEqual(sheet.columns.map(column => [column.name, column.role]), [['x', 'X'], ['y', 'Y']]);
	assert.deepEqual(sheet.hiddenSeries, []);
	assert.equal(sheet.title.automatic, true);
});

test('a missing repeat reading is left out of the mean, not blanking the row', () => {
	const sheet = namedSheet([
		['X', ['0.2', '0.4', '0.6']], ['Y', ['0.90', '1.27', '']], ['Y', ['', '1.25', '']], ['Y', ['0.88', '1.28', '']],
		['Y', [], { formula: 'mean(B, C, D)' }], ['yErr', [], { formula: 'halfspread(B, C, D)' }], ['Y', [], { formula: 'mean(B, C) + D' }]
	]);
	assert.equal(model.buildRepeatFormulas(sheet, sheet.columns.slice(1, 4)).halfSpread, 'halfspread(B, C, D)');
	model.recomputeFormulas(sheet, math);
	assert.deepEqual(sheet.columns[4].cells.slice(0, 3), ['0.89', '1.266666667', '']);
	assert.deepEqual(sheet.columns[5].cells.slice(0, 3), ['0.01', '0.015', '']);
	// D is used outside the mean, so a blank D still blanks the row.
	sheet.columns[3].cells[0] = '';
	model.recomputeFormulas(sheet, math);
	assert.equal(sheet.columns[6].cells[0], '');
	assert.equal(sheet.columns[4].cells[0], '0.9');
	// One reading has no spread, so its half spread is blank rather than zero.
	assert.equal(sheet.columns[5].cells[0], '');
});

test('formulas follow a renamed column, by name or by letter', () => {
	const sheet = namedSheet([['X', ['2'], { name: 'L' }], ['Y', ['3'], { name: 'T' }], ['Y', [], { formula: 'T^2 / L' }]]);
	let before = model.getFormulaSymbols(sheet);
	sheet.columns[1].name = 'T1';
	assert.equal(model.remapFormulaNames(sheet, before, math), true);
	assert.equal(sheet.columns[2].formula, 'T1 ^ 2 / L');
	model.recomputeFormulas(sheet, math);
	assert.equal(sheet.columns[2].cells[0], '4.5');
	// A name that is not one word falls back to the column letter.
	before = model.getFormulaSymbols(sheet);
	sheet.columns[1].name = 'T (s)';
	model.remapFormulaNames(sheet, before, math);
	assert.equal(sheet.columns[2].formula, 'B ^ 2 / L');
	// Letters are left alone by renames.
	before = model.getFormulaSymbols(sheet);
	sheet.columns[0].name = 'length';
	model.remapFormulaNames(sheet, before, math);
	assert.equal(sheet.columns[2].formula, 'B ^ 2 / length');
});

test('a saved (max - min) / 2 half spread is upgraded to halfspread', () => {
	const state = model.normalizeState({ sheets: [{ id: 's1', columns: [{ id: 'c1', role: 'yErr', formula: '(max(C, B, D) - min(C, B, D)) / 2', cells: [] }, { id: 'c2', formula: '(max(B) - min(C)) / 2', cells: [] }] }] });
	assert.equal(state.sheets[0].columns[0].formula, 'halfspread(C, B, D)');
	assert.equal(state.sheets[0].columns[1].formula, '(max(B) - min(C)) / 2');
});

test('a selected range copies as tab-separated rows and fills around calculated columns', () => {
	const sheet = namedSheet([['X', ['1', '2', '3']], ['Y', ['4', '5', '6']], ['Y', [], { formula: 'B * 2' }]]);
	model.recomputeFormulas(sheet, math);
	assert.equal(model.getRangeText(sheet, { r0: 1, r1: 0, c0: 2, c1: 0 }), '1\t4\t8\n2\t5\t10');
	assert.equal(model.fillRange(sheet, { r0: 0, r1: 1, c0: 1, c1: 2 }, '9'), 2);
	assert.deepEqual(sheet.columns[1].cells.slice(0, 3), ['9', '9', '6']);
	assert.equal(model.fillRange(sheet, { r0: 2, r1: 2, c0: 0, c1: 1 }, ''), 2);
	assert.deepEqual([sheet.columns[0].cells[2], sheet.columns[1].cells[2]], ['', '']);
});
