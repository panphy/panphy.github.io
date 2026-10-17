// Table, sheets, menus and fit results for PanPhyPlot (neo-beta).
const ROLE_OPTIONS = [
	{ value: 'X', label: 'X', role: 'X', errorType: 'absolute' },
	{ value: 'Y', label: 'Y', role: 'Y', errorType: 'absolute' },
	{ value: 'xErr', label: '±ΔX', role: 'xErr', errorType: 'absolute' },
	{ value: 'xErr%', label: '±ΔX %', role: 'xErr', errorType: 'percentage' },
	{ value: 'yErr', label: '±ΔY', role: 'yErr', errorType: 'absolute' },
	{ value: 'yErr%', label: '±ΔY %', role: 'yErr', errorType: 'percentage' },
	{ value: 'none', label: 'Ignore', role: 'none', errorType: 'absolute' }
];
const CUSTOM_FIT_HELP_URL = '/tools/panphyplot/math_ref.html';

const debouncedPlot = debounce(() => plotGraph(), 150);

function showToast(message, duration = 3000) {
	const toast = document.createElement('div');
	toast.className = 'toast-notification';
	toast.textContent = message;
	document.body.appendChild(toast);
	requestAnimationFrame(() => toast.classList.add('toast-visible'));
	setTimeout(() => {
		toast.classList.remove('toast-visible');
		toast.addEventListener('transitionend', () => toast.remove());
	}, duration);
}

// Cell edits reach the model on every keystroke, so the fitting code's flush has nothing to do.
function updateData() {}

function getRoleOptionValue(column) {
	if (column.role === 'xErr' || column.role === 'yErr') {
		return column.errorType === 'percentage' ? `${column.role}%` : column.role;
	}
	return column.role;
}

function getSheetDisplayName(index) {
	const sheet = neoState.sheets[index];
	const name = sheet ? String(sheet.name || '').trim() : '';
	return name || `Sheet ${index + 1}`;
}

function createNewColumn(options = {}) {
	const ids = NeoModel.createIdSource(neoState);
	return NeoModel.createColumn(ids.next('c'), { role: 'Y', ...options }, getActiveSheet().rowCount);
}

// Every change to the data runs through here: stale fits, validation, graph and saving.
function afterDataChange(options = {}) {
	recalculateFormulas();
	if (options.structure) {
		pruneOrphanFits();
		refreshActiveFitKey();
		renderFitSeriesSelect();
		loadCustomFitUiForActiveDataset();
		renderActiveFitResult();
	}
	if (refreshFitStaleness()) renderFitDiagnostics();
	updateValidationMessage();
	if (options.deferPlot) debouncedPlot();
	else plotGraph();
	syncTitleInput();
	scheduleSaveState();
}

/* ---------- Formulas ---------- */

// Formula results are written into the model, then into their (read-only) cells without a re-render.
function recalculateFormulas(sheet = getActiveSheet()) {
	if (typeof math === 'undefined') return;
	if (!NeoModel.recomputeFormulas(sheet, math) || sheet !== getActiveSheet()) return;
	sheet.columns.filter(NeoModel.isFormulaColumn).forEach((column) => {
		document.querySelectorAll(`#neo-table-body .neo-cell[data-column-id="${column.id}"]`).forEach((input) => {
			const value = column.cells[Number(input.dataset.row)] || '';
			if (input.value !== value) input.value = value;
		});
		const head = document.querySelector(`.neo-col-head[data-column-id="${column.id}"]`);
		if (head) renderFormulaLine(head, column);
	});
}

// Structural edits shift column letters, so formulas are rewritten to keep pointing at the same columns.
function changeColumns(sheet, edit) {
	const previousIds = sheet.columns.map(column => column.id);
	const result = edit();
	if (typeof math !== 'undefined') NeoModel.remapFormulaLetters(sheet, previousIds, math);
	return result;
}

function renderFormulaLine(th, column) {
	let line = th.querySelector('.neo-col-formula');
	if (!NeoModel.isFormulaColumn(column)) {
		if (line) line.remove();
		th.classList.remove('is-formula');
		return;
	}
	th.classList.add('is-formula');
	if (!line) {
		line = document.createElement('button');
		line.type = 'button';
		line.className = 'neo-col-formula';
		line.addEventListener('click', () => openFormulaDialog(column));
		th.querySelector('.neo-col-top').after(line);
	}
	line.classList.toggle('has-error', !!column.formulaError);
	line.textContent = column.formulaError ? `ƒ ${column.formula} ⚠` : `ƒ ${column.formula}`;
	line.title = column.formulaError || 'Edit this formula';
	line.setAttribute('aria-label', column.formulaError ? `Formula ${column.formula}: ${column.formulaError}` : `Edit formula ${column.formula}`);
}

/* ---------- Table ---------- */

function buildHeaderCell(sheet, column, index) {
	const th = document.createElement('th');
	th.className = `neo-col-head role-${column.role}`;
	th.dataset.columnId = column.id;

	const top = document.createElement('div');
	top.className = 'neo-col-top';
	const letter = document.createElement('span');
	letter.className = 'neo-col-letter';
	letter.textContent = NeoModel.columnLetter(index);

	const role = document.createElement('select');
	role.className = 'neo-role-select';
	role.setAttribute('aria-label', `Role of column ${NeoModel.columnLetter(index)}`);
	ROLE_OPTIONS.forEach((option) => {
		const element = document.createElement('option');
		element.value = option.value;
		element.textContent = option.label;
		role.appendChild(element);
	});
	role.value = getRoleOptionValue(column);
	role.addEventListener('change', () => {
		const option = ROLE_OPTIONS.find(entry => entry.value === role.value);
		column.role = option.role;
		column.errorType = option.errorType;
		renderTable();
		afterDataChange({ structure: true });
	});

	const menuButton = document.createElement('button');
	menuButton.type = 'button';
	menuButton.className = 'neo-col-menu-button';
	menuButton.setAttribute('aria-label', `Column ${NeoModel.columnLetter(index)} options`);
	menuButton.setAttribute('aria-haspopup', 'menu');
	menuButton.textContent = '⋯';
	menuButton.addEventListener('click', () => openColumnMenu(menuButton, sheet, column));

	top.append(letter, role, menuButton);

	const name = document.createElement('input');
	name.type = 'text';
	name.className = 'neo-col-name';
	name.value = column.name;
	name.maxLength = NeoModel.NAME_MAX_LENGTH;
	name.placeholder = 'Name';
	name.setAttribute('aria-label', `Name of column ${NeoModel.columnLetter(index)}`);
	name.addEventListener('input', () => {
		column.name = name.value;
		renderHeaderPreview(th, sheet, column);
		renderFitSeriesSelect();
		afterDataChange({ deferPlot: true });
	});

	const unit = document.createElement('input');
	unit.type = 'text';
	unit.className = 'neo-col-unit';
	unit.value = column.unit;
	unit.maxLength = NeoModel.NAME_MAX_LENGTH;
	unit.placeholder = 'Unit';
	unit.setAttribute('aria-label', `Unit of column ${NeoModel.columnLetter(index)}`);
	unit.addEventListener('input', () => {
		column.unit = unit.value;
		renderHeaderPreview(th, sheet, column);
		afterDataChange({ deferPlot: true });
	});

	const preview = document.createElement('div');
	preview.className = 'neo-col-preview';

	th.append(top, name, unit, preview);
	renderFormulaLine(th, column);
	renderHeaderPreview(th, sheet, column);
	return th;
}

function renderHeaderPreview(th, sheet, column) {
	const preview = th.querySelector('.neo-col-preview');
	if (!preview) return;
	preview.hidden = !latexMode;
	if (!latexMode) {
		preview.textContent = '';
		return;
	}
	preview.textContent = `\\(${columnAxisText(sheet, column)}\\)`;
	safeTypeset(preview);
}

function buildDataCell(sheet, column, row) {
	const td = document.createElement('td');
	const input = document.createElement('input');
	input.type = 'text';
	input.inputMode = 'decimal';
	input.autocomplete = 'off';
	input.className = 'neo-cell';
	if (NeoModel.isFormulaColumn(column)) {
		input.readOnly = true;
		input.classList.add('is-formula');
	}
	input.value = column.cells[row] || '';
	input.dataset.row = String(row);
	input.dataset.columnId = column.id;
	input.setAttribute('aria-label', `${NeoModel.getColumnLabel(sheet, column)}, row ${row + 1}`);
	markCellValidity(input, column);
	td.appendChild(input);
	return td;
}

function markCellValidity(input, column) {
	const invalid = NeoModel.isCellInvalid(column, input.value);
	input.classList.toggle('invalid-input', invalid);
	input.setAttribute('aria-invalid', String(invalid));
}

function renderTable() {
	const sheet = getActiveSheet();
	const head = document.getElementById('neo-table-head');
	const body = document.getElementById('neo-table-body');
	if (!head || !body) return;

	const headRow = document.createElement('tr');
	const corner = document.createElement('th');
	corner.className = 'neo-row-head neo-corner';
	corner.textContent = '#';
	headRow.appendChild(corner);
	sheet.columns.forEach((column, index) => headRow.appendChild(buildHeaderCell(sheet, column, index)));
	const addCell = document.createElement('th');
	addCell.className = 'neo-add-col';
	const addButton = document.createElement('button');
	addButton.type = 'button';
	addButton.textContent = '+';
	addButton.title = 'Add a Y column';
	addButton.setAttribute('aria-label', 'Add column');
	addButton.addEventListener('click', addColumn);
	addCell.appendChild(addButton);
	headRow.appendChild(addCell);
	head.replaceChildren(headRow);

	const fragment = document.createDocumentFragment();
	for (let row = 0; row < sheet.rowCount; row++) {
		const tr = document.createElement('tr');
		const rowHead = document.createElement('th');
		rowHead.className = 'neo-row-head';
		const rowButton = document.createElement('button');
		rowButton.type = 'button';
		rowButton.textContent = String(row + 1);
		rowButton.setAttribute('aria-label', `Row ${row + 1} options`);
		rowButton.setAttribute('aria-haspopup', 'menu');
		rowButton.addEventListener('click', () => openRowMenu(rowButton, sheet, row));
		rowHead.appendChild(rowButton);
		tr.appendChild(rowHead);
		sheet.columns.forEach(column => tr.appendChild(buildDataCell(sheet, column, row)));
		tr.appendChild(document.createElement('td'));
		fragment.appendChild(tr);
	}
	body.replaceChildren(fragment);
	updateValidationMessage();
}

function updateValidationMessage() {
	const sheet = getActiveSheet();
	let invalid = 0;
	sheet.columns.forEach((column) => {
		column.cells.forEach((value) => {
			if (NeoModel.isCellInvalid(column, value)) invalid++;
		});
	});
	const messages = [];
	if (invalid) {
		messages.push(`${invalid} invalid ${invalid === 1 ? 'cell' : 'cells'}. Use numbers such as -1.25 or 1e-5, without commas. Uncertainties must be non-negative (percentages greater than zero). Invalid cells are kept but left out of the graph.`);
	}
	const orphans = NeoModel.getSeries(sheet).filter(series => !series.xCol);
	if (orphans.length) {
		const names = orphans.map(series => NeoModel.getColumnLabel(sheet, series.yCol)).join(', ');
		messages.push(`${names}: a Y column needs an X column to its left before it can be plotted.`);
	}
	const message = document.getElementById('data-validation-message');
	if (message) message.textContent = messages.join(' ');
}

function focusCell(row, columnIndex) {
	const sheet = getActiveSheet();
	const column = sheet.columns[columnIndex];
	if (!column) return;
	const input = document.querySelector(`#neo-table-body .neo-cell[data-row="${row}"][data-column-id="${column.id}"]`);
	if (input) {
		input.focus();
		input.select();
	}
}

function handleCellInput(event) {
	const input = event.target.closest('.neo-cell');
	if (!input) return;
	const sheet = getActiveSheet();
	const column = sheet.columns.find(entry => entry.id === input.dataset.columnId);
	if (!column) return;
	column.cells[Number(input.dataset.row)] = input.value;
	markCellValidity(input, column);
	afterDataChange({ deferPlot: true });
}

function handleCellKeydown(event) {
	const input = event.target.closest('.neo-cell');
	if (!input) return;
	const sheet = getActiveSheet();
	const row = Number(input.dataset.row);
	const columnIndex = sheet.columns.findIndex(column => column.id === input.dataset.columnId);
	const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
	const atEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
	let target = null;
	switch (event.key) {
		case 'Enter':
			if (row === sheet.rowCount - 1 && input.value.trim() !== '') {
				NeoModel.setRowCount(sheet, sheet.rowCount + 1);
				renderTable();
				afterDataChange();
			}
			target = [row + 1, columnIndex];
			break;
		case 'ArrowDown': target = [row + 1, columnIndex]; break;
		case 'ArrowUp': target = [row - 1, columnIndex]; break;
		case 'ArrowRight': if (atEnd) target = [row, columnIndex + 1]; break;
		case 'ArrowLeft': if (atStart) target = [row, columnIndex - 1]; break;
		default: return;
	}
	if (!target) return;
	event.preventDefault();
	const [nextRow, nextColumn] = target;
	if (nextRow < 0 || nextRow >= sheet.rowCount || nextColumn < 0 || nextColumn >= sheet.columns.length) return;
	focusCell(nextRow, nextColumn);
}

// A multi-cell paste fills the block from this cell, adding rows and columns as needed.
function handleCellPaste(event) {
	const input = event.target.closest('.neo-cell');
	if (!input) return;
	const text = event.clipboardData ? event.clipboardData.getData('text/plain') : '';
	// A single value such as "1,250" stays in its cell (and shows as invalid) rather than splitting.
	if (!/[\t\n]/.test(text.replace(/\n+$/, ''))) return;
	event.preventDefault();
	const sheet = getActiveSheet();
	const row = Number(input.dataset.row);
	const columnIndex = sheet.columns.findIndex(column => column.id === input.dataset.columnId);
	const result = NeoModel.applyPaste(sheet, row, columnIndex, NeoModel.parsePastedText(text), () => createNewColumn());
	renderTable();
	afterDataChange({ structure: true });
	showToast(result.headers
		? `Pasted ${result.cells} cells. The first row became the column names.`
		: `Pasted ${result.cells} cells.`);
}

function addRow() {
	const sheet = getActiveSheet();
	NeoModel.setRowCount(sheet, sheet.rowCount + 1);
	renderTable();
	afterDataChange();
	focusCell(sheet.rowCount - 1, 0);
}

function addColumn() {
	const sheet = getActiveSheet();
	NeoModel.insertColumn(sheet, sheet.columns.length, createNewColumn());
	renderTable();
	afterDataChange({ structure: true });
	const wrap = document.getElementById('neo-table-wrap');
	if (wrap) wrap.scrollLeft = wrap.scrollWidth;
}

function clearSheet() {
	const sheet = getActiveSheet();
	if (NeoModel.isSheetEmpty(sheet)) return;
	if (!window.confirm(`Clear every cell in "${getSheetDisplayName(neoState.activeSheet)}"? Column names, units and roles stay.`)) return;
	sheet.columns.forEach((column) => { column.cells = column.cells.map(() => ''); });
	NeoModel.setRowCount(sheet, NeoModel.DEFAULT_ROWS);
	renderTable();
	afterDataChange();
}

/* ---------- Menus ---------- */

let menuOpener = null;

function closeMenu() {
	const menu = document.getElementById('neo-menu');
	if (!menu || menu.hidden) return;
	menu.hidden = true;
	menu.replaceChildren();
	if (menuOpener && menuOpener.isConnected) menuOpener.focus();
	menuOpener = null;
}

function openMenu(opener, items) {
	const menu = document.getElementById('neo-menu');
	if (!menu) return;
	if (!menu.hidden && menuOpener === opener) {
		closeMenu();
		return;
	}
	menu.replaceChildren();
	items.forEach((item) => {
		const button = document.createElement('button');
		button.type = 'button';
		button.setAttribute('role', 'menuitem');
		button.textContent = item.label;
		button.disabled = !!item.disabled;
		if (item.danger) button.classList.add('is-danger');
		button.addEventListener('click', () => {
			closeMenu();
			item.action();
		});
		menu.appendChild(button);
	});
	menuOpener = opener;
	menu.hidden = false;
	const rect = opener.getBoundingClientRect();
	const width = menu.offsetWidth;
	const height = menu.offsetHeight;
	const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
	const below = rect.bottom + 4;
	const top = below + height > window.innerHeight - 8 ? Math.max(8, rect.top - height - 4) : below;
	menu.style.left = `${left}px`;
	menu.style.top = `${top}px`;
	const first = menu.querySelector('button:not(:disabled)');
	if (first) first.focus();
}

function openColumnMenu(opener, sheet, column) {
	const index = sheet.columns.indexOf(column);
	const label = NeoModel.getColumnLabel(sheet, column);
	openMenu(opener, [
		{ label: 'Move left', disabled: index === 0, action: () => moveColumn(sheet, column, -1) },
		{ label: 'Move right', disabled: index === sheet.columns.length - 1, action: () => moveColumn(sheet, column, 1) },
		{ label: 'Insert column to the right', action: () => insertColumnAfter(sheet, column) },
		{ label: NeoModel.isFormulaColumn(column) ? 'Edit formula…' : 'Set formula…', action: () => openFormulaDialog(column) },
		...(NeoModel.isFormulaColumn(column) ? [{ label: 'Remove formula, keep values', action: () => removeFormula(column) }] : []),
		{ label: 'Fill with one value…', disabled: NeoModel.isFormulaColumn(column), action: () => fillColumn(sheet, column) },
		{ label: 'Clear column', disabled: NeoModel.isFormulaColumn(column), action: () => clearColumn(sheet, column) },
		{ label: `Delete column ${label}`, danger: true, disabled: sheet.columns.length === 1, action: () => deleteColumn(sheet, column) }
	]);
}

function openRowMenu(opener, sheet, row) {
	openMenu(opener, [
		{ label: 'Insert row above', action: () => { NeoModel.insertRow(sheet, row); renderTable(); afterDataChange(); } },
		{ label: 'Insert row below', action: () => { NeoModel.insertRow(sheet, row + 1); renderTable(); afterDataChange(); } },
		{ label: `Delete row ${row + 1}`, danger: true, action: () => { NeoModel.removeRow(sheet, row); renderTable(); afterDataChange(); } }
	]);
}

function moveColumn(sheet, column, offset) {
	if (!changeColumns(sheet, () => NeoModel.moveColumn(sheet, column.id, offset))) return;
	renderTable();
	afterDataChange({ structure: true });
	const button = document.querySelector(`.neo-col-head[data-column-id="${column.id}"] .neo-col-menu-button`);
	if (button) button.focus();
}

function insertColumnAfter(sheet, column) {
	changeColumns(sheet, () => NeoModel.insertColumn(sheet, sheet.columns.indexOf(column) + 1, createNewColumn()));
	renderTable();
	afterDataChange({ structure: true });
}

// The usual way to give every reading the same uncertainty, e.g. ±0.05 s.
function fillColumn(sheet, column) {
	const label = NeoModel.getColumnLabel(sheet, column);
	const answer = window.prompt(`Value for every row of ${label}:`, '');
	if (answer === null) return;
	const value = answer.trim();
	if (value && !Number.isFinite(NeoModel.parseNumber(value))) {
		showToast('Enter a number such as 0.05 or 2e-3.');
		return;
	}
	column.cells = column.cells.map(() => value);
	renderTable();
	afterDataChange();
}

function clearColumn(sheet, column) {
	if (column.cells.every(NeoModel.isBlank)) return;
	if (!window.confirm(`Clear every cell in ${NeoModel.getColumnLabel(sheet, column)}?`)) return;
	column.cells = column.cells.map(() => '');
	renderTable();
	afterDataChange();
}

function removeFormula(column) {
	column.formula = '';
	column.formulaError = '';
	renderTable();
	afterDataChange();
}

function deleteColumn(sheet, column) {
	const hasData = column.cells.some(cell => !NeoModel.isBlank(cell));
	if (hasData && !window.confirm(`Delete column ${NeoModel.getColumnLabel(sheet, column)} and its data?`)) return;
	changeColumns(sheet, () => NeoModel.removeColumn(sheet, column.id));
	renderTable();
	afterDataChange({ structure: true });
}

/* ---------- Sheets ---------- */

function renderSheetTabs() {
	const bar = document.getElementById('sheet-tabs');
	if (!bar) return;
	const fragment = document.createDocumentFragment();
	neoState.sheets.forEach((sheet, index) => {
		const active = index === neoState.activeSheet;
		const tab = document.createElement('div');
		tab.className = `dataset-tab${active ? ' active' : ''}`;
		const label = document.createElement('button');
		label.type = 'button';
		label.className = 'tab-label';
		label.setAttribute('role', 'tab');
		label.setAttribute('aria-selected', String(active));
		label.title = active ? 'Tap to rename this sheet' : 'Open this sheet';
		label.textContent = getSheetDisplayName(index);
		label.addEventListener('click', () => {
			if (index === neoState.activeSheet) startSheetRename(index, tab, label);
			else switchSheet(index);
		});
		tab.appendChild(label);
		if (neoState.sheets.length > 1) {
			const close = document.createElement('button');
			close.type = 'button';
			close.className = 'tab-close';
			close.title = 'Remove sheet';
			close.setAttribute('aria-label', `Remove ${getSheetDisplayName(index)}`);
			close.textContent = '×';
			close.addEventListener('click', () => removeSheet(index));
			tab.appendChild(close);
		}
		fragment.appendChild(tab);
	});
	const add = document.createElement('button');
	add.type = 'button';
	add.className = 'add-dataset-btn';
	add.title = 'Add a new sheet';
	add.setAttribute('aria-label', 'Add sheet');
	add.textContent = '+';
	add.addEventListener('click', addSheet);
	fragment.appendChild(add);
	bar.replaceChildren(fragment);
}

function startSheetRename(index, tab, label) {
	const input = document.createElement('input');
	input.type = 'text';
	input.className = 'dataset-tab-name-input';
	input.maxLength = NeoModel.SHEET_NAME_MAX_LENGTH;
	input.value = neoState.sheets[index].name || getSheetDisplayName(index);
	input.setAttribute('aria-label', 'Sheet name');
	let done = false;
	const finish = (save) => {
		if (done) return;
		done = true;
		if (save) neoState.sheets[index].name = input.value.trim().slice(0, NeoModel.SHEET_NAME_MAX_LENGTH);
		renderSheetTabs();
		renderFitSeriesSelect();
		scheduleSaveState();
		const activeLabel = document.querySelector('#sheet-tabs .dataset-tab.active .tab-label');
		if (activeLabel) activeLabel.focus();
	};
	input.addEventListener('keydown', (event) => {
		if (event.key === 'Enter') finish(true);
		else if (event.key === 'Escape') finish(false);
	});
	input.addEventListener('blur', () => finish(true));
	tab.replaceChild(input, label);
	input.focus();
	input.select();
}

function switchSheet(index) {
	closeMenu();
	neoState.activeSheet = index;
	refreshActiveFitKey();
	setInitialParameters(getCurrentAdvancedFitMethod());
	renderSheetTabs();
	renderTable();
	renderFitSeriesSelect();
	loadCustomFitUiForActiveDataset();
	renderActiveFitResult();
	syncTitleInput(true);
	plotGraph();
	scheduleSaveState();
}

function addSheet() {
	const sheet = NeoModel.createSheet(NeoModel.createIdSource(neoState), '');
	neoState.sheets.push(sheet);
	switchSheet(neoState.sheets.length - 1);
}

function removeSheet(index) {
	const sheet = neoState.sheets[index];
	if (!NeoModel.isSheetEmpty(sheet) && !window.confirm(`Remove "${getSheetDisplayName(index)}" and all its data?`)) return;
	neoState.sheets.splice(index, 1);
	pruneOrphanFits();
	const next = Math.min(neoState.activeSheet >= index && neoState.activeSheet > 0 ? neoState.activeSheet - 1 : neoState.activeSheet, neoState.sheets.length - 1);
	switchSheet(Math.max(0, next));
}

/* ---------- Graph title ---------- */

function syncTitleInput(force = false) {
	const input = document.getElementById('graph-title');
	const sheet = getActiveSheet();
	if (!input || !sheet) return;
	if (sheet.title.automatic || force) {
		const text = getSheetTitle(sheet);
		if (input.value !== text) input.value = text;
	}
}

function handleTitleInput(event) {
	const sheet = getActiveSheet();
	const value = event.target.value;
	sheet.title = value.trim() === '' ? { text: '', automatic: true } : { text: value, automatic: false };
	debouncedPlot();
	scheduleSaveState();
}

/* ---------- Fitting ---------- */

function describeSeries(sheet, series) {
	const y = NeoModel.getColumnLabel(sheet, series.yCol);
	return series.xCol ? `${y} against ${NeoModel.getColumnLabel(sheet, series.xCol)}` : `${y} (needs an X column)`;
}

function renderFitSeriesSelect() {
	const select = document.getElementById('fit-series-select');
	const sheet = getActiveSheet();
	if (!select || !sheet) return;
	const series = NeoModel.getSeries(sheet);
	select.replaceChildren(...series.map((entry) => {
		const option = document.createElement('option');
		option.value = entry.id;
		option.textContent = describeSeries(sheet, entry);
		option.disabled = !entry.xCol;
		return option;
	}));
	if (!series.length) {
		const option = document.createElement('option');
		option.textContent = 'No Y column yet';
		select.appendChild(option);
	}
	select.disabled = !series.length;
	if (sheet.fitSeries) select.value = sheet.fitSeries;
	const label = document.getElementById('fit-series-label');
	const target = resolveFitKey(activeFitKey);
	if (label) label.textContent = target ? `· ${describeSeries(target.sheet, target.series)}` : '';
}

function handleFitSeriesChange(event) {
	const sheet = getActiveSheet();
	sheet.fitSeries = event.target.value;
	refreshActiveFitKey();
	setInitialParameters(getCurrentAdvancedFitMethod());
	renderFitSeriesSelect();
	loadCustomFitUiForActiveDataset();
	renderActiveFitResult();
	plotGraph();
	scheduleSaveState();
}

function clearFittingResultDisplay() {
	['fit-equation', 'r-squared-container'].forEach((id) => {
		const element = document.getElementById(id);
		if (!element) return;
		element.style.display = 'none';
		element.replaceChildren();
	});
	renderFitDiagnostics();
}

function renderFittingResult(equation, rSquaredDisplay) {
	const equationElement = document.getElementById('fit-equation');
	const rSquaredElement = document.getElementById('r-squared-container');
	if (!equationElement || !rSquaredElement) return;
	if (typeof equation !== 'string' || !equation.trim()) {
		clearFittingResultDisplay();
		return;
	}
	const copyTarget = document.createElement('button');
	copyTarget.type = 'button';
	copyTarget.className = 'fit-equation-copy-target neo-equation';
	copyTarget.title = 'Copy the equation as LaTeX';
	copyTarget.dataset.fitLatex = equation;
	copyTarget.textContent = `\\(${equation}\\)`;
	equationElement.replaceChildren(copyTarget);
	equationElement.style.display = 'block';
	rSquaredElement.textContent = `\\( R^2 = ${rSquaredDisplay} \\)`;
	rSquaredElement.style.display = 'block';
	renderFitDiagnostics();
	safeTypeset(equationElement);
	safeTypeset(rSquaredElement);
}

async function copyFitEquation(event) {
	const target = event.target.closest('.neo-equation');
	if (!target) return;
	try {
		await navigator.clipboard.writeText(target.dataset.fitLatex || '');
		showToast('Equation copied as LaTeX.');
	} catch (error) {
		showToast('Copying is not available in this browser.');
	}
}

function renderFitDiagnostics() {
	const status = document.getElementById('fit-status');
	if (!status) return;
	const result = datasetFitResults[activeFitKey];
	const rmse = Number.isFinite(result?.rmse) ? ` RMSE: ${PanPhyFitCore.formatFitNumber(result.rmse, false)}.` : '';
	status.textContent = !result ? 'No fit calculated yet.' : result.stale
		? 'Data changed. Click Fit Curve to update the fit.'
		: `${result.status || 'Fit calculated.'}${rmse}`;
	status.classList.toggle('fit-outdated', !!result?.stale);
}

function renderActiveFitResult() {
	const result = datasetFitResults[activeFitKey];
	if (result) renderFittingResult(result.equation, result.rSquared);
	else clearFittingResultDisplay();
	plotResiduals();
}

function clearFittedCurve() {
	if (!activeFitKey) return;
	invalidatePendingFit(activeFitKey);
	delete datasetFitResults[activeFitKey];
	delete fittedCurves[activeFitKey];
	clearFittingResultDisplay();
	plotGraph();
	scheduleSaveState();
}

function onSeriesVisibilityChange() {
	plotGraph();
	syncTitleInput();
	const popup = document.getElementById('popup-container');
	if (popup && popup.style.display === 'block') plotAllSheets();
	scheduleSaveState();
}

/* ---------- Panels and popups ---------- */

function toggleSection(sectionId, button) {
	const section = document.getElementById(sectionId);
	if (!section) return;
	const isOpen = section.classList.toggle('is-open');
	if (button) button.setAttribute('aria-expanded', String(isOpen));
}

function openTab(event, tabName) {
	document.querySelectorAll('.tablink').forEach(link => link.classList.remove('active'));
	document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
	document.getElementById(tabName).classList.add('active');
	event.currentTarget.classList.add('active');
	if (tabName === 'BasicFit') {
		safeTypeset(document.getElementById('basic-fit-equation'));
	} else if (tabName === 'AdvancedFit') {
		changeAdvancedFitMethod();
		safeTypeset(document.getElementById('advanced-fit-general-equation'));
	} else if (tabName === 'CustomFit') {
		refreshCustomFitDefinition({ preserveUserValues: true, suppressSave: true });
		safeTypeset(document.getElementById('custom-fit-general-equation'));
	}
}

let popupOpener = null;

function openPlotAll() {
	popupOpener = document.activeElement;
	document.getElementById('popup-background').style.display = 'block';
	document.getElementById('popup-container').style.display = 'block';
	forceReplot();
	plotAllSheets();
	document.getElementById('popup-close').focus();
}

function closePopup() {
	document.getElementById('popup-background').style.display = 'none';
	document.getElementById('popup-container').style.display = 'none';
	if (popupOpener && popupOpener.isConnected) popupOpener.focus();
	popupOpener = null;
}

function initializeInterface() {
	const body = document.getElementById('neo-table-body');
	body.addEventListener('input', handleCellInput);
	body.addEventListener('keydown', handleCellKeydown);
	body.addEventListener('paste', handleCellPaste);
	body.addEventListener('focusin', (event) => {
		if (event.target.classList.contains('neo-cell')) event.target.select();
	});

	document.getElementById('add-row-button').addEventListener('click', addRow);
	document.getElementById('add-column-button').addEventListener('click', addColumn);
	document.getElementById('clear-sheet-button').addEventListener('click', clearSheet);
	document.getElementById('fit-series-select').addEventListener('change', handleFitSeriesChange);
	document.getElementById('graph-title').addEventListener('input', handleTitleInput);
	document.getElementById('fit-equation').addEventListener('click', copyFitEquation);
	document.getElementById('plot-all-button').addEventListener('click', openPlotAll);
	document.getElementById('popup-close').addEventListener('click', closePopup);
	document.getElementById('popup-background').addEventListener('click', closePopup);
	['combined-title', 'combined-x-label', 'combined-y-label'].forEach((id) => {
		const input = document.getElementById(id);
		input.addEventListener('input', debounce(() => {
			input.dataset.edited = input.value.trim() ? 'true' : 'false';
			plotAllSheets();
		}, 200));
	});
	const help = document.getElementById('custom-fit-formula-help');
	if (help) help.addEventListener('click', () => window.open(CUSTOM_FIT_HELP_URL, '_blank', 'noopener,noreferrer'));

	document.addEventListener('pointerdown', (event) => {
		const menu = document.getElementById('neo-menu');
		if (menu && !menu.hidden && !menu.contains(event.target) && event.target !== menuOpener) closeMenu();
	});
	document.addEventListener('keydown', (event) => {
		if (event.key !== 'Escape') return;
		const menu = document.getElementById('neo-menu');
		if (menu && !menu.hidden) {
			event.preventDefault();
			closeMenu();
		} else if (document.getElementById('popup-container').style.display === 'block') {
			event.preventDefault();
			closePopup();
		}
	});
	document.getElementById('neo-menu').addEventListener('keydown', (event) => {
		if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
		event.preventDefault();
		const items = [...event.currentTarget.querySelectorAll('button:not(:disabled)')];
		const index = items.indexOf(document.activeElement);
		const next = items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
		if (next) next.focus();
	});
	window.addEventListener('resize', closeMenu);
	document.getElementById('neo-table-wrap').addEventListener('scroll', closeMenu);
}
