import { getPositionData, getVelocityData } from './analysis.js';
import { state } from './state.js';
import { clearUnsavedChanges, closeDialog, openDialog, rejectField, setMessage } from './ui.js';
import { cancelExportButton, exportDataButton, exportFilenameInput, exportPanPhyPlotButton, exportPrompt } from './dom.js';

function downloadFile(filename, text, type) {
	const url = URL.createObjectURL(new Blob([text], { type }));
	const a = document.createElement('a');
	a.href = url; a.download = filename; a.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportCSV(filename) {
	const { raw, smoothed } = getVelocityData();
	const positions = getPositionData();
	const rows = [[ 'Position time (s)', `x (${state.scaleUnit})`, `y (${state.scaleUnit})`, 'Raw velocity time (s)', `Raw vx (${state.scaleUnit}/s)`, `Raw vy (${state.scaleUnit}/s)`, 'Smoothed velocity time (s)', `Smoothed vx (${state.scaleUnit}/s)`, `Smoothed vy (${state.scaleUnit}/s)` ]];
	positions.forEach((p, i) => {
		rows.push([p.time, p.x, p.y,
			raw[i]?.time ?? '', raw[i]?.x ?? '', raw[i]?.y ?? '', smoothed[i]?.time ?? '', smoothed[i]?.x ?? '', smoothed[i]?.y ?? '']);
	});
	const escape = value => '"' + String(value).replaceAll('"', '""') + '"';
	downloadFile(filename, rows.map(row => row.map(escape).join(',')).join('\n') + '\n', 'text/csv;charset=utf-8;');
	clearUnsavedChanges();
}

// PanPhyPlot reads the data from the link's hash, which never reaches the server; it works even where
// the new tab has separate storage, as from a home-screen app. A Y column plots against the nearest X
// column to its left, so the velocities, at midpoint times, get their own time column. They are the
// smoothed values the graph shows, and start hidden so that the first graph is position-time.
function getPanPhyPlotUrl() {
	const positions = getPositionData();
	const { smoothed } = getVelocityData();
	const value = number => Number(number.toPrecision(6));
	const unit = state.scaleUnit === 'pixels' ? 'px' : state.scaleUnit;
	const payload = {
		name: 'Motion Tracker',
		columns: [
			{ name: 't', unit: 's', role: 'X', cells: positions.map(p => value(p.time)) },
			{ name: 'x', unit, role: 'Y', cells: positions.map(p => value(p.x)) },
			{ name: 'y', unit, role: 'Y', cells: positions.map(p => value(p.y)) },
			{ name: 't', unit: 's', role: 'X', cells: smoothed.map(p => value(p.time)) },
			{ name: 'vx', unit: `${unit}/s`, role: 'Y', hidden: true, cells: smoothed.map(p => value(p.x)) },
			{ name: 'vy', unit: `${unit}/s`, role: 'Y', hidden: true, cells: smoothed.map(p => value(p.y)) }
		]
	};
	return '/tools/panphyplot.html#import=' + encodeURIComponent(JSON.stringify(payload));
}

function initializeExport() {
	exportDataButton.addEventListener("click", () => {
		if (state.frameData.length === 0) { setMessage("Mark the object first: there is no data to export yet."); return; }
		exportFilenameInput.value = "motion_tracker_data";
		openDialog(exportPrompt);
		exportFilenameInput.select();
	});

	exportPrompt.querySelector('form').addEventListener("submit", (event) => {
		event.preventDefault();
		const desired = exportFilenameInput.value.trim();
		if (!desired) { rejectField(exportFilenameInput, "Enter a file name."); return; }
		const sanitized = desired.replace(/[^a-zA-Z0-9-_.]/g, "_");
		const finalName = sanitized.toLowerCase().endsWith(".csv") ? sanitized : sanitized + ".csv";
		exportCSV(finalName);
		closeDialog(exportPrompt);
		setMessage(`Data exported as ${finalName}.`);
	});

	cancelExportButton.addEventListener("click", () => closeDialog(exportPrompt));

	exportPanPhyPlotButton.addEventListener("click", () => {
		if (state.frameData.length === 0) { setMessage("Mark the object first: there is no data to export yet."); return; }
		const tab = window.open(getPanPhyPlotUrl(), '_blank');
		setMessage(tab === null ? "The browser blocked the new tab. Allow pop-ups for this site, then try again." : "Data sent to PanPhyPlot in a new tab.");
	});
}

export { initializeExport };
