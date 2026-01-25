// App bootstrap

document.addEventListener("DOMContentLoaded", function() {
	// Ensure base dataset structures exist.
	if (!datasetHeaders[0]) datasetHeaders[0] = { x: 'x', y: 'y' };
	if (!datasetToggles[0]) datasetToggles[0] = { x: false, y: false };
	if (!datasetErrorTypes[0]) datasetErrorTypes[0] = { x: 'absolute', y: 'absolute' };

	// Initialise a clean table with defaults.
	clearRows(true);

	// Persist initial headers.
	datasetHeaders[0].x = document.getElementById('x-column-name').value || 'x';
	datasetHeaders[0].y = document.getElementById('y-column-name').value || 'y';

	// If the user edits the title manually, stop auto-updating it.
	const titleInput = document.getElementById('graph-title');
	if (titleInput) {
		titleInput.addEventListener('input', function() {
			titleWasAuto = false;
		});
	}

	// Fit UI initialisation.
	updateBasicFitEquation();
	const initialAdvancedFitMethod = document.getElementById('advanced-fit-method').value;
	changeAdvancedFitMethod();
	setInitialParameters(initialAdvancedFitMethod);

	// Dataset tabs.
	initializeDatasetTabsBar();

	// Combined plot inputs.
	initCombinedPlotInputs();

	// LaTeX mode toggle.
	const latexToggle = document.getElementById('latex-mode-toggle');
	if (latexToggle) {
		latexToggle.checked = false; // default off
		latexToggle.addEventListener('change', function() {
			latexMode = this.checked;
			updatePlotAndRenderLatex();
			// Re-render headers and uncertainty headings.
			loadHeaders();
			updateUncertaintyHeaders('x');
			updateUncertaintyHeaders('y');
			// Convert auto-title formatting if it has not been manually edited.
			updateGraphTitle();
		});
	}
});
