import {
	calibrationPrompt,
	cancelCalibrationButton,
	cancelExportButton,
	cancelFrameRateButton,
	captureRateSection,
	clearButton,
	clearCalibrationButton,
	clearDataPointsButton,
	clearMenu,
	clearOriginButton,
	clearVideoButton,
	ctx,
	deleteSelectedButton,
	detectedFpsDisplay,
	emptyVideo,
	exportDataButton,
	exportPanPhyPlotButton,
	exportPrompt,
	frameCanvas,
	frameRateHintButton,
	frameRatePrompt,
	hiddenVideo,
	hideCrossesToggle,
	messageEl,
	openVideoButton,
	overlayCanvas,
	overlayCtx,
	redoPointButton,
	selectMarksButton,
	setupButton,
	setupMenu,
	slider,
	specialRecordingCheckbox,
	undoPointButton,
	videoName,
	videoUploadInput,
	videoWrapper
} from './dom.js';
import { state } from './state.js';
import { isCalibrated } from './analysis.js';
import { stopAutoTrack } from './tracking.js';
import {
	deleteMark,
	redoPoint,
	rememberPoints,
	renderPointRows,
	setSelectMarksMode,
	undoPoint
} from './points.js';
import {
	disableControls,
	pauseVideo,
	setPlayIcon,
	stepOneFrame,
	togglePlay,
	updateFpsButtonText,
	updateTimeDisplay
} from './video.js';
import { cancelPickMode, drawFrame, drawOverlay, hidePickMode, toggleCrossesVisibility } from './overlay.js';
import { closeTouchGraphCopyActions, resetGraphCopyStatus } from './copy.js';
import { replotCurrentView, updateActivePlotButton } from './plot.js';

const UNSAVED_EXIT_WARNING = "Export your data as CSV before leaving. Closing or refreshing will clear this analysis.";

const CLEAR_DATA_WARNING = "Clear all marks? You can undo this.";

const NEW_VIDEO_WARNING = "Loading a new video will clear your current analysis data. Continue?";

function setMessage(text) {
	messageEl.textContent = text;
	frameRateHintButton.hidden = true;
}

function formatNumber(value, digits = 4) {
	if (!Number.isFinite(value)) return '';
	return String(Number(value.toPrecision(digits)));
}

function markUnsavedChanges() {
	state.hasUnsavedChanges = true;
}

function clearUnsavedChanges() {
	state.hasUnsavedChanges = false;
}

function hasDataLossRisk() {
	return state.frameData.length > 0
		|| state.originSet
		|| state.scaleFactor !== 1
		|| state.scaleUnit !== "pixels";
}

function confirmDataLoss(message) {
	if (!hasDataLossRisk()) return true;
	return window.confirm(message);
}

// The status bar, the Table count and the tools that need something to act on.
function updateStatusBar() {
	const count = state.frameData.length;
	const ready = state.videoReady && !state.fpsDetectionPending;
	document.getElementById('statusPoints').textContent = `${count} mark${count === 1 ? '' : 's'}`;
	document.getElementById('pointCount').textContent = String(count);
	document.getElementById('statusScale').textContent = isCalibrated()
		? `scale: 1 px = ${formatNumber(state.scaleFactor)} ${state.scaleUnit}`
		: 'scale: pixels';
	document.getElementById('statusOrigin').textContent = state.originSet
		? `origin: (${Math.round(state.originPoint.x)}, ${Math.round(state.originPoint.y)}) px`
		: 'origin: bottom-left';
	clearDataPointsButton.disabled = !ready || count === 0;
	clearCalibrationButton.disabled = !ready || !isCalibrated();
	clearOriginButton.disabled = !ready || !state.originSet;
	clearVideoButton.disabled = !ready;
	exportDataButton.disabled = !ready || count === 0;
	exportPanPhyPlotButton.disabled = !ready || count === 0;
	undoPointButton.disabled = !ready || !!state.trackRun || state.undoHistory.length === 0;
	redoPointButton.disabled = !ready || !!state.trackRun || state.redoHistory.length === 0;
	selectMarksButton.disabled = !ready || !!state.trackRun;
	deleteSelectedButton.hidden = state.selectedMarkTime === null;
	deleteSelectedButton.disabled = !ready || !!state.trackRun || state.selectedMarkTime === null;
	document.querySelectorAll('#pointRows input, #pointRows button').forEach(control => {
		control.disabled = !ready || !!state.trackRun;
	});
}

function openDialog(dialog) {
	closeMenus();
	dialog.querySelectorAll('input').forEach(input => input.setCustomValidity(''));
	if (!dialog.open) dialog.showModal();
	dialog.scrollTop = 0; // Focus may land on a button at the bottom of a tall dialog
}

function closeDialog(dialog) {
	if (dialog.open) dialog.close();
}

function closeAllDialogs() {
	document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
}

// Shows a message on a field and keeps the dialog open.
function rejectField(input, text) {
	input.setCustomValidity(text);
	input.reportValidity();
	input.addEventListener('input', () => input.setCustomValidity(''), { once: true });
}

const MENUS = [[setupButton, setupMenu], [clearButton, clearMenu]];

function closeMenus() {
	MENUS.forEach(([button, menu]) => {
		menu.hidden = true;
		button.setAttribute('aria-expanded', 'false');
	});
}

function resetApp() {
	stopAutoTrack();
	state.cancelFpsDetection();
	state.videoReady = false;
	state.startingFrame = null;
	state.undoHistory = [];
	state.redoHistory = [];
	state.autoTrackOn = true;
	setSelectMarksMode(false);
	// 1. Clear data
	state.frameData = [];
	clearUnsavedChanges();
	state.calibrationMode = false;
	state.originMode = false;
	state.isDrawingCalibration = false;
	state.skippingFrame = false;
	state.isPlaying = false;
	state.crossesVisible = true;
	state.originGuide = null;
	state.originPointerDown = false;
	state.previousCalibration = null;

	// 2. Reset FPS detection state
	state.detectedFps = null;
	state.isSpecialRecording = false;
	state.fpsDetectionPending = false;
	state.playbackFrameRate = 30;
	state.captureFrameRate = 30;

	// 3. Reset Calibration/Origin defaults
	state.scaleFactor = 1;
	state.scaleUnit = "pixels";
	state.calibrationStart = null;
	state.calibrationEnd = null;
	state.originSet = false;
	state.originPoint = { x: 0, y: 0 };

	// 4. Reset Chart
	if (state.positionChart) {
		state.positionChart.destroy();
		state.positionChart = null;
	}

	// 5. Clear Canvases
	ctx.clearRect(0, 0, frameCanvas.width, frameCanvas.height);
	overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
	videoWrapper.hidden = true;
	emptyVideo.hidden = false;

	// 6. Reset UI elements
	setPlayIcon(false);
	overlayCanvas.style.pointerEvents = "none";
	hidePickMode();
	setMessage("Opening the video...");
	hideCrossesToggle.setAttribute('aria-pressed', 'false');
	hideCrossesToggle.setAttribute('aria-label', 'Hide marks');
	resetGraphCopyStatus();
	closeTouchGraphCopyActions();
	specialRecordingCheckbox.checked = false;
	captureRateSection.style.display = 'none';
	detectedFpsDisplay.textContent = 'detecting...';
	updateFpsButtonText();
	renderPointRows();

	// 7. Hide any open prompts
	closeAllDialogs();
	closeMenus();

	// 8. Disable controls until loaded
	disableControls(true);
	updateActivePlotButton();
}

function handleClearVideo() {
	if (!confirmDataLoss('Clear the video and all analysis data to start over?')) return;
	resetApp();
	pauseVideo();
	if (state.playbackCallbackId !== null) {
		hiddenVideo.cancelVideoFrameCallback(state.playbackCallbackId);
		state.playbackCallbackId = null;
	}
	hiddenVideo.removeAttribute('src');
	hiddenVideo.load();
	if (state.blobUrl) URL.revokeObjectURL(state.blobUrl);
	state.blobUrl = null;
	state.sampleOpen = false;
	videoUploadInput.value = '';
	videoName.textContent = 'No video open';
	slider.min = slider.max = slider.value = '0';
	updateTimeDisplay(0);
	setMessage('Video cleared. Import a video or try the sample to start again.');
	openVideoButton.focus();
}

function handleKeyDown(e) {
	if (state.trackRun && !['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) {
		e.preventDefault();
		stopAutoTrack();
		return;
	}
	if (e.key === 'Escape') {
		closeTouchGraphCopyActions();
		closeMenus();
		if (state.calibrationMode || state.originMode) cancelPickMode();
		if (state.selectMarksMode || state.selectedMarkTime !== null) {
			setSelectMarksMode(false);
			setMessage('Selection cleared.');
		}
	}

	// Ignore if a dialog is open, if typing in a field, or if no video is ready
	if (document.querySelector('dialog[open]')) return;
	const tag = e.target.tagName;
	if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;
	if (!state.videoReady || state.fpsDetectionPending) return;

	if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'z') {
		e.preventDefault();
		undoPoint();
		return;
	}
	if (!e.altKey && (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') || (e.ctrlKey && !e.metaKey && !e.shiftKey && e.key.toLowerCase() === 'y'))) {
		e.preventDefault();
		redoPoint();
		return;
	}
	if (e.ctrlKey || e.metaKey || e.altKey) return;
	if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedMarkTime !== null) {
		e.preventDefault();
		deleteMark(state.selectedMarkTime);
		return;
	}

	if (e.key === 'h' || e.key === 'H') {
		e.preventDefault();
		toggleCrossesVisibility();
	} else if (e.key === 'ArrowRight') {
		e.preventDefault();
		stepOneFrame(state.frameStep);
	} else if (e.key === 'ArrowLeft') {
		e.preventDefault();
		stepOneFrame(-state.frameStep);
	} else if (e.key === ' ' && tag !== 'BUTTON' && tag !== 'A') {
		e.preventDefault();
		togglePlay();
	}
}

function initializeUi() {
	MENUS.forEach(([button, menu]) => {
		button.addEventListener('click', (event) => {
			event.stopPropagation();
			const opening = menu.hidden;
			closeMenus();
			if (!opening) return;
			menu.hidden = false;
			button.setAttribute('aria-expanded', 'true');
			menu.querySelector('button:not(:disabled)')?.focus();
		});
		menu.addEventListener('click', (event) => {
			if (event.target.closest('button')) closeMenus();
		});
	});

	document.addEventListener('click', (event) => {
		if (!event.target.closest('.mt-menu-wrap')) closeMenus();
	});

	clearVideoButton.addEventListener('click', handleClearVideo);

	clearDataPointsButton.addEventListener("click", () => {
		if (state.frameData.length > 0 && !window.confirm(CLEAR_DATA_WARNING)) {
			return;
		}

		rememberPoints();
		state.frameData = [];
		markUnsavedChanges();
		renderPointRows();
		replotCurrentView();
		drawFrame();
		drawOverlay();
		setMessage("Marks cleared. Undo to restore.");
	});

	clearCalibrationButton.addEventListener("click", () => {
		state.scaleFactor = 1;
		state.scaleUnit = "pixels";
		state.calibrationStart = null;
		state.calibrationEnd = null;
		markUnsavedChanges();
		drawOverlay();
		drawFrame();
		renderPointRows();
		if (state.positionChart) {
			replotCurrentView();
		}
		setMessage("Scale cleared. Positions are now in pixels.");
	});

	clearOriginButton.addEventListener("click", () => {
		state.originSet = false;
		state.originPoint = { x: 0, y: 0 };
		markUnsavedChanges();
		drawOverlay();
		replotCurrentView();
		renderPointRows();
		setMessage("Origin cleared. Positions are measured from the bottom-left corner.");
	});

	[[calibrationPrompt, cancelCalibrationButton], [exportPrompt, cancelExportButton], [frameRatePrompt, cancelFrameRateButton]].forEach(([dialog, cancel]) => {
		dialog.addEventListener('cancel', (event) => {
			event.preventDefault();
			cancel.click();
		});
	});

	window.addEventListener('beforeunload', (event) => {
		if (state.hasUnsavedChanges) {
			event.preventDefault();
			event.returnValue = UNSAVED_EXIT_WARNING;
		}
	});

	window.addEventListener('pagehide', (event) => {
		if (!event.persisted && state.blobUrl) URL.revokeObjectURL(state.blobUrl);
	});

	document.addEventListener('keydown', handleKeyDown);

}

export {
	NEW_VIDEO_WARNING,
	setMessage,
	formatNumber,
	markUnsavedChanges,
	clearUnsavedChanges,
	confirmDataLoss,
	updateStatusBar,
	openDialog,
	closeDialog,
	rejectField,
	resetApp,
	initializeUi
};
