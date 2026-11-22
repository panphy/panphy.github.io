import {
	autoStopButton,
	autoTrackToggle,
	frameCanvas,
	hiddenVideo,
	manualModeButton,
	messageBar,
	slider
} from './dom.js';
import { state } from './state.js';
import { canvasYToCartesianY, drawFrame, drawOverlay } from './overlay.js';
import { currentFrameIndex, lastFrameIndex, pauseVideo, updateTimeDisplay } from './video.js';
import { blendTemplates, cutTemplate, findBlob, matchTemplate, predictPosition } from './tracking-core.js';
import { markUnsavedChanges, setMessage, updateStatusBar } from './ui.js';
import { rememberPoints, renderPointRows, setTrackingMode } from './points.js';
import { replotCurrentView } from './plot.js';

const TRACK_WORK_SIDE = 960;

const TRACK_MIN_SCORE = 0.6;

const TRACK_REPLOT_EVERY = 6;

const trackCanvas = document.createElement('canvas');

const trackCtx = trackCanvas.getContext('2d', { willReadFrequently: true });

// The current frame, scaled down, without the marks drawn on the frame canvas.
function grabTrackFrame() {
	const scale = Math.min(1, TRACK_WORK_SIDE / Math.max(frameCanvas.width, frameCanvas.height));
	const width = Math.max(1, Math.round(frameCanvas.width * scale));
	const height = Math.max(1, Math.round(frameCanvas.height * scale));
	if (trackCanvas.width !== width || trackCanvas.height !== height) {
		trackCanvas.width = width;
		trackCanvas.height = height;
	}
	trackCtx.drawImage(hiddenVideo, 0, 0, width, height);
	return { image: trackCtx.getImageData(0, 0, width, height), scale: width / frameCanvas.width };
}

const toWork = (value, scale) => (value + 0.5) * scale - 0.5;

const fromWork = (value, scale) => (value + 0.5) / scale - 0.5;

// Resolves once the frame at index is decoded and shown: after the seek, and after the frame
// callback where the browser has one, so that the pixels read are never the previous frame's.
function seekToFrame(index) {
	return new Promise((resolve) => {
		let settled = false;
		let callbackId = null;
		const settle = () => {
			if (settled) return;
			settled = true;
			clearTimeout(fallbackTimer);
			hiddenVideo.removeEventListener('seeked', onSeeked);
			if (callbackId !== null && typeof hiddenVideo.cancelVideoFrameCallback === 'function') hiddenVideo.cancelVideoFrameCallback(callbackId);
			resolve();
		};
		const onSeeked = () => {
			if (typeof hiddenVideo.requestVideoFrameCallback !== 'function') requestAnimationFrame(() => settle());
			else setTimeout(settle, 200);
		};
		const fallbackTimer = setTimeout(settle, 1500);
		if (typeof hiddenVideo.requestVideoFrameCallback === 'function') callbackId = hiddenVideo.requestVideoFrameCallback(() => settle());
		hiddenVideo.addEventListener('seeked', onSeeked, { once: true });
		hiddenVideo.currentTime = index / state.playbackFrameRate + 0.00001;
	});
}

function setTrackMark(frameIndex, workX, workY, scale) {
	const point = { x: fromWork(workX, scale), y: canvasYToCartesianY(fromWork(workY, scale)), playbackTime: frameIndex / state.playbackFrameRate };
	state.frameData = state.frameData.filter(p => Math.round(p.playbackTime * state.playbackFrameRate) !== frameIndex);
	state.frameData.push(point);
	state.frameData.sort((a, b) => a.playbackTime - b.playbackTime);
}

function showTrackFrame() {
	slider.value = hiddenVideo.currentTime.toString();
	updateTimeDisplay(hiddenVideo.currentTime);
	drawFrame();
	drawOverlay();
}

async function startAutoTrack(canvasX, canvasY) {
	const token = ++state.trackRunCounter;
	pauseVideo();
	let frame = currentFrameIndex();
	let { image, scale } = grabTrackFrame();
	const longSide = Math.max(image.width, image.height);
	const clickX = toWork(canvasX, scale), clickY = toWork(canvasY, scale);
	const blob = findBlob(image, clickX, clickY, Math.round(longSide * 0.12));
	const center = blob ? { x: blob.x, y: blob.y } : { x: clickX, y: clickY };
	const radius = blob ? blob.radius : longSide * 0.02;
	const half = Math.max(4, Math.min(Math.round(longSide * 0.1), Math.round(radius * 1.3)));
	const original = cutTemplate(image, center.x, center.y, half);
	if (!original) {
		setMessage('That is too close to the edge of the video to track. Click the object in a frame where it is further in, or choose Manual and mark it by hand.');
		return;
	}
	rememberPoints();
	setTrackMark(frame, center.x, center.y, scale);
	markUnsavedChanges();
	state.trackRun = { token, count: 1, box: { x: fromWork(center.x, scale), y: fromWork(center.y, scale), half: half / scale } };
	messageBar.classList.add('is-mode');
	autoStopButton.hidden = false;
	setMessage('Auto-tracking... Press Stop, or any key, to stop.');
	renderPointRows();
	replotCurrentView();
	showTrackFrame();

	const track = [center];
	let latest = original;
	const finalFrame = lastFrameIndex();
	let reason = 'end';
	while (true) {
		frame += state.frameStep;
		if (frame > finalFrame) break;
		await seekToFrame(frame);
		if (!state.trackRun || state.trackRun.token !== token) return;
		({ image } = grabTrackFrame());
		const predicted = predictPosition(track);
		const previous = track[track.length - 1];
		if (predicted.x < -half || predicted.y < -half || predicted.x > image.width + half || predicted.y > image.height + half) {
			reason = 'left';
			break;
		}
		const speed = track.length > 1 ? Math.hypot(previous.x - track[track.length - 2].x, previous.y - track[track.length - 2].y) : 0;
		const searchRadius = Math.min(longSide * 0.25, track.length > 1 ? half * 1.5 + speed * 0.5 : Math.max(half * 3, longSide * 0.06));
		const template = blendTemplates(original, latest);
		let found = matchTemplate(image, template, predicted.x, predicted.y, searchRadius);
		// A bounce or a jolt breaks the prediction: look again, wider, around the last position.
		if (!found || found.score < TRACK_MIN_SCORE) {
			const wider = matchTemplate(image, template, previous.x, previous.y, Math.min(longSide * 0.3, searchRadius * 2.5 + half));
			if (wider && (!found || wider.score > found.score)) found = wider;
		}
		if (!found || found.score < TRACK_MIN_SCORE) {
			reason = 'lost';
			break;
		}
		if (found.atEdge) {
			reason = 'left';
			break;
		}
		setTrackMark(frame, found.x, found.y, scale);
		track.push({ x: found.x, y: found.y });
		latest = cutTemplate(image, found.x, found.y, half) || latest;
		state.trackRun.count++;
		state.trackRun.box = { x: fromWork(found.x, scale), y: fromWork(found.y, scale), half: half / scale };
		showTrackFrame();
		if (state.trackRun.count % TRACK_REPLOT_EVERY === 0) {
			renderPointRows();
			replotCurrentView();
		}
	}
	finishAutoTrack(reason);
}

function finishAutoTrack(reason) {
	if (!state.trackRun) return;
	const { count } = state.trackRun;
	state.trackRun = null;
	messageBar.classList.remove('is-mode');
	autoStopButton.hidden = true;
	renderPointRows();
	replotCurrentView();
	updateStatusBar();
	showTrackFrame();
	const marked = `${count} frame${count === 1 ? '' : 's'}`;
	const messages = {
		end: `Auto-tracked ${marked}, to the end of the video. Undo removes the whole run.`,
		left: `Auto-tracked ${marked}; the object then reached the edge of the picture. Undo removes the whole run.`,
		lost: `Auto-tracked ${marked}, then lost the object in this frame. Click it to carry on from here, or Undo the run.`,
		stopped: `Auto-tracking stopped after ${marked}. Click the object to carry on from this frame, or Undo the run.`
	};
	setMessage(messages[reason] || messages.stopped);
}

function stopAutoTrack() {
	if (state.trackRun) finishAutoTrack('stopped');
}

function initializeTracking() {
	autoStopButton.addEventListener('click', stopAutoTrack);

	document.addEventListener('pointerdown', (event) => {
		if (state.trackRun && !autoStopButton.contains(event.target)) stopAutoTrack();
	}, true);

	manualModeButton.addEventListener('click', () => setTrackingMode('manual'));

	autoTrackToggle.addEventListener('click', () => setTrackingMode('auto'));
}

export { startAutoTrack, stopAutoTrack, initializeTracking };
