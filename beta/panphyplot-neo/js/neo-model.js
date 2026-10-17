// PanPhyPlot (neo-beta) column model: sheets of columns with Origin-style roles.
// Pure functions only, so the same file runs in the browser and in node tests.
(function(root) {
	const ROLES = ['X', 'Y', 'xErr', 'yErr', 'none'];
	const ERROR_TYPES = ['absolute', 'percentage'];
	const DEFAULT_ROWS = 10;
	const NAME_MAX_LENGTH = 40;
	const SHEET_NAME_MAX_LENGTH = 20;
	const NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

	function parseNumber(value) {
		const text = String(value ?? '').trim();
		if (!NUMBER_PATTERN.test(text)) return NaN;
		const number = Number(text);
		return Number.isFinite(number) ? number : NaN;
	}

	function isBlank(value) {
		return String(value ?? '').trim() === '';
	}

	function columnLetter(index) {
		let letters = '';
		let n = index + 1;
		while (n > 0) {
			const remainder = (n - 1) % 26;
			letters = String.fromCharCode(65 + remainder) + letters;
			n = Math.floor((n - 1) / 26);
		}
		return letters;
	}

	function createColumn(id, options = {}, rowCount = DEFAULT_ROWS) {
		const cells = Array.isArray(options.cells) ? options.cells.map(cell => String(cell ?? '')) : [];
		while (cells.length < rowCount) cells.push('');
		return {
			id,
			name: typeof options.name === 'string' ? options.name.slice(0, NAME_MAX_LENGTH) : '',
			unit: typeof options.unit === 'string' ? options.unit.slice(0, NAME_MAX_LENGTH) : '',
			role: ROLES.includes(options.role) ? options.role : 'Y',
			errorType: ERROR_TYPES.includes(options.errorType) ? options.errorType : 'absolute',
			cells
		};
	}

	function createSheet(ids, name) {
		const rowCount = DEFAULT_ROWS;
		return {
			id: ids.next('s'),
			name: typeof name === 'string' ? name.slice(0, SHEET_NAME_MAX_LENGTH) : '',
			rowCount,
			columns: [
				createColumn(ids.next('c'), { name: 'x', role: 'X' }, rowCount),
				createColumn(ids.next('c'), { name: 'y', role: 'Y' }, rowCount)
			],
			title: { text: '', automatic: true },
			fitSeries: null,
			hiddenSeries: []
		};
	}

	// Ids are generated from a counter kept in the saved state so they never repeat.
	function createIdSource(state) {
		return {
			next(prefix) {
				state.nextId = (Number.isInteger(state.nextId) ? state.nextId : 1) + 1;
				return `${prefix}${state.nextId}`;
			}
		};
	}

	function createState() {
		const state = { version: 1, nextId: 0, activeSheet: 0, latexMode: false, sheets: [], fits: {}, curves: {}, customFits: {} };
		state.sheets.push(createSheet(createIdSource(state), ''));
		return state;
	}

	function getColumnLabel(sheet, column) {
		const name = String(column.name || '').trim();
		return name || columnLetter(sheet.columns.indexOf(column));
	}

	// Origin's pairing rule: a Y column plots against the nearest X column to its left;
	// a yErr column belongs to the nearest Y to its left, an xErr column to the nearest X.
	function getSeries(sheet) {
		const series = [];
		let currentX = null;
		let currentXErr = null;
		let currentY = null;
		const yErrFor = new Map();
		sheet.columns.forEach((column) => {
			if (column.role === 'X') {
				currentX = column;
				currentXErr = null;
				currentY = null;
			} else if (column.role === 'xErr') {
				if (currentX && !currentXErr) {
					currentXErr = column;
					series.filter(entry => entry.xCol === currentX).forEach(entry => { entry.xErrCol = column; });
				}
			} else if (column.role === 'Y') {
				currentY = column;
				series.push({ id: column.id, yCol: column, xCol: currentX, xErrCol: currentX ? currentXErr : null, yErrCol: null });
			} else if (column.role === 'yErr') {
				if (currentY && !yErrFor.has(currentY.id)) {
					yErrFor.set(currentY.id, column);
					series.find(entry => entry.yCol === currentY).yErrCol = column;
				}
			}
		});
		return series;
	}

	function findSeries(sheet, seriesId) {
		return getSeries(sheet).find(entry => entry.id === seriesId) || null;
	}

	function toAbsoluteError(raw, value, errorType) {
		const error = parseNumber(raw);
		if (!Number.isFinite(error) || error < 0) return 0;
		if (errorType === 'percentage') return error > 0 ? Math.abs(value) * error / 100 : 0;
		return error;
	}

	// Rows where both x and y are numbers; blank or invalid rows are skipped.
	function getSeriesPoints(sheet, series) {
		if (!series || !series.xCol) return [];
		const points = [];
		for (let row = 0; row < sheet.rowCount; row++) {
			const x = parseNumber(series.xCol.cells[row]);
			const y = parseNumber(series.yCol.cells[row]);
			if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
			points.push({
				row,
				x,
				y,
				xError: series.xErrCol ? toAbsoluteError(series.xErrCol.cells[row], x, series.xErrCol.errorType) : 0,
				yError: series.yErrCol ? toAbsoluteError(series.yErrCol.cells[row], y, series.yErrCol.errorType) : 0
			});
		}
		return points;
	}

	function isCellInvalid(column, value) {
		if (isBlank(value)) return false;
		const number = parseNumber(value);
		if (!Number.isFinite(number)) return true;
		if (column.role === 'xErr' || column.role === 'yErr') {
			return column.errorType === 'percentage' ? number <= 0 : number < 0;
		}
		return false;
	}

	// LaTeX \mathrm drops spaces, so "m s^{-1}" would read as per millisecond; keep them as thin spaces.
	function formatUnitForLatex(unit) {
		return String(unit).trim().replace(/\s+/g, '\\,');
	}

	function formatAxisLabel(name, unit, latex = false) {
		const cleanName = String(name || '').trim();
		const cleanUnit = String(unit || '').trim();
		if (!latex) return cleanUnit ? `${cleanName} / ${cleanUnit}` : cleanName;
		return cleanUnit ? `${cleanName}\\ /\\ \\mathrm{${formatUnitForLatex(cleanUnit)}}` : cleanName;
	}

	function isSheetEmpty(sheet) {
		return sheet.columns.every(column => column.cells.every(isBlank));
	}

	function setRowCount(sheet, rowCount) {
		sheet.rowCount = Math.max(1, rowCount);
		sheet.columns.forEach((column) => {
			while (column.cells.length < sheet.rowCount) column.cells.push('');
			column.cells.length = sheet.rowCount;
		});
	}

	function insertRow(sheet, index) {
		const at = Math.min(Math.max(index, 0), sheet.rowCount);
		sheet.columns.forEach(column => column.cells.splice(at, 0, ''));
		sheet.rowCount += 1;
	}

	function removeRow(sheet, index) {
		if (index < 0 || index >= sheet.rowCount) return;
		if (sheet.rowCount === 1) {
			sheet.columns.forEach((column) => { column.cells[0] = ''; });
			return;
		}
		sheet.columns.forEach(column => column.cells.splice(index, 1));
		sheet.rowCount -= 1;
	}

	function insertColumn(sheet, index, column) {
		const at = Math.min(Math.max(index, 0), sheet.columns.length);
		setRowCount({ rowCount: sheet.rowCount, columns: [column] }, sheet.rowCount);
		sheet.columns.splice(at, 0, column);
		return column;
	}

	function removeColumn(sheet, columnId) {
		const index = sheet.columns.findIndex(column => column.id === columnId);
		if (index < 0) return null;
		return sheet.columns.splice(index, 1)[0];
	}

	function moveColumn(sheet, columnId, offset) {
		const index = sheet.columns.findIndex(column => column.id === columnId);
		const target = index + offset;
		if (index < 0 || target < 0 || target >= sheet.columns.length) return false;
		const [column] = sheet.columns.splice(index, 1);
		sheet.columns.splice(target, 0, column);
		return true;
	}

	// Spreadsheets copy tab-separated rows; plain comma-separated text is accepted too.
	function parsePastedText(text) {
		const lines = String(text ?? '').replace(/\r\n?/g, '\n').replace(/\n+$/, '').split('\n');
		const delimiter = lines.some(line => line.includes('\t')) ? '\t' : (lines.some(line => line.includes(',')) ? ',' : null);
		return lines.map(line => (delimiter ? line.split(delimiter) : [line]).map(cell => cell.trim()));
	}

	function looksLikeHeaderRow(cells) {
		return cells.some(cell => !isBlank(cell) && !Number.isFinite(parseNumber(cell)));
	}

	// "Length / m" or "Length (m)" splits into a name and a unit.
	function splitHeader(text) {
		const header = String(text || '').trim();
		const slash = header.match(/^(.*\S)\s+\/\s+(.+)$/);
		if (slash) return { name: slash[1], unit: slash[2] };
		const bracket = header.match(/^(.*\S)\s*[([]([^()[\]]+)[)\]]$/);
		if (bracket) return { name: bracket[1], unit: bracket[2] };
		return { name: header, unit: '' };
	}

	// Pastes a block at a cell, adding rows and columns as needed. A text first row pasted
	// into the top row becomes the column names. Returns how many cells were filled.
	function applyPaste(sheet, startRow, startColumn, grid, makeColumn) {
		let rows = grid.filter(row => row.length);
		if (!rows.length) return { cells: 0, headers: false };
		let headers = null;
		if (startRow === 0 && rows.length > 1 && looksLikeHeaderRow(rows[0])) {
			headers = rows[0];
			rows = rows.slice(1);
		}
		const width = Math.max(...rows.map(row => row.length), headers ? headers.length : 0);
		while (sheet.columns.length < startColumn + width) {
			insertColumn(sheet, sheet.columns.length, makeColumn());
		}
		if (sheet.rowCount < startRow + rows.length) setRowCount(sheet, startRow + rows.length);
		let filled = 0;
		rows.forEach((row, r) => {
			row.forEach((value, c) => {
				sheet.columns[startColumn + c].cells[startRow + r] = value;
				filled += 1;
			});
		});
		if (headers) {
			headers.forEach((header, c) => {
				if (isBlank(header)) return;
				const { name, unit } = splitHeader(header);
				const column = sheet.columns[startColumn + c];
				column.name = name.slice(0, NAME_MAX_LENGTH);
				column.unit = unit.slice(0, NAME_MAX_LENGTH);
			});
		}
		return { cells: filled, headers: !!headers };
	}

	function normalizeColumn(saved, fallbackId) {
		const column = createColumn(typeof saved?.id === 'string' ? saved.id : fallbackId, saved || {}, 0);
		return column;
	}

	// Repairs anything malformed in saved state so a bad save never stops the app loading.
	function normalizeState(saved) {
		if (!saved || typeof saved !== 'object' || !Array.isArray(saved.sheets) || !saved.sheets.length) return createState();
		const state = {
			version: 1,
			nextId: Number.isInteger(saved.nextId) ? saved.nextId : 0,
			activeSheet: 0,
			latexMode: saved.latexMode === true,
			sheets: [],
			fits: saved.fits && typeof saved.fits === 'object' ? saved.fits : {},
			curves: saved.curves && typeof saved.curves === 'object' ? saved.curves : {},
			customFits: saved.customFits && typeof saved.customFits === 'object' ? saved.customFits : {}
		};
		const ids = createIdSource(state);
		const seen = new Set();
		saved.sheets.forEach((savedSheet) => {
			if (!savedSheet || typeof savedSheet !== 'object') return;
			const columns = (Array.isArray(savedSheet.columns) ? savedSheet.columns : [])
				.map(column => normalizeColumn(column, ids.next('c')))
				.map((column) => {
					if (seen.has(column.id)) column.id = ids.next('c');
					seen.add(column.id);
					return column;
				});
			let sheetId = typeof savedSheet.id === 'string' ? savedSheet.id : ids.next('s');
			if (seen.has(sheetId)) sheetId = ids.next('s');
			seen.add(sheetId);
			const sheet = {
				id: sheetId,
				name: typeof savedSheet.name === 'string' ? savedSheet.name.slice(0, SHEET_NAME_MAX_LENGTH) : '',
				rowCount: Math.max(1, ...columns.map(column => column.cells.length), Number.isInteger(savedSheet.rowCount) ? savedSheet.rowCount : DEFAULT_ROWS),
				columns: columns.length ? columns : [createColumn(ids.next('c'), { name: 'x', role: 'X' }), createColumn(ids.next('c'), { name: 'y', role: 'Y' })],
				title: {
					text: typeof savedSheet.title?.text === 'string' ? savedSheet.title.text : '',
					automatic: savedSheet.title?.automatic !== false
				},
				fitSeries: typeof savedSheet.fitSeries === 'string' ? savedSheet.fitSeries : null,
				hiddenSeries: Array.isArray(savedSheet.hiddenSeries) ? savedSheet.hiddenSeries.filter(id => typeof id === 'string') : []
			};
			setRowCount(sheet, sheet.rowCount);
			state.sheets.push(sheet);
		});
		if (!state.sheets.length) return createState();
		const active = Number(saved.activeSheet);
		state.activeSheet = Number.isInteger(active) ? Math.min(Math.max(active, 0), state.sheets.length - 1) : 0;
		const numericIds = [...seen].map(id => Number(id.slice(1))).filter(Number.isInteger);
		state.nextId = Math.max(state.nextId, ...numericIds, 0);
		return state;
	}

	const api = {
		ROLES,
		DEFAULT_ROWS,
		NAME_MAX_LENGTH,
		SHEET_NAME_MAX_LENGTH,
		parseNumber,
		isBlank,
		columnLetter,
		createColumn,
		createSheet,
		createIdSource,
		createState,
		getColumnLabel,
		getSeries,
		findSeries,
		getSeriesPoints,
		isCellInvalid,
		formatAxisLabel,
		isSheetEmpty,
		setRowCount,
		insertRow,
		removeRow,
		insertColumn,
		removeColumn,
		moveColumn,
		parsePastedText,
		splitHeader,
		applyPaste,
		normalizeState
	};

	if (typeof module === 'object' && module.exports) module.exports = api;
	else root.PanPhyNeoModel = api;
})(typeof globalThis === 'object' ? globalThis : this);
