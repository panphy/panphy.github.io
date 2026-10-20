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
