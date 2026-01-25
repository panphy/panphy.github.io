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
