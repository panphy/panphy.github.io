import { state } from './state.js';
import { replotCurrentView } from './plot.js';
import { drawOverlay } from './overlay.js';

let BODY_FONT = 'Figtree, system-ui, sans-serif';

function getCssVar(name) {
	return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function getChartTheme() {
	return {
		gridColor: getCssVar('--chart-grid'),
		axisColor: getCssVar('--chart-axis'),
		textColor: getCssVar('--chart-text')
	};
}

function refreshSeriesColors() {
	const x = getCssVar('--series-x') || '#4e79a7';
	const y = getCssVar('--series-y') || '#e15759';
	Object.assign(state.dataPointColors, { x, y, vx: x, vy: y });
}

function applyThemeToChart() {
	if (!state.positionChart) return;
	const theme = getChartTheme();
	state.positionChart.options.scales.x.grid.color = (c) => c.tick.value === 0 ? theme.axisColor : theme.gridColor;
	state.positionChart.options.scales.y.grid.color = (c) => c.tick.value === 0 ? theme.axisColor : theme.gridColor;
	state.positionChart.options.scales.x.ticks.color = theme.textColor;
	state.positionChart.options.scales.y.ticks.color = theme.textColor;
	state.positionChart.options.scales.x.title.color = theme.textColor;
	state.positionChart.options.scales.y.title.color = theme.textColor;
	state.positionChart.options.plugins.legend.labels.color = theme.textColor;
	state.positionChart.update();
}

function initializeTheme() {
	window.PanPhyThemeToggle.mount(document.getElementById('theme-button'));

	BODY_FONT = getCssVar('--font-body') || 'Figtree, system-ui, sans-serif';

	if (window.Chart) Chart.defaults.font.family = BODY_FONT;

	window.addEventListener('panphy:theme-change', () => {
		refreshSeriesColors();
		if (state.positionChart) replotCurrentView();
		drawOverlay();
	});
}

export {
	BODY_FONT,
	getCssVar,
	getChartTheme,
	refreshSeriesColors,
	applyThemeToChart,
	initializeTheme
};
