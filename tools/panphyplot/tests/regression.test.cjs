// Run with: node --test tools/panphyplot/tests/regression.test.cjs
// No browser or npm dependencies are required for the model/solver regressions.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sourceDir = path.join(__dirname, '..', 'js');


function element(value = '') {
	const attributes = {};
	const classes = new Set();
	return { value, textContent: '', innerHTML: '', style: {}, dataset: {}, checked: false,
		classList: { add: key => classes.add(key), remove: key => classes.delete(key), contains: key => classes.has(key), toggle: (key, on) => on ? classes.add(key) : classes.delete(key) },
		setAttribute: (key, value) => { attributes[key] = value; }, getAttribute: key => attributes[key] ?? null,
		removeAttribute: key => { delete attributes[key]; }, appendChild() {}, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [] };
}
function harness() {
	const elements = Object.fromEntries(['graph-title', 'combined-title', 'combined-x-label', 'combined-y-label', 'x-column-name', 'y-column-name', 'toggle-x-error', 'toggle-y-error', 'x-error-type', 'y-error-type', 'fit-method', 'advanced-fit-method', 'initial-A-gaussian', 'initial-mu', 'initial-sigma', 'initial-c-gaussian'].map(id => [id, element()]));
	elements['x-error-type'].value = elements['y-error-type'].value = 'absolute';
	elements['fit-method'].value = 'Linear';
	elements['advanced-fit-method'].value = 'Gaussian';
	for (const id of ['initial-A-gaussian', 'initial-mu', 'initial-sigma', 'initial-c-gaussian']) elements[id].value = '1';
	let rows = [];
	const table = element();
	table.querySelectorAll = selector => selector === 'tr' || selector === 'tbody tr' ? rows : [];
	elements['data-table'] = table;
	const saved = new Map();
	let nextTimer = 0;
	const timers = new Map();
	const context = { console, Blob, document: {
		getElementById: id => elements[id] || null,
		querySelector: selector => selector === '#data-table tbody' ? table : null,
		querySelectorAll: selector => rows.flatMap(row => row.querySelector(selector) || []),
		createElement: () => element(), createDocumentFragment: () => element(), addEventListener() {}
	}, setTimeout: callback => { timers.set(++nextTimer, callback); return nextTimer; }, clearTimeout: id => timers.delete(id),
		localStorage: { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) },
		updatePlotAndRenderLatex() {}, plotGraph() {}, safeTypeset() {}, alert: message => { context.alerts.push(message); }, alerts: [], showToast() {}, addEventListener() {}, confirm: () => true
	};
	context.window = context;
	vm.createContext(context);
	const run = code => vm.runInContext(code, context);
	run(fs.readFileSync(path.join(sourceDir, 'vendor/math.min.js'), 'utf8'));
	for (const name of ['state', 'fit-core', 'curve-fitting', 'ui']) run(fs.readFileSync(path.join(sourceDir, `${name}.js`), 'utf8'));
	context.renderFittingResult = () => {};
	context.clearFittingResultDisplay = () => {};
	context.showToast = () => {};
	function setRows(data) {
		rows = data.map(values => {
			const fields = Object.fromEntries(['.x-input', '.y-input', '.x-error-input', '.y-error-input'].map((key, index) => [key, element(String(values[index] ?? ''))]));
			return { querySelector: key => fields[key] || null };
		});
	}
	return { context, run, setRows, elements, table, saved, timers, core: context.PanPhyFitCore };
}

const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(Math.abs(expected), 1e-30), `${actual} != ${expected}`);

test('strict numbers accept decimals/exponents and reject truncation, null and infinity', () => {
	const { context: c } = harness();
	for (const [input, output] of [['-1.25', -1.25], ['1e-5', 1e-5], ['.5', .5], ['+2.', 2]]) assert.equal(c.parseNumericInput(input), output);
	for (const input of ['', null, '1,234', '12kg', '1e', 'Infinity', '1e999', '0x10']) assert.ok(Number.isNaN(c.parseNumericInput(input)), input);
});
test('input events immediately preserve incomplete rows, invalid text and trailing zeros', () => {
	const { setRows, run, saved, context: c } = harness();
	setRows([['', '12'], ['1,234', '5'], ['1.00', '2.00', '0.010']]);
	run('debouncedUpdateData(); flushSaveState()');
	const state = JSON.parse(saved.get('panphyplot-state-v2'));
	assert.equal(state.datasetDraftRows[0][0].yValue, '12');
	assert.equal(state.datasetDraftRows[0][1].xValue, '1,234');
	assert.equal(state.datasetDraftRows[0][2].xErrorValue, '0.010');
	assert.equal(state.rawData[0].length, 1);
	assert.equal(state.rawData[0][0].x, 1);
	assert.equal(c.isDatasetEmpty(0), false);
});
test('switching datasets captures the old table before changing activeSet', () => {
	const h = harness(); h.setRows([['1', '99']]);
	h.run('rawData = [[{x:1,y:2}], [{x:3,y:4}]]');
	for (const name of ['updateDatasetTabsBar','loadHeaders','loadErrorTypes','loadToggles','loadCustomFitUiForActiveDataset','updateLabels','updateCombinedPlotInputsToActive']) h.context[name] = () => {};
	h.context.populateTableFromActiveDataset = () => h.setRows([['3', '4']]);
	h.context.switchDataset(1);
	assert.equal(h.run('rawData[0][0].y'), 99);
	assert.equal(h.run('rawData[1][0].y'), 4);
});
test('new data marks existing fit stale without deleting its equation', () => {
	const h = harness(); h.setRows([['0','0'],['1','1']]); h.context.fitCurve();
	assert.equal(h.run('datasetFitResults[0].stale'), false);
	h.setRows([['0','0'],['1','10']]); h.context.updateData();
	assert.equal(h.run('datasetFitResults[0].stale'), true);
	assert.equal(h.run('datasetFitResults[0].equation'), 'y = 1x + 0');
});
test('stable fit targets survive unrelated deletion, but reject edits, clear and removal', () => {
	const h = harness();
	h.run('rawData=[[{x:0,y:1}], [{x:2,y:3}]]; const target=captureFitTarget(1); rawData.splice(0,1); reindexDatasets(0)');
	assert.equal(h.run('resolveFitTarget(target)'), 0);
	h.run('invalidatePendingFit(0)'); assert.equal(h.run('resolveFitTarget(target)'), -1);
	h.run('const second=captureFitTarget(0); rawData[0][0].y=7'); assert.equal(h.run('resolveFitTarget(second)'), -1);
	h.run('const third=captureFitTarget(0); rawData.splice(0,1); reindexDatasets(0); rawData.push([{x:2,y:7}])'); assert.equal(h.run('resolveFitTarget(third)'), -1);
});
test('delayed Gaussian worker result cannot overwrite a replacement dataset', async () => {
	const h = harness(); h.setRows([['0','1'],['1','2'],['2','1'],['3','0']]);
	h.run('rawData.push([{x:10,y:100}])');
	let release;
	h.context.Worker = class {
		addEventListener(name, callback) { if (name === 'message') this.receive = callback; }
		postMessage(message) { release = () => this.receive({data: {id:message.id, ok:true, result:{params:{A:1,mu:1,sigma:1,c:1},xFit:[0,1],yFit:[1,2],equation:'old fit',converged:true,iterations:3}}}); }
	};
	const pending = h.context.fitAdvancedCurve();
	h.run('rawData.splice(0,1); reindexDatasets(0)'); release(); await pending;
	assert.equal(h.run('fittedCurves[0]'), undefined);
	assert.equal(h.run('rawData[0][0].y'), 100);
});
test('linear fits and R squared are independent of small measurement units', () => {
	const { core } = harness();
	for (const scale of [1, 1e-9, 1e-100]) {
		const x = [0,scale,2*scale]; const y=[0,1,2];
		const fit=core.computeLinearFit(x,y); near(fit.slope,1/scale); near(fit.evaluate(scale),1);
		near(core.computeRSq(x,y,fit.evaluate),1);
	}
	assert.throws(()=>core.computeLinearFit([2,2],[1,2]), /distinct/);
	assert.equal(core.computeRSq([0,1], [0,1e-9], () => 0), -1);
});
test('small coefficients stay nonzero in built-in and custom equation formatting', () => {
	const h=harness();h.setRows([['0','0'],['1','0.00001']]);h.context.fitCurve();
	assert.doesNotMatch(h.run('datasetFitResults[0].equation'), /0\.000x/);
	near(h.run('fittedCurves[0].y[1]'),1e-5);
	assert.match(h.core.buildGaussianEquation({A:1e-9,mu:0,sigma:1e-9,c:0}), /10\^\{-9\}/);
	assert.ok(!h.core.buildFitDomainFromData([{x:0},{x:1e-15}],3).every(x=>x===0));
});
test('absolute uncertainty exports respect exponents and trailing zero precision', () => {
	const { context:c }=harness();
	assert.equal(c.formatDataForExport('0.001234','1e-5',true,'absolute',.001234,.001234,1e-5),'0.00123');
	assert.equal(c.formatUncertainty('1e-5','absolute'),'0.00001');
	assert.equal(c.countDecimalPlaces('1.20e-3'),5);
	assert.equal(c.countDecimalPlaces('1.20e2'),0);
	assert.equal(c.formatDataForExport('1.2345','0.010',true,'absolute',1.2345,1.2345,.010),'1.234');
	assert.doesNotThrow(()=>c.formatFixedPrecision(1e-150,155));
});
test('processing skips invalid results instead of fabricating zeros', () => {
	const h=harness();
	let source=fs.readFileSync(path.join(sourceDir,'data-processing.js'),'utf8');
	source=source.replace(/\}\)\(\);\s*$/, 'window.processingTest = { state, evaluateFormula, handleCopyToDataset }; })();');
	h.run(source);
	const process=h.context.processingTest;
	process.state.sourceRows=[{x:0,y:5},{x:1,y:6}];
	const evaluated=h.run("processingTest.evaluateFormula(math.compile('1/x'),[])");
	assert.equal(evaluated.invalidCount,1);
	process.state.derivedColumns=[{id:'one',name:'reciprocal',values:evaluated.values}];
	h.elements['data-processing-output-x']=element('derived:one');
	h.elements['data-processing-output-y']=element('source:y');
	h.elements['data-processing-target']=element('__create_new_dataset__');
	h.context.switchDataset=()=>{};h.context.updateDatasetTabsBar=()=>{};
	process.handleCopyToDataset();
	assert.equal(h.run('rawData[1].length'),1);
	assert.equal(h.run('rawData[1][0].x'),1);
	assert.equal(h.run('rawData[1][0].y'),6);
});
test('per-dataset titles preserve intentionally empty titles and combined label overrides', () => {
	const h=harness();h.elements['graph-title'].value='Trial A';h.run('titleWasAuto=false; saveActiveGraphTitle(); activeSet=1');
	h.elements['graph-title'].value='';h.run('saveActiveGraphTitle(); activeSet=0; loadActiveGraphTitle()');
	assert.equal(h.elements['graph-title'].value,'Trial A');
	h.run('activeSet=1; loadActiveGraphTitle()');assert.equal(h.elements['graph-title'].value,'');assert.equal(h.run('titleWasAuto'),false);
	h.elements['combined-title'].value='All trials';h.run('combinedLabelsAuto.title=false');h.context.updateCombinedPlotInputsToActive();
	assert.equal(h.elements['combined-title'].value,'All trials');
});
test('v2 migration keeps the current title and saved combined settings', () => {
	const { context:c }=harness();
	const result=c.migratePersistedState({schemaVersion:2,rawData:[[],[]],activeSet:1,graphTitle:'Saved',titleWasAuto:false,combinedPlot:{title:'Together',xLabel:'t',yLabel:'s'}});
	assert.equal(result.schemaVersion,3);assert.equal(result.datasetTitles[1].text,'Saved');assert.equal(result.datasetTitles[1].automatic,false);assert.equal(result.combinedLabelsAuto.title,false);
});
test('solver diagnostics distinguish convergence from an exhausted iteration budget', () => {
	const {core}=harness();const data=[{x:0,y:2},{x:1,y:2}];const residual=(p,data)=>data.map(row=>p[0]-row.y);const jac=()=>[[1],[1]];
	const exhausted=core.levenbergMarquardt(data,[0],residual,jac,{maxIterations:1});assert.equal(exhausted.converged,false);assert.equal(exhausted.reason,'iteration-limit');
	const solved=core.levenbergMarquardt(data,[0],residual,jac);near(solved.params[0],2);assert.equal(solved.converged,true);
	const gaussian=core.solveGaussian(Array.from({length:21},(_,i)=>({x:i/5-2,y:3*Math.exp(-((i/5-2)**2)/.5)+1})),{A:2,mu:.1,sigma:.7,c:.5});
	near(gaussian.params.A,3,1e-5);near(gaussian.params.sigma,.5,1e-5);assert.equal(gaussian.converged,true);
});

test('basic polynomial, exponential and power fits produce finite diagnostics on reference curves', () => {
	const cases = [
		['Polynomial-2', x => 2*x*x - 3*x + 4],
		['Polynomial-3', x => .5*x*x*x - 2*x + 1],
		['Exponential', x => 3*Math.exp(-.5*x)+2],
		['Power', x => 2*(x+1)**1.5+1]
	];
	for (const [method, f] of cases) {
		const h=harness();h.elements['fit-method'].value=method;
		h.setRows(Array.from({length:12},(_,i)=>[i/2,f(i/2)]));h.context.fitCurve();
		assert.deepEqual(h.context.alerts,[],method);
		assert.ok(Number(h.run('datasetFitResults[0].rSquared'))>.999,method);
		assert.equal(h.run('datasetFitResults[0].residuals.length'),12);
		assert.equal(h.run('datasetFitResults[0].choice.method'),method);
		assert.ok(h.run('fittedCurves[0].y.every(Number.isFinite)'),method);
	}
});
test('sinusoidal and custom solvers preserve convergence metadata', () => {
	const h=harness();
	const sinusoidal = h.core.solveSinusoidal(Array.from({length:41},(_,i)=>({x:i/10,y:2*Math.sin(3*i/10-.2)+1})),{A:1.8,b:0,k:3,phi:0,c:1});
	near(sinusoidal.params.k,3,1e-6);near(sinusoidal.params.A,2,1e-6);assert.equal(sinusoidal.converged,true);
	const result=h.run(`(() => {
		const expr=math.compile('A*x+c');
		const points=Array.from({length:8},(_,x)=>({x,y:0.00001*x+0.000002}));
		return PanPhyFitCore.solveCustomMultiStart(points,[[0,0]],PanPhyFitCore.buildCustomResidualFn(expr,['A','c']),PanPhyFitCore.buildCustomJacobianFn(expr,['A','c']));
	})()`);
	near(result.params[0],1e-5,1e-6);near(result.params[1],2e-6,1e-6);assert.equal(result.converged,true);
});
test('draft values are safely escaped when restored into table markup', () => {
	const {context:c}=harness();
	const html=c.buildDataRowHtml({xValue:'"><img src=x onerror=alert(1)>'});
	assert.ok(!html.includes('<img'));
	assert.ok(html.includes('&quot;&gt;&lt;img'));
});
test('partially rendered tables cannot overwrite complete saved data', () => {
	const h=harness();h.setRows([['1','2']]);
	h.run('rawData[0]=Array.from({length:1000},(_,x)=>({x,y:x*2}))');
	h.table.setAttribute('aria-busy','true');h.context.updateData();
	assert.equal(h.run('rawData[0].length'),1000);
});

test('CSV download contains exponent-aware values and unchanged scientific uncertainty', async () => {
	const h=harness();h.setRows([['0.001234','2','1e-5','']]);
	h.elements['x-column-name'].value='Time';h.elements['y-column-name'].value='Distance';h.elements['toggle-x-error'].checked=true;
	let csv='';h.context.saveBlobWithFallback=async blob=>{csv=await blob.text();};
	await h.context.exportCSV('check');
	assert.equal(csv,'Time,Distance,delta Time\n0.00123,2,1e-5\n');
});
test('formatted table keeps a processed-column pipe inside one header', () => {
	const h=harness();h.context.formatLabelForLatex=value=>value;h.setRows([['1','6']]);
	h.elements['x-column-name'].value='x | 1/x';h.elements['y-column-name'].value='y';
	const markdown=h.context.exportPlainText();
	assert.equal(h.context.parseMarkdownTableLine(markdown.split('\n')[0]).length,2);
	assert.equal(h.context.parseMarkdownTableLine(markdown.split('\n')[0])[0],'$x | 1/x$');
});
test('loading another dataset keeps its own custom fit parameter values', () => {
	const h=harness();
	h.elements['custom-fit-formula-input']=element('A*x');
	const outgoingInput=element('99');outgoingInput.setAttribute('data-param','A');
	h.elements['custom-fit-parameters-list']=element();
	h.elements['custom-fit-parameters-list'].querySelectorAll=()=>[outgoingInput];
	h.run("customFitStates={0:{formula:'A*x',initialValues:{A:'99'}},1:{formula:'A*x',initialValues:{A:'2'}}}; activeSet=1");
	h.context.loadCustomFitUiForActiveDataset();
	assert.equal(Number(h.run('customFitStates[1].initialValues.A')),2);
	assert.equal(h.run('customFitStates[0].initialValues.A'),'99');
});
test('processed data can replace the active dataset without restoring the old table', () => {
	const h=harness();h.setRows([['2','6']]);h.context.updateData();
	let source=fs.readFileSync(path.join(sourceDir,'data-processing.js'),'utf8');
	source=source.replace(/\}\)\(\);\s*$/, 'window.processingTest = { state, handleCopyToDataset }; })();');h.run(source);
	const process=h.context.processingTest;
	process.state.sourceRows=[{x:2,y:6}];
	process.state.derivedColumns=[{id:'one',name:'double',values:[4]}];
	h.elements['data-processing-output-x']=element('derived:one');
	h.elements['data-processing-output-y']=element('source:y');
	h.elements['data-processing-target']=element('dataset:0');
	h.context.switchDataset=(index,capture=true)=>{if(capture)h.context.updateData();};
	process.handleCopyToDataset();
	assert.equal(h.run('rawData[0][0].x'),4);
	assert.equal(h.run('rawData[0][0].y'),6);
	assert.equal(h.run('datasetDraftRows[0]'),undefined);
});
