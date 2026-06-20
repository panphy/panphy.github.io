// Fit worker for heavy curve-fitting tasks.

const WORKER_PENALTY = 1e6;
const DEFAULT_SAMPLE_POINTS = 300;
const MATH_JS_URL = '/tools/panphyplot/js/vendor/math.min.js';
let mathLibraryReadyPromise = null;

try {
	self.importScripts('/tools/panphyplot/js/fit-core.js');
} catch (error) {
	console.error('Failed to load shared fit core in worker:', error);
}

const fitCore = (typeof self === 'object' && self.PanPhyFitCore) ? self.PanPhyFitCore : {};

function missingFitCoreFunction(name) {
	return () => {
		throw new Error(`PanPhyFitCore.${name} is unavailable.`);
	};
}

function fromFitCore(name) {
	return typeof fitCore[name] === 'function' ? fitCore[name] : missingFitCoreFunction(name);
}

const solveSinusoidal = fromFitCore('solveSinusoidal');
const solveGaussian = fromFitCore('solveGaussian');
const buildCustomResidualFn = fromFitCore('buildCustomResidualFn');
const buildCustomJacobianFn = fromFitCore('buildCustomJacobianFn');
const solveCustomMultiStart = fromFitCore('solveCustomMultiStart');

self.addEventListener('message', (event) => {
	void handleFitRequest(event);
});

async function handleFitRequest(event) {
	const request = event && event.data ? event.data : {};
	const requestId = Number(request.id);
	const task = typeof request.task === 'string' ? request.task : '';
	const payload = request.payload || {};

	if (!Number.isInteger(requestId) || !task) return;

	try {
		let result = null;
		if (task === 'sinusoidal') {
			result = solveSinusoidalFit(payload);
		} else if (task === 'gaussian') {
			result = solveGaussianFit(payload);
		} else if (task === 'custom') {
			result = await solveCustomFit(payload);
		} else {
			throw new Error(`Unknown fit task "${task}".`);
		}

		self.postMessage({ id: requestId, ok: true, result });
	} catch (error) {
		const message = error && error.message ? error.message : 'Worker fit failed.';
		self.postMessage({ id: requestId, ok: false, error: message });
	}
}

function sanitizeDataPoints(rawData) {
	if (!Array.isArray(rawData)) return [];
	const points = [];
	for (let index = 0; index < rawData.length; index++) {
		const point = rawData[index];
		if (!point || typeof point !== 'object') continue;
		const x = Number(point.x);
		const y = Number(point.y);
		if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
		points.push({ x, y });
	}
	return points;
}

function solveSinusoidalFit(payload) {
	const data = sanitizeDataPoints(payload.data);
	if (data.length < 4) {
		throw new Error('Sinusoidal fit needs at least four valid points.');
	}

	const initial = payload.initial || {};
	const A0 = Number(initial.A);
	const b0 = Number(initial.b);
	const k0 = Number(initial.k);
	const phi0 = Number(initial.phi);
	const c0 = Number(initial.c);
	if (!Number.isFinite(A0) || !Number.isFinite(b0) || !Number.isFinite(k0) || k0 <= 0
		|| !Number.isFinite(phi0) || !Number.isFinite(c0)) {
		throw new Error('Invalid initial sinusoidal parameters.');
	}

	const result = solveSinusoidal(data, initial, {
		maxIterations: 300,
		tolerance: 1e-10,
		penalty: WORKER_PENALTY,
		sampleCount: DEFAULT_SAMPLE_POINTS
	});
	if (!result) {
		throw new Error('Sinusoidal fit did not converge.');
	}
	const p = result.params;
	if (!Number.isFinite(p.A) || !Number.isFinite(p.b) || !Number.isFinite(p.k)
		|| !Number.isFinite(p.phi) || !Number.isFinite(p.c)) {
		throw new Error('Sinusoidal fit returned invalid parameters.');
	}
	return result;
}

function solveGaussianFit(payload) {
	const data = sanitizeDataPoints(payload.data);
	if (data.length < 4) {
		throw new Error('Gaussian fit needs at least four valid points.');
	}

	const initial = payload.initial || {};
	const A0 = Number(initial.A);
	const mu0 = Number(initial.mu);
	const sigma0 = Number(initial.sigma);
	const c0 = Number(initial.c);
	if (!Number.isFinite(A0) || !Number.isFinite(mu0) || !Number.isFinite(sigma0) || !Number.isFinite(c0)) {
		throw new Error('Invalid initial Gaussian parameters.');
	}

	const result = solveGaussian(data, initial, {
		maxIterations: 300,
		tolerance: 1e-10,
		penalty: WORKER_PENALTY,
		sampleCount: DEFAULT_SAMPLE_POINTS
	});
	if (!result) {
		throw new Error('Gaussian fit did not converge.');
	}
	const p = result.params;
	if (!Number.isFinite(p.A) || !Number.isFinite(p.mu) || !Number.isFinite(p.sigma) || !Number.isFinite(p.c)) {
		throw new Error('Gaussian fit returned invalid parameters.');
	}
	return result;
}

function normalizeStartCandidates(starts, expectedLength) {
	if (!Array.isArray(starts) || !Number.isInteger(expectedLength) || expectedLength <= 0) return [];
	const normalized = [];
	const seen = new Set();
	for (let index = 0; index < starts.length; index++) {
		const candidate = starts[index];
		if (!Array.isArray(candidate) || candidate.length !== expectedLength) continue;
		const numeric = candidate.map((value) => Number(value));
		if (numeric.some((value) => !Number.isFinite(value))) continue;
		const key = numeric.map((value) => value.toPrecision(12)).join('|');
		if (seen.has(key)) continue;
		seen.add(key);
		normalized.push(numeric);
	}
	return normalized;
}

async function ensureMathLibrary() {
	if (typeof self.math === 'object' && self.math !== null && typeof self.math.parse === 'function') {
		return;
	}
	if (!mathLibraryReadyPromise) {
		mathLibraryReadyPromise = new Promise((resolve, reject) => {
			try {
				self.importScripts(MATH_JS_URL);
				if (typeof self.math === 'object' && self.math !== null && typeof self.math.parse === 'function') {
					resolve();
					return;
				}
				reject(new Error('Math.js failed to initialize in worker.'));
			} catch (error) {
				reject(error);
			}
		});
	}
	return mathLibraryReadyPromise;
}

async function solveCustomFit(payload) {
	await ensureMathLibrary();

	const data = sanitizeDataPoints(payload.data);
	if (data.length < 2) {
		throw new Error('Custom fit requires at least two points.');
	}

	const formula = String(payload.formula || '').trim();
	if (!formula) {
		throw new Error('Custom fit formula is empty.');
	}

	const parameterNames = Array.isArray(payload.parameterNames)
		? payload.parameterNames.map((name) => String(name || '').trim()).filter(Boolean)
		: [];
	if (!parameterNames.length) {
		throw new Error('Custom fit has no parameters.');
	}

	let compiledExpression = null;
	try {
		compiledExpression = self.math.parse(formula).compile();
	} catch {
		throw new Error('Custom fit formula failed to compile.');
	}

	const starts = normalizeStartCandidates(payload.starts, parameterNames.length);
	if (!starts.length) {
		throw new Error('Custom fit has no valid initial candidates.');
	}

	const maxIterations = Number.isFinite(Number(payload.maxIterations)) ? Number(payload.maxIterations) : 350;
	const tolerance = Number.isFinite(Number(payload.tolerance)) ? Number(payload.tolerance) : 1e-10;

	const residualFn = buildCustomResidualFn(compiledExpression, parameterNames, WORKER_PENALTY);
	const jacobianFn = buildCustomJacobianFn(compiledExpression, parameterNames);

	const { params: bestParams, cost: bestCost } = solveCustomMultiStart(
		data, starts, residualFn, jacobianFn, { maxIterations, tolerance }
	);

	if (!bestParams || !Array.isArray(bestParams)) {
		throw new Error('Custom fit did not converge.');
	}

	return {
		params: bestParams.map((value) => Number(value)),
		cost: Number(bestCost)
	};
}
