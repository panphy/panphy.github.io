// Plotting helpers

	function getPlotThemeSettings() {
		const theme = document.documentElement.getAttribute('data-theme') || 'light';
		if (theme !== 'dark') {
			// Light theme – Tableau-inspired palette with same-hue fit lines
			return {
				dataColor: '#4e79a7',
				errorColor: '#636363',
				fitColor: '#c44e52',
				// Data point colors: muted but distinct (Tableau 10 first six)
				datasetColors: ['#4e79a7', '#e15759', '#59a14f', '#f28e2b', '#b07aa1', '#76b7b2'],
				// Fit line colors: darker shade of corresponding data color
				fitColors: ['#305f8a', '#b33436', '#3d7c36', '#c46e10', '#885b7b', '#4f9490'],
				layout: {
					xaxis: {
						zerolinecolor: '#1f2937'
					},
					yaxis: {
						zerolinecolor: '#1f2937'
					}
				}
			};
		}

		// Dark theme – brighter versions of the same hue families
		return {
			dataColor: '#7cb5ec',
			errorColor: '#9aa0a6',
			fitColor: '#f48183',
			// Data point colors: bright, clear on dark background
			datasetColors: ['#7cb5ec', '#f48183', '#8bcf86', '#f9b06a', '#d1a4c5', '#a2dad6'],
			// Fit line colors: lighter tint of corresponding data color
			fitColors: ['#b0d4f4', '#f8b0b2', '#bbe3b8', '#fcd4a3', '#e4c5dc', '#c9ece9'],
			layout: {
				paper_bgcolor: '#1e2129',
				plot_bgcolor: '#1e2129',
				font: { color: '#dfe6e9' },
				xaxis: {
					gridcolor: '#2d3436',
					zerolinecolor: '#8b98a7',
					linecolor: '#3a414d',
					tickcolor: '#cdd9df',
					titlefont: { color: '#dfe6e9' }
				},
				yaxis: {
					gridcolor: '#2d3436',
					zerolinecolor: '#8b98a7',
					linecolor: '#3a414d',
					tickcolor: '#cdd9df',
					titlefont: { color: '#dfe6e9' }
				}
			}
		};
	}

	function isPlotStateEqual(newData, newLayout) {
		// Simple approach: compare JSON strings.
		// Note: This works fine for small to moderate data sets.
		const currentDataStr = JSON.stringify(lastPlotState.data);
		const newDataStr = JSON.stringify(newData);
		const currentLayoutStr = JSON.stringify(lastPlotState.layout);
		const newLayoutStr = JSON.stringify(newLayout);
		return currentDataStr === newDataStr && currentLayoutStr === newLayoutStr;
	}

	function sanitizeFilename(filename, fallbackFilename) {
		const trimmed = typeof filename === 'string' ? filename.trim() : '';
		const candidate = trimmed || fallbackFilename;
		const sanitized = candidate.replace(/[<>:"/\\|?*]/g, '_').trim();
		return sanitized || fallbackFilename;
	}

	function createDownloadImageConfig(defaultFilename) {
		return {
			displaylogo: false,
			modeBarButtonsToRemove: ['toImage', 'select2d', 'lasso2d', 'resetScale2d'],
			modeBarButtonsToAdd: [{
				name: 'Download plot as png',
				icon: Plotly.Icons.camera,
				click: function(gd) {
					const userInput = window.prompt('Enter a filename for this plot image:', defaultFilename);
					if (userInput === null) return;
					const filename = sanitizeFilename(userInput, defaultFilename);
					Plotly.downloadImage(gd, {
						format: 'png',
						filename,
						scale: 2
					});
				}
			}]
		};
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
		const themeSettings = getPlotThemeSettings();
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
				color: themeSettings.dataColor,
				symbol: 'circle',
				size: 6.5,
				line: { width: 0 }
			},
			error_x: {
				type: 'data',
				array: convertedXError,
				visible: document.getElementById('toggle-x-error').checked,
				color: themeSettings.errorColor,
				thickness: 0.8,
				width: 2
			},
			error_y: {
				type: 'data',
				array: convertedYError,
				visible: document.getElementById('toggle-y-error').checked,
				color: themeSettings.errorColor,
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
				line: { color: themeSettings.fitColor }
			});
		}

		// Retrieve the title from the input; if blank, use an empty string.
		const rawTitle = document.getElementById('graph-title').value.trim();
		const titleText = rawTitle === '' ? '' : processLabel(rawTitle);

		// Build the layout.
		const layout = {
			xaxis: {
				title: processLabel(document.getElementById('x-column-name').value || 'x'),
				showline: false,
				linewidth: 1,
				autorange: true,
				rangemode: 'tozero',
				zeroline: true,
				zerolinewidth: 2
			},
			yaxis: {
				title: {
					text: processLabel(document.getElementById('y-column-name').value || 'y'),
					standoff: 25
				},
				titlefont: { size: 14 },
				automargin: true,
				showline: false,
				linewidth: 1,
				autorange: true,
				rangemode: 'tozero',
				zeroline: true,
				zerolinewidth: 2
			},
			title: titleText,
			margin: {
				t: rawTitle === '' ? 50 : 100, // Optionally reduce top margin when title is blank.
				b: 80,
				l: 85,
				r: 30
			}
		};
		if (themeSettings.layout.xaxis) {
			layout.xaxis = { ...layout.xaxis, ...themeSettings.layout.xaxis };
			if (themeSettings.layout.xaxis.titlefont) {
				layout.xaxis.titlefont = { ...(layout.xaxis.titlefont || {}), ...themeSettings.layout.xaxis.titlefont };
			}
		}
		if (themeSettings.layout.yaxis) {
			layout.yaxis = { ...layout.yaxis, ...themeSettings.layout.yaxis };
			if (themeSettings.layout.yaxis.titlefont) {
				layout.yaxis.titlefont = { ...(layout.yaxis.titlefont || {}), ...themeSettings.layout.yaxis.titlefont };
			}
		}
		if (themeSettings.layout.font) {
			layout.font = themeSettings.layout.font;
		}
		if (themeSettings.layout.paper_bgcolor) {
			layout.paper_bgcolor = themeSettings.layout.paper_bgcolor;
		}
		if (themeSettings.layout.plot_bgcolor) {
			layout.plot_bgcolor = themeSettings.layout.plot_bgcolor;
		}

		// Only replot if the new state is different.
		if (isPlotStateEqual(data, layout)) {
			console.log("No changes in plot state; skipping update.");
			return;
		}

		// Update the plot.
		Plotly.react('plot', data, layout, createDownloadImageConfig('data_plot'));

		// Cache the current state.
		lastPlotState.data = data;
		lastPlotState.layout = layout;
	}


	function plotAllDatasets() {
		const traces = [];
		const themeSettings = getPlotThemeSettings();

		// Get theme-specific colors for datasets and fitted curves.
		const datasetColors = themeSettings.datasetColors;
		const fitColors = themeSettings.fitColors;

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
			xaxis: {
				title: processedXLabel,
				showline: false,
				linewidth: 1,
				autorange: true,
				rangemode: 'tozero',
				zeroline: true,
				zerolinewidth: 2
			},
			yaxis: {
				title: { text: processedYLabel, standoff: 25 },
				showline: false,
				linewidth: 1,
				autorange: true,
				rangemode: 'tozero',
				zeroline: true,
				zerolinewidth: 2
			},
			margin: { t: rawTitle === '' ? 50 : 100, b: 70, l: 140, r: 0 }
		};
		if (themeSettings.layout.xaxis) {
			layout.xaxis = { ...layout.xaxis, ...themeSettings.layout.xaxis };
			if (themeSettings.layout.xaxis.titlefont) {
				layout.xaxis.titlefont = { ...(layout.xaxis.titlefont || {}), ...themeSettings.layout.xaxis.titlefont };
			}
		}
		if (themeSettings.layout.yaxis) {
			layout.yaxis = { ...layout.yaxis, ...themeSettings.layout.yaxis };
			if (themeSettings.layout.yaxis.titlefont) {
				layout.yaxis.titlefont = { ...(layout.yaxis.titlefont || {}), ...themeSettings.layout.yaxis.titlefont };
			}
		}
		if (themeSettings.layout.font) {
			layout.font = themeSettings.layout.font;
		}
		if (themeSettings.layout.paper_bgcolor) {
			layout.paper_bgcolor = themeSettings.layout.paper_bgcolor;
		}
		if (themeSettings.layout.plot_bgcolor) {
			layout.plot_bgcolor = themeSettings.layout.plot_bgcolor;
		}

		if (isPlotStateEqual(traces, layout)) {
			console.log("No changes detected in combined plot; skipping update.");
			showPopup();
			return;
		}

		Plotly.newPlot('popup-plot', traces, layout, createDownloadImageConfig('combined_plot'));

		lastPlotState.data = traces;
		lastPlotState.layout = layout;

		showPopup();
		safeTypeset(document.getElementById('popup-plot'));
	}
