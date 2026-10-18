// Formula, mean-of-repeats and CSV dialogs for PanPhyPlot.
const CSV_PREVIEW_ROWS = 6;
let dialogOpener = null;

function openDialog(id) {
	closeMenu();
	const dialog = document.getElementById(id);
	dialogOpener = document.activeElement;
	if (typeof dialog.showModal === 'function') dialog.showModal();
	else dialog.setAttribute('open', '');
	return dialog;
}

function closeDialog(id) {
	const dialog = document.getElementById(id);
	if (typeof dialog.close === 'function') dialog.close();
	else dialog.removeAttribute('open');
}

function setDialogMessage(id, text, type = 'error') {
	const message = document.getElementById(id);
	message.textContent = text;
	message.className = `neo-dialog-message${text ? ` is-${type}` : ''}`;
}

/* ---------- Formula ---------- */

let formulaTarget = null;

function describeFormulaReferences(sheet) {
	const names = [...PlotModel.getFormulaSymbols(sheet).entries()];
	const byColumn = sheet.columns.map((column, index) => {
		const alias = names.find(([symbol, id]) => id === column.id && symbol !== PlotModel.columnLetter(index));
		return alias ? `${PlotModel.columnLetter(index)} or ${alias[0]}` : PlotModel.columnLetter(index);
	});
	return `Columns: ${byColumn.join(', ')}.`;
}

// formulaTarget is a column to edit, or null for a new column added on Apply.
function openFormulaDialog(column = null) {
	const sheet = getActiveSheet();
	formulaTarget = column;
	document.getElementById('formula-dialog-title').textContent = column
		? `Formula for column ${PlotModel.columnLetter(sheet.columns.indexOf(column))}`
		: 'New formula column';
	document.getElementById('formula-input').value = column ? column.formula || '' : '';
	document.getElementById('formula-name').value = column ? column.name : '';
	document.getElementById('formula-unit').value = column ? column.unit : '';
	document.getElementById('formula-references').textContent = describeFormulaReferences(sheet);
	document.getElementById('formula-propagate').checked = !!(column && getPropagatedColumn(column));
	previewFormula();
	openDialog('formula-dialog');
	document.getElementById('formula-input').focus();
}

// A live check against the first row that has every input, so mistakes show before Apply.
function previewFormula() {
	const sheet = getActiveSheet();
	const text = document.getElementById('formula-input').value;
	if (!PlotModel.cleanFormulaText(text)) {
		setDialogMessage('formula-message', '');
		return null;
	}
	// A copy, so the trial run never touches the real columns.
	const draft = { ...sheet, columns: sheet.columns.map(column => ({ ...column, cells: column.cells.slice() })) };
	const role = formulaTarget ? formulaTarget.role : 'Y';
	const probe = PlotModel.createColumn('__probe__', { formula: text, role }, sheet.rowCount);
	const index = formulaTarget ? sheet.columns.indexOf(formulaTarget) : draft.columns.length;
	draft.columns.splice(index, formulaTarget ? 1 : 0, probe);
	const propagate = document.getElementById('formula-propagate').checked;
	let delta = null;
	if (propagate) {
		const existing = formulaTarget ? draft.columns.findIndex(column => column.propagateFrom === formulaTarget.id) : -1;
		delta = PlotModel.createColumn('__probe_delta__', { role: role === 'X' ? 'xErr' : 'yErr', propagateFrom: '__probe__' }, sheet.rowCount);
		draft.columns.splice(existing >= 0 ? existing : index + 1, existing >= 0 ? 1 : 0, delta);
	}
	PlotModel.recomputeFormulas(draft, math);
	renderPropagationWorking(propagate && !probe.formulaError ? PlotModel.describePropagation(draft, probe, math) : null);
	if (probe.formulaError) {
		setDialogMessage('formula-message', probe.formulaError);
		return null;
	}
	const row = probe.cells.findIndex(value => value !== '');
	const deltaText = delta && row >= 0 && delta.cells[row] ? ` ± ${delta.cells[row]}` : '';
	setDialogMessage('formula-message', row < 0
		? 'The formula is valid. Rows fill in once their inputs have numbers.'
		: `Row ${row + 1} gives ${probe.cells[row]}${deltaText}.`, 'success');
	return PlotModel.cleanFormulaText(text);
}

// The working: Δf = √Σ(∂f/∂x · Δx)², each partial derivative written out.
function renderPropagationWorking(working) {
	const box = document.getElementById('formula-working');
	if (!working) {
		box.hidden = true;
		box.replaceChildren();
		return;
	}
	const lines = [];
	if (!working.terms.length) {
		lines.push('None of the columns in this formula has a ±Δ column yet, so the uncertainty is blank. Give them ±ΔX or ±ΔY columns first.');
	} else {
		const sum = working.terms.map(term => `\\left(\\frac{\\partial f}{\\partial ${term.symbol}}\\,\\Delta ${term.symbol}\\right)^2`).join(' + ');
		lines.push(`\\( \\Delta f = \\sqrt{${sum}} \\)`);
		working.terms.forEach((term) => {
			if (term.derivative) lines.push(`\\( \\dfrac{\\partial f}{\\partial ${term.symbol}} = ${term.derivative} \\)`);
		});
		if (working.missing.length) lines.push(`${working.missing.join(', ')} ${working.missing.length === 1 ? 'has' : 'have'} no ±Δ column, so ${working.missing.length === 1 ? 'it adds' : 'they add'} nothing.`);
		if (working.terms.some(term => term.percentage)) lines.push('Percentage uncertainties are turned into absolute ones (Δx = % × |x| ÷ 100) before they are combined.');
	}
	box.replaceChildren(...lines.map((text) => {
		const line = document.createElement('p');
		line.textContent = text;
		return line;
	}));
	box.hidden = false;
	safeTypeset(box);
}

function applyFormula() {
	const formula = previewFormula();
	if (!formula) {
		if (!document.getElementById('formula-message').textContent) setDialogMessage('formula-message', 'Enter a formula, such as T^2 or 1/L.');
		document.getElementById('formula-input').focus();
		return;
	}
	const sheet = getActiveSheet();
	const name = document.getElementById('formula-name').value.trim();
	const unit = document.getElementById('formula-unit').value.trim();
	let column = formulaTarget;
	if (!column) {
		column = createNewColumn();
		PlotModel.insertColumn(sheet, sheet.columns.length, column);
	}
	column.formula = formula;
	column.name = (name || formula).slice(0, PlotModel.NAME_MAX_LENGTH);
	column.unit = unit;
	const delta = getPropagatedColumn(column, sheet);
	const propagate = document.getElementById('formula-propagate').checked;
	if (propagate && !delta) {
		changeColumns(sheet, () => PlotModel.insertColumn(sheet, sheet.columns.indexOf(column) + 1, createNewColumn({
			name: `Δ${column.name}`.slice(0, PlotModel.NAME_MAX_LENGTH),
			unit,
			role: column.role === 'X' ? 'xErr' : 'yErr',
			propagateFrom: column.id
		})));
	} else if (!propagate && delta) {
		changeColumns(sheet, () => PlotModel.removeColumn(sheet, delta.id));
	} else if (delta) {
		delta.unit = unit;
	}
	closeDialog('formula-dialog');
	renderTable();
	afterDataChange({ structure: true });
	if (!formulaTarget) {
		const wrap = document.getElementById('neo-table-wrap');
		if (wrap) wrap.scrollLeft = wrap.scrollWidth;
	}
}

/* ---------- Clear ---------- */

function isBlankNewSheet(sheet) {
	return !String(sheet.name || '').trim() && PlotModel.isSheetEmpty(sheet) && sheet.columns.length === 2
		&& sheet.columns[0].role === 'X' && sheet.columns[0].name === 'x' && !sheet.columns[0].unit
		&& sheet.columns[1].role === 'Y' && sheet.columns[1].name === 'y' && !sheet.columns[1].unit;
}

function openClearDialog() {
	const sheet = getActiveSheet();
	const name = getSheetDisplayName(plotState.activeSheet);
	if (isBlankNewSheet(sheet)) {
		showToast(`"${name}" is already a blank sheet.`);
		return;
	}
	document.getElementById('clear-dialog-title').textContent = `Clear "${name}"`;
	const empty = PlotModel.isSheetEmpty(sheet);
	const keep = document.getElementById('clear-keep-columns');
	keep.disabled = empty;
	document.getElementById('clear-keep-note').textContent = empty
		? 'The cells are already empty.'
		: 'Empties every cell and removes this sheet\'s fits. Column names, units, roles and formulas stay, ready for new readings.';
	openDialog('clear-dialog');
	(empty ? document.getElementById('clear-reset') : keep).focus();
}

function applyClear(reset) {
	const sheet = getActiveSheet();
	if (reset) PlotModel.resetSheet(sheet, PlotModel.createIdSource(plotState));
	else PlotModel.clearSheetData(sheet);
	dropSheetFits(sheet);
	closeDialog('clear-dialog');
	if (reset) renderSheetTabs();
	renderTable();
	afterDataChange({ structure: true });
	syncTitleInput(true);
	showToast(reset ? 'The sheet is blank again: columns x and y.' : 'Data cleared. The columns are ready for new readings.');
}

/* ---------- Fill with one value ---------- */

let fillTarget = null;

function openFillDialog(sheet, column) {
	const target = PlotModel.getFillTarget(sheet, column);
	fillTarget = { sheet, column, rows: target.rows, owner: target.owner };
	const label = PlotModel.getColumnLabel(sheet, column);
	const percent = (column.role === 'xErr' || column.role === 'yErr') && column.errorType === 'percentage';
	document.getElementById('fill-dialog-title').textContent = column.name.trim() ? `Fill ${label}` : `Fill column ${label}`;
	document.getElementById('fill-unit').textContent = percent ? '%' : (column.unit || '');
	const count = target.rows.length;
	const rowsText = `${count} ${count === 1 ? 'row' : 'rows'}`;
	const summary = !count
		? (target.owner
			? `${PlotModel.getColumnLabel(sheet, target.owner)} has no readings yet, so there is nothing to fill.`
			: 'This sheet has no data yet, so there is nothing to fill.')
		: target.owner
			? `Sets ${label} in the ${rowsText} that have a reading of ${PlotModel.getColumnLabel(sheet, target.owner)}. Rows without a reading stay empty.`
			: `Sets ${label} in the ${rowsText} that have data.`;
	document.getElementById('fill-summary').textContent = summary;
	const input = document.getElementById('fill-value');
	input.value = '';
	input.disabled = !count;
	document.getElementById('fill-apply').disabled = !count;
	setDialogMessage('fill-message', '');
	openDialog('fill-dialog');
	(count ? input : document.querySelector('#fill-dialog [data-close]')).focus();
}

function applyFill() {
	if (!fillTarget || !fillTarget.rows.length) return;
	const { sheet, column, rows } = fillTarget;
	const value = document.getElementById('fill-value').value.trim();
	if (!Number.isFinite(PlotModel.parseNumber(value))) {
		setDialogMessage('fill-message', 'Enter a number such as 0.05 or 2e-3.');
		document.getElementById('fill-value').focus();
		return;
	}
	if (PlotModel.isCellInvalid(column, value)) {
		setDialogMessage('fill-message', column.errorType === 'percentage'
			? 'A percentage uncertainty must be greater than zero.'
			: 'An uncertainty cannot be negative.');
		return;
	}
	rows.forEach((row) => { column.cells[row] = value; });
	closeDialog('fill-dialog');
	fillTarget = null;
	renderTable();
	afterDataChange();
	showToast(`Filled ${rows.length} ${rows.length === 1 ? 'row' : 'rows'} of ${PlotModel.getColumnLabel(sheet, column)}.`);
}

/* ---------- Mean of repeats ---------- */

function openMeanDialog() {
	const sheet = getActiveSheet();
	const list = document.getElementById('mean-columns');
	list.querySelectorAll('label').forEach(label => label.remove());
	sheet.columns.forEach((column, index) => {
		if (column.role === 'X') return;
		const label = document.createElement('label');
		label.className = 'neo-check';
		const box = document.createElement('input');
		box.type = 'checkbox';
		box.value = column.id;
		box.checked = column.role === 'Y' && !PlotModel.isFormulaColumn(column);
		label.append(box, ` ${PlotModel.columnLetter(index)}: ${PlotModel.getColumnLabel(sheet, column)}`);
		list.appendChild(label);
	});
	setDialogMessage('mean-message', '');
	openDialog('mean-dialog');
	const first = list.querySelector('input');
	if (first) first.focus();
}

function applyMean() {
	const sheet = getActiveSheet();
	const ids = [...document.querySelectorAll('#mean-columns input:checked')].map(box => box.value);
	const repeats = sheet.columns.filter(column => ids.includes(column.id));
	if (repeats.length < 2) {
		setDialogMessage('mean-message', 'Tick at least two columns of repeat readings.');
		return;
	}
	const base = PlotModel.getRepeatBaseName(repeats.map(column => column.name));
	const formulas = PlotModel.buildRepeatFormulas(sheet, repeats);
	const unit = repeats[0].unit;
	const at = Math.max(...repeats.map(column => sheet.columns.indexOf(column))) + 1;
	changeColumns(sheet, () => {
		const mean = createNewColumn({ name: base, unit, role: 'Y', formula: formulas.mean });
		PlotModel.insertColumn(sheet, at, mean);
		sheet.fitSeries = mean.id;
		if (document.getElementById('mean-uncertainty').checked) {
			PlotModel.insertColumn(sheet, at + 1, createNewColumn({ name: `Δ${base}`, unit, role: 'yErr', formula: formulas.halfSpread }));
		}
	});
	// The repeats' letters were taken before any insertion, and every insertion is to their right.
	if (document.getElementById('mean-hide').checked) {
		repeats.forEach((column) => {
			if (!sheet.hiddenSeries.includes(column.id)) sheet.hiddenSeries.push(column.id);
		});
	}
	closeDialog('mean-dialog');
	renderTable();
	afterDataChange({ structure: true });
	showToast(`Added the mean of ${repeats.length} columns as ${base}.`);
}

/* ---------- CSV import and export ---------- */

let csvImport = null;

function chooseCsvFile() {
	const input = document.getElementById('csv-file-input');
	input.value = '';
	input.click();
}

function handleCsvFile(event) {
	const file = event.target.files && event.target.files[0];
	if (!file) return;
	const reader = new FileReader();
	reader.onload = () => {
		const rows = PlotModel.parseCsv(String(reader.result || ''));
		if (!rows.length) {
			showToast('That file has no rows to import.');
			return;
		}
		const baseName = file.name.replace(/\.(csv|txt)$/i, '').slice(0, PlotModel.SHEET_NAME_MAX_LENGTH);
		csvImport = { rows, baseName, roles: [] };
		openCsvDialog();
	};
	reader.onerror = () => showToast('The file could not be read.');
	reader.readAsText(file);
}

function getCsvHeaders() {
	return document.getElementById('csv-headers').checked ? csvImport.rows[0] : [];
}

function openCsvDialog() {
	const { rows } = csvImport;
	const width = Math.max(...rows.map(row => row.length));
	const firstRowIsText = rows.length > 1 && rows[0].some(cell => cell !== '' && !Number.isFinite(PlotModel.parseNumber(cell)));
	document.getElementById('csv-headers').checked = firstRowIsText;
	const target = document.getElementById('csv-target');
	const active = getActiveSheet();
	const options = [
		{ value: 'new', label: 'A new sheet' },
		{ value: 'replace', label: `${getSheetDisplayName(plotState.activeSheet)} (replaces its data)` }
	];
	target.replaceChildren(...options.map((option) => {
		const element = document.createElement('option');
		element.value = option.value;
		element.textContent = option.label;
		return element;
	}));
	target.value = PlotModel.isSheetEmpty(active) ? 'replace' : 'new';
	csvImport.width = width;
	resetCsvRoles();
	renderCsvPreview();
	setDialogMessage('csv-message', '');
	openDialog('csv-dialog');
	document.getElementById('csv-apply').focus();
}

function resetCsvRoles() {
	const headers = getCsvHeaders();
	csvImport.roles = PlotModel.guessImportRoles(Array.from({ length: csvImport.width }, (_, index) => headers[index] || ''));
}

function renderCsvPreview() {
	const table = document.getElementById('csv-preview');
	const headers = getCsvHeaders();
	const data = headers.length ? csvImport.rows.slice(1) : csvImport.rows;
	const head = document.createElement('thead');
	const headRow = document.createElement('tr');
	for (let index = 0; index < csvImport.width; index++) {
		const th = document.createElement('th');
		th.className = `neo-col-head role-${csvImport.roles[index].role}`;
		const select = document.createElement('select');
		select.className = 'neo-role-select';
		select.setAttribute('aria-label', `Role of imported column ${PlotModel.columnLetter(index)}`);
		ROLE_OPTIONS.forEach((option) => {
			const element = document.createElement('option');
			element.value = option.value;
			element.textContent = option.label;
			select.appendChild(element);
		});
		select.value = getRoleOptionValue(csvImport.roles[index]);
		select.addEventListener('change', () => {
			const option = ROLE_OPTIONS.find(entry => entry.value === select.value);
			csvImport.roles[index] = { role: option.role, errorType: option.errorType };
			th.className = `neo-col-head role-${option.role}`;
		});
		const { name, unit } = PlotModel.splitHeader(headers[index] || '');
		const title = document.createElement('div');
		title.className = 'neo-csv-name';
		title.textContent = name || PlotModel.columnLetter(index);
		const unitLine = document.createElement('div');
		unitLine.className = 'neo-csv-unit';
		unitLine.textContent = unit || '—';
		th.append(select, title, unitLine);
		headRow.appendChild(th);
	}
	head.appendChild(headRow);
	const body = document.createElement('tbody');
	data.slice(0, CSV_PREVIEW_ROWS).forEach((row) => {
		const tr = document.createElement('tr');
		for (let index = 0; index < csvImport.width; index++) {
			const td = document.createElement('td');
			td.className = 'neo-csv-cell';
			td.textContent = row[index] ?? '';
			tr.appendChild(td);
		}
		body.appendChild(tr);
	});
	table.replaceChildren(head, body);
	const more = data.length > CSV_PREVIEW_ROWS ? `, showing the first ${CSV_PREVIEW_ROWS}` : '';
	document.getElementById('csv-summary').textContent = `${data.length} ${data.length === 1 ? 'row' : 'rows'} and ${csvImport.width} ${csvImport.width === 1 ? 'column' : 'columns'}${more}.`;
}

function applyCsvImport() {
	if (!csvImport) return;
	if (!csvImport.roles.some(entry => entry.role === 'X')) {
		setDialogMessage('csv-message', 'Choose an X column: Y columns plot against the nearest X column to their left.');
		return;
	}
	const replace = document.getElementById('csv-target').value === 'replace';
	let sheet = getActiveSheet();
	if (replace && !PlotModel.isSheetEmpty(sheet)
		&& !window.confirm(`Replace all the data in "${getSheetDisplayName(plotState.activeSheet)}"?`)) return;
	if (!replace) {
		sheet = PlotModel.createSheet(PlotModel.createIdSource(plotState), csvImport.baseName);
		plotState.sheets.push(sheet);
	} else if (!sheet.name) {
		sheet.name = csvImport.baseName;
	}
	PlotModel.importRows(sheet, csvImport.rows, { headers: document.getElementById('csv-headers').checked, roles: csvImport.roles }, PlotModel.createIdSource(plotState));
	sheet.title = { text: '', automatic: true };
	closeDialog('csv-dialog');
	csvImport = null;
	pruneOrphanFits();
	switchSheet(plotState.sheets.indexOf(sheet));
	afterDataChange({ structure: true });
	showToast('CSV imported.');
}

async function exportCsv() {
	const sheet = getActiveSheet();
	if (PlotModel.isSheetEmpty(sheet)) {
		showToast('This sheet has no data to export.');
		return;
	}
	const fallback = getSheetDisplayName(plotState.activeSheet);
	const answer = window.prompt('Filename for the CSV file:', fallback);
	if (answer === null) return;
	const filename = `${sanitizeFilename(answer, fallback).replace(/\.csv$/i, '')}.csv`;
	const blob = new Blob([PlotModel.buildCsv(sheet)], { type: 'text/csv;charset=utf-8' });
	await saveBlobWithFallback(blob, filename, { title: 'Save CSV file' });
}

function initializeDialogs() {
	document.querySelectorAll('.neo-dialog').forEach((dialog) => {
		dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => closeDialog(dialog.id)));
		dialog.addEventListener('close', () => {
			if (dialogOpener && dialogOpener.isConnected) dialogOpener.focus();
			dialogOpener = null;
		});
		// A tap on the backdrop (outside the dialog box) closes it.
		dialog.addEventListener('click', (event) => {
			if (event.target === dialog && dialog.id !== 'original-import-dialog') closeDialog(dialog.id);
		});
	});
	document.getElementById('add-formula-button').addEventListener('click', () => openFormulaDialog(null));
	document.getElementById('formula-input').addEventListener('input', debounce(previewFormula, 150));
	document.getElementById('formula-propagate').addEventListener('change', previewFormula);
	document.getElementById('formula-apply').addEventListener('click', applyFormula);
	document.getElementById('formula-help').addEventListener('click', () => window.open(CUSTOM_FIT_HELP_URL, '_blank', 'noopener,noreferrer'));
	['formula-input', 'formula-name', 'formula-unit'].forEach((id) => {
		document.getElementById(id).addEventListener('keydown', (event) => {
			if (event.key === 'Enter') {
				event.preventDefault();
				applyFormula();
			}
		});
	});
	document.getElementById('clear-keep-columns').addEventListener('click', () => applyClear(false));
	document.getElementById('clear-reset').addEventListener('click', () => applyClear(true));
	document.getElementById('fill-apply').addEventListener('click', applyFill);
	document.getElementById('fill-value').addEventListener('keydown', (event) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			applyFill();
		}
	});
	document.getElementById('mean-button').addEventListener('click', openMeanDialog);
	document.getElementById('mean-apply').addEventListener('click', applyMean);
	document.getElementById('import-csv-button').addEventListener('click', chooseCsvFile);
	document.getElementById('csv-file-input').addEventListener('change', handleCsvFile);
	document.getElementById('csv-headers').addEventListener('change', () => {
		resetCsvRoles();
		renderCsvPreview();
	});
	document.getElementById('csv-apply').addEventListener('click', applyCsvImport);
	document.getElementById('export-csv-button').addEventListener('click', exportCsv);
}
