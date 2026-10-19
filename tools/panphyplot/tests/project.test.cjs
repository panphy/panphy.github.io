const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const project = require('../js/project.js');
const model = require('../js/model.js');
const math = require('../js/vendor/math.min.js');

function example() {
	const state = model.createState();
	const sheet = state.sheets[0];
	sheet.name = 'Experiment';
	sheet.columns[0].cells = ['1.00', '2', '3', '1e'];
	sheet.columns[1].cells = ['3', '5', '7', ''];
	sheet.columns[0].fitSymbol = 't_1';
	sheet.title = {text: 'My graph', automatic: false};
	sheet.graphView = {xaxis: [-1, 5], yaxis: [0, 10]};
	const ids = model.createIdSource(state);
	sheet.columns.push(model.createColumn(ids.next('c'), {name:'Processed',role:'Y',formula:'B^2',cells:['9','25','49','']}));
	sheet.columns.push(model.createColumn(ids.next('c'), {name:'Uncertainty',role:'yErr',errorType:'percentage',cells:['5','5','5','']}));
	sheet.hiddenSeries = [sheet.columns[2].id];
	const key = `${sheet.id}:${sheet.columns[1].id}`;
	state.fits[key] = {equation: 'y = 2x + 1', rSquared: '1.00000', residuals: [{x: 1, y: 0}], parameters: [{name: 'm', value: 2, uncertainty: 0}], stale: false, choice: {kind:'basic',method:'Linear'}};
	state.curves[key] = {x:[1,3], y:[3,7], dataRange:[1,3], samples:2, model:{kind:'linear',params:[2,1]}};
	state.extents[key] = {from:-1,to:5};
	state.customFits[key] = {formula:'A*x+c',initialValues:{A:'2',c:'1'},bounds:{A:{min:'0',max:'5'}}};
	state.sheets.push(model.createSheet(model.createIdSource(state), 'Second'));
	state.activeSheet = 1;
	state.latexMode = state.showResiduals = state.weightFits = true;
	state.equationDecimals = 5;
	return state;
}

test('project round trip preserves all sheets, drafts, graph settings, fits and controls', () => {
	const state = model.normalizeState(example());
	const view = {fitTab:'AdvancedFit',fields:{'advanced-fit-method':'Gaussian','initial-sigma':'0.1'}};
	const restored = project.decode(project.encode(state, view), model);
	assert.deepEqual(restored, {state:model.normalizeState(state),view});
	const evaluator = project.createEvaluator(Object.values(restored.state.curves)[0].model, math);
	assert.equal(evaluator(-1), -1);
	assert.equal(evaluator(5), 11);
});

test('invalid, unsupported and malformed projects fail without modifying current data', () => {
	const current = example(), before = JSON.stringify(current);
	const valid = JSON.parse(project.encode(current));
	for (const input of ['x,y\n1,2', '{}', '{"format":"PanPhyPlot","version":99}', JSON.stringify({...valid,state:{sheets:[]}}), '{"format":"PanPhyPlot","version":1,"state":{"__proto__":{}}}']) {
		assert.throws(()=>project.decode(input,model));
	}
	for (const mutate of [p=>p.state.sheets[0].rowCount=1e12, p=>p.state.sheets[0].columns[0].cells=[{}], p=>p.state.fits[Object.keys(p.state.fits)[0]].parameters={}, p=>p.state.curves[Object.keys(p.state.curves)[0]].y=['bad'], p=>p.state.curves[Object.keys(p.state.curves)[0]].dataRange=['a','b']]) {
		const corrupt = JSON.parse(JSON.stringify(valid)); mutate(corrupt);
		assert.throws(()=>project.decode(JSON.stringify(corrupt),model));
	}
	assert.equal(JSON.stringify(current),before);
});

test('all saved model kinds evaluate with original full-precision parameters', () => {
	const cases = [
		[{kind:'linear',params:[2,1]},3,7],
		[{kind:'polynomial',params:[2,3,4],mean:1e6,spread:0.01},1e6,4],
		[{kind:'exponential',params:[2,-0.5,3],reference:10},10,5],
		[{kind:'power',params:[2,2,1,3]},4,21],
		[{kind:'sinusoidal',params:[2,0,Math.PI/2,0,1]},1,3],
		[{kind:'gaussian',params:[2,4,0.5,1]},4,3],
		[{kind:'custom',formula:'A*exp(-k*x)+c',names:['A','k','c'],params:[2,0.5,1]},0,3],
		[{kind:'custom',formula:'a*sign(x)',names:['a'],params:[2]},-1,-2]
	];
	for(const [saved,x,y] of cases) assert.ok(Math.abs(project.createEvaluator(saved,math)(x)-y)<1e-10,saved.kind);
	const legacy = project.inferModel({choice:{method:'Linear'}},{x:[1,3],y:[3,7]});
	assert.equal(project.createEvaluator(legacy,math)(10),21);
});

test('project expressions cannot execute assignments, property access or imports', () => {
	for (const formula of ['a=2', 'x.constructor', 'import(x)', 'evaluate(x)', 'a*x;2', 'a*parse("2")']) {
		assert.throws(()=>project.createEvaluator({kind:'custom',formula,names:['a'],params:[2]},math),formula);
	}
});

function browserHarness() {
	const saved = new Map();
	const elements = {};
	const context = {console, PanPhyPlotModel:model, PanPhyPlotProject:project, math,
		localStorage:{getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)},
		addEventListener(){},setTimeout(){},clearTimeout(){},
		document:{addEventListener(){},getElementById:id=>elements[id]||={value:'',style:{},dataset:{},options:[],classList:{add(){},remove(){}}},querySelector:()=>null,querySelectorAll:()=>[{classList:{add(){}}}]},
		closePopup(){},forceReplot(){},switchSheet(){},updateBasicFitEquation(){},changeAdvancedFitMethod(){},openTab(){},renderActiveFitResult(){}};
	context.window=context;vm.createContext(context);
	for (const file of ['state.js','project.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file),'utf8'),context);
	const run=code=>vm.runInContext(code,context);
	run('loadState()');
	return {context,saved,run};
}

test('opening replaces sheets atomically, clears stale fit functions and resumes extensions', () => {
	const h=browserHarness();
	h.context.candidate=project.decode(project.encode(example()),model);
	h.run('fitFunctions.obsolete=()=>999; fitEpochs.pending=4; commitProject(candidate)');
	assert.equal(h.run('fitEpochs.pending'),5);
	assert.equal(h.run('plotState.sheets.length'),2);
	assert.equal(h.run('plotState.activeSheet'),1);
	assert.equal(h.run('fitFunctions.obsolete'),undefined);
	assert.equal(h.run('fitFunctions[Object.keys(fittedCurves)[0]](10)'),21);
	assert.equal(JSON.parse(h.saved.get('panphyplot-neo-state-v1')).sheets.length,2);
});

test('storage failure and other-tab conflict leave the open project untouched', () => {
	const h=browserHarness();
	h.context.candidate=project.decode(project.encode(example()),model);
	const before=h.run('JSON.stringify(buildPersistedState())');
	h.context.localStorage.setItem=()=>{throw Error('Quota exceeded');};
	assert.throws(()=>h.run('commitProject(candidate)'),/Quota/);
	assert.equal(h.run('JSON.stringify(buildPersistedState())'),before);
	h.run('changedElsewhere=true');
	assert.throws(()=>h.run('commitProject(candidate)'),/other-tab/);
	assert.equal(h.run('JSON.stringify(buildPersistedState())'),before);
});
