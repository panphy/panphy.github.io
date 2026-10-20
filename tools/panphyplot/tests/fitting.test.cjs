// Exercise automatic initializers and the production solvers, including worker parity.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../../..');
const js = path.join(root, 'tools/panphyplot/js');
function harness() {
	let data = [];
	const elements = {};
	const context = { console, debounce: f => f, activeFitKey: 'test',
		getDatasetPoints: () => data.slice(), getFiniteDatasetPoints: () => data.slice(),
		getWeightingRequested: () => false, PanPhyPlotStats: require('../js/stats.js'),
		document: { getElementById: id => elements[id] ||= { value: '' } } };
	context.window = context;
	vm.createContext(context);
	for (const file of ['vendor/math.min.js', 'fit-core.js']) vm.runInContext(fs.readFileSync(path.join(js, file), 'utf8'), context);
	const source = fs.readFileSync(path.join(js, 'fitting.js'), 'utf8').replace(/\}\)\(\);\s*$/, 'window.testFit = { getCustomFitDataStats, getCustomFitGuessByName, buildCustomFitInitialCandidates, solveLinearCustomFit, finalizeParametricFit }; })();');
	vm.runInContext(source, context);
	return { context, core: context.PanPhyFitCore, api: context.testFit, elements, setData: points => { data = points; } };
}
const h = harness(), core = h.core;
const points = (n, lo, hi, f) => Array.from({ length: n }, (_, i) => { const x = lo + (hi - lo) * i / (n - 1); return { x, y: f(x) }; });
function near(value, expected, tolerance = 1e-6) { assert.ok(Math.abs(value - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${value} != ${expected}`); }
function predictions(data, evaluate, tolerance = 1e-7) {
	const scale = Math.max(...data.map(p => Math.abs(p.y))) || 1;
	for (const p of data) assert.ok(Number.isFinite(evaluate(p.x)) && Math.abs(evaluate(p.x) - p.y) < tolerance * scale, `bad prediction at ${p.x}`);
}

test('Gaussian automatic guesses recover off-centre peaks, dips, baselines and small units', () => {
	for (const A of [3, -3]) for (const c of [0, 10]) for (const scale of [1, 1e-6]) {
		const truth = { A, c, mu: 2 * scale, sigma: 0.3 * scale };
		const data = points(101, 0, 10 * scale, x => core.evaluateGaussian(truth, x));
		h.setData(data); h.context.setInitialParameters('Gaussian');
		const initial = { A: +h.elements['initial-A-gaussian'].value, mu: +h.elements['initial-mu'].value, sigma: +h.elements['initial-sigma'].value, c: +h.elements['initial-c-gaussian'].value };
		const fit = core.solveGaussian(data, initial);
		assert.ok(fit?.converged); near(fit.params.mu / scale, 2); near(fit.params.sigma / scale, 0.3);
		predictions(data, x => core.evaluateGaussian(fit.params, x));
	}
});

test('sinusoidal automatic fit resolves the original alias and agrees between samples', () => {
	const truth = { A: 2, b: 0, k: 20, phi: 0.2, c: 1 };
	const data = points(101, 0, 10, x => core.evaluateSinusoidal(truth, x));
	h.setData(data); h.context.setInitialParameters('Sinusoidal');
	const initial = Object.fromEntries(['A', 'b', 'k', 'phi', 'c'].map(key => [key, +h.elements['initial-' + key].value]));
	const fit = core.solveSinusoidal(data, initial);
	near(fit.params.k, 20); assert.ok(fit.converged);
	predictions(points(202, 0, 10, x => core.evaluateSinusoidal(truth, x)), x => core.evaluateSinusoidal(fit.params, x));
});

test('sinusoidal initialization handles low frequency, damping and irregular sampling', () => {
	for (const scale of [1, 10000]) {
		const truth = { A: 2, b: -0.5 / scale, k: 3 / scale, phi: 0.2, c: 1 };
		const data = Array.from({ length: 101 }, (_, i) => {
			const x = scale * (i / 10 + 0.013 * Math.sin(i)); return { x, y: core.evaluateSinusoidal(truth, x) };
		});
		const fit = core.solveSinusoidal(data, core.estimateSinusoidal(data));
		near(fit.params.k * scale, 3); near(fit.params.b * scale, -0.5);
		predictions(data, x => core.evaluateSinusoidal(fit.params, x));
	}
	assert.equal(core.solveSinusoidal(points(4, 0, 1, Math.sin), {}), null);
});

test('an exact complete user sinusoidal start remains a candidate, including phase', () => {
	const initial = { A: -2, b: -0.2, k: 3, phi: 7, c: 1 };
	const data = points(51, 0, 5, x => core.evaluateSinusoidal(initial, x));
	const fit = core.solveSinusoidal(data, initial);
	assert.equal(fit.params.phi, initial.phi);
	predictions(data, x => core.evaluateSinusoidal(fit.params, x));
});

test('exponential fitting uses a fixed reference and is independent of x translation and units', () => {
	for (const origin of [0, 2000]) for (const scale of [1, 1e-6]) for (const sign of [1, -1]) {
		const data = points(41, origin, origin + 10 * scale, x => sign * 3 * Math.exp(-0.5 * (x - origin) / scale) + 2);
		const fit = core.solveExponential(data), p = fit.params;
		near(p.b * scale, -0.5);
		predictions(data, x => p.A * Math.exp(p.b * (x - p.xRef)) + p.c);
	}
});

test('power search recovers exponents outside the old grid without crossing its domain', () => {
	for (const exponent of [-7, -2, 0.5, 1.5, 7]) {
		const data = points(41, 0, 10, x => 2 * (x + 1) ** exponent + 1);
		const fit = core.solveShiftedPowerLaw(data);
		assert.ok(fit && fit.params.x0 < 0); near(fit.params.b, exponent, 1e-5);
		predictions(data, x => core.evaluateShiftedPower(fit.params, x));
	}
	const line = core.solveShiftedPowerLaw(points(10, 0, 5, x => 2 * x + 3));
	assert.equal(line.ambiguous, true); assert.equal(line.converged, false);
});

test('custom exponential starts use expression scale even with an arbitrary parameter name', () => {
	for (const scale of [1, 1e-3, 1e-6]) {
		const data = points(41, 0, 5 * scale, x => 3 * Math.exp(-x / scale) + 2); h.setData(data);
		const expression = h.context.math.parse('A*exp(-x/q)+c'), compiled = expression.compile(), names = ['A', 'q', 'c'];
		const stats = h.api.getCustomFitDataStats();
		const automatic = names.map(name => h.api.getCustomFitGuessByName(name, stats, expression));
		const starts = h.api.buildCustomFitInitialCandidates([1, 1, 1], automatic);
		const fit = core.solveCustomMultiStart(data, starts, core.buildCustomResidualFn(compiled, names), core.buildCustomJacobianFn(compiled, names), { scales: automatic.map(Math.abs) });
		assert.ok(fit.converged); near(fit.params[1] / scale, 1);
		predictions(data, x => core.evaluateCustomExpression(compiled, names, fit.params, x));
	}
});

test('linear custom expressions solve directly; nonlinear expressions retain nonlinear fitting', () => {
	const data = points(20, 0, 10, x => 3 * x * x - 2);
	const expression = h.context.math.parse('A*x^2+c');
	const fit = h.api.solveLinearCustomFit(data, { parsedExpression: expression, compiledExpression: expression.compile(), parameterNames: ['A', 'c'] }, []);
	near(fit.params[0], 3); near(fit.params[1], -2); assert.equal(fit.iterations, 0);
	const discontinuous = h.context.math.parse('A+floor(A)');
	assert.equal(h.api.solveLinearCustomFit(data, { parsedExpression: discontinuous, compiledExpression: discontinuous.compile(), parameterNames: ['A'] }, []), null);
	const nonlinear = h.context.math.parse('A*exp(c*x)');
	assert.equal(h.api.solveLinearCustomFit(data, { parsedExpression: nonlinear, compiledExpression: nonlinear.compile(), parameterNames: ['A', 'c'] }, []), null);
});

test('custom bounds hold and invalid-domain starts cannot report convergence', () => {
	const data = points(10, 0, 1, () => 3);
	const residual = p => data.map(point => p[0] - point.y);
	const fit = core.solveCustomMultiStart(data, [[0.5]], residual, () => data.map(() => [1]), { bounds: [{ min: 0, max: 2 }] });
	assert.ok(fit.params[0] <= 2 && fit.params[0] > 1.999);
	const expression = h.context.math.compile('sqrt(x-q)');
	const invalid = core.solveCustomMultiStart(data, [[10]], core.buildCustomResidualFn(expression, ['q']), core.buildCustomJacobianFn(expression, ['q']));
	assert.equal(invalid.params, null); assert.equal(invalid.converged, false);
	const lineData = points(21, 0, 1, x => 3*x+1);
	const boundedLine = core.solveCustomMultiStart(lineData, [[1, 0]], (p, pts) => pts.map(point => p[0]*point.x+p[1]-point.y), null, { bounds: [{ min: 0, max: 2 }, {}] });
	near(boundedLine.params[0], 2); near(boundedLine.params[1], 1.5); assert.ok(boundedLine.converged);
});

test('weighted refinement respects custom bounds and Gaussian positive widths', () => {
	h.context.getWeightingRequested = () => true;
	const data = points(10, 0, 1, () => 3).map(p => ({ ...p, yError: 0.1 }));
	const fit = h.api.finalizeParametricFit(data, { names: ['A'], params: [1], model: p => p[0], refine: false, bounds: [{ min: 0, max: 2 }] });
	assert.ok(fit.weighted); assert.ok(fit.params[0] <= 2 && fit.params[0] > 1.999);
	h.context.getWeightingRequested = () => false;
});

test('the two app-owned numerical cores remain identical', () => {
	assert.equal(fs.readFileSync(path.join(js, 'fit-core.js'), 'utf8'), fs.readFileSync(path.join(root, 'misc/panphyplotog/js/fit-core.js'), 'utf8'));
});

test('worker custom fitting carries parameter scales and bounds across the message boundary', async () => {
	let response;
	const worker = { console, addEventListener() {}, postMessage: message => { response = message; } };
	worker.self = worker;
	vm.createContext(worker);
	worker.importScripts = url => vm.runInContext(fs.readFileSync(path.join(root, url), 'utf8'), worker);
	vm.runInContext(fs.readFileSync(path.join(js, 'fit-worker.js'), 'utf8'), worker);
	await worker.handleFitRequest({ data: { id: 1, task: 'custom', payload: {
		data: points(21, 0, 0.005, x => 3*Math.exp(-x/0.001)+2), formula: 'A*exp(-x/q)+c', parameterNames: ['A', 'q', 'c'],
		starts: [[2, 0.00125, 2]], scales: [3, 0.001, 2], bounds: [{}, { min: 0.00001, max: 0.01 }, {}]
	} } });
	assert.equal(response.ok, true); near(response.result.params[1] / 0.001, 1);
});

test('audio-sized frequency initialization avoids a full frequency-by-point grid and retains rounded timestamps', () => {
	let sineCalls = 0;
	const measuredMath = Object.create(Math);
	measuredMath.sin = x => { sineCalls++; return Math.sin(x); };
	const context = { Math: measuredMath };
	vm.createContext(context);
	vm.runInContext(fs.readFileSync(path.join(js, 'fit-core.js'), 'utf8'), context);
	const audioCore = context.PanPhyFitCore;
	for (const rate of [44100, 48000]) {
		const data = Array.from({length:2028}, (_, i) => ({
			x: Number((1000*i/rate).toFixed(2)),
			y: 0.4*Math.sin(2*Math.PI*440*i/rate-0.2)+0.02
		}));
		sineCalls = 0;
		const guess = audioCore.estimateSinusoidal(data);
		assert.ok(sineCalls < data.length * 1000, `exhaustive search: ${sineCalls} sine evaluations`);
		const fit = audioCore.solveSinusoidal(data, guess);
		near(fit.params.k, 2*Math.PI*440/1000, 1e-4);
		near(fit.params.A, 0.4, 1e-3);
		assert.ok(data.reduce((s,p)=>s+(audioCore.evaluateSinusoidal(fit.params,p.x)-p.y)**2,0)/data.length < 0.00001);
	}
	// The FFT only supplies starts; the actual irregular coordinates still decide the fit.
	const truth = {A:2,b:-0.2,k:93,phi:0.4,c:1};
	const irregular = Array.from({length:256},(_,i)=>{const x=i/100+0.003*Math.sin(i);return {x,y:audioCore.evaluateSinusoidal(truth,x)};}).reverse();
	const fit = audioCore.solveSinusoidal(irregular, audioCore.estimateSinusoidal(irregular));
	near(fit.params.k,truth.k); near(fit.params.b,truth.b);
	predictions(irregular,x=>audioCore.evaluateSinusoidal(fit.params,x));
});

test('large automatic guesses use the worker, reuse unchanged results and ignore stale replies', async () => {
	const local = harness(), c = local.context;
	const requests = [];
	c.setTimeout = setTimeout; c.clearTimeout = clearTimeout;
	c.document.querySelectorAll = () => [];
	c.Worker = class {
		addEventListener(name, fn) { if(name==='message') this.receive=fn; }
		postMessage(message) { requests.push({message,reply:guess=>this.receive({data:{id:message.id,ok:true,result:guess}})}); }
	};
	local.elements['advanced-fit-method'] = {value:'Sinusoidal'};
	const data=points(128,0,5,x=>Math.sin(3*x)); local.setData(data);
	const guess={A:2,b:0,k:3,phi:0,c:1};
	let pending=c.setInitialParameters('Sinusoidal');
	assert.equal(requests[0].message.task,'estimate');
	assert.equal(requests[0].message.payload.data.length,128);
	requests[0].reply(guess); await pending;
	near(+local.elements['initial-k'].value,3);
	c.setInitialParameters('Sinusoidal'); assert.equal(requests.length,1);
	for (const mutation of ['manual','data','series']) {
		c.activeFitKey=mutation; local.setData(data.map(p=>({...p})));
		pending=c.setInitialParameters('Sinusoidal');
		const previous=local.elements['initial-k'].value;
		if(mutation==='manual') local.elements['initial-k'].value='99';
		if(mutation==='data') local.setData(data.map(p=>({...p,y:p.y+1})));
		if(mutation==='series') c.activeFitKey='different';
		requests.at(-1).reply({...guess,k:77}); await pending;
		assert.equal(local.elements['initial-k'].value,mutation==='manual'?'99':previous);
	}
	local.elements.AdvancedFit={classList:{contains:()=>false}};
	const count=requests.length;
	c.setInitialParameters('Sinusoidal',{onlyIfVisible:true}); assert.equal(requests.length,count);
});

test('clearing advanced parameters resets both methods and discards pending and cached guesses', async () => {
	const local = harness(), c = local.context;
	const requests = [];
	c.setTimeout = setTimeout; c.clearTimeout = clearTimeout;
	c.document.querySelectorAll = () => [];
	c.Worker = class {
		addEventListener(name, fn) { if (name === 'message') this.receive = fn; }
		postMessage(message) { requests.push(guess => this.receive({ data: { id: message.id, ok: true, result: guess } })); }
	};
	local.elements['advanced-fit-method'] = { value: 'Sinusoidal' };
	const defaults = { A: '1', b: '0', k: '1', phi: '0', c: '0', 'A-gaussian': '1', mu: '0', sigma: '1', 'c-gaussian': '0' };
	Object.keys(defaults).forEach(key => { local.elements[`initial-${key}`] = { value: '42' }; });
	local.setData(points(128, 0, 5, x => Math.sin(3 * x)));
	const pending = c.setInitialParameters('Sinusoidal');
	c.clearAdvancedFitParameters();
	requests[0]({ A: 9, b: 0, k: 3, phi: 0, c: 1 });
	await pending;
	Object.entries(defaults).forEach(([key, value]) => assert.equal(local.elements[`initial-${key}`].value, value));
	let next = c.setInitialParameters('Sinusoidal');
	assert.equal(requests.length, 2);
	requests[1]({ A: 9, b: 0, k: 3, phi: 0, c: 1 });
	await next;
	c.clearAdvancedFitParameters();
	next = c.setInitialParameters('Sinusoidal');
	assert.equal(requests.length, 3, 'the old guess is no longer cached');
	requests[2]({ A: 2, b: 0, k: 4, phi: 0, c: 0 });
	await next;
	assert.equal(+local.elements['initial-k'].value, 4);
});

test('FFT starts preserve low cycles, damping, units and frequencies near Nyquist', () => {
	for (const [omega, damping] of [[0.5,-2],[780,0],[50,8],[60,-8]]) {
		const truth={A:-2,b:damping,k:omega,phi:0.4,c:3};
		const data=points(256,0,1,x=>core.evaluateSinusoidal(truth,x));
		const fit=core.solveSinusoidal(data,core.estimateSinusoidal(data));
		predictions(data,x=>core.evaluateSinusoidal(fit.params,x),1e-6);
		near(fit.params.k,omega,1e-5);
	}
});
