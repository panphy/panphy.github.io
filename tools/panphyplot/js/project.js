// Portable project files: versioned JSON, never executable JavaScript or saved HTML.
(function(root) {
	const FORMAT = 'PanPhyPlot';
	const VERSION = 1;
	const MAX_BYTES = 50 * 1024 * 1024;
	const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
	const finiteArray = value => Array.isArray(value) && value.every(Number.isFinite);
	const safeId = value => typeof value === 'string' && /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value);

	function validateState(state) {
		const invalid = () => { throw new Error('The project contains invalid sheets or fit data.'); };
		if (!isRecord(state) || !Array.isArray(state.sheets) || !state.sheets.length) invalid();
		const ids = new Set();
		const fitKeys = new Set();
		let cellCount = 0;
		state.sheets.forEach(sheet => {
			if (!isRecord(sheet) || !safeId(sheet.id) || ids.has(sheet.id) || !Array.isArray(sheet.columns) || !sheet.columns.length
				|| !Number.isInteger(sheet.rowCount) || sheet.rowCount < 1 || sheet.rowCount > 1000000) invalid();
			ids.add(sheet.id);
			sheet.columns.forEach(column => {
				if (!isRecord(column) || !safeId(column.id) || ids.has(column.id) || !Array.isArray(column.cells)
					|| column.cells.some(cell => typeof cell !== 'string')) invalid();
				ids.add(column.id);
				cellCount += Math.max(sheet.rowCount, column.cells.length);
				if (cellCount > 2000000) throw new Error('This project is too large to open.');
				if (column.role === 'Y') fitKeys.add(`${sheet.id}:${column.id}`);
			});
		});
		['fits', 'curves', 'customFits', 'extents'].forEach(store => {
			if (state[store] === undefined) return;
			if (!isRecord(state[store])) invalid();
			Object.entries(state[store]).forEach(([key, value]) => {
				if (!fitKeys.has(key) || !isRecord(value)) invalid();
				if (store === 'fits') {
					if (typeof value.equation !== 'string' || (value.parameters != null && (!Array.isArray(value.parameters)
						|| value.parameters.some(p => !isRecord(p) || typeof p.name !== 'string' || !Number.isFinite(p.value) || (p.uncertainty != null && !Number.isFinite(p.uncertainty)))))
						|| !Array.isArray(value.residuals) || value.residuals.some(p => !isRecord(p) || !Number.isFinite(p.x) || !Number.isFinite(p.y))) invalid();
				}
				if (store === 'curves' && (!finiteArray(value.x) || !Array.isArray(value.y) || value.x.length !== value.y.length
					|| value.y.some(y => y !== null && !Number.isFinite(y))
					|| (value.dataRange !== undefined && (!finiteArray(value.dataRange) || value.dataRange.length !== 2))
					|| (value.samples !== undefined && (!Number.isInteger(value.samples) || value.samples < 2 || value.samples > 3000)))) invalid();
				if (store === 'customFits' && (typeof value.formula !== 'string' || !isRecord(value.initialValues)
					|| (value.bounds !== undefined && !isRecord(value.bounds)))) invalid();
				if (store === 'extents' && ['from', 'to'].some(side => value[side] != null && !Number.isFinite(value[side]))) invalid();
			});
		});
	}

	function encode(state, view = {}) {
		validateState(state);
		return JSON.stringify({ format: FORMAT, version: VERSION, state, view }, null, 2);
	}

	function decode(text, model) {
		let project;
		try {
			project = JSON.parse(text, (key, value) => {
				if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Invalid property.');
				return value;
			});
		} catch {
			throw new Error('This is not a valid PanPhyPlot project file.');
		}
		if (!isRecord(project) || project.format !== FORMAT) throw new Error('Choose a PanPhyPlot project (.ppplot), rather than a CSV file.');
		if (project.version !== VERSION) throw new Error('This project uses an unsupported format version. Open it with a compatible version of PanPhyPlot.');
		validateState(project.state);
		return { state: model.normalizeState(project.state), view: isRecord(project.view) ? project.view : {} };
	}

	// Older browser saves can usually recover their model from full-precision parameters.
	function inferModel(result, curve) {
		if (curve.model) return curve.model;
		const params = result?.parameters?.map(p => p.value);
		const method = result?.choice?.method;
		if (result?.choice?.kind === 'custom' && params) return { kind: 'custom', formula: result.choice.formula, names: result.parameters.map(p => p.name), params };
		if (method === 'Linear') {
			if (params) return { kind: 'linear', params };
			const last = curve.x.length - 1;
			if (last > 0 && curve.x[last] !== curve.x[0] && curve.y[0] != null && curve.y[last] != null) {
				const m = (curve.y[last] - curve.y[0]) / (curve.x[last] - curve.x[0]);
				return { kind: 'linear', params: [m, curve.y[0] - m * curve.x[0]] };
			}
		}
		if (!params) return null;
		if (/^Polynomial-/.test(method)) return { kind: 'polynomial', params, mean: 0, spread: 1 };
		if (method === 'Exponential' && finiteArray(curve.dataRange)) return { kind: 'exponential', params, reference: (curve.dataRange[0] + curve.dataRange[1]) / 2 };
		if (['Power', 'Sinusoidal', 'Gaussian'].includes(method)) return { kind: method.toLowerCase(), params };
		return null;
	}

	function createEvaluator(model, math) {
		if (!isRecord(model) || !finiteArray(model.params)) throw new Error('Invalid saved fit model.');
		const p = model.params;
		const lengths = { linear: 2, exponential: 3, power: 4, sinusoidal: 5, gaussian: 4 };
		if (lengths[model.kind] && p.length !== lengths[model.kind]) throw new Error('Invalid saved fit parameters.');
		switch (model.kind) {
			case 'linear': return x => p[0] * x + p[1];
			case 'polynomial':
				if (!p.length || p.length > 4 || !Number.isFinite(model.mean) || !Number.isFinite(model.spread) || model.spread <= 0) break;
				return x => p.reduce((sum, value) => sum * ((x - model.mean) / model.spread) + value, 0);
			case 'exponential':
				if (!Number.isFinite(model.reference)) break;
				return x => p[0] * Math.exp(p[1] * (x - model.reference)) + p[2];
			case 'power': return x => !(x - p[2] > 0) && !Number.isInteger(p[1]) ? NaN : p[0] * Math.pow(x - p[2], p[1]) + p[3];
			case 'sinusoidal': return x => p[0] * Math.exp(p[1] * x) * Math.sin(p[2] * x - p[3]) + p[4];
			case 'gaussian':
				if (p[2] <= 0) break;
				return x => p[0] * Math.exp(-((x - p[1]) ** 2) / (2 * p[2] ** 2)) + p[3];
			case 'custom': {
				if (typeof model.formula !== 'string' || !Array.isArray(model.names) || model.names.length !== p.length
					|| !p.length || p.length > 5 || new Set(model.names).size !== model.names.length || model.names.includes('x') || model.names.some(name => !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) || !safeId(name))) break;
				const node = math.parse(model.formula);
				// Accept arithmetic only; a project cannot run assignments, property access or imports.
				const allowed = new Set(['ConstantNode', 'SymbolNode', 'OperatorNode', 'ParenthesisNode', 'FunctionNode']);
				const forbidden = new Set(['import', 'createUnit', 'evaluate', 'parse', 'compile', 'simplify', 'derivative', 'resolve', 'map', 'filter', 'forEach', 'chain', 'help', 'config', 'create']);
				node.traverse((child, path, parent) => {
					if (!allowed.has(child.type) || (child.type === 'ConstantNode' && typeof child.value !== 'number') || (child.type === 'FunctionNode' && (child.fn.type !== 'SymbolNode' || forbidden.has(child.fn.name) || typeof math[child.fn.name] !== 'function'))
						|| (child.type === 'SymbolNode' && !(parent?.type === 'FunctionNode' && parent.fn === child)
							&& !['x', ...model.names].includes(child.name) && typeof math[child.name] !== 'number')) throw new Error('Unsupported custom fit expression in project.');
				});
				const compiled = node.compile();
				return x => {
					try {
						const value = Number(compiled.evaluate(new Map([['x', x], ...model.names.map((name, i) => [name, p[i]])])));
						return Number.isFinite(value) ? value : NaN;
					} catch { return NaN; }
				};
			}
		}
		throw new Error('Unsupported saved fit model.');
	}

	const api = { FORMAT, VERSION, MAX_BYTES, encode, decode, inferModel, createEvaluator };
	if (typeof module === 'object' && module.exports) module.exports = api;
	else root.PanPhyPlotProject = api;
})(typeof globalThis === 'object' ? globalThis : this);

// Browser integration shares the same state and download helpers as CSV export.
const PROJECT_VIEW_FIELDS = ['fit-method', 'advanced-fit-method', 'initial-A', 'initial-b', 'initial-k', 'initial-phi', 'initial-c',
	'initial-A-gaussian', 'initial-mu', 'initial-sigma', 'initial-c-gaussian', 'combined-title', 'combined-x-label', 'combined-y-label'];
let projectFilename = 'PanPhyPlot project';

function captureProjectView() {
	return {
		fitTab: document.querySelector('.tab-content.active')?.id || 'BasicFit',
		fields: Object.fromEntries(PROJECT_VIEW_FIELDS.map(id => [id, document.getElementById(id).value])),
		combinedEdited: Object.fromEntries(['combined-title', 'combined-x-label', 'combined-y-label'].map(id => [id, document.getElementById(id).dataset.edited === 'true'])),
		symbolsOpen: document.getElementById('equation-symbols').open
	};
}

function restoreProjectView(view) {
	const fields = view.fields || {};
	['fit-method', 'advanced-fit-method'].forEach(id => {
		const input = document.getElementById(id);
		if (Array.from(input.options).some(option => option.value === fields[id])) input.value = fields[id];
	});
	updateBasicFitEquation();
	changeAdvancedFitMethod();
	const tab = ['BasicFit', 'AdvancedFit', 'CustomFit'].includes(view.fitTab) ? view.fitTab : 'BasicFit';
	const button = document.querySelectorAll('.tablink')[['BasicFit', 'AdvancedFit', 'CustomFit'].indexOf(tab)];
	openTab({ currentTarget: button }, tab);
	PROJECT_VIEW_FIELDS.filter(id => !['fit-method', 'advanced-fit-method'].includes(id)).forEach(id => {
		if (typeof fields[id] === 'string') document.getElementById(id).value = fields[id];
	});
	['combined-title', 'combined-x-label', 'combined-y-label'].forEach(id => {
		document.getElementById(id).dataset.edited = view.combinedEdited?.[id] === true ? 'true' : 'false';
	});
	document.getElementById('equation-symbols').open = view.symbolsOpen === true;
}

function restoreProjectFitFunctions() {
	Object.keys(fitFunctions).forEach(key => delete fitFunctions[key]);
	Object.entries(fittedCurves).forEach(([key, curve]) => {
		try {
			const model = window.PanPhyPlotProject.inferModel(datasetFitResults[key], curve);
			if (!model) return;
			fitFunctions[key] = window.PanPhyPlotProject.createEvaluator(model, math);
			curve.model = model;
		} catch (error) {
			console.warn('Saved fit remains visible, but needs fitting again before extending:', error);
		}
	});
}

function projectFitBusy() {
	return !!document.querySelector('.fit-button[aria-busy="true"]');
}

async function saveProject() {
	if (projectFitBusy()) return showToast('Wait for the current fit to finish before saving the project.');
	const answer = window.prompt('Filename for the project:', projectFilename);
	if (answer === null) return;
	try {
		// Flush the custom formula's debounced input before taking the snapshot.
		refreshCustomFitDefinition({ preserveUserValues: true, suppressSave: true });
		const filename = `${sanitizeFilename(answer, 'PanPhyPlot project').replace(/\.ppplot$/i, '')}.ppplot`;
		const text = window.PanPhyPlotProject.encode(buildPersistedState(), captureProjectView());
		await saveBlobWithFallback(new Blob([text], { type: 'application/json' }), filename, { title: 'Save PanPhyPlot project' });
		projectFilename = filename.replace(/\.ppplot$/i, '');
	} catch (error) {
		showToast(`Unable to save project. ${error.message}`, 6000);
	}
}

function prepareProject(text) {
	const project = window.PanPhyPlotProject.decode(text, PlotModel);
	// Validate evaluators before asking to replace anything, including custom expressions.
	Object.entries(project.state.curves).forEach(([key, curve]) => {
		if (curve.model) window.PanPhyPlotProject.createEvaluator(curve.model, math);
	});
	return project;
}

function commitProject(project) {
	if (persistenceDisabled || changedElsewhere) throw new Error('Finish the tour or resolve the other-tab changes before opening a project.');
	if (projectFitBusy()) throw new Error('Wait for the current fit to finish before opening a project.');
	// The original-data offer belongs to this browser, rather than the imported project.
	project.state.originalImportDecision = plotState.originalImportDecision;
	const serialized = JSON.stringify(project.state);
	// Storage failure leaves the current project intact, as with original-data import.
	localStorage.setItem(STORAGE_KEY, serialized);
	clearTimeout(saveTimeout);
	Object.keys(fitEpochs).forEach(key => invalidatePendingFit(key));
	loadState(project.state);
	lastSavedSerialized = serialized;
	document.getElementById('latex-mode-toggle').checked = latexMode;
	if (document.getElementById('popup-container').style.display === 'block') closePopup();
	forceReplot();
	switchSheet(plotState.activeSheet);
	restoreProjectView(project.view);
	refreshFitStaleness();
	renderActiveFitResult();
	flushSaveState();
}

async function handleProjectFile(event) {
	const file = event.target.files?.[0];
	event.target.value = '';
	if (!file) return;
	try {
		if (file.size > window.PanPhyPlotProject.MAX_BYTES) throw new Error('The project file is too large (maximum 50 MB).');
		const project = prepareProject(await file.text());
		if (!window.confirm(`Open “${file.name}”? This replaces all current sheets, graphs and fits. Save your current project first if you want to keep it.`)) return;
		commitProject(project);
		projectFilename = file.name.replace(/\.ppplot$/i, '');
		showToast('Project opened.');
	} catch (error) {
		showToast(`Unable to open project. ${error.message}`, 7000);
	}
}

function initializeProjects() {
	document.getElementById('save-project-button').addEventListener('click', saveProject);
	document.getElementById('open-project-button').addEventListener('click', () => {
		if (projectFitBusy()) return showToast('Wait for the current fit to finish before opening a project.');
		if (persistenceDisabled || changedElsewhere) return showToast('Finish the tour or resolve the other-tab changes before opening a project.');
		document.getElementById('project-file-input').click();
	});
	document.getElementById('project-file-input').addEventListener('change', handleProjectFile);
}
