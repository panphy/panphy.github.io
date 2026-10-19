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
				paper_bgcolor: '#1A1A19',
				plot_bgcolor: '#1A1A19',
				font: { color: '#EDEBE8' },
				xaxis: {
					gridcolor: '#2A2A28',
					zerolinecolor: '#8b98a7',
					linecolor: '#3A3A36',
					tickcolor: '#CDCAC4',
					title: { font: { color: '#EDEBE8' } }
				},
				yaxis: {
					gridcolor: '#2A2A28',
					zerolinecolor: '#8b98a7',
					linecolor: '#3A3A36',
					tickcolor: '#CDCAC4',
					title: { font: { color: '#EDEBE8' } }
				}
			}
		};
	}

	function isPlotStateEqual(targetId, dataKey, layoutKey) {
		const slot = lastPlotState[targetId];
		// A null cached data/layout is the "force replot" flag set elsewhere.
		if (!slot || slot.data === null || slot.layout === null) return false;
		return slot.dataKey === dataKey && slot.layoutKey === layoutKey;
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
				responsive: true,
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



	function updatePlot() {
        if (isSyncing) return;
        isSyncing = true;
        try { plotGraph(); } finally { isSyncing = false; }
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
				name: datasetFitResults[activeSet]?.stale ? 'Fit (outdated)' : 'Fit',
				line: { color: themeSettings.fitColor, dash: datasetFitResults[activeSet]?.stale ? 'dash' : 'solid' }
			});
		}

		// Retrieve the title from the input; if blank, use an empty string.
		const rawTitle = document.getElementById('graph-title').value.trim();
		const titleText = rawTitle === '' ? '' : processLabel(rawTitle);

		// Build the layout.
		const layout = {
			xaxis: {
				title: { text: processLabel(document.getElementById('x-column-name').value || 'x') },
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
					font: { size: 14 },
					standoff: 25
				},
				automargin: true,
				showline: false,
				linewidth: 1,
				autorange: true,
				rangemode: 'tozero',
				zeroline: true,
				zerolinewidth: 2
			},
			title: { text: titleText, font: { size: 16 } },
			margin: {
				t: rawTitle === '' ? 50 : 100, // Optionally reduce top margin when title is blank.
				b: 80,
				l: 85,
				r: 30
			}
		};
		if (themeSettings.layout.xaxis) {
			const themeX = themeSettings.layout.xaxis;
			const themeXTitle = themeX.title;
			layout.xaxis = { ...layout.xaxis, ...themeX, title: { ...layout.xaxis.title } };
			if (themeXTitle) {
				layout.xaxis.title = {
					...layout.xaxis.title,
					...themeXTitle,
					font: { ...(layout.xaxis.title.font || {}), ...(themeXTitle.font || {}) }
				};
			}
		}
		if (themeSettings.layout.yaxis) {
			const themeY = themeSettings.layout.yaxis;
			const themeYTitle = themeY.title;
			layout.yaxis = { ...layout.yaxis, ...themeY, title: { ...layout.yaxis.title } };
			if (themeYTitle) {
				layout.yaxis.title = {
					...layout.yaxis.title,
					...themeYTitle,
					font: { ...(layout.yaxis.title.font || {}), ...(themeYTitle.font || {}) }
				};
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

		// Only replot if the new state is different. Serialize the new data/layout
		// once and compare against cached keys (avoids re-serializing the cache).
		const dataKey = JSON.stringify(data);
		const layoutKey = JSON.stringify(layout);
		if (isPlotStateEqual('plot', dataKey, layoutKey)) {
			return;
		}

		// Update the plot.
		Plotly.react('plot', data, layout, createDownloadImageConfig('data_plot'));

		// Cache the current state.
		lastPlotState.plot.data = data;
		lastPlotState.plot.layout = layout;
		lastPlotState.plot.dataKey = dataKey;
		lastPlotState.plot.layoutKey = layoutKey;
	}


	Object.assign(window, {
		sanitizeFilename,
		saveBlobWithFallback,
		updatePlot,
		plotGraph
	});
})();
