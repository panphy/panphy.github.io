// Table, sheets, menus and fit results for PanPhyPlot.
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
	toast.setAttribute('role', 'status');
	// An open dialog sits in the top layer and blurs the page behind it, so the toast must join that
	// layer too: as a popover where supported, or inside the dialog itself otherwise.
	const openDialog = document.querySelector('dialog[open]');
	if (typeof toast.showPopover === 'function') {
		toast.popover = 'manual';
		document.body.appendChild(toast);
		toast.showPopover();
	} else {
		(openDialog || document.body).appendChild(toast);
	}
	requestAnimationFrame(() => toast.classList.add('toast-visible'));
	setTimeout(() => {
		toast.classList.remove('toast-visible');
		toast.addEventListener('transitionend', () => toast.remove());
	}, duration);
}

// LaTeX-mode labels (column headers, series names, the graph title) are typeset once per text:
// the finished drawing is kept by its TeX source, so a rebuilt label with the same text reuses
// it. While a name or unit is being typed, typesetting waits for a pause in the typing.
const LABEL_TYPESET_DELAY = 250;
const LABEL_CACHE_LIMIT = 300;
const labelTypesetCache = new Map();
let labelTypesetDelay = 0;

function withLabelTypesetDelay(callback) {
	labelTypesetDelay = LABEL_TYPESET_DELAY;
	try {
		callback();
	} finally {
		labelTypesetDelay = 0;
	}
}

// Plain text for a label that may have been typeset, so a later typeset of the same TeX redraws it.
function setPlainLabel(element, text) {
	clearTimeout(element.labelTypesetTimer);
	element.labelTypesetTimer = null;
	delete element.dataset.texSource;
	element.textContent = text;
}

// A placeholder is shown in a new label until its typesetting runs; a label that already shows
// something keeps it until then.
function typesetLabel(element, source, placeholder = null) {
	if (element.dataset.texSource === source && !element.labelTypesetTimer) return;
	clearTimeout(element.labelTypesetTimer);
	element.labelTypesetTimer = null;
	const isNew = element.dataset.texSource === undefined;
	element.dataset.texSource = source;
	const cached = labelTypesetCache.get(source);
	if (cached) {
		element.innerHTML = cached;
		return;
	}
	// A label typeset straight away may still be on its way into the page (a header being built).
	const run = (delayed) => {
		element.labelTypesetTimer = null;
		if ((delayed && !element.isConnected) || element.dataset.texSource !== source) return;
		element.textContent = source;
		safeTypeset(element).then(() => {
			if (element.dataset.texSource !== source || !element.querySelector('svg')) return;
			const copy = element.cloneNode(true);
			copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
			labelTypesetCache.delete(source);
			labelTypesetCache.set(source, copy.innerHTML);
			if (labelTypesetCache.size > LABEL_CACHE_LIMIT) labelTypesetCache.delete(labelTypesetCache.keys().next().value);
		});
	};
	if (!labelTypesetDelay) {
		run(false);
		return;
	}
	if (isNew && placeholder !== null) element.textContent = placeholder;
	element.labelTypesetTimer = setTimeout(() => run(true), labelTypesetDelay);
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
	const sheet = plotState.sheets[index];
	const name = sheet ? String(sheet.name || '').trim() : '';
	return name || `Sheet ${index + 1}`;
}

function createNewColumn(options = {}) {
	const ids = PlotModel.createIdSource(plotState);
	return PlotModel.createColumn(ids.next('c'), { role: 'Y', ...options }, getActiveSheet().rowCount);
}

// Every change to the data runs through here: stale fits, validation, graph and saving.
function afterDataChange(options = {}) {
	recalculateFormulas();
	renderBarSummary();
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
	refreshWorkspaceChrome();
	scheduleSaveState();
}

/* ---------- Series list and status bar ---------- */

function refreshWorkspaceChrome() {
	renderSeriesList();
	renderStatus();
	syncCombinedButton();
}

/* ---------- Scatter graph or bar chart ---------- */

// Toolbar buttons that cannot act stay focusable and say why when pressed.
function setToolAvailable(button, available, title) {
	if (!button) return;
	if (!button.dataset.title) button.dataset.title = button.title;
	if (available) button.removeAttribute('aria-disabled');
	else button.setAttribute('aria-disabled', 'true');
	button.title = available ? button.dataset.title : title;
}

const COMBINED_MIXED_MESSAGE = 'All sheets needs every sheet with data to be the same kind of graph: all scatter or all bar.';
const BAR_MEAN_MESSAGE = 'In a bar chart the Mean row already gives the mean of each column\'s readings.';

// All sheets draws scatter graphs together or bar charts together, never a mix of the two.
function syncCombinedButton() {
	setToolAvailable(document.getElementById('plot-all-button'), PlotModel.getCombinedMode(plotState.sheets) !== 'mixed', COMBINED_MIXED_MESSAGE);
}

// Shows the active sheet's kind of graph: the toolbar choice, the bar settings and the layout.
// A bar sheet has no roles, fits or series list, so the inspector is hidden (panphyplot.css).
function applyChartMode() {
	const sheet = getActiveSheet();
	const bar = PlotModel.isBarSheet(sheet);
	const app = document.querySelector('.neo-app');
	if (!app || !sheet) return;
	app.dataset.chart = bar ? 'bar' : 'scatter';
	document.querySelectorAll('#chart-type [data-chart-type]').forEach((button) => {
		button.setAttribute('aria-pressed', String(button.dataset.chartType === (bar ? 'bar' : 'scatter')));
	});
	document.getElementById('bar-settings').hidden = !bar;
	const fields = { 'bar-value-name': sheet.valueAxis.name, 'bar-value-unit': sheet.valueAxis.unit, 'bar-category-title': sheet.categoryTitle };
	Object.entries(fields).forEach(([id, value]) => {
		const input = document.getElementById(id);
		if (input.value !== value) input.value = value;
	});
	document.getElementById('bar-error-bars').checked = sheet.errorBars;
	document.getElementById('data-pane-hint').textContent = bar
		? 'Each column is a bar; its rows are repeat readings'
		: 'Y plots against the nearest X to its left';
	document.getElementById('data-pane-foot-hint').hidden = bar;
	document.getElementById('graph-empty-text').textContent = bar
		? 'Type a name and a reading in each column. Each column becomes a bar, as tall as the mean of its readings.'
		: 'Type or paste readings into the table. Each Y column becomes a series.';
	const addColumnButton = document.getElementById('add-column-button');
	addColumnButton.title = bar ? 'Add a bar at the right' : 'Add a Y column at the right';
	setToolAvailable(document.getElementById('mean-button'), !bar, BAR_MEAN_MESSAGE);
	// The manual has a guide for each kind of graph; inside the app it also follows data-chart (manual.js).
	const manualLink = document.querySelector('a[data-manual-overlay]');
	if (manualLink) {
		const url = new URL(manualLink.href);
		if (bar) url.searchParams.set('mode', 'bar');
		else url.searchParams.delete('mode');
		manualLink.href = url.href;
	}
	if (typeof refreshPaneLayout === 'function') refreshPaneLayout();
}

// A sheet with data keeps its kind of graph, because the same cells mean something else in the
// other kind. Choosing the other kind then offers a new sheet (dialogs.js); an empty sheet switches.
function setSheetChartType(type) {
	const sheet = getActiveSheet();
	if ((PlotModel.isBarSheet(sheet) ? 'bar' : 'scatter') === type) return;
	if (!PlotModel.isSheetEmpty(sheet)) {
		openChartTypeDialog(type);
		return;
	}
	if (!PlotModel.setChartType(sheet, type)) return;
	closeMenu();
	cellSelection = null;
	applyChartMode();
	renderTable();
	forceReplot();
	afterDataChange({ structure: true });
	syncTitleInput(true);
}

function handleBarSettingInput(event) {
	const sheet = getActiveSheet();
	if (!PlotModel.isBarSheet(sheet)) return;
	const value = event.target.value;
	if (event.target.id === 'bar-value-name') sheet.valueAxis.name = value;
	else if (event.target.id === 'bar-value-unit') sheet.valueAxis.unit = value;
	else sheet.categoryTitle = value;
	debouncedPlot();
	syncTitleInput();
	scheduleSaveState();
}

function formatBarNumber(value) {
	return value === null ? '' : String(Number(value.toPrecision(6)));
}

// The highlighted rows under a bar sheet's readings: the mean of each column, which is the
// height of its bar, and with error bars on, its uncertainty. They are worked out from the
// cells and never stored, so the sheet's rows, formulas and exports hold readings only.
function renderBarSummary() {
	const foot = document.getElementById('neo-table-foot');
	const sheet = getActiveSheet();
	if (!foot || !sheet) return;
	if (!PlotModel.isBarSheet(sheet)) {
		delete foot.dataset.signature;
		if (foot.childElementCount) foot.replaceChildren();
		return;
	}
	const bars = PlotModel.getBars(sheet);
	const rows = [{
		name: 'Mean',
		title: 'The mean of each column\'s readings, which is the height of its bar',
		text: bar => formatBarNumber(bar.mean),
		describe: bar => (bar.mean === null ? 'no readings' : formatBarNumber(bar.mean))
	}];
	if (sheet.errorBars) {
		rows.push({
			name: 'Uncertainty',
			title: 'Half the spread between the largest and the smallest reading, drawn as the error bar',
			text: bar => (bar.uncertainty === null ? '' : `± ${formatBarNumber(bar.uncertainty)}`),
			describe: bar => (bar.uncertainty === null ? 'needs two readings' : `plus or minus ${formatBarNumber(bar.uncertainty)}`)
		});
	}
	const signature = JSON.stringify([sheet.id, bars.map(bar => [bar.id, bar.label, ...rows.map(row => row.text(bar))])]);
	if (foot.dataset.signature === signature) return;
	foot.dataset.signature = signature;
	foot.replaceChildren(...rows.map((row) => {
		const tr = document.createElement('tr');
		tr.className = `neo-summary-row neo-summary-${row.name.toLowerCase()}`;
		const head = document.createElement('th');
		head.className = 'neo-row-head neo-summary-head';
		head.scope = 'row';
		head.textContent = row.name;
		head.title = row.title;
		tr.appendChild(head);
		bars.forEach((bar) => {
			const td = document.createElement('td');
			td.className = 'neo-summary-cell';
			td.textContent = row.text(bar);
			td.setAttribute('aria-label', `${row.name} of ${bar.label}: ${row.describe(bar)}`);
			if (bar.uncertainty === null && row.name === 'Uncertainty' && bar.count === 1) td.title = 'One reading has no spread';
			tr.appendChild(td);
		});
		tr.appendChild(document.createElement('td'));
		return tr;
	}));
}

// The inspector's Series card: the graph's color key, with a tap to hide or show each series.
function renderSeriesList() {
	const list = document.getElementById('series-list');
	const sheet = getActiveSheet();
	if (!list || !sheet) return;
	const series = PlotModel.getSeries(sheet);
	// Typing in a cell refreshes this card on every keystroke; rebuild (and re-typeset) only on change.
	const signature = JSON.stringify([latexMode, sheet.id, sheet.hiddenSeries, series.map(entry => [
		describeSeries(sheet, entry), getSeriesLook(sheet, entry.id), PlotModel.getSeriesPoints(sheet, entry).length,
		datasetFitResults[makeFitKey(sheet, entry.id)]?.stale ?? null
	])]);
	if (list.dataset.signature === signature) return;
	list.dataset.signature = signature;
	if (!series.length) {
		const empty = document.createElement('li');
		empty.className = 'neo-series-empty';
		empty.textContent = 'Set a column\'s role to Y to plot it.';
		list.replaceChildren(empty);
		return;
	}
	list.replaceChildren(...series.map((entry) => {
		const item = document.createElement('li');
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'neo-series-item';
		const visible = !sheet.hiddenSeries.includes(entry.id);
		button.setAttribute('aria-pressed', String(visible));
		button.title = visible ? 'Hide this series on the graph' : 'Show this series on the graph';
		item.className = 'neo-series-row';
		item.classList.toggle('is-hidden', !visible);
		// The swatch is the series' color and shape, and opens their choices.
		const look = getSeriesLook(sheet, entry.id);
		const swatch = document.createElement('button');
		swatch.type = 'button';
		swatch.className = 'neo-series-style';
		swatch.dataset.seriesId = entry.id;
		swatch.style.setProperty('--series-color', look?.color || 'var(--line-strong)');
		swatch.title = 'Choose the color and shape';
		swatch.setAttribute('aria-label', `Color and shape of ${describeSeries(sheet, entry)}`);
		swatch.setAttribute('aria-haspopup', 'dialog');
		swatch.setAttribute('aria-expanded', 'false');
		swatch.disabled = !entry.xCol;
		swatch.appendChild(symbolIcon(look?.symbol || 'circle'));
		swatch.addEventListener('click', () => openStylePopover(swatch, sheet, entry.yCol));
		const name = document.createElement('span');
		name.className = 'neo-series-name';
		setSeriesText(name, sheet, entry);
		name.title = describeSeries(sheet, entry);
		const meta = document.createElement('span');
		meta.className = 'neo-series-meta';
		const count = PlotModel.getSeriesPoints(sheet, entry).length;
		meta.textContent = `${count} ${count === 1 ? 'pt' : 'pts'}`;
		button.append(name);
		const result = datasetFitResults[makeFitKey(sheet, entry.id)];
		if (result) {
			const badge = document.createElement('span');
			badge.className = 'neo-series-fit';
			badge.textContent = result.stale ? 'fit outdated' : 'fit';
			button.appendChild(badge);
		}
		button.appendChild(meta);
		button.disabled = !entry.xCol;
		button.addEventListener('click', () => {
			const hidden = sheet.hiddenSeries;
			const index = hidden.indexOf(entry.id);
			if (index >= 0) hidden.splice(index, 1);
			else hidden.push(entry.id);
			onSeriesVisibilityChange(sheet);
		});
		item.append(swatch, button);
		return item;
	}));
}

function renderStatus() {
	const status = document.getElementById('neo-status');
	const sheet = getActiveSheet();
	if (!status || !sheet) return;
	const series = PlotModel.getSeries(sheet).filter(entry => entry.xCol);
	const bars = PlotModel.isBarSheet(sheet) ? PlotModel.getBars(sheet).filter(bar => bar.mean !== null).length : null;
	let rows = 0;
	for (let row = 0; row < sheet.rowCount; row++) {
		if (sheet.columns.some(column => !PlotModel.isBlank(column.cells[row]))) rows++;
	}
	const saved = document.createElement('span');
	saved.className = persistenceDisabled || changedElsewhere ? 'is-practice' : 'is-saved';
	saved.textContent = persistenceDisabled ? '● Practice data, not saved'
		: changedElsewhere ? '● Not saving: changed in another tab'
			: '● Saved in this browser';
	const range = typeof getSelectedRange === 'function' ? getSelectedRange() : null;
	const selected = range ? ` · ${range.r1 - range.r0 + 1} × ${range.c1 - range.c0 + 1} cells selected` : '';
	status.replaceChildren(
		`${getSheetDisplayName(plotState.activeSheet)} · ${bars === null ? `${series.length} series` : `${bars} ${bars === 1 ? 'bar' : 'bars'}`} · ${rows} ${rows === 1 ? 'row' : 'rows'}${selected} · `,
		saved
	);
}

function onWorkspaceChangedElsewhere() {
	const banner = document.getElementById('tab-conflict');
	if (banner) banner.hidden = false;
	renderStatus();
}

function resolveTabConflict(keep) {
	if (!keep) {
		window.location.reload();
		return;
	}
	if (!window.confirm('Save this tab\'s work over the changes made in the other tab?')) return;
	keepThisTabVersion();
	document.getElementById('tab-conflict').hidden = true;
	renderStatus();
	showToast('This tab\'s version is saved. The other tab will offer to reload.');
}

// Fills an empty sheet (or a new one) with the pendulum readings the tour uses.
function loadSampleData() {
	let sheet = getActiveSheet();
	if (PlotModel.isBarSheet(sheet)) {
		loadBarSampleData(sheet);
		return;
	}
	if (!PlotModel.isSheetEmpty(sheet)) {
		sheet = PlotModel.createSheet(PlotModel.createIdSource(plotState), 'Pendulum');
		plotState.sheets.push(sheet);
	} else if (!sheet.name) {
		sheet.name = 'Pendulum';
	}
	const ids = PlotModel.createIdSource(plotState);
	sheet.columns = [
		PlotModel.createColumn(ids.next('c'), { name: 'L', unit: 'm', role: 'X', cells: TOUR_LENGTHS }, PlotModel.DEFAULT_ROWS),
		...TOUR_REPEATS.map((cells, index) => PlotModel.createColumn(ids.next('c'), { name: `T${index + 1}`, unit: 's', role: 'Y', cells }, PlotModel.DEFAULT_ROWS))
	];
	PlotModel.setRowCount(sheet, PlotModel.DEFAULT_ROWS);
	sheet.hiddenSeries = [];
	sheet.fitSeries = null;
	pruneOrphanFits();
	switchSheet(plotState.sheets.indexOf(sheet));
	afterDataChange({ structure: true });
	showToast('Sample pendulum data loaded: three repeat readings of the period T.');
}

// Bounce heights of four balls dropped from 1 m, three readings each.
const BAR_SAMPLE = [['Tennis', ['54', '57', '55']], ['Golf', ['72', '75', '74']], ['Squash', ['18', '21', '19']], ['Basketball', ['60', '63', '62']]];

function loadBarSampleData(active) {
	let sheet = active;
	if (!PlotModel.isSheetEmpty(sheet)) {
		sheet = PlotModel.createSheet(PlotModel.createIdSource(plotState), 'Bounce');
		PlotModel.setChartType(sheet, 'bar');
		plotState.sheets.push(sheet);
	} else if (!sheet.name) {
		sheet.name = 'Bounce';
	}
	const ids = PlotModel.createIdSource(plotState);
	sheet.columns = BAR_SAMPLE.map(([name, cells]) => PlotModel.createColumn(ids.next('c'), { name, cells }, PlotModel.BAR_START_ROWS));
	PlotModel.setRowCount(sheet, PlotModel.BAR_START_ROWS);
	sheet.valueAxis = { name: 'Bounce height', unit: 'cm' };
	sheet.categoryTitle = 'Ball';
	sheet.errorBars = true;
	sheet.title = { text: '', automatic: true };
	sheet.hiddenSeries = [];
	sheet.fitSeries = null;
	pruneOrphanFits();
	switchSheet(plotState.sheets.indexOf(sheet));
	afterDataChange({ structure: true });
	showToast('Sample data loaded: three bounce heights for each of four balls.');
}

// Data sent by another PanPhy app (PanPhyTrack) in the link's hash, #import=<JSON>: a sheet name and
// columns of { name, unit, role, cells, hidden }. The hash is cleared at once, so a reload does not import
// it again. Anyone can make such a link, so text is reduced to plain characters and the message is fixed.
let importedFromLink = false;

function cleanLinkedText(value) {
	return String(value ?? '').replace(/[\\<>{}$&"'`]/g, '').trim();
}

function importLinkedData() {
	const match = window.location.hash.match(/^#import=(.+)$/s);
	if (!match) return;
	window.history.replaceState(null, '', window.location.pathname + window.location.search);
	if (persistenceDisabled) return;
	let payload;
	try {
		payload = JSON.parse(decodeURIComponent(match[1]));
	} catch (error) {
		showToast('The data in this link could not be read.');
		return;
	}
	const columns = Array.isArray(payload?.columns) ? payload.columns.filter(column => column && Array.isArray(column.cells)) : [];
	if (!columns.length) return;
	const ids = PlotModel.createIdSource(plotState);
	const baseName = cleanLinkedText(payload.name).slice(0, PlotModel.SHEET_NAME_MAX_LENGTH - 3) || 'Imported';
	const taken = new Set(plotState.sheets.map(entry => entry.name));
	let name = baseName;
	for (let number = 2; taken.has(name); number++) name = `${baseName} ${number}`;
	let sheet = getActiveSheet();
	if (!PlotModel.isSheetEmpty(sheet)) {
		sheet = PlotModel.createSheet(ids, name);
		plotState.sheets.push(sheet);
	} else {
		sheet.name = name;
	}
	const rowCount = Math.max(PlotModel.DEFAULT_ROWS, ...columns.map(column => column.cells.length + 1));
	sheet.columns = columns.map(column => PlotModel.createColumn(ids.next('c'), {
		name: cleanLinkedText(column.name),
		unit: cleanLinkedText(column.unit),
		role: column.role,
		cells: column.cells.map(value => (value === null || value === undefined ? '' : String(value)))
	}, rowCount));
	PlotModel.setRowCount(sheet, rowCount);
	sheet.hiddenSeries = sheet.columns.filter((column, index) => column.role === 'Y' && columns[index].hidden === true).map(column => column.id);
	sheet.fitSeries = null;
	importedFromLink = true;
	pruneOrphanFits();
	switchSheet(plotState.sheets.indexOf(sheet));
	afterDataChange({ structure: true });
	const hiddenWithData = sheet.columns.some(column => sheet.hiddenSeries.includes(column.id) && column.cells.some(cell => cell !== ''));
	showToast(hiddenWithData ? `Data imported into the sheet "${name}". Some series start hidden; show them in the Series list.` : `Data imported into the sheet "${name}".`, 6000);
}

/* ---------- Formulas ---------- */

// Formula results are written into the model, then into their (read-only) cells without a re-render.
function recalculateFormulas(sheet = getActiveSheet()) {
	if (typeof math === 'undefined') return;
	if (!PlotModel.recomputeFormulas(sheet, math) || sheet !== getActiveSheet()) return;
	sheet.columns.filter(PlotModel.isComputedColumn).forEach((column) => {
		document.querySelectorAll(`#neo-table-body .neo-cell[data-column-id="${column.id}"]`).forEach((input) => {
			const value = displayCellValue(column, column.cells[Number(input.dataset.row)]);
			if (input.value !== value) input.value = value;
		});
		const head = document.querySelector(`.neo-col-head[data-column-id="${column.id}"]`);
		if (head) renderFormulaLine(head, column, sheet);
	});
}

// Calculated cells show six significant figures; the model keeps every digit for fits and exports.
function displayCellValue(column, value) {
	const text = value || '';
	if (!text || !PlotModel.isComputedColumn(column)) return text;
	const number = PlotModel.parseNumber(text);
	return Number.isFinite(number) ? String(Number(number.toPrecision(6))) : text;
}

// Structural edits shift column letters, so formulas are rewritten to keep pointing at the same columns.
function changeColumns(sheet, edit) {
	const previousIds = sheet.columns.map(column => column.id);
	const result = edit();
	if (typeof math !== 'undefined') PlotModel.remapFormulaLetters(sheet, previousIds, math);
	return result;
}

function renderFormulaLine(th, column, sheet = getActiveSheet()) {
	let line = th.querySelector('.neo-col-formula');
	if (!PlotModel.isComputedColumn(column)) {
		if (line) line.remove();
		th.classList.remove('is-formula');
		return;
	}
	th.classList.add('is-formula');
	if (!line) {
		line = document.createElement('button');
		line.type = 'button';
		line.className = 'neo-col-formula';
		line.addEventListener('click', () => {
			const source = getFormulaSource(column);
			if (source) openFormulaDialog(source);
			else showToast(column.formulaError || 'The formula this uncertainty came from has been deleted.');
		});
		th.querySelector('.neo-col-top').after(line);
	}
	const source = getFormulaSource(column);
	const label = PlotModel.isPropagatedColumn(column)
		? `Δ from ${source ? PlotModel.getColumnLabel(sheet, source) : '?'}`
		: `ƒ ${column.formula}`;
	line.classList.toggle('has-error', !!column.formulaError);
	line.textContent = column.formulaError ? `${label} ⚠` : label;
	line.title = column.formulaError || 'Edit this formula';
	line.setAttribute('aria-label', column.formulaError ? `${label}: ${column.formulaError}` : `Edit formula: ${label}`);
}

// A propagated ±Δ column is edited through the formula it comes from.
function getFormulaSource(column, sheet = getActiveSheet()) {
	if (!PlotModel.isPropagatedColumn(column)) return column;
	return sheet.columns.find(entry => entry.id === column.propagateFrom) || null;
}

function getPropagatedColumn(column, sheet = getActiveSheet()) {
	return sheet.columns.find(entry => entry.propagateFrom === column.id) || null;
}

/* ---------- Table ---------- */

function buildHeaderCell(sheet, column, index) {
	const th = document.createElement('th');
	// On a bar sheet roles are kept but unused: every column is a bar, in the bars' color.
	const bar = PlotModel.isBarSheet(sheet);
	th.className = `neo-col-head role-${bar ? 'bar' : column.role}`;
	th.dataset.columnId = column.id;
	// A Y column's head wears its series color from the graph.
	const seriesColor = bar ? getBarColor(sheet, column.id) : column.role === 'Y' ? getSeriesColor(sheet, column.id) : null;
	if (seriesColor) th.style.setProperty('--series-color', seriesColor);

	const top = document.createElement('div');
	top.className = 'neo-col-top';
	// The letter doubles as the drag handle for moving the column.
	const letter = document.createElement('span');
	letter.className = 'neo-col-letter neo-col-grip';
	letter.textContent = PlotModel.columnLetter(index);
	letter.title = 'Drag to move this column';
	letter.setAttribute('aria-hidden', 'true');
	letter.addEventListener('pointerdown', event => startColumnDrag(event, sheet, column, th));

	const role = document.createElement('select');
	role.className = 'neo-role-select';
	role.setAttribute('aria-label', `Role of column ${PlotModel.columnLetter(index)}`);
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
	menuButton.setAttribute('aria-label', `Column ${PlotModel.columnLetter(index)} options`);
	menuButton.setAttribute('aria-haspopup', 'menu');
	menuButton.textContent = '⋯';
	menuButton.addEventListener('click', () => openColumnMenu(menuButton, sheet, column));

	if (bar) {
		const spacer = document.createElement('span');
		spacer.className = 'neo-col-spacer';
		top.append(letter, spacer, menuButton);
	} else {
		top.append(letter, role, menuButton);
	}

	const name = document.createElement('input');
	name.type = 'text';
	name.className = 'neo-col-name';
	name.value = column.name;
	name.maxLength = PlotModel.NAME_MAX_LENGTH;
	name.placeholder = bar ? 'Bar name' : 'Name';
	name.setAttribute('aria-label', `Name of column ${PlotModel.columnLetter(index)}`);
	name.addEventListener('input', () => {
		const previousSymbols = PlotModel.getFormulaSymbols(sheet);
		column.name = name.value;
		// Formulas that used the old name follow the column.
		if (typeof math !== 'undefined' && PlotModel.remapFormulaNames(sheet, previousSymbols, math)) {
			sheet.columns.filter(PlotModel.isFormulaColumn).forEach((entry) => {
				const head = document.querySelector(`.neo-col-head[data-column-id="${entry.id}"]`);
				if (head) renderFormulaLine(head, entry, sheet);
			});
		}
		withLabelTypesetDelay(() => {
			renderHeaderPreview(th, sheet, column);
			renderFitSeriesSelect();
			afterDataChange({ deferPlot: true });
		});
	});

	const unit = document.createElement('input');
	unit.type = 'text';
	unit.className = 'neo-col-unit';
	unit.value = column.unit;
	unit.maxLength = PlotModel.NAME_MAX_LENGTH;
	unit.placeholder = 'Unit';
	unit.setAttribute('aria-label', `Unit of column ${PlotModel.columnLetter(index)}`);
	unit.addEventListener('input', () => {
		column.unit = unit.value;
		withLabelTypesetDelay(() => {
			renderHeaderPreview(th, sheet, column);
			afterDataChange({ deferPlot: true });
		});
	});

	const preview = document.createElement('div');
	preview.className = 'neo-col-preview';
	applyPreviewState(preview);
	preview.addEventListener('click', () => unfoldHeaderAt(column.id));
	preview.addEventListener('keydown', (event) => {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		if (!headerFolded) return;
		event.preventDefault();
		unfoldHeaderAt(column.id);
	});
	// Enter finishes a quick edit: the row folds and the cursor stays on this column's label.
	[name, unit].forEach((input) => {
		input.addEventListener('keydown', (event) => {
			if (event.key !== 'Enter' || event.isComposing || !headerOpen) return;
			event.preventDefault();
			setHeaderOpen(false);
			th.querySelector('.neo-col-preview')?.focus();
		});
	});

	const resizer = document.createElement('div');
	resizer.className = 'neo-col-resize';
	resizer.title = 'Drag to change the column width; double-click for the default width';
	resizer.setAttribute('aria-hidden', 'true');
	resizer.addEventListener('pointerdown', event => startColumnResize(event, sheet, column, th));
	resizer.addEventListener('dblclick', () => {
		column.width = null;
		applyColumnWidth(th, column);
		scheduleSaveState();
	});
	applyColumnWidth(th, column);

	// A bar has a name only: the value axis carries the quantity and its unit.
	th.append(top, name, ...(bar ? [] : [unit]), preview, resizer);
	renderFormulaLine(th, column, sheet);
	renderHeaderPreview(th, sheet, column);
	return th;
}

// A folded header row shows the label as plain text when LaTeX mode is off, so columns stay told apart.
function renderHeaderPreview(th, sheet, column) {
	const preview = th.querySelector('.neo-col-preview');
	if (!preview) return;
	preview.hidden = !latexMode && !headerFolded;
	if (!latexMode) {
		setPlainLabel(preview, headerFolded ? columnAxisText(sheet, column) : '');
		return;
	}
	typesetLabel(preview, `\\(${columnAxisText(sheet, column)}\\)`);
}

/* ---------- Folding the header row ---------- */

// Like a collapsed ribbon: the row stays folded, opens for a quick edit and folds again once the
// pointer or focus leaves it (or Enter is pressed in a name or unit). Pinning keeps it open, and
// the pin is remembered in this browser only, like the pane widths.
const HEADER_PIN_STORAGE_KEY = 'panphyplot-neo-header-pinned';
const LEGACY_HEADER_FOLD_STORAGE_KEY = 'panphyplot-neo-header-folded';
let headerPinned = readHeaderPinned();
let headerOpen = false;
let headerFolded = !headerPinned;
let headerPointerOutside = false;

function readHeaderPinned() {
	try {
		const pinned = localStorage.getItem(HEADER_PIN_STORAGE_KEY);
		// An earlier version remembered an unfolded row as '0' under the old key.
		return pinned === null ? localStorage.getItem(LEGACY_HEADER_FOLD_STORAGE_KEY) === '0' : pinned === '1';
	} catch (error) {
		return false;
	}
}

function setHeaderPinned(pinned) {
	headerPinned = pinned;
	headerOpen = false;
	try {
		localStorage.setItem(HEADER_PIN_STORAGE_KEY, pinned ? '1' : '0');
		localStorage.removeItem(LEGACY_HEADER_FOLD_STORAGE_KEY);
	} catch (error) {
		// A private window may refuse; the choice then lasts for this visit only.
	}
	applyHeaderFoldState();
}

function setHeaderOpen(open) {
	if (headerPinned || headerOpen === open) return;
	headerOpen = open;
	applyHeaderFoldState();
}

// Updates the row in place, so a cell that was just clicked keeps its focus.
function applyHeaderFoldState() {
	headerFolded = !headerPinned && !headerOpen;
	const head = document.getElementById('neo-table-head');
	if (!head) return;
	head.closest('table').classList.toggle('is-header-folded', headerFolded);
	const button = head.querySelector('.neo-header-fold');
	if (button) updateHeaderFoldButton(button);
	const sheet = getActiveSheet();
	head.querySelectorAll('.neo-col-head').forEach((th) => {
		const column = sheet.columns.find(entry => entry.id === th.dataset.columnId);
		const preview = th.querySelector('.neo-col-preview');
		if (preview) applyPreviewState(preview);
		if (column) renderHeaderPreview(th, sheet, column);
	});
}

function applyPreviewState(preview) {
	if (headerFolded) {
		preview.tabIndex = 0;
		preview.setAttribute('role', 'button');
		preview.title = PlotModel.isBarSheet(getActiveSheet()) ? 'Edit the name' : 'Edit the name and unit';
	} else {
		preview.removeAttribute('tabindex');
		preview.removeAttribute('role');
		preview.removeAttribute('title');
	}
}

const HEADER_ICON_OPEN = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const HEADER_ICON_FOLD = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 10l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const HEADER_ICON_PIN = '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M6 2.5h4M6.6 2.5l-.6 4.2L4 9h8l-2-2.3-.6-4.2M8 9v4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function updateHeaderFoldButton(button) {
	const state = headerPinned ? 'pinned' : headerOpen ? 'open' : 'folded';
	const labels = {
		folded: 'Show the name and unit boxes',
		open: 'Pin the name and unit boxes open',
		pinned: 'Unpin and fold the name and unit boxes'
	};
	button.dataset.state = state;
	button.setAttribute('aria-label', labels[state]);
	button.title = labels[state];
	button.setAttribute('aria-pressed', String(headerPinned));
	button.innerHTML = state === 'folded' ? HEADER_ICON_OPEN : state === 'open' ? HEADER_ICON_PIN : HEADER_ICON_FOLD;
}

function buildHeaderFoldButton() {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'neo-header-fold';
	updateHeaderFoldButton(button);
	button.addEventListener('click', () => {
		if (headerPinned) setHeaderPinned(false);
		else if (headerOpen) setHeaderPinned(true);
		else setHeaderOpen(true);
	});
	bindHeaderAutoFold();
	return button;
}

// The column menu, dialogs opened from the row and toasts count as part of it.
function isInHeaderZone(node) {
	if (!(node instanceof Element)) return false;
	return !!node.closest('#neo-table-head, #neo-menu, dialog[open], .toast-notification');
}

let headerAutoFoldBound = false;

function bindHeaderAutoFold() {
	if (headerAutoFoldBound) return;
	headerAutoFoldBound = true;
	// A click elsewhere folds the row once the pointer is released, so the click lands where aimed.
	document.addEventListener('pointerdown', (event) => {
		if (!headerOpen || isInHeaderZone(event.target)) return;
		headerPointerOutside = true;
		const finish = () => {
			window.removeEventListener('pointerup', finish, true);
			window.removeEventListener('pointercancel', finish, true);
			headerPointerOutside = false;
			setHeaderOpen(false);
		};
		window.addEventListener('pointerup', finish, true);
		window.addEventListener('pointercancel', finish, true);
	}, true);
	// Tabbing out of the row folds it straight away.
	document.addEventListener('focusin', (event) => {
		if (!headerOpen || headerPointerOutside || isInHeaderZone(event.target)) return;
		setHeaderOpen(false);
	});
	document.addEventListener('keydown', (event) => {
		if (event.key !== 'Escape' || !headerOpen || !event.target.closest?.('#neo-table-head')) return;
		if (document.getElementById('neo-menu')?.hidden === false) return;
		const th = event.target.closest('.neo-col-head');
		setHeaderOpen(false);
		(th?.querySelector('.neo-col-preview') || document.querySelector('#neo-table-head .neo-header-fold'))?.focus();
	});
}

// In a folded row, the label opens the row and puts the cursor in that column's name.
function unfoldHeaderAt(columnId) {
	if (!headerFolded) return;
	setHeaderOpen(true);
	const name = document.querySelector(`#neo-table-head .neo-col-head[data-column-id="${columnId}"] .neo-col-name`);
	if (name) {
		name.focus();
		name.select();
	}
}

function buildDataCell(sheet, column, row) {
	const td = document.createElement('td');
	const input = document.createElement('input');
	input.type = 'text';
	input.inputMode = 'decimal';
	input.autocomplete = 'off';
	input.className = 'neo-cell';
	if (PlotModel.isComputedColumn(column)) {
		input.readOnly = true;
		input.classList.add('is-formula');
	}
	input.value = displayCellValue(column, column.cells[row]);
	input.dataset.row = String(row);
	input.dataset.columnId = column.id;
	input.setAttribute('aria-label', `${PlotModel.getColumnLabel(sheet, column)}, row ${row + 1}`);
	markCellValidity(input, column);
	td.appendChild(input);
	return td;
}

// On a bar sheet every column holds readings, whatever role it had as a scatter column.
function isCellInvalid(sheet, column, value) {
	if (!PlotModel.isBarSheet(sheet)) return PlotModel.isCellInvalid(column, value);
	return !PlotModel.isBlank(value) && !Number.isFinite(PlotModel.parseNumber(value));
}

function markCellValidity(input, column) {
	const invalid = isCellInvalid(getActiveSheet(), column, input.value);
	input.classList.toggle('invalid-input', invalid);
	input.setAttribute('aria-invalid', String(invalid));
}

const TABLE_VIRTUAL_THRESHOLD = 200;
let tableWindow = null;
let tableScrollFrame = 0;

function renderTableRows(requestedRow = null) {
	const sheet = getActiveSheet();
	const wrap = document.getElementById('neo-table-wrap');
	const body = document.getElementById('neo-table-body');
	if (!wrap || !body) return;
	const virtual = sheet.rowCount > TABLE_VIRTUAL_THRESHOLD;
	const rowHeight = window.matchMedia('(pointer: coarse)').matches ? 45 : 37;
	let first = 0, last = sheet.rowCount;
	if (virtual) {
		const count = Math.max(80, Math.ceil(wrap.clientHeight / rowHeight) + 40);
		first = Math.max(0, Math.floor(wrap.scrollTop / rowHeight) - 20);
		if (requestedRow !== null && (requestedRow < first || requestedRow >= first + count)) {
			first = Math.max(0, requestedRow - 20);
			wrap.scrollTop = requestedRow * rowHeight;
		}
		first = Math.min(first, Math.max(0, sheet.rowCount - count));
		last = Math.min(sheet.rowCount, first + count);
	}
	if (tableWindow?.sheet === sheet && tableWindow.first === first && tableWindow.last === last && tableWindow.rowHeight === rowHeight) return;
	const focused = document.activeElement;
	const savedFocus = focused?.classList.contains('neo-cell') && body.contains(focused)
		? { row: Number(focused.dataset.row), column: focused.dataset.columnId, start: focused.selectionStart, end: focused.selectionEnd } : null;
	const fragment = document.createDocumentFragment();
	const spacer = rows => {
		if (!rows) return;
		const tr = document.createElement('tr'), td = document.createElement('td');
		tr.className = 'neo-table-spacer'; tr.setAttribute('aria-hidden', 'true');
		td.colSpan = sheet.columns.length + 2;
		td.style.height = `${rows * rowHeight}px`; tr.appendChild(td); fragment.appendChild(tr);
	};
	spacer(first);
	for (let row = first; row < last; row++) {
		const tr = document.createElement('tr');
		tr.setAttribute('aria-rowindex', String(row + 2));
		const rowHead = document.createElement('th');
		rowHead.className = 'neo-row-head';
		const rowButton = document.createElement('button');
		rowButton.type = 'button';
		rowButton.textContent = String(row + 1);
		rowButton.setAttribute('aria-label', `Row ${row + 1} options`);
		rowButton.setAttribute('aria-haspopup', 'menu');
		rowButton.addEventListener('click', () => openRowMenu(rowButton, sheet, row));
		rowHead.appendChild(rowButton); tr.appendChild(rowHead);
		sheet.columns.forEach(column => tr.appendChild(buildDataCell(sheet, column, row)));
		tr.appendChild(document.createElement('td')); fragment.appendChild(tr);
	}
	spacer(sheet.rowCount - last);
	// The row under the last one that adds another, like the + column at the right.
	fragment.appendChild(buildAddRow(sheet));
	body.replaceChildren(fragment);
	tableWindow = { sheet, first, last, rowHeight };
	if (savedFocus && savedFocus.row >= first && savedFocus.row < last) {
		const input = body.querySelector(`.neo-cell[data-row="${savedFocus.row}"][data-column-id="${savedFocus.column}"]`);
		if (input) { input.focus({ preventScroll: true }); input.setSelectionRange(savedFocus.start, savedFocus.end); }
	}
	if (cellSelection) renderCellSelection();
}

function buildAddRow(sheet) {
	const tr = document.createElement('tr');
	tr.className = 'neo-add-row';
	const head = document.createElement('th');
	head.className = 'neo-row-head';
	const button = document.createElement('button');
	button.type = 'button';
	button.textContent = '+';
	button.title = PlotModel.isBarSheet(sheet) ? 'Add a row for another reading' : 'Add a row';
	button.setAttribute('aria-label', 'Add row');
	button.addEventListener('click', addRow);
	head.appendChild(button);
	const fill = document.createElement('td');
	fill.className = 'neo-add-row-fill';
	fill.colSpan = sheet.columns.length + 1;
	fill.textContent = PlotModel.isBarSheet(sheet) ? 'Add a reading' : 'Add a row';
	fill.setAttribute('aria-hidden', 'true');
	fill.addEventListener('click', addRow);
	tr.append(head, fill);
	return tr;
}

function scheduleTableRows() {
	if (tableScrollFrame) return;
	tableScrollFrame = requestAnimationFrame(() => { tableScrollFrame = 0; renderTableRows(); });
}

function renderTable() {
	const sheet = getActiveSheet();
	const head = document.getElementById('neo-table-head');
	const body = document.getElementById('neo-table-body');
	if (!head || !body) return;

	const headRow = document.createElement('tr');
	const corner = document.createElement('th');
	corner.className = 'neo-row-head neo-corner';
	corner.appendChild(buildHeaderFoldButton());
	headRow.appendChild(corner);
	head.closest('table').classList.toggle('is-header-folded', headerFolded);
	sheet.columns.forEach((column, index) => headRow.appendChild(buildHeaderCell(sheet, column, index)));
	const addCell = document.createElement('th');
	addCell.className = 'neo-add-col';
	const addButton = document.createElement('button');
	addButton.type = 'button';
	addButton.textContent = '+';
	addButton.title = PlotModel.isBarSheet(sheet) ? 'Add a bar' : 'Add a Y column';
	addButton.setAttribute('aria-label', PlotModel.isBarSheet(sheet) ? 'Add bar' : 'Add column');
	addButton.addEventListener('click', addColumn);
	addCell.appendChild(addButton);
	headRow.appendChild(addCell);
	head.replaceChildren(headRow);

	const table = body.closest('table');
	table.classList.toggle('is-virtual', sheet.rowCount > TABLE_VIRTUAL_THRESHOLD);
	table.setAttribute('aria-rowcount', String(sheet.rowCount + 1));
	tableWindow = null;
	renderTableRows();
	renderBarSummary();
	updateValidationMessage();
	if (cellSelection) {
		const clamp = point => ({ row: Math.min(point.row, sheet.rowCount - 1), col: Math.min(point.col, sheet.columns.length - 1) });
		cellSelection = { anchor: clamp(cellSelection.anchor), head: clamp(cellSelection.head) };
		renderCellSelection();
	}
}

function updateValidationMessage() {
	const sheet = getActiveSheet();
	let invalid = 0;
	sheet.columns.forEach((column) => {
		column.cells.forEach((value) => {
			if (isCellInvalid(sheet, column, value)) invalid++;
		});
	});
	const messages = [];
	const bar = PlotModel.isBarSheet(sheet);
	if (invalid) {
		messages.push(bar
			? `${invalid} invalid ${invalid === 1 ? 'cell' : 'cells'}. Use numbers such as -1.25 or 1e-5, without commas. Invalid cells are kept but left out of the mean.`
			: `${invalid} invalid ${invalid === 1 ? 'cell' : 'cells'}. Use numbers such as -1.25 or 1e-5, without commas. Uncertainties must be non-negative (percentages greater than zero). Invalid cells are kept but left out of the graph.`);
	}
	const orphans = bar ? [] : PlotModel.getSeries(sheet).filter(series => !series.xCol);
	if (orphans.length) {
		const names = orphans.map(series => PlotModel.getColumnLabel(sheet, series.yCol)).join(', ');
		messages.push(`${names}: a Y column needs an X column to its left before it can be plotted.`);
	}
	const message = document.getElementById('data-validation-message');
	if (message) message.textContent = messages.join(' ');
}

function focusCell(row, columnIndex) {
	const sheet = getActiveSheet();
	const column = sheet.columns[columnIndex];
	if (!column) return;
	renderTableRows(row);
	const input = document.querySelector(`#neo-table-body .neo-cell[data-row="${row}"][data-column-id="${column.id}"]`);
	if (input) {
		input.focus();
		input.select();
	}
}

function handleCellInput(event) {
	const input = event.target.closest('.neo-cell');
	if (!input) return;
	clearCellSelection();
	const sheet = getActiveSheet();
	const column = sheet.columns.find(entry => entry.id === input.dataset.columnId);
	if (!column) return;
	column.cells[Number(input.dataset.row)] = input.value;
	markCellValidity(input, column);
	afterDataChange({ deferPlot: true });
}

/* ---------- Selecting a range of cells ---------- */

// The anchor is where a selection started; the head is the cell it reaches. A selection of one
// cell is no selection: that cell simply has the focus.
let cellSelection = null;

function cellPosition(input) {
	const sheet = getActiveSheet();
	return { row: Number(input.dataset.row), col: sheet.columns.findIndex(column => column.id === input.dataset.columnId) };
}

function getSelectedRange() {
	if (!cellSelection) return null;
	const { anchor, head } = cellSelection;
	if (anchor.row === head.row && anchor.col === head.col) return null;
	return PlotModel.normalizeRange({ r0: anchor.row, r1: head.row, c0: anchor.col, c1: head.col });
}

function renderCellSelection() {
	const body = document.getElementById('neo-table-body');
	if (!body) return;
	body.querySelectorAll('td.is-selected').forEach((td) => {
		td.classList.remove('is-selected', 'sel-top', 'sel-bottom', 'sel-left', 'sel-right');
	});
	const range = getSelectedRange();
	if (range) {
		const sheet = getActiveSheet();
		const columns = new Map(sheet.columns.map((column, index) => [column.id, index]));
		body.querySelectorAll('.neo-cell').forEach(input => {
			const row = Number(input.dataset.row), col = columns.get(input.dataset.columnId);
			if (row < range.r0 || row > range.r1 || col < range.c0 || col > range.c1) return;
			const td = input.parentElement;
			td.classList.add('is-selected');
			td.classList.toggle('sel-top', row === range.r0);
			td.classList.toggle('sel-bottom', row === range.r1);
			td.classList.toggle('sel-left', col === range.c0);
			td.classList.toggle('sel-right', col === range.c1);
		});
	}
	renderStatus();
}

function clearCellSelection() {
	if (!cellSelection) return;
	cellSelection = null;
	renderCellSelection();
}

function setCellSelection(anchor, head) {
	cellSelection = { anchor, head };
	renderCellSelection();
}

// Dragging across cells with a mouse or pen selects a rectangle; Shift+click extends from the
// cell that has the focus. On a touch screen a drag scrolls the table, so Shift+arrows select there.
function handleCellPointerDown(event) {
	const input = event.target.closest('.neo-cell');
	if (!input || event.button !== 0 || event.pointerType === 'touch') return;
	const start = cellPosition(input);
	const focused = document.activeElement && document.activeElement.classList.contains('neo-cell') ? document.activeElement : null;
	if (event.shiftKey && focused) {
		event.preventDefault();
		setCellSelection(cellSelection ? cellSelection.anchor : cellPosition(focused), start);
		return;
	}
	cellSelection = { anchor: start, head: start };
	renderCellSelection();
	const move = (moveEvent) => {
		const hit = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
		const cell = hit && hit.closest && hit.closest('#neo-table-body .neo-cell');
		if (!cell || !cellSelection) return;
		const head = cellPosition(cell);
		if (head.row === cellSelection.head.row && head.col === cellSelection.head.col) return;
		document.body.classList.add('neo-is-selecting');
		if (window.getSelection) window.getSelection().removeAllRanges();
		setCellSelection(cellSelection.anchor, head);
	};
	const up = () => {
		document.removeEventListener('pointermove', move);
		document.removeEventListener('pointerup', up);
		document.body.classList.remove('neo-is-selecting');
		// Keep the starting cell's value selected, so typing replaces it and copy takes the range.
		if (getSelectedRange()) input.select();
	};
	document.addEventListener('pointermove', move);
	document.addEventListener('pointerup', up);
}

function handleCellCopy(event, cut = false) {
	const range = getSelectedRange();
	if (!range || !event.clipboardData) return;
	event.preventDefault();
	const sheet = getActiveSheet();
	event.clipboardData.setData('text/plain', PlotModel.getRangeText(sheet, range));
	if (cut) clearSelectedCells(sheet, range);
}

function clearSelectedCells(sheet, range) {
	const cleared = PlotModel.fillRange(sheet, range, '');
	renderTable();
	afterDataChange();
	if (!cleared) showToast('Calculated columns are filled by their formulas and cannot be cleared.');
}

function handleCellKeydown(event) {
	const input = event.target.closest('.neo-cell');
	if (!input) return;
	const sheet = getActiveSheet();
	const row = Number(input.dataset.row);
	const columnIndex = sheet.columns.findIndex(column => column.id === input.dataset.columnId);
	const selectedRange = getSelectedRange();
	// Shift+arrows grow the selection from this cell, as in a spreadsheet.
	if (event.shiftKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
		event.preventDefault();
		const anchor = cellSelection ? cellSelection.anchor : { row, col: columnIndex };
		const head = cellSelection ? { ...cellSelection.head } : { row, col: columnIndex };
		if (event.key === 'ArrowUp') head.row = Math.max(0, head.row - 1);
		if (event.key === 'ArrowDown') head.row = Math.min(sheet.rowCount - 1, head.row + 1);
		if (event.key === 'ArrowLeft') head.col = Math.max(0, head.col - 1);
		if (event.key === 'ArrowRight') head.col = Math.min(sheet.columns.length - 1, head.col + 1);
		setCellSelection(anchor, head);
		return;
	}
	if (selectedRange && (event.key === 'Delete' || event.key === 'Backspace')) {
		event.preventDefault();
		clearSelectedCells(sheet, selectedRange);
		return;
	}
	if (event.key === 'Escape' && selectedRange) {
		event.preventDefault();
		clearCellSelection();
		return;
	}
	if (selectedRange && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Tab'].includes(event.key)) clearCellSelection();
	// A cell selects its whole value on entry, so typing replaces it; with the whole value selected,
	// left and right move to the next cell at once, as in a spreadsheet.
	const allSelected = input.value.length > 0 && input.selectionStart === 0 && input.selectionEnd === input.value.length;
	const atStart = allSelected || (input.selectionStart === 0 && input.selectionEnd === 0);
	const atEnd = allSelected || (input.selectionStart === input.value.length && input.selectionEnd === input.value.length);
	let target = null;
	switch (event.key) {
		case 'Enter':
			if (row === sheet.rowCount - 1 && input.value.trim() !== '') {
				PlotModel.setRowCount(sheet, sheet.rowCount + 1);
				renderTable();
				afterDataChange();
			}
			target = [row + 1, columnIndex];
			break;
		case 'Tab': {
			if (sheet.rowCount <= TABLE_VIRTUAL_THRESHOLD) return;
			const next = row * sheet.columns.length + columnIndex + (event.shiftKey ? -1 : 1);
			if (next < 0 || next >= sheet.rowCount * sheet.columns.length) return;
			target = [Math.floor(next / sheet.columns.length), (next + sheet.columns.length) % sheet.columns.length];
			break;
		}
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
	const sheet = getActiveSheet();
	const range = getSelectedRange();
	const single = !/[\t\n]/.test(text.replace(/\n+$/, ''));
	// One value pasted over a selected range fills every cell of it.
	if (range && single) {
		event.preventDefault();
		const filled = PlotModel.fillRange(sheet, range, text.replace(/\n+$/, '').trim());
		renderTable();
		afterDataChange();
		showToast(`Filled ${filled} ${filled === 1 ? 'cell' : 'cells'}.`);
		return;
	}
	// A single value such as "1,250" stays in its cell (and shows as invalid) rather than splitting.
	if (single) return;
	event.preventDefault();
	// A block lands at the top-left of the selection, or at this cell.
	const row = range ? range.r0 : Number(input.dataset.row);
	const columnIndex = range ? range.c0 : sheet.columns.findIndex(column => column.id === input.dataset.columnId);
	const result = PlotModel.applyPaste(sheet, row, columnIndex, PlotModel.parsePastedText(text), () => createNewColumn());
	renderTable();
	afterDataChange({ structure: true });
	showToast(result.headers
		? `Pasted ${result.cells} cells. The first row became the column names.`
		: `Pasted ${result.cells} cells.`);
}

function addRow() {
	const sheet = getActiveSheet();
	PlotModel.setRowCount(sheet, sheet.rowCount + 1);
	renderTable();
	afterDataChange();
	focusCell(sheet.rowCount - 1, 0);
}

function addColumn() {
	const sheet = getActiveSheet();
	PlotModel.insertColumn(sheet, sheet.columns.length, createNewColumn());
	renderTable();
	afterDataChange({ structure: true });
	const wrap = document.getElementById('neo-table-wrap');
	if (wrap) wrap.scrollLeft = wrap.scrollWidth;
}

// The toolbar's Clear: a choice between emptying the cells and a blank sheet (dialogs.js).
function clearSheet() {
	openClearDialog();
}

// A cleared or reset sheet has nothing left to fit, so its fits and fit drafts go too.
function dropSheetFits(sheet) {
	const prefix = `${sheet.id}:`;
	Object.keys(fitEpochs).forEach((key) => {
		if (key.startsWith(prefix)) invalidatePendingFit(key);
	});
	[datasetFitResults, fittedCurves, customFitStates, fitExtents, fitFunctions].forEach((store) => {
		Object.keys(store).forEach((key) => {
			if (key.startsWith(prefix)) delete store[key];
		});
	});
}

/* ---------- Menus ---------- */

let menuOpener = null;

function closeMenu() {
	const menu = document.getElementById('neo-menu');
	if (!menu || menu.hidden) return;
	menu.hidden = true;
	menu.replaceChildren();
	menu.classList.remove('neo-style-pop');
	menu.setAttribute('role', 'menu');
	menu.removeAttribute('aria-label');
	stylePopover = null;
	if (menuOpener && menuOpener.hasAttribute('aria-expanded')) menuOpener.setAttribute('aria-expanded', 'false');
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
		if (item.separator) {
			const line = document.createElement('div');
			line.className = 'neo-menu-separator';
			line.setAttribute('role', 'separator');
			menu.appendChild(line);
			return;
		}
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
	showMenu(menu, opener);
	const first = menu.querySelector('button:not(:disabled)');
	if (first) first.focus();
}

// Shows the filled menu under its opener, or above it where there is no room below.
function showMenu(menu, opener) {
	menuOpener = opener;
	if (opener.hasAttribute('aria-expanded')) opener.setAttribute('aria-expanded', 'true');
	menu.hidden = false;
	const rect = opener.getBoundingClientRect();
	const width = menu.offsetWidth;
	const height = menu.offsetHeight;
	const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
	const below = rect.bottom + 4;
	const top = below + height > window.innerHeight - 8 ? Math.max(8, rect.top - height - 4) : below;
	menu.style.left = `${left}px`;
	menu.style.top = `${top}px`;
}

/* ---------- Colors and shapes ---------- */

// The popover that is open, so that a choice can redraw it in place: { sheet, column }.
let stylePopover = null;

const SYMBOL_PATHS = {
	circle: 'M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2Z',
	square: 'M2.75 2.75h10.5v10.5H2.75Z',
	diamond: 'M8 1.25 14.75 8 8 14.75 1.25 8Z',
	'triangle-up': 'M8 2 14.75 13.5H1.25Z',
	'triangle-down': 'M8 14 1.25 2.5h13.5Z',
	star: 'M8 1.2l2 4.5 4.9.5-3.7 3.3 1.1 4.8L8 11.8l-4.3 2.5 1.1-4.8L1.1 6.2l4.9-.5Z',
	cross: 'M6 1.5h4V6h4.5v4H10v4.5H6V10H1.5V6H6Z'
};

// A marker shape as a small icon, in the current text color.
function symbolIcon(symbol) {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.setAttribute('viewBox', '0 0 16 16');
	svg.setAttribute('aria-hidden', 'true');
	svg.classList.add('neo-symbol-icon');
	const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	path.setAttribute('d', SYMBOL_PATHS[symbol] || SYMBOL_PATHS.circle);
	svg.appendChild(path);
	return svg;
}

// A row of choices: each is { key, label, color (a swatch) or symbol (a shape) or text, pressed }.
function styleRow(title, choices, onChoose, options = {}) {
	const row = document.createElement('div');
	row.className = 'neo-style-row';
	row.setAttribute('role', 'group');
	row.setAttribute('aria-label', title);
	const heading = document.createElement('span');
	heading.className = 'neo-style-label';
	heading.textContent = title;
	const list = document.createElement('div');
	list.className = 'neo-style-choices';
	choices.forEach((choice) => {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'neo-style-choice';
		button.dataset.choice = `${options.id}:${choice.key}`;
		button.title = choice.label;
		button.setAttribute('aria-label', choice.label);
		button.setAttribute('aria-pressed', String(!!choice.pressed));
		button.disabled = !!options.disabled;
		if (choice.color) {
			button.classList.add('is-swatch');
			button.style.setProperty('--swatch', choice.color);
		} else if (choice.symbol) {
			button.appendChild(symbolIcon(choice.symbol));
		} else {
			button.classList.add('is-text');
			button.textContent = choice.text;
		}
		button.addEventListener('click', () => onChoose(choice.key));
		list.appendChild(button);
	});
	row.append(heading, list);
	if (options.note) {
		const note = document.createElement('span');
		note.className = 'neo-style-note';
		note.textContent = options.note;
		row.appendChild(note);
	}
	return row;
}

// After a color or shape changes: the graph, the color keys and the open popover follow, and
// the table keeps its cells (only its headings' colors change).
function applyStyleChange(change) {
	const focused = document.activeElement?.dataset?.choice || null;
	change();
	const sheet = getActiveSheet();
	document.querySelectorAll('#neo-table-head .neo-col-head[data-column-id]').forEach((th) => {
		const column = sheet.columns.find(entry => entry.id === th.dataset.columnId);
		if (!column) return;
		const color = PlotModel.isBarSheet(sheet) ? getBarColor(sheet, column.id) : column.role === 'Y' ? getSeriesColor(sheet, column.id) : null;
		if (color) th.style.setProperty('--series-color', color);
		else th.style.removeProperty('--series-color');
	});
	plotGraph();
	refreshWorkspaceChrome();
	const popup = document.getElementById('popup-container');
	if (popup && popup.style.display === 'block') plotAllSheets();
	scheduleSaveState();
	if (!stylePopover) return;
	// The Series card was redrawn, so a popover opened from it belongs to a new swatch button.
	if (menuOpener && !menuOpener.isConnected && menuOpener.dataset.seriesId) {
		menuOpener = document.querySelector(`.neo-series-style[data-series-id="${menuOpener.dataset.seriesId}"]`);
		if (menuOpener) menuOpener.setAttribute('aria-expanded', 'true');
	}
	fillStylePopover();
	const menu = document.getElementById('neo-menu');
	const again = focused ? [...menu.querySelectorAll('[data-choice]')].find(button => button.dataset.choice === focused && !button.disabled) : null;
	(again || menu.querySelector('button:not(:disabled)'))?.focus();
}

function fillStylePopover() {
	const menu = document.getElementById('neo-menu');
	const { sheet, column } = stylePopover;
	const bar = PlotModel.isBarSheet(sheet);
	const style = column.style;
	const colors = PlotModel.STYLE_COLORS;
	const label = PlotModel.getColumnLabel(sheet, column);
	menu.setAttribute('aria-label', bar ? `Color of bar ${label}` : `Color and shape of ${label}`);
	const rows = [];
	const reset = document.createElement('button');
	reset.type = 'button';
	reset.className = 'neo-style-reset';
	reset.dataset.choice = 'reset';
	if (bar) {
		const current = PlotModel.assignBarColors(sheet)[sheet.columns.indexOf(column)].color;
		rows.push(styleRow('Bar', colors.map(key => ({ key, label: SWATCH_LABELS[key], color: swatchColor(key), pressed: key === current })),
			key => applyStyleChange(() => { style.color = key; }), { id: 'color' }));
		const varied = document.createElement('button');
		varied.type = 'button';
		varied.className = 'neo-style-toggle';
		varied.dataset.choice = 'varied';
		varied.setAttribute('aria-pressed', String(!!sheet.variedBars));
		varied.textContent = 'Color every bar differently';
		varied.title = 'Give each bar of this sheet its own color';
		varied.addEventListener('click', () => applyStyleChange(() => { sheet.variedBars = !sheet.variedBars; }));
		rows.push(varied);
		reset.textContent = 'Reset this bar';
		reset.disabled = !style.color;
		reset.addEventListener('click', () => applyStyleChange(() => { style.color = ''; }));
	} else {
		const look = getSeriesLook(sheet, column.id);
		const series = PlotModel.getSeries(sheet).filter(entry => entry.xCol);
		const current = PlotModel.assignSeriesColors(series.map(entry => entry.yCol))[series.findIndex(entry => entry.id === column.id)]?.color;
		const fitted = !!fittedCurves[makeFitKey(sheet, column.id)];
		rows.push(styleRow('Points', colors.map(key => ({ key, label: SWATCH_LABELS[key], color: swatchColor(key), pressed: key === current })),
			key => applyStyleChange(() => { style.color = key; }), { id: 'color' }));
		rows.push(styleRow('Shape', PlotModel.STYLE_SYMBOLS.map(key => ({ key, label: SYMBOL_LABELS[key], symbol: key, pressed: key === look?.symbol })),
			key => applyStyleChange(() => { style.symbol = key; }), { id: 'symbol' }));
		rows.push(styleRow('Fit line', [{ key: '', label: 'Automatic: a color that contrasts with the points', text: 'Auto', pressed: !style.fitColor }]
			.concat(colors.map(key => ({ key, label: SWATCH_LABELS[key], color: swatchLineColor(key), pressed: key === style.fitColor }))),
			key => applyStyleChange(() => { style.fitColor = key; }),
			{ id: 'fit', disabled: !fitted, note: fitted ? '' : 'Fit this series to choose its line color.' }));
		reset.textContent = 'Reset';
		reset.disabled = !PlotModel.hasStyle(column);
		reset.addEventListener('click', () => applyStyleChange(() => { column.style = PlotModel.normalizeStyle(); }));
	}
	reset.title = 'Back to the automatic colors';
	const foot = document.createElement('div');
	foot.className = 'neo-style-foot';
	foot.appendChild(reset);
	menu.replaceChildren(...rows, foot);
}

// The color (and for a scatter series the shape and fit line color) of one Y column or bar.
function openStylePopover(opener, sheet, column) {
	const menu = document.getElementById('neo-menu');
	if (!menu) return;
	if (!menu.hidden && menuOpener === opener) {
		closeMenu();
		return;
	}
	closeMenu();
	column.style = PlotModel.normalizeStyle(column.style);
	stylePopover = { sheet, column };
	menu.classList.add('neo-style-pop');
	menu.setAttribute('role', 'dialog');
	fillStylePopover();
	showMenu(menu, opener);
	(menu.querySelector('[aria-pressed="true"]:not(:disabled)') || menu.querySelector('button:not(:disabled)'))?.focus();
}

function openColumnMenu(opener, sheet, column) {
	const index = sheet.columns.indexOf(column);
	const label = PlotModel.getColumnLabel(sheet, column);
	openMenu(opener, [
		{ label: 'Move left', disabled: index === 0, action: () => moveColumn(sheet, column, -1) },
		{ label: 'Move right', disabled: index === sheet.columns.length - 1, action: () => moveColumn(sheet, column, 1) },
		{ label: 'Insert column to the right', action: () => insertColumnAfter(sheet, column) },
		...(PlotModel.isBarSheet(sheet)
			? [{ label: 'Bar color…', action: () => openStylePopover(opener, sheet, column) }]
			: column.role === 'Y' && PlotModel.findSeries(sheet, column.id)?.xCol
				? [{ label: 'Color and shape…', action: () => openStylePopover(opener, sheet, column) }]
				: []),
		...(PlotModel.isPropagatedColumn(column)
			? [{ label: 'Edit its formula…', disabled: !getFormulaSource(column, sheet), action: () => openFormulaDialog(getFormulaSource(column, sheet)) }]
			: [{ label: PlotModel.isFormulaColumn(column) ? 'Edit formula…' : 'Set formula…', action: () => openFormulaDialog(column) }]),
		...(PlotModel.isComputedColumn(column) ? [{ label: 'Keep values, stop calculating', action: () => removeFormula(column) }] : []),
		{ label: 'Fill with one value…', disabled: PlotModel.isComputedColumn(column), action: () => fillColumn(sheet, column) },
		{ label: 'Clear column', disabled: PlotModel.isComputedColumn(column), action: () => clearColumn(sheet, column) },
		{ label: `Delete column ${label}`, danger: true, disabled: sheet.columns.length === 1, action: () => deleteColumn(sheet, column) }
	]);
}

function openRowMenu(opener, sheet, row) {
	openMenu(opener, [
		{ label: 'Insert row above', action: () => { PlotModel.insertRow(sheet, row); renderTable(); afterDataChange(); } },
		{ label: 'Insert row below', action: () => { PlotModel.insertRow(sheet, row + 1); renderTable(); afterDataChange(); } },
		{ label: `Delete row ${row + 1}`, danger: true, action: () => { PlotModel.removeRow(sheet, row); renderTable(); afterDataChange(); } }
	]);
}

function moveColumn(sheet, column, offset) {
	if (!changeColumns(sheet, () => PlotModel.moveColumn(sheet, column.id, offset))) return;
	renderTable();
	afterDataChange({ structure: true });
	const button = document.querySelector(`.neo-col-head[data-column-id="${column.id}"] .neo-col-menu-button`);
	if (button) button.focus();
}

/* ---------- Column widths ---------- */

function applyColumnWidth(th, column) {
	const width = column.width ? `${column.width}px` : '';
	th.style.width = width;
	th.style.minWidth = width;
	th.style.maxWidth = width;
	if (column.width) th.style.setProperty('--formula-max', `${column.width - 14}px`);
	else th.style.removeProperty('--formula-max');
}

// Dragging the right edge of a column's heading sets its width, as in a spreadsheet.
function startColumnResize(event, sheet, column, th) {
	if (!event.isPrimary || event.button !== 0) return;
	event.preventDefault();
	event.stopPropagation();
	const handle = event.currentTarget;
	const pointerId = event.pointerId;
	const startX = event.clientX;
	const startWidth = th.getBoundingClientRect().width;
	handle.setPointerCapture(pointerId);
	document.body.classList.add('neo-is-resizing');
	const move = (moveEvent) => {
		if (moveEvent.pointerId !== pointerId) return;
		const width = Math.min(Math.max(startWidth + moveEvent.clientX - startX, PlotModel.COLUMN_WIDTH_MIN), PlotModel.COLUMN_WIDTH_MAX);
		column.width = Math.round(width);
		applyColumnWidth(th, column);
	};
	const end = () => {
		handle.removeEventListener('pointermove', move);
		handle.removeEventListener('pointerup', end);
		handle.removeEventListener('pointercancel', end);
		document.body.classList.remove('neo-is-resizing');
		if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
		scheduleSaveState();
	};
	handle.addEventListener('pointermove', move);
	handle.addEventListener('pointerup', end);
	handle.addEventListener('pointercancel', end);
}

/* ---------- Dragging columns ---------- */

let columnDrag = null;

// Dragging a column's letter shows where it will land; letting go moves it there.
function startColumnDrag(event, sheet, column, th) {
	if (!event.isPrimary || event.button !== 0 || columnDrag) return;
	event.preventDefault();
	const grip = event.currentTarget;
	grip.setPointerCapture(event.pointerId);
	columnDrag = { sheet, column, th, grip, pointerId: event.pointerId, startX: event.clientX, active: false, target: null, scrollTimer: 0 };
	grip.addEventListener('pointermove', moveColumnDrag);
	grip.addEventListener('pointerup', endColumnDrag);
	grip.addEventListener('pointercancel', cancelColumnDrag);
	grip.addEventListener('lostpointercapture', cancelColumnDrag);
}

function getColumnHeads() {
	return [...document.querySelectorAll('#neo-table-head .neo-col-head')];
}

// The gap the pointer is nearest to: 0 is before the first column, n after the last.
function findDropGap(clientX) {
	const heads = getColumnHeads();
	for (let index = 0; index < heads.length; index++) {
		const rect = heads[index].getBoundingClientRect();
		if (clientX < rect.left + rect.width / 2) return index;
	}
	return heads.length;
}

function showDropIndicator(gap) {
	const wrap = document.getElementById('neo-table-wrap');
	let indicator = document.getElementById('neo-drop-indicator');
	if (!indicator) {
		indicator = document.createElement('div');
		indicator.id = 'neo-drop-indicator';
		indicator.className = 'neo-drop-indicator';
		indicator.setAttribute('aria-hidden', 'true');
		wrap.appendChild(indicator);
	}
	const heads = getColumnHeads();
	const wrapRect = wrap.getBoundingClientRect();
	const edge = gap < heads.length ? heads[gap].getBoundingClientRect().left : heads[heads.length - 1].getBoundingClientRect().right;
	indicator.style.left = `${edge - wrapRect.left + wrap.scrollLeft - 2}px`;
	indicator.style.top = `${wrap.scrollTop}px`;
	indicator.style.height = `${wrap.clientHeight}px`;
	indicator.hidden = false;
}

// Near either edge of the table, keep scrolling so far columns can be reached.
function autoScrollTable(clientX) {
	const wrap = document.getElementById('neo-table-wrap');
	const rect = wrap.getBoundingClientRect();
	const zone = 40;
	const speed = clientX < rect.left + zone ? -12 : clientX > rect.right - zone ? 12 : 0;
	clearInterval(columnDrag.scrollTimer);
	if (!speed) return;
	columnDrag.scrollTimer = setInterval(() => {
		wrap.scrollLeft += speed;
		if (columnDrag && columnDrag.active) {
			columnDrag.target = findDropGap(columnDrag.lastX);
			showDropIndicator(columnDrag.target);
		}
	}, 16);
}

function moveColumnDrag(event) {
	if (!columnDrag || event.pointerId !== columnDrag.pointerId) return;
	columnDrag.lastX = event.clientX;
	if (!columnDrag.active) {
		if (Math.abs(event.clientX - columnDrag.startX) < 6) return;
		columnDrag.active = true;
		columnDrag.th.classList.add('is-dragging');
		document.body.classList.add('neo-is-dragging-column');
	}
	columnDrag.target = findDropGap(event.clientX);
	showDropIndicator(columnDrag.target);
	autoScrollTable(event.clientX);
}

function finishColumnDrag() {
	if (!columnDrag) return null;
	const drag = columnDrag;
	columnDrag = null;
	clearInterval(drag.scrollTimer);
	['pointermove', 'pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => {
		drag.grip.removeEventListener(type, type === 'pointermove' ? moveColumnDrag : type === 'pointerup' ? endColumnDrag : cancelColumnDrag);
	});
	if (drag.grip.hasPointerCapture(drag.pointerId)) drag.grip.releasePointerCapture(drag.pointerId);
	drag.th.classList.remove('is-dragging');
	document.body.classList.remove('neo-is-dragging-column');
	const indicator = document.getElementById('neo-drop-indicator');
	if (indicator) indicator.remove();
	return drag;
}

function endColumnDrag(event) {
	if (!columnDrag || event.pointerId !== columnDrag.pointerId) return;
	const drag = finishColumnDrag();
	if (!drag.active || drag.target === null) return;
	const from = drag.sheet.columns.indexOf(drag.column);
	// Dropping into the gap after itself, or before itself, leaves the column where it is.
	const to = drag.target > from ? drag.target - 1 : drag.target;
	if (to === from) return;
	changeColumns(drag.sheet, () => PlotModel.moveColumnTo(drag.sheet, drag.column.id, to));
	renderTable();
	afterDataChange({ structure: true });
	const button = document.querySelector(`.neo-col-head[data-column-id="${drag.column.id}"] .neo-col-menu-button`);
	if (button) button.focus({ preventScroll: true });
}

function cancelColumnDrag() {
	finishColumnDrag();
}

function insertColumnAfter(sheet, column) {
	changeColumns(sheet, () => PlotModel.insertColumn(sheet, sheet.columns.indexOf(column) + 1, createNewColumn()));
	renderTable();
	afterDataChange({ structure: true });
}

// The usual way to give every reading the same uncertainty, e.g. ±0.05 s (dialogs.js).
function fillColumn(sheet, column) {
	openFillDialog(sheet, column);
}

function clearColumn(sheet, column) {
	if (column.cells.every(PlotModel.isBlank)) return;
	if (!window.confirm(`Clear every cell in ${PlotModel.getColumnLabel(sheet, column)}?`)) return;
	column.cells = column.cells.map(() => '');
	renderTable();
	afterDataChange();
}

function removeFormula(column) {
	column.formula = '';
	column.propagateFrom = '';
	column.formulaError = '';
	renderTable();
	afterDataChange();
}

function deleteColumn(sheet, column) {
	const hasData = column.cells.some(cell => !PlotModel.isBlank(cell));
	if (hasData && !window.confirm(`Delete column ${PlotModel.getColumnLabel(sheet, column)} and its data?`)) return;
	changeColumns(sheet, () => PlotModel.removeColumn(sheet, column.id));
	renderTable();
	afterDataChange({ structure: true });
}

/* ---------- Sheets ---------- */

function renderSheetTabs() {
	const bar = document.getElementById('sheet-tabs');
	if (!bar) return;
	const fragment = document.createDocumentFragment();
	plotState.sheets.forEach((sheet, index) => {
		const active = index === plotState.activeSheet;
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
			if (index === plotState.activeSheet) startSheetRename(index, tab, label);
			else switchSheet(index);
		});
		tab.appendChild(label);
		if (plotState.sheets.length > 1) {
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
	input.maxLength = PlotModel.SHEET_NAME_MAX_LENGTH;
	input.value = plotState.sheets[index].name || getSheetDisplayName(index);
	input.setAttribute('aria-label', 'Sheet name');
	let done = false;
	const finish = (save) => {
		if (done) return;
		done = true;
		if (save) plotState.sheets[index].name = input.value.trim().slice(0, PlotModel.SHEET_NAME_MAX_LENGTH);
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
	cellSelection = null;
	plotState.activeSheet = index;
	refreshActiveFitKey();
	setInitialParameters(getCurrentAdvancedFitMethod(), { onlyIfVisible: true });
	applyChartMode();
	renderSheetTabs();
	renderTable();
	renderFitSeriesSelect();
	loadCustomFitUiForActiveDataset();
	renderActiveFitResult();
	syncTitleInput(true);
	plotGraph();
	refreshWorkspaceChrome();
	scheduleSaveState();
}

function addSheet() {
	const sheet = PlotModel.createSheet(PlotModel.createIdSource(plotState), '');
	plotState.sheets.push(sheet);
	switchSheet(plotState.sheets.length - 1);
}

function removeSheet(index) {
	const sheet = plotState.sheets[index];
	if (!PlotModel.isSheetEmpty(sheet) && !window.confirm(`Remove "${getSheetDisplayName(index)}" and all its data?`)) return;
	plotState.sheets.splice(index, 1);
	pruneOrphanFits();
	const next = Math.min(plotState.activeSheet >= index && plotState.activeSheet > 0 ? plotState.activeSheet - 1 : plotState.activeSheet, plotState.sheets.length - 1);
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
	renderTitleDisplay();
}

// In LaTeX mode the header shows the title typeset; a tap swaps in the text field to edit it.
let renderedTitle = null;

function renderTitleDisplay() {
	const input = document.getElementById('graph-title');
	const display = document.getElementById('graph-title-display');
	if (!input || !display) return;
	const text = input.value.trim();
	const typeset = latexMode && text !== '' && document.activeElement !== input;
	input.hidden = typeset;
	display.hidden = !typeset;
	if (!typeset) {
		renderedTitle = null;
		return;
	}
	if (renderedTitle === text) return;
	renderedTitle = text;
	typesetLabel(display, `\\(${text}\\)`);
}

function editTitle() {
	const input = document.getElementById('graph-title');
	const display = document.getElementById('graph-title-display');
	display.hidden = true;
	input.hidden = false;
	input.focus();
	input.select();
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
	const y = PlotModel.getColumnLabel(sheet, series.yCol);
	return series.xCol ? `${y} against ${PlotModel.getColumnLabel(sheet, series.xCol)}` : `${y} (needs an X column)`;
}

// The same description as TeX, for labels that MathJax typesets in LaTeX mode.
function describeSeriesTex(sheet, series) {
	const name = column => formatLabelForLatex(PlotModel.getColumnLabel(sheet, column));
	return series.xCol
		? `${name(series.yCol)}\\text{ against }${name(series.xCol)}`
		: `${name(series.yCol)}\\text{ (needs an X column)}`;
}

// Writes a series description into an element, typeset when LaTeX mode is on.
function setSeriesText(element, sheet, series, prefix = '') {
	if (!latexMode) {
		setPlainLabel(element, `${prefix}${describeSeries(sheet, series)}`);
		return;
	}
	typesetLabel(element, `${prefix}\\(${describeSeriesTex(sheet, series)}\\)`, `${prefix}${describeSeries(sheet, series)}`);
}

function renderFitSeriesSelect() {
	const select = document.getElementById('fit-series-select');
	const sheet = getActiveSheet();
	if (!select || !sheet) return;
	// Only the series shown on the graph; one without data yet is listed but cannot be chosen.
	const series = getFittableSeries(sheet);
	select.replaceChildren(...series.map((entry) => {
		const option = document.createElement('option');
		option.value = entry.id;
		const empty = !PlotModel.getSeriesPoints(sheet, entry).length;
		option.textContent = empty ? `${describeSeries(sheet, entry)} (no data yet)` : describeSeries(sheet, entry);
		option.disabled = empty;
		return option;
	}));
	if (!series.length) {
		const option = document.createElement('option');
		option.textContent = PlotModel.getSeries(sheet).length ? 'Show a series to fit it' : 'No Y column yet';
		select.appendChild(option);
	}
	select.disabled = !series.length;
	if (sheet.fitSeries) select.value = sheet.fitSeries;
	const label = document.getElementById('fit-series-label');
	const target = resolveFitKey(activeFitKey);
	if (label) {
		if (target) setSeriesText(label, target.sheet, target.series, '· ');
		else setPlainLabel(label, '');
	}
	syncWeightingControl();
}

function handleFitSeriesChange(event) {
	const sheet = getActiveSheet();
	sheet.fitSeries = event.target.value;
	refreshActiveFitKey();
	setInitialParameters(getCurrentAdvancedFitMethod(), { onlyIfVisible: true });
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
	renderEquationDecimals(false);
	renderEquationSymbols(false);
	renderFitParameters();
	renderFitDiagnostics();
}

const FIT_QUALITY_HELP = {
	rSquared: {
		label: 'R squared',
		text: 'How much variation in y the fit explains. Closer to 1 is better, but a high value alone does not prove the model is right.'
	},
	rmse: {
		label: 'RMSE',
		text: 'Root mean square error: typical vertical distance from points to the curve, in y units. Smaller is better relative to your data scale; there is no universal cutoff.'
	},
	chiSquared: {
		label: 'reduced chi-squared',
		text: 'Scatter relative to measurement uncertainties. Around 1 is expected; much higher suggests a poor model or underestimated uncertainties, much lower suggests generous uncertainties. ν = points − fitted parameters; interpret cautiously for small ν.'
	}
};

function setFitQualityLine(line, latex, helpKey) {
	line.classList.add('neo-fit-quality-row');
	const value = document.createElement('span');
	value.className = 'neo-fit-quality-value';
	value.textContent = latex;
	const help = FIT_QUALITY_HELP[helpKey];
	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'neo-fit-help';
	button.textContent = '?';
	button.setAttribute('aria-label', `About ${help.label}`);
	button.setAttribute('aria-describedby', `fit-help-${helpKey}`);
	const tooltip = document.createElement('span');
	tooltip.id = `fit-help-${helpKey}`;
	tooltip.className = 'neo-fit-tooltip';
	tooltip.setAttribute('role', 'tooltip');
	tooltip.setAttribute('popover', 'auto');
	tooltip.textContent = help.text;
	let pinned = false;
	let pressedPinned = null;
	let hideTimer;
	const show = () => {
		clearTimeout(hideTimer);
		if (!tooltip.isConnected) return;
		tooltip.showPopover();
		const anchor = button.getBoundingClientRect();
		const rect = tooltip.getBoundingClientRect();
		const left = Math.max(12, Math.min(anchor.right - rect.width, window.innerWidth - rect.width - 12));
		const top = anchor.bottom + rect.height + 8 <= window.innerHeight - 12
			? anchor.bottom + 8 : Math.max(12, anchor.top - rect.height - 8);
		tooltip.style.left = `${left}px`;
		tooltip.style.top = `${top}px`;
	};
	const hide = () => {
		if (tooltip.isConnected && tooltip.matches(':popover-open')) tooltip.hidePopover();
		pinned = false;
	};
	const leave = () => {
		hideTimer = setTimeout(() => {
			if (!pinned && document.activeElement !== button) hide();
		}, 120);
	};
	button.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') show(); });
	button.addEventListener('pointerleave', leave);
	button.addEventListener('focus', show);
	button.addEventListener('blur', () => { if (!pinned) hide(); });
	// Auto popovers dismiss before click when their trigger is tapped again.
	button.addEventListener('pointerdown', () => { pressedPinned = pinned; });
	button.addEventListener('click', () => {
		pinned = !(pressedPinned ?? pinned);
		pressedPinned = null;
		if (pinned) show(); else hide();
	});
	tooltip.addEventListener('pointerenter', () => clearTimeout(hideTimer));
	tooltip.addEventListener('pointerleave', leave);
	tooltip.addEventListener('toggle', () => { if (!tooltip.matches(':popover-open')) pinned = false; });
	line.replaceChildren(value, button, tooltip);
}

function closeFitQualityHelp() {
	document.querySelectorAll('.neo-fit-tooltip:popover-open').forEach(tooltip => tooltip.hidePopover());
}

// Fitted parameters as "value ± uncertainty", and χ²/ν when every point has a ±ΔY.
function renderFitParameters() {
	const box = document.getElementById('fit-parameters');
	const note = document.getElementById('fit-weighting-note');
	const result = datasetFitResults[activeFitKey];
	const lines = [];
	if (result && Array.isArray(result.parameters)) {
		result.parameters.forEach(({ name, value, uncertainty }) => {
			lines.push(`\\( ${name} = ${PanPhyPlotStats.formatMeasurement(value, uncertainty, plotState.equationDecimals)} \\)`);
		});
	}
	const toLine = (text) => {
		const line = document.createElement('p');
		line.textContent = text;
		return line;
	};
	box.replaceChildren(...lines.map(toLine));
	box.hidden = !lines.length;
	if (lines.length) safeTypeset(box);

	// Fit quality describes the whole fit, so it sits apart from the parameters: R² (set by
	// renderFittingResult), then χ²/ν with its reading, then RMSE.
	const quality = document.getElementById('fit-quality');
	const details = document.getElementById('fit-quality-details');
	const chi = result ? PanPhyPlotStats.formatChiSquared(result.chi2, result.dof) : null;
	const nodes = [];
	if (chi) {
		const line = document.createElement('p');
		setFitQualityLine(line, `\\( \\chi^2/\\nu = ${chi} \\quad (\\nu = ${result.dof}) \\)`, 'chiSquared');
		nodes.push(line);
	}
	// A plain-language reading of χ²/ν; with few points it is only a rough guide.
	if (chi) {
		const ratio = result.chi2 / result.dof;
		const chip = document.createElement('span');
		chip.className = `neo-chi ${ratio > 2 ? 'is-high' : ratio < 0.5 ? 'is-low' : 'is-good'}`;
		// A weighted fit takes its ± from the entered uncertainties, so too-small ones give too-small ±.
		chip.textContent = ratio > 2 ? (result.weighted ? 'Scatter is larger than the uncertainties, so the ± values are probably too small' : 'Scatter is larger than the uncertainties')
			: ratio < 0.5 ? 'The uncertainties look generous'
				: 'Scatter matches the uncertainties';
		nodes.push(chip);
	}
	if (result && Number.isFinite(result.rmse)) {
		const line = document.createElement('p');
		setFitQualityLine(line, `\\( \\mathrm{RMSE} = ${PanPhyFitCore.formatFitNumber(result.rmse)} \\)`, 'rmse');
		nodes.push(line);
	}
	details.replaceChildren(...nodes);
	quality.hidden = !result;
	if (nodes.length) safeTypeset(details);
	if (note) {
		note.textContent = !result ? 'Fits use unweighted least squares unless Weight by uncertainties is on.'
			: result.weighted ? 'Weighted least squares: each point counts with weight 1/σ², where σ² = ΔY² + (slope × ΔX)². The ± values assume these are standard uncertainties.'
				: Array.isArray(result.parameters)
					? 'Unweighted least squares. The ± values come from the scatter of the points about the fit.'
					: 'Unweighted least squares. This fit\'s parameters are too closely linked to give ± values.';
	}
}

// The Extend line fields act on the chosen series' fit, so they wait until it has one.
function syncFitExtendControl(message = '') {
	const fromInput = document.getElementById('fit-extend-from');
	const toInput = document.getElementById('fit-extend-to');
	if (!fromInput || !toInput) return;
	const curve = fittedCurves[activeFitKey];
	const extent = fitExtents[activeFitKey] || {};
	const range = curve && Array.isArray(curve.dataRange) ? curve.dataRange : null;
	const shortNumber = value => String(Number(value.toPrecision(4)));
	fromInput.disabled = toInput.disabled = !curve;
	fromInput.value = Number.isFinite(extent.from) ? String(extent.from) : '';
	toInput.value = Number.isFinite(extent.to) ? String(extent.to) : '';
	fromInput.placeholder = range ? `${shortNumber(range[0])} (data)` : (curve ? 'start of data' : 'Fit first');
	toInput.placeholder = range ? `${shortNumber(range[1])} (data)` : (curve ? 'end of data' : 'Fit first');
	const note = document.getElementById('fit-extend-message');
	note.textContent = message;
	note.hidden = !message;
}

function handleFitExtendChange(event) {
	const curve = fittedCurves[activeFitKey];
	if (!curve) return syncFitExtendControl();
	const isFrom = event.target.id === 'fit-extend-from';
	const text = event.target.value.trim();
	const value = text === '' ? null : Number(text);
	const range = Array.isArray(curve.dataRange) ? curve.dataRange : null;
	if (value !== null && !Number.isFinite(value)) return syncFitExtendControl('Enter a number, or leave the box blank.');
	if (value !== null && range && (isFrom ? value > range[0] : value < range[1])) {
		const limit = String(Number(range[isFrom ? 0 : 1].toPrecision(4)));
		return syncFitExtendControl(isFrom ? `Back to x must be ${limit} or less.` : `Forward to x must be ${limit} or more.`);
	}
	const extent = { ...(fitExtents[activeFitKey] || {}), [isFrom ? 'from' : 'to']: value };
	if (extent.from == null && extent.to == null) delete fitExtents[activeFitKey];
	else fitExtents[activeFitKey] = extent;
	const redrawn = applyFitExtent(activeFitKey);
	syncFitExtendControl(redrawn ? '' : 'Fit again to draw the line over the new range.');
	plotGraph();
	scheduleSaveState();
}

function syncWeightingControl() {
	const box = document.getElementById('fit-weighted');
	if (!box) return;
	box.checked = getWeightingRequested();
	const points = getDatasetPoints(activeFitKey);
	const usable = points.length && points.every(point => point.yError > 0 || point.xError > 0);
	box.closest('label').title = usable ? 'Weights each point by 1/σ², using its ±ΔY and its ±ΔX through the slope'
		: 'Every plotted point needs a ±ΔY or ±ΔX above zero to weight the fit.';
}

function getActiveFitSymbols() {
	const series = resolveFitKey(activeFitKey)?.series;
	return {
		x: PlotModel.getFitSymbol(series?.xCol, 'x'),
		y: PlotModel.getFitSymbol(series?.yCol, 'y')
	};
}

function renderEquationSymbols(visible) {
	const details = document.getElementById('equation-symbols');
	details.hidden = !visible;
	const series = resolveFitKey(activeFitKey)?.series;
	const symbols = getActiveFitSymbols();
	['x', 'y'].forEach(axis => {
		const input = document.getElementById(`fit-symbol-${axis}`);
		input.value = series?.[`${axis}Col`]?.fitSymbol || '';
		input.placeholder = PlotModel.getFitSymbol({ name: series?.[`${axis}Col`]?.name }, axis);
		input.removeAttribute('aria-invalid');
		const preview = document.getElementById(`fit-symbol-${axis}-preview`);
		typesetLabel(preview, `\\(${symbols[axis]}\\)`);
	});
	document.getElementById('fit-symbol-error').textContent = '';
}

function handleFitSymbolInput() {
	const series = resolveFitKey(activeFitKey)?.series;
	if (!series?.xCol) return;
	const inputs = ['x', 'y'].map(axis => document.getElementById(`fit-symbol-${axis}`));
	const values = inputs.map(input => input.value.trim());
	let valid = true;
	inputs.forEach((input, index) => {
		const accepted = !values[index] || PlotModel.isFitSymbol(values[index]);
		input.setAttribute('aria-invalid', String(!accepted));
		valid = valid && accepted;
	});
	const effective = values.map((value, index) => value || inputs[index].placeholder);
	const same = valid && effective[0].replace(/[{}\s]/g, '') === effective[1].replace(/[{}\s]/g, '');
	document.getElementById('fit-symbol-error').textContent = !valid
		? 'Use a letter or Greek symbol, with optional subscripts or powers, e.g. R_1 or \\theta. The equation keeps its last valid symbols.'
		: same ? 'Choose different horizontal and vertical symbols. The equation keeps its last valid symbols.' : '';
	if (!valid || same) return;
	series.xCol.fitSymbol = values[0];
	series.yCol.fitSymbol = values[1];
	// Keep the input drafts and focus while redrawing the result and previews.
	const result = datasetFitResults[activeFitKey];
	if (result) renderFittingResult(result.equation, result.rSquared, false);
	inputs.forEach((input, index) => {
		const preview = document.getElementById(`${input.id}-preview`);
		typesetLabel(preview, `\\(${effective[index]}\\)`);
	});
	scheduleSaveState();
}

function renderFittingResult(equation, rSquaredDisplay, syncSymbols = true) {
	const equationElement = document.getElementById('fit-equation');
	const rSquaredElement = document.getElementById('r-squared-container');
	if (!equationElement || !rSquaredElement) return;
	if (typeof equation !== 'string' || !equation.trim()) {
		clearFittingResultDisplay();
		return;
	}
	// The fit keeps every digit; the display, and what is copied, uses the chosen decimal places.
	const symbols = getActiveFitSymbols();
	const shown = PlotModel.formatFitSymbols(PanPhyPlotStats.roundEquationDecimals(equation, plotState.equationDecimals), symbols.x, symbols.y);
	const copyTarget = document.createElement('button');
	copyTarget.type = 'button';
	copyTarget.className = 'fit-equation-copy-target neo-equation';
	copyTarget.title = 'Copy the equation as an image or LaTeX';
	copyTarget.dataset.fitLatex = shown;
	copyTarget.textContent = `\\(${shown}\\)`;
	equationElement.replaceChildren(copyTarget);
	equationElement.style.display = 'block';
	renderEquationDecimals(true);
	if (syncSymbols) renderEquationSymbols(true);
	setFitQualityLine(rSquaredElement, `\\( R^2 = ${rSquaredDisplay} \\)`, 'rSquared');
	rSquaredElement.style.display = 'flex';
	renderFitParameters();
	refreshWorkspaceChrome();
	if (resultScrollRequested) {
		resultScrollRequested = false;
		scrollResultIntoView();
	}
	renderFitDiagnostics();
	safeTypeset(equationElement);
	safeTypeset(rSquaredElement);
}

// A Fit Curve click asks for its result to be brought into view when it arrives; a fit can take a
// while in the worker. Any other click or key press first cancels the request, so the view is never
// pulled away from something the user has moved on to.
let resultScrollRequested = false;

function bindResultScroll() {
	document.addEventListener('click', (event) => {
		resultScrollRequested = !!event.target.closest?.('.fit-button');
	}, true);
	document.addEventListener('keydown', (event) => {
		if (event.key === 'Enter' || event.key === ' ') resultScrollRequested = !!event.target.closest?.('.fit-button');
		else resultScrollRequested = false;
	}, true);
}

function scrollResultIntoView() {
	const card = document.querySelector('.neo-card.result');
	if (!card) return;
	// In one column the page scrolls under the header bars that stay pinned (on a phone, only the app
	// bar), so the card stops below them.
	let covered = 0;
	if (window.innerWidth < 1000) {
		document.querySelectorAll('.neo-appbar, .neo-toolbar').forEach((bar) => {
			if (/sticky|fixed/.test(getComputedStyle(bar).position)) covered = Math.max(covered, bar.getBoundingClientRect().bottom);
		});
	}
	card.style.scrollMarginTop = `${Math.round(covered) + 12}px`;
	const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
	card.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
}

// The Excel-style pair under the equation: more or fewer decimal places, 0 to 8.
function renderEquationDecimals(visible) {
	const group = document.getElementById('equation-decimals');
	if (!group) return;
	group.hidden = !visible;
	const places = plotState.equationDecimals;
	document.getElementById('equation-decimals-count').textContent = `${places} dp`;
	document.getElementById('equation-decimals-more').disabled = places >= PlotModel.EQUATION_DECIMALS_MAX;
	document.getElementById('equation-decimals-fewer').disabled = places <= 0;
}

function changeEquationDecimals(step) {
	const next = Math.min(Math.max(plotState.equationDecimals + step, 0), PlotModel.EQUATION_DECIMALS_MAX);
	if (next === plotState.equationDecimals) return;
	plotState.equationDecimals = next;
	const result = datasetFitResults[activeFitKey];
	if (result) renderFittingResult(result.equation, result.rSquared);
	scheduleSaveState();
}

function renderFitDiagnostics() {
	const status = document.getElementById('fit-status');
	if (!status) return;
	const result = datasetFitResults[activeFitKey];
	status.textContent = !result ? 'No fit calculated yet.' : result.stale
		? 'Data changed. Click Fit Curve to update the fit.'
		: result.status || 'Fit calculated.';
	status.classList.toggle('fit-outdated', !!result?.stale);
}

function renderActiveFitResult() {
	const result = datasetFitResults[activeFitKey];
	if (result) renderFittingResult(result.equation, result.rSquared);
	else clearFittingResultDisplay();
	syncFitExtendControl();
	plotResiduals();
}

function clearFittedCurve() {
	if (!activeFitKey) return;
	invalidatePendingFit(activeFitKey);
	delete datasetFitResults[activeFitKey];
	delete fittedCurves[activeFitKey];
	delete fitExtents[activeFitKey];
	delete fitFunctions[activeFitKey];
	clearFittingResultDisplay();
	syncFitExtendControl();
	plotGraph();
	refreshWorkspaceChrome();
	scheduleSaveState();
}

function onSeriesVisibilityChange() {
	// Hiding the fitted series moves the fit to a visible one; its own fit is kept for when it returns.
	const previousKey = activeFitKey;
	refreshActiveFitKey();
	renderFitSeriesSelect();
	if (activeFitKey !== previousKey) {
		loadCustomFitUiForActiveDataset();
		renderActiveFitResult();
	}
	plotGraph();
	syncTitleInput();
	refreshWorkspaceChrome();
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
	if (PlotModel.getCombinedMode(plotState.sheets) === 'mixed') {
		showToast(COMBINED_MIXED_MESSAGE, 5000);
		return;
	}
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
	bindResultScroll();
	// Top-layer tooltips stay clear of scrolling pane edges; dismiss on layout changes.
	document.addEventListener('scroll', closeFitQualityHelp, true);
	window.addEventListener('resize', closeFitQualityHelp);
	const body = document.getElementById('neo-table-body');
	body.addEventListener('input', handleCellInput);
	body.addEventListener('keydown', handleCellKeydown);
	body.addEventListener('paste', handleCellPaste);
	body.addEventListener('pointerdown', handleCellPointerDown);
	body.addEventListener('copy', event => handleCellCopy(event, false));
	body.addEventListener('cut', event => handleCellCopy(event, true));
	body.addEventListener('focusin', (event) => {
		if (event.target.classList.contains('neo-cell')) event.target.select();
	});

	document.getElementById('add-row-button').addEventListener('click', addRow);
	document.querySelectorAll('#chart-type [data-chart-type]').forEach((button) => {
		button.addEventListener('click', () => setSheetChartType(button.dataset.chartType));
	});
	['bar-value-name', 'bar-value-unit', 'bar-category-title'].forEach((id) => {
		document.getElementById(id).addEventListener('input', handleBarSettingInput);
	});
	document.getElementById('bar-error-bars').addEventListener('change', (event) => {
		const sheet = getActiveSheet();
		sheet.errorBars = event.target.checked;
		renderBarSummary();
		plotGraph();
		scheduleSaveState();
	});
	document.querySelectorAll('#combined-group-row [data-group-by]').forEach((button) => {
		button.addEventListener('click', () => {
			plotState.combinedGroupBy = button.dataset.groupBy;
			plotAllSheets();
			scheduleSaveState();
		});
	});
	applyChartMode();
	document.getElementById('sample-data-button').addEventListener('click', loadSampleData);
	document.getElementById('residual-toggle').addEventListener('click', () => {
		plotState.showResiduals = !plotState.showResiduals;
		forceReplot();
		plotResiduals();
		scheduleSaveState();
	});
	document.getElementById('tab-conflict-reload').addEventListener('click', () => resolveTabConflict(false));
	document.getElementById('tab-conflict-keep').addEventListener('click', () => resolveTabConflict(true));
	['x', 'y'].forEach(axis => document.getElementById(`fit-symbol-${axis}`).addEventListener('input', handleFitSymbolInput));
	document.getElementById('equation-decimals-more').addEventListener('click', () => changeEquationDecimals(1));
	document.getElementById('equation-decimals-fewer').addEventListener('click', () => changeEquationDecimals(-1));
	document.getElementById('add-column-button').addEventListener('click', addColumn);
	document.getElementById('clear-sheet-button').addEventListener('click', clearSheet);
	document.getElementById('fit-series-select').addEventListener('change', handleFitSeriesChange);
	['fit-extend-from', 'fit-extend-to'].forEach((id) => {
		document.getElementById(id).addEventListener('change', handleFitExtendChange);
	});
	document.getElementById('fit-weighted').addEventListener('change', (event) => {
		plotState.weightFits = event.target.checked;
		scheduleSaveState();
	});
	document.getElementById('graph-title').addEventListener('input', handleTitleInput);
	document.getElementById('graph-title').addEventListener('blur', renderTitleDisplay);
	document.getElementById('graph-title').addEventListener('keydown', (event) => {
		if (event.key === 'Enter' || event.key === 'Escape') event.target.blur();
	});
	document.getElementById('graph-title-display').addEventListener('click', editTitle);
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
		if (menu && !menu.hidden && !menu.contains(event.target) && !(menuOpener && menuOpener.contains(event.target))) closeMenu();
	});
	document.addEventListener('keydown', (event) => {
		if (event.key !== 'Escape') return;
		const menu = document.getElementById('neo-menu');
		if (menu && !menu.hidden) {
			event.preventDefault();
			closeMenu();
		} else if (document.getElementById('popup-container').style.display === 'block' && !document.querySelector('dialog[open]')) {
			// Esc in a dialog opened from the combined window (Download) closes only that dialog.
			event.preventDefault();
			closePopup();
		}
	});
	document.getElementById('neo-menu').addEventListener('keydown', (event) => {
		// In the colors and shapes popover the choices lie in rows, so Left and Right move too.
		const sideways = event.currentTarget.classList.contains('neo-style-pop') && (event.key === 'ArrowLeft' || event.key === 'ArrowRight');
		if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && !sideways) return;
		event.preventDefault();
		const items = [...event.currentTarget.querySelectorAll('button:not(:disabled)')];
		const index = items.indexOf(document.activeElement);
		const next = items[(index + (event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length];
		if (next) next.focus();
	});
	window.addEventListener('resize', closeMenu);
	window.addEventListener('resize', scheduleTableRows);
	document.getElementById('neo-table-wrap').addEventListener('scroll', closeMenu);
	document.getElementById('neo-table-wrap').addEventListener('scroll', scheduleTableRows);
}
