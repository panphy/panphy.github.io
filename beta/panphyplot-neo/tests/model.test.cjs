// Run with: node --test beta/panphyplot-neo/tests/model.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../js/neo-model.js');

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
