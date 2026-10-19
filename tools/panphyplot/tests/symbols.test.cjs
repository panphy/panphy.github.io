const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../js/model.js');
const stats = require('../js/stats.js');

test('fit symbols accept compact physics notation and reject malformed or executable TeX', () => {
	for (const symbol of ['R_1', 't_1', 'R_{out}', '\\theta', '\\Delta T', 'T^2', '\\sigma_{x}', 'R_{\\mathrm{out}}']) {
		assert.equal(model.isFitSymbol(symbol), true, symbol);
	}
	for (const symbol of ['', 'Temperature', 'R_', 't_{1', 't_1_2', 'x=y', '\\unknown', '\\href{url}{x}', '\\def\\x{y}', '<img>']) {
		assert.equal(model.isFitSymbol(symbol), false, symbol);
	}
});

test('symbols survive workspace normalization without changing names, data, or fit results', () => {
	const state = model.createState();
	state.sheets[0].columns[0].fitSymbol = 't_1';
	state.sheets[0].columns[1].fitSymbol = 'R_1';
	state.fits = { example: { equation: 'y = 2x + 1' } };
	const restored = model.normalizeState(JSON.parse(JSON.stringify(state)));
	assert.deepEqual(restored.sheets[0].columns, state.sheets[0].columns);
	assert.deepEqual(restored.fits, state.fits);
	assert.equal(model.createColumn('bad', { fitSymbol: '\\invalid' }).fitSymbol, '');
});

test('only single-letter column names supply automatic symbols', () => {
	assert.equal(model.getFitSymbol({ name: 't' }, 'x'), 't');
	assert.equal(model.getFitSymbol({ name: 'Time' }, 'x'), 'x');
	assert.equal(model.getFitSymbol({ name: 'Temperature', fitSymbol: 'T' }, 'y'), 'T');
	assert.equal(model.getFitSymbol({ name: 'R_1' }, 'y'), 'y');
});

test('renaming axes is simultaneous and preserves commands and subscript integers', () => {
	assert.equal(model.formatFitSymbols('y = 2x^2 + 3x + 1', 't_1', 'R_1'), '{R_1} = 2{t_1}^2 + 3{t_1} + 1');
	assert.equal(model.formatFitSymbols('y = 2x', 'y', 'x'), '{x} = 2{y}');
	assert.equal(model.formatFitSymbols('y = 2\\exp(x) + \\xi + 1\\times 10^{-3}x', '\\theta', 'R_1'), '{R_1} = 2\\exp({\\theta}) + \\xi + 1\\times 10^{-3}{\\theta}');
	const rounded = stats.roundEquationDecimals('y = 2.345x^2', 1);
	assert.equal(model.formatFitSymbols(rounded, 't_1', 'R_2'), '{R_2} = 2.3{t_1}^2');
	assert.equal(model.formatFitSymbols('y = 2x^2', 'T^2', 'R'), '{R} = 2\\left(T^2\\right)^2');
});
