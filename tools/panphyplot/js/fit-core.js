// Shared numerical helpers for PanPhyPlot curve fitting.
(function(globalScope) {
	'use strict';

	const DEFAULT_PENALTY = 1e6;
	const MIN_PIVOT_ABS = 1e-14;

	function formatFitNumber(value, latex = true) {
		if (!Number.isFinite(value)) return 'N/A';
		if (value === 0) return '0';
		const scientific = Math.abs(value) < 1e-3 || Math.abs(value) >= 1e6;
		const rounded = Number(value.toPrecision(8));
		const text = scientific ? rounded.toExponential() : rounded.toString();
		if (!latex) return text;
		const [coefficient, exponent] = text.split('e');
		return exponent === undefined ? text : `${coefficient}\\times 10^{${Number(exponent)}}`;
	}

	function computeLinearFit(x, y) {
		const n = x.length;
		const xOrigin = x[0];
		const offsets = x.map(value => value - xOrigin);
		const { min, max } = minMaxFinite(offsets);
		const scale = Math.max(Math.abs(min), Math.abs(max));
		if (!(scale > 0) || !Number.isFinite(scale)) throw new Error('Linear fitting needs distinct x values with a finite range.');
		const u = offsets.map(value => value / scale);
		const uMean = u.reduce((sum, value) => sum + value / n, 0);
		const yMean = y.reduce((sum, value) => sum + value / n, 0);
		let numerator = 0;
		let denominator = 0;
		for (let i = 0; i < n; i++) {
			numerator += (u[i] - uMean) * (y[i] - yMean);
			denominator += (u[i] - uMean) ** 2;
		}
		const scaledSlope = numerator / denominator;
		const slope = scaledSlope / scale;
		const center = xOrigin + scale * uMean;
		const intercept = yMean - slope * center;
		return { slope, intercept, evaluate: value => yMean + scaledSlope * ((value - xOrigin) / scale - uMean) };
	}

	function computeRSq(x, y, evaluate) {
		if (!x.length || x.length !== y.length) return NaN;
		const predictions = x.map(evaluate);
		if (predictions.some(value => !Number.isFinite(value))) return NaN;
		const mean = y.reduce((sum, value) => sum + value / y.length, 0);
		let scale = 0;
		for (let i = 0; i < y.length; i++) scale = Math.max(scale, Math.abs(y[i] - mean), Math.abs(y[i] - predictions[i]));
		if (scale === 0) return 1;
		let total = 0;
		let residual = 0;
		for (let i = 0; i < y.length; i++) {
			total += ((y[i] - mean) / scale) ** 2;
			residual += ((y[i] - predictions[i]) / scale) ** 2;
		}
		return total === 0 ? (residual === 0 ? 1 : NaN) : 1 - residual / total;
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

		const isValid = options.isValidParams || (p => p.every(Number.isFinite));
		if (!isValid(initialParams)) return { params: initialParams.slice(), cost: Infinity, converged: false, reason: 'invalid-start', iterations: 0 };
		let params = initialParams.slice();
		let lambda = Number.isFinite(options.initialLambda) ? options.initialLambda : 1e-3;
		const nu = 2;

		let bestParams = params.slice();
		let bestCost = Infinity;
		let iterations = 0;
		let dataMagnitude = 0;
		for (const point of data) dataMagnitude = Math.max(dataMagnitude, Math.abs(point.y || 0));
		const roundoffCost = data.length * (16 * Number.EPSILON * dataMagnitude) ** 2;
		const finish = (converged, reason) => ({ params: bestParams, cost: bestCost, converged, reason, iterations });

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
			iterations = iteration + 1;
			const residuals = safeResiduals(params);
			const cost = costFromResiduals(residuals);
			if (cost < bestCost) {
				bestCost = cost;
				bestParams = params.slice();
			}

			if (cost <= roundoffCost) return finish(true, 'residual-at-roundoff');
			const jacobian = safeJacobian(params, params.length);
			const jTranspose = transpose(jacobian);
			const jtj = multiply(jTranspose, jacobian);
			const jtr = multiplyMatrixVector(jTranspose, residuals);

			const projectedGradient = options.projectGradient ? options.projectGradient(params, jtr) : jtr;
			const gradientSmall = projectedGradient.every((value, i) => Math.abs(value) <= tolerance * Math.sqrt(Math.abs(jtj[i][i])) * Math.sqrt(cost));
			if (gradientSmall) return finish(true, 'stationary');

			const n = jtj.length;
			const damped = new Array(n).fill(null).map(() => new Array(n).fill(0));
			for (let i = 0; i < n; i++) {
				for (let j = 0; j < n; j++) {
					if (projectedGradient[i] !== jtr[i] || projectedGradient[j] !== jtr[j]) {
						damped[i][j] = i === j ? 1 : 0;
						continue;
					}
					damped[i][j] = jtj[i][j];
					if (i === j) {
						const diag = Math.abs(damped[i][j]) > 0 ? Math.abs(damped[i][j]) : 1;
						damped[i][j] += lambda * diag;
					}
				}
			}

			let delta = null;
			try {
				const negJtr = projectedGradient.map((value) => -value);
				delta = solve(damped, negJtr);
			} catch {
				lambda *= nu;
				continue;
			}
			if (!Array.isArray(delta) || delta.length !== params.length || delta.some((value) => !Number.isFinite(value))) {
				lambda *= nu;
				continue;
			}

			const proposed = params.map((value, index) => value + delta[index]);
			const nextParams = options.projectParams ? options.projectParams(proposed) : proposed;
			if (!isValid(nextParams)) { lambda *= nu; if (lambda > 1e20) return finish(false, 'boundary'); continue; }
			const nextResiduals = safeResiduals(nextParams);
			const nextCost = costFromResiduals(nextResiduals);
			if (nextCost < cost) {
				params = nextParams;
				if (nextCost < bestCost) {
					bestCost = nextCost;
					bestParams = params.slice();
				}
				if (Math.abs(cost - nextCost) <= tolerance * Math.max(cost, Number.MIN_VALUE)) {
					return finish(true, 'relative-cost');
				}
				lambda *= 0.3;
				if (lambda < 1e-20) lambda = 1e-20;
			} else {
				lambda *= nu;
				if (lambda > 1e20) {
					return finish(false, 'stalled');
				}
			}
		}

		return finish(false, 'iteration-limit');
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
		if (!Number.isFinite(span) || span === 0) {
			return Array.from({ length: sampleCount }, () => xMin);
		}
		return Array.from({ length: sampleCount }, (_, index) => xMin + index * span / (sampleCount - 1));
	}

	function buildSinusoidalEquation(params) {
		let equation = `y = ${formatFitNumber(params.A)} e^{${formatFitNumber(params.b)}x} \\sin(${formatFitNumber(params.k)}x`;
		if (params.phi > 0) equation += ` - ${formatFitNumber(params.phi)}`;
		else if (params.phi < 0) equation += ` + ${formatFitNumber(Math.abs(params.phi))}`;
		equation += `)`;
		if (params.c > 0) equation += ` + ${formatFitNumber(params.c)}`;
		else if (params.c < 0) equation += ` - ${formatFitNumber(Math.abs(params.c))}`;
		return equation;
	}

	function buildGaussianEquation(params) {
		let equation = `y = ${formatFitNumber(params.A)} e^{-\\frac{(x - ${formatFitNumber(params.mu)})^2}{2(${formatFitNumber(params.sigma)})^2}}`;
		if (params.c > 0) equation += ` + ${formatFitNumber(params.c)}`;
		else if (params.c < 0) equation += ` - ${formatFitNumber(Math.abs(params.c))}`;
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

	function evaluateGaussian(params, xValue) {
		const A = Number(params.A);
		const mu = Number(params.mu);
		const sigma = Number(params.sigma);
		const c = Number(params.c);
		return A * Math.exp(-((xValue - mu) ** 2) / (2 * sigma * sigma)) + c;
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
			if (!Number.isFinite(yPred)) return NaN;
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

	// Scale the optimization coordinates, not just the finite differences. Bounds
	// reject a step before evaluating a model outside its physical domain.
	function solveScaledLeastSquares(data, initial, residualFn, options = {}) {
		const scales = initial.map((value, i) => Math.abs(options.scales?.[i]) || Math.abs(value) || 1);
		const bounds = options.bounds || initial.map(() => ({}));
		const unpack = u => u.map((value, i) => initial[i] + value * scales[i]);
		const valid = p => p.every((value, i) => Number.isFinite(value) && (bounds[i]?.min == null || value >= bounds[i].min) && (bounds[i]?.max == null || value <= bounds[i].max)) && (!options.isValidParams || options.isValidParams(p));
		const first = valid(initial) ? residualFn(initial, data) : null;
		if (!first || first.length !== data.length || first.some(v => !Number.isFinite(v))) return null;
		const scale = Math.max(maxAbs(first), maxAbs(data.map(p => p.y))) || 1;
		const residual = u => residualFn(unpack(u), data).map(value => value / scale);
		const canEvaluate = u => valid(unpack(u)) && residual(u).every(Number.isFinite);
		const jacobian = u => {
			const base = residual(u);
			const cols = u.map((value, j) => {
				const h = 1e-5 * Math.max(1, Math.abs(value));
				const plus = u.slice(), minus = u.slice(); plus[j] += h; minus[j] -= h;
				const fp = canEvaluate(plus) ? residual(plus) : null, fm = canEvaluate(minus) ? residual(minus) : null;
				return base.map((v, i) => fp && fm ? (fp[i] - fm[i]) / (2 * h) : fp ? (fp[i] - v) / h : fm ? (v - fm[i]) / h : 0);
			});
			return data.map((_, i) => cols.map(col => col[i]));
		};
		const normalizedData = data.map(p => ({ x: p.x, y: p.y / scale }));
		const result = levenbergMarquardt(normalizedData, initial.map(() => 0), residual, jacobian,
			{ ...options, isValidParams: canEvaluate,
				projectParams: u => u.map((value, i) => Math.min(bounds[i]?.max == null ? Infinity : (bounds[i].max - initial[i]) / scales[i], Math.max(bounds[i]?.min == null ? -Infinity : (bounds[i].min - initial[i]) / scales[i], value))),
				projectGradient: (u, gradient) => gradient.map((value, i) => {
					const p = unpack(u)[i], bound = bounds[i] || {};
					return (bound.min != null && p <= bound.min && value > 0) || (bound.max != null && p >= bound.max && value < 0) ? 0 : value;
				})
			});
		return { ...result, params: unpack(result.params), cost: result.cost * scale * scale };
	}

	function solveCustomMultiStart(data, starts, residualFn, jacobianFn, options = {}) {
		let best = null;
		for (const start of starts) {
			const result = solveScaledLeastSquares(data, start, residualFn, { maxIterations: 350, tolerance: 1e-10, ...options });
			if (result && Number.isFinite(result.cost) && (!best || result.cost < best.cost)) best = result;
		}
		return best || { params: null, cost: Infinity, converged: false, reason: 'invalid-starts', iterations: 0 };
	}

	// Work in dimensionless x and y; changing measurement units must not change a fit.
	function scaledData(data) {
		const points = data.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
		const { min: origin, max } = minMaxFinite(points.map(p => p.x));
		const span = max - origin;
		if (points.length < 2 || !(span > 0) || !Number.isFinite(span)) return null;
		const offset = points.reduce((sum, p) => sum + p.y / points.length, 0);
		const scale = maxAbs(points.map(p => p.y - offset)) || Math.abs(offset) || 1;
		return { origin, span, offset, scale, points: points.map(p => ({ x: (p.x - origin) / span, y: (p.y - offset) / scale })) };
	}

	// Column-scaled, twice-orthogonalized QR. Avoid normal equations and their squared
	// condition number when estimating the linear coefficients of a nonlinear model.
	function linearLeastSquares(rows, values) {
		if (!rows.length || rows.length !== values.length || !rows[0].length) return null;
		const n = rows.length, m = rows[0].length;
		if (n < m || rows.some(row => row.length !== m || row.some(v => !Number.isFinite(v))) || values.some(v => !Number.isFinite(v))) return null;
		const scales = Array.from({ length: m }, (_, j) => maxAbs(rows.map(row => row[j])));
		if (scales.some(s => !(s > 0))) return null;
		const q = [], r = Array.from({ length: m }, () => Array(m).fill(0));
		for (let j = 0; j < m; j++) {
			const v = rows.map(row => row[j] / scales[j]);
			for (let pass = 0; pass < 2; pass++) {
				for (let k = 0; k < j; k++) {
					const dot = v.reduce((sum, value, i) => sum + value * q[k][i], 0);
					r[k][j] += dot;
					for (let i = 0; i < n; i++) v[i] -= dot * q[k][i];
				}
			}
			r[j][j] = Math.sqrt(v.reduce((sum, value) => sum + value * value, 0));
			if (!(r[j][j] > 1e-12 * Math.sqrt(n))) return null;
			q.push(v.map(value => value / r[j][j]));
		}
		const coefficients = q.map(col => col.reduce((sum, value, i) => sum + value * values[i], 0));
		for (let j = m - 1; j >= 0; j--) {
			for (let k = j + 1; k < m; k++) coefficients[j] -= r[j][k] * coefficients[k];
			coefficients[j] /= r[j][j];
		}
		for (let j = 0; j < m; j++) coefficients[j] /= scales[j];
		const residuals = rows.map((row, i) => row.reduce((sum, value, j) => sum + value * coefficients[j], 0) - values[i]);
		const cost = residuals.reduce((sum, value) => sum + value * value, 0);
		return Number.isFinite(cost) ? { coefficients, residuals, cost } : null;
	}

	function profileModel(points, basis) {
		return linearLeastSquares(points.map(p => basis(p.x)), points.map(p => p.y));
	}

	// Variable projection: solve linear coefficients exactly at every nonlinear step.
	function refineProfile(points, starts, profile, valid, options = {}) {
		let best = null;
		for (const start of starts) {
			if (!valid(start) || !profile(start)) continue;
			const residual = p => profile(p)?.residuals || points.map(() => NaN);
			const jacobian = p => {
				const base = residual(p);
				const columns = p.map((value, j) => {
					const step = 1e-5 * Math.max(1, Math.abs(value));
					const plus = p.slice(), minus = p.slice();
					plus[j] += step; minus[j] -= step;
					const fp = valid(plus) ? profile(plus)?.residuals : null;
					const fm = valid(minus) ? profile(minus)?.residuals : null;
					return base.map((v, i) => fp && fm ? (fp[i] - fm[i]) / (2 * step) : fp ? (fp[i] - v) / step : fm ? (v - fm[i]) / step : 0);
				});
				return points.map((_, i) => columns.map(col => col[i]));
			};
			const result = levenbergMarquardt(points, start, residual, jacobian, {
				maxIterations: options.maxIterations || 250, tolerance: options.tolerance || 1e-12,
				isValidParams: p => valid(p) && profile(p) !== null
			});
			const fitted = profile(result.params);
			if (fitted && (!best || fitted.cost < best.cost)) best = { ...result, ...fitted };
		}
		return best;
	}

	function distinctStarts(candidates, limit, distance) {
		const selected = [];
		candidates.sort((a, b) => a.cost - b.cost);
		for (const candidate of candidates) {
			if (selected.every(other => distance(candidate.params, other.params))) selected.push(candidate);
			if (selected.length >= limit) break;
		}
		return selected.map(candidate => candidate.params);
	}

	// An FFT locates promising frequencies on a near-uniform grid without scanning every
	// frequency against every measurement. It only supplies starts: scoring and
	// refinement below still use all original points, including their damping.
	function uniformFrequencyStarts(points, xs, maxOmega) {
		if (points.length < 128 || xs.length !== points.length) return null;
		const step = 1 / (xs.length - 1);
		// Sound Analyzer rounds exported times; allow sub-sample timestamp
		// rounding here, but score and refine using their actual x coordinates.
		if (xs.some((x, i) => Math.abs(x - i * step) > step * 0.45)) return null;
		let size = 1;
		while (size < points.length * 4) size *= 2;
		const real = new Float64Array(size), imaginary = new Float64Array(size);
		const sorted = points.slice().sort((a, b) => a.x - b.x);
		for (let i = 0; i < sorted.length; i++) real[i] = sorted[i].y;
		for (let i = 1, j = 0; i < size; i++) {
			let bit = size >> 1;
			for (; j & bit; bit >>= 1) j ^= bit;
			j ^= bit;
			if (i < j) [real[i], real[j]] = [real[j], real[i]];
		}
		for (let length = 2; length <= size; length *= 2) {
			const angle = -2 * Math.PI / length;
			const wr = Math.cos(angle), wi = Math.sin(angle);
			for (let offset = 0; offset < size; offset += length) {
				let ur = 1, ui = 0;
				for (let j = 0; j < length / 2; j++) {
					const a = offset + j, b = a + length / 2;
					const vr = real[b] * ur - imaginary[b] * ui, vi = real[b] * ui + imaginary[b] * ur;
					real[b] = real[a] - vr; imaginary[b] = imaginary[a] - vi;
					real[a] += vr; imaginary[a] += vi;
					const next = ur * wr - ui * wi;
					ui = ur * wi + ui * wr; ur = next;
				}
			}
		}
		const powers = Array.from({ length: size / 2 + 1 }, (_, i) => real[i] ** 2 + imaginary[i] ** 2);
		const peaks = [];
		for (let i = 1; i < powers.length; i++) {
			if (powers[i] >= powers[i - 1] && (i === powers.length - 1 || powers[i] >= powers[i + 1])) peaks.push(i);
		}
		peaks.sort((a, b) => powers[b] - powers[a]);
		const spacing = 2 * Math.PI / (size * step);
		const frequencies = new Set();
		const add = omega => { if (omega > 0 && omega <= maxOmega) frequencies.add(omega); };
		// Include the low-frequency region where a partial cycle and damping can
		// resemble a trend, as well as spectral peaks and the sampling limit.
		for (let omega = 0.1; omega <= 8 * Math.PI; omega += Math.PI / 4) add(omega);
		for (const peak of peaks.slice(0, 16)) for (const delta of [-1, -0.5, 0, 0.5, 1]) {
			const omega = (peak + delta) * spacing;
			add(omega);
			// Rounded timestamps can put the median-spacing limit above the
			// nominal uniform-grid Nyquist; test the reflected candidate too.
			add(2 * Math.PI / step - omega);
		}
		add(maxOmega * (1 - 1e-8));
		return [...frequencies];
	}

	// QR for the three sinusoidal basis columns, without allocating a row matrix
	// at every frequency. Reorthogonalization preserves accuracy near degeneracy.
	function sinusoidalProfile(points) {
		const n = points.length, sine = new Float64Array(n), cosine = new Float64Array(n);
		const meanY = points.reduce((sum, p) => sum + p.y / n, 0);
		const cache = new Map();
		return ([omega, damping]) => {
			const key = `${omega},${damping}`;
			if (cache.has(key)) return cache.get(key);
			let meanS = 0, meanC = 0, scaleS = 0, scaleC = 0;
			for (let i = 0; i < n; i++) {
				const x = points[i].x, envelope = Math.exp(damping * (x - 0.5));
				sine[i] = envelope * Math.sin(omega * x); cosine[i] = envelope * Math.cos(omega * x);
				meanS += sine[i] / n; meanC += cosine[i] / n;
				scaleS = Math.max(scaleS, Math.abs(sine[i])); scaleC = Math.max(scaleC, Math.abs(cosine[i]));
			}
			let normS = 0;
			for (let i = 0; i < n; i++) {
				sine[i] -= meanS; cosine[i] -= meanC; normS += sine[i] * sine[i];
			}
			normS = Math.sqrt(normS);
			if (!(normS > 1e-12 * Math.sqrt(n) * scaleS)) return null;
			for (let i = 0; i < n; i++) sine[i] /= normS;
			let cross = 0;
			for (let pass = 0; pass < 2; pass++) {
				let constant = 0, projection = 0;
				for (let i = 0; i < n; i++) { constant += cosine[i] / n; projection += sine[i] * cosine[i]; }
				cross += projection;
				for (let i = 0; i < n; i++) cosine[i] -= constant + projection * sine[i];
			}
			let normC = 0, ys = 0, yc = 0;
			for (let i = 0; i < n; i++) normC += cosine[i] * cosine[i];
			normC = Math.sqrt(normC);
			if (!(normC > 1e-12 * Math.sqrt(n) * scaleC)) return null;
			for (let i = 0; i < n; i++) {
				cosine[i] /= normC; ys += sine[i] * (points[i].y - meanY); yc += cosine[i] * (points[i].y - meanY);
			}
			const c = yc / normC, b = (ys - cross * c) / normS;
			const coefficients = [meanY - meanS * b - meanC * c, b, c];
			const residuals = new Array(n);
			let cost = 0;
			for (let i = 0; i < n; i++) {
				residuals[i] = meanY + ys * sine[i] + yc * cosine[i] - points[i].y;
				cost += residuals[i] * residuals[i];
			}
			const result = Number.isFinite(cost) ? { coefficients, residuals, cost } : null;
			if (cache.size >= 32) cache.delete(cache.keys().next().value);
			cache.set(key, result);
			return result;
		};
	}

	function sinusoidalSearch(data) {
		const scaled = scaledData(data);
		if (!scaled || scaled.points.length < 5) return null;
		const xs = [...new Set(scaled.points.map(p => p.x))].sort((a, b) => a - b);
		const gaps = xs.slice(1).map((x, i) => x - xs[i]).sort((a, b) => a - b);
		if (!gaps.length) return null;
		// Exact Nyquist limit for a uniform grid; a documented median-spacing search
		// limit for irregular samples (there is no unique irregular-grid Nyquist).
		const maxOmega = Math.PI / gaps[Math.floor(gaps.length / 2)];
		const profile = sinusoidalProfile(scaled.points);
		const candidates = [];
		const count = Math.min(6000, Math.max(80, Math.ceil(maxOmega / (Math.PI / 4))));
		const frequencies = uniformFrequencyStarts(scaled.points, xs, maxOmega)
			|| Array.from({ length: count + 1 }, (_, i) => 0.1 + (maxOmega * (1 - 1e-8) - 0.1) * i / count);
		for (const damping of [0, -2, 2, -8, 8]) {
			for (const omega of frequencies) {
				const fit = profile([omega, damping]);
				if (fit) candidates.push({ params: [omega, damping], cost: fit.cost });
			}
		}
		return { scaled, profile, maxOmega, starts: distinctStarts(candidates, 12, (a, b) => Math.abs(a[0] - b[0]) > Math.PI / 2 || Math.abs(a[1] - b[1]) > 3) };
	}

	function sinusoidalParameters(scaled, nonlinear, coefficients) {
		const [omega, damping] = nonlinear;
		const [offset, sine, cosine] = coefficients;
		const b = damping / scaled.span, k = omega / scaled.span;
		return { A: scaled.scale * Math.hypot(sine, cosine) * Math.exp(-damping / 2 - b * scaled.origin), b, k,
			phi: Math.atan2(-cosine, sine) + k * scaled.origin, c: scaled.offset + scaled.scale * offset };
	}

	function estimateSinusoidal(data) {
		const search = sinusoidalSearch(data);
		if (!search || !search.starts.length) return null;
		const start = search.starts[0];
		return sinusoidalParameters(search.scaled, start, search.profile(start).coefficients);
	}

	function estimateGaussian(data) {
		const scaled = scaledData(data);
		if (!scaled || scaled.points.length < 4) return null;
		const sorted = scaled.points.slice().sort((a, b) => a.x - b.x);
		const edgeCount = Math.max(1, Math.ceil(sorted.length / 10));
		const edges = [...sorted.slice(0, edgeCount), ...sorted.slice(-edgeCount)].map(p => p.y).sort((a, b) => a - b);
		const baseline = edges[Math.floor(edges.length / 2)];
		const peak = sorted.reduce((best, p) => Math.abs(p.y - baseline) > Math.abs(best.y - baseline) ? p : best);
		const sign = peak.y >= baseline ? 1 : -1;
		const half = Math.abs(peak.y - baseline) / 2;
		const peakIndex = sorted.indexOf(peak);
		const crossing = (from, direction) => {
			for (let i = from; i + direction >= 0 && i + direction < sorted.length; i += direction) {
				const p = sorted[i], q = sorted[i + direction];
				const a = sign * (p.y - baseline), b = sign * (q.y - baseline);
				if (a >= half && b < half) return p.x + (q.x - p.x) * (half - a) / (b - a);
			}
			return null;
		};
		const left = crossing(peakIndex, -1), right = crossing(peakIndex, 1);
		const width = left !== null && right !== null ? (right - left) / Math.sqrt(8 * Math.log(2)) : 0.1;
		return { A: scaled.scale * (peak.y - baseline), mu: scaled.origin + scaled.span * peak.x,
			sigma: scaled.span * Math.max(width, 1e-6), c: scaled.offset + scaled.scale * baseline };
	}

	function solveSinusoidal(data, initial = {}, options = {}) {
		const search = sinusoidalSearch(data);
		if (!search) return null;
		const { scaled, profile, starts } = search;
		const manualOmega = Number(initial.k) * scaled.span;
		const maxOmega = manualOmega > search.maxOmega * (1 + 1e-6) ? manualOmega * 1.25 : search.maxOmega;
		const valid = ([omega, damping]) => omega > 0 && omega <= maxOmega && Math.abs(damping) < 100;
		if (Number.isFinite(manualOmega) && Number.isFinite(initial.b)) starts.unshift([manualOmega, initial.b * scaled.span]);
		let best = refineProfile(scaled.points, starts, profile, valid, options);
		if (!best) return null;
		let params = sinusoidalParameters(scaled, best.params, best.coefficients);
		// Keep the user's complete vector as a candidate, including phase. Projected
		// starts normally improve it, but an exact supplied solution must not be lost.
		if (['A', 'b', 'k', 'phi', 'c'].every(key => Number.isFinite(initial[key])) && initial.k > 0) {
			const cost = data.reduce((sum, p) => sum + ((evaluateSinusoidal(initial, p.x) - p.y) / scaled.scale) ** 2, 0);
			if (Number.isFinite(cost) && cost < best.cost) {
				params = { ...initial };
				best = { ...best, cost, converged: cost < 1e-24, reason: cost < 1e-24 ? 'residual-at-roundoff' : 'user-start', iterations: 0 };
			}
		}
		if (Object.values(params).some(value => !Number.isFinite(value))) return null;
		// Trigonometric evaluation loses absolute phase precision as k*span grows.
		// A residual at that floating-point floor is a solved fit, even if LM stalls.
		const phaseRoundoff = 32 * Number.EPSILON * (1 + Math.abs(params.k * scaled.span));
		if (best.cost <= data.length * phaseRoundoff ** 2) best = { ...best, converged: true, reason: 'residual-at-roundoff' };
		const xFit = buildFitDomainFromData(data, options.sampleCount || 300);
		return { params, xFit, yFit: xFit.map(x => evaluateSinusoidal(params, x)), equation: buildSinusoidalEquation(params),
			converged: best.converged, reason: best.reason, iterations: best.iterations };
	}

	function solveGaussian(data, initial = {}, options = {}) {
		const scaled = scaledData(data), guess = estimateGaussian(data);
		if (!scaled || !guess) return null;
		const profile = ([mu, logSigma]) => profileModel(scaled.points, x => [1, Math.exp(-0.5 * ((x - mu) / Math.exp(logSigma)) ** 2)]);
		const candidates = [];
		const centers = [guess.mu, initial.mu].filter(Number.isFinite).map(mu => (mu - scaled.origin) / scaled.span);
		centers.push(...Array.from({ length: 9 }, (_, i) => i / 8));
		const widths = [guess.sigma / scaled.span, Math.abs(initial.sigma) / scaled.span, 0.02, 0.05, 0.1, 0.25, 0.5, 1].filter(w => Number.isFinite(w) && w > 0);
		for (const mu of centers) for (const width of widths) {
			const params = [mu, Math.log(width)], fit = profile(params);
			if (fit) candidates.push({ params, cost: fit.cost });
		}
		const starts = distinctStarts(candidates, 8, (a, b) => Math.abs(a[0] - b[0]) > 0.05 || Math.abs(a[1] - b[1]) > 0.5);
		const best = refineProfile(scaled.points, starts, profile, ([mu, logSigma]) => Number.isFinite(mu) && logSigma > -30 && logSigma < 20, options);
		if (!best) return null;
		const params = { A: scaled.scale * best.coefficients[1], mu: scaled.origin + scaled.span * best.params[0],
			sigma: scaled.span * Math.exp(best.params[1]), c: scaled.offset + scaled.scale * best.coefficients[0] };
		const xFit = buildFitDomainFromData(data, options.sampleCount || 300);
		return { params, xFit, yFit: xFit.map(x => evaluateGaussian(params, x)), equation: buildGaussianEquation(params),
			converged: best.converged, reason: best.reason, iterations: best.iterations };
	}

	// xRef is fixed from the data, never a fourth fitted parameter.
	function solveExponential(data, options = {}) {
		const scaled = scaledData(data);
		if (!scaled || scaled.points.length < 3) return null;
		const profile = ([rate]) => profileModel(scaled.points, x => [1, Math.exp(rate * (x - 0.5))]);
		const candidates = [];
		for (const sign of [-1, 1]) for (const rate of [0.001, 0.01, 0.1, 0.3, 1, 2, 4, 8, 16, 32, 64]) {
			const params = [sign * rate], fit = profile(params);
			if (fit) candidates.push({ params, cost: fit.cost });
		}
		const starts = distinctStarts(candidates, 8, (a, b) => Math.abs(a[0] - b[0]) > 0.1);
		const best = refineProfile(scaled.points, starts, profile, ([rate]) => Math.abs(rate) > 1e-10 && Math.abs(rate) < 500, options);
		if (!best) return null;
		return { params: { A: scaled.scale * best.coefficients[1], b: best.params[0] / scaled.span,
			c: scaled.offset + scaled.scale * best.coefficients[0], xRef: scaled.origin + scaled.span / 2 },
			converged: best.converged, reason: best.reason, iterations: best.iterations };
	}

	function evaluateShiftedPower(params, xValue) {
		const t = xValue - params.x0;
		if (!(t > 0) && !Number.isInteger(params.b)) return NaN;
		return params.A * Math.pow(t, params.b) + params.c;
	}

	function solveShiftedPowerLaw(data, options = {}) {
		const scaled = scaledData(data);
		if (!scaled || scaled.points.length < 4) return null;
		// gap = exp(logGap) guarantees x0 < min(x) throughout optimization.
		// Divide the basis by its maximum before solving to avoid huge powers.
		const profile = ([logGap, exponent]) => {
			const gap = Math.exp(logGap);
			const shift = exponent * Math.log(exponent >= 0 ? 1 + gap : gap);
			return profileModel(scaled.points, x => [1, Math.exp(exponent * Math.log(x + gap) - shift)]);
		};
		const valid = ([logGap, exponent]) => logGap > -32 && logGap < 32 && Math.abs(exponent) > 1e-7 && Math.abs(exponent) < 100;
		const candidates = [];
		const gaps = [1e-6, 1e-4, 0.001, 0.01, 0.1, 0.3, 1, 3, 10, 100, 1000, 10000];
		if (scaled.origin > 0) gaps.push(scaled.origin / scaled.span);
		const exponents = [-16, -8, -4, -3, -2, -1, -0.5, -0.25, 0.25, 0.5, 0.75, 0.9, 1.1, 1.5, 2, 3, 4, 8, 16];
		for (const gap of gaps) for (const exponent of exponents) {
			const params = [Math.log(gap), exponent], fit = profile(params);
			if (fit) candidates.push({ params, cost: fit.cost });
		}
		const starts = distinctStarts(candidates, 12, (a, b) => Math.abs(a[0] - b[0]) > 0.5 || Math.abs(a[1] - b[1]) > 0.25);
		const best = refineProfile(scaled.points, starts, profile, valid, { maxIterations: 500, ...options });
		if (!best) return null;
		const [logGap, b] = best.params, gap = Math.exp(logGap);
		const shift = b * Math.log(b >= 0 ? 1 + gap : gap);
		const params = { A: scaled.scale * best.coefficients[1] * Math.exp(-shift - b * Math.log(scaled.span)), b,
			x0: scaled.origin - scaled.span * gap, c: scaled.offset + scaled.scale * best.coefficients[0] };
		if (Object.values(params).some(value => !Number.isFinite(value)) || data.some(p => !Number.isFinite(evaluateShiftedPower(params, p.x)))) return null;
		const line = profileModel(scaled.points, x => [1, x]);
		const ambiguous = !!line && line.cost < 1e-20;
		return { params, converged: best.converged && !ambiguous, reason: ambiguous ? 'unidentifiable' : best.reason,
			ambiguous, iterations: best.iterations, cost: best.cost * scaled.scale ** 2 };
	}

	function maxAbs(values) {
		return values.reduce((largest, value) => Math.max(largest, Math.abs(value)), 0);
	}

	function finiteOrZero(value) {
		return Number.isFinite(value) ? value : 0;
	}

	globalScope.PanPhyFitCore = Object.freeze({
		estimateGaussian,
		estimateSinusoidal,
		solveExponential,
		linearLeastSquares,
		solveScaledLeastSquares,
		formatFitNumber,
		computeLinearFit,
		computeRSq,
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
		solveCustomMultiStart,
		evaluateShiftedPower,
		solveShiftedPowerLaw
	});
})(typeof globalThis !== 'undefined' ? globalThis : self);
