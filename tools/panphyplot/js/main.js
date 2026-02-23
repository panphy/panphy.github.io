// App bootstrap

document.addEventListener("DOMContentLoaded", function() {
	const savedState = loadState();
	const themeButton = document.getElementById('theme-button');

	const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
	const storedTheme = localStorage.getItem(THEME_KEY);
	const initialTheme = storedTheme || (prefersDark ? 'dark' : 'light');
	document.documentElement.setAttribute('data-theme', initialTheme);
	updateAppChromeTheme(initialTheme);


	function updateAppChromeTheme(theme) {
		const themeColorMeta = document.querySelector('meta[name="theme-color"]');
		const appleStatusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
		const isDarkTheme = theme === 'dark';

		if (themeColorMeta) {
			themeColorMeta.setAttribute('content', isDarkTheme ? '#0f1014' : '#f8f9fa');
		}

		if (appleStatusBarMeta) {
			appleStatusBarMeta.setAttribute('content', isDarkTheme ? 'black-translucent' : 'default');
		}
	}

	function updateThemeButton(theme) {
		if (themeButton) {
			themeButton.textContent = theme === 'dark' ? '🌙' : '☀️';
		}
	}

	updateThemeButton(initialTheme);

	window.addEventListener('pageshow', function() {
		const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
		updateAppChromeTheme(currentTheme);
	});

	if (themeButton) {
		themeButton.addEventListener('click', function() {
			const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
			const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
			document.documentElement.setAttribute('data-theme', nextTheme);
			localStorage.setItem(THEME_KEY, nextTheme);
			updateAppChromeTheme(nextTheme);
			updateThemeButton(nextTheme);
			lastPlotState.data = null;
			lastPlotState.layout = null;
			updatePlotAndRenderLatex();
			const popupContainer = document.getElementById('popup-container');
			if (popupContainer && popupContainer.style.display === 'block') {
				plotAllDatasets();
			}
		});
	}

	if (savedState) {
		rawData = Array.isArray(savedState.rawData) && savedState.rawData.length ? savedState.rawData : [[]];
		activeSet = Math.min(savedState.activeSet ?? 0, rawData.length - 1);
		datasetHeaders = savedState.datasetHeaders || {};
		datasetNames = typeof normalizeDatasetNamesState === 'function'
			? normalizeDatasetNamesState(savedState.datasetNames, rawData.length)
			: (savedState.datasetNames || {});
		datasetToggles = savedState.datasetToggles || {};
		datasetErrorTypes = savedState.datasetErrorTypes || {};
		fittedCurves = typeof normalizeFittedCurvesState === 'function'
			? normalizeFittedCurvesState(savedState.fittedCurves, rawData.length)
			: (savedState.fittedCurves || {});
		datasetFitResults = typeof normalizeDatasetFitResultsState === 'function'
			? normalizeDatasetFitResultsState(savedState.datasetFitResults, rawData.length)
			: (savedState.datasetFitResults || {});
		customFitStates = typeof normalizeCustomFitStates === 'function'
			? normalizeCustomFitStates(savedState.customFitStates, rawData.length)
			: (savedState.customFitStates || {});
		dataset1XValues = savedState.dataset1XValues || [];
		latexMode = !!savedState.latexMode;
		titleWasAuto = savedState.titleWasAuto ?? true;

		rawData.forEach((dataset, index) => {
			if (!Array.isArray(dataset)) rawData[index] = [];
			if (!datasetHeaders[index]) datasetHeaders[index] = { x: 'x', y: 'y' };
			if (!datasetToggles[index]) datasetToggles[index] = { x: false, y: false };
			if (!datasetErrorTypes[index]) datasetErrorTypes[index] = { x: 'absolute', y: 'absolute' };
			if (!customFitStates[index]) customFitStates[index] = { formula: '', initialValues: {} };
		});
	} else {
		// Ensure base dataset structures exist.
		if (!datasetHeaders[0]) datasetHeaders[0] = { x: 'x', y: 'y' };
		if (!datasetToggles[0]) datasetToggles[0] = { x: false, y: false };
		if (!datasetErrorTypes[0]) datasetErrorTypes[0] = { x: 'absolute', y: 'absolute' };
		if (!customFitStates[0]) customFitStates[0] = { formula: '', initialValues: {} };

		// Initialise a clean table with defaults.
		clearRows(true);

		// Persist initial headers.
		datasetHeaders[0].x = document.getElementById('x-column-name').value || 'x';
		datasetHeaders[0].y = document.getElementById('y-column-name').value || 'y';
	}

	// Fit UI initialisation.
	updateBasicFitEquation();
	const initialAdvancedFitMethod = document.getElementById('advanced-fit-method').value;
	changeAdvancedFitMethod();
	setInitialParameters(initialAdvancedFitMethod);
	initializeCustomFitUI();

	// Dataset tabs.
	initializeDatasetTabsBar();

	// Populate UI from saved state when available.
	if (savedState) {
		populateTableFromActiveDataset();
		loadHeaders();
		loadToggles();
		loadErrorTypes();
	}
	loadCustomFitUiForActiveDataset();

	if (datasetFitResults.hasOwnProperty(activeSet)) {
		const result = datasetFitResults[activeSet];
		renderFittingResult(result.equation, result.rSquared);
	} else {
		clearFittingResultDisplay();
	}

	// Combined plot inputs.
	initCombinedPlotInputs();

	const setupGlobalUncertaintyAutoApply = (axis) => {
		const input = document.getElementById(`global-${axis}-uncertainty`);
		if (!input) return;

		const applyIfReady = () => {
			if (input.value.trim() === '') return;
			applyGlobalUncertainties(axis);
		};

		input.addEventListener('change', applyIfReady);
		input.addEventListener('keydown', function(event) {
			if (event.key === 'Enter') {
				event.preventDefault();
				applyIfReady();
			}
		});
	};

	setupGlobalUncertaintyAutoApply('x');
	setupGlobalUncertaintyAutoApply('y');

	if (savedState && savedState.combinedPlot) {
		const combinedTitleInput = document.getElementById('combined-title');
		const combinedXInput = document.getElementById('combined-x-label');
		const combinedYInput = document.getElementById('combined-y-label');
		if (combinedTitleInput && typeof savedState.combinedPlot.title === 'string') {
			combinedTitleInput.value = savedState.combinedPlot.title;
		}
		if (combinedXInput && typeof savedState.combinedPlot.xLabel === 'string') {
			combinedXInput.value = savedState.combinedPlot.xLabel;
		}
		if (combinedYInput && typeof savedState.combinedPlot.yLabel === 'string') {
			combinedYInput.value = savedState.combinedPlot.yLabel;
		}
	}

	const titleInput = document.getElementById('graph-title');
	if (titleInput) {
		if (savedState && typeof savedState.graphTitle === 'string') {
			titleInput.value = savedState.graphTitle;
		}
		titleInput.addEventListener('input', function() {
			titleWasAuto = false;
			scheduleSaveState();
		});
	}

	if (titleWasAuto) {
		updateGraphTitle(true);
	}

	// LaTeX mode toggle.
	const latexToggle = document.getElementById('latex-mode-toggle');
	if (latexToggle) {
		latexToggle.checked = latexMode;
		latexToggle.addEventListener('change', function() {
			latexMode = this.checked;
			updatePlotAndRenderLatex();
			// Re-render headers and uncertainty headings.
			loadHeaders();
			updateUncertaintyHeaders('x');
			updateUncertaintyHeaders('y');
			// Convert auto-title formatting if it has not been manually edited.
			updateGraphTitle();
			scheduleSaveState();
		});
	}

	initializeFitEquationCopyInteractions();
	if (typeof initializeDataProcessing === 'function') {
		initializeDataProcessing();
	}

	updatePlotAndRenderLatex();
	scheduleSaveState();
});
