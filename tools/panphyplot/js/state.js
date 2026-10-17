// Shared state for PanPhyPlot. A classic script: the fitting code reads and
// assigns these top-level bindings directly, keyed by "<sheet id>:<Y column id>".
const PlotModel = window.PanPhyPlotModel;
const STORAGE_KEY = 'panphyplot-neo-state-v1';

let plotState = PlotModel.createState();
let activeFitKey = null;
let fittedCurves = {};
let datasetFitResults = {};
let customFitStates = {};
let latexMode = false;
const fitEpochs = {};

let saveTimeout = null;
// Set by the guided tour (tour.js), which runs on practice data and must never overwrite the saved workspace.
let persistenceDisabled = false;
// Set when another tab saves this workspace: this tab stops saving until the person chooses a version.
let changedElsewhere = false;
let lastSavedSerialized = null;

function debounce(func, wait) {
	let timeout;
	return function(...args) {
		clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(this, args), wait);
	};
}

function parseNumericInput(value) {
	return PlotModel.parseNumber(value);
}

function getActiveSheet() {
	return plotState.sheets[plotState.activeSheet];
}

function makeFitKey(sheet, seriesId) {
	return sheet && seriesId ? `${sheet.id}:${seriesId}` : null;
}

function resolveFitKey(key) {
	if (typeof key !== 'string') return null;
	const [sheetId, seriesId] = key.split(':');
	const sheet = plotState.sheets.find(entry => entry.id === sheetId);
	const series = sheet ? PlotModel.findSeries(sheet, seriesId) : null;
	return series ? { sheet, series } : null;
}

// The Y series the fit panel works on: the sheet's chosen one if it still exists, else the first.
// Only a series shown on the graph can be fitted. The chosen one stays while it is visible and has
// data; otherwise the first visible series with data takes over, and with none visible there is no fit.
function getFittableSeries(sheet) {
	return PlotModel.getSeries(sheet).filter(entry => entry.xCol && !sheet.hiddenSeries.includes(entry.id));
}

function refreshActiveFitKey() {
	const sheet = getActiveSheet();
	const candidates = getFittableSeries(sheet);
	const hasPoints = entry => PlotModel.getSeriesPoints(sheet, entry).length > 0;
	const current = candidates.find(entry => entry.id === sheet.fitSeries);
	const anyWithPoints = candidates.some(hasPoints);
	if (!current || (!hasPoints(current) && anyWithPoints)) {
		sheet.fitSeries = (candidates.find(hasPoints) || candidates[0] || {}).id || null;
	}
	activeFitKey = makeFitKey(sheet, sheet.fitSeries);
	return activeFitKey;
}

function getDatasetPoints(key = activeFitKey) {
	const target = resolveFitKey(key);
	return target ? PlotModel.getSeriesPoints(target.sheet, target.series) : [];
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
	return plotState.weightFits === true;
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
	return { ...plotState, latexMode, fits: datasetFitResults, curves: fittedCurves, customFits: customFitStates };
}

function saveState() {
	if (persistenceDisabled || changedElsewhere) return;
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
	plotState = PlotModel.normalizeState(saved);
	latexMode = plotState.latexMode;
	datasetFitResults = plotState.fits;
	fittedCurves = plotState.curves;
	customFitStates = plotState.customFits;
	pruneOrphanFits();
	refreshActiveFitKey();
}

// Every tab shares one saved workspace, so a save from another tab would be overwritten by this
// tab's next autosave. Pause instead, and let the person reload or keep this tab's version.
window.addEventListener('storage', (event) => {
	if (persistenceDisabled || (event.key !== STORAGE_KEY && event.key !== null)) return;
	if (event.key !== null && event.newValue === lastSavedSerialized) return;
	changedElsewhere = true;
	clearTimeout(saveTimeout);
	if (typeof onWorkspaceChangedElsewhere === 'function') onWorkspaceChangedElsewhere();
});

// Overwrites the other tab's save with this tab's work and resumes saving.
function keepThisTabVersion() {
	changedElsewhere = false;
	lastSavedSerialized = null;
	saveState();
}

window.addEventListener('pagehide', flushSaveState);
document.addEventListener('visibilitychange', () => {
	if (document.visibilityState === 'hidden') flushSaveState();
});

// The decision and imported sheets are saved together in a single atomic storage write.
// A failed write leaves both workspaces and the decision untouched, so retry is safe.
function commitOriginalImport(original, accepted) {
	if (persistenceDisabled || changedElsewhere) throw new Error('This workspace changed in another tab. Reload before importing.');
	const candidate = PlotModel.normalizeState(buildPersistedState());
	if (accepted) window.PanPhyPlotLegacyImport.appendOriginalSheets(candidate, original);
	candidate.originalImportDecision = accepted ? 'accepted' : 'declined';
	const serialized = JSON.stringify(candidate);
	localStorage.setItem(STORAGE_KEY, serialized);
	loadState(candidate);
	lastSavedSerialized = serialized;
}

function offerOriginalImport() {
	if (persistenceDisabled || plotState.originalImportDecision || document.querySelector('.phone-gate').offsetParent !== null) return;
	let original;
	try {
		original = JSON.parse(localStorage.getItem('panphyplot-state-v2'));
		// Probe a copy; never modify the open workspace just to decide whether to offer.
		if (!window.PanPhyPlotLegacyImport.appendOriginalSheets(PlotModel.createState(), original).length) return;
	} catch (error) {
		console.warn('Unable to read original PanPhyPlot data:', error);
		return;
	}
	const dialog = document.getElementById('original-import-dialog');
	const decide = (accepted) => {
		try {
			commitOriginalImport(original, accepted);
			closeDialog(dialog.id);
			switchSheet(plotState.activeSheet);
		} catch (error) {
			document.getElementById('original-import-message').textContent = `Unable to save this choice. Your saved work is unchanged. ${error.message}`;
		}
	};
	document.getElementById('original-import-accept').addEventListener('click', () => decide(true));
	document.getElementById('original-import-decline').addEventListener('click', () => decide(false));
	// Escape counts as declining, and must also persist the choice before closing.
	dialog.addEventListener('cancel', (event) => { event.preventDefault(); decide(false); });
	dialog.addEventListener('click', (event) => { if (event.target === dialog) decide(false); });
	dialog.showModal();
}
