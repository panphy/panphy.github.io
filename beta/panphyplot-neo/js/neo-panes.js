// Draggable pane dividers for PanPhyPlot (neo-beta), on the PanPhyMD model: drag with any
// pointer, or focus a divider and use the arrow keys (Shift for bigger steps), Home and End;
// Enter or a double-click resets. Widths are remembered per layout in this browser only.
const PANES_STORAGE_KEY = 'panphyplot-neo-panes';
const PANE_LAYOUTS = {
	// Three panes: data | graph | inspector.
	wide: { query: '(min-width: 1280px)', dividers: ['data', 'inspector'] },
	// Two columns: data | graph with the inspector cards below it.
	medium: { query: '(min-width: 1000px) and (max-width: 1279px)', dividers: ['data'] }
};
const PANE_LIMITS = {
	dataMin: 300,
	rightMin: 420,
	inspectorMin: 280,
	inspectorMax: 520,
	inspectorDefault: 340
};
const PANE_KEY_STEP = 16;
// Within this distance of its starting position, a dragged divider snaps back onto it.
const PANE_SNAP_DISTANCE = 16;
// The data pane's share of the space it splits with the graph, before any dragging.
const PANE_DEFAULT_DATA_SHARE = { wide: 1 / 2.35, medium: 0.95 / 2 };

function readPaneSizes() {
	try {
		const saved = JSON.parse(localStorage.getItem(PANES_STORAGE_KEY) || '{}');
		return saved && typeof saved === 'object' ? saved : {};
	} catch (error) {
		return {};
	}
}

function writePaneSizes(sizes) {
	try {
		localStorage.setItem(PANES_STORAGE_KEY, JSON.stringify(sizes));
	} catch (error) {
		// A private window may refuse; the widths then last for this visit only.
	}
}

function initializePaneDividers() {
	const workspace = document.querySelector('.neo-workspace');
	const dataPane = document.getElementById('data-pane');
	const inspector = document.getElementById('inspector-pane');
	const dividers = {
		data: document.getElementById('divider-data'),
		inspector: document.getElementById('divider-inspector')
	};
	if (!workspace || !dataPane || !dividers.data) return;
	const sizes = readPaneSizes();

	function currentLayout() {
		return Object.keys(PANE_LAYOUTS).find(name => window.matchMedia(PANE_LAYOUTS[name].query).matches) || null;
	}

	// Space the data pane and the column(s) to its right share, excluding the dividers.
	function getShareableWidth() {
		const styles = getComputedStyle(workspace);
		const inner = workspace.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
		const dividerWidth = Object.values(dividers).reduce((sum, divider) => sum + (divider && divider.offsetParent ? divider.offsetWidth : 0), 0);
		const inspectorWidth = currentLayout() === 'wide' && inspector ? inspector.getBoundingClientRect().width : 0;
		return inner - dividerWidth - inspectorWidth;
	}

	function clampData(width) {
		const shareable = getShareableWidth();
		return Math.round(Math.min(Math.max(width, PANE_LIMITS.dataMin), shareable - PANE_LIMITS.rightMin));
	}

	function clampInspector(width) {
		return Math.round(Math.min(Math.max(width, PANE_LIMITS.inspectorMin), PANE_LIMITS.inspectorMax));
	}

	// The grid reads these: the data and right-hand columns as fr shares, the inspector in px.
	function apply() {
		const layout = currentLayout();
		workspace.style.removeProperty('--data-fr');
		workspace.style.removeProperty('--rest-fr');
		workspace.style.removeProperty('--inspector-w');
		if (!layout) return;
		const saved = sizes[layout] || {};
		if (layout === 'wide') {
			const inspectorWidth = clampInspector(saved.inspector || PANE_LIMITS.inspectorDefault);
			workspace.style.setProperty('--inspector-w', `${inspectorWidth}px`);
			updateAria(dividers.inspector, inspectorWidth, PANE_LIMITS.inspectorMin, PANE_LIMITS.inspectorMax, 'inspector');
		}
		const shareable = getShareableWidth();
		if (saved.data) {
			const dataWidth = clampData(saved.data);
			workspace.style.setProperty('--data-fr', `${dataWidth}fr`);
			workspace.style.setProperty('--rest-fr', `${shareable - dataWidth}fr`);
		}
		updateAria(dividers.data, Math.round(dataPane.getBoundingClientRect().width), PANE_LIMITS.dataMin, Math.round(shareable - PANE_LIMITS.rightMin), 'data');
	}

	function updateAria(divider, value, min, max, which) {
		if (!divider) return;
		divider.setAttribute('aria-valuemin', String(min));
		divider.setAttribute('aria-valuemax', String(max));
		divider.setAttribute('aria-valuenow', String(value));
		divider.setAttribute('aria-valuetext', `${which === 'data' ? 'Data pane' : 'Inspector'} ${value} pixels wide`);
	}

	function save(which, width) {
		const layout = currentLayout();
		if (!layout) return;
		sizes[layout] = { ...(sizes[layout] || {}), [which]: width };
		apply();
	}

	function reset(which, persist = true) {
		const layout = currentLayout();
		if (!layout || !sizes[layout]) return;
		delete sizes[layout][which];
		apply();
		if (persist) writePaneSizes(sizes);
	}

	// Where each divider sits before it is dragged, for the current layout and window.
	function defaultWidth(which) {
		if (which === 'inspector') return PANE_LIMITS.inspectorDefault;
		const layout = currentLayout();
		return clampData(getShareableWidth() * (PANE_DEFAULT_DATA_SHARE[layout] || 0.5));
	}

	// A width near the starting position snaps onto it, which clears the saved width.
	function saveOrSnap(which, width) {
		if (Math.abs(width - defaultWidth(which)) <= PANE_SNAP_DISTANCE) reset(which, false);
		else save(which, width);
	}

	function measure(which) {
		return which === 'data' ? dataPane.getBoundingClientRect().width : inspector.getBoundingClientRect().width;
	}

	Object.entries(dividers).forEach(([which, divider]) => {
		if (!divider) return;
		let pointerId = null;
		let startX = 0;
		let startWidth = 0;

		const finish = () => {
			if (pointerId === null) return;
			if (divider.hasPointerCapture(pointerId)) divider.releasePointerCapture(pointerId);
			pointerId = null;
			document.body.classList.remove('neo-is-resizing');
			writePaneSizes(sizes);
		};

		divider.addEventListener('pointerdown', (event) => {
			if (!currentLayout() || !event.isPrimary || event.button !== 0 || pointerId !== null) return;
			event.preventDefault();
			divider.focus({ preventScroll: true });
			pointerId = event.pointerId;
			startX = event.clientX;
			startWidth = measure(which);
			divider.setPointerCapture(pointerId);
			document.body.classList.add('neo-is-resizing');
		});
		divider.addEventListener('pointermove', (event) => {
			if (event.pointerId !== pointerId) return;
			if (!currentLayout()) {
				finish();
				return;
			}
			// The data divider grows the data pane rightwards; the inspector divider grows it leftwards.
			const delta = event.clientX - startX;
			saveOrSnap(which, which === 'data' ? clampData(startWidth + delta) : clampInspector(startWidth - delta));
		});
		divider.addEventListener('pointerup', finish);
		divider.addEventListener('pointercancel', finish);
		divider.addEventListener('lostpointercapture', finish);
		divider.addEventListener('dblclick', () => reset(which));
		divider.addEventListener('keydown', (event) => {
			if (!currentLayout()) return;
			const step = event.shiftKey ? PANE_KEY_STEP * 4 : PANE_KEY_STEP;
			const width = measure(which);
			const grow = which === 'data' ? 1 : -1;
			const clamp = which === 'data' ? clampData : clampInspector;
			let next;
			switch (event.key) {
				case 'ArrowLeft': next = width - step * grow; break;
				case 'ArrowRight': next = width + step * grow; break;
				case 'Home': next = which === 'data' ? PANE_LIMITS.dataMin : PANE_LIMITS.inspectorMax; break;
				case 'End': next = which === 'data' ? Infinity : PANE_LIMITS.inspectorMin; break;
				case 'Enter':
					event.preventDefault();
					reset(which);
					return;
				default: return;
			}
			event.preventDefault();
			// Arrow steps that pass over the starting position stop on it, as dragging does.
			const start = defaultWidth(which);
			const target = clamp(next);
			const crosses = (width - start) * (target - start) < 0;
			if (crosses) reset(which, false);
			else save(which, target);
			writePaneSizes(sizes);
		});
	});

	window.addEventListener('blur', () => document.body.classList.remove('neo-is-resizing'));
	Object.values(PANE_LAYOUTS).forEach(({ query }) => {
		window.matchMedia(query).addEventListener('change', apply);
	});
	window.addEventListener('resize', debounce(apply, 80));
	apply();
}
