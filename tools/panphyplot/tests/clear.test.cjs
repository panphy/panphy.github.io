const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const model = require('../js/model.js');

for (const reset of [false, true]) {
	test(`Clear (${reset ? 'blank sheet' : 'keep columns'}) removes only this sheet's fits and cancels pending fits`, () => {
		const context = { window: { PanPhyPlotModel: model, addEventListener() {} }, document: { addEventListener() {} }, console };
		vm.createContext(context);
		for (const file of ['state.js', 'ui.js', 'dialogs.js']) {
			vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context);
		}
		vm.runInContext(`
			const sheet = getActiveSheet();
			sheet.columns[0].cells[0] = '1';
			sheet.columns[1].cells[0] = '3';
			refreshActiveFitKey();
			const target = captureFitTarget();
			const key = activeFitKey;
			const stores = [datasetFitResults, fittedCurves, customFitStates, fitExtents, fitFunctions];
			stores.forEach(store => { store[key] = { value: 'old' }; store['other:series'] = { value: 'keep' }; });
			let parameterResets = 0;
			clearAdvancedFitParameters = () => { parameterResets += 1; };
			closeDialog = renderSheetTabs = applyChartMode = renderTable = syncTitleInput = showToast = () => {};
			afterDataChange = () => refreshActiveFitKey();
		`, context);
		context.applyClear(reset);
		assert.equal(vm.runInContext('parameterResets', context), 1);
		assert.equal(vm.runInContext('PlotModel.isSheetEmpty(sheet)', context), true);
		assert.equal(vm.runInContext('stores.every(store => !store[key] && store["other:series"].value === "keep")', context), true);
		// Even re-entering identical data must not allow the old asynchronous fit to return.
		vm.runInContext(`sheet.columns[0].cells[0] = '1'; sheet.columns[1].cells[0] = '3';`, context);
		assert.equal(vm.runInContext('resolveFitTarget(target)', context), -1);
	});
}

test('an empty sheet with changed dimensions can reset to the default rows and columns', () => {
	const context = { window: { PanPhyPlotModel: model, addEventListener() {} }, document: { addEventListener() {} }, console };
	vm.createContext(context);
	for (const file of ['state.js', 'ui.js', 'dialogs.js']) {
		vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context);
	}
	vm.runInContext(`
		const sheet = getActiveSheet();
		closeDialog = renderSheetTabs = applyChartMode = renderTable = syncTitleInput = showToast = clearAdvancedFitParameters = () => {};
		afterDataChange = () => refreshActiveFitKey();
	`, context);
	for (const rows of [1, 25, 250]) {
		vm.runInContext(`PlotModel.setRowCount(sheet, ${rows});`, context);
		assert.equal(vm.runInContext('isBlankNewSheet(sheet)', context), false);
		context.applyClear(true);
		assert.equal(vm.runInContext('sheet.rowCount', context), model.DEFAULT_ROWS);
		assert.equal(vm.runInContext('sheet.columns.every(column => column.cells.length === PlotModel.DEFAULT_ROWS)', context), true);
		assert.equal(vm.runInContext('isBlankNewSheet(sheet)', context), true);
	}
	vm.runInContext(`PlotModel.insertColumn(sheet, 2, createNewColumn());`, context);
	assert.equal(vm.runInContext('isBlankNewSheet(sheet)', context), false);
	context.applyClear(true);
	assert.equal(vm.runInContext('sheet.columns.length', context), 2);
	assert.equal(vm.runInContext('isBlankNewSheet(sheet)', context), true);
});

test('Scatter or Bar switches an empty sheet in place and offers a new sheet once there is data', () => {
	const context = { window: { PanPhyPlotModel: model, addEventListener() {} }, document: { addEventListener() {} }, console };
	vm.createContext(context);
	for (const file of ['state.js', 'ui.js', 'dialogs.js']) {
		vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context);
	}
	vm.runInContext(`
		let asked = null;
		openChartTypeDialog = (type) => { asked = type; pendingChartType = type; };
		closeMenu = closeDialog = applyChartMode = renderTable = forceReplot = syncTitleInput = showToast = afterDataChange = () => {};
		switchSheet = (index) => { plotState.activeSheet = index; };
	`, context);
	context.setSheetChartType('bar');
	assert.equal(vm.runInContext('asked', context), null);
	assert.equal(vm.runInContext('PlotModel.isBarSheet(getActiveSheet())', context), true);

	vm.runInContext(`getActiveSheet().columns[0].name = 'Tennis'; getActiveSheet().columns[0].cells[0] = '54';`, context);
	context.setSheetChartType('scatter');
	assert.equal(vm.runInContext('asked', context), 'scatter');
	assert.equal(vm.runInContext('plotState.sheets.length === 1 && PlotModel.isBarSheet(plotState.sheets[0])', context), true);

	context.applyChartTypeChoice(true);
	assert.equal(vm.runInContext('plotState.sheets.length', context), 2);
	assert.equal(vm.runInContext('PlotModel.isBarSheet(plotState.sheets[0]) && plotState.sheets[0].columns[0].cells[0] === "54"', context), true);
	assert.equal(vm.runInContext('!PlotModel.isBarSheet(plotState.sheets[1]) && plotState.sheets[1].columns[0].cells[0] === "54" && plotState.activeSheet === 1', context), true);

	vm.runInContext(`plotState.activeSheet = 0; pendingChartType = 'scatter';`, context);
	context.applyChartTypeChoice(false);
	assert.equal(vm.runInContext('plotState.sheets.length === 3 && PlotModel.isSheetEmpty(plotState.sheets[2]) && !PlotModel.isBarSheet(plotState.sheets[2])', context), true);
});
