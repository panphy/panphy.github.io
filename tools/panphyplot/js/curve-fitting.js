// Curve fitting helpers
(function() {

const CUSTOM_FIT_MAX_PARAMETERS = 5;
const CUSTOM_FIT_SAMPLE_POINTS = 300;
const CUSTOM_FIT_PENALTY = 1e6;
const CUSTOM_FIT_MULTI_START_LIMIT = 24;
const CUSTOM_FIT_HELP_URL = '/tools/panphyplot/math_ref.html';
const FIT_WORKER_URL = '/tools/panphyplot/js/fit-worker.js';
const FIT_WORKER_TIMEOUT_MS = 30000;
const CUSTOM_FIT_IDENTIFIER_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;
const CUSTOM_FIT_FORBIDDEN_NODE_TYPES = new Set([
	'AssignmentNode',
	'FunctionAssignmentNode',
	'BlockNode'
]);
const CUSTOM_FIT_FORBIDDEN_FUNCTION_NAMES = new Set(['import']);
const debouncedRefreshCustomFitDefinition = debounce(() => {
	refreshCustomFitDefinition({ preserveUserValues: true });
}, 180);
let fitWorkerInstance = null;
let fitWorkerRequestCounter = 0;
const fitWorkerPendingRequests = new Map();
let fitControlsBusyCount = 0;

function setFitControlsBusy(isBusy) {
	const fitButtons = document.querySelectorAll('.fit-button');
	fitButtons.forEach((button) => {
		button.disabled = !!isBusy;
		button.setAttribute('aria-busy', isBusy ? 'true' : 'false');
	});

	const basicFitMethod = document.getElementById('fit-method');
	if (basicFitMethod) basicFitMethod.disabled = !!isBusy;

	const advancedFitMethod = document.getElementById('advanced-fit-method');
	if (advancedFitMethod) advancedFitMethod.disabled = !!isBusy;
}

function beginFitControlsBusy() {
	fitControlsBusyCount += 1;
	if (fitControlsBusyCount === 1) {
		setFitControlsBusy(true);
	}
}

function endFitControlsBusy() {
	if (fitControlsBusyCount <= 0) return;
	fitControlsBusyCount -= 1;
	if (fitControlsBusyCount === 0) {
		setFitControlsBusy(false);
	}
}

function handleFitWorkerMessage(event) {
	const payload = event && event.data ? event.data : {};
	const requestId = Number(payload.id);
	if (!Number.isInteger(requestId)) return;

	const pending = fitWorkerPendingRequests.get(requestId);
	if (!pending) return;

	fitWorkerPendingRequests.delete(requestId);
	window.clearTimeout(pending.timeoutId);

	if (payload.ok) {
		pending.resolve(payload.result);
		return;
	}

	const workerMessage = typeof payload.error === 'string' ? payload.error : 'Worker fit failed.';
	pending.reject(new Error(workerMessage));
}

function handleFitWorkerError(error) {
	const message = error && error.message ? error.message : 'Worker runtime error.';
	const pending = Array.from(fitWorkerPendingRequests.values());
	fitWorkerPendingRequests.clear();
	pending.forEach(({ reject, timeoutId }) => {
		window.clearTimeout(timeoutId);
		reject(new Error(message));
	});

	if (fitWorkerInstance) {
		try {
			fitWorkerInstance.terminate();
		} catch {
			// ignore termination failures
		}
	}
	fitWorkerInstance = null;
}

function ensureFitWorker() {
	if (fitWorkerInstance) return fitWorkerInstance;
	if (typeof Worker === 'undefined') {
		throw new Error('Web Worker is not supported in this browser.');
	}

	fitWorkerInstance = new Worker(FIT_WORKER_URL);
	fitWorkerInstance.addEventListener('message', handleFitWorkerMessage);
	fitWorkerInstance.addEventListener('error', handleFitWorkerError);
	fitWorkerInstance.addEventListener('messageerror', handleFitWorkerError);
	return fitWorkerInstance;
}

function runFitWorkerTask(task, payload, timeoutMs = FIT_WORKER_TIMEOUT_MS) {
	return new Promise((resolve, reject) => {
		let worker = null;
		try {
			worker = ensureFitWorker();
		} catch (error) {
			reject(error);
			return;
		}

		fitWorkerRequestCounter += 1;
		const requestId = fitWorkerRequestCounter;
		const timeoutId = window.setTimeout(() => {
			fitWorkerPendingRequests.delete(requestId);
			reject(new Error(`Worker fit timed out for task "${task}".`));
		}, timeoutMs);

		fitWorkerPendingRequests.set(requestId, { resolve, reject, timeoutId });
		worker.postMessage({
			id: requestId,
			task,
			payload
		});
	});
}

async function runWorkerFitWithFallback(task, payload, fallbackSolver) {
	try {
		return await runFitWorkerTask(task, payload);
	} catch (workerError) {
		console.warn(`Falling back to main-thread ${task} fit:`, workerError);
		return fallbackSolver();
	}
}

function getCustomFitUiElements() {
	return {
		formulaInput: document.getElementById('custom-fit-formula-input'),
		formulaHelpButton: document.getElementById('custom-fit-formula-help'),
		formulaMessage: document.getElementById('custom-fit-formula-message'),
		parameterList: document.getElementById('custom-fit-parameters-list'),
		parameterEmpty: document.getElementById('custom-fit-parameters-empty'),
		equationElement: document.getElementById('custom-fit-general-equation')
	};
}

function ensureCustomFitState(index = activeSet) {
	if (!customFitStates || typeof customFitStates !== 'object') {
		customFitStates = {};
	}
	if (!customFitStates[index] || typeof customFitStates[index] !== 'object') {
		customFitStates[index] = { formula: '', initialValues: {} };
		return customFitStates[index];
	}
	if (!customFitStates[index].initialValues || typeof customFitStates[index].initialValues !== 'object') {
		customFitStates[index].initialValues = {};
	}
	if (typeof customFitStates[index].formula !== 'string') {
		customFitStates[index].formula = '';
	}
	return customFitStates[index];
}

function openCustomFitHelp() {
	window.open(CUSTOM_FIT_HELP_URL, '_blank', 'noopener,noreferrer');
}

function setCustomFitFormulaMessage(text = '', type = 'error') {
	const { formulaMessage } = getCustomFitUiElements();
	if (!formulaMessage) return;

	if (!text) {
		formulaMessage.textContent = '';
		formulaMessage.className = '';
		formulaMessage.style.display = 'none';
		return;
	}

	formulaMessage.textContent = text;
	formulaMessage.className = `is-${type}`;
	formulaMessage.style.display = 'block';
}

function setCustomFitEquationPreview(texExpression = '') {
	const { equationElement } = getCustomFitUiElements();
	if (!equationElement) return;

	if (!texExpression) {
		equationElement.textContent = '\\( y = f(x, \\theta) \\)';
		safeTypeset(equationElement);
		return;
	}

	equationElement.textContent = `\\( y = ${texExpression} \\)`;
	safeTypeset(equationElement);
}

function toCustomFitTex(node) {
	try {
		return node.toTex();
	} catch {
		return '';
	}
}

function sanitizeCustomFitFormulaText(rawFormula) {
	let trimmed = String(rawFormula || '').trim();
	if (!trimmed) return '';

	if (trimmed.startsWith('=')) {
		trimmed = trimmed.slice(1).trim();
	}

	if (/^y\s*=/i.test(trimmed)) {
		trimmed = trimmed.replace(/^y\s*=/i, '').trim();
	}

	return trimmed;
}

function hasCustomFitForbiddenConstruct(node) {
	let blocked = false;

	node.traverse((child) => {
		if (blocked) return;

		if (CUSTOM_FIT_FORBIDDEN_NODE_TYPES.has(child.type)) {
			blocked = true;
			return;
		}

		if (child.type === 'FunctionNode' && child.fn && child.fn.type === 'SymbolNode') {
			if (CUSTOM_FIT_FORBIDDEN_FUNCTION_NAMES.has(child.fn.name)) {
				blocked = true;
			}
		}
	});

	return blocked;
}

function isKnownMathIdentifier(name) {
	return typeof math === 'object' && math !== null && name in math;
}

function extractCustomFitParameters(node) {
	const parameterNames = [];
	const seen = new Set();
	let unknownFunctionName = '';
	let invalidIdentifier = '';
	let usesY = false;

	node.traverse((child, _path, parent) => {
		if (child.type !== 'SymbolNode') return;
		const symbolName = child.name;
		const isFunctionName = parent
			&& parent.type === 'FunctionNode'
			&& parent.fn === child;

		if (isFunctionName) {
			if (!isKnownMathIdentifier(symbolName) && !unknownFunctionName) {
				unknownFunctionName = symbolName;
			}
			return;
		}

		if (symbolName === 'x') return;
		if (symbolName === 'y') {
			usesY = true;
			return;
		}
		if (isKnownMathIdentifier(symbolName)) return;
		if (!CUSTOM_FIT_IDENTIFIER_REGEX.test(symbolName)) {
			if (!invalidIdentifier) invalidIdentifier = symbolName;
			return;
		}
		if (seen.has(symbolName)) return;
		seen.add(symbolName);
		parameterNames.push(symbolName);
	});

	return {
		parameterNames,
		usesY,
		unknownFunctionName,
		invalidIdentifier
	};
}

function getCustomFitDataStats() {
	const points = getFiniteDatasetPoints(activeSet);
	if (!points.length) {
		return {
			pointCount: 0,
			xMin: 0,
			xMax: 1,
			xMean: 0,
			xSpan: 1,
			yMin: 0,
			yMax: 1,
			yMean: 0,
			ySpan: 1,
			slope: 1
		};
	}

	const xValues = points.map((point) => point.x);
	const yValues = points.map((point) => point.y);
	const xMin = Math.min(...xValues);
	const xMax = Math.max(...xValues);
	const yMin = Math.min(...yValues);
	const yMax = Math.max(...yValues);
	const xSpan = Math.max(Math.abs(xMax - xMin), 1e-9);
	const ySpan = Math.max(Math.abs(yMax - yMin), 1e-9);
	const xMean = xValues.reduce((sum, value) => sum + value, 0) / xValues.length;
	const yMean = yValues.reduce((sum, value) => sum + value, 0) / yValues.length;
	let slope = 1;
	if (xValues.length >= 2) {
		try {
			slope = computeLinearFit(xValues, yValues).slope;
		} catch {
			slope = ySpan / xSpan;
		}
	}
	if (!Number.isFinite(slope) || Math.abs(slope) < 1e-9) {
		slope = ySpan / xSpan;
	}

	return {
		pointCount: points.length,
		xMin,
		xMax,
		xMean,
		xSpan,
		yMin,
		yMax,
		yMean,
		ySpan,
		slope: Number.isFinite(slope) ? slope : 1
	};
}

function getCustomFitGuessByName(parameterName, stats) {
	const key = String(parameterName || '').trim().toLowerCase();
	if (!key) return 1;

	if (/^(a|amp|amplitude)$/.test(key)) return stats.ySpan / 2;
	if (/^(c|offset|intercept|b0)$/.test(key)) return stats.yMean;
	if (/^(m|slope)$/.test(key)) return stats.slope;
	if (/^(x0|mu|center)$/.test(key)) return stats.xMean;
	if (/^(sigma|w|width)$/.test(key)) return stats.xSpan / 4;
	if (/^(k|omega|freq|frequency)$/.test(key)) return (2 * Math.PI) / stats.xSpan;
	if (/^(n|p|pow|exponent)$/.test(key)) return 1;

	return 1;
}

function formatCustomFitInputValue(value) {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) return '';
	return numeric.toFixed(3);
}

function syncCustomFitInputsToState() {
	const state = ensureCustomFitState(activeSet);
	const { parameterList } = getCustomFitUiElements();
	if (!parameterList) return;

	const inputs = parameterList.querySelectorAll('.custom-fit-parameter-input');
	inputs.forEach((input) => {
		const name = input.getAttribute('data-param');
		if (!name) return;
		state.initialValues[name] = input.value;
	});
}

function renderCustomFitParameterInputs(parameterNames, valuesMap) {
	const { parameterList, parameterEmpty } = getCustomFitUiElements();
	if (!parameterList || !parameterEmpty) return;

	parameterList.innerHTML = '';
	if (!Array.isArray(parameterNames) || parameterNames.length === 0) {
		parameterEmpty.style.display = 'block';
		return;
	}

	parameterEmpty.style.display = 'none';
	const fragment = document.createDocumentFragment();

	parameterNames.forEach((name, index) => {
		const row = document.createElement('div');
		row.className = 'advanced-fit-item custom-fit-parameter-row';

		const label = document.createElement('label');
		label.textContent = `${name}:`;
		label.setAttribute('for', `custom-fit-param-${name}`);

		const input = document.createElement('input');
		input.type = 'number';
		input.step = 'any';
		input.id = `custom-fit-param-${name}`;
		input.className = 'custom-fit-parameter-input';
		input.setAttribute('data-param', name);
		input.value = formatCustomFitInputValue(valuesMap[name]);
		input.addEventListener('input', handleCustomFitParameterInput);
		input.addEventListener('change', handleCustomFitParameterInput);

		row.appendChild(label);
		row.appendChild(input);

		if (index === 0) {
			const topRow = document.createElement('div');
			topRow.className = 'advanced-fit-top-row';
			topRow.appendChild(row);

			const resetButton = document.createElement('button');
			resetButton.type = 'button';
			resetButton.className = 'advanced-fit-reset-btn';
			resetButton.textContent = 'Reset parameter';
			resetButton.title = 'Recalculate initial parameter values from current data';
			resetButton.addEventListener('click', resetCustomFitParametersFromData);
			topRow.appendChild(resetButton);

			fragment.appendChild(topRow);
			return;
		}

		fragment.appendChild(row);
	});

	parameterList.appendChild(fragment);
}

function refreshCustomFitDefinition(options = {}) {
	const preserveUserValues = options.preserveUserValues !== false;
	const suppressSave = !!options.suppressSave;
	const showMessage = options.showMessage !== false;

	const elements = getCustomFitUiElements();
	if (!elements.formulaInput) {
		return { ok: false, reason: 'ui-unavailable' };
	}

	syncCustomFitInputsToState();
	const state = ensureCustomFitState(activeSet);
	const rawFormula = String(elements.formulaInput.value || '');
	state.formula = rawFormula;

	const normalizedFormula = sanitizeCustomFitFormulaText(rawFormula);
	if (!normalizedFormula) {
		state.initialValues = {};
		renderCustomFitParameterInputs([], {});
		setCustomFitEquationPreview('');
		setCustomFitFormulaMessage('');
		if (!suppressSave && typeof scheduleSaveState === 'function') scheduleSaveState();
		return { ok: false, reason: 'empty-formula' };
	}

	if (typeof math !== 'object' || math === null || typeof math.parse !== 'function') {
		setCustomFitFormulaMessage('Math parser unavailable. Please refresh and try again.', 'error');
		renderCustomFitParameterInputs([], {});
		setCustomFitEquationPreview('');
		return { ok: false, reason: 'math-unavailable' };
	}

	let parsedExpression = null;
	try {
		parsedExpression = math.parse(normalizedFormula);
	} catch {
		setCustomFitFormulaMessage('Invalid formula. Please check syntax.', 'error');
		renderCustomFitParameterInputs([], {});
		setCustomFitEquationPreview('');
		if (!suppressSave && typeof scheduleSaveState === 'function') scheduleSaveState();
		return { ok: false, reason: 'parse-error' };
	}

	if (hasCustomFitForbiddenConstruct(parsedExpression)) {
		setCustomFitFormulaMessage('This formula uses unsupported constructs.', 'error');
		renderCustomFitParameterInputs([], {});
		setCustomFitEquationPreview('');
		if (!suppressSave && typeof scheduleSaveState === 'function') scheduleSaveState();
		return { ok: false, reason: 'forbidden-construct' };
	}

	const extraction = extractCustomFitParameters(parsedExpression);
	if (extraction.unknownFunctionName) {
		setCustomFitFormulaMessage(`Unknown function "${extraction.unknownFunctionName}" in formula.`, 'warning');
		renderCustomFitParameterInputs([], {});
		setCustomFitEquationPreview('');
		if (!suppressSave && typeof scheduleSaveState === 'function') scheduleSaveState();
		return { ok: false, reason: 'unknown-function' };
	}
	if (extraction.invalidIdentifier) {
		setCustomFitFormulaMessage(`Invalid parameter name "${extraction.invalidIdentifier}".`, 'error');
		renderCustomFitParameterInputs([], {});
		setCustomFitEquationPreview('');
		if (!suppressSave && typeof scheduleSaveState === 'function') scheduleSaveState();
		return { ok: false, reason: 'invalid-identifier' };
	}
	if (extraction.usesY) {
		setCustomFitFormulaMessage('Use only x and parameters on the right-hand side (do not use y).', 'warning');
		renderCustomFitParameterInputs([], {});
		setCustomFitEquationPreview('');
		if (!suppressSave && typeof scheduleSaveState === 'function') scheduleSaveState();
		return { ok: false, reason: 'uses-y' };
	}
	if (extraction.parameterNames.length === 0) {
		setCustomFitFormulaMessage('No fit parameters detected. Use symbols besides x.', 'warning');
		renderCustomFitParameterInputs([], {});
		setCustomFitEquationPreview(toCustomFitTex(parsedExpression));
		if (!suppressSave && typeof scheduleSaveState === 'function') scheduleSaveState();
		return { ok: false, reason: 'no-parameters' };
	}
	if (extraction.parameterNames.length > CUSTOM_FIT_MAX_PARAMETERS) {
		setCustomFitFormulaMessage(`Too many parameters detected (${extraction.parameterNames.length}). Maximum is ${CUSTOM_FIT_MAX_PARAMETERS}.`, 'error');
		renderCustomFitParameterInputs([], {});
		setCustomFitEquationPreview(toCustomFitTex(parsedExpression));
		if (!suppressSave && typeof scheduleSaveState === 'function') scheduleSaveState();
		return { ok: false, reason: 'too-many-parameters' };
	}

	let compiledExpression = null;
	try {
		compiledExpression = parsedExpression.compile();
	} catch {
		setCustomFitFormulaMessage('Unable to compile formula. Please simplify and try again.', 'error');
		renderCustomFitParameterInputs([], {});
		setCustomFitEquationPreview('');
		if (!suppressSave && typeof scheduleSaveState === 'function') scheduleSaveState();
		return { ok: false, reason: 'compile-error' };
	}

	const stats = getCustomFitDataStats();
	const nextInitialValues = {};
	extraction.parameterNames.forEach((name) => {
		const autoGuess = getCustomFitGuessByName(name, stats);
		if (preserveUserValues) {
			const current = Number.parseFloat(state.initialValues[name]);
			if (Number.isFinite(current)) {
				nextInitialValues[name] = current;
				return;
			}
		}
		nextInitialValues[name] = Number.isFinite(autoGuess) ? autoGuess : 1;
	});

	state.initialValues = {};
	extraction.parameterNames.forEach((name) => {
		state.initialValues[name] = formatCustomFitInputValue(nextInitialValues[name]);
	});

	renderCustomFitParameterInputs(extraction.parameterNames, state.initialValues);
	setCustomFitEquationPreview(toCustomFitTex(parsedExpression));
	if (showMessage) {
		setCustomFitFormulaMessage(`Detected ${extraction.parameterNames.length} parameter(s): ${extraction.parameterNames.join(', ')}`, 'success');
	}

	if (!suppressSave && typeof scheduleSaveState === 'function') scheduleSaveState();

	return {
		ok: true,
		parsedExpression,
		compiledExpression,
		normalizedFormula,
		parameterNames: extraction.parameterNames,
		initialValues: { ...state.initialValues }
	};
}

function initializeCustomFitUI() {
	const elements = getCustomFitUiElements();
	if (!elements.formulaInput || elements.formulaInput.dataset.customFitReady === 'true') return;

	elements.formulaInput.dataset.customFitReady = 'true';
	elements.formulaInput.addEventListener('input', () => {
		debouncedRefreshCustomFitDefinition();
	});
	elements.formulaInput.addEventListener('change', () => {
		refreshCustomFitDefinition({ preserveUserValues: true });
	});

	if (elements.formulaHelpButton) {
		elements.formulaHelpButton.addEventListener('click', openCustomFitHelp);
	}
}

function loadCustomFitUiForActiveDataset() {
	const elements = getCustomFitUiElements();
	if (!elements.formulaInput) return;

	const state = ensureCustomFitState(activeSet);
	elements.formulaInput.value = state.formula || '';
	refreshCustomFitDefinition({ preserveUserValues: true, suppressSave: true, showMessage: false });
}

function resetCustomFitParametersFromData() {
	const result = refreshCustomFitDefinition({ preserveUserValues: false });
	if (!result.ok && result.reason !== 'empty-formula') {
		return;
	}
}

function handleCustomFitParameterInput(event) {
	const input = event && event.target ? event.target : null;
	if (!input) return;

	const parameterName = input.getAttribute('data-param');
	if (!parameterName) return;

	const state = ensureCustomFitState(activeSet);
	state.initialValues[parameterName] = input.value;
	if (typeof scheduleSaveState === 'function') scheduleSaveState();
}

function evaluateCustomFitExpression(compiledExpression, parameterNames, parameterValues, xValue) {
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

function normalizeCustomFitEquationSigns(latexExpression) {
	return String(latexExpression || '')
		.replace(/\+\s*-\s*/g, ' - ')
		.replace(/-\s*-\s*/g, ' + ')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

function buildCustomFitEquationLatex(parsedExpression, parameterNames, parameterValues) {
	const replacementMap = {};
	parameterNames.forEach((name, index) => {
		const numeric = Number(parameterValues[index]);
		if (!Number.isFinite(numeric)) return;
		replacementMap[name] = Number(numeric.toFixed(3));
	});

	try {
		const substituted = parsedExpression.transform((node) => {
			if (node.type === 'SymbolNode' && Object.prototype.hasOwnProperty.call(replacementMap, node.name)) {
				return math.parse(String(replacementMap[node.name]));
			}
			return node;
		});
		return `y = ${normalizeCustomFitEquationSigns(substituted.toTex())}`;
	} catch {
		const fallbackTerms = parameterNames
			.map((name, index) => `${name}=${Number(parameterValues[index]).toFixed(3)}`)
			.join(',\\;');
		return fallbackTerms
			? `y = ${normalizeCustomFitEquationSigns(fallbackTerms)}`
			: 'y = f(x)';
	}
}

function buildCustomFitInitialCandidates(baseParams) {
	const seed = baseParams.map((value) => Number(value));
	const limit = CUSTOM_FIT_MULTI_START_LIMIT;
	const seen = new Set();
	const candidates = [];

	const addCandidate = (candidate) => {
		if (!Array.isArray(candidate) || candidate.length !== seed.length) return;
		if (candidate.some((value) => !Number.isFinite(value))) return;
		const key = candidate.map((value) => Number(value).toPrecision(12)).join('|');
		if (seen.has(key)) return;
		seen.add(key);
		candidates.push(candidate);
	};

	const getStep = (value) => {
		const magnitude = Math.max(Math.abs(value), 1);
		return Math.max(1e-6, magnitude * 0.25);
	};

	const steps = seed.map(getStep);
	addCandidate(seed.slice());

	// Single-parameter perturbations around the seed.
	for (let index = 0; index < seed.length && candidates.length < limit; index++) {
		const base = seed[index];
		const step = steps[index];

		const plus = seed.slice();
		plus[index] = base + step;
		addCandidate(plus);
		if (candidates.length >= limit) break;

		const minus = seed.slice();
		minus[index] = base - step;
		addCandidate(minus);
		if (candidates.length >= limit) break;

		const flip = seed.slice();
		flip[index] = Math.abs(base) > step * 0.5 ? -base : step;
		addCandidate(flip);
	}

	// Pairwise perturbations help when parameters are correlated.
	for (let i = 0; i < seed.length && candidates.length < limit; i++) {
		for (let j = i + 1; j < seed.length && candidates.length < limit; j++) {
			const pair1 = seed.slice();
			pair1[i] = seed[i] + steps[i];
			pair1[j] = seed[j] - steps[j];
			addCandidate(pair1);
			if (candidates.length >= limit) break;

			const pair2 = seed.slice();
			pair2[i] = seed[i] - steps[i];
			pair2[j] = seed[j] + steps[j];
			addCandidate(pair2);
		}
	}

	// Global scaling catches cases where all parameters start too small/large.
	if (candidates.length < limit) {
		const halfScale = seed.map((value, index) => value === 0 ? steps[index] : value * 0.5);
		addCandidate(halfScale);
	}
	if (candidates.length < limit) {
		const doubleScale = seed.map((value, index) => value === 0 ? -steps[index] : value * 2);
		addCandidate(doubleScale);
	}

	// Final broad nudges if we still have room.
	if (candidates.length < limit) {
		addCandidate(seed.map((value, index) => value + steps[index]));
	}
	if (candidates.length < limit) {
		addCandidate(seed.map((value, index) => value - steps[index]));
	}

	return candidates.slice(0, limit);
}

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


function updateBasicFitEquation() {
	const fitMethod = document.getElementById('fit-method').value;
	let equation = '';

	if (fitMethod === 'Linear') {
		equation = 'y = mx + c';
	} else if (fitMethod.startsWith('Polynomial')) {
		const degree = parseInt(fitMethod.split('-')[1]);
		let terms = [];
		for (let i = degree; i >= 0; i--) {
			terms.push(`a_${i}x^{${i}}`);
		}
		equation = 'y = ' + terms.join(' + ');
	} else if (fitMethod === 'Exponential') {
		equation = 'y = A e^{b(x-x_0)} + c';
	} else if (fitMethod === 'Power') {
		equation = 'y = A (x-x_0)^{b} + c';
	}

	const equationElement = document.getElementById('basic-fit-equation');
	if (equationElement) {
		equationElement.textContent = `\\( ${equation} \\)`;
		safeTypeset(equationElement);
	}
}


function changeAdvancedFitMethod() {
	const selectedMethod = document.getElementById('advanced-fit-method').value;
	const methods = ['Sinusoidal', 'Gaussian'];

	methods.forEach(method => {
		const section = document.getElementById(`${method}-parameters`);
		if (method === selectedMethod) {
			section.classList.add('active');
		} else {
			section.classList.remove('active');
		}
	});

	updateAdvancedFitEquation(selectedMethod);
	setInitialParameters(selectedMethod);
}


function updateAdvancedFitEquation(selectedMethod) {
	let equation = '';
	if (selectedMethod === 'Sinusoidal') {
		equation = 'y = A e^{bx} \\sin(kx - \\phi) + c';
	} else if (selectedMethod === 'Gaussian') {
		equation = 'y = A e^{-\\frac{(x - \\mu)^2}{2 \\sigma^2}} + c';
	}

	const equationElement = document.getElementById('advanced-fit-general-equation');
	if (equationElement) {
		equationElement.textContent = `\\(${equation}\\)`;
		safeTypeset(equationElement);
	}
}


function calculateFWHM(x, y, maxY) {
	const halfMax = maxY / 2;
	let left = null,
		right = null;

	// Sort data by x (use only finite x and y)
	const sortedData = getFiniteDatasetPoints(activeSet)
		.sort((a, b) => a.x - b.x);

	if (sortedData.length < 2) {
		return 1; // fallback
	}

	// Find left crossing
	for (let i = 1; i < sortedData.length; i++) {
		if (sortedData[i - 1].y < halfMax && sortedData[i].y >= halfMax) {
			const x1 = sortedData[i - 1].x;
			const y1 = sortedData[i - 1].y;
			const x2 = sortedData[i].x;
			const y2 = sortedData[i].y;
			left = x1 + (halfMax - y1) * (x2 - x1) / (y2 - y1);
			break;
		}
	}

	// Find right crossing
	for (let i = sortedData.length - 1; i > 0; i--) {
		if (sortedData[i - 1].y < halfMax && sortedData[i].y >= halfMax) {
			const x1 = sortedData[i - 1].x;
			const y1 = sortedData[i - 1].y;
			const x2 = sortedData[i].x;
			const y2 = sortedData[i].y;
			right = x1 + (halfMax - y1) * (x2 - x1) / (y2 - y1);
			break;
		}
	}

	if (left !== null && right !== null && right > left) {
		return right - left;
	} else {
		const xs = sortedData.map(p => p.x);
		const minX = Math.min(...xs);
		const maxX = Math.max(...xs);
		return (maxX - minX) / 4;
	}
}


function applyDefaultAdvancedFitParameters(method) {
	if (method === 'Gaussian') {
		document.getElementById('initial-A-gaussian').value = '1';
		document.getElementById('initial-mu').value = '0';
		document.getElementById('initial-sigma').value = '1';
		document.getElementById('initial-c-gaussian').value = '0';
		return;
	}

	if (method === 'Sinusoidal') {
		document.getElementById('initial-A').value = '1';
		document.getElementById('initial-b').value = '0';
		document.getElementById('initial-k').value = '1';
		document.getElementById('initial-phi').value = '0';
		document.getElementById('initial-c').value = '0';
	}
}

function resetAdvancedFitParameters(method = getCurrentAdvancedFitMethod()) {
	if (!method) return;

	applyDefaultAdvancedFitParameters(method);
	setInitialParameters(method);
}

function setInitialParameters(method) {
	if (!method) return;
	if (getDatasetPoints(activeSet).length === 0) return;

	// Use only finite points (avoid null/blank cells corrupting guesses)
	const pts = getFiniteDatasetPoints(activeSet);
	if (pts.length < 4) return;

	const x = pts.map(p => p.x);
	const y = pts.map(p => p.y);

	const meanX = x.reduce((sum, val) => sum + val, 0) / x.length;
	const meanY = y.reduce((sum, val) => sum + val, 0) / y.length;

	const maxY = Math.max(...y);
	const minY = Math.min(...y);

	// For Gaussian
	const FWHM = calculateFWHM(x, y, maxY);

	if (method === 'Gaussian') {
		document.getElementById('initial-A-gaussian').value = maxY.toFixed(3);
		document.getElementById('initial-mu').value = meanX.toFixed(3);
		document.getElementById('initial-sigma').value = (FWHM / (2 * Math.sqrt(2 * Math.log(2))) || 1).toFixed(3);
		document.getElementById('initial-c-gaussian').value = '0';
		return;
	}

	if (method === 'Sinusoidal') {
		// Heuristic guesses that work well for ordinary (non-damped) sinusoids:
		//   y ≈ A * sin(kx - phi) + c   (with b ≈ 0)
		// Note: Our model includes exp(bx); setting b=0 is the safe default.
		const Aguess = (maxY - minY) / 2;
		const cguess = meanY;
		const bguess = 0;

		let kguess = estimateKFromData();
		if (kguess === null || !isFinite(kguess) || kguess <= 0) {
			const span = Math.max(...x) - Math.min(...x);
			// fallback: assume ~1 cycle across the span
			kguess = span > 0 ? (2 * Math.PI) / span : 1;
		}

		// Compute initial phase from the Fourier component at estimated k
		// For y - c = A*sin(kx - phi), projecting onto sin(kx) and cos(kx):
		//   sumSin ∝ A*cos(phi), sumCos ∝ -A*sin(phi)
		//   => phi = atan2(-sumCos, sumSin)
		let sumSin = 0, sumCos = 0;
		for (let i = 0; i < x.length; i++) {
			const val = y[i] - cguess;
			sumSin += val * Math.sin(kguess * x[i]);
			sumCos += val * Math.cos(kguess * x[i]);
		}
		let phiguess = Math.atan2(-sumCos, sumSin);
		if (!isFinite(phiguess)) phiguess = 0;

		document.getElementById('initial-A').value = (isFinite(Aguess) && Aguess !== 0 ? Aguess : 1).toFixed(3);
		document.getElementById('initial-b').value = bguess.toFixed(3);
		document.getElementById('initial-k').value = kguess.toFixed(3);
		document.getElementById('initial-phi').value = phiguess.toFixed(3);
		document.getElementById('initial-c').value = cguess.toFixed(3);
	}
}


function getCurrentAdvancedFitMethod() {
	return document.getElementById('advanced-fit-method').value;
}


function computeLinearFit(x, y) {
	try {
		const xMean = x.reduce((sum, val) => sum + val, 0) / x.length;
		const yMean = y.reduce((sum, val) => sum + val, 0) / y.length;

		let numerator = 0,
			denominator = 0;
		for (let i = 0; i < x.length; i++) {
			numerator += (x[i] - xMean) * (y[i] - yMean);
			denominator += (x[i] - xMean) ** 2;
		}

		// If all x values are identical, fall back to a constant model.
		if (Math.abs(denominator) < 1e-15) {
			return { slope: 0, intercept: yMean };
		}

		const slope = numerator / denominator;
		const intercept = yMean - slope * xMean;

		return { slope, intercept };
	} catch (error) {
		console.error('Error computing linear fit:', error);
		throw error;
	}
}


function computeRSq(xArr, yArr, f) {
	try {
		if (!Array.isArray(xArr) || !Array.isArray(yArr) || xArr.length === 0 || xArr.length !== yArr.length) {
			return -Infinity;
		}
		const yhat = xArr.map(f);
		const meanY = yArr.reduce((s, v) => s + v, 0) / yArr.length;
		let ssTot = 0,
			ssRes = 0;
		for (let i = 0; i < yArr.length; i++) {
			const ri = yArr[i] - yhat[i];
			ssRes += ri * ri;
			const di = yArr[i] - meanY;
			ssTot += di * di;
		}
		const zeroTolerance = 1e-12;
		if (Math.abs(ssTot) < zeroTolerance) {
			return Math.abs(ssRes) < zeroTolerance ? 1 : 0;
		}
		const rSquared = 1 - (ssRes / ssTot);
		return Number.isFinite(rSquared) ? rSquared : -Infinity;
	} catch (e) {
		console.error('R² error:', e);
		return -Infinity;
	}
}


function formatExpEquation(A, b, c, useShift = false, x0 = 0) {
	const Aabs = Math.abs(A).toFixed(3);
	const bStr = Number(b).toFixed(3);
	const base = useShift ?
		`y = ${A >= 0 ? '' : '-'}${Aabs} e^{${bStr}(x ${x0 >= 0 ? '- ' + x0.toFixed(3) : '+ ' + Math.abs(x0).toFixed(3)})}` :
		`y = ${A >= 0 ? '' : '-'}${Aabs} e^{${bStr} x}`;
	const cNum = Number(c);
	if (!isFinite(cNum) || Math.abs(cNum) < 1e-12) return base;
	return cNum > 0 ? `${base} + ${cNum.toFixed(3)}` : `${base} - ${Math.abs(cNum).toFixed(3)}`;
}


function exponentialFit_cAbx(raw) {
	const data = raw.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
	if (data.length < 3) return null;
	const x = data.map(p => p.x);
	const y = data.map(p => p.y);
	const yMin = Math.min(...y);
	const yMax = Math.max(...y);
	const yRange = (yMax - yMin) || 1;

	// Residuals and Jacobian for model: y = c + A * exp(b * x)
	// params = [A, b, c]
	function fitResiduals([A, b, c], pts) {
		return pts.map(({ x, y }) => (c + A * Math.exp(b * x)) - y);
	}

	function fitJacobian([A, b, c], pts) {
		return pts.map(({ x }) => {
			const e = Math.exp(b * x);
			return [e, A * x * e, 1];
		});
	}

	// Multi-start: try several c candidates covering decay and inverted cases.
	// For y = c + A*exp(bx), the asymptote c is where y flattens out —
	// near min(y) for standard decay/growth, near max(y) for inverted (A<0).
	const cCandidates = [
		yMin - 0.1 * yRange,
		yMin,
		(yMin + yMax) / 2,
		yMax,
		yMax + 0.1 * yRange,
	];

	let bestParams = null;
	let bestCost = Infinity;

	for (const c0 of cCandidates) {
		// Estimate A0, b0 via log-linearization of y - c0
		const z = y.map(v => v - c0);
		const posCount = z.filter(v => v > 1e-12).length;
		const negCount = z.filter(v => v < -1e-12).length;
		const signZ = posCount >= negCount ? 1 : -1;

		const X = [], L = [];
		for (let i = 0; i < z.length; i++) {
			if (signZ * z[i] > 1e-12) {
				X.push(x[i]);
				L.push(Math.log(signZ * z[i]));
			}
		}
		let A0 = signZ, b0 = 0;
		if (X.length >= 2) {
			const { slope, intercept } = computeLinearFit(X, L);
			b0 = slope;
			A0 = signZ * Math.exp(intercept);
		}

		const { params, cost } = levenbergMarquardt(
			data, [A0, b0, c0],
			fitResiduals, fitJacobian,
			{ maxIterations: 200 }
		);

		if (cost < bestCost) {
			bestCost = cost;
			bestParams = params;
		}
	}

	if (!bestParams) return null;

	const [A, b, c] = bestParams;
	const xMin = Math.min(...x),
		xMax = Math.max(...x);
	const xFit = Array.from({ length: 100 }, (_, i) => xMin + i * (xMax - xMin) / 99);
	const fitFn = xi => c + A * Math.exp(b * xi);
	const yFit = xFit.map(fitFn);
	const r2 = computeRSq(x, y, fitFn);
	const eq = formatExpEquation(A, b, c, false);
	return { ok: true, model: 'cAbx', r2, params: { A, b, c }, xFit, yFit, fitFn, eq };
}


function exponentialFit_logLinear(raw) {
	const data = raw.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
	if (data.length < 3) return null;
	const x = data.map(p => p.x);
	const y = data.map(p => p.y);

	const yMin = Math.min(...y);
	const yMax = Math.max(...y);
	const yRange = (yMax - yMin) || 1;
	const xMin = Math.min(...x),
		xMax = Math.max(...x);

	// Grid-search over c and x0 candidates for the best log-linear initial guess.
	// c is now a free parameter: try values below, at, and slightly above yMin.
	const cCandidates = [
		yMin - 0.5 * yRange,
		yMin - 0.1 * yRange,
		yMin,
		yMin + 0.1 * yRange,
	];

	const x0Steps = 50;
	const x0Cands = Array.from({ length: x0Steps }, (_, i) => xMin + i * (xMax - xMin) / (x0Steps - 1));

	let best = { sse: Infinity, A: 1, b: 0, x0: 0, c: 0 };

	for (const c of cCandidates) {
		for (const x0 of x0Cands) {
			const X = [], L = [];
			for (let i = 0; i < y.length; i++) {
				const val = y[i] - c;
				if (val > 1e-12) {
					X.push(x[i] - x0);
					L.push(Math.log(val));
				}
			}
			if (X.length < 2) continue;

			const { slope: b, intercept: lnA } = computeLinearFit(X, L);
			const A = Math.exp(lnA);

			// Rank by data-space SSE (not log-space MSE) to avoid bias
			let sse = 0;
			for (let i = 0; i < x.length; i++) {
				const pred = A * Math.exp(b * (x[i] - x0)) + c;
				const r = y[i] - pred;
				sse += r * r;
			}
			if (sse < best.sse) best = { sse, A, b, x0, c };
		}
	}

	if (!isFinite(best.sse)) return null;

	// Refine the best log-linear guess with LM on all 4 parameters [A, b, x0, c]
	function fitResiduals([A, b, x0, c], pts) {
		return pts.map(({ x, y }) => (A * Math.exp(b * (x - x0)) + c) - y);
	}

	function fitJacobian([A, b, x0, c], pts) {
		return pts.map(({ x }) => {
			const e = Math.exp(b * (x - x0));
			return [e, A * (x - x0) * e, -A * b * e, 1];
		});
	}

	const { params } = levenbergMarquardt(
		data, [best.A, best.b, best.x0, best.c],
		fitResiduals, fitJacobian,
		{ maxIterations: 200 }
	);

	const [A, b, x0, c] = params;
	const fitFn = xi => A * Math.exp(b * (xi - x0)) + c;
	const xFit = Array.from({ length: 100 }, (_, i) => xMin + i * (xMax - xMin) / 99);
	const yFit = xFit.map(fitFn);
	const r2 = computeRSq(x, y, fitFn);
	const eq = formatExpEquation(A, b, c, true, x0);
	return { ok: true, model: 'shifted', r2, params: { A, b, x0, c }, xFit, yFit, fitFn, eq };
}


function updateResults(equation, x, y, fitFunction, datasetIndex = activeSet) {
	try {
		const rSquared = computeRSq(x, y, fitFunction);
		const rSquaredDisplay = Number.isFinite(rSquared) ? rSquared.toFixed(5) : 'N/A';

		if (datasetIndex === activeSet) {
			// Update the fitting result UI. ui.js owns the interactive copy affordance.
			if (typeof renderFittingResult === 'function') {
				renderFittingResult(equation, rSquaredDisplay);
			} else {
				const fitEquationElement = document.getElementById('fit-equation');
				const rSquaredElement = document.getElementById('r-squared-container');
				if (fitEquationElement) {
					fitEquationElement.innerHTML = `\\(${equation}\\)`;
					fitEquationElement.style.display = 'block';
				}
				if (rSquaredElement) {
					rSquaredElement.innerHTML = `\\( R^2 = ${rSquaredDisplay} \\)`;
					rSquaredElement.style.display = 'block';
				}
				safeTypeset(fitEquationElement);
				safeTypeset(rSquaredElement);
			}
		}

		// Store this result for the target dataset.
		datasetFitResults[datasetIndex] = {
			equation: equation,
			rSquared: rSquaredDisplay
		};

		if (typeof scheduleSaveState === 'function') {
			scheduleSaveState();
		}
	} catch (error) {
		console.error('Error updating results:', error);
	}
}


function polyfit(x, y, degree) {
	try {
		const X = x.map(xi => Array.from({ length: degree + 1 }, (_, j) => xi ** (degree - j)));
		const Xt = math.transpose(X);
		const XtX = math.multiply(Xt, X);
		const XtY = math.multiply(Xt, y);
		const coefficients = math.lusolve(XtX, XtY).flat();
		return coefficients;
	} catch (error) {
		console.error('Error performing polynomial fit:', error);
		throw error;
	}
}


function polyEval(coefficients, x) {
	try {
		return coefficients.reduce((sum, coef, i) => sum + coef * Math.pow(x, coefficients.length - i - 1), 0);
	} catch (error) {
		console.error('Error evaluating polynomial:', error);
		throw error;
	}
}


async function fitAdvancedCurve() {
	if (typeof updateData === 'function') {
		updateData();
	}
	if (rawData[activeSet].length < 4) { // Increased to 4 for more complex fits
		alert('Please enter at least four data points for advanced fitting.');
		return;
	}

	const fitMethod = document.getElementById('advanced-fit-method').value;

	if (fitMethod === 'Sinusoidal') {
		await performSinusoidalFit();
	} else if (fitMethod === 'Gaussian') {
		await performGaussianFit();
	}
}

function solveCustomFitMainThread(data, starts, residualFn, jacobianFn) {
	let bestParams = null;
	let bestCost = Infinity;

	for (const start of starts) {
		const result = levenbergMarquardt(
			data,
			start,
			residualFn,
			jacobianFn,
			{ maxIterations: 350, tolerance: 1e-10 }
		);
		if (!Number.isFinite(result.cost)) continue;
		if (result.cost < bestCost) {
			bestCost = result.cost;
			bestParams = result.params;
		}
	}

	return { params: bestParams, cost: bestCost };
}

async function fitCustomCurve() {
	try {
		if (typeof updateData === 'function') {
			updateData();
		}
		const targetDatasetIndex = activeSet;
		const analysis = refreshCustomFitDefinition({ preserveUserValues: true });
		if (!analysis.ok) {
			alert('Please enter a valid custom equation before fitting.');
			return;
		}

		const data = getFiniteDatasetPoints(activeSet);
		const minimumPoints = Math.max(4, analysis.parameterNames.length + 1);
		if (data.length < minimumPoints) {
			alert(`Please enter at least ${minimumPoints} valid data points for this custom fit.`);
			return;
		}

		const initialParams = [];
		for (let index = 0; index < analysis.parameterNames.length; index++) {
			const parameterName = analysis.parameterNames[index];
			const rawValue = analysis.initialValues[parameterName];
			const numericValue = Number.parseFloat(rawValue);
			if (!Number.isFinite(numericValue)) {
				alert(`Please enter a valid initial value for parameter "${parameterName}".`);
				return;
			}
			initialParams.push(numericValue);
		}

		const starts = buildCustomFitInitialCandidates(initialParams);
		const residualFn = (params, points) => {
			return points.map(({ x, y }) => {
				const yPred = evaluateCustomFitExpression(analysis.compiledExpression, analysis.parameterNames, params, x);
				if (!Number.isFinite(yPred)) return CUSTOM_FIT_PENALTY;
				return yPred - y;
			});
		};
		const jacobianFn = (params, points) => {
			const cols = analysis.parameterNames.length;
			return points.map(({ x }) => {
				const row = new Array(cols).fill(0);
				for (let col = 0; col < cols; col++) {
					const base = params[col];
					const delta = Math.max(1e-6, Math.abs(base) * 1e-6);
					const plus = params.slice();
					const minus = params.slice();
					plus[col] = base + delta;
					minus[col] = base - delta;

					const fPlus = evaluateCustomFitExpression(analysis.compiledExpression, analysis.parameterNames, plus, x);
					const fMinus = evaluateCustomFitExpression(analysis.compiledExpression, analysis.parameterNames, minus, x);

					if (Number.isFinite(fPlus) && Number.isFinite(fMinus)) {
						row[col] = (fPlus - fMinus) / (2 * delta);
					}
				}
				return row;
			});
		};

		let solved = null;
		beginFitControlsBusy();
		try {
			solved = await runWorkerFitWithFallback(
				'custom',
				{
					data,
					formula: analysis.normalizedFormula,
					parameterNames: analysis.parameterNames,
					starts,
					maxIterations: 350,
					tolerance: 1e-10
				},
				() => solveCustomFitMainThread(data, starts, residualFn, jacobianFn)
			);
		} finally {
			endFitControlsBusy();
		}

		const bestParams = solved && Array.isArray(solved.params) ? solved.params : null;
		if (!bestParams || !Array.isArray(bestParams)) {
			alert('Custom fit could not converge on this dataset.');
			return;
		}
		if (!Number.isInteger(targetDatasetIndex) || targetDatasetIndex < 0 || targetDatasetIndex >= rawData.length) {
			return;
		}

		const xValues = data.map((point) => point.x);
		const yValues = data.map((point) => point.y);
		const xMin = Math.min(...xValues);
		const xMax = Math.max(...xValues);
		const xRange = xMax - xMin;
		const xFit = Array.from({ length: CUSTOM_FIT_SAMPLE_POINTS }, (_, i) => {
			if (Math.abs(xRange) < 1e-12) return xMin;
			return xMin + (i * xRange) / (CUSTOM_FIT_SAMPLE_POINTS - 1);
		});
		const fitFunction = (xInput) => {
			return evaluateCustomFitExpression(analysis.compiledExpression, analysis.parameterNames, bestParams, xInput);
		};
		const yFit = xFit.map(fitFunction);
		const equation = buildCustomFitEquationLatex(analysis.parsedExpression, analysis.parameterNames, bestParams);

		fittedCurves[targetDatasetIndex] = { x: xFit, y: yFit, equation };
		updateResults(equation, xValues, yValues, fitFunction, targetDatasetIndex);
		if (targetDatasetIndex === activeSet) {
			plotGraph(xFit, yFit);
		}

		const state = ensureCustomFitState(targetDatasetIndex);
		state.initialValues = {};
		analysis.parameterNames.forEach((name, index) => {
			state.initialValues[name] = formatCustomFitInputValue(bestParams[index]);
		});
		if (targetDatasetIndex === activeSet) {
			renderCustomFitParameterInputs(analysis.parameterNames, state.initialValues);
			setCustomFitFormulaMessage('Custom fit completed.', 'success');
		}
		if (typeof scheduleSaveState === 'function') scheduleSaveState();
	} catch (error) {
		console.error('Error performing custom fit:', error);
		alert('An error occurred during custom fitting. Please check the console for details.');
	}
}


function performLinearFit(x, y) {
	try {
		const { slope, intercept } = computeLinearFit(x, y);

		const xFit = [Math.min(...x), Math.max(...x)];
		const yFit = xFit.map(xi => slope * xi + intercept);

		const fitFunction = xi => slope * xi + intercept;

		let equation = `y = ${slope.toFixed(3)}x + ${intercept.toFixed(3)}`;
		if (intercept < 0) {
			equation = `y = ${slope.toFixed(3)}x - ${Math.abs(intercept).toFixed(3)}`;
		}

		// Store the fitted curve for this dataset.
		fittedCurves[activeSet] = { x: xFit, y: yFit, equation: equation };

		updateResults(equation, x, y, fitFunction);
		plotGraph(xFit, yFit);
	} catch (error) {
		console.error('Error performing linear fit:', error);
		alert('An error occurred during linear fitting. Please check the console for details.');
	}
}


function performPolynomialFit(x, y, degree) {
	try {
		const coefficients = polyfit(x, y, degree);
		const xFit = Array.from({ length: 100 }, (_, i) => Math.min(...x) + i * (Math.max(...x) - Math.min(...x)) / 99);
		const yFit = xFit.map(xi => polyEval(coefficients, xi));

		const fitFunction = xi => polyEval(coefficients, xi);

		let equation = 'y = ';
		coefficients.forEach((c, i) => {
			const power = degree - i;
			if (c === 0) return;

			const absC = Math.abs(c).toFixed(3);
			const sign = c >= 0 ? (i === 0 ? '' : ' + ') : (i === 0 ? '-' : ' - ');

			let term = '';
			if (power === 0) {
				term = `${absC}`;
			} else if (power === 1) {
				term = `${absC}x`;
			} else {
				term = `${absC}x^{${power}}`;
			}

			equation += `${sign}${term}`;
		});

		// Store the fitted curve for this dataset.
		fittedCurves[activeSet] = { x: xFit, y: yFit, equation: equation };

		updateResults(equation, x, y, fitFunction);
		plotGraph(xFit, yFit);
	} catch (error) {
		console.error('Error performing polynomial fit:', error);
		alert('An error occurred during polynomial fitting. Please check the console for details.');
	}
}


function performExponentialFit() {
	try {
		const data = getFiniteDatasetPoints(activeSet);
		if (data.length < 3) {
			alert('Exponential fit requires at least three valid data points.');
			return;
		}

		// Try both
		const cand1 = exponentialFit_cAbx(data);
		const cand2 = exponentialFit_logLinear(data);

		// choose by R², fallback gracefully
		let best = null;
		const rankedRSq = (candidate) => Number.isFinite(candidate?.r2) ? candidate.r2 : -Infinity;
		if (cand1 && cand2) best = (rankedRSq(cand1) >= rankedRSq(cand2)) ? cand1 : cand2;
		else best = cand1 || cand2;

		if (!best) {
			alert('Exponential fit could not converge on this dataset.');
			return;
		}

		// Store & render
		fittedCurves[activeSet] = { x: best.xFit, y: best.yFit, equation: best.eq };
		const xAll = data.map(p => p.x);
		const yAll = data.map(p => p.y);
		updateResults(best.eq, xAll, yAll, best.fitFn);
		plotGraph(best.xFit, best.yFit);

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

		// 2. Generate multiple initial guesses for x0 and c
		//    We'll sample around (xMin - a bit, yMin - a bit) and also near medians.
		const xMin = Math.min(...xValues);
		const xMed = median(xValues);
		const yMin = Math.min(...yValues);
		const yMed = median(yValues);

		const guessPairs = [
			// Minimal offset guess
			[xMin - 1e-3, yMin - 1e-3],
			// Slightly bigger offset
			[xMed - 0.01, yMed - 0.01],
			// Another guess further
			[xMin - 0.1, yMin - 0.1],
		];

		let bestParams = null;
		let bestCost = Infinity;

		// 3. Try each (x0, c) guess
		for (const [x0Guess, cGuess] of guessPairs) {
			// 3a. Shift x0 or c if needed so that all (x - x0) > 0 and (y - c) > 0 for the log approach
			let shiftedX0 = x0Guess;
			let shiftedC = cGuess;

			// Ensure (x - x0) > 0 for all x if we want to do an initial log transform
			// (Avoid potentially huge while-loops for large domains.)
			const minX = Math.min(...xValues);
			if (!(minX - shiftedX0 > 0)) shiftedX0 = minX - 1e-6;
			let z = xValues.map(x => x - shiftedX0);

			// Ensure (y - c) > 0 for initial log transform
			const minY = Math.min(...yValues);
			if (!(minY - shiftedC > 0)) shiftedC = minY - 1e-6;
			let w = yValues.map(y => y - shiftedC);

			// 3b. Compute initial A, b via linear regression on log-log
			const lnZ = z.map(zi => Math.log(zi));
			const lnW = w.map(wi => Math.log(wi));
			const { slope: bInitial, intercept: lnAInitial } = computeLinearFit(lnZ, lnW);
			const AInitial = Math.exp(lnAInitial);

			const initialParams = [AInitial, bInitial, shiftedX0, shiftedC];

			// 3c. Run LM from this initial guess
			const { params, cost } = levenbergMarquardt(validData, initialParams, computeResiduals, computeJacobian);

			// 3d. Check if it's the best so far
			if (cost < bestCost) {
				bestCost = cost;
				bestParams = params;
			}
		}

		// 4. Use the best parameters found
		if (!bestParams) {
			alert("Unable to find a suitable power-law fit.");
			return;
		}
		const [A, b, x0, c] = bestParams;

		// 5. Generate fitted curve
		const xMinFit = Math.min(...xValues);
		const xMaxFit = Math.max(...xValues);
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
			` - ${x0.toFixed(3)}` // Example: (x - 2.500)
			:
			` + ${Math.abs(x0).toFixed(3)}`; // Example: (x + 0.004) if x0 is -0.004

		const cSign = (c >= 0) ?
			` + ${c.toFixed(3)}` :
			` - ${Math.abs(c).toFixed(3)}`;

		// 7.2. Construct the equation string
		const equation = `y = ${A.toFixed(3)}(x${x0Sign})^{${b.toFixed(3)}}${cSign}`;

		// 8. Store the fitted curve
		fittedCurves[activeSet] = {
			x: xFit,
			y: yFit,
			equation: equation
		};

		// 9. Update results and plot
		updateResults(equation, xValues, yValues, fitFunction);
		plotGraph(xFit, yFit);
	} catch (error) {
		console.error("Error performing power fit:", error);
		alert("An error occurred during power fitting. Please check the console for details.");
	}
}


function levenbergMarquardt(data, initialParams, residualFn, jacobianFn, options = {}) {
	// Generic Levenberg-Marquardt solver.
	// residualFn(params, data) -> Array<number> of residuals (y_pred - y)
	// jacobianFn(params, data) -> Array<Array<number>> Jacobian rows matching residuals
	const maxIterations = Number.isFinite(options.maxIterations) ? options.maxIterations : 200;
	const tolerance = Number.isFinite(options.tolerance) ? options.tolerance : 1e-8;

	let params = initialParams.slice();
	let lambda = Number.isFinite(options.initialLambda) ? options.initialLambda : 1e-3; // initial damping
	let nu = 2; // factor to adjust lambda
	let prevCost = Infinity;

	let bestParams = params.slice();
	let bestCost = Infinity;

	const PENALTY = 1e6;

	function safeResiduals(p) {
		let r;
		try {
			r = residualFn(p, data);
		} catch {
			r = null;
		}
		if (!Array.isArray(r) || r.length !== data.length) {
			r = new Array(data.length).fill(PENALTY);
		}
		for (let i = 0; i < r.length; i++) {
			if (!Number.isFinite(r[i])) r[i] = PENALTY;
		}
		return r;
	}

	function safeJacobian(p, nParams) {
		let J;
		try {
			J = jacobianFn(p, data);
		} catch {
			J = null;
		}
		if (!Array.isArray(J) || J.length !== data.length) {
			J = new Array(data.length).fill(null).map(() => new Array(nParams).fill(0));
		}
		for (let i = 0; i < J.length; i++) {
			const row = Array.isArray(J[i]) ? J[i] : [];
			if (row.length !== nParams) {
				J[i] = new Array(nParams).fill(0);
				continue;
			}
			for (let j = 0; j < nParams; j++) {
				if (!Number.isFinite(J[i][j])) J[i][j] = 0;
			}
		}
		return J;
	}

	function costFromResiduals(r) {
		let s = 0;
		for (let i = 0; i < r.length; i++) {
			const v = r[i];
			s += v * v;
			if (!Number.isFinite(s)) return Number.MAX_VALUE;
		}
		return s;
	}

	for (let iter = 0; iter < maxIterations; iter++) {
		// 1. Compute residuals & cost
		const residuals = safeResiduals(params);
		const cost = costFromResiduals(residuals);

		// 2. Convergence check
		if (Math.abs(prevCost - cost) < tolerance) {
			return { params, cost };
		}
		prevCost = cost;

		// 3. Jacobian
		const J = safeJacobian(params, params.length);
		const JT = transpose(J);
		const JTJ = multiply(JT, J);
		const JTr = multiplyMatrixVector(JT, residuals);

		// 4. Build damped matrix
		const n = JTJ.length;
		let A_lm = new Array(n).fill(null).map(() => new Array(n).fill(0));
		for (let i = 0; i < n; i++) {
			for (let j = 0; j < n; j++) {
				A_lm[i][j] = JTJ[i][j];
				if (i === j) {
					const diag = (Number.isFinite(A_lm[i][j]) && Math.abs(A_lm[i][j]) > 0) ? Math.abs(A_lm[i][j]) : 1;
					A_lm[i][j] += lambda * diag;
				}
			}
		}

		// 5. Solve for delta
		let delta;
		try {
			const negJTr = JTr.map(v => -v);
			delta = solve(A_lm, negJTr);
		} catch {
			lambda *= nu;
			continue;
		}

		if (!Array.isArray(delta) || delta.length !== params.length || delta.some(v => !Number.isFinite(v))) {
			lambda *= nu;
			continue;
		}

		// 6. Check new parameters
		const newParams = params.map((p, i) => p + delta[i]);
		const newRes = safeResiduals(newParams);
		const newCost = costFromResiduals(newRes);

		if (newCost < cost) {
			params = newParams;
			if (newCost < bestCost) {
				bestCost = newCost;
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


function computeResiduals(params, data) {
	const [A, b, x0, c] = params;
	return data.map(({ x, y }) => {
		const term = x - x0;
		if (term <= 0 && !Number.isInteger(b)) {
			// For non-integer b, negative base is invalid -> large penalty
			return 1e6;
		}
		let yPred;
		try {
			yPred = A * Math.pow(term, b) + c;
			if (!Number.isFinite(yPred)) {
				return 1e6;
			}
		} catch {
			return 1e6;
		}
		return yPred - y;
	});
}


function computeJacobian(params, data) {
	const [A, b, x0, c] = params;
	return data.map(({ x, y }) => {
		const term = x - x0;
		// Default partial derivatives
		let dA = 0,
			db = 0,
			dx0 = 0,
			dc = 0;

		if (term <= 0 && !Number.isInteger(b)) {
			// invalid region -> residual ~ 1e6 w.r.t. everything
			// For continuity, let's set derivatives near zero (or 0.0)
			return [0, 0, 0, 0];
		}

		// yPred = A * term^b + c
		// residual = yPred - y
		// => partial residual / partial param = partial yPred / partial param
		// partial wrt A = term^b
		// partial wrt b = A * term^b * ln(term)
		// partial wrt x0 = -A * b * term^(b-1)
		// partial wrt c = 1

		try {
			// term^b
			const basePow = Math.pow(term, b);
			const lnTerm = Math.log(term);

			dA = basePow;
			db = A * basePow * lnTerm;
			dx0 = -A * b * Math.pow(term, b - 1);
			dc = 1;

			// If any are NaN or infinite, set to 0
			if (!Number.isFinite(dA)) dA = 0;
			if (!Number.isFinite(db)) db = 0;
			if (!Number.isFinite(dx0)) dx0 = 0;
		} catch {
			// In case of domain errors
			dA = db = dx0 = dc = 0;
		}

		return [dA, db, dx0, dc];
	});
}


function transpose(matrix) {
	return matrix[0].map((_, i) => matrix.map(row => row[i]));
}


function multiply(a, b) {
	// matrix x matrix
	const m = a.length;
	const n = b[0].length;
	const result = new Array(m).fill(null).map(() => new Array(n).fill(0));
	for (let i = 0; i < m; i++) {
		for (let j = 0; j < n; j++) {
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
	return matrix.map(row => {
		let sum = 0;
		for (let i = 0; i < row.length; i++) {
			sum += row[i] * vector[i];
		}
		return sum;
	});
}


function solve(matrix, vector) {
	const n = matrix.length;
	const augmented = matrix.map((row, i) => row.concat([vector[i]]));

	for (let i = 0; i < n; i++) {
		// Find pivot
		let maxRow = i;
		for (let r = i + 1; r < n; r++) {
			if (Math.abs(augmented[r][i]) > Math.abs(augmented[maxRow][i])) {
				maxRow = r;
			}
		}
		if (maxRow !== i) {
			[augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
		}

		const pivot = augmented[i][i];
		if (Math.abs(pivot) < 1e-14) {
			throw new Error("Singular matrix");
		}

		// Normalize pivot row
		for (let c = i; c <= n; c++) {
			augmented[i][c] /= pivot;
		}

		// Eliminate in other rows
		for (let r = 0; r < n; r++) {
			if (r !== i) {
				const factor = augmented[r][i];
				for (let c = i; c <= n; c++) {
					augmented[r][c] -= factor * augmented[i][c];
				}
			}
		}
	}

	return augmented.map(row => row[n]);
}


function median(arr) {
	if (!arr.length) return NaN;
	const sorted = [...arr].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	if (sorted.length % 2 === 0) {
		return 0.5 * (sorted[mid - 1] + sorted[mid]);
	}
	return sorted[mid];
}


function estimateKFromData() {
	if (getDatasetPoints(activeSet).length < 4) {
		console.warn("Not enough data points to estimate k.");
		return null;
	}

	// === 1. Sort & detrend ===
	// Filter out entries with non-finite x or y (e.g. null y from blank cells)
	const sortedData = getFiniteDatasetPoints(activeSet)
		.sort((a, b) => a.x - b.x);
	if (sortedData.length < 4) {
		console.warn("Not enough valid data points to estimate k.");
		return null;
	}
	const x = sortedData.map(p => p.x);
	const y = sortedData.map(p => p.y);

	const N = x.length;
	const xMin = x[0];
	const xMax = x[N - 1];
	const dataSpan = xMax - xMin;
	if (dataSpan <= 0) {
		console.warn("Degenerate or invalid X range.");
		return null;
	}

	// Mean of y for detrending
	const meanY = y.reduce((acc, val) => acc + val, 0) / N;
	const yDetrended = y.map(val => val - meanY);

	// We'll also need an approximate sampling step to gauge a "Nyquist" limit
	//   (roughly valid if data is close to uniform in x).
	const avgDx = dataSpan / (N - 1);
	// A naive Nyquist frequency ~ π / avgDx
	const nyquist = Math.PI / avgDx;

	// === 2. Optional: Peak-detection for rough kGuess ===
	let peaks = [];
	for (let i = 1; i < N - 1; i++) {
		if (y[i] > y[i - 1] && y[i] > y[i + 1]) {
			peaks.push(x[i]);
		}
	}
	let kGuess = null;
	if (peaks.length >= 2) {
		const intervals = [];
		for (let i = 1; i < peaks.length; i++) {
			intervals.push(peaks[i] - peaks[i - 1]);
		}
		const avgPeriod = intervals.reduce((a, b) => a + b, 0) / intervals.length;
		kGuess = (2 * Math.PI) / avgPeriod;
	}

	// === 3. Define an initial log-spaced frequency range ===
	// We'll define a broad range, but not infinite.
	// Lower bound: say 2π / (5 * dataSpan) => up to ~5 cycles across the entire domain
	// or 1e-3 if that is bigger, just to avoid going too close to zero.
	const minCandidate = Math.max(1e-3, (2 * Math.PI) / (5 * dataSpan));

	// Upper bound: let's pick something around 5 × the naive Nyquist as a default
	// (i.e. 5 × π / avgDx), but not less than, say, 10 if the data is extremely well-sampled.
	let maxCandidate = Math.max(10, nyquist * 5);

	// If we do have a kGuess, ensure that we include it by possibly expanding the range:
	if (kGuess && Number.isFinite(kGuess) && kGuess > 0) {
		if (kGuess < minCandidate) {
			// expand downward
			minCandidate <= 1e-7 ?
				(minCandidate = 1e-7) :
				(minCandidate = Math.max(1e-7, kGuess / 5));
		}
		if (kGuess > maxCandidate) {
			maxCandidate = kGuess * 5;
		}
	}

	// === 4. Coarse search in log space ===
	// We'll sample frequencies log-spaced from minCandidate to maxCandidate
	const numLogSamples = 200; // ~200 log steps
	const logMin = Math.log(minCandidate);
	const logMax = Math.log(maxCandidate);

	let bestCoarseOmega = 0;
	let bestCoarseScore = -Infinity;

	for (let i = 0; i < numLogSamples; i++) {
		// Log spacing
		const frac = i / (numLogSamples - 1);
		const omega = Math.exp(logMin + frac * (logMax - logMin));

		let sumSin = 0;
		let sumCos = 0;
		for (let j = 0; j < N; j++) {
			const val = yDetrended[j];
			const phase = omega * x[j];
			sumSin += val * Math.sin(phase);
			sumCos += val * Math.cos(phase);
		}
		const score = sumSin * sumSin + sumCos * sumCos;
		if (score > bestCoarseScore) {
			bestCoarseScore = score;
			bestCoarseOmega = omega;
		}
	}

	// === 5. Fine local linear search around bestCoarseOmega ===
	// We'll do ± 30% in linear space (adjust as desired)
	const fineFactor = 0.3;
	const fineMin = Math.max(minCandidate, bestCoarseOmega * (1 - fineFactor));
	const fineMax = Math.min(maxCandidate, bestCoarseOmega * (1 + fineFactor));

	let bestFineOmega = bestCoarseOmega;
	let bestFineScore = bestCoarseScore;

	if (fineMax <= fineMin) {
		console.warn(
			`Fine search range is degenerate => [${fineMin}, ${fineMax}]. Returning coarse result.`
		);
		return bestCoarseOmega;
	}

	const numFine = 3000; // ~3k linear steps
	const step = (fineMax - fineMin) / (numFine - 1);

	for (let i = 0; i < numFine; i++) {
		const omega = fineMin + i * step;
		let sumSin = 0;
		let sumCos = 0;
		for (let j = 0; j < N; j++) {
			const val = yDetrended[j];
			const phase = omega * x[j];
			sumSin += val * Math.sin(phase);
			sumCos += val * Math.cos(phase);
		}
		const score = sumSin * sumSin + sumCos * sumCos;
		if (score > bestFineScore) {
			bestFineScore = score;
			bestFineOmega = omega;
		}
	}

	// === 6. Final sanity check vs. Nyquist? ===
	if (bestFineOmega > 2 * nyquist) {
		console.warn(
			`Warning: best freq = ${bestFineOmega.toFixed(4)} is > 2 × Nyquist (~${(2 * nyquist).toFixed(4)}). Data may be under-sampled.`
		);
	}

	return bestFineOmega;
}


function buildFitDomainFromData(data, sampleCount = 300) {
	const xMin = Math.min(...data.map(p => p.x));
	const xMax = Math.max(...data.map(p => p.x));
	const span = xMax - xMin;
	if (!Number.isFinite(span) || Math.abs(span) < 1e-12) {
		return Array.from({ length: sampleCount }, () => xMin);
	}
	return Array.from({ length: sampleCount }, (_, i) => xMin + i * span / (sampleCount - 1));
}

function normalizeWorkerCurve(rawX, rawY, fallbackX, evaluator) {
	if (!Array.isArray(rawX) || !Array.isArray(rawY) || rawX.length !== rawY.length || rawX.length === 0) {
		return {
			xFit: fallbackX.slice(),
			yFit: fallbackX.map((xValue) => evaluator(xValue))
		};
	}

	const xFit = [];
	const yFit = [];
	for (let index = 0; index < rawX.length; index++) {
		const xValue = Number(rawX[index]);
		const yValue = Number(rawY[index]);
		if (!Number.isFinite(xValue) || !Number.isFinite(yValue)) continue;
		xFit.push(xValue);
		yFit.push(yValue);
	}

	if (!xFit.length) {
		return {
			xFit: fallbackX.slice(),
			yFit: fallbackX.map((xValue) => evaluator(xValue))
		};
	}

	return { xFit, yFit };
}

function evaluateSinusoidalFunction(params, xValue) {
	const A = Number(params.A);
	const b = Number(params.b);
	const k = Number(params.k);
	const phi = Number(params.phi);
	const c = Number(params.c);
	return A * Math.exp(b * xValue) * Math.sin(k * xValue - phi) + c;
}

function buildSinusoidalEquation(params) {
	const A = Number(params.A);
	const b = Number(params.b);
	const k = Number(params.k);
	const phi = Number(params.phi);
	const c = Number(params.c);

	let equation = `y = ${A.toFixed(3)} e^{${b.toFixed(3)}x} \\sin(${k.toFixed(3)}x`;
	if (phi > 0) equation += ` - ${phi.toFixed(3)}`;
	else if (phi < 0) equation += ` + ${Math.abs(phi).toFixed(3)}`;
	equation += `)`;
	if (c > 0) equation += ` + ${c.toFixed(3)}`;
	else if (c < 0) equation += ` - ${Math.abs(c).toFixed(3)}`;
	return equation;
}

function solveSinusoidalFitMainThread(data, initialParams) {
	const A0 = Number(initialParams.A);
	const b0 = Number(initialParams.b);
	const k0 = Number(initialParams.k);
	const phi0 = Number(initialParams.phi);
	const c0 = Number(initialParams.c);

	// Model: y = A e^{b x} sin(k x - phi) + c
	function residualFn(params, pts) {
		const [A, b, k, phi, c] = params;
		const PEN = 1e6;
		return pts.map(({ x, y }) => {
			try {
				const expTerm = Math.exp(b * x);
				const ang = k * x - phi;
				const yPred = A * expTerm * Math.sin(ang) + c;
				if (!Number.isFinite(yPred)) return PEN;
				return yPred - y;
			} catch {
				return PEN;
			}
		});
	}

	function jacobianFn(params, pts) {
		const [A, b, k, phi, c] = params;
		return pts.map(({ x }) => {
			let expTerm, sinTerm, cosTerm;
			try {
				expTerm = Math.exp(b * x);
				const ang = k * x - phi;
				sinTerm = Math.sin(ang);
				cosTerm = Math.cos(ang);
			} catch {
				return [0, 0, 0, 0, 0];
			}
			let dA = expTerm * sinTerm;
			let db = A * x * expTerm * sinTerm;
			let dk = A * expTerm * x * cosTerm;
			let dphi = -A * expTerm * cosTerm;
			let dc = 1;

			if (!Number.isFinite(dA)) dA = 0;
			if (!Number.isFinite(db)) db = 0;
			if (!Number.isFinite(dk)) dk = 0;
			if (!Number.isFinite(dphi)) dphi = 0;

			return [dA, db, dk, dphi, dc];
		});
	}

	// Multi-start: try several k values to avoid local minima
	const kCandidates = [k0];
	if (k0 > 0) {
		kCandidates.push(k0 * 0.667, k0 * 1.5, k0 * 2.0);
	}

	let bestResult = null;
	let bestCost = Infinity;

	for (const kCandidate of kCandidates) {
		// Compute phase estimate for this k candidate
		let sumS = 0, sumC = 0;
		for (let j = 0; j < data.length; j++) {
			const val = data[j].y - c0;
			sumS += val * Math.sin(kCandidate * data[j].x);
			sumC += val * Math.cos(kCandidate * data[j].x);
		}
		let phiCandidate = Math.atan2(-sumC, sumS);
		if (!Number.isFinite(phiCandidate)) phiCandidate = phi0;

		const candidateParams = [A0, b0, kCandidate, phiCandidate, c0];
		const result = levenbergMarquardt(data, candidateParams, residualFn, jacobianFn, { maxIterations: 300, tolerance: 1e-10 });

		if (result.cost < bestCost) {
			bestCost = result.cost;
			bestResult = result;
		}
	}
	if (!bestResult || !Array.isArray(bestResult.params)) {
		return null;
	}

	const [A, b, k, phi, c] = bestResult.params;
	const xFit = buildFitDomainFromData(data, 300);
	const params = { A, b, k, phi, c };
	const yFit = xFit.map((xValue) => evaluateSinusoidalFunction(params, xValue));
	const equation = buildSinusoidalEquation(params);

	return {
		params,
		xFit,
		yFit,
		equation
	};
}

async function performSinusoidalFit() {
	try {
		let A0 = parseFloat(document.getElementById('initial-A').value);
		let b0 = parseFloat(document.getElementById('initial-b').value);
		let k0 = parseFloat(document.getElementById('initial-k').value);
		let phi0 = parseFloat(document.getElementById('initial-phi').value);
		let c0 = parseFloat(document.getElementById('initial-c').value);

		if (!Number.isFinite(k0) || k0 <= 0) {
			const estimatedK = estimateKFromData();
			if (estimatedK !== null && Number.isFinite(estimatedK) && estimatedK > 0) {
				k0 = estimatedK;
				document.getElementById('initial-k').value = k0.toFixed(3);
			} else {
				alert('Failed to estimate k. Please provide an initial value.');
				return;
			}
		}

		if (!Number.isFinite(A0) || !Number.isFinite(b0) || !Number.isFinite(phi0) || !Number.isFinite(c0)) {
			alert('Please provide valid initial parameters for Sinusoidal fit.');
			return;
		}

		const data = getFiniteDatasetPoints(activeSet);
		if (data.length < 4) {
			alert('Sinusoidal fit requires at least four valid data points.');
			return;
		}
		const targetDatasetIndex = activeSet;

		let result = null;
		beginFitControlsBusy();
		try {
			result = await runWorkerFitWithFallback(
				'sinusoidal',
				{
					data,
					initial: { A: A0, b: b0, k: k0, phi: phi0, c: c0 }
				},
				() => solveSinusoidalFitMainThread(data, { A: A0, b: b0, k: k0, phi: phi0, c: c0 })
			);
		} finally {
			endFitControlsBusy();
		}

		const params = result && result.params ? result.params : null;
		if (!params
			|| !Number.isFinite(Number(params.A))
			|| !Number.isFinite(Number(params.b))
			|| !Number.isFinite(Number(params.k))
			|| !Number.isFinite(Number(params.phi))
			|| !Number.isFinite(Number(params.c))) {
			alert('Sinusoidal fit could not converge on this dataset.');
			return;
		}
		if (!Number.isInteger(targetDatasetIndex) || targetDatasetIndex < 0 || targetDatasetIndex >= rawData.length) {
			return;
		}

		const normalizedParams = {
			A: Number(params.A),
			b: Number(params.b),
			k: Number(params.k),
			phi: Number(params.phi),
			c: Number(params.c)
		};
		const fallbackX = buildFitDomainFromData(data, 300);
		const curve = normalizeWorkerCurve(
			result ? result.xFit : null,
			result ? result.yFit : null,
			fallbackX,
			(xValue) => evaluateSinusoidalFunction(normalizedParams, xValue)
		);
		const xFit = curve.xFit;
		const yFit = curve.yFit;
		const equation = typeof result.equation === 'string' && result.equation
			? result.equation
			: buildSinusoidalEquation(normalizedParams);

		fittedCurves[targetDatasetIndex] = { x: xFit, y: yFit, equation: equation };

		const fitFunction = (xValue) => evaluateSinusoidalFunction(normalizedParams, xValue);
		updateResults(equation, data.map(p => p.x), data.map(p => p.y), fitFunction, targetDatasetIndex);
		if (targetDatasetIndex === activeSet) {
			plotGraph(xFit, yFit);
		}
	} catch (error) {
		console.error('Error performing sinusoidal fit:', error);
		alert('An error occurred during sinusoidal fitting. Please check the console for details.');
	}
}


function evaluateGaussianFunction(params, xValue) {
	const A = Number(params.A);
	const mu = Number(params.mu);
	const sigma = Number(params.sigma);
	const c = Number(params.c);
	return A * Math.exp(-((xValue - mu) ** 2) / (2 * sigma * sigma)) + c;
}

function buildGaussianEquation(params) {
	const A = Number(params.A);
	const mu = Number(params.mu);
	const sigma = Number(params.sigma);
	const c = Number(params.c);

	let equation = `y = ${A.toFixed(3)} e^{-\\frac{(x - ${mu.toFixed(3)})^2}{2(${sigma.toFixed(3)})^2}}`;
	if (c > 0) equation += ` + ${c.toFixed(3)}`;
	else if (c < 0) equation += ` - ${Math.abs(c).toFixed(3)}`;
	return equation;
}

function solveGaussianFitMainThread(data, initialParams) {
	let A0 = Number(initialParams.A);
	let mu0 = Number(initialParams.mu);
	let sigma0 = Number(initialParams.sigma);
	const c0 = Number(initialParams.c);

	if (sigma0 === 0) sigma0 = 1e-6;
	if (sigma0 < 0) sigma0 = Math.abs(sigma0);

	// Model: y = A exp(- (x-mu)^2 / (2 sigma^2)) + c
	function residualFn(params, pts) {
		const [A, mu, sigma, c] = params;
		const PEN = 1e6;
		if (!Number.isFinite(sigma) || sigma <= 0) {
			return new Array(pts.length).fill(PEN);
		}
		const s2 = sigma * sigma;
		return pts.map(({ x, y }) => {
			try {
				const d = x - mu;
				const expo = -(d * d) / (2 * s2);
				const e = Math.exp(expo);
				const yPred = A * e + c;
				if (!Number.isFinite(yPred)) return PEN;
				return yPred - y;
			} catch {
				return PEN;
			}
		});
	}

	function jacobianFn(params, pts) {
		const [A, mu, sigma] = params;
		if (!Number.isFinite(sigma) || sigma <= 0) {
			return pts.map(() => [0, 0, 0, 0]);
		}
		const s2 = sigma * sigma;
		const s3 = s2 * sigma;
		return pts.map(({ x }) => {
			const d = x - mu;
			let e;
			try {
				e = Math.exp(-(d * d) / (2 * s2));
			} catch {
				return [0, 0, 0, 0];
			}
			let dA = e;
			let dMu = A * e * (d / s2);
			let dSigma = A * e * ((d * d) / s3);
			let dC = 1;

			if (!Number.isFinite(dA)) dA = 0;
			if (!Number.isFinite(dMu)) dMu = 0;
			if (!Number.isFinite(dSigma)) dSigma = 0;

			return [dA, dMu, dSigma, dC];
		});
	}

	const initial = [A0, mu0, sigma0, c0];
	const { params } = levenbergMarquardt(data, initial, residualFn, jacobianFn, { maxIterations: 300, tolerance: 1e-10 });
	if (!Array.isArray(params)) return null;

	let [A, mu, sigma, c] = params;
	if (!Number.isFinite(sigma) || sigma <= 0) sigma = Math.max(1e-6, Math.abs(sigma0));

	const xFit = buildFitDomainFromData(data, 300);
	const normalizedParams = { A, mu, sigma, c };
	const yFit = xFit.map((xValue) => evaluateGaussianFunction(normalizedParams, xValue));
	const equation = buildGaussianEquation(normalizedParams);

	return {
		params: normalizedParams,
		xFit,
		yFit,
		equation
	};
}

async function performGaussianFit() {
	try {
		let A0 = parseFloat(document.getElementById('initial-A-gaussian').value);
		let mu0 = parseFloat(document.getElementById('initial-mu').value);
		let sigma0 = parseFloat(document.getElementById('initial-sigma').value);
		let c0 = parseFloat(document.getElementById('initial-c-gaussian').value);

		if (!Number.isFinite(A0) || !Number.isFinite(mu0) || !Number.isFinite(sigma0) || !Number.isFinite(c0)) {
			alert('Please provide valid initial parameters for Gaussian fit.');
			return;
		}

		if (sigma0 === 0) sigma0 = 1e-6;
		if (sigma0 < 0) sigma0 = Math.abs(sigma0);

		const data = getFiniteDatasetPoints(activeSet);
		if (data.length < 4) {
			alert('Gaussian fit requires at least four valid data points.');
			return;
		}
		const targetDatasetIndex = activeSet;

		let result = null;
		beginFitControlsBusy();
		try {
			result = await runWorkerFitWithFallback(
				'gaussian',
				{
					data,
					initial: { A: A0, mu: mu0, sigma: sigma0, c: c0 }
				},
				() => solveGaussianFitMainThread(data, { A: A0, mu: mu0, sigma: sigma0, c: c0 })
			);
		} finally {
			endFitControlsBusy();
		}

		const params = result && result.params ? result.params : null;
		if (!params
			|| !Number.isFinite(Number(params.A))
			|| !Number.isFinite(Number(params.mu))
			|| !Number.isFinite(Number(params.sigma))
			|| !Number.isFinite(Number(params.c))) {
			alert('Gaussian fit could not converge on this dataset.');
			return;
		}
		if (!Number.isInteger(targetDatasetIndex) || targetDatasetIndex < 0 || targetDatasetIndex >= rawData.length) {
			return;
		}

		const normalizedParams = {
			A: Number(params.A),
			mu: Number(params.mu),
			sigma: Math.max(1e-6, Math.abs(Number(params.sigma))),
			c: Number(params.c)
		};

		const fallbackX = buildFitDomainFromData(data, 300);
		const curve = normalizeWorkerCurve(
			result ? result.xFit : null,
			result ? result.yFit : null,
			fallbackX,
			(xValue) => evaluateGaussianFunction(normalizedParams, xValue)
		);
		const xFit = curve.xFit;
		const yFit = curve.yFit;
		const equation = typeof result.equation === 'string' && result.equation
			? result.equation
			: buildGaussianEquation(normalizedParams);

		fittedCurves[targetDatasetIndex] = { x: xFit, y: yFit, equation: equation };

		const fitFunction = (xValue) => evaluateGaussianFunction(normalizedParams, xValue);
		updateResults(equation, data.map(p => p.x), data.map(p => p.y), fitFunction, targetDatasetIndex);
		if (targetDatasetIndex === activeSet) {
			plotGraph(xFit, yFit);
		}
	} catch (error) {
		console.error('Error performing Gaussian fit:', error);
		alert('An error occurred during Gaussian fitting. Please check the console for details.');
	}
}

Object.assign(window, {
	fitCurve,
	updateBasicFitEquation,
	changeAdvancedFitMethod,
	resetAdvancedFitParameters,
	setInitialParameters,
	getCurrentAdvancedFitMethod,
	fitAdvancedCurve,
	fitCustomCurve,
	refreshCustomFitDefinition,
	initializeCustomFitUI,
	loadCustomFitUiForActiveDataset,
	resetCustomFitParametersFromData
});
})();
