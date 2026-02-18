// Data Processing popup (PanPhyPlot MVP)
(function() {
	const CREATE_NEW_TARGET_VALUE = '__create_new_dataset__';
	const IDENTIFIER_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;
	const FORBIDDEN_NODE_TYPES = new Set([
		'AssignmentNode',
		'FunctionAssignmentNode',
		'BlockNode'
	]);
	const FORBIDDEN_FUNCTION_NAMES = new Set(['import']);

	let isInitialized = false;
	let isOpen = false;

	const state = {
		sourceRows: [],
		sourceHeaders: { x: 'x', y: 'y' },
		derivedColumns: [],
		pendingDerivedColumn: null,
		columnChoices: [],
		targetChoices: [],
		formulaAxis: null,
		nextDerivedId: 1
	};

	function getElements() {
		return {
			background: document.getElementById('data-processing-background'),
			container: document.getElementById('data-processing-container'),
			closeButton: document.getElementById('data-processing-close'),
			sourceHeading: document.getElementById('data-processing-source-heading'),
			sourceHeaderRow: document.getElementById('data-processing-source-header-row'),
			sourceXHeader: document.getElementById('data-processing-source-x-header'),
			sourceYHeader: document.getElementById('data-processing-source-y-header'),
			sourceBody: document.getElementById('data-processing-source-body'),
			sourceEmpty: document.getElementById('data-processing-source-empty'),
			sourceTableWrap: document.getElementById('data-processing-source-table-wrap'),
			processXButton: document.getElementById('data-processing-process-x'),
			processYButton: document.getElementById('data-processing-process-y'),
			formulaPanel: document.getElementById('data-processing-formula-panel'),
			formulaLabel: document.getElementById('data-processing-formula-label'),
			formulaInput: document.getElementById('data-processing-formula-input'),
			formulaMessage: document.getElementById('data-processing-formula-message'),
			applyButton: document.getElementById('data-processing-apply'),
			cancelButton: document.getElementById('data-processing-cancel'),
			derivedList: document.getElementById('data-processing-derived-list'),
			derivedEmpty: document.getElementById('data-processing-derived-empty'),
			outputXSelect: document.getElementById('data-processing-output-x'),
			outputYSelect: document.getElementById('data-processing-output-y'),
			targetSelect: document.getElementById('data-processing-target'),
			copyButton: document.getElementById('data-processing-copy'),
			resetButton: document.getElementById('data-processing-reset'),
			message: document.getElementById('data-processing-message')
		};
	}

	function isValidIdentifier(value) {
		return IDENTIFIER_REGEX.test(String(value || '').trim());
	}

	function getSourceHeaderLabel(axis) {
		const fallback = axis === 'x' ? 'x' : 'y';
		const raw = state.sourceHeaders[axis];
		const label = typeof raw === 'string' ? raw.trim() : '';
		return label || fallback;
	}

	function getDatasetLabel(index) {
		if (typeof getDatasetDisplayName === 'function') {
			return getDatasetDisplayName(index);
		}
		return `Dataset ${index + 1}`;
	}

	function getSourceHeadersFromState() {
		const headerSet = datasetHeaders && datasetHeaders[activeSet] ? datasetHeaders[activeSet] : {};
		const xInput = document.getElementById('x-column-name');
		const yInput = document.getElementById('y-column-name');
		const xRaw = typeof headerSet.x === 'string' ? headerSet.x : (xInput ? xInput.value : 'x');
		const yRaw = typeof headerSet.y === 'string' ? headerSet.y : (yInput ? yInput.value : 'y');
		return {
			x: String(xRaw || 'x').trim() || 'x',
			y: String(yRaw || 'y').trim() || 'y'
		};
	}

	function getValidSourceRows() {
		const dataset = Array.isArray(rawData[activeSet]) ? rawData[activeSet] : [];
		const rows = [];

		for (let index = 0; index < dataset.length; index++) {
			const point = dataset[index] || {};
			const x = Number(point.x);
			const y = Number(point.y);
			if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

			rows.push({
				x,
				y
			});
		}

		return rows;
	}

	function getHeaderAliasBindings() {
		const aliases = [];
		const xHeader = getSourceHeaderLabel('x');
		const yHeader = getSourceHeaderLabel('y');
		const isXValid = isValidIdentifier(xHeader);
		const isYValid = isValidIdentifier(yHeader);

		if (isXValid && xHeader !== yHeader) {
			aliases.push({ name: xHeader, axis: 'x' });
		}
		if (isYValid && yHeader !== xHeader) {
			aliases.push({ name: yHeader, axis: 'y' });
		}

		return aliases;
	}

	function setMessages(messages = []) {
		const elements = getElements();
		if (!elements.message) return;

		elements.message.innerHTML = '';
		if (!messages.length) {
			elements.message.style.display = 'none';
			return;
		}

		const fragment = document.createDocumentFragment();
		messages.forEach(({ type, text }) => {
			const row = document.createElement('div');
			row.className = `data-processing-message-row is-${type || 'info'}`;
			row.textContent = text;
			fragment.appendChild(row);
		});

		elements.message.appendChild(fragment);
		elements.message.style.display = 'block';
	}

	function clearMessages() {
		setMessages([]);
	}

	function setFormulaMessage(text = '', type = 'error') {
		const elements = getElements();
		if (!elements.formulaMessage) return;

		if (!text) {
			elements.formulaMessage.textContent = '';
			elements.formulaMessage.className = '';
			elements.formulaMessage.style.display = 'none';
			return;
		}

		elements.formulaMessage.textContent = text;
		elements.formulaMessage.className = `is-${type}`;
		elements.formulaMessage.style.display = 'block';
	}

	function clearFormulaMessage() {
		setFormulaMessage('');
	}

	function isEnterKey(event) {
		return event.key === 'Enter'
			|| event.code === 'Enter'
			|| event.code === 'NumpadEnter'
			|| event.keyCode === 13;
	}

	function isEscapeKey(event) {
		return event.key === 'Escape'
			|| event.code === 'Escape'
			|| event.keyCode === 27;
	}

	function getSourceTableColumns() {
		const columns = state.derivedColumns.slice();
		if (state.pendingDerivedColumn) {
			columns.push(state.pendingDerivedColumn);
		}
		return columns;
	}

	function buildPendingColumn(axis) {
		const axisLabel = getSourceHeaderLabel(axis);
		return {
			axis,
			name: `Processed ${axisLabel}`,
			formula: '',
			values: [],
			invalidCount: 0,
			isPending: true
		};
	}

	function renderSourceSection() {
		const elements = getElements();
		const hasRows = state.sourceRows.length > 0;
		const xLabel = getSourceHeaderLabel('x');
		const yLabel = getSourceHeaderLabel('y');
		const sourceTableColumns = getSourceTableColumns();
		const sourceDatasetLabel = getDatasetLabel(activeSet);

		if (elements.sourceHeading) {
			elements.sourceHeading.textContent = `Source Data - ${sourceDatasetLabel}`;
		}

		if (elements.sourceXHeader) elements.sourceXHeader.textContent = xLabel;
		if (elements.sourceYHeader) elements.sourceYHeader.textContent = yLabel;
		if (elements.sourceHeaderRow) {
			elements.sourceHeaderRow.querySelectorAll('.data-processing-derived-header').forEach((cell) => {
				cell.remove();
			});
			sourceTableColumns.forEach((column) => {
				const th = document.createElement('th');
				th.className = 'data-processing-derived-header';
				th.textContent = column.isPending ? `${column.name} (pending)` : column.name;
				elements.sourceHeaderRow.appendChild(th);
			});
		}

		if (elements.sourceBody) {
			elements.sourceBody.innerHTML = '';
			if (hasRows) {
				const fragment = document.createDocumentFragment();
				state.sourceRows.forEach((row, rowIndex) => {
					const tr = document.createElement('tr');
					const xCell = document.createElement('td');
					const yCell = document.createElement('td');
					xCell.textContent = String(row.x);
					yCell.textContent = String(row.y);
					tr.appendChild(xCell);
					tr.appendChild(yCell);

					sourceTableColumns.forEach((column) => {
						const derivedCell = document.createElement('td');
						const value = Array.isArray(column.values) ? column.values[rowIndex] : null;
						derivedCell.textContent = Number.isFinite(Number(value)) ? String(value) : '';
						tr.appendChild(derivedCell);
					});

					fragment.appendChild(tr);
				});
				elements.sourceBody.appendChild(fragment);
			}
		}

		if (elements.sourceEmpty) {
			elements.sourceEmpty.style.display = hasRows ? 'none' : 'block';
		}
		if (elements.sourceTableWrap) {
			elements.sourceTableWrap.style.display = hasRows ? 'block' : 'none';
		}

		if (elements.processXButton) {
			elements.processXButton.textContent = `Process ${xLabel}`;
			elements.processXButton.disabled = !hasRows;
		}
		if (elements.processYButton) {
			elements.processYButton.textContent = `Process ${yLabel}`;
			elements.processYButton.disabled = !hasRows;
		}
	}

	function renderDerivedColumns() {
		const elements = getElements();
		if (!elements.derivedList || !elements.derivedEmpty) return;

		elements.derivedList.innerHTML = '';

		if (!state.derivedColumns.length) {
			elements.derivedEmpty.style.display = 'block';
			return;
		}

		elements.derivedEmpty.style.display = 'none';
		const fragment = document.createDocumentFragment();

		state.derivedColumns.forEach((column) => {
			const item = document.createElement('div');
			item.className = 'data-processing-derived-item';

			const textWrap = document.createElement('div');
			textWrap.className = 'data-processing-derived-text';

			const nameLine = document.createElement('div');
			nameLine.className = 'data-processing-derived-name';
			nameLine.textContent = column.name;

			const formulaLine = document.createElement('div');
			formulaLine.className = 'data-processing-derived-formula';
			formulaLine.textContent = column.formula;

			const metaLine = document.createElement('div');
			metaLine.className = 'data-processing-derived-meta';
			metaLine.textContent = `Invalid rows: ${column.invalidCount}`;

			textWrap.appendChild(nameLine);
			textWrap.appendChild(formulaLine);
			textWrap.appendChild(metaLine);

			const removeButton = document.createElement('button');
			removeButton.type = 'button';
			removeButton.className = 'data-processing-remove-btn';
			removeButton.textContent = 'Remove';
			removeButton.setAttribute('data-derived-id', column.id);

			item.appendChild(textWrap);
			item.appendChild(removeButton);
			fragment.appendChild(item);
		});

		elements.derivedList.appendChild(fragment);
	}

	function getColumnChoices() {
		const choices = [
			{ value: 'source:x', label: getSourceHeaderLabel('x'), kind: 'source-x' },
			{ value: 'source:y', label: getSourceHeaderLabel('y'), kind: 'source-y' }
		];

		state.derivedColumns.forEach((column) => {
			choices.push({
				value: `derived:${column.id}`,
				label: column.name,
				kind: 'derived'
			});
		});

		return choices;
	}

	function getTargetChoices() {
		const choices = [];
		for (let index = 0; index < rawData.length; index++) {
			// Keep source dataset unchanged by excluding it from targets.
			if (index === activeSet) continue;
			choices.push({
				value: `dataset:${index}`,
				label: getDatasetLabel(index)
			});
		}
		choices.push({
			value: CREATE_NEW_TARGET_VALUE,
			label: 'Create new dataset'
		});
		return choices;
	}

	function setSelectOptions(select, choices) {
		if (!select) return;
		select.innerHTML = '';
		choices.forEach((choice) => {
			const option = document.createElement('option');
			option.value = choice.value;
			option.textContent = choice.label;
			select.appendChild(option);
		});
	}

	function getDefaultTargetChoice(targetChoices) {
		if (!Array.isArray(targetChoices) || !targetChoices.length) {
			return CREATE_NEW_TARGET_VALUE;
		}

		const hasDataset2Option = targetChoices.some((choice) => choice.value === 'dataset:1');
		if (hasDataset2Option) {
			const dataset2 = Array.isArray(rawData[1]) ? rawData[1] : [];
			if (dataset2.length === 0) {
				return 'dataset:1';
			}
		}

		return CREATE_NEW_TARGET_VALUE;
	}

	function enforceSelectValue(select, preferred, fallback) {
		if (!select) return;
		const values = new Set(Array.from(select.options).map((option) => option.value));
		if (preferred && values.has(preferred)) {
			select.value = preferred;
			return;
		}
		if (fallback && values.has(fallback)) {
			select.value = fallback;
			return;
		}
		if (select.options.length > 0) {
			select.selectedIndex = 0;
		}
	}

	function renderMappingSection(preserveSelection = true) {
		const elements = getElements();
		if (!elements.outputXSelect || !elements.outputYSelect || !elements.targetSelect) return;

		const previousX = preserveSelection ? elements.outputXSelect.value : '';
		const previousY = preserveSelection ? elements.outputYSelect.value : '';
		const previousTarget = preserveSelection ? elements.targetSelect.value : '';

		state.columnChoices = getColumnChoices();
		state.targetChoices = getTargetChoices();

		setSelectOptions(elements.outputXSelect, state.columnChoices);
		setSelectOptions(elements.outputYSelect, state.columnChoices);
		setSelectOptions(elements.targetSelect, state.targetChoices);

		enforceSelectValue(elements.outputXSelect, previousX, 'source:x');
		enforceSelectValue(elements.outputYSelect, previousY, 'source:y');
		enforceSelectValue(
			elements.targetSelect,
			previousTarget,
			getDefaultTargetChoice(state.targetChoices)
		);

		const noRows = state.sourceRows.length === 0;
		elements.outputXSelect.disabled = noRows;
		elements.outputYSelect.disabled = noRows;
		elements.targetSelect.disabled = noRows;
		if (elements.copyButton) {
			elements.copyButton.disabled = noRows;
		}
	}

	function sanitizeFormulaText(rawFormula) {
		const trimmed = String(rawFormula || '').trim();
		if (!trimmed) return '';
		if (trimmed.startsWith('=')) {
			return trimmed.slice(1).trim();
		}
		return trimmed;
	}

	function hasForbiddenConstruct(node) {
		let blocked = false;

		node.traverse((child) => {
			if (blocked) return;

			if (FORBIDDEN_NODE_TYPES.has(child.type)) {
				blocked = true;
				return;
			}

			if (child.type === 'FunctionNode' && child.fn && child.fn.type === 'SymbolNode') {
				if (FORBIDDEN_FUNCTION_NAMES.has(child.fn.name)) {
					blocked = true;
				}
			}
		});

		return blocked;
	}

	function isKnownMathSymbol(name) {
		return typeof math === 'object' && math !== null && name in math;
	}

	function findUnknownSymbol(node, allowedSymbols) {
		let unknownSymbol = '';

		node.traverse((child, _path, parent) => {
			if (unknownSymbol || child.type !== 'SymbolNode') return;

			const symbolName = child.name;
			const isFunctionName = parent
				&& parent.type === 'FunctionNode'
				&& parent.fn === child;

			if (isFunctionName) {
				if (!isKnownMathSymbol(symbolName)) {
					unknownSymbol = symbolName;
				}
				return;
			}

			if (allowedSymbols.has(symbolName)) return;
			if (isKnownMathSymbol(symbolName)) return;
			unknownSymbol = symbolName;
		});

		return unknownSymbol;
	}

	function evaluateFormula(compiledExpression, aliases) {
		const values = [];
		let invalidCount = 0;

		state.sourceRows.forEach((row) => {
			const scope = {
				x: row.x,
				y: row.y
			};

			aliases.forEach((alias) => {
				scope[alias.name] = alias.axis === 'x' ? row.x : row.y;
			});

			try {
				const rawResult = compiledExpression.evaluate(scope);
				const numericValue = Number(rawResult);
				if (Number.isFinite(numericValue)) {
					values.push(numericValue);
					return;
				}
			} catch {
				// Row-level evaluation errors are treated as invalid results.
			}

			values.push(null);
			invalidCount += 1;
		});

		return { values, invalidCount };
	}

	function showFormulaPanel(axis) {
		const elements = getElements();
		if (!elements.formulaPanel || !elements.formulaLabel || !elements.formulaInput) return;

		const headerLabel = getSourceHeaderLabel(axis);
		state.formulaAxis = axis;
		state.pendingDerivedColumn = buildPendingColumn(axis);
		renderSourceSection();
		elements.formulaLabel.textContent = `Formula for ${headerLabel}`;
		elements.formulaInput.placeholder = `e.g. =1/${headerLabel}`;
		elements.formulaInput.value = '';
		clearFormulaMessage();
		elements.formulaPanel.style.display = 'block';
		elements.formulaInput.focus();
	}

	function hideFormulaPanel({ discardPending = false } = {}) {
		const elements = getElements();
		state.formulaAxis = null;
		if (!elements.formulaPanel || !elements.formulaInput) return;
		elements.formulaPanel.style.display = 'none';
		elements.formulaInput.value = '';
		clearFormulaMessage();
		if (discardPending) {
			state.pendingDerivedColumn = null;
			renderSourceSection();
		}
	}

	function handleCancelFormula() {
		hideFormulaPanel({ discardPending: true });
		clearMessages();
	}

	function handleApplyFormula() {
		if (!state.formulaAxis || !state.sourceRows.length || !state.pendingDerivedColumn) return;
		clearFormulaMessage();
		if (typeof math !== 'object' || math === null || typeof math.parse !== 'function') {
			setFormulaMessage('Invalid formula. Please check syntax and try again.', 'error');
			return;
		}

		const elements = getElements();
		const sanitizedFormula = sanitizeFormulaText(elements.formulaInput ? elements.formulaInput.value : '');
		if (!sanitizedFormula) {
			setFormulaMessage('Invalid formula. Please check syntax and try again.', 'error');
			return;
		}

		let parsedExpression = null;
		try {
			parsedExpression = math.parse(sanitizedFormula);
		} catch {
			setFormulaMessage('Invalid formula. Please check syntax and try again.', 'error');
			return;
		}

		if (hasForbiddenConstruct(parsedExpression)) {
			setFormulaMessage('Invalid formula. Please check syntax and try again.', 'error');
			return;
		}

		const aliases = getHeaderAliasBindings();
		const allowedSymbols = new Set(['x', 'y']);
		aliases.forEach((alias) => allowedSymbols.add(alias.name));

		const unknownSymbol = findUnknownSymbol(parsedExpression, allowedSymbols);
		if (unknownSymbol) {
			setFormulaMessage(`Unknown variable "${unknownSymbol}" in formula.`, 'warning');
			return;
		}

		let compiledExpression = null;
		try {
			compiledExpression = parsedExpression.compile();
		} catch {
			setFormulaMessage('Invalid formula. Please check syntax and try again.', 'error');
			return;
		}

		const { values, invalidCount } = evaluateFormula(compiledExpression, aliases);
		const axisLabel = getSourceHeaderLabel(state.pendingDerivedColumn.axis || state.formulaAxis);
		const derivedColumn = {
			id: `derived-${state.nextDerivedId++}`,
			name: `${axisLabel} | ${sanitizedFormula}`,
			formula: sanitizedFormula,
			values,
			invalidCount
		};

		state.derivedColumns.push(derivedColumn);
		state.pendingDerivedColumn = null;
		hideFormulaPanel();
		renderSourceSection();
		renderDerivedColumns();
		renderMappingSection(true);

		if (invalidCount > 0) {
			setMessages([{ type: 'warning', text: 'Some rows produced invalid results and will be skipped.' }]);
		} else {
			clearMessages();
		}
	}

	function getColumnById(columnId) {
		if (columnId === 'source:x') {
			return {
				label: getSourceHeaderLabel('x'),
				values: state.sourceRows.map((row) => row.x)
			};
		}
		if (columnId === 'source:y') {
			return {
				label: getSourceHeaderLabel('y'),
				values: state.sourceRows.map((row) => row.y)
			};
		}

		if (columnId.startsWith('derived:')) {
			const derivedId = columnId.slice('derived:'.length);
			const derived = state.derivedColumns.find((column) => column.id === derivedId);
			if (!derived) return null;
			return {
				label: derived.name,
				values: derived.values.slice()
			};
		}

		return null;
	}

	function isDatasetNonEmpty(index) {
		return Array.isArray(rawData[index]) && rawData[index].length > 0;
	}

	function writeToTargetDataset(targetIndex, xLabel, yLabel, points) {
		rawData[targetIndex] = points.map((point) => ({
			x: point.x,
			y: point.y,
			xErrorRaw: 0,
			yErrorRaw: 0
		}));

		datasetToggles[targetIndex] = { x: false, y: false };
		datasetErrorTypes[targetIndex] = { x: 'absolute', y: 'absolute' };
		datasetHeaders[targetIndex] = { x: xLabel, y: yLabel };
		delete fittedCurves[targetIndex];
		delete datasetFitResults[targetIndex];
	}

	function createNewDatasetIndex() {
		const newIndex = rawData.length;
		rawData.push([]);
		datasetHeaders[newIndex] = { x: 'x', y: 'y' };
		datasetToggles[newIndex] = { x: false, y: false };
		datasetErrorTypes[newIndex] = { x: 'absolute', y: 'absolute' };
		return newIndex;
	}

	function handleCopyToDataset() {
		if (!state.sourceRows.length) return;

		const elements = getElements();
		const selectedXColumnId = elements.outputXSelect ? elements.outputXSelect.value : '';
		const selectedYColumnId = elements.outputYSelect ? elements.outputYSelect.value : '';
		const selectedTarget = elements.targetSelect ? elements.targetSelect.value : '';

		if (!selectedXColumnId || !selectedYColumnId) {
			setMessages([{ type: 'error', text: 'No valid output rows to copy.' }]);
			return;
		}

		const xColumn = getColumnById(selectedXColumnId);
		const yColumn = getColumnById(selectedYColumnId);
		if (!xColumn || !yColumn) {
			setMessages([{ type: 'error', text: 'No valid output rows to copy.' }]);
			return;
		}

		const outputRows = [];
		let skippedRows = 0;
		for (let rowIndex = 0; rowIndex < state.sourceRows.length; rowIndex++) {
			const xValue = Number(xColumn.values[rowIndex]);
			const yValue = Number(yColumn.values[rowIndex]);
			if (Number.isFinite(xValue) && Number.isFinite(yValue)) {
				outputRows.push({ x: xValue, y: yValue });
			} else {
				skippedRows += 1;
			}
		}

		if (!outputRows.length) {
			setMessages([{ type: 'error', text: 'No valid output rows to copy.' }]);
			return;
		}

		let targetIndex = -1;
		let createdNewDataset = false;
		if (selectedTarget === CREATE_NEW_TARGET_VALUE) {
			targetIndex = createNewDatasetIndex();
			createdNewDataset = true;
		} else {
			targetIndex = Number(selectedTarget.replace('dataset:', ''));
			if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= rawData.length) {
				setMessages([{ type: 'error', text: 'No valid output rows to copy.' }]);
				return;
			}
		}

		const targetLabel = getDatasetLabel(targetIndex);
		if (!createdNewDataset && isDatasetNonEmpty(targetIndex)) {
			const confirmed = window.confirm(`Replace existing data in "${targetLabel}" with processed data?`);
			if (!confirmed) return;
		}

		writeToTargetDataset(targetIndex, xColumn.label, yColumn.label, outputRows);

		if (targetIndex === 0 && typeof syncDataset1XValues === 'function') {
			syncDataset1XValues();
		}

		if (createdNewDataset && typeof updateDatasetTabsBar === 'function') {
			updateDatasetTabsBar();
		}
		if (typeof updatePlotAndRenderLatex === 'function') {
			updatePlotAndRenderLatex();
		}

		if (typeof scheduleSaveState === 'function') {
			scheduleSaveState();
		}

		const messages = [];
		if (skippedRows > 0) {
			messages.push({
				type: 'warning',
				text: 'Some rows produced invalid results and will be skipped.'
			});
		}
		messages.push({
			type: 'success',
			text: `Processed data copied to ${targetLabel}.`
		});
		setMessages(messages);

		renderMappingSection(true);
	}

	function resetSessionState() {
		state.derivedColumns = [];
		state.pendingDerivedColumn = null;
		state.columnChoices = [];
		state.targetChoices = [];
		state.formulaAxis = null;
		state.nextDerivedId = 1;
		hideFormulaPanel();
		renderSourceSection();
		renderDerivedColumns();
		renderMappingSection(false);
		clearMessages();
	}

	function refreshSourceState() {
		state.sourceHeaders = getSourceHeadersFromState();
		state.sourceRows = getValidSourceRows();
	}

	function openDataProcessingPopup() {
		initializeDataProcessing();
		const elements = getElements();
		if (!elements.background || !elements.container) return;

		refreshSourceState();
		resetSessionState();
		renderSourceSection();
		renderMappingSection(false);
		clearMessages();

		elements.background.style.display = 'block';
		elements.container.style.display = 'flex';
		isOpen = true;
	}

	function closeDataProcessingPopup() {
		const elements = getElements();
		if (!elements.background || !elements.container) return;
		elements.background.style.display = 'none';
		elements.container.style.display = 'none';
		hideFormulaPanel({ discardPending: true });
		clearMessages();
		isOpen = false;
	}

	function handleDerivedListClick(event) {
		const removeButton = event.target.closest('[data-derived-id]');
		if (!removeButton) return;
		const derivedId = removeButton.getAttribute('data-derived-id');
		if (!derivedId) return;

		state.derivedColumns = state.derivedColumns.filter((column) => column.id !== derivedId);
		renderSourceSection();
		renderDerivedColumns();
		renderMappingSection(true);
	}

	function initializeDataProcessing() {
		if (isInitialized) return;
		const elements = getElements();
		if (!elements.container) return;

		if (elements.closeButton) {
			elements.closeButton.addEventListener('click', closeDataProcessingPopup);
		}
		if (elements.background) {
			elements.background.addEventListener('click', closeDataProcessingPopup);
		}
		if (elements.processXButton) {
			elements.processXButton.addEventListener('click', () => showFormulaPanel('x'));
		}
		if (elements.processYButton) {
			elements.processYButton.addEventListener('click', () => showFormulaPanel('y'));
		}
		if (elements.applyButton) {
			elements.applyButton.addEventListener('click', handleApplyFormula);
		}
		if (elements.cancelButton) {
			elements.cancelButton.addEventListener('click', handleCancelFormula);
		}
		if (elements.formulaInput) {
			elements.formulaInput.addEventListener('keydown', (event) => {
				if (isEnterKey(event)) {
					event.preventDefault();
					handleApplyFormula();
					return;
				}
				if (isEscapeKey(event)) {
					event.preventDefault();
					event.stopPropagation();
					handleCancelFormula();
				}
			});
		}
		if (elements.derivedList) {
			elements.derivedList.addEventListener('click', handleDerivedListClick);
		}
		if (elements.copyButton) {
			elements.copyButton.addEventListener('click', handleCopyToDataset);
		}
		if (elements.resetButton) {
			elements.resetButton.addEventListener('click', resetSessionState);
		}

		document.addEventListener('keydown', (event) => {
			if (!isOpen) return;
			if (event.key !== 'Escape') return;
			closeDataProcessingPopup();
		});

		isInitialized = true;
	}

	window.initializeDataProcessing = initializeDataProcessing;
	window.openDataProcessingPopup = openDataProcessingPopup;
	window.closeDataProcessingPopup = closeDataProcessingPopup;
})();
