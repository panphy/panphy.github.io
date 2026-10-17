// Guided tour for PanPhyPlot (neo-beta)
//
// The tour runs at ?tour=columns on practice data. Saving is switched off for that whole
// page load, so the saved workspace is never read or written; leaving the tour reloads the
// plain page, which brings that workspace back. The card and spotlight engine is copied
// from /tools/panphyplot/js/tour.js and uses its tour.css.

const TOUR_SEEN_KEY = 'panphyplot-neo-tour-seen';
// The beta is not used on phones (see the phone message), so neither is its tour.
const TOUR_PHONE_QUERY = '(max-width: 599px), (max-height: 500px) and (pointer: coarse)';
// Matches the width below which the app stacks its two panels.
const TOUR_NARROW_WIDTH = 1000;

// A pendulum practical with three repeat readings of the period, T = 2π√(L/g).
const TOUR_LENGTHS = ['0.20', '0.30', '0.40', '0.50', '0.60', '0.70', '0.80', '0.90'];
const TOUR_REPEATS = [
	['0.91', '1.09', '1.28', '1.41', '1.56', '1.67', '1.80', '1.90'],
	['0.89', '1.11', '1.26', '1.43', '1.55', '1.69', '1.79', '1.91'],
	['0.90', '1.10', '1.27', '1.42', '1.54', '1.68', '1.80', '1.89']
];

const tour = {
	chapterId: null,
	stepIndex: 0,
	stepDone: null,
	frame: 0,
	spotlight: null,
	card: null,
	target: null
};

function readTourStorage(key) {
	try {
		return localStorage.getItem(key);
	} catch (error) {
		return null;
	}
}

function markTourSeen() {
	try {
		localStorage.setItem(TOUR_SEEN_KEY, 'true');
	} catch (error) {
		console.warn('Unable to save tour preference:', error);
	}
}

function openTourSection(sectionId) {
	const section = document.getElementById(sectionId);
	if (section && !section.classList.contains('is-open')) {
		toggleSection(sectionId, document.querySelector(`[aria-controls="${sectionId}"]`));
	}
}

function showTourBasicFitTab() {
	openTourSection('best-fit-content');
	const basicTab = document.querySelector('.tablink[onclick*="BasicFit"]');
	if (basicTab && !basicTab.classList.contains('active')) basicTab.click();
}

function tourSheet() {
	return getActiveSheet();
}

function findTourMean() {
	return tourSheet().columns.find(column => /^mean\(/.test(column.formula || '')) || null;
}

function findTourSquare() {
	return tourSheet().columns.find(column => NeoModel.cleanFormulaText(column.formula || '').replace(/\s/g, '') === 'T^2') || null;
}

function findTourHeader(column) {
	return column ? document.querySelector(`.neo-col-head[data-column-id="${column.id}"]`) : null;
}

function addTourMean() {
	if (findTourMean()) return;
	openMeanDialog();
	document.getElementById('mean-uncertainty').checked = true;
	document.getElementById('mean-hide').checked = true;
	applyMean();
}

function addTourSquare() {
	if (findTourSquare()) return;
	openFormulaDialog(null);
	document.getElementById('formula-input').value = 'T^2';
	document.getElementById('formula-name').value = 'T^2';
	document.getElementById('formula-unit').value = 's^2';
	document.getElementById('formula-propagate').checked = true;
	applyFormula();
}

function hasTourSquareWithDelta() {
	const square = findTourSquare();
	return !!square && !!getPropagatedColumn(square);
}

function isTourMeanHidden() {
	const mean = findTourMean();
	return !!mean && tourSheet().hiddenSeries.includes(mean.id);
}

function hideTourMean() {
	const mean = findTourMean();
	if (!mean || isTourMeanHidden()) return;
	tourSheet().hiddenSeries.push(mean.id);
	onSeriesVisibilityChange(tourSheet());
}

function isTourFitSetUp() {
	const square = findTourSquare();
	return !!square && tourSheet().fitSeries === square.id && getWeightingRequested();
}

function setUpTourFit() {
	const square = findTourSquare();
	if (!square) return;
	openTourSection('best-fit-content');
	const select = document.getElementById('fit-series-select');
	select.value = square.id;
	select.dispatchEvent(new Event('change'));
	const weighted = document.getElementById('fit-weighted');
	weighted.checked = true;
	weighted.dispatchEvent(new Event('change'));
}

function getTourFit() {
	const square = findTourSquare();
	const result = square ? datasetFitResults[makeFitKey(tourSheet(), square.id)] : null;
	return result && !result.stale ? result : null;
}

function runTourFit() {
	if (!isTourFitSetUp()) setUpTourFit();
	showTourBasicFitTab();
	document.getElementById('fit-method').value = 'Linear';
	updateBasicFitEquation();
	fitCurve();
}

// g = 4π²/m, with Δg/g = Δm/m.
function describeTourGravity() {
	const result = getTourFit();
	const slope = result && Array.isArray(result.parameters) ? result.parameters.find(entry => entry.name === 'm') : null;
	if (!slope || !(slope.value > 0)) return '';
	const g = 4 * Math.PI * Math.PI / slope.value;
	const dg = g * slope.uncertainty / slope.value;
	const text = PanPhyNeoStats.formatMeasurement(g, dg).replace(' \\pm ', ' ± ');
	return ` Here the gradient m is 4π²/g, so g = 4π²/m = ${text} m s⁻².`;
}

const TOUR_CHAPTERS = {
	columns: {
		title: 'Columns and fits',
		steps: [
			{
				title: 'Welcome to PanPhyPlot (neo-beta)',
				body: 'This tour takes a pendulum experiment from three repeat readings to a value of g with its uncertainty. It runs on practice data, so your own work is untouched.'
			},
			{
				title: 'Sheets',
				target: '#sheet-tabs',
				body: 'Each tab is a sheet: one experiment. Tap the open sheet\'s name to rename it, and + to add another.'
			},
			{
				title: 'Every column has a role',
				target: '.neo-col-head .neo-role-select',
				body: 'X, Y, ±ΔX, ±ΔY or Ignore. A Y column plots against the nearest X column to its left, so these three repeat readings of T all plot against L.'
			},
			{
				title: 'Names and units',
				target: '.neo-col-head',
				body: 'Each column has a name and a unit, and the axis titles are built from them, such as L / m. Type or paste readings into the cells below.'
			},
			{
				title: 'Three repeats, three series',
				target: '#plot',
				body: 'Each Y column is its own series on the graph. Tap a legend entry to hide or show a series.'
			},
			{
				title: 'Take the mean of the repeats',
				target: '#mean-button',
				body: 'Mean of Repeats adds the mean of the repeat columns, row by row, and a ±Δ column of half the spread between the largest and smallest readings.',
				action: {
					instruction: 'Click Mean of Repeats, keep all three columns ticked, then click Add Mean.',
					isDone: () => !!findTourMean(),
					perform: addTourMean
				}
			},
			{
				title: 'Formula columns',
				target: () => findTourHeader(findTourMean()),
				body: 'The mean is a formula column: ƒ mean(B, C, D). Its cells are shaded and calculate themselves, so they follow any change to the readings. The ΔT column beside it is its uncertainty.'
			},
			{
				title: 'Linearise: plot T² against L',
				target: '#add-formula-button',
				body: 'T² = (4π²/g) L, so a graph of T² against L is a straight line. A formula column can calculate T², and carry the uncertainty in T through to T².',
				action: {
					instruction: 'Click Formula Column, type T^2, tick "Add a ±Δ column", then click Apply.',
					isDone: hasTourSquareWithDelta,
					perform: addTourSquare
				}
			},
			{
				title: 'The uncertainty, carried through',
				target: () => findTourHeader(getPropagatedColumn(findTourSquare() || {})),
				body: 'Δ(T²) = 2T·ΔT, worked out row by row. Open the T² formula to see the working: each partial derivative is written out.'
			},
			{
				title: 'Hide the T series',
				target: '#plot',
				body: 'Mean of Repeats already hid the three repeats. Hide the mean T as well, so the graph shows only T² against L.',
				action: {
					instruction: 'Tap T in the Series card, or in the legend under the graph.',
					isDone: isTourMeanHidden,
					perform: hideTourMean
				}
			},
			{
				title: 'Choose what to fit',
				target: '.neo-fit-series',
				prepare: () => openTourSection('best-fit-content'),
				body: 'Series to fit chooses which Y column the fit uses. Weighting by ±ΔY lets the more certain points count for more.',
				action: {
					instruction: 'Choose "T^2 against L", and turn on Weight by uncertainties.',
					isDone: isTourFitSetUp,
					perform: setUpTourFit
				}
			},
			{
				title: 'Fit the line',
				target: '#BasicFit .fit-button',
				prepare: showTourBasicFitTab,
				body: 'Keep Linear: theory says T² is proportional to L.',
				action: {
					instruction: 'Click Fit Curve.',
					isDone: () => !!getTourFit(),
					perform: runTourFit
				}
			},
			{
				title: 'Read the result',
				target: '.result',
				prepare: () => {
					if (!getTourFit()) runTourFit();
				},
				body: () => 'The gradient m and intercept c each come with an uncertainty. χ²/ν near 1 means the points scatter about as much as their ±ΔY suggest; much less than 1 means the uncertainties are generous.'
					+ describeTourGravity()
			},
			{
				title: 'Share your work',
				target: '#view-table-button',
				body: 'View Table copies a formatted table with every value and its ± uncertainty. Export .csv saves every column; tap the fitted equation to copy it as an image or LaTeX.'
			},
			{
				title: 'Tour complete',
				body: 'That is PanPhyPlot (neo-beta): columns, formulas, uncertainties and weighted fits. The Manual has the details when you need them.'
			}
		]
	}
};

const isTourPhone = !!window.matchMedia && window.matchMedia(TOUR_PHONE_QUERY).matches;
const requestedTourChapter = new URLSearchParams(window.location.search).get('tour');
const isTourRequested = Object.prototype.hasOwnProperty.call(TOUR_CHAPTERS, requestedTourChapter);
if (isTourRequested && !isTourPhone) {
	tour.chapterId = requestedTourChapter;
	persistenceDisabled = true;
}

// Offer the tour once, and only to someone with no saved workspace. Read before the
// app's first autosave creates one.
const shouldInviteToTour = !isTourRequested && !isTourPhone && !readTourStorage(TOUR_SEEN_KEY)
	&& readTourStorage(STORAGE_KEY) === null;

function getTourInitialState() {
	if (!tour.chapterId) return null;
	const columns = [
		{ id: 'c1', name: 'L', unit: 'm', role: 'X', cells: TOUR_LENGTHS },
		...TOUR_REPEATS.map((cells, index) => ({ id: `c${index + 2}`, name: `T${index + 1}`, unit: 's', role: 'Y', cells }))
	];
	return {
		version: 1,
		nextId: 10,
		activeSheet: 0,
		latexMode: false,
		weightFits: false,
		sheets: [{ id: 's9', name: 'Pendulum', rowCount: 10, columns, title: { text: '', automatic: true }, fitSeries: null, hiddenSeries: [] }]
	};
}

function getTourUrl(chapterId) {
	return `${window.location.pathname}?tour=${chapterId}`;
}

function exitTour() {
	window.location.replace(window.location.pathname);
}

function createTourButton(label, className, onClick) {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = `tour-button ${className}`;
	button.textContent = label;
	button.addEventListener('click', onClick);
	return button;
}

function getTourStep() {
	return TOUR_CHAPTERS[tour.chapterId].steps[tour.stepIndex];
}

function resolveTourTarget(step) {
	if (!step.target) return null;
	const element = typeof step.target === 'function' ? step.target() : document.querySelector(step.target);
	return element && element.getClientRects().length ? element : null;
}

// A step's target can change while it is shown, e.g. when a panel closes after its action.
function syncTourTarget() {
	const target = resolveTourTarget(getTourStep());
	if (target === tour.target) return;
	if (tour.target) tour.target.classList.remove('tour-target');
	tour.target = target;
	if (target) target.classList.add('tour-target');
}

function scrollTourTargetIntoView() {
	if (!tour.target) return;
	const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	tour.target.scrollIntoView({
		block: window.innerWidth < TOUR_NARROW_WIDTH ? 'start' : 'center',
		behavior: reducedMotion ? 'auto' : 'smooth'
	});
}

function renderTourStep() {
	const chapter = TOUR_CHAPTERS[tour.chapterId];
	const step = getTourStep();
	const isLastStep = tour.stepIndex === chapter.steps.length - 1;
	const card = tour.card;

	if (step.prepare) step.prepare();
	syncTourTarget();

	card.querySelector('.tour-eyebrow').textContent =
		`${chapter.title} · Step ${tour.stepIndex + 1} of ${chapter.steps.length}`;
	card.querySelector('.tour-title').textContent = step.title;

	const instruction = card.querySelector('.tour-instruction');
	instruction.textContent = step.action ? step.action.instruction : '';
	instruction.hidden = !step.action;

	const nav = card.querySelector('.tour-nav');
	nav.replaceChildren();
	const back = createTourButton('Back', 'tour-button-plain', () => showTourStep(tour.stepIndex - 1));
	back.disabled = tour.stepIndex === 0;
	nav.appendChild(back);

	if (isLastStep) {
		if (chapter.next) {
			nav.appendChild(createTourButton('Exit', 'tour-button-plain', exitTour));
			nav.appendChild(createTourButton('Next chapter', 'tour-button-primary',
				() => window.location.assign(getTourUrl(chapter.next))));
		} else {
			nav.appendChild(createTourButton('Finish', 'tour-button-primary', exitTour));
		}
	} else {
		if (step.action) {
			nav.appendChild(createTourButton('Do it for me', 'tour-button-plain tour-do-it', () => step.action.perform()));
		}
		nav.appendChild(createTourButton('Next', 'tour-button-primary tour-next', () => showTourStep(tour.stepIndex + 1)));
	}

	tour.stepDone = null;
	updateTourStepStatus();
}

// Action steps keep Next disabled until the app's own state shows the action happened.
function updateTourStepStatus() {
	const step = getTourStep();
	// Some cards quote a fitted value, which can arrive after the card is shown.
	const bodyText = typeof step.body === 'function' ? step.body() : step.body;
	const body = tour.card.querySelector('.tour-body');
	if (body.textContent !== bodyText) body.textContent = bodyText;
	const done = step.action ? !!step.action.isDone() : true;
	if (done === tour.stepDone) return;
	tour.stepDone = done;

	const status = tour.card.querySelector('.tour-status');
	status.textContent = step.action && done ? 'Done. Press Next to continue.' : '';
	status.hidden = !status.textContent;
	const next = tour.card.querySelector('.tour-next');
	if (next) next.disabled = !done;
	const doIt = tour.card.querySelector('.tour-do-it');
	if (doIt) doIt.hidden = done;
}

function showTourStep(index) {
	const stepCount = TOUR_CHAPTERS[tour.chapterId].steps.length;
	tour.stepIndex = Math.min(Math.max(index, 0), stepCount - 1);
	renderTourStep();
	tour.card.focus({ preventScroll: true });
	scrollTourTargetIntoView();
	// Sections animate open, so settle the scroll again once they have finished.
	const stepIndex = tour.stepIndex;
	setTimeout(() => {
		if (tour.stepIndex === stepIndex) scrollTourTargetIntoView();
	}, 350);
}

function setTourBox(element, left, top, width, height) {
	const value = `${Math.round(left)}px,${Math.round(top)}px,${Math.round(width)}px,${Math.round(height)}px`;
	if (element.dataset.box === value) return;
	element.dataset.box = value;
	element.style.left = `${Math.round(left)}px`;
	element.style.top = `${Math.round(top)}px`;
	if (width !== null) {
		element.style.width = `${Math.round(width)}px`;
		element.style.height = `${Math.round(height)}px`;
	}
}

// Runs every frame: targets move while sections animate and the page scrolls.
function layoutTour() {
	tour.frame = requestAnimationFrame(layoutTour);
	updateTourStepStatus();
	syncTourTarget();

	const viewportWidth = window.innerWidth;
	const viewportHeight = window.innerHeight;
	const target = tour.target;
	let rect = null;

	if (target) {
		const bounds = target.getBoundingClientRect();
		const pad = 6;
		let left = Math.max(bounds.left - pad, 0);
		let top = Math.max(bounds.top - pad, 0);
		let right = Math.min(bounds.right + pad, viewportWidth);
		let bottom = Math.min(bounds.bottom + pad, viewportHeight);
		// Keep the highlight inside any scrolling panel that clips the target.
		for (let parent = target.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
			if (getComputedStyle(parent).overflowY === 'visible') continue;
			const clip = parent.getBoundingClientRect();
			left = Math.max(left, clip.left);
			top = Math.max(top, clip.top);
			right = Math.min(right, clip.right);
			bottom = Math.min(bottom, clip.bottom);
		}
		rect = { left, top, right, bottom };
		setTourBox(tour.spotlight, left, top, Math.max(right - left, 0), Math.max(bottom - top, 0));
		tour.spotlight.classList.remove('tour-spotlight-empty');
	} else {
		// No target: a zero-size spotlight dims the whole page behind a centred card.
		setTourBox(tour.spotlight, viewportWidth / 2, viewportHeight / 2, 0, 0);
		tour.spotlight.classList.add('tour-spotlight-empty');
	}

	const card = tour.card;
	const docked = viewportWidth < TOUR_NARROW_WIDTH;
	card.classList.toggle('tour-card-docked', docked);
	if (docked) {
		if (card.dataset.box) {
			delete card.dataset.box;
			card.style.left = '';
			card.style.top = '';
		}
		return;
	}

	const gap = 16;
	const margin = 12;
	const cardWidth = card.offsetWidth;
	const cardHeight = card.offsetHeight;
	const banner = document.querySelector('.banner');
	const minTop = (banner ? Math.max(banner.getBoundingClientRect().bottom, 0) : 0) + margin;
	const clampTop = top => Math.min(Math.max(top, minTop), Math.max(minTop, viewportHeight - cardHeight - margin));
	const clampLeft = left => Math.min(Math.max(left, margin), Math.max(margin, viewportWidth - cardWidth - margin));
	let left = (viewportWidth - cardWidth) / 2;
	let top = clampTop((viewportHeight - cardHeight) / 2);

	if (rect) {
		// Small controls sit in the data panel: put the card beside the whole panel so it
		// does not cover the neighbouring controls.
		const panel = target.closest('.input-section');
		const panelRect = panel ? panel.getBoundingClientRect() : null;
		const fitsRightOf = box => box.right + gap + cardWidth <= viewportWidth - margin;
		const fitsLeftOf = box => box.left - gap - cardWidth >= margin;

		if (panelRect && fitsRightOf(panelRect)) {
			left = panelRect.right + gap;
			top = clampTop(rect.top);
		} else if (fitsRightOf(rect)) {
			left = rect.right + gap;
			top = clampTop(rect.top);
		} else if (fitsLeftOf(rect)) {
			left = rect.left - gap - cardWidth;
			top = clampTop(rect.top);
		} else if (rect.bottom + gap + cardHeight <= viewportHeight - margin) {
			left = clampLeft(rect.left);
			top = rect.bottom + gap;
		} else if (rect.top - gap - cardHeight >= minTop) {
			left = clampLeft(rect.left);
			top = rect.top - gap - cardHeight;
		} else {
			left = viewportWidth - cardWidth - margin;
			top = clampTop(viewportHeight - cardHeight - margin);
		}
	}
	setTourBox(card, left, top, null, null);
}

function isTourBlockedByDialog() {
	return !!document.querySelector('dialog[open]');
}

function buildTourCard() {
	const card = document.createElement('section');
	card.className = 'tour-card';
	card.setAttribute('role', 'dialog');
	card.setAttribute('aria-labelledby', 'tour-title');
	card.setAttribute('aria-describedby', 'tour-body');
	card.tabIndex = -1;

	const head = document.createElement('div');
	head.className = 'tour-card-head';
	const eyebrow = document.createElement('span');
	eyebrow.className = 'tour-eyebrow';
	head.appendChild(eyebrow);

	const title = document.createElement('h2');
	title.className = 'tour-title';
	title.id = 'tour-title';
	const body = document.createElement('p');
	body.className = 'tour-body';
	body.id = 'tour-body';
	const instruction = document.createElement('p');
	instruction.className = 'tour-instruction';
	const status = document.createElement('p');
	status.className = 'tour-status';
	status.setAttribute('role', 'status');
	const nav = document.createElement('div');
	nav.className = 'tour-nav';

	card.append(head, title, body, instruction, status, nav);
	return card;
}

function startTour() {
	markTourSeen();
	document.body.classList.add('tour-active');

	const practiceBar = document.createElement('div');
	practiceBar.className = 'tour-practice-bar';
	practiceBar.setAttribute('role', 'note');
	const practiceText = document.createElement('span');
	const practiceLabel = document.createElement('strong');
	practiceLabel.textContent = 'Practice mode.';
	practiceText.append(practiceLabel, ' Nothing here is saved. Your own work returns when you exit the tour.');
	practiceBar.append(practiceText, createTourButton('Exit tour', 'tour-button-plain', exitTour));
	const banner = document.querySelector('.banner');
	if (banner) banner.insertAdjacentElement('afterend', practiceBar);

	tour.spotlight = document.createElement('div');
	tour.spotlight.className = 'tour-spotlight';
	tour.spotlight.setAttribute('aria-hidden', 'true');

	tour.card = buildTourCard();
	const close = createTourButton('×', 'tour-close', exitTour);
	close.setAttribute('aria-label', 'Exit tour');
	close.title = 'Exit tour';
	tour.card.querySelector('.tour-card-head').appendChild(close);
	document.body.append(tour.spotlight, tour.card);

	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && !event.defaultPrevented && !isTourBlockedByDialog()) exitTour();
	});

	const chapter = TOUR_CHAPTERS[tour.chapterId];
	if (chapter.start) chapter.start();
	showTourStep(0);
	layoutTour();
}

function showTourInvite() {
	const card = buildTourCard();
	card.classList.add('tour-invite');
	card.querySelector('.tour-eyebrow').textContent = 'Guided tour';
	card.querySelector('.tour-title').textContent = 'New to this version?';
	card.querySelector('.tour-body').textContent =
		'Take a short tour: from repeat readings to g with its uncertainty. It uses practice data, so nothing you enter is affected.';
	card.querySelector('.tour-instruction').hidden = true;
	card.querySelector('.tour-status').hidden = true;

	const dismiss = () => {
		markTourSeen();
		card.remove();
	};
	card.querySelector('.tour-nav').append(
		createTourButton('Not now', 'tour-button-plain', dismiss),
		createTourButton('Start tour', 'tour-button-primary', () => {
			markTourSeen();
			window.location.assign(getTourUrl('columns'));
		})
	);
	document.body.appendChild(card);
}

// Registered after neo-main.js, so the app has finished initialising when this runs.
document.addEventListener('DOMContentLoaded', () => {
	if (tour.chapterId) {
		startTour();
	} else if (isTourRequested) {
		window.history.replaceState(null, '', window.location.pathname);
	} else if (shouldInviteToTour) {
		showTourInvite();
	}
});
