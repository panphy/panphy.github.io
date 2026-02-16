// UI and data management

const debouncedUpdatePlotAndRenderLatex = debounce(updatePlotAndRenderLatex, 150);
const debouncedUpdateData = debounce(updateData, 300);

function formatRowInputValue(value) {
	if (value === undefined || value === null) return '';
	return String(value);
}

function getErrorColumnDisplay(axis) {
	const toggle = document.getElementById(`toggle-${axis}-error`);
	return toggle && toggle.checked ? 'table-cell' : 'none';
}

function buildDataRowHtml(options = {}, wrapInTr = false) {
	const {
		xValue = '',
		yValue = '',
		xErrorValue = '',
		yErrorValue = '',
		xErrorDisplay = getErrorColumnDisplay('x'),
		yErrorDisplay = getErrorColumnDisplay('y')
	} = options;

	const rowHtml = `
                <td><input type="text" class="x-input" onkeydown="navigateTable(event)" oninput="debouncedUpdateData()" placeholder="0" value="${formatRowInputValue(xValue)}"></td>
                <td><input type="text" class="y-input" onkeydown="navigateTable(event)" oninput="debouncedUpdateData()" placeholder="0" value="${formatRowInputValue(yValue)}"></td>
                <td class="error-column" style="display: ${xErrorDisplay};"><input type="text" class="x-error-input" onkeydown="navigateTable(event)" placeholder="±0" oninput="debouncedUpdateData()" value="${formatRowInputValue(xErrorValue)}" /></td>
                <td class="error-column" style="display: ${yErrorDisplay};"><input type="text" class="y-error-input" onkeydown="navigateTable(event)" placeholder="±0" oninput="debouncedUpdateData()" value="${formatRowInputValue(yErrorValue)}" /></td>
            `;

	return wrapInTr ? `<tr>${rowHtml}</tr>` : rowHtml;
}

function isValidPercentageUncertainty(value) {
	return Number.isFinite(value) && value > 0;
}

function isValidUncertaintyForType(value, errorType) {
	if (errorType === 'percentage') return isValidPercentageUncertainty(value);
	return Number.isFinite(value);
}

function syncDataset1XValues() {
	dataset1XValues = getDatasetPoints(0)
		.filter(point => Number.isFinite(point.x))
		.map(point => point.x);
}

function parseMarkdownTableLine(line) {
	const rawLine = String(line || '').trim();
	if (!rawLine) return [];
	const cells = rawLine.split('|');
	if (cells.length && cells[0].trim() === '') cells.shift();
	if (cells.length && cells[cells.length - 1].trim() === '') cells.pop();
	return cells.map(cell => cell.trim());
}


		function initializeTable(initialRows = 7) {
			const tableBody = document.querySelector('#data-table tbody');
			// Create the default empty rows
			for (let i = 0; i < initialRows; i++) {
				const newRow = tableBody.insertRow();
				newRow.innerHTML = buildDataRowHtml({
					xErrorDisplay: 'none',
					yErrorDisplay: 'none'
				});
			}
			// Update the active dataset with the new (empty) rows.
			updateData();
		}


	function updateDatasetTabsBar() {
		const tabsBar = document.querySelector('.dataset-tabs-bar');
		if (!tabsBar) return;

		// Clear all tabs except the Add Dataset button.
		const existingTabs = Array.from(tabsBar.querySelectorAll('.dataset-tab'));
		existingTabs.forEach(tab => tab.remove());

		// For each dataset, create a tab element.
		rawData.forEach((dataset, index) => {
			const tab = document.createElement('div');
			tab.classList.add('dataset-tab');
			if (index === activeSet) {
				tab.classList.add('active');
			}
			// Create a span for the label (e.g., "Dataset 1")
			const labelSpan = document.createElement('span');
			labelSpan.classList.add('tab-label');
			labelSpan.textContent = `Dataset ${index + 1}`;
			tab.appendChild(labelSpan);

			// Create the close button. (Do not add a close icon if there is only one dataset.)
			if (rawData.length > 1) {
				const closeSpan = document.createElement('span');
				closeSpan.classList.add('tab-close');
				closeSpan.textContent = '×';
				// When the close button is clicked, remove this dataset.
				closeSpan.addEventListener('click', function(e) {
					// prevent the click from also firing the tab-switch event
					e.stopPropagation();
					removeDataset(index);
				});
				tab.appendChild(closeSpan);
			}

			// Clicking on a tab should switch to that dataset.
			tab.addEventListener('click', function() {
				switchDataset(index);
			});

			// Insert the new tab before the Add Dataset button.
			// (We assume the Add Dataset button remains as the last element.)
			const addBtn = tabsBar.querySelector('.add-dataset-btn');
			tabsBar.insertBefore(tab, addBtn);
		});
	}


	function switchDataset(index) {
		if (index < 0 || index >= rawData.length) {
			console.error("Invalid dataset index.");
			return;
		}
		activeSet = index;
		titleWasAuto = true;
		updateDatasetTabsBar();

		// Repopulate the table UI with data from the active dataset.
		populateTableFromActiveDataset();

		// Load header values for this dataset.
		loadHeaders();

		// Restore uncertainty toggle state.
		loadToggles();

		// Restore error type settings.
		loadErrorTypes();

		// Update the graph and LaTeX-rendered labels.
		updatePlotAndRenderLatex();
		updateLabels('x');
		updateLabels('y');

		// Update the combined plot input boxes with the active dataset’s header values.
		updateCombinedPlotInputsToActive();

		// Restore or clear the fitting result for the current dataset.
		const fitEquationElement = document.getElementById('fit-equation');
		const rSquaredElement = document.getElementById('r-squared-container');
		if (datasetFitResults.hasOwnProperty(activeSet)) {
			const result = datasetFitResults[activeSet];
			fitEquationElement.innerHTML = `\\(${result.equation}\\)`;
			fitEquationElement.style.display = 'block';
			rSquaredElement.innerHTML = `\\( R^2 = ${result.rSquared} \\)`;
			rSquaredElement.style.display = 'block';
			safeTypeset(fitEquationElement);
			safeTypeset(rSquaredElement);
		} else {
			fitEquationElement.style.display = 'none';
			fitEquationElement.innerHTML = '';
			rSquaredElement.style.display = 'none';
			rSquaredElement.innerHTML = '';
		}
	}


		function populateTableFromActiveDataset() {
			const tableBody = document.querySelector('#data-table tbody');
			tableBody.innerHTML = ''; // Clear current table

			// For the active dataset, get its stored raw data.
			let dataset = rawData[activeSet] || [];
			const xErrorDisplay = getErrorColumnDisplay('x');
			const yErrorDisplay = getErrorColumnDisplay('y');

			// For Dataset 1: if rawData is empty but we have stored x-values, rebuild the table from them.
			if (activeSet === 0 && dataset.length === 0 && dataset1XValues && dataset1XValues.length > 0) {
				dataset1XValues.forEach(xVal => {
					const newRow = tableBody.insertRow();
					newRow.innerHTML = buildDataRowHtml({
						xValue: xVal,
						yValue: '',
						xErrorValue: '',
						yErrorValue: '',
						xErrorDisplay,
						yErrorDisplay
					});
				});
				return;
			}

			// For other datasets (or if set 1 already has valid data), build rows from rawData.
			if (dataset.length > 0) {
				dataset.forEach(point => {
					const newRow = tableBody.insertRow();
					newRow.innerHTML = buildDataRowHtml({
						xValue: point.x,
						yValue: point.y !== null ? point.y : '',
						xErrorValue: point.xErrorRaw || '',
						yErrorValue: point.yErrorRaw || '',
						xErrorDisplay,
						yErrorDisplay
					});
				});
			} else {
				// If there is no data in the active dataset, initialize default rows.
				initializeTable();
			}
	}


	function addDataset() {
		// Add a new empty dataset to rawData.
		rawData.push([]);

		// Then switch to the newly added dataset.
		activeSet = rawData.length - 1;
		updateDatasetTabsBar();

		// Now clear the UI for the active dataset 
		// (clearRows() will create new empty rows since rawData[activeSet] is empty)
		clearRows();

		// Update the rest of the UI to reflect the new active dataset.
		updateData();
		updatePlotAndRenderLatex();
		scheduleSaveState();
	}


	function removeDataset(index) {
		if (rawData.length <= 1) {
			alert("You must keep at least one dataset.");
			return;
		}

		// Remove this dataset from rawData.
		rawData.splice(index, 1);

		// Reindex the global objects so they match the new rawData order.
		// IMPORTANT: Pass the removed index.
		reindexDatasets(index);
		syncDataset1XValues();

		// Fix activeSet if it's now out of range
		if (activeSet >= rawData.length) {
			activeSet = rawData.length - 1;
		}

		// Rebuild UI and re-plot
		updateDatasetTabsBar();
		switchDataset(activeSet);
		updatePlotAndRenderLatex();
		scheduleSaveState();
	}


	function initializeDatasetTabsBar() {
		const addBtn = document.querySelector('.add-dataset-btn');
		if (addBtn) {
			addBtn.addEventListener('click', addDataset);
		}
		// Build the initial tabs UI.
		updateDatasetTabsBar();
	}


		function addRow() {
			const tableBody = document.querySelector('#data-table tbody');
			const newRow = tableBody.insertRow();
			newRow.innerHTML = buildDataRowHtml();
			updateData();
		}


	function clearRows(resetHeaders = true) {
		const tableBody = document.querySelector('#data-table tbody');
		tableBody.innerHTML = '';

		// Empty out the active dataset’s raw data
		rawData[activeSet] = [];
		if (activeSet === 0) dataset1XValues = [];

		// Clear any stored fit state for this dataset.
		delete datasetFitResults[activeSet];
		delete fittedCurves[activeSet];

		const fitEquationElement = document.getElementById('fit-equation');
		const rSquaredElement = document.getElementById('r-squared-container');
		if (fitEquationElement) {
			fitEquationElement.style.display = 'none';
			fitEquationElement.innerHTML = '';
		}
		if (rSquaredElement) {
			rSquaredElement.style.display = 'none';
			rSquaredElement.innerHTML = '';
		}

		if (resetHeaders) {
			isSyncing = true;
			// Reset header inputs to defaults
			document.getElementById('x-column-name').value = 'x';
			document.getElementById('y-column-name').value = 'y';
			// Keep per-dataset headers in sync
			if (!datasetHeaders[activeSet]) datasetHeaders[activeSet] = { x: 'x', y: 'y' };
			datasetHeaders[activeSet].x = 'x';
			datasetHeaders[activeSet].y = 'y';
			document.getElementById('graph-title').value = 'y vs x';
			titleWasAuto = true;
			renderLatex('#x-column-latex', 'x');
			renderLatex('#y-column-latex', 'y');
			updateGraphTitle();
			isSyncing = false;

			// Only re-initialize default rows if we truly want a full reset
			initializeTable();
		}

		// Turn off uncertainties and hide their columns
		document.getElementById('toggle-x-error').checked = false;
		toggleErrorColumn('x');
		document.getElementById('toggle-y-error').checked = false;
		toggleErrorColumn('y');

		// Reset advanced-fit parameters
		setInitialParameters(getCurrentAdvancedFitMethod());

		// Update the combined-plot inputs to default headings
		updateCombinedPlotInputsToActive();

		// Re-draw the plot with the cleared dataset state.
		updatePlotAndRenderLatex();
		scheduleSaveState();
	}


		function copyXFromSet1() {
		if (!dataset1XValues || dataset1XValues.length === 0) {
			alert("Dataset 1 does not contain any valid x values yet.");
			return;
		}
		const sourceX = dataset1XValues;
		const tableBody = document.querySelector('#data-table tbody');
		let rows = tableBody.querySelectorAll('tr');
		const missingCount = sourceX.length - rows.length;

		// If there are missing rows, create them in one batch.
		if (missingCount > 0) {
			let newRowsHTML = '';
			const toggleXError = document.getElementById('toggle-x-error').checked;
			const toggleYError = document.getElementById('toggle-y-error').checked;
			// Build the HTML string for the missing rows.
			for (let i = 0; i < missingCount; i++) {
				newRowsHTML += buildDataRowHtml({
					xErrorDisplay: toggleXError ? 'table-cell' : 'none',
					yErrorDisplay: toggleYError ? 'table-cell' : 'none'
				}, true);
			}
			// Insert all missing rows at once.
			tableBody.insertAdjacentHTML('beforeend', newRowsHTML);
			// Requery the rows after insertion.
			rows = tableBody.querySelectorAll('tr');
		}

		// Update all x-inputs in one go.
		const xInputs = tableBody.querySelectorAll('.x-input');
		for (let i = 0; i < sourceX.length; i++) {
			if (xInputs[i]) {
				xInputs[i].value = sourceX[i];
			}
		}

		// Update the underlying data and replot.
		updateData();
		updatePlotAndRenderLatex();
	}


	function clearFittedCurve() {
		// Remove any stored fit results from datasetFitResults
		if (datasetFitResults.hasOwnProperty(activeSet)) {
			delete datasetFitResults[activeSet];
		}

		// Remove the fitted curve from fittedCurves
		if (fittedCurves.hasOwnProperty(activeSet)) {
			delete fittedCurves[activeSet];
		}

		// Clear any displayed equation/R² from the UI
		const fitEquationElement = document.getElementById('fit-equation');
		const rSquaredElement = document.getElementById('r-squared-container');
		if (fitEquationElement) {
			fitEquationElement.style.display = 'none';
			fitEquationElement.innerHTML = '';
		}
		if (rSquaredElement) {
			rSquaredElement.style.display = 'none';
			rSquaredElement.innerHTML = '';
		}

		// Force a re-plot so that the old line is removed
		lastPlotState.data = null;
		lastPlotState.layout = null;

		// Now re-draw with no line but the same data
		updatePlotAndRenderLatex();
	}


	function updateCombinedPlotInputsToActive() {
		const rawTitle = document.getElementById('graph-title').value || 'y vs x';
		const rawXLabel = document.getElementById('x-column-name').value || 'x';
		const rawYLabel = document.getElementById('y-column-name').value || 'y';

		const titleInput = document.getElementById('combined-title');
		const xLabelInput = document.getElementById('combined-x-label');
		const yLabelInput = document.getElementById('combined-y-label');

		if (titleInput) {
			titleInput.value = rawTitle;
		}
		if (xLabelInput) {
			xLabelInput.value = rawXLabel;
		}
		if (yLabelInput) {
			yLabelInput.value = rawYLabel;
		}
	}


	function navigateTable(event) {
		const key = event.key;
		const currentInput = event.target;

		const currentCell = currentInput.parentElement;
		const currentRow = currentCell.parentElement;
		const table = currentRow.parentElement.parentElement;
		let rows = Array.from(table.querySelectorAll('tbody tr'));
		const rowIndex = rows.indexOf(currentRow);
		const cells = Array.from(currentRow.children);
		const colIndex = cells.indexOf(currentCell);

		let targetRow = rowIndex;
		let targetCol = colIndex;

		switch (key) {
			case 'Enter':
				event.preventDefault();
				if (rowIndex === rows.length - 1 && currentInput.value.trim() !== '') {
					addRow();
					rows = Array.from(table.querySelectorAll('tbody tr'));
				}
				targetRow = rowIndex + 1;
				targetCol = colIndex;
				break;
			case 'ArrowRight':
				event.preventDefault();
				targetCol = colIndex + 1;
				break;
			case 'ArrowLeft':
				event.preventDefault();
				targetCol = colIndex - 1;
				break;
			case 'ArrowDown':
				event.preventDefault();
				targetRow = rowIndex + 1;
				break;
			case 'ArrowUp':
				event.preventDefault();
				targetRow = rowIndex - 1;
				break;
			default:
				return;
		}

		if (targetRow < 0) targetRow = 0;
		if (targetRow >= rows.length) targetRow = rows.length - 1;
		if (targetCol < 0) targetCol = 0;
		if (targetCol >= cells.length) targetCol = cells.length - 1;

		const targetCell = rows[targetRow].children[targetCol];
		const targetInput = targetCell.querySelector('input');

		if (targetInput && targetInput.offsetParent !== null) {
			targetInput.focus();
		}
	}


	function toggleSection(sectionId, button) {
		const section = document.getElementById(sectionId);
		if (!section) {
			return;
		}

		const isOpen = section.classList.toggle('is-open');
		if (button) {
			button.setAttribute('aria-expanded', isOpen);
		}
	}


	function toggleErrorColumn(axis) {
		// Get the checkbox element and its state.
		const checkBox = document.getElementById(`toggle-${axis}-error`);
		const state = checkBox.checked;

		// Ensure the toggles object exists for the current dataset.
		if (!datasetToggles[activeSet]) {
			datasetToggles[activeSet] = { x: false, y: false };
		}
		datasetToggles[activeSet][axis] = state;

		// Update the UI for the active dataset.
		const errorHeader = document.getElementById(`${axis}-error-header`);
		const errorInputs = document.querySelectorAll(`.${axis}-error-input`);

		if (state) {
			errorHeader.style.display = 'table-cell';
			updateUncertaintyHeaders(axis);
			errorInputs.forEach((input) => {
				const errorCell = input.parentElement;
				if (errorCell) {
					errorCell.style.display = 'table-cell';
				}
			});
		} else {
			errorHeader.style.display = 'none';
			errorInputs.forEach((input) => {
				const errorCell = input.parentElement;
				if (errorCell) {
					errorCell.style.display = 'none';
					input.value = '';
				}
			});
		}

		updateData();
		setInitialParameters(getCurrentAdvancedFitMethod());
		scheduleSaveState();
	}


	function loadToggles() {
		const toggles = datasetToggles[activeSet] || { x: false, y: false };

		document.getElementById('toggle-x-error').checked = toggles.x;
		document.getElementById('toggle-y-error').checked = toggles.y;

		// Update x error column:
		const xErrorHeader = document.getElementById('x-error-header');
		const xErrorInputs = document.querySelectorAll('.x-error-input');
		if (toggles.x) {
			xErrorHeader.style.display = 'table-cell';
			xErrorInputs.forEach(input => {
				const cell = input.parentElement;
				if (cell) {
					cell.style.display = 'table-cell';
				}
			});
		} else {
			xErrorHeader.style.display = 'none';
			xErrorInputs.forEach(input => {
				const cell = input.parentElement;
				if (cell) {
					cell.style.display = 'none';
				}
			});
		}

		// Update y error column:
		const yErrorHeader = document.getElementById('y-error-header');
		const yErrorInputs = document.querySelectorAll('.y-error-input');
		if (toggles.y) {
			yErrorHeader.style.display = 'table-cell';
			yErrorInputs.forEach(input => {
				const cell = input.parentElement;
				if (cell) {
					cell.style.display = 'table-cell';
				}
			});
		} else {
			yErrorHeader.style.display = 'none';
			yErrorInputs.forEach(input => {
				const cell = input.parentElement;
				if (cell) {
					cell.style.display = 'none';
				}
			});
		}
	}


	function reindexDatasets(removedIndex) {
		// SHIFT each object from j+1 to j, for all j >= removedIndex
		for (let j = removedIndex; j < rawData.length; j++) {

			// datasetHeaders
			if (datasetHeaders.hasOwnProperty(j + 1)) {
				datasetHeaders[j] = datasetHeaders[j + 1];
			} else {
				delete datasetHeaders[j];
			}

			// datasetToggles
			if (datasetToggles.hasOwnProperty(j + 1)) {
				datasetToggles[j] = datasetToggles[j + 1];
			} else {
				delete datasetToggles[j];
			}

			// datasetErrorTypes
			if (datasetErrorTypes.hasOwnProperty(j + 1)) {
				datasetErrorTypes[j] = datasetErrorTypes[j + 1];
			} else {
				delete datasetErrorTypes[j];
			}

			// datasetFitResults
			if (datasetFitResults.hasOwnProperty(j + 1)) {
				datasetFitResults[j] = datasetFitResults[j + 1];
			} else {
				delete datasetFitResults[j];
			}

			// fittedCurves
			if (fittedCurves.hasOwnProperty(j + 1)) {
				fittedCurves[j] = fittedCurves[j + 1];
			} else {
				delete fittedCurves[j];
			}
		}

		// Then delete the old "last" index which no longer corresponds to a dataset
		const lastIndex = rawData.length;
		delete datasetHeaders[lastIndex];
		delete datasetToggles[lastIndex];
		delete datasetErrorTypes[lastIndex];
		delete datasetFitResults[lastIndex];
		delete fittedCurves[lastIndex];
	}


	function updateUncertaintyHeaders(axis) {
		const columnName = document.getElementById(`${axis}-column-name`).value.trim() || (axis === 'x' ? 'x' : 'y');
		const errorType = document.getElementById(`${axis}-error-type`).value;

		let headerLatex = `\\pm \\Delta ${formatLabelForLatex(columnName)}`;
		let headerText = `\\( ${headerLatex} \\)`;
		if (errorType === 'percentage') {
			headerText += ' (%)';
		}

		const headerElement = document.getElementById(`${axis}-error-header-latex`);
		if (headerElement) {
			headerElement.textContent = headerText;
			safeTypeset(headerElement);
		}
	}


	function updateErrorType(axis) {
		// Get the selected error type from the dropdown.
		const errorType = document.getElementById(`${axis}-error-type`).value;

		// Ensure the error type object exists for the current dataset.
		if (!datasetErrorTypes[activeSet]) {
			datasetErrorTypes[activeSet] = { x: 'absolute', y: 'absolute' };
		}
		datasetErrorTypes[activeSet][axis] = errorType;

		// If uncertainty is enabled for this axis, update the uncertainty header.
		if (document.getElementById(`toggle-${axis}-error`).checked) {
			updateUncertaintyHeaders(axis);
		}

		updateData();
		setInitialParameters(getCurrentAdvancedFitMethod());
		scheduleSaveState();
	}


	function loadErrorTypes() {
		const xErrorTypeElement = document.getElementById('x-error-type');
		const yErrorTypeElement = document.getElementById('y-error-type');

		// Use stored error types or fallback to 'absolute'
		const currentXErrorType = (datasetErrorTypes[activeSet] && datasetErrorTypes[activeSet].x) || 'absolute';
		const currentYErrorType = (datasetErrorTypes[activeSet] && datasetErrorTypes[activeSet].y) || 'absolute';

		if (xErrorTypeElement) {
			xErrorTypeElement.value = currentXErrorType;
		}
		if (yErrorTypeElement) {
			yErrorTypeElement.value = currentYErrorType;
		}

		// Ensure the uncertainty header is updated accordingly.
		updateUncertaintyHeaders('x');
		updateUncertaintyHeaders('y');
	}


	function handleCSVUpload(event) {
		const file = event.target.files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = function(e) {
			const text = e.target.result;

			// **Clear the fitted curve for the active dataset**
			if (fittedCurves.hasOwnProperty(activeSet)) {
				delete fittedCurves[activeSet];
				console.log(`Fitted curve for Dataset ${activeSet + 1} has been cleared.`);
			}

			// **Parse the CSV and update the data**
			parseCSV(text);
		};
		reader.onerror = function() {
			alert('Error reading the file!');
		};
		reader.readAsText(file);

		// Reset the file input so re-selecting the same file triggers the change event
		event.target.value = '';
	}


	function parseCSVLine(line) {
		const result = [];
		let current = '';
		let inQuotes = false;

		for (let i = 0; i < line.length; i++) {
			const char = line[i];
			if (char === '"') {
				// RFC4180 escaped quote: ""
				if (inQuotes && line[i + 1] === '"') {
					current += '"';
					i++;
				} else {
					inQuotes = !inQuotes;
				}
			} else if (char === ',' && !inQuotes) {
				result.push(current.trim());
				current = '';
			} else {
				current += char;
			}
		}
		result.push(current.trim());
		return result;
	}


	function parseCSV(text) {
		const lines = text.trim().split(/\r?\n/).filter(l => l.trim() !== '');
		if (lines.length < 2) {
			alert('CSV file must contain at least two rows (headers and one data row).');
			return;
		}

		// 1) Parse headers
		const headers = parseCSVLine(lines[0]);
		if (headers.length < 2) {
			alert('CSV file must have at least two columns.');
			return;
		}

		// Determine if the CSV has X and Y errors
		const hasXError = headers.length >= 3;
		const hasYError = headers.length >= 4;

		// 2) Store headers for the active dataset and update the UI
		isSyncing = true;
		if (!datasetHeaders[activeSet]) datasetHeaders[activeSet] = { x: 'x', y: 'y' };
		datasetHeaders[activeSet].x = headers[0];
		datasetHeaders[activeSet].y = headers[1];
		loadHeaders();
		isSyncing = false;

		// Clear existing rows for this dataset without resetting headers
		clearRows(false);

		// Set the uncertainty toggles to match the CSV's columns
		document.getElementById('toggle-x-error').checked = hasXError;
		document.getElementById('toggle-y-error').checked = hasYError;

		if (!datasetToggles[activeSet]) datasetToggles[activeSet] = { x: false, y: false };
		datasetToggles[activeSet].x = hasXError;
		datasetToggles[activeSet].y = hasYError;

		// 3) Build the new rows
		const dataRows = lines.slice(1);
		const tableBody = document.querySelector('#data-table tbody');
		const fragment = document.createDocumentFragment();

		const makeInput = (className, value, placeholder) => {
			const input = document.createElement('input');
			input.type = 'text';
			input.className = className;
			input.placeholder = placeholder;
			input.value = value || '';
			input.addEventListener('keydown', navigateTable);
			input.addEventListener('input', debouncedUpdateData);
			return input;
		};

		for (let i = 0; i < dataRows.length; i++) {
			const rowData = parseCSVLine(dataRows[i]);
			const tr = document.createElement('tr');

			// x cell
			const tdX = document.createElement('td');
			tdX.appendChild(makeInput('x-input', rowData[0], '0'));
			tr.appendChild(tdX);

			// y cell
			const tdY = document.createElement('td');
			tdY.appendChild(makeInput('y-input', rowData[1], '0'));
			tr.appendChild(tdY);

			// X-error cell
			const tdXErr = document.createElement('td');
			tdXErr.className = 'error-column x-error-td';
			if (!hasXError) tdXErr.style.display = 'none';
			tdXErr.appendChild(makeInput('x-error-input', rowData[2], '±0'));
			tr.appendChild(tdXErr);

			// Y-error cell
			const tdYErr = document.createElement('td');
			tdYErr.className = 'error-column y-error-td';
			if (!hasYError) tdYErr.style.display = 'none';
			tdYErr.appendChild(makeInput('y-error-input', rowData[3], '±0'));
			tr.appendChild(tdYErr);

			fragment.appendChild(tr);
		}

		// 4) Replace the old table rows with our newly built fragment
		tableBody.innerHTML = '';
		tableBody.appendChild(fragment);

		// 5) Re-apply uncertainty toggle display logic and update plot
		toggleErrorColumn('x');
		toggleErrorColumn('y');
		updateData();
		setInitialParameters(getCurrentAdvancedFitMethod());
	}


	function loadHeaders() {
		// Use stored headers for the active dataset if available; otherwise, use defaults.
		const headers = datasetHeaders[activeSet] || { x: 'x', y: 'y' };

		document.getElementById('x-column-name').value = headers.x;
		document.getElementById('y-column-name').value = headers.y;

		// Render headings according to current LaTeX mode.
		renderLatex('#x-column-latex', headers.x);
		renderLatex('#y-column-latex', headers.y);

		updateGraphTitle();
	}


	function updateLabels(type) {
		if (isSyncing) return;
		isSyncing = true;

		const value = document.getElementById(`${type}-column-name`).value;

		// Persist headers per dataset.
		if (!datasetHeaders[activeSet]) datasetHeaders[activeSet] = { x: 'x', y: 'y' };
		datasetHeaders[activeSet][type] = value;

		// Update the displayed label (plain or LaTeX).
		renderLatex(`#${type}-column-latex`, value);

		// Debounced update of the plot.
		debouncedUpdatePlotAndRenderLatex();
		isSyncing = false;

		// Dynamically update the graph title, but do not override a user-edited title.
		updateGraphTitle();

		// Update any other elements that depend on the headers.
		setInitialParameters(getCurrentAdvancedFitMethod());
		updateCombinedPlotInputsToActive();
		scheduleSaveState();
	}


	function openTab(evt, tabName) {
		const tablinks = document.getElementsByClassName("tablink");
		const tabContents = document.getElementsByClassName("tab-content");

		for (let i = 0; i < tablinks.length; i++) {
			tablinks[i].classList.remove("active");
		}

		for (let i = 0; i < tabContents.length; i++) {
			tabContents[i].classList.remove("active");
		}

		document.getElementById(tabName).classList.add("active");
		evt.currentTarget.classList.add("active");

		if (tabName === 'BasicFit') {
			safeTypeset(document.getElementById('basic-fit-equation'));
		} else if (tabName === 'AdvancedFit') {
			changeAdvancedFitMethod();
			safeTypeset(document.getElementById('advanced-fit-general-equation'));
		}
	}


	function initCombinedPlotInputs() {
		let controlsContainer = document.getElementById('combined-plot-controls');
		if (!controlsContainer) {
			controlsContainer = document.createElement('div');
			controlsContainer.id = 'combined-plot-controls';
			document.body.appendChild(controlsContainer);
		}

		let titleInput = document.getElementById('combined-title');
		if (!titleInput) {
			titleInput = document.createElement('input');
			titleInput.type = 'text';
			titleInput.id = 'combined-title';
			titleInput.placeholder = 'Title';
			controlsContainer.appendChild(titleInput);
		}

		let xLabelInput = document.getElementById('combined-x-label');
		if (!xLabelInput) {
			xLabelInput = document.createElement('input');
			xLabelInput.type = 'text';
			xLabelInput.id = 'combined-x-label';
			xLabelInput.placeholder = 'x-axis Label';
			controlsContainer.appendChild(xLabelInput);
		}

		let yLabelInput = document.getElementById('combined-y-label');
		if (!yLabelInput) {
			yLabelInput = document.createElement('input');
			yLabelInput.type = 'text';
			yLabelInput.id = 'combined-y-label';
			yLabelInput.placeholder = 'y-axis Label';
			controlsContainer.appendChild(yLabelInput);
		}

		// Initialise with raw text (no extra $ delimiters).
		titleInput.value = document.getElementById('graph-title').value || '';
		xLabelInput.value = document.getElementById('x-column-name').value || 'x';
		yLabelInput.value = document.getElementById('y-column-name').value || 'y';

		// Add event listeners: whenever any input value changes, update the combined plot.
		// Avoid adding duplicates.
		if (!titleInput.dataset.listenerAdded) {
			titleInput.addEventListener('input', updateCombinedPlotFromInputs);
			xLabelInput.addEventListener('input', updateCombinedPlotFromInputs);
			yLabelInput.addEventListener('input', updateCombinedPlotFromInputs);
			titleInput.dataset.listenerAdded = '1';
		}
	}


	function updateCombinedPlotFromInputs() {
		// Simply call plotAllDatasets; the updated version will check the input box values.
		plotAllDatasets();
		scheduleSaveState();
	}


	function showPopup() {
		const popupBackground = document.getElementById('popup-background');
		const popupContainer = document.getElementById('popup-container');

		if (popupBackground) {
			popupBackground.style.display = 'block'; // Show the transparent background
		}

		if (popupContainer) {
			popupContainer.style.display = 'block'; // Show the popup content
		}
	}


	function closePopup() {
		const popupBackground = document.getElementById('popup-background');
		const popupContainer = document.getElementById('popup-container');

		if (popupBackground) {
			popupBackground.style.display = 'none'; // Hide the transparent background
		}

		if (popupContainer) {
			popupContainer.style.display = 'none'; // Hide the popup content
		}
	}


	// Validate percentage uncertainty inputs and apply visual feedback.
	// Returns true if all inputs are valid, false otherwise.
	function validatePercentageUncertaintyInputs() {
		const xErrorType = document.getElementById('x-error-type')?.value;
		const yErrorType = document.getElementById('y-error-type')?.value;
		const xErrorInputs = document.querySelectorAll('.x-error-input');
		const yErrorInputs = document.querySelectorAll('.y-error-input');

		let allValid = true;

		xErrorInputs.forEach(input => {
			if (xErrorType === 'percentage' && input.value.trim() !== '') {
				const val = parseFloat(input.value);
				if (isNaN(val) || val <= 0) {
					input.classList.add('invalid-input');
					input.title = 'Percentage uncertainty must be greater than 0';
					allValid = false;
				} else {
					input.classList.remove('invalid-input');
					input.title = '';
				}
			} else {
				input.classList.remove('invalid-input');
				input.title = '';
			}
		});

		yErrorInputs.forEach(input => {
			if (yErrorType === 'percentage' && input.value.trim() !== '') {
				const val = parseFloat(input.value);
				if (isNaN(val) || val <= 0) {
					input.classList.add('invalid-input');
					input.title = 'Percentage uncertainty must be greater than 0';
					allValid = false;
				} else {
					input.classList.remove('invalid-input');
					input.title = '';
				}
			} else {
				input.classList.remove('invalid-input');
				input.title = '';
			}
		});

		return allValid;
	}


	function updateData() {
		try {
			const xInputs = document.querySelectorAll('.x-input');
			const yInputs = document.querySelectorAll('.y-input');
			const xErrorInputs = document.querySelectorAll('.x-error-input');
			const yErrorInputs = document.querySelectorAll('.y-error-input');
			const xErrorType = document.getElementById('x-error-type')?.value || 'absolute';
			const yErrorType = document.getElementById('y-error-type')?.value || 'absolute';

			// Validate percentage uncertainty inputs
			validatePercentageUncertaintyInputs();

			// For Dataset 1, store all x-values even if y is missing.
			if (activeSet === 0) {
				dataset1XValues = [];
				for (let i = 0; i < xInputs.length; i++) {
					const xVal = parseFloat(xInputs[i].value);
					if (!isNaN(xVal)) {
						dataset1XValues.push(xVal);
					}
				}
			}

			// Clear the current active dataset and repopulate it from the table inputs.
			rawData[activeSet] = [];
			for (let i = 0; i < xInputs.length; i++) {
				const x = parseFloat(xInputs[i].value);
				const y = parseFloat(yInputs[i].value);
				const parsedXError = parseFloat(xErrorInputs[i]?.value);
				const parsedYError = parseFloat(yErrorInputs[i]?.value);
				const xErrorRaw = isValidUncertaintyForType(parsedXError, xErrorType) ? parsedXError : 0;
				const yErrorRaw = isValidUncertaintyForType(parsedYError, yErrorType) ? parsedYError : 0;

				// Save the row if x is a valid number, regardless of y.
				if (!isNaN(x)) {
					rawData[activeSet].push({
						x: x,
						y: (!isNaN(y) ? y : null), // If y is not valid, store it as null.
						xErrorRaw: xErrorRaw,
						yErrorRaw: yErrorRaw
					});
				}
			}

			// Update the plot using only the active dataset.
			plotGraph();
			scheduleSaveState();
		} catch (error) {
			console.error('Error updating data:', error);
		}
	}


	function formatDataForExport(valueStr, errorStr, errorEnabled, errorType, val, rowVal, rowErr) {
		if (!errorEnabled) {
			return valueStr;
		}

		if (isNaN(rowErr)) return valueStr;

		if (errorType === 'absolute') {
			const dp = countDecimalPlaces(errorStr);
			return val.toFixed(dp);
		} else if (errorType === 'percentage') {
			const perc = parseFloat(errorStr);
			const sigFigs = getSigFigsFromPercentage(perc);
			if (sigFigs === null) {
				return valueStr; // invalid percentage, return unformatted
			}
			const sfVal = toSigFigs(val, sigFigs);
			return sfVal;
		} else {
			return valueStr;
		}
	}


	function countDecimalPlaces(numStr) {
		if (!numStr.includes('.')) return 0;
		return numStr.length - numStr.indexOf('.') - 1;
	}


	// Calculate significant figures from percentage uncertainty using logarithmic formula.
	// This scales smoothly: 100% → 1 sf, 10% → 2 sf, 1% → 3 sf, 0.1% → 4 sf, etc.
	// Capped at 10 sig figs to avoid toPrecision() errors (max 21) and unrealistic precision.
	// Returns null for invalid inputs (≤0 or NaN) - callers should handle by returning unformatted value.
	function getSigFigsFromPercentage(perc) {
		if (perc <= 0 || isNaN(perc)) return null;
		const sigFigs = Math.round(-Math.log10(perc / 100) + 1);
		return Math.max(1, Math.min(10, sigFigs));
	}


	function toSigFigs(num, sigFigs) {
		if (num === 0) return '0';

		if (sigFigs === 1) {
			const order = Math.floor(Math.log10(Math.abs(num)));
			const factor = Math.pow(10, order);
			const rounded = Math.floor(num / factor) * factor;
			return order >= 0 ? rounded.toString() : rounded.toFixed(Math.abs(order));
		}

		let numStr = num.toPrecision(sigFigs);
		if (numStr.includes('e') || numStr.includes('E')) {
			const [mantissa, exponent] = numStr.split(/e/i);
			const exponentVal = parseInt(exponent, 10);
			let fixedNum = parseFloat(mantissa) * Math.pow(10, exponentVal);
			const decimalPlaces = sigFigs - 1 - Math.floor(Math.log10(Math.abs(num)));
			return fixedNum.toFixed(decimalPlaces > 0 ? decimalPlaces : 0);
		}
		return numStr;
	}


	function formatScientificNotation(num, sigFigs) {
		if (sigFigs === 1) {
			return toSigFigs(num, sigFigs);
		}
		let numStr = num.toExponential(sigFigs - 1);
		return numStr;
	}


	function formatDataValue(dataVal, uncertaintyVal, uncertaintyType, useSciNotation) {
		if (uncertaintyType === 'absolute') {
			if (Math.abs(uncertaintyVal) >= 1) {
				const order = Math.floor(Math.log10(Math.abs(uncertaintyVal)));
				const factor = Math.pow(10, order);
				const roundedValue = Math.floor(dataVal / factor) * factor;
				return roundedValue.toFixed(0);
			} else {
				const dp = countDecimalPlaces(uncertaintyVal.toString());
				// Simply return the data value formatted with 'dp' decimal places,
				// preserving all trailing zeros.
				return dataVal.toFixed(dp);
			}
		} else if (uncertaintyType === 'percentage') {
			const perc = parseFloat(uncertaintyVal);
			const sigFigs = getSigFigsFromPercentage(perc);
			if (sigFigs === null) return dataVal.toString(); // invalid percentage, return unformatted
			if (useSciNotation) {
				return formatScientificNotation(dataVal, sigFigs);
			} else {
				return toSigFigs(dataVal, sigFigs);
			}
		} else {
			return dataVal.toString();
		}
	}


	function formatUncertainty(errStr, errorType) {
		if (errorType === 'percentage') {
			return errStr; // Optionally: return errStr + '\\%' if desired.
		} else if (errorType === 'absolute') {
			const dp = countDecimalPlaces(errStr);
			const errVal = parseFloat(errStr);
			if (isNaN(errVal)) return errStr;
			return errVal.toFixed(dp);
		} else {
			return errStr;
		}
	}


	function exportPlainText() {
		try {
			// Retrieve axis headings
			const xHeader = document.getElementById('x-column-name').value.trim() || 'x';
			const yHeader = document.getElementById('y-column-name').value.trim() || 'y';

			// Check if uncertainties are enabled
			const xErrorEnabled = document.getElementById('toggle-x-error').checked;
			const yErrorEnabled = document.getElementById('toggle-y-error').checked;

			// Get uncertainty types
			const xErrorType = document.getElementById('x-error-type').value;
			const yErrorType = document.getElementById('y-error-type').value;

			// Get all rows from the data table's tbody
			const table = document.getElementById('data-table');
			const rows = table.querySelectorAll('tbody tr');

			// Initialize arrays to collect all x and y values
			let xValues = [];
			let yValues = [];

			// Collect all x and y values for notation decision
			rows.forEach(row => {
				const xInputElem = row.querySelector('.x-input');
				const yInputElem = row.querySelector('.y-input');

				if (!xInputElem || !yInputElem) return;

				const xValStr = xInputElem.value.trim();
				const yValStr = yInputElem.value.trim();

				if (xValStr !== '') {
					const xVal = parseFloat(xValStr);
					if (!isNaN(xVal)) xValues.push(xVal);
				}
				if (yValStr !== '') {
					const yVal = parseFloat(yValStr);
					if (!isNaN(yVal)) yValues.push(yVal);
				}
			});

			// Determine if scientific notation is needed for x and y
			const xUseSciNotation = xErrorEnabled && xErrorType === 'percentage' &&
				xValues.some(val => val < -10000 || val > 10000);
			const yUseSciNotation = yErrorEnabled && yErrorType === 'percentage' &&
				yValues.some(val => val < -10000 || val > 10000);

			// Initialize headers with LaTeX formatting
			let headers = [
				`$${formatLabelForLatex(xHeader)}$`,
				`$${formatLabelForLatex(yHeader)}$`
			];

			if (xErrorEnabled) {
				let xUncHeading = `\\pm \\Delta ${formatLabelForLatex(xHeader)}`;
				if (xErrorType === 'percentage') xUncHeading += ' \\space (\\%)';
				headers.push(`$${xUncHeading}$`);
			}
			if (yErrorEnabled) {
				let yUncHeading = `\\pm \\Delta ${formatLabelForLatex(yHeader)}`;
				if (yErrorType === 'percentage') yUncHeading += ' \\space (\\%)';
				headers.push(`$${yUncHeading}$`);
			}

			let markdown = `| ${headers.join(' | ')} |\n`;
			markdown += `|${headers.map(() => ':---:').join('|')}|\n`;

			// Process each row
			rows.forEach(row => {
				const xInputElem = row.querySelector('.x-input');
				const yInputElem = row.querySelector('.y-input');
				if (!xInputElem || !yInputElem) return;

				const xValStr = xInputElem.value.trim();
				const yValStr = yInputElem.value.trim();
				if (xValStr === '' && yValStr === '') return;

				const xVal = parseFloat(xValStr);
				const yVal = parseFloat(yValStr);

				const xErrInput = row.querySelector('.x-error-input');
				const yErrInput = row.querySelector('.y-error-input');
				const xErrStr = xErrInput ? xErrInput.value.trim() : '';
				const yErrStr = yErrInput ? yErrInput.value.trim() : '';
				const xErrVal = parseFloat(xErrStr);
				const yErrVal = parseFloat(yErrStr);
				const xErrorEnabledThisRow = xErrorEnabled && xErrStr !== '' && isValidUncertaintyForType(xErrVal, xErrorType);
				const yErrorEnabledThisRow = yErrorEnabled && yErrStr !== '' && isValidUncertaintyForType(yErrVal, yErrorType);

				let rowData = [];

				// Format X value
				let xFormatted = xValStr;
				if (!isNaN(xVal)) {
					const xSigFigs = xErrorEnabledThisRow && xErrorType === 'percentage' ? getSigFigsFromPercentage(xErrVal) : null;
					if (xUseSciNotation && xSigFigs !== null) {
						const sciFormatted = formatScientificNotation(xVal, xSigFigs);
						xFormatted = `$${sciFormatted}$`;
					} else if (xSigFigs !== null) {
						const sigFormatted = toSigFigs(xVal, xSigFigs);
						xFormatted = `$${sigFormatted}$`;
					} else if (xErrorEnabledThisRow && xErrorType === 'absolute') {
						const formattedData = formatDataValue(xVal, xErrVal, 'absolute', false);
						xFormatted = `$${formattedData}$`;
					} else {
						xFormatted = `$${xValStr}$`;
					}
				}

				// Format Y value
				let yFormatted = yValStr;
				if (!isNaN(yVal)) {
					const ySigFigs = yErrorEnabledThisRow && yErrorType === 'percentage' ? getSigFigsFromPercentage(yErrVal) : null;
					if (yUseSciNotation && ySigFigs !== null) {
						const sciFormatted = formatScientificNotation(yVal, ySigFigs);
						yFormatted = `$${sciFormatted}$`;
					} else if (ySigFigs !== null) {
						const sigFormatted = toSigFigs(yVal, ySigFigs);
						yFormatted = `$${sigFormatted}$`;
					} else if (yErrorEnabledThisRow && yErrorType === 'absolute') {
						const formattedData = formatDataValue(yVal, yErrVal, 'absolute', false);
						yFormatted = `$${formattedData}$`;
					} else {
						yFormatted = `$${yValStr}$`;
					}
				}

				rowData.push(xFormatted);
				rowData.push(yFormatted);
				if (xErrorEnabled) {
					let xErrorFormatted = xErrorEnabledThisRow ? formatUncertainty(xErrStr, xErrorType) : '';
					if (xErrorFormatted !== '') xErrorFormatted = `$${xErrorFormatted}$`;
					rowData.push(xErrorFormatted);
				}
				if (yErrorEnabled) {
					let yErrorFormatted = yErrorEnabledThisRow ? formatUncertainty(yErrStr, yErrorType) : '';
					if (yErrorFormatted !== '') yErrorFormatted = `$${yErrorFormatted}$`;
					rowData.push(yErrorFormatted);
				}
				markdown += `| ${rowData.join(' | ')} |\n`;
			});

			console.log("Final Markdown Content:\n", markdown);
			return markdown;
		} catch (error) {
			console.error('Error generating markdown:', error);
			return null;
		}
	}


	// Store the current exported markdown for saving
	let currentExportedMarkdown = '';

	// Pre-rendered PNG data-URLs for MathJax equations in the export table.
	// Populated in the background after MathJax finishes typesetting so
	// that copyExportedTableToClipboard() can use them synchronously.
	let cachedTablePngs = null;


	function showExportTablePopup() {
		try {
			// Generate the markdown table
			const markdown = exportPlainText();
			if (!markdown) {
				alert('No data to export. Please add some data first.');
				return;
			}

			// Store markdown for later saving
			currentExportedMarkdown = markdown;

			// Configure marked for GitHub Flavored Markdown with tables
			marked.setOptions({
				gfm: true,
				tables: true,
				breaks: false
			});

			// Ensure escaped percent signs survive Markdown parsing for MathJax.
			const markdownForRender = markdown.replace(/\\%/g, '\\\\%');

			// Parse markdown to HTML
			const rawHtml = marked.parse(markdownForRender);

			// Sanitize the HTML
			const sanitizedHtml = DOMPurify.sanitize(rawHtml);

			// Render into the popup container
			const renderedContainer = document.getElementById('export-table-rendered');
			renderedContainer.innerHTML = sanitizedHtml;

			// Add click listener to the container for copy functionality
			renderedContainer.removeEventListener('click', handleExportTableClick);
			renderedContainer.addEventListener('click', handleExportTableClick);

			// Show the popup
			const background = document.getElementById('export-table-background');
			const container = document.getElementById('export-table-container');
			if (background) background.style.display = 'block';
			if (container) container.style.display = 'flex';

			// Trigger MathJax typesetting for LaTeX in the table
			safeTypeset(renderedContainer);

			// After MathJax finishes, pre-render equation SVGs to PNG so
			// the click-to-copy path can embed them synchronously.
			cachedTablePngs = null;
			if (typeof MathJax !== 'undefined' && MathJax.Hub && MathJax.Hub.Queue) {
				MathJax.Hub.Queue(function () {
					preRenderTablePngs(renderedContainer);
				});
			}

		} catch (error) {
			console.error('Error showing export table popup:', error);
			alert('An error occurred while preparing the table. Please check the console for details.');
		}
	}


	function closeExportTablePopup() {
		const background = document.getElementById('export-table-background');
		const container = document.getElementById('export-table-container');

		if (background) background.style.display = 'none';
		if (container) container.style.display = 'none';

		// Clear the stored markdown and cached PNGs
		currentExportedMarkdown = '';
		cachedTablePngs = null;
	}


	function saveExportedMarkdown(filename = 'data') {
		if (!currentExportedMarkdown) {
			alert('No markdown content to save.');
			return;
		}

		const blob = new Blob([currentExportedMarkdown], { type: 'text/plain;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', `${filename}.md`);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}


	function handleExportTableClick(event) {
		const table = event.target.closest('table');
		if (!table || window.getSelection().toString()) return;

		event.preventDefault();
		event.stopPropagation();
		copyExportedTableToClipboard(table).then(success => {
			if (success) {
				showExportTableCopyFeedback(table);
			} else {
				showExportTableCopyFailedFeedback(table);
			}
		});
	}


	// Convert a single LaTeX-delimited cell value to readable text.
	// If asHtml is true, superscripts/subscripts use <sup>/<sub> tags.
	function cleanLatexCell(str, asHtml) {
		str = str.trim();
		if (str.startsWith('$') && str.endsWith('$')) str = str.slice(1, -1);

		const replacements = [
			[/\\pm/g, '±'], [/\\Delta/g, 'Δ'], [/\\delta/g, 'δ'],
			[/\\times/g, '×'], [/\\div/g, '÷'],
			[/\\alpha/g, 'α'], [/\\beta/g, 'β'], [/\\gamma/g, 'γ'],
			[/\\theta/g, 'θ'], [/\\lambda/g, 'λ'], [/\\mu/g, 'μ'],
			[/\\pi/g, 'π'], [/\\sigma/g, 'σ'], [/\\omega/g, 'ω'],
			[/\\Omega/g, 'Ω'], [/\\rho/g, 'ρ'], [/\\epsilon/g, 'ε'],
			[/\\phi/g, 'φ'],
			[/\\space/g, ' '], [/\\%/g, '%'],
			[/\\text\{([^}]*)\}/g, '$1'],
		];
		for (const [re, rep] of replacements) str = str.replace(re, rep);

		if (asHtml) {
			str = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
			str = str.replace(/\^{([^}]*)}/g, '<sup>$1</sup>');
			str = str.replace(/_{([^}]*)}/g, '<sub>$1</sub>');
		}
		return str;
	}


	// Build a clean HTML table (and plain-text version) directly from the
	// stored markdown source, bypassing the MathJax-rendered DOM whose SVG
	// elements cause garbled characters when pasted into Word / Google Docs.
	function buildCleanTableFromMarkdown(markdown) {
		if (!markdown) return null;
		try {
			const lines = markdown.trim().split('\n').filter(l => l.trim());
			if (lines.length < 3) return null;

			const headerCells = parseMarkdownTableLine(lines[0]);
			const dataRows = [];
			for (let i = 2; i < lines.length; i++) {
				const cells = parseMarkdownTableLine(lines[i]);
				if (cells.length) dataRows.push(cells);
			}
			if (!headerCells.length || !dataRows.length) return null;

			const thStyle = 'border: 1px solid black; padding: 8px; text-align: center; font-weight: bold;';
			const tdStyle = 'border: 1px solid black; padding: 8px; text-align: center;';

			let html = '<table style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12pt;">';
			html += '<thead><tr>' + headerCells.map(c =>
				`<th style="${thStyle}" align="center">${cleanLatexCell(c, true)}</th>`
			).join('') + '</tr></thead><tbody>';
			dataRows.forEach(row => {
				html += '<tr>' + row.map(c =>
					`<td style="${tdStyle}" align="center">${cleanLatexCell(c, true)}</td>`
				).join('') + '</tr>';
			});
			html += '</tbody></table>';

			// Tab-separated plain text (pastes well into spreadsheets)
			let text = headerCells.map(c => cleanLatexCell(c, false)).join('\t') + '\n';
			dataRows.forEach(row => {
				text += row.map(c => cleanLatexCell(c, false)).join('\t') + '\n';
			});

			return { html, text };
		} catch (e) {
			console.error('Failed to build clean table from markdown:', e);
			return null;
		}
	}


	// Clone a MathJax v2 SVG and inline all referenced glyph definitions
	// so it renders correctly outside the page (clipboard, data-URL, etc.).
	function selfContainSvg(svg) {
		const clone = svg.cloneNode(true);
		let defs = clone.querySelector('defs');
		if (!defs) {
			defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
			clone.insertBefore(defs, clone.firstChild);
		}

		const processed = new Set();
		const pending = new Set();
		const collectRefs = el => {
			el.querySelectorAll('use').forEach(use => {
				const href = use.getAttribute('xlink:href') || use.getAttribute('href');
				if (href && href.startsWith('#')) {
					const id = href.substring(1);
					if (!processed.has(id)) pending.add(id);
				}
			});
		};

		collectRefs(clone);
		while (pending.size > 0) {
			const id = pending.values().next().value;
			pending.delete(id);
			if (processed.has(id)) continue;
			processed.add(id);
			if (defs.querySelector('[id="' + id + '"]')) continue;
			const original = document.getElementById(id);
			if (!original) continue;
			const clonedDef = original.cloneNode(true);
			defs.appendChild(clonedDef);
			collectRefs(clonedDef);
		}

		clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
		clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
		return clone;
	}

	// Pre-render all MathJax SVGs inside a container to PNG data-URLs.
	// Called via MathJax.Hub.Queue after typesetting so the SVGs exist.
	function preRenderTablePngs(container) {
		const svgs = Array.from(container.querySelectorAll('.MathJax_SVG svg'));
		if (!svgs.length) { cachedTablePngs = []; return; }

		const scale = 3;
		Promise.all(svgs.map(svg => {
			const selfContained = selfContainSvg(svg);
			let svgString = new XMLSerializer().serializeToString(selfContained);
			svgString = svgString.replace(/currentColor/g, '#000000');

			const rect = svg.getBoundingClientRect();
			const w = Math.max(Math.ceil(rect.width * scale), 1);
			const h = Math.max(Math.ceil(rect.height * scale), 1);

			return new Promise(resolve => {
				const canvas = document.createElement('canvas');
				canvas.width = w;
				canvas.height = h;
				const ctx = canvas.getContext('2d');
				if (!ctx) { resolve(null); return; }

				const img = new Image();
				const blob = new Blob([svgString], { type: 'image/svg+xml' });
				const blobUrl = URL.createObjectURL(blob);

				img.onload = () => {
					URL.revokeObjectURL(blobUrl);
					ctx.drawImage(img, 0, 0, w, h);
					resolve({ dataUrl: canvas.toDataURL('image/png'), width: rect.width, height: rect.height });
				};
				img.onerror = () => {
					URL.revokeObjectURL(blobUrl);
					resolve(null);
				};
				img.src = blobUrl;
			});
		})).then(results => { cachedTablePngs = results; });
	}

	async function renderTableToPngBlob() {
		if (!currentExportedMarkdown) return null;

		const scale = 2;
		const cellPadX = 14;
		const cellPadY = 10;
		const fontSize = 14;
		const fontFamily = 'Arial, Helvetica, sans-serif';
		const normalFont = fontSize + 'px ' + fontFamily;
		const boldFont = 'bold ' + fontSize + 'px ' + fontFamily;

		// Parse markdown table
		const lines = currentExportedMarkdown.trim().split('\n').filter(function (l) { return l.trim(); });
		if (lines.length < 3) return null;

		var headerCells = parseMarkdownTableLine(lines[0]);
		var dataRows = [];
		for (var i = 2; i < lines.length; i++) {
			var cells = parseMarkdownTableLine(lines[i]);
			if (cells.length) dataRows.push(cells);
		}

		var numCols = headerCells.length;
		if (!numCols || !dataRows.length) return null;

		var useLatex = latexMode && cachedTablePngs && cachedTablePngs.some(function (p) { return p !== null; });

		// Pre-load PNG images if in LaTeX mode
		var pngImages = [];
		if (useLatex) {
			pngImages = await Promise.all(cachedTablePngs.map(function (png) {
				if (!png || !png.dataUrl) return Promise.resolve(null);
				return new Promise(function (resolve) {
					var img = new Image();
					img.onload = function () { resolve({ img: img, width: png.width, height: png.height }); };
					img.onerror = function () { resolve(null); };
					img.src = png.dataUrl;
				});
			}));
		}

		// Build cell grid: row 0 = headers, rows 1..N = data
		var pngIdx = 0;
		var allCellStrings = [headerCells].concat(dataRows);
		var grid = allCellStrings.map(function (row, r) {
			return Array.from({ length: numCols }, function (_, c) {
				var raw = c < row.length ? row[c] : '';
				var hasMath = raw.includes('$');
				var png = null;
				if (useLatex && hasMath && pngIdx < pngImages.length) {
					png = pngImages[pngIdx++];
				}
				return { text: cleanLatexCell(raw, false), png: png, isHeader: r === 0 };
			});
		});

		// Measure column widths and row heights
		var measure = document.createElement('canvas').getContext('2d');
		var colWidths = new Array(numCols).fill(0);
		var rowHeights = new Array(grid.length).fill(0);

		for (var r = 0; r < grid.length; r++) {
			for (var c = 0; c < numCols; c++) {
				var cell = grid[r][c];
				var cw, ch;
				if (cell.png) {
					cw = Math.ceil(cell.png.width) + cellPadX * 2;
					ch = Math.ceil(cell.png.height) + cellPadY * 2;
				} else {
					measure.font = cell.isHeader ? boldFont : normalFont;
					cw = Math.ceil(measure.measureText(cell.text).width) + cellPadX * 2;
					ch = Math.ceil(fontSize * 1.4) + cellPadY * 2;
				}
				colWidths[c] = Math.max(colWidths[c], cw);
				rowHeights[r] = Math.max(rowHeights[r], ch);
			}
		}

		// Ensure minimum cell sizes
		for (var ci = 0; ci < numCols; ci++) colWidths[ci] = Math.max(colWidths[ci], 60);
		for (var ri = 0; ri < grid.length; ri++) rowHeights[ri] = Math.max(rowHeights[ri], 32);

		var totalW = colWidths.reduce(function (a, b) { return a + b; }, 0);
		var totalH = rowHeights.reduce(function (a, b) { return a + b; }, 0);

		// Create scaled canvas
		var canvas = document.createElement('canvas');
		canvas.width = Math.ceil(totalW * scale);
		canvas.height = Math.ceil(totalH * scale);
		var ctx = canvas.getContext('2d');
		ctx.scale(scale, scale);

		// White background
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, totalW, totalH);

		// Draw cells
		var y = 0;
		for (var dr = 0; dr < grid.length; dr++) {
			var rh = rowHeights[dr];
			var x = 0;
			for (var dc = 0; dc < numCols; dc++) {
				var dw = colWidths[dc];
				var dcell = grid[dr][dc];

				// Cell background
				if (dcell.isHeader) {
					ctx.fillStyle = '#eef0f4';
				} else {
					ctx.fillStyle = dr % 2 === 0 ? '#f9fafc' : '#ffffff';
				}
				ctx.fillRect(x, y, dw, rh);

				// Cell content
				if (dcell.png) {
					var iw = dcell.png.width;
					var ih = dcell.png.height;
					ctx.drawImage(dcell.png.img, x + (dw - iw) / 2, y + (rh - ih) / 2, iw, ih);
				} else if (dcell.text) {
					ctx.fillStyle = '#2d3436';
					ctx.font = dcell.isHeader ? boldFont : normalFont;
					ctx.textAlign = 'center';
					ctx.textBaseline = 'middle';
					ctx.fillText(dcell.text, x + dw / 2, y + rh / 2);
				}

				// Cell border
				ctx.strokeStyle = '#d0d0d0';
				ctx.lineWidth = 0.5;
				ctx.strokeRect(x, y, dw, rh);

				x += dw;
			}
			y += rh;
		}

		return new Promise(function (resolve) { canvas.toBlob(resolve, 'image/png'); });
	}


	async function copyExportedTableToClipboard(table) {
		try {
			var pngBlob = await renderTableToPngBlob();
			if (!pngBlob) return false;

			// Plain text fallback for text-only paste targets
			var cleanTable = buildCleanTableFromMarkdown(currentExportedMarkdown);
			var plainText = cleanTable ? cleanTable.text : table.innerText;

			return navigator.clipboard.write([new ClipboardItem({
				'image/png': pngBlob,
				'text/plain': new Blob([plainText], { type: 'text/plain' })
			})]).then(function () { return true; }).catch(function (err) {
				console.error('Failed to copy table as PNG:', err);
				// Fallback: try image only
				return navigator.clipboard.write([new ClipboardItem({
					'image/png': pngBlob
				})]).then(function () { return true; }).catch(function (err2) {
					console.error('PNG-only copy also failed:', err2);
					return false;
				});
			});
		} catch (err) {
			console.error('Failed to render table PNG:', err);
			return false;
		}
	}


	function showExportTableCopyFeedback(table) {
		table.classList.add('copied');
		setTimeout(() => {
			table.classList.remove('copied');
		}, 1500);
	}


	function showExportTableCopyFailedFeedback(table) {
		table.classList.add('copy-failed');
		setTimeout(() => {
			table.classList.remove('copy-failed');
		}, 2000);
	}


	function exportCSV(filename = 'data') {
		try {
			const table = document.getElementById('data-table');
			const rows = table.querySelectorAll('tr');
			let csvContent = '';

			const xHeader = document.getElementById('x-column-name').value.trim() || 'x';
			const yHeader = document.getElementById('y-column-name').value.trim() || 'y';
			const xErrorEnabled = document.getElementById('toggle-x-error').checked;
			const yErrorEnabled = document.getElementById('toggle-y-error').checked;

			const headers = [xHeader, yHeader];
			if (xErrorEnabled) {
				const xErrorType = document.getElementById('x-error-type').value;
				const xErrorHead = xErrorType === 'percentage' ? `delta ${xHeader} (%)` : `delta ${xHeader}`;
				headers.push(xErrorHead);
			}
			if (yErrorEnabled) {
				const yErrorType = document.getElementById('y-error-type').value;
				const yErrorHead = yErrorType === 'percentage' ? `delta ${yHeader} (%)` : `delta ${yHeader}`;
				headers.push(yErrorHead);
			}

			csvContent += headers.join(',') + '\n';

			const dataRows = table.querySelectorAll('tbody tr');

			for (let i = 0; i < dataRows.length; i++) {
				const xValStr = dataRows[i].querySelector('.x-input')?.value.trim() || '';
				const yValStr = dataRows[i].querySelector('.y-input')?.value.trim() || '';
				if (xValStr === '' && yValStr === '') continue;

				let xVal = parseFloat(xValStr);
				let yVal = parseFloat(yValStr);

				const xErrInput = dataRows[i].querySelector('.x-error-input');
				const yErrInput = dataRows[i].querySelector('.y-error-input');

				const xErrStr = xErrInput ? xErrInput.value.trim() : '';
				const yErrStr = yErrInput ? yErrInput.value.trim() : '';
				const xErrVal = parseFloat(xErrStr);
				const yErrVal = parseFloat(yErrStr);
				const xErrorType = document.getElementById('x-error-type').value;
				const yErrorType = document.getElementById('y-error-type').value;

				const xErrorEnabledThisRow = xErrorEnabled && xErrStr !== '' && isValidUncertaintyForType(xErrVal, xErrorType);
				const yErrorEnabledThisRow = yErrorEnabled && yErrStr !== '' && isValidUncertaintyForType(yErrVal, yErrorType);

				let rowData = [];

				let xFormatted = xValStr;
				if (!isNaN(xVal)) {
					xFormatted = formatDataForExport(
						xValStr, xErrStr, xErrorEnabledThisRow, xErrorType, xVal, xVal, xErrVal
					);
				}

				let yFormatted = yValStr;
				if (!isNaN(yVal)) {
					yFormatted = formatDataForExport(
						yValStr, yErrStr, yErrorEnabledThisRow, yErrorType, yVal, yVal, yErrVal
					);
				}

				rowData.push(xFormatted);
				rowData.push(yFormatted);

				if (xErrorEnabled) {
					rowData.push(xErrorEnabledThisRow ? xErrStr : '');
				}

				if (yErrorEnabled) {
					rowData.push(yErrorEnabledThisRow ? yErrStr : '');
				}

				csvContent += rowData.join(',') + '\n';
			}

			const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.setAttribute('href', url);
			link.setAttribute('download', `${filename}.csv`);
			link.style.visibility = 'hidden';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} catch (error) {
			console.error('Error exporting CSV:', error);
			alert('An error occurred while exporting the CSV. Please check the console for details.');
		}
	}


	function applyGlobalUncertainties(axis) {
		const globalVal = document.getElementById(`global-${axis}-uncertainty`).value.trim();
		if (globalVal === '') return;
		const toggleInput = document.getElementById(`toggle-${axis}-error`);
		if (globalVal !== '' && toggleInput && !toggleInput.checked) {
			toggleInput.checked = true;
			toggleErrorColumn(axis);
		}
		const tableBody = document.querySelector('#data-table tbody');
		const rows = tableBody.querySelectorAll('tr');

		rows.forEach((row) => {
			const xInput = row.querySelector('.x-input').value.trim();
			const yInput = row.querySelector('.y-input').value.trim();

			if (xInput !== '' && yInput !== '') {
				const errorInput = row.querySelector(`.${axis}-error-input`);
				if (document.getElementById(`toggle-${axis}-error`).checked && errorInput) {
					errorInput.value = globalVal !== '' ? globalVal : '';
				}
			}
		});

		updateData();
		document.getElementById(`global-${axis}-uncertainty`).value = '';

		// Update initial parameters based on the selected advanced fit method
		setInitialParameters(getCurrentAdvancedFitMethod());
	}


	// Filename prompt state
	let filenamePromptType = null;


	function showFilenamePrompt(type) {
		filenamePromptType = type;
		const background = document.getElementById('filename-prompt-background');
		const container = document.getElementById('filename-prompt-container');
		const input = document.getElementById('filename-prompt-input');
		const extension = document.getElementById('filename-prompt-extension');

		// Set the extension display
		extension.textContent = `.${type}`;

		// Set default filename
		input.value = 'data';

		// Show the modal
		if (background) background.style.display = 'block';
		if (container) container.style.display = 'flex';

		// Focus the input and select the text
		setTimeout(() => {
			input.focus();
			input.select();
		}, 50);

		// Add keyboard listener for Enter key
		input.onkeydown = function(e) {
			if (e.key === 'Enter') {
				e.preventDefault();
				confirmFilename();
			} else if (e.key === 'Escape') {
				e.preventDefault();
				closeFilenamePrompt();
			}
		};
	}


	function closeFilenamePrompt() {
		const background = document.getElementById('filename-prompt-background');
		const container = document.getElementById('filename-prompt-container');

		if (background) background.style.display = 'none';
		if (container) container.style.display = 'none';

		filenamePromptType = null;
	}


		function confirmFilename() {
			const input = document.getElementById('filename-prompt-input');
			let filename = input.value.trim();

			// Use default if empty
			if (!filename) {
				filename = 'data';
			}

			// Sanitize filename using shared helper.
			filename = sanitizeFilename(filename, 'data');

			// Call the appropriate export function
			if (filenamePromptType === 'csv') {
				closeFilenamePrompt();
				exportCSV(filename);
			} else if (filenamePromptType === 'md') {
				closeFilenamePrompt();
				saveExportedMarkdown(filename);
			}
		}
