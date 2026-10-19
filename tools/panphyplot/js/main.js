// Small-screen users can choose to continue in this app. The choice lasts for this visit.
function initializeSmallScreenWarning() {
	const screenQuery = window.matchMedia('(max-width: 599px), (max-height: 500px) and (pointer: coarse)');
	const dialog = document.getElementById('small-screen-warning');
	let accepted = false;
	const showWarning = () => {
		if (screenQuery.matches && !accepted && !dialog.open) dialog.showModal();
	};
	document.getElementById('small-screen-continue').addEventListener('click', () => {
		accepted = true;
		dialog.close();
		offerOriginalImport();
	});
	const decline = () => window.location.assign('/');
	document.getElementById('small-screen-decline').addEventListener('click', decline);
	dialog.addEventListener('cancel', (event) => {
		event.preventDefault();
		decline();
	});
	screenQuery.addEventListener('change', () => {
		if (!screenQuery.matches && dialog.open) {
			dialog.close();
			offerOriginalImport();
		} else showWarning();
	});
	showWarning();
}

// PanPhyPlot bootstrap.
document.addEventListener('DOMContentLoaded', () => {
	loadState(typeof getTourInitialState === 'function' ? getTourInitialState() : null);
	if (typeof math !== 'undefined') plotState.sheets.forEach(sheet => PlotModel.recomputeFormulas(sheet, math));

	window.PanPhyThemeToggle.mount(document.getElementById('theme-button'));
	window.addEventListener('panphy:theme-change', () => {
		forceReplot();
		plotGraph();
		// Series colours differ between the themes' palettes.
		renderTable();
		refreshWorkspaceChrome();
		if (document.getElementById('popup-container').style.display === 'block') plotAllSheets();
	});

	const latexToggle = document.getElementById('latex-mode-toggle');
	latexToggle.checked = latexMode;
	latexToggle.addEventListener('change', () => {
		latexMode = latexToggle.checked;
		plotState.latexMode = latexMode;
		renderTable();
		syncTitleInput();
		plotGraph();
		renderFitSeriesSelect();
		refreshWorkspaceChrome();
		scheduleSaveState();
	});

	initializeInterface();
	initializeDialogs();
	initializeCopying();
	initializeProjects();
	initializePaneDividers();
	updateBasicFitEquation();
	changeAdvancedFitMethod();
	initializeCustomFitUI();

	renderSheetTabs();
	renderTable();
	renderFitSeriesSelect();
	loadCustomFitUiForActiveDataset();
	renderActiveFitResult();
	refreshFitStaleness();
	renderFitDiagnostics();
	syncTitleInput(true);

	// Plotly loads deferred; draw once it is available.
	const drawWhenReady = () => {
		if (typeof Plotly === 'undefined') {
			setTimeout(drawWhenReady, 50);
			return;
		}
		plotGraph();
		refreshWorkspaceChrome();
		// Panes change size without a window resize (stacking, the residual strip), so watch them.
		if (typeof ResizeObserver === 'function') {
			const resize = debounce(() => {
				['plot', 'residual-plot', 'popup-plot'].forEach((id) => {
					const element = document.getElementById(id);
					if (element && element.data && element.offsetParent !== null) Plotly.Plots.resize(element);
				});
			}, 60);
			const observer = new ResizeObserver(resize);
			['plot', 'residual-wrap'].forEach(id => observer.observe(document.getElementById(id)));
		}
	};
	drawWhenReady();
	importLinkedData();
	initializeSmallScreenWarning();
	offerOriginalImport();
});
