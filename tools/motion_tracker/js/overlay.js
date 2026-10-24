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
import { isCalibrated } from './analysis.js';

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
	calibrateButton.setAttribute('aria-pressed', String(state.calibrationMode));
	setOriginButton.setAttribute('aria-pressed', String(state.originMode));
}

function hidePickMode() {
	messageBar.classList.remove('is-mode');
	modeCancelButton.hidden = true;
	calibrateButton.setAttribute('aria-pressed', 'false');
	setOriginButton.setAttribute('aria-pressed', 'false');
}

function restorePreviousCalibration() {
	if (!state.previousCalibration) return;
	state.calibrationStart = state.previousCalibration.start;
	state.calibrationEnd = state.previousCalibration.end;
	state.previousCalibration = null;
}

function cancelPickMode() {
	if (!state.calibrationMode && !state.originMode) return;
	const wasCalibrating = state.calibrationMode;
	if (state.calibrationMode) restorePreviousCalibration();
	state.calibrationMode = false;
	state.isDrawingCalibration = false;
	state.originMode = false;
	state.originGuide = null;
	state.originPointerDown = false;
	overlayCanvas.style.pointerEvents = "none";
	hidePickMode();
	drawOverlay();
	setMessage(wasCalibrating ? 'Scale unchanged.' : 'Origin unchanged.');
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

	if (state.calibrationStart && state.calibrationEnd) {
		overlayCtx.save();
		overlayCtx.lineWidth = 2 * s;
		overlayCtx.strokeStyle = "orange";
		overlayCtx.shadowColor = "black";
		overlayCtx.shadowBlur = 2;
		overlayCtx.setLineDash([5 * s, 5 * s]);
		overlayCtx.beginPath();
		overlayCtx.moveTo(state.calibrationStart.x, state.calibrationStart.y);
		overlayCtx.lineTo(state.calibrationEnd.x, state.calibrationEnd.y);
		overlayCtx.stroke();
		overlayCtx.setLineDash([]);
		// End ticks across the line
		const length = Math.hypot(state.calibrationEnd.x - state.calibrationStart.x, state.calibrationEnd.y - state.calibrationStart.y);
		if (length > 0) {
			const nx = -(state.calibrationEnd.y - state.calibrationStart.y) / length * 6 * s;
			const ny = (state.calibrationEnd.x - state.calibrationStart.x) / length * 6 * s;
			overlayCtx.beginPath();
			[state.calibrationStart, state.calibrationEnd].forEach(p => {
				overlayCtx.moveTo(p.x - nx, p.y - ny);
				overlayCtx.lineTo(p.x + nx, p.y + ny);
			});
			overlayCtx.stroke();
		}
		overlayCtx.restore();
		if (length > 0 && isCalibrated() && !state.calibrationMode) {
			drawOverlayLabel(`${formatNumber(length * state.scaleFactor)} ${state.scaleUnit}`,
				(state.calibrationStart.x + state.calibrationEnd.x) / 2, Math.min(state.calibrationStart.y, state.calibrationEnd.y), s);
		}
	}
}

function startCalibrationDraw(x, y) {
	state.isDrawingCalibration = true;
	state.calibrationStart = { x, y };
	state.calibrationEnd = { x, y };
}

function updateCalibrationDraw(x, y) {
	if (state.isDrawingCalibration) {
		state.calibrationEnd = { x, y };
		drawOverlay();
	}
}

function endCalibrationDraw() {
	if (!state.isDrawingCalibration) return;
	state.isDrawingCalibration = false;
	const pxLen = Math.hypot(state.calibrationEnd.x - state.calibrationStart.x, state.calibrationEnd.y - state.calibrationStart.y);
	// A tap rather than a drag: keep waiting for a line.
	if (pxLen < 4 * getVisualScale()) {
		state.calibrationStart = state.previousCalibration ? state.previousCalibration.start : null;
		state.calibrationEnd = state.previousCalibration ? state.previousCalibration.end : null;
		drawOverlay();
		setMessage("Drag from one end of the known length to the other.");
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
	pauseVideo();
	state.previousCalibration = { start: state.calibrationStart, end: state.calibrationEnd };
	state.calibrationMode = true;
	state.isDrawingCalibration = false;
	overlayCanvas.style.pointerEvents = "auto";
	showPickMode("Drag along something of known length, such as a meter rule.");
}

function initializeOverlay() {
	modeCancelButton.addEventListener('click', cancelPickMode);

	window.addEventListener('resize', () => {
		fitVideoStage();
		drawOverlay();
		drawFrame();
	});

	calibrateButton.addEventListener('click', handleCalibrationStart);

	overlayCanvas.addEventListener('pointerdown', (event) => {
		if (!state.calibrationMode && !state.originMode) return;
		if (event.button !== undefined && event.button > 0) return;
		event.preventDefault();
		overlayCanvas.setPointerCapture?.(event.pointerId);
		const p = overlayPoint(event);
		if (state.calibrationMode) {
			startCalibrationDraw(p.x, p.y);
		} else {
			state.originPointerDown = true;
			state.originGuide = p;
			drawOverlay();
		}
	});

	overlayCanvas.addEventListener('pointermove', (event) => {
		const p = overlayPoint(event);
		if (state.calibrationMode && state.isDrawingCalibration) {
			updateCalibrationDraw(p.x, p.y);
		} else if (state.originMode) {
			state.originGuide = p;
			drawOverlay();
		}
	});

	overlayCanvas.addEventListener('pointerup', (event) => {
		if (state.calibrationMode) {
			endCalibrationDraw();
		} else if (state.originMode && state.originPointerDown) {
			const p = overlayPoint(event);
			finalizeOriginSelection(p.x, p.y);
		}
	});

	overlayCanvas.addEventListener('pointercancel', () => {
		if (state.calibrationMode && state.isDrawingCalibration) {
			state.isDrawingCalibration = false;
			state.calibrationStart = state.previousCalibration ? state.previousCalibration.start : null;
			state.calibrationEnd = state.previousCalibration ? state.previousCalibration.end : null;
		}
		state.originPointerDown = false;
		drawOverlay();
	});

	overlayCanvas.addEventListener('pointerleave', () => {
		if (state.originMode && !state.originPointerDown) {
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
		state.isDrawingCalibration = false;
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
			state.isDrawingCalibration = false;
		}
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
