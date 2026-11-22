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
	protractorButton,
	rulerButton,
	setOriginButton,
	stageDeleteButton
} from './dom.js';
import { deleteMark, renderPointRows, setSelectMarksMode } from './points.js';
import {
	closeDialog,
	formatNumber,
	markUnsavedChanges,
	openDialog,
	rejectField,
	setMessage,
	updateStatusBar
} from './ui.js';
import { state } from './state.js';
import { refreshGraphSelection, replotCurrentView } from './plot.js';
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
	modeCancelButton.textContent = state.rulerMode || state.protractorMode ? 'Done' : 'Cancel';
	calibrateButton.setAttribute('aria-pressed', String(state.calibrationMode));
	setOriginButton.setAttribute('aria-pressed', String(state.originMode));
	rulerButton.setAttribute('aria-pressed', String(state.rulerMode));
	protractorButton.setAttribute('aria-pressed', String(state.protractorMode));
}

function hidePickMode() {
	messageBar.classList.remove('is-mode');
	modeCancelButton.hidden = true;
	calibrateButton.setAttribute('aria-pressed', 'false');
	setOriginButton.setAttribute('aria-pressed', 'false');
	rulerButton.setAttribute('aria-pressed', 'false');
	protractorButton.setAttribute('aria-pressed', 'false');
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

// Puts the ruler and the protractor away. Finished ones stay on the video until they are deleted.
function closeMeasuringTools() {
	state.rulerMode = false;
	state.rulerStart = null;
	state.rulerEnd = null;
	state.selectedRuler = null;
	state.protractorMode = false;
	state.protractorPoints = [];
	state.protractorHover = null;
	state.protractorPointerDown = false;
	state.selectedProtractor = null;
}

function rulerText(ruler) {
	return `${formatNumber(lineLength(ruler.start, ruler.end) * state.scaleFactor)} ${unitLabel()}`;
}

// The nearest finished ruler within radius canvas pixels of a point, as an index, or -1.
function findRulerAt(x, y, radius) {
	let nearest = -1, distance = radius;
	state.rulers.forEach(({ start, end }, index) => {
		const d = segmentDistance(x, y, start, end);
		if (d < distance) { nearest = index; distance = d; }
	});
	return nearest;
}

function segmentDistance(x, y, start, end) {
	const dx = end.x - start.x, dy = end.y - start.y;
	const t = Math.max(0, Math.min(1, ((x - start.x) * dx + (y - start.y) * dy) / (dx * dx + dy * dy || 1)));
	return Math.hypot(x - start.x - t * dx, y - start.y - t * dy);
}

/* Protractor: an angle from three clicks, the vertex second. */
function protractorAngle({ a, vertex, b }) {
	const ux = a.x - vertex.x, uy = a.y - vertex.y, wx = b.x - vertex.x, wy = b.y - vertex.y;
	const lengths = Math.hypot(ux, uy) * Math.hypot(wx, wy);
	if (!lengths) return 0;
	return Math.acos(Math.max(-1, Math.min(1, (ux * wx + uy * wy) / lengths))) * 180 / Math.PI;
}

function protractorText(protractor) {
	return `${protractorAngle(protractor).toFixed(1)}°`;
}

// The nearest finished protractor with an arm within radius canvas pixels of a point, or -1.
function findProtractorAt(x, y, radius) {
	let nearest = -1, distance = radius;
	state.protractors.forEach(({ a, vertex, b }, index) => {
		const d = Math.min(segmentDistance(x, y, vertex, a), segmentDistance(x, y, vertex, b));
		if (d < distance) { nearest = index; distance = d; }
	});
	return nearest;
}

function selectProtractor(index) {
	state.selectedProtractor = index >= 0 ? index : null;
	if (state.selectedProtractor !== null) {
		state.selectedMarkTime = null;
		state.selectedRuler = null;
		setMessage(`Selected protractor: ${protractorText(state.protractors[index])}. Use the cross beside it, or Delete, to remove it.`);
	}
	updateStatusBar();
	drawFrame();
	drawOverlay();
	refreshGraphSelection();
}

function deleteProtractor(index) {
	if (index === null || !state.protractors[index]) return;
	state.protractors.splice(index, 1);
	state.selectedProtractor = null;
	updateStatusBar();
	drawOverlay();
	setMessage('Protractor deleted.');
}

function clearProtractors() {
	state.protractors = [];
	state.selectedProtractor = null;
	state.protractorPoints = [];
	state.protractorHover = null;
	updateStatusBar();
	drawOverlay();
	setMessage('Protractors cleared.');
}

const PROTRACTOR_PROMPTS = [
	'Protractor: click the end of one arm, then the vertex, then the end of the other arm.',
	'First arm set. Now click the vertex of the angle.',
	'Vertex set. Now click the end of the other arm.'
];

// Each click places the next point; a first click on a finished protractor selects it instead.
function placeProtractorPoint(p, hitRadius = 10 * getVisualScale()) {
	if (state.protractorPoints.length === 0) {
		const hit = findProtractorAt(p.x, p.y, hitRadius);
		if (hit >= 0) {
			selectProtractor(hit === state.selectedProtractor ? -1 : hit);
			if (state.selectedProtractor === null) setMessage(PROTRACTOR_PROMPTS[0]);
			return;
		}
		state.selectedProtractor = null;
	}
	state.protractorPoints.push(p);
	if (state.protractorPoints.length < 3) {
		drawOverlay();
		setMessage(PROTRACTOR_PROMPTS[state.protractorPoints.length]);
		return;
	}
	const [a, vertex, b] = state.protractorPoints;
	state.protractorPoints = [];
	state.protractorHover = null;
	state.protractors.push({ a, vertex, b });
	updateStatusBar();
	drawOverlay();
	setMessage(`Angle: ${protractorText({ a, vertex, b })}. Measure again, or choose Done.`);
}

function cancelProtractorDraw() {
	state.protractorPoints = [];
	state.protractorHover = null;
	state.protractorPointerDown = false;
	drawOverlay();
}

// Two arms from the vertex, an arc between them and the angle beside it.
function drawProtractor({ a, vertex, b }, s, selected, label) {
	const color = '#f0abfc';
	const arms = [a, b].filter(Boolean);
	overlayCtx.save();
	overlayCtx.lineCap = 'round';
	for (const pass of selected ? ['halo', 'line'] : ['line']) {
		overlayCtx.lineWidth = (pass === 'halo' ? 7 : 2) * s;
		overlayCtx.strokeStyle = pass === 'halo' ? '#00e5ff' : color;
		overlayCtx.shadowColor = 'black';
		overlayCtx.shadowBlur = pass === 'halo' ? 0 : 2;
		overlayCtx.beginPath();
		arms.forEach(end => { overlayCtx.moveTo(vertex.x, vertex.y); overlayCtx.lineTo(end.x, end.y); });
		overlayCtx.stroke();
	}
	overlayCtx.fillStyle = color;
	overlayCtx.beginPath();
	overlayCtx.arc(vertex.x, vertex.y, 4 * s, 0, 2 * Math.PI);
	overlayCtx.fill();
	let labelSpot = null;
	if (a && b) {
		const start = Math.atan2(a.y - vertex.y, a.x - vertex.x);
		let sweep = Math.atan2(b.y - vertex.y, b.x - vertex.x) - start;
		if (sweep > Math.PI) sweep -= 2 * Math.PI;
		if (sweep <= -Math.PI) sweep += 2 * Math.PI;
		const reach = Math.min(lineLength(vertex, a), lineLength(vertex, b));
		const radius = Math.min(28 * s, reach * 0.6);
		overlayCtx.lineWidth = 2 * s;
		overlayCtx.beginPath();
		overlayCtx.arc(vertex.x, vertex.y, radius, start, start + sweep, sweep < 0);
		overlayCtx.stroke();
		const middle = start + sweep / 2;
		labelSpot = { x: vertex.x + Math.cos(middle) * (radius + 26 * s), y: vertex.y + Math.sin(middle) * (radius + 26 * s) + 18 * s };
	}
	overlayCtx.restore();
	if (labelSpot && label) drawOverlayLabel(label, labelSpot.x, labelSpot.y, s);
}

function selectRuler(index) {
	state.selectedRuler = index >= 0 ? index : null;
	if (state.selectedRuler !== null) {
		state.selectedMarkTime = null;
		state.selectedProtractor = null;
		setMessage(`Selected ruler: ${rulerText(state.rulers[index])}. Use the cross beside it, or Delete, to remove it.`);
	}
	updateStatusBar();
	drawFrame();
	drawOverlay();
	refreshGraphSelection();
}

function deleteRuler(index) {
	if (index === null || !state.rulers[index]) return;
	state.rulers.splice(index, 1);
	state.selectedRuler = null;
	updateStatusBar();
	drawOverlay();
	setMessage('Ruler deleted.');
}

function clearRulers() {
	state.rulers = [];
	state.selectedRuler = null;
	state.rulerStart = null;
	state.rulerEnd = null;
	state.isDrawingLine = false;
	state.lineAnchored = false;
	updateStatusBar();
	drawOverlay();
	setMessage('Rulers cleared.');
}

// Abandons a line that is only part drawn; the tool stays out.
function cancelLineDraw(tool) {
	state.isDrawingLine = false;
	state.lineAnchored = false;
	if (tool === 'ruler') setLine(tool, null, null);
	else setLine(tool, state.previousCalibration ? state.previousCalibration.start : null, state.previousCalibration ? state.previousCalibration.end : null);
	drawOverlay();
}

// A small cross beside the selected mark or ruler deletes it without leaving the video.
function updateStageDelete() {
	let spot = null, s = 1;
	if (state.videoReady && !state.trackRun && (state.selectedMarkTime ?? state.selectedRuler ?? state.selectedProtractor ?? null) !== null) {
		const mark = (state.selectedMarkTime ?? null) === null ? null : state.frameData.find(p => p.playbackTime === state.selectedMarkTime);
		const ruler = (state.selectedRuler ?? null) === null ? null : state.rulers[state.selectedRuler];
		const protractor = (state.selectedProtractor ?? null) === null ? null : state.protractors[state.selectedProtractor];
		s = getVisualScale();
		if (protractor && !mark && !ruler) {
			// Beside the vertex, outside the angle.
			const { a, vertex, b } = protractor;
			const la = lineLength(vertex, a) || 1, lb = lineLength(vertex, b) || 1;
			let bx = (a.x - vertex.x) / la + (b.x - vertex.x) / lb, by = (a.y - vertex.y) / la + (b.y - vertex.y) / lb;
			const size = Math.hypot(bx, by);
			if (size < 1e-6) { bx = -(a.y - vertex.y) / la; by = (a.x - vertex.x) / la; } else { bx /= size; by /= size; }
			spot = { x: vertex.x / s - bx * 24, y: vertex.y / s - by * 24, label: 'Delete selected protractor' };
		} else if (mark) {
			spot = { x: mark.x / s + 20, y: cartesianYToCanvasY(mark.y) / s - 20, label: 'Delete selected mark' };
		} else if (ruler) {
			// Beside the middle of the line, on the side away from its length label.
			const length = lineLength(ruler.start, ruler.end) || 1;
			let nx = -(ruler.end.y - ruler.start.y) / length, ny = (ruler.end.x - ruler.start.x) / length;
			if (ny < 0 || (ny === 0 && nx < 0)) { nx = -nx; ny = -ny; }
			spot = { x: (ruler.start.x + ruler.end.x) / 2 / s + nx * 22, y: (ruler.start.y + ruler.end.y) / 2 / s + ny * 22, label: 'Delete selected ruler' };
		}
	}
	stageDeleteButton.hidden = !spot;
	if (!spot) return;
	const size = stageDeleteButton.offsetWidth || 28, width = frameCanvas.width / s, height = frameCanvas.height / s;
	stageDeleteButton.style.left = `${Math.min(Math.max(spot.x - size / 2, 2), width - size - 2)}px`;
	stageDeleteButton.style.top = `${Math.min(Math.max(spot.y - size / 2, 2), height - size - 2)}px`;
	stageDeleteButton.setAttribute('aria-label', spot.label);
	stageDeleteButton.title = spot.label;
}

function restorePreviousCalibration() {
	if (!state.previousCalibration) return;
	state.calibrationStart = state.previousCalibration.start;
	state.calibrationEnd = state.previousCalibration.end;
	state.previousCalibration = null;
}

function cancelPickMode() {
	if (!state.calibrationMode && !state.originMode && !state.rulerMode && !state.protractorMode) return;
	const wasCalibrating = state.calibrationMode, wasMeasuring = state.rulerMode, wasAngling = state.protractorMode;
	if (state.calibrationMode) restorePreviousCalibration();
	closeMeasuringTools();
	state.calibrationMode = false;
	state.isDrawingLine = false;
	state.lineAnchored = false;
	state.originMode = false;
	state.originGuide = null;
	state.originPointerDown = false;
	overlayCanvas.style.pointerEvents = "none";
	hidePickMode();
	drawOverlay();
	setMessage(wasAngling ? 'Protractor put away.' : (wasMeasuring ? 'Ruler put away.' : (wasCalibrating ? 'Scale unchanged.' : 'Origin unchanged.')));
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
	updateStageDelete();
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
	updateStageDelete();
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
	state.rulers.forEach((ruler, index) => {
		drawMeasureLine(ruler.start, ruler.end, s, '#a3e635', false, false, rulerText(ruler), index === state.selectedRuler);
	});
	if (state.rulerStart && state.rulerEnd) {
		drawMeasureLine(state.rulerStart, state.rulerEnd, s, '#a3e635', false, state.rulerMode, rulerText({ start: state.rulerStart, end: state.rulerEnd }));
	}
	state.protractors.forEach((protractor, index) => {
		drawProtractor(protractor, s, index === state.selectedProtractor, protractorText(protractor));
	});
	// The one being drawn: its next point follows the pointer.
	if (state.protractorMode && state.protractorPoints.length) {
		const [a, vertex] = state.protractorPoints;
		if (vertex) {
			const preview = { a, vertex, b: state.protractorHover };
			drawProtractor(preview, s, false, preview.b ? protractorText(preview) : '');
		} else {
			drawProtractor({ a: state.protractorHover, vertex: a, b: null }, s, false, '');
		}
	}
}

// A line with a tick across each end. While only the first end is placed, a dot marks it.
// A selected line is drawn over a wider cyan one, the color of a selected mark's ring.
function drawMeasureLine(start, end, s, color, dashed, active, label, selected = false) {
	if (!start || !end) return;
	const length = lineLength(start, end);
	if (selected && length > 0) {
		overlayCtx.save();
		overlayCtx.lineWidth = 7 * s;
		overlayCtx.lineCap = 'round';
		overlayCtx.strokeStyle = '#00e5ff';
		overlayCtx.beginPath();
		overlayCtx.moveTo(start.x, start.y);
		overlayCtx.lineTo(end.x, end.y);
		overlayCtx.stroke();
		overlayCtx.restore();
	}
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

function endLineDraw(tool, hitRadius = 10 * getVisualScale()) {
	if (!state.isDrawingLine) return;
	state.isDrawingLine = false;
	const [start, end] = getLine(tool);
	const pxLen = lineLength(start, end);
	// A click rather than a drag: that end is set, and the next click sets the other.
	if (pxLen < 4 * getVisualScale()) {
		// A first click on a finished ruler selects it instead.
		const hit = tool === 'ruler' && !state.lineAnchored ? findRulerAt(start.x, start.y, hitRadius) : -1;
		if (hit >= 0) {
			setLine(tool, null, null);
			selectRuler(hit === state.selectedRuler ? -1 : hit);
			if (state.selectedRuler === null) setMessage('Ruler: drag along a length, or click one end and then the other.');
			return;
		}
		if (tool === 'ruler') state.selectedRuler = null;
		state.lineAnchored = true;
		setLine(tool, start, start);
		drawOverlay();
		setMessage("First end set. Click the other end.");
		return;
	}
	state.lineAnchored = false;
	if (tool === 'ruler') {
		state.rulers.push({ start, end });
		state.selectedRuler = null;
		setLine(tool, null, null);
		updateStatusBar();
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
	closeMeasuringTools();
	pauseVideo();
	state.previousCalibration = { start: state.calibrationStart, end: state.calibrationEnd };
	state.calibrationMode = true;
	state.isDrawingLine = false;
	state.lineAnchored = false;
	overlayCanvas.style.pointerEvents = "auto";
	drawOverlay();
	showPickMode("Drag along something of known length, such as a meter rule, or click one end and then the other.");
}

function handleProtractorToggle() {
	if (state.protractorMode) { cancelPickMode(); return; }
	if (state.calibrationMode) restorePreviousCalibration();
	closeMeasuringTools();
	state.calibrationMode = false;
	state.originMode = false;
	state.originGuide = null;
	state.originPointerDown = false;
	state.isDrawingLine = false;
	state.lineAnchored = false;
	pauseVideo();
	state.protractorMode = true;
	overlayCanvas.style.pointerEvents = "auto";
	drawOverlay();
	showPickMode(PROTRACTOR_PROMPTS[0]);
}

function handleRulerToggle() {
	if (state.rulerMode) { cancelPickMode(); return; }
	if (state.calibrationMode) restorePreviousCalibration();
	closeMeasuringTools();
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

	protractorButton.addEventListener('click', handleProtractorToggle);

	overlayCanvas.addEventListener('pointerdown', (event) => {
		const tool = lineTool();
		if (!tool && !state.originMode && !state.protractorMode) return;
		if (event.button !== undefined && event.button > 0) return;
		event.preventDefault();
		overlayCanvas.setPointerCapture?.(event.pointerId);
		const p = overlayPoint(event);
		if (tool) {
			startLineDraw(tool, p);
		} else if (state.protractorMode) {
			// The point is placed on release, so a touch can slide to the exact spot.
			state.protractorPointerDown = true;
			state.protractorHover = p;
			drawOverlay();
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
		} else if (state.protractorMode) {
			state.protractorHover = p;
			if (state.protractorPoints.length) drawOverlay();
		} else if (state.originMode) {
			state.originGuide = p;
			drawOverlay();
		}
	});

	overlayCanvas.addEventListener('pointerup', (event) => {
		const tool = lineTool();
		if (tool) {
			endLineDraw(tool, (event.pointerType === 'touch' ? 20 : 10) * getVisualScale());
		} else if (state.protractorMode && state.protractorPointerDown) {
			state.protractorPointerDown = false;
			placeProtractorPoint(overlayPoint(event), (event.pointerType === 'touch' ? 20 : 10) * getVisualScale());
		} else if (state.originMode && state.originPointerDown) {
			const p = overlayPoint(event);
			finalizeOriginSelection(p.x, p.y);
		}
	});

	overlayCanvas.addEventListener('pointercancel', () => {
		const tool = lineTool();
		if (tool && state.isDrawingLine) cancelLineDraw(tool);
		state.protractorPointerDown = false;
		state.originPointerDown = false;
		drawOverlay();
	});

	// A right-click abandons a line or an angle that is only part drawn.
	overlayCanvas.addEventListener('contextmenu', (event) => {
		if (state.protractorMode && state.protractorPoints.length) {
			event.preventDefault();
			cancelProtractorDraw();
			setMessage(`Angle canceled. ${PROTRACTOR_PROMPTS[0]}`);
			return;
		}
		const tool = lineTool();
		if (!tool || (!state.isDrawingLine && !state.lineAnchored)) return;
		event.preventDefault();
		cancelLineDraw(tool);
		setMessage(tool === 'ruler' ? 'Line canceled. Drag along a length, or click one end and then the other.' : 'Line canceled. Drag along the known length, or click one end and then the other.');
	});

	stageDeleteButton.addEventListener('click', () => {
		if (state.selectedMarkTime !== null) deleteMark(state.selectedMarkTime);
		else if (state.selectedRuler !== null) deleteRuler(state.selectedRuler);
		else deleteProtractor(state.selectedProtractor);
	});

	overlayCanvas.addEventListener('pointerleave', () => {
		const tool = lineTool();
		if (state.protractorMode && !state.protractorPointerDown) {
			state.protractorHover = null;
			drawOverlay();
		} else if (tool && state.lineAnchored && !state.isDrawingLine) {
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
		closeMeasuringTools();
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
	clearProtractors,
	clearRulers,
	deleteProtractor,
	deleteRuler,
	findProtractorAt,
	findRulerAt,
	selectProtractor,
	selectRuler,
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
