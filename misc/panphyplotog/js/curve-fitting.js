// Basic fits for the introductory, single-dataset PanPhyPlotOG.
(function() {
const fitCore = window.PanPhyFitCore;
const { minMaxFinite, buildFitDomainFromData, computeLinearFit, computeRSq, solveShiftedPowerLaw } = fitCore;
const formatFitNumber = value => formatEquationText(fitCore.formatFitNumber(value));
function fitCurve() {
	if (typeof updateData === 'function') {
		updateData();
	}
	const filteredData = getFiniteDatasetPoints(activeSet);
	const xValues = filteredData.map(point => point.x);
	const yValues = filteredData.map(point => point.y);
	const fitMethod = document.getElementById('fit-method').value;

	// For fitting methods where you need x and y arrays,
	// we are mapping the filtered dataset to extract the x and y values.
	if (fitMethod === 'Linear') {
		if (filteredData.length < 2) {
			alert('Please enter at least two data points.');
			return;
		}
		performLinearFit(xValues, yValues);
	} else if (fitMethod.startsWith('Polynomial')) {
		const degree = parseInt(fitMethod.split('-')[1]);
		const minimumPoints = degree + 1;
		if (filteredData.length < minimumPoints) {
			alert(`Please enter at least ${minimumPoints} data points for a degree ${degree} polynomial fit.`);
			return;
		}
		performPolynomialFit(xValues, yValues, degree);
	} else if (fitMethod === 'Exponential') {
		performExponentialFit();
	} else if (fitMethod === 'Power') {
		performPowerFit();
	}
}

function formatExpEquation(A, b, c, useShift = false, x0 = 0) {
	const Aabs = formatFitNumber(Math.abs(A));
	const bStr = formatFitNumber(Number(b));
	const base = useShift ?
		`y = ${A >= 0 ? '' : '-'}${Aabs} e^{${bStr}(x ${x0 >= 0 ? '- ' + formatFitNumber(x0) : '+ ' + formatFitNumber(Math.abs(x0))})}` :
		`y = ${A >= 0 ? '' : '-'}${Aabs} e^{${bStr} x}`;
	const cNum = Number(c);
	if (!isFinite(cNum) || cNum === 0) return base;
	return cNum > 0 ? `${base} + ${formatFitNumber(cNum)}` : `${base} - ${formatFitNumber(Math.abs(cNum))}`;
}

function updateResults(equation, x, y, fitFunction, datasetIndex = activeSet, solver = null, choice = { kind: 'basic', method: document.getElementById('fit-method').value }) {
	equation = formatEquationText(equation);
	const residuals = x.map((value, i) => ({ x: value, y: y[i] - fitFunction(value) }));
	const finiteResiduals = residuals.filter(point => Number.isFinite(point.y));
	const rSquared = computeRSq(x, y, fitFunction);
	let scale = 0;
	for (const point of finiteResiduals) scale = Math.max(scale, Math.abs(point.y));
	const rmse = scale === 0 ? 0 : scale * Math.sqrt(finiteResiduals.reduce((sum, point) => sum + (point.y / scale) ** 2, 0) / finiteResiduals.length);
	const stopReason = solver?.reason === 'iteration-limit' ? 'iteration limit reached' : 'no further improvement found';
	let status = solver ? (solver.converged ? `Converged in ${solver.iterations} iterations.` : `Convergence not confirmed: ${stopReason}. Try another basic model, or use PanPhyPlot for more fitting options.`) : 'Least-squares solution calculated.';
	if (finiteResiduals.length !== x.length) status = 'Fit is undefined for some measurements. Check the model and initial parameters.';
	const result = {
		equation,
		rSquared: Number.isFinite(rSquared) ? rSquared.toFixed(5) : 'N/A',
		residuals: finiteResiduals,
		rmse: Number.isFinite(rmse) ? rmse : null,
		status,
		stale: false,
		choice
	};
	datasetFitResults[datasetIndex] = result;
	if (datasetIndex === activeSet) renderFittingResult(equation, result.rSquared);
	scheduleSaveState();
}

function polyfit(x, y, degree) {
	try {
		const n = x.length;
		const meanX = x.reduce((s, v) => s + v, 0) / n;
		const stdXRaw = Math.sqrt(x.reduce((s, v) => s + (v - meanX) ** 2, 0) / n);
		const stdX = stdXRaw > 0 ? stdXRaw : 1;

		const X = x.map(xi => {
			const u = (xi - meanX) / stdX;
			return Array.from({ length: degree + 1 }, (_, j) => u ** (degree - j));
		});
		const Xt = math.transpose(X);
		const XtX = math.multiply(Xt, X);
		const XtY = math.multiply(Xt, y);
		const coefficients = math.lusolve(XtX, XtY).flat();
		return { coefficients, meanX, stdX };
	} catch (error) {
		console.error('Error performing polynomial fit:', error);
		throw error;
	}
}

function polyEval(fit, x) {
	try {
		const u = (x - fit.meanX) / fit.stdX;
		return fit.coefficients.reduce(
			(sum, coef, i) => sum + coef * Math.pow(u, fit.coefficients.length - i - 1),
			0
		);
	} catch (error) {
		console.error('Error evaluating polynomial:', error);
		throw error;
	}
}

function performLinearFit(x, y) {
	try {
		const { slope, intercept, evaluate: fitFunction } = computeLinearFit(x, y);

		const { min: xMin, max: xMax } = minMaxFinite(x);
		const xFit = [xMin, xMax];
		const yFit = xFit.map(fitFunction);

		let equation = `y = ${formatFitNumber(slope)}x + ${formatFitNumber(intercept)}`;
		if (intercept < 0) {
			equation = `y = ${formatFitNumber(slope)}x - ${formatFitNumber(Math.abs(intercept))}`;
		}

		// Store the fitted curve for this dataset.
		fittedCurves[activeSet] = { x: xFit, y: yFit, equation: equation };

		updateResults(equation, x, y, fitFunction, activeSet, null, { kind: 'basic', method: document.getElementById('fit-method').value });
		plotGraph(xFit, yFit);
	} catch (error) {
		console.error('Error performing linear fit:', error);
		alert('An error occurred during linear fitting. Please check the console for details.');
	}
}

function performPolynomialFit(x, y, degree) {
	try {
		const fit = polyfit(x, y, degree);
		const { min: xMin, max: xMax } = minMaxFinite(x);
		const xFit = Array.from({ length: 100 }, (_, i) => xMin + i * (xMax - xMin) / 99);
		const yFit = xFit.map(xi => polyEval(fit, xi));

		const fitFunction = xi => polyEval(fit, xi);

		let equation = 'y = ';
		fit.coefficients.forEach((c, i) => {
			const power = degree - i;
			if (c === 0) return;

			const absC = formatFitNumber(Math.abs(c));
			const sign = c >= 0 ? (i === 0 ? '' : ' + ') : (i === 0 ? '-' : ' - ');

			let term = '';
			if (power === 0) {
				term = `${absC}`;
			} else if (power === 1) {
				term = `${absC}u`;
			} else {
				term = `${absC}u^{${power}}`;
			}

			equation += `${sign}${term}`;
		});
		equation += `,\\ u = \\frac{x - ${formatFitNumber(fit.meanX)}}{${formatFitNumber(fit.stdX)}}`;

		// Store the fitted curve for this dataset.
		fittedCurves[activeSet] = { x: xFit, y: yFit, equation: equation };

		updateResults(equation, x, y, fitFunction, activeSet, null, { kind: 'basic', method: document.getElementById('fit-method').value });
		plotGraph(xFit, yFit);
	} catch (error) {
		console.error('Error performing polynomial fit:', error);
		alert('An error occurred during polynomial fitting. Please check the console for details.');
	}
}

function performExponentialFit() {
	try {
		const data = getFiniteDatasetPoints(activeSet);
		if (data.length < 3) { alert('Exponential fit requires at least three valid data points.'); return; }
		const solution = fitCore.solveExponential(data);
		if (!solution) { alert('Unable to find a finite exponential fit.'); return; }
		const { A, b, c, xRef } = solution.params;
		const model = ([amplitude, rate, baseline], x) => amplitude * Math.exp(rate * (x - xRef)) + baseline;
		const params = [A, b, c];
		const fitFunction = x => model(params, x);
		const xFit = buildFitDomainFromData(data, 100), yFit = xFit.map(fitFunction);
		// Prefer the familiar unshifted equation when it can represent the same curve.
		const unshiftedA = params[0] * Math.exp(-params[1] * xRef);
		const canUnshift = Number.isFinite(unshiftedA) && unshiftedA !== 0 && data.every(p => Number.isFinite(unshiftedA * Math.exp(params[1] * p.x)));
		const equation = canUnshift ? formatExpEquation(unshiftedA, params[1], params[2]) : formatExpEquation(params[0], params[1], params[2], true, xRef);
		fittedCurves[activeSet] = { x: xFit, y: yFit, equation };
		updateResults(equation, data.map(p => p.x), data.map(p => p.y), fitFunction, activeSet, solution, { kind: 'basic', method: 'Exponential' });
		plotGraph(xFit, yFit);
	} catch (error) {
		console.error('Error performing exponential fit:', error);
		alert('An error occurred during exponential fitting. Please check the console for details.');
	}
}

function performPowerFit() {
	try {
		// 1. Filter and validate input data
		const validData = getFiniteDatasetPoints(activeSet);
		if (validData.length < 4) {
			alert("Power fit requires at least 4 data points.");
			return;
		}

		const xValues = validData.map(p => p.x);
		const yValues = validData.map(p => p.y);

		// 2. Solve y = A (x - x0)^b + c: A and c are exact for each (x0, b) in a scan, then all
		//    four parameters are polished together (PanPhyFitCore.solveShiftedPowerLaw).
		const solution = solveShiftedPowerLaw(validData);
		const solver = solution;
		const bestParams = solution ? [solution.params.A, solution.params.b, solution.params.x0, solution.params.c] : null;

		// 4. Use the best parameters found
		if (!bestParams) {
			alert("Unable to find a suitable power-law fit.");
			return;
		}
		const [A, b, x0, c] = bestParams;

		// 5. Generate fitted curve
		const { min: xMinFit, max: xMaxFit } = minMaxFinite(xValues);
		const N = 100;
		const xFit = Array.from({ length: N }, (_, i) => {
			return xMinFit + (i * (xMaxFit - xMinFit)) / (N - 1);
		});

		// Build y-fit, but skip invalid points if (x - x0) is negative and b non-integer
		const yFit = xFit.map(xi => {
			const term = xi - x0;
			try {
				if (term <= 0 && !Number.isInteger(b)) {
					// for non-integer b, (x - x0) <= 0 is invalid
					return NaN;
				}
				return A * Math.pow(term, b) + c;
			} catch {
				return NaN;
			}
		});

		// 6. Define a fit function for interactive queries
		const fitFunction = xi => {
			const term = xi - x0;
			if (term <= 0 && !Number.isInteger(b)) return NaN;
			return A * Math.pow(term, b) + c;
		};

		// 7. Construct the equation string
		// 7.1. Determine sign for x0 and c
		const x0Sign = (x0 >= 0) ?
			` - ${formatFitNumber(x0)}` // Example: (x - 2.500)
			:
			` + ${formatFitNumber(Math.abs(x0))}`; // Example: (x + 0.004) if x0 is -0.004

		const cSign = (c >= 0) ?
			` + ${formatFitNumber(c)}` :
			` - ${formatFitNumber(Math.abs(c))}`;

		// 7.2. Construct the equation string
		const equation = `y = ${formatFitNumber(A)}(x${x0Sign})^{${formatFitNumber(b)}}${cSign}`;

		// 8. Store the fitted curve
		fittedCurves[activeSet] = {
			x: xFit,
			y: yFit,
			equation: equation
		};

		// 9. Update results and plot
		updateResults(equation, xValues, yValues, fitFunction, activeSet, solver, { kind: 'basic', method: 'Power' });
		// An exactly straight dataset cannot identify four shifted-power parameters.
		if (solver?.ambiguous && datasetFitResults[activeSet]) {
			datasetFitResults[activeSet].status = 'The four parameters are not pinned down by this data: many combinations of A, x₀ and c fit almost equally well. Try Linear for a straight line, or use PanPhyPlot for custom fits with fixed parameters.';
			if (typeof renderFitDiagnostics === 'function') renderFitDiagnostics();
			scheduleSaveState();
		}
		plotGraph(xFit, yFit);
	} catch (error) {
		console.error("Error performing power fit:", error);
		alert("An error occurred during power fitting. Please check the console for details.");
	}
}
function updateBasicFitEquation() {
    const equations = {
        Linear: 'y = mx + c', 'Polynomial-2': 'y = ax² + bx + c',
        'Polynomial-3': 'y = ax³ + bx² + cx + d',
        Exponential: 'y = A exp(bx) + c', Power: 'y = A(x − x₀)^b + c'
    };
    document.getElementById('basic-fit-equation').textContent = equations[document.getElementById('fit-method').value] || '';
}
Object.assign(window, { fitCurve, updateBasicFitEquation });
})();
