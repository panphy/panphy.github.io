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
            console: {log() {}}, cancelFpsDetection() {}, disableControls() {}, detectedFpsDisplay: {}, fpsLabel: {}, fpsDetectionPending: false, isPlaying: false,
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
    const c = context({calibrateButton:{addEventListener:(_type,fn)=>click=fn},originMode:true,calibrationMode:false,calibrationStart:null,calibrationEnd:null,pauseVideo(){},showPickMode(){},cancelPickMode(){},overlayCanvas:{style:{}}});
    vm.runInContext(extract("calibrateButton.addEventListener('click'",'function startCalibrationDraw('),c);
    click(); assert.equal(c.originMode,false); assert.equal(c.calibrationMode,true);
});
test('insufficient velocity points produces empty velocity graph', () => {
    const axis=()=>({title:{},grid:{},ticks:{}});
    const c=context({currentPlotMode:'pos',getVelocityData:()=>({smoothed:[]}),document:{getElementById:()=>({})},dataPointColors:{vx:'blue',vy:'red'},scaleUnit:'m',positionChart:{data:{datasets:[]},options:{scales:{x:axis(),y:axis()}},update(){}},applyThemeToChart(){},updateActivePlotButton(){}});
    vm.runInContext(extract('function plotVelocity(mode)', '/* Plot controls */'),c);
    vm.runInContext("plotVelocity('x')",c);
    assert.equal(c.currentPlotMode,'vx'); assert.equal(c.positionChart.data.datasets[0].data.length,0);
    assert.equal(c.positionChart.options.scales.y.title.text,'Velocity (m/s)');
});

// Auto-tracking: a shaded, anti-aliased disc on a textured background, as an RGBA image.
function discImage(width, height, cx, cy, radius) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        let cover = 0;
        for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
            if (Math.hypot(x + (sx + 0.5) / 4 - 0.5 - cx, y + (sy + 0.5) / 4 - 0.5 - cy) <= radius) cover++;
        }
        cover /= 16;
        const shade = 1 - 0.4 * Math.hypot(x - cx + radius / 3, y - cy + radius / 3) / radius;
        const background = [200 + 20 * Math.sin(x / 7), 196 + 15 * Math.cos(y / 5), 188];
        const ball = [235 * shade, 90 * shade, 40 * shade];
        const i = (y * width + x) * 4;
        for (let c = 0; c < 3; c++) data[i + c] = background[c] * (1 - cover) + ball[c] * cover;
        data[i + 3] = 255;
    }
    return { data, width, height };
}
function trackingCore() {
    const c = context({ Math, Float32Array, Int32Array, Uint8Array });
    vm.runInContext(extract('/* ===== Auto-tracking: matching ===== */', '/* ===== Auto-tracking: runs ===== */'), c);
    return c;
}
test('auto-tracking finds the clicked object and its size', () => {
    const c = trackingCore();
    const blob = c.findBlob(discImage(120, 90, 50.3, 40.6, 9), 52, 42, 30);
    assert.ok(Math.abs(blob.x - 50.3) < 0.5 && Math.abs(blob.y - 40.6) < 0.5);
    assert.ok(Math.abs(blob.radius - 9) < 1.5);
    assert.equal(c.findBlob(discImage(120, 90, 50, 40, 9), 5, 5, 20), null);
});
test('auto-tracking matches a moved object to a fraction of a pixel', () => {
    const c = trackingCore();
    const template = c.cutTemplate(discImage(160, 120, 60, 50, 10), 60, 50, 13);
    const found = c.matchTemplate(discImage(160, 120, 71.4, 44.7, 10), template, 70, 46, 12);
    assert.ok(Math.abs(found.x - 71.4) < 0.3, `x ${found.x}`);
    assert.ok(Math.abs(found.y - 44.7) < 0.3, `y ${found.y}`);
    assert.ok(found.score > 0.9);
    const empty = discImage(160, 120, -100, -100, 10);
    assert.ok(c.matchTemplate(empty, template, 70, 46, 12).score < 0.6);
});
test('auto-tracking predicts with constant acceleration', () => {
    const c = trackingCore();
    const track = [0, 1, 2].map(n => ({ x: 10 + 5 * n, y: 100 - 20 * n + 3 * n * n }));
    const next = c.predictPosition(track);
    assert.equal(next.x, 25);
    assert.equal(next.y, 100 - 60 + 27);
});
test('auto-tracking flags a match held at the image edge', () => {
    const c = trackingCore();
    const template = c.cutTemplate(discImage(160, 120, 60, 50, 10), 60, 50, 13);
    assert.equal(c.matchTemplate(discImage(160, 120, 80, 50, 10), template, 80, 50, 8).atEdge, false);
    assert.equal(c.matchTemplate(discImage(160, 120, 150, 50, 10), template, 145, 50, 8).atEdge, true);
});
