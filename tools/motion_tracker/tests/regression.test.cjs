const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../../motion_tracker.html'), 'utf8');
function extract(start, end) { const i = html.indexOf(start); return html.slice(i, html.indexOf(end, i)); }
function context(values) { return vm.createContext(values); }
test('all inline scripts parse', () => {
    for (const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
});
test('FPS selects closest standard rate and cancels callbacks', () => {
    for (const rate of [24, 25, 29.97, 30, 59.94, 60, 120, 240]) {
        let callback, detected;
        const c = context({ hiddenVideo: { playbackRate: 1, requestVideoFrameCallback: fn => (callback = fn, 1), cancelVideoFrameCallback() {}, currentTime: 0, play: () => ({ then: () => ({ catch() {} }) }), pause() {} },
            console: {log() {}}, cancelFpsDetection() {}, disableControls() {}, detectedFpsDisplay: {}, frameRateButton: {}, fpsDetectionPending: false, isPlaying: false,
            setTimeout: () => 1, clearTimeout() {}, applyDetectedFps: fps => detected = fps });
        vm.runInContext(extract('function detectFrameRate()', 'function applyDetectedFps('), c);
        vm.runInContext('detectFrameRate()', c);
        for (let i = 0; i < 11; i++) callback(0, {mediaTime: i / rate});
        assert.equal(detected, rate);
        assert.equal(c.hiddenVideo.playbackRate, 1);
        assert.equal(c.fpsDetectionPending, false);
    }
});
test('velocity graph and CSV share full precision values and midpoint times', () => {
    let output;
    const c = context({frameData: [0,1,2,3,4].map(t => ({x:t*t, y:0, playbackTime:t})), getAnalysisTime:t=>t, scaleFactor:0.123456789, scaleUnit:'m,"test"', originSet:false,
        downloadFile: (_name, text) => output = text });
    vm.runInContext(extract('function getVelocityData()', 'function downloadFile('), c);
    vm.runInContext(extract('function exportCSV(', '/* Drawing */'), c);
    const result = vm.runInContext('getVelocityData()', c);
    assert.equal(result.raw[0].time, .5);
    assert.equal(result.smoothed[0].time, 1.5);
    assert.ok(Math.abs(result.smoothed[0].x - 3 * c.scaleFactor) < 1e-12);
    vm.runInContext("exportCSV('test.csv')", c);
    assert.ok(output.includes('0.123456789'));
    assert.ok(output.includes('m,""test""'));
    assert.ok(output.includes('Smoothed velocity time'));
});
test('normal analysis time preserves precision; slow motion scales time', () => {
    const c=context({playbackFrameRate:30,captureFrameRate:30});
    vm.runInContext(extract('function getAnalysisTime(', 'function updateTimeDisplay('),c);
    assert.equal(vm.runInContext('getAnalysisTime(0.0123456789)',c),0.0123456789);
    c.captureFrameRate=240;
    assert.equal(vm.runInContext('getAnalysisTime(1)',c),0.125);
});
test('starting calibration cancels origin selection', () => {
    let click;
    const c = context({calibrateButton:{addEventListener:(_type,fn)=>click=fn},originMode:true,hiddenVideo:{pause(){}},isPlaying:true,playPauseButton:{},document:{getElementById:()=>({style:{}})},overlayCanvas:{style:{}},frameCanvas:{style:{}}});
    vm.runInContext(extract("calibrateButton.addEventListener('click'",'function startCalibrationDraw('),c);
    click(); assert.equal(c.originMode,false); assert.equal(c.calibrationMode,true);
});
test('insufficient velocity points produces empty velocity graph', () => {
    const axis=()=>({title:{},grid:{},ticks:{}});
    const c=context({currentPlotMode:'pos',getVelocityData:()=>({smoothed:[]}),document:{getElementById:()=>({})},dataPointColors:{vx:'blue',vy:'red'},scaleUnit:'m',positionChart:{data:{datasets:[]},options:{scales:{x:axis(),y:axis()}},update(){}},applyThemeToChart(){},updateActivePlotButton(){}});
    vm.runInContext(extract('function plotVelocity(mode)', 'plotXButton.addEventListener'),c);
    vm.runInContext("plotVelocity('x')",c);
    assert.equal(c.currentPlotMode,'vx'); assert.equal(c.positionChart.data.datasets[0].data.length,0);
    assert.equal(c.positionChart.options.scales.y.title.text,'Velocity (m/s)');
});
