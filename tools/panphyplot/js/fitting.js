// Curve fitting for PanPhyPlot: a copy of /misc/panphyplotog/js/curve-fitting.js that fits
// the chosen Y series, keyed by activeFitKey, and records the data each fit used.
(function() {

const CUSTOM_FIT_MAX_PARAMETERS = 5;
const CUSTOM_FIT_SAMPLE_POINTS = 300;
const CUSTOM_FIT_PENALTY = 1e6;
const CUSTOM_FIT_MULTI_START_LIMIT = 48;
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


function refreshCustomFitFormulaIfChanged() {
	const { formulaInput } = getCustomFitUiElements();
	if (formulaInput && (formulaInput.dataset.renderedFormula !== formulaInput.value
		|| formulaInput.dataset.renderedFitKey !== activeFitKey)) {
		refreshCustomFitDefinition({ preserveUserValues: true });
	}
}

const debouncedRefreshCustomFitDefinition = debounce(refreshCustomFitFormulaIfChanged, 180);
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
	const xSpan = (Math.abs(xMax - xMin) || 1);
	const ySpan = (Math.abs(yMax - yMin) || Math.abs(yMin) || 1);
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

function getCustomFitGuessByName(parameterName, stats, expression = null) {
	const key = String(parameterName || '').trim().toLowerCase();
	if (/^(x0|mu|center)$/.test(key)) return stats.xMean;
	if (/^(phi|phase)$/.test(key)) return 0;
	let role = '';
	// Inspect how the parameter enters exp/sin/cos, so an arbitrary name in
	// exp(-x/q) gets an x-scale, while exp(q*x) gets an inverse x-scale.
	if (expression) expression.traverse(node => {
		if (!node.isFunctionNode || !['exp', 'sin', 'cos'].includes(node.fn?.name)) return;
		const argument = node.args[0];
		if (!argument) return;
		let hasX = false, hasParameter = false, denominator = false;
		argument.traverse(child => {
			if (child.isSymbolNode && child.name === 'x') hasX = true;
			if (child.isSymbolNode && child.name === parameterName) hasParameter = true;
			if (child.isOperatorNode && child.op === '/') child.args[1].traverse(term => {
				if (term.isSymbolNode && term.name === parameterName) denominator = true;
			});
		});
		if (hasX && hasParameter) role = denominator ? 'span' : node.fn.name === 'exp' ? 'rate' : 'frequency';
	});
	if (role === 'span' || /^(tau|sigma|w|width)$/.test(key)) return stats.xSpan / 4;
	if (role === 'rate' || /^(rate|decay)$/.test(key)) return -1 / stats.xSpan;
	if (role === 'frequency' || /^(k|omega|freq|frequency)$/.test(key)) return 2 * Math.PI / stats.xSpan;
	if (/^(a|amp|amplitude)$/.test(key)) return stats.ySpan / 2;
	if (/^(c|offset|intercept|b0)$/.test(key)) return stats.yMean;
	if (/^(m|slope)$/.test(key)) return stats.slope;
	return 1;
}

function formatCustomFitInputValue(value) {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) return '';
	return Number(numeric.toPrecision(8)).toString();
}

function syncCustomFitInputsToState() {
	const state = ensureCustomFitState(activeFitKey);
	state.bounds ||= {};
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

	const previousBounds = parameterList.querySelector('.custom-fit-bounds');
	const wasOpen = previousBounds?.dataset.fitKey === activeFitKey && previousBounds.open;
	parameterList.innerHTML = '';
	if (!Array.isArray(parameterNames) || parameterNames.length === 0) {
		parameterEmpty.style.display = 'block';
		return;
	}

	parameterEmpty.style.display = 'none';
	const state = ensureCustomFitState(activeFitKey);
	const header = document.createElement('div');
	header.className = 'custom-fit-initial-header';
	const heading = document.createElement('span');
	heading.textContent = 'Initial guess';
	const resetButton = document.createElement('button');
	resetButton.type = 'button';
	resetButton.className = 'advanced-fit-reset-btn';
	resetButton.textContent = 'Auto guesses';
	resetButton.title = 'Recalculate initial parameter values from current data';
	resetButton.addEventListener('click', resetCustomFitParametersFromData);
	header.append(heading, resetButton);
	parameterList.appendChild(header);

	const bounds = document.createElement('details');
	bounds.className = 'custom-fit-bounds';
	bounds.dataset.fitKey = activeFitKey;
	bounds.open = wasOpen || parameterNames.some(name =>
		['min', 'max'].some(side => (state.bounds?.[name]?.[side] ?? '') !== ''));
	const summary = document.createElement('summary');
	summary.textContent = 'Parameter bounds (optional)';
	bounds.appendChild(summary);
	const boundsHeader = document.createElement('div');
	boundsHeader.className = 'custom-fit-bounds-row custom-fit-bounds-header';
	for (const text of ['', 'Min', 'Max']) {
		const cell = document.createElement('span');
		cell.textContent = text;
		boundsHeader.appendChild(cell);
	}
	bounds.appendChild(boundsHeader);

	parameterNames.forEach(name => {
		const row = document.createElement('div');
		row.className = 'custom-fit-parameter-row';
		const label = document.createElement('label');
		label.textContent = name;
		label.setAttribute('for', `custom-fit-param-${name}`);
		const input = document.createElement('input');
		input.type = 'number';
		input.step = 'any';
		input.id = `custom-fit-param-${name}`;
		input.className = 'custom-fit-parameter-input';
		input.setAttribute('data-param', name);
		input.setAttribute('aria-label', `${name} initial guess`);
		input.value = formatCustomFitInputValue(valuesMap[name]);
		input.addEventListener('input', handleCustomFitParameterInput);
		input.addEventListener('change', handleCustomFitParameterInput);
		row.append(label, input);
		parameterList.appendChild(row);

		const boundRow = document.createElement('div');
		boundRow.className = 'custom-fit-bounds-row';
		const boundName = document.createElement('span');
		boundName.className = 'custom-fit-bound-name';
		boundName.textContent = name;
		boundRow.appendChild(boundName);
		for (const side of ['min', 'max']) {
			const bound = document.createElement('input');
			bound.type = 'number';
			bound.step = 'any';
			bound.placeholder = '—';
			bound.className = 'custom-fit-bound';
			bound.setAttribute('aria-label', `${name} ${side === 'min' ? 'minimum' : 'maximum'} (optional)`);
			bound.value = state.bounds?.[name]?.[side] ?? '';
			bound.addEventListener('input', () => {
				state.bounds ||= {}; state.bounds[name] ||= {};
				state.bounds[name][side] = bound.value;
				scheduleSaveState();
			});
			boundRow.appendChild(bound);
		}
		bounds.appendChild(boundRow);
	});
	parameterList.appendChild(bounds);
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
	// Avoid replacing focused parameter controls when an unchanged formula loses focus.
	elements.formulaInput.dataset.renderedFormula = rawFormula;
	elements.formulaInput.dataset.renderedFitKey = activeFitKey;

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
		const autoGuess = getCustomFitGuessByName(name, stats, parsedExpression);
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
		initialValues: { ...state.initialValues },
		bounds: state.bounds || {}
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
	elements.formulaInput.addEventListener('change', refreshCustomFitFormulaIfChanged);

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

// Only take the direct path when symbolic derivatives prove the formula is
// affine in all fitted parameters. Nonlinear/custom domain cases retain LM.
function solveLinearCustomFit(data, analysis, bounds) {
	try {
		const names = analysis.parameterNames;
		const derivatives = names.map(name => math.derivative(analysis.parsedExpression, name));
		let affine = true;
		// Discontinuous functions can have a constant symbolic derivative without
		// being affine (for example A + floor(A)); never use that shortcut for them.
		analysis.parsedExpression.traverse(node => {
			if (!node.isFunctionNode && !node.isConditionalNode && !node.isRelationalNode) return;
			node.traverse(child => { if (child.isSymbolNode && names.includes(child.name)) affine = false; });
		});
		derivatives.forEach(node => node.traverse(child => {
			if (child.isSymbolNode && names.includes(child.name)) affine = false;
		}));
		if (!affine) return null;
		const compiled = derivatives.map(node => node.compile());
		const zero = names.map(() => 0);
		const rows = data.map(point => compiled.map(node => Number(node.evaluate({ x: point.x }))));
		const values = data.map(point => point.y - evaluateCustomExpression(analysis.compiledExpression, names, zero, point.x));
		const fit = fitCore.linearLeastSquares(rows, values);
		if (!fit || fit.coefficients.some((value, i) => (bounds[i]?.min != null && value < bounds[i].min) || (bounds[i]?.max != null && value > bounds[i].max))) return null;
		return { params: fit.coefficients, cost: fit.cost, converged: true, reason: 'linear-least-squares', iterations: 0 };
	} catch { return null; }
}

function buildCustomFitInitialCandidates(baseParams, automatic = baseParams, bounds = []) {
	const candidates = [], seen = new Set();
	const add = values => {
		const p = values.map((value, i) => Math.min(bounds[i]?.max ?? Infinity, Math.max(bounds[i]?.min ?? -Infinity, value)));
		const key = p.map(value => value.toPrecision(12)).join('|');
		if (p.every(Number.isFinite) && !seen.has(key)) { seen.add(key); candidates.push(p); }
	};
	add(baseParams.slice()); add(automatic.slice());
	// Cover orders of magnitude, including sign changes; retain both the supplied
	// vector and a newly computed automatic vector after data or unit changes.
	for (let i = 0; i < baseParams.length; i++) {
		for (const factor of [0.01, 0.1, 0.5, 2, 10, 100, -1]) {
			const p = automatic.slice();
			p[i] = (automatic[i] || Math.abs(baseParams[i]) || 1) * factor;
			add(p);
		}
	}
	for (const factor of [0.1, 10, -1]) add(automatic.map(value => value * factor));
	return candidates.slice(0, CUSTOM_FIT_MULTI_START_LIMIT);
}

function fitCurve() {
	if (typeof updateData === 'function') {
		updateData();
	}
	if (!activeFitKey) {
		alert('Show a series on the graph to fit it: tap it in the Series card.');
		return;
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
	const data = getFiniteDatasetPoints(activeFitKey);
	const guess = method === 'Gaussian' ? fitCore.estimateGaussian(data) : method === 'Sinusoidal' ? fitCore.estimateSinusoidal(data) : null;
	if (!guess) return;
	const ids = method === 'Gaussian'
		? { A: 'initial-A-gaussian', mu: 'initial-mu', sigma: 'initial-sigma', c: 'initial-c-gaussian' }
		: { A: 'initial-A', b: 'initial-b', k: 'initial-k', phi: 'initial-phi', c: 'initial-c' };
	Object.entries(ids).forEach(([key, id]) => {
		if (Number.isFinite(guess[key])) document.getElementById(id).value = guess[key].toPrecision(10);
	});
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





// ---------- Weighting and parameter uncertainties ----------
// Every fit hands its model and unweighted best parameters to finalizeParametricFit, which
// refines them by least squares, weights by 1/σ² when asked (σ² = ΔY² + (f′(x)·ΔX)², the
// effective variance, re-weighted as the fit settles) and takes each parameter's ± from the
// Jacobian.

function modelSlope(model, x, span) {
	const step = Math.max(span * 1e-5, Math.abs(x) * Number.EPSILON * 8, Number.MIN_VALUE);
	return (model(x + step) - model(x - step)) / (2 * step);
}

// Each point's σ for the current model, or null if any point has no usable uncertainty.
function effectiveSigmas(data, model) {
	if (!data.some(point => point.yError > 0 || point.xError > 0)) return null;
	const { min, max } = minMaxFinite(data.map(point => point.x));
	const span = max - min || 1;
	const sigmas = data.map((point) => {
		const sy = point.yError > 0 ? point.yError : 0;
		const sx = point.xError > 0 ? point.xError * modelSlope(model, point.x, span) : 0;
		return Math.sqrt(sy * sy + sx * sx);
	});
	return sigmas.every(sigma => Number.isFinite(sigma) && sigma > 0) ? sigmas : null;
}

function numericJacobian(model, params, data, scales = []) {
	return data.map(({ x }) => params.map((value, index) => {
		const step = Math.max((Math.abs(scales[index]) || Math.abs(value) || 1) * 1e-6, Math.abs(value) * Number.EPSILON * 8);
		const plus = params.slice();
		const minus = params.slice();
		plus[index] = value + step;
		minus[index] = value - step;
		const derivative = (model(plus, x) - model(minus, x)) / (2 * step);
		return Number.isFinite(derivative) ? derivative : 0;
	}));
}

function runLeastSquares(data, params, model, sigmas, options = {}) {
	const residualFn = (p, pts) => pts.map((point, index) => (model(p, point.x) - point.y) / (sigmas ? sigmas[index] : 1));
	return fitCore.solveScaledLeastSquares(data, params, residualFn, { maxIterations: 400, tolerance: 1e-12, ...options });
}

// spec: { names, params, model(params, x), refine } — refine: false keeps closed-form parameters.
function finalizeParametricFit(data, spec) {
	let params = spec.params.slice();
	let solver = null;
	const modelAt = p => x => spec.model(p, x);
	const sse = p => data.reduce((sum, point) => sum + (spec.model(p, point.x) - point.y) ** 2, 0);
	if (spec.refine !== false) {
		const refined = runLeastSquares(data, params, spec.model, null, spec);
		const before = sse(params);
		const after = refined ? sse(refined.params) : Infinity;
		if (refined && after <= before) {
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
				const result = runLeastSquares(data, params, spec.model, sigmas, spec);
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
	const atBound = params.some((value, i) => ['min', 'max'].some(side => spec.bounds?.[i]?.[side] != null && Math.abs(value - spec.bounds[i][side]) <= 1e-8 * (Math.abs(spec.scales?.[i]) || Math.abs(value) || 1)));
	if (atBound) note += ' A parameter reached its bound; symmetric parameter uncertainties are not shown.';
	const uncertainties = !atBound && residuals.every(Number.isFinite)
		? PanPhyPlotStats.parameterUncertainties(numericJacobian(spec.model, params, data, spec.scales), residuals, weighted ? sigmas : null)
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
	// Every fit arrives here with its line sampled across the data; extend it as asked.
	const curve = fittedCurves[datasetIndex];
	if (curve && Array.isArray(curve.x) && curve.x.length) {
		curve.dataRange = [curve.x[0], curve.x[curve.x.length - 1]];
		curve.samples = curve.x.length;
		fitFunctions[datasetIndex] = fitFunction;
		applyFitExtent(datasetIndex);
	}
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
		result.chi2 = PanPhyPlotStats.chiSquared(residuals.map(point => point.y), sigmas);
		result.dof = x.length - parameterCount;
	}
	if (extras.statusOverride) result.status = extras.statusOverride;
	if (extras.statusNote) result.status += extras.statusNote;
	delete result.chiSigmas;
	delete result.statusNote;
	delete result.statusOverride;
	datasetFitResults[datasetIndex] = result;
	if (datasetIndex === activeFitKey) {
		renderFittingResult(equation, result.rSquared);
		syncFitExtendControl();
	}
	scheduleSaveState();
}

// Redraws a fit's line from the start of its data, or further back, to the end of its data, or
// further forward. A curve keeps its density of samples; x values its model cannot evaluate,
// such as those outside a custom formula's domain, are left as gaps.
// Returns false when the fit's function is gone (after a reload), so the line cannot be redrawn.
function applyFitExtent(key) {
	const curve = fittedCurves[key];
	const fitFunction = fitFunctions[key];
	if (!curve || !Array.isArray(curve.dataRange) || typeof fitFunction !== 'function') return false;
	const [low, high] = curve.dataRange;
	const extent = fitExtents[key] || {};
	const from = Number.isFinite(extent.from) ? Math.min(extent.from, low) : low;
	const to = Number.isFinite(extent.to) ? Math.max(extent.to, high) : high;
	const samples = curve.samples || curve.x.length;
	let count = samples;
	if (samples > 2 && high > low) count = Math.min(Math.max(Math.round(samples * (to - from) / (high - low)), samples), 3000);
	const xFit = count <= 2 ? [from, to] : Array.from({ length: count }, (_, i) => from + (i * (to - from)) / (count - 1));
	curve.x = xFit;
	curve.y = xFit.map((value) => {
		try {
			const y = fitFunction(value);
			return Number.isFinite(y) ? y : null;
		} catch (error) {
			return null;
		}
	});
	return true;
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
	if (!activeFitKey) {
		alert('Show a series on the graph to fit it: tap it in the Series card.');
		return;
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
		if (!activeFitKey) {
			alert('Show a series on the graph to fit it: tap it in the Series card.');
			return;
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

		const bounds = analysis.parameterNames.map(name => {
			const saved = analysis.bounds[name] || {};
			return Object.fromEntries(['min', 'max'].filter(side => String(saved[side] ?? '').trim() !== '').map(side => [side, Number(saved[side])]));
		});
		if (bounds.some(bound => Object.values(bound).some(value => !Number.isFinite(value)) || (bound.min != null && bound.max != null && bound.min >= bound.max))) {
			alert('Parameter bounds must be finite, with minimum below maximum.'); return;
		}
		const stats = getCustomFitDataStats();
		const automatic = analysis.parameterNames.map(name => getCustomFitGuessByName(name, stats, analysis.parsedExpression));
		const scales = automatic.map(value => Math.abs(value) || 1);
		const starts = buildCustomFitInitialCandidates(initialParams, automatic, bounds);
		const residualFn = buildCustomResidualFn(analysis.compiledExpression, analysis.parameterNames, CUSTOM_FIT_PENALTY);
		const jacobianFn = buildCustomJacobianFn(analysis.compiledExpression, analysis.parameterNames);

		let solved = solveLinearCustomFit(data, analysis, bounds);
		beginFitControlsBusy();
		try {
			if (!solved) solved = await runWorkerFitWithFallback(
				'custom',
				{
					data,
					formula: analysis.normalizedFormula,
					parameterNames: analysis.parameterNames,
					starts, scales, bounds,
					maxIterations: 350,
					tolerance: 1e-10
				},
				() => solveCustomMultiStart(data, starts, residualFn, jacobianFn, { maxIterations: 350, tolerance: 1e-10, scales, bounds })
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
			refine: false, scales, bounds,
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
		const line = PanPhyPlotStats.linearFit(x, y);
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


// The polynomial is fitted in u = (x − mean)/spread, which keeps high powers well conditioned,
// and reported in x. This matrix turns the u coefficients (highest power first) into x ones:
// a_k = Σ_{p ≥ k} b_p C(p, k) (−mean)^{p−k} / spread^p.
function polynomialToXMatrix(degree, meanX, stdX) {
	const binomial = (n, k) => {
		let value = 1;
		for (let i = 1; i <= k; i++) value = (value * (n - k + i)) / i;
		return value;
	};
	return Array.from({ length: degree + 1 }, (_, row) => {
		const k = degree - row;
		return Array.from({ length: degree + 1 }, (_, col) => {
			const p = degree - col;
			return p < k ? 0 : (binomial(p, k) * (-meanX) ** (p - k)) / stdX ** p;
		});
	});
}

function buildPolynomialEquation(coefficients) {
	const degree = coefficients.length - 1;
	let equation = 'y = ';
	let first = true;
	coefficients.forEach((c, i) => {
		const power = degree - i;
		if (c === 0) return;
		const absC = formatFitNumber(Math.abs(c));
		const sign = c >= 0 ? (first ? '' : ' + ') : (first ? '-' : ' - ');
		const term = power === 0 ? `${absC}` : power === 1 ? `${absC}x` : `${absC}x^{${power}}`;
		equation += `${sign}${term}`;
		first = false;
	});
	return first ? 'y = 0' : equation;
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
		const uCoefficients = final.params;
		const fitFunction = xi => model(uCoefficients, xi);
		const { xFit, yFit } = sampleCurve(data, fitFunction, 100);
		// Carry the coefficients and their covariance from u to x: a = T b, Cov(a) = T Cov(b) Tᵀ.
		const transform = polynomialToXMatrix(degree, fit.meanX, fit.stdX);
		const xCoefficients = transform.map(row => row.reduce((sum, value, col) => sum + value * uCoefficients[col], 0));
		const residuals = data.map(point => point.y - fitFunction(point.x));
		const covariance = residuals.every(Number.isFinite)
			? PanPhyPlotStats.parameterCovariance(numericJacobian(model, uCoefficients, data), residuals, final.weighted ? final.chiSigmas : null)
			: null;
		const xUncertainties = covariance && transform.map(row => {
			let variance = 0;
			row.forEach((ti, i) => row.forEach((tj, j) => { variance += ti * covariance[i][j] * tj; }));
			return Math.sqrt(Math.max(variance, 0));
		});
		final.params = xCoefficients;
		final.parameters = xUncertainties && xUncertainties.every(Number.isFinite)
			? xCoefficients.map((value, i) => ({ name: `a_{${degree - i}}`, value, uncertainty: xUncertainties[i] }))
			: null;
		const equation = buildPolynomialEquation(xCoefficients);
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
		if (data.length < 3) { alert('Exponential fit requires at least three valid data points.'); return; }
		const solution = fitCore.solveExponential(data);
		if (!solution) { alert('Unable to find a finite exponential fit.'); return; }
		const { A, b, c, xRef } = solution.params;
		const model = ([amplitude, rate, baseline], x) => amplitude * Math.exp(rate * (x - xRef)) + baseline;
		const final = finalizeParametricFit(data, { names: ['A', 'b', 'c'], params: [A, b, c], model, refine: false });
		const params = final.params;
		const fitFunction = x => model(params, x);
		const xFit = buildFitDomainFromData(data, 100), yFit = xFit.map(fitFunction);
		// A is the amplitude at the fixed reference x shown in the equation.
		const equation = formatExpEquation(params[0], params[1], params[2], true, xRef);
		fittedCurves[activeFitKey] = { x: xFit, y: yFit, equation };
		updateResults(equation, data.map(p => p.x), data.map(p => p.y), fitFunction, activeFitKey, final.solver || solution, { kind: 'basic', method: 'Exponential' }, fitExtras(final));
		plotGraph(xFit, yFit);
	} catch (error) {
		console.error('Error performing exponential fit:', error);
		alert('An error occurred during exponential fitting. Please check the console for details.');
	}
}

const solveShiftedPowerLaw = fromFitCore('solveShiftedPowerLaw');
const evaluateShiftedPower = fromFitCore('evaluateShiftedPower');

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
			refine: false,
			scales: [Math.abs(solution.params.A) || 1, 1, minMaxFinite(data.map(point => point.x)).max - minMaxFinite(data.map(point => point.x)).min, Math.abs(solution.params.c) || 1],
			isValidParams: p => p[2] < minMaxFinite(data.map(point => point.x)).min,
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
		// Only diagnose parameter ambiguity when the solver has evidence for it.
		if (solution.ambiguous) {
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
	return fitCore.estimateSinusoidal(getFiniteDatasetPoints(activeFitKey))?.k ?? null;
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
		if (data.length < 5) {
			alert('Sinusoidal fit requires at least five valid data points.');
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
			isValidParams: p => p[2] > 0,
			scales: [Math.abs(normalizedParams.A) || 1, normalizedParams.k, normalizedParams.k, 1, Math.abs(normalizedParams.c) || 1],
			params: keys.map(key => normalizedParams[key]),
			refine: false,
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
		const toObject = values => ({ ...Object.fromEntries(keys.map((key, i) => [key, values[i]])), sigma: values[2] });
		const final = finalizeParametricFit(data, {
			names: ['A', '\\mu', '\\sigma', 'c'],
			scales: [Math.abs(normalizedParams.A) || 1, normalizedParams.sigma, normalizedParams.sigma, Math.abs(normalizedParams.c) || 1],
			isValidParams: p => p[2] > 0,
			params: keys.map(key => normalizedParams[key]),
			refine: false,
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
	resetCustomFitParametersFromData,
	applyFitExtent
});
})();
