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
    let output, exported = false;
    const c = context({frameData: [0,1,2,3,4].map(t => ({x:t*t, y:0, playbackTime:t})), getAnalysisTime:t=>t, scaleFactor:0.123456789, scaleUnit:'m,"test"', originSet:false,
        downloadFile: (_name, text) => output = text, clearUnsavedChanges: () => exported = true });
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
    assert.equal(exported, true);
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

test('FPS completion waits for the starting frame before enabling tracking', () => {
    for (const startTime of [0, 0.4, 2]) {
        let seeked, drawn = 0, cancelled = 0, disabled;
        const video = {currentTime: startTime, seeking: false,
            addEventListener: (_type, fn) => seeked = fn,
            removeEventListener: (_type, fn) => { if (seeked === fn) seeked = null; },
            cancelVideoFrameCallback: () => cancelled++};
        const c = context({hiddenVideo: video, playbackCallbackId: 42, fpsDetectionPending: false,
            detectedFps: null, playbackFrameRate: 30, captureFrameRate: 30, isSpecialRecording: false,
            frameRateHintButton: {hidden: true}, detectedFpsDisplay: {}, updateFpsButtonText() {}, slider: {}, getSliderStep: () => 1 / 30,
            pauseVideo: () => video.paused = true, updateTimeDisplay: t => { assert.equal(t, 0); },
            drawFrame: () => { assert.equal(video.currentTime, 0); drawn++; }, drawOverlay() {},
            disableControls: value => disabled = value, videoReady: true, frameData: [], sampleOpen: false,
            setMessage() {}, cancelFpsDetection() {}});
        vm.runInContext(extract('function applyDetectedFps(', 'function updateFpsButtonText('), c);
        c.applyDetectedFps(30);
        assert.equal(video.paused, true);
        assert.equal(cancelled, 1);
        assert.equal(video.currentTime, 0);
        if (startTime > 0) {
            assert.equal(disabled, true);
            assert.equal(drawn, 0);
            seeked();
        }
        assert.equal(drawn, 1);
        assert.equal(disabled, false);
        assert.equal(c.fpsDetectionPending, false);
        assert.equal(c.slider.value, '0');
    }
});

test('cancelling a pending rewind removes its stale callback', () => {
    let seeked;
    const c = context({hiddenVideo: {currentTime: 1, addEventListener: (_type, fn) => seeked = fn,
            removeEventListener: () => seeked = null}, playbackCallbackId: null,
        frameRateHintButton: {hidden: true}, detectedFpsDisplay: {}, updateFpsButtonText() {}, slider: {}, getSliderStep: () => .1,
        pauseVideo() {}, disableControls() {}, videoReady: true, frameData: [1],
        isSpecialRecording: false, cancelFpsDetection() {}});
    vm.runInContext(extract('function applyDetectedFps(', 'function updateFpsButtonText('), c);
    c.applyDetectedFps(30);
    assert.equal(typeof seeked, 'function');
    c.cancelFpsDetection();
    assert.equal(seeked, null);
    assert.equal(c.fpsDetectionPending, false);
});

test('clear video respects cancellation and releases the video before starting over', () => {
    for (const approved of [false, true]) {
        let click, reset = 0, unloaded = 0, revoked;
        const c = context({clearVideoButton: {addEventListener: (_type, fn) => click = fn},
            confirmDataLoss: () => approved, resetApp: () => reset++, pauseVideo() {},
            playbackCallbackId: null, hiddenVideo: {removeAttribute: name => assert.equal(name, 'src'), load: () => unloaded++},
            URL: {revokeObjectURL: url => revoked = url}, blobUrl: 'blob:old',
            sampleOpen: true, videoUploadInput: {value: 'old.mp4'}, videoName: {}, slider: {},
            updateTimeDisplay() {}, setMessage() {}, openVideoButton: {focus() {}}});
        vm.runInContext(extract("clearVideoButton.addEventListener('click'", 'clearDataPointsButton.addEventListener('), c);
        click();
        assert.equal(reset, Number(approved));
        assert.equal(unloaded, Number(approved));
        if (approved) {
            assert.equal(revoked, 'blob:old');
            assert.equal(c.blobUrl, null);
            assert.equal(c.sampleOpen, false);
            assert.equal(c.videoUploadInput.value, '');
            assert.equal(c.slider.value, '0');
            assert.equal(c.videoName.textContent, 'No video open');
        }
    }
});

test('rewinding redraws original pixels even if the video still exposes the detection frame', () => {
    const firstFrame = {pixels: 'first decoded frame'};
    const video = {readyState: 2, currentTime: 0, pixels: 'last FPS sampling frame'};
    let painted;
    const c = context({videoReady: true, hiddenVideo: video, startingFrame: firstFrame,
        frameCanvas: {width: 1280, height: 720}, crossesVisible: false,
        ctx: {clearRect() {}, drawImage: source => painted = source.pixels}});
    vm.runInContext(extract('function drawFrame()', '// A red cross;'), c);
    c.drawFrame();
    assert.equal(painted, 'first decoded frame');
    video.currentTime = 0.00001; // Frame-step and slider seeks land just inside the frame.
    c.drawFrame();
    assert.equal(painted, 'first decoded frame');
    video.currentTime = 1 / 30;
    video.pixels = 'second frame';
    c.drawFrame();
    assert.equal(painted, 'second frame');
    c.startingFrame = null;
    video.currentTime = 0;
    c.drawFrame();
    assert.equal(painted, 'second frame'); // No stale snapshot after reset.
});

function editingContext(points = []) {
    const c = context({frameData: structuredClone(points), undoHistory: [], redoHistory: [],
        videoReady: true, fpsDetectionPending: false, trackRun: null, selectedMarkTime: null,
        markUnsavedChanges() {}, renderPointRows() {}, replotCurrentView() {}, drawFrame() {}, setMessage() {}});
    vm.runInContext(extract('function rememberPoints()', 'function setSelectMarksMode('), c);
    vm.runInContext(extract('function deleteMark(', "selectMarksButton.addEventListener('click'"), c);
    return c;
}
test('deleting one auto-tracked mark, undoing the deletion and run, then redoing both preserves data', () => {
    const original = {x: 5, y: 10, playbackTime: 0};
    const c = editingContext([original]);
    c.rememberPoints(); // One snapshot before an entire auto-track run, including replaced marks.
    c.frameData = [0, 1, 2].map(t => ({x: t * 20, y: 30, playbackTime: t}));
    const run = JSON.stringify(c.frameData);
    c.deleteMark(1);
    assert.deepEqual(Array.from(c.frameData, p => p.playbackTime), [0, 2]);
    c.undoPoint();
    assert.equal(JSON.stringify(c.frameData), run);
    c.undoPoint();
    assert.equal(JSON.stringify(c.frameData), JSON.stringify([original]));
    c.redoPoint();
    assert.equal(JSON.stringify(c.frameData), run);
    c.redoPoint();
    assert.deepEqual(Array.from(c.frameData, p => p.playbackTime), [0, 2]);
});
test('new edits clear redo and history snapshots do not share mutable point objects', () => {
    const c = editingContext([{x: 1, y: 2, playbackTime: 0}]);
    c.rememberPoints();
    c.frameData[0].x = 99;
    c.undoPoint();
    assert.equal(c.frameData[0].x, 1);
    c.rememberPoints();
    c.frameData[0].y = 50;
    c.redoPoint();
    assert.equal(c.frameData[0].x, 1);
    assert.equal(c.redoHistory.length, 0);
    for (let i = 0; i < 110; i++) c.rememberPoints();
    assert.equal(c.undoHistory.length, 100);
});
test('history and deletion cannot modify an active auto-track run or pending video', () => {
    for (const blocked of [{trackRun: {}}, {fpsDetectionPending: true}, {videoReady: false}]) {
        const c = editingContext([{x: 1, y: 2, playbackTime: 0}]);
        c.rememberPoints();
        c.frameData.push({x: 3, y: 4, playbackTime: 1});
        c.undoPoint();
        Object.assign(c, blocked);
        c.redoPoint();
        c.undoPoint();
        c.deleteMark(0);
        assert.equal(c.frameData.length, 1);
        assert.equal(c.redoHistory.length, 1);
    }
});
test('mark selection uses a bounded hit area and resolves overlaps to the current frame', () => {
    const c = context({frameData: [
        {x: 10, y: 20, playbackTime: 0},
        {x: 10, y: 20, playbackTime: 1},
        {x: 40, y: 50, playbackTime: 2}], playbackFrameRate: 30, currentFrameIndex: () => 30});
    vm.runInContext(extract('function findMarkAt(', 'function selectMark('), c);
    assert.equal(c.findMarkAt(10, 20, 12).playbackTime, 1);
    assert.equal(c.findMarkAt(42, 50, 12).playbackTime, 2);
    assert.equal(c.findMarkAt(100, 100, 12), null);
});

test('history and deletion shortcuts work outside fields and leave typing shortcuts alone', () => {
    let keydown, action;
    const c = context({document: {addEventListener: (_type, callback) => keydown = callback, querySelector: () => null},
        trackRun: null, videoReady: true, fpsDetectionPending: false, selectedMarkTime: 1,
        undoPoint: () => action = 'undo', redoPoint: () => action = 'redo', deleteMark: time => action = time,
        selectMarksMode: false});
    vm.runInContext(extract("document.addEventListener('keydown', (e) =>", '\n\t\trenderPointRows();\n\t\tupdateActivePlotButton();'), c);
    for (const [key, modifiers, expected] of [
        ['z', {ctrlKey: true}, 'undo'], ['z', {metaKey: true}, 'undo'],
        ['Z', {ctrlKey: true, shiftKey: true}, 'redo'], ['z', {metaKey: true, shiftKey: true}, 'redo'],
        ['y', {ctrlKey: true}, 'redo'], ['Delete', {}, 1], ['Backspace', {}, 1]]) {
        for (const tagName of ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT']) {
            action = null;
            let prevented = false;
            keydown({key, ...modifiers, target: {tagName}, preventDefault: () => prevented = true});
            assert.equal(action, tagName === 'BUTTON' ? expected : null);
            assert.equal(prevented, tagName === 'BUTTON');
        }
    }
});

test('import reminder offers filming-rate settings for user clips, without treating samples as slow motion', () => {
    for (const sampleOpen of [false, true]) {
        const c = context({hiddenVideo: {currentTime: 0, seeking: false, removeEventListener() {}},
            playbackCallbackId: null, detectedFpsDisplay: {}, updateFpsButtonText() {},
            frameRateHintButton: {hidden: true}, messageEl: {}, slider: {}, getSliderStep: () => 1 / 30,
            pauseVideo() {}, updateTimeDisplay() {}, drawFrame() {}, drawOverlay() {}, disableControls() {},
            videoReady: true, frameData: [], sampleOpen, isSpecialRecording: false, cancelFpsDetection() {}});
        vm.runInContext(extract('function setMessage(', 'function formatNumber('), c);
        vm.runInContext(extract('function applyDetectedFps(', 'function updateFpsButtonText('), c);
        c.applyDetectedFps(30);
        assert.equal(c.frameRateHintButton.hidden, sampleOpen);
        assert.equal(c.captureFrameRate, 30);
        assert.equal(c.isSpecialRecording, false);
        if (!sampleOpen) assert.match(c.messageEl.textContent, /playback: 30 fps.*original filming rate/);
        c.setMessage('Scale set.');
        assert.equal(c.frameRateHintButton.hidden, true);
    }
});

test('Manual, Auto and Edit remain mutually exclusive, including repeated mode choices', () => {
    const button = () => ({attributes: {}, setAttribute(name, value) { this.attributes[name] = value; }});
    const c = context({autoTrackOn: false, selectMarksMode: false, selectedMarkTime: 1,
        manualModeButton: button(), autoTrackToggle: button(), selectMarksButton: button(),
        hideCrossesToggle: button(), frameCanvas: {classList: {toggle() {}}, setAttribute() {}},
        stopAutoTrack() {}, cancelPickMode() {}, pauseVideo() {}, highlightCurrentRow() {},
        updateStatusBar() {}, drawFrame() {}, setMessage() {}});
    vm.runInContext(extract('function setSelectMarksMode(', '// Distances are in canvas pixels;'), c);
    vm.runInContext(extract('function setTrackingMode(', "selectMarksButton.addEventListener('click'"), c);
    for (const mode of ['auto', 'edit', 'auto', 'auto', 'manual', 'edit', 'manual']) {
        c.setTrackingMode(mode);
        const pressed = [c.manualModeButton, c.autoTrackToggle, c.selectMarksButton]
            .map(control => control.attributes['aria-pressed']);
        assert.deepEqual(pressed, ['manual', 'auto', 'edit'].map(value => String(value === mode)));
        assert.equal(c.autoTrackOn, mode === 'auto');
        assert.equal(c.selectMarksMode, mode === 'edit');
        assert.equal(c.selectedMarkTime, null);
    }
});

test('Delete appears only for a selected mark and stays unavailable during tracking', () => {
    const control = () => ({});
    const c = context({frameData: [{playbackTime: 1}], videoReady: true, fpsDetectionPending: false,
        trackRun: null, selectedMarkTime: null, undoHistory: [], redoHistory: [],
        document: {getElementById: control, querySelectorAll: () => []}, isCalibrated: () => false,
        originSet: false, clearDataPointsButton: control(), clearCalibrationButton: control(),
        clearOriginButton: control(), clearVideoButton: control(), exportDataButton: control(),
        exportPanPhyPlotButton: control(), undoPointButton: control(), redoPointButton: control(),
        selectMarksButton: control(), deleteSelectedButton: control()});
    vm.runInContext(extract('function updateStatusBar()', '/* ===== Auto-tracking: matching ===== */'), c);
    c.updateStatusBar();
    assert.equal(c.deleteSelectedButton.hidden, true);
    c.selectedMarkTime = 1;
    c.updateStatusBar();
    assert.equal(c.deleteSelectedButton.hidden, false);
    assert.equal(c.deleteSelectedButton.disabled, false);
    c.trackRun = {};
    c.updateStatusBar();
    assert.equal(c.deleteSelectedButton.disabled, true);
    c.selectedMarkTime = null;
    c.updateStatusBar();
    assert.equal(c.deleteSelectedButton.hidden, true);
});
