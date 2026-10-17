// PanPhyPlot (neo-beta) bootstrap.
document.addEventListener('DOMContentLoaded', () => {
	loadState(typeof getTourInitialState === 'function' ? getTourInitialState() : null);
	if (typeof math !== 'undefined') neoState.sheets.forEach(sheet => NeoModel.recomputeFormulas(sheet, math));

	window.PanPhyThemeToggle.mount(document.getElementById('theme-button'));
	window.addEventListener('panphy:theme-change', () => {
		forceReplot();
		plotGraph();
		if (document.getElementById('popup-container').style.display === 'block') plotAllSheets();
	});

	const latexToggle = document.getElementById('latex-mode-toggle');
	latexToggle.checked = latexMode;
	latexToggle.addEventListener('change', () => {
		latexMode = latexToggle.checked;
		neoState.latexMode = latexMode;
		renderTable();
		syncTitleInput();
		plotGraph();
		scheduleSaveState();
	});

	initializeInterface();
	initializeDialogs();
	initializeCopying();
	updateBasicFitEquation();
	changeAdvancedFitMethod();
	setInitialParameters(document.getElementById('advanced-fit-method').value);
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
	};
	drawWhenReady();
});
