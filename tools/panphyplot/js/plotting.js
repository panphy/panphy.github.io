// Plotting helpers
(function() {

	const PLOT_EXPORT_BASE_SCALE = 3;
	const PLOT_EXPORT_MAX_CANVAS_SIDE = 8192;
	const PLOT_EXPORT_MAX_PIXELS = 16777216;

	function getPlotExportDimensions(gd) {
		const rect = gd && typeof gd.getBoundingClientRect === 'function' ? gd.getBoundingClientRect() : null;
		const layoutWidth = gd && gd._fullLayout ? Number(gd._fullLayout.width) : 0;
		const layoutHeight = gd && gd._fullLayout ? Number(gd._fullLayout.height) : 0;
		const rectWidth = rect ? Number(rect.width) : 0;
		const rectHeight = rect ? Number(rect.height) : 0;
		const clientWidth = gd ? Number(gd.clientWidth) : 0;
		const clientHeight = gd ? Number(gd.clientHeight) : 0;

		return {
			width: Math.max(1, Math.ceil(layoutWidth || rectWidth || clientWidth || 1200)),
			height: Math.max(1, Math.ceil(layoutHeight || rectHeight || clientHeight || 800))
		};
	}

	function getAdaptivePlotExportScale(gd) {
		const dims = getPlotExportDimensions(gd);
		const safeWidth = Math.max(1, dims.width);
		const safeHeight = Math.max(1, dims.height);
		const dpr = Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio : 1;
		const requestedScale = Math.max(PLOT_EXPORT_BASE_SCALE, Math.ceil(dpr * 2));
		const maxScaleBySide = Math.min(
			PLOT_EXPORT_MAX_CANVAS_SIDE / safeWidth,
			PLOT_EXPORT_MAX_CANVAS_SIDE / safeHeight
		);
		const maxScaleByPixels = Math.sqrt(PLOT_EXPORT_MAX_PIXELS / (safeWidth * safeHeight));
		return Math.max(1, Math.min(requestedScale, maxScaleBySide, maxScaleByPixels));
	}

	function getPlotThemeSettings() {
		const theme = document.documentElement.getAttribute('data-theme') || 'light';
		if (theme !== 'dark') {
			// Light theme – Tableau-inspired palette with same-hue fit lines
			return {
				errorColor: '#5b5b5b',
				fitColor: '#35a8ff',
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
			errorColor: '#9aa0a6',
			fitColor: '#00e5ff',
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

		function isAppleMobileWebKitBrowser() {
			const ua = navigator.userAgent || '';
			const isiPadOSDesktopUA = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
			const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || isiPadOSDesktopUA;
			const isWebKit = /AppleWebKit/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|OPR|SamsungBrowser/.test(ua);
			return isIOSDevice && isWebKit;
		}

		async function saveBlobWithFallback(blob, filename, { title = 'Save file' } = {}) {
			const safeFilename = sanitizeFilename(filename, 'download');
			const safeType = blob?.type || 'application/octet-stream';
			const canUseShareSheet = Boolean(navigator.share)
				&& typeof navigator.canShare === 'function';

			if (isAppleMobileWebKitBrowser() && canUseShareSheet) {
				try {
					const fileForShare = new File([blob], safeFilename, { type: safeType });
					if (navigator.canShare({ files: [fileForShare] })) {
						await navigator.share({
							title,
							files: [fileForShare]
						});
						return true;
					}
				} catch (error) {
					if (error && error.name === 'AbortError') return false;
					console.warn('Share sheet failed; falling back to direct download.', error);
				}
			}

			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = safeFilename;
			link.rel = 'noopener';
			link.style.display = 'none';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			setTimeout(() => URL.revokeObjectURL(url), 60000);
			return true;
		}

		function createDownloadImageConfig(defaultFilename) {
			function isTraceVisible(trace) {
				return trace && trace.visible !== false && trace.visible !== 'legendonly';
			}

			function isMarkerTrace(trace) {
				return typeof trace?.mode === 'string' && trace.mode.includes('markers');
			}

			function computeFiniteBounds(values) {
				let min = Infinity;
				let max = -Infinity;
				for (let index = 0; index < values.length; index++) {
					const rawValue = values[index];
					if (rawValue === null || rawValue === undefined || rawValue === '') continue;
					const numeric = typeof rawValue === 'number' ? rawValue : Number(rawValue);
					if (!Number.isFinite(numeric)) continue;
					if (numeric < min) min = numeric;
					if (numeric > max) max = numeric;
				}
				if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
				return { min, max };
			}

			function collectAxisValues(traces, axis, markerOnly) {
				const values = [];
				traces.forEach((trace) => {
					if (!isTraceVisible(trace)) return;
					if (markerOnly && !isMarkerTrace(trace)) return;
					const axisValues = trace && Array.isArray(trace[axis]) ? trace[axis] : [];
					axisValues.forEach((value) => values.push(value));
				});
				return values;
			}

			function expandRange(min, max) {
				if (min === max) {
					const delta = min === 0 ? 1 : Math.abs(min) * 0.05;
					return [min - delta, max + delta];
				}
				const padding = (max - min) * 0.05;
				return [min - padding, max + padding];
			}

			function applyTrueAutoScale(gd) {
				const traces = Array.isArray(gd?.data) ? gd.data : [];
				let xBounds = computeFiniteBounds(collectAxisValues(traces, 'x', true));
				let yBounds = computeFiniteBounds(collectAxisValues(traces, 'y', true));

				// Fall back to all visible traces when marker traces are unavailable.
				if (!xBounds || !yBounds) {
					xBounds = computeFiniteBounds(collectAxisValues(traces, 'x', false));
					yBounds = computeFiniteBounds(collectAxisValues(traces, 'y', false));
				}
				if (!xBounds || !yBounds) return;

				Plotly.relayout(gd, {
					'xaxis.autorange': false,
					'yaxis.autorange': false,
					'xaxis.range': expandRange(xBounds.min, xBounds.max),
					'yaxis.range': expandRange(yBounds.min, yBounds.max)
				});
			}

			const autoScaleButton = {
				name: 'Auto-scale axes to data',
				icon: Plotly.Icons.autoscale,
				click: function(gd) {
					applyTrueAutoScale(gd);
				}
			};

			const downloadImageButton = {
				name: 'Download plot as png',
				icon: Plotly.Icons.camera,
				click: async function(gd) {
					const userInput = window.prompt('Enter a filename for this plot image:', defaultFilename);
					if (userInput === null) return;
					const filenameBase = sanitizeFilename(userInput, defaultFilename).replace(/\.png$/i, '');
					const exportScale = getAdaptivePlotExportScale(gd);
					try {
						const dataUrl = await Plotly.toImage(gd, {
							format: 'png',
							scale: exportScale
						});
						const imageBlob = await fetch(dataUrl).then(res => res.blob());
						await saveBlobWithFallback(imageBlob, `${filenameBase}.png`, { title: 'Save plot image' });
					} catch (error) {
						console.warn('Custom image export failed; falling back to Plotly.downloadImage.', error);
						Plotly.downloadImage(gd, {
							format: 'png',
							filename: filenameBase,
							scale: exportScale
						});
					}
				}
			};

			return {
				displayModeBar: true,
				displaylogo: false,
				modeBarButtons: [[
					'pan2d',
					'zoom2d',
					'zoomIn2d',
					'zoomOut2d',
					autoScaleButton,
					'resetScale2d',
					downloadImageButton
				]]
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
			xErrorType === 'percentage' ?
				(Math.abs(xErrorRaw[idx] || 0) / 100) * Math.abs(xi || 0) :
				(xErrorRaw[idx] || 0)
		);
		const convertedYError = y.map((yi, idx) =>
			yErrorType === 'percentage' ?
				(Math.abs(yErrorRaw[idx] || 0) / 100) * Math.abs(yi || 0) :
				(yErrorRaw[idx] || 0)
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
			return;
		}

		// Update the plot.
		Plotly.react('plot', data, layout, createDownloadImageConfig('data_plot'));

		// Cache the current state.
		lastPlotState.data = data;
		lastPlotState.layout = layout;
	}


	function plotAllDatasets() {
		if (typeof updateData === 'function') {
			updateData();
		}
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
			const valid = getFiniteDatasetPoints(index);
			const xVals = valid.map(point => point.x);
			const yVals = valid.map(point => point.y);

			// Convert uncertainties.
			const xErrorsRaw = valid.map(point => point.xErrorRaw || 0);
			const yErrorsRaw = valid.map(point => point.yErrorRaw || 0);
			const errorTypes = datasetErrorTypes[index] || { x: 'absolute', y: 'absolute' };

			const xErrorsConverted = xVals.map((xVal, i) =>
				errorTypes.x === 'percentage' ?
					(Math.abs(xErrorsRaw[i] || 0) / 100) * Math.abs(xVal || 0) :
					(xErrorsRaw[i] || 0)
			);
			const yErrorsConverted = yVals.map((yVal, i) =>
				errorTypes.y === 'percentage' ?
					(Math.abs(yErrorsRaw[i] || 0) / 100) * Math.abs(yVal || 0) :
					(yErrorsRaw[i] || 0)
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
			showPopup();
			return;
		}

		Plotly.newPlot('popup-plot', traces, layout, createDownloadImageConfig('combined_plot'));

		lastPlotState.data = traces;
		lastPlotState.layout = layout;

		showPopup();
		safeTypeset(document.getElementById('popup-plot'));
	}

	Object.assign(window, {
		sanitizeFilename,
		updatePlotAndRenderLatex,
		plotGraph,
		plotAllDatasets
	});
})();
