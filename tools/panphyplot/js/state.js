// Shared state for PanPhyPlot
let rawData = []; // Each element will be an array of data points
let activeSet = 0; // Index of the current active dataset
let datasetHeaders = {}; // Object to store headers per dataset, e.g. {0: {x: 'x', y: 'y'}, 1: {x: 'Time', y: 'Distance'}}
let datasetNames = {}; // Optional custom names per dataset index, e.g. {0: 'Trial A', 1: 'Control'}
let datasetToggles = {}; // Global object to hold fitted curves by dataset index.
let datasetErrorTypes = {}; // stores the error type per axis per dataset, e.g. { 0: { x: 'absolute', y: 'absolute' }, 1: { x: 'percentage', y: 'percentage' } }
let fittedCurves = {};
let datasetFitResults = {}; // e.g. { 0: { equation: "...", rSquared: "..." }, 1: { ... } }
let customFitStates = {}; // per-dataset custom fit drafts, e.g. { 0: { formula: 'A*x+c', initialValues: { A: '1', c: '0' } } }
let dataset1XValues = [];
let latexMode = false; // false by default: plain text mode
let titleWasAuto = true; // track whether graph title should auto-update

let lastPlotState = {
	data: null,
	layout: null
};

rawData.push([]);
datasetHeaders[0] = { x: 'x', y: 'y' }; // At initialization, for dataset 0:
datasetToggles[0] = { x: false, y: false };
datasetErrorTypes[0] = { x: 'absolute', y: 'absolute' };

let isSyncing = false;
const STATE_SCHEMA_VERSION = 2;
const STORAGE_KEY = 'panphyplot-state-v2';
const LEGACY_STORAGE_KEYS = ['panphyplot-state-v1'];
const THEME_KEY = 'panphyplot-theme';
const DATASET_NAME_MAX_LENGTH = 20;

function debounce(func, wait) {
	let timeout;
	return function(...args) {
		const later = () => {
			clearTimeout(timeout);
			func.apply(this, args);
		};
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}

let saveTimeout;

function getUiStateSnapshotFromDom() {
	const graphTitleInput = document.getElementById('graph-title');
	const combinedTitleInput = document.getElementById('combined-title');
	const combinedXInput = document.getElementById('combined-x-label');
	const combinedYInput = document.getElementById('combined-y-label');

	return {
		graphTitle: graphTitleInput ? graphTitleInput.value : '',
		combinedPlot: {
			title: combinedTitleInput ? combinedTitleInput.value : '',
			xLabel: combinedXInput ? combinedXInput.value : '',
			yLabel: combinedYInput ? combinedYInput.value : ''
		}
	};
}

function normalizePersistedUiState(uiState = {}) {
	const graphTitle = typeof uiState.graphTitle === 'string' ? uiState.graphTitle : '';
	const combinedPlotInput = uiState.combinedPlot && typeof uiState.combinedPlot === 'object'
		? uiState.combinedPlot
		: {};

	return {
		graphTitle,
		combinedPlot: {
			title: typeof combinedPlotInput.title === 'string' ? combinedPlotInput.title : '',
			xLabel: typeof combinedPlotInput.xLabel === 'string' ? combinedPlotInput.xLabel : '',
			yLabel: typeof combinedPlotInput.yLabel === 'string' ? combinedPlotInput.yLabel : ''
		}
	};
}

function buildCorePersistedState() {
	return {
		schemaVersion: STATE_SCHEMA_VERSION,
		rawData,
		activeSet,
		datasetHeaders,
		datasetNames,
		datasetToggles,
		datasetErrorTypes,
		fittedCurves,
		datasetFitResults,
		customFitStates,
		dataset1XValues,
		latexMode,
		titleWasAuto
	};
}

function buildPersistedState(uiState = getUiStateSnapshotFromDom()) {
	return {
		...buildCorePersistedState(),
		...normalizePersistedUiState(uiState)
	};
}

function migratePersistedState(savedState, sourceKey = STORAGE_KEY) {
	if (!savedState || typeof savedState !== 'object') return null;
	const migrated = { ...savedState };
	const detectedVersion = Number.isInteger(migrated.schemaVersion)
		? migrated.schemaVersion
		: (sourceKey === 'panphyplot-state-v1' ? 1 : 1);

	// v1 -> v2: introduce explicit schemaVersion and normalized UI slice.
	if (detectedVersion < 2) {
		const normalizedUiState = normalizePersistedUiState({
			graphTitle: migrated.graphTitle,
			combinedPlot: migrated.combinedPlot
		});
		migrated.graphTitle = normalizedUiState.graphTitle;
		migrated.combinedPlot = normalizedUiState.combinedPlot;
	}

	if (!Array.isArray(migrated.rawData) || migrated.rawData.length === 0) {
		migrated.rawData = [[]];
	}
	const maxActive = Math.max(0, migrated.rawData.length - 1);
	const active = Number(migrated.activeSet);
	migrated.activeSet = Number.isInteger(active) ? Math.min(Math.max(active, 0), maxActive) : 0;
	migrated.schemaVersion = STATE_SCHEMA_VERSION;

	return migrated;
}

function saveState() {
	try {
		const state = buildPersistedState();
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		for (const legacyKey of LEGACY_STORAGE_KEYS) {
			if (legacyKey !== STORAGE_KEY) {
				localStorage.removeItem(legacyKey);
			}
		}
	} catch (error) {
		console.warn('Unable to save state:', error);
	}
}

function scheduleSaveState(delay = 200) {
	clearTimeout(saveTimeout);
	saveTimeout = setTimeout(saveState, delay);
}

function loadState() {
	try {
		const candidateKeys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
		for (const key of candidateKeys) {
			const saved = localStorage.getItem(key);
			if (!saved) continue;

			let parsed = null;
			try {
				parsed = JSON.parse(saved);
			} catch (parseError) {
				console.warn('Unable to parse saved state:', parseError);
				continue;
			}

			const migrated = migratePersistedState(parsed, key);
			if (!migrated) continue;

			if (key !== STORAGE_KEY) {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
			}

			return migrated;
		}

		return null;
	} catch (error) {
		console.warn('Unable to load state:', error);
		return null;
	}
}

function normalizeFittedCurvesState(savedCurves, datasetCount) {
	const normalized = {};
	if (!savedCurves || typeof savedCurves !== 'object') return normalized;

	for (let index = 0; index < datasetCount; index++) {
		const curve = savedCurves[index];
		if (!curve || !Array.isArray(curve.x) || !Array.isArray(curve.y)) continue;

		const maxLen = Math.min(curve.x.length, curve.y.length);
		if (maxLen === 0) continue;

		const x = [];
		const y = [];
		for (let i = 0; i < maxLen; i++) {
			const xi = Number(curve.x[i]);
			const yi = Number(curve.y[i]);
			if (!Number.isFinite(xi) || !Number.isFinite(yi)) continue;
			x.push(xi);
			y.push(yi);
		}

		if (!x.length) continue;

		normalized[index] = {
			x,
			y,
			equation: typeof curve.equation === 'string' ? curve.equation : ''
		};
	}

	return normalized;
}

function normalizeDatasetFitResultsState(savedResults, datasetCount) {
	const normalized = {};
	if (!savedResults || typeof savedResults !== 'object') return normalized;

	for (let index = 0; index < datasetCount; index++) {
		const result = savedResults[index];
		if (!result || typeof result !== 'object') continue;

		const equation = typeof result.equation === 'string' ? result.equation.trim() : '';
		if (!equation) continue;

		const rSquared = typeof result.rSquared === 'string'
			? result.rSquared
			: String(result.rSquared ?? '');
		normalized[index] = { equation, rSquared };
	}

	return normalized;
}

function normalizeDatasetNamesState(savedNames, datasetCount) {
	const normalized = {};
	if (!savedNames || typeof savedNames !== 'object') return normalized;

	for (let index = 0; index < datasetCount; index++) {
		const rawName = savedNames[index];
		if (typeof rawName !== 'string') continue;
		const trimmed = rawName.trim();
		if (!trimmed) continue;
		normalized[index] = trimmed.slice(0, DATASET_NAME_MAX_LENGTH);
	}

	return normalized;
}

function normalizeCustomFitStates(savedStates, datasetCount) {
	const normalized = {};
	if (!savedStates || typeof savedStates !== 'object') return normalized;

	for (let index = 0; index < datasetCount; index++) {
		const saved = savedStates[index];
		if (!saved || typeof saved !== 'object') continue;

		const formula = typeof saved.formula === 'string' ? saved.formula : '';
		const initialValues = {};
		if (saved.initialValues && typeof saved.initialValues === 'object') {
			Object.keys(saved.initialValues).forEach((key) => {
				const trimmedKey = String(key || '').trim();
				if (!trimmedKey) return;
				const rawValue = saved.initialValues[key];
				const value = rawValue === undefined || rawValue === null ? '' : String(rawValue);
				initialValues[trimmedKey] = value;
			});
		}

		normalized[index] = { formula, initialValues };
	}

	return normalized;
}

function getDatasetPoints(index = activeSet) {
	const dataset = rawData[index];
	return Array.isArray(dataset) ? dataset : [];
}

function getFiniteDatasetPoints(index = activeSet) {
	return getDatasetPoints(index).filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
}
