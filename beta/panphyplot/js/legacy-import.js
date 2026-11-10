// Read the original workspace without modifying it. Each dataset becomes a new sheet.
(function(root) {
	const model = typeof module === 'object' && module.exports ? require('./model.js') : root.PanPhyPlotModel;

	function appendOriginalSheets(state, original) {
		if (!Array.isArray(original?.rawData)) return [];
		const ids = model.createIdSource(state);
		const imported = [];
		original.rawData.forEach((points, index) => {
			const drafts = original.datasetDraftRows?.[index];
			const rows = Array.isArray(drafts) ? drafts : (Array.isArray(points) && points.length ? points.map(point => ({
				xValue: point?.x, yValue: point?.y,
				xErrorValue: point?.xErrorRaw, yErrorValue: point?.yErrorRaw
			})) : index === 0 && Array.isArray(original.dataset1XValues) ? original.dataset1XValues.map(xValue => ({ xValue })) : []);
			if (!rows.some(row => ['xValue', 'yValue', 'xErrorValue', 'yErrorValue'].some(key => String(row?.[key] ?? '').trim()))) return;
			const sheet = model.createSheet(ids, original.datasetNames?.[index] || `OG Dataset ${index + 1}`);
			sheet.rowCount = Math.max(1, rows.length);
			const headers = original.datasetHeaders?.[index] || {};
			const errorTypes = original.datasetErrorTypes?.[index] || {};
			const toggles = original.datasetToggles?.[index] || {};
			sheet.columns = [];
			for (const [axis, role] of [['x', 'X'], ['y', 'Y']]) {
				const header = model.splitHeader(headers[axis] || axis);
				const column = model.createColumn(ids.next('c'), { ...header, role, cells: rows.map(row => row?.[`${axis}Value`] ?? '') }, sheet.rowCount);
				// Original headings have no length limit. Keep their full names and units.
				Object.assign(column, header);
				sheet.columns.push(column);
				const errorCells = rows.map(row => row?.[`${axis}ErrorValue`] ?? '');
				if (toggles[axis] || errorCells.some(value => String(value).trim())) {
					const errorType = errorTypes[axis] === 'percentage' ? 'percentage' : 'absolute';
					const uncertainty = model.createColumn(ids.next('c'), {
						name: `Δ${header.name}`, unit: errorType === 'percentage' ? '%' : header.unit,
						// Preserve stored but disabled uncertainties without enabling them on the graph.
						role: toggles[axis] ? `${axis}Err` : 'none', errorType, cells: errorCells
					}, sheet.rowCount);
					uncertainty.name = `Δ${header.name}`;
					uncertainty.unit = errorType === 'percentage' ? '%' : header.unit;
					sheet.columns.push(uncertainty);
				}
			}
			const title = original.datasetTitles?.[index] || (index === original.activeSet ? { text: original.graphTitle, automatic: original.titleWasAuto } : null);
			if (typeof title?.text === 'string') sheet.title = { text: title.text, automatic: title.automatic !== false };
			sheet.fitSeries = sheet.columns.find(column => column.role === 'Y').id;
			state.sheets.push(sheet);
			imported.push(sheet);
		});
		return imported;
	}
	const api = { appendOriginalSheets };
	if (typeof module === 'object' && module.exports) module.exports = api;
	else root.PanPhyPlotLegacyImport = api;
})(typeof window !== 'undefined' ? window : globalThis);
