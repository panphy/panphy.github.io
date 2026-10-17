// Fit statistics for PanPhyPlot (neo-beta): weighted straight lines, parameter uncertainties
// and chi-squared. Pure functions, so the same file runs in the browser and in node tests.
(function(root) {
	// Least-squares straight line y = mx + c. With sigmas, each point has weight 1/σ²;
	// without, the uncertainties come from the scatter of the residuals.
	function linearFit(x, y, sigmas = null) {
		const n = x.length;
		const w = sigmas ? sigmas.map(sigma => 1 / (sigma * sigma)) : x.map(() => 1);
		let S = 0, Sx = 0, Sy = 0, Sxx = 0, Sxy = 0;
		for (let i = 0; i < n; i++) {
			S += w[i];
			Sx += w[i] * x[i];
			Sy += w[i] * y[i];
			Sxx += w[i] * x[i] * x[i];
			Sxy += w[i] * x[i] * y[i];
		}
		const delta = S * Sxx - Sx * Sx;
		if (!(Math.abs(delta) > 0)) return null;
		const m = (S * Sxy - Sx * Sy) / delta;
		const c = (Sxx * Sy - Sx * Sxy) / delta;
		const residuals = x.map((xi, i) => y[i] - (m * xi + c));
		const dof = n - 2;
		let varianceM = S / delta;
		let varianceC = Sxx / delta;
		if (!sigmas) {
			const s2 = dof > 0 ? residuals.reduce((sum, r) => sum + r * r, 0) / dof : NaN;
			varianceM *= s2;
			varianceC *= s2;
		}
		return {
			m,
			c,
			uncertaintyM: Math.sqrt(varianceM),
			uncertaintyC: Math.sqrt(varianceC),
			residuals,
			chi2: sigmas ? chiSquared(residuals, sigmas) : null,
			dof
		};
	}

	function chiSquared(residuals, sigmas) {
		return residuals.reduce((sum, r, i) => sum + (r / sigmas[i]) ** 2, 0);
	}

	// Gauss-Jordan inverse of a small square matrix; null when it is singular.
	function invert(matrix) {
		const n = matrix.length;
		const a = matrix.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
		for (let col = 0; col < n; col++) {
			let pivot = col;
			for (let row = col + 1; row < n; row++) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
			if (!(Math.abs(a[pivot][col]) > 1e-300)) return null;
			[a[col], a[pivot]] = [a[pivot], a[col]];
			const scale = a[col][col];
			for (let j = 0; j < 2 * n; j++) a[col][j] /= scale;
			for (let row = 0; row < n; row++) {
				if (row === col) continue;
				const factor = a[row][col];
				for (let j = 0; j < 2 * n; j++) a[row][j] -= factor * a[col][j];
			}
		}
		return a.map(row => row.slice(n));
	}

	// Parameter uncertainties from the model's Jacobian at the best fit: (JᵀWJ)⁻¹ with weights 1/σ²,
	// or (JᵀJ)⁻¹ scaled by the residual variance when the points carry no uncertainties.
	function parameterUncertainties(jacobian, residuals, sigmas = null) {
		const covariance = parameterCovariance(jacobian, residuals, sigmas);
		return covariance ? covariance.map((row, i) => Math.sqrt(Math.max(row[i], 0))) : null;
	}

	// The full covariance matrix behind parameterUncertainties, for carrying the uncertainties
	// through a change of parameters (such as a polynomial fitted in a shifted, scaled variable).
	function parameterCovariance(jacobian, residuals, sigmas = null) {
		const n = jacobian.length;
		const p = n ? jacobian[0].length : 0;
		if (!p || n <= p) return null;
		const w = sigmas ? sigmas.map(sigma => 1 / (sigma * sigma)) : jacobian.map(() => 1);
		const normal = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => {
			let sum = 0;
			for (let k = 0; k < n; k++) sum += w[k] * jacobian[k][i] * jacobian[k][j];
			return sum;
		}));
		const covariance = invert(normal);
		if (!covariance) return null;
		const scale = sigmas ? 1 : residuals.reduce((sum, r) => sum + r * r, 0) / (n - p);
		return covariance.map(row => row.map(value => value * scale));
	}

	function trimZeros(text) {
		return text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text;
	}

	// "value ± uncertainty" with the uncertainty to two significant figures and the value to the
	// same decimal place, as TeX. Very large or small numbers share one power of ten.
	function formatMeasurement(value, uncertainty) {
		if (!Number.isFinite(value)) return '\\text{undefined}';
		if (!(uncertainty > 0) || !Number.isFinite(uncertainty)) return String(Number(value.toPrecision(6)));
		const exponent = Math.floor(Math.log10(Math.max(Math.abs(value), uncertainty)));
		const useScientific = exponent >= 5 || exponent <= -4;
		const shift = useScientific ? exponent : 0;
		const v = value / 10 ** shift;
		const u = uncertainty / 10 ** shift;
		const decimals = Math.max(0, 1 - Math.floor(Math.log10(u)));
		const pair = `${v.toFixed(decimals)} \\pm ${u.toFixed(decimals)}`;
		return useScientific ? `(${pair}) \\times 10^{${shift}}` : pair;
	}

	function formatChiSquared(chi2, dof) {
		if (!Number.isFinite(chi2) || !(dof > 0)) return null;
		return trimZeros((chi2 / dof).toPrecision(3));
	}

	// One number to a fixed number of decimal places. A value that would show as zero, or a very
	// large one, keeps the same decimal places in scientific form, so 0.0023 at 2 dp reads 2.30 × 10⁻³.
	function formatFixedDecimals(value, decimals) {
		if (value === 0) return (0).toFixed(decimals);
		const fixed = value.toFixed(decimals);
		if (Math.abs(value) >= 1e6 || Number(fixed) === 0) {
			const [mantissa, exponent] = value.toExponential(decimals).split('e');
			return `${mantissa}\\times 10^{${Number(exponent)}}`;
		}
		return fixed;
	}

	// Rewrites every fitted number in an equation's TeX to the given decimal places. Whole-number
	// powers and subscripts (x^{2}, 10^{-5}, a_{1}) are structure, not fitted values, and stay.
	const EQUATION_NUMBER = /(\^\{?|_\{?)?(\d+(?:\.\d+)?)(?:\s*(?:\\times|\\cdot)\s*10\^\{(-?\d+)\}|e([+-]?\d+))?/g;

	function roundEquationDecimals(latex, decimals) {
		return String(latex || '').replace(EQUATION_NUMBER, (match, prefix, digits, texExponent, eExponent) => {
			const exponent = texExponent ?? eExponent;
			if (prefix && exponent === undefined && !digits.includes('.')) return match;
			const value = Number(digits) * 10 ** (exponent === undefined ? 0 : Number(exponent));
			if (!Number.isFinite(value)) return match;
			const formatted = formatFixedDecimals(value, decimals);
			return prefix ? `${prefix}${formatted}` : formatted;
		});
	}

	const api = { formatFixedDecimals, roundEquationDecimals, linearFit, chiSquared, invert, parameterCovariance, parameterUncertainties, formatMeasurement, formatChiSquared };
	if (typeof module === 'object' && module.exports) module.exports = api;
	else root.PanPhyNeoStats = api;
})(typeof globalThis === 'object' ? globalThis : this);
