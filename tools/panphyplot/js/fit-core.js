// Shared numerical helpers for PanPhyPlot curve fitting.
(function(globalScope) {
	'use strict';

	const DEFAULT_PENALTY = 1e6;
	const MIN_PIVOT_ABS = 1e-14;

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
			if (Math.abs(pivot) < MIN_PIVOT_ABS) {
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
		const penalty = Number.isFinite(options.penalty) ? options.penalty : DEFAULT_PENALTY;

		let params = initialParams.slice();
		let lambda = Number.isFinite(options.initialLambda) ? options.initialLambda : 1e-3;
		const nu = 2;

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
				residuals = new Array(data.length).fill(penalty);
			}
			for (let index = 0; index < residuals.length; index++) {
				if (!Number.isFinite(residuals[index])) residuals[index] = penalty;
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
			if (cost < bestCost) {
				bestCost = cost;
				bestParams = params.slice();
			}

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
				if (Math.abs(cost - nextCost) < tolerance) {
					return { params: bestParams, cost: bestCost };
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

	function minMaxFinite(values) {
		let min = Infinity;
		let max = -Infinity;
		for (let i = 0; i < values.length; i++) {
			const v = values[i];
			if (!Number.isFinite(v)) continue;
			if (v < min) min = v;
			if (v > max) max = v;
		}
		return { min, max };
	}

	function buildFitDomainFromData(data, sampleCount = 300) {
		const xValues = data.map((point) => point.x);
		const { min: xMin, max: xMax } = minMaxFinite(xValues);
		const span = xMax - xMin;
		if (!Number.isFinite(span) || Math.abs(span) < 1e-12) {
			return Array.from({ length: sampleCount }, () => xMin);
		}
		return Array.from({ length: sampleCount }, (_, index) => xMin + index * span / (sampleCount - 1));
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

	function buildGaussianEquation(params) {
		let equation = `y = ${params.A.toFixed(3)} e^{-\\frac{(x - ${params.mu.toFixed(3)})^2}{2(${params.sigma.toFixed(3)})^2}}`;
		if (params.c > 0) equation += ` + ${params.c.toFixed(3)}`;
		else if (params.c < 0) equation += ` - ${Math.abs(params.c).toFixed(3)}`;
		return equation;
	}

	// ---- Shared fit models (used by both the main thread and the worker) ----

	function evaluateSinusoidal(params, xValue) {
		const A = Number(params.A);
		const b = Number(params.b);
		const k = Number(params.k);
		const phi = Number(params.phi);
		const c = Number(params.c);
		return A * Math.exp(b * xValue) * Math.sin(k * xValue - phi) + c;
	}

	// Solve y = A e^{bx} sin(kx - phi) + c with a small multi-start over k.
	// Returns { params, xFit, yFit, equation } or null if it cannot converge.
	function solveSinusoidal(data, initial, options = {}) {
		const A0 = Number(initial.A);
		const b0 = Number(initial.b);
		const k0 = Number(initial.k);
		const phi0 = Number(initial.phi);
		const c0 = Number(initial.c);
		const penalty = Number.isFinite(options.penalty) ? options.penalty : DEFAULT_PENALTY;
		const maxIterations = Number.isFinite(options.maxIterations) ? options.maxIterations : 300;
		const tolerance = Number.isFinite(options.tolerance) ? options.tolerance : 1e-10;
		const sampleCount = Number.isFinite(options.sampleCount) ? options.sampleCount : 300;

		function residualFn(params, pts) {
			const [A, b, k, phi, c] = params;
			return pts.map(({ x, y }) => {
				try {
					const yPred = A * Math.exp(b * x) * Math.sin(k * x - phi) + c;
					if (!Number.isFinite(yPred)) return penalty;
					return yPred - y;
				} catch {
					return penalty;
				}
			});
		}

		function jacobianFn(params, pts) {
			const [A, b, k, phi] = params;
			return pts.map(({ x }) => {
				try {
					const expTerm = Math.exp(b * x);
					const angle = k * x - phi;
					const sinTerm = Math.sin(angle);
					const cosTerm = Math.cos(angle);
					return [
						finiteOrZero(expTerm * sinTerm),
						finiteOrZero(A * x * expTerm * sinTerm),
						finiteOrZero(A * expTerm * x * cosTerm),
						finiteOrZero(-A * expTerm * cosTerm),
						1
					];
				} catch {
					return [0, 0, 0, 0, 0];
				}
			});
		}

		const kCandidates = [...new Set(
			[k0, k0 * 0.667, k0 * 1.5, k0 * 2.0].filter((value) => Number.isFinite(value) && value > 0)
		)];

		let best = null;
		let bestCost = Infinity;
		for (let index = 0; index < kCandidates.length; index++) {
			const kCandidate = kCandidates[index];
			let sumSin = 0;
			let sumCos = 0;
			for (let pointIndex = 0; pointIndex < data.length; pointIndex++) {
				const val = data[pointIndex].y - c0;
				sumSin += val * Math.sin(kCandidate * data[pointIndex].x);
				sumCos += val * Math.cos(kCandidate * data[pointIndex].x);
			}
			let phiCandidate = Math.atan2(-sumCos, sumSin);
			if (!Number.isFinite(phiCandidate)) phiCandidate = phi0;
			const start = [A0, b0, kCandidate, phiCandidate, c0];
			const result = levenbergMarquardt(data, start, residualFn, jacobianFn, { maxIterations, tolerance });
			if (Number.isFinite(result.cost) && result.cost < bestCost) {
				best = result;
				bestCost = result.cost;
			}
		}

		if (!best || !Array.isArray(best.params) || best.params.length !== 5) return null;
		const params = {
			A: Number(best.params[0]),
			b: Number(best.params[1]),
			k: Number(best.params[2]),
			phi: Number(best.params[3]),
			c: Number(best.params[4])
		};
		const xFit = buildFitDomainFromData(data, sampleCount);
		const yFit = xFit.map((xValue) => evaluateSinusoidal(params, xValue));
		return { params, xFit, yFit, equation: buildSinusoidalEquation(params) };
	}

	function evaluateGaussian(params, xValue) {
		const A = Number(params.A);
		const mu = Number(params.mu);
		const sigma = Number(params.sigma);
		const c = Number(params.c);
		return A * Math.exp(-((xValue - mu) ** 2) / (2 * sigma * sigma)) + c;
	}

	// Solve y = A e^{-(x-mu)^2 / (2 sigma^2)} + c.
	// Returns { params, xFit, yFit, equation } or null if it cannot converge.
	function solveGaussian(data, initial, options = {}) {
		const A0 = Number(initial.A);
		const mu0 = Number(initial.mu);
		let sigma0 = Number(initial.sigma);
		const c0 = Number(initial.c);
		if (sigma0 === 0) sigma0 = 1e-6;
		if (sigma0 < 0) sigma0 = Math.abs(sigma0);
		const penalty = Number.isFinite(options.penalty) ? options.penalty : DEFAULT_PENALTY;
		const maxIterations = Number.isFinite(options.maxIterations) ? options.maxIterations : 300;
		const tolerance = Number.isFinite(options.tolerance) ? options.tolerance : 1e-10;
		const sampleCount = Number.isFinite(options.sampleCount) ? options.sampleCount : 300;

		function residualFn(params, pts) {
			const [A, mu, sigma, c] = params;
			if (!Number.isFinite(sigma) || sigma <= 0) return new Array(pts.length).fill(penalty);
			const sigmaSq = sigma * sigma;
			return pts.map(({ x, y }) => {
				try {
					const d = x - mu;
					const yPred = A * Math.exp(-(d * d) / (2 * sigmaSq)) + c;
					if (!Number.isFinite(yPred)) return penalty;
					return yPred - y;
				} catch {
					return penalty;
				}
			});
		}

		function jacobianFn(params, pts) {
			const [A, mu, sigma] = params;
			if (!Number.isFinite(sigma) || sigma <= 0) return pts.map(() => [0, 0, 0, 0]);
			const sigmaSq = sigma * sigma;
			const sigmaCubed = sigmaSq * sigma;
			return pts.map(({ x }) => {
				try {
					const d = x - mu;
					const e = Math.exp(-(d * d) / (2 * sigmaSq));
					return [
						finiteOrZero(e),
						finiteOrZero(A * e * (d / sigmaSq)),
						finiteOrZero(A * e * ((d * d) / sigmaCubed)),
						1
					];
				} catch {
					return [0, 0, 0, 0];
				}
			});
		}

		const result = levenbergMarquardt(data, [A0, mu0, sigma0, c0], residualFn, jacobianFn, { maxIterations, tolerance });
		if (!result || !Array.isArray(result.params) || result.params.length !== 4) return null;
		let [A, mu, sigma, c] = result.params;
		// Finite fallback when the solver returns a degenerate sigma.
		if (!Number.isFinite(sigma) || sigma <= 0) sigma = Math.max(1e-6, Math.abs(sigma0));
		const params = { A: Number(A), mu: Number(mu), sigma: Number(sigma), c: Number(c) };
		const xFit = buildFitDomainFromData(data, sampleCount);
		const yFit = xFit.map((xValue) => evaluateGaussian(params, xValue));
		return { params, xFit, yFit, equation: buildGaussianEquation(params) };
	}

	// ---- Shared custom-formula fitting helpers ----

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

	function buildCustomResidualFn(compiledExpression, parameterNames, penalty = DEFAULT_PENALTY) {
		return (params, points) => points.map(({ x, y }) => {
			const yPred = evaluateCustomExpression(compiledExpression, parameterNames, params, x);
			if (!Number.isFinite(yPred)) return penalty;
			return yPred - y;
		});
	}

	function buildCustomJacobianFn(compiledExpression, parameterNames) {
		const cols = parameterNames.length;
		return (params, points) => points.map(({ x }) => {
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
	}

	// Run Levenberg-Marquardt from each start, keeping the lowest-cost result.
	function solveCustomMultiStart(data, starts, residualFn, jacobianFn, options = {}) {
		const maxIterations = Number.isFinite(options.maxIterations) ? options.maxIterations : 350;
		const tolerance = Number.isFinite(options.tolerance) ? options.tolerance : 1e-10;
		let bestParams = null;
		let bestCost = Infinity;
		for (let index = 0; index < starts.length; index++) {
			const result = levenbergMarquardt(data, starts[index], residualFn, jacobianFn, { maxIterations, tolerance });
			if (!Number.isFinite(result.cost)) continue;
			if (result.cost < bestCost) {
				bestCost = result.cost;
				bestParams = result.params;
			}
		}
		return { params: bestParams, cost: bestCost };
	}

	function finiteOrZero(value) {
		return Number.isFinite(value) ? value : 0;
	}

	globalScope.PanPhyFitCore = Object.freeze({
		transpose,
		multiply,
		multiplyMatrixVector,
		solve,
		levenbergMarquardt,
		buildFitDomainFromData,
		buildSinusoidalEquation,
		buildGaussianEquation,
		minMaxFinite,
		evaluateSinusoidal,
		solveSinusoidal,
		evaluateGaussian,
		solveGaussian,
		evaluateCustomExpression,
		buildCustomResidualFn,
		buildCustomJacobianFn,
		solveCustomMultiStart
	});
})(typeof globalThis !== 'undefined' ? globalThis : self);
