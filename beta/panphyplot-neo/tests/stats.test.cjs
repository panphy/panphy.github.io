// Run with: node --test beta/panphyplot-neo/tests/stats.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const stats = require('../js/neo-stats.js');

const near = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);

test('an unweighted line matches the textbook formulas', () => {
	// Hand-checked: x = 1..4, y = 2.1, 3.9, 6.2, 7.8 gives m = 1.94, c = 0.15.
	const fit = stats.linearFit([1, 2, 3, 4], [2.1, 3.9, 6.2, 7.8]);
	near(fit.m, 1.94);
	near(fit.c, 0.15);
	const ssr = fit.residuals.reduce((sum, r) => sum + r * r, 0);
	near(fit.uncertaintyM, Math.sqrt((4 * ssr / 2) / (4 * 30 - 100)));
	assert.equal(fit.chi2, null);
});

test('equal weights give the unweighted line, and unequal weights pull towards precise points', () => {
	const x = [0, 1, 2, 3];
	const y = [0.1, 0.9, 2.2, 2.8];
	const plain = stats.linearFit(x, y);
	const equal = stats.linearFit(x, y, [0.1, 0.1, 0.1, 0.1]);
	near(equal.m, plain.m);
	near(equal.c, plain.c);
	// With σ known, the slope's uncertainty is √(S/Δ), independent of the scatter.
	near(equal.uncertaintyM, Math.sqrt(400 / (400 * 1400 - 600 * 600)));
	const weighted = stats.linearFit(x, y, [1, 0.01, 0.01, 1]);
	near(weighted.m, (2.2 - 0.9) / 1, 1e-3);
});

test('Jacobian uncertainties reproduce the straight-line result', () => {
	const x = [0, 1, 2, 3, 4];
	const y = [1.1, 2.9, 5.2, 6.8, 9.1];
	const sigmas = [0.2, 0.2, 0.3, 0.3, 0.4];
	const line = stats.linearFit(x, y, sigmas);
	const jacobian = x.map(xi => [xi, 1]);
	const [um, uc] = stats.parameterUncertainties(jacobian, line.residuals, sigmas);
	near(um, line.uncertaintyM);
	near(uc, line.uncertaintyC);
	const plain = stats.linearFit(x, y);
	const [pm] = stats.parameterUncertainties(jacobian, plain.residuals);
	near(pm, plain.uncertaintyM);
});

test('measurements print the uncertainty to two significant figures', () => {
	assert.equal(stats.formatMeasurement(2.00345, 0.0123), '2.003 \\pm 0.012');
	assert.equal(stats.formatMeasurement(9.8123, 0.31), '9.81 \\pm 0.31');
	assert.equal(stats.formatMeasurement(-0.004567, 0.00012), '-0.00457 \\pm 0.00012');
	assert.equal(stats.formatMeasurement(6.63e-5, 2.1e-6), '(6.63 \\pm 0.21) \\times 10^{-5}');
	assert.equal(stats.formatMeasurement(123456, 789), '(1.2346 \\pm 0.0079) \\times 10^{5}');
	assert.equal(stats.formatChiSquared(4.5, 3), '1.5');
	assert.equal(stats.formatChiSquared(4.5, 0), null);
});

test('equation numbers round to the chosen decimal places, leaving powers alone', () => {
	const round = stats.roundEquationDecimals;
	assert.equal(round('y = 3.9733886x + 0.02296165', 2), 'y = 3.97x + 0.02');
	assert.equal(round('y = 3.9733886x + 0.02296165', 4), 'y = 3.9734x + 0.0230');
	assert.equal(round('y = 3.9733886x - 0.0022', 2), 'y = 3.97x - 2.20\\times 10^{-3}');
	assert.equal(round('y = 2\\cdot\\sqrt{ x}', 2), 'y = 2.00\\cdot\\sqrt{ x}');
	assert.equal(round('y = 1.5u^{2} + 0.25u', 1), 'y = 1.5u^{2} + 0.3u');
	assert.equal(round('y = 17.233099(x + 0.59843366)^{0.090728152} - 15.968354', 2), 'y = 17.23(x + 0.60)^{0.09} - 15.97');
	assert.equal(round('y = 6.02214\\times 10^{23}x', 3), 'y = 6.022\\times 10^{23}x');
	assert.equal(round('y = 4.5\\cdot10^{-7}x', 2), 'y = 4.50\\times 10^{-7}x');
	assert.equal(round('y = 1.2e-5 e^{0.5x}', 1), 'y = 1.2\\times 10^{-5} e^{0.5x}');
	assert.equal(round('y = 3.9733886x', 0), 'y = 4x');
});
