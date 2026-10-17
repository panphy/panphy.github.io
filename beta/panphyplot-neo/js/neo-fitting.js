// Curve fitting for PanPhyPlot (neo-beta): a copy of /tools/panphyplot/js/curve-fitting.js that fits
// the chosen Y series, keyed by activeFitKey, and records the data each fit used.
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
const fitCore = (typeof globalThis === 'object' && globalThis.PanPhyFitCore) ? globalThis.PanPhyFitCore : {};

function missingFitCoreFunction(name) {
	return () => {
		throw new Error(`PanPhyFitCore.${name} is unavailable.`);
	};
}

const levenbergMarquardt = typeof fitCore.levenbergMarquardt === 'function'
	? fitCore.levenbergMarquardt
	: missingFitCoreFunction('levenbergMarquardt');
const buildFitDomainFromData = typeof fitCore.buildFitDomainFromData === 'function'
	? fitCore.buildFitDomainFromData
	: missingFitCoreFunction('buildFitDomainFromData');
const buildSinusoidalEquation = typeof fitCore.buildSinusoidalEquation === 'function'
	? fitCore.buildSinusoidalEquation
	: missingFitCoreFunction('buildSinusoidalEquation');
const buildGaussianEquation = typeof fitCore.buildGaussianEquation === 'function'
	? fitCore.buildGaussianEquation
	: missingFitCoreFunction('buildGaussianEquation');
const minMaxFinite = typeof fitCore.minMaxFinite === 'function'
	? fitCore.minMaxFinite
	: missingFitCoreFunction('minMaxFinite');
const fromFitCore = (name) => (typeof fitCore[name] === 'function' ? fitCore[name] : missingFitCoreFunction(name));
const formatFitNumber = fromFitCore('formatFitNumber');
const evaluateSinusoidal = fromFitCore('evaluateSinusoidal');
const solveSinusoidal = fromFitCore('solveSinusoidal');
const evaluateGaussian = fromFitCore('evaluateGaussian');
const solveGaussian = fromFitCore('solveGaussian');
const evaluateCustomExpression = fromFitCore('evaluateCustomExpression');
const buildCustomResidualFn = fromFitCore('buildCustomResidualFn');
const buildCustomJacobianFn = fromFitCore('buildCustomJacobianFn');
const solveCustomMultiStart = fromFitCore('solveCustomMultiStart');


const debouncedRefreshCustomFitDefinition = debounce(() => {
	refreshCustomFitDefinition({ preserveUserValues: true });
}, 180);
let fitWorkerInstance = null;
let fitWorkerRequestCounter = 0;
const fitWorkerPendingRequests = new Map();
let fitControlsBusyCount = 0;
let fitWorkerDisabled = false;

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
			handleFitWorkerError(new Error('Fit exceeded the time limit.'));
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
	if (fitWorkerDisabled) return fallbackSolver();
	try {
		return await runFitWorkerTask(task, payload);
	} catch (workerError) {
		console.warn(`Falling back to main-thread ${task} fit:`, workerError);
		if (!fitWorkerDisabled) {
			fitWorkerDisabled = true;
			if (typeof showToast === 'function') {
				showToast('Fit worker unavailable — running on main thread.', 5000);
			}
		}
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

function ensureCustomFitState(index = activeFitKey) {
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
	const points = getFiniteDatasetPoints(activeFitKey);
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
	const { min: xMin, max: xMax } = minMaxFinite(xValues);
	const { min: yMin, max: yMax } = minMaxFinite(yValues);
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
	return numeric.toPrecision(8);
}

function syncCustomFitInputsToState() {
	const state = ensureCustomFitState(activeFitKey);
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

	if (options.syncInputs !== false) syncCustomFitInputsToState();
	const state = ensureCustomFitState(activeFitKey);
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
			const current = parseNumericInput(state.initialValues[name]);
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
		ensureCustomFitState().formula = elements.formulaInput.value;
		scheduleSaveState();
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

	const state = ensureCustomFitState(activeFitKey);
	elements.formulaInput.value = state.formula || '';
	// The existing parameter controls still belong to the outgoing dataset.
	refreshCustomFitDefinition({ preserveUserValues: true, suppressSave: true, showMessage: false, syncInputs: false });
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

	const state = ensureCustomFitState(activeFitKey);
	state.initialValues[parameterName] = input.value;
	if (typeof scheduleSaveState === 'function') scheduleSaveState();
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
		replacementMap[name] = Number(numeric.toPrecision(8));
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
			.map((name, index) => `${name}=${formatFitNumber(Number(parameterValues[index]))}`)
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
	const filteredData = getFiniteDatasetPoints(activeFitKey);
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
	const sortedData = getFiniteDatasetPoints(activeFitKey)
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

	// Find right crossing (falling edge: above half-max on the left, below on the right)
	for (let i = sortedData.length - 1; i > 0; i--) {
		if (sortedData[i - 1].y >= halfMax && sortedData[i].y < halfMax) {
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
		const { min: minX, max: maxX } = minMaxFinite(xs);
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
	if (getDatasetPoints(activeFitKey).length === 0) return;

	// Use only finite points (avoid null/blank cells corrupting guesses)
	const pts = getFiniteDatasetPoints(activeFitKey);
	if (pts.length < 4) return;

	const x = pts.map(p => p.x);
	const y = pts.map(p => p.y);

	const meanX = x.reduce((sum, val) => sum + val, 0) / x.length;
	const meanY = y.reduce((sum, val) => sum + val, 0) / y.length;

	const { min: minY, max: maxY } = minMaxFinite(y);

	// For Gaussian
	const FWHM = calculateFWHM(x, y, maxY);

	if (method === 'Gaussian') {
		document.getElementById('initial-A-gaussian').value = maxY.toPrecision(8);
		document.getElementById('initial-mu').value = meanX.toPrecision(8);
		document.getElementById('initial-sigma').value = (FWHM / (2 * Math.sqrt(2 * Math.log(2))) || 1).toPrecision(8);
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
			const { min: xLo, max: xHi } = minMaxFinite(x);
			const span = xHi - xLo;
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

		document.getElementById('initial-A').value = (isFinite(Aguess) && Aguess !== 0 ? Aguess : 1).toPrecision(8);
		document.getElementById('initial-b').value = bguess.toPrecision(8);
		document.getElementById('initial-k').value = kguess.toPrecision(8);
		document.getElementById('initial-phi').value = phiguess.toPrecision(8);
		document.getElementById('initial-c').value = cguess.toPrecision(8);
	}
}


function getCurrentAdvancedFitMethod() {
	return document.getElementById('advanced-fit-method').value;
}


const computeLinearFit = fromFitCore('computeLinearFit');
const computeRSq = fromFitCore('computeRSq');


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


function exponentialFit_cAbx(raw) {
	const data = raw.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
	if (data.length < 3) return null;
	const x = data.map(p => p.x);
	const y = data.map(p => p.y);
	const { min: yMin, max: yMax } = minMaxFinite(y);
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
	let solver = null;

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

		const result = levenbergMarquardt(
			data, [A0, b0, c0],
			fitResiduals, fitJacobian,
			{ maxIterations: 200 }
		);

		if (result.cost < bestCost) {
			bestCost = result.cost;
			bestParams = result.params;
			solver = result;
		}
	}

	if (!bestParams) return null;

	const [A, b, c] = bestParams;
	const { min: xMin, max: xMax } = minMaxFinite(x);
	const xFit = Array.from({ length: 100 }, (_, i) => xMin + i * (xMax - xMin) / 99);
	const fitFn = xi => c + A * Math.exp(b * xi);
	const yFit = xFit.map(fitFn);
	const r2 = computeRSq(x, y, fitFn);
	const eq = formatExpEquation(A, b, c, false);
	return { ok: true, model: 'cAbx', r2, params: { A, b, c }, xFit, yFit, fitFn, eq, solver };
}


function exponentialFit_logLinear(raw) {
	const data = raw.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
	if (data.length < 3) return null;
	const x = data.map(p => p.x);
	const y = data.map(p => p.y);

	const { min: yMin, max: yMax } = minMaxFinite(y);
	const yRange = (yMax - yMin) || 1;
	const { min: xMin, max: xMax } = minMaxFinite(x);

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

	const solver = levenbergMarquardt(
		data, [best.A, best.b, best.x0, best.c],
		fitResiduals, fitJacobian,
		{ maxIterations: 200 }
	);

	const [A, b, x0, c] = solver.params;
	const fitFn = xi => A * Math.exp(b * (xi - x0)) + c;
	const xFit = Array.from({ length: 100 }, (_, i) => xMin + i * (xMax - xMin) / 99);
	const yFit = xFit.map(fitFn);
	const r2 = computeRSq(x, y, fitFn);
	const eq = formatExpEquation(A, b, c, true, x0);
	return { ok: true, model: 'shifted', r2, params: { A, b, x0, c }, xFit, yFit, fitFn, eq, solver };
}


// ---------- Weighting and parameter uncertainties (neo-beta) ----------
// Every fit hands its model and unweighted best parameters to finalizeParametricFit, which
// refines them by least squares, weights by 1/σ² when asked (σ² = ΔY² + (f′(x)·ΔX)², the
// effective variance, re-weighted as the fit settles) and takes each parameter's ± from the
// Jacobian.

function modelSlope(model, x) {
	const step = Math.abs(x) * 1e-6 || 1e-6;
	return (model(x + step) - model(x - step)) / (2 * step);
}

// Each point's σ for the current model, or null if any point has no usable uncertainty.
function effectiveSigmas(data, model) {
	if (!data.some(point => point.yError > 0 || point.xError > 0)) return null;
	const sigmas = data.map((point) => {
		const sy = point.yError > 0 ? point.yError : 0;
		const sx = point.xError > 0 ? point.xError * modelSlope(model, point.x) : 0;
		return Math.sqrt(sy * sy + sx * sx);
	});
	return sigmas.every(sigma => Number.isFinite(sigma) && sigma > 0) ? sigmas : null;
}

function numericJacobian(model, params, data) {
	return data.map(({ x }) => params.map((value, index) => {
		const step = Math.max(1e-7, Math.abs(value) * 1e-6);
		const plus = params.slice();
		const minus = params.slice();
		plus[index] = value + step;
		minus[index] = value - step;
		const derivative = (model(plus, x) - model(minus, x)) / (2 * step);
		return Number.isFinite(derivative) ? derivative : 0;
	}));
}

function runLeastSquares(data, params, model, sigmas) {
	const scale = index => (sigmas ? sigmas[index] : 1);
	const residualFn = (p, pts) => pts.map((point, index) => {
		const predicted = model(p, point.x);
		return Number.isFinite(predicted) ? (predicted - point.y) / scale(index) : CUSTOM_FIT_PENALTY;
	});
	const jacobianFn = (p, pts) => numericJacobian(model, p, pts).map((row, index) => row.map(value => value / scale(index)));
	const result = levenbergMarquardt(data, params, residualFn, jacobianFn, { maxIterations: 400, tolerance: 1e-12 });
	return result && Array.isArray(result.params) && result.params.every(Number.isFinite) ? result : null;
}

// spec: { names, params, model(params, x), refine } — refine: false keeps closed-form parameters.
function finalizeParametricFit(data, spec) {
	let params = spec.params.slice();
	let solver = null;
	const modelAt = p => x => spec.model(p, x);
	const sse = p => data.reduce((sum, point) => sum + (spec.model(p, point.x) - point.y) ** 2, 0);
	if (spec.refine !== false) {
		const refined = runLeastSquares(data, params, spec.model, null);
		const before = sse(params);
		const after = refined ? sse(refined.params) : Infinity;
		if (after <= before) {
			params = refined.params;
			// A refinement that wanders along a flat valley without real gain does not overrule the
			// method's own verdict (as with a power law fitted to a straight line).
			if (refined.converged || before - after > 1e-6 * Math.max(before, Number.MIN_VALUE)) solver = refined;
		}
	}
	let weighted = false;
	let note = '';
	if (getWeightingRequested()) {
		if (!effectiveSigmas(data, modelAt(params))) {
			note = ' Not weighted: every point needs a ±ΔY or ±ΔX above zero.';
		} else {
			for (let pass = 0; pass < 5; pass++) {
				const sigmas = effectiveSigmas(data, modelAt(params));
				if (!sigmas) break;
				const result = runLeastSquares(data, params, spec.model, sigmas);
				if (!result) break;
				const moved = result.params.some((value, index) => Math.abs(value - params[index]) > 1e-10 * Math.max(1, Math.abs(value)));
				params = result.params;
				solver = result;
				weighted = true;
				if (!moved) break;
			}
		}
	}
	const sigmas = effectiveSigmas(data, modelAt(params));
	const residuals = data.map(point => point.y - spec.model(params, point.x));
	const uncertainties = residuals.every(Number.isFinite)
		? PanPhyNeoStats.parameterUncertainties(numericJacobian(spec.model, params, data), residuals, weighted ? sigmas : null)
		: null;
	return {
		params,
		solver,
		weighted,
		note,
		chiSigmas: sigmas,
		parameters: uncertainties && uncertainties.every(Number.isFinite)
			? spec.names.map((name, index) => ({ name, value: params[index], uncertainty: uncertainties[index] }))
			: null
	};
}

function sampleCurve(data, fitFunction, count = 300) {
	const { min, max } = minMaxFinite(data.map(point => point.x));
	const xFit = Array.from({ length: count }, (_, i) => (max === min ? min : min + (i * (max - min)) / (count - 1)));
	return { xFit, yFit: xFit.map(fitFunction) };
}

function fitExtras(final) {
	return {
		weighted: final.weighted,
		parameters: final.parameters,
		parameterCount: final.params.length,
		chiSigmas: final.chiSigmas,
		statusNote: final.note
	};
}

function getFitChoice() {
	const customTab = document.getElementById('CustomFit');
	const advancedTab = document.getElementById('AdvancedFit');
	if (customTab?.classList.contains('active')) {
		return { kind: 'custom', formula: document.getElementById('custom-fit-formula-input').value };
	}
	if (advancedTab?.classList.contains('active')) {
		return { kind: 'advanced', method: document.getElementById('advanced-fit-method').value };
	}
	return { kind: 'basic', method: document.getElementById('fit-method').value };
}

// Free parameters for χ²/ν. Exponential and Power are left out: their fitted forms vary with the data.
function getChoiceParameterCount(choice) {
	const method = choice && choice.method;
	if (method === 'Linear') return 2;
	if (typeof method === 'string' && method.startsWith('Polynomial-')) return Number(method.split('-')[1]) + 1;
	if (method === 'Sinusoidal') return 5;
	if (method === 'Gaussian') return 4;
	return 0;
}

function updateResults(equation, x, y, fitFunction, datasetIndex = activeFitKey, solver = null, choice = getFitChoice(), extras = {}) {
	const residuals = x.map((value, i) => ({ x: value, y: y[i] - fitFunction(value) }));
	const finiteResiduals = residuals.filter(point => Number.isFinite(point.y));
	const rSquared = computeRSq(x, y, fitFunction);
	let scale = 0;
	for (const point of finiteResiduals) scale = Math.max(scale, Math.abs(point.y));
	const rmse = scale === 0 ? 0 : scale * Math.sqrt(finiteResiduals.reduce((sum, point) => sum + (point.y / scale) ** 2, 0) / finiteResiduals.length);
	const stopReason = solver?.reason === 'iteration-limit' ? 'iteration limit reached' : 'no further improvement found';
	let status = solver ? (solver.converged ? `Converged in ${solver.iterations} iterations.` : `Convergence not confirmed: ${stopReason}. Try different initial parameters.`) : 'Least-squares solution calculated.';
	if (finiteResiduals.length !== x.length) status = 'Fit is undefined for some measurements. Check the model and initial parameters.';
	const result = {
		equation,
		rSquared: Number.isFinite(rSquared) ? rSquared.toFixed(5) : 'N/A',
		residuals: finiteResiduals,
		rmse: Number.isFinite(rmse) ? rmse : null,
		status,
		stale: false,
		choice,
		signature: getDatasetFitSignature(datasetIndex),
		weighted: false,
		parameters: null,
		...extras
	};
	// χ²/ν needs every point's σ; it describes the fit whether or not the fit was weighted.
	const sigmas = extras.chiSigmas || getFitSigmas(datasetIndex);
	const parameterCount = Array.isArray(result.parameters) ? result.parameters.length : (extras.parameterCount || getChoiceParameterCount(choice));
	if (sigmas && sigmas.length === x.length && finiteResiduals.length === x.length && parameterCount) {
		result.chi2 = PanPhyNeoStats.chiSquared(residuals.map(point => point.y), sigmas);
		result.dof = x.length - parameterCount;
	}
	if (extras.statusOverride) result.status = extras.statusOverride;
	if (extras.statusNote) result.status += extras.statusNote;
	delete result.chiSigmas;
	delete result.statusNote;
	delete result.statusOverride;
	datasetFitResults[datasetIndex] = result;
	if (datasetIndex === activeFitKey) renderFittingResult(equation, result.rSquared);
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


async function fitAdvancedCurve() {
	if (typeof updateData === 'function') {
		updateData();
	}
	if (getDatasetPoints(activeFitKey).length < 4) { // Increased to 4 for more complex fits
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

async function fitCustomCurve() {
	try {
		if (typeof updateData === 'function') {
			updateData();
		}
		const fitTarget = captureFitTarget();
		const fitChoice = { kind: 'custom', formula: document.getElementById('custom-fit-formula-input').value };
		const analysis = refreshCustomFitDefinition({ preserveUserValues: true });
		if (!analysis.ok) {
			alert('Please enter a valid custom equation before fitting.');
			return;
		}

		const data = getFiniteDatasetPoints(activeFitKey);
		const minimumPoints = Math.max(4, analysis.parameterNames.length + 1);
		if (data.length < minimumPoints) {
			alert(`Please enter at least ${minimumPoints} valid data points for this custom fit.`);
			return;
		}

		const initialParams = [];
		for (let index = 0; index < analysis.parameterNames.length; index++) {
			const parameterName = analysis.parameterNames[index];
			const rawValue = analysis.initialValues[parameterName];
			const numericValue = parseNumericInput(rawValue);
			if (!Number.isFinite(numericValue)) {
				alert(`Please enter a valid initial value for parameter "${parameterName}".`);
				return;
			}
			initialParams.push(numericValue);
		}

		const starts = buildCustomFitInitialCandidates(initialParams);
		const residualFn = buildCustomResidualFn(analysis.compiledExpression, analysis.parameterNames, CUSTOM_FIT_PENALTY);
		const jacobianFn = buildCustomJacobianFn(analysis.compiledExpression, analysis.parameterNames);

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
				() => solveCustomMultiStart(data, starts, residualFn, jacobianFn, { maxIterations: 350, tolerance: 1e-10 })
			);
		} finally {
			endFitControlsBusy();
		}

		let bestParams = solved && Array.isArray(solved.params) ? solved.params : null;
		if (!bestParams || !Array.isArray(bestParams)) {
			alert('Custom fit could not converge on this dataset.');
			return;
		}
		// Weighting (with ΔX through the slope) and ± values, shared with every other fit.
		const final = finalizeParametricFit(data, {
			names: analysis.parameterNames,
			params: bestParams,
			model: (values, xInput) => evaluateCustomExpression(analysis.compiledExpression, analysis.parameterNames, values, xInput)
		});
		bestParams = final.params;
		if (final.solver) solved = final.solver;
		const targetDatasetIndex = resolveFitTarget(fitTarget);
		if (targetDatasetIndex < 0) {
			showToast('Fit discarded because its dataset changed or was removed.');
			return;
		}

		const xValues = data.map((point) => point.x);
		const yValues = data.map((point) => point.y);
		const { min: xMin, max: xMax } = minMaxFinite(xValues);
		const xRange = xMax - xMin;
		const xFit = Array.from({ length: CUSTOM_FIT_SAMPLE_POINTS }, (_, i) => {
			if (xRange === 0) return xMin;
			return xMin + (i * xRange) / (CUSTOM_FIT_SAMPLE_POINTS - 1);
		});
		const fitFunction = (xInput) => {
			return evaluateCustomExpression(analysis.compiledExpression, analysis.parameterNames, bestParams, xInput);
		};
		const yFit = xFit.map(fitFunction);
		const equation = buildCustomFitEquationLatex(analysis.parsedExpression, analysis.parameterNames, bestParams);

		fittedCurves[targetDatasetIndex] = { x: xFit, y: yFit, equation };
		updateResults(equation, xValues, yValues, fitFunction, targetDatasetIndex, solved, fitChoice, fitExtras(final));
		if (targetDatasetIndex === activeFitKey) {
			plotGraph(xFit, yFit);
		}

		const state = ensureCustomFitState(targetDatasetIndex);
		state.initialValues = {};
		analysis.parameterNames.forEach((name, index) => {
			state.initialValues[name] = formatCustomFitInputValue(bestParams[index]);
		});
		if (targetDatasetIndex === activeFitKey) {
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
		const data = getFiniteDatasetPoints(activeFitKey);
		const line = PanPhyNeoStats.linearFit(x, y);
		if (!line) {
			alert('A straight line needs at least two different x values.');
			return;
		}
		// The unweighted line is exact, so only a weighted fit refines it.
		const final = finalizeParametricFit(data, {
			names: ['m', 'c'],
			params: [line.m, line.c],
			model: ([m, c], xi) => m * xi + c,
			refine: false
		});
		const [slope, intercept] = final.params;
		const fitFunction = xi => slope * xi + intercept;
		const { min: xMin, max: xMax } = minMaxFinite(x);
		const xFit = [xMin, xMax];
		const yFit = xFit.map(fitFunction);

		let equation = `y = ${formatFitNumber(slope)}x + ${formatFitNumber(intercept)}`;
		if (intercept < 0) {
			equation = `y = ${formatFitNumber(slope)}x - ${formatFitNumber(Math.abs(intercept))}`;
		}
		fittedCurves[activeFitKey] = { x: xFit, y: yFit, equation };
		const extras = fitExtras(final);
		if (x.length <= 2 && !final.weighted) extras.parameters = null;
		updateResults(equation, x, y, fitFunction, activeFitKey, null, { kind: 'basic', method: document.getElementById('fit-method').value }, extras);
		plotGraph(xFit, yFit);
	} catch (error) {
		console.error('Error performing linear fit:', error);
		alert('An error occurred during linear fitting. Please check the console for details.');
	}
}


// The polynomial is fitted in u = (x − mean)/spread, which keeps high powers well conditioned.
function buildPolynomialEquation(coefficients, meanX, stdX) {
	const degree = coefficients.length - 1;
	let equation = 'y = ';
	coefficients.forEach((c, i) => {
		const power = degree - i;
		if (c === 0) return;
		const absC = formatFitNumber(Math.abs(c));
		const sign = c >= 0 ? (i === 0 ? '' : ' + ') : (i === 0 ? '-' : ' - ');
		const term = power === 0 ? `${absC}` : power === 1 ? `${absC}u` : `${absC}u^{${power}}`;
		equation += `${sign}${term}`;
	});
	return `${equation},\\ u = \\frac{x - ${formatFitNumber(meanX)}}{${formatFitNumber(stdX)}}`;
}

function performPolynomialFit(x, y, degree) {
	try {
		const data = getFiniteDatasetPoints(activeFitKey);
		const fit = polyfit(x, y, degree);
		const model = (coefficients, xi) => polyEval({ coefficients, meanX: fit.meanX, stdX: fit.stdX }, xi);
		const final = finalizeParametricFit(data, {
			names: fit.coefficients.map((_, i) => `a_{${degree - i}}`),
			params: fit.coefficients,
			model,
			refine: false
		});
		const fitFunction = xi => model(final.params, xi);
		const { xFit, yFit } = sampleCurve(data, fitFunction, 100);
		const equation = buildPolynomialEquation(final.params, fit.meanX, fit.stdX);
		fittedCurves[activeFitKey] = { x: xFit, y: yFit, equation };
		updateResults(equation, x, y, fitFunction, activeFitKey, null, { kind: 'basic', method: document.getElementById('fit-method').value }, fitExtras(final));
		plotGraph(xFit, yFit);
	} catch (error) {
		console.error('Error performing polynomial fit:', error);
		alert('An error occurred during polynomial fitting. Please check the console for details.');
	}
}


function performExponentialFit() {
	try {
		const data = getFiniteDatasetPoints(activeFitKey);
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

		// A e^{b(x − x0)} + c is A e^{−b x0} e^{bx} + c: the same curve with one redundant parameter.
		const { A: A0, b: b0, c: c0 } = best.params;
		const startA = best.model === 'shifted' ? A0 * Math.exp(-b0 * best.params.x0) : A0;
		const xAll = data.map(p => p.x);
		const yAll = data.map(p => p.y);
		if (!Number.isFinite(startA)) {
			fittedCurves[activeFitKey] = { x: best.xFit, y: best.yFit, equation: best.eq };
			updateResults(best.eq, xAll, yAll, best.fitFn, activeFitKey, best.solver, { kind: 'basic', method: 'Exponential' }, { parameterCount: 3 });
			plotGraph(best.xFit, best.yFit);
			return;
		}
		const model = ([A, b, c], xi) => A * Math.exp(b * xi) + c;
		const final = finalizeParametricFit(data, { names: ['A', 'b', 'c'], params: [startA, b0, c0], model });
		const fitFunction = xi => model(final.params, xi);
		const { xFit, yFit } = sampleCurve(data, fitFunction, 100);
		const equation = formatExpEquation(final.params[0], final.params[1], final.params[2], false);
		fittedCurves[activeFitKey] = { x: xFit, y: yFit, equation };
		updateResults(equation, xAll, yAll, fitFunction, activeFitKey, final.solver || best.solver, { kind: 'basic', method: 'Exponential' }, fitExtras(final));
		plotGraph(xFit, yFit);

	} catch (error) {
		console.error('Error performing exponential fit:', error);
		alert('An error occurred during exponential fitting. Please check the console for details.');
	}
}


// A copy of PanPhyFitCore.solveShiftedPowerLaw (tools/panphyplot/js/fit-core.js). The beta keeps
// its own because fit-core.js is cache-first under the site's service worker, while this file is
// always fetched fresh: a visitor who has not accepted an update would otherwise get an older core.
// y = A (x - x0)^b + c, the general power law. A and c trade off against x0 and b, so a
// local search from a rough guess often stalls. For fixed x0 and b the model is linear in
// A and c, which a least-squares line gives exactly: a scan over (x0, b) finds the right
// valley, and Levenberg-Marquardt then polishes all four parameters from the best few.
function evaluateShiftedPower(params, xValue) {
	const t = xValue - params.x0;
	if (!(t > 0) && !Number.isInteger(params.b)) return NaN;
	return params.A * Math.pow(t, params.b) + params.c;
}

function profileShiftedPower(data, x0, b) {
	let n = 0, sz = 0, szz = 0, sy = 0, szy = 0;
	for (const { x, y } of data) {
		const z = Math.pow(x - x0, b);
		if (!Number.isFinite(z)) return null;
		n++; sz += z; szz += z * z; sy += y; szy += z * y;
	}
	const det = n * szz - sz * sz;
	if (!(Math.abs(det) > 1e-300 * Math.max(1, szz * n))) return null;
	const A = (n * szy - sz * sy) / det;
	const c = (sy - A * sz) / n;
	let sse = 0;
	for (const { x, y } of data) sse += (A * Math.pow(x - x0, b) + c - y) ** 2;
	return Number.isFinite(sse) ? { A, b, x0, c, sse } : null;
}

function shiftedPowerResiduals([A, b, x0, c], points, penalty = CUSTOM_FIT_PENALTY) {
	return points.map(({ x, y }) => {
		const t = x - x0;
		if (!(t > 0) && !Number.isInteger(b)) return penalty;
		const predicted = A * Math.pow(t, b) + c;
		return Number.isFinite(predicted) ? predicted - y : penalty;
	});
}

function shiftedPowerJacobian([A, b, x0], points) {
	return points.map(({ x }) => {
		const t = x - x0;
		if (!(t > 0)) return [0, 0, 0, 1];
		const z = Math.pow(t, b);
		return [z, A * z * Math.log(t), -A * b * Math.pow(t, b - 1), 1].map(value => (Number.isFinite(value) ? value : 0));
	});
}

function solveShiftedPowerLaw(data, options = {}) {
	const points = data.filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
	if (points.length < 4) return null;
	const { min: xMin, max: xMax } = minMaxFinite(points.map(point => point.x));
	const span = (xMax - xMin) || Math.abs(xMin) || 1;
	// x0 sits below the smallest x, so every (x - x0) is positive for any exponent.
	const gaps = [1e-6, 1e-4, 1e-3, 3e-3, 0.01, 0.03, 0.1, 0.3, 1, 3, 10, 100].map(k => k * span);
	if (xMin > 0) gaps.push(xMin);
	const exponents = [-4, -3, -2, -1.5, -1, -0.75, -0.5, -1 / 3, -0.25, 0.25, 1 / 3, 0.5, 0.75, 0.9, 1.1, 1.25, 1.5, 2, 2.5, 3, 4];
	const scanned = [];
	for (const gap of gaps) {
		for (const b of exponents) {
			const fit = profileShiftedPower(points, xMin - gap, b);
			if (fit) scanned.push(fit);
		}
	}
	if (!scanned.length) return null;
	scanned.sort((a, b) => a.sse - b.sse);
	const maxIterations = Number.isFinite(options.maxIterations) ? options.maxIterations : 500;
	let best = null;
	for (const start of scanned.slice(0, 4)) {
		const result = levenbergMarquardt(points, [start.A, start.b, start.x0, start.c],
			shiftedPowerResiduals, shiftedPowerJacobian, { maxIterations, tolerance: 1e-12 });
		if (result && Array.isArray(result.params) && result.params.every(Number.isFinite)
			&& (!best || result.cost < best.cost)) best = result;
	}
	if (!best) {
		const [start] = scanned;
		return { params: start, converged: false, reason: 'no-solution', iterations: 0, cost: start.sse };
	}
	const [A, b, x0, c] = best.params;
	return { params: { A, b, x0, c }, converged: best.converged, reason: best.reason, iterations: best.iterations, cost: best.cost };
}


// The general power law y = A (x - x0)^b + c. solveShiftedPowerLaw finds it (A and c
// exact over a scan of x0 and b, then all four polished); the shared helper weights it and gives the ±.
function performPowerFit() {
	try {
		const data = getFiniteDatasetPoints(activeFitKey);
		if (data.length < 4) {
			alert('Power fit requires at least 4 data points.');
			return;
		}
		const solution = solveShiftedPowerLaw(data);
		if (!solution) {
			alert('Unable to find a suitable power-law fit.');
			return;
		}
		const model = ([A, b, x0, c], xi) => evaluateShiftedPower({ A, b, x0, c }, xi);
		const final = finalizeParametricFit(data, {
			names: ['A', 'b', 'x_0', 'c'],
			params: [solution.params.A, solution.params.b, solution.params.x0, solution.params.c],
			model
		});
		const [A, b, x0, c] = final.params;
		const fitFunction = xi => model(final.params, xi);
		const { xFit, yFit } = sampleCurve(data, fitFunction, 100);
		const x0Text = x0 >= 0 ? ` - ${formatFitNumber(x0)}` : ` + ${formatFitNumber(Math.abs(x0))}`;
		const cText = c >= 0 ? ` + ${formatFitNumber(c)}` : ` - ${formatFitNumber(Math.abs(c))}`;
		const equation = `y = ${formatFitNumber(A)}(x${x0Text})^{${formatFitNumber(b)}}${cText}`;
		fittedCurves[activeFitKey] = { x: xFit, y: yFit, equation };
		const solver = final.solver || solution;
		const extras = fitExtras(final);
		// Without convergence here the cause is the data, not a starting guess: near b = 1 (a straight
		// line) or with few points, A, x0 and c can trade off and many combinations fit almost equally.
		if (!solver.converged) {
			extras.statusOverride = 'The four parameters are not pinned down by this data: many combinations of A, x₀ and c fit almost equally well, as their ± values show. If theory fixes x₀ or c, a Custom fit such as A*x^b pins them; a straight line suits Linear.';
		}
		updateResults(equation, data.map(p => p.x), data.map(p => p.y), fitFunction, activeFitKey, solver, { kind: 'basic', method: 'Power' }, extras);
		plotGraph(xFit, yFit);
	} catch (error) {
		console.error('Error performing power fit:', error);
		alert('An error occurred during power fitting. Please check the console for details.');
	}
}


function estimateKFromData() {
	if (getDatasetPoints(activeFitKey).length < 4) {
		console.warn("Not enough data points to estimate k.");
		return null;
	}

	// === 1. Sort & detrend ===
	// Filter out entries with non-finite x or y (e.g. null y from blank cells)
	const sortedData = getFiniteDatasetPoints(activeFitKey)
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

async function performSinusoidalFit() {
	try {
		let A0 = parseNumericInput(document.getElementById('initial-A').value);
		let b0 = parseNumericInput(document.getElementById('initial-b').value);
		let k0 = parseNumericInput(document.getElementById('initial-k').value);
		let phi0 = parseNumericInput(document.getElementById('initial-phi').value);
		let c0 = parseNumericInput(document.getElementById('initial-c').value);

		if (!Number.isFinite(k0) || k0 <= 0) {
			const estimatedK = estimateKFromData();
			if (estimatedK !== null && Number.isFinite(estimatedK) && estimatedK > 0) {
				k0 = estimatedK;
				document.getElementById('initial-k').value = k0.toPrecision(8);
			} else {
				alert('Failed to estimate k. Please provide an initial value.');
				return;
			}
		}

		if (!Number.isFinite(A0) || !Number.isFinite(b0) || !Number.isFinite(phi0) || !Number.isFinite(c0)) {
			alert('Please provide valid initial parameters for Sinusoidal fit.');
			return;
		}

		const data = getFiniteDatasetPoints(activeFitKey);
		if (data.length < 4) {
			alert('Sinusoidal fit requires at least four valid data points.');
			return;
		}
		const fitTarget = captureFitTarget();
		const fitChoice = { kind: 'advanced', method: 'Sinusoidal' };

		let result = null;
		beginFitControlsBusy();
		try {
			result = await runWorkerFitWithFallback(
				'sinusoidal',
				{
					data,
					initial: { A: A0, b: b0, k: k0, phi: phi0, c: c0 }
				},
				() => solveSinusoidal(data, { A: A0, b: b0, k: k0, phi: phi0, c: c0 })
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
		const targetDatasetIndex = resolveFitTarget(fitTarget);
		if (targetDatasetIndex < 0) {
			showToast('Fit discarded because its dataset changed or was removed.');
			return;
		}

		const normalizedParams = {
			A: Number(params.A),
			b: Number(params.b),
			k: Number(params.k),
			phi: Number(params.phi),
			c: Number(params.c)
		};
		const keys = ['A', 'b', 'k', 'phi', 'c'];
		const toObject = values => Object.fromEntries(keys.map((key, i) => [key, values[i]]));
		const final = finalizeParametricFit(data, {
			names: ['A', 'b', 'k', '\\phi', 'c'],
			params: keys.map(key => normalizedParams[key]),
			model: (values, xValue) => evaluateSinusoidal(toObject(values), xValue)
		});
		const finalParams = toObject(final.params);
		const fitFunction = (xValue) => evaluateSinusoidal(finalParams, xValue);
		const { xFit, yFit } = sampleCurve(data, fitFunction, 300);
		const equation = buildSinusoidalEquation(finalParams);

		fittedCurves[targetDatasetIndex] = { x: xFit, y: yFit, equation: equation };
		updateResults(equation, data.map(p => p.x), data.map(p => p.y), fitFunction, targetDatasetIndex, final.solver || result, fitChoice, fitExtras(final));
		if (targetDatasetIndex === activeFitKey) {
			plotGraph(xFit, yFit);
		}
	} catch (error) {
		console.error('Error performing sinusoidal fit:', error);
		alert('An error occurred during sinusoidal fitting. Please check the console for details.');
	}
}


async function performGaussianFit() {
	try {
		let A0 = parseNumericInput(document.getElementById('initial-A-gaussian').value);
		let mu0 = parseNumericInput(document.getElementById('initial-mu').value);
		let sigma0 = parseNumericInput(document.getElementById('initial-sigma').value);
		let c0 = parseNumericInput(document.getElementById('initial-c-gaussian').value);

		if (!Number.isFinite(A0) || !Number.isFinite(mu0) || !Number.isFinite(sigma0) || !Number.isFinite(c0)) {
			alert('Please provide valid initial parameters for Gaussian fit.');
			return;
		}

		if (sigma0 === 0) sigma0 = 1e-6;
		if (sigma0 < 0) sigma0 = Math.abs(sigma0);

		const data = getFiniteDatasetPoints(activeFitKey);
		if (data.length < 4) {
			alert('Gaussian fit requires at least four valid data points.');
			return;
		}
		const fitTarget = captureFitTarget();
		const fitChoice = { kind: 'advanced', method: 'Gaussian' };

		let result = null;
		beginFitControlsBusy();
		try {
			result = await runWorkerFitWithFallback(
				'gaussian',
				{
					data,
					initial: { A: A0, mu: mu0, sigma: sigma0, c: c0 }
				},
				() => solveGaussian(data, { A: A0, mu: mu0, sigma: sigma0, c: c0 })
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
		const targetDatasetIndex = resolveFitTarget(fitTarget);
		if (targetDatasetIndex < 0) {
			showToast('Fit discarded because its dataset changed or was removed.');
			return;
		}

		const normalizedParams = {
			A: Number(params.A),
			mu: Number(params.mu),
			sigma: Math.abs(Number(params.sigma)),
			c: Number(params.c)
		};

		const keys = ['A', 'mu', 'sigma', 'c'];
		const toObject = values => ({ ...Object.fromEntries(keys.map((key, i) => [key, values[i]])), sigma: Math.abs(values[2]) });
		const final = finalizeParametricFit(data, {
			names: ['A', '\\mu', '\\sigma', 'c'],
			params: keys.map(key => normalizedParams[key]),
			model: (values, xValue) => evaluateGaussian(toObject(values), xValue)
		});
		final.params[2] = Math.abs(final.params[2]);
		if (final.parameters) final.parameters[2].value = final.params[2];
		const finalParams = toObject(final.params);
		const fitFunction = (xValue) => evaluateGaussian(finalParams, xValue);
		const { xFit, yFit } = sampleCurve(data, fitFunction, 300);
		const equation = buildGaussianEquation(finalParams);

		fittedCurves[targetDatasetIndex] = { x: xFit, y: yFit, equation: equation };
		updateResults(equation, data.map(p => p.x), data.map(p => p.y), fitFunction, targetDatasetIndex, final.solver || result, fitChoice, fitExtras(final));
		if (targetDatasetIndex === activeFitKey) {
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
