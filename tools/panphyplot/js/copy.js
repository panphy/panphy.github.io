// Copying from PanPhyPlot: the fitted equation as an image or LaTeX, and View Table.
// The clipboard and SVG-to-PNG helpers are copied from /misc/panphyplotog/js/ui.js.
const FIT_EQUATION_PNG_BASE_SCALE = 4;
const FIT_EQUATION_PNG_MAX_CANVAS_SIDE = 8192;
const FIT_EQUATION_PNG_MAX_PIXELS = 16777216;

function isSafariBrowser() {
	const ua = navigator.userAgent || '';
	return /Safari/.test(ua) && !/Chrome|Chromium|CriOS|Edg|Firefox|FxiOS|OPR|OPiOS|SamsungBrowser/.test(ua);
}

function canWriteClipboardItems() {
	return typeof ClipboardItem !== 'undefined'
		&& Boolean(navigator.clipboard)
		&& typeof navigator.clipboard.write === 'function';
}

function canWriteClipboardText() {
	return Boolean(navigator.clipboard)
		&& typeof navigator.clipboard.writeText === 'function';
}

async function writePlainTextToClipboard(value) {
	const text = String(value || '');
	if (!text) return false;

	if (canWriteClipboardText()) {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch {
			// Fall through to legacy copy fallback.
		}
	}

	if (typeof document.execCommand !== 'function') return false;

	const textArea = document.createElement('textarea');
	textArea.value = text;
	textArea.setAttribute('readonly', '');
	textArea.style.position = 'fixed';
	textArea.style.left = '-99999px';
	textArea.style.top = '0';
	document.body.appendChild(textArea);
	textArea.select();
	textArea.selectionStart = 0;
	textArea.selectionEnd = textArea.value.length;

	let copied = false;
	try {
		copied = document.execCommand('copy');
	} catch {
		copied = false;
	}

	if (textArea.parentNode) {
		textArea.parentNode.removeChild(textArea);
	}
	return copied;
}

function parseSvgViewBox(svg) {
	const attr = svg.getAttribute('viewBox');
	if (attr) {
		const parts = attr.trim().split(/[\s,]+/).map(Number);
		if (parts.length === 4 && parts.every(Number.isFinite)) {
			return {
				x: parts[0],
				y: parts[1],
				width: parts[2],
				height: parts[3]
			};
		}
	}

	if (svg.viewBox && svg.viewBox.baseVal) {
		const vb = svg.viewBox.baseVal;
		if ([vb.x, vb.y, vb.width, vb.height].every(Number.isFinite)) {
			return {
				x: vb.x,
				y: vb.y,
				width: vb.width,
				height: vb.height
			};
		}
	}

	return null;
}

function getFitEquationRasterScale(widthPx, heightPx) {
	const safeWidth = Math.max(1, widthPx);
	const safeHeight = Math.max(1, heightPx);
	const dpr = Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio : 1;
	const requestedScale = Math.max(FIT_EQUATION_PNG_BASE_SCALE, Math.ceil(dpr * 2));

	const maxScaleBySide = Math.min(
		FIT_EQUATION_PNG_MAX_CANVAS_SIDE / safeWidth,
		FIT_EQUATION_PNG_MAX_CANVAS_SIDE / safeHeight
	);
	const maxScaleByPixels = Math.sqrt(FIT_EQUATION_PNG_MAX_PIXELS / (safeWidth * safeHeight));

	return Math.max(1, Math.min(requestedScale, maxScaleBySide, maxScaleByPixels));
}

function prepareFitEquationSvgForCopy(target) {
	if (!target) return null;
	const svg = target.querySelector('.MathJax_SVG svg, svg');
	if (!svg) return null;

	const clone = selfContainSvg(svg);
	const paddingPx = 8;
	const rect = svg.getBoundingClientRect();
	const hasRectSize = rect.width > 0 && rect.height > 0;

	let viewBox = parseSvgViewBox(svg);
	if (!viewBox) {
		try {
			const bbox = svg.getBBox();
			if (Number.isFinite(bbox.width) && Number.isFinite(bbox.height)) {
				viewBox = {
					x: bbox.x,
					y: bbox.y,
					width: bbox.width,
					height: bbox.height
				};
			}
		} catch (err) {
			console.warn('Unable to read fit equation bounds:', err);
		}
	}
	if (!viewBox || !viewBox.width || !viewBox.height) {
		return null;
	}

	const scaleX = hasRectSize ? viewBox.width / rect.width : 1;
	const scaleY = hasRectSize ? viewBox.height / rect.height : 1;
	const paddingX = paddingPx * scaleX;
	const paddingY = paddingPx * scaleY;

	const widthPx = Math.max((hasRectSize ? rect.width : viewBox.width) + (paddingPx * 2), 20);
	const heightPx = Math.max((hasRectSize ? rect.height : viewBox.height) + (paddingPx * 2), 20);

	clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
	clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
	clone.setAttribute('width', `${widthPx}px`);
	clone.setAttribute('height', `${heightPx}px`);
	clone.setAttribute(
		'viewBox',
		`${viewBox.x - paddingX} ${viewBox.y - paddingY} ${viewBox.width + (paddingX * 2)} ${viewBox.height + (paddingY * 2)}`
	);
	clone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
	clone.setAttribute('color', '#000000');

	let svgString = new XMLSerializer().serializeToString(clone);
	svgString = svgString.replace(/currentColor/g, '#000000');

	return {
		svgString,
		widthPx,
		heightPx
	};
}

async function rasterizeFitEquationSvgToPng(svgString, widthPx, heightPx) {
	try {
		const scale = getFitEquationRasterScale(widthPx, heightPx);
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		if (!ctx) return null;

		canvas.width = Math.ceil(widthPx * scale);
		canvas.height = Math.ceil(heightPx * scale);

		const img = new Image();
		const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
		const svgObjectUrl = URL.createObjectURL(svgBlob);

		const pngBlob = await new Promise(resolve => {
			img.onload = () => {
				URL.revokeObjectURL(svgObjectUrl);
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.imageSmoothingEnabled = true;
				ctx.imageSmoothingQuality = 'high';
				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
				canvas.toBlob(blob => resolve(blob), 'image/png');
			};

			img.onerror = () => {
				URL.revokeObjectURL(svgObjectUrl);
				resolve(null);
			};

			img.src = svgObjectUrl;
		});

		return pngBlob || null;
	} catch (err) {
		console.warn('Failed to rasterize fit equation SVG:', err);
		return null;
	}
}


function selfContainSvg(svg) {
	const clone = svg.cloneNode(true);
	let defs = clone.querySelector('defs');
	if (!defs) {
		defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
		clone.insertBefore(defs, clone.firstChild);
	}

	const processed = new Set();
	const pending = new Set();
	const collectRefs = el => {
		el.querySelectorAll('use').forEach(use => {
			const href = use.getAttribute('xlink:href') || use.getAttribute('href');
			if (href && href.startsWith('#')) {
				const id = href.substring(1);
				if (!processed.has(id)) pending.add(id);
			}
		});
	};

	collectRefs(clone);
	while (pending.size > 0) {
		const id = pending.values().next().value;
		pending.delete(id);
		if (processed.has(id)) continue;
		processed.add(id);
		if (defs.querySelector('[id="' + id + '"]')) continue;
		const original = document.getElementById(id);
		if (!original) continue;
		const clonedDef = original.cloneNode(true);
		defs.appendChild(clonedDef);
		collectRefs(clonedDef);
	}

	clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
	clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
	return clone;
}

async function writeImageToClipboard(pngBlob, fallbackText) {
	if (!pngBlob || !canWriteClipboardItems()) return writePlainTextToClipboard(fallbackText);
	try {
		await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
		return true;
	} catch (error) {
		console.warn('Image copy failed; copying text instead.', error);
		return writePlainTextToClipboard(fallbackText);
	}
}

/* ---------- Fitted equation ---------- */

// Safari needs the image as a promise passed straight to ClipboardItem, inside the tap.
async function copyEquationImage(target, latex) {
	const prepared = prepareFitEquationSvgForCopy(target);
	const fallback = `$${latex}$`;
	if (!prepared || !canWriteClipboardItems()) return { ok: await writePlainTextToClipboard(fallback), image: false };
	try {
		const png = rasterizeFitEquationSvgToPng(prepared.svgString, prepared.widthPx, prepared.heightPx).then((blob) => {
			if (!blob) throw new Error('Unable to render the equation image.');
			return blob;
		});
		await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
		return { ok: true, image: true };
	} catch (error) {
		console.warn('Equation image copy failed; copying LaTeX instead.', error);
		return { ok: await writePlainTextToClipboard(fallback), image: false };
	}
}

function openEquationMenu(event) {
	const target = event.target.closest('.neo-equation');
	if (!target) return;
	const latex = target.dataset.fitLatex || '';
	openMenu(target, [
		{
			label: 'Copy as image',
			action: async () => {
				const result = await copyEquationImage(target, latex);
				showToast(!result.ok ? 'Copying is not available in this browser.' : result.image ? 'Equation copied as an image.' : 'Image copy is not available here; the LaTeX was copied instead.');
			}
		},
		{
			label: 'Copy as LaTeX',
			action: async () => showToast(await writePlainTextToClipboard(latex) ? 'Equation copied as LaTeX.' : 'Copying is not available in this browser.')
		}
	]);
}

/* ---------- View Table ---------- */

const SUPERSCRIPTS = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻', '+': '⁺' };

// Plain-text units for tables and images: s^2 and m s^{-1} read as s² and m s⁻¹.
function prettifyPowers(text) {
	return String(text || '').replace(/\^\{?([+-]?\d+)\}?/g, (match, power) => (
		[...power].every(ch => ch in SUPERSCRIPTS) ? [...power].map(ch => SUPERSCRIPTS[ch]).join('') : match
	));
}

// Columns as a reader expects them: each value with its own ± uncertainty, and blank rows dropped.
function buildTableView(sheet) {
	const owners = PlotModel.getUncertaintyColumns(sheet);
	const claimed = new Set([...owners.values()].map(column => column.id));
	const columns = sheet.columns.filter(column => column.role !== 'none' && !claimed.has(column.id)).map(column => ({
		column,
		error: owners.get(column.id) || null,
		name: PlotModel.getColumnLabel(sheet, column),
		unit: column.unit
	}));
	const rows = [];
	for (let row = 0; row < sheet.rowCount; row++) {
		const cells = columns.map(({ column, error }) => {
			let value = String(column.cells[row] ?? '').trim();
			let delta = error ? String(error.cells[row] ?? '').trim() : '';
			if (!value) return { value: '', delta: '' };
			// Typed readings stay as entered; calculated ones are rounded for reading.
			if (PlotModel.isComputedColumn(column)) {
				const rounded = roundCalculated(PlotModel.parseNumber(value), error && error.errorType !== 'percentage' ? PlotModel.parseNumber(delta) : NaN);
				value = rounded.value;
				if (rounded.delta) delta = rounded.delta;
			} else if (delta && error && PlotModel.isComputedColumn(error) && error.errorType !== 'percentage') {
				delta = String(Number(PlotModel.parseNumber(delta).toPrecision(2)));
			}
			return { value, delta: delta ? `${delta}${error.errorType === 'percentage' ? '%' : ''}` : '' };
		});
		if (cells.some(cell => cell.value)) rows.push(cells);
	}
	return { columns, rows };
}

// An uncertainty to two significant figures and its value to the same decimal place; without one,
// four significant figures.
function roundCalculated(value, uncertainty) {
	if (!Number.isFinite(value)) return { value: '', delta: '' };
	if (uncertainty > 0) {
		const decimals = Math.min(Math.max(0, 1 - Math.floor(Math.log10(uncertainty))), 12);
		return { value: value.toFixed(decimals), delta: uncertainty.toFixed(decimals) };
	}
	return { value: String(Number(value.toPrecision(4))), delta: '' };
}

function plainHeader(entry) {
	return PlotModel.formatAxisLabel(prettifyPowers(entry.name), prettifyPowers(entry.unit));
}

function plainCell(cell) {
	return cell.delta ? `${cell.value} ± ${cell.delta}` : cell.value;
}

function tableAsText(view) {
	return [view.columns.map(plainHeader), ...view.rows.map(row => row.map(plainCell))].map(line => line.join('\t')).join('\n');
}

function tableAsMarkdown(view) {
	const escape = text => String(text).replace(/\|/g, '\\|');
	const lines = [
		`| ${view.columns.map(entry => escape(plainHeader(entry))).join(' | ')} |`,
		`| ${view.columns.map(() => '---').join(' | ')} |`,
		...view.rows.map(row => `| ${row.map(cell => escape(plainCell(cell))).join(' | ')} |`)
	];
	return lines.join('\n');
}

function escapeLatexText(text) {
	return String(text).replace(/([&%$#_{}])/g, '\\$1');
}

function tableAsLatex(view) {
	const header = view.columns.map((entry) => {
		const name = latexMode ? `$${entry.name}$` : escapeLatexText(entry.name);
		const unit = String(entry.unit || '').trim();
		return unit ? `${name} / $\\mathrm{${unit.replace(/\s+/g, '\\,')}}$` : name;
	});
	const body = view.rows.map(row => row.map((cell) => {
		if (!cell.value) return '';
		const delta = cell.delta.endsWith('%') ? `${cell.delta.slice(0, -1)}\\%` : cell.delta;
		return cell.delta ? `$${cell.value} \\pm ${delta}$` : `$${cell.value}$`;
	}).join(' & '));
	return [
		`\\begin{tabular}{${view.columns.map(() => 'c').join('')}}`,
		'\\hline',
		`${header.join(' & ')} \\\\`,
		'\\hline',
		...body.map(line => `${line} \\\\`),
		'\\hline',
		'\\end{tabular}'
	].join('\n');
}

// Draws the table on a canvas: plain text, black on white, so it pastes cleanly anywhere.
function tableAsPng(view) {
	const scale = Math.max(2, Math.ceil(window.devicePixelRatio || 1));
	const canvas = document.createElement('canvas');
	const context = canvas.getContext('2d');
	const headerFont = '600 15px Figtree, Arial, sans-serif';
	const bodyFont = '14px "IBM Plex Mono", Menlo, monospace';
	const padX = 14;
	const rowHeight = 30;
	const lines = [view.columns.map(plainHeader), ...view.rows.map(row => row.map(plainCell))];
	const widths = view.columns.map((_, index) => Math.max(...lines.map((line, r) => {
		context.font = r === 0 ? headerFont : bodyFont;
		return context.measureText(line[index] || '').width;
	})) + padX * 2);
	const width = Math.ceil(widths.reduce((sum, value) => sum + value, 0)) + 2;
	const height = rowHeight * lines.length + 2;
	canvas.width = width * scale;
	canvas.height = height * scale;
	context.scale(scale, scale);
	context.fillStyle = '#ffffff';
	context.fillRect(0, 0, width, height);
	context.strokeStyle = '#9a948c';
	context.lineWidth = 1;
	context.textBaseline = 'middle';
	context.textAlign = 'center';
	lines.forEach((line, r) => {
		const top = 1 + r * rowHeight;
		if (r === 0) {
			context.fillStyle = '#f0ece4';
			context.fillRect(1, top, width - 2, rowHeight);
		}
		let left = 1;
		line.forEach((text, c) => {
			context.font = r === 0 ? headerFont : bodyFont;
			context.fillStyle = '#1b1b1b';
			context.fillText(text || '', left + widths[c] / 2, top + rowHeight / 2);
			context.strokeRect(left + 0.5, top + 0.5, widths[c], rowHeight);
			left += widths[c];
		});
	});
	return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

let tableViewCache = null;

function openTableDialog() {
	const sheet = getActiveSheet();
	const view = buildTableView(sheet);
	if (!view.rows.length) {
		showToast('This sheet has no data to show.');
		return;
	}
	tableViewCache = view;
	document.getElementById('table-dialog-title').textContent = `View Table · ${getSheetDisplayName(plotState.activeSheet)}`;
	const table = document.getElementById('table-view');
	const headRow = document.createElement('tr');
	view.columns.forEach((entry) => {
		const th = document.createElement('th');
		th.textContent = latexMode ? `\\(${columnAxisText(sheet, entry.column)}\\)` : plainHeader(entry);
		headRow.appendChild(th);
	});
	const head = document.createElement('thead');
	head.appendChild(headRow);
	const body = document.createElement('tbody');
	view.rows.forEach((row) => {
		const tr = document.createElement('tr');
		row.forEach((cell) => {
			const td = document.createElement('td');
			td.textContent = plainCell(cell);
			tr.appendChild(td);
		});
		body.appendChild(tr);
	});
	table.replaceChildren(head, body);
	openDialog('table-dialog');
	if (latexMode) safeTypeset(table);
	document.getElementById('table-copy-text').focus();
}

async function copyTable(kind) {
	const view = tableViewCache;
	if (!view) return;
	let copied = false;
	if (kind === 'image') {
		// The PNG is produced inside the tap's promise so Safari allows the write.
		if (canWriteClipboardItems()) {
			try {
				await navigator.clipboard.write([new ClipboardItem({ 'image/png': tableAsPng(view) })]);
				copied = true;
			} catch (error) {
				copied = false;
			}
		}
		showToast(copied ? 'Table copied as an image.' : 'Image copy is not available in this browser. Try Copy for Spreadsheet.');
		return;
	}
	const text = kind === 'markdown' ? tableAsMarkdown(view) : kind === 'latex' ? tableAsLatex(view) : tableAsText(view);
	copied = await writePlainTextToClipboard(text);
	const names = { text: 'for a spreadsheet', markdown: 'as Markdown', latex: 'as LaTeX' };
	showToast(copied ? `Table copied ${names[kind]}.` : 'Copying is not available in this browser.');
}

function initializeCopying() {
	document.getElementById('fit-equation').addEventListener('click', openEquationMenu);
	document.getElementById('view-table-button').addEventListener('click', openTableDialog);
	document.getElementById('table-copy-text').addEventListener('click', () => copyTable('text'));
	document.getElementById('table-copy-markdown').addEventListener('click', () => copyTable('markdown'));
	document.getElementById('table-copy-latex').addEventListener('click', () => copyTable('latex'));
	document.getElementById('table-copy-image').addEventListener('click', () => copyTable('image'));
}
