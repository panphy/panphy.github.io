// Plotting for PanPhyPlot: every Y series of a sheet, its fits and residuals, or a bar sheet's bars.
// Image export is adapted from /misc/panphyplotog/js/plotting.js.
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

	// The swatches a series, fit line or bar can take (PlotModel.STYLE_COLORS, in the same order).
	// light and dark are the points and bars on screen: muted but distinct on white (Tableau 10),
	// brighter on the dark surface. fitLight and fitDark are the automatic fit line of points in
	// that color, a different hue rather than a change of brightness. print is the swatch in a
	// Publication download (Okabe–Ito where it has the hue), and printFit the contrasting fit
	// line of a lone series there.
	const SWATCHES = {
		blue: { label: 'Blue', light: '#4e79a7', dark: '#7cb5ec', fitLight: '#b45309', fitDark: '#ffc078', print: '#0072b2', printFit: '#d55e00' },
		red: { label: 'Red', light: '#e15759', dark: '#f48183', fitLight: '#1d4ed8', fitDark: '#80cfff', print: '#d55e00', printFit: '#0072b2' },
		green: { label: 'Green', light: '#59a14f', dark: '#8bcf86', fitLight: '#9333a8', fitDark: '#e5adff', print: '#009e73', printFit: '#d55e00' },
		orange: { label: 'Orange', light: '#f28e2b', dark: '#f9b06a', fitLight: '#0e7490', fitDark: '#82ded5', print: '#e69f00', printFit: '#0072b2' },
		purple: { label: 'Purple', light: '#b07aa1', dark: '#d1a4c5', fitLight: '#3f6212', fitDark: '#d1e884', print: '#cc79a7', printFit: '#009e73' },
		teal: { label: 'Teal', light: '#76b7b2', dark: '#a2dad6', fitLight: '#be123c', fitDark: '#ff9db8', print: '#56b4e9', printFit: '#d55e00' },
		brown: { label: 'Brown', light: '#9c755f', dark: '#c9a58f', fitLight: '#1d4ed8', fitDark: '#80cfff', print: '#8c510a', printFit: '#0072b2' },
		pink: { label: 'Pink', light: '#d37295', dark: '#f4a6c0', fitLight: '#0e7490', fitDark: '#82ded5', print: '#ee6677', printFit: '#0072b2' },
		gray: { label: 'Gray', light: '#6b7076', dark: '#aab0b7', fitLight: '#be123c', fitDark: '#ff9db8', print: '#555555', printFit: '#d55e00' }
	};
	const AUTO_SWATCHES = PlotModel.STYLE_COLORS.slice(0, 6);
	const SYMBOL_LABELS = { circle: 'Circle', square: 'Square', diamond: 'Diamond', 'triangle-up': 'Triangle', 'triangle-down': 'Inverted triangle', star: 'Star', cross: 'Cross' };

	function isDarkTheme() {
		return document.documentElement.getAttribute('data-theme') === 'dark';
	}

	// A swatch as points or bars in the current theme.
	function swatchColor(key) {
		const swatch = SWATCHES[key] || SWATCHES.blue;
		return isDarkTheme() ? swatch.dark : swatch.light;
	}

	// A swatch chosen for a fit line: a little darker on white, where the muted colors are thin as a line.
	function swatchLineColor(key) {
		const swatch = SWATCHES[key] || SWATCHES.blue;
		return isDarkTheme() ? swatch.dark : mixHex(swatch.light, '#000000', 0.2);
	}

	function getPlotThemeSettings(themeName) {
		const theme = themeName || document.documentElement.getAttribute('data-theme') || 'light';
		if (theme !== 'dark') {
			// Light theme – distinct data colors with contrasting fit hues
			return {
				errorColor: '#5b5b5b',
				datasetColors: AUTO_SWATCHES.map(key => SWATCHES[key].light),
				fitColors: AUTO_SWATCHES.map(key => SWATCHES[key].fitLight),
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

		// Dark theme – brighter points and contrasting fit hues
		return {
			errorColor: '#9aa0a6',
			datasetColors: AUTO_SWATCHES.map(key => SWATCHES[key].dark),
			fitColors: AUTO_SWATCHES.map(key => SWATCHES[key].fitDark),
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
				// Bars are measured from zero, so their automatic scale always includes it.
				if (traces.some(trace => trace?.type === 'bar')) {
					Plotly.relayout(gd, { 'yaxis.autorange': true });
					return;
				}
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

			// Plotly's own Reset axes wears a house icon and returns to the first view drawn, which may
			// be a saved zoom. This one draws axes with a turn-back arrow and returns to automatic
			// scaling, including zero; the relayout also clears the sheet's saved view.
			const resetAxesButton = {
				name: 'Reset axes',
				icon: {
					width: 24,
					height: 24,
					path: 'M1 1h2.8v19.2H23V23H1Z'
						+ 'M18.96 15.47A7.4 7.4 0 1 0 7.25 12.33L9.88 11.37A4.6 4.6 0 1 1 17.16 13.32Z'
						+ 'M4.48 12.91L10.07 15.99L12.37 10.04Z'
				},
				click: function(gd) {
					Plotly.relayout(gd, { 'xaxis.autorange': true, 'yaxis.autorange': true });
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
					resetAxesButton
				]]
			};
		}

	/* ---------- Download graph ---------- */

	const EXPORT_PREFS_KEY = 'panphyplot-neo-export';
	const PUBLICATION_WIDTH = 640;
	const PUBLICATION_HEIGHT = 480;
	const PUBLICATION_PNG_SCALE = 4;
	const PUBLICATION_FONT = 'Arial, Helvetica, sans-serif';
	// Okabe–Ito colors: vivid on white and distinguishable with color blindness and in grayscale.
	// All sheets' bars take them in order; a series or a sheet's own bars print in their swatch's
	// print color (SWATCHES), and a lone series' fit in that swatch's contrasting printFit.
	const PUBLICATION_COLORS = ['#0072b2', '#e69f00', '#009e73', '#d55e00', '#cc79a7', '#56b4e9'];
	// With several series each fit stays in its own hue, this far toward black.
	const PUBLICATION_FIT_DARKEN = 0.55;
	const PUBLICATION_SYMBOLS =['square', 'circle', 'triangle-up', 'diamond', 'triangle-down', 'star'];
	const PUBLICATION_CURVE_POINTS = 1500;
	const PUBLICATION_EDGE_GAP = 14;
	let exportTarget = null;

	function readExportPrefs() {
		let prefs = {};
		try {
			prefs = JSON.parse(localStorage.getItem(EXPORT_PREFS_KEY) || '{}') || {};
		} catch (error) {
			prefs = {};
		}
		return {
			style: prefs.style === 'screen' ? 'screen' : 'publication',
			format: prefs.format === 'svg' ? 'svg' : 'png'
		};
	}

	function writeExportPrefs(prefs) {
		try {
			localStorage.setItem(EXPORT_PREFS_KEY, JSON.stringify(prefs));
		} catch (error) {
			// Without storage the dialog simply starts from the defaults next time.
		}
	}

	function isShownTrace(trace) {
		return trace && trace.visible !== false && trace.visible !== 'legendonly';
	}

	function isPointsTrace(trace) {
		return typeof trace?.mode === 'string' && trace.mode.includes('markers');
	}

	// The fit's legend entry, in the same notation as its points' entry.
	function fitLegendName(pointsName, stale, single) {
		const word = stale ? 'Outdated fit' : 'Fit';
		if (single) return word;
		const name = String(pointsName || '');
		const latex = name.match(/^\$(.*)\$$/s);
		return latex ? `$\\text{${word}: }${latex[1]}$` : `${word}: ${name}`;
	}

	// Put the legend in whichever top corner holds fewer points and fit samples.
	function publicationLegendSide(traces, xRange, yRange) {
		const [x0, x1] = xRange;
		const [y0, y1] = yRange;
		const width = x1 - x0;
		const height = y1 - y0;
		if (!(width > 0) || !(height > 0)) return 'left';
		let left = 0;
		let right = 0;
		traces.forEach((trace) => {
			const xs = Array.isArray(trace.x) ? trace.x : [];
			const ys = Array.isArray(trace.y) ? trace.y : [];
			const weight = isPointsTrace(trace) ? 1 : 0.2;
			xs.forEach((x, index) => {
				const y = ys[index];
				if (!Number.isFinite(x) || !Number.isFinite(y) || y < y1 - 0.38 * height || y > y1) return;
				if (x >= x0 && x <= x0 + 0.42 * width) left += weight;
				if (x <= x1 && x >= x1 - 0.42 * width) right += weight;
			});
		});
		return right < left ? 'right' : 'left';
	}

	function publicationAxis(axis, fullAxis) {
		const black = '#000000';
		const title = axis?.title || {};
		return {
			title: { text: title.text || '', standoff: 12, font: { family: PUBLICATION_FONT, size: 17, color: black } },
			range: Array.isArray(fullAxis?.range) ? fullAxis.range.slice() : undefined,
			autorange: !Array.isArray(fullAxis?.range),
			automargin: true,
			showgrid: false,
			zeroline: false,
			showline: true,
			mirror: 'ticks',
			linecolor: black,
			linewidth: 1.6,
			ticks: 'inside',
			ticklen: 7,
			tickwidth: 1.6,
			tickcolor: black,
			tickfont: { family: PUBLICATION_FONT, size: 15, color: black },
			minor: { ticks: 'inside', ticklen: 4, tickwidth: 1.2, tickcolor: black, nticks: 2, showgrid: false }
		};
	}

	// Redraws a fit line from its fit function with enough points to look smooth at print size;
	// a fit whose function is unavailable keeps its own points.
	function densePublicationCurve(trace) {
		const own = { x: trace.x, y: trace.y };
		const fn = typeof fitFunctions !== 'undefined' ? fitFunctions[trace.meta] : null;
		const xs = (Array.isArray(trace.x) ? trace.x : []).filter(Number.isFinite);
		if (typeof fn !== 'function' || xs.length < 2) return own;
		const from = Math.min(...xs);
		const to = Math.max(...xs);
		if (!(to > from)) return own;
		const count = Math.min(Math.max(xs.length, PUBLICATION_CURVE_POINTS), 6000);
		const x = Array.from({ length: count }, (_, i) => from + (i * (to - from)) / (count - 1));
		const y = x.map((value) => {
			try {
				const result = fn(value);
				return Number.isFinite(result) ? result : null;
			} catch (error) {
				return null;
			}
		});
		return y.some(value => value !== null) ? { x, y } : own;
	}

	// An automatic range ends exactly at a point on zero, which would sit half on the frame;
	// give that side a little room instead. A range the user zoomed to is kept as it is.
	function padPublicationRange(axis, traces, key) {
		const range = axis.range;
		if (!Array.isArray(range) || !(range[1] > range[0])) return;
		const values = traces.flatMap(trace => (Array.isArray(trace[key]) ? trace[key] : [])).filter(Number.isFinite);
		if (!values.length) return;
		const span = range[1] - range[0];
		const min = Math.min(...values);
		const max = Math.max(...values);
		if (min - range[0] < 0.01 * span) range[0] = min - 0.04 * span;
		if (range[1] - max < 0.01 * span) range[1] = max + 0.04 * span;
	}

	// An Origin-like figure for print: black frame with inward major and minor ticks on all
	// four sides, no grid, black Arial text, edged markers, capped error bars and a framed legend.
	// It keeps the graph's current zoom, and leaves out hidden series.
	// The same frame for a bar chart: edged bars in the print colors, black capped error bars,
	// and for several series a legend above the frame, where it cannot cover a bar.
	function buildPublicationBarFigure(gd, shown, full) {
		const data = shown.map((trace, index) => ({
			...trace,
			visible: true,
			showlegend: shown.length > 1,
			marker: { color: trace.panphyStyle?.print || shadedColor(PUBLICATION_COLORS, index, '#000000'), line: { color: '#000000', width: 1 } },
			error_y: trace.error_y ? { ...trace.error_y, color: '#000000', thickness: 1.2, width: 5 } : trace.error_y
		}));
		const source = gd.layout?.xaxis || {};
		const xaxis = {
			...publicationAxis(source, full.xaxis),
			tickmode: 'array',
			tickvals: source.tickvals,
			ticktext: source.ticktext,
			ticks: '',
			mirror: true,
			minor: { ticks: '', showgrid: false }
		};
		const titleText = gd.dataset.exportTitle || gd.layout?.title?.text || '';
		const legendRoom = shown.length > 1 ? 30 : 0;
		return {
			data,
			layout: {
				width: PUBLICATION_WIDTH,
				height: PUBLICATION_HEIGHT,
				paper_bgcolor: '#ffffff',
				plot_bgcolor: '#ffffff',
				font: { family: PUBLICATION_FONT, size: 14, color: '#000000' },
				title: titleText ? { text: titleText, font: { family: PUBLICATION_FONT, size: 18, color: '#000000' } } : { text: '' },
				barmode: gd.layout?.barmode,
				bargap: gd.layout?.bargap,
				bargroupgap: gd.layout?.bargroupgap,
				showlegend: shown.length > 1,
				legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: 1.02, yanchor: 'bottom', font: { family: PUBLICATION_FONT, size: 14, color: '#000000' } },
				xaxis,
				yaxis: publicationAxis(gd.layout?.yaxis, full.yaxis),
				margin: { t: (titleText ? 56 : 24) + legendRoom, b: 64, l: 76, r: 28 }
			}
		};
	}

	function buildPublicationFigure(gd) {
		const full = gd._fullLayout || {};
		const shown = (Array.isArray(gd.data) ? gd.data : []).filter(isShownTrace);
		if (shown.some(trace => trace.type === 'bar')) return buildPublicationBarFigure(gd, shown, full);
		const groups = shown.filter(isPointsTrace).map(trace => trace.legendgroup);
		const single = groups.length === 1;
		const pointNames = {};
		shown.filter(isPointsTrace).forEach((trace) => { pointNames[trace.legendgroup] = trace.name; });
		const errorBars = (bars) => bars ? { ...bars, color: '#000000', thickness: 1.2, width: 4 } : bars;
		// Each series prints in its swatch's print color, and in its chosen shape and fit color if
		// it has them. Otherwise the shapes are shared out in order, leaving out the chosen ones; a
		// single series' fit gets a contrasting color, and with several series each fit is a much
		// darker shade of its own points, so the fit stands apart yet still pairs with its points.
		const chosenSymbols = shown.filter(isPointsTrace).map(trace => trace.panphyStyle?.symbol).filter(Boolean);
		const spareSymbols = PUBLICATION_SYMBOLS.filter(symbol => !chosenSymbols.includes(symbol));
		const symbolPool = spareSymbols.length ? spareSymbols : PUBLICATION_SYMBOLS;
		const symbols = {};
		let nextSymbol = 0;
		shown.filter(isPointsTrace).forEach((trace) => {
			symbols[trace.legendgroup] = trace.panphyStyle?.symbol || symbolPool[nextSymbol++ % symbolPool.length];
		});
		const data = shown.map((trace) => {
			const index = Math.max(0, groups.indexOf(trace.legendgroup));
			const style = trace.panphyStyle || {};
			const color = style.print || PUBLICATION_COLORS[index % PUBLICATION_COLORS.length];
			if (isPointsTrace(trace)) {
				const count = Array.isArray(trace.x) ? trace.x.length : 0;
				return {
					...trace,
					visible: true,
					showlegend: true,
					marker: {
						color,
						symbol: symbols[trace.legendgroup] || PUBLICATION_SYMBOLS[index % PUBLICATION_SYMBOLS.length],
						size: count > 400 ? 3.5 : count > 150 ? 4.5 : 6.5,
						opacity: 1,
						line: { color: '#000000', width: count > 400 ? 0.4 : count > 150 ? 0.6 : 0.8 }
					},
					error_x: errorBars(trace.error_x),
					error_y: errorBars(trace.error_y)
				};
			}
			const stale = trace.line?.dash === 'dash';
			const dense = densePublicationCurve(trace);
			return {
				...trace,
				x: dense.x,
				y: dense.y,
				visible: true,
				showlegend: true,
				name: fitLegendName(pointNames[trace.legendgroup], stale, single),
				line: {
					...(trace.line || {}),
					color: style.printFit
						|| (single ? style.printFitContrast || '#d55e00' : mixHex(color, '#000000', PUBLICATION_FIT_DARKEN)),
					width: 1.5,
					simplify: false
				}
			};
		});
		const xaxis = publicationAxis(gd.layout?.xaxis, full.xaxis);
		const yaxis = publicationAxis(gd.layout?.yaxis, full.yaxis);
		const points = data.filter(isPointsTrace);
		if (gd.layout?.xaxis?.autorange !== false) padPublicationRange(xaxis, points, 'x');
		if (gd.layout?.yaxis?.autorange !== false) padPublicationRange(yaxis, points, 'y');
		const side = xaxis.range && yaxis.range ? publicationLegendSide(data, xaxis.range, yaxis.range) : 'left';
		const titleText = gd.dataset.exportTitle || gd.layout?.title?.text || '';
		const layout = {
			width: PUBLICATION_WIDTH,
			height: PUBLICATION_HEIGHT,
			paper_bgcolor: '#ffffff',
			plot_bgcolor: '#ffffff',
			font: { family: PUBLICATION_FONT, size: 14, color: '#000000' },
			title: titleText ? { text: titleText, font: { family: PUBLICATION_FONT, size: 18, color: '#000000' } } : { text: '' },
			showlegend: data.length > 1,
			legend: {
				x: side === 'right' ? 0.97 : 0.03,
				xanchor: side,
				y: 0.97,
				yanchor: 'top',
				bgcolor: '#ffffff',
				bordercolor: '#000000',
				borderwidth: 1,
				font: { family: PUBLICATION_FONT, size: 14, color: '#000000' }
			},
			xaxis,
			yaxis,
			margin: { t: titleText ? 56 : 24, b: 64, l: 76, r: 28 }
		};
		return { data, layout };
	}

	function exportOptions(gd, style, format) {
		if (style === 'publication') {
			return {
				figure: buildPublicationFigure(gd),
				width: PUBLICATION_WIDTH,
				height: PUBLICATION_HEIGHT,
				scale: format === 'svg' ? 1 : PUBLICATION_PNG_SCALE
			};
		}
		return {
			figure: getExportFigure(gd),
			width: gd._fullLayout.width,
			height: gd._fullLayout.height,
			scale: format === 'svg' ? 1 : getAdaptivePlotExportScale(gd)
		};
	}

	// Plotly sizes each margin to fit its labels exactly, so an axis title would end flush with the
	// image edge. Draw the figure off-screen, measure its labels, and set every side to the same gap.
	async function drawPublicationFigure(figure) {
		const holder = document.createElement('div');
		holder.setAttribute('aria-hidden', 'true');
		holder.style.cssText = `position:fixed;left:-20000px;top:0;width:${PUBLICATION_WIDTH}px;height:${PUBLICATION_HEIGHT}px;pointer-events:none;`;
		document.body.appendChild(holder);
		try {
			await Plotly.newPlot(holder, figure.data, figure.layout, { staticPlot: true });
			for (let pass = 0; pass < 3; pass++) {
				const margin = publicationMarginsFor(holder);
				if (!margin) break;
				await Plotly.relayout(holder, { margin });
			}
			return holder;
		} catch (error) {
			Plotly.purge(holder);
			holder.remove();
			throw error;
		}
	}

	function publicationMarginsFor(holder) {
		const full = holder._fullLayout;
		const box = holder.getBoundingClientRect();
		if (!full || !full.margin || !full._size) return null;
		let left = Infinity;
		let right = -Infinity;
		let bottom = -Infinity;
		holder.querySelectorAll('.xtick, .ytick, .g-xtitle, .g-ytitle').forEach((node) => {
			const rect = node.getBoundingClientRect();
			if (!rect.width || !rect.height) return;
			left = Math.min(left, rect.left - box.left);
			right = Math.max(right, rect.right - box.left);
			bottom = Math.max(bottom, rect.bottom - box.top);
		});
		const size = full._size;
		right = Math.max(right, size.l + size.w);
		if (!Number.isFinite(left) || !Number.isFinite(bottom)) return null;
		const gap = PUBLICATION_EDGE_GAP;
		const margin = {
			l: Math.round(full.margin.l + gap - left),
			r: Math.round(full.margin.r + gap - (PUBLICATION_WIDTH - right)),
			b: Math.round(full.margin.b + gap - (PUBLICATION_HEIGHT - bottom)),
			t: full.margin.t
		};
		const changed = ['l', 'r', 'b'].some(side => Math.abs(margin[side] - full.margin[side]) >= 1);
		return changed ? margin : null;
	}

	async function downloadGraph(gd, filenameBase, style, format) {
		const options = exportOptions(gd, style, format);
		let holder = null;
		try {
			if (style === 'publication') {
				try {
					holder = await drawPublicationFigure(options.figure);
				} catch (error) {
					console.warn('Publication layout could not be measured; using default margins.', error);
				}
			}
			const dataUrl = await Plotly.toImage(holder || options.figure, {
				format,
				scale: options.scale,
				width: options.width,
				height: options.height
			});
			const imageBlob = await fetch(dataUrl).then(res => res.blob());
			const typedBlob = format === 'svg' && imageBlob.type !== 'image/svg+xml'
				? new Blob([imageBlob], { type: 'image/svg+xml' })
				: imageBlob;
			await saveBlobWithFallback(typedBlob, `${filenameBase}.${format}`, { title: 'Save graph' });
		} catch (error) {
			console.warn('Custom image export failed; falling back to Plotly.downloadImage.', error);
			Plotly.downloadImage(options.figure, {
				format,
				filename: filenameBase,
				scale: options.scale,
				width: options.width,
				height: options.height
			});
		} finally {
			if (holder) {
				Plotly.purge(holder);
				holder.remove();
			}
		}
	}

	function openExportDialog(gd, defaultFilename) {
		const dialog = document.getElementById('export-dialog');
		if (!dialog || typeof openDialog !== 'function') return;
		exportTarget = { gd, defaultFilename };
		const prefs = readExportPrefs();
		dialog.querySelector(`input[name="export-style"][value="${prefs.style}"]`).checked = true;
		dialog.querySelector(`input[name="export-format"][value="${prefs.format}"]`).checked = true;
		const input = document.getElementById('export-filename');
		input.value = defaultFilename;
		if (dialog.dataset.bound !== 'true') {
			dialog.dataset.bound = 'true';
			document.getElementById('export-form').addEventListener('submit', submitExportDialog);
		}
		openDialog('export-dialog');
		input.focus();
		input.select();
	}

	function submitExportDialog(event) {
		event.preventDefault();
		if (!exportTarget) return;
		const { gd, defaultFilename } = exportTarget;
		const form = event.currentTarget;
		const style = form.querySelector('input[name="export-style"]:checked')?.value === 'screen' ? 'screen' : 'publication';
		const format = form.querySelector('input[name="export-format"]:checked')?.value === 'svg' ? 'svg' : 'png';
		const filenameBase = sanitizeFilename(document.getElementById('export-filename').value, defaultFilename).replace(/\.(png|svg)$/i, '');
		writeExportPrefs({ style, format });
		exportTarget = null;
		closeDialog('export-dialog');
		downloadGraph(gd, filenameBase, style, format);
	}

	function processLabel(label) {
		if (!label) return '';
		return latexMode ? `$${label}$` : label;
	}

	function formatLabelForLatex(label) {
		let out = '';
		let depth = 0;
		for (const ch of String(label || '')) {
			if (ch === '{') depth++;
			else if (ch === '}' && depth > 0) depth--;
			out += ch === ' ' && depth === 0 ? '\\space ' : ch;
		}
		return out;
	}

	// Typesetting runs one element at a time, after MathJax has started.
	let typesetChain = Promise.resolve();

	function safeTypeset(target) {
		const element = typeof target === 'string' ? document.querySelector(target) : target;
		if (!element || typeof MathJax === 'undefined' || !MathJax.startup?.promise) return Promise.resolve();
		typesetChain = typesetChain
			.then(() => MathJax.startup.promise)
			.then(() => {
				if (!element.isConnected) return undefined;
				// Forget earlier output (much of it already replaced) so MathJax's list does not grow.
				MathJax.typesetClear();
				return MathJax.typesetPromise([element]);
			})
			.catch(error => console.warn('MathJax typeset skipped:', error));
		return typesetChain;
	}

	// Plotly typesets every graph label afresh on each redraw, in a hidden div named math-output-*.
	// Finished output is kept by font size and TeX, so a redraw with unchanged labels typesets nothing.
	const PLOT_TEX_CACHE_LIMIT = 300;
	const plotTexCache = new Map();
	let plotTexCacheInstalled = false;

	// Needs the single startup set up in panphyplot.html; otherwise Plotly's restarts replace the wrapper.
	function installPlotTexCache() {
		if (plotTexCacheInstalled) return;
		if (typeof MathJax === 'undefined' || !MathJax.startup?.restartDisabled || typeof MathJax.typeset !== 'function') return;
		plotTexCacheInstalled = true;
		const original = MathJax.typeset;
		MathJax.typeset = function(elements) {
			const element = Array.isArray(elements) && elements.length === 1 ? elements[0] : null;
			if (!element || element.nodeType !== 1 || !String(element.id).startsWith('math-output-')) {
				return original.apply(this, arguments);
			}
			const key = `${element.style.fontSize}|${element.textContent}`;
			const cached = plotTexCache.get(key);
			if (cached) {
				element.innerHTML = cached;
				return undefined;
			}
			let result;
			try {
				result = original.call(this, [element]);
			} catch (error) {
				// A label that needs a file loaded first (\require) shows as plain text, then redraws once it is ready.
				if (error?.retry) error.retry.then(() => { forceReplot(); plotGraph(); }).catch(() => {});
				else console.warn('MathJax typeset skipped:', error);
				return undefined;
			}
			const output = element.querySelector('mjx-container');
			if (output && output.querySelector('svg')) {
				const copy = output.cloneNode(true);
				copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
				plotTexCache.delete(key);
				plotTexCache.set(key, copy.outerHTML);
				if (plotTexCache.size > PLOT_TEX_CACHE_LIMIT) plotTexCache.delete(plotTexCache.keys().next().value);
			}
			// Plotly removes the div once it has read the output.
			MathJax.typesetClear([element]);
			return result;
		};
	}

	// One axis label in the current mode, before the $...$ wrapping.
	function columnAxisText(sheet, column) {
		const name = PlotModel.getColumnLabel(sheet, column);
		// A bar is labeled by its name alone; the value axis carries the unit.
		if (PlotModel.isBarSheet(sheet)) return latexMode ? formatLabelForLatex(name) : name;
		return latexMode
			? PlotModel.formatAxisLabel(formatLabelForLatex(name), column.unit, true)
			: PlotModel.formatAxisLabel(name, column.unit, false);
	}

	function joinLabels(labels) {
		return labels.join(latexMode ? ',\\ ' : ', ');
	}

	// Several Y columns that share a unit read "T1, T2 / s"; mixed units list each label in full.
	function describeAxis(sheet, columns) {
		const unique = columns.filter((column, index) => columns.indexOf(column) === index);
		if (!unique.length) return '';
		const units = new Set(unique.map(column => String(column.unit || '').trim()));
		if (unique.length > 1 && units.size === 1) {
			const names = unique.map(column => {
				const name = PlotModel.getColumnLabel(sheet, column);
				return latexMode ? formatLabelForLatex(name) : name;
			});
			return PlotModel.formatAxisLabel(joinLabels(names), unique[0].unit, latexMode);
		}
		return joinLabels(unique.map(column => columnAxisText(sheet, column)));
	}

	function getVisibleSeries(sheet) {
		return PlotModel.getSeries(sheet).filter(series => series.xCol && !sheet.hiddenSeries.includes(series.id));
	}

	function getAxisTitles(sheet) {
		const visible = getVisibleSeries(sheet);
		const plotted = visible.length ? visible : PlotModel.getSeries(sheet).filter(series => series.xCol);
		return {
			x: describeAxis(sheet, plotted.map(series => series.xCol)),
			y: describeAxis(sheet, plotted.map(series => series.yCol))
		};
	}

	// The value axis of a bar sheet, "name / unit"; with a unit but no name it reads "Value / unit".
	function barValueAxisText(sheet) {
		const unit = String(sheet.valueAxis?.unit || '').trim();
		const name = String(sheet.valueAxis?.name || '').trim() || (unit ? 'Value' : '');
		return PlotModel.formatAxisLabel(latexMode ? formatLabelForLatex(name) : name, unit, latexMode);
	}

	function barCategoryAxisText(sheet) {
		const title = String(sheet.categoryTitle || '').trim();
		return latexMode ? formatLabelForLatex(title) : title;
	}

	function getAutomaticBarTitle(sheet) {
		const value = String(sheet.valueAxis?.name || '').trim();
		const category = String(sheet.categoryTitle || '').trim();
		if (!value || !PlotModel.hasBars(sheet)) return '';
		if (!category) return latexMode ? formatLabelForLatex(value) : value;
		return latexMode
			? `${formatLabelForLatex(value)}\\space \\text{ by }\\space ${formatLabelForLatex(category)}`
			: `${value} by ${category}`;
	}

	function getAutomaticTitle(sheet) {
		if (PlotModel.isBarSheet(sheet)) return getAutomaticBarTitle(sheet);
		const plotted = getVisibleSeries(sheet);
		if (!plotted.length) return '';
		const name = (column) => {
			const label = PlotModel.getColumnLabel(sheet, column);
			return latexMode ? formatLabelForLatex(label) : label;
		};
		const yNames = joinLabels(plotted.map(series => name(series.yCol)));
		const xNames = joinLabels(plotted.map(series => series.xCol).filter((column, index, all) => all.indexOf(column) === index).map(name));
		return latexMode ? `${yNames}\\space \\text{ vs }\\space ${xNames}` : `${yNames} vs ${xNames}`;
	}

	function getSheetTitle(sheet) {
		return sheet.title.automatic ? getAutomaticTitle(sheet) : sheet.title.text;
	}

	// The pane header shows the title on screen; a saved image carries it inside the figure.
	function getExportFigure(gd) {
		const title = gd.dataset.exportTitle || '';
		const layout = { ...gd.layout, paper_bgcolor: readToken('--surface', '#ffffff') };
		if (title) {
			layout.title = { text: title, font: { size: 16, family: layout.font && layout.font.family } };
			layout.margin = { ...(layout.margin || {}), t: Math.max((layout.margin && layout.margin.t) || 0, 70) };
		}
		return { data: gd.data, layout };
	}

	function readToken(name, fallback) {
		const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
		return value || fallback;
	}

	// Colors follow the page's own tokens, so the graph sits on its pane in either theme.
	function applyThemeLayout(layout, themeSettings) {
		['xaxis', 'yaxis'].forEach((axis) => {
			const theme = themeSettings.layout[axis];
			if (!theme) return;
			const title = { ...layout[axis].title, ...(theme.title || {}) };
			title.font = { ...(layout[axis].title.font || {}), ...((theme.title && theme.title.font) || {}) };
			layout[axis] = { ...layout[axis], ...theme, title };
		});
		const ink = readToken('--ink', '#17181a');
		const muted = readToken('--ink-2', '#55585e');
		const line = readToken('--line', '#e6e1d7');
		const strong = readToken('--line-strong', '#d3ccbe');
		const bodyFont = readToken('--font-body', 'Figtree, system-ui, sans-serif');
		const monoFont = readToken('--font-mono', '"IBM Plex Mono", ui-monospace, monospace');
		layout.paper_bgcolor = 'rgba(0,0,0,0)';
		layout.plot_bgcolor = 'rgba(0,0,0,0)';
		layout.font = { family: bodyFont, size: 12.5, color: muted };
		['xaxis', 'yaxis'].forEach((axis) => {
			layout[axis] = {
				...layout[axis],
				gridcolor: line,
				zerolinecolor: strong,
				linecolor: strong,
				tickcolor: strong,
				tickfont: { family: monoFont, size: 11, color: muted },
				title: { ...layout[axis].title, font: { ...(layout[axis].title.font || {}), family: bodyFont, size: 13.5, color: ink } }
			};
		});
		layout.legend = { ...(layout.legend || {}), font: { color: ink, size: 12.5 } };
		layout.hoverlabel = {
			bgcolor: readToken('--surface', '#ffffff'),
			bordercolor: muted,
			font: { family: monoFont, color: ink }
		};
		layout.modebar = { bgcolor: 'rgba(0,0,0,0)', color: readToken('--ink-3', '#8a8c91'), activecolor: readToken('--accent', '#0f766e') };
		return layout;
	}

	function buildLayout(titleText, xTitle, yTitle, options = {}) {
		return {
			title: { text: options.showTitle && titleText ? processLabel(titleText) : '', font: { size: 16 } },
			showlegend: options.showlegend !== false,
			// Above the plot, left of the toolbar, so it never meets the x-axis title.
			legend: { orientation: 'h', x: 0, xanchor: 'left', y: 1.01, yanchor: 'bottom' },
			xaxis: {
				title: { text: processLabel(xTitle) },
				showline: false, linewidth: 1, autorange: true, rangemode: 'tozero', zeroline: true, zerolinewidth: 2
			},
			yaxis: {
				title: { text: processLabel(yTitle), font: { size: 14 }, standoff: 25 },
				automargin: true, showline: false, linewidth: 1, autorange: true, rangemode: 'tozero', zeroline: true, zerolinewidth: 2
			},
			margin: { t: (options.showTitle && titleText ? 64 : 22) + (options.showlegend === false ? 12 : 30), b: 56, l: 76, r: 24 }
		};
	}

	// Smaller dots for denser data, so many points read as a trace rather than a blob;
	// dense data also drops the dot edge, which would darken its color.
	function markerSize(count) {
		if (count > 400) return 5.5;
		if (count > 150) return 6;
		return 7;
	}

	function mixHex(hex, other, amount) {
		const parse = value => [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16));
		const a = parse(hex);
		const b = parse(other);
		if (a.some(Number.isNaN) || b.some(Number.isNaN)) return hex;
		return `#${a.map((v, i) => Math.round(v + (b[i] - v) * amount).toString(16).padStart(2, '0')).join('')}`;
	}

	// How a series is drawn: `assigned` is its entry from PlotModel.assignSeriesColors. `print`
	// travels on the traces as panphyStyle, for the Publication download.
	function seriesLook(column, assigned) {
		const swatch = SWATCHES[assigned?.color] || SWATCHES.blue;
		const style = PlotModel.normalizeStyle(column?.style);
		return {
			color: isDarkTheme() ? swatch.dark : swatch.light,
			symbol: style.symbol || 'circle',
			fitColor: style.fitColor ? swatchLineColor(style.fitColor) : isDarkTheme() ? swatch.fitDark : swatch.fitLight,
			print: {
				print: swatch.print,
				symbol: style.symbol,
				printFit: style.fitColor ? SWATCHES[style.fitColor].print : '',
				printFitContrast: swatch.printFit
			}
		};
	}

	function seriesTraces(sheet, series, assigned, themeSettings, options = {}) {
		const look = seriesLook(series.yCol, assigned);
		const { color, fitColor } = look;
		const points = PlotModel.getSeriesPoints(sheet, series);
		const hidden = sheet.hiddenSeries.includes(series.id);
		const key = makeFitKey(sheet, series.id);
		const prefix = options.prefix || '';
		const yLabel = PlotModel.getColumnLabel(sheet, series.yCol);
		const name = processLabel(latexMode ? `${prefix ? `\\text{${prefix}} ` : ''}${formatLabelForLatex(yLabel)}` : `${prefix}${yLabel}`);
		const traces = [{
			x: points.map(point => point.x),
			y: points.map(point => point.y),
			mode: 'markers',
			name,
			meta: key,
			legendgroup: key,
			hovertemplate: '%{fullData.name}<br>(%{x}, %{y})<extra></extra>',
			visible: !hidden && points.length > 0,
			panphyStyle: look.print,
			marker: { color, symbol: look.symbol, size: markerSize(points.length), opacity: 0.9, line: { color: mixHex(color, '#000000', 0.35), width: points.length > 150 ? 0 : 0.75 } },
			error_x: { type: 'data', array: points.map(point => point.xError), visible: !!series.xErrCol, color: themeSettings.errorColor, thickness: 0.8, width: 2 },
			error_y: { type: 'data', array: points.map(point => point.yError), visible: !!series.yErrCol, color: themeSettings.errorColor, thickness: 0.8, width: 2 }
		}];
		const curve = fittedCurves[key];
		if (curve && Array.isArray(curve.x)) {
			const stale = !!datasetFitResults[key]?.stale;
			const line = options.xView ? zoomedCurve(key, curve, options.xView) : curve;
			// The fit sits above the points but is narrower than them, so points that lie
			// exactly on it still show on both sides. Plotly's line simplification is off, because
			// it drops points by screen pixels and leaves visible corners in enlarged image exports.
			traces.push({
				x: line.x,
				y: line.y,
				mode: 'lines',
				name: fitLegendName(name, stale, false),
				meta: key,
				panphyStyle: look.print,
				legendgroup: key,
				showlegend: true,
				hovertemplate: '%{fullData.name}<br>(%{x}, %{y})<extra></extra>',
				visible: !hidden && points.length > 0 && line.x.length > 0,
				line: { color: fitColor, width: 1.75, dash: stale ? 'dash' : 'solid', simplify: false }
			});
		}
		return traces;
	}

	/* ---------- Bar charts ---------- */

	// A bar's color in its own sheet's chart, as its column heading wears it.
	function getBarColor(sheet, columnId) {
		const index = sheet ? sheet.columns.findIndex(column => column.id === columnId) : -1;
		return swatchColor(index >= 0 ? PlotModel.assignBarColors(sheet)[index].color : AUTO_SWATCHES[0]);
	}

	// Past the end of a palette, later series take a shade of the same hues, towards `towards`.
	function shadedColor(colors, index, towards) {
		const round = Math.floor(index / colors.length);
		const color = colors[index % colors.length];
		return round ? mixHex(color, towards, Math.min(0.3 * round, 0.6)) : color;
	}

	function formatBarValue(value) {
		return String(Number(value.toPrecision(6)));
	}

	// A legend entry or tick label that is a name, not mathematics (a sheet's name).
	function plainLabel(text) {
		return latexMode ? `$\\text{${String(text).replace(/[\\{}$%&#_^~]/g, ' ')}}$` : text;
	}

	function barLabel(text) {
		return processLabel(latexMode ? formatLabelForLatex(text) : text);
	}

	// Bars sit at whole-number positions with their names as tick labels, so two bars with the
	// same name stay apart. entries[i] is { bar, errors, prefix } or null where there is no bar to draw.
	function barTrace(entries, color, themeSettings, options = {}) {
		const drawn = entry => entry && entry.bar && entry.bar.mean !== null;
		const describe = (entry) => {
			const { bar } = entry;
			const spread = entry.errors && bar.uncertainty !== null ? ` ± ${formatBarValue(bar.uncertainty)}` : '';
			const count = bar.count > 1 ? ` (mean of ${bar.count})` : '';
			return `${entry.prefix || ''}${bar.label}<br>${formatBarValue(bar.mean)}${spread}${count}`;
		};
		return {
			type: 'bar',
			x: entries.map((entry, index) => index),
			y: entries.map(entry => (drawn(entry) ? entry.bar.mean : null)),
			name: options.name || '',
			customdata: entries.map(entry => (drawn(entry) ? describe(entry) : '')),
			hovertemplate: '%{customdata}<extra></extra>',
			marker: { color, line: { color: Array.isArray(color) ? color.map(entry => mixHex(entry, '#000000', 0.35)) : mixHex(color, '#000000', 0.35), width: 0.75 } },
			...(options.print ? { panphyStyle: { print: options.print } } : {}),
			error_y: {
				type: 'data',
				array: entries.map(entry => (drawn(entry) && entry.errors && entry.bar.uncertainty !== null ? entry.bar.uncertainty : 0)),
				visible: entries.some(entry => drawn(entry) && entry.errors && entry.bar.uncertainty !== null),
				// Half of each error bar lies over its bar, where the scatter graphs' gray would be lost.
				color: readToken('--ink', '#17181a'),
				thickness: 1.2,
				width: 5
			}
		};
	}

	// A bar chart does not zoom or pan: its bars axis is a list of names, and both axes are fixed.
	// Its one button, Auto-scale, fits the value axis closely to the bars (and their error bars) so
	// that bars of similar height can be told apart; pressing it again starts the axis from zero.
	function scaleBarsToData(gd) {
		if (gd.layout?.yaxis?.autorange === false) {
			Plotly.relayout(gd, { 'yaxis.autorange': true });
			return;
		}
		let min = Infinity;
		let max = -Infinity;
		(Array.isArray(gd.data) ? gd.data : []).forEach((trace) => {
			if (trace.type !== 'bar' || trace.visible === false || trace.visible === 'legendonly') return;
			trace.y.forEach((value, index) => {
				if (!Number.isFinite(value)) return;
				const error = trace.error_y?.visible ? Number(trace.error_y.array?.[index]) || 0 : 0;
				min = Math.min(min, value - error);
				max = Math.max(max, value + error);
			});
		});
		if (!Number.isFinite(min) || !Number.isFinite(max)) return;
		const padding = max > min ? (max - min) * 0.08 : Math.abs(max) * 0.05 || 1;
		Plotly.relayout(gd, { 'yaxis.autorange': false, 'yaxis.range': [min - padding, max + padding] });
	}

	function barConfig() {
		return {
			responsive: true,
			displayModeBar: true,
			displaylogo: false,
			modeBarButtons: [[{
				name: 'Auto-scale to the bars, or back to zero',
				icon: Plotly.Icons.autoscale,
				click: scaleBarsToData
			}]]
		};
	}

	function buildBarLayout(titleText, xTitle, yTitle, labels, options = {}) {
		const layout = buildLayout(titleText, xTitle, yTitle, options);
		layout.xaxis = {
			...layout.xaxis,
			rangemode: 'normal',
			zeroline: false,
			showgrid: false,
			automargin: true,
			tickmode: 'array',
			tickvals: labels.map((label, index) => index),
			ticktext: labels,
			autorange: false,
			range: [-0.5, Math.max(labels.length, 1) - 0.5],
			fixedrange: true
		};
		layout.yaxis.fixedrange = true;
		layout.bargap = 0.28;
		layout.bargroupgap = 0.06;
		if (options.grouped) layout.barmode = 'group';
		return layout;
	}

	function plotBarGraph(sheet, themeSettings) {
		const bars = PlotModel.getBars(sheet);
		// Each bar has its own color: the sheet's shared one, or one chosen for it.
		const colors = PlotModel.assignBarColors(sheet).map(entry => entry.color);
		const data = [barTrace(bars.map(bar => ({ bar, errors: sheet.errorBars })), colors.map(swatchColor), themeSettings,
			{ print: colors.map(key => SWATCHES[key].print) })];
		const layout = applyThemeLayout(buildBarLayout(getSheetTitle(sheet), barCategoryAxisText(sheet), barValueAxisText(sheet),
			bars.map(bar => barLabel(bar.label)), { showlegend: false }), themeSettings);
		// An auto-scaled value axis is remembered with the sheet, as a scatter graph's zoom is.
		const view = PlotModel.normalizeGraphView(sheet.graphView).yaxis;
		if (view) {
			layout.yaxis.autorange = false;
			layout.yaxis.range = view;
		}
		const element = document.getElementById('plot');
		element.dataset.viewSheet = sheet.id;
		element.dataset.exportTitle = processLabel(getSheetTitle(sheet) || '');
		reactIfChanged('plot', data, layout, barConfig());
		bindLegendToggle('plot');
		bindGraphView(element);
		const empty = document.getElementById('graph-empty');
		if (empty) empty.hidden = bars.some(bar => bar.mean !== null);
		plotResiduals();
	}

	// Every bar sheet together, as groups of bars. Grouped by columns, each column name is a group
	// with one bar for each sheet (months, a bar for each year); grouped by sheets, each sheet is a
	// group with one bar for each column (classes, a bar for each sport).
	function plotAllBars(themeSettings) {
		const grid = PlotModel.getCombinedBars(plotState.sheets);
		const bySheets = plotState.combinedGroupBy === 'sheets';
		const sheetNames = grid.sheets.map(sheet => getSheetDisplayName(plotState.sheets.indexOf(sheet)));
		const columnNames = grid.columns.map(column => column.label);
		const groups = bySheets ? sheetNames.map(plainLabel) : columnNames.map(barLabel);
		const series = bySheets ? columnNames : sheetNames;
		const towards = document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#000000';
		const data = series.map((name, s) => {
			const entries = groups.map((group, g) => {
				const sheetIndex = bySheets ? g : s;
				const bar = grid.cells[sheetIndex][bySheets ? s : g];
				return bar ? { bar, errors: grid.sheets[sheetIndex].errorBars, prefix: `${sheetNames[sheetIndex]}: ` } : null;
			});
			return barTrace(entries, shadedColor(themeSettings.datasetColors, s, towards), themeSettings, {
				name: bySheets ? barLabel(name) : plainLabel(name)
			});
		});
		const first = grid.sheets[0];
		const inputs = getCombinedInputs();
		if (inputs.title.dataset.edited !== 'true') inputs.title.value = '';
		if (inputs.x.dataset.edited !== 'true') inputs.x.value = first && !bySheets ? barCategoryAxisText(first) : '';
		if (inputs.y.dataset.edited !== 'true') inputs.y.value = first ? barValueAxisText(first) : '';
		const layout = applyThemeLayout(buildBarLayout(inputs.title.value.trim(), inputs.x.value.trim(), inputs.y.value.trim(), groups,
			{ showTitle: true, showlegend: series.length > 1, grouped: true }), themeSettings);
		reactIfChanged('popup-plot', data, layout, barConfig());
		bindLegendToggle('popup-plot');
	}

	// A fit line holds a fixed number of points across its whole length, so a zoomed-in view of a
	// fast curve (such as a sinusoid over many cycles) would show straight segments. When zoomed,
	// the line is redrawn from its fit function across the view, plus one view width on each side
	// so a short pan still shows the line before it is redrawn.
	const ZOOMED_CURVE_POINTS = 1500;

	function zoomedCurve(key, curve, xView) {
		const fn = typeof fitFunctions !== 'undefined' ? fitFunctions[key] : null;
		const xs = curve.x.filter(Number.isFinite);
		if (typeof fn !== 'function' || xs.length < 2) return curve;
		const low = Math.min(...xs);
		const high = Math.max(...xs);
		const viewLow = Math.min(xView[0], xView[1]);
		const viewHigh = Math.max(xView[0], xView[1]);
		const width = viewHigh - viewLow;
		const from = Math.max(low, viewLow - width);
		const to = Math.min(high, viewHigh + width);
		// Only worth it when the view is narrower than the line and still meets it.
		if (!(to > from) || to - from >= 0.9 * (high - low)) return curve;
		const x = Array.from({ length: ZOOMED_CURVE_POINTS }, (_, i) => from + (i * (to - from)) / (ZOOMED_CURVE_POINTS - 1));
		const y = x.map((value) => {
			try {
				const result = fn(value);
				return Number.isFinite(result) ? result : null;
			} catch (error) {
				return null;
			}
		});
		return y.some(value => value !== null) ? { x, y } : curve;
	}

	// Points first, then every fit, so no series' points cover another series' fit.
	function pointsBeforeFits(traces) {
		return traces.filter(trace => trace.mode === 'markers').concat(traces.filter(trace => trace.mode !== 'markers'));
	}

	const lastPlotKeys = {};

	function reactIfChanged(targetId, data, layout, config) {
		const dataKey = JSON.stringify(data);
		const layoutKey = JSON.stringify(layout);
		const last = lastPlotKeys[targetId];
		if (last && last.dataKey === dataKey && last.layoutKey === layoutKey) return false;
		Plotly.react(targetId, data, layout, config);
		lastPlotKeys[targetId] = { dataKey, layoutKey };
		return true;
	}

	function forceReplot() {
		Object.keys(lastPlotKeys).forEach(key => delete lastPlotKeys[key]);
	}

	// Tapping a data or fit legend entry hides its series and fit; the Series card restores them.
	function bindLegendToggle(targetId) {
		const element = document.getElementById(targetId);
		if (!element || element.dataset.legendBound === 'true' || typeof element.on !== 'function') return;
		element.dataset.legendBound = 'true';
		element.on('plotly_legendclick', (event) => {
			// A bar series has no saved visibility: Plotly hides or shows it for this view.
			if (event?.data?.[event.curveNumber]?.type === 'bar') return undefined;
			const key = event?.data?.[event.curveNumber]?.meta;
			const target = resolveFitKey(key);
			if (!target) return false;
			const hidden = target.sheet.hiddenSeries;
			const index = hidden.indexOf(target.series.id);
			if (index >= 0) hidden.splice(index, 1);
			else hidden.push(target.series.id);
			if (typeof onSeriesVisibilityChange === 'function') onSeriesVisibilityChange(target.sheet);
			return false;
		});
		element.on('plotly_legenddoubleclick', () => false);
	}

	// Remember user zoom/pan per sheet so project files rebuild the same graph view.
	function bindGraphView(element) {
		if (element.dataset.viewBound === 'true' || typeof element.on !== 'function') return;
		element.dataset.viewBound = 'true';
		element.on('plotly_relayout', changes => {
			const sheet = plotState.sheets.find(entry => entry.id === element.dataset.viewSheet);
			if (!sheet) return;
			sheet.graphView ||= {};
			let changed = false;
			['xaxis', 'yaxis'].forEach(axis => {
				if (!Object.keys(changes).some(key => key.startsWith(`${axis}.`))) return;
				if (changes[`${axis}.autorange`] === true) delete sheet.graphView[axis];
				else {
					const range = element.layout?.[axis]?.range;
					if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isFinite)) return;
					sheet.graphView[axis] = range.slice();
				}
				changed = true;
			});
			if (!changed) return;
			scheduleSaveState();
			// Redraw fit lines for the new x view (see zoomedCurve).
			if (Object.keys(changes).some(key => key.startsWith('xaxis.'))) requestAnimationFrame(() => plotGraph());
		});
	}

	function plotGraph() {
		if (typeof Plotly === 'undefined') return;
		installPlotTexCache();
		const sheet = getActiveSheet();
		const themeSettings = getPlotThemeSettings();
		if (PlotModel.isBarSheet(sheet)) {
			plotBarGraph(sheet, themeSettings);
			return;
		}
		const series = PlotModel.getSeries(sheet).filter(entry => entry.xCol);
		const xView = PlotModel.normalizeGraphView(sheet.graphView).xaxis || null;
		const assigned = PlotModel.assignSeriesColors(series.map(entry => entry.yCol));
		const data = pointsBeforeFits(series.flatMap((entry, index) => seriesTraces(sheet, entry, assigned[index], themeSettings, { xView })));
		const titles = getAxisTitles(sheet);
		const layout = applyThemeLayout(buildLayout(getSheetTitle(sheet), titles.x || 'x', titles.y || 'y', { showlegend: data.filter(isShownTrace).length > 1 }), themeSettings);
		const element = document.getElementById('plot');
		Object.entries(PlotModel.normalizeGraphView(sheet.graphView)).forEach(([axis, range]) => {
			layout[axis].autorange = false;
			layout[axis].range = range;
		});
		element.dataset.viewSheet = sheet.id;
		element.dataset.exportTitle = processLabel(getSheetTitle(sheet) || '');
		reactIfChanged('plot', data, layout, createDownloadImageConfig(sheet.name || 'data_plot'));
		bindLegendToggle('plot');
		bindGraphView(element);
		const empty = document.getElementById('graph-empty');
		if (empty) empty.hidden = data.some(trace => trace.mode === 'markers' && trace.x.length);
		plotResiduals();
	}

	// Residuals of the fit on the chosen series, drawn under the main graph.
	function plotResiduals() {
		installPlotTexCache();
		const wrap = document.getElementById('residual-wrap');
		const result = datasetFitResults[activeFitKey];
		const target = resolveFitKey(activeFitKey);
		const residuals = Array.isArray(result?.residuals) ? result.residuals : [];
		// A bar sheet keeps its scatter fits for when it is switched back, but shows none of them.
		if (!wrap || !target || !residuals.length || PlotModel.isBarSheet(getActiveSheet())) {
			if (wrap) wrap.hidden = true;
			return;
		}
		wrap.hidden = false;
		// Folded by default: only the heading shows until it is opened.
		const open = plotState.showResiduals === true;
		wrap.classList.toggle('is-folded', !open);
		document.getElementById('residual-toggle').setAttribute('aria-expanded', String(open));
		document.getElementById('residual-plot').hidden = !open;
		if (!open) return;
		const themeSettings = getPlotThemeSettings();
		const color = getSeriesColor(target.sheet, target.series.id) || themeSettings.datasetColors[0];
		const yTitle = latexMode ? `\\text{residual } ${columnAxisText(target.sheet, target.series.yCol)}` : `residual ${columnAxisText(target.sheet, target.series.yCol)}`;
		const layout = applyThemeLayout(buildLayout('', columnAxisText(target.sheet, target.series.xCol), yTitle, { showlegend: false }), themeSettings);
		layout.margin = { t: 16, b: 60, l: 85, r: 30 };
		layout.yaxis.rangemode = 'normal';
		layout.yaxis.title.font = { ...(layout.yaxis.title.font || {}), size: 12 };
		const data = [{
			x: residuals.map(point => point.x),
			y: residuals.map(point => point.y),
			mode: 'markers',
			name: 'Residuals',
			marker: { color, size: 6 },
			hovertemplate: '%{x}, %{y}<extra></extra>'
		}];
		reactIfChanged('residual-plot', data, layout, { responsive: true, displaylogo: false, displayModeBar: false });
	}

	function plotAllSheets() {
		installPlotTexCache();
		const themeSettings = getPlotThemeSettings();
		const barMode = PlotModel.getCombinedMode(plotState.sheets) === 'bar';
		const groupRow = document.getElementById('combined-group-row');
		if (groupRow) {
			groupRow.hidden = !barMode;
			groupRow.querySelectorAll('[data-group-by]').forEach((button) => {
				button.setAttribute('aria-pressed', String(button.dataset.groupBy === plotState.combinedGroupBy));
			});
		}
		if (barMode) {
			plotAllBars(themeSettings);
			return;
		}
		const multiple = plotState.sheets.length > 1;
		const data = [];
		const xColumns = [];
		const yColumns = [];
		// Empty series (such as a new sheet's blank columns) would only clutter the legend and labels.
		const plotted = plotState.sheets.map(sheet => PlotModel.getSeries(sheet).filter(entry => entry.xCol && PlotModel.getSeriesPoints(sheet, entry).length));
		// Chosen colors and shapes follow their series here; the rest share the palette across every sheet.
		const assigned = PlotModel.assignSeriesColors(plotted.flat().map(entry => entry.yCol));
		let order = 0;
		plotState.sheets.forEach((sheet, sheetIndex) => {
			plotted[sheetIndex].forEach((entry) => {
				const prefix = multiple ? `${getSheetDisplayName(sheetIndex)}: ` : '';
				data.push(...seriesTraces(sheet, entry, assigned[order++], themeSettings, { prefix }));
				if (!sheet.hiddenSeries.includes(entry.id)) {
					xColumns.push({ sheet, column: entry.xCol });
					yColumns.push({ sheet, column: entry.yCol });
				}
			});
		});
		const describe = (entries) => {
			const labels = entries.map(({ sheet, column }) => columnAxisText(sheet, column));
			return joinLabels(labels.filter((label, index) => labels.indexOf(label) === index));
		};
		const inputs = getCombinedInputs();
		if (inputs.title.dataset.edited !== 'true') inputs.title.value = '';
		if (inputs.x.dataset.edited !== 'true') inputs.x.value = describe(xColumns);
		if (inputs.y.dataset.edited !== 'true') inputs.y.value = describe(yColumns);
		const layout = applyThemeLayout(buildLayout(inputs.title.value.trim(), inputs.x.value.trim(), inputs.y.value.trim(), { showTitle: true, showlegend: data.filter(isShownTrace).length > 1 }), themeSettings);
		reactIfChanged('popup-plot', pointsBeforeFits(data), layout, createDownloadImageConfig('combined_plot'));
		bindLegendToggle('popup-plot');
	}

	function getCombinedInputs() {
		return {
			title: document.getElementById('combined-title'),
			x: document.getElementById('combined-x-label'),
			y: document.getElementById('combined-y-label')
		};
	}

	// The plotted series of a sheet share the palette in order, so a Y column's color is stable.
	function getSeriesColor(sheet, seriesId) {
		return getSeriesLook(sheet, seriesId)?.color || null;
	}

	// A plotted series' colors and shape as drawn on its own sheet's graph, or null if it is not plotted.
	function getSeriesLook(sheet, seriesId) {
		const series = PlotModel.getSeries(sheet).filter(entry => entry.xCol);
		const index = series.findIndex(entry => entry.id === seriesId);
		if (index < 0) return null;
		return seriesLook(series[index].yCol, PlotModel.assignSeriesColors(series.map(entry => entry.yCol))[index]);
	}

	// The Download button in the graph pane's header opens the Download graph dialog.
	document.getElementById('graph-download-button')?.addEventListener('click', () => {
		const gd = document.getElementById('plot');
		if (typeof Plotly === 'undefined' || !gd || !gd._fullLayout) return;
		openExportDialog(gd, getActiveSheet()?.name || 'data_plot');
	});

	// The combined window has its own Download button, with the same dialog.
	document.getElementById('popup-download-button')?.addEventListener('click', () => {
		const gd = document.getElementById('popup-plot');
		if (typeof Plotly === 'undefined' || !gd || !gd._fullLayout) return;
		openExportDialog(gd, 'combined_plot');
	});

	Object.assign(window, {
		getSeriesColor,
		getSeriesLook,
		getBarColor,
		swatchColor,
		swatchLineColor,
		SWATCH_LABELS: Object.fromEntries(Object.entries(SWATCHES).map(([key, swatch]) => [key, swatch.label])),
		SYMBOL_LABELS,
		sanitizeFilename,
		saveBlobWithFallback,
		processLabel,
		formatLabelForLatex,
		safeTypeset,
		getAutomaticTitle,
		getSheetTitle,
		columnAxisText,
		plotGraph,
		plotResiduals,
		plotAllSheets,
		forceReplot
	});
})();
