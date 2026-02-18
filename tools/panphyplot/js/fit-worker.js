// Fit worker for heavy curve-fitting tasks.

const WORKER_PENALTY = 1e6;
const DEFAULT_SAMPLE_POINTS = 300;
const MATH_JS_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.5.0/math.min.js';
let mathLibraryReadyPromise = null;

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

function buildFitDomainFromData(data, sampleCount = DEFAULT_SAMPLE_POINTS) {
	const xValues = data.map((point) => point.x);
	const xMin = Math.min(...xValues);
	const xMax = Math.max(...xValues);
	const span = xMax - xMin;
	if (!Number.isFinite(span) || Math.abs(span) < 1e-12) {
		return Array.from({ length: sampleCount }, () => xMin);
	}
	return Array.from({ length: sampleCount }, (_, index) => xMin + index * span / (sampleCount - 1));
}

function evaluateSinusoidal(params, xValue) {
	return params.A * Math.exp(params.b * xValue) * Math.sin(params.k * xValue - params.phi) + params.c;
}

function buildSinusoidalEquation(params) {
	let equation = `y = ${params.A.toFixed(3)} e^{${params.b.toFixed(3)}x} \\sin(${params.k.toFixed(3)}x`;
	if (params.phi > 0) equation += ` - ${params.phi.toFixed(3)}`;
	else if (params.phi < 0) equation += ` + ${Math.abs(params.phi).toFixed(3)}`;
	equation += `)`;
	if (params.c > 0) equation += ` + ${params.c.toFixed(3)}`;
	else if (params.c < 0) equation += ` - ${Math.abs(params.c).toFixed(3)}`;
	return equation;
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

	function residualFn(params, points) {
		const [A, b, k, phi, c] = params;
		return points.map(({ x, y }) => {
			try {
				const yPred = A * Math.exp(b * x) * Math.sin(k * x - phi) + c;
				if (!Number.isFinite(yPred)) return WORKER_PENALTY;
				return yPred - y;
			} catch {
				return WORKER_PENALTY;
			}
		});
	}

	function jacobianFn(params, points) {
		const [A, b, k, phi] = params;
		return points.map(({ x }) => {
			try {
				const expTerm = Math.exp(b * x);
				const angle = k * x - phi;
				const sinTerm = Math.sin(angle);
				const cosTerm = Math.cos(angle);

				const dA = finiteOrZero(expTerm * sinTerm);
				const dB = finiteOrZero(A * x * expTerm * sinTerm);
				const dK = finiteOrZero(A * expTerm * x * cosTerm);
				const dPhi = finiteOrZero(-A * expTerm * cosTerm);
				return [dA, dB, dK, dPhi, 1];
			} catch {
				return [0, 0, 0, 0, 0];
			}
		});
	}

	const kCandidates = [k0];
	kCandidates.push(k0 * 0.667, k0 * 1.5, k0 * 2.0);
	const uniqueKCandidates = [...new Set(kCandidates.filter((value) => Number.isFinite(value) && value > 0))];

	let best = null;
	let bestCost = Infinity;
	for (let index = 0; index < uniqueKCandidates.length; index++) {
		const kCandidate = uniqueKCandidates[index];
		let sumSin = 0;
		let sumCos = 0;
		for (let pointIndex = 0; pointIndex < data.length; pointIndex++) {
			const val = data[pointIndex].y - c0;
			sumSin += val * Math.sin(kCandidate * data[pointIndex].x);
			sumCos += val * Math.cos(kCandidate * data[pointIndex].x);
		}
		const phiCandidate = finiteOrFallback(Math.atan2(-sumCos, sumSin), phi0);
		const start = [A0, b0, kCandidate, phiCandidate, c0];
		const result = levenbergMarquardt(data, start, residualFn, jacobianFn, {
			maxIterations: 300,
			tolerance: 1e-10
		});
		if (Number.isFinite(result.cost) && result.cost < bestCost) {
			best = result;
			bestCost = result.cost;
		}
	}

	if (!best || !Array.isArray(best.params) || best.params.length !== 5) {
		throw new Error('Sinusoidal fit did not converge.');
	}

	const params = {
		A: Number(best.params[0]),
		b: Number(best.params[1]),
		k: Number(best.params[2]),
		phi: Number(best.params[3]),
		c: Number(best.params[4])
	};
	if (!Number.isFinite(params.A) || !Number.isFinite(params.b) || !Number.isFinite(params.k)
		|| !Number.isFinite(params.phi) || !Number.isFinite(params.c)) {
		throw new Error('Sinusoidal fit returned invalid parameters.');
	}

	const xFit = buildFitDomainFromData(data, DEFAULT_SAMPLE_POINTS);
	const yFit = xFit.map((xValue) => evaluateSinusoidal(params, xValue));
	return {
		params,
		xFit,
		yFit,
		equation: buildSinusoidalEquation(params)
	};
}

function evaluateGaussian(params, xValue) {
	return params.A * Math.exp(-((xValue - params.mu) ** 2) / (2 * params.sigma * params.sigma)) + params.c;
}

function buildGaussianEquation(params) {
	let equation = `y = ${params.A.toFixed(3)} e^{-\\frac{(x - ${params.mu.toFixed(3)})^2}{2(${params.sigma.toFixed(3)})^2}}`;
	if (params.c > 0) equation += ` + ${params.c.toFixed(3)}`;
	else if (params.c < 0) equation += ` - ${Math.abs(params.c).toFixed(3)}`;
	return equation;
}

function solveGaussianFit(payload) {
	const data = sanitizeDataPoints(payload.data);
	if (data.length < 4) {
		throw new Error('Gaussian fit needs at least four valid points.');
	}

	const initial = payload.initial || {};
	const A0 = Number(initial.A);
	const mu0 = Number(initial.mu);
	let sigma0 = Number(initial.sigma);
	const c0 = Number(initial.c);
	if (!Number.isFinite(A0) || !Number.isFinite(mu0) || !Number.isFinite(sigma0) || !Number.isFinite(c0)) {
		throw new Error('Invalid initial Gaussian parameters.');
	}
	if (sigma0 === 0) sigma0 = 1e-6;
	if (sigma0 < 0) sigma0 = Math.abs(sigma0);

	function residualFn(params, points) {
		const [A, mu, sigma, c] = params;
		if (!Number.isFinite(sigma) || sigma <= 0) {
			return new Array(points.length).fill(WORKER_PENALTY);
		}
		const sigmaSq = sigma * sigma;
		return points.map(({ x, y }) => {
			try {
				const d = x - mu;
				const yPred = A * Math.exp(-(d * d) / (2 * sigmaSq)) + c;
				if (!Number.isFinite(yPred)) return WORKER_PENALTY;
				return yPred - y;
			} catch {
				return WORKER_PENALTY;
			}
		});
	}

	function jacobianFn(params, points) {
		const [A, mu, sigma] = params;
		if (!Number.isFinite(sigma) || sigma <= 0) {
			return points.map(() => [0, 0, 0, 0]);
		}
		const sigmaSq = sigma * sigma;
		const sigmaCubed = sigmaSq * sigma;
		return points.map(({ x }) => {
			try {
				const d = x - mu;
				const e = Math.exp(-(d * d) / (2 * sigmaSq));
				const dA = finiteOrZero(e);
				const dMu = finiteOrZero(A * e * (d / sigmaSq));
				const dSigma = finiteOrZero(A * e * ((d * d) / sigmaCubed));
				return [dA, dMu, dSigma, 1];
			} catch {
				return [0, 0, 0, 0];
			}
		});
	}

	const result = levenbergMarquardt(data, [A0, mu0, sigma0, c0], residualFn, jacobianFn, {
		maxIterations: 300,
		tolerance: 1e-10
	});
	if (!result || !Array.isArray(result.params) || result.params.length !== 4) {
		throw new Error('Gaussian fit did not converge.');
	}

	const params = {
		A: Number(result.params[0]),
		mu: Number(result.params[1]),
		sigma: Math.max(1e-6, Math.abs(Number(result.params[2]))),
		c: Number(result.params[3])
	};
	if (!Number.isFinite(params.A) || !Number.isFinite(params.mu) || !Number.isFinite(params.sigma) || !Number.isFinite(params.c)) {
		throw new Error('Gaussian fit returned invalid parameters.');
	}

	const xFit = buildFitDomainFromData(data, DEFAULT_SAMPLE_POINTS);
	const yFit = xFit.map((xValue) => evaluateGaussian(params, xValue));
	return {
		params,
		xFit,
		yFit,
		equation: buildGaussianEquation(params)
	};
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

function evaluateCustomExpression(compiledExpression, parameterNames, parameterValues, xValue) {
	const scope = { x: xValue };
	for (let index = 0; index < parameterNames.length; index++) {
		scope[parameterNames[index]] = parameterValues[index];
	}
	try {
		const raw = compiledExpression.evaluate(scope);
		const numeric = Number(raw);
		return Number.isFinite(numeric) ? numeric : NaN;
	} catch {
		return NaN;
	}
}

async function ensureMathLibrary() {
	if (typeof self.math === 'object' && self.math !== null && typeof self.math.parse === 'function') {
		return;
	}
	if (!mathLibraryReadyPromise) {
		mathLibraryReadyPromise = new Promise((resolve, reject) => {
			try {
				self.importScripts(MATH_JS_CDN_URL);
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

	const residualFn = (params, points) => {
		return points.map(({ x, y }) => {
			const yPred = evaluateCustomExpression(compiledExpression, parameterNames, params, x);
			if (!Number.isFinite(yPred)) return WORKER_PENALTY;
			return yPred - y;
		});
	};

	const jacobianFn = (params, points) => {
		const cols = parameterNames.length;
		return points.map(({ x }) => {
			const row = new Array(cols).fill(0);
			for (let col = 0; col < cols; col++) {
				const base = params[col];
				const delta = Math.max(1e-6, Math.abs(base) * 1e-6);
				const plus = params.slice();
				const minus = params.slice();
				plus[col] = base + delta;
				minus[col] = base - delta;

				const fPlus = evaluateCustomExpression(compiledExpression, parameterNames, plus, x);
				const fMinus = evaluateCustomExpression(compiledExpression, parameterNames, minus, x);
				if (Number.isFinite(fPlus) && Number.isFinite(fMinus)) {
					row[col] = (fPlus - fMinus) / (2 * delta);
				}
			}
			return row;
		});
	};

	let bestParams = null;
	let bestCost = Infinity;
	for (let index = 0; index < starts.length; index++) {
		const start = starts[index];
		const result = levenbergMarquardt(data, start, residualFn, jacobianFn, { maxIterations, tolerance });
		if (!Number.isFinite(result.cost)) continue;
		if (result.cost < bestCost) {
			bestCost = result.cost;
			bestParams = result.params;
		}
	}

	if (!bestParams || !Array.isArray(bestParams)) {
		throw new Error('Custom fit did not converge.');
	}

	return {
		params: bestParams.map((value) => Number(value)),
		cost: Number(bestCost)
	};
}

function finiteOrZero(value) {
	return Number.isFinite(value) ? value : 0;
}

function finiteOrFallback(value, fallback) {
	return Number.isFinite(value) ? value : fallback;
}

function transpose(matrix) {
	return matrix[0].map((_, colIndex) => matrix.map((row) => row[colIndex]));
}

function multiply(a, b) {
	const rows = a.length;
	const cols = b[0].length;
	const result = new Array(rows).fill(null).map(() => new Array(cols).fill(0));
	for (let i = 0; i < rows; i++) {
		for (let j = 0; j < cols; j++) {
			let sum = 0;
			for (let k = 0; k < b.length; k++) {
				sum += a[i][k] * b[k][j];
			}
			result[i][j] = sum;
		}
	}
	return result;
}

function multiplyMatrixVector(matrix, vector) {
	return matrix.map((row) => {
		let sum = 0;
		for (let index = 0; index < row.length; index++) {
			sum += row[index] * vector[index];
		}
		return sum;
	});
}

function solve(matrix, vector) {
	const n = matrix.length;
	const augmented = matrix.map((row, rowIndex) => row.concat([vector[rowIndex]]));

	for (let i = 0; i < n; i++) {
		let maxRow = i;
		for (let row = i + 1; row < n; row++) {
			if (Math.abs(augmented[row][i]) > Math.abs(augmented[maxRow][i])) {
				maxRow = row;
			}
		}
		if (maxRow !== i) {
			[augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
		}

		const pivot = augmented[i][i];
		if (Math.abs(pivot) < 1e-14) {
			throw new Error('Singular matrix');
		}

		for (let col = i; col <= n; col++) {
			augmented[i][col] /= pivot;
		}
		for (let row = 0; row < n; row++) {
			if (row === i) continue;
			const factor = augmented[row][i];
			for (let col = i; col <= n; col++) {
				augmented[row][col] -= factor * augmented[i][col];
			}
		}
	}

	return augmented.map((row) => row[n]);
}

function levenbergMarquardt(data, initialParams, residualFn, jacobianFn, options = {}) {
	const maxIterations = Number.isFinite(options.maxIterations) ? options.maxIterations : 200;
	const tolerance = Number.isFinite(options.tolerance) ? options.tolerance : 1e-8;

	let params = initialParams.slice();
	let lambda = Number.isFinite(options.initialLambda) ? options.initialLambda : 1e-3;
	let nu = 2;
	let prevCost = Infinity;

	let bestParams = params.slice();
	let bestCost = Infinity;

	function safeResiduals(p) {
		let residuals = null;
		try {
			residuals = residualFn(p, data);
		} catch {
			residuals = null;
		}
		if (!Array.isArray(residuals) || residuals.length !== data.length) {
			residuals = new Array(data.length).fill(WORKER_PENALTY);
		}
		for (let index = 0; index < residuals.length; index++) {
			if (!Number.isFinite(residuals[index])) residuals[index] = WORKER_PENALTY;
		}
		return residuals;
	}

	function safeJacobian(p, nParams) {
		let jacobian = null;
		try {
			jacobian = jacobianFn(p, data);
		} catch {
			jacobian = null;
		}
		if (!Array.isArray(jacobian) || jacobian.length !== data.length) {
			jacobian = new Array(data.length).fill(null).map(() => new Array(nParams).fill(0));
		}

		for (let rowIndex = 0; rowIndex < jacobian.length; rowIndex++) {
			const row = Array.isArray(jacobian[rowIndex]) ? jacobian[rowIndex] : [];
			if (row.length !== nParams) {
				jacobian[rowIndex] = new Array(nParams).fill(0);
				continue;
			}
			for (let colIndex = 0; colIndex < nParams; colIndex++) {
				if (!Number.isFinite(jacobian[rowIndex][colIndex])) {
					jacobian[rowIndex][colIndex] = 0;
				}
			}
		}
		return jacobian;
	}

	function costFromResiduals(residuals) {
		let sum = 0;
		for (let index = 0; index < residuals.length; index++) {
			const value = residuals[index];
			sum += value * value;
			if (!Number.isFinite(sum)) return Number.MAX_VALUE;
		}
		return sum;
	}

	for (let iteration = 0; iteration < maxIterations; iteration++) {
		const residuals = safeResiduals(params);
		const cost = costFromResiduals(residuals);
		if (Math.abs(prevCost - cost) < tolerance) {
			return { params, cost };
		}
		prevCost = cost;

		const jacobian = safeJacobian(params, params.length);
		const jTranspose = transpose(jacobian);
		const jtj = multiply(jTranspose, jacobian);
		const jtr = multiplyMatrixVector(jTranspose, residuals);

		const n = jtj.length;
		const damped = new Array(n).fill(null).map(() => new Array(n).fill(0));
		for (let i = 0; i < n; i++) {
			for (let j = 0; j < n; j++) {
				damped[i][j] = jtj[i][j];
				if (i === j) {
					const diag = Math.abs(damped[i][j]) > 0 ? Math.abs(damped[i][j]) : 1;
					damped[i][j] += lambda * diag;
				}
			}
		}

		let delta = null;
		try {
			const negJtr = jtr.map((value) => -value);
			delta = solve(damped, negJtr);
		} catch {
			lambda *= nu;
			continue;
		}
		if (!Array.isArray(delta) || delta.length !== params.length || delta.some((value) => !Number.isFinite(value))) {
			lambda *= nu;
			continue;
		}

		const nextParams = params.map((value, index) => value + delta[index]);
		const nextResiduals = safeResiduals(nextParams);
		const nextCost = costFromResiduals(nextResiduals);
		if (nextCost < cost) {
			params = nextParams;
			if (nextCost < bestCost) {
				bestCost = nextCost;
				bestParams = params.slice();
			}
			lambda *= 0.3;
			if (lambda < 1e-20) lambda = 1e-20;
		} else {
			lambda *= nu;
			if (lambda > 1e20) {
				return { params: bestParams, cost: bestCost };
			}
		}
	}

	return { params: bestParams, cost: bestCost };
}
