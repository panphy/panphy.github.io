// Shared state for PanPhyPlot
let rawData = []; // Each element will be an array of data points
let activeSet = 0; // Index of the current active dataset
let datasetHeaders = {}; // Object to store headers per dataset, e.g. {0: {x: 'x', y: 'y'}, 1: {x: 'Time', y: 'Distance'}}
let datasetToggles = {}; // Global object to hold fitted curves by dataset index.
let datasetErrorTypes = {}; // stores the error type per axis per dataset, e.g. { 0: { x: 'absolute', y: 'absolute' }, 1: { x: 'percentage', y: 'percentage' } }
let fittedCurves = {};
let datasetFitResults = {}; // e.g. { 0: { equation: "...", rSquared: "..." }, 1: { ... } }
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
const STORAGE_KEY = 'panphyplot-state-v1';
const THEME_KEY = 'panphyplot-theme';

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

function buildPersistedState() {
	const graphTitleInput = document.getElementById('graph-title');
	const combinedTitleInput = document.getElementById('combined-title');
	const combinedXInput = document.getElementById('combined-x-label');
	const combinedYInput = document.getElementById('combined-y-label');

	return {
		rawData,
		activeSet,
		datasetHeaders,
		datasetToggles,
		datasetErrorTypes,
		fittedCurves,
		datasetFitResults,
		dataset1XValues,
		latexMode,
		titleWasAuto,
		graphTitle: graphTitleInput ? graphTitleInput.value : '',
		combinedPlot: {
			title: combinedTitleInput ? combinedTitleInput.value : '',
			xLabel: combinedXInput ? combinedXInput.value : '',
			yLabel: combinedYInput ? combinedYInput.value : ''
		}
	};
}

function saveState() {
	try {
		const state = buildPersistedState();
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
		const saved = localStorage.getItem(STORAGE_KEY);
		if (!saved) return null;
		return JSON.parse(saved);
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

function getDatasetPoints(index = activeSet) {
	const dataset = rawData[index];
	return Array.isArray(dataset) ? dataset : [];
}

function getFiniteDatasetPoints(index = activeSet) {
	return getDatasetPoints(index).filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
}
