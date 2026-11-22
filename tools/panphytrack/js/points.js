import { state } from './state.js';
import { formatNumber, markUnsavedChanges, setMessage, updateStatusBar } from './ui.js';
import { refreshGraphSelection, replotCurrentView } from './plot.js';
import { cancelPickMode, canvasYToCartesianY, drawFrame, drawOverlay, findProtractorAt, findRulerAt, getVisualScale, selectProtractor, selectRuler } from './overlay.js';
import {
	autoTrackToggle,
	deleteSelectedButton,
	frameCanvas,
	frameRateHintButton,
	hiddenVideo,
	hideCrossesToggle,
	manualModeButton,
	pointEditor,
	redoPointButton,
	selectMarksButton,
	undoPointButton
} from './dom.js';
import { currentFrameIndex, pauseVideo, seekToPlaybackTime, stepOneFrame } from './video.js';
import { getAnalysisTime, unitLabel } from './analysis.js';
import { startAutoTrack, stopAutoTrack } from './tracking.js';

function rememberPoints() {
	state.redoHistory = [];
	state.undoHistory.push(state.frameData.map(p => ({ ...p })));
	if (state.undoHistory.length > 100) state.undoHistory.shift();
}

function refreshPoints() {
	markUnsavedChanges(); renderPointRows(); replotCurrentView(); drawFrame();
}

function undoPoint() {
	if (!state.undoHistory.length || !state.videoReady || state.fpsDetectionPending || state.trackRun) return;
	state.redoHistory.push(state.frameData.map(p => ({ ...p })));
	state.frameData = state.undoHistory.pop();
	refreshPoints();
	setMessage('Undone. Redo brings this change back.');
}

function redoPoint() {
	if (!state.redoHistory.length || !state.videoReady || state.fpsDetectionPending || state.trackRun) return;
	state.undoHistory.push(state.frameData.map(p => ({ ...p })));
	state.frameData = state.redoHistory.pop();
	refreshPoints();
	setMessage('Redone.');
}

function setSelectMarksMode(enabled) {
	state.selectMarksMode = enabled;
	state.selectedMarkTime = null;
	state.selectedRuler = null;
	state.selectedProtractor = null;
	if (enabled) state.autoTrackOn = false;
	manualModeButton.setAttribute('aria-pressed', String(!state.autoTrackOn && !enabled));
	autoTrackToggle.setAttribute('aria-pressed', String(state.autoTrackOn));
	selectMarksButton.setAttribute('aria-pressed', String(enabled));
	frameCanvas.classList.toggle('is-selecting', enabled);
	frameCanvas.setAttribute('aria-label', enabled ? 'Video frame. Click a cross to select a mark.' : 'Video frame. Click the object to mark it.');
	if (enabled) {
		pauseVideo();
		cancelPickMode();
		state.crossesVisible = true;
		hideCrossesToggle.setAttribute('aria-pressed', 'false');
		hideCrossesToggle.setAttribute('aria-label', 'Hide marks');
	}
	highlightCurrentRow();
	updateStatusBar();
	drawFrame();
	drawOverlay();
	refreshGraphSelection();
}

// Distances are in canvas pixels; ties favor the frame being shown.
function findMarkAt(x, y, radius) {
	let nearest = null;
	let distance = radius;
	const frame = currentFrameIndex();
	for (const point of state.frameData) {
		const nextDistance = Math.hypot(point.x - x, point.y - y);
		if (nextDistance < distance || (nextDistance === distance && Math.round(point.playbackTime * state.playbackFrameRate) === frame)) {
			nearest = point;
			distance = nextDistance;
		}
	}
	return nearest;
}

function selectMark(point) {
	if (!state.videoReady || state.fpsDetectionPending || state.skippingFrame || state.trackRun) return;
	if (point && !state.selectMarksMode) setSelectMarksMode(true);
	state.selectedMarkTime = point ? point.playbackTime : null;
	state.selectedRuler = null;
	state.selectedProtractor = null;
	if (point) seekToPlaybackTime(point.playbackTime);
	highlightCurrentRow(true);
	updateStatusBar();
	drawFrame();
	drawOverlay();
	// The graph shows which point belongs to the mark.
	refreshGraphSelection();
	setMessage(point
		? `Selected mark: ${getAnalysisTime(point.playbackTime).toFixed(4)} s. Use the cross beside it, or Delete, to remove it.`
		: 'Nothing here. Click a cross, a ruler or a protractor to select it, or use the Table for overlapping marks.');
}

function deleteMark(playbackTime) {
	if (!state.videoReady || state.fpsDetectionPending || state.trackRun) return;
	const index = state.frameData.findIndex(point => point.playbackTime === playbackTime);
	if (index < 0) return;
	rememberPoints();
	state.frameData.splice(index, 1);
	refreshPoints();
	setMessage('Mark deleted. Undo brings it back.');
}

function setTrackingMode(mode) {
	stopAutoTrack();
	cancelPickMode();
	state.autoTrackOn = mode === 'auto';
	setSelectMarksMode(mode === 'edit');
	const messages = {
		manual: 'Manual: click the object in each frame.',
		auto: 'Auto: click the object to track it across frames.',
		edit: 'Edit: select a cross, a ruler or a protractor to delete it. Use the Table for overlapping marks.'
	};
	setMessage(messages[mode]);
}

// The table shows positions as the graph does: from the origin, in the scale units.
function renderPointRows() {
	if (!state.frameData.some(point => point.playbackTime === state.selectedMarkTime)) state.selectedMarkTime = null;
	const rows = document.getElementById('pointRows');
	rows.replaceChildren();
	const unit = unitLabel();
	document.getElementById('pointXHead').textContent = `x (${unit})`;
	document.getElementById('pointYHead').textContent = `y (${unit})`;
	document.getElementById('pointsEmpty').hidden = state.frameData.length > 0;
	state.frameData.forEach((point, index) => {
		const row = document.createElement('tr');
		row.dataset.frame = String(Math.round(point.playbackTime * state.playbackFrameRate));
		row.dataset.time = String(point.playbackTime);
		const time = document.createElement('td');
		const timeButton = document.createElement('button');
		timeButton.type = 'button';
		timeButton.className = 'point-time';
		timeButton.textContent = getAnalysisTime(point.playbackTime).toFixed(4);
		timeButton.title = 'Show this frame';
		timeButton.addEventListener('click', () => selectMark(point));
		time.append(timeButton);
		row.append(time);
		for (const axis of ['x', 'y']) {
			const origin = state.originSet ? state.originPoint[axis] : 0;
			const cell = document.createElement('td');
			const input = document.createElement('input');
			input.type = 'number'; input.step = 'any'; input.inputMode = 'decimal';
			input.value = formatNumber((point[axis] - origin) * state.scaleFactor, 6);
			input.setAttribute('aria-label', `Mark ${index + 1} ${axis} in ${unit}`);
			input.addEventListener('change', () => {
				if (state.trackRun || state.fpsDetectionPending || !state.videoReady) return;
				const value = Number(input.value);
				if (input.value.trim() === '' || !Number.isFinite(value)) {
					input.value = formatNumber((point[axis] - origin) * state.scaleFactor, 6);
					return;
				}
				rememberPoints(); point[axis] = value / state.scaleFactor + origin; refreshPoints();
			});
			cell.append(input); row.append(cell);
		}
		const actions = document.createElement('td');
		const remove = document.createElement('button');
		remove.type = 'button';
		remove.className = 'point-delete';
		remove.innerHTML = '<svg class="mt-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
		remove.title = 'Delete this mark';
		remove.setAttribute('aria-label', `Delete mark ${index + 1}`);
		remove.addEventListener('click', () => deleteMark(point.playbackTime));
		actions.append(remove); row.append(actions); rows.append(row);
	});
	highlightCurrentRow();
	updateStatusBar();
}

function highlightCurrentRow(scroll = false) {
	const frame = String(currentFrameIndex());
	document.querySelectorAll('#pointRows tr').forEach(row => {
		const current = state.videoReady && row.dataset.frame === frame;
		row.classList.toggle('is-current', current);
		const selected = state.selectedMarkTime !== null && Number(row.dataset.time) === state.selectedMarkTime;
		row.classList.toggle('is-selected', selected);
		if (scroll && !pointEditor.hidden && (state.selectedMarkTime !== null ? selected : current)) row.scrollIntoView({ block: 'nearest' });
	});
}

function initializePoints() {
	frameCanvas.addEventListener('click', (event) => {
		if (state.videoReady && !hiddenVideo.seeking && !state.fpsDetectionPending && !state.calibrationMode && !state.originMode && !state.rulerMode && !state.protractorMode && !state.skippingFrame) {
			const rect = frameCanvas.getBoundingClientRect();
			const scaleX = frameCanvas.width / rect.width;
			const scaleY = frameCanvas.height / rect.height;
			const canvasX = (event.clientX - rect.left) * scaleX;
			const canvasY = (event.clientY - rect.top) * scaleY;
			const cartesianY = canvasYToCartesianY(canvasY);

			if (state.selectMarksMode) {
				const reach = (event.pointerType === 'touch' ? 24 : 12) * getVisualScale();
				const mark = findMarkAt(canvasX, cartesianY, reach);
				const ruler = mark ? -1 : findRulerAt(canvasX, canvasY, reach);
				const protractor = mark || ruler >= 0 ? -1 : findProtractorAt(canvasX, canvasY, reach);
				if (ruler >= 0) { selectMark(null); selectRuler(ruler); }
				else if (protractor >= 0) { selectMark(null); selectProtractor(protractor); }
				else selectMark(mark);
				return;
			}

			if (state.autoTrackOn) {
				startAutoTrack(canvasX, canvasY);
				return;
			}

			frameRateHintButton.hidden = true;
			// Store playbackTime so analysis time can be recalculated if FPS changes
			rememberPoints();
			const frameIndex = currentFrameIndex();
			const point = { x: canvasX, y: cartesianY, playbackTime: frameIndex / state.playbackFrameRate };
			state.frameData = state.frameData.filter(p => Math.round(p.playbackTime * state.playbackFrameRate) !== frameIndex);
			state.frameData.push(point);
			state.frameData.sort((a, b) => a.playbackTime - b.playbackTime);
			renderPointRows();
			markUnsavedChanges();

			// Update the specific plot user is viewing
			replotCurrentView();

			stepOneFrame(state.frameStep);
		}
	});

	selectMarksButton.addEventListener('click', () => setTrackingMode('edit'));

	deleteSelectedButton.addEventListener('click', () => deleteMark(state.selectedMarkTime));

	undoPointButton.addEventListener('click', undoPoint);

	redoPointButton.addEventListener('click', redoPoint);
}

export {
	rememberPoints,
	undoPoint,
	redoPoint,
	setSelectMarksMode,
	deleteMark,
	setTrackingMode,
	renderPointRows,
	highlightCurrentRow,
	initializePoints
};
