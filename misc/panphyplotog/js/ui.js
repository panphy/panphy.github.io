// Single-dataset table, uncertainties and exports for PanPhyPlotOG.
const debouncedUpdatePlot = debounce(updatePlot, 150);
const debouncedUpdateData = () => updateData({ deferPlot: true });
const TABLE_RENDER_CHUNK_SIZE = 250;
let tableRenderJobId = 0;
const CLEAR_DATA_SKIP_KEY = 'panphyplotog-intro-skip-clear-confirm';
const TABLE_EXPORT_BASE_SCALE = 3;
const TABLE_EXPORT_MAX_CANVAS_SIDE = 8192;
const TABLE_EXPORT_MAX_PIXELS = 16777216;
let currentExportedMarkdown = '';
let filenamePromptType = null;
function getDatasetDisplayName() { return 'Current data'; }
function showToast(message, duration = 3000) {
	const toast = document.createElement('div');
	toast.className = 'toast-notification';
	toast.textContent = message;
	toast.setAttribute('role','status');
	document.body.appendChild(toast);
	requestAnimationFrame(() => toast.classList.add('toast-visible'));
	setTimeout(() => {
		toast.classList.remove('toast-visible');
		toast.addEventListener('transitionend', () => toast.remove());
	}, duration);
}

function onWorkspaceChangedElsewhere() {
	const banner = document.getElementById('tab-conflict');
	if (banner) banner.hidden = false;
}

function resolveTabConflict(keep) {
	if (!keep) {
		window.location.reload();
		return;
	}
	if (!window.confirm('Save this tab\'s work over the changes made in the other tab?')) return;
	keepThisTabVersion();
	const banner = document.getElementById('tab-conflict');
	if (banner) banner.hidden = true;
	showToast('This tab\'s version is saved. The other tab will offer to reload.');
}

function formatRowInputValue(value) {
	if (value === undefined || value === null) return '';
	return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getErrorColumnDisplay(axis, index = activeSet) {
	const toggles = datasetToggles && datasetToggles[index];
	if (toggles && typeof toggles[axis] === 'boolean') {
		return toggles[axis] ? 'table-cell' : 'none';
	}
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
	                <td><input type="text" class="x-input" inputmode="decimal" onkeydown="navigateTable(event)" oninput="debouncedUpdateData()" placeholder="0" value="${formatRowInputValue(xValue)}"></td>
	                <td><input type="text" class="y-input" inputmode="decimal" onkeydown="navigateTable(event)" oninput="debouncedUpdateData()" placeholder="0" value="${formatRowInputValue(yValue)}"></td>
	                <td class="error-column" style="display: ${xErrorDisplay};"><input type="text" class="x-error-input" inputmode="decimal" onkeydown="navigateTable(event)" placeholder="±0" oninput="debouncedUpdateData()" value="${formatRowInputValue(xErrorValue)}" /></td>
	                <td class="error-column" style="display: ${yErrorDisplay};"><input type="text" class="y-error-input" inputmode="decimal" onkeydown="navigateTable(event)" placeholder="±0" oninput="debouncedUpdateData()" value="${formatRowInputValue(yErrorValue)}" /></td>
	            `;

		return wrapInTr ? `<tr>${rowHtml}</tr>` : rowHtml;
	}

function cancelTableRenderJob() {
	tableRenderJobId += 1;
	const tableBody = document.querySelector('#data-table tbody');
	if (tableBody) {
		tableBody.style.pointerEvents = '';
		tableBody.removeAttribute('aria-busy');
	}
}

function buildDataRowElement(options = {}) {
	const row = document.createElement('tr');
	row.innerHTML = buildDataRowHtml(options);
	return row;
}

function renderTableRows(tableBody, rowOptions = []) {
	cancelTableRenderJob();
	const jobId = tableRenderJobId;
	tableBody.innerHTML = '';

	if (!Array.isArray(rowOptions) || rowOptions.length === 0) {
		tableBody.style.pointerEvents = '';
		tableBody.removeAttribute('aria-busy');
		return;
	}

	if (rowOptions.length <= TABLE_RENDER_CHUNK_SIZE * 2) {
		const fragment = document.createDocumentFragment();
		rowOptions.forEach((options) => {
			fragment.appendChild(buildDataRowElement(options));
		});
		tableBody.appendChild(fragment);
		tableBody.style.pointerEvents = '';
		tableBody.removeAttribute('aria-busy');
		return;
	}

	tableBody.style.pointerEvents = 'none';
	tableBody.setAttribute('aria-busy', 'true');

	let index = 0;
	const renderChunk = () => {
		if (jobId !== tableRenderJobId) return;

		const fragment = document.createDocumentFragment();
		const end = Math.min(index + TABLE_RENDER_CHUNK_SIZE, rowOptions.length);
		for (; index < end; index++) {
			fragment.appendChild(buildDataRowElement(rowOptions[index]));
		}
		tableBody.appendChild(fragment);

		if (index < rowOptions.length) {
			window.requestAnimationFrame(renderChunk);
			return;
		}

		tableBody.style.pointerEvents = '';
		tableBody.removeAttribute('aria-busy');
		validateNumericInputs();
	};

	window.requestAnimationFrame(renderChunk);
}

function isValidPercentageUncertainty(value) {
	return Number.isFinite(value) && value > 0;
}

function isValidUncertaintyForType(value, errorType) {
	if (errorType === 'percentage') return isValidPercentageUncertainty(value);
	return Number.isFinite(value) && value >= 0;
}

function syncDataset1XValues() {
	dataset1XValues = getDatasetPoints(0)
		.filter(point => Number.isFinite(point.x))
		.map(point => point.x);
}

function parseMarkdownTableLine(line) {
		const rawLine = String(line || '').trim();
		if (!rawLine) return [];
		const cells = rawLine.split(/(?<!\\)\|/).map(cell => cell.replace(/\\\|/g, '|'));
		if (cells.length && cells[0].trim() === '') cells.shift();
		if (cells.length && cells[cells.length - 1].trim() === '') cells.pop();
		return cells.map(cell => cell.trim());
	}

function isSafariBrowser() {
		const ua = navigator.userAgent || '';
		return /Safari/.test(ua) && !/Chrome|Chromium|CriOS|Edg|Firefox|FxiOS|OPR|OPiOS|SamsungBrowser/.test(ua);
	}

function canWriteClipboardItems() {
		return typeof ClipboardItem !== 'undefined'
			&& Boolean(navigator.clipboard)
			&& typeof navigator.clipboard.write === 'function';
	}

function canWriteClipboardText() {
		return Boolean(navigator.clipboard)
			&& typeof navigator.clipboard.writeText === 'function';
	}

async function writePlainTextToClipboard(value) {
		const text = String(value || '');
		if (!text) return false;

		if (canWriteClipboardText()) {
			try {
				await navigator.clipboard.writeText(text);
				return true;
			} catch {
				// Fall through to legacy copy fallback.
			}
		}

		if (typeof document.execCommand !== 'function') return false;

		const textArea = document.createElement('textarea');
		textArea.value = text;
		textArea.setAttribute('readonly', '');
		textArea.style.position = 'fixed';
		textArea.style.left = '-99999px';
		textArea.style.top = '0';
		document.body.appendChild(textArea);
		textArea.select();
		textArea.selectionStart = 0;
		textArea.selectionEnd = textArea.value.length;

		let copied = false;
		try {
			copied = document.execCommand('copy');
		} catch {
			copied = false;
		}

		if (textArea.parentNode) {
			textArea.parentNode.removeChild(textArea);
		}
		return copied;
	}

function initializeTable(initialRows = 7) {
			const tableBody = document.querySelector('#data-table tbody');
			const rowOptions = Array.from({ length: initialRows }, () => ({
				xErrorDisplay: 'none',
				yErrorDisplay: 'none'
			}));
			renderTableRows(tableBody, rowOptions);
			// Update the active dataset with the new (empty) rows.
			updateData();
		}

function populateTableFromActiveDataset() {
			const tableBody = document.querySelector('#data-table tbody');
			const dataset = rawData[activeSet] || [];
			const xErrorDisplay = getErrorColumnDisplay('x');
			const yErrorDisplay = getErrorColumnDisplay('y');

			const rowOptions = [];
			if (Array.isArray(datasetDraftRows[activeSet])) {
				renderTableRows(tableBody, datasetDraftRows[activeSet].map(row => ({ ...row, xErrorDisplay, yErrorDisplay })));
				validateNumericInputs();
				return;
			}

			// For Dataset 1: if rawData is empty but we have stored x-values, rebuild the table from them.
			if (activeSet === 0 && dataset.length === 0 && dataset1XValues && dataset1XValues.length > 0) {
				dataset1XValues.forEach((xVal) => {
					rowOptions.push({
						xValue: xVal,
						yValue: '',
						xErrorValue: '',
						yErrorValue: '',
						xErrorDisplay,
						yErrorDisplay
					});
				});
				datasetDraftRows[activeSet] = rowOptions.map(({ xValue, yValue, xErrorValue, yErrorValue }) => ({ xValue: String(xValue ?? ''), yValue: String(yValue ?? ''), xErrorValue: String(xErrorValue ?? ''), yErrorValue: String(yErrorValue ?? '') }));
				renderTableRows(tableBody, rowOptions);
				return;
			}

			// For other datasets (or if set 1 already has valid data), build rows from rawData.
			if (dataset.length > 0) {
				dataset.forEach((point) => {
					rowOptions.push({
						xValue: point.x,
						yValue: point.y !== null ? point.y : '',
						xErrorValue: point.xErrorRaw || '',
						yErrorValue: point.yErrorRaw || '',
						xErrorDisplay,
						yErrorDisplay
					});
				});
				datasetDraftRows[activeSet] = rowOptions.map(({ xValue, yValue, xErrorValue, yErrorValue }) => ({ xValue: String(xValue ?? ''), yValue: String(yValue ?? ''), xErrorValue: String(xErrorValue ?? ''), yErrorValue: String(yErrorValue ?? '') }));
				renderTableRows(tableBody, rowOptions);
				return;
			}

			// If there is no data in the active dataset, initialize default rows.
			initializeTable();
	}

function addRow() {
			const tableBody = document.querySelector('#data-table tbody');
			if (tableBody.getAttribute('aria-busy') === 'true') {
				const rows = datasetDraftRows[activeSet] || [];
				datasetDraftRows[activeSet] = rows;
				rows.push({ xValue: '', yValue: '', xErrorValue: '', yErrorValue: '' });
				populateTableFromActiveDataset();
				scheduleSaveState();
				return;
			}
			cancelTableRenderJob();
			const newRow = tableBody.insertRow();
			newRow.innerHTML = buildDataRowHtml();
			updateData();
		}

function isDatasetEmpty(index = activeSet) {
	return !getDatasetPoints(index).length && !(datasetDraftRows[index] || []).some(row =>
		['xValue', 'yValue', 'xErrorValue', 'yErrorValue'].some(key => String(row[key] ?? '').trim()));
}

function confirmClearRows() {
	if (isDatasetEmpty(activeSet)) {
		clearRows();
		return;
	}
	if (localStorage.getItem(CLEAR_DATA_SKIP_KEY) === 'true') {
		clearRows();
		return;
	}
	const datasetName = getDatasetDisplayName(activeSet);
	const msg = document.getElementById('clear-data-prompt-message');
	msg.textContent = `Clear all data in "${datasetName}"? This will remove all rows, uncertainties, and fitted results for this dataset.`;
	document.getElementById('clear-data-dont-ask').checked = false;
	document.getElementById('clear-data-prompt-background').style.display = 'block';
	document.getElementById('clear-data-prompt-container').style.display = 'flex';
}

function closeClearDataPrompt() {
	document.getElementById('clear-data-prompt-background').style.display = 'none';
	document.getElementById('clear-data-prompt-container').style.display = 'none';
}

function confirmClearDataPrompt() {
	if (document.getElementById('clear-data-dont-ask').checked) {
		localStorage.setItem(CLEAR_DATA_SKIP_KEY, 'true');
	}
	closeClearDataPrompt();
	clearRows();
}

function confirmImportCSV() {
	const fileInput = document.getElementById('csv-file-input');
	if (!fileInput) return;

	if (!isDatasetEmpty(activeSet)) {
		const datasetName = getDatasetDisplayName(activeSet);
		const confirmMessage = `Import a CSV into "${datasetName}"? This will replace the current data/settings for this dataset.`;
		if (!window.confirm(confirmMessage)) return;
	}
	fileInput.click();
}

function clearRows(resetHeaders = true) {
		cancelTableRenderJob();
		const tableBody = document.querySelector('#data-table tbody');
		tableBody.innerHTML = '';

		invalidatePendingFit();
		delete datasetDraftRows[activeSet];
		// Empty out the active dataset’s raw data
		rawData[activeSet] = [];
		if (activeSet === 0) dataset1XValues = [];


		// Clear any stored fit state for this dataset.
		delete datasetFitResults[activeSet];
		delete fittedCurves[activeSet];
		clearFittingResultDisplay();

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




		// Re-draw the plot with the cleared dataset state.
		updatePlot();
		scheduleSaveState();
	}

function clearFittedCurve() {
	invalidatePendingFit();
	// Remove any stored fit results from datasetFitResults
	if (datasetFitResults.hasOwnProperty(activeSet)) {
		delete datasetFitResults[activeSet];
	}

	// Remove the fitted curve from fittedCurves
	if (fittedCurves.hasOwnProperty(activeSet)) {
		delete fittedCurves[activeSet];
	}
	clearFittingResultDisplay();

	// Force a re-plot so that the old line is removed
	lastPlotState.plot.data = null;
	lastPlotState.plot.layout = null;


	// Now re-draw with no line but the same data
	updatePlot();
	scheduleSaveState();
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
				if (currentInput.selectionEnd < currentInput.value.length || currentInput.selectionStart !== currentInput.selectionEnd) return;
				event.preventDefault();
				targetCol = colIndex + 1;
				break;
			case 'ArrowLeft':
				if (currentInput.selectionStart > 0 || currentInput.selectionStart !== currentInput.selectionEnd) return;
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
				}
			});
		}

		updateData();
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

function updateUncertaintyHeaders(axis) {
    const name = document.getElementById(`${axis}-column-name`).value.trim() || axis;
    const percentage = document.getElementById(`${axis}-error-type`).value === 'percentage';
    document.getElementById(`${axis}-error-header-label`).textContent = `± Δ${name}${percentage ? ' (%)' : ''}`;
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

function inferErrorTypeFromHeader(headerText) {
		const header = String(headerText || '').trim();
		return header.includes('%') ? 'percentage' : 'absolute';
	}

function escapeRegExp(value) {
		return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

function normalizeCsvHeaderForMatch(headerText) {
		return String(headerText || '')
			.toLowerCase()
			.replace(/[δΔ]/g, 'delta ')
			.replace(/[_-]+/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
	}

function headerMentionsLabel(normalizedHeader, label) {
		const normalizedLabel = normalizeCsvHeaderForMatch(label);
		if (!normalizedHeader || !normalizedLabel) return false;
		// Whole words only, so a label "I" does not match the "i" in "uncertainty in V".
		return new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(normalizedLabel)}(?![a-z0-9])`).test(normalizedHeader);
	}

function inferErrorAxisFromHeader(headerText, xHeaderLabel, yHeaderLabel) {
		const normalizedHeader = normalizeCsvHeaderForMatch(headerText);
		if (!normalizedHeader) return null;

		// PanPhyPlotOG's own export writes "delta <label>" or "delta <label> (%)".
		const exportedLabel = normalizedHeader.replace(/\s*\(%\)$/, '').match(/^delta (.+)$/);
		if (exportedLabel) {
			if (exportedLabel[1] === normalizeCsvHeaderForMatch(xHeaderLabel)) return 'x';
			if (exportedLabel[1] === normalizeCsvHeaderForMatch(yHeaderLabel)) return 'y';
		}

		// Only a header that names an uncertainty counts; other columns (such as repeat readings) are ignored.
		if (!/(?:\bdelta\b|±|\+\/-|\buncertaint|\berr(?:ors?)?\b|\bdx\b|\bdy\b)/.test(normalizedHeader)) return null;

		const xMatch = headerMentionsLabel(normalizedHeader, xHeaderLabel)
			|| /\b(?:delta x|x uncertainty|x error|dx)\b/.test(normalizedHeader);
		const yMatch = headerMentionsLabel(normalizedHeader, yHeaderLabel)
			|| /\b(?:delta y|y uncertainty|y error|dy)\b/.test(normalizedHeader);

		if (xMatch && !yMatch) return 'x';
		if (yMatch && !xMatch) return 'y';
		return null;
	}

function detectCsvErrorColumns(headers, xHeaderLabel, yHeaderLabel) {
		let xErrorIndex = null;
		let yErrorIndex = null;
		const ignoredIndices = [];

		for (let index = 2; index < headers.length; index++) {
			const axis = inferErrorAxisFromHeader(headers[index], xHeaderLabel, yHeaderLabel);
			if (axis === 'x' && xErrorIndex === null) {
				xErrorIndex = index;
				continue;
			}
			if (axis === 'y' && yErrorIndex === null) {
				yErrorIndex = index;
				continue;
			}
			ignoredIndices.push(index);
		}

		return {
			xErrorIndex,
			yErrorIndex,
			ignoredIndices,
			xErrorType: xErrorIndex !== null ? inferErrorTypeFromHeader(headers[xErrorIndex]) : 'absolute',
			yErrorType: yErrorIndex !== null ? inferErrorTypeFromHeader(headers[yErrorIndex]) : 'absolute'
		};
	}

function escapeCsvCell(value) {
		const text = String(value ?? '');
		const escaped = text.replace(/"/g, '""');
		return /[",\r\n]/.test(text) ? `"${escaped}"` : escaped;
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

		// Determine CSV uncertainty columns by header mapping (not fixed positions).
		const detectedErrors = detectCsvErrorColumns(headers, headers[0], headers[1]);
		const hasXError = Number.isInteger(detectedErrors.xErrorIndex);
		const hasYError = Number.isInteger(detectedErrors.yErrorIndex);
		const xImportedErrorType = detectedErrors.xErrorType;
		const yImportedErrorType = detectedErrors.yErrorType;

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
		if (!datasetErrorTypes[activeSet]) datasetErrorTypes[activeSet] = { x: 'absolute', y: 'absolute' };
		datasetErrorTypes[activeSet].x = xImportedErrorType;
		datasetErrorTypes[activeSet].y = yImportedErrorType;

		const xErrorTypeElement = document.getElementById('x-error-type');
		const yErrorTypeElement = document.getElementById('y-error-type');
		if (xErrorTypeElement) {
			xErrorTypeElement.value = xImportedErrorType;
		}
		if (yErrorTypeElement) {
			yErrorTypeElement.value = yImportedErrorType;
		}

		// 3) Build the new rows
		const dataRows = lines.slice(1);
		const tableBody = document.querySelector('#data-table tbody');
		const fragment = document.createDocumentFragment();

			const makeInput = (className, value, placeholder) => {
				const input = document.createElement('input');
				input.type = 'text';
				input.className = className;
				input.inputMode = 'decimal';
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
			const xErrorValue = hasXError ? rowData[detectedErrors.xErrorIndex] : '';
			tdXErr.appendChild(makeInput('x-error-input', xErrorValue, '±0'));
			tr.appendChild(tdXErr);

			// Y-error cell
			const tdYErr = document.createElement('td');
			tdYErr.className = 'error-column y-error-td';
			if (!hasYError) tdYErr.style.display = 'none';
			const yErrorValue = hasYError ? rowData[detectedErrors.yErrorIndex] : '';
			tdYErr.appendChild(makeInput('y-error-input', yErrorValue, '±0'));
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


		// Say which columns were left out, so repeat readings are never silently dropped or misused.
		const ignoredNames = detectedErrors.ignoredIndices
			.filter(index => headers[index] !== '' || dataRows.some(row => (parseCSVLine(row)[index] || '') !== ''))
			.map(index => headers[index] !== '' ? `"${headers[index]}"` : `column ${index + 1}`);
		if (ignoredNames.length) {
			alert(`Only the first two columns, "${headers[0]}" (x) and "${headers[1]}" (y), were imported`
				+ `${hasXError || hasYError ? ', with their uncertainties' : ''}.\n\n`
				+ `Ignored: ${ignoredNames.join(', ')}.\n\n`
				+ `To import an uncertainty column, name it "delta ${headers[0]}" or "delta ${headers[1]}".`);
		}
	}

function loadHeaders() {
		// Use stored headers for the active dataset if available; otherwise, use defaults.
		const headers = datasetHeaders[activeSet] || { x: 'x', y: 'y' };

		document.getElementById('x-column-name').value = headers.x;
		document.getElementById('y-column-name').value = headers.y;



		updateGraphTitle();
	}

function updateLabels(type) {
		if (isSyncing) return;
		isSyncing = true;

		const value = document.getElementById(`${type}-column-name`).value;

		// Persist headers per dataset.
		if (!datasetHeaders[activeSet]) datasetHeaders[activeSet] = { x: 'x', y: 'y' };
		datasetHeaders[activeSet][type] = value;


		// Debounced update of the plot.
		debouncedUpdatePlot();
		isSyncing = false;

		// Dynamically update the graph title, but do not override a user-edited title.
		updateGraphTitle();



		scheduleSaveState();
	}

function validateNumericInputs() {
	let invalidCount = 0;
	for (const axis of ['x', 'y']) {
		for (const suffix of ['', '-error']) {
			const isError = suffix !== '';
			const type = document.getElementById(`${axis}-error-type`)?.value || 'absolute';
			document.querySelectorAll(`.${axis}${suffix}-input`).forEach(input => {
				const text = input.value.trim();
				const number = parseNumericInput(text);
				const invalid = text !== '' && (!Number.isFinite(number) || (isError && !isValidUncertaintyForType(number, type)));
				input.classList.toggle('invalid-input', invalid);
				input.setAttribute('aria-invalid', String(invalid));
				input.setAttribute('aria-describedby', 'data-validation-message');
				input.title = invalid ? (isError ? 'Use a non-negative absolute uncertainty or a positive percentage.' : 'Enter a number such as -1.25 or 1e-5; commas and other text are not accepted.') : '';
				if (invalid) invalidCount++;
			});
		}
	}
	const message = document.getElementById('data-validation-message');
	if (message) message.textContent = invalidCount ? `${invalidCount} invalid ${invalidCount === 1 ? 'cell' : 'cells'}. Use numbers such as -1.25 or 1e-5, without commas. Uncertainties must be non-negative (percentages greater than zero). Invalid entries are saved but excluded from calculations.` : '';
	return invalidCount === 0;
}

function updateData(options = {}) {
	const tableBody = document.querySelector('#data-table tbody');
	if (!tableBody || tableBody.getAttribute('aria-busy') === 'true') return;
	const previousSignature = getDatasetFitSignature(activeSet);
	const drafts = Array.from(tableBody.querySelectorAll('tr'), row => ({
		xValue: row.querySelector('.x-input')?.value || '',
		yValue: row.querySelector('.y-input')?.value || '',
		xErrorValue: row.querySelector('.x-error-input')?.value || '',
		yErrorValue: row.querySelector('.y-error-input')?.value || ''
	}));
	datasetDraftRows[activeSet] = drafts;
	const xType = document.getElementById('x-error-type')?.value || 'absolute';
	const yType = document.getElementById('y-error-type')?.value || 'absolute';
	rawData[activeSet] = drafts.flatMap(row => {
		const x = parseNumericInput(row.xValue);
		const y = parseNumericInput(row.yValue);
		if (!Number.isFinite(x)) return [];
		const xError = parseNumericInput(row.xErrorValue);
		const yError = parseNumericInput(row.yErrorValue);
		return [{ x, y: Number.isFinite(y) ? y : null,
			xErrorRaw: isValidUncertaintyForType(xError, xType) ? xError : 0,
			yErrorRaw: isValidUncertaintyForType(yError, yType) ? yError : 0 }];
	});
	if (activeSet === 0) syncDataset1XValues();
	validateNumericInputs();
	if (getDatasetFitSignature(activeSet) !== previousSignature) {
		invalidatePendingFit();
		if (datasetFitResults[activeSet]) {
			datasetFitResults[activeSet].stale = true;
			renderFitDiagnostics();
		}
	}
	if (options.deferPlot) debouncedUpdatePlot();
	else plotGraph();
	scheduleSaveState();
}

function formatDataForExport(valueStr, errorStr, errorEnabled, errorType, val, rowVal, rowErr) {
		if (!errorEnabled) {
			return valueStr;
		}

		if (isNaN(rowErr)) return valueStr;

		if (errorType === 'absolute') {
			const dp = countDecimalPlaces(errorStr);
			return formatFixedPrecision(val, dp);
		} else if (errorType === 'percentage') {
			const perc = parseNumericInput(errorStr);
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

function formatFixedPrecision(value, decimalPlaces) {
		if (!Number.isFinite(value)) return '';
		if (decimalPlaces <= 100) return value.toFixed(decimalPlaces);
		const digits = Math.max(1, Math.min(15, decimalPlaces + Math.floor(Math.log10(Math.abs(value) || 1)) + 1));
		return value.toExponential(digits - 1);
	}

function countDecimalPlaces(numStr) {
		const [mantissa, exponent = '0'] = String(numStr).trim().toLowerCase().split('e');
		const fraction = (mantissa.split('.')[1] || '').length;
		return Math.max(0, fraction - Number(exponent));
	}

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
			const rounded = Math.round(num / factor) * factor;
			return order >= 0 ? rounded.toString() : rounded.toFixed(Math.abs(order));
		}

		let numStr = num.toPrecision(sigFigs);
		if (numStr.includes('e') || numStr.includes('E')) {
			const [mantissa, exponent] = numStr.split(/e/i);
			const exponentVal = parseInt(exponent, 10);
			let fixedNum = parseNumericInput(mantissa) * Math.pow(10, exponentVal);
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
				return formatFixedPrecision(dataVal, dp);
			}
		} else if (uncertaintyType === 'percentage') {
			const perc = parseNumericInput(uncertaintyVal);
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
			const errVal = parseNumericInput(errStr);
			if (isNaN(errVal)) return errStr;
			return formatFixedPrecision(errVal, dp);
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
					const xVal = parseNumericInput(xValStr);
					if (!isNaN(xVal)) xValues.push(xVal);
				}
				if (yValStr !== '') {
					const yVal = parseNumericInput(yValStr);
					if (!isNaN(yVal)) yValues.push(yVal);
				}
			});

			// Determine if scientific notation is needed for x and y
			const xUseSciNotation = xErrorEnabled && xErrorType === 'percentage' &&
				xValues.some(val => val < -10000 || val > 10000);
			const yUseSciNotation = yErrorEnabled && yErrorType === 'percentage' &&
				yValues.some(val => val < -10000 || val > 10000);

            const headers = [xHeader, yHeader];
            if (xErrorEnabled) headers.push(`± Δ${xHeader}${xErrorType === 'percentage' ? ' (%)' : ''}`);
            if (yErrorEnabled) headers.push(`± Δ${yHeader}${yErrorType === 'percentage' ? ' (%)' : ''}`);

			let markdown = `| ${headers.map(header => header.replace(/\|/g, '\\|')).join(' | ')} |\n`;
			markdown += `|${headers.map(() => ':---:').join('|')}|\n`;

			// Process each row
			rows.forEach(row => {
				const xInputElem = row.querySelector('.x-input');
				const yInputElem = row.querySelector('.y-input');
				if (!xInputElem || !yInputElem) return;

				const xValStr = xInputElem.value.trim();
				const yValStr = yInputElem.value.trim();
				if (xValStr === '' && yValStr === '') return;

				const xVal = parseNumericInput(xValStr);
				const yVal = parseNumericInput(yValStr);

				const xErrInput = row.querySelector('.x-error-input');
				const yErrInput = row.querySelector('.y-error-input');
				const xErrStr = xErrInput ? xErrInput.value.trim() : '';
				const yErrStr = yErrInput ? yErrInput.value.trim() : '';
				const xErrVal = parseNumericInput(xErrStr);
				const yErrVal = parseNumericInput(yErrStr);
				const xErrorEnabledThisRow = xErrorEnabled && xErrStr !== '' && isValidUncertaintyForType(xErrVal, xErrorType);
				const yErrorEnabledThisRow = yErrorEnabled && yErrStr !== '' && isValidUncertaintyForType(yErrVal, yErrorType);

				let rowData = [];

				// Format X value
				let xFormatted = xValStr;
				if (!isNaN(xVal)) {
					const xSigFigs = xErrorEnabledThisRow && xErrorType === 'percentage' ? getSigFigsFromPercentage(xErrVal) : null;
					if (xUseSciNotation && xSigFigs !== null) {
						const sciFormatted = formatScientificNotation(xVal, xSigFigs);
						xFormatted = sciFormatted;
					} else if (xSigFigs !== null) {
						const sigFormatted = toSigFigs(xVal, xSigFigs);
						xFormatted = sigFormatted;
					} else if (xErrorEnabledThisRow && xErrorType === 'absolute') {
						const formattedData = formatDataValue(xVal, xErrVal, 'absolute', false);
						xFormatted = formattedData;
					} else {
						xFormatted = xValStr;
					}
				}

				// Format Y value
				let yFormatted = yValStr;
				if (!isNaN(yVal)) {
					const ySigFigs = yErrorEnabledThisRow && yErrorType === 'percentage' ? getSigFigsFromPercentage(yErrVal) : null;
					if (yUseSciNotation && ySigFigs !== null) {
						const sciFormatted = formatScientificNotation(yVal, ySigFigs);
						yFormatted = sciFormatted;
					} else if (ySigFigs !== null) {
						const sigFormatted = toSigFigs(yVal, ySigFigs);
						yFormatted = sigFormatted;
					} else if (yErrorEnabledThisRow && yErrorType === 'absolute') {
						const formattedData = formatDataValue(yVal, yErrVal, 'absolute', false);
						yFormatted = formattedData;
					} else {
						yFormatted = yValStr;
					}
				}

				rowData.push(xFormatted);
				rowData.push(yFormatted);
				if (xErrorEnabled) {
					const xErrorFormatted = xErrorEnabledThisRow ? formatUncertainty(xErrStr, xErrorType) : '';
					rowData.push(xErrorFormatted);
				}
				if (yErrorEnabled) {
					const yErrorFormatted = yErrorEnabledThisRow ? formatUncertainty(yErrStr, yErrorType) : '';
					rowData.push(yErrorFormatted);
				}
				markdown += `| ${rowData.join(' | ')} |\n`;
			});

			return markdown;
		} catch (error) {
			console.error('Error generating markdown:', error);
			return null;
		}
	}

function getSafeTableExportScale(widthPx, heightPx, baseScale) {
		const safeWidth = Math.max(1, widthPx);
		const safeHeight = Math.max(1, heightPx);
		const dpr = Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio : 1;
		const requestedScale = Math.max(baseScale, Math.ceil(dpr * 2));
		const maxScaleBySide = Math.min(
			TABLE_EXPORT_MAX_CANVAS_SIDE / safeWidth,
			TABLE_EXPORT_MAX_CANVAS_SIDE / safeHeight
		);
		const maxScaleByPixels = Math.sqrt(TABLE_EXPORT_MAX_PIXELS / (safeWidth * safeHeight));
		return Math.max(1, Math.min(requestedScale, maxScaleBySide, maxScaleByPixels));
	}

async function renderTableToPngBlob() {
		if (!currentExportedMarkdown) return null;
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

        const grid = [headerCells, ...dataRows].map((row, r) => Array.from({ length: numCols }, (_, c) => ({
            text: row[c] || '', png: null, isHeader: r === 0
        })));

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
		var scale = getSafeTableExportScale(totalW, totalH, TABLE_EXPORT_BASE_SCALE);

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
					ctx.fillStyle = '#1B1B1B';
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

async function exportCSV(filename = 'data') {
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

			csvContent += headers.map(escapeCsvCell).join(',') + '\n';

			const dataRows = table.querySelectorAll('tbody tr');

			for (let i = 0; i < dataRows.length; i++) {
				const xValStr = dataRows[i].querySelector('.x-input')?.value.trim() || '';
				const yValStr = dataRows[i].querySelector('.y-input')?.value.trim() || '';
				if (xValStr === '' && yValStr === '') continue;

				let xVal = parseNumericInput(xValStr);
				let yVal = parseNumericInput(yValStr);

				const xErrInput = dataRows[i].querySelector('.x-error-input');
				const yErrInput = dataRows[i].querySelector('.y-error-input');

				const xErrStr = xErrInput ? xErrInput.value.trim() : '';
				const yErrStr = yErrInput ? yErrInput.value.trim() : '';
				const xErrVal = parseNumericInput(xErrStr);
				const yErrVal = parseNumericInput(yErrStr);
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

				csvContent += rowData.map(escapeCsvCell).join(',') + '\n';
			}

				const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
				await saveBlobWithFallback(blob, `${filename}.csv`, { title: 'Save CSV data' });
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
	}

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

async function confirmFilename() {
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
					await exportCSV(filename);

				}
			}

function renderFitDiagnostics() {
	const status = document.getElementById('fit-status');
	if (!status) return;
	const result = datasetFitResults[activeSet];
	const rmse = Number.isFinite(result?.rmse) ? ` RMSE: ${PanPhyFitCore.formatFitNumber(result.rmse, false)}.` : '';
	status.textContent = !result ? 'No fit calculated yet.' : result.stale
		? 'Data changed. Click Fit Curve to update the fit.'
		: `${result.status || 'Fit calculated.'}${rmse}`;
	status.classList.toggle('fit-outdated', !!result?.stale);

}

function initializeDialogFocus() {
	const closers = {
		'export-table-container': closeExportTablePopup,
		'clear-data-prompt-container': closeClearDataPrompt,
		'filename-prompt-container': closeFilenamePrompt
	};
	const openDialogs = [];
	const focusable = container => Array.from(container.querySelectorAll('button, input, select, textarea, a[href], summary, [tabindex]'))
		.filter(element => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length > 0);
	const observer = new MutationObserver(() => {
		for (const [id, close] of Object.entries(closers)) {
			const container = document.getElementById(id);
			if (!container) continue;
			const position = openDialogs.findIndex(entry => entry.container === container);
			const visible = container.style.display !== 'none' && container.getClientRects().length > 0;
			if (visible && position < 0) {
				const opener = document.activeElement;
				openDialogs.push({ container, opener, close });
				const dialog = container.querySelector('[role="dialog"]');
				if (dialog) dialog.tabIndex = -1;
				if (!container.contains(opener)) (focusable(container)[0] || dialog)?.focus();
			} else if (!visible && position >= 0) {
				const [entry] = openDialogs.splice(position, 1);
				const fallback = document.querySelector('.btn-add-row');
				(entry.opener?.isConnected ? entry.opener : fallback)?.focus();
			}
		}
	});
	Object.keys(closers).forEach(id => {
		const container = document.getElementById(id);
		if (container) observer.observe(container, { attributes: true, attributeFilter: ['style'] });
	});
	document.addEventListener('keydown', event => {
		const entry = openDialogs[openDialogs.length - 1];
		if (!entry) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopImmediatePropagation();
			entry.close();
		} else if (event.key === 'Tab') {
			// The guided tour's card sits outside the dialog and must stay reachable beside it.
			const tourCard = document.querySelector('.tour-card:not(.tour-invite)');
			const elements = [...(tourCard ? focusable(tourCard) : []), ...focusable(entry.container)];
			const current = elements.indexOf(document.activeElement);
			const next = event.shiftKey ? current - 1 : current + 1;
			const wraps = current < 0 || next < 0 || next >= elements.length;
			if (tourCard || wraps) {
				event.preventDefault();
				(wraps ? elements[event.shiftKey ? elements.length - 1 : 0] : elements[next])?.focus();
			}
		}
	}, true);
}


function tableCellText(value, asHtml) {
    const text = String(value ?? '').trim();
    return asHtml ? text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : text;
}
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
				`<th style="${thStyle}" align="center">${tableCellText(c, true)}</th>`
			).join('') + '</tr></thead><tbody>';
			dataRows.forEach(row => {
				html += '<tr>' + row.map(c =>
					`<td style="${tdStyle}" align="center">${tableCellText(c, true)}</td>`
				).join('') + '</tr>';
			});
			html += '</tbody></table>';

			// Tab-separated plain text (pastes well into spreadsheets)
			let text = headerCells.map(c => tableCellText(c, false)).join('\t') + '\n';
			dataRows.forEach(row => {
				text += row.map(c => tableCellText(c, false)).join('\t') + '\n';
			});

			return { html, text };
		} catch (e) {
			console.error('Failed to build clean table from markdown:', e);
			return null;
		}
	}

function clearFittingResultDisplay() {
    ['fit-equation','r-squared-container'].forEach(id => {
        const element = document.getElementById(id);
        if(element){element.textContent='';element.style.display='none';}
    });
    const actions = document.getElementById('fit-copy-actions');
    if(actions) actions.hidden = true;
    renderFitDiagnostics();
}

function renderFittingResult(equation, rSquared) {
    if(!equation) return clearFittingResultDisplay();
    const element = document.getElementById('fit-equation');
    element.textContent = formatEquationText(equation);
    element.style.display = 'block';
    const quality = document.getElementById('r-squared-container');
    quality.textContent = `R² = ${rSquared}`;
    quality.style.display = 'block';
    document.getElementById('fit-copy-actions').hidden = false;
    renderFitDiagnostics();
}

function equationToPng(text) {
    const canvas = document.createElement('canvas');
    let context = canvas.getContext('2d');
    context.font = '20px Arial, sans-serif';
    const width = Math.ceil(context.measureText(text).width)+32;
    const scale = Math.min(3,8192/width);
    canvas.width = Math.ceil(width*scale);
    canvas.height = Math.ceil(60*scale);
    context = canvas.getContext('2d');
    context.scale(scale,scale);
    context.fillStyle = '#fff';context.fillRect(0,0,width,60);
    context.fillStyle = '#17181a';context.font='20px Arial, sans-serif';
    context.textBaseline='middle';context.fillText(text,16,30);
    return new Promise(resolve => canvas.toBlob(resolve,'image/png'));
}

async function copyFitEquation(format) {
    const text = document.getElementById('fit-equation').textContent;
    if(!text) return;
    try {
        if(format === 'image') {
            const pending = equationToPng(text);
            if(canWriteClipboardItems()) await navigator.clipboard.write([new ClipboardItem({'image/png':pending})]);
            else await saveBlobWithFallback(await pending,'fit-equation.png');
        } else if(!await writePlainTextToClipboard(text)) throw new Error('Clipboard unavailable.');
        showToast(format === 'image' ? 'Equation image copied or saved.' : 'Equation copied.');
    } catch(error) {showToast('Unable to copy the equation. You can select and copy its text.');}
}

function showExportTablePopup() {
    const markdown = exportPlainText();
    const clean = buildCleanTableFromMarkdown(markdown);
    if(!clean) return showToast('Add some data before viewing the table.');
    currentExportedMarkdown = markdown;
    document.getElementById('export-table-rendered').innerHTML = clean.html;
    document.getElementById('export-table-background').style.display='block';
    document.getElementById('export-table-container').style.display='flex';
}

function closeExportTablePopup() {
    document.getElementById('export-table-background').style.display='none';
    document.getElementById('export-table-container').style.display='none';
    currentExportedMarkdown='';
}

async function copyExportTable(format) {
    const clean = buildCleanTableFromMarkdown(currentExportedMarkdown);
    if(!clean) return;
    try {
        if(format === 'image') {
            const pending=renderTableToPngBlob();
            if(canWriteClipboardItems()) await navigator.clipboard.write([new ClipboardItem({'image/png':pending})]);
            else await saveBlobWithFallback(await pending,'data-table.png');
        } else if(format === 'table' && canWriteClipboardItems()) {
            await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([clean.html],{type:'text/html'}),'text/plain':new Blob([clean.text],{type:'text/plain'})})]);
        } else if(!await writePlainTextToClipboard(format === 'markdown' ? currentExportedMarkdown : clean.text)) throw new Error('Clipboard unavailable.');
        showToast('Table copied or saved.');
    } catch(error) { showToast('Unable to copy the table. You can select and copy its text.'); }
}
