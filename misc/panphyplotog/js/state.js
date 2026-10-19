// Local state for the introductory single-dataset app. Original multi-dataset saves are read-only.
let rawData = [[]];
const activeSet = 0;
let datasetHeaders = {0: {x:'x',y:'y'}};
let datasetToggles = {0: {x:false,y:false}};
let datasetErrorTypes = {0: {x:'absolute',y:'absolute'}};
let fittedCurves = {};
let datasetFitResults = {};
let datasetDraftRows = {};
let datasetTitles = {};
let dataset1XValues = [];
let titleWasAuto = true;
let isSyncing = false;
const datasetFitEpochs = {};
const lastPlotState = {plot: {data:null,layout:null}};
const STATE_SCHEMA_VERSION = 1;
const STORAGE_KEY = 'panphyplotog-intro-state-v1';
const LEGACY_STORAGE_KEYS = ['panphyplot-state-v2','panphyplot-state-v1'];
let saveTimeout;
let lastSavedSerialized = null;
let persistenceDisabled = false;
let changedElsewhere = false;
function parseNumericInput(value) {
	const text = String(value ?? '').trim();
	if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) return NaN;
	const number = Number(text);
	return Number.isFinite(number) ? number : NaN;
}

function invalidatePendingFit(index = activeSet) {
	datasetFitEpochs[index] = (datasetFitEpochs[index] || 0) + 1;
}

function getDatasetFitSignature(index) {
	return JSON.stringify(getFiniteDatasetPoints(index).map(({ x, y }) => [x, y]));
}

function saveActiveGraphTitle() {
	const input = document.getElementById('graph-title');
	if (input) datasetTitles[activeSet] = { text: input.value, automatic: titleWasAuto };
}

function loadActiveGraphTitle() {
	const saved = datasetTitles[activeSet];
	titleWasAuto = saved ? saved.automatic : true;
	const input = document.getElementById('graph-title');
	if (input) input.value = saved ? saved.text : '';
}

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

function scheduleSaveState(delay = 500) {
	clearTimeout(saveTimeout);
	saveTimeout = setTimeout(saveState, delay);
}

function flushSaveState() {
	clearTimeout(saveTimeout);
	saveState();
}

function keepThisTabVersion() {
	changedElsewhere = false;
	lastSavedSerialized = null;
	saveState();
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
			const xi = parseNumericInput(curve.x[i]);
			const yi = parseNumericInput(curve.y[i]);
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
		const residuals = Array.isArray(result.residuals)
			? result.residuals.filter(point => point && Number.isFinite(point.x) && Number.isFinite(point.y)) : [];
		normalized[index] = {
			equation, rSquared, residuals,
			stale: result.stale === true,
			status: typeof result.status === 'string' ? result.status : 'Saved fit. Click Fit Curve to update it.',
			rmse: Number.isFinite(result.rmse) ? result.rmse : null,
			choice: result.choice && typeof result.choice === 'object' ? result.choice : null
		};
	}

	return normalized;
}

function normalizeDatasetDraftRows(saved, datasetCount) {
	const normalized = {};
	for (let index = 0; index < datasetCount; index++) {
		if (!Array.isArray(saved?.[index])) continue;
		normalized[index] = saved[index].map(row => Object.fromEntries(
			['xValue', 'yValue', 'xErrorValue', 'yErrorValue'].map(key => [key, typeof row?.[key] === 'string' ? row[key] : ''])
		));
	}
	return normalized;
}

function normalizeDatasetTitles(saved, datasetCount) {
	const normalized = {};
	for (let index = 0; index < datasetCount; index++) {
		if (typeof saved?.[index]?.text !== 'string') continue;
		normalized[index] = { text: saved[index].text, automatic: saved[index].automatic !== false };
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
function buildPersistedState() {
    saveActiveGraphTitle();
    return {schemaVersion:STATE_SCHEMA_VERSION, rawData:[rawData[0]], activeSet:0,
        datasetHeaders, datasetToggles, datasetErrorTypes, fittedCurves, datasetFitResults,
        datasetDraftRows, datasetTitles, dataset1XValues, titleWasAuto,
        graphTitle:document.getElementById('graph-title')?.value || ''};
}

function migratePersistedState(saved, sourceKey = STORAGE_KEY) {
    if (!saved || typeof saved !== 'object' || !Array.isArray(saved.rawData) || !saved.rawData.length) return null;
    const active = Number(saved.activeSet);
    const index = Number.isInteger(active) && active >= 0 && active < saved.rawData.length ? active : 0;
    const pick = (name, fallback) => ({0:saved[name]?.[index] ?? fallback});
    const headers = pick('datasetHeaders', {x:'x',y:'y'});
    const title = saved.datasetTitles?.[index] || {text:saved.graphTitle || '',automatic:saved.titleWasAuto !== false};
    const result = saved.datasetFitResults?.[index];
    const basic = result && result.choice?.kind === 'basic';
    return {schemaVersion:STATE_SCHEMA_VERSION, activeSet:0,
        rawData:[Array.isArray(saved.rawData[index]) ? saved.rawData[index] : []],
        datasetHeaders:headers, datasetToggles:pick('datasetToggles',{x:false,y:false}),
        datasetErrorTypes:pick('datasetErrorTypes',{x:'absolute',y:'absolute'}),
        datasetDraftRows:Array.isArray(saved.datasetDraftRows?.[index]) ? pick('datasetDraftRows',[]) : {},
        datasetTitles:{0:title}, titleWasAuto:title.automatic !== false, graphTitle:title.text,
        dataset1XValues:index === 0 && Array.isArray(saved.dataset1XValues) ? saved.dataset1XValues : [],
        fittedCurves:basic && saved.fittedCurves?.[index] ? pick('fittedCurves',{}) : {},
        datasetFitResults:basic ? {0:{...result,equation:formatEquationText(result.equation)}} : {},
        migratedFromLegacy:sourceKey !== STORAGE_KEY};
}

function saveState() {
    if (persistenceDisabled || changedElsewhere) return;
    try {
        const serialized = JSON.stringify(buildPersistedState());
        if (serialized === lastSavedSerialized) return;
        localStorage.setItem(STORAGE_KEY, serialized);
        lastSavedSerialized = serialized;
    } catch (error) { console.warn('Unable to save state:', error); }
}

function loadState() {
    for (const key of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
        try {
            const saved = localStorage.getItem(key);
            if (!saved) continue;
            const migrated = migratePersistedState(JSON.parse(saved), key);
            if (migrated) return migrated;
        } catch (error) { console.warn('Unable to read saved state:', error); }
    }
    return null;
}

window.addEventListener('pagehide', flushSaveState);
window.addEventListener('visibilitychange', () => { if(document.visibilityState === 'hidden') flushSaveState(); });
window.addEventListener('storage', event => {
    if(persistenceDisabled || (event.key !== STORAGE_KEY && event.key !== null)) return;
    if(event.key !== null && event.newValue === lastSavedSerialized) return;
    changedElsewhere = true;
    clearTimeout(saveTimeout);
    if(typeof onWorkspaceChangedElsewhere === 'function') onWorkspaceChangedElsewhere();
});
