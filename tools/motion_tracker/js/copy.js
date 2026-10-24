import { state } from './state.js';
import { chartCanvasContainer, chartCopyActionButton, graphHint, positionChartCanvas } from './dom.js';
import { getCssVar } from './theme.js';
import { setMessage } from './ui.js';
import { isSafariBrowser } from './video.js';

const GRAPH_PNG_BASE_SCALE = 3;

const GRAPH_PNG_MAX_CANVAS_SIDE = 8192;

const GRAPH_PNG_MAX_PIXELS = 16_777_216;

const GRAPH_COPY_PADDING_PX = 8;

const GRAPH_COPY_SUCCESS_MS = 1500;

const GRAPH_COPY_FAIL_MS = 2000;

function isTouchCopyMode() {
	const hasCoarsePointer = typeof window.matchMedia === 'function'
		&& window.matchMedia('(hover: none), (pointer: coarse)').matches;
	const hasTouchPoints = Number.isFinite(navigator.maxTouchPoints) && navigator.maxTouchPoints > 0;
	return hasCoarsePointer || hasTouchPoints;
}

function canWriteClipboardItems() {
	return typeof ClipboardItem !== 'undefined'
		&& Boolean(navigator.clipboard)
		&& typeof navigator.clipboard.write === 'function';
}

function openTouchGraphCopyActions() {
	if (!state.graphTouchCopyMode || !chartCanvasContainer || !chartCopyActionButton || chartCopyActionButton.hidden) return;
	chartCanvasContainer.classList.add('touch-copy-open');
}

function closeTouchGraphCopyActions() {
	if (!chartCanvasContainer) return;
	chartCanvasContainer.classList.remove('touch-copy-open');
}

function setGraphCopyActionLabel(label, disabled = false) {
	if (!chartCopyActionButton) return;
	chartCopyActionButton.textContent = label;
	chartCopyActionButton.disabled = disabled;
}

function resetGraphCopyStatus() {
	if (state.graphCopyStatusResetTimeoutId) {
		clearTimeout(state.graphCopyStatusResetTimeoutId);
		state.graphCopyStatusResetTimeoutId = 0;
	}
	if (!chartCanvasContainer) return;
	chartCanvasContainer.classList.remove('copied', 'copy-failed', 'copying');
	setGraphCopyActionLabel('Copy image', false);
}

function scheduleGraphCopyStatusReset(delayMs) {
	if (state.graphCopyStatusResetTimeoutId) {
		clearTimeout(state.graphCopyStatusResetTimeoutId);
	}
	state.graphCopyStatusResetTimeoutId = window.setTimeout(() => {
		state.graphCopyStatusResetTimeoutId = 0;
		resetGraphCopyStatus();
	}, delayMs);
}

function getGraphRasterScale(widthPx, heightPx) {
	const safeWidth = Math.max(1, widthPx);
	const safeHeight = Math.max(1, heightPx);
	const dpr = Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio : 1;
	const requestedScale = Math.max(GRAPH_PNG_BASE_SCALE, Math.ceil(dpr * 2));
	const maxScaleBySide = Math.min(
		GRAPH_PNG_MAX_CANVAS_SIDE / safeWidth,
		GRAPH_PNG_MAX_CANVAS_SIDE / safeHeight
	);
	const maxScaleByPixels = Math.sqrt(GRAPH_PNG_MAX_PIXELS / (safeWidth * safeHeight));
	return Math.max(1, Math.min(requestedScale, maxScaleBySide, maxScaleByPixels));
}

async function rasterizeGraphToPngBlob() {
	if (!positionChartCanvas || !chartCanvasContainer) return null;

	const rect = positionChartCanvas.getBoundingClientRect();
	const widthPx = rect.width > 0 ? rect.width : Math.max(1, positionChartCanvas.width);
	const heightPx = rect.height > 0 ? rect.height : Math.max(1, positionChartCanvas.height);
	if (widthPx <= 1 || heightPx <= 1) return null;

	const scale = getGraphRasterScale(widthPx, heightPx);
	const paddingPx = Math.max(1, Math.round(GRAPH_COPY_PADDING_PX * scale));
	const outWidth = Math.ceil(widthPx * scale) + (paddingPx * 2);
	const outHeight = Math.ceil(heightPx * scale) + (paddingPx * 2);

	const exportCanvas = document.createElement('canvas');
	exportCanvas.width = outWidth;
	exportCanvas.height = outHeight;
	const exportCtx = exportCanvas.getContext('2d');
	if (!exportCtx) return null;

	// The graph sits on the pane's surface color, so the copy does too.
	exportCtx.fillStyle = getCssVar('--surface') || '#ffffff';
	exportCtx.fillRect(0, 0, outWidth, outHeight);
	exportCtx.imageSmoothingEnabled = true;
	exportCtx.imageSmoothingQuality = 'high';
	exportCtx.drawImage(
		positionChartCanvas,
		paddingPx,
		paddingPx,
		outWidth - (paddingPx * 2),
		outHeight - (paddingPx * 2)
	);

	return new Promise(resolve => {
		exportCanvas.toBlob(blob => resolve(blob || null), 'image/png');
	});
}

function showGraphCopyFeedback() {
	if (!chartCanvasContainer) return;
	chartCanvasContainer.classList.remove('copy-failed');
	chartCanvasContainer.classList.add('copied');
	if (state.graphTouchCopyMode) {
		setGraphCopyActionLabel('Copied!', false);
	}
	scheduleGraphCopyStatusReset(GRAPH_COPY_SUCCESS_MS);
}

function showGraphCopyFailedFeedback() {
	if (!chartCanvasContainer) return;
	chartCanvasContainer.classList.remove('copied');
	chartCanvasContainer.classList.add('copy-failed');
	if (state.graphTouchCopyMode) {
		setGraphCopyActionLabel('Copy failed', false);
	}
	scheduleGraphCopyStatusReset(GRAPH_COPY_FAIL_MS);
}

async function copyGraphImageToClipboard() {
	if (!chartCanvasContainer || !positionChartCanvas || state.graphCopyInProgress) return false;
	if (!canWriteClipboardItems()) {
		showGraphCopyFailedFeedback();
		setMessage("Image clipboard copy is not supported by this browser.");
		return false;
	}
	if (state.graphCopyStatusResetTimeoutId) {
		clearTimeout(state.graphCopyStatusResetTimeoutId);
		state.graphCopyStatusResetTimeoutId = 0;
	}

	state.graphCopyInProgress = true;
	chartCanvasContainer.classList.remove('copied', 'copy-failed');
	chartCanvasContainer.classList.add('copying');
	if (state.graphTouchCopyMode) {
		setGraphCopyActionLabel('Copying...', true);
	}

	const pngPromise = rasterizeGraphToPngBlob().then(blob => {
		if (!blob) throw new Error('Graph PNG rasterization failed');
		return blob;
	});

	try {
		if (isSafariBrowser()) {
			const item = new ClipboardItem({ 'image/png': pngPromise });
			await navigator.clipboard.write([item]);
		} else {
			const blob = await pngPromise;
			await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
		}
		showGraphCopyFeedback();
		return true;
	} catch (err) {
		console.error('Failed to copy graph image:', err);
		showGraphCopyFailedFeedback();
		return false;
	} finally {
		state.graphCopyInProgress = false;
		chartCanvasContainer.classList.remove('copying');
		if (state.graphTouchCopyMode && !chartCanvasContainer.classList.contains('copied') && !chartCanvasContainer.classList.contains('copy-failed')) {
			setGraphCopyActionLabel('Copy image', false);
		}
	}
}

function initializeCopy() {
	chartCanvasContainer.classList.add('copy-ready');

	state.graphTouchCopyMode = isTouchCopyMode();

	chartCanvasContainer.classList.toggle('touch-copy-mode', state.graphTouchCopyMode);

	if (state.graphTouchCopyMode) {
		chartCanvasContainer.removeAttribute('tabindex');
		chartCanvasContainer.setAttribute('role', 'group');
		chartCanvasContainer.setAttribute('aria-label', 'Graph copy actions');
		chartCopyActionButton.hidden = false;
		graphHint.textContent = 'Tap the graph to copy it';
	} else {
		chartCanvasContainer.tabIndex = 0;
		chartCanvasContainer.setAttribute('role', 'button');
		chartCanvasContainer.setAttribute('aria-label', 'Copy graph image');
		chartCopyActionButton.hidden = true;
	}

	setGraphCopyActionLabel('Copy image', false);

	chartCanvasContainer.addEventListener('click', (event) => {
		if (!chartCanvasContainer.classList.contains('has-data')) return;
		if (state.graphTouchCopyMode) {
			if (chartCopyActionButton && chartCopyActionButton.contains(event.target)) {
				return;
			}
			openTouchGraphCopyActions();
			return;
		}
		void copyGraphImageToClipboard();
	});

	chartCopyActionButton.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();
		void copyGraphImageToClipboard();
	});

	chartCanvasContainer.addEventListener('keydown', (event) => {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		if (!chartCanvasContainer.classList.contains('has-data')) return;
		event.preventDefault();
		event.stopPropagation();
		if (state.graphTouchCopyMode) {
			openTouchGraphCopyActions();
			return;
		}
		void copyGraphImageToClipboard();
	});

	document.addEventListener('click', (event) => {
		if (!state.graphTouchCopyMode) return;
		if (!chartCanvasContainer.classList.contains('touch-copy-open')) return;
		if (chartCanvasContainer.contains(event.target)) return;
		closeTouchGraphCopyActions();
	});
}

export { closeTouchGraphCopyActions, resetGraphCopyStatus, initializeCopy };
