import { state } from './state.js';
import {
	chartCanvasContainer,
	graphControls,
	graphEmpty,
	graphHint,
	graphView,
	plotCompXButton,
	plotCompXYButton,
	plotCompYButton,
	plotPositionButton,
	plotVelocityButton,
	pointEditor,
	positionChartCanvas,
	showGraphTab,
	showPointsTab
} from './dom.js';
import { getAnalysisTime, getVelocityData } from './analysis.js';
import { closeTouchGraphCopyActions } from './copy.js';
import { applyThemeToChart, getChartTheme } from './theme.js';
import { highlightCurrentRow } from './points.js';

function isVelocityMode() {
	return state.currentPlotMode.startsWith('v');
}

function currentComponent() {
	if (state.currentPlotMode === 'x' || state.currentPlotMode === 'vx') return 'x';
	if (state.currentPlotMode === 'y' || state.currentPlotMode === 'vy') return 'y';
	return 'xy';
}

function updateActivePlotButton() {
	const velocity = isVelocityMode();
	const component = currentComponent();
	plotPositionButton.setAttribute('aria-pressed', String(!velocity));
	plotVelocityButton.setAttribute('aria-pressed', String(velocity));
	plotCompXButton.setAttribute('aria-pressed', String(component === 'x'));
	plotCompYButton.setAttribute('aria-pressed', String(component === 'y'));
	plotCompXYButton.setAttribute('aria-pressed', String(component === 'xy'));
	updateGraphEmpty();
}

// Covers the graph with a note while there is nothing to plot.
function updateGraphEmpty() {
	const velocity = isVelocityMode();
	const count = velocity ? getVelocityData().smoothed.length : state.frameData.length;
	const hasData = state.videoReady && count > 0;
	graphEmpty.hidden = hasData;
	chartCanvasContainer.classList.toggle('has-data', hasData);
	if (!hasData) closeTouchGraphCopyActions();
	let title = 'Your graph appears here';
	let text = 'Import a video, then click the object.';
	if (state.videoReady && velocity && state.frameData.length > 0) {
		title = 'Velocity needs more marks';
		text = `Mark at least four frames to plot smoothed velocity. You have ${state.frameData.length}.`;
	} else if (state.videoReady) {
		title = 'No marks yet';
		text = 'Click the object in the video to mark its position.';
	}
	document.getElementById('graphEmptyTitle').textContent = title;
	document.getElementById('graphEmptyText').textContent = text;
}

function replotCurrentView() {
	switch (state.currentPlotMode) {
		case 'x': plotPosition('x'); break;
		case 'y': plotPosition('y'); break;
		case 'vx': plotVelocity('x'); break;
		case 'vy': plotVelocity('y'); break;
		case 'vxy': plotVelocity('xy'); break;
		default: plotPosition('xy'); break;
	}
}

function plotPosition(mode) {
	mode = mode || 'xy';
	state.currentPlotMode = mode === 'xy' ? 'pos' : mode;

	const xData = state.frameData.map(p => getAnalysisTime(p.playbackTime));
	const datasets = [];
	const theme = getChartTheme();

	if (mode === 'x' || mode === 'xy') {
		const yDataX = state.frameData.map(p => ((p.x - (state.originSet ? state.originPoint.x : 0)) * state.scaleFactor));
		datasets.push({ label: "x-position", data: xData.map((t, i) => ({ x: t, y: yDataX[i] })), borderColor: state.dataPointColors.x, backgroundColor: state.dataPointColors.x, showLine: false, pointRadius: 4 });
	}
	if (mode === 'y' || mode === 'xy') {
		const yDataY = state.frameData.map(p => ((p.y - (state.originSet ? state.originPoint.y : 0)) * state.scaleFactor));
		datasets.push({ label: "y-position", data: xData.map((t, i) => ({ x: t, y: yDataY[i] })), borderColor: state.dataPointColors.y, backgroundColor: state.dataPointColors.y, showLine: false, pointRadius: 4 });
	}

	if (!state.positionChart) {
		state.positionChart = new Chart(positionChartCanvas.getContext("2d"), {
			type: "scatter",
			data: { datasets },
			options: {
				responsive: true,
				maintainAspectRatio: false,
				animation: { duration: 200 },
				scales: {
					x: {
						type: "linear",
						position: "bottom",
						title: { display: true, text: "Time (s)", color: theme.textColor },
						grid: { color: (c) => c.tick.value === 0 ? theme.axisColor : theme.gridColor },
						ticks: { color: theme.textColor }
					},
					y: {
						type: "linear",
						position: "left",
						beginAtZero: true,
						title: { display: true, text: `Position (${state.scaleUnit})`, color: theme.textColor },
						grid: { color: (c) => c.tick.value === 0 ? theme.axisColor : theme.gridColor },
						ticks: { color: theme.textColor }
					}
				},
				plugins: { legend: { display: true, position: 'top', labels: { color: theme.textColor, usePointStyle: true, pointStyle: 'circle', boxWidth: 8, boxHeight: 8 } } }
			},
		});
	} else {
		state.positionChart.data.datasets = datasets;
		state.positionChart.options.scales.y.title.text = `Position (${state.scaleUnit})`;
		state.positionChart.update();
	}
	applyThemeToChart();
	updateActivePlotButton();
}

function plotVelocity(mode) {
	state.currentPlotMode = mode === 'xy' ? 'vxy' : (mode === 'x' ? 'vx' : 'vy');

	const axes = mode === 'xy' ? ['x', 'y'] : [mode];
	const datasets = [];
	const samples = getVelocityData().smoothed;
	const times = samples.map(p => p.time);

	for (const axis of axes) {
		const smoothed = samples.map(p => p[axis]);
		datasets.push({
			label: axis === "x" ? "x-velocity" : "y-velocity",
			data: times.map((t, i) => ({ x: t, y: smoothed[i] })),
			borderColor: axis === "x" ? state.dataPointColors.vx : state.dataPointColors.vy,
			backgroundColor: axis === "x" ? state.dataPointColors.vx : state.dataPointColors.vy,
			showLine: false,
			pointRadius: 4
		});
	}

	if (!state.positionChart) return;
	state.positionChart.data.datasets = datasets;
	state.positionChart.options.scales.y.title.text = `Velocity (${state.scaleUnit}/s)`;
	state.positionChart.update();
	applyThemeToChart();
	updateActivePlotButton();
}

function setResultsView(view) {
	const points = view === 'points';
	graphView.hidden = points;
	pointEditor.hidden = !points;
	graphControls.hidden = points;
	showGraphTab.setAttribute('aria-selected', String(!points));
	showPointsTab.setAttribute('aria-selected', String(points));
	graphHint.textContent = points
		? 'Positions from the origin, in the scale units'
		: (state.graphTouchCopyMode ? 'Tap the graph to copy it' : 'Click the graph to copy it');
	if (points) highlightCurrentRow(true);
}

function initializePlot() {
	plotPositionButton.addEventListener("click", () => plotPosition(currentComponent()));

	plotVelocityButton.addEventListener("click", () => plotVelocity(currentComponent()));

	[[plotCompXButton, 'x'], [plotCompYButton, 'y'], [plotCompXYButton, 'xy']].forEach(([button, component]) => {
		button.addEventListener("click", () => (isVelocityMode() ? plotVelocity : plotPosition)(component));
	});

	showGraphTab.addEventListener('click', () => setResultsView('graph'));

	showPointsTab.addEventListener('click', () => setResultsView('points'));
}

export { updateActivePlotButton, replotCurrentView, plotPosition, initializePlot };
