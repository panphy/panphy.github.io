

const PANES_STORAGE_KEY = 'motion-tracker-panes';

const PANE_WIDE_QUERY = '(min-width: 901px)';

const PANE_VIDEO_MIN = 524;

const PANE_GRAPH_MIN = 360;

const PANE_DEFAULT_VIDEO_SHARE = 0.5;

const PANE_KEY_STEP = 16;

const PANE_SNAP_DISTANCE = 16;

function initializePaneDivider() {
	const workspace = document.getElementById('workspace');
	const videoPane = document.getElementById('videoPane');
	const divider = document.getElementById('paneDivider');
	const wideQuery = window.matchMedia(PANE_WIDE_QUERY);
	// The video pane's share of the space both panes split, or null for the default.
	let videoShare = null;
	try {
		const saved = JSON.parse(localStorage.getItem(PANES_STORAGE_KEY) || 'null');
		if (saved && Number.isFinite(saved.videoShare) && saved.videoShare > 0 && saved.videoShare < 1) videoShare = saved.videoShare;
	} catch (error) {
		// Unreadable: start from the default.
	}

	const getShareableWidth = () => workspace.clientWidth - divider.offsetWidth;
	const clampVideo = width => Math.round(Math.min(Math.max(width, PANE_VIDEO_MIN), getShareableWidth() - PANE_GRAPH_MIN));
	const defaultWidth = () => clampVideo(getShareableWidth() * PANE_DEFAULT_VIDEO_SHARE);

	function apply() {
		workspace.style.removeProperty('--video-fr');
		workspace.style.removeProperty('--graph-fr');
		if (!wideQuery.matches) return;
		const shareable = getShareableWidth();
		if (videoShare !== null) {
			const width = clampVideo(shareable * videoShare);
			workspace.style.setProperty('--video-fr', `${width}fr`);
			workspace.style.setProperty('--graph-fr', `${shareable - width}fr`);
		}
		const value = Math.round(videoPane.getBoundingClientRect().width);
		divider.setAttribute('aria-valuemin', String(PANE_VIDEO_MIN));
		divider.setAttribute('aria-valuemax', String(Math.round(shareable - PANE_GRAPH_MIN)));
		divider.setAttribute('aria-valuenow', String(value));
		divider.setAttribute('aria-valuetext', `Video pane ${value} pixels wide`);
	}

	function persist() {
		try {
			if (videoShare === null) localStorage.removeItem(PANES_STORAGE_KEY);
			else localStorage.setItem(PANES_STORAGE_KEY, JSON.stringify({ videoShare }));
		} catch (error) {
			// A private window may refuse; the width then lasts for this visit only.
		}
	}

	// When dragged, a width near the starting position snaps onto it, which clears the saved width.
	function setVideoWidth(width, snap) {
		const clamped = clampVideo(width);
		videoShare = snap && Math.abs(clamped - defaultWidth()) <= PANE_SNAP_DISTANCE ? null : clamped / getShareableWidth();
		apply();
	}

	function reset() {
		videoShare = null;
		apply();
		persist();
	}

	let pointerId = null;
	let startX = 0;
	let startWidth = 0;
	const finish = () => {
		if (pointerId === null) return;
		if (divider.hasPointerCapture(pointerId)) divider.releasePointerCapture(pointerId);
		pointerId = null;
		document.body.classList.remove('mt-is-resizing');
		persist();
	};
	divider.addEventListener('pointerdown', (event) => {
		if (!wideQuery.matches || !event.isPrimary || event.button !== 0 || pointerId !== null) return;
		event.preventDefault();
		divider.focus({ preventScroll: true });
		pointerId = event.pointerId;
		startX = event.clientX;
		startWidth = videoPane.getBoundingClientRect().width;
		divider.setPointerCapture(pointerId);
		document.body.classList.add('mt-is-resizing');
	});
	divider.addEventListener('pointermove', (event) => {
		if (event.pointerId !== pointerId) return;
		setVideoWidth(startWidth + event.clientX - startX, true);
	});
	divider.addEventListener('pointerup', finish);
	divider.addEventListener('pointercancel', finish);
	divider.addEventListener('lostpointercapture', finish);
	divider.addEventListener('dblclick', reset);
	divider.addEventListener('keydown', (event) => {
		if (!wideQuery.matches) return;
		const width = Math.round(videoPane.getBoundingClientRect().width);
		const step = event.shiftKey ? PANE_KEY_STEP * 4 : PANE_KEY_STEP;
		const isArrow = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
		let next;
		switch (event.key) {
			case 'ArrowLeft': next = width - step; break;
			case 'ArrowRight': next = width + step; break;
			case 'Home': next = PANE_VIDEO_MIN; break;
			case 'End': next = Infinity; break;
			case 'Enter':
				event.preventDefault();
				reset();
				return;
			default: return;
		}
		event.preventDefault();
		// Arrow steps that pass over the starting position stop on it, as dragging does.
		const start = defaultWidth();
		const target = clampVideo(next);
		if (isArrow && (width - start) * (target - start) < 0) {
			videoShare = null;
			apply();
		} else {
			setVideoWidth(target, false);
		}
		persist();
	});
	window.addEventListener('blur', () => document.body.classList.remove('mt-is-resizing'));
	wideQuery.addEventListener('change', apply);
	window.addEventListener('resize', apply);
	apply();
}

function initializePanes() {
	initializePaneDivider();
}

export { initializePanes };
