// Plotting helpers

	function isPlotStateEqual(newData, newLayout) {
		// Simple approach: compare JSON strings.
		// Note: This works fine for small to moderate data sets.
		const currentDataStr = JSON.stringify(lastPlotState.data);
		const newDataStr = JSON.stringify(newData);
		const currentLayoutStr = JSON.stringify(lastPlotState.layout);
		const newLayoutStr = JSON.stringify(newLayout);
		return currentDataStr === newDataStr && currentLayoutStr === newLayoutStr;
	}


	function updatePlotAndRenderLatex() {
		if (isSyncing) return;
		isSyncing = true;

		// Replot the graph.
		plotGraph();

		// Retrieve current column names.
		const xColumnName = document.getElementById('x-column-name').value || 'x';
		const yColumnName = document.getElementById('y-column-name').value || 'y';

		// Update the axis label elements according to current mode.
		renderLatex('#x-column-latex', xColumnName);
		renderLatex('#y-column-latex', yColumnName);

		isSyncing = false;
	}


	function plotGraph(fittedX = null, fittedY = null) {
		// If fitted data is not provided and a fit exists, use that.
		if ((fittedX === null || fittedY === null) && fittedCurves.hasOwnProperty(activeSet)) {
			fittedX = fittedCurves[activeSet].x;
			fittedY = fittedCurves[activeSet].y;
		}

		// Build the data arrays based on the active dataset.
		const x = rawData[activeSet].map(point => point.x);
		const y = rawData[activeSet].map(point => point.y);
		const xErrorRaw = rawData[activeSet].map(point => point.xErrorRaw || 0);
		const yErrorRaw = rawData[activeSet].map(point => point.yErrorRaw || 0);
		const xErrorType = document.getElementById('toggle-x-error').checked ?
			document.getElementById('x-error-type').value :
			'absolute';
		const yErrorType = document.getElementById('toggle-y-error').checked ?
			document.getElementById('y-error-type').value :
			'absolute';

		// Convert errors if using percentage uncertainties.
		const convertedXError = x.map((xi, idx) =>
			xErrorType === 'percentage' ? (xErrorRaw[idx] / 100) * (xi || 0) : xErrorRaw[idx]
		);
		const convertedYError = y.map((yi, idx) =>
			yErrorType === 'percentage' ? (yErrorRaw[idx] / 100) * (yi || 0) : yErrorRaw[idx]
		);

		// Build the primary data trace.
		const data = [{
			x: x,
			y: y,
			mode: 'markers',
			name: 'Data',
			marker: {
				color: '#ff7c23',
				symbol: 'circle',
				size: 6.5,
				line: { width: 0 }
			},
			error_x: {
				type: 'data',
				array: convertedXError,
				visible: document.getElementById('toggle-x-error').checked,
				color: '#5b5b5b',
				thickness: 0.8,
				width: 2
			},
			error_y: {
				type: 'data',
				array: convertedYError,
				visible: document.getElementById('toggle-y-error').checked,
				color: '#5b5b5b',
				thickness: 0.8,
				width: 2
			}
		}];

		// Add fitted curve trace if available.
		if (fittedX && fittedY) {
			data.push({
				x: fittedX,
				y: fittedY,
				mode: 'lines',
				name: 'Fit',
				line: { color: '#35a8ff' }
			});
		}

		// Retrieve the title from the input; if blank, use an empty string.
		const rawTitle = document.getElementById('graph-title').value.trim();
		const titleText = rawTitle === '' ? '' : processLabel(rawTitle);

		// Build the layout.
		const layout = {
			xaxis: {
				title: processLabel(document.getElementById('x-column-name').value || 'x')
			},
			yaxis: {
				title: {
					text: processLabel(document.getElementById('y-column-name').value || 'y'),
					standoff: 25
				},
				titlefont: { size: 14 },
				automargin: true
			},
			title: titleText,
			margin: {
				t: rawTitle === '' ? 50 : 100, // Optionally reduce top margin when title is blank.
				b: 80,
				l: 85,
				r: 30
			}
		};

		// Only replot if the new state is different.
		if (isPlotStateEqual(data, layout)) {
			console.log("No changes in plot state; skipping update.");
			return;
		}

		// Update the plot.
		Plotly.react('plot', data, layout, {
			toImageButtonOptions: {
				format: 'svg',
				filename: 'data_plot',
				scale: 1
			}
		});

		// Cache the current state.
		lastPlotState.data = data;
		lastPlotState.layout = layout;
	}


	function plotAllDatasets() {
		const traces = [];

		// Define colors for datasets and fitted curves.
		const datasetColors = ['#3498db', '#2ecc71', '#9b59b6', '#f1c40f', '#e74c3c', '#1abc9c'];
		const fitColors = ['#a7d7f2', '#a2e4b8', '#d5a4e2', '#f9e79f', '#f5a4a4', '#a0e7d1'];

		// Helper: get the per-dataset y label (raw), with a sensible fallback.
		function getDatasetYLabelRaw(i) {
			const raw = (datasetHeaders[i] && datasetHeaders[i].y != null) ? String(datasetHeaders[i].y).trim() : '';
			return raw !== '' ? raw : `Dataset ${i + 1}`;
		}

		// Helper: build fit legend label that also supports LaTeX mode.
		function getFitLegendName(i, yRaw) {
			if (!latexMode) return `Fit: ${yRaw}`;
			// Put "Fit:" in text mode, then the y label in math mode (still inside the same $...$).
			return '$\\text{Fit: }' + formatLabelForLatex(yRaw) + '$';
		}

		// Build traces for each dataset.
		rawData.forEach((dataset, index) => {
			const valid = dataset.filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
			const xVals = valid.map(point => point.x);
			const yVals = valid.map(point => point.y);

			// Convert uncertainties.
			const xErrorsRaw = valid.map(point => point.xErrorRaw || 0);
			const yErrorsRaw = valid.map(point => point.yErrorRaw || 0);
			const errorTypes = datasetErrorTypes[index] || { x: 'absolute', y: 'absolute' };

			const xErrorsConverted = xVals.map((xVal, i) =>
				errorTypes.x === 'percentage' ? (xErrorsRaw[i] / 100) * (xVal || 0) : xErrorsRaw[i]
			);
			const yErrorsConverted = yVals.map((yVal, i) =>
				errorTypes.y === 'percentage' ? (yErrorsRaw[i] / 100) * (yVal || 0) : yErrorsRaw[i]
			);

			const toggles = datasetToggles[index] || { x: false, y: false };

			// Legend label for this dataset should be its y label (supports LaTeX).
			const yLabelRaw = getDatasetYLabelRaw(index);
			const legendName = processLabel(yLabelRaw);

			// Marker trace.
			traces.push({
				x: xVals,
				y: yVals,
				mode: 'markers',
				name: legendName,
				marker: {
					size: 6.5,
					color: datasetColors[index % datasetColors.length]
				},
				error_x: {
					type: 'data',
					array: xErrorsConverted,
					visible: !!toggles.x,
					color: datasetColors[index % datasetColors.length],
					thickness: 0.8,
					width: 2
				},
				error_y: {
					type: 'data',
					array: yErrorsConverted,
					visible: !!toggles.y,
					color: datasetColors[index % datasetColors.length],
					thickness: 0.8,
					width: 2
				}
			});

			// Fitted curve trace, if available.
			if (fittedCurves.hasOwnProperty(index)) {
				const fitColor = fitColors[index % fitColors.length];
				const fitName = latexMode ? getFitLegendName(index, yLabelRaw) : `Fit: ${yLabelRaw}`;

				traces.push({
					x: fittedCurves[index].x,
					y: fittedCurves[index].y,
					mode: 'lines',
					name: fitName,
					line: { color: fitColor }
				});
			}
		});

		// Retrieve and process input for combined plot title and axis labels.
		const titleInput = document.getElementById('combined-title');
		const xLabelInput = document.getElementById('combined-x-label');
		const yLabelInput = document.getElementById('combined-y-label');

		const rawTitle = titleInput ? titleInput.value.trim() : '';
		const rawXLabel = xLabelInput ? xLabelInput.value.trim() : '';
		const rawYLabel = yLabelInput ? yLabelInput.value.trim() : '';

		const processedTitle = rawTitle === '' ? '' : processLabel(rawTitle);
		const processedXLabel = rawXLabel === '' ? '' : processLabel(rawXLabel);
		const processedYLabel = rawYLabel === '' ? '' : processLabel(rawYLabel);

		// Build the layout using the processed labels.
		const layout = {
			title: { text: processedTitle, font: { size: 16 } },
			xaxis: { title: processedXLabel },
			yaxis: { title: { text: processedYLabel, standoff: 25 } },
			margin: { t: rawTitle === '' ? 50 : 100, b: 70, l: 140, r: 0 }
		};

		if (isPlotStateEqual(traces, layout)) {
			console.log("No changes detected in combined plot; skipping update.");
			showPopup();
			return;
		}

		Plotly.newPlot('popup-plot', traces, layout, {
			toImageButtonOptions: { format: 'svg', filename: 'combined_plot', scale: 1 }
		});

		lastPlotState.data = traces;
		lastPlotState.layout = layout;

		showPopup();
		safeTypeset(document.getElementById('popup-plot'));
	}
