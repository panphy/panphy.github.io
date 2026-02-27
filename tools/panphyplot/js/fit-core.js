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

	function buildFitDomainFromData(data, sampleCount = 300) {
		const xValues = data.map((point) => point.x);
		const xMin = Math.min(...xValues);
		const xMax = Math.max(...xValues);
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

	globalScope.PanPhyFitCore = Object.freeze({
		transpose,
		multiply,
		multiplyMatrixVector,
		solve,
		levenbergMarquardt,
		buildFitDomainFromData,
		buildSinusoidalEquation,
		buildGaussianEquation
	});
})(typeof globalThis !== 'undefined' ? globalThis : self);
