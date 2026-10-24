import {
	autoTrackToggle,
	calibrateButton,
	cancelFrameRateButton,
	captureRateSection,
	clearButton,
	detectedFpsDisplay,
	emptyImportButton,
	emptySampleButton,
	emptyVideo,
	fpsLabel,
	frameCanvas,
	frameDisplay,
	frameRateButton,
	frameRateHintButton,
	frameRatePrompt,
	frameStepSelect,
	hiddenVideo,
	hideCrossesToggle,
	manualModeButton,
	nextFrameButton,
	openVideoButton,
	playPauseButton,
	playPauseIcon,
	plotCompXButton,
	plotCompXYButton,
	plotCompYButton,
	plotPositionButton,
	plotVelocityButton,
	previousFrameButton,
	setOriginButton,
	setupButton,
	slider,
	specialRecordingCheckbox,
	timeDisplay,
	userCaptureFrameRateInput,
	userPlaybackFrameRateInput,
	videoName,
	videoStage,
	videoUploadInput,
	videoWrapper
} from './dom.js';
import { state } from './state.js';
import { getAnalysisTime } from './analysis.js';
import { highlightCurrentRow, renderPointRows } from './points.js';
import { drawFrame, drawOverlay, resizeOverlay } from './overlay.js';
import {
	NEW_VIDEO_WARNING,
	closeDialog,
	confirmDataLoss,
	formatNumber,
	markUnsavedChanges,
	openDialog,
	rejectField,
	resetApp,
	setMessage,
	updateStatusBar
} from './ui.js';
import { plotPosition, replotCurrentView } from './plot.js';

const PLAY_ICON = 'M8 5.5v13l10.5-6.5z';

const PAUSE_ICON = 'M7 5.5h3.5v13H7zM13.5 5.5H17v13h-3.5z';

function currentFrameIndex() {
	return Math.floor(hiddenVideo.currentTime * state.playbackFrameRate + 1e-4);
}

function updateTimeDisplay(playbackTime) {
	timeDisplay.textContent = `${getAnalysisTime(playbackTime).toFixed(3)} s`;
	const total = Math.max(1, Math.round(getSeekableEnd() * state.playbackFrameRate));
	const frame = Math.min(total, Math.floor(playbackTime * state.playbackFrameRate + 1e-4) + 1);
	frameDisplay.textContent = state.videoReady ? `frame ${frame} / ${total}` : 'frame 0';
	highlightCurrentRow();
}

/* Seekable helpers */
function getSeekableEnd() {
	const s = hiddenVideo.seekable;
	if (s && s.length > 0) return s.end(s.length - 1);
	const d = hiddenVideo.duration;
	if (Number.isFinite(d) && d > 0) return d;
	return 0;
}

// The index of the last frame. A clip of N frames ends at N / fps, which can read a hair over it
// (41 frames at 30 fps end at 1.366667 s, and containers round to the millisecond), so a tenth of a frame
// of tolerance keeps that from counting as another frame.
function lastFrameIndex() {
	const end = getSeekableEnd();
	return end > 0 ? Math.max(0, Math.ceil(end * state.playbackFrameRate - 0.1) - 1) : Infinity;
}

function isSafariBrowser() {
	const ua = navigator.userAgent;
	return /Safari/.test(ua) && !/Chrome|Chromium|CriOS|Edg/.test(ua);
}

function detectFrameRate() {
	state.cancelFpsDetection();
	if (typeof hiddenVideo.requestVideoFrameCallback !== 'function') {
		// Browser doesn't support requestVideoFrameCallback, use fallback
		console.log('requestVideoFrameCallback not supported, using fallback FPS');
		applyDetectedFps(30);
		return;
	}

	state.fpsDetectionPending = true;
	disableControls(true);
	detectedFpsDisplay.textContent = 'detecting...';
	fpsLabel.textContent = '... fps';

	const frameTimes = [];
	const maxSamples = 10;
	let lastMediaTime = null;
	let callbackId = null;
	let timeoutId = null;
	let sampleTimeoutId = null;
	let active = true;
	const originalPlaybackRate = hiddenVideo.playbackRate;
	hiddenVideo.playbackRate = 0.25;

	const cleanup = () => {
		active = false;
		hiddenVideo.playbackRate = originalPlaybackRate;
		state.fpsDetectionPending = false;
		clearTimeout(sampleTimeoutId);
		if (callbackId !== null && typeof hiddenVideo.cancelVideoFrameCallback === 'function') {
			hiddenVideo.cancelVideoFrameCallback(callbackId);
		}
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
		}
	};

	state.cancelFpsDetection = cleanup;

	const calculateFps = () => {
		cleanup();

		if (frameTimes.length < 2) {
			// Not enough samples, use fallback
			console.log('Not enough frame samples, using fallback FPS');
			applyDetectedFps(30);
			return;
		}

		// Calculate average frame duration
		const durations = [];
		for (let i = 1; i < frameTimes.length; i++) {
			const dt = frameTimes[i] - frameTimes[i - 1];
			if (dt > 0 && dt < 1) {  // Filter out invalid durations
				durations.push(dt);
			}
		}

		if (durations.length === 0) {
			console.log('No valid frame durations, using fallback FPS');
			applyDetectedFps(30);
			return;
		}

		const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
		const fps = 1 / avgDuration;

		// Round to common frame rates for cleaner display
		const commonRates = [15, 24, 25, 29.97, 30, 48, 50, 59.94, 60, 120, 240];
		const nearest = commonRates.reduce((best, rate) => Math.abs(fps - rate) < Math.abs(fps - best) ? rate : best);
		const roundedFps = Math.abs(fps - nearest) < 1 ? nearest : fps;

		console.log(`Detected FPS: ${fps.toFixed(2)}, rounded to: ${roundedFps}`);
		applyDetectedFps(roundedFps);
	};

	const onFrame = (now, metadata) => {
		if (!active || !state.fpsDetectionPending) return;

		const mediaTime = metadata.mediaTime;

		if (lastMediaTime !== null && mediaTime > lastMediaTime) {
			frameTimes.push(mediaTime);
		}
		lastMediaTime = mediaTime;

		if (frameTimes.length >= maxSamples) {
			calculateFps();
			return;
		}

		// Request next frame
		callbackId = hiddenVideo.requestVideoFrameCallback(onFrame);
	};

	// Set timeout for detection (max 2 seconds)
	timeoutId = setTimeout(() => {
		calculateFps();
	}, 2000);

	// Start capturing frames
	callbackId = hiddenVideo.requestVideoFrameCallback(onFrame);

	// Play video to get frames
	hiddenVideo.play().then(() => {
		if (!active) return;
		// Wait for enough samples, then stop
		sampleTimeoutId = setTimeout(() => {
			if (state.fpsDetectionPending && frameTimes.length >= 3) {
				calculateFps();
			}
		}, 500);
	}).catch(() => {
		if (!active) return;
		// Autoplay blocked, use fallback
		cleanup();
		console.log('Autoplay blocked, using fallback FPS');
		applyDetectedFps(30);
	});
}

function applyDetectedFps(fps) {
	state.detectedFps = fps;
	state.playbackFrameRate = fps;

	// If not in special recording mode, capture rate = playback rate
	if (!state.isSpecialRecording) {
		state.captureFrameRate = fps;
	}

	// Update UI
	detectedFpsDisplay.textContent = `${fps} fps`;
	updateFpsButtonText();
	slider.step = getSliderStep();

	// Keep tracking disabled until the decoded starting frame is ready.
	state.fpsDetectionPending = true;
	disableControls(true);
	pauseVideo();
	if (state.playbackCallbackId !== null) {
		hiddenVideo.cancelVideoFrameCallback(state.playbackCallbackId);
		state.playbackCallbackId = null;
	}
	const finishRewind = () => {
		hiddenVideo.removeEventListener('seeked', finishRewind);
		state.cancelFpsDetection = () => {};
		state.fpsDetectionPending = false;
		slider.value = "0";
		updateTimeDisplay(0);
		drawFrame();
		drawOverlay();
		disableControls(!state.videoReady);
	};
	state.cancelFpsDetection = () => {
		hiddenVideo.removeEventListener('seeked', finishRewind);
		state.fpsDetectionPending = false;
	};
	if (hiddenVideo.currentTime === 0 && !hiddenVideo.seeking) {
		finishRewind();
	} else {
		// Subscribe before seeking; all detection outcomes use this same rewind.
		hiddenVideo.addEventListener('seeked', finishRewind, { once: true });
		hiddenVideo.currentTime = 0;
	}

	if (state.videoReady && state.frameData.length === 0) {
		setMessage(state.sampleOpen
			? `Sample: a ball bouncing along a bench at ${fps} fps. For the scale, drag along the yellow rule and enter 1 m; then click the ball in each frame.`
			: `Playback: ${fps} fps. Slow-mo or time-lapse?`);
		frameRateHintButton.hidden = state.sampleOpen;
	}
}

function updateFpsButtonText() {
	fpsLabel.textContent = state.isSpecialRecording
		? `${formatNumber(state.captureFrameRate, 6)} fps slow-mo`
		: `${formatNumber(state.playbackFrameRate, 6)} fps`;
	document.getElementById('setupFpsLabel').textContent = fpsLabel.textContent;
}

function getSliderStep() {
	return Math.max(1 / state.playbackFrameRate / 2, 0.001).toString();
}

function updateSliderDomain() {
	const end = getSeekableEnd();
	if (end > 0) {
		const currentMax = parseFloat(slider.max) || 0;
		if (end > currentMax - 1e-3) {
			slider.max = end.toString();
			slider.disabled = !state.videoReady || state.fpsDetectionPending;
		}
	}
}

function disableControls(state) {
	[previousFrameButton, nextFrameButton, playPauseButton, calibrateButton, setOriginButton, frameRateButton, frameRateHintButton,
		hideCrossesToggle, autoTrackToggle, manualModeButton, setupButton, clearButton, frameStepSelect,
		plotPositionButton, plotVelocityButton, plotCompXButton, plotCompYButton, plotCompXYButton]
		.forEach(control => { control.disabled = state; });
	slider.disabled = state;
	updateStatusBar();
}

function pauseVideo() {
	if (!hiddenVideo.paused) hiddenVideo.pause();
	state.isPlaying = false;
	setPlayIcon(false);
}

function setPlayIcon(playing) {
	playPauseIcon.setAttribute('d', playing ? PAUSE_ICON : PLAY_ICON);
	playPauseButton.setAttribute('aria-label', playing ? 'Pause' : 'Play');
}

/* Import video: the buttons, or a file dropped on the video area */
function chooseVideoFile() {
	if (!confirmDataLoss(NEW_VIDEO_WARNING)) return;
	videoUploadInput.click();
}

function openVideoFile(file) {
	if (!file) return;
	if (!/^video\//.test(file.type) && !/\.(mp4|m4v|mov|webm|ogv|ogg|mkv|avi)$/i.test(file.name)) {
		setMessage(`${file.name} is not a video file.`);
		return;
	}
	// Perform full reset before loading new file
	if (state.blobUrl) URL.revokeObjectURL(state.blobUrl);
	resetApp();

	state.sampleOpen = false;
	videoName.textContent = file.name;
	state.blobUrl = URL.createObjectURL(file);
	hiddenVideo.src = state.blobUrl;
	hiddenVideo.load();
}

const SAMPLE_VIDEO_URL = '/tools/motion_tracker/sample-bouncing-ball.mp4';

/* Fit the video to the stage, keeping its shape. Stacked panes cap the height
   so that a portrait clip still leaves the playback bar on screen. */
function fitVideoStage() {
	if (videoWrapper.hidden || !frameCanvas.width || !frameCanvas.height) return;
	const style = getComputedStyle(videoStage);
	const availableWidth = videoStage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
	const availableHeight = window.matchMedia('(max-width: 900px)').matches
		? window.innerHeight * 0.5
		: videoStage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
	const aspect = frameCanvas.width / frameCanvas.height;
	let width = Math.max(0, availableWidth);
	let height = width / aspect;
	if (height > availableHeight) {
		height = Math.max(0, availableHeight);
		width = height * aspect;
	}
	videoWrapper.style.width = `${Math.floor(width)}px`;
	videoWrapper.style.height = `${Math.floor(height)}px`;
}

/* Scrubbing */
function scrubToSlider() {
	if (!hiddenVideo.paused) pauseVideo();
	if (!state.videoReady || state.fpsDetectionPending || state.skippingFrame) return;
	const end = getSeekableEnd();
	let t = parseFloat(slider.value);
	if (!Number.isFinite(t)) return;
	t = Math.round(t * state.playbackFrameRate) / state.playbackFrameRate;
	if (end > 0) t = Math.min(t, lastFrameIndex() / state.playbackFrameRate);
	t = Math.max(0, t) + 0.00001;
	hiddenVideo.currentTime = t;
	updateTimeDisplay(t);
}

// Shows the frame at a stored playback time, as the points table does.
function seekToPlaybackTime(playbackTime) {
	if (!state.videoReady || state.fpsDetectionPending || state.skippingFrame) return;
	pauseVideo();
	hiddenVideo.currentTime = playbackTime + 0.00001;
}

/* Play/Pause */
async function togglePlay() {
	if (!hiddenVideo.paused) {
		pauseVideo();
		return;
	}
	try {
		await hiddenVideo.play();
		state.isPlaying = true;
		setPlayIcon(true);
	} catch {
		state.isPlaying = false;
		setPlayIcon(false);
	}
}

function stepOneFrame(direction = 1) {
	if (!state.videoReady || state.fpsDetectionPending || hiddenVideo.seeking || state.skippingFrame) return;
	state.skippingFrame = true;

	// Always pause first
	if (!hiddenVideo.paused) pauseVideo();

	const finish = () => {
		state.skippingFrame = false;
		updateSliderDomain();
		slider.value = hiddenVideo.currentTime.toString();
		updateTimeDisplay(hiddenVideo.currentTime);
		drawFrame();
		drawOverlay();
	};

	let fallbackTimer;
	let finished = false;
	let frameCallbackId = null;
	const clean = () => {
		if (finished) return;
		finished = true;
		hiddenVideo.removeEventListener('seeked', onSeeked);
		if (frameCallbackId !== null && typeof hiddenVideo.cancelVideoFrameCallback === "function") {
			hiddenVideo.cancelVideoFrameCallback(frameCallbackId);
		}
		clearTimeout(fallbackTimer);
		finish();
	};
	const onSeeked = () => clean();

	// Time-based seek for deterministic frame stepping
	const dt = 1 / state.playbackFrameRate;
	const end = getSeekableEnd();
	const candidate = (currentFrameIndex() + direction) * dt;
	let target = candidate;
	if (end > 0) {
		target = Math.max(0, Math.min(candidate, lastFrameIndex() * dt));
	} else if (!Number.isFinite(candidate)) {
		clean();
		return;
	}

	fallbackTimer = setTimeout(clean, 500);
	hiddenVideo.addEventListener('seeked', onSeeked, { once: true });
	if (typeof hiddenVideo.requestVideoFrameCallback === "function") {
		frameCallbackId = hiddenVideo.requestVideoFrameCallback(() => clean());
	}

	try {
		hiddenVideo.currentTime = target + 0.00001;
	} catch {
		clean();
	}
}

function initializeVideo() {
	specialRecordingCheckbox.addEventListener('change', () => {
		userCaptureFrameRateInput.setCustomValidity('');
		captureRateSection.style.display = specialRecordingCheckbox.checked ? 'flex' : 'none';
	});

	openVideoButton.addEventListener('click', chooseVideoFile);

	emptyImportButton.addEventListener('click', chooseVideoFile);

	emptySampleButton.addEventListener('click', async () => {
		if (!confirmDataLoss(NEW_VIDEO_WARNING)) return;
		emptySampleButton.disabled = true;
		setMessage('Opening the sample video...');
		try {
			const response = await fetch(SAMPLE_VIDEO_URL);
			if (!response.ok) throw new Error(response.statusText);
			const blob = await response.blob();
			openVideoFile(new File([blob], 'sample-bouncing-ball.mp4', { type: 'video/mp4' }));
			state.sampleOpen = true;
		} catch (error) {
			setMessage('The sample video could not be loaded. Check the connection and try again.');
		} finally {
			emptySampleButton.disabled = false;
		}
	});

	videoUploadInput.addEventListener('change', (e) => {
		const file = e.target.files?.[0];
		e.target.value = '';
		openVideoFile(file); // Nothing happens if the user canceled
	});

	videoStage.addEventListener('dragover', (event) => {
		if (!event.dataTransfer || ![...event.dataTransfer.types].includes('Files')) return;
		event.preventDefault();
		event.dataTransfer.dropEffect = 'copy';
		videoStage.classList.add('is-dragover');
	});

	videoStage.addEventListener('dragleave', (event) => {
		if (!videoStage.contains(event.relatedTarget)) videoStage.classList.remove('is-dragover');
	});

	videoStage.addEventListener('drop', (event) => {
		event.preventDefault();
		videoStage.classList.remove('is-dragover');
		const file = event.dataTransfer?.files?.[0];
		if (!file || !confirmDataLoss(NEW_VIDEO_WARNING)) return;
		openVideoFile(file);
	});

	document.addEventListener('dragover', (event) => event.preventDefault());

	document.addEventListener('drop', (event) => event.preventDefault());

	if (typeof ResizeObserver === 'function') {
		new ResizeObserver(() => {
			fitVideoStage();
			drawFrame();
			drawOverlay();
		}).observe(videoStage);
	}

	hiddenVideo.addEventListener('loadedmetadata', () => {
		slider.min = "0";
		slider.max = "0";
		slider.step = getSliderStep();
		slider.value = "0";
		hiddenVideo.currentTime = 0;
		updateSliderDomain();
	});

	hiddenVideo.addEventListener('durationchange', updateSliderDomain);

	hiddenVideo.addEventListener('loadeddata', updateSliderDomain);

	hiddenVideo.addEventListener('canplay', updateSliderDomain);

	hiddenVideo.addEventListener('canplaythrough', updateSliderDomain);

	hiddenVideo.addEventListener('error', () => {
		if (!hiddenVideo.getAttribute('src')) return;
		state.cancelFpsDetection();
		state.videoReady = false;
		disableControls(true);
		videoWrapper.hidden = true;
		emptyVideo.hidden = false;
		videoName.textContent = 'No video open';
		setMessage('This video could not be opened. Try an MP4 or WebM file.');
	});

	hiddenVideo.addEventListener('play', () => {
		if (!state.fpsDetectionPending) setPlayIcon(true);
		const paint = () => {
			if (hiddenVideo.paused || hiddenVideo.ended) return;
			drawFrame();
			state.playbackCallbackId = hiddenVideo.requestVideoFrameCallback(paint);
		};
		if (hiddenVideo.requestVideoFrameCallback) {
			if (state.playbackCallbackId !== null) hiddenVideo.cancelVideoFrameCallback(state.playbackCallbackId);
			state.playbackCallbackId = hiddenVideo.requestVideoFrameCallback(paint);
		}
	});

	hiddenVideo.addEventListener('pause', () => setPlayIcon(false));

	hiddenVideo.addEventListener('loadeddata', () => {
		state.videoReady = true;
		frameCanvas.width = hiddenVideo.videoWidth || 1280;
		frameCanvas.height = hiddenVideo.videoHeight || 720;
		state.startingFrame = document.createElement('canvas');
		state.startingFrame.width = frameCanvas.width;
		state.startingFrame.height = frameCanvas.height;
		state.startingFrame.getContext('2d').drawImage(hiddenVideo, 0, 0);
		emptyVideo.hidden = true;
		videoWrapper.hidden = false;
		fitVideoStage();
		disableControls(false);
		drawFrame();
		resizeOverlay();
		drawOverlay();
		plotPosition();
		setMessage('Detecting the frame rate...');

		// Trigger automatic FPS detection
		detectFrameRate();
	});

	hiddenVideo.addEventListener('timeupdate', () => {
		if (!state.skippingFrame) {
			updateSliderDomain();
			slider.value = hiddenVideo.currentTime.toString();
			updateTimeDisplay(hiddenVideo.currentTime);
			drawFrame();
		}
	});

	hiddenVideo.addEventListener('seeked', () => {
		if (!state.skippingFrame) {
			updateSliderDomain();
			slider.value = hiddenVideo.currentTime.toString();
			updateTimeDisplay(hiddenVideo.currentTime);
			drawFrame();
			drawOverlay();
		}
	});

	hiddenVideo.addEventListener('ended', () => {
		state.isPlaying = false;
		setPlayIcon(false);
	});

	slider.addEventListener('input', scrubToSlider);

	slider.addEventListener('change', scrubToSlider);

	playPauseButton.addEventListener('click', togglePlay);

	frameRateHintButton.addEventListener('click', () => frameRateButton.click());

	frameRateButton.addEventListener('click', () => {
		userPlaybackFrameRateInput.value = state.playbackFrameRate;
		// Set up dialog state
		specialRecordingCheckbox.checked = state.isSpecialRecording;
		captureRateSection.style.display = state.isSpecialRecording ? 'flex' : 'none';
		userCaptureFrameRateInput.value = state.isSpecialRecording ? state.captureFrameRate : 240;
		detectedFpsDisplay.textContent = state.detectedFps ? `${state.detectedFps} fps` : 'not detected';
		openDialog(frameRatePrompt);
	});

	frameRatePrompt.querySelector('form').addEventListener('submit', (event) => {
		event.preventDefault();
		const rate = Number(userPlaybackFrameRateInput.value);
		const capture = Number(userCaptureFrameRateInput.value);
		if (!Number.isFinite(rate) || rate <= 0) {
			rejectField(userPlaybackFrameRateInput, 'Enter a frame rate greater than zero.');
			return;
		}
		if (specialRecordingCheckbox.checked && (!Number.isFinite(capture) || capture <= 0)) {
			rejectField(userCaptureFrameRateInput, 'Enter a frame rate greater than zero.');
			return;
		}
		state.playbackFrameRate = rate;
		state.isSpecialRecording = specialRecordingCheckbox.checked;
		// Normal mode: capture rate = playback rate
		state.captureFrameRate = state.isSpecialRecording ? capture : state.playbackFrameRate;
		markUnsavedChanges();

		closeDialog(frameRatePrompt);
		renderPointRows();
		updateFpsButtonText();
		slider.step = getSliderStep();
		updateTimeDisplay(hiddenVideo.currentTime);

		// Re-plot (times are recalculated automatically from playbackTime)
		replotCurrentView();

		setMessage(state.isSpecialRecording
			? `Slow-motion recording: times use the filming rate, ${formatNumber(state.captureFrameRate, 6)} fps.`
			: `Frame rate set to ${formatNumber(state.playbackFrameRate, 6)} fps.`);
	});

	cancelFrameRateButton.addEventListener('click', () => closeDialog(frameRatePrompt));

	frameStepSelect.addEventListener('change', () => {
		state.frameStep = Math.max(1, Number(frameStepSelect.value) || 1);
	});

	previousFrameButton.addEventListener('click', () => stepOneFrame(-state.frameStep));

	nextFrameButton.addEventListener('click', () => stepOneFrame(state.frameStep));
}

export {
	currentFrameIndex,
	updateTimeDisplay,
	lastFrameIndex,
	isSafariBrowser,
	updateFpsButtonText,
	disableControls,
	pauseVideo,
	setPlayIcon,
	fitVideoStage,
	seekToPlaybackTime,
	togglePlay,
	stepOneFrame,
	initializeVideo
};
