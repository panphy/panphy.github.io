// PanPhyPlot (neo-beta) column model: sheets of columns with Origin-style roles.
// Pure functions only, so the same file runs in the browser and in node tests.
(function(root) {
	const ROLES = ['X', 'Y', 'xErr', 'yErr', 'none'];
	const ERROR_TYPES = ['absolute', 'percentage'];
	const DEFAULT_ROWS = 10;
	// Decimal places of the displayed fitted equation.
	const EQUATION_DECIMALS_DEFAULT = 2;
	const EQUATION_DECIMALS_MAX = 8;
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
			formula: typeof options.formula === 'string' ? options.formula : '',
			propagateFrom: typeof options.propagateFrom === 'string' ? options.propagateFrom : '',
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
		const state = { version: 1, nextId: 0, activeSheet: 0, latexMode: false, equationDecimals: EQUATION_DECIMALS_DEFAULT, sheets: [], fits: {}, curves: {}, customFits: {} };
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
			customFits: saved.customFits && typeof saved.customFits === 'object' ? saved.customFits : {},
			weightFits: saved.weightFits === true,
			equationDecimals: Number.isInteger(saved.equationDecimals)
				? Math.min(Math.max(saved.equationDecimals, 0), EQUATION_DECIMALS_MAX)
				: EQUATION_DECIMALS_DEFAULT
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

	/* ---------- Formula columns ---------- */

	// Column letters always mean their column, so a sixth column makes E a column, not Euler's number.
	const FORMULA_CONSTANTS = new Set(['pi', 'e', 'tau', 'PI', 'E']);
	const FORMULA_FUNCTIONS = new Set([
		'abs', 'sqrt', 'cbrt', 'exp', 'log', 'log10', 'log2', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
		'sinh', 'cosh', 'tanh', 'pow', 'square', 'cube', 'nthRoot', 'hypot', 'round', 'floor', 'ceil', 'sign',
		'min', 'max', 'mean', 'median', 'sum', 'std'
	]);
	const FORMULA_FORBIDDEN_NODES = new Set(['AssignmentNode', 'FunctionAssignmentNode', 'BlockNode', 'AccessorNode', 'IndexNode', 'ObjectNode']);
	const DELETED_COLUMN_SYMBOL = 'deletedColumn';
	const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

	function letterIndex(letters) {
		if (!/^[A-Z]+$/.test(letters)) return -1;
		let index = 0;
		for (const ch of letters) index = index * 26 + (ch.charCodeAt(0) - 64);
		return index - 1;
	}

	function isFormulaColumn(column) {
		return typeof column.formula === 'string' && column.formula.trim() !== '';
	}

	function cleanFormulaText(text) {
		return String(text ?? '').trim().replace(/^=\s*/, '');
	}

	// Symbol -> column id: every column's letter, plus each name that is a valid, unambiguous identifier.
	function getFormulaSymbols(sheet) {
		const symbols = new Map();
		sheet.columns.forEach((column, index) => symbols.set(columnLetter(index), column.id));
		const counts = new Map();
		sheet.columns.forEach((column) => {
			const name = String(column.name || '').trim();
			counts.set(name, (counts.get(name) || 0) + 1);
		});
		sheet.columns.forEach((column) => {
			const name = String(column.name || '').trim();
			if (!IDENTIFIER_PATTERN.test(name) || counts.get(name) > 1 || symbols.has(name)) return;
			if (FORMULA_CONSTANTS.has(name) || FORMULA_FUNCTIONS.has(name) || name === DELETED_COLUMN_SYMBOL) return;
			symbols.set(name, column.id);
		});
		return symbols;
	}

	// Parses a formula and lists the columns it reads, or explains in plain words why it cannot run.
	function analyzeFormula(sheet, text, math) {
		const formula = cleanFormulaText(text);
		if (!formula) return { ok: false, error: 'Enter a formula, such as T^2 or 1/L.' };
		let node;
		try {
			node = math.parse(formula);
		} catch (error) {
			return { ok: false, error: `Check the formula: ${error.message}` };
		}
		const symbols = getFormulaSymbols(sheet);
		const refs = new Map();
		let problem = null;
		node.traverse((child, path, parent) => {
			if (problem) return;
			if (FORMULA_FORBIDDEN_NODES.has(child.type)) {
				problem = 'Formulas cannot assign values or define functions.';
			} else if (child.isFunctionNode) {
				const name = child.fn && child.fn.name;
				if (!FORMULA_FUNCTIONS.has(name)) problem = `${name || 'That'} is not an available function.`;
			} else if (child.isSymbolNode && path !== 'fn') {
				if (child.name === DELETED_COLUMN_SYMBOL) problem = 'This formula used a column that has been deleted.';
				else if (symbols.has(child.name)) refs.set(child.name, symbols.get(child.name));
				else if (!FORMULA_CONSTANTS.has(child.name)) problem = `${child.name} is not a column letter or column name in this sheet.`;
			}
		});
		if (problem) return { ok: false, error: problem };
		return { ok: true, formula, node, refs, compiled: node.compile() };
	}

	// Computed values keep ten significant figures, which hides floating-point noise such as 2.4025000000000003.
	function formatComputed(value) {
		return String(Number(value.toPrecision(10)));
	}

	function readFormulaScope(sheet, analysis, row) {
		const scope = {};
		for (const [symbol, id] of analysis.refs) {
			const column = sheet.columns.find(entry => entry.id === id);
			const value = parseNumber(column ? column.cells[row] : '');
			if (!Number.isFinite(value)) return null;
			scope[symbol] = value;
		}
		return scope;
	}

	function evaluateScope(analysis, scope) {
		try {
			const result = analysis.compiled.evaluate(scope);
			return typeof result === 'number' && Number.isFinite(result) ? result : NaN;
		} catch (error) {
			return NaN;
		}
	}

	function evaluateFormulaRow(sheet, analysis, row) {
		const scope = readFormulaScope(sheet, analysis, row);
		const result = scope ? evaluateScope(analysis, scope) : NaN;
		return Number.isFinite(result) ? formatComputed(result) : '';
	}

	function isPropagatedColumn(column) {
		return typeof column.propagateFrom === 'string' && column.propagateFrom !== '';
	}

	function isComputedColumn(column) {
		return isFormulaColumn(column) || isPropagatedColumn(column);
	}

	// Each column's own uncertainty column, by the same pairing rule as the graph.
	function getUncertaintyColumns(sheet) {
		const map = new Map();
		getSeries(sheet).forEach((series) => {
			if (series.yErrCol) map.set(series.yCol.id, series.yErrCol);
			if (series.xCol && series.xErrCol) map.set(series.xCol.id, series.xErrCol);
		});
		let currentX = null;
		sheet.columns.forEach((column) => {
			if (column.role === 'X') currentX = column;
			else if (column.role === 'xErr' && currentX && !map.has(currentX.id)) map.set(currentX.id, column);
		});
		return map;
	}

	// First-order propagation: Δf = √Σ(∂f/∂xᵢ · Δxᵢ)², with each derivative taken numerically for this row.
	function propagateRow(sheet, analysis, uncertainties, row) {
		const scope = readFormulaScope(sheet, analysis, row);
		if (!scope || !Number.isFinite(evaluateScope(analysis, scope))) return '';
		let sum = 0;
		let used = false;
		for (const [symbol, id] of analysis.refs) {
			const errorColumn = uncertainties.get(id);
			if (!errorColumn) continue;
			const value = scope[symbol];
			const error = toAbsoluteError(errorColumn.cells[row], value, errorColumn.errorType);
			if (!(error > 0)) continue;
			const step = Math.abs(value) * 1e-6 || 1e-6;
			const plus = evaluateScope(analysis, { ...scope, [symbol]: value + step });
			const minus = evaluateScope(analysis, { ...scope, [symbol]: value - step });
			if (!Number.isFinite(plus) || !Number.isFinite(minus)) return '';
			sum += (((plus - minus) / (2 * step)) * error) ** 2;
			used = true;
		}
		// Six significant figures: more would only show the numerical derivative's rounding noise.
		return used ? String(Number(Math.sqrt(sum).toPrecision(6))) : '';
	}

	// Recalculates every formula and propagated-uncertainty column in dependency order.
	// A row with a blank or invalid input stays blank.
	function recomputeFormulas(sheet, math) {
		const computed = sheet.columns.filter(isComputedColumn);
		if (!computed.length || !math) return false;
		const uncertainties = getUncertaintyColumns(sheet);
		const nodes = new Map();
		computed.forEach((column) => {
			if (isFormulaColumn(column)) {
				const analysis = analyzeFormula(sheet, column.formula, math);
				nodes.set(column.id, { analysis, error: analysis.ok ? '' : analysis.error, deps: analysis.ok ? [...analysis.refs.values()] : [] });
				return;
			}
			const source = sheet.columns.find(entry => entry.id === column.propagateFrom);
			if (!source || !isFormulaColumn(source)) {
				nodes.set(column.id, { error: 'The formula column this uncertainty comes from has been deleted or no longer has a formula.', deps: [] });
				return;
			}
			const analysis = analyzeFormula(sheet, source.formula, math);
			const refs = analysis.ok ? [...analysis.refs.values()] : [];
			nodes.set(column.id, {
				analysis,
				propagated: true,
				error: '',
				deps: [source.id, ...refs, ...refs.map(id => uncertainties.get(id)).filter(Boolean).map(entry => entry.id)]
			});
		});
		const order = [];
		const state = new Map();
		const visit = (id, trail) => {
			if (state.get(id) === 'done') return;
			const node = nodes.get(id);
			if (state.get(id) === 'visiting') {
				trail.slice(trail.indexOf(id)).forEach((entry) => {
					const member = nodes.get(entry);
					if (member && !member.error) member.error = trail.length === 2 && trail[0] === id
						? 'A formula cannot use its own column.'
						: 'This formula depends on itself through other columns.';
				});
				return;
			}
			state.set(id, 'visiting');
			node.deps.forEach((dep) => { if (nodes.has(dep)) visit(dep, [...trail, dep]); });
			state.set(id, 'done');
			order.push(id);
		};
		computed.forEach(column => visit(column.id, [column.id]));
		let changed = false;
		order.forEach((id) => {
			const column = sheet.columns.find(entry => entry.id === id);
			const node = nodes.get(id);
			let error = node.error;
			if (!error && node.deps.some(dep => nodes.has(dep) && nodes.get(dep).error)) {
				error = node.propagated ? 'The formula this uncertainty comes from has a problem.' : 'A column this formula uses has a problem.';
			}
			if (column.formulaError !== error) changed = true;
			column.formulaError = error;
			for (let row = 0; row < sheet.rowCount; row++) {
				let value = '';
				if (!error) value = node.propagated ? propagateRow(sheet, node.analysis, uncertainties, row) : evaluateFormulaRow(sheet, node.analysis, row);
				if (column.cells[row] !== value) {
					column.cells[row] = value;
					changed = true;
				}
			}
		});
		return changed;
	}

	// The symbolic working for the formula dialog: each ∂f/∂x that has an uncertainty, as TeX.
	function describePropagation(sheet, column, math) {
		const analysis = analyzeFormula(sheet, column.formula, math);
		if (!analysis.ok) return null;
		const uncertainties = getUncertaintyColumns(sheet);
		const terms = [];
		for (const [symbol, id] of analysis.refs) {
			const errorColumn = uncertainties.get(id);
			if (!errorColumn) continue;
			let derivative = null;
			try {
				derivative = math.derivative(analysis.node, symbol).toTex();
			} catch (error) {
				derivative = null;
			}
			terms.push({ symbol, derivative, percentage: errorColumn.errorType === 'percentage' });
		}
		return { terms, missing: [...analysis.refs.keys()].filter(symbol => !uncertainties.has(analysis.refs.get(symbol))) };
	}

	// Column letters in formulas follow their columns when columns move, appear or are deleted.
	function remapFormulaLetters(sheet, previousIds, math) {
		sheet.columns.filter(isFormulaColumn).forEach((column) => {
			let node;
			try {
				node = math.parse(cleanFormulaText(column.formula));
			} catch (error) {
				return;
			}
			let rewritten = false;
			const result = node.transform((child, path) => {
				if (!child.isSymbolNode || path === 'fn') return child;
				const oldIndex = letterIndex(child.name);
				if (oldIndex < 0 || oldIndex >= previousIds.length) return child;
				const newIndex = sheet.columns.findIndex(entry => entry.id === previousIds[oldIndex]);
				const name = newIndex < 0 ? DELETED_COLUMN_SYMBOL : columnLetter(newIndex);
				if (name === child.name) return child;
				rewritten = true;
				return new math.SymbolNode(name);
			});
			if (rewritten) column.formula = result.toString();
		});
	}

	/* ---------- Mean of repeats ---------- */

	// T1, T2, T3 share the name T; anything less tidy is called "mean".
	function getRepeatBaseName(names) {
		const bases = names.map(name => String(name || '').trim().replace(/[\s_-]*\d+$/, '').trim());
		return bases.length && bases[0] && bases.every(base => base === bases[0]) ? bases[0] : 'mean';
	}

	function buildRepeatFormulas(sheet, columns) {
		const refs = columns.map(column => columnLetter(sheet.columns.indexOf(column))).join(', ');
		return {
			mean: `mean(${refs})`,
			halfSpread: `(max(${refs}) - min(${refs})) / 2`
		};
	}

	/* ---------- CSV ---------- */

	function detectDelimiter(line) {
		const counts = { ',': 0, ';': 0, '\t': 0 };
		let quoted = false;
		for (const ch of line) {
			if (ch === '"') quoted = !quoted;
			else if (!quoted && ch in counts) counts[ch]++;
		}
		const best = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
		return counts[best] ? best : ',';
	}

	function parseCsv(text) {
		const source = String(text ?? '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
		const firstLine = source.split('\n').find(line => line.trim() !== '') || '';
		const delimiter = detectDelimiter(firstLine);
		const rows = [];
		let row = [];
		let cell = '';
		let quoted = false;
		for (let i = 0; i < source.length; i++) {
			const ch = source[i];
			if (quoted) {
				if (ch === '"' && source[i + 1] === '"') { cell += '"'; i++; }
				else if (ch === '"') quoted = false;
				else cell += ch;
			} else if (ch === '"') {
				quoted = true;
			} else if (ch === delimiter) {
				row.push(cell.trim());
				cell = '';
			} else if (ch === '\n') {
				row.push(cell.trim());
				rows.push(row);
				row = [];
				cell = '';
			} else {
				cell += ch;
			}
		}
		if (cell !== '' || row.length) {
			row.push(cell.trim());
			rows.push(row);
		}
		return rows.filter(entry => entry.some(value => value !== ''));
	}

	function escapeCsvCell(value) {
		const text = String(value ?? '');
		return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
	}

	// Headings read "name / unit", which import splits back into a name and a unit.
	function buildCsv(sheet) {
		let lastRow = -1;
		sheet.columns.forEach((column) => {
			column.cells.forEach((value, row) => { if (!isBlank(value) && row > lastRow) lastRow = row; });
		});
		const lines = [sheet.columns.map(column => escapeCsvCell(formatAxisLabel(getColumnLabel(sheet, column), column.unit)))];
		for (let row = 0; row <= lastRow; row++) {
			lines.push(sheet.columns.map(column => escapeCsvCell(column.cells[row] ?? '')));
		}
		return `${lines.map(line => (Array.isArray(line) ? line.join(',') : line)).join('\r\n')}\r\n`;
	}

	// A suggestion only: the import preview lets the student change every role.
	function guessImportRole(header, index) {
		const text = String(header || '').trim();
		const errorType = /%|percent/i.test(text) ? 'percentage' : 'absolute';
		if (/^(Δ|∆|±|delta\b)|uncertaint|\berr(or)?\b/i.test(text) || /^d[A-Z]/.test(text)) {
			return { role: /^(Δ|∆|±|delta\s*)?x\b|\bx[\s_-]*(uncertaint|err)/i.test(text) ? 'xErr' : 'yErr', errorType };
		}
		return { role: index === 0 ? 'X' : 'Y', errorType: 'absolute' };
	}

	// "Δx" belongs to whichever column is called x (or x1, x2…): the X column gives ±ΔX, a Y column ±ΔY.
	function guessImportRoles(headers) {
		const roles = headers.map((header, index) => guessImportRole(header, index));
		// Case matters: t (time) and T (period) are different quantities.
		const baseOf = text => String(text || '').trim().replace(/[\s_-]*\d+$/, '');
		const names = headers.map(header => splitHeader(header).name);
		return roles.map((entry, index) => {
			if (entry.role !== 'xErr' && entry.role !== 'yErr') return entry;
			const quantity = baseOf(names[index]
				.replace(/^(Δ|∆|±|delta\s*|d(?=[A-Z]))/i, '')
				.replace(/\b(uncertainty|uncertainties|error|err)\b|\bin\b|%|\(.*\)/gi, ''));
			if (!quantity) return entry;
			const owner = roles.findIndex((other, otherIndex) => (other.role === 'X' || other.role === 'Y') && baseOf(names[otherIndex]) === quantity);
			if (owner < 0) return entry;
			return { ...entry, role: roles[owner].role === 'X' ? 'xErr' : 'yErr' };
		});
	}

	// Replaces a sheet's columns with imported ones; roles[i] gives each column's { role, errorType }.
	function importRows(sheet, rows, options, ids) {
		const width = Math.max(0, ...rows.map(row => row.length));
		const headers = options.headers ? rows[0] || [] : [];
		const data = options.headers ? rows.slice(1) : rows;
		const rowCount = Math.max(DEFAULT_ROWS, data.length + 1);
		sheet.columns = Array.from({ length: width }, (_, index) => {
			const { name, unit } = splitHeader(headers[index] || '');
			const role = options.roles[index] || { role: 'Y', errorType: 'absolute' };
			return createColumn(ids.next('c'), {
				name: name || (index === 0 ? 'x' : ''),
				unit,
				role: role.role,
				errorType: role.errorType,
				cells: data.map(row => row[index] ?? '')
			}, rowCount);
		});
		sheet.rowCount = rowCount;
		setRowCount(sheet, rowCount);
		sheet.fitSeries = null;
		sheet.hiddenSeries = [];
		return sheet;
	}

	const api = {
		ROLES,
		DEFAULT_ROWS,
		EQUATION_DECIMALS_DEFAULT,
		EQUATION_DECIMALS_MAX,
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
		normalizeState,
		FORMULA_FUNCTIONS,
		isFormulaColumn,
		isPropagatedColumn,
		isComputedColumn,
		getUncertaintyColumns,
		describePropagation,
		cleanFormulaText,
		getFormulaSymbols,
		analyzeFormula,
		recomputeFormulas,
		remapFormulaLetters,
		getRepeatBaseName,
		buildRepeatFormulas,
		parseCsv,
		buildCsv,
		guessImportRole,
		guessImportRoles,
		importRows
	};

	if (typeof module === 'object' && module.exports) module.exports = api;
	else root.PanPhyNeoModel = api;
})(typeof globalThis === 'object' ? globalThis : this);
