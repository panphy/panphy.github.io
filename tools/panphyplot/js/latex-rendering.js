// LaTeX rendering helpers
(function() {
	function processLabel(label) {
		if (!label) return '';
		if (!latexMode) return label;
		// Plotly/MathJax rendering uses $...$ delimiters.
		return '$' + formatLabelForLatex(label) + '$';
	}

	function safeTypeset(target) {
		try {
			if (typeof MathJax === 'undefined' || !MathJax.Hub || !MathJax.Hub.Queue) return;
			const el = (typeof target === 'string') ? document.querySelector(target) : target;
			if (!el) return;
			MathJax.Hub.Queue(["Typeset", MathJax.Hub, el]);
		} catch (e) {
			console.warn('MathJax typeset skipped:', e);
		}
	}

	function renderLatex(elementId, rawString) {
		const element = document.querySelector(elementId);
		if (!element) return;

		const str = (rawString === undefined || rawString === null) ? '' : String(rawString);

		if (!latexMode) {
			// Plain mode: show raw text exactly.
			element.textContent = str;
			return;
		}

		// LaTeX mode: format spacing and typeset.
		const latex = formatLabelForLatex(str);
		element.textContent = `\\(${latex}\\)`;
		safeTypeset(element);
	}

	function updateGraphTitle(force = false) {
		const xColumn = document.getElementById('x-column-name').value || 'x';
		const yColumn = document.getElementById('y-column-name').value || 'y';
		const autoTitle = latexMode
			? `${yColumn}\\space \\text{ vs }\\space ${xColumn}`
			: `${yColumn} vs ${xColumn}`;

		const titleInput = document.getElementById('graph-title');
		if (!titleInput) return;

		const current = (titleInput.value || '').trim();
		if (force || titleWasAuto || current === '') {
			titleInput.value = autoTitle;
			titleWasAuto = true;
		}
	}

	function formatLabelForLatex(label) {
		if (!label) return '';
		let out = '';
		let depth = 0;
		for (let i = 0; i < label.length; i++) {
			const ch = label[i];
			if (ch === '{') {
				depth++;
				out += ch;
			} else if (ch === '}') {
				if (depth > 0) depth--;
				out += ch;
			} else if (ch === ' ' && depth === 0) {
				out += '\\space ';
			} else {
				out += ch;
			}
		}
		return out;
	}

	Object.assign(window, {
		processLabel,
		safeTypeset,
		renderLatex,
		updateGraphTitle,
		formatLabelForLatex
	});
})();
