// Shared state for PanPhyPlot (neo-beta). A classic script: the fitting code reads and
// assigns these top-level bindings directly, keyed by "<sheet id>:<Y column id>".
const NeoModel = window.PanPhyNeoModel;
const STORAGE_KEY = 'panphyplot-neo-state-v1';

let neoState = NeoModel.createState();
let activeFitKey = null;
let fittedCurves = {};
let datasetFitResults = {};
let customFitStates = {};
let latexMode = false;
const fitEpochs = {};

let saveTimeout = null;
// Set by the guided tour (neo-tour.js), which runs on practice data and must never overwrite the saved workspace.
let persistenceDisabled = false;
let lastSavedSerialized = null;

function debounce(func, wait) {
	let timeout;
	return function(...args) {
		clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(this, args), wait);
	};
}

function parseNumericInput(value) {
	return NeoModel.parseNumber(value);
}

function getActiveSheet() {
	return neoState.sheets[neoState.activeSheet];
}

function makeFitKey(sheet, seriesId) {
	return sheet && seriesId ? `${sheet.id}:${seriesId}` : null;
}

function resolveFitKey(key) {
	if (typeof key !== 'string') return null;
	const [sheetId, seriesId] = key.split(':');
	const sheet = neoState.sheets.find(entry => entry.id === sheetId);
	const series = sheet ? NeoModel.findSeries(sheet, seriesId) : null;
	return series ? { sheet, series } : null;
}

// The Y series the fit panel works on: the sheet's chosen one if it still exists, else the first.
function refreshActiveFitKey() {
	const sheet = getActiveSheet();
	const series = NeoModel.getSeries(sheet);
	if (!series.some(entry => entry.id === sheet.fitSeries)) {
		sheet.fitSeries = (series.find(entry => entry.xCol) || series[0] || {}).id || null;
	}
	activeFitKey = makeFitKey(sheet, sheet.fitSeries);
	return activeFitKey;
}

function getDatasetPoints(key = activeFitKey) {
	const target = resolveFitKey(key);
	return target ? NeoModel.getSeriesPoints(target.sheet, target.series) : [];
}

function getFiniteDatasetPoints(key = activeFitKey) {
	return getDatasetPoints(key);
}

// Every point's ±ΔY, or null if the series has no ΔY column or any point lacks a positive one.
function getFitSigmas(key = activeFitKey) {
	const target = resolveFitKey(key);
	if (!target || !target.series.yErrCol) return null;
	const sigmas = getDatasetPoints(key).map(point => point.yError);
	return sigmas.length && sigmas.every(sigma => sigma > 0) ? sigmas : null;
}

function getWeightingRequested() {
	return neoState.weightFits === true;
}

function getWeightingSigmas(key = activeFitKey) {
	return getWeightingRequested() ? getFitSigmas(key) : null;
}

function getDatasetFitSignature(key) {
	// ΔY is included: a weighted fit and χ²/ν both depend on it.
	return JSON.stringify(getDatasetPoints(key).map(({ x, y, yError }) => [x, y, yError]));
}

function invalidatePendingFit(key = activeFitKey) {
	fitEpochs[key] = (fitEpochs[key] || 0) + 1;
}

function captureFitTarget(key = activeFitKey) {
	invalidatePendingFit(key);
	return { key, epoch: fitEpochs[key], signature: getDatasetFitSignature(key) };
}

// A fit that finishes after its data changed, or after its series was deleted, is dropped.
function resolveFitTarget(target) {
	if (!target || !resolveFitKey(target.key)) return -1;
	return fitEpochs[target.key] === target.epoch && getDatasetFitSignature(target.key) === target.signature ? target.key : -1;
}

// Marks a fit outdated while its series' data differs from the data it was fitted to.
function refreshFitStaleness() {
	let changed = false;
	Object.keys(datasetFitResults).forEach((key) => {
		const result = datasetFitResults[key];
		if (!result || typeof result.signature !== 'string') return;
		const stale = result.signature !== getDatasetFitSignature(key);
		if (stale !== !!result.stale) {
			result.stale = stale;
			changed = true;
		}
	});
	return changed;
}

// Drops fits whose sheet or Y column no longer exists.
function pruneOrphanFits() {
	[datasetFitResults, fittedCurves, customFitStates].forEach((store) => {
		Object.keys(store).forEach((key) => {
			if (!resolveFitKey(key)) delete store[key];
		});
	});
}

function buildPersistedState() {
	return { ...neoState, latexMode, fits: datasetFitResults, curves: fittedCurves, customFits: customFitStates };
}

function saveState() {
	if (persistenceDisabled) return;
	try {
		const serialized = JSON.stringify(buildPersistedState());
		if (serialized === lastSavedSerialized) return;
		localStorage.setItem(STORAGE_KEY, serialized);
		lastSavedSerialized = serialized;
	} catch (error) {
		console.warn('Unable to save state:', error);
	}
}

function scheduleSaveState(delay = 500) {
	clearTimeout(saveTimeout);
	saveTimeout = setTimeout(saveState, delay);
}

function flushSaveState() {
	clearTimeout(saveTimeout);
	saveState();
}

// initialState (the tour's practice data) replaces the saved workspace, which is then left unread.
function loadState(initialState = null) {
	let saved = initialState;
	try {
		const text = initialState ? null : localStorage.getItem(STORAGE_KEY);
		if (text) saved = JSON.parse(text);
	} catch (error) {
		console.warn('Unable to load saved state:', error);
	}
	neoState = NeoModel.normalizeState(saved);
	latexMode = neoState.latexMode;
	datasetFitResults = neoState.fits;
	fittedCurves = neoState.curves;
	customFitStates = neoState.customFits;
	pruneOrphanFits();
	refreshActiveFitKey();
}

window.addEventListener('pagehide', flushSaveState);
document.addEventListener('visibilitychange', () => {
	if (document.visibilityState === 'hidden') flushSaveState();
});
