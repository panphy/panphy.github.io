import { state } from './state.js';

function unitLabel() {
	return state.scaleUnit === 'pixels' ? 'px' : state.scaleUnit;
}

function isCalibrated() {
	return state.scaleFactor !== 1 || state.scaleUnit !== 'pixels';
}

function getAnalysisTime(playbackTime) {
	if (!Number.isFinite(playbackTime)) return 0;
	return playbackTime * state.playbackFrameRate / state.captureFrameRate;
}

function getVelocityData() {
	const raw = [];
	for (let i = 1; i < state.frameData.length; i++) {
		const a = state.frameData[i - 1], b = state.frameData[i];
		const t1 = getAnalysisTime(a.playbackTime), t2 = getAnalysisTime(b.playbackTime);
		if (t2 <= t1) continue;
		raw.push({ time: (t1 + t2) / 2, x: (b.x - a.x) * state.scaleFactor / (t2 - t1), y: (b.y - a.y) * state.scaleFactor / (t2 - t1) });
	}
	const smoothed = raw.slice(2).map((p, i) => ({
		time: (raw[i].time + raw[i + 1].time + p.time) / 3,
		x: (raw[i].x + raw[i + 1].x + p.x) / 3,
		y: (raw[i].y + raw[i + 1].y + p.y) / 3
	}));
	return { raw, smoothed };
}

// Positions measured from the origin, in the scale's unit; shared by the CSV and PanPhyPlot exports.
function getPositionData() {
	return state.frameData.map(p => ({ time: getAnalysisTime(p.playbackTime), x: (p.x - (state.originSet ? state.originPoint.x : 0)) * state.scaleFactor, y: (p.y - (state.originSet ? state.originPoint.y : 0)) * state.scaleFactor }));
}

export { unitLabel, isCalibrated, getAnalysisTime, getVelocityData, getPositionData };
