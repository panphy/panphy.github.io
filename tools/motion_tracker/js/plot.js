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
	plotSpeedButton,
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

// Speed has no components, so the component choice is kept for the return to position or velocity.
let lastComponent = 'xy';

function isVelocityMode() {
	return state.currentPlotMode.startsWith('v');
}

function isSpeedMode() {
	return state.currentPlotMode === 'speed';
}

function currentComponent() {
	if (state.currentPlotMode === 'x' || state.currentPlotMode === 'vx') return 'x';
	if (state.currentPlotMode === 'y' || state.currentPlotMode === 'vy') return 'y';
	return isSpeedMode() ? lastComponent : 'xy';
}

function updateActivePlotButton() {
	const velocity = isVelocityMode();
	const speed = isSpeedMode();
	const component = currentComponent();
	plotPositionButton.setAttribute('aria-pressed', String(!velocity && !speed));
	plotVelocityButton.setAttribute('aria-pressed', String(velocity));
	plotSpeedButton.setAttribute('aria-pressed', String(speed));
	[[plotCompXButton, 'x'], [plotCompYButton, 'y'], [plotCompXYButton, 'xy']].forEach(([button, name]) => {
		button.setAttribute('aria-pressed', String(!speed && component === name));
		button.disabled = speed || plotPositionButton.disabled;
	});
	updateGraphEmpty();
}

// Covers the graph with a note while there is nothing to plot.
function updateGraphEmpty() {
	const speed = isSpeedMode();
	const velocity = isVelocityMode() || speed;
	const count = velocity ? getVelocityData().smoothed.length : state.frameData.length;
	const hasData = state.videoReady && count > 0;
	graphEmpty.hidden = hasData;
	chartCanvasContainer.classList.toggle('has-data', hasData);
	if (!hasData) closeTouchGraphCopyActions();
	let title = 'Your graph appears here';
	let text = 'Import a video, then click the object.';
	if (state.videoReady && velocity && state.frameData.length > 0) {
		title = speed ? 'Speed needs more marks' : 'Velocity needs more marks';
		text = `Mark at least four frames to plot smoothed ${speed ? 'speed' : 'velocity'}. You have ${state.frameData.length}.`;
	} else if (state.videoReady) {
		title = 'No marks yet';
		text = 'Click the object in the video to mark its position.';
	}
	document.getElementById('graphEmptyTitle').textContent = title;
	document.getElementById('graphEmptyText').textContent = text;
}

// Graph points that belong to the selected mark are larger and ringed. A velocity or speed
// point is worked out from four marks, so a mark can pick out up to four of them.
function selectedMarkIndex() {
	if (state.selectedMarkTime === null || state.selectedMarkTime === undefined) return -1;
	return state.frameData.findIndex(point => point.playbackTime === state.selectedMarkTime);
}

function usesSelectedMark(sample) {
	const selected = selectedMarkIndex();
	return !!sample && selected >= sample.first && selected <= sample.last;
}

// The styles read the selection when the graph is drawn, so a new selection needs no replot
// (which would animate every point again).
function refreshGraphSelection() {
	if (state.positionChart) state.positionChart.update('none');
}

function pointStyle(color, isSelected) {
	let ring;
	const ringColor = () => ring ??= getChartTheme().textColor;
	return {
		borderColor: color,
		backgroundColor: color,
		showLine: false,
		pointRadius: (c) => isSelected(c.dataIndex) ? 7 : 4,
		pointHoverRadius: (c) => isSelected(c.dataIndex) ? 8 : 5,
		pointBorderColor: (c) => isSelected(c.dataIndex) ? ringColor() : color,
		pointBorderWidth: (c) => isSelected(c.dataIndex) ? 2.5 : 1
	};
}

function replotCurrentView() {
	switch (state.currentPlotMode) {
		case 'x': plotPosition('x'); break;
		case 'y': plotPosition('y'); break;
		case 'vx': plotVelocity('x'); break;
		case 'vy': plotVelocity('y'); break;
		case 'vxy': plotVelocity('xy'); break;
		case 'speed': plotSpeed(); break;
		default: plotPosition('xy'); break;
	}
}

function plotPosition(mode) {
	mode = mode || 'xy';
	lastComponent = mode;
	state.currentPlotMode = mode === 'xy' ? 'pos' : mode;

	const xData = state.frameData.map(p => getAnalysisTime(p.playbackTime));
	const datasets = [];
	const theme = getChartTheme();
	const isSelected = index => index === selectedMarkIndex();

	if (mode === 'x' || mode === 'xy') {
		const yDataX = state.frameData.map(p => ((p.x - (state.originSet ? state.originPoint.x : 0)) * state.scaleFactor));
		datasets.push({ label: "x-position", data: xData.map((t, i) => ({ x: t, y: yDataX[i] })), ...pointStyle(state.dataPointColors.x, isSelected) });
	}
	if (mode === 'y' || mode === 'xy') {
		const yDataY = state.frameData.map(p => ((p.y - (state.originSet ? state.originPoint.y : 0)) * state.scaleFactor));
		datasets.push({ label: "y-position", data: xData.map((t, i) => ({ x: t, y: yDataY[i] })), ...pointStyle(state.dataPointColors.y, isSelected) });
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
	lastComponent = mode;
	state.currentPlotMode = mode === 'xy' ? 'vxy' : (mode === 'x' ? 'vx' : 'vy');

	const axes = mode === 'xy' ? ['x', 'y'] : [mode];
	const datasets = [];
	const samples = getVelocityData().smoothed;
	const times = samples.map(p => p.time);
	const isSelected = index => usesSelectedMark(samples[index]);

	for (const axis of axes) {
		const smoothed = samples.map(p => p[axis]);
		datasets.push({
			label: axis === "x" ? "x-velocity" : "y-velocity",
			data: times.map((t, i) => ({ x: t, y: smoothed[i] })),
			...pointStyle(axis === "x" ? state.dataPointColors.vx : state.dataPointColors.vy, isSelected)
		});
	}

	if (!state.positionChart) return;
	state.positionChart.data.datasets = datasets;
	state.positionChart.options.scales.y.title.text = `Velocity (${state.scaleUnit}/s)`;
	state.positionChart.update();
	applyThemeToChart();
	updateActivePlotButton();
}

// The size of the velocity, from both smoothed components; it needs no direction, as kinetic energy does not.
function plotSpeed() {
	if (!isSpeedMode()) lastComponent = currentComponent();
	state.currentPlotMode = 'speed';
	if (!state.positionChart) return;
	const samples = getVelocityData().smoothed;
	state.positionChart.data.datasets = [{
		label: "speed",
		data: samples.map(p => ({ x: p.time, y: p.speed })),
		...pointStyle(state.dataPointColors.speed, index => usesSelectedMark(samples[index]))
	}];
	state.positionChart.options.scales.y.title.text = `Speed (${state.scaleUnit}/s)`;
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

	plotSpeedButton.addEventListener("click", plotSpeed);

	[[plotCompXButton, 'x'], [plotCompYButton, 'y'], [plotCompXYButton, 'xy']].forEach(([button, component]) => {
		button.addEventListener("click", () => (isVelocityMode() ? plotVelocity : plotPosition)(component));
	});

	showGraphTab.addEventListener('click', () => setResultsView('graph'));

	showPointsTab.addEventListener('click', () => setResultsView('points'));
}

export { updateActivePlotButton, refreshGraphSelection, replotCurrentView, plotPosition, initializePlot };
