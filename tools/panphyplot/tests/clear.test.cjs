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
			closeDialog = renderSheetTabs = renderTable = syncTitleInput = showToast = () => {};
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
		closeDialog = renderSheetTabs = renderTable = syncTitleInput = showToast = clearAdvancedFitParameters = () => {};
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
