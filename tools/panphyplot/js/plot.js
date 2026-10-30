// Plotting for PanPhyPlot: every Y series of a sheet, its fits and residuals.
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

	function getPlotThemeSettings() {
		const theme = document.documentElement.getAttribute('data-theme') || 'light';
		if (theme !== 'dark') {
			// Light theme – distinct data colors with contrasting fit hues
			return {
				errorColor: '#5b5b5b',
				// Data point colors: muted but distinct (Tableau 10 first six)
				datasetColors: ['#4e79a7', '#e15759', '#59a14f', '#f28e2b', '#b07aa1', '#76b7b2'],
				// Fit hues differ from their corresponding points, rather than just changing brightness
				fitColors: ['#b45309', '#1d4ed8', '#9333a8', '#0e7490', '#3f6212', '#be123c'],
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
			// Data point colors: bright, clear on dark background
			datasetColors: ['#7cb5ec', '#f48183', '#8bcf86', '#f9b06a', '#d1a4c5', '#a2dad6'],
			// Preserve the contrasting fit hue families on the dark surface
			fitColors: ['#ffc078', '#80cfff', '#e5adff', '#82ded5', '#d1e884', '#ff9db8'],
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
						const dataUrl = await Plotly.toImage(getExportFigure(gd), {
							format: 'png',
							scale: exportScale,
							width: gd._fullLayout.width,
							height: gd._fullLayout.height
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

	function getAutomaticTitle(sheet) {
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

	function seriesTraces(sheet, series, colorIndex, themeSettings, options = {}) {
		const color = themeSettings.datasetColors[colorIndex % themeSettings.datasetColors.length];
		const fitColor = themeSettings.fitColors[colorIndex % themeSettings.fitColors.length];
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
			visible: hidden ? 'legendonly' : true,
			marker: { color, symbol: 'circle', size: markerSize(points.length), opacity: 0.9, line: { color: mixHex(color, '#000000', 0.35), width: points.length > 150 ? 0 : 0.75 } },
			error_x: { type: 'data', array: points.map(point => point.xError), visible: !!series.xErrCol, color: themeSettings.errorColor, thickness: 0.8, width: 2 },
			error_y: { type: 'data', array: points.map(point => point.yError), visible: !!series.yErrCol, color: themeSettings.errorColor, thickness: 0.8, width: 2 }
		}];
		const curve = fittedCurves[key];
		if (curve && Array.isArray(curve.x)) {
			const stale = !!datasetFitResults[key]?.stale;
			// The fit sits above the points but is narrower than them, so points that lie
			// exactly on it still show on both sides.
			traces.push({
				x: curve.x,
				y: curve.y,
				mode: 'lines',
				name: stale ? `Outdated fit: ${prefix}${yLabel}` : `Fit: ${prefix}${yLabel}`,
				meta: key,
				legendgroup: key,
				showlegend: false,
				hovertemplate: '%{fullData.name}<br>(%{x}, %{y})<extra></extra>',
				visible: hidden ? 'legendonly' : true,
				line: { color: fitColor, width: 1.75, dash: stale ? 'dash' : 'solid' }
			});
		}
		return traces;
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

	// Tapping a legend entry hides or shows that series (and its fit) and remembers it per sheet.
	function bindLegendToggle(targetId) {
		const element = document.getElementById(targetId);
		if (!element || element.dataset.legendBound === 'true' || typeof element.on !== 'function') return;
		element.dataset.legendBound = 'true';
		element.on('plotly_legendclick', (event) => {
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
			if (changed) scheduleSaveState();
		});
	}

	function plotGraph() {
		if (typeof Plotly === 'undefined') return;
		installPlotTexCache();
		const sheet = getActiveSheet();
		const themeSettings = getPlotThemeSettings();
		const series = PlotModel.getSeries(sheet).filter(entry => entry.xCol);
		const data = pointsBeforeFits(series.flatMap((entry, index) => seriesTraces(sheet, entry, index, themeSettings)));
		const titles = getAxisTitles(sheet);
		const layout = applyThemeLayout(buildLayout(getSheetTitle(sheet), titles.x || 'x', titles.y || 'y', { showlegend: series.length > 1 }), themeSettings);
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
		if (!wrap || !target || !residuals.length) {
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
		const index = PlotModel.getSeries(target.sheet).filter(entry => entry.xCol).findIndex(entry => entry.id === target.series.id);
		const color = themeSettings.datasetColors[Math.max(index, 0) % themeSettings.datasetColors.length];
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
		const multiple = plotState.sheets.length > 1;
		const data = [];
		let colorIndex = 0;
		const xColumns = [];
		const yColumns = [];
		plotState.sheets.forEach((sheet, sheetIndex) => {
			// Empty series (such as a new sheet's blank columns) would only clutter the legend and labels.
			PlotModel.getSeries(sheet).filter(entry => entry.xCol && PlotModel.getSeriesPoints(sheet, entry).length).forEach((entry) => {
				const prefix = multiple ? `${getSheetDisplayName(sheetIndex)}: ` : '';
				data.push(...seriesTraces(sheet, entry, colorIndex++, themeSettings, { prefix }));
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
		const layout = applyThemeLayout(buildLayout(inputs.title.value.trim(), inputs.x.value.trim(), inputs.y.value.trim(), { showTitle: true }), themeSettings);
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
		const index = PlotModel.getSeries(sheet).filter(entry => entry.xCol).findIndex(entry => entry.id === seriesId);
		if (index < 0) return null;
		const colors = getPlotThemeSettings().datasetColors;
		return colors[index % colors.length];
	}

	Object.assign(window, {
		getSeriesColor,
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
