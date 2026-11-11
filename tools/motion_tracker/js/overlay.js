import {
	actualLengthInput,
	actualUnitInput,
	calibrateButton,
	calibrationPrompt,
	cancelCalibrationButton,
	ctx,
	frameCanvas,
	hiddenVideo,
	hideCrossesToggle,
	messageBar,
	modeCancelButton,
	overlayCanvas,
	overlayCtx,
	rulerButton,
	setOriginButton
} from './dom.js';
import { renderPointRows, setSelectMarksMode } from './points.js';
import {
	closeDialog,
	formatNumber,
	markUnsavedChanges,
	openDialog,
	rejectField,
	setMessage
} from './ui.js';
import { state } from './state.js';
import { replotCurrentView } from './plot.js';
import { currentFrameIndex, fitVideoStage, pauseVideo } from './video.js';
import { BODY_FONT, getCssVar } from './theme.js';
import { isCalibrated, unitLabel } from './analysis.js';

function canvasYToCartesianY(y) { return frameCanvas.height - y; }

function cartesianYToCanvasY(y) { return frameCanvas.height - y; }

// Marks and labels keep the same size on screen whatever the video's resolution.
function getVisualScale() {
	const shownWidth = frameCanvas.getBoundingClientRect().width;
	if (!frameCanvas.width || !shownWidth) return 1;
	return frameCanvas.width / shownWidth;
}

function showPickMode(text) {
	setSelectMarksMode(false);
	messageBar.classList.add('is-mode');
	modeCancelButton.hidden = false;
	setMessage(text);
	// The ruler changes nothing, so there is nothing to cancel: it is put away.
	modeCancelButton.textContent = state.rulerMode ? 'Done' : 'Cancel';
	calibrateButton.setAttribute('aria-pressed', String(state.calibrationMode));
	setOriginButton.setAttribute('aria-pressed', String(state.originMode));
	rulerButton.setAttribute('aria-pressed', String(state.rulerMode));
}

function hidePickMode() {
	messageBar.classList.remove('is-mode');
	modeCancelButton.hidden = true;
	calibrateButton.setAttribute('aria-pressed', 'false');
	setOriginButton.setAttribute('aria-pressed', 'false');
	rulerButton.setAttribute('aria-pressed', 'false');
}

// The scale line and the ruler are drawn the same way: drag from end to end, or click each end.
function lineTool() {
	return state.rulerMode ? 'ruler' : (state.calibrationMode ? 'calibration' : null);
}

function getLine(tool) {
	return tool === 'ruler' ? [state.rulerStart, state.rulerEnd] : [state.calibrationStart, state.calibrationEnd];
}

function setLine(tool, start, end) {
	if (tool === 'ruler') { state.rulerStart = start; state.rulerEnd = end; }
	else { state.calibrationStart = start; state.calibrationEnd = end; }
}

function lineLength(start, end) {
	return start && end ? Math.hypot(end.x - start.x, end.y - start.y) : 0;
}

function closeRuler() {
	state.rulerMode = false;
	state.rulerStart = null;
	state.rulerEnd = null;
}

function restorePreviousCalibration() {
	if (!state.previousCalibration) return;
	state.calibrationStart = state.previousCalibration.start;
	state.calibrationEnd = state.previousCalibration.end;
	state.previousCalibration = null;
}

function cancelPickMode() {
	if (!state.calibrationMode && !state.originMode && !state.rulerMode) return;
	const wasCalibrating = state.calibrationMode, wasMeasuring = state.rulerMode;
	if (state.calibrationMode) restorePreviousCalibration();
	closeRuler();
	state.calibrationMode = false;
	state.isDrawingLine = false;
	state.lineAnchored = false;
	state.originMode = false;
	state.originGuide = null;
	state.originPointerDown = false;
	overlayCanvas.style.pointerEvents = "none";
	hidePickMode();
	drawOverlay();
	setMessage(wasMeasuring ? 'Ruler put away.' : (wasCalibrating ? 'Scale unchanged.' : 'Origin unchanged.'));
}

function finalizeOriginSelection(canvasX, canvasY) {
	const cartesianY = canvasYToCartesianY(canvasY);
	state.originPoint = { x: canvasX, y: cartesianY };
	state.originSet = true;
	markUnsavedChanges();
	state.originMode = false;
	state.originGuide = null;
	state.originPointerDown = false;
	overlayCanvas.style.pointerEvents = "none";
	hidePickMode();
	drawOverlay();
	replotCurrentView();
	renderPointRows();
	setMessage("Origin set. Positions are now measured from it.");
}

/* Drawing */
function resizeOverlay() {
	overlayCanvas.width = frameCanvas.width;
	overlayCanvas.height = frameCanvas.height;
}

function drawFrame() {
	if (!state.videoReady || hiddenVideo.readyState < 2) return;
	ctx.clearRect(0, 0, frameCanvas.width, frameCanvas.height);
	// Some browsers retain the sampling frame's pixels after seeking to zero.
	// Use the first decoded frame there, including the tiny frame-step seek offset.
	const source = state.startingFrame && hiddenVideo.currentTime < 0.00002
		? state.startingFrame : hiddenVideo;
	ctx.drawImage(source, 0, 0, frameCanvas.width, frameCanvas.height);

	// Only draw data points if crosses are visible
	if (state.crossesVisible) {
		const s = getVisualScale();
		const frame = currentFrameIndex();
		state.frameData.forEach((p) => {
			const current = Math.round(p.playbackTime * state.playbackFrameRate) === frame;
			drawDataPoint(p.x, cartesianYToCanvasY(p.y), s, current, p.playbackTime === state.selectedMarkTime);
		});
	}
}

// A red cross; a white ring marks the current frame, a larger cyan ring marks selection.
function drawDataPoint(x, y, s = 1, current = false, selected = false) {
	const circleRadius = 4 * s;
	const crossSize = 8 * s;
	const lineWidth = Math.max(1, 1.6 * s);

	ctx.fillStyle = 'rgba(255,0,0,.3)';
	ctx.beginPath();
	ctx.arc(x, y, circleRadius, 0, 2 * Math.PI);
	ctx.fill();

	ctx.strokeStyle = 'red';
	ctx.lineWidth = lineWidth;
	ctx.beginPath();
	ctx.moveTo(x - crossSize, y);
	ctx.lineTo(x + crossSize, y);
	ctx.moveTo(x, y - crossSize);
	ctx.lineTo(x, y + crossSize);
	ctx.stroke();

	if (current || selected) {
		ctx.strokeStyle = selected ? '#00e5ff' : 'white';
		ctx.lineWidth = Math.max(1, 2 * s);
		ctx.beginPath();
		ctx.arc(x, y, crossSize + (selected ? 6 : 3) * s, 0, 2 * Math.PI);
		ctx.stroke();
	}
}

function drawAxes(originCanvasX, originCanvasY, s, color) {
	overlayCtx.save();
	overlayCtx.lineWidth = 1.5 * s;
	overlayCtx.shadowColor = getCssVar('--overlay-shadow') || 'black';
	overlayCtx.shadowBlur = 3 * s;
	overlayCtx.strokeStyle = color;
	overlayCtx.beginPath();
	overlayCtx.moveTo(0, originCanvasY);
	overlayCtx.lineTo(overlayCanvas.width, originCanvasY);
	overlayCtx.moveTo(originCanvasX, 0);
	overlayCtx.lineTo(originCanvasX, overlayCanvas.height);
	overlayCtx.stroke();
	overlayCtx.restore();
}

function drawOverlayLabel(text, x, y, s) {
	overlayCtx.save();
	overlayCtx.font = `600 ${12 * s}px ${BODY_FONT}`;
	const width = overlayCtx.measureText(text).width + 12 * s;
	const height = 20 * s;
	const left = Math.min(Math.max(x - width / 2, 2 * s), overlayCanvas.width - width - 2 * s);
	const top = Math.min(Math.max(y - height - 8 * s, 2 * s), overlayCanvas.height - height - 2 * s);
	overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
	overlayCtx.beginPath();
	if (overlayCtx.roundRect) overlayCtx.roundRect(left, top, width, height, height / 2);
	else overlayCtx.rect(left, top, width, height);
	overlayCtx.fill();
	overlayCtx.fillStyle = 'white';
	overlayCtx.textAlign = 'center';
	overlayCtx.textBaseline = 'middle';
	overlayCtx.fillText(text, left + width / 2, top + height / 2);
	overlayCtx.restore();
}

function drawOverlay() {
	resizeOverlay();
	overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
	if (!state.videoReady) return;

	// Dynamic scaling factors
	const s = getVisualScale();
	const originRadius = 5 * s;

	// The patch being followed while auto-tracking runs.
	if (state.trackRun && state.trackRun.box) {
		const { x, y, half } = state.trackRun.box;
		overlayCtx.save();
		overlayCtx.lineWidth = 2 * s;
		overlayCtx.strokeStyle = '#22d3ee';
		overlayCtx.shadowColor = 'black';
		overlayCtx.shadowBlur = 2;
		overlayCtx.setLineDash([6 * s, 4 * s]);
		overlayCtx.strokeRect(x - half, y - half, 2 * half, 2 * half);
		overlayCtx.restore();
	}
	const axisColor = getCssVar('--overlay-axis') || 'white';

	const ox = state.originSet ? state.originPoint.x : 0;
	const oy = state.originSet ? state.originPoint.y : 0;
	const originCanvasX = ox;
	const originCanvasY = cartesianYToCanvasY(oy);

	// While choosing the origin, the axes follow the pointer.
	if (state.originMode && state.originGuide) {
		drawAxes(state.originGuide.x, state.originGuide.y, s, '#22d3ee');
		overlayCtx.fillStyle = "#22d3ee";
		overlayCtx.beginPath();
		overlayCtx.arc(state.originGuide.x, state.originGuide.y, originRadius, 0, 2 * Math.PI);
		overlayCtx.fill();
	} else {
		drawAxes(originCanvasX, originCanvasY, s, axisColor);
		overlayCtx.fillStyle = "cyan";
		overlayCtx.beginPath();
		overlayCtx.arc(originCanvasX, originCanvasY, originRadius, 0, 2 * Math.PI);
		overlayCtx.fill();
	}

	drawMeasureLine(state.calibrationStart, state.calibrationEnd, s, 'orange', true, state.calibrationMode,
		isCalibrated() && !state.calibrationMode ? `${formatNumber(lineLength(state.calibrationStart, state.calibrationEnd) * state.scaleFactor)} ${state.scaleUnit}` : '');
	drawMeasureLine(state.rulerStart, state.rulerEnd, s, '#a3e635', false, state.rulerMode,
		`${formatNumber(lineLength(state.rulerStart, state.rulerEnd) * state.scaleFactor)} ${unitLabel()}`);
}

// A line with a tick across each end. While only the first end is placed, a dot marks it.
function drawMeasureLine(start, end, s, color, dashed, active, label) {
	if (!start || !end) return;
	const length = lineLength(start, end);
	overlayCtx.save();
	overlayCtx.lineWidth = 2 * s;
	overlayCtx.strokeStyle = color;
	overlayCtx.fillStyle = color;
	overlayCtx.shadowColor = "black";
	overlayCtx.shadowBlur = 2;
	if (length > 0) {
		if (dashed) overlayCtx.setLineDash([5 * s, 5 * s]);
		overlayCtx.beginPath();
		overlayCtx.moveTo(start.x, start.y);
		overlayCtx.lineTo(end.x, end.y);
		overlayCtx.stroke();
		overlayCtx.setLineDash([]);
		const nx = -(end.y - start.y) / length * 6 * s;
		const ny = (end.x - start.x) / length * 6 * s;
		overlayCtx.beginPath();
		[start, end].forEach(p => {
			overlayCtx.moveTo(p.x - nx, p.y - ny);
			overlayCtx.lineTo(p.x + nx, p.y + ny);
		});
		overlayCtx.stroke();
	}
	if (active && (length === 0 || state.lineAnchored)) {
		overlayCtx.beginPath();
		overlayCtx.arc(start.x, start.y, 4 * s, 0, 2 * Math.PI);
		overlayCtx.fill();
	}
	overlayCtx.restore();
	if (length > 0 && label) drawOverlayLabel(label, (start.x + end.x) / 2, Math.min(start.y, end.y), s);
}

// The first end follows the press; with one end already clicked, the press places the other.
function startLineDraw(tool, p) {
	state.isDrawingLine = true;
	setLine(tool, state.lineAnchored ? getLine(tool)[0] : p, p);
	drawOverlay();
}

function updateLineDraw(tool, p) {
	setLine(tool, getLine(tool)[0], p);
	drawOverlay();
}

function endLineDraw(tool) {
	if (!state.isDrawingLine) return;
	state.isDrawingLine = false;
	const [start, end] = getLine(tool);
	const pxLen = lineLength(start, end);
	// A click rather than a drag: that end is set, and the next click sets the other.
	if (pxLen < 4 * getVisualScale()) {
		state.lineAnchored = true;
		setLine(tool, start, start);
		drawOverlay();
		setMessage("First end set. Click the other end.");
		return;
	}
	state.lineAnchored = false;
	if (tool === 'ruler') {
		drawOverlay();
		setMessage(`Length: ${formatNumber(pxLen * state.scaleFactor)} ${unitLabel()}.${isCalibrated() ? '' : ' Set the scale to measure in real units.'} Measure again, or choose Done.`);
		return;
	}
	state.calibrationMode = false;
	overlayCanvas.style.pointerEvents = "none";
	hidePickMode();
	setMessage("Enter the real length of the line.");
	document.getElementById('calibrationPixels').textContent = `The line is ${formatNumber(pxLen)} pixels long.`;
	actualLengthInput.value = '';
	actualUnitInput.value = isCalibrated() ? state.scaleUnit : 'm';
	openDialog(calibrationPrompt);
	actualLengthInput.focus();
}

function overlayPoint(event) {
	const r = overlayCanvas.getBoundingClientRect();
	return {
		x: (event.clientX - r.left) * (overlayCanvas.width / r.width),
		y: (event.clientY - r.top) * (overlayCanvas.height / r.height)
	};
}

function toggleCrossesVisibility() {
	if (state.selectMarksMode || state.selectedMarkTime !== null) setSelectMarksMode(false);
	state.crossesVisible = !state.crossesVisible;
	hideCrossesToggle.setAttribute('aria-pressed', String(!state.crossesVisible));
	// Pressed while the marks are hidden; the eye is then struck through.
	hideCrossesToggle.setAttribute('aria-label', state.crossesVisible ? 'Hide marks' : 'Show marks');
	drawFrame();
}

function handleCalibrationStart() {
	if (state.calibrationMode) { cancelPickMode(); return; }
	state.originMode = false;
	state.originGuide = null;
	closeRuler();
	pauseVideo();
	state.previousCalibration = { start: state.calibrationStart, end: state.calibrationEnd };
	state.calibrationMode = true;
	state.isDrawingLine = false;
	state.lineAnchored = false;
	overlayCanvas.style.pointerEvents = "auto";
	drawOverlay();
	showPickMode("Drag along something of known length, such as a meter rule, or click one end and then the other.");
}

function handleRulerToggle() {
	if (state.rulerMode) { cancelPickMode(); return; }
	if (state.calibrationMode) restorePreviousCalibration();
	state.calibrationMode = false;
	state.originMode = false;
	state.originGuide = null;
	state.originPointerDown = false;
	pauseVideo();
	state.rulerMode = true;
	state.isDrawingLine = false;
	state.lineAnchored = false;
	overlayCanvas.style.pointerEvents = "auto";
	drawOverlay();
	showPickMode(`Ruler: drag along a length, or click one end and then the other.${isCalibrated() ? '' : ' Lengths are in pixels until you set the scale.'}`);
}

function initializeOverlay() {
	modeCancelButton.addEventListener('click', cancelPickMode);

	window.addEventListener('resize', () => {
		fitVideoStage();
		drawOverlay();
		drawFrame();
	});

	calibrateButton.addEventListener('click', handleCalibrationStart);

	rulerButton.addEventListener('click', handleRulerToggle);

	overlayCanvas.addEventListener('pointerdown', (event) => {
		const tool = lineTool();
		if (!tool && !state.originMode) return;
		if (event.button !== undefined && event.button > 0) return;
		event.preventDefault();
		overlayCanvas.setPointerCapture?.(event.pointerId);
		const p = overlayPoint(event);
		if (tool) {
			startLineDraw(tool, p);
		} else {
			state.originPointerDown = true;
			state.originGuide = p;
			drawOverlay();
		}
	});

	overlayCanvas.addEventListener('pointermove', (event) => {
		const p = overlayPoint(event);
		const tool = lineTool();
		// With one end clicked, the line follows the pointer to the other.
		if (tool && (state.isDrawingLine || state.lineAnchored)) {
			updateLineDraw(tool, p);
		} else if (state.originMode) {
			state.originGuide = p;
			drawOverlay();
		}
	});

	overlayCanvas.addEventListener('pointerup', (event) => {
		const tool = lineTool();
		if (tool) {
			endLineDraw(tool);
		} else if (state.originMode && state.originPointerDown) {
			const p = overlayPoint(event);
			finalizeOriginSelection(p.x, p.y);
		}
	});

	overlayCanvas.addEventListener('pointercancel', () => {
		const tool = lineTool();
		if (tool && state.isDrawingLine) {
			state.isDrawingLine = false;
			state.lineAnchored = false;
			if (tool === 'ruler') setLine(tool, null, null);
			else setLine(tool, state.previousCalibration ? state.previousCalibration.start : null, state.previousCalibration ? state.previousCalibration.end : null);
		}
		state.originPointerDown = false;
		drawOverlay();
	});

	overlayCanvas.addEventListener('pointerleave', () => {
		const tool = lineTool();
		if (tool && state.lineAnchored && !state.isDrawingLine) {
			setLine(tool, getLine(tool)[0], getLine(tool)[0]);
			drawOverlay();
		} else if (state.originMode && !state.originPointerDown) {
			state.originGuide = null;
			drawOverlay();
		}
	});

	calibrationPrompt.querySelector('form').addEventListener('submit', (event) => {
		event.preventDefault();
		const actualLength = parseFloat(actualLengthInput.value);
		const actualUnit = actualUnitInput.value.trim();
		if (!Number.isFinite(actualLength) || actualLength <= 0) { rejectField(actualLengthInput, "Enter a length greater than zero."); return; }
		if (!actualUnit) { rejectField(actualUnitInput, "Enter a unit, such as m or cm."); return; }
		if (!state.calibrationStart || !state.calibrationEnd) { closeDialog(calibrationPrompt); setMessage('Draw a scale line first.'); return; }
		const dx = state.calibrationEnd.x - state.calibrationStart.x,
			dy = state.calibrationEnd.y - state.calibrationStart.y;
		const pxLen = Math.hypot(dx, dy);
		if (pxLen === 0) { closeDialog(calibrationPrompt); setMessage("The scale line has no length. Draw it again."); return; }
		state.scaleFactor = actualLength / pxLen;
		state.scaleUnit = actualUnit;
		state.previousCalibration = null;
		markUnsavedChanges();
		closeDialog(calibrationPrompt);
		drawOverlay();
		drawFrame();
		renderPointRows();
		replotCurrentView();
		setMessage(`Scale set: 1 pixel = ${formatNumber(state.scaleFactor)} ${state.scaleUnit}.`);
	});

	cancelCalibrationButton.addEventListener('click', () => {
		closeDialog(calibrationPrompt);
		state.calibrationMode = false;
		state.isDrawingLine = false;
		restorePreviousCalibration();
		drawOverlay();
		drawFrame();
		setMessage("Scale unchanged.");
	});

	setOriginButton.addEventListener('click', () => {
		if (state.originMode) { cancelPickMode(); return; }
		if (state.calibrationMode) {
			restorePreviousCalibration();
			state.calibrationMode = false;
		}
		closeRuler();
		state.isDrawingLine = false;
		state.lineAnchored = false;
		pauseVideo();
		state.originMode = true;
		state.originGuide = null;
		overlayCanvas.style.pointerEvents = "auto";
		drawOverlay();
		showPickMode("Click where x and y should be zero. On a touch screen, slide to the spot and let go.");
	});

	hideCrossesToggle.addEventListener('click', toggleCrossesVisibility);
}

export {
	canvasYToCartesianY,
	getVisualScale,
	hidePickMode,
	cancelPickMode,
	resizeOverlay,
	drawFrame,
	drawOverlay,
	toggleCrossesVisibility,
	initializeOverlay
};
