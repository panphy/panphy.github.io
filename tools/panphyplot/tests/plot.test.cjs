const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const model = require('../js/model.js');

function harness() {
	const elements = Object.fromEntries(['plot', 'popup-plot', 'combined-title', 'combined-x-label', 'combined-y-label'].map(id => [id, {
		dataset: {}, value: '', handlers: {}, on(name, handler) { this.handlers[name] = handler; }
	}]));
	const context = {
		console, PanPhyPlotModel: model, addEventListener() {},
		document: { documentElement: { getAttribute: () => 'light' }, getElementById: id => elements[id] || null, addEventListener() {} },
		getComputedStyle: () => ({ getPropertyValue: () => '' }),
		Plotly: { Icons: { autoscale: {} }, react(id, data, layout) { Object.assign(elements[id], { data, layout }); } },
		getSheetDisplayName: () => 'Trial', onSeriesVisibilityChange() {}
	};
	context.window = context;
	vm.createContext(context);
	const run = source => vm.runInContext(source, context);
	for (const file of ['state.js', 'plot.js']) run(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'));
	run(`
		const sheet = getActiveSheet();
		const ids = PlotModel.createIdSource(plotState);
		sheet.columns = ['t', 'x', 'y', 'vx', 'vy', 'empty'].map((name, i) => PlotModel.createColumn(ids.next('c'), {
			name, role: i === 0 ? 'X' : 'Y', cells: i === 5 ? [] : ['1', '2', '3']
		}, 3));
		sheet.hiddenSeries = sheet.columns.slice(2, 5).map(column => column.id);
		for (const column of sheet.columns.slice(1)) fittedCurves[makeFitKey(sheet, column.id)] = { x: [1, 3], y: [1, 3] };
	`);
	return { context, elements, run };
}

const legend = graph => graph.layout.showlegend
	? graph.data.filter(trace => trace.visible !== false && trace.visible !== 'legendonly' && trace.showlegend !== false).map(trace => trace.name)
	: [];

test('main and All sheets legends contain visible readings and fits only, and restore hidden series', () => {
	const { context, elements, run } = harness();
	for (const [draw, id] of [['plotGraph', 'plot'], ['plotAllSheets', 'popup-plot']]) {
		context[draw]();
		const graph = elements[id];
		assert.deepEqual(Array.from(legend(graph)), ['x', 'Fit: x']);
		const markerColor = graph.data[1].marker.color;
		// Clicking the fit entry hides the paired points as well as the fit.
		const fitIndex = graph.data.findIndex(trace => trace.mode === 'lines');
		assert.equal(graph.handlers.plotly_legendclick({ data: graph.data, curveNumber: fitIndex }), false);
		context[draw]();
		assert.deepEqual(Array.from(legend(graph)), []);
		assert.equal(graph.data.every(trace => trace.visible === false), true);
		// The Series card restores series through hiddenSeries; colors remain stable.
		run('sheet.hiddenSeries = sheet.columns.slice(3, 5).map(column => column.id)');
		context[draw]();
		assert.deepEqual(Array.from(legend(graph)), ['x', 'y', 'Fit: x', 'Fit: y']);
		assert.equal(graph.data[1].marker.color, markerColor);
		run('sheet.hiddenSeries = sheet.columns.slice(2, 5).map(column => column.id)');
	}
});

test('one visible fitted series keeps its legend, with stale and LaTeX fit labels', () => {
	const { context, elements, run } = harness();
	run(`sheet.columns = sheet.columns.slice(0, 2); datasetFitResults[makeFitKey(sheet, sheet.columns[1].id)] = { stale: true }; latexMode = true;`);
	context.plotGraph();
	assert.deepEqual(Array.from(legend(elements.plot)), ['$x$', '$\\text{Outdated fit: }x$']);
	run('fittedCurves = {}');
	context.plotGraph();
	assert.equal(elements.plot.layout.showlegend, false);
});
