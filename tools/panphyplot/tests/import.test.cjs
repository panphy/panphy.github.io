const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const model = require('../js/model.js');
const legacy = require('../js/legacy-import.js');

const original = {
	rawData: [[{ x: 1, y: 2, xErrorRaw: 0.1, yErrorRaw: 5 }], [], [{ x: 3, y: 4, yErrorRaw: 0.2 }]],
	datasetDraftRows: { 0: [{ xValue: '1.00', yValue: '2.0', xErrorValue: '0.10', yErrorValue: '5' }, { xValue: '1e', yValue: '', xErrorValue: '', yErrorValue: '' }] },
	datasetHeaders: { 0: { x: 'Time / s', y: 'Distance (m)' } },
	datasetNames: { 0: 'Trial A' }, datasetTitles: { 0: { text: 'My graph', automatic: false } },
	datasetToggles: { 0: { x: true, y: true }, 2: { y: false } },
	datasetErrorTypes: { 0: { x: 'absolute', y: 'percentage' } }
};

test('original datasets append without replacing trial sheets or changing the source; draft text and uncertainty types survive reload', () => {
	const before = JSON.stringify(original);
	const state = model.createState();
	state.sheets[0].columns[0].cells[0] = 'beta reading';
	const [sheet, disabled] = legacy.appendOriginalSheets(state, original);
	assert.equal(state.sheets.length, 3);
	assert.equal(state.sheets[0].columns[0].cells[0], 'beta reading');
	assert.equal(sheet.name, 'Trial A');
	assert.deepEqual(sheet.title, { text: 'My graph', automatic: false });
	assert.deepEqual(sheet.columns.map(c => [c.name, c.unit, c.role, c.errorType]), [
		['Time', 's', 'X', 'absolute'], ['ΔTime', 's', 'xErr', 'absolute'],
		['Distance', 'm', 'Y', 'absolute'], ['ΔDistance', '%', 'yErr', 'percentage']
	]);
	assert.deepEqual(sheet.columns[0].cells, ['1.00', '1e']);
	assert.deepEqual(model.getSeriesPoints(sheet, model.getSeries(sheet)[0]).map(p => [p.x, p.y, p.xError, p.yError]), [[1, 2, 0.1, 0.1]]);
	assert.equal(disabled.columns.at(-1).role, 'none');
	assert.equal(disabled.columns.at(-1).cells[0], '0.2');
	const ids = state.sheets.flatMap(s => [s.id, ...s.columns.map(c => c.id)]);
	assert.equal(new Set(ids).size, ids.length);
	assert.equal(JSON.stringify(original), before);
	assert.deepEqual(model.normalizeState(JSON.parse(JSON.stringify(state))).sheets, state.sheets);
});

test('older saved datasets, X-only data, empty and malformed storage are handled', () => {
	for (const input of [null, {}, { rawData: [[]] }]) assert.equal(legacy.appendOriginalSheets(model.createState(), input).length, 0);
	const state = model.createState();
	const [sheet] = legacy.appendOriginalSheets(state, { rawData: [[]], dataset1XValues: ['0.00', '2e-3'] });
	assert.deepEqual(sheet.columns[0].cells, ['0.00', '2e-3']);
	assert.deepEqual(sheet.columns[1].cells, ['', '']);
	const longName = 'Long experimental quantity '.repeat(3);
	const [long] = legacy.appendOriginalSheets(state, { rawData: [[{ x: 1, y: null }]], datasetHeaders: { 0: { x: `${longName} / kg` } } });
	assert.equal(model.normalizeState(state).sheets.at(-1).columns[0].name, longName.trim());
	assert.equal(long.columns[1].cells[0], '');
});

function harness() {
	const saved = new Map([['panphyplot-neo-state-v1', JSON.stringify(model.createState())], ['panphyplot-state-v2', JSON.stringify(original)]]);
	const context = { console, PanPhyPlotModel: model, PanPhyPlotLegacyImport: legacy,
		localStorage: { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) },
		addEventListener() {}, document: { addEventListener() {} }, clearTimeout() {}, setTimeout() {} };
	context.window = context;
	vm.createContext(context);
	vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/state.js'), 'utf8'), context);
	const run = source => vm.runInContext(source, context);
	run('loadState()');
	return { context, saved, run };
}

test('accepted and declined decisions persist with the beta workspace; original storage stays byte-identical', () => {
	for (const accepted of [true, false]) {
		const h = harness();
		const source = h.saved.get('panphyplot-state-v2');
		h.context.commitOriginalImport(original, accepted);
		h.run('loadState(); saveState()');
		const saved = JSON.parse(h.saved.get('panphyplot-neo-state-v1'));
		assert.equal(saved.originalImportDecision, accepted ? 'accepted' : 'declined');
		assert.equal(saved.sheets.length, accepted ? 3 : 1);
		assert.equal(h.saved.get('panphyplot-state-v2'), source);
	}
});

test('quota failure, practice tour and another-tab conflict cannot consume the offer or append sheets', () => {
	const h = harness();
	const before = h.saved.get('panphyplot-neo-state-v1');
	h.context.localStorage.setItem = () => { throw new Error('Quota exceeded'); };
	assert.throws(() => h.context.commitOriginalImport(original, true), /Quota/);
	assert.equal(h.run('plotState.sheets.length'), 1);
	assert.equal(h.run('plotState.originalImportDecision'), null);
	assert.equal(h.saved.get('panphyplot-neo-state-v1'), before);
	for (const flag of ['persistenceDisabled', 'changedElsewhere']) {
		h.run(`${flag} = true`);
		assert.throws(() => h.context.commitOriginalImport(original, true));
		h.run(`${flag} = false`);
	}
});
